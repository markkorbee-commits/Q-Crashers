import type { App } from '../core/App';
import type { FrameContext, QualitySettings, System } from '../core/types';

export type PerceptionMode = 'sober' | 'alcohol' | 'xtc';

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

/**
 * EDUCATIONAL perception simulation (STUB — replaced during implementation).
 *  - alcohol: BAC model (Widmark, compressed time) -> blur, double vision, sway, lag, muffled audio
 *  - xtc: simulated MDMA perception + risk information (no usage/dosing information, ever)
 *  - compare: split screen sober | altered from the same position
 * Writes app.postfx.perception every frame; exposes `motor` for the player.
 */
export class PerceptionSystem implements System {
  readonly name = 'perception';
  /** blood alcohol concentration in promille (g/kg) */
  bac = 0;
  /** 0..1 simulated XTC effect intensity */
  xtc = 0;
  compare = false;
  readonly motor: MotorEffects = { sway: 0, inputLag: 0, balance: 0, lookJitter: 0, speedScale: 1 };
  private app!: App;

  init(app: App): void {
    this.app = app;
  }

  get mode(): PerceptionMode {
    return this.xtc > 0 ? 'xtc' : this.bac > 0 ? 'alcohol' : 'sober';
  }

  /** a drink was consumed: grams of pure alcohol (e.g. beer 250 ml 5% = 9.9 g) */
  addAlcohol(_grams: number): void {}

  /** water / time: return to sober instantly (reset button) */
  soberUp(): void {
    this.bac = 0;
    this.xtc = 0;
  }

  /** start / stop the educational XTC perception simulation */
  setXtc(_on: boolean): void {}

  setCompare(on: boolean): void {
    this.compare = on;
  }

  update(_ctx: FrameContext): void {}

  setQuality(_q: QualitySettings): void {}

  stats(): Record<string, number | string> {
    return { bac: this.bac.toFixed(2), xtc: this.xtc.toFixed(2) };
  }
}
