import * as THREE from 'three';
import type { App } from '../core/App';
import type { FrameContext, QualitySettings, System } from '../core/types';

/** Sky, stars, moon, atmospheric fog and base lighting (STUB — replaced during implementation). */
export class EnvironmentSystem implements System {
  readonly name = 'environment';
  private app!: App;
  private hemi!: THREE.HemisphereLight;

  init(app: App): void {
    this.app = app;
    app.scene.background = new THREE.Color('#0b1a3a');
    app.scene.fog = new THREE.FogExp2('#0b1a3a', 0.0016);
    this.hemi = new THREE.HemisphereLight('#3a5a9a', '#101010', 0.6);
    app.scene.add(this.hemi);
  }

  update(_ctx: FrameContext): void {}

  setQuality(_q: QualitySettings): void {}
}
