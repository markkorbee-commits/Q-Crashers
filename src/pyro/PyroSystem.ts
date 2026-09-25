import * as THREE from 'three';
import type { AnchorName } from '../core/Anchors';
import type { QualitySettings } from '../core/types';
import type { Cue } from '../show/ShowTypes';
import { CueFxSystem, EmitterSet } from '../fx/core/CueFxSystem';
import { DIST, Emitter, F, PUFF, R, apexTime, speedForHeight } from '../fx/core/Emitter';
import { bool, fxColor, num, str } from '../fx/core/fxColors';
import { densify, patternSteps, tiltedUp, wingFire } from '../fx/core/placement';

const L_SMOKE = 0;
const L_FIRE = 1;
const L_SPARK = 2;

const SOOT = new THREE.Color(0.055, 0.045, 0.04);
const WHITE = new THREE.Color(1, 1, 1);
const GREY = new THREE.Color(0.62, 0.62, 0.64);
const FIRE = new THREE.Color(1.0, 0.36, 0.08);

/**
 * Stage pyrotechnics: flame projectors, flame walls, dragon breath, CO2 jets, gerbs, cold-spark
 * fountains, spark waterfalls, stage explosions and Bengal flares — all analytic GPU particles
 * (see src/fx/core). Every fx of docs/show-format.md "pyro" is supported; unknown params are ignored.
 *
 * Extra params understood (superset of the contract, all optional):
 *   flame/firewall: `angle` (deg, tilt away from the stage centre), `intensity`, `width` (x column
 *     width), `fireball: true` (8–10 m fireball with a smoke cap, `size`); firewall on the wings
 *     burns along the finger spars
 *   gerb/sparkular: `angle`, `spread` (deg)
 *   burst: dur >= 2 s turns it into a Bengal flare; `color`
 *   bengal (extra fx): coloured flare with thick self-lit smoke: `color`, `size`
 *   all: `rows` (list, 1 = row nearest the stage) narrows multi-row targets such as pillars_top
 * Chase patterns follow the unrolled front "U" (see placement.uCoord), so combined targets like
 * ["deck_front","side_front","arm_posts"] chase as one ring.
 */
export class PyroSystem extends CueFxSystem {
  readonly name = 'pyro';
  protected readonly sys = 'pyro' as const;
  private readonly c1 = new THREE.Color();
  private readonly c2 = new THREE.Color();
  private readonly v1 = new THREE.Vector3();
  /** 1 = warm hydrocarbon flame ramp, 0 = coloured flame (set by flameColor) */
  private warm = 1;

  protected buildLayers(q: QualitySettings): void {
    const ps = q.particleScale;
    const smoke = this.shared.puffLayer('pyro-smoke', Math.round(6000 * Math.max(0.35, ps)), 768, 12);
    const fire = this.shared.puffLayer('pyro-fire', Math.round(16000 * Math.max(0.35, ps)), 1024, 13);
    const spark = this.shared.sparkLayer('pyro-sparks', q, Math.round(70000 * Math.max(0.2, ps)), 1024, 14, 2);
    this.layers = [smoke, fire, spark];
    for (const l of this.layers) this.app.scene.add(l.mesh);
  }

  protected lifetime(cue: Omit<Cue, 'life' | 'end'>): number {
    const p = cue.p;
    const stag = num(p.stagger, 0.06) * 30;
    switch (cue.fx) {
      case 'flame':
        return cue.dur + Math.min(stag, 3) + 7;
      case 'firewall':
      case 'dragon_breath':
        return cue.dur + 8;
      case 'jet':
        return cue.dur + 2.5;
      case 'gerb':
        return cue.dur + 10;
      case 'sparkular':
        return cue.dur + 2.5;
      case 'waterfall':
        return cue.dur + 5;
      case 'burst':
      case 'bengal':
        return cue.dur + 12;
      default:
        return cue.dur;
    }
  }

  protected expand(cue: Cue, out: EmitterSet): void {
    switch (cue.fx) {
      case 'flame':
        this.flames(cue, out, false);
        break;
      case 'firewall':
        this.flames(cue, out, true);
        break;
      case 'dragon_breath':
        this.breath(cue, out);
        break;
      case 'jet':
        this.jets(cue, out);
        break;
      case 'gerb':
        this.fountains(cue, out, false);
        break;
      case 'sparkular':
        this.fountains(cue, out, true);
        break;
      case 'waterfall':
        this.waterfall(cue, out);
        break;
      case 'burst':
        if (cue.dur >= 2) this.bengal(cue, out);
        else this.burst(cue, out);
        break;
      case 'bengal':
        this.bengal(cue, out);
        break;
      default:
        break; // unknown fx: ignore gracefully
    }
  }

  /** flame colour: warm specs are pulled toward a real hydrocarbon flame spectrum */
  private flameColor(spec: unknown): THREE.Color {
    const c = fxColor(spec, this.palette, this.c1, 'fire');
    const m = Math.max(c.r, c.g, c.b, 1e-4);
    c.multiplyScalar(1 / m);
    this.warm = c.r > 0.98 && c.b < 0.35 ? 1 : 0;
    if (this.warm) c.lerp(FIRE, 0.7);
    return c;
  }

  /**
   * Smoke left by a row of units: a single BOX emitter over the firing units' bounding box
   * (per-unit smoke emitters would waste instancing slots on kick-synced repeats).
   */
  private rowSmoke(
    out: EmitterSet,
    cue: Cue,
    pts: THREE.Vector3[],
    steps: number[],
    yOff: number,
    H: number,
    color: THREE.Color,
    selfLight: number,
    opacity: number,
    puffs: number,
    t0: number,
    spreadT: number,
    life0: number,
    life1: number,
    albedo: number,
  ): void {
    const mn = new THREE.Vector3(Infinity, Infinity, Infinity);
    const mx = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    let n = 0;
    for (let u = 0; u < pts.length; u++) {
      if (steps[u] < 0) continue;
      mn.min(pts[u]);
      mx.max(pts[u]);
      n++;
    }
    if (!n) return;
    const count = Math.max(1, Math.min(64, Math.round(puffs * Math.min(1, this.quality.particleScale * 1.6))));
    const c = mn.clone().add(mx).multiplyScalar(0.5);
    const ext = mx.clone().sub(mn);
    out.add(
      new Emitter(DIST.BOX, F.SELFLIT)
        .on(L_SMOKE)
        .origin(c.x, c.y + yOff, c.z)
        .axis(ext.x + 1, 1, ext.z + 1)
        .time(t0)
        .dir(0, 1, 0, 0.5)
        .speed(1.0, 2.4)
        .physics(0.65, 0.4)
        .color(GREY, opacity)
        .color2(this.c2.copy(color).multiplyScalar(selfLight), 0)
        .life(life0, life1)
        .emit(count, 0, Math.max(0.2, spreadT) / count)
        .size(0.2 * H + 0.5, 0.45 * H + 1.5)
        .trail(0.6, 0.35)
        .seed(this.sub(cue, 9999))
        .set(R.X0, 0.9)
        .set(R.X1, 0.22)
        .set(R.X2, 0.8)
        .set(R.Y0, albedo)
        .set(R.Y2, 0.12)
        .set(R.Y3, 1)
        .set(R.Z0, 1)
        .set(R.Z3, PUFF.SMOKE)
        .window(t0, t0 + spreadT + life1 + 0.5),
    );
  }

  /** target positions (combined targets that share a unit, e.g. arm_posts + arm_ends, fire it once) */
  private points(cue: Cue, fallback: AnchorName): THREE.Vector3[] {
    let out: THREE.Vector3[] = [];
    for (const p of this.app.anchors.resolve(cue.targets, fallback)) {
      let dup = false;
      for (let i = 0; i < out.length && !dup; i++) dup = out[i].distanceToSquared(p) < 1.6;
      if (!dup) out.push(p.clone());
    }
    // `rows`: keep only these rows counted from the stage (1 = nearest), e.g. pillar capitals
    const rows = cue.p.rows;
    if (Array.isArray(rows) && rows.length && out.length > 1) {
      const zs: number[] = [];
      for (const p of [...out].sort((a, b) => a.z - b.z)) if (!zs.length || p.z - zs[zs.length - 1] > 3) zs.push(p.z);
      const keep = out.filter((p) => {
        let r = 0;
        while (r + 1 < zs.length && p.z - zs[r + 1] > -3) r++;
        return rows.includes(r + 1);
      });
      if (keep.length) out = keep;
    }
    return out;
  }

  // ---------------------------------------------------------------- flames

  /**
   * Flame projectors. Every unit is a discrete column: a narrow, fast, velocity-stretched tongue
   * (~1 m at the nozzle, ~3 m at the top for a 9 m flame) that rolls into a short fireball and a
   * little soot — neighbouring 3 m-spaced units touch only at their tips, so a row reads as a line
   * of jets with the set visible between them, not as a curtain.
   *  - H >= 12 on a few stand-alone units ("power flames", e.g. the two 15 m tower torches): 3 m
   *    wide at the base, 8–9 m fireball top, slower and fuller.
   *  - `fireball: true`: a spherical 8–10 m fireball with a dark smoke cap (corner fireballs).
   *  - firewall on `wing_left`/`wing_right`: the burning wings — fire runs up every finger spar
   *    (1.7 m pitch), wide billowing flames, a roll-over fireball at each tip on every ignition.
   *  - coloured (non-hydrocarbon) flames keep their hue: no white-hot core, less soot.
   */
  private flames(cue: Cue, out: EmitterSet, wall: boolean): void {
    const p = cue.p;
    const H = num(p.height, wall ? 6 : 8, 0.5, 30);
    if (!wall && bool(p.fireball, false)) {
      this.fireballs(cue, out, H);
      return;
    }
    const wing = wall && cue.targets.length > 0 && cue.targets.every((t) => t === 'wing_left' || t === 'wing_right');
    let pts = this.points(cue, 'deck_front');
    let tops: THREE.Vector3[] = [];
    if (wing) ({ points: pts, tops } = wingFire(pts, this.app.anchors.get('wing_tips'), 1.8));
    else if (wall) pts = densify(pts, 3.2);
    const color = this.flameColor(p.color);
    const warm = this.warm;
    const pattern = str(p.pattern, 'all');
    const stagger = num(p.stagger, pattern === 'all' ? 0 : 0.06, 0, 2);
    const angle = num(p.angle, 0, -80, 80);
    const inten = num(p.intensity, 1, 0, 3);
    const steps = patternSteps(pts, pattern, cue.seed, cue.step);
    const dur = Math.max(0.12, cue.dur);
    // power flames are stand-alone units (torches, towers); a tall cue on a long row stays a row of jets
    const big = !wing && H >= 12 && pts.length <= 8;
    // geometry of one column: start radius, radius growth (m) and width override
    const wK = num(p.width, 1, 0.3, 4);
    const r0 = (wing ? 0.8 : big ? 0.75 + 0.055 * H : 0.28 + 0.03 * H) * wK;
    // coloured (cold-fire / lit-plume) columns billow a little wider than a hydrocarbon jet
    const rG = (wing ? 0.65 * H : big ? 0.25 * H : 0.13 * H) * wK * (warm ? 1 : 1.35);
    const life = (wing ? 0.75 : 0.5) + (big ? 0.055 : 0.05) * H;
    const k = wing ? 2.0 : 2.4;
    const buoy = 7.5;
    const vT = buoy / k;
    const tr = life * 0.75;
    const v0 = vT + (((wing ? 0.7 : 0.93) * H - vT * tr) * k) / (1 - Math.exp(-k * tr));
    const rate = wing ? 24 : big ? 52 : 38;
    const count = this.pc(rate * life, 8);
    // hydrocarbon flames end in soot; coloured (additive-salt / lit CO2) plumes barely smoke
    // (the soot takes over late: at night the fireball stays bright to its top, black smoke is only a cap)
    const soot = warm ? (wing ? 0.7 : big ? 0.5 : 0.55) : 0.08;
    const sootStart = wing ? 0.45 : big ? 0.62 : 0.58;
    let maxDelay = 0;
    let n = 0;
    const cx = new THREE.Vector3();
    for (let u = 0; u < pts.length; u++) {
      if (steps[u] < 0) continue;
      const pos = pts[u];
      const hj = wall ? 0.85 + 0.3 * hashF(cue.seed, u, 3) : 0.94 + 0.12 * hashF(cue.seed, u, 3);
      const t0 = cue.t + steps[u] * stagger;
      maxDelay = Math.max(maxDelay, steps[u] * stagger);
      const d = tiltedUp(pos.x, angle, this.v1);
      const seed = this.sub(cue, u * 8);
      // the column: fast narrow tongue near the nozzle (stretched along its velocity), fireball on top
      out.add(
        new Emitter(DIST.CONE, F.RAMP)
          .on(L_FIRE)
          .originV(pos)
          .time(t0)
          .dirV(d, wing ? 0.42 : big ? 0.38 : 0.075)
          .speed(v0 * hj * 0.86, v0 * hj * 1.06)
          .physics(k, buoy)
          // (the wing units overlap ~4x along the spars: less each, so the mass stays orange-yellow)
          .color(color, (warm ? (wing ? 5 : 8) : 6) * inten)
          .color2(SOOT, warm)
          .life(life * 0.8, life * 1.05)
          .emit(count, dur)
          .size(r0, rG * hj)
          .trail(wing ? 0.7 : 0.9, 0.55 + 0.02 * H) // TRAIL = size exponent, GLITTER = noise scale
          .seed(seed)
          .set(R.X1, 1.5)
          .set(R.X2, 0.95)
          .set(R.X3, 0.06)
          .set(R.Y0, soot)
          .set(R.Y1, sootStart)
          .set(R.Y3, 0.6)
          .set(R.Z2, wing ? 0.02 : big ? 0.04 : 0.075)
          .set(R.Z3, PUFF.FLAME)
          .window(t0, t0 + dur + life * 1.1),
      );
      // white-hot nozzle glow while firing (not on the wings: those burn along the structure)
      if (!wing)
        out.add(
          new Emitter(DIST.SINGLE, 0)
            .on(L_FIRE)
            .origin(pos.x + d.x * 0.6, pos.y + d.y * 0.6, pos.z)
            .time(t0)
            .dirV(d)
            .speed(0.5)
            .physics(1, 0)
            .color(this.c2.copy(color).lerp(WHITE, warm ? 0.5 : 0.15), (warm ? 3.5 : 2) * inten)
            .life(0.1, 0.14)
            .emit(3, dur)
            .size(r0 * 0.9, 0.3)
            .trail(1, 1)
            .seed(seed ^ 0x55)
            .set(R.X0, 0.2)
            .set(R.Z3, PUFF.GLOW)
            .window(t0, t0 + dur + 0.15),
        );
      // light of the fire scattered in the haze around it (heat + volume from afar); every
      // second unit only on tight rows, so the glow does not fuse a row into one band
      if (wing ? u % 3 === 0 : pts.length < 10 || u % 2 === 0)
        out.add(
          new Emitter(DIST.SINGLE, F.RAMP)
            .on(L_FIRE)
            .origin(pos.x + d.x * H * 0.55, pos.y + d.y * H * 0.55, pos.z)
            .time(t0)
            .dirV(d)
            .speed(0.4)
            .physics(1, 0)
            .color(color, (wing ? 0.3 : 0.24) * inten)
            .life(0.35, 0.45)
            .emit(2, dur)
            .size(0.32 * H + 1 + rG * 0.3, 0.15 * H)
            .trail(1, 1)
            .seed(seed ^ 0x66)
            .set(R.X3, 0.12)
            .set(R.Z3, PUFF.GLOW)
            .window(t0, t0 + dur + 0.5),
        );
      // the fire lights the ground in front of it (the orange field of the drone shots)
      if (!wing && (pts.length < 10 || u % 2 === 0)) this.groundPool(out, seed ^ 0x77, pos, t0, dur, color, (pts.length < 10 ? 0.16 : 0.24) * inten, 0.9 * H + 3);
      cx.add(pos);
      n++;
    }
    if (n > 0) {
      // roll-over fireballs where the fire reaches the wing tips
      if (wing) tops.forEach((tp, i) => this.fireball(out, this.sub(cue, 7000 + i), tp.x + Math.sign(tp.x) * 1.5, tp.y + H * 0.7, tp.z, cue.t + 0.12 + 0.05 * i, 0.5 * H, color, 1, 0.2));
      // a big power flame rolls into a fireball at its top when it cuts
      if (big) {
        for (let u = 0; u < pts.length; u++)
          if (steps[u] >= 0) this.fireball(out, this.sub(cue, u * 8 + 3), pts[u].x, pts[u].y + H * 0.9, pts[u].z, cue.t + steps[u] * stagger + dur - 0.1, 0.2 * H * wK, color, inten * 0.8, 0.3);
      }
      // smoke of the whole row: one emitter over the units' bounding box, thin and quick to clear
      if (warm) this.rowSmoke(out, cue, pts, steps, H * 0.8, H, color, 2.0, (wing ? 0.16 : 0.1) * inten, (1 + dur) * Math.min(n, 30), cue.t + 0.25, dur + maxDelay, 3.2, 5, 0.35);
      cx.multiplyScalar(1 / n);
      cx.y += H * 0.5;
      out.flashes.push({
        kind: 1,
        t0: cue.t,
        t1: cue.t + maxDelay + dur + 0.35,
        color: color.clone(),
        peak: Math.min(2.2, 0.05 * n * (H / 8) + 0.25) * inten * (warm ? 1 : 0.7),
        decay: 0.35,
        pos: cx,
        strobe: 0,
      });
    }
  }

  /**
   * A flickering pool of the effect's light on the ground next to a unit on (or near) the ground:
   * offset a few metres toward the field centre, so the deck edge / arm walls throw their light onto
   * the field. Units high up (pillar capitals, roof, wings) light nothing on the ground.
   */
  private groundPool(out: EmitterSet, seed: number, pos: THREE.Vector3, t0: number, dur: number, color: THREE.Color, inten: number, radius: number): void {
    if (pos.y > 7) return;
    const gx = -pos.x,
      gz = 60 - pos.z;
    const gl = Math.hypot(gx, gz) || 1;
    const off = 0.3 * radius;
    out.add(
      new Emitter(DIST.SINGLE, F.RAMP)
        .on(L_FIRE)
        .origin(pos.x + (gx / gl) * off, 0.3, pos.z + (gz / gl) * off)
        .time(t0)
        .dir(0, 1, 0)
        .speed(0)
        .physics(1, 0)
        .color(color, inten)
        .life(0.3, 0.4)
        .emit(2, dur)
        .size(radius, 0)
        .trail(1, 1)
        .seed(seed)
        .set(R.X3, 0.1)
        .set(R.Z1, 1)
        .set(R.Z3, PUFF.GROUND)
        .window(t0, t0 + dur + 0.45),
    );
  }

  /**
   * One rolling fireball: a cloud of flame puffs born over ~0.3 s around (x,y,z) that expand to
   * `R` metres, rise on their own heat and roll into a dark soot cap.
   */
  private fireball(out: EmitterSet, seed: number, x: number, y: number, z: number, t0: number, R0: number, color: THREE.Color, inten: number, soot: number): void {
    const life = 1.1 + 0.06 * R0;
    const n = this.pc(10 + 3 * R0, 8);
    out.add(
      new Emitter(DIST.SPHERE, 0)
        .on(L_FIRE)
        .origin(x, y, z)
        .time(t0)
        .speed(R0 * 1.1, R0 * 2.2)
        .physics(2.6, 6)
        .color(color, 7 * inten)
        .color2(SOOT, this.warm)
        .life(life * 0.75, life)
        .emit(n, 0, 0.3 / n)
        .size(R0 * 0.3, R0 * 0.55)
        .trail(0.6, 0.5)
        .seed(seed)
        .set(R.X1, 1.2)
        .set(R.X2, 0.9)
        .set(R.Y0, this.warm ? 0.9 : 0.1)
        .set(R.Y1, 0.3 + soot)
        .set(R.Y3, 0.6)
        .set(R.Z3, PUFF.FLAME)
        .window(t0, t0 + 0.3 + life),
    );
    if (this.warm) {
      // the dark cap it leaves behind
      out.add(
        new Emitter(DIST.SPHERE, F.SELFLIT)
          .on(L_SMOKE)
          .origin(x, y + R0 * 0.6, z)
          .time(t0 + life * 0.5)
          .speed(0.5, 1.5)
          .physics(0.8, 1.6)
          .color(this.c2.setRGB(0.14, 0.12, 0.11), 0.42)
          .color2(this.c2.copy(color).multiplyScalar(1.5), 0)
          .life(3.5, 5)
          .emit(Math.max(2, Math.round(5 * Math.min(1, this.quality.particleScale * 1.6))), 0, 0.06)
          .size(R0 * 0.45, R0 * 0.8)
          .trail(0.5, 0.3)
          .seed(seed ^ 0x99)
          .set(R.X0, 0.5)
          .set(R.X1, 0.25)
          .set(R.X2, 0.8)
          .set(R.Y0, 0.25)
          .set(R.Y2, 0.1)
          .set(R.Y3, 1)
          .set(R.Z0, 0.6)
          .set(R.Z3, PUFF.SMOKE)
          .window(t0 + life * 0.5, t0 + life * 0.5 + 5.5),
      );
    }
    out.add(
      new Emitter(DIST.SINGLE, 0)
        .on(L_FIRE)
        .origin(x, y, z)
        .time(t0)
        .dir(0, 1, 0)
        .speed(1)
        .physics(1, 0)
        .color(color, 0.9 * inten)
        .life(0.7)
        .emit(1)
        .size(R0 * 1.6, R0 * 0.6)
        .trail(0.6, 1)
        .seed(seed ^ 0x77)
        .set(R.X0, 0.35)
        .set(R.Z3, PUFF.FLASH)
        .window(t0, t0 + 0.75),
    );
  }

  /** `fireball: true` flames: a short lift jet, then an 8–10 m fireball with a dark smoke cap */
  private fireballs(cue: Cue, out: EmitterSet, H: number): void {
    const p = cue.p;
    const pts = this.points(cue, 'corner_fireballs');
    const color = this.flameColor(p.color);
    const inten = num(p.intensity, 1, 0, 3);
    const size = num(p.size, 1, 0.3, 3);
    // visual ball radius ~1.4 x R0: 8 m flame -> ~9–10 m fireball
    const R0 = (2.2 + 0.14 * H) * size;
    const cx = new THREE.Vector3();
    pts.forEach((pos, u) => {
      const seed = this.sub(cue, u * 8);
      // lift: the fuel shot that ignites into the ball
      out.add(
        new Emitter(DIST.CONE, F.RAMP)
          .on(L_FIRE)
          .originV(pos)
          .time(cue.t)
          .dir(0, 1, 0, 0.12)
          .speed(H * 2.6, H * 3.1)
          .physics(3, 6)
          .color(color, 8 * inten)
          .color2(SOOT, this.warm)
          .life(0.3, 0.42)
          .emit(this.pc(22, 6), 0.28)
          .size(0.6, R0 * 0.25)
          .trail(0.9, 0.6)
          .seed(seed)
          .set(R.X1, 1.5)
          .set(R.X2, 0.9)
          .set(R.X3, 0.05)
          .set(R.Y0, 0.3)
          .set(R.Y1, 0.7)
          .set(R.Z2, 0.08)
          .set(R.Z3, PUFF.FLAME)
          .window(cue.t, cue.t + 0.8),
      );
      this.fireball(out, seed ^ 0x3c3c, pos.x, pos.y + H * 0.75, pos.z, cue.t + 0.18, R0, color, inten, 0.15);
      cx.add(pos);
    });
    if (pts.length) {
      cx.multiplyScalar(1 / pts.length);
      cx.y += H;
      out.flashes.push({ kind: 1, t0: cue.t, t1: cue.t + 1.6, color: color.clone(), peak: Math.min(2.2, 0.9 * pts.length * size) * inten, decay: 0.8, pos: cx, strobe: 0 });
    }
  }

  private breath(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const mouth = this.app.anchors.get('dragon_mouth')[0] ?? new THREE.Vector3(0, 11, -2);
    const len = num(p.length, 18, 3, 60);
    const color = this.flameColor(p.color);
    const dur = Math.max(0.3, cue.dur);
    const life = 1.15;
    const k = 2.1;
    const e = (1 - Math.exp(-k * life)) / k;
    const v0 = len / e;
    const seed = this.sub(cue, 1);
    const dir = this.v1.set(0, num(p.pitch, 0.16, -1, 1), 1).normalize();
    out.add(
      new Emitter(DIST.CONE, F.RAMP)
        .on(L_FIRE)
        .originV(mouth)
        .time(cue.t)
        .dirV(dir, 0.11)
        .speed(v0 * 0.8, v0 * 1.05)
        .physics(k, 6)
        .color(color, 14)
        .color2(SOOT, this.warm)
        .life(life * 0.75, life * 1.1)
        .emit(this.pc(60 * life, 16), dur)
        .size(0.5, 0.3 * len)
        .trail(0.7, 0.45)
        .seed(seed)
        .set(R.X1, 1.2)
        .set(R.X2, 1.0)
        .set(R.X3, 0.1)
        .set(R.Y0, 0.55)
        .set(R.Y1, 0.55)
        .set(R.Y3, 0.5)
        .set(R.Z3, PUFF.FLAME)
        .window(cue.t, cue.t + dur + life * 1.2),
    );
    out.add(
      new Emitter(DIST.SINGLE, 0)
        .on(L_FIRE)
        .originV(mouth)
        .time(cue.t)
        .dirV(dir)
        .speed(1)
        .physics(1, 0)
        .color(this.c2.copy(color).lerp(WHITE, 0.6), 14)
        .life(0.1, 0.14)
        .emit(3, dur)
        .size(1.6, 0.5)
        .trail(1, 1)
        .seed(seed ^ 3)
        .set(R.Z3, PUFF.GLOW)
        .window(cue.t, cue.t + dur + 0.15),
    );
    const nSmoke = Math.max(2, Math.round(3 * dur * Math.min(1, this.quality.particleScale * 1.6)));
    out.add(
      new Emitter(DIST.CONE, F.SELFLIT)
        .on(L_SMOKE)
        .origin(mouth.x, mouth.y + 3, mouth.z + len * 0.6)
        .time(cue.t + 0.3)
        .dir(0, 1, 0.3, 0.5)
        .speed(1.5, 3)
        .physics(0.6, 0.5)
        .color(GREY, 0.2)
        .color2(this.c2.copy(color).multiplyScalar(2.5), 0)
        .life(5, 8)
        .emit(nSmoke, 0, dur / nSmoke)
        .size(3, 9)
        .trail(0.6, 0.3)
        .seed(seed ^ 9)
        .set(R.X0, 0.8)
        .set(R.X2, 0.8)
        .set(R.Y0, 0.4)
        .set(R.Y2, 0.12)
        .set(R.Y3, 1)
        .set(R.Z0, 1)
        .set(R.Z3, PUFF.SMOKE)
        .window(cue.t + 0.3, cue.t + dur + 8.5),
    );
    out.flashes.push({ kind: 1, t0: cue.t, t1: cue.t + dur + 0.4, color: color.clone(), peak: 1.6, decay: 0.4, pos: mouth.clone().add(new THREE.Vector3(0, 2, len * 0.4)), strobe: 0 });
  }

  // ---------------------------------------------------------------- CO2

  private jets(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const pts = this.points(cue, 'deck_front');
    const H = num(p.height, 8, 1, 25);
    const color = fxColor(p.color, this.palette, this.c1, 'white');
    const pattern = str(p.pattern, 'all');
    const stagger = num(p.stagger, pattern === 'all' ? 0 : 0.05, 0, 2);
    const angle = num(p.angle, 0, -80, 80);
    const steps = patternSteps(pts, pattern, cue.seed, cue.step);
    const dur = Math.max(0.2, cue.dur);
    const k = 3.2;
    const v0 = speedForHeight(H * 1.05, k, 4);
    const life = 1.7;
    for (let u = 0; u < pts.length; u++) {
      if (steps[u] < 0) continue;
      const pos = pts[u];
      const t0 = cue.t + steps[u] * stagger;
      const d = tiltedUp(pos.x, angle, this.v1);
      out.add(
        new Emitter(DIST.CONE, F.RAMP)
          .on(L_SMOKE)
          .originV(pos)
          .time(t0)
          .dirV(d, 0.07)
          .speed(v0 * 0.85, v0 * 1.05)
          .physics(k, -3)
          .color(WHITE, 0.5)
          .color2(this.c2.copy(color).multiplyScalar(0.9), 0)
          .life(life * 0.7, life)
          .emit(this.pc(34 * life, 10), dur)
          .size(0.25, 0.32 * H)
          .trail(0.55, 0.5)
          .seed(this.sub(cue, u))
          .set(R.X1, 1)
          .set(R.X2, 0.7)
          .set(R.X3, 0.05)
          .set(R.Y0, 0.9)
          .set(R.Y2, 0.04)
          .set(R.Y3, 0.3)
          .set(R.Z0, 1.3)
          .set(R.Z2, 0.045)
          .set(R.Z3, PUFF.CO2)
          .window(t0, t0 + dur + life),
      );
    }
  }

  // ---------------------------------------------------------------- spark fountains

  private fountains(cue: Cue, out: EmitterSet, cold: boolean): void {
    const p = cue.p;
    const pts = this.points(cue, 'deck_front');
    const H = num(p.height, cold ? 3.5 : 8, 0.5, 40);
    const color = fxColor(p.color, this.palette, this.c1, cold ? 'warm' : 'gold');
    const pattern = str(p.pattern, 'all');
    const stagger = num(p.stagger, pattern === 'all' ? 0 : 0.05, 0, 2);
    const angle = num(p.angle, 0, -80, 80);
    // big gerbs (15–20 m wall units) throw a wider, fuller plume than a small stage gerb
    const spread = (num(p.spread, cold ? 7 : Math.min(10, 4 + 0.28 * H), 0, 60) * Math.PI) / 180;
    const steps = patternSteps(pts, pattern, cue.seed, cue.step);
    const dur = Math.max(0.3, cue.dur);
    const k = cold ? 1.9 : 1.05;
    const v0 = speedForHeight(H, k);
    const tA = apexTime(v0, k);
    const lifeMax = cold ? tA * 1.5 : tA * 1.75;
    const rate = cold ? 320 : 280 + 14 * H;
    // long walls (the finale U: ~60 fountains) thin out per unit so the wall stays inside the spark
    // budget without the layer scaling every other fountain down
    let nFire = 0;
    for (let u = 0; u < steps.length; u++) if (steps[u] >= 0) nFire++;
    const count = this.pc(rate * lifeMax * Math.min(1, Math.sqrt(28 / Math.max(1, nFire))), 40);
    const inten = num(p.intensity, 1, 0, 3) * (cold ? 11 : 17);
    // what the sparks cool to: gold -> deep orange, white/silver (titanium) -> pale gold
    const white = color.b > 0.6 && color.g > 0.6;
    const coolTo = white ? new THREE.Color(1.0, 0.72, 0.4) : new THREE.Color(1.0, 0.3, 0.06);
    const cx = new THREE.Vector3();
    let n = 0;
    let maxDelay = 0;
    for (let u = 0; u < pts.length; u++) {
      if (steps[u] < 0) continue;
      const pos = pts[u];
      const t0 = cue.t + steps[u] * stagger;
      maxDelay = Math.max(maxDelay, steps[u] * stagger);
      const d = tiltedUp(pos.x, angle, this.v1);
      const seed = this.sub(cue, u * 4);
      out.add(
        new Emitter(DIST.CONE, F.COOL | F.FLICKER | F.RAMP)
          .on(L_SPARK)
          .originV(pos)
          .time(t0)
          .dirV(d, spread)
          .speed(v0 * 0.72, v0 * 1.02)
          .physics(k, -9.81)
          .color(color, inten)
          .color2(coolTo, -1)
          .life(tA * 0.75, lifeMax)
          .emit(count, dur)
          .size(cold ? 0.03 : 0.05, 0.45)
          .trail(cold ? 0.06 : 0.12, cold ? 0.55 : 0.3)
          .seed(seed)
          .set(R.X3, 0.18)
          .set(R.Y0, 0.85)
          .set(R.Y3, 0.3)
          .set(R.Z0, 0.02)
          .window(t0, t0 + dur + lifeMax),
      );
      // bright core at the nozzle
      out.add(
        new Emitter(DIST.SINGLE, F.RAMP)
          .on(L_FIRE)
          .origin(pos.x, pos.y + 0.25, pos.z)
          .time(t0)
          .dirV(d)
          .speed(0.3)
          .physics(1, 0)
          .color(this.c2.copy(color).lerp(WHITE, 0.6), cold ? 4 : 7)
          .life(0.09, 0.12)
          .emit(3, dur)
          .size(cold ? 0.35 : 0.55, 0.3)
          .trail(1, 1)
          .seed(seed ^ 5)
          .set(R.X3, 0.15)
          .set(R.Z3, PUFF.GLOW)
          .window(t0, t0 + dur + 0.15),
      );
      // dense white-hot jet in the lower part of the column (the sparks are too close to resolve)
      out.add(
        new Emitter(DIST.CONE, F.RAMP)
          .on(L_FIRE)
          .originV(pos)
          .time(t0)
          .dirV(d, spread * 0.5)
          .speed(v0 * 0.55, v0 * 0.8)
          .physics(k, -9.81)
          .color(this.c2.copy(color).lerp(WHITE, 0.45), cold ? 1.6 : 2.6)
          .life(0.22, 0.3)
          .emit(this.pc(cold ? 14 : 20, 6), dur)
          .size(cold ? 0.14 : 0.2 + 0.012 * H, 0.1)
          .trail(1, 1)
          .seed(seed ^ 6)
          .set(R.X3, 0.15)
          .set(R.Z2, 0.05)
          .set(R.Z3, PUFF.GLOW)
          .window(t0, t0 + dur + 0.35),
      );
      if (!cold && (pts.length < 10 || u % 2 === 0)) this.groundPool(out, seed ^ 0x78, pos, t0, dur, color, 0.1 * num(p.intensity, 1, 0, 3) * (pts.length < 10 ? 1 : 1.6), 0.45 * H + 4);
      cx.add(pos);
      n++;
    }
    if (n > 0) {
      if (!cold) this.rowSmoke(out, cue, pts, steps, H * 0.35, H, color, 1.4, 0.14, (1 + dur * 0.8) * n, cue.t + 0.3, dur + maxDelay, 6, 9, 0.7);
      cx.multiplyScalar(1 / n);
      cx.y += H * 0.5;
      out.flashes.push({
        kind: 1,
        t0: cue.t,
        t1: cue.t + maxDelay + dur + 0.3,
        color: color.clone(),
        peak: Math.min(1.6, (cold ? 0.012 : 0.03) * n * Math.sqrt(H / 8) + 0.1),
        decay: 0.4,
        pos: cx,
        strobe: 0,
      });
    }
  }

  private waterfall(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const pts = this.points(cue, 'roof').sort((a, b) => a.x - b.x);
    const color = fxColor(p.color, this.palette, this.c1, 'gold');
    const dur = Math.max(0.5, cue.dur);
    const segs: [THREE.Vector3, THREE.Vector3][] = [];
    if (pts.length === 1) segs.push([pts[0].clone().add(new THREE.Vector3(-5, 0, 0)), pts[0].clone().add(new THREE.Vector3(5, 0, 0))]);
    for (let i = 0; i + 1 < pts.length; i++) if (pts[i].distanceTo(pts[i + 1]) < 30) segs.push([pts[i], pts[i + 1]]);
    const lifeMax = 3.2;
    const cx = new THREE.Vector3();
    segs.forEach(([a, b], i) => {
      const len = a.distanceTo(b);
      out.add(
        new Emitter(DIST.LINE, F.COOL | F.FLICKER | F.RAMP)
          .on(L_SPARK)
          .originV(a)
          .time(cue.t)
          .dir(0, -1, 0.15, 0.6)
          .speed(0.3, 2.2)
          .physics(1.5, -9.81)
          .color(color, 11)
          .life(1.8, lifeMax)
          .emit(this.pc(len * 30 * lifeMax, 30), dur)
          .size(0.045, 0.45)
          .trail(0.13, 0.5)
          .axis(b.x - a.x, b.y - a.y, b.z - a.z)
          .seed(this.sub(cue, i))
          .set(R.X3, 0.3)
          .set(R.Y0, 0.8)
          .set(R.Y3, 0.4)
          .window(cue.t, cue.t + dur + lifeMax),
      );
      cx.add(a).add(b);
    });
    if (segs.length) {
      cx.multiplyScalar(1 / (segs.length * 2));
      out.flashes.push({ kind: 1, t0: cue.t, t1: cue.t + dur + 0.5, color: color.clone(), peak: Math.min(1.2, 0.08 * segs.length + 0.1), decay: 0.8, pos: cx, strobe: 0 });
    }
  }

  // ---------------------------------------------------------------- explosions

  private burst(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const pts = this.points(cue, 'deck_front');
    const size = num(p.size, 1, 0.2, 5);
    const color = fxColor(p.color, this.palette, this.c1, 'warm');
    const sq = Math.sqrt(size);
    const cx = new THREE.Vector3();
    pts.forEach((pos, u) => {
      const seed = this.sub(cue, u * 4);
      out.add(
        new Emitter(DIST.SINGLE, 0)
          .on(L_FIRE)
          .origin(pos.x, pos.y + 1.4 * size, pos.z)
          .time(cue.t)
          .dir(0, 1, 0)
          .speed(1.5)
          .physics(1, 0)
          .color(this.c2.copy(color).lerp(FIRE, 0.25).lerp(WHITE, 0.3), 32 * sq)
          .life(0.45)
          .emit(1)
          .size(2.8 * size, 1.5 * size)
          .trail(0.5, 1)
          .seed(seed)
          .set(R.X0, 0.09)
          .set(R.Z3, PUFF.FLASH)
          .window(cue.t, cue.t + 0.5),
      );
      out.add(
        new Emitter(DIST.HEMI, F.COOL | F.FLICKER)
          .on(L_SPARK)
          .originV(pos)
          .time(cue.t)
          .speed(10 * sq, 26 * sq)
          .physics(2.1, -9.81)
          .color(color, 16)
          .life(0.6, 1.4)
          .emit(this.pc(80, 20))
          .size(0.06, 0.4)
          .trail(0.12, 0.4)
          .seed(seed ^ 1)
          .set(R.Y0, 0.9)
          .set(R.Z0, 0.01)
          .window(cue.t, cue.t + 1.7),
      );
      out.add(
        new Emitter(DIST.SPHERE, F.SELFLIT)
          .on(L_SMOKE)
          .origin(pos.x, pos.y + 1.2 * size, pos.z)
          .time(cue.t)
          .speed(3 * sq, 7 * sq)
          .physics(1.6, 0.6)
          .color(GREY, 0.3)
          .color2(this.c2.copy(color).multiplyScalar(6), 0)
          .life(7, 10)
          .emit(Math.max(2, Math.round(6 * Math.min(1, this.quality.particleScale * 1.6))))
          .size(1.3 * size, 5 * size)
          .trail(0.55, 0.35)
          .seed(seed ^ 2)
          .set(R.X0, 0.25)
          .set(R.X1, 0.2)
          .set(R.X2, 0.8)
          .set(R.Y0, 0.55)
          .set(R.Y2, 0.03)
          .set(R.Y3, 1)
          .set(R.Z0, 1)
          .set(R.Z3, PUFF.SMOKE)
          .window(cue.t, cue.t + 10.5),
      );
      cx.add(pos);
    });
    if (pts.length) {
      cx.multiplyScalar(1 / pts.length);
      cx.y += 2;
      out.flashes.push({ kind: 0, t0: cue.t, t1: cue.t + 1.2, color: color.clone(), peak: Math.min(3, 1.1 * size + 0.1 * pts.length), decay: 0.25, pos: cx, strobe: 0 });
    }
  }

  private bengal(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const pts = this.points(cue, 'wing_tips');
    const size = num(p.size, 1, 0.2, 5);
    const color = fxColor(p.color, this.palette, this.c1, 'red');
    const dur = Math.max(1, cue.dur);
    const cx = new THREE.Vector3();
    pts.forEach((pos, u) => {
      const seed = this.sub(cue, u * 4);
      out.add(
        new Emitter(DIST.CONE, F.RAMP)
          .on(L_FIRE)
          .originV(pos)
          .time(cue.t)
          .dir(0, 1, 0, 0.6)
          .speed(0.2, 0.8)
          .physics(1, 1)
          .color(this.c2.copy(color).lerp(WHITE, 0.25), 30 * size)
          .life(0.12, 0.18)
          .emit(8, dur)
          .size(1.2 * size, 0.8 * size)
          .trail(1, 1)
          .seed(seed)
          .set(R.X3, 0.4)
          .set(R.Z3, PUFF.GLOW)
          .window(cue.t, cue.t + dur + 0.2),
      );
      const life = 11;
      out.add(
        new Emitter(DIST.CONE, F.SELFLIT | F.RAMP)
          .on(L_SMOKE)
          .origin(pos.x, pos.y + 1, pos.z)
          .time(cue.t)
          .dir(0, 1, 0, 0.35)
          .speed(1.5, 3.2)
          .physics(0.45, 0.25)
          .color(GREY, 0.3)
          .color2(this.c2.copy(color).multiplyScalar(5 * size), 0)
          .life(life * 0.7, life)
          .emit(Math.max(6, Math.round(3.2 * life * Math.min(1, this.quality.particleScale * 1.5))), dur)
          .size(1.2 * size, 9 * size)
          .trail(0.6, 0.3)
          .seed(seed ^ 7)
          .set(R.X0, 1.6)
          .set(R.X1, 0.18)
          .set(R.X2, 0.85)
          .set(R.X3, 0.8)
          .set(R.Y0, 0.6)
          .set(R.Y2, 0.08)
          .set(R.Y3, 1)
          .set(R.Z0, 1)
          .set(R.Z3, PUFF.SMOKE)
          .window(cue.t, cue.t + dur + life),
      );
      cx.add(pos);
    });
    if (pts.length) {
      cx.multiplyScalar(1 / pts.length);
      cx.y += 3;
      out.flashes.push({ kind: 1, t0: cue.t, t1: cue.t + dur + 0.6, color: color.clone(), peak: Math.min(2.5, 0.7 * size * pts.length), decay: 0.6, pos: cx, strobe: 0 });
    }
  }
}

function hashF(seed: number, i: number, salt: number): number {
  let h = (seed ^ Math.imul(i + 1, 0x9e3779b9) ^ Math.imul(salt, 0x85ebca6b)) | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 8) / 16777216;
}
