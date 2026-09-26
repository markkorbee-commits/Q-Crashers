import * as THREE from 'three';
import { cyl, decorPanel, GLOW, METAL, railing, type StageKit } from '../kit';
import { GeoBucket } from '../lib/GeoBucket';
import { L } from '../layout';
import { LED_KIND } from '../materials/LedMaterial';
import { archSpotPositions, roofOutline, VAULT, vaultOutline, vaultScale } from './layout';

/**
 * The gold scaled vault in front of the castle portal (daytime drone photos: a gold fish-scale barrel
 * roof under the dragon's chin whose front is the ornate portal; official video 646–740 s and 12:19:
 * concentric dark-steel "turbine" rings with bolt heads and a toothed inner edge inside the arch).
 *
 * Inside (own `vault` bucket, lit by the stage floods + the vault practicals, VaultModule): the ribbed
 * skin, 5 rings shrinking towards the back (forced perspective), the floor at 2.7, the front wall
 * around the portal and the back wall with the deep portal glow. LED strips on the ring faces follow
 * the stage looks (kit LED bucket). Outside (kit buckets): the gold fish-scale barrel roof over the
 * lowered porch mass, its ridge crest, the crown spot cans in the portal throat.
 */

/** interior vertex colours (sRGB) */
export const VCOL = {
  skin: new THREE.Color('#2a211c'),
  rib: new THREE.Color('#3b322b'),
  ribEdge: new THREE.Color('#5a4a3a'),
  bolt: new THREE.Color('#9a8260'),
  tooth: new THREE.Color('#4a4038'),
  floor: new THREE.Color('#1c1b1d'),
  wall: new THREE.Color('#1a1411'),
  trim: new THREE.Color('#6e5836'),
};

const OUT = new THREE.Vector3(0, 0, 1);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

/** triangle soup -> geometry with flat normals (build time only) */
function soup(pos: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** push a triangle whose face normal agrees with `want` (swaps the winding otherwise) */
function tri(out: number[], p: number[], q: number[], r: number[], want: THREE.Vector3): void {
  _a.set(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  _b.set(r[0] - p[0], r[1] - p[1], r[2] - p[2]);
  _c.crossVectors(_a, _b);
  if (_c.dot(want) >= 0) out.push(...p, ...q, ...r);
  else out.push(...p, ...r, ...q);
}

export class VaultBuilder {
  constructor(
    private kit: StageKit,
    /** the interior bucket (vault material) */
    private vb: GeoBucket,
  ) {}

  build(): void {
    this.skin();
    this.ribs();
    this.walls();
    this.floor();
    this.crown();
    this.roof();
    // the castle platform's inner edge over the lowered porch mass
    for (const s of [-1, 1]) railing(this.kit, [new THREE.Vector3(s * (L.stairX0 + 0.08), L.platformY, L.facadeZ + 0.1), new THREE.Vector3(s * (L.stairX0 + 0.08), L.platformY, L.stairBackZ - 0.1)], 1.05, 1.0);
  }

  private get n(): number {
    return this.kit.detail >= 2 ? 16 : this.kit.detail === 1 ? 12 : 8;
  }

  /** the ribbed interior skin: a loft of the ring outline from the screen back to the rear wall */
  private skin(): void {
    const n = this.n;
    const V = VAULT;
    const nz = 10;
    const pos: number[] = [];
    const mid = new THREE.Vector3();
    const rings: [number, number][][] = [];
    const zs: number[] = [];
    for (let i = 0; i <= nz; i++) {
      const z = V.screenZ + ((V.backZ - V.screenZ) * i) / nz;
      zs.push(z);
      rings.push(vaultOutline(vaultScale(z), n));
    }
    for (let i = 0; i < nz; i++) {
      const A = rings[i],
        B = rings[i + 1];
      for (let j = 0; j + 1 < A.length; j++) {
        const p0 = [A[j][0], A[j][1], zs[i]],
          p1 = [A[j + 1][0], A[j + 1][1], zs[i]],
          p2 = [B[j + 1][0], B[j + 1][1], zs[i + 1]],
          p3 = [B[j][0], B[j][1], zs[i + 1]];
        // inward: towards the tunnel axis
        mid.set(-(p0[0] + p1[0]) / 2, V.floorY + 2.4 - (p0[1] + p1[1]) / 2, 0).normalize();
        tri(pos, p0, p1, p2, mid);
        tri(pos, p0, p2, p3, mid);
      }
    }
    const g = soup(pos);
    this.vb.add(g, undefined, { color: VCOL.skin });
    g.dispose();
  }

  /** the "turbine" rings: dark steel bands with a toothed inner edge, bolt heads and an LED strip */
  private ribs(): void {
    const k = this.kit;
    const V = VAULT;
    const n = this.n;
    const detail = k.detail;
    const bolt = new THREE.CylinderGeometry(0.05, 0.055, 0.05, detail >= 1 ? 8 : 6);
    bolt.rotateX(Math.PI / 2);
    for (const [ri, zr] of V.ribs.entries()) {
      const s = vaultScale(zr);
      const outer = vaultOutline(s, n);
      const inner = vaultOutline(s, n, V.ribDepth);
      const zb = zr - V.ribT;
      const pos: number[] = [];
      const fwd = new THREE.Vector3(0, 0, 1);
      const back = new THREE.Vector3(0, 0, -1);
      for (let j = 0; j + 1 < outer.length; j++) {
        const o0 = outer[j],
          o1 = outer[j + 1],
          i0 = inner[j],
          i1 = inner[j + 1];
        // front + back faces
        tri(pos, [o0[0], o0[1], zr], [o1[0], o1[1], zr], [i1[0], i1[1], zr], fwd);
        tri(pos, [o0[0], o0[1], zr], [i1[0], i1[1], zr], [i0[0], i0[1], zr], fwd);
        tri(pos, [o0[0], o0[1], zb], [o1[0], o1[1], zb], [i1[0], i1[1], zb], back);
        tri(pos, [o0[0], o0[1], zb], [i1[0], i1[1], zb], [i0[0], i0[1], zb], back);
        // inner soffit (faces the axis)
        const inw = new THREE.Vector3(-(i0[0] + i1[0]) / 2, V.floorY + 2.4 - (i0[1] + i1[1]) / 2, 0).normalize();
        tri(pos, [i0[0], i0[1], zr], [i1[0], i1[1], zr], [i1[0], i1[1], zb], inw);
        tri(pos, [i0[0], i0[1], zr], [i1[0], i1[1], zb], [i0[0], i0[1], zb], inw);
      }
      const g = soup(pos);
      this.vb.add(g, undefined, { color: VCOL.rib });
      g.dispose();

      // a raised lip on the ring's front face along the inner edge (catches the wash as a bright line)
      const lip = vaultOutline(s, n, V.ribDepth - 0.035);
      const lp: number[] = [];
      for (let j = 0; j + 1 < inner.length; j++) {
        const a = inner[j],
          b = inner[j + 1],
          c = lip[j + 1],
          d = lip[j];
        tri(lp, [a[0], a[1], zr + 0.035], [b[0], b[1], zr + 0.035], [c[0], c[1], zr + 0.035], fwd);
        tri(lp, [a[0], a[1], zr + 0.035], [c[0], c[1], zr + 0.035], [d[0], d[1], zr + 0.035], fwd);
        const inw = new THREE.Vector3(-(a[0] + b[0]) / 2, V.floorY + 2.4 - (a[1] + b[1]) / 2, 0).normalize();
        tri(lp, [a[0], a[1], zr], [b[0], b[1], zr], [b[0], b[1], zr + 0.035], inw);
        tri(lp, [a[0], a[1], zr], [b[0], b[1], zr + 0.035], [a[0], a[1], zr + 0.035], inw);
      }
      const lg = soup(lp);
      this.vb.add(lg, undefined, { color: VCOL.ribEdge });
      lg.dispose();

      // teeth along the inner edge (the toothed "turbine" profile of the video)
      const pts = this.along(inner, 0.42, 0.3);
      const tp: number[] = [];
      for (const [x, y, tx, ty] of pts) {
        if (y < V.floorY + 0.6) continue;
        // inward normal of the edge: tangent rotated -90° (outline runs left floor -> apex -> right floor)
        const nx = ty,
          ny = -tx;
        const hw = 0.09,
          len = 0.16;
        const b0 = [x - tx * hw, y - ty * hw],
          b1 = [x + tx * hw, y + ty * hw],
          tip = [x + nx * len, y + ny * len];
        const z0 = zr - V.ribT * 0.25,
          z1 = zr - V.ribT * 0.75;
        tri(tp, [b0[0], b0[1], z0], [b1[0], b1[1], z0], [tip[0], tip[1], z0], fwd);
        tri(tp, [b0[0], b0[1], z1], [b1[0], b1[1], z1], [tip[0], tip[1], z1], back);
        for (const [p, q] of [
          [b0, tip],
          [tip, b1],
        ]) {
          const en = new THREE.Vector3(q[1] - p[1], -(q[0] - p[0]), 0);
          if (en.x * nx + en.y * ny < 0) en.negate();
          tri(tp, [p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], en);
          tri(tp, [p[0], p[1], z0], [q[0], q[1], z1], [p[0], p[1], z1], en);
        }
      }
      if (tp.length) {
        const tg = soup(tp);
        this.vb.add(tg, undefined, { color: VCOL.tooth });
        tg.dispose();
      }

      // bolt heads on the ring face, on its mid line
      if (detail >= 1) {
        const midL = vaultOutline(s, n * 2, V.ribDepth * 0.5);
        for (const [x, y] of this.along(midL, detail >= 2 ? 0.42 : 0.6, 0.2)) {
          if (y < V.floorY + 0.25) continue;
          this.vb.add(bolt, new THREE.Matrix4().makeTranslation(x, y, zr + 0.02), { color: VCOL.bolt });
        }
      }

      // LED strip on the ring face just outside the lip (follows the castle LED look)
      const led = vaultOutline(s, n * 2, V.ribDepth - 0.07).filter((p) => p[1] > V.floorY + 0.35);
      k.led.polyline(
        led.map(([x, y]) => new THREE.Vector3(x, y, zr + 0.004)),
        OUT,
        0.035,
        LED_KIND.bar,
        ri % 2 === 0 ? 0 : 1,
      );
    }
    bolt.dispose();
  }

  /** points every `step` metres along a polyline (skipping `skip` metres at both ends): [x, y, tx, ty] */
  private along(pl: [number, number][], step: number, skip: number): [number, number, number, number][] {
    const out: [number, number, number, number][] = [];
    const lens = [0];
    for (let i = 1; i < pl.length; i++) lens.push(lens[i - 1] + Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]));
    const total = lens[lens.length - 1];
    let j = 1;
    for (let u = skip; u <= total - skip + 1e-6; u += step) {
      while (j < pl.length - 1 && lens[j] < u) j++;
      const f = (u - lens[j - 1]) / Math.max(1e-6, lens[j] - lens[j - 1]);
      const x = pl[j - 1][0] + (pl[j][0] - pl[j - 1][0]) * f;
      const y = pl[j - 1][1] + (pl[j][1] - pl[j - 1][1]) * f;
      const tl = Math.hypot(pl[j][0] - pl[j - 1][0], pl[j][1] - pl[j - 1][1]) || 1;
      out.push([x, y, (pl[j][0] - pl[j - 1][0]) / tl, (pl[j][1] - pl[j - 1][1]) / tl]);
    }
    return out;
  }

  /** the inner front wall around the portal opening, the rear wall with the deep glow + emblem */
  private walls(): void {
    const k = this.kit;
    const V = VAULT;
    const n = this.n;
    // front wall (faces into the vault): the ring outline at the screen back minus the portal opening
    const ring = vaultOutline(1, n);
    const shape = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y)));
    const w = L.portalW / 2;
    const spring = L.portalApex - L.portalW * Math.sin(Math.PI / 3);
    const hole = new THREE.Path();
    hole.moveTo(-w, V.floorY);
    hole.lineTo(-w, spring);
    const m = 10;
    for (let i = 1; i <= m; i++) {
      const a = Math.PI - (Math.PI / 3) * (i / m);
      hole.lineTo(w + L.portalW * Math.cos(a), spring + L.portalW * Math.sin(a));
    }
    for (let i = m - 1; i >= 0; i--) {
      const a = Math.PI - (Math.PI / 3) * (i / m);
      hole.lineTo(-(w + L.portalW * Math.cos(a)), spring + L.portalW * Math.sin(a));
    }
    hole.lineTo(w, V.floorY);
    shape.holes.push(hole);
    const fg = new THREE.ShapeGeometry(shape, 6);
    // ShapeGeometry faces +Z: turned about Y to face -Z (into the vault; the outline is symmetric)
    this.vb.add(fg, new THREE.Matrix4().makeRotationY(Math.PI).setPosition(0, 0, V.screenZ - 0.005), { color: VCOL.wall });
    fg.dispose();

    // rear wall (faces +Z) + a dark bronze frame ring, the deep glow pane and the emblem over the booth
    const s = vaultScale(V.backZ);
    const back = vaultOutline(s, n);
    const bs = new THREE.Shape(back.map(([x, y]) => new THREE.Vector2(x, y)));
    const bg = new THREE.ShapeGeometry(bs, 6);
    this.vb.add(bg, new THREE.Matrix4().makeTranslation(0, 0, V.backZ), { color: VCOL.wall });
    bg.dispose();
    const glow = vaultOutline(s * 0.86, n).map(([x, y]) => new THREE.Vector2(x, V.floorY + (y - V.floorY) * 0.92));
    const gg = new THREE.ShapeGeometry(new THREE.Shape(glow), 6);
    k.led.geometry(gg, new THREE.Matrix4().makeTranslation(0, 0, V.backZ + 0.02), LED_KIND.portal, 0.5);
    gg.dispose();
    decorPanel(k, 'emblem', 0, V.floorY + 2.75, V.backZ + 0.06, 1.1, 1.1, GLOW.emblem);
    const tor = new THREE.TorusGeometry(0.72, 0.05, 6, 28);
    k.gold.add(tor, new THREE.Matrix4().makeTranslation(0, V.floorY + 2.75, V.backZ + 0.07));
    tor.dispose();
  }

  /** vault floor (a grid: the practicals light it per fragment, the grid keeps the flood field smooth) */
  private floor(): void {
    const V = VAULT;
    const hw = V.span / 2 + 0.05;
    const nx = 8,
      nz = 10;
    const pos: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const y = V.floorY;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x0 = -hw + (2 * hw * i) / nx,
          x1 = -hw + (2 * hw * (i + 1)) / nx;
        const z0 = V.screenZ + ((V.backZ - V.screenZ) * j) / nz,
          z1 = V.screenZ + ((V.backZ - V.screenZ) * (j + 1)) / nz;
        tri(pos, [x0, y, z0], [x1, y, z0], [x1, y, z1], up);
        tri(pos, [x0, y, z0], [x1, y, z1], [x0, y, z1], up);
      }
    const g = soup(pos);
    this.vb.add(g, undefined, { color: VCOL.floor });
    g.dispose();
  }

  /** the ring of downlight cans in the portal throat (the rig's `archSpots` sit in them) */
  private crown(): void {
    const k = this.kit;
    const g = new THREE.CylinderGeometry(0.12, 0.1, 0.28, 10);
    for (const [x, y, z] of archSpotPositions()) {
      k.metal.add(g, new THREE.Matrix4().makeRotationX(0.35).setPosition(x, y + 0.05, z), { color: METAL.black });
      cyl(k.metal, x, y + 0.15, z, 0.02, 0.02, y + 0.38, 4, METAL.black);
    }
    g.dispose();
  }

  // ---------------------------------------------------------------------------------------------
  // exterior: the gold fish-scale barrel roof

  private roof(): void {
    const k = this.kit;
    const V = VAULT;
    const z0 = V.screenZ + 0.02;
    const z1 = L.facadeZ + 0.01;
    const nh = k.detail >= 1 ? 14 : 8;
    const outline = roofOutline(nh);
    const cx = 0,
      cy = V.roofSpring;
    // under-layer: dark red-orange between the scales (the photos' scale outlines); plain gold on mobile
    {
      const pos: number[] = [];
      for (let j = 0; j + 1 < outline.length; j++) {
        const a = outline[j],
          b = outline[j + 1];
        const nrm = new THREE.Vector3((a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy, 0).normalize();
        tri(pos, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], nrm);
        tri(pos, [a[0], a[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], nrm);
      }
      const g = soup(pos);
      if (k.detail >= 1) k.paint.add(g, undefined, { color: new THREE.Color('#5a1c0c') });
      else k.gold.add(g);
      g.dispose();
    }
    // the scale rows run on into the screen and the facade (hidden there): no half scales at the ends
    if (k.detail >= 1) this.scales(outline, z0 + 0.15, z1 - 0.15);
    // ridge crest: a gold tube along the apex with small spikes, gold eaves bands
    const apex = V.roofApex;
    const tube = new THREE.CylinderGeometry(0.1, 0.1, z0 - z1, 10);
    tube.rotateX(Math.PI / 2);
    k.gold.add(tube, new THREE.Matrix4().makeTranslation(0, apex + 0.06, (z0 + z1) / 2));
    tube.dispose();
    const spike = new THREE.ConeGeometry(0.07, 0.42, 6);
    const knob = new THREE.SphereGeometry(0.1, 8, 6);
    for (let z = z0 - 0.45; z > z1 + 0.2; z -= 0.9) {
      k.gold.add(knob, new THREE.Matrix4().makeTranslation(0, apex + 0.2, z));
      k.gold.add(spike, new THREE.Matrix4().makeTranslation(0, apex + 0.48, z));
    }
    spike.dispose();
    knob.dispose();
    for (const s of [-1, 1]) {
      const band = new THREE.BoxGeometry(0.14, 0.2, z0 - z1);
      k.gold.add(band, new THREE.Matrix4().makeTranslation(s * (V.outerHalf + 0.02), V.roofSpring + 0.1, (z0 + z1) / 2));
      band.dispose();
    }
  }

  /**
   * Fish scales (daytime photos): rows of rounded gold scales pointing down the slope, each row
   * overlapping the one below, alternate rows offset by half a scale. Each scale is a slightly domed
   * fan whose tip lifts off the roof (shingle overlap without z-fighting, glints under the floods).
   */
  private scales(outline: [number, number][], zFront: number, zBack: number): void {
    const V = VAULT;
    const n = (outline.length - 1) / 2;
    // arc-length parametrisation of each half from its eave (u = 0) to the apex
    const halves = [outline.slice(0, n + 1), outline.slice(n).reverse()];
    const W = 0.46,
      H = 0.36,
      Lh = H * 1.45;
    const pos: number[] = [];
    const p = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const at = (half: [number, number][], lens: number[], u: number, out: THREE.Vector3, nOut: THREE.Vector3) => {
      let j = 1;
      while (j < half.length - 1 && lens[j] < u) j++;
      const f = Math.min(1, Math.max(0, (u - lens[j - 1]) / Math.max(1e-6, lens[j] - lens[j - 1])));
      out.set(half[j - 1][0] + (half[j][0] - half[j - 1][0]) * f, half[j - 1][1] + (half[j][1] - half[j - 1][1]) * f, 0);
      nOut.set(out.x, out.y - V.roofSpring, 0).normalize();
    };
    const ring: [number, number][] = [];
    const arcN = 6;
    ring.push([-0.5, 0], [0.5, 0], [0.5, 0.45]);
    for (let i = 1; i < arcN; i++) {
      const t = (i / arcN) * Math.PI;
      ring.push([0.5 * Math.cos(t), 0.45 + 0.55 * Math.sin(t)]);
    }
    ring.push([-0.5, 0.45]);
    for (const half of halves) {
      const lens = [0];
      for (let i = 1; i < half.length; i++) lens.push(lens[i - 1] + Math.hypot(half[i][0] - half[i - 1][0], half[i][1] - half[i - 1][1]));
      const S = lens[lens.length - 1];
      const rows = Math.ceil((S - Lh * 0.4) / H);
      for (let r = 0; r < rows; r++) {
        const uTip = r * H;
        const uTop = Math.min(S, uTip + Lh);
        const len = uTop - uTip;
        if (len < 0.08) continue;
        const off = (r % 2) * 0.5;
        for (let zc = zFront - (0.5 + off) * W; zc > zBack; zc -= W) {
          const vert = (a: number, b: number, lift: number): number[] => {
            // a across (−0.5..0.5 of W), b from the top edge (0) to the tip (1)
            at(half, lens, uTop - b * len, p, nrm);
            const h = 0.012 + 0.045 * b + lift;
            return [p.x + nrm.x * h, p.y + nrm.y * h, zc + a * W];
          };
          const c = vert(0, 0.5, 0.022);
          for (let i = 0; i < ring.length; i++) {
            const A = ring[i],
              B = ring[(i + 1) % ring.length];
            const va = vert(A[0], A[1], 0),
              vb = vert(B[0], B[1], 0);
            at(half, lens, uTop - 0.5 * len, p, nrm);
            tri(pos, c, va, vb, nrm);
          }
        }
      }
    }
    const g = soup(pos);
    this.kit.gold.add(g);
    g.dispose();
  }
}
