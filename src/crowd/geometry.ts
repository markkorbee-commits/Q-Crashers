import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BONE, SLOT } from './constants';

/**
 * Procedural people for the GPU-skinned crowd. Every piece is authored in the rest pose of a 1.75 m
 * reference body (metres, facing +Z, feet at y = 0) and tagged with `aBone` (= bone + 32 · slot).
 * The vertex shader rotates each rigid segment around its joint pivot (see skinPt in shaders.ts)
 * and scales / places the result per instance.
 *
 * All body parts are lofted from rings WITHOUT seam duplicates, so computeVertexNormals() gives
 * smooth shading (no faceted "artist's doll" look); limbs are capsules (domed ends hide the
 * rigid joints), forearms taper to the wrist, hands are mittens (+ thumb on the hero body),
 * feet are shaped shoes and every non-buzz head gets a real hair-cap shell.
 *
 *  - hero LOD  (~2.5k tris): the ~100 people closest to the camera (and the performers)
 *  - near LOD  (~0.7k tris incl. optional slots): up to ~15 m
 *  - mid LOD   (~80 tris): prisms per segment, octahedral head
 * Optional slots (cap, bucket hat, hair cap, long hair, pony tail, bandana, flag cape, performer
 * props) are collapsed per instance in the vertex shader.
 */

type G = THREE.BufferGeometry;
type V3 = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function tag(g: G, bone: number, slot = 0): G {
  // keep (or add) an index so shared vertices are skinned once (post-transform cache)
  if (!g.index) {
    const n0 = g.getAttribute('position').count;
    const ix = new Array<number>(n0);
    for (let i = 0; i < n0; i++) ix[i] = i;
    g.setIndex(ix);
  }
  g.deleteAttribute('uv');
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n).fill(bone + 32 * slot);
  g.setAttribute('aBone', new THREE.BufferAttribute(a, 1));
  return g;
}

interface Ring {
  /** axial position */
  y: number;
  /** half extents (0, 0 → a pole vertex) */
  rx: number;
  rz: number;
  /** centre offset of the ring */
  ox?: number;
  oz?: number;
}

/**
 * Lofted tube along +Y from rings (ascending y). Superellipse cross-section (n = 2 → ellipse).
 * Angle 0 is +Z (front), increasing towards +X. Poles close the ends. Smooth normals.
 */
function loft(rs: Ring[], seg: number, n = 2, phase = 0): G {
  const pos: number[] = [];
  const idx: number[] = [];
  const start: number[] = [];
  const e = 2 / n;
  for (const r of rs) {
    start.push(pos.length / 3);
    const ox = r.ox ?? 0;
    const oz = r.oz ?? 0;
    if (r.rx <= 0 && r.rz <= 0) {
      pos.push(ox, r.y, oz);
      continue;
    }
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2 + phase;
      const s = Math.sin(a);
      const c = Math.cos(a);
      pos.push(ox + r.rx * Math.sign(s) * Math.pow(Math.abs(s), e), r.y, oz + r.rz * Math.sign(c) * Math.pow(Math.abs(c), e));
    }
  }
  for (let k = 0; k < rs.length - 1; k++) {
    const a0 = start[k];
    const a1 = start[k + 1];
    const p0 = rs[k].rx <= 0 && rs[k].rz <= 0;
    const p1 = rs[k + 1].rx <= 0 && rs[k + 1].rz <= 0;
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      if (p0 && p1) continue;
      if (p0) idx.push(a0, a1 + j, a1 + i);
      else if (p1) idx.push(a0 + i, a0 + j, a1);
      else idx.push(a0 + i, a0 + j, a1 + j, a0 + i, a1 + j, a1 + i);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  return g;
}

/** map a +Y-built part onto the segment a → b (local x stays closest to world X) */
function orient(g: G, a: V3, b: V3): G {
  const d = b.clone().sub(a).normalize();
  const X = v(1, 0, 0);
  const xp = X.clone().addScaledVector(d, -d.dot(X)).normalize();
  const zp = new THREE.Vector3().crossVectors(xp, d);
  const m = new THREE.Matrix4().makeBasis(xp, d, zp).setPosition(a);
  g.applyMatrix4(m);
  return g;
}

/**
 * Capsule limb from a to b: profile [t 0..1 along the bone, radius], domed ends (dome length =
 * end radius * k), optional flattening (sx across, sz front/back).
 */
function capsule(a: V3, b: V3, prof: [number, number][], seg: number, dome = [0.8, 0.8], sx = 1, sz = 1): G {
  const len = a.distanceTo(b);
  const rs: Ring[] = [];
  const r0 = prof[0][1];
  const r1 = prof[prof.length - 1][1];
  if (dome[0] > 0) {
    rs.push({ y: -r0 * dome[0], rx: 0, rz: 0 });
    if (domeRing) rs.push({ y: -r0 * dome[0] * 0.62, rx: r0 * 0.72 * sx, rz: r0 * 0.72 * sz });
  }
  for (const [t, r] of prof) rs.push({ y: t * len, rx: r * sx, rz: r * sz });
  if (dome[1] > 0) {
    if (domeRing) rs.push({ y: len + r1 * dome[1] * 0.62, rx: r1 * 0.72 * sx, rz: r1 * 0.72 * sz });
    rs.push({ y: len + r1 * dome[1], rx: 0, rz: 0 });
  }
  return orient(loft(rs, seg), a, b);
}
/** rounder domes (an extra ring) on the hero body; the near body closes limbs with a single pole */
let domeRing = true;

/** ellipsoid (lat-long, poles, no seam) with an optional per-vertex shaping function */
function blob(c: V3, rx: number, ry: number, rz: number, seg: number, rings: number, shape?: (p: V3) => void): G {
  const rs: Ring[] = [{ y: -ry, rx: 0, rz: 0 }];
  for (let k = rings; k >= 1; k--) {
    const th = (Math.PI * k) / (rings + 1);
    rs.push({ y: ry * Math.cos(th), rx: rx * Math.sin(th), rz: rz * Math.sin(th) });
  }
  rs.push({ y: ry, rx: 0, rz: 0 });
  const g = loft(rs, seg);
  g.translate(c.x, c.y, c.z);
  if (shape) {
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const t = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      t.set(p.getX(i), p.getY(i), p.getZ(i));
      shape(t);
      p.setXYZ(i, t.x, t.y, t.z);
    }
  }
  return g;
}

/** both-sided flat grid (cape / long hair), front + back */
function sheet(w0: number, w1: number, y0: number, y1: number, z0: number, curve: number, sx: number, sy: number): G {
  const g = new THREE.PlaneGeometry(1, 1, sx, sy);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5; // 0..1 across
    const t = 0.5 - p.getY(i); // 0 top .. 1 bottom
    const w = w0 + (w1 - w0) * t;
    const x = (u - 0.5) * w;
    const y = y0 + (y1 - y0) * t;
    const z = z0 - curve * (1 - 4 * (u - 0.5) * (u - 0.5)) - 0.03 * t;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  const back = g.clone();
  const idx = back.getIndex()!;
  const arr = idx.array as Uint16Array;
  for (let i = 0; i < arr.length; i += 3) {
    const t = arr[i + 1];
    arr[i + 1] = arr[i + 2];
    arr[i + 2] = t;
  }
  const bn = back.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < bn.count; i++) bn.setXYZ(i, -bn.getX(i), -bn.getY(i), -bn.getZ(i));
  g.deleteAttribute('uv');
  back.deleteAttribute('uv');
  const m = mergeGeometries([g, back], false)!;
  g.dispose();
  back.dispose();
  return m;
}

/** hairline height of the hair cap around the head (φ = 0 front, π back) */
function hairline(phi: number): number {
  const a = Math.abs(((phi + Math.PI) % (Math.PI * 2)) - Math.PI); // 0..π
  const k = a / Math.PI;
  // forehead 1.705 → temples 1.665 → above the ears 1.628 → nape 1.556
  if (k < 0.38) return 1.705 - (0.04 * k) / 0.38;
  if (k < 0.62) return 1.665 - (0.037 * (k - 0.38)) / 0.24;
  return 1.628 - (0.072 * (k - 0.62)) / 0.38;
}

const HEAD_C = v(0, 1.645, 0.012);
const HEAD_R = [0.08, 0.112, 0.098] as const;

/** hair cap shell following the hairline, 5–6 mm off the skull */
function hairCap(seg: number, rings: number): G {
  const cx = HEAD_C.x;
  const cy = HEAD_C.y + 0.002;
  const cz = HEAD_C.z - 0.002;
  const rx = HEAD_R[0] + 0.0075;
  const ry = HEAD_R[1] + 0.006;
  const rz = HEAD_R[2] + 0.009;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let k = 0; k < rings; k++) {
    const t = k / rings;
    for (let i = 0; i < seg; i++) {
      const phi = (i / seg) * Math.PI * 2;
      const thH = Math.acos(THREE.MathUtils.clamp((hairline(phi) - cy) / ry, -1, 1));
      const th = thH * (1 - t);
      // hair lies flat on the scalp at the hairline (no helmet step) and stands proud at the crown
      const lift = THREE.MathUtils.smoothstep(t, 0, 0.55);
      const bulge = 1 + 0.05 * (1 - Math.abs(1 - 2 * t)) * (Math.cos(phi) < 0 ? 1 : 0.5);
      const ex = HEAD_R[0] + (rx - HEAD_R[0]) * (0.4 + 0.6 * lift);
      const ez = HEAD_R[2] + (rz - HEAD_R[2]) * (0.4 + 0.6 * lift);
      pos.push(cx + ex * bulge * Math.sin(th) * Math.sin(phi), cy + ry * Math.cos(th), cz + ez * bulge * Math.sin(th) * Math.cos(phi));
    }
  }
  const pole = pos.length / 3;
  pos.push(cx, cy + ry + 0.004, cz - 0.004);
  for (let k = 0; k < rings - 1; k++) {
    const a0 = k * seg;
    const a1 = a0 + seg;
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      idx.push(a0 + i, a0 + j, a1 + j, a0 + i, a1 + j, a1 + i);
    }
  }
  const last = (rings - 1) * seg;
  for (let i = 0; i < seg; i++) idx.push(last + i, last + ((i + 1) % seg), pole);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  return g;
}

/** head: ellipsoid with a narrower jaw, a chin, a flatter face and a fuller back of the skull */
function head(seg: number, rings: number): G {
  const [rx, ry, rz] = HEAD_R;
  return blob(HEAD_C, rx, ry, rz, seg, rings, (p) => {
    const ny = (p.y - HEAD_C.y) / ry;
    const nz = (p.z - HEAD_C.z) / rz;
    // jaw: narrower towards the chin, the chin a little forward
    const low = THREE.MathUtils.smoothstep(-ny, 0.05, 0.95);
    p.x *= 1 - 0.2 * low * (0.55 + 0.45 * Math.max(0, nz));
    if (nz > 0) p.z += 0.006 * low * nz;
    // flatter face plane, fuller occiput
    if (nz > 0.6 && ny > -0.4) p.z -= 0.008 * (nz - 0.6) / 0.4;
    if (nz < 0 && ny > -0.2) p.z -= 0.006 * -nz * (1 - Math.abs(ny));
  });
}

type Detail = 'near' | 'hero';

/** the body (every always-visible piece) at a detail level */
function bodyParts(d: Detail): G[] {
  const H = d === 'hero';
  domeRing = H;
  const parts: G[] = [];
  const n = H ? 2.3 : 2.4;
  // pelvis (hips, seat)
  const pelvisR: Ring[] = H
    ? [
        { y: 0.83, rx: 0, rz: 0, oz: -0.004 },
        { y: 0.855, rx: 0.1, rz: 0.08 },
        { y: 0.9, rx: 0.145, rz: 0.098, oz: -0.004 },
        { y: 0.95, rx: 0.16, rz: 0.104, oz: -0.008 },
        { y: 1.005, rx: 0.154, rz: 0.1, oz: -0.004 },
        { y: 1.06, rx: 0.15, rz: 0.097 },
      ]
    : [
        { y: 0.835, rx: 0, rz: 0 },
        { y: 0.87, rx: 0.12, rz: 0.088 },
        { y: 0.95, rx: 0.16, rz: 0.103, oz: -0.006 },
        { y: 1.06, rx: 0.15, rz: 0.097 },
      ];
  parts.push(tag(loft(pelvisR, H ? 16 : 8, n, H ? 0 : Math.PI / 8), BONE.PELVIS));
  // torso: waist, chest, shoulder line (sloped), base of the neck
  const torsoR: Ring[] = H
    ? [
        { y: 1.03, rx: 0.15, rz: 0.098 },
        { y: 1.1, rx: 0.143, rz: 0.095, oz: 0.003 },
        { y: 1.18, rx: 0.15, rz: 0.1, oz: 0.008 },
        { y: 1.26, rx: 0.164, rz: 0.108, oz: 0.014 },
        { y: 1.33, rx: 0.176, rz: 0.11, oz: 0.013 },
        { y: 1.39, rx: 0.183, rz: 0.102, oz: 0.004 },
        { y: 1.43, rx: 0.176, rz: 0.09, oz: -0.004 },
        { y: 1.458, rx: 0.14, rz: 0.075, oz: -0.008 },
        { y: 1.478, rx: 0.075, rz: 0.058, oz: -0.01 },
        { y: 1.49, rx: 0, rz: 0, oz: -0.01 },
      ]
    : [
        { y: 1.03, rx: 0.15, rz: 0.098 },
        { y: 1.13, rx: 0.145, rz: 0.097, oz: 0.004 },
        { y: 1.28, rx: 0.17, rz: 0.11, oz: 0.015 },
        { y: 1.4, rx: 0.183, rz: 0.1, oz: 0.004 },
        { y: 1.455, rx: 0.14, rz: 0.075, oz: -0.008 },
        { y: 1.485, rx: 0, rz: 0, oz: -0.01 },
      ];
  parts.push(tag(loft(torsoR, H ? 16 : 8, n, H ? 0 : Math.PI / 8), BONE.SPINE));
  // neck (open, ends hidden in torso / head)
  parts.push(tag(capsule(v(0, 1.43, -0.012), v(0, 1.57, 0.0), [[0, 0.052], [1, 0.046]], H ? 10 : 6, [0, 0]), BONE.HEAD));
  // head + nose (+ ears on the hero)
  parts.push(tag(H ? head(16, 10) : head(8, 4), BONE.HEAD));
  const nose = new THREE.ConeGeometry(H ? 0.015 : 0.014, 0.032, H ? 6 : 3);
  nose.rotateX(Math.PI / 2 + (H ? 0.35 : 0.2));
  nose.scale(1, 1, 0.9);
  nose.translate(0, 1.628, 0.103);
  parts.push(tag(nose, BONE.HEAD));
  if (H) {
    for (const s of [1, -1]) parts.push(tag(blob(v(0.079 * s, 1.638, 0.004), 0.011, 0.027, 0.017, 6, 3), BONE.HEAD));
  }
  const ls = H ? 9 : 5; // limb segments
  for (const s of [1, -1]) {
    const L = s > 0;
    const ua = L ? BONE.UARM_L : BONE.UARM_R;
    const fa = L ? BONE.FARM_L : BONE.FARM_R;
    const ha = L ? BONE.HAND_L : BONE.HAND_R;
    const th = L ? BONE.THIGH_L : BONE.THIGH_R;
    const sh = L ? BONE.SHIN_L : BONE.SHIN_R;
    const ft = L ? BONE.FOOT_L : BONE.FOOT_R;
    // upper arm: deltoid dome over the shoulder, biceps, narrowing to the elbow
    const uaP: [number, number][] = H ? [[0, 0.051], [0.18, 0.05], [0.6, 0.042], [1, 0.036]] : [[0, 0.05], [0.4, 0.046], [1, 0.036]];
    parts.push(tag(capsule(v(0.188 * s, 1.435, -0.012), v(0.205 * s, 1.13, -0.01), uaP, ls, [0.75, 0.7]), ua));
    // forearm: muscle below the elbow, tapering to a flat wrist
    const faP: [number, number][] = H ? [[0, 0.036], [0.22, 0.038], [0.7, 0.029], [1, 0.024]] : [[0, 0.036], [0.3, 0.036], [1, 0.024]];
    parts.push(tag(capsule(v(0.205 * s, 1.13, -0.01), v(0.21 * s, 0.885, 0.0), faP, ls, [0.7, 0.5], 0.86, 1.05), fa));
    // mitten hand: flat paddle (palm towards the thigh), fingers curled a little inwards
    const hdP: [number, number][] = H ? [[0, 0.021], [0.2, 0.031], [0.45, 0.037], [0.72, 0.034], [1, 0.023]] : [[0, 0.024], [0.45, 0.036], [1, 0.025]];
    const hand = capsule(v(0.21 * s, 0.895, 0.0), v(0.212 * s, 0.725, 0.012), hdP, H ? 8 : 4, [0.5, 0.75], 0.42, 1);
    const hp = hand.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < hp.count; i++) {
      const y = hp.getY(i);
      const curl = Math.max(0, 0.8 - y) * 0.28;
      hp.setX(i, hp.getX(i) - s * curl);
    }
    parts.push(tag(hand, ha));
    if (H) parts.push(tag(capsule(v(0.203 * s, 0.868, 0.03), v(0.19 * s, 0.8, 0.05), [[0, 0.012], [1, 0.0095]], 6, [0.6, 0.8]), ha));
    // thigh + shin (calf), knee domes
    const thP: [number, number][] = H ? [[0, 0.08], [0.2, 0.087], [0.65, 0.068], [1, 0.056]] : [[0, 0.084], [0.45, 0.076], [1, 0.056]];
    parts.push(tag(capsule(v(0.093 * s, 0.99, 0.0), v(0.1 * s, 0.5, 0.015), thP, H ? 9 : 6, [0.4, 0.7]), th));
    const shP: [number, number][] = H ? [[0, 0.053], [0.25, 0.056], [0.7, 0.038], [1, 0.033]] : [[0, 0.054], [0.25, 0.054], [1, 0.034]];
    parts.push(tag(capsule(v(0.1 * s, 0.5, 0.015), v(0.1 * s, 0.075, 0.0), shP, ls, [0.6, 0.3], 1, 1.04), sh));
    // shoe: lofted heel → toe, flat sole at y = 0
    const shoe: Ring[] = H
      ? [
          { y: -0.082, rx: 0, rz: 0, oz: -0.042 },
          { y: -0.066, rx: 0.038, rz: 0.04, oz: -0.044 },
          { y: -0.02, rx: 0.045, rz: 0.05, oz: -0.05 },
          { y: 0.06, rx: 0.051, rz: 0.042, oz: -0.042 },
          { y: 0.14, rx: 0.048, rz: 0.031, oz: -0.031 },
          { y: 0.18, rx: 0.036, rz: 0.025, oz: -0.025 },
          { y: 0.197, rx: 0, rz: 0, oz: -0.022 },
        ]
      : [
          { y: -0.08, rx: 0, rz: 0, oz: -0.044 },
          { y: -0.04, rx: 0.045, rz: 0.047, oz: -0.047 },
          { y: 0.1, rx: 0.049, rz: 0.036, oz: -0.036 },
          { y: 0.195, rx: 0, rz: 0, oz: -0.022 },
        ];
    const sg = loft(shoe, H ? 9 : 5, 2.4, H ? 0 : Math.PI / 5);
    orient(sg, v(0.1 * s, 0, 0), v(0.1 * s, 0, 1));
    parts.push(tag(sg, ft));
  }
  return parts;
}

/** optional per-instance pieces (collapsed in the shader when the look does not use them) */
function slotParts(d: Detail): G[] {
  const H = d === 'hero';
  domeRing = H;
  const parts: G[] = [];
  // hair cap (short hair / fringe / under long hair and pony tails)
  parts.push(tag(H ? hairCap(16, 5) : hairCap(8, 2), BONE.HEAD, SLOT.HAIRCAP));
  // cap: crown (half ellipsoid) + front brim
  const crown = new THREE.SphereGeometry(0.108, H ? 14 : 6, H ? 4 : 2, 0, Math.PI * 2, 0, Math.PI / 2);
  crown.scale(0.86, 0.95, 1.0);
  crown.translate(0, 1.672, 0.008);
  parts.push(tag(crown, BONE.HEAD, SLOT.CAP));
  const brim = new THREE.CylinderGeometry(0.1, 0.1, 0.012, H ? 10 : 5, 1, false, -Math.PI / 2, Math.PI);
  brim.scale(0.85, 1, 1.25);
  brim.rotateX(-0.12);
  brim.translate(0, 1.678, 0.062);
  parts.push(tag(brim, BONE.HEAD, SLOT.CAP));
  // bucket hat
  parts.push(tag(capsule(v(0, 1.66, 0.01), v(0, 1.765, 0.01), [[0, 0.108], [1, 0.09]], H ? 12 : 6, [0, 0.35], 1, 1.05), BONE.HEAD, SLOT.HAT));
  const hb = new THREE.CylinderGeometry(0.17, 0.17, 0.012, H ? 14 : 6, 1, false);
  hb.translate(0, 1.672, 0.01);
  parts.push(tag(hb, BONE.HEAD, SLOT.HAT));
  // long hair: sheet down the back of the head
  parts.push(tag(sheet(0.17, 0.2, 1.7, 1.42, -0.08, 0.035, H ? 4 : 2, H ? 5 : 2), BONE.HEAD, SLOT.HAIR_LONG));
  // pony tail
  const pony = new THREE.ConeGeometry(0.035, 0.24, H ? 8 : 4);
  pony.rotateX(Math.PI + 0.35);
  pony.translate(0, 1.6, -0.125);
  parts.push(tag(pony, BONE.HEAD, SLOT.PONY));
  // bandana (band around the forehead)
  parts.push(tag(capsule(v(0, 1.665, 0.012), v(0, 1.705, 0.012), [[0, 0.084], [1, 0.082]], H ? 14 : 6, [0, 0], 1, 1.18), BONE.HEAD, SLOT.BANDANA));
  // flag worn as a cape (both sides), pivot at the shoulder line
  parts.push(tag(sheet(0.5, 0.78, 1.45, 0.72, -0.13, 0.05, H ? 3 : 2, H ? 5 : 3), BONE.CAPE, SLOT.CAPE));
  return parts;
}

function performerProps(): G[] {
  const parts: G[] = [];
  // hand lanterns (Sacred Flame troupe, f069–f071): a small square lantern hanging from the fist on
  // a bail — glass panes (lit in the shader, dark frame + warm flickering core), roof and base plate
  for (const s of [1, -1]) {
    const slot = s > 0 ? SLOT.LANTERN_L : SLOT.LANTERN_R;
    const hand = s > 0 ? BONE.HAND_L : BONE.HAND_R;
    const x = 0.215 * s;
    const body = new THREE.BoxGeometry(0.11, 0.13, 0.11);
    body.translate(x, 0.59, 0.03);
    parts.push(tag(body, hand, slot));
    const roof = new THREE.ConeGeometry(0.085, 0.05, 4, 1);
    roof.rotateY(Math.PI / 4);
    roof.translate(x, 0.68, 0.03);
    parts.push(tag(roof, hand, slot));
    const base = new THREE.BoxGeometry(0.125, 0.014, 0.125);
    base.translate(x, 0.52, 0.03);
    parts.push(tag(base, hand, slot));
    const bail = new THREE.BoxGeometry(0.008, 0.06, 0.008);
    bail.translate(x, 0.73, 0.03);
    parts.push(tag(bail, hand, slot));
  }
  // handheld microphone (left hand)
  parts.push(tag(capsule(v(0.212, 0.78, 0.05), v(0.212, 0.71, 0.13), [[0, 0.016], [0.6, 0.019], [1, 0.028]], 8, [0.5, 0.9]), BONE.HAND_L, SLOT.MIC));
  // shoulder-mounted camera on the right shoulder
  const cam = new THREE.BoxGeometry(0.13, 0.18, 0.42);
  cam.translate(-0.2, 1.6, 0.06);
  parts.push(tag(cam, BONE.SPINE, SLOT.CAMERA));
  parts.push(tag(capsule(v(-0.2, 1.6, 0.27), v(-0.2, 1.6, 0.38), [[0, 0.05], [1, 0.045]], 8, [0, 0]), BONE.SPINE, SLOT.CAMERA));
  // drone controller held with the right hand
  const ctrl = new THREE.BoxGeometry(0.22, 0.03, 0.14);
  ctrl.translate(-0.215, 0.76, 0.06);
  parts.push(tag(ctrl, BONE.HAND_R, SLOT.CTRL));
  return parts;
}

function merge(parts: G[]): G {
  // every part: position + normal + aBone + index
  for (const p of parts) {
    if (!p.getAttribute('normal')) p.computeVertexNormals();
    for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'aBone') p.deleteAttribute(k);
  }
  const m = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!m) throw new Error('crowd: geometry merge failed');
  m.computeBoundingSphere();
  return m;
}

/** lofted parts get smooth normals (computed before merging so parts never share normals) */
function smooth(parts: G[]): G[] {
  for (const p of parts) if (!p.getAttribute('normal')) p.computeVertexNormals();
  return parts;
}

export function buildNearGeometry(): G {
  return merge(smooth([...bodyParts('near'), ...slotParts('near')]));
}

/** the ~100 people closest to the camera */
export function buildHeroGeometry(): G {
  return merge(smooth([...bodyParts('hero'), ...slotParts('hero')]));
}

/** performers: the hero body (near body on light presets) + lanterns, mic, camera, controller */
export function buildPerformerGeometry(detail: Detail = 'hero'): G {
  return merge(smooth([...bodyParts(detail), ...slotParts(detail), ...performerProps()]));
}

function limb(a: V3, bb: V3, r0: number, r1: number, seg: number): G {
  const len = a.distanceTo(bb);
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, true);
  const mid = a.clone().add(bb).multiplyScalar(0.5);
  const dir = bb.clone().sub(a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.applyQuaternion(q);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

/** ~100-tri body for 15–55 m: lofted pelvis / torso, rounded head, 3-sided limbs (per-vertex lit) */
export function buildMidGeometry(): G {
  const parts: G[] = [];
  parts.push(
    tag(
      loft(
        [
          { y: 0.86, rx: 0.12, rz: 0.086 },
          { y: 1.06, rx: 0.152, rz: 0.098 },
        ],
        5,
        2.4,
        Math.PI / 5,
      ),
      BONE.PELVIS,
    ),
  );
  parts.push(
    tag(
      loft(
        [
          { y: 1.03, rx: 0.15, rz: 0.098 },
          { y: 1.28, rx: 0.17, rz: 0.11, oz: 0.012 },
          { y: 1.42, rx: 0.182, rz: 0.096 },
          { y: 1.49, rx: 0, rz: 0, oz: -0.01 },
        ],
        5,
        2.4,
        Math.PI / 5,
      ),
      BONE.SPINE,
    ),
  );
  parts.push(tag(blob(HEAD_C.clone().setY(1.64), 0.084, 0.118, 0.1, 6, 2), BONE.HEAD));
  for (const s of [1, -1]) {
    parts.push(tag(limb(v(0.19 * s, 1.44, -0.01), v(0.205 * s, 1.13, -0.01), 0.05, 0.042, 3), s > 0 ? BONE.UARM_L : BONE.UARM_R));
    parts.push(tag(limb(v(0.205 * s, 1.13, -0.01), v(0.212 * s, 0.72, 0.0), 0.04, 0.03, 3), s > 0 ? BONE.FARM_L : BONE.FARM_R));
    parts.push(tag(limb(v(0.095 * s, 0.98, 0.0), v(0.1 * s, 0.5, 0.015), 0.085, 0.06, 3), s > 0 ? BONE.THIGH_L : BONE.THIGH_R));
    parts.push(tag(limb(v(0.1 * s, 0.5, 0.015), v(0.1 * s, 0.0, 0.05), 0.058, 0.045, 3), s > 0 ? BONE.SHIN_L : BONE.SHIN_R));
  }
  return merge(smooth(parts));
}

/** unit quad for the far impostors (uv 0..1, anchored at the feet) */
export function buildImpostorGeometry(): G {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/** flag: pole (part 0) + cloth grid (part 1); cloth uv in 0..1 (u along the fly, v down from the top) */
export function buildFlagGeometry(): G {
  const pos: number[] = [];
  const uv: number[] = [];
  const part: number[] = [];
  const idx: number[] = [];
  // pole: 4-sided box from y 0..1 (scaled in the shader), radius 0.016
  const r = 0.016;
  const corners = [
    [r, r], [-r, r], [-r, -r], [r, -r],
  ];
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = corners[i];
    const [x1, z1] = corners[(i + 1) % 4];
    const b = pos.length / 3;
    pos.push(x0, 0, z0, x1, 0, z1, x1, 1, z1, x0, 1, z0);
    for (let k = 0; k < 4; k++) {
      uv.push(0, 0);
      part.push(0);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  // cloth: 10 x 5 grid
  const NU = 10;
  const NV = 5;
  const b0 = pos.length / 3;
  for (let j = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      pos.push(0, 0, 0);
      uv.push(i / NU, j / NV);
      part.push(1);
    }
  }
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const a = b0 + j * (NU + 1) + i;
      const c = a + NU + 1;
      idx.push(a, c, a + 1, a + 1, c, c + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(part), 1));
  g.setIndex(idx);
  return g;
}

/** light sprite quad (phones / lighters), corners in -1..1 */
export function buildSpriteGeometry(): G {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/** triangle count of a (non-indexed or indexed) geometry */
export function triCount(g: G): number {
  return g.index ? g.index.count / 3 : g.getAttribute('position').count / 3;
}
