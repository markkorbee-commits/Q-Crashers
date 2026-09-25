/**
 * Tempo / phase / structure analysis of the Endshow audio (pure DSP, no DOM, no runtime imports:
 * runs in the Web Worker, on the main thread as a fallback, and in Node for tests).
 *
 * Pipeline (input: mono PCM, typically 11025 Hz):
 *  1. full-band energy (50 Hz frames) + a high-frequency "transient" energy (first difference,
 *     1.45 ms frames) — computed before the signal is filtered in place.
 *  2. zero-phase 40–160 Hz band-pass (biquads forward + backward: no group delay) -> low-band
 *     energy at 1.45 ms frames -> log-compressed centred-difference novelty (kick onsets).
 *  3. global offset: cross-correlate the authored "where is there a kick" template with the
 *     measured kick density (±20 s), then refine to the millisecond on the first kick segment.
 *  4. per authored kick segment: comb-filter search over BPM (±1.5 in 0.05 steps, then 0.005)
 *     by folding the onset envelope onto one beat period (a phase histogram = the comb response
 *     at every phase at once); the sharpest fold wins. The phase is then pulled to the kick's
 *     broadband transient (the low band lags the click by the kick's pitch sweep).
 *  5. section boundaries: largest matching energy jump within ±6 s of each authored start.
 */
import type { Section, TempoSegment } from '../show/ShowTypes';

export interface AnalysisInput {
  samples: Float32Array;
  sampleRate: number;
  tempo: TempoSegment[];
  sections: Section[];
  showDuration: number;
  /** current audio offset (audio time = show time + offset); the estimate is relative to it */
  baseOffset?: number;
  /** skip the global offset estimation and use baseOffset as-is */
  fixedOffset?: boolean;
}

export interface SegmentReport {
  index: number;
  start: number;
  end: number;
  kick: boolean;
  authoredBpm: number;
  authoredAnchor: number;
  bpm: number;
  anchor: number;
  /** fold sharpness (peak / mean); >= 4 = clear pulse (noise ~2.6, hardstyle kicks 8-20) */
  confidence: number;
  refined: boolean;
  /** did the transient (click) refinement move the phase */
  transient: boolean;
  note?: string;
}

export interface SectionReport {
  index: number;
  label: string;
  kind: string;
  authored: number;
  detected: number | null;
  delta: number | null;
  /** 0..1 */
  confidence: number;
}

export interface AnalysisResult {
  format: 'endshow-analysis';
  version: 1;
  created: string;
  tool: string;
  file: { name: string; size: number; duration: number };
  showId?: string;
  /** hash of the authored tempo + sections the analysis was made against */
  authoredHash: string;
  sampleRate: number;
  frameRate: number;
  /** audio time = show time + offset */
  offset: number;
  offsetConfidence: number;
  offsetMethod: 'none' | 'fixed' | 'xcorr';
  tempo: TempoSegment[];
  segments: SegmentReport[];
  sections: SectionReport[];
  timings: Record<string, number>;
}

export type ProgressFn = (p: number, stage: string) => void;

const FINE_HOP = 16;
const COARSE_RATE = 50;
const BINS = 256;

// ------------------------------------------------------------------------------------ filters

interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

function biquad(type: 'lowpass' | 'highpass', f: number, sr: number, q = Math.SQRT1_2): Biquad {
  const w = (2 * Math.PI * f) / sr;
  const cw = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  if (type === 'lowpass') {
    const b = (1 - cw) / 2;
    return { b0: b / a0, b1: (1 - cw) / a0, b2: b / a0, a1: (-2 * cw) / a0, a2: (1 - alpha) / a0 };
  }
  const b = (1 + cw) / 2;
  return { b0: b / a0, b1: -(1 + cw) / a0, b2: b / a0, a1: (-2 * cw) / a0, a2: (1 - alpha) / a0 };
}

/** in-place biquad, forward (dir 1) or backward (dir -1) */
function runBiquad(x: Float32Array, c: Biquad, dir: 1 | -1): void {
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  const { b0, b1, b2, a1, a2 } = c;
  const n = x.length;
  for (let k = 0; k < n; k++) {
    const i = dir === 1 ? k : n - 1 - k;
    const xi = x[i];
    const y = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = xi;
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
}

// ------------------------------------------------------------------------------------ helpers

function mean(a: ArrayLike<number>, from = 0, to = a.length): number {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i];
  return to > from ? s / (to - from) : 0;
}

/** log-compressed energy -> centred positive difference (onset novelty) */
function novelty(e: Float32Array, k: number): Float32Array {
  const n = e.length;
  const m = mean(e) || 1e-12;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = Math.log1p((100 * e[i]) / m);
  // light symmetric smoothing
  const s = new Float32Array(n);
  for (let i = 1; i < n - 1; i++) s[i] = 0.25 * c[i - 1] + 0.5 * c[i] + 0.25 * c[i + 1];
  const out = new Float32Array(n);
  for (let i = k; i < n - k; i++) {
    const d = s[i + k] - s[i - k];
    out[i] = d > 0 ? d : 0;
  }
  return out;
}

/** circular triangular smoothing of a histogram (radius r bins) */
function smoothCirc(h: Float64Array, r: number, out: Float64Array): Float64Array {
  const n = h.length;
  for (let i = 0; i < n; i++) {
    let s = 0,
      w = 0;
    for (let j = -r; j <= r; j++) {
      const wt = r + 1 - Math.abs(j);
      s += h[(i + j + n) % n] * wt;
      w += wt;
    }
    out[i] = s / w;
  }
  return out;
}

interface Fold {
  score: number;
  /** phase in seconds [0, period) of the smoothed maximum (sub-bin interpolated) */
  phase: number;
  hist: Float64Array;
}

/**
 * Fold the novelty `nov` (frames at `fr` Hz) inside [a, b) seconds onto one period of `bpm`
 * relative to `ref` seconds. Returns sharpness score + peak phase.
 */
function fold(nov: Float32Array, fr: number, a: number, b: number, bpm: number, ref: number, hist: Float64Array, sm: Float64Array, radius = 3): Fold {
  hist.fill(0);
  const period = 60 / bpm;
  const i0 = Math.max(0, Math.ceil(a * fr));
  const i1 = Math.min(nov.length, Math.floor(b * fr));
  const invP = 1 / period;
  for (let i = i0; i < i1; i++) {
    const v = nov[i];
    if (v === 0) continue;
    let ph = (i / fr - ref) * invP;
    ph -= Math.floor(ph);
    const bin = (ph * BINS) | 0;
    hist[bin] += v;
  }
  smoothCirc(hist, radius, sm);
  let best = 0,
    bi = 0,
    tot = 0;
  for (let i = 0; i < BINS; i++) {
    tot += sm[i];
    if (sm[i] > best) {
      best = sm[i];
      bi = i;
    }
  }
  const avg = tot / BINS || 1e-12;
  // parabolic interpolation of the peak
  const l = sm[(bi - 1 + BINS) % BINS],
    r = sm[(bi + 1) % BINS];
  const den = l - 2 * best + r;
  const off = den < 0 ? (0.5 * (l - r)) / den : 0;
  const phase = (((bi + 0.5 + off) / BINS + 1) % 1) * period;
  return { score: best / avg, phase, hist: sm };
}

function median(a: number[]): number {
  const s = [...a].sort((p, q) => p - q);
  const n = s.length;
  if (!n) return 0;
  return n % 2 ? s[n >> 1] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
}

function wrapHalf(x: number, period: number): number {
  let y = x % period;
  if (y > period / 2) y -= period;
  if (y < -period / 2) y += period;
  return y;
}

const KIND_KICK_WEIGHT: Record<string, number> = {
  drop: 1,
  climax: 1,
  anticlimax: 1,
  build: 0.7,
  vocal: 0.6,
  intro: 0.45,
  outro: 0.45,
  breakdown: 0.15,
  orchestral: 0.1,
  silence: 0,
};

export function authoredHash(tempo: TempoSegment[], sections: Section[]): string {
  const s = JSON.stringify([tempo.map((t) => [t.start, t.end, t.bpm, t.anchor, t.kick]), sections.map((x) => [x.start, x.end, x.kind])]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ------------------------------------------------------------------------------------ main

export function analyzeAudio(input: AnalysisInput, progress: ProgressFn = () => {}): AnalysisResult {
  const timings: Record<string, number> = {};
  let tMark = now();
  const mark = (name: string) => {
    const t = now();
    timings[name] = Math.round(t - tMark);
    tMark = t;
  };
  const x = input.samples;
  const sr = input.sampleRate;
  const n = x.length;
  const duration = n / sr;
  const fr = sr / FINE_HOP;
  const nFine = Math.floor(n / FINE_HOP);
  const coarseHop = Math.max(1, Math.round(sr / COARSE_RATE));
  const cr = sr / coarseHop;
  const nCoarse = Math.floor(n / coarseHop);

  // 1. full-band coarse energy + HF transient energy (fine), before filtering in place
  progress(0.02, 'energy');
  const eFull = new Float32Array(nCoarse);
  for (let j = 0; j < nCoarse; j++) {
    let s = 0;
    const a = j * coarseHop;
    for (let k = 0; k < coarseHop; k++) s += x[a + k] * x[a + k];
    eFull[j] = s / coarseHop;
  }
  const eHF = new Float32Array(nFine);
  {
    const half = FINE_HOP;
    for (let i = 0; i < nFine; i++) {
      const c = i * FINE_HOP;
      const a = Math.max(1, c - half);
      const b = Math.min(n, c + half);
      let s = 0;
      for (let k = a; k < b; k++) {
        const d = x[k] - x[k - 1];
        s += d * d;
      }
      eHF[i] = s;
    }
  }
  mark('energy');

  // 2. zero-phase low band
  progress(0.2, 'filter');
  const hp = biquad('highpass', 40, sr);
  const lp = biquad('lowpass', 160, sr);
  runBiquad(x, hp, 1);
  runBiquad(x, lp, 1);
  progress(0.32, 'filter');
  runBiquad(x, lp, -1);
  runBiquad(x, hp, -1);
  mark('filter');
  progress(0.45, 'onsets');
  // centred ±12 ms sliding window: longer than a 40 Hz period, so steady bass tones give a flat
  // envelope (a short window ripples with the waveform and can fold coherently onto the beat)
  const eLow = new Float32Array(nFine);
  {
    const W = Math.round(0.012 * sr);
    let s = 0;
    let lo = 0,
      hi = 0; // window [lo, hi)
    for (let i = 0; i < nFine; i++) {
      const c = i * FINE_HOP;
      const a = Math.max(0, c - W);
      const b = Math.min(n, c + W);
      if ((i & 4095) === 0) {
        // exact recompute now and then (no float drift)
        s = 0;
        for (let k = a; k < b; k++) s += x[k] * x[k];
      } else {
        while (hi < b) {
          s += x[hi] * x[hi];
          hi++;
        }
        while (lo < a) {
          s -= x[lo] * x[lo];
          lo++;
        }
      }
      lo = a;
      hi = b;
      eLow[i] = s > 0 ? s : 0;
    }
  }
  const novLow = novelty(eLow, 3);
  const novHF = novelty(eHF, 1);
  // coarse low-band energy
  const eLowC = new Float32Array(nCoarse);
  const per = coarseHop / FINE_HOP;
  for (let j = 0; j < nCoarse; j++) {
    const a = Math.floor(j * per),
      b = Math.min(nFine, Math.floor((j + 1) * per));
    let s = 0;
    for (let i = a; i < b; i++) s += eLow[i];
    eLowC[j] = s / Math.max(1, b - a) / (2 * FINE_HOP);
  }
  mark('onsets');

  const tempo = input.tempo.map((t) => ({ ...t }));
  const base = input.baseOffset ?? 0;
  const hist = new Float64Array(BINS);
  const sm = new Float64Array(BINS);

  // 3. global offset
  progress(0.55, 'offset');
  let offset = base;
  let offsetConfidence = 0;
  let offsetMethod: AnalysisResult['offsetMethod'] = input.fixedOffset ? 'fixed' : 'none';
  if (!input.fixedOffset) {
    // (a) coarse: kick-density template cross-correlation (±20 s, 100 ms steps)
    const est = estimateOffset(novLow, fr, input, base, duration);
    const lag = est && (est.accept || est.candidate) ? est.lag : 0;
    offsetConfidence = est?.confidence ?? 0;
    // (b) section boundaries (sharp energy jumps, typically ±50 ms) around the coarse guess:
    //     their median shift refines the offset when they agree with each other (small MAD)
    const pre = detectSections(eFull, eLowC, cr, input.sections, base + lag, [], lag !== 0 ? 2.5 : 6);
    const ds = pre.filter((r) => r.delta !== null && r.confidence >= 0.5).map((r) => r.delta!);
    let refined: number | null = null;
    if (ds.length >= 3) {
      const md = median(ds);
      const mad = median(ds.map((d) => Math.abs(d - md)));
      if (mad <= 0.12) refined = lag + md;
    }
    if (refined !== null && Math.abs(refined) >= 0.04 && (est?.accept || est?.candidate || ds.length >= 4)) {
      offset = base + refined;
      offsetMethod = 'xcorr';
    } else if (est?.accept) {
      offset = base + lag;
      offsetMethod = 'xcorr';
    }
  }
  mark('offset');

  // 4. per-segment tempo + phase (phases relative to authored anchor + current offset)
  const segments: SegmentReport[] = [];
  const phases: number[] = [];
  for (let si = 0; si < tempo.length; si++) {
    progress(0.6 + (0.3 * si) / Math.max(1, tempo.length), 'tempo');
    const seg = tempo[si];
    const rep: SegmentReport = {
      index: si,
      start: seg.start,
      end: seg.end,
      kick: seg.kick,
      authoredBpm: seg.bpm,
      authoredAnchor: seg.anchor,
      bpm: seg.bpm,
      anchor: seg.anchor,
      confidence: 0,
      refined: false,
      transient: false,
    };
    segments.push(rep);
    if (!seg.kick) {
      rep.note = 'no kick: authored grid kept';
      continue;
    }
    const a = Math.max(0, seg.start + offset);
    const b = Math.min(duration, seg.end + offset);
    if (b - a < 4) {
      rep.note = 'segment outside the audio or too short';
      continue;
    }
    const ref = seg.anchor + offset;
    // coarse search ±1.5 BPM in 0.05 steps
    let bestBpm = seg.bpm,
      bestScore = -1;
    for (let k = -30; k <= 30; k++) {
      const bpm = seg.bpm + k * 0.05;
      const f = fold(novLow, fr, a, b, bpm, ref, hist, sm);
      if (f.score > bestScore) {
        bestScore = f.score;
        bestBpm = bpm;
      }
    }
    // fine search ±0.06 in 0.005 steps
    const center = bestBpm;
    for (let k = -12; k <= 12; k++) {
      const bpm = center + k * 0.005;
      const f = fold(novLow, fr, a, b, bpm, ref, hist, sm, 2);
      if (f.score > bestScore) {
        bestScore = f.score;
        bestBpm = bpm;
      }
    }
    const f = fold(novLow, fr, a, b, bestBpm, ref, hist, sm, 2);
    rep.confidence = +f.score.toFixed(2);
    if (f.score < 4) {
      rep.note = 'no clear pulse: authored grid kept';
      continue;
    }
    if (Math.abs(bestBpm - seg.bpm) > 1.45) {
      rep.note = 'best tempo at the edge of the search range: authored grid kept';
      continue;
    }
    let period = 60 / bestBpm;
    const tr = transientPhase(novHF, fr, a, b, bestBpm, ref, f.phase);
    let phase = wrapHalf(tr ?? f.phase, period);
    // per-beat onsets + least-squares line fit: exact period and phase
    const fit = regressBeats(tr !== null ? novHF : novLow, fr, a, b, ref + phase, period);
    if (fit && Math.abs(fit.period - period) < period * 0.0008) {
      period = fit.period;
      bestBpm = 60 / period;
      phase = wrapHalf(fit.t0 - ref, period);
      rep.note = `${fit.n} beats fitted, rms ${(fit.rms * 1000).toFixed(1)} ms`;
    }
    phases[si] = phase;
    rep.transient = tr !== null;
    rep.bpm = +bestBpm.toFixed(4);
    rep.refined = true;
  }
  // the coarse (100 ms) offset gets its millisecond part from the median phase over all kick
  // segments: robust against a single imprecise authored anchor
  if (offsetMethod === 'xcorr') {
    const ph = segments.filter((r) => r.refined).map((r) => phases[r.index]);
    if (ph.length) {
      const sorted = [...ph].sort((p, q) => p - q);
      const fine = sorted.length % 2 ? sorted[sorted.length >> 1] : 0.5 * (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]);
      offset += fine;
      for (const r of segments) if (r.refined) phases[r.index] -= fine;
    }
  }
  for (const rep of segments) {
    if (!rep.refined) continue;
    const seg = tempo[rep.index];
    rep.anchor = +(seg.anchor + phases[rep.index]).toFixed(4);
    seg.bpm = rep.bpm;
    seg.anchor = rep.anchor;
    seg.source = 'analyzed';
  }
  mark('tempo');

  // 5. section boundaries (report only)
  progress(0.93, 'sections');
  const sections = detectSections(eFull, eLowC, cr, input.sections, offset, tempo);
  mark('sections');
  progress(1, 'done');

  return {
    format: 'endshow-analysis',
    version: 1,
    created: new Date().toISOString(),
    tool: 'browser (analysisCore v1)',
    file: { name: '', size: 0, duration: +duration.toFixed(3) },
    authoredHash: authoredHash(input.tempo, input.sections),
    sampleRate: sr,
    frameRate: +fr.toFixed(3),
    offset: +offset.toFixed(4),
    offsetConfidence: +offsetConfidence.toFixed(3),
    offsetMethod,
    tempo,
    segments,
    sections,
    timings,
  };
}

/**
 * The low band peaks after the kick's click (pitch sweep). Find the broadband transient in the
 * 45 ms before the low-band phase; returns its phase (s, relative to ref) or null.
 *
 * The HF onsets are folded into 4 interleaved beat classes and combined with a per-bin MINIMUM:
 * only features present on EVERY beat survive (the kick click) — claps / snares on 2 and 4 and
 * offbeat hats drop out. Each surviving peak is scored by its rise over a 3..10 ms pre-window
 * (beyond its own attack flank; the kick follows the sidechain dip / reverse-bass cut) and the
 * EARLIEST peak with >= 35 % of the best rise wins.
 */
function transientPhase(novHF: Float32Array, fr: number, a: number, b: number, bpm: number, ref: number, lowPhase: number): number | null {
  const period = 60 / bpm;
  const sub = [0, 1, 2, 3].map(() => new Float64Array(BINS));
  const i0 = Math.max(0, Math.ceil(a * fr));
  const i1 = Math.min(novHF.length, Math.floor(b * fr));
  const invP = 1 / period;
  for (let i = i0; i < i1; i++) {
    const v = novHF[i];
    if (v === 0) continue;
    const x = (i / fr - ref) * invP;
    const k = Math.floor(x);
    sub[((k % 4) + 4) % 4][((x - k) * BINS) | 0] += v;
  }
  const sm = new Float64Array(BINS);
  const h = new Float64Array(BINS).fill(Infinity);
  for (const s of sub) {
    smoothCirc(s, 1, sm);
    for (let i = 0; i < BINS; i++) h[i] = Math.min(h[i], sm[i]);
  }
  const binOf = (ph: number) => Math.floor(((((ph / period) % 1) + 1) % 1) * BINS);
  const lo = binOf(lowPhase - 0.045);
  const span = Math.ceil((0.05 / period) * BINS);
  let best = -1,
    bi = -1;
  for (let k = 0; k <= span; k++) {
    const i = (lo + k) % BINS;
    if (h[i] > best) {
      best = h[i];
      bi = i;
    }
  }
  const sorted = Array.from(h).sort((p, q) => p - q);
  const med = sorted[BINS >> 1] || 1e-12;
  if (bi < 0 || best < med * 3) return null;
  const pre0 = Math.max(1, Math.round((0.003 / period) * BINS));
  const pre1 = Math.max(pre0 + 1, Math.round((0.010 / period) * BINS));
  const cand: number[] = [];
  const rises: number[] = [];
  let bestRise = -Infinity;
  for (let k = 0; k <= span; k++) {
    const i = (lo + k) % BINS;
    const v = h[i];
    if (v < 0.2 * best || v < h[(i - 1 + BINS) % BINS] || v < h[(i + 1) % BINS]) continue;
    let pre = 0;
    for (let j = pre0; j <= pre1; j++) pre = Math.max(pre, h[(i - j + BINS) % BINS]);
    cand.push(i);
    rises.push(v - pre);
    bestRise = Math.max(bestRise, v - pre);
  }
  // a kick's attack can hold several bursts (click, then the distorted pitch sweep a few ms
  // later): take the EARLIEST one with a comparable rise = the perceived onset
  for (let c = 0; c < cand.length; c++) {
    if (rises[c] >= 0.35 * bestRise) {
      bi = cand[c];
      break;
    }
  }
  best = h[bi];
  const l = h[(bi - 1 + BINS) % BINS],
    r = h[(bi + 1) % BINS];
  const den = l - 2 * best + r;
  const off = den < 0 ? (0.5 * (l - r)) / den : 0;
  return (((bi + 0.5 + off) / BINS + 1) % 1) * period;
}

/**
 * Beat tracker + least-squares line fit for the exact period/phase of a kick segment.
 * Starting at the segment centre and walking outwards, each beat is predicted from the running
 * fit and the novelty peak NEAREST to the prediction (±7 ms) is taken. Nearest-to-prediction keeps
 * the same acoustic feature on every beat (the kick click the fold locked onto) — picking "the
 * loudest" or "the earliest" peak switches between click, clap bursts and the reverse-bass cut
 * from beat to beat, which tilts the fitted slope.
 */
function regressBeats(nov: Float32Array, fr: number, a: number, b: number, t0: number, period: number): { t0: number; period: number; n: number; rms: number } | null {
  const win = Math.max(2, Math.round(0.007 * fr));
  const k0 = Math.ceil((a - t0) / period);
  const k1 = Math.floor((b - t0) / period);
  if (k1 - k0 < 16) return null;
  // peak threshold: a fraction of the strong onsets in this segment
  const i0 = Math.max(1, Math.floor(a * fr)),
    i1 = Math.min(nov.length - 1, Math.floor(b * fr));
  let mx = 0;
  const sample: number[] = [];
  for (let i = i0; i < i1; i += 7) sample.push(nov[i]);
  for (let i = i0; i < i1; i++) if (nov[i] > mx) mx = nov[i];
  sample.sort((p, q) => p - q);
  const strong = sample[Math.floor(sample.length * 0.995)] || mx;
  const thr = 0.15 * strong;
  const kc = Math.round(((a + b) / 2 - t0) / period);
  let n = 0,
    sk = 0,
    st = 0,
    skk = 0,
    skt = 0;
  let p = period,
    c = t0;
  const ks: number[] = [];
  const ts: number[] = [];
  const refit = () => {
    const den = n * skk - sk * sk;
    if (n >= 6 && den > 0) {
      p = (n * skt - sk * st) / den;
      c = (st - p * sk) / n;
    }
  };
  for (let step = 0; step <= 2 * (k1 - k0) + 2; step++) {
    const k = kc + (step % 2 ? (step + 1) / 2 : -step / 2);
    if (k < k0 || k > k1) continue;
    const pred = (c + p * k) * fr;
    const ci = Math.round(pred);
    const lo = Math.max(1, ci - win),
      hi = Math.min(nov.length - 2, ci + win);
    let bi = -1,
      bd = 1e9;
    for (let i = lo; i <= hi; i++) {
      const v = nov[i];
      if (v < thr || v < nov[i - 1] || v < nov[i + 1]) continue;
      const d = Math.abs(i - pred);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    if (bi < 0) continue;
    const l = nov[bi - 1],
      r = nov[bi + 1],
      v = nov[bi];
    const den = l - 2 * v + r;
    const off = den < 0 ? (0.5 * (l - r)) / den : 0;
    const t = (bi + off) / fr;
    ks.push(k);
    ts.push(t);
    n++;
    sk += k;
    st += t;
    skk += k * k;
    skt += k * t;
    if (n % 4 === 0) refit();
  }
  if (n < 16) return null;
  refit();
  // robust second pass without > 3 MAD outliers
  const res = ks.map((k, i) => ts[i] - (c + p * k));
  const mad = median(res.map(Math.abs)) || 1e-4;
  n = sk = st = skk = skt = 0;
  for (let i = 0; i < ks.length; i++) {
    if (Math.abs(res[i]) > Math.max(3 * mad, 0.002)) continue;
    n++;
    sk += ks[i];
    st += ts[i];
    skk += ks[i] * ks[i];
    skt += ks[i] * ts[i];
  }
  if (n < 16) return null;
  refit();
  let ss = 0,
    cnt = 0;
  for (let i = 0; i < ks.length; i++) {
    const e = ts[i] - (c + p * ks[i]);
    if (Math.abs(e) > Math.max(3 * mad, 0.002)) continue;
    ss += e * e;
    cnt++;
  }
  const rms = Math.sqrt(ss / Math.max(1, cnt));
  // coverage: most beats must have been found (a sparse fit is not trustworthy)
  if (rms > 0.003 || cnt < 0.5 * (k1 - k0 + 1)) return null;
  return { t0: c, period: p, n: cnt, rms };
}

function estimateOffset(novLow: Float32Array, fr: number, input: AnalysisInput, base: number, duration: number): { lag: number; confidence: number; accept: boolean; candidate: boolean } | null {
  const R = 10; // Hz
  const nShow = Math.floor(input.showDuration * R);
  if (nShow < 60) return null;
  // template (show time)
  const T = new Float32Array(nShow);
  const segs = [...input.tempo].sort((p, q) => p.start - q.start);
  const secs = [...input.sections].sort((p, q) => p.start - q.start);
  for (let i = 0; i < nShow; i++) {
    const t = i / R;
    const seg = segs.find((s) => t >= s.start && t < s.end);
    const sec = secs.find((s) => t >= s.start && t < s.end);
    T[i] = seg?.kick ? (KIND_KICK_WEIGHT[sec?.kind ?? 'drop'] ?? 0.5) : 0;
  }
  const tm = mean(T);
  let tv = 0;
  for (let i = 0; i < nShow; i++) tv += (T[i] - tm) ** 2;
  if (Math.sqrt(tv / nShow) < 0.08) return null; // no structure to correlate against
  // measured kick density (audio time), 10 Hz, smoothed ±0.5 s
  const nA = Math.floor(duration * R);
  const K0 = new Float32Array(nA);
  const per = fr / R;
  for (let j = 0; j < nA; j++) {
    const a = Math.floor(j * per),
      b = Math.min(novLow.length, Math.floor((j + 1) * per));
    let s = 0;
    for (let i = a; i < b; i++) s += novLow[i];
    K0[j] = s;
  }
  const K = new Float32Array(nA);
  for (let j = 0; j < nA; j++) {
    let s = 0,
      c = 0;
    for (let k = -5; k <= 5; k++) {
      const q = j + k;
      if (q >= 0 && q < nA) {
        s += K0[q];
        c++;
      }
    }
    K[j] = s / c;
  }
  const corr = (lag: number) => {
    // pearson over overlap of T[i] and K[i + (base + lag) * R]
    const sh = Math.round((base + lag) * R);
    let sx = 0,
      sy = 0,
      sxx = 0,
      syy = 0,
      sxy = 0,
      c = 0;
    for (let i = 0; i < nShow; i++) {
      const j = i + sh;
      if (j < 0 || j >= nA) continue;
      const xv = T[i],
        yv = K[j];
      sx += xv;
      sy += yv;
      sxx += xv * xv;
      syy += yv * yv;
      sxy += xv * yv;
      c++;
    }
    if (c < 60) return -1;
    const cov = sxy / c - (sx / c) * (sy / c);
    const vx = sxx / c - (sx / c) ** 2,
      vy = syy / c - (sy / c) ** 2;
    return vx > 1e-12 && vy > 1e-12 ? cov / Math.sqrt(vx * vy) : -1;
  };
  let best = -2,
    bestLag = 0;
  const rs: number[] = [];
  for (let k = -200; k <= 200; k++) {
    const lag = k / R;
    const r = corr(lag);
    rs.push(r);
    if (r > best) {
      best = r;
      bestLag = lag;
    }
  }
  const r0 = corr(0);
  const candidate = Math.abs(bestLag) >= 0.3 && best >= 0.35;
  const accept = candidate && best - r0 >= 0.08;
  return { lag: bestLag, confidence: Math.max(0, best), accept, candidate };
}

function detectSections(eFull: Float32Array, eLow: Float32Array, cr: number, sections: Section[], offset: number, tempo: TempoSegment[], radius = 6): SectionReport[] {
  const n = eFull.length;
  const dbF = new Float64Array(n + 1);
  const dbL = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    dbF[i + 1] = dbF[i] + 10 * Math.log10(eFull[i] + 1e-10);
    dbL[i + 1] = dbL[i] + 10 * Math.log10(eLow[i] + 1e-10);
  }
  const W = Math.round(cr * 1.0);
  const avg = (p: Float64Array, a: number, b: number) => (p[b] - p[a]) / (b - a);
  const sorted = [...sections].sort((p, q) => p.start - q.start);
  const out: SectionReport[] = [];
  for (let si = 0; si < sorted.length; si++) {
    const sec = sorted[si];
    const rep: SectionReport = { index: sections.indexOf(sec), label: sec.label, kind: sec.kind, authored: sec.start, detected: null, delta: null, confidence: 0 };
    out.push(rep);
    if (si === 0 || sec.start < 1) continue;
    const prev = sorted[si - 1];
    const expected = sec.energy - prev.energy;
    const sign = Math.abs(expected) >= 0.12 ? Math.sign(expected) : 0;
    const c = Math.round((sec.start + offset) * cr);
    const r = Math.round(radius * cr);
    const scores: number[] = [];
    let best = -Infinity,
      bi = -1;
    for (let i = c - r; i <= c + r; i++) {
      if (i - W < 0 || i + W > n) continue;
      const dF = avg(dbF, i, i + W) - avg(dbF, i - W, i);
      const dL = avg(dbL, i, i + W) - avg(dbL, i - W, i);
      let s = sign !== 0 ? sign * (dF + dL) : Math.abs(dF) + Math.abs(dL);
      s -= (0.12 * Math.abs(i - c)) / cr; // mild prior towards the authored time
      scores.push(s);
      if (s > best) {
        best = s;
        bi = i;
      }
    }
    if (bi < 0 || scores.length < 10) continue;
    const med = [...scores].sort((p, q) => p - q)[scores.length >> 1];
    const conf = Math.max(0, Math.min(1, (best - med) / 8));
    let t = bi / cr - offset;
    // snap to the nearest beat of the (refined) grid when close
    const seg = tempo.find((s) => t >= s.start && t < s.end);
    if (seg) {
      const beat = 60 / seg.bpm;
      const snapped = seg.anchor + Math.round((t - seg.anchor) / beat) * beat;
      if (Math.abs(snapped - t) < 0.12) t = snapped;
    }
    rep.detected = +t.toFixed(3);
    rep.delta = +(t - sec.start).toFixed(3);
    rep.confidence = +conf.toFixed(2);
  }
  return out;
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
