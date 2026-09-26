import * as THREE from 'three';
import type { App } from '../core/App';
import type { FrameContext, NamedSpot, PerceptionParams, QualitySettings, System } from '../core/types';
import { PostFX, type BodyParams } from '../postfx/PostFX';
import { KETAMINE_CARDS, KETAMINE_MESSAGES, KETAMINE_NOTES, OUTCOME_CARDS, OUTCOME_NOTES, type OutcomeCardText } from './education';
import { Facilities } from './facilities';
import {
  ABSORPTION_PER_H,
  ALCOHOL_FX_BY,
  BODY_MASS_KG,
  COLLAPSE_C,
  ELIMINATION_PER_H,
  HEAT_DANGER_C,
  HEAT_SCENARIOS,
  HYPERTHERMIA_C,
  ketDissociation,
  ketDrained,
  ketHole,
  ketNausea,
  ketNumb,
  ketPhase,
  PERC_TUNE,
  RiskModel,
  SITDOWN_BAC,
  SITDOWN_SUSTAINED_BAC,
  SITDOWN_SUSTAINED_S,
  table,
  TIME_COMPRESSION,
  WIDMARK_R,
  XTC_GAINS,
  xtcDrained,
  xtcIntensity,
  xtcNausea,
  xtcPhase,
  type AlcoholFx,
  type HeatScenario,
  type HeatScenarioId,
  type KetPhase,
  type PerceptionStrength,
  type RiskInput,
  type RiskState,
  type XtcGains,
  type XtcPhase,
} from './models';
import { OutcomeOverlay, type OutcomeAction } from './OutcomeOverlay';

export type PerceptionMode = 'sober' | 'alcohol' | 'xtc' | 'ketamine';
/** 'auto' = dancing follows where you are (in the crowd, near the stage) and how you move */
export type ActivityMode = 'auto' | 'dance' | 'rest';
/** outcome card currently shown (or waiting to be shown by a UI that renders its own cards) */
export type OutcomeKind = 'none' | 'sitdown' | 'collapse' | 'epilogue' | 'khole' | 'ketEpilogue';
export type { RiskState, XtcPhase, KetPhase, HeatScenario, HeatScenarioId, OutcomeAction, PerceptionStrength };

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
  /**
   * 0..1 out-of-body drift (ketamine K-hole): the first-person eye floats up and back behind the head
   * (1 = the full ~1.5 m; already scaled down under reduced motion)
   */
  detach?: number;
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
  'warmth',
  'glow',
  'tint',
  'recede',
] as const satisfies readonly (keyof PerceptionParams)[];

const MOTOR_KEYS = ['sway', 'inputLag', 'balance', 'lookJitter', 'speedScale'] as const;
type NoteKey = keyof typeof OUTCOME_NOTES;
type KetNoteKey = keyof typeof KETAMINE_NOTES;

/** identity values copied into the post chain outside the player's own view (Show camera etc.) */
const IDENTITY_POST: Readonly<PerceptionParams> = PostFX.defaults();
const IDENTITY_BODY: Readonly<BodyParams> = { ...PostFX.bodyDefaults(), star: 0 };

/** BAC shown on the altered side of compare mode when nothing is active */
const COMPARE_PREVIEW_BAC = 1.0;
/** seconds for a manual XTC / ketamine stop to fade out */
const XTC_STOP_FADE = 4;
/** crowd micro-climate over the floor (°C by distance from the stage front, bible §12.3: +3 A, +1.5 B) */
const ZONE_MICRO_C = [0, 3, 30, 3, 60, 1.5, 113, 0.6, 140, 0];
/** a toast is repeated at most this often (s) */
const NOTE_REPEAT_S = 90;
/** localStorage key of the strength preset (per-viewer convenience) */
const LS_STRENGTH = 'defqon.perceptionStrength';
/** kick pulse (photosensitivity: ≤ 2.8 Hz): decay, refractory time, every 2nd kick above this tempo */
const KICK_TAU = 0.12;
const KICK_REFRACTORY = 0.34;
const KICK_UPTEMPO_BPM = 168;
/** "the spins" creep phase rate (Hz): creep 2.8 s, snap back 0.5 s */
const SPIN_HZ = 0.3;
/** round-6 wobble-delay depth (s) vs the round-7 one: the realistic preset keeps its pitch wow */
const REALISTIC_WOW = 0.004 / 0.009;
/** ketamine effect scale of the realistic preset (the scenario is new in round 7) */
const KET_REALISTIC = 0.6;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
const smoothstep = (a: number, b: number, x: number) => smooth01((x - a) / (b - a));
const damp = (tau: number, dt: number) => 1 - Math.exp(-dt / Math.max(1e-4, tau));

function readStrength(): PerceptionStrength | null {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_STRENGTH) : null;
    return v === 'strong' || v === 'realistic' ? v : null;
  } catch {
    return null;
  }
}

/**
 * EDUCATIONAL perception simulation.
 *  - alcohol: Widmark BAC (75 kg, r 0.62), first-order absorption, 0.15‰/h elimination, time x10
 *    -> tracking lag and smear, refocus blur after head turns, glare persistence, intermittent double
 *    vision and nystagmus, a narrowed field, sway, reaction lag, muffled audio; stumbles from 1.2‰,
 *    memory gaps from 1.6‰ and a forced "sit down / first aid" outcome from 2‰.
 *  - xtc: compressed timeline (onset / plateau / comedown / after) -> onset nausea waves, dazzle and a
 *    milky glare veil under strobes (dilated pupils), halos, trails, afterimages, fine nystagmus, jaw-clench
 *    shake, a drained comedown and the "dinsdagdip" epilogue, plus the risk layer.
 *  - ketamine: one fixed compressed scenario (onset / peak / K-hole / return / after) -> the world recedes
 *    into a dark tunnel, drained cool colours, slow floating look, heavy sway, slowed and stopped walking,
 *    slumping down and an out-of-body drift in the K-hole, far-away muffled sound with an echo; the
 *    "cannot get up" card and the repeated-use epilogue. No flashing effects.
 *  - body: core temperature from activity (dancing in the crowd, walking, resting), the Endshow night air
 *    (22.5 °C, 81 % humidity) or the code-red afternoon, crowd micro-climate, flames; heat danger from
 *    38.5 °C (tunnel, heartbeat-red periphery, muffled sound, stumbling), collapse and first aid at 40 °C;
 *    over-hydration (hyponatraemia) headache and nausea.
 *  - compare: split screen sober | altered from the same position
 *  - strength: `strong` (default) exaggerates the effects for visibility, `realistic` is the round-6 look.
 * Writes app.postfx.perception (smoothed) + app.postfx.body and `motor` every frame — identity values when
 * the view is not the player's own (Show camera, fly-over, free, photo: the body state keeps running). No
 * usage/dosing info, ever. Outcomes are driven by a seeded RNG (reproducible for the same inputs).
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
  /** 0..1 ketamine dissociation (tiny non-zero while the scenario runs, like `xtc`) */
  ket = 0;
  compare = false;
  readonly motor: MotorEffects = { sway: 0, inputLag: 0, balance: 0, lookJitter: 0, speedScale: 1, stumble: 0, seated: 0, detach: 0 };
  /** live physiology + factual warnings for the UI */
  readonly risk: RiskState;
  /** grams of alcohol consumed but not yet absorbed */
  stomach = 0;
  /** XTC timeline phase and seconds since its start */
  xtcPhase: XtcPhase = 'off';
  xtcTime = 0;
  /** ketamine scenario phase and seconds since its start */
  ketPhase: KetPhase = 'off';
  ketTime = 0;
  /** ketamine risk monitor 0..1 (1 = unimpaired) */
  readonly ketMonitor = { coordination: 1, awareness: 1, movement: 1 };
  /** current ketamine monitor messages (constant strings, most important first; refreshed at 2 Hz) */
  readonly ketWarnings: string[] = [];
  /** effect strength preset */
  strength: PerceptionStrength = 'strong';
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
  private F: AlcoholFx = ALCOHOL_FX_BY.strong;
  private G: XtcGains = XTC_GAINS.strong;
  private xtcFx = 0;
  private xtcOn = false;
  private xtcStop = 1;
  private ketFx = 0;
  private ketHoleV = 0;
  private ketOn = false;
  private ketStop = 1;
  private ketCardShown = false;
  private ketEpiloguePending = false;
  private ketNoted = 0;
  private ketWarnTimer = 0;
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
  private cam: { mode?: string } | null | undefined;
  /** the view is the player's own (first / third person): perception applies */
  private own = true;
  private pendingParams = true;

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
  /** signed camera yaw rate (rad/s, + = turning left); 0 outside the own view */
  private yawRate = 0;
  /** look overshoot spring (deg) */
  private osX = 0;
  private osV = 0;
  /** "the spins": time standing still, envelope, creep phase, direction, current offset (deg) */
  private spinT = 0;
  private spinEnv = 0;
  private spinPh = 0;
  private spinDir = 1;
  private spinDeg = 0;
  /** kick pulse envelope and detector */
  private kickEnv = 0;
  private kickPrev = 0;
  private kickCount = 0;
  private lastKickAt = -1e9;
  /** out-of-body drift envelope (ketamine) */
  private detachEnv = 0;
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
  private readonly ketNoteAt: Record<KetNoteKey, number> = { onset: -1e9, hole: -1e9, stumble: -1e9, back: -1e9, firstAid: -1e9 };
  private now = 0;

  constructor() {
    this.risk = this.riskModel.state;
  }

  init(app: App): void {
    this.app = app;
    this.lastPos.copy(app.playerPos);
    const P = app.params;
    const heat = P.get('heat');
    if (heat === 'heatwave' || heat === 'endshow') this.setHeatScenario(heat);
    // comfort: ?reducedmotion (perception), ?reducemotion / ?comfort (the player's names)
    const rm = P.get('reducedmotion') ?? P.get('reducemotion') ?? P.get('comfort');
    if (rm !== null) this.reducedOverride = rm !== '0' && rm !== 'false' && rm !== 'off';
    try {
      const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      if (mq) {
        this.reducedMedia = mq.matches;
        mq.addEventListener?.('change', (e) => (this.reducedMedia = e.matches));
      }
    } catch {
      /* no media queries (tests) */
    }
    const ps = P.get('pstrength');
    this.setStrength(ps === 'realistic' || ps === 'strong' ? ps : (readStrength() ?? 'strong'));
    this.registerFacilities();
  }

  get mode(): PerceptionMode {
    return this.ketPhase !== 'off' ? 'ketamine' : this.xtcPhase !== 'off' ? 'xtc' : this.bac > 0.005 || this.stomach > 0.05 ? 'alcohol' : 'sober';
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

  /** the effects are shown (first / third person); false in the Show camera, fly-over, free and photo modes */
  get viewActive(): boolean {
    return this.own;
  }

  /**
   * Visibly under the influence: Dutch Alcoholwet forbids serving alcohol to such a person (the bars may
   * refuse and offer free water instead).
   */
  get visiblyIntoxicated(): boolean {
    return this.bac >= 1.1 || this.xtcPhase === 'plateau' || this.ketPhase !== 'off' || this.outcome !== 'none';
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

  /**
   * Effect strength: `strong` (default) exaggerates for visibility, `realistic` is the round-6 look.
   * Only the mapping from state to visuals, sound and motor changes; the simulation, the risk model and
   * the outcomes are the same. `remember` stores the choice for this viewer.
   */
  setStrength(s: PerceptionStrength, remember = false): void {
    const v: PerceptionStrength = s === 'realistic' ? 'realistic' : 'strong';
    this.strength = v;
    this.F = ALCOHOL_FX_BY[v];
    this.G = XTC_GAINS[v];
    if (this.app) Object.assign(this.app.postfx.percTune, PERC_TUNE[v]);
    if (remember) {
      try {
        localStorage.setItem(LS_STRENGTH, v);
      } catch {
        /* storage unavailable: not remembered */
      }
    }
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
    this.ket = this.ketFx = this.ketHoleV = 0;
    this.ketOn = false;
    this.ketPhase = 'off';
    this.ketTime = 0;
    this.ketStop = 1;
    this.shownXtc = 0;
    this.riskModel.reset();
    this.aided = false;
    this.resetTransients();
    const d = IDENTITY_POST;
    for (const k of KEYS) this.smooth[k] = d[k];
    if (this.app) {
      this.write();
      Object.assign(this.app.postfx.body, IDENTITY_BODY);
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

  /** start / stop the educational ketamine simulation (one fixed scenario, never a choice of amount) */
  setKetamine(on: boolean): void {
    if (on) {
      if (!this.ketOn || this.ketStop < 1) {
        this.ketOn = true;
        this.ketTime = 0;
        this.ketStop = 1;
        this.ketCardShown = false;
        this.ketNoted = 0;
      }
    } else if (this.ketOn) this.ketStop = Math.min(this.ketStop, 0.999);
  }

  setCompare(on: boolean): void {
    this.compare = on;
    // outside the own view (Show camera ...) the split stays off; write() re-applies it on return
    if (this.app && this.isOwnView()) this.app.postfx.perception.split = on ? this.splitX : -1;
  }

  /** screen x (0..1) of the compare divider */
  setSplit(x: number): void {
    this.splitX = Math.min(0.98, Math.max(0.02, x));
    if (this.compare && this.app && this.isOwnView()) this.app.postfx.perception.split = this.splitX;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on && this.app) {
      Object.assign(this.app.postfx.perception, IDENTITY_POST);
      Object.assign(this.app.postfx.body, IDENTITY_BODY);
      Object.assign(this.motor, { sway: 0, inputLag: 0, balance: 0, lookJitter: 0, speedScale: 1, stumble: 0, seated: 0, detach: 0 });
      this.audioNeutral();
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
      this.setKetamine(false);
      this.setCompare(false);
      this.soberUp();
      this.app?.events.emit('perception:changed', { mode: 'sober' });
      return;
    }
    if (action === 'firstaid') {
      this.goToFirstAid();
      if (kind === 'khole') this.ketNote('firstAid', 6000, true);
      else this.note('firstAid', 6000, true);
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
    if (this.pendingParams) this.applyUrlParams();
    if (!this.facilities.registered && this.regTries < 900) this.registerFacilities();
    this.simulateAlcohol(dt);
    this.simulateXtc(dt);
    this.simulateKetamine(dt);

    // player speed (m/s) for activity; jumps > 5 m are teleports, not running
    const p = this.app.playerPos;
    if (dt > 0) {
      const d = Math.hypot(p.x - this.lastPos.x, p.z - this.lastPos.z);
      const v = d > 5 ? 0 : d / dt;
      this.speed += (Math.min(v, 8) - this.speed) * damp(0.5, dt);
    }
    this.lastPos.copy(p);
    // Show camera gate: perception applies to the player's own view only (first / third person); the
    // director's camera moves must not charge refocus blur or double vision
    const own = this.isOwnView();
    if (own !== this.own) this.audioTimer = 0;
    this.own = own;
    const turnRaw = this.cameraTurnRate(ctx, dt);
    const turn = own ? turnRaw : 0;
    if (!own) this.yawRate = 0;

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
    const F = this.F;
    alcoholVisual(t, this.bac, ctx.time, F);
    alcoholMotor(mt, this.bac, F);
    const xp = this.xtcPhase !== 'off';
    const rf = this.app.reduceFlashing;
    xtcVisual(t, mt, this.xtcFx, xp ? xtcDrained(this.xtcTime) : 0, xp ? xtcNausea(this.xtcTime) * this.xtcStop : 0, this.dazzle, this.G, rf);
    if (this.ketPhase !== 'off') {
      const kt = this.ketTime;
      const ks = this.ketStop;
      ketVisual(t, mt, this.ketFx, this.ketHoleV, ketNumb(kt) * ks, ketNausea(kt) * ks, ketDrained(kt) * ks, ctx.time, this.reducedMotion, this.strength === 'strong' ? 1 : KET_REALISTIC);
    }
    heatVisual(t, mt, this.heatDanger());
    sodiumVisual(t, mt, this.risk.overhydration, ctx.time);
    if (this.compare && this.mode === 'sober') alcoholVisual(t, COMPARE_PREVIEW_BAC, ctx.time, F);

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
    // outside the own view: identity post + body (the simulation above keeps running)
    if (!own) this.writeIdentity();
    this.updateKetMonitor(dt);

    // audio (throttled)
    this.audioTimer -= dt;
    if (this.audioTimer <= 0) {
      this.audioTimer = 0.2;
      if (own) this.audioOut();
      else this.audioNeutral();
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
      ket: this.ketFx.toFixed(2),
      ketPhase: this.ketPhase,
      ketHole: this.ketHoleV.toFixed(2),
      strength: this.strength,
      view: this.own ? 'own' : 'identity',
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
      reduceFlashing: this.app?.reduceFlashing ? 1 : 0,
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

  private simulateKetamine(dt: number): void {
    if (!this.ketOn) {
      this.ket = this.ketFx = this.ketHoleV = 0;
      this.ketPhase = 'off';
      return;
    }
    this.ketTime += dt;
    this.ketPhase = ketPhase(this.ketTime);
    if (this.ketStop < 1) this.ketStop = Math.max(0, this.ketStop - dt / XTC_STOP_FADE);
    if (this.ketPhase === 'off' || this.ketStop <= 0) {
      const natural = this.ketPhase === 'off' && this.ketStop >= 1;
      this.ketOn = false;
      this.ketPhase = 'off';
      this.ket = this.ketFx = this.ketHoleV = 0;
      this.ketStop = 1;
      if (natural) this.ketEpiloguePending = true;
      return;
    }
    this.ketFx = ketDissociation(this.ketTime) * this.ketStop;
    this.ketHoleV = ketHole(this.ketTime) * this.ketStop;
    this.ket = Math.max(this.ketFx, 0.002);
  }

  /** dev / preview URL parameters, applied once after start: ?bac=<‰>, ?xtc=<s>, ?ket=<s>, ?perception=xtc|ketamine */
  private applyUrlParams(): void {
    this.pendingParams = false;
    const P = this.app.params;
    const num = (key: string) => {
      const v = P.get(key);
      return v === null || v.trim() === '' ? NaN : Number(v);
    };
    const bac = num('bac');
    if (Number.isFinite(bac)) {
      this.setBac(bac);
      this.snap = true;
    }
    const mode = P.get('perception');
    const xtc = num('xtc');
    if (Number.isFinite(xtc) || mode === 'xtc') {
      this.setXtc(true);
      this.xtcTime = Number.isFinite(xtc) ? Math.max(0, xtc) : 0;
      this.snap = true;
    }
    const ket = num('ket');
    if (Number.isFinite(ket) || mode === 'ketamine') {
      this.setKetamine(true);
      this.ketTime = Number.isFinite(ket) ? Math.max(0, ket) : 0;
      this.snap = true;
    }
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
    // sitting after an outcome, or slumped down in the ketamine K-hole
    const seated = this.seq !== 'none' || this.ketHoleV > 0.3;
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

  /** first / third person (or no camera rig at all): the view is the player's own */
  private isOwnView(): boolean {
    if (this.cam === undefined && this.app) this.cam = (this.app.get('camera') as unknown as { mode?: string } | undefined) ?? null;
    const c = this.cam;
    return !c || c.mode === 'first' || c.mode === 'third';
  }

  /** camera angular speed (rad/s) and signed yaw rate (this.yawRate, + = left); 0 on cuts / teleports */
  private cameraTurnRate(ctx: FrameContext, dt: number): number {
    ctx.camera.getWorldDirection(this.camDir);
    let w = 0;
    let yaw = 0;
    if (this.hasCamDir && dt > 0) {
      const a = Math.acos(Math.min(1, Math.max(-1, this.camDir.dot(this.prevCamDir))));
      if (a <= 0.8) {
        w = a / dt;
        // cross(prev, dir).y
        yaw = (this.prevCamDir.z * this.camDir.x - this.prevCamDir.x * this.camDir.z) / dt;
      }
    }
    this.prevCamDir.copy(this.camDir);
    this.hasCamDir = true;
    this.yawRate = yaw;
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
    this.osX = this.osV = 0;
    this.spinT = this.spinEnv = this.spinPh = this.spinDeg = 0;
    this.kickEnv = 0;
    this.detachEnv = 0;
    this.seq = 'none';
    this.seqKind = 'none';
    this.seqFade = this.seatedEnv = 0;
    this.highBacT = this.sitCooldown = 0;
    this.collapseArmed = true;
    this.epiloguePending = false;
    this.ketEpiloguePending = false;
    this.ketCardShown = false;
    this.ketNoted = 0;
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
      if (this.ketEpiloguePending) {
        this.ketEpiloguePending = false;
        this.showCard('ketEpilogue');
        return;
      }
      // ketamine K-hole: you cannot get up (you are already slumped; no fall, no fade)
      if (this.ketHoleV > 0.6 && !this.ketCardShown && !this.aided) {
        this.ketCardShown = true;
        this.seq = 'card';
        this.seqKind = 'khole';
        this.showCard('khole');
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
    if (this.ketPhase !== 'off') {
      if (!(this.ketNoted & 1) && this.ketTime > 8) {
        this.ketNoted |= 1;
        this.ketNote('onset', 4500);
      }
      if (!(this.ketNoted & 2) && this.ketHoleV > 0.3) {
        this.ketNoted |= 2;
        this.ketNote('hole', 5000);
      }
      if (!(this.ketNoted & 4) && this.ketPhase === 'return') {
        this.ketNoted |= 4;
        this.ketNote('back', 4500);
      }
    }

    // stumbles: from 1.2‰ while walking, from 2‰ also standing; dizziness in heat danger / hyponatraemia;
    // ketamine: numb legs and lost balance
    const busy = this.seq !== 'none' || this.outcome !== 'none';
    let rate = table(this.F.stumbleRate, bac) + 1.5 * this.ketFx;
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
    } else if (!busy && this.sinceGap > 14 && this.rand() < (table(this.F.gapRate, bac) / 60) * dt) {
      this.gapT = 0;
      this.gapLen = table(this.F.gapLength, bac) * (0.7 + 0.6 * this.rand());
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
    if (this.ketFx > 0.3 && this.bac < 1.2) this.ketNote('stumble', 3500);
    else this.note('stumble', 3500);
  }

  private showCard(kind: OutcomeKind): void {
    if (kind === 'none') return;
    this.outcome = kind;
    if (!this.renderOutcomeCards) return;
    const text: OutcomeCardText = kind === 'khole' || kind === 'ketEpilogue' ? KETAMINE_CARDS[kind] : OUTCOME_CARDS[kind];
    const fill = { T: this.peakTemp.toFixed(1), W: String(Math.round(this.minWater * 100)) };
    this.overlay.show(text, fill, (a) => this.resolveOutcome(a));
  }

  /** toast, once per NOTE_REPEAT_S (always when `force`, e.g. a direct interaction) */
  private note(key: NoteKey, ms: number, force = false): void {
    if (!force && this.now - this.noteAt[key] < NOTE_REPEAT_S) return;
    this.noteAt[key] = this.now;
    this.app?.events.emit('toast', { text: OUTCOME_NOTES[key], ms });
  }

  private ketNote(key: KetNoteKey, ms: number, force = false): void {
    if (!force && this.now - this.ketNoteAt[key] < NOTE_REPEAT_S) return;
    this.ketNoteAt[key] = this.now;
    this.app?.events.emit('toast', { text: KETAMINE_NOTES[key], ms });
  }

  /** ketamine risk monitor (coordination, awareness, can move) and its messages (2 Hz, constant strings) */
  private updateKetMonitor(dt: number): void {
    const km = this.ketMonitor;
    const on = this.ketPhase !== 'off';
    if (!on) {
      km.coordination = km.awareness = km.movement = 1;
      if (this.ketWarnings.length) this.ketWarnings.length = 0;
      return;
    }
    const k = this.ketFx;
    const h = this.ketHoleV;
    const numb = ketNumb(this.ketTime) * this.ketStop;
    km.coordination = clamp01(1 - 0.75 * k - 0.15 * h - 0.1 * numb);
    km.awareness = clamp01(1 - 0.6 * k - 0.4 * h);
    km.movement = clamp01(Math.min(this.motor.speedScale, 1 - this.seatedEnv));
    this.ketWarnTimer -= dt;
    if (this.ketWarnTimer > 0) return;
    this.ketWarnTimer = 0.5;
    const w = this.ketWarnings;
    const M = KETAMINE_MESSAGES;
    w.length = 0;
    if (h > 0.3 || km.movement < 0.12) w.push(M.hole);
    if (this.bac >= 0.2) w.push(M.mixingAlcohol);
    if (this.xtcPhase !== 'off') w.push(M.mixingXtc);
    if (ketNausea(this.ketTime) > 0.25) w.push(M.nausea);
    if (km.coordination < 0.7) w.push(M.numb);
    if (this.risk.bodyTemp >= 37.8 || this.risk.hydration < 0.8) w.push(M.heat);
    if (this.ketPhase === 'onset' || this.ketPhase === 'peak') w.push(M.far);
    if (this.ketPhase === 'return' || this.ketPhase === 'after') w.push(M.after);
    if (h > 0.3) w.push(M.help);
  }

  // ------------------------------------------------------------------ transients

  private updateTransients(ctx: FrameContext, dt: number, turn: number): void {
    const strong = this.strength === 'strong';
    const reduced = this.reducedMotion;
    // refocus blur after fast head turns: accommodation / pursuit lag grows with BAC
    const impair = Math.min(1, this.bac / (strong ? 1.0 : 1.4)) + 0.35 * this.xtcFx;
    const want = impair * (strong ? smoothstep(0.6, 2.4, turn) : smoothstep(0.9, 3.2, turn));
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
    let sitting = this.seq === 'falling' || this.seq === 'card' ? 1 : this.seq === 'waking' ? Math.min(1, this.seqFade / 0.72) : 0;
    // ketamine K-hole: the body slumps down
    sitting = Math.max(sitting, this.ketHoleV);
    this.seatedEnv += (sitting - this.seatedEnv) * damp(0.4, dt);
    // out-of-body drift: slow, back to 0 afterwards
    this.detachEnv += (this.ketHoleV - this.detachEnv) * damp(3.5, dt);

    // look overshoot (strong alcohol, ketamine): the world lags behind a head turn, then overshoots.
    // Input stays 1:1; a 90°/s pan reaches the table's maximum (deg).
    const osAlc = table(this.F.overshoot, this.bac);
    const osKet = (strong ? 3.0 : 3.0 * KET_REALISTIC) * this.ketFx * (this.ketPhase !== 'off' ? 1 : 0);
    const osMax = Math.max(osAlc, osKet);
    const ketDom = osKet > osAlc;
    const osHz = ketDom ? 0.55 : 1.3;
    const osZeta = ketDom ? 0.3 : 0.35;
    const osTarget = osMax > 0.001 && !reduced ? Math.max(-osMax, Math.min(osMax, (-osMax * this.yawRate) / (Math.PI / 2))) : 0;
    const ow = Math.PI * 2 * osHz;
    for (let i = 0; i < steps; i++) {
      this.osV += (-ow * ow * (this.osX - osTarget) - 2 * osZeta * ow * this.osV) * h;
      this.osX += this.osV * h;
    }
    const osCap = 1.5 * osMax + 0.01;
    if (this.osX > osCap || this.osX < -osCap) {
      this.osX = Math.max(-osCap, Math.min(osCap, this.osX));
      this.osV *= 0.5;
    }

    // "the spins" (strong alcohol from 1.0‰): standing still and not turning for 2 s, the picture creeps
    // sideways and snaps back (0.3 Hz), fading in over 3 s and out over 0.5 s
    const spinA = table(this.F.spins, this.bac);
    const still = this.speed < 0.4 && Math.abs(this.yawRate) < 0.3 && turn < 0.3;
    this.spinT = still ? this.spinT + dt : 0;
    const spinOn = spinA > 0.01 && this.spinT >= 2 && !reduced && this.seq === 'none';
    if (spinOn && this.spinEnv <= 0) {
      this.spinDir = this.rand() < 0.5 ? -1 : 1;
      this.spinPh = 0;
    }
    this.spinEnv = spinOn ? Math.min(1, this.spinEnv + dt / 3) : Math.max(0, this.spinEnv - dt / 0.5);
    if (this.spinEnv > 0) {
      this.spinPh = (this.spinPh + dt * SPIN_HZ) % 1;
      const ph = this.spinPh;
      const ramp = ph < 0.85 ? ph / 0.85 : 1 - (ph - 0.85) / 0.15;
      this.spinDeg = this.spinEnv * spinA * this.spinDir * (ramp - 0.5);
    } else this.spinDeg = 0;

    // nystagmus (jerk waveform: slow drift, fast correction) and heartbeat phases
    const nf = this.xtcFx > 0.2 ? 4.2 : 3.2;
    this.nystPhase = (this.nystPhase + dt * nf) % 1;
    this.heartPhase = (this.heartPhase + (dt * this.risk.heartRate) / 60) % 1;

    // slow visual state of body overlays
    const snap = this.snap;
    const G = this.G;
    const rf = this.app.reduceFlashing;
    this.heatVis += (this.heatDanger() - this.heatVis) * (snap ? 1 : damp(1.5, dt));
    this.starVis += (G.star * this.xtcFx - this.starVis) * (snap ? 1 : damp(0.9, dt));
    const veil = this.xtcFx * (G.veilBase + G.veilDazzle * this.dazzle) * (rf ? 0.6 : 1);
    this.veilVis += (veil - this.veilVis) * (snap ? 1 : damp(0.12, dt));
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
    if (!this.isOwnView()) {
      this.writeIdentity();
      return;
    }
    const out = this.app.postfx.perception;
    for (const key of KEYS) out[key] = this.smooth[key];
    out.split = this.compare ? this.splitX : -1;
  }

  /** identity post + body (outside the player's own view): split off, no body overlays */
  private writeIdentity(): void {
    const fx = this.app.postfx;
    Object.assign(fx.perception, IDENTITY_POST);
    Object.assign(fx.body, IDENTITY_BODY);
  }

  /** transients that must not be smoothed: refocus, stumble, gaps, falling, heat pulse, head motion */
  private applyTransients(ctx: FrameContext): void {
    const out = this.app.postfx.perception;
    const b = this.app.postfx.body;
    const reduced = this.reducedMotion;
    const rf = this.app.reduceFlashing;
    const strong = this.strength === 'strong';
    const F = this.F;
    const G = this.G;
    out.blur += (strong ? 0.35 : 0.26) * this.refocus + 0.1 * this.stumbleEnv;
    out.doubleVision = Math.max(out.doubleVision, 0.4 * this.stumbleEnv, (strong ? 0.45 : 0.3) * this.refocus * Math.min(1, this.bac / 1.2));
    const faint = this.seqKind === 'collapse' && this.seq !== 'none' ? this.seqFade : 0;
    out.saturation *= 1 - 0.85 * faint;
    out.tunnel = Math.min(1, out.tunnel + 0.5 * this.seqFade);
    if (reduced) out.wobble = 0;
    // the double-vision vergence term follows reduced motion
    this.app.postfx.percTune.vergence = reduced ? 0 : PERC_TUNE[this.strength].vergence;

    // head motion: nystagmus (alcohol gaze-evoked after turns, XTC fine and constant), jaw clench, lurch,
    // the spins and the look overshoot (strong preset)
    const fov = Math.max(20, ctx.camera.fov);
    const nystAlc = table(F.nystagmus, this.bac);
    const nystDeg = (nystAlc * (0.3 + 0.7 * clamp01(this.refocus * 1.6)) + G.nyst * this.xtcFx) * (rf ? 0.5 : 1);
    const ph = this.nystPhase;
    const saw = ph < 0.82 ? ph / 0.82 : 1 - (ph - 0.82) / 0.18;
    const jaw = rf ? 0 : this.xtcFx * Math.max(0, Math.sin(ctx.time * 0.55) * Math.sin(ctx.time * 0.23 + 1));
    const shake = jaw * G.jaw * Math.sin(ctx.time * Math.PI * 2 * 11);
    b.offX = reduced ? 0 : ((saw - 0.5) * nystDeg + this.spinDeg + this.osX) / fov;
    if (strong && !reduced) {
      // a steady zoom margin, so the view does not pump with the moving offset
      const osMax = Math.max(table(F.overshoot, this.bac), this.ketPhase !== 'off' ? 3.0 * this.ketFx : 0);
      const nystMax = (nystAlc + G.nyst * this.xtcFx) * (rf ? 0.5 : 1);
      b.margin = Math.min(0.1, (0.5 * nystMax + 0.5 * table(F.spins, this.bac) + 1.35 * osMax) / fov);
    } else b.margin = 0;
    b.zoom = 0;
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
    // out-of-body drift: the full ~1.5 m, 0.3 m under reduced motion
    m.detach = this.detachEnv * (reduced ? 0.2 : 1);
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
   * Beat-synced overstimulation (XTC): a short exposure / bloom / saturation swell and a tiny view zoom on
   * kicks. Photosensitivity: a local envelope (τ 0.12 s) that fires at most every 0.34 s and on every 2nd
   * kick above 168 BPM (≤ 2.8 Hz), at most +8 % exposure (+2 % and bloom x0.25 with reduce flashing).
   * No hue cycling or pattern breathing: MDMA is not a psychedelic, and the effect must not look like an
   * attractive filter.
   */
  private pulses(ctx: FrameContext): void {
    const x = this.shownXtc;
    const fx = this.app.postfx;
    const b = ctx.beat;
    const breath = 0.5 - 0.5 * Math.cos(((b.bar * 0.5) % 1) * Math.PI * 2);
    fx.rhythm.breath = breath;
    fx.rhythm.kick = b.hasKick ? b.kick : 0;
    // kick detector: beat.kick jumps back up at every kick (exp decay in between); a frame lands up to
    // ~17 ms after the kick, so a rising edge is the robust trigger
    const kick = b.hasKick ? b.kick : 0;
    const rising = kick > this.kickPrev + 0.02 && kick > 0.5;
    this.kickPrev = kick;
    if (rising) {
      this.kickCount++;
      const skip = b.bpm > KICK_UPTEMPO_BPM && (this.kickCount & 1) === 1;
      if (!skip && ctx.time - this.lastKickAt >= KICK_REFRACTORY) {
        this.lastKickAt = ctx.time;
        this.kickEnv = 1;
      }
    } else this.kickEnv *= Math.exp(-ctx.dt / KICK_TAU);
    if (x < 0.01) return;
    const kp = this.kickEnv * (0.4 + 0.6 * b.energy) * x;
    if (kp < 1e-4) return;
    const G = this.G;
    const rf = this.app.reduceFlashing;
    const out = fx.perception;
    out.exposure += (rf ? Math.min(G.kickExp, 0.02) : G.kickExp) * kp;
    out.bloomBoost += G.kickBloom * (rf ? 0.25 : 1) * kp;
    out.saturation *= 1 + G.kickSat * kp;
    if (!this.reducedMotion) fx.body.zoom += G.kickZoom * kp;
  }

  // ------------------------------------------------------------------ audio

  /** music and body sound from the state (throttled, 5 Hz) */
  private audioOut(): void {
    const audio = this.app.audio;
    const F = this.F;
    const G = this.G;
    const bac = this.bac;
    const x = this.xtcFx;
    const xp = this.xtcPhase !== 'off';
    const n = xp ? xtcNausea(this.xtcTime) * this.xtcStop : 0;
    const d = xp ? xtcDrained(this.xtcTime) : 0;
    const kOn = this.ketPhase !== 'off';
    const ks = this.strength === 'strong' ? 1 : KET_REALISTIC;
    const k = kOn ? this.ketFx * ks : 0;
    const kh = kOn ? this.ketHoleV * ks : 0;
    const heat = this.heatDanger();
    const muffle = Math.max(
      table(F.muffle, bac),
      0.4 * heat,
      0.85 * this.gapFade(),
      0.7 * this.seqFade,
      0.25 * this.risk.overhydration,
      G.nMuffle * n,
      G.dMuffle * d,
      // ketamine: far away and muffled (low-pass ~1.2 kHz at the peak)
      0.78 * k,
    );
    const wow = Math.max(table(F.audioWobble, bac), G.nAudioWobble * n, 0.9 * k);
    // the realistic preset keeps its round-6 wow depth; ketamine: a slow pitch drift
    audio.setPerception(Math.min(0.92, muffle), wow * (this.strength === 'realistic' ? REALISTIC_WOW : 1), k > 0.3 && k >= table(F.audioWobble, bac) ? 0.09 : undefined);
    const width = table(F.width, bac) * (1 + G.aWidth * x) * (1 - G.dWidth * d) * (1 + 0.35 * k);
    const gainDb = table(F.musicDb, bac) + G.aMusicDb * x + G.dMusicDb * d - 4 * k;
    const lowDb = G.aLowShelf * x;
    const highDb = G.aHighShelf * x + G.dHighShelf * d - 6 * k;
    const echo = 0.6 * k + 0.3 * kh;
    audio.setPerceptionMix(width, gainDb, lowDb, highDb, echo, 1 - G.aDistDrop * x);
    // the own heartbeat close by: XTC, heat danger (silent below 110 bpm, -32 dB at 110 -> -16 dB at 180), ketamine
    const bpm = this.risk.heartRate;
    let db = -Infinity;
    if (xp || heat > 0 || kOn) {
      if (bpm >= 110) db = -32 + 16 * clamp01((bpm - 110) / 70);
      if (kOn && k > 0.15) db = Math.max(db, -30 + 8 * k);
    }
    audio.setHeartbeat(bpm, db, this.heartPhase);
  }

  /** neutral perception audio (Show camera / other views, disabled) */
  private audioNeutral(): void {
    const audio = this.app.audio;
    audio.setPerception(0, 0);
    audio.setPerceptionMix(1, 0, 0, 0, 0, 1);
    audio.setHeartbeat(0, -Infinity);
  }
}

// ---------------------------------------------------------------- effect mapping

function resetParams(t: PerceptionParams): void {
  t.blur = t.doubleVision = t.chroma = t.wobble = t.tunnel = 0;
  t.saturation = t.contrast = t.exposure = 1;
  t.bloomBoost = t.lightSensitivity = t.trails = t.afterimage = t.patternWarp = t.hueShift = t.motionBlur = 0;
  t.warmth = t.glow = t.tint = t.recede = 0;
}

function resetMotor(m: MotorEffects): void {
  m.sway = m.inputLag = m.balance = m.lookJitter = 0;
  m.speedScale = 1;
}

/**
 * alcohol: tracking lag and smear, lingering glare, a narrowed field and double vision that comes and
 * goes (episodes get longer with BAC until the double image is persistent); `time` drives the episodes.
 */
function alcoholVisual(t: PerceptionParams, bac: number, time: number, F: AlcoholFx): void {
  if (bac <= 0.01) return;
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

function alcoholMotor(m: MotorEffects, bac: number, F: AlcoholFx): void {
  if (bac <= 0.01) return;
  m.sway = table(F.sway, bac);
  m.inputLag = table(F.inputLag, bac);
  m.balance = table(F.balance, bac);
  m.lookJitter = table(F.lookJitter, bac);
  m.speedScale = table(F.speedScale, bac);
}

/**
 * simulated MDMA perception at intensity x (0..1), design bible §12.3 (gains per preset, XTC_GAINS):
 * saturation up and warm, bloom threshold down with halos and a soft glow, light trails and afterimages,
 * over-exposure under strobes (`dazzle`, dilated pupils; halved with reduce flashing), slight blur; onset
 * nausea waves (desaturated, green-grey, swimming); a drained, grey, cool comedown.
 */
function xtcVisual(t: PerceptionParams, m: MotorEffects, x: number, drained: number, nausea: number, dazzle: number, G: XtcGains, rf: boolean): void {
  if (x > 0.001) {
    t.saturation *= 1 + G.sat * x;
    t.warmth += G.warmth * x;
    t.exposure *= 1 + G.exp * x + G.expDazzle * x * dazzle * (rf ? 0.5 : 1);
    t.lightSensitivity = Math.max(t.lightSensitivity, G.ls * x);
    t.bloomBoost += G.bloom * x;
    t.glow = Math.max(t.glow, G.glow * x);
    t.trails = Math.max(t.trails, G.trails * x);
    t.afterimage = Math.max(t.afterimage, G.after * x);
    // decreased visual acuity (a clinical sign) and a little colour fringing: soft, not glamorous
    t.chroma = Math.max(t.chroma, G.chroma * x);
    t.blur = Math.max(t.blur, G.blur * x);
    t.wobble = Math.max(t.wobble, G.wobble * x);
    m.lookJitter = Math.min(1, m.lookJitter + G.jitter * x);
    m.sway = Math.min(1, m.sway + G.sway * x);
  }
  if (nausea > 0.001) {
    t.saturation *= 1 - G.nSat * nausea;
    t.exposure *= 1 - G.nExp * nausea;
    t.tint = Math.max(t.tint, G.nTint * nausea);
    t.wobble = Math.max(t.wobble, G.nWobble * nausea);
    t.blur = Math.max(t.blur, G.nBlur * nausea);
    t.tunnel = Math.max(t.tunnel, G.nTunnel * nausea);
    m.sway = Math.min(1, m.sway + G.nSway * nausea);
  }
  if (drained > 0.001) {
    t.saturation *= 1 - G.dSat * drained;
    t.contrast *= 1 - G.dContrast * drained;
    t.exposure *= 1 - G.dExp * drained;
    t.warmth -= G.dWarmth * drained;
    m.speedScale *= 1 - G.dSpeed * drained;
    m.inputLag += G.dLag * drained;
  }
}

/**
 * simulated ketamine (dissociation k 0..1, K-hole h, numb heavy body, return nausea, grey after-phase; `s`
 * scales the visuals per preset): the world recedes into a dark, soft tunnel (slow breathing of the recede,
 * steady under reduced motion), colours drained and cool, contrast flattened, smeared motion; a large sway,
 * lost balance, strong reaction lag, walking slowed to ~0.2 at the peak and stopped in the K-hole.
 * No flashes, no exposure pulses: dissociation is not a strobe experience.
 */
function ketVisual(t: PerceptionParams, m: MotorEffects, k: number, h: number, numb: number, n: number, d: number, time: number, reduced: boolean, s: number): void {
  if (k > 0.001) {
    const breathe = reduced ? 1 : 0.85 + 0.15 * Math.sin(time * 0.31);
    t.recede = Math.max(t.recede, s * (0.65 * k + 0.35 * h) * breathe);
    t.tunnel = Math.max(t.tunnel, s * (0.6 * k + 0.25 * h));
    t.saturation *= 1 - s * (0.45 * k + 0.2 * h);
    t.warmth -= s * 0.45 * k;
    t.contrast *= 1 - s * 0.22 * k;
    t.exposure *= 1 - s * 0.12 * k;
    t.blur = Math.max(t.blur, s * (0.22 * k + 0.15 * h));
    t.wobble = Math.max(t.wobble, s * 0.35 * k);
    t.motionBlur = Math.max(t.motionBlur, s * 0.7 * k);
    t.trails = Math.max(t.trails, s * 0.9 * k);
    m.sway = Math.min(1, m.sway + 0.6 * k);
    m.balance = Math.min(1, m.balance + 0.8 * k);
    m.inputLag += 0.45 * k;
    m.lookJitter = Math.min(1, m.lookJitter + 0.15 * k);
    m.speedScale *= Math.max(0, 1 - k) * (1 - h);
  }
  if (numb > 0.001) {
    m.sway = Math.min(1, m.sway + 0.25 * numb);
    m.balance = Math.min(1, m.balance + 0.2 * numb);
  }
  if (n > 0.001) {
    t.saturation *= 1 - s * 0.35 * n;
    t.tint = Math.max(t.tint, s * 0.9 * n);
    t.wobble = Math.max(t.wobble, s * 0.5 * n);
    m.sway = Math.min(1, m.sway + 0.4 * n);
  }
  if (d > 0.001) {
    // grey, tired, flat: like the XTC comedown
    t.saturation *= 1 - s * 0.6 * d;
    t.contrast *= 1 - s * 0.2 * d;
    t.exposure *= 1 - s * 0.2 * d;
    t.warmth -= s * 0.5 * d;
    t.blur = Math.max(t.blur, s * 0.08 * d);
    m.speedScale *= 1 - 0.2 * d;
    m.inputLag += 0.08 * d;
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
