import * as THREE from 'three';
import { boxMinMax, METAL, rod, type StageKit } from '../kit';
import { L } from '../layout';

/**
 * Main PA (design-bible §5.9): four flown 20 x K1 arrays (1.34 m boxes, Y 4.9…14.2, bumper 14.6),
 * inner hangs at (±11, Z −4) and outer hangs at (±31, Z −6), each with a 10 x K2 side hang outboard,
 * flown from a black 1 m lattice truss tower standing on the deck beside it (top Y 16.5, with a
 * fixture platform and a steel blade finial) through a header beam.
 */
export class SpeakerBuilder {
  constructor(private kit: StageKit) {}

  build(): void {
    for (const s of [1, -1]) {
      this.hang(s * L.innerHangX, L.innerHangZ, s);
      this.hang(s * L.outerHangX, L.outerHangZ, s);
    }
  }

  private hang(x: number, zHang: number, s: number): void {
    const k = this.kit;
    const K = L.k1;
    const top = L.arrayTop;
    const k2x = x + s * (K.w + 0.16);
    const tx = x + s * 2.85;
    const hTop = L.trussTop;
    this.truss(tx, L.deckY, zHang, hTop, 0.9);
    // header beam from the tower over the K2 and K1 hangs
    const hb0 = Math.min(tx, x - s * 0.9),
      hb1 = Math.max(tx, x - s * 0.9);
    boxMinMax(k.metal, hb0, top + 0.8, zHang - 0.3, hb1, top + 1.2, zHang + 0.3, METAL.black);
    // bumper + chain motors
    boxMinMax(k.metal, x - 0.75, top, zHang - 0.4, x + 0.75, L.bumperY, zHang + 0.2, METAL.black);
    for (const dz of [-0.2, 0.05]) rod(k.metal, new THREE.Vector3(x, L.bumperY, zHang + dz), new THREE.Vector3(x, top + 0.8, zHang + dz), 0.04, METAL.steel);
    boxMinMax(k.metal, x - 0.2, top + 0.55, zHang - 0.25, x + 0.2, top + 0.8, zHang + 0.1, METAL.black);
    // J-curve K1 array: 20 boxes, the splay grows towards the bottom
    const n = 20;
    const splay = [0, 0.25, 0.25, 0.5, 0.5, 0.75, 1, 1, 1.5, 1.5, 2, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7];
    const pivot = new THREE.Vector3(x, top, zHang + 0.02);
    let ang = THREE.MathUtils.degToRad(1.0);
    const box = new THREE.BoxGeometry(K.w, K.h - 0.012, K.d);
    let bottom: number = top;
    for (let i = 0; i < n; i++) {
      ang += THREE.MathUtils.degToRad(splay[i]);
      const r = new THREE.Matrix4().makeRotationX(ang);
      const m = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(r).multiply(new THREE.Matrix4().makeTranslation(0, -(K.h + 0.025) / 2, -K.d / 2));
      k.speaker.add(box, m, { uv: 'keep' });
      pivot.add(new THREE.Vector3(0, -(K.h + 0.025), 0).applyMatrix4(r));
      bottom = pivot.y;
    }
    box.dispose();
    // K2 side hang (10 boxes, slight J) outboard
    const K2 = L.k2;
    const b2 = new THREE.BoxGeometry(K2.w, K2.h - 0.01, K2.d);
    boxMinMax(k.metal, k2x - 0.72, top, zHang - 0.35, k2x + 0.72, top + 0.15, zHang + 0.15, METAL.black);
    rod(k.metal, new THREE.Vector3(k2x, top + 0.15, zHang - 0.1), new THREE.Vector3(k2x, top + 0.8, zHang - 0.1), 0.04, METAL.steel);
    const p2 = new THREE.Vector3(k2x, top, zHang);
    let a2 = THREE.MathUtils.degToRad(2);
    for (let i = 0; i < 10; i++) {
      a2 += THREE.MathUtils.degToRad(i < 5 ? 1 : 3);
      const r = new THREE.Matrix4().makeRotationX(a2);
      k.speaker.add(b2, new THREE.Matrix4().makeTranslation(p2.x, p2.y, p2.z).multiply(r).multiply(new THREE.Matrix4().makeTranslation(0, -K2.h / 2, -K2.d / 2)), { uv: 'keep' });
      p2.add(new THREE.Vector3(0, -K2.h, 0).applyMatrix4(r));
    }
    b2.dispose();
    k.pts.speakerHangs.push(new THREE.Vector3(x, (top + bottom) / 2, zHang));
    k.pts.hangGlitter.push(new THREE.Vector3(x, top + 1.2, zHang));
    // fixture platform on the tower top (8 heads) + blade finial
    boxMinMax(k.metal, tx - 1.3, hTop - 0.08, zHang - 0.7, tx + 1.3, hTop, zHang + 0.7, METAL.steel);
    for (let i = 0; i < 8; i++) k.pts.fixturesTruss.push(new THREE.Vector3(tx + ((i % 4) - 1.5) * 0.62, hTop + 0.3, zHang + (i < 4 ? 0.3 : -0.3)));
    const blade = new THREE.Shape([new THREE.Vector2(-0.35, 0), new THREE.Vector2(0.35, 0), new THREE.Vector2(0.06, 2.3), new THREE.Vector2(0, 2.6), new THREE.Vector2(-0.06, 2.3)]);
    const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.08, bevelEnabled: false });
    k.metal.add(bg, new THREE.Matrix4().makeTranslation(tx + s * 1.2, hTop, zHang - 0.66), { color: METAL.alu });
    bg.dispose();
  }

  /** square lattice box-truss tower */
  private truss(x: number, y0: number, z: number, y1: number, w: number): void {
    const k = this.kit;
    const h = w / 2;
    const col = METAL.black;
    const c = [
      [-h, -h],
      [h, -h],
      [h, h],
      [-h, h],
    ];
    for (const [dx, dz] of c) rod(k.metal, new THREE.Vector3(x + dx, y0, z + dz), new THREE.Vector3(x + dx, y1, z + dz), 0.06, col);
    const bay = w;
    const n = Math.floor((y1 - y0) / bay);
    const lod = k.detail > 0;
    for (let i = 0; i <= n; i++) {
      const y = y0 + i * bay;
      for (let e = 0; e < 4; e++) {
        const [ax, az] = c[e];
        const [bx, bz] = c[(e + 1) % 4];
        rod(k.metal, new THREE.Vector3(x + ax, y, z + az), new THREE.Vector3(x + bx, y, z + bz), 0.03, col);
        if (i < n && lod) rod(k.metal, new THREE.Vector3(x + ax, y, z + az), new THREE.Vector3(x + bx, y + bay, z + bz), 0.025, col);
      }
    }
    boxMinMax(k.metal, x - 0.8, y0, z - 0.8, x + 0.8, y0 + 0.08, z + 0.8, METAL.black);
  }
}
