import * as THREE from 'three';
import type { App } from '../core/App';

/**
 * Developer aid (only with `?fxproxy`): a crude silhouette of the 2026 MainStage from
 * research/stage-canonical.md plus canonical anchor positions, so the effects can be judged at the
 * right scale while the real stage/world modules are built elsewhere. Never active in normal runs.
 */
export function installFxProxy(app: App): void {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const row = (n: number, x0: number, x1: number, y: number, z: number) =>
    Array.from({ length: n }, (_, i) => V(x0 + ((x1 - x0) * i) / Math.max(1, n - 1), y, z));
  const mirror = (pts: THREE.Vector3[]) => [...pts, ...pts.map((p) => V(-p.x, p.y, p.z))];
  const a = app.anchors;
  const arm = (side: number) => Array.from({ length: 8 }, (_, i) => V(side * (62 + i * 3.8), 7.2, 3 + i * 3.1));
  a.set('deck_front', [...row(24, -46, 46, 2.0, -0.3), ...arm(-1), ...arm(1)]);
  a.set('wing_left', [V(-14, 24.5, -6), V(-18, 19, -6), V(-24, 17, -6), V(-28, 25, -6), V(-33, 18.5, -6), V(-39, 24, -6)]);
  a.set('wing_right', [V(14, 24.5, -6), V(18, 19, -6), V(24, 17, -6), V(28, 25, -6), V(33, 18.5, -6), V(39, 24, -6)]);
  a.set('wing_tips', [V(-39, 25.5, -6), V(39, 25.5, -6)]);
  a.set('towers_top', mirror([V(-14, 16, -7), V(-34, 14.5, -8), V(-46, 13.5, -8)]));
  a.set('roof', row(14, -46, 46, 10, -9));
  a.set('dragon_mouth', [V(0, 11, -2)]);
  a.set('dragon_head', [V(0, 14, -4)]);
  a.set('pillars_top', mirror([46.5, 73.5, 100.7, 127.7].map((z) => V(-22, 14.6, z))));
  a.set('fireworks_back', row(9, -80, 80, 0, -45));
  a.set('fireworks_sides', [V(-95, 0, 12), V(95, 0, 12), V(-90, 0, 32), V(90, 0, 32)]);

  const dark = new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.9, metalness: 0.1, emissive: '#050507' });
  const red = new THREE.MeshStandardMaterial({ color: '#5a1a14', roughness: 0.7, metalness: 0.3, emissive: '#120202' });
  const g = new THREE.Group();
  g.name = 'fx-proxy-stage';
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m = dark) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y + h / 2, z);
    g.add(mesh);
    return mesh;
  };
  box(100, 1.9, 18, 0, 0, -9); // deck
  box(96, 9.3, 10, 0, 1.9, -12); // castle
  for (const x of [-46, -34, -20, 20, 34, 46]) box(5, 14 - 1.9, 5, x, 1.9, -8);
  box(9, 11, 9, 0, 8, -6, red); // dragon head
  for (const s of [-1, 1]) {
    // wings: triangular fans of spars
    for (const [tx, ty] of [
      [14, 24.5],
      [28, 25],
      [39, 24],
    ]) {
      const len = Math.hypot(tx - 6, ty - 10);
      const spar = new THREE.Mesh(new THREE.BoxGeometry(1.2, len, 1.2), red);
      spar.position.set(s * (6 + tx) / 2, (10 + ty) / 2, -7);
      spar.rotation.z = s * Math.atan2(tx - 6, ty - 10);
      g.add(spar);
    }
    const arm = new THREE.Mesh(new THREE.BoxGeometry(34, 7, 6), dark);
    arm.position.set(s * 74, 3.5, 12);
    arm.rotation.y = -s * Math.atan2(24, 28);
    g.add(arm);
    for (const z of [46.5, 73.5, 100.7, 127.7]) box(3.2, 14.5, 3.2, s * 22, 0, z);
  }
  app.scene.add(g);
  let hidden = false;
  app.onFrame(() => {
    if (hidden) return;
    const ph = app.scene.getObjectByName('placeholder-stage');
    if (ph) {
      ph.visible = false;
      hidden = true;
    }
  });
}
