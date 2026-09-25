import * as THREE from 'three';
import type { ShowEngine } from '../show/ShowEngine';
import type { Cue } from '../show/ShowTypes';
import { matchTarget, parseGroups, parseTargets, type FixtureClass, type TargetFilter } from './rig';

/**
 * Cue indexing for the lighting system. Everything here is rebuilt only when the show engine
 * recompiles (revision change); per-frame queries are binary searches over sorted arrays and
 * never allocate.
 */

export const PRESETS = ['dark', 'ambient', 'sweep', 'fan', 'ballyhoo', 'circle', 'tilt_wave', 'audience', 'crosshatch', 'sky', 'pulse', 'still'] as const;
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

/** default speed (cycles per bar) per preset */
const DEFAULT_SPEED = [0, 0.0625, 0.25, 0.125, 1, 0.25, 0.25, 0.125, 0.125, 0.0625, 0, 0];

/** beam half-angle tangents */
export const TAN_NARROW = Math.tan((1.3 * Math.PI) / 180);
export const TAN_WIDE = Math.tan((4.6 * Math.PI) / 180);

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);

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
  // hit / chase / blinder / strobe
  target: TargetFilter;
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
  const lc: LightCue = {
    cue: c,
    t0: c.t,
    dur: c.dur,
    fade: Math.max(0, num(p.fade, c.fx === 'wash' ? 1 : c.fx === 'pillars' ? 0.6 : 0.5)),
    seed: c.seed,
    bpm: show.tempo ? show.tempo.segmentAt(c.t).bpm : 150,
    intensity: Math.max(0, num(p.intensity, 1)),
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
    target: parseTargets(c.targets, p.groups, { tags: 0, side: 0 }),
    pattern: str(p.pattern) ?? 'lr',
    every: p.every === 'halfbeat' ? 0.5 : p.every === 'bar' ? 4 : p.every === '2beat' ? 2 : 1,
    rate: Math.max(0.5, Math.min(30, num(p.rate, 12))),
    mode: Math.max(0, PILLAR_MODES.indexOf(str(p.mode) ?? 'steady')),
    shaft: str(p.shaft) ?? str(p.color2),
    shaftIntensity: Math.max(0, num(p.shaftIntensity, 0.8)),
    c3: new THREE.Color(1, 1, 1),
  };
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
  constructor(private tail: number) {}

  push(c: LightCue): void {
    this.items.push(c);
  }

  finish(): void {
    this.items.sort((a, b) => a.t0 - b.t0 || a.cue.id - b.cue.id);
    this.maxLife = 0;
    for (const c of this.items) this.maxLife = Math.max(this.maxLife, c.dur + this.tail);
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
      if (t < c.t0 + c.dur + this.tail) out.push(c);
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
  readonly wash = new StateTrack();
  readonly pillars = new StateTrack();
  readonly hits = new EventTrack(0);
  readonly chases = new EventTrack(0);
  readonly blinders = new EventTrack(BLINDER_TAIL);
  readonly strobes = new EventTrack(STROBE_TAIL);
  revision = -1;
  count = 0;

  rebuild(show: ShowEngine, classes: readonly FixtureClass[]): void {
    this.looks = classes.map(() => new StateTrack());
    this.wash.items.length = 0;
    this.pillars.items.length = 0;
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
          this.wash.push(lc);
          break;
        case 'pillars':
          this.pillars.push(lc);
          break;
        case 'hit':
          this.hits.push(lc);
          break;
        case 'chase':
          this.chases.push(lc);
          break;
        case 'blinder':
          this.blinders.push(lc);
          break;
        default:
          this.count--; // unknown fx: ignored gracefully
      }
    }
    for (const c of show.all('strobe')) {
      if (c.fx !== 'hit' && c.fx !== 'burst' && c.fx !== 'kick') continue;
      this.strobes.push(parse(c, show));
      this.count++;
    }
    for (const t of this.looks) t.finish();
    this.wash.finish();
    this.pillars.finish();
    this.hits.finish();
    this.chases.finish();
    this.blinders.finish();
    this.strobes.finish();
    this.revision = show.revision;
  }
}
