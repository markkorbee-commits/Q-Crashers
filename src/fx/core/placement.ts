import * as THREE from 'three';
import { hash32 } from '../../core/rng';

/** Ignition order helpers for chases across a row of units. */
export type Pattern = 'all' | 'lr' | 'rl' | 'center_out' | 'out_center' | 'alternate' | 'random';

/** |x| beyond which a point with z > 0 counts as sitting on a forward arm of the front "U" */
const ARM_X = 84;

/**
 * Position along the unrolled front "U" of the grounds (the fire ring of the drone shots): on the
 * stage front line it is simply x; points on the forward arms (|x| > 84 m, z > 0) continue outward by
 * their distance down the arm. So `lr` runs left arm tip -> stage -> right arm tip, `center_out`
 * starts at the dragon and ends at both arm tips, and a combined target such as
 * `["arm_posts","side_front","deck_front"]` chases as ONE ring. Rows that are not on the arms are
 * unaffected (pillars, deck, roof, ...).
 */
export function uCoord(p: THREE.Vector3): number {
  const ax = Math.abs(p.x);
  return ax > ARM_X && p.z > 0 ? Math.sign(p.x) * (ax + p.z) : p.x;
}

/**
 * Per-unit ignition delay in "steps" (multiply by the stagger). `step` is the cue's repeat index
 * (alternate fires even units on even steps, odd units on odd steps; -1 = unit skipped).
 * Order follows the unrolled U coordinate (see uCoord).
 */
export function patternSteps(pts: THREE.Vector3[], pattern: string, seed: number, step: number): number[] {
  const n = pts.length;
  const out = new Array<number>(n).fill(0);
  if (n === 0) return out;
  const idx = pts.map((_, i) => i);
  const u = pts.map(uCoord);
  switch (pattern) {
    case 'lr':
      idx.sort((a, b) => u[a] - u[b]);
      break;
    case 'rl':
      idx.sort((a, b) => u[b] - u[a]);
      break;
    case 'center_out':
      idx.sort((a, b) => Math.abs(u[a]) - Math.abs(u[b]));
      break;
    case 'out_center':
      idx.sort((a, b) => Math.abs(u[b]) - Math.abs(u[a]));
      break;
    case 'random':
      idx.sort((a, b) => hash32(seed ^ (a * 7919)) - hash32(seed ^ (b * 7919)));
      break;
    case 'alternate': {
      const sorted = [...idx].sort((a, b) => u[a] - u[b]);
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
      const d = Math.round(Math.abs(u[idx[r]]) * 2) / 2;
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

/**
 * Burning-wing geometry from the wing anchors. The spar anchors are clustered by x (one cluster per
 * finger, bottom -> top) and the nearest wing tip is appended; every finger is resampled every
 * `spacing` metres, and the membrane edge between neighbouring finger tops (a scallop that sags
 * between the fingers) is sampled too. So the fire covers the whole upper wing — fingers and the
 * edges between them — instead of sitting on 6 isolated heads. `tops` = the finger tops (for the
 * roll-over fireballs).
 */
export function wingFire(pts: THREE.Vector3[], tips: THREE.Vector3[], spacing: number): { points: THREE.Vector3[]; tops: THREE.Vector3[] } {
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const chains: THREE.Vector3[][] = [];
  for (const p of sorted) {
    const last = chains[chains.length - 1];
    if (last && Math.abs(last[last.length - 1].x - p.x) < 4.5 && Math.sign(last[0].x) === Math.sign(p.x)) last.push(p);
    else chains.push([p]);
  }
  const points: THREE.Vector3[] = [];
  const tops: THREE.Vector3[] = [];
  const sample = (a: THREE.Vector3, b: THREE.Vector3, sag: number, first: boolean) => {
    const k = Math.max(1, Math.round(a.distanceTo(b) / spacing));
    for (let j = first ? 0 : 1; j <= k; j++) {
      const s = j / k;
      const p = a.clone().lerp(b, s);
      p.y -= sag * 4 * s * (1 - s);
      points.push(p);
    }
  };
  for (const ch of chains) {
    ch.sort((a, b) => a.y - b.y);
    const top = ch[ch.length - 1];
    let best: THREE.Vector3 | null = null;
    let bd = 12;
    for (const t of tips) {
      const d = t.distanceTo(top);
      if (d < bd && t.y > top.y) {
        bd = d;
        best = t;
      }
    }
    // stop a little below the tip: the fire licks up to it, it does not start at the very point
    if (best) ch.push(top.clone().lerp(best, 0.85));
    tops.push(ch[ch.length - 1]);
    for (let i = 0; i + 1 < ch.length; i++) sample(ch[i], ch[i + 1], 0, i === 0);
  }
  // membrane edges between neighbouring finger tops of the same wing
  for (let i = 0; i + 1 < tops.length; i++) {
    const a = tops[i],
      b = tops[i + 1];
    const d = a.distanceTo(b);
    if (Math.sign(a.x) !== Math.sign(b.x) || d > 22) continue;
    sample(a, b, d * 0.2, false);
    points.pop(); // b itself is already a finger point
  }
  return { points, tops };
}

/** Insert interpolated points so neighbouring units are at most `maxGap` apart (for flame walls). */
export function densify(pts: THREE.Vector3[], maxGap: number, maxInsert = 3): THREE.Vector3[] {
  if (pts.length < 2) return pts.map((p) => p.clone());
  const sorted = [...pts].sort((a, b) => uCoord(a) - uCoord(b) || a.z - b.z);
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
