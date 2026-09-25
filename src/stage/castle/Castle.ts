import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { boxMinMax, cyl, decorDisc, decorPanel, GLOW, METAL, PAINT, railing, rod, type StageKit, TINT } from '../kit';
import { type ArchKind, extrude, frameShape, type Opening, paneShape, wallShape } from '../lib/gothic';
import { L, TOWERS, type TowerSpec } from '../layout';
import { LED_KIND } from '../materials/LedMaterial';

/**
 * The grey gothic castle base of the 2026 RED (printed scenic flats on scaffold in reality):
 * central DJ gate with the pointed portal, three towers per side (lancet tiers, battlements, spire,
 * cream cone), wall bays with a round-arch arcade on the lower storey and lancet pairs above,
 * pilasters with pixel LED battens, crenellated parapets, the red-skirted terrace with black
 * railings and the big stone stair flights left and right of the portal.
 */
const OUT = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);

interface BaySpec {
  /** inner / outer x of the bay (right side, mirrored) */
  x0: number;
  x1: number;
  z: number;
  top: number;
  arcade: number[];
  lancets: number[];
  pilasters: number[];
  arcadeKind?: ArchKind;
}

export class CastleBuilder {
  private rng = new Rng(2026);

  constructor(private kit: StageKit) {}

  build(): void {
    this.gate();
    const bays: BaySpec[] = [
      { x0: L.gateHalf, x1: 17, z: L.facadeZ, top: L.wallTop, arcade: [], lancets: [9.6, 13.1], pilasters: [6.5, 11.35, 16.5] },
      { x0: 23, x1: 31.5, z: L.facadeZ, top: L.wallTop, arcade: [24.8, 29.7], lancets: [24.8, 29.7], pilasters: [23.4, 26.1, 28.4, 31.1] },
      { x0: 36.5, x1: 43.5, z: L.facadeZ, top: L.wallTop - 0.2, arcade: [38.3, 41.7], lancets: [38.3, 41.7], pilasters: [36.9, 40, 43.1], arcadeKind: 'pointed' },
    ];
    for (const s of [1, -1]) {
      for (const b of bays) this.bay(b, s);
      for (const t of TOWERS) this.tower(t, s);
      this.stairs(s);
      this.terrace(s);
      this.bayDecor(s);
    }
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

  private merlons(x0: number, x1: number, y: number, zFront: number, depth: number, h = 0.9, w = 0.8, gap = 0.65): void {
    const n = Math.max(1, Math.floor((x1 - x0 + gap) / (w + gap)));
    const used = n * w + (n - 1) * gap;
    const start = x0 + (x1 - x0 - used) / 2;
    for (let i = 0; i < n; i++) {
      const a = start + i * (w + gap);
      boxMinMax(this.kit.stone, a, y, zFront - depth, a + w, y + h, zFront, TINT.trim);
    }
  }

  // -------------------------------------------------------------------------------------------
  // central gate with the DJ portal

  private gate(): void {
    const k = this.kit;
    const z = L.gateFrontZ;
    const Y = L.deckY;
    const portal: Opening = { cx: 0, y0: Y, w: L.portalW, h: L.portalApex - Y, kind: 'pointed' };
    // gate wall with the portal opening (1.2 m thick)
    // the gate stops at the parapet line: above it (|x| < 6, y > 9.3) the dragon's jaw, neck and
    // chest sit on the castle (crown module), so nothing of the castle may intrude there
    this.slab(wallShape(-L.gateHalf, L.gateHalf, Y - 0.3, L.wallTop, [portal], this.kit.seg), z, 1.2, TINT.warm);
    boxMinMax(k.stone, -L.gateHalf, L.wallTop - 0.3, z - 1.2, L.gateHalf, L.wallTop, z + 0.3, TINT.trim);
    // side buttresses of the gate block
    for (const s of [-1, 1]) {
      boxMinMax(k.stone, s * L.gateHalf - 0.7 * s, Y, z - 1.2, s * L.gateHalf + 0.2 * s, L.wallTop + 0.9, z + 0.5, TINT.trim);
      // stepped set-offs
      boxMinMax(k.stone, s * L.gateHalf - 0.8 * s, 4.2, z, s * L.gateHalf + 0.3 * s, 4.6, z + 0.75, TINT.trim);
      boxMinMax(k.stone, s * L.gateHalf - 0.8 * s, 7.4, z, s * L.gateHalf + 0.3 * s, 7.8, z + 0.65, TINT.trim);
      // pinnacle on the buttress
      this.pinnacle(s * (L.gateHalf - 0.25), L.wallTop + 0.9, z - 0.35, 0.7, 2.2);
    }
    // bronze/gold scroll frame around the portal + cream outer ring
    this.frame(portal, z, 0.55, 0.38, TINT.wall, 'gold');
    const outer: Opening = { cx: 0, y0: Y, w: L.portalW + 1.1, h: L.portalApex - Y + 0.55, kind: 'pointed' };
    this.frame(outer, z, 0.28, 0.22, TINT.cream);
    // chevron studs on the cream ring (small gold diamonds)
    const pts = this.archPoints(outer, 0.14, 26);
    for (const p of pts) {
      const g = new THREE.OctahedronGeometry(0.13, 0);
      k.gold.add(g, new THREE.Matrix4().makeTranslation(p.x, p.y, z + 0.26));
      g.dispose();
    }
    // baroque C-scrolls at the springing and a crest of gold spikes on the apex
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const tor = new THREE.TorusGeometry(0.42 - i * 0.08, 0.07, 6, 14, Math.PI * 1.4);
        const m = new THREE.Matrix4().makeRotationZ(s > 0 ? -0.6 + i * 0.7 : Math.PI + 0.6 - i * 0.7);
        m.setPosition(s * (L.portalW / 2 + 0.75), Y + 3.2 + i * 1.05, z + 0.42);
        k.gold.add(tor, m);
        tor.dispose();
      }
    }
    for (let i = -3; i <= 3; i++) {
      const a = (i / 3) * 0.9;
      const g = new THREE.ConeGeometry(0.12, 0.9 - Math.abs(i) * 0.1, 5);
      const m = new THREE.Matrix4().makeRotationZ(-a);
      m.setPosition(Math.sin(a) * 1.1, L.portalApex + 0.75 + Math.cos(a) * 0.9, z + 0.3);
      k.gold.add(g, m);
      g.dispose();
    }
    // original emblem keystone: gold shield backing + atlas emblem
    const sh = new THREE.Shape();
    sh.moveTo(-0.95, 0.8);
    sh.lineTo(0.95, 0.8);
    sh.lineTo(0.95, 0.05);
    sh.quadraticCurveTo(0.9, -0.6, 0, -1.0);
    sh.quadraticCurveTo(-0.9, -0.6, -0.95, 0.05);
    sh.closePath();
    const sg = extrude(sh, 0.3, k.seg);
    k.gold.add(sg, new THREE.Matrix4().makeTranslation(0, L.portalApex + 0.55, z + 0.2));
    sg.dispose();
    decorPanel(k, 'emblem', 0, L.portalApex + 0.47, z + 0.515, 1.75, 1.75, GLOW.emblem);

    // portal niche interior: dark walls + deep glow + chandelier
    const d0 = z - 1.2;
    const d1 = z - 4.2;
    boxMinMax(k.paint, -L.portalW / 2, Y, d1 - 0.2, L.portalW / 2, L.portalApex, d1, PAINT.interior);
    for (const s of [-1, 1]) boxMinMax(k.paint, s * (L.portalW / 2), Y, d1, s * (L.portalW / 2 + 0.3), L.portalApex, d0, PAINT.interior);
    boxMinMax(k.paint, -L.portalW / 2, L.portalApex - 0.9, d1, L.portalW / 2, L.portalApex, d0, PAINT.interior);
    this.pane({ ...portal, w: L.portalW - 0.1, h: portal.h - 0.1 }, d1 + 0.02, 0, LED_KIND.portal);
    // pointed-arch glow outline inside the gold frame
    k.led.polyline(
      this.archPoints(portal, 0.14, 44).map((p) => new THREE.Vector3(p.x, p.y, z + 0.39)),
      OUT,
      0.09,
    );
    // chandelier
    const cy = L.portalApex - 1.75;
    const cz = z - 2.6;
    const ring = new THREE.TorusGeometry(0.75, 0.05, 6, 24);
    k.gold.add(ring, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, cy, cz));
    ring.dispose();
    const ring2 = new THREE.TorusGeometry(0.42, 0.04, 6, 18);
    k.gold.add(ring2, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, cy + 0.45, cz));
    ring2.dispose();
    rod(k.gold, new THREE.Vector3(0, cy, cz), new THREE.Vector3(0, L.portalApex - 0.5, cz), 0.04);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const p = new THREE.Vector3(Math.cos(a) * 0.75, cy + 0.14, cz + Math.sin(a) * 0.75);
      cyl(k.gold, p.x, cy, p.z, 0.03, 0.03, cy + 0.12, 4);
      k.led.rect(p, RIGHT, UP, 0.12, 0.2, LED_KIND.candle, (i * 0.137) % 1);
      k.led.rect(p, new THREE.Vector3(0, 0, 1), UP, 0.12, 0.2, LED_KIND.candle, (i * 0.291) % 1);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const p = new THREE.Vector3(Math.cos(a) * 0.42, cy + 0.58, cz + Math.sin(a) * 0.42);
      k.led.rect(p, RIGHT, UP, 0.1, 0.16, LED_KIND.candle, (i * 0.41) % 1);
    }

    // DJ riser + desk with the red/gold booth banner
    boxMinMax(k.paint, -3.4, Y, L.boothZ - 2.4, 3.4, Y + 0.08, L.boothZ + 0.6, PAINT.grey);
    boxMinMax(k.paint, -2.15, Y + 0.08, L.boothZ - 0.55, 2.15, Y + 1.35, L.boothZ + 0.55, PAINT.black);
    boxMinMax(k.paint, -2.25, Y + 1.35, L.boothZ - 0.6, 2.25, Y + 1.42, L.boothZ + 0.62, PAINT.grey);
    decorPanel(k, "booth", 0, Y + 0.74, L.boothZ + 0.561, 4.2, 1.1, GLOW.banner);
    k.led.rect(new THREE.Vector3(0, Y + 0.74, L.boothZ + 0.575), RIGHT, UP, 4.2, 1.1, LED_KIND.panel, 4.2, 1.1);
    // decks + mixer
    for (const x of [-1.25, -0.42, 0.42, 1.25]) {
      const w = Math.abs(x) > 1 ? 0.62 : 0.5;
      boxMinMax(k.paint, x - w / 2, Y + 1.42, L.boothZ - 0.45, x + w / 2, Y + 1.54, L.boothZ + 0.35, PAINT.grey);
      k.led.rect(new THREE.Vector3(x, Y + 1.555, L.boothZ - 0.1), RIGHT, new THREE.Vector3(0, 0, -1), w * 0.55, 0.18, LED_KIND.screen);
    }
    for (const x of [-4.2, 4.2]) this.floodCan(x, Y, z + 0.6);
    // gate crenellation
    for (const sx of [-1, 1]) this.merlons(Math.min(sx * 4.6, sx * L.gateHalf), Math.max(sx * 4.6, sx * L.gateHalf), L.wallTop, z + 0.05, 1.2);
    this.kit.pts.fixturesFloor.push(new THREE.Vector3(-3, Y + 0.35, L.boothZ - 1.6), new THREE.Vector3(3, Y + 0.35, L.boothZ - 1.6));
  }

  /** points along an arch outline (jambs + arch) offset outward by `off` */
  private archPoints(o: Opening, off: number, n: number): THREE.Vector2[] {
    const pts = paneShape({ ...o, w: o.w + off * 2, h: o.h + off }, 16).getPoints(16);
    // drop the closing bottom edge: resample the open outline evenly
    const open = pts.slice(0, pts.length);
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
    // small crockets
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

  // -------------------------------------------------------------------------------------------
  // wall bays

  private bay(b: BaySpec, s: number): void {
    const k = this.kit;
    const Y = L.deckY;
    const xa = Math.min(s * b.x0, s * b.x1);
    const xb = Math.max(s * b.x0, s * b.x1);
    const z = b.z;
    const holes: Opening[] = [];
    const arcKind = b.arcadeKind ?? 'round';
    for (const cx of b.arcade) holes.push({ cx: s * cx, y0: L.terraceY, w: 2.0, h: 2.75, kind: arcKind });
    const lan: Opening[] = [];
    for (const cx of b.lancets) {
      for (const o of [-0.52, 0.52]) lan.push({ cx: s * cx + o, y0: 6.75, w: 0.72, h: 1.95, kind: 'lancet' });
    }
    holes.push(...lan);
    this.slab(wallShape(xa, xb, Y, b.top, holes, k.seg), z, 0.6);
    // arcade: voussoir frames, glow panels, keystones
    for (const o of holes.slice(0, b.arcade.length)) {
      this.frame(o, z, 0.32, 0.22);
      this.pane(o, z, 0.5, LED_KIND.arcade);
      boxMinMax(k.stone, o.cx - 0.22, o.y0 + o.h - 0.1, z, o.cx + 0.22, o.y0 + o.h + 0.42, z + 0.3, TINT.cream);
    }
    // lancet pairs: frames, sills, glowing panes, a shared hood mould
    for (const o of lan) {
      this.frame(o, z, 0.12, 0.12);
      this.pane(o, z, 0.32, LED_KIND.window);
    }
    for (const cx of b.lancets) {
      const hood: Opening = { cx: s * cx, y0: 6.75, w: 2.0, h: 2.25, kind: 'pointed' };
      this.frame(hood, z, 0.14, 0.2, TINT.trim);
      boxMinMax(k.stone, s * cx - 1.15, 6.55, z, s * cx + 1.15, 6.75, z + 0.3, TINT.trim);
    }
    // plinth, string course, cornice, parapet, merlons
    boxMinMax(k.stone, xa, Y, z, xb, L.terraceY + 0.25, z + 0.18, TINT.trim);
    boxMinMax(k.stone, xa, 6.05, z, xb, 6.35, z + 0.28, TINT.trim);
    boxMinMax(k.stone, xa, b.top - 0.35, z - 0.2, xb, b.top, z + 0.38, TINT.trim);
    boxMinMax(k.stone, xa, b.top, z - 0.6, xb, b.top + 0.55, z + 0.05, TINT.wall);
    this.merlons(xa, xb, b.top + 0.55, z + 0.05, 0.65);
    // dark roof behind the parapet (seen from the drone) + scaffold-clad back wall closing the volume
    boxMinMax(k.stone, xa, b.top - 0.3, z - 12, xb, b.top - 0.05, z - 0.6, TINT.dark);
    boxMinMax(k.stone, xa, Y, z - 12.3, xb, b.top - 0.3, z - 12, TINT.dark);
    // pilasters + vertical LED battens
    for (const px of b.pilasters) {
      const x = s * px;
      boxMinMax(k.stone, x - 0.32, L.terraceY, z, x + 0.32, b.top - 0.35, z + 0.34, TINT.trim);
      const st = k.led.newStrip();
      k.led.bar(new THREE.Vector3(x, L.terraceY + 0.35, z + 0.34), new THREE.Vector3(x, b.top - 0.5, z + 0.34), OUT, 0.12, st, 0, LED_KIND.bar, 1);
      // crocketed pinnacle rising from the pilaster through the parapet
      this.pinnacle(x, b.top + 0.55, z - 0.05, 0.5, 2.0);
    }
    // LED line under the cornice
    k.led.bar(new THREE.Vector3(xa, b.top - 0.4, z + 0.39), new THREE.Vector3(xb, b.top - 0.4, z + 0.39), OUT, 0.1);
    // anchors: roofline gerbs + fixtures on the parapet
    const n = Math.max(1, Math.round((xb - xa) / 6));
    for (let i = 0; i < n; i++) {
      const x = xa + ((i + 0.5) / n) * (xb - xa);
      k.pts.roof.push(new THREE.Vector3(x, b.top + 0.6, z - 0.3));
      k.pts.fixturesTruss.push(new THREE.Vector3(x, b.top + 0.6, z - 1.2));
    }
  }

  // -------------------------------------------------------------------------------------------
  // towers

  private tower(t: TowerSpec, s: number): void {
    const k = this.kit;
    const Y = L.deckY;
    const x = s * t.x;
    const hw = t.w / 2;
    const zf = t.frontZ;
    const zb = zf - t.depth;
    const inner = t === TOWERS[0];
    const mid = t === TOWERS[1];
    const tiers: Opening[] = [];
    if (inner) {
      for (const o of [-0.62, 0.62]) tiers.push({ cx: x + o, y0: 7.35, w: 0.85, h: 2.4, kind: 'lancet' });
      tiers.push({ cx: x, y0: 10.35, w: 1.2, h: 2.6, kind: 'lancet' });
    } else if (mid) {
      // one tall traceried window (f103: the big glowing arched windows either side)
      tiers.push({ cx: x, y0: 6.75, w: 2.3, h: 5.1, kind: 'pointed' });
    } else {
      tiers.push({ cx: x, y0: 6.9, w: 1.05, h: 2.3, kind: 'lancet' });
      for (const o of [-0.55, 0.55]) tiers.push({ cx: x + o, y0: 9.7, w: 0.72, h: 2.0, kind: 'lancet' });
    }
    // front slab with openings
    this.slab(wallShape(x - hw, x + hw, Y, t.body, tiers, k.seg), zf, 0.5, TINT.cool);
    // body behind
    boxMinMax(k.stone, x - hw, Y, zb, x + hw, t.body, zf - 0.5, TINT.wall);
    for (const o of tiers) {
      this.frame(o, zf, o.w > 2 ? 0.26 : 0.14, o.w > 2 ? 0.22 : 0.14);
      this.pane(o, zf, 0.28, LED_KIND.window);
      boxMinMax(k.stone, o.cx - o.w / 2 - 0.2, o.y0 - 0.2, zf, o.cx + o.w / 2 + 0.2, o.y0, zf + 0.25, TINT.trim);
      if (o.w > 2) this.tracery(o, zf);
    }
    // side windows (applied: pane + frame on the side faces), upper tier
    for (const side of [-1, 1]) {
      const fx = x + side * hw;
      const yaw = side * (Math.PI / 2);
      const o: Opening = { cx: 0, y0: 0, w: 0.9, h: 2.2, kind: 'lancet' };
      const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(fx, 9.6, zf - t.depth * 0.5);
      const fg = extrude(frameShape(o, 0.13, k.seg), 0.12, k.seg);
      k.stone.add(fg, m, { color: TINT.trim });
      fg.dispose();
      const pg = new THREE.ShapeGeometry(paneShape(o, k.seg), k.seg);
      k.led.geometry(pg, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.01)), LED_KIND.window, this.rng.next());
      pg.dispose();
    }
    // corner shafts (proud) with LED outlines
    for (const e of [-1, 1]) {
      const cx = x + e * (hw - 0.22);
      boxMinMax(k.stone, cx - 0.3, Y, zf - 0.2, cx + 0.3, t.body - 0.4, zf + 0.28, TINT.trim);
      k.led.bar(new THREE.Vector3(cx, L.terraceY + 0.4, zf + 0.28), new THREE.Vector3(cx, t.body - 0.6, zf + 0.28), OUT, 0.11);
    }
    // string courses
    for (const y of inner ? [6.7, 9.95] : mid ? [6.4] : [6.4, 9.3]) boxMinMax(k.stone, x - hw - 0.08, y, zf - 0.1, x + hw + 0.08, y + 0.28, zf + 0.3, TINT.trim);
    // cornice + parapet + merlons
    boxMinMax(k.stone, x - hw - 0.3, t.body - 0.4, zb - 0.3, x + hw + 0.3, t.body, zf + 0.35, TINT.trim);
    const py = t.body;
    boxMinMax(k.stone, x - hw - 0.25, py, zf - 0.1, x + hw + 0.25, py + 0.6, zf + 0.3, TINT.wall);
    boxMinMax(k.stone, x - hw - 0.25, py, zb - 0.25, x + hw + 0.25, py + 0.6, zb + 0.15, TINT.wall);
    boxMinMax(k.stone, x - hw - 0.25, py, zb - 0.25, x - hw + 0.15, py + 0.6, zf + 0.3, TINT.wall);
    boxMinMax(k.stone, x + hw - 0.15, py, zb - 0.25, x + hw + 0.25, py + 0.6, zf + 0.3, TINT.wall);
    this.merlons(x - hw - 0.25, x + hw + 0.25, py + 0.6, zf + 0.3, 0.4, 0.75, 0.6, 0.5);
    boxMinMax(k.stone, x - hw, py - 0.05, zb, x + hw, py + 0.1, zf - 0.1, TINT.dark);
    k.led.bar(new THREE.Vector3(x - hw - 0.3, py - 0.45, zf + 0.36), new THREE.Vector3(x + hw + 0.3, py - 0.45, zf + 0.36), OUT, 0.1);
    // corner pinnacles
    const pinH = t.cap === 'battlement' ? t.capTop - py : 2.2;
    for (const e of [-1, 1])
      for (const f of [0, 1]) {
        const pz = f === 0 ? zf + 0.05 : zb - 0.05;
        this.pinnacle(x + e * (hw + 0.05), py + 0.1, pz, 0.72, pinH);
      }
    // caps
    const top = py + 0.6;
    if (t.cap === 'spire') {
      const g = new THREE.ConeGeometry(t.w * 0.55, t.capTop - top, 4, 1);
      k.stone.add(g, new THREE.Matrix4().makeRotationY(Math.PI / 4).setPosition(x, top + (t.capTop - top) / 2, (zf + zb) / 2), { color: TINT.trim });
      g.dispose();
      this.finial(x, t.capTop, (zf + zb) / 2);
      // lucarnes (small gabled dormers) on the spire
      for (const f of [1]) {
        const dz = f * (t.depth * 0.36);
        boxMinMax(k.stone, x - 0.45, top + 0.3, (zf + zb) / 2 + dz - 0.4, x + 0.45, top + 1.4, (zf + zb) / 2 + dz + 0.25, TINT.trim);
        k.led.rect(new THREE.Vector3(x, top + 0.8, (zf + zb) / 2 + dz + 0.27), RIGHT, UP, 0.45, 0.7, LED_KIND.window, 0.5);
      }
    } else if (t.cap === 'cone') {
      cyl(k.stone, x, top - 0.1, (zf + zb) / 2, t.w * 0.42, t.w * 0.42, top + 0.9, 16, TINT.wall);
      const g = new THREE.ConeGeometry(t.w * 0.5, t.capTop - top - 0.9, 20, 1);
      k.stone.add(g, new THREE.Matrix4().makeTranslation(x, top + 0.9 + (t.capTop - top - 0.9) / 2, (zf + zb) / 2), { color: TINT.cream });
      g.dispose();
      this.finial(x, t.capTop, (zf + zb) / 2);
    } else {
      // battlement top: a lantern turret in the middle (flame position)
      cyl(k.stone, x, top - 0.6, (zf + zb) / 2, 0.9, 0.9, top + 0.6, 8, TINT.trim);
    }
    // decor on the lower storey of the tower
    const fz = zf + 0.29;
    if (inner) {
      const back = new THREE.CylinderGeometry(1.95, 1.95, 0.24, 32);
      k.stone.add(back, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(x, 4.85, zf + 0.12), { color: TINT.trim });
      back.dispose();
      decorDisc(k, 'medallion', x, 4.85, zf + 0.25, 1.72, GLOW.skull);
      const ring = new THREE.TorusGeometry(1.78, 0.13, 8, 40);
      k.gold.add(ring, new THREE.Matrix4().makeTranslation(x, 4.85, zf + 0.3));
      ring.dispose();
    } else if (t === TOWERS[1]) {
      decorDisc(k, 'shield', x, 4.4, fz, 1.25, GLOW.none);
      const ring = new THREE.TorusGeometry(1.3, 0.09, 8, 32);
      k.gold.add(ring, new THREE.Matrix4().makeTranslation(x, 4.4, fz + 0.03));
      ring.dispose();
    } else {
      decorPanel(k, 'skullNiche', x, 4.55, fz, 2.4, 3.84, GLOW.skull);
    }
    // anchors
    k.pts.towersTop.push(new THREE.Vector3(x, t.cap === 'battlement' ? top + 0.6 : t.capTop + 0.4, (zf + zb) / 2));
    k.pts.fixturesTruss.push(new THREE.Vector3(x - hw + 0.4, py + 0.7, zf - 0.2), new THREE.Vector3(x + hw - 0.4, py + 0.7, zf - 0.2));
    k.pts.laserStage.push(new THREE.Vector3(x, py + 0.8, zf - 0.6));
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
    // small arches over the three lights
    for (const f of [-1 / 3, 0, 1 / 3]) {
      const a = new THREE.TorusGeometry(o.w / 6, 0.05, 5, 10, Math.PI);
      k.stone.add(a, new THREE.Matrix4().makeTranslation(o.cx + f * o.w, spring + 0.2, zt), { color: TINT.trim });
      a.dispose();
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

  // -------------------------------------------------------------------------------------------
  // terrace, stairs, decor

  private terrace(s: number): void {
    const k = this.kit;
    const Y = L.deckY;
    const x0 = s * (L.gateHalf + 0.2);
    const x1 = s * L.castleHalf;
    const xa = Math.min(x0, x1),
      xb = Math.max(x0, x1);
    // red skirt front, dark top
    boxMinMax(k.paint, xa, Y, L.terraceFrontZ - 0.08, xb, L.terraceY, L.terraceFrontZ, PAINT.red);
    boxMinMax(k.paint, xa, L.terraceY - 0.1, L.facadeZ, xb, L.terraceY, L.terraceFrontZ - 0.08, PAINT.deckTop);
    // railing along the terrace edge (not in front of the stair flight)
    const r0 = s * 15.4;
    railing(k, [new THREE.Vector3(r0, L.terraceY, L.terraceFrontZ - 0.12), new THREE.Vector3(s * (L.castleHalf - 0.2), L.terraceY, L.terraceFrontZ - 0.12)], 1.05, 1.5);
    // small steps from the deck up to the terrace beside the gate
    const sx0 = s * (L.gateHalf + 0.25),
      sx1 = s * (L.gateHalf + 1.65);
    for (let i = 0; i < 4; i++) {
      const zf = -3.95 - i * 0.52;
      boxMinMax(k.paint, Math.min(sx0, sx1), Y, L.terraceFrontZ, Math.max(sx0, sx1), Y + 0.3 * (i + 1), zf, PAINT.carpet);
    }
    railing(k, [new THREE.Vector3(sx1, Y + 0.3, -3.95), new THREE.Vector3(sx1, L.terraceY, L.terraceFrontZ)], 1.0, 0.9);
    // flood cans on the terrace edge (they "produce" the virtual flood field every 6 m)
    for (let i = 2; i <= 8; i++) {
      const x = s * i * 6;
      this.floodCan(x, L.terraceY, L.terraceFrontZ - 0.35);
    }
    for (let i = 0; i < 6; i++) {
      const x = s * (18 + i * 5.2);
      if (Math.abs(x) > L.castleHalf - 1) continue;
      k.pts.deckBack.push(new THREE.Vector3(x, L.terraceY + 0.05, L.terraceFrontZ - 0.6));
    }
  }

  /** small black LED flood on a yoke, tilted up at the facade */
  private floodCan(x: number, y: number, z: number): void {
    const k = this.kit;
    boxMinMax(k.metal, x - 0.22, y, z - 0.18, x + 0.22, y + 0.06, z + 0.18, METAL.black);
    const g = new THREE.CylinderGeometry(0.2, 0.17, 0.34, 10);
    k.metal.add(g, new THREE.Matrix4().makeRotationX(-0.55).setPosition(x, y + 0.26, z), { color: METAL.black });
    g.dispose();
  }

  private stairs(s: number): void {
    const k = this.kit;
    const n = 12;
    const x0 = 7.7,
      x1 = 15.3;
    const rise = (7.1 - L.terraceY) / n;
    const run = (x1 - x0) / n;
    const zb = L.facadeZ,
      zf = L.terraceFrontZ - 0.1;
    for (let i = 0; i < n; i++) {
      const a = s * (x0 + i * run),
        b = s * (x0 + (i + 1) * run);
      boxMinMax(k.stone, Math.min(a, b), L.terraceY, zb, Math.max(a, b), L.terraceY + rise * (i + 1), zf, TINT.stair);
      // nosing shadow line
      boxMinMax(k.stone, Math.min(a, b), L.terraceY + rise * (i + 1) - 0.04, zf, Math.max(a, b), L.terraceY + rise * (i + 1), zf + 0.05, TINT.trim);
    }
    // landing slab + corbels, reaching the inner tower
    const la = s * x1,
      lb = s * 17.05;
    boxMinMax(k.stone, Math.min(la, lb), 6.85, zb, Math.max(la, lb), 7.1, zf, TINT.stair);
    for (const cz of [zf - 0.3, zb + 0.4]) {
      const c = new THREE.ConeGeometry(0.35, 1.0, 4);
      k.stone.add(c, new THREE.Matrix4().makeRotationX(Math.PI).setPosition(s * 16.1, 6.35, cz), { color: TINT.trim });
      c.dispose();
    }
    // railing following the flight + landing
    railing(
      k,
      [
        new THREE.Vector3(s * x0, L.terraceY, zf - 0.08),
        new THREE.Vector3(s * x1, 7.1, zf - 0.08),
        new THREE.Vector3(s * 17.0, 7.1, zf - 0.08),
      ],
      1.05,
      1.1,
    );
    // doorway into the tower at the landing
    const door: Opening = { cx: 0, y0: 0, w: 1.3, h: 2.4, kind: 'pointed' };
    const m = new THREE.Matrix4().makeRotationY(-s * (Math.PI / 2)).setPosition(s * 17.0, 7.1, (zb + zf) / 2 - 0.2);
    const fg = extrude(frameShape(door, 0.18, k.seg), 0.1, k.seg);
    k.stone.add(fg, m, { color: TINT.trim });
    fg.dispose();
    const pg = new THREE.ShapeGeometry(paneShape(door, k.seg), k.seg);
    k.led.geometry(pg, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.01)), LED_KIND.portal, 0.3);
    pg.dispose();
  }

  private bayDecor(s: number): void {
    const k = this.kit;
    const z = L.facadeZ + 0.36;
    // flame-eye banner centred on the middle bay, hanging from under the cornice
    const bx = s * 27.25;
    rod(k.metal, new THREE.Vector3(bx - 1.35, 8.85, z + 0.05), new THREE.Vector3(bx + 1.35, 8.85, z + 0.05), 0.07, METAL.black);
    decorPanel(k, 'banner', bx, 8.85 - 2.65, z + 0.08, 2.2, 5.3, GLOW.banner);
    // the banner doubles as an LED panel for 'screens' content (invisible while off)
    k.led.rect(new THREE.Vector3(bx, 8.85 - 2.65, z + 0.1), RIGHT, UP, 2.2, 5.3, LED_KIND.panel, 2.2, 5.3);
    // skull niche panel on the outer bay
    decorPanel(k, 'skullNiche', s * 40, 5.25, z - 0.05, 2.5, 4.0, GLOW.skull);
    boxMinMax(k.gold, s * 40 - 1.35, 3.1, z - 0.3, s * 40 + 1.35, 3.25, z + 0.05);
    // kintsugi stone face in a gold niche under the stair landing
    decorPanel(k, 'faceNiche', s * 16.05, 5.0, L.facadeZ + 0.03, 1.7, 2.72, GLOW.none);
    // bronze shield by the gate
    decorDisc(k, 'shield', s * 4.55, 4.2, L.gateFrontZ + 0.04, 0.95, GLOW.none);
    const ring = new THREE.TorusGeometry(0.98, 0.07, 6, 28);
    k.gold.add(ring, new THREE.Matrix4().makeTranslation(s * 4.55, 4.2, L.gateFrontZ + 0.06));
    ring.dispose();
    // small lancets beside the portal
    const o: Opening = { cx: s * 4.55, y0: 6.1, w: 0.7, h: 1.9, kind: 'lancet' };
    this.frame(o, L.gateFrontZ, 0.12, 0.1);
    const pg = new THREE.ShapeGeometry(paneShape(o, k.seg), k.seg);
    k.led.geometry(pg, new THREE.Matrix4().makeTranslation(0, 0, L.gateFrontZ + 0.02), LED_KIND.window, 0.7);
    pg.dispose();
  }
}
