import * as THREE from 'three';
import { Polyline, basisZ, bez2, circle, frameY, gem, plate, ring, scaleUv, sickleOutline, spike, spline, tube, v2, v3, withFx, type V3 } from './geom';
import { wingLayout } from './layout';
import { PAL, segs, type Kit } from './kit';
import { BULB } from './shading';

/**
 * Neck / back (leopard hide, dorsal leaf plates, scimitar blades), body mass, shoulder yoke (wing
 * roots), chest, the mechanical underbody (vertebra discs, copper bars) and the seated rider.
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
  // the back arches up behind the crown to the rider's seat (photos: the rider sits high, level
  // with the horn tips), then falls away to the right behind the wing
  const neckCtrl = [n0, v3(3.6, 17.9, -17.2), v3(6.6, 17.5, -18.4), v3(9.8, 14.6, -20.2), v3(12.4, 11.0, -22.4)];
  const neckPts = spline(neckCtrl, segs(k, 40, 18));
  const neck = new Polyline(neckPts);
  const neckR = (t: number) => THREE.MathUtils.lerp(2.75, 3.3, t) * (1 + 0.04 * Math.sin(t * 40));
  // leopard / giraffe-patterned hide (daytime photos): ~1 m cells all round the tube
  W.lava.add(withFx(scaleUv(tube(neckPts, neckR, { radial, vScale: 10 }), 2, 1), 1));
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
  }
  // dorsal plates: a crest of big leaf-shaped plates (cream-orange with dark veins) along the back,
  // from the skull to beyond the rider (skipping his seat)
  {
    const leaf = leafPlate();
    const rib = plate([v2(-0.08, 0.15), v2(0.08, 0.15), v2(0.025, 3.0), v2(-0.025, 3.0)], 0.14, 0);
    const nL = segs(k, 13, 7);
    for (let i = 0; i < nL; i++) {
      const t = 0.02 + (i / (nL - 1)) * 0.9;
      if (t > 0.27 && t < 0.46) continue;
      const p = neck.at(t);
      const d = neck.tangent(t);
      const side = v3().crossVectors(d, v3(0, 1, 0)).normalize();
      const up = v3(0, 1, 0).addScaledVector(d, -0.55).normalize();
      const base = p.clone().addScaledVector(v3(0, 1, 0), neckR(t) * 0.82);
      const sc = 0.85 + 0.35 * Math.sin(Math.PI * Math.min(1, t * 1.25)) + (rnd() - 0.5) * 0.12;
      // plate in the plane of the spine (normal = sideways), tipped back, fanned slightly
      for (const [off, roll] of [
        [-0.35, -0.22],
        [0.35, 0.22],
      ] as const) {
        const m = basisZ(side.clone().applyAxisAngle(up, roll), up, base.clone().addScaledVector(side, off).addScaledVector(d, off * 0.6));
        m.scale(v3(sc, sc * 1.1, 1));
        W.ivory.add(leaf.clone(), m);
        W.ivory.add(rib.clone(), m, '#3e3a1c');
      }
    }
    leaf.dispose();
    rib.dispose();
  }
  // silver scimitar blades standing out along the front / lower flank of the coil
  {
    const blade = plate(sickleOutline(2.4, 0.7, 0.9, 7), 0.12, 0.03, [circle(0.05, 0.6, 0.13, 6, true)]);
    const nB = segs(k, 11, 6);
    for (let i = 0; i < nB; i++) {
      const t = 0.08 + (i / (nB - 1)) * 0.74;
      const p = neck.at(t);
      const d = neck.tangent(t);
      const side = v3().crossVectors(d, v3(0, 1, 0)).normalize();
      if (side.z < 0) side.negate();
      const out = side.clone().multiplyScalar(0.8).add(v3(0, -0.6, 0)).normalize();
      const m = basisZ(d, out, p.clone().addScaledVector(out, neckR(t) * 0.92));
      W.steel.add(blade.clone(), m, 0xdfe2e8);
    }
    blade.dispose();
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
    W.armor.add(gr, gm, 0x6a6e74);
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
    // (daytime photos: big silver-white horns hanging down either side of the head, X ~±10, to Y ~6)
    for (const [dx, len] of [[0, 5.2], [1.5, 3.9]] as const) {
      const a = v3(sx * (8.2 + dx), 12.6 - dx * 0.4, -14.8 + dx * 0.3);
      const pts = spline([a, a.clone().add(v3(sx * 0.8, 1.0, 1.5)), a.clone().add(v3(sx * 1.5, -0.7, 2.8)), a.clone().add(v3(sx * 1.2, -len * 0.8, 3.0))], 14);
      const g = tube(pts, (t) => THREE.MathUtils.lerp(0.72, 0.04, Math.pow(t, 1.1)), { radial: segs(k, 12, 6), capStart: true });
      W.steel.add(g, null, 0xe6e8ec);
    }
  }

  // ------------------------------------------------------------------ mechanical underbody
  // (daytime photos: under the coil right of the head a column of dark grey steel vertebra discs,
  // a rack of long copper bars running right towards the wing, and flame-crack printed panels
  // behind them. The bible's "gold perforated foreleg with talons" is not in any daytime photo: the
  // gold element under the chin is the scaled vault roof in front of the portal - removed.)
  {
    const disc = new THREE.SphereGeometry(1, radial, Math.round(radial * 0.6));
    disc.scale(1, 0.55, 1);
    const spine = spline([v3(7.4, 13.4, -12.6), v3(8.4, 11.6, -12.4), v3(8.9, 9.8, -12.8), v3(9.0, 8.2, -13.4)], 7);
    for (let i = 0; i < spine.length; i++) {
      const t = i / (spine.length - 1);
      const r = THREE.MathUtils.lerp(1.25, 0.8, t);
      const d = spine[Math.min(spine.length - 1, i + 1)].clone().sub(spine[Math.max(0, i - 1)]).normalize();
      W.armor.add(disc.clone(), frameY(spine[i], d, 0, 1).multiply(new THREE.Matrix4().makeScale(r, r, r)), i % 2 ? 0x55585e : 0x6a6e74);
      if (i % 2 === 0) W.armor.add(ring(r * 1.02, 0.08, 4, 20).rotateX(Math.PI / 2), frameY(spine[i], d), PAL.darkBronze);
    }
    disc.dispose();
    // copper bars (the ribs of the machine), fanning right and slightly back
    for (let i = 0; i < 5; i++) {
      const y = 12.4 - i * 1.15;
      const a0 = v3(6.0 + i * 0.25, y, -13.6 - i * 0.1);
      const a1 = v3(14.6 - i * 0.3, y - 0.9 - i * 0.2, -16.2 + i * 0.2);
      W.copper.add(tube([a0, a0.clone().lerp(a1, 0.5).add(v3(0, 0.25, 0)), a1], () => 0.26, { radial: 8, capStart: true, capEnd: true }), null, i % 2 ? PAL.copper : PAL.copperDeep);
      W.armor.add(tube([a1.clone().add(v3(-0.25, 0, 0)), a1.clone().add(v3(0.25, 0, 0))], () => 0.36, { radial: 8, capStart: true, capEnd: true }), null, PAL.darkBronze);
    }
    // flame-crack printed panels behind the bars (lava hide: glows with the inner fire)
    const pg = new THREE.PlaneGeometry(8.4, 6.6, 1, 1);
    scaleUv(pg, 1.1, 0.9);
    W.lava.add(withFx(pg, 1), new THREE.Matrix4().makeRotationY(-0.28).setPosition(10.6, 10.0, -17.4));
    // a dark gear + blade cluster at the right end (the "machine" joint in the photos)
    const gm = frameY(v3(15.2, 10.8, -17.0), v3(0.25, 0.1, 1).normalize());
    W.armor.add(ring(1.2, 0.2, 6, 28).rotateX(Math.PI / 2), gm, 0x4a4c50);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      W.armor.add(new THREE.BoxGeometry(0.36, 0.3, 0.3), gm.clone().multiply(new THREE.Matrix4().makeRotationY(a).multiply(new THREE.Matrix4().makeTranslation(1.42, 0, 0))), 0x3a3c40);
    }
  }

  // ------------------------------------------------------------------ rider
  const rider = buildRider(k);
  return { ...rider, neckTop: neck.at(0.3).add(v3(0, 3, 0)) };
}

function buildRider(k: Kit): { riderEyes: V3[]; riderTop: V3 } {
  const W = k.world;
  const R = W.rider;
  const radial = segs(k, 14, 8);
  const rnd = k.rnd;
  // photos (axis telephoto, thumbnail, photo P): the rider sits on the neck just right of the head's
  // crown (X ~+4..+6), top ~Y 24 - closer in than the bible's +6.5..+7.7
  const seat = v3(5.6, 20.45, -18.0);
  const RM = new THREE.Matrix4().compose(seat, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, -0.36, 0)), v3(1.7, 1.7, 1.7));
  const add = (g: THREE.BufferGeometry, m: THREE.Matrix4 | null, c: THREE.ColorRepresentation = PAL.riderDark) => R.add(g, m ? RM.clone().multiply(m) : RM, c);
  /** clean printed colours (cloth, skin, shield face): the untextured ivory material */
  const paint = (g: THREE.BufferGeometry, m: THREE.Matrix4 | null, c: THREE.ColorRepresentation) => W.ivory.add(g, m ? RM.clone().multiply(m) : RM, c);
  const T = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
  // saddle
  add(tube(bez2(v3(-0.9, 0.05, -0.9), v3(0, -0.35, 0), v3(0.9, 0.05, 0.9).setX(0).setZ(1.0), 8), () => 0.45, { radial: 10, aspectN: 0.4, up: v3(0, 1, 0), capStart: true, capEnd: true }), null, PAL.darkBronze);
  // pelvis
  add(new THREE.BoxGeometry(1.1, 0.6, 0.85), T(0, 0.35, 0));
  // legs straddling the neck (armoured greaves, dark boots)
  for (const s of [-1, 1]) {
    const hip = v3(s * 0.45, 0.35, 0.05);
    const knee = v3(s * 1.45, -0.25, 0.85);
    const foot = v3(s * 1.55, -1.65, 0.55);
    add(tube([hip, knee], (t) => 0.34 - t * 0.06, { radial, capStart: true, capEnd: true }), null);
    add(tube([knee, foot], (t) => 0.27 - t * 0.05, { radial, capStart: true, capEnd: true }), null);
    add(gem(0.3), T(knee.x, knee.y + 0.05, knee.z + 0.15), PAL.steel);
    add(new THREE.BoxGeometry(0.4, 0.28, 0.75), T(foot.x, foot.y - 0.1, foot.z + 0.2), 0x1c1c1e);
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
  // red tabard over the armour with a white hem, and a white sash across the chest
  paint(plate([v2(-0.46, 0), v2(0.46, 0), v2(0.4, 1.35), v2(-0.4, 1.35)], 0.06, 0.01), T(0, 0.55, 0.56), '#a3161a');
  paint(plate([v2(-0.47, 0), v2(0.47, 0), v2(0.47, 0.14), v2(-0.47, 0.14)], 0.07, 0), T(0, 0.52, 0.58), '#ece6dc');
  paint(tube([v3(-0.7, 2.05, 0.3), v3(-0.1, 1.55, 0.62), v3(0.55, 0.95, 0.52)], () => 0.1, { radial: 6, up: v3(0, 0, 1), aspectN: 0.35 }), null, '#ece6dc');
  // cloth flap hanging over the saddle between the legs
  paint(plate([v2(-0.32, 0), v2(0.32, 0), v2(0.22, -1.1), v2(0, -1.25), v2(-0.22, -1.1)], 0.05, 0.01), T(0, 0.45, 0.62).multiply(new THREE.Matrix4().makeRotationX(-0.35)), '#a3161a');
  // belt + breastplate ridge
  add(tube([v3(-0.62, 0.62, 0.45), v3(0, 0.66, 0.6), v3(0.62, 0.62, 0.45)], () => 0.09, { radial: 6 }), null, 0x2a2420);
  add(tube([v3(-0.6, 1.62, 0.52), v3(0, 1.74, 0.6), v3(0.6, 1.62, 0.52)], () => 0.08, { radial: 6 }), null, PAL.steel);
  // pauldrons: layered lames with steel spikes
  for (const s of [-1, 1]) {
    const p = v3(s * 0.92, 2.1, 0.02);
    for (let i = 0; i < 3; i++) {
      const r = 0.62 - i * 0.07;
      const lame = new THREE.CylinderGeometry(r, r, 0.42, 10, 1, true, 0, Math.PI);
      lame.rotateZ(Math.PI / 2);
      lame.rotateX(-Math.PI / 2);
      const m = new THREE.Matrix4().makeRotationZ(-s * (0.35 + i * 0.25)).setPosition(p.x + s * i * 0.22, p.y - i * 0.24, p.z);
      add(lame, m, i === 1 ? 0x2c2e32 : PAL.riderDark);
    }
    for (let i = 0; i < 2; i++) {
      const d = v3(s * (0.8 - i * 0.25), 0.6 + i * 0.3, -0.1 + i * 0.1).normalize();
      add(spike(0.55 - i * 0.12, 0.1, { sides: 5, segs: 2 }), frameY(p.clone().addScaledVector(d, 0.45), d), PAL.steel);
    }
  }
  // right arm (viewer's left): forearm forward, gripping a short blade
  {
    const sh = v3(-0.95, 1.95, 0.0);
    const el = v3(-1.15, 1.25, 0.5);
    const ha = v3(-0.8, 1.15, 1.15);
    add(tube([sh, el], () => 0.2, { radial: 8, capEnd: true }), null);
    add(tube([el, ha], () => 0.17, { radial: 8, capEnd: true }), null);
    add(gem(0.2), T(ha.x, ha.y, ha.z), 0x2a2420);
    add(plate([v2(-0.07, 0), v2(0.07, 0), v2(0.05, 1.3), v2(0, 1.5), v2(-0.05, 1.3)], 0.04, 0.01), T(ha.x, ha.y + 0.05, ha.z).multiply(new THREE.Matrix4().makeRotationX(0.25)), PAL.steel);
  }
  // left arm (viewer's right) carrying the round red sun shield
  const shieldC = v3(1.42, 1.55, 0.55);
  {
    const sh = v3(0.95, 1.95, 0.0);
    const el = v3(1.25, 1.3, 0.35);
    add(tube([sh, el], () => 0.2, { radial: 8, capEnd: true }), null);
    add(tube([el, shieldC.clone().add(v3(-0.25, 0, -0.1))], () => 0.17, { radial: 8, capEnd: true }), null);
    const sn = v3(0.55, 0.05, 0.84).normalize();
    const sm = basisZ(sn, v3(0, 1, 0), shieldC);
    const disc = new THREE.CylinderGeometry(1.0, 1.0, 0.1, 36);
    disc.rotateX(Math.PI / 2);
    paint(disc, sm, '#9e1c16');
    // printed sun: orange rays + a gold boss
    const rays: THREE.Vector2[] = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const r = i % 2 ? 0.34 : 0.86;
      rays.push(v2(Math.cos(a) * r, Math.sin(a) * r));
    }
    const rg = new THREE.ShapeGeometry(new THREE.Shape(rays));
    paint(rg, sm.clone().multiply(T(0, 0, 0.06)), '#e0561e');
    const boss = new THREE.SphereGeometry(0.26, 12, 8);
    boss.scale(1, 1, 0.5);
    add(boss, sm.clone().multiply(T(0, 0, 0.07)), 0xc8962e);
    add(ring(1.0, 0.06, 4, 36), sm, 0xd0d2d6);
    // white spiky rim
    const sp = plate([v2(-0.06, 0), v2(0.06, 0), v2(0, 0.24)], 0.05, 0);
    for (let i = 0; i < 20; i++) {
      const g = sp.clone();
      g.translate(0, 1.02, 0);
      g.rotateZ((i / 20) * Math.PI * 2);
      add(g, sm, 0xe8eaee);
    }
    sp.dispose();
  }
  // head: dark skin, red face wrap, long black dreadlocks
  const headC = v3(0, 2.72, 0.12);
  const head = new THREE.SphereGeometry(0.36, 14, 10);
  head.scale(0.85, 1.0, 0.95);
  paint(head, T(headC.x, headC.y, headC.z), '#3a2519');
  paint(new THREE.TorusGeometry(0.3, 0.07, 5, 16, Math.PI * 1.1).rotateX(Math.PI / 2).rotateY(Math.PI * 0.95), T(headC.x, headC.y - 0.08, headC.z + 0.02), '#a3161a');
  add(new THREE.BoxGeometry(0.5, 0.2, 0.34), T(0, 2.3, 0.1), 0x2a2420);
  const nLocks = Math.max(10, Math.round(26 * (0.5 + 0.5 * k.detail)));
  for (let i = 0; i < nLocks; i++) {
    const a = -Math.PI * 0.85 + (i / (nLocks - 1)) * Math.PI * 1.7; // around the back of the head
    const start = headC.clone().add(v3(Math.sin(a) * 0.3, 0.22 - Math.abs(Math.cos(a)) * 0.05, -Math.cos(a) * 0.3));
    const out = v3(Math.sin(a), 0, -Math.cos(a));
    const len = 1.3 + rnd() * 0.8;
    const pts = [
      start,
      start.clone().addScaledVector(out, 0.22).add(v3(0, -0.15, 0)),
      start.clone().addScaledVector(out, 0.32).add(v3(0, -len * 0.5, 0)),
      start.clone().addScaledVector(out, 0.36 + rnd() * 0.12).add(v3((rnd() - 0.5) * 0.12, -len, 0.05)),
    ];
    add(tube(spline(pts, 6), (t) => 0.055 - t * 0.02, { radial: 4, capEnd: true }), null, 0x121012);
  }
  const eyes = [v3(-0.12, 2.76, 0.42).applyMatrix4(RM), v3(0.12, 2.76, 0.42).applyMatrix4(RM)];
  for (const e of eyes) W.bulbs.add(e, BULB.rider, 0, 0.07, 0.5);
  const top = v3(0, 3.1, 0.1).applyMatrix4(RM);
  return { riderEyes: eyes, riderTop: top };
}

/**
 * Dorsal leaf plate (local XY, base at the origin, tip at +Y 3.3): a serrated, pointed leaf with a
 * vertex-colour print - brown root, orange body, cream tip and a dark green-brown midrib + veins.
 */
function leafPlate(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 9;
  const hw = (t: number) => 1.05 * Math.sin(Math.PI * Math.min(1, 0.18 + t * 0.95)) * (1 - 0.35 * t);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const w = hw(t) * (i % 2 ? 0.86 : 1);
    pts.push(v2(w, t * 3.3));
  }
  for (let i = n - 1; i >= 0; i--) {
    const t = i / n;
    const w = hw(t) * (i % 2 ? 0.86 : 1);
    pts.push(v2(-w, t * 3.3));
  }
  const g = plate(pts, 0.1, 0.02);
  const p = g.getAttribute('position');
  const col = new Float32Array(p.count * 3);
  const root = new THREE.Color('#6e3a16');
  const body = new THREE.Color('#d98c3c');
  const tip = new THREE.Color('#f1d6a0');
  const vein = new THREE.Color('#4a4a22');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp(p.getY(i) / 3.3, 0, 1);
    const e = Math.min(1, Math.abs(p.getX(i)) / Math.max(0.15, hw(t)));
    c.copy(root).lerp(body, Math.min(1, t * 2.2)).lerp(tip, Math.max(0, t - 0.45) * 1.6);
    // dark midrib and a hint of the vein fan near the centre line
    c.lerp(vein, Math.pow(1 - e, 6) * 0.75 + (1 - e) * 0.12);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
