import * as THREE from 'three';
import { Anchors, type AnchorName } from '../core/Anchors';

/**
 * Laser projector layout (research/production-analysis.md §5.2 + stage-canonical.md).
 *
 * Stage (origin 'stage'):
 *   deck   — 12 projectors on the deck front (y ≈ 2.1), sheets / zig-zag / waves / audience fans
 *   tower  — castle tower tops (13–16 m), cross beams / cones
 *   high   — wing spar tips / roof line (≈ 24–26 m, "the 2026 RED is wide but LOW"), sky fans / X
 *   arm    — ends of the forward side arms (±86, 8, +22): side positions (radial bursts, crossfire)
 * Field (origin 'field'):
 *   pillar — lantern heads of the 8 delay-tower obelisks (beam bounces between the pillars, f091)
 *   base   — pillar plinths (≈ 1.5 m): the low white web over the empty field (f014)
 *   foh    — FOH roof: reverse fans / sheets toward the stage, radial bursts
 *
 * Positions come from the anchors other systems register (stage towers / roof, pillars, FOH) when
 * they are available and fall back to the canonical dimensions otherwise.
 */
export type EmitterGroup = 'deck' | 'tower' | 'high' | 'arm' | 'pillar' | 'base' | 'foh';
export type Origin = 'stage' | 'field';

export interface Emitter {
  index: number;
  group: EmitterGroup;
  origin: Origin;
  /** aperture position (world) */
  pos: THREE.Vector3;
  /** base aim (unit, horizontal): stage → audience (+Z), field → stage-ish */
  fwd: THREE.Vector3;
  /** lateral axis = cross(up, fwd), unit */
  lat: THREE.Vector3;
  /** -1 spectator-left (x<0), +1 right, and for centre units a stable ±1 by index */
  side: number;
  /** 0..1 position across its group (left → right), for chases */
  rank: number;
  /** pillar row (0 = nearest to the stage), -1 otherwise */
  row: number;
  /** index of the emitter used as a crossfire target (pillars), -1 = none */
  partner: number;
  /** relative optical power (big roof projectors vs small plinth units) */
  power: number;
  /** draw a housing box (false for positions where the host geometry is unknown) */
  housing: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);
const DEFAULTS = new Anchors();

/** canonical fallbacks (stage-canonical.md / terrain-analysis.md) */
const PILLAR_X = 22;
const PILLAR_Z = [46.5, 73.5, 100.7, 127.7];
const PILLAR_TOP_Y = 14.5;

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
  readonly stage: Emitter[] = [];
  readonly field: Emitter[] = [];
  readonly byGroup: Record<EmitterGroup, Emitter[]> = { deck: [], tower: [], high: [], arm: [], pillar: [], base: [], foh: [] };
  /** anchors this rig registered itself (so a later rebuild can tell "customised by others" apart) */
  private mine = new Map<string, number>();
  private sig = 0;

  /** signature of every anchor the layout depends on (cheap change detection) */
  anchorSignature(a: Anchors): number {
    let s = 0;
    for (const n of ['laser_stage', 'laser_field', 'towers_top', 'roof', 'pillars_top', 'pillars_base', 'foh'] as AnchorName[]) s += signature(a.get(n)) * (s % 13 + 1);
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
    if (m !== undefined && Math.abs(m - signature(pts)) < 1e-6) return null;
    return pts;
  }

  build(a: Anchors): void {
    this.emitters.length = 0;
    this.stage.length = 0;
    this.field.length = 0;
    for (const k of Object.keys(this.byGroup) as EmitterGroup[]) this.byGroup[k].length = 0;

    const add = (group: EmitterGroup, pos: THREE.Vector3, fwd: THREE.Vector3, power: number, housing: boolean): Emitter => {
      const origin: Origin = group === 'pillar' || group === 'base' || group === 'foh' ? 'field' : 'stage';
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
        row: -1,
        partner: -1,
        power,
        housing,
      };
      this.emitters.push(e);
      (origin === 'stage' ? this.stage : this.field).push(e);
      this.byGroup[group].push(e);
      return e;
    };
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const toAudience = v(0, 0, 1);

    // ---------------- stage ----------------
    const customStage = this.custom(a, 'laser_stage');
    if (customStage) {
      for (const p of customStage) {
        const g: EmitterGroup = p.y < 6 ? 'deck' : Math.abs(p.x) > 62 ? 'arm' : p.y < 18 ? 'tower' : 'high';
        add(g, p, g === 'arm' ? v(-Math.sign(p.x) * 0.55, 0, 1) : toAudience, g === 'high' ? 1.25 : 1, g === 'deck' || g === 'arm');
      }
    }
    if (!this.byGroup.deck.length) {
      // deck front row, between the flame units (flames sit on z = -0.4)
      for (const x of [-44, -36, -28, -20, -12, -4, 4, 12, 20, 28, 36, 44]) add('deck', v(x, 2.12, -1.1), toAudience, 1, true);
    }
    if (!customStage) {
      const towers = this.custom(a, 'towers_top');
      if (towers) {
        const pts = [...towers].filter((p) => Math.abs(p.x) < 62).sort((p, q) => Math.abs(p.x) - Math.abs(q.x)).slice(0, 6);
        for (const p of pts) add('tower', v(p.x, p.y + 0.25, p.z + 0.6), toAudience, 1.1, false);
      } else {
        for (const x of [-34, -20, 20, 34]) add('tower', v(x, Math.abs(x) < 25 ? 15.8 : 14.4, -5.4), toAudience, 1.1, true);
      }
      const roof = this.custom(a, 'roof');
      const roofPts = roof ? roof.filter((p) => p.y > 12 && Math.abs(p.x) < 70) : [];
      if (roofPts.length >= 2) {
        const sorted = [...roofPts].sort((p, q) => p.x - q.x);
        const n = Math.min(8, sorted.length);
        for (let i = 0; i < n; i++) {
          const p = sorted[Math.round((i * (sorted.length - 1)) / Math.max(1, n - 1))];
          add('high', v(p.x, p.y + 0.3, p.z + 0.4), toAudience, 1.25, false);
        }
      } else {
        // wing spar tips (x ±14, ±28, ±39, y 24–26) + dragon crest
        for (const [x, y] of [
          [-39, 24.6],
          [-28, 26.0],
          [-14, 24.8],
          [14, 24.8],
          [28, 26.0],
          [39, 24.6],
        ])
          add('high', v(x, y, -8.2), toAudience, 1.25, true);
      }
      // forward side arms: (±60,0) → (±88,+24), 6–8 m high
      for (const s of [-1, 1]) {
        add('arm', v(s * 86.5, 8.4, 22.5), v(-s * 0.62, 0, 1), 1.1, true);
        add('arm', v(s * 73, 7.9, 11.4), v(-s * 0.5, 0, 1), 1, true);
      }
    }

    // ---------------- field ----------------
    let tops = this.custom(a, 'pillars_top');
    if (!tops) {
      tops = [];
      for (const z of PILLAR_Z) for (const s of [-1, 1]) tops.push(v(s * PILLAR_X, PILLAR_TOP_Y, z));
    }
    let bases = this.custom(a, 'pillars_base');
    if (!bases) bases = tops.map((p) => v(p.x, 0, p.z));
    const customField = this.custom(a, 'laser_field');
    // lantern-head units: on the aisle-facing side of the lantern, facing the stage
    const pillars: Emitter[] = [];
    for (const p of tops) {
      const s = Math.sign(p.x) || 1;
      pillars.push(add('pillar', v(p.x - s * 1.75, p.y - 1.1, p.z), v(-s * 0.22, 0, -1), 0.85, true));
    }
    for (const p of bases) {
      const s = Math.sign(p.x) || 1;
      add('base', v(p.x - s * 2.7, 1.45, p.z - 1.2), v(-s, 0, 0), 0.55, true);
    }
    if (customField) {
      // other units the grounds engineer placed (towers/FOH/cranes): everything not on a pillar
      for (const p of customField) {
        const nearPillar = tops.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 4);
        if (!nearPillar) add('foh', p, v(-p.x * 0.01, 0, -1), 1.1, false);
      }
    }
    if (!this.byGroup.foh.length) {
      const foh = this.custom(a, 'foh');
      const f = foh ? foh[0] : v(0, 8.0, 63);
      add('foh', v(f.x - 2.4, f.y + 0.45, f.z - 3.2), v(0, 0, -1), 1.1, true);
      add('foh', v(f.x + 2.4, f.y + 0.45, f.z - 3.2), v(0, 0, -1), 1.1, true);
    }

    // ranks (left → right within each group), pillar rows and bounce partners
    for (const g of Object.keys(this.byGroup) as EmitterGroup[]) {
      const arr = this.byGroup[g];
      const sorted = [...arr].sort((p, q) => p.pos.x - q.pos.x || p.pos.z - q.pos.z);
      sorted.forEach((e, i) => (e.rank = sorted.length > 1 ? i / (sorted.length - 1) : 0.5));
    }
    const rowsZ = [...new Set(pillars.map((e) => Math.round(e.pos.z)))].sort((p, q) => p - q);
    for (const e of pillars) e.row = rowsZ.indexOf(Math.round(e.pos.z));
    for (const e of this.byGroup.base) e.row = rowsZ.findIndex((z) => Math.abs(z - e.pos.z) < 4);
    for (const e of pillars) {
      // bounce partner: opposite side, one row closer to the stage (row 0 → none: aims at the stage)
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

  /** register our final positions so other systems (camera, debug) see the real layout */
  register(a: Anchors): void {
    const st = this.stage.map((e) => e.pos);
    const fi = this.field.filter((e) => e.group !== 'base').map((e) => e.pos);
    a.set('laser_stage', st);
    a.set('laser_field', fi);
    this.mine.set('laser_stage', signature(a.get('laser_stage')));
    this.mine.set('laser_field', signature(a.get('laser_field')));
    this.sig = this.anchorSignature(a);
  }
}
