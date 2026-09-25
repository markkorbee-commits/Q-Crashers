import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Rng, hashString } from '../core/rng';
import type { Collider2D } from '../core/types';
import type { BarDef } from './bars';
import { canopyGlowTexture, counterFrontTexture, fasciaTexture, fridgeTexture, glowTexture, menuBoardTexture, shutterTexture, signTexture, trackwayTexture } from './BarTextures';

/**
 * Builds every bar into a handful of merged meshes (one per material, shared by all bars)
 * plus two instanced meshes (string-light bulbs, bartenders). ~16 draw calls for all bars.
 *
 * Bar local space: origin at the centre of the structure on the ground, +Z = customer side,
 * X along the counter. See bars.ts for the world placement convention.
 */

type BucketId =
  | 'steel'
  | 'panel'
  | 'deck'
  | 'top'
  | 'front'
  | 'sign'
  | 'fridge'
  | 'board'
  | 'chrome'
  | 'red'
  | 'black'
  | 'glass'
  | 'bottle'
  | 'track'
  | 'glow'
  | 'led'
  | 'warm'
  | 'tent'
  | 'fascia'
  | 'shutter';

export interface StaffMember {
  bar: BarDef;
  /** local x home position */
  homeX: number;
  range: number;
  phase: number;
  period: number;
}

export interface BuiltBars {
  group: THREE.Group;
  bulbs: THREE.InstancedMesh;
  staff: THREE.InstancedMesh;
  staffInfo: StaffMember[];
  colliders: Collider2D[];
  bulbCount: number;
  textures: THREE.Texture[];
  materials: THREE.Material[];
  /** open (lit, staffed) or closed (dark, shutters down — "As filmed": the site was closed) */
  setOpen(open: boolean): void;
}

export const BAR_DEPTH = 6;
/** local z of the counter's customer face */
export const COUNTER_FRONT_Z = 1.3;
/** local z where customers stand */
export const CUSTOMER_Z = 2.1;

/** local -> world for a bar (rotation about +Y) */
export function barToWorld(b: BarDef, lx: number, lz: number, out: THREE.Vector3, y = 0): THREE.Vector3 {
  const c = Math.cos(b.rotation),
    s = Math.sin(b.rotation);
  return out.set(b.x + c * lx + s * lz, (b.y ?? 0) + y, b.z - s * lx + c * lz);
}

class Buckets {
  readonly map = new Map<BucketId, THREE.BufferGeometry[]>();
  private tmp = new THREE.Matrix4();
  constructor(public base: THREE.Matrix4) {}

  add(id: BucketId, g: THREE.BufferGeometry, local?: THREE.Matrix4): void {
    const m = this.tmp.copy(this.base);
    if (local) m.multiply(local);
    g.applyMatrix4(m);
    let arr = this.map.get(id);
    if (!arr) this.map.set(id, (arr = []));
    arr.push(g);
  }

  box(id: BucketId, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, rotY = 0, rotX = 0, rotZ = 0): void {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ'));
    m.setPosition(cx, cy, cz);
    this.add(id, g, m);
  }

  cyl(id: BucketId, x: number, y: number, z: number, rTop: number, rBot: number, h: number, seg = 10, rotX = 0, rotZ = 0): void {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, false);
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rotX, 0, rotZ));
    m.setPosition(x, y, z);
    this.add(id, g, m);
  }

  /** vertical plane facing +Z (facing = 1) or -Z (facing = -1); uv scaled for repeating textures */
  plane(id: BucketId, cx: number, cy: number, cz: number, w: number, h: number, facing: 1 | -1 = 1, uScale = 1, vScale = 1): void {
    const g = new THREE.PlaneGeometry(w, h);
    if (uScale !== 1 || vScale !== 1) scaleUv(g, uScale, vScale);
    const m = new THREE.Matrix4().makeRotationY(facing === 1 ? 0 : Math.PI);
    m.setPosition(cx, cy, cz);
    this.add(id, g, m);
  }

  /** horizontal plane facing up */
  ground(id: BucketId, cx: number, y: number, cz: number, w: number, d: number, uScale = 1, vScale = 1): void {
    const g = new THREE.PlaneGeometry(w, d);
    if (uScale !== 1 || vScale !== 1) scaleUv(g, uScale, vScale);
    const m = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    m.setPosition(cx, y, cz);
    this.add(id, g, m);
  }
}

function scaleUv(g: THREE.BufferGeometry, u: number, v: number) {
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  uv.needsUpdate = true;
}

function hdr(hex: string, k: number): THREE.Color {
  return new THREE.Color(hex).multiplyScalar(k);
}

/** low-poly bartender (feet at 0, facing +Z) with vertex colours */
function staffGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const put = (g: THREE.BufferGeometry, hex: string, x: number, y: number, z: number, rz = 0, sy = 1) => {
    const m = new THREE.Matrix4().makeRotationZ(rz);
    m.scale(new THREE.Vector3(1, sy, 1));
    m.setPosition(x, y, z);
    g.applyMatrix4(m);
    const c = new THREE.Color(hex);
    const n = g.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  };
  const skin = '#b98a6e';
  put(new THREE.BoxGeometry(0.15, 0.82, 0.17), '#1c2230', -0.1, 0.41, 0);
  put(new THREE.BoxGeometry(0.15, 0.82, 0.17), '#1c2230', 0.1, 0.41, 0);
  put(new THREE.BoxGeometry(0.44, 0.62, 0.25), '#0d0d10', 0, 1.12, 0);
  put(new THREE.BoxGeometry(0.38, 0.62, 0.03), '#9a0a0a', 0, 0.98, 0.135);
  put(new THREE.BoxGeometry(0.11, 0.3, 0.13), '#0d0d10', -0.28, 1.28, 0, -0.12);
  put(new THREE.BoxGeometry(0.11, 0.3, 0.13), '#0d0d10', 0.28, 1.28, 0, 0.12);
  put(new THREE.BoxGeometry(0.09, 0.32, 0.1), skin, -0.31, 0.98, 0.04, -0.06);
  put(new THREE.BoxGeometry(0.09, 0.32, 0.1), skin, 0.31, 0.98, 0.04, 0.06);
  put(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 6), skin, 0, 1.47, 0);
  put(new THREE.SphereGeometry(0.11, 10, 8), skin, 0, 1.6, 0, 0, 1.12);
  put(new THREE.CylinderGeometry(0.118, 0.118, 0.07, 10), '#111114', 0, 1.7, -0.005);
  put(new THREE.BoxGeometry(0.2, 0.02, 0.11), '#111114', 0, 1.67, 0.11);
  const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
  merged.computeVertexNormals();
  return merged;
}

export function buildBars(bars: BarDef[], lowDetail: boolean): BuiltBars {
  const textures = {
    sign: signTexture(),
    board: menuBoardTexture(),
    fridge: fridgeTexture(),
    front: counterFrontTexture(),
    track: trackwayTexture(),
    glow: glowTexture(),
    fascia: fasciaTexture(),
    canopy: canopyGlowTexture(),
    shutter: shutterTexture(),
  };
  const mats: Record<BucketId, THREE.Material> = {
    steel: new THREE.MeshStandardMaterial({ color: '#373b42', metalness: 0.4, roughness: 0.5 }),
    panel: new THREE.MeshStandardMaterial({ color: '#1b1d22', metalness: 0.15, roughness: 0.8 }),
    deck: new THREE.MeshStandardMaterial({ color: '#232428', metalness: 0.2, roughness: 0.75 }),
    top: new THREE.MeshStandardMaterial({ color: '#4a4e55', metalness: 0.5, roughness: 0.3 }),
    // dark timber cladding; only the LED line under the top and the kick glow emit
    front: new THREE.MeshStandardMaterial({ color: '#ffffff', map: textures.front, emissive: '#ffffff', emissiveMap: textures.front, emissiveIntensity: 1.1, roughness: 0.7 }),
    // tan tensile membranes, glowing warm from the 3000 K under-canopy LEDs (bible §11)
    tent: new THREE.MeshStandardMaterial({ color: '#cbb48f', roughness: 0.9, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: textures.canopy, emissiveIntensity: 0.75 }),
    fascia: new THREE.MeshBasicMaterial({ map: textures.fascia, color: hdr('#ffffff', 1.15) }),
    shutter: new THREE.MeshStandardMaterial({ map: textures.shutter, roughness: 0.55, metalness: 0.45 }),
    sign: new THREE.MeshBasicMaterial({ map: textures.sign, color: hdr('#ffffff', 2.2) }),
    fridge: new THREE.MeshStandardMaterial({ color: '#101010', map: textures.fridge, emissive: '#ffffff', emissiveMap: textures.fridge, emissiveIntensity: 1.5, roughness: 0.2, metalness: 0.1 }),
    board: new THREE.MeshStandardMaterial({ color: '#202020', map: textures.board, emissive: '#ffffff', emissiveMap: textures.board, emissiveIntensity: 1.05, roughness: 0.6 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.55, roughness: 0.22 }),
    red: new THREE.MeshStandardMaterial({ color: '#c8102e', roughness: 0.5, emissive: '#3a0008', emissiveIntensity: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: '#0a0a0c', roughness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: '#d9e6ee', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.45, emissive: '#3a4a55', emissiveIntensity: 0.4 }),
    bottle: new THREE.MeshStandardMaterial({ color: '#2f5a2a', roughness: 0.2, metalness: 0.2, emissive: '#0e2a10', emissiveIntensity: 0.8 }),
    track: new THREE.MeshStandardMaterial({ color: '#8a8c8f', map: textures.track, roughness: 0.85, metalness: 0.15 }),
    // warm light spill from the counter and the under-canopy LEDs on the ground plates
    glow: new THREE.MeshBasicMaterial({ map: textures.glow, color: hdr('#ff9a52', 0.34), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    led: new THREE.MeshBasicMaterial({ color: hdr('#ff1a06', 3.2) }),
    warm: new THREE.MeshBasicMaterial({ color: hdr('#ffc98a', 3.0) }),
  };

  const group = new THREE.Group();
  group.name = 'Bars';
  const colliders: Collider2D[] = [];
  const bulbMatrices: THREE.Matrix4[] = [];
  const staffInfo: StaffMember[] = [];
  const all = new Map<BucketId, THREE.BufferGeometry[]>();

  for (const b of bars) {
    const W = b.width;
    const D = b.depth ?? BAR_DEPTH;
    const zb = -D / 2; // back wall
    const base = new THREE.Matrix4().makeRotationY(b.rotation).setPosition(b.x, b.y ?? 0, b.z);
    const B = new Buckets(base);
    const rng = new Rng(hashString(b.id));
    const roofY = 3.35;
    const roofFront = 2.75;

    // ground plates in front + light spill decal
    B.ground('track', 0, 0.018, 4.2, W + 5, 6, (W + 5) / 2.6, 6 / 2.6);
    B.ground('glow', 0, 0.045, COUNTER_FRONT_Z + 3.8, W + 6, 7.6);
    // deck inside
    B.box('deck', 0, 0.06, (zb + COUNTER_FRONT_Z) / 2, W, 0.12, COUNTER_FRONT_Z - zb);
    // back + side walls
    B.box('panel', 0, roofY / 2, zb + 0.05, W + 0.2, roofY, 0.1);
    B.box('panel', -W / 2, roofY / 2, zb / 2 + 0.2, 0.1, roofY, -zb + 0.4);
    B.box('panel', W / 2, roofY / 2, zb / 2 + 0.2, 0.1, roofY, -zb + 0.4);
    // corrugation ribs on the outside of the back wall
    for (let x = -W / 2 + 0.4; x < W / 2; x += 0.6) B.box('steel', x, roofY / 2, zb - 0.02, 0.06, roofY - 0.1, 0.05);
    // posts
    const bays = Math.max(2, Math.round(W / 5.5));
    const zMid = (roofFront + zb) / 2 - 0.1;
    for (let i = 0; i <= bays; i++) {
      const x = -W / 2 + (W * i) / bays;
      B.box('steel', x, roofY / 2, roofFront - 0.12, 0.14, roofY, 0.14);
      B.box('steel', x, roofY / 2, zb - 0.1, 0.14, roofY, 0.14);
      // cross beam under the roof + a warm under-canopy LED bar beneath it
      B.box('steel', x, roofY - 0.12, zMid, 0.1, 0.18, roofFront - zb);
      B.box('warm', x, roofY - 0.235, zMid, 0.045, 0.025, roofFront - zb - 0.8);
      colliders.push(...postCollider(b, x, roofFront - 0.12));
    }
    // eave beams (front / back)
    B.box('steel', 0, roofY - 0.05, roofFront - 0.12, W + 0.2, 0.12, 0.12);
    B.box('steel', 0, roofY - 0.05, zb - 0.1, W + 0.2, 0.12, 0.12);
    // tan tensile roof: one peaked membrane per bay, king pole at each peak
    const peak = 1.35;
    for (let i = 0; i < bays; i++) {
      const x0 = -W / 2 + (W * i) / bays;
      const x1 = -W / 2 + (W * (i + 1)) / bays;
      B.add('tent', membrane(x0 - 0.05, x1 + 0.05, zb - 0.35, roofFront + 0.35, roofY + 0.02, peak, lowDetail ? 6 : 10));
      const xc = (x0 + x1) / 2;
      B.cyl('steel', xc, roofY + peak + 0.2, zMid, 0.035, 0.035, 0.5, 6);
    }
    // lit fascia band along the front edge + LED lines
    B.box('black', 0, roofY - 0.05, roofFront + 0.05, W + 0.6, 0.62, 0.08);
    B.plane('fascia', 0, roofY - 0.05, roofFront + 0.095, W + 0.6, 0.5, 1, (W + 0.6) / 4, 1);
    B.box('led', 0, roofY - 0.37, roofFront + 0.1, W + 0.5, 0.035, 0.03);
    // roller shutter down to the counter top + its housing (only visible while the bar is closed)
    const shTop = roofY - 0.3,
      shBot = 1.13,
      shZ = COUNTER_FRONT_Z + 0.09;
    B.plane('shutter', 0, (shTop + shBot) / 2, shZ, W - 1.2, shTop - shBot, 1, W / 1.6, (shTop - shBot) / 3.2);
    B.box('shutter', 0, shTop + 0.17, shZ - 0.12, W - 1.1, 0.34, 0.3);

    // counter
    const cl = W - 1.4;
    const cz = COUNTER_FRONT_Z - 0.38;
    B.box('panel', 0, 0.54, cz, cl, 1.08, 0.72);
    B.plane('front', 0, 0.55, COUNTER_FRONT_Z + 0.005, cl, 0.98, 1, cl / 1.3, 1);
    B.box('top', 0, 1.105, cz + 0.06, cl + 0.2, 0.05, 0.94);
    B.box('led', 0, 1.07, COUNTER_FRONT_Z + 0.05, cl + 0.1, 0.02, 0.02);
    // counter end caps
    B.box('steel', -cl / 2 - 0.1, 0.55, cz, 0.08, 1.1, 0.78);
    B.box('steel', cl / 2 + 0.1, 0.55, cz, 0.08, 1.1, 0.78);

    // beer taps + drip trays
    const taps = Math.max(2, Math.round(cl / 3.4));
    for (let i = 0; i < taps; i++) {
      const x = -cl / 2 + (cl * (i + 0.5)) / taps;
      B.box('black', x, 1.14, cz - 0.1, 0.5, 0.025, 0.18);
      B.cyl('chrome', x, 1.3, cz - 0.1, 0.035, 0.045, 0.34, 10);
      B.box('chrome', x, 1.43, cz - 0.1, 0.46, 0.07, 0.07);
      for (const dx of [-0.16, 0, 0.16]) {
        B.cyl('chrome', x + dx, 1.38, cz - 0.03, 0.012, 0.012, 0.1, 6);
        B.box('red', x + dx, 1.52, cz - 0.12, 0.03, 0.14, 0.03, 0, -0.25);
      }
      // cup stacks near the taps
      const nStacks = 1 + rng.int(0, 2);
      for (let s = 0; s < nStacks; s++) {
        const sx = x + rng.range(0.45, 1.2) * (s % 2 ? 1 : -1);
        const h = rng.range(0.32, 0.6);
        B.cyl(rng.chance(0.7) ? 'red' : 'glass', sx, 1.13 + h / 2, cz + rng.range(-0.25, 0.1), 0.046, 0.036, h, 10);
      }
      // pendant lamp above the counter
      const lx = x + cl / taps / 2;
      if (i < taps - 1 || taps === 1) {
        B.cyl('black', lx, roofY - 0.35, cz + 0.1, 0.006, 0.006, 0.7, 4);
        B.cyl('black', lx, roofY - 0.78, cz + 0.1, 0.05, 0.22, 0.2, 12);
        bulbMatrices.push(new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().compose(new THREE.Vector3(lx, roofY - 0.9, cz + 0.1), new THREE.Quaternion(), new THREE.Vector3(1.1, 1.1, 1.1))));
      }
    }

    // fridges along the back wall + back bench in the middle
    const fw = 0.78;
    const fz = zb + 0.45;
    const benchHalf = Math.min(3, W * 0.14);
    for (let x = -W / 2 + 0.6 + fw / 2; x < W / 2 - 0.6; x += fw + 0.06) {
      if (Math.abs(x) < benchHalf) continue;
      B.box('steel', x, 1.07, fz, fw, 1.95, 0.7);
      B.plane('fridge', x, 1.1, fz + 0.352, fw - 0.06, 1.84);
    }
    B.box('panel', 0, 0.46, fz + 0.05, benchHalf * 2 - 0.2, 0.92, 0.6);
    B.box('top', 0, 0.94, fz + 0.05, benchHalf * 2 - 0.1, 0.04, 0.66);
    for (let i = 0; i < Math.floor(benchHalf * 6); i++) {
      const x = -benchHalf + 0.25 + rng.range(0, benchHalf * 2 - 0.5);
      const h = rng.range(0.22, 0.32);
      B.cyl(rng.chance(0.5) ? 'bottle' : 'glass', x, 0.96 + h / 2, fz + rng.range(-0.15, 0.2), 0.034, 0.036, h, 8);
    }
    // stacked kegs behind the bench
    for (let i = 0; i < 3; i++) B.cyl('chrome', -benchHalf + 0.5 + i * 0.6, 0.3, zb + 0.3, 0.2, 0.2, 0.6, 12);

    // warm wash from the under-canopy LEDs on the back wall above the fridges + the LED line itself
    B.plane('glow', 0, 2.62, zb + 0.115, W - 0.4, 1.5, 1);
    B.box('warm', 0, roofY - 0.08, zb + 0.16, W - 0.3, 0.03, 0.03);
    // price boards on the back wall (above the fridges)
    const bw = Math.min(3.0, W * 0.16);
    for (const sx of [-1, 1]) {
      B.box('black', sx * W * 0.26, 2.72, zb + 0.13, bw + 0.1, bw / 2 + 0.1, 0.05);
      B.plane('board', sx * W * 0.26, 2.72, zb + 0.16, bw, bw / 2);
    }

    // BAR light box on the roof (double sided)
    const sw = Math.min(7.5, 3.2 + W * 0.17);
    const shh = sw * 0.28;
    const sy = roofY + 0.45 + shh / 2;
    const sz = roofFront - 0.6;
    B.box('black', 0, sy, sz, sw + 0.16, shh + 0.16, 0.3);
    B.plane('sign', 0, sy, sz + 0.152, sw, shh, 1);
    B.plane('sign', 0, sy, sz - 0.152, sw, shh, -1);
    B.box('steel', -sw * 0.3, roofY + 0.3, sz, 0.1, 0.4, 0.1);
    B.box('steel', sw * 0.3, roofY + 0.3, sz, 0.1, 0.4, 0.1);

    // bins at the ends of the queue area
    for (const sx of [-1, 1]) {
      const bx = sx * (W / 2 + 1.1);
      B.cyl('black', bx, 0.48, 1.9, 0.34, 0.3, 0.96, 12);
      B.cyl('red', bx, 0.99, 1.9, 0.36, 0.36, 0.06, 12);
      colliders.push(circleCollider(b, bx, 1.9, 0.42));
    }

    // string lights: sagging strands between the front posts + one along the fascia
    const strand = (x0: number, x1: number, y: number, z: number, sag: number, step: number) => {
      const n = Math.max(2, Math.round((x1 - x0) / step));
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const x = x0 + (x1 - x0) * u;
        const yy = y - sag * 4 * u * (1 - u);
        bulbMatrices.push(new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(x, yy, z)));
      }
    };
    const stepB = lowDetail ? 0.9 : 0.5;
    for (let i = 0; i < bays; i++) {
      const x0 = -W / 2 + (W * i) / bays;
      const x1 = -W / 2 + (W * (i + 1)) / bays;
      strand(x0, x1, roofY - 0.42, roofFront + 0.25, 0.45, stepB);
    }
    // queue-lane strands running forward into the field (festival garland look)
    if (!lowDetail) {
      for (const sx of [-0.5, 0.5]) {
        const x = sx * W * 0.6;
        const n = 10;
        for (let i = 0; i <= n; i++) {
          const u = i / n;
          const z = roofFront + 0.3 + u * 6;
          const yy = roofY - 0.4 - 0.9 * 4 * u * (1 - u) - u * 0.6;
          bulbMatrices.push(new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(x, yy, z)));
        }
        B.box('steel', x, (roofY - 1.0) / 2, roofFront + 6.3, 0.09, roofY - 1.0, 0.09);
        colliders.push(circleCollider(b, x, roofFront + 6.3, 0.12));
      }
    }

    // body collider (structure + counter)
    colliders.push(...bodyColliders(b, -W / 2 - 0.35, W / 2 + 0.35, zb - 0.35, COUNTER_FRONT_Z + 0.1));

    // bartenders
    const staff = b.staff ?? Math.max(1, Math.round(W / 7));
    for (let i = 0; i < staff; i++) {
      const homeX = -cl / 2 + (cl * (i + 0.5)) / staff;
      staffInfo.push({ bar: b, homeX, range: Math.min(1.6, cl / staff / 2 - 0.3), phase: rng.range(0, 100), period: rng.range(11, 17) });
    }

    for (const [k, arr] of B.map) {
      let dst = all.get(k);
      if (!dst) all.set(k, (dst = []));
      dst.push(...arr);
    }
  }

  // merge each bucket into a single mesh
  const meshes = new Map<BucketId, THREE.Mesh>();
  for (const [k, arr] of all) {
    const geo = mergeGeometries(arr, false);
    for (const g of arr) g.dispose();
    if (!geo) continue;
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mats[k]);
    mesh.name = `bars-${k}`;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    if (k === 'glow' || k === 'glass') mesh.renderOrder = 2;
    if (k === 'steel' || k === 'panel' || k === 'deck' || k === 'top' || k === 'tent') {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    if (k === 'shutter') mesh.visible = false;
    meshes.set(k, mesh);
    group.add(mesh);
  }

  const bulbGeo = new THREE.IcosahedronGeometry(0.045, 1);
  const bulbs = new THREE.InstancedMesh(bulbGeo, mats.warm, bulbMatrices.length);
  bulbs.name = 'bars-bulbs';
  bulbMatrices.forEach((m, i) => bulbs.setMatrixAt(i, m));
  bulbs.instanceMatrix.needsUpdate = true;
  bulbs.computeBoundingSphere();
  group.add(bulbs);

  // the bar's own light (pendants, fridges, under-canopy LEDs) falls on the staff: a share of
  // their albedo is added as emission so they read in their true colours instead of dim brown
  const staffMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
  staffMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * vec3(0.62, 0.52, 0.44);');
  };
  const staffMesh = new THREE.InstancedMesh(staffGeometry(), staffMat, Math.max(1, staffInfo.length));
  staffMesh.name = 'bars-staff';
  staffMesh.count = staffInfo.length;
  staffMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  staffMesh.frustumCulled = false;
  group.add(staffMesh);

  // open / closed: lights, staff, shutters (original values restored on re-open)
  const lit = {
    front: (mats.front as THREE.MeshStandardMaterial).emissiveIntensity,
    fridge: (mats.fridge as THREE.MeshStandardMaterial).emissiveIntensity,
    board: (mats.board as THREE.MeshStandardMaterial).emissiveIntensity,
    tent: (mats.tent as THREE.MeshStandardMaterial).emissiveIntensity,
    sign: (mats.sign as THREE.MeshBasicMaterial).color.clone(),
    fascia: (mats.fascia as THREE.MeshBasicMaterial).color.clone(),
    led: (mats.led as THREE.MeshBasicMaterial).color.clone(),
    warm: (mats.warm as THREE.MeshBasicMaterial).color.clone(),
  };
  const setOpen = (open: boolean) => {
    const k = open ? 1 : 0;
    (mats.front as THREE.MeshStandardMaterial).emissiveIntensity = lit.front * (open ? 1 : 0.02);
    (mats.fridge as THREE.MeshStandardMaterial).emissiveIntensity = lit.fridge * (open ? 1 : 0.03);
    (mats.board as THREE.MeshStandardMaterial).emissiveIntensity = lit.board * (open ? 1 : 0.03);
    (mats.tent as THREE.MeshStandardMaterial).emissiveIntensity = lit.tent * (open ? 1 : 0.04);
    (mats.sign as THREE.MeshBasicMaterial).color.copy(lit.sign).multiplyScalar(open ? 1 : 0.05);
    (mats.fascia as THREE.MeshBasicMaterial).color.copy(lit.fascia).multiplyScalar(open ? 1 : 0.12);
    (mats.led as THREE.MeshBasicMaterial).color.copy(lit.led).multiplyScalar(open ? 1 : 0.02);
    (mats.warm as THREE.MeshBasicMaterial).color.copy(lit.warm).multiplyScalar(open ? 1 : 0.03);
    const glow = meshes.get('glow');
    if (glow) glow.visible = open;
    const sh = meshes.get('shutter');
    if (sh) sh.visible = !open;
    staffMesh.visible = k === 1;
  };

  return {
    group,
    bulbs,
    staff: staffMesh,
    staffInfo,
    colliders,
    bulbCount: bulbMatrices.length,
    textures: Object.values(textures),
    materials: [...Object.values(mats), staffMat],
    setOpen,
  };
}

/**
 * Peaked tensile membrane over one bay (local x0..x1, z0..z1, eave height, peak rise): a
 * square cone y = eave + peak·(1 − r)², r = max(|u|, |v|), so the fabric sags between the
 * edges and rises steeply to the king pole — the classic festival tent roof.
 */
function membrane(x0: number, x1: number, z0: number, z1: number, eave: number, peak: number, seg: number): THREE.BufferGeometry {
  const n = seg + 1;
  const pos = new Float32Array(n * n * 3);
  const uv = new Float32Array(n * n * 2);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u = i / seg,
        v = j / seg;
      const r = Math.max(Math.abs(2 * u - 1), Math.abs(2 * v - 1));
      const k = (j * n + i) * 3;
      pos[k] = x0 + (x1 - x0) * u;
      pos[k + 1] = eave + peak * (1 - r) * (1 - r);
      pos[k + 2] = z0 + (z1 - z0) * v;
      uv[(j * n + i) * 2] = u;
      uv[(j * n + i) * 2 + 1] = v;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < seg; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * n + i,
        b = a + 1,
        c = a + n,
        d = c + 1;
      // split along the diagonal that follows the cone's creases
      if ((i < seg / 2) === (j < seg / 2)) idx.push(a, c, d, a, d, b);
      else idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

const tmpV = new THREE.Vector3();

function circleCollider(b: BarDef, lx: number, lz: number, r: number): Collider2D {
  barToWorld(b, lx, lz, tmpV);
  return { kind: 'circle', x: tmpV.x, z: tmpV.z, r, tag: `bar:${b.id}` };
}

function postCollider(b: BarDef, lx: number, lz: number): Collider2D[] {
  return [circleCollider(b, lx, lz, 0.14)];
}

/** Axis-aligned box when the bar is axis aligned, otherwise a chain of circles. */
function bodyColliders(b: BarDef, x0: number, x1: number, z0: number, z1: number): Collider2D[] {
  const q = b.rotation / (Math.PI / 2);
  if (Math.abs(q - Math.round(q)) < 1e-3) {
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const [lx, lz] of [
      [x0, z0],
      [x1, z0],
      [x0, z1],
      [x1, z1],
    ]) {
      barToWorld(b, lx, lz, tmpV);
      minX = Math.min(minX, tmpV.x);
      maxX = Math.max(maxX, tmpV.x);
      minZ = Math.min(minZ, tmpV.z);
      maxZ = Math.max(maxZ, tmpV.z);
    }
    return [{ kind: 'box', minX, maxX, minZ, maxZ, tag: `bar:${b.id}` }];
  }
  const r = (z1 - z0) / 2;
  const zc = (z0 + z1) / 2;
  const out: Collider2D[] = [];
  for (let x = x0 + r; x <= x1 - r + 1e-3; x += r) out.push(circleCollider(b, x, zc, r));
  return out;
}
