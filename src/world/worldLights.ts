import * as THREE from 'three';
import type { FlashBucket, LightEnv } from '../core/LightEnv';
import { LANTERN_Y, PILLARS } from './site';

/**
 * Cheap "global illumination" of the grounds by the show (research/technical-decisions §4):
 * instead of real three.js lights (which would cost every material in the scene), the world
 * materials (ground, pillars, fences, FOH, trees, props) get a handful of analytic lights injected
 * into MeshStandardMaterial via onBeforeCompile:
 *   - the 8 pillar lanterns (full GGX, so damp concrete shows the lantern reflections)
 *   - the pillar uplight spill at each plinth (diffuse)
 *   - the stage as one broad soft source (colour = app.env.stageColor × stageIntensity)
 *   - the current pyro / firework flashes as two AREA lights (stage side / field side, app.env
 *     flashStage / flashField): the softening radius grows with the spread of the sources, so a gerb
 *     wall across both side sections lights the whole field instead of a hot spot at its centre
 *   - the bounce of big flashes off the smoke and haze: a broad ambient term around the flash centre
 *     (video 600.4 s: the whole field and the tree belts turn gold under the gerb wall)
 *   - the site-wide coloured glow of `atmos.glow` cues (app.env.glowColor): red smoke, flame walls
 * All materials share ONE uniform set, updated once per frame (after every show system ran).
 */

const N = PILLARS.length;

export const worldUniforms = {
  uWLamp: { value: PILLARS.map((p) => new THREE.Vector4(p.x, LANTERN_Y, p.z, 1)) },
  uWLampCol: { value: PILLARS.map(() => new THREE.Vector3()) },
  uWSpillCol: { value: PILLARS.map(() => new THREE.Vector3()) },
  uWStage: { value: new THREE.Vector4(0, 16, -12, 900) },
  uWStageCol: { value: new THREE.Vector3() },
  /** stage-side flash: xyz centre, w = softening radius² (400 + spread²) */
  uWFlash: { value: new THREE.Vector4(0, 40, -20, 400) },
  uWFlashCol: { value: new THREE.Vector3() },
  /** field-side flash (delay towers, FOH, bursts over the audience) */
  uWFlash2: { value: new THREE.Vector4(0, 40, 60, 400) },
  uWFlashCol2: { value: new THREE.Vector3() },
  /** flash bounce off smoke / haze: xyz centre, w = 1 / falloff radius² */
  uWAmbPos: { value: new THREE.Vector4(0, 15, 0, 1 / (230 * 230)) },
  uWAmbCol: { value: new THREE.Vector3() },
  /** site-wide coloured glow (atmos.glow), irradiance */
  uWGlowCol: { value: new THREE.Vector3() },
  uWTime: { value: 0 },
  /** sky radiance for glossy reflections (written by the EnvironmentSystem) */
  uWSkyZen: { value: new THREE.Color(0.004, 0.03, 0.12) },
  uWSkyHor: { value: new THREE.Color(0.012, 0.05, 0.16) },
  uWSkyHorNW: { value: new THREE.Color(0.03, 0.12, 0.2) },
  uWSunDir: { value: new THREE.Vector3(0, -0.07, 1) },
  uWMoonDir: { value: new THREE.Vector3(0.35, 0.14, -0.92) },
  uWMoonI: { value: 12 },
};

/** GLSL: sky radiance seen along world direction r (used by damp ground and the lake) */
export const SKY_REFLECT_GLSL = /* glsl */ `
vec3 wlSky( vec3 r ) {
  float e = max( r.y, 0.0 );
  vec2 dxz = normalize( r.xz + 1e-5 );
  float sunSide = dot( dxz, normalize( uWSunDir.xz ) ) * 0.5 + 0.5;
  vec3 hor = mix( uWSkyHor, uWSkyHorNW, pow( sunSide, 1.6 ) );
  return mix( hor, uWSkyZen, pow( e, 0.42 ) );
}
`;

/** Per-pillar light gains (HDR) — tuned against the Endshow frames (lanterns read as bright points
 * with coloured pools on the floor, shafts glow orange from the base). */
const LAMP_GAIN = 70;
const SPILL_GAIN = 90;
const STAGE_GAIN = 5200;
/** fireworks / pyro flashes on the grounds: aerial shells burst 60–150 m up, so the field gets a
 *  modest share (photo P: silhouetted pillars and a dim red floor under a full crackle canopy) */
const FLASH_GAIN = 3000;
/**
 * Pyro light is burning metal (≈ 2000–2500 K) and the camera is balanced for the LEDs: on the video a
 * gold gerb wall lights the ground deep ORANGE (measured on the field at v600.25: linear G/R ≈ 0.25,
 * B/R ≈ 0.05), not beige. The flash light on the grounds is warped towards its dominant channel,
 * c' = max · (c / max)^WARM (gold 1 : 0.67 : 0.33 → 1 : 0.37 : 0.06; white stays white, red stays
 * red). The flash colour itself stays the pyro module's.
 */
const FLASH_WARM = 2.5;
/** flash saturation for the grounds (a dense finale must not light the floor like a studio) */
const WORLD_FLASH_K = 7;
/**
 * Bounce of the flashes off the smoke / haze cloud (irradiance per unit of compressed flash, before
 * the haze factor). Tuned on the official video: 600.4 s (gold gerb wall: field, banks and tree belts
 * gold), 1509 s (flame wall: the whole site orange), 76 s (pink gerb fans). Small single flashes stay
 * almost direct-only (the bounce grows with F / (F + 2)).
 */
const BOUNCE_GAIN = 1.6;
/** half-strength radius (m) of the bounce around the flash centre (+ the spread of the sources) */
const BOUNCE_R = 110;
/** multiple scattering in a coloured smoke cloud saturates its light further (gold → orange, pink → red) */
const BOUNCE_WARM = 3;
/** atmos.glow irradiance per unit of env.glowColor */
const GLOW_GAIN = 6;

const tmp = new THREE.Color();

/** c' = k · max · (c / max)^p per channel (see FLASH_WARM), written to out */
function warm(r: number, g: number, b: number, p: number, k: number, out: { r: number; g: number; b: number }): void {
  const m = Math.max(r, g, b);
  if (!(m > 0)) {
    out.r = out.g = out.b = 0;
    return;
  }
  out.r = m * Math.pow(Math.max(0, r) / m, p) * k;
  out.g = m * Math.pow(Math.max(0, g) / m, p) * k;
  out.b = m * Math.pow(Math.max(0, b) / m, p) * k;
}
const warmOut = { r: 0, g: 0, b: 0 };

/**
 * Light of the flashes bounced off the smoke / haze cloud this frame (irradiance colour, saturated):
 * compressed like the direct flash, growing with F / (F + 2) so single small flashes stay direct-only.
 */
export function flashBounce(env: LightEnv, out: THREE.Color): THREE.Color {
  const F = env.flashIntensity;
  if (!(F > 0)) return out.setRGB(0, 0, 0);
  const haze = Math.min(1.2, Math.max(0, env.haze));
  const k = BOUNCE_GAIN * flashCompression(F, WORLD_FLASH_K) * (F / (F + 2)) * (0.45 + 0.55 * haze);
  const c = env.flashColor;
  warm(c.r, c.g, c.b, BOUNCE_WARM, k, warmOut);
  return out.setRGB(warmOut.r, warmOut.g, warmOut.b);
}
const bounceC = new THREE.Color();

function setFlash(b: FlashBucket, k: number, pos: THREE.Vector4, col: THREE.Vector3): void {
  const fl = FLASH_GAIN * k;
  const c = b.color;
  warm(c.r, c.g, c.b, FLASH_WARM, fl, warmOut);
  col.set(warmOut.r, warmOut.g, warmOut.b);
  const s = b.spread;
  // area light: a wall of sources softens the near hot spot and carries further (1/(d² + R²))
  pos.set(b.pos.x, b.pos.y, b.pos.z, 400 + 0.8 * s * s);
}

/**
 * Soft-knee compression of the accumulated flash energy (factor applied to env.flashColor, which is
 * pre-multiplied by intensity): single bursts (≈1–5) pass almost linearly, a dense finale saturates
 * around K (18 for the sky / haze) instead of blowing the whole world out.
 */
export function flashCompression(total: number, K = 18): number {
  if (!(total > 0)) return 0;
  return (K * (1 - Math.exp(-total / K))) / total;
}

/** chase multiplier for pillar i from app.env (empty array = all 1) */
export function pillarChase(env: LightEnv, i: number): number {
  const c = env.pillarChase;
  if (!c || c.length === 0) return 1;
  const v = c[i];
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 1;
}

/**
 * write this frame's show light state into the shared uniforms (call after all emitters ran).
 * `flashScale` < 1 softens the flash light on the grounds (photosensitivity setting).
 */
export function updateWorldLights(env: LightEnv, time: number, flashScale = 1): void {
  const u = worldUniforms;
  u.uWTime.value = time;
  for (let i = 0; i < N; i++) {
    const k = pillarChase(env, i);
    const lamp = Math.max(0, env.pillarLampIntensity) * k * LAMP_GAIN;
    tmp.copy(env.pillarLampColor);
    u.uWLampCol.value[i].set(tmp.r * lamp, tmp.g * lamp, tmp.b * lamp);
    const sp = Math.max(0, env.pillarShaftIntensity) * k * SPILL_GAIN;
    tmp.copy(env.pillarShaftColor);
    u.uWSpillCol.value[i].set(tmp.r * sp, tmp.g * sp, tmp.b * sp);
  }
  // stage: overall output + share aimed at the audience
  const st = (Math.max(0, env.stageIntensity) * 0.6 + Math.max(0, env.audienceWash) * 0.8 + 0.08) * STAGE_GAIN;
  u.uWStageCol.value.set(env.stageColor.r * st, env.stageColor.g * st, env.stageColor.b * st);
  // strobe adds white light from the stage
  const sb = Math.max(0, env.strobe) * STAGE_GAIN * 0.9;
  u.uWStageCol.value.x += sb;
  u.uWStageCol.value.y += sb;
  u.uWStageCol.value.z += sb;
  // flashes: the total is compressed once, both buckets share the factor
  const k = flashCompression(env.flashIntensity, WORLD_FLASH_K) * flashScale;
  setFlash(env.flashStage, k, u.uWFlash.value, u.uWFlashCol.value);
  setFlash(env.flashField, k, u.uWFlash2.value, u.uWFlashCol2.value);
  // bounce off the lit smoke around the flash centre (falls to a quarter at BOUNCE_R + spread)
  flashBounce(env, bounceC);
  u.uWAmbCol.value.set(bounceC.r * flashScale, bounceC.g * flashScale, bounceC.b * flashScale);
  const sp = env.flashSpread;
  const r = BOUNCE_R + sp;
  u.uWAmbPos.value.set(env.flashPos.x, Math.max(8, env.flashPos.y), env.flashPos.z, 1 / (r * r));
  const g = env.glowColor;
  u.uWGlowCol.value.set(g.r * GLOW_GAIN, g.g * GLOW_GAIN, g.b * GLOW_GAIN);
}

const PARS = /* glsl */ `
uniform vec4 uWLamp[${N}];
uniform vec3 uWLampCol[${N}];
uniform vec3 uWSpillCol[${N}];
uniform vec4 uWStage;
uniform vec3 uWStageCol;
uniform vec4 uWFlash;
uniform vec3 uWFlashCol;
uniform vec4 uWFlash2;
uniform vec3 uWFlashCol2;
uniform vec4 uWAmbPos;
uniform vec3 uWAmbCol;
uniform vec3 uWGlowCol;
uniform float uWTime;
uniform vec3 uWSkyZen;
uniform vec3 uWSkyHor;
uniform vec3 uWSkyHorNW;
uniform vec3 uWSunDir;
uniform vec3 uWMoonDir;
uniform float uWMoonI;
${SKY_REFLECT_GLSL}
`;

const APPLY = /* glsl */ `
{
  IncidentLight wl;
  wl.visible = true;
#ifdef WL_LAMPS
  for ( int i = 0; i < ${N}; i ++ ) {
    vec3 lp = ( viewMatrix * vec4( uWLamp[ i ].xyz, 1.0 ) ).xyz;
    vec3 L = lp - geometryPosition;
    float d2 = dot( L, L );
    if ( d2 < 4900.0 ) {
      float win = 1.0 - d2 / 4900.0;
      wl.direction = L * inversesqrt( d2 );
      wl.color = uWLampCol[ i ] * ( win * win / ( d2 + 3.0 ) );
      RE_Direct( wl, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
    }
    vec3 sp = ( viewMatrix * vec4( uWLamp[ i ].x, 0.9, uWLamp[ i ].z, 1.0 ) ).xyz;
    vec3 S = sp - geometryPosition;
    float s2 = dot( S, S );
    if ( s2 < 484.0 ) {
      float w2 = 1.0 - s2 / 484.0;
      float nd = max( dot( geometryNormal, S * inversesqrt( s2 ) ), 0.0 ) * 0.85 + 0.15;
      reflectedLight.directDiffuse += uWSpillCol[ i ] * ( w2 * w2 * nd / ( s2 + 6.0 ) ) * BRDF_Lambert( material.diffuseColor );
    }
  }
#endif
  {
    PhysicalMaterial wm = material;
    wm.roughness = max( material.roughness, 0.42 );
    vec3 lp = ( viewMatrix * vec4( uWStage.xyz, 1.0 ) ).xyz;
    vec3 L = lp - geometryPosition;
    float d2 = dot( L, L );
    wl.direction = L * inversesqrt( d2 );
    // the stage wash is aimed at the front of the field: it falls off faster than a point source
    // (≈ 0.4 at 30 m, 0.1 at 90 m on top of 1/d²), so the floor stays dim red, not a lit tile hall
    wl.color = uWStageCol / ( d2 + uWStage.w ) * ( 1400.0 / ( 1400.0 + d2 ) );
    RE_Direct( wl, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, wm, reflectedLight );
    lp = ( viewMatrix * vec4( uWFlash.xyz, 1.0 ) ).xyz;
    L = lp - geometryPosition;
    d2 = dot( L, L );
    wl.direction = L * inversesqrt( d2 );
    wl.color = uWFlashCol / ( d2 + uWFlash.w );
    RE_Direct( wl, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, wm, reflectedLight );
    if ( dot( uWFlashCol2, vec3( 1.0 ) ) > 0.0 ) {
      lp = ( viewMatrix * vec4( uWFlash2.xyz, 1.0 ) ).xyz;
      L = lp - geometryPosition;
      d2 = dot( L, L );
      wl.direction = L * inversesqrt( d2 );
      wl.color = uWFlashCol2 / ( d2 + uWFlash2.w );
      RE_Direct( wl, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, wm, reflectedLight );
    }
    // lit smoke / haze overhead and the site glow: soft sky-weighted fill (no direction, no specular)
    vec3 upV = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
    float wlHemi = 0.55 + 0.45 * dot( geometryNormal, upV );
    vec3 ac = ( viewMatrix * vec4( uWAmbPos.xyz, 1.0 ) ).xyz - geometryPosition;
    vec3 gc = ( viewMatrix * vec4( 0.0, 10.0, 50.0, 1.0 ) ).xyz - geometryPosition;
    float wlAf = 1.0 / ( 1.0 + dot( ac, ac ) * uWAmbPos.w );
    vec3 wlAmb = uWAmbCol * ( wlAf * wlAf ) + uWGlowCol / ( 1.0 + dot( gc, gc ) * 4e-6 );
    reflectedLight.indirectDiffuse += wlAmb * wlHemi * BRDF_Lambert( material.diffuseColor );
  }
}
`;

export interface PatchOptions {
  /** include the 8 lantern + spill lights (skip for far/small objects) */
  lamps?: boolean;
  /** extra cache key (different custom code must have different keys) */
  key?: string;
  /** additional shader edits (called before the world-light injection) */
  edit?: (shader: THREE.WebGLProgramParametersWithUniforms) => void;
}

/** Inject the world lights into a MeshStandardMaterial (idempotent per material). */
export function patchWorldMaterial<T extends THREE.MeshStandardMaterial>(mat: T, opts: PatchOptions = {}): T {
  const lamps = opts.lamps !== false;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, worldUniforms);
    opts.edit?.(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${lamps ? '#define WL_LAMPS\n' : ''}${PARS}`)
      .replace('#include <aomap_fragment>', `${APPLY}\n#include <aomap_fragment>`);
  };
  const key = `world-${lamps ? 'l' : 'n'}-${opts.key ?? ''}`;
  mat.customProgramCacheKey = () => key;
  return mat;
}

// -------------------------------------------------------------------------------------------------
// exponential height fog (global: overrides three's fog chunks for every material with fog = true)

export interface HeightFogConfig {
  /** 1 / scale height (m⁻¹) */
  falloff: number;
  /** height of the densest layer (m) */
  base: number;
  /** direction of the twilight glow (sun below the NW horizon) */
  sunDir: THREE.Vector3;
  moonDir: THREE.Vector3;
  /** how much brighter the fog is towards the twilight / moon */
  twilightGain: number;
  moonGain: number;
}

const g = (v: THREE.Vector3) => `vec3( ${v.x.toFixed(5)}, ${v.y.toFixed(5)}, ${v.z.toFixed(5)} )`;

/**
 * Replace the fog chunks with an analytic exponential height fog + directional in-scatter tint.
 * Works for every built-in material and every ShaderMaterial that uses the standard fog includes
 * (needs `mvPosition` in the vertex shader, as three's own chunks already do).
 */
export function installHeightFog(c: HeightFogConfig): void {
  const S = THREE.ShaderChunk as unknown as Record<string, string>;
  S.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogWorld;
#endif
`;
  S.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogWorld = mvPosition.xyz * mat3( viewMatrix );
#endif
`;
  S.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
  vec3 worldFogTint( vec3 d ) {
    float tw = max( dot( d, ${g(c.sunDir)} ), 0.0 );
    float mo = max( dot( d, ${g(c.moonDir)} ), 0.0 );
    float low = 1.0 - clamp( abs( d.y ) * 3.0, 0.0, 1.0 );
    return fogColor * ( 1.0 + ${c.twilightGain.toFixed(3)} * tw * tw * tw * low + ${c.moonGain.toFixed(3)} * pow( mo, 24.0 ) );
  }
#endif
`;
  S.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogDist = length( vFogWorld );
    float fogT = ${c.falloff.toFixed(5)} * vFogWorld.y;
    float fogI = abs( fogT ) > 1e-3 ? ( 1.0 - exp( - fogT ) ) / fogT : 1.0 - 0.5 * fogT;
    float fogTau = fogDensity * exp( - ${c.falloff.toFixed(5)} * ( cameraPosition.y - ${c.base.toFixed(2)} ) ) * fogDist * fogI;
    float fogFactor = 1.0 - exp( - max( fogTau, 0.0 ) );
    vec3 fogCol = worldFogTint( vFogWorld / max( fogDist, 1e-3 ) );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
    vec3 fogCol = fogColor;
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogCol, fogFactor );
#endif
`;
}

/** GLSL (for custom shaders like the sky) replicating the fog tint + optical depth */
export function fogGlsl(c: HeightFogConfig): string {
  return /* glsl */ `
vec3 worldFogTintC( vec3 d, vec3 fc ) {
  float tw = max( dot( d, ${g(c.sunDir)} ), 0.0 );
  float mo = max( dot( d, ${g(c.moonDir)} ), 0.0 );
  float low = 1.0 - clamp( abs( d.y ) * 3.0, 0.0, 1.0 );
  return fc * ( 1.0 + ${c.twilightGain.toFixed(3)} * tw * tw * tw * low + ${c.moonGain.toFixed(3)} * pow( mo, 24.0 ) );
}
`;
}
