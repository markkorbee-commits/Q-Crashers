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
  /** unison "DEF-QON!" chant calls (one-shots, stereo, first syllable at CHANT_LEAD s) */
  defqon: AudioBuffer[];
  /** unison "ONE TRIBE!" chant calls (one-shots, stereo, first syllable at CHANT_LEAD s) */
  onetribe: AudioBuffer[];
  /** mass "woah-oh" sing-along phrases over two bars (one-shots, stereo, downbeat at CHANT_LEAD s) */
  singalong: AudioBuffer[];
  /** collective scream (blackout / sudden darkness), onset at CHANT_LEAD s */
  scream: AudioBuffer[];
  /** thousands of people landing a jump (one-shot, stereo, impact at CHANT_LEAD s) */
  thump: AudioBuffer;
}

/** every rhythmic one-shot (chants, sing-along, scream, thump) has its downbeat this far into the buffer */
export const CHANT_LEAD = 0.2;
/** beat length the chants and the sing-along are rendered at (the anthem: 155 BPM) */
export const CHANT_BEAT = 60 / 155;

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
/** chant articulation targets (Hz, adult male; Voice scales them) */
const V_EH = [580, 1800, 2550] as const; // DEF
const V_AW = [600, 900, 2450] as const; // QON
const V_UH = [640, 1190, 2390] as const; // ONE
const V_AI_A = [760, 1180, 2450] as const; // TRI(-)
const V_AI_I = [340, 2050, 2900] as const; // (-)BE
const V_R = [470, 1250, 1650] as const; // r: F3 dips
const V_W = [300, 700, 2200] as const; // w / oo glide
const V_N = [270, 1350, 2350] as const; // nasal murmur
const V_OH = [540, 830, 2420] as const; // sung "oh"

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
  readonly fbp: BiquadFilterNode;
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
    this.fbp = fbp;
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

  // --- articulation primitives for chants and singing ------------------------------------

  /** move the vocal tract to formants `f` (unscaled Hz) with time constant `tau` */
  tract(t: number, f: readonly number[], tau: number): void {
    const s = this.o.fscale;
    for (let i = 0; i < 3; i++) this.f[i].frequency.setTargetAtTime(f[i] * s, t, tau);
  }

  /** voiced amplitude target */
  amp(t: number, level: number, tau: number): void {
    this.env.gain.setTargetAtTime(level, t, tau);
  }

  /** glottal pitch target */
  pitch(t: number, f0: number, tau: number): void {
    this.osc.frequency.setTargetAtTime(f0, t, tau);
  }

  /** consonant noise: plosive release (short) or fricative (longer), centred on `freq` */
  noise(t: number, dur: number, level: number, freq: number): void {
    this.fbp.frequency.setTargetAtTime(freq * (0.9 + 0.2 * this.o.rng.next()), Math.max(0, t - 0.01), 0.003);
    const g = this.fric.gain;
    g.setTargetAtTime(level, t, Math.min(0.005, dur * 0.3));
    g.setTargetAtTime(0, t + dur, dur * 0.35 + 0.004);
  }

  /** shouted "DEF-QON!": /d/ burst, /ɛ/, /f/ fricative, /k/ closure + burst, /ɔ/ falling, nasal /n/ */
  defqon(t: number, beat: number, f0: number, level: number): void {
    const r = this.o.rng;
    this.noise(t - 0.005, 0.012, level * 0.1, 3600);
    this.tract(t - 0.02, V_EH, 0.012);
    this.pitch(t - 0.02, f0 * 1.05, 0.01);
    this.pitch(t + 0.1, f0 * 1.1, 0.05);
    this.amp(t + 0.005, level, 0.012);
    const fEnd = t + beat * r.range(0.45, 0.55);
    this.amp(fEnd, 0, 0.015);
    this.noise(fEnd - 0.01, 0.1, level * 0.09, 5200);
    const k = t + beat;
    this.noise(k - 0.03, 0.028, level * 0.22, 2100);
    this.tract(k - 0.02, V_AW, 0.012);
    this.pitch(k - 0.02, f0 * 1.02, 0.01);
    this.amp(k, level * 1.1, 0.014);
    this.pitch(k + 0.08, f0 * r.range(0.84, 0.9), beat * 0.5);
    const n = k + beat * r.range(0.72, 0.85);
    this.tract(n, V_N, 0.03);
    this.amp(n, level * 0.42, 0.03);
    this.amp(n + beat * 0.35, 0, 0.05);
  }

  /** shouted "ONE TRIBE!": w-glide into /ʌ/, nasal /n/, /t/ burst, /r/, /aɪ/ diphthong, /b/ stop */
  oneTribe(t: number, beat: number, f0: number, level: number): void {
    const r = this.o.rng;
    this.tract(t - 0.08, V_W, 0.01);
    this.pitch(t - 0.08, f0 * 0.96, 0.01);
    this.amp(t - 0.07, level * 0.45, 0.02);
    this.tract(t, V_UH, 0.03);
    this.pitch(t, f0, 0.03);
    this.amp(t, level, 0.02);
    const n = t + beat * r.range(0.55, 0.65);
    this.tract(n, V_N, 0.025);
    this.amp(n, level * 0.4, 0.025);
    const k = t + beat;
    this.amp(k - 0.08, 0, 0.012);
    this.noise(k - 0.07, 0.035, level * 0.2, 4600);
    this.tract(k - 0.04, V_R, 0.012);
    this.pitch(k - 0.04, f0 * 1.08, 0.01);
    this.amp(k - 0.035, level * 0.55, 0.015);
    this.tract(k + 0.02, V_AI_A, 0.025);
    this.amp(k + 0.02, level * 1.1, 0.02);
    this.pitch(k + 0.1, f0 * r.range(0.9, 0.96), beat * 0.6);
    this.tract(k + beat * 0.55, V_AI_I, beat * 0.25);
    this.amp(k + beat * r.range(1.05, 1.2), 0, 0.012);
  }

  /** a sung note: scoop into pitch, delayed vibrato, `wOnset` glides in from /u/ ("woah") */
  sing(t: number, dur: number, f0: number, level: number, wOnset: boolean, vibRate: number): void {
    const r = this.o.rng;
    this.tract(t - 0.03, wOnset ? V_W : V_UH, 0.02);
    this.tract(t + (wOnset ? 0.06 : 0.02), V_OH, 0.04);
    // re-articulation: short dip, then scoop from ~60 cents flat
    this.amp(t - 0.03, level * 0.25, 0.012);
    this.pitch(t - 0.02, f0 * 0.965, 0.012);
    this.pitch(t + 0.04, f0, 0.035);
    this.amp(t + 0.01, level, 0.03);
    const vib = f0 * r.range(0.008, 0.016);
    const steps = Math.floor(Math.max(0, dur - 0.25) * vibRate * 2);
    for (let k = 0; k < steps; k++) {
      const tt = t + 0.25 + k / (vibRate * 2);
      this.pitch(tt, f0 + (k % 2 ? -vib : vib), 0.05);
    }
    this.amp(t + dur * 0.5, level * 0.8, dur * 0.4);
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

// ------------------------------------------------------------------ chants & sing-along

/** a chanting / singing crowd member: distance sets level, air absorption and arrival delay */
function chanter(
  ctx: OfflineAudioContext,
  noise: AudioBuffer,
  dest: AudioNode,
  rng: Rng,
  dur: number,
  near: boolean,
  f0Male: [number, number],
  f0Female: [number, number],
  breath: [number, number],
): { voice: Voice; f0: number; delay: number } {
  const female = rng.chance(0.38);
  const dist = near ? rng.range(1.5, 6) : rng.range(4, 60);
  const f0 = female ? rng.range(f0Female[0], f0Female[1]) : rng.range(f0Male[0], f0Male[1]);
  const voice = new Voice(
    ctx,
    noise,
    dest,
    {
      rng,
      f0,
      fscale: female ? rng.range(1.12, 1.22) : rng.range(0.95, 1.05),
      pan: rng.range(-0.95, 0.95),
      gain: 1 / (1 + dist / 5),
      cutoff: 6500 / (1 + dist / 22),
      breath: rng.range(breath[0], breath[1]),
    },
    0,
    dur,
  );
  // sound needs time to arrive from the far side of the crowd; nobody is perfectly on the beat
  // (centred on the beat: the average arrival delay of the crowd is ~50 ms)
  const delay = Math.max(-0.1, dist / 343 - 0.05 + Math.max(-0.05, Math.min(0.05, rng.gauss() * 0.022)));
  return { voice, f0, delay };
}

interface MassSyllable {
  t: number;
  d: number;
  f: readonly number[];
}

/** thousands of distant voices: syllable-shaped, formant-filtered pink noise (the smeared mass behind) */
function massVoices(ctx: OfflineAudioContext, dest: AudioNode, rng: Rng, dur: number, sylls: MassSyllable[], level: number): void {
  for (let ch = 0; ch < 2; ch++) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(ctx, dur, rng.int(1, 1e6), 'pink');
    const env = ctx.createGain();
    env.gain.value = 0;
    const bands: BiquadFilterNode[] = [];
    for (let i = 0; i < 2; i++) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = i ? 5 : 3.5;
      bp.frequency.value = sylls[0].f[i];
      const g = ctx.createGain();
      g.gain.value = i ? 0.55 : 1;
      src.connect(bp).connect(g).connect(env);
      bands.push(bp);
    }
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    const pan = ctx.createStereoPanner();
    pan.pan.value = ch ? 0.75 : -0.75;
    env.connect(lp).connect(pan).connect(dest);
    const skew = ch ? 0.018 : 0;
    for (const s of sylls) {
      for (let i = 0; i < 2; i++) bands[i].frequency.setTargetAtTime(s.f[i] * rng.range(1, 1.12), Math.max(0, s.t - 0.03 + skew), 0.03);
      env.gain.setTargetAtTime(level, s.t + 0.02 + skew, 0.045);
      env.gain.setTargetAtTime(0, s.t + s.d + skew, 0.11);
    }
    src.start(0);
    src.stop(dur);
  }
}

/**
 * Unison crowd chant ("DEF-QON!" / "ONE TRIBE!"): two shouted syllables one beat apart, by ~120
 * individual formant voices (timing spread by distance and reaction) over a smeared mass layer.
 * The first syllable lands at CHANT_LEAD s.
 */
async function renderChant(sr: number, seed: number, lite: boolean, kind: 'defqon' | 'onetribe'): Promise<AudioBuffer> {
  const b = CHANT_BEAT;
  const dur = CHANT_LEAD + b * 2.4 + 1.3;
  const ctx = createOffline(2, dur, sr);
  const rng = new Rng(seed);
  const noise = noiseBuf(ctx, 1.5, seed + 1);
  const bus = ctx.createGain();
  const n = lite ? 40 : 96;
  for (let v = 0; v < n; v++) {
    // shouting raises the voice by roughly half an octave
    const c = chanter(ctx, noise, bus, rng, dur, v < 8, [150, 215], [255, 350], [0.18, 0.38]);
    const lvl = rng.range(0.55, 1);
    const beat = b * rng.range(0.97, 1.03);
    if (kind === 'defqon') c.voice.defqon(CHANT_LEAD + c.delay, beat, c.f0, lvl);
    else c.voice.oneTribe(CHANT_LEAD + c.delay, beat, c.f0, lvl);
  }
  const sylls: MassSyllable[] =
    kind === 'defqon'
      ? [
          { t: CHANT_LEAD, d: b * 0.5, f: V_EH },
          { t: CHANT_LEAD + b, d: b * 0.95, f: V_AW },
        ]
      : [
          { t: CHANT_LEAD - 0.05, d: b * 0.65, f: V_UH },
          { t: CHANT_LEAD + b, d: b * 1.1, f: V_AI_A },
        ];
  massVoices(ctx, bus, rng, dur, sylls, 0.5);
  space(ctx, bus, 0.55, 1.9);
  return normalize(await ctx.startRendering(), 0.85);
}

/** 2-bar "woah-oh-oh" sing-along: [beat, length in beats, semitones above F] = C C B♭ G F | G F */
const SING_PHRASE: readonly [number, number, number][] = [
  [0, 1, 7],
  [1, 0.5, 7],
  [1.5, 0.5, 5],
  [2, 1, 2],
  [3, 1, 0],
  [4, 1.5, 2],
  [5.5, 2.1, 0],
];
const F3 = 174.61;

/**
 * Mass sing-along: ~80 singers (men on F3, women an octave up, each a little out of tune and off
 * the beat) singing a simple descending "woah-oh-oh" on F, G, B♭ and C: notes shared by F minor
 * (the anthem's key) and the rehearsal track's D minor, so it sits over either audio source.
 */
async function renderSing(sr: number, seed: number, lite: boolean): Promise<AudioBuffer> {
  const b = CHANT_BEAT;
  const dur = CHANT_LEAD + b * 8 + 1.4;
  const ctx = createOffline(2, dur, sr);
  const rng = new Rng(seed);
  const noise = noiseBuf(ctx, 1.5, seed + 1);
  const bus = ctx.createGain();
  const n = lite ? 30 : 64;
  for (let v = 0; v < n; v++) {
    const c = chanter(ctx, noise, bus, rng, dur, v < 6, [F3, F3], [F3 * 2, F3 * 2], [0.06, 0.16]);
    const cents = Math.max(-60, Math.min(60, rng.gauss() * 22));
    const base = c.f0 * Math.pow(2, cents / 1200);
    const lvl = rng.range(0.45, 0.9);
    const vib = rng.range(4.8, 6.2);
    const slop = rng.range(0.97, 1.03);
    for (let i = 0; i < SING_PHRASE.length; i++) {
      const [beat, len, semi] = SING_PHRASE[i];
      const t = CHANT_LEAD + c.delay + beat * b * slop;
      c.voice.sing(t, len * b, base * Math.pow(2, semi / 12), lvl * (i === 0 || i === 5 ? 1 : 0.85), i === 0, vib);
    }
    const [lb, ll] = SING_PHRASE[SING_PHRASE.length - 1];
    c.voice.amp(CHANT_LEAD + c.delay + (lb + ll) * b * slop, 0, 0.16);
  }
  massVoices(
    ctx,
    bus,
    rng,
    dur,
    SING_PHRASE.map(([beat, len]) => ({ t: CHANT_LEAD + beat * b, d: len * b * 0.9, f: V_OH })),
    0.22,
  );
  space(ctx, bus, 0.5, 2);
  return normalize(await ctx.startRendering(), 0.8);
}

/** a collective scream when the lights die: high, bright, fast onset, falling into cheering */
async function renderScream(sr: number, seed: number, lite: boolean): Promise<AudioBuffer> {
  const dur = 3.4;
  const ctx = createOffline(2, dur, sr);
  const rng = new Rng(seed);
  const noise = noiseBuf(ctx, 1.5, seed + 1);
  const bus = ctx.createGain();
  const n = lite ? 30 : 66;
  for (let v = 0; v < n; v++) {
    const c = chanter(ctx, noise, bus, rng, dur, v < 6, [230, 400], [420, 720], [0.25, 0.5]);
    const t0 = CHANT_LEAD + Math.abs(c.delay) + Math.abs(rng.gauss()) * 0.05;
    const d = rng.range(0.9, 2.3);
    c.voice.shout(t0, d, rng.pick([0, 0, 6, 2, 1]), c.f0, rng.range(0.12, 0.45), rng.range(0.6, 1));
  }
  for (let ch = 0; ch < 2; ch++) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(ctx, dur, seed + 20 + ch, 'pink');
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1600;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, 0);
    g.gain.setValueAtTime(0, CHANT_LEAD);
    g.gain.linearRampToValueAtTime(0.3, CHANT_LEAD + 0.1);
    g.gain.setTargetAtTime(0, CHANT_LEAD + 0.7, 0.9);
    const pan = ctx.createStereoPanner();
    pan.pan.value = ch ? 0.7 : -0.7;
    src.connect(bp).connect(g).connect(pan).connect(bus);
    src.start(0);
  }
  const fade = ctx.createGain();
  fade.gain.setValueAtTime(1, dur - 0.5);
  fade.gain.linearRampToValueAtTime(0, dur);
  bus.connect(fade);
  space(ctx, fade, 0.5, 1.8);
  return normalize(await ctx.startRendering(), 0.85);
}

/**
 * Thousands of people landing a jump on the beat (plain JS DSP): a low body thud per person
 * (damped 45–85 Hz sine with a small pitch drop) plus a shoe scuff, spread by distance and timing.
 */
function thumpDSP(sr: number, seconds: number, seed: number, lite: boolean): Float32Array[] {
  const rng = new Rng(seed);
  const n = Math.floor(seconds * sr);
  const L = new Float32Array(n),
    R = new Float32Array(n);
  const people = lite ? 140 : 320;
  for (let p = 0; p < people; p++) {
    const dist = rng.range(0.8, 38);
    const amp = 1 / (1 + dist / 3);
    const pan = rng.range(-1, 1);
    const gl = amp * Math.sqrt(0.5 * (1 - pan)),
      gr = amp * Math.sqrt(0.5 * (1 + pan));
    const t0 = CHANT_LEAD - 0.045 + dist / 343 + Math.max(-0.05, Math.min(0.05, rng.gauss() * 0.018));
    const i0 = Math.floor(t0 * sr);
    const f = rng.range(45, 85);
    const dec = rng.range(0.035, 0.07);
    const len = Math.min(n - i0, Math.floor(dec * 6 * sr));
    const w = (2 * Math.PI * f) / sr;
    let ph = 0;
    for (let k = 0; k < len; k++) {
      const tt = k / sr;
      ph += w * (1 - 0.18 * Math.min(1, tt / (dec * 4)));
      const y = Math.sin(ph) * Math.exp(-tt / dec) * (1 - Math.exp(-tt / 0.0025)) * 0.5;
      L[i0 + k] += y * gl;
      R[i0 + k] += y * gr;
    }
    // shoe scuff: a few ms of noise, duller with distance
    const sl = Math.min(n - i0, Math.floor(0.012 * sr));
    const a = Math.exp((-2 * Math.PI * (2600 / (1 + dist / 10))) / sr);
    let lp = 0;
    const sc = rng.range(0.05, 0.14);
    for (let k = 0; k < sl; k++) {
      lp = lp * a + (rng.next() * 2 - 1) * (1 - a);
      const y = lp * Math.exp(-k / (0.0025 * sr)) * sc;
      L[i0 + k] += y * gl;
      R[i0 + k] += y * gr;
    }
  }
  return [L, R];
}

async function renderThump(sr: number, lite: boolean): Promise<AudioBuffer> {
  const dur = 0.9;
  const dsp = thumpDSP(sr, dur, 777, lite);
  const ctx = createOffline(2, dur, sr);
  const b = ctx.createBuffer(2, dsp[0].length, sr);
  b.getChannelData(0).set(dsp[0]);
  b.getChannelData(1).set(dsp[1]);
  const s = ctx.createBufferSource();
  s.buffer = b;
  const g = ctx.createGain();
  s.connect(g);
  space(ctx, g, 0.18, 0.7);
  s.start(0);
  return normalize(await ctx.startRendering(), 0.8);
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
  await tick();
  // crowd vocals (Tribe mode): chants, sing-along, jump landings, scream
  const defqon: AudioBuffer[] = [];
  for (let i = 0; i < 2; i++) defqon.push(await renderChant(srLow, 3100 + i * 13, lite, 'defqon'));
  emit('defqon', defqon);
  await tick();
  const singalong: AudioBuffer[] = [];
  for (let i = 0; i < (lite ? 1 : 2); i++) singalong.push(await renderSing(srLow, 3300 + i * 29, lite));
  emit('singalong', singalong);
  await tick();
  const thump = await renderThump(srLow, lite);
  emit('thump', thump);
  await tick();
  const onetribe: AudioBuffer[] = [];
  for (let i = 0; i < 2; i++) onetribe.push(await renderChant(srLow, 3500 + i * 17, lite, 'onetribe'));
  emit('onetribe', onetribe);
  await tick();
  const scream = [await renderScream(srHigh, 3700, lite)];
  emit('scream', scream);
  return { murmur, roar, applause, cheers, whistles, wind, defqon, onetribe, singalong, scream, thump };
}
