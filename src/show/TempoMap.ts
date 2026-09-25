import type { BeatInfo } from '../core/types';
import type { RepeatEvery, Section, TempoSegment } from './ShowTypes';

const EMPTY: TempoSegment = { start: 0, end: 1e9, bpm: 150, anchor: 0, kick: false, beatsPerBar: 4 };

/** Musical grid: converts show time <-> beats, provides beat info for kick-synced visuals. */
export class TempoMap {
  constructor(public segments: TempoSegment[], public sections: Section[]) {
    this.segments = [...segments].sort((a, b) => a.start - b.start);
    this.sections = [...sections].sort((a, b) => a.start - b.start);
  }

  segmentAt(t: number): TempoSegment {
    const s = this.segments;
    let lo = 0,
      hi = s.length - 1,
      best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (s[mid].start <= t) {
        best = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    if (best < 0) return s[0] ?? EMPTY;
    return s[best];
  }

  sectionAt(t: number): Section | null {
    const s = this.sections;
    let lo = 0,
      hi = s.length - 1,
      best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (s[mid].start <= t) {
        best = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    if (best < 0) return s[0] ?? null;
    const sec = s[best];
    return t < sec.end ? sec : sec;
  }

  /** index of section at t (or -1) */
  sectionIndexAt(t: number): number {
    const sec = this.sectionAt(t);
    return sec ? this.sections.indexOf(sec) : -1;
  }

  beatLength(t: number): number {
    return 60 / this.segmentAt(t).bpm;
  }

  /** continuous beat number within the segment containing t */
  beatAt(t: number): number {
    const seg = this.segmentAt(t);
    return ((t - seg.anchor) * seg.bpm) / 60;
  }

  /** time of beat `b` (segment-local beat numbering) in the segment containing reference time `ref` */
  timeOfBeat(ref: number, b: number): number {
    const seg = this.segmentAt(ref);
    return seg.anchor + (b * 60) / seg.bpm;
  }

  /** grid step in seconds for a repeat unit at time t */
  stepSeconds(every: RepeatEvery, t: number): number {
    if (typeof every === 'number') return every;
    const beat = this.beatLength(t);
    const bpb = this.segmentAt(t).beatsPerBar ?? 4;
    switch (every) {
      case 'halfbeat':
        return beat / 2;
      case 'beat':
        return beat;
      case '2beat':
        return beat * 2;
      case 'bar':
        return beat * bpb;
      case '2bar':
        return beat * bpb * 2;
      case '4bar':
        return beat * bpb * 4;
      case '8bar':
        return beat * bpb * 8;
    }
  }

  /** snap time to nearest grid position of the given unit */
  snap(t: number, unit: 'beat' | 'halfbeat' | 'bar'): number {
    const seg = this.segmentAt(t);
    const bpb = seg.beatsPerBar ?? 4;
    const unitBeats = unit === 'beat' ? 1 : unit === 'halfbeat' ? 0.5 : bpb;
    const b = ((t - seg.anchor) * seg.bpm) / 60 / unitBeats;
    return seg.anchor + (Math.round(b) * unitBeats * 60) / seg.bpm;
  }

  /** Fill a BeatInfo for time t (allocation free). */
  beatInfo(t: number, out: BeatInfo): BeatInfo {
    const seg = this.segmentAt(t);
    const bpb = seg.beatsPerBar ?? 4;
    const beat = ((t - seg.anchor) * seg.bpm) / 60;
    const phase = beat - Math.floor(beat);
    const bar = beat / bpb;
    out.bpm = seg.bpm;
    out.beat = beat;
    out.phase = phase;
    out.bar = bar;
    out.barPhase = bar - Math.floor(bar);
    const inside = t >= seg.start && t < seg.end;
    out.hasKick = seg.kick && inside;
    const sinceBeat = (phase * 60) / seg.bpm;
    out.kick = out.hasKick ? Math.exp(-sinceBeat * 11) : 0;
    const sec = this.sectionAt(t);
    out.energy = sec ? sec.energy : 0;
    return out;
  }
}
