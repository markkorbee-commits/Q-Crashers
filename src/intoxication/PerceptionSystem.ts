import * as THREE from 'three';
import type { App } from '../core/App';
import type { FrameContext, PerceptionParams, QualitySettings, System } from '../core/types';
import { PostFX } from '../postfx/PostFX';
import {
  ABSORPTION_PER_H,
  ALCOHOL_FX,
  BODY_MASS_KG,
  ELIMINATION_PER_H,
  RiskModel,
  type RiskInput,
  type RiskState,
  table,
  TIME_COMPRESSION,
  WIDMARK_R,
  xtcDrained,
  xtcIntensity,
  xtcPhase,
  type XtcPhase,
} from './models';

export type PerceptionMode = 'sober' | 'alcohol' | 'xtc';
export type { RiskState, XtcPhase };

/** Motor/perception effects consumed by the PlayerController and CameraRig. */
export interface MotorEffects {
  /** 0..1 body/camera sway amplitude */
  sway: number;
  /** seconds of input latency (reaction time) */
  inputLag: number;
  /** 0..1 loss of balance (random drift while walking) */
  balance: number;
  /** 0..1 camera micro jitter / unsteadiness */
  lookJitter: number;
  /** multiplier on walking speed (1 = normal) */
  speedScale: number;
}

/** visual params smoothed towards their targets (everything but `split`) */
const KEYS = [
  'blur',
  'doubleVision',
  'chroma',
  'wobble',
  'tunnel',
  'saturation',
  'contrast',
  'exposure',
  'bloomBoost',
  'lightSensitivity',
  'trails',
  'afterimage',
  'patternWarp',
  'hueShift',
  'motionBlur',
] as const satisfies readonly (keyof PerceptionParams)[];

const MOTOR_KEYS = ['sway', 'inputLag', 'balance', 'lookJitter', 'speedScale'] as const;

/** BAC shown on the altered side of compare mode when nothing is active */
const COMPARE_PREVIEW_BAC = 1.0;
/** seconds for a manual XTC stop to fade out */
const XTC_STOP_FADE = 4;

/**
 * EDUCATIONAL perception simulation.
 *  - alcohol: Widmark BAC (75 kg, r 0.62), first-order absorption, 0.15‰/h elimination, time x10
 *    -> blur, double vision, tunnel vision, wobble, reduced contrast, sway, reaction lag, muffled audio
 *  - xtc: compressed timeline (onset / plateau / comedown) -> intensified colour, glare, trails,
 *    afterimages, beat-synced pattern breathing + a risk model (temperature, hydration, heart rate)
 *  - compare: split screen sober | altered from the same position
 * Writes app.postfx.perception (smoothed) and `motor` every frame. No usage/dosing info, ever.
 */
export class PerceptionSystem implements System {
  readonly name = 'perception';
  /** blood alcohol concentration in promille (g/kg) */
  bac = 0;
  /** 0..1 simulated XTC effect intensity */
  xtc = 0;
  compare = false;
  readonly motor: MotorEffects = { sway: 0, inputLag: 0, balance: 0, lookJitter: 0, speedScale: 1 };
  /** live physiology + factual warnings for the UI */
  readonly risk: RiskState;
  /** grams of alcohol consumed but not yet absorbed */
  stomach = 0;
  /** XTC timeline phase and seconds since its start */
  xtcPhase: XtcPhase = 'off';
  xtcTime = 0;
  /** player chose to rest / cool down (lowers activity in the risk model) */
  resting = false;

  private app!: App;
  private enabled = true;
  private xtcOn = false;
  private xtcStop = 1;
  private splitX = 0.5;
  private readonly riskModel = new RiskModel();
  private readonly riskInput: RiskInput = { activity: 0, xtc: 0, phase: 'off', xtcTime: 0, bac: 0, overstimulation: 0 };
  private readonly target = PostFX.defaults();
  private readonly smooth = PostFX.defaults();
  private readonly motorTarget: MotorEffects = { sway: 0, inputLag: 0, balance: 0, lookJitter: 0, speedScale: 1 };
  private readonly lastPos = new THREE.Vector3();
  private speed = 0;
  private shownXtc = 0;
  private audioTimer = 0;
  private muffle = 0;
  private audioWobble = 0;
  private lastMode: PerceptionMode = 'sober';

  constructor() {
    this.risk = this.riskModel.state;
  }

  init(app: App): void {
    this.app = app;
    this.lastPos.copy(app.playerPos);
  }

  get mode(): PerceptionMode {
    return this.xtcPhase !== 'off' ? 'xtc' : this.bac > 0.005 || this.stomach > 0.05 ? 'alcohol' : 'sober';
  }

  /** a drink was consumed: grams of pure alcohol (e.g. beer 250 ml 5% = 9.9 g) */
  addAlcohol(grams: number): void {
    if (grams > 0 && Number.isFinite(grams)) this.stomach += grams;
  }

  /** jump straight to a BAC (previews / debug); clears unabsorbed alcohol */
  setBac(promille: number): void {
    this.bac = Math.max(0, promille);
    this.stomach = 0;
  }

  /** water drunk (ml) — hydration, and the over-drinking (hyponatraemia) warning under XTC */
  addWater(ml: number): void {
    if (ml > 0) this.riskModel.addWater(ml);
  }

  setResting(on: boolean): void {
    this.resting = on;
  }

  /** reset button: return to sober instantly */
  soberUp(): void {
    this.bac = 0;
    this.stomach = 0;
    this.xtc = 0;
    this.xtcOn = false;
    this.xtcPhase = 'off';
    this.xtcTime = 0;
    this.xtcStop = 1;
    this.shownXtc = 0;
    this.riskModel.reset();
    const d = PostFX.defaults();
    for (const k of KEYS) this.smooth[k] = d[k];
    if (this.app) this.write();
  }

  /** start / stop the educational XTC perception simulation */
  setXtc(on: boolean): void {
    if (on) {
      if (!this.xtcOn || this.xtcStop < 1) {
        this.xtcOn = true;
        this.xtcTime = 0;
        this.xtcStop = 1;
      }
    } else if (this.xtcOn) this.xtcStop = Math.min(this.xtcStop, 0.999);
  }

  setCompare(on: boolean): void {
    this.compare = on;
    if (this.app) this.app.postfx.perception.split = on ? this.splitX : -1;
  }

  /** screen x (0..1) of the compare divider */
  setSplit(x: number): void {
    this.splitX = Math.min(0.98, Math.max(0.02, x));
    if (this.compare && this.app) this.app.postfx.perception.split = this.splitX;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on && this.app) {
      Object.assign(this.app.postfx.perception, PostFX.defaults());
      Object.assign(this.motor, { sway: 0, inputLag: 0, balance: 0, lookJitter: 0, speedScale: 1 });
      this.app.audio.setPerception(0, 0);
    }
  }

  update(ctx: FrameContext): void {
    if (!this.enabled) return;
    const dt = ctx.dt;
    this.simulateAlcohol(dt);
    this.simulateXtc(dt);

    // player speed (m/s) for activity; jumps > 5 m are teleports, not running
    const p = this.app.playerPos;
    if (dt > 0) {
      const d = Math.hypot(p.x - this.lastPos.x, p.z - this.lastPos.z);
      const v = d > 5 ? 0 : d / dt;
      this.speed += (Math.min(v, 8) - this.speed) * (1 - Math.exp(-dt / 0.5));
    }
    this.lastPos.copy(p);

    // targets
    const t = this.target;
    resetParams(t);
    const mt = this.motorTarget;
    resetMotor(mt);
    alcoholVisual(t, this.bac, ctx.time);
    alcoholMotor(mt, this.bac);
    const drained = this.xtcPhase === 'off' ? 0 : xtcDrained(this.xtcTime);
    xtcVisual(t, mt, this.xtc, drained);
    if (this.compare && this.mode === 'sober') alcoholVisual(t, COMPARE_PREVIEW_BAC, ctx.time);

    // smooth build-up (slow, gentle), then fast beat-driven pulses on top
    const k = 1 - Math.exp(-dt / 0.9);
    for (const key of KEYS) this.smooth[key] += (t[key] - this.smooth[key]) * k;
    const km = 1 - Math.exp(-dt / 0.6);
    for (const key of MOTOR_KEYS) this.motor[key] += (mt[key] - this.motor[key]) * km;
    this.shownXtc += (this.xtc - this.shownXtc) * k;
    this.write();
    this.pulses(ctx);

    // audio (throttled)
    this.muffle = table(ALCOHOL_FX.muffle, this.bac);
    this.audioWobble = table(ALCOHOL_FX.audioWobble, this.bac);
    this.audioTimer -= dt;
    if (this.audioTimer <= 0) {
      this.audioTimer = 0.2;
      this.app.audio.setPerception(this.muffle, this.audioWobble);
    }

    // physiology + warnings
    const b = ctx.beat;
    const dancing = this.resting ? 0.08 : ctx.showPlaying ? 0.3 + 0.62 * b.energy : 0.15;
    const walking = Math.min(1, this.speed / 3.4);
    const ri = this.riskInput;
    ri.activity = Math.min(1, Math.max(dancing, walking));
    ri.xtc = this.xtc;
    ri.phase = this.xtcPhase;
    ri.xtcTime = this.xtcTime;
    ri.bac = this.bac;
    ri.overstimulation = this.shownXtc * b.energy * (ctx.showPlaying ? 1 : 0.4);
    this.riskModel.update(dt, ri);

    const mode = this.mode;
    if (mode !== this.lastMode) {
      this.lastMode = mode;
      this.app.events.emit('perception:changed', { mode });
    }
  }

  setQuality(_q: QualitySettings): void {}

  stats(): Record<string, number | string> {
    return {
      bac: this.bac.toFixed(2),
      stomach: this.stomach.toFixed(1),
      xtc: this.xtc.toFixed(2),
      phase: this.xtcPhase,
      temp: this.risk.bodyTemp.toFixed(1),
      hydration: this.risk.hydration.toFixed(2),
      hr: Math.round(this.risk.heartRate),
      warnings: this.risk.warnings.length,
    };
  }

  // ------------------------------------------------------------------ simulation

  /** Widmark with first-order absorption; 1 real minute = 10 simulated minutes */
  private simulateAlcohol(dt: number): void {
    const h = (dt * TIME_COMPRESSION) / 3600;
    if (this.stomach > 0) {
      let absorbed = this.stomach * (1 - Math.exp(-ABSORPTION_PER_H * h));
      if (this.stomach - absorbed < 0.02) absorbed = this.stomach;
      this.stomach -= absorbed;
      this.bac += absorbed / (BODY_MASS_KG * WIDMARK_R);
    }
    if (this.bac > 0) this.bac = Math.max(0, this.bac - ELIMINATION_PER_H * h);
  }

  private simulateXtc(dt: number): void {
    if (!this.xtcOn) {
      this.xtc = 0;
      this.xtcPhase = 'off';
      return;
    }
    this.xtcTime += dt;
    this.xtcPhase = xtcPhase(this.xtcTime);
    if (this.xtcStop < 1) this.xtcStop = Math.max(0, this.xtcStop - dt / XTC_STOP_FADE);
    if (this.xtcPhase === 'off' || this.xtcStop <= 0) {
      this.xtcOn = false;
      this.xtcPhase = 'off';
      this.xtc = 0;
      this.xtcStop = 1;
      return;
    }
    this.xtc = xtcIntensity(this.xtcTime) * this.xtcStop;
  }

  /** copy smoothed params + compare split into the post chain */
  private write(): void {
    const out = this.app.postfx.perception;
    for (const key of KEYS) out[key] = this.smooth[key];
    out.split = this.compare ? this.splitX : -1;
  }

  /**
   * Beat-synced overstimulation: soft exposure/bloom swells on kicks (small amplitude on purpose —
   * photosensitivity), hue pulses on 4-bar phrases, pattern breathing over 2 bars.
   */
  private pulses(ctx: FrameContext): void {
    const x = this.shownXtc;
    const fx = this.app.postfx;
    const b = ctx.beat;
    const breath = 0.5 - 0.5 * Math.cos(((b.bar * 0.5) % 1) * Math.PI * 2);
    fx.rhythm.breath = breath;
    fx.rhythm.kick = b.hasKick ? b.kick : 0;
    if (x < 0.01) return;
    const out = fx.perception;
    const kick = b.hasKick ? b.kick * (0.4 + 0.6 * b.energy) : 0;
    out.exposure += 0.05 * kick * x;
    out.bloomBoost += 0.8 * kick * x;
    const phrase = Math.exp(-(b.bar % 4) * 2.2);
    out.hueShift += x * (0.06 * Math.sin(ctx.time * 0.13) + 0.14 * phrase);
    out.patternWarp *= 0.75 + 0.25 * breath + 0.2 * kick;
  }
}

// ---------------------------------------------------------------- effect mapping

function resetParams(t: PerceptionParams): void {
  t.blur = t.doubleVision = t.chroma = t.wobble = t.tunnel = 0;
  t.saturation = t.contrast = t.exposure = 1;
  t.bloomBoost = t.lightSensitivity = t.trails = t.afterimage = t.patternWarp = t.hueShift = t.motionBlur = 0;
}

function resetMotor(m: MotorEffects): void {
  m.sway = m.inputLag = m.balance = m.lookJitter = 0;
  m.speedScale = 1;
}

/** alcohol: soft, slowly swimming, doubling, narrowing vision; `time` drives intermittent fusion loss */
function alcoholVisual(t: PerceptionParams, bac: number, time: number): void {
  if (bac <= 0.01) return;
  const F = ALCOHOL_FX;
  t.blur = Math.max(t.blur, table(F.blur, bac));
  // the eyes periodically regain fusion: double vision comes and goes
  const fusion = 0.72 + 0.28 * Math.sin(time * 0.42) * Math.sin(time * 0.17 + 1);
  t.doubleVision = Math.max(t.doubleVision, table(F.doubleVision, bac) * fusion);
  t.chroma = Math.max(t.chroma, table(F.chroma, bac));
  t.wobble = Math.max(t.wobble, table(F.wobble, bac) * (0.85 + 0.15 * Math.sin(time * 0.23)));
  t.tunnel = Math.max(t.tunnel, table(F.tunnel, bac));
  t.contrast *= table(F.contrast, bac);
  t.saturation *= table(F.saturation, bac);
  t.exposure *= table(F.exposure, bac);
  t.motionBlur = Math.max(t.motionBlur, table(F.motionBlur, bac));
}

function alcoholMotor(m: MotorEffects, bac: number): void {
  if (bac <= 0.01) return;
  const F = ALCOHOL_FX;
  m.sway = table(F.sway, bac);
  m.inputLag = table(F.inputLag, bac);
  m.balance = table(F.balance, bac);
  m.lookJitter = table(F.lookJitter, bac);
  m.speedScale = table(F.speedScale, bac);
}

/** simulated MDMA perception at intensity x (0..1), `drained` = comedown dullness */
function xtcVisual(t: PerceptionParams, m: MotorEffects, x: number, drained: number): void {
  if (x > 0.001) {
    t.saturation *= 1 + 0.5 * x;
    t.contrast *= 1 + 0.06 * x;
    t.exposure *= 1 + 0.05 * x;
    t.lightSensitivity = Math.max(t.lightSensitivity, 0.8 * x);
    t.bloomBoost += 0.9 * x;
    t.trails = Math.max(t.trails, 0.84 * x);
    t.afterimage = Math.max(t.afterimage, 0.75 * x);
    t.patternWarp = Math.max(t.patternWarp, 0.6 * x);
    t.chroma = Math.max(t.chroma, 0.12 * x);
    t.blur = Math.max(t.blur, 0.05 * x);
    t.wobble = Math.max(t.wobble, 0.08 * x);
    m.lookJitter = Math.min(1, m.lookJitter + 0.22 * x); // nystagmus
    m.sway = Math.min(1, m.sway + 0.1 * x);
  }
  if (drained > 0.001) {
    t.saturation *= 1 - 0.2 * drained;
    t.contrast *= 1 - 0.06 * drained;
    t.exposure *= 1 - 0.08 * drained;
    m.speedScale *= 1 - 0.12 * drained;
  }
}
