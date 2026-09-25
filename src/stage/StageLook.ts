import * as THREE from 'three';

/**
 * Resolved visual state of the stage set for one frame (computed by MainStageSystem from the
 * 'stage' + 'screens' cues and app.env, then handed to every set piece). Pure data.
 */
export interface StageLook {
  mode: 'dormant' | 'awake' | 'rage' | 'frozen' | 'ember';
  /** dragon eye glow */
  eyes: THREE.Color;
  eyesIntensity: number;
  /** 0..1 glow inside the jaws / throat */
  mouth: number;
  /** 0..1 jaw opening (if the jaw is articulated) */
  jaw: number;
  /** pixel-mapped LED lines on dragon, wings and castle */
  led: THREE.Color;
  led2: THREE.Color;
  ledIntensity: number;
  /** 0 solid, 1 chase, 2 pulse, 3 sparkle, 4 split (led on one half, led2 other) */
  ledPattern: number;
  /** pattern phase (driven by show time / beat, deterministic) */
  ledPhase: number;
  /** 0..1 wing rib glow multiplier */
  wings: number;
  rosettes: THREE.Color;
  /** rosette rotation angle (radians, deterministic from show time) */
  rosetteAngle: number;
  /** 0..1 castle window glow */
  windows: number;
  windowColor: THREE.Color;
  /** light washing the set (from app.env) */
  wash: THREE.Color;
  washIntensity: number;
  /** 0..1 kick/strobe pulse on the whole set */
  pulse: number;
  /** 0..1 flash light from pyro/fireworks near the set (from app.env) */
  flash: THREE.Color;
}

export function createStageLook(): StageLook {
  return {
    mode: 'dormant',
    eyes: new THREE.Color('#ff5a00'),
    eyesIntensity: 0.3,
    mouth: 0.2,
    jaw: 0.6,
    led: new THREE.Color('#ff2a10'),
    led2: new THREE.Color('#2a60ff'),
    ledIntensity: 0.4,
    ledPattern: 0,
    ledPhase: 0,
    wings: 0.5,
    rosettes: new THREE.Color('#8a2cff'),
    rosetteAngle: 0,
    windows: 0.6,
    windowColor: new THREE.Color('#3a6cff'),
    wash: new THREE.Color('#a01010'),
    washIntensity: 0.4,
    pulse: 0,
    flash: new THREE.Color(0, 0, 0),
  };
}

/**
 * Extra, castle-only fields (the crown only reads the StageLook base fields; passing this subtype
 * is contract compatible).
 */
export interface StageLookEx extends StageLook {
  /** extended LED pattern for the castle battens: 0..4 as ledPattern, 5 fire, 6 wave, 7 runes */
  ledPatternX: number;
  /** 0 steady, 1 fire flicker, 2 frozen shimmer, 3 embers */
  windowMode: number;
  /** crystal lanterns on the side sections */
  lantern: THREE.Color;
  /** arcade backlight / portal interior */
  arcade: THREE.Color;
  portal: THREE.Color;
  /** front-line fixture lenses */
  lamp: THREE.Color;
  /** decor glow multipliers */
  bannerGlow: number;
  skullGlow: number;
  emblemGlow: number;
  /** colour of the 'stage.pulse' cue */
  pulseColor: THREE.Color;
  /** 0..1 strobe level (from app.env) */
  strobe: number;
  /** current section energy 0..1 */
  energy: number;
}

export function createStageLookEx(): StageLookEx {
  return {
    ...createStageLook(),
    ledPatternX: 0,
    windowMode: 0,
    lantern: new THREE.Color('#8a3cff'),
    arcade: new THREE.Color('#5a2cff'),
    portal: new THREE.Color('#ff3a6a'),
    lamp: new THREE.Color('#dfe8ff'),
    bannerGlow: 1,
    skullGlow: 1,
    emblemGlow: 1,
    pulseColor: new THREE.Color('#ffffff'),
    strobe: 0,
    energy: 0.5,
  };
}
