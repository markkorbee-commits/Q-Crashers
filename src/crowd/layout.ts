import type { Collider2D } from '../core/types';
import { clamp, hash32, hashN, lerp, Rng, smoothstep } from '../core/rng';
import { BOTTOM, HAIR, HEAD, newLook, packLook, PRINT, STAGE_FOCUS, TOP, ZONE, type Look } from './constants';

/**
 * Deterministic crowd layout (design-bible §9.2 zone table, §6.4 field furniture, §6.7 tree belts).
 *
 * Positions are drawn from a hex-offset jittered grid (0.42 m cells) whose acceptance probability is
 * the zone density; a smooth warp field breaks the lattice so aerials read as an organic carpet.
 * Thinning below full capacity is priority-weighted per zone (the pit and the floor fill first,
 * the back plaza and the crests thin first) so low presets still look packed where it matters.
 * Output arrays are sorted by an 8 m chunk grid (contiguous ranges → cheap LOD bucketing).
 */

export const CELL = 0.42;
export const CHUNK = 8;
export const CX0 = -112;
export const CZ0 = -8;
export const CNX = 28;
export const CNZ = 24;
/** density grid (for densityAt) */
export const DG = 2;
export const DGX0 = -112;
export const DGZ0 = -8;
export const DGNX = 112;
export const DGNZ = 92;

const PLINTHS: [number, number][] = [
  [-20, 36], [20, 36], [-20, 69], [20, 69], [-20, 102], [20, 102], [-20, 135], [20, 135],
];
// tree belts (terrain-layout.json, OSM outline) — nobody stands inside the woods
const LEFT_BELT: [number, number][] = [
  [16, -59], [17, -63], [-40, -63], [-54, -82], [-64, -75], [-123, -71], [-128, -63], [-128, -37], [-124, -34], [-121, 82],
  [-118, 91], [-91, 117], [-48, 116], [-48, 107], [-84, 107], [-91, 105], [-108, 89], [-108, -48], [-105, -55], [-97, -58],
];
const RIGHT_BELT: [number, number][] = [
  [128, -38], [124, -57], [118, -66], [109, -73], [98, -78], [87, -65], [24, -63], [27, -58], [87, -57], [99, -55], [105, -51],
  [108, -34], [108, 99], [58, 109], [56, 113], [129, 113],
];

function inPoly(x: number, z: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** pit barrier line (bible §5.4): (−92,−1) → (−46,6) → (46,6) → (92,−1) */
export function barrierZ(x: number): number {
  const ax = Math.abs(x);
  return ax <= 46 ? 6 : 6 - ((ax - 46) * 7) / 46;
}

/** x of the forward-arm rampart at depth z (bible §5.8: (±92,−4) → (±94,+58)) */
function rampartX(z: number): number {
  return 92 + (2 * (clamp(z, -4, 58) + 4)) / 62;
}

// floor depth profile (p/m², full capacity): A 4.5 → B 3.0 → C 2.2 → D 1.5 → G 0.6
const ZPROF: [number, number][] = [
  [6, 4.5], [28, 4.3], [33, 3.0], [58, 3.0], [63, 2.2], [109, 2.2], [116, 1.5], [133, 1.5], [140, 0.6], [172, 0.6], [174, 0],
];
function zProfile(z: number): number {
  if (z <= ZPROF[0][0]) return ZPROF[0][1];
  for (let i = 1; i < ZPROF.length; i++) {
    if (z <= ZPROF[i][0]) {
      const [z0, d0] = ZPROF[i - 1];
      const [z1, d1] = ZPROF[i];
      return lerp(d0, d1, (z - z0) / (z1 - z0));
    }
  }
  return 0;
}

export interface QueuePoint {
  x: number;
  z: number;
  /** outward direction (away from the counter) */
  dx: number;
  dz: number;
}

export interface LayoutInput {
  target: number;
  heightAt: (x: number, z: number) => number;
  colliders: readonly Collider2D[];
  queues: readonly QueuePoint[];
  flagTarget: number;
  /** no flag carriers within these circles (x, z, r): named viewpoints */
  flagAvoid?: readonly (readonly [number, number, number])[];
  seed?: number;
}

export interface FlagDef {
  carrier: number;
  type: number;
  pole: number;
  w: number;
  h: number;
}

export interface Chunk {
  start: number;
  count: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export interface CrowdLayout {
  count: number;
  pos: Float32Array;
  attr: Float32Array;
  look: Float32Array;
  chunks: Chunk[];
  flags: FlagDef[];
  density: Float32Array;
  zoneCounts: number[];
  capes: number;
}

/** full-capacity density (p/m²) and zone at a point; 0 where nobody may stand */
export function fullDensity(x: number, z: number, out: { zone: number }): number {
  const ax = Math.abs(x);
  if (z > 172 || z < -2 || ax > 107.5) return 0;
  if (z < barrierZ(x) + 0.7) return 0;
  // stage front of the side sections and the arm ramparts
  if (ax >= 37 && z < -3) return 0;
  if (z <= 59.5 && ax > 90.5) {
    const xr = rampartX(z);
    if (Math.abs(ax - xr) < 1.3) return 0;
    if (z > 55.5 && ax > xr - 3.5 && ax < xr + 3.5) return 0; // arm-end turret 4 x 4
  }
  if (inPoly(x, z, x < 0 ? LEFT_BELT : RIGHT_BELT)) return 0;

  let d: number;
  if (ax <= 44) {
    d = zProfile(z);
    if (z < 31) d *= 1 - 0.33 * smoothstep(22, 44, ax);
    else d *= 1 - 0.12 * smoothstep(30, 44, ax);
    out.zone = z < 30 ? ZONE.A : z < 60 ? ZONE.B : z < 113 ? ZONE.C : z < 137 ? ZONE.D : ZONE.G;
  } else if (z <= 105) {
    const behindRampart = z <= 58 ? ax > rampartX(z) : ax > 95;
    if (behindRampart) {
      d = 0.8;
      out.zone = ZONE.F;
    } else {
      // bank slope: continuous with the floor at the toe, thinner towards the rampart
      d = 1.8 * (1 - 0.18 * smoothstep(80, 92, ax));
      const floor = zProfile(z) * 0.88;
      d = lerp(floor, d, smoothstep(44, 50, ax));
      out.zone = ZONE.E;
    }
    d *= 1 - 0.35 * smoothstep(100, 105, z);
  } else if (z < 137) {
    d = ax < 60 ? 0.9 : 0.5;
    out.zone = ax < 60 ? ZONE.D : ZONE.F;
  } else {
    d = ax < 60 ? 0.6 : 0.35;
    out.zone = ZONE.G;
  }
  // delay-tower plinths: 8.5 m square + 1.5 m clear ring; ~4 m low-density lanes along the tower rows
  for (let i = 0; i < PLINTHS.length; i++) {
    const [px, pz] = PLINTHS[i];
    if (Math.abs(x - px) < 5.75 && Math.abs(z - pz) < 5.75) return 0;
  }
  const lane = Math.abs(ax - 20);
  if (lane < 2.2 && z > 3 && z < 137) d *= lerp(0.42, 1, smoothstep(1.2, 2.2, lane));
  // FOH / camera platform (X ±6.4, Z 87–93) and the piano riser (X ±2.8, Z 57–61) + 1.5 m ring, looser around
  if (ax < 7.9 && z > 85.5 && z < 94.5) return 0;
  if (ax < 4.3 && z > 55.5 && z < 62.5) return 0;
  const fohD = Math.max(ax - 6.4, 86.5 - z, z - 93.5, 0);
  if (fohD < 5) d *= lerp(0.7, 1, fohD / 5);
  return d;
}

function colliderHit(x: number, z: number, cs: readonly Collider2D[], m: number): boolean {
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (c.kind === 'box') {
      if (x > c.minX - m && x < c.maxX + m && z > c.minZ - m && z < c.maxZ + m) return true;
    } else {
      const dx = x - c.x;
      const dz = z - c.z;
      const r = c.r + m;
      if (dx * dx + dz * dz < r * r) return true;
    }
  }
  return false;
}

/** smooth value noise (deterministic) for the warp field and group clustering */
function vnoise(x: number, z: number, s: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const h = (a: number, c: number) => hash32(hashN(a, c, s)) / 4294967296;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  return lerp(lerp(h(ix, iz), h(ix + 1, iz), ux), lerp(h(ix, iz + 1), h(ix + 1, iz + 1), ux), uz);
}

/**
 * Priority of each zone when the crowd is thinned below full capacity: zone multiplier = k^p
 * (k solved per count). Small exponents fill first: the pit and the floor stay packed on low
 * presets, the banks, crests and the back plaza thin out first.
 */
const ZONE_P = [0.35, 0.5, 0.72, 1.3, 1.15, 2.0, 2.2, 1];
const MAX_MULT = 1.22; // 65,000 / 53,200

/** flag mix (design-bible §9.3): [atlas type, weight] — types are FLAG_TYPES indices in atlas.ts */
export const FLAG_MIX: [number, number][] = [
  [0, 20], // NL
  [1, 14], // tribe black / red (original emblem)
  [2, 3], // tribe black / white
  [3, 10], // DE
  [4, 6], // BE
  [5, 5], // UK
  [6, 5], // AU
  [7, 4], // IT
  [8, 4], // FR
  [9, 3], // ES
  [10, 3], // PL
  [11, 2], // NO
  [12, 2], // SE
  [13, 1], // FI
  [14, 1.5], // CH
  [15, 1.5], // AT
  [16, 3], // US
  [17, 1.5], // MX
  [18, 1.5], // CL
  [19, 1.5], // EU
  [20, 1], // JP
  [21, 1], // BR
  [22, 1], // IE
  [23, 1], // DK
  [24, 1.2], // Berserker banner
  [25, 1.2], // Guardian banner
  [26, 1.2], // Shaman banner
];
/** banner types (vertical pennants 40 x 150 cm) */
export const BANNER_TYPES = new Set([24, 25, 26]);

function pickWeighted(r: number, mix: [number, number][]): number {
  let total = 0;
  for (const [, w] of mix) total += w;
  let x = r * total;
  for (const [t, w] of mix) {
    x -= w;
    if (x <= 0) return t;
  }
  return mix[mix.length - 1][0];
}

function pickIdx(r: number, weights: number[]): number {
  let total = 0;
  for (const w of weights) total += w;
  let x = r * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x <= 0) return i;
  }
  return weights.length - 1;
}

/** appearance per person (design-bible §9.3 clothing palette and weights) */
function makeLook(rng: Rng, l: Look, zone: number): { height: number; build: number } {
  const female = rng.chance(0.35);
  l.female = female;
  l.skin = pickIdx(rng.next(), [16, 18, 18, 14, 11, 8, 6, 9]);
  l.leftHanded = rng.chance(0.14);
  // hair
  if (female) {
    l.hairStyle = pickIdx(rng.next(), [10, 55, 32, 3]);
    l.hairColor = pickIdx(rng.next(), [18, 26, 22, 8, 16, 6, 4, 0]);
  } else {
    l.hairStyle = pickIdx(rng.next(), [72, 4, 2, 22]);
    l.hairColor = pickIdx(rng.next(), [30, 30, 18, 8, 7, 2, 2, 3]);
  }
  // headwear: caps/bucket hats on 35 % of heads (60 % black), bandanas ~5 %
  const hw = rng.next();
  if (hw < 0.35) {
    const kind = rng.next();
    l.headwear = kind < 0.52 ? HEAD.CAP : kind < 0.72 ? HEAD.CAP_BACK : HEAD.BUCKET;
    l.capColor = rng.chance(0.6) ? (rng.chance(0.5) ? 0 : 1) : 2 + pickIdx(rng.next(), [22, 16, 18, 16, 10, 8]);
  } else if (hw < 0.4) {
    l.headwear = HEAD.BANDANA;
  } else l.headwear = HEAD.NONE;
  // tops
  const shirtless = !female && rng.chance(0.3);
  l.shirtless = shirtless;
  l.tank = !shirtless && rng.chance(female ? 0.35 : 0.15);
  const topPick = pickIdx(rng.next(), [34, 12, 7, 5, 6, 4, 8, 6, 2, 2.5, 2.5, 3, 4, 4, 0, 0]);
  l.top = topPick;
  l.print = PRINT.NONE;
  if (topPick === TOP.BLACK || topPick === TOP.CHARCOAL) {
    const p = rng.next();
    l.print = p < 0.58 ? PRINT.RED_EMBLEM : p < 0.74 ? PRINT.WHITE_TEXT : p < 0.8 ? PRINT.FLAMES : PRINT.NONE;
  } else if (topPick === TOP.PURPLE || topPick === TOP.MIDNIGHT) {
    l.print = rng.chance(0.35) ? PRINT.TIEDYE : PRINT.RED_EMBLEM * (rng.chance(0.3) ? 1 : 0);
  } else if (topPick === TOP.RED || topPick === TOP.WINE) {
    l.print = rng.chance(0.4) ? PRINT.WHITE_TEXT : PRINT.NONE;
  }
  // bottoms: shorts on a warm night, some jeans / cargo
  l.bottom = pickIdx(rng.next(), [45, 18, 10, 11, 8, 6, 2, 0]);
  l.longPants = l.bottom === BOTTOM.DARK_DENIM ? rng.chance(0.8) : rng.chance(0.14);
  l.socks = rng.chance(0.45);
  l.shoe = pickIdx(rng.next(), [42, 44, 10, 4]);
  l.wristband = rng.chance(0.55);
  // costumes (~2 %), flags worn as capes (~2 %)
  l.costume = rng.chance(0.02);
  l.costumeColor = rng.int(0, 3);
  if (l.costume) l.headwear = HEAD.NONE;
  l.cape = !l.costume && rng.chance(0.022);
  if (l.cape) l.capeFlag = pickWeighted(rng.next(), FLAG_MIX);
  l.flagCarrier = false;
  l.props = 0;
  l.glasses = rng.chance(0.07);
  l.beard = !female && rng.chance(0.3);
  if (zone === ZONE.Q) l.shirtless = l.shirtless && rng.chance(0.5);
  // height (1.55–2.0 m) and build
  const height = clamp(female ? 1.68 + rng.gauss() * 0.065 : 1.815 + rng.gauss() * 0.07, 1.55, 2.0);
  const build = female ? clamp(0.9 + rng.gauss() * 0.04, 0.82, 1.02) : clamp(1.02 + rng.gauss() * 0.06, 0.9, 1.22);
  if (l.hairStyle === HAIR.BUZZ && l.headwear === HEAD.NONE && rng.chance(0.3)) l.hairColor = 7;
  return { height, build };
}

interface Cand {
  x: number;
  z: number;
  zone: number;
  seed: number;
  yaw: number;
}

/** expected people count of the grid for a zone multiplier k */
function expectedCount(dens: Float32Array, zones: Uint8Array, k: number): number {
  const a = CELL * CELL;
  const mult = ZONE_P.map((p) => Math.min(MAX_MULT, Math.pow(k, p)));
  let s = 0;
  for (let i = 0; i < dens.length; i++) {
    const d = dens[i];
    if (d > 0) s += Math.min(1, d * mult[zones[i]] * a);
  }
  return s;
}

// cached static field (independent of count)
let fieldCache: { key: string; dens: Float32Array; zones: Uint8Array; nx: number; nz: number } | null = null;

const X0 = -108;
const X1 = 108;
const Z0 = -2;
const Z1 = 173;

function buildField(colliders: readonly Collider2D[], queues: readonly QueuePoint[]) {
  const key = `${colliders.length}:${queues.length}`;
  if (fieldCache && fieldCache.key === key) return fieldCache;
  const nx = Math.ceil((X1 - X0) / CELL);
  const nz = Math.ceil((Z1 - Z0) / CELL);
  const dens = new Float32Array(nx * nz);
  const zones = new Uint8Array(nx * nz);
  const zo = { zone: 0 };
  for (let iz = 0; iz < nz; iz++) {
    const z = Z0 + (iz + 0.5) * CELL;
    const off = (iz & 1) * 0.5 * CELL;
    for (let ix = 0; ix < nx; ix++) {
      const x = X0 + (ix + 0.5) * CELL + off;
      let d = fullDensity(x, z, zo);
      if (d > 0 && colliderHit(x, z, colliders, 0.45)) d = 0;
      if (d > 0) {
        // queue fields in front of the bar counters stay for the queues (added separately)
        for (let q = 0; q < queues.length; q++) {
          const Q = queues[q];
          const rx = x - Q.x;
          const rz = z - Q.z;
          const along = rx * Q.dx + rz * Q.dz;
          const side = Math.abs(rx * Q.dz - rz * Q.dx);
          if (along > -2 && along < 11 && side < 2.6) {
            d *= 0.15;
            break;
          }
        }
      }
      const i = iz * nx + ix;
      dens[i] = d;
      zones[i] = zo.zone;
    }
  }
  fieldCache = { key, dens, zones, nx, nz };
  return fieldCache;
}

/** Generate the crowd for `input.target` people (deterministic for identical input). */
export function generateLayout(input: LayoutInput): CrowdLayout {
  const seed = input.seed ?? 2026;
  const { dens, zones, nx, nz } = buildField(input.colliders, input.queues);

  // --- queues first (they count towards the total)
  const cands: Cand[] = [];
  for (let q = 0; q < input.queues.length; q++) {
    const Q = input.queues[q];
    const n = 5 + (hash32(hashN(seed, q, 77)) % 7);
    const px = -Q.dz;
    const pz = Q.dx;
    for (let k = 0; k < n; k++) {
      const hs = hashN(seed, q, k, 91);
      const j = (hash32(hs) / 4294967296 - 0.5) * 0.5;
      const dist = 1.1 + k * 0.62 + (hash32(hs + 1) / 4294967296) * 0.15;
      const x = Q.x + Q.dx * dist + px * j;
      const z = Q.z + Q.dz * dist + pz * j;
      if (colliderHit(x, z, input.colliders, 0.3)) continue;
      const yaw = Math.atan2(-Q.dx, -Q.dz) + (hash32(hs + 2) / 4294967296 - 0.5) * 0.5;
      cands.push({ x, z, zone: ZONE.Q, seed: hash32(hs + 3) & 0xffffff, yaw });
    }
  }
  const want = Math.max(0, input.target - cands.length);

  // --- solve the zone multiplier for the wanted count (bisection)
  let lo = 0;
  let hi = 2;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) / 2;
    if (expectedCount(dens, zones, mid) < want) lo = mid;
    else hi = mid;
  }
  const k = (lo + hi) / 2;
  const mult = ZONE_P.map((p) => Math.min(MAX_MULT, Math.pow(k, p)));
  const a = CELL * CELL;

  for (let iz = 0; iz < nz && cands.length < input.target; iz++) {
    const zc = Z0 + (iz + 0.5) * CELL;
    const off = (iz & 1) * 0.5 * CELL;
    for (let ix = 0; ix < nx; ix++) {
      const i = iz * nx + ix;
      const d = dens[i];
      if (d <= 0) continue;
      const zone = zones[i];
      const p = Math.min(1, d * mult[zone] * a);
      const h = hashN(seed, ix, iz);
      if (hash32(h) / 4294967296 >= p) continue;
      const xc = X0 + (ix + 0.5) * CELL + off;
      const r1 = hash32(h + 11) / 4294967296;
      const r2 = hash32(h + 12) / 4294967296;
      let x = xc + (r1 - 0.5) * CELL * 0.62;
      let z = zc + (r2 - 0.5) * CELL * 0.62;
      // organic warp (breaks the lattice lines)
      x += (vnoise(xc * 0.31, zc * 0.31, 5) - 0.5) * 0.55;
      z += (vnoise(xc * 0.31 + 17.3, zc * 0.31 - 4.1, 6) - 0.5) * 0.55;
      const sparse = zone === ZONE.D || zone === ZONE.F || zone === ZONE.G;
      let yaw = Math.atan2(STAGE_FOCUS.x - x, STAGE_FOCUS.y - z);
      const r3 = hash32(h + 13) / 4294967296;
      const r4 = hash32(h + 14) / 4294967296;
      if (sparse) {
        // friends in small groups: pull towards a group anchor and face it
        const gx = Math.floor(x / 3.2);
        const gz = Math.floor(z / 3.2);
        const gh = hashN(seed, gx, gz, 3);
        if (hash32(gh) / 4294967296 < (zone === ZONE.G ? 0.55 : 0.35)) {
          const ax = (gx + 0.3 + 0.4 * (hash32(gh + 1) / 4294967296)) * 3.2;
          const az = (gz + 0.3 + 0.4 * (hash32(gh + 2) / 4294967296)) * 3.2;
          const dx = x - ax;
          const dz = z - az;
          const dl = Math.hypot(dx, dz) || 1;
          const rr = 0.55 + 0.35 * r3;
          x = ax + (dx / dl) * rr;
          z = az + (dz / dl) * rr;
          if (r4 < 0.75) yaw = Math.atan2(ax - x, az - z);
        }
        yaw += (r3 - 0.5) * 0.9;
      } else {
        yaw += (r3 - 0.5) * 0.36 + (vnoise(x * 0.2, z * 0.2, 9) - 0.5) * 0.3;
      }
      cands.push({ x, z, zone, seed: hash32(h + 15) & 0xffffff, yaw });
      if (cands.length >= input.target) break;
    }
  }

  // --- sort by chunk (counting sort)
  const n = cands.length;
  const nChunks = CNX * CNZ;
  const chunkOf = new Int32Array(n);
  const counts = new Int32Array(nChunks);
  for (let i = 0; i < n; i++) {
    const c = cands[i];
    const cx = clamp(Math.floor((c.x - CX0) / CHUNK), 0, CNX - 1);
    const cz = clamp(Math.floor((c.z - CZ0) / CHUNK), 0, CNZ - 1);
    const ci = cz * CNX + cx;
    chunkOf[i] = ci;
    counts[ci]++;
  }
  const starts = new Int32Array(nChunks);
  for (let c = 1; c < nChunks; c++) starts[c] = starts[c - 1] + counts[c - 1];
  const fill = starts.slice();
  const order = new Int32Array(n);
  for (let i = 0; i < n; i++) order[fill[chunkOf[i]]++] = i;

  const pos = new Float32Array(n * 4);
  const attr = new Float32Array(n * 4);
  const look = new Float32Array(n * 4);
  const zoneCounts = [0, 0, 0, 0, 0, 0, 0, 0];
  const l = newLook();
  const chunks: Chunk[] = [];
  const chunkIndexOfSlot = new Int32Array(n);
  for (let c = 0; c < nChunks; c++) {
    if (counts[c] === 0) continue;
    const cx = c % CNX;
    const cz = Math.floor(c / CNX);
    chunks.push({
      start: starts[c],
      count: counts[c],
      // margin: step-aside push (≤ 1 m), jitter, walkers (± 2.4 m)
      minX: CX0 + cx * CHUNK - 3.2,
      maxX: CX0 + (cx + 1) * CHUNK + 3.2,
      minZ: CZ0 + cz * CHUNK - 3.2,
      maxZ: CZ0 + (cz + 1) * CHUNK + 3.2,
      minY: Infinity,
      maxY: -Infinity,
    });
    for (let s = starts[c]; s < starts[c] + counts[c]; s++) chunkIndexOfSlot[s] = chunks.length - 1;
  }
  let capes = 0;
  for (let s = 0; s < n; s++) {
    const c = cands[order[s]];
    const y = input.heightAt(c.x, c.z);
    const rng = new Rng(c.seed * 2654435761 + 7);
    const { height, build } = makeLook(rng, l, c.zone);
    if (l.cape) capes++;
    pos[s * 4] = c.x;
    pos[s * 4 + 1] = y;
    pos[s * 4 + 2] = c.z;
    pos[s * 4 + 3] = c.yaw;
    attr[s * 4] = height;
    attr[s * 4 + 1] = build;
    attr[s * 4 + 2] = c.seed;
    attr[s * 4 + 3] = c.zone;
    packLook(l, look, s * 4);
    zoneCounts[c.zone]++;
    const ch = chunks[chunkIndexOfSlot[s]];
    ch.minY = Math.min(ch.minY, y);
    ch.maxY = Math.max(ch.maxY, y);
  }
  for (const ch of chunks) {
    ch.minY -= 0.3;
    ch.maxY += 2.6;
  }

  // --- flag carriers: 0.8 % (capped by quality), most in zones B–C and on the banks
  const flags: FlagDef[] = [];
  const FW = [0.5, 1.2, 1.5, 0.8, 1.0, 0.25, 0.2, 0];
  const keys: { k: number; s: number }[] = [];
  const avoid = input.flagAvoid ?? [];
  for (let s = 0; s < n; s++) {
    const zone = attr[s * 4 + 3];
    const w = FW[zone];
    if (w <= 0) continue;
    // keep the default viewpoints and the pit front centre (the view of the DJ arch) clear of flags
    const px = pos[s * 4];
    const pz = pos[s * 4 + 2];
    if (Math.abs(px) < 8 && pz < 14) continue;
    let blocked = false;
    for (let a = 0; a < avoid.length && !blocked; a++) {
      const [ax, az, ar] = avoid[a];
      blocked = (px - ax) * (px - ax) + (pz - az) * (pz - az) < ar * ar;
    }
    if (blocked) continue;
    const r = hash32(hashN(attr[s * 4 + 2], 4242)) / 4294967296;
    keys.push({ k: r / w, s });
  }
  keys.sort((p, q) => p.k - q.k);
  const nf = Math.min(input.flagTarget, keys.length);
  for (let i = 0; i < nf; i++) {
    const s = keys[i].s;
    const sd = attr[s * 4 + 2];
    const type = pickWeighted(hash32(hashN(sd, 17)) / 4294967296, FLAG_MIX);
    const banner = BANNER_TYPES.has(type);
    const pole = 2.1 + (hash32(hashN(sd, 18)) / 4294967296) * 1.6; // pole top 2.8–4.5 m incl. raised arms
    flags.push({ carrier: s, type, pole, w: banner ? 0.42 : 1.5, h: banner ? 1.5 : 0.9 });
    // mark carrier in the look (bit 6 of look.z)
    look[s * 4 + 2] = look[s * 4 + 2] | 64;
  }

  // --- density grid (people per m²) for densityAt()
  const density = new Float32Array(DGNX * DGNZ);
  for (let s = 0; s < n; s++) {
    const gx = Math.floor((pos[s * 4] - DGX0) / DG);
    const gz = Math.floor((pos[s * 4 + 2] - DGZ0) / DG);
    if (gx < 0 || gz < 0 || gx >= DGNX || gz >= DGNZ) continue;
    density[gz * DGNX + gx] += 1 / (DG * DG);
  }
  return { count: n, pos, attr, look, chunks, flags, density, zoneCounts, capes };
}

/** bilinear sample of the density grid */
export function sampleDensity(g: Float32Array, x: number, z: number): number {
  const fx = (x - DGX0) / DG - 0.5;
  const fz = (z - DGZ0) / DG - 0.5;
  const ix = Math.floor(fx);
  const iz = Math.floor(fz);
  const tx = fx - ix;
  const tz = fz - iz;
  const at = (a: number, c: number) => (a < 0 || c < 0 || a >= DGNX || c >= DGNZ ? 0 : g[c * DGNX + a]);
  return lerp(lerp(at(ix, iz), at(ix + 1, iz), tx), lerp(at(ix, iz + 1), at(ix + 1, iz + 1), tx), tz);
}

/** analytic relief (design-bible §6.2) — used when no terrain system provides heightAt */
export function analyticHeight(x: number, z: number): number {
  const ax = Math.abs(x);
  let side = 0;
  if (z >= -20 && z <= 115) {
    if (ax <= 100) side = clamp((ax - 46) * 0.096, 0, 5.2);
    else if (ax <= 109) side = 5.2 + ((ax - 100) / 9) * 0.4;
    else side = Math.max(0, 5.4 - (ax - 109) * 0.32);
    if (z > 105) side *= 1 - smoothstep(105, 115, z);
  }
  const rear = z < -5 ? clamp((-z - 5) * 0.1, 0, 5.6) : 0;
  let y = Math.max(side, rear);
  if (z > 113) y += (-0.5 * (z - 113)) / 59;
  return y;
}
