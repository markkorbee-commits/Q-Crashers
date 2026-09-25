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

/** Effect strength per BAC (promille), following the tiers 0.2 / 0.5 / 0.8 / 1.2 / 1.6 / 2.0+. */
export const ALCOHOL_FX = {
  blur: [0.25, 0, 0.5, 0.07, 0.8, 0.17, 1.2, 0.3, 1.6, 0.44, 2.0, 0.56, 3.0, 0.72],
  doubleVision: [0.7, 0, 1.0, 0.16, 1.2, 0.3, 1.6, 0.52, 2.0, 0.72, 3.0, 0.9],
  chroma: [0.4, 0, 0.8, 0.1, 1.2, 0.18, 1.6, 0.27, 2.0, 0.35],
  wobble: [0.15, 0, 0.5, 0.12, 0.8, 0.25, 1.2, 0.42, 1.6, 0.58, 2.0, 0.72, 3.0, 0.85],
  tunnel: [0.4, 0, 0.8, 0.12, 1.2, 0.28, 1.6, 0.45, 2.0, 0.6, 3.0, 0.78],
  contrast: [0.3, 1, 0.8, 0.95, 1.2, 0.9, 1.6, 0.86, 2.0, 0.82],
  saturation: [0.8, 1, 1.6, 0.92, 2.5, 0.85],
  exposure: [1.0, 1, 2.0, 0.93],
  motionBlur: [0.3, 0, 0.5, 0.12, 0.8, 0.28, 1.2, 0.45, 1.6, 0.6, 2.0, 0.75],
  sway: [0.1, 0, 0.2, 0.05, 0.5, 0.15, 0.8, 0.3, 1.2, 0.5, 1.6, 0.7, 2.0, 0.88, 3.0, 1],
  inputLag: [0.1, 0, 0.2, 0.02, 0.5, 0.06, 0.8, 0.12, 1.2, 0.2, 1.6, 0.28, 2.0, 0.35],
  balance: [0.4, 0, 0.8, 0.2, 1.2, 0.45, 1.6, 0.7, 2.0, 0.9, 3.0, 1],
  lookJitter: [0.3, 0, 0.5, 0.06, 0.8, 0.14, 1.2, 0.25, 1.6, 0.38, 2.0, 0.5],
  speedScale: [0.5, 1, 0.8, 0.96, 1.2, 0.9, 1.6, 0.82, 2.0, 0.72, 3.0, 0.6],
  muffle: [0.2, 0, 0.5, 0.1, 0.8, 0.22, 1.2, 0.4, 1.6, 0.55, 2.0, 0.7],
  audioWobble: [0.5, 0, 0.8, 0.12, 1.2, 0.3, 1.6, 0.5, 2.0, 0.65],
} as const;

// ---------------------------------------------------------------- XTC timeline (real seconds)

export type XtcPhase = 'off' | 'onset' | 'plateau' | 'comedown' | 'after';

/** compressed timeline: onset ~40 s, plateau ~3 min, comedown ~60 s, then a drained after-phase */
export const XTC_TIMELINE = { onset: 40, plateau: 180, comedown: 60, after: 90 } as const;
const XTC_END = XTC_TIMELINE.onset + XTC_TIMELINE.plateau + XTC_TIMELINE.comedown + XTC_TIMELINE.after;

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
  return 1 - smooth01((t - c0 - comedown) / after);
}

// ---------------------------------------------------------------- risk model

export interface RiskState {
  /** core body temperature, °C */
  bodyTemp: number;
  /** 0..1 (1 = well hydrated, >1 = over-hydrated) */
  hydration: number;
  /** beats per minute */
  heartRate: number;
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
}

/**
 * Simplified physiology: body temperature, hydration and heart rate respond to activity, the (heat
 * red warning) ambient temperature, simulated MDMA and alcohol. Runs in real seconds, time-compressed.
 */
export class RiskModel {
  readonly state: RiskState = { bodyTemp: 37, hydration: 1, heartRate: 72, warnings: [] };
  /** simulated evening air temperature on the grounds, 26 June 2026 (ASSUMPTION: heat red warning dusk) */
  ambientC = 31;
  /** ml of water drunk recently (decays) — for the hyponatraemia warning */
  waterLoad = 0;
  private warnTimer = 0;

  reset(): void {
    const s = this.state;
    s.bodyTemp = 37;
    s.hydration = 1;
    s.heartRate = 72;
    s.warnings.length = 0;
    this.waterLoad = 0;
  }

  addWater(ml: number): void {
    this.state.hydration = Math.min(1.25, this.state.hydration + ml / 1500);
    this.waterLoad += ml;
  }

  update(dt: number, i: RiskInput): void {
    const s = this.state;
    const heat = Math.min(1.2, Math.max(0, (this.ambientC - 24) / 10));
    const a = i.activity;
    const x = i.xtc;
    const bac = Math.min(i.bac, 3);
    const dry = Math.max(0, 0.85 - s.hydration);

    // MDMA impairs heat loss; the effect multiplies with exertion and air temperature
    const tempTarget = 37 + a * (0.55 + 0.45 * heat) + x * (1 + 1.1 * a) * (0.6 + 0.4 * heat) + dry * 2.5;
    s.bodyTemp += (tempTarget - s.bodyTemp) * (1 - Math.exp(-dt / 45));

    const sweat = 0.0006 * (0.2 + a) * (0.5 + heat) * (1 + 0.7 * x) + 0.00012 * bac;
    s.hydration = Math.max(0.2, s.hydration - sweat * dt);
    if (s.hydration > 1) s.hydration = Math.max(1, s.hydration - 0.002 * dt);
    this.waterLoad = Math.max(0, this.waterLoad - (this.waterLoad * dt) / 150);

    const hrTarget =
      70 + 55 * a + 38 * x + 12 * heat * a + 30 * dry + 5 * bac + 8 * i.overstimulation + 10 * Math.max(0, s.bodyTemp - 38);
    s.heartRate += (Math.min(195, hrTarget) - s.heartRate) * (1 - Math.exp(-dt / 5));

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
    if (s.bodyTemp >= 39.5) {
      w.push(M.hyperthermia);
      danger = true;
    } else if (s.bodyTemp >= 38.5) w.push(M.heat);
    if (i.bac >= 2) {
      w.push(M.alcoholDanger);
      danger = true;
    }
    if (s.heartRate >= 165) {
      w.push(M.heart);
      danger = true;
    }
    if (s.hydration < 0.65) w.push(M.dehydration);
    if (xtcActive && (this.waterLoad > 900 || s.hydration > 1.08)) w.push(M.hyponatraemia);
    if (i.bac >= 0.5 && i.bac < 2) w.push(M.drivingLimit);
    if (xtcActive && i.bac >= 0.2) w.push(M.mixing);
    if (i.phase === 'onset' && i.xtcTime > 12) w.push(M.anxiety);
    if (i.overstimulation > 0.6) w.push(M.overstimulation);
    if (i.phase === 'comedown' || i.phase === 'after') w.push(M.comedown);
    if (danger) w.push(M.help);
  }
}
