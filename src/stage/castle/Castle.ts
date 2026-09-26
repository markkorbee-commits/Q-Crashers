import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { boxMinMax, cyl, decorPanel, GLOW, METAL, PAINT, railing, rod, type StageKit, TINT } from '../kit';
import { type ArchKind, extrude, frameShape, type Opening, paneShape, wallShape } from '../lib/gothic';
import { L } from '../layout';
import { LED_KIND } from '../materials/LedMaterial';
import { GARLAND, type Garlands } from '../dragon/shading';
import { CASTLE_STAIRS, PODIUM, VAULT } from '../booth/layout';

/**
 * The grey gothic castle core of the 2026 RED (printed scenic flats on scaffold in reality), laid out
 * on design-bible §5.4/§5.5:
 *  - facade plane Z −12 across X ±37, crenellation / wall walk Y 9.5, ground arcade, lancets, pilasters
 *    with pixel battens, the big glowing pointed window per side and the skull medallions
 *  - gate porch in front of it (front Z −6): the bronze-gold DJ portal (5.4 m, apex 7.2, 3 m deep) with
 *    the logo shield keystone under the dragon's chin, flanked by two big round arches through which the
 *    oversized stone stairs climb from the deck (Y 1.9) to the upper castle platform (Y 5.5)
 *  - a gallery at Y 5.5 on corbels along the inner bays (black tubular railing)
 *  - towers: outer pair projecting from the facade (roof 12.2, spires to 16), inner pair rising behind
 *    the parapet (roof 13.3, the torch pedestals; lowered from the bible so the wings read, see INNER) — moved out to X ±17.3 so the crown's gold foreleg,
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

/*
 * Round-2 look parity: in the official footage the towers stand UNDER the wing arches (the thumbnail)
 * and the wing membranes read down to the castle roofline from the terrace / drone. The bible heights
 * (inner 16, outer 14 with spires to 18) put the towers in front of half of every wing, so both pairs
 * are ~2 m lower here (inner roof 13.3 / pinnacles 15.6, outer 12.2 / spire 16).
 */
/*
 * Round 3 (daytime photos): the wing arm now arches from the shoulder down to a wrist standing in
 * front of the outer bays (Z ~ -9), so the inner towers step back behind it (front Z -15: they show
 * under the arch as in the photos / thumbnail) and the projecting outer towers are gone - the lower
 * wing, its hooked tusks and the arrays hang where they stood; their banner moved onto the facade.
 */
const INNER: TowerSpec = { kind: 'inner', x: 17.3, w: 4.0, frontZ: -15.0, depth: 3.75, body: 13.3, base: 6.8, capTop: 15.4 };
/** the former outer tower span (X ±23…±28): a plain facade bay under the lower wing now */
const OUTER = { x: 25.5, w: 5.0 };
/** skull cubes on the deck either side of the portal (daytime photos: ~4 m white stone blocks with a skull relief) */
export const SKULL_CUBE = { x: 19.6, z: -8.3, w: 4.2, d: 4.1, top: 7.4 };
/** stair arches in the porch screen (round, springing 4.5, apex 7.0) */
const ARCH: Opening = { cx: 8.9, y0: L.deckY, w: 5.0, h: 5.1, kind: 'round' };

/**
 * Warm festoon swags of the castle core: along the facade eave between the pilasters and over the
 * porch screen (the "lamp strings" of the official footage; lit by stage.garlands / stage.state).
 */
export function addCastleGarlands(g: Garlands): void {
  const z = L.facadeZ + 0.5;
  const y = L.coreTop - 0.6;
  const runs = [
    [13.35, 16.05, 18.75, 21.8, 23.2],
    [27.8, 30.6, 32.7, 34.8, 36.6],
  ];
  for (const s of [-1, 1]) {
    let u = 0;
    for (const xs of runs)
      for (let i = 0; i + 1 < xs.length; i++) u = g.swag(new THREE.Vector3(s * xs[i], y, z), new THREE.Vector3(s * xs[i + 1], y, z), 0.45, GARLAND.castle, 0.8, 0.14, u);
    // porch screen, between the portal crown and the porch corners
    const zp = L.porchFrontZ + 0.45;
    const yp = L.porchTop - 0.35;
    for (const [a, b] of [
      [3.9, 6.6],
      [6.6, 9.4],
      [9.4, 12.2],
    ])
      u = g.swag(new THREE.Vector3(s * a, yp, zp), new THREE.Vector3(s * b, yp, zp), 0.35, GARLAND.castle, 0.8, 0.14, u);
  }
}

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
      this.outerBay(s);
      this.skullCube(s);
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
    // the porch mass beside the gold vault, lowered to the roof's eaves (booth/Vault.ts: the scaled
    // barrel roof shows above it from the castle gallery and the drone, as in the daytime photos)
    for (const s of [-1, 1]) {
      const a = s * VAULT.outerHalf,
        b = s * L.stairX0;
      boxMinMax(k.stone, Math.min(a, b), Y, L.facadeZ, Math.max(a, b), VAULT.massTop, z - T, TINT.dark);
      boxMinMax(k.stone, Math.min(a, b) - 0.05, VAULT.massTop, L.facadeZ, Math.max(a, b) + 0.05, VAULT.massTop + 0.16, z - T, TINT.trim);
    }

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

    // LED line around the portal opening (the vault behind it, its booth and the grey steps in front:
    // booth/Vault.ts, booth/Booth.ts, deck/Podium.ts)
    k.led.polyline(
      this.archPoints(portal, 0.14, 44).map((p) => new THREE.Vector3(p.x, p.y, z + 0.39)),
      OUT,
      0.09,
    );

    // ---- screen piers between portal and arches: tall flame-eye banners flanking the portal
    // (daytime photos: an orange / red banner either side of the gilt arch, deck to cornice)
    for (const s of [-1, 1]) {
      const x = s * 5.05;
      rod(k.metal, new THREE.Vector3(x - 1.1, H - 0.55, z + 0.1), new THREE.Vector3(x + 1.1, H - 0.55, z + 0.1), 0.06, METAL.black);
      decorPanel(k, s < 0 ? 'banner2' : 'banner', x, (Y + 0.35 + H - 0.55) / 2, z + 0.12, 2.0, H - 0.55 - Y - 0.35, GLOW.banner);
      k.led.rect(new THREE.Vector3(x, (Y + 0.35 + H - 0.55) / 2, z + 0.14), RIGHT, UP, 2.0, H - 0.55 - Y - 0.35, LED_KIND.panel, 2.0, H - 0.55 - Y - 0.35);
    }
    // anchors: portal-side floor fixtures, at the back of the podium cheeks beside the grey steps
    k.pts.fixturesFloor.push(new THREE.Vector3(-4.75, PODIUM.top + 0.3, z + 0.55), new THREE.Vector3(4.75, PODIUM.top + 0.3, z + 0.55));
  }

  // -------------------------------------------------------------------------------------------
  // stairs: from the deck (1.9) through the arches up to the upper castle platform (5.5)

  private stairs(s: number): void {
    const k = this.kit;
    const Y = L.deckY;
    const n = 12;
    const x0 = L.stairX0,
      x1 = L.stairX1;
    // the flight starts a metre into the recess: a deck-level foot inside the arch, so the stairs can
    // be walked (in through the arch, turn, climb: world/stageWalk.ts)
    const f0 = CASTLE_STAIRS.footX;
    const rise = (L.platformY - Y) / n;
    const run = (x1 - f0) / n;
    const zf = L.porchFrontZ - L.screenT;
    const zb = L.stairBackZ;
    for (let i = 0; i < n; i++) {
      const a = s * (f0 + i * run),
        b = s * (f0 + (i + 1) * run);
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
    railing(k, [new THREE.Vector3(s * (f0 + 0.6), Y + 0.6 * (rise / run), zf - 0.1), new THREE.Vector3(s * x1, L.platformY, zf - 0.1), new THREE.Vector3(s * (L.porchHalf - 0.1), L.platformY, zf - 0.1)], 1.05, 1.0);
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
    const top = L.coreTop;
    const holes: Opening[] = [];
    const arcade: Opening[] = [];
    const lancets: Opening[] = [];
    const big: Opening[] = [];
    for (const s of [-1, 1]) {
      for (const cx of [14.7, 17.4, 20.1]) arcade.push({ cx: s * cx, y0: 2.05, w: 1.9, h: 2.85, kind: 'round' });
      for (const o of [-0.52, 0.52]) lancets.push({ cx: s * 14.85 + o, y0: 5.95, w: 0.66, h: 1.5, kind: 'lancet' });
      big.push({ cx: s * 30.6, y0: 2.9, w: 2.9, h: 4.5, kind: 'pointed' });
      for (const o of [-0.45, 0.45]) lancets.push({ cx: s * 35.0 + o, y0: 6.0, w: 0.56, h: 1.45, kind: 'lancet' });
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
      const hood: Opening = { cx: s * 14.85, y0: 5.95, w: 1.9, h: 1.75, kind: 'pointed' };
      this.frame(hood, z, 0.14, 0.2, TINT.trim);
      boxMinMax(k.stone, s * 14.85 - 1.1, 5.75, z, s * 14.85 + 1.1, 5.95, z + 0.3, TINT.trim);
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
      const a = s * (OUTER.x - OUTER.w / 2),
        b = s * L.coreHalf;
      boxMinMax(k.stone, Math.min(a, b), 7.65 - 0.2, z, Math.max(a, b), 7.65, z + 0.26, TINT.trim);
    }
    boxMinMax(k.stone, -L.coreHalf, top - 0.3, z - 0.2, L.coreHalf, top, z + 0.36, TINT.trim);
    for (const s of [-1, 1]) {
      const a = s * (L.porchHalf + 0.7),
        b = s * L.coreHalf;
      k.led.bar(new THREE.Vector3(Math.min(a, b), top - 0.38, z + 0.37), new THREE.Vector3(Math.max(a, b), top - 0.38, z + 0.37), OUT, 0.1);
    }
    k.led.bar(new THREE.Vector3(-L.porchHalf, top - 0.38, z + 0.37), new THREE.Vector3(L.porchHalf, top - 0.38, z + 0.37), OUT, 0.1);
    // parapet: plain coping over the dragon's chest (|x| < 10.4), low merlons outboard
    const c0 = L.copingHalf;
    boxMinMax(k.stone, -c0, top, z - 1.2, c0, top + 0.28, z + 0.05, TINT.trim);
    this.merlons(c0, L.coreHalf, top, z + 0.02, 0.4, 0.8);
    this.merlons(-L.coreHalf, -c0, top, z + 0.02, 0.4, 0.8);
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
      for (const px of [13.35, 16.5, 28.5, 32.7, 36.6]) this.pinnacle(s * px, top + 0.8, z - 0.2, 0.5, 1.6);
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
      // the twin 15 m Power Flame torches flanking the head (show-analysis 6.7, f104): pedestals on
      // the wall walk just outboard of the tusks - in front of the wing arm, which now arches over
      // the (set-back) inner towers where the bible had them
      {
        const tx = s * 11.6;
        const tz = z - 0.75;
        cyl(k.stone, tx, top, tz, 0.62, 0.5, top + 0.85, 10, TINT.trim);
        const bowl = new THREE.TorusGeometry(0.5, 0.11, 6, 16);
        k.gold.add(bowl, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(tx, top + 0.88, tz));
        bowl.dispose();
        k.pts.towerTorches.push(new THREE.Vector3(tx, top + 1.0, tz));
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
      for (const o of [-0.58, 0.58]) tiers.push({ cx: x + o, y0: 10.2, w: 0.78, h: 2.0, kind: 'lancet' });
    } else {
      for (const o of [-0.62, 0.62]) tiers.push({ cx: x + o, y0: 9.1, w: 0.78, h: 2.05, kind: 'lancet' });
    }
    this.slab(wallShape(x - hw, x + hw, t.base, t.body, tiers, k.seg), zf, 0.5, TINT.cool);
    boxMinMax(k.stone, x - hw, t.base, zb, x + hw, t.body, zf - 0.5, TINT.wall);
    for (const o of tiers) {
      this.frame(o, zf, 0.14, 0.14);
      this.pane(o, zf, 0.28, LED_KIND.window);
      boxMinMax(k.stone, o.cx - o.w / 2 - 0.2, o.y0 - 0.2, zf, o.cx + o.w / 2 + 0.2, o.y0, zf + 0.25, TINT.trim);
    }
    // side windows (upper tier)
    for (const side of [-1, 1]) this.appliedLancet(x + side * hw, inner ? 10.4 : 9.4, zc, side * (Math.PI / 2), 0.8, 2.0);
    // corner shafts with LED outlines
    const shaft0 = inner ? 9.9 : t.base + 0.4;
    for (const e of [-1, 1]) {
      const cx = x + e * (hw - 0.22);
      boxMinMax(k.stone, cx - 0.28, t.base, zf - 0.2, cx + 0.28, t.body - 0.4, zf + 0.26, TINT.trim);
      k.led.bar(new THREE.Vector3(cx, shaft0, zf + 0.26), new THREE.Vector3(cx, t.body - 0.6, zf + 0.26), OUT, 0.11);
    }
    for (const y of inner ? [9.95] : [2.3, 8.7]) boxMinMax(k.stone, x - hw - 0.08, y, zf - 0.1, x + hw + 0.08, y + 0.26, zf + 0.3, TINT.trim);
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
      // flickering amber brazier lamp in the bowl (seen from the pit next to the dragon's head)
      for (const [r, rnd] of [
        [RIGHT, 0.23],
        [OUT, 0.71],
      ] as const)
        k.led.rect(new THREE.Vector3(x, py + 1.55, zc), r, UP, 0.95, 1.25, LED_KIND.candle, rnd);
      // rig positions of these towers sit on the wall walk in front of them: the towers stand under
      // the wing arm / inner membrane now (round 3), fixtures up there would fire through the wing
      const wz = L.facadeZ - 0.7;
      k.pts.towersTop.push(new THREE.Vector3(x, L.coreTop + 0.6, wz));
      k.pts.laserStage.push(new THREE.Vector3(x, L.coreTop + 0.35, wz));
      k.pts.fixturesTruss.push(new THREE.Vector3(x - 1.05, L.coreTop + 0.35, wz), new THREE.Vector3(x + 1.05, L.coreTop + 0.35, wz));
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
  // outer bay (where the round-2 outer tower stood): banner on the facade + the rig anchors it carried

  private outerBay(s: number): void {
    const k = this.kit;
    const x = s * OUTER.x;
    const z = L.facadeZ;
    const top = L.coreTop;
    // flame-eye banner (2.2 x 5.2, backlit) hung under the cornice + LED panel for 'screens'
    const bx = s * 27.4;
    const bz = z + 0.36;
    const by = top - 0.45;
    rod(k.metal, new THREE.Vector3(bx - 1.25, by, bz + 0.05), new THREE.Vector3(bx + 1.25, by, bz + 0.05), 0.07, METAL.black);
    decorPanel(k, 'banner', bx, by - 2.6, bz + 0.08, 2.2, 5.2, GLOW.banner);
    k.led.rect(new THREE.Vector3(bx, by - 2.6, bz + 0.1), RIGHT, UP, 2.2, 5.2, LED_KIND.panel, 2.2, 5.2);
    this.floodCan(bx, L.deckY, z + 1.1);
    // rig positions of the former tower roof, now on the wall walk behind the merlons
    k.pts.towersTop.push(new THREE.Vector3(x, top + 0.6, z - 0.9));
    k.pts.laserStage.push(new THREE.Vector3(x, top + 0.35, z - 0.7));
    k.pts.fixturesTruss.push(new THREE.Vector3(x - 1.45, top + 0.35, z - 0.75), new THREE.Vector3(x + 1.45, top + 0.35, z - 0.75));
  }

  // -------------------------------------------------------------------------------------------
  // skull cubes: white stone blocks on the deck either side of the portal, a skull relief in an
  // arched gilt niche on the front and the outward face (the eyes glow at night: GLOW.skull)

  private skullCube(s: number): void {
    const k = this.kit;
    const C = SKULL_CUBE;
    const x = s * C.x;
    const y0 = L.deckY;
    const x0 = x - C.w / 2,
      x1 = x + C.w / 2;
    const z0 = C.z - C.d / 2,
      z1 = C.z + C.d / 2;
    boxMinMax(k.stone, x0, y0, z0, x1, C.top - 0.35, z1, TINT.cream);
    // plinth + cornice cap
    boxMinMax(k.stone, x0 - 0.12, y0, z0 - 0.12, x1 + 0.12, y0 + 0.45, z1 + 0.12, TINT.trim);
    boxMinMax(k.stone, x0 - 0.18, C.top - 0.35, z0 - 0.18, x1 + 0.18, C.top, z1 + 0.18, TINT.trim);
    // corner quoins
    for (const cx of [x0, x1]) for (const cz of [z0, z1]) boxMinMax(k.stone, cx - 0.14, y0 + 0.45, cz - 0.14, cx + 0.14, C.top - 0.35, cz + 0.14, TINT.cream);
    const ny = (y0 + 0.45 + C.top - 0.35) / 2;
    const nh = C.top - 0.35 - y0 - 0.45 - 0.3;
    // front face + outward face
    decorPanel(k, 'skullNiche', x, ny, z1 + 0.02, C.w * 0.78, nh, GLOW.skull);
    decorPanel(k, 'skullNiche', s * (C.x + C.w / 2 + 0.02), ny, C.z, C.d * 0.76, nh, GLOW.skull, (s * Math.PI) / 2);
    const fr: Opening = { cx: x, y0: ny - nh / 2, w: C.w * 0.8, h: nh, kind: 'round' };
    this.frame(fr, z1, 0.14, 0.12, TINT.wall, 'gold');
  }

  private bayDecor(s: number): void {
    const k = this.kit;
    const z = L.facadeZ + 0.33;
    // skull niche panel in the outer bay + gold sill
    decorPanel(k, 'skullNiche', s * 35.0, 4.35, z - 0.02, 2.3, 3.7, GLOW.skull);
    boxMinMax(k.gold, s * 35 - 1.25, 2.4, z - 0.3, s * 35 + 1.25, 2.52, z + 0.05);
    // grey stone face relief in a gilt arched niche on the upper storey (daytime photos: a big mask
    // right of the portal, over the inner bay; a smaller twin on the left)
    if (s > 0) {
      boxMinMax(k.stone, 13.8, 5.5, z - 0.3, 16.0, 7.95, z + 0.02, TINT.cream);
      decorPanel(k, 'faceNiche', 14.9, 6.72, z + 0.04, 1.75, 2.3, GLOW.none);
    } else decorPanel(k, 'faceNiche', -22.4, 6.75, L.facadeZ + 0.03, 1.2, 1.92, GLOW.none);
    // flood cans under the gallery (they "produce" the virtual flood field)
    for (const x of [15, 19.5]) this.floodCan(s * x, L.deckY, L.galleryFrontZ + 0.6);
  }

  // -------------------------------------------------------------------------------------------
  // closed roof + scaffold back wall (hides the wing roots / wrists) and the rear pyro scaffold

  private roofAndBack(): void {
    const k = this.kit;
    const zb = L.coreBackZ;
    // black scrim over scaffold (a real set is only printed flats from the front)
    boxMinMax(k.paint, -L.coreHalf, L.coreRoofY - 0.2, zb, L.coreHalf, L.coreRoofY, L.facadeZ - 1.2, PAINT.black);
    boxMinMax(k.paint, -L.coreHalf, -1, zb - 0.3, L.coreHalf, L.coreRoofY, zb, PAINT.black);
    // core end walls (inside the side sections, closes the volume)
    for (const s of [-1, 1]) boxMinMax(k.paint, s * L.coreHalf - (s > 0 ? 0.3 : 0), -1, zb, s * L.coreHalf + (s < 0 ? 0.3 : 0), L.coreRoofY, L.facadeZ - 1.2, PAINT.black);
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
        rod(k.metal, new THREE.Vector3(x + (dx * w) / 2, L.coreRoofY, z + (dz * w) / 2), new THREE.Vector3(x + (dx * w) / 2, topY, z + (dz * w) / 2), 0.06, col);
      for (let y = L.coreRoofY + 0.4; y < topY; y += 1.4) {
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
