import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { Collider2D } from '../core/types';
import { GeoBuilder, lin } from './geom';
import { FIRST_AID, ROAD, terrainHeight, TOILETS, WATER_POINTS } from './site';
import { canvasTexture, makeCanvas } from './tex';
import { patchWorldMaterial } from './worldLights';

/**
 * Field furniture: original Defqon-style wayfinding boards, free-water tap stands (important in the
 * 2026 heat plan: "free drinking water at all toilet facilities", extra water points — FACT
 * crowd-and-bars §3.4), the first-aid post, toilet blocks, food trucks / merch stand silhouettes,
 * bins, red-and-black flags on poles (wind from NNW, animated from show time), light masts with red
 * obstruction lights, and amber road lighting. Positions: terrain-analysis §7/§14 (floorplan legend)
 * where known, otherwise ASSUMPTION placed at the field edges.
 */

export interface PropsOut {
  colliders: Collider2D[];
  triangles: number;
  update: (t: number) => void;
  /** emissive point lights (road lamps, obstruction lights) for the distant-lights layer */
  lamps: { x: number; y: number; z: number; color: string; size: number; kind: number }[];
}

const galv = lin('#8d9196');

/** yaw that makes local +Z face from (x,z) towards (tx,tz) */
const faceYaw = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z);

const SIGN_CELLS = ['MAINSTAGE RED', 'EXIT', 'FREE WATER', 'FIRST AID', 'BAR', 'TOILETS', 'EXIT', 'STAY HYDRATED'] as const;

export function buildProps(scene: THREE.Object3D, lowDetail: boolean): PropsOut {
  const colliders: Collider2D[] = [];
  const lamps: PropsOut['lamps'] = [];
  let tris = 0;
  const metal = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.5, roughness: 0.55 }), { key: 'props-metal' });
  const add = (o: THREE.Mesh | THREE.InstancedMesh) => {
    scene.add(o);
    const n = o.geometry.getAttribute('position').count / 3;
    tris += n * ((o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1);
  };
  const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], name: string) => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, mats.length));
    m.count = mats.length;
    mats.forEach((mm, i) => m.setMatrixAt(i, mm));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.name = name;
    add(m);
    return m;
  };
  const place = (x: number, z: number, yaw: number, s = 1) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, terrainHeight(x, z), z), new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw), new THREE.Vector3(s, s, s));

  // ------------------------------------------------------------------ wayfinding signs (lightboxes)
  {
    const signs: [number, number, number, number, number][] = [
      // x, z, face-towards-x, face-towards-z, cell
      [110, 152, 170, 172, 0],
      [-110, 140, -150, 150, 0],
      [62, 133, 0, 70, 1],
      [-62, 129, 0, 70, 6],
      [-102, 146, -60, 128, 5],
      [-72, 160, -40, 135, 2],
      [106, 130, 60, 118, 3],
      [-94, 90, -60, 60, 4],
      [94, 88, 60, 60, 4],
      [-24, 140, -10, 175, 7],
      [30, 139, 10, 100, 7],
      [48, 124, 10, 100, 2],
      [-48, 124, -10, 100, 2],
      [-35, 150, -10, 120, 1],
      [35, 150, 10, 120, 6],
    ];
    const post = new GeoBuilder();
    const mats: THREE.Matrix4[] = [];
    const cells = new Float32Array(signs.length * 2);
    signs.forEach(([x, z, tx, tz, cell], i) => {
      const yaw = faceYaw(x, z, tx, tz);
      const m = place(x, z, yaw);
      post.add(GeoBuilder.unit('box'), m.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(-0.95, 1.4, -0.05), new THREE.Quaternion(), new THREE.Vector3(0.08, 2.8, 0.08))), galv);
      post.add(GeoBuilder.unit('box'), m.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(0.95, 1.4, -0.05), new THREE.Quaternion(), new THREE.Vector3(0.08, 2.8, 0.08))), galv);
      post.add(GeoBuilder.unit('box'), m.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, 2.3, -0.1), new THREE.Quaternion(), new THREE.Vector3(2.1, 1.1, 0.12))), lin('#111113'));
      mats.push(m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 2.3, -0.035)));
      cells[i * 2] = cell % 2;
      cells[i * 2 + 1] = 3 - Math.floor(cell / 2);
      colliders.push({ kind: 'circle', x, z, r: 1.1, tag: 'sign' });
    });
    const pm = new THREE.Mesh(post.build(), metal);
    pm.name = 'sign-posts';
    add(pm);
    const tex = signAtlas();
    const face = new THREE.PlaneGeometry(2.0, 1.0);
    face.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2));
    const mat = patchWorldMaterial(
      new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color(0.55, 0.55, 0.55), roughness: 0.4 }),
      {
        key: 'signs',
        edit: (sh) => {
          sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\nattribute vec2 aCell;')
            .replace(
              '#include <uv_vertex>',
              '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = ( uv + aCell ) * vec2( 0.5, 0.25 );\n#endif\n#ifdef USE_EMISSIVEMAP\nvEmissiveMapUv = ( uv + aCell ) * vec2( 0.5, 0.25 );\n#endif',
            );
        },
      },
    );
    inst(face, mat, mats, 'sign-faces');
  }

  // ------------------------------------------------------------------ free water tap stands
  {
    const spots: [number, number, number][] = [
      ...WATER_POINTS.map(([x, z]) => [x, z, faceYaw(x, z, 0, 120)] as [number, number, number]),
      // heat-plan extra points (ASSUMPTION): back of the floor and the crest ends
      [50, 121, faceYaw(50, 121, 0, 80)],
      [-50, 121, faceYaw(-50, 121, 0, 80)],
      [100, 94, faceYaw(100, 94, 40, 60)],
      [-100, 94, faceYaw(-100, 94, -40, 60)],
    ];
    const b = new GeoBuilder();
    const blue = lin('#1a5fb4');
    for (const [x, z, yaw] of spots) {
      const m = place(x, z, yaw);
      const put = (w: number, h: number, d: number, px: number, py: number, pz: number, c: [number, number, number]) =>
        b.add(GeoBuilder.unit('box'), m.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion(), new THREE.Vector3(w, h, d))), c);
      put(3.2, 0.22, 0.55, 0, 0.82, 0, galv);
      for (const lx of [-1.5, 1.5]) for (const lz of [-0.22, 0.22]) put(0.05, 0.8, 0.05, lx, 0.4, lz, galv);
      put(3.0, 0.07, 0.07, 0, 1.3, -0.18, galv);
      for (let k = 0; k < 6; k++) put(0.04, 0.16, 0.12, -1.25 + k * 0.5, 1.2, -0.1, lin('#c9ccd0'));
      // blue banner pole with a drop pictogram board
      put(0.08, 3.4, 0.08, 1.8, 1.7, 0, galv);
      put(0.9, 0.9, 0.05, 1.8, 3.1, 0.06, blue);
      colliders.push({ kind: 'circle', x, z, r: 1.9, tag: 'water' });
    }
    const wm = new THREE.Mesh(b.build(), metal);
    wm.name = 'water-points';
    add(wm);
    // emissive drop icons (small bright blue squares on the boards)
    for (const [x, z, yaw] of spots) {
      const p = new THREE.Vector3(1.8, 3.1, 0.1).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
      lamps.push({ x: x + p.x, y: terrainHeight(x, z) + p.y, z: z + p.z, color: '#3a8cff', size: 0.9, kind: 0 });
    }
  }

  // ------------------------------------------------------------------ first-aid post (EHBO, floorplan (117, 123))
  {
    const [x, z] = FIRST_AID;
    const yaw = faceYaw(x, z, 60, 110);
    const m = place(x, z, yaw);
    const b = new GeoBuilder();
    const white = lin('#d8dadc');
    const put = (g: THREE.BufferGeometry, px: number, py: number, pz: number, s: THREE.Vector3, c: [number, number, number], rotY = 0) =>
      b.add(g, m.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rotY), s)), c);
    // pagoda tent 6 × 6 m with a pointed roof
    put(GeoBuilder.unit('box'), 0, 1.25, 0, new THREE.Vector3(6, 2.5, 6), white);
    const roof = new THREE.ConeGeometry(4.3, 2.4, 4);
    put(roof, 0, 3.7, 0, new THREE.Vector3(1, 1, 1), white, Math.PI / 4);
    // green cross panel (white cross on green, ISO 7010 E003 style) over the entrance
    put(GeoBuilder.unit('box'), 0, 2.2, 3.03, new THREE.Vector3(1.5, 1.0, 0.05), lin('#0b8a3a'));
    put(GeoBuilder.unit('box'), 0, 2.2, 3.07, new THREE.Vector3(0.9, 0.24, 0.02), white);
    put(GeoBuilder.unit('box'), 0, 2.2, 3.07, new THREE.Vector3(0.24, 0.8, 0.02), white);
    // cooling container (heat plan: first-aid posts with air-conditioning, FACT)
    put(GeoBuilder.unit('box'), 5.2, 1.3, -1.0, new THREE.Vector3(2.5, 2.6, 6.0), lin('#9aa3a8'));
    put(GeoBuilder.unit('box'), 5.2, 2.75, -1.0, new THREE.Vector3(1.0, 0.35, 0.8), lin('#5a5f63'));
    const fm = new THREE.Mesh(b.build(), metal);
    fm.name = 'first-aid';
    add(fm);
    colliders.push({ kind: 'box', minX: x - 4.5, maxX: x + 7.5, minZ: z - 4.5, maxZ: z + 4.5, tag: 'firstaid' });
    const p = new THREE.Vector3(0, 2.2, 3.1).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
    lamps.push({ x: x + p.x, y: terrainHeight(x, z) + p.y, z: z + p.z, color: '#2fe07a', size: 1.2, kind: 0 });
    lamps.push({ x: x + p.x * 1.3, y: terrainHeight(x, z) + 2.9, z: z + p.z * 1.3, color: '#ffe8c0', size: 1.0, kind: 0 });
  }

  // ------------------------------------------------------------------ toilet blocks (floorplan restroom legend)
  {
    const unit = new GeoBuilder();
    unit.box(1.15, 2.2, 1.2, 0, 1.1, 0, 0xffffff);
    unit.box(1.2, 0.08, 1.25, 0, 2.24, 0, lin('#d0d4d8'));
    unit.box(0.8, 1.9, 0.02, 0, 1.0, 0.61, lin('#dde1e5'));
    const mats: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];
    for (const t of TOILETS) {
      const n = Math.floor((t.x1 - t.x0) / 1.25);
      for (let i = 0; i < n; i++)
        for (const [zz, yaw] of [[t.z0 + 0.7, Math.PI], [t.z1 - 0.7, 0]] as [number, number][]) {
          const x = t.x0 + 0.6 + i * 1.25;
          mats.push(place(x, zz, yaw));
          cols.push(new THREE.Color(i % 7 === 3 ? '#2d8a4a' : '#1d4f9c'));
        }
      colliders.push({ kind: 'box', minX: t.x0, maxX: t.x1, minZ: t.z0, maxZ: t.z1, tag: 'toilets' });
      lamps.push({ x: (t.x0 + t.x1) / 2, y: 3.4, z: t.z0 - 0.5, color: '#fff2d8', size: 1.4, kind: 0 });
    }
    const mat = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), { key: 'toilets', lamps: false });
    const m = inst(unit.build(), mat, mats, 'toilets');
    cols.forEach((c, i) => m.setColorAt(i, c));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  // ------------------------------------------------------------------ food trucks + merch stand (edge silhouettes)
  {
    const b = new GeoBuilder();
    const trucks: [number, number, number, string][] = [
      [146, 172, faceYaw(146, 172, 140, 150), '#5b1016'],
      [156, 175, faceYaw(156, 175, 150, 155), '#1b1b1d'],
      [166, 178, faceYaw(166, 178, 160, 158), '#d6cfbd'],
      [-146, 118, faceYaw(-146, 118, -120, 120), '#1b1b1d'],
      [-150, 106, faceYaw(-150, 106, -120, 110), '#6a1a12'],
      [-152, 94, faceYaw(-152, 94, -125, 98), '#2c3e2a'],
    ];
    for (const [x, z, yaw, c] of trucks) {
      const m = place(x, z, yaw);
      const put = (w: number, h: number, d: number, px: number, py: number, pz: number, col: [number, number, number]) =>
        b.add(GeoBuilder.unit('box'), m.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion(), new THREE.Vector3(w, h, d))), col);
      put(6.4, 2.6, 2.4, 0, 1.75, 0, lin(c));
      put(1.8, 1.6, 2.3, 3.9, 1.25, 0, lin('#202022'));
      put(3.8, 1.0, 0.05, -0.4, 2.0, 1.22, lin('#0a0a0a'));
      put(4.2, 0.06, 1.3, -0.4, 2.75, 1.8, lin('#1a1a1a'));
      for (const wx of [-2.2, 2.2, 3.9]) for (const wz of [-1.1, 1.1]) put(0.8, 0.8, 0.25, wx, 0.4, wz, lin('#0a0a0a'));
      colliders.push({ kind: 'circle', x, z, r: 3.6, tag: 'stall' });
      const p = new THREE.Vector3(-0.4, 2.45, 1.4).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
      lamps.push({ x: x + p.x, y: terrainHeight(x, z) + p.y, z: z + p.z, color: '#ffb46a', size: 1.6, kind: 2 });
    }
    // merch stand: container with a black canopy (official 2026 merch: caps, tees, hand fans)
    {
      const x = -72,
        z = 152;
      const m = place(x, z, faceYaw(x, z, -40, 130));
      const put = (w: number, h: number, d: number, px: number, py: number, pz: number, col: [number, number, number]) =>
        b.add(GeoBuilder.unit('box'), m.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion(), new THREE.Vector3(w, h, d))), col);
      put(6.0, 2.6, 2.4, 0, 1.3, 0, lin('#141416'));
      put(6.4, 0.08, 2.4, 0, 2.7, 2.2, lin('#101012'));
      put(5.6, 0.6, 0.05, 0, 3.0, 1.24, lin('#7a0f1a'));
      colliders.push({ kind: 'box', minX: x - 3.4, maxX: x + 3.4, minZ: z - 3.4, maxZ: z + 3.4, tag: 'stall' });
      lamps.push({ x, y: terrainHeight(x, z) + 2.5, z: z + 2.4, color: '#ffd9a0', size: 1.5, kind: 0 });
    }
    const sm = new THREE.Mesh(b.build(), metal);
    sm.name = 'stalls';
    add(sm);
  }

  // ------------------------------------------------------------------ bins (200 L drums with lids)
  {
    const g = new GeoBuilder();
    g.cylinder(0.3, 0.9, 0, 0.45, 0, 0xffffff, 12);
    g.cylinder(0.33, 0.06, 0, 0.93, 0, lin('#303033'), 12);
    g.cylinder(0.12, 0.05, 0, 0.98, 0, lin('#202022'), 8);
    const rng = new Rng(19);
    const groups: [number, number][] = [
      [60, 130], [-60, 126], [100, 140], [-100, 136], [48, 118], [-48, 118], [96, 96], [-96, 96], [-16, 139], [140, 165], [-140, 110],
      [-80, 168], [110, 124], [-106, 150], [24, 147], [-24, 147], [96, 30], [-96, 30], [102, 60], [-102, 60],
    ];
    const mats: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];
    for (const [gx, gz] of groups) {
      const n = 2 + rng.int(0, 2);
      for (let k = 0; k < n; k++) {
        const x = gx + k * 0.75 + rng.range(-0.1, 0.1),
          z = gz + rng.range(-0.2, 0.2);
        mats.push(place(x, z, rng.range(0, 6.28)));
        cols.push(new THREE.Color(rng.pick(['#1b1b1e', '#2a2d31', '#6e1116', '#1b1b1e'])));
      }
      colliders.push({ kind: 'circle', x: gx + 0.75, z: gz, r: 1.2, tag: 'bin' });
    }
    const mat = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.3 }), { key: 'bins' });
    const m = inst(g.build(), mat, mats, 'bins');
    cols.forEach((c, i) => m.setColorAt(i, c));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  // ------------------------------------------------------------------ flags on poles (red/black, animated cloth)
  let flagU: { uTime: { value: number } } | null = null;
  {
    const poles: [number, number, number][] = []; // x, z, pole height
    for (let z = 4; z <= 100; z += 12) {
      poles.push([-106.5, z, 8]);
      poles.push([106.5, z, 8]);
    }
    for (const x of [-66, -54, 54, 66]) poles.push([x, 138.5, 6.5]);
    poles.push([108, 150, 7], [124, 139, 7], [-108, 126, 7], [-124, 138, 7]);
    const count = lowDetail ? poles.filter((_, i) => i % 2 === 0).length : poles.length;
    const used = lowDetail ? poles.filter((_, i) => i % 2 === 0) : poles;
    const pg = new GeoBuilder();
    pg.cylinder(0.045, 1, 0, 0.5, 0, galv, 6);
    const pm: THREE.Matrix4[] = [];
    const fm: THREE.Matrix4[] = [];
    const design = new Float32Array(count);
    const rng = new Rng(7);
    used.forEach(([x, z, h], i) => {
      const y = terrainHeight(x, z);
      pm.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)));
      // flag hangs from the pole top; wind from NNW streams it towards −Z (local +X = downwind)
      const yaw = Math.PI / 2 + rng.range(-0.25, 0.25) - 0.26;
      fm.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y + h - 0.05, z), new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw), new THREE.Vector3(1, 1, 1)));
      design[i] = rng.int(0, 3);
      colliders.push({ kind: 'circle', x, z, r: 0.3, tag: 'flag' });
    });
    inst(pg.build(), metal, pm, 'flag-poles');
    const cloth = new THREE.PlaneGeometry(2.4, 1.5, 12, 5);
    cloth.translate(1.2, -0.75, 0);
    cloth.setAttribute('aDesign', new THREE.InstancedBufferAttribute(design, 1));
    const U = { uTime: { value: 0 } };
    flagU = U;
    const tex = flagAtlas();
    const mat = patchWorldMaterial(new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.85 }), {
      key: 'flags',
      edit: (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aDesign;')
          .replace(
            '#include <begin_vertex>',
            /* glsl */ `#include <begin_vertex>
            {
              float u = clamp( position.x / 2.4, 0.0, 1.0 );
              float seed = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.11;
              float w = sin( u * 7.0 - uTime * 5.2 + seed ) * 0.5 + sin( u * 13.0 - uTime * 8.3 + seed * 1.7 ) * 0.2;
              transformed.z += w * u * 0.32;
              transformed.y += ( sin( uTime * 2.1 + seed ) * 0.08 - 0.12 ) * u * u;
              transformed.x -= abs( w ) * u * 0.06;
            }`,
          )
          .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = vec2( ( uv.x + aDesign ) * 0.25, uv.y );\n#endif');
      },
    });
    const fmesh = inst(cloth, mat, fm, 'flags');
    fmesh.frustumCulled = false;
  }

  // ------------------------------------------------------------------ light masts (off during the show) + obstruction lights
  {
    const b = new GeoBuilder();
    const masts: [number, number, number][] = [
      [104, 110, 15],
      [-104, 106, 15],
      [70, 140, 9],
      [-70, 136, 9],
      [106, 8, 9],
      [-106, 8, 9],
    ];
    for (const [x, z, h] of masts) {
      const y = terrainHeight(x, z);
      b.beam(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + h, z), 0.16, galv, true);
      // trailer base
      b.box(2.2, 0.6, 1.4, x, y + 0.5, z, lin('#c9b23a'));
      // lamp head (4 floods, off)
      b.box(1.6, 0.5, 0.25, x, y + h + 0.1, z, lin('#2a2a2c'));
      colliders.push({ kind: 'circle', x, z, r: 1.3, tag: 'mast' });
      if (h > 12) lamps.push({ x, y: y + h + 0.5, z, color: '#ff2010', size: 1.4, kind: 3 });
    }
    // amber road lighting along the main road (permanent site lighting, ASSUMPTION)
    for (let i = 1; i < ROAD.length; i++) {
      const [ax, az] = ROAD[i - 1];
      const [bx, bz] = ROAD[i];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.floor(len / 34);
      for (let k = 0; k <= n; k++) {
        const t = n ? k / n : 0;
        // lamp posts on the south verge of the road
        const x = ax + (bx - ax) * t,
          z = az + (bz - az) * t + 7.5;
        if (Math.abs(x) < 50 && z < 160) continue; // keep the back of the RED floor dark
        const y = terrainHeight(x, z);
        b.beam(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + 8, z), 0.1, galv, true);
        b.box(0.8, 0.15, 0.3, x - 0.3, y + 8, z, lin('#2a2a2c'));
        lamps.push({ x: x - 0.5, y: y + 7.9, z, color: '#ffa640', size: 1.1, kind: 0 });
      }
    }
    const mm = new THREE.Mesh(b.build(), metal);
    mm.name = 'masts';
    add(mm);
  }

  return {
    colliders,
    triangles: tris,
    lamps,
    update: (t: number) => {
      if (flagU) flagU.uTime.value = t;
    },
  };
}

// -------------------------------------------------------------------------------------------------

function condensedText(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, maxW: number, weight = 900) {
  g.save();
  g.font = `${weight} ${size}px "Arial Narrow", "Roboto Condensed", Impact, "Helvetica Neue", Arial, sans-serif`;
  const w = g.measureText(text).width;
  const sx = Math.min(0.8, maxW / Math.max(1, w));
  g.translate(x, y);
  g.scale(sx, 1);
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, 0);
  g.restore();
}

function arrow(g: CanvasRenderingContext2D, x: number, y: number, s: number, dir: 'up' | 'right' | 'left') {
  g.save();
  g.translate(x, y);
  g.rotate(dir === 'up' ? 0 : dir === 'right' ? Math.PI / 2 : -Math.PI / 2);
  g.fillStyle = '#efeae0';
  g.beginPath();
  g.moveTo(0, -s);
  g.lineTo(s * 0.8, 0);
  g.lineTo(s * 0.3, 0);
  g.lineTo(s * 0.3, s);
  g.lineTo(-s * 0.3, s);
  g.lineTo(-s * 0.3, 0);
  g.lineTo(-s * 0.8, 0);
  g.closePath();
  g.fill();
  g.restore();
}

/** original wayfinding board designs: black lightbox, red top bar, condensed white type, pictograms */
function signAtlas(): THREE.CanvasTexture {
  const [c, g] = makeCanvas(1024, 1024);
  const cw = 512,
    ch = 256;
  SIGN_CELLS.forEach((label, i) => {
    const x = (i % 2) * cw,
      y = Math.floor(i / 2) * ch;
    const accent = label === 'FIRST AID' ? '#0b8a3a' : label === 'FREE WATER' || label === 'STAY HYDRATED' ? '#1a5fb4' : '#a3101f';
    g.fillStyle = '#0c0c0e';
    g.fillRect(x, y, cw, ch);
    g.fillStyle = accent;
    g.fillRect(x, y, cw, 34);
    g.fillRect(x, y + ch - 10, cw, 10);
    g.strokeStyle = '#3a3a3e';
    g.lineWidth = 6;
    g.strokeRect(x + 3, y + 3, cw - 6, ch - 6);
    // pictogram panel on the left
    const px = x + 90,
      py = y + 140;
    g.fillStyle = accent;
    g.fillRect(px - 62, py - 62, 124, 124);
    if (label === 'MAINSTAGE RED') arrow(g, px, py, 44, 'up');
    else if (label === 'EXIT') arrow(g, px, py, 44, i === 1 ? 'right' : 'left');
    else if (label === 'FIRST AID') {
      g.fillStyle = '#fff';
      g.fillRect(px - 42, py - 13, 84, 26);
      g.fillRect(px - 13, py - 42, 26, 84);
    } else if (label === 'FREE WATER' || label === 'STAY HYDRATED') {
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo(px, py - 46);
      g.bezierCurveTo(px + 40, py, px + 36, py + 42, px, py + 42);
      g.bezierCurveTo(px - 36, py + 42, px - 40, py, px, py - 46);
      g.fill();
    } else if (label === 'BAR') {
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(px, py, 44, 0, Math.PI * 2);
      g.fill();
      condensedText(g, 'B', px, py + 3, 70, accent, 60);
    } else if (label === 'TOILETS') {
      g.fillStyle = '#fff';
      for (const dx of [-22, 22]) {
        g.beginPath();
        g.arc(px + dx, py - 30, 11, 0, Math.PI * 2);
        g.fill();
        g.fillRect(px + dx - 12, py - 16, 24, 56);
      }
    }
    const sub = label === 'STAY HYDRATED' ? 'FREE WATER AT ALL TOILETS' : label === 'MAINSTAGE RED' ? 'HOLY GROUNDS' : label === 'FREE WATER' ? 'REFILL HERE' : label === 'FIRST AID' ? 'EHBO • MEDICAL' : label === 'EXIT' ? 'UITGANG' : label === 'BAR' ? 'DRINKS • WATER' : 'WC';
    condensedText(g, label, x + 320, y + 118, 84, '#efeae0', 330);
    condensedText(g, sub, x + 320, y + 190, 40, '#b9b3a8', 320, 700);
  });
  return canvasTexture(c, { aniso: 4 });
}

/** 4 original red/black flag designs (no logos): flame, split, chevrons, ember emblem */
function flagAtlas(): THREE.CanvasTexture {
  const [c, g] = makeCanvas(1024, 256);
  const w = 256,
    h = 256;
  for (let i = 0; i < 4; i++) {
    const x = i * w;
    g.fillStyle = i % 2 ? '#0e0e10' : '#9c0f1d';
    g.fillRect(x, 0, w, h);
    g.save();
    g.beginPath();
    g.rect(x, 0, w, h);
    g.clip();
    if (i === 0) {
      g.fillStyle = '#0e0e10';
      g.beginPath();
      g.moveTo(x, h);
      for (let k = 0; k <= 8; k++) g.lineTo(x + (k * w) / 8, h * (k % 2 ? 0.35 : 0.6));
      g.lineTo(x + w, h);
      g.fill();
    } else if (i === 1) {
      g.fillStyle = '#9c0f1d';
      g.fillRect(x, 0, w, h * 0.33);
      g.fillRect(x, h * 0.67, w, h * 0.33);
    } else if (i === 2) {
      g.fillStyle = '#0e0e10';
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.moveTo(x + k * 70 - 40, 0);
        g.lineTo(x + k * 70 + 20, h / 2);
        g.lineTo(x + k * 70 - 40, h);
        g.lineTo(x + k * 70 - 10, h);
        g.lineTo(x + k * 70 + 50, h / 2);
        g.lineTo(x + k * 70 - 10, 0);
        g.fill();
      }
    } else {
      g.fillStyle = '#c2410f';
      g.beginPath();
      g.moveTo(x + w / 2, h * 0.15);
      g.bezierCurveTo(x + w * 0.85, h * 0.5, x + w * 0.7, h * 0.85, x + w / 2, h * 0.88);
      g.bezierCurveTo(x + w * 0.3, h * 0.85, x + w * 0.15, h * 0.5, x + w / 2, h * 0.15);
      g.fill();
      g.fillStyle = '#ffb347';
      g.beginPath();
      g.arc(x + w / 2, h * 0.62, h * 0.12, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    // hem
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(x, 0, 8, h);
  }
  return canvasTexture(c, { aniso: 2 });
}
