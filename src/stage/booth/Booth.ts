import * as THREE from 'three';
import { GeoBucket } from '../lib/GeoBucket';
import { ATLAS } from './boothAtlas';
import { BOOTH, VAULT } from './layout';

/**
 * The DJ booth in the gold vault (user request: "a fitting DJ booth with an extended CDJ-3000 set"):
 * a black desk with a lit front panel on a low DJ riser, four media players (9" touch screen, 206 mm
 * jog wheel with a centre display, tempo fader, hot-cue pads, play / cue), a 4-channel club mixer in
 * the middle, an effects unit, a laptop on a stand, booth monitors on stands left and right,
 * headphones, a gooseneck lamp, cables, a towel and water bottles. Generic plates, no brand marks.
 *
 * Real scale: media player 0.33 x 0.45 m top, 0.12 m high; mixer 0.40 x 0.45 m; desk 2.76 x 0.9 m,
 * 1.05 m over the vault floor (0.95 m over the riser the DJ stands on).
 *
 * Static bodies go into the vault bucket (one merged mesh, vault material); every glowing surface
 * (screens, jog displays, pads, meters, buttons, the front panel) is a quad of the booth-screen mesh
 * (one atlas, one shader, animated by show time + beat). The booth stays EMPTY in the Endshow (no DJ
 * performed): gear on, screens glowing.
 */

/** body colours (sRGB) */
const C = {
  desk: new THREE.Color('#0c0c0e'),
  deskTop: new THREE.Color('#1a1a1d'),
  rubber: new THREE.Color('#101012'),
  body: new THREE.Color('#2c2d31'),
  plate: new THREE.Color('#141417'),
  silver: new THREE.Color('#a9adb4'),
  jog: new THREE.Color('#1c1c1f'),
  knob: new THREE.Color('#0e0e10'),
  cap: new THREE.Color('#d8dadd'),
  slot: new THREE.Color('#050506'),
  alu: new THREE.Color('#8e939a'),
  towel: new THREE.Color('#e9e6de'),
  bottle: new THREE.Color('#7fa3b8'),
  bottleCap: new THREE.Color('#1a5aa8'),
  cable: new THREE.Color('#09090a'),
  cone: new THREE.Color('#1e1e22'),
};

/** kinds of the booth-screen shader (aK.x) */
export const SCREEN_KIND = { atlas: 0, player: 1, jog: 2, pads: 3, meter: 4, laptop: 5, panel: 6, button: 7, lamp: 8 } as const;

/** quads of the booth-screen mesh: position, uv (atlas), aL (local 0..1), aK (kind, seed, repeat, _), aR (atlas region) */
export class ScreenQuads {
  readonly pos: number[] = [];
  readonly uv: number[] = [];
  readonly l: number[] = [];
  readonly k: number[] = [];
  readonly r: number[] = [];

  /** quad centred at c, spanned by unit vectors right / up (the visible face is right x up) */
  quad(c: THREE.Vector3, right: THREE.Vector3, up: THREE.Vector3, w: number, h: number, kind: number, seed: number, region: readonly [number, number, number, number], rep = 1): void {
    const rx = right.clone().multiplyScalar(w / 2);
    const uy = up.clone().multiplyScalar(h / 2);
    const P = [c.clone().sub(rx).sub(uy), c.clone().add(rx).sub(uy), c.clone().add(rx).add(uy), c.clone().sub(rx).add(uy)];
    const L = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    for (const i of [0, 1, 2, 0, 2, 3]) {
      this.pos.push(P[i].x, P[i].y, P[i].z);
      this.l.push(L[i][0], L[i][1]);
      this.uv.push(region[0] + L[i][0] * region[2], region[1] + L[i][1] * region[3]);
      this.k.push(kind, seed, rep, 0);
      this.r.push(region[0], region[1], region[2], region[3]);
    }
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aL', new THREE.Float32BufferAttribute(this.l, 2));
    g.setAttribute('aK', new THREE.Float32BufferAttribute(this.k, 4));
    g.setAttribute('aR', new THREE.Float32BufferAttribute(this.r, 4));
    g.computeBoundingSphere();
    return g;
  }
}

const X = new THREE.Vector3(1, 0, 0);
const NX = new THREE.Vector3(-1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const _box = new THREE.BoxGeometry(1, 1, 1);

export class BoothBuilder {
  private cylCache = new Map<string, THREE.CylinderGeometry>();

  constructor(
    private vb: GeoBucket,
    private q: ScreenQuads,
    private detail: number,
  ) {}

  /** desk top height (world Y) */
  static get top(): number {
    return VAULT.floorY + BOOTH.height;
  }

  build(): void {
    this.desk();
    const T = BoothBuilder.top;
    const z0 = BOOTH.z - BOOTH.halfD + 0.08; // DJ-side edge of the gear
    // media players 1–2 on the DJ's left (+X), mixer in the middle, 3–4 on the right, effects unit
    // at the right end, laptop at the left end
    const players = [0.745, 0.395, -0.395, -0.745];
    players.forEach((x, i) => this.player(x, T, z0, i));
    this.mixer(0, T, z0);
    this.fxUnit(-1.07, T, z0);
    this.laptop(1.12, T, z0);
    for (const s of [-1, 1]) this.monitor(s);
    this.extras(T, z0);
  }

  // ---------------------------------------------------------------------------------------------
  // primitives

  private box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: THREE.Color): void {
    const m = new THREE.Matrix4().makeScale(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    m.setPosition((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.vb.add(_box, m, { color: col });
  }

  private boxM(m: THREE.Matrix4, col: THREE.Color): void {
    this.vb.add(_box, m, { color: col });
  }

  private cyl(r0: number, r1: number, h: number, seg: number): THREE.CylinderGeometry {
    const key = `${r0}|${r1}|${h}|${seg}`;
    let g = this.cylCache.get(key);
    if (!g) this.cylCache.set(key, (g = new THREE.CylinderGeometry(r1, r0, h, seg)));
    return g;
  }

  /** vertical cylinder standing on (x, y, z) */
  private post(x: number, y: number, z: number, r: number, h: number, col: THREE.Color, seg = 12, rTop = r): void {
    this.vb.add(this.cyl(r, rTop, h, seg), new THREE.Matrix4().makeTranslation(x, y + h / 2, z), { color: col });
  }

  private rod(a: THREE.Vector3, b: THREE.Vector3, t: number, col: THREE.Color): void {
    const d = new THREE.Vector3().subVectors(b, a);
    const len = d.length();
    if (len < 1e-4) return;
    const qn = new THREE.Quaternion().setFromUnitVectors(Y, d.normalize());
    this.boxM(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), qn, new THREE.Vector3(t, len, t)), col);
  }

  // ---------------------------------------------------------------------------------------------

  private desk(): void {
    const F = VAULT.floorY;
    const B = BOOTH;
    const zf = B.z + B.halfD; // field side (front panel)
    const zb = B.z - B.halfD; // DJ side
    // DJ riser (rubber mat on a low platform)
    this.box(-B.matHalfW, F, B.matBackZ, B.matHalfW, F + B.matH, B.matFrontZ, C.rubber);
    // desk body (open towards the DJ: a shelf at knee height), top with a slight overhang
    this.box(-B.halfW, F, zf - 0.06, B.halfW, F + B.height - 0.05, zf, C.desk);
    for (const s of [-1, 1]) this.box(s * B.halfW - 0.05, F, zb, s * B.halfW + 0.05, F + B.height - 0.05, zf, C.desk);
    this.box(-B.halfW, F + 0.42, zb + 0.05, B.halfW, F + 0.45, zf - 0.06, C.desk);
    this.box(-B.halfW - 0.04, F + B.height - 0.05, zb - 0.05, B.halfW + 0.04, F + B.height, zf + 0.04, C.deskTop);
    // the lit front panel (field side) in a black frame + two amber edge strips
    this.q.quad(new THREE.Vector3(0, F + 0.5, zf + 0.005), X, Y, 2 * B.halfW - 0.16, 0.78, SCREEN_KIND.panel, 0, ATLAS.panel, 4);
    for (const y of [F + 0.08, F + B.height - 0.09])
      this.q.quad(new THREE.Vector3(0, y, zf + 0.006), X, Y, 2 * B.halfW - 0.1, 0.022, SCREEN_KIND.lamp, 0, ATLAS.white);
  }

  /**
   * one media player at x (DJ side at z0, the screen at the far end towards the field). The DJ faces
   * +Z, so on-screen "right" is world −X.
   */
  private player(x: number, T: number, z0: number, i: number): void {
    const d = this.detail;
    const w = 0.33,
      depth = 0.45,
      h = 0.118;
    const z1 = z0 + depth;
    this.box(x - w / 2, T, z0, x + w / 2, T + h - 0.012, z1, C.body);
    this.box(x - w / 2 + 0.004, T + h - 0.012, z0 + 0.004, x + w / 2 - 0.004, T + h, z1 - 0.004, C.plate);
    // screen housing (a raised wedge at the far end) + the tilted 9" touch screen
    const a = (28 * Math.PI) / 180;
    const up = new THREE.Vector3(0, Math.sin(a), Math.cos(a));
    this.vb.add(_box, new THREE.Matrix4().makeRotationX(-a).scale(new THREE.Vector3(w - 0.03, 0.05, 0.15)).setPosition(x, T + h + 0.012, z1 - 0.085), { color: C.plate });
    this.q.quad(new THREE.Vector3(x, T + h + 0.04, z1 - 0.088), NX, up, 0.215, 0.126, SCREEN_KIND.player, i, ATLAS.player);
    // hot-cue pad row under the screen
    this.q.quad(new THREE.Vector3(x, T + h + 0.002, z1 - 0.19), NX, Z, 0.26, 0.026, SCREEN_KIND.pads, i, ATLAS.white);
    // jog wheel: silver platter ring, dark touch surface, centre display
    const jz = z0 + 0.19;
    this.post(x, T + h, jz, 0.103, 0.02, C.silver, d >= 1 ? 32 : 16);
    this.post(x, T + h + 0.02, jz, 0.094, 0.006, C.jog, d >= 1 ? 32 : 16);
    this.q.quad(new THREE.Vector3(x, T + h + 0.0275, jz), NX, Z, 0.09, 0.09, SCREEN_KIND.jog, i, ATLAS.jog);
    // tempo fader (DJ's right = −X side of the unit) + cap
    this.box(x - 0.14, T + h, z0 + 0.07, x - 0.128, T + h + 0.002, z0 + 0.3, C.slot);
    this.box(x - 0.145, T + h, z0 + 0.17, x - 0.123, T + h + 0.018, z0 + 0.195, C.cap);
    // play / cue buttons (DJ's left front corner) - lit rings
    for (const [bz, seed] of [
      [z0 + 0.04, 0],
      [z0 + 0.095, 1],
    ] as const) {
      this.post(x + 0.125, T + h, bz, 0.024, 0.008, C.knob, 12);
      this.q.quad(new THREE.Vector3(x + 0.125, T + h + 0.0085, bz), NX, Z, 0.05, 0.05, SCREEN_KIND.button, seed + i * 2, ATLAS.white);
    }
    // small function buttons down the left strip and above the jog
    if (d >= 1) {
      for (let k = 0; k < 5; k++) this.box(x + 0.11, T + h, z0 + 0.14 + k * 0.035, x + 0.145, T + h + 0.008, z0 + 0.162 + k * 0.035, C.knob);
      for (let k = 0; k < 4; k++) this.box(x - 0.1 + k * 0.05, T + h, z0 + 0.31, x - 0.07 + k * 0.05, T + h + 0.007, z0 + 0.325, C.knob);
    }
  }

  /** 4-channel club mixer at x */
  private mixer(x: number, T: number, z0: number): void {
    const d = this.detail;
    const w = 0.4,
      depth = 0.45,
      h = 0.108;
    const z1 = z0 + depth;
    this.box(x - w / 2, T, z0, x + w / 2, T + h - 0.008, z1, C.body);
    this.box(x - w / 2 + 0.005, T + h - 0.008, z0 + 0.005, x + w / 2 - 0.005, T + h, z1 - 0.005, C.plate);
    // display at the far end, tilted towards the DJ
    const a = (20 * Math.PI) / 180;
    this.q.quad(new THREE.Vector3(x, T + h + 0.004, z1 - 0.045), NX, new THREE.Vector3(0, Math.sin(a), Math.cos(a)), 0.12, 0.045, SCREEN_KIND.atlas, 0, ATLAS.mixer);
    const knob = this.cyl(0.011, 0.009, 0.022, d >= 1 ? 8 : 6);
    for (let c = 0; c < 4; c++) {
      const cx = x + 0.1125 - c * 0.075;
      // trim, hi, mid, low, colour fx
      for (let k = 0; k < (d >= 1 ? 5 : 3); k++) this.vb.add(knob, new THREE.Matrix4().makeTranslation(cx, T + h + 0.011, z1 - 0.1 - k * 0.042), { color: C.knob });
      // channel fader slot + cap, level meter beside it
      this.box(cx - 0.004, T + h, z0 + 0.07, cx + 0.004, T + h + 0.002, z0 + 0.16, C.slot);
      this.box(cx - 0.012, T + h, z0 + 0.1 + (c % 2) * 0.03, cx + 0.012, T + h + 0.02, z0 + 0.118 + (c % 2) * 0.03, C.cap);
      this.q.quad(new THREE.Vector3(cx + 0.022, T + h + 0.002, z0 + 0.115), NX, Z, 0.007, 0.09, SCREEN_KIND.meter, c, ATLAS.white);
    }
    // crossfader
    this.box(x - 0.06, T + h, z0 + 0.03, x + 0.06, T + h + 0.002, z0 + 0.038, C.slot);
    this.box(x - 0.012, T + h, z0 + 0.024, x + 0.012, T + h + 0.02, z0 + 0.044, C.cap);
  }

  private fxUnit(x: number, T: number, z0: number): void {
    const w = 0.26,
      depth = 0.3,
      h = 0.07;
    const zz = z0 + 0.05;
    this.box(x - w / 2, T, zz, x + w / 2, T + h, zz + depth, C.body);
    this.q.quad(new THREE.Vector3(x, T + h + 0.002, zz + depth - 0.07), NX, Z, 0.13, 0.065, SCREEN_KIND.atlas, 0, ATLAS.fx);
    this.q.quad(new THREE.Vector3(x, T + h + 0.002, zz + 0.05), NX, Z, 0.2, 0.024, SCREEN_KIND.pads, 7, ATLAS.white);
    const knob = this.cyl(0.016, 0.014, 0.026, this.detail >= 1 ? 10 : 6);
    for (let k = 0; k < 3; k++) this.vb.add(knob, new THREE.Matrix4().makeTranslation(x + 0.07 - k * 0.07, T + h + 0.013, zz + 0.13), { color: C.knob });
  }

  private laptop(x: number, T: number, z0: number): void {
    // aluminium stand raising the laptop towards the DJ, base + lid (screen faces the DJ)
    const zc = z0 + 0.22;
    this.box(x - 0.12, T, zc - 0.1, x - 0.1, T + 0.14, zc + 0.12, C.alu);
    this.box(x + 0.1, T, zc - 0.1, x + 0.12, T + 0.14, zc + 0.12, C.alu);
    const tilt = 0.26;
    const base = new THREE.Matrix4().makeRotationX(-tilt).scale(new THREE.Vector3(0.32, 0.016, 0.22)).setPosition(x, T + 0.15, zc);
    this.boxM(base, C.alu);
    // lid hinged at the far edge, leaning back 18° from vertical
    const hy = T + 0.15 + Math.sin(tilt) * 0.11;
    const hz = zc + Math.cos(tilt) * 0.11;
    const lean = (18 * Math.PI) / 180;
    const up = new THREE.Vector3(0, Math.cos(lean), Math.sin(lean));
    const c = new THREE.Vector3(x, hy, hz).addScaledVector(up, 0.105);
    this.boxM(new THREE.Matrix4().makeRotationX(lean).scale(new THREE.Vector3(0.32, 0.21, 0.01)).setPosition(c.x, c.y, c.z + 0.006), C.alu);
    this.q.quad(c.clone().add(new THREE.Vector3(0, 0, -0.0005)).addScaledVector(new THREE.Vector3(0, -Math.sin(lean), Math.cos(lean)), -0.001), NX, up, 0.3, 0.19, SCREEN_KIND.laptop, 0, ATLAS.laptop);
  }

  /** booth monitor on a tripod stand beside the desk, aimed at the DJ's head */
  private monitor(s: number): void {
    const F = VAULT.floorY;
    const x = s * 1.8,
      z = BOOTH.djZ + 0.55;
    const top = F + 1.18;
    this.post(x, F, z, 0.02, 1.18, C.body, 8);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5;
      this.rod(new THREE.Vector3(x, F + 0.45, z), new THREE.Vector3(x + Math.cos(a) * 0.36, F + 0.01, z + Math.sin(a) * 0.36), 0.018, C.body);
    }
    const yaw = Math.atan2(0 - x, BOOTH.djZ - z);
    const m = new THREE.Matrix4().makeRotationY(yaw);
    const ctr = new THREE.Vector3(x, top + 0.29, z);
    this.boxM(m.clone().scale(new THREE.Vector3(0.36, 0.56, 0.34)).setPosition(ctr), C.desk);
    // woofer + tweeter on the front (+Z local)
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const face = (dy: number, r: number) => {
      const g = this.cyl(r, r * 0.9, 0.02, this.detail >= 1 ? 20 : 12);
      const mm = new THREE.Matrix4().makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      mm.setPosition(ctr.clone().addScaledVector(fwd, 0.17).add(new THREE.Vector3(0, dy, 0)));
      this.vb.add(g, mm, { color: C.cone });
    };
    face(-0.08, 0.13);
    face(0.17, 0.045);
  }

  private extras(T: number, z0: number): void {
    const B = BOOTH;
    const d = this.detail;
    // headphones resting on the desk in front of the laptop stand
    const hx = 1.1,
      hz = B.z - B.halfD + 0.035;
    // (lying flat: cups down, the band arching towards the DJ)
    for (const dx of [-0.085, 0.085]) this.post(hx + dx, T, hz + 0.03, 0.045, 0.035, C.plate, d >= 1 ? 14 : 8);
    const band = new THREE.TorusGeometry(0.085, 0.012, 6, d >= 1 ? 16 : 8, Math.PI);
    this.vb.add(band, new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(hx, T + 0.02, hz + 0.03), { color: C.plate });
    band.dispose();
    // gooseneck booth lamp over the mixer (warm LED head: a practical)
    const lb = new THREE.Vector3(0.18, T + 0.108, z0 + 0.44);
    const lm = new THREE.Vector3(0.12, T + 0.36, z0 + 0.42);
    const lh = new THREE.Vector3(0.02, T + 0.4, z0 + 0.3);
    this.rod(lb, lm, 0.012, C.plate);
    this.rod(lm, lh, 0.012, C.plate);
    this.q.quad(lh.clone().add(new THREE.Vector3(0, -0.012, 0)), X, Z, 0.04, 0.02, SCREEN_KIND.lamp, 1, ATLAS.white);
    // towel over the DJ-side edge at the right end, two water bottles at the far corner
    this.box(-1.36, T, B.z - B.halfD - 0.04, -1.06, T + 0.018, B.z - B.halfD + 0.16, C.towel);
    this.box(-1.36, T - 0.2, B.z - B.halfD - 0.06, -1.06, T + 0.005, B.z - B.halfD - 0.04, C.towel);
    for (const [bx, bz] of [
      [-1.3, B.z + B.halfD - 0.1],
      [-1.22, B.z + B.halfD - 0.16],
    ]) {
      this.post(bx, T, bz, 0.033, 0.19, C.bottle, 10);
      this.post(bx, T + 0.19, bz, 0.016, 0.03, C.bottleCap, 8);
    }
    // cables from the back of each unit down into the desk (cable ports)
    if (d >= 1)
      for (const x of [0.745, 0.395, 0, -0.395, -0.745]) {
        const a = new THREE.Vector3(x + 0.05, T + 0.06, z0 + 0.455);
        const b = new THREE.Vector3(x + 0.07, T + 0.005, z0 + 0.52);
        this.rod(a, b, 0.012, C.cable);
        this.rod(b, new THREE.Vector3(x + 0.07, T - 0.04, z0 + 0.56), 0.012, C.cable);
      }
  }

  dispose(): void {
    for (const g of this.cylCache.values()) g.dispose();
    this.cylCache.clear();
  }
}
