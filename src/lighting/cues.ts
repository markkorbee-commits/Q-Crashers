import * as THREE from 'three';
import type { ShowEngine } from '../show/ShowEngine';
import type { Cue } from '../show/ShowTypes';
import { matchTarget, parseGroups, parseTargets, type Rig, type TargetFilter } from './rig';

/**
 * Cue indexing for the lighting system. Everything here is rebuilt only when the show engine
 * recompiles (revision change); per-frame queries are binary searches over sorted arrays and
 * never allocate.
 */

export const PRESETS = ['dark', 'ambient', 'sweep', 'fan', 'ballyhoo', 'circle', 'tilt_wave', 'audience', 'crosshatch', 'sky', 'pulse', 'still', 'curtain'] as const;
export type PresetName = (typeof PRESETS)[number];
export const P_DARK = 0;
export const P_AMBIENT = 1;
export const P_SWEEP = 2;
export const P_FAN = 3;
export const P_BALLYHOO = 4;
export const P_CIRCLE = 5;
export const P_TILT_WAVE = 6;
export const P_AUDIENCE = 7;
export const P_CROSSHATCH = 8;
export const P_SKY = 9;
export const P_PULSE = 10;
export const P_STILL = 11;
export const P_CURTAIN = 12;

/** default speed (cycles per bar) per preset */
const DEFAULT_SPEED = [0, 0.0625, 0.25, 0.125, 1, 0.25, 0.25, 0.125, 0.125, 0.0625, 0, 0, 0];

/** beam half-angle tangents (design-bible §7.1: narrow 0.8–1.5°, wide 3–6°) */
export const TAN_NARROW = Math.tan((1.3 * Math.PI) / 180);
export const TAN_WIDE = Math.tan((3.4 * Math.PI) / 180);

/**
 * Share of the heads a look uses when the cue gives no `density`: a lighting designer builds quiet looks
 * from a few positions and brings the whole rig in only for the big moments. Low-intensity looks
 * therefore light a sparse, evenly spread subset (≤ 0.35 → 1/5 of the heads, 0.5 → ~1/2, ≥ 0.85 → all).
 */
export function defaultDensity(intensity: number): number {
  return Math.min(1, Math.max(0.2, 1.6 * intensity - 0.35));
}
/** look dimmer curve (console "square-law"-like): low levels stay low, full stays full */
export const LOOK_GAMMA = 1.5;

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);
const vec3 = (v: unknown): THREE.Vector3 | null =>
  Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number' && Number.isFinite(x)) ? new THREE.Vector3(v[0], v[1], v[2]) : null;

/** Parsed cue with everything the per-frame code needs (colours resolved each frame). */
export interface LightCue {
  cue: Cue;
  t0: number;
  dur: number;
  fade: number;
  seed: number;
  /** tempo (bpm) at the cue start — phase base for cycle-per-bar speeds */
  bpm: number;
  intensity: number;
  color?: string;
  color2?: string;
  /** resolved per frame */
  c1: THREE.Color;
  c2: THREE.Color;
  // look
  preset: number;
  speed: number;
  groups: number;
  tan: number;
  kick: boolean;
  tilt: number | null;
  pan: number | null;
  spread: number | null;
  /** share of the heads used (0..1), explicit `density` or defaultDensity(intensity) */
  density: number;
  /** the cue set `density` itself (explicit-only fixtures ignore the intensity default) */
  densitySet: boolean;
  /** look level after the dimmer curve */
  level: number;
  /** look `aim` [x, y, z]: 'still' / 'curtain' heads aim at this world point */
  aim: THREE.Vector3 | null;
  /** curtain: slow sway amplitude (deg) */
  sway: number;
  /** gobo wheel: 0 open, 1 'dots' (glitter / breakup spots on the floor, rayed beams) */
  gobo: number;
  // hit / chase / blinder / strobe
  target: TargetFilter;
  /** hit / chase: 1 per matching fixture; blinder / strobe: 1 per matching emitter (built with the rig) */
  mask: Uint8Array | null;
  pattern: string;
  /** chase step in beats */
  every: number;
  /** strobe burst rate (Hz) */
  rate: number;
  // pillars
  mode: number;
  shaft?: string;
  shaftIntensity: number;
  c3: THREE.Color;
  /** pillars: per-pillar mask (null = every pillar), built with the rig */
  pmask: Uint8Array | null;
  // flood / zone wash / festoon
  /** flood: AREA_* bitmask; wash: zone mask (AREA_SIDES_L / _R) or 0 = the whole set */
  area: number;
  /** flood: rise time (s) */
  attack: number;
  /** festoon: FS_* string mask (x2 for the sides) */
  strings: number;
}

// flood areas / wash zones
export const AREA_STAGE = 1;
export const AREA_FIELD = 2;
export const AREA_SIDES_L = 4;
export const AREA_SIDES_R = 8;
export const AREA_SIDES = AREA_SIDES_L | AREA_SIDES_R;
export const AREA_ALL = AREA_STAGE | AREA_FIELD | AREA_SIDES;

// festoon strings (bit = kind * 2 + side, side 0 = left / x < 0, 1 = right)
export const FS_WINGS = 0;
export const FS_CASTLE = 1;
export const FS_SIDES = 2;
export const FS_TORCH = 3;
export const FS_KINDS = 4;
export const FESTOON_MODES = ['steady', 'flicker', 'chase', 'twinkle', 'pulse', 'off'] as const;
export const FM_STEADY = 0;
export const FM_FLICKER = 1;
export const FM_CHASE = 2;
export const FM_TWINKLE = 3;
export const FM_PULSE = 4;
export const FM_OFF = 5;

/** cue targets -> festoon string kinds */
const FESTOON_TARGETS: Record<string, number> = {
  wings: 1 << FS_WINGS,
  wing_left: 1 << FS_WINGS,
  wing_right: 1 << FS_WINGS,
  wing_tips: 1 << FS_WINGS,
  castle: 1 << FS_CASTLE,
  roof: 1 << FS_CASTLE,
  deck_back: 1 << FS_CASTLE,
  sides: 1 << FS_SIDES,
  side_sections: 1 << FS_SIDES,
  side_front: 1 << FS_SIDES,
  side_rampart: 1 << FS_SIDES,
  torches: 1 << FS_TORCH,
  tower_torches: 1 << FS_TORCH,
  towers_top: 1 << FS_TORCH,
  all: (1 << FS_WINGS) | (1 << FS_CASTLE) | (1 << FS_SIDES),
};

/** festoon target list -> string bitmask (kind * 2 + side) */
function festoonStrings(targets: readonly string[]): number {
  let kinds = 0;
  let left = false;
  let right = false;
  for (const t of targets) {
    kinds |= FESTOON_TARGETS[t] ?? 0;
    if (t === 'left' || t === 'wing_left') left = true;
    if (t === 'right' || t === 'wing_right') right = true;
  }
  if (!kinds) kinds = FESTOON_TARGETS.all;
  const sides = left === right ? 3 : left ? 1 : 2;
  let m = 0;
  for (let k = 0; k < FS_KINDS; k++) if (kinds & (1 << k)) m |= sides << (k * 2);
  return m;
}

/** flood `area` / wash zone target -> AREA_* bitmask */
function floodArea(c: Cue, fx: string): number {
  const p = c.p ?? {};
  const t = c.targets;
  const left = t.includes('left');
  const right = t.includes('right');
  const sideMask = left === right ? AREA_SIDES : left ? AREA_SIDES_L : AREA_SIDES_R;
  const zone = (name: string | undefined): number => {
    switch (name) {
      case 'stage':
      case 'castle':
      case 'set':
        return AREA_STAGE;
      case 'field':
      case 'audience':
        return AREA_FIELD;
      case 'sides':
      case 'side_sections':
      case 'side_front':
      case 'side_rampart':
        return sideMask;
      case 'all':
        return AREA_ALL;
      default:
        return 0;
    }
  };
  if (fx === 'flood') return zone(str(p.area)) || t.reduce((m, n) => m | zone(n), 0) || AREA_ALL;
  // wash: only a side-section target makes it a zone wash; everything else washes the whole set
  let m = 0;
  for (const n of t) if (n !== 'all' && zone(n) & AREA_SIDES) m |= sideMask;
  return m;
}

export const PM_STEADY = 0;
export const PM_FLICKER = 1;
export const PM_CHASE = 2;
export const PM_PULSE = 3;
export const PM_OFF = 4;
const PILLAR_MODES = ['steady', 'flicker', 'chase', 'pulse', 'off'];

function parse(c: Cue, show: ShowEngine): LightCue {
  const p = c.p ?? {};
  const presetIdx = PRESETS.indexOf(p.preset as PresetName);
  const preset = presetIdx >= 0 ? presetIdx : c.fx === 'look' ? P_FAN : P_DARK;
  const beam = str(p.beam);
  const defaultWide = preset === P_AMBIENT;
  const intensity = Math.max(0, num(p.intensity, 1));
  const lc: LightCue = {
    cue: c,
    t0: c.t,
    dur: c.dur,
    fade: Math.max(0, num(p.fade, c.fx === 'wash' ? 1 : c.fx === 'pillars' ? 0.6 : 0.5)),
    seed: c.seed,
    bpm: show.tempo ? show.tempo.segmentAt(c.t).bpm : 150,
    intensity,
    color: str(p.color),
    color2: str(p.color2),
    c1: new THREE.Color(1, 1, 1),
    c2: new THREE.Color(1, 1, 1),
    preset,
    speed: num(p.speed, DEFAULT_SPEED[preset] ?? 0.25),
    groups: parseGroups(p.groups),
    tan: beam === 'wide' ? TAN_WIDE : beam === 'narrow' ? TAN_NARROW : defaultWide ? TAN_WIDE : TAN_NARROW,
    kick: p.kick === true,
    tilt: typeof p.tilt === 'number' ? p.tilt : null,
    pan: typeof p.pan === 'number' ? p.pan : null,
    spread: typeof p.spread === 'number' ? p.spread : null,
    density: typeof p.density === 'number' && Number.isFinite(p.density) ? Math.min(1, Math.max(0.05, p.density)) : defaultDensity(intensity),
    densitySet: typeof p.density === 'number' && Number.isFinite(p.density),
    level: Math.pow(Math.min(intensity, 1), LOOK_GAMMA) * Math.max(1, intensity),
    aim: vec3(p.aim),
    sway: Math.max(0, num(p.sway, 0)),
    gobo: p.gobo === 'dots' || p.gobo === 'glitter' || p.gobo === 'breakup' ? 1 : 0,
    target: parseTargets(c.targets, p.groups, { tags: 0, side: 0 }),
    mask: null,
    pattern: str(p.pattern) ?? 'lr',
    every: p.every === 'halfbeat' ? 0.5 : p.every === 'bar' ? 4 : p.every === '2beat' ? 2 : 1,
    rate: Math.max(0.5, Math.min(30, num(p.rate, 12))),
    mode: Math.max(0, (c.fx === 'festoon' ? (FESTOON_MODES as readonly string[]) : PILLAR_MODES).indexOf(str(p.mode) ?? 'steady')),
    shaft: str(p.shaft) ?? str(p.color2),
    shaftIntensity: Math.max(0, num(p.shaftIntensity, 0.8)),
    c3: new THREE.Color(1, 1, 1),
    pmask: null,
    area: c.fx === 'flood' || c.fx === 'wash' ? floodArea(c, c.fx) : 0,
    attack: Math.max(0.01, num(p.attack, 0.08)),
    strings: c.fx === 'festoon' ? festoonStrings(c.targets) : 0,
  };
  // floods and festoons release over `fade` (flood default 0.8 s, festoon 0.4 s)
  if (c.fx === 'flood') lc.fade = Math.max(0, num(p.fade, 0.8));
  if (c.fx === 'festoon') lc.fade = Math.max(0, num(p.fade, 0.4));
  return lc;
}

/**
 * A sorted list of "state" cues (looks, washes, pillar states) where the latest-started alive
 * cue wins and changes are cross-faded over the winner's `fade`.
 */
export class StateTrack {
  items: LightCue[] = [];
  private maxDur = 0;

  push(c: LightCue): void {
    this.items.push(c);
  }

  finish(): void {
    this.items.sort((a, b) => a.t0 - b.t0 || a.cue.id - b.cue.id);
    this.maxDur = 0;
    for (const c of this.items) this.maxDur = Math.max(this.maxDur, c.dur);
  }

  /** index of the last item with t0 <= t (or -1) */
  private upper(t: number): number {
    const a = this.items;
    let lo = 0,
      hi = a.length - 1,
      idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (a[mid].t0 <= t) {
        idx = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return idx;
  }

  /** winner (latest-started alive) at t among items with index < before */
  winnerAt(t: number, before = Infinity): number {
    let j = Math.min(this.upper(t), before - 1);
    const a = this.items;
    for (; j >= 0; j--) {
      const c = a[j];
      if (c.t0 < t - this.maxDur) break;
      if (t < c.t0 + c.dur) return j;
    }
    return -1;
  }

  /**
   * Resolve the state at t: `from` -> `to` blended with k (0..1, eased). `to` null = nothing
   * (dark / default); `from` null = crossfade from nothing.
   */
  resolve(t: number, out: StateBlend): StateBlend {
    const a = this.items;
    const w = this.winnerAt(t);
    const cur = w >= 0 ? a[w] : null;
    let transT = -Infinity;
    let from: LightCue | null = null;
    let fade = 0;
    if (cur) {
      transT = cur.t0;
      fade = cur.fade;
      const pw = this.winnerAt(cur.t0, w);
      from = pw >= 0 ? a[pw] : null;
    }
    // a later-started cue that ended recently (we fell back to an older one or to nothing)
    const hi = this.upper(t);
    for (let j = hi; j > w; j--) {
      const c = a[j];
      const e = c.t0 + c.dur;
      if (e <= t && e > transT && t - e < c.fade) {
        transT = e;
        from = c;
        fade = c.fade;
      }
      if (c.t0 < t - this.maxDur - 30) break;
    }
    let k = fade > 0 ? (t - transT) / fade : 1;
    k = k < 0 ? 0 : k > 1 ? 1 : k;
    out.from = k >= 1 ? null : from;
    out.to = cur;
    out.k = k * k * (3 - 2 * k);
    return out;
  }
}

export interface StateBlend {
  from: LightCue | null;
  to: LightCue | null;
  k: number;
}

/** Sorted list of short event cues (hits, chases, blinders, strobes) with an alive query. */
export class EventTrack {
  items: LightCue[] = [];
  private maxLife = 0;
  /** `withFade`: each cue lives dur + its own `fade` (floods) instead of dur + tail */
  constructor(
    private tail: number,
    private withFade = false,
  ) {}

  private life(c: LightCue): number {
    return c.dur + (this.withFade ? c.fade : this.tail);
  }

  push(c: LightCue): void {
    this.items.push(c);
  }

  finish(): void {
    this.items.sort((a, b) => a.t0 - b.t0 || a.cue.id - b.cue.id);
    this.maxLife = 0;
    for (const c of this.items) this.maxLife = Math.max(this.maxLife, this.life(c));
  }

  /** cues alive at t (t0 <= t < t0 + dur + tail), oldest first, written into `out` */
  alive(t: number, out: LightCue[]): LightCue[] {
    out.length = 0;
    const a = this.items;
    let lo = 0,
      hi = a.length - 1,
      idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (a[mid].t0 <= t) {
        idx = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    let first = idx + 1;
    for (let j = idx; j >= 0; j--) {
      const c = a[j];
      if (c.t0 < t - this.maxLife) break;
      first = j;
    }
    for (let j = first; j <= idx; j++) {
      const c = a[j];
      if (t < c.t0 + this.life(c)) out.push(c);
    }
    return out;
  }
}

/** blinder tungsten afterglow (s) */
export const BLINDER_TAIL = 1.1;
/** strobe flash decay tail (s) */
export const STROBE_TAIL = 0.2;

export class LightCueIndex {
  /** one look track per fixture class (group x position tag x side band) */
  looks: StateTrack[] = [];
  /** the set wash (untargeted / non-zone washes) */
  readonly wash = new StateTrack();
  /** zone washes on the left / right side sections (target sides / side_front …) */
  readonly washSides = [new StateTrack(), new StateTrack()];
  /** one lamp state track per lantern pillar (a pillars cue may target a subset) */
  pillars: StateTrack[] = [];
  /** festoon strings: kind * 2 + side */
  readonly festoon: StateTrack[] = Array.from({ length: FS_KINDS * 2 }, () => new StateTrack());
  readonly floods = new EventTrack(0, true);
  readonly hits = new EventTrack(0);
  readonly chases = new EventTrack(0);
  readonly blinders = new EventTrack(BLINDER_TAIL);
  readonly strobes = new EventTrack(STROBE_TAIL);
  revision = -1;
  count = 0;
  /** content signature of the lights + strobe cue lists the index was built from */
  private sig = NaN;
  private rig: Rig | null = null;

  /**
   * Called when the show engine's revision changes. The engine recompiles whenever another system
   * registers a lifetime (every system init), which does not change the lighting cues: rebuild only
   * when their content (or the rig) really changed.
   */
  sync(show: ShowEngine, rig: Rig): void {
    const sig = cueSignature(show);
    if (sig !== this.sig || rig !== this.rig) this.rebuild(show, rig);
    this.sig = sig;
    this.rig = rig;
    this.revision = show.revision;
  }

  rebuild(show: ShowEngine, rig: Rig): void {
    const classes = rig.classes;
    this.looks = classes.map(() => new StateTrack());
    this.wash.items.length = 0;
    for (const w of this.washSides) w.items.length = 0;
    this.pillars = rig.pillars.map(() => new StateTrack());
    for (const f of this.festoon) f.items.length = 0;
    this.floods.items.length = 0;
    this.hits.items.length = 0;
    this.chases.items.length = 0;
    this.blinders.items.length = 0;
    this.strobes.items.length = 0;
    this.count = 0;
    for (const c of show.all('lights')) {
      const lc = parse(c, show);
      this.count++;
      switch (c.fx) {
        case 'look':
          // latest look per group wins; a look `target` narrows it to matching positions / sides
          for (let i = 0; i < classes.length; i++) {
            const k = classes[i];
            if (lc.groups & (1 << k.group) && matchTarget(lc.target, k.tags, k.x)) this.looks[i].push(lc);
          }
          break;
        case 'wash':
          // a side-section target makes a zone wash (local glow), everything else washes the set
          if (lc.area & AREA_SIDES) {
            if (lc.area & AREA_SIDES_L) this.washSides[0].push(lc);
            if (lc.area & AREA_SIDES_R) this.washSides[1].push(lc);
          } else this.wash.push(lc);
          break;
        case 'pillars':
          lc.pmask = pillarMask(c, rig);
          for (let i = 0; i < this.pillars.length; i++) if (!lc.pmask || lc.pmask[i]) this.pillars[i].push(lc);
          break;
        case 'flood':
          this.floods.push(lc);
          break;
        case 'festoon':
          for (let b = 0; b < this.festoon.length; b++) if (lc.strings & (1 << b)) this.festoon[b].push(lc);
          break;
        case 'hit':
          lc.mask = fixtureMask(lc.target, rig);
          this.hits.push(lc);
          break;
        case 'chase':
          lc.mask = fixtureMask(lc.target, rig);
          this.chases.push(lc);
          break;
        case 'blinder':
          lc.mask = emitterMask(lc.target, rig);
          this.blinders.push(lc);
          break;
        default:
          this.count--; // unknown fx: ignored gracefully
      }
    }
    for (const c of show.all('strobe')) {
      if (c.fx !== 'hit' && c.fx !== 'burst' && c.fx !== 'kick') continue;
      const lc = parse(c, show);
      lc.mask = emitterMask(lc.target, rig);
      this.strobes.push(lc);
      this.count++;
    }
    for (const t of this.looks) t.finish();
    this.wash.finish();
    for (const w of this.washSides) w.finish();
    for (const p of this.pillars) p.finish();
    for (const f of this.festoon) f.finish();
    this.floods.finish();
    this.hits.finish();
    this.chases.finish();
    this.blinders.finish();
    this.strobes.finish();
    this.revision = show.revision;
  }
}

/**
 * pillars cue subset: `target` left / right / center (aisle side), `rows` (0 = the row nearest the stage)
 * and / or `index` (anchor order of pillars_top) — number or list. null = every pillar.
 */
function pillarMask(c: Cue, rig: Rig): Uint8Array | null {
  const p = c.p ?? {};
  const list = (v: unknown): number[] | null => (typeof v === 'number' ? [v] : Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : null);
  const rows = list(p.rows ?? p.row);
  const index = list(p.index ?? p.pillars);
  const left = c.targets.includes('left');
  const right = c.targets.includes('right');
  if (!rows && !index && left === right) return null;
  const m = new Uint8Array(rig.pillars.length);
  rig.pillars.forEach((pl, i) => {
    let ok = true;
    if (rows) ok = rows.includes(pl.row);
    if (index) ok = ok && index.includes(pl.index);
    if (left !== right) ok = ok && (left ? pl.top.x < 0 : pl.top.x > 0);
    m[i] = ok ? 1 : 0;
  });
  return m;
}

/** target filter evaluated once per fixture (hits / chases never re-match per frame) */
function fixtureMask(f: TargetFilter, rig: Rig): Uint8Array {
  const m = new Uint8Array(rig.fixtures.length);
  for (let i = 0; i < m.length; i++) {
    const fx = rig.fixtures[i];
    m[i] = matchTarget(f, fx.tags, fx.pos.x) ? 1 : 0;
  }
  return m;
}

function emitterMask(f: TargetFilter, rig: Rig): Uint8Array {
  const m = new Uint8Array(rig.emitters.length);
  for (let i = 0; i < m.length; i++) {
    const e = rig.emitters[i];
    m[i] = matchTarget(f, e.tags, e.pos.x) ? 1 : 0;
  }
  return m;
}

/** order-sensitive hash of everything the index reads from the lights / strobe cues (+ the tempo map) */
function cueSignature(show: ShowEngine): number {
  let h = 17;
  const mix = (s: string) => {
    for (let k = 0; k < s.length; k++) h = (Math.imul(h, 31) + s.charCodeAt(k)) | 0;
  };
  for (const sys of ['lights', 'strobe'] as const) {
    const all = show.all(sys);
    h = (Math.imul(h, 31) + all.length) | 0;
    for (let i = 0; i < all.length; i++) {
      const c = all[i];
      h = (Math.imul(h, 31) + Math.round(c.t * 1000)) | 0;
      h = (Math.imul(h, 31) + Math.round(c.dur * 1000)) | 0;
      h = (Math.imul(h, 31) + c.seed) | 0;
      mix(c.fx);
      mix(c.targets.join(','));
      mix(JSON.stringify(c.p ?? null));
      if (show.tempo) h = (Math.imul(h, 31) + Math.round(show.tempo.segmentAt(c.t).bpm * 100)) | 0;
    }
  }
  return h;
}
