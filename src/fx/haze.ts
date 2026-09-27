import * as THREE from 'three';
import { Rng } from '../core/rng';
import { GLSL_COMMON } from './core/glsl';

/**
 * Static haze field: large, soft, noise-textured sprites in three zones that drift deterministically
 * with the wind (pure function of show time, wrapping inside their zone with soft edges):
 *   0 = stage haze around the set, 1 = low haze layer over the field, 2 = high firework smoke band;
 * plus (round 12) low smoke banks that roll off the deck lip, the pillar feet, the side-section fronts and the arms
 * (HazeBank: zone 3 + group, lit like smoke by the light bus and the pillar shafts' uplight).
 * Density per zone comes from the fog cues + accumulated pyro/firework smoke; colour comes from the
 * LightEnv lighting bus, so the haze glows in the wash colour and flashes with every burst, and from
 * the site glow of `atmos.glow` (the red smoke over the whole grounds, the pink whiteout).
 *
 * The field is built once with the sprites of the richest preset; every sprite carries a rank per
 * zone (a stratified random order) and a preset keeps the ranks below its share (setShare), so a
 * preset switch changes a uniform instead of rebuilding the mesh.
 */
export interface HazeZone {
  min: THREE.Vector3;
  max: THREE.Vector3;
  size: [number, number];
  /** vertical squash (1 = round) */
  aspect: number;
  count: number;
}

/**
 * Round 12: a low smoke bank. Its sprites start in the box `min`..`max` (the machines / the pyro at the deck lip, the
 * pillar bases, the side-section fronts, the forward arms), roll off with the breeze (plus a slow roll-out towards the
 * field, uBankShape) over a loop of 16-26 s, growing as they go, and fade in / out over each loop: smoke that keeps
 * building up and drifting off, a pure function of show time. `group` (0..3) = deck lip, pillar bases, side-section fronts, arms (density: setBanks).
 */
export interface HazeBank {
  min: THREE.Vector3;
  max: THREE.Vector3;
  size: [number, number];
  count: number;
  group: 0 | 1 | 2 | 3;
}

const VERT = /* glsl */ `
${GLSL_COMMON}
attribute vec3 aCenter;
attribute vec4 aPar; // size, rank in its zone (0..1), zone (0-2 haze zones, 3-6 bank groups), phase
uniform vec4 uDensity;
// round 12: low smoke banks (zone 3 + group): density per group (deck lip, pillar bases, side-section fronts, arms),
// light: pillar-shaft uplight gain, castle-base wash gain (side band), gain on the smoke light (envLight), occlusion;
// shape: aspect, roll-out speed (m/s), rise of the deck lip's smoke (m/s)
uniform vec4 uBank;
uniform vec4 uBankLight;
uniform vec3 uBankShape;
// fill light of the banks: neutral (the grey-blue of smoke in the night, the film's exposure), share of the wash, of the rig
uniform vec3 uBankFill;
// the pillar shafts' LED uplight (LightEnv.pillarShaftColor x level): the smoke at their foot glows in it
uniform vec3 uShaftCol;
// 1 = first / third person: the lit haze clears around the spectator and the air high up does not glow (round 12)
uniform float uViewer;
uniform vec3 uZoneMin[3];
uniform vec3 uZoneSize[3];
uniform vec3 uZoneAspect;
uniform vec3 uZoneOcclusion;
uniform float uStageBoost;
uniform vec4 uHazePyro; // source gain, knee stage, knee field, knee sky
uniform vec3 uHazePyroK; // extra source gain per unit of site smoke, glowing-cloud gain, fog.level glow gain
uniform vec3 uHazeTint; // colour of the smoke hanging in the air (albedo, from recent smoke cues)
uniform vec2 uHazeSite; // site glow (atmos.glow) gain, knee lift per unit of glow luminance
uniform float uHazeKeep; // share of the sprites the preset draws (ranked)
uniform float uCloseUp; // 0..1: the camera is at the deck (performer close-ups)
varying vec2 vUv;
varying vec3 vLit;
varying float vAlpha;
varying vec3 vNoise;
varying float vOcc;
varying float vWorldY;

// the pyro light field (fxLight) split by what each light is (uFxLB.w, FxLights LightSpec.haze): a
// source that lights the air around it (flames, gerbs, shells: w = 0) or a glowing smoke cloud (a lit
// fog burst: w = 1)
void hazeFx(vec3 p, float reach, out vec3 src, out vec3 cloud) {
  src = vec3(0.0);
  cloud = vec3(0.0);
  for (int i = 0; i < FX_MAX_LIGHTS; i++) {
    if (i >= uFxLN) break;
    float r = uFxLA[i].w * reach;
    float d2 = segDist2(p, uFxLA[i].xyz, uFxLB[i].xyz);
    vec3 L = uFxLC[i].rgb * (r * r / (d2 + r * r));
    float h = uFxLB[i].w;
    src += L * (1.0 - h);
    cloud += L * h;
  }
}

void main() {
  if (aPar.y >= uHazeKeep) CULL();
  int zone = int(aPar.z + 0.5);
  bool bank = zone >= 3;
  int g = bank ? zone - 3 : 0;
  float t = uTime;
  vec3 c;
  float edge = 1.0;
  float size;
  float aspect;
  if (bank) {
    // a low smoke bank: each sprite rolls off its source with the breeze over its own loop, growing as it goes
    float P = 16.0 + 10.0 * fract(aPar.w * 5.37);
    float a = fract(t / P + aPar.w);
    float age = a * P;
    // (out of the deck and the side-section fronts towards the field, off the arms towards the middle)
    vec3 roll = g == 0 || g == 2 ? vec3(0.0, 0.0, 1.0) : (g == 3 ? vec3(-sign(aCenter.x), 0.0, 0.0) : vec3(0.0));
    // (the deck lip's smoke billows up in front of the set; the rest hugs the ground)
    c = aCenter + (vec3(uWind.x, 0.0, uWind.z) * (g == 1 ? 0.4 : 0.8) + roll * uBankShape.y + vec3(0.0, g == 0 ? uBankShape.z : 0.06, 0.0)) * age;
    edge = smoothstep(0.0, 0.22, a) * (1.0 - smoothstep(0.5, 1.0, a));
    size = aPar.x * (0.6 + 0.8 * a);
    aspect = uBankShape.x;
  } else {
    vec3 zmin = uZoneMin[zone];
    vec3 zsz = uZoneSize[zone];
    // drift with the wind, wrap inside the zone
    vec3 drift = uWind * t * (zone == 2 ? 1.6 : 1.0);
    c = aCenter + drift;
    vec3 u = fract((c - zmin) / zsz);
    c = zmin + u * zsz;
    c.y = aCenter.y + sin(t * 0.07 + aPar.w * 6.28) * 0.8;
    edge = smoothstep(0.0, 0.14, u.x) * smoothstep(1.0, 0.86, u.x) * smoothstep(0.0, 0.14, u.z) * smoothstep(1.0, 0.86, u.z);
    size = aPar.x * (1.0 + 0.08 * sin(t * 0.11 + aPar.w * 17.0));
    aspect = zone == 0 ? uZoneAspect.x : (zone == 1 ? uZoneAspect.y : uZoneAspect.z);
  }
  vec4 vp = viewMatrix * vec4(c, 1.0);
  float depth = -vp.z;
  vec2 off = position.xy * size * vec2(1.0, aspect);
  vp.xy += off;
  vWorldY = c.y + dot(viewMatrix[1].xy, off);
  gl_Position = projectionMatrix * vp;
  // distance weighting: haze is only visible as haze over tens of metres. Sprites around the viewer
  // (a spectator inside the field layer) fade out completely within ~10 m and build up slowly, so
  // the air in front of your face stays clear and the veil only sits over the distant stage.
  // With site smoke (atmos.glow smoke) the air around the viewer is full of it too — except for a spectator
  // (first / third person, uViewer): a Show-camera veil at the peaks is the film's; in the crowd the bodies in front
  // stay dark silhouettes against the lit smoke behind them (round 12: 415.6 from spot=crowd; the veil of 1520 is the
  // world's height fog).
  float smokeNear = uSiteSmoke * (1.0 - uViewer);
  float nearLo = mix(max(size * 0.35, 9.0), 4.0, smokeNear);
  float nearF = zone == 1 ? smoothstep(nearLo, size * 1.2 + 14.0 - 8.0 * smokeNear, depth)
                          : smoothstep(size * 0.2, size * 0.9 + 6.0, depth);
  // a camera at the deck (the performer close-ups, v362 / v411) sits INSIDE the lit stage haze: it
  // hangs around the lens as a milky veil instead of clearing in front of it
  if (zone == 0) nearF = max(nearF, uCloseUp * 0.45 * smoothstep(1.5, 8.0, depth));
  // spectator: the lit haze fades in over the first ~15-50 m from the eye (the crowd round the viewer stays dark)
  nearF *= mix(1.0, smoothstep(14.0, 50.0, depth), uViewer);
  float dens = bank ? (g == 0 ? uBank.x : (g == 1 ? uBank.y : (g == 2 ? uBank.z : uBank.w)))
                    : (zone == 0 ? uDensity.x : (zone == 1 ? uDensity.y : uDensity.z));
  vAlpha = dens * edge * nearF * (0.7 + 0.6 * fract(aPar.w * 91.7));
  vec3 wc = c + vec3(dot(viewMatrix[0].xy, off), dot(viewMatrix[1].xy, off), dot(viewMatrix[2].xy, off));
  // (a spectator: the air high over the field does not glow — dark sky over the lit smoke round the set)
  // (per corner: a 26 m stage-haze sprite low down still reaches high into the frame)
  float viewerHigh = 1.0 - uViewer * smoothstep(5.0, 18.0, vWorldY) * 0.92;
  if (bank) {
    // a low smoke bank is smoke like the pyro's and the fog machines' puffs: lit by the show's light bus (rig, wash,
    // flashes, lantern crystals, the pyro light field, the site glow, the beams held by a low fog bank)
    vec3 light = envLight(wc) * uBankLight.z;
    // the pillar shafts' LED uplight lights the smoke rolling round their foot (the orange-lit smoke at the pillar
    // bases of v470 / v1047), each pillar at its chase level
    // (at the sprite's own centre, low down: the whole puff takes the glow of the pillar it rolls off, not its corners)
    for (int i = 0; i < 8; i++) {
      vec3 d = vec3(c.x, min(c.y, 2.0), c.z) - vec3(uLampPos[i].x, 1.2, uLampPos[i].z);
      light += uShaftCol * (uLampPos[i].w * uBankLight.x * 30.0 / (dot(d, d) + 30.0));
    }
    // the castle-base wash lights the band of low fog along the side sections and the arms (the blue-white band that
    // draws the U in the opening drone shots, v30 / v59.5) and the smoke at the deck lip
    light += uStageWash * uBankLight.y * (g >= 2 ? 1.0 : (g == 0 ? 0.6 : 0.0));
    // fill: while the set is lit the smoke reads grey-blue even away from the lights (v470 / v505: the pillar feet in
    // grey smoke); in a blackout it is gone with the light (v1022 / v1071: black frames)
    vec3 rig = min(uStageLight, vec3(1.0));
    float lit = clamp(4.0 * dot(uStageWash + 0.5 * rig, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    light += vec3(0.5, 0.56, 0.72) * (uBankFill.x * lit) + uStageWash * uBankFill.y + rig * uBankFill.z;
    // (coloured smoke cannons tint the banks only a little: the banks are mostly the machines' white smoke)
    vLit = light * mix(vec3(1.0), uHazeTint, 0.25) * fogT(depth * 0.7);
    vOcc = mix(uBankLight.w, 0.8, uSiteSmoke * 0.85);
  } else {
    // light scattered by the haze: ambient + a damped share of the stage rig / wash / flashes
    vec3 q = (c - vec3(0.0, 12.0, -10.0)) * vec3(0.011, 0.028, 0.02);
    float stageF = 1.0 / (1.0 + dot(q, q) * 1.5);
    vec3 df = c - uFlashPos;
    float flashF = 1.0 / (1.0 + dot(df, df) * (1.0 / 4900.0));
    // (the high firework-smoke band hardly sees the rig and the wash, which light the set and the field:
    // on the video the sky over a red or pink look stays a clean deep blue, v509 / v754)
    vec3 light = uAmbient + (uStageLight * 0.4 + uStageWash * 0.3) * stageF * (zone == 2 ? 0.35 : 1.0);
    // the low field layer sits right next to the flame units: only a trace of the flash term there
    light += uFlashCol * flashF * (zone == 1 ? 0.1 : 0.28);
    if (zone == 0) light += (min(uStageLight, vec3(2.0)) * 0.25 + uStageWash * 0.3) * uStageBoost;
    // the site glow (atmos.glow): the smoke over the whole grounds holds this light itself (a red
    // smoke cloud, a pink-lit whiteout), in every zone. It raises the brightness knee by its own
    // luminance, so the glow is not squashed like the rig's scatter.
    vec3 site = uSiteGlow * uHazeSite.x * (zone == 2 ? 0.7 : 1.0);
    light += site;
    // brightness clamp (soft knee): haze may glow, but never brighter than a dim fraction of the
    // sources it scatters — so the set and the beams stay the brightest things in the frame
    float Lm = max(light.r, max(light.g, light.b));
    float knee = (zone == 2 ? 0.35 : 0.22 + (zone == 0 ? 0.12 * uCloseUp : 0.0)) + dot(site, vec3(0.2126, 0.7152, 0.0722)) * uHazeSite.y;
    if (Lm > knee) light *= (knee + (Lm - knee) * 0.25) / Lm;
    // the pyro light field lights the haze where it burns (per corner: a flame wall at one end of a
    // 26 m sprite lights that end), with a much higher knee than the rig: the smoke around a fire
    // glows, the far haze stays dark.
    // A glowing smoke cloud (lit fog burst) and the fog.level smoke glow ARE lit smoke: they fill the
    // haze in their colour. A source (a silver gerb wall, a flame row) only lights the thin show haze
    // with a trace (1438.5 / 1446: a dark, smoky frame with bright white gerbs — the gerbs' own smoke
    // puffs carry their glow, not a grey-white veil over the whole set); once atmos.glow fills the site
    // with smoke the same source lights that thick smoke fully (the pink-white whiteout of v76).
    vec3 fxSrc, fxCloud;
    hazeFx(wc, zone == 2 ? 0.8 : 1.2, fxSrc, fxCloud);
    float gSrc = uHazePyro.x + uHazePyroK.x * uSiteSmoke;
    float zk = zone == 2 ? 0.12 : 1.0;
    float pk = zone == 0 ? uHazePyro.y : (zone == 1 ? uHazePyro.z : uHazePyro.w);
    vec3 pyro = kneeC((fxCloud * uHazePyroK.y + uFxGlow * uHazePyroK.z) * zk, pk, 0.3) + kneeC(fxSrc * gSrc * zk, pk, 0.3);
    vLit = (light + pyro) * viewerHigh * uHazeTint * fogT(depth * 0.7);
    // site smoke (atmos.glow smoke): the air is thick with it — it hides the set behind it too
    vOcc = mix(zone == 0 ? uZoneOcclusion.x : (zone == 1 ? uZoneOcclusion.y : uZoneOcclusion.z), 0.8, uSiteSmoke * 0.85);
  }
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
  /** sprites built (richest preset) */
  readonly total: number;
  private readonly zoneCounts: number[];
  /** sprites the current preset draws */
  count: number;

  constructor(shared: Record<string, THREE.IUniform>, zones: HazeZone[], banks: HazeBank[] = [], seed = 77) {
    const rng = new Rng(seed);
    const n = zones.reduce((a, z) => a + z.count, 0) + banks.reduce((a, b) => a + b.count, 0);
    this.total = n;
    this.count = n;
    this.zoneCounts = [...zones.map((z) => z.count), ...banks.map((b) => b.count)];
    const centers = new Float32Array(n * 3);
    const pars = new Float32Array(n * 4);
    let i = 0;
    // stratified ranks in a random order: any share k of a zone keeps ~k * count sprites, spread over the whole zone
    const rankList = (count: number, r: Rng): number[] => {
      const ranks = Array.from({ length: count }, (_, k) => (k + 0.5) / count);
      for (let k = ranks.length - 1; k > 0; k--) {
        const j = Math.floor(r.next() * (k + 1));
        const tmp = ranks[k];
        ranks[k] = ranks[j];
        ranks[j] = tmp;
      }
      return ranks;
    };
    zones.forEach((z, zi) => {
      const ranks = rankList(z.count, rng);
      for (let k = 0; k < z.count; k++, i++) {
        centers[i * 3] = rng.range(z.min.x, z.max.x);
        centers[i * 3 + 1] = rng.range(z.min.y, z.max.y);
        centers[i * 3 + 2] = rng.range(z.min.z, z.max.z);
        pars[i * 4] = rng.range(z.size[0], z.size[1]);
        pars[i * 4 + 1] = ranks[k];
        pars[i * 4 + 2] = zi;
        pars[i * 4 + 3] = rng.next();
      }
    });
    // the low smoke banks (own random stream: the haze zones keep their layout); a bank's loop phases are spread
    // evenly (stratified) so its smoke rolls off continuously instead of in waves
    const brng = new Rng(seed + 1201);
    for (const b of banks) {
      const ranks = rankList(b.count, brng);
      const ph = rankList(b.count, brng);
      for (let k = 0; k < b.count; k++, i++) {
        centers[i * 3] = brng.range(b.min.x, b.max.x);
        centers[i * 3 + 1] = brng.range(b.min.y, b.max.y);
        centers[i * 3 + 2] = brng.range(b.min.z, b.max.z);
        pars[i * 4] = brng.range(b.size[0], b.size[1]);
        pars[i * 4 + 1] = ranks[k];
        pars[i * 4 + 2] = 3 + b.group;
        pars[i * 4 + 3] = (ph[k] + 0.3 * (brng.next() - 0.5) / b.count + 1) % 1;
      }
    }
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
      // how much each zone dims what lies behind it (the stage haze must not grey the set out)
      uZoneOcclusion: { value: new THREE.Vector3(0.35, 0.15, 0.55) },
      uStageBoost: { value: 1 },
      // pyro light on the haze: source gain (a trace; round 6 had 7 for every light), knees per zone
      uHazePyro: { value: new THREE.Vector4(0.5, 14, 7, 4) },
      // + source gain per unit of site smoke, glowing-cloud gain (lit fog bursts), fog.level glow gain
      uHazePyroK: { value: new THREE.Vector3(8, 7, 7) },
      uHazeTint: { value: new THREE.Color(1, 1, 1) },
      // site glow (atmos.glow) on the haze: gain, knee lift per unit of glow luminance
      uHazeSite: { value: new THREE.Vector2(1.6, 3) },
      uHazeKeep: { value: 1.01 },
      uCloseUp: { value: 0 },
      // low smoke banks (round 12): density per group (deck lip, pillar bases, side-section fronts, arms), their light
      // (shaft uplight gain, castle-base wash gain, smoke-light gain, occlusion), shape (aspect, roll-out speed m/s,
      // deck rise m/s) and fill (neutral, wash share, rig share)
      uBank: { value: new THREE.Vector4(0, 0, 0, 0) },
      uBankLight: { value: new THREE.Vector4(1, 0.8, 1, 0.4) },
      uBankShape: { value: new THREE.Vector3(0.5, 0.35, 0.2) },
      uBankFill: { value: new THREE.Vector3(0.08, 0.2, 0.12) },
      uShaftCol: { value: new THREE.Color(0, 0, 0) },
      uViewer: { value: 0 },
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

  /** share of the sprites a preset draws (1 = all) */
  setShare(k: number): void {
    const s = Math.max(0, Math.min(1, k));
    this.uniforms.uHazeKeep.value = s >= 1 ? 1.01 : s;
    let c = 0;
    for (const zc of this.zoneCounts) for (let j = 0; j < zc; j++) if ((j + 0.5) / zc < s || s >= 1) c++;
    this.count = c;
  }

  /** albedo tint of the haze (coloured smoke from recent smoke cannons), luminance ~1 */
  setTint(c: THREE.Color): void {
    (this.uniforms.uHazeTint.value as THREE.Color).copy(c);
  }

  /** 0..1: how close the camera is to the lit deck (the stage haze veils the lens at 1) */
  setCloseUp(k: number): void {
    this.uniforms.uCloseUp.value = Math.max(0, Math.min(1, k));
  }

  setDensity(stage: number, field: number, sky: number): void {
    (this.uniforms.uDensity.value as THREE.Vector4).set(stage, field, sky, 0);
    const b = this.uniforms.uBank.value as THREE.Vector4;
    this.mesh.visible = stage + field + sky + b.x + b.y + b.z + b.w > 0.002;
  }

  /** density of the low smoke banks per group: deck lip, pillar bases, side-section fronts, forward arms (call before setDensity) */
  setBanks(deck: number, pillars: number, sides: number, arms: number): void {
    (this.uniforms.uBank.value as THREE.Vector4).set(deck, pillars, sides, arms);
  }

  /** the pillar shafts' uplight (colour x level) that lights the smoke at their foot */
  setShaftLight(c: THREE.Color, level: number): void {
    (this.uniforms.uShaftCol.value as THREE.Color).copy(c).multiplyScalar(Math.max(0, level));
  }

  /** 0..1: a spectator's eye (first / third person): the lit haze clears around it and does not glow high up */
  setViewer(k: number): void {
    this.uniforms.uViewer.value = Math.max(0, Math.min(1, k));
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}
