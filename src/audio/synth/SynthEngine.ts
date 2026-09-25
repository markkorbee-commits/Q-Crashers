/**
 * The rehearsal-track arranger + voice scheduler.
 *
 * Works on any BaseAudioContext (realtime for SynthTrack, offline for tests / exports).
 * Music is a PURE function of show time: the scheduler walks the show's tempo grid (16th steps)
 * inside a time window and derives every note from (tempo segment, section kind/energy, chapter
 * style, bar/step index). Seeking simply starts a new "session" at the new time; sustained voices
 * (pads, risers, subs) that should already be sounding are started mid-note ("catch-up").
 *
 * CPU notes: no per-note filters with automation (a-rate biquad coefficients are expensive).
 * Plucks are pre-rendered multi-samples, the reverse-bass "opening" is a cross-fade between two
 * static filters, pad/riser sweeps use stepped automation, and vibrato/ensemble is done once per
 * bus with modulated delay lines instead of per-oscillator detune modulation.
 */
import type { TempoMap } from '../../show/TempoMap';
import type { Section, SectionKind, TempoSegment } from '../../show/ShowTypes';
import { hash32 } from '../../core/rng';
import { killSource, midiToHz, reverbIR, softClipCurve } from '../audioUtils';
import { chordTones, chordToneIndex, recipe, STYLES, styleForChapter, type KindRecipe, type Style } from './Music';
import { kickTailMidi, pluckFor, type SynthSamples } from './SynthSamples';

/** The subset of ShowEngine the synth needs (ShowEngine satisfies it structurally). */
export interface SynthShowSource {
  readonly tempo: TempoMap;
  readonly file: { sections: Section[]; chapters: { t: number; title: string; artist: string }[] };
  readonly duration: number;
}

export type SynthLayer = 'drums' | 'bass' | 'pads' | 'leads' | 'fx';

export interface SynthOptions {
  /** fewer oscillators per voice, shorter reverb (mobile) */
  lite?: boolean;
  /** debug: layers to leave out (profiling / listening tests) */
  mute?: SynthLayer[];
}

interface Session {
  showStart: number;
  ctxStart: number;
  /** show time up to which events have been scheduled */
  cursor: number;
  gates: GainNode[];
  drums: GainNode;
  bassDark: GainNode;
  bassBright: GainNode;
  sub: GainNode;
  padDuck: GainNode;
  padFilterL: BiquadFilterNode;
  padFilterR: BiquadFilterNode;
  strings: GainNode;
  choir: GainNode;
  violin: GainNode;
  arp: GainNode;
  arpFilter: BiquadFilterNode;
  lead: GainNode;
  leadTone: GainNode;
  screech: GainNode;
  fx: GainNode;
  nodes: AudioNode[];
  lfoTaps: [AudioNode, AudioNode][];
  sources: AudioScheduledSourceNode[];
  ends: number[];
  lastDuck: number;
  lastPadCut: number;
  lastArpCut: number;
  arpCut: number;
  delayBpm: number;
}

const NOTE_OFF = 0.0001;

export class SynthEngine {
  readonly ctx: BaseAudioContext;
  /** final output (volume) */
  readonly output: GainNode;
  private sum: GainNode;
  private reverbIn: GainNode;
  private delayIn: GainNode;
  private delayTaps: [DelayNode, number][];
  private vibLfo: OscillatorNode;
  private slowLfo: OscillatorNode;
  private persistent: AudioNode[] = [];
  private session: Session | null = null;
  private styleCache = new Map<number, Style>();
  private recipes = new Map<Section, KindRecipe[]>();
  private tones: number[] = [];
  private tones2: number[] = [];
  private lite: boolean;
  private mute: Set<SynthLayer>;
  private bassCurve: Float32Array<ArrayBuffer>;
  private screechCurve: Float32Array<ArrayBuffer>;
  /** voices started in the current session (stats) */
  voices = 0;

  constructor(
    ctx: BaseAudioContext,
    destination: AudioNode,
    private show: SynthShowSource,
    private samples: SynthSamples,
    opts: SynthOptions = {},
  ) {
    this.ctx = ctx;
    this.lite = !!opts.lite;
    this.mute = new Set(opts.mute ?? []);
    this.bassCurve = softClipCurve(3.2);
    this.screechCurve = softClipCurve(5);
    this.output = ctx.createGain();
    this.output.gain.value = 0.9;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 26;
    hp.Q.value = 0.6;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -15;
    comp.knee.value = 8;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.004;
    comp.release.value = 0.14;
    this.sum = ctx.createGain();
    this.sum.gain.value = 0.8;
    this.sum.connect(hp).connect(comp).connect(this.output).connect(destination);

    // reverb bus
    this.reverbIn = ctx.createGain();
    const conv = ctx.createConvolver();
    conv.buffer = reverbIR(ctx, this.lite ? 1.3 : 2.2, { seed: 23, predelay: 0.025, damping: 0.75 });
    const verbHp = ctx.createBiquadFilter();
    verbHp.type = 'highpass';
    verbHp.frequency.value = 180;
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.55;
    this.reverbIn.connect(verbHp).connect(conv).connect(verbOut).connect(this.sum);

    // ping-pong echo (dotted 8th, set per tempo segment). Built from 3 feed-forward taps instead
    // of a feedback loop: graph cycles keep Chrome from propagating silence, which would keep the
    // whole reverb running while nothing plays.
    this.delayIn = ctx.createGain();
    const dLp = ctx.createBiquadFilter();
    dLp.type = 'lowpass';
    dLp.frequency.value = 3400;
    this.delayIn.connect(dLp);
    const merger = ctx.createChannelMerger(2);
    const dOut = ctx.createGain();
    dOut.gain.value = 0.5;
    this.delayTaps = [];
    const taps: [number, number, number][] = [
      [1, 0, 1],
      [2, 1, 0.42],
      [3, 0, 0.18],
    ];
    for (const [mult, ch, gain] of taps) {
      const dl = ctx.createDelay(4);
      dl.delayTime.value = 0.3 * mult;
      const g = ctx.createGain();
      g.gain.value = gain;
      dLp.connect(dl).connect(g).connect(merger, 0, ch);
      this.delayTaps.push([dl, mult]);
      this.persistent.push(dl, g);
    }
    merger.connect(dOut).connect(this.sum);

    // modulation sources for the ensemble / vibrato delay lines
    this.vibLfo = ctx.createOscillator();
    this.vibLfo.frequency.value = 5.3;
    this.vibLfo.start();
    this.slowLfo = ctx.createOscillator();
    this.slowLfo.frequency.value = 0.57;
    this.slowLfo.start();
    this.persistent.push(this.output, hp, comp, this.sum, this.reverbIn, conv, verbHp, verbOut, this.delayIn, dLp, merger, dOut, this.vibLfo, this.slowLfo);
  }

  // ------------------------------------------------------------------ session lifecycle

  /** Start rendering from show time `t0`; the first sample of t0 plays at context time `ctxStart`. */
  startSession(t0: number, ctxStart: number): void {
    this.killSession(ctxStart);
    const ctx = this.ctx;
    const nodes: AudioNode[] = [];
    const lfoTaps: [AudioNode, AudioNode][] = [];
    const g = (v: number) => {
      const n = ctx.createGain();
      n.gain.value = v;
      nodes.push(n);
      return n;
    };
    const f = (type: BiquadFilterType, freq: number, q = 0.7, gain = 0) => {
      const n = ctx.createBiquadFilter();
      n.type = type;
      n.frequency.value = freq;
      n.Q.value = q;
      n.gain.value = gain;
      nodes.push(n);
      return n;
    };
    const d = (time: number) => {
      const n = ctx.createDelay(0.1);
      n.delayTime.value = time;
      nodes.push(n);
      return n;
    };
    const mod = (lfo: OscillatorNode, depth: number, target: AudioParam) => {
      const n = g(depth);
      lfo.connect(n);
      n.connect(target);
      lfoTaps.push([lfo, n]);
    };
    const pan = (p: number) => {
      const n = ctx.createStereoPanner();
      n.pan.value = p;
      nodes.push(n);
      return n;
    };

    // output groups (gated per session so kill = fade out)
    const gates: GainNode[] = [];
    const gate = () => {
      const n = g(0);
      n.gain.setValueAtTime(0, Math.max(0, ctxStart - 0.01));
      n.gain.linearRampToValueAtTime(1, ctxStart + 0.012);
      n.connect(this.sum);
      gates.push(n);
      return n;
    };
    const drumsG = gate(),
      bassG = gate(),
      padG = gate(),
      leadG = gate(),
      fxG = gate();
    padG.connect(g(0.28)).connect(this.reverbIn);
    leadG.connect(g(0.22)).connect(this.reverbIn);
    leadG.connect(g(0.2)).connect(this.delayIn);
    fxG.connect(g(0.3)).connect(this.reverbIn);

    // pads: L/R detuned layers -> stepped low-pass -> wide pan -> sidechain duck
    const padDuck = g(1);
    padDuck.connect(padG);
    const padFilterL = f('lowpass', 2000, 0.9);
    const padFilterR = f('lowpass', 2000, 0.9);
    padFilterL.connect(pan(-0.8)).connect(padDuck);
    padFilterR.connect(pan(0.8)).connect(padDuck);

    // reverse bass: per-note cross-fade dark -> bright into a saturator
    const bassDark = g(1);
    const bassBright = g(1);
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.bassCurve;
    shaper.oversample = this.lite ? 'none' : '2x';
    nodes.push(shaper);
    bassDark.connect(f('lowpass', 190, 1.4)).connect(shaper);
    bassBright.connect(f('lowpass', 1250, 2.4)).connect(shaper);
    shaper.connect(bassG);
    const sub = g(1);
    sub.connect(bassG);

    // strings: ensemble chorus (2 modulated delay lines + dry) -> body EQ -> pad bus + hall
    const strings = g(1);
    const strBody = f('lowpass', 2700, 0.5);
    const strEq = f('peaking', 900, 0.8, -2.5);
    strBody.connect(strEq).connect(padG);
    strEq.connect(g(0.45)).connect(this.reverbIn);
    strings.connect(g(0.55)).connect(strBody);
    const ensemble = (base: number, sDepth: number, vDepth: number) => {
      const dl = d(base);
      mod(this.slowLfo, sDepth, dl.delayTime);
      mod(this.vibLfo, vDepth, dl.delayTime);
      return dl;
    };
    if (this.lite) {
      strings.connect(ensemble(0.011, 0.002, 0.00012)).connect(g(0.6)).connect(strBody);
    } else {
      strings.connect(ensemble(0.0105, 0.0024, 0.00011)).connect(pan(-0.7)).connect(g(0.55)).connect(strBody);
      strings.connect(ensemble(0.0135, -0.0021, -0.00014)).connect(pan(0.7)).connect(g(0.55)).connect(strBody);
    }

    // choir: 3 formant band-passes ('ah') + light chorus
    const choir = g(1);
    const choirOut = g(1.7);
    for (const [fq, q, a] of [
      [760, 7, 1],
      [1180, 8, 0.6],
      [2750, 10, 0.3],
    ] as [number, number, number][]) {
      choir.connect(f('bandpass', fq, q)).connect(g(a)).connect(choirOut);
    }
    choirOut.connect(padDuck);
    choirOut.connect(ensemble(0.012, 0.0018, 0.00015)).connect(g(0.6)).connect(padDuck);
    choirOut.connect(g(0.4)).connect(this.reverbIn);

    // violin: delay-line vibrato -> body resonances
    const violin = g(1);
    const vib = d(0.006);
    mod(this.vibLfo, 0.00024, vib.delayTime);
    violin.connect(vib).connect(f('highpass', 260, 0.7)).connect(f('peaking', 2900, 1.1, 5)).connect(f('lowpass', 6200, 0.6)).connect(leadG);
    vib.connect(g(0.3)).connect(this.reverbIn);

    // arp plucks (pre-rendered) -> stepped brightness filter
    const arp = g(1);
    const arpFilter = f('lowpass', 8000, 0.8);
    arp.connect(arpFilter).connect(leadG);
    // euphoric supersaw lead -> static tone filter
    const leadTone = g(1);
    leadTone.connect(f('lowpass', 4300, 0.8)).connect(leadG);
    // screech (anti-climax lead): drive + resonant band-pass
    const screech = g(1);
    const sShaper = ctx.createWaveShaper();
    sShaper.curve = this.screechCurve;
    nodes.push(sShaper);
    screech.connect(sShaper).connect(f('bandpass', 1700, 1.6)).connect(f('lowpass', 5200, 0.7)).connect(g(0.8)).connect(leadG);

    this.session = {
      showStart: t0,
      ctxStart,
      cursor: t0,
      gates,
      drums: drumsG,
      bassDark,
      bassBright,
      sub,
      padDuck,
      padFilterL,
      padFilterR,
      strings,
      choir,
      violin,
      arp,
      arpFilter,
      lead: leadG,
      leadTone,
      screech,
      fx: fxG,
      nodes,
      lfoTaps,
      sources: [],
      ends: [],
      lastDuck: 0,
      lastPadCut: 0,
      lastArpCut: 0,
      arpCut: 8000,
      delayBpm: 0,
    };
    this.voices = 0;
    this.catchUp(t0);
  }

  /** Fade out and stop everything of the current session (reverb/delay tails ring out naturally). */
  killSession(at?: number): void {
    const s = this.session;
    if (!s) return;
    this.session = null;
    const now = Math.max(at ?? 0, this.ctx.currentTime);
    for (const gate of s.gates) {
      gate.gain.cancelScheduledValues(0);
      gate.gain.setValueAtTime(gate.gain.value, now);
      gate.gain.linearRampToValueAtTime(0, now + 0.025);
    }
    for (const src of s.sources) killSource(src, now + 0.04);
    if (typeof OfflineAudioContext !== 'undefined' && this.ctx instanceof OfflineAudioContext) return;
    setTimeout(() => {
      for (const [lfo, tap] of s.lfoTaps) {
        try {
          lfo.disconnect(tap);
        } catch {
          /* ignore */
        }
      }
      for (const n of s.nodes) {
        try {
          n.disconnect();
        } catch {
          /* ignore */
        }
      }
    }, 200);
  }

  dispose(): void {
    this.killSession();
    for (const o of [this.vibLfo, this.slowLfo]) {
      try {
        o.stop();
      } catch {
        /* ignore */
      }
    }
    for (const n of this.persistent) {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
  }

  /** context time of a show time in the current session */
  private when(t: number): number {
    const s = this.session!;
    return s.ctxStart + (t - s.showStart);
  }

  /** Schedule all events with show time in [cursor, showTo). */
  scheduleUntil(showTo: number): void {
    const s = this.session;
    if (!s) return;
    const end = Math.min(showTo, this.show.duration);
    if (end <= s.cursor) return;
    this.scheduleRange(s.cursor, end);
    s.cursor = end;
    this.prune();
  }

  private prune(): void {
    const s = this.session!;
    const now = this.ctx.currentTime;
    let w = 0;
    for (let i = 0; i < s.sources.length; i++) {
      if (s.ends[i] > now) {
        s.sources[w] = s.sources[i];
        s.ends[w] = s.ends[i];
        w++;
      }
    }
    s.sources.length = w;
    s.ends.length = w;
  }

  private track(src: AudioScheduledSourceNode, end: number): void {
    const s = this.session!;
    s.sources.push(src);
    s.ends.push(end);
    this.voices++;
  }

  activeVoices(): number {
    return this.session?.sources.length ?? 0;
  }

  // ------------------------------------------------------------------ show lookups

  private sectionAt(t: number): Section | null {
    const secs = this.show.tempo.sections;
    let lo = 0,
      hi = secs.length - 1,
      best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (secs[mid].start <= t + 1e-6) {
        best = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    if (best < 0) return null;
    const sec = secs[best];
    return t < sec.end ? sec : null;
  }

  private nextSection(sec: Section): Section | null {
    const secs = this.show.tempo.sections;
    const i = secs.indexOf(sec);
    return i >= 0 && i + 1 < secs.length ? secs[i + 1] : null;
  }

  private styleAt(t: number): Style {
    const ch = this.show.file.chapters;
    let idx = -1;
    for (let i = 0; i < ch.length; i++) if (ch[i].t <= t + 1e-6) idx = i;
    let st = this.styleCache.get(idx);
    if (!st) {
      st = idx < 0 ? STYLES[0] : styleForChapter(idx, `${ch[idx].title} ${ch[idx].artist}`);
      this.styleCache.set(idx, st);
    }
    return st;
  }

  private recipeFor(sec: Section, style: Style): KindRecipe {
    let arr = this.recipes.get(sec);
    if (!arr) this.recipes.set(sec, (arr = []));
    const i = style.timbre === 'orchestral' ? 1 : 0;
    return (arr[i] ??= recipe(sec.kind, style.timbre, sec.energy));
  }

  /** all style roots used by the show (for kick pre-rendering) */
  static rootsFor(show: SynthShowSource): number[] {
    const ch = show.file.chapters;
    if (!ch.length) return [STYLES[0].root];
    return ch.map((c, i) => styleForChapter(i, `${c.title} ${c.artist}`).root);
  }

  /** effective range of segment i: [start, next.start) so the grid never has gaps */
  private segRange(i: number): [number, number] {
    const segs = this.show.tempo.segments;
    const a = i === 0 ? -1e9 : segs[i].start;
    const b = i + 1 < segs.length ? segs[i + 1].start : 1e9;
    return [a, b];
  }

  // ------------------------------------------------------------------ arrangement

  private scheduleRange(a: number, b: number): void {
    const segs = this.show.tempo.segments;
    if (!segs.length) return;
    for (let si = 0; si < segs.length; si++) {
      const [ra, rb] = this.segRange(si);
      const lo = Math.max(a, ra),
        hi = Math.min(b, rb);
      if (hi <= lo) continue;
      this.scheduleSegment(segs[si], lo, hi, ra);
    }
    // section onsets (impacts, crashes, risers) + reverse cymbals that END exactly at a drop
    const secs = this.show.tempo.sections;
    for (let i = 0; i < secs.length; i++) {
      const sec = secs[i];
      if (sec.start >= a && sec.start < b) this.sectionOnset(sec);
      if (sec.kind === 'build') {
        const nx = secs[i + 1];
        if (nx && isDropKind(nx.kind)) {
          const rs = sec.end - this.samples.reverseCrash.duration;
          if (rs >= a && rs < b) this.playBuffer(this.samples.reverseCrash, this.when(rs), 0.5, this.session!.fx);
        }
      }
    }
  }

  private scheduleSegment(seg: TempoSegment, lo: number, hi: number, segStartEff: number): void {
    const s = this.session!;
    const beat = 60 / seg.bpm;
    const step = beat / 4;
    const bpb = seg.beatsPerBar ?? 4;
    const spb = bpb * 4;
    const barLen = beat * bpb;
    if (Math.abs(s.delayBpm - seg.bpm) > 0.01) {
      s.delayBpm = seg.bpm;
      const w = Math.max(this.ctx.currentTime, this.when(lo));
      for (const [dl, mult] of this.delayTaps) dl.delayTime.setValueAtTime(beat * 0.75 * mult, w);
    }
    let k = Math.ceil((lo - seg.anchor) / step - 1e-7);
    for (let guard = 0; guard < 100000; guard++, k++) {
      const t = seg.anchor + k * step;
      if (t >= hi) break;
      if (t < lo - 1e-7) continue;
      const sec = this.sectionAt(t);
      if (!sec || sec.kind === 'silence') continue;
      const pos = ((k % spb) + spb) % spb;
      const bar = Math.floor(k / spb);
      this.step(seg, sec, t, pos, bar, beat, barLen, segStartEff);
    }
  }

  /** bar index (segment grid) at which a section's music starts */
  private sectionBar0(sec: Section, seg: TempoSegment, barLen: number, segStartEff: number): number {
    const start = Math.max(sec.start, segStartEff);
    return Math.round((start - seg.anchor) / barLen);
  }

  private kickActive(seg: TempoSegment, sec: Section, t: number, beat: number): boolean {
    if (!seg.kick || t < seg.start - 1e-6 || t >= seg.end) return false;
    if (sec.kind === 'silence') return false;
    return !this.preDropGap(sec, t, beat);
  }

  /** the classic silent last beat before a drop */
  private preDropGap(sec: Section, t: number, beat: number): boolean {
    if (sec.kind !== 'build') return false;
    if (t < sec.end - beat - 1e-4) return false;
    const nx = this.nextSection(sec);
    return !!nx && isDropKind(nx.kind);
  }

  private step(seg: TempoSegment, sec: Section, t: number, pos: number, bar: number, beat: number, barLen: number, segStartEff: number): void {
    const style = this.styleAt(t);
    const e = sec.energy;
    const rec = this.recipeFor(sec, style);
    const w = this.when(t);
    if (w < this.ctx.currentTime - 0.02) return; // late (tab was frozen): skip, never burst
    const bar0 = this.sectionBar0(sec, seg, barLen, segStartEff);
    const barIn = Math.max(0, bar - bar0);
    const slot = Math.floor(barIn / rec.barsPerChord);
    const degree = style.prog[slot % style.prog.length];
    const onBeat = pos % 4 === 0;
    const beatInBar = pos >> 2;
    const kick = this.kickActive(seg, sec, t, beat);
    const progress = Math.min(1, Math.max(0, (t - sec.start) / Math.max(0.001, sec.end - sec.start)));
    const gap = this.preDropGap(sec, t, beat);
    const build = sec.kind === 'build';

    const m = this.mute;
    if (kick && onBeat) this.duck(w, 0.72, beat);
    if (!m.has('drums')) this.drums(style, rec, sec, t, w, pos, kick, gap, progress, beat, barLen);

    // ---------------------------------------------------------------- bass
    if (rec.bass === 'reverse' && kick && pos % 4 === 2 && !m.has('bass')) {
      chordTones(style, degree, -1, this.tones);
      let note = this.tones[0];
      while (midiToHz(note) >= 105) note -= 12;
      while (midiToHz(note) < 52) note += 12;
      this.reverseBass(w, note, beat * 0.5 - 0.012, 0.36 + 0.12 * e);
    }

    // ---------------------------------------------------------------- chords (pads / strings / choir / subs)
    if (pos === 0 && barIn % rec.barsPerChord === 0) {
      const dur = Math.min(rec.barsPerChord * barLen, sec.end - t);
      if (dur > 0.05 && !m.has('pads')) this.chord(style, rec, degree, sec, w, dur, 0);
    }
    // stepped pad filter sweep during builds
    if (build && (rec.pad === 'saw' || rec.pad === 'soft') && pos % 2 === 0) this.padCut(w, 420 * Math.pow(16, progress));

    // ---------------------------------------------------------------- leads
    if (gap || m.has('leads')) return;
    const lead = rec.lead;
    if (lead === 'arp' || lead === 'both') {
      if (!build || progress > 0.35) {
        chordTones(style, degree, lead === 'both' ? 2 : 1, this.tones);
        const m = chordToneIndex(this.tones, style.arp[pos % style.arp.length]);
        const accent = onBeat ? 1 : pos % 2 === 0 ? 0.8 : 0.62;
        const lvl = (lead === 'both' ? 0.07 : 0.1) * accent * (build ? 0.4 + 0.6 * progress : 0.7 + 0.3 * e);
        const bright = build ? 0.12 + 0.88 * progress * progress : 0.55 + 0.45 * e;
        this.arpCutoff(w, 500 + 11000 * bright * bright);
        this.pluck(w, m, lvl);
      }
    }
    if ((lead === 'motif' || lead === 'both') && pos % 2 === 0) {
      const mi = ((barIn % 2) * 8 + (pos >> 1)) % style.motif.length;
      const ev = style.motif[mi];
      if (typeof ev === 'number') {
        chordTones(style, degree, 1, this.tones);
        this.supersawLead(w, chordToneIndex(this.tones, ev), this.motifLen(style, mi) * (beat / 2), 0.06 + 0.03 * e);
      }
    }
    if ((lead === 'bell' || lead === 'violin') && onBeat) {
      // half-speed motif on quarter notes
      const mi = ((barIn % 4) * 4 + beatInBar) % style.motif.length;
      const ev = style.motif[mi];
      if (typeof ev === 'number') {
        const len = this.motifLen(style, mi) * beat;
        chordTones(style, degree, 1, this.tones);
        const m = chordToneIndex(this.tones, ev);
        if (lead === 'bell') this.bell(w, m, len, 0.07 + 0.04 * e);
        else this.violinNote(w, m, len, 0.07 + 0.05 * e);
      }
    }
    if (lead === 'screech' && 'x--x--x-x--x-x--'[pos % 16] === 'x') {
      chordTones(style, degree, 1, this.tones);
      const m = this.tones[(hash32(bar * 16 + pos) & 3) === 0 ? 3 : 0];
      this.screechNote(w, m, beat * 0.4, 0.09 + 0.04 * e);
    }
    if (rec.ostinato && pos % 2 === 0) {
      chordTones(style, degree, 1, this.tones);
      this.ostinato(w, this.tones, beat * 0.42, (0.03 + 0.03 * e) * (onBeat ? 1 : 0.7));
    }
  }

  /** kick, clap, hats, build snare roll for one 16th step */
  private drums(style: Style, rec: KindRecipe, sec: Section, t: number, w: number, pos: number, kick: boolean, gap: boolean, progress: number, beat: number, barLen: number): void {
    const s = this.session!;
    const e = sec.energy;
    if (kick) {
      if (pos % 4 === 0) {
        const kb = this.samples.kicks.get(kickTailMidi(style.root)) ?? this.samples.kicks.values().next().value!;
        this.playBuffer(kb, w, 0.62 + 0.1 * e, s.drums);
        if (rec.clap && (pos >> 2) % 2 === 1) this.playBuffer(this.samples.clap, w, 0.26 + 0.1 * e, s.drums);
      }
      if (rec.hats >= 1 && pos % 4 === 2) this.playBuffer(this.samples.hatOpen, w, 0.11 + 0.05 * e, s.drums);
      if (rec.hats >= 2 && pos % 2 === 1 && !this.lite) this.playBuffer(this.samples.hatClosed, w, pos % 4 === 3 ? 0.08 : 0.05, s.drums);
    }
    // build: snare roll accelerating towards the drop
    if (sec.kind === 'build' && !gap) {
      const barsLeft = (sec.end - t) / barLen;
      const div = barsLeft > 8 ? 4 : barsLeft > 4 ? 2 : 1;
      if (pos % div === 0) {
        const v = 0.1 + 0.32 * progress * progress;
        const rate = 1 + 0.45 * progress;
        this.playBuffer(this.samples.snare, w, v, s.drums, rate);
        if (barsLeft <= 1.001 && !this.lite) this.playBuffer(this.samples.snare, w + beat / 8, v * 0.85, s.drums, rate);
      }
    }
  }

  /** length (in motif steps) of the note starting at motif index mi (follows '~' ties) */
  private motifLen(style: Style, mi: number): number {
    let n = 1;
    const m = style.motif;
    while (n < m.length && m[(mi + n) % m.length] === '~') n++;
    return n;
  }

  private sectionOnset(sec: Section): void {
    if (this.mute.has('fx')) return;
    const s = this.session!;
    const w = this.when(sec.start);
    if (w < this.ctx.currentTime - 0.02) return;
    const e = sec.energy;
    if (isDropKind(sec.kind)) {
      this.playBuffer(this.samples.impact, w, 0.42 + 0.25 * e, s.fx);
      this.playBuffer(this.samples.crash, w, 0.3 + 0.15 * e, s.fx);
    } else if (sec.kind === 'orchestral' || sec.kind === 'intro') {
      const st = this.styleAt(sec.start);
      this.playBuffer(this.samples.timpani, w, 0.45, s.fx, Math.pow(2, ((((st.root % 12) + 12) % 12) - 9) / 12));
      if (e > 0.3) this.playBuffer(this.samples.crash, w, 0.12, s.fx);
    } else if (sec.kind !== 'silence' && sec.kind !== 'build' && e >= 0.3) {
      this.playBuffer(this.samples.crash, w, 0.14 + 0.1 * e, s.fx);
    }
    if (sec.kind === 'build') this.riser(w, sec.end - sec.start, 0, sec.energy);
  }

  /** start sustained voices that should already be sounding at t0 (seek / play mid-note) */
  private catchUp(t0: number): void {
    const sec = this.sectionAt(t0);
    if (!sec || sec.kind === 'silence') return;
    const segs = this.show.tempo.segments;
    if (!segs.length) return;
    const seg = this.show.tempo.segmentAt(t0);
    const [ra] = this.segRange(Math.max(0, segs.indexOf(seg)));
    const beat = 60 / seg.bpm;
    const barLen = beat * (seg.beatsPerBar ?? 4);
    const style = this.styleAt(t0);
    const rec = this.recipeFor(sec, style);
    const bar = Math.floor((t0 - seg.anchor) / barLen + 1e-7);
    const bar0 = this.sectionBar0(sec, seg, barLen, ra);
    const barIn = Math.max(0, bar - bar0);
    const chordBar = bar0 + Math.floor(barIn / rec.barsPerChord) * rec.barsPerChord;
    const chordT = Math.max(sec.start, seg.anchor + chordBar * barLen);
    const offset = t0 - chordT;
    const s = this.session!;
    if (offset > 0.02) {
      const dur = Math.min(rec.barsPerChord * barLen, sec.end - chordT);
      if (dur - offset > 0.1) {
        const degree = style.prog[Math.floor(barIn / rec.barsPerChord) % style.prog.length];
        if (sec.kind === 'build') this.padCut(s.ctxStart, 420 * Math.pow(16, (t0 - sec.start) / Math.max(0.001, sec.end - sec.start)));
        this.chord(style, rec, degree, sec, s.ctxStart, dur, offset);
      }
    }
    if (sec.kind === 'build') {
      const off = t0 - sec.start;
      if (off > 0.05 && sec.end - t0 > 0.2) this.riser(s.ctxStart, sec.end - sec.start, off, sec.energy);
    }
  }

  // ------------------------------------------------------------------ voices

  private playBuffer(buf: AudioBuffer, when: number, gain: number, dest: AudioNode, rate = 1): void {
    const ctx = this.ctx;
    if (when < ctx.currentTime) when = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (rate !== 1) src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(dest);
    src.start(when);
    this.track(src, when + buf.duration / rate + 0.05);
  }

  /** sidechain pump on the pad bus */
  private duck(when: number, depth: number, beat: number): void {
    const s = this.session!;
    if (when <= s.lastDuck) return;
    s.lastDuck = when;
    const p = s.padDuck.gain;
    p.setTargetAtTime(1 - depth, when, 0.003);
    p.setTargetAtTime(1, when + 0.035, beat * 0.22);
  }

  private padCut(when: number, hz: number): void {
    const s = this.session!;
    if (when < s.lastPadCut) return;
    s.lastPadCut = when;
    s.padFilterL.frequency.setValueAtTime(hz, when);
    s.padFilterR.frequency.setValueAtTime(hz, when);
  }

  private arpCutoff(when: number, hz: number): void {
    const s = this.session!;
    if (Math.abs(hz - s.arpCut) / s.arpCut < 0.03 || when < s.lastArpCut) return;
    s.arpCut = hz;
    s.lastArpCut = when;
    s.arpFilter.frequency.setValueAtTime(hz, when);
  }

  /** reverse bass: swells from the offbeat into the next kick (dark -> bright), then cuts */
  private reverseBass(when: number, midi: number, dur: number, vel: number): void {
    const s = this.session!;
    const ctx = this.ctx;
    const hz = midiToHz(midi);
    const env = ctx.createGain();
    env.gain.setValueAtTime(NOTE_OFF, when);
    env.gain.exponentialRampToValueAtTime(vel, when + dur * 0.9);
    env.gain.linearRampToValueAtTime(0, when + dur);
    const dark = ctx.createGain();
    dark.gain.setValueAtTime(1, when);
    dark.gain.linearRampToValueAtTime(0.15, when + dur * 0.9);
    const bright = ctx.createGain();
    bright.gain.setValueAtTime(0, when);
    bright.gain.linearRampToValueAtTime(1, when + dur * 0.9);
    env.connect(dark).connect(s.bassDark);
    env.connect(bright).connect(s.bassBright);
    this.osc('sawtooth', hz, 0, when, dur + 0.02, env);
    this.osc('sine', hz, 0, when, dur + 0.02, env);
  }

  private chord(style: Style, rec: KindRecipe, degree: number, sec: Section, when: number, dur: number, offset: number): void {
    const s = this.session!;
    const e = sec.energy;
    const remain = dur - offset;
    if (remain <= 0.05) return;
    const fadeIn = offset > 0 ? 0.04 : 0;
    if ((rec.pad === 'saw' || rec.pad === 'soft') && sec.kind !== 'build') {
      const base = rec.pad === 'soft' ? 700 + 1800 * rec.bright : 900 + 6500 * rec.bright * rec.bright;
      this.padCut(when, base * (0.65 + 0.35 * e));
    }
    switch (rec.pad) {
      case 'saw':
      case 'soft': {
        chordTones(style, degree, 1, this.tones);
        const soft = rec.pad === 'soft';
        const lvl = (soft ? 0.05 : 0.042) * (0.6 + 0.4 * e);
        const atk = soft ? 0.35 : sec.kind === 'build' ? 0.05 : 0.012;
        const rel = soft ? 0.9 : 0.22;
        const envL = this.env(when, remain, lvl, fadeIn || atk, rel);
        const envR = this.env(when, remain, lvl, fadeIn || atk, rel);
        envL.connect(s.padFilterL);
        envR.connect(s.padFilterR);
        const det = 7 + style.flavour * 9;
        const t = this.tones;
        for (let i = 0; i < 5; i++) {
          const midi = i === 0 ? t[0] - 12 : t[i - 1];
          const hz = midiToHz(midi);
          const type: OscillatorType = soft && i > 0 ? 'triangle' : 'sawtooth';
          if (this.lite) this.osc(type, hz, i % 2 ? det : -det, when, remain + rel, i % 2 ? envR : envL);
          else {
            this.osc(type, hz, -det, when, remain + rel, envL);
            this.osc(type, hz, det, when, remain + rel, envR);
          }
        }
        break;
      }
      case 'strings': {
        chordTones(style, degree, 0, this.tones);
        chordTones(style, degree, 1, this.tones2);
        const lvl = 0.05 * (0.55 + 0.45 * e);
        const env = this.env(when, remain, lvl, fadeIn || 0.45, 1.1);
        env.connect(s.strings);
        const notes = [this.tones[0] - 12, this.tones[0], this.tones2[1], this.tones2[2], this.tones2[3]];
        for (let i = 0; i < notes.length; i++) {
          const hz = midiToHz(notes[i]);
          this.osc('sawtooth', hz, -6, when, remain + 1.1, env);
          if (!this.lite) this.osc('sawtooth', hz, 7, when, remain + 1.1, env);
        }
        break;
      }
      case 'choir': {
        chordTones(style, degree, 1, this.tones);
        const env = this.env(when, remain, 0.055 * (0.6 + 0.4 * e), fadeIn || 0.5, 1.0);
        env.connect(s.choir);
        for (let i = 0; i < 4; i++) {
          const hz = midiToHz(this.tones[i]);
          this.osc('sawtooth', hz, -8, when, remain + 1, env);
          if (!this.lite) this.osc('sawtooth', hz, 8, when, remain + 1, env);
        }
        break;
      }
      default:
        break;
    }
    // sustained bass under the chord
    if (rec.bass === 'sub' || rec.bass === 'cello') {
      chordTones(style, degree, -1, this.tones);
      let m = this.tones[0];
      while (midiToHz(m) >= 90) m -= 12;
      while (midiToHz(m) < 40) m += 12;
      const hz = midiToHz(m);
      if (rec.bass === 'sub') {
        const env = this.env(when, remain, 0.2 * (0.6 + 0.4 * e), fadeIn || 0.08, 0.4);
        env.connect(s.sub);
        this.osc('sine', hz, 0, when, remain + 0.4, env);
      } else {
        const env = this.env(when, remain, 0.06, fadeIn || 0.3, 0.8);
        env.connect(s.strings);
        this.osc('sawtooth', hz, -5, when, remain + 0.8, env);
        this.osc('sawtooth', hz * 2, 6, when, remain + 0.8, env);
      }
    }
  }

  /** ADSR-ish gain envelope (attack, sustain until when+dur, release) */
  private env(when: number, dur: number, level: number, attack: number, release: number): GainNode {
    const g = this.ctx.createGain();
    const p = g.gain;
    p.setValueAtTime(0, when);
    p.linearRampToValueAtTime(level, when + Math.min(attack, dur));
    p.setValueAtTime(level, when + dur);
    p.setTargetAtTime(0, when + dur, release / 4);
    return g;
  }

  private osc(type: OscillatorType, hz: number, detune: number, when: number, dur: number, dest: AudioNode): OscillatorNode {
    const o = this.oscRaw(type, hz, detune, when, dur);
    o.connect(dest);
    return o;
  }

  /** started + tracked oscillator, not connected */
  private oscRaw(type: OscillatorType, hz: number, detune: number, when: number, dur: number): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = hz;
    if (detune) o.detune.value = detune;
    o.start(when);
    o.stop(when + dur);
    this.track(o, when + dur + 0.02);
    return o;
  }

  /** euphoric arp pluck (pre-rendered multi-sample, brightness via the session arp filter) */
  private pluck(when: number, midi: number, vel: number): void {
    const { buf, rate } = pluckFor(this.samples, midi);
    this.playBuffer(buf, when, vel, this.session!.arp, rate);
  }

  private supersawLead(when: number, midi: number, len: number, vel: number): void {
    const s = this.session!;
    const hz = midiToHz(midi);
    const env = this.env(when, Math.max(0.05, len - 0.03), vel, 0.006, 0.12);
    env.connect(s.leadTone);
    if (this.lite) {
      this.osc('sawtooth', hz, -12, when, len + 0.15, env);
      this.osc('sawtooth', hz, 12, when, len + 0.15, env);
    } else {
      this.osc('sawtooth', hz, -16, when, len + 0.15, env);
      this.osc('sawtooth', hz, 0, when, len + 0.15, env);
      this.osc('sawtooth', hz, 16, when, len + 0.15, env);
      this.osc('square', hz / 2, 3, when, len + 0.15, env);
    }
  }

  /** FM bell / electric piano */
  private bell(when: number, midi: number, len: number, vel: number): void {
    const s = this.session!;
    const ctx = this.ctx;
    const hz = midiToHz(midi);
    const dec = Math.max(1.2, len + 0.6);
    const car = this.oscRaw('sine', hz, 0, when, dec + 0.02);
    const mod = this.oscRaw('sine', hz * 3.5, 0, when, dec + 0.02);
    const idx = ctx.createGain();
    idx.gain.setValueAtTime(hz * 2.2, when);
    idx.gain.exponentialRampToValueAtTime(hz * 0.15, when + 0.9);
    mod.connect(idx).connect(car.frequency);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(vel, when + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0005, when + dec);
    car.connect(env).connect(s.lead);
  }

  private violinNote(when: number, midi: number, len: number, vel: number): void {
    const s = this.session!;
    const hz = midiToHz(midi);
    const env = this.env(when, Math.max(0.1, len - 0.05), vel, 0.14, 0.3);
    env.connect(s.violin);
    this.osc('sawtooth', hz, -4, when, len + 0.4, env);
    if (!this.lite) this.osc('sawtooth', hz, 5, when, len + 0.4, env);
  }

  private screechNote(when: number, midi: number, len: number, vel: number): void {
    const s = this.session!;
    const ctx = this.ctx;
    const hz = midiToHz(midi);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(vel, when + 0.004);
    env.gain.setValueAtTime(vel, when + len * 0.7);
    env.gain.linearRampToValueAtTime(0, when + len);
    env.connect(s.screech);
    const o = this.osc('square', hz, 0, when, len + 0.02, env);
    o.frequency.setValueAtTime(hz * 1.5, when);
    o.frequency.exponentialRampToValueAtTime(hz, when + 0.05);
    o.frequency.exponentialRampToValueAtTime(hz * 0.94, when + len);
  }

  /** "shivering" repeated staccato string chords */
  private ostinato(when: number, tones: number[], len: number, vel: number): void {
    const s = this.session!;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(vel, when + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0005, when + len);
    env.connect(s.strings);
    for (let i = 0; i < 3; i++) this.osc('sawtooth', midiToHz(tones[i]), i * 4 - 4, when, len + 0.02, env);
  }

  /** noise riser over a build (supports starting mid-way: `offset` seconds into it) */
  private riser(when: number, dur: number, offset: number, energy: number): void {
    const s = this.session!;
    const ctx = this.ctx;
    const rem = dur - offset;
    if (rem <= 0.05) return;
    const p0 = offset / dur;
    const fOf = (p: number) => 260 * Math.pow(30, p);
    const src = ctx.createBufferSource();
    src.buffer = this.samples.noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    // stepped sweep (cheap: coefficients only recomputed at each step)
    const steps = Math.max(2, Math.ceil(rem / 0.06));
    for (let i = 0; i < steps; i++) {
      const k = i / (steps - 1);
      bp.frequency.setValueAtTime(fOf(p0 + (1 - p0) * k), when + rem * k * 0.999);
    }
    const g = ctx.createGain();
    const n = 24;
    const curve = new Float32Array(n);
    const peak = 0.16 + 0.12 * energy;
    for (let i = 0; i < n; i++) {
      const p = p0 + (1 - p0) * (i / (n - 1));
      curve[i] = 0.004 + peak * p * p * p;
    }
    g.gain.setValueAtTime(curve[0], when);
    g.gain.setValueCurveAtTime(curve, when + 0.001, Math.max(0.01, rem - 0.02));
    src.connect(bp).connect(g).connect(s.fx);
    src.start(when);
    src.stop(when + rem);
    this.track(src, when + rem + 0.05);
  }
}

function isDropKind(k: SectionKind): boolean {
  return k === 'drop' || k === 'climax' || k === 'anticlimax';
}
