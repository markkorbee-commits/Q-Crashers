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
 * Fallback burning-wing geometry (anchors without `wing_spars`, e.g. the fx proxy stage; the stage
 * uses wingSurface below). The spar anchors are clustered by x (one cluster per
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

/** One burning wing of wingSurface(): the band of fire over its membranes, for the wing's light. */
export interface WingBand {
  /** outer / inner end of the burning band (world, m) at the height of its centre */
  a: THREE.Vector3;
  b: THREE.Vector3;
  /** wing plane normal (towards the audience) */
  n: THREE.Vector3;
  /** burning area (m²): the upper part of the membranes that is on fire */
  area: number;
  /** indices into WingSurface.points of this wing's units */
  units: number[];
}

export interface WingSurface {
  /** fire units ON the wing: the fingers and the membranes between them, a little in front of the skin */
  points: THREE.Vector3[];
  /** per point 0..1: height in the burning band (1 = the scalloped top edge / the finger ends) */
  level: number[];
  /** the finger ends (the sun discs under the spear points): the roll-over fireballs */
  tops: THREE.Vector3[];
  bands: WingBand[];
}

/** spar parameters of the `wing_spars` anchor points per finger (src/stage/MainStage.ts: 35 / 60 / 82 %) */
const SPAR_T = [0.35, 0.6, 0.82];
/** the membranes attach at 93 % of every finger (src/stage/dragon/wings.ts ATT) */
const ATTACH_T = 0.93;
/**
 * Sag of the membranes' top edges (outer, middle, inner panel; wings.ts sagCurve): the edge is a
 * quadratic Bezier whose control point sits `sag` below and 0.5 m behind the chord middle, so the
 * edge hangs sag / 2 below the chord at its middle.
 */
const PANEL_SAG = [3.8, 5.4, 3.4];
/** the inner panel's top edge runs from the inner finger down to the riser over the dragon's shoulder (layout.ts: ~10.4 m inward, ~7 m lower) */
const INNER_RISER = new THREE.Vector3(-10.4, -7.0, 0.2);

/**
 * The burning wings ON the wing surface (video 101, 713.5, 729.25: the fire covers the upper part of
 * every wing, fingers and membranes alike, and licks up over the scalloped top edges; it does not
 * stand in columns above the wing).
 *
 * `spars` = the `wing_spars` anchor (per finger the points at 35 / 60 / 82 % of the spar, 0.8 m in
 * front of it; both wings). Every finger is a quadratic curve, so the three points give it exactly:
 * it is extended to the membrane attachment (93 %) and the finger end (100 %). Between neighbouring
 * fingers the membrane rows are sampled from `t0` (fraction of the spar) up to the top edge, every
 * `spacing` m along a row and ~1.3 x `spacing` between rows (odd rows staggered), each row sagging
 * like the edge above it (fading out downwards); the top row IS the scalloped edge. The inner panel
 * burns only near the inner finger (`innerU` of its edge). Points are pushed `front` m further
 * towards the audience (the membrane billows up to 0.55 m back behind the spar plane).
 * Returns null when the anchor does not have three fingers per wing (use wingFire then).
 * Build-time only (allocates).
 */
export function wingSurface(spars: THREE.Vector3[], spacing = 2, t0 = 0.42, front = 0.3, innerU = 0.3): WingSurface | null {
  const out: WingSurface = { points: [], level: [], tops: [], bands: [] };
  for (const side of [-1, 1]) {
    const pts = spars.filter((p) => Math.sign(p.x) === side).sort((a, b) => side * (b.x - a.x));
    // fingers: clusters along x, outer finger first
    const chains: THREE.Vector3[][] = [];
    for (const p of pts) {
      const last = chains[chains.length - 1];
      if (last && Math.abs(last[last.length - 1].x - p.x) < 4.5) last.push(p);
      else chains.push([p]);
    }
    if (chains.length !== 3 || chains.some((c) => c.length < 2 || c.length > 3)) return null;
    // quadratic (3 points) or linear (2 points) curve per finger, parameter = spar fraction
    const fingers = chains.map((c) => {
      const q = [...c].sort((a, b) => a.y - b.y);
      const ts = q.length === 3 ? SPAR_T : SPAR_T.slice(1);
      return (t: number, o = new THREE.Vector3()) => {
        o.set(0, 0, 0);
        for (let i = 0; i < q.length; i++) {
          let w = 1;
          for (let j = 0; j < q.length; j++) if (j !== i) w *= (t - ts[j]) / (ts[i] - ts[j]);
          o.addScaledVector(q[i], w);
        }
        return o;
      };
    });
    // wing plane normal (towards the audience)
    const across = fingers[0](0.6).sub(fingers[2](0.6));
    const along = fingers[1](0.82).sub(fingers[1](0.35));
    const n = along.clone().cross(across).normalize();
    if (n.z < 0) n.negate();
    const first = out.points.length;
    const add = (p: THREE.Vector3, lv: number) => {
      p.addScaledVector(n, front);
      for (let i = first; i < out.points.length; i++) if (out.points[i].distanceToSquared(p) < spacing * spacing * 0.2) return;
      out.points.push(p);
      out.level.push(lv);
    };
    const att = fingers.map((f) => f(ATTACH_T));
    const riser = att[2].clone().add(new THREE.Vector3(INNER_RISER.x * side, INNER_RISER.y, INNER_RISER.z));
    let area = 0;
    for (let pi = 0; pi < 3; pi++) {
      const inner = pi === 2;
      const fa = fingers[pi];
      const fb = inner ? null : fingers[pi + 1];
      const sag = PANEL_SAG[pi];
      const uMax = inner ? innerU : 1;
      // rows from t0 to the edge: ~1.3 x spacing apart along the finger
      const len = fa(ATTACH_T).distanceTo(fa(t0));
      const rows = inner ? 0 : Math.max(1, Math.round(len / (spacing * 1.3)));
      for (let r = 0; r <= rows; r++) {
        const edge = r === rows;
        const t = inner ? ATTACH_T : t0 + ((ATTACH_T - t0) * r) / rows;
        const lv = inner ? 1 : r / rows;
        const L = fa(t);
        const R = edge ? (inner ? riser : att[pi + 1]) : (fb as (t: number) => THREE.Vector3)(t);
        // the row sags like the top edge, less the lower it lies
        const k = edge ? 1 : Math.pow(lv, 2);
        const w = L.distanceTo(R) * uMax;
        const m = Math.max(1, Math.round(w / spacing));
        const odd = r % 2 === 1 && !edge;
        const us: number[] = [0];
        for (let j = 1; j <= m; j++) us.push(((odd && j < m ? j - 0.5 : j) / m) * uMax);
        if (odd) us.push(((m - 0.5) / m) * uMax);
        for (const u of us) {
          const p = L.clone().lerp(R, u);
          const b = 2 * u * (1 - u) * k;
          p.y -= b * sag;
          p.addScaledVector(n, -0.5 * b);
          add(p, lv);
        }
        if (!inner && r > 0) area += (w * len) / rows;
      }
    }
    // the finger ends (sun discs) burn too, and roll the fireballs over
    for (const f of fingers) {
      const e = f(1);
      out.tops.push(e.clone());
      add(e, 1);
    }
    const units: number[] = [];
    for (let i = first; i < out.points.length; i++) units.push(i);
    // the band's light: along the wing at 70 % of the burning height, outer to inner finger
    const a = fingers[0](t0 + (ATTACH_T - t0) * 0.7).addScaledVector(n, 1.5);
    const b = fingers[2](t0 + (ATTACH_T - t0) * 0.7).addScaledVector(n, 1.5);
    out.bands.push({ a, b, n, area, units });
  }
  return out;
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

/**
 * Stretches of a row of units: the units (only those with steps[i] >= 0 when `steps` is given), in
 * order along the unrolled U (see uCoord), cut into pieces of at most `maxLen` m; a gap of more than
 * `maxGap` m starts a new piece. Returns the unit indices of every stretch. The row light, the row
 * smoke and the LightEnv flashes of a U-shaped row follow these stretches, so nothing of the row is
 * placed in the empty field inside the U. Build-time only (allocates).
 */
export function stretches(pts: THREE.Vector3[], steps?: number[], maxLen = 40, maxGap = 24): number[][] {
  const idx: number[] = [];
  for (let i = 0; i < pts.length; i++) if (!steps || steps[i] >= 0) idx.push(i);
  if (!idx.length) return [];
  idx.sort((a, b) => uCoord(pts[a]) - uCoord(pts[b]) || pts[a].z - pts[b].z);
  const out: number[][] = [];
  let cur: number[] = [idx[0]];
  for (let i = 1; i < idx.length; i++) {
    const p = pts[idx[i]];
    if (p.distanceTo(pts[cur[0]]) > maxLen || p.distanceTo(pts[idx[i - 1]]) > maxGap) {
      out.push(cur);
      cur = [];
    }
    cur.push(idx[i]);
  }
  out.push(cur);
  return out;
}

/**
 * Groups of points that lie together (single linkage: a point joins a group when it is within
 * `gap` m of any member), in the order of their first member. Lights over far-apart targets (a burst
 * on both arm ends, X ±94) are pushed per group instead of one segment across the empty field.
 * Build-time only (allocates).
 */
export function clusters(pts: THREE.Vector3[], gap: number): THREE.Vector3[][] {
  const n = pts.length;
  const id = new Int32Array(n).fill(-1);
  const g2 = gap * gap;
  let k = 0;
  for (let i = 0; i < n; i++) {
    if (id[i] >= 0) continue;
    id[i] = k;
    const stack = [i];
    while (stack.length) {
      const a = stack.pop() as number;
      for (let j = 0; j < n; j++) if (id[j] < 0 && pts[a].distanceToSquared(pts[j]) <= g2) {
        id[j] = k;
        stack.push(j);
      }
    }
    k++;
  }
  const out: THREE.Vector3[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < n; i++) out[id[i]].push(pts[i]);
  return out;
}
