import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { boxMinMax, cyl, decorDisc, decorPanel, GLOW, METAL, PAINT, railing, rod, type StageKit, TINT } from '../kit';
import { type ArchKind, extrude, frameShape, type Opening, paneShape, wallShape } from '../lib/gothic';
import { L } from '../layout';
import { LED_KIND } from '../materials/LedMaterial';

/**
 * The grey gothic castle core of the 2026 RED (printed scenic flats on scaffold in reality), laid out
 * on design-bible §5.4/§5.5:
 *  - facade plane Z −12 across X ±37, crenellation / wall walk Y 9.5, ground arcade, lancets, pilasters
 *    with pixel battens, the big glowing pointed window per side and the skull medallions
 *  - gate porch in front of it (front Z −6): the bronze-gold DJ portal (5.4 m, apex 7.2, 3 m deep) with
 *    the logo shield keystone under the dragon's chin, flanked by two big round arches through which the
 *    oversized stone stairs climb from the deck (Y 1.9) to the upper castle platform (Y 5.5)
 *  - a gallery at Y 5.5 on corbels along the inner bays (black tubular railing)
 *  - towers: outer pair projecting from the facade (top 14, spires to 18), inner pair rising behind the
 *    parapet (top 16, the 15 m torch positions) — moved out to X ±17.3 so the crown's gold foreleg,
 *    which hooks its talons over the parapet at X +11…+14, reads in front of them
 *  - a closed dark roof + scaffold back wall (hides the wing roots) and the rear pyro scaffold (Z −22,
 *    top Y 18) carrying the roof gerbs and comets behind the dragon.
 */
const OUT = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);

interface TowerSpec {
  kind: 'inner' | 'outer';
  x: number;
  w: number;
  frontZ: number;
  depth: number;
  /** cornice top (roof deck) */
  body: number;
  /** lowest point of the front slab (below it the tower is hidden by the castle) */
  base: number;
  capTop: number;
}

const INNER: TowerSpec = { kind: 'inner', x: 17.3, w: 4.0, frontZ: -12.35, depth: 3.75, body: 15.4, base: 8.6, capTop: 18 };
const OUTER: TowerSpec = { kind: 'outer', x: 25.5, w: 5.0, frontZ: -10.2, depth: 5.0, body: 13.4, base: L.deckY, capTop: 18 };
/** stair arches in the porch screen (round, springing 4.5, apex 7.0) */
const ARCH: Opening = { cx: 8.9, y0: L.deckY, w: 5.0, h: 5.1, kind: 'round' };
/** medallion (bible Ø 3.5 at Y 6.5; see layout.ts) */
const MED = { x: 20, y: 7.25, r: 1.62 };

export class CastleBuilder {
  private rng = new Rng(2026);

  constructor(private kit: StageKit) {}

  build(): void {
    this.porch();
    this.facade();
    for (const s of [1, -1]) {
      this.stairs(s);
      this.gallery(s);
      this.tower(INNER, s);
      this.tower(OUTER, s);
      this.medallion(s);
      this.bayDecor(s);
    }
    this.roofAndBack();
    this.scaffold();
  }

  // -------------------------------------------------------------------------------------------
  // helpers

  /** extrude a facade shape so that its front face lies at zFront (depth into -Z) */
  private slab(shape: THREE.Shape, zFront: number, depth: number, tint = TINT.wall): void {
    const g = extrude(shape, depth, this.kit.seg);
    this.kit.stone.add(g, new THREE.Matrix4().makeTranslation(0, 0, zFront - depth), { color: tint });
    g.dispose();
  }

  /** frame ring protruding from zFront by `proud` */
  private frame(o: Opening, zFront: number, t: number, proud: number, tint = TINT.trim, bucket: 'stone' | 'gold' = 'stone'): void {
    const g = extrude(frameShape(o, t, this.kit.seg), proud, this.kit.seg);
    this.kit[bucket].add(g, new THREE.Matrix4().makeTranslation(0, 0, zFront), { color: tint });
    g.dispose();
  }

  /** glowing pane (window / arcade / portal) inset behind zFront */
  private pane(o: Opening, zFront: number, inset: number, kind: number): void {
    const g = new THREE.ShapeGeometry(paneShape(o, this.kit.seg), this.kit.seg);
    this.kit.led.geometry(g, new THREE.Matrix4().makeTranslation(0, 0, zFront - inset), kind, this.rng.next());
    g.dispose();
  }

  private merlons(x0: number, x1: number, y: number, zFront: number, depth: number, h: number = L.merlonH, w = 0.8, gap = 0.65): void {
    const n = Math.max(1, Math.floor((x1 - x0 + gap) / (w + gap)));
    const used = n * w + (n - 1) * gap;
    const start = x0 + (x1 - x0 - used) / 2;
    for (let i = 0; i < n; i++) {
      const a = start + i * (w + gap);
      boxMinMax(this.kit.stone, a, y, zFront - depth, a + w, y + h, zFront, TINT.trim);
    }
  }

  /** points along an arch outline (jambs + arch) offset outward by `off` */
  private archPoints(o: Opening, off: number, n: number): THREE.Vector2[] {
    const open = paneShape({ ...o, w: o.w + off * 2, h: o.h + off }, 16).getPoints(16);
    const lens: number[] = [0];
    for (let i = 1; i < open.length; i++) lens.push(lens[i - 1] + open[i].distanceTo(open[i - 1]));
    const tot = lens[lens.length - 1];
    const out: THREE.Vector2[] = [];
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * tot;
      let j = 1;
      while (j < lens.length - 1 && lens[j] < t) j++;
      const f = (t - lens[j - 1]) / Math.max(1e-6, lens[j] - lens[j - 1]);
      out.push(open[j - 1].clone().lerp(open[j], f));
    }
    return out;
  }

  private pinnacle(x: number, y: number, z: number, w: number, h: number, tint = TINT.trim): void {
    const k = this.kit;
    boxMinMax(k.stone, x - w / 2, y, z - w / 2, x + w / 2, y + h * 0.45, z + w / 2, tint);
    const g = new THREE.ConeGeometry(w * 0.72, h * 0.55, 4);
    k.stone.add(g, new THREE.Matrix4().makeRotationY(Math.PI / 4).setPosition(x, y + h * 0.45 + h * 0.275, z), { color: tint });
    g.dispose();
    if (k.detail > 0) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const c = new THREE.ConeGeometry(0.06, 0.28, 4);
        const m = new THREE.Matrix4().makeRotationZ(Math.cos(a) * 0.9).multiply(new THREE.Matrix4().makeRotationX(-Math.sin(a) * 0.9));
        m.setPosition(x + Math.cos(a) * w * 0.35, y + h * 0.62, z + Math.sin(a) * w * 0.35);
        k.stone.add(c, m, { color: tint });
        c.dispose();
      }
    }
  }

  private finial(x: number, y: number, z: number): void {
    const k = this.kit;
    const b = new THREE.SphereGeometry(0.2, 8, 6);
    k.gold.add(b, new THREE.Matrix4().makeTranslation(x, y + 0.1, z));
    b.dispose();
    const c = new THREE.ConeGeometry(0.07, 1.1, 5);
    k.gold.add(c, new THREE.Matrix4().makeTranslation(x, y + 0.75, z));
    c.dispose();
  }

  /** small black LED flood on a yoke, tilted up at the facade */
  private floodCan(x: number, y: number, z: number): void {
    const k = this.kit;
    boxMinMax(k.metal, x - 0.22, y, z - 0.18, x + 0.22, y + 0.06, z + 0.18, METAL.black);
    const g = new THREE.CylinderGeometry(0.2, 0.17, 0.34, 10);
    k.metal.add(g, new THREE.Matrix4().makeRotationX(-0.55).setPosition(x, y + 0.26, z), { color: METAL.black });
    g.dispose();
  }

  /** applied lancet (frame + pane) on a face with outward normal `yaw` (0 = +Z) centred at (x, y0, z) */
  private appliedLancet(x: number, y0: number, z: number, yaw: number, w = 0.9, h = 2.2, kind: ArchKind = 'lancet'): void {
    const k = this.kit;
    const o: Opening = { cx: 0, y0: 0, w, h, kind };
    const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y0, z);
    const fg = extrude(frameShape(o, 0.13, k.seg), 0.12, k.seg);
    k.stone.add(fg, m, { color: TINT.trim });
    fg.dispose();
    const pg = new THREE.ShapeGeometry(paneShape(o, k.seg), k.seg);
    k.led.geometry(pg, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.01)), LED_KIND.window, this.rng.next());
    pg.dispose();
  }

  // -------------------------------------------------------------------------------------------
  // gate porch: screen wall with the DJ portal + stair arches, portal niche, booth

  private porch(): void {
    const k = this.kit;
    const z = L.porchFrontZ;
    const Y = L.deckY;
    const H = L.porchTop;
    const T = L.screenT;
    const PH = L.porchHalf;
    const portal: Opening = { cx: 0, y0: Y, w: L.portalW, h: L.portalApex - Y, kind: 'pointed' };
    const arches: Opening[] = [-1, 1].map((s) => ({ ...ARCH, cx: s * ARCH.cx }));
    // screen wall: nothing of it may rise above Y 8.5 near the head (the chin hangs at 8.7 behind it)
    this.slab(wallShape(-PH, PH, Y - 0.3, H, [portal, ...arches], k.seg), z, T, TINT.warm);
    // coping + cornice LED line (split around the portal crown)
    boxMinMax(k.stone, -PH - 0.05, H - 0.22, z - T - 0.05, PH + 0.05, H, z + 0.2, TINT.trim);
    boxMinMax(k.stone, -PH, Y, z, PH, Y + 0.32, z + 0.16, TINT.trim);
    for (const s of [-1, 1]) {
      const a = s * 3.55,
        b = s * PH;
      k.led.bar(new THREE.Vector3(Math.min(a, b), H - 0.34, z + 0.03), new THREE.Vector3(Math.max(a, b), H - 0.34, z + 0.03), OUT, 0.1);
    }
    // stair arches: voussoir frames, keystones, LED outline
    for (const o of arches) {
      this.frame(o, z, 0.34, 0.24);
      boxMinMax(k.stone, o.cx - 0.26, o.y0 + o.h - 0.1, z, o.cx + 0.26, o.y0 + o.h + 0.5, z + 0.32, TINT.cream);
      k.led.polyline(
        this.archPoints(o, 0.4, 36).map((p) => new THREE.Vector3(p.x, p.y, z + 0.27)),
        OUT,
        0.08,
      );
    }
    // porch side walls (end of the stair recess) with an applied lancet, pinnacles on the corners
    for (const s of [-1, 1]) {
      const x0 = s * PH,
        x1 = s * (PH + 0.7);
      boxMinMax(k.stone, Math.min(x0, x1), Y - 0.3, L.stairBackZ, Math.max(x0, x1), H, z, TINT.warm);
      boxMinMax(k.stone, Math.min(x0, x1) - 0.05, H - 0.22, L.stairBackZ, Math.max(x0, x1) + 0.05, H, z + 0.2, TINT.trim);
      this.appliedLancet(s * (PH + 0.71), 3.6, (z + L.stairBackZ) / 2, (s * Math.PI) / 2, 0.9, 2.6);
      this.pinnacle(s * (PH + 0.35), H, z - 0.35, 0.62, 1.9);
      k.led.bar(new THREE.Vector3(s * (PH + 0.72), Y + 0.3, z - 0.1), new THREE.Vector3(s * (PH + 0.72), H - 0.3, z - 0.1), new THREE.Vector3(s, 0, 0), 0.1);
    }
    // solid mass behind the portal piers and the niche (top 8.3, under the dragon's jaw)
    for (const s of [-1, 1]) {
      const a = s * (L.portalW / 2 + 0.3),
        b = s * L.stairX0;
      boxMinMax(k.stone, Math.min(a, b), Y, L.facadeZ, Math.max(a, b), H - 0.02, z - T, TINT.dark);
    }
    boxMinMax(k.stone, -L.portalW / 2 - 0.3, Y, L.facadeZ, L.portalW / 2 + 0.3, H - 0.02, z - L.portalDepth - 0.2, TINT.dark);

    // ---- the DJ portal: bronze-gold scroll frame, cream chevron ring, shield keystone
    this.frame(portal, z, 0.55, 0.38, TINT.wall, 'gold');
    const outer: Opening = { cx: 0, y0: Y, w: L.portalW + 1.1, h: L.portalApex - Y + 0.55, kind: 'pointed' };
    this.frame(outer, z, 0.28, 0.22, TINT.cream);
    for (const p of this.archPoints(outer, 0.14, 26)) {
      const g = new THREE.OctahedronGeometry(0.13, 0);
      k.gold.add(g, new THREE.Matrix4().makeTranslation(p.x, p.y, z + 0.26));
      g.dispose();
    }
    // warm bulb ring on the arch (~10 bulbs)
    for (const p of this.archPoints(portal, 0.28, 12).slice(1, -1)) k.led.rect(new THREE.Vector3(p.x, p.y, z + 0.42), RIGHT, UP, 0.16, 0.16, LED_KIND.candle, (p.x * 0.37 + 5) % 1);
    // baroque C-scrolls at the springing
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const tor = new THREE.TorusGeometry(0.42 - i * 0.08, 0.07, 6, 14, Math.PI * 1.4);
        const m = new THREE.Matrix4().makeRotationZ(s > 0 ? -0.6 + i * 0.7 : Math.PI + 0.6 - i * 0.7);
        m.setPosition(s * (L.portalW / 2 + 0.75), Y + 3.0 + i * 1.0, z + 0.42);
        k.gold.add(tor, m);
        tor.dispose();
      }
    }
    // Defqon.1-style logo shield (original emblem art) as the keystone, Y 7.05…8.5
    const sw = 0.85,
      sh = (L.shieldY1 - L.shieldY0) / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-sw, sh);
    shape.lineTo(sw, sh);
    shape.lineTo(sw, sh * 0.12);
    shape.quadraticCurveTo(sw * 0.94, -sh * 0.62, 0, -sh);
    shape.quadraticCurveTo(-sw * 0.94, -sh * 0.62, -sw, sh * 0.12);
    shape.closePath();
    const sg = extrude(shape, 0.3, k.seg);
    const sy = (L.shieldY0 + L.shieldY1) / 2;
    k.gold.add(sg, new THREE.Matrix4().makeTranslation(0, sy, z + 0.22));
    sg.dispose();
    decorPanel(k, 'emblem', 0, sy - 0.02, z + 0.535, 1.42, 1.42, GLOW.emblem);

    // ---- portal niche (3 m deep): dark walls, deep glow, concentric "turbine" rings, chandelier
    const d0 = z - T;
    const d1 = z - L.portalDepth;
    boxMinMax(k.paint, -L.portalW / 2, Y, d1 - 0.2, L.portalW / 2, L.portalApex, d1, PAINT.interior);
    for (const s of [-1, 1]) boxMinMax(k.paint, s * (L.portalW / 2), Y, d1, s * (L.portalW / 2 + 0.3), L.portalApex, d0, PAINT.interior);
    boxMinMax(k.paint, -L.portalW / 2, L.portalApex - 0.9, d1, L.portalW / 2, L.portalApex, d0, PAINT.interior);
    this.pane({ ...portal, w: L.portalW - 0.1, h: portal.h - 0.1 }, d1 + 0.02, 0, LED_KIND.portal);
    k.led.polyline(
      this.archPoints(portal, 0.14, 44).map((p) => new THREE.Vector3(p.x, p.y, z + 0.39)),
      OUT,
      0.09,
    );
    for (const [f, zz] of [
      [0.86, d0 - 0.35],
      [0.72, d0 - 1.05],
      [0.58, d0 - 1.7],
    ] as const) {
      const ring: Opening = { cx: 0, y0: Y + 0.02, w: L.portalW * f, h: (L.portalApex - Y) * (0.25 + 0.75 * f), kind: 'pointed' };
      this.frame(ring, zz, 0.16, 0.14, TINT.wall, 'gold');
      k.led.polyline(
        this.archPoints(ring, 0.08, 30).map((p) => new THREE.Vector3(p.x, p.y, zz + 0.16)),
        OUT,
        0.06,
      );
    }
    // downward spots in the crown of the niche
    for (let i = 0; i < 6; i++) {
      const x = -1.7 + (i * 3.4) / 5;
      const g = new THREE.CylinderGeometry(0.12, 0.1, 0.3, 8);
      k.metal.add(g, new THREE.Matrix4().makeTranslation(x, L.portalApex - 1.05, d0 - 0.5 - (i % 2) * 0.6), { color: METAL.black });
      g.dispose();
    }
    const cy = L.portalApex - 1.8;
    const cz = d1 + 0.9;
    const ring = new THREE.TorusGeometry(0.75, 0.05, 6, 24);
    k.gold.add(ring, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, cy, cz));
    ring.dispose();
    const ring2 = new THREE.TorusGeometry(0.42, 0.04, 6, 18);
    k.gold.add(ring2, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, cy + 0.45, cz));
    ring2.dispose();
    rod(k.gold, new THREE.Vector3(0, cy, cz), new THREE.Vector3(0, L.portalApex - 0.9, cz), 0.04);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const p = new THREE.Vector3(Math.cos(a) * 0.75, cy + 0.14, cz + Math.sin(a) * 0.75);
      cyl(k.gold, p.x, cy, p.z, 0.03, 0.03, cy + 0.12, 4);
      k.led.rect(p, RIGHT, UP, 0.12, 0.2, LED_KIND.candle, (i * 0.137) % 1);
      k.led.rect(p, OUT, UP, 0.12, 0.2, LED_KIND.candle, (i * 0.291) % 1);
    }

    // ---- DJ riser + desk (4 x 1.1 m at Z −7.5) with the red/gold booth banner
    const bz = L.boothZ;
    boxMinMax(k.paint, -2.6, Y, d1 + 0.05, 2.6, Y + 0.08, z - 0.2, PAINT.grey);
    boxMinMax(k.paint, -2.0, Y + 0.08, bz - 0.55, 2.0, Y + 1.35, bz + 0.55, PAINT.black);
    boxMinMax(k.paint, -2.1, Y + 1.35, bz - 0.6, 2.1, Y + 1.42, bz + 0.6, PAINT.grey);
    decorPanel(k, 'booth', 0, Y + 0.74, bz + 0.561, 3.9, 1.1, GLOW.banner);
    k.led.rect(new THREE.Vector3(0, Y + 0.74, bz + 0.575), RIGHT, UP, 3.9, 1.1, LED_KIND.panel, 3.9, 1.1);
    for (const x of [-1.25, -0.42, 0.42, 1.25]) {
      const w = Math.abs(x) > 1 ? 0.62 : 0.5;
      boxMinMax(k.paint, x - w / 2, Y + 1.42, bz - 0.45, x + w / 2, Y + 1.54, bz + 0.35, PAINT.grey);
      k.led.rect(new THREE.Vector3(x, Y + 1.555, bz - 0.1), RIGHT, new THREE.Vector3(0, 0, -1), w * 0.55, 0.18, LED_KIND.screen);
    }
    for (const x of [-4.4, 4.4]) this.floodCan(x, Y, z + 0.7);

    // ---- screen piers between portal and arches: bronze shield + small lancet
    for (const s of [-1, 1]) {
      const x = s * 4.6;
      decorDisc(k, 'shield', x, 4.1, z + 0.04, 0.95, GLOW.none);
      const tor = new THREE.TorusGeometry(0.98, 0.07, 6, 28);
      k.gold.add(tor, new THREE.Matrix4().makeTranslation(x, 4.1, z + 0.06));
      tor.dispose();
      const o: Opening = { cx: x, y0: 5.7, w: 0.7, h: 1.85, kind: 'lancet' };
      this.frame(o, z, 0.12, 0.1);
      const pg = new THREE.ShapeGeometry(paneShape(o, k.seg), k.seg);
      k.led.geometry(pg, new THREE.Matrix4().makeTranslation(0, 0, z + 0.02), LED_KIND.window, 0.7);
      pg.dispose();
    }
    // anchors: the DJ booth + portal-side floor fixtures
    k.pts.fixturesFloor.push(new THREE.Vector3(-3.6, Y + 0.3, z + 1.2), new THREE.Vector3(3.6, Y + 0.3, z + 1.2));
  }

  // -------------------------------------------------------------------------------------------
  // stairs: from the deck (1.9) through the arches up to the upper castle platform (5.5)

  private stairs(s: number): void {
    const k = this.kit;
    const Y = L.deckY;
    const n = 12;
    const x0 = L.stairX0,
      x1 = L.stairX1;
    const rise = (L.platformY - Y) / n;
    const run = (x1 - x0) / n;
    const zf = L.porchFrontZ - L.screenT;
    const zb = L.stairBackZ;
    for (let i = 0; i < n; i++) {
      const a = s * (x0 + i * run),
        b = s * (x0 + (i + 1) * run);
      boxMinMax(k.stone, Math.min(a, b), Y, zb, Math.max(a, b), Y + rise * (i + 1), zf, TINT.stair);
      boxMinMax(k.stone, Math.min(a, b), Y + rise * (i + 1) - 0.04, zf - 0.04, Math.max(a, b), Y + rise * (i + 1), zf + 0.02, TINT.trim);
    }
    // landing + the upper platform behind the recess (reaching the gallery)
    const la = s * x1,
      lb = s * (L.porchHalf + 0.7);
    boxMinMax(k.stone, Math.min(la, lb), Y, zb, Math.max(la, lb), L.platformY, zf, TINT.stair);
    const pa = s * x0;
    boxMinMax(k.stone, Math.min(pa, lb), Y, L.facadeZ, Math.max(pa, lb), L.platformY - 0.1, zb, TINT.wall);
    boxMinMax(k.stone, Math.min(pa, lb), L.platformY - 0.1, L.facadeZ, Math.max(pa, lb), L.platformY, zb + 0.05, TINT.stair);
    // railings: along the flight, and along the platform edge over the recess
    railing(k, [new THREE.Vector3(s * x0, Y, zf - 0.1), new THREE.Vector3(s * x1, L.platformY, zf - 0.1), new THREE.Vector3(s * (L.porchHalf - 0.1), L.platformY, zf - 0.1)], 1.05, 1.0);
    railing(k, [new THREE.Vector3(s * (x0 + 0.1), L.platformY, zb - 0.08), new THREE.Vector3(s * (x1 - 0.1), L.platformY, zb - 0.08)], 1.05, 1.2);
    // glowing arcade in the back of the recess (seen through the arch)
    for (const cx of [7.6, 10.2]) {
      const o: Opening = { cx: s * cx, y0: 0, w: 1.3, h: 1.6, kind: 'pointed' };
      const m = new THREE.Matrix4().makeTranslation(0, L.platformY + 0.35, zb + 0.02);
      const g = new THREE.ShapeGeometry(paneShape(o, k.seg), k.seg);
      k.led.geometry(g, m, LED_KIND.arcade, this.rng.next());
      g.dispose();
    }
  }

  // -------------------------------------------------------------------------------------------
  // facade Z −12 (full width, continuous behind the porch)

  private facade(): void {
    const k = this.kit;
    const z = L.facadeZ;
    const Y = L.deckY;
    const top = L.wallTop;
    const holes: Opening[] = [];
    const arcade: Opening[] = [];
    const lancets: Opening[] = [];
    const big: Opening[] = [];
    for (const s of [-1, 1]) {
      for (const cx of [14.7, 17.4, 20.1]) arcade.push({ cx: s * cx, y0: 2.05, w: 1.9, h: 2.85, kind: 'round' });
      for (const o of [-0.52, 0.52]) lancets.push({ cx: s * 14.85 + o, y0: 6.35, w: 0.72, h: 1.95, kind: 'lancet' });
      big.push({ cx: s * 30.6, y0: 3.3, w: 3.2, h: 5.5, kind: 'pointed' });
      for (const o of [-0.45, 0.45]) lancets.push({ cx: s * 35.0 + o, y0: 6.9, w: 0.6, h: 1.7, kind: 'lancet' });
    }
    holes.push(...arcade, ...lancets, ...big);
    this.slab(wallShape(-L.coreHalf, L.coreHalf, Y - 0.3, top, holes, k.seg), z, 1.2);
    for (const o of arcade) {
      this.frame(o, z, 0.3, 0.2);
      this.pane(o, z, 0.5, LED_KIND.arcade);
      boxMinMax(k.stone, o.cx - 0.2, o.y0 + o.h - 0.1, z, o.cx + 0.2, o.y0 + o.h + 0.3, z + 0.28, TINT.cream);
    }
    for (const o of lancets) {
      this.frame(o, z, 0.12, 0.12);
      this.pane(o, z, 0.3, LED_KIND.window);
    }
    for (const s of [-1, 1]) {
      const hood: Opening = { cx: s * 14.85, y0: 6.35, w: 2.0, h: 2.2, kind: 'pointed' };
      this.frame(hood, z, 0.14, 0.2, TINT.trim);
      boxMinMax(k.stone, s * 14.85 - 1.15, 6.15, z, s * 14.85 + 1.15, 6.35, z + 0.3, TINT.trim);
    }
    for (const o of big) {
      this.frame(o, z, 0.3, 0.26);
      this.pane(o, z, 0.3, LED_KIND.window);
      this.tracery(o, z);
      boxMinMax(k.stone, o.cx - o.w / 2 - 0.3, o.y0 - 0.3, z, o.cx + o.w / 2 + 0.3, o.y0, z + 0.34, TINT.trim);
    }
    // plinth, string course (outer bays), cornice, LED line under it
    boxMinMax(k.stone, -L.coreHalf, Y, z, L.coreHalf, Y + 0.3, z + 0.18, TINT.trim);
    for (const s of [-1, 1]) {
      const a = s * OUTER.x + s * OUTER.w / 2,
        b = s * L.coreHalf;
      boxMinMax(k.stone, Math.min(a, b), 9.0 - 0.25, z, Math.max(a, b), 9.0, z + 0.26, TINT.trim);
    }
    boxMinMax(k.stone, -L.coreHalf, top - 0.3, z - 0.2, L.coreHalf, top, z + 0.36, TINT.trim);
    for (const s of [-1, 1]) {
      const a = s * (L.porchHalf + 0.7),
        b = s * L.coreHalf;
      k.led.bar(new THREE.Vector3(Math.min(a, b), top - 0.38, z + 0.37), new THREE.Vector3(Math.max(a, b), top - 0.38, z + 0.37), OUT, 0.1);
    }
    k.led.bar(new THREE.Vector3(-L.porchHalf, top - 0.38, z + 0.37), new THREE.Vector3(L.porchHalf, top - 0.38, z + 0.37), OUT, 0.1);
    // parapet: plain coping over the dragon's chest (|x| < 10.4), the raised battlement block the
    // right foreleg's talons hook over, merlons elsewhere (not behind the projecting outer towers)
    const [c0, c1] = L.clawBlock;
    boxMinMax(k.stone, -c0, top, z - 1.2, c0, top + 0.28, z + 0.05, TINT.trim);
    boxMinMax(k.stone, c0, top, z - 0.95, c1, L.clawBlockTop, z + 0.08, TINT.trim);
    boxMinMax(k.stone, c0 - 0.1, L.clawBlockTop - 0.14, z - 1.0, c1 + 0.1, L.clawBlockTop, z + 0.14, TINT.cream);
    const ox0 = OUTER.x - OUTER.w / 2,
      ox1 = OUTER.x + OUTER.w / 2;
    this.merlons(c1, ox0, top, z + 0.02, 0.4);
    this.merlons(ox1, L.coreHalf, top, z + 0.02, 0.4);
    this.merlons(-ox0, -c0, top, z + 0.02, 0.4);
    this.merlons(-L.coreHalf, -ox1, top, z + 0.02, 0.4);
    // pilasters + vertical LED battens + pinnacles through the parapet
    const pil: [number, number, number][] = [
      // [x, y0, y1]
      [13.35, 2.1, 5.1],
      [16.05, 2.1, 5.1],
      [18.75, 2.1, 5.1],
      [21.8, 2.1, 5.1],
      [13.35, 5.5, top - 0.3],
      [16.5, 5.5, top - 0.3],
      [28.5, 2.1, top - 0.3],
      [32.7, 2.1, top - 0.3],
      [36.6, 2.1, top - 0.3],
    ];
    for (const s of [-1, 1]) {
      for (const [px, y0, y1] of pil) {
        const x = s * px;
        boxMinMax(k.stone, x - 0.3, y0, z, x + 0.3, y1, z + 0.32, TINT.trim);
        const st = k.led.newStrip();
        k.led.bar(new THREE.Vector3(x, y0 + 0.25, z + 0.33), new THREE.Vector3(x, y1 - 0.2, z + 0.33), OUT, 0.12, st, 0, LED_KIND.bar, 1);
      }
      for (const px of [16.5, 28.5, 32.7, 36.6]) this.pinnacle(s * px, top + L.merlonH, z - 0.2, 0.5, 1.8);
      if (s < 0) this.pinnacle(-13.35, top + L.merlonH, z - 0.2, 0.5, 1.8);
      // parapet gerbs on the wall walk (bible X ±25.7…±35; the outer towers take ±23…±28 here)
      for (const x of [29.4, 32.4, 35.6]) k.pts.roof.push(new THREE.Vector3(s * x, top + 0.1, z - 0.7));
      // moving heads behind the merlons
      for (const [a, b] of [
        [15.0, 22.0],
        [28.9, 36.5],
      ]) {
        const n = 6;
        for (let i = 0; i < n; i++) k.pts.fixturesTruss.push(new THREE.Vector3(s * (a + ((b - a) * i) / (n - 1)), top + 0.45, z - 0.8));
      }
      // lasers on the parapet (bible X ±7, ±32 at Y 10)
      k.pts.laserStage.push(new THREE.Vector3(s * 7, top + 0.3, z - 0.8), new THREE.Vector3(s * 32, top + 0.3, z - 0.8));
      // flood cans on the deck under the outer bays
      for (const x of [29, 33, 36]) this.floodCan(s * x, Y, z + 1.0);
    }
  }

  /** stone tracery in a large pointed window: two mullions, a transom and a rose in the head */
  private tracery(o: Opening, zf: number): void {
    const k = this.kit;
    const zt = zf - 0.16;
    const spring = o.y0 + o.h - o.w * 0.866;
    for (const f of [-1 / 6, 1 / 6]) boxMinMax(k.stone, o.cx + f * o.w - 0.07, o.y0, zt - 0.1, o.cx + f * o.w + 0.07, spring + 0.25, zt + 0.1, TINT.trim);
    boxMinMax(k.stone, o.cx - o.w / 2, o.y0 + (spring - o.y0) * 0.55, zt - 0.1, o.cx + o.w / 2, o.y0 + (spring - o.y0) * 0.55 + 0.12, zt + 0.1, TINT.trim);
    const rose = new THREE.TorusGeometry(o.w * 0.24, 0.07, 6, 20);
    k.stone.add(rose, new THREE.Matrix4().makeTranslation(o.cx, spring + o.w * 0.34, zt), { color: TINT.trim });
    rose.dispose();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r0 = o.w * 0.24;
      rod(k.stone, new THREE.Vector3(o.cx, spring + o.w * 0.34, zt), new THREE.Vector3(o.cx + Math.cos(a) * r0, spring + o.w * 0.34 + Math.sin(a) * r0, zt), 0.06, TINT.trim);
    }
    for (const f of [-1 / 3, 0, 1 / 3]) {
      const a = new THREE.TorusGeometry(o.w / 6, 0.05, 5, 10, Math.PI);
      k.stone.add(a, new THREE.Matrix4().makeTranslation(o.cx + f * o.w, spring + 0.2, zt), { color: TINT.trim });
      a.dispose();
    }
  }

  // -------------------------------------------------------------------------------------------
  // gallery (upper castle platform, Y 5.5) along the inner bays

  private gallery(s: number): void {
    const k = this.kit;
    const x0 = s * (L.porchHalf + 0.7),
      x1 = s * (OUTER.x - OUTER.w / 2);
    const xa = Math.min(x0, x1),
      xb = Math.max(x0, x1);
    const zf = L.galleryFrontZ;
    boxMinMax(k.stone, xa, L.platformY - 0.4, L.facadeZ, xb, L.platformY, zf, TINT.trim);
    boxMinMax(k.stone, xa, L.platformY - 0.55, zf - 0.02, xb, L.platformY - 0.35, zf + 0.12, TINT.cream);
    // corbels
    for (let x = xa + 0.7; x < xb - 0.4; x += 1.45) {
      const c = new THREE.ConeGeometry(0.34, 0.9, 4);
      k.stone.add(c, new THREE.Matrix4().makeRotationX(Math.PI).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 4)).setPosition(x, L.platformY - 0.85, zf - 0.45), { color: TINT.trim });
      c.dispose();
    }
    railing(k, [new THREE.Vector3(x0, L.platformY, zf + 0.06), new THREE.Vector3(x1, L.platformY, zf + 0.06)], 1.1, 1.45);
    // LED line along the gallery edge (the "front-line lamp row" of the castle)
    k.led.bar(new THREE.Vector3(xa, L.platformY - 0.45, zf + 0.13), new THREE.Vector3(xb, L.platformY - 0.45, zf + 0.13), OUT, 0.1);
    for (let i = 0; i < 4; i++) k.pts.deckBack.push(new THREE.Vector3(s * (14 + i * 2.8), L.platformY + 0.02, L.facadeZ + 0.8));
  }

  // -------------------------------------------------------------------------------------------
  // towers

  private tower(t: TowerSpec, s: number): void {
    const k = this.kit;
    const x = s * t.x;
    const hw = t.w / 2;
    const zf = t.frontZ;
    const zb = zf - t.depth;
    const zc = (zf + zb) / 2;
    const inner = t.kind === 'inner';
    const tiers: Opening[] = [];
    if (inner) {
      for (const o of [-0.58, 0.58]) tiers.push({ cx: x + o, y0: 11.1, w: 0.78, h: 2.3, kind: 'lancet' });
    } else {
      for (const o of [-0.62, 0.62]) tiers.push({ cx: x + o, y0: 9.1, w: 0.78, h: 2.05, kind: 'lancet' });
      tiers.push({ cx: x, y0: 11.55, w: 0.95, h: 1.45, kind: 'pointed' });
    }
    this.slab(wallShape(x - hw, x + hw, t.base, t.body, tiers, k.seg), zf, 0.5, TINT.cool);
    boxMinMax(k.stone, x - hw, t.base, zb, x + hw, t.body, zf - 0.5, TINT.wall);
    for (const o of tiers) {
      this.frame(o, zf, 0.14, 0.14);
      this.pane(o, zf, 0.28, LED_KIND.window);
      boxMinMax(k.stone, o.cx - o.w / 2 - 0.2, o.y0 - 0.2, zf, o.cx + o.w / 2 + 0.2, o.y0, zf + 0.25, TINT.trim);
    }
    // side windows (upper tier)
    for (const side of [-1, 1]) this.appliedLancet(x + side * hw, inner ? 11.3 : 10.6, zc, side * (Math.PI / 2), 0.8, 2.0);
    // corner shafts with LED outlines
    const shaft0 = inner ? 10.4 : t.base + 0.4;
    for (const e of [-1, 1]) {
      const cx = x + e * (hw - 0.22);
      boxMinMax(k.stone, cx - 0.28, t.base, zf - 0.2, cx + 0.28, t.body - 0.4, zf + 0.26, TINT.trim);
      k.led.bar(new THREE.Vector3(cx, shaft0, zf + 0.26), new THREE.Vector3(cx, t.body - 0.6, zf + 0.26), OUT, 0.11);
    }
    for (const y of inner ? [10.75] : [2.3, 8.7, 11.3]) boxMinMax(k.stone, x - hw - 0.08, y, zf - 0.1, x + hw + 0.08, y + 0.26, zf + 0.3, TINT.trim);
    // cornice, parapet on 4 sides, merlons, roof deck
    const py = t.body;
    boxMinMax(k.stone, x - hw - 0.3, py - 0.4, zb - 0.3, x + hw + 0.3, py, zf + 0.35, TINT.trim);
    boxMinMax(k.stone, x - hw - 0.25, py, zf - 0.1, x + hw + 0.25, py + 0.6, zf + 0.3, TINT.wall);
    boxMinMax(k.stone, x - hw - 0.25, py, zb - 0.25, x + hw + 0.25, py + 0.6, zb + 0.15, TINT.wall);
    boxMinMax(k.stone, x - hw - 0.25, py, zb - 0.25, x - hw + 0.15, py + 0.6, zf + 0.3, TINT.wall);
    boxMinMax(k.stone, x + hw - 0.15, py, zb - 0.25, x + hw + 0.25, py + 0.6, zf + 0.3, TINT.wall);
    this.merlons(x - hw - 0.25, x + hw + 0.25, py + 0.6, zf + 0.3, 0.4, 0.65, 0.55, 0.45);
    boxMinMax(k.stone, x - hw, py - 0.05, zb, x + hw, py + 0.05, zf - 0.1, TINT.dark);
    k.led.bar(new THREE.Vector3(x - hw - 0.3, py - 0.45, zf + 0.36), new THREE.Vector3(x + hw + 0.3, py - 0.45, zf + 0.36), OUT, 0.1);
    // corner pinnacles (inner towers: tall, to Y 18)
    const pinH = inner ? t.capTop - py - 0.1 : 1.8;
    for (const e of [-1, 1])
      for (const f of [0, 1]) this.pinnacle(x + e * (hw + 0.02), py + 0.1, f === 0 ? zf + 0.02 : zb - 0.02, inner ? 0.62 : 0.56, pinH);
    const top = py + 0.6;
    if (inner) {
      // torch pedestal in the middle (the 15 m Power Flame positions)
      cyl(k.stone, x, py, zc, 0.75, 0.62, py + 0.95, 10, TINT.trim);
      const bowl = new THREE.TorusGeometry(0.6, 0.12, 6, 16);
      k.gold.add(bowl, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(x, py + 0.98, zc));
      bowl.dispose();
      k.pts.towerTorches.push(new THREE.Vector3(x, py + 1.1, zc));
      k.pts.towersTop.push(new THREE.Vector3(x, top, zc));
      k.pts.laserStage.push(new THREE.Vector3(x, py + 0.35, zf - 0.55));
      k.pts.fixturesTruss.push(new THREE.Vector3(x - 1.05, py + 0.35, zf - 0.6), new THREE.Vector3(x + 1.05, py + 0.35, zf - 0.6));
    } else {
      // slender octagonal needle spire on a drum (to Y 18), lucarne, gold finial
      cyl(k.stone, x, py, zc, 1.35, 1.35, top + 0.3, 8, TINT.trim);
      const g = new THREE.ConeGeometry(1.3, t.capTop - top - 0.3, 8, 1);
      k.stone.add(g, new THREE.Matrix4().makeRotationY(Math.PI / 8).setPosition(x, top + 0.3 + (t.capTop - top - 0.3) / 2, zc), { color: TINT.trim });
      g.dispose();
      this.finial(x, t.capTop, zc);
      boxMinMax(k.stone, x - 0.36, top + 0.2, zc + 0.6, x + 0.36, top + 1.2, zc + 1.45, TINT.trim);
      k.led.rect(new THREE.Vector3(x, top + 0.7, zc + 1.47), RIGHT, UP, 0.38, 0.62, LED_KIND.window, 0.5);
      k.pts.towersTop.push(new THREE.Vector3(x, top, zf - 0.9));
      k.pts.laserStage.push(new THREE.Vector3(x, py + 0.35, zf - 0.7));
      k.pts.fixturesTruss.push(new THREE.Vector3(x - 1.45, py + 0.35, zf - 0.75), new THREE.Vector3(x + 1.45, py + 0.35, zf - 0.75));
      // flame-eye banner (2.3 x 5.4, backlit) on the lower storey + LED panel for 'screens'
      const bz = zf + 0.31;
      rod(k.metal, new THREE.Vector3(x - 1.3, 8.35, bz + 0.05), new THREE.Vector3(x + 1.3, 8.35, bz + 0.05), 0.07, METAL.black);
      decorPanel(k, 'banner', x, 8.35 - 2.7, bz + 0.08, 2.3, 5.4, GLOW.banner);
      k.led.rect(new THREE.Vector3(x, 8.35 - 2.7, bz + 0.1), RIGHT, UP, 2.3, 5.4, LED_KIND.panel, 2.3, 5.4);
      this.floodCan(x, L.deckY, zf + 1.1);
    }
  }

  // -------------------------------------------------------------------------------------------
  // skull medallions (glowing eyes) on the facade

  private medallion(s: number): void {
    const k = this.kit;
    const x = s * MED.x;
    const z = L.facadeZ;
    const back = new THREE.CylinderGeometry(MED.r + 0.14, MED.r + 0.14, 0.24, 32);
    k.stone.add(back, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(x, MED.y, z + 0.12), { color: TINT.trim });
    back.dispose();
    decorDisc(k, 'medallion', x, MED.y, z + 0.25, MED.r, GLOW.skull);
    const ring = new THREE.TorusGeometry(MED.r + 0.06, 0.12, 8, 40);
    k.gold.add(ring, new THREE.Matrix4().makeTranslation(x, MED.y, z + 0.3));
    ring.dispose();
  }

  private bayDecor(s: number): void {
    const k = this.kit;
    const z = L.facadeZ + 0.33;
    // skull niche panel in the outer bay + gold sill
    decorPanel(k, 'skullNiche', s * 35.0, 4.35, z - 0.02, 2.3, 3.7, GLOW.skull);
    boxMinMax(k.gold, s * 35 - 1.25, 2.4, z - 0.3, s * 35 + 1.25, 2.52, z + 0.05);
    // kintsugi stone face in a gold niche in the inner bay's upper storey
    decorPanel(k, 'faceNiche', s * 18.2, 7.3, L.facadeZ + 0.03, 1.2, 1.92, GLOW.none);
    // flood cans under the gallery (they "produce" the virtual flood field)
    for (const x of [15, 19.5]) this.floodCan(s * x, L.deckY, L.galleryFrontZ + 0.6);
  }

  // -------------------------------------------------------------------------------------------
  // closed roof + scaffold back wall (hides the wing roots / wrists) and the rear pyro scaffold

  private roofAndBack(): void {
    const k = this.kit;
    const zb = L.coreBackZ;
    // black scrim over scaffold (a real set is only printed flats from the front)
    boxMinMax(k.paint, -L.coreHalf, L.roofY - 0.2, zb, L.coreHalf, L.roofY, L.facadeZ - 1.2, PAINT.black);
    boxMinMax(k.paint, -L.coreHalf, -1, zb - 0.3, L.coreHalf, L.roofY, zb, PAINT.black);
    // core end walls (inside the side sections, closes the volume)
    for (const s of [-1, 1]) boxMinMax(k.paint, s * L.coreHalf - (s > 0 ? 0.3 : 0), -1, zb, s * L.coreHalf + (s < 0 ? 0.3 : 0), L.roofY, L.facadeZ - 1.2, PAINT.black);
  }

  private scaffold(): void {
    const k = this.kit;
    const z = -22;
    const topY = 18;
    const col = METAL.black;
    const w = 0.7;
    const xs = [-32, -24, -16, -8, 0, 8, 16, 24, 32];
    for (const x of xs) {
      // square lattice tower from the castle roof to the top chord
      for (const [dx, dz] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ])
        rod(k.metal, new THREE.Vector3(x + (dx * w) / 2, L.roofY, z + (dz * w) / 2), new THREE.Vector3(x + (dx * w) / 2, topY, z + (dz * w) / 2), 0.06, col);
      for (let y = L.roofY + 0.4; y < topY; y += 1.4) {
        rod(k.metal, new THREE.Vector3(x - w / 2, y, z + w / 2), new THREE.Vector3(x + w / 2, y + 0.7, z + w / 2), 0.035, col);
        rod(k.metal, new THREE.Vector3(x - w / 2, y + 0.7, z - w / 2), new THREE.Vector3(x + w / 2, y + 1.4, z - w / 2), 0.035, col);
      }
      k.pts.roofComets.push(new THREE.Vector3(x, topY, z));
    }
    // top chord (box truss) with diagonals
    const x0 = -33,
      x1 = 33;
    for (const dz of [-w / 2, w / 2])
      for (const y of [topY - 0.6, topY]) rod(k.metal, new THREE.Vector3(x0, y, z + dz), new THREE.Vector3(x1, y, z + dz), 0.06, col);
    for (let x = x0; x < x1 - 0.01; x += 1.2) {
      for (const dz of [-w / 2, w / 2]) rod(k.metal, new THREE.Vector3(x, topY - 0.6, z + dz), new THREE.Vector3(x + 1.2, topY, z + dz), 0.03, col);
    }
    // grated walkway on the top chord
    boxMinMax(k.metal, x0, topY - 0.04, z - w / 2, x1, topY, z + w / 2, METAL.steel);
    // roof gerb positions on the chord (bible X −21…+21 @ 4.67)
    for (let i = 0; i < 10; i++) {
      const x = -21 + (42 * i) / 9;
      cyl(k.metal, x, topY, z, 0.12, 0.1, topY + 0.35, 6, col);
      k.pts.roof.push(new THREE.Vector3(x, topY + 0.35, z));
    }
  }
}
