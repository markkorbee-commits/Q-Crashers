import * as THREE from 'three';

/**
 * Shading for the dragon crown.
 *
 * The show does not light the set with hundreds of real lights. Instead every crown material gets
 * a small set of VIRTUAL lights injected into three's physical lighting loop (the "wash rig"):
 *   - two low front floods (deck / castle-roof uplights) + a high FOH key, coloured by the stage wash
 *   - a back/top rim light (sky + fireworks), a flash light (pyro / fireworks) and a kick pulse
 *   - the glowing throat as a point light (lights teeth, tongue and palate)
 * plus a colour tint on the image-based reflections so the metal picks up the wash in its
 * reflections. All values live in ONE shared uniform object, updated once per frame.
 */

export interface CrownUniforms {
  [k: string]: THREE.IUniform;
  uWashA: THREE.IUniform<THREE.Color>;
  uWashB: THREE.IUniform<THREE.Color>;
  uKey: THREE.IUniform<THREE.Color>;
  uRim: THREE.IUniform<THREE.Color>;
  uFlash: THREE.IUniform<THREE.Color>;
  uEnvTint: THREE.IUniform<THREE.Color>;
  uAmbient: THREE.IUniform<THREE.Color>;
  uMouthPos: THREE.IUniform<THREE.Vector3>;
  uMouthCol: THREE.IUniform<THREE.Color>;
  uLava: THREE.IUniform<THREE.Color>;
  uLed: THREE.IUniform<THREE.Color>;
  uLed2: THREE.IUniform<THREE.Color>;
  uLedI: THREE.IUniform<number>;
  uPattern: THREE.IUniform<number>;
  uPhase: THREE.IUniform<number>;
  uPulse: THREE.IUniform<number>;
  uWings: THREE.IUniform<number>;
  /**
   * colour of the wing print's own uplights (the wing LED hue with a warm share): the printed inferno
   * reads red-orange under a red look and goes dark under a blue / green one (a red print under blue
   * light), instead of glowing orange in every look
   */
  uPrintTint: THREE.IUniform<THREE.Color>;
  uEyes: THREE.IUniform<THREE.Color>;
  uMouth: THREE.IUniform<number>;
  uRosette: THREE.IUniform<THREE.Color>;
  uPixel: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  uFlashV: THREE.IUniform<number>;
  /** show time (s) for the sweeping light pools */
  uShowT: THREE.IUniform<number>;
  /** 0..1 strength of the moving-head light pools sweeping over the set */
  uPoolAmt: THREE.IUniform<number>;
  /** 0..1 level of the crown's practicals (constant glows, bulbs, rosette hubs): 0 in blackouts */
  uEmit: THREE.IUniform<number>;
  /** 0..1 'ember' mask: only the dragon and the inner wings stay lit */
  uEmber: THREE.IUniform<number>;
  /** minimum on-screen width (px) of the LED strips / bulbs, so outlines never alias away */
  uMinPx: THREE.IUniform<number>;
  /** wing LED colours (wingColor / crownColor overrides of the content colour) */
  uLedW: THREE.IUniform<THREE.Color>;
  uLedW2: THREE.IUniform<THREE.Color>;
  /** the audience-right wing's LED colours (round 11: = uLedW / uLedW2 unless a per-side wing colour is set) */
  uLedWR: THREE.IUniform<THREE.Color>;
  uLedWR2: THREE.IUniform<THREE.Color>;
  /** the right wing's print tint (see uPrintTint) */
  uPrintTintR: THREE.IUniform<THREE.Color>;
  /** 0..2 level of the dragon's LED lines / dots and of the wing LED lines (region isolation) */
  uDragonG: THREE.IUniform<number>;
  uWingG: THREE.IUniform<number>;
  /** continuous beat index (festoon chase / strobe) */
  uBeat: THREE.IUniform<number>;
  /** festoon bulb strings: level per group (x wings, y castle, z sides, w castle-front row), colour, pattern, pulses per beat */
  uGarl: THREE.IUniform<THREE.Vector4>;
  uGarlCol: THREE.IUniform<THREE.Color>;
  uGarlPat: THREE.IUniform<number>;
  uGarlRate: THREE.IUniform<number>;
  /** festoon bulbs: x white-hot share (1 = round-7 white core), y glare size (1 = round-7 halo) */
  uGarlHG: THREE.IUniform<THREE.Vector2>;
  /** 0..1 how much of the wash rig + reflections reach the wings / the dragon (mask isolations) */
  uWingWash: THREE.IUniform<number>;
  uDragonWash: THREE.IUniform<number>;
  /**
   * 0 = the show (night calibration), 1 = the dev `?daylight` view. Materials whose printed art was
   * brightened to match the daytime photos scale their albedo back by their `nightK` at 0, so every
   * show look keeps the brightness it was calibrated for (the photos set the art, not the exposure).
   */
  uDay: THREE.IUniform<number>;
  /**
   * jaw-local -> crown space (head frame x jaw rotation, this frame): the jaw's LED strips and pixel
   * dots ride in the static strip / bulb draws (instances flagged `iJaw`) and follow the jaw here
   */
  uJawMat: THREE.IUniform<THREE.Matrix4>;
  /** per-side emitter level: x audience-left (x < 0), y right (stage.state `side`) */
  uSide: THREE.IUniform<THREE.Vector2>;
  /**
   * stage.flash light (round 11): rgb = colour x level x SCULPT_FLASH_GAIN, w = 1 confines it to the head;
   * uSFlashReg = weight on the dragon (non-wing parts) / the wings; uHeadC = the head's centre (world)
   */
  uSFlash: THREE.IUniform<THREE.Vector4>;
  uSFlashReg: THREE.IUniform<THREE.Vector2>;
  uHeadC: THREE.IUniform<THREE.Vector3>;
  /** level of the white wing plates' LED glow (round 11; tunable in the page) */
  uPlateGlow: THREE.IUniform<number>;
  /**
   * night response of the wing membranes' printed skin: x the level of the print lit by the wash rig (key,
   * rim, washes, ambient), y how far its hue is pulled to the wing LED colour, z the level of its own
   * uplight relative to PRINT_UPLIGHT (see MEMBRANE_LIT)
   */
  uMembLit: THREE.IUniform<THREE.Vector3>;
  /**
   * throat glow (round 9): x level at mouth 1 (was 0.5), y how far its pale pink is pulled to THROAT_RED
   * (see THROAT_GLOW; tunable in the page: `__app.get('stage').crownTune.throat` / `throatRed`)
   */
  uThroat: THREE.IUniform<THREE.Vector2>;
}

export function createUniforms(): CrownUniforms {
  return {
    uWashA: { value: new THREE.Color(0.4, 0.05, 0.05) },
    uWashB: { value: new THREE.Color(0.4, 0.05, 0.05) },
    uKey: { value: new THREE.Color(0.1, 0.1, 0.12) },
    uRim: { value: new THREE.Color(0.05, 0.07, 0.15) },
    uFlash: { value: new THREE.Color(0, 0, 0) },
    uEnvTint: { value: new THREE.Color(1, 1, 1) },
    uAmbient: { value: new THREE.Color(0.02, 0.025, 0.05) },
    uMouthPos: { value: new THREE.Vector3(0, 11, -5) },
    uMouthCol: { value: new THREE.Color(0, 0, 0) },
    uLava: { value: new THREE.Color(0, 0, 0) },
    uLed: { value: new THREE.Color('#ff2a10') },
    uLed2: { value: new THREE.Color('#2a60ff') },
    uLedI: { value: 0.5 },
    uPattern: { value: 0 },
    uPhase: { value: 0 },
    uPulse: { value: 0 },
    uWings: { value: 0.5 },
    uPrintTint: { value: new THREE.Color(1, 1, 1) },
    uEyes: { value: new THREE.Color('#ff5a00') },
    uMouth: { value: 0.2 },
    uRosette: { value: new THREE.Color('#8a2cff') },
    uPixel: { value: 0.001 },
    uTime: { value: 0 },
    uFlashV: { value: 0 },
    uShowT: { value: 0 },
    uPoolAmt: { value: 0.35 },
    uEmit: { value: 1 },
    uEmber: { value: 0 },
    uMinPx: { value: 2 },
    uLedW: { value: new THREE.Color('#ff2a10') },
    uLedW2: { value: new THREE.Color('#2a60ff') },
    uLedWR: { value: new THREE.Color('#ff2a10') },
    uLedWR2: { value: new THREE.Color('#2a60ff') },
    uPrintTintR: { value: new THREE.Color(1, 1, 1) },
    uDragonG: { value: 1 },
    uWingG: { value: 1 },
    uBeat: { value: 0 },
    uGarl: { value: new THREE.Vector4(0, 0, 0, 0) },
    uGarlCol: { value: new THREE.Color('#ffb466') },
    uGarlPat: { value: 0 },
    uGarlRate: { value: 2 },
    uGarlHG: { value: new THREE.Vector2(1, 1) },
    uWingWash: { value: 1 },
    uDragonWash: { value: 1 },
    uDay: { value: 0 },
    uJawMat: { value: new THREE.Matrix4() },
    uSide: { value: new THREE.Vector2(1, 1) },
    uSFlash: { value: new THREE.Vector4(0, 0, 0, 0) },
    uSFlashReg: { value: new THREE.Vector2(0, 0) },
    uHeadC: { value: new THREE.Vector3(-1.4, 17, -9) },
    uPlateGlow: { value: 0 },
    uMembLit: { value: new THREE.Vector3(MEMBRANE_LIT.level, MEMBRANE_LIT.hue, MEMBRANE_LIT.uplight) },
    uThroat: { value: new THREE.Vector2(0.5, 0) },
  };
}

/** GLSL: LED pattern shared by strips, bulbs, membrane pixels and rosettes. */
export const LED_GLSL = /* glsl */ `
uniform vec3 uLed;
uniform vec3 uLed2;
uniform float uLedI;
uniform float uPattern;
uniform float uPhase;
uniform float uPulse;
uniform float uEmit;
uniform float uEmber;
uniform vec3 uLedW;
uniform vec3 uLedW2;
uniform vec3 uLedWR;
uniform vec3 uLedWR2;
uniform float uDragonG;
uniform float uWingG;
uniform vec2 uSide;
// per-side isolation of the emitters (soft over the dragon's head)
float crownSide(float x) { return mix(uSide.x, uSide.y, smoothstep(-6.0, 6.0, x)); }
float crownHash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
// overall LED output of the crown (strips, pixel dots, membrane lanes, rosette spokes), calibrated
// against the official video (round 4): at 1.0 the lines clipped to white-pink under the tone curve
// and outshone the lit sculpture; the footage keeps them saturated (1463 / 1389.5 / 843 / 191.5)
const float CROWN_LED_K = 0.6;
// strip / dot group: 0 primary, 1 accent (dragon); 2 primary, 3 accent (wings: own colours + level).
// A fractional part f (0..0.45) dims the strip to 1 - 2f (secondary outlines: top edges, rings).
float crownWing(float g) { return step(1.5, g); }
// world x of the emitter being shaded (set by each shader's main before crownLed / crownSteady): picks the
// left / right wing colours (round 11; identical unless stage.state wingColorLeft / wingColorRight is given)
float crownWX = 0.0;
vec3 wingC1() { return mix(uLedW, uLedWR, step(0.0, crownWX)); }
vec3 wingC2() { return mix(uLedW2, uLedWR2, step(0.0, crownWX)); }
float crownDim(float g) { return clamp(1.0 - 2.0 * fract(g + 0.001), 0.05, 1.0); }
vec3 crownSteady(float g) {
  float w = crownWing(g);
  vec3 c = (g - 2.0 * w) > 0.5 ? mix(uLed2, wingC2(), w) : mix(uLed, wingC1(), w);
  return c * mix(uDragonG, uWingG, w) * CROWN_LED_K;
}
// 'ember': the dragon and the inner wings stay lit, the outer wings fade to a dim red silhouette
float emberMask(float x) { return mix(1.0, mix(0.2, 1.0, 1.0 - smoothstep(16.0, 36.0, abs(x))), uEmber); }
// u: metres along the strip, grpIn: 0 primary / 1 accent (+2 on the wings), side: -1 left / +1 right,
// seed: per strip
vec3 crownLed(float u, float grpIn, float side, float seed) {
  float wing = crownWing(grpIn);
  float grp = grpIn - 2.0 * wing;
  vec3 L1 = mix(uLed, wingC1(), wing);
  vec3 L2 = mix(uLed2, wingC2(), wing);
  vec3 base = grp > 0.5 ? L2 : L1;
  float b = 1.0;
  int p = int(uPattern + 0.5);
  if (p == 1) {
    // chase: comets running outwards along every strip (one wavelength per phase unit)
    float x = fract(u / 7.0 - uPhase + seed * 0.37);
    float head = pow(1.0 - x, 4.0);
    b = 0.06 + 1.1 * head;
    base = mix(L2 * 0.5, L1, clamp(head * 1.6, 0.0, 1.0));
  } else if (p == 2) {
    float x = fract(uPhase);
    b = 0.12 + 0.95 * exp(-5.0 * x);
  } else if (p == 3) {
    float px = floor(u * 6.0) + seed * 97.0;
    float t = floor(uPhase * 6.0);
    float h = crownHash(px * 1.31 + t * 7.77);
    float tw = step(0.84, h);
    b = 0.07 + 1.25 * tw;
    base = mix(base, vec3(1.0, 0.95, 0.9), tw * step(0.96, h));
  } else if (p == 4) {
    base = side < 0.0 ? L1 : L2;
    b = 0.85 + 0.15 * sin(u * 0.9 - uPhase * 6.2831);
  }
  b *= 1.0 + 1.4 * uPulse;
  return (base * b * uLedI + vec3(uPulse * uLedI * 0.25)) * mix(uDragonG, uWingG, wing) * CROWN_LED_K;
}
`;

const WASH_PARS = /* glsl */ `
uniform vec3 uWashA;
uniform vec3 uWashB;
uniform vec3 uKey;
uniform vec3 uRim;
uniform vec3 uFlash;
uniform vec3 uEnvTint;
uniform vec3 uAmbient;
uniform vec3 uMouthPos;
uniform vec3 uMouthCol;
uniform vec3 uLava;
uniform float uShowT;
uniform float uPoolAmt;
uniform float uWingWash;
uniform float uDragonWash;
uniform float uDay;
uniform vec4 uSFlash;
uniform vec2 uSFlashReg;
uniform vec3 uHeadC;

// soft light pools of the moving-head washes sweeping across the set (deterministic in show time)
float crownPools(vec3 p) {
  float f = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 c = vec2(sin(uShowT * (0.23 + fi * 0.07) + fi * 1.7) * 32.0, 15.0 + sin(uShowT * (0.19 + fi * 0.05) + fi * 2.3) * 7.0);
    vec2 d = (p.xy - c) / vec2(10.0, 7.0);
    f += exp(-dot(d, d));
  }
  return f;
}
varying vec3 vCrownPos;
varying float vCrownFx;
// wash level of this fragment's part (fx tag 2 = wing geometry)
float crownWashReg() { return mix(uDragonWash, uWingWash, step(1.5, vCrownFx)); }
void crownLight(vec3 Lw, vec3 col, vec3 N, vec3 V, PhysicalMaterial m, inout ReflectedLight rl, float wrap) {
  vec3 L = normalize((viewMatrix * vec4(Lw, 0.0)).xyz);
  float nl = saturate((dot(N, L) + wrap) / (1.0 + wrap));
  vec3 irr = nl * col;
  rl.directSpecular += irr * BRDF_GGX(L, V, N, m);
  rl.directDiffuse += irr * BRDF_Lambert(m.diffuseContribution);
}
`;

const WASH_APPLY = /* glsl */ `
{
  #ifdef STANDARD
  #if !( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
    float essW = material.dfg.x + material.dfg.y;
    material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / essW - 1.0 );
  #endif
  #endif
  // floods sit low on the deck / castle roof: stronger on the lower parts of the set
  float hFade = mix(1.2, 0.6, smoothstep(6.0, 27.0, vCrownPos.y));
  #ifndef CROWN_LITE
  hFade *= 1.0 + uPoolAmt * (clamp(crownPools(vCrownPos), 0.0, 1.3) - 0.45);
  #endif
  float xs = clamp(vCrownPos.x / 30.0, -1.0, 1.0);
  float wreg = crownWashReg();
  crownLight(vec3(-0.45, -0.35, 0.82), uWashA * hFade * (1.0 - 0.35 * xs) * wreg, geometryNormal, geometryViewDir, material, reflectedLight, 0.0);
  crownLight(vec3(0.45, -0.3, 0.84), uWashB * hFade * (1.0 + 0.35 * xs) * wreg, geometryNormal, geometryViewDir, material, reflectedLight, 0.0);
  crownLight(vec3(0.1, 0.42, 0.9), uKey * wreg, geometryNormal, geometryViewDir, material, reflectedLight, 0.0);
  #ifndef CROWN_LITE
  crownLight(vec3(0.0, 0.55, -0.83), uRim * mix(0.3, 1.0, wreg), geometryNormal, geometryViewDir, material, reflectedLight, 0.0);
  #endif
  crownLight(vec3(0.15, 0.75, 0.45), uFlash, geometryNormal, geometryViewDir, material, reflectedLight, 0.3);
  #ifndef CROWN_EXT
  // stage.flash (round 11): a white flood on the head / dragon / wings (video 713.5 / 719.75: the head plates and
  // horns go bone-white while the wings burn); never on the castle (the set pieces sharing this rig: CROWN_EXT)
  if (uSFlash.r + uSFlash.g + uSFlash.b > 0.0) {
    float sreg = mix(uSFlashReg.x, uSFlashReg.y, step(1.5, vCrownFx));
    sreg *= mix(1.0, 1.0 - smoothstep(8.0, 12.0, length(vCrownPos - uHeadC)), uSFlash.w);
    vec3 sc = uSFlash.rgb * sreg;
    // a soft diffuse flood (a white head; no specular: glossy steel under it glared into bloom discs)
    vec3 Lf = normalize((viewMatrix * vec4(normalize(vec3(-0.15, 0.45, 1.0)), 0.0)).xyz);
    float nlf = saturate((dot(geometryNormal, Lf) + 0.6) / 1.6);
    reflectedLight.directDiffuse += sc * nlf * BRDF_Lambert(max(material.diffuseContribution, vec3(0.08)));
  }
  #endif
  // glowing throat: a point light between the jaws
  vec3 dm = uMouthPos - vCrownPos;
  float dd = length(dm);
  float att = 1.0 / (1.0 + dd * dd * 0.45) * (1.0 - smoothstep(4.0, 7.0, dd));
  vec3 Lm = normalize((viewMatrix * vec4(dm / max(dd, 1e-3), 0.0)).xyz);
  float nlm = saturate(dot(geometryNormal, Lm) * 0.85 + 0.15);
  reflectedLight.directDiffuse += uMouthCol * att * nlm * BRDF_Lambert(material.diffuseContribution);
  reflectedLight.directSpecular += uMouthCol * att * nlm * BRDF_GGX(Lm, geometryViewDir, geometryNormal, material);
  reflectedLight.indirectDiffuse += uAmbient * BRDF_Lambert(material.diffuseContribution);
}
`;

/**
 * level of the wing print's own uplights at `wings` 1 (round 6: 0.42 -> 0.28, metric-neutral; video 338 /
 * 1322.5: the membranes read darker than the LED spars and strokes)
 */
export const PRINT_UPLIGHT = 0.28;

/**
 * night response of the membranes' print (round 8): `level` scales the print lit by the wash rig (the LED
 * strokes and the back light through the fabric are not affected), `hue` pulls the print's colour (lit and
 * self-lit) to the wing LED hue (uPrintTint), `uplight` scales its own uplight (PRINT_UPLIGHT x `wings`).
 * Video 1320.75 / 1322.5: dark red membranes under the pink wash with red / pink strokes, where the orange
 * print had read as a lit red-orange sheet (metric-neutral on the 64 moments, +0.4-0.7 at 1320-1323).
 * Tunable in the page: `__app.get('stage').crown.U.uMembLit.value` (x level, y hue, z uplight).
 */
export const MEMBRANE_LIT = { level: 0.3, hue: 0.6, uplight: 0.5 };

export interface PatchOpts {
  /** cache key suffix */
  key: string;
  /** add emissive lava cracks driven by the emissive map * uLava (fx channel gates it) */
  lava?: boolean;
  /** emissive pixel-canvas stripes (wing membranes) */
  membrane?: boolean;
  /** cheaper lighting (no light pools, no rim light) for mobile GPUs */
  lite?: boolean;
  /** albedo scale in the show (see CrownUniforms.uDay): keeps the night level of re-painted art */
  nightK?: number;
  /** membrane: gain of the self-lit print (normalised to the print's mean brightness) */
  printGain?: number;
  /** white wing plates (fx >= 2.5) glow in the wing LED colour (round 11, see uPlateGlow) */
  plates?: boolean;
}

/** Inject the virtual wash rig (+ optional effects) into a MeshStandardMaterial. */
export function patchStandard(mat: THREE.MeshStandardMaterial, U: CrownUniforms, o: PatchOpts): THREE.MeshStandardMaterial {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    if (o.lite) sh.defines = { ...(sh.defines ?? {}), CROWN_LITE: '' };
    // set pieces that borrow the crown's wash rig (applyWashRig: castle / deck) never take the stage.flash light
    if (o.key.startsWith('ext-')) sh.defines = { ...(sh.defines ?? {}), CROWN_EXT: '' };
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vCrownPos;
varying float vCrownFx;
attribute float fx;
${o.membrane ? 'attribute vec3 memb; varying vec3 vMemb; uniform float uTime;' : ''}`,
      )
      .replace(
        '#include <begin_vertex>',
        o.membrane
          ? `#include <begin_vertex>
// the printed skin breathes in the evening breeze (cosmetic idle motion, real time)
transformed += objectNormal * (sin(uTime * 0.9 + position.x * 0.16 + position.y * 0.11) * 0.1
  + sin(uTime * 1.7 - position.y * 0.23) * 0.04) * sin(3.14159 * memb.x) * smoothstep(0.0, 4.0, memb.y);`
          : '#include <begin_vertex>',
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
{
  vec4 cw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  cw = instanceMatrix * cw;
  #endif
  vCrownPos = (modelMatrix * cw).xyz;
  vCrownFx = fx;
  ${o.membrane ? 'vMemb = memb;' : ''}
}`,
      );
    let fs = sh.fragmentShader;
    const nk = (o.nightK ?? 1).toFixed(3);
    fs = fs.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
vec3 crownAlb = diffuseColor.rgb;
diffuseColor.rgb *= mix(${nk}, 1.0, uDay);${
        o.membrane
          ? `
{
  // night: the printed skin under the wash rig takes the wing LED hue at its own peak level and a reduced
  // level (the footage shows dark membranes carrying the LED strokes, never the orange print under a
  // pink / violet wash: video 1320.75 / 1322.5 / 509.25); the daytime view keeps the painted inferno
  vec3 pTint = mix(uPrintTint, uPrintTintR, step(0.0, vCrownPos.x));
  vec3 hueW = pTint / max(max(pTint.r, max(pTint.g, pTint.b)), 1e-4);
  float pk = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
  vec3 litP = mix(diffuseColor.rgb, pk * hueW, uMembLit.y) * uMembLit.x;
  diffuseColor.rgb = mix(litP, diffuseColor.rgb, uDay);
}`
          : ''
      }`,
    );
    fs = fs.replace(
      '#include <lights_physical_pars_fragment>',
      `#include <lights_physical_pars_fragment>
${WASH_PARS}
${o.membrane ? LED_GLSL + 'uniform float uWings;\nuniform vec3 uPrintTint;\nuniform vec3 uPrintTintR;\nuniform vec3 uMembLit;' : ''}
${o.lava && !o.membrane ? 'uniform float uDragonG;\nuniform float uWingG;' : ''}
${o.plates && !o.membrane && !o.lava ? 'uniform vec3 uLedW;\nuniform vec3 uLedWR;\nuniform float uLedI;\nuniform float uWingG;\nuniform float uWings;\nuniform vec2 uSide;\nuniform float uEmber;\nuniform float uPlateGlow;' : ''}
${o.membrane ? 'varying vec3 vMemb;' : ''}`,
    );
    fs = fs.replace('#include <lights_fragment_begin>', `#include <lights_fragment_begin>\n${WASH_APPLY}`);
    fs = fs.replace(
      '#include <lights_fragment_maps>',
      `#include <lights_fragment_maps>
#if defined( RE_IndirectSpecular )
radiance *= uEnvTint * max(crownWashReg(), 0.03);
#endif
iblIrradiance *= uEnvTint * max(crownWashReg(), 0.03);`,
    );
    let emissive = '';
    if (o.plates && !o.membrane && !o.lava) {
      // round 11: the white arrowhead / kunai / crescent plates along the spars catch the wing LEDs beside them
      // (video 307 / 338 / 412.5 / 1463: every spar reads as a broad candy-striped blade of white and the wing
      // colour; unlit, the glossy steel plates stayed dark and the spars read as thin lines under the arches)
      emissive += `
{
  float plate = step(2.5, vCrownFx);
  if (plate > 0.0) {
    vec3 wc = mix(uLedW, uLedWR, step(0.0, vCrownPos.x));
    float wm = max(wc.r, max(wc.g, wc.b));
    vec3 pc = mix(wc, vec3(wm), 0.35);
    float sd = mix(uSide.x, uSide.y, smoothstep(-6.0, 6.0, vCrownPos.x));
    float em = mix(1.0, mix(0.2, 1.0, 1.0 - smoothstep(16.0, 36.0, abs(vCrownPos.x))), uEmber);
    totalEmissiveRadiance += crownAlb * pc * uLedI * uWingG * uWings * uPlateGlow * sd * em * (1.0 - uDay);
  }
}`;
    }
    if (o.lava) {
      // the cracks glow with the dragon's inner fire: a dragon emitter, so a mask that darkens the
      // dragon's LEDs darkens them too (mask 'wings': dragon 0; the wing arms' hide also goes out
      // under 'dragon', where the wings are off). Video 1322.5 / 1392.5: no glowing arms or neck.
      emissive += `
{
  #ifdef USE_EMISSIVEMAP
  float crack = texture2D(emissiveMap, vEmissiveMapUv).r;
  float crackG = min(1.0, vCrownFx > 1.5 ? min(uDragonG, uWingG) : uDragonG);
  totalEmissiveRadiance += uLava * crack * crack * 4.3 * step(0.5, vCrownFx) * crackG;
  #endif
}`;
    }
    if (o.membrane) {
      // vMemb.x: across-panel coordinate 0..1, vMemb.y: metres from the wrist, vMemb.z: side(-1/1)*(panel+1)
      emissive += `
{
  // feather strokes: slanted LED lanes fanning across the membrane, long tapered segments that
  // alternate between the two LED colours (the official footage shows the wings as a mass of
  // pink / white / blue blade strokes, not as vertical pickets)
  float lanes = 8.0;
  float side = sign(vMemb.z);
  float a = vMemb.x * lanes + vMemb.y * 0.16;
  float lane = floor(a);
  float fa = fract(a) - 0.5;
  float wA = fwidth(a) * 1.2 + 0.02;
  float line = 1.0 - smoothstep(0.05, 0.05 + wA, abs(fa));
  float d = vMemb.y / 3.2 + lane * 0.43;
  float fd = fract(d);
  float wD = fwidth(d) * 1.2;
  float feather = smoothstep(0.0, 0.1 + wD, fd) * (1.0 - smoothstep(0.5 - wD, 0.78 + wD, fd));
  feather = mix(feather, 0.45, clamp(wD * 1.5, 0.0, 1.0));
  // lanes run in phase so chases read as horizontal bands climbing the membrane (design bible §7.3)
  // (seed step 1/0.37 keeps the chase phase identical per lane but decorrelates the sparkle hash)
  float alt = mod(lane, 3.0) < 0.5 ? 3.0 : 2.0;
  crownWX = vCrownPos.x;
  vec3 lc = crownLed(vMemb.y, alt, side, abs(vMemb.z) + lane * 2.7027027);
  // pixel canvas fades out towards the wrist
  float grow = smoothstep(1.5, 5.0, vMemb.y);
  float em = emberMask(vCrownPos.x) * crownSide(vCrownPos.x);
  totalEmissiveRadiance += lc * line * feather * grow * uWings * 2.4 * em;
  // the printed skin is flooded by its own warm uplights from below (follows the wing glow level):
  // saturated print, brightest at the lower edge, falling off towards the scalloped top. Kept below
  // the blades / spars (video 1047.25, 1389.5: the skin reads as a dim red-orange ground under the
  // lit blades and the printed suns, never as a glowing orange sheet)
  // (round 8: the print's colour is pulled to the wing LED hue like its lit response, uMembLit.y)
  vec3 printAlb = crownAlb * crownAlb;
  float pk2 = max(printAlb.r, max(printAlb.g, printAlb.b));
  vec3 pTintE = mix(uPrintTint, uPrintTintR, step(0.0, vCrownPos.x));
  printAlb = mix(printAlb, pk2 * pTintE / max(max(pTintE.r, max(pTintE.g, pTintE.b)), 1e-4), uMembLit.y);
  vec3 print = printAlb * pTintE * ${(o.printGain ?? 1.9).toFixed(3)};
  totalEmissiveRadiance += print * (0.03 * uEmit + ${PRINT_UPLIGHT.toFixed(3)} * uMembLit.z * uWings) * em * mix(1.15, 0.4, smoothstep(3.0, 18.0, vMemb.y)) * (1.0 - uDay);
  // printed fabric lets some of the back light (sky, fireworks behind the stage) shine through
  totalEmissiveRadiance += crownAlb * uRim * ${(0.35 * (o.printGain ?? 1.9) / 1.9).toFixed(3)};
}`;
    }
    if (emissive) fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${emissive}`);
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => 'crown-' + o.key + (o.lite ? '-lite' : '') + (o.plates ? '-pl' : '') + '-' + (o.nightK ?? 1).toFixed(3) + '-' + (o.printGain ?? 1.9).toFixed(3);
  return mat;
}

// ---------------------------------------------------------------------------------------------
// LED strips: instanced camera-facing segments with a minimum on-screen width (never alias away)
// ---------------------------------------------------------------------------------------------

export function createStripMaterial(U: CrownUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
attribute vec2 corner;
attribute vec3 iA;
attribute vec3 iB;
attribute vec2 iU;
attribute vec4 iInfo; // group, side, seed, width
attribute float iJaw; // 1 = rides on the lower jaw (jaw-local points)
uniform float uPixel;
uniform float uMinPx;
uniform mat4 uJawMat;
varying float vU;
varying float vAcross;
varying float vFade;
varying float vFar;
varying vec3 vInfo;
varying float vWX;
void main() {
  vec3 pA = iJaw > 0.5 ? (uJawMat * vec4(iA, 1.0)).xyz : iA;
  vec3 pB = iJaw > 0.5 ? (uJawMat * vec4(iB, 1.0)).xyz : iB;
  vec4 mvA = modelViewMatrix * vec4(pA, 1.0);
  vec4 mvB = modelViewMatrix * vec4(pB, 1.0);
  vec4 mv = mix(mvA, mvB, corner.x);
  vec3 d = mvB.xyz - mvA.xyz;
  float dl = max(length(d), 1e-4);
  vec3 dir = d / dl;
  vec3 toCam = normalize(-mv.xyz);
  vec3 side = cross(dir, toCam);
  float sl = length(side);
  side = sl > 1e-4 ? side / sl : vec3(1.0, 0.0, 0.0);
  float px = max(-mv.z, 0.1) * uPixel;
  // never thinner than uMinPx on screen: far away the strip becomes a crisp line of light. The line
  // keeps most of its radiance (an LED pixel is a point source much brighter than the set), so the
  // outlines read from the back of the field and from the drone instead of dissolving into haze.
  float w = max(iInfo.w, uMinPx * px);
  float ratio = iInfo.w / w;
  vFade = clamp(sqrt(ratio), 0.7, 1.0);
  vFar = smoothstep(0.1, 0.7, 1.0 - ratio);
  mv.xyz += side * corner.y * 0.5 * w;
  mv.xyz += dir * (corner.x * 2.0 - 1.0) * 0.35 * w;
  // a widened line is pulled towards the camera so it is not buried in the surface it runs on
  mv.xyz += toCam * (w - iInfo.w) * 0.8;
  gl_Position = projectionMatrix * mv;
  vU = mix(iU.x, iU.y, corner.x);
  vAcross = corner.y;
  vInfo = iInfo.xyz;
  vWX = (modelMatrix * vec4(mix(pA, pB, corner.x), 1.0)).x;
}`,
    fragmentShader: /* glsl */ `
${LED_GLSL}
uniform float uWings;
varying float vU;
varying float vAcross;
varying float vFade;
varying float vFar;
varying vec3 vInfo;
varying float vWX;
void main() {
  float a = 1.0 - abs(vAcross);
  float core = smoothstep(0.0, 0.7, a);
  // individual pixels when close, continuous line when far
  float pu = vU * 8.0;
  float fw = fwidth(pu);
  float dots = mix(0.35 + 0.65 * smoothstep(0.42, 0.18, abs(fract(pu) - 0.5)), 1.0, clamp(fw * 1.5, 0.0, 1.0));
  crownWX = vWX;
  vec3 c = crownLed(vU, vInfo.x, vInfo.y, vInfo.z);
  // from far away a chase / sparkle averages over many pixels: the outline keeps a steady level and
  // is pushed above the lit haze around the crown, so the wing ribs read as lines of light
  vec3 steady = crownSteady(vInfo.x) * uLedI * 0.7;
  c = max(c, steady * vFar) * (1.0 + 1.2 * vFar);
  // seed >= 2: a steady emitter (finial flame spires, fins): no pattern, no pixel rows; the look's LED
  // level x the wing glow level (stage.state wings: a dim look keeps dark finials, video 20.25) + kick pulse
  // Far away (a strip widened to the minimum pixel width) they fade instead of standing out as bright stars
  // over the finials (video 509.25: the wide shot reads the spars and suns, not glaring crowns).
  if (vInfo.z >= 2.0) {
    c = crownSteady(vInfo.x) * uLedI * uWings * (1.0 + 0.6 * uPulse) * mix(1.0, 0.4, vFar);
    dots = 1.0;
  }
  gl_FragColor = vec4(c * core * dots * vFade * 3.2 * crownDim(vInfo.x) * emberMask(vWX) * crownSide(vWX), 1.0);
}`,
  });
}

export interface StripBuild {
  a: number[];
  b: number[];
  u: number[];
  info: number[];
  /** 1 = jaw-local segment (see CrownUniforms.uJawMat) */
  jaw: number[];
}

function append(dst: number[], src: number[]): void {
  for (let i = 0; i < src.length; i++) dst.push(src[i]);
}

/** grow `box` by the points of a flat xyz list, transformed by `m` when given */
function boundPoints(box: THREE.Box3, xyz: number[], m: THREE.Matrix4 | null, from = 0): void {
  const p = new THREE.Vector3();
  for (let i = from * 3; i < xyz.length; i += 3) {
    p.set(xyz[i], xyz[i + 1], xyz[i + 2]);
    if (m) p.applyMatrix4(m);
    box.expandByPoint(p);
  }
}

export class Strips {
  private d: StripBuild = { a: [], b: [], u: [], info: [], jaw: [] };
  /** bounds of the absorbed jaw segments (crown space, jaw at rest + margin) */
  private extra = new THREE.Box3();
  segments = 0;
  private seedN = 0;
  /**
   * Add a strip along a polyline. group 0 = primary LED colour, 1 = accent (led2).
   * width in metres. u runs in metres from `u0`.
   */
  add(pts: THREE.Vector3[], group = 0, width = 0.14, u0 = 0, seed?: number): number {
    if (pts.length < 2) return u0;
    const s = seed ?? (this.seedN++ * 0.618) % 1;
    let u = u0;
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      const l = p.distanceTo(q);
      if (l < 1e-4) continue;
      this.d.a.push(p.x, p.y, p.z);
      this.d.b.push(q.x, q.y, q.z);
      this.d.u.push(u, u + l);
      const side = Math.sign((p.x + q.x) * 0.5) || 1;
      this.d.info.push(group, side, s, width);
      this.d.jaw.push(0);
      u += l;
      this.segments++;
    }
    return u;
  }
  /**
   * Take over the (jaw-local) segments of `jaw`, flagged to follow CrownUniforms.uJawMat, so the jaw's
   * LEDs share this draw. `rest` maps jaw-local to crown space at a typical opening (bounds only).
   */
  absorb(jaw: Strips, rest: THREE.Matrix4): void {
    const o = jaw.d;
    boundPoints(this.extra, o.a, rest);
    boundPoints(this.extra, o.b, rest);
    append(this.d.a, o.a);
    append(this.d.b, o.b);
    append(this.d.u, o.u);
    append(this.d.info, o.info);
    for (let i = 0; i < jaw.segments; i++) this.d.jaw.push(1);
    this.segments += jaw.segments;
    jaw.d = { a: [], b: [], u: [], info: [], jaw: [] };
    jaw.segments = 0;
  }
  build(mat: THREE.Material): THREE.Mesh {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('corner', new THREE.BufferAttribute(new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), 2));
    g.setIndex([0, 1, 2, 2, 1, 3]);
    g.setAttribute('iA', new THREE.InstancedBufferAttribute(new Float32Array(this.d.a), 3));
    g.setAttribute('iB', new THREE.InstancedBufferAttribute(new Float32Array(this.d.b), 3));
    g.setAttribute('iU', new THREE.InstancedBufferAttribute(new Float32Array(this.d.u), 2));
    g.setAttribute('iInfo', new THREE.InstancedBufferAttribute(new Float32Array(this.d.info), 4));
    g.setAttribute('iJaw', new THREE.InstancedBufferAttribute(new Float32Array(this.d.jaw), 1));
    g.instanceCount = this.segments;
    // bounds from the static points + the absorbed jaw (at rest, with room for the jaw's travel)
    const box = new THREE.Box3();
    const p = new THREE.Vector3();
    for (let i = 0; i < this.d.a.length; i += 3) {
      if (this.d.jaw[i / 3] > 0.5) continue;
      box.expandByPoint(p.set(this.d.a[i], this.d.a[i + 1], this.d.a[i + 2]));
      box.expandByPoint(p.set(this.d.b[i], this.d.b[i + 1], this.d.b[i + 2]));
    }
    if (!this.extra.isEmpty()) box.union(this.extra.clone().expandByScalar(2.5));
    g.boundingBox = box;
    g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = true;
    // after the haze (renderOrder 10) and the beams: LED outlines pierce the haze instead of being veiled by it
    m.renderOrder = 12;
    this.d = { a: [], b: [], u: [], info: [], jaw: [] };
    this.extra.makeEmpty();
    return m;
  }
}

// ---------------------------------------------------------------------------------------------
// Bulbs: instanced billboards (pixel dots, eye clusters, mouth ring) with a minimum pixel size
// ---------------------------------------------------------------------------------------------

/** bulb types */
export const BULB = { led: 0, accent: 1, eye: 2, mouth: 3, rider: 4, warm: 5, wingLed: 6, wingAccent: 7 } as const;

export function createBulbMaterial(U: CrownUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
attribute vec2 corner;
attribute vec3 iPos;
attribute vec4 iInfo; // type, u, size, seed
attribute float iJaw; // 1 = rides on the lower jaw (jaw-local position)
uniform float uPixel;
uniform float uMinPx;
uniform mat4 uJawMat;
varying vec2 vC;
varying vec4 vInfo;
varying float vFade;
varying float vWX;
void main() {
  vec3 pos = iJaw > 0.5 ? (uJawMat * vec4(iPos, 1.0)).xyz : iPos;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float px = max(-mv.z, 0.1) * uPixel;
  float s = max(iInfo.z, 1.1 * uMinPx * px);
  // far away a sparse bulb is a point source: keep a good part of its radiance on the minimum-size
  // dot. Dense clusters (eye rings, the ~200 mouth pixels) stay energy-conserving so they do not
  // pile up into a white blob.
  float ratio = iInfo.z / s;
  int bt = int(iInfo.x + 0.5);
  vFade = (bt == 2 || bt == 3) ? clamp(pow(ratio, 1.2), 0.06, 1.0) : clamp(pow(ratio, 0.8), 0.28, 1.0);
  mv.xy += corner * s * 1.6;
  mv.xyz += normalize(-mv.xyz) * (s - iInfo.z) * 1.5;
  gl_Position = projectionMatrix * mv;
  vC = corner;
  vInfo = iInfo;
  vWX = (modelMatrix * vec4(pos, 1.0)).x;
}`,
    fragmentShader: /* glsl */ `
${LED_GLSL}
uniform vec3 uEyes;
uniform float uMouth;
uniform float uTime;
varying vec2 vC;
varying vec4 vInfo;
varying float vFade;
varying float vWX;
void main() {
  float r2 = dot(vC, vC) * 2.56;
  float core = exp(-r2 * 7.0);
  float halo = exp(-r2 * 1.6) * 0.07;
  float m = core + halo;
  if (m < 0.004) discard;
  int t = int(vInfo.x + 0.5);
  vec3 c;
  crownWX = vWX;
  if (t == 0 || t == 1) c = crownLed(vInfo.y, float(t), sign(vInfo.w - 0.5), vInfo.w) * 1.4;
  else if (t == 6 || t == 7) c = crownLed(vInfo.y, float(t - 4), sign(vInfo.w - 0.5), vInfo.w) * 1.4;
  else if (t == 2) c = uEyes * 3.0;
  else if (t == 3) {
    // mouth bulbs (palate, gums, tongue): pale pink-white pixels, chasing slowly, brighter with the mouth glow
    vec3 led = crownLed(vInfo.y, 0.0, 1.0, 0.5);
    c = mix(vec3(1.0, 0.8, 0.84) * (0.25 + 0.75 * uLedI), led, 0.2) * (0.2 * uEmit + 0.9 * uMouth) * 1.2;
  } else if (t == 4) c = (vec3(1.0, 0.96, 0.92) * (0.35 * uEmit + 1.2 * min(1.0, dot(uEyes, vec3(0.3, 0.5, 0.2)) * 1.5)) + uEyes * 0.3);
  else c = vec3(1.0, 0.7, 0.4) * (0.3 * uEmit + uLedI) * uDragonG;
  // eyes / mouth / rider keep their own controls; the LED dots follow the per-side level
  float sd = (t == 2 || t == 3 || t == 4) ? 1.0 : crownSide(vWX);
  gl_FragColor = vec4(c * m * vFade * 2.4 * emberMask(vWX) * sd, 1.0);
}`,
  });
}

export class Bulbs {
  private pos: number[] = [];
  private info: number[] = [];
  private jaw: number[] = [];
  private extra = new THREE.Box3();
  count = 0;
  add(p: THREE.Vector3, type: number, u = 0, size = 0.12, seed = Math.random()): void {
    this.pos.push(p.x, p.y, p.z);
    this.info.push(type, u, size, seed);
    this.jaw.push(0);
    this.count++;
  }
  /** take over the (jaw-local) dots of `jaw`, flagged to follow CrownUniforms.uJawMat (see Strips.absorb) */
  absorb(jaw: Bulbs, rest: THREE.Matrix4): void {
    boundPoints(this.extra, jaw.pos, rest);
    append(this.pos, jaw.pos);
    append(this.info, jaw.info);
    for (let i = 0; i < jaw.count; i++) this.jaw.push(1);
    this.count += jaw.count;
    jaw.pos = [];
    jaw.info = [];
    jaw.jaw = [];
    jaw.count = 0;
  }
  build(mat: THREE.Material): THREE.Mesh {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('corner', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), 2));
    g.setIndex([0, 1, 2, 2, 1, 3]);
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('iInfo', new THREE.InstancedBufferAttribute(new Float32Array(this.info), 4));
    g.setAttribute('iJaw', new THREE.InstancedBufferAttribute(new Float32Array(this.jaw), 1));
    g.instanceCount = this.count;
    const box = new THREE.Box3();
    const p = new THREE.Vector3();
    for (let i = 0; i < this.pos.length; i += 3) if (this.jaw[i / 3] < 0.5) box.expandByPoint(p.set(this.pos[i], this.pos[i + 1], this.pos[i + 2]));
    if (!this.extra.isEmpty()) box.union(this.extra.clone().expandByScalar(2.5));
    box.expandByScalar(1);
    g.boundingBox = box;
    g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    const m = new THREE.Mesh(g, mat);
    m.renderOrder = 13;
    this.pos = [];
    this.info = [];
    this.jaw = [];
    this.extra.makeEmpty();
    return m;
  }
}

// ---------------------------------------------------------------------------------------------
// Festoon garlands: warm tungsten bulb strings along the wing tops, the wing arms and the castle /
// side-section eaves (seen in the official footage at the big warm moments). One instanced draw.
// ---------------------------------------------------------------------------------------------

/** garland groups (uGarl.x / .y / .z / .w) */
export const GARLAND = { wings: 0, castle: 1, sides: 2, base: 3 } as const;
/** HDR gain of a festoon bulb at level 1 (round 6: 3.2 -> 4.5, the wing strings read as bright white points) */
const GARLAND_GAIN = 7;
/** bulb diameter (m) of the wing strings / the castle and side-section strings (round 6: 0.15 -> 0.24 / 0.2) */
export const GARLAND_BULB = { wings: 0.24, set: 0.2 } as const;
/** minimum glare radius (screen px) of a festoon bulb: far bulbs keep a glaring point */
const GARLAND_GLARE_PX = 5;

export function createGarlandMaterial(U: CrownUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
#define GARLAND_GLARE_PX ${GARLAND_GLARE_PX.toFixed(3)}
attribute vec2 corner;
attribute vec3 iPos;
attribute vec4 iInfo; // group, u (m along the string), size, seed
uniform float uPixel;
uniform float uMinPx;
uniform vec2 uGarlHG;
varying vec2 vC;
varying vec4 vInfo;
varying float vFade;
varying float vQ;
void main() {
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float px = max(-mv.z, 0.1) * uPixel;
  float s = max(iInfo.z, 1.1 * uMinPx * px);
  // a far bulb is a point source: most of its light stays on the minimum-size dot
  vFade = clamp(pow(iInfo.z / s, 0.75), 0.3, 1.0);
  // the quad also carries a glare of at least GARLAND_GLARE_PX pixels (a camera sees a frosted bulb in the
  // haze as a glaring point at any distance, video 582.75 / 1047.25)
  // (uGarlHG.y > 1: the glare disc grows with the bulb, so near bulbs bloom into wide discs, video 583.5)
  float q = max(1.6 * s * max(uGarlHG.y, 1.0), GARLAND_GLARE_PX * px);
  vQ = q / s;
  mv.xy += corner * q;
  mv.xyz += normalize(-mv.xyz) * (s - iInfo.z) * 1.5;
  gl_Position = projectionMatrix * mv;
  vC = corner;
  vInfo = iInfo;
}`,
    fragmentShader: /* glsl */ `
#define GARLAND_GAIN ${GARLAND_GAIN.toFixed(3)}
uniform vec4 uGarl;
uniform vec3 uGarlCol;
uniform float uGarlPat;
uniform float uGarlRate;
uniform vec2 uGarlHG;
uniform float uBeat;
uniform float uShowT;
varying vec2 vC;
varying vec4 vInfo;
varying float vFade;
varying float vQ;
float gHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  float g = vInfo.x;
  float lvl = g < 0.5 ? uGarl.x : (g < 1.5 ? uGarl.y : (g < 2.5 ? uGarl.z : uGarl.w));
  if (lvl < 1e-3) discard;
  float rq2 = dot(vC, vC);
  // (radius in units of the bulb: r2 = (|vC| * q / s)^2 / 0.39, as round 6 with q = 1.6 s)
  float r2 = rq2 * vQ * vQ;
  // (glare G > 1, round 11: the bulb blooms into a wider white disc with a soft edge, video 582.75-584.2)
  float G = uGarlHG.y;
  float core = exp(-r2 * 8.0 / (G * G));
  // frosted globes bloom in the haze: a soft glare round every bulb (video 582.75 / 1268: bright white
  // points with halos, not pin-pricks) + a faint pixel-sized glare that keeps far bulbs glaring
  // (glare > 1, round 11: a wider, brighter disc that washes out to white in the haze, video 582.75-584.2)
  float halo = exp(-r2 * 1.5 / (G * G)) * 0.26;
  float glare = exp(-rq2 * 5.0) * 0.07;
  float m = core + halo + glare;
  if (m < 0.004) discard;
  // tungsten filaments: slight per-bulb spread
  float k = 0.82 + 0.3 * gHash(vec2(vInfo.w * 97.0, 3.1));
  int p = int(uGarlPat + 0.5);
  if (p == 1) {
    // chase: warm band running along every string
    float x = fract(vInfo.y / 5.0 - uBeat * uGarlRate * 0.5);
    k *= 0.18 + 1.1 * smoothstep(0.0, 0.1, x) * (1.0 - smoothstep(0.2, 0.55, x));
  } else if (p == 2) {
    float h = gHash(vec2(vInfo.w * 131.0, floor(uShowT * 9.0)));
    k *= 0.3 + 0.9 * step(0.62, h);
  } else if (p == 3) {
    // strobe on the beat grid (uGarlRate flashes per beat)
    k *= step(fract(uBeat * uGarlRate), 0.4);
  }
  // hot white filament in a warm glass: the core is white-hot, the halo keeps half the glass tint (round 6
  // read as cream discs; the footage shows glaring white points with a warm fringe)
  // (uGarlHG.x, round 11: the white-hot share; 0 keeps the whole bulb in the cue colour, gold bulbs in the
  // orange smoke of video 165.5 / 173.5)
  vec3 hot = vec3(1.0, 0.96, 0.9) * max(uGarlCol.r, max(uGarlCol.g, uGarlCol.b));
  float H = uGarlHG.x;
  // a glare disc (G > 1) is the haze lit white round the bulb: its halo leans white with the glare
  float hw = mix(0.5, 0.85, clamp((G - 1.0) * 0.5, 0.0, 1.0)) * H;
  vec3 c = mix(mix(uGarlCol, hot, hw), hot, min(1.0, core * 1.1) * H);
  gl_FragColor = vec4(c * m * lvl * k * vFade * GARLAND_GAIN, 1.0);
}`,
  });
}

export class Garlands {
  private pos: number[] = [];
  private info: number[] = [];
  count = 0;
  /**
   * Add a festoon: bulbs every `pitch` metres along the polyline `pts` (group: GARLAND.*).
   * `u0` continues the string coordinate (for the chase).
   */
  string(pts: THREE.Vector3[], group: number, pitch = 0.9, size = 0.11, u0 = 0): number {
    let u = u0;
    let next = pitch * 0.5;
    const d = new THREE.Vector3();
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const l = a.distanceTo(b);
      if (l < 1e-5) continue;
      while (next <= l) {
        d.lerpVectors(a, b, next / l);
        this.pos.push(d.x, d.y, d.z);
        this.info.push(group, u + next, size, (this.count * 0.618034) % 1);
        this.count++;
        next += pitch;
      }
      next -= l;
      u += l;
    }
    return u;
  }
  /** a hanging swag (catenary-like parabola) from a to b sagging by `sag` */
  swag(a: THREE.Vector3, b: THREE.Vector3, sag: number, group: number, pitch = 0.9, size = 0.11, u0 = 0): number {
    const pts: THREE.Vector3[] = [];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(new THREE.Vector3().lerpVectors(a, b, t).setY(a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t)));
    }
    return this.string(pts, group, pitch, size, u0);
  }
  build(mat: THREE.Material): THREE.Mesh {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('corner', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), 2));
    g.setIndex([0, 1, 2, 2, 1, 3]);
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('iInfo', new THREE.InstancedBufferAttribute(new Float32Array(this.info), 4));
    g.instanceCount = this.count;
    const box = new THREE.Box3();
    const p = new THREE.Vector3();
    for (let i = 0; i < this.pos.length; i += 3) box.expandByPoint(p.set(this.pos[i], this.pos[i + 1], this.pos[i + 2]));
    box.expandByScalar(1);
    g.boundingBox = box;
    g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    const m = new THREE.Mesh(g, mat);
    m.renderOrder = 13;
    m.name = 'stage-garlands';
    m.matrixAutoUpdate = false;
    m.visible = false;
    return m;
  }
}

// ---------------------------------------------------------------------------------------------
// Emissive rosette hub (instanced, rotates with the gear) and the throat glow
// ---------------------------------------------------------------------------------------------

/** radius of the rosette glow disc (the throat glow instance is scaled from it) */
export const ROSETTE_R = 2.35;
/** saturated red-pink the throat glow is pulled to (round 9, uThroat.y) */
const THROAT_RED = [1.0, 0.16, 0.24];

/**
 * Throat glow: a soft, additive haze of pale pink / white light deep in the jaws with a hint of the
 * blue light at the back of the throat (design bible §5.6). No hard edge and no dark rim, so it never
 * reads as a big eye inside the mouth; the pixel dots on palate, gums and tongue carry the detail.
 * d: disc coordinates (-1..1); needs uMouth / uEmit.
 */
const THROAT_GLSL = /* glsl */ `
uniform float uMouth;
uniform vec2 uThroat;
vec3 throatGlow(vec2 d) {
  float r2 = dot(d, d);
  // soft falloff that reaches exactly 0 well before the disc edge
  float g = exp(-r2 * 2.4) * (1.0 - smoothstep(0.3, 0.85, r2));
  // the glow rises from the tongue root instead of filling the whole opening evenly
  g *= mix(1.0, 0.3, smoothstep(0.35, 0.95, d.y * 0.5 + 0.5));
  float core = exp(-r2 * 16.0);
  // round 9: the pale pink haze is pulled to a saturated red-pink (the footage's mouth reads red under
  // every look: 998.25 green look, 680.5 / 656 red, 362.5 close-up pink palate with white bulbs, never a
  // pale pink-white ball glowing out of the jaws)
  vec3 hz = mix(vec3(1.0, 0.5, 0.62), vec3(${THROAT_RED.map((v) => v.toFixed(3)).join(', ')}), uThroat.y);
  vec3 c = mix(hz, vec3(0.4, 0.5, 1.0), core * 0.6 * (1.0 - 0.5 * uThroat.y));
  return c * g * (0.05 * uEmit + uThroat.x * uMouth);
}
`;

/** Emissive rosette suns (instanced, turning with the gears) + the throat glow as the last instance (iKind 1). */
export function createRosetteGlowMaterial(U: CrownUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
attribute float iKind; // 0 rosette sun, 1 the throat glow (the last instance)
varying vec2 vP;
varying float vSeed;
varying float vKind;
void main() {
  vP = position.xy;
  vKind = iKind;
  #ifdef USE_INSTANCING
  vec4 w = instanceMatrix * vec4(position, 1.0);
  vSeed = instanceMatrix[3].x;
  #else
  vec4 w = vec4(position, 1.0);
  vSeed = 0.0;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * w;
}`,
    fragmentShader: /* glsl */ `
${LED_GLSL}
#define ROSETTE_R ${ROSETTE_R.toFixed(3)}
${THROAT_GLSL}
uniform vec3 uRosette;
uniform float uWings;
varying vec2 vP;
varying float vSeed;
varying float vKind;
void main() {
  if (vKind > 0.5) {
    // throat glow (see THROAT_GLSL): a soft additive haze of pale pink / white light deep in the jaws
    gl_FragColor = vec4(throatGlow(vP / ROSETTE_R), 1.0);
    return;
  }
  float r = length(vP);
  float a = atan(vP.y, vP.x);
  float R = 2.25;
  float fr = fwidth(r);
  // a SUNBURST (official footage 338 / 1047.25: orange suns of long and short rays on the dark
  // skin), not a lit disc in a bright ring: small 8-point star + 16 tapered rays of alternating
  // length + a faint core glow; the ring LED only as a thin dim accent
  float star = smoothstep(0.5 + fr, 0.5 - fr, r / (0.5 + 0.32 * pow(abs(cos(a * 4.0)), 6.0)));
  float ca = cos(a * 8.0);
  float rayLen = ca > 0.0 ? R * 0.95 : R * 0.62;
  float rays = pow(abs(ca), 14.0) * smoothstep(0.3, 0.55, r) * (1.0 - smoothstep(rayLen * 0.45, rayLen, r));
  float sa = fwidth(a * 8.0);
  rays = mix(rays, 0.08 * (1.0 - smoothstep(R * 0.4, R * 0.9, r)), clamp(sa * 0.8, 0.0, 1.0));
  float rim = smoothstep(0.07 + fr, 0.0, abs(r - R * 0.86));
  float glow = exp(-r * 2.6) * 0.3;
  crownWX = vSeed;
  vec3 led = crownLed(r * 2.0 + vSeed * 0.1, 3.0, sign(vSeed), 0.3);
  float lv = max(uLedI, 0.2);
  vec3 c = uRosette * (star * 1.5 + glow + rays * (0.5 + 0.6 * lv)) * (0.3 + 0.8 * uWings) + led * (rays * 0.4 + rim * 0.3);
  gl_FragColor = vec4(c * 1.2 * emberMask(vSeed) * crownSide(vSeed), 1.0);
}`,
  });
}

// ---------------------------------------------------------------------------------------------
// Environment map: blue-hour sky with scattered fixture highlights, as an HDR equirect
// (three converts it to PMREM on first use). Neutral-ish so the uEnvTint can colour it.
// ---------------------------------------------------------------------------------------------

export function createEnvMap(): THREE.DataTexture {
  const W = 256;
  const H = 128;
  const data = new Uint16Array(W * H * 4);
  const toH = THREE.DataUtils.toHalfFloat;
  const rnd = (i: number) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const blobs: { u: number; v: number; r: number; c: [number, number, number] }[] = [];
  for (let i = 0; i < 40; i++) {
    const warm = rnd(i * 3.1) > 0.5;
    blobs.push({
      u: rnd(i),
      v: 0.35 + rnd(i + 11) * 0.3,
      r: 0.004 + rnd(i + 21) * 0.01,
      c: warm ? [2.6, 2.0, 1.5] : [1.5, 1.9, 3.0],
    });
  }
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1); // 0 = bottom (nadir) in three's equirect convention with flipY
    const el = (v - 0.5) * Math.PI; // elevation
    for (let x = 0; x < W; x++) {
      const u = x / W;
      let r: number, g: number, b: number;
      if (el > 0) {
        const t = Math.pow(1 - el / (Math.PI / 2), 3);
        // zenith deep blue -> horizon lighter violet-blue
        r = 0.02 + 0.22 * t;
        g = 0.035 + 0.22 * t;
        b = 0.11 + 0.42 * t;
        // twilight glow behind the audience (+Z = u around 0.75 in three's equirect)
        const du = Math.abs(((u - 0.25 + 1.5) % 1) - 0.5);
        const glow = Math.exp(-du * du * 18) * t * t;
        r += 0.5 * glow;
        g += 0.22 * glow;
        b += 0.18 * glow;
      } else {
        const t = Math.pow(1 + el / (Math.PI / 2), 2);
        r = 0.012 + 0.03 * t;
        g = 0.012 + 0.03 * t;
        b = 0.02 + 0.05 * t;
      }
      // soft studio strips (broad highlights that read on curved metal)
      const s1 = Math.exp(-Math.pow((v - 0.62) / 0.05, 2)) * 0.4;
      const s2 = Math.exp(-Math.pow((v - 0.8) / 0.08, 2)) * 0.22;
      r += (s1 + s2) * 0.8;
      g += (s1 + s2) * 0.85;
      b += (s1 + s2) * 1.0;
      for (const bl of blobs) {
        let du = Math.abs(u - bl.u);
        du = Math.min(du, 1 - du);
        const dv = v - bl.v;
        const d2 = (du * du + dv * dv) / (bl.r * bl.r);
        if (d2 < 9) {
          const k = Math.exp(-d2);
          r += bl.c[0] * k;
          g += bl.c[1] * k;
          b += bl.c[2] * k;
        }
      }
      const i = (y * W + x) * 4;
      data[i] = toH(r);
      data[i + 1] = toH(g);
      data[i + 2] = toH(b);
      data[i + 3] = toH(1);
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
