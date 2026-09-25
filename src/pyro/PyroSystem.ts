import type { App } from '../core/App';
import type { FrameContext, QualitySettings, System } from '../core/types';

/** Flames, flame jets, CO2, gerbs, sparks, stage smoke (STUB — replaced during implementation). */
export class PyroSystem implements System {
  readonly name = 'pyro';
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
