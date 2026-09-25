import * as THREE from 'three';
import { hashN, hashString } from '../core/rng';
import type { Cue, CueDef, Palette, Section, ShowFile, SystemId, TempoSegment } from './ShowTypes';
import { TempoMap } from './TempoMap';

/** Visual lifetime resolver registered by systems (e.g. a firework shell lives ~7 s after launch). */
export type LifetimeFn = (cue: Omit<Cue, 'life' | 'end'>) => number;

export interface ResolvedPalette {
  primary: THREE.Color;
  secondary: THREE.Color;
  accent: THREE.Color;
  atmos: THREE.Color;
}

const DEFAULT_DUR: Partial<Record<SystemId, number>> = {
  pyro: 0.8,
  fireworks: 0.2,
  strobe: 0.25,
  lasers: 4,
  lights: 8,
  crowd: 2,
  stage: 4,
  screens: 8,
  fog: 6,
  camera: 6,
  atmos: 10,
};

/**
 * The show engine: compiles the declarative show file into an immutable, sorted cue list and
 * answers "what is active at time t" queries. It owns NO rendering and NO UI.
 * Everything is a pure function of time -> seek/pause/restart are trivially correct.
 */
export class ShowEngine {
  file!: ShowFile;
  tempo!: TempoMap;
  private bySys = new Map<SystemId, Cue[]>();
  private maxLife = new Map<SystemId, number>();
  private lifetimes = new Map<SystemId, LifetimeFn>();
  private palettes = new Map<string, ResolvedPalette>();
  private out: Cue[] = [];
  cueCount = 0;
  /** increments on every (re)compile so systems can rebuild caches */
  revision = 0;

  get duration(): number {
    return this.file?.meta.duration ?? 0;
  }

  registerLifetime(sys: SystemId, fn: LifetimeFn): void {
    this.lifetimes.set(sys, fn);
    if (this.file) this.compile();
  }

  async load(url: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`show file ${url}: HTTP ${res.status}`);
    this.setFile((await res.json()) as ShowFile);
  }

  setFile(file: ShowFile): void {
    this.file = file;
    this.palettes.clear();
    for (const [k, p] of Object.entries(file.palettes)) this.palettes.set(k, resolvePalette(p));
    this.tempo = new TempoMap(file.tempo, file.sections);
    this.compile();
  }

  /** Replace the tempo grid (e.g. after analysing the real audio) and recompile deterministically. */
  setTempo(segments: TempoSegment[]): void {
    this.file.tempo = segments;
    this.tempo = new TempoMap(segments, this.file.sections);
    this.compile();
  }

  compile(): void {
    const cues: Cue[] = [];
    let id = 0;
    const defs = this.file.cues;
    for (let di = 0; di < defs.length; di++) {
      const def = defs[di];
      const base = hashString(`${def.sys}:${def.fx}:${def.t}:${di}`);
      for (const inst of this.expand(def)) {
        const partial = {
          id: id,
          t: inst.t,
          dur: inst.dur,
          sys: def.sys,
          fx: def.fx,
          targets: inst.targets,
          p: inst.p,
          seed: hashN(base, inst.step, id),
          step: inst.step,
        };
        const lf = this.lifetimes.get(def.sys);
        const life = Math.max(partial.dur, lf ? lf(partial) : partial.dur);
        cues.push({ ...partial, life, end: partial.t + life });
        id++;
      }
    }
    this.bySys.clear();
    this.maxLife.clear();
    for (const c of cues) {
      let arr = this.bySys.get(c.sys);
      if (!arr) this.bySys.set(c.sys, (arr = []));
      arr.push(c);
      this.maxLife.set(c.sys, Math.max(this.maxLife.get(c.sys) ?? 0, c.life));
    }
    for (const arr of this.bySys.values()) arr.sort((a, b) => a.t - b.t || a.id - b.id);
    this.cueCount = cues.length;
    this.revision++;
  }

  private *expand(def: CueDef): Generator<{ t: number; dur: number; targets: string[]; p: Record<string, any>; step: number }> {
    const targets = def.target === undefined ? ['all'] : Array.isArray(def.target) ? def.target : [def.target];
    const dur = def.dur ?? DEFAULT_DUR[def.sys] ?? 1;
    const p = (def.p ?? {}) as Record<string, any>;
    let t0 = def.t;
    if (def.snap && def.snap !== 'none') t0 = this.tempo.snap(t0, def.snap);
    if (!def.repeat) {
      yield { t: t0, dur, targets, p, step: 0 };
      return;
    }
    const r = def.repeat;
    const until = r.until ?? Infinity;
    const maxCount = r.count ?? 100000;
    const pattern = r.pattern ?? 'x';
    let t = t0;
    let fired = 0;
    let stepIdx = 0;
    // Musical repeats follow the tempo grid (the step length may change across tempo segments).
    while (t < until && fired < maxCount && stepIdx < 20000) {
      const on = pattern[stepIdx % pattern.length] !== '-';
      if (on) {
        let pp = p;
        if (r.cycle) {
          pp = { ...p };
          for (const [k, vals] of Object.entries(r.cycle)) pp[k] = vals[fired % vals.length];
        }
        const tg = r.cycleTargets ? r.cycleTargets[fired % r.cycleTargets.length] : targets;
        yield { t, dur, targets: tg, p: pp, step: fired };
        fired++;
      }
      stepIdx++;
      const step = this.tempo.stepSeconds(r.every, t);
      t = typeof r.every === 'number' ? t0 + stepIdx * step : this.gridAdvance(t, step);
    }
  }

  /** advance on the grid avoiding float drift: re-snap to the beat grid after each step */
  private gridAdvance(t: number, step: number): number {
    const next = t + step;
    const beatLen = this.tempo.beatLength(next);
    const snapped = this.tempo.snap(next, 'halfbeat');
    return Math.abs(snapped - next) < beatLen * 0.2 ? snapped : next;
  }

  /**
   * Cues of a system alive at time t (t in [cue.t, cue.end)). Returned array is reused between
   * calls — copy it if you need to keep it. Sorted by start time ascending.
   */
  active(sys: SystemId, t: number, out: Cue[] = this.out): Cue[] {
    out.length = 0;
    const arr = this.bySys.get(sys);
    if (!arr || arr.length === 0) return out;
    const maxLife = this.maxLife.get(sys) ?? 0;
    // last cue with start <= t
    let lo = 0,
      hi = arr.length - 1,
      idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].t <= t) {
        idx = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    for (let i = idx; i >= 0; i--) {
      const c = arr[i];
      if (c.t < t - maxLife) break;
      if (t < c.end) out.push(c);
    }
    out.reverse();
    return out;
  }

  /** All cues of a system (sorted). */
  all(sys: SystemId): readonly Cue[] {
    return this.bySys.get(sys) ?? [];
  }

  /** The latest-started alive cue of a system with the given fx (e.g. the current 'look'). */
  latest(sys: SystemId, fx: string, t: number): Cue | null {
    const act = this.active(sys, t, []);
    for (let i = act.length - 1; i >= 0; i--) if (act[i].fx === fx) return act[i];
    return null;
  }

  /** Next cue start after t for a system (for UI/debug). */
  next(sys: SystemId, t: number): Cue | null {
    const arr = this.bySys.get(sys);
    if (!arr) return null;
    for (const c of arr) if (c.t > t) return c;
    return null;
  }

  section(t: number): Section | null {
    return this.tempo.sectionAt(t);
  }

  /** Palette at t, cross-faded over `fade` seconds at section boundaries. */
  paletteAt(t: number, out: ResolvedPalette, fade = 1.5): ResolvedPalette {
    const secs = this.file.sections;
    const i = this.tempo.sectionIndexAt(t);
    const cur = this.palettes.get(secs[i]?.palette ?? '') ?? this.palettes.values().next().value!;
    const prev = i > 0 ? this.palettes.get(secs[i - 1].palette) : undefined;
    const k = prev && i >= 0 ? Math.min(1, (t - secs[i].start) / fade) : 1;
    if (!prev || k >= 1) {
      out.primary.copy(cur.primary);
      out.secondary.copy(cur.secondary);
      out.accent.copy(cur.accent);
      out.atmos.copy(cur.atmos);
    } else {
      out.primary.copy(prev.primary).lerp(cur.primary, k);
      out.secondary.copy(prev.secondary).lerp(cur.secondary, k);
      out.accent.copy(prev.accent).lerp(cur.accent, k);
      out.atmos.copy(prev.atmos).lerp(cur.atmos, k);
    }
    return out;
  }

  static newPalette(): ResolvedPalette {
    return { primary: new THREE.Color(), secondary: new THREE.Color(), accent: new THREE.Color(), atmos: new THREE.Color() };
  }

  chapterAt(t: number): { t: number; title: string; artist: string } | null {
    const ch = this.file.chapters;
    let best = null;
    for (const c of ch) if (c.t <= t) best = c;
    return best;
  }
}

function resolvePalette(p: Palette): ResolvedPalette {
  return {
    primary: new THREE.Color(p.primary),
    secondary: new THREE.Color(p.secondary),
    accent: new THREE.Color(p.accent),
    atmos: new THREE.Color(p.atmos ?? p.primary),
  };
}
