import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { Collider2D } from '../core/types';
import { GeoBuilder, lin } from './geom';
import { ARM, BACKSTAGE_Z, CAM_PEN, DECKING, PILLAR, PILLARS, PREMIUM, TERRACE, terrainHeight, WATER_Y } from './site';
import { canvasTexture, makeCanvas } from './tex';
import { patchWorldMaterial } from './worldLights';

/**
 * Man-made field structures: crowd barriers (FOH platform ring), Heras perimeter / backstage fences
 * with black scrim banners, the low FOH / camera platform on the axis, the RED entrance gates, the
 * photo terrace on the decking and the Exclusive RED Experience deck over the lake. Everything is
 * instanced or merged per material. The front-of-stage and arm
 * crowd barriers belong to the MainStage (src/stage/deck/Deck.ts barrierRuns), which lays them on
 * the terrain together with the stage outline.
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
    // the pillar plinths carry their own bronze lattice railing (pillars.ts); only the collider here
    for (const p of PILLARS) {
      colliders.push({ kind: 'box', minX: p.x - PILLAR.fence / 2, maxX: p.x + PILLAR.fence / 2, minZ: p.z - PILLAR.fence / 2, maxZ: p.z + PILLAR.fence / 2, tag: 'pillar' });
    }
    // crowd barrier ring around the FOH / camera platform (1 m clearance, gate at the back)
    for (const loop of rectLoop(CAM_PEN.x, CAM_PEN.z, CAM_PEN.w + 2, CAM_PEN.d + 2, 2.5)) crowd.push(...panelsAlong(loop, 2.5));
    colliders.push({ kind: 'box', minX: CAM_PEN.x - CAM_PEN.w / 2 - 1, maxX: CAM_PEN.x + CAM_PEN.w / 2 + 1, minZ: CAM_PEN.z - CAM_PEN.d / 2 - 1, maxZ: CAM_PEN.z + CAM_PEN.d / 2 + 1, tag: 'campen' });
    // the piano riser (+ its railing and collider) is built by the crowd module's props (src/crowd/props.ts)
  }
  const crowdGeo = crowdBarrierGeometry(lowDetail);
  addInst(crowdGeo, metal, crowd, 'crowd-barriers');

  // ------------------------------------------------------------------ Heras fences (3.5 m) with scrim / bare mesh
  const herasScrim: THREE.Matrix4[] = [];
  const herasBare: THREE.Matrix4[] = [];
  const scrimCell: number[] = [];
  {
    const rng = new Rng(61);
    // backstage fences (terrain-layout.json fences.backstageLeft/Right, FACT 2024 position): from the
    // corner towers along Z −6 to the crest edge, then back along the crest; the crest behind the arms
    // (bars, crest paths) is audience area
    const cornerOut = ARM.x0 + 3;
    const scrimLines: [number, number][][] = [
      [[-cornerOut, BACKSTAGE_Z], [-109.5, BACKSTAGE_Z], [-109.5, -22]],
      [[cornerOut, BACKSTAGE_Z], [109.5, BACKSTAGE_Z], [109.5, -22]],
      // crest outer edges above the tree belts
      [[-109.5, BACKSTAGE_Z], [-109.5, 99]],
      [[109.5, BACKSTAGE_Z], [109.5, 99]],
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

  // ------------------------------------------------------------------ FOH / camera platform on the axis
  // (design-bible §5.11, photo P: a low fenced deck with the camera operator — nothing tall on the axis)
  {
    const b = new GeoBuilder();
    const { x: cx, z: cz, w: W, d: D, deckY } = CAM_PEN;
    const yp = terrainHeight(cx, cz);
    const top = yp + deckY;
    const x0 = cx - W / 2,
      x1 = cx + W / 2,
      z0 = cz - D / 2,
      z1 = cz + D / 2;
    // stage deck (plywood on scaffold) with a black skirt, two steps at the back
    b.box(W, 0.1, D, cx, top - 0.05, cz, lin('#2c2824'));
    b.box(W, deckY - 0.1, D - 0.1, cx, yp + (deckY - 0.1) / 2, cz, blackCloth);
    for (let k = 0; k < 2; k++) b.box(2.4, (deckY / 3) * (k + 1), 0.35, cx, yp + (deckY / 6) * (k + 1), z1 + 0.52 - k * 0.35, lin('#1e1c1a'));
    // aluminium railing 1.1 m on three sides + the back beside the steps
    const railY = [top + 1.1, top + 0.55];
    const rail = (ax: number, az: number, bx: number, bz: number) => {
      for (const y of railY) b.beam(new THREE.Vector3(ax, y, az), new THREE.Vector3(bx, y, bz), y > top + 1 ? 0.05 : 0.035, alu, true);
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 1.6));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        b.beam(new THREE.Vector3(ax + (bx - ax) * t, top, az + (bz - az) * t), new THREE.Vector3(ax + (bx - ax) * t, top + 1.1, az + (bz - az) * t), 0.045, alu, true);
      }
    };
    rail(x0, z0, x1, z0);
    rail(x0, z0, x0, z1);
    rail(x1, z0, x1, z1);
    // back rail with the opening over the steps (in line with the barrier-ring gate)
    rail(x1, z1, cx + 1.3, z1);
    rail(cx - 1.3, z1, x0, z1);
    // camera operator's tripod camera (front of the deck, filming the stage) and a jib base
    const tri = new THREE.Vector3(cx + 1.0, top + 1.45, z0 + 1.2);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      b.beam(new THREE.Vector3(tri.x + Math.cos(a) * 0.5, top, tri.z + Math.sin(a) * 0.5), tri, 0.03, lin('#222'), true);
    }
    b.box(0.26, 0.28, 0.55, tri.x, tri.y + 0.18, tri.z - 0.08, lin('#0d0d0d'));
    // FOH control: low desks (sound / light / pyro / laser) facing the stage, road cases behind
    const desk = lin('#141417');
    for (const [x, w] of [[-5.0, 2.0], [3.8, 2.2]] as [number, number][]) {
      b.box(w, 0.85, 0.9, cx + x, top + 0.425, cz + 0.4, desk);
      b.box(w * 0.96, 0.06, 0.8, cx + x, top + 0.88, cz + 0.36, lin('#222226'));
    }
    for (let k = 0; k < 5; k++) b.box(0.6, 0.9, 0.8, cx - 5.4 + k * 1.3 + (k > 2 ? 3.2 : 0), top + 0.45, z1 - 0.6, lin('#101012'));
    addMesh(b.build(), metal, 'foh-platform');
    // desk screens (emissive, dimmed show mode)
    const scr = new GeoBuilder();
    for (const [x, w] of [[-5.0, 2.0], [3.8, 2.2]] as [number, number][]) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(cx + x, top + 1.12, cz + 0.62), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.35), new THREE.Vector3(w * 0.55, 0.36, 0.02));
      scr.add(GeoBuilder.unit('box'), m, lin('#8fb4ee'));
    }
    const screenMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(0.7, 0.7, 0.7) });
    addMesh(scr.build(), screenMat, 'foh-screens');
  }

  // ------------------------------------------------------------------ photo terrace (Exclusive RED Experience)
  // open scaffold deck at Y 5 over the back edge of the decking (bible §6.3), wide bays so the field
  // cameras below it (hero cam (0, 1.8, 172)) look through, rails only on the front, stairs at both ends
  {
    const T = TERRACE;
    const b = new GeoBuilder();
    const zc = (T.z0 + T.z1) / 2;
    const D = T.z1 - T.z0;
    const g = (x: number, z: number) => terrainHeight(x, z);
    const deckTop = T.deckY;
    // steel deck on beams: timber top + a dark fascia
    b.box(T.x1 - T.x0, 0.12, D, 0, deckTop - 0.06, zc, lin('#4a3a2c'));
    b.box(T.x1 - T.x0, 0.4, 0.12, 0, deckTop - 0.32, T.z0 + 0.06, lin('#1a1a1c'));
    b.box(T.x1 - T.x0, 0.4, 0.12, 0, deckTop - 0.32, T.z1 - 0.06, lin('#1a1a1c'));
    for (const x of [-24, -12, 0, 12, 24]) b.box(0.2, 0.36, D, x, deckTop - 0.3, zc, lin('#2a2a2d'));
    // columns: wide bays (no column within 6 m of the axis), X-bracing only in the outer bays
    const cols = [-30, -18, -6.5, 6.5, 18, 30];
    for (const x of cols)
      for (const z of [T.z0 + 0.25, T.z1 - 0.25]) {
        b.beam(new THREE.Vector3(x, g(x, z), z), new THREE.Vector3(x, deckTop - 0.5, z), 0.22, lin('#2c2d31'));
      }
    for (let i = 1; i < cols.length; i++) {
      if (Math.abs(cols[i - 1] + cols[i]) < 1) continue; // central bay open
      for (const z of [T.z0 + 0.25, T.z1 - 0.25]) {
        const ya = g(cols[i - 1], z) + 0.4;
        b.beam(new THREE.Vector3(cols[i - 1], ya, z), new THREE.Vector3(cols[i], deckTop - 0.6, z), 0.08, galv);
        b.beam(new THREE.Vector3(cols[i], ya, z), new THREE.Vector3(cols[i - 1], deckTop - 0.6, z), 0.08, galv);
      }
    }
    // balustrade: posts + top/mid rails along the front and the back, glass infill (front)
    const rails = (z: number) => {
      for (const y of [deckTop + 1.1, deckTop + 0.1]) b.beam(new THREE.Vector3(T.x0, y, z), new THREE.Vector3(T.x1, y, z), 0.06, alu, true);
      for (let x = T.x0; x <= T.x1 + 0.01; x += 2) b.beam(new THREE.Vector3(x, deckTop, z), new THREE.Vector3(x, deckTop + 1.1, z), 0.05, alu, true);
    };
    rails(T.z0 + 0.1);
    rails(T.z1 - 0.1);
    // stairs down at both ends (solid stepped timber mass, running outwards along X)
    const steps = Math.round((deckTop - g(T.x1, zc)) / 0.18);
    for (const s of [-1, 1]) {
      for (let k = 0; k < steps; k++) {
        const t0 = k / steps,
          t1 = (k + 1) / steps;
        const xa = s * (T.x1 + T.stair * t0),
          xb = s * (T.x1 + T.stair * t1);
        const gy = g((xa + xb) / 2, zc);
        const y = deckTop - (deckTop - gy) * t1;
        b.box(Math.abs(xb - xa), Math.max(0.05, y - gy), D, (xa + xb) / 2, (y + gy) / 2, zc, lin(k % 2 ? '#3f3226' : '#46382a'));
      }
      // stair handrails
      for (const z of [T.z0 + 0.1, T.z1 - 0.1]) {
        const a = new THREE.Vector3(s * T.x1, deckTop + 1.0, z);
        const e = new THREE.Vector3(s * (T.x1 + T.stair), g(s * (T.x1 + T.stair), z) + 1.0, z);
        b.beam(a, e, 0.05, alu, true);
      }
    }
    addMesh(b.build(), metal, 'photo-terrace');
    // glass balustrade infill on the front (faint reflective panes)
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(T.x1 - T.x0, 0.95),
      new THREE.MeshStandardMaterial({ color: '#9fb4c0', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2, depthWrite: false }),
    );
    glass.position.set(0, deckTop + 0.6, T.z0 + 0.1);
    glass.name = 'terrace-glass';
    scene.add(glass);
    drawables.push(glass);
    // colliders: front and back of the terrace + stairs (entered from the ends only)
    const reach = T.x1 + T.stair;
    colliders.push({ kind: 'box', minX: -reach, maxX: reach, minZ: T.z0 - 0.35, maxZ: T.z0 + 0.15, tag: 'terrace' });
    colliders.push({ kind: 'box', minX: -reach, maxX: reach, minZ: T.z1 - 0.15, maxZ: T.z1 + 0.35, tag: 'terrace' });
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
    // ramps from the decking (behind the photo terrace)
    for (const x of [-26, -10, 22, 40]) {
      const a = new THREE.Vector3(x, terrainHeight(x, DECKING.z1) + 0.1, DECKING.z1);
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
