import * as THREE from 'three';
import { Polyline, basisZ, box, circle, frameY, gem, gradientY, plate, qbez, ring, sickleOutline, spike, surface, tube, v2, v3, withFx, type V3 } from './geom';
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
  /** moving-head positions along each membrane panel's leading edge (one row per panel) */
  fixtureRows: V3[][];
  /** festoon bulb strings (polylines): the panels' sagging top edges and the arched arm */
  garlands: V3[][];
}

interface Finger {
  line: Polyline;
  pts: V3[];
}

export function buildWings(k: Kit): { wings: WingResult[]; membrane: THREE.BufferGeometry } {
  const mb = new MembraneBuilder();
  // every wing part carries fx tag 2 (the wash rig can then light the wings and the dragon apart)
  const buckets = [k.world.shell, k.world.armor, k.world.steel, k.world.copper, k.world.lava, k.world.ivory, k.world.flesh, k.world.rider];
  for (const b of buckets) b.tag = WING_FX;
  const wings = [-1, 1].map((s) => buildWing(k, s, mb));
  for (const b of buckets) b.tag = 0;
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
    g.setAttribute('fx', new THREE.Float32BufferAttribute(new Float32Array(n).fill(WING_FX), 1));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

function buildWing(k: Kit, side: number, membranes: MembraneBuilder): WingResult {
  const W = k.world;
  const L = wingLayout(side);
  const s = side;
  const radial = segs(k, 16, 8);
  // wing plane normal (towards the audience; the plane leans back ~30 deg: wrist low in front, finials high behind)
  const nrm = v3().subVectors(L.tips[0], L.wrist).cross(v3().subVectors(L.tips[2], L.wrist)).normalize();
  if (nrm.z < 0) nrm.negate();

  // ------------------------------------------------------------------ arm (shoulder -> wrist)
  const armAt = (t: number, o = v3()) => qbez(L.shoulder, L.armCtrl, L.wrist, t, o);
  const armPts: V3[] = [];
  const an = segs(k, 34, 14);
  for (let j = 0; j <= an; j++) armPts.push(armAt(j / an));
  const arm = new Polyline(armPts);
  const armR = (t: number) => THREE.MathUtils.lerp(1.2, 0.78, t);

  // ------------------------------------------------------------------ fingers
  const bows = [1.2, 0.3, -0.7];
  const fingers: Finger[] = L.tips.map((tip, i) => {
    const base = L.bases[i];
    const mid = v3().lerpVectors(base, tip, 0.5);
    const along = v3().subVectors(tip, base).normalize();
    const perp = v3().crossVectors(nrm, along).normalize();
    // perp points to the finger's left in the wing plane; make it point outward (+x*s)
    if (perp.x * s < 0) perp.negate();
    const ctrl = mid.clone().addScaledVector(perp, bows[i]).addScaledVector(nrm, -0.5);
    const pts: V3[] = [];
    const n = segs(k, 30, 14);
    for (let j = 0; j <= n; j++) pts.push(qbez(base, ctrl, tip, j / n));
    return { line: new Polyline(pts), pts };
  });
  const fingerR = (t: number) => THREE.MathUtils.lerp(0.66, 0.4, t);
  // heel bar tying the outer / middle spar roots together through the wrist knuckle
  W.copper.add(tube([L.bases[0].clone(), L.wrist.clone(), L.bases[1].clone()], () => 0.62, { radial, capStart: true, capEnd: true }), null, PAL.copperDeep);
  fingers.forEach((f, i) => {
    W.copper.add(tube(f.pts, fingerR, { radial, vScale: 3, capStart: i < 2, capEnd: true }), null, i === 1 ? PAL.copper : PAL.copperDeep.clone().lerp(PAL.copper, 0.5));
    // knuckle joints
    for (const t of [0.3, 0.55, 0.78]) {
      const p = f.line.at(t);
      const d = f.line.tangent(t);
      const r = fingerR(t);
      W.armor.add(tube([p.clone().addScaledVector(d, -0.3), p.clone().addScaledVector(d, 0.3)], () => r + 0.14, { radial, capStart: true, capEnd: true }), null, PAL.darkBronze);
    }
    // LED strips along the front face of the spar
    for (const off of [-0.26, 0.26]) {
      const pts: V3[] = [];
      for (let j = 0; j <= 24; j++) {
        const t = 0.06 + (j / 24) * 0.9;
        const p = f.line.at(t);
        const d = f.line.tangent(t);
        const lat = v3().crossVectors(nrm, d).normalize();
        pts.push(p.addScaledVector(nrm, fingerR(t) * 0.9 + 0.06).addScaledVector(lat, off));
      }
      W.strips.add(pts, WING_LED, 0.13, 0, i * 0.2 + (off > 0 ? 0.1 : 0));
    }
  });

  // wrist knuckle + the hooked ivory tusks the wing bottom ends in (they hang to the deck)
  W.armor.add(gem(1.5, 0), new THREE.Matrix4().makeTranslation(L.wrist.x, L.wrist.y, L.wrist.z + 0.2), PAL.plateRed);
  W.armor.add(withAxis(ring(1.1, 0.2, 6, 24), frameY(L.wrist, nrm)), null, PAL.bronze);
  for (const [dx, len, bend] of [
    [0.4, 3.0, 1.3],
    [2.4, 2.4, 1.0],
  ] as const) {
    const g = spike(len, 0.42, { sides: 10, segs: 7, bend: s * bend, tipR: 0.03 });
    gradientY(g, 0, len, PAL.toothRoot, PAL.ivory, 0.35);
    W.ivory.add(g, frameY(L.wrist.clone().add(v3(s * dx, -0.6, 0.5)), v3(s * 0.35, -1, 0.1).normalize(), 0, 1, v3(0, 0, 1)));
  }

  // ------------------------------------------------------------------ arm dressing
  // leopard-patterned arm (daytime photos: the coil arching from the dragon's back into the wing is
  // the same orange / dark-brown hide as the neck, lined with silver scimitars)
  W.lava.add(withFx(tube(armPts, armR, { radial, capStart: true, capEnd: true, vScale: 6 }), 1));
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    const p = arm.at(t);
    const d = arm.tangent(t);
    W.armor.add(tube([p.clone().addScaledVector(d, -0.25), p.clone().addScaledVector(d, 0.25)], () => armR(t) + 0.12, { radial, capStart: true, capEnd: true }), null, i % 2 ? PAL.darkBronze : PAL.bronze);
  }
  {
    const pts: V3[] = [];
    for (let j = 0; j <= 28; j++) {
      const t = j / 28;
      pts.push(arm.at(t).addScaledVector(nrm, armR(t) + 0.06));
    }
    W.strips.add(pts, WING_LED, 0.14, 0, 0.77);
  }
  // perforated bone fin riding along the top of the arm (one continuous curved plate with holes)
  {
    const e1 = v3().subVectors(L.wrist, L.shoulder).normalize();
    const e2 = v3().crossVectors(nrm, e1).normalize();
    if (e2.y < 0) e2.negate();
    const origin = L.shoulder.clone();
    const to2 = (p: V3) => v2(v3().subVectors(p, origin).dot(e1), v3().subVectors(p, origin).dot(e2));
    const n = 30;
    const lower: THREE.Vector2[] = [];
    const upper: THREE.Vector2[] = [];
    for (let i = 0; i <= n; i++) {
      const t = 0.05 + (i / n) * 0.55;
      const p = arm.at(t);
      const d = arm.tangent(t);
      let up = v3().crossVectors(nrm, d).normalize();
      if (up.y < 0) up.negate();
      const h = 0.35 + 1.3 * Math.pow(Math.sin(Math.PI * (i / n)), 0.8);
      lower.push(to2(p.clone().addScaledVector(up, armR(t) * 0.6)));
      const scal = 0.18 * Math.abs(Math.sin((i / n) * Math.PI * 7));
      upper.push(to2(p.clone().addScaledVector(up, armR(t) * 0.6 + h - scal)));
    }
    const outline = [...lower, ...upper.reverse()];
    const holes: THREE.Vector2[][] = [];
    for (let i = 2; i < n - 1; i += 3) {
      const a = lower[i];
      const b = upper[n - i];
      const c = a.clone().lerp(b, 0.5);
      const r = Math.min(0.3, a.distanceTo(b) * 0.28);
      if (r > 0.12) holes.push(circle(c.x, c.y, r, 8, true));
    }
    const fin = plate(outline, 0.16, 0.04, holes);
    const m = new THREE.Matrix4().makeBasis(e1, e2, v3().crossVectors(e1, e2)).setPosition(origin.clone().addScaledVector(nrm, 0.15));
    W.steel.add(fin, m, 0xb4b8c0);
  }
  // sickle hooks hanging below the arm (like scales)
  const hookProto = plate(sickleOutline(2.9, 0.8, 0.9, 7), 0.14, 0.03, [circle(0.05, 0.75, 0.16, 7, true), circle(0.3, 1.45, 0.12, 7, true)]);
  const nHooks = segs(k, 15, 8);
  for (let i = 0; i < nHooks; i++) {
    const t = 0.06 + (i / (nHooks - 1)) * 0.8;
    const p = arm.at(t);
    const d = arm.tangent(t);
    const down = v3().crossVectors(d, nrm).normalize();
    if (down.y > 0) down.negate();
    const hd = down.clone().addScaledVector(d, -0.55 * s * Math.sign(d.x || 1) * s).normalize();
    const m = basisZ(nrm, hd, p.clone().addScaledVector(down, armR(t) * 0.7).addScaledVector(nrm, 0.3));
    W.steel.add(hookProto.clone(), m, 0xe4e7ec);
  }

  // ------------------------------------------------------------------ membranes (Coons patches)
  const rosetteFrames: THREE.Matrix4[] = [];
  const fixtureRows: V3[][] = [];
  const garlands: V3[][] = [];
  // warm festoon riding on top of the arched arm (dragon shoulder -> wrist)
  {
    const g: V3[] = [];
    for (let j = 0; j <= 28; j++) {
      const t = 0.04 + (j / 28) * 0.84;
      const p = arm.at(t);
      const d = arm.tangent(t);
      let up = v3().crossVectors(nrm, d).normalize();
      if (up.y < 0) up.negate();
      // riding high and proud of the arm, so the arc reads over the inner towers from the field
      g.push(p.addScaledVector(up, armR(t) + 0.7).addScaledVector(nrm, armR(t) + 1.1));
    }
    garlands.push(g);
  }
  const nu = segs(k, 22, 10);
  const nv = segs(k, 26, 12);
  const fingerAt = (f: Finger, t: number) => f.line.at(t);
  const sagCurve = (a: V3, b: V3, sag: number) => {
    const c = v3().lerpVectors(a, b, 0.5);
    c.y -= sag;
    c.addScaledVector(nrm, -0.5);
    return (u: number, o: V3) => qbez(a, c, b, u, o);
  };
  const ATT = 0.93; // membranes attach right under the finial discs
  const tipBelow = (f: Finger) => f.line.at(ATT);
  const membPts: V3[] = [];
  const panels: {
    left: (v: number, o: V3) => V3;
    right: (v: number, o: V3) => V3;
    top: (u: number, o: V3) => V3;
    bot: (u: number, o: V3) => V3;
    uvOff: number;
    lenL: number;
    /** bottom trim / hooks on the free lower edge (the outer panel) */
    freeBottom: boolean;
  }[] = [];
  // shallow concave top edges between the finials (photos: ~4 m / ~5.5 m below the chord), the
  // membrane reaching down to the wrist: outer panel between the outer and middle spars
  {
    const fa = fingers[0];
    const fb = fingers[1];
    const t0 = 0.05;
    const b0 = fingerAt(fa, t0);
    const b1 = fingerAt(fb, t0);
    const bc = v3().lerpVectors(b0, b1, 0.5).add(v3(0, 1.0, 0));
    panels.push({
      left: (v, o) => o.copy(fingerAt(fa, t0 + (ATT - t0) * v)),
      right: (v, o) => o.copy(fingerAt(fb, t0 + (ATT - t0) * v)),
      top: sagCurve(tipBelow(fa), tipBelow(fb), 3.8),
      bot: (u, o) => qbez(b0, bc, b1, u, o),
      uvOff: 0.0,
      lenL: fa.line.length * (ATT - t0),
      freeBottom: true,
    });
  }
  // middle panel: middle spar / inner spar, its bottom edge is the arm (wrist -> inner spar root)
  {
    const fa = fingers[1];
    const fb = fingers[2];
    panels.push({
      left: (v, o) => o.copy(fingerAt(fa, ATT * v)),
      right: (v, o) => o.copy(fingerAt(fb, ATT * v)),
      top: sagCurve(tipBelow(fa), tipBelow(fb), 5.4),
      bot: (u, o) => armAt(1 - (1 - L.armJoinT) * u, o),
      uvOff: 0.33,
      lenL: fa.line.length * ATT,
      freeBottom: false,
    });
  }
  // inner panel: inner spar / riser over the shoulder, sagging down to the dragon; bottom = the arm
  {
    const fi = fingers[2];
    const sTop = L.shoulder.clone().add(v3(0, 2.6, -0.4));
    panels.push({
      left: (v, o) => o.copy(fingerAt(fi, ATT * v)),
      right: (v, o) => o.lerpVectors(L.shoulder, sTop, v),
      top: sagCurve(tipBelow(fi), sTop, 3.4),
      bot: (u, o) => armAt(L.armJoinT * (1 - u), o),
      uvOff: 0.66,
      lenL: fi.line.length * ATT,
      freeBottom: false,
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
      if (rib.length > 2) W.copper.add(tube(rib, () => 0.07, { radial: 5 }), null, PAL.copperDeep);
    }

    // top edge: gold trim band (the printed skin's gilded hem), LED strip, small spikes, dots
    const edge: V3[] = [];
    const ne = 24;
    for (let i = 0; i <= ne; i++) edge.push(pn.top(i / ne, v3()).addScaledVector(nrm, 0.12));
    const eLine = new Polyline(edge);
    {
      const band = surface(ne, 1, (u, v, o) => {
        const t = u;
        const p = eLine.at(t);
        const d = eLine.tangent(t);
        let dn = v3().crossVectors(nrm, d).normalize();
        if (dn.y > 0) dn.negate();
        o.copy(p).addScaledVector(dn, v * 0.85 - 0.08).addScaledVector(nrm, 0.1);
      }, [eLine.length / 3, 1]);
      orientTo(band, nrm);
      W.armor.add(band, null, GOLD);
      // rolled lip on the band's upper edge
      W.armor.add(tube(edge.map((p) => p.clone().addScaledVector(nrm, 0.1)), () => 0.12, { radial: 5 }), null, GOLD_DEEP);
    }
    W.strips.add(edge.map((p) => p.clone().addScaledVector(nrm, 0.14)), WING_LED, 0.13, 0, 0.3 + pi * 0.2);
    // warm festoon along the sagging top edge, hanging just in front of the gold band
    {
      const g: V3[] = [];
      for (let i = 0; i <= ne; i++) g.push(pn.top(i / ne, v3()).addScaledVector(nrm, 0.42).add(v3(0, -0.35, 0)));
      garlands.push(g);
    }
    const nSp = pi === 2 ? 5 : 8;
    for (let i = 1; i < nSp; i++) {
      const t = i / nSp;
      const p = eLine.at(t);
      const d = eLine.tangent(t);
      let out = v3().crossVectors(d, nrm).normalize();
      if (out.y < 0) out.negate();
      out.addScaledVector(v3(s, 0, 0), 0.15).normalize();
      W.bulbs.add(p.clone().addScaledVector(nrm, 0.25).addScaledVector(out, -0.3), BULB.wingLed, t * eLine.length, 0.14, (i * 0.13 + pi * 0.3) % 1);
    }
    // row of moving-head bodies on short arms along the top edge (1.3 m pitch; beams are the
    // lighting system's job, these are the physical fixtures seen in the daylight photos)
    {
      const nF = Math.max(3, Math.round(eLine.length / 1.3));
      const row: V3[] = [];
      for (let i = 0; i < nF; i++) {
        const t = (i + 0.5) / nF;
        const p = eLine.at(t);
        const d = eLine.tangent(t);
        let out = v3().crossVectors(d, nrm).normalize();
        if (out.y < 0) out.negate();
        const base = p.clone().addScaledVector(out, 0.25).addScaledVector(nrm, 0.35);
        const fm = basisZ(nrm, out, base);
        row.push(v3(0, 0.56, 0.05).applyMatrix4(fm));
        if (k.detail <= 0.5) continue;
        W.armor.add(box(0.12, 0.5, 0.12), fm, 0x1a1a1e);
        W.armor.add(box(0.5, 0.14, 0.42), fm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.3, 0)), 0x1a1a1e);
        W.armor.add(box(0.36, 0.36, 0.5), fm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.56, 0.05)), 0x222226);
      }
      fixtureRows.push(row);
    }
    // the free lower edge of the outer panel: copper trim + a row of hooked spikes (wing bottom)
    if (pn.freeBottom) {
      const bot: V3[] = [];
      for (let i = 0; i <= 12; i++) bot.push(pn.bot(i / 12, v3()));
      W.copper.add(tube(bot, () => 0.24, { radial: 6 }), null, PAL.copperDeep);
      for (let i = 1; i < 4; i++) {
        const p = pn.bot(i / 4, v3());
        const g = spike(1.5 + (i === 2 ? 0.5 : 0), 0.22, { sides: 6, segs: 4, bend: -s * 0.5, tipR: 0.02 });
        W.steel.add(g, frameY(p.addScaledVector(nrm, 0.2), v3(s * 0.25, -1, 0.1).normalize(), 0, 1, nrm), 0xe8eaee);
      }
    }
  });

  // ------------------------------------------------------------------ arrowheads + kunai blades on the spars
  // (white / silver plates: a chain of big arrowheads ON the spar pointing up to the finial, and at
  // every arrowhead a long perforated kunai blade pointing out sideways, alternating on the middle
  // and inner spars, always outboard on the outer spar - the daytime photos' signature detail)
  const arrowProto = plate([v2(-0.62, 0), v2(-0.2, 0.18), v2(0.2, 0.18), v2(0.62, 0), v2(0, 1.35)], 0.12, 0.025);
  const kunaiOutline = [v2(0, -0.1), v2(0.35, -0.2), v2(1.55, -0.12), v2(2.35, 0), v2(1.55, 0.12), v2(0.35, 0.2), v2(0, 0.1)];
  const kHoles = [0.55, 0.95, 1.35].map((x) => circle(x, 0, 0.07, 6, true));
  const kunaiProto = plate(kunaiOutline, 0.08, 0, k.detail > 0.5 ? kHoles : []);
  fingers.forEach((f, fi) => {
    const n = fi === 2 ? segs(k, 10, 5) : segs(k, 13, 6);
    const t0 = fi === 2 ? 0.1 : 0.14;
    for (let i = 0; i < n; i++) {
      const t = t0 + (i / (n - 1)) * (0.88 - t0);
      const p = f.line.at(t);
      const d = f.line.tangent(t);
      let lat = v3().crossVectors(nrm, d).normalize();
      if (lat.x * s < 0) lat.negate();
      const r = fingerR(t);
      // arrowhead on the spar front, pointing along the spar towards the finial
      const sc = THREE.MathUtils.lerp(1.12, 0.86, t);
      const am = basisZ(nrm, d, p.clone().addScaledVector(nrm, r + 0.08).addScaledVector(d, -0.3));
      am.scale(v3(sc, sc, 1));
      W.steel.add(arrowProto.clone(), am, 0xf0f2f6);
      // kunai blade out to the side (outboard on the outer spar, alternating on the others)
      const sideSign = fi === 0 ? 1 : i % 2 ? 1 : -1;
      const dir = lat.clone().multiplyScalar(sideSign).addScaledVector(d, -0.12).normalize();
      const km = basisZ(nrm, v3().crossVectors(nrm, dir), p.clone().addScaledVector(dir, r * 0.7).addScaledVector(nrm, 0.12));
      // basisZ puts local +Y on the hint: rotate so the blade's +X runs along `dir`
      const kx = v3().setFromMatrixColumn(km, 0);
      if (kx.dot(dir) < 0) km.multiply(new THREE.Matrix4().makeRotationZ(Math.PI));
      km.scale(v3(sc, sc, 1));
      W.steel.add(kunaiProto.clone(), km, 0xe6e9ee);
      // black fixture clamp where the blade meets the spar + an LED along the blade's spine
      if (k.detail > 0.5) W.armor.add(box(0.3, 0.3, 0.34), new THREE.Matrix4().makeTranslation(0, 0, 0).setPosition(p.clone().addScaledVector(dir, r + 0.1).addScaledVector(nrm, 0.3)), 0x1a1a1e);
      const e0 = v3(0.3, 0, 0.06).applyMatrix4(km);
      const e1 = v3(2.1, 0, 0.06).applyMatrix4(km);
      W.strips.add([e0, e1], WING_LED, 0.1, t * 20, (fi * 0.3 + i * 0.07) % 1);
    }
  });

  // ------------------------------------------------------------------ finials
  // (photos: a red-gold sun disc on the spar end, a crescent crown of white blades fanning round it,
  // two perforated gold ear plates below, an orange flame blade above and a white spear point on top)
  const roof: V3[] = [];
  const points: V3[] = [];
  const flameOutline: THREE.Vector2[] = [
    v2(-1.0, 0), v2(-1.15, 0.9), v2(-0.75, 0.7), v2(-0.85, 1.7), v2(-0.35, 1.3), v2(-0.2, 2.5), v2(0.15, 1.6), v2(0.55, 2.2), v2(0.6, 1.2), v2(1.05, 1.5), v2(1.0, 0),
  ];
  const flameProto = plate(flameOutline, 0.2, 0.04);
  const crescentO = sickleOutline(1.9, 0.5, 0.55, 7);
  const crescent = plate(crescentO, 0.1, 0.02);
  const crescentM = plate(mirrorX(crescentO), 0.1, 0.02);
  const earOutline: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = -0.3 + (i / 10) * 2.0;
    earOutline.push(v2(Math.cos(a) * 1.15, Math.sin(a) * 1.15));
  }
  for (let i = 10; i >= 0; i--) {
    const a = -0.1 + (i / 10) * 1.55;
    earOutline.push(v2(0.35 + Math.cos(a) * 0.62, 0.18 + Math.sin(a) * 0.62));
  }
  const earProto = plate(earOutline, 0.1, 0.02, [circle(0.2, 0.95, 0.12, 6, true)]);
  const earProtoM = plate(mirrorX(earOutline), 0.1, 0.02, [mirrorX(circle(0.2, 0.95, 0.12, 6, true))]);
  const discProto = new THREE.SphereGeometry(1, segs(k, 20, 10), segs(k, 12, 6));
  discProto.scale(0.95, 0.95, 0.42);
  fingers.forEach((f, i) => {
    const tip = L.tips[i];
    const d = f.line.tangent(1);
    const m = frameY(tip, d, 0, 1, nrm);
    W.armor.add(withAxis(ring(0.55, 0.16, 6, 20), m), null, PAL.bronze);
    // sun disc: glowing red-orange orb in a gold rim
    const dc = tip.clone().addScaledVector(d, 0.75).addScaledVector(nrm, 0.25);
    const dm = basisZ(nrm, d, dc);
    W.ivory.add(discProto.clone(), dm, SUN_ORB);
    W.armor.add(ring(1.0, 0.13, 6, 28), dm, GOLD);
    // gold ear plates below the disc, curling outwards
    for (const e of [-1, 1]) {
      const em = dm.clone().multiply(new THREE.Matrix4().makeRotationZ(e * 2.3)).multiply(new THREE.Matrix4().makeTranslation(0, 1.0, -0.1));
      W.armor.add((e < 0 ? earProtoM : earProto).clone(), em, GOLD);
    }
    // crescent crown of white blades fanning round the disc
    for (const a of [-1.35, -0.85, -0.4, 0.4, 0.85, 1.35]) {
      const cm = dm.clone().multiply(new THREE.Matrix4().makeRotationZ(-a)).multiply(new THREE.Matrix4().makeTranslation(0, 0.9, 0.05));
      cm.multiply(new THREE.Matrix4().makeScale(0.9 + 0.25 * (1.35 - Math.abs(a)), 0.9 + 0.25 * (1.35 - Math.abs(a)), 1));
      W.steel.add((a < 0 ? crescentM : crescent).clone(), cm, 0xf2f4f8);
    }
    // flame blade above the disc (in the wing plane + a smaller cross plate so it reads from the side)
    const fm = basisZ(nrm, d, tip.clone().addScaledVector(d, 1.55));
    W.copper.add(flameProto.clone(), fm, i === 1 ? PAL.flameOrange : FLAME_YEL);
    W.copper.add(flameProto.clone(), fm.clone().multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).multiply(new THREE.Matrix4().makeScale(0.72, 0.85, 1)), PAL.flameRed);
    const fo = flameOutline.map((p) => v3(p.x, p.y, 0.16).applyMatrix4(fm));
    fo.push(fo[0].clone());
    W.strips.add(fo, WING_LED, 0.1, 0, 0.9);
    // spear point
    const top = L.finialTops[i];
    const sBase = tip.clone().addScaledVector(d, 2.6);
    const sd = v3().subVectors(top, sBase);
    const sl = sd.length();
    W.steel.add(spike(sl, 0.4, { sides: 4, segs: 3, tipR: 0.02 }), frameY(sBase, sd.normalize(), Math.PI / 4), 0xeef0f4);
    roof.push(top.clone());
    // a dot on the collar
    W.bulbs.add(tip.clone().addScaledVector(nrm, 0.7), BULB.wingAccent, i * 3, 0.2, 0.2 * i);
    points.push(tip.clone(), top.clone());
  });
  discProto.dispose();
  // wrist and arm join points (for flames along the slopes)
  for (const f of fingers) for (const t of [0.35, 0.6, 0.82]) points.push(f.line.at(t).addScaledVector(nrm, 0.8));

  // ------------------------------------------------------------------ rosette frames + printed suns
  // (a yellow sunburst printed on the skin inside a dark red ring; the instanced white spiky rim
  // turns with the show)
  const sun = sunburstParts();
  const rScale = [1.05, 1.08, 0.72];
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
    for (const [g, col] of sun) W.ivory.add(g.clone(), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.3)), col);
    // static accent ring
    const rp: V3[] = [];
    for (let j = 0; j <= 40; j++) {
      const a = (j / 40) * Math.PI * 2;
      rp.push(v3(Math.cos(a) * 2.42, Math.sin(a) * 2.42, 0.3).applyMatrix4(m));
    }
    W.strips.add(rp, WING_ACCENT, 0.12, 0, 0.5 + i * 0.1);
  });
  for (const [g] of sun) g.dispose();

  return { layout: L, rosetteFrames, points, roof, fixtureRows, garlands };
}

const GOLD = new THREE.Color('#d9a444');
const GOLD_DEEP = new THREE.Color('#a8762a');
const SUN_ORB = new THREE.Color('#e04a18');
const FLAME_YEL = new THREE.Color('#f39a26');

/** mirror a 2D outline across the Y axis (keeps the winding, so no negative-scale matrices) */
function mirrorX(pts: THREE.Vector2[]): THREE.Vector2[] {
  return pts.map((p) => v2(-p.x, p.y)).reverse();
}

/** flip the winding of a surface so its average normal faces `n` */
function orientTo(g: THREE.BufferGeometry, n: V3): void {
  const nr = g.getAttribute('normal');
  let dot = 0;
  for (let i = 0; i < nr.count; i++) dot += nr.getX(i) * n.x + nr.getY(i) * n.y + nr.getZ(i) * n.z;
  if (dot >= 0) return;
  const idx = g.index!;
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i + 1);
    idx.setX(i + 1, idx.getX(i + 2));
    idx.setX(i + 2, a);
  }
  idx.needsUpdate = true;
  g.computeVertexNormals();
}

/** the printed sunburst of a rosette (local XY, facing +Z, radius ~2.5): [geometry, colour] layers */
function sunburstParts(): [THREE.BufferGeometry, THREE.Color][] {
  const star = (n: number, rIn: number, rOut: number, rot: number, z: number) => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * Math.PI * 2;
      const r = i % 2 ? rIn : rOut * (0.86 + 0.14 * Math.sin(i * 2.7));
      pts.push(v2(Math.cos(a) * r, Math.sin(a) * r));
    }
    const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
    g.translate(0, 0, z);
    return g;
  };
  const disc = (r: number, z: number) => {
    const g = new THREE.CircleGeometry(r, 40);
    g.translate(0, 0, z);
    return g;
  };
  return [
    [disc(2.55, 0), new THREE.Color('#4a0c0c')],
    [disc(2.2, 0.02), new THREE.Color('#d4561a')],
    [star(18, 1.15, 2.18, 0, 0.04), new THREE.Color('#f2a52a')],
    [star(18, 0.95, 1.7, Math.PI / 18, 0.06), new THREE.Color('#ffd23c')],
    [disc(0.9, 0.08), new THREE.Color('#ffe47a')],
  ];
}

/** fx tag of wing geometry (crown shading: step(1.5, fx) = wing) */
export const WING_FX = 2;
/** strip groups of the wing LEDs (crownLed: +2 = wing colours and the wing level) */
const WING_LED = 2;
const WING_ACCENT = 3;

function withAxis(g: THREE.BufferGeometry, m: THREE.Matrix4): THREE.BufferGeometry {
  g.rotateX(Math.PI / 2);
  g.applyMatrix4(m);
  return g;
}

/**
 * Rosette rim geometry (local XY plane, facing +Z, radius ~2.9): the white spiky crown ring round the
 * printed sunburst (photos) - a rolled rim, a thin inner ring, 24 outward spikes and 12 small inward
 * teeth. Instanced; the show turns it (look.rosetteAngle).
 */
export function rosetteGear(detail: number): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const seg = Math.max(24, Math.round(56 * detail));
  parts.push(ring(2.5, 0.13, 6, seg));
  parts.push(ring(2.24, 0.06, 4, seg));
  const spikeO = plate([v2(-0.13, 0), v2(0.13, 0), v2(0, 0.48)], 0.1, 0);
  const spikeI = plate([v2(-0.09, 0), v2(0.09, 0), v2(0, 0.3)], 0.08, 0);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const g = spikeO.clone();
    g.translate(0, 2.58, 0);
    g.rotateZ(a);
    parts.push(g);
  }
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2;
    const g = spikeI.clone();
    g.rotateZ(Math.PI);
    g.translate(0, 2.42, 0.02);
    g.rotateZ(a);
    parts.push(g);
  }
  spikeO.dispose();
  spikeI.dispose();
  return parts;
}
