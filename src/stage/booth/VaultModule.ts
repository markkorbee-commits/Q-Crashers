import * as THREE from 'three';
import type { FrameContext } from '../../core/types';
import type { StageKit } from '../kit';
import { GeoBucket } from '../lib/GeoBucket';
import { patchStageShading } from '../materials/StageShading';
import type { StageMaterials } from '../materials/StageMaterials';
import type { StageLookEx } from '../StageLook';
import { BoothBuilder, ScreenQuads } from './Booth';
import { makeBoothAtlas } from './boothAtlas';
import { BOOTH, VAULT, vaultCeiling } from './layout';
import { VaultBuilder } from './Vault';

/** practical light sources in the vault: 5 crown bulbs, the booth screens, the front panel, the deep glow */
const NP = 8;
const WARM = new THREE.Color('#ffb060');
const SCREEN = new THREE.Color('#8fb6ff');
const PANEL = new THREE.Color('#ff5a2a');

const PRACTICAL_GLSL = /* glsl */ `
uniform vec3 uVP[${NP}];
uniform vec3 uVC[${NP}];
vec3 vaultPractical(vec3 wp, vec3 n) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < ${NP}; i++) {
    vec3 d = uVP[i] - wp;
    float l2 = max(dot(d, d), 1e-4);
    float ndl = dot(n, d) * inversesqrt(l2);
    acc += uVC[i] * clamp(ndl * 0.8 + 0.2, 0.0, 1.0) / (1.0 + l2 * 1.4);
  }
  return acc;
}
`;

const SCREEN_VERT = /* glsl */ `
attribute vec2 aL;
attribute vec4 aK;
attribute vec4 aR;
varying vec2 vL;
varying vec4 vK;
varying vec4 vR;
#include <common>
#include <fog_pars_vertex>
void main() {
  vL = aL;
  vK = aK;
  vR = aR;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const SCREEN_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uTime;
uniform float uBeat;
uniform float uLevel;
uniform float uPanel;
uniform vec3 uStrip;
varying vec2 vL;
varying vec4 vK;
varying vec4 vR;
#include <common>
#include <fog_pars_fragment>
float h11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float vn(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h11(i), h11(i + 1.0), f); }
vec3 tex(vec2 l) { return texture2D(uAtlas, vR.xy + clamp(l, 0.004, 0.996) * vR.zw).rgb; }
// a zoomed RGB waveform lane: 4 beats across, the playhead in the middle; beat-locked for playing decks
vec3 wave(float x, float y, float beat, float seed) {
  float b = beat + (x - 0.5) * 4.0;
  float kickE = exp(-fract(b) * 6.0);
  float hat = vn(b * 8.0 + seed * 13.0) * 0.45 * (0.6 + 0.4 * step(0.5, fract(b * 2.0 + 0.25)));
  float bass = 0.25 + 0.7 * kickE;
  float amp = max(bass, hat);
  float ay = abs(y);
  vec3 c = vec3(0.0);
  c += vec3(1.0, 0.35, 0.08) * step(ay, bass) * 1.1;
  c = mix(c, vec3(0.25, 0.55, 1.0) * 1.2, step(ay, hat) * (1.0 - step(ay, bass * 0.55)) * 0.8);
  c += vec3(1.0) * step(ay, bass * 0.35) * 0.35;
  // beat grid + the playhead
  c += vec3(0.5) * (1.0 - smoothstep(0.0, 0.012, fract(b))) * 0.6;
  c = mix(c, vec3(1.0, 0.15, 0.1) * 2.0, 1.0 - smoothstep(0.0, 0.006, abs(x - 0.5)));
  return c;
}
void main() {
  float k = vK.x;
  float sd = vK.y;
  float kick = exp(-fract(uBeat) * 7.0);
  vec2 l = vL;
  vec3 col = vec3(0.0);
  float lvl = uLevel;
  // decks 1-2 play (beat-locked to the show), decks 3-4 are cued and paused
  bool playing = sd < 1.5;
  float deckBeat = playing ? uBeat + sd * 0.5 : 37.0 + sd * 11.0;
  if (k < 0.5) {
    col = tex(l);
  } else if (k < 1.5) {
    col = tex(l);
    if (l.y > 0.25 && l.y < 0.64) col = max(col, wave(l.x, (l.y - 0.445) / 0.195, deckBeat, sd));
  } else if (k < 2.5) {
    vec2 d = l - 0.5;
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    col = tex(l) * 0.9;
    float a = atan(d.y, d.x);
    float rot = deckBeat * 1.396;
    float da = abs(mod(a - rot + PI, 2.0 * PI) - PI);
    float ring = step(0.74, r) * step(r, 0.97);
    col += vec3(1.0, 0.92, 0.85) * ring * (0.12 + 1.6 * (1.0 - smoothstep(0.06, 0.2, da)));
  } else if (k < 3.5) {
    float n = sd > 6.5 ? 4.0 : 8.0;
    float cell = floor(l.x * n);
    vec2 f = vec2(fract(l.x * n), l.y);
    float inside = step(0.1, f.x) * step(f.x, 0.9) * step(0.12, f.y) * step(f.y, 0.88);
    vec3 pc = cell < 0.5 ? vec3(0.1, 0.85, 0.3) : cell < 1.5 ? vec3(1.0, 0.18, 0.15) : cell < 2.5 ? vec3(1.0, 0.55, 0.05) : cell < 3.5 ? vec3(1.0, 0.85, 0.1)
      : cell < 4.5 ? vec3(0.1, 0.45, 1.0) : cell < 5.5 ? vec3(0.7, 0.3, 1.0) : cell < 6.5 ? vec3(1.0, 0.2, 0.6) : vec3(0.2, 0.9, 0.85);
    float set = step(cell, 4.0 + mod(sd, 3.0));
    float hit = playing && abs(cell - mod(floor(uBeat), n)) < 0.5 ? kick : 0.0;
    col = pc * inside * (0.08 + 0.5 * set + 1.4 * hit);
  } else if (k < 4.5) {
    float seg = floor(l.y * 12.0);
    float f = fract(l.y * 12.0);
    bool open = sd < 1.5;
    float level = open ? 0.5 + 0.38 * kick + 0.1 * vn(uTime * 9.0 + sd * 5.0) : 0.0;
    float on = step(seg / 12.0, level) * step(0.18, f) * step(f, 0.85);
    vec3 mc = seg < 7.5 ? vec3(0.1, 1.0, 0.25) : seg < 10.5 ? vec3(1.0, 0.8, 0.1) : vec3(1.0, 0.15, 0.1);
    col = mc * (0.05 + 1.3 * on) * step(0.2, l.x) * step(l.x, 0.8);
  } else if (k < 5.5) {
    col = tex(l);
    if (l.y > 0.703 && l.y < 0.89) col = max(col, 0.7 * wave(l.x, (l.y - 0.7965) / 0.0935, uBeat, 0.0));
    if (l.y > 0.5 && l.y < 0.6875) col = max(col, 0.7 * wave(l.x, (l.y - 0.594) / 0.0935, uBeat + 0.5, 1.0));
  } else if (k < 6.5) {
    col = texture2D(uAtlas, vR.xy + clamp(fract(l * vec2(vK.z, 1.0)), 0.004, 0.996) * vR.zw).rgb * 0.8;
    lvl = uPanel * (1.0 + 0.18 * kick);
  } else if (k < 7.5) {
    vec2 d = l - 0.5;
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    float deck = floor(sd / 2.0);
    bool play = mod(sd, 2.0) > 0.5;
    bool deckPlaying = deck < 1.5;
    float ringM = smoothstep(0.55, 0.7, r) * (1.0 - smoothstep(0.88, 1.0, r));
    float on = play ? (deckPlaying ? 1.0 : step(0.5, fract(uBeat * 0.5))) : (deckPlaying ? 0.25 : 1.0);
    col = (play ? vec3(0.15, 1.0, 0.3) : vec3(1.0, 0.45, 0.05)) * ringM * (0.1 + 1.4 * on);
  } else {
    col = sd < 0.5 ? uStrip : vec3(1.0, 0.82, 0.6) * 2.2;
    lvl = sd < 0.5 ? 1.0 : uLevel;
  }
  gl_FragColor = vec4(col * lvl, 1.0);
  #include <fog_fragment>
}`;

/**
 * The gold vault + DJ booth as one stage module: builds the vault interior and booth bodies into their
 * own bucket (vault material: dark steel / black gear under the stage floods + the vault practicals:
 * warm crown bulbs, the glow of the gear, the booth front panel, the deep portal glow), the booth's
 * glowing surfaces into one atlas-textured shader mesh, and the kit parts (gold scale roof, LED strips,
 * crown cans) into the stage buckets. Per frame: a handful of uniforms from the StageLook (no allocation).
 */
export class VaultModule {
  readonly group = new THREE.Group();
  private vaultMat: THREE.MeshStandardMaterial | null = null;
  private screenMat: THREE.ShaderMaterial | null = null;
  private atlas: THREE.Texture | null = null;
  private meshes: THREE.Mesh[] = [];
  private vp: THREE.Vector3[] = [];
  private vc: THREE.Color[] = [];
  private day = false;
  tris = 0;

  build(kit: StageKit, mats: StageMaterials, small: boolean): void {
    this.group.name = 'stage-vault';
    const vb = new GeoBucket('vault', 0.5);
    new VaultBuilder(kit, vb).build();
    const quads = new ScreenQuads();
    const booth = new BoothBuilder(vb, quads, kit.detail);
    booth.build();
    booth.dispose();

    // practical sources: crown bulbs between the rings, gear glow over the desk, the front panel, deep glow
    const zs = [-7.78, -8.73, -9.68, -10.63, -11.5];
    for (const z of zs) this.vp.push(new THREE.Vector3(0, vaultCeiling(z, 0) - 0.45, z));
    const T = BoothBuilder.top;
    this.vp.push(new THREE.Vector3(0, T + 0.35, BOOTH.z - 0.15));
    this.vp.push(new THREE.Vector3(0, VAULT.floorY + 0.45, BOOTH.z + BOOTH.halfD + 0.45));
    this.vp.push(new THREE.Vector3(0, VAULT.floorY + 1.1, VAULT.backZ + 0.45));
    for (let i = 0; i < NP; i++) this.vc.push(new THREE.Color(0, 0, 0));

    const metal = mats.metal;
    const mat = new THREE.MeshStandardMaterial({
      name: 'stage-vault',
      map: metal.map,
      roughnessMap: metal.roughnessMap,
      roughness: 0.58,
      metalness: 0.5,
      vertexColors: true,
      envMap: mats.env,
      envMapIntensity: 0.7,
    });
    patchStageShading(mat, mats.u, { flood: 0.85 });
    const base = mat.onBeforeCompile;
    const key = mat.customProgramCacheKey();
    mat.customProgramCacheKey = () => `${key}-vault`;
    mat.onBeforeCompile = (shader, renderer) => {
      base.call(mat, shader, renderer);
      shader.uniforms.uVP = { value: this.vp };
      shader.uniforms.uVC = { value: this.vc };
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${PRACTICAL_GLSL}`)
        .replace(
          '#include <lights_fragment_end>',
          `#include <lights_fragment_end>
reflectedLight.directDiffuse += material.diffuseColor * vaultPractical(vStageWP, inverseTransformDirection(normal, viewMatrix));`,
        );
    };
    this.vaultMat = mat;
    const geo = vb.build();
    if (geo) this.addMesh(geo, mat, 'stage-vault-interior', true);

    this.atlas = makeBoothAtlas(small);
    this.screenMat = new THREE.ShaderMaterial({
      name: 'stage-booth-screens',
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uAtlas: { value: null },
          uTime: { value: 0 },
          uBeat: { value: 0 },
          uLevel: { value: 1 },
          uPanel: { value: 1 },
          uStrip: { value: new THREE.Color(1, 0.5, 0.2) },
        },
      ]),
      vertexShader: SCREEN_VERT,
      fragmentShader: SCREEN_FRAG,
    });
    this.screenMat.uniforms.uAtlas.value = this.atlas;
    this.addMesh(quads.build(), this.screenMat, 'stage-booth-screens', false);
  }

  private addMesh(geo: THREE.BufferGeometry, mat: THREE.Material, name: string, shadows: boolean): void {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    m.receiveShadow = shadows;
    this.group.add(m);
    this.meshes.push(m);
    this.tris += geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
  }

  /** per frame (MainStage frame hook, after the look is resolved): practical + screen levels */
  update(ctx: FrameContext, look: StageLookEx): void {
    const sm = this.screenMat;
    if (!sm) return;
    const castle = look.emit * (1 - look.ember);
    const kick = Math.exp(-(ctx.beat.beat - Math.floor(ctx.beat.beat)) * 7);
    const u = sm.uniforms;
    u.uTime.value = ctx.showTime;
    u.uBeat.value = ctx.beat.beat;
    // the gear stays on through the whole show (a faint floor in the true blackouts)
    u.uLevel.value = 0.35 + 0.65 * Math.min(1, castle + 0.25);
    u.uPanel.value = this.day ? 0.6 : 0.12 + 0.88 * castle;
    // the panel's edge strips follow the castle LED colour of the look
    const c = u.uStrip.value as THREE.Color;
    const m = Math.max(look.castleLed.r, look.castleLed.g, look.castleLed.b, 1e-3);
    c.copy(look.castleLed).multiplyScalar((1.6 * Math.min(1, look.ledIntensity + 0.2) * (0.2 + 0.8 * castle)) / m);
    if (this.day) {
      for (const col of this.vc) col.setRGB(0, 0, 0);
      return;
    }
    const vc = this.vc;
    const bulbs = 0.55 * castle;
    for (let i = 0; i < 5; i++) vc[i].copy(WARM).multiplyScalar(bulbs);
    vc[5].copy(SCREEN).multiplyScalar(0.35 * u.uLevel.value);
    vc[6].copy(PANEL).multiplyScalar(0.9 * u.uPanel.value * (1 + 0.2 * kick));
    vc[7].copy(look.portal).multiplyScalar(1.4 * (0.5 + 0.8 * look.mouth) * castle);
  }

  /** DEV `?daylight`: practicals off (the flat afternoon view) */
  daylight(): void {
    this.day = true;
  }

  get calls(): number {
    return this.meshes.length;
  }

  dispose(): void {
    for (const m of this.meshes) m.geometry.dispose();
    this.vaultMat?.dispose();
    this.screenMat?.dispose();
    this.atlas?.dispose();
  }
}
