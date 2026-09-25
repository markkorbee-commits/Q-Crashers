import * as THREE from 'three';
import type { AnchorName } from '../core/Anchors';
import type { QualitySettings } from '../core/types';
import type { Cue } from '../show/ShowTypes';
import { CueFxSystem, EmitterSet } from '../fx/core/CueFxSystem';
import { DIST, Emitter, F, PUFF, R, aimVelocity, apexTime, ballistic, hf, speedForHeight } from '../fx/core/Emitter';
import { bool, colorList, num, starColor, str } from '../fx/core/fxColors';
import { centroid, maxAbsX, pickEven } from '../fx/core/placement';
import { SHELLS, SHELL_TYPES, shellSpec, type ShellSpec } from './shells';

const L_SMOKE = 0;
const L_FLASH = 1;
const L_STARS = 2;

const GREY = new THREE.Color(0.6, 0.6, 0.62);
const WHITE = new THREE.Color(1, 1, 1);
const LIFT = new THREE.Color(1.0, 0.55, 0.2);
const G = 9.81;
const LIFT_DRAG = 0.3;
const COMET_DRAG = 0.42;

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
}

/**
 * Aerial fireworks: shells of 11 types, salvos, comets and comet fans, cakes, mines and the finale
 * barrage. Physically based: lift charges are aimed analytically at the break point (drag + gravity
 * + wind), stars leave the break at speeds that make them travel the burst radius during their burn,
 * trails are the stars' own recent paths, crackle is a cloud of micro-flashes after the stars die,
 * and every break flashes the LightEnv so the grounds, crowd, set and smoke light up in its colour.
 *
 * Param semantics (superset of docs/show-format.md):
 *  - shell/salvo/finale `height` = break altitude above ground (m); `size` = burst radius (m);
 *    `rise` (s) overrides the lift time (0 = break exactly at the cue time).
 *  - comet/cake/mine `height` = rise above the launch point (m).
 *  - comet `count` = total comets: fewer than the target points -> evenly picked points, more ->
 *    a fan of ceil(count/points) per point; `per` forces comets per point. One comet per point with
 *    `angle` > 0 makes a V (outer points lean outward). `end`: none|pearl|crackle|<shell type>;
 *    `serpent`: true for curly tails; `stagger` s between comets of a fan.
 *  - cake `type` (optional shell type) breaks every shot; `zipper`: true alternates the fan ends.
 *  - finale `types` (list) overrides the barrage mix, `comets` (per s) adds roof comet fans.
 */
export class FireworkSystem extends CueFxSystem {
  readonly name = 'fireworks';
  protected readonly sys = 'fireworks' as const;
  private readonly c1 = new THREE.Color();
  private readonly c2 = new THREE.Color();
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();
  private readonly acc = new THREE.Vector3();

  protected buildLayers(q: QualitySettings): void {
    const ps = q.particleScale;
    const smoke = this.shared.puffLayer('fw-smoke', Math.round(5000 * Math.max(0.3, ps)), 1024, 11);
    const flash = this.shared.puffLayer('fw-flash', 2048, 1024, 13);
    const stars = this.shared.sparkLayer('fw-stars', q, Math.round(90000 * Math.max(0.15, ps)), 2048, 15);
    this.layers = [smoke, flash, stars];
    for (const l of this.layers) this.app.scene.add(l.mesh);
  }

  protected lifetime(cue: Omit<Cue, 'life' | 'end'>): number {
    const p = cue.p;
    const H = num(p.height, 90, 10, 400);
    const rise = p.rise !== undefined ? num(p.rise, 0, 0, 10) : riseTime(H);
    switch (cue.fx) {
      case 'shell':
      case 'salvo':
        return cue.dur + rise + 6 + 24 + num(p.stagger, 0, 0, 2) * num(p.count, 8, 1, 60);
      case 'comet':
        return cue.dur + num(p.stagger, 0, 0, 2) * num(p.count, 10, 1, 200) + 5 + (p.end ? 24 : 9);
      case 'cake':
        return cue.dur + 5 + (p.type ? 24 : 9);
      case 'mine':
        return cue.dur + 12;
      case 'finale':
        return cue.dur + rise + 26;
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
      default:
        break;
    }
  }

  private points(cue: Cue, fallback: AnchorName): THREE.Vector3[] {
    return this.app.anchors.resolve(cue.targets, fallback).map((p) => p.clone());
  }

  private gravAcc(k: number, windK = 1): THREE.Vector3 {
    return this.acc.copy(this.shared.wind).multiplyScalar(k * windK).add(this.tmpB.set(0, -G, 0));
  }

  // ------------------------------------------------------------------ shells

  /** one complete shell: lift + star burst (+ crackle pops) + break flash + smoke + light flash */
  private addShell(out: EmitterSet, seed: number, spec: ShellSpec, o: THREE.Vector3, B: THREE.Vector3, col: THREE.Color, gain: number, opts: ShellOpts): void {
    const { tL, tb, radius } = opts;
    const rise = tb - tL;
    if (opts.lift && rise > 0.05) {
      const v0 = aimVelocity(this.tmpA, o, B, LIFT_DRAG, this.gravAcc(LIFT_DRAG), rise);
      const lg = spec.liftGain;
      const palm = lg > 2;
      out.add(
        new Emitter(DIST.SINGLE, F.COOL | F.FLICKER)
          .on(L_STARS)
          .originV(o)
          .time(tL)
          .dir(v0.x, v0.y, v0.z)
          .speed(v0.length())
          .physics(LIFT_DRAG, -G)
          .color(palm ? col : LIFT, (palm ? 7 : 2.2) * Math.min(lg, 2))
          .life(rise)
          .emit(1)
          .size(palm ? 0.3 : 0.11, 0.6)
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
          .color(this.c2.copy(LIFT).lerp(WHITE, 0.5), 7)
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
    const burnMean = (spec.burn[0] + spec.burn[1]) * 0.5;
    const v = (radius * k) / (1 - Math.exp(-k * burnMean));
    const crossette = (spec.flags & F.CROSSETTE) !== 0;
    const nStars = this.pc(spec.stars, spec.minStars);
    let flags = spec.flags;
    if (opts.col2) {
      if (spec === SHELLS.chrysanthemum || spec === SHELLS.brocade || spec === SHELLS.peony) flags |= F.PISTIL;
      else flags |= F.COLORCHANGE;
    }
    const tEnd = tb + spec.burn[1] + spec.trail + 0.35;
    const stars = new Emitter(spec.dist, flags)
      .on(L_STARS)
      .originV(B)
      .time(tb)
      .speed(v * 0.93, v * 1.06)
      .physics(k, spec.grav)
      .color(col, spec.intensity * gain * 2.2)
      .life(spec.burn[0], spec.burn[1])
      .emit(crossette ? nStars * 4 : nStars)
      .size(spec.head, spec.tailW)
      .trail(spec.trail, spec.glitter)
      .seed(seed)
      .hz(spec.hz ? spec.hz * (0.85 + 0.3 * hf(seed ^ 7)) : 0)
      .set(R.Y0, spec.trailGain)
      .set(R.Y2, spec.droop)
      .set(R.Y3, 1)
      .set(R.Z0, 0.03)
      .set(R.Z2, spec.jitter)
      .window(tb, tEnd);
    if (opts.col2) stars.color2(opts.col2, 0.55);
    if (crossette) stars.set(R.X0, spec.split ?? 0.75).set(R.X1, v * 0.42);
    if (spec.dist === DIST.RING) {
      const a = (hf(seed ^ 3) - 0.5) * 1.3;
      const b = (hf(seed ^ 5) - 0.5) * 0.8;
      stars.axis(Math.sin(a), Math.sin(b) * 0.6, Math.cos(a));
    }
    out.add(stars);
    if (spec.pops) {
      const pops = spec.pops;
      const popE = new Emitter(spec.dist, 0).copyFrom(stars);
      popE.f[R.FLAGS] = (spec.flags & ~F.FLICKER) | F.POPS;
      popE
        .on(L_STARS)
        .color(this.c2.copy(col).lerp(WHITE, 0.65), 34 * gain)
        .emit(nStars * pops)
        .size(0.3, 1)
        .set(R.X1, pops)
        .set(R.X2, 0.7)
        .set(R.X3, radius * 0.24)
        .window(tb + spec.burn[0], tb + spec.burn[1] + 1.0);
      out.add(popE);
    }
    // the break flash (a burst of light in the smoke)
    out.add(
      new Emitter(DIST.SINGLE, 0)
        .on(L_FLASH)
        .originV(B)
        .time(tb)
        .dir(0, 1, 0)
        .speed(0.1)
        .physics(1, 0)
        .color(this.c2.copy(col).lerp(WHITE, 0.45), 9 * gain * spec.flash)
        .life(0.32)
        .emit(1)
        .size(radius * 0.45, radius * 0.3)
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
          .color2(this.c2.copy(col).multiplyScalar(1.3 * gain), 0)
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
      t1: tb + spec.burn[1],
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
    const radius = num(p.size, clamp(0.2 * H, 9, 45) * spec.radiusK, 2, 150);
    return { spec, radius };
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
    const { spec, radius } = this.shellParams(cue, H0);
    const cols = colorList(p.color, [spec.color]);
    pts.forEach((o, i) => {
      const seed = this.sub(cue, i);
      const H = Math.max(H0 * (1 + (hf(seed ^ 9) - 0.5) * 0.06), o.y + 12);
      const rise = p.rise !== undefined ? num(p.rise, 0, 0, 10) : riseTime(H - o.y);
      const tb = cue.t + rise + num(p.stagger, 0, 0, 3) * i;
      const B = new THREE.Vector3(o.x + (hf(seed ^ 1) - 0.5) * 0.06 * H, H, o.z + (hf(seed ^ 2) - 0.5) * 0.04 * H);
      const gain = starColor(cols[i % cols.length], this.palette, this.c1, spec.color);
      const col = this.c1.clone();
      const col2 = p.color2 ? (starColor(p.color2, this.palette, this.c2, 'white'), this.c2.clone()) : null;
      this.addShell(out, seed, spec, o, B, col, gain, { tL: tb - rise, tb, radius, smoke: this.smokeCount(5), lift: rise > 0, flashK: 1, col2 });
    });
  }

  private salvo(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const src = this.points(cue, 'fireworks_back');
    const c = centroid(src, new THREE.Vector3());
    const count = Math.round(num(p.count, Math.max(3, Math.min(src.length, 12)), 1, 80));
    const spread = num(p.spread, 120, 0, 600);
    const H0 = num(p.height, 90, 15, 400);
    const { spec, radius } = this.shellParams(cue, H0);
    const cols = colorList(p.color, [spec.color]);
    const pattern = str(p.pattern, 'line');
    const stagger = num(p.stagger, 0, 0, 3);
    const col2 = p.color2 ? (starColor(p.color2, this.palette, this.c2, 'white'), this.c2.clone()) : null;
    for (let i = 0; i < count; i++) {
      const seed = this.sub(cue, i);
      const u = count > 1 ? i / (count - 1) - 0.5 : 0;
      const o = new THREE.Vector3(c.x + spread * u + (count > 1 ? (hf(seed ^ 8) - 0.5) * 0.45 * (spread / (count - 1)) : 0), c.y, c.z + (hf(seed ^ 10) - 0.5) * 6);
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
      this.addShell(out, seed, spec, o, B, this.c1.clone(), gain, {
        tL: tb - rise,
        tb,
        radius: radius * (0.85 + 0.3 * hf(seed ^ 3)),
        smoke: this.smokeCount(count > 10 ? 3 : 4),
        lift: rise > 0,
        flashK: count > 8 ? 0.7 : 1,
        col2,
      });
    }
  }

  // ------------------------------------------------------------------ comets

  /** A fan of `n` comets from o. Returns nothing; adds emitters. `side` = fan plane axis. */
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
    col: THREE.Color,
    gain: number,
    end: string,
    serpent: boolean,
    zipper: boolean,
  ): void {
    const k = COMET_DRAG;
    const v0 = speedForHeight(rise, k);
    const tA = apexTime(v0, k);
    const breakSpec = SHELLS[end];
    const flags = F.COOL | F.FLICKER | (serpent ? F.SERPENT : 0) | (end === 'pearl' ? F.PEARL : 0) | (zipper ? F.ZIPPER : 0);
    const common = (e: Emitter) =>
      e
        .on(L_STARS)
        .physics(k, -G)
        .color(col, 20 * gain)
        .size(0.42, 0.32)
        .trail(serpent ? 0.9 : 1.1, 0.8)
        .set(R.X0, 0.07)
        .set(R.Y0, 1.25)
        .set(R.Y1, 1.4)
        .set(R.Y2, 1.2)
        .set(R.Y3, 0.6)
        .set(R.Z0, 0.03)
        .set(R.Z1, 70);
    if (!breakSpec) {
      const e = common(new Emitter(n > 1 ? DIST.FAN : DIST.SINGLE, flags))
        .originV(o)
        .time(t0)
        .dirV(dir, halfAngle)
        .axisV(side)
        .speed(v0 * 0.94, v0 * 1.02)
        .life(tA * 0.84, tA * 0.97)
        .emit(n, 0, stagger)
        .seed(seed)
        .set(R.Z2, n > 1 ? Math.min(0.08, (halfAngle * 2) / n) : 0.04)
        .window(t0, t0 + stagger * n + tA + 1.2);
      if (n === 1) e.speed(v0 * (0.96 + 0.05 * hf(seed ^ 5)));
      out.add(e);
      if (end === 'crackle') {
        const pops = 6;
        const pe = new Emitter(0, 0).copyFrom(e);
        pe.f[R.FLAGS] = (flags & ~(F.FLICKER | F.PEARL)) | F.POPS;
        pe.color(this.c2.copy(col).lerp(WHITE, 0.6), 34 * gain)
          .emit(n * pops, 0, stagger)
          .size(0.3, 1)
          .set(R.X1, pops)
          .set(R.X2, 0.8)
          .set(R.X3, 2.5)
          .window(t0 + tA * 0.8, t0 + stagger * n + tA + 1.1);
        out.add(pe);
      }
      return;
    }
    // comets that break into shells: every comet is aimed on the CPU so its break point is known
    const acc = this.gravAcc(k, 0.6).clone();
    for (let i = 0; i < n; i++) {
      const fi = zipper ? (i % 2 === 0 ? i / 2 : n - 1 - (i - 1) / 2) : i;
      const th = n > 1 ? -halfAngle + (2 * halfAngle * fi) / (n - 1) : 0;
      const d = new THREE.Vector3().copy(dir).multiplyScalar(Math.cos(th)).addScaledVector(side, Math.sin(th)).normalize();
      const sd = seed ^ Math.imul(i + 1, 0x2545f491);
      const sp = v0 * (0.95 + 0.05 * hf(sd));
      const life = tA * 0.92;
      const tc = t0 + stagger * i;
      out.add(
        common(new Emitter(DIST.SINGLE, flags & ~F.ZIPPER))
          .originV(o)
          .time(tc)
          .dirV(d)
          .speed(sp)
          .life(life)
          .emit(1)
          .seed(sd & 0xffffff)
          .window(tc, tc + life + 1),
      );
      const B = ballistic(new THREE.Vector3(), o, d.multiplyScalar(sp), k, acc, life);
      const r = clamp(rise * 0.28, 6, 16);
      this.addShell(out, sd & 0xffffff, breakSpec, o, B, col, gain, { tL: tc + life, tb: tc + life, radius: r, smoke: n > 6 ? 1 : 2, lift: false, flashK: 0.45, col2: null });
    }
  }

  private comets(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const src = this.points(cue, 'roof');
    const angle = num(p.angle, 0, 0, 180);
    let per = Math.round(num(p.per, 0, 0, 60));
    let pts = src;
    if (!per) {
      const count = Math.round(num(p.count, angle > 0 && src.length <= 2 ? 7 : src.length, 1, 400));
      if (count <= src.length) {
        pts = pickEven(src, count);
        per = 1;
      } else per = Math.ceil(count / src.length);
    }
    const rise = num(p.height, 40, 3, 250);
    const stagger = num(p.stagger, per > 1 ? 0.04 : 0, 0, 3);
    const cols = colorList(p.color, ['gold']);
    const end = str(p.end, 'none');
    const serpent = bool(p.serpent, false);
    const spreadRad = (angle * Math.PI) / 180;
    const mx = maxAbsX(pts);
    const side = new THREE.Vector3(1, 0, 0);
    const lean = num(p.lean, 0.08, -1, 1);
    const cx = new THREE.Vector3();
    pts.forEach((o, i) => {
      const seed = this.sub(cue, i);
      const gain = starColor(cols[i % cols.length], this.palette, this.c1, 'gold');
      const col = this.c1.clone();
      let dir: THREE.Vector3;
      let half = 0;
      if (per === 1 && angle > 0) {
        const tilt = (spreadRad / 2) * clamp(o.x / mx, -1, 1);
        dir = new THREE.Vector3(Math.sin(tilt), Math.cos(tilt), lean).normalize();
      } else {
        dir = new THREE.Vector3(0, 1, lean).normalize();
        half = spreadRad / 2;
      }
      this.cometFan(out, seed, o, dir, side, half, per, cue.t, stagger, rise, col, gain, end, serpent, false);
      this.launchSmoke(out, seed, o, cue.t, Math.min(per, 3), rise);
      cx.add(o);
    });
    if (pts.length) {
      cx.multiplyScalar(1 / pts.length);
      cx.y += rise * 0.5;
      out.flashes.push({ kind: 1, t0: cue.t, t1: cue.t + stagger * per + 2.2, color: this.c1.clone(), peak: Math.min(1.2, 0.025 * pts.length * per + 0.1), decay: 1, pos: cx, strobe: 0 });
    }
  }

  private cake(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const pts = this.points(cue, 'roof');
    const shots = Math.round(num(p.shots, 20, 1, 300));
    const dur = cue.dur >= 0.5 ? cue.dur : shots * 0.14;
    const stagger = dur / shots;
    const angle = num(p.angle, 60, 0, 170);
    const rise = num(p.height, 35, 3, 200);
    const cols = colorList(p.color, ['gold']);
    const type = str(p.type, 'comet');
    const end = SHELLS[type] ? type : type === 'crackle_comet' ? 'crackle' : str(p.end, 'none');
    const zipper = bool(p.zipper, false);
    const side = new THREE.Vector3(1, 0, 0);
    const cx = new THREE.Vector3();
    pts.forEach((o, i) => {
      const seed = this.sub(cue, i);
      const gain = starColor(cols[i % cols.length], this.palette, this.c1, 'gold');
      const col = this.c1.clone();
      // neighbouring cakes sweep in opposite directions (classic "fan" look)
      const s = i % 2 === 0 ? side : side.clone().negate();
      const dir = new THREE.Vector3(0, 1, 0.1).normalize();
      this.cometFan(out, seed, o, dir, s, ((angle / 2) * Math.PI) / 180, shots, cue.t, stagger, rise, col, gain, end, false, zipper);
      this.launchSmoke(out, seed, o, cue.t, Math.max(1, Math.min(4, Math.round(dur * 1.5))), rise, dur);
      cx.add(o);
    });
    if (pts.length) {
      cx.multiplyScalar(1 / pts.length);
      cx.y += rise * 0.5;
      out.flashes.push({ kind: 1, t0: cue.t, t1: cue.t + dur + 1.5, color: this.c1.clone(), peak: Math.min(1.5, 0.08 * pts.length + 0.15), decay: 1, pos: cx, strobe: 0 });
    }
  }

  private mines(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const pts = this.points(cue, 'roof');
    const H = num(p.height, 25, 3, 150);
    const cols = colorList(p.color, ['gold']);
    const type = str(p.type, 'comet');
    const k = 1.4;
    const v0 = speedForHeight(H, k);
    const tA = apexTime(v0, k);
    pts.forEach((o, i) => {
      const seed = this.sub(cue, i);
      const gain = starColor(cols[i % cols.length], this.palette, this.c1, 'gold');
      const col = this.c1.clone();
      let flags = F.COOL | F.FLICKER;
      if (type === 'strobe') flags = F.STROBE;
      const stars = new Emitter(DIST.CONE, flags)
        .on(L_STARS)
        .originV(o)
        .time(cue.t)
        .dir(0, 1, 0.05, num(p.spread, 18, 0, 80) * (Math.PI / 180))
        .speed(v0 * 0.62, v0 * 1.02)
        .physics(k, -G)
        .color(col, (type === 'strobe' ? 28 : 18) * gain)
        .life(tA * 0.8, tA * 1.25)
        .emit(this.pc(num(p.count, 36, 4, 400), 10))
        .size(0.3, 0.4)
        .trail(type === 'strobe' ? 0 : 0.38, type === 'glitter' ? 1 : 0.5)
        .seed(seed)
        .hz(12 + 4 * hf(seed))
        .set(R.Y0, 1)
        .set(R.Y2, 1)
        .set(R.Y3, 0.6)
        .set(R.Z0, 0.02)
        .window(cue.t, cue.t + tA * 1.25 + 0.6);
      out.add(stars);
      if (type === 'crackle') {
        const pops = 5;
        const pe = new Emitter(0, 0).copyFrom(stars);
        pe.f[R.FLAGS] = F.POPS;
        pe.color(this.c2.copy(col).lerp(WHITE, 0.6), 32 * gain)
          .emit(stars.count * pops)
          .size(0.28, 1)
          .set(R.X1, pops)
          .set(R.X2, 0.8)
          .set(R.X3, 2)
          .window(cue.t + tA * 0.8, cue.t + tA * 1.25 + 1);
        out.add(pe);
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
      this.launchSmoke(out, seed, o, cue.t, 3, H);
      out.flashes.push({ kind: 0, t0: cue.t, t1: cue.t + tA * 1.2, color: col, peak: 0.55, decay: tA * 0.6, pos: o.clone().setY(o.y + H * 0.4), strobe: type === 'strobe' ? 12 : 0 });
    });
  }

  private launchSmoke(out: EmitterSet, seed: number, o: THREE.Vector3, t0: number, n: number, rise: number, dur = 0.3): void {
    out.add(
      new Emitter(DIST.CONE, 0)
        .on(L_SMOKE)
        .origin(o.x, o.y + 2, o.z)
        .time(t0 + 0.1)
        .dir(0, 1, 0, 0.5)
        .speed(1, 3)
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
        .set(R.Y2, 0.1)
        .set(R.Y3, 1)
        .set(R.Z0, 1)
        .set(R.Z3, PUFF.SMOKE)
        .window(t0 + 0.1, t0 + dur + 11.5),
    );
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
    if (tg) pool.push(...this.points(cue, 'fireworks_back'));
    else {
      // a wide band: mortar line behind the stage stretched to `spread`, plus the roof positions
      const back = this.app.anchors.get('fireworks_back');
      const bc = centroid(back, new THREE.Vector3(0, 0, -50));
      const spread = num(p.spread, 210, 20, 600);
      for (let i = 0; i < 15; i++) pool.push(new THREE.Vector3(bc.x + spread * (i / 14 - 0.5), bc.y, bc.z));
      pool.push(...this.app.anchors.get('roof').map((v) => v.clone()));
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
      const radius = clamp(0.2 * H, 9, 40) * spec.radiusK * (0.85 + 0.3 * hf(seed ^ 3));
      this.addShell(out, seed, spec, o, B, this.c1.clone(), gain, { tL: tl, tb: tl + rise, radius, smoke, lift: true, flashK: 0.55, col2: null });
    }
    // roof comet fans woven through the barrage
    const roof = this.app.anchors.get('roof');
    const cps = num(p.comets, 1.6, 0, 10);
    const nf = Math.round(cps * dur);
    for (let i = 0; i < nf && roof.length; i++) {
      const seed = this.sub(cue, 5000 + i);
      const o = roof[Math.floor(hf(seed) * roof.length) % roof.length];
      const cname = palette[Math.floor(hf(seed ^ 3) * palette.length) % palette.length];
      const gain = starColor(cname, this.palette, this.c1, 'gold');
      const t0 = cue.t + (dur * (i + hf(seed ^ 5) * 0.8)) / nf;
      const side = new THREE.Vector3(1, 0, 0);
      this.cometFan(out, seed, o, new THREE.Vector3(0, 1, 0.1).normalize(), side, 0.55, 7, t0, 0.03, 38 + 20 * hf(seed ^ 9), this.c1.clone(), gain, 'none', false, false);
    }
  }

  static readonly types = SHELL_TYPES;
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

/** lift time for a break `rise` metres above the mortar */
export function riseTime(rise: number): number {
  return 0.8 + 0.021 * Math.max(0, rise);
}
