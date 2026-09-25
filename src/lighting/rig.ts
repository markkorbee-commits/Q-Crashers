import * as THREE from 'three';
import { Anchors, type AnchorName } from '../core/Anchors';
import { hash32 } from '../core/rng';

/**
 * The 2026 RED show rig (moving heads, strobes, blinders) laid out in world metres.
 *
 * Positions follow research/stage-canonical.md (stage deck front z = 0, wing spar tips at
 * x ±14/±28/±39 y 24–26, castle wall top 9.3 m, towers 13–16 m, dragon crest ~19 m, inner PA
 * truss towers x ±10.8 top ~16 m, side sections (±60,0)→(±88,+24) 6–8 m high) and
 * production-analysis.md §4.2 (beams on wing ribs, roof line, deck front, towers and pillars;
 * strobes on deck lip / wing ribs / towers; blinders on the deck front).
 * Anchors registered by the stage / grounds engineers override the canonical estimates
 * (fixtures_truss, fixtures_floor, pillars_top, pillars_base, delay_towers, foh).
 */

// ---- look groups (show-format `groups`) -------------------------------------------------------
export const G_TRUSS = 0;
export const G_FLOOR = 1;
export const G_TOWERS = 2;
export const G_FIELD = 3;
export const GROUP_NAMES = ['truss', 'floor', 'towers', 'field'] as const;

// ---- position tags (cue `target` filtering) ----------------------------------------------------
export const T_SPAR = 1 << 0; // wing finger spars
export const T_ARM = 1 << 1; // lower wing arm (leading edge)
export const T_ROOF = 1 << 2; // castle roofline / parapet
export const T_TOWER = 1 << 3; // castle tower tops
export const T_DRAGON = 1 << 4; // dragon skull
export const T_PA = 1 << 5; // PA truss tower tops
export const T_SIDE = 1 << 6; // side section rooflines
export const T_ARMEND = 1 << 7; // forward arm ends
export const T_DECK = 1 << 8; // deck front / lip
export const T_SIDEFLOOR = 1 << 9; // floor positions in front of the side sections
export const T_PILLAR = 1 << 10; // lantern pillar / delay tower heads
export const T_PLINTH = 1 << 11; // pillar plinth ground positions
export const T_FOH = 1 << 12; // FOH roof
export const T_ALL = (1 << 13) - 1;

export const GROUP_TAGS = [
  T_SPAR | T_ARM | T_ROOF | T_TOWER | T_DRAGON | T_PA | T_SIDE | T_ARMEND,
  T_DECK | T_SIDEFLOOR,
  T_PILLAR,
  T_PLINTH | T_FOH,
];

/** cue target name -> tag mask (show-format anchor names + a few friendly aliases) */
const TARGET_TAGS: Record<string, number> = {
  all: T_ALL,
  truss: GROUP_TAGS[0],
  fixtures_truss: GROUP_TAGS[0],
  floor: GROUP_TAGS[1],
  fixtures_floor: GROUP_TAGS[1],
  towers: T_PILLAR,
  field: T_PLINTH | T_FOH,
  delay_towers: T_PILLAR | T_PLINTH,
  pillars: T_PILLAR | T_PLINTH,
  pillars_top: T_PILLAR,
  pillars_base: T_PLINTH,
  laser_field: T_PILLAR | T_FOH,
  foh: T_FOH,
  wings: T_SPAR | T_ARM,
  wing_left: T_SPAR | T_ARM,
  wing_right: T_SPAR | T_ARM,
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
  sides: T_SIDE | T_ARMEND | T_SIDEFLOOR,
  arms: T_SIDE | T_ARMEND | T_SIDEFLOOR,
  laser_stage: T_ROOF | T_TOWER | T_SIDE,
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
  /** index / size in cluster and -1..1 position in cluster */
  k: number;
  n: number;
  ck: number;
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

/** canonical lantern pillars (stage-canonical.md): 2 rows x 4 at x ±22, crystal top ~14.5 m */
const CANON_PILLAR_Z = [46.5, 73.5, 100.7, 127.7];
const CANON_PILLAR_X = 22;
const CANON_PILLAR_TOP = 14.5;

/** Side section front line: from (±60, 0) to (±88, +24) (stage-canonical.md) */
const SIDE_A = new THREE.Vector2(60, 0);
const SIDE_B = new THREE.Vector2(88, 24);

export const RIG_SOURCES: AnchorName[] = ['fixtures_truss', 'fixtures_floor', 'pillars_top', 'pillars_base', 'delay_towers', 'foh'];

/**
 * Build the rig. `density` scales fixture counts (1 = production reference ~250 heads) so the
 * quality preset's beam budget is honoured.
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
  const cnt = (n: number) => Math.max(1, Math.round(n * density));
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
      u: Math.max(-1, Math.min(1, pos.x / 90)),
      cluster: cl,
      k,
      n,
      ck: n > 1 ? (k / (n - 1)) * 2 - 1 : 0,
      seed: hash32(i * 7919 + 17) / 4294967296,
      rest: new THREE.Vector3(),
    });
  };
  const strobe = (tags: number, pos: THREE.Vector3, fwd: THREE.Vector3, twoSided = false) =>
    emitters.push({ kind: 'strobe', tags, pos: pos.clone(), fwd: fwd.clone().normalize(), twoSided, seed: hash32(emitters.length * 131 + 5) / 4294967296, size: v3(0.62, 0.16, 0.22) });
  const blinder = (tags: number, pos: THREE.Vector3, fwd: THREE.Vector3) =>
    emitters.push({ kind: 'blinder', tags, pos: pos.clone(), fwd: fwd.clone().normalize(), twoSided: false, seed: hash32(emitters.length * 131 + 5) / 4294967296, size: v3(0.62, 0.62, 0.2) });

  // ------------------------------------------------------------------------ stage structure (truss)
  const trussAnchor = anchors.get('fixtures_truss');
  if (registered('fixtures_truss')) {
    // registered by the stage engineer: cluster consecutive fixtures (sorted by x, split on gaps)
    cluster = addAnchorClusters(trussAnchor, G_TRUSS, T_ROOF, true, cluster, add);
  } else {
    // Fixtures sit in COMPACT clusters (one truss segment, ~0.7 m pitch): from the field a cluster
    // reads as a point source, so fan looks become the characteristic sunbursts (f024, f029, f080).
    const line = (group: number, tags: number, n: number, cx: number, cy: number, cz: number, ax: number, ay: number, az: number, pitch: number, fwd: THREE.Vector3, fanAxis = X) => {
      for (let k = 0; k < n; k++) {
        const o = (k - (n - 1) / 2) * pitch;
        add(group, tags, v3(cx + ax * o, cy + ay * o, cz + az * o), fwd, false, k, n, cluster, fanAxis);
      }
      cluster++;
    };
    // wing finger spars (base -> tip, left wing; mirrored): a mid-spar and a near-tip cluster
    const spars: [number, number, number, number][] = [
      [-9, 11.5, -14, 24],
      [-20, 8.5, -28, 26],
      [-32.5, 7, -39, 24],
    ];
    const nMid = cnt(6);
    const nTip = cnt(5);
    for (const s of [-1, 1]) {
      for (const [bx, by, tx, ty] of spars) {
        const x0 = s < 0 ? bx : -bx;
        const x1 = s < 0 ? tx : -tx;
        const dx = x1 - x0;
        const dy = ty - by;
        const l = Math.hypot(dx, dy);
        for (const [a, n] of [
          [0.42, nMid],
          [0.84, nTip],
        ]) {
          line(G_TRUSS, T_SPAR, n, x0 + dx * a, by + dy * a, -12.4, dx / l, dy / l, 0, 0.72, Z);
        }
      }
      // lower wing arm (leading edge): a row of heads around its middle
      line(G_TRUSS, T_ARM, cnt(6), s * 25, 10.6, -9.4, s * 0.98, -0.2, 0, 1.25, Z);
    }
    // castle roofline (parapet 9.3 m): 2 clusters per side
    for (const s of [-1, 1]) for (const x of [15.5, 40]) line(G_TRUSS, T_ROOF, cnt(4), s * x, 9.75, -5.6, 1, 0, 0, 0.8, Z);
    // castle tower tops (x ±20, ±34, ±46; 13–16 m)
    const towerTops: [number, number][] = [
      [20, 15.8],
      [34, 14.8],
      [46, 13.8],
    ];
    for (const s of [-1, 1]) for (const [tx, ty] of towerTops) line(G_TRUSS, T_TOWER, cnt(2), s * tx, ty, -7, 1, 0, 0, 1.4, Z);
    // dragon skull (~8 heads, FACT teardown)
    const nSkull = cnt(8);
    for (let k = 0; k < nSkull; k++) {
      const a = nSkull > 1 ? (k / (nSkull - 1)) * 2 - 1 : 0;
      add(G_TRUSS, T_DRAGON, v3(a * 4.2, 17.6 + 1.3 * (1 - a * a), -4.2), Z, false, k, nSkull, cluster);
    }
    cluster++;
    // inner PA truss towers (x ±10.8, top ~16 m)
    for (const s of [-1, 1]) line(G_TRUSS, T_PA, cnt(3), s * 10.8, 16.4, -1.2, 1, 0, 0, 0.75, Z);
    // side sections (6–8 m): 2 clusters per side + forward arm ends
    const d = new THREE.Vector2(SIDE_B.x - SIDE_A.x, SIDE_B.y - SIDE_A.y).normalize();
    for (const s of [-1, 1]) {
      const inward = sideInward(s);
      const axis = sideAxis(s);
      for (const a of [0.3, 0.74]) {
        const px = s * (SIDE_A.x + (SIDE_B.x - SIDE_A.x) * a);
        const pz = SIDE_A.y + (SIDE_B.y - SIDE_A.y) * a - 1.2;
        line(G_TRUSS, T_SIDE, cnt(5), px, 8.4, pz, s * d.x, 0, d.y, 0.8, inward, X);
      }
      line(G_TRUSS, T_ARMEND, cnt(5), s * 89.5, 10.2, 25.5, s * d.x, 0, d.y, 0.75, inward, X);
      void axis;
    }
  }

  // ------------------------------------------------------------------------ floor (deck front)
  const floorAnchor = anchors.get('fixtures_floor');
  if (registered('fixtures_floor')) {
    cluster = addAnchorClusters(floorAnchor, G_FLOOR, T_DECK, false, cluster, add);
  } else {
    const nDeck = cnt(5);
    for (const x of [-38, -14, 14, 38]) {
      for (let k = 0; k < nDeck; k++) add(G_FLOOR, T_DECK, v3(x + (k - (nDeck - 1) / 2) * 0.85, 2.15, -0.7), Z, false, k, nDeck, cluster);
      cluster++;
    }
    const nSF = cnt(4);
    const d = new THREE.Vector2(SIDE_B.x - SIDE_A.x, SIDE_B.y - SIDE_A.y).normalize();
    for (const s of [-1, 1]) {
      const inward = sideInward(s);
      const cx = s * (SIDE_A.x + (SIDE_B.x - SIDE_A.x) * 0.55) - s * 2.2;
      const cz = SIDE_A.y + (SIDE_B.y - SIDE_A.y) * 0.55 + 2.6;
      for (let k = 0; k < nSF; k++) {
        const o = (k - (nSF - 1) / 2) * 0.9;
        add(G_FLOOR, T_SIDEFLOOR, v3(cx + s * d.x * o, 0.45, cz + d.y * o), inward, false, k, nSF, cluster, X);
      }
      cluster++;
    }
  }

  // ------------------------------------------------------------------------ lantern pillars
  const pillars = resolvePillars(anchors);
  const rows = pillars.reduce((m, p) => Math.max(m, p.row + 1), 0);
  const nPil = density < 0.55 ? 2 : 4;
  const MZ = v3(0, 0, -1);
  for (const p of pillars) {
    const s = p.top.x < 0 ? -1 : 1;
    const y = p.top.y - 4.2;
    const corners: [number, number][] =
      nPil === 4
        ? [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ]
        : [
            [-s, -1],
            [-s, 1],
          ];
    corners.forEach(([cx, cz], k) => add(G_TOWERS, T_PILLAR, v3(p.top.x + cx * 1.95, y, p.top.z + cz * 1.95), MZ, false, k, corners.length, cluster));
    cluster++;
    // plinth uplights on the aisle side (field group)
    const nPl = density < 0.55 ? 1 : 2;
    for (let k = 0; k < nPl; k++) {
      const dz = nPl > 1 ? (k === 0 ? -2.9 : 2.9) : -2.9;
      add(G_FIELD, T_PLINTH, v3(p.base.x - s * 3.1, p.base.y + 0.4, p.base.z + dz), MZ, false, k, nPl, cluster);
    }
    cluster++;
  }

  // ------------------------------------------------------------------------ FOH roof
  const foh = anchors.get('foh')[0] ?? v3(0, 8, 110);
  const nFoh = cnt(8);
  for (let k = 0; k < nFoh; k++) {
    const a = nFoh > 1 ? k / (nFoh - 1) - 0.5 : 0;
    add(G_FIELD, T_FOH, v3(foh.x + a * 11, foh.y + 0.9, foh.z - 1.5), MZ, true, k, nFoh, cluster);
  }
  cluster++;

  // ------------------------------------------------------------------------ strobes & blinders
  const nLip = cnt(14);
  for (let k = 0; k < nLip; k++) strobe(T_DECK, v3(-50 + (100 * (k + 0.5)) / nLip, 2.05, 0.05), Z);
  for (const s of [-1, 1]) {
    for (const [tx, ty] of [
      [14, 24],
      [28, 26],
      [39, 24],
    ])
      strobe(T_SPAR, v3(s * tx * 0.97, ty - 2.5, -12.2), Z);
    for (const [tx, ty] of [
      [20, 15.8],
      [34, 14.8],
      [46, 13.8],
    ])
      strobe(T_TOWER, v3(s * tx, ty - 1.4, -6.6), Z);
    strobe(T_ROOF, v3(s * 16, 9.4, -5.3), Z);
    strobe(T_ROOF, v3(s * 38, 9.4, -5.3), Z);
    const inward = sideInward(s);
    const nS = cnt(4);
    for (let k = 0; k < nS; k++) {
      const a = (k + 0.5) / nS;
      strobe(T_SIDE, v3(s * (SIDE_A.x + (SIDE_B.x - SIDE_A.x) * a), 7.7, SIDE_A.y + (SIDE_B.y - SIDE_A.y) * a - 0.6), inward);
    }
    const nB = cnt(3);
    for (let k = 0; k < nB; k++) {
      const a = (k + 0.5) / nB;
      blinder(T_SIDE, v3(s * (SIDE_A.x + (SIDE_B.x - SIDE_A.x) * a), 6.6, SIDE_A.y + (SIDE_B.y - SIDE_A.y) * a - 0.5), inward);
    }
  }
  const nBl = cnt(10);
  for (let k = 0; k < nBl; k++) blinder(T_DECK, v3(-44 + (88 * (k + 0.5)) / nBl, 2.55, -0.25), Z);
  for (const p of pillars) strobe(T_PILLAR, v3(p.top.x, p.top.y - 5.6, p.top.z + 1.75), Z, true);
  strobe(T_FOH, v3(foh.x - 4, foh.y + 1.4, foh.z - 1.6), MZ);
  strobe(T_FOH, v3(foh.x + 4, foh.y + 1.4, foh.z - 1.6), MZ);

  // rest directions: fanned up and slightly towards the audience
  for (const f of fixtures) {
    const a = ((f.ck * 28 + f.fanOut * Math.abs(f.side) * 12) * Math.PI) / 180;
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

function sideInward(s: number): THREE.Vector3 {
  // front of the side section faces the field centre: normal of (SIDE_B - SIDE_A) pointing +Z / inwards
  const d = new THREE.Vector2(SIDE_B.x - SIDE_A.x, SIDE_B.y - SIDE_A.y).normalize();
  return new THREE.Vector3(-s * d.y, 0, d.x).normalize();
}

function sideAxis(s: number): THREE.Vector3 {
  const d = new THREE.Vector2(SIDE_B.x - SIDE_A.x, SIDE_B.y - SIDE_A.y).normalize();
  return new THREE.Vector3(s * d.x, 0, d.y).normalize();
}

type AddFn = (group: number, tags: number, pos: THREE.Vector3, fwd: THREE.Vector3, hang: boolean, k: number, n: number, cl: number, fanAxis?: THREE.Vector3) => void;

function addAnchorClusters(pts: THREE.Vector3[], group: number, tags: number, hang: boolean, cluster: number, add: AddFn): number {
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const Z = new THREE.Vector3(0, 0, 1);
  let start = 0;
  for (let i = 1; i <= sorted.length; i++) {
    const split = i === sorted.length || sorted[i].distanceTo(sorted[i - 1]) > 6 || i - start >= 10;
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
    for (const x of [-CANON_PILLAR_X, CANON_PILLAR_X]) for (const z of CANON_PILLAR_Z) tops.push(v3(x, CANON_PILLAR_TOP, z));
  }
  const zs = [...new Set(tops.map((p) => Math.round(p.z)))].sort((a, b) => a - b);
  return tops.map((top, index) => {
    const b = bases[index];
    return {
      top: top.clone(),
      base: b ? b.clone() : v3(top.x, 0, top.z),
      row: zs.indexOf(Math.round(top.z)),
      index,
    };
  });
}
