import * as THREE from 'three';
import type { AnchorName } from '../core/Anchors';
import type { QualitySettings } from '../core/types';
import type { Cue } from '../show/ShowTypes';
import { CueFxSystem, EmitterSet } from '../fx/core/CueFxSystem';
import { DIST, Emitter, F, PUFF, R, apexTime, speedForHeight } from '../fx/core/Emitter';
import type { FlashSpec } from '../fx/core/Emitter';
import { bool, fxColor, num, str } from '../fx/core/fxColors';
import { clusters, densify, patternSteps, stretches, tiltedUp, uCoord, wingFire, wingSurface } from '../fx/core/placement';
import type { WingSurface } from '../fx/core/placement';

const L_SMOKE = 0;
const L_FIRE = 1;
const L_SPARK = 2;

/**
 * albedo of the soot a hydrocarbon flame rolls into: dark smoke, but a flame wall at night lights
 * its own smoke cap from below (the glowing clouds over the v1508.4-1510 wall), so it is not black
 */
const SOOT = new THREE.Color(0.13, 0.105, 0.09);
const WHITE = new THREE.Color(1, 1, 1);
const GREY = new THREE.Color(0.62, 0.62, 0.64);
const FIRE = new THREE.Color(1.0, 0.36, 0.08);
/** light colour of a hydrocarbon fire on smoke / the floor (a touch yellower than the flame body) */
const FIRE_LIGHT = new THREE.Color(1.0, 0.46, 0.14);
const DEEP_ORANGE = new THREE.Color(1.0, 0.3, 0.06);
const PALE_GOLD = new THREE.Color(1.0, 0.72, 0.4);

/**
 * burning wings on the wing surface (wingSurface): grid pitch (m); the flame units of the top-edge
 * row / finger ends (tongues) and of the membrane skin below: base life (s) + per m of height, rise
 * (x H, + m) and puff growth (x H), start radius (m), puffs per s, brightness, cone spread (rad), velocity stretch
 */
const WING_SPACING = 2;
const WING_EDGE = { life: 0.45, lifeH: 0.05, rise: 0.6, riseM: 1.5, grow: 0.17, r0: 0.5, rate: 30, bright: 4, spread: 0.22, stretch: 0.12 };
const WING_SKIN = { life: 0.4, lifeH: 0.03, rise: 0.25, riseM: 0, grow: 0.1, r0: 0.6, rate: 24, bright: 2.8, spread: 0.45, stretch: 0.06 };
/** flame texture of the burning wings: noise scale, erosion, soot share + start */
const WING_NOISE = 0.9;
const WING_ERODE = 1.25;
const WING_SOOT = 0.5;
const WING_SOOT_START = 0.62;
/** light of a burning wing (wingLight): strength and reach (m) of a reference-size band, its lit-smoke share */
const WING_AREA_REF = 250;
const WING_LIGHT = 1.6;
const WING_REACH = 14;
const WING_HAZE = 0.6;
/** light share of the roll-over fireballs on the surface wings (the band light carries the fire) */
const WING_BALL_LIGHT = 0.35;

/** big mine / flash-pot bursts (burst `size` >= BLAST_SIZE) throw a lit cloud (blastCloud): glow time (s), self-light, light */
const BLAST_SIZE = 1.8;
const BLAST_GLOW = 0.7;
const BLAST_SELF = 14;
const BLAST_HAZE = 0.6;
const BLAST_LIGHT = 0.9;
const WHITE_SMOKE = new THREE.Color(0.8, 0.8, 0.82);

/** white / silver gerbs below 22-30 m (silverDim): share of the row smoke's self-light and opacity taken away */
const SILVER_SELF = 0.8;
const SILVER_OPAC = 0.09;
/** ... and the share of their sparks taken away on walls taller than 14 m */
const SILVER_THIN = 0.55;

/** pillar geometry for `corners` (src/world/site.ts PILLAR: capital 3.4 m, plinth deck 8.4 m) */
const CAPITAL_DROP = 3.1;
const CAPITAL_HALF = 1.45;
const PLINTH_HALF = 3.4;

/**
 * Stage pyrotechnics: flame projectors, flame walls, dragon breath, CO2 jets, gerbs, cold-spark
 * fountains, spark waterfalls, stage explosions, Bengal flares and flare drones — all analytic GPU
 * particles (see src/fx/core). Every fx of docs/show-format.md "pyro" is supported; unknown params
 * are ignored. Every effect that burns also emits spatial light (FxLights): its smoke, the haze and
 * the floor around it glow in its colour. Extensions: docs/show-format-ext/pyro.md.
 *
 * Extra params understood (superset of the contract, all optional):
 *   all: `rows` (list, 1 = row nearest the stage) narrows multi-row targets such as pillars_top;
 *     `pos` ([x,y,z] or a list of them: absolute unit positions instead of the target, which stays
 *     the contract fallback; `posAdd: true` fires both); `at` (preferred extension anchor name);
 *     `offset` ([dx,dy,dz] added to every unit); `split` (m: every unit becomes a pair ±split/2
 *     along X); `corners: true` (pillars_top → the two front corners of the capital beside the
 *     crystal; pillars_base → the front corners of the plinth deck; other anchors: split 2 m)
 *   flame/firewall: `angle` (deg, tilt away from the stage centre), `intensity`, `width` (x column
 *     width), `fireball: true` (8–10 m fireball with a smoke cap, `size`); `fan` (heads per unit)
 *     + `fanSpread` (deg, default 50): multi-head V / fan flame units; firewall on the wings burns
 *     on the wing surface (fingers + membranes, see wingSurface); `billow` (default: on for rows ≥ 14 m): rolling 20–35 m fireball
 *     barrage; `blowout: true`: + spark wall + fireball row + bigger flash (finale)
 *   gerb/sparkular: `angle`, `spread` (deg), `colors` (list: colour sequence over the burn) +
 *     `changes` (relative switch times, s), `smoke` (0..3: a self-lit smoke column per unit)
 *   jet: `count` + `radius` (several jets around each anchor), `cloud: true` (the jets merge into
 *     one big coloured, self-lit CO2 cloud), `color`
 *   burst: dur >= 2 s or `type: "bengal"` turns it into a Bengal flare (any dur); `color`;
 *     `size` >= 1.8: a big mine that throws a lit smoke cloud over the deck and the field (blastCloud)
 *   bengal (burst type bengal / pyro.bengal): `size`, `path` (flare drone: list of [x,y,z]
 *     waypoints, or a list of such lists for several drones) + `times` (relative s per waypoint),
 *     `mirror: true` (also fly the X-mirrored path), `sparkler: true` (white sparkler drone),
 *     `smoke` (trail amount, default 1)
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
    columnLaw(spark.mesh.material as THREE.ShaderMaterial);
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
        return cue.dur + (bool(p.cloud, false) ? 4 : 2.5);
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
        if (cue.dur >= 2 || cue.p.type === 'bengal' || Array.isArray(cue.p.path)) this.bengal(cue, out);
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

  // ---------------------------------------------------------------- light

  /**
   * Spatial light of a row of burning units (FxLights): the firing units, in order along the U, are
   * cut into segments of at most ~40 m; each segment is one line light at height `yOff` whose
   * strength saturates softly with its unit count. Chases light each segment while its units burn.
   */
  private rowLight(out: EmitterSet, cue: Cue, pts: THREE.Vector3[], steps: number[], stagger: number, dur: number, tail: number, yOff: number, color: THREE.Color, perUnit: number, radius: number, maxLen = 40): void {
    if (!(perUnit > 0)) return;
    for (const s of stretches(pts, steps, maxLen)) {
      const a = pts[s[0]];
      const b = pts[s[s.length - 1]];
      let mn = Infinity,
        mx = -Infinity;
      for (const u of s) {
        mn = Math.min(mn, steps[u]);
        mx = Math.max(mx, steps[u]);
      }
      const I = perUnit * 6 * (1 - Math.exp(-s.length / 6));
      const A = new THREE.Vector3(a.x, a.y + yOff, a.z);
      const B = new THREE.Vector3(b.x, b.y + yOff, b.z);
      out.lights.push({
        kind: 1,
        t0: cue.t + mn * stagger,
        t1: cue.t + mx * stagger + dur + tail,
        decay: Math.max(0.1, tail),
        strobe: 0,
        color: color.clone(),
        peak: I,
        pos: A.clone().add(B).multiplyScalar(0.5),
        a: A,
        b: B,
        radius: radius + 0.15 * A.distanceTo(B),
      });
    }
  }

  /**
   * Light of the burning wings (wingSurface): one line light per wing across its burning band, sized
   * by the fire (a fully engulfed wing is a ~250 m² sheet of flame, far bigger than a fireball or a
   * row of jets): the reach grows with the square root of the burning area, the strength gently with
   * the area and the flame height (a 3.5 m burst along the top edges still lights the site, v148.5,
   * v788.5). Part of it is lit smoke (`haze`): the fire burns in its own soot and in the smoke over
   * the wings, which the haze field then fills with the fire's colour (v713.25-714.25).
   */
  private wingLight(out: EmitterSet, cue: Cue, surf: WingSurface, H: number, dur: number, color: THREE.Color, inten: number): void {
    for (const b of surf.bands) {
      const size = Math.sqrt(Math.max(1, b.area) / WING_AREA_REF);
      const I = WING_LIGHT * Math.sqrt(size) * Math.pow(H / 6, 0.5) * inten;
      if (!(I > 0)) continue;
      const len = b.a.distanceTo(b.b);
      out.lights.push({
        kind: 1,
        t0: cue.t,
        t1: cue.t + dur + 0.3,
        decay: 0.3,
        strobe: 0,
        color: color.clone(),
        peak: I,
        pos: b.a.clone().add(b.b).multiplyScalar(0.5),
        a: b.a.clone(),
        b: b.b.clone(),
        radius: WING_REACH * size + 0.3 * H + 0.1 * len,
        haze: WING_HAZE,
      });
    }
  }

  /**
   * The LightEnv flash of a row of units (the set, the crowd, the world materials and the flash term
   * on smoke), shared out over the stretches of the row (see stretches()) by unit count, each at the
   * centre of its stretch `yOff` m up. One flash at the centroid of a U-shaped row sat in the empty
   * field inside the U and lit the field centre; per stretch, the LightEnv sees where the light
   * really is (its flash spread softens the far light on the floor and the smoke, see glsl.ts).
   */
  private rowFlash(out: EmitterSet, pts: THREE.Vector3[], steps: number[] | undefined, yOff: number, f: Omit<FlashSpec, 'pos'>): void {
    const segs = stretches(pts, steps);
    let n = 0;
    for (const s of segs) n += s.length;
    if (!n || !(f.peak > 0)) return;
    for (const s of segs) {
      const c = new THREE.Vector3();
      for (const u of s) c.add(pts[u]);
      c.multiplyScalar(1 / s.length);
      c.y += yOff;
      out.flashes.push({ ...f, color: f.color.clone(), peak: (f.peak * s.length) / n, pos: c });
    }
  }

  /**
   * The LightEnv flash of scattered units (bursts, fireballs, flares on several anchors), one per
   * group of units (> `gap` m apart = separate groups, see clusters()) at the group's centre `yOff` m
   * up, the peak shared out by unit count: a flash pot on both arm ends (X ±91) flashes the two ends,
   * not the middle of the field between them (v484.75).
   */
  private groupFlash(out: EmitterSet, pts: THREE.Vector3[], gap: number, yOff: number, f: Omit<FlashSpec, 'pos'>): void {
    if (!pts.length || !(f.peak > 0)) return;
    for (const g of clusters(pts, gap)) {
      const c = new THREE.Vector3();
      for (const q of g) c.add(q);
      c.multiplyScalar(1 / g.length);
      c.y += yOff;
      out.flashes.push({ ...f, color: f.color.clone(), peak: (f.peak * g.length) / pts.length, pos: c });
    }
  }

  /** point light (fireballs, bursts, flares) */
  private pointLight(out: EmitterSet, kind: 0 | 1, t0: number, t1: number, decay: number, pos: THREE.Vector3, color: THREE.Color, I: number, radius: number, b?: THREE.Vector3): void {
    if (!(I > 0)) return;
    out.lights.push({ kind, t0, t1, decay, strobe: 0, color: color.clone(), peak: I, pos: pos.clone(), a: pos.clone(), b: (b ?? pos).clone(), radius });
  }

  /**
   * Smoke left by a row of units: one BOX emitter per stretch of the row (the firing units, in order
   * along the U, cut into pieces of at most ~40 m like the row light), so a U-shaped row (deck front +
   * side sections + arms) smokes along the U instead of filling the empty field inside it. The puffs
   * are shared out by unit count (per-unit smoke emitters would waste instancing slots on kick-synced
   * repeats). Self-lit in `color` (x `selfLight`, decaying over `selfDecay` s from each puff's birth)
   * while the units burn; afterwards the show's light (rig, flashes, pyro light field) lights it.
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
    selfDecay = 0.9,
    sizeK = 1,
    litEnd = 0,
  ): void {
    const segs = stretches(pts, steps);
    let nU = 0;
    for (const s of segs) nU += s.length;
    if (!nU) return;
    const total = Math.max(1, Math.min(64, Math.round(puffs * Math.min(1, this.quality.particleScale * 1.6))));
    const mn = new THREE.Vector3();
    const mx = new THREE.Vector3();
    const self = this.c2.copy(color).multiplyScalar(selfLight);
    segs.forEach((s, si) => {
      mn.set(Infinity, Infinity, Infinity);
      mx.set(-Infinity, -Infinity, -Infinity);
      for (const u of s) {
        mn.min(pts[u]);
        mx.max(pts[u]);
      }
      const count = Math.max(1, Math.round((total * s.length) / nU));
      const cx = (mn.x + mx.x) * 0.5,
        cy = (mn.y + mx.y) * 0.5,
        cz = (mn.z + mx.z) * 0.5;
      out.add(
        new Emitter(DIST.BOX, F.SELFLIT)
          .on(L_SMOKE)
          .origin(cx, cy + yOff, cz)
          .axis(mx.x - mn.x + 1, 1, mx.z - mn.z + 1)
          .time(t0)
          .dir(0, 1, 0, 0.5)
          .speed(1.0, 2.4)
          .physics(0.65, 0.4)
          .color(GREY, opacity)
          .color2(self, 0)
          .life(life0, life1)
          .emit(count, 0, Math.max(0.2, spreadT) / count)
          .size((0.2 * H + 0.5) * sizeK, (0.45 * H + 1.5) * sizeK)
          .trail(0.6, 0.35)
          .seed(this.sub(cue, 9999 + si * 131))
          .litUntil(litEnd)
          .set(R.X0, selfDecay)
          .set(R.X1, 0.22)
          .set(R.X2, 0.8)
          .set(R.Y0, albedo)
          .set(R.Y2, 0.12)
          .set(R.Y3, 1)
          .set(R.Z0, 1)
          .set(R.Z3, PUFF.SMOKE)
          .window(t0, t0 + spreadT + life1 + 0.5),
      );
    });
  }

  /**
   * The bright cloud a burning fountain row stands in while it burns: continuously renewed smoke
   * around the lower part of the sprays, strongly self-lit in the spark colour, one BOX per stretch
   * of the row (like rowSmoke). It is there from the ignition on (the gerb walls of v600.4 / v460.5
   * are glowing clouds within 0.3 s) and dies with the fountains; rowSmoke is what lingers.
   */
  private burnCloud(out: EmitterSet, cue: Cue, pts: THREE.Vector3[], steps: number[], stagger: number, t0: number, dur: number, H: number, color: THREE.Color, glow: number, opacity: number, build: number): void {
    const segs = stretches(pts, steps);
    const psc = Math.min(1, this.quality.particleScale * 1.4);
    const life = 1.3 + 0.03 * H;
    const self = this.c2.copy(color).multiplyScalar(glow);
    const mn = new THREE.Vector3();
    const mx = new THREE.Vector3();
    segs.forEach((s, si) => {
      mn.set(Infinity, Infinity, Infinity);
      mx.set(-Infinity, -Infinity, -Infinity);
      let d0 = Infinity,
        d1 = 0;
      for (const u of s) {
        mn.min(pts[u]);
        mx.max(pts[u]);
        d0 = Math.min(d0, steps[u] * stagger);
        d1 = Math.max(d1, steps[u] * stagger);
      }
      const units = s.length;
      // mobile keeps fewer, larger puffs
      const n = Math.max(3, Math.round((4 + 1.6 * Math.min(units, 24)) * psc));
      const sz = 1 + (1 - psc) * 0.5;
      const ts = t0 + d0;
      const ed = dur + (d1 - d0);
      out.add(
        new Emitter(DIST.BOX, F.SELFLIT | F.RAMP)
          .on(L_SMOKE)
          .origin((mn.x + mx.x) * 0.5, (mn.y + mx.y) * 0.5 + H * 0.28, (mn.z + mx.z) * 0.5)
          .axis(mx.x - mn.x + 2, H * 0.35, mx.z - mn.z + 2)
          .time(ts)
          .dir(0, 1, 0, 0.6)
          .speed(1.5, 4)
          .physics(1.2, 0.8)
          .color(GREY, opacity)
          .color2(self, 0)
          .life(life * 0.7, life)
          .emit(n, ed)
          .size((0.22 * H + 2) * sz, (0.4 * H + 3) * sz)
          .trail(0.5, 0.35)
          .seed(this.sub(cue, 8800 + si * 57))
          .litUntil(ts + ed)
          .set(R.X0, life * 0.8)
          .set(R.X1, 0.25)
          .set(R.X2, 0.8)
          // (RAMP: the cloud builds up over `build` s and clears as the fountains stop)
          .set(R.X3, Math.max(0.12, Math.min(build, ed * 0.45)))
          .set(R.Y0, 0.75)
          .set(R.Y2, 0.08)
          .set(R.Y3, 0.6)
          .set(R.Z0, 1)
          .set(R.Z3, PUFF.SMOKE)
          .window(ts, ts + ed + life),
      );
    });
  }

  /**
   * Target positions (combined targets that share a unit, e.g. arm_posts + arm_ends, fire it once),
   * plus the placement params `at`, `rows`, `corners`, `split`, `offset`.
   */
  private points(cue: Cue, fallback: AnchorName): THREE.Vector3[] {
    const p = cue.p;
    let out: THREE.Vector3[] = [];
    const at = vecList(p.pos);
    // absolute positions replace the anchors (the cue's target is the contract fallback for engines
    // that do not know `pos`); `posAdd: true` fires both
    const anchored = !at.length || bool(p.posAdd, false);
    // `at`: a preferred (extension) anchor name; the cue's target stays the fallback when the engine
    // does not know it (validator convention)
    const pref = typeof p.at === 'string' && this.app.anchors.get(p.at as AnchorName).length ? [p.at] : null;
    if (anchored)
      for (const q of this.app.anchors.resolve(pref ?? cue.targets, fallback)) {
        let dup = false;
        for (let i = 0; i < out.length && !dup; i++) dup = out[i].distanceToSquared(q) < 1.6;
        if (!dup) out.push(q.clone());
      }
    for (const q of at) out.push(q);
    // `rows`: keep only these rows counted from the stage (1 = nearest), e.g. pillar capitals
    const rows = p.rows;
    if (Array.isArray(rows) && rows.length && out.length > 1) {
      const zs: number[] = [];
      for (const q of [...out].sort((a, b) => a.z - b.z)) if (!zs.length || q.z - zs[zs.length - 1] > 3) zs.push(q.z);
      const keep = out.filter((q) => {
        let r = 0;
        while (r + 1 < zs.length && q.z - zs[r + 1] > -3) r++;
        return rows.includes(r + 1);
      });
      if (keep.length) out = keep;
    }
    // `corners` / `split`: every unit becomes a pair beside the anchor
    const corners = bool(p.corners, false);
    const split = num(p.split, 0, 0, 30);
    if (corners || split > 0) {
      const top = cue.targets.includes('pillars_top') || p.at === 'pillars_top';
      const base = cue.targets.includes('pillars_base') || p.at === 'pillars_base';
      const pairs: THREE.Vector3[] = [];
      for (const q of out) {
        if (corners && top) {
          // the two capital corners that face the aisle, just below the crystal lantern
          const zf = q.z + CAPITAL_HALF * (q.z > 0 ? 1 : -1);
          pairs.push(new THREE.Vector3(q.x - CAPITAL_HALF, q.y - CAPITAL_DROP, zf), new THREE.Vector3(q.x + CAPITAL_HALF, q.y - CAPITAL_DROP, zf));
        } else if (corners && base) {
          const zf = q.z + PLINTH_HALF;
          pairs.push(new THREE.Vector3(q.x - PLINTH_HALF, q.y, zf), new THREE.Vector3(q.x + PLINTH_HALF, q.y, zf));
        } else {
          const h = (split > 0 ? split : 2) * 0.5;
          pairs.push(new THREE.Vector3(q.x - h, q.y, q.z), new THREE.Vector3(q.x + h, q.y, q.z));
        }
      }
      out = pairs;
    }
    const off = vec3(p.offset);
    if (off) for (const q of out) q.add(off);
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
   *  - firewall on `wing_left`/`wing_right`: the burning wings ON the wing surface (placement
   *    wingSurface, from the stage's `wing_spars` anchor): a 2 m grid over the upper membranes and
   *    fingers — tongues along the scalloped top edges and at the finger ends, a low burning skin
   *    below them (down to ~60 % of the wing for H >= 6, only the top band for H 3.5) — a roll-over
   *    fireball at each finger end, and one light per wing sized by its burning area (wingLight).
   *  - tall rows (H >= 14, or `billow: true`): the mass eruption — rolling fireballs, see billowWall.
   *  - `fan: n`: n heads per unit spread over `fanSpread` degrees (V / fan flame units).
   *  - coloured (non-hydrocarbon) flames keep their hue: no white-hot core, less soot.
   */
  private flames(cue: Cue, out: EmitterSet, wall: boolean): void {
    const p = cue.p;
    const H = num(p.height, wall ? 6 : 8, 0.5, 40);
    if (!wall && bool(p.fireball, false)) {
      this.fireballs(cue, out, H);
      return;
    }
    const wing = wall && cue.targets.length > 0 && cue.targets.every((t) => t === 'wing_left' || t === 'wing_right');
    let pts = this.points(cue, 'deck_front');
    let tops: THREE.Vector3[] = [];
    // burning wings ON the wing surface (fingers + membranes, the upper part of every wing), from the
    // stage's `wing_spars` anchor; without it the older spar-chain geometry
    let surf: WingSurface | null = null;
    if (wing) {
      // (the band reaches further down the membranes the bigger the fire: a 3.5 m burst burns along
      // the top edges and the upper spars, a 6-7 m burst engulfs the upper ~60 % of the wing)
      surf = wingSurface(this.app.anchors.get('wing_spars' as AnchorName), WING_SPACING, 0.73 - 0.31 * smooth01(3.5, 6, H));
      if (surf) {
        // one wing only when the cue targets one
        const L = cue.targets.includes('wing_left');
        const Rt = cue.targets.includes('wing_right');
        if (!(L && Rt)) surf = keepWing(surf, L ? -1 : 1);
        ({ points: pts, tops } = surf);
      } else ({ points: pts, tops } = wingFire(pts, this.app.anchors.get('wing_tips'), 1.8));
    } else if (wall) pts = densify(pts, 3.2);
    const color = this.flameColor(p.color);
    const warm = this.warm;
    const pattern = str(p.pattern, 'all');
    const stagger = num(p.stagger, pattern === 'all' ? 0 : 0.06, 0, 2);
    const inten = num(p.intensity, 1, 0, 3);
    // the mass eruption: a row of tall units rolls into billowing fireballs instead of jets
    if (!wing && bool(p.billow, H >= 14 && pts.length > 8)) {
      this.billowWall(cue, out, pts, H, color, inten, pattern, stagger, bool(p.blowout, false), num(p.width, 1, 0.3, 4));
      return;
    }
    const angle = num(p.angle, 0, -80, 80);
    const fan = Math.round(num(p.fan, 1, 1, 7));
    const fanSpread = num(p.fanSpread, 50, 0, 160);
    const steps = patternSteps(pts, pattern, cue.seed, cue.step);
    const dur = Math.max(0.12, cue.dur);
    // power flames are stand-alone units (torches, towers); a tall cue on a long row stays a row of jets
    const big = !wing && H >= 12 && pts.length <= 8;
    // geometry of one column: start radius, radius growth (m) and width override
    const wK = num(p.width, 1, 0.3, 4);
    const r0 = (wing ? 0.8 : big ? 0.75 + 0.055 * H : 0.28 + 0.03 * H) * wK;
    // coloured (cold-fire / lit-plume) columns billow a little wider than a hydrocarbon jet
    const rG = (wing ? 0.39 * H : big ? 0.25 * H : 0.13 * H) * wK * (warm ? 1 : 1.35);
    const life = (wing ? 0.75 : 0.5) + (big ? 0.055 : 0.05) * H;
    const k = wing ? 2.0 : 2.4;
    const buoy = 7.5;
    const vT = buoy / k;
    const tr = life * 0.75;
    const v0 = vT + (((wing ? 0.45 : 0.93) * H - vT * tr) * k) / (1 - Math.exp(-k * tr));
    const rate = wing ? 24 : big ? 52 : 38;
    // fan heads share the unit's fuel a little (a 3-head fan is not three full projectors)
    const count = this.pc((rate * life) / Math.sqrt(fan), 8);
    // hydrocarbon flames end in soot; coloured (additive-salt / lit CO2) plumes barely smoke
    // (the soot takes over late: at night the fireball stays bright to its top, black smoke is only a cap)
    const soot = warm ? (wing ? 0.7 : big ? 0.5 : 0.55) : 0.08;
    const sootStart = wing ? 0.45 : big ? 0.62 : 0.58;
    let maxDelay = 0;
    let n = 0;
    for (let u = 0; u < pts.length; u++) {
      if (steps[u] < 0) continue;
      const pos = pts[u];
      const hj = wall ? 0.85 + 0.3 * hashF(cue.seed, u, 3) : 0.94 + 0.12 * hashF(cue.seed, u, 3);
      const t0 = cue.t + steps[u] * stagger;
      maxDelay = Math.max(maxDelay, steps[u] * stagger);
      const seed = this.sub(cue, u * 8);
      // a burning wing SURFACE (wingSurface): along the scalloped top edges and at the finger ends
      // (level 1) a row of narrow tongues licking up (v788.5: discrete jets ~2 m apart; v413.9, v713.5),
      // below them (level < 1) a low burning skin on the membrane, each cell a short, small flame, so
      // the grid reads as one sheet of fire with the wing's structure still showing through
      let lifeU = life,
        v0U = v0,
        r0U = r0,
        rGU = rG,
        countU = count,
        briU = (warm ? (wing ? 5 : 8) : 6) * inten,
        spreadU = wing ? 0.42 : big ? 0.38 : 0.075,
        stretchU = wing ? 0.02 : big ? 0.04 : 0.075;
      const edge = surf !== null && surf.level[u] > 0.99;
      if (surf) {
        const lv = surf.level[u];
        const J = edge ? WING_EDGE : WING_SKIN;
        lifeU = J.life + J.lifeH * H;
        const trU = lifeU * 0.75;
        v0U = Math.max(0.8, vT + ((H * J.rise + J.riseM - vT * trU) * k) / (1 - Math.exp(-k * trU)));
        r0U = J.r0 * wK;
        rGU = H * J.grow * wK * (warm ? 1 : 1.35);
        countU = this.pc(J.rate * lifeU, 6);
        briU = (warm ? J.bright : J.bright * 1.2) * (edge ? 1 : 0.6 + 0.4 * lv) * inten;
        spreadU = J.spread;
        stretchU = J.stretch;
      }
      for (let h = 0; h < fan; h++) {
        const a = fan > 1 ? angle + fanSpread * (h / (fan - 1) - 0.5) : angle;
        const d = tiltedUp(pos.x, a, this.v1);
        // the column: fast narrow tongue near the nozzle (stretched along its velocity), fireball on top
        // (a surface unit is born over its grid cell, so the cells merge into one burning skin
        // instead of a lattice of bright nozzles)
        const em = new Emitter(surf && !edge ? DIST.BOX : DIST.CONE, F.RAMP);
        if (surf && !edge) em.axis(WING_SPACING * 1.1, WING_SPACING * 0.9, 0.4);
        out.add(
          em
            .on(L_FIRE)
            .originV(pos)
            .time(t0)
            .dirV(d, spreadU)
            .speed(v0U * hj * 0.86, v0U * hj * 1.06)
            .physics(k, buoy)
            // (the wing units overlap ~4x along the spars: less each, so the mass stays orange-yellow)
            .color(color, briU)
            .color2(SOOT, warm)
            .life(lifeU * 0.8, lifeU * 1.05)
            .emit(countU, dur)
            .size(r0U, rGU * hj)
            .trail(wing ? 0.7 : 0.9, surf ? WING_NOISE : 0.55 + 0.02 * H) // TRAIL = size exponent, GLITTER = noise scale
            .seed(seed + h * 0x3571)
            .set(R.X1, 1.5)
            .set(R.X2, surf ? WING_ERODE : 0.95)
            .set(R.X3, 0.06)
            // (a burning skin: ragged tongues that stay flame to their tips, only a little soot on top)
            .set(R.Y0, surf ? soot * WING_SOOT : soot)
            .set(R.Y1, surf ? WING_SOOT_START : sootStart)
            .set(R.Y3, 0.6)
            .set(R.Z2, stretchU)
            .set(R.Z3, PUFF.FLAME)
            .window(t0, t0 + dur + lifeU * 1.1),
        );
      }
      const d = tiltedUp(pos.x, angle, this.v1);
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
            .size(r0 * 0.9 * (fan > 1 ? 1.4 : 1), 0.3)
            .trail(1, 1)
            .seed(seed ^ 0x55)
            .set(R.X0, 0.2)
            .set(R.Z3, PUFF.GLOW)
            .window(t0, t0 + dur + 0.15),
        );
      // a soft local glow of the fire (close-ups); the haze, smoke and floor are lit by the light
      // field, so this stays small and only on every third unit of long rows
      if (!wing && (pts.length < 10 || u % 3 === 0))
        out.add(
          new Emitter(DIST.SINGLE, F.RAMP)
            .on(L_FIRE)
            .origin(pos.x + d.x * H * 0.45, pos.y + d.y * H * 0.45, pos.z)
            .time(t0)
            .dirV(d)
            .speed(0.4)
            .physics(1, 0)
            .color(color, 0.12 * inten)
            .life(0.35, 0.45)
            .emit(2, dur)
            .size(0.18 * H + 0.8 + rG * 0.2, 0.08 * H)
            .trail(1, 1)
            .seed(seed ^ 0x66)
            .set(R.X3, 0.12)
            .set(R.Z3, PUFF.GLOW)
            .window(t0, t0 + dur + 0.5),
        );
      n++;
    }
    if (n > 0) {
      // roll-over fireballs where the fire reaches the wing tips (at the tips, not a flame length above
      // them: v101, v713.5, v729.25 the fire licks along the wing outline and stays on the wings)
      // (on the surface wings the band light below carries the light: the balls only add a little)
      if (wing) tops.forEach((tp, i) => this.fireball(out, this.sub(cue, 7000 + i), tp.x + Math.sign(tp.x) * 1.5, tp.y + H * 0.2, tp.z, cue.t + 0.12 + 0.05 * i, 0.5 * H, color, 1, 0.2, 0, true, surf ? WING_BALL_LIGHT : 1));
      // a big power flame rolls into a fireball at its top when it cuts
      if (big) {
        for (let u = 0; u < pts.length; u++)
          if (steps[u] >= 0) this.fireball(out, this.sub(cue, u * 8 + 3), pts[u].x, pts[u].y + H * 0.9, pts[u].z, cue.t + steps[u] * stagger + dur - 0.1, 0.2 * H * wK, color, inten * 0.8, 0.3);
      }
      // smoke of the row (per stretch), thin and quick to clear; lit by the fire only while it burns
      if (warm) this.rowSmoke(out, cue, pts, steps, H * 0.8, H, color, 2.0, (wing ? 0.16 : 0.1) * inten, (1 + dur) * Math.min(n, 30), cue.t + 0.25, dur + maxDelay, 3.2, 5, 0.35, 0.9, 1, cue.t + maxDelay + dur + 0.2);
      // spatial light: the fire lights its smoke, the haze and the floor in front of it
      const lc = warm ? FIRE_LIGHT : color;
      const per = (wing ? 0.22 : 0.5) * Math.pow(H / 8, 0.8) * inten * (warm ? 1 : 0.8) * Math.sqrt(fan);
      if (surf) this.wingLight(out, cue, surf, H, dur + maxDelay, lc, inten * (warm ? 1 : 0.8));
      // (a burning wing: short, close lights along its spars, so the glow follows the wing shape
      // instead of one dome over the whole wing)
      else this.rowLight(out, cue, pts, steps, stagger, dur, 0.3, H * 0.45, lc, per, 0.45 * H + (wing ? 2.5 : 6), wing ? 14 : 40);
      this.rowFlash(out, pts, steps, H * 0.5, {
        kind: 1,
        t0: cue.t,
        t1: cue.t + maxDelay + dur + 0.35,
        color,
        peak: Math.min(2.2, 0.05 * n * (H / 8) + 0.25) * inten * (warm ? 1 : 0.7),
        decay: 0.35,
        strobe: 0,
      });
    }
  }

  /**
   * The mass flame eruption (video 1508.4): every ~6 m along the row a projector throws rolling
   * fireballs that billow 20–35 m high over the whole burn — round, turbulent, orange-yellow with
   * a white-hot root, smoke rolling off the tops — instead of a flat curtain of clipped jets. The
   * light of the wall lights the site (FxLights), so no halo sprites are needed.
   * `blowout`: the finale version adds a spark wall, a row of fireballs at the cut and more flash.
   * `width` (bulk B = sqrt(width)): bigger, taller, brighter and less opaque balls rolling out over
   * the field — at `width` 3 the balls merge into one blinding fire cloud (v1508.4-1509.7).
   */
  private billowWall(cue: Cue, out: EmitterSet, all: THREE.Vector3[], H: number, color: THREE.Color, inten: number, pattern: string, stagger: number, blowout: boolean, width: number): void {
    const warm = this.warm;
    // `width` (x column width) makes the balls bulkier: at `width` 3 (the v1508.4 eruption) the
    // neighbouring balls merge into one rolling fire cloud over the whole front, ~1.4 x H high
    const B = Math.min(1.8, Math.max(0.7, Math.sqrt(width)));
    // every ~6 m: a billowing ball needs room to roll; closer projectors only add overdraw
    const spacing = Math.max(4.5, Math.min(8, 0.22 * H));
    const pts: THREE.Vector3[] = [];
    const sorted = [...all].sort((a, b) => uCoord(a) - uCoord(b) || a.z - b.z);
    let last: THREE.Vector3 | null = null;
    for (const q of sorted) {
      if (last && q.distanceTo(last) < spacing) continue;
      pts.push(q);
      last = q;
    }
    const steps = patternSteps(pts, pattern, cue.seed, cue.step);
    const dur = Math.max(0.3, cue.dur);
    const n = steps.filter((s) => s >= 0).length;
    const Hh = H * (0.8 + 0.2 * Math.min(1, dur / 1.2));
    // billow puffs: shot up at the projector's speed (the wall stands at full height ~0.4 s after
    // ignition, as in the video), then decelerating into a buoyant, rolling cloud at the top
    const k = 3;
    const buoy = 9;
    const life = 1.5 + 0.035 * Hh;
    const tr = 0.45;
    const vT = buoy / k;
    const v0 = vT + (((0.78 + 0.35 * (B - 1)) * Hh - vT * tr) * k) / (1 - Math.exp(-k * tr));
    const rate = 30;
    const count = this.pc(rate * life * Math.min(1, Math.sqrt(26 / Math.max(1, n))), 10);
    let maxDelay = 0;
    for (let u = 0; u < pts.length; u++) {
      if (steps[u] < 0) continue;
      const pos = pts[u];
      const t0 = cue.t + steps[u] * stagger;
      maxDelay = Math.max(maxDelay, steps[u] * stagger);
      const seed = this.sub(cue, u * 8);
      const hj = 0.8 + 0.4 * hashF(cue.seed, u, 5);
      // rolling fireballs: wide cone, big round puffs (no velocity stretch), strong turbulence
      out.add(
        new Emitter(DIST.CONE, F.RAMP)
          .on(L_FIRE)
          .origin(pos.x, pos.y + 0.5, pos.z)
          .time(t0)
          // (a bulky wall also rolls out over the field towards the audience)
          .dir(0, 1, 0.05 + 0.2 * (B - 1), 0.3 + 0.1 * (B - 1))
          .speed(v0 * hj * 0.55, v0 * hj * 1.05)
          .physics(k, buoy)
          .color(color, (warm ? 6.5 : 4.5) * inten * (1 + 0.6 * (B - 1)))
          .color2(SOOT, warm)
          .life(life * 0.75, life)
          .emit(count, dur)
          .size((1.4 + 0.04 * H) * B, 0.3 * Hh * hj * B)
          .trail(0.45, 0.32)
          .seed(seed)
          .set(R.X1, 1.1)
          .set(R.X2, 1.25)
          .set(R.X3, 0.1)
          .set(R.Y0, warm ? 0.55 / B : 0.08)
          .set(R.Y1, 0.55)
          .set(R.Y3, 0.8)
          // (the bulky eruption is one blinding mass: its balls sum up instead of occluding)
          .set(R.Z1, 0.5 / (B * B))
          .set(R.Z2, 0.012)
          .set(R.Z3, PUFF.FLAME)
          .window(t0, t0 + dur + life * 1.05),
      );
      // the white-hot roots at the nozzles (bright, low, fast)
      out.add(
        new Emitter(DIST.CONE, F.RAMP)
          .on(L_FIRE)
          .originV(pos)
          .time(t0)
          .dir(0, 1, 0, 0.12)
          .speed(v0 * 0.5, v0 * 0.65)
          .physics(3.2, buoy)
          // (hidden in the mass of a bulky wall: no row of separate jets)
          .color(color, ((warm ? 7 : 5) * inten) / B)
          .color2(SOOT, warm)
          .life(0.32, 0.42)
          .emit(this.pc(28, 8), dur)
          .size(0.7 + 0.02 * H, 0.1 * H)
          .trail(0.8, 0.5)
          .seed(seed ^ 0x2b)
          .set(R.X1, 1.4)
          .set(R.X2, 0.9)
          .set(R.X3, 0.05)
          .set(R.Y0, 0.1)
          .set(R.Y1, 0.8)
          .set(R.Y3, 0.5)
          .set(R.Z2, 0.05)
          .set(R.Z3, PUFF.FLAME)
          .window(t0, t0 + dur + 0.5),
      );
      if (blowout && u % 2 === 0) {
        // spark wall: a white-gold spray between the fire columns
        const vs = speedForHeight(H * 0.9, 1.05);
        const tA = apexTime(vs, 1.05);
        out.add(
          new Emitter(DIST.CONE, F.COOL | F.FLICKER | F.RAMP)
            .on(L_SPARK)
            .origin(pos.x, pos.y + 0.3, pos.z + 0.5)
            .time(t0)
            .dir(0, 1, 0.08, 0.2)
            .speed(vs * 0.7, vs)
            .physics(1.05, -9.81)
            .color(PALE_GOLD, 14 * inten)
            .color2(DEEP_ORANGE, -1)
            .life(tA * 0.8, tA * 1.7)
            .emit(this.pc(420 * tA, 40), dur)
            .size(0.05, 0.45)
            .trail(0.12, 0.3)
            .seed(seed ^ 0x5a)
            .set(R.X3, 0.15)
            .set(R.Y0, 0.85)
            .set(R.Y3, 0.3)
            .set(R.Z0, 0.02)
            .window(t0, t0 + dur + tA * 1.8),
        );
      }
    }
    if (!n) return;
    // the cut of a blowout: a row of fireballs where the columns stop. A plain wall just burns out
    // when its valves close (v1509.6-1510.0: nothing rolls on after the 28 m wall)
    for (let u = 0; blowout && u < pts.length; u++) {
      if (steps[u] < 0) continue;
      const q = pts[u];
      this.fireball(out, this.sub(cue, 9100 + u), q.x, q.y + Hh * 0.75, q.z, cue.t + steps[u] * stagger + dur - 0.15, 0.2 * Hh, color, inten * 0.6, 0.35, 0.45, u % 6 === 1, 0.4);
    }
    // the smoke the eruption leaves: a thick bank rolling off the tops, lit by the fire while it burns
    this.rowSmoke(out, cue, pts, steps, Hh * 0.85, Hh * 1.3, color, 4, 0.34 * inten, (3 + dur * 3) * Math.min(n, 30), cue.t + 0.25, dur + maxDelay, 5, 8, 0.5, 1.6, cue.t + maxDelay + dur + 0.3);
    const lc = warm ? FIRE_LIGHT : color;
    // (the light collapses with the flames when the valves close, see the puff shader's burn-out)
    this.rowLight(out, cue, pts, steps, stagger, dur, blowout ? 0.45 : 0.25, Hh * 0.45, lc, 1.1 * Math.pow(Hh / 20, 0.7) * inten * (blowout ? 1.4 : 1), 0.4 * Hh + 10);
    const fTail = blowout ? 0.45 : 0.25;
    this.rowFlash(out, pts, steps, Hh * 0.5, { kind: 1, t0: cue.t, t1: cue.t + maxDelay + dur + fTail, color, peak: Math.min(blowout ? 3.2 : 2.6, 0.1 * n + 0.6) * inten * (warm ? 1 : 0.7), decay: fTail, strobe: 0 });
  }

  /**
   * One rolling fireball: a cloud of flame puffs born over ~0.3 s around (x,y,z) that expand to
   * `R` metres, rise on their own heat and roll into a dark soot cap.
   */
  private fireball(out: EmitterSet, seed: number, x: number, y: number, z: number, t0: number, R0: number, color: THREE.Color, inten: number, soot: number, opac = 0, flash = true, light = 1, lifeK = 1): void {
    const life = (1.1 + 0.06 * R0) * lifeK;
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
        .set(R.Z1, opac)
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
          .litUntil(t0 + life)
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
    if (flash)
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
          .size(Math.min(R0 * 1.6, 14), R0 * 0.6)
          .trail(0.6, 1)
          .seed(seed ^ 0x77)
          .set(R.X0, 0.35)
          .set(R.Z3, PUFF.FLASH)
          .window(t0, t0 + 0.75),
      );
    this.v1.set(x, y, z);
    if (light > 0) this.pointLight(out, 1, t0, t0 + life * 0.9, life * 0.5, this.v1, this.warm ? FIRE_LIGHT : color, 1.8 * light * inten * Math.sqrt(R0 / 5), R0 * 2 + 6);
  }

  /** `fireball: true` flames: a short lift jet, then an 8–10 m fireball with a dark smoke cap */
  private fireballs(cue: Cue, out: EmitterSet, H: number): void {
    const p = cue.p;
    const pts = this.points(cue, 'corner_fireballs');
    const color = this.flameColor(p.color);
    const rawSize = num(p.size, 1, 0.3, 60);
    // visual ball radius ~1.4 x R0: 8 m flame -> ~9–10 m fireball; a size above 3.5 is read as the
    // visual radius in metres (authors write "size": 14 for a 14 m ball)
    const size = rawSize > 3.5 ? Math.min(3, Math.max(0.3, rawSize / (1.4 * (2.2 + 0.14 * H)))) : rawSize;
    const R0 = (2.2 + 0.14 * H) * size;
    // a row of many balls (the mass eruption): each a little dimmer and optically thick, so the row
    // billows with visible structure instead of summing into one clipped band
    const nB = pts.length;
    const dense = nB > 6;
    const inten = num(p.intensity, 1, 0, 3) * (dense ? Math.max(0.42, Math.sqrt(6 / nB)) : 1);
    const flashEvery = dense ? Math.ceil(nB / 6) : 1;
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
      // (a dense row is part of a mass eruption that is gone as one: v1509.75, 1.4 s after ignition)
      this.fireball(out, seed ^ 0x3c3c, pos.x, pos.y + H * 0.75, pos.z, cue.t + (dense ? 0.06 + 0.12 * hashF(cue.seed, u, 9) : 0.18), R0, color, inten, 0.15, dense ? 0.45 : 0, u % flashEvery === 0, dense ? 0.5 : 1, dense ? 0.72 : 1);
    });
    // (per group of balls: fireballs on both corners flash both corners, not the field between them)
    if (pts.length) this.groupFlash(out, pts, 30, H, { kind: 1, t0: cue.t, t1: cue.t + 1.6, color, peak: Math.min(2.4, 0.9 * pts.length * size * inten), decay: 0.8, strobe: 0 });
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
        .litUntil(cue.t + dur + 0.3)
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
    const tip = mouth.clone().addScaledVector(dir, len * 0.75);
    this.pointLight(out, 1, cue.t, cue.t + dur + 0.4, 0.4, mouth, this.warm ? FIRE_LIGHT : color, 2.4, 10, tip);
    out.flashes.push({ kind: 1, t0: cue.t, t1: cue.t + dur + 0.4, color: color.clone(), peak: 1.6, decay: 0.4, pos: mouth.clone().add(new THREE.Vector3(0, 2, len * 0.4)), strobe: 0 });
  }

  // ---------------------------------------------------------------- CO2

  /**
   * CO2 jets. `count` + `radius`: several jets around each anchor (the multi-unit rig around the
   * piano tower); `cloud: true`: the plumes merge into one big coloured cloud over the set that
   * glows in `color` for ~1 s (the green cloud of v767.25), instead of separate white plumes.
   */
  private jets(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const base = this.points(cue, 'deck_front');
    const H = num(p.height, 8, 1, 25);
    const color = fxColor(p.color, this.palette, this.c1, 'white');
    const pattern = str(p.pattern, 'all');
    const stagger = num(p.stagger, pattern === 'all' ? 0 : 0.05, 0, 2);
    const angle = num(p.angle, 0, -80, 80);
    const count = Math.round(num(p.count, 1, 1, 12));
    const radius = num(p.radius, 2.5, 0, 20);
    const cloud = bool(p.cloud, false);
    // a ring of jets around every anchor, each leaning a little outward
    const pts: THREE.Vector3[] = [];
    const lean: number[] = [];
    for (const q of base) {
      if (count <= 1) {
        pts.push(q);
        lean.push(0);
        continue;
      }
      for (let j = 0; j < count; j++) {
        const a = (j / count) * Math.PI * 2 + 0.3;
        pts.push(new THREE.Vector3(q.x + Math.cos(a) * radius, q.y, q.z + Math.sin(a) * radius));
        lean.push(a);
      }
    }
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
      if (count > 1) {
        // multi-unit rigs splay a little outward
        d.x += Math.cos(lean[u]) * 0.12;
        d.z += Math.sin(lean[u]) * 0.12;
        d.normalize();
      }
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
          .emit(this.pc((34 * life) / Math.sqrt(count), 10), dur)
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
    if (cloud && pts.length) {
      // one merged cloud over the rig: big, soft, dense CO2 puffs glowing in the cue colour
      const mn = new THREE.Vector3(Infinity, Infinity, Infinity);
      const mx = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
      for (const q of pts) {
        mn.min(q);
        mx.max(q);
      }
      const c = mn.clone().add(mx).multiplyScalar(0.5);
      const ext = mx.sub(mn);
      // one cloud over the middle of the rig (the plumes meet there), not a thin layer over its width
      const wx = Math.min(ext.x * 0.45, 3 * H) + H * 0.6;
      const n = this.pc(34 + 1.5 * Math.min(40, pts.length), 14);
      out.add(
        new Emitter(DIST.BOX, 0)
          .on(L_SMOKE)
          .origin(c.x, c.y + H * 0.7, c.z)
          .axis(wx, H * 0.5, Math.min(ext.z, 2 * H) + H * 0.4)
          .time(cue.t + 0.08)
          .dir(0.3, 1, 0.05, 0.9)
          .speed(1.5, 4)
          .physics(1.2, 0.8)
          .color(this.c2.copy(color).lerp(WHITE, 0.35), 0.6)
          .color2(this.c1.copy(color).multiplyScalar(1.2), 0)
          .life(1.8, 2.8)
          .emit(n, 0, Math.min(dur, 1.2) / n)
          .size(0.3 * H, 0.6 * H)
          .trail(0.5, 0.3)
          .seed(this.sub(cue, 7777))
          .set(R.X1, 0.3)
          .set(R.X2, 0.75)
          .set(R.Y0, 0.9)
          .set(R.Y2, 0.08)
          .set(R.Y3, 0.6)
          .set(R.Z0, 1.3)
          .set(R.Z3, PUFF.CO2)
          .window(cue.t, cue.t + Math.min(dur, 1.2) + 3.1),
      );
    }
  }

  // ---------------------------------------------------------------- spark fountains

  /**
   * Gerbs / sparkulars. Colour follows the spark chemistry: a pale author colour ("#FFB0E0" is what
   * the camera saw of a pink gerb) becomes the saturated star colour, and coloured sparks keep their
   * hue as they cool (only charcoal-gold sparks cool to deep orange) — pink, violet, magenta or
   * orange-red fountains read as such instead of white.
   */
  private fountains(cue: Cue, out: EmitterSet, cold: boolean): void {
    const p = cue.p;
    const pts = this.points(cue, 'deck_front');
    const H = num(p.height, cold ? 3.5 : 8, 0.5, 40);
    const pattern = str(p.pattern, 'all');
    const stagger = num(p.stagger, pattern === 'all' ? 0 : 0.05, 0, 2);
    const angle = num(p.angle, 0, -80, 80);
    // big gerbs (15–20 m wall units) throw a wider, fuller plume than a small stage gerb; but without an
    // authored `spread` the tall wall units (> 14 m) are straight spikes: the default cone narrows to
    // 0.4 x at 30 m, so a wall reads as a row of separate columns with the set between them (v1189-1197),
    // not one sheet. An authored `spread` is kept (the broad white-gold fan behind the dragon, v1510-1537)
    const tallK = cold ? 1 : 1 - 0.6 * smooth01(14, 30, H);
    const spread = (num(p.spread, cold ? 7 : Math.min(10, 4 + 0.28 * H) * tallK, 0, 60) * Math.PI) / 180;
    const steps = patternSteps(pts, pattern, cue.seed, cue.step);
    const dur = Math.max(0.3, cue.dur);
    const k = cold ? 1.9 : 1.05;
    // tall wall gerbs are straight spikes: the stars burn out while still rising, so the column
    // stops within ~1 s of the cut (the next colour takes over at once in the video); small stage
    // gerbs arc over and rain back down
    const tall = !cold && H > 14;
    const v0 = speedForHeight(H, k) * (tall ? 1.14 : 1);
    const tA = apexTime(v0, k);
    const life0 = tall ? tA * 0.5 : tA * 0.75;
    const lifeMax = cold ? tA * 1.5 : tA * (tall ? 0.78 : 1.75);
    const rate = cold ? 320 : 280 + 14 * H;
    // long walls (the finale U: ~60 fountains) thin out per unit so the wall stays inside the spark
    // budget without the layer scaling every other fountain down
    let nFire = 0;
    for (let u = 0; u < steps.length; u++) if (steps[u] >= 0) nFire++;
    const count = this.pc(rate * lifeMax * Math.min(1, Math.sqrt(28 / Math.max(1, nFire))), 40);
    const intenP = num(p.intensity, 1, 0, 3);
    // `column`: a dense column keeps its full light when its sparks are smaller than a pixel (a far
    // drone camera), see columnLaw
    const column = !cold && bool(p.column, false);
    const smoke = Math.min(3, typeof p.smoke === 'number' ? p.smoke : bool(p.smoke, false) ? 1 : 0);
    // colour sequence over the burn (`colors` + `changes`), else one colour
    const list = colorSpecs(p.colors);
    const specs: unknown[] = list.length ? list : [p.color];
    const nC = specs.length;
    const changes = numList(p.changes);
    const winT: number[] = [0];
    for (let i = 1; i < nC; i++) winT.push(Math.min(dur, Math.max(winT[i - 1] + 0.05, changes[i - 1] ?? (dur * i) / nC)));
    winT.push(dur);
    let n = 0;
    let maxDelay = 0;
    const firstCol = new THREE.Color();
    // resolved colours of the sequence + their brightness (saturated sparks are dimmer, see hueK)
    const cols: THREE.Color[] = [];
    const hueKs: number[] = [];
    for (let ci = 0; ci < nC; ci++) {
      const c = sparkChroma(fxColor(specs[ci], this.palette, this.c1, cold ? 'warm' : 'gold'), new THREE.Color());
      const sat = saturation(c);
      cols.push(c);
      hueKs.push(sat < 0.22 || isGoldish(c) ? 1 : 0.62);
    }
    for (let ci = 0; ci < nC; ci++) {
      const w0 = winT[ci];
      const wd = Math.max(0.05, winT[ci + 1] - w0);
      const col = cols[ci];
      if (ci === 0) firstCol.copy(col);
      const sat = saturation(col);
      const white = sat < 0.22;
      const gold = !white && isGoldish(col);
      // the sparks of this window still in the air switch to the next colour with the column
      const next = ci + 1 < nC ? this.c2.copy(cols[ci + 1]).multiplyScalar(hueKs[ci + 1] / hueKs[ci]).clone() : null;
      // what the sparks cool to: charcoal gold -> deep orange, white (titanium) -> pale gold,
      // metal-salt colours -> a darker version of their own hue
      const coolTo = white ? PALE_GOLD.clone() : gold ? DEEP_ORANGE.clone() : col.clone().multiplyScalar(0.55);
      // saturated sparks at gold's HDR level would clip to white in the tone mapper
      const hueK = white || gold ? 1 : 0.62;
      const inten = intenP * (cold ? 11 : 17) * hueK;
      const hotMix = white ? 0.6 : gold ? 0.45 : 0.18;
      // white / silver sparks of a shorter tall wall: thin, loose streaks (v1441 from the drone, v1446
      // close up), not dense sheets: fewer sparks, each as bright (not a wall authored brighter than
      // normal: the white pillar fans of v1565.5 stay dense)
      const thin = white && tall && intenP < 1.3 ? 1 - SILVER_THIN * silverDim(H) : 1;
      for (let u = 0; u < pts.length; u++) {
        if (steps[u] < 0) continue;
        const pos = pts[u];
        const t0 = cue.t + steps[u] * stagger + w0;
        if (ci === 0) maxDelay = Math.max(maxDelay, steps[u] * stagger);
        const d = tiltedUp(pos.x, angle, this.v1);
        const seed = this.sub(cue, u * 4 + ci * 997);
        // continuing colour windows start "hot" (no fade-in ramp): the fountain never stops
        const rampF = ci === 0 ? F.RAMP : 0;
        const sp = new Emitter(DIST.CONE, F.COOL | F.FLICKER | rampF | (next ? F.ABSCHANGE : 0) | (column ? F_COLUMN : 0));
        if (next) sp.color2(next, 0).set(R.Z3, t0 + wd);
        else sp.color2(coolTo, -1);
        out.add(
          sp
            .on(L_SPARK)
            .originV(pos)
            .time(t0)
            .dirV(d, spread)
            .speed(v0 * 0.72, v0 * 1.02)
            .physics(k, -9.81)
            .color(col, inten)
            .life(life0, lifeMax)
            .emit(Math.max(10, Math.round((count * thin * Math.min(1, wd / dur + 0.35)) / Math.max(1, Math.sqrt(nC)))), wd)
            .size(cold ? 0.03 : 0.05, 0.45)
            .trail(cold ? 0.06 : 0.12, cold ? 0.55 : 0.3)
            .seed(seed)
            // (a tall wall stands at once: its first sparks are not faded in, v1565.4)
            .set(R.X3, tall ? 0.06 : 0.18)
            .set(R.Y0, 0.85)
            .set(R.Y3, 0.3)
            .set(R.Z0, 0.02)
            .window(t0, t0 + wd + lifeMax),
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
            .color(this.c2.copy(col).lerp(WHITE, hotMix), (cold ? 4 : 7) * (white || gold ? 1 : 0.8))
            .life(0.09, 0.12)
            .emit(3, wd)
            .size(cold ? 0.35 : 0.55, 0.3)
            .trail(1, 1)
            .seed(seed ^ 5)
            .set(R.X3, 0.15)
            .set(R.Z3, PUFF.GLOW)
            .window(t0, t0 + wd + 0.15),
        );
        // dense jet in the lower part of the column (the sparks are too close to resolve): white-hot
        // for gold / titanium, the star colour itself for metal-salt fountains
        out.add(
          new Emitter(DIST.CONE, F.RAMP)
            .on(L_FIRE)
            .originV(pos)
            .time(t0)
            .dirV(d, spread * 0.5)
            .speed(v0 * 0.55, v0 * 0.8)
            .physics(k, -9.81)
            .color(this.c2.copy(col).lerp(WHITE, hotMix * 0.75), (cold ? 1.6 : 2.6) * (white || gold ? 1 : 1.15))
            .life(0.22, 0.3)
            .emit(this.pc(cold ? 14 : 20, 6), wd)
            .size(cold ? 0.14 : 0.2 + 0.012 * H, 0.1)
            .trail(1, 1)
            .seed(seed ^ 6)
            .set(R.X3, 0.15)
            .set(R.Z2, 0.05)
            .set(R.Z3, PUFF.GLOW)
            .window(t0, t0 + wd + 0.35),
        );
        if (smoke > 0 && ci === 0) {
          // a smoke column per unit (obelisk capitals), lit in the fountain's colour while it burns
          const ns = Math.max(3, Math.round(6 * smoke * Math.min(1, this.quality.particleScale * 1.6) * Math.max(1, dur)));
          out.add(
            new Emitter(DIST.CONE, F.SELFLIT)
              .on(L_SMOKE)
              .origin(pos.x, pos.y + 1, pos.z)
              .time(t0)
              .dir(0, 1, 0, 0.22)
              .speed(6, 11)
              .physics(0.7, 1.4)
              .color(GREY, 0.3 * Math.min(1.5, smoke))
              .color2(this.c2.copy(col).multiplyScalar(3), 0)
              .litUntil(t0 + dur)
              .life(4, 7)
              .emit(ns, 0, dur / ns)
              .size(0.6, 0.18 * H + 3)
              .trail(0.45, 0.3)
              .seed(seed ^ 0x3131)
              .set(R.X0, dur * 0.8 + 0.4)
              .set(R.X1, 0.2)
              .set(R.X2, 0.8)
              .set(R.Y0, 0.6)
              .set(R.Y2, 0.08)
              .set(R.Y3, 1)
              .set(R.Z0, 1)
              .set(R.Z3, PUFF.SMOKE)
              .window(t0, t0 + dur + 7.5),
          );
        }
        if (ci === 0) n++;
      }
      // light of this colour window (a gold -> magenta -> orange burn relights the smoke each time)
      // (white / silver titanium sparks of the shorter walls: bright points, little light thrown
      // around — the air and the set around the 16-22 m silver walls of v1439-1446 stay pink from the
      // stage light, not lit white; the 30-34 m finale walls keep their full light, see silverDim)
      const per = (cold ? 0.05 : 0.2 * Math.pow(H / 10, 0.6)) * intenP * (white ? 1 - 0.6 * silverDim(H) : gold ? 1 : 0.85);
      this.rowLight(out, { ...cue, t: cue.t + w0 }, pts, steps, stagger, wd, 0.25, H * 0.4, col, per, 0.35 * H + 5);
    }
    if (n > 0) {
      // a burning gerb wall stands in a dense cloud of its own smoke, lit brightly in the fountain's
      // colour while it burns (v460.5 white wall, v558 pink fans, v600.4 gold-white wall, v1536 white
      // U): the light of the big moments is carried by that cloud
      if (!cold) {
        // The cloud is there at once for a high-intensity wall (`intensity` > 1.5: the glare walls
        // of v600.2) and builds up over ~3 s on a long burn of tall units (v1510-1537, v1522-1537:
        // 30-34 m, and ramping in from 2.5 s burns: the 3.6 s white wall of v1565.3-1568.8); a short
        // normal burst (v69, v1192) stays a row of clean fountains with a little smoke, and so does a
        // long wall of shorter units (the 20-22 m silver walls of v1437-1456 stand in the pink-lit air
        // of the stage, not in a white cloud of their own).
        const sI = Math.min(1, Math.max(0, (intenP - 1.5) / 1.5));
        const sL = 0.6 * smooth01(18, 30, H) * smooth01(2.5, 4, dur);
        const sC = Math.max(sI, sL);
        // (a trace of cloud, sC < 0.08: the 20-22 m silver walls, is left out: only glowing blobs at the nozzles, v1446)
        if (sC >= 0.08) this.burnCloud(out, cue, pts, steps, stagger, cue.t, dur, H, firstCol, 4.5 * Math.sqrt(sC) * (hueKs[0] < 1 ? 0.8 : 1), 0.17 * sC, sI >= sL ? 0.12 : 3);
        // silver / white (titanium) sparks of a shorter wall light their smoke far less than their
        // glare suggests: thinner, darker smoke, so the colour of the stage light on it reads (v1439.5)
        const wd = saturation(firstCol) < 0.22 ? silverDim(H) : 0;
        this.rowSmoke(out, cue, pts, steps, H * 0.35, H, firstCol, 1.4 * (1 - SILVER_SELF * wd) * Math.min(2, Math.max(1, intenP)), 0.14 - SILVER_OPAC * wd, (1 + dur * 0.8) * n, cue.t + 0.3, dur + maxDelay, 6, 9, 0.7, 0.9, 1, cue.t + maxDelay + dur + 0.2);
      }
      this.rowFlash(out, pts, steps, H * 0.5, {
        kind: 1,
        t0: cue.t,
        t1: cue.t + maxDelay + dur + 0.3,
        color: firstCol,
        peak: Math.min(1.6, (cold ? 0.012 : 0.03) * n * Math.sqrt(H / 8) + 0.1),
        decay: 0.4,
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
      this.pointLight(out, 1, cue.t, cue.t + dur + 0.6, 0.6, a.clone().setY(a.y - 3), color, 0.35 + 0.02 * len, 9, b.clone().setY(b.y - 3));
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
          .litUntil(cue.t + 0.5)
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
    });
    if (pts.length) {
      this.groupFlash(out, pts, 30, 2, { kind: 0, t0: cue.t, t1: cue.t + 1.2, color, peak: Math.min(3, 1.1 * size + 0.1 * pts.length), decay: 0.25, strobe: 0 });
      // spatial light per group of units (> 30 m apart = separate lights): a burst on both arm ends
      // lights the two ends, not the empty middle of the field between them
      for (const grp of clusters(pts, 30)) {
        const mn = new THREE.Vector3(Infinity, 0, Infinity);
        const mx = new THREE.Vector3(-Infinity, 0, -Infinity);
        let y = 0;
        for (const q of grp) {
          mn.min(q);
          mx.max(q);
          y += q.y;
        }
        mn.y = mx.y = y / grp.length + 2;
        this.pointLight(out, 0, cue.t, cue.t + 1.2, 0.3, mn, color, Math.min(8, 2.5 * size * Math.sqrt(grp.length)), 10 + 5 * sq, mx);
        if (size >= BLAST_SIZE) this.blastCloud(out, cue, grp, size, color);
      }
    }
  }

  /**
   * The cloud of a big mine / flash-pot burst (`size` >= 1.8): the charge throws a wall of white
   * smoke 30-60 m out over the deck and the field within ~0.2 s, lit from inside by the flash for
   * ~0.8 s (v1565.4-1566.2: the white bloom over the whole middle of the U; v600.25-600.75 the gold
   * clouds on the deck; v877 the frame full of gold-white smoke), then hanging as smoke lit by the
   * show. Its light is lit smoke (`haze` 1): the haze field fills with the burst colour around it.
   */
  private blastCloud(out: EmitterSet, cue: Cue, grp: THREE.Vector3[], size: number, color: THREE.Color): void {
    const mn = new THREE.Vector3(Infinity, Infinity, Infinity);
    const mx = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const q of grp) {
      mn.min(q);
      mx.max(q);
    }
    const c = mn.clone().add(mx).multiplyScalar(0.5);
    const k = smooth01(BLAST_SIZE, 3, size);
    const R0 = 6 + 6 * size;
    const n = this.pc(30 + 16 * size, 10);
    const glowEnd = cue.t + Math.max(0.3, cue.dur) + BLAST_GLOW;
    out.add(
      new Emitter(DIST.BOX, F.SELFLIT)
        .on(L_SMOKE)
        .origin(c.x, c.y + 1.5, c.z + 2)
        .axis(mx.x - mn.x + 4, 2, mx.z - mn.z + 4)
        .time(cue.t)
        // (a mine blows up and forward: over the deck front, out over the field)
        .dir(0, 1, 0.55, 1.1)
        .speed(8 * size, 20 * size)
        .physics(2.3, 1.2)
        .color(WHITE_SMOKE, 0.6 * (0.6 + 0.4 * k))
        .color2(this.c2.copy(color).lerp(WHITE, 0.3).multiplyScalar(BLAST_SELF * (0.5 + 0.5 * k)), 0)
        .litUntil(glowEnd)
        .life(3.5, 5.5)
        .emit(n, 0, 0.22 / n)
        .size(0.35 * R0, R0)
        .trail(0.35, 0.3)
        .seed(this.sub(cue, 6100 + Math.round(c.x)))
        .set(R.X0, BLAST_GLOW)
        .set(R.X1, 0.15)
        .set(R.X2, 0.8)
        .set(R.Y0, 0.7)
        .set(R.Y2, 0.03)
        .set(R.Y3, 1)
        .set(R.Z0, 1)
        .set(R.Z3, PUFF.SMOKE)
        .window(cue.t, cue.t + 6),
    );
    // the glowing cloud lights the air around it (a lit-smoke light, grown with the cloud)
    const a = new THREE.Vector3(mn.x - 4, c.y + 0.35 * R0, c.z + 0.25 * R0);
    const b = new THREE.Vector3(mx.x + 4, c.y + 0.35 * R0, c.z + 0.25 * R0);
    out.lights.push({
      kind: 1,
      t0: cue.t,
      t1: glowEnd,
      decay: BLAST_GLOW,
      strobe: 0,
      color: this.c2.copy(color).lerp(WHITE, 0.3).clone(),
      peak: BLAST_LIGHT * size * (0.5 + 0.5 * k),
      pos: c.clone(),
      a,
      b,
      radius: 0.8 * R0 + 4,
      haze: BLAST_HAZE,
    });
  }

  /**
   * Bengal flares: a blinding coloured flare with thick self-lit smoke that glows in its light.
   * With `path` it is a flare drone: the flare (or, `sparkler: true`, a white sparkler) flies the
   * waypoints over dur, leaving a lit smoke trail, and its light follows it over the smoke and field.
   */
  private bengal(cue: Cue, out: EmitterSet): void {
    const p = cue.p;
    const size = num(p.size, 1, 0.2, 5);
    const sparkler = bool(p.sparkler, false);
    const color = sparkler ? new THREE.Color(1, 0.93, 0.8) : fxColor(p.color, this.palette, this.c1, 'red').clone();
    const dur = Math.max(0.3, cue.dur);
    const paths = pathList(p.path);
    if (paths.length) {
      const mirror = bool(p.mirror, false);
      const times = numList(p.times);
      let k = 0;
      for (const path of paths) {
        this.flareDrone(cue, out, path, times, dur, color, size, sparkler, k++);
        if (mirror) this.flareDrone(cue, out, path.map((q) => new THREE.Vector3(-q.x, q.y, q.z)), times, dur, color, size, sparkler, k++);
      }
      return;
    }
    const pts = this.points(cue, 'wing_tips');
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
          .set(R.X3, Math.min(0.4, dur * 0.25))
          .set(R.Z3, PUFF.GLOW)
          .window(cue.t, cue.t + dur + 0.2),
      );
      const life = dur < 2 ? 7 : 11;
      // one-shot, staggered over the burn (a continuous emitter would release only dur / life of it)
      const nS0 = Math.max(6, Math.round(3.2 * life * Math.min(1, this.quality.particleScale * 1.5) * Math.min(1, 0.4 + dur / 3)));
      const nS = Math.max(4, Math.round(nS0 * Math.min(1, 0.2 + (1.5 * dur) / life)));
      out.add(
        new Emitter(DIST.CONE, F.SELFLIT)
          .on(L_SMOKE)
          .origin(pos.x, pos.y + 1, pos.z)
          .time(cue.t)
          .dir(0, 1, 0, 0.35)
          .speed(1.5, 3.2)
          .physics(0.45, 0.25)
          .color(GREY, 0.3)
          .color2(this.c2.copy(color).multiplyScalar(5 * size), 0)
          // the clouds glow while the flare burns in them and go dark when it is out (v336.3-338)
          .litUntil(cue.t + dur + 0.1)
          .life(life * 0.7, life)
          .emit(nS, 0, dur / nS)
          .size(1.2 * size, 9 * size)
          .trail(0.6, 0.3)
          .seed(seed ^ 7)
          .set(R.X0, 1.6)
          .set(R.X1, 0.18)
          .set(R.X2, 0.85)
          .set(R.Y0, 0.6)
          .set(R.Y2, 0.08)
          .set(R.Y3, 1)
          .set(R.Z0, 1)
          .set(R.Z3, PUFF.SMOKE)
          .window(cue.t, cue.t + dur + life),
      );
      this.pointLight(out, 1, cue.t, cue.t + dur + 0.3, 0.3, this.v1.set(pos.x, pos.y + 2.5, pos.z), color, 1.5 * size, 12 * size + 4);
    });
    this.groupFlash(out, pts, 30, 3, { kind: 1, t0: cue.t, t1: cue.t + dur + 0.6, color, peak: Math.min(2.5, 0.7 * size * pts.length), decay: 0.6, strobe: 0 });
  }

  /**
   * One flare drone: the path is cut into ~0.12 s chunks; each chunk has its own short-lived
   * emitters (flare glow, sparks, smoke) spread along the chunk's segment and a line light, so the
   * flare, its light and its trail move with the drone while every record stays static.
   */
  private flareDrone(cue: Cue, out: EmitterSet, path: THREE.Vector3[], times: number[], dur: number, color: THREE.Color, size: number, sparkler: boolean, k: number): void {
    const P = path.length === 1 ? [path[0], path[0].clone().add(new THREE.Vector3(0.6, 0.4, 0))] : path;
    // waypoint times: given, else constant speed
    const T: number[] = [0];
    if (times.length >= P.length) for (let i = 1; i < P.length; i++) T.push(Math.min(dur, Math.max(T[i - 1] + 0.01, times[i])));
    else {
      let L = 0;
      const acc = [0];
      for (let i = 1; i < P.length; i++) acc.push((L += P[i].distanceTo(P[i - 1])));
      for (let i = 1; i < P.length; i++) T.push(L > 0 ? (acc[i] / L) * dur : (dur * i) / (P.length - 1));
    }
    T[T.length - 1] = Math.max(T[T.length - 1], dur);
    const at = (t: number, o: THREE.Vector3) => {
      let i = 0;
      while (i + 2 < T.length && t > T[i + 1]) i++;
      const s = Math.min(1, Math.max(0, (t - T[i]) / Math.max(1e-3, T[i + 1] - T[i])));
      const e = s * s * (3 - 2 * s);
      o.copy(P[i]).lerp(P[i + 1], e);
      // hovering drones bob a little
      o.y += Math.sin((cue.t + t) * 2.1 + k) * 0.15;
      return o;
    };
    const chunk = 0.12;
    const nCh = Math.max(1, Math.ceil(dur / chunk));
    const smokeK = num(cue.p.smoke, 1, 0, 3);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const psm = Math.min(1, this.quality.particleScale * 1.6);
    for (let c = 0; c < nCh; c++) {
      const tA = (c / nCh) * dur;
      const tB = ((c + 1) / nCh) * dur;
      at(tA, a);
      at(tB, b);
      const t0 = cue.t + tA;
      const cd = tB - tA;
      const seed = this.sub(cue, 50000 + k * 1000 + c);
      const ax = b.x - a.x,
        ay = b.y - a.y,
        az = b.z - a.z;
      // the flare / sparkler head
      out.add(
        new Emitter(DIST.LINE, 0)
          .on(L_FIRE)
          .originV(a)
          .axis(ax, ay, az)
          .time(t0)
          .dir(0, 1, 0, 0.5)
          .speed(0.1, 0.4)
          .physics(1, 0)
          .color(this.c2.copy(color).lerp(WHITE, sparkler ? 0.4 : 0.3), (sparkler ? 14 : 24) * size)
          .life(0.1, 0.14)
          .emit(4, cd)
          .size((sparkler ? 0.6 : 1.3) * size, 0.3 * size)
          .trail(1, 1)
          .seed(seed)
          .set(R.Z3, PUFF.GLOW)
          .window(t0, t0 + cd + 0.15),
      );
      // the flare's halo in the air / its own smoke (magnesium flares are blinding: a wide glow)
      out.add(
        new Emitter(DIST.LINE, 0)
          .on(L_FIRE)
          .originV(a)
          .axis(ax, ay, az)
          .time(t0)
          .dir(0, 1, 0, 0.5)
          .speed(0.1, 0.3)
          .physics(1, 0)
          .color(color, (sparkler ? 0.5 : 1.1) * size)
          .life(0.12, 0.16)
          .emit(2, cd)
          .size((sparkler ? 2.5 : 5) * size, 0.5 * size)
          .trail(1, 1)
          .seed(seed ^ 0x1d)
          .set(R.Z3, PUFF.GLOW)
          .window(t0, t0 + cd + 0.17),
      );
      if (sparkler) {
        out.add(
          new Emitter(DIST.LINE, F.COOL | F.FLICKER)
            .on(L_SPARK)
            .originV(a)
            .axis(ax, ay, az)
            .time(t0)
            .dir(0, -0.3, 0, 1.6)
            .speed(2, 7)
            .physics(2.2, -9.81)
            .color(color, 16 * size)
            .color2(PALE_GOLD, -1)
            .life(0.4, 0.9)
            .emit(this.pc(90 * cd * 4, 6), 0, cd / this.pc(90 * cd * 4, 6))
            .size(0.035, 0.4)
            .trail(0.1, 0.5)
            .seed(seed ^ 0x51)
            .set(R.Y0, 0.9)
            .set(R.Y3, 0.3)
            .set(R.Z0, 0.01)
            .window(t0, t0 + cd + 1),
        );
      }
      // the smoke trail it leaves hanging in the air, lit by the flare as it passes
      if (smokeK > 0 && (c % 2 === 0 || psm > 0.7)) {
        const life = 5;
        out.add(
          new Emitter(DIST.LINE, F.SELFLIT)
            .on(L_SMOKE)
            .originV(a)
            .axis(ax, ay, az)
            .time(t0)
            .dir(0, 1, 0, 0.8)
            .speed(0.3, 1.2)
            .physics(0.6, 0.35)
            .color(GREY, (sparkler ? 0.16 : 0.26) * Math.min(1.5, smokeK))
            .color2(this.c2.copy(color).multiplyScalar((sparkler ? 2 : 4) * size), 0)
            .litUntil(cue.t + dur + 0.1)
            .life(life * 0.6, life)
            .emit(Math.max(1, Math.round(2 * smokeK * psm)), 0, cd / 2)
            .size(0.6 * size, 3.5 * size)
            .trail(0.6, 0.35)
            .seed(seed ^ 0x77)
            .set(R.X0, 0.8)
            .set(R.X1, 0.2)
            .set(R.X2, 0.85)
            .set(R.Y0, 0.6)
            .set(R.Y2, 0.1)
            .set(R.Y3, 1)
            .set(R.Z0, 1)
            .set(R.Z3, PUFF.SMOKE)
            .window(t0, t0 + cd + life),
        );
      }
      // its light follows it (overlapping chunks so the light never dips)
      this.pointLight(out, 1, t0, t0 + cd + 0.06, 0.06, a, color, (sparkler ? 0.7 : 1.4) * size, 12 * size + 3, b);
      if (c % 3 === 0) out.flashes.push({ kind: 1, t0, t1: t0 + cd * 3 + 0.06, color: color.clone(), peak: (sparkler ? 0.35 : 0.8) * size, decay: 0.06, pos: a.clone(), strobe: 0 });
    }
  }
}

/** spark flag, pyro spark layer only (glsl.ts F_* end at 16384): a spark of a dense fountain column */
const F_COLUMN = 32768;
const SUBPX_LAW = 'gain = pow(wpx / uMinPx, 1.5);';

/**
 * Far-field law of the dense fountain columns (gerb `column: true`). A spark ribbon thinner than a
 * pixel is drawn one pixel wide at (w / w_min)^1.5 of its brightness (sparkShader.ts): a lone spark
 * fades out at a distance instead of turning into a bright dot. That is right for loose sparks, but a
 * column of thousands of sparks fills its pixels: seen from a far drone (v1565.3-1568.8, the white
 * wall from 400 m) it must keep its light. Flagged sparks use the energy-conserving law (w / w_min)^1
 * instead. The spark shader is shared (src/fx/core); the pyro layer patches its own material's copy
 * of that one line and leaves the shader as it is if the line ever changes.
 */
function columnLaw(mat: THREE.ShaderMaterial): void {
  const vs = mat.vertexShader;
  if (!vs.includes(SUBPX_LAW)) return;
  mat.vertexShader = vs.replace(SUBPX_LAW, `gain = (flags & ${F_COLUMN}) != 0 ? wpx / uMinPx : pow(wpx / uMinPx, 1.5);`);
  mat.needsUpdate = true;
}

/** only the wing on `side` (-1 left, 1 right) of a wing surface */
function keepWing(s: WingSurface, side: number): WingSurface {
  const out: WingSurface = { points: [], level: [], tops: s.tops.filter((p) => Math.sign(p.x) === side), bands: [] };
  for (const b of s.bands) {
    if (Math.sign(b.a.x) !== side) continue;
    const units: number[] = [];
    for (const i of b.units) {
      units.push(out.points.length);
      out.points.push(s.points[i]);
      out.level.push(s.level[i]);
    }
    out.bands.push({ ...b, units });
  }
  return out;
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

/** [x,y,z] -> Vector3 (else null) */
function vec3(v: unknown): THREE.Vector3 | null {
  if (Array.isArray(v) && v.length >= 3 && v.slice(0, 3).every((x) => typeof x === 'number' && Number.isFinite(x))) return new THREE.Vector3(v[0], v[1], v[2]);
  return null;
}

/** [x,y,z] or [[x,y,z], ...] -> list */
function vecList(v: unknown): THREE.Vector3[] {
  const one = vec3(v);
  if (one) return [one];
  if (!Array.isArray(v)) return [];
  const out: THREE.Vector3[] = [];
  for (const e of v) {
    const q = vec3(e);
    if (q) out.push(q);
  }
  return out;
}

/** one path ([[x,y,z],...]) or several ([[[x,y,z],...], ...]) */
function pathList(v: unknown): THREE.Vector3[][] {
  if (!Array.isArray(v) || !v.length) return [];
  if (vec3(v[0])) {
    const one = vecList(v);
    return one.length ? [one] : [];
  }
  const out: THREE.Vector3[][] = [];
  for (const e of v) {
    const l = vecList(e);
    if (l.length) out.push(l);
  }
  return out;
}

function numList(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
}

function colorSpecs(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
  if (typeof v === 'string' && v.includes(',')) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

/**
 * How much a white / silver gerb row of height H is dimmed as a light source (1 = the 16-22 m silver
 * walls of v1437-1456, 0 = the 30-34 m finale walls whose light fills their smoke, v1522-1537).
 */
function silverDim(H: number): number {
  return 1 - smooth01(22, 30, H);
}

function smooth01(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function saturation(c: THREE.Color): number {
  const mx = Math.max(c.r, c.g, c.b, 1e-4);
  return 1 - Math.min(c.r, c.g, c.b) / mx;
}

/** charcoal / gold family: r >= g >= b with a real green share (gold, amber, orange) */
function isGoldish(c: THREE.Color): boolean {
  const mx = Math.max(c.r, c.g, c.b, 1e-4);
  const r = c.r / mx,
    g = c.g / mx,
    b = c.b / mx;
  return b <= g + 0.02 && g <= r + 0.02 && g > 0.12;
}

/**
 * Spark chemistry colour for a fountain: the author colour normalised to max 1, and a pale tint
 * (the washed-out colour the camera recorded of a bright metal-salt gerb) pushed back to the
 * saturated star colour that produces it. Near-white colours stay white.
 */
function sparkChroma(c: THREE.Color, out: THREE.Color): THREE.Color {
  const mx = Math.max(c.r, c.g, c.b, 1e-4);
  out.setRGB(c.r / mx, c.g / mx, c.b / mx);
  const sat = saturation(out);
  if (sat < 0.2) return out;
  const k = 1 + Math.min(0.7, (sat - 0.2) * 2.2);
  out.setRGB(Math.max(0.02, 1 - (1 - out.r) * k), Math.max(0.02, 1 - (1 - out.g) * k), Math.max(0.02, 1 - (1 - out.b) * k));
  return out;
}
