import * as THREE from 'three';
import type { App } from '../core/App';
import type { FrameContext, QualitySettings } from '../core/types';
import type { Cue } from '../show/ShowTypes';
import { CueFxSystem, EmitterSet } from './core/CueFxSystem';
import { DIST, Emitter, F, PUFF, R } from './core/Emitter';
import { fxColor, num, str } from './core/fxColors';
import { HazeField } from './haze';
import { installFxProxy } from './proxy';

const L_FOG = 0;
const WHITE = new THREE.Color(0.9, 0.9, 0.92);
const DEFAULT_HAZE = 0.55;

interface LevelSeg {
  t: number;
  fade: number;
  from: number;
  to: number;
}

/**
 * Haze, low fog and smoke.
 *  - `fog.level` drives `app.env.haze` (0..1) as a cross-faded, deterministic timeline; the other
 *    systems read it for beam/laser visibility.
 *  - A haze field of large soft sprites (stage cloud, field layer, high smoke band) glows in the
 *    light of the LightEnv bus. Its density = haze level + smoke accumulated from recent pyro and
 *    firework cues (an analytic sum over the cue list, so it is seek-safe).
 *  - `fog.burst` (smoke clouds at targets) and `fog.lowfog` (ground fog on the deck flowing onto the
 *    field) are analytic puff particles like the pyro smoke.
 */
export class FogSystem extends CueFxSystem {
  readonly name = 'fog';
  protected readonly sys = 'fog' as const;
  private haze: HazeField | null = null;
  private levels: LevelSeg[] = [];
  private levelRev = -1;
  private readonly c1 = new THREE.Color();
  private stageSmoke = 0;
  private skySmoke = 0;
  private hazeLevel = DEFAULT_HAZE;
  private crowdSys: { mode?: unknown } | null | undefined = undefined;

  protected override onInit(app: App): void {
    if (app.params.has('fxproxy')) installFxProxy(app);
    this.buildHaze(app.quality);
  }

  protected buildLayers(q: QualitySettings): void {
    const fog = this.shared.puffLayer('fog-puffs', Math.round(4000 * Math.max(0.35, q.particleScale)), 256, 11);
    this.layers = [fog];
    this.app.scene.add(fog.mesh);
  }

  private buildHaze(q: QualitySettings): void {
    this.haze?.dispose();
    const k = q.level === 'ultra' ? 1 : q.level === 'high' ? 0.8 : q.level === 'medium' ? 0.55 : 0.35;
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    this.haze = new HazeField(this.shared.uniforms, [
      { min: V(-105, 3, -38), max: V(105, 30, 12), size: [13, 26], aspect: 0.8, count: Math.round(46 * k) },
      { min: V(-80, 1.5, 4), max: V(80, 8, 205), size: [16, 30], aspect: 0.35, count: Math.round(64 * k) },
      { min: V(-150, 40, -110), max: V(150, 105, 20), size: [24, 44], aspect: 0.65, count: Math.round(26 * k) },
    ]);
    this.app.scene.add(this.haze.mesh);
  }

  override setQuality(q: QualitySettings): void {
    const changed = !this.quality || this.quality.level !== q.level;
    super.setQuality(q);
    if (changed && this.app) this.buildHaze(q);
  }

  override setEnabled(on: boolean): void {
    super.setEnabled(on);
    if (this.haze) this.haze.mesh.visible = on;
    if (!on && this.app) this.app.env.haze = DEFAULT_HAZE;
  }

  protected lifetime(cue: Omit<Cue, 'life' | 'end'>): number {
    switch (cue.fx) {
      case 'burst':
        return cue.dur + 22;
      case 'lowfog':
        return cue.dur + 16;
      default:
        return cue.dur;
    }
  }

  protected expand(cue: Cue, out: EmitterSet): void {
    if (cue.fx === 'burst') this.burst(cue, out);
    else if (cue.fx === 'lowfog') this.lowfog(cue, out);
  }

  private burst(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const pts = this.app.anchors.resolve(cue.targets, 'wing_tips');
    const size = num(p.size, 1, 0.2, 6);
    const tint = fxColor(p.color, this.palette, this.c1, 'white').clone();
    const dur = Math.max(0.4, Math.min(cue.dur, 4));
    // a smoke cannon's plume grows sub-linearly with its size class, and many targets share the
    // volume (12 wing heads must not stack into one opaque cloud that hides the fire it frames)
    const sq = Math.sqrt(size);
    const share = 1 / Math.sqrt(Math.max(1, pts.length / 4));
    pts.forEach((pos, i) => {
      const n = Math.max(3, Math.round(9 * sq * share * Math.min(1, this.quality.particleScale * 1.5)));
      out.add(
        new Emitter(DIST.CONE, F.RAMP)
          .on(L_FOG)
          .originV(pos)
          .time(cue.t)
          .dir(0, 1, 0.25, 0.7)
          .speed(2.5 * sq, 6.5 * sq)
          .physics(1.1, 0.25)
          .color(tint, 0.28)
          .life(10, 16)
          .emit(n, dur)
          .size(1.5 + 1.2 * sq, 7.5 * sq)
          .trail(0.45, 0.28)
          .seed(this.sub(cue, i))
          .set(R.X1, 0.12)
          .set(R.X2, 0.85)
          .set(R.X3, 0.2)
          .set(R.Y0, 0.85)
          .set(R.Y2, 0.05)
          .set(R.Y3, 1)
          .set(R.Z0, 1.25)
          .set(R.Z3, PUFF.SMOKE)
          .window(cue.t, cue.t + dur + 19.5),
      );
    });
  }

  private lowfog(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const density = num(p.density, 0.8, 0, 1.5);
    const area = str(p.area, 'deck');
    const deck = this.app.anchors.resolve(cue.targets, 'deck_front');
    let minX = Infinity,
      maxX = -Infinity,
      y = 0,
      z = 0;
    for (const v of deck) {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      y += v.y;
      z += v.z;
    }
    if (!deck.length) {
      minX = -45;
      maxX = 45;
    } else {
      y /= deck.length;
      z /= deck.length;
    }
    const w = Math.max(20, maxX - minX + 16);
    const cx = (minX + maxX) / 2;
    const dur = Math.max(1, cue.dur);
    const life = 13;
    const tint = fxColor(p.color, this.palette, this.c1, 'white').lerp(WHITE, 0.3).clone();
    const regions: [THREE.Vector3, THREE.Vector3, number, number][] = [];
    const deckY = Math.max(0, y - 0.3);
    if (area !== 'field') regions.push([new THREE.Vector3(cx, deckY + 0.5, z - 9), new THREE.Vector3(w, 0.7, 20), 0.35, deckY]);
    if (area !== 'deck' || p.spill !== false) regions.push([new THREE.Vector3(cx, 0.45, z + 16), new THREE.Vector3(w * 0.95, 0.5, 34), area === 'deck' ? 0.55 : 1, 0]);
    if (area === 'field' || area === 'all') regions.push([new THREE.Vector3(0, 0.45, 90), new THREE.Vector3(90, 0.5, 130), 1, 0]);
    regions.forEach(([c, ext, dk, floorY], i) => {
      const n = Math.max(12, Math.round(((ext.x * ext.z) / 60) * Math.min(1, this.quality.particleScale * 1.3)));
      out.add(
        new Emitter(DIST.BOX, F.FLAT | F.RAMP)
          .on(L_FOG)
          .originV(c)
          .time(cue.t)
          .axisV(ext)
          .dir(0, 0.05, 1, 0.8)
          .speed(0.2, 0.7)
          .physics(0.25, 0)
          .color(tint, 0.42 * density * dk)
          .life(life * 0.7, life)
          .emit(Math.min(n, 400), dur + life * 0.5)
          .size(6.5, 5)
          .trail(0.7, 0.2)
          .seed(this.sub(cue, i))
          .set(R.X1, 0.03)
          .set(R.X2, 0.7)
          .set(R.X3, 3)
          .set(R.Y0, 0.9)
          .set(R.Y1, floorY - 0.2)
          .set(R.Y2, 0.25)
          .set(R.Y3, 0.35)
          .set(R.Z0, 1.3)
          .set(R.Z1, 0.32)
          .set(R.Z3, PUFF.FOG)
          .window(cue.t, cue.t + dur + life * 1.5),
      );
    });
  }

  // ------------------------------------------------------------------ haze timeline

  private rebuildLevels(): void {
    this.levels.length = 0;
    let cur = DEFAULT_HAZE;
    for (const c of this.app.show.all('fog')) {
      if (c.fx !== 'level') continue;
      const to = num(c.p.haze, num(c.p.density, cur, 0, 1.5), 0, 1.5);
      const fade = num(c.p.fade, 2, 0, 120);
      // value at the moment this segment starts (previous segment evaluated at c.t)
      const prev = this.levels[this.levels.length - 1];
      if (prev) cur = evalSeg(prev, c.t);
      this.levels.push({ t: c.t, fade, from: cur, to });
      cur = to;
    }
    this.levelRev = this.app.show.revision;
  }

  private hazeAt(t: number): number {
    const L = this.levels;
    if (!L.length || t < L[0].t) return DEFAULT_HAZE;
    let lo = 0,
      hi = L.length - 1,
      idx = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (L[mid].t <= t) {
        idx = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return evalSeg(L[idx], t);
  }

  /** smoke accumulated from recent cues of a system (analytic, seek-safe) */
  private accumulate(sys: 'pyro' | 'fireworks' | 'fog', t: number, sky: boolean): number {
    const all = this.app.show.all(sys);
    const win = 50;
    let lo = 0,
      hi = all.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (all[mid].t < t - win) lo = mid + 1;
      else hi = mid;
    }
    let s = 0;
    for (let i = lo; i < all.length; i++) {
      const c = all[i];
      if (c.t > t) break;
      const w = smokeWeight(c, sky);
      if (w <= 0) continue;
      const a = t - c.t;
      s += w * (1 - Math.exp(-a / 1.8)) * Math.exp(-a / (sky ? 30 : 22));
    }
    return s;
  }

  protected override afterUpdate(ctx: FrameContext): void {
    if (this.levelRev !== this.app.show.revision) this.rebuildLevels();
    const t = ctx.showTime;
    const level = this.hazeAt(t);
    this.hazeLevel = level;
    const pyro = this.accumulate('pyro', t, false) + this.accumulate('fog', t, false) + this.accumulate('fireworks', t, false);
    const sky = this.accumulate('fireworks', t, true);
    this.stageSmoke = 1 - Math.exp(-pyro);
    this.skySmoke = 1 - Math.exp(-sky);
    const env = this.app.env;
    // env.haze drives beam / laser / crowd-scatter visibility everywhere; pyro smoke hangs around
    // the stage, it does not thicken the air over the whole field — so it only nudges the level
    env.haze = Math.min(1, level + this.stageSmoke * 0.08);
    if (this.haze) {
      // pyro smoke thickens the stage cloud, but only moderately: a flame ring must not turn the
      // stage into one glowing blob. The field layer is thinner with a crowd present (the bodies
      // already break up the view; the veil in front of the stage belongs to the empty field).
      const tribe = this.crowdMode() === 'tribe';
      const stage = 0.062 * level + 0.1 * this.stageSmoke;
      const field = (0.022 * level + 0.02 * this.stageSmoke) * (tribe ? 0.55 : 1);
      const skyD = 0.02 * level + 0.2 * this.skySmoke;
      this.haze.setDensity(stage, field, skyD);
    }
  }

  /** 'tribe' (crowd present) or 'filmed' (empty grounds), read duck-typed from the crowd system */
  private crowdMode(): string {
    if (this.crowdSys === undefined) this.crowdSys = (this.app.get('crowd') as unknown as { mode?: unknown } | undefined) ?? null;
    const m = this.crowdSys?.mode;
    return typeof m === 'string' ? m : 'filmed';
  }

  override stats(): Record<string, number | string> {
    const s = super.stats();
    s.haze = +this.hazeLevel.toFixed(2);
    s.stageSmoke = +this.stageSmoke.toFixed(2);
    s.skySmoke = +this.skySmoke.toFixed(2);
    s.hazeSprites = this.haze?.count ?? 0;
    return s;
  }

  override dispose(): void {
    super.dispose();
    this.haze?.dispose();
  }
}

function evalSeg(s: LevelSeg, t: number): number {
  if (s.fade <= 0) return s.to;
  const k = Math.min(1, Math.max(0, (t - s.t) / s.fade));
  return s.from + (s.to - s.from) * k * k * (3 - 2 * k);
}

/** how much lingering smoke a cue leaves (stage-level or high in the sky) */
function smokeWeight(c: Cue, sky: boolean): number {
  const p = c.p;
  const n = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  if (c.sys === 'fireworks') {
    if (sky) {
      if (c.fx === 'shell') return 0.05;
      if (c.fx === 'salvo') return 0.03 * n(p.count, 8);
      if (c.fx === 'finale') return 0.02 * n(p.density, 15) * c.dur;
      return 0;
    }
    if (c.fx === 'comet') return 0.006 * Math.min(60, n(p.count, 10));
    if (c.fx === 'cake') return 0.012 * Math.min(40, n(p.shots, 20));
    if (c.fx === 'mine') return 0.05;
    if (c.fx === 'finale') return 0.01 * n(p.density, 15) * c.dur;
    return 0;
  }
  if (c.sys === 'fog') return c.fx === 'burst' ? 0.25 * n(p.size, 1) : 0;
  switch (c.fx) {
    case 'flame':
      return 0.035 * (n(p.height, 8) / 8) * Math.max(0.4, c.dur);
    case 'firewall':
    case 'dragon_breath':
      return 0.07 * c.dur;
    case 'jet':
      return 0.015 * c.dur;
    case 'gerb':
      return 0.05 * Math.sqrt(Math.max(0.5, c.dur)) * (n(p.height, 8) / 10);
    case 'waterfall':
      return 0.03 * c.dur;
    case 'burst':
      return 0.14 * n(p.size, 1) * (c.dur >= 2 ? c.dur * 0.5 : 1);
    case 'bengal':
      return 0.12 * c.dur;
    default:
      return 0;
  }
}
