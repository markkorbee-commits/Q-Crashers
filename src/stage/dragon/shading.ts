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
  uEyes: THREE.IUniform<THREE.Color>;
  uMouth: THREE.IUniform<number>;
  uRosette: THREE.IUniform<THREE.Color>;
  uPixel: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  uFlashV: THREE.IUniform<number>;
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
    uEyes: { value: new THREE.Color('#ff5a00') },
    uMouth: { value: 0.2 },
    uRosette: { value: new THREE.Color('#8a2cff') },
    uPixel: { value: 0.001 },
    uTime: { value: 0 },
    uFlashV: { value: 0 },
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
float crownHash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
// u: metres along the strip, grp: 0 primary / 1 accent, side: -1 left / +1 right, seed: per strip
vec3 crownLed(float u, float grp, float side, float seed) {
  vec3 base = grp > 0.5 ? uLed2 : uLed;
  float b = 1.0;
  int p = int(uPattern + 0.5);
  if (p == 1) {
    // chase: comets running outwards along every strip (one wavelength per phase unit)
    float x = fract(u / 7.0 - uPhase + seed * 0.37);
    float head = pow(1.0 - x, 4.0);
    b = 0.06 + 1.1 * head;
    base = mix(uLed2 * 0.5, uLed, clamp(head * 1.6, 0.0, 1.0));
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
    base = side < 0.0 ? uLed : uLed2;
    b = 0.85 + 0.15 * sin(u * 0.9 - uPhase * 6.2831);
  }
  b *= 1.0 + 1.4 * uPulse;
  return base * b * uLedI + vec3(uPulse * uLedI * 0.25);
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
varying vec3 vCrownPos;
varying float vCrownFx;
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
  float xs = clamp(vCrownPos.x / 30.0, -1.0, 1.0);
  crownLight(vec3(-0.45, -0.35, 0.82), uWashA * hFade * (1.0 - 0.35 * xs), geometryNormal, geometryViewDir, material, reflectedLight, 0.0);
  crownLight(vec3(0.45, -0.3, 0.84), uWashB * hFade * (1.0 + 0.35 * xs), geometryNormal, geometryViewDir, material, reflectedLight, 0.0);
  crownLight(vec3(0.1, 0.42, 0.9), uKey, geometryNormal, geometryViewDir, material, reflectedLight, 0.0);
  crownLight(vec3(0.0, 0.55, -0.83), uRim, geometryNormal, geometryViewDir, material, reflectedLight, 0.0);
  crownLight(vec3(0.15, 0.75, 0.45), uFlash, geometryNormal, geometryViewDir, material, reflectedLight, 0.3);
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

export interface PatchOpts {
  /** cache key suffix */
  key: string;
  /** add emissive lava cracks driven by the emissive map * uLava (fx channel gates it) */
  lava?: boolean;
  /** emissive pixel-canvas stripes (wing membranes) */
  membrane?: boolean;
  /** use the vertex fx channel to add LED-coloured emissive (edge lights on plates) */
  fxLed?: boolean;
}

/** Inject the virtual wash rig (+ optional effects) into a MeshStandardMaterial. */
export function patchStandard(mat: THREE.MeshStandardMaterial, U: CrownUniforms, o: PatchOpts): THREE.MeshStandardMaterial {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vCrownPos;
varying float vCrownFx;
attribute float fx;
${o.membrane ? 'attribute vec3 memb; varying vec3 vMemb;' : ''}`,
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
    fs = fs.replace(
      '#include <lights_physical_pars_fragment>',
      `#include <lights_physical_pars_fragment>
${WASH_PARS}
${o.membrane || o.fxLed ? LED_GLSL + 'uniform float uWings;' : ''}
${o.membrane ? 'varying vec3 vMemb;' : ''}`,
    );
    fs = fs.replace('#include <lights_fragment_begin>', `#include <lights_fragment_begin>\n${WASH_APPLY}`);
    fs = fs.replace(
      '#include <lights_fragment_maps>',
      `#include <lights_fragment_maps>
#if defined( RE_IndirectSpecular )
radiance *= uEnvTint;
#endif
iblIrradiance *= uEnvTint;`,
    );
    let emissive = '';
    if (o.lava) {
      emissive += `
{
  #ifdef USE_EMISSIVEMAP
  float crack = texture2D(emissiveMap, vEmissiveMapUv).r;
  totalEmissiveRadiance += uLava * crack * crack * 1.1 * step(0.5, vCrownFx);
  #endif
}`;
    }
    if (o.membrane) {
      // vMemb.x: across-panel coordinate 0..1, vMemb.y: metres from the wrist, vMemb.z: side(-1/1)*(panel+1)
      emissive += `
{
  float lanes = 6.0;
  float a = vMemb.x * lanes;
  float lane = floor(a);
  float fa = fract(a) - 0.5;
  float wA = fwidth(a) * 1.2 + 0.02;
  float line = 1.0 - smoothstep(0.035, 0.035 + wA, abs(fa));
  // dashes along the rib (0.7 m on, 0.45 m off)
  float d = vMemb.y / 1.15 + lane * 0.37;
  float fd = fract(d);
  float wD = fwidth(d) * 1.2;
  float dash = smoothstep(0.0, wD + 0.01, fd) * (1.0 - smoothstep(0.62 - wD, 0.62 + wD, fd));
  dash = mix(dash, 0.62, clamp(wD * 1.5, 0.0, 1.0));
  float inside = step(0.5, lane) * step(lane, lanes - 1.5);
  float side = sign(vMemb.z);
  vec3 lc = crownLed(vMemb.y + lane * 0.8, 0.0, side, abs(vMemb.z) + lane);
  // pixel canvas fades out towards the wrist
  float grow = smoothstep(1.5, 5.0, vMemb.y);
  totalEmissiveRadiance += lc * line * dash * inside * grow * uWings * 2.2;
  // the printed skin is flooded by its own warm uplights (follows the wing glow level)
  totalEmissiveRadiance += diffuseColor.rgb * (0.04 + 0.85 * uWings) * mix(1.0, 0.72, smoothstep(3.0, 18.0, vMemb.y));
}`;
    }
    if (o.fxLed) {
      emissive += `
{
  float e = smoothstep(0.5, 1.0, vCrownFx);
  if (e > 0.0) totalEmissiveRadiance += crownLed(vCrownPos.y * 1.3 + abs(vCrownPos.x) * 0.4, 0.0, sign(vCrownPos.x), 3.0) * e * uWings * 3.0;
}`;
    }
    if (emissive) fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${emissive}`);
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => 'crown-' + o.key;
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
uniform float uPixel;
varying float vU;
varying float vAcross;
varying float vFade;
varying vec3 vInfo;
void main() {
  vec4 mvA = modelViewMatrix * vec4(iA, 1.0);
  vec4 mvB = modelViewMatrix * vec4(iB, 1.0);
  vec4 mv = mix(mvA, mvB, corner.x);
  vec3 d = mvB.xyz - mvA.xyz;
  float dl = max(length(d), 1e-4);
  vec3 dir = d / dl;
  vec3 toCam = normalize(-mv.xyz);
  vec3 side = cross(dir, toCam);
  float sl = length(side);
  side = sl > 1e-4 ? side / sl : vec3(1.0, 0.0, 0.0);
  float px = max(-mv.z, 0.1) * uPixel;
  float w = max(iInfo.w, 1.6 * px);
  vFade = clamp(iInfo.w / w, 0.18, 1.0);
  mv.xyz += side * corner.y * 0.5 * w;
  mv.xyz += dir * (corner.x * 2.0 - 1.0) * 0.35 * w;
  gl_Position = projectionMatrix * mv;
  vU = mix(iU.x, iU.y, corner.x);
  vAcross = corner.y;
  vInfo = iInfo.xyz;
}`,
    fragmentShader: /* glsl */ `
${LED_GLSL}
varying float vU;
varying float vAcross;
varying float vFade;
varying vec3 vInfo;
void main() {
  float a = 1.0 - abs(vAcross);
  float core = smoothstep(0.0, 0.7, a);
  // individual pixels when close, continuous line when far
  float pu = vU * 8.0;
  float fw = fwidth(pu);
  float dots = mix(0.35 + 0.65 * smoothstep(0.42, 0.18, abs(fract(pu) - 0.5)), 1.0, clamp(fw * 1.5, 0.0, 1.0));
  vec3 c = crownLed(vU, vInfo.x, vInfo.y, vInfo.z);
  gl_FragColor = vec4(c * core * dots * vFade * 2.4, 1.0);
}`,
  });
}

export interface StripBuild {
  a: number[];
  b: number[];
  u: number[];
  info: number[];
}

export class Strips {
  private d: StripBuild = { a: [], b: [], u: [], info: [] };
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
      u += l;
      this.segments++;
    }
    return u;
  }
  build(mat: THREE.Material): THREE.Mesh {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('corner', new THREE.BufferAttribute(new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), 2));
    g.setIndex([0, 1, 2, 2, 1, 3]);
    g.setAttribute('iA', new THREE.InstancedBufferAttribute(new Float32Array(this.d.a), 3));
    g.setAttribute('iB', new THREE.InstancedBufferAttribute(new Float32Array(this.d.b), 3));
    g.setAttribute('iU', new THREE.InstancedBufferAttribute(new Float32Array(this.d.u), 2));
    g.setAttribute('iInfo', new THREE.InstancedBufferAttribute(new Float32Array(this.d.info), 4));
    g.instanceCount = this.segments;
    // bounds from all points
    const box = new THREE.Box3();
    const p = new THREE.Vector3();
    for (let i = 0; i < this.d.a.length; i += 3) {
      box.expandByPoint(p.set(this.d.a[i], this.d.a[i + 1], this.d.a[i + 2]));
      box.expandByPoint(p.set(this.d.b[i], this.d.b[i + 1], this.d.b[i + 2]));
    }
    g.boundingBox = box;
    g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = true;
    m.renderOrder = 2;
    this.d = { a: [], b: [], u: [], info: [] };
    return m;
  }
}

// ---------------------------------------------------------------------------------------------
// Bulbs: instanced billboards (pixel dots, eye clusters, mouth ring) with a minimum pixel size
// ---------------------------------------------------------------------------------------------

/** bulb types */
export const BULB = { led: 0, accent: 1, eye: 2, mouth: 3, rider: 4, warm: 5 } as const;

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
uniform float uPixel;
varying vec2 vC;
varying vec4 vInfo;
varying float vFade;
void main() {
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float px = max(-mv.z, 0.1) * uPixel;
  float s = max(iInfo.z, 2.2 * px);
  vFade = clamp(pow(iInfo.z / s, 1.2), 0.06, 1.0);
  mv.xy += corner * s * 1.6;
  gl_Position = projectionMatrix * mv;
  vC = corner;
  vInfo = iInfo;
}`,
    fragmentShader: /* glsl */ `
${LED_GLSL}
uniform vec3 uEyes;
uniform float uMouth;
uniform float uTime;
varying vec2 vC;
varying vec4 vInfo;
varying float vFade;
void main() {
  float r2 = dot(vC, vC) * 2.56;
  float core = exp(-r2 * 7.0);
  float halo = exp(-r2 * 1.6) * 0.07;
  float m = core + halo;
  if (m < 0.004) discard;
  int t = int(vInfo.x + 0.5);
  vec3 c;
  if (t == 0 || t == 1) c = crownLed(vInfo.y, float(t), sign(vInfo.w - 0.5), vInfo.w) * 1.4;
  else if (t == 2) c = uEyes * 3.0;
  else if (t == 3) {
    // mouth bulbs: warm white ring, chasing slowly, brighter with the mouth glow
    vec3 led = crownLed(vInfo.y, 0.0, 1.0, 0.5);
    c = mix(vec3(1.0, 0.86, 0.7) * (0.25 + 0.75 * uLedI) , led, 0.25) * (0.35 + 0.7 * uMouth) * 1.1;
  } else if (t == 4) c = vec3(1.0, 0.96, 0.92) * (0.35 + 1.2 * min(1.0, dot(uEyes, vec3(0.3, 0.5, 0.2)) * 1.5)) + uEyes * 0.3;
  else c = vec3(1.0, 0.7, 0.4) * (0.3 + uLedI);
  gl_FragColor = vec4(c * m * vFade * 2.4, 1.0);
}`,
  });
}

export class Bulbs {
  private pos: number[] = [];
  private info: number[] = [];
  count = 0;
  add(p: THREE.Vector3, type: number, u = 0, size = 0.12, seed = Math.random()): void {
    this.pos.push(p.x, p.y, p.z);
    this.info.push(type, u, size, seed);
    this.count++;
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
    m.renderOrder = 3;
    this.pos = [];
    this.info = [];
    return m;
  }
}

// ---------------------------------------------------------------------------------------------
// Emissive rosette hub (instanced, rotates with the gear) and the throat glow
// ---------------------------------------------------------------------------------------------

export function createRosetteGlowMaterial(U: CrownUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
varying vec2 vP;
varying float vSeed;
void main() {
  vP = position.xy;
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
uniform vec3 uRosette;
uniform float uWings;
varying vec2 vP;
varying float vSeed;
void main() {
  float r = length(vP);
  float a = atan(vP.y, vP.x);
  float R = 2.25;
  float fr = fwidth(r);
  // central star (8 points) + 16 spokes + rim ring
  float star = smoothstep(0.62 + fr, 0.62 - fr, r / (0.55 + 0.35 * pow(abs(cos(a * 4.0)), 6.0)));
  float spokes = pow(abs(cos(a * 8.0)), 60.0) * smoothstep(0.35, 0.6, r) * smoothstep(R * 0.93, R * 0.8, r);
  float sa = fwidth(a * 8.0);
  spokes = mix(spokes, 0.06, clamp(sa * 0.8, 0.0, 1.0));
  float rim = smoothstep(0.09 + fr, 0.0, abs(r - R * 0.86));
  float glow = exp(-r * 1.7) * 0.6;
  vec3 led = crownLed(r * 2.0 + vSeed * 0.1, 1.0, sign(vSeed), 0.3);
  float lv = max(uLedI, 0.2);
  vec3 c = uRosette * (star * 2.2 + glow) * (0.35 + 0.9 * uWings) + (uRosette * 0.5 + led * 0.6) * spokes * 1.5 * lv + led * rim * 0.9;
  gl_FragColor = vec4(c * 1.5, 1.0);
}`,
  });
}

export function createThroatMaterial(U: CrownUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: U,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
uniform vec3 uMouthCol;
uniform float uMouth;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  vec3 deep = vec3(0.12, 0.3, 1.0) * (0.5 + 1.5 * uMouth);
  vec3 c = mix(deep, uMouthCol * 0.05 + vec3(0.08, 0.01, 0.02), smoothstep(0.05, 0.8, r));
  c *= (1.0 - smoothstep(0.85, 1.0, r) * 0.7);
  gl_FragColor = vec4(c, 1.0);
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
