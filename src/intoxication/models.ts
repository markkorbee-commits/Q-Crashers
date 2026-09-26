/**
 * Pure models behind the educational perception simulation (no rendering, no allocation per frame).
 * Numbers are simplified from public health sources (Trimbos-instituut, Jellinek, NIDA) and tuned for a
 * readable, time-compressed experience — they are illustrative, not medical predictions.
 */
import { RISK_MESSAGES } from './education';

// ---------------------------------------------------------------- alcohol (Widmark)

/** simulated body mass (kg) */
export const BODY_MASS_KG = 75;
/** Widmark distribution factor (average adult) */
export const WIDMARK_R = 0.62;
/** elimination, promille per simulated hour */
export const ELIMINATION_PER_H = 0.15;
/** first-order absorption rate from the stomach, per simulated hour (half-life ~10 min) */
export const ABSORPTION_PER_H = 4;
/** 1 real minute = 10 simulated minutes */
export const TIME_COMPRESSION = 10;

/** Piecewise-linear lookup in a flat [x0, y0, x1, y1, ...] table, clamped at both ends. */
export function table(t: readonly number[], x: number): number {
  if (x <= t[0]) return t[1];
  for (let i = 2; i < t.length; i += 2) {
    if (x <= t[i]) {
      const x0 = t[i - 2];
      const y0 = t[i - 1];
      return y0 + ((t[i + 1] - y0) * (x - x0)) / (t[i] - x0);
    }
  }
  return t[t.length - 1];
}

/** perception effect strength: `strong` (default) exaggerates for visibility, `realistic` is the round-6 look */
export type PerceptionStrength = 'strong' | 'realistic';

/**
 * Effect strength per BAC (promille), following the design-bible tiers 0.2 / 0.5 / 0.8 / 1.2 / 1.6 / 2.0+.
 * Real 0.5–1.6‰ impairment is mostly slowed pursuit and saccades, lost glare recovery, a narrowed field
 * and double vision that comes and goes — not myopic blur. So the static blur stays low; the weight is on
 * tracking lag (motion smear, input lag), glare persistence (afterimage), refocus blur after fast head turns
 * (added live by the PerceptionSystem), intermittent diplopia and nystagmus.
 * This is the `realistic` preset (unchanged since round 6); `ALCOHOL_FX_STRONG` exaggerates it for visibility.
 */
export const ALCOHOL_FX_REALISTIC = {
  blur: [0.25, 0, 0.5, 0.03, 0.8, 0.08, 1.2, 0.15, 1.6, 0.22, 2.0, 0.3, 3.0, 0.42],
  /** strength of a double-vision episode (ghost 0.5–1.5°) */
  doubleVision: [0.7, 0, 1.0, 0.18, 1.2, 0.32, 1.6, 0.52, 2.0, 0.7, 3.0, 0.9],
  /** share of the time fusion is lost (0 = never, 1 = persistent double image at 2.8‰+) */
  diplopiaDuty: [0.8, 0, 1.2, 0.3, 1.6, 0.5, 2.0, 0.75, 2.8, 1],
  chroma: [0.4, 0, 0.8, 0.07, 1.2, 0.12, 1.6, 0.18, 2.0, 0.24],
  wobble: [0.15, 0, 0.5, 0.1, 0.8, 0.2, 1.2, 0.34, 1.6, 0.48, 2.0, 0.6, 3.0, 0.75],
  /** narrowed field: a darker, softer periphery (tunnel mask), a heavy vignette at 2‰ */
  tunnel: [0.4, 0, 0.8, 0.16, 1.2, 0.28, 1.6, 0.42, 2.0, 0.58, 3.0, 0.78],
  contrast: [0.1, 1, 0.2, 0.96, 0.5, 0.91, 0.8, 0.88, 1.2, 0.85, 1.6, 0.81, 2.0, 0.77],
  saturation: [0.8, 1, 1.6, 0.9, 2.0, 0.8, 2.8, 0.68],
  exposure: [1.0, 1, 2.0, 0.92, 3.0, 0.85],
  /** smear of moving things (pursuit gain −22 % at ~0.55‰) */
  motionBlur: [0.3, 0, 0.5, 0.14, 0.8, 0.26, 1.2, 0.38, 1.6, 0.5, 2.0, 0.62],
  /** glare from strobes / pyro persists (bleached retina recovers slowly) */
  afterimage: [0.5, 0, 0.8, 0.3, 1.6, 0.5, 2.5, 0.56],
  /** poorer glare recovery: bloom threshold drops (halos), no star streaks */
  lightSensitivity: [0.5, 0, 0.8, 0.1, 1.6, 0.2, 2.5, 0.26],
  /** bright moving things leave a short smear */
  trails: [0.5, 0, 1.2, 0.3, 2.0, 0.45],
  sway: [0.1, 0, 0.2, 0.05, 0.5, 0.15, 0.8, 0.3, 1.2, 0.5, 1.6, 0.7, 2.0, 0.88, 3.0, 1],
  /** reaction / follow lag (s): +40 ms at 0.2‰, +80 ms at 0.5‰, +120 ms at 0.8‰ ... */
  inputLag: [0.1, 0, 0.2, 0.04, 0.5, 0.08, 0.8, 0.12, 1.2, 0.18, 1.6, 0.25, 2.0, 0.32, 3.0, 0.45],
  balance: [0.4, 0, 0.8, 0.2, 1.2, 0.45, 1.6, 0.7, 2.0, 0.9, 3.0, 1],
  lookJitter: [0.3, 0, 0.5, 0.06, 0.8, 0.14, 1.2, 0.25, 1.6, 0.38, 2.0, 0.5],
  /** "needs help to stand or walk" from 2‰ */
  speedScale: [0.5, 1, 0.8, 0.96, 1.2, 0.88, 1.6, 0.78, 2.0, 0.6, 2.5, 0.42, 3.0, 0.3],
  muffle: [0.2, 0, 0.5, 0.1, 0.8, 0.22, 1.2, 0.4, 1.6, 0.55, 2.0, 0.7],
  audioWobble: [0.5, 0, 0.8, 0.12, 1.2, 0.3, 1.6, 0.5, 2.0, 0.65],
  /** stumble events per real minute (while walking below 2‰, also standing from 2‰) */
  stumbleRate: [1.1, 0, 1.2, 0.8, 1.6, 1.6, 2.0, 3.2, 2.5, 5],
  /** memory gaps (1–3 s of lost time) per real minute */
  gapRate: [1.5, 0, 1.6, 0.8, 2.0, 1.4, 2.5, 2.2],
  /** memory gap length (s) */
  gapLength: [1.6, 1.1, 2.0, 1.8, 2.5, 2.8],
  /** gaze-evoked nystagmus amplitude (deg) at lateral gaze / after head turns */
  nystagmus: [1.0, 0, 1.2, 0.25, 1.6, 0.45, 2.0, 0.6],
  /** "the spins" while standing still: amplitude of the sideways creep (deg); off in this preset */
  spins: [0, 0],
  /** the world lags behind a head turn and overshoots: maximum offset (deg); off in this preset */
  overshoot: [0, 0],
  /** music stereo width multiplier (1 = unchanged) */
  width: [0, 1],
  /** music level (dB) */
  musicDb: [0, 0],
};

export type AlcoholFx = { readonly [K in keyof typeof ALCOHOL_FX_REALISTIC]: readonly number[] };

/**
 * `strong` preset (round 7): today's 1.6‰ look arrives at about 1.0‰ and today's 2.0‰ look at about 1.6‰,
 * the level players can actually reach at the bars. Outcome tables (stumbles, memory gaps) and the motor
 * tables for exposure, balance, input lag and walking speed are shared with the realistic preset.
 */
export const ALCOHOL_FX_STRONG: AlcoholFx = {
  ...ALCOHOL_FX_REALISTIC,
  blur: [0.25, 0, 0.5, 0.06, 0.8, 0.14, 1.0, 0.19, 1.2, 0.24, 1.6, 0.34, 2.0, 0.44, 3.0, 0.55],
  doubleVision: [0.2, 0, 0.5, 0.15, 0.8, 0.3, 1.0, 0.42, 1.2, 0.55, 1.6, 0.75, 2.0, 0.9, 3.0, 1.0],
  diplopiaDuty: [0.2, 0, 0.5, 0.15, 0.8, 0.3, 1.0, 0.45, 1.2, 0.6, 1.6, 0.8, 2.0, 0.95, 3.0, 1],
  chroma: [0.2, 0, 0.5, 0.1, 0.8, 0.2, 1.0, 0.26, 1.2, 0.32, 1.6, 0.45, 2.0, 0.55, 3.0, 0.6],
  wobble: [0.1, 0, 0.2, 0.08, 0.5, 0.2, 0.8, 0.38, 1.0, 0.48, 1.2, 0.58, 1.6, 0.72, 2.0, 0.85, 3.0, 1.0],
  tunnel: [0.25, 0, 0.5, 0.1, 0.8, 0.28, 1.0, 0.36, 1.2, 0.45, 1.6, 0.6, 2.0, 0.72, 3.0, 0.85],
  contrast: [0.1, 1, 0.2, 0.96, 0.5, 0.9, 0.8, 0.86, 1.0, 0.83, 1.2, 0.8, 1.6, 0.75, 2.0, 0.7, 3.0, 0.66],
  saturation: [0.5, 1, 0.8, 0.97, 1.0, 0.94, 1.2, 0.91, 1.6, 0.84, 2.0, 0.74, 3.0, 0.62],
  motionBlur: [0.3, 0, 0.5, 0.22, 0.8, 0.34, 1.0, 0.4, 1.2, 0.45, 1.6, 0.55, 2.0, 0.65],
  afterimage: [0.5, 0, 0.8, 0.4, 1.0, 0.45, 1.2, 0.52, 1.6, 0.62, 2.0, 0.66, 3.0, 0.7],
  lightSensitivity: [0.5, 0, 0.8, 0.15, 1.0, 0.19, 1.2, 0.22, 1.6, 0.3, 2.0, 0.34, 3.0, 0.38],
  trails: [0.5, 0, 0.8, 0.5, 1.0, 0.6, 1.2, 0.7, 1.6, 0.8, 2.0, 0.85],
  nystagmus: [0.8, 0, 1.0, 0.3, 1.2, 0.8, 1.6, 1.2, 2.0, 1.5],
  spins: [0.9, 0, 1.0, 0.5, 1.2, 1.5, 1.6, 3.0, 2.0, 4.5],
  overshoot: [0.3, 0, 0.5, 0.15, 0.8, 0.4, 1.0, 0.6, 1.2, 0.8, 1.6, 1.3, 2.0, 1.8],
  sway: [0.1, 0, 0.2, 0.1, 0.5, 0.25, 0.8, 0.45, 1.0, 0.55, 1.2, 0.65, 1.6, 0.85, 2.0, 1.0],
  lookJitter: [0.3, 0, 0.5, 0.1, 0.8, 0.22, 1.0, 0.3, 1.2, 0.38, 1.6, 0.55, 2.0, 0.7],
  muffle: [0.1, 0, 0.2, 0.05, 0.5, 0.3, 0.8, 0.42, 1.0, 0.5, 1.2, 0.58, 1.6, 0.68, 2.0, 0.75],
  audioWobble: [0.5, 0, 0.8, 0.3, 1.0, 0.43, 1.2, 0.55, 1.6, 0.75, 2.0, 0.9],
  width: [0.5, 1, 0.8, 0.92, 1.0, 0.86, 1.2, 0.8, 1.6, 0.7, 2.0, 0.62, 3.0, 0.55],
  musicDb: [0.5, 0, 0.8, -0.5, 1.0, -1, 1.2, -1.5, 1.6, -2.5, 2.0, -3],
};

/** the alcohol tables of a preset */
export const ALCOHOL_FX_BY: Record<PerceptionStrength, AlcoholFx> = { strong: ALCOHOL_FX_STRONG, realistic: ALCOHOL_FX_REALISTIC };

/** compat: the realistic tables (the outcome tables stumbleRate / gapRate / gapLength are the same in both presets) */
export const ALCOHOL_FX: AlcoholFx = ALCOHOL_FX_REALISTIC;

/**
 * XTC effect gains per preset (x = intensity, n = nausea, d = drained, dz = dazzle, kp = kick pulse).
 * `realistic` holds the round-6 values.
 */
export interface XtcGains {
  sat: number;
  warmth: number;
  exp: number;
  expDazzle: number;
  ls: number;
  bloom: number;
  star: number;
  veilBase: number;
  veilDazzle: number;
  glow: number;
  trails: number;
  after: number;
  chroma: number;
  blur: number;
  wobble: number;
  /** nystagmus (deg) */
  nyst: number;
  /** jaw-clench shake (screen heights) */
  jaw: number;
  kickExp: number;
  kickBloom: number;
  kickSat: number;
  kickZoom: number;
  jitter: number;
  sway: number;
  nSat: number;
  nExp: number;
  nTint: number;
  nWobble: number;
  nBlur: number;
  nTunnel: number;
  nSway: number;
  nMuffle: number;
  nAudioWobble: number;
  dSat: number;
  dContrast: number;
  dExp: number;
  dWarmth: number;
  dSpeed: number;
  dLag: number;
  dMuffle: number;
  dWidth: number;
  dMusicDb: number;
  dHighShelf: number;
  /** music (x): high shelf dB, low shelf dB, width gain (x 1 + widthGain·x), level dB */
  aHighShelf: number;
  aLowShelf: number;
  aWidth: number;
  aMusicDb: number;
  /** share of the distance-model level drop removed at x = 1 (the music feels closer) */
  aDistDrop: number;
}

export const XTC_GAINS: Record<PerceptionStrength, XtcGains> = {
  realistic: {
    sat: 0.12,
    warmth: 0,
    exp: 0.06,
    expDazzle: 0.22,
    ls: 0.42,
    bloom: 0.35,
    star: 0.3,
    veilBase: 0.22,
    veilDazzle: 0.78,
    glow: 0,
    trails: 0.5,
    after: 0.45,
    chroma: 0.1,
    blur: 0.1,
    wobble: 0.05,
    nyst: 0.2,
    jaw: 0.0011,
    kickExp: 0.03,
    kickBloom: 0.3,
    kickSat: 0,
    kickZoom: 0,
    jitter: 0.15,
    sway: 0.08,
    nSat: 0.4,
    nExp: 0.1,
    nTint: 0,
    nWobble: 0.4,
    nBlur: 0.08,
    nTunnel: 0.2,
    nSway: 0.35,
    nMuffle: 0,
    nAudioWobble: 0,
    dSat: 0.3,
    dContrast: 0.08,
    dExp: 0.1,
    dWarmth: 0,
    dSpeed: 0.15,
    dLag: 0.06,
    dMuffle: 0,
    dWidth: 0,
    dMusicDb: 0,
    dHighShelf: 0,
    aHighShelf: 0,
    aLowShelf: 0,
    aWidth: 0,
    aMusicDb: 0,
    aDistDrop: 0,
  },
  strong: {
    sat: 0.4,
    warmth: 0.6,
    exp: 0.2,
    expDazzle: 0.4,
    ls: 0.7,
    bloom: 0.9,
    star: 0.7,
    veilBase: 0.1,
    veilDazzle: 0.9,
    glow: 0.35,
    trails: 0.9,
    after: 0.8,
    chroma: 0.2,
    blur: 0.12,
    wobble: 0.1,
    nyst: 0.6,
    jaw: 0.0025,
    kickExp: 0.08,
    kickBloom: 0.6,
    kickSat: 0.08,
    kickZoom: 0.008,
    jitter: 0.3,
    sway: 0.15,
    nSat: 0.6,
    nExp: 0.1,
    nTint: 1,
    nWobble: 0.7,
    nBlur: 0.15,
    nTunnel: 0.4,
    nSway: 0.6,
    nMuffle: 0.3,
    nAudioWobble: 0.5,
    dSat: 0.55,
    dContrast: 0.18,
    dExp: 0.2,
    dWarmth: 0.5,
    dSpeed: 0.25,
    dLag: 0.1,
    dMuffle: 0.3,
    dWidth: 0.3,
    dMusicDb: -2,
    dHighShelf: -3,
    aHighShelf: 4,
    aLowShelf: 3,
    aWidth: 0.35,
    aMusicDb: 1.5,
    aDistDrop: 0.5,
  },
};

/**
 * Composite-shader constants per preset (uniforms, so switching never recompiles). `realistic` = the
 * round-6 literals. See PostFX.percTune for the meaning of each field.
 */
export interface PercTune {
  swim: number;
  rot1: number;
  rot2: number;
  zoom: number;
  drift: number;
  fSwim: number;
  fRot: number;
  fZoom: number;
  chroma: number;
  periph: number;
  edge: number;
  trailGain: number;
  ghostX: number;
  ghostY: number;
  ghostFull: number;
  vergence: number;
  afterDim: number;
  afterAdd: number;
  /** star-glare tap stride factor, desktop / mobile */
  starStride: number;
  starStrideM: number;
}

export const PERC_TUNE: Record<PerceptionStrength, PercTune> = {
  realistic: {
    swim: 0.0035,
    rot1: 0.014,
    rot2: 0.008,
    zoom: 0.012,
    drift: 0.0025,
    fSwim: 1,
    fRot: 1,
    fZoom: 1,
    chroma: 0.018,
    periph: 0,
    edge: 0,
    trailGain: 1,
    ghostX: 0.03,
    ghostY: 0.005,
    ghostFull: 0.4,
    vergence: 0,
    afterDim: 0.35,
    afterAdd: 0.16,
    starStride: 1,
    starStrideM: 1,
  },
  strong: {
    swim: 0.0075,
    rot1: 0.028,
    rot2: 0.014,
    zoom: 0.025,
    drift: 0.005,
    // swim 0.17–0.3 Hz, rotation ~0.13 / 0.05 Hz, zoom and drift ~0.1 Hz (round 6: 0.03–0.09 Hz)
    fSwim: 3.5,
    fRot: 4.2,
    fZoom: 2.5,
    chroma: 0.03,
    periph: 2.0,
    edge: 0.03,
    trailGain: 0.9,
    ghostX: 0.045,
    ghostY: 0.012,
    ghostFull: 0.3,
    vergence: 0.12,
    afterDim: 0.5,
    afterAdd: 0.3,
    // glare stride 1.25 -> 1.8 desktop, 1.6 -> 2.2 mobile: streaks about 45 % longer
    starStride: 1.44,
    starStrideM: 1.375,
  },
};

/** BAC at which the forced "sit down / first aid" outcome happens (bible §12.2: 2.0‰+) */
export const SITDOWN_BAC = 2.5;
/** BAC from which a sustained stay forces the outcome anyway */
export const SITDOWN_SUSTAINED_BAC = 2.0;
/** seconds at or above SITDOWN_SUSTAINED_BAC before the outcome */
export const SITDOWN_SUSTAINED_S = 25;
/** core temperature thresholds (°C, bible §12.3, ASSUMPTION) */
export const HEAT_DANGER_C = 38.5;
export const HYPERTHERMIA_C = 39.5;
export const COLLAPSE_C = 40;

// ---------------------------------------------------------------- XTC timeline (real seconds)

export type XtcPhase = 'off' | 'onset' | 'plateau' | 'comedown' | 'after';

/** compressed timeline: onset ~40 s, plateau ~3 min, comedown ~60 s, then a drained after-phase */
export const XTC_TIMELINE = { onset: 40, plateau: 180, comedown: 60, after: 90 } as const;
export const XTC_END = XTC_TIMELINE.onset + XTC_TIMELINE.plateau + XTC_TIMELINE.comedown + XTC_TIMELINE.after;

const smooth01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function xtcPhase(t: number): XtcPhase {
  const { onset, plateau, comedown } = XTC_TIMELINE;
  if (t < 0 || t >= XTC_END) return 'off';
  if (t < onset) return 'onset';
  if (t < onset + plateau) return 'plateau';
  if (t < onset + plateau + comedown) return 'comedown';
  return 'after';
}

/** plateau intensity with slow waves (effects come and go) */
function plateauLevel(t: number): number {
  return 0.93 + 0.07 * Math.cos(((t - XTC_TIMELINE.onset) * 2 * Math.PI) / 50);
}

/** 0..1 effect intensity at t seconds after the (simulated) start */
export function xtcIntensity(t: number): number {
  const { onset, plateau, comedown } = XTC_TIMELINE;
  if (t <= 0) return 0;
  if (t < onset) return smooth01((t / onset - 0.12) / 0.88);
  if (t < onset + plateau) return plateauLevel(t);
  if (t < onset + plateau + comedown) return plateauLevel(onset + plateau) * (1 - smooth01((t - onset - plateau) / comedown));
  return 0;
}

/** 0..1 "drained" comedown feeling (dull colours, low energy) */
export function xtcDrained(t: number): number {
  const { onset, plateau, comedown, after } = XTC_TIMELINE;
  const c0 = onset + plateau;
  if (t < c0 || t >= XTC_END) return 0;
  if (t < c0 + comedown) return smooth01((t - c0) / comedown);
  return 1 - 0.4 * smooth01((t - c0 - comedown) / after);
}

/**
 * 0..1 onset discomfort: nausea / restlessness waves of a few seconds (desaturation + sway), strongest
 * in the middle of the onset, fading into the plateau. Deterministic in `t`.
 */
export function xtcNausea(t: number): number {
  const { onset } = XTC_TIMELINE;
  if (t < 6 || t > onset + 25) return 0;
  const env = smooth01((t - 6) / 10) * (1 - smooth01((t - onset + 5) / 30));
  const p = ((t - 6) % 11) / 11; // one wave every 11 s
  const wave = p < 0.4 ? Math.sin((p / 0.4) * Math.PI) : 0;
  return env * wave * wave;
}

// ---------------------------------------------------------------- ketamine timeline (real seconds)

/**
 * One fixed, anonymous scenario (never a choice of amount): onset (numb, heavy, sound far away), peak
 * (dissociation) with a "K-hole" window (hardly able to move or speak), return (slowly back, unsteady,
 * nausea) and a grey, tired after-phase. Compressed like the XTC run: about 5 minutes of real time.
 */
export type KetPhase = 'off' | 'onset' | 'peak' | 'hole' | 'return' | 'after';

export const KET_TIMELINE = { onset: 30, peakEnd: 180, holeStart: 90, holeEnd: 140, returnEnd: 260, end: 310 } as const;
export const KET_END = KET_TIMELINE.end;

export function ketPhase(t: number): KetPhase {
  const K = KET_TIMELINE;
  if (t < 0 || t >= K.end) return 'off';
  if (t < K.onset) return 'onset';
  if (t < K.peakEnd) return t >= K.holeStart && t < K.holeEnd ? 'hole' : 'peak';
  if (t < K.returnEnd) return 'return';
  return 'after';
}

/** 0..1 depth of the K-hole window: in over 10 s, out over 10 s */
export function ketHole(t: number): number {
  const K = KET_TIMELINE;
  if (t <= K.holeStart || t >= K.holeEnd) return 0;
  return smooth01((t - K.holeStart) / 10) * (1 - smooth01((t - K.holeEnd + 10) / 10));
}

/** 0..1 dissociation (detached from body and surroundings): 0.55 at the end of the onset, 0.8 at the peak, 1 in the K-hole */
export function ketDissociation(t: number): number {
  const K = KET_TIMELINE;
  if (t <= 0 || t >= K.end) return 0;
  if (t < K.onset) return 0.55 * smooth01((t - 2) / (K.onset - 2));
  if (t < K.peakEnd) return Math.min(1, 0.55 + 0.25 * smooth01((t - K.onset) / 40) + 0.2 * ketHole(t));
  if (t < K.returnEnd) return 0.08 + 0.72 * (1 - smooth01((t - K.peakEnd) / (K.returnEnd - K.peakEnd)));
  return 0.08 * (1 - smooth01((t - K.returnEnd) / 30));
}

/** 0..1 numb, heavy body (onset through peak, fading in the return) */
export function ketNumb(t: number): number {
  const K = KET_TIMELINE;
  if (t <= 0 || t >= K.end) return 0;
  if (t < K.peakEnd) return smooth01((t - 3) / 22);
  return 1 - smooth01((t - K.peakEnd) / (K.returnEnd + 20 - K.peakEnd));
}

/** 0..1 nausea waves on the way back (every 13 s) */
export function ketNausea(t: number): number {
  const K = KET_TIMELINE;
  if (t < K.peakEnd + 4 || t > K.returnEnd) return 0;
  const env = smooth01((t - K.peakEnd - 4) / 12) * (1 - smooth01((t - K.returnEnd + 20) / 20));
  const p = ((t - K.peakEnd - 4) % 13) / 13;
  const wave = p < 0.45 ? Math.sin((p / 0.45) * Math.PI) : 0;
  return env * wave * wave;
}

/** 0..1 grey, tired, flat (late return and after-phase) */
export function ketDrained(t: number): number {
  const K = KET_TIMELINE;
  if (t < K.peakEnd + 30 || t >= K.end) return 0;
  if (t < K.returnEnd) return 0.75 * smooth01((t - K.peakEnd - 30) / (K.returnEnd - K.peakEnd - 30));
  return 0.75 - 0.25 * smooth01((t - K.returnEnd) / (K.end - K.returnEnd));
}

// ---------------------------------------------------------------- heat scenarios

export type HeatScenarioId = 'endshow' | 'heatwave';

export interface HeatScenario {
  id: HeatScenarioId;
  /** long label for a scenario switch */
  label: string;
  /** compact chip text for the status widget */
  short: string;
  /** air temperature (°C) */
  airC: number;
  /** relative humidity 0..1 */
  rh: number;
  /** open-field wind (m/s); the crowd blocks it */
  windMs: number;
  note: string;
}

/**
 * The Endshow night (FACT, KNMI Lelystad 22:00–23:00, design bible §8.4) and the daytime contrast case the
 * festival was cancelled for (FACT: Lelystad daily maximum 36.8 °C on Fri 26 June; RH ~35 % is an
 * ASSUMPTION for a dry heatwave afternoon).
 */
export const HEAT_SCENARIOS: Record<HeatScenarioId, HeatScenario> = {
  endshow: {
    id: 'endshow',
    label: 'Endshow night · Sat 27 June, 22:33',
    short: 'Air 22.5 °C · 81 % humidity',
    airC: 22.5,
    rh: 0.81,
    windMs: 4.5,
    note:
      'A tropical, humid night after a 31 °C day. Humid air slows the evaporation of sweat, and a dense crowd blocks ' +
      'the breeze and adds its own heat, so the body cools less well than 22.5 °C suggests.',
  },
  heatwave: {
    id: 'heatwave',
    label: 'Festival afternoon · Fri 26 June, code red',
    short: 'Air 36.8 °C · code red heat',
    airC: 36.8,
    rh: 0.35,
    windMs: 3,
    note:
      'The afternoon the festival would have run: 36.8 °C in Lelystad, 39.4 °C national record at Ell. KNMI code red ' +
      'means everyone risks dehydration, overheating and heat stroke — this is why Defqon.1 2026 was cancelled.',
  },
};

/**
 * Apparent temperature (Steadman / Australian BoM, °C): air temperature corrected for humidity (vapour
 * pressure) and wind. Inside a dense crowd the wind term is ~0.
 */
export function apparentTemp(airC: number, rh: number, windMs: number): number {
  const e = rh * 6.105 * Math.exp((17.27 * airC) / (237.7 + airC));
  return airC + 0.33 * e - 0.7 * windMs - 4;
}

// ---------------------------------------------------------------- risk model

export interface RiskState {
  /** core body temperature, °C */
  bodyTemp: number;
  /** 0..1 body water (1 = well hydrated); display value, never above 1 */
  hydration: number;
  /** 0..1 water overload with XTC (dilution of blood sodium: hyponatraemia risk) */
  overhydration: number;
  /** beats per minute */
  heartRate: number;
  /** air temperature (°C) and relative humidity (0..1) of the current scenario */
  airC: number;
  humidity: number;
  /** what the body feels at the player's spot (°C): humidity, crowd micro-climate, wind, flames */
  feelsLikeC: number;
  /** 0..1 physical activity used by the model */
  activity: number;
  /** short activity label ('Dancing', 'Resting', 'Cooling down' ...) */
  activityLabel: string;
  /** current factual risk messages (constant strings, most severe first) */
  warnings: string[];
}

export interface RiskInput {
  /** 0..1 physical activity (dancing / walking) */
  activity: number;
  /** 0..1 XTC intensity */
  xtc: number;
  phase: XtcPhase;
  /** seconds since XTC start */
  xtcTime: number;
  bac: number;
  /** 0..1 sensory overload (bright, loud, intense section) */
  overstimulation: number;
  /** extra °C from the crowd micro-climate (+3 zone A, +1.5 zone B) and nearby flames */
  microC: number;
  /** 0..1 how much the breeze reaches the player (0 inside a dense crowd) */
  exposure: number;
  /** 0..1.5 active cooling: shade / misting (≈0.5), air-conditioned first-aid heat post (≈1.2) */
  cooling: number;
  /** resting (out of the crowd, sitting / standing still) */
  resting: boolean;
}

/**
 * Simplified physiology: body temperature, hydration and heart rate respond to activity, the scenario's
 * air temperature and humidity, the crowd micro-climate, simulated MDMA and alcohol. Runs in real seconds,
 * time-compressed.
 */
export class RiskModel {
  readonly state: RiskState = {
    bodyTemp: 37,
    hydration: 1,
    overhydration: 0,
    heartRate: 72,
    airC: HEAT_SCENARIOS.endshow.airC,
    humidity: HEAT_SCENARIOS.endshow.rh,
    feelsLikeC: HEAT_SCENARIOS.endshow.airC,
    activity: 0,
    activityLabel: 'Standing',
    warnings: [],
  };
  scenario: HeatScenario = HEAT_SCENARIOS.endshow;
  /** ml of water drunk recently (decays, τ 60 s) — for the hyponatraemia branch */
  waterLoad = 0;
  /** internal body water (may exceed 1 = over-hydrated) */
  private water = 1;
  private warnTimer = 0;
  /** seconds the temperature has been falling while resting (positive feedback message) */
  private recovering = 0;

  setScenario(s: HeatScenario): void {
    this.scenario = s;
    this.state.airC = s.airC;
    this.state.humidity = s.rh;
  }

  reset(): void {
    const s = this.state;
    s.bodyTemp = 37;
    s.hydration = 1;
    s.overhydration = 0;
    s.heartRate = 72;
    s.warnings.length = 0;
    this.water = 1;
    this.waterLoad = 0;
    this.recovering = 0;
  }

  addWater(ml: number): void {
    this.water = Math.min(1.3, this.water + ml / 1500);
    this.waterLoad += ml;
    this.state.hydration = Math.min(1, this.water);
  }

  /** medical cooling at first aid: temperature drops towards 37.4 °C, oral rehydration */
  treat(dt: number): void {
    const s = this.state;
    s.bodyTemp += (37.4 - s.bodyTemp) * (1 - Math.exp(-dt / 12));
    if (this.water < 0.9) this.water = Math.min(0.9, this.water + dt * 0.004);
  }

  update(dt: number, i: RiskInput): void {
    const s = this.state;
    const sc = this.scenario;
    const a = i.activity;
    const x = i.xtc;
    const bac = Math.min(i.bac, 3);
    const xtcActive = i.phase !== 'off';

    // what the body feels: humidity raises it, wind lowers it (a dense crowd blocks the breeze), plus the
    // crowd micro-climate and radiant heat from flames; active cooling (misting, AC) lowers it
    const feels = apparentTemp(sc.airC, sc.rh, sc.windMs * i.exposure) + i.microC - 6 * i.cooling;
    s.feelsLikeC += (feels - s.feelsLikeC) * (1 - Math.exp(-dt / 4));
    const heat = Math.min(1.6, Math.max(-0.4, (s.feelsLikeC - 24) / 10));
    const hot = Math.max(0, heat);
    // humid air: sweat drips instead of evaporating, so cooling works less well
    const evapPenalty = Math.max(0, sc.rh - 0.5) * 0.6;
    const dry = Math.max(0, 0.85 - this.water);

    // MDMA impairs heat loss; the effect multiplies with exertion and heat
    const tempTarget =
      37 + a * (0.5 + 0.45 * hot + evapPenalty) + x * (1 + 1.1 * a) * (0.6 + 0.4 * hot + evapPenalty) + dry * 2.5 + Math.min(0, heat) * 0.3 - 0.35 * i.cooling;
    const tau = i.cooling > 0.9 ? 20 : 45;
    const prevT = s.bodyTemp;
    s.bodyTemp += (tempTarget - s.bodyTemp) * (1 - Math.exp(-dt / tau));

    // sweat (1 = 1.5 l body-water reserve). The XTC timeline compresses a night into ~6 minutes (1 real
    // minute ≈ 1 hour), so its sweat runs ~4x faster: dancing in the humid crowd loses ~0.4 l per simulated
    // hour — a cup (250 ml) per real minute, the advised "about a glass per hour", roughly keeps up.
    const tc = xtcActive ? 4 : 1;
    const sweat = tc * (0.0006 * (0.2 + a) * (0.5 + hot) * (1 + 0.7 * x) + 0.00016 * bac * (0.6 + hot));
    this.water = Math.max(0.2, this.water - sweat * dt);
    // kidneys clear excess water; MDMA (antidiuretic hormone) slows that down
    if (this.water > 1) this.water = Math.max(1, this.water - (xtcActive ? 0.0022 : 0.005) * dt);
    this.waterLoad = Math.max(0, this.waterLoad - (this.waterLoad * dt) / 60);
    s.hydration = Math.min(1, this.water);

    // hyponatraemia: with MDMA, gulping (more than ~0.6 l within a real minute ≈ a simulated hour) or
    // staying over-hydrated dilutes blood sodium; the state builds up and fades slowly
    const overload = xtcActive ? Math.max(0, (this.waterLoad - 650) / 500) + Math.max(0, (this.water - 1.08) * 4) : 0;
    s.overhydration = Math.min(1, Math.max(0, s.overhydration + (overload * 0.05 - s.overhydration * 0.02) * dt));

    const dryHr = Math.max(0, 0.85 - this.water);
    const hrTarget =
      68 + 55 * a + 38 * x + 12 * hot * a + 30 * dryHr + 5 * bac + 8 * i.overstimulation + 10 * Math.max(0, s.bodyTemp - 38) - (i.resting ? 6 : 0);
    s.heartRate += (Math.min(195, hrTarget) - s.heartRate) * (1 - Math.exp(-dt / 5));

    this.recovering = i.resting || i.cooling > 0.2 ? (s.bodyTemp < prevT - 1e-5 ? this.recovering + dt : Math.max(0, this.recovering - dt)) : 0;

    this.warnTimer -= dt;
    if (this.warnTimer <= 0) {
      this.warnTimer = 0.5;
      this.collectWarnings(i);
    }
  }

  private collectWarnings(i: RiskInput): void {
    const s = this.state;
    const w = s.warnings;
    const M = RISK_MESSAGES;
    const xtcActive = i.phase !== 'off';
    w.length = 0;
    let danger = false;
    if (s.bodyTemp >= HYPERTHERMIA_C) {
      w.push(M.hyperthermia);
      danger = true;
    } else if (s.bodyTemp >= HEAT_DANGER_C) w.push(M.heat);
    if (s.overhydration >= 0.5) {
      w.push(M.hyponatraemiaDanger);
      danger = true;
    }
    if (i.bac >= 2) {
      w.push(M.alcoholDanger);
      danger = true;
    }
    if (s.heartRate >= 165) {
      w.push(M.heart);
      danger = true;
    }
    if (this.recovering > 3 && s.bodyTemp > 37.6) w.push(i.cooling > 0.9 ? M.treated : i.cooling > 0.2 ? M.cooling : M.resting);
    if (s.hydration < 0.65) w.push(M.dehydration);
    if (xtcActive && (this.waterLoad > 650 || s.overhydration > 0.08) && s.overhydration < 0.5) w.push(M.hyponatraemia);
    if (this.scenario.id === 'heatwave') w.push(M.codeRed);
    if (i.bac >= 0.3 && !xtcActive && (s.hydration < 0.9 || this.scenario.id === 'heatwave')) w.push(M.alcoholHeat);
    if (i.bac >= 0.5 && i.bac < 2) w.push(M.drivingLimit);
    if (xtcActive && i.bac >= 0.2) w.push(M.mixing);
    if (i.phase === 'onset' && i.xtcTime > 12) w.push(M.anxiety);
    if (i.phase === 'plateau' && s.hydration < 0.9) w.push(M.thirst);
    if (i.overstimulation > 0.6) w.push(M.overstimulation);
    if (i.phase === 'comedown' || i.phase === 'after') w.push(M.comedown);
    if (danger) w.push(M.help);
  }
}
