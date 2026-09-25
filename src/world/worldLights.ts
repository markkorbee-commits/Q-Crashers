import * as THREE from 'three';
import type { LightEnv } from '../core/LightEnv';
import { LANTERN_Y, PILLARS } from './site';

/**
 * Cheap "global illumination" of the grounds by the show (research/technical-decisions §4):
 * instead of real three.js lights (which would cost every material in the scene), the world
 * materials (ground, pillars, fences, FOH, trees, props) get a handful of analytic lights injected
 * into MeshStandardMaterial via onBeforeCompile:
 *   - the 8 pillar lanterns (full GGX, so damp concrete shows the lantern reflections)
 *   - the pillar uplight spill at each plinth (diffuse)
 *   - the stage as one broad soft source (colour = app.env.stageColor × stageIntensity)
 *   - the current pyro / firework flash (app.env.flashColor at app.env.flashPos)
 * All materials share ONE uniform set, updated once per frame (after every show system ran).
 */

const N = PILLARS.length;

export const worldUniforms = {
  uWLamp: { value: PILLARS.map((p) => new THREE.Vector4(p.x, LANTERN_Y, p.z, 1)) },
  uWLampCol: { value: PILLARS.map(() => new THREE.Vector3()) },
  uWSpillCol: { value: PILLARS.map(() => new THREE.Vector3()) },
  uWStage: { value: new THREE.Vector4(0, 16, -12, 900) },
  uWStageCol: { value: new THREE.Vector3() },
  uWFlash: { value: new THREE.Vector4(0, 40, -20, 400) },
  uWFlashCol: { value: new THREE.Vector3() },
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
const FLASH_GAIN = 2600;

const tmp = new THREE.Color();

/**
 * Soft-knee compression of the accumulated flash energy (factor applied to env.flashColor, which is
 * pre-multiplied by intensity): single bursts (≈1–5) pass almost linearly, a dense finale saturates
 * around 18 instead of blowing the whole world out.
 */
export function flashCompression(total: number): number {
  if (!(total > 0)) return 0;
  const K = 18;
  return (K * (1 - Math.exp(-total / K))) / total;
}

/** chase multiplier for pillar i from app.env (empty array = all 1) */
export function pillarChase(env: LightEnv, i: number): number {
  const c = env.pillarChase;
  if (!c || c.length === 0) return 1;
  const v = c[i];
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 1;
}

/** write this frame's show light state into the shared uniforms (call after all emitters ran) */
export function updateWorldLights(env: LightEnv, time: number): void {
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
  const fl = FLASH_GAIN * flashCompression(env.flashIntensity);
  u.uWFlashCol.value.set(env.flashColor.r * fl, env.flashColor.g * fl, env.flashColor.b * fl);
  u.uWFlash.value.set(env.flashPos.x, env.flashPos.y, env.flashPos.z, 400);
}

const PARS = /* glsl */ `
uniform vec4 uWLamp[${N}];
uniform vec3 uWLampCol[${N}];
uniform vec3 uWSpillCol[${N}];
uniform vec4 uWStage;
uniform vec3 uWStageCol;
uniform vec4 uWFlash;
uniform vec3 uWFlashCol;
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
    wl.color = uWStageCol / ( d2 + uWStage.w );
    RE_Direct( wl, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, wm, reflectedLight );
    lp = ( viewMatrix * vec4( uWFlash.xyz, 1.0 ) ).xyz;
    L = lp - geometryPosition;
    d2 = dot( L, L );
    wl.direction = L * inversesqrt( d2 );
    wl.color = uWFlashCol / ( d2 + uWFlash.w );
    RE_Direct( wl, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, wm, reflectedLight );
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
