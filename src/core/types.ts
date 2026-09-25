/**
 * Shared contracts between all systems.
 *
 * Design rules (read before adding a system):
 *  1. Every show-driven visual MUST be a pure function of `ctx.showTime` + the compiled cue list
 *     (deterministic). Never accumulate show state frame-by-frame: PLAY / PAUSE / SEEK / RESTART
 *     must produce the identical picture for the same show time.
 *  2. Systems never import UI code. They communicate outward through `app.events`.
 *  3. Units are metres and seconds. +Y is up. Origin = centre-front edge of the MainStage deck
 *     at ground level. +Z points from the stage towards the audience (FOH is at +Z).
 *     See WORLD_AXES below.
 */
import type * as THREE from 'three';
import type { App } from './App';

/**
 * World axes (authoritative):
 *  - Stage front edge lies on the line z = 0, the stage extends into -Z (backstage).
 *  - Audience field extends into +Z. A spectator facing the stage looks towards -Z.
 *  - +X is to the RIGHT of a spectator facing the stage ("stage left" in theatre terms).
 */
export const WORLD_AXES = 'stage front z=0, audience +Z, spectator facing -Z, +X = spectator right';

export type QualityLevel = 'ultra' | 'high' | 'medium' | 'mobile';

export interface QualitySettings {
  level: QualityLevel;
  /** cap for window.devicePixelRatio */
  maxPixelRatio: number;
  /** base internal render scale (dynamic resolution works below this) */
  renderScale: number;
  /** MSAA samples on the HDR render target (0 = off) */
  msaa: number;
  shadows: boolean;
  shadowMapSize: number;
  /** total crowd members (all LODs) */
  crowdCount: number;
  /** crowd members rendered with the detailed mesh near the camera */
  crowdNearCount: number;
  flagCount: number;
  /** multiplier 0..1 applied to every particle effect's particle count */
  particleScale: number;
  /** maximum simultaneously drawn moving-head beams */
  beamBudget: number;
  /** maximum simultaneously drawn laser beams */
  laserBudget: number;
  /** haze sheets, beam haze noise, god rays */
  volumetrics: boolean;
  bloom: boolean;
  /** number of bloom mip levels */
  bloomLevels: number;
  /** post chain on/off (off = direct render, only on very weak devices) */
  postfx: boolean;
  /** camera far plane / fog end */
  drawDistance: number;
  treeCount: number;
  /** resolution of procedurally generated textures */
  textureSize: number;
  anisotropy: number;
}

export interface BeatInfo {
  bpm: number;
  /** continuous beat index since the tempo segment anchor (float) */
  beat: number;
  /** 0..1 position within the current beat */
  phase: number;
  /** continuous bar index (4/4) */
  bar: number;
  /** 0..1 position within the current bar */
  barPhase: number;
  /** 1 at each kick, exponential decay afterwards (0 when the segment has no kick) */
  kick: number;
  /** does the current tempo segment have a kick drum */
  hasKick: boolean;
  /** 0..1 musical energy of the current section */
  energy: number;
}

export interface FrameContext {
  /** real seconds since previous frame (clamped to 0.1) */
  dt: number;
  /** real seconds since app start (for cosmetic, non-show animation like idle sway) */
  time: number;
  /** show time in seconds (from ShowClock, deterministic source of truth) */
  showTime: number;
  /** show time delta since previous frame (0 while paused, may be negative after a seek) */
  showDt: number;
  showPlaying: boolean;
  /** true on the frame right after a seek/restart (systems with caches must rebuild) */
  seeked: boolean;
  beat: BeatInfo;
  camera: THREE.PerspectiveCamera;
  /** position of the player's body (feet) */
  playerPos: THREE.Vector3;
}

export interface System {
  readonly name: string;
  /** Called once after the renderer + scene exist. May be async (texture generation etc). */
  init?(app: App): void | Promise<void>;
  update(ctx: FrameContext): void;
  setQuality?(q: QualitySettings): void;
  /** Toggled from the developer menu. */
  setEnabled?(on: boolean): void;
  /** Stats for the developer menu (particle count, draw calls ...). */
  stats?(): Record<string, number | string>;
  dispose?(): void;
}

/** Simple 2D collider on the XZ ground plane. */
export type Collider2D =
  | { kind: 'box'; minX: number; maxX: number; minZ: number; maxZ: number; tag?: string }
  | { kind: 'circle'; x: number; z: number; r: number; tag?: string };

/** Something the player can interact with (bars, info boards, ...). */
export interface Interactable {
  id: string;
  position: THREE.Vector3;
  /** interaction radius (m) */
  radius: number;
  /** short verb shown in the prompt, e.g. "Order a drink" */
  label: string;
  onInteract(): void;
}

/** A named spot for the teleport / position menu and camera presets. */
export interface NamedSpot {
  id: string;
  label: string;
  position: THREE.Vector3;
  /** yaw (radians) the player looks at when arriving (0 = facing -Z = the stage) */
  yaw: number;
  pitch?: number;
}

/** Postprocessing perception parameters (sober defaults in PostFX.defaults()). */
export interface PerceptionParams {
  /** 0..1 gaussian-ish blur amount */
  blur: number;
  /** 0..1 horizontal ghost/double image offset */
  doubleVision: number;
  /** 0..1 chromatic aberration */
  chroma: number;
  /** 0..1 screen-space wobble/warp */
  wobble: number;
  /** 0..1 tunnel vision (dark, blurred periphery) */
  tunnel: number;
  /** 1 = normal */
  saturation: number;
  /** 1 = normal */
  contrast: number;
  /** exposure multiplier, 1 = normal */
  exposure: number;
  /** extra bloom multiplier, 0 = normal */
  bloomBoost: number;
  /** 0..1 lowers the bloom threshold (light sensitivity / glare) */
  lightSensitivity: number;
  /** 0..0.97 motion trail persistence (feedback buffer) */
  trails: number;
  /** 0..1 slow-decaying afterimages (complementary tint) */
  afterimage: number;
  /** 0..1 breathing geometric pattern warp (visual overload) */
  patternWarp: number;
  /** radians, hue rotation */
  hueShift: number;
  /** 0..1 generic motion blur along camera motion */
  motionBlur: number;
  /** <0 = off; otherwise screen x (0..1) of the compare split: left of it sober, right altered */
  split: number;
}

export interface PhotoParams {
  enabled: boolean;
  /** metres, 0 = no depth of field */
  focusDistance: number;
  /** 0..1 */
  aperture: number;
  exposure: number;
  vignette: number;
  grain: number;
}
