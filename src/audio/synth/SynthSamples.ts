/**
 * One-shot samples for the rehearsal synth, rendered ONCE at load time with OfflineAudioContexts
 * (heavy sound design — distortion with 4x oversampling, convolution tails — costs nothing at
 * playback time: every hit is a single AudioBufferSourceNode).
 */
import { createOffline, hardClipCurve, midiToHz, noiseBuffer, normalize, reverbIR, reversed, softClipCurve, trimTail } from '../audioUtils';

export interface SynthSamples {
  /** hardstyle kicks keyed by tail MIDI note */
  kicks: Map<number, AudioBuffer>;
  snare: AudioBuffer;
  clap: AudioBuffer;
  hatClosed: AudioBuffer;
  hatOpen: AudioBuffer;
  crash: AudioBuffer;
  reverseCrash: AudioBuffer;
  impact: AudioBuffer;
  /** timpani tuned to A2 (MIDI 45); pitch with playbackRate */
  timpani: AudioBuffer;
  /** 2 s stereo white noise (risers) */
  noise: AudioBuffer;
  /** arp pluck multi-samples at PLUCK_BASE + i * PLUCK_STEP */
  plucks: AudioBuffer[];
}

const PLUCK_BASE = 45;
const PLUCK_STEP = 4;
const PLUCK_COUNT = 13;

/** nearest pluck sample + playback rate for a MIDI note */
export function pluckFor(s: SynthSamples, midi: number): { buf: AudioBuffer; rate: number } {
  const i = Math.max(0, Math.min(s.plucks.length - 1, Math.round((midi - PLUCK_BASE) / PLUCK_STEP)));
  const base = PLUCK_BASE + i * PLUCK_STEP;
  return { buf: s.plucks[i], rate: Math.pow(2, (midi - base) / 12) };
}

/** bright euphoric pluck: detuned saw + square through an enveloped resonant low-pass */
async function renderPluck(midi: number, sr: number): Promise<AudioBuffer> {
  const ctx = createOffline(1, 0.42, sr);
  const hz = midiToHz(midi);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 3.2;
  lp.frequency.setValueAtTime(Math.min(sr * 0.45, 7200), 0);
  lp.frequency.exponentialRampToValueAtTime(Math.max(700, hz * 1.6), 0.24);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, 0);
  env.gain.linearRampToValueAtTime(1, 0.003);
  env.gain.exponentialRampToValueAtTime(0.25, 0.12);
  env.gain.exponentialRampToValueAtTime(0.0008, 0.4);
  for (const [type, det] of [
    ['sawtooth', -7],
    ['sawtooth', 7],
    ['square', 0],
  ] as [OscillatorType, number][]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = hz;
    o.detune.value = det;
    const g = ctx.createGain();
    g.gain.value = type === 'square' ? 0.5 : 0.6;
    o.connect(g).connect(lp);
    o.start(0);
    o.stop(0.42);
  }
  lp.connect(env).connect(ctx.destination);
  return normalize(await render(ctx), 0.8);
}

/** map a key's pitch class to the kick tail note (43.6 Hz .. 87 Hz) */
export function kickTailMidi(rootMidi: number): number {
  let m = 24 + (((rootMidi % 12) + 12) % 12);
  while (midiToHz(m) < 43) m += 12;
  return m;
}

async function render(ctx: OfflineAudioContext): Promise<AudioBuffer> {
  return ctx.startRendering();
}

function noiseSrc(ctx: BaseAudioContext, seconds: number, seed: number, channels = 1): AudioBufferSourceNode {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer(ctx, seconds, channels, seed);
  return s;
}

/**
 * Punchy distorted hardstyle kick: pitch-swept sine (4 kHz -> tail note), transient click,
 * asymmetric waveshaper (4x oversampled), presence EQ, a second soft clip and a short room tail.
 * The kick itself stays short (~0.24 s) — the offbeat reverse bass fills the rest of the beat.
 */
export async function renderKick(tailMidi: number, sr: number): Promise<AudioBuffer> {
  const tail = midiToHz(tailMidi);
  const ctx = createOffline(1, 0.62, sr);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const f = osc.frequency;
  f.setValueAtTime(4200, 0);
  f.exponentialRampToValueAtTime(420, 0.006);
  f.exponentialRampToValueAtTime(tail * 2.3, 0.024);
  f.exponentialRampToValueAtTime(tail * 1.12, 0.07);
  f.exponentialRampToValueAtTime(tail, 0.14);
  f.linearRampToValueAtTime(tail * 0.93, 0.3);
  const amp = ctx.createGain();
  const g = amp.gain;
  g.setValueAtTime(0, 0);
  g.linearRampToValueAtTime(1, 0.0006);
  g.setValueAtTime(1, 0.05);
  g.exponentialRampToValueAtTime(0.78, 0.11);
  g.exponentialRampToValueAtTime(0.42, 0.19);
  g.exponentialRampToValueAtTime(0.02, 0.255);
  g.linearRampToValueAtTime(0, 0.27);
  const pre = ctx.createGain();
  pre.gain.value = 2.6;
  const shaper = ctx.createWaveShaper();
  shaper.curve = hardClipCurve(1.5, 0.22);
  shaper.oversample = '4x';
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2600;
  presence.Q.value = 0.9;
  presence.gain.value = 3.5;
  const body = ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = tail * 1.05;
  body.Q.value = 1.1;
  body.gain.value = 3;
  const shaper2 = ctx.createWaveShaper();
  shaper2.curve = softClipCurve(1.7);
  shaper2.oversample = '2x';
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 9500;
  lp.Q.value = 0.5;
  osc.connect(amp).connect(pre).connect(shaper).connect(presence).connect(body).connect(shaper2).connect(lp);

  // transient click: a tiny noise burst + a 1.9 kHz blip
  const click = noiseSrc(ctx, 0.02, 11);
  const clickHp = ctx.createBiquadFilter();
  clickHp.type = 'highpass';
  clickHp.frequency.value = 1800;
  const clickEnv = ctx.createGain();
  clickEnv.gain.setValueAtTime(0.55, 0);
  clickEnv.gain.exponentialRampToValueAtTime(0.001, 0.006);
  click.connect(clickHp).connect(clickEnv);
  const blip = ctx.createOscillator();
  blip.frequency.value = 1900;
  const blipEnv = ctx.createGain();
  blipEnv.gain.setValueAtTime(0.35, 0);
  blipEnv.gain.exponentialRampToValueAtTime(0.001, 0.008);
  blip.connect(blipEnv);

  const sum = ctx.createGain();
  lp.connect(sum);
  clickEnv.connect(sum);
  blipEnv.connect(sum);
  // short room tail
  const conv = ctx.createConvolver();
  conv.buffer = reverbIR(ctx, 0.32, { seed: 5, predelay: 0.004, damping: 0.8 });
  const wet = ctx.createGain();
  wet.gain.value = 0.16;
  const wetLp = ctx.createBiquadFilter();
  wetLp.type = 'lowpass';
  wetLp.frequency.value = 2400;
  sum.connect(ctx.destination);
  sum.connect(conv).connect(wetLp).connect(wet).connect(ctx.destination);
  osc.start(0);
  osc.stop(0.3);
  click.start(0);
  blip.start(0);
  blip.stop(0.02);
  return normalize(await render(ctx), 0.9);
}

async function renderSnare(sr: number): Promise<AudioBuffer> {
  const ctx = createOffline(2, 0.9, sr);
  const tone = ctx.createOscillator();
  tone.type = 'triangle';
  tone.frequency.setValueAtTime(230, 0);
  tone.frequency.exponentialRampToValueAtTime(175, 0.05);
  const tEnv = ctx.createGain();
  tEnv.gain.setValueAtTime(0.9, 0);
  tEnv.gain.exponentialRampToValueAtTime(0.001, 0.13);
  const n = noiseSrc(ctx, 0.4, 21);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1100;
  const bp = ctx.createBiquadFilter();
  bp.type = 'peaking';
  bp.frequency.value = 4200;
  bp.gain.value = 4;
  const nEnv = ctx.createGain();
  nEnv.gain.setValueAtTime(0.8, 0);
  nEnv.gain.exponentialRampToValueAtTime(0.001, 0.2);
  const sum = ctx.createGain();
  tone.connect(tEnv).connect(sum);
  n.connect(hp).connect(bp).connect(nEnv).connect(sum);
  const conv = ctx.createConvolver();
  conv.buffer = reverbIR(ctx, 0.7, { seed: 7 });
  const wet = ctx.createGain();
  wet.gain.value = 0.3;
  sum.connect(ctx.destination);
  sum.connect(conv).connect(wet).connect(ctx.destination);
  tone.start(0);
  tone.stop(0.2);
  n.start(0);
  return normalize(await render(ctx), 0.85);
}

async function renderClap(sr: number): Promise<AudioBuffer> {
  const ctx = createOffline(2, 1.1, sr);
  const n = noiseSrc(ctx, 0.5, 31);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1250;
  bp.Q.value = 0.9;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 600;
  const env = ctx.createGain();
  const g = env.gain;
  g.setValueAtTime(0, 0);
  for (const t0 of [0, 0.011, 0.022]) {
    g.setValueAtTime(1, t0);
    g.exponentialRampToValueAtTime(0.08, t0 + 0.009);
  }
  g.setValueAtTime(0.9, 0.033);
  g.exponentialRampToValueAtTime(0.001, 0.22);
  n.connect(hp).connect(bp).connect(env);
  const conv = ctx.createConvolver();
  conv.buffer = reverbIR(ctx, 0.9, { seed: 9, predelay: 0.012 });
  const wet = ctx.createGain();
  wet.gain.value = 0.42;
  env.connect(ctx.destination);
  env.connect(conv).connect(wet).connect(ctx.destination);
  n.start(0);
  return normalize(await render(ctx), 0.85);
}

/** 808-style metallic partials (inharmonic squares) */
function metal(ctx: BaseAudioContext, base: number, dest: AudioNode, stop: number) {
  for (const r of [2, 3, 4.16, 5.43, 6.79, 8.21]) {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = base * r;
    o.connect(dest);
    o.start(0);
    o.stop(stop);
  }
}

async function renderHat(sr: number, decay: number, seed: number): Promise<AudioBuffer> {
  const ctx = createOffline(1, decay + 0.05, sr);
  const mix = ctx.createGain();
  mix.gain.value = 0.18;
  metal(ctx, 42, mix, decay + 0.05);
  const n = noiseSrc(ctx, decay + 0.05, seed);
  const ng = ctx.createGain();
  ng.gain.value = 0.7;
  n.connect(ng).connect(mix);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7200;
  const bp = ctx.createBiquadFilter();
  bp.type = 'peaking';
  bp.frequency.value = 10500;
  bp.gain.value = 5;
  const env = ctx.createGain();
  env.gain.setValueAtTime(1, 0);
  env.gain.exponentialRampToValueAtTime(0.001, decay);
  mix.connect(hp).connect(bp).connect(env).connect(ctx.destination);
  n.start(0);
  return normalize(await render(ctx), 0.8);
}

async function renderCrash(sr: number): Promise<AudioBuffer> {
  const ctx = createOffline(2, 3.4, sr);
  const merger = ctx.createChannelMerger(2);
  for (let ch = 0; ch < 2; ch++) {
    const mix = ctx.createGain();
    mix.gain.value = 0.12;
    metal(ctx, 118 + ch * 7, mix, 3.4);
    const n = noiseSrc(ctx, 3.4, 41 + ch);
    const ng = ctx.createGain();
    ng.gain.value = 0.8;
    n.connect(ng).connect(mix);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3800;
    const sh = ctx.createBiquadFilter();
    sh.type = 'highshelf';
    sh.frequency.value = 9000;
    sh.gain.value = -4;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, 0);
    env.gain.linearRampToValueAtTime(1, 0.003);
    env.gain.exponentialRampToValueAtTime(0.35, 0.25);
    env.gain.exponentialRampToValueAtTime(0.001, 3.3);
    mix.connect(hp).connect(sh).connect(env).connect(merger, 0, ch);
    n.start(0);
  }
  merger.connect(ctx.destination);
  return normalize(await render(ctx), 0.8);
}

/** cinematic impact: sub drop + noise thump + long dark tail */
async function renderImpact(sr: number): Promise<AudioBuffer> {
  const ctx = createOffline(2, 4.2, sr);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, 0);
  o.frequency.exponentialRampToValueAtTime(48, 0.25);
  o.frequency.exponentialRampToValueAtTime(29, 1.6);
  const oe = ctx.createGain();
  oe.gain.setValueAtTime(0, 0);
  oe.gain.linearRampToValueAtTime(1, 0.004);
  oe.gain.exponentialRampToValueAtTime(0.5, 0.5);
  oe.gain.exponentialRampToValueAtTime(0.001, 2.4);
  const sh = ctx.createWaveShaper();
  sh.curve = softClipCurve(2.2);
  const n = noiseSrc(ctx, 1, 51, 2);
  const nlp = ctx.createBiquadFilter();
  nlp.type = 'lowpass';
  nlp.frequency.setValueAtTime(3000, 0);
  nlp.frequency.exponentialRampToValueAtTime(200, 0.4);
  const ne = ctx.createGain();
  ne.gain.setValueAtTime(0.7, 0);
  ne.gain.exponentialRampToValueAtTime(0.001, 0.6);
  const sum = ctx.createGain();
  o.connect(oe).connect(sh).connect(sum);
  n.connect(nlp).connect(ne).connect(sum);
  const conv = ctx.createConvolver();
  conv.buffer = reverbIR(ctx, 3.4, { seed: 13, predelay: 0.02, damping: 0.9 });
  const wet = ctx.createGain();
  wet.gain.value = 0.45;
  sum.connect(ctx.destination);
  sum.connect(conv).connect(wet).connect(ctx.destination);
  o.start(0);
  o.stop(2.5);
  n.start(0);
  return normalize(await render(ctx), 0.85);
}

async function renderTimpani(sr: number): Promise<AudioBuffer> {
  const ctx = createOffline(2, 2.8, sr);
  const f0 = midiToHz(45);
  const sum = ctx.createGain();
  const modes: [number, number, number][] = [
    [1, 1, 1.6],
    [1.5, 0.45, 0.9],
    [1.99, 0.28, 0.6],
    [2.44, 0.14, 0.4],
  ];
  for (const [r, a, d] of modes) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f0 * r * 1.04, 0);
    o.frequency.exponentialRampToValueAtTime(f0 * r, 0.08);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, 0);
    e.gain.linearRampToValueAtTime(a, 0.004);
    e.gain.exponentialRampToValueAtTime(0.001, d);
    o.connect(e).connect(sum);
    o.start(0);
    o.stop(d + 0.05);
  }
  const n = noiseSrc(ctx, 0.2, 61);
  const nlp = ctx.createBiquadFilter();
  nlp.type = 'lowpass';
  nlp.frequency.value = 1400;
  const ne = ctx.createGain();
  ne.gain.setValueAtTime(0.5, 0);
  ne.gain.exponentialRampToValueAtTime(0.001, 0.05);
  n.connect(nlp).connect(ne).connect(sum);
  const conv = ctx.createConvolver();
  conv.buffer = reverbIR(ctx, 2.2, { seed: 17, predelay: 0.018 });
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  sum.connect(ctx.destination);
  sum.connect(conv).connect(wet).connect(ctx.destination);
  n.start(0);
  return normalize(await render(ctx), 0.85);
}

/** Render every sample the synth needs. `roots` = tonic MIDI notes of the styles in use. */
export async function renderSynthSamples(sr: number, roots: number[]): Promise<SynthSamples> {
  const tails = [...new Set(roots.map(kickTailMidi))];
  const kickBufs = await Promise.all(tails.map((m) => renderKick(m, sr)));
  const kicks = new Map<number, AudioBuffer>();
  tails.forEach((m, i) => kicks.set(m, kickBufs[i]));
  const [snare, clap, hatClosed, hatOpen, crash, impact, timpani] = await Promise.all([
    renderSnare(sr),
    renderClap(sr),
    renderHat(sr, 0.05, 71),
    renderHat(sr, 0.26, 73),
    renderCrash(sr),
    renderImpact(sr),
    renderTimpani(sr),
  ]);
  // reverse cymbal: first 2 s of the crash, reversed, with a soft fade-in
  const tmp = createOffline(2, 2, sr);
  const head = tmp.createBuffer(2, Math.min(crash.length, Math.floor(2 * sr)), sr);
  for (let ch = 0; ch < 2; ch++) head.getChannelData(ch).set(crash.getChannelData(ch).subarray(0, head.length));
  const reverseCrash = reversed(tmp, head);
  for (let ch = 0; ch < 2; ch++) {
    const d = reverseCrash.getChannelData(ch);
    const fade = Math.floor(0.4 * sr);
    for (let i = 0; i < fade && i < d.length; i++) d[i] *= i / fade;
  }
  const noise = noiseBuffer(tmp, 2, 2, 99);
  const plucks = (await Promise.all(Array.from({ length: PLUCK_COUNT }, (_, i) => renderPluck(PLUCK_BASE + i * PLUCK_STEP, sr)))).map((b) => trimTail(tmp, b, -54));
  for (const [k, b] of kicks) kicks.set(k, trimTail(tmp, b, -56));
  return {
    kicks,
    snare: trimTail(tmp, snare, -56),
    clap: trimTail(tmp, clap, -56),
    hatClosed: trimTail(tmp, hatClosed, -50),
    hatOpen: trimTail(tmp, hatOpen, -52),
    crash: trimTail(tmp, crash, -58),
    reverseCrash,
    impact: trimTail(tmp, impact, -58),
    timpani: trimTail(tmp, timpani, -58),
    noise,
    plucks,
  };
}
