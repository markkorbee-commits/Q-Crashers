import * as THREE from 'three';

/**
 * Per-frame "how is the world lit by the show" summary. Show systems (lights, lasers, pyro,
 * fireworks, stage) WRITE it early in the frame; receivers (crowd, terrain, grounds, sky) READ it
 * to tint materials — cheap fake global illumination instead of hundreds of real lights.
 * It is reset at the start of every frame by the App.
 */
export class LightEnv {
  /** average colour of stage lighting falling onto the audience */
  stageColor = new THREE.Color(0.1, 0.02, 0.03);
  /** 0..~3 overall stage light output */
  stageIntensity = 0;
  /** how much of the rig points into the audience (0..1) */
  audienceWash = 0;
  /** accumulated flash from pyro / fireworks / strobes */
  flashColor = new THREE.Color(0, 0, 0);
  /** weighted centre of the current flash sources */
  flashPos = new THREE.Vector3(0, 20, -10);
  private flashWeight = 0;
  /** 0..1 global strobe level this frame */
  strobe = 0;
  /** 0..1 haze density multiplier requested by the fog system */
  haze = 0.6;
  /** colour of the palette's primary at this moment (convenience copy) */
  palettePrimary = new THREE.Color('#ff1a1a');
  paletteSecondary = new THREE.Color('#ff7a00');
  paletteAccent = new THREE.Color('#ffffff');

  reset(): void {
    this.stageIntensity = 0;
    this.audienceWash = 0;
    this.flashColor.setRGB(0, 0, 0);
    this.flashWeight = 0;
    this.flashPos.set(0, 20, -10);
    this.strobe = 0;
  }

  /** add a light flash (e.g. a firework burst) — colour is pre-multiplied by intensity */
  addFlash(color: THREE.Color, intensity: number, pos: THREE.Vector3): void {
    if (intensity <= 0) return;
    this.flashColor.r += color.r * intensity;
    this.flashColor.g += color.g * intensity;
    this.flashColor.b += color.b * intensity;
    const w = this.flashWeight + intensity;
    this.flashPos.lerp(pos, intensity / w);
    this.flashWeight = w;
  }

  get flashIntensity(): number {
    return this.flashWeight;
  }
}
