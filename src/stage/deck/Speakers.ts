import * as THREE from 'three';
import { boxMinMax, METAL, rod, type StageKit } from '../kit';
import { L } from '../layout';

/**
 * Main PA: four flown K1-class line arrays (1.34 m wide boxes) with J-curve splay, a flown sub
 * column beside each, hung from black lattice box-truss towers standing on the deck, topped by a
 * steel blade finial.
 */
export class SpeakerBuilder {
  constructor(private kit: StageKit) {}

  build(): void {
    for (const s of [1, -1]) {
      this.hang(s * L.innerArrayX, 14.25, 21, s);
      this.hang(s * L.outerArrayX, 15.0, 20, s);
    }
  }

  private hang(x: number, top: number, n: number, s: number): void {
    const k = this.kit;
    const K = L.k1;
    const zHang = L.arrayZ;
    const towerZ = zHang - 1.45;
    const towerTop = top + 1.9;
    this.truss(x, L.deckY, towerZ, towerTop, 0.76);
    // header beam from the tower forward over the array
    boxMinMax(k.metal, x - 0.45, top + 0.55, towerZ - 0.4, x + 0.45, top + 0.95, zHang + 0.5, METAL.black);
    // bumper + chain
    boxMinMax(k.metal, x - 0.75, top + 0.05, zHang - 0.55, x + 0.75, top + 0.2, zHang + 0.1, METAL.black);
    rod(k.metal, new THREE.Vector3(x, top + 0.2, zHang - 0.2), new THREE.Vector3(x, top + 0.6, zHang - 0.2), 0.04, METAL.steel);
    // J-curve array
    const splay = [0, 0.25, 0.25, 0.5, 0.5, 0.75, 1, 1, 1.5, 2, 2, 2.5, 3, 3.5, 4, 5, 5, 6, 7, 8, 10];
    const pivot = new THREE.Vector3(x, top, zHang + 0.02);
    let ang = THREE.MathUtils.degToRad(1.5);
    const box = new THREE.BoxGeometry(K.w, K.h - 0.012, K.d);
    let bottom = top;
    for (let i = 0; i < n; i++) {
      ang += THREE.MathUtils.degToRad(splay[Math.min(i, splay.length - 1)]);
      const r = new THREE.Matrix4().makeRotationX(ang);
      const m = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(r).multiply(new THREE.Matrix4().makeTranslation(0, -K.h / 2, -K.d / 2));
      k.speaker.add(box, m, { uv: 'keep' });
      pivot.add(new THREE.Vector3(0, -K.h, 0).applyMatrix4(r));
      bottom = pivot.y;
    }
    box.dispose();
    // flown sub column beside (outward), straight
    const sx = x + s * 1.52;
    const sub = new THREE.BoxGeometry(K.w, K.h - 0.012, 0.7);
    boxMinMax(k.metal, sx - 0.75, top + 0.05, zHang - 1.05, sx + 0.75, top + 0.2, zHang - 0.25, METAL.black);
    for (let i = 0; i < 12; i++) {
      k.speaker.add(sub, new THREE.Matrix4().makeTranslation(sx, top - K.h * (i + 0.5), zHang - 0.62), { uv: 'keep' });
    }
    sub.dispose();
    boxMinMax(k.metal, sx - 0.3, top + 0.2, zHang - 0.8, sx + 0.3, top + 0.95, zHang - 0.5, METAL.black);
    k.pts.speakerHangs.push(new THREE.Vector3(x, (top + bottom) / 2, zHang));
    // fixtures on top of the tower + blade finial
    k.pts.fixturesTruss.push(new THREE.Vector3(x, towerTop + 0.3, towerZ));
    const blade = new THREE.Shape([new THREE.Vector2(-0.35, 0), new THREE.Vector2(0.35, 0), new THREE.Vector2(0.06, 2.3), new THREE.Vector2(0, 2.6), new THREE.Vector2(-0.06, 2.3)]);
    const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.08, bevelEnabled: false });
    k.metal.add(bg, new THREE.Matrix4().makeTranslation(x, towerTop + 0.15, towerZ - 0.04), { color: METAL.alu });
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
    // base plate with outriggers
    boxMinMax(k.metal, x - 1.1, y0, z - 1.1, x + 1.1, y0 + 0.08, z + 1.1, METAL.black);
  }
}
