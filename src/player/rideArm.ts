import * as THREE from 'three';
import { gondolaAngle, GONDOLAS, RIM_HALF, WHEEL_HUB_Y, WHEEL_R, WHEEL_X, WHEEL_Z, wheelClearance } from '../world/ferris';

/** the lens stands this far out of the wheel's centre plane when it can: clear of rims, spokes and cars */
const XS = RIM_HALF + 1.3;
/** arm (m) while looking along the wheel's plane: the lens comes in close behind the rider, between the rims */
const AC = 3.0;
/** lateral offset (m) of the natural lens from the wheel plane over which it swings from the channel out of the slab */
const U0 = 0.3;
const U1 = 1.4;
/** lens keep-out (m) from the surface of any part of the wheel, the frame's legs and the gondolas */
const CLEAR = 0.7;
/** a part closer than this (m) to the rider → lens line of sight hides the rider */
const SIGHT = 0.3;
const SAMPLES = 10;
/** the lens never comes nearer the head than this (m) when the arm shortens */
const MIN_ARM = 1.8;
/** parts nearer the rider than this (m) are not tested for sight: the rims passing over the car, its own spoke */
const SIGHT_FROM = 2.2;
/**
 * the rider's own canopy: within NEAR (m, horizontally) of the head the lens stays below the eaves or above
 * the roof peak (heights above the car floor), else the canopy's underside or edge fills the frame
 */
const EAVE = 1.85;
const ROOF = 2.9;
const NEAR = 5.5;
/**
 * the rims: a lens beside the wheel (|x − WHEEL_X| < RING_X) at about the rim's radius sees the rim beam
 * sweep past at eye level as a dark slab across the frame; it keeps RING_R (m) radially off the rim
 */
const RING_X = RIM_HALF + 2.6;
const RING_R = 1.0;
/** "high" candidates: this far above the car floor (over the roof peak); "low" ones this high */
const HIGH = ROOF + 0.2;
const LOW = 0.6;
/** vertical variants of a candidate */
const V_NAT = 0;
const V_HIGH = 1;
const V_LOW = 2;
/**
 * target candidates in order of preference: [step further out of the slab (m), arm scale, height]. The
 * natural framing, then above the roof (looking down past the canopy's edge at the rider and the show),
 * then stepped further out of the slab (past the rim's sweep, an A-frame leg), then low, then shorter
 * arms (in front of a leg or a car)
 */
const CANDS: readonly (readonly [number, number, number])[] = [
  [0, 1, V_NAT],
  [0, 1, V_HIGH],
  [0.8, 1, V_NAT],
  [0.8, 1, V_HIGH],
  [1.6, 1, V_NAT],
  [1.6, 1, V_HIGH],
  [2.6, 1, V_NAT],
  [0, 1, V_LOW],
  [0, 0.78, V_NAT],
  [0, 0.78, V_HIGH],
  [0, 0.6, V_NAT],
  [0.8, 0.78, V_NAT],
  [0, 0.42, V_NAT],
];
/** a candidate that works: clear + in sight (HARD), and out of the canopy / rim bands too (ALL) */
const FAIL = 0;
const HARD = 1;
const ALL = 2;
/**
 * the lens follows its target at this rate (1/s) and never moves more than MAX_STEP (m) per frame relative
 * to the head: less than any part's keep-out depth, so the push-out can never throw it through a beam
 */
const FOLLOW = 9;
const MAX_STEP = 0.2;
/**
 * the lens cuts to its target instead of gliding when the glide would go through a car or across a rim
 * near the ring, and when it is held off the target anyway (a leg, a spoke) more than STUCK_D (m) away:
 * after STUCK_N frames without progress, or STUCK_S seconds of slow progress (sliding along a part)
 */
const STUCK_D = 1.0;
const STUCK_N = 2;
const STUCK_S = 0.3;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function damp(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

/**
 * Third-person camera arm while riding the Ferris wheel (world/ferris.ts). The rider sits between the
 * rims, so a plain arm swings through rims, spokes, the neighbouring cars or the frame's legs. The lens
 * follows a framing target:
 *  - looking across the wheel the target stays out of the wheel's slab (|x − WHEEL_X| ≥ RIM_HALF + 1.3);
 *  - looking along the wheel (the stage lies 25° off its plane, the lake behind) it comes in close behind
 *    the rider, between the rims, and swings out smoothly as the view turns (no side flip);
 *  - of a few variants of that target (above the roof, further out, low, shorter) the first is taken
 *    that is clear of every part, sees the rider past the rims, legs and cars, and keeps out of the own
 *    canopy's height band and off the rim's radius (sticky: no dithering between two).
 * The lens itself is a point that follows the target in small steps and is pushed out of every part to
 * a fixed clearance each frame, so it slides around a rim or a leg instead of jumping through it (a
 * one-shot push-out flips sides when the target crosses a beam's centre line). It is kept relative to
 * the head, so it rides along with the car. State is a few scalars; no allocations.
 */
export class RideArm {
  /** the target candidate in use (CANDS index, -1 none) */
  private cand = -1;
  /** the lens relative to the head (valid once `has`) */
  private lx = 0;
  private ly = 0;
  private lz = 0;
  private has = false;
  /** seconds / frames the lens has been held off its target */
  private stuck = 0;
  private blocked = 0;
  /** last candidate position placed (head-relative) */
  private cx = 0;
  private cy = 0;
  private cz = 0;
  private readonly away = new THREE.Vector3();
  /** last solve, for the debug overlay: slab blend (0 channel … 1 out), target candidate, lens clearance (m) */
  readonly info = { w: 0, cand: 0, clear: 0 };

  /** forget the lens (a seek, another camera mode): the next solve starts at the target */
  reset(): void {
    this.cand = -1;
    this.has = false;
    this.stuck = 0;
    this.blocked = 0;
  }

  /** start from a lens at (ox, oy, oz) from the head (stepping into the car): it glides to the target from there */
  resetFrom(ox: number, oy: number, oz: number): void {
    this.reset();
    this.lx = ox;
    this.ly = oy;
    this.lz = oz;
    this.has = true;
  }

  /**
   * `head` = the (lagged) head pivot, (dx, dy, dz) = the natural arm from it at full length, `floorY` = the
   * car floor (the rider's feet), `own` = the rider's gondola, `t` = show time. Writes the lens to `out`.
   */
  solve(dt: number, t: number, own: number, head: THREE.Vector3, dx: number, dy: number, dz: number, floorY: number, out: THREE.Vector3): THREE.Vector3 {
    const len = Math.max(1e-3, Math.hypot(dx, dy, dz));
    // 1. channel (looking along the wheel) … out of the slab (looking across it)
    const u = head.x + dx - WHEEL_X;
    const au = Math.abs(u);
    const w = smoothstep(U0, U1, au);
    const k = Math.min(1, AC / len);
    const ks = k + (1 - k) * w;
    const ox = WHEEL_X + Math.sign(u) * Math.max(au, XS);
    const bx = dx * k + (ox - head.x - dx * k) * w,
      by = dy * ks,
      bz = dz * ks;
    const side = u < 0 ? -1 : 1;
    // 2. the target: the current candidate while it still works in full, else the first that does
    //    (one that is only clear and in sight when none does); a better one must work with a margin
    const fy = floorY - head.y;
    let pick = -1;
    if (this.has && this.cand >= 0 && this.test(t, own, head, bx, by, bz, fy, side, w, this.cand, 0) === ALL) pick = this.cand;
    let hard = -1;
    for (let i = 0; i < CANDS.length && (pick < 0 || i < pick); i++) {
      const r = this.test(t, own, head, bx, by, bz, fy, side, w, i, pick < 0 ? 0 : 0.15);
      if (r === ALL) {
        pick = i;
        break;
      }
      if (r === HARD && hard < 0) hard = i;
    }
    if (pick < 0) pick = hard;
    this.cand = pick;
    this.place(bx, by, bz, fy, side, w, pick < 0 ? 0 : pick);
    const x = this.cx,
      y = this.cy,
      z = this.cz;
    // 3. the lens follows the target (head-relative) in bounded steps …
    const gap = Math.hypot(x - this.lx, y - this.ly, z - this.lz);
    let step = 0;
    if (!this.has || this.stuck > STUCK_S || this.blocked >= STUCK_N || (gap > 0.3 && this.crosses(t, head, x, y, z))) {
      this.lx = x;
      this.ly = y;
      this.lz = z;
      this.has = true;
      this.stuck = 0;
      this.blocked = 0;
    } else {
      const a = damp(FOLLOW, dt);
      let sx = (x - this.lx) * a,
        sy = (y - this.ly) * a,
        sz = (z - this.lz) * a;
      const sl = Math.hypot(sx, sy, sz);
      if (sl > MAX_STEP) {
        const c = MAX_STEP / sl;
        sx *= c;
        sy *= c;
        sz *= c;
      }
      this.lx += sx;
      this.ly += sy;
      this.lz += sz;
      step = Math.min(sl, MAX_STEP);
    }
    // … and is pushed out of every part (rims, spokes, cars incl. the own one, legs, hub axle)
    let px = head.x + this.lx,
      py = head.y + this.ly,
      pz = head.z + this.lz;
    let c = 0;
    for (let i = 0; i < 6; i++) {
      c = wheelClearance(t, px, py, pz, -1, false, this.away);
      if (c >= CLEAR) break;
      const m = CLEAR - c + 0.005;
      px += this.away.x * m;
      py += this.away.y * m;
      pz += this.away.z * m;
    }
    this.lx = px - head.x;
    this.ly = py - head.y;
    this.lz = pz - head.z;
    // progress towards the target this frame (the push-out undoing the step = held off by a part)
    const moved = gap - Math.hypot(x - this.lx, y - this.ly, z - this.lz);
    this.blocked = step > 0 && gap > STUCK_D && moved < 0.25 * step ? this.blocked + 1 : 0;
    this.stuck = step > 0 && gap > STUCK_D && moved < 0.6 * step ? this.stuck + dt : 0;
    const inf = this.info;
    inf.w = w;
    inf.cand = this.cand;
    inf.clear = c;
    return out.set(px, py, pz);
  }

  /** head-relative position of candidate i of the base arm (bx, by, bz) → (cx, cy, cz); fy = floor − head */
  private place(bx: number, by: number, bz: number, fy: number, side: number, w: number, i: number): void {
    const cd = CANDS[i];
    this.cx = bx * cd[1] + (w > 0.5 ? cd[0] * side : 0);
    this.cz = bz * cd[1];
    const y = by * cd[1];
    this.cy = cd[2] === V_HIGH ? Math.max(y, fy + HIGH) : cd[2] === V_LOW ? Math.min(y, fy + LOW) : y;
  }

  /**
   * Candidate i: FAIL, HARD (its lens is clear of every part and the line of sight to the rider is free
   * beyond SIGHT_FROM — nearer parts, the rims passing over the car, cannot be got past by any arm) or
   * ALL (also out of the canopy band and off the rim's radius). `margin` widens every test.
   */
  private test(t: number, own: number, head: THREE.Vector3, bx: number, by: number, bz: number, fy: number, side: number, w: number, i: number, margin: number): number {
    const cd = CANDS[i];
    if (cd[0] > 0 && w <= 0.5) return FAIL;
    // a height variant that would not move the lens is the natural candidate again
    if (cd[2] === V_HIGH && by * cd[1] >= fy + HIGH) return FAIL;
    if (cd[2] === V_LOW && by * cd[1] <= fy + LOW) return FAIL;
    this.place(bx, by, bz, fy, side, w, i);
    const vx = this.cx,
      vy = this.cy,
      vz = this.cz;
    const L = Math.hypot(vx, vy, vz);
    if (cd[1] < 1 && L < MIN_ARM) return FAIL;
    const px = head.x + vx,
      py = head.y + vy,
      pz = head.z + vz;
    if (wheelClearance(t, px, py, pz, -1, false, this.away) < CLEAR + margin) return FAIL;
    if (L > SIGHT_FROM + 0.3) {
      const s0 = SIGHT_FROM / L;
      for (let k = 0; k <= SAMPLES; k++) {
        const s = s0 + ((1 - s0) * k) / SAMPLES;
        if (wheelClearance(t, head.x + vx * s, head.y + vy * s, head.z + vz * s, own, true, this.away) < SIGHT + margin) return FAIL;
      }
    }
    // the own canopy's band (near the car)
    if (Math.hypot(vx, vz) < NEAR) {
      const h = vy - fy;
      if (h > EAVE - margin && h < ROOF + margin) return HARD;
    }
    // the rim's radius, beside the wheel
    if (Math.abs(px - WHEEL_X) < RING_X && Math.abs(Math.hypot(py - WHEEL_HUB_Y, pz - WHEEL_Z) - WHEEL_R) < RING_R + margin) return HARD;
    return ALL;
  }

  /**
   * The straight glide from the lens to the target (head-relative x, y, z) passes through a gondola or
   * crosses a rim plane within reach of the rim beam: gliding would press on it (or through it).
   */
  private crosses(t: number, head: THREE.Vector3, x: number, y: number, z: number): boolean {
    const ax = head.x + this.lx,
      ay = head.y + this.ly,
      az = head.z + this.lz;
    const dx = x - this.lx,
      dy = y - this.ly,
      dz = z - this.lz;
    for (let s = -1; s <= 1; s += 2) {
      const a = ax - (WHEEL_X + s * RIM_HALF),
        b = a + dx;
      if (a * b >= 0) continue;
      const f = a / (a - b);
      const r = Math.hypot(ay + dy * f - WHEEL_HUB_Y, az + dz * f - WHEEL_Z);
      if (Math.abs(r - WHEEL_R) < RING_R) return true;
    }
    // the cars as boxes (car, canopy, axle stub hanging from the pivot): slab test of the segment
    for (let k = 0; k < GONDOLAS; k++) {
      const g = gondolaAngle(k, t);
      const cy = WHEEL_HUB_Y + Math.sin(g) * WHEEL_R - 1.25,
        cz = WHEEL_Z + Math.cos(g) * WHEEL_R;
      if (segBox(ax - WHEEL_X, ay - cy, az - cz, dx, dy, dz, 0.85, 1.4, 1.15)) return true;
    }
    return false;
  }
}

/** does the segment p → p + d (relative to a box centre) pass through the box of half extents hx, hy, hz */
function segBox(px: number, py: number, pz: number, dx: number, dy: number, dz: number, hx: number, hy: number, hz: number): boolean {
  let t0 = 0,
    t1 = 1;
  for (let i = 0; i < 3; i++) {
    const p = i === 0 ? px : i === 1 ? py : pz;
    const d = i === 0 ? dx : i === 1 ? dy : dz;
    const h = i === 0 ? hx : i === 1 ? hy : hz;
    if (Math.abs(d) < 1e-9) {
      if (p < -h || p > h) return false;
      continue;
    }
    let ta = (-h - p) / d,
      tb = (h - p) / d;
    if (ta > tb) {
      const q = ta;
      ta = tb;
      tb = q;
    }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return false;
  }
  return true;
}
