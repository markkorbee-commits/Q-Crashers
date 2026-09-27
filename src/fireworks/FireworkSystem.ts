import * as THREE from 'three';
import type { AnchorName } from '../core/Anchors';
import type { QualitySettings } from '../core/types';
import type { Cue } from '../show/ShowTypes';
import { CueFxSystem, EmitterSet } from '../fx/core/CueFxSystem';
import { DIST, Emitter, F, PUFF, R, aimVelocity, apexTime, ballistic, hf, speedForHeight, type FlashSpec } from '../fx/core/Emitter';
import { FxLayer, ribbonGeometry } from '../fx/core/FxLayer';
import { bool, colorList, num, starColor, str } from '../fx/core/fxColors';
import { centroid, maxAbsX, pickEven, stretches } from '../fx/core/placement';
import { SHELLS, SHELL_TYPES, shellSpec, type ShellSpec } from './shells';
import { FW_CURL, FW_SHED, FW_SWIM, FW_TRUE, STAR_FRAG, STAR_VERT } from './starShader';

const L_SMOKE = 0;
const L_FLASH = 1;
const L_STARS = 2;

const GREY = new THREE.Color(0.6, 0.6, 0.62);
const WHITE = new THREE.Color(1, 1, 1);
const LIFT = new THREE.Color(1.0, 0.55, 0.2);
const G = 9.81;
/** default radius (m per `size`) of a drone flare's glow halo */
const FLARE_HALO = 7.5;
const LIFT_DRAG = 0.3;
const COMET_DRAG = 0.42;
const DEG = Math.PI / 180;

interface ShellOpts {
  /** launch time (== burst time when there is no visible lift) */
  tL: number;
  tb: number;
  radius: number;
  smoke: number;
  lift: boolean;
  flashK: number;
  /** optional pistil / change colour */
  col2: THREE.Color | null;
  /** optional lift-trail colour */
  liftCol?: THREE.Color | null;
  /** star count multiplier (small comet-top breaks have only a few stars) */
  starsK?: number;
  /** burn time multiplier (small comet-top breaks burn out sooner) */
  burnK?: number;
  /** colour-true crackle (`popColor`): the pops burn in this colour instead of white-hot micro-flashes */
  popCol?: THREE.Color | null;
}

/** How a comet (or a cake shot) looks: resolved once per cue from its params. */
interface CometLook {
  col: THREE.Color;
  gain: number;
  /** tail colour (the head keeps `col`), null = the tail cools from the head colour */
  tailCol: THREE.Color | null;
  /** head radius (m) */
  head: number;
  /** trail length (s), 0 = automatic (the whole climb for a plain comet) */
  tail: number;
  trailGain: number;
  /** 0..1 flitter sparks shed along the tail */
  glitter: number;
  /** crackling tail (delayed micro-flashes behind the head) */
  crackle: boolean;
  /** trail drift (m/s): soft wavy tails */
  wave: number;
  intensity: number;
  end: string;
  /** break radius for `end` shell types (m, 0 = from the climb height) */
  endSize: number;
  serpent: boolean;
  zipper: boolean;
  /** > 1: a dense spark stream (the sweeping heart / ring streams) instead of single comets */
  spray: number;
  /** a lingering smoke trail along the climb */
  smoke: boolean;
  /** rad/s the flight turns while it slows (+ = over the top towards the outside): hooks, rings */
  curl: number;
  /** rad the turn stops after (0 = no limit): open lobes (the heart of v88-92) instead of rings */
  arc: number;
  /** s a pearl head hangs on at the top */
  pearlTime: number;
  /** 0..3: soft glow travelling with the heads (the bloom of a dense fan, see fanGlow) */
  glow: number;
  /** colour-true crackle pops (`popColor`), null = white-hot micro-flashes */
  popCol: THREE.Color | null;
  /** `popColor: "star"`: the pops burn in each comet's own colour */
  popStar: boolean;
  /** burn time multiplier of comet-top breaks and `pops` ends (`endBurn`, 1 = as before) */
  endBurn: number;
  /** m: the head wriggles sideways along its climb (`wriggle`): thin wavy comet columns */
  wriggle: number;
  /** rad/s of the wriggle (0 = the serpent default, 9) */
  wriggleHz: number;
  /** 0..3: a dense gerb-like spark tail (sparks falling from the climbing head, `gerb`) */
  gerb: number;
}

/**
 * Aerial fireworks: shells of 14 types, salvos, comets and comet fans, cakes, mines, drone flares
 * and the finale barrage. Physically based: lift charges are aimed analytically at the break point
 * (drag + gravity + wind), stars leave the break at speeds that make them travel the burst radius
 * during their burn, trails are the stars' own recent paths, crackle is a cloud of micro-flashes after
 * the stars die, glitter is sparks shed along the path that flash after a delay, and every break
 * flashes the LightEnv so the grounds, crowd, set and smoke light up in its colour. The stars use the
 * fireworks' own ribbon shader (starShader.ts).
 *
 * Param semantics (superset of docs/show-format.md, extensions in docs/show-format-ext/fireworks.md):
 *  - shell/salvo/finale `height` = break altitude above ground (m); `size` = burst radius (m);
 *    `rise` (s) overrides the lift time (0 = break exactly at the cue time); `liftColor`.
 *  - comet/cake/mine `height` = rise above the launch point (m).
 *  - launch points of comet/cake/mine: the targets, then `x` (number or list; y/z from the nearest
 *    target point unless `y`/`z` are given), `mirror`, `side` (left|right), `absx` [min,max] and
 *    `points` (indices, left -> right) narrow them down; `cross` (m) splits every point into an X-fan.
 *  - comet `count` = total comets: fewer than the target points -> evenly picked points, more ->
 *    a fan of ceil(count/points) per point; `per` forces comets per point (with `count` also given,
 *    `count` picks the points). One comet per point with `angle` > 0 makes a V (outer points lean
 *    outward, a negative angle leans them inward); `tilt` leans a whole fan outward (negative:
 *    inward). `end`: none|pearl|crackle|pops|<shell type>; `serpent`; `stagger`; `lean`.
 *  - comet/cake look: `tail` (s), `glitter` 0..1, `crackle`, `wave`, `width`, `intensity`,
 *    `tailColor` (or `color2`), `smoke`, `endSize`.
 *  - cake `type` (optional shell type) breaks every shot; `zipper`; `fill` n = comets per shot across
 *    the whole `angle` (a steady peacock fan); `from`/`to` (deg from vertical, + = outward) sweep one
 *    way across any range; `spray` = sparks per shot (dense sweeping streams: the heart / rings).
 *  - finale `types` (list) overrides the barrage mix, `comets` (per s) adds roof comet fans, `x`/`z`
 *    move the band, `depth` spreads it in z (shells all around a field camera).
 *  - flare: airborne drone flares from `from` to `to` over `dur` with self-lit smoke (`halo`, `haloGain`,
 *    `smokeGlow`, `smokeSize`).
 *  - round 11: launch points `pos` (absolute [[x,y,z],...]), `offset` ([dx,dy,dz], dx outward) and `between`
 *    (n extra points between neighbours: a denser wall); comet / cake `wriggle` (+ `wriggleHz`: thin wavy
 *    columns), `gerb` (a sheaf of streaks in the tail colour), `endBurn` (shorter comet-top breaks),
 *    `popColor` (colour-true crackle, also for shells / salvos / finales / mines); cake `jitter` (per-point
 *    phase); shell / salvo `life` (mean star burn time: the swimmers' wriggle duration).
 */
export class FireworkSystem extends CueFxSystem {
  readonly name = 'fireworks';
  protected readonly sys = 'fireworks' as const;
  protected override sharedLightCap = true;
  private readonly c1 = new THREE.Color();
  private readonly c2 = new THREE.Color();
  private readonly c3 = new THREE.Color();
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();
  private readonly acc = new THREE.Vector3();

  protected buildLayers(q: QualitySettings): void {
    const ps = q.particleScale;
    // shell smoke emitters are many and tiny (1–5 puffs living ~20 s): budget one 8-particle slot per
    // emitter row so a finale's smoke is not thinned out by slot scaling
    const smoke = this.shared.puffLayer('fw-smoke', Math.round(8192 * Math.max(0.35, ps)), 1024, 11);
    const flash = this.shared.puffLayer('fw-flash', 2048, 1024, 13);
    const stars = this.starLayer(q, Math.round(90000 * Math.max(0.15, ps)), 2048, 15);
    this.layers = [smoke, flash, stars];
    for (const l of this.layers) this.app.scene.add(l.mesh);
  }

  /** the fireworks' own star ribbons (additive HDR); long comet tails get more trail samples */
  private starLayer(q: QualitySettings, maxParticles: number, maxEmitters: number, renderOrder: number): FxLayer {
    const seg = q.level === 'mobile' ? 3 : q.level === 'medium' ? 5 : q.level === 'high' ? 8 : 10;
    const mat = new THREE.ShaderMaterial({
      name: 'fx-fw-stars',
      uniforms: { ...this.shared.uniforms, uSegments: { value: seg } },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    return new FxLayer({ name: 'fw-stars', slotSize: 32, maxEmitters, maxParticles, geometry: ribbonGeometry(seg), material: mat, renderOrder });
  }

  protected lifetime(cue: Omit<Cue, 'life' | 'end'>): number {
    const p = cue.p;
    const H = num(p.height, 90, 10, 400);
    const rise = p.rise !== undefined ? num(p.rise, 0, 0, 10) : riseTime(H);
    const smoke = bool(p.smoke, false) ? 12 : 0;
    switch (cue.fx) {
      case 'shell':
      case 'salvo':
        return cue.dur + rise + 6 + 24 + num(p.stagger, 0, 0, 2) * num(p.count, 8, 1, 60);
      case 'comet':
        return cue.dur + num(p.stagger, 0, 0, 2) * num(p.count, 10, 1, 200) * Math.max(1, num(p.per, 1, 1, 60)) + 5 + (p.end ? 24 : 9) + smoke;
      case 'cake':
        return cue.dur + 5 + (p.type ? 24 : 9) + smoke;
      case 'mine':
        return cue.dur + 12;
      case 'finale':
        return cue.dur + rise + 26;
      case 'flare':
        return Math.max(0.5, cue.dur) + 14;
      default:
        return cue.dur;
    }
  }

  protected expand(cue: Cue, out: EmitterSet): void {
    switch (cue.fx) {
      case 'shell':
        this.shellCue(cue, out);
        break;
      case 'salvo':
        this.salvo(cue, out);
        break;
      case 'comet':
        this.comets(cue, out);
        break;
      case 'cake':
        this.cake(cue, out);
        break;
      case 'mine':
        this.mines(cue, out);
        break;
      case 'finale':
        this.finale(cue, out);
        break;
      case 'flare':
        this.flares(cue, out);
        break;
      default:
        break;
    }
  }

  private points(cue: Cue, fallback: AnchorName): THREE.Vector3[] {
    return this.app.anchors.resolve(cue.targets, fallback).map((p) => p.clone());
  }

  /**
   * Launch points of a comet / cake / mine cue: the targets, optionally replaced by absolute `x`
   * positions (y/z taken from the target point nearest in x unless `y`/`z` are given), mirrored,
   * and narrowed to one `side`, an |x| range (`absx`) or explicit `points` (indices, left -> right).
   */
  private launchPoints(cue: Cue, fallback: AnchorName, dense = true): THREE.Vector3[] {
    const p = cue.p;
    const src = this.points(cue, fallback);
    let pts = src;
    const xs = numList(p.x);
    const pos = vec3List(p.pos);
    if (pos.length) {
      // `pos`: absolute launch points [[x, y, z], ...] (anywhere on the site, outside every anchor set)
      pts = bool(p.mirror, false) ? [...pos, ...pos.filter((v) => Math.abs(v.x) > 0.01).map((v) => new THREE.Vector3(-v.x, v.y, v.z))] : pos;
    } else if (xs.length) {
      const zs = numList(p.z);
      const ys = numList(p.y);
      const mirror = bool(p.mirror, false);
      const all = mirror ? [...xs, ...xs.filter((x) => Math.abs(x) > 0.01).map((x) => -x)] : xs;
      pts = all.map((x, i) => {
        let ref: THREE.Vector3 | null = null;
        let bd = Infinity;
        for (const s of src) {
          const d = Math.abs(s.x - x) + Math.abs(Math.sign(s.x) - Math.sign(x)) * 0.01;
          if (d < bd) {
            bd = d;
            ref = s;
          }
        }
        const k = i % xs.length;
        const y = ys.length ? ys[k % ys.length] : ref ? ref.y : 0;
        const z = zs.length ? zs[k % zs.length] : ref ? ref.z : 0;
        return new THREE.Vector3(x, y, z);
      });
    } else if (p.z !== undefined && numList(p.z).length) {
      const z = numList(p.z)[0];
      pts = src.map((s) => s.setZ(z));
    }
    const side = str(p.side, '');
    if (side === 'left') pts = pts.filter((v) => v.x < -0.01);
    else if (side === 'right') pts = pts.filter((v) => v.x > 0.01);
    const ax = numList(p.absx);
    if (ax.length >= 2) pts = pts.filter((v) => Math.abs(v.x) >= ax[0] - 0.01 && Math.abs(v.x) <= ax[1] + 0.01);
    const idx = numList(p.points);
    if (idx.length && pts.length) {
      const sorted = [...pts].sort((a, b) => a.x - b.x);
      const pick: THREE.Vector3[] = [];
      for (const k of idx) {
        const j = Math.round(k < 0 ? sorted.length + k : k);
        if (j >= 0 && j < sorted.length && !pick.includes(sorted[j])) pick.push(sorted[j]);
      }
      pts = pick;
    }
    // `between`: n extra launch points evenly between neighbouring points of each stretch of the row
    // (a denser comet wall along the U without new anchors; only a gap of more than 24 m splits a row)
    const nb = dense ? this.betweenCount(cue) : 0;
    if (nb > 0 && pts.length > 1) {
      const dense: THREE.Vector3[] = [];
      for (const s of stretches(pts, undefined, Infinity, 24)) {
        for (let k = 0; k < s.length; k++) {
          const a = pts[s[k]];
          dense.push(a);
          if (k + 1 >= s.length) continue;
          const b = pts[s[k + 1]];
          for (let j = 1; j <= nb; j++) dense.push(a.clone().lerp(b, j / (nb + 1)));
        }
      }
      pts = dense;
    }
    // `offset`: [dx, dy, dz] added to every point; dx points away from the centre line (mirrored), so
    // `offset: [19, 0, 20]` moves both crest rows 19 m further out and 20 m towards the audience
    const off = numList(p.offset);
    if (off.length) {
      const dx = off[0] ?? 0;
      const dy = off[1] ?? 0;
      const dz = off[2] ?? 0;
      pts = pts.map((v) => new THREE.Vector3(v.x + (Math.abs(v.x) < 0.5 ? 0 : Math.sign(v.x)) * dx, v.y + dy, v.z + dz));
    }
    return pts;
  }

  /**
   * `between` (0-8) of a cue; 0 on the mobile preset: its star budget (938 slots) is a quarter of
   * desktop's and the wall of v252.9 already fills it, so a denser row would thin every other effect
   * of the moment down to 25 %
   */
  private betweenCount(cue: Cue): number {
    return this.quality.level === 'mobile' ? 0 : Math.round(num(cue.p.between, 0, 0, 8));
  }

  private gravAcc(k: number, windK = 1): THREE.Vector3 {
    return this.acc.copy(this.shared.wind).multiplyScalar(k * windK).add(this.tmpB.set(0, -G, 0));
  }

  // ------------------------------------------------------------------ shells

  /** one complete shell: lift + star burst (+ crackle pops / flitter) + break flash + smoke + light flash */
  private addShell(out: EmitterSet, seed: number, spec: ShellSpec, o: THREE.Vector3, B: THREE.Vector3, col: THREE.Color, gain: number, opts: ShellOpts): void {
    const { tL, tb, radius } = opts;
    const rise = tb - tL;
    if (opts.lift && rise > 0.05) {
      const v0 = aimVelocity(this.tmpA, o, B, LIFT_DRAG, this.gravAcc(LIFT_DRAG), rise);
      const lg = spec.liftGain;
      const palm = lg > 2;
      const lc = opts.liftCol ?? null;
      out.add(
        new Emitter(DIST.SINGLE, lc ? F.FLICKER : F.COOL | F.FLICKER)
          .on(L_STARS)
          .originV(o)
          .time(tL)
          .dir(v0.x, v0.y, v0.z)
          .speed(v0.length())
          .physics(LIFT_DRAG, -G)
          .color(palm ? col : lc ?? LIFT, (palm ? 7 : lc ? 4.5 : 2.2) * Math.min(lg, 2))
          .life(rise)
          .emit(1)
          .size(palm ? 0.3 : lc ? 0.14 : 0.11, 0.6)
          .trail(palm ? 0.9 : 0.5, palm ? 0.9 : 0.7)
          .seed(seed ^ 0x11)
          .set(R.Y0, palm ? 1.1 : 1.3)
          .set(R.Y2, 1.5)
          .set(R.Y3, 1)
          .set(R.Z0, 0.02)
          .window(tL, tb + 0.9),
      );
      out.add(
        new Emitter(DIST.SINGLE, 0)
          .on(L_FLASH)
          .origin(o.x, o.y + 0.8, o.z)
          .time(tL)
          .dir(0, 1, 0)
          .speed(2)
          .physics(1, 0)
          .color(this.c2.copy(lc ?? LIFT).lerp(WHITE, 0.5), 7)
          .life(0.25)
          .emit(1)
          .size(1.4, 1)
          .trail(1, 1)
          .seed(seed ^ 0x12)
          .set(R.X0, 0.05)
          .set(R.Z3, PUFF.FLASH)
          .window(tL, tL + 0.3),
      );
    }
    const k = spec.drag;
    const bk = opts.burnK ?? 1;
    const b0 = spec.burn[0] * bk;
    const b1 = spec.burn[1] * bk;
    const burnMean = (b0 + b1) * 0.5;
    const v = (radius * k) / (1 - Math.exp(-k * burnMean));
    const crossette = (spec.flags & F.CROSSETTE) !== 0;
    const nStars = Math.max(4, Math.round(this.pc(spec.stars, spec.minStars) * (opts.starsK ?? 1)));
    let flags = spec.flags;
    // crackle: `color2` is the colour of the crackle (red stars that crackle white), not a star
    // colour change — so a red/white crackle canopy stays red with white micro-flashes
    const popCol2 = spec.pops ? opts.col2 : null;
    if (opts.col2 && !popCol2) {
      if (spec === SHELLS.chrysanthemum || spec === SHELLS.brocade || spec === SHELLS.peony) flags |= F.PISTIL;
      else flags |= F.COLORCHANGE;
    }
    const tEnd = tb + b1 + spec.trail + 0.35;
    const stars = new Emitter(spec.dist, flags)
      .on(L_STARS)
      .originV(B)
      .time(tb)
      .speed(v * 0.93, v * 1.06)
      .physics(k, spec.grav)
      .color(col, spec.intensity * gain * 2.2)
      .life(b0, b1)
      .emit(crossette ? nStars * 4 : nStars)
      .size(spec.head, spec.tailW)
      .trail(spec.trail, spec.glitter)
      .seed(seed)
      .hz(spec.swimHz ?? (spec.hz ? spec.hz * (0.85 + 0.3 * hf(seed ^ 7)) : 0))
      .set(R.Y0, spec.trailGain)
      .set(R.Y1, spec.swim ?? 0)
      .set(R.Y2, spec.droop)
      .set(R.Y3, 1)
      .set(R.Z0, 0.03)
      .set(R.Z2, spec.jitter)
      .set(R.Z3, spec.wave ?? 0)
      .window(tb, tEnd);
    if (opts.col2 && !popCol2) stars.color2(opts.col2, 0.55);
    if (crossette) stars.set(R.X0, spec.split ?? 0.75).set(R.X1, v * 0.42);
    if (spec.dist === DIST.RING) {
      const a = (hf(seed ^ 3) - 0.5) * 1.3;
      const b = (hf(seed ^ 5) - 0.5) * 0.8;
      stars.axis(Math.sin(a), Math.sin(b) * 0.6, Math.cos(a));
    }
    out.add(stars);
    if (spec.pops) {
      const pops = spec.pops;
      const spread = (spec.popSpread ?? 0.7) * bk;
      const popE = new Emitter(spec.dist, 0).copyFrom(stars);
      const trueCol = opts.popCol ?? null;
      popE.f[R.FLAGS] = (spec.flags & ~F.FLICKER) | F.POPS | (trueCol ? FW_TRUE : 0);
      popE
        .on(L_STARS)
        // micro-flashes: the crackle colour, a touch of the star colour; not brighter than the stars' streaks
        // (`popColor`: colour-true pops, e.g. the red crackle canopy of v538-548)
        .color(trueCol ? this.c2.copy(trueCol) : popCol2 ? this.c2.copy(popCol2).lerp(col, 0.2) : this.c2.copy(col).lerp(WHITE, 0.65), (trueCol ? 30 : 24) * gain)
        .emit(nStars * pops)
        .size(0.26, 1)
        .set(R.X1, pops)
        .set(R.X2, spread)
        .set(R.X3, radius * 0.3)
        .window(tb + b0, tb + b1 + spread + 0.3);
      out.add(popE);
    }
    if (spec.shed) {
      // flitter: every star drops twinkling sparks along its path (brocade / glitter texture)
      const m = Math.max(2, Math.round(spec.shed * Math.min(1, 0.45 + this.quality.particleScale * 0.7)));
      const se = new Emitter(spec.dist, 0).copyFrom(stars);
      se.f[R.FLAGS] = (flags & (F.CROSSETTE | F.PISTIL | FW_SWIM)) | FW_SHED;
      se.on(L_STARS)
        .color(this.c2.copy(col).lerp(WHITE, 0.3), 16 * gain)
        .emit((crossette ? nStars * 4 : nStars) * m)
        .size(0.13, 1)
        .set(R.X1, m)
        .set(R.X2, 0.35)
        .set(R.X3, 0.8)
        .set(R.Z3, 0.4)
        .window(tb, tb + b1 + 1.1);
      out.add(se);
    }
    // the break flash (a burst of light in the smoke)
    const fs = spec.flashSize ?? 1;
    out.add(
      new Emitter(DIST.SINGLE, 0)
        .on(L_FLASH)
        .originV(B)
        .time(tb)
        .dir(0, 1, 0)
        .speed(0.1)
        .physics(1, 0)
        .color(this.c2.copy(col).lerp(WHITE, 0.45), 9 * gain * spec.flash * (0.5 + 0.5 * fs))
        .life(0.28)
        .emit(1)
        // a short, compact flash: a big lingering glow ball per break reads as a "dandelion"
        .size(radius * 0.28 * fs, radius * 0.18 * fs)
        .trail(0.5, 1)
        .seed(seed ^ 0x21)
        .set(R.X0, 0.055)
        .set(R.Z3, PUFF.FLASH)
        .window(tb, tb + 0.6),
    );
    // burst smoke, self-lit by its own stars while they burn, later lit by the show
    if (opts.smoke > 0) {
      out.add(
        new Emitter(DIST.SPHERE, F.SELFLIT)
          .on(L_SMOKE)
          .originV(B)
          .time(tb)
          .speed(radius * 0.55, radius * 1.15)
          .physics(3, 0.15)
          .color(GREY, 0.1)
          .color2(this.c2.copy(col).multiplyScalar(0.8 * gain), 0)
          .litUntil(tb + b1)
          .life(16, 24)
          .emit(opts.smoke)
          .size(radius * 0.2, radius * 0.5)
          .trail(0.5, 0.25)
          .seed(seed ^ 0x31)
          .set(R.X0, burnMean * 0.45)
          .set(R.X1, 0.05)
          .set(R.X2, 0.9)
          .set(R.Y0, 0.8)
          .set(R.Y2, 0.02)
          .set(R.Y3, 1)
          .set(R.Z0, 1)
          .set(R.Z3, PUFF.SMOKE)
          .window(tb, tb + 24.5),
      );
    }
    out.flashes.push({
      kind: 0,
      t0: tb,
      t1: tb + b1,
      color: col.clone(),
      peak: (0.35 + radius / 45) * spec.flash * opts.flashK * Math.min(1.5, gain),
      decay: burnMean * 0.45,
      pos: B.clone(),
      strobe: spec.hz ?? 0,
    });
  }

  /** shell smoke puffs per break (fewer in dense barrages) */
  private smokeCount(base: number): number {
    return Math.max(1, Math.round(base * Math.min(1, this.quality.particleScale * 1.4)));
  }

  private shellParams(cue: Cue, H: number) {
    const p = cue.p;
    const spec = shellSpec(p.type);
    const radius = num(p.size, defaultRadius(H) * spec.radiusK, 2, 150);
    // `life` (s): the stars' mean burn time (swimmers that wriggle ~3.3 s and fade, v751.5-755.5)
    const lifeK = p.life !== undefined ? num(p.life, 1, 0.2, 12) / ((spec.burn[0] + spec.burn[1]) * 0.5) : 1;
    return { spec, radius, lifeK };
  }

  private liftColor(cue: Cue): THREE.Color | null {
    const lc = cue.p.liftColor;
    if (typeof lc !== 'string' || !lc) return null;
    starColor(lc, this.palette, this.c2, 'white');
    return this.c2.clone();
  }

  /**
   * `popColor` (alias `crackleColor`): colour-true crackle. The pops of crackle stars / crackle ends /
   * crackling tails burn in this colour instead of as white-hot micro-flashes ("star" or true = each
   * star's own colour), so a red crackle canopy reads red at a distance (v538-548), not white-gold.
   */
  private popColor(cue: Cue, starCol: THREE.Color): THREE.Color | null {
    const v = cue.p.popColor ?? cue.p.crackleColor;
    if (v === true || v === 'star') return starCol.clone();
    if (typeof v !== 'string' || !v || v === 'false') return null;
    starColor(v, this.palette, this.c3, 'red');
    return this.c3.clone();
  }

  private shellCue(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    let pts: THREE.Vector3[];
    if (p.x !== undefined || p.z !== undefined) pts = [new THREE.Vector3(num(p.x, 0), 0, num(p.z, -60))];
    else if (cue.targets.every((t) => t === 'all' || t === 'left' || t === 'right' || t === 'center')) {
      // only filters: ONE shell from a (seeded) position of the filtered mortar line
      const pool = this.points(cue, 'fireworks_back');
      pts = pool.length ? [pool[Math.floor(hf(cue.seed) * pool.length) % pool.length]] : [new THREE.Vector3(0, 0, -60)];
    } else pts = this.points(cue, 'fireworks_back'); // named anchors: one shell per point
    const H0 = num(p.height, 90, 15, 400);
    const { spec, radius, lifeK } = this.shellParams(cue, H0);
    const cols = colorList(p.color, [spec.color]);
    const liftCol = this.liftColor(cue);
    pts.forEach((o, i) => {
      const seed = this.sub(cue, i);
      const H = Math.max(H0 * (1 + (hf(seed ^ 9) - 0.5) * 0.06), o.y + 12);
      const rise = p.rise !== undefined ? num(p.rise, 0, 0, 10) : riseTime(H - o.y);
      const tb = cue.t + rise + num(p.stagger, 0, 0, 3) * i;
      const B = new THREE.Vector3(o.x + (hf(seed ^ 1) - 0.5) * 0.06 * H, H, o.z + (hf(seed ^ 2) - 0.5) * 0.04 * H);
      const gain = starColor(cols[i % cols.length], this.palette, this.c1, spec.color);
      const col = this.c1.clone();
      const col2 = p.color2 ? (starColor(p.color2, this.palette, this.c2, 'white'), this.c2.clone()) : null;
      this.addShell(out, seed, spec, o, B, col, gain, { tL: tb - rise, tb, radius, smoke: this.smokeCount(5), lift: rise > 0, flashK: 1, col2, liftCol, popCol: this.popColor(cue, col), burnK: lifeK });
    });
  }

  private salvo(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const src = this.points(cue, 'fireworks_back');
    const c = centroid(src, new THREE.Vector3());
    // `x` / `z` move the centre of the line (e.g. alternating left / right salvos build a canopy)
    c.x = num(p.x, c.x, -400, 400);
    c.z = num(p.z, c.z, -400, 400);
    const count = Math.round(num(p.count, Math.max(3, Math.min(src.length, 12)), 1, 80));
    const spread = num(p.spread, 120, 0, 600);
    const depth = num(p.depth, 6, 0, 400);
    const H0 = num(p.height, 90, 15, 400);
    const { spec, radius, lifeK } = this.shellParams(cue, H0);
    const cols = colorList(p.color, [spec.color]);
    const pattern = str(p.pattern, 'line');
    const stagger = num(p.stagger, 0, 0, 3);
    const col2 = p.color2 ? (starColor(p.color2, this.palette, this.c2, 'white'), this.c2.clone()) : null;
    const liftCol = this.liftColor(cue);
    for (let i = 0; i < count; i++) {
      const seed = this.sub(cue, i);
      const u = count > 1 ? i / (count - 1) - 0.5 : 0;
      const o = new THREE.Vector3(c.x + spread * u + (count > 1 ? (hf(seed ^ 8) - 0.5) * 0.45 * (spread / (count - 1)) : 0), c.y, c.z + (hf(seed ^ 10) - 0.5) * depth);
      let H = H0;
      if (pattern === 'v') H = H0 * (0.75 + 0.75 * Math.abs(u));
      else if (pattern === 'arc') H = H0 * (1.1 - 0.8 * u * u);
      else if (pattern === 'random') H = H0 * (0.8 + 0.4 * hf(seed ^ 4));
      H = Math.max(H * (1 + (hf(seed ^ 9) - 0.5) * 0.2), o.y + 12);
      const rise = p.rise !== undefined ? num(p.rise, 0, 0, 10) : riseTime(H - o.y);
      const delay = stagger > 0 ? stagger * i : hf(seed ^ 6) * 0.28;
      const tb = cue.t + delay + rise;
      const B = new THREE.Vector3(o.x + (hf(seed ^ 1) - 0.5) * 0.04 * H, H, o.z + (hf(seed ^ 2) - 0.5) * 0.04 * H);
      const gain = starColor(cols[i % cols.length], this.palette, this.c1, spec.color);
      const col = this.c1.clone();
      this.addShell(out, seed, spec, o, B, col, gain, {
        tL: tb - rise,
        tb,
        radius: radius * (0.85 + 0.3 * hf(seed ^ 3)),
        smoke: this.smokeCount(count > 10 ? 3 : 4),
        lift: rise > 0,
        flashK: count > 8 ? 0.7 : 1,
        col2,
        liftCol,
        popCol: this.popColor(cue, col),
        burnK: lifeK,
      });
    }
  }

  // ------------------------------------------------------------------ comets

  /** the comet look of a comet / cake cue (colour is set per point by the caller) */
  private cometLook(cue: Cue, end: string, spray: number): CometLook {
    const p = cue.p;
    const tc = p.tailColor ?? p.color2;
    let tailCol: THREE.Color | null = null;
    if (typeof tc === 'string' && tc) {
      starColor(tc, this.palette, this.c2, 'gold');
      tailCol = this.c2.clone();
    }
    const serpent = bool(p.serpent, false);
    return {
      col: new THREE.Color(),
      gain: 1,
      tailCol,
      head: 0.3 * num(p.width, 1, 0.3, 4),
      tail: num(p.tail, 0, 0, 5),
      // HDR budget: the head is ~30x (blooms into a bright point), the tail must stay around 1 so
      // it reads as a thin line with a falloff instead of a clipped white bar
      trailGain: 0.07 * num(p.tailGain, 1, 0, 8),
      glitter: num(p.glitter, spray > 1 ? 0.25 : 0.4, 0, 1),
      crackle: bool(p.crackle, false),
      wave: num(p.wave, serpent ? 2.2 : 0.9, 0, 6),
      intensity: num(p.intensity, 1, 0, 3),
      end,
      endSize: num(p.endSize, 0, 0, 60),
      serpent,
      zipper: bool(p.zipper, false),
      spray,
      // serpent comets leave a wriggling trail that hangs in the air for seconds (v460.2-462.5)
      smoke: bool(p.smoke, serpent),
      curl: num(p.curl, 0, -1080, 1080) * DEG,
      arc: num(p.arc, 0, 0, 1440) * DEG,
      pearlTime: num(p.pearlTime, 1, 0.05, 4),
      glow: num(p.glow, 0, 0, 3),
      popCol: null,
      popStar: false,
      endBurn: num(p.endBurn, 1, 0.2, 3),
      wriggle: num(p.wriggle, 0, 0, 6),
      wriggleHz: num(p.wriggleHz, 0, 0, 40),
      gerb: num(p.gerb, 0, 0, 3),
    };
  }

  /** resolve `popColor` of a comet / cake cue into its look (after the look's colour is known) */
  private lookPops(cue: Cue, look: CometLook): void {
    const v = cue.p.popColor ?? cue.p.crackleColor;
    look.popStar = v === true || v === 'star';
    look.popCol = look.popStar ? null : this.popColor(cue, look.col);
  }

  /** A fan of `n` comets from o. `side` = fan plane axis; comet i points at -half + 2 half i/(n-1). */
  private cometFan(
    out: EmitterSet,
    seed: number,
    o: THREE.Vector3,
    dir: THREE.Vector3,
    side: THREE.Vector3,
    halfAngle: number,
    n: number,
    t0: number,
    stagger: number,
    rise: number,
    look: CometLook,
    seg: THREE.Vector3 | null = null,
    /** tail flitter per comet x this (the comets of a dense wall overlap: fewer sparks each) */
    sparkK = 1,
  ): void {
    const { col, gain, end } = look;
    const spray = look.spray > 1;
    // curling spark streams are light and slow down gently, so they can draw a whole loop
    const curling = spray && look.curl !== 0;
    const k = curling ? 0.35 : spray ? 1.3 : COMET_DRAG;
    const grav = curling ? -3 : -G;
    // a display comet is fired fast and burns out while still climbing: `rise` is its burnout
    // height, reached after ~1 s (a 48 m comet leaves at ~60 m/s); spark streams are gravity-limited
    const burn = clamp(0.5 + rise * 0.013, 0.6, 1.8);
    const v0 = spray ? speedForHeight(rise, k) : speedForBurnout(rise, k, burn);
    const tA0 = spray ? apexTime(v0, k) : burn;
    const breakSpec = end === 'pearl' || end === 'pops' || end === 'none' ? undefined : SHELLS[end];
    const pearl = end === 'pearl';
    // curl: the shader turns the velocity about N = dir x side; + look.curl turns over the top
    // towards the outside of the set (clockwise seen from the audience on the right half)
    let curlRate = 0;
    if (look.curl !== 0) {
      const N = this.tmpA.copy(dir).cross(side);
      const sx = o.x < -0.5 ? -1 : 1;
      curlRate = N.lengthSq() > 1e-6 && Math.abs(N.normalize().z) > 0.2 ? -sx * look.curl * Math.sign(N.z) : look.curl;
    }
    // `arc`: the stars burn out when they have turned that far (open heart lobes, not closed rings)
    const tArc = curlRate && look.arc > 0 ? look.arc / Math.abs(curlRate) : Infinity;
    const tA = Math.min(tA0, tArc);
    // `wriggle` uses the serpent helix with its own amplitude (thin wavy comet columns, v324.7-330)
    const wriggle = look.wriggle > 0 && !curlRate;
    const flags =
      F.COOL |
      F.FLICKER |
      ((look.serpent || wriggle) && !curlRate ? F.SERPENT : 0) |
      (pearl ? F.PEARL : 0) |
      (look.zipper ? F.ZIPPER : 0) |
      (curlRate ? FW_CURL : 0);
    const popTrue = look.popStar ? col : look.popCol;
    // a display comet is a small, very bright head with a thin, dim tail that hangs over the whole
    // climb (it only reads as a line because it is long); a spark stream is short sparks
    // comets burn out a little before their apex; the glowing tail is the last ~40 % of the climb
    // and dies quickly after the head (overlapping volleys on the same paths must not add up to bars)
    const trail = look.tail > 0 ? look.tail : spray ? 0.42 : look.serpent ? 0.95 : clamp(tA * 0.65, 0.4, 1.1);
    const lifeK = spray ? [0.55, 1.0] : [0.95, 1.05];
    const common = (e: Emitter) => {
      e.on(L_STARS)
        .physics(k, grav)
        .color(col, (spray ? 16 : 24) * gain * look.intensity)
        .size(spray ? look.head * 0.55 : look.head, spray ? 0.6 : 0.3)
        .trail(trail, spray ? 0.7 : 0.45)
        // pearl: the head hangs on at its top as a bright point for ~`pearlTime` s
        .set(R.X0, look.pearlTime)
        .set(R.X2, spray ? 0.6 : 0.3)
        .set(R.X3, spray ? 0 : 0.8)
        .set(R.Y0, spray ? 0.3 : look.trailGain)
        .set(R.Y1, wriggle ? look.wriggle : look.serpent ? 0.35 : 0)
        .set(R.Y2, spray ? 2.5 : 1.2)
        .set(R.Y3, 0.6)
        .set(R.Z0, 0.03)
        .set(R.Z1, 2.2)
        .set(R.Z3, look.wave);
      if (wriggle && look.wriggleHz > 0) e.hz(look.wriggleHz);
      if (curlRate) {
        e.hz(curlRate);
        // (Y1 is the serpent amplitude, unused while curling: here the time the turn stops)
        e.set(R.Y1, Number.isFinite(tArc) ? tArc : 0);
      }
      if (look.tailCol) e.color2(look.tailCol, -1);
      return e;
    };
    const tailSparks = (parent: Emitter, count: number, tEnd: number) => {
      if (look.glitter <= 0 && !look.crackle) return;
      const cr = look.crackle;
      // (mobile: dense fans (4+ comets per emitter, e.g. the glitter curtain of v783-788 with ~1700
      // comets) shed half the flitter, so the star budget keeps the comets instead of thinning them)
      const q = Math.min(1, 0.45 + this.quality.particleScale * 0.7) * (this.quality.level === 'mobile' && count >= 4 ? 0.5 : 1) * sparkK;
      const per = cr ? 7 : spray ? Math.max(1, Math.round(8 * look.glitter * q)) : Math.max(3, Math.round(30 * look.glitter * q));
      const se = new Emitter(0, 0).copyFrom(parent);
      se.f[R.FLAGS] = (parent.f[R.FLAGS] & (F.SERPENT | F.ZIPPER | FW_CURL)) | FW_SHED;
      const sc = cr ? (popTrue ? this.c2.copy(popTrue) : this.c2.copy(col).lerp(WHITE, 0.75)) : this.c2.copy(col).lerp(WHITE, 0.35);
      se.on(L_STARS)
        .color(sc, (cr ? 36 : 4 + 22 * look.glitter) * gain * look.intensity)
        .color2(look.tailCol ?? col, -1)
        .emit(count * per, 0, parent.f[R.STAGGER])
        .size(cr ? 0.2 : 0.13, 1)
        .set(R.X1, per)
        .set(R.X2, cr ? 0.7 : 0.35)
        .set(R.X3, cr ? 2.2 : 0.9)
        .set(R.Z3, cr ? 0.075 : 0.45)
        .window(parent.start, tEnd + (cr ? 0.9 : 0.9));
      out.add(se);
    };
    /**
     * `gerb`: every comet climbs inside a sheaf of thin streaks in the tail colour (a dense gerb-like
     * tail): m streaks around its path with a little angle and speed spread, each drawing the whole climb,
     * so a column reads as a bundle of orange lines under the comet's own head / break (v1426.6-1439).
     */
    const sheaf = (d: THREE.Vector3, half: number, count: number, tc: number, stg: number, sd: number) => {
      if (look.gerb <= 0) return;
      const m = Math.max(3, Math.round(8 * look.gerb * Math.min(1, 0.5 + this.quality.particleScale * 0.6)));
      const tl = clamp(tA * 0.95, 0.3, 2.5);
      out.add(
        new Emitter(DIST.FAN, (flags & (F.SERPENT | FW_CURL)) | F.COOL)
          .on(L_STARS)
          .originV(o)
          .time(tc)
          .dirV(d, half)
          .axisV(side)
          .physics(k, grav)
          .speed(v0 * 0.7, v0 * 1.0)
          .life(tA * 0.88, tA * 1.02)
          .emit(count * m, 0, stg / m)
          .color(this.c2.copy(look.tailCol ?? col), 11 * gain * look.intensity)
          .size(look.head * 0.45, 0.8)
          .trail(tl, 0.15)
          .seed((sd ^ 0x5e4f) & 0xffffff)
          .hz(curlRate || (wriggle && look.wriggleHz > 0 ? look.wriggleHz : 0))
          .set(R.X2, 0.35)
          .set(R.Y0, 0.22 * Math.min(2, look.gerb))
          .set(R.Y1, curlRate ? (Number.isFinite(tArc) ? tArc : 0) : wriggle ? look.wriggle : look.serpent ? 0.35 : 0)
          .set(R.Y2, 1.2)
          .set(R.Y3, 0.6)
          .set(R.Z0, 0.03)
          .set(R.Z2, half > 0 ? 0.07 : 0.16)
          .set(R.Z3, look.wave)
          .window(tc, tc + stg * count + tA * 1.02 + tl + 0.4),
      );
    };
    // `seg`: the comets rise from random points along o -> o + seg inside a cone of halfAngle (one emitter
    // for a whole stretch of a dense comet wall, see `between` in comets())
    const line = seg !== null && !curlRate;
    if (!breakSpec) {
      const e = common(new Emitter(line ? DIST.LINE : n > 1 ? DIST.FAN : DIST.SINGLE, flags))
        .originV(o)
        .time(t0)
        .dirV(dir, line ? Math.max(0.04, halfAngle) : halfAngle)
        .axisV(line && seg ? seg : side)
        .speed(v0 * (spray ? 0.72 : 0.94), v0 * 1.02)
        .life(tA * lifeK[0], tA * lifeK[1])
        .emit(n, 0, stagger)
        .seed(seed)
        .set(R.Z2, spray ? 0.16 : n > 1 ? Math.min(0.08, (halfAngle * 2) / n) : 0.04)
        .window(t0, t0 + stagger * n + tA + trail + 0.6);
      if (n === 1 && !line) e.speed(v0 * (0.96 + 0.05 * hf(seed ^ 5)));
      out.add(e);
      tailSparks(e, n, t0 + stagger * n + tA);
      if (!line) sheaf(dir, halfAngle, n, t0, stagger, seed);
      if (end === 'pops') {
        // a crackling end without a shell: the head dies in a small cloud of micro-flashes
        const pops = 6;
        const pe = new Emitter(0, 0).copyFrom(e);
        pe.f[R.FLAGS] = (flags & ~(F.FLICKER | F.PEARL)) | F.POPS | (popTrue ? FW_TRUE : 0);
        // (copyFrom does not carry the layer: derived emitters must be put on the star layer)
        pe.on(L_STARS)
          .color(popTrue ? this.c2.copy(popTrue) : this.c2.copy(col).lerp(WHITE, 0.6), (popTrue ? 40 : 34) * gain)
          .emit(n * pops, 0, stagger)
          .size(0.26, 1)
          .set(R.X1, pops)
          .set(R.X2, 0.8 * look.endBurn)
          .set(R.X3, look.endSize > 0 ? look.endSize : 2.8)
          .window(t0 + tA * lifeK[0], t0 + stagger * n + tA + 0.3 + 0.8 * look.endBurn);
        out.add(pe);
      }
      if (look.smoke && !line) this.cometSmoke(out, seed, o, dir, side, halfAngle, n, t0, stagger, v0, k, tA, col, look);
      return;
    }
    // comets that break into shells: every comet is aimed on the CPU so its break point is known
    const acc = this.gravAcc(k, 0.6).clone();
    for (let i = 0; i < n; i++) {
      const fi = look.zipper ? (i % 2 === 0 ? i / 2 : n - 1 - (i - 1) / 2) : i;
      const th = n > 1 ? -halfAngle + (2 * halfAngle * fi) / (n - 1) : 0;
      const d = new THREE.Vector3().copy(dir).multiplyScalar(Math.cos(th)).addScaledVector(side, Math.sin(th)).normalize();
      const sd = seed ^ Math.imul(i + 1, 0x2545f491);
      const sp = v0 * (0.95 + 0.05 * hf(sd));
      const life = tA;
      const tc = t0 + stagger * i;
      const e = common(new Emitter(DIST.SINGLE, flags & ~(F.ZIPPER | F.PEARL)))
        .originV(o)
        .time(tc)
        .axisV(side)
        .dirV(d)
        .speed(sp)
        .life(life)
        .emit(1)
        .seed(sd & 0xffffff)
        .window(tc, tc + life + trail + 0.4);
      out.add(e);
      tailSparks(e, 1, tc + life);
      sheaf(d, 0, 1, tc, 0, sd);
      const B = curlRate ? curlPoint(new THREE.Vector3(), o, d, side, sp, k, acc, curlRate, life, tArc) : ballistic(new THREE.Vector3(), o, d.multiplyScalar(sp), k, acc, life);
      // a comet's break is a small burst at its top (the video's crackle / spider tops), not a shell;
      // its small stars burn out sooner than a shell's (burn x r / 16, at least x 0.35): the red
      // crackle tops of v333.9-336.2 are gone by v336.5, not popping on for another second
      const r = look.endSize > 0 ? look.endSize : clamp(rise * 0.16, 3.5, 10);
      this.addShell(out, sd & 0xffffff, breakSpec, o, B, col, gain, {
        tL: tc + life,
        tb: tc + life,
        radius: r,
        smoke: n > 6 ? 1 : 2,
        lift: false,
        flashK: 0.45,
        col2: null,
        starsK: clamp(Math.pow(r / 16, 1.2), 0.2, 1),
        burnK: clamp(r / 16, 0.35, 1) * look.endBurn,
        popCol: popTrue,
      });
    }
    if (look.smoke) this.cometSmoke(out, seed, o, dir, side, halfAngle, n, t0, stagger, v0, k, tA, col, look);
  }

  /**
   * `glow`: a soft glow that travels up with the comets of a fan: soft puffs in the comet colour,
   * flying the comets' own ballistic paths (same launch speed, drag and gravity) inside the fan's cone
   * and dying with the heads. A dense many-comet fan seen from a distance is one glowing mass in the
   * video (the pink V-fans of v557.9-559.3: the camera blooms and the smoke they burn in glows), not
   * a spray of separate thin lines; the puffs are world-sized, so this is for fans seen from afar.
   */
  private fanGlow(out: EmitterSet, seed: number, o: THREE.Vector3, dir: THREE.Vector3, half: number, n: number, t0: number, stagger: number, rise: number, look: CometLook): void {
    const k = COMET_DRAG;
    const burn = clamp(0.5 + rise * 0.013, 0.6, 1.8);
    const v0 = speedForBurnout(rise, k, burn);
    const R0 = clamp(0.1 * rise, 1.5, 6);
    const m = Math.max(2, n * 2);
    out.add(
      new Emitter(DIST.CONE, 0)
        .on(L_FLASH)
        .originV(o)
        .time(t0)
        .dirV(dir, Math.max(0.05, half))
        .speed(v0 * 0.9, v0)
        .physics(k, -G)
        .color(this.c2.copy(look.col).lerp(WHITE, 0.2), look.glow * Math.min(1.3, look.gain) * look.intensity)
        .life(burn * 0.95, burn * 1.05)
        .emit(m, 0, (stagger * n) / m)
        .size(R0 * 0.5, R0)
        .trail(0.8, 1)
        .seed(seed ^ 0x6f6f1)
        .set(R.Z3, PUFF.GLOW)
        .window(t0, t0 + stagger * n + burn * 1.05 + 0.05),
    );
  }

  /**
   * A lingering smoke trail along each comet's climb (puffs born as the head passes). Serpent comets
   * leave a wriggling trail (the path zig-zags sideways by ~1.3 m) that glows in the comet colour
   * while it is fresh and hangs for a few seconds (v460.2-462.5: the white serpent rows stand as
   * wriggling white lines from the ground to their pearls): LINE emitters between the zig-zag
   * points, so the trail is continuous.
   */
  private cometSmoke(
    out: EmitterSet,
    seed: number,
    o: THREE.Vector3,
    dir: THREE.Vector3,
    side: THREE.Vector3,
    halfAngle: number,
    n: number,
    t0: number,
    stagger: number,
    v0: number,
    k: number,
    life: number,
    col: THREE.Color,
    look: CometLook,
  ): void {
    const lv = this.quality.level;
    const serp = look.serpent;
    const K = lv === 'mobile' ? 3 : lv === 'medium' ? 6 : 9;
    const acc = this.gravAcc(k, 0.6).clone();
    const d = new THREE.Vector3();
    const P = new THREE.Vector3();
    const Q = new THREE.Vector3();
    const lat = new THREE.Vector3();
    const nc = Math.min(n, 12);
    const glow = this.c1.copy(col).multiplyScalar((serp ? 2.6 : 0.6) * Math.min(1.3, look.gain) * look.intensity).clone();
    for (let i = 0; i < nc; i++) {
      const ci = nc === n ? i : Math.round((i * (n - 1)) / Math.max(1, nc - 1));
      const th = n > 1 ? -halfAngle + (2 * halfAngle * ci) / (n - 1) : 0;
      d.copy(dir).multiplyScalar(Math.cos(th)).addScaledVector(side, Math.sin(th)).normalize();
      // sideways axis of the wriggle (horizontal, across the flight)
      lat.set(-d.z, 0, d.x);
      if (lat.lengthSq() < 1e-4) lat.copy(side);
      lat.normalize();
      d.multiplyScalar(v0);
      const ph = hf(seed ^ Math.imul(i + 3, 0x2f6b)) * 6.2832;
      const wig = (j: number) => (serp && j > 0 ? 1.3 * Math.sin(ph + j * 2.4) : 0);
      for (let j = 1; j <= K; j++) {
        const tt = (life * j) / K;
        const tp = (life * (j - 1)) / K;
        ballistic(P, o, d, k, acc, tt);
        const tb = t0 + stagger * ci + tt;
        const sd = (seed ^ Math.imul(i * 16 + j + 1, 0x68e31da4)) & 0xffffff;
        if (serp) {
          // a continuous wriggling line from the previous zig-zag point to this one
          ballistic(Q, o, d, k, acc, tp).addScaledVector(lat, wig(j - 1));
          P.addScaledVector(lat, wig(j));
          const tq = t0 + stagger * ci + tp;
          const np = lv === 'mobile' ? 2 : lv === 'medium' ? 6 : 8;
          out.add(
            new Emitter(DIST.LINE, F.SELFLIT)
              .on(L_SMOKE)
              .originV(Q)
              .axis(P.x - Q.x, P.y - Q.y, P.z - Q.z)
              .time(tq)
              .dir(0, 1, 0, 1.2)
              .speed(0.1, 0.5)
              .physics(1.2, 0.25)
              .color(GREY, 0.3)
              .color2(glow, 0)
              .life(3.5, 4.5)
              .emit(np, 0, (tb - tq) / np)
              .size(0.55 + tt * 0.3, 1.6)
              .trail(0.5, 0.45)
              .seed(sd)
              .set(R.X0, 2.2)
              .set(R.X1, 0.12)
              .set(R.X2, 0.7)
              .set(R.Y0, 0.75)
              .set(R.Y2, 0.02)
              .set(R.Y3, 1.3)
              .set(R.Z0, 1)
              .set(R.Z3, PUFF.SMOKE)
              .window(tq, tb + 4.7),
          );
          continue;
        }
        out.add(
          new Emitter(DIST.SPHERE, F.SELFLIT)
            .on(L_SMOKE)
            .originV(P)
            .time(tb)
            .speed(0.2, 0.8)
            .physics(1.2, 0.25)
            .color(GREY, 0.2)
            .color2(glow, 0)
            .life(7, 10)
            .emit(lv === 'mobile' ? 1 : 2)
            .size(0.5 + tt * 0.3, 2.4)
            .trail(0.5, 0.35)
            .seed(sd)
            .set(R.X0, 0.6)
            .set(R.X1, 0.12)
            .set(R.X2, 0.85)
            .set(R.Y0, 0.75)
            .set(R.Y2, 0.04)
            .set(R.Y3, 1.3)
            .set(R.Z0, 1)
            .set(R.Z3, PUFF.SMOKE)
            .window(tb, tb + 10.2),
        );
      }
    }
  }

  private comets(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    let end = str(p.end, 'none');
    if (end === 'crackle_comet') end = 'pops';
    // `between` on comets without shell breaks: the extra comets rise from LINE emitters along each gap
    // of the row (one emitter per gap instead of one per inserted point: a dense wall stays within the
    // star / smoke emitter budgets); comets with shell breaks, curls or X-fans get inserted points
    const nb = this.betweenCount(cue);
    const rowMode = nb > 0 && (end === 'none' || end === 'pearl' || end === 'pops' || !SHELLS[end]) && num(p.curl, 0) === 0 && num(p.cross, 0) === 0;
    const src = this.launchPoints(cue, 'roof', !rowMode);
    const angle = num(p.angle, 0, -180, 180);
    const count = p.count !== undefined ? Math.round(num(p.count, 1, 1, 400)) : 0;
    let per = Math.round(num(p.per, 0, 0, 60));
    let pts = src;
    if (per) {
      // `count` with `per`: count picks the launch points, per sets the comets of each
      if (count > 0 && count < src.length) pts = pickEven(src, count);
    } else {
      const c = count || (angle !== 0 && src.length <= 2 ? 7 : src.length);
      if (c <= src.length) {
        pts = pickEven(src, c);
        per = 1;
      } else per = Math.ceil(c / Math.max(1, src.length));
    }
    const rise = num(p.height, 40, 3, 250);
    const stagger = num(p.stagger, per > 1 ? 0.04 : 0, 0, 3);
    const cols = colorList(p.color, ['gold']);
    const look = this.cometLook(cue, end, 1);
    const spreadRad = angle * DEG;
    const mx = maxAbsX(pts);
    const lean = num(p.lean, 0.08, -1, 1);
    const tilt = num(p.tilt, 0, -90, 90) * DEG;
    const cross = num(p.cross, 0, 0, 60);
    const crossTilt = num(p.crossAngle, 22, 0, 80) * DEG;
    let fired = 0;
    const lp: THREE.Vector3[] = [];
    const lc = new THREE.Color(0, 0, 0);
    const fire = (o: THREE.Vector3, dir: THREE.Vector3, half: number, seed: number) => {
      const side = new THREE.Vector3(dir.y, -dir.x, 0);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      side.normalize();
      this.cometFan(out, seed, o, dir, side, half, per, cue.t, stagger, rise, look);
      if (look.glow > 0 && look.curl === 0) this.fanGlow(out, seed, o, dir, half, per, cue.t, stagger, rise, look);
      // the launch cloud glows in the comets' colour while they climb out of it
      // (a many-comet fan stands in a denser cloud of its own: v558 pink V-fans)
      this.launchSmoke(out, seed, o, cue.t, Math.min(per, 5), rise, 0.3 + stagger * per, look.col, 1.5 * Math.sqrt(Math.min(per, 6)) * Math.min(1.3, look.gain) * look.intensity, 0.35 + stagger * per);
      lp.push(o);
      lc.add(look.col);
      fired++;
    };
    pts.forEach((o, i) => {
      const seed = this.sub(cue, i);
      look.gain = starColor(cols[i % cols.length], this.palette, look.col, 'gold');
      look.col = look.col.clone();
      this.lookPops(cue, look);
      const sx = Math.abs(o.x) < 0.5 ? 0 : Math.sign(o.x);
      if (cross > 0) {
        // X-fan: two launch points `cross` m apart, each fan tilted towards the other
        for (let s = -1; s <= 1; s += 2) {
          const q = o.clone();
          q.x += (s * cross) / 2;
          const a = -s * crossTilt + sx * tilt;
          fire(q, new THREE.Vector3(Math.sin(a), Math.cos(a), lean).normalize(), per > 1 ? Math.abs(spreadRad) / 2 : 0, seed ^ (s > 0 ? 0x5a5a5a : 0));
        }
        return;
      }
      if (per === 1 && angle !== 0) {
        const a = (spreadRad / 2) * clamp(o.x / mx, -1, 1) + sx * tilt;
        fire(o, new THREE.Vector3(Math.sin(a), Math.cos(a), lean).normalize(), 0, seed);
      } else {
        const a = sx * tilt;
        fire(o, new THREE.Vector3(Math.sin(a), Math.cos(a), lean).normalize(), Math.abs(spreadRad) / 2, seed);
      }
    });
    if (rowMode && pts.length > 1) {
      // nb x per comets along every gap between neighbouring points of a stretch (a gap > 24 m splits)
      let gi = 0;
      for (const s of stretches(pts, undefined, Infinity, 24)) {
        for (let j = 0; j + 1 < s.length; j++, gi++) {
          const a = pts[s[j]];
          const b = pts[s[j + 1]];
          const seed = this.sub(cue, 9000 + gi);
          look.gain = starColor(cols[s[j] % cols.length], this.palette, look.col, 'gold');
          look.col = look.col.clone();
          this.lookPops(cue, look);
          const segV = b.clone().sub(a);
          const o0 = a.clone().addScaledVector(segV, 0.5 / (nb + 1));
          const mid = a.clone().lerp(b, 0.5);
          const sx = Math.abs(mid.x) < 0.5 ? 0 : Math.sign(mid.x);
          const ta = sx * tilt;
          const dir = new THREE.Vector3(Math.sin(ta), Math.cos(ta), lean).normalize();
          const side = new THREE.Vector3(dir.y, -dir.x, 0).normalize();
          const n = Math.max(1, per) * nb;
          this.cometFan(out, seed, o0, dir, side, per > 1 ? Math.abs(spreadRad) / 2 : 0.04, n, cue.t, stagger / nb, rise, look, segV.multiplyScalar(nb / (nb + 1)), 1 / Math.sqrt(nb + 1));
          this.launchSmoke(out, seed, mid, cue.t, Math.min(n, 4), rise, 0.3 + stagger * per, look.col, 1.5 * Math.sqrt(Math.min(per, 6)) * Math.min(1.3, look.gain) * look.intensity, 0.35 + stagger * per);
          // (the row's flash grows with its comets; its light colour stays the launch points' average)
          fired += nb;
        }
      }
    }
    if (fired) {
      // the LightEnv flash per stretch of the row (not one flash at the centroid of a U row, which
      // sat in the middle of the field), rise / 2 up
      const fPeak = Math.min(1.2, 0.025 * fired * per + 0.1);
      this.rowFlashes(out, lp, rise * 0.5, { kind: 1, t0: cue.t, t1: cue.t + stagger * per + 2.2, color: look.col, peak: fPeak, decay: 1, strobe: 0 });
      // spatial light along the launch row while the comets climb (their launch smoke, the floor);
      // the flash-derived light it replaces had flashLightGain (0.3) x the flash peak
      lc.multiplyScalar(1 / Math.max(1, lp.length));
      // (fans of more than 2 comets per point light their smoke more: the flash peak saturates early)
      this.rowLights(out, lp, cue.t, cue.t + stagger * per + 2.2, 1, Math.min(12, rise * 0.2), lc, 0.36 * fPeak * Math.sqrt(Math.max(2, Math.min(per, 12)) / 2), 12 + 0.1 * rise);
    }
  }

  private cake(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const pts = this.launchPoints(cue, 'roof');
    const shots = Math.round(num(p.shots, 20, 1, 300));
    const dur = cue.dur >= 0.5 ? cue.dur : shots * 0.14;
    const angle = num(p.angle, 60, 0, 170);
    const rise = num(p.height, 35, 3, 200);
    const cols = colorList(p.color, ['gold']);
    const type = str(p.type, 'comet');
    let end = SHELLS[type] ? type : type === 'crackle_comet' ? 'pops' : str(p.end, 'none');
    if (end === 'crackle_comet') end = 'pops';
    const fill = Math.round(num(p.fill, 0, 0, 40));
    const spray = Math.round(num(p.spray, 1, 1, 12));
    const look = this.cometLook(cue, end, spray);
    const hasSweep = p.from !== undefined || p.to !== undefined;
    const from = num(p.from, -angle / 2, -270, 270) * DEG;
    const to = num(p.to, angle / 2, -270, 270) * DEG;
    const lean = num(p.lean, 0.1, -1, 1);
    const tilt = num(p.tilt, 0, -90, 90) * DEG;
    // `jitter` 0..1: every launch point starts at its own random phase of the shot interval, so a row
    // of cakes (the comet wall of v429-444) does not fire in lock-step as one picket fence
    const jitter = num(p.jitter, 0, 0, 1);
    const lc = new THREE.Color(0, 0, 0);
    pts.forEach((o, i) => {
      const seed = this.sub(cue, i);
      look.gain = starColor(cols[i % cols.length], this.palette, look.col, 'gold');
      look.col = look.col.clone();
      this.lookPops(cue, look);
      const ph = jitter > 0 ? jitter * hf(seed ^ 0x3c1a) : 0;
      const sx = Math.abs(o.x) < 0.5 ? 1 : Math.sign(o.x);
      let dir: THREE.Vector3;
      let sideV: THREE.Vector3;
      let half: number;
      if (hasSweep) {
        // one-way sweep from `from` to `to` (deg from vertical, + = away from the centre line)
        const m = (from + to) / 2;
        half = Math.abs(to - from) / 2;
        dir = new THREE.Vector3(Math.sin(m) * sx, Math.cos(m), lean).normalize();
        sideV = new THREE.Vector3(Math.cos(m) * sx, -Math.sin(m), 0).multiplyScalar(to >= from ? 1 : -1);
      } else {
        const a = (Math.abs(o.x) < 0.5 ? 0 : sx) * tilt;
        dir = new THREE.Vector3(Math.sin(a), Math.cos(a), lean).normalize();
        // neighbouring cakes sweep in opposite directions (classic "fan" look)
        sideV = new THREE.Vector3(Math.cos(a), -Math.sin(a), 0).multiplyScalar(i % 2 === 0 ? 1 : -1);
        half = (angle / 2) * DEG;
      }
      if (fill > 0) {
        // a steady fan: every shot fires `fill` comets across the whole angle at once, each shot
        // offset by a fraction of a step so the fan fills in
        const step = fill > 1 ? (2 * half) / (fill - 1) : 0;
        for (let s = 0; s < shots; s++) {
          const off = (hf(seed ^ (s * 0x9e37 + 5)) - 0.5) * step * 0.8;
          const d = dir.clone().multiplyScalar(Math.cos(off)).addScaledVector(sideV, Math.sin(off));
          const sv = sideV.clone().multiplyScalar(Math.cos(off)).addScaledVector(dir, -Math.sin(off));
          this.cometFan(out, (seed ^ Math.imul(s + 1, 0x27d4eb2d)) & 0xffffff, o, d, sv, half, fill, cue.t + ((s + ph) * dur) / shots, 0, rise, look);
        }
      } else {
        // spark streams thin out with the quality preset (single comets never do)
        const n = spray > 1 ? Math.max(shots, Math.round(shots * spray * Math.min(1, 0.4 + this.quality.particleScale))) : shots;
        this.cometFan(out, seed, o, dir, sideV, half, n, cue.t + (ph * dur) / n, dur / n, rise, look);
      }
      // a firing cake stands in its own smoke, lit by the shots climbing out of it
      this.launchSmoke(out, seed, o, cue.t, Math.max(1, Math.min(4, Math.round(dur * 1.5))), rise, dur, look.col, 2.2 * Math.min(1.3, look.gain) * look.intensity, 0.9);
      lc.add(look.col);
    });
    if (pts.length) {
      const fPeak = Math.min(1.5, 0.08 * pts.length * Math.max(1, fill * 0.3) + 0.15);
      this.rowFlashes(out, pts, rise * 0.5, { kind: 1, t0: cue.t, t1: cue.t + dur + 1.5, color: look.col, peak: fPeak, decay: 1, strobe: 0 });
      lc.multiplyScalar(1 / pts.length);
      this.rowLights(out, pts, cue.t, cue.t + dur + 1.5, 1, Math.min(12, rise * 0.2), lc, 0.36 * fPeak, 12 + 0.1 * rise);
    }
  }

  private mines(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const pts = this.launchPoints(cue, 'roof');
    const H = num(p.height, 25, 3, 150);
    const cols = colorList(p.color, ['gold']);
    const type = str(p.type, 'comet');
    const k = 1.4;
    const v0 = speedForHeight(H, k);
    const tA = apexTime(v0, k);
    // dur >= 0.5 s: the mine keeps firing over dur (a fountain / volcano); shorter = one burst
    const fdur = cue.dur >= 0.5 ? cue.dur : 0;
    const n = this.pc(num(p.count, 36, 4, 400), 10);
    pts.forEach((o, i) => {
      const seed = this.sub(cue, i);
      const gain = starColor(cols[i % cols.length], this.palette, this.c1, 'gold');
      const col = this.c1.clone();
      // white / silver stars stay white (titanium); only charcoal gold sparks cool to orange
      const whiteish = Math.min(col.r, col.g, col.b) / Math.max(col.r, col.g, col.b, 1e-4) > 0.75;
      let flags = whiteish ? F.FLICKER : F.COOL | F.FLICKER;
      if (type === 'strobe') flags = F.STROBE;
      const stars = new Emitter(DIST.CONE, flags)
        .on(L_STARS)
        .originV(o)
        .time(cue.t)
        .dir(0, 1, 0.05, num(p.spread, 18, 0, 80) * DEG)
        .speed(v0 * 0.62, v0 * 1.02)
        .physics(k, -G)
        .color(col, (type === 'strobe' ? 28 : 18) * gain * num(p.intensity, 1, 0, 3))
        .life(tA * 0.8, tA * 1.25)
        .emit(n, 0, fdur / n)
        .size(0.26, 0.4)
        .trail(type === 'strobe' ? 0 : num(p.tail, 0.38, 0, 3), type === 'glitter' ? 1 : 0.5)
        .seed(seed)
        .hz(12 + 4 * hf(seed))
        .set(R.Y0, type === 'glitter' ? 0.6 : 1)
        .set(R.Y2, 1)
        .set(R.Y3, 0.6)
        .set(R.Z0, 0.02)
        .window(cue.t, cue.t + fdur + tA * 1.25 + 0.6);
      out.add(stars);
      if (type === 'crackle') {
        const pops = 5;
        const pe = new Emitter(0, 0).copyFrom(stars);
        const pc = this.popColor(cue, col);
        pe.f[R.FLAGS] = F.POPS | (pc ? FW_TRUE : 0);
        pe.on(L_STARS)
          .color(pc ? this.c2.copy(pc) : this.c2.copy(col).lerp(WHITE, 0.6), (pc ? 38 : 32) * gain)
          .emit(stars.count * pops)
          .size(0.28, 1)
          .set(R.X1, pops)
          .set(R.X2, 0.8)
          .set(R.X3, 2)
          .window(cue.t + tA * 0.8, cue.t + fdur + tA * 1.25 + 1);
        out.add(pe);
      } else if (type === 'glitter') {
        // glitter mine: the stars drop twinkling flitter all the way up
        const m = Math.max(2, Math.round(4 * Math.min(1, 0.45 + this.quality.particleScale * 0.7)));
        const se = new Emitter(0, 0).copyFrom(stars);
        se.f[R.FLAGS] = FW_SHED;
        se.on(L_STARS)
          .color(this.c2.copy(col).lerp(WHITE, 0.4), 22 * gain)
          .emit(stars.count * m)
          .size(0.13, 1)
          .set(R.X1, m)
          .set(R.X2, 0.3)
          .set(R.X3, 0.8)
          .set(R.Z3, 0.45)
          .window(cue.t, cue.t + fdur + tA * 1.25 + 1.1);
        out.add(se);
      }
      out.add(
        new Emitter(DIST.SINGLE, 0)
          .on(L_FLASH)
          .origin(o.x, o.y + 1, o.z)
          .time(cue.t)
          .dir(0, 1, 0)
          .speed(1)
          .physics(1, 0)
          .color(this.c2.copy(col).lerp(WHITE, 0.5), 16)
          .life(0.35)
          .emit(1)
          .size(3.5, 2)
          .trail(0.5, 1)
          .seed(seed ^ 4)
          .set(R.X0, 0.08)
          .set(R.Z3, PUFF.FLASH)
          .window(cue.t, cue.t + 0.4),
      );
      this.launchSmoke(out, seed, o, cue.t, fdur ? 5 : 3, H, Math.max(0.3, fdur), col, 2.2 * Math.min(1.3, gain), fdur ? 0.9 : tA * 0.8);
      out.flashes.push({
        kind: fdur ? 1 : 0,
        t0: cue.t,
        t1: cue.t + fdur + tA * 1.2,
        color: col,
        peak: 0.55,
        decay: tA * 0.6,
        pos: o.clone().setY(o.y + H * 0.4),
        strobe: type === 'strobe' ? 12 : 0,
      });
    });
  }

  /**
   * The smoke cloud a launch leaves at its launch point. With `col` + `glow` it is self-lit in the
   * stars' colour while they climb out of it (`burn` s time constant from each puff's birth): comet
   * rows and fans stand in a cloud glowing in their colour (the pink V-fans of v558, the white serpent
   * rows of v460), a cloud that is there within the first tenths of a second.
   */
  private launchSmoke(out: EmitterSet, seed: number, o: THREE.Vector3, t0: number, n: number, rise: number, dur = 0.3, col: THREE.Color | null = null, glow = 0, burn = 1): void {
    const lit = col !== null && glow > 0;
    const e = new Emitter(DIST.CONE, lit ? F.SELFLIT : 0)
      .on(L_SMOKE)
      .origin(o.x, o.y + 2, o.z)
      .time(t0 + (lit ? 0.03 : 0.1))
      .dir(0, 1, 0, 0.5)
      .speed(1, lit ? 4 : 3)
      .physics(0.8, 0.35)
      .color(GREY, 0.16)
      .life(7, 11)
      .emit(Math.max(1, Math.round(n * Math.min(1, this.quality.particleScale * 1.5))), 0, Math.max(0.05, dur / Math.max(1, n)))
      .size(1.5 + rise * 0.03, 4 + rise * 0.1)
      .trail(0.55, 0.3)
      .seed(seed ^ 0x41)
      .set(R.X1, 0.15)
      .set(R.X2, 0.8)
      .set(R.Y0, 0.75)
      .set(R.Y2, lit ? 0.02 : 0.1)
      .set(R.Y3, 1)
      .set(R.Z0, 1)
      .set(R.Z3, PUFF.SMOKE)
      .window(t0 + 0.03, t0 + dur + 11.5);
    // (lit while the stars climb out of it: dark once the last shot has left)
    if (lit) e.color2(this.c2.copy(col).multiplyScalar(glow), 0).set(R.X0, burn).litUntil(t0 + dur + 0.4);
    out.add(e);
  }

  /**
   * Spatial light of a row of launch points (FxLights) while their stars climb: the points, in order
   * along the U, are cut into stretches of at most ~40 m (a gap of more than 24 m starts a new one);
   * each stretch is one line light `h` m above its points with its share (by point count) of the
   * `total` intensity. A comet row on the whole U lights the smoke and the floor along the U in its
   * colour, not the middle of the field (which one flash-derived light at the centroid of the row
   * did) — with the same total light as that derived light, so the site is not lit any brighter.
   */
  private rowLights(out: EmitterSet, pts: THREE.Vector3[], t0: number, t1: number, decay: number, h: number, color: THREE.Color, total: number, radius: number): void {
    if (!(total > 0) || !pts.length) return;
    const N = pts.length;
    for (const s of stretches(pts)) {
      const a = pts[s[0]];
      const b = pts[s[s.length - 1]];
      const A = new THREE.Vector3(a.x, a.y + h, a.z);
      const B = new THREE.Vector3(b.x, b.y + h, b.z);
      out.lights.push({
        kind: 1,
        t0,
        t1,
        decay: Math.max(0.1, decay),
        strobe: 0,
        color: color.clone(),
        peak: (total * s.length) / N,
        pos: A.clone().add(B).multiplyScalar(0.5),
        a: A,
        b: B,
        radius: radius + 0.15 * A.distanceTo(B),
      });
    }
  }

  /** the LightEnv flash of a row of launch points, shared out over its stretches (see rowLights) */
  private rowFlashes(out: EmitterSet, pts: THREE.Vector3[], h: number, f: Omit<FlashSpec, 'pos'>): void {
    if (!(f.peak > 0) || !pts.length) return;
    const N = pts.length;
    for (const s of stretches(pts)) {
      const c = new THREE.Vector3();
      for (const i of s) c.add(pts[i]);
      c.multiplyScalar(1 / s.length);
      c.y += h;
      out.flashes.push({ ...f, color: f.color.clone(), peak: (f.peak * s.length) / N, pos: c });
    }
  }

  // ------------------------------------------------------------------ drone flares

  /**
   * Airborne flares (a drone carrying a cluster of red flares): `count` flares `spacing` m apart fly
   * from `from` to `to` over the cue's dur, each a blinding point with a glow halo in its own smoke,
   * leaving a trail of self-lit smoke, and lighting the grounds in their colour as they pass.
   */
  private flares(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const dur = Math.max(0.5, cue.dur);
    // the flight path: `path` (list of [x,y,z]) or `from` -> `to`, flown at constant speed
    const way: THREE.Vector3[] = [];
    if (Array.isArray(p.path)) for (const q of p.path) if (numList(q).length >= 3) way.push(vec3Param(q, new THREE.Vector3()));
    if (way.length < 2) {
      way.length = 0;
      way.push(vec3Param(p.from, new THREE.Vector3(-60, 30, 30)), vec3Param(p.to, new THREE.Vector3(-30, 32, 10)));
    }
    const segLen = way.slice(1).map((w, i) => Math.max(0.01, w.distanceTo(way[i])));
    const total = segLen.reduce((a, b) => a + b, 0);
    const vel = total / dur;
    const n = Math.round(num(p.count, 4, 1, 12));
    const spacing = num(p.spacing, 2.2, 0, 20);
    const size = num(p.size, 1, 0.3, 4);
    const I = num(p.intensity, 1, 0, 3);
    // `halo` (m per size unit): radius of the glow each flare has in its own smoke; `haloGain` its brightness
    const halo = num(p.halo, FLARE_HALO, 0, 20);
    const haloGain = num(p.haloGain, 1, 0, 4);
    // `smokeGlow`: self-light of the flare smoke (x the default), `smokeSize`: size of its clouds
    const smokeGlow = num(p.smokeGlow, 1, 0, 3);
    const smokeSize = num(p.smokeSize, 1, 0.2, 3);
    const gain = starColor(str(p.color, 'red'), this.palette, this.c1, 'red');
    const col = this.c1.clone();
    const hot = this.c2.copy(col).lerp(WHITE, 0.55).clone();
    const at = (f: number, outV: THREE.Vector3) => {
      let d = f * total;
      for (let s = 0; s < segLen.length; s++) {
        if (d <= segLen[s] || s === segLen.length - 1) return outV.copy(way[s]).lerp(way[s + 1], Math.min(1, d / segLen[s]));
        d -= segLen[s];
      }
      return outV.copy(way[way.length - 1]);
    };
    for (let i = 0; i < n; i++) {
      const seed = this.sub(cue, i);
      let ts = cue.t;
      for (let s = 0; s < segLen.length; s++) {
        const sd = segLen[s] / vel;
        const te = ts + sd;
        const last = s === segLen.length - 1;
        const pd = way[s + 1].clone().sub(way[s]).normalize();
        const lat = new THREE.Vector3(-pd.z, 0, pd.x);
        if (lat.lengthSq() < 1e-4) lat.set(1, 0, 0);
        lat.normalize();
        // the cluster: a short row across the flight line with a little height jitter
        const o = way[s].clone().addScaledVector(lat, (i - (n - 1) / 2) * spacing).add(this.tmpA.set(0, (hf(seed ^ 3) - 0.5) * spacing * 0.6, 0));
        out.add(
          new Emitter(DIST.SINGLE, F.FLICKER)
            .on(L_STARS)
            .originV(o)
            .time(ts)
            .dirV(pd)
            .speed(vel)
            .physics(0.02, 0)
            .color(hot, 90 * gain * I)
            // only the last leg burns out; the others hand over to the next leg at the corner
            .life(last ? sd : sd * 1.4)
            .emit(1)
            .size(0.6 * size, 0.7)
            .trail(Math.min(0.22, sd), 0)
            .seed(seed)
            .set(R.Y0, 0.25)
            .set(R.Y3, 0)
            .set(R.Z0, s === 0 ? 0.15 : 0.001)
            .window(ts, last ? te + 0.3 : te),
        );
        // the glow of the flare in its own smoke
        if (halo > 0 && haloGain > 0)
          out.add(
          new Emitter(DIST.SINGLE, 0)
            .on(L_FLASH)
            .originV(o)
            .time(ts)
            .dirV(pd)
            .speed(vel)
            .physics(0.02, 0)
            .color(this.c2.copy(col).lerp(WHITE, 0.15), 3.2 * I * haloGain)
            .life(last ? sd : sd * 1.4)
            .emit(1)
            .size(halo * size, 1)
            .trail(1, 1)
            .seed(seed ^ 0x77)
            .set(R.X0, dur)
            .set(R.Z3, PUFF.GLOW)
            .window(ts, te),
        );
        ts = te;
      }
    }
    // smoke left along the flight path: a thick cloud of flare smoke, self-lit in the flare colour
    // while the flares burn in it (v313.25-315: red clouds tens of metres wide around each cluster)
    const K = this.quality.level === 'mobile' ? 4 : 8;
    const smoke = bool(p.smoke, true);
    const P = new THREE.Vector3();
    const A = new THREE.Vector3();
    const Bq = new THREE.Vector3();
    const reach = 30 + 8 * size + spacing * n * 0.5;
    const mob = this.quality.level === 'mobile';
    for (let j = 0; j < K; j++) {
      const f = (j + 0.5) / K;
      const tb = cue.t + f * dur;
      at(f, P);
      at(j / K, A);
      at((j + 1) / K, Bq);
      if (smoke) {
        // a trail, not a row of balls: the puffs are spread along the leg of this chunk and across
        // the cluster's width, born as the flares pass
        const ns = mob ? 3 : 6;
        out.add(
          new Emitter(DIST.LINE, F.SELFLIT)
            .on(L_SMOKE)
            .originV(A)
            .axis(Bq.x - A.x, Bq.y - A.y, Bq.z - A.z)
            .time(cue.t + (j / K) * dur)
            .dir(0, 1, 0, 1.4)
            .speed(0.8, 2.6)
            .physics(1, 0.25)
            .color(GREY, 0.24)
            .color2(this.c2.copy(col).multiplyScalar(6.5 * I * smokeGlow), 0)
            .litUntil(cue.t + dur + 0.2)
            // (it lingers less than a shell's smoke: low flare smoke drifts off the grounds)
            .life(5, 8)
            // mobile: fewer, larger puffs
            .emit(ns, 0, dur / K / ns)
            .size((2.6 * size + spacing * n * 0.35) * (mob ? 1.25 : 1) * smokeSize, 13 * size * smokeSize)
            .trail(0.45, 0.35)
            .seed((cue.seed ^ Math.imul(j + 1, 0x51ed27)) & 0xffffff)
            .set(R.X0, 3)
            .set(R.X1, 0.1)
            .set(R.X2, 0.85)
            .set(R.Y0, 0.8)
            .set(R.Y2, 0.02)
            .set(R.Y3, 1.2)
            .set(R.Z0, 1)
            .set(R.Z3, PUFF.SMOKE)
            .window(cue.t + (j / K) * dur, tb + 8.2),
        );
      }
      // flares are the brightest thing in the sky: they light the field and the trees in their colour
      out.flashes.push({ kind: 1, t0: cue.t + (j / K) * dur, t1: cue.t + ((j + 1) / K) * dur + 0.15, color: col.clone(), peak: Math.min(2.2, 0.55 * n * I), decay: 0.12, pos: P.clone(), strobe: 0 });
      // ... and their smoke, the haze and the floor below them (spatial light following the cluster;
      // overlapping chunks so the light never dips)
      out.lights.push({
        kind: 1,
        t0: cue.t + (j / K) * dur,
        t1: cue.t + ((j + 1) / K) * dur + (j === K - 1 ? 0.3 : 0.12),
        decay: j === K - 1 ? 0.3 : 0.1,
        strobe: 0,
        color: col.clone(),
        peak: 1.1 * Math.sqrt(n) * I * size,
        pos: A.clone().add(Bq).multiplyScalar(0.5),
        a: A.clone(),
        b: Bq.clone(),
        radius: reach,
      });
    }
  }

  // ------------------------------------------------------------------ finale

  private finale(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const dur = Math.max(1, cue.dur);
    const density = num(p.density, 15, 0.5, 40);
    const palette = colorList(p.palette, ['red', 'orange', 'gold', 'white']);
    const types = colorList(p.types, []).filter((t) => SHELLS[t]);
    const H0 = num(p.height, 62, 20, 300);
    const pool: THREE.Vector3[] = [];
    const tg = cue.targets.length === 1 && cue.targets[0] === 'all' ? null : cue.targets;
    const moved = p.x !== undefined || p.z !== undefined;
    const depth = num(p.depth, 0, 0, 400);
    if (tg && !moved) pool.push(...this.points(cue, 'fireworks_back'));
    else {
      // a wide band: mortar line behind the stage stretched to `spread`, plus the roof positions;
      // `x`/`z` move the band (e.g. over the field), `depth` spreads it in z
      const back = this.app.anchors.get('fireworks_back');
      const bc = centroid(back, new THREE.Vector3(0, 0, -50));
      bc.x = num(p.x, bc.x, -400, 400);
      bc.z = num(p.z, bc.z, -400, 400);
      if (moved) bc.y = 0;
      const spread = num(p.spread, 210, 20, 600);
      const rows = depth > 0 ? 4 : 1;
      for (let r = 0; r < rows; r++) {
        const zr = rows > 1 ? (r / (rows - 1) - 0.5) * depth : 0;
        for (let i = 0; i < 15; i++) pool.push(new THREE.Vector3(bc.x + spread * (i / 14 - 0.5) + (r % 2) * (spread / 28), bc.y, bc.z + zr));
      }
      if (!moved) pool.push(...this.app.anchors.get('roof').map((v) => v.clone()));
    }
    if (!pool.length) pool.push(new THREE.Vector3(0, 0, -60));
    const n = Math.min(Math.round(density * dur * Math.min(1, 0.55 + this.quality.particleScale * 0.6)), 480);
    const weights: [string, number][] = types.length
      ? types.map((t) => [t, 1] as [string, number])
      : [
          ['crackle', 0.28],
          ['brocade', 0.2],
          ['peony', 0.14],
          ['chrysanthemum', 0.14],
          ['strobe', 0.1],
          ['willow', 0.06],
          ['kamuro', 0.05],
          ['dahlia', 0.03],
        ];
    const wsum = weights.reduce((a, w) => a + w[1], 0);
    const smoke = density > 10 ? 1 : 2;
    const liftCol = this.liftColor(cue);
    for (let i = 0; i < n; i++) {
      const seed = this.sub(cue, i);
      let r = hf(seed ^ 0x77) * wsum;
      let type = weights[0][0];
      for (const [t, w] of weights) {
        r -= w;
        if (r <= 0) {
          type = t;
          break;
        }
      }
      const spec = SHELLS[type] ?? SHELLS.peony;
      const o = pool[Math.floor(hf(seed ^ 0x13) * pool.length) % pool.length];
      const H = Math.max(H0 * (0.72 + 0.5 * hf(seed ^ 0x19)), o.y + 14);
      const rise = riseTime(H - o.y);
      const tl = cue.t + (dur * (i + hf(seed ^ 0x23) * 0.9)) / n;
      const B = new THREE.Vector3(o.x + (hf(seed ^ 1) - 0.5) * 16, H, o.z + (hf(seed ^ 2) - 0.5) * 0.15 * H);
      const cname = palette[Math.floor(hf(seed ^ 0x29) * palette.length) % palette.length];
      const gain = starColor(cname, this.palette, this.c1, 'gold');
      const radius = clamp(0.3 * H, 9, 50) * spec.radiusK * (0.85 + 0.3 * hf(seed ^ 3));
      const col = this.c1.clone();
      this.addShell(out, seed, spec, o, B, col, gain, { tL: tl, tb: tl + rise, radius, smoke, lift: true, flashK: 0.55, col2: null, liftCol, popCol: this.popColor(cue, col) });
    }
    // roof comet fans woven through the barrage
    const roof = this.app.anchors.get('roof');
    const cps = num(p.comets, 1.6, 0, 10);
    const nf = Math.round(cps * dur);
    const look = this.cometLook(cue, 'none', 1);
    look.glitter = 0.3;
    for (let i = 0; i < nf && roof.length; i++) {
      const seed = this.sub(cue, 5000 + i);
      const o = roof[Math.floor(hf(seed) * roof.length) % roof.length];
      const cname = palette[Math.floor(hf(seed ^ 3) * palette.length) % palette.length];
      look.gain = starColor(cname, this.palette, look.col, 'gold');
      look.col = look.col.clone();
      const t0 = cue.t + (dur * (i + hf(seed ^ 5) * 0.8)) / nf;
      const side = new THREE.Vector3(1, 0, 0);
      this.cometFan(out, seed, o, new THREE.Vector3(0, 1, 0.1).normalize(), side, 0.55, 7, t0, 0.03, 38 + 20 * hf(seed ^ 9), look);
    }
  }

  static readonly types = SHELL_TYPES;
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

/** a number or a list of numbers ("-58,58" / [-58, 58]) */
function numList(v: unknown): number[] {
  if (typeof v === 'number' && Number.isFinite(v)) return [v];
  if (Array.isArray(v)) return v.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  if (typeof v === 'string' && v.length) return v.split(',').map((s) => parseFloat(s)).filter((x) => Number.isFinite(x));
  return [];
}

/** a list of [x, y, z] points ([[x,y,z], ...]; a single [x,y,z] is one point) */
function vec3List(v: unknown): THREE.Vector3[] {
  if (!Array.isArray(v) || !v.length) return [];
  if (typeof v[0] === 'number') {
    const l = numList(v);
    return l.length >= 3 ? [new THREE.Vector3(l[0], l[1], l[2])] : [];
  }
  const out: THREE.Vector3[] = [];
  for (const q of v) {
    const l = numList(q);
    if (l.length >= 3) out.push(new THREE.Vector3(l[0], l[1], l[2]));
  }
  return out;
}

function vec3Param(v: unknown, def: THREE.Vector3): THREE.Vector3 {
  const l = numList(v);
  return l.length >= 3 ? new THREE.Vector3(l[0], l[1], l[2]) : def;
}

/**
 * Default burst radius for a break at `H` m. Display shells open to roughly 0.6–0.8 x their break
 * height in diameter (a 3" shell breaking at ~100 m is 60–80 m across), i.e. radius ~ 0.33 x H;
 * crackle / brocade / kamuro recipes scale that up to ~0.4 x H via their radiusK.
 */
function defaultRadius(H: number): number {
  return clamp(0.33 * H, 10, 70);
}

/** where a curling comet (see FW_CURL in starShader.ts) is after `t` seconds (turn stops after `ta` s) */
function curlPoint(out: THREE.Vector3, o: THREE.Vector3, d: THREE.Vector3, side: THREE.Vector3, v: number, k: number, acc: THREE.Vector3, w: number, t: number, ta = Infinity): THREE.Vector3 {
  const N = new THREE.Vector3().copy(d).cross(side);
  if (N.lengthSq() < 1e-6) N.set(0, 0, 1);
  N.normalize();
  const e2 = new THREE.Vector3().copy(N).cross(d).normalize();
  const tc = Math.min(t, ta);
  const E = Math.exp(-k * tc);
  const c = Math.cos(w * tc);
  const s = Math.sin(w * tc);
  const q = v / (k * k + w * w);
  let re = (k * (1 - E * c) + w * E * s) * q;
  let im = (w * (1 - E * c) - k * E * s) * q;
  if (t > tc) {
    // straight on after the turn stopped
    const L = (v * E * (1 - Math.exp(-k * (t - tc)))) / k;
    re += c * L;
    im += s * L;
  }
  ballistic(out, o, new THREE.Vector3(), k, acc, t);
  return out.addScaledVector(d, re).addScaledVector(e2, im);
}

/** launch speed of a vertical drag particle that is at height `h` after `t` seconds */
function speedForBurnout(h: number, k: number, t: number, g = 9.81): number {
  const e = 1 - Math.exp(-k * t);
  return ((h + (g * t) / k) * k) / e - g / k;
}

/** lift time for a break `rise` metres above the mortar */
export function riseTime(rise: number): number {
  return 0.8 + 0.021 * Math.max(0, rise);
}
