import * as THREE from 'three';
import { Polyline, basisZ, bez2, circle, frameY, gem, plate, ring, scaleUv, spike, spline, surface, tube, v2, v3, withFx, type V3 } from './geom';
import { wingLayout } from './layout';
import { PAL, segs, type Kit } from './kit';
import { BULB } from './shading';

/**
 * Neck, body mass, shoulder yoke (wing roots), chest, forelegs with talons over the castle
 * parapet, and the seated skeletal rider (world space).
 */
export interface BodyResult {
  riderEyes: V3[];
  riderTop: V3;
  neckTop: V3;
}

export function buildBody(k: Kit): BodyResult {
  const W = k.world;
  const rnd = k.rnd;
  const radial = segs(k, 22, 10);

  // ------------------------------------------------------------------ neck
  const n0 = v3(0, 0.9, -5.2).applyMatrix4(k.HM);
  const neckCtrl = [n0, v3(3.8, 16.4, -17.4), v3(6.6, 15.4, -18.6), v3(9.6, 13.4, -20.4), v3(12.2, 10.6, -22.6)];
  const neckPts = spline(neckCtrl, segs(k, 40, 18));
  const neck = new Polyline(neckPts);
  const neckR = (t: number) => THREE.MathUtils.lerp(2.75, 3.3, t) * (1 + 0.04 * Math.sin(t * 40));
  W.lava.add(withFx(tube(neckPts, neckR, { radial, vScale: 3.0 }), 1));
  // armour bands, dorsal spines, LED rings
  const bands = 9;
  for (let i = 0; i < bands; i++) {
    const t = 0.08 + (i / (bands - 1)) * 0.86;
    const p = neck.at(t);
    const d = neck.tangent(t);
    const pts = [p.clone().addScaledVector(d, -0.35), p.clone().addScaledVector(d, 0.35)];
    const r = neckR(t) + 0.16;
    W.armor.add(tube(pts, () => r, { radial, capStart: false }), null, i % 2 ? PAL.plateRed : PAL.darkBronze);
    // LED ring
    const f = frameY(p, d);
    const ringPts: V3[] = [];
    for (let j = 0; j <= 24; j++) {
      const a = (j / 24) * Math.PI * 2;
      ringPts.push(v3(Math.cos(a) * (r + 0.06), 0.4, Math.sin(a) * (r + 0.06)).applyMatrix4(f));
    }
    W.strips.add(ringPts, 0, 0.12, 0, i * 0.11);
    // dorsal spine (skip the rider's seat)
    if (t < 0.2 || t > 0.5) {
      const up = v3(0, 1, 0).addScaledVector(d, -0.5).normalize();
      const base = p.clone().addScaledVector(v3(0, 1, 0), neckR(t) * 0.9);
      W.steel.add(spike(2.2 - t * 0.8, 0.45, { sides: 6, segs: 4, bendZ: -0.4 }), frameY(base, up, 0, 1, d));
    }
  }

  // overlapping armour plates along both flanks of the neck (the "armoured neck plates")
  {
    const kite = [v2(0, 1.25), v2(0.95, 0.1), v2(0, -1.45), v2(-0.95, 0.1)];
    const proto = plate(kite, 0.2, 0.06);
    const n = segs(k, 11, 6);
    for (let i = 0; i < n; i++) {
      const t = 0.1 + (i / (n - 1)) * 0.82;
      const p = neck.at(t);
      const d = neck.tangent(t);
      const side0 = v3().crossVectors(d, v3(0, 1, 0)).normalize();
      const up0 = v3().crossVectors(side0, d).normalize();
      for (const a of [-1.0, -0.35, 0.35, 1.0]) {
        if (Math.abs(a) < 0.5 && t > 0.2 && t < 0.5) continue; // leave the rider's seat clear
        const dir = up0.clone().multiplyScalar(Math.cos(a)).addScaledVector(side0, Math.sin(a)).normalize();
        const pos = p.clone().addScaledVector(dir, neckR(t) + 0.12);
        const m = basisZ(dir, d.clone().negate(), pos);
        m.multiply(new THREE.Matrix4().makeRotationX(-0.18));
        W.armor.add(proto.clone(), m, (i + (a > 0 ? 1 : 0)) % 3 === 0 ? PAL.darkBronze : PAL.plateRed);
      }
    }
  }

  // ------------------------------------------------------------------ body mass + shoulder yoke
  {
    const g = new THREE.SphereGeometry(1, radial, Math.round(radial * 0.6));
    scaleUv(g, 14, 5);
    g.scale(8.0, 6.0, 6.0);
    g.translate(5.5, 9.5, -22.8);
    W.shell.add(g, null, PAL.scaleDeep);
    const L = wingLayout(-1);
    const R = wingLayout(1);
    const yoke = bez2(L.shoulder, v3(0, 15.6, -19.8), R.shoulder, segs(k, 24, 10));
    W.shell.add(tube(yoke, (t) => 1.9 - 0.4 * Math.sin(t * Math.PI), { radial }), null, PAL.scaleRed);
    // shoulder armour: layered kite plates + a swept spike + a bronze stud
    for (const s of [L.shoulder, R.shoulder]) {
      const sx = Math.sign(s.x);
      for (let i = 0; i < 3; i++) {
        const kite = [v2(0, 1.6 - i * 0.2), v2(1.0, 0), v2(0, -1.9 + i * 0.2), v2(-1.0, 0)];
        const m = basisZ(v3(sx * 0.35, 0.5, 0.8), v3(sx * 0.8, 0.6, 0), v3(s.x + sx * (0.2 + i * 0.9), s.y + 0.9 - i * 0.35, s.z + 1.2 - i * 0.2));
        W.armor.add(plate(kite, 0.22, 0.06), m, i === 1 ? PAL.bronze : PAL.plateRed);
      }
      W.steel.add(spike(2.4, 0.4, { sides: 6, segs: 4, bend: sx * 0.4 }), frameY(v3(s.x + sx * 0.6, s.y + 1.4, s.z + 0.4), v3(sx * 0.7, 0.75, -0.3).normalize()));
      W.armor.add(gem(0.45), new THREE.Matrix4().makeTranslation(s.x + sx * 1.1, s.y + 0.9, s.z + 1.7), PAL.bronze);
      W.bulbs.add(v3(s.x + sx * 1.1, s.y + 0.9, s.z + 2.2), BULB.accent, 0, 0.16, 0.4);
    }
  }

  // ------------------------------------------------------------------ chest
  {
    const c = v3(4.8, 12.0, -14.4);
    const g = new THREE.SphereGeometry(1, radial, Math.round(radial * 0.7));
    scaleUv(g, 3, 2);
    g.scale(3.0, 3.5, 2.9);
    g.translate(c.x, c.y, c.z);
    W.lava.add(withFx(g, 1));
    // breast plates (curved bands)
    for (let i = 0; i < 4; i++) {
      const y = c.y + 2.2 - i * 1.35;
      const w = 2.6 - Math.abs(i - 1.2) * 0.35;
      const pts: V3[] = [];
      for (let j = 0; j <= 10; j++) {
        const a = -1.1 + (j / 10) * 2.2;
        pts.push(v3(c.x + Math.sin(a) * w, y - Math.cos(a) * 0.25, c.z + Math.cos(a) * 2.85 + 0.1));
      }
      W.armor.add(tube(pts, () => 0.5, { radial: 8, aspectN: 0.35, up: v3(0, 0, 1), capStart: true, capEnd: true }), null, i % 2 ? PAL.plateRed : PAL.bronze);
    }
    // bronze bosses with bulbs
    const boss = [v3(-1.6, 1.1, 2.3), v3(1.5, 0.6, 2.4), v3(-0.4, -0.6, 2.8), v3(1.9, -1.4, 2.0), v3(-1.9, -1.2, 2.1), v3(0.5, 2.2, 2.2)];
    for (const b of boss) {
      const p = c.clone().add(b);
      const n = v3(b.x * 0.4, b.y * 0.3, 1).normalize();
      W.armor.add(new THREE.CylinderGeometry(0.55, 0.62, 0.3, 16), frameY(p, n), PAL.bronze);
      W.bulbs.add(p.clone().addScaledVector(n, 0.3), BULB.warm, 0, 0.15, rnd());
    }
    // bronze gear ring (design bible: Ø 3 m at (+6.5, 13, -10), "round ribbed disc right of the head")
    const gm = frameY(v3(6.6, 12.9, -11.4), v3(0.15, 0.1, 1).normalize());
    const gr = ring(1.3, 0.16, 6, 36);
    gr.rotateX(Math.PI / 2);
    W.armor.add(gr, gm, PAL.bronze);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      W.armor.add(new THREE.BoxGeometry(0.3, 0.3, 0.3), gm.clone().multiply(new THREE.Matrix4().makeRotationY(a).multiply(new THREE.Matrix4().makeTranslation(1.5, 0, 0))), PAL.darkBronze);
      // ribs of the disc
      if (i % 2 === 0) W.armor.add(new THREE.BoxGeometry(1.2, 0.12, 0.16), gm.clone().multiply(new THREE.Matrix4().makeRotationY(a).multiply(new THREE.Matrix4().makeTranslation(0.62, 0, 0))), PAL.bronze);
    }
    W.armor.add(new THREE.CylinderGeometry(0.35, 0.4, 0.3, 12), gm, PAL.darkBronze);
    // chest emblem: a glowing double diamond outline (original design, not the festival logo)
    const em = basisZ(v3(0.12, 0.05, 1), v3(0, 1, 0), v3(4.5, 11.3, -11.35));
    for (const sc of [1, 0.62]) {
      const d = [v3(0, 1.0, 0), v3(0.7, 0, 0), v3(0, -1.0, 0), v3(-0.7, 0, 0), v3(0, 1.0, 0)].map((p) => p.multiplyScalar(sc).applyMatrix4(em));
      W.strips.add(d, 0, 0.12, 0, 0.42);
    }
  }

  // ivory tusks at the wing roots (design bible §5.7), curling down over the castle wall
  for (const sx of [-1, 1]) {
    for (const [dx, len] of [[0, 3.6], [1.3, 2.8]] as const) {
      const a = v3(sx * (7.6 + dx), 12.4 - dx * 0.4, -15.2 + dx * 0.3);
      const pts = spline([a, a.clone().add(v3(sx * 0.6, 0.8, 1.4)), a.clone().add(v3(sx * 1.1, -0.6, 2.6)), a.clone().add(v3(sx * 0.9, -len * 0.75, 2.8))], 12);
      const g = tube(pts, (t) => THREE.MathUtils.lerp(0.5, 0.03, Math.pow(t, 1.1)), { radial: segs(k, 10, 6), capStart: true });
      W.ivory.add(g, null, PAL.ivory);
    }
  }

  // ------------------------------------------------------------------ forelegs + talons
  const talonMat = PAL.talon;
  const talon = (base: V3, fwd: number, drop: number, x: number) => {
    // a thick hooked claw: up and over the parapet edge, then curling down and back in
    const pts = [
      base,
      v3(x, base.y + 0.55, base.z + fwd * 0.8),
      v3(x, base.y + 0.3, base.z + fwd * 1.7),
      v3(x, base.y - drop * 0.55, base.z + fwd * 2.0),
      v3(x, base.y - drop, base.z + fwd * 1.35),
    ];
    const s = spline(pts, 16);
    // flattened sideways (a claw is taller than wide) and tapering to a sharp tip
    W.steel.add(tube(s, (t) => THREE.MathUtils.lerp(0.62, 0.03, Math.pow(t, 1.1)), { radial: segs(k, 12, 7), capStart: true, aspectN: 0.62, up: v3(1, 0, 0) }), null, talonMat);
    // armoured knuckle cap
    W.armor.add(tube([base.clone().add(v3(0, -0.1, -0.5)), base.clone().add(v3(0, 0.25, 0.35))], (t) => 0.72 - t * 0.12, { radial: 6, capStart: true, capEnd: true }), null, PAL.plateRed);
  };
  {
    // right foreleg (viewer right): gold perforated mechanical arm, 3 glossy talons over the parapet
    // (design bible §5.6: X +8…+16, talons hooked over the wall top at Y 9.5, Z -12)
    const A0 = v3(7.4, 13.9, -16.2);
    const A1 = v3(13.9, 14.7, -14.8);
    const A2 = v3(12.5, 11.3, -13.4);
    const upper = bez2(A0, v3(10.8, 15.9, -15.8), A1, 12);
    const fore = bez2(A1, v3(14.2, 13.0, -13.6), A2, 10);
    W.armor.add(tube(upper, (t) => 1.15 - 0.25 * t, { radial, capStart: true, vScale: 3 }), null, PAL.bronze);
    W.armor.add(tube(fore, (t) => 0.95 - 0.2 * t, { radial, capEnd: true, vScale: 3 }), null, PAL.bronze);
    // piston rods (mechanical look) along the upper arm and forearm
    W.steel.add(tube([A0.clone().add(v3(0.2, -0.9, 0.9)), A1.clone().add(v3(-0.6, -0.8, 0.9))], () => 0.16, { radial: 8, capStart: true, capEnd: true }));
    W.steel.add(tube([A1.clone().add(v3(0.6, -0.4, 0.8)), A2.clone().add(v3(0.7, 0.3, 0.7))], () => 0.14, { radial: 8, capStart: true, capEnd: true }));
    // elbow joint: gear disc + gem
    const em = frameY(A1.clone().add(v3(0, 0, 0.9)), v3(0.1, 0.1, 1).normalize());
    const er = ring(0.95, 0.14, 6, 28);
    er.rotateX(Math.PI / 2);
    W.armor.add(er, em, PAL.darkBronze);
    W.armor.add(new THREE.CylinderGeometry(0.8, 0.85, 0.3, 18), em, PAL.bronze);
    W.armor.add(gem(0.5), new THREE.Matrix4().makeTranslation(A1.x, A1.y, A1.z + 1.25), PAL.plateRed);
    W.bulbs.add(v3(A1.x, A1.y, A1.z + 1.8), BULB.accent, 0, 0.14, 0.3);
    // perforated plates along the upper arm and forearm
    const perfPlate = (a: V3, b: V3, h: number, n: number) => {
      const d = v3().subVectors(b, a);
      const len = d.length();
      const outline: THREE.Vector2[] = [v2(0, 0)];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        outline.push(v2(t * len, h * (0.55 + 0.45 * Math.sin(t * Math.PI)) + 0.15 * Math.sin(t * Math.PI * 7)));
      }
      outline.push(v2(len, 0));
      const holes: THREE.Vector2[][] = [];
      for (let i = 0; i < n; i++) holes.push(circle(((i + 0.8) / (n + 0.6)) * len, h * 0.45, Math.min(0.28, h * 0.22), 10, true));
      const g = plate(outline, 0.14, 0.04, holes);
      const x = d.normalize();
      const m = new THREE.Matrix4().makeBasis(x, v3(0, 1, 0).addScaledVector(x, -x.y).normalize(), v3().crossVectors(x, v3(0, 1, 0).addScaledVector(x, -x.y).normalize()));
      m.setPosition(a);
      W.armor.add(g, m, PAL.bronze);
    };
    perfPlate(A0.clone().add(v3(0.3, 0.7, 0.6)), A1.clone().add(v3(-0.6, 0.8, 0.6)), 1.5, 5);
    perfPlate(A1.clone().add(v3(0.2, -0.6, 0.9)).setY(A2.y + 0.4), A1.clone().add(v3(0.8, 0.2, 0.9)), 1.0, 2);
    // perforated sickle plate on the upper arm
    const outline: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      outline.push(v2(t * 5.6, Math.sin(t * Math.PI) * 1.5 + t * 0.6));
    }
    for (let i = 14; i >= 0; i--) {
      const t = i / 14;
      outline.push(v2(t * 5.6 + 0.2, Math.sin(t * Math.PI) * 0.7 + t * 0.35));
    }
    const holes = [circle(1.4, 1.2, 0.22, 10, true), circle(2.4, 1.45, 0.24, 10, true), circle(3.4, 1.5, 0.24, 10, true), circle(4.4, 1.35, 0.2, 10, true)];
    const sickle = plate(outline, 0.16, 0.04, holes);
    const sm = basisZ(v3(0.25, 0.3, 1), v3(0.1, 1, 0), v3(5.8, 12.6, -10.4));
    sm.multiply(new THREE.Matrix4().makeRotationZ(0.05));
    W.steel.add(sickle, sm);
    // knuckle block
    W.armor.add(new THREE.BoxGeometry(3.4, 1.2, 1.6), new THREE.Matrix4().makeTranslation(A2.x, A2.y, A2.z + 0.2), PAL.bronze);
    for (const x of [-1.2, 0, 1.2]) talon(v3(A2.x + x, A2.y + 0.1, A2.z + 0.8), 1, 3.6 - Math.abs(x) * 0.4, A2.x + x);
    // left: red scaled knuckle "orb" left of the portal (design bible ASSUMPTION: Ø 3.5 m at (-10, 8.5, -9))
    const orb = new THREE.SphereGeometry(1.75, radial, Math.round(radial * 0.7));
    scaleUv(orb, 3, 2);
    orb.translate(-10, 8.5, -9);
    W.shell.add(orb, null, PAL.scaleRed);
    W.shell.add(tube(bez2(v3(-6.0, 12.6, -14.5), v3(-9.6, 12.4, -12.4), v3(-10, 9.6, -9.6), 10), (t) => 1.05 - 0.2 * t, { radial, capStart: true }), null, PAL.scaleRed);
    for (const [x, d] of [[-11.1, 2.3], [-10.0, 2.7], [-8.9, 2.3]] as const) talon(v3(x, 8.4, -7.6), 1, d, x);
  }

  // ------------------------------------------------------------------ rider
  const rider = buildRider(k);
  return { ...rider, neckTop: neck.at(0.3).add(v3(0, 3, 0)) };
}

function buildRider(k: Kit): { riderEyes: V3[]; riderTop: V3 } {
  const W = k.world;
  const R = W.rider;
  const radial = segs(k, 14, 8);
  const seat = v3(7.7, 17.7, -18.6);
  const RM = new THREE.Matrix4().compose(seat, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, -0.36, 0)), v3(1.55, 1.55, 1.55));
  const add = (g: THREE.BufferGeometry, m: THREE.Matrix4 | null, c: THREE.ColorRepresentation = PAL.riderDark) => R.add(g, m ? RM.clone().multiply(m) : RM, c);
  const T = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
  // saddle
  add(tube(bez2(v3(-0.9, 0.05, -0.9), v3(0, -0.35, 0), v3(0.9, 0.05, 0.9).setX(0).setZ(1.0), 8), () => 0.45, { radial: 10, aspectN: 0.4, up: v3(0, 1, 0), capStart: true, capEnd: true }), null, PAL.darkBronze);
  // pelvis
  add(new THREE.BoxGeometry(1.1, 0.6, 0.85), T(0, 0.35, 0));
  // legs straddling the neck
  for (const s of [-1, 1]) {
    const hip = v3(s * 0.45, 0.35, 0.05);
    const knee = v3(s * 1.45, -0.25, 0.85);
    const foot = v3(s * 1.55, -1.65, 0.55);
    add(tube([hip, knee], (t) => 0.34 - t * 0.06, { radial, capStart: true, capEnd: true }), null);
    add(tube([knee, foot], (t) => 0.27 - t * 0.05, { radial, capStart: true, capEnd: true }), null);
    add(gem(0.3), T(knee.x, knee.y + 0.05, knee.z + 0.15), PAL.bone);
    add(new THREE.BoxGeometry(0.4, 0.28, 0.75), T(foot.x, foot.y - 0.1, foot.z + 0.2));
  }
  // torso (loft of rounded rectangles)
  const rings: V3[][] = [];
  const prof = [
    [0.55, 0.52, 0.42],
    [0.95, 0.62, 0.48],
    [1.45, 0.78, 0.5],
    [1.95, 0.82, 0.48],
    [2.25, 0.5, 0.36],
  ];
  for (const [y, w, d] of prof) {
    const r: V3[] = [];
    for (let j = 0; j < 16; j++) {
      const a = (j / 16) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      r.push(v3(Math.sign(c) * Math.pow(Math.abs(c), 0.7) * w, y, Math.sign(s) * Math.pow(Math.abs(s), 0.7) * d + 0.05));
    }
    rings.push(r);
  }
  const torso = new THREE.BufferGeometry();
  {
    const pos: number[] = [];
    const idx: number[] = [];
    for (const r of rings) for (const p of r) pos.push(p.x, p.y, p.z);
    for (let i = 0; i < rings.length - 1; i++)
      for (let j = 0; j < 16; j++) {
        const a = i * 16 + j;
        const b = i * 16 + ((j + 1) % 16);
        idx.push(a, b, a + 16, b, b + 16, a + 16);
      }
    torso.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    torso.setIndex(idx);
    torso.computeVertexNormals();
  }
  add(torso, null);
  // breastplate ridge + belt
  add(tube([v3(-0.6, 1.0, 0.5), v3(0, 1.1, 0.6), v3(0.6, 1.0, 0.5)], () => 0.12, { radial: 6 }), null, PAL.darkBronze);
  add(tube(spline([v3(0, 1.3, 0.62), v3(0, 1.8, 0.6), v3(0, 2.1, 0.45)], 6), () => 0.1, { radial: 6 }), null, PAL.bone);
  // ribs (skeletal)
  for (let i = 0; i < 4; i++) {
    const y = 1.35 + i * 0.18;
    add(tube(bez2(v3(-0.55, y, 0.45), v3(0, y - 0.12, 0.72), v3(0.55, y, 0.45), 6), () => 0.05, { radial: 5 }), null, PAL.bone);
  }
  // pauldrons with spikes
  for (const s of [-1, 1]) {
    const p = v3(s * 0.92, 2.1, 0.02);
    // layered lames (open half-cylinders stepping down the upper arm)
    for (let i = 0; i < 3; i++) {
      const r = 0.62 - i * 0.07;
      const lame = new THREE.CylinderGeometry(r, r, 0.42, 10, 1, true, 0, Math.PI);
      lame.rotateZ(Math.PI / 2);
      lame.rotateX(-Math.PI / 2);
      const m = new THREE.Matrix4().makeRotationZ(-s * (0.35 + i * 0.25)).setPosition(p.x + s * i * 0.22, p.y - i * 0.24, p.z);
      add(lame, m, i === 1 ? PAL.darkBronze : PAL.riderDark);
    }
    for (let i = 0; i < 3; i++) {
      const d = v3(s * (0.8 - i * 0.2), 0.6 + i * 0.25, -0.1 + i * 0.1).normalize();
      add(spike(0.7 - i * 0.12, 0.12, { sides: 5, segs: 2 }), frameY(p.clone().addScaledVector(d, 0.45), d), PAL.bone);
    }
    // arms
    const sh = v3(s * 0.95, 1.95, 0.0);
    const el = v3(s * 1.1, 1.2, 0.55);
    const ha = v3(s * 0.42, 1.05, 1.2);
    add(tube([sh, el], () => 0.2, { radial: 8, capEnd: true }), null);
    add(tube([el, ha], () => 0.17, { radial: 8, capEnd: true }), null);
    add(gem(0.22), T(ha.x, ha.y, ha.z), PAL.bone);
  }
  // sword pommel / reins horn held in front
  add(tube([v3(0, 0.6, 1.3), v3(0, 1.6, 1.35)], (t) => 0.08 + 0.04 * t, { radial: 6, capEnd: true }), null, PAL.darkBronze);
  add(new THREE.BoxGeometry(1.1, 0.1, 0.14), T(0, 1.1, 1.33), PAL.darkBronze);
  // head: skull + hood
  const headC = v3(0, 2.72, 0.12);
  const skull = new THREE.SphereGeometry(0.37, 14, 10);
  skull.scale(0.85, 1.0, 0.95);
  add(skull, T(headC.x, headC.y, headC.z), PAL.bone);
  const jaw = new THREE.BoxGeometry(0.4, 0.22, 0.3);
  add(jaw, T(0, 2.42, 0.18), PAL.bone);
  // hood: rotated half cone with a peak
  const hood = surface(18, 8, (u, v, o) => {
    const a = -Math.PI * 0.82 + u * Math.PI * 1.64; // open at the front
    const h = v;
    const r = 0.62 * (1 - Math.pow(h, 1.4)) + 0.03;
    o.set(Math.sin(a) * r, 2.3 + h * 1.25, -Math.cos(a) * r * 0.95 + 0.05 - h * 0.25);
  });
  add(hood, null, PAL.riderDark);
  // cape draping down the back
  const cape = surface(10, 10, (u, v, o) => {
    const x = (u - 0.5) * (1.9 + v * 1.6);
    o.set(x, 2.25 - v * 3.3, -0.35 - v * 1.5 + Math.sin(u * Math.PI * 5) * 0.12 * v);
  });
  add(cape, null, 0x2a2224);
  const eyes = [v3(-0.13, 2.76, 0.43).applyMatrix4(RM), v3(0.13, 2.76, 0.43).applyMatrix4(RM)];
  for (const e of eyes) W.bulbs.add(e, BULB.rider, 0, 0.07, 0.5);
  const top = v3(0, 3.55, -0.2).applyMatrix4(RM);
  return { riderEyes: eyes, riderTop: top };
}
