import * as THREE from 'three';
import { Polyline, basisZ, box, circle, frameY, gem, plate, qbez, ring, sickleOutline, spike, tube, v2, v3, type V3 } from './geom';
import { wingLayout, type WingLayout } from './layout';
import { PAL, segs, type Kit } from './kit';
import { BULB } from './shading';

/**
 * The two giant mechanical bat wings. Per wing: 3 copper finger spars fanning up from a low
 * wrist (outer leans out, middle ~vertical, inner leans in towards the head), each ending in a
 * flame-shaped spiky finial; an arched arm from the dragon's shoulder to the inner finger carrying
 * perforated bone plates and sickle hooks; 3 printed flame membranes (Coons patches, billowing,
 * scalloped edges) acting as pixel canvases; combs of silver blade spikes along every spar; small
 * spikes + LED dots along the sagging top edges; 3 gear rosettes (instanced, animated elsewhere).
 */

export interface WingResult {
  layout: WingLayout;
  /** rosette placement frames (world), one per rosette */
  rosetteFrames: THREE.Matrix4[];
  /** points along the wing for anchors (finger tips, finials, top edges) */
  points: V3[];
  /** top points for gerbs */
  roof: V3[];
}

interface Finger {
  line: Polyline;
  pts: V3[];
}

export function buildWings(k: Kit): { wings: WingResult[]; membrane: THREE.BufferGeometry } {
  const mb = new MembraneBuilder();
  const wings = [-1, 1].map((s) => buildWing(k, s, mb));
  return { wings, membrane: mb.build() };
}

/** Membrane accumulator (keeps the extra attribute). */
class MembraneBuilder {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  memb: number[] = [];
  idx: number[] = [];
  add(g: THREE.BufferGeometry, memb: Float32Array) {
    const off = this.pos.length / 3;
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const u = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      this.nor.push(n.getX(i), n.getY(i), n.getZ(i));
      this.uv.push(u.getX(i), u.getY(i));
      this.memb.push(memb[i * 3], memb[i * 3 + 1], memb[i * 3 + 2]);
    }
    const ix = g.index!;
    for (let i = 0; i < ix.count; i++) this.idx.push(ix.getX(i) + off);
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('memb', new THREE.Float32BufferAttribute(this.memb, 3));
    const n = this.pos.length / 3;
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    g.setAttribute('fx', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

function buildWing(k: Kit, side: number, membranes: MembraneBuilder): WingResult {
  const W = k.world;
  const rnd = k.rnd;
  const L = wingLayout(side);
  const s = side;
  const radial = segs(k, 16, 8);
  // wing plane normal (towards the audience)
  const nrm = v3().subVectors(L.tips[0], L.wrist).cross(v3().subVectors(L.tips[2], L.wrist)).normalize();
  if (nrm.z < 0) nrm.negate();

  // ------------------------------------------------------------------ fingers
  const bows = [1.3, 0.35, -1.5];
  const fingers: Finger[] = L.tips.map((tip, i) => {
    const base = L.bases[i];
    const mid = v3().lerpVectors(base, tip, 0.5);
    const along = v3().subVectors(tip, base).normalize();
    const perp = v3().crossVectors(nrm, along).normalize();
    // perp points to the finger's left in the wing plane; make it point outward (+x*s)
    if (perp.x * s < 0) perp.negate();
    const ctrl = mid.clone().addScaledVector(perp, bows[i]).addScaledVector(nrm, -0.6);
    const pts: V3[] = [];
    const n = segs(k, 30, 14);
    for (let j = 0; j <= n; j++) pts.push(qbez(base, ctrl, tip, j / n));
    return { line: new Polyline(pts), pts };
  });
  // heel bar tying the spar roots together through the wrist knuckle
  W.copper.add(tube([L.bases[0].clone(), L.wrist.clone(), L.bases[2].clone()], () => 0.6, { radial, capStart: true, capEnd: true }), null, PAL.copperDeep);
  fingers.forEach((f, i) => {
    W.copper.add(tube(f.pts, (t) => THREE.MathUtils.lerp(0.66, 0.4, t), { radial, vScale: 3, capEnd: true }), null, i === 1 ? PAL.copper : PAL.copperDeep.clone().lerp(PAL.copper, 0.5));
    // knuckle joints
    for (const t of [0.3, 0.55, 0.78]) {
      const p = f.line.at(t);
      const d = f.line.tangent(t);
      const r = THREE.MathUtils.lerp(0.66, 0.4, t);
      W.armor.add(tube([p.clone().addScaledVector(d, -0.3), p.clone().addScaledVector(d, 0.3)], () => r + 0.14, { radial, capStart: true, capEnd: true }), null, PAL.darkBronze);
      W.armor.add(gem(r * 0.9), new THREE.Matrix4().makeTranslation(p.x + nrm.x * r, p.y + nrm.y * r, p.z + nrm.z * r), PAL.plateRed);
    }
    // LED strips along the front face of the spar
    for (const off of [-0.26, 0.26]) {
      const pts: V3[] = [];
      for (let j = 0; j <= 24; j++) {
        const t = 0.06 + (j / 24) * 0.9;
        const p = f.line.at(t);
        const d = f.line.tangent(t);
        const lat = v3().crossVectors(nrm, d).normalize();
        const r = THREE.MathUtils.lerp(0.66, 0.4, t);
        pts.push(p.addScaledVector(nrm, r * 0.9 + 0.06).addScaledVector(lat, off));
      }
      W.strips.add(pts, 0, 0.13, 0, i * 0.2 + (off > 0 ? 0.1 : 0));
    }
  });

  // wrist knuckle + down claw
  W.armor.add(gem(1.5, 0), new THREE.Matrix4().makeTranslation(L.wrist.x, L.wrist.y, L.wrist.z + 0.2), PAL.plateRed);
  W.armor.add(withAxis(ring(1.1, 0.2, 6, 24), frameY(L.wrist, nrm)), null, PAL.bronze);
  W.steel.add(spike(3.0, 0.55, { sides: 8, segs: 6, bend: -s * 0.9, tipR: 0.03 }), frameY(L.wrist.clone().add(v3(0, -0.8, 0.3)), v3(s * 0.15, -1, 0.15).normalize(), 0, 1, v3(0, 0, 1)));

  // ------------------------------------------------------------------ arm (shoulder -> inner finger)
  const armCtrl = v3().lerpVectors(L.shoulder, L.armJoin, 0.45).add(v3(0, 2.6, 0.2));
  const armPts: V3[] = [];
  const an = segs(k, 28, 12);
  for (let j = 0; j <= an; j++) armPts.push(qbez(L.shoulder, armCtrl, L.armJoin, j / an));
  const arm = new Polyline(armPts);
  const armR = (t: number) => THREE.MathUtils.lerp(1.15, 0.72, t);
  W.shell.add(tube(armPts, armR, { radial, capStart: true, capEnd: true, vScale: 3 }), null, PAL.scaleRed);
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    const p = arm.at(t);
    const d = arm.tangent(t);
    W.armor.add(tube([p.clone().addScaledVector(d, -0.25), p.clone().addScaledVector(d, 0.25)], () => armR(t) + 0.12, { radial, capStart: true, capEnd: true }), null, i % 2 ? PAL.darkBronze : PAL.bronze);
  }
  {
    const pts: V3[] = [];
    for (let j = 0; j <= 20; j++) {
      const t = j / 20;
      const p = arm.at(t);
      pts.push(p.addScaledVector(nrm, armR(t) + 0.06));
    }
    W.strips.add(pts, 0, 0.14, 0, 0.77);
  }
  // perforated bone fin riding along the top of the arm (one continuous curved plate with holes)
  {
    const e1 = v3().subVectors(L.armJoin, L.shoulder).normalize();
    const e2 = v3().crossVectors(nrm, e1).normalize();
    if (e2.y < 0) e2.negate();
    const origin = L.shoulder.clone();
    const to2 = (p: V3) => v2(v3().subVectors(p, origin).dot(e1), v3().subVectors(p, origin).dot(e2));
    const n = 24;
    const lower: THREE.Vector2[] = [];
    const upper: THREE.Vector2[] = [];
    for (let i = 0; i <= n; i++) {
      const t = 0.06 + (i / n) * 0.86;
      const p = arm.at(t);
      const d = arm.tangent(t);
      let up = v3().crossVectors(nrm, d).normalize();
      if (up.y < 0) up.negate();
      const h = 0.35 + 1.5 * Math.pow(Math.sin(Math.PI * (i / n)), 0.8);
      lower.push(to2(p.clone().addScaledVector(up, armR(t) * 0.6)));
      // scalloped top edge
      const scal = 0.18 * Math.abs(Math.sin((i / n) * Math.PI * 6));
      upper.push(to2(p.clone().addScaledVector(up, armR(t) * 0.6 + h - scal)));
    }
    const outline = [...lower, ...upper.reverse()];
    const holes: THREE.Vector2[][] = [];
    for (let i = 2; i < n - 1; i += 3) {
      const a = lower[i];
      const b = upper[n - i];
      const c = a.clone().lerp(b, 0.5);
      const r = Math.min(0.32, a.distanceTo(b) * 0.28);
      if (r > 0.12) holes.push(circle(c.x, c.y, r, 10, true));
    }
    const fin = plate(outline, 0.16, 0.04, holes);
    const m = new THREE.Matrix4().makeBasis(e1, e2, v3().crossVectors(e1, e2)).setPosition(origin.clone().addScaledVector(nrm, 0.15));
    W.steel.add(fin, m, 0x9ea4ae);
  }
  // sickle hooks hanging below the arm (like scales)
  const hookProto = plate(sickleOutline(2.6, 0.75, 0.8, 8), 0.14, 0.04, [circle(0.05, 0.75, 0.16, 8, true), circle(0.3, 1.45, 0.12, 8, true)]);
  const nHooks = 11;
  for (let i = 0; i < nHooks; i++) {
    const t = 0.08 + (i / (nHooks - 1)) * 0.86;
    const p = arm.at(t);
    const d = arm.tangent(t);
    const down = v3().crossVectors(d, nrm).normalize();
    if (down.y > 0) down.negate();
    const hd = down.clone().addScaledVector(d, -0.55 * s * Math.sign(d.x || 1) * s).normalize();
    const m = basisZ(nrm, hd, p.clone().addScaledVector(down, armR(t) * 0.7).addScaledVector(nrm, 0.3));
    W.steel.add(hookProto.clone(), m, 0xc4c8d0);
  }

  // ------------------------------------------------------------------ membranes (Coons patches)
  const rosetteFrames: THREE.Matrix4[] = [];
  const nu = segs(k, 22, 10);
  const nv = segs(k, 26, 12);
  const fingerAt = (f: Finger, t: number) => f.line.at(t);
  const sagCurve = (a: V3, b: V3, sag: number) => {
    const c = v3().lerpVectors(a, b, 0.5);
    c.y -= sag;
    c.addScaledVector(nrm, -0.5);
    return (u: number, o: V3) => qbez(a, c, b, u, o);
  };
  const ATT = 0.95; // membranes attach right under the finial collars
  const tipBelow = (f: Finger) => f.line.at(ATT);
  const membPts: V3[] = [];
  const panels: {
    left: (v: number, o: V3) => V3;
    right: (v: number, o: V3) => V3;
    top: (u: number, o: V3) => V3;
    bot: (u: number, o: V3) => V3;
    uvOff: number;
    lenL: number;
  }[] = [];
  const fanPanel = (fa: Finger, fb: Finger, sag: number, uvOff: number) => {
    const t0 = 0.12;
    const top = sagCurve(tipBelow(fa), tipBelow(fb), sag);
    const b0 = fingerAt(fa, t0);
    const b1 = fingerAt(fb, t0);
    const bc = v3().lerpVectors(b0, b1, 0.5).add(v3(0, 1.4, 0));
    panels.push({
      left: (v, o) => o.copy(fingerAt(fa, t0 + (ATT - t0) * v)),
      right: (v, o) => o.copy(fingerAt(fb, t0 + (ATT - t0) * v)),
      top,
      bot: (u, o) => qbez(b0, bc, b1, u, o),
      uvOff,
      lenL: fa.line.length * (ATT - t0),
    });
  };
  fanPanel(fingers[0], fingers[1], 1.9, 0.0);
  fanPanel(fingers[1], fingers[2], 2.4, 0.33);
  {
    // inner panel: inner finger (from the arm join up) / sag edge to the shoulder / arm
    const fi = fingers[2];
    const tJ = 0.37;
    const sTop = L.shoulder.clone().add(v3(0, 2.6, -0.4));
    const top = sagCurve(tipBelow(fi), sTop, 1.2);
    panels.push({
      left: (v, o) => o.copy(fingerAt(fi, tJ + (ATT - tJ) * v)),
      right: (v, o) => o.lerpVectors(L.shoulder, sTop, v),
      top,
      bot: (u, o) => o.copy(arm.at(1 - u)),
      uvOff: 0.66,
      lenL: fi.line.length * (ATT - tJ),
    });
  }
  const P00 = v3(), P10 = v3(), P01 = v3(), P11 = v3();
  const a1 = v3(), a2 = v3(), a3 = v3(), a4 = v3();
  panels.forEach((pn, pi) => {
    pn.left(0, P00);
    pn.right(0, P10);
    pn.left(1, P01);
    pn.right(1, P11);
    const g = new THREE.BufferGeometry();
    const count = (nu + 1) * (nv + 1);
    const pos = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    const memb = new Float32Array(count * 3);
    let q = 0;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        pn.bot(u, a1);
        pn.top(u, a2);
        pn.left(v, a3);
        pn.right(v, a4);
        const x =
          (1 - v) * a1.x + v * a2.x + (1 - u) * a3.x + u * a4.x - ((1 - u) * (1 - v) * P00.x + u * (1 - v) * P10.x + (1 - u) * v * P01.x + u * v * P11.x);
        const y =
          (1 - v) * a1.y + v * a2.y + (1 - u) * a3.y + u * a4.y - ((1 - u) * (1 - v) * P00.y + u * (1 - v) * P10.y + (1 - u) * v * P01.y + u * v * P11.y);
        const z =
          (1 - v) * a1.z + v * a2.z + (1 - u) * a3.z + u * a4.z - ((1 - u) * (1 - v) * P00.z + u * (1 - v) * P10.z + (1 - u) * v * P01.z + u * v * P11.z);
        const billow = Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, v * 1.15)) * 0.55;
        pos[q * 3] = x - nrm.x * billow;
        pos[q * 3 + 1] = y - nrm.y * billow;
        pos[q * 3 + 2] = z - nrm.z * billow;
        uv[q * 2] = pn.uvOff + u * 0.3 * (s > 0 ? 1 : -1) + (s > 0 ? 0 : 0.5);
        uv[q * 2 + 1] = v;
        memb[q * 3] = u;
        memb[q * 3 + 1] = v * pn.lenL;
        memb[q * 3 + 2] = s * (pi + 1);
        q++;
      }
    }
    const idx: number[] = [];
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i;
        const b = a + nu + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // orient normals towards the audience
    const nArr = g.getAttribute('normal');
    let avg = 0;
    for (let i = 0; i < nArr.count; i++) avg += nArr.getZ(i);
    if (avg < 0) {
      for (let i = 0; i < idx.length; i += 3) {
        const t = idx[i + 1];
        idx[i + 1] = idx[i + 2];
        idx[i + 2] = t;
      }
      g.setIndex(idx);
      g.computeVertexNormals();
    }
    membranes.add(g, memb);
    for (let i = 0; i < pos.length; i += 3) membPts.push(v3(pos[i], pos[i + 1], pos[i + 2]));
    // thin batten ribs between the pixel lanes: the "stacked curved rib" structure of the skin
    for (let lane = 2; lane <= 4; lane++) {
      const ci = Math.round((lane / 6) * nu);
      const rib: V3[] = [];
      for (let j = Math.round(nv * 0.1); j <= Math.round(nv * 0.97); j++) {
        const o = (j * (nu + 1) + ci) * 3;
        rib.push(v3(pos[o], pos[o + 1], pos[o + 2]).addScaledVector(nrm, 0.08));
      }
      if (rib.length > 2) W.copper.add(tube(rib, () => 0.08, { radial: 5 }), null, PAL.copperDeep);
    }

    // top edge: LED strip, small spikes, dots
    const edge: V3[] = [];
    const ne = 24;
    for (let i = 0; i <= ne; i++) edge.push(pn.top(i / ne, v3()).addScaledVector(nrm, 0.12));
    W.strips.add(edge, 0, 0.13, 0, 0.3 + pi * 0.2);
    const eLine = new Polyline(edge);
    const nSp = pi === 2 ? 6 : 10;
    for (let i = 1; i < nSp; i++) {
      const t = i / nSp;
      const p = eLine.at(t);
      const d = eLine.tangent(t);
      let out = v3().crossVectors(d, nrm).normalize();
      if (out.y < 0) out.negate();
      out.addScaledVector(v3(s, 0, 0), 0.15).normalize();
      W.steel.add(spike(0.9 + rnd() * 0.5, 0.16, { sides: 4, segs: 2 }), frameY(p, out, 0, 1, nrm));
      W.bulbs.add(p.clone().addScaledVector(nrm, 0.25).addScaledVector(out, -0.3), BULB.led, t * eLine.length, 0.14, (i * 0.13 + pi * 0.3) % 1);
    }
    // row of moving-head bodies on short arms along the top edge (1.3 m pitch; beams are the
    // lighting system's job, these are the physical fixtures seen in the daylight photos)
    if (k.detail > 0.5) {
      const nF = Math.max(3, Math.round(eLine.length / 1.3));
      for (let i = 0; i < nF; i++) {
        const t = (i + 0.5) / nF;
        const p = eLine.at(t);
        const d = eLine.tangent(t);
        let out = v3().crossVectors(d, nrm).normalize();
        if (out.y < 0) out.negate();
        const base = p.clone().addScaledVector(out, 0.25).addScaledVector(nrm, 0.35);
        const fm = basisZ(nrm, out, base);
        W.armor.add(box(0.12, 0.5, 0.12), fm, 0x1a1a1e);
        W.armor.add(box(0.5, 0.14, 0.42), fm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.3, 0)), 0x1a1a1e);
        W.armor.add(box(0.36, 0.36, 0.5), fm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.56, 0.05)), 0x222226);
      }
    }
    // scalloped bottom edge trim (copper tube)
    const bot: V3[] = [];
    for (let i = 0; i <= 12; i++) bot.push(pn.bot(i / 12, v3()));
    if (pi < 2) W.copper.add(tube(bot, () => 0.22, { radial: 6 }), null, PAL.copperDeep);
  });

  // ------------------------------------------------------------------ blade combs on the spars
  const bladeProto = (len: number) => plate(sickleOutline(len, 0.62, len * 0.18, 6), 0.1, 0.03);
  const protos = [bladeProto(1.5), bladeProto(1.9), bladeProto(2.3)];
  fingers.forEach((f, fi) => {
    const n = segs(k, 9, 6);
    for (const sideSign of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const t = 0.22 + (i / (n - 1)) * 0.74;
        const p = f.line.at(t);
        const d = f.line.tangent(t);
        let lat = v3().crossVectors(nrm, d).normalize();
        if (lat.x * s < 0) lat.negate();
        lat.multiplyScalar(sideSign);
        // barbs point away from the spar and back down towards the wrist
        const dir = lat.clone().addScaledVector(d, -0.62).normalize();
        const r = THREE.MathUtils.lerp(0.66, 0.4, t);
        const size = Math.sin(Math.PI * (0.25 + 0.75 * (i / (n - 1)))) > 0.6 ? 2 : 1;
        const proto = protos[fi === 1 ? Math.min(2, size) : size];
        const m = basisZ(nrm, dir, p.clone().addScaledVector(dir, r * 0.8).addScaledVector(nrm, 0.15));
        W.steel.add(proto.clone(), m, 0xd0d4dc);
        // edge LED on the blade
        const len = fi === 1 ? [1.5, 1.9, 2.3][Math.min(2, size)] : [1.5, 1.9, 2.3][size];
        const e0 = v3(-0.2, 0.2, 0.08).applyMatrix4(m);
        const e1 = v3(-0.31 + len * 0.18 * 0.6, len * 0.8, 0.08).applyMatrix4(m);
        W.strips.add([e0, e1], 0, 0.12, t * 20, (fi * 0.3 + i * 0.07) % 1);
      }
    }
  });

  // ------------------------------------------------------------------ finials
  const roof: V3[] = [];
  const points: V3[] = [];
  const flameOutline: THREE.Vector2[] = [
    v2(-1.0, 0), v2(-1.15, 0.9), v2(-0.75, 0.7), v2(-0.85, 1.7), v2(-0.35, 1.3), v2(-0.2, 2.5), v2(0.15, 1.6), v2(0.55, 2.2), v2(0.6, 1.2), v2(1.05, 1.5), v2(1.0, 0),
  ];
  const flameProto = plate(flameOutline, 0.24, 0.05);
  flameProto.scale(1.35, 1.35, 1);
  fingers.forEach((f, i) => {
    const tip = L.tips[i];
    const d = f.line.tangent(1);
    const m = frameY(tip, d, 0, 1, nrm);
    W.armor.add(withAxis(ring(0.55, 0.16, 6, 20), m), null, PAL.bronze);
    // flame plate in the wing plane
    const fm = basisZ(nrm, d, tip.clone().addScaledVector(d, 0.1));
    W.copper.add(flameProto.clone(), fm, i === 1 ? PAL.flameOrange : PAL.flameRed);
    // a second, smaller flame plate across the first so the finial reads as a flame from the side too
    W.copper.add(flameProto.clone(), fm.clone().multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).multiply(new THREE.Matrix4().makeScale(0.72, 0.85, 1)), i === 1 ? PAL.flameRed : PAL.flameOrange);
    const fo = flameOutline.map((p) => v3(p.x * 1.35, p.y * 1.35, 0.2).applyMatrix4(fm));
    fo.push(fo[0].clone());
    W.strips.add(fo, 0, 0.1, 0, 0.9);
    // spear point
    const top = L.finialTops[i];
    const sd = v3().subVectors(top, tip);
    const sl = sd.length();
    W.steel.add(spike(sl, 0.42, { sides: 4, segs: 3, tipR: 0.02 }), frameY(tip.clone().addScaledVector(d, 0.2), sd.normalize(), Math.PI / 4));
    roof.push(top.clone());
    // claw hooks fanning around the base
    for (const ang of [-1.0, -0.5, 0.5, 1.0]) {
      const dir = d.clone().applyAxisAngle(nrm, ang * 0.95).normalize();
      const hm = frameY(tip.clone().addScaledVector(dir, 0.35), dir, 0, 1, nrm);
      W.steel.add(spike(1.2 + (1 - Math.abs(ang)) * 0.6, 0.2, { sides: 5, segs: 4, bendZ: -0.5, bend: ang * 0.35 }), hm);
    }
    // a dot on the collar
    W.bulbs.add(tip.clone().addScaledVector(nrm, 0.7), BULB.accent, i * 3, 0.2, 0.2 * i);
    points.push(tip.clone(), top.clone());
  });
  // wrist and arm join points (for flames along the slopes)
  for (const f of fingers) for (const t of [0.35, 0.6, 0.82]) points.push(f.line.at(t).addScaledVector(nrm, 0.8));

  // ------------------------------------------------------------------ rosette frames + printed suns
  const sunOutline: THREE.Vector2[] = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const r = i % 2 ? 2.25 : 2.75;
    sunOutline.push(v2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const sunProto = plate(sunOutline, 0.08, 0.02);
  const rScale = [0.98, 1.04, 0.86];
  L.rosettes.forEach((c0, i) => {
    // sit the rosette just in front of the (billowing) membrane
    let best = membPts[0];
    let bd = Infinity;
    for (const p of membPts) {
      const d = (p.x - c0.x) ** 2 + (p.y - c0.y) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    const c = c0.clone().setZ(best.z + 0.45);
    c0.copy(c);
    const m = basisZ(nrm, v3(0, 1, 0), c);
    m.scale(v3(rScale[i], rScale[i], 1));
    rosetteFrames.push(m);
    W.armor.add(sunProto.clone(), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.25)), '#f0a030');
    // static accent ring
    const rp: V3[] = [];
    for (let j = 0; j <= 40; j++) {
      const a = (j / 40) * Math.PI * 2;
      rp.push(v3(Math.cos(a) * 2.42, Math.sin(a) * 2.42, 0.3).applyMatrix4(m));
    }
    W.strips.add(rp, 1, 0.12, 0, 0.5 + i * 0.1);
  });

  return { layout: L, rosetteFrames, points, roof };
}

function withAxis(g: THREE.BufferGeometry, m: THREE.Matrix4): THREE.BufferGeometry {
  g.rotateX(Math.PI / 2);
  g.applyMatrix4(m);
  return g;
}

/** Rosette gear geometry (local XY plane, facing +Z, radius ~2.3). */
export function rosetteGear(detail: number): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const seg = Math.max(24, Math.round(48 * detail));
  parts.push(ring(2.22, 0.17, 6, seg));
  parts.push(ring(1.55, 0.1, 5, seg));
  parts.push(ring(0.62, 0.14, 5, 20));
  const teeth = 24;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const b = new THREE.BoxGeometry(0.42, 0.34, 0.26);
    b.translate(2.48, 0, 0);
    b.rotateZ(a);
    parts.push(b);
  }
  const spokes = 12;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + 0.13;
    const b = new THREE.BoxGeometry(1.6, 0.13, 0.18);
    b.translate(1.4, 0, -0.02);
    b.rotateZ(a);
    parts.push(b);
  }
  // star blades between the rings
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const blade = plate([v2(0.6, -0.16), v2(1.5, 0), v2(0.6, 0.16)], 0.12, 0.02);
    blade.rotateZ(a);
    parts.push(blade);
  }
  return parts;
}
