import * as THREE from 'three';
import { Rng } from '../core/rng';
import { GLSL_COMMON } from './core/glsl';

/**
 * Static haze field: large, soft, noise-textured sprites in three zones that drift deterministically
 * with the wind (pure function of show time, wrapping inside their zone with soft edges):
 *   0 = stage haze around the set, 1 = low haze layer over the field, 2 = high firework smoke band.
 * Density per zone comes from the fog cues + accumulated pyro/firework smoke; colour comes from the
 * LightEnv lighting bus, so the haze glows in the wash colour and flashes with every burst.
 */
export interface HazeZone {
  min: THREE.Vector3;
  max: THREE.Vector3;
  size: [number, number];
  /** vertical squash (1 = round) */
  aspect: number;
  count: number;
}

const VERT = /* glsl */ `
${GLSL_COMMON}
attribute vec3 aCenter;
attribute vec4 aPar; // size, seed, zone, phase
uniform vec4 uDensity;
uniform vec3 uZoneMin[3];
uniform vec3 uZoneSize[3];
uniform vec3 uZoneAspect;
uniform vec3 uZoneOcclusion;
uniform float uStageBoost;
varying vec2 vUv;
varying vec3 vLit;
varying float vAlpha;
varying vec3 vNoise;
varying float vOcc;
varying float vWorldY;

void main() {
  int zone = int(aPar.z + 0.5);
  vec3 zmin = uZoneMin[zone];
  vec3 zsz = uZoneSize[zone];
  float t = uTime;
  // drift with the wind, wrap inside the zone
  vec3 drift = uWind * t * (zone == 2 ? 1.6 : 1.0);
  vec3 c = aCenter + drift;
  vec3 u = fract((c - zmin) / zsz);
  c = zmin + u * zsz;
  c.y = aCenter.y + sin(t * 0.07 + aPar.w * 6.28) * 0.8;
  float edge = smoothstep(0.0, 0.14, u.x) * smoothstep(1.0, 0.86, u.x) * smoothstep(0.0, 0.14, u.z) * smoothstep(1.0, 0.86, u.z);

  float size = aPar.x * (1.0 + 0.08 * sin(t * 0.11 + aPar.w * 17.0));
  vec4 vp = viewMatrix * vec4(c, 1.0);
  float depth = -vp.z;
  float aspect = zone == 0 ? uZoneAspect.x : (zone == 1 ? uZoneAspect.y : uZoneAspect.z);
  vec2 off = position.xy * size * vec2(1.0, aspect);
  vp.xy += off;
  vWorldY = c.y + dot(viewMatrix[1].xy, off);
  gl_Position = projectionMatrix * vp;
  float nearF = smoothstep(size * 0.15, size * 0.9, depth);
  float dens = zone == 0 ? uDensity.x : (zone == 1 ? uDensity.y : uDensity.z);
  vAlpha = dens * edge * nearF * (0.7 + 0.6 * fract(aPar.w * 91.7));
  vec3 light = envLight(c);
  // the low field layer sits right next to the flame units: tame the flash term there
  vec3 df = c - uFlashPos;
  float flashF = 1.0 / (1.0 + dot(df, df) * (1.0 / 4900.0));
  if (zone == 1) light -= uFlashCol * flashF * 0.55 * 0.6;
  if (zone == 0) light += (min(uStageLight, vec3(2.0)) * 0.5 + uStageWash * 0.7) * uStageBoost;
  vLit = light * fogT(depth * 0.7);
  vOcc = zone == 0 ? uZoneOcclusion.x : (zone == 1 ? uZoneOcclusion.y : uZoneOcclusion.z);
  vUv = position.xy;
  vNoise = vec3(fract(aPar.w * 13.1) + t * 0.004, fract(aPar.w * 7.3) - t * 0.003, 0.55 + 0.4 * fract(aPar.w * 3.7));
}
`;

const FRAG = /* glsl */ `
${GLSL_COMMON}
uniform sampler2D uNoise;
varying vec2 vUv;
varying vec3 vLit;
varying float vAlpha;
varying vec3 vNoise;
varying float vOcc;
varying float vWorldY;
void main() {
  float d2 = dot(vUv, vUv);
  if (d2 > 1.0) discard;
  vec2 uv = vUv * vNoise.z + vNoise.xy;
  float n = texture(uNoise, uv).r;
  float n2 = texture(uNoise, uv * 2.1 + 0.37).g;
  float shape = smoothstep(1.0, 0.0, sqrt(d2) + (n - 0.5) * 0.7) * smoothstep(1.0, 0.7, sqrt(d2));
  float dens = shape * shape * (0.4 + 1.2 * n * n2);
  float a = clamp(vAlpha * dens, 0.0, 1.0) * smoothstep(-0.2, 1.2, vWorldY);
  // haze mostly scatters light in (additive); it only partly occludes what lies behind it
  gl_FragColor = vec4(vLit * a, a * vOcc);
}
`;

export class HazeField {
  readonly mesh: THREE.Mesh;
  readonly uniforms: Record<string, THREE.IUniform>;
  readonly count: number;

  constructor(shared: Record<string, THREE.IUniform>, zones: HazeZone[], seed = 77) {
    const rng = new Rng(seed);
    const n = zones.reduce((a, z) => a + z.count, 0);
    this.count = n;
    const centers = new Float32Array(n * 3);
    const pars = new Float32Array(n * 4);
    let i = 0;
    zones.forEach((z, zi) => {
      for (let k = 0; k < z.count; k++, i++) {
        centers[i * 3] = rng.range(z.min.x, z.max.x);
        centers[i * 3 + 1] = rng.range(z.min.y, z.max.y);
        centers[i * 3 + 2] = rng.range(z.min.z, z.max.z);
        pars[i * 4] = rng.range(z.size[0], z.size[1]);
        pars[i * 4 + 1] = rng.next();
        pars[i * 4 + 2] = zi;
        pars[i * 4 + 3] = rng.next();
      }
    });
    const base = new THREE.PlaneGeometry(2, 2);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.getAttribute('position'));
    geo.setAttribute('aCenter', new THREE.InstancedBufferAttribute(centers, 3));
    geo.setAttribute('aPar', new THREE.InstancedBufferAttribute(pars, 4));
    geo.instanceCount = n;
    const zmin = zones.map((z) => z.min.clone());
    const zsz = zones.map((z) => z.max.clone().sub(z.min));
    while (zmin.length < 3) {
      zmin.push(new THREE.Vector3());
      zsz.push(new THREE.Vector3(1, 1, 1));
    }
    this.uniforms = {
      ...shared,
      uDensity: { value: new THREE.Vector4(0.1, 0.05, 0, 0) },
      uZoneMin: { value: zmin },
      uZoneSize: { value: zsz },
      uZoneAspect: { value: new THREE.Vector3(zones[0]?.aspect ?? 1, zones[1]?.aspect ?? 1, zones[2]?.aspect ?? 1) },
      uZoneOcclusion: { value: new THREE.Vector3(0.55, 0.2, 0.6) },
      uStageBoost: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      name: 'fx-haze',
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.name = 'fx:haze';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
    this.mesh.matrixAutoUpdate = false;
  }

  setDensity(stage: number, field: number, sky: number): void {
    (this.uniforms.uDensity.value as THREE.Vector4).set(stage, field, sky, 0);
    this.mesh.visible = stage + field + sky > 0.002;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}
