import * as THREE from 'three';
import type { Anchors } from '../core/Anchors';
import { FS_CASTLE, FS_SIDES, FS_TORCH, FS_WINGS } from './cues';
import { isDefaultAnchor, T_SPAR, trussTag } from './rig';

/**
 * Festoon bulb strings and practical lamps ('lights.festoon'): the warm lamp garlands of the 2026 set
 * (video 147.75–241.8, 567.4–611.9, 1014.8–1048.6: dense warm-white dots in scallops along the wing
 * panels' top edges, a row along the castle wall walk and scallops along the side-section eaves) and the
 * two tower torches (flickering amber practicals, v666–681). Positions only; the lighting system renders
 * them as bulb sprites in its sprite draw call.
 */
export interface Bulb {
  pos: THREE.Vector3;
  /** string index = kind * 2 + side (side 0: x < 0) */
  str: number;
  /** 0..1 position along its string from the centre line outwards (chases run outwards) */
  u: number;
  /** 0..1 deterministic per-bulb random */
  seed: number;
  /** sprite half size (m) */
  size: number;
}

/** castle wall-walk row (facade Z −12, wall walk Y 9.5): hangs just under the crenellations */
const CASTLE = { x0: 7.2, x1: 36.6, y: 9.2, z: -11.62, pitch: 1.45, sag: 0.22, span: 4.4 };
/** side-section eaves (front wall Z −4, wall top 9.5, X 40…90): scallops between the lantern posts */
const SIDES = { x0: 40.5, x1: 90.5, y: 9.25, z: -3.62, pitch: 1.35, sag: 0.75, span: 8 };

const rnd = (i: number) => {
  let x = Math.imul(i + 0x9e37, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};

export function buildFestoon(anchors: Anchors): Bulb[] {
  const out: Bulb[] = [];
  const push = (x: number, y: number, z: number, kind: number, u: number, size: number) =>
    out.push({ pos: new THREE.Vector3(x, y, z), str: kind * 2 + (x < 0 ? 0 : 1), u: Math.min(1, Math.max(0, u)), seed: rnd(out.length * 7 + kind), size });

  // ---- wings: the heads on the panels' top edges sit 0.8 m above the edge on short arms; the
  // bulbs hang on the edge itself, between the heads
  const truss = anchors.get('fixtures_truss');
  const rows: THREE.Vector3[][] = [];
  if (!isDefaultAnchor(anchors, 'fixtures_truss')) {
    let cur: THREE.Vector3[] = [];
    for (const p of truss) {
      if (trussTag(p) !== T_SPAR) {
        if (cur.length) rows.push(cur);
        cur = [];
        continue;
      }
      if (cur.length && p.distanceTo(cur[cur.length - 1]) > 3) {
        rows.push(cur);
        cur = [];
      }
      cur.push(p);
    }
    if (cur.length) rows.push(cur);
  }
  if (rows.length) {
    for (const r of rows) {
      for (let i = 0; i < r.length; i++) {
        const p = r[i];
        // one lamp per head pitch, between the heads (1.3 m: distinct dots from the far field)
        if (i + 1 < r.length) {
          const q = r[i + 1];
          push((p.x + q.x) / 2, (p.y + q.y) / 2 - 0.9, (p.z + q.z) / 2 + 0.12, FS_WINGS, Math.abs(p.x + q.x) / 84, 0.27);
        }
      }
    }
  } else {
    // no registered crown: sagging edges between the finial tips (design-bible §5)
    const tips = anchors.get('wing_tips');
    for (const s of [-1, 1]) {
      const side = tips.filter((p) => Math.sign(p.x) === s).sort((a, b) => Math.abs(a.x) - Math.abs(b.x));
      const chain = [new THREE.Vector3(s * 6.2, 17.2, -16.6), ...side.map((p) => new THREE.Vector3(p.x, p.y - 3.4, p.z))];
      for (let k = 0; k + 1 < chain.length; k++) {
        const a = chain[k];
        const b = chain[k + 1];
        const n = Math.max(3, Math.round(a.distanceTo(b) / 0.7));
        for (let i = 0; i < n; i++) {
          const f = (i + 0.5) / n;
          const x = a.x + (b.x - a.x) * f;
          push(x, a.y + (b.y - a.y) * f - 2.2 * Math.sin(Math.PI * f), a.z + (b.z - a.z) * f + 0.3, FS_WINGS, Math.abs(x) / 42, 0.2);
        }
      }
    }
  }

  // ---- castle wall walk and side-section eaves: garlands sagging between hooks every `span` m
  const garland = (g: typeof CASTLE, kind: number, size: number) => {
    for (const s of [-1, 1]) {
      const n = Math.round((g.x1 - g.x0) / g.pitch);
      for (let i = 0; i <= n; i++) {
        const ax = g.x0 + ((g.x1 - g.x0) * i) / n;
        const f = ((ax - g.x0) / g.span) % 1;
        push(s * ax, g.y - g.sag * Math.sin(Math.PI * f), g.z, kind, (ax - g.x0) / (g.x1 - g.x0), size);
      }
    }
  };
  garland(CASTLE, FS_CASTLE, 0.15);
  garland(SIDES, FS_SIDES, 0.17);

  // ---- tower torches: one big lamp each
  for (const p of anchors.get('tower_torches')) push(p.x, p.y + 0.4, p.z + 0.6, FS_TORCH, 0, 0.8);
  return out;
}
