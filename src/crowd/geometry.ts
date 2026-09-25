import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BONE, SLOT } from './constants';

/**
 * Procedural low-poly people for the GPU-skinned crowd. Every piece is authored in the rest pose of
 * a 1.75 m reference body (metres, facing +Z, feet at y = 0) and tagged with `aBone`
 * (= bone + 32 · slot). The vertex shader rotates each rigid segment around its joint pivot
 * (see PIVOTS in shaders.ts) and scales/places the result per instance.
 *
 *  - near LOD  (~330 tris incl. optional accessories): separate head, neck, torso, pelvis, upper
 *    arms, forearms, hands, thighs, shins with feet; caps, bucket hats, long hair, pony tails,
 *    bandanas and flag capes are optional slots collapsed per instance.
 *  - mid LOD   (~70 tris): prisms per segment, octahedral head.
 *  - performer (near LOD + hand lanterns, mic, shoulder camera, drone controller).
 */

type G = THREE.BufferGeometry;

function tag(g: G, bone: number, slot = 0): G {
  const geo = g.index ? g.toNonIndexed() : g;
  if (geo !== g) g.dispose();
  geo.deleteAttribute('uv');
  const n = geo.getAttribute('position').count;
  const a = new Float32Array(n).fill(bone + 32 * slot);
  geo.setAttribute('aBone', new THREE.BufferAttribute(a, 1));
  return geo;
}

/** cylinder between two points (y up axis), radii r0 at a, r1 at b */
function limb(a: THREE.Vector3, bb: THREE.Vector3, r0: number, r1: number, seg: number, open = true, sz = 1): G {
  const len = a.distanceTo(bb);
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, open);
  g.scale(1, 1, sz);
  const mid = a.clone().add(bb).multiplyScalar(0.5);
  const dir = bb.clone().sub(a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.applyQuaternion(q);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number): G {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function octa(r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): G {
  const g = new THREE.OctahedronGeometry(r, 0);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Lofted body segment from horizontal rings [y, half-width, half-depth, z-offset] with a
 * superellipse cross-section (flat-ish back and chest, rounded flanks).
 */
function rings(rs: [number, number, number, number][], seg: number, capTop: boolean): G {
  const pos: number[] = [];
  const idx: number[] = [];
  const n = 2.6;
  for (const [y, hw, hd, oz] of rs) {
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2 + Math.PI / seg;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const x = hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const z = hd * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n) + oz;
      pos.push(x, y, z);
    }
  }
  for (let r = 0; r < rs.length - 1; r++) {
    for (let i = 0; i < seg; i++) {
      const a = r * seg + i;
      const b = r * seg + ((i + 1) % seg);
      const c = a + seg;
      const d = b + seg;
      idx.push(a, c, b, b, c, d);
    }
  }
  if (capTop) {
    const top = pos.length / 3;
    const [y, , , oz] = rs[rs.length - 1];
    pos.push(0, y + 0.005, oz);
    const base = (rs.length - 1) * seg;
    for (let i = 0; i < seg; i++) idx.push(base + i, top, base + ((i + 1) % seg));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** both-sided flat grid (cape / long hair), returns merged front + back */
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
  // the sheet faces -Z (outwards from the back)
  g.rotateY(0);
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
  const m = mergeGeometries([g.toNonIndexed(), back.toNonIndexed()], false)!;
  g.dispose();
  back.dispose();
  return m;
}

function nearParts(): G[] {
  const parts: G[] = [];
  const L = 1;
  const R = -1;
  // pelvis / hips + sculpted torso (sloped shoulders, chest, waist) from profile rings
  parts.push(
    tag(
      rings(
        [
          [0.855, 0.1, 0.085, 0],
          [0.93, 0.16, 0.1, 0],
          [1.06, 0.152, 0.098, 0],
        ],
        8,
        false,
      ),
      BONE.PELVIS,
    ),
  );
  parts.push(
    tag(
      rings(
        [
          [1.03, 0.152, 0.1, 0],
          [1.13, 0.146, 0.098, 0.004],
          [1.27, 0.168, 0.112, 0.016],
          [1.38, 0.184, 0.108, 0.006],
          [1.44, 0.17, 0.085, -0.008],
          [1.48, 0.07, 0.058, -0.01],
        ],
        8,
        true,
      ),
      BONE.SPINE,
    ),
  );
  // neck + head (with a hint of nose and jaw so profiles read)
  parts.push(tag(limb(v(0, 1.44, -0.01), v(0, 1.56, 0.0), 0.058, 0.05, 6), BONE.HEAD));
  const head = new THREE.SphereGeometry(0.1, 7, 5);
  head.scale(0.8, 1.12, 0.98);
  head.translate(0, 1.645, 0.012);
  parts.push(tag(head, BONE.HEAD));
  const nose = new THREE.ConeGeometry(0.018, 0.045, 4);
  nose.rotateX(Math.PI / 2);
  nose.translate(0, 1.625, 0.105);
  parts.push(tag(nose, BONE.HEAD));
  for (const s of [L, R]) {
    const ua = s > 0 ? BONE.UARM_L : BONE.UARM_R;
    const fa = s > 0 ? BONE.FARM_L : BONE.FARM_R;
    const ha = s > 0 ? BONE.HAND_L : BONE.HAND_R;
    const th = s > 0 ? BONE.THIGH_L : BONE.THIGH_R;
    const sh = s > 0 ? BONE.SHIN_L : BONE.SHIN_R;
    // shoulder cap + upper arm + elbow + forearm + hand
    parts.push(tag(octa(0.062, 0.185 * s, 1.415, -0.01, 1, 0.9, 0.95), ua));
    parts.push(tag(limb(v(0.19 * s, 1.42, -0.01), v(0.205 * s, 1.13, -0.01), 0.047, 0.037, 6), ua));
    parts.push(tag(octa(0.038, 0.205 * s, 1.13, -0.01), fa));
    parts.push(tag(limb(v(0.205 * s, 1.13, -0.01), v(0.21 * s, 0.885, 0.0), 0.037, 0.027, 6), fa));
    const hand = new THREE.CylinderGeometry(0.036, 0.03, 0.15, 5, 1, false);
    hand.scale(0.62, 1, 1.15);
    hand.translate(0.212 * s, 0.81, 0.008);
    parts.push(tag(hand, ha));
    // thigh + knee + shin + foot
    parts.push(tag(limb(v(0.095 * s, 0.97, 0.0), v(0.1 * s, 0.5, 0.015), 0.088, 0.058, 7), th));
    parts.push(tag(limb(v(0.1 * s, 0.5, 0.015), v(0.1 * s, 0.09, 0.0), 0.054, 0.038, 6), sh));
    const foot = box(0.095, 0.08, 0.26, 0.1 * s, 0.042, 0.06);
    parts.push(tag(foot, s > 0 ? BONE.FOOT_L : BONE.FOOT_R));
  }
  // --- optional slots ---
  // cap: crown (half sphere) + front brim
  const crown = new THREE.SphereGeometry(0.108, 7, 2, 0, Math.PI * 2, 0, Math.PI / 2);
  crown.scale(0.86, 0.95, 1.0);
  crown.translate(0, 1.672, 0.008);
  parts.push(tag(crown, BONE.HEAD, SLOT.CAP));
  const brim = new THREE.CylinderGeometry(0.1, 0.1, 0.012, 6, 1, false, -Math.PI / 2, Math.PI);
  brim.scale(0.85, 1, 1.25);
  brim.rotateX(-0.12);
  brim.translate(0, 1.678, 0.062);
  parts.push(tag(brim, BONE.HEAD, SLOT.CAP));
  // bucket hat
  parts.push(tag(limb(v(0, 1.66, 0.01), v(0, 1.765, 0.01), 0.108, 0.09, 7, false, 1.05), BONE.HEAD, SLOT.HAT));
  const hb = new THREE.CylinderGeometry(0.17, 0.17, 0.012, 8, 1, false);
  hb.translate(0, 1.672, 0.01);
  parts.push(tag(hb, BONE.HEAD, SLOT.HAT));
  // long hair: sheet down the back of the head
  parts.push(tag(sheet(0.16, 0.2, 1.72, 1.42, -0.07, 0.03, 2, 3), BONE.HEAD, SLOT.HAIR_LONG));
  // pony tail
  const pony = new THREE.ConeGeometry(0.035, 0.24, 5);
  pony.rotateX(Math.PI + 0.35);
  pony.translate(0, 1.6, -0.125);
  parts.push(tag(pony, BONE.HEAD, SLOT.PONY));
  // bandana (band around the forehead)
  parts.push(tag(limb(v(0, 1.665, 0.012), v(0, 1.705, 0.012), 0.084, 0.082, 8, true, 1.18), BONE.HEAD, SLOT.BANDANA));
  // flag worn as a cape (both sides), pivot at the shoulder line
  parts.push(tag(sheet(0.5, 0.78, 1.45, 0.72, -0.13, 0.05, 2, 3), BONE.CAPE, SLOT.CAPE));
  return parts;
}

function performerProps(): G[] {
  const parts: G[] = [];
  // hand lanterns: square lantern boxes hanging from the hands (Sacred Flame troupe, f069–f071)
  for (const s of [1, -1]) {
    const slot = s > 0 ? SLOT.LANTERN_L : SLOT.LANTERN_R;
    const hand = s > 0 ? BONE.HAND_L : BONE.HAND_R;
    parts.push(tag(box(0.17, 0.2, 0.17, 0.215 * s, 0.63, 0.03), hand, slot));
    parts.push(tag(box(0.012, 0.08, 0.012, 0.215 * s, 0.75, 0.03), hand, slot));
  }
  // handheld microphone (left hand)
  parts.push(tag(limb(v(0.212, 0.78, 0.05), v(0.212, 0.72, 0.12), 0.018, 0.028, 6, false), BONE.HAND_L, SLOT.MIC));
  // shoulder-mounted camera on the right shoulder
  parts.push(tag(box(0.13, 0.18, 0.42, -0.2, 1.6, 0.06), BONE.SPINE, SLOT.CAMERA));
  parts.push(tag(limb(v(-0.2, 1.6, 0.27), v(-0.2, 1.6, 0.38), 0.05, 0.045, 6, false), BONE.SPINE, SLOT.CAMERA));
  // drone controller held with the right hand
  parts.push(tag(box(0.22, 0.03, 0.14, -0.215, 0.76, 0.06), BONE.HAND_R, SLOT.CTRL));
  return parts;
}

function merge(parts: G[]): G {
  const m = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!m) throw new Error('crowd: geometry merge failed');
  m.computeBoundingSphere();
  return m;
}

export function buildNearGeometry(): G {
  return merge(nearParts());
}

export function buildPerformerGeometry(): G {
  return merge([...nearParts(), ...performerProps()]);
}

export function buildMidGeometry(): G {
  const parts: G[] = [];
  const pelvis = new THREE.CylinderGeometry(0.15, 0.16, 0.24, 4, 1, true);
  pelvis.rotateY(Math.PI / 4);
  pelvis.scale(1, 1, 0.66);
  pelvis.translate(0, 0.975, 0);
  parts.push(tag(pelvis, BONE.PELVIS));
  const torso = new THREE.CylinderGeometry(0.19, 0.15, 0.44, 4, 1, false);
  torso.rotateY(Math.PI / 4);
  torso.scale(1, 1, 0.62);
  torso.translate(0, 1.26, 0);
  parts.push(tag(torso, BONE.SPINE));
  parts.push(tag(octa(0.11, 0, 1.64, 0.01, 0.78, 1.2, 0.95), BONE.HEAD));
  for (const s of [1, -1]) {
    parts.push(tag(limb(v(0.19 * s, 1.44, -0.01), v(0.205 * s, 1.13, -0.01), 0.055, 0.045, 3), s > 0 ? BONE.UARM_L : BONE.UARM_R));
    parts.push(tag(limb(v(0.205 * s, 1.13, -0.01), v(0.212 * s, 0.72, 0.0), 0.045, 0.035, 3), s > 0 ? BONE.FARM_L : BONE.FARM_R));
    parts.push(tag(limb(v(0.095 * s, 0.98, 0.0), v(0.1 * s, 0.5, 0.015), 0.085, 0.06, 3), s > 0 ? BONE.THIGH_L : BONE.THIGH_R));
    parts.push(tag(limb(v(0.1 * s, 0.5, 0.015), v(0.1 * s, 0.0, 0.05), 0.058, 0.045, 3), s > 0 ? BONE.SHIN_L : BONE.SHIN_R));
  }
  return merge(parts);
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
  // pole: 4-sided box from y 0..1 (scaled in the shader), radius 0.018
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
