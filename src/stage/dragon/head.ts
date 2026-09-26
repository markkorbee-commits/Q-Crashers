import * as THREE from 'three';
import { Polyline, basisZ, frameY, gradientY, plate, ring, spike, surface, tube, v2, v3, type V3 } from './geom';
import { HEAD } from './layout';
import { PAL, segs, type Kit } from './kit';
import { BULB } from './shading';

/**
 * The dragon head. Built in head-local space H (origin = jaw hinge, +Z = snout direction,
 * +Y = up, jaw closed) and baked into world space through Kit.HM; lower-jaw parts stay in
 * jaw-local space (children of the articulated jaw pivot).
 *
 *  - upper skull: a "dome over a U-shaped rim" surface (rim = gum line + cheeks), brow ridges,
 *    LED-outlined triangular armour plates, cheek plates with horns, hinge gear discs
 *  - crest: 11 brushed-steel cones fanned like a frill (biggest sweep back-left), a second row of
 *    small cones and jagged frill blades, a serrated saw plate along the skull top
 *  - eyes: bronze ring + glowing eyeball + a 7-LED dot cluster
 *  - mouth: palate with bulb rows, gum rims, ~50 ivory->orange teeth, glowing throat,
 *    lower jaw trough with tongue, bulbs and a saw-toothed outer edge + a steel tusk
 */

// --- profiles (head-local) ---------------------------------------------------------------------
const PZ = [-5.6, -4, -2, -0.5, 1.2, 3.0, 4.6, 5.6];
const PW = [4.1, 4.4, 4.3, 3.8, 3.0, 2.3, 1.7, 1.35];
const PRIM = [-2.0, -1.7, -1.1, -0.3, 0.2, 0.5, 0.7, 0.8];
const PTOP = [3.4, 4.1, 4.4, 4.1, 3.3, 2.6, 2.25, 2.05];
const ARC_Z = 5.6;

function interp(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  let i = 1;
  while (xs[i] < x) i++;
  const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  const s = t * t * (3 - 2 * t);
  return ys[i - 1] + (ys[i] - ys[i - 1]) * (0.35 * t + 0.65 * s);
}
const gauss = (x: number) => Math.exp(-x * x);
/** the spiky orange-bronze crest plates between the horns (daytime photos) */
const CREST_ORANGE = new THREE.Color('#c0682c');

interface RimPt {
  p: V3;
  /** midline convergence z */
  cz: number;
  side: number;
  /** arc length along the rim (m) */
  s: number;
}

/** U-shaped rim: right side back->front, snout arc, left side front->back. */
function makeRim(n: number, zBack: number, widthOff: number, yOff: number, arcZ: number, tipBoost = 0): RimPt[] {
  const out: RimPt[] = [];
  const nSide = Math.round(n * 0.36);
  const nArc = n - nSide * 2;
  const push = (x: number, y: number, z: number, cz: number, side: number) => {
    const p = v3(x, y, z);
    const s = out.length ? out[out.length - 1].s + p.distanceTo(out[out.length - 1].p) : 0;
    out.push({ p, cz, side, s });
  };
  for (let i = 0; i < nSide; i++) {
    const z = zBack + ((arcZ - zBack) * i) / nSide;
    push(interp(PZ, PW, z) + widthOff, interp(PZ, PRIM, z) + yOff, z, z, 1);
  }
  const wA = interp(PZ, PW, arcZ) + widthOff;
  const yA = interp(PZ, PRIM, arcZ) + yOff;
  for (let i = 0; i <= nArc; i++) {
    const t = (i / nArc) * Math.PI;
    push(Math.cos(t) * wA, yA + (0.2 + tipBoost) * Math.sin(t), arcZ + Math.sin(t) * (wA * 1.45 + 0.05), arcZ, Math.cos(t) >= 0 ? 1 : -1);
  }
  for (let i = nSide - 1; i >= 0; i--) {
    const z = zBack + ((arcZ - zBack) * i) / nSide;
    push(-(interp(PZ, PW, z) + widthOff), interp(PZ, PRIM, z) + yOff, z, z, -1);
  }
  return out;
}

/** Upper skull point for rim point r at height fraction psi (0 rim .. 1 midline top). */
function skullPoint(r: RimPt, psi: number, out: V3): V3 {
  const a = psi * Math.PI * 0.5;
  const hF = Math.pow(Math.cos(a), 0.5);
  const vF = Math.pow(Math.sin(a), 0.62);
  const top = interp(PZ, PTOP, r.cz);
  let x = r.p.x * hF;
  const z = r.cz + (r.p.z - r.cz) * hF;
  let y = r.p.y + (top - r.p.y) * vF;
  // cheek puff at the back
  x *= 1 + 0.08 * gauss((psi - 0.22) / 0.2) * THREE.MathUtils.smoothstep(-r.cz, 1.5, 5);
  // heavy brow ridge above the eye, jutting out sideways
  const brow = gauss((psi - 0.56) / 0.1) * gauss((r.cz - 1.4) / 1.25) * (r.cz < ARC_Z ? 1 : 0.3);
  y += 0.85 * brow;
  x *= 1 + 0.1 * brow;
  // eye socket
  y -= 0.2 * gauss((psi - 0.4) / 0.07) * gauss((r.cz - 1.9) / 0.6);
  // twin snout ridges + nose keel
  const snout = THREE.MathUtils.smoothstep(r.cz, 1.5, 4.5);
  y += 0.3 * gauss((psi - 0.78) / 0.07) * snout;
  y += 0.2 * THREE.MathUtils.smoothstep(psi, 0.85, 1.0) * THREE.MathUtils.smoothstep(r.cz, -1, 2);
  return out.set(x, y, z);
}

/** Lower jaw outer shell point (jaw-local), psi 0 rim .. 1 bottom keel. */
const JZ = [-1.3, 1.0, 3.0, 5.2];
const JD = [2.35, 2.05, 1.7, 1.3];
function jawPoint(r: RimPt, psi: number, out: V3): V3 {
  const a = psi * Math.PI * 0.5;
  const hF = Math.pow(Math.cos(a), 0.7);
  const vF = Math.pow(Math.sin(a), 0.8);
  const d = interp(JZ, JD, r.cz);
  const x = r.p.x * hF;
  const z = r.cz + (r.p.z - r.cz) * hF;
  const y = r.p.y - d * vF - 0.2 * gauss((psi - 0.3) / 0.12);
  return out.set(x, y, z);
}

export interface HeadResult {
  /** head-local anchor points */
  mouthH: V3;
  eyesH: [V3, V3];
  headH: V3;
  /** world crest spike tips */
  crestTips: V3[];
  /** eyeball geometry in world space (emissive material) */
  eyeballs: THREE.BufferGeometry;
  /** throat glow disc (jaw-independent, head-local baked to world) */
  throat: THREE.BufferGeometry;
}

export function buildHead(k: Kit): HeadResult {
  const HM = k.HM;
  const W = k.world;
  const J = k.jaw;
  const nRim = segs(k, 84, 40);
  const nPsi = segs(k, 16, 9);
  const rnd = k.rnd;

  // ------------------------------------------------------------------ upper skull shell
  const rim = makeRim(nRim, -5.6, 0, 0, ARC_Z);
  const skull = surface(rim.length - 1, nPsi, (u, v, o) => {
    const r = rim[Math.round(u * (rim.length - 1))];
    skullPoint(r, v, o);
  }, [rim[rim.length - 1].s / 3.4, 1.9]);
  W.shell.add(skull, HM, PAL.scaleRed);

  // cheek underside skirt (closes the shell below the rim behind the mouth)
  const back = rim.filter((r) => r.cz < -0.6);
  for (const side of [1, -1]) {
    const pts = back.filter((r) => r.side === side).sort((a, b) => a.cz - b.cz);
    if (pts.length < 2) continue;
    const g = surface(pts.length - 1, 3, (u, v, o) => {
      const r = pts[Math.round(u * (pts.length - 1))];
      o.copy(r.p);
      o.x *= 1 - 0.25 * v;
      o.y -= 0.4 * v;
    });
    if (side > 0) flipWinding(g);
    W.shell.add(g, HM, PAL.scaleDeep);
  }

  // back cap of the skull (hidden by the neck, closes the silhouette from above)
  {
    const cap = surface(24, 6, (u, v, o) => {
      const psi = Math.abs(u - 0.5) * 2;
      const side = u < 0.5 ? 1 : -1;
      const rr: RimPt = { p: v3(side * interp(PZ, PW, -5.6), interp(PZ, PRIM, -5.6), -5.6), cz: -5.6, side, s: 0 };
      skullPoint(rr, 1 - psi, o);
      o.lerp(v3(0, 0.4, -6.6), v * 0.85);
    });
    W.shell.add(cap, HM, PAL.scaleDeep);
  }

  // ------------------------------------------------------------------ palate + upper gum
  const mouthRim = rim.filter((r) => r.cz > -0.9);
  const palate = surface(mouthRim.length - 1, 6, (u, v, o) => {
    const r = mouthRim[Math.round(u * (mouthRim.length - 1))];
    const inner = v3(r.p.x * 0.9, r.p.y - 0.05, r.cz + (r.p.z - r.cz) * 0.9);
    const mid = v3(0, r.p.y + 0.95 + 0.25 * Math.sin(r.cz * 3.2), r.cz);
    o.lerpVectors(inner, mid, v);
    o.y += Math.sin(v * Math.PI) * 0.35;
  }, [4, 1]);
  flipWinding(palate);
  palate.computeVertexNormals();
  W.flesh.add(palate, HM, PAL.palate);
  // gum rim tube
  const gumPts = mouthRim.map((r) => v3(r.p.x * 0.96, r.p.y - 0.05, r.cz + (r.p.z - r.cz) * 0.96));
  W.flesh.add(tube(gumPts, () => 0.2, { radial: segs(k, 8, 5) }), HM, PAL.gum);
  // armoured lip plate along the upper jaw edge (angular, dark red)
  {
    const lipPts = rim.filter((r) => r.cz > -1.5).map((r) => v3(r.p.x * 1.0, r.p.y + 0.05, r.cz + (r.p.z - r.cz) * 1.0));
    W.armor.add(tube(lipPts, () => 0.34, { radial: 4, shape: (a) => (Math.abs(Math.sin(a)) > 0.7 ? 1.2 : 0.85), up: v3(0, 1, 0) }), HM, PAL.plateRed);
  }

  // ------------------------------------------------------------------ throat glow disc
  const throat = new THREE.CircleGeometry(1, 28);
  throat.scale(3.3, 2.5, 1);
  throat.translate(0, -1.2, -1.0);
  throat.applyMatrix4(HM);

  // ------------------------------------------------------------------ upper teeth
  const rimLine = new Polyline(mouthRim.map((r) => r.p));
  const upperTeeth: { t: number; len: number; r: number }[] = [];
  // 9 big front fangs across the snout arc, canines biggest
  const bigT = [0.24, 0.3, 0.37, 0.44, 0.5, 0.56, 0.63, 0.7, 0.76];
  const bigL = [2.8, 1.9, 2.2, 1.7, 2.0, 1.7, 2.2, 1.9, 2.8];
  bigT.forEach((t, i) => upperTeeth.push({ t, len: bigL[i], r: 0.36 }));
  for (let i = 0; i < 6; i++) {
    const t = 0.04 + i * 0.03;
    upperTeeth.push({ t, len: 0.9 + rnd() * 0.5, r: 0.22 });
    upperTeeth.push({ t: 1 - t, len: 0.9 + rnd() * 0.5, r: 0.22 });
  }
  const toothSides = segs(k, 9, 5);
  for (const th of upperTeeth) {
    const p = rimLine.at(th.t);
    const tan = rimLine.tangent(th.t);
    const inward = v3(-p.x, 0, ARC_Z - p.z).normalize();
    const dir = v3(0, -1, 0).addScaledVector(inward, 0.12).addScaledVector(v3(0, 0, -1), 0.12).normalize();
    const g = spike(th.len, th.r, { sides: toothSides, segs: 5, bend: -th.len * 0.18, tipR: 0.015 });
    gradientY(g, 0, th.len, PAL.toothRoot, PAL.ivory, 0.6);
    const m = frameY(p.clone().addScaledVector(inward, 0.1).setY(p.y + 0.1), dir, 0, 1, tan.clone().cross(dir));
    W.ivory.add(g, HM.clone().multiply(m));
  }

  // ------------------------------------------------------------------ eyes
  const eyesH: V3[] = [];
  const eyeballs: THREE.BufferGeometry[] = [];
  for (const side of [1, -1]) {
    // find rim point on this side at cz ~ 1.9
    let best = rim[0];
    for (const r of rim) if (r.side === side && Math.abs(r.cz - 1.9) < Math.abs(best.cz - 1.9) && r.cz < ARC_Z) best = r;
    const psi = 0.41;
    const p = skullPoint(best, psi, v3());
    const pu = skullPoint(best, psi + 0.02, v3());
    const idx = rim.indexOf(best);
    const pn = skullPoint(rim[Math.min(rim.length - 1, idx + 1)], psi, v3());
    const nrm = v3().subVectors(pu, p).cross(v3().subVectors(pn, p)).normalize();
    if (nrm.x * side < 0) nrm.negate();
    // look a little forward
    nrm.addScaledVector(v3(0, 0, 1), 0.45).normalize();
    const c = p.clone().addScaledVector(nrm, 0.12);
    eyesH.push(c.clone().addScaledVector(nrm, 0.25));
    const m = frameY(c, nrm, 0, 1);
    W.armor.add(withRot(ring(0.62, 0.14, 6, segs(k, 28, 12)), m), HM, PAL.bronze);
    const socket = new THREE.CylinderGeometry(0.62, 0.7, 0.3, segs(k, 20, 10));
    W.armor.add(socket, HM.clone().multiply(m).multiply(new THREE.Matrix4().makeTranslation(0, -0.1, 0)), 0x201414);
    const ball = new THREE.SphereGeometry(0.46, segs(k, 18, 10), 8, 0, Math.PI * 2, 0, Math.PI / 2);
    ball.applyMatrix4(HM.clone().multiply(m).multiply(new THREE.Matrix4().makeRotationY(side * 0.5)).multiply(new THREE.Matrix4().makeScale(1.25, 0.5, 0.55)));
    eyeballs.push(ball);
    // 7-LED cluster
    const ex = v3().crossVectors(nrm, v3(0, 1, 0)).normalize();
    const ey = v3().crossVectors(ex, nrm).normalize();
    const eyeC = c.clone().addScaledVector(nrm, 0.3);
    const dots = [v2(0, 0)];
    for (let i = 0; i < 6; i++) dots.push(v2(Math.cos((i / 6) * Math.PI * 2) * 0.36, Math.sin((i / 6) * Math.PI * 2) * 0.36));
    for (const d of dots) {
      const q = eyeC.clone().addScaledVector(ex, d.x).addScaledVector(ey, d.y).applyMatrix4(HM);
      W.bulbs.add(q, BULB.eye, 0, 0.09, 0.2);
    }
    // brow ridge plate over the eye (long tapered blade with spikes at the back)
    const browOutline = [v2(-0.7, -2.0), v2(0.75, -1.8), v2(0.55, 1.2), v2(0.2, 3.0), v2(-0.4, 1.3)];
    const brow = plate(browOutline, 0.4, 0.1);
    const bp = skullPoint(best, 0.6, v3());
    bp.y += 0.25;
    const bm = basisZ(v3(side * Math.sin(0.55), Math.cos(0.55), 0.15), v3(0, 0.3, -1), v3(bp.x, bp.y + 0.1, bp.z + 0.1));
    W.armor.add(brow, HM.clone().multiply(bm), PAL.plateRed);
    // brow horns sweeping back
    for (let i = 0; i < 2; i++) {
      const hp = skullPoint(best, 0.6 + i * 0.06, v3());
      hp.z -= 1.6 + i * 1.1;
      hp.y += 0.3;
      const dir = v3(side * 0.5, 0.45, -1).normalize();
      W.steel.add(spike(2.4 - i * 0.6, 0.38, { sides: 8, segs: 4, bend: side * 0.3 }), HM.clone().multiply(frameY(hp, dir)), 0xdfe2e8);
    }
    // cheek blade fan (sickle blades sweeping back/out, like the jaw-side spikes in the photos)
    for (let i = 0; i < 5; i++) {
      const zz = -4.6 + i * 0.85;
      let rr = rim[0];
      for (const r of rim) if (r.side === side && Math.abs(r.cz - zz) < Math.abs(rr.cz - zz)) rr = r;
      const cp = skullPoint(rr, 0.12 + (i % 2) * 0.08, v3());
      cp.x += side * 0.25;
      const len = 2.0 + (4 - i) * 0.3;
      const blade = plate([v2(-0.55, 0), v2(0.55, 0), v2(0.25, len * 0.55), v2(-0.05, len)], 0.14, 0.03);
      // blades lie against the cheek (plate normal ~ outward) and sweep back and slightly up
      const dir = v3(side * 0.25, 0.25 + i * 0.06, -1).normalize();
      W.steel.add(blade, HM.clone().multiply(basisZ(v3(side, 0.15, 0.1), dir, cp)), 0xa0a6b0);
    }
    // brow LED line
    const browLine: V3[] = [];
    for (let i = 0; i <= 8; i++) {
      const zz = -0.4 + i * 0.45;
      let rr = rim[0];
      for (const r of rim) if (r.side === side && r.cz < ARC_Z && Math.abs(r.cz - zz) < Math.abs(rr.cz - zz)) rr = r;
      browLine.push(skullPoint(rr, 0.53, v3()).addScaledVector(nrm, 0.3).applyMatrix4(HM));
    }
    W.strips.add(browLine, 0, 0.12);
  }

  // ------------------------------------------------------------------ armour plates on the skull
  const plateCount = { n: 0 };
  const tri = [v2(-0.62, 0), v2(0.62, 0), v2(0, -1.5)];
  for (const side of [1, -1]) {
    for (let row = 0; row < 3; row++) {
      const psi = 0.66 + row * 0.12;
      for (let z = -4.6; z < 3.4; z += 1.25) {
        if (row === 2 && z > 1.0) continue;
        let rr = rim[0];
        const zz = z + (row % 2) * 0.6;
        for (const r of rim) if (r.side === side && r.cz < ARC_Z && Math.abs(r.cz - zz) < Math.abs(rr.cz - zz)) rr = r;
        const p = skullPoint(rr, psi, v3());
        const pz = skullPoint({ ...rr, cz: rr.cz + 0.3, p: rr.p.clone().setZ(rr.p.z + 0.3) }, psi, v3());
        const pu = skullPoint(rr, Math.min(1, psi + 0.04), v3());
        const fwd = v3().subVectors(pz, p).normalize();
        const up = v3().subVectors(pu, p).normalize();
        const nrm = v3().crossVectors(fwd, up).normalize();
        if (nrm.y < 0) nrm.negate();
        const across = v3().crossVectors(fwd, nrm).normalize();
        const m = new THREE.Matrix4().makeBasis(across, fwd, nrm);
        m.multiply(new THREE.Matrix4().makeRotationX(0.14));
        const sc = 0.8 + rnd() * 0.35 - row * 0.1;
        m.scale(v3(sc, sc, 1));
        m.setPosition(p.clone().addScaledVector(nrm, 0.14));
        const g = plate(tri, 0.16, 0.05);
        W.armor.add(g, HM.clone().multiply(m), PAL.plateRed);
        // LED outline (triangle edges, lifted)
        const corners = [v3(-0.62, 0.05, 0.16), v3(0.62, 0.05, 0.16), v3(0, -1.5, 0.16), v3(-0.62, 0.05, 0.16)].map((c) => c.applyMatrix4(m).applyMatrix4(HM));
        W.strips.add(corners, 0, 0.09);
        plateCount.n++;
      }
    }
  }

  // cheek plates with horns
  for (const side of [1, -1]) {
    for (let i = 0; i < 3; i++) {
      const zz = -4.8 + i * 1.5;
      let rr = rim[0];
      for (const r of rim) if (r.side === side && Math.abs(r.cz - zz) < Math.abs(rr.cz - zz)) rr = r;
      const p = skullPoint(rr, 0.2, v3());
      const kite = [v2(0, 1.3), v2(0.75, 0), v2(0, -1.6), v2(-0.75, 0)];
      const m = basisZ(v3(side, 0, 0), v3(-side * 0.3, 1, 0), v3(p.x + side * 0.12, p.y, p.z));
      W.armor.add(plate(kite, 0.2, 0.06), HM.clone().multiply(m), PAL.plateRed);
      const hp = p.clone();
      hp.x += side * 0.3;
      W.steel.add(spike(1.6 - i * 0.2, 0.26, { sides: 6, segs: 3, bend: side * 0.3 }), HM.clone().multiply(frameY(hp, v3(side * 0.7, 0.1, -1).normalize())));
    }
  }

  // hinge gear discs
  for (const side of [1, -1]) {
    const m = frameY(v3(side * 4.25, -0.9, -1.1), v3(side, 0, 0));
    W.armor.add(new THREE.CylinderGeometry(1.0, 1.1, 0.4, segs(k, 24, 12)), HM.clone().multiply(m), PAL.plateRed);
    W.armor.add(withRot(ring(0.85, 0.12, 5, segs(k, 32, 14)), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.24, 0))), HM, PAL.darkBronze);
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const tooth = new THREE.BoxGeometry(0.3, 0.32, 0.28);
      const tm = m.clone().multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeTranslation(1.12, 0, 0));
      W.armor.add(tooth, HM.clone().multiply(tm), PAL.darkBronze);
    }
    W.bulbs.add(v3(side * 4.55, -0.9, -1.1).applyMatrix4(HM), BULB.accent, 0, 0.18, 0.7);
  }

  // saw plate along the skull top (serrated fin)
  {
    const pts: THREE.Vector2[] = [];
    const L = 7.5;
    const n = 11;
    pts.push(v2(0, 0));
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * L;
      const h = 0.35 + 0.6 * Math.sin((i / n) * Math.PI) ;
      pts.push(v2(x, h * 0.5));
      if (i < n) pts.push(v2(x + L / n * 0.55, h * (1.15 + (i % 2) * 0.25)));
    }
    pts.push(v2(L, 0));
    const fin = plate(pts, 0.12, 0.03);
    // along the midline from z=2 back to z=-5.5
    const rr: RimPt = { p: v3(0, 0, 0), cz: 0, side: 1, s: 0 };
    const pFront = skullPoint({ ...rr, p: v3(0.01, interp(PZ, PRIM, 2), 2), cz: 2 }, 1, v3());
    const pBack = skullPoint({ ...rr, p: v3(0.01, interp(PZ, PRIM, -5.5), -5.5), cz: -5.5 }, 1, v3());
    const dir = v3().subVectors(pBack, pFront);
    const len = dir.length();
    dir.normalize();
    const m = new THREE.Matrix4().makeBasis(dir, v3().crossVectors(v3(1, 0, 0), dir).normalize(), v3(1, 0, 0));
    m.scale(v3(len / L, 1.6, 1));
    m.setPosition(pFront.x, pFront.y + 0.05, pFront.z);
    W.steel.add(fin, HM.clone().multiply(m));
  }

  // snout keel: row of small angular plates along the nose ridge
  for (let i = 0; i < 6; i++) {
    const zz = 0.6 + i * 0.85;
    const rr: RimPt = { p: v3(0.01, interp(PZ, PRIM, zz), zz), cz: zz, side: 1, s: 0 };
    const p = skullPoint(rr, 1, v3());
    const h = 0.75 - i * 0.07;
    const fin = plate([v2(-0.45, 0), v2(0.5, 0), v2(-0.25, h)], 0.14, 0.03);
    const m = new THREE.Matrix4().makeBasis(v3(0, 0, -1), v3(0, 1, 0), v3(1, 0, 0)).setPosition(p.x, p.y - 0.05, p.z);
    W.armor.add(fin, HM.clone().multiply(m), PAL.plateRed);
  }

  // nostril rings
  for (const side of [1, -1]) {
    let rr = rim[0];
    for (const r of rim) if (r.side === side && Math.abs(r.cz - ARC_Z) < Math.abs(rr.cz - ARC_Z) && r.cz <= ARC_Z) rr = r;
    const p = skullPoint(rr, 0.82, v3());
    p.z += 1.1;
    p.x = side * 0.75;
    p.y = interp(PZ, PTOP, ARC_Z) + 0.05;
    const m = frameY(p, v3(side * 0.3, 0.75, 0.6).normalize());
    W.armor.add(withRot(ring(0.3, 0.09, 5, 16), m), HM, PAL.bronze);
    W.armor.add(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 12), HM.clone().multiply(m), 0x100808);
  }

  // face stripes: transverse LED bars across the snout and forehead (the white-pink "ribs" on the
  // face in the red sections, design bible §5.6 / frame f068)
  for (let i = 0; i < 7; i++) {
    const zz = -1.4 + i * 0.95;
    const bar: V3[] = [];
    const span = 0.5 - i * 0.02;
    for (let j = 0; j <= 10; j++) {
      const side = j < 5 ? 1 : -1;
      const psi = j < 5 ? 1 - span + (j / 5) * span : 1 - ((j - 5) / 5) * span;
      const rr: RimPt = { p: v3(side * interp(PZ, PW, zz), interp(PZ, PRIM, zz), zz), cz: zz, side, s: 0 };
      const q = skullPoint(rr, Math.min(1, psi), v3());
      q.y += 0.12;
      bar.push(q.applyMatrix4(HM));
    }
    W.strips.add(bar, 0, 0.11, 0, 0.13 * i);
  }

  // 8 moving-head bodies on the skull (FACT, teardown) - dark set dressing, beams belong to lighting
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    const zz = -3.9 + Math.floor(i / 2) * 1.5;
    const rr: RimPt = { p: v3(side * interp(PZ, PW, zz), interp(PZ, PRIM, zz), zz), cz: zz, side, s: 0 };
    const p = skullPoint(rr, 0.82, v3());
    const base = new THREE.Matrix4().makeTranslation(p.x, p.y + 0.35, p.z);
    W.armor.add(new THREE.BoxGeometry(0.7, 0.18, 0.7), HM.clone().multiply(base), 0x1c1c20);
    W.armor.add(new THREE.BoxGeometry(0.12, 0.5, 0.55), HM.clone().multiply(base).multiply(new THREE.Matrix4().makeTranslation(-0.3, 0.3, 0)), 0x1c1c20);
    W.armor.add(new THREE.BoxGeometry(0.12, 0.5, 0.55), HM.clone().multiply(base).multiply(new THREE.Matrix4().makeTranslation(0.3, 0.3, 0)), 0x1c1c20);
    const head = new THREE.CylinderGeometry(0.2, 0.26, 0.55, 10);
    W.armor.add(head, HM.clone().multiply(base).multiply(new THREE.Matrix4().makeTranslation(0, 0.42, 0)).multiply(new THREE.Matrix4().makeRotationX(0.5)), 0x26262a);
  }

  // upper lip LED line (outer rim, from cheek to cheek)
  {
    const lip = rim.filter((r) => r.cz > -3.5).map((r) => {
      const q = v3(r.p.x * 1.035, r.p.y + 0.12, r.cz + (r.p.z - r.cz) * 1.035 + 0.05);
      return q.applyMatrix4(HM);
    });
    W.strips.add(lip, 0, 0.14);
  }

  // mouth bulbs: inner gum row + 3 palate rows
  {
    const n = Math.round(58 * (0.5 + 0.5 * k.detail));
    for (let i = 0; i < n; i++) {
      const t = 0.02 + (0.96 * i) / (n - 1);
      const p = rimLine.at(t);
      const inward = v3(-p.x, 0, ARC_Z - p.z).normalize();
      p.addScaledVector(inward, 0.5);
      p.y += 0.12;
      W.bulbs.add(p.applyMatrix4(HM), BULB.mouth, t * rimLine.length, 0.1, (i * 0.37) % 1);
    }
    for (const f of [0.3, 0.55, 0.8]) {
      const m = Math.round(16 * (0.5 + 0.5 * k.detail) * (1.1 - f * 0.4));
      for (let i = 0; i < m; i++) {
        const t = 0.08 + (0.84 * i) / (m - 1);
        const p = rimLine.at(t);
        const r = mouthRim[Math.round(t * (mouthRim.length - 1))];
        const inner = v3(p.x * 0.9, p.y - 0.05, r.cz + (p.z - r.cz) * 0.9);
        const mid = v3(0, p.y + 0.95 + 0.25 * Math.sin(r.cz * 3.2), r.cz);
        const q = inner.lerp(mid, f);
        q.y += Math.sin(f * Math.PI) * 0.35 - 0.1;
        W.bulbs.add(q.applyMatrix4(HM), BULB.mouth, t * 20 + f * 5, 0.09, (i * 0.61 + f) % 1);
      }
    }
  }

  // ------------------------------------------------------------------ crest (world directions)
  const crestTips: V3[] = [];
  {
    const Cw = v3(0, -0.8, -4.4).applyMatrix4(HM);
    const zc = -4.35;
    // daytime photos: 7-8 long silver-white horns fanning out and back from the skull like a crown
    // (the longest sweep out to viewer-left / back-right), smaller cones between them
    const list: [number, number, number, number][] = [
      // side, psi, length, radius
      [-1, 0.12, 7.2, 0.95],
      [-1, 0.32, 9.6, 1.15],
      [-1, 0.52, 9.0, 1.08],
      [-1, 0.72, 7.4, 0.95],
      [-1, 0.9, 5.4, 0.8],
      [1, 1.0, 5.0, 0.76],
      [1, 0.84, 6.4, 0.86],
      [1, 0.66, 7.6, 0.95],
      [1, 0.46, 8.4, 1.02],
      [1, 0.28, 7.2, 0.9],
      [1, 0.1, 5.0, 0.7],
    ];
    const sides = segs(k, 12, 6);
    const baseFor = (side: number, psi: number, z: number) => {
      const rr: RimPt = { p: v3(side * interp(PZ, PW, z), interp(PZ, PRIM, z), z), cz: z, side, s: 0 };
      return skullPoint(rr, psi, v3()).applyMatrix4(HM);
    };
    const dirFor = (b: V3, back: number) => {
      const fr = v3(b.x - Cw.x, b.y - Cw.y, 0);
      let ang = Math.atan2(fr.y, fr.x);
      // fanned wide (the photos' crown of horns spreads well past 45 deg each side)
      ang = Math.PI / 2 + (ang - Math.PI / 2) * 1.05;
      return v3(Math.cos(ang), Math.sin(ang), -back).normalize();
    };
    for (const [side, psi, len, r] of list) {
      const b = baseFor(side, psi, zc);
      const d = dirFor(b, 0.85);
      const bend = len * 0.16;
      // the near-vertical middle horns stay shorter so the crown tops out near Y 23-24 (photos)
      const L2 = len * HEAD.scale * (0.95 - 0.5 * Math.max(0, d.y - 0.55));
      const g = spike(L2, r * 0.95 * HEAD.scale, { sides, segs: segs(k, 8, 4), bendZ: -bend, bend: side * len * 0.06, tipR: 0.03 });
      const m = frameY(b, d, 0, 1, v3(0, 0, 1));
      W.steel.add(g, m, 0xe2e5ea);
      const tip = v3(0, L2, -bend).applyMatrix4(m);
      crestTips.push(tip);
      // accent LED along the front edge
      const line: V3[] = [];
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const rr = THREE.MathUtils.lerp(r * 1.55, 0.03, Math.pow(t, 0.85));
        line.push(v3(0, L2 * t * 0.95, -bend * t * t + rr + 0.04).applyMatrix4(m));
      }
      W.strips.add(line, 1, 0.1);
      // collar ring at the base
      W.armor.add(withRot(ring(r * 1.4 * HEAD.scale, 0.16, 5, 16), frameY(b.clone().addScaledVector(d, 0.3), d)), null, PAL.bronze);
    }
    // second row: shorter, thick cones in front of the frill
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1;
      const psi = 0.35 + (i % 3) * 0.25;
      const b = baseFor(side, Math.min(1, psi), -2.9);
      const d = dirFor(b, 0.25);
      const len = (2.2 + rnd() * 0.9) * HEAD.scale;
      W.steel.add(spike(len, 0.55 * HEAD.scale, { sides: 8, segs: 3, bendZ: -0.3 }), frameY(b, d, 0, 1, v3(0, 0, 1)));
    }
    // jagged frill: big dark sawtooth blades between/behind the cones (the crown's spiky collar)
    for (let i = 0; i < 18; i++) {
      const side = i < 9 ? -1 : 1;
      const psi = 0.02 + (i % 9) * 0.122;
      const b = baseFor(side, Math.min(1, psi), -4.9);
      const d = dirFor(b, 0.5);
      const len = (2.6 + rnd() * 1.4 + (side < 0 ? 0.5 : 0)) * HEAD.scale;
      const w = (0.9 + rnd() * 0.3) * HEAD.scale;
      const blade = plate([v2(-w, 0), v2(w, 0), v2(w * 0.35, len * 0.45), v2(w * 0.6, len * 0.52), v2(w * 0.1, len)], 0.16, 0.04);
      const m = frameY(b, d, (rnd() - 0.5) * 0.4, 1, v3(0, 0, 1));
      W.armor.add(blade, m, i % 3 === 0 ? PAL.darkBronze : CREST_ORANGE);
    }
    // the two long cheek horns sweeping back and out from behind the jaw hinge (photos: the
    // longest white horns of the head, curving up at the tips)
    for (const side of [1, -1]) {
      const b = baseFor(side, 0.22, -3.2);
      const d = v3(side * 0.62, 0.12, -1).applyMatrix4(new THREE.Matrix4().extractRotation(HM)).normalize();
      d.y = Math.max(d.y, 0.05);
      d.normalize();
      const g = spike(8.2 * HEAD.scale, 0.72 * HEAD.scale, { sides, segs: segs(k, 9, 5), bendZ: 1.6, tipR: 0.03 });
      W.steel.add(g, frameY(b, d, 0, 1, v3(0, 1, 0)), 0xe2e5ea);
      W.armor.add(withRot(ring(1.2, 0.18, 5, 16), frameY(b.clone().addScaledVector(d, 0.35), d)), null, PAL.bronze);
    }
  }

  // ------------------------------------------------------------------ LOWER JAW (jaw-local)
  const jrim = makeRim(segs(k, 64, 30), -1.3, -0.28, -0.32, 5.2, 0.05);
  const jPsi = segs(k, 10, 6);
  const jaw = surface(jrim.length - 1, jPsi, (u, v, o) => {
    const r = jrim[Math.round(u * (jrim.length - 1))];
    jawPoint(r, v, o);
  }, [jrim[jrim.length - 1].s / 3.4, 1.2]);
  flipWinding(jaw);
  jaw.computeVertexNormals();
  J.shell.add(jaw, null, PAL.scaleRed);
  // back cap of the jaw
  {
    const r0 = jrim[0];
    const r1 = jrim[jrim.length - 1];
    const cap = surface(8, 4, (u, v, o) => {
      const a = jawPoint(r0, v, v3());
      const b = jawPoint(r1, v, v3());
      o.lerpVectors(a, b, u);
    });
    J.shell.add(cap, null, PAL.scaleDeep);
  }
  // jaw floor (inside the trough)
  const floor = surface(jrim.length - 1, 5, (u, v, o) => {
    const r = jrim[Math.round(u * (jrim.length - 1))];
    const inner = v3(r.p.x * 0.9, r.p.y + 0.02, r.cz + (r.p.z - r.cz) * 0.9);
    const mid = v3(0, r.p.y - 0.9, r.cz);
    o.lerpVectors(inner, mid, Math.pow(v, 0.8));
    o.y -= Math.sin(v * Math.PI) * 0.2;
  }, [4, 1]);
  J.flesh.add(floor, null, PAL.palate);
  const jgum = jrim.map((r) => v3(r.p.x * 0.96, r.p.y + 0.05, r.cz + (r.p.z - r.cz) * 0.96));
  J.flesh.add(tube(jgum, () => 0.2, { radial: segs(k, 8, 5) }), null, PAL.gum);
  J.armor.add(tube(jrim.map((r) => v3(r.p.x, r.p.y - 0.05, r.p.z)), () => 0.32, { radial: 4, shape: (a) => (Math.abs(Math.sin(a)) > 0.7 ? 1.2 : 0.85), up: v3(0, 1, 0) }), null, PAL.plateRed);
  // tongue
  {
    const n = 14;
    const pts: V3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const z = -0.9 + t * 5.4;
      pts.push(v3(0.1 * Math.sin(t * 5), -0.55 + Math.pow(Math.max(0, t - 0.72) / 0.28, 2) * 0.9 - 0.15 * Math.sin(t * Math.PI), z));
    }
    const tg = tube(pts, (t) => (0.95 - 0.45 * t) * (t > 0.86 ? Math.max(0.25, Math.sqrt((1 - t) / 0.14)) : 1), { radial: segs(k, 14, 8), aspectN: 0.28, up: v3(0, 1, 0), capEnd: true });
    J.flesh.add(tg, null, PAL.tongue);
    // tongue bulbs
    for (let i = 0; i < Math.round(18 * (0.5 + 0.5 * k.detail)); i++) {
      const t = 0.1 + (i / 18) * 0.75;
      const z = -0.9 + t * 5.4;
      const x = ((i % 3) - 1) * 0.45;
      J.bulbs.add(v3(x, -0.55 + 0.3 - 0.15 * Math.sin(t * Math.PI) + (t > 0.72 ? Math.pow((t - 0.72) / 0.28, 2) * 0.9 : 0), z), BULB.mouth, t * 6, 0.08, (i * 0.29) % 1);
    }
  }
  // lower teeth
  const jLine = new Polyline(jrim.map((r) => r.p));
  const lowerTeeth: { t: number; len: number; r: number }[] = [];
  [0.3, 0.38, 0.45, 0.5, 0.55, 0.62, 0.7].forEach((t, i) => lowerTeeth.push({ t, len: [2.4, 1.6, 1.8, 1.5, 1.8, 1.6, 2.4][i], r: 0.34 }));
  for (let i = 0; i < 6; i++) {
    const t = 0.05 + i * 0.038;
    lowerTeeth.push({ t, len: 0.85 + rnd() * 0.5, r: 0.21 });
    lowerTeeth.push({ t: 1 - t, len: 0.85 + rnd() * 0.5, r: 0.21 });
  }
  for (const th of lowerTeeth) {
    const p = jLine.at(th.t);
    const tan = jLine.tangent(th.t);
    const inward = v3(-p.x, 0, 5.2 - p.z).normalize();
    const dir = v3(0, 1, 0).addScaledVector(inward, -0.1).addScaledVector(v3(0, 0, 1), 0.18).normalize();
    const g = spike(th.len, th.r, { sides: toothSides, segs: 5, bend: th.len * 0.15, tipR: 0.015 });
    gradientY(g, 0, th.len, PAL.toothRoot, PAL.ivory, 0.6);
    J.ivory.add(g, frameY(p.clone().addScaledVector(inward, 0.1).setY(p.y - 0.05), dir, 0, 1, tan.clone().cross(dir)));
  }
  // lower lip LED + inner bulb row
  {
    const lip = jrim.map((r) => v3(r.p.x * 1.04, r.p.y - 0.12, r.cz + (r.p.z - r.cz) * 1.04 + 0.04));
    J.strips.add(lip, 0, 0.14);
    const n = Math.round(50 * (0.5 + 0.5 * k.detail));
    for (let i = 0; i < n; i++) {
      const t = 0.03 + (0.94 * i) / (n - 1);
      const p = jLine.at(t);
      const inward = v3(-p.x, 0, 5.2 - p.z).normalize();
      p.addScaledVector(inward, 0.48);
      p.y -= 0.08;
      J.bulbs.add(p, BULB.mouth, t * jLine.length, 0.1, (i * 0.43) % 1);
    }
  }
  // saw-tooth spikes along the jaw's lower edge
  for (const side of [1, -1]) {
    const pts = jrim.filter((r) => r.side === side && r.cz < 5.0);
    for (let i = 0; i < 7; i++) {
      const r = pts[Math.round((i / 6) * (pts.length - 1))];
      const q = jawPoint(r, 0.5, v3());
      q.x *= 1.02;
      const dir = v3(side * 0.8, -0.5, -0.55).normalize();
      J.steel.add(spike(1.4 + (6 - i) * 0.14, 0.32, { sides: 6, segs: 3, bend: side * 0.2 }), frameY(q, dir));
    }
  }
  // curved steel tusk from the left jaw corner (down-left)
  {
    const g = spike(3.4, 0.42, { sides: 10, segs: 8, bend: 1.0, tipR: 0.03 });
    J.steel.add(g, frameY(v3(-3.6, -1.4, 0.2), v3(-0.55, -0.8, 0.25).normalize(), 0, 1, v3(0, 0, 1)));
  }
  // jaw armour: plates along the jaw sides
  for (const side of [1, -1]) {
    const pts = jrim.filter((r) => r.side === side && r.cz < 5.1);
    for (let i = 0; i < 5; i++) {
      const r = pts[Math.round((i / 4.5) * (pts.length - 1))];
      const q = jawPoint(r, 0.28, v3());
      const kite = [v2(0, 0.7), v2(0.55, 0), v2(0, -0.9), v2(-0.55, 0)];
      const m = basisZ(v3(side, 0, 0), v3(0, 1, 0), v3(q.x + side * 0.08, q.y, q.z));
      J.armor.add(plate(kite, 0.14, 0.04), m, PAL.plateRed);
    }
  }

  // anchor points (head-local)
  const mouthH = v3(0, -1.2, 3.0);
  const headH = v3(0, 1.4, 0.5);
  const eb = eyeballs.length > 1 ? mergeTwo(eyeballs[0], eyeballs[1]) : eyeballs[0];
  return { mouthH, eyesH: [eyesH[1], eyesH[0]], headH, crestTips, eyeballs: eb, throat };
}

function flipWinding(g: THREE.BufferGeometry): void {
  const idx = g.index!;
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i + 1);
    idx.setX(i + 1, idx.getX(i + 2));
    idx.setX(i + 2, a);
  }
  idx.needsUpdate = true;
}

function withRot(g: THREE.BufferGeometry, m: THREE.Matrix4): THREE.BufferGeometry {
  // torus lies in XY; frameY maps local +Y along the axis -> rotate torus so its axis is +Y
  g.rotateX(Math.PI / 2);
  g.applyMatrix4(m);
  return g;
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const pa = a.getAttribute('position').array as Float32Array;
  const pb = b.getAttribute('position').array as Float32Array;
  const na = a.getAttribute('normal').array as Float32Array;
  const nb = b.getAttribute('normal').array as Float32Array;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(pa.length + pb.length);
  pos.set(pa);
  pos.set(pb, pa.length);
  const nor = new Float32Array(na.length + nb.length);
  nor.set(na);
  nor.set(nb, na.length);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  const ia = a.index!.array;
  const ib = b.index!.array;
  const off = pa.length / 3;
  const idx: number[] = [];
  for (let i = 0; i < ia.length; i++) idx.push(ia[i]);
  for (let i = 0; i < ib.length; i++) idx.push(ib[i] + off);
  g.setIndex(idx);
  return g;
}

