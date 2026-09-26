import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Accumulates static world-space geometry for ONE material and merges it into a single
 * BufferGeometry (one draw call). Every part is converted to non-indexed triangles, transformed,
 * given world-space box-projected UVs (metres * uvScale) unless it keeps its own, a per-part
 * vertex colour (tint) and an optional per-part float attribute `aGroup` (glow group etc.).
 */
export type UVMode = 'box' | 'keep';

export interface PartOpts {
  /** vertex colour tint (default white) */
  color?: THREE.Color;
  uv?: UVMode;
  /** value of the aGroup attribute (only when the bucket was created with groups) */
  group?: number;
  /** keep the part's own per-vertex `color` attribute (when it has one) instead of the flat tint */
  keepColor?: boolean;
}

const _n = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const WHITE = new THREE.Color(1, 1, 1);

export class GeoBucket {
  private parts: THREE.BufferGeometry[] = [];
  triangles = 0;

  constructor(
    readonly name: string,
    /** texture repeats per metre for box UVs */
    readonly uvScale = 0.25,
    readonly withGroups = false,
  ) {}

  get empty(): boolean {
    return this.parts.length === 0;
  }

  /** add a geometry (the source geometry is not modified) transformed by `m` */
  add(src: THREE.BufferGeometry, m?: THREE.Matrix4, o: PartOpts = {}): void {
    let g = src.index ? src.toNonIndexed() : src.clone();
    const keepCol = o.keepColor === true && !!g.attributes.color && g.attributes.color.itemSize === 3;
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv' && !(keepCol && k === 'color')) g.deleteAttribute(k);
    if (m) g.applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    if (o.uv === 'keep' && g.attributes.uv) {
      // keep
    } else {
      boxUV(g, this.uvScale);
    }
    if (!keepCol) {
      const col = o.color ?? WHITE;
      const ca = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        ca[i * 3] = col.r;
        ca[i * 3 + 1] = col.g;
        ca[i * 3 + 2] = col.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
    }
    if (this.withGroups) g.setAttribute('aGroup', new THREE.BufferAttribute(new Float32Array(n).fill(o.group ?? 0), 1));
    this.triangles += n / 3;
    this.parts.push(g);
    if (g !== src) {
      // nothing: the clone is owned by the bucket
    }
  }

  /** merged geometry (null when empty); the bucket is cleared */
  build(): THREE.BufferGeometry | null {
    if (!this.parts.length) return null;
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    if (!merged) return null;
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    return merged;
  }
}

/** world-space planar UVs chosen per triangle by the dominant axis of its face normal */
export function boxUV(g: THREE.BufferGeometry, scale: number): void {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const n = pos.count;
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i += 3) {
    _a.fromBufferAttribute(pos, i);
    _b.fromBufferAttribute(pos, i + 1);
    _c.fromBufferAttribute(pos, i + 2);
    _n.subVectors(_c, _b).cross(_a.clone().sub(_b));
    const ax = Math.abs(_n.x),
      ay = Math.abs(_n.y),
      az = Math.abs(_n.z);
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(i + k),
        y = pos.getY(i + k),
        z = pos.getZ(i + k);
      let u: number, v: number;
      if (ay >= ax && ay >= az) {
        u = x;
        v = z;
      } else if (ax >= az) {
        u = _n.x > 0 ? -z : z;
        v = y;
      } else {
        u = _n.z > 0 ? x : -x;
        v = y;
      }
      uv[(i + k) * 2] = u * scale;
      uv[(i + k) * 2 + 1] = v * scale;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// ---------------------------------------------------------------------------------------------
// small matrix helpers (allocation is fine: build time only)

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

/** translation + euler rotation (radians, XYZ order) + scale */
export function trs(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): THREE.Matrix4 {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  _s.set(sx, sy, sz);
  _p.set(x, y, z);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

/** matrix placing a unit primitive between two points (primitive axis = +Y) */
export function between(a: THREE.Vector3, b: THREE.Vector3, sx = 1, sz = 1): THREE.Matrix4 {
  const d = _p.subVectors(b, a);
  const len = d.length();
  _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  _s.set(sx, len, sz);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return _m.compose(mid, _q, _s).clone();
}

/** local frame: origin + x axis (horizontal direction in XZ) — returns a matrix mapping local (u, y, w) */
export function frameAlong(ox: number, oz: number, dirX: number, dirZ: number, oy = 0): THREE.Matrix4 {
  const len = Math.hypot(dirX, dirZ) || 1;
  const ux = dirX / len,
    uz = dirZ / len;
  // local x -> (ux, 0, uz); local y -> up; local z -> (uz, 0, -ux) ... choose right-handed: z = x cross y
  // x cross y = (ux,0,uz) x (0,1,0) = (-uz, 0, ux)
  return new THREE.Matrix4().set(ux, 0, -uz, ox, 0, 1, 0, oy, uz, 0, ux, oz, 0, 0, 0, 1);
}
