/**
 * Procedural festival-crowd sound bank, rendered ONCE (OfflineAudioContext on the audio thread,
 * applause in plain JS DSP). Nothing is sampled: every voice is a formant-filtered glottal
 * oscillator with its own pitch contour, syllable rhythm, vowels, consonant noise, distance and
 * position. Runtime playback is then just a handful of looping buffers + occasional one-shots.
 */
import { Rng } from '../../core/rng';
import { createOffline, fillNoise, makeLoop, normalize, reverbIR } from '../audioUtils';

export interface CrowdBank {
  /** babble / murmur loop (stereo) */
  murmur: AudioBuffer;
  /** sustained crowd roar loop (stereo) */
  roar: AudioBuffer;
  /** applause loop (stereo) */
  applause: AudioBuffer;
  /** big cheers / roars (one-shots, stereo) */
  cheers: AudioBuffer[];
  /** whistles (one-shots, mono) */
  whistles: AudioBuffer[];
  /** brown-noise wind bed (stereo loop) */
  wind: AudioBuffer;
}

/** vowel formants (Hz) F1, F2, F3 (adult male; scaled for female voices) */
const VOWELS: [number, number, number][] = [
  [730, 1090, 2440], // a
  [530, 1840, 2480], // e
  [270, 2290, 3010], // i
  [570, 840, 2410], // o
  [300, 870, 2240], // u
  [640, 1190, 2390], // uh
  [660, 1720, 2410], // ae
];

interface VoiceOpts {
  rng: Rng;
  /** base f0 */
  f0: number;
  /** female/child formant scale */
  fscale: number;
  pan: number;
  /** linear gain (distance) */
  gain: number;
  /** low-pass cutoff (distance / occlusion) */
  cutoff: number;
  /** breath noise mix 0..1 */
  breath: number;
}

/** A single formant voice: saw source + breath noise -> 3 parallel band-passes -> env -> lp -> pan. */
class Voice {
  readonly osc: OscillatorNode;
  readonly env: GainNode;
  readonly f: BiquadFilterNode[] = [];
  readonly fric: GainNode;
  constructor(
    ctx: OfflineAudioContext,
    noise: AudioBuffer,
    dest: AudioNode,
    readonly o: VoiceOpts,
    start: number,
    end: number,
  ) {
    const rng = o.rng;
    this.osc = ctx.createOscillator();
    this.osc.type = 'sawtooth';
    this.osc.frequency.value = o.f0;
    const src = ctx.createGain();
    src.gain.value = 1;
    this.osc.connect(src);
    const br = ctx.createBufferSource();
    br.buffer = noise;
    br.loop = true;
    const brg = ctx.createGain();
    brg.gain.value = o.breath * 1.4;
    br.connect(brg).connect(src);
    this.env = ctx.createGain();
    this.env.gain.value = 0;
    const amps = [1, 0.62, 0.3];
    for (let i = 0; i < 3; i++) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = [5.5, 8, 11][i];
      bp.frequency.value = VOWELS[0][i] * o.fscale;
      const g = ctx.createGain();
      g.gain.value = amps[i];
      src.connect(bp).connect(g).connect(this.env);
      this.f.push(bp);
    }
    // consonant / fricative noise path
    const fr = ctx.createBufferSource();
    fr.buffer = noise;
    fr.loop = true;
    fr.loopStart = rng.range(0, 0.5);
    const fbp = ctx.createBiquadFilter();
    fbp.type = 'bandpass';
    fbp.frequency.value = rng.range(2600, 4800);
    fbp.Q.value = 1.2;
    this.fric = ctx.createGain();
    this.fric.gain.value = 0;
    fr.connect(fbp).connect(this.fric);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = o.cutoff;
    lp.Q.value = 0.6;
    const out = ctx.createGain();
    out.gain.value = o.gain;
    const pan = ctx.createStereoPanner();
    pan.pan.value = o.pan;
    this.env.connect(lp);
    this.fric.connect(lp);
    lp.connect(out).connect(pan).connect(dest);
    this.osc.start(start);
    this.osc.stop(end);
    br.start(start, rng.range(0, 1));
    br.stop(end);
    fr.start(start, rng.range(0, 1));
    fr.stop(end);
  }

  /** a spoken syllable: consonant burst, vowel with pitch + formant targets, amplitude arc */
  syllable(t: number, dur: number, vowel: number, f0: number, level: number, consonant: boolean): void {
    const v = VOWELS[vowel];
    const s = this.o.fscale;
    for (let i = 0; i < 3; i++) this.f[i].frequency.setTargetAtTime(v[i] * s, t, 0.025);
    this.osc.frequency.setTargetAtTime(f0, t, 0.03);
    this.osc.frequency.setTargetAtTime(f0 * (0.92 + 0.1 * this.o.rng.next()), t + dur * 0.5, dur * 0.4);
    const g = this.env.gain;
    const on = consonant ? t + 0.035 : t;
    g.setTargetAtTime(level, on, 0.018);
    g.setTargetAtTime(level * 0.55, on + dur * 0.55, dur * 0.2);
    g.setTargetAtTime(0, t + dur, 0.03);
    if (consonant) {
      const fg = this.fric.gain;
      fg.setTargetAtTime(level * 0.22, t, 0.006);
      fg.setTargetAtTime(0, t + 0.03, 0.012);
    }
  }

  /** a sustained shout / cheer vowel with a pitch glide and a rough vibrato */
  shout(t: number, dur: number, vowel: number, f0: number, glide: number, level: number): void {
    const v = VOWELS[vowel];
    const s = this.o.fscale;
    for (let i = 0; i < 3; i++) this.f[i].frequency.setTargetAtTime(v[i] * s, t, 0.05);
    const fq = this.osc.frequency;
    fq.setTargetAtTime(f0, t, 0.02);
    const steps = Math.max(2, Math.floor(dur / 0.09));
    for (let k = 1; k <= steps; k++) {
      const p = k / steps;
      // rise then settle (like "wooo-oh"), plus rough vibrato
      const arc = Math.sin(Math.min(1, p * 1.6) * Math.PI * 0.5) * (1 - 0.35 * Math.max(0, p - 0.6));
      const vib = 1 + 0.018 * Math.sin(k * 2.3 + f0);
      fq.setTargetAtTime(f0 * (1 + glide * arc) * vib, t + p * dur, 0.04);
    }
    const g = this.env.gain;
    g.setTargetAtTime(level, t, 0.05);
    g.setTargetAtTime(level * 0.75, t + dur * 0.4, dur * 0.3);
    g.setTargetAtTime(0, t + dur, 0.12);
  }
}

function makeVoice(ctx: OfflineAudioContext, noise: AudioBuffer, dest: AudioNode, rng: Rng, start: number, end: number, opts: { near?: boolean; shout?: boolean } = {}): Voice {
  const female = rng.chance(0.48);
  const dist = opts.near ? rng.range(2, 8) : rng.range(4, 45);
  const f0 = female ? rng.range(175, 250) : rng.range(95, 140);
  return new Voice(
    ctx,
    noise,
    dest,
    {
      rng,
      f0: opts.shout ? f0 * rng.range(1.25, 1.9) : f0,
      fscale: female ? rng.range(1.12, 1.22) : rng.range(0.95, 1.05),
      pan: rng.range(-0.95, 0.95),
      gain: 1 / (1 + dist / 5),
      cutoff: 6000 / (1 + dist / 18),
      breath: opts.shout ? rng.range(0.25, 0.5) : rng.range(0.04, 0.12),
    },
    start,
    end,
  );
}

function noiseBuf(ctx: BaseAudioContext, seconds: number, seed: number, color: 'white' | 'pink' | 'brown' = 'white', channels = 1): AudioBuffer {
  const b = ctx.createBuffer(channels, Math.floor(seconds * ctx.sampleRate), ctx.sampleRate);
  for (let ch = 0; ch < channels; ch++) fillNoise(b.getChannelData(ch), seed + ch * 7919, color);
  return b;
}

/** outdoor space: a little slap + a short open-air tail */
function space(ctx: OfflineAudioContext, input: AudioNode, wet: number, seconds = 1.3): void {
  const conv = ctx.createConvolver();
  conv.buffer = reverbIR(ctx, seconds, { seed: 77, predelay: 0.03, damping: 0.85, early: 0.5 });
  const g = ctx.createGain();
  g.gain.value = wet;
  input.connect(conv).connect(g).connect(ctx.destination);
  input.connect(ctx.destination);
}

/** far-crowd wash: pink noise band with slow swells */
function wash(ctx: OfflineAudioContext, dest: AudioNode, rng: Rng, dur: number, level: number, lo = 280, hi = 2600): void {
  for (let ch = 0; ch < 2; ch++) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(ctx, Math.min(dur, 6), rng.int(1, 1e6), 'pink');
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = lo;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = hi;
    const g = ctx.createGain();
    g.gain.value = level;
    for (let t = 0; t < dur; t += 0.5) g.gain.setTargetAtTime(level * rng.range(0.7, 1.15), t, 0.35);
    const pan = ctx.createStereoPanner();
    pan.pan.value = ch ? 0.6 : -0.6;
    src.connect(hp).connect(lp).connect(g).connect(pan).connect(dest);
    src.start(0, rng.range(0, 3));
    src.stop(dur);
  }
}

async function renderMurmur(sr: number, lite: boolean): Promise<AudioBuffer> {
  const L = 10,
    X = 0.8;
  const dur = L + X;
  const ctx = createOffline(2, dur, sr);
  const rng = new Rng(1001);
  const noise = noiseBuf(ctx, 1.5, 5);
  const bus = ctx.createGain();
  bus.gain.value = 0.9;
  const n = lite ? 18 : 34;
  for (let v = 0; v < n; v++) {
    const voice = makeVoice(ctx, noise, bus, rng, 0, dur, { near: v < 4 });
    let t = rng.range(0, 1.2);
    while (t < dur) {
      const syl = rng.int(2, 9);
      const f0 = voice.o.f0 * rng.range(0.95, 1.12);
      for (let s = 0; s < syl && t < dur; s++) {
        const sd = rng.range(0.11, 0.27);
        const decl = 1.08 - 0.18 * (s / syl);
        const laugh = rng.chance(0.015);
        voice.syllable(t, sd, laugh ? 0 : rng.int(0, VOWELS.length - 1), f0 * decl * rng.range(0.94, 1.08) * (laugh ? 1.5 : 1), rng.range(0.35, 1), rng.chance(0.4));
        t += sd + rng.range(0.0, 0.06);
      }
      t += rng.range(0.25, 1.4);
    }
  }
  wash(ctx, bus, rng, dur, 0.06);
  space(ctx, bus, 0.35);
  return normalize(makeLoop(ctx, await ctx.startRendering(), X), 0.8);
}

async function renderRoar(sr: number, lite: boolean): Promise<AudioBuffer> {
  const L = 8,
    X = 1;
  const dur = L + X;
  const ctx = createOffline(2, dur, sr);
  const rng = new Rng(2002);
  const noise = noiseBuf(ctx, 1.5, 9);
  const bus = ctx.createGain();
  const n = lite ? 26 : 52;
  for (let v = 0; v < n; v++) {
    const voice = makeVoice(ctx, noise, bus, rng, 0, dur, { shout: true });
    let t = rng.range(0, 0.6);
    while (t < dur) {
      const d = rng.range(0.8, 3.2);
      voice.shout(t, d, rng.pick([0, 0, 3, 4, 5, 1]), voice.o.f0 * rng.range(0.9, 1.15), rng.range(0.05, 0.4), rng.range(0.4, 1));
      t += d + rng.range(0.05, 0.6);
    }
  }
  wash(ctx, bus, rng, dur, 0.22, 350, 3200);
  space(ctx, bus, 0.4);
  return normalize(makeLoop(ctx, await ctx.startRendering(), X), 0.8);
}

/** a big reaction: sudden onset, whoops rising, long tail with applause starting under it */
async function renderCheer(sr: number, seed: number, lite: boolean, applause: Float32Array[]): Promise<AudioBuffer> {
  const dur = 5.5;
  const ctx = createOffline(2, dur, sr);
  const rng = new Rng(seed);
  const noise = noiseBuf(ctx, 1.5, seed + 1);
  const bus = ctx.createGain();
  const n = lite ? 34 : 70;
  for (let v = 0; v < n; v++) {
    const voice = makeVoice(ctx, noise, bus, rng, 0, dur, { shout: true, near: v < 6 });
    const t0 = Math.abs(rng.gauss()) * 0.12;
    const d = rng.range(1.2, 3.6);
    voice.shout(t0, d, rng.pick([0, 3, 4, 4, 5]), voice.o.f0 * rng.range(0.95, 1.2), rng.range(0.15, 0.7), rng.range(0.5, 1));
    if (rng.chance(0.45)) voice.shout(t0 + d + rng.range(0.1, 0.5), rng.range(0.6, 1.6), rng.pick([0, 3, 5]), voice.o.f0 * rng.range(1, 1.3), rng.range(0.1, 0.4), rng.range(0.3, 0.7));
  }
  // roar noise body: fast attack, long decay
  for (let ch = 0; ch < 2; ch++) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(ctx, dur, seed + 10 + ch, 'pink');
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100;
    bp.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, 0);
    g.gain.linearRampToValueAtTime(0.35, 0.12);
    g.gain.setTargetAtTime(0, 0.9, 1.4);
    const pan = ctx.createStereoPanner();
    pan.pan.value = ch ? 0.7 : -0.7;
    src.connect(bp).connect(g).connect(pan).connect(bus);
    src.start(0);
  }
  // applause under the tail
  const ab = ctx.createBuffer(2, applause[0].length, sr);
  ab.getChannelData(0).set(applause[0]);
  ab.getChannelData(1).set(applause[1]);
  const as = ctx.createBufferSource();
  as.buffer = ab;
  const ag = ctx.createGain();
  ag.gain.setValueAtTime(0, 0);
  ag.gain.linearRampToValueAtTime(0.5, 1.2);
  ag.gain.setTargetAtTime(0, 3, 1);
  as.connect(ag).connect(bus);
  as.start(0.2);
  const fade = ctx.createGain();
  fade.gain.setValueAtTime(1, dur - 0.6);
  fade.gain.linearRampToValueAtTime(0, dur);
  bus.connect(fade);
  space(ctx, fade, 0.45, 1.6);
  return normalize(await ctx.startRendering(), 0.85);
}

/** two-finger / wolf whistles */
async function renderWhistle(sr: number, seed: number): Promise<AudioBuffer> {
  const rng = new Rng(seed);
  const dur = rng.range(0.7, 1.4);
  const ctx = createOffline(1, dur + 0.5, sr);
  const o = ctx.createOscillator();
  const f = rng.range(2300, 3300);
  const q = o.frequency;
  const kind = seed % 3;
  if (kind === 0) {
    // rising then held, falling at the end
    q.setValueAtTime(f * 0.8, 0);
    q.exponentialRampToValueAtTime(f, 0.08);
    for (let t = 0.1; t < dur - 0.15; t += 0.05) q.setTargetAtTime(f * (1 + 0.012 * Math.sin(t * 38)), t, 0.02);
    q.setTargetAtTime(f * 0.72, dur - 0.15, 0.06);
  } else if (kind === 1) {
    // wolf whistle: up-glide, gap, up-down glide
    q.setValueAtTime(f * 0.6, 0);
    q.exponentialRampToValueAtTime(f * 1.05, dur * 0.3);
    q.setValueAtTime(f * 0.7, dur * 0.45);
    q.exponentialRampToValueAtTime(f * 1.1, dur * 0.65);
    q.exponentialRampToValueAtTime(f * 0.55, dur);
  } else {
    // short double blast
    q.setValueAtTime(f, 0);
    q.setTargetAtTime(f * 1.04, 0.05, 0.05);
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, 0);
  if (kind === 2) {
    g.gain.linearRampToValueAtTime(0.9, 0.03);
    g.gain.setValueAtTime(0.9, dur * 0.35);
    g.gain.linearRampToValueAtTime(0, dur * 0.4);
    g.gain.linearRampToValueAtTime(0.9, dur * 0.5);
    g.gain.setValueAtTime(0.9, dur * 0.9);
  } else {
    g.gain.linearRampToValueAtTime(0.9, 0.04);
    g.gain.setValueAtTime(kind === 1 ? 0.9 : 0.8, dur * 0.3);
    if (kind === 1) {
      g.gain.linearRampToValueAtTime(0, dur * 0.4);
      g.gain.linearRampToValueAtTime(0.9, dur * 0.5);
    }
    g.gain.setValueAtTime(0.8, dur * 0.85);
  }
  g.gain.linearRampToValueAtTime(0, dur);
  // breath: noise narrowly around the tone
  const n = ctx.createBufferSource();
  n.buffer = noiseBuf(ctx, dur, seed + 3);
  const nb = ctx.createBiquadFilter();
  nb.type = 'bandpass';
  nb.frequency.value = f;
  nb.Q.value = 6;
  const ng = ctx.createGain();
  ng.gain.value = 0.35;
  n.connect(nb).connect(ng).connect(g);
  o.connect(g);
  space(ctx, g, 0.4, 1.1);
  o.start(0);
  o.stop(dur);
  n.start(0);
  return normalize(await ctx.startRendering(), 0.8);
}

/** Applause (plain JS DSP): N clappers with individual rate, timbre (resonance) and position. */
function applauseDSP(sr: number, seconds: number, seed: number, lite: boolean): Float32Array[] {
  const rng = new Rng(seed);
  const n = Math.floor(seconds * sr);
  const L = new Float32Array(n),
    R = new Float32Array(n);
  const clappers = lite ? 50 : 110;
  const clapLen = Math.floor(0.02 * sr);
  const burst = new Float32Array(clapLen);
  for (let c = 0; c < clappers; c++) {
    const rate = rng.range(3.2, 5.4);
    const fc = rng.range(700, 2300);
    const bw = rng.range(0.35, 0.8);
    const pan = rng.range(-1, 1);
    const dist = rng.range(2, 40);
    const amp = 1 / (1 + dist / 6);
    const gl = amp * Math.sqrt(0.5 * (1 - pan)),
      gr = amp * Math.sqrt(0.5 * (1 + pan));
    // 2-pole resonator coefficients
    const w = (2 * Math.PI * fc) / sr;
    const r = Math.exp((-Math.PI * fc * bw) / sr);
    const a1 = -2 * r * Math.cos(w),
      a2 = r * r;
    let t = rng.range(0, 1 / rate);
    while (t < seconds) {
      const i0 = Math.floor(t * sr);
      // one clap: decaying noise through the resonator
      let y1 = 0,
        y2 = 0;
      const dec = rng.range(0.003, 0.006);
      for (let k = 0; k < clapLen; k++) {
        const x = (rng.next() * 2 - 1) * Math.exp(-k / (dec * sr));
        const y = x - a1 * y1 - a2 * y2;
        y2 = y1;
        y1 = y;
        burst[k] = y;
      }
      const vel = rng.range(0.6, 1);
      for (let k = 0; k < clapLen && i0 + k < n; k++) {
        L[i0 + k] += burst[k] * gl * vel * 0.08;
        R[i0 + k] += burst[k] * gr * vel * 0.08;
      }
      t += (1 / rate) * rng.range(0.85, 1.15);
    }
  }
  return [L, R];
}

async function renderApplause(sr: number, lite: boolean, dsp: Float32Array[]): Promise<AudioBuffer> {
  const L = 6,
    X = 0.6;
  const ctx = createOffline(2, L + X, sr);
  const b = ctx.createBuffer(2, dsp[0].length, sr);
  b.getChannelData(0).set(dsp[0]);
  b.getChannelData(1).set(dsp[1]);
  const s = ctx.createBufferSource();
  s.buffer = b;
  const g = ctx.createGain();
  g.gain.value = 1;
  s.connect(g);
  wash(ctx, g, new Rng(5), L + X, 0.03, 500, 4000);
  space(ctx, g, 0.3, 1.2);
  s.start(0);
  void lite;
  return normalize(makeLoop(ctx, await ctx.startRendering(), X), 0.75);
}

function renderWind(ctx: BaseAudioContext, sr: number): AudioBuffer {
  const b = ctx.createBuffer(2, Math.floor(7 * sr), sr);
  fillNoise(b.getChannelData(0), 4242, 'brown');
  fillNoise(b.getChannelData(1), 4343, 'brown');
  const tmp = createOffline(2, 0.1, sr);
  return normalize(makeLoop(tmp, b, 1), 0.7);
}

export type CrowdBankItem = keyof CrowdBank;

/**
 * Render the whole bank PROGRESSIVELY: `onItem` receives each sound as soon as it exists (the
 * murmur bed first, so the grounds sound attended within a second or two). Rendering happens on
 * the audio threads of the OfflineAudioContexts; the main thread only builds small graphs and
 * yields between items.
 */
export async function renderCrowdBank(opts: { lite: boolean; onItem?: <K extends CrowdBankItem>(name: K, value: CrowdBank[K]) => void }): Promise<CrowdBank> {
  const lite = opts.lite;
  // speech babble / roar content lives below 5 kHz: 16 kHz is plenty; one-shots get 22 kHz
  const srLow = 16000;
  const srHigh = lite ? 16000 : 22050;
  const emit = opts.onItem ?? (() => {});
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const wind = renderWind(createOffline(2, 0.1, srLow), srLow);
  emit('wind', wind);
  const murmur = await renderMurmur(srLow, lite);
  emit('murmur', murmur);
  await tick();
  const applause = await renderApplause(srHigh, lite, applauseDSP(srHigh, 6.6, 31, lite));
  emit('applause', applause);
  await tick();
  const whistles: AudioBuffer[] = [];
  for (let i = 0; i < (lite ? 3 : 6); i++) whistles.push(await renderWhistle(srHigh, 900 + i));
  emit('whistles', whistles);
  await tick();
  const cheerApplause = applauseDSP(srHigh, 5, 57, lite);
  const cheers: AudioBuffer[] = [];
  for (let i = 0; i < (lite ? 2 : 3); i++) {
    cheers.push(await renderCheer(srHigh, 500 + i * 17, lite, cheerApplause));
    emit('cheers', cheers);
    await tick();
  }
  const roar = await renderRoar(srLow, lite);
  emit('roar', roar);
  return { murmur, roar, applause, cheers, whistles, wind };
}
