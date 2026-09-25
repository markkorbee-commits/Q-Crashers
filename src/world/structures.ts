import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { Collider2D } from '../core/types';
import { GeoBuilder, lin } from './geom';
import { ARM_TIP, CAM_PEN, DECKING, FOH, PILLAR, PILLARS, PIT_Z, PREMIUM, RISER, STAGE_HALF, terrainHeight, WATER_Y } from './site';
import { canvasTexture, makeCanvas } from './tex';
import { patchWorldMaterial } from './worldLights';

/**
 * Man-made field structures: the front-of-stage barrier, crowd barriers (pillar rings, camera pen,
 * FOH ring, queue lanes), Heras perimeter fences with black scrim banners, the FOH / press tower,
 * the camera pen and riser on the axis, the RED entrance gates, and the Exclusive RED Experience
 * deck over the lake. Everything is instanced or merged per material.
 */

export interface StructureOut {
  colliders: Collider2D[];
  triangles: number;
  drawables: THREE.Object3D[];
}

const galv = lin('#8d9196');
const alu = lin('#b7bcc2');
const blackCloth = lin('#141416');

/** panels along a polyline, returns their transforms (panel local: centred, width along +X) */
function panelsAlong(pts: [number, number][], width: number, closed = false): THREE.Matrix4[] {
  const out: THREE.Matrix4[] = [];
  const list = closed ? [...pts, pts[0]] : pts;
  for (let i = 1; i < list.length; i++) {
    const [ax, az] = list[i - 1];
    const [bx, bz] = list[i];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / width));
    const yaw = Math.atan2(-(bz - az), bx - ax);
    const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
    const s = len / n / width;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = ax + (bx - ax) * t,
        z = az + (bz - az) * t;
      out.push(new THREE.Matrix4().compose(new THREE.Vector3(x, terrainHeight(x, z), z), q, new THREE.Vector3(s, 1, 1)));
    }
  }
  return out;
}

function rectLoop(cx: number, cz: number, w: number, d: number, gap = 0): [number, number][][] {
  const x0 = cx - w / 2,
    x1 = cx + w / 2,
    z0 = cz - d / 2,
    z1 = cz + d / 2;
  if (gap <= 0)
    return [[[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]]];
  // leave a gate gap in the middle of the +Z side
  return [[[cx - gap / 2, z1], [x0, z1], [x0, z0], [x1, z0], [x1, z1], [cx + gap / 2, z1]]];
}

export function buildStructures(scene: THREE.Object3D, lowDetail: boolean): StructureOut {
  const colliders: Collider2D[] = [];
  const drawables: THREE.Object3D[] = [];
  let tris = 0;
  const metal = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.45 }), { key: 'metal' });
  const addInst = (geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], name: string) => {
    if (!mats.length) return;
    const m = new THREE.InstancedMesh(geo, mat, mats.length);
    mats.forEach((mm, i) => m.setMatrixAt(i, mm));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.name = name;
    scene.add(m);
    drawables.push(m);
    tris += (geo.getAttribute('position').count / 3) * mats.length;
  };
  const addMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, name: string) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    scene.add(m);
    drawables.push(m);
    tris += geo.getAttribute('position').count / 3;
    return m;
  };

  // ------------------------------------------------------------------ crowd barrier panels (2.5 m)
  const crowd: THREE.Matrix4[] = [];
  {
    // pillar rings (≈ 8.2 m square around each plinth, gate towards the aisle side)
    for (const p of PILLARS) {
      for (const loop of rectLoop(p.x, p.z, PILLAR.fence, PILLAR.fence)) crowd.push(...panelsAlong(loop, 2.5));
      colliders.push({ kind: 'box', minX: p.x - PILLAR.fence / 2, maxX: p.x + PILLAR.fence / 2, minZ: p.z - PILLAR.fence / 2, maxZ: p.z + PILLAR.fence / 2, tag: 'pillar' });
    }
    // camera pen and riser on the axis
    for (const loop of rectLoop(CAM_PEN.x, CAM_PEN.z, CAM_PEN.w, CAM_PEN.d)) crowd.push(...panelsAlong(loop, 2.5));
    colliders.push({ kind: 'box', minX: CAM_PEN.x - CAM_PEN.w / 2, maxX: CAM_PEN.x + CAM_PEN.w / 2, minZ: CAM_PEN.z - CAM_PEN.d / 2, maxZ: CAM_PEN.z + CAM_PEN.d / 2, tag: 'campen' });
    for (const loop of rectLoop(RISER.x, RISER.z, RISER.w + 1.6, RISER.d + 1.6)) crowd.push(...panelsAlong(loop, 2.5));
    colliders.push({ kind: 'box', minX: RISER.x - RISER.w / 2 - 0.8, maxX: RISER.x + RISER.w / 2 + 0.8, minZ: RISER.z - RISER.d / 2 - 0.8, maxZ: RISER.z + RISER.d / 2 + 0.8, tag: 'riser' });
    // FOH ring
    const fw = FOH.x1 - FOH.x0 + 4,
      fd = FOH.z1 - FOH.z0 + 4;
    for (const loop of rectLoop(0, (FOH.z0 + FOH.z1) / 2, fw, fd, 2.5)) crowd.push(...panelsAlong(loop, 2.5));
  }
  const crowdGeo = crowdBarrierGeometry(lowDetail);
  addInst(crowdGeo, metal, crowd, 'crowd-barriers');

  // ------------------------------------------------------------------ front-of-stage barrier (Mojo type, 1 m sections)
  const mojo: THREE.Matrix4[] = [];
  {
    mojo.push(...panelsAlong([[-STAGE_HALF + 2, PIT_Z], [STAGE_HALF - 2, PIT_Z]], 1));
    // along the forward stage arms, 3 m in front of them
    for (const s of [-1, 1]) mojo.push(...panelsAlong([[s * (STAGE_HALF - 2), PIT_Z], [s * (ARM_TIP.x + 3), ARM_TIP.z + 3]], 1));
  }
  addInst(mojoGeometry(), metal, mojo, 'pit-barrier');

  // ------------------------------------------------------------------ Heras fences (3.5 m) with scrim / bare mesh
  const herasScrim: THREE.Matrix4[] = [];
  const herasBare: THREE.Matrix4[] = [];
  const scrimCell: number[] = [];
  {
    const rng = new Rng(61);
    const scrimLines: [number, number][][] = [
      // arm tips to the bank crests: separates the audience from backstage
      [[-(ARM_TIP.x + 3), ARM_TIP.z + 3], [-108, ARM_TIP.z + 3]],
      [[ARM_TIP.x + 3, ARM_TIP.z + 3], [108, ARM_TIP.z + 3]],
      // crest outer edges above the tree belts
      [[-109.5, ARM_TIP.z + 3], [-109.5, 99]],
      [[109.5, ARM_TIP.z + 3], [109.5, 99]],
      // back corners (diagonal boundary)
      [[109.5, 99], [130, 150]],
      [[-109.5, 99], [-109.5, 120], [-135, 150]],
    ];
    for (const line of scrimLines) {
      const ps = panelsAlong(line, 3.5);
      for (const p of ps) {
        herasScrim.push(p);
        const r = rng.next();
        scrimCell.push(r < 0.55 ? 0 : r < 0.72 ? 1 : r < 0.84 ? 2 : r < 0.94 ? 3 : 4);
      }
    }
    // lake front: bare mesh so the water stays visible
    herasBare.push(...panelsAlong([[-120, 173.5], [DECKING.x0, 173.5]], 3.5));
    herasBare.push(...panelsAlong([[DECKING.x1 + 4, 173.5], [125, 173.5]], 3.5));
  }
  const herasFrame = herasFrameGeometry();
  addInst(herasFrame, metal, [...herasScrim, ...herasBare], 'heras-frames');
  {
    const tex = scrimAtlas();
    const mat = patchWorldMaterial(
      new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 }),
      {
        key: 'scrim',
        lamps: true,
        edit: (sh) => {
          sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\nattribute vec2 aCell;')
            .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = ( uv + aCell ) * vec2( 0.5, 0.25 );\n#endif');
        },
      },
    );
    const g = new THREE.PlaneGeometry(3.45, 1.95);
    g.translate(0, 1.075, 0);
    const n = herasScrim.length + herasBare.length;
    const cell = new Float32Array(n * 2);
    // atlas: 2 columns x 4 rows (cells 0..4 scrim designs, 7 = bare wire mesh)
    for (let i = 0; i < n; i++) {
      const c = i < herasScrim.length ? scrimCell[i] : 7;
      cell[i * 2] = c % 2;
      cell[i * 2 + 1] = 3 - Math.floor(c / 2);
    }
    g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 2));
    addInst(g, mat, [...herasScrim, ...herasBare], 'heras-scrim');
  }

  // ------------------------------------------------------------------ FOH / press tower
  {
    const b = new GeoBuilder();
    const y0 = terrainHeight(0, (FOH.z0 + FOH.z1) / 2);
    const tube = 0.05;
    const xs = [FOH.x0, -5.33, -2.67, 0, 2.67, 5.33, FOH.x1];
    const zs = [FOH.z0, FOH.z0 + 2.5, FOH.z0 + 5, FOH.z0 + 7.5, FOH.z1];
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y0 + y, z);
    for (const x of xs) for (const z of zs) b.beam(V(x, 0, z), V(x, FOH.roof, z), tube, galv, true);
    for (const y of [0.25, FOH.deck1, 3.2, FOH.deck2, 7.6, FOH.roof - 0.1]) {
      for (const z of zs) b.beam(V(FOH.x0, y, z), V(FOH.x1, y, z), tube, galv, true);
      for (const x of xs) b.beam(V(x, y, FOH.z0), V(x, y, FOH.z1), tube, galv, true);
    }
    // diagonal bracing on the back and the sides
    for (let i = 1; i < xs.length; i++) b.beam(V(xs[i - 1], FOH.deck1, FOH.z1), V(xs[i], FOH.deck2, FOH.z1), tube, galv, true);
    for (const x of [FOH.x0, FOH.x1]) for (let j = 1; j < zs.length; j++) b.beam(V(x, 0.25, zs[j - 1]), V(x, FOH.deck1 + 2, zs[j]), tube, galv, true);
    // decks (plywood) and roof
    const ply = lin('#3a3530');
    b.box(FOH.x1 - FOH.x0 + 0.3, 0.12, FOH.z1 - FOH.z0 + 0.3, 0, y0 + FOH.deck1, (FOH.z0 + FOH.z1) / 2, ply);
    b.box(FOH.x1 - FOH.x0 + 0.3, 0.12, FOH.z1 - FOH.z0 + 0.3, 0, y0 + FOH.deck2, (FOH.z0 + FOH.z1) / 2, ply);
    // front railings
    for (const y of [FOH.deck1, FOH.deck2]) {
      b.beam(V(FOH.x0, y + 1.05, FOH.z0 - 0.05), V(FOH.x1, y + 1.05, FOH.z0 - 0.05), 0.045, alu, true);
      b.beam(V(FOH.x0, y + 0.55, FOH.z0 - 0.05), V(FOH.x1, y + 0.55, FOH.z0 - 0.05), 0.035, alu, true);
    }
    // stairs on the +X side
    for (let k = 0; k < 10; k++) b.box(1.1, 0.06, 0.32, FOH.x1 + 0.8, y0 + 0.12 + k * 0.11, FOH.z1 - 0.4 - k * 0.3, galv);
    for (let k = 0; k < 14; k++) b.box(1.1, 0.06, 0.3, FOH.x1 + 0.8, y0 + FOH.deck1 + 0.32 * (k + 1), FOH.z0 + 0.6 + k * 0.62, galv);
    // desks: sound (ground deck) and light/pyro/laser (upper deck), road cases, followspots, camera
    const desk = lin('#141417');
    for (const [x, w] of [[-4.5, 2.4], [-1.2, 2.0], [2.2, 2.6], [5.4, 1.4]] as [number, number][]) {
      b.box(w, 0.9, 1.0, x, y0 + FOH.deck1 + 0.45, FOH.z0 + 1.6, desk);
      b.box(w * 0.96, 0.08, 0.9, x, y0 + FOH.deck1 + 0.93, FOH.z0 + 1.55, lin('#222226'));
    }
    for (const [x, w] of [[-5, 2.0], [-2.4, 1.6], [0.2, 1.6], [2.8, 2.2]] as [number, number][]) {
      b.box(w, 0.9, 1.0, x, y0 + FOH.deck2 + 0.45, FOH.z0 + 2.4, desk);
    }
    for (let k = 0; k < 8; k++) b.box(0.6, 1.2, 0.8, -7 + k * 1.9, y0 + FOH.deck1 + 0.6, FOH.z1 - 0.8, lin('#101012'));
    // followspots (long cans on stands) at the upper-deck front, aimed at the stage
    for (const x of [-6.2, 5.9]) {
      b.beam(V(x, FOH.deck2, FOH.z0 + 0.9), V(x, FOH.deck2 + 1.2, FOH.z0 + 0.9), 0.08, galv, true);
      b.beam(V(x, FOH.deck2 + 1.45, FOH.z0 + 1.6), V(x, FOH.deck2 + 1.3, FOH.z0 + 0.1), 0.34, lin('#1a1a1c'), true);
    }
    // press camera on a tripod (the Endshow photo was taken from about here)
    b.beam(V(0.6, FOH.deck2, FOH.z0 + 0.8), V(0.6, FOH.deck2 + 1.45, FOH.z0 + 0.8), 0.04, galv, true);
    b.box(0.2, 0.16, 0.3, 0.6, y0 + FOH.deck2 + 1.52, FOH.z0 + 0.7, lin('#0c0c0c'));
    addMesh(b.build(), metal, 'foh-scaffold');

    // black scrim + roof canvas (cloth material)
    const cloth = patchWorldMaterial(new THREE.MeshStandardMaterial({ color: '#0f0f11', roughness: 0.92, side: THREE.DoubleSide }), { key: 'cloth' });
    const c = new GeoBuilder();
    const W = FOH.x1 - FOH.x0,
      D = FOH.z1 - FOH.z0;
    const zc = (FOH.z0 + FOH.z1) / 2;
    // back wall (full height) and side walls (upper level + lower level half height)
    c.box(W, FOH.roof - 0.3, 0.02, 0, y0 + (FOH.roof - 0.3) / 2 + 0.3, FOH.z1 + 0.06, blackCloth);
    for (const x of [FOH.x0 - 0.06, FOH.x1 + 0.06]) {
      c.box(0.02, FOH.roof - FOH.deck2 - 0.3, D, x, y0 + (FOH.deck2 + FOH.roof - 0.3) / 2, zc, blackCloth);
      c.box(0.02, FOH.deck2 - 0.4, D, x, y0 + (FOH.deck2 + 0.4) / 2 - 0.1, zc, blackCloth);
    }
    // front skirt under deck 1 and the upper-deck fascia banner
    c.box(W, FOH.deck1 - 0.1, 0.02, 0, y0 + FOH.deck1 / 2, FOH.z0 - 0.08, blackCloth);
    c.box(W + 0.4, 0.9, 0.04, 0, y0 + FOH.roof - 0.45, FOH.z0 - 0.3, lin('#5b0a15'));
    // pitched roof (slight fall to the back)
    const roof = new THREE.BoxGeometry(W + 1.6, 0.18, D + 1.8);
    const rm = new THREE.Matrix4().compose(V(0, FOH.roof + 0.25, zc), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.06), new THREE.Vector3(1, 1, 1));
    c.add(roof, rm, lin('#0b0b0c'));
    addMesh(c.build(), cloth, 'foh-cloth');
    colliders.push({ kind: 'box', minX: FOH.x0 - 2, maxX: FOH.x1 + 2, minZ: FOH.z0 - 2, maxZ: FOH.z1 + 2, tag: 'foh' });

    // desk screens (emissive): consoles glowing blue-white under the roof
    const scr = new GeoBuilder();
    const W_FOH = FOH.x1 - FOH.x0;
    for (const [x, w] of [[-4.5, 2.4], [-1.2, 2.0], [2.2, 2.6]] as [number, number][]) scr.box(w * 0.5, 0.4, 0.02, x, y0 + FOH.deck1 + 1.25, FOH.z0 + 1.95, lin('#9fc4ff'), -0.0);
    for (const [x, w] of [[-5, 2.0], [-2.4, 1.6], [0.2, 1.6], [2.8, 2.2]] as [number, number][]) scr.box(w * 0.7, 0.45, 0.02, x, y0 + FOH.deck2 + 1.25, FOH.z0 + 2.75, lin('#c8dcff'));
    // warm LED work strips under both decks' ceilings (dimmed show mode) + desk lamps
    for (const y of [FOH.deck2 - 0.25, FOH.roof - 0.35]) scr.box(W_FOH - 1, 0.05, 0.08, 0, y0 + y, FOH.z0 + 0.6, lin('#ff9a40'));
    for (const x of [-4.5, -1.2, 2.2, -5, -2.4, 0.2, 2.8]) scr.box(0.12, 0.06, 0.12, x, y0 + (x > -5.1 && [-5, -2.4, 0.2, 2.8].includes(x) ? FOH.deck2 : FOH.deck1) + 1.45, FOH.z0 + 1.7, lin('#ffd9a0'));
    const screenMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.4, 1.4, 1.4) });
    addMesh(scr.build(), screenMat, 'foh-screens');
  }

  // ------------------------------------------------------------------ camera pen + riser on the axis
  {
    const b = new GeoBuilder();
    const y = terrainHeight(RISER.x, RISER.z);
    b.box(RISER.w, RISER.h, RISER.d, RISER.x, y + RISER.h / 2, RISER.z, lin('#1a1a1c'));
    for (const sx of [-1, 1]) b.box(0.06, 1.0, RISER.d, RISER.x + sx * (RISER.w / 2 - 0.05), y + RISER.h + 0.5, RISER.z, alu);
    // stage-camera on a tripod + a small jib base in the pen
    const yp = terrainHeight(CAM_PEN.x, CAM_PEN.z);
    const tri = new THREE.Vector3(CAM_PEN.x + 1.5, yp + 1.5, CAM_PEN.z);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      b.beam(new THREE.Vector3(tri.x + Math.cos(a) * 0.55, yp, tri.z + Math.sin(a) * 0.55), tri, 0.035, lin('#222'), true);
    }
    b.box(0.3, 0.3, 0.55, tri.x, tri.y + 0.2, tri.z - 0.1, lin('#0d0d0d'));
    b.box(0.6, 0.5, 0.6, CAM_PEN.x - 2.5, yp + 0.25, CAM_PEN.z + 1, lin('#18181a'));
    b.box(1.1, 0.75, 0.7, CAM_PEN.x - 0.8, yp + 0.37, CAM_PEN.z + 1.3, lin('#131315'));
    addMesh(b.build(), metal, 'axis-riser');
  }

  // ------------------------------------------------------------------ entrance gates (E1 back-right main, E2 back-left)
  {
    const b = new GeoBuilder();
    // yaw: local +Z = walking direction into the field (towards its centre)
    const gates: [number, number, number][] = [
      [116, 144, Math.atan2(-0.6, -0.8)],
      [-116, 132, Math.atan2(0.85, -0.53)],
    ];
    const banners: THREE.Matrix4[] = [];
    for (const [x, z, yaw] of gates) {
      const y = terrainHeight(x, z);
      const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
      const base = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
      const put = (w: number, h: number, d: number, px: number, py: number, pz: number, c: [number, number, number]) => {
        b.add(GeoBuilder.unit('box'), base.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion(), new THREE.Vector3(w, h, d))), c);
      };
      // two scaffold towers (1.5 m square, 7 m) clad in black, a 12 m header truss with a banner
      for (const sx of [-7, 7]) {
        put(1.6, 7, 1.6, sx, 3.5, 0, blackCloth);
        put(1.9, 0.3, 1.9, sx, 7.15, 0, lin('#2a2a2d'));
      }
      put(15.6, 0.5, 0.5, 0, 6.6, 0, lin('#2a2a2d'));
      put(15.6, 0.5, 0.5, 0, 5.3, 0, lin('#2a2a2d'));
      banners.push(base.clone().multiply(new THREE.Matrix4().makeTranslation(0, 5.95, 0.3)));
      // second print on the back (FrontSide planes: text never reads mirrored)
      banners.push(base.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, 5.95, -0.3), new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.PI), new THREE.Vector3(1, 1, 1))));
      colliders.push({ kind: 'circle', x: x + Math.cos(yaw) * 7, z: z - Math.sin(yaw) * 7, r: 1.3, tag: 'gate' });
      colliders.push({ kind: 'circle', x: x - Math.cos(yaw) * 7, z: z + Math.sin(yaw) * 7, r: 1.3, tag: 'gate' });
    }
    addMesh(b.build(), metal, 'entrance-gates');
    // gate banners: "MAINSTAGE RED" (emissive lightbox print)
    const tex = gateBannerTexture();
    const g = new THREE.PlaneGeometry(13.5, 1.5);
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.9, 0.9, 0.9) });
    addInst(g, mat, banners, 'gate-banners');
  }

  // ------------------------------------------------------------------ Exclusive RED Experience deck over the lake
  {
    const b = new GeoBuilder();
    const deckY = WATER_Y + 2.4;
    const wood = lin('#4a3a2c');
    b.box(PREMIUM.x1 - PREMIUM.x0, 0.4, PREMIUM.z1 - PREMIUM.z0 - 4, (PREMIUM.x0 + PREMIUM.x1) / 2, deckY - 0.2, (PREMIUM.z0 + 4 + PREMIUM.z1) / 2, wood);
    // piles
    for (let x = PREMIUM.x0 + 2; x < PREMIUM.x1; x += 6)
      for (let z = PREMIUM.z0 + 6; z < PREMIUM.z1; z += 6) b.box(0.3, 3, 0.3, x, WATER_Y + 0.3, z, lin('#2a2420'));
    // railings along the front (towards the field) and sides
    for (let x = PREMIUM.x0; x < PREMIUM.x1; x += 2.5) b.box(0.05, 1.1, 0.05, x, deckY + 0.55, PREMIUM.z0 + 4, alu);
    b.box(PREMIUM.x1 - PREMIUM.x0, 0.05, 0.05, (PREMIUM.x0 + PREMIUM.x1) / 2, deckY + 1.1, PREMIUM.z0 + 4, alu);
    // ramps from the decking
    for (const x of [-26, -10, 22, 40]) {
      const a = new THREE.Vector3(x, terrainHeight(x, DECKING.z1 - 3) + 0.1, DECKING.z1 - 3);
      const c2 = new THREE.Vector3(x, deckY, PREMIUM.z0 + 4.5);
      b.beam(a, c2, 0.1, wood);
      b.box(2.4, 0.15, c2.z - a.z, x, (a.y + c2.y) / 2, (a.z + c2.z) / 2, wood);
    }
    addMesh(b.build(), metal, 'premium-deck');
    // three white tensile roofs (sail tents) — the "luxurious tent with a large sky terrace" (FACT, Q-dance)
    const sails = new GeoBuilder();
    for (const [x0, x1] of [[-53, -20], [-12, 13], [16, 50]] as [number, number][]) {
      const cx = (x0 + x1) / 2,
        w = x1 - x0;
      const g = new THREE.PlaneGeometry(w, 13, 8, 4);
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) / w,
          v = p.getY(i) / 13;
        // hyperbolic-paraboloid saddle
        p.setZ(i, (u * u - v * v) * 7 + 5.5);
      }
      g.rotateX(-Math.PI / 2);
      g.computeVertexNormals();
      sails.add(g, new THREE.Matrix4().makeTranslation(cx, deckY, 194.5), lin('#8a857b'));
      for (const sx of [-0.5, 0.5]) for (const sz of [-6.5, 6.5]) sails.box(0.2, 8, 0.2, cx + sx * w, deckY + 4, 194.5 + sz, alu);
    }
    const sailMat = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }), { key: 'sail', lamps: false });
    addMesh(sails.build(), sailMat, 'premium-sails');
  }

  return { colliders, triangles: tris, drawables };
}

// -------------------------------------------------------------------------------------------------
// panel geometries

/** galvanised crowd-control barrier ("dranghek"), 2.5 m × 1.1 m, local width along X */
function crowdBarrierGeometry(low: boolean): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const W = 2.5,
    H = 1.1;
  b.box(W, 0.04, 0.04, 0, H, 0, galv);
  b.box(W, 0.035, 0.035, 0, 0.2, 0, galv);
  for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) {
    b.box(0.04, H, 0.04, x, H / 2, 0, galv);
    // flat feet across the panel
    b.box(0.05, 0.03, 0.72, x, 0.02, 0, galv);
  }
  const bars = low ? 7 : 13;
  for (let i = 1; i <= bars; i++) b.box(0.016, H - 0.22, 0.016, -W / 2 + (W * i) / (bars + 1), 0.2 + (H - 0.2) / 2, 0, galv);
  return b.build();
}

/** Mojo-style pit barrier section (1 m): front plate, top rail, audience footplate (+Z side) */
function mojoGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  b.box(0.98, 1.2, 0.035, 0, 0.62, 0.05, alu);
  b.box(1.0, 0.08, 0.14, 0, 1.24, 0.05, alu);
  const plate = new THREE.BoxGeometry(0.98, 0.025, 1.0);
  b.add(plate, new THREE.Matrix4().compose(new THREE.Vector3(0, 0.07, 0.56), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.08), new THREE.Vector3(1, 1, 1)), alu);
  // rear braces on the pit side
  for (const x of [-0.4, 0.4]) {
    b.beam(new THREE.Vector3(x, 1.18, 0.03), new THREE.Vector3(x, 0.02, -0.75), 0.04, alu);
    b.box(0.06, 0.04, 0.9, x, 0.02, -0.35, alu);
  }
  return b.build();
}

/** Heras temporary fence frame (3.5 × 2 m) on two concrete feet */
function herasFrameGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const W = 3.45,
    H = 2.0;
  for (const x of [-W / 2, W / 2]) b.box(0.04, H, 0.04, x, 0.12 + H / 2, 0, galv);
  b.box(W, 0.04, 0.04, 0, 0.12 + H, 0, galv);
  b.box(W, 0.04, 0.04, 0, 0.14, 0, galv);
  for (const x of [-W / 2, W / 2]) b.box(0.22, 0.14, 0.62, x, 0.07, 0, lin('#6c6a66'));
  return b.build();
}

/** scrim / banner atlas: 2 × 4 cells (512 × 256): black mesh scrim variants, printed banners, bare wire */
function scrimAtlas(): THREE.CanvasTexture {
  const W = 1024,
    H = 1024;
  const [c, g] = makeCanvas(W, H);
  const cw = 512,
    ch = 256;
  const cell = (i: number) => ({ x: (i % 2) * cw, y: Math.floor(i / 2) * ch });
  const scrim = (x: number, y: number) => {
    g.fillStyle = '#131315';
    g.fillRect(x, y, cw, ch);
    g.fillStyle = 'rgba(255,255,255,0.03)';
    for (let yy = 0; yy < ch; yy += 3) g.fillRect(x, y + yy, cw, 1);
    for (let xx = 0; xx < cw; xx += 3) g.fillRect(x + xx, y, 1, ch);
    // cable ties along the edges
    g.fillStyle = '#2a2a2e';
    for (let xx = 10; xx < cw; xx += 40) {
      g.fillRect(x + xx, y + 2, 5, 6);
      g.fillRect(x + xx, y + ch - 8, 5, 6);
    }
  };
  const condensed = (text: string, x: number, y: number, size: number, color: string, maxW: number) => {
    g.save();
    g.font = `900 ${size}px "Arial Narrow", "Roboto Condensed", Impact, "Helvetica Neue", Arial, sans-serif`;
    const w = g.measureText(text).width;
    const sx = Math.min(0.78, maxW / Math.max(1, w));
    g.translate(x, y);
    g.scale(sx, 1);
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 0, 0);
    g.restore();
  };
  // 0 plain scrim
  scrim(cell(0).x, cell(0).y);
  // 1 scrim with red flame band at the bottom
  {
    const { x, y } = cell(1);
    scrim(x, y);
    g.fillStyle = '#7a0d18';
    g.beginPath();
    g.moveTo(x, y + ch);
    for (let k = 0; k <= 16; k++) g.lineTo(x + (k * cw) / 16, y + ch - (k % 2 ? 90 : 40) - ((k * 37) % 23));
    g.lineTo(x + cw, y + ch);
    g.fill();
  }
  // 2 "RED" in a heavy condensed face with a red slash
  {
    const { x, y } = cell(2);
    scrim(x, y);
    g.fillStyle = '#8c0f1c';
    g.fillRect(x, y + ch * 0.62, cw, ch * 0.1);
    condensed('RED', x + cw / 2, y + ch * 0.45, 170, '#e8e4dc', cw * 0.6);
  }
  // 3 "HOLY GROUNDS"
  {
    const { x, y } = cell(3);
    scrim(x, y);
    condensed('HOLY GROUNDS', x + cw / 2, y + ch * 0.5, 110, '#c9a45c', cw * 0.9);
  }
  // 4 diagonal red/black
  {
    const { x, y } = cell(4);
    g.fillStyle = '#131315';
    g.fillRect(x, y, cw, ch);
    g.save();
    g.beginPath();
    g.rect(x, y, cw, ch);
    g.clip();
    g.fillStyle = '#6e0c16';
    for (let k = -4; k < 12; k++) {
      g.beginPath();
      g.moveTo(x + k * 60, y + ch);
      g.lineTo(x + k * 60 + 30, y + ch);
      g.lineTo(x + k * 60 + 30 + ch, y);
      g.lineTo(x + k * 60 + ch, y);
      g.fill();
    }
    g.restore();
  }
  // 7 bare Heras wire mesh (transparent holes)
  {
    const { x, y } = cell(7);
    g.clearRect(x, y, cw, ch);
    g.fillStyle = '#9aa0a6';
    for (let xx = 0; xx < cw; xx += 8) g.fillRect(x + xx, y, 2, ch);
    for (let yy = 0; yy < ch; yy += 26) g.fillRect(x, y + yy, cw, 2);
  }
  return canvasTexture(c, { aniso: 4 });
}

function gateBannerTexture(): THREE.CanvasTexture {
  const [c, g] = makeCanvas(1024, 128);
  g.fillStyle = '#0d0d0f';
  g.fillRect(0, 0, 1024, 128);
  g.fillStyle = '#9b0f1f';
  g.fillRect(0, 100, 1024, 28);
  g.save();
  g.font = '900 86px "Arial Narrow", "Roboto Condensed", Impact, Arial, sans-serif';
  const w = g.measureText('MAINSTAGE RED').width;
  g.translate(512, 55);
  g.scale(Math.min(0.8, 900 / w), 1);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#efeae0';
  g.fillText('MAINSTAGE RED', 0, 0);
  g.restore();
  return canvasTexture(c, { aniso: 4 });
}
