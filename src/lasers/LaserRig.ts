import * as THREE from 'three';
import { Anchors, type AnchorName } from '../core/Anchors';

/**
 * Laser projector layout — research/design-bible.md §7.4 and research/terrain-layout.json "lasers"
 * (≈ 45 RGB projectors, 20–60 W class) plus the plinth units of the ground-level web (show-analysis 2.2).
 *
 * Stage (origin 'stage'):
 *   deck    12 × deck front, X −33…+33 (6 m pitch), Y 2.2, Z −0.5 — sheets, zig-zag, sunbursts, chevron, tunnels
 *   tower    8 × castle roof: X ±14, ±24 @ Y 16, Z −13 and X ±7, ±32 @ Y 10, Z −12 — cage, X beams, sky fans
 *   dragon   2 × dragon flanks (±7, 15, −10) — the crossing cyan X over the head (Embers)
 *   high     4 × wing finger bases (±20, 20, −19), (±34, 19, −19) — sky fans, down-fans
 *   corner   4 × corner towers (±92, 14, −4) — sideways fans, beam-ends
 * Field (origin 'field'):
 *   turret   6 × arm-end turrets (±94, 12, 58) — radial bursts, cross-field fans / sheets
 *   pillar   8 × obelisk capitals (±20, 9.7, 36/69/102/135) — pillar-to-pillar beams, sky beams
 *   base     8 × plinth corners (Y ≈ 1.5) — the white web criss-crossing the empty field 1–3 m high
 *   piano    1 × white light tube on the grand piano (0, 1.8, 59) — the Domitor Draconis mirror bounce
 * Mirrors: the row-1 and row-2 crystals (±20, 11.2, 36/69) reflect the piano laser.
 *
 * Other systems may override positions: a custom 'laser_stage' anchor (the stage engineer's housings) or
 * custom 'pillars_top' (the grounds engineer's obelisks, X/Z taken from it).
 */
export type EmitterGroup = 'deck' | 'tower' | 'dragon' | 'high' | 'corner' | 'turret' | 'pillar' | 'base' | 'piano';
export type Origin = 'stage' | 'field';

export interface Emitter {
  index: number;
  group: EmitterGroup;
  origin: Origin;
  /** aperture position (world) */
  pos: THREE.Vector3;
  /** base aim (unit, horizontal): stage → audience (+Z), field → stage-ish / across the aisle */
  fwd: THREE.Vector3;
  /** lateral axis = cross(up, fwd), unit */
  lat: THREE.Vector3;
  /** -1 spectator-left (x<0), +1 right; centre units get a stable ±1 by index */
  side: number;
  /** 0..1 position across its group (left → right), for chases */
  rank: number;
  /** 0-based position within its group sorted left → right */
  order: number;
  /** pillar row (0 = nearest to the stage), -1 otherwise */
  row: number;
  /** index of the emitter used as a crossfire target (pillars), -1 = none */
  partner: number;
  /** relative optical power (big roof projectors vs small plinth units) */
  power: number;
  /** draw a housing box */
  housing: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);
const DEFAULTS = new Anchors();
/** anchors the layout depends on */
const DEPENDS: readonly AnchorName[] = ['laser_stage', 'laser_field', 'pillars_top'];

/** canonical obelisk layout (terrain-layout.json "pillars") */
const PILLARS: readonly [number, number][] = [
  [-20, 36], [20, 36], [-20, 69], [20, 69], [-20, 102], [20, 102], [-20, 135], [20, 135],
];
const CAPITAL_Y = 9.7;
const CRYSTAL_MID_Y = 11.2;

function sameAsDefault(name: AnchorName, pts: THREE.Vector3[]): boolean {
  const d = DEFAULTS.get(name);
  if (d.length !== pts.length) return false;
  for (let i = 0; i < d.length; i++) if (d[i].distanceToSquared(pts[i]) > 1e-6) return false;
  return true;
}

function signature(pts: THREE.Vector3[]): number {
  let s = pts.length * 7919;
  for (const p of pts) s += p.x * 1.3 + p.y * 7.1 + p.z * 3.7;
  return s;
}

export class LaserRig {
  readonly emitters: Emitter[] = [];
  readonly byGroup: Record<EmitterGroup, Emitter[]> = { deck: [], tower: [], dragon: [], high: [], corner: [], turret: [], pillar: [], base: [], piano: [] };
  /** crystal mirror centres keyed by pillar id L1, R1, L2, R2 … (row-major, left first) */
  readonly mirrors: THREE.Vector3[] = [];
  /** anchors this rig registered itself (so a later rebuild can tell "customised by others" apart) */
  private mine = new Map<string, number>();
  /** the customised anchor a previous build consumed (our own re-publication of it must not reset it) */
  private src = new Map<string, THREE.Vector3[]>();
  private sig = 0;

  anchorSignature(a: Anchors): number {
    let s = 0;
    for (let i = 0; i < DEPENDS.length; i++) s = s * 1.0001 + signature(a.get(DEPENDS[i])) * (i + 1);
    return s;
  }

  get signatureValue(): number {
    return this.sig;
  }

  /** is the anchor customised by another system (not a default, not something we registered)? */
  private custom(a: Anchors, name: AnchorName): THREE.Vector3[] | null {
    const pts = a.get(name);
    if (!pts.length) return null;
    if (sameAsDefault(name, pts)) return null;
    const m = this.mine.get(name);
    // our own publication: keep using the custom source it was derived from (if any)
    if (m !== undefined && Math.abs(m - signature(pts)) < 1e-6) return this.src.get(name) ?? null;
    this.src.set(name, pts.map((p) => p.clone()));
    return pts;
  }

  build(a: Anchors): void {
    this.emitters.length = 0;
    this.mirrors.length = 0;
    for (const k of Object.keys(this.byGroup) as EmitterGroup[]) this.byGroup[k].length = 0;
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    const add = (group: EmitterGroup, pos: THREE.Vector3, fwd: THREE.Vector3, power: number, housing = true): Emitter => {
      const origin: Origin = group === 'pillar' || group === 'base' || group === 'turret' || group === 'piano' ? 'field' : 'stage';
      const f = fwd.clone().setY(0).normalize();
      const e: Emitter = {
        index: this.emitters.length,
        group,
        origin,
        pos: pos.clone(),
        fwd: f,
        lat: new THREE.Vector3().crossVectors(UP, f).normalize(),
        side: Math.abs(pos.x) < 0.5 ? (this.emitters.length % 2 ? 1 : -1) : Math.sign(pos.x),
        rank: 0.5,
        order: 0,
        row: -1,
        partner: -1,
        power,
        housing,
      };
      this.emitters.push(e);
      this.byGroup[group].push(e);
      return e;
    };
    const aud = v(0, 0, 1);

    // ---------------- stage ----------------
    const customStage = this.custom(a, 'laser_stage');
    if (customStage) {
      // the stage engineer modelled housings: classify by height / position
      for (const p of customStage) {
        const ax = Math.abs(p.x);
        const g: EmitterGroup = p.y < 5 ? 'deck' : ax > 80 ? 'corner' : ax < 9 && p.y > 12 ? 'dragon' : p.y >= 18 ? 'high' : 'tower';
        add(g, p, g === 'corner' ? v(-Math.sign(p.x) * 0.5, 0, 1) : aud, g === 'high' ? 1.25 : 1, g === 'deck');
      }
    }
    if (!this.byGroup.deck.length) for (let i = 0; i < 12; i++) add('deck', v(-33 + i * 6, 2.2, -0.5), aud, 1);
    if (!customStage) {
      for (const [x, y, z] of [
        [-24, 16, -13], [-14, 16, -13], [14, 16, -13], [24, 16, -13],
        [-32, 10, -12], [-7, 10, -12], [7, 10, -12], [32, 10, -12],
      ])
        add('tower', v(x, y, z), aud, 1.1);
      add('dragon', v(-7, 15, -10), aud, 1.3);
      add('dragon', v(7, 15, -10), aud, 1.3);
      for (const [x, y] of [[-34, 19], [-20, 20], [20, 20], [34, 19]]) add('high', v(x, y, -19), aud, 1.25);
      for (const s of [-1, 1]) {
        add('corner', v(s * 92, 14, -4.5), v(-s * 0.35, 0, 1), 1.1);
        add('corner', v(s * 92, 14, -3.5), v(-s * 0.9, 0, 1), 1.1);
      }
    }

    // ---------------- field ----------------
    // obelisks: custom 'pillars_top' (x/z) from the grounds engineer, else the canonical layout
    const tops = this.custom(a, 'pillars_top');
    const pil: [number, number][] = tops ? tops.map((p) => [p.x, p.z]) : PILLARS.map((p) => [p[0], p[1]]);
    pil.sort((p, q) => p[1] - q[1] || p[0] - q[0]);
    for (const [x, z] of pil) {
      const s = Math.sign(x) || 1;
      // capital ledge on the aisle side (the crystal occupies the centre of the capital)
      add('pillar', v(x - s * 1.45, CAPITAL_Y + 0.15, z), v(-s * 0.3, 0, -1), 0.85);
      this.mirrors.push(v(x, CRYSTAL_MID_Y, z));
    }
    for (const [x, z] of pil) {
      const s = Math.sign(x) || 1;
      // stage-side aisle corner post of the 8.5 m plinth
      add('base', v(x - s * 4.0, 1.5, z - 4.0), v(-s, 0, -0.25), 0.55);
    }
    for (const s of [-1, 1]) for (const dz of [-0.5, 0, 0.5]) add('turret', v(s * 94, 12, 58 + dz), v(-s, 0, -0.18 + dz * 0.4), 1.1);
    add('piano', v(0, 1.8, 59), v(0, 0, -1), 1.2, false);

    // ranks (left → right within each group), pillar rows and pillar partners
    for (const g of Object.keys(this.byGroup) as EmitterGroup[]) {
      const arr = this.byGroup[g];
      const sorted = [...arr].sort((p, q) => p.pos.x - q.pos.x || p.pos.z - q.pos.z);
      sorted.forEach((e, i) => {
        e.rank = sorted.length > 1 ? i / (sorted.length - 1) : 0.5;
        e.order = i;
      });
    }
    const pillars = this.byGroup.pillar;
    const rowsZ = [...new Set(pillars.map((e) => Math.round(e.pos.z)))].sort((p, q) => p - q);
    for (const e of pillars) e.row = rowsZ.indexOf(Math.round(e.pos.z));
    for (const e of this.byGroup.base) e.row = rowsZ.findIndex((z) => Math.abs(z - (e.pos.z + 4)) < 3);
    for (const e of pillars) {
      // partner: opposite side, one row closer to the stage (row 0 → none)
      let best = -1;
      let bd = Infinity;
      for (const o of pillars) {
        if (Math.sign(o.pos.x) === Math.sign(e.pos.x) || o.row !== e.row - 1) continue;
        const d = Math.abs(o.pos.x + e.pos.x);
        if (d < bd) {
          bd = d;
          best = o.index;
        }
      }
      e.partner = best;
    }
    this.sig = this.anchorSignature(a);
  }

  /** crystal mirror of pillar row r (0-based) on side s (−1 left, +1 right) */
  mirror(row: number, s: number): THREE.Vector3 | null {
    const i = row * 2 + (s < 0 ? 0 : 1);
    return this.mirrors[i] ?? null;
  }

  /** register our final positions so other systems (camera, debug) see the real layout */
  register(a: Anchors): void {
    a.set('laser_stage', this.emitters.filter((e) => e.origin === 'stage').map((e) => e.pos));
    a.set('laser_field', this.emitters.filter((e) => e.origin === 'field' && e.group !== 'base').map((e) => e.pos));
    this.mine.set('laser_stage', signature(a.get('laser_stage')));
    this.mine.set('laser_field', signature(a.get('laser_field')));
    this.sig = this.anchorSignature(a);
  }
}
