import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Procedural hard-surface toolkit for the dragon crown.
 * Every builder returns an indexed BufferGeometry with position / normal / uv. `Bucket` merges
 * pieces per material and adds the shared vertex attributes (colour tint + fx channel), so the
 * whole crown ends up as a handful of draw calls.
 */

export type V3 = THREE.Vector3;
export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const v2 = (x = 0, y = 0) => new THREE.Vector2(x, y);

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

/** Ensure an index exists (sequential for non-indexed geometry). */
export function ensureIndexed(g: THREE.BufferGeometry): THREE.BufferGeometry {
  if (g.index) return g;
  const n = g.getAttribute('position').count;
  const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

/**
 * Per-material geometry collector. `add` bakes a transform, a colour tint and an fx value into the
 * piece; `build` merges everything into one geometry.
 */
export class Bucket {
  private parts: THREE.BufferGeometry[] = [];
  tris = 0;
  add(g: THREE.BufferGeometry, m?: THREE.Matrix4 | null, color: THREE.ColorRepresentation = 0xffffff, fx = 0): void {
    const geo = ensureIndexed(g.index ? g : g);
    if (m) geo.applyMatrix4(m);
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    if (!geo.getAttribute('uv')) {
      const n = geo.getAttribute('position').count;
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    }
    const n = geo.getAttribute('position').count;
    const c = new THREE.Color(color);
    const col = new Float32Array(n * 3);
    const f = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      f[i] = fx;
    }
    // keep a pre-existing colour attribute (e.g. gradient teeth) multiplied by the tint
    const old = geo.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (old && old.itemSize === 3) {
      for (let i = 0; i < n; i++) {
        col[i * 3] *= old.getX(i);
        col[i * 3 + 1] *= old.getY(i);
        col[i * 3 + 2] *= old.getZ(i);
      }
    }
    const oldFx = geo.getAttribute('fx') as THREE.BufferAttribute | undefined;
    if (oldFx) for (let i = 0; i < n; i++) f[i] = Math.max(f[i], oldFx.getX(i));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('fx', new THREE.BufferAttribute(f, 1));
    for (const k of Object.keys(geo.attributes)) {
      if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'color' && k !== 'fx') geo.deleteAttribute(k);
    }
    geo.morphAttributes = {};
    geo.clearGroups();
    this.tris += geo.index!.count / 3;
    this.parts.push(geo);
  }
  get empty(): boolean {
    return this.parts.length === 0;
  }
  build(): THREE.BufferGeometry {
    if (!this.parts.length) return new THREE.BufferGeometry();
    // unify index type
    const big = this.parts.reduce((s, g) => s + g.getAttribute('position').count, 0) > 65535;
    for (const g of this.parts) {
      const idx = g.index!;
      const want = big ? Uint32Array : Uint16Array;
      if (!(idx.array instanceof want)) g.setIndex(new THREE.BufferAttribute(want.from(idx.array as ArrayLike<number>), 1));
    }
    const out = mergeGeometries(this.parts, false)!;
    for (const g of this.parts) g.dispose();
    this.parts = [];
    out.computeBoundingSphere();
    out.computeBoundingBox();
    return out;
  }
}

/** Matrix placing local +Y along `dir` at `pos`, with optional roll around the axis and scale. */
export function frameY(pos: V3, dir: V3, roll = 0, scale = 1, upHint?: V3): THREE.Matrix4 {
  const y = _a.copy(dir).normalize();
  const hint = upHint ? _b.copy(upHint) : Math.abs(y.z) < 0.9 ? _b.set(0, 0, 1) : _b.set(1, 0, 0);
  const x = _c.crossVectors(y, hint).normalize();
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  if (roll) m.multiply(new THREE.Matrix4().makeRotationY(roll));
  m.scale(_s.setScalar(scale));
  m.setPosition(pos);
  return m;
}

/**
 * Right-handed orthonormal frame with local +Z along `zAxis` (e.g. a plate normal) and local +Y as
 * close as possible to `yHint`.
 */
export function basisZ(zAxis: V3, yHint: V3, pos: V3): THREE.Matrix4 {
  const z = zAxis.clone().normalize();
  const x = new THREE.Vector3().crossVectors(yHint, z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(pos);
}

/** Matrix from an explicit basis (columns) and position. */
export function basis(x: V3, y: V3, z: V3, pos: V3): THREE.Matrix4 {
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(pos);
}

export function trs(pos: V3, rot: THREE.Euler | THREE.Quaternion | null, scale: number | V3 = 1): THREE.Matrix4 {
  if (rot instanceof THREE.Euler) _q.setFromEuler(rot);
  else if (rot) _q.copy(rot);
  else _q.identity();
  if (typeof scale === 'number') _s.setScalar(scale);
  else _s.copy(scale);
  return _m.compose(pos, _q, _s).clone();
}

/** Parallel-transport frames along a polyline. */
export function frames(pts: V3[]): { T: V3[]; N: V3[]; B: V3[] } {
  const n = pts.length;
  const T: V3[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    T.push(new THREE.Vector3().subVectors(b, a).normalize());
  }
  const N: V3[] = [];
  const B: V3[] = [];
  const t0 = T[0];
  const ref = Math.abs(t0.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0);
  let nn = new THREE.Vector3().crossVectors(t0, ref).normalize();
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const axis = new THREE.Vector3().crossVectors(T[i - 1], T[i]);
      const len = axis.length();
      if (len > 1e-6) {
        axis.divideScalar(len);
        const ang = Math.acos(THREE.MathUtils.clamp(T[i - 1].dot(T[i]), -1, 1));
        nn = nn.clone().applyAxisAngle(axis, ang);
      }
    }
    N.push(nn.clone());
    B.push(new THREE.Vector3().crossVectors(T[i], nn).normalize());
  }
  return { T, N, B };
}

export interface TubeOpts {
  radial?: number;
  /** cross-section shape multiplier by angle (0..2PI) -> radius factor */
  shape?: (a: number) => number;
  capStart?: boolean;
  capEnd?: boolean;
  /** metres of tube per texture v unit */
  vScale?: number;
  /** reference up vector for the cross-section orientation (keeps flat sides consistent) */
  up?: V3;
  /** cross-section scale along the binormal axis (elliptical tubes) */
  aspect?: number;
  /** cross-section scale along the normal axis (with `up`, N is the axis closest to `up`) */
  aspectN?: number;
}

/** Tube along sampled points with a radius function r(t), t in [0,1]. */
export function tube(pts: V3[], r: (t: number) => number, o: TubeOpts = {}): THREE.BufferGeometry {
  const radial = o.radial ?? 12;
  const n = pts.length;
  let T: V3[], N: V3[], B: V3[];
  if (o.up) {
    T = [];
    N = [];
    B = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n - 1, i + 1)];
      const t = new THREE.Vector3().subVectors(b, a).normalize();
      const bn = new THREE.Vector3().crossVectors(t, o.up).normalize();
      const nn = new THREE.Vector3().crossVectors(bn, t).normalize();
      T.push(t);
      N.push(nn);
      B.push(bn);
    }
  } else ({ T, N, B } = frames(pts));
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let len = 0;
  const vScale = o.vScale ?? 4;
  const aspect = o.aspect ?? 1;
  const aspectN = o.aspectN ?? 1;
  for (let i = 0; i < n; i++) {
    if (i > 0) len += pts[i].distanceTo(pts[i - 1]);
    const t = i / (n - 1);
    const rr = r(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const k = o.shape ? o.shape(a) : 1;
      const cx = Math.cos(a) * rr * k * aspectN;
      const cy = Math.sin(a) * rr * k * aspect;
      pos.push(pts[i].x + N[i].x * cx + B[i].x * cy, pts[i].y + N[i].y * cx + B[i].y * cy, pts[i].z + N[i].z * cx + B[i].z * cy);
      uv.push(j / radial, len / vScale);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const addCap = (i: number, flip: boolean) => {
    const c = pos.length / 3;
    pos.push(pts[i].x, pts[i].y, pts[i].z);
    uv.push(0.5, 0.5);
    const base = i * (radial + 1);
    for (let j = 0; j < radial; j++) {
      if (flip) idx.push(c, base + j + 1, base + j);
      else idx.push(c, base + j, base + j + 1);
    }
  };
  if (o.capStart) addCap(0, true);
  if (o.capEnd) addCap(n - 1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Sample a THREE curve into points. */
export function sample(curve: THREE.Curve<THREE.Vector3>, n: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) out.push(curve.getPoint(i / n));
  return out;
}

/** Quadratic bezier sample. */
export function bez2(a: V3, c: V3, b: V3, n: number): V3[] {
  return sample(new THREE.QuadraticBezierCurve3(a, c, b), n);
}
export function bez3(a: V3, c1: V3, c2: V3, b: V3, n: number): V3[] {
  return sample(new THREE.CubicBezierCurve3(a, c1, c2, b), n);
}
export function spline(pts: V3[], n: number, tension = 0.5): V3[] {
  return sample(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', tension), n);
}

/**
 * Tapered, optionally curved and faceted horn/spike along local +Y from the origin.
 * `bend` pushes the tip sideways (local X) quadratically; `sides` 4-6 gives a machined look.
 */
export function spike(len: number, r0: number, opts: { sides?: number; segs?: number; bend?: number; bendZ?: number; tipR?: number; twist?: number; flat?: number } = {}): THREE.BufferGeometry {
  const sides = opts.sides ?? 8;
  const segs = opts.segs ?? 6;
  const bend = opts.bend ?? 0;
  const bendZ = opts.bendZ ?? 0;
  const tipR = opts.tipR ?? 0.02;
  const flat = opts.flat ?? 1;
  const pts: V3[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push(v3(bend * t * t, len * t, bendZ * t * t));
  }
  const g = tube(
    pts,
    (t) => THREE.MathUtils.lerp(r0, tipR, Math.pow(t, 0.85)),
    { radial: sides, capStart: true, capEnd: false, aspect: flat, up: v3(0, 0, 1), vScale: len },
  );
  return g;
}

/** Parametric grid surface. f(u,v) -> point. UV = (u,v) scaled. */
export function surface(nu: number, nv: number, f: (u: number, v: number, out: V3) => void, uvScale: [number, number] = [1, 1], doubleWinding = false): THREE.BufferGeometry {
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3);
  const uv = new Float32Array((nu + 1) * (nv + 1) * 2);
  const p = v3();
  let k = 0;
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      f(i / nu, j / nv, p);
      pos[k * 3] = p.x;
      pos[k * 3 + 1] = p.y;
      pos[k * 3 + 2] = p.z;
      uv[k * 2] = (i / nu) * uvScale[0];
      uv[k * 2 + 1] = (j / nv) * uvScale[1];
      k++;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + nu + 1;
      if (doubleWinding) idx.push(a, a + 1, b, a + 1, b + 1, b);
      else idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Loft through rings of points (each ring same length). closedRing: last connects to first. */
export function loft(rings: V3[][], closedRing: boolean, vScale = 4): THREE.BufferGeometry {
  const m = rings[0].length;
  const cols = closedRing ? m + 1 : m;
  const pos: number[] = [];
  const uv: number[] = [];
  let along = 0;
  for (let i = 0; i < rings.length; i++) {
    if (i > 0) {
      // average ring distance
      let d = 0;
      for (let j = 0; j < m; j++) d += rings[i][j].distanceTo(rings[i - 1][j]);
      along += d / m;
    }
    let around = 0;
    for (let j = 0; j < cols; j++) {
      const p = rings[i][j % m];
      if (j > 0) around += p.distanceTo(rings[i][(j - 1) % m]);
      pos.push(p.x, p.y, p.z);
      uv.push(around / vScale, along / vScale);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      const b = a + cols;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Extruded (beveled) plate from a 2D outline in the XY plane, thickness along +Z. */
export function plate(outline: THREE.Vector2[], depth: number, bevel = 0.05, holes: THREE.Vector2[][] = [], curveSegs = 1): THREE.BufferGeometry {
  const shape = new THREE.Shape(outline);
  for (const h of holes) shape.holes.push(new THREE.Path(h));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: curveSegs,
    steps: 1,
  });
  g.translate(0, 0, -depth / 2);
  const out = ensureIndexed(g);
  scaleUv(out, 1 / 3, 1 / 3);
  return out;
}

/** Multiply the uv attribute (texture tiles per metre for built-in geometries). */
export function scaleUv(g: THREE.BufferGeometry, su: number, sv: number): THREE.BufferGeometry {
  const uv = g.getAttribute('uv') as THREE.BufferAttribute | undefined;
  if (!uv) return g;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return g;
}

/** Circle outline helper. */
export function circle(cx: number, cy: number, r: number, n = 12, rev = false): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((rev ? -i : i) / n) * Math.PI * 2;
    out.push(v2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return out;
}

/** Curved sickle/scimitar blade outline pointing along +Y (base at origin, width along X). */
export function sickleOutline(len: number, width: number, curve: number, n = 8): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  // outer (convex) edge from base-left to tip, inner edge back to base-right
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = -width / 2 + curve * t * t + (width / 2) * t * 0.2;
    out.push(v2(x - (width / 2) * (1 - t) * 0.0, len * t));
  }
  for (let i = n - 1; i >= 1; i--) {
    const t = i / n;
    const w = width * (1 - t) ** 0.9;
    const x = -width / 2 + curve * t * t + w;
    out.push(v2(x, len * t * 0.97));
  }
  out.push(v2(width / 2, 0));
  return out;
}

/** Simple icosahedron-ish gem (for studs / crystal knuckles). */
export function gem(r: number, detail = 0): THREE.BufferGeometry {
  return ensureIndexed(new THREE.OctahedronGeometry(r, detail));
}

export function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return ensureIndexed(new THREE.BoxGeometry(w, h, d));
}

/** Torus ring lying in XY plane. */
export function ring(R: number, r: number, radial = 6, tubular = 32, arc = Math.PI * 2): THREE.BufferGeometry {
  return ensureIndexed(new THREE.TorusGeometry(R, r, radial, tubular, arc));
}

/** Point on a quadratic bezier. */
export function qbez(a: V3, c: V3, b: V3, t: number, out = v3()): V3 {
  const u = 1 - t;
  return out.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  );
}

/** Polyline helpers: cumulative length + point at distance fraction. */
export class Polyline {
  readonly cum: number[] = [0];
  readonly length: number;
  constructor(readonly pts: V3[]) {
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    this.length = this.cum[this.cum.length - 1];
  }
  at(t: number, out = v3()): V3 {
    const d = THREE.MathUtils.clamp(t, 0, 1) * this.length;
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    return out.lerpVectors(this.pts[i - 1], this.pts[i], (d - this.cum[i - 1]) / seg);
  }
  tangent(t: number, out = v3()): V3 {
    const a = this.at(Math.max(0, t - 0.01));
    const b = this.at(Math.min(1, t + 0.01));
    return out.subVectors(b, a).normalize();
  }
}

/** Deterministic PRNG shortcut for builders. */
export function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Vertex-colour gradient along local Y (for teeth, horns): c0 at y0 -> c1 at y1. */
export function gradientY(g: THREE.BufferGeometry, y0: number, y1: number, c0: THREE.Color, c1: THREE.Color, pow = 1): THREE.BufferGeometry {
  const p = g.getAttribute('position');
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = Math.pow(THREE.MathUtils.clamp((p.getY(i) - y0) / (y1 - y0), 0, 1), pow);
    col[i * 3] = c0.r + (c1.r - c0.r) * t;
    col[i * 3 + 1] = c0.g + (c1.g - c0.g) * t;
    col[i * 3 + 2] = c0.b + (c1.b - c0.b) * t;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** Set an fx channel on every vertex (merged with Bucket's fx via max). */
export function withFx(g: THREE.BufferGeometry, fx: number): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  g.setAttribute('fx', new THREE.BufferAttribute(new Float32Array(n).fill(fx), 1));
  return g;
}
