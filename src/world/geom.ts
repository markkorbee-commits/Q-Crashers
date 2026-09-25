import * as THREE from 'three';

/**
 * Accumulates transformed primitives into ONE non-indexed BufferGeometry (position, normal, uv,
 * color). Used to merge hundreds of scaffold tubes, barrier bars, fence frames ... into single
 * draw calls. Colours are linear RGB multipliers of the material colour.
 */
export class GeoBuilder {
  private pos: number[] = [];
  private nor: number[] = [];
  private uv: number[] = [];
  private col: number[] = [];
  private readonly m3 = new THREE.Matrix3();
  private readonly v = new THREE.Vector3();
  private readonly n = new THREE.Vector3();
  private static readonly cache = new Map<string, THREE.BufferGeometry>();

  get vertexCount(): number {
    return this.pos.length / 3;
  }

  /** add any geometry with a transform and a flat colour (uv kept or remapped into `uvRect`) */
  add(geo: THREE.BufferGeometry, m: THREE.Matrix4, color: THREE.ColorRepresentation | [number, number, number] = 0xffffff, uvRect?: [number, number, number, number]): this {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.getAttribute('position');
    const nn = g.getAttribute('normal');
    const uu = g.getAttribute('uv');
    const cc = g.getAttribute('color');
    this.m3.getNormalMatrix(m);
    const c = Array.isArray(color) ? color : new THREE.Color(color).toArray();
    for (let i = 0; i < p.count; i++) {
      this.v.fromBufferAttribute(p, i).applyMatrix4(m);
      this.pos.push(this.v.x, this.v.y, this.v.z);
      if (nn) this.n.fromBufferAttribute(nn, i).applyMatrix3(this.m3).normalize();
      else this.n.set(0, 1, 0);
      this.nor.push(this.n.x, this.n.y, this.n.z);
      let u = uu ? uu.getX(i) : 0,
        w = uu ? uu.getY(i) : 0;
      if (uvRect) {
        u = uvRect[0] + u * (uvRect[2] - uvRect[0]);
        w = uvRect[1] + w * (uvRect[3] - uvRect[1]);
      }
      this.uv.push(u, w);
      if (cc) this.col.push(cc.getX(i) * c[0], cc.getY(i) * c[1], cc.getZ(i) * c[2]);
      else this.col.push(c[0], c[1], c[2]);
    }
    return this;
  }

  /** axis-aligned box centred at (x, y, z) (optional yaw about Y) */
  box(w: number, h: number, d: number, x: number, y: number, z: number, color: THREE.ColorRepresentation | [number, number, number] = 0xffffff, yaw = 0, uvRect?: [number, number, number, number]): this {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw), new THREE.Vector3(w, h, d));
    return this.add(GeoBuilder.unit('box'), m, color, uvRect);
  }

  /** box between two points (a tube / beam of square section `t`) */
  beam(a: THREE.Vector3, b: THREE.Vector3, t: number, color: THREE.ColorRepresentation | [number, number, number] = 0xffffff, round = false): this {
    const d = new THREE.Vector3().subVectors(b, a);
    const len = d.length();
    if (len < 1e-4) return this;
    const q = new THREE.Quaternion().setFromUnitVectors(THREE.Object3D.DEFAULT_UP, d.normalize());
    const m = new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(t, len, t));
    return this.add(GeoBuilder.unit(round ? 'cyl6' : 'box'), m, color);
  }

  cylinder(r: number, h: number, x: number, y: number, z: number, color: THREE.ColorRepresentation | [number, number, number] = 0xffffff, seg: 6 | 8 | 12 | 16 = 8, rTop = r): this {
    const key = `cyl${seg}`;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(r, h, r));
    if (rTop !== r) {
      const g = new THREE.CylinderGeometry(rTop, r, h, seg);
      return this.add(g, new THREE.Matrix4().makeTranslation(x, y, z), color);
    }
    return this.add(GeoBuilder.unit(key), m, color);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }

  static unit(kind: string): THREE.BufferGeometry {
    let g = GeoBuilder.cache.get(kind);
    if (!g) {
      if (kind === 'box') g = new THREE.BoxGeometry(1, 1, 1);
      else if (kind.startsWith('cyl')) g = new THREE.CylinderGeometry(1, 1, 1, Number(kind.slice(3)) || 8);
      else g = new THREE.BoxGeometry(1, 1, 1);
      g = g.toNonIndexed();
      GeoBuilder.cache.set(kind, g);
    }
    return g;
  }
}

/** linear RGB triple from a hex/sRGB colour */
export function lin(c: THREE.ColorRepresentation): [number, number, number] {
  return new THREE.Color(c).toArray() as [number, number, number];
}
