import * as THREE from 'three';
import type { Collider2D } from '../core/types';
import { FERRIS_WHEEL, terrainHeight } from './site';

/**
 * The PURPLE-area Ferris wheel as a ride (pure data + pose math, no scene objects): the wheel turns
 * from SHOW TIME (a pure function: seek / pause / restart give the same pose), 16 open gondolas hang
 * from axles between the two rims with a small deterministic pendulum sway. A gate in the lake-front
 * fence (x 80…82.8 at z 173.5) opens onto a gentle ramp walkway to a raised boarding platform on the
 * west side of the wheel's foot; riders step from its open east edge into the gondola passing the bottom.
 * Used by the landmarks (rendering), the terrain (walkable height, bounds gap), the structures (fence
 * gap), the grounds (colliders, spot) and the player's ride controller (seat pose) — so what you see
 * and where you sit can never disagree.
 */

/** seconds per revolution (rim speed 2π·16/300 ≈ 0.34 m/s: a moving gondola is easy to step into) */
export const WHEEL_PERIOD = 300;
export const GONDOLAS = 16;
export const WHEEL_X = FERRIS_WHEEL.x;
export const WHEEL_Z = FERRIS_WHEEL.z;
export const WHEEL_R = FERRIS_WHEEL.r;
/** hub height: 3 m clearance under the rim (as built since round 1) */
export const WHEEL_HUB_Y = terrainHeight(WHEEL_X, WHEEL_Z) + WHEEL_R + 3;
/** the two rims (and the gondola axles between them) at x ± RIM_HALF */
export const RIM_HALF = 0.9;
/** rim angle (rad, in the YZ plane, a = 0 → +Z) of the bottom of the wheel */
export const BOTTOM = -Math.PI / 2;
const STEP = (Math.PI * 2) / GONDOLAS;
/** ground height at the wheel's foot */
const FOOT_Y = terrainHeight(WHEEL_X, WHEEL_Z);
/** half-thickness of a rim beam (0.35 m square: half-diagonal ≈ 0.25), a spoke (0.14 m), an A-frame leg (0.6 m round) */
const RIM_T = 0.22;
const SPOKE_T = 0.09;
export const LEG_R = 0.3;
/**
 * The four A-frame legs of the static frame as segments [ax, ay, az, bx, by, bz]: from the ground
 * (x ± 2.56, z ± 7) up to the axle bearings (x ± 1.6 at the hub). The landmarks build them from this
 * table and the third-person ride camera keeps its lens clear of them.
 */
export const WHEEL_LEGS: readonly (readonly [number, number, number, number, number, number])[] = [-1.6, 1.6].flatMap((sx) =>
  [-7, 7].map((sz) => [WHEEL_X + sx * 1.6, FOOT_Y, WHEEL_Z + sz, WHEEL_X + sx, WHEEL_HUB_Y, WHEEL_Z] as const),
);
/** the axle through the hub (x ± 1.75, 0.5 m round) */
const HUB_HALF = 1.75;
const HUB_R = 0.25;

/**
 * Gondola frame: origin at the axle (pivot) between the rims, hanging straight down (-Y), X across
 * the wheel, Z along the rim at the bottom. An open car: tub walls to 0.72 m, four posts, a canopy.
 */
export const GONDOLA = {
  /** width across the wheel (the rims' inner faces are at ±0.72) */
  w: 1.3,
  /** depth along Z */
  d: 1.9,
  /** floor top below the pivot (flush with the platform deck when the axle is at the bottom) */
  floorY: -2.5,
  /** tub walls: low enough for a seated rider to look down over the front (eye 0.5 m above) */
  wallH: 0.72,
  /** canopy underside below the pivot (2.1 m headroom: you walk in upright) */
  roofY: -0.38,
  /** bench seat top above the floor */
  seatH: 0.45,
  /** where the rider sits (the +Z bench, facing -Z = towards the stage) */
  seatZ: 0.68,
  /** the door gap in the -X wall (boarding side), |z| below this */
  door: 0.36,
};

/** boarding platform (deck top y) on the west side of the wheel's foot; its open east edge faces the gondolas */
export const WHEEL_DECK = { x0: 80.0, x1: 85.6, z0: 183.0, z1: 192.0, y: 0.0 };
/** ramp walkway from the fence gate (z 173.5) up to the platform */
export const WHEEL_WALK = { x0: 80.0, x1: 82.8, z0: 172.4, z1: 183.0 };
/** the gate in the lake-front fence / the field bounds */
export const WHEEL_GATE = { x0: 80.0, x1: 82.8, z: 173.5 };
/** where a boarding rider steps off the deck (just inside the open edge) */
export const DOOR_X = WHEEL_DECK.x1 - 0.25;
/** a gondola is at the platform while its axle is within this angle of the bottom (≈ ±3.3 m, ≤ 0.35 m up) */
export const BOARD_WINDOW = 0.21;

/** wheel rotation (rad) at show time t — the rim mesh uses rotation.x = this (rim angle a → a − θ) */
export function wheelAngle(t: number): number {
  return ((t % WHEEL_PERIOD) / WHEEL_PERIOD) * Math.PI * 2;
}

/** rim angle of gondola k's axle at show time t, wrapped to (−π, π] */
export function gondolaAngle(k: number, t: number): number {
  return wrap(k * STEP - wheelAngle(t));
}

/** signed angle of gondola k from the bottom (> 0: still coming down the +Z side, < 0: rising on the stage side) */
export function fromBottom(k: number, t: number): number {
  return wrap(gondolaAngle(k, t) - BOTTOM);
}

/** the gondola whose axle is nearest the bottom at show time t */
export function nearestGondola(t: number): number {
  let best = 0,
    bd = Infinity;
  for (let k = 0; k < GONDOLAS; k++) {
    const d = Math.abs(fromBottom(k, t));
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  return best;
}

/**
 * Pose of gondola k at show time t: writes the axle (pivot) position to `out` and returns the pendulum
 * sway (rad, rotation about X). The sway is a small deterministic swing (≈ ±1°, the 2.5 s period of a
 * 1.5 m pendulum) from show time, different per gondola.
 */
export function gondolaPose(k: number, t: number, out: THREE.Vector3): number {
  const a = gondolaAngle(k, t);
  out.set(WHEEL_X, WHEEL_HUB_Y + Math.sin(a) * WHEEL_R, WHEEL_Z + Math.cos(a) * WHEEL_R);
  return 0.017 * (0.7 * Math.sin(t * 2.5 + k * 1.7) + 0.3 * Math.sin(t * 0.93 + k * 2.3));
}

/** a point given in the gondola frame (pivot origin, swayed by `sway` about X) in world space */
export function gondolaPoint(pivot: THREE.Vector3, sway: number, lx: number, ly: number, lz: number, out: THREE.Vector3): THREE.Vector3 {
  const c = Math.cos(sway),
    s = Math.sin(sway);
  return out.set(pivot.x + lx, pivot.y + ly * c - lz * s, pivot.z + ly * s + lz * c);
}

/**
 * Walkable height of the ramp walkway and the boarding platform, or null outside them (chained into
 * TerrainSystem.heightAt like the photo terrace). Cheap bounding-box test first.
 */
export function wheelDeckHeight(x: number, z: number): number | null {
  const D = WHEEL_DECK;
  const W = WHEEL_WALK;
  if (x < D.x0 || x > D.x1 || z < W.z0 || z > D.z1) return null;
  if (z >= D.z0) return D.y;
  if (x > W.x1) return null;
  const g = terrainHeight(x, W.z0);
  const s = (z - W.z0) / (W.z1 - W.z0);
  return g + (D.y - g) * s;
}

/**
 * Railings of the walkway and the platform (the open boarding edge is closed by an invisible rail:
 * the gondolas pass right behind it). They join the field bounds' box at the gate (z 172.2…173.8).
 */
export function wheelColliders(): Collider2D[] {
  const D = WHEEL_DECK;
  const W = WHEEL_WALK;
  const r = 0.08;
  const box = (x0: number, z0: number, x1: number, z1: number): Collider2D => ({
    kind: 'box',
    minX: Math.min(x0, x1) - r,
    maxX: Math.max(x0, x1) + r,
    minZ: Math.min(z0, z1) - r,
    maxZ: Math.max(z0, z1) + r,
    tag: 'wheel',
  });
  return [
    box(W.x0, 172.6, D.x0, D.z1), // west rail: walkway + platform
    box(W.x1, 172.6, W.x1, D.z0), // walkway east rail
    box(W.x1, D.z0, D.x1, D.z0), // platform south rail
    box(D.x1, D.z0, D.x1, D.z1), // boarding edge
    box(D.x0, D.z1, D.x1, D.z1), // platform north rail
  ];
}

/**
 * Clearance (m) of the world point (x, y, z) from the wheel's parts at show time t: both rims, the
 * spokes, the 16 gondolas (as boxes around car, canopy and axle; `skip` leaves one out, e.g. the rider's
 * own car, -1 none), the A-frame legs and the hub axle. Negative inside a part. Writes the unit
 * direction away from the nearest part to `away`. `sight` measures only what can hide a rider (rims,
 * legs, cars, axle — not the thin spokes). Pure math, no allocations: the third-person ride camera
 * calls it a few dozen times per frame.
 */
export function wheelClearance(t: number, x: number, y: number, z: number, skip: number, sight: boolean, away: THREE.Vector3): number {
  let best = Infinity;
  let ax = 0,
    ay = 1,
    az = 0;
  const py = y - WHEEL_HUB_Y,
    pz = z - WHEEL_Z;
  const rad = Math.hypot(py, pz);
  const uy = rad > 1e-6 ? py / rad : 1,
    uz = rad > 1e-6 ? pz / rad : 0;
  const th = wheelAngle(t);
  // rims: rings of radius R at x = WHEEL_X ± RIM_HALF
  for (let s = -1; s <= 1; s += 2) {
    const ex = x - (WHEEL_X + s * RIM_HALF),
      er = rad - WHEEL_R;
    const d = Math.hypot(ex, er);
    if (d - RIM_T < best) {
      best = d - RIM_T;
      if (d > 1e-6) {
        ax = ex / d;
        ay = (uy * er) / d;
        az = (uz * er) / d;
      } else {
        ax = 0;
        ay = uy;
        az = uz;
      }
    }
  }
  // spokes: hub → rim along the gondola angles, on both rims (the nearest three by angle)
  if (!sight) {
    const j0 = Math.round((Math.atan2(py, pz) + th) / STEP);
    for (let j = j0 - 1; j <= j0 + 1; j++) {
      const a = j * STEP - th;
      const dy = Math.sin(a),
        dz = Math.cos(a);
      const s = Math.min(WHEEL_R, Math.max(0, py * dy + pz * dz));
      const ey = py - dy * s,
        ez = pz - dz * s;
      for (let r = -1; r <= 1; r += 2) {
        const ex = x - (WHEEL_X + r * RIM_HALF);
        const d = Math.hypot(ex, ey, ez);
        if (d - SPOKE_T < best && d > 1e-6) {
          best = d - SPOKE_T;
          ax = ex / d;
          ay = ey / d;
          az = ez / d;
        }
      }
    }
  }
  // gondolas: car + canopy + axle stub as one box hanging from the pivot (the ±1° sway is ignored)
  for (let k = 0; k < GONDOLAS; k++) {
    if (k === skip) continue;
    const a = gondolaAngle(k, t);
    const cy = WHEEL_HUB_Y + Math.sin(a) * WHEEL_R - 1.25,
      cz = WHEEL_Z + Math.cos(a) * WHEEL_R;
    const ox = x - WHEEL_X,
      oy = y - cy,
      oz = z - cz;
    const qx = Math.abs(ox) - 0.8,
      qy = Math.abs(oy) - 1.33,
      qz = Math.abs(oz) - 1.1;
    if (qz > best || qy > best) continue;
    const mx = Math.max(qx, 0),
      my = Math.max(qy, 0),
      mz = Math.max(qz, 0);
    const lo = Math.hypot(mx, my, mz);
    const d = lo > 0 ? lo : Math.max(qx, qy, qz);
    if (d < best) {
      best = d;
      if (lo > 0) {
        ax = (Math.sign(ox) * mx) / lo;
        ay = (Math.sign(oy) * my) / lo;
        az = (Math.sign(oz) * mz) / lo;
      } else if (qx >= qy && qx >= qz) {
        ax = Math.sign(ox) || 1;
        ay = az = 0;
      } else if (qy >= qz) {
        ay = Math.sign(oy) || 1;
        ax = az = 0;
      } else {
        az = Math.sign(oz) || 1;
        ax = ay = 0;
      }
    }
  }
  // A-frame legs and the hub axle
  for (let i = 0; i < WHEEL_LEGS.length; i++) {
    const L = WHEEL_LEGS[i];
    const bx = L[3] - L[0],
      by = L[4] - L[1],
      bz = L[5] - L[2];
    const vx = x - L[0],
      vy = y - L[1],
      vz = z - L[2];
    const s = Math.min(1, Math.max(0, (vx * bx + vy * by + vz * bz) / (bx * bx + by * by + bz * bz)));
    const ex = vx - bx * s,
      ey = vy - by * s,
      ez = vz - bz * s;
    const d = Math.hypot(ex, ey, ez);
    if (d - LEG_R < best && d > 1e-6) {
      best = d - LEG_R;
      ax = ex / d;
      ay = ey / d;
      az = ez / d;
    }
  }
  {
    const ex = x - Math.min(WHEEL_X + HUB_HALF, Math.max(WHEEL_X - HUB_HALF, x));
    const d = Math.hypot(ex, py, pz);
    if (d - HUB_R < best && d > 1e-6) {
      best = d - HUB_R;
      ax = ex / d;
      ay = py / d;
      az = pz / d;
    }
  }
  away.set(ax, ay, az);
  return best;
}

function wrap(a: number): number {
  const T = Math.PI * 2;
  a = (a + Math.PI) % T;
  if (a < 0) a += T;
  return a - Math.PI;
}
