import * as THREE from 'three';

/**
 * Shared per-frame uniforms for the set materials. The MainStage resolves the StageLook into these
 * once per frame; every patched material references the SAME uniform objects (no per-material work).
 *
 * "Virtual floods": a real stage washes the castle with hundreds of IP65 floods standing on the deck.
 * Instead of real lights we evaluate an analytic flood field in the fragment shader: floods every 6 m
 * along the deck (alternating colour sets A/B) shining up the facade, plus a front wash from the FOH,
 * a cold top/back light and the pyro/firework flash. The result is multiplied by the surface albedo,
 * so the stone print, mortar and relief read under coloured light exactly like a lit set.
 */
export interface StageUniforms {
  uFloodA: THREE.IUniform<THREE.Color>;
  uFloodB: THREE.IUniform<THREE.Color>;
  uFront: THREE.IUniform<THREE.Color>;
  uBack: THREE.IUniform<THREE.Color>;
  uFlash: THREE.IUniform<THREE.Color>;
  uFlashPos: THREE.IUniform<THREE.Vector3>;
  uEnvTint: THREE.IUniform<THREE.Color>;
  /** decor glow weights per aGroup: x banners, y skull eyes, z emblem/portal, w misc */
  uGlow: THREE.IUniform<THREE.Vector4>;
  /**
   * region isolation of the floods + decor glow: x castle-core level, y side-section level,
   * z castle flood tint weight, w side flood tint weight (the tint colours below replace the wash hue)
   */
  uRegionF: THREE.IUniform<THREE.Vector4>;
  uFloodTintC: THREE.IUniform<THREE.Color>;
  uFloodTintS: THREE.IUniform<THREE.Color>;
}

export function createStageUniforms(): StageUniforms {
  return {
    uFloodA: { value: new THREE.Color(0.3, 0.05, 0.05) },
    uFloodB: { value: new THREE.Color(0.1, 0.1, 0.4) },
    uFront: { value: new THREE.Color(0.05, 0.05, 0.08) },
    uBack: { value: new THREE.Color(0.02, 0.03, 0.06) },
    uFlash: { value: new THREE.Color(0, 0, 0) },
    uFlashPos: { value: new THREE.Vector3(0, 20, -10) },
    uEnvTint: { value: new THREE.Color(1, 1, 1) },
    uGlow: { value: new THREE.Vector4(1, 1, 1, 1) },
    uRegionF: { value: new THREE.Vector4(1, 1, 0, 0) },
    uFloodTintC: { value: new THREE.Color(1, 1, 1) },
    uFloodTintS: { value: new THREE.Color(1, 1, 1) },
  };
}

const FLOOD_GLSL = /* glsl */ `
uniform vec3 uFloodA;
uniform vec3 uFloodB;
uniform vec3 uFront;
uniform vec3 uBack;
uniform vec3 uFlash;
uniform vec3 uFlashPos;
uniform vec3 uEnvTint;
uniform vec4 uRegionF;
uniform vec3 uFloodTintC;
uniform vec3 uFloodTintS;
varying vec3 vStageWP;
float stageSideW(vec3 wp) { return smoothstep(37.3, 38.3, abs(wp.x)); }
float stageRegion(vec3 wp) { return mix(uRegionF.x, uRegionF.y, stageSideW(wp)); }
// cheap contact occlusion where vertical faces meet the deck (1.9) / upper platform (5.5) / ground
float stageAO(vec3 wp) {
  vec3 gn = normalize(cross(dFdx(wp), dFdy(wp)));
  float vert = 1.0 - abs(gn.y);
  float d = min(min(abs(wp.y - 1.9), abs(wp.y - 5.5)), abs(wp.y));
  return mix(1.0, mix(0.45, 1.0, smoothstep(0.0, 1.1, d)), vert);
}
vec3 stageFlood(vec3 wp, vec3 n) {
  float h = wp.y - 1.9;
  float hp = max(h, 0.0);
  float cell = 6.0;
  float fi = floor(wp.x / cell);
  vec3 acc = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float idx = fi + float(k);
    float dx = wp.x - idx * cell;
    float w = 0.45 + 0.3 * hp;
    float beam = exp(-dx * dx / (w * w));
    float prof = smoothstep(-0.4, 0.6, h) * (1.25 / (1.0 + 0.12 * hp) + 0.12);
    vec3 L = normalize(vec3(-dx * 0.6, -hp - 0.3, 5.0));
    float lam = max(dot(n, L), 0.0);
    vec3 c = mod(idx, 2.0) < 0.5 ? uFloodA : uFloodB;
    acc += c * (beam * prof * lam);
  }
  // the side sections / arms get a lower flood density than the castle
  acc *= mix(1.0, 0.4, smoothstep(37.0, 50.0, abs(wp.x)));
  // region isolation: a castle / side colour override re-tints the floods (same brightness), the
  // region levels dim them (castle: 0 leaves the castle dark while the crown keeps its own wash)
  float sw = stageSideW(wp);
  float tw = mix(uRegionF.z, uRegionF.w, sw);
  acc = mix(acc, mix(uFloodTintC, uFloodTintS, sw) * dot(acc, vec3(0.3, 0.59, 0.11)) * 1.4, tw);
  // level 1 = the dark default set; 2 = a fully flood-lit castle (~2.8x)
  float rg = mix(uRegionF.x, uRegionF.y, sw);
  acc *= rg <= 1.0 ? 0.06 + 0.94 * rg : pow(rg, 1.5);
  acc += uFront * max(dot(n, vec3(0.0, 0.2425, 0.9701)), 0.0) * min(0.3 + 0.7 * rg, 1.3);
  acc += uBack * max(dot(n, vec3(0.0, 0.9285, -0.3714)), 0.0);
  vec3 fd = uFlashPos - wp;
  float fl = length(fd);
  acc += uFlash * max(dot(n, fd / max(fl, 1e-3)), 0.0) / (1.0 + fl * fl * 0.0012);
  return acc;
}
`;

export interface PatchOpts {
  /** decor material: emissive is weighted per aGroup by uGlow */
  glowGroups?: boolean;
  /** strength of the virtual flood field on this material */
  flood?: number;
}

/** Patch a MeshStandardMaterial/MeshPhysicalMaterial with the stage flood field + env tint. */
export function patchStageShading(mat: THREE.MeshStandardMaterial, u: StageUniforms, o: PatchOpts = {}): void {
  const flood = (o.flood ?? 1).toFixed(3);
  const key = `stage-shading-${o.glowGroups ? 'g' : ''}-${flood}`;
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vStageWP;
${o.glowGroups ? 'attribute float aGroup;\nvarying float vGroup;' : ''}`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
{
  vec4 swp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    swp = instanceMatrix * swp;
  #endif
  vStageWP = (modelMatrix * swp).xyz;
}
${o.glowGroups ? 'vGroup = aGroup;' : ''}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
${FLOOD_GLSL}
${o.glowGroups ? 'uniform vec4 uGlow;\nvarying float vGroup;' : ''}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
diffuseColor.rgb *= stageAO(vStageWP);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
${
  o.glowGroups
    ? `{
  float gw = vGroup < 0.5 ? uGlow.w : (vGroup < 1.5 ? uGlow.x : (vGroup < 2.5 ? uGlow.y : uGlow.z));
  totalEmissiveRadiance *= gw * stageRegion(vStageWP);
}`
    : ''
}`,
      )
      .replace(
        '#include <lights_fragment_maps>',
        `#include <lights_fragment_maps>
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
  radiance *= uEnvTint;
#endif
#if defined( RE_IndirectDiffuse )
  iblIrradiance *= uEnvTint;
#endif`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
reflectedLight.directDiffuse += material.diffuseColor * stageFlood(vStageWP, inverseTransformDirection(normal, viewMatrix)) * ${flood};`,
      );
  };
}

/**
 * Procedural night environment for metal reflections: deep blue-hour dome, a violet horizon glow,
 * a dark ground and a scatter of hot "fixture" spots. Pre-filtered with PMREM once at load.
 * Its tint follows the show through `uEnvTint` (patched shading).
 */
export function makeNightEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      float spot(vec3 d, vec3 c, float size) {
        float k = max(dot(d, normalize(c)), 0.0);
        return pow(k, size);
      }
      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 top = vec3(0.012, 0.03, 0.09);
        vec3 hor = vec3(0.16, 0.1, 0.26);
        vec3 gnd = vec3(0.012, 0.01, 0.014);
        vec3 c = y > 0.0 ? mix(hor, top, pow(clamp(y, 0.0, 1.0), 0.45)) : mix(hor * 0.35, gnd, clamp(-y * 4.0, 0.0, 1.0));
        // warm twilight band behind the audience (+Z) and cool behind the stage (-Z)
        c += vec3(0.25, 0.12, 0.06) * pow(max(d.z, 0.0), 3.0) * exp(-abs(y) * 9.0);
        // hot fixture spots (front truss, delay towers, field)
        c += vec3(6.0) * spot(d, vec3(0.0, 0.25, 1.0), 900.0);
        c += vec3(4.0) * spot(d, vec3(0.5, 0.15, 1.0), 1400.0);
        c += vec3(4.0) * spot(d, vec3(-0.5, 0.15, 1.0), 1400.0);
        c += vec3(3.0) * spot(d, vec3(0.9, 0.35, 0.3), 1200.0);
        c += vec3(3.0) * spot(d, vec3(-0.9, 0.35, 0.3), 1200.0);
        c += vec3(2.5) * spot(d, vec3(0.0, 1.0, 0.2), 300.0);
        c += vec3(2.0) * spot(d, vec3(0.3, 0.6, -1.0), 600.0);
        c += vec3(2.0) * spot(d, vec3(-0.3, 0.6, -1.0), 600.0);
        // strip light low on the horizon (deck lip / front line)
        c += vec3(0.8) * exp(-abs(y - 0.02) * 60.0) * smoothstep(0.1, 0.8, d.z);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(geo, mat));
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0, 0.1, 100);
  pm.dispose();
  geo.dispose();
  mat.dispose();
  return rt.texture;
}
