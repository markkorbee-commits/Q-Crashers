import * as THREE from 'three';
import type { App } from '../core/App';
import type { FrameContext, QualitySettings } from '../core/types';
import type { Cue } from '../show/ShowTypes';
import { CueFxSystem, EmitterSet } from './core/CueFxSystem';
import { DIST, Emitter, F, PUFF, R } from './core/Emitter';
import { fxColor, num, str } from './core/fxColors';
import { clusters } from './core/placement';
import { HazeField, type HazeBank } from './haze';
import { installFxProxy } from './proxy';
import { PILLAR_X, PILLAR_Z } from '../world/site';

const L_FOG = 0;
const WHITE = new THREE.Color(0.9, 0.9, 0.92);
const DEFAULT_HAZE = 0.55;
/**
 * default `release` (s) of a `fog.lowfog` bank after its cue: the bank thins out over it (smoothstep), as the beams'
 * view of the bank does (LightingSystem.writeLowFog: 10 s linear linger)
 */
const LOWFOG_RELEASE = 10;
/** default `fadeIn` (s) of a `fog.lowfog` bank: the pre-warmed bank comes in over it from its cue time */
const LOWFOG_FADE_IN = 3;

interface LevelSeg {
  t: number;
  fade: number;
  from: number;
  to: number;
  /** smoke-volume glow (colour * amount) cross-faded with the level */
  g0: THREE.Color;
  g1: THREE.Color;
}

/**
 * Haze, low fog and smoke.
 *  - `fog.level` drives `app.env.haze` (0..1) as a cross-faded, deterministic timeline; the other
 *    systems read it for beam/laser visibility.
 *  - A haze field of large soft sprites (stage cloud, field layer, high smoke band) glows in the
 *    light of the LightEnv bus. Its density = haze level + smoke accumulated from recent pyro and
 *    firework cues (an analytic sum over the cue list, so it is seek-safe). Round 12: low smoke banks roll off the
 *    deck lip, the pillar feet (lit by the shafts' uplight) and the side sections / arms (the castle-base wash band),
 *    built up by recent pyro and smoke cannons; for a spectator (first / third person) the lit haze clears round the
 *    eye and does not glow high up.
 *  - `fog.burst` (smoke clouds at targets) and `fog.lowfog` (ground fog on the deck flowing onto the
 *    field) are analytic puff particles like the pyro smoke. A low fog bank is lit by the light bus like
 *    all smoke plus the beam light it holds (LightEnv.lowFogLight), so it goes dark with the rig; it is
 *    out at its cue time, comes in over `fadeIn` s (default 3) and thins out over `release` s (default 10) after
 *    its cue. A `fog.burst` with `roll` throws a smoke wall out over the deck and the field (docs/show-format-ext/fog.md).
 */
export class FogSystem extends CueFxSystem {
  readonly name = 'fog';
  protected readonly sys = 'fog' as const;
  private haze: HazeField | null = null;
  private levels: LevelSeg[] = [];
  private levelRev = -1;
  private readonly c1 = new THREE.Color();
  private stageSmoke = 0;
  /** 0..1 smoke of recent pyro and smoke cannons (no fireworks): builds the low smoke banks */
  private groundSmoke = 0;
  private skySmoke = 0;
  private hazeLevel = DEFAULT_HAZE;
  private readonly glowNow = new THREE.Color();
  /** normalised colour of each fog.burst cue (resolved once) for the haze tint */
  private readonly tintCache = new Map<number, THREE.Color>();
  private readonly tintSum = new THREE.Color();
  private readonly tint = new THREE.Color(1, 1, 1);
  private crowdSys: { mode?: unknown } | null | undefined = undefined;
  private camSys: { mode?: unknown } | null | undefined = undefined;
  /**
   * calibration hooks (in-page experiments; burst lights are baked when a cue is expanded, so clear the
   * cue cache after changing perTarget): tintLean = how far the site smoke's albedo leans to the site
   * glow colour per unit of smoke; perTarget = glowing-burst lights per target and cluster.
   * Low fog (baked too: clear the cue cache with invalidate() after a change): release = default fade-out (s) of a
   * bank after its cue (0 = the puffs live out their life); prewarm = the bank is out at the cue time (its puffs
   * started one life earlier) and fades in over 3 s; tallBank = extra height of a dense bank (density 0.9 -> 1.5).
   * The beam light a bank holds (LightEnv.lowFogLight) has its gain in FxShared.uniforms.uLowFogGain.
   */
  readonly tune = {
    tintLean: 0.3,
    perTarget: true,
    release: LOWFOG_RELEASE,
    prewarm: true,
    tallBank: 1,
    // round 12, low smoke banks (HazeField.setBanks): bankBase = density per unit of haze level; bankSmoke = density
    // added by the smoke of recent pyro and smoke / CO2 cannons (groundSmoke, eased in between bankK0 and bankK1);
    // bankDeck / bankPillars = share of the deck lip / the pillar feet; bankSides = the side-section band per unit of
    // haze level, bankArms = the arms' share of it. Their light: HazeField uBankLight / uBankFill.
    bankBase: 0,
    bankSmoke: 1.2,
    bankK0: 0.15,
    bankK1: 1.1,
    bankDeck: 0.7,
    bankPillars: 0.7,
    bankSides: 2,
    bankArms: 0.8,
    // first / third person: how far the lit haze clears round the spectator and stops glowing high up (HazeField.setViewer)
    viewer: 1,
  };

  protected override onInit(app: App): void {
    if (app.params.has('fxproxy')) installFxProxy(app);
    this.buildHaze(app.quality);
  }

  protected buildLayers(q: QualitySettings): void {
    const fog = this.shared.puffLayer('fog-puffs', Math.round(4000 * Math.max(0.35, q.particleScale)), 256, 11);
    this.layers = [fog];
    this.app.scene.add(fog.mesh);
  }

  /** the haze sprites of the richest preset, built once; a preset draws a ranked share of them */
  private buildHaze(q: QualitySettings): void {
    this.haze?.dispose();
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    // round 12: low smoke banks at the deck lip, round the pillar bases, along the side-section fronts and the arms
    // (site.ts: deck X ±37 front Z 0 at Y 1.9, side sections to X ±92 front Z −4, arms X ±92..94 Z −4..58, pillars
    // X ±20 at Z 36 / 69 / 102 / 135)
    const banks: HazeBank[] = [{ min: V(-38, 1.5, 1), max: V(38, 3.5, 6), size: [10, 16], count: 14, group: 0 }];
    for (const pz of PILLAR_Z) for (const sx of [-1, 1]) banks.push({ min: V(sx * PILLAR_X - 5, 0.9, pz - 4), max: V(sx * PILLAR_X + 3, 2.2, pz + 4), size: [5, 9], count: 6, group: 1 });
    for (const sx of [-1, 1]) {
      banks.push({ min: V(sx > 0 ? 38 : -92, 0.8, -3), max: V(sx > 0 ? 92 : -38, 2.4, 3), size: [9, 15], count: 8, group: 2 });
      banks.push({ min: V(sx * 93 - 3, 0.8, 2), max: V(sx * 93 + 3, 2.4, 56), size: [9, 14], count: 5, group: 3 });
    }
    this.haze = new HazeField(
      this.shared.uniforms,
      [
        { min: V(-105, 3, -38), max: V(105, 30, 12), size: [13, 26], aspect: 0.8, count: 46 },
        { min: V(-80, 1.5, 4), max: V(80, 8, 205), size: [16, 30], aspect: 0.35, count: 64 },
        { min: V(-150, 40, -110), max: V(150, 105, 20), size: [24, 44], aspect: 0.65, count: 26 },
      ],
      banks,
    );
    this.haze.setShare(hazeShare(q));
    this.app.scene.add(this.haze.mesh);
  }

  override setQuality(q: QualitySettings): void {
    super.setQuality(q);
    this.haze?.setShare(hazeShare(q));
  }

  protected override invalidate(): void {
    super.invalidate();
    this.tintCache.clear();
  }

  override setEnabled(on: boolean): void {
    super.setEnabled(on);
    if (this.haze) this.haze.mesh.visible = on;
    if (!on && this.app) {
      this.app.env.haze = DEFAULT_HAZE;
      this.shared.lights.glow.setRGB(0, 0, 0);
    }
  }

  protected lifetime(cue: Omit<Cue, 'life' | 'end'>): number {
    switch (cue.fx) {
      case 'burst':
        if (num(cue.p.roll, 0, 0, 150) > 0) return cue.dur + num(cue.p.life, 6, 1, 30) + 1;
        return cue.dur + Math.min(22, num(cue.p.life, 16, 1, 30) + 6);
      case 'lowfog': {
        // (the cue stays active at least LightingSystem's own linger of the bank, 10 s: writeLowFog / deckSmoke find
        // their bank through the active cues, so a short `release` must not cut their lit layer off)
        const rel = this.lowfogRelease(cue);
        return cue.dur + (rel > 0 ? Math.min(19.5, Math.max(rel, LOWFOG_RELEASE) + 0.5) : 16);
      }
      default:
        return cue.dur;
    }
  }

  protected expand(cue: Cue, out: EmitterSet): void {
    if (cue.fx === 'burst') this.burst(cue, out);
    else if (cue.fx === 'lowfog') this.lowfog(cue, out);
  }

  /**
   * Smoke cannon bursts. Extensions (docs/show-format-ext/pyro.md): `glow` (0..4: the cloud is
   * self-lit in its colour — a lit CO2 / smoke whiteout, cyan-lit plumes — and lights the haze and
   * floor around it), `density` (0.2..4 opacity multiplier: a thick bank that hides the set),
   * `life` (s), `rise` (speed multiplier), `rate` (puffs per second over dur: lantern crystals
   * puffing smoke; without it one burst over min(dur, 4) s). Round 11 (docs/show-format-ext/fog.md): `roll` (m):
   * a smoke roll-out over the deck and the field instead of a rising plume (rollOut).
   */
  private burst(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const pts = this.app.anchors.resolve(cue.targets, 'wing_tips');
    const size = num(p.size, 1, 0.2, 8);
    const tint = fxColor(p.color, this.palette, this.c1, 'white').clone();
    const glow = num(p.glow, 0, 0, 4);
    const density = num(p.density, 1, 0.2, 4);
    const lifeS = num(p.life, 13, 1, 30);
    const rise = num(p.rise, 1, 0.2, 4);
    const rate = num(p.rate, 0, 0, 8);
    // `lift` (m) raises the nozzle above the anchor; the lantern crystals puff from the top of their hood
    const lift = num(p.lift, cue.targets.includes('pillars_top') ? 1.8 : 0, -10, 30);
    // `roll` (m): the cannons throw their smoke out as a low wall rolling over the deck and the field (v1416.84)
    const roll = num(p.roll, 0, 0, 150);
    if (roll > 0 && pts.length) {
      this.rollOut(cue, out, pts, roll, tint, glow, density, num(p.life, 6, 1, 30), lift);
      return;
    }
    // a smoke cannon's plume grows sub-linearly with its size class, and many targets share the
    // volume (12 wing heads must not stack into one opaque cloud that hides the fire it frames)
    const sq = Math.sqrt(size);
    const share = 1 / Math.sqrt(Math.max(1, pts.length / 4));
    const psc = Math.min(1, this.quality.particleScale * 1.5);
    // self-lit clouds: the colour glows (decaying over the cloud's first seconds)
    const self = glow > 0 ? tint.clone().multiplyScalar(glow * 2.2) : null;
    // one-shot, staggered over the emission window (a continuous emitter would only ever release
    // emitDur / life of its particles); plain bursts keep roughly their authored (thin) density,
    // bursts that use the extension params get all of theirs
    const ext = p.glow !== undefined || p.density !== undefined || p.rate !== undefined || p.life !== undefined;
    const flags = self ? F.SELFLIT : 0;
    const alpha = Math.min(0.95, 0.28 * density);
    const puffs = rate > 0 ? Math.max(1, Math.min(Math.floor(cue.dur * rate) + 1, Math.floor(64 / Math.max(1, pts.length)))) : 1;
    const dt = rate > 0 ? cue.dur / puffs : 0;
    // a glowing (lit) burst is a sudden cloud: most of it is out within the first ~0.7 s
    const emitDur = rate > 0 ? Math.min(0.35, dt * 0.8) : Math.max(0.4, Math.min(cue.dur, glow > 0 ? 0.7 : 4));
    for (let j = 0; j < puffs; j++) {
      const t0 = cue.t + j * dt;
      pts.forEach((pos, i) => {
        const n0 = Math.max(rate > 0 ? 4 : 3, Math.round(9 * sq * share * psc * Math.sqrt(density) * (rate > 0 ? 0.45 : 1)));
        const n = ext ? n0 : Math.max(2, Math.round(n0 * Math.min(1, 0.12 + (1.5 * emitDur) / lifeS)));
        const e = new Emitter(DIST.CONE, flags)
          .on(L_FOG)
          .origin(pos.x, pos.y + lift, pos.z)
          .time(t0)
          .dir(0, 1, 0.25, 0.7)
          .speed(2.5 * sq * rise, 6.5 * sq * rise)
          .physics(1.1, 0.25)
          .color(tint, rate > 0 ? Math.min(0.95, alpha * 1.5) : alpha)
          .life(lifeS * 0.62, lifeS)
          .emit(n, 0, emitDur / n)
          .size((1.5 + 1.2 * sq) * (rate > 0 ? 0.6 : glow > 0 ? 1.8 : 1), 7.5 * sq * (rate > 0 ? 0.55 : 1))
          .trail(0.45, 0.28)
          .seed(this.sub(cue, i + j * 131))
          .set(R.X1, 0.12)
          .set(R.X2, 0.85)
          .set(R.Y0, 0.85)
          .set(R.Y2, 0.05)
          .set(R.Y3, 1)
          .set(R.Z0, 1.25)
          .set(R.Z3, PUFF.SMOKE)
          .window(t0, t0 + emitDur + lifeS + 0.5);
        if (self) e.color2(self, 0).set(R.X0, Math.max(0.6, Math.min(3, cue.dur * 0.6)));
        out.add(e);
      });
    }
    if (self && pts.length) {
      // the glowing cloud lights the haze and the floor around it: one line light per target and per
      // group of its points that lie together (round 7: the targets touch each other, so a distance
      // rule alone merged the roof row and both wings of v76 into one 176 m box, and the deck front +
      // both side sections of v873.7 into one 182 m line; the two side sections are separate clouds)
      const dur = Math.max(0.5, Math.min(cue.dur, 3) + 0.8);
      const names = this.app.anchors.names();
      const perTarget = this.tune.perTarget && cue.targets.length > 1 && cue.targets.every((tg) => names.includes(tg));
      const groups = perTarget ? cue.targets.flatMap((tg) => clusters(this.app.anchors.resolve([tg], 'wing_tips'), 30)) : clusters(pts, 30);
      // A line light is as bright along all of its length, so a group keeps total * w / sqrt(sum w²):
      // one group = the single light it replaces, far-apart groups keep most of their own brightness,
      // and where neighbouring groups overlap their sum stays near the one cloud's light (round-7
      // measurements: sharing the total linearly dimmed v875-876, not sharing at all over-lit v1552)
      const total = glow * 0.7 * sq * Math.min(2, Math.sqrt(pts.length));
      let w2 = 0;
      for (const grp of groups) w2 += Math.min(4, grp.length);
      const wSum = Math.sqrt(w2);
      for (const grp of groups) {
        const mn = new THREE.Vector3(Infinity, Infinity, Infinity);
        const mx = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
        for (const q of grp) {
          mn.min(q);
          mx.max(q);
        }
        mn.y = mx.y = (mn.y + mx.y) * 0.5 + 4 * sq;
        out.lights.push({ kind: 1, t0: cue.t, t1: cue.t + dur, decay: dur * 0.6, strobe: 0, color: tint.clone(), peak: (total * Math.min(2, Math.sqrt(grp.length))) / wSum, pos: mn.clone().add(mx).multiplyScalar(0.5), a: mn.clone(), b: mx.clone(), radius: 8 + 6 * sq, haze: 1 });
      }
    }
  }

  /**
   * `fog.burst` with `roll` (m): a smoke roll-out. The cannons along the targets throw a wall of smoke forward (towards
   * the field, +z) and sideways over the deck and `roll` m out over the field; the cloud is big from its first frames
   * (half of its reach within ~0.25 s, the rest within ~1 s) and stays low (its top ~0.35 x its reach), then hangs and
   * spreads over its `life` (default 6 s). With `glow` it is lit from inside in its colour while the cue lasts (the
   * flash that lights it: v1416.84-1417.28, the terrace frame full of white-lit smoke) and goes dark within ~0.3 s
   * after the cue; its light (a lit-smoke line light over the rolled-out cloud) fills the haze around it.
   * One emitter per group of targets that lie together.
   */
  private rollOut(cue: Cue, out: EmitterSet, pts: THREE.Vector3[], roll: number, tint: THREE.Color, glow: number, density: number, lifeS: number, lift: number): void {
    const groups = clusters(pts, 30);
    const psc = Math.min(1, this.quality.particleScale * 1.5);
    // reach of the wall: drag k, the fastest puffs travel `roll` m (distance = v0 / k (1 - e^-kt))
    const k = 2.6;
    const R0 = 5 + 0.2 * roll;
    const emitDur = 0.12;
    const alpha = Math.min(0.95, 0.34 * density);
    const self = glow > 0 ? tint.clone().multiplyScalar(glow * 2.2) : null;
    // (the flash that lights it goes out at the cue end: the self-light is gone ~0.15 s after it, so the next shot
    // does not inherit a glowing cloud, v1417.28)
    const lit = cue.t + Math.max(0.15, cue.dur - 0.15);
    const share = 1 / Math.sqrt(groups.length);
    let w2 = 0;
    for (const grp of groups) w2 += Math.min(4, grp.length);
    const wSum = Math.sqrt(w2);
    groups.forEach((grp, gi) => {
      const mn = new THREE.Vector3(Infinity, Infinity, Infinity);
      const mx = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
      for (const q of grp) {
        mn.min(q);
        mx.max(q);
      }
      const c = mn.clone().add(mx).multiplyScalar(0.5);
      const wide = mx.x - mn.x;
      const n = Math.max(8, Math.round((20 + 0.9 * roll + 0.12 * wide) * share * psc * Math.sqrt(density)));
      const e = new Emitter(DIST.BOX, self ? F.SELFLIT : 0)
        .on(L_FOG)
        .origin(c.x, c.y + lift + 1, c.z + 2)
        .axis(wide + 8, 2, mx.z - mn.z + 4)
        .time(cue.t)
        // out over the field (+z), fanned sideways, a little upwards
        .dir(0, 0.32, 1, 1.05)
        .speed(0.12 * roll * k, roll * k)
        .physics(k, 0.35)
        .color(tint, alpha)
        .life(lifeS * 0.7, lifeS)
        .emit(n, 0, emitDur / n)
        .size(0.45 * R0, R0)
        .trail(0.35, 0.3)
        .seed(this.sub(cue, 7300 + gi))
        .set(R.X1, 0.1)
        .set(R.X2, 0.8)
        .set(R.Y0, 0.85)
        .set(R.Y2, Math.min(0.2, 0.15 / lifeS))
        .set(R.Y3, 0.6)
        .set(R.Z0, 1.25)
        .set(R.Z3, PUFF.SMOKE)
        .window(cue.t, cue.t + emitDur + lifeS + 0.5);
      if (self) e.color2(self, 0).set(R.X0, Math.max(0.5, Math.min(3, cue.dur * 1.5))).litUntil(lit);
      out.add(e);
      if (self) {
        // the lit cloud lights the air around it: a lit-smoke line light over the rolled-out wall
        const zc = c.z + 0.45 * roll;
        const y = c.y + lift + 0.2 * roll;
        const a = new THREE.Vector3(mn.x - 0.3 * roll, y, zc);
        const b = new THREE.Vector3(mx.x + 0.3 * roll, y, zc);
        const peak = (glow * 0.7 * Math.sqrt(R0 / 5) * Math.min(2, Math.sqrt(grp.length))) / wSum;
        const d = Math.max(0.3, cue.dur);
        out.lights.push({ kind: 1, t0: cue.t, t1: lit + 0.3, decay: d * 0.6, strobe: 0, color: tint.clone(), peak, pos: c.clone().setZ(zc).setY(y), a, b, radius: 8 + 0.35 * roll, haze: 1 });
      }
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
    // the machines stop at the cue end; the bank already out there thins out over `release` s
    const rel = this.lowfogRelease(cue);
    const tail = rel > 0 ? Math.min(life * 1.5, rel + 0.5) : life * 1.5;
    // the bank is there when the cue says it is (the video's fog is on screen at the cue time): the ring buffer of
    // puffs runs from one life before the cue (every puff already out, at its own age) and the bank fades in over
    // the ramp time — without it only 1 / 13 of the puffs were born per second and a 5-8 s cue never got its bank
    const pre = this.tune.prewarm ? life : 0;
    // `fadeIn` (s): how fast the (pre-warmed) bank comes in (default 3; a short bank of 1.5-2 s needs ~0.3 so it is
    // there in full while it lasts, v602.25-603.75). Without prewarm it is the ramp of the machines' emission.
    const fadeIn = num(p.fadeIn, LOWFOG_FADE_IN, 0.05, 10);
    // saturated smoke (the red finale bank) keeps its colour; white / pale fog stays neutral. The
    // colours are linear: even 10 % of white turns a deep red bank salmon on screen, so a saturated
    // colour only gets a trace of it
    const raw = fxColor(p.color, this.palette, this.c1, 'white');
    const rawSat = 1 - Math.min(raw.r, raw.g, raw.b) / Math.max(raw.r, raw.g, raw.b, 1e-4);
    const tint = raw.lerp(WHITE, rawSat > 0.6 ? 0.025 : 0.3).clone();
    // [centre, extent, density share, floor y, flat aspect]
    const regions: [THREE.Vector3, THREE.Vector3, number, number, number][] = [];
    const deckY = Math.max(0, y - 0.3);
    // a dense bank (density over 0.9, the thick white bank of v797-805) stands taller near the machines: its puffs
    // billow up to ~4-5 m, the pillar shafts stand in it (v802.75)
    const tk = Math.min(1, Math.max(0, (density - 0.9) / 0.6));
    const tall = tk * tk * (3 - 2 * tk) * this.tune.tallBank;
    const asp = 0.32 + 0.2 * tall;
    if (area !== 'field') regions.push([new THREE.Vector3(cx, deckY + 0.5 + 1.2 * tall, z - 9), new THREE.Vector3(w, 0.7 + 2 * tall, 20), 0.35, deckY, asp]);
    if (area !== 'deck' || p.spill !== false) regions.push([new THREE.Vector3(cx, 0.45 + 1.2 * tall, z + 16), new THREE.Vector3(w * 0.95, 0.5 + 2 * tall, 34), area === 'deck' ? 0.55 : 1, 0, asp]);
    // (the bank thins out over the far field: machines on the deck, the fog flows out and settles —
    // the lit laser sea over it is the lasers' own layer; the video's far field reads dark, v1536)
    if (area === 'field' || area === 'all') regions.push([new THREE.Vector3(0, 0.45, 90), new THREE.Vector3(90, 0.5, 130), 0.65, 0, 0.32]);
    regions.forEach(([c, ext, dk, floorY, aspect], i) => {
      // the big field regions use larger, fainter sheets so the bank reads continuous, not as discs
      const big = ext.x * ext.z > 4000;
      const sz = big ? 1.5 : 1;
      const n = Math.max(12, Math.round(((ext.x * ext.z) / (60 * sz)) * Math.min(1, this.quality.particleScale * 1.3)));
      out.add(
        new Emitter(DIST.BOX, F.FLAT | F.RAMP)
          .on(L_FOG)
          .originV(c)
          .time(cue.t - pre)
          .axisV(ext)
          .dir(0, 0.05, 1, 0.8)
          .speed(0.2, 0.7)
          .physics(0.25, 0)
          .color(tint, (0.42 * density * dk) / Math.sqrt(sz))
          .life(life * 0.7, life)
          .emit(Math.min(n, 400), dur + life * 0.5 + pre)
          .size(6.5 * sz, 5 * sz)
          .trail(0.7, 0.2)
          .seed(this.sub(cue, i))
          .set(R.X1, 0.03)
          .set(R.X2, 0.7)
          .set(R.X3, fadeIn)
          .set(R.Y0, 0.9)
          .set(R.Y1, floorY - 0.2)
          .set(R.Y2, 0.25)
          .set(R.Y3, 0.35)
          .set(R.Z0, 1.3)
          .set(R.Z1, aspect)
          .set(R.Z3, PUFF.FOG)
          .releaseAfter(rel > 0 ? cue.t + cue.dur : 0, rel)
          .visibleFrom(pre > 0 ? cue.t : 0)
          .window(cue.t, cue.t + dur + tail),
      );
    });
  }

  /**
   * `release` (s) of a `fog.lowfog` cue: after the cue ends the bank fades out over this time (the machines stop,
   * the fog flows away). 0 = the puffs live out their life (up to ~16 s after the cue).
   */
  private lowfogRelease(cue: Omit<Cue, 'life' | 'end'>): number {
    const r = cue.p.release;
    if (typeof r === 'number' && Number.isFinite(r)) return Math.min(30, Math.max(0.1, r));
    return Math.max(0, this.tune.release);
  }

  // ------------------------------------------------------------------ haze timeline

  private rebuildLevels(): void {
    this.levels.length = 0;
    let cur = DEFAULT_HAZE;
    const gCur = new THREE.Color(0, 0, 0);
    for (const c of this.app.show.all('fog')) {
      if (c.fx !== 'level') continue;
      const to = num(c.p.haze, num(c.p.density, cur, 0, 1.5), 0, 1.5);
      const fade = num(c.p.fade, 2, 0, 120);
      // value at the moment this segment starts (previous segment evaluated at c.t)
      const prev = this.levels[this.levels.length - 1];
      if (prev) {
        cur = evalSeg(prev, c.t);
        evalGlow(prev, c.t, gCur);
      }
      // `glow` (0..3) + `glowColor`: the whole smoke volume glows in that colour (red pyro scenes)
      const g = num(c.p.glow, 0, 0, 3);
      const g1 = g > 0 ? fxColor(c.p.glowColor ?? c.p.color, this.app.show.paletteAt(c.t, this.palette), new THREE.Color(), 'primary').multiplyScalar(g * 0.6) : new THREE.Color(0, 0, 0);
      this.levels.push({ t: c.t, fade, from: cur, to, g0: gCur.clone(), g1 });
      cur = to;
    }
    this.levelRev = this.app.show.revision;
  }

  private segAt(t: number): number {
    const L = this.levels;
    if (!L.length || t < L[0].t) return -1;
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
    return idx;
  }

  private hazeAt(t: number): number {
    const i = this.segAt(t);
    return i < 0 ? DEFAULT_HAZE : evalSeg(this.levels[i], t);
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

  /**
   * Colour of the smoke hanging in the air: coloured smoke cannons (pink whiteout, red smoke bank)
   * tint the haze they thicken, weighted like the smoke accumulation (seek-safe).
   */
  private smokeTint(t: number): THREE.Color {
    const all = this.app.show.all('fog');
    let lo = 0,
      hi = all.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (all[mid].t < t - 50) lo = mid + 1;
      else hi = mid;
    }
    const sum = this.tintSum.setRGB(0, 0, 0);
    let W = 0;
    for (let i = lo; i < all.length; i++) {
      const c = all[i];
      if (c.t > t) break;
      if (c.fx !== 'burst') continue;
      const w = smokeWeight(c, false);
      if (w <= 0) continue;
      const a = t - c.t;
      const k = w * (1 - Math.exp(-a / 1.2)) * Math.exp(-a / 22);
      let col = this.tintCache.get(c.id);
      if (!col) {
        col = fxColor(c.p.color, this.app.show.paletteAt(c.t, this.palette), new THREE.Color(), 'white');
        const m = Math.max(col.r, col.g, col.b, 1e-4);
        col.multiplyScalar(1 / m);
        this.tintCache.set(c.id, col);
      }
      sum.r += col.r * k;
      sum.g += col.g * k;
      sum.b += col.b * k;
      W += k;
    }
    this.tint.setRGB(1, 1, 1);
    if (W > 1e-4) {
      sum.multiplyScalar(1 / W);
      // (linear colours: the haze of a thick red smoke bank must not stay salmon)
      this.tint.lerp(sum, Math.min(0.96, W / (W + 0.3)));
    }
    return this.tint;
  }

  protected override afterUpdate(ctx: FrameContext): void {
    if (this.levelRev !== this.app.show.revision) this.rebuildLevels();
    const t = ctx.showTime;
    const level = this.hazeAt(t);
    this.hazeLevel = level;
    const ground = this.accumulate('pyro', t, false) + this.accumulate('fog', t, false);
    const pyro = ground + this.accumulate('fireworks', t, false);
    // smoke of the pyro and the smoke / CO2 cannons (not the fireworks, whose smoke hangs over the site) for the banks
    this.groundSmoke = 1 - Math.exp(-ground);
    const sky = this.accumulate('fireworks', t, true);
    this.stageSmoke = 1 - Math.exp(-pyro);
    this.skySmoke = 1 - Math.exp(-sky);
    const env = this.app.env;
    // env.haze drives beam / laser / crowd-scatter visibility everywhere; pyro smoke hangs around
    // the stage, it does not thicken the air over the whole field — so it only nudges the level
    env.haze = Math.min(1, level + this.stageSmoke * 0.08);
    // smoke-volume glow of the current level segment (fog.level glow)
    const si = this.segAt(t);
    if (si >= 0) evalGlow(this.levels[si], t, this.glowNow);
    else this.glowNow.setRGB(0, 0, 0);
    this.shared.lights.glow.copy(this.glowNow);
    if (this.haze) {
      // pyro smoke thickens the stage cloud, but only moderately: a flame ring must not turn the
      // stage into one glowing blob. The field layer is thinner with a crowd present (the bodies
      // already break up the view; the veil in front of the stage belongs to the empty field).
      const tribe = this.crowdMode() === 'tribe';
      // atmos.glow `smoke`: the site fills with smoke (pink whiteout v76, red smoke v1510-1537)
      const siteSmoke = Math.min(1, Math.max(0, Number.isFinite(env.smoke) ? env.smoke : 0));
      // (denser in proportion, plus a bank of its own that fills the air even where no haze hung)
      const sk = 1 + 2 * siteSmoke;
      const stage = (0.062 * level + 0.1 * this.stageSmoke) * sk + 0.22 * siteSmoke;
      const field = ((0.022 * level + 0.02 * this.stageSmoke) * sk + 0.09 * siteSmoke) * (tribe ? 0.55 : 1);
      const skyD = 0.02 * level + 0.2 * this.skySmoke + 0.12 * siteSmoke;
      // low smoke banks (round 12): the pyro and the smoke / CO2 cannons build a bank at the deck lip and round the
      // pillar feet (their accumulated smoke: ~10-20 s to clear, v70 / v505 / v1047; bankBase 0: the show haze alone
      // leaves none, a trace cost v240 / v289); the side sections and arms carry a band of low fog in the castle-base
      // wash from the first frame (the U of the opening drone shots, v30)
      const bt = this.tune;
      // (eased in: a trace of smoke leaves no bank — v240 / v289 keep a clean floor; a burst of cannons does, v505)
      const gs = Math.min(1, Math.max(0, (this.groundSmoke - bt.bankK0) / Math.max(0.01, bt.bankK1 - bt.bankK0)));
      const bSmoke = bt.bankSmoke * gs * gs * (3 - 2 * gs);
      const bBase = bt.bankBase * level;
      const bSide = bt.bankSides * level + 0.6 * bSmoke;
      this.haze.setBanks((bBase + bSmoke) * bt.bankDeck, (bBase + bSmoke) * bt.bankPillars, bSide, bSide * bt.bankArms);
      this.haze.setShaftLight(env.pillarShaftColor, env.pillarShaftIntensity);
      const cm = this.cameraMode();
      this.haze.setViewer(cm === 'first' || cm === 'third' ? this.tune.viewer : 0);
      this.haze.setDensity(stage, field, skyD);
      // close-ups at the deck: distance from the camera to the lit deck volume (X ±37, Z −30…8, Y ≤ 20)
      const cp = ctx.camera.position;
      const ex = Math.max(0, Math.abs(cp.x) - 37);
      const ez = Math.max(0, cp.z - 8, -30 - cp.z);
      const ey = Math.max(0, cp.y - 20);
      const dDeck = Math.sqrt(ex * ex + ey * ey + ez * ez);
      const cu = 1 - Math.min(1, Math.max(0, (dDeck - 6) / 22));
      this.haze.setCloseUp(cu * cu * (3 - 2 * cu));
      // the smoke filling the site takes some of the hue of the light it holds: the tint leans to the
      // site glow with its smoke (round 7: 0.6 -> 0.3 per unit of smoke; the v76 whiteout reads
      // pink-WHITE, 241/180/174, and the white gerb light on it must not turn deep pink)
      const tint = this.smokeTint(t);
      const g = env.glowColor;
      const gm = Math.max(g.r, g.g, g.b);
      if (siteSmoke > 0 && gm > 1e-3) {
        const k = this.tune.tintLean * siteSmoke;
        tint.setRGB(tint.r + (g.r / gm - tint.r) * k, tint.g + (g.g / gm - tint.g) * k, tint.b + (g.b / gm - tint.b) * k);
      }
      this.haze.setTint(tint);
    }
  }

  /** the camera rig's mode ('first', 'third', 'free', 'flyover', 'showcam'), read duck-typed */
  private cameraMode(): string {
    if (this.camSys === undefined) this.camSys = (this.app.get('camera') as unknown as { mode?: unknown } | undefined) ?? null;
    const m = this.camSys?.mode;
    return typeof m === 'string' ? m : 'showcam';
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
    s.groundSmoke = +this.groundSmoke.toFixed(2);
    s.skySmoke = +this.skySmoke.toFixed(2);
    s.hazeSprites = this.haze?.count ?? 0;
    return s;
  }

  override dispose(): void {
    super.dispose();
    this.haze?.dispose();
  }
}

/** share of the haze sprites a preset draws */
function hazeShare(q: QualitySettings): number {
  return q.level === 'ultra' ? 1 : q.level === 'high' ? 0.8 : q.level === 'medium' ? 0.55 : 0.35;
}

function evalSeg(s: LevelSeg, t: number): number {
  if (s.fade <= 0) return s.to;
  const k = Math.min(1, Math.max(0, (t - s.t) / s.fade));
  return s.from + (s.to - s.from) * k * k * (3 - 2 * k);
}

function evalGlow(s: LevelSeg, t: number, out: THREE.Color): THREE.Color {
  const k = s.fade <= 0 ? 1 : Math.min(1, Math.max(0, (t - s.t) / s.fade));
  return out.copy(s.g0).lerp(s.g1, k * k * (3 - 2 * k));
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
  if (c.sys === 'fog') return c.fx === 'burst' ? 0.25 * Math.min(8, n(p.size, 1)) * Math.min(3, n(p.density, 1)) * (n(p.rate, 0) > 0 ? 0.4 : 1) : 0;
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
      return 0.14 * n(p.size, 1) * (c.dur >= 2 || p.type === 'bengal' ? Math.max(0.5, c.dur * 0.5) : 1);
    case 'bengal':
      return 0.12 * c.dur;
    default:
      return 0;
  }
}
