import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { boxMinMax, decorPanel, GLOW, METAL, PAINT, rod, type StageKit, TINT } from '../kit';
import { extrude, frameShape, type Opening, paneShape, wallShape } from '../lib/gothic';
import { armFrame, L } from '../layout';
import { LED_KIND } from '../materials/LedMaterial';

const OUT = new THREE.Vector3(0, 0, 1);
const _box = new THREE.BoxGeometry(1, 1, 1);

/**
 * Side sections: the lower castle walls continuing the U beyond the central castle, the corner
 * towers and the long arms angled forward to the field corners (pyro/fixture positions), with
 * square turret posts carrying purple crystal lanterns, a black ledge with flame units and pixel
 * LED lines (aerials f004/f025/f130, Endshow photo side crops).
 */
export class SidesBuilder {
  private rng = new Rng(88);

  constructor(private kit: StageKit) {}

  build(): void {
    for (const s of [1, -1]) {
      this.sideWall(s);
      this.cornerTower(s);
      this.arm(s);
    }
  }

  private sideWall(s: number): void {
    const k = this.kit;
    const Y = L.deckY;
    const z = L.sideWallZ;
    const x0 = L.castleHalf,
      x1 = 61.6;
    const xa = Math.min(s * x0, s * x1),
      xb = Math.max(s * x0, s * x1);
    const holes: Opening[] = [51.3, 58.9].map((cx) => ({ cx: s * cx, y0: Y + 0.4, w: 2.2, h: 3.4, kind: 'pointed' as const }));
    const g = extrude(wallShape(xa, xb, Y - 0.2, L.sideWallTop, holes, k.seg), 0.6, k.seg);
    k.stone.add(g, new THREE.Matrix4().makeTranslation(0, 0, z - 0.6), { color: TINT.warm });
    g.dispose();
    for (const o of holes) {
      const fg = extrude(frameShape(o, 0.3, k.seg), 0.2, k.seg);
      k.stone.add(fg, new THREE.Matrix4().makeTranslation(0, 0, z), { color: TINT.trim });
      fg.dispose();
      const pg = new THREE.ShapeGeometry(paneShape(o, k.seg), k.seg);
      k.led.geometry(pg, new THREE.Matrix4().makeTranslation(0, 0, z - 0.45), LED_KIND.arcade, this.rng.next());
      pg.dispose();
    }
    boxMinMax(k.stone, xa, L.sideWallTop - 0.3, z - 0.2, xb, L.sideWallTop, z + 0.35, TINT.trim);
    boxMinMax(k.stone, xa, L.sideWallTop, z - 0.6, xb, L.sideWallTop + 0.5, z + 0.05, TINT.warm);
    this.merlons(xa, xb, L.sideWallTop + 0.5, z + 0.05, 0.6);
    boxMinMax(k.stone, xa, L.sideWallTop - 0.3, z - 9, xb, L.sideWallTop - 0.05, z - 0.6, TINT.dark);
    k.led.bar(new THREE.Vector3(xa, L.sideWallTop - 0.35, z + 0.36), new THREE.Vector3(xb, L.sideWallTop - 0.35, z + 0.36), OUT, 0.1);
    // banner (variant) between the arches + lantern post
    decorPanel(k, 'banner2', s * 55.1, 4.75, z + 0.05, 2.0, 4.8, GLOW.banner);
    k.led.rect(new THREE.Vector3(s * 55.1, 4.75, z + 0.07), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 2.0, 4.8, LED_KIND.panel, 2.0, 4.8);
    this.post(new THREE.Vector3(s * 55.1, 0, z - 0.3), 0, L.sideWallTop + 1.4);
    for (const x of [51.3, 58.9]) {
      k.pts.roof.push(new THREE.Vector3(s * x, L.sideWallTop + 0.55, z - 0.3));
      k.pts.fixturesTruss.push(new THREE.Vector3(s * x, L.sideWallTop + 0.55, z - 1.0));
    }
  }

  private merlons(x0: number, x1: number, y: number, zFront: number, depth: number): void {
    const w = 0.75,
      gap = 0.6;
    const n = Math.max(1, Math.floor((x1 - x0 + gap) / (w + gap)));
    const start = x0 + (x1 - x0 - (n * w + (n - 1) * gap)) / 2;
    for (let i = 0; i < n; i++) boxMinMax(this.kit.stone, start + i * (w + gap), y, zFront - depth, start + i * (w + gap) + w, y + 0.8, zFront, TINT.trim);
  }

  /** square turret post (from base.y up `height`) with a faceted crystal lantern on top */
  private post(base: THREE.Vector3, yaw: number, height: number, w = 1.4): void {
    const k = this.kit;
    const y0 = base.y;
    const top = y0 + height;
    const m = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const r = new THREE.Matrix4().makeRotationY(yaw);
      r.scale(new THREE.Vector3(sx, sy, sz));
      r.setPosition(base.x + x * Math.cos(yaw) + z * Math.sin(yaw), y, base.z - x * Math.sin(yaw) + z * Math.cos(yaw));
      return r;
    };
    k.stone.add(_box, m(0, y0 + height / 2, 0, w, height, w), { color: TINT.trim });
    k.stone.add(_box, m(0, top - 0.2, 0, w + 0.3, 0.4, w + 0.3), { color: TINT.cream });
    if (height > 3) k.stone.add(_box, m(0, y0 + 1.2, 0, w + 0.25, 2.4 - 0.01, w + 0.25), { color: TINT.wall });
    // lantern cradle (black steel) + crystal
    const cy = top + 1.25;
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      k.metal.add(_box, m(dx * 0.42, top + 0.45, dz * 0.42, 0.07, 0.9, 0.07), { color: METAL.black });
    }
    const oct = new THREE.OctahedronGeometry(1, 0);
    const om = new THREE.Matrix4().makeRotationY(yaw + Math.PI / 4);
    om.scale(new THREE.Vector3(0.62, 1.05, 0.62));
    om.setPosition(base.x, cy, base.z);
    k.led.geometry(oct, om, LED_KIND.lantern, 0, 0, false);
    // black steel frame along the crystal's edges
    const pos = oct.attributes.position as THREE.BufferAttribute;
    const seen = new Set<string>();
    for (let i = 0; i < pos.count; i += 3) {
      for (let e = 0; e < 3; e++) {
        const a = new THREE.Vector3().fromBufferAttribute(pos, i + e);
        const b = new THREE.Vector3().fromBufferAttribute(pos, i + ((e + 1) % 3));
        const key = [a, b].map((v) => v.toArray().map((n) => n.toFixed(2)).join(',')).sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        rod(k.metal, a.applyMatrix4(om), b.applyMatrix4(om), 0.06, METAL.black);
      }
    }
    oct.dispose();
    k.pts.roof.push(new THREE.Vector3(base.x, cy + 1.2, base.z));
  }

  private cornerTower(s: number): void {
    const k = this.kit;
    const cx = s * 63.3,
      cz = -4.4,
      w = 4.6,
      h = 10.4;
    boxMinMax(k.stone, cx - w / 2, 0, cz - w / 2, cx + w / 2, h, cz + w / 2, TINT.cool);
    boxMinMax(k.stone, cx - w / 2 - 0.25, h - 0.35, cz - w / 2 - 0.25, cx + w / 2 + 0.25, h, cz + w / 2 + 0.25, TINT.trim);
    const mw = 0.7;
    for (let i = 0; i < 3; i++) {
      const a = -w / 2 + 0.1 + i * ((w - 0.2 - mw) / 2);
      for (const e of [-1, 1]) {
        boxMinMax(k.stone, cx + a, h, cz + e * (w / 2 + 0.05) - 0.3, cx + a + mw, h + 0.8, cz + e * (w / 2 + 0.05) + 0.3, TINT.trim);
        boxMinMax(k.stone, cx + e * (w / 2 + 0.05) - 0.3, h, cz + a, cx + e * (w / 2 + 0.05) + 0.3, h + 0.8, cz + a + mw, TINT.trim);
      }
    }
    // windows on the two visible faces (front +Z, inner side)
    const faces: [number, number][] = [
      [0, cz + w / 2],
      [-s, cx - (s * w) / 2],
    ];
    for (const [f, pos] of faces) {
      for (const y0 of [3.4, 6.5]) {
        const o: Opening = { cx: 0, y0: 0, w: 0.95, h: 2.1, kind: 'lancet' };
        const m = new THREE.Matrix4().makeRotationY(f === 0 ? 0 : (-s * Math.PI) / 2);
        m.setPosition(f === 0 ? cx : pos, y0, f === 0 ? pos : cz);
        const fg = extrude(frameShape(o, 0.14, k.seg), 0.12, k.seg);
        k.stone.add(fg, m, { color: TINT.trim });
        fg.dispose();
        const pg = new THREE.ShapeGeometry(paneShape(o, k.seg), k.seg);
        k.led.geometry(pg, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.01)), LED_KIND.window, this.rng.next());
        pg.dispose();
      }
    }
    k.led.bar(new THREE.Vector3(cx - w / 2 - 0.26, h - 0.4, cz + w / 2 + 0.27), new THREE.Vector3(cx + w / 2 + 0.26, h - 0.4, cz + w / 2 + 0.27), OUT, 0.1);
    this.post(new THREE.Vector3(cx, h, cz), 0, 1.1, 1.1);
    k.pts.towersTop.push(new THREE.Vector3(cx, h + 0.9, cz));
    k.pts.fixturesTruss.push(new THREE.Vector3(cx, h + 0.9, cz + 1.5));
  }

  /** long angled arm: black ledge (flame line), crenellated wall with arcade, turret posts, end tower */
  private arm(s: number): void {
    const k = this.kit;
    const { dir, len, nIn, nOut } = armFrame();
    // right-arm frame (local x along the arm from the corner, local z towards the audience)
    const face0 = new THREE.Vector2(L.armA.x + nOut.x * L.armLedge, L.armA.y + nOut.y * L.armLedge);
    const toWorld = (u: number, y: number, w: number): THREE.Vector3 => {
      const px = face0.x + dir.x * u + nIn.x * w;
      const pz = face0.y + dir.y * u + nIn.y * w;
      return new THREE.Vector3(s * px, y, pz);
    };
    // basis for matrices: local X = along (mirrored for the left), local Y up, local Z = inward normal
    const ax = new THREE.Vector3(s * dir.x, 0, dir.y);
    const az = new THREE.Vector3(s * nIn.x, 0, nIn.y);
    const ay = new THREE.Vector3(0, 1, 0);
    // keep a right-handed basis: if det < 0 (left arm), flip local X and run u backwards
    const det = ax.clone().cross(ay).dot(az);
    const flip = det < 0;
    const basis = (u: number, y: number, w: number) => {
      const X = flip ? ax.clone().multiplyScalar(-1) : ax;
      const o = toWorld(u, y, w);
      return new THREE.Matrix4().makeBasis(X, ay, az).setPosition(o);
    };
    const lbox = (b: typeof k.stone, u0: number, y0: number, w0: number, u1: number, y1: number, w1: number, color?: THREE.Color) => {
      const m = basis((u0 + u1) / 2, (y0 + y1) / 2, (w0 + w1) / 2);
      m.multiply(new THREE.Matrix4().makeScale(Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(w1 - w0)));
      b.add(_box, m, { color });
    };
    const Y = L.deckY;
    const wallT = 1.3;
    const top = L.armWallTop;
    const u0 = 0.5,
      u1 = len + 0.4;
    // ledge (deck level) in front of the wall
    lbox(k.paint, u0 - 2.5, 0, 0, u1, Y - 0.04, L.armLedge - 0.06, PAINT.black);
    lbox(k.paint, u0 - 2.5, Y - 0.04, 0, u1, Y, L.armLedge - 0.06, PAINT.deckTop);
    lbox(k.paint, u0 - 2.5, 0, L.armLedge - 0.06, u1, Y - 0.1, L.armLedge, PAINT.black);
    lbox(k.metal, u0 - 2.5, Y - 0.1, L.armLedge - 0.08, u1, Y + 0.02, L.armLedge + 0.03, METAL.steel);
    // the wall: slab with a pointed arcade, in local coordinates (u along, y up), front at w = 0
    const arches: Opening[] = [];
    const posts = [9.2, 18.4, 27.6];
    for (let i = 0; i < 8; i++) {
      const cu = 2.9 + i * 4.6;
      if (posts.some((p) => Math.abs(p - cu) < 1.2)) continue;
      arches.push({ cx: cu, y0: Y + 0.5, w: 1.7, h: 2.9, kind: 'pointed' });
    }
    // extrude in a local XY plane then map u -> world via the basis at (0,0,0)
    const shapeGeo = extrude(wallShape(u0, u1, 0, top, arches, k.seg), wallT, k.seg);
    const toLocal = (g: THREE.BufferGeometry) => {
      // mirror handling: for the flipped basis, u must run backwards
      if (flip) {
        const p = g.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) p.setX(i, -p.getX(i));
        // flip winding after mirroring
        const idx = g.index;
        if (idx) {
          for (let i = 0; i < idx.count; i += 3) {
            const a = idx.getX(i + 1);
            idx.setX(i + 1, idx.getX(i + 2));
            idx.setX(i + 2, a);
          }
        } else {
          for (let i = 0; i < p.count; i += 3) {
            for (const att of Object.values(g.attributes) as THREE.BufferAttribute[]) {
              const sz = att.itemSize;
              for (let c = 0; c < sz; c++) {
                const t = att.array[(i + 1) * sz + c];
                (att.array as Float32Array)[(i + 1) * sz + c] = att.array[(i + 2) * sz + c];
                (att.array as Float32Array)[(i + 2) * sz + c] = t;
              }
            }
          }
        }
        g.computeVertexNormals();
      }
      return g;
    };
    const originM = () => {
      const X = flip ? ax.clone().multiplyScalar(-1) : ax;
      return new THREE.Matrix4().makeBasis(X, ay, az).setPosition(toWorld(0, 0, 0));
    };
    k.stone.add(toLocal(shapeGeo), originM().multiply(new THREE.Matrix4().makeTranslation(0, 0, -wallT)), { color: TINT.warm });
    shapeGeo.dispose();
    for (const o of arches) {
      const fg = toLocal(extrude(frameShape(o, 0.26, k.seg), 0.18, k.seg));
      k.stone.add(fg, originM(), { color: TINT.trim });
      fg.dispose();
      const pg = toLocal(new THREE.ShapeGeometry(paneShape(o, k.seg), k.seg));
      k.led.geometry(pg, originM().multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.4)), LED_KIND.blind, this.rng.next());
      pg.dispose();
    }
    // cornice, parapet, merlons, plinth
    lbox(k.stone, u0, top - 0.3, -0.2, u1, top, 0.32, TINT.trim);
    lbox(k.stone, u0, top, -wallT, u1, top + 0.45, 0.05, TINT.warm);
    for (let u = u0 + 0.5; u < u1 - 0.8; u += 1.35) lbox(k.stone, u, top + 0.45, -0.55, u + 0.75, top + 1.2, 0.05, TINT.trim);
    lbox(k.stone, u0, Y - 0.05, 0, u1, Y + 0.35, 0.2, TINT.trim);
    lbox(k.stone, u0, top - 0.3, -wallT - 2.2, u1, top - 0.05, -wallT, TINT.dark);
    // LED lines: under the cornice and along the ledge lip
    const sTop = k.led.newStrip();
    const sLip = k.led.newStrip();
    const n0 = az.clone();
    k.led.bar(toWorld(u0, top - 0.36, 0.33), toWorld(u1, top - 0.36, 0.33), n0, 0.1, sTop);
    k.led.bar(toWorld(u0 - 2.5, Y - 0.2, L.armLedge + 0.01), toWorld(u1, Y - 0.2, L.armLedge + 0.01), n0, 0.1, sLip);
    // turret posts with crystal lanterns
    for (const pu of posts) {
      const p = toWorld(pu, 0, -0.3);
      this.post(p, Math.atan2(az.x, az.z), top + 2.0, 1.5);
      // vertical LED battens on the post front corners
      for (const e of [-0.6, 0.6]) {
        const a = toWorld(pu + e * (flip ? -1 : 1), Y + 0.5, 0.47);
        const b = toWorld(pu + e * (flip ? -1 : 1), top + 1.6, 0.47);
        k.led.bar(a, b, az, 0.11);
      }
    }
    // flame units + fixtures on the ledge, anchors
    for (let i = 0; i < 8; i++) {
      const u = 1.6 + i * 4.8;
      const p = toWorld(u, Y, L.armLedge - 0.4);
      lbox(k.metal, u - 0.28, Y, L.armLedge - 0.65, u + 0.28, Y + 0.3, L.armLedge - 0.15, METAL.black);
      k.pts.deckFront.push(p);
      k.pts.fixturesFloor.push(toWorld(u + 2.4, Y + 0.3, 1.2));
      k.pts.fixturesTruss.push(toWorld(u + 1.2, top + 0.6, -0.6));
      if (i % 2 === 0) k.pts.roof.push(toWorld(u + 1.0, top + 0.5, -0.4));
      // front-line lamp on the ledge
      const lp = toWorld(u + 2.4, Y + 0.4, L.armLedge - 0.62);
      lbox(k.metal, u + 2.2, Y, L.armLedge - 1.0, u + 2.6, Y + 0.5, L.armLedge - 0.62, METAL.black);
      k.led.rect(lp, ax.clone().multiplyScalar(flip ? -1 : 1), new THREE.Vector3(0, 0.7071, 0).addScaledVector(az, -0.7071).normalize(), 0.3, 0.3, LED_KIND.lamp, (i * 0.23) % 1);
    }
    // end tower at the arm tip (laser / light position)
    const et = toWorld(len + 1.4, 0, -0.9);
    const ew = 4.4,
      eh = 11.2;
    const em = (x: number, y: number, z: number, sx: number, sy: number, sz: number, b = k.stone, c: THREE.Color = TINT.cool) => {
      const m = new THREE.Matrix4().makeBasis(flip ? ax.clone().multiplyScalar(-1) : ax, ay, az);
      m.setPosition(et.clone().add(new THREE.Vector3(x, 0, z).applyMatrix4(new THREE.Matrix4().extractRotation(m))).setY(y));
      m.multiply(new THREE.Matrix4().makeScale(sx, sy, sz));
      b.add(_box, m, { color: c });
    };
    em(0, eh / 2, 0, ew, eh, ew);
    em(0, eh - 0.2, 0, ew + 0.5, 0.4, ew + 0.5, k.stone, TINT.trim);
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      em(dx * (ew / 2 - 0.2), eh + 0.45, dz * (ew / 2 - 0.2), 0.8, 0.9, 0.8, k.stone, TINT.trim);
    this.post(new THREE.Vector3(et.x, eh, et.z), Math.atan2(az.x, az.z), 1.3, 1.2);
    k.led.bar(et.clone().add(az.clone().multiplyScalar(ew / 2 + 0.02)).setY(1.2).add(ax.clone().multiplyScalar(-ew / 2 + 0.2)), et.clone().add(az.clone().multiplyScalar(ew / 2 + 0.02)).setY(eh - 0.5).add(ax.clone().multiplyScalar(-ew / 2 + 0.2)), az, 0.08);
    k.led.bar(et.clone().add(az.clone().multiplyScalar(ew / 2 + 0.02)).setY(1.2).add(ax.clone().multiplyScalar(ew / 2 - 0.2)), et.clone().add(az.clone().multiplyScalar(ew / 2 + 0.02)).setY(eh - 0.5).add(ax.clone().multiplyScalar(ew / 2 - 0.2)), az, 0.08);
    k.pts.towersTop.push(et.clone().setY(eh + 0.95));
    k.pts.laserStage.push(et.clone().setY(eh + 1.0).add(az.clone().multiplyScalar(1.5)));
    k.pts.fixturesTruss.push(et.clone().setY(eh + 1.0).add(az.clone().multiplyScalar(1.8)));
  }
}
