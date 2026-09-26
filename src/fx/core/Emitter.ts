import * as THREE from 'three';
import { hash32 } from '../../core/rng';

/**
 * Analytic GPU particle emitters.
 *
 * An emitter is an immutable record of 48 floats (12 RGBA32F texels) that fully describes a group of
 * particles as a closed-form function of show time: where/when they are born, how they fly (linear drag
 * + gravity/buoyancy + wind), how long they live and how they look. The GPU evaluates every particle
 * from (record, particle index, uTime) in the vertex shader. The CPU never simulates anything: each
 * frame it only decides which emitters are alive and assigns them to instanced "slots" (FxLayer).
 *
 * Emission timing:
 *  - one-shot  (emitDur = 0): particle i is born at t0 + stagger * i
 *  - continuous (emitDur > 0): every particle index is a ring-buffer slot that re-spawns with period
 *    lifeMax during [t0, t0 + emitDur]; the spawn instant and randomness are a pure function of time.
 */

export const REC_TEXELS = 12;
export const REC_FLOATS = REC_TEXELS * 4;

/** float offsets inside a record (keep in sync with the GLSL in glsl.ts) */
export const R = {
  ORIGIN: 0, // xyz
  T0: 3,
  DIR: 4, // xyz
  SPREAD: 7, // radians
  SPEED0: 8,
  SPEED1: 9,
  DRAG: 10, // 1/s
  GRAV: 11, // m/s^2 along +Y (negative = falls, positive = buoyant)
  COL1: 12, // rgb (linear)
  INT: 15, // HDR intensity / opacity scale
  COL2: 16, // rgb
  COL2AT: 19, // life fraction where colour changes (sparks) / soot colour mix (puffs)
  LIFE0: 20,
  LIFE1: 21,
  EMITDUR: 22,
  COUNT: 23,
  SIZE0: 24, // sparks: head radius (m) / puffs: start radius
  SIZE1: 25, // sparks: tail radius factor / puffs: radius growth (m)
  TRAIL: 26, // sparks: trail length in seconds / puffs: size growth exponent
  GLITTER: 27, // sparks: glitter amount / puffs: noise scale
  AXIS: 28, // xyz: line vector / ring normal / fan side axis / box extents
  SEED: 31, // integer < 2^24
  MODE: 32, // distribution (DIST_*)
  FLAGS: 33, // bitfield (F_*)
  HZ: 34, // strobe / flicker frequency
  STAGGER: 35, // one-shot per-particle delay (s)
  X0: 36,
  X1: 37,
  X2: 38,
  X3: 39,
  Y0: 40,
  Y1: 41,
  Y2: 42,
  Y3: 43,
  Z0: 44,
  Z1: 45,
  Z2: 46,
  Z3: 47,
} as const;

/** velocity / position distributions */
export const DIST = {
  SPHERE: 0, // Fibonacci sphere (shell bursts)
  CONE: 1, // random inside a cone around DIR (fountains, jets)
  RING: 2, // circle perpendicular to AXIS
  FAN: 3, // evenly spread from -SPREAD..SPREAD in the plane (DIR, AXIS) (comet fans, cakes)
  LINE: 4, // origin spread along AXIS, cone around DIR (waterfalls, firewalls)
  HEMI: 5, // upper hemisphere (debris)
  SINGLE: 6, // exactly DIR * SPEED0 (lift charges, individually aimed comets)
  BOX: 7, // origin + (rand-0.5) * AXIS per component, cone velocity (smoke banks, low fog)
} as const;

/** flag bits */
export const F = {
  CONTINUOUS: 1,
  STROBE: 2,
  CROSSETTE: 4, // particle i = star (i/4) child (i%4), splits at X0 with child speed X1
  POPS: 8, // crackle pops: particle i = star (i/X1) pop (i%X1); pops within X2 s after the star dies
  COOL: 16, // trail/spark cools from white-gold to deep orange with age
  PEARL: 32, // bright flash at the end of the star's life (comet pearls)
  PISTIL: 64, // odd stars are a slower inner sphere in COL2
  COLORCHANGE: 128, // COL1 -> COL2 at life fraction COL2AT
  FLICKER: 256, // random twinkle
  SERPENT: 512, // helical wobble around the path (serpent comets)
  ZIPPER: 1024, // fan index order alternates ends (zipper cakes)
  FLAT: 2048, // puffs: horizontal ellipse (ground fog)
  RAMP: 4096, // continuous emission fades in over X3 s and out at the end
  SELFLIT: 8192, // puffs: self illumination COL1*INT decays with time constant X0
  ABSCHANGE: 16384, // sparks: every alive particle switches COL1 -> COL2 at absolute show time Z3
} as const;

/**
 * Kind-specific extras.
 * Sparks: X0 split time (crossette) / pearl duration, X1 child speed / pops per star, X2 pop delay
 * spread, X3 ramp time, Y0 trail gain, Y1 serpent amplitude, Y2 trail droop (m/s^2), Y3 wind factor,
 * Z0 attack (s), Z1 pearl intensity, Z2 sphere jitter.
 * Puffs: X0 self-light decay, X1 spin (rad/s), X2 noise erosion, X3 ramp time, Y0 soot / albedo,
 * Y1 soot start (life fraction), Y2 fade-in (life fraction), Y3 wind factor, Z0 env-light factor,
 * Z1 flat aspect, Z2 unused, Z3 puff kind (PUFF_*).
 */
export const PUFF = {
  FLAME: 0,
  SMOKE: 1,
  CO2: 2,
  FLASH: 3,
  GLOW: 4,
  FOG: 5,
  /** additive pool of light lying flat on the ground (world-space XZ quad; Z1 = z/x aspect) */
  GROUND: 6,
} as const;

let seedCounter = 1;

/** 24-bit float-safe seed */
export function seed24(...xs: number[]): number {
  let h = 0x2545f491;
  for (const x of xs) h = hash32(h ^ hash32(Math.floor(x) + 0x9e3779b9));
  return h & 0xffffff;
}

/** Same random as the GLSL hf(): 24-bit precision, identical on CPU and GPU. */
export function hf(x: number): number {
  return (hash32(x) >>> 8) / 16777216;
}

export interface FlashSpec {
  /** 0 = burst (fast decay + tail), 1 = sustained (attack/release over [t0,t1]) */
  kind: 0 | 1;
  t0: number;
  t1: number;
  color: THREE.Color;
  peak: number;
  decay: number;
  pos: THREE.Vector3;
  /** strobe modulation (Hz), 0 = none */
  strobe: number;
}

export class Emitter {
  readonly f = new Float32Array(REC_FLOATS);
  /** alive window (absolute show seconds) */
  start = 0;
  end = 0;
  /** particles (already scaled by quality) */
  count = 0;
  /** index of the FxLayer (inside the owning system) that draws this emitter */
  layer = 0;
  /** layer bookkeeping */
  row = -1;
  stamp = -1;
  readonly uid = seedCounter++;

  constructor(dist: number, flags = 0) {
    this.f[R.MODE] = dist;
    this.f[R.FLAGS] = flags;
    this.f[R.DRAG] = 1;
    this.f[R.LIFE0] = 1;
    this.f[R.LIFE1] = 1;
    this.f[R.INT] = 1;
    this.f[R.SIZE0] = 0.2;
    this.f[R.SIZE1] = 0.4;
    this.f[R.COL1] = this.f[R.COL1 + 1] = this.f[R.COL1 + 2] = 1;
    this.f[R.COL2] = this.f[R.COL2 + 1] = this.f[R.COL2 + 2] = 1;
    this.f[R.COL2AT] = 2;
    this.f[R.DIR + 1] = 1;
    this.f[R.AXIS] = 1;
  }

  origin(x: number, y: number, z: number): this {
    this.f[R.ORIGIN] = x;
    this.f[R.ORIGIN + 1] = y;
    this.f[R.ORIGIN + 2] = z;
    return this;
  }
  originV(v: THREE.Vector3): this {
    return this.origin(v.x, v.y, v.z);
  }
  time(t0: number): this {
    this.f[R.T0] = t0;
    return this;
  }
  dir(x: number, y: number, z: number, spread = 0): this {
    const l = Math.hypot(x, y, z) || 1;
    this.f[R.DIR] = x / l;
    this.f[R.DIR + 1] = y / l;
    this.f[R.DIR + 2] = z / l;
    this.f[R.SPREAD] = spread;
    return this;
  }
  dirV(v: THREE.Vector3, spread = 0): this {
    return this.dir(v.x, v.y, v.z, spread);
  }
  speed(a: number, b = a): this {
    this.f[R.SPEED0] = a;
    this.f[R.SPEED1] = b;
    return this;
  }
  physics(drag: number, grav: number): this {
    this.f[R.DRAG] = Math.max(0.02, drag);
    this.f[R.GRAV] = grav;
    return this;
  }
  color(c: THREE.Color, intensity: number): this {
    this.f[R.COL1] = c.r;
    this.f[R.COL1 + 1] = c.g;
    this.f[R.COL1 + 2] = c.b;
    this.f[R.INT] = intensity;
    return this;
  }
  color2(c: THREE.Color, at = 0.5): this {
    this.f[R.COL2] = c.r;
    this.f[R.COL2 + 1] = c.g;
    this.f[R.COL2 + 2] = c.b;
    this.f[R.COL2AT] = at;
    return this;
  }
  life(a: number, b = a): this {
    this.f[R.LIFE0] = a;
    this.f[R.LIFE1] = Math.max(a, b);
    return this;
  }
  emit(count: number, emitDur = 0, stagger = 0): this {
    this.count = Math.max(0, Math.round(count));
    this.f[R.COUNT] = this.count;
    this.f[R.EMITDUR] = emitDur;
    this.f[R.STAGGER] = stagger;
    if (emitDur > 0) this.f[R.FLAGS] = (this.f[R.FLAGS] | F.CONTINUOUS) >>> 0;
    return this;
  }
  size(s0: number, s1: number): this {
    this.f[R.SIZE0] = s0;
    this.f[R.SIZE1] = s1;
    return this;
  }
  trail(seconds: number, glitter = 0): this {
    this.f[R.TRAIL] = seconds;
    this.f[R.GLITTER] = glitter;
    return this;
  }
  axis(x: number, y: number, z: number): this {
    this.f[R.AXIS] = x;
    this.f[R.AXIS + 1] = y;
    this.f[R.AXIS + 2] = z;
    return this;
  }
  axisV(v: THREE.Vector3): this {
    return this.axis(v.x, v.y, v.z);
  }
  seed(s: number): this {
    this.f[R.SEED] = s & 0xffffff;
    return this;
  }
  hz(v: number): this {
    this.f[R.HZ] = v;
    return this;
  }
  flag(bits: number): this {
    this.f[R.FLAGS] = (this.f[R.FLAGS] | bits) >>> 0;
    return this;
  }
  set(offset: number, v: number): this {
    this.f[offset] = v;
    return this;
  }
  on(layer: number): this {
    this.layer = layer;
    return this;
  }
  window(start: number, end: number): this {
    this.start = start;
    this.end = end;
    return this;
  }
  get t0(): number {
    return this.f[R.T0];
  }
  /** copy the whole record (used for derived emitters such as crackle pops) */
  copyFrom(o: Emitter): this {
    this.f.set(o.f);
    this.start = o.start;
    this.end = o.end;
    this.count = o.count;
    return this;
  }
}

/** Closed-form ballistic motion with linear drag (identical to the GLSL `ballistic`). */
export function ballistic(out: THREE.Vector3, p0: THREE.Vector3, v0: THREE.Vector3, k: number, acc: THREE.Vector3, t: number): THREE.Vector3 {
  const e = (1 - Math.exp(-k * t)) / k;
  out.set(
    p0.x + (acc.x / k) * t + (v0.x - acc.x / k) * e,
    p0.y + (acc.y / k) * t + (v0.y - acc.y / k) * e,
    p0.z + (acc.z / k) * t + (v0.z - acc.z / k) * e,
  );
  return out;
}

/** Initial velocity that brings a drag particle from p0 to p1 in exactly t seconds. */
export function aimVelocity(out: THREE.Vector3, p0: THREE.Vector3, p1: THREE.Vector3, k: number, acc: THREE.Vector3, t: number): THREE.Vector3 {
  const e = (1 - Math.exp(-k * t)) / k;
  out.set(
    acc.x / k + (p1.x - p0.x - (acc.x / k) * t) / e,
    acc.y / k + (p1.y - p0.y - (acc.y / k) * t) / e,
    acc.z / k + (p1.z - p0.z - (acc.z / k) * t) / e,
  );
  return out;
}

/** Launch speed so that a particle fired straight up with drag k and gravity g reaches height h. */
export function speedForHeight(h: number, k: number, g = 9.81): number {
  // apex height for v0: h(v0) = v0/k - g/k^2 * ln(1 + k v0 / g); monotonic -> bisection
  let lo = 0,
    hi = 400;
  for (let i = 0; i < 40; i++) {
    const v = (lo + hi) / 2;
    const hv = v / k - (g / (k * k)) * Math.log(1 + (k * v) / g);
    if (hv < h) lo = v;
    else hi = v;
  }
  return (lo + hi) / 2;
}

/** Time to the apex for a vertical launch with speed v0 (drag k, gravity g). */
export function apexTime(v0: number, k: number, g = 9.81): number {
  return Math.log(1 + (k * v0) / g) / k;
}
