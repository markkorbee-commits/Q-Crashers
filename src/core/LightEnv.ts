import * as THREE from 'three';

/** z (m) separating stage-side flashes (deck, castle, wings, roof) from field-side ones (towers, FOH, sky over the field) */
export const FLASH_FIELD_Z = 10;

/**
 * One accumulator of light flashes: premultiplied colour, intensity-weighted centre and the RMS
 * spread of the sources around it (a gerb wall across both side sections is a 60 m wide area light,
 * not a point at the centre). No allocation.
 */
export class FlashBucket {
  /** Σ colour × intensity */
  readonly color = new THREE.Color(0, 0, 0);
  /** intensity-weighted centre of the sources */
  readonly pos = new THREE.Vector3(0, 20, -10);
  private w = 0;
  /** Σ intensity × |p|² (for the spread) */
  private m2 = 0;

  reset(x: number, y: number, z: number): void {
    this.color.setRGB(0, 0, 0);
    this.pos.set(x, y, z);
    this.w = 0;
    this.m2 = 0;
  }

  add(color: THREE.Color, intensity: number, p: THREE.Vector3): void {
    this.color.r += color.r * intensity;
    this.color.g += color.g * intensity;
    this.color.b += color.b * intensity;
    const w = this.w + intensity;
    this.pos.lerp(p, intensity / w);
    this.m2 += intensity * p.lengthSq();
    this.w = w;
  }

  /** total intensity (Σ intensity) */
  get intensity(): number {
    return this.w;
  }

  /** RMS distance (m) of the sources from their centre: 0 for a single source */
  get spread(): number {
    if (this.w <= 0) return 0;
    return Math.sqrt(Math.max(0, this.m2 / this.w - this.pos.lengthSq()));
  }
}

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
  /** colour + intensity of the light washing the stage set (castle/dragon/wings), written by LightingSystem, read by MainStage */
  stageWashColor = new THREE.Color(0.6, 0.05, 0.05);
  stageWashIntensity = 0.4;
  /** lantern pillar lamps on the field (written by LightingSystem 'pillars' fx, rendered by Grounds) */
  pillarLampColor = new THREE.Color('#4a86d8');
  pillarLampIntensity = 1;
  /** LED uplight on the pillar shafts */
  pillarShaftColor = new THREE.Color('#c56e46');
  pillarShaftIntensity = 0.8;
  /** per-pillar intensity multipliers for chases (index = pillar index in anchors 'pillars_top'); empty = all 1 */
  pillarChase: number[] = [];
  /** accumulated flash from pyro / fireworks / strobes (all sources) */
  flashColor = new THREE.Color(0, 0, 0);
  /** weighted centre of the current flash sources (all sources) */
  flashPos = new THREE.Vector3(0, 20, -10);
  /** stage-side flashes only (source z < FLASH_FIELD_Z): deck, castle, wings, roof */
  readonly flashStage = new FlashBucket();
  /** field-side flashes only (source z ≥ FLASH_FIELD_Z): delay towers, FOH, bursts over the audience */
  readonly flashField = new FlashBucket();
  private flashWeight = 0;
  private flashM2 = 0;
  /**
   * Site-wide coloured ambient light (premultiplied by its amount, 0..~2 per channel): the glow of a
   * flame wall or of a red-lit smoke cloud over the whole grounds. Written by the EnvironmentSystem
   * from `atmos.glow` cues at the START of the frame (it updates first), so every later system
   * (stage, lights, fog, crowd) can read it; the world materials, the height fog and the sky use it.
   */
  readonly glowColor = new THREE.Color(0, 0, 0);
  /** 0..1 site smoke requested by `atmos.glow` (`smoke` param): the height fog thickens in the glow colour */
  smoke = 0;
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
    this.flashM2 = 0;
    this.flashPos.set(0, 20, -10);
    this.flashStage.reset(0, 20, -10);
    this.flashField.reset(0, 20, 60);
    this.glowColor.setRGB(0, 0, 0);
    this.smoke = 0;
    this.strobe = 0;
  }

  /** add a light flash (e.g. a firework burst) — colour is pre-multiplied by intensity */
  addFlash(color: THREE.Color, intensity: number, pos: THREE.Vector3): void {
    if (!(intensity > 0)) return;
    this.flashColor.r += color.r * intensity;
    this.flashColor.g += color.g * intensity;
    this.flashColor.b += color.b * intensity;
    const w = this.flashWeight + intensity;
    this.flashPos.lerp(pos, intensity / w);
    this.flashWeight = w;
    this.flashM2 += intensity * pos.lengthSq();
    (pos.z < FLASH_FIELD_Z ? this.flashStage : this.flashField).add(color, intensity, pos);
  }

  get flashIntensity(): number {
    return this.flashWeight;
  }

  /** RMS distance (m) of all flash sources from flashPos (0 = one point source) */
  get flashSpread(): number {
    if (this.flashWeight <= 0) return 0;
    return Math.sqrt(Math.max(0, this.flashM2 / this.flashWeight - this.flashPos.lengthSq()));
  }
}
