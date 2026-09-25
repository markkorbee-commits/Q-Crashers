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
