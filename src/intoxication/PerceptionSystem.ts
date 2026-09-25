import * as THREE from 'three';
import type { App } from '../core/App';
import type { FrameContext, NamedSpot, PerceptionParams, QualitySettings, System } from '../core/types';
import { PostFX } from '../postfx/PostFX';
import { OUTCOME_CARDS, OUTCOME_NOTES } from './education';
import { Facilities } from './facilities';
import {
  ABSORPTION_PER_H,
  ALCOHOL_FX,
  BODY_MASS_KG,
  COLLAPSE_C,
  ELIMINATION_PER_H,
  HEAT_DANGER_C,
  HEAT_SCENARIOS,
  HYPERTHERMIA_C,
  RiskModel,
  SITDOWN_BAC,
  SITDOWN_SUSTAINED_BAC,
  SITDOWN_SUSTAINED_S,
  table,
  TIME_COMPRESSION,
  WIDMARK_R,
  xtcDrained,
  xtcIntensity,
  xtcNausea,
  xtcPhase,
  type HeatScenario,
  type HeatScenarioId,
  type RiskInput,
  type RiskState,
  type XtcPhase,
} from './models';
import { OutcomeOverlay, type OutcomeAction } from './OutcomeOverlay';

export type PerceptionMode = 'sober' | 'alcohol' | 'xtc';
/** 'auto' = dancing follows where you are (in the crowd, near the stage) and how you move */
export type ActivityMode = 'auto' | 'dance' | 'rest';
/** outcome card currently shown (or waiting to be shown by a UI that renders its own cards) */
export type OutcomeKind = 'none' | 'sitdown' | 'collapse' | 'epilogue';
export type { RiskState, XtcPhase, HeatScenario, HeatScenarioId, OutcomeAction };

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
  /** multiplier on walking speed (1 = normal, ~0 while a stumble freezes you or you are sitting) */
  speedScale: number;
  /** 0..1 stumble envelope (1 at the moment you trip): a consumer may dip the camera / freeze input */
  stumble?: number;
  /** 0..1 sitting or slumped on the ground (a consumer may lower the eye height to ~1 m) */
  seated?: number;
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
type NoteKey = keyof typeof OUTCOME_NOTES;

/** BAC shown on the altered side of compare mode when nothing is active */
const COMPARE_PREVIEW_BAC = 1.0;
/** seconds for a manual XTC stop to fade out */
const XTC_STOP_FADE = 4;
/** crowd micro-climate over the floor (°C by distance from the stage front, bible §12.3: +3 A, +1.5 B) */
const ZONE_MICRO_C = [0, 3, 30, 3, 60, 1.5, 113, 0.6, 140, 0];
/** a toast is repeated at most this often (s) */
const NOTE_REPEAT_S = 90;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
const smoothstep = (a: number, b: number, x: number) => smooth01((x - a) / (b - a));
const damp = (tau: number, dt: number) => 1 - Math.exp(-dt / Math.max(1e-4, tau));

/**
 * EDUCATIONAL perception simulation.
 *  - alcohol: Widmark BAC (75 kg, r 0.62), first-order absorption, 0.15‰/h elimination, time x10
 *    -> tracking lag and smear, refocus blur after head turns, glare persistence, intermittent double
 *    vision and nystagmus, a narrowed field, sway, reaction lag, muffled audio; stumbles from 1.2‰,
 *    memory gaps from 1.6‰ and a forced "sit down / first aid" outcome from 2‰.
 *  - xtc: compressed timeline (onset / plateau / comedown / after) -> onset nausea waves, dazzle and a
 *    milky glare veil under strobes (dilated pupils), halos, trails, afterimages, fine nystagmus, jaw-clench
 *    shake, a drained comedown and the "dinsdagdip" epilogue, plus the risk layer.
 *  - body: core temperature from activity (dancing in the crowd, walking, resting), the Endshow night air
 *    (22.5 °C, 81 % humidity) or the code-red afternoon, crowd micro-climate, flames; heat danger from
 *    38.5 °C (tunnel, heartbeat-red periphery, muffled sound, stumbling), collapse and first aid at 40 °C;
 *    over-hydration (hyponatraemia) headache and nausea.
 *  - compare: split screen sober | altered from the same position
 * Writes app.postfx.perception (smoothed) + app.postfx.body and `motor` every frame. No usage/dosing
 * info, ever. Outcomes are driven by a seeded RNG (reproducible for the same inputs).
 */
export class PerceptionSystem implements System {
  readonly name = 'perception';
  /** blood alcohol concentration in promille (g/kg) */
  bac = 0;
  /**
   * 0..1 simulated XTC effect intensity. Stays at a tiny non-zero value through the comedown and after
   * phase so status widgets keyed on `xtc > 0.001` keep the risk monitor on screen until the epilogue.
   */
  xtc = 0;
  compare = false;
  readonly motor: MotorEffects = { sway: 0, inputLag: 0, balance: 0, lookJitter: 0, speedScale: 1, stumble: 0, seated: 0 };
  /** live physiology + factual warnings for the UI */
  readonly risk: RiskState;
  /** grams of alcohol consumed but not yet absorbed */
  stomach = 0;
  /** XTC timeline phase and seconds since its start */
  xtcPhase: XtcPhase = 'off';
  xtcTime = 0;
  /** how the player's activity is decided (UI: Dance / Rest toggle) */
  activityMode: ActivityMode = 'auto';
  /** outcome card currently shown */
  outcome: OutcomeKind = 'none';
  /** false = a UI renders the outcome cards itself (read `outcome`, call `resolveOutcome`) */
  renderOutcomeCards = true;
  /** under the care of the first-aid team (cooled, resting) */
  aided = false;
  /** highest core temperature / lowest body water since the XTC simulation started (epilogue) */
  peakTemp = 37;
  minWater = 1;

  private app!: App;
  private enabled = true;
  private xtcFx = 0;
  private xtcOn = false;
  private xtcStop = 1;
  private splitX = 0.5;
  private readonly riskModel = new RiskModel();
  private readonly riskInput: RiskInput = {
    activity: 0,
    xtc: 0,
    phase: 'off',
    xtcTime: 0,
    bac: 0,
    overstimulation: 0,
    microC: 0,
    exposure: 1,
    cooling: 0,
    resting: false,
  };
  private readonly target = PostFX.defaults();
  private readonly smooth = PostFX.defaults();
  private readonly motorTarget: MotorEffects = { sway: 0, inputLag: 0, balance: 0, lookJitter: 0, speedScale: 1 };
  private readonly lastPos = new THREE.Vector3();
  private readonly camDir = new THREE.Vector3();
  private readonly prevCamDir = new THREE.Vector3();
  private hasCamDir = false;
  private readonly facilities = new Facilities();
  private regTries = 0;
  private readonly overlay = new OutcomeOverlay();
  private speed = 0;
  private stillT = 0;
  private walkOffT = 0;
  private shownXtc = 0;
  private audioTimer = 0;
  private lastMode: PerceptionMode = 'sober';
  private snap = false;
  private reducedOverride: boolean | null = null;
  private reducedMedia = false;
  private flameHeat = 0;
  private crowd: { densityAt(x: number, z: number): number } | null | undefined;
  private player: { reducedMotion?: unknown; teleport?: unknown } | null | undefined;

  // transients (not smoothed)
  private rngState = 0x5eed1;
  private refocus = 0;
  private dazzle = 0;
  private lurchY = 0;
  private lurchYV = 0;
  private lurchR = 0;
  private lurchRV = 0;
  private stumbleT = 0;
  private stumbleEnv = 0;
  private gapT = -1;
  private gapLen = 0;
  private sinceGap = 99;
  private nystPhase = 0;
  private heartPhase = 0;
  private heatVis = 0;
  private starVis = 0;
  private veilVis = 0;
  private seq: 'none' | 'falling' | 'card' | 'waking' = 'none';
  private seqKind: OutcomeKind = 'none';
  private seqT = 0;
  private seqFade = 0;
  private seatedEnv = 0;
  private highBacT = 0;
  private sitCooldown = 0;
  private sitBacAt = 0;
  private collapseArmed = true;
  private epiloguePending = false;
  private heatNoted = false;
  private sodiumNoted = false;
  private nauseaNoted = false;
  private readonly noteAt: Record<NoteKey, number> = {
    stumble: -1e9,
    memoryGap: -1e9,
    heatDanger: -1e9,
    hyponatraemia: -1e9,
    nausea: -1e9,
    water: -1e9,
    waterSip: -1e9,
    firstAid: -1e9,
    firstAidLeave: -1e9,
    aircon: -1e9,
  };
  private now = 0;

  constructor() {
    this.risk = this.riskModel.state;
  }

  init(app: App): void {
    this.app = app;
    this.lastPos.copy(app.playerPos);
    const heat = app.params.get('heat');
    if (heat === 'heatwave' || heat === 'endshow') this.setHeatScenario(heat);
    const rm = app.params.get('reducedmotion');
    if (rm !== null) this.reducedOverride = rm !== '0' && rm !== 'false';
    try {
      const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      if (mq) {
        this.reducedMedia = mq.matches;
        mq.addEventListener?.('change', (e) => (this.reducedMedia = e.matches));
      }
    } catch {
      /* no media queries (tests) */
    }
    this.registerFacilities();
  }

  get mode(): PerceptionMode {
    return this.xtcPhase !== 'off' ? 'xtc' : this.bac > 0.005 || this.stomach > 0.05 ? 'alcohol' : 'sober';
  }

  /** player chose to rest / cool down (true) or back to automatic (false) */
  get resting(): boolean {
    return this.riskInput.resting;
  }

  /** current heat scenario (Endshow night by default) */
  get heat(): HeatScenario {
    return this.riskModel.scenario;
  }

  /** compact ambient chip text, e.g. "Air 22.5 °C · 81 % humidity" */
  get air(): string {
    return this.riskModel.scenario.short;
  }

  /** "Dancing" / "Walking" / "Standing" / "Resting" / "Cooling down" / "First aid" */
  get activityLabel(): string {
    return this.risk.activityLabel;
  }

  /**
   * Visibly under the influence: Dutch Alcoholwet forbids serving alcohol to such a person (the bars may
   * refuse and offer free water instead).
   */
  get visiblyIntoxicated(): boolean {
    return this.bac >= 1.1 || this.xtcPhase === 'plateau' || this.outcome !== 'none';
  }

  /** comfort: no screen swim, head roll, nystagmus or look lag (prefers-reduced-motion, ?reducedmotion) */
  get reducedMotion(): boolean {
    if (this.reducedOverride !== null) return this.reducedOverride;
    if (this.player === undefined && this.app) this.player = (this.app.get('player') as unknown as { reducedMotion?: unknown; teleport?: unknown } | undefined) ?? null;
    const flag = this.player?.reducedMotion;
    if (typeof flag === 'boolean') return flag;
    return this.reducedMedia;
  }

  /** force reduced motion on/off; null = follow the player setting / OS preference */
  setReducedMotion(on: boolean | null): void {
    this.reducedOverride = on;
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

  /** water drunk (ml) — hydration, and the over-drinking (hyponatraemia) branch under XTC */
  addWater(ml: number): void {
    if (ml > 0) this.riskModel.addWater(ml);
  }

  setActivity(mode: ActivityMode): void {
    this.activityMode = mode;
    this.walkOffT = 0;
  }

  /** compat: true = rest / cool down, false = automatic */
  setResting(on: boolean): void {
    this.setActivity(on ? 'rest' : 'auto');
  }

  /** Endshow night (22.5 °C, 81 %) or the code-red festival afternoon (36.8 °C) */
  setHeatScenario(id: HeatScenarioId): void {
    const s = HEAT_SCENARIOS[id];
    if (s) this.riskModel.setScenario(s);
  }

  /** skip the gentle build-up once (screenshots, previews): the next frame shows the full effect */
  settle(): void {
    this.snap = true;
  }

  /** reset button: return to sober instantly */
  soberUp(): void {
    this.bac = 0;
    this.stomach = 0;
    this.xtc = this.xtcFx = 0;
    this.xtcOn = false;
    this.xtcPhase = 'off';
    this.xtcTime = 0;
    this.xtcStop = 1;
    this.shownXtc = 0;
    this.riskModel.reset();
    this.aided = false;
    this.resetTransients();
    const d = PostFX.defaults();
    for (const k of KEYS) this.smooth[k] = d[k];
    if (this.app) {
      this.write();
      Object.assign(this.app.postfx.body, PostFX.bodyDefaults());
    }
  }

  /** start / stop the educational XTC perception simulation */
  setXtc(on: boolean): void {
    if (on) {
      if (!this.xtcOn || this.xtcStop < 1) {
        this.xtcOn = true;
        this.xtcTime = 0;
        this.xtcStop = 1;
        this.peakTemp = this.risk.bodyTemp;
        this.minWater = this.risk.hydration;
        this.nauseaNoted = false;
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
      Object.assign(this.app.postfx.body, PostFX.bodyDefaults());
      Object.assign(this.motor, { sway: 0, inputLag: 0, balance: 0, lookJitter: 0, speedScale: 1, stumble: 0, seated: 0 });
      this.app.audio.setPerception(0, 0);
      this.overlay.hide();
      this.outcome = 'none';
      this.seq = 'none';
    }
  }

  /** walk (with a friend / the team) to the first-aid heat post and be cared for there */
  goToFirstAid(): void {
    this.registerFacilities();
    const pl = this.app?.get('player') as unknown as { teleport?(s: NamedSpot): void } | undefined;
    if (this.facilities.registered && pl && typeof pl.teleport === 'function') pl.teleport(this.facilities.firstAidSpot);
    this.aided = true;
    this.hasCamDir = false;
  }

  /** answer the current outcome card (for UIs that render their own cards) */
  resolveOutcome(action: OutcomeAction): void {
    this.overlay.hide();
    const kind = this.outcome;
    this.outcome = 'none';
    if (action === 'sober') {
      this.setXtc(false);
      this.setCompare(false);
      this.soberUp();
      this.app?.events.emit('perception:changed', { mode: 'sober' });
      return;
    }
    if (action === 'firstaid') {
      this.goToFirstAid();
      this.note('firstAid', 6000, true);
      if (kind === 'sitdown') {
        this.sitCooldown = 150;
        this.sitBacAt = this.bac;
      }
    }
    if (kind === 'sitdown' || kind === 'collapse') {
      this.seq = 'waking';
      this.seqT = 0;
    } else this.seq = 'none';
  }

  update(ctx: FrameContext): void {
    if (!this.enabled) return;
    const dt = ctx.dt;
    this.now = ctx.time;
    if (!this.facilities.registered && this.regTries < 900) this.registerFacilities();
    this.simulateAlcohol(dt);
    this.simulateXtc(dt);

    // player speed (m/s) for activity; jumps > 5 m are teleports, not running
    const p = this.app.playerPos;
    if (dt > 0) {
      const d = Math.hypot(p.x - this.lastPos.x, p.z - this.lastPos.z);
      const v = d > 5 ? 0 : d / dt;
      this.speed += (Math.min(v, 8) - this.speed) * damp(0.5, dt);
    }
    this.lastPos.copy(p);
    const turn = this.cameraTurnRate(ctx, dt);

    // physiology
    this.estimateActivity(ctx, dt);
    const ri = this.riskInput;
    ri.xtc = this.xtcFx;
    ri.phase = this.xtcPhase;
    ri.xtcTime = this.xtcTime;
    ri.bac = this.bac;
    ri.overstimulation = this.shownXtc * ctx.beat.energy * (ctx.showPlaying ? 1 : 0.4);
    this.riskModel.update(dt, ri);
    if (this.aided) this.riskModel.treat(dt);
    if (this.xtcPhase !== 'off') {
      this.peakTemp = Math.max(this.peakTemp, this.risk.bodyTemp);
      this.minWater = Math.min(this.minWater, this.risk.hydration);
    }

    // outcomes + transients
    this.updateOutcomes(ctx, dt);
    this.updateTransients(ctx, dt, turn);

    // targets
    const t = this.target;
    resetParams(t);
    const mt = this.motorTarget;
    resetMotor(mt);
    alcoholVisual(t, this.bac, ctx.time);
    alcoholMotor(mt, this.bac);
    const xp = this.xtcPhase !== 'off';
    xtcVisual(t, mt, this.xtcFx, xp ? xtcDrained(this.xtcTime) : 0, xp ? xtcNausea(this.xtcTime) * this.xtcStop : 0, this.dazzle);
    heatVisual(t, mt, this.heatDanger());
    sodiumVisual(t, mt, this.risk.overhydration, ctx.time);
    if (this.compare && this.mode === 'sober') alcoholVisual(t, COMPARE_PREVIEW_BAC, ctx.time);

    // smooth build-up (slow, gentle), then transients and beat-driven pulses on top
    const k = this.snap ? 1 : damp(0.9, dt);
    for (const key of KEYS) this.smooth[key] += (t[key] - this.smooth[key]) * k;
    const km = this.snap ? 1 : damp(0.6, dt);
    for (const key of MOTOR_KEYS) this.motor[key] += (mt[key] - this.motor[key]) * km;
    this.shownXtc += (this.xtcFx - this.shownXtc) * k;
    this.snap = false;
    this.write();
    this.applyTransients(ctx);
    this.pulses(ctx);

    // audio (throttled)
    this.audioTimer -= dt;
    if (this.audioTimer <= 0) {
      this.audioTimer = 0.2;
      const gapFade = this.gapFade();
      const muffle = Math.max(table(ALCOHOL_FX.muffle, this.bac), 0.4 * this.heatDanger(), 0.85 * gapFade, 0.7 * this.seqFade, 0.25 * this.risk.overhydration);
      this.app.audio.setPerception(Math.min(0.92, muffle), table(ALCOHOL_FX.audioWobble, this.bac));
    }

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
      xtc: this.xtcFx.toFixed(2),
      phase: this.xtcPhase,
      temp: this.risk.bodyTemp.toFixed(1),
      feels: this.risk.feelsLikeC.toFixed(1),
      hydration: this.risk.hydration.toFixed(2),
      overhydration: this.risk.overhydration.toFixed(2),
      hr: Math.round(this.risk.heartRate),
      activity: `${this.risk.activityLabel} ${this.risk.activity.toFixed(2)}`,
      air: this.air,
      outcome: this.seq === 'none' ? this.outcome : `${this.seq}:${this.seqKind}`,
      aided: this.aided ? 1 : 0,
      reducedMotion: this.reducedMotion ? 1 : 0,
      warnings: this.risk.warnings.length,
    };
  }

  dispose(): void {
    this.overlay.hide();
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
      this.xtc = this.xtcFx = 0;
      this.xtcPhase = 'off';
      return;
    }
    this.xtcTime += dt;
    this.xtcPhase = xtcPhase(this.xtcTime);
    if (this.xtcStop < 1) this.xtcStop = Math.max(0, this.xtcStop - dt / XTC_STOP_FADE);
    if (this.xtcPhase === 'off' || this.xtcStop <= 0) {
      const natural = this.xtcPhase === 'off' && this.xtcStop >= 1;
      this.xtcOn = false;
      this.xtcPhase = 'off';
      this.xtc = this.xtcFx = 0;
      this.xtcStop = 1;
      if (natural) this.epiloguePending = true;
      return;
    }
    this.xtcFx = xtcIntensity(this.xtcTime) * this.xtcStop;
    this.xtc = Math.max(this.xtcFx, 0.002);
  }

  private registerFacilities(): void {
    if (!this.app || this.facilities.registered) return;
    this.regTries++;
    this.facilities.register(
      this.app,
      () => this.drinkFreeWater(),
      () => {
        this.aided = true;
        this.note('firstAid', 6000, true);
      },
    );
  }

  private drinkFreeWater(): void {
    const sipWarn = this.xtcPhase !== 'off' && this.riskModel.waterLoad > 300;
    this.addWater(250);
    this.note(sipWarn ? 'waterSip' : 'water', 3200, true);
  }

  /** where the player is and how they move -> activity, micro-climate, cooling */
  private estimateActivity(ctx: FrameContext, dt: number): void {
    const p = this.app.playerPos;
    const ri = this.riskInput;
    const density = this.densityAt(p.x, p.z);
    const packed = smoothstep(0.3, 2.2, density);
    const onField = Math.abs(p.x) < 95 && p.z > -3 && p.z < 175;
    // radiant heat from flames close by (bible: +2 °C within ~15 m of active flames)
    const env = this.app.env;
    const fd = Math.hypot(env.flashPos.x - p.x, env.flashPos.y - p.y - 1.6, env.flashPos.z - p.z);
    const flame = 2 * smoothstep(0.4, 3, env.flashIntensity) * (1 - smoothstep(15, 32, fd));
    this.flameHeat += (flame - this.flameHeat) * damp(flame > this.flameHeat ? 3 : 10, dt);
    ri.microC = (onField ? table(ZONE_MICRO_C, p.z) * packed : 0) + this.flameHeat;
    ri.exposure = 1 - smoothstep(0.5, 2.5, density);

    // dancing: the crowd around you dances; on the empty grounds you dance near the stage
    const nearStage = onField && Math.abs(p.x) < 70 ? 1 - smoothstep(80, 150, p.z) : 0;
    let dance = Math.max(packed, nearStage * (density > 0.05 ? 0.6 : 1));
    if (this.activityMode === 'dance') dance = 1;
    this.stillT = this.speed < 0.3 ? this.stillT + dt : 0;
    if (this.activityMode === 'rest' && this.speed > 1) {
      this.walkOffT += dt;
      if (this.walkOffT > 2.5) this.activityMode = 'auto'; // walking off ends an explicit rest
    } else this.walkOffT = 0;

    if (this.aided && this.facilities.registered && this.facilities.firstAidDistance(p.x, p.z) > 28) {
      this.aided = false;
      this.note('firstAidLeave', 3000, true);
    }
    const mist = this.facilities.mistAt(p.x, p.z);
    const shade = this.facilities.registered && this.facilities.nearFirstAid(p.x, p.z) ? 0.5 : 0;
    ri.cooling = this.aided ? 1.2 : Math.max(0.5 * mist, shade);
    const seated = this.seq !== 'none';
    const autoRest = this.stillT > 5 && dance < 0.35;
    const resting = seated || this.aided || (this.activityMode === 'rest' && this.speed < 1) || (this.activityMode === 'auto' && autoRest);
    const walking = Math.min(1, this.speed / 3.4);
    const dancing = ctx.showPlaying && !resting ? dance * (0.3 + 0.62 * ctx.beat.energy) : 0;
    ri.resting = resting;
    ri.activity = resting ? Math.max(0.08, walking) : Math.min(1, Math.max(0.15, dancing, walking));
    const r = this.risk;
    r.activity = ri.activity;
    r.activityLabel = this.aided
      ? 'First aid'
      : resting && ri.cooling > 0.2
        ? 'Cooling down'
        : resting
          ? 'Resting'
          : walking > Math.max(dancing, 0.25)
            ? 'Walking'
            : dancing > 0.2
              ? 'Dancing'
              : 'Standing';
  }

  private densityAt(x: number, z: number): number {
    if (this.crowd === undefined) {
      const c = this.app.get('crowd') as unknown as { densityAt?: unknown } | undefined;
      this.crowd = c && typeof c.densityAt === 'function' ? (c as { densityAt(x: number, z: number): number }) : null;
    }
    if (!this.crowd || !this.app.isSystemEnabled('crowd')) return 0;
    const d = this.crowd.densityAt(x, z);
    return Number.isFinite(d) ? Math.max(0, d) : 0;
  }

  /** camera angular speed (rad/s); 0 on cuts / teleports */
  private cameraTurnRate(ctx: FrameContext, dt: number): number {
    ctx.camera.getWorldDirection(this.camDir);
    let w = 0;
    if (this.hasCamDir && dt > 0) {
      const a = Math.acos(Math.min(1, Math.max(-1, this.camDir.dot(this.prevCamDir))));
      w = a > 0.8 ? 0 : a / dt;
    }
    this.prevCamDir.copy(this.camDir);
    this.hasCamDir = true;
    return w;
  }

  /** 0..1 heat danger from core temperature (visible from 38.5 °C, full at 40 °C) */
  private heatDanger(): number {
    const x = clamp01((this.risk.bodyTemp - (HEAT_DANGER_C - 0.1)) / (COLLAPSE_C - HEAT_DANGER_C + 0.1));
    return x > 0 ? Math.pow(x, 0.8) : 0;
  }

  private rand(): number {
    // mulberry32
    let t = (this.rngState = (this.rngState + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private resetTransients(): void {
    this.rngState = 0x5eed1;
    this.refocus = this.dazzle = 0;
    this.lurchY = this.lurchYV = this.lurchR = this.lurchRV = 0;
    this.stumbleT = this.stumbleEnv = 0;
    this.gapT = -1;
    this.sinceGap = 99;
    this.heatVis = this.starVis = this.veilVis = 0;
    this.seq = 'none';
    this.seqKind = 'none';
    this.seqFade = this.seatedEnv = 0;
    this.highBacT = this.sitCooldown = 0;
    this.collapseArmed = true;
    this.epiloguePending = false;
    this.heatNoted = this.sodiumNoted = false;
    this.flameHeat = 0;
    this.outcome = 'none';
    this.overlay.hide();
  }

  // ------------------------------------------------------------------ outcomes

  private updateOutcomes(ctx: FrameContext, dt: number): void {
    const bac = this.bac;
    const T = this.risk.bodyTemp;
    this.sitCooldown = Math.max(0, this.sitCooldown - dt);
    this.highBacT = bac >= SITDOWN_SUSTAINED_BAC ? this.highBacT + dt : 0;
    if (T < HYPERTHERMIA_C - 0.5) this.collapseArmed = true;

    // sequences: falling / fainting -> card -> waking up at first aid
    if (this.seq === 'falling') {
      this.seqT += dt;
      const len = this.seqKind === 'collapse' ? 2.8 : 1.8;
      this.seqFade = Math.min(this.seqKind === 'collapse' ? 0.93 : 0.72, smooth01(this.seqT / len) * (this.seqKind === 'collapse' ? 0.93 : 0.72));
      if (this.seqT >= len) {
        this.seq = 'card';
        this.showCard(this.seqKind);
      }
    } else if (this.seq === 'card') {
      if (this.outcome === 'none') {
        // resolved elsewhere without an action
        this.seq = 'waking';
        this.seqT = 0;
      }
    } else if (this.seq === 'waking') {
      this.seqT += dt;
      this.seqFade = Math.max(0, this.seqFade - dt / 2.5);
      if (this.seqFade <= 0) this.seq = 'none';
    }

    if (this.seq === 'none' && this.outcome === 'none') {
      if (this.epiloguePending) {
        this.epiloguePending = false;
        this.showCard('epilogue');
        return;
      }
      const reBac = this.sitCooldown <= 0 || bac >= this.sitBacAt + 0.3;
      if (reBac && !this.aided && (bac >= SITDOWN_BAC || this.highBacT >= SITDOWN_SUSTAINED_S)) this.begin('sitdown');
      else if (T >= COLLAPSE_C && this.collapseArmed && !this.aided) {
        this.collapseArmed = false;
        this.begin('collapse');
      }
    }

    // one-off notices
    if (T >= HEAT_DANGER_C && !this.heatNoted) {
      this.heatNoted = true;
      this.note('heatDanger', 7000);
    } else if (T < HEAT_DANGER_C - 0.4) this.heatNoted = false;
    if (this.risk.overhydration >= 0.3 && !this.sodiumNoted) {
      this.sodiumNoted = true;
      this.note('hyponatraemia', 7000);
    } else if (this.risk.overhydration < 0.1) this.sodiumNoted = false;
    if (!this.nauseaNoted && this.xtcPhase === 'onset' && xtcNausea(this.xtcTime) > 0.5) {
      this.nauseaNoted = true;
      this.note('nausea', 4500);
    }

    // stumbles: from 1.2‰ while walking, from 2‰ also standing; dizziness in heat danger / hyponatraemia
    const busy = this.seq !== 'none' || this.outcome !== 'none';
    let rate = table(ALCOHOL_FX.stumbleRate, bac);
    if (bac < 2 && this.speed < 0.4) rate *= 0.15;
    if (T >= HYPERTHERMIA_C) rate += 1.4;
    else if (T >= HEAT_DANGER_C + 0.4) rate += 0.5;
    if (this.risk.overhydration > 0.5) rate += 0.8;
    this.stumbleT = Math.max(0, this.stumbleT - dt);
    if (!busy && this.stumbleT <= 0 && this.rand() < (rate / 60) * dt) this.startStumble(0.7 + 0.3 * this.rand());

    // memory gaps (1.6‰+): a few seconds simply go missing
    this.sinceGap += dt;
    if (this.gapT >= 0) {
      this.gapT += dt;
      if (this.gapT > this.gapLen + 0.1) {
        this.gapT = -1;
        this.sinceGap = 0;
      }
    } else if (!busy && this.sinceGap > 14 && this.rand() < (table(ALCOHOL_FX.gapRate, bac) / 60) * dt) {
      this.gapT = 0;
      this.gapLen = table(ALCOHOL_FX.gapLength, bac) * (0.7 + 0.6 * this.rand());
      this.note('memoryGap', 6000);
    }
  }

  private begin(kind: OutcomeKind): void {
    this.seq = 'falling';
    this.seqKind = kind;
    this.seqT = 0;
    this.gapT = -1;
    // the body gives way: a big lurch down and sideways
    this.lurchYV += kind === 'collapse' ? 0.5 : 0.45;
    this.lurchRV += (this.rand() < 0.5 ? -1 : 1) * 0.35;
  }

  private startStumble(s: number): void {
    this.stumbleT = 1.0;
    this.stumbleEnv = 1;
    this.lurchYV += 0.42 * s;
    this.lurchRV += (this.rand() < 0.5 ? -1 : 1) * (0.3 + 0.25 * this.rand()) * s;
    this.refocus = Math.max(this.refocus, 0.7 * s);
    this.note('stumble', 3500);
  }

  private showCard(kind: OutcomeKind): void {
    if (kind === 'none') return;
    this.outcome = kind;
    if (!this.renderOutcomeCards) return;
    const text = OUTCOME_CARDS[kind];
    const fill = { T: this.peakTemp.toFixed(1), W: String(Math.round(this.minWater * 100)) };
    this.overlay.show(text, fill, (a) => this.resolveOutcome(a));
  }

  /** toast, once per NOTE_REPEAT_S (always when `force`, e.g. a direct interaction) */
  private note(key: NoteKey, ms: number, force = false): void {
    if (!force && this.now - this.noteAt[key] < NOTE_REPEAT_S) return;
    this.noteAt[key] = this.now;
    this.app?.events.emit('toast', { text: OUTCOME_NOTES[key], ms });
  }

  // ------------------------------------------------------------------ transients

  private updateTransients(ctx: FrameContext, dt: number, turn: number): void {
    // refocus blur after fast head turns: accommodation / pursuit lag grows with BAC
    const impair = Math.min(1, this.bac / 1.4) + 0.35 * this.xtcFx;
    const want = impair * smoothstep(0.9, 3.2, turn);
    this.refocus += (want - this.refocus) * damp(want > this.refocus ? 0.06 : 0.35 + 0.3 * Math.min(2, this.bac), dt);

    // dilated pupils: strobes and flashes dazzle instantly, recovery is slow
    const env = this.app.env;
    const load = Math.min(1, env.strobe + env.flashIntensity * 0.12);
    this.dazzle += (load - this.dazzle) * damp(load > this.dazzle ? 0.05 : 1.4, dt);

    // head lurch spring (sub-stepped): stumbles, falling
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / steps;
    const w = 7.5;
    const z = this.seq === 'falling' || this.seq === 'card' ? 0.9 : 0.42;
    const restY = this.seq === 'falling' || this.seq === 'card' ? 0.05 : 0;
    for (let i = 0; i < steps; i++) {
      this.lurchYV += (-w * w * (this.lurchY - restY) - 2 * z * w * this.lurchYV) * h;
      this.lurchY += this.lurchYV * h;
      this.lurchRV += (-w * w * this.lurchR - 2 * z * w * this.lurchRV) * h;
      this.lurchR += this.lurchRV * h;
    }
    this.stumbleEnv = Math.max(0, this.stumbleEnv - dt / 1.0);
    const sitting = this.seq === 'falling' || this.seq === 'card' ? 1 : this.seq === 'waking' ? Math.min(1, this.seqFade / 0.72) : 0;
    this.seatedEnv += (sitting - this.seatedEnv) * damp(0.4, dt);

    // nystagmus (jerk waveform: slow drift, fast correction) and heartbeat phases
    const nf = this.xtcFx > 0.2 ? 4.2 : 3.2;
    this.nystPhase = (this.nystPhase + dt * nf) % 1;
    this.heartPhase = (this.heartPhase + (dt * this.risk.heartRate) / 60) % 1;

    // slow visual state of body overlays
    const snap = this.snap;
    this.heatVis += (this.heatDanger() - this.heatVis) * (snap ? 1 : damp(1.5, dt));
    this.starVis += (0.3 * this.xtcFx - this.starVis) * (snap ? 1 : damp(0.9, dt));
    this.veilVis += (this.xtcFx * (0.22 + 0.78 * this.dazzle) - this.veilVis) * (snap ? 1 : damp(0.12, dt));
  }

  private gapFade(): number {
    if (this.gapT < 0) return 0;
    const t = this.gapT;
    if (t < 0.22) return smooth01(t / 0.22) * 0.97;
    if (t < this.gapLen) return 0.97;
    return 0.97 * (1 - clamp01((t - this.gapLen) / 0.1));
  }

  /** copy smoothed params + compare split into the post chain */
  private write(): void {
    const out = this.app.postfx.perception;
    for (const key of KEYS) out[key] = this.smooth[key];
    out.split = this.compare ? this.splitX : -1;
  }

  /** transients that must not be smoothed: refocus, stumble, gaps, falling, heat pulse, head motion */
  private applyTransients(ctx: FrameContext): void {
    const out = this.app.postfx.perception;
    const b = this.app.postfx.body;
    const reduced = this.reducedMotion;
    out.blur += 0.26 * this.refocus + 0.1 * this.stumbleEnv;
    out.doubleVision = Math.max(out.doubleVision, 0.4 * this.stumbleEnv, 0.3 * this.refocus * Math.min(1, this.bac / 1.2));
    const faint = this.seqKind === 'collapse' && this.seq !== 'none' ? this.seqFade : 0;
    out.saturation *= 1 - 0.85 * faint;
    out.tunnel = Math.min(1, out.tunnel + 0.5 * this.seqFade);
    if (reduced) out.wobble = 0;

    // head motion: nystagmus (alcohol gaze-evoked after turns, XTC fine and constant), jaw clench, lurch
    const fov = Math.max(20, ctx.camera.fov);
    const nystDeg = table(ALCOHOL_FX.nystagmus, this.bac) * (0.3 + 0.7 * clamp01(this.refocus * 1.6)) + 0.2 * this.xtcFx;
    const ph = this.nystPhase;
    const saw = ph < 0.82 ? ph / 0.82 : 1 - (ph - 0.82) / 0.18;
    const jaw = this.xtcFx * Math.max(0, Math.sin(ctx.time * 0.55) * Math.sin(ctx.time * 0.23 + 1));
    const shake = jaw * 0.0011 * Math.sin(ctx.time * Math.PI * 2 * 11);
    b.offX = reduced ? 0 : ((saw - 0.5) * nystDeg) / fov;
    b.offY = (reduced ? 0.3 : 1) * this.lurchY + (reduced ? 0 : shake);
    b.roll = reduced ? 0 : this.lurchR * 0.75;
    b.fade = Math.max(this.gapFade(), this.seqFade);
    b.heat = this.heatVis;
    const f = this.heartPhase;
    b.pulse = Math.exp(-((f - 0.04) * (f - 0.04)) / 0.004) + 0.55 * Math.exp(-((f - 0.3) * (f - 0.3)) / 0.005);
    b.veil = 1.1 * this.veilVis;
    b.star = this.starVis;

    // motor: stumbles freeze you for ~0.5 s, sitting / falling stops you, first aid slows you
    const m = this.motor;
    m.stumble = this.stumbleEnv;
    m.seated = this.seatedEnv;
    if (this.stumbleT > 0.5) m.speedScale = Math.min(m.speedScale, 0.06);
    if (this.seatedEnv > 0.05) m.speedScale = Math.min(m.speedScale, 1 - 0.97 * this.seatedEnv);
    if (this.aided) m.speedScale = Math.min(m.speedScale, 0.7);
    const s = this.stumbleEnv;
    m.sway = Math.min(1, m.sway + 0.5 * s + 0.4 * this.seatedEnv);
    m.balance = Math.min(1, m.balance + 0.6 * s);
    m.lookJitter = Math.min(1, m.lookJitter + 0.5 * s);
    if (reduced) {
      m.sway *= 0.25;
      m.lookJitter *= 0.25;
      m.inputLag = 0;
    }
  }

  /**
   * Beat-synced overstimulation: small exposure / bloom swells on kicks (small amplitude on purpose —
   * photosensitivity). No hue cycling or pattern breathing: MDMA is not a psychedelic, and the effect must
   * not look like an attractive filter.
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
    out.exposure += 0.03 * kick * x;
    out.bloomBoost += 0.3 * kick * x;
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

/**
 * alcohol: tracking lag and smear, lingering glare, a narrowed field and double vision that comes and
 * goes (episodes get longer with BAC until the double image is persistent); `time` drives the episodes.
 */
function alcoholVisual(t: PerceptionParams, bac: number, time: number): void {
  if (bac <= 0.01) return;
  const F = ALCOHOL_FX;
  t.blur = Math.max(t.blur, table(F.blur, bac));
  const duty = table(F.diplopiaDuty, bac);
  const n = 0.5 + 0.3 * Math.sin(time * 0.21) + 0.2 * Math.sin(time * 0.53 + 1.7);
  const episode = duty >= 1 ? 1 : 1 - smoothstep(duty - 0.12, duty + 0.12, n);
  t.doubleVision = Math.max(t.doubleVision, table(F.doubleVision, bac) * episode);
  t.chroma = Math.max(t.chroma, table(F.chroma, bac));
  t.wobble = Math.max(t.wobble, table(F.wobble, bac) * (0.85 + 0.15 * Math.sin(time * 0.23)));
  t.tunnel = Math.max(t.tunnel, table(F.tunnel, bac));
  t.contrast *= table(F.contrast, bac);
  t.saturation *= table(F.saturation, bac);
  t.exposure *= table(F.exposure, bac);
  t.motionBlur = Math.max(t.motionBlur, table(F.motionBlur, bac));
  t.afterimage = Math.max(t.afterimage, table(F.afterimage, bac));
  t.lightSensitivity = Math.max(t.lightSensitivity, table(F.lightSensitivity, bac));
  t.trails = Math.max(t.trails, table(F.trails, bac));
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

/**
 * simulated MDMA perception at intensity x (0..1), design bible §12.3: saturation +12 % at most, bloom
 * threshold −30 % with halos, soft glare, trails and afterimages behind lights, over-exposure under
 * strobes (`dazzle`, dilated pupils), slight blur; onset nausea waves; a drained, grey comedown.
 */
function xtcVisual(t: PerceptionParams, m: MotorEffects, x: number, drained: number, nausea: number, dazzle: number): void {
  if (x > 0.001) {
    t.saturation *= 1 + 0.12 * x;
    t.exposure *= 1 + 0.06 * x + 0.22 * x * dazzle;
    t.lightSensitivity = Math.max(t.lightSensitivity, 0.42 * x);
    t.bloomBoost += 0.35 * x;
    t.trails = Math.max(t.trails, 0.5 * x);
    t.afterimage = Math.max(t.afterimage, 0.45 * x);
    // decreased visual acuity (a clinical sign) and a little colour fringing: soft, not glamorous
    t.chroma = Math.max(t.chroma, 0.1 * x);
    t.blur = Math.max(t.blur, 0.1 * x);
    t.wobble = Math.max(t.wobble, 0.05 * x);
    m.lookJitter = Math.min(1, m.lookJitter + 0.15 * x);
    m.sway = Math.min(1, m.sway + 0.08 * x);
  }
  if (nausea > 0.001) {
    t.saturation *= 1 - 0.4 * nausea;
    t.exposure *= 1 - 0.1 * nausea;
    t.wobble = Math.max(t.wobble, 0.4 * nausea);
    t.blur = Math.max(t.blur, 0.08 * nausea);
    t.tunnel = Math.max(t.tunnel, 0.2 * nausea);
    m.sway = Math.min(1, m.sway + 0.35 * nausea);
  }
  if (drained > 0.001) {
    t.saturation *= 1 - 0.3 * drained;
    t.contrast *= 1 - 0.08 * drained;
    t.exposure *= 1 - 0.1 * drained;
    m.speedScale *= 1 - 0.15 * drained;
    m.inputLag += 0.06 * drained;
  }
}

/** heat danger h (0 at 38.5 °C, 1 at 40 °C): tunnel vision, pale washed-out vision, unsteady */
function heatVisual(t: PerceptionParams, m: MotorEffects, h: number): void {
  if (h <= 0.001) return;
  t.tunnel = Math.max(t.tunnel, 0.55 * h);
  t.saturation *= 1 - 0.25 * h;
  t.exposure *= 1 + 0.08 * h;
  t.contrast *= 1 - 0.1 * h;
  t.blur = Math.max(t.blur, 0.06 * h);
  m.sway = Math.min(1, m.sway + 0.3 * h);
  m.balance = Math.min(1, m.balance + 0.3 * h);
  m.speedScale *= 1 - 0.3 * h;
}

/** over-hydration (hyponatraemia) s 0..1: throbbing headache blur, nausea sway */
function sodiumVisual(t: PerceptionParams, m: MotorEffects, s: number, time: number): void {
  if (s <= 0.01) return;
  const throb = s * (0.6 + 0.4 * Math.sin(time * 1.6));
  t.blur = Math.max(t.blur, 0.12 * throb);
  t.wobble = Math.max(t.wobble, 0.35 * s);
  t.saturation *= 1 - 0.18 * s;
  t.tunnel = Math.max(t.tunnel, 0.2 * s);
  m.sway = Math.min(1, m.sway + 0.3 * s);
}
