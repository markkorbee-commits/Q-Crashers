/**
 * Small, dependency-free audio helpers shared by the synth, the ambience and the analyzer.
 * Everything that creates sample data is seeded (deterministic) and runs once at load time.
 */
import { Rng } from '../core/rng';

export const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** tanh-style soft clip curve for a WaveShaperNode (`drive` > 1 = more saturation) */
export function softClipCurve(drive: number, n = 2048): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n);
  const norm = Math.tanh(drive);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * drive) / norm;
  }
  return c;
}

/** asymmetric "hard" clip curve (more even harmonics, the hardstyle kick crunch) */
export function hardClipCurve(drive: number, asym = 0.18, n = 4096): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const y = x * drive + asym * x * x * drive;
    // smooth-ish knee: x / (1 + |x|^k)^(1/k)
    const k = 2.6;
    c[i] = y / Math.pow(1 + Math.pow(Math.abs(y), k), 1 / k);
  }
  // remove DC introduced by the asymmetry
  const mid = c[(n - 1) >> 1];
  for (let i = 0; i < n; i++) c[i] -= mid;
  return c;
}

/** white noise buffer (mono or stereo, decorrelated channels) */
export function noiseBuffer(ctx: BaseAudioContext, seconds: number, channels = 1, seed = 1, color: 'white' | 'pink' | 'brown' = 'white'): AudioBuffer {
  const len = Math.max(1, Math.floor(seconds * ctx.sampleRate));
  const buf = ctx.createBuffer(channels, len, ctx.sampleRate);
  for (let ch = 0; ch < channels; ch++) {
    const d = buf.getChannelData(ch);
    fillNoise(d, seed * 7919 + ch * 104729, color);
  }
  return buf;
}

export function fillNoise(d: Float32Array, seed: number, color: 'white' | 'pink' | 'brown'): void {
  const rng = new Rng(seed);
  if (color === 'white') {
    for (let i = 0; i < d.length; i++) d[i] = rng.next() * 2 - 1;
    return;
  }
  if (color === 'brown') {
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = (last + 0.02 * (rng.next() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    return;
  }
  // pink (Paul Kellet's economy filter)
  let b0 = 0,
    b1 = 0,
    b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = rng.next() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
  }
}

/**
 * Procedural stereo reverb impulse response: early reflections + exponentially decaying noise
 * that darkens over time (air/foliage damping). `seconds` = RT60-ish length.
 */
export function reverbIR(ctx: BaseAudioContext, seconds: number, opts: { seed?: number; predelay?: number; damping?: number; early?: number } = {}): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * (seconds + (opts.predelay ?? 0.01)));
  const buf = ctx.createBuffer(2, len, sr);
  const pre = Math.floor((opts.predelay ?? 0.01) * sr);
  const damping = opts.damping ?? 0.6;
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    const rng = new Rng((opts.seed ?? 3) * 31 + ch * 977);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr;
      const env = Math.exp((-6.9 * t) / seconds);
      // low-pass coefficient closes over time -> darker tail
      const a = Math.min(0.97, 0.08 + damping * (t / seconds));
      lp = lp * a + (rng.next() * 2 - 1) * (1 - a);
      d[i] = lp * env * (1 + a * 1.4);
    }
    // early reflections
    const nEarly = Math.floor((opts.early ?? 1) * 10);
    for (let k = 0; k < nEarly; k++) {
      const at = pre + Math.floor((0.004 + rng.next() * 0.07) * sr);
      if (at < len) d[at] += (rng.next() < 0.5 ? -1 : 1) * (0.5 - k * 0.035);
    }
  }
  return buf;
}

/** In-place: make a buffer loop seamlessly by cross-fading its last `fade` seconds into its start, then trimming. */
export function makeLoop(ctx: BaseAudioContext, src: AudioBuffer, fade: number): AudioBuffer {
  const sr = src.sampleRate;
  const f = Math.floor(fade * sr);
  const len = src.length - f;
  const out = ctx.createBuffer(src.numberOfChannels, len, sr);
  for (let ch = 0; ch < src.numberOfChannels; ch++) {
    const s = src.getChannelData(ch);
    const d = out.getChannelData(ch);
    d.set(s.subarray(0, len));
    for (let i = 0; i < f; i++) {
      const k = i / f;
      // equal power
      const a = Math.cos(k * Math.PI * 0.5);
      const b = Math.sin(k * Math.PI * 0.5);
      d[i] = s[len + i] * a + s[i] * b;
    }
  }
  return out;
}

/** peak-normalise a buffer to `peak` (in place) */
export function normalize(buf: AudioBuffer, peak = 0.9): AudioBuffer {
  let m = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > m) m = a;
    }
  }
  if (m < 1e-9) return buf;
  const g = peak / m;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) d[i] *= g;
  }
  return buf;
}

/**
 * Copy without the trailing part that stays below `thresholdDb` (re peak), with a short fade.
 * Shorter one-shots = fewer simultaneously playing buffer sources (they are not free).
 */
export function trimTail(ctx: BaseAudioContext, buf: AudioBuffer, thresholdDb = -60, fade = 0.02): AudioBuffer {
  let peak = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  }
  const thr = peak * Math.pow(10, thresholdDb / 20);
  let last = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = d.length - 1; i > last; i--) {
      if (Math.abs(d[i]) > thr) {
        last = i;
        break;
      }
    }
  }
  const sr = buf.sampleRate;
  const len = Math.min(buf.length, last + Math.floor(fade * sr) + 1);
  if (len >= buf.length - 16) return buf;
  const out = ctx.createBuffer(buf.numberOfChannels, len, sr);
  const f = Math.floor(fade * sr);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = out.getChannelData(ch);
    d.set(buf.getChannelData(ch).subarray(0, len));
    for (let i = 0; i < f; i++) d[len - 1 - i] *= i / f;
  }
  return out;
}

/** reversed copy */
export function reversed(ctx: BaseAudioContext, src: AudioBuffer): AudioBuffer {
  const out = ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate);
  for (let ch = 0; ch < src.numberOfChannels; ch++) {
    const s = src.getChannelData(ch);
    const d = out.getChannelData(ch);
    for (let i = 0, n = s.length; i < n; i++) d[i] = s[n - 1 - i];
  }
  return out;
}

/** Create an OfflineAudioContext, falling back to a supported sample rate on older engines. */
export function createOffline(channels: number, seconds: number, sampleRate: number): OfflineAudioContext {
  const tryRates = [sampleRate, 22050, 44100, 48000];
  let lastErr: unknown = null;
  for (const sr of tryRates) {
    try {
      return new OfflineAudioContext(channels, Math.max(1, Math.ceil(seconds * sr)), sr);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('OfflineAudioContext unavailable');
}

/** Encode an AudioBuffer (or raw channels) as 16-bit PCM WAV. */
export function encodeWav(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  const n = channels[0]?.length ?? 0;
  const nc = channels.length;
  const out = new ArrayBuffer(44 + n * nc * 2);
  const v = new DataView(out);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, 'RIFF');
  v.setUint32(4, 36 + n * nc * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, nc, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * nc * 2, true);
  v.setUint16(32, nc * 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, n * nc * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nc; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return out;
}

/** Stop + disconnect a scheduled source safely (ignores InvalidStateError). */
export function killSource(src: AudioScheduledSourceNode, when: number): void {
  try {
    src.stop(when);
  } catch {
    /* not started or already stopped */
  }
}
