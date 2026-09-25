import * as THREE from 'three';
import { hash32 } from '../../core/rng';

/** Ignition order helpers for chases across a row of units. */
export type Pattern = 'all' | 'lr' | 'rl' | 'center_out' | 'out_center' | 'alternate' | 'random';

/**
 * Per-unit ignition delay in "steps" (multiply by the stagger). `step` is the cue's repeat index
 * (alternate fires even units on even steps, odd units on odd steps; -1 = unit skipped).
 */
export function patternSteps(pts: THREE.Vector3[], pattern: string, seed: number, step: number): number[] {
  const n = pts.length;
  const out = new Array<number>(n).fill(0);
  if (n === 0) return out;
  const idx = pts.map((_, i) => i);
  switch (pattern) {
    case 'lr':
      idx.sort((a, b) => pts[a].x - pts[b].x);
      break;
    case 'rl':
      idx.sort((a, b) => pts[b].x - pts[a].x);
      break;
    case 'center_out':
      idx.sort((a, b) => Math.abs(pts[a].x) - Math.abs(pts[b].x));
      break;
    case 'out_center':
      idx.sort((a, b) => Math.abs(pts[b].x) - Math.abs(pts[a].x));
      break;
    case 'random':
      idx.sort((a, b) => hash32(seed ^ (a * 7919)) - hash32(seed ^ (b * 7919)));
      break;
    case 'alternate': {
      const sorted = [...idx].sort((a, b) => pts[a].x - pts[b].x);
      for (let r = 0; r < n; r++) out[sorted[r]] = r % 2 === (step & 1) ? 0 : -1;
      return out;
    }
    default:
      return out;
  }
  if (pattern === 'center_out' || pattern === 'out_center') {
    // mirrored pairs fire together
    let rank = -1;
    let last = NaN;
    for (let r = 0; r < n; r++) {
      const d = Math.round(Math.abs(pts[idx[r]].x) * 2) / 2;
      if (d !== last) {
        rank++;
        last = d;
      }
      out[idx[r]] = rank;
    }
    return out;
  }
  for (let r = 0; r < n; r++) out[idx[r]] = r;
  return out;
}

/** Insert interpolated points so neighbouring units are at most `maxGap` apart (for flame walls). */
export function densify(pts: THREE.Vector3[], maxGap: number, maxInsert = 3): THREE.Vector3[] {
  if (pts.length < 2) return pts.map((p) => p.clone());
  const sorted = [...pts].sort((a, b) => a.x - b.x || a.z - b.z);
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < sorted.length; i++) {
    out.push(sorted[i].clone());
    if (i === sorted.length - 1) break;
    const a = sorted[i],
      b = sorted[i + 1];
    const d = a.distanceTo(b);
    if (d > maxGap && d < maxGap * (maxInsert + 1) * 2.5) {
      const k = Math.min(maxInsert, Math.ceil(d / maxGap) - 1);
      for (let j = 1; j <= k; j++) out.push(a.clone().lerp(b, j / (k + 1)));
    }
  }
  return out;
}

/** Pick `count` evenly spaced points (by x) from a list. */
export function pickEven(pts: THREE.Vector3[], count: number): THREE.Vector3[] {
  if (count >= pts.length) return pts.map((p) => p.clone());
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const out: THREE.Vector3[] = [];
  if (count <= 1) {
    out.push(sorted[Math.floor(sorted.length / 2)].clone());
    return out;
  }
  for (let i = 0; i < count; i++) out.push(sorted[Math.round((i * (sorted.length - 1)) / (count - 1))].clone());
  return out;
}

export function centroid(pts: THREE.Vector3[], out = new THREE.Vector3()): THREE.Vector3 {
  out.set(0, 0, 0);
  if (!pts.length) return out;
  for (const p of pts) out.add(p);
  return out.multiplyScalar(1 / pts.length);
}

export function maxAbsX(pts: THREE.Vector3[]): number {
  let m = 1;
  for (const p of pts) m = Math.max(m, Math.abs(p.x));
  return m;
}

/** Unit direction tilted outward (away from x = 0) by `deg` degrees in the XY plane, with optional forward lean. */
export function tiltedUp(x: number, deg: number, out: THREE.Vector3, lean = 0): THREE.Vector3 {
  const a = (deg * Math.PI) / 180;
  const s = Math.abs(x) < 0.5 ? 0 : Math.sign(x);
  return out.set(Math.sin(a) * s, Math.cos(a), lean).normalize();
}
