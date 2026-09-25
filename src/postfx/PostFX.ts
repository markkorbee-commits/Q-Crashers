import * as THREE from 'three';
import type { PerceptionParams, PhotoParams, QualitySettings } from '../core/types';

/**
 * Render pipeline (STUB — to be replaced by the full HDR pipeline):
 *   scene -> HDR target (half float, MSAA) -> bloom mip chain -> composite
 *   (tone mapping, bloom, perception effects, trails feedback, split compare, DOF, grain) -> screen
 */
export class PostFX {
  perception: PerceptionParams = PostFX.defaults();
  photo: PhotoParams = { enabled: false, focusDistance: 0, aperture: 0, exposure: 1, vignette: 0.25, grain: 0.04 };
  enabled = true;
  /** base exposure (scene-referred), tweakable in the debug menu */
  exposure = 1;

  constructor(private renderer: THREE.WebGLRenderer, private quality: QualitySettings) {}

  static defaults(): PerceptionParams {
    return {
      blur: 0,
      doubleVision: 0,
      chroma: 0,
      wobble: 0,
      tunnel: 0,
      saturation: 1,
      contrast: 1,
      exposure: 1,
      bloomBoost: 0,
      lightSensitivity: 0,
      trails: 0,
      afterimage: 0,
      patternWarp: 0,
      hueShift: 0,
      motionBlur: 0,
      split: -1,
    };
  }

  setSize(_w: number, _h: number): void {}

  setQuality(q: QualitySettings): void {
    this.quality = q;
  }

  render(scene: THREE.Scene, camera: THREE.Camera, _dt: number, _time: number): void {
    this.renderer.setRenderTarget(null);
    this.renderer.render(scene, camera);
  }

  /** PNG of the next rendered frame (photo mode) */
  async capture(): Promise<Blob | null> {
    return new Promise((resolve) => this.renderer.domElement.toBlob((b) => resolve(b), 'image/png'));
  }

  stats(): Record<string, number | string> {
    return { postfx: this.enabled ? 'on' : 'off' };
  }

  dispose(): void {}
}
