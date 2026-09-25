import * as THREE from 'three';
import { boxMinMax, cyl, drape, METAL, PAINT, railing, type StageKit } from '../kit';
import { armX, ground, L } from '../layout';
import { LED_KIND } from '../materials/LedMaterial';

const OUT = new THREE.Vector3(0, 0, 1);
const RIGHT = new THREE.Vector3(1, 0, 0);
const PIT = new THREE.Color('#6f6d66');

/**
 * Central deck (design-bible §5.4): X ±37, Z −14…0, top Y 1.9, dark-red skirt (#5C0A19), aluminium
 * lip with the violet/blue deck-height LED line, the deck-lip pyro/laser hardware exactly on the bible
 * anchor positions (24 flame heads, 20 gerbs, 12 comet racks, 12 lasers, CO2 jets, Bengal pots, flash
 * mines), corner plinths to the side-section ledges, 12 ground-stacked KS28 blocks in the photo pit,
 * the pit stairs and the paved pit on the bank.
 */
export class DeckBuilder {
  constructor(private kit: StageKit) {}

  build(): void {
    const k = this.kit;
    const Y = L.deckY;
    const H = L.deckHalf;
    // deck body + top
    boxMinMax(k.paint, -H, 0, L.deckBackZ, H, Y - 0.04, -0.06, PAINT.black);
    boxMinMax(k.paint, -H, Y - 0.04, L.deckBackZ, H, Y, -0.02, PAINT.deckTop);
    // dark-red skirt (fabric), slightly proud; aluminium lip
    boxMinMax(k.paint, -H, 0, -0.06, H, Y - 0.1, 0, PAINT.red);
    boxMinMax(k.metal, -H, Y - 0.1, -0.08, H, Y + 0.02, 0.03, METAL.steel);
    // corner plinths (X ±37…±40, Z −4…0) joining the deck front to the side-section ledges
    for (const s of [-1, 1]) {
      const a = s * H,
        b = s * L.plinthX1;
      const xa = Math.min(a, b),
        xb = Math.max(a, b);
      boxMinMax(k.paint, xa, 0, L.sideFrontZ, xb, Y - 0.04, -0.06, PAINT.black);
      boxMinMax(k.paint, xa, Y - 0.04, L.sideFrontZ, xb, Y, -0.02, PAINT.deckTop);
      boxMinMax(k.paint, xa, 0, -0.06, xb, Y - 0.1, 0, PAINT.red);
      boxMinMax(k.metal, xa, Y - 0.1, -0.08, xb, Y + 0.02, 0.03, METAL.steel);
      // the plinth's outer flank (towards the side-section ledge) in skirt red
      boxMinMax(k.paint, s > 0 ? xb - 0.06 : xa, 0, L.ledgeFrontZ, s > 0 ? xb : xa + 0.06, Y - 0.1, 0, PAINT.red);
    }
    // deck-height LED line (violet/blue, FACT f140) split around the pit stairs + dots at the foot
    const E = L.plinthX1;
    k.led.bar(new THREE.Vector3(-E, Y - 0.2, 0.01), new THREE.Vector3(-2.5, Y - 0.2, 0.01), OUT, 0.1);
    k.led.bar(new THREE.Vector3(2.5, Y - 0.2, 0.01), new THREE.Vector3(E, Y - 0.2, 0.01), OUT, 0.1);
    k.led.bar(new THREE.Vector3(-E, 0.12, 0.01), new THREE.Vector3(E, 0.12, 0.01), OUT, 0.08, k.led.newStrip(), 0, LED_KIND.dots);

    this.pyro();
    this.subs();
    this.stairs();
    this.wedges();
    this.pit();
  }

  /** deck-lip hardware on the bible anchor positions (terrain-layout.json pyroAnchors / lasers) */
  private pyro(): void {
    const k = this.kit;
    const Y = L.deckY;
    const P = k.pts;
    // 24 flame heads X −35.65…+35.65 @ 3.1 m, Z −0.4
    for (let i = 0; i < 24; i++) {
      const x = -35.65 + i * 3.1;
      boxMinMax(k.metal, x - 0.28, Y, -0.65, x + 0.28, Y + 0.3, -0.15, METAL.black);
      cyl(k.metal, x, Y + 0.3, -0.4, 0.07, 0.06, Y + 0.46, 6, METAL.steel);
      P.deckFront.push(new THREE.Vector3(x, Y, -0.4));
    }
    // 20 gerbs X −38…+38 @ 4 m, Z −0.8 (the outer pair on the corner plinths)
    for (let i = 0; i < 20; i++) {
      const x = -38 + i * 4;
      cyl(k.metal, x, Y, -0.85, 0.11, 0.09, Y + 0.32, 6, METAL.black);
      P.deckGerbs.push(new THREE.Vector3(x, Y + 0.02, -0.85));
    }
    // 12 comet racks X −38.5…+38.5 @ 7 m, Z −0.6 (cluster of tubes on a small base)
    for (let i = 0; i < 12; i++) {
      const x = -38.5 + i * 7;
      boxMinMax(k.metal, x - 0.22, Y, -1.25, x + 0.22, Y + 0.12, -0.95, METAL.black);
      for (const dx of [-0.1, 0.1]) cyl(k.metal, x + dx, Y + 0.12, -1.1, 0.05, 0.05, Y + 0.5, 5, METAL.steel);
      P.frontComets.push(new THREE.Vector3(x, Y + 0.02, -1.1));
    }
    // 12 deck lasers X −33…+33 @ 6 m (housing behind the lip, aperture at Y 2.2)
    for (let i = 0; i < 12; i++) {
      const x = -33 + i * 6;
      boxMinMax(k.metal, x - 0.18, Y, -1.9, x + 0.18, Y + 0.34, -1.4, METAL.black);
      k.led.rect(new THREE.Vector3(x, Y + 0.22, -1.395), RIGHT, new THREE.Vector3(0, 1, 0), 0.08, 0.08, LED_KIND.lamp, (i * 0.31) % 1);
      P.laserStage.push(new THREE.Vector3(x, Y + 0.3, -1.4));
    }
    // CO2 jets on the deck (X ±5, ±15, ±25, ±35 at Z −1.5 → set back to −2.3 behind the lasers)
    for (const x of [-35, -25, -15, -5, 5, 15, 25, 35]) {
      cyl(k.metal, x, Y, -2.3, 0.16, 0.13, Y + 0.42, 8, METAL.steel);
      P.co2.push(new THREE.Vector3(x, Y + 0.02, -2.3));
    }
    // Bengal pots (X ±10, ±30) and flash mines (X ±8, ±20) on the deck
    for (const x of [-30, -10, 10, 30]) {
      cyl(k.metal, x, Y, -1.9, 0.2, 0.18, Y + 0.28, 8, METAL.black);
      P.bengal.push(new THREE.Vector3(x, Y + 0.02, -1.9));
    }
    for (const x of [-20, -8, 8, 20]) {
      boxMinMax(k.metal, x - 0.25, Y, -2.0, x + 0.25, Y + 0.18, -1.6, METAL.black);
      P.mines.push(new THREE.Vector3(x, Y + 0.02, -1.8));
    }
    // deck-front moving heads (bible: 40 beams) + static front-line lamps between them
    for (let i = 0; i < 40; i++) P.fixturesFloor.push(new THREE.Vector3(-35.1 + i * 1.8, Y + 0.3, -3.0));
    for (let i = 0; i < 18; i++) {
      const x = -34 + i * 4;
      if (Math.abs(x) < 2.5) continue;
      boxMinMax(k.metal, x - 0.2, Y, -2.95, x + 0.2, Y + 0.2, -2.6, METAL.black);
      k.led.rect(new THREE.Vector3(x, Y + 0.12, -2.59), RIGHT, new THREE.Vector3(0, 0.906, 0.423), 0.28, 0.2, LED_KIND.lamp, (i * 0.37) % 1);
    }
  }

  /** 12 ground-stacked sub blocks (2 wide x 3 high KS28) along X −42…+42, Z 1.2…2.3 */
  private subs(): void {
    const k = this.kit;
    const B = L.subBlock;
    const n = 12;
    const step = (84 - B.w) / (n - 1);
    for (let i = 0; i < n; i++) {
      const cx = -42 + B.w / 2 + i * step;
      const g0 = ground(cx, 1.75);
      for (let c = 0; c < 2; c++)
        for (let r = 0; r < 3; r++) {
          const g = new THREE.BoxGeometry(B.w / 2 - 0.01, B.h / 3 - 0.01, B.d);
          k.speaker.add(g, new THREE.Matrix4().makeTranslation(cx + (c - 0.5) * (B.w / 2), g0 + (B.h / 3) * (r + 0.5), 1.2 + B.d / 2), { uv: 'keep' });
          g.dispose();
        }
    }
  }

  /** central stairs from the deck into the photo pit */
  private stairs(): void {
    const k = this.kit;
    const Y = L.deckY;
    const n = 7;
    const rise = Y / n;
    const w = 2.1;
    for (let i = 0; i < n - 1; i++) {
      const top = Y - rise * (i + 1);
      const z0 = 0.3 * i,
        z1 = 0.3 * (i + 1);
      boxMinMax(k.paint, -w, 0, z0, w, top, z1, PAINT.black);
      boxMinMax(k.metal, -w, top - 0.02, z1 - 0.05, w, top + 0.005, z1 + 0.005, METAL.alu);
    }
    for (const s of [-1, 1]) railing(k, [new THREE.Vector3(s * (w - 0.05), Y, -0.05), new THREE.Vector3(s * (w - 0.05), rise, 1.85), new THREE.Vector3(s * (w - 0.05), 0, 2.2)], 1.0, 0.9);
  }

  private wedges(): void {
    const k = this.kit;
    const Y = L.deckY;
    for (const x of [-5.5, -3.2, 3.2, 5.5]) {
      const g = new THREE.BoxGeometry(0.62, 0.36, 0.5);
      k.speaker.add(g, new THREE.Matrix4().makeRotationX(-0.45).setPosition(x, Y + 0.2, -4.6), { uv: 'keep' });
      g.dispose();
    }
  }

  /** paved photo pit on the bank (|X| 40…90, Z −3…3) and the arm service lanes (X ±90…±92) */
  private pit(): void {
    const k = this.kit;
    for (const s of [-1, 1]) {
      drape(k.paint, s * 40, s * L.barrierX, L.ledgeFrontZ, L.barrierZ + 0.2, (x, z) => ground(x, z), 0.035, PIT, 2);
      drape(k.paint, s * (L.barrierX - 0.2), s * (armX(0) - L.rampartT / 2), L.corner.z + L.corner.w / 2 + 1, L.armEnd.z - 2, (x, z) => ground(x, z), 0.035, PIT, 2);
    }
  }
}

/**
 * Mojo-type aluminium crowd barrier as ONE instanced mesh: 1 m sections with a sloped front plate,
 * audience foot plate (+Z of the section), top rail, pit-side braces and security step.
 */
export function barrierSegmentGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Matrix4) => {
    g.applyMatrix4(m);
    parts.push(g.index ? g.toNonIndexed() : g);
  };
  const plate = new THREE.BoxGeometry(0.98, 1.2, 0.025);
  add(plate, new THREE.Matrix4().makeRotationX(-0.3).setPosition(0, 0.6, 0.16));
  add(new THREE.BoxGeometry(0.99, 0.02, 0.62), new THREE.Matrix4().makeTranslation(0, 0.01, 0.55));
  const rail = new THREE.CylinderGeometry(0.045, 0.045, 1.0, 8);
  add(rail, new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(0, 1.16, -0.02));
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

/** a barrier run: straight polyline, the audience on the section's +Z side (local) */
export interface BarrierRun {
  a: [number, number];
  b: [number, number];
}

/**
 * Barrier layout (design-bible §6.4, adapted to the bible stage): the front-of-stage line Z +3 across
 * |X| ≤ 90 with the photo pit behind it, and along the inner side of each arm (X ±90) from Z 3 to 60
 * with a channel at every rampart opening (the barrier turns in to the rampart so the crowd can
 * cross the service lane to the crest bars, while the lane itself stays closed).
 */
export function barrierRuns(): BarrierRun[] {
  const runs: BarrierRun[] = [];
  const X = L.barrierX;
  const Z = L.barrierZ;
  runs.push({ a: [-X, Z], b: [X, Z] });
  // runs are written for the right arm (audience on the local +Z = left of a→b); the mirrored left
  // run is reversed so its audience side still faces the field
  const add = (s: number, p: [number, number], q: [number, number]) => runs.push(s > 0 ? { a: p, b: q } : { a: [-q[0], q[1]], b: [-p[0], p[1]] });
  for (const s of [1, -1]) {
    let z0: number = Z;
    for (const [a, b] of L.armOpenings) {
      add(s, [X, z0], [X, a]);
      // channel walls from the barrier line to the rampart face
      const xr = armX(a) - L.rampartT / 2 - 0.9;
      add(s, [X, a], [xr, a]);
      add(s, [xr, b], [X, b]);
      z0 = b;
    }
    add(s, [X, z0], [X, L.armEnd.z + L.armEnd.w / 2]);
  }
  return runs;
}

/** 1 m section transforms along the runs, standing on the terrain */
export function barrierLayout(runs: BarrierRun[]): THREE.Matrix4[] {
  const out: THREE.Matrix4[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const r of runs) {
    const [ax, az] = r.a;
    const [bx, bz] = r.b;
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len));
    // local +X runs a -> b; local +Z (audience side) = left of the direction for our run orientation
    const yaw = Math.atan2(-(bz - az), bx - ax);
    const q = new THREE.Quaternion().setFromAxisAngle(up, yaw);
    const sx = len / n;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = ax + (bx - ax) * t,
        z = az + (bz - az) * t;
      out.push(new THREE.Matrix4().compose(new THREE.Vector3(x, ground(x, z), z), q, new THREE.Vector3(sx, 1, 1)));
    }
  }
  return out;
}
