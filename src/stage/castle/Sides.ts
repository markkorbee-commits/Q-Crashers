import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { boxMinMax, cyl, decorDisc, decorPanel, GLOW, METAL, PAINT, prismX, rod, type StageKit, TINT } from '../kit';
import { extrude, frameShape, type Opening, paneShape, wallShape } from '../lib/gothic';
import { armX, ground, L, ledgeTop, rampartTop } from '../layout';
import { LED_KIND } from '../materials/LedMaterial';
import { GARLAND, type Garlands } from '../dragon/shading';

const OUT = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const _box = new THREE.BoxGeometry(1, 1, 1);

/**
 * Side sections, corner towers and the forward arms (design-bible §5.8):
 *  - side sections X ±37…±92: castle front wall Z −4 with a level wall walk at Y 9.5 while the bank
 *    rises underneath (ground 0 at |X| 46 → 4.4 at |X| 92), crenellations, bays with pointed arches,
 *    red banners, skull medallions, pixel pilasters, purple crystal lanterns on posts every 8 m,
 *    rear wall Z −22…−30, towers 5 × 5 m behind the wall at |X| 48/63/78 (white conical caps); a
 *    flame ledge at the foot of the wall (Y = max(1.9, ground + 1)) carries the side-front flames
 *  - corner towers (±92, −4), 6 × 6 m, top 15 (fireball unit, lasers, beam fans)
 *  - forward arms: axis-parallel low crenellated ramparts along the upper bank from (±92, −4) to
 *    (±94, 58), 1.4 m above the local bank, 7 crystal-lantern posts carrying flame / gerb / comet
 *    units, 4 m openings from Z 28 on (access to the crest bars), and the arm-end turret at (±94, 58)
 *    (lasers on its roof, the X-fan / CO2 / last flame on its field-side bastion).
 */
/** warm festoon swags along the side-section eaves, pilaster to pilaster (stage.garlands 'sides') */
export function addSideGarlands(g: Garlands): void {
  const pil = [37.6, 44.9, 52.2, 59.5, 66.8, 74.1, 81.4, 88.7];
  const z = L.sideFrontZ + 0.5;
  const y = L.wallTop - 0.55;
  for (const s of [-1, 1]) {
    let u = 0;
    for (let i = 0; i + 1 < pil.length; i++) u = g.swag(new THREE.Vector3(s * pil[i], y, z), new THREE.Vector3(s * pil[i + 1], y, z), 0.75, GARLAND.sides, 0.9, 0.15, u);
  }
}

export class SidesBuilder {
  private rng = new Rng(88);

  constructor(private kit: StageKit) {}

  build(): void {
    for (const s of [1, -1]) {
      this.sideSection(s);
      this.sideTowers(s);
      this.cornerTower(s);
      this.arm(s);
      this.armEnd(s);
    }
  }

  // -------------------------------------------------------------------------------------------
  // helpers

  private merlons(x0: number, x1: number, y: number, zFront: number, depth: number, h = 0.9, w = 0.75, gap = 0.6): void {
    const n = Math.max(1, Math.floor((x1 - x0 + gap) / (w + gap)));
    const start = x0 + (x1 - x0 - (n * w + (n - 1) * gap)) / 2;
    for (let i = 0; i < n; i++) boxMinMax(this.kit.stone, start + i * (w + gap), y, zFront - depth, start + i * (w + gap) + w, y + h, zFront, TINT.trim);
  }

  /** faceted crystal lantern in a black cradle, bottom of the cradle at `y` */
  private lantern(x: number, y: number, z: number, yaw = 0, scale = 1): THREE.Vector3 {
    const k = this.kit;
    const h = 1.2 * scale;
    const cy = y + 0.15 + h / 2;
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const m = new THREE.Matrix4().makeRotationY(yaw);
      m.scale(new THREE.Vector3(0.06, h * 0.65, 0.06));
      m.setPosition(x + dx * 0.36 * scale, y + h * 0.33, z + dz * 0.36 * scale);
      k.metal.add(_box, m, { color: METAL.black });
    }
    const oct = new THREE.OctahedronGeometry(1, 0);
    const om = new THREE.Matrix4().makeRotationY(yaw + Math.PI / 4);
    om.scale(new THREE.Vector3(0.52 * scale, h / 2, 0.52 * scale));
    om.setPosition(x, cy, z);
    k.led.geometry(oct, om, LED_KIND.lantern, 0, 0, false);
    const pos = oct.attributes.position as THREE.BufferAttribute;
    const seen = new Set<string>();
    for (let i = 0; i < pos.count; i += 3) {
      for (let e = 0; e < 3; e++) {
        const a = new THREE.Vector3().fromBufferAttribute(pos, i + e);
        const b = new THREE.Vector3().fromBufferAttribute(pos, i + ((e + 1) % 3));
        const key = [a, b].map((v) => v.toArray().map((n) => n.toFixed(2)).join(',')).sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        rod(k.metal, a.applyMatrix4(om), b.applyMatrix4(om), 0.05, METAL.black);
      }
    }
    oct.dispose();
    return new THREE.Vector3(x, cy + h / 2, z);
  }

  /** flame unit (Flamaniac-class box + nozzle) standing on a surface at (x, y, z); returns the nozzle */
  private flameUnit(x: number, y: number, z: number): THREE.Vector3 {
    const k = this.kit;
    boxMinMax(k.metal, x - 0.28, y, z - 0.25, x + 0.28, y + 0.3, z + 0.25, METAL.black);
    cyl(k.metal, x, y + 0.3, z, 0.07, 0.06, y + 0.46, 6, METAL.steel);
    return new THREE.Vector3(x, y, z);
  }

  /** applied lancet (frame + glowing pane) on a face with outward normal given by yaw */
  private lancet(x: number, y0: number, z: number, yaw: number, w = 0.9, h = 2.1, kind = LED_KIND.window as number): void {
    const k = this.kit;
    const o: Opening = { cx: 0, y0: 0, w, h, kind: 'lancet' };
    const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y0, z);
    const fg = extrude(frameShape(o, 0.14, k.seg), 0.12, k.seg);
    k.stone.add(fg, m, { color: TINT.trim });
    fg.dispose();
    const pg = new THREE.ShapeGeometry(paneShape(o, k.seg), k.seg);
    k.led.geometry(pg, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.01)), kind, this.rng.next());
    pg.dispose();
  }

  // -------------------------------------------------------------------------------------------
  // side section: front wall Z −4, wall walk 9.5, ledge, bays, lanterns, roof and rear wall

  private sideSection(s: number): void {
    const k = this.kit;
    const z = L.sideFrontZ;
    const T = L.sideWallT;
    const top = L.wallTop;
    const x0 = L.sideX0,
      x1 = L.corner.x - L.corner.w / 2;
    const sx = (x: number) => s * x;
    // bays between pilasters; contents: 'win' (arch pair), 'banner', 'skull'
    const pil = [37.6, 44.9, 52.2, 59.5, 66.8, 74.1, 81.4, 88.7];
    const kinds: ('win' | 'banner' | 'skull')[] = ['win', 'banner', 'skull', 'win', 'banner', 'skull', 'win'];
    const holes: Opening[] = [];
    const lower: Opening[] = [];
    for (let i = 0; i < kinds.length; i++) {
      const c = (pil[i] + pil[i + 1]) / 2;
      if (kinds[i] === 'win') {
        for (const o of [-1.25, 1.25]) holes.push({ cx: sx(c + o), y0: 6.2, w: 1.35, h: 2.55, kind: 'pointed' });
        // lower arcade only where the ledge leaves room
        const lt = ledgeTop(c);
        if (6.0 - lt > 2.4) lower.push({ cx: sx(c), y0: lt + 0.45, w: 2.4, h: Math.min(3.6, 5.6 - lt - 0.45), kind: 'pointed' });
      }
    }
    holes.push(...lower);
    const xa = Math.min(sx(x0), sx(x1)),
      xb = Math.max(sx(x0), sx(x1));
    const g = extrude(wallShape(xa, xb, -1, top, holes, k.seg), T, k.seg);
    k.stone.add(g, new THREE.Matrix4().makeTranslation(0, 0, z - T), { color: TINT.warm });
    g.dispose();
    for (const o of holes) {
      const fg = extrude(frameShape(o, 0.26, k.seg), 0.2, k.seg);
      k.stone.add(fg, new THREE.Matrix4().makeTranslation(0, 0, z), { color: TINT.trim });
      fg.dispose();
      const pg = new THREE.ShapeGeometry(paneShape(o, k.seg), k.seg);
      k.led.geometry(pg, new THREE.Matrix4().makeTranslation(0, 0, z - 0.45), lower.includes(o) ? LED_KIND.arcade : LED_KIND.window, this.rng.next());
      pg.dispose();
    }
    // cornice, wall walk, merlons, string course, LED line under the cornice
    boxMinMax(k.stone, xa, top - 0.3, z - 0.2, xb, top, z + 0.35, TINT.trim);
    boxMinMax(k.stone, xa, 5.75, z, xb, 6.0, z + 0.24, TINT.trim);
    this.merlons(xa, xb, top, z + 0.02, 0.45);
    k.led.bar(new THREE.Vector3(xa, top - 0.36, z + 0.36), new THREE.Vector3(xb, top - 0.36, z + 0.36), OUT, 0.1);
    // pilasters with pixel battens (the "vertical LED pilaster strips")
    for (const px of pil) {
      const x = sx(px);
      const lt = ledgeTop(px);
      boxMinMax(k.stone, x - 0.32, lt - 0.2, z, x + 0.32, top - 0.3, z + 0.34, TINT.trim);
      const st = k.led.newStrip();
      k.led.bar(new THREE.Vector3(x, lt + 0.3, z + 0.35), new THREE.Vector3(x, top - 0.45, z + 0.35), OUT, 0.12, st, 0, LED_KIND.bar, 1);
    }
    // bay decor: banners (2.5 x ≤7 m, backlit) and skull medallions
    for (let i = 0; i < kinds.length; i++) {
      const c = (pil[i] + pil[i + 1]) / 2;
      const lt = ledgeTop(c);
      if (kinds[i] === 'banner') {
        const yTop = top - 0.55;
        const h = Math.min(7, yTop - lt - 0.5);
        rod(k.metal, new THREE.Vector3(sx(c) - 1.4, yTop, z + 0.1), new THREE.Vector3(sx(c) + 1.4, yTop, z + 0.1), 0.07, METAL.black);
        decorPanel(k, i % 2 ? 'banner2' : 'banner', sx(c), yTop - h / 2, z + 0.12, 2.4, h, GLOW.banner);
        k.led.rect(new THREE.Vector3(sx(c), yTop - h / 2, z + 0.14), new THREE.Vector3(1, 0, 0), UP, 2.4, h, LED_KIND.panel, 2.4, h);
      } else if (kinds[i] === 'skull') {
        const y = Math.max(lt + 2.2, 6.9);
        const back = new THREE.CylinderGeometry(1.5, 1.5, 0.24, 28);
        k.stone.add(back, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(sx(c), y, z + 0.12), { color: TINT.trim });
        back.dispose();
        decorDisc(k, 'medallion', sx(c), y, z + 0.25, 1.38, GLOW.skull);
        const ring = new THREE.TorusGeometry(1.44, 0.1, 8, 36);
        k.gold.add(ring, new THREE.Matrix4().makeTranslation(sx(c), y, z + 0.3));
        ring.dispose();
        // narrow lancets under the medallion where the ledge leaves room
        if (y - 1.7 - lt > 2.2) for (const o of [-0.7, 0.7]) this.lancet(sx(c + o), lt + 0.5, z + 0.02, 0, 0.55, Math.min(2.4, y - 1.8 - lt - 0.6));
      }
    }
    // inner return wall at X ±37 (faces the centre) from the side front back to the core facade
    const ra = sx(x0),
      rb = sx(x0 + 1.2);
    boxMinMax(k.stone, Math.min(ra, rb), L.deckY - 0.3, L.facadeZ, Math.max(ra, rb), top, z, TINT.warm);
    boxMinMax(k.stone, Math.min(ra, rb) - 0.05, top - 0.3, L.facadeZ, Math.max(ra, rb) + 0.05, top, z, TINT.trim);
    this.merlons(Math.min(ra, rb), Math.max(ra, rb), top, z - 0.3, 0.6);
    this.lancet(sx(x0) - s * 0.01, 5.2, (z + L.facadeZ) / 2, -s * (Math.PI / 2), 1.0, 2.6);
    k.led.bar(new THREE.Vector3(sx(x0) - s * 0.02, L.deckY + 0.3, z - 0.15), new THREE.Vector3(sx(x0) - s * 0.02, top - 0.3, z - 0.15), new THREE.Vector3(-s, 0, 0), 0.1);

    // flame ledge at the foot of the wall (rides up the bank), black fascia + LED line
    const lx0 = L.plinthX1,
      lx1 = x1;
    const lf = L.ledgeFrontZ;
    prismX(k.paint, sx(lx0), sx(lx1), lf, z - 0.02, -1, (x) => ledgeTop(Math.abs(x)) - 0.04, PAINT.black, 2.2);
    prismX(k.paint, sx(lx0), sx(lx1), lf + 0.02, z, -1, (x) => ledgeTop(Math.abs(x)), PAINT.deckTop, 2.2);
    {
      const st = k.led.newStrip();
      let sAcc = 0;
      const n = 12;
      for (let i = 0; i < n; i++) {
        const u0 = lx0 + ((lx1 - lx0) * i) / n,
          u1 = lx0 + ((lx1 - lx0) * (i + 1)) / n;
        sAcc = k.led.bar(new THREE.Vector3(sx(u0), ledgeTop(u0) - 0.2, lf + 0.03), new THREE.Vector3(sx(u1), ledgeTop(u1) - 0.2, lf + 0.03), OUT, 0.1, st, sAcc);
      }
    }
    // side-front flames (bible: X ±41…±85 @ 5.5 m on the ledge; the 20th stands on the corner tower ledge)
    for (let i = 0; i < 9; i++) {
      const x = 41 + i * 5.5;
      k.pts.sideFront.push(this.flameUnit(sx(x), ledgeTop(x), -3.6));
    }
    // wall-walk gerbs (bible X ±44…±89.5 @ 6.5; the last one steps off the corner tower)
    for (const x of [44, 50.5, 57, 63.5, 70, 76.5, 83, 87.6]) {
      cyl(k.metal, sx(x), top, z - 0.75, 0.12, 0.1, top + 0.3, 6, METAL.black);
      k.pts.sideRampart.push(new THREE.Vector3(sx(x), top + 0.1, z - 0.75));
    }
    // Bengal flare pot at the outer end of the front line (bible ±86)
    cyl(k.metal, sx(85.2), top, z - 0.75, 0.22, 0.2, top + 0.35, 8, METAL.black);
    k.pts.bengal.push(new THREE.Vector3(sx(85.2), top + 0.1, z - 0.75));
    // purple crystal lanterns on posts along the wall walk every 8 m (lantern top Y 11.5)
    for (let x = 41; x <= 81.01; x += L.lanternPitch) {
      boxMinMax(k.stone, sx(x) - 0.3, top, z - 1.2, sx(x) + 0.3, top + 0.7, z - 0.6, TINT.cream);
      this.lantern(sx(x), top + 0.7, z - 0.9, 0, 1);
    }
    // moving heads on the wall walk between the lanterns (rows of 5)
    for (const c of [45, 61, 77]) for (let i = 0; i < 5; i++) k.pts.fixturesTruss.push(new THREE.Vector3(sx(c + (i - 2) * 1.35), top + 0.45, z - 1.05));

    // closed volume: dark roof and rear scaffold wall (rear Z −22 at |X| 37 → −30 at |X| 80)
    const segs = 10;
    for (let i = 0; i < segs; i++) {
      const u0 = x0 + ((x1 - x0) * i) / segs,
        u1 = x0 + ((x1 - x0) * (i + 1)) / segs;
      const zr = L.sideRear((u0 + u1) / 2);
      boxMinMax(k.paint, Math.min(sx(u0), sx(u1)), L.roofY - 0.2, zr, Math.max(sx(u0), sx(u1)), L.roofY, z - T, PAINT.black);
      boxMinMax(k.paint, Math.min(sx(u0), sx(u1)), -1, zr - 0.3, Math.max(sx(u0), sx(u1)), L.roofY, zr, PAINT.black);
    }
    // outer end wall (inside the corner tower line) back to the rear
    boxMinMax(k.paint, Math.min(sx(x1 - 0.3), sx(x1)), -1, L.sideRear(x1), Math.max(sx(x1 - 0.3), sx(x1)), L.roofY, z - T, PAINT.black);
  }

  // -------------------------------------------------------------------------------------------
  // towers behind the side wall (Z −10), 5 x 5 m, top 13.5 + white conical caps

  private sideTowers(s: number): void {
    const k = this.kit;
    const w = L.sideTowerW;
    const hw = w / 2;
    const zc = L.sideTowerZ;
    const zf = zc + hw;
    const body = 12.6;
    for (const tx of L.sideTowers) {
      const x = s * tx;
      boxMinMax(k.stone, x - hw, -1, zc - hw, x + hw, body, zf, TINT.cool);
      // cornice, parapet + merlons (top 13.5)
      boxMinMax(k.stone, x - hw - 0.25, body - 0.35, zc - hw - 0.25, x + hw + 0.25, body, zf + 0.25, TINT.trim);
      boxMinMax(k.stone, x - hw - 0.2, body, zf - 0.1, x + hw + 0.2, body + 0.4, zf + 0.2, TINT.wall);
      this.merlons(x - hw - 0.2, x + hw + 0.2, body + 0.4, zf + 0.2, 0.35, 0.5, 0.55, 0.5);
      // white conical cap on a drum
      cyl(k.stone, x, body, zc, hw * 0.82, hw * 0.82, body + 0.9, 16, TINT.cream);
      const cone = new THREE.ConeGeometry(hw * 0.95, 3.6, 20, 1);
      k.stone.add(cone, new THREE.Matrix4().makeTranslation(x, body + 0.9 + 1.8, zc), { color: TINT.cream });
      cone.dispose();
      const b = new THREE.SphereGeometry(0.16, 8, 6);
      k.gold.add(b, new THREE.Matrix4().makeTranslation(x, body + 4.55, zc));
      b.dispose();
      // upper windows (the part seen over the side wall) + corner LED strips
      for (const o of [-0.7, 0.7]) this.lancet(x + o, 10.3, zf + 0.01, 0, 0.62, 1.75);
      for (const e of [-1, 1]) k.led.bar(new THREE.Vector3(x + e * (hw - 0.15), 9.8, zf + 0.02), new THREE.Vector3(x + e * (hw - 0.15), body - 0.45, zf + 0.02), OUT, 0.1);
      k.led.bar(new THREE.Vector3(x - hw - 0.25, body - 0.4, zf + 0.27), new THREE.Vector3(x + hw + 0.25, body - 0.4, zf + 0.27), OUT, 0.1);
      k.pts.towersTop.push(new THREE.Vector3(x, L.sideTowerTop, zf - 0.5));
      k.pts.fixturesTruss.push(new THREE.Vector3(x - 1.4, body + 0.3, zf - 0.55), new THREE.Vector3(x + 1.4, body + 0.3, zf - 0.55));
    }
  }

  // -------------------------------------------------------------------------------------------
  // corner towers (±92, −4), 6 x 6 m, top 15

  private cornerTower(s: number): void {
    const k = this.kit;
    const C = L.corner;
    const cx = s * C.x,
      cz = C.z,
      hw = C.w / 2;
    const g = ground(C.x, cz);
    const body = C.top - 0.6;
    boxMinMax(k.stone, cx - hw, -1, cz - hw, cx + hw, body, cz + hw, TINT.cool);
    boxMinMax(k.stone, cx - hw - 0.25, body - 0.4, cz - hw - 0.25, cx + hw + 0.25, body, cz + hw + 0.25, TINT.trim);
    boxMinMax(k.stone, cx - hw - 0.25, g - 0.2, cz + hw, cx + hw + 0.25, g + 0.55, cz + hw + 0.2, TINT.trim);
    // parapet + merlons to Y 15
    for (const [a0, a1, b0, b1] of [
      [-hw - 0.2, hw + 0.2, hw - 0.2, hw + 0.2],
      [-hw - 0.2, hw + 0.2, -hw - 0.2, -hw + 0.2],
      [-hw - 0.2, -hw + 0.2, -hw - 0.2, hw + 0.2],
      [hw - 0.2, hw + 0.2, -hw - 0.2, hw + 0.2],
    ])
      boxMinMax(k.stone, cx + a0, body, cz + b0, cx + a1, body + 0.25, cz + b1, TINT.wall);
    const mw = 0.7;
    for (let i = 0; i < 4; i++) {
      const a = -hw + 0.05 + i * ((C.w - 0.1 - mw) / 3);
      for (const e of [-1, 1]) {
        boxMinMax(k.stone, cx + a, body + 0.25, cz + e * (hw + 0.02) - 0.18, cx + a + mw, C.top, cz + e * (hw + 0.02) + 0.18, TINT.trim);
        boxMinMax(k.stone, cx + e * (hw + 0.02) - 0.18, body + 0.25, cz + a, cx + e * (hw + 0.02) + 0.18, C.top, cz + a + mw, TINT.trim);
      }
    }
    // windows on the front (+Z) and the inner (towards the field) faces, LED edges
    for (const y0 of [g + 3.0, g + 6.4]) {
      for (const o of [-1.3, 1.3]) this.lancet(cx + o, y0, cz + hw + 0.01, 0, 0.85, 2.3);
      this.lancet(cx - s * (hw + 0.01), y0, cz, -s * (Math.PI / 2), 0.95, 2.3);
    }
    for (const e of [-1, 1]) k.led.bar(new THREE.Vector3(cx + e * (hw - 0.15), g + 1.0, cz + hw + 0.02), new THREE.Vector3(cx + e * (hw - 0.15), body - 0.5, cz + hw + 0.02), OUT, 0.11);
    k.led.bar(new THREE.Vector3(cx - hw - 0.26, body - 0.45, cz + hw + 0.27), new THREE.Vector3(cx + hw + 0.26, body - 0.45, cz + hw + 0.27), OUT, 0.1);
    // roof: fireball unit on a pedestal (Y 15.5), two lasers, a block of beam fixtures
    cyl(k.stone, cx, body, cz, 0.7, 0.6, 15.25, 10, TINT.trim);
    const bowl = new THREE.TorusGeometry(0.55, 0.1, 6, 14);
    k.gold.add(bowl, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(cx, 15.28, cz));
    bowl.dispose();
    k.pts.cornerFireballs.push(new THREE.Vector3(cx, 15.5, cz));
    k.pts.towersTop.push(new THREE.Vector3(cx, C.top, cz + 1.8));
    for (const dx of [-1.9, 1.9]) {
      boxMinMax(k.metal, cx + dx - 0.2, body, cz + 1.6, cx + dx + 0.2, body + 0.3, cz + 2.1, METAL.black);
      k.pts.laserStage.push(new THREE.Vector3(cx + dx, body + 0.35, cz + 2.0));
    }
    for (let i = 0; i < 6; i++) k.pts.fixturesTruss.push(new THREE.Vector3(cx + ((i % 3) - 1) * 1.2, body + 0.35, cz - 1.2 - Math.floor(i / 3) * 0.9));
    // ledge in front of the corner tower (carries the 20th side-front flame)
    const lt = (x: number) => ground(Math.abs(x), -0.5) + 1;
    prismX(k.paint, s * (C.x - hw), s * (C.x + hw), cz + hw + 1.0, cz + hw, -1, lt, PAINT.black, 3);
    k.pts.sideFront.push(this.flameUnit(s * 90.5, lt(90.5), cz + hw + 0.5));
  }

  // -------------------------------------------------------------------------------------------
  // forward arms along the bank

  private arm(s: number): void {
    const k = this.kit;
    const T = L.rampartT;
    // rampart segments between the openings (the first starts at the corner tower's front face)
    const cutsZ: [number, number][] = [];
    let z0 = L.corner.z + L.corner.w / 2;
    for (const [a, b] of L.armOpenings) {
      cutsZ.push([z0, a]);
      z0 = b;
    }
    const zEnd = L.armEnd.z - L.armEnd.w / 2;
    if (zEnd > z0 + 0.5) cutsZ.push([z0, zEnd]);
    const dirYaw = Math.atan2(2, L.armZ1 - L.armZ0); // the line leans 2 m outward over 62 m
    for (const [za, zb] of cutsZ) {
      const xa = armX(za),
        xb = armX(zb);
      const zc = (za + zb) / 2;
      const len = zb - za;
      const gTop = rampartTop(s, zc);
      const m = new THREE.Matrix4().makeRotationY(s * dirYaw);
      m.scale(new THREE.Vector3(T, gTop + 1, len));
      m.setPosition(s * (xa + xb) / 2, (gTop - 1) / 2, zc);
      k.stone.add(_box, m, { color: TINT.warm });
      // coping (field side) + merlons on the outer half
      const cm = new THREE.Matrix4().makeRotationY(s * dirYaw);
      cm.scale(new THREE.Vector3(T + 0.3, 0.18, len));
      cm.setPosition(s * (xa + xb) / 2, gTop + 0.09 - 0.18, zc);
      k.stone.add(_box, cm, { color: TINT.trim });
      for (let zz = za + 0.5; zz < zb - 0.6; zz += 1.4) {
        const xm = armX(zz + 0.35) + 0.25;
        boxMinMax(k.stone, s * xm - 0.3, gTop, zz, s * xm + 0.3, gTop + 0.6, zz + 0.7, TINT.trim);
      }
      // LED line along the field face under the coping + blind arcade panes
      const fx = (z: number) => s * (armX(z) - T / 2 - 0.02);
      const n = new THREE.Vector3(-s, 0, 0);
      k.led.bar(new THREE.Vector3(fx(za), gTop - 0.28, za), new THREE.Vector3(fx(zb), gTop - 0.28, zb), n, 0.09);
      for (let zz = za + 1.6; zz < zb - 1.2; zz += 2.6) {
        const o: Opening = { cx: 0, y0: 0, w: 0.9, h: 1.0, kind: 'pointed' };
        const pm = new THREE.Matrix4().makeRotationY(-s * (Math.PI / 2)).setPosition(fx(zz) - s * 0.01, ground(s * armX(zz), zz) + 0.1, zz);
        const pg = new THREE.ShapeGeometry(paneShape(o, k.seg), k.seg);
        k.led.geometry(pg, pm, LED_KIND.blind, this.rng.next());
        pg.dispose();
      }
    }
    // opening jamb piers (cream quoins) so the openings read as gates
    for (const [a, b] of L.armOpenings)
      for (const zz of [a, b]) {
        const x = armX(zz);
        const t = rampartTop(s, zz);
        boxMinMax(k.stone, s * x - 0.8, ground(s * x, zz) - 0.5, zz - 0.4, s * x + 0.8, t + 0.9, zz + 0.4, TINT.cream);
        const c = new THREE.ConeGeometry(0.5, 0.9, 4);
        k.stone.add(c, new THREE.Matrix4().makeRotationY(Math.PI / 4).setPosition(s * x, t + 1.35, zz), { color: TINT.trim });
        c.dispose();
      }
    // lantern posts (4 m, crystal 1.2 m), each with a flame / gerb / comet unit on its field-side corbel
    for (const pz of L.armPostsZ) {
      const x = armX(pz);
      const g0 = ground(s * x, pz);
      const topY = g0 + 4.0;
      const w = 1.5;
      boxMinMax(k.stone, s * x - w / 2, g0 - 0.5, pz - w / 2, s * x + w / 2, topY, pz + w / 2, TINT.cool);
      boxMinMax(k.stone, s * x - w / 2 - 0.15, topY - 0.3, pz - w / 2 - 0.15, s * x + w / 2 + 0.15, topY, pz + w / 2 + 0.15, TINT.cream);
      boxMinMax(k.stone, s * x - w / 2 - 0.1, g0 - 0.2, pz - w / 2 - 0.1, s * x + w / 2 + 0.1, g0 + 1.0, pz + w / 2 + 0.1, TINT.wall);
      this.lantern(s * x, topY, pz, 0, 1);
      // vertical LED battens on the field-facing corners
      for (const e of [-0.62, 0.62]) k.led.bar(new THREE.Vector3(s * (x - w / 2 - 0.02), g0 + 1.1, pz + e), new THREE.Vector3(s * (x - w / 2 - 0.02), topY - 0.35, pz + e), new THREE.Vector3(-s, 0, 0), 0.1);
      // corbel (field side) with the flame unit, gerb and comet tube on it
      const ct = rampartTop(s, pz);
      const cx0 = x - w / 2 - 1.05;
      boxMinMax(k.stone, Math.min(s * cx0, s * (x - w / 2)), ct - 0.35, pz - 0.75, Math.max(s * cx0, s * (x - w / 2)), ct, pz + 0.75, TINT.trim);
      const cc = new THREE.ConeGeometry(0.62, 1.1, 4);
      k.stone.add(cc, new THREE.Matrix4().makeRotationX(Math.PI).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 4)).setPosition(s * (cx0 + 0.55), ct - 0.9, pz), { color: TINT.trim });
      cc.dispose();
      k.pts.armPosts.push(this.flameUnit(s * (cx0 + 0.45), ct, pz));
      cyl(k.metal, s * (cx0 + 0.45), ct, pz + 0.55, 0.08, 0.08, ct + 0.35, 6, METAL.black);
      // beam fixtures on the rampart between posts (arms: T_ARM)
      if (pz < 26) for (const dz of [3.2, 4.8]) k.pts.fixturesTruss.push(new THREE.Vector3(s * (armX(pz + dz) - 0.1), rampartTop(s, pz + dz) + 0.35, pz + dz));
    }
  }

  /** arm-end turret at (±94, 58): 4 x 4 m, top 12.5 (lasers on the roof deck), field-side bastion */
  private armEnd(s: number): void {
    const k = this.kit;
    const E = L.armEnd;
    const hw = E.w / 2;
    const cx = s * E.x;
    const g = ground(E.x, E.z);
    const deck = E.top - 0.9;
    boxMinMax(k.stone, cx - hw, g - 0.5, E.z - hw, cx + hw, deck, E.z + hw, TINT.cool);
    boxMinMax(k.stone, cx - hw - 0.25, deck - 0.35, E.z - hw - 0.25, cx + hw + 0.25, deck, E.z + hw + 0.25, TINT.trim);
    // parapet + merlons (to 12.5) + corner pinnacles
    for (const e of [-1, 1]) {
      boxMinMax(k.stone, cx - hw - 0.2, deck, E.z + e * hw - 0.2, cx + hw + 0.2, deck + 0.3, E.z + e * hw + 0.2, TINT.wall);
      boxMinMax(k.stone, cx + e * hw - 0.2, deck, E.z - hw - 0.2, cx + e * hw + 0.2, deck + 0.3, E.z + hw + 0.2, TINT.wall);
    }
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      boxMinMax(k.stone, cx + dx * hw - 0.35, deck + 0.3, E.z + dz * hw - 0.35, cx + dx * hw + 0.35, E.top, E.z + dz * hw + 0.35, TINT.trim);
      const c = new THREE.ConeGeometry(0.45, 1.1, 4);
      k.stone.add(c, new THREE.Matrix4().makeRotationY(Math.PI / 4).setPosition(cx + dx * hw, E.top + 0.55, E.z + dz * hw), { color: TINT.trim });
      c.dispose();
    }
    // windows on the field face and the front, LED edges
    this.lancet(cx - s * (hw + 0.01), g + 3.4, E.z, -s * (Math.PI / 2), 1.0, 2.6);
    this.lancet(cx, g + 3.4, E.z + hw + 0.01, 0, 0.9, 2.4);
    for (const e of [-1, 1]) k.led.bar(new THREE.Vector3(cx - s * (hw + 0.02), g + 1.6, E.z + e * (hw - 0.15)), new THREE.Vector3(cx - s * (hw + 0.02), deck - 0.4, E.z + e * (hw - 0.15)), new THREE.Vector3(-s, 0, 0), 0.1);
    // lasers on the roof deck (Y 12, see LaserRig), beam fans on the field side of the deck
    for (const dz of [-0.5, 0, 0.5]) boxMinMax(k.metal, cx - 0.2, deck, E.z + dz - 0.18, cx + 0.2, deck + 0.3, E.z + dz + 0.18, METAL.black);
    for (let i = 0; i < 5; i++) k.pts.fixturesTruss.push(new THREE.Vector3(cx - s * 1.05, deck + 0.3, E.z - 1.3 + i * 0.65));
    // field-side bastion at the rampart level carrying the X-fan, CO2 jet and the last flame
    const bt = rampartTop(s, E.z);
    const bx0 = E.x - hw - 1.4;
    boxMinMax(k.stone, Math.min(s * bx0, s * (E.x - hw)), g - 0.5, E.z - 1.7, Math.max(s * bx0, s * (E.x - hw)), bt, E.z + 1.7, TINT.wall);
    boxMinMax(k.stone, Math.min(s * bx0, s * (E.x - hw)) - 0.1, bt - 0.2, E.z - 1.8, Math.max(s * bx0, s * (E.x - hw)) + 0.1, bt, E.z + 1.8, TINT.trim);
    const bx = s * (bx0 + 0.7);
    k.pts.armPosts.push(this.flameUnit(bx, bt, E.z + 1.05));
    boxMinMax(k.metal, bx - 0.3, bt, E.z - 0.3, bx + 0.3, bt + 0.4, E.z + 0.3, METAL.black);
    k.pts.armEnds.push(new THREE.Vector3(bx, bt, E.z));
    cyl(k.metal, bx, bt, E.z - 1.05, 0.16, 0.14, bt + 0.45, 8, METAL.steel);
    k.pts.co2.push(new THREE.Vector3(bx, bt, E.z - 1.05));
  }
}
