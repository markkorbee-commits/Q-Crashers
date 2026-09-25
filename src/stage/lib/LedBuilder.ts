import * as THREE from 'three';
import { LED_KIND } from '../materials/LedMaterial';

const _d = new THREE.Vector3();
const _w = new THREE.Vector3();
const _p = new THREE.Vector3();
const _n = new THREE.Vector3();

/**
 * Builds the single merged geometry of all emissive set elements (LED battens, windows, lamps,
 * lanterns, candles, arcade backlights). Attributes: position, normal, uv, aLed = (s, strip, kind, rnd).
 */
export class LedBuilder {
  private pos: number[] = [];
  private nrm: number[] = [];
  private uv: number[] = [];
  private led: number[] = [];
  private strips = 0;
  /** metres of LED batten */
  metres = 0;
  count = { bars: 0, windows: 0, lamps: 0, lanterns: 0, other: 0 };

  newStrip(): number {
    return this.strips++;
  }

  private vert(p: THREE.Vector3, n: THREE.Vector3, u: number, v: number, s: number, strip: number, kind: number, rnd: number): void {
    this.pos.push(p.x, p.y, p.z);
    this.nrm.push(n.x, n.y, n.z);
    this.uv.push(u, v);
    this.led.push(s, strip, kind, rnd);
  }

  /** quad from 4 corners (counter-clockwise seen from the front) */
  private quad4(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, n: THREE.Vector3, uvs: number[], ss: number[], strip: number, kind: number, rnd: number): void {
    const P = [a, b, c, a, c, d];
    const I = [0, 1, 2, 0, 2, 3];
    for (let k = 0; k < 6; k++) {
      const i = I[k];
      this.vert(P[k], n, uvs[i * 2], uvs[i * 2 + 1], ss[i], strip, kind, rnd);
    }
  }

  /**
   * LED batten from a to b facing `out`, `width` metres wide.
   * `s0` = batten coordinate at a (continuous along polylines).
   */
  bar(a: THREE.Vector3, b: THREE.Vector3, out: THREE.Vector3, width = 0.07, strip = this.newStrip(), s0 = 0, kind: number = LED_KIND.bar, rnd = 0): number {
    _d.subVectors(b, a);
    const len = _d.length();
    _d.normalize();
    _w.crossVectors(out, _d).normalize().multiplyScalar(width / 2);
    const lift = _n.copy(out).normalize().multiplyScalar(0.02);
    const A = a.clone().add(lift).sub(_w);
    const B = b.clone().add(lift).sub(_w);
    const C = b.clone().add(lift).add(_w);
    const D = a.clone().add(lift).add(_w);
    const n = out.clone().normalize();
    this.quad4(A, B, C, D, n, [0, 0, 1, 0, 1, 1, 0, 1], [s0, s0 + len, s0 + len, s0], strip, kind, rnd);
    this.metres += len;
    this.count.bars++;
    return s0 + len;
  }

  /** a continuous batten along a polyline */
  polyline(pts: THREE.Vector3[], out: THREE.Vector3 | ((i: number) => THREE.Vector3), width = 0.07, kind: number = LED_KIND.bar): void {
    const strip = this.newStrip();
    let s = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const o = typeof out === 'function' ? out(i) : out;
      s = this.bar(pts[i], pts[i + 1], o, width, strip, s, kind);
    }
  }

  /** flat rectangle centred at c spanned by unit vectors right/up */
  rect(c: THREE.Vector3, right: THREE.Vector3, up: THREE.Vector3, w: number, h: number, kind: number, rnd = 0, strip = 0): void {
    const n = _n.crossVectors(right, up).normalize().clone();
    const rx = right.clone().multiplyScalar(w / 2);
    const uy = up.clone().multiplyScalar(h / 2);
    const A = c.clone().sub(rx).sub(uy);
    const B = c.clone().add(rx).sub(uy);
    const C = c.clone().add(rx).add(uy);
    const D = c.clone().sub(rx).add(uy);
    this.quad4(A, B, C, D, n, [0, 0, 1, 0, 1, 1, 0, 1], [0, w, w, 0], strip, kind, rnd);
    this.tally(kind);
  }

  /** any geometry (e.g. ShapeGeometry of an arched pane), uv remapped to its XY bounding box before transform */
  geometry(src: THREE.BufferGeometry, m: THREE.Matrix4, kind: number, rnd = 0, strip = 0, remapUV = true): void {
    const g = src.index ? src.toNonIndexed() : src.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute;
    const uva = g.attributes.uv as THREE.BufferAttribute | undefined;
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    for (let i = 0; i < pos.count; i++) {
      _p.fromBufferAttribute(pos, i);
      let u: number, v: number;
      if (remapUV || !uva) {
        u = (_p.x - bb.min.x) / Math.max(1e-6, bb.max.x - bb.min.x);
        v = (_p.y - bb.min.y) / Math.max(1e-6, bb.max.y - bb.min.y);
      } else {
        u = uva.getX(i);
        v = uva.getY(i);
      }
      _p.applyMatrix4(m);
      _n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      this.vert(_p, _n, u, v, u * (bb.max.x - bb.min.x), strip, kind, rnd);
    }
    g.dispose();
    this.tally(kind);
  }

  private tally(kind: number): void {
    if (kind === LED_KIND.window) this.count.windows++;
    else if (kind === LED_KIND.lamp) this.count.lamps++;
    else if (kind === LED_KIND.lantern) this.count.lanterns++;
    else this.count.other++;
  }

  get triangles(): number {
    return this.pos.length / 9;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aLed', new THREE.Float32BufferAttribute(this.led, 4));
    g.computeBoundingSphere();
    return g;
  }
}
