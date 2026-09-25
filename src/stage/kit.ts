import * as THREE from 'three';
import { GeoBucket } from './lib/GeoBucket';
import { LedBuilder } from './lib/LedBuilder';
import { type DecorRegion, regionUV } from './materials/decorAtlas';

/** Vertex-colour tints for the stone bucket (multiplied with the stone print). */
export const TINT = {
  wall: new THREE.Color(1, 1, 1),
  trim: new THREE.Color(1.14, 1.1, 1.02),
  cream: new THREE.Color(1.42, 1.36, 1.24),
  stair: new THREE.Color(1.3, 1.28, 1.22),
  dark: new THREE.Color(0.36, 0.36, 0.38),
  cool: new THREE.Color(0.92, 0.96, 1.04),
  warm: new THREE.Color(1.06, 1.0, 0.92),
};

/** Paint bucket colours (sRGB -> linear via THREE.Color). */
export const PAINT = {
  black: new THREE.Color('#141416'),
  deckTop: new THREE.Color('#141417'),
  red: new THREE.Color('#5c0a19'),
  carpet: new THREE.Color('#3a0a12'),
  grey: new THREE.Color('#3a3a3e'),
  interior: new THREE.Color('#0a0808'),
  grille: new THREE.Color('#1a1a1c'),
};

export const METAL = {
  black: new THREE.Color('#161618'),
  steel: new THREE.Color('#5a5e64'),
  alu: new THREE.Color('#a8adb4'),
};

/** Glow groups of the decor material (aGroup): 0 none, 1 banners, 2 skull eyes, 3 emblem */
export const GLOW = { none: 0, banner: 1, skull: 2, emblem: 3 } as const;

/** everything the builders write into */
export interface StageKit {
  stone: GeoBucket;
  paint: GeoBucket;
  metal: GeoBucket;
  gold: GeoBucket;
  decor: GeoBucket;
  speaker: GeoBucket;
  led: LedBuilder;
  /** curve segments for arches */
  seg: number;
  /** detail level 0 (mobile) .. 2 (ultra) */
  detail: number;
  /** anchor points collected while building (every point sits on the geometry that carries it) */
  pts: StagePoints;
}

/** anchor groups the builders fill (see MainStageSystem.registerAnchors for the anchor names) */
export interface StagePoints {
  deckFront: THREE.Vector3[];
  deckBack: THREE.Vector3[];
  sideFront: THREE.Vector3[];
  armPosts: THREE.Vector3[];
  armEnds: THREE.Vector3[];
  deckGerbs: THREE.Vector3[];
  frontComets: THREE.Vector3[];
  roof: THREE.Vector3[];
  roofComets: THREE.Vector3[];
  sideRampart: THREE.Vector3[];
  towerTorches: THREE.Vector3[];
  cornerFireballs: THREE.Vector3[];
  towersTop: THREE.Vector3[];
  co2: THREE.Vector3[];
  bengal: THREE.Vector3[];
  mines: THREE.Vector3[];
  speakerHangs: THREE.Vector3[];
  hangGlitter: THREE.Vector3[];
  laserStage: THREE.Vector3[];
  /** moving heads on the structure, in rows (consecutive points of a row are < 3 m apart) */
  fixturesTruss: THREE.Vector3[];
  fixturesFloor: THREE.Vector3[];
}

export function createKit(detail: number): StageKit {
  const pts = {} as StagePoints;
  for (const k of [
    'deckFront', 'deckBack', 'sideFront', 'armPosts', 'armEnds', 'deckGerbs', 'frontComets', 'roof', 'roofComets', 'sideRampart', 'towerTorches',
    'cornerFireballs', 'towersTop', 'co2', 'bengal', 'mines', 'speakerHangs', 'hangGlitter', 'laserStage', 'fixturesTruss', 'fixturesFloor',
  ] as (keyof StagePoints)[])
    pts[k] = [];
  return {
    stone: new GeoBucket('stone', 0.25),
    paint: new GeoBucket('paint', 0.5),
    metal: new GeoBucket('metal', 0.5),
    gold: new GeoBucket('gold', 0.6),
    decor: new GeoBucket('decor', 1, true),
    speaker: new GeoBucket('speaker', 1),
    led: new LedBuilder(),
    seg: detail >= 2 ? 10 : detail === 1 ? 8 : 5,
    detail,
    pts,
  };
}

// ---------------------------------------------------------------------------------------------
// shared primitive helpers

const _box = new THREE.BoxGeometry(1, 1, 1);

/** axis-aligned box from min/max corners */
export function boxMinMax(b: GeoBucket, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color?: THREE.Color, group?: number): void {
  const m = new THREE.Matrix4().makeScale(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  m.setPosition((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  b.add(_box, m, { color, group });
}

/** box centred at (x,y,z) with size (w,h,d) and optional yaw */
export function boxAt(b: GeoBucket, x: number, y: number, z: number, w: number, h: number, d: number, color?: THREE.Color, yaw = 0, uv: 'box' | 'keep' = 'box'): void {
  const m = new THREE.Matrix4().makeRotationY(yaw);
  m.scale(new THREE.Vector3(w, h, d));
  m.setPosition(x, y, z);
  b.add(_box, m, { color, uv });
}

/** cylinder (axis Y) from y0 to y1 */
export function cyl(b: GeoBucket, x: number, y0: number, z: number, r0: number, r1: number, y1: number, seg = 8, color?: THREE.Color): void {
  const g = new THREE.CylinderGeometry(r1, r0, Math.abs(y1 - y0), seg, 1, false);
  b.add(g, new THREE.Matrix4().makeTranslation(x, (y0 + y1) / 2, z), { color });
  g.dispose();
}

/** rod between two points (thin box) */
export function rod(b: GeoBucket, a: THREE.Vector3, c: THREE.Vector3, t: number, color?: THREE.Color): void {
  const d = new THREE.Vector3().subVectors(c, a);
  const len = d.length();
  if (len < 1e-4) return;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  const m = new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), q, new THREE.Vector3(t, len, t));
  b.add(_box, m, { color });
}

/** decor panel: a plane mapped to an atlas region, facing +Z rotated by yaw, centred at (x,y,z) */
export function decorPanel(kit: StageKit, region: DecorRegion, x: number, y: number, z: number, w: number, h: number, group: number, yaw = 0): void {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const [u, v] = regionUV(region, uv.getX(i), uv.getY(i));
    uv.setXY(i, u, v);
  }
  const m = new THREE.Matrix4().makeRotationY(yaw);
  m.setPosition(x, y, z);
  kit.decor.add(g, m, { uv: 'keep', group });
  g.dispose();
}

/** round decor disc (medallion / shield), facing +Z rotated by yaw */
export function decorDisc(kit: StageKit, region: DecorRegion, x: number, y: number, z: number, r: number, group: number, yaw = 0, seg = 32): void {
  const g = new THREE.CircleGeometry(r, seg);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const [u, v] = regionUV(region, uv.getX(i), uv.getY(i));
    uv.setXY(i, u, v);
  }
  const m = new THREE.Matrix4().makeRotationY(yaw);
  m.setPosition(x, y, z);
  kit.decor.add(g, m, { uv: 'keep', group });
  g.dispose();
}

/**
 * Prism along X whose top follows `top(x)` (sampled every ~`step` m): front face at zF, back at zB,
 * bottom flat at y0. Used for the ledges / walls that ride up the side bank.
 */
export function prismX(b: GeoBucket, x0: number, x1: number, zF: number, zB: number, y0: number, top: (x: number) => number, color?: THREE.Color, step = 2): void {
  const n = Math.max(1, Math.ceil(Math.abs(x1 - x0) / step));
  const pos: number[] = [];
  const quad = (a: number[], bb: number[], c: number[], d: number[]) => pos.push(...a, ...bb, ...c, ...a, ...c, ...d);
  const xa = Math.min(x0, x1),
    xb = Math.max(x0, x1);
  for (let i = 0; i < n; i++) {
    const u0 = xa + ((xb - xa) * i) / n;
    const u1 = xa + ((xb - xa) * (i + 1)) / n;
    const t0 = top(u0),
      t1 = top(u1);
    // top (normal +Y), front (+Z), back (-Z)
    quad([u0, t0, zF], [u1, t1, zF], [u1, t1, zB], [u0, t0, zB]);
    quad([u0, y0, zF], [u1, y0, zF], [u1, t1, zF], [u0, t0, zF]);
    quad([u1, y0, zB], [u0, y0, zB], [u0, t0, zB], [u1, t1, zB]);
  }
  // end caps
  const tA = top(xa),
    tB = top(xb);
  quad([xa, y0, zB], [xa, y0, zF], [xa, tA, zF], [xa, tA, zB]);
  quad([xb, y0, zF], [xb, y0, zB], [xb, tB, zB], [xb, tB, zF]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  b.add(g, undefined, { color });
  g.dispose();
}

/** horizontal patch draped over height(x, z) + lift (e.g. the paved photo pit on the bank) */
export function drape(b: GeoBucket, x0: number, x1: number, z0: number, z1: number, height: (x: number, z: number) => number, lift: number, color?: THREE.Color, step = 2): void {
  const nx = Math.max(1, Math.ceil(Math.abs(x1 - x0) / step));
  const nz = Math.max(1, Math.ceil(Math.abs(z1 - z0) / step));
  const pos: number[] = [];
  const P = (i: number, j: number) => {
    const x = x0 + ((x1 - x0) * i) / nx;
    const z = z0 + ((z1 - z0) * j) / nz;
    return [x, height(x, z) + lift, z];
  };
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = P(i, j),
        bb = P(i + 1, j),
        c = P(i + 1, j + 1),
        d = P(i, j + 1);
      // counter-clockwise seen from above (+Y)
      const up = (x1 - x0) * (z1 - z0) < 0;
      if (up) pos.push(...a, ...bb, ...c, ...a, ...c, ...d);
      else pos.push(...a, ...c, ...bb, ...a, ...d, ...c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  b.add(g, undefined, { color });
  g.dispose();
}

/** black tubular railing along a polyline at height h above each point */
export function railing(kit: StageKit, pts: THREE.Vector3[], h = 1.1, postEvery = 1.4): void {
  const col = METAL.black;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i],
      b = pts[i + 1];
    const len = a.distanceTo(b);
    const n = Math.max(1, Math.round(len / postEvery));
    for (let k = 0; k <= n; k++) {
      if (k === 0 && i > 0) continue;
      const p = a.clone().lerp(b, k / n);
      rod(kit.metal, p, p.clone().setY(p.y + h), 0.05, col);
    }
    rod(kit.metal, a.clone().setY(a.y + h), b.clone().setY(b.y + h), 0.055, col);
    rod(kit.metal, a.clone().setY(a.y + h * 0.5), b.clone().setY(b.y + h * 0.5), 0.035, col);
  }
}
