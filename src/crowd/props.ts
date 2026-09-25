import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Performer props (one merged mesh, one draw call):
 *  - the piano riser in the field (bible §5.11: X ±2.8, Z 57–61, deck Y 0.6, railing on 3 sides,
 *    steps at the back) with the WHITE GRAND PIANO of Domitor Draconis and its vertical light tube
 *    (laser source ≈ (0, 1.8, 59), f094);
 *  - the lead dancer's round pedestal on the deck (0, 1.9, −2) (group 2, shown 640–735 s);
 *  - the aerialist's strap in the DJ arch (group 3);
 *  - tripods + cameras on the FOH platform and on the premium-deck photo terrace (photo P).
 * Attribute aProp = (group, emissive): group 0 static, 1 light tube, 2 pedestal, 3 strap.
 */

type G = THREE.BufferGeometry;

function part(g: G, color: string, group = 0, emissive = 0): G {
  const geo = g.index ? g.toNonIndexed() : g;
  if (geo !== g) g.dispose();
  geo.deleteAttribute('uv');
  const n = geo.getAttribute('position').count;
  const c = new THREE.Color(color);
  const col = new Float32Array(n * 3);
  const pr = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    pr[i * 2] = group;
    pr[i * 2 + 1] = emissive;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aProp', new THREE.BufferAttribute(pr, 2));
  return geo;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, ry = 0): G {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

function cyl(r0: number, r1: number, h: number, x: number, y: number, z: number, seg = 10): G {
  const g = new THREE.CylinderGeometry(r1, r0, h, seg);
  g.translate(x, y + h / 2, z);
  return g;
}

function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 5): G {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q);
  const m = a.clone().add(b).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** grand-piano case outline (top view, local: keyboard edge at z = 0, tail towards −z) */
function pianoShape(): THREE.Shape {
  const s = new THREE.Shape();
  const W = 1.5;
  const Lg = 1.9;
  s.moveTo(-W / 2, 0);
  s.lineTo(W / 2, 0);
  s.lineTo(W / 2, -0.55);
  s.bezierCurveTo(W / 2, -1.15, W * 0.05, -1.05, -0.05, -Lg + 0.25);
  s.bezierCurveTo(-0.15, -Lg - 0.02, -W / 2, -Lg, -W / 2, -Lg + 0.3);
  s.lineTo(-W / 2, 0);
  return s;
}

function tripod(x: number, y: number, z: number, h: number, facing: number): G[] {
  const parts: G[] = [];
  const head = v(x, y + h, z);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    parts.push(part(rod(head, v(x + Math.cos(a) * 0.42, y, z + Math.sin(a) * 0.42), 0.014), '#1b1b1d'));
  }
  parts.push(part(box(0.2, 0.2, 0.36, x, y + h + 0.14, z, facing), '#111113'));
  const lens = new THREE.CylinderGeometry(0.06, 0.07, 0.2, 10);
  lens.rotateX(Math.PI / 2);
  lens.rotateY(facing);
  lens.translate(x + Math.sin(facing) * 0.25, y + h + 0.15, z + Math.cos(facing) * 0.25);
  parts.push(part(lens, '#0b0b0c'));
  return parts;
}

export function buildProps(): G {
  const parts: G[] = [];
  // ---- piano riser (black deck, dark skirt, aluminium railing on 3 sides, steps at the back)
  parts.push(part(box(5.6, 0.6, 4.0, 0, 0.3, 59), '#141416'));
  parts.push(part(box(5.64, 0.02, 4.04, 0, 0.61, 59), '#1d1d20'));
  const rail = '#7d8086';
  const railPts: [number, number][] = [
    [-2.75, 61], [-2.75, 57.05], [2.75, 57.05], [2.75, 61],
  ];
  for (let i = 0; i < railPts.length - 1; i++) {
    const [x0, z0] = railPts[i];
    const [x1, z1] = railPts[i + 1];
    parts.push(part(rod(v(x0, 1.7, z0), v(x1, 1.7, z1), 0.022, 6), rail));
    parts.push(part(rod(v(x0, 1.15, z0), v(x1, 1.15, z1), 0.016, 6), rail));
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.3));
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n;
      const z = z0 + ((z1 - z0) * k) / n;
      parts.push(part(rod(v(x, 0.6, z), v(x, 1.7, z), 0.02, 5), rail));
    }
  }
  parts.push(part(box(1.6, 0.2, 0.35, 0, 0.1, 61.2), '#1a1a1c'));
  parts.push(part(box(1.6, 0.2, 0.35, 0, 0.3, 61.0), '#1a1a1c'));

  // ---- white grand piano (keyboard facing +Z so the pianist faces the stage)
  const lacquer = '#efede6';
  const base = new THREE.Vector3(0.0, 0.6, 59.95);
  const caseGeo = new THREE.ExtrudeGeometry(pianoShape(), { depth: 0.3, bevelEnabled: false, curveSegments: 10 });
  caseGeo.rotateX(Math.PI / 2);
  caseGeo.translate(base.x, base.y + 1.0, base.z);
  parts.push(part(caseGeo, lacquer));
  // inner frame (dark soundboard seen from above)
  const inner = new THREE.ShapeGeometry(pianoShape(), 10);
  inner.rotateX(-Math.PI / 2);
  inner.scale(0.9, 1, -0.9);
  inner.translate(base.x, base.y + 0.985, base.z - 0.08);
  parts.push(part(inner, '#6b5a3a'));
  // keyboard: key bed, white keys, black keys
  parts.push(part(box(1.46, 0.08, 0.28, base.x, base.y + 0.7, base.z + 0.12), lacquer));
  parts.push(part(box(1.3, 0.025, 0.16, base.x, base.y + 0.755, base.z + 0.14), '#f6f3ea'));
  for (let k = 0; k < 35; k++) {
    if (![0, 1, 3, 4, 5].includes(k % 7)) continue;
    const x = base.x - 0.63 + (k + 1) * 0.036;
    parts.push(part(box(0.016, 0.022, 0.09, x, base.y + 0.775, base.z + 0.11), '#0c0c0c'));
  }
  parts.push(part(box(1.5, 0.12, 0.08, base.x, base.y + 0.82, base.z + 0.01), lacquer)); // fallboard
  parts.push(part(box(0.9, 0.3, 0.02, base.x, base.y + 1.12, base.z - 0.06), '#e9e6de')); // music desk
  // legs + pedal lyre
  for (const [lx, lz] of [
    [-0.66, -0.12],
    [0.66, -0.12],
    [0.02, -1.55],
  ]) {
    parts.push(part(cyl(0.055, 0.075, 0.72, base.x + lx, base.y, base.z + lz, 8), lacquer));
  }
  parts.push(part(box(0.18, 0.62, 0.05, base.x, base.y + 0.05, base.z - 0.2), lacquer));
  parts.push(part(box(0.3, 0.04, 0.12, base.x, base.y + 0.06, base.z - 0.14), '#c9a45c'));
  // bench
  parts.push(part(box(0.8, 0.07, 0.36, base.x, base.y + 0.5, base.z + 0.52), '#101012'));
  for (const sx of [-0.34, 0.34]) for (const sz of [0.38, 0.66]) parts.push(part(box(0.04, 0.48, 0.04, base.x + sx, base.y + 0.24, base.z + sz), '#101012'));
  // the vertical light tube standing in the piano (the Domitor Draconis laser source)
  parts.push(part(cyl(0.035, 0.035, 0.1, 0.12, 1.55, 58.75, 10), '#303036'));
  parts.push(part(cyl(0.045, 0.045, 0.72, 0.12, 1.62, 58.75, 12), '#ffffff', 1, 14));

  // ---- lead dancer's pedestal on the deck
  parts.push(part(cyl(0.8, 0.72, 0.5, 0, 1.9, -2, 24), '#5f5d62', 2));
  parts.push(part(cyl(0.74, 0.74, 0.02, 0, 2.4, -2, 24), '#8a878c', 2));
  // ---- aerialist strap from the arch crown
  parts.push(part(box(0.05, 2.0, 0.012, 0, 6.2, -6.8), '#b01a22', 3));

  // ---- camera tripods: FOH platform and the photo terrace (photo P)
  parts.push(...tripod(0.8, 0.5, 88.95, 1.45, Math.PI));
  parts.push(...tripod(0.6, 5.0, 167.95, 1.35, Math.PI));

  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error('crowd props: merge failed');
  merged.computeBoundingSphere();
  return merged;
}
