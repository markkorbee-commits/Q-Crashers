import * as THREE from 'three';
import { Anchors, type AnchorName } from '../core/Anchors';
import { hash32 } from '../core/rng';

/**
 * The 2026 RED show rig (moving heads, strobes, blinders) laid out in world metres.
 *
 * Positions and counts follow research/design-bible.md §5 (geometry) and §7.1 (rig plan):
 * beams on the wing leading edges (6 finger spars, 1.2–1.3 m pitch), the dragon skull (8), the castle
 * roofline (crenellations Y 9.5 at Z −12), the deck lip (Y 1.9), the 4 PA hang-tower tops (Y 16.5, 8 each),
 * the side-section walls (Y 9.5, Z −4), the corner towers (±92, −4, top 15), the arm-end turrets
 * (±94, 58, top 12.5) and the obelisk capitals (X ±20, Y 9.6); hybrids on the castle / side towers; strobes on
 * the deck lip, wing spars, castle roof and arms; blinders on the deck front, corner towers and obelisks.
 * Anchors registered by the geometry owners override the estimates (fixtures_truss, fixtures_floor,
 * pillars_top/base, delay_towers, foh, wing_left/right, towers_top, dragon_head).
 */

// ---- look groups (show-format `groups`) -------------------------------------------------------
export const G_TRUSS = 0;
export const G_FLOOR = 1;
export const G_TOWERS = 2;
export const G_FIELD = 3;
export const GROUP_NAMES = ['truss', 'floor', 'towers', 'field'] as const;

// ---- position tags (cue `target` filtering) ----------------------------------------------------
export const T_SPAR = 1 << 0; // wing finger spars (leading edges)
export const T_ARM = 1 << 1; // forward arms (rampart strobes)
export const T_ROOF = 1 << 2; // castle roofline / crenellations
export const T_TOWER = 1 << 3; // castle + side-section tower tops (hybrids)
export const T_DRAGON = 1 << 4; // dragon skull
export const T_PA = 1 << 5; // PA hang-tower tops
export const T_SIDE = 1 << 6; // side-section wall tops
export const T_ARMEND = 1 << 7; // arm-end turrets
export const T_DECK = 1 << 8; // deck lip
export const T_CORNER = 1 << 9; // corner towers (±92, −4)
export const T_PILLAR = 1 << 10; // obelisk capitals (delay towers)
export const T_PLINTH = 1 << 11; // obelisk plinths (blinders)
export const T_FOH = 1 << 12; // FOH / camera platform
export const T_ALL = (1 << 13) - 1;

export const GROUP_TAGS = [T_SPAR | T_ARM | T_ROOF | T_TOWER | T_DRAGON | T_PA | T_SIDE | T_ARMEND | T_CORNER, T_DECK, T_PILLAR | T_PLINTH, T_FOH];

/** cue target name -> tag mask (show-format anchor names + a few friendly aliases) */
const TARGET_TAGS: Record<string, number> = {
  all: T_ALL,
  truss: GROUP_TAGS[0],
  fixtures_truss: GROUP_TAGS[0],
  floor: GROUP_TAGS[1],
  fixtures_floor: GROUP_TAGS[1],
  towers: T_PILLAR | T_PLINTH,
  field: T_FOH,
  delay_towers: T_PILLAR | T_PLINTH,
  pillars: T_PILLAR | T_PLINTH,
  pillars_top: T_PILLAR,
  pillars_base: T_PLINTH,
  laser_field: T_PILLAR | T_FOH | T_ARMEND,
  foh: T_FOH,
  wings: T_SPAR,
  wing_left: T_SPAR,
  wing_right: T_SPAR,
  wing_tips: T_SPAR,
  deck: T_DECK,
  deck_front: T_DECK,
  deck_back: T_DECK,
  roof: T_ROOF | T_TOWER | T_DRAGON | T_PA,
  towers_top: T_TOWER,
  castle: T_ROOF | T_TOWER,
  dragon: T_DRAGON,
  dragon_head: T_DRAGON,
  dragon_mouth: T_DRAGON,
  dragon_eyes: T_DRAGON,
  speaker_hangs: T_PA,
  sides: T_SIDE | T_CORNER | T_ARM | T_ARMEND,
  side_sections: T_SIDE | T_CORNER,
  corners: T_CORNER,
  arms: T_ARM | T_ARMEND,
  laser_stage: T_ROOF | T_TOWER | T_SIDE | T_CORNER,
  stage: GROUP_TAGS[0] | GROUP_TAGS[1],
};

/** Resolved cue target filter: tag mask + optional side filter (-1 left, 1 right, 2 centre, 0 none). */
export interface TargetFilter {
  tags: number;
  side: number;
}

export function parseTargets(targets: readonly string[], groups: unknown, out: TargetFilter): TargetFilter {
  let tags = 0;
  let left = false;
  let right = false;
  let center = false;
  for (const t of targets) {
    if (t === 'left' || t === 'wing_left') left = true;
    if (t === 'right' || t === 'wing_right') right = true;
    if (t === 'center') center = true;
    const m = TARGET_TAGS[t];
    if (m) tags |= m;
  }
  const g = typeof groups === 'string' ? [groups] : Array.isArray(groups) ? groups : null;
  if (g) {
    let gm = 0;
    for (const name of g) {
      const i = GROUP_NAMES.indexOf(name as (typeof GROUP_NAMES)[number]);
      if (i >= 0) gm |= GROUP_TAGS[i];
    }
    if (gm) tags = tags && tags !== T_ALL ? tags & gm : gm;
  }
  out.tags = tags || T_ALL;
  out.side = center ? 2 : left && !right ? -1 : right && !left ? 1 : 0;
  return out;
}

export function matchTarget(f: TargetFilter, tags: number, x: number): boolean {
  if ((f.tags & tags) === 0) return false;
  if (f.side === 0) return true;
  if (f.side === 2) return Math.abs(x) < 14;
  return f.side < 0 ? x < -0.5 : x > 0.5;
}

/** groups param -> bitmask over G_* (default all four) */
export function parseGroups(groups: unknown): number {
  const g = typeof groups === 'string' ? [groups] : Array.isArray(groups) ? groups : null;
  if (!g) return 0b1111;
  let m = 0;
  for (const name of g) {
    const i = GROUP_NAMES.indexOf(name as (typeof GROUP_NAMES)[number]);
    if (i >= 0) m |= 1 << i;
  }
  return m || 0b1111;
}

// ---- fixtures -----------------------------------------------------------------------------------

export interface Fixture {
  index: number;
  group: number;
  tags: number;
  /** pan/tilt pivot (m) */
  pos: THREE.Vector3;
  /** hung upside down from a truss/structure (body orientation only) */
  hang: boolean;
  /** horizontal facing direction of the mount (unit) */
  fwd: THREE.Vector3;
  /** right vector = up x fwd (unit, horizontal) */
  right: THREE.Vector3;
  /** horizontal axis along which fans spread (unit) */
  fanAxis: THREE.Vector3;
  /** -1 left of centre, +1 right, 0 centre */
  side: number;
  /** sign that turns a positive pan angle "outwards" (away from the centre line) */
  out: number;
  /** sign that turns a positive fan angle (towards +fanAxis) outwards */
  fanOut: number;
  /** +1 when a positive pan turns towards world +X */
  rx: number;
  /** -1..1 position across the whole rig */
  u: number;
  cluster: number;
  /** index / size in cluster and -1..1 position in cluster (build order) */
  k: number;
  n: number;
  ck: number;
  /** -1..1 position in the cluster measured along fanAxis: fans diverge (never cross) with it */
  cx: number;
  /** 0..1 deterministic per-fixture random */
  seed: number;
  /** rest (home) direction used while dark */
  rest: THREE.Vector3;
}

export interface Emitter {
  kind: 'strobe' | 'blinder';
  tags: number;
  pos: THREE.Vector3;
  fwd: THREE.Vector3;
  /** strobes facing both ways (e.g. on pillars) */
  twoSided: boolean;
  seed: number;
  /** housing size (m) */
  size: THREE.Vector3;
}

export interface Pillar {
  top: THREE.Vector3;
  base: THREE.Vector3;
  /** top of the capital (fixture ledge) */
  capitalY: number;
  /** row index counted from the stage (for chases) */
  row: number;
  /** index in anchors 'pillars_top' (env.pillarChase index) */
  index: number;
}

export interface Rig {
  fixtures: Fixture[];
  emitters: Emitter[];
  pillars: Pillar[];
  rows: number;
  clusters: number;
  /** signature of the anchor arrays used (rebuild when they change) */
  sources: THREE.Vector3[][];
}

const DEFAULTS = new Anchors();
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** true when the anchor still holds the design-bible default (nobody registered real geometry) */
export function isDefaultAnchor(anchors: Anchors, name: AnchorName): boolean {
  const a = anchors.get(name);
  const d = DEFAULTS.get(name);
  if (a.length !== d.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].distanceToSquared(d[i]) > 1e-6) return false;
  return true;
}

// ---- design-bible §5 geometry ------------------------------------------------------------------
/** wing finger spars (left wing; mirrored): root (x, y) -> tip (x, y); wing plane Z −20 leaning back 10° */
const SPARS: [number, number, number, number][] = [
  [-6, 15, -14.5, 26.5],
  [-9, 14, -29, 28],
  [-12, 13, -40.5, 26.5],
];
const WING_LEAN = Math.tan((10 * Math.PI) / 180);
/** castle core towers (x, top y) and side-section towers, facade Z −12 / −10 */
const CASTLE_TOWERS: [number, number, number][] = [
  [14, 16, -12],
  [24, 14, -12],
  [48, 13.5, -10],
  [63, 13.5, -10],
  [78, 13.5, -10],
];
const PA_TOWERS: [number, number][] = [
  [11, -4],
  [31, -6],
];
const CORNER = { x: 92, z: -4, top: 15 };
const ARM_END = { x: 94, z: 58, top: 12.5 };
/** obelisks: X ±20, Z 36/69/102/135, capital Y 8.8–9.6, crystal tip Y 12.8 */
const OBELISK_Z = [36, 69, 102, 135];
const OBELISK_X = 20;
const CRYSTAL_TIP = 12.8;
const CAPITAL_TOP = 9.6;
/** FOH / camera platform (0, 0.5, 90), 12.8 x 6 m */
const FOH = v3(0, 0.5, 90);

export const RIG_SOURCES: AnchorName[] = ['fixtures_truss', 'fixtures_floor', 'pillars_top', 'pillars_base', 'delay_towers', 'foh', 'wing_left', 'wing_right', 'towers_top', 'dragon_head'];

/** z offset of the wing fixtures (in front of the membrane at the spar root height) */
function wingBaseZ(anchors: Anchors): number {
  const pts = [...anchors.get('wing_left'), ...anchors.get('wing_right')];
  if (pts.length === 0 || (isDefaultAnchor(anchors, 'wing_left') && isDefaultAnchor(anchors, 'wing_right'))) return -19;
  let z = 0;
  for (const p of pts) z += p.z;
  return Math.max(-28, Math.min(-3, z / pts.length + 1));
}

/** castle tower tops: registered anchor, else the bible's castle + side-section towers */
function castleTowers(anchors: Anchors): THREE.Vector3[] {
  if (!isDefaultAnchor(anchors, 'towers_top') && anchors.get('towers_top').length > 0) return anchors.get('towers_top');
  const out: THREE.Vector3[] = [];
  for (const s of [-1, 1]) for (const [x, y, z] of CASTLE_TOWERS) out.push(v3(s * x, y, z));
  return out;
}

/**
 * Build the rig. `density` scales fixture counts (1 = the bible's ~300-beam plan) so the quality
 * preset's beam budget is honoured.
 */
export function buildRig(anchors: Anchors, density: number, own?: Map<string, THREE.Vector3[]>): Rig {
  /** anchor holds real geometry registered by its owner (not the default, not our own publication) */
  const registered = (name: AnchorName) => {
    const a = anchors.get(name);
    return a.length > 0 && !isDefaultAnchor(anchors, name) && own?.get(name) !== a;
  };
  const fixtures: Fixture[] = [];
  const emitters: Emitter[] = [];
  let cluster = 0;
  const cnt = (n: number, min = 1) => Math.max(min, Math.round(n * density));
  const UP = v3(0, 1, 0);
  const Z = v3(0, 0, 1);
  const X = v3(1, 0, 0);

  const add = (group: number, tags: number, pos: THREE.Vector3, fwd: THREE.Vector3, hang: boolean, k: number, n: number, cl: number, fanAxis = X) => {
    const i = fixtures.length;
    const f = fwd.clone().setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(UP, f).normalize();
    const side = pos.x < -0.75 ? -1 : pos.x > 0.75 ? 1 : 0;
    // positive pan turns towards `right`; flip for fixtures left of centre so + = outwards
    const out = side === 0 ? 1 : Math.sign(right.x * side) || 1;
    fixtures.push({
      index: i,
      group,
      tags,
      pos: pos.clone(),
      hang,
      fwd: f,
      right,
      fanAxis: fanAxis.clone(),
      side,
      out,
      fanOut: side === 0 ? 1 : fanAxis.x * side >= 0 ? 1 : -1,
      rx: right.x >= 0 ? 1 : -1,
      u: Math.max(-1, Math.min(1, pos.x / 94)),
      cluster: cl,
      k,
      n,
      ck: n > 1 ? (k / (n - 1)) * 2 - 1 : 0,
      cx: 0,
      seed: hash32(i * 7919 + 17) / 4294967296,
      rest: new THREE.Vector3(),
    });
  };
  /** a row of n fixtures centred on c along a (pitch m) — one cluster */
  const row = (group: number, tags: number, n: number, c: THREE.Vector3, a: THREE.Vector3, pitch: number, fwd: THREE.Vector3, hang = false, fanAxis = X) => {
    for (let k = 0; k < n; k++) add(group, tags, c.clone().addScaledVector(a, (k - (n - 1) / 2) * pitch), fwd, hang, k, n, cluster, fanAxis);
    cluster++;
  };
  /** a compact 2-row block of n fixtures on a truss top / turret */
  const block = (group: number, tags: number, n: number, c: THREE.Vector3, fwd: THREE.Vector3, fanAxis = X) => {
    const cols = Math.ceil(n / 2);
    const side = new THREE.Vector3().crossVectors(UP, fwd).normalize();
    for (let k = 0; k < n; k++) {
      const col = k % cols;
      const r = Math.floor(k / cols);
      const p = c.clone().addScaledVector(side, (col - (cols - 1) / 2) * 0.62).addScaledVector(fwd, r === 0 ? 0.3 : -0.3);
      add(group, tags, p, fwd, false, k, n, cluster, fanAxis);
    }
    cluster++;
  };
  const strobe = (tags: number, pos: THREE.Vector3, fwd: THREE.Vector3, twoSided = false) =>
    emitters.push({ kind: 'strobe', tags, pos: pos.clone(), fwd: fwd.clone().normalize(), twoSided, seed: hash32(emitters.length * 131 + 5) / 4294967296, size: v3(0.62, 0.16, 0.22) });
  const blinder = (tags: number, pos: THREE.Vector3, fwd: THREE.Vector3) =>
    emitters.push({ kind: 'blinder', tags, pos: pos.clone(), fwd: fwd.clone().normalize(), twoSided: false, seed: hash32(emitters.length * 131 + 5) / 4294967296, size: v3(0.62, 0.62, 0.2) });

  const wz = wingBaseZ(anchors);
  const wingZ = (y: number) => wz - (y - 14) * WING_LEAN;

  // ------------------------------------------------------------------------ stage structure (truss)
  if (registered('fixtures_truss')) {
    // registered by the stage engineer: cluster consecutive fixtures (sorted by x, split on gaps)
    cluster = addAnchorClusters(anchors.get('fixtures_truss'), G_TRUSS, T_ROOF, false, cluster, add);
  } else {
    // wing leading edges: continuous rows along the 6 finger spars (bible: 2 x 60 at ~1.3 m pitch)
    for (const s of [-1, 1]) {
      for (const [rx, ry, tx, ty] of SPARS) {
        const p0 = v3(s < 0 ? rx : -rx, ry, 0);
        const p1 = v3(s < 0 ? tx : -tx, ty, 0);
        const len = p0.distanceTo(p1);
        const n = cnt(len / 1.3, 3);
        for (let k = 0; k < n; k++) {
          const a = 0.08 + (0.86 * k) / Math.max(1, n - 1);
          const x = p0.x + (p1.x - p0.x) * a;
          const y = p0.y + (p1.y - p0.y) * a;
          add(G_TRUSS, T_SPAR, v3(x, y, wingZ(y)), Z, false, k, n, cluster);
        }
        cluster++;
      }
    }
    // dragon skull: 8 heads (FACT, teardown), on the registered head if any
    const head = anchors.get('dragon_head')[0];
    const hasHead = !!head && !isDefaultAnchor(anchors, 'dragon_head');
    const hx = hasHead ? head.x : -2.5;
    const hy = hasHead ? head.y + 4.6 : 18.6;
    const hz = hasHead ? head.z - 0.8 : -12.6;
    const nSkull = cnt(8, 2);
    for (let k = 0; k < nSkull; k++) {
      const a = (k / (nSkull - 1)) * 2 - 1;
      add(G_TRUSS, T_DRAGON, v3(hx + a * 3.9, hy + 0.9 * (1 - a * a), hz), Z, false, k, nSkull, cluster);
    }
    cluster++;
    // castle roofline: crenellations Y 9.5 at the facade Z −12, X ±7.5…±36.5 (bible: 40)
    for (const s of [-1, 1])
      for (const cx of [14.5, 29.5]) row(G_TRUSS, T_ROOF, cnt(10, 2), v3(s * cx, 9.95, -12.4), X, 1.45, Z);
    // castle + side-section tower tops (hybrids)
    for (const p of castleTowers(anchors)) row(G_TRUSS, T_TOWER, cnt(2), v3(p.x, p.y + 0.3, p.z + 1.2), X, 1.5, Z);
    // PA hang-tower tops (Y 16.5, 8 heads each)
    for (const s of [-1, 1]) for (const [x, z] of PA_TOWERS) block(G_TRUSS, T_PA, cnt(8, 2), v3(s * x, 16.8, z), Z);
    // side-section walls: wall top Y 9.5, front Z −4, X ±40…±90 (bible: 32)
    for (const s of [-1, 1]) for (const cx of [52, 77]) row(G_TRUSS, T_SIDE, cnt(8, 2), v3(s * cx, 9.95, -4.4), X, 1.6, Z);
    // corner towers (±92, −4), top Y 15: beam fans (bible: 12)
    for (const s of [-1, 1]) block(G_TRUSS, T_CORNER, cnt(6, 2), v3(s * CORNER.x, CORNER.top + 0.3, CORNER.z), Z);
    // arm-end turrets (±94, 58), top Y 12.5: fans aimed across the field (bible: 10)
    for (const s of [-1, 1]) block(G_TRUSS, T_ARMEND, cnt(5, 2), v3(s * ARM_END.x, ARM_END.top + 0.3, ARM_END.z), v3(-s, 0, 0), Z);
  }

  // ------------------------------------------------------------------------ floor (deck lip)
  if (registered('fixtures_floor')) {
    cluster = addAnchorClusters(anchors.get('fixtures_floor'), G_FLOOR, T_DECK, false, cluster, add);
  } else {
    // deck lip X ±37, Y 1.9 (bible: 40) in 4 truss segments
    for (const cx of [-28, -9.5, 9.5, 28]) row(G_FLOOR, T_DECK, cnt(10, 2), v3(cx, 2.2, -0.65), X, 1.7, Z);
  }

  // ------------------------------------------------------------------------ obelisk capitals
  const pillars = resolvePillars(anchors);
  const rows = pillars.reduce((m, p) => Math.max(m, p.row + 1), 0);
  const nCap = density >= 1.25 ? 2 : 1;
  const MZ = v3(0, 0, -1);
  for (const p of pillars) {
    const s = p.top.x < 0 ? -1 : 1;
    // on the capital ledge, aisle side
    for (let k = 0; k < nCap; k++) {
      const dz = nCap > 1 ? (k === 0 ? -1.15 : 1.15) : -1.15;
      add(G_TOWERS, T_PILLAR, v3(p.top.x - s * 1.25, p.capitalY + 0.35, p.top.z + dz), MZ, false, k, nCap, cluster);
    }
    cluster++;
  }

  // ------------------------------------------------------------------------ FOH platform
  const fohRegistered = registered('foh');
  const foh = fohRegistered ? anchors.get('foh')[0] : FOH;
  const fohHang = foh.y > 4;
  row(G_FIELD, T_FOH, cnt(6, 2), v3(foh.x, foh.y + (fohHang ? -0.5 : 0.4), foh.z - 2.7), X, 2, MZ, fohHang);

  // ------------------------------------------------------------------------ strobes & blinders
  // deck lip 40
  for (let k = 0; k < 40; k++) strobe(T_DECK, v3(-36.2 + (72.4 * (k + 0.5)) / 40, 2.0, 0.05), Z);
  for (const s of [-1, 1]) {
    // wing spars 20 per wing (between the moving heads)
    const per = [5, 7, 8];
    SPARS.forEach(([rx, ry, tx, ty], i) => {
      for (let k = 0; k < per[i]; k++) {
        const a = 0.15 + (0.8 * (k + 0.5)) / per[i];
        const x = (s < 0 ? rx : -rx) + ((s < 0 ? tx : -tx) - (s < 0 ? rx : -rx)) * a;
        const y = ry + (ty - ry) * a;
        strobe(T_SPAR, v3(x, y - 0.4, wingZ(y) + 0.25), Z);
      }
    });
    // castle roof 6 per side
    for (let k = 0; k < 6; k++) strobe(T_ROOF, v3(s * (9 + k * 5.4), 9.6, -12.1), Z);
    // forward arms 4 per side on the rampart (Y ≈ 5.9), facing the field
    for (let k = 0; k < 4; k++) strobe(T_ARM, v3(s * (92.6 + k * 0.4), 6.1, 6 + k * 14), v3(-s, 0, 0));
    // corner towers: 4 blinders each, facing the audience
    for (let k = 0; k < 4; k++) blinder(T_CORNER, v3(s * CORNER.x + (k % 2 ? 0.8 : -0.8), CORNER.top - 2.2 - Math.floor(k / 2) * 0.9, CORNER.z + 3.1), Z);
  }
  // deck front 24 blinders
  for (let k = 0; k < 24; k++) blinder(T_DECK, v3(-35.5 + (71 * (k + 0.5)) / 24, 2.6, -0.3), Z);
  // obelisks: one blinder each under the capital, facing +Z (with the delay arrays)
  for (const p of pillars) blinder(T_PLINTH, v3(p.top.x, p.capitalY - 1.4, p.top.z + 1.45), Z);

  // fan "diverge" coordinate per cluster: position along the fan axis relative to the cluster centre
  computeDiverge(fixtures);
  // rest directions: fanned up and slightly towards the audience
  for (const f of fixtures) {
    const a = ((f.cx * 28 + f.fanOut * Math.abs(f.side) * 12) * Math.PI) / 180;
    f.rest
      .copy(UP)
      .multiplyScalar(Math.cos(a))
      .addScaledVector(f.fanAxis, Math.sin(a))
      .multiplyScalar(Math.cos(0.3))
      .addScaledVector(f.fwd, Math.sin(0.3))
      .normalize();
  }

  return { fixtures, emitters, pillars, rows, clusters: cluster, sources: RIG_SOURCES.map((n) => anchors.get(n)) };
}

function computeDiverge(fixtures: Fixture[]): void {
  const byCluster = new Map<number, Fixture[]>();
  for (const f of fixtures) {
    let a = byCluster.get(f.cluster);
    if (!a) byCluster.set(f.cluster, (a = []));
    a.push(f);
  }
  for (const list of byCluster.values()) {
    if (list.length < 2) continue;
    const c = new THREE.Vector3();
    for (const f of list) c.add(f.pos);
    c.multiplyScalar(1 / list.length);
    let m = 0;
    for (const f of list) m = Math.max(m, Math.abs(f.pos.clone().sub(c).dot(f.fanAxis)));
    for (const f of list) f.cx = m > 0.05 ? f.pos.clone().sub(c).dot(f.fanAxis) / m : f.ck;
  }
}

type AddFn = (group: number, tags: number, pos: THREE.Vector3, fwd: THREE.Vector3, hang: boolean, k: number, n: number, cl: number, fanAxis?: THREE.Vector3) => void;

function addAnchorClusters(pts: THREE.Vector3[], group: number, tags: number, hang: boolean, cluster: number, add: AddFn): number {
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const Z = new THREE.Vector3(0, 0, 1);
  let start = 0;
  for (let i = 1; i <= sorted.length; i++) {
    const split = i === sorted.length || sorted[i].distanceTo(sorted[i - 1]) > 6 || i - start >= 12;
    if (!split) continue;
    const n = i - start;
    for (let k = 0; k < n; k++) add(group, tags, sorted[start + k], Z, hang, k, n, cluster);
    cluster++;
    start = i;
  }
  return cluster;
}

export function resolvePillars(anchors: Anchors): Pillar[] {
  let tops: THREE.Vector3[] = [];
  let bases: THREE.Vector3[] = [];
  if (!isDefaultAnchor(anchors, 'pillars_top')) {
    tops = anchors.get('pillars_top');
    bases = isDefaultAnchor(anchors, 'pillars_base') ? [] : anchors.get('pillars_base');
  } else if (!isDefaultAnchor(anchors, 'delay_towers')) {
    tops = anchors.get('delay_towers');
  }
  if (tops.length === 0) {
    for (const z of OBELISK_Z) for (const x of [-OBELISK_X, OBELISK_X]) tops.push(v3(x, CRYSTAL_TIP, z));
  }
  const zs = [...new Set(tops.map((p) => Math.round(p.z)))].sort((a, b) => a - b);
  return tops.map((top, index) => {
    const b = bases[index];
    const base = b ? b.clone() : v3(top.x, 0, top.z);
    // the anchor is the crystal tip (bible: tip 12.8, capital top 9.6); tolerate a centre anchor
    const capitalY = top.y - base.y > 11.5 ? top.y - (CRYSTAL_TIP - CAPITAL_TOP) : Math.max(base.y + 3, top.y - 1.6);
    return { top: top.clone(), base, capitalY, row: zs.indexOf(Math.round(top.z)), index };
  });
}
