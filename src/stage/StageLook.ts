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
  /**
   * 0..1 level of every set PRACTICAL (LED battens, pixel dots, lamps, lanterns, rosettes, bulbs,
   * decor backlights): master x dormant presence. A 'dormant' state with windows / wings at 0 is a
   * true blackout (0); show-driven light (wash, flash, strobe, pulse) is not affected.
   */
  emit: number;
  /** 0..1 'ember' mask: only the dragon and the inner wings stay lit, the castle goes dark */
  ember: number;
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
    emit: 1,
    ember: 0,
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
  /** accent LED battens (pilaster strips: white / cyan in most looks) */
  accent: THREE.Color;
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
  /** 'screens.content' shown on the LED banner panels: CONTENT_MODE index (0 = off) */
  content: number;
  /** content colour of the castle-core panels (the content colour with the state's castleColor override) */
  contentColor: THREE.Color;
  /** content colour of the side-section panels (sidesColor override on top of the castle's) */
  contentColorS: THREE.Color;
  /** second colour of the content look (color2, else the content colour): recesses of the castle print */
  contentColor2: THREE.Color;
  /** 0..1 dissolve of the panels */
  contentMix: number;
  /** 0..1 master level of all castle emitters (blackouts: section 'silence' or state param 'master') */
  master: number;

  // ---- region isolation (stage.state castle / sides / battens / dragon / wingLed / mask / *Color) ----
  /** 0..2 level of every castle-core practical (|x| < 37.5: battens, windows, lamps, decor, portal) */
  castleGain: number;
  /** 0..2 level of every side-section / arm practical (|x| > 37.5) */
  sidesGain: number;
  /** 0..2 level of the LED battens + pixel dots only (castle + sides; windows etc. unaffected) */
  battenGain: number;
  /** 0..2 level of the dragon's LED lines / pixel dots (eyes + mouth keep their own controls) */
  dragonGain: number;
  /** 0..2 level of the wing LED lines (spars, edges, rosette rings, membrane pixel lanes) */
  wingGain: number;
  /** 0..1 share of the crown's wash rig / reflections that reaches the wings / the dragon (masks) */
  wingWash: number;
  dragonWash: number;
  /**
   * resolved LED colours per region (content / section colour with the state's region overrides);
   * the base `led` / `led2` are the dragon's (crown) colours
   */
  castleLed: THREE.Color;
  castleLed2: THREE.Color;
  sidesLed: THREE.Color;
  sidesLed2: THREE.Color;
  sidesAccent: THREE.Color;
  wingLed: THREE.Color;
  wingLed2: THREE.Color;
  /**
   * LED colours of the audience-RIGHT wing (x > 0; round 11, stage.state `wingColorRight`): equal to
   * `wingLed` / `wingLed2` unless a per-side wing colour is given (then `wingLed*` is the left wing's)
   */
  wingLedR: THREE.Color;
  wingLedR2: THREE.Color;
  /** 0..1 emitter level of the audience-left (x < 0) / right half (state param `side`) */
  sideL: number;
  sideR: number;
  /**
   * minimum LED level of the crown (dragon + wing LED lines) while a `mask` isolates it (crown / wings):
   * the isolated crown IS the look, so its outlines stay lit when `screens.content` is off (video
   * 1320.75-1323.5: only the wing outlines + the throat); already scaled by the emitter level
   */
  crownLedFloor: number;
  /**
   * 0..1 floor of the dragon's mouth / throat and the portal emblem while `master` dims the set (state param
   * `glowFloor`, already scaled by the dormant presence): video 409-412, both stay pink / red through the
   * white veil at master 0.1
   */
  glowFloor: number;
  /** 0..1 how much the side-section virtual floods take `sidesLed` instead of the lighting wash */
  sidesFloodTint: number;
  /** 0..1 same for the castle core floods (castleColor override) */
  castleFloodTint: number;

  // ---- warm festoon bulb strings (stage.state garlands / stage.garlands cues) ----------------------
  /**
   * HDR level of the garlands per group: x wings, y castle core, z side sections, w the straight row along
   * the castle front (round 11, group 'base')
   */
  garland: THREE.Vector4;
  garlandColor: THREE.Color;
  /**
   * 0..1 white-hot share of the bulbs (round 11): 1 = a white-hot core in a half-white halo (the default),
   * 0 = bulbs in the cue colour (gold bulbs in orange smoke, video 165.5 / 173.5)
   */
  garlandHot: number;
  /** >= 0.5 size / weight of the glare disc round every bulb (round 11; 1 = default, 3 = white discs in haze) */
  garlandGlare: number;
  /** 0 steady, 1 chase, 2 twinkle, 3 strobe */
  garlandPattern: number;
  /** pulses per beat of the chase / strobe */
  garlandRate: number;

  // ---- LED gate / stutter (stage.gate cues), already folded into ledIntensity / garland ------------
  /** 0..1 gate multiplier of the castle battens this frame (1 = open) */
  gateCastle: number;
  /** 0..1 gate multiplier of the crown LED lines this frame */
  gateCrown: number;

  // ---- stage.flash (round 11): a transient light on the sculpture + an LED override ------------------
  /** colour x level of the flash light on the dragon / wings (black = none) */
  sculptFlash: THREE.Color;
  /** region weights of that light: x the dragon (non-wing parts), y the wings */
  sculptFlashReg: THREE.Vector2;
  /** 1 = the light is confined to the head (a soft sphere round the skull), 0 = the whole region */
  sculptFlashHead: number;
  /**
   * 0..3 LED glow of the white plates on the wing spars (arrowheads, kunai blades, finial crescents; round 11,
   * stage.state `plates`, default 0): the spars read as broad candy-striped blades in the wing colour
   */
  plateGlow: number;
  /**
   * `lights.key` (round 12, from LightEnv.dragonKeyColor / dragonKeyColor2): premultiplied colour x level of the key
   * light on the dragon from the audience-left front / the right front (black = none; the crown reads them)
   */
  dragonKey: THREE.Color;
  dragonKey2: THREE.Color;
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
    accent: new THREE.Color('#e8f4ff'),
    bannerGlow: 1,
    skullGlow: 1,
    emblemGlow: 1,
    pulseColor: new THREE.Color('#ffffff'),
    strobe: 0,
    energy: 0.5,
    content: 0,
    contentColor: new THREE.Color('#ff5a12'),
    contentColorS: new THREE.Color('#ff5a12'),
    contentColor2: new THREE.Color('#ff5a12'),
    contentMix: 0,
    master: 1,
    castleGain: 1,
    sidesGain: 1,
    battenGain: 1,
    dragonGain: 1,
    wingGain: 1,
    wingWash: 1,
    dragonWash: 1,
    castleLed: new THREE.Color('#ff2a10'),
    castleLed2: new THREE.Color('#2a60ff'),
    sidesLed: new THREE.Color('#ff2a10'),
    sidesLed2: new THREE.Color('#2a60ff'),
    sidesAccent: new THREE.Color('#e8f4ff'),
    wingLed: new THREE.Color('#ff2a10'),
    wingLed2: new THREE.Color('#2a60ff'),
    wingLedR: new THREE.Color('#ff2a10'),
    wingLedR2: new THREE.Color('#2a60ff'),
    sideL: 1,
    sideR: 1,
    crownLedFloor: 0,
    glowFloor: 0,
    sidesFloodTint: 0,
    castleFloodTint: 0,
    garland: new THREE.Vector4(0, 0, 0, 0),
    garlandColor: new THREE.Color('#ffb46a'),
    garlandHot: 1,
    garlandGlare: 1,
    garlandPattern: 0,
    garlandRate: 2,
    gateCastle: 1,
    gateCrown: 1,
    sculptFlash: new THREE.Color(0, 0, 0),
    sculptFlashReg: new THREE.Vector2(0, 0),
    sculptFlashHead: 0,
    plateGlow: 0,
    dragonKey: new THREE.Color(0, 0, 0),
    dragonKey2: new THREE.Color(0, 0, 0),
  };
}
