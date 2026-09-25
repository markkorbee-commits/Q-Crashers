import type { App } from '../core/App';
import type { FrameContext, QualitySettings, System } from '../core/types';

/** Fences, lantern pillars, FOH, delay towers, trees, signage (STUB — replaced during implementation). */
export class GroundsSystem implements System {
  readonly name = 'grounds';
  private app!: App;
  private enabled = true;

  init(app: App): void {
    this.app = app;
  }

  update(_ctx: FrameContext): void {
    if (!this.enabled) return;
  }

  setQuality(_q: QualitySettings): void {}

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  stats(): Record<string, number | string> {
    return {};
  }
}
