import * as THREE from 'three';
import { terrainHeight } from '../../world/site';
import { GLSL_COMMON } from './glsl';

/**
 * Additive light of the burning pyro on the grounds: a terrain-conforming sheet (a few cm above the
 * floor, banks included) whose fragment shader sums the pyro light field (FxLights) — the field in
 * front of a flame wall glows orange, a gold gerb row lays a gold carpet towards the pillars, the
 * red-smoke finale tints the whole bowl. The world materials only see LightEnv's single flash
 * centroid; this layer carries the spatial part. One draw call, ~6k triangles, and it is hidden
 * while no pyro light is alive.
 */
const VERT = /* glsl */ `
${GLSL_COMMON}
varying vec3 vW;
varying float vDepth;
void main() {
  vW = position;
  vec4 vp = viewMatrix * vec4(position, 1.0);
  vDepth = -vp.z;
  gl_Position = projectionMatrix * vp;
}
`;

const FRAG = /* glsl */ `
${GLSL_COMMON}
uniform sampler2D uNoise;
uniform float uFieldGain;
uniform float uFieldReach;
varying vec3 vW;
varying float vDepth;
void main() {
  vec3 E = vec3(0.0);
  for (int i = 0; i < FX_MAX_LIGHTS; i++) {
    if (i >= uFxLN) break;
    vec3 a = uFxLA[i].xyz;
    vec3 b = uFxLB[i].xyz;
    float r = uFxLA[i].w * uFieldReach;
    vec3 ab = b - a;
    float t = clamp(dot(vW - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    vec3 d = a + ab * t - vW;
    float d2 = dot(d, d);
    // light from above reaches the floor; a source at floor level only grazes it (cosine term)
    float cosT = clamp((d.y + 2.0) * inversesqrt(d2 + 4.0), 0.12, 1.0);
    E += uFxLC[i].rgb * (r * r / (d2 + r * r)) * (0.35 + 0.65 * cosT);
  }
  E = E * uFieldGain + uFxGlow * 0.06;
  // ground albedo: the paved field (light concrete, bright under fire) vs the parched grass banks
  // (darker, olive), with patchy variation so the light reads as lying on a surface
  float n1 = texture(uNoise, vW.xz * 0.013).r;
  float n2 = texture(uNoise, vW.xz * 0.09 + 0.31).g;
  float n3 = texture(uNoise, vW.xz * 0.4 + 0.7).b;
  float paved = (1.0 - smoothstep(42.0, 47.0, abs(vW.x))) * smoothstep(-3.0, 0.0, vW.z) * (1.0 - smoothstep(134.0, 140.0, vW.z));
  vec3 alb = mix(vec3(0.46, 0.45, 0.36), vec3(0.95, 0.9, 0.84), paved);
  alb *= (0.3 + 1.3 * n1 * (0.5 + 1.0 * n2)) * (0.7 + 0.6 * n3);
  // the sheet fades out before its border (no visible edge on the banks)
  float edge = (1.0 - smoothstep(105.0, 130.0, abs(vW.x))) * (1.0 - smoothstep(150.0, 168.0, vW.z));
  vec3 c = kneeC(E, 0.45, 0.3) * alb * edge * fogT(vDepth);
  gl_FragColor = vec4(c, 0.0);
}
`;

export class FieldLight {
  readonly mesh: THREE.Mesh;
  readonly uniforms: Record<string, THREE.IUniform>;

  constructor(shared: Record<string, THREE.IUniform>, mobile: boolean) {
    const step = mobile ? 8 : 4;
    const x0 = -132,
      x1 = 132,
      z0 = -6,
      z1 = 170;
    const nx = Math.round((x1 - x0) / step) + 1;
    const nz = Math.round((z1 - z0) / step) + 1;
    const pos = new Float32Array(nx * nz * 3);
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const x = x0 + ((x1 - x0) * i) / (nx - 1);
        const z = z0 + ((z1 - z0) * j) / (nz - 1);
        const k = (j * nx + i) * 3;
        pos[k] = x;
        pos[k + 1] = terrainHeight(x, z) + 0.3;
        pos[k + 2] = z;
      }
    const idx: number[] = [];
    for (let j = 0; j + 1 < nz; j++)
      for (let i = 0; i + 1 < nx; i++) {
        const a = j * nx + i,
          b = a + 1,
          c = a + nx,
          d = c + 1;
        // wound so the face points up (seen from above)
        idx.push(a, c, b, b, c, d);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    this.uniforms = { ...shared, uFieldGain: { value: 0.2 }, uFieldReach: { value: 1.0 } };
    const mat = new THREE.ShaderMaterial({
      name: 'fx-fieldlight',
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.name = 'fx:fieldlight';
    this.mesh.frustumCulled = false;
    // before the haze (10) and all smoke: the floor is lit first, the smoke in front veils it
    this.mesh.renderOrder = 9;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}
