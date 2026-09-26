import type * as THREE from 'three';
import type { App } from '../../core/App';
import type { AnchorName } from '../../core/Anchors';
import type { FrameContext, QualitySettings, System } from '../../core/types';
import { ShowEngine } from '../../show/ShowEngine';
import type { Cue, SystemId } from '../../show/ShowTypes';
import { hash32 } from '../../core/rng';
import type { Emitter, FlashSpec } from './Emitter';
import type { FxLayer } from './FxLayer';
import type { LightSpec } from './FxLights';
import { FxShared } from './FxShared';

/** Emitters (and light flashes) a single compiled cue expands into. Built once per cue, then cached. */
export class EmitterSet {
  readonly emitters: Emitter[] = [];
  /** LightEnv flashes (one weighted centroid for the set, crowd and world materials) */
  readonly flashes: FlashSpec[] = [];
  /** spatial pyro light (smoke, haze, floor), see FxLights */
  readonly lights: LightSpec[] = [];
  lastFrame = 0;
  add(e: Emitter): Emitter {
    this.emitters.push(e);
    return e;
  }
}

const ANCHORS: AnchorName[] = [
  'deck_front',
  'deck_back',
  'wing_left',
  'wing_right',
  'wing_tips',
  'towers_top',
  'roof',
  'dragon_mouth',
  'dragon_head',
  'pillars_top',
  'delay_towers',
  'foh',
  'fireworks_back',
  'fireworks_sides',
];

/**
 * Base of the cue-driven effect systems (pyro, fireworks, fog bursts).
 * Per frame: alive cues -> cached EmitterSets -> alive emitters assigned to FxLayers; flashes are
 * evaluated analytically and written into the LightEnv. Nothing accumulates between frames, so
 * play / pause / seek / restart all produce the identical picture for the same show time.
 */
export abstract class CueFxSystem implements System {
  abstract readonly name: string;
  protected abstract readonly sys: SystemId;
  protected app!: App;
  protected shared!: FxShared;
  protected layers: FxLayer[] = [];
  protected enabled = true;
  protected quality!: QualitySettings;
  protected readonly palette = ShowEngine.newPalette();
  private cache = new Map<number, EmitterSet>();
  private revision = -1;
  private anchorRefs: THREE.Vector3[][] = [];
  private cueBuf: Cue[] = [];
  private frameNo = 0;
  private activeCues = 0;
  private flashSum = 0;
  private flashN = 0;
  private readonly flashBuf: FlashSpec[] = new Array(512);
  private readonly flashI = new Float32Array(512);
  private readonly lightBuf: LightSpec[] = new Array(256);
  private readonly lightI = new Float32Array(256);
  private lightN = 0;
  private lightSum = 0;
  /** total flash intensity above which additional flashes are compressed logarithmically */
  protected flashCap = 2.5;
  /** same for the spatial pyro light (a wall of 60 fountains is brighter than two, not 30x) */
  protected lightCap = 9;
  /** systems without authored lights (fireworks) light the smoke / floor from their flashes */
  protected flashLightGain = 0.3;
  cpuMs = 0;

  init(app: App): void {
    this.app = app;
    this.shared = FxShared.get(app);
    this.quality = app.quality;
    this.buildLayers(app.quality);
    app.show.registerLifetime(this.sys, (cue) => {
      try {
        return this.lifetime(cue as Cue);
      } catch {
        return cue.dur;
      }
    });
    this.onInit(app);
  }

  protected onInit(_app: App): void {}

  /** create the FxLayers for a quality preset (add their meshes to the scene) */
  protected abstract buildLayers(q: QualitySettings): void;
  /** expand one cue into emitters/flashes (deterministic: only cue params, seed, anchors, quality) */
  protected abstract expand(cue: Cue, out: EmitterSet): void;
  /** visual lifetime of a cue (>= dur) */
  protected abstract lifetime(cue: Omit<Cue, 'life' | 'end'>): number;
  /** per-frame hook after the layers were committed (e.g. extra non-cue visuals) */
  protected afterUpdate(_ctx: FrameContext): void {}

  update(ctx: FrameContext): void {
    if (!this.enabled) return;
    const t0 = performance.now();
    this.frameNo++;
    this.checkInvalidation();
    const t = ctx.showTime;
    const layers = this.layers;
    for (let i = 0; i < layers.length; i++) layers[i].begin();
    const cues = this.app.show.active(this.sys, t, this.cueBuf);
    this.activeCues = cues.length;
    this.flashSum = 0;
    this.lightSum = 0;
    this.lightN = 0;
    for (let ci = 0; ci < cues.length; ci++) {
      const cue = cues[ci];
      let set = this.cache.get(cue.id);
      if (!set) {
        set = new EmitterSet();
        try {
          this.app.show.paletteAt(cue.t, this.palette);
          this.expand(cue, set);
          this.deriveLights(set);
        } catch (e) {
          if (this.frameNo % 600 === 1) console.warn(`[${this.name}] cue ${cue.fx} failed to expand`, e);
        }
        this.cache.set(cue.id, set);
      }
      set.lastFrame = this.frameNo;
      const em = set.emitters;
      for (let k = 0; k < em.length; k++) {
        const e = em[k];
        if (t >= e.start && t < e.end) layers[e.layer].add(e);
      }
      const fl = set.flashes;
      for (let k = 0; k < fl.length; k++) {
        const I = flashAt(fl[k], t);
        if (I > 0.002 && this.flashN < this.flashBuf.length) {
          this.flashBuf[this.flashN] = fl[k];
          this.flashI[this.flashN++] = I;
          this.flashSum += I;
        }
      }
      const li = set.lights;
      for (let k = 0; k < li.length; k++) {
        const I = flashAt(li[k], t);
        if (I > 0.002 && this.lightN < this.lightBuf.length) {
          this.lightBuf[this.lightN] = li[k];
          this.lightI[this.lightN++] = I;
          this.lightSum += I;
        }
      }
    }
    // soft cap: a finale barrage must not blow the lighting bus up linearly
    const cap = this.flashCap;
    const kf = this.flashSum > cap ? (cap * (1 + Math.log(this.flashSum / cap))) / this.flashSum : 1;
    // photosensitivity option (set by the UI on the App): flash light at ~40 %
    const calm = (this.app as unknown as { reduceFlashing?: boolean }).reduceFlashing ? 0.4 : 1;
    for (let k = 0; k < this.flashN; k++) this.app.env.addFlash(this.flashBuf[k].color, this.flashI[k] * kf * calm, this.flashBuf[k].pos);
    this.flashN = 0;
    // derived (flash) lights of systems without authored light saturate early: a barrage of glitter
    // mines must not light the ground like a flame wall
    const capL = this.lightCap * (this.derivedOnly ? 0.3 : 1);
    const kl = (this.lightSum > capL ? (capL * (1 + Math.log(this.lightSum / capL))) / this.lightSum : 1) * (calm < 1 ? 0.6 : 1);
    const lights = this.shared.lights;
    for (let k = 0; k < this.lightN; k++) lights.add(this.lightBuf[k], this.lightI[k] * kl);
    for (let i = 0; i < layers.length; i++) layers[i].commit();
    this.prefetch(t);
    this.afterUpdate(ctx);
    if (this.frameNo % 120 === 0) this.sweep();
    this.cpuMs = this.cpuMs * 0.9 + (performance.now() - t0) * 0.1;
  }

  /**
   * Expand a few cues that start within the next seconds ahead of time, so a big cue (a finale
   * with hundreds of shells) never builds its emitters on the frame it fires.
   */
  private prefetch(t: number): void {
    const all = this.app.show.all(this.sys);
    let lo = 0,
      hi = all.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (all[mid].t <= t) lo = mid + 1;
      else hi = mid;
    }
    let budget = 2;
    for (let i = lo; i < all.length && budget > 0; i++) {
      const cue = all[i];
      if (cue.t > t + 2.5) break;
      if (this.cache.has(cue.id)) continue;
      const set = new EmitterSet();
      try {
        this.app.show.paletteAt(cue.t, this.palette);
        this.expand(cue, set);
        this.deriveLights(set);
      } catch {
        /* expanded again (and reported) when it becomes active */
        continue;
      }
      set.lastFrame = this.frameNo + 300;
      this.cache.set(cue.id, set);
      budget--;
    }
  }

  /**
   * A cue that authored no spatial light (fireworks) lights the smoke and the floor from its flashes:
   * a point light at the flash centre with a reach that grows with its height above the ground.
   */
  private deriveLights(set: EmitterSet): void {
    if (set.lights.length || !set.flashes.length || this.flashLightGain <= 0) return;
    for (const f of set.flashes) {
      set.lights.push({ ...f, peak: f.peak * this.flashLightGain, a: f.pos, b: f.pos, radius: 12 + 0.2 * Math.max(0, f.pos.y) });
    }
  }

  /** true for systems whose light comes only from their flashes (fireworks) */
  private get derivedOnly(): boolean {
    return this.sys === 'fireworks';
  }

  /** drop cached sets not used for a while (bounded memory on long scrubs) */
  private sweep(): void {
    for (const [id, set] of this.cache) if (this.frameNo - set.lastFrame > 240) this.cache.delete(id);
  }

  private checkInvalidation(): void {
    let dirty = this.app.show.revision !== this.revision;
    const a = this.app.anchors;
    for (let i = 0; i < ANCHORS.length; i++) {
      const ref = a.get(ANCHORS[i]);
      if (this.anchorRefs[i] !== ref) {
        this.anchorRefs[i] = ref;
        dirty = true;
      }
    }
    if (dirty) {
      this.revision = this.app.show.revision;
      this.invalidate();
    }
  }

  protected invalidate(): void {
    this.cache.clear();
    for (const l of this.layers) l.reset();
  }

  setQuality(q: QualitySettings): void {
    if (!this.app) return;
    if (this.quality && this.quality.level === q.level && this.layers.length) {
      this.quality = q;
      return;
    }
    this.quality = q;
    for (const l of this.layers) l.dispose();
    this.layers = [];
    this.buildLayers(q);
    this.invalidate();
    for (const l of this.layers) l.mesh.visible = false;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) for (const l of this.layers) l.mesh.visible = false;
  }

  stats(): Record<string, number | string> {
    const out: Record<string, number | string> = { cues: this.activeCues, cached: this.cache.size, cpuMs: +this.cpuMs.toFixed(3), flash: +this.flashSum.toFixed(2), light: +this.lightSum.toFixed(2) };
    for (const l of this.layers) {
      out[`${l.name}.emitters`] = l.emitters;
      out[`${l.name}.particles`] = l.particles;
      out[`${l.name}.slots`] = `${l.usedSlots}/${l.maxSlots}`;
      if (l.dropped) out[`${l.name}.dropped`] = l.dropped;
      if (l.scaled < 1) out[`${l.name}.scaled`] = +l.scaled.toFixed(2);
    }
    return out;
  }

  dispose(): void {
    for (const l of this.layers) l.dispose();
    this.layers = [];
    this.cache.clear();
  }

  /** particle count helper: base count scaled by quality, never below `min` */
  protected pc(base: number, min = 1): number {
    return Math.max(min, Math.round(base * this.quality.particleScale));
  }

  /** deterministic per-cue seed for sub-emitter k */
  protected sub(cue: Cue, k: number): number {
    return hash32(cue.seed ^ Math.imul(k + 1, 0x9e3779b9)) & 0xffffff;
  }
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Analytic light-flash envelope (pure function of show time). */
export function flashAt(fs: FlashSpec, t: number): number {
  if (t < fs.t0 || t > fs.t1) return 0;
  const tau = t - fs.t0;
  let I: number;
  if (fs.kind === 0) {
    I = fs.peak * (Math.exp(-tau / 0.08) + 0.28 * Math.exp(-tau / Math.max(0.05, fs.decay)));
  } else {
    const len = fs.t1 - fs.t0;
    I = fs.peak * smooth(0, 0.08, tau) * (1 - smooth(len - Math.max(0.05, fs.decay), len, tau));
    I *= 0.82 + 0.18 * ((hash32(Math.floor(t * 24) ^ (fs.pos.x * 7) | 0) >>> 8) / 16777216);
  }
  if (fs.strobe > 0) {
    const ph = t * fs.strobe;
    I *= ph - Math.floor(ph) > 0.55 ? 1.6 : 0.25;
  }
  return I;
}
