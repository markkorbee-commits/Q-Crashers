import * as THREE from 'three';
import { boxMinMax, cyl, METAL, PAINT, railing, type StageKit } from '../kit';
import { L } from '../layout';
import { LED_KIND } from '../materials/LedMaterial';

const OUT = new THREE.Vector3(0, 0, 1);
const RIGHT = new THREE.Vector3(1, 0, 0);

/**
 * Stage deck (1.9 m, front edge z = 0): black fabric front with ground-stacked KS28-class sub blocks,
 * aluminium lip with a pixel LED line, the evenly spaced front-line fixtures, flame units (deck_front
 * anchors), central stairs down into the photo pit, wedge monitors, backstage deck.
 */
export class DeckBuilder {
  constructor(private kit: StageKit) {}

  build(): void {
    const k = this.kit;
    const Y = L.deckY;
    const H = L.frontHalf + 2;
    // deck body + top
    boxMinMax(k.paint, -H, 0, L.deckBackZ, H, Y - 0.04, -0.06, PAINT.black);
    boxMinMax(k.paint, -H, Y - 0.04, L.deckBackZ, H, Y, -0.02, PAINT.deckTop);
    // black front skirt (fabric), slightly proud
    boxMinMax(k.paint, -H, 0, -0.06, H, Y - 0.1, 0, PAINT.black);
    // aluminium lip
    boxMinMax(k.metal, -H, Y - 0.1, -0.08, H, Y + 0.02, 0.03, METAL.steel);
    // pixel LED line on the lip (split in two around the stairs)
    k.led.bar(new THREE.Vector3(-H, Y - 0.2, 0.01), new THREE.Vector3(-2.9, Y - 0.2, 0.01), OUT, 0.1);
    k.led.bar(new THREE.Vector3(2.9, Y - 0.2, 0.01), new THREE.Vector3(H, Y - 0.2, 0.01), OUT, 0.1);
    // lower LED dots along the skirt foot
    k.led.bar(new THREE.Vector3(-H, 0.12, 0.01), new THREE.Vector3(H, 0.12, 0.01), OUT, 0.08, k.led.newStrip(), 0, LED_KIND.dots);

    this.subs();
    this.frontLine();
    this.stairs();
    this.wedges();
  }

  /** ground-stacked sub blocks in front of the deck (2 wide x 3 high KS28-class cabinets) */
  private subs(): void {
    const k = this.kit;
    const s28 = L.ks28;
    const xs = [4.6, 13.1, 21.6, 30.1, 38.6, 47.1, 55.6];
    for (const s of [1, -1])
      for (const cx of xs) {
        for (let c = 0; c < 2; c++)
          for (let r = 0; r < 3; r++) {
            const x = s * cx + (c - 0.5) * s28.w;
            const g = new THREE.BoxGeometry(s28.w - 0.01, s28.h - 0.01, s28.d);
            const m = new THREE.Matrix4().makeTranslation(x, s28.h * (r + 0.5), 0.02 + s28.d / 2);
            k.speaker.add(g, m, { uv: 'keep' });
            g.dispose();
          }
        // small front-fill cabinet on top of each block
        boxMinMax(k.speaker, s * cx - 0.5, s28.h * 3, 0.12, s * cx + 0.5, s28.h * 3 + 0.3, 0.62);
      }
  }

  /** fixtures + flame units along the front line (deck_front / fixtures_floor anchors) */
  private frontLine(): void {
    const k = this.kit;
    const Y = L.deckY;
    const lens = new THREE.Vector3(0, 0.7071, 0.7071);
    for (let i = 0; i <= 24; i++) {
      const x = -60 + i * 5;
      // flame unit (Magic FX Flamaniac-class box with nozzle)
      boxMinMax(k.metal, x - 0.28, Y, -0.62, x + 0.28, Y + 0.3, -0.12, METAL.black);
      cyl(k.metal, x, Y + 0.3, -0.37, 0.07, 0.06, Y + 0.48, 6, METAL.steel);
      k.pts.deckFront.push(new THREE.Vector3(x, Y, -0.37));
    }
    for (let i = 0; i < 24; i++) {
      const x = -57.5 + i * 5;
      if (Math.abs(x) < 3) continue;
      // static beam fixture on the lip (the "evenly spaced lights" of the front line)
      boxMinMax(k.metal, x - 0.22, Y, -1.05, x + 0.22, Y + 0.22, -0.65, METAL.black);
      boxMinMax(k.metal, x - 0.2, Y + 0.18, -0.95, x + 0.2, Y + 0.52, -0.62, METAL.black);
      k.led.rect(new THREE.Vector3(x, Y + 0.36, -0.6), RIGHT, new THREE.Vector3(0, 0.906, -0.423), 0.32, 0.32, LED_KIND.lamp, (i * 0.37) % 1);
      k.led.rect(new THREE.Vector3(x, Y + 0.53, -0.8), RIGHT, new THREE.Vector3(0, 0, -1), 0.3, 0.3, LED_KIND.lamp, (i * 0.37) % 1);
      void lens;
    }
    for (let i = 0; i < 30; i++) {
      const x = -58 + i * 4;
      k.pts.fixturesFloor.push(new THREE.Vector3(x, Y + 0.3, -1.6));
    }
    for (let i = 0; i < 12; i++) k.pts.laserStage.push(new THREE.Vector3(-55 + i * 10, Y + 0.45, -0.9));
  }

  /** central stairs from the deck into the photo pit */
  private stairs(): void {
    const k = this.kit;
    const Y = L.deckY;
    const n = 7;
    const rise = Y / n;
    const w = 2.6;
    for (let i = 0; i < n - 1; i++) {
      const top = Y - rise * (i + 1);
      const z0 = 0.3 * i,
        z1 = 0.3 * (i + 1);
      boxMinMax(k.paint, -w, 0, z0, w, top, z1, PAINT.black);
      boxMinMax(k.metal, -w, top - 0.02, z1 - 0.05, w, top + 0.005, z1 + 0.005, METAL.alu);
    }
    for (const s of [-1, 1]) {
      railing(k, [new THREE.Vector3(s * (w - 0.05), Y, -0.05), new THREE.Vector3(s * (w - 0.05), rise, 1.85), new THREE.Vector3(s * (w - 0.05), 0, 2.2)], 1.0, 0.9);
    }
  }

  private wedges(): void {
    const k = this.kit;
    const Y = L.deckY;
    for (const x of [-5.5, -3.2, 3.2, 5.5]) {
      const g = new THREE.BoxGeometry(0.62, 0.36, 0.5);
      const m = new THREE.Matrix4().makeRotationX(-0.45).setPosition(x, Y + 0.2, -2.2);
      k.speaker.add(g, m, { uv: 'keep' });
      g.dispose();
    }
  }
}

/**
 * Mojo-type aluminium crowd barrier as ONE instanced mesh: 1 m sections with a sloped front plate,
 * audience foot plate, top rail, pit-side braces and security step.
 */
export function barrierSegmentGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Matrix4) => {
    g.applyMatrix4(m);
    parts.push(g.index ? g.toNonIndexed() : g);
  };
  // sloped front plate (audience side, leaning toward the pit)
  const plate = new THREE.BoxGeometry(0.98, 1.2, 0.025);
  add(plate, new THREE.Matrix4().makeRotationX(-0.3).setPosition(0, 0.6, 0.16));
  // foot plate
  add(new THREE.BoxGeometry(0.99, 0.02, 0.62), new THREE.Matrix4().makeTranslation(0, 0.01, 0.55));
  // top rail
  const rail = new THREE.CylinderGeometry(0.045, 0.045, 1.0, 8);
  add(rail, new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(0, 1.16, -0.02));
  // pit-side braces + step
  for (const x of [-0.42, 0.42]) {
    const len = Math.hypot(1.1, 0.72);
    const b = new THREE.BoxGeometry(0.04, len, 0.04);
    add(b, new THREE.Matrix4().makeRotationX(Math.atan2(0.72, 1.1)).setPosition(x, 0.58, -0.38));
    add(new THREE.BoxGeometry(0.04, 0.04, 0.8), new THREE.Matrix4().makeTranslation(x, 0.02, -0.35));
  }
  add(new THREE.BoxGeometry(0.96, 0.04, 0.26), new THREE.Matrix4().makeTranslation(0, 0.42, -0.3));
  const nonIdx = parts.map((p) => {
    for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') p.deleteAttribute(k);
    return p;
  });
  // merge manually (same attributes)
  let count = 0;
  for (const p of nonIdx) count += p.attributes.position.count;
  const pos = new Float32Array(count * 3),
    nor = new Float32Array(count * 3),
    uv = new Float32Array(count * 2);
  let o = 0;
  for (const p of nonIdx) {
    pos.set(p.attributes.position.array as Float32Array, o * 3);
    nor.set(p.attributes.normal.array as Float32Array, o * 3);
    uv.set(p.attributes.uv.array as Float32Array, o * 2);
    o += p.attributes.position.count;
    p.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}

/** barrier section transforms: straight line at z = barrierZ + both arm lines (3 m in front of the arm ledges) */
export function barrierLayout(): THREE.Matrix4[] {
  const out: THREE.Matrix4[] = [];
  const d = new THREE.Vector2().subVectors(L.armB, L.armA);
  const len = d.length();
  d.normalize();
  const nIn = new THREE.Vector2(-d.y, d.x);
  const off = L.armLedge + L.barrierZ; // barrier 3 m in front of the ledge edge
  // where the angled barrier line meets z = barrierZ
  const p0 = new THREE.Vector2(L.armA.x + nIn.x * L.barrierZ, L.armA.y + nIn.y * L.barrierZ);
  const tMeet = (L.barrierZ - p0.y) / d.y;
  const xMeet = p0.x + d.x * tMeet;
  const nStraight = Math.floor(xMeet * 2);
  const step = (xMeet * 2) / nStraight;
  for (let i = 0; i < nStraight; i++) {
    const x = -xMeet + step * (i + 0.5);
    out.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, L.barrierZ), new THREE.Quaternion(), new THREE.Vector3(step / 1.0, 1, 1)));
  }
  void off;
  const yaw = Math.atan2(-d.y, d.x); // rotation about Y mapping +X to the arm direction
  const n = Math.floor(len + L.armLedge - tMeet);
  for (const s of [1, -1]) {
    for (let i = 0; i < n; i++) {
      const t = tMeet + i + 0.5;
      const x = s * (p0.x + d.x * t);
      const z = p0.y + d.y * t;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * yaw);
      out.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, 1, 1)));
    }
  }
  return out;
}
