import * as THREE from 'three';
import type { App } from '../core/App';
import { clamp, hash32, lerp, smoothstep } from '../core/rng';
import type { FrameContext, QualitySettings, System } from '../core/types';
import { resolveColor } from '../show/colors';
import type { Cue } from '../show/ShowTypes';
import { dirFromAzAlt, EPHEM, showProgress, STARS } from './site';
import { TimeSlicer } from '../core/yieldTo';
import { cloudNoiseTextureAsync } from './tex';
import { flashBounce, flashCompression, fogGlsl, installHeightFog, updateWorldLights, worldUniforms, type HeightFogConfig } from './worldLights';

/**
 * Blue-hour sky of Sat 27 June 2026, 22:40–23:06 CEST over Biddinghuizen (event-context §4.3/§4.4):
 *  - sun 3.6° → 7.1° below the NW horizon (az 319° → 325° = straight behind the audience): the
 *    teal twilight arc sits behind the spectator, the sky over the stage (SE) is deeper blue and
 *    darkens over the 26 minutes (frames: #002C5A → near-black by 20:00 in the video grade)
 *  - the 96 % waxing gibbous Moon low in the S-SE (az 163° → 169°, alt 7.8° → 8.7°), i.e. ~20°
 *    right of the stage and 8° up — the bright point seen in the drone frames f003/f004/f122 and
 *    over a lantern pillar in f113
 *  - Venus (−4.0) and Jupiter low in the W-NW twilight, the brightest stars in the gaps
 *  - a broken cloud deck ahead of the thunderstorm that hit ~30–60 min later (Lelystad 8/8, gaps
 *    over the site): cloud streaks lit teal from the NW, from below by the show, occasional
 *    distant lightning in the W
 * The sky is a pure function of show time (+ the light env of the current frame).
 */

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize( position );
  vec4 p = projectionMatrix * vec4( mat3( viewMatrix ) * position, 1.0 );
  gl_Position = p.xyww; // at the far plane
}
`;

function skyFrag(fog: HeightFogConfig, octaves: number): string {
  return /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform sampler2D tNoise;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform vec3 uStageDir;
uniform vec3 uFlashDir;
uniform vec3 uFlashCol;
uniform vec3 uShowCol;
uniform vec3 uGlowCol;     // site glow (atmos.glow) + flash bounce off the smoke: a broad low dome
uniform vec4 uLightning;   // dir xyz, intensity
uniform vec3 uZenith;
uniform vec3 uHorizonSE;
uniform vec3 uHorizonNW;
uniform vec3 uTwilight;
uniform vec3 uTwilightWarm;
uniform vec3 uFogColor;
uniform vec3 uCloudDark;
uniform vec3 uCloudLit;
uniform vec3 uTint;
uniform float uTintAmt;
uniform float uLevel;
uniform float uCover;
uniform float uTime;
uniform float uMoonI;
uniform float uHaze;
uniform float uSmoke;
${fogGlsl(fog)}

float cloudField( vec2 p ) {
  // streaky broken deck: stretched along the wind (from NNW), two scales + detail
  // cloud streets aligned with the NNW wind (world Z), gently sheared
  vec2 q = vec2( p.x + p.y * 0.12, p.y * 0.42 );
  float a = texture2D( tNoise, q * 0.9 ).r;
  float b = texture2D( tNoise, q * 2.3 + vec2( 0.37, 0.11 ) + a * 0.15 ).g;
  float d = a * 0.62 + b * 0.38;
#if ${octaves} > 2
  d += ( texture2D( tNoise, q * 9.0 + vec2( 0.13, 0.71 ) ).a - 0.5 ) * 0.12;
#endif
  return d;
}

void main() {
  vec3 d = normalize( vDir );
  float e = d.y;
  float eh = max( e, 0.0 );
  vec2 dxz = normalize( d.xz + 1e-5 );
  vec2 sxz = normalize( uSunDir.xz );
  float azSun = dot( dxz, sxz );           // 1 towards the twilight, -1 towards the stage
  float sunSide = azSun * 0.5 + 0.5;

  // --- clear-sky gradient (blue hour → night): colours are the graded-video targets of design-bible
  //     §8.3, keyframed over show time on the CPU (teal-navy at the start, near-black from t ≈ 600)
  vec3 horizon = mix( uHorizonSE, uHorizonNW, pow( sunSide, 2.6 ) );
  float zen = pow( clamp( eh, 0.0, 1.0 ), 0.5 );
  vec3 col = mix( horizon, uZenith, zen );
  // twilight arc: a teal band low over the NW (behind the audience), warm only at its core
  float arc = pow( max( azSun, 0.0 ), 2.5 );
  col += uTwilight * arc * exp( - eh / 0.09 );
  col += uTwilightWarm * pow( max( azSun, 0.0 ), 8.0 ) * exp( - eh / 0.028 );
  // earth shadow over the SE (anti-solar) horizon: slightly darker, no pink belt (sun already −4°)
  float anti = pow( max( - azSun, 0.0 ), 2.0 );
  col *= 1.0 - anti * 0.22 * ( 1.0 - smoothstep( 0.0, 0.09, eh ) );
  // light pollution / distant festival areas: faint warm glow hugging the horizon (mostly +X = other stages)
  float lp = exp( - eh / 0.02 );
  col += vec3( 0.0035, 0.0022, 0.0012 ) * lp * ( 0.3 + 0.7 * smoothstep( -0.2, 0.9, d.x ) );

  // --- moon: warm disc (96 % lit, low: #F2DCC0) with a faint pinkish aureole (#D7CAE4, f113)
  float md = dot( d, uMoonDir );
  float ang = acos( clamp( md, -1.0, 1.0 ) );
  vec3 moonCol = vec3( 1.0, 0.81, 0.59 );
  vec3 haloCol = vec3( 0.87, 0.76, 1.0 );
  float aure = exp( - ang / 0.011 ) * 0.28 + exp( - ang / 0.07 ) * 0.018 * ( 0.6 + uHaze );
  vec3 glow = haloCol * aure * uMoonI;
  float moonR = 0.0056;
  float disc = 1.0 - smoothstep( moonR * 0.86, moonR, ang );
  vec3 moonDisc = vec3( 0.0 );
  if ( disc > 0.0 ) {
    vec3 t1 = normalize( cross( uMoonDir, vec3( 0.0, 1.0, 0.0 ) ) );
    vec3 t2 = cross( t1, uMoonDir );
    vec2 q = vec2( dot( d, t1 ), dot( d, t2 ) ) / moonR;
    float z = sqrt( max( 0.0, 1.0 - dot( q, q ) ) );
    vec3 n = q.x * t1 + q.y * t2 - z * uMoonDir;
    float lit = smoothstep( -0.06, 0.1, dot( n, uSunDir ) );
    float maria = 0.72 + 0.28 * texture2D( tNoise, q * 0.18 + 0.5 ).r;
    float limb = 0.75 + 0.25 * z;
    // peak ≈ 4.5 scene-linear: bright but below the tone curve's white path, so the disc stays warm
    moonDisc = moonCol * disc * lit * maria * limb * 4.5 * uMoonI;
  }

  // --- clouds on a deck ~1.8 km up
  float cover = 0.0;
  vec3 cloudCol = vec3( 0.0 );   // twilight-lit part (scaled by the sky level)
  vec3 cloudAdd = vec3( 0.0 );   // light from the show / flashes / lightning / moon (absolute)
  if ( e > 0.004 ) {
    vec2 p = d.xz / ( e + 0.035 ) * 0.075 + vec2( uTime * 0.00022, - uTime * 0.00061 );
    float f = cloudField( p );
    float thr = 1.0 - uCover;
    cover = smoothstep( thr - 0.02, thr + 0.34, f );
    float thick = smoothstep( thr + 0.05, thr + 0.5, f );
    cover *= smoothstep( 0.004, 0.06, e ) * 0.94;
    // lighting: faint twilight from the NW, show from below only right over the stage, thin moon rims
    vec3 lit = mix( uCloudDark, uCloudLit, pow( sunSide, 2.2 ) );
    lit *= 1.0 - thick * 0.45;
    cloudCol = lit;
    float nearStage = pow( max( dot( d, uStageDir ), 0.0 ), 12.0 );
    cloudAdd += uShowCol * nearStage * ( 0.4 + 0.6 * thick );
    float nearMoon = exp( - ang / 0.05 );
    cloudAdd += moonCol * nearMoon * ( 1.0 - thick ) * 0.03 * uMoonI;
    cloudAdd += uFlashCol * pow( max( dot( d, uFlashDir ), 0.0 ), 3.0 ) * ( 0.6 + 0.8 * thick );
    cloudAdd += uGlowCol * ( 0.5 + 0.9 * thick ) * ( 0.4 + 0.6 * exp( - eh / 0.3 ) );
    // distant lightning inside the storm clouds: a broad lobe + a hot core
    float lc = max( dot( d, uLightning.xyz ), 0.0 );
    cloudAdd += vec3( 0.72, 0.78, 1.0 ) * uLightning.w * ( pow( lc, 10.0 ) * 0.5 + pow( lc, 60.0 ) * 2.0 ) * ( 0.35 + thick );
  }
  // clear-sky contributions from the show / flashes / lightning: kept tight around the source and low,
  // so the haze glow never washes the whole dome (the field haze itself is drawn by the fx volumes)
  float hazeK = 0.35 + 0.65 * uHaze;
  float lowK = 1.0 - smoothstep( 0.08, 0.35, eh );
  vec3 add = uShowCol * pow( max( dot( d, uStageDir ), 0.0 ), 24.0 ) * 0.14 * hazeK * lowK;
  add += uFlashCol * pow( max( dot( d, uFlashDir ), 0.0 ), 10.0 ) * 0.2 * hazeK;
  // the whole smoke-filled air over the site glows in the fire / smoke colour, strongest low down
  add += uGlowCol * ( 0.3 + 0.7 * exp( - eh / 0.2 ) ) * hazeK;
  add += vec3( 0.7, 0.75, 1.0 ) * uLightning.w * pow( max( dot( d, uLightning.xyz ), 0.0 ), 16.0 ) * exp( - eh / 0.1 ) * 0.35;

  col = col * uLevel + add;
  col += glow;
  col = mix( col, cloudCol * uLevel + cloudAdd + add * 0.5 + glow * 0.6, cover );
  col += moonDisc * ( 1.0 - cover * 0.85 );

  // atmos cue tint
  col = mix( col, col * uTint * 1.6, uTintAmt );
  // a smoke-filled site (atmos.glow smoke): the lit smoke veils the sky too, most of all low down
  col = mix( col, uFogColor * ( 0.7 + 0.3 * exp( - eh / 0.25 ) ), uSmoke * ( 0.55 + 0.35 * exp( - eh / 0.3 ) ) );

  // below the horizon: the dark polder under haze (matches the height fog on distant terrain)
  vec3 land = worldFogTintC( d, uFogColor );
  col = mix( col, land, smoothstep( 0.012, -0.03, e ) );

  gl_FragColor = vec4( max( col, 0.0 ), 1.0 );
}
`;
}

const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

const STAR_VERT = /* glsl */ `
attribute float aMag;
attribute float aSeed;
attribute float aKind;   // 0 star, 1 planet
uniform sampler2D tNoise;
uniform float uTime;
uniform float uCover;
uniform float uVis;
uniform float uPlanetVis;
uniform float uPx;
uniform mat3 uSidereal;
varying vec3 vCol;
varying float vI;
void main() {
  vec3 dir = aKind > 0.5 ? position : uSidereal * position;
  vec4 p = projectionMatrix * vec4( mat3( viewMatrix ) * dir, 1.0 );
  gl_Position = p.xyww;
  // cloud occlusion (same field as the sky shader, low-detail)
  float e = dir.y;
  vec2 pc = dir.xz / ( e + 0.035 ) * 0.075 + vec2( uTime * 0.00022, - uTime * 0.00061 );
  vec2 q = vec2( pc.x + pc.y * 0.12, pc.y * 0.42 );
  float a0 = texture2D( tNoise, q * 0.9 ).r;
  float f = a0 * 0.62 + texture2D( tNoise, q * 2.3 + vec2( 0.37, 0.11 ) + a0 * 0.15 ).g * 0.38;
  float thr = 1.0 - uCover;
  float cl = smoothstep( thr - 0.04, thr + 0.12, f );
  // magnitude -> brightness; extinction near the horizon
  float b = pow( 2.512, - aMag ) * ( 1.0 - cl ) * smoothstep( 0.0, 0.12, e );
  float tw = 0.8 + 0.2 * sin( uTime * ( 7.0 + aSeed * 9.0 ) + aSeed * 40.0 );
  vI = b * ( aKind > 0.5 ? uPlanetVis : uVis ) * mix( tw, 1.0, aKind );
  vCol = aKind > 0.5 ? vec3( 1.0, 0.96, 0.86 ) : mix( vec3( 0.8, 0.88, 1.0 ), vec3( 1.0, 0.9, 0.75 ), fract( aSeed * 3.7 ) );
  gl_PointSize = uPx * ( aKind > 0.5 ? 3.2 : 2.2 );
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vCol;
varying float vI;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( c, c );
  float a = exp( - r2 * 4.0 );
  if ( a < 0.02 ) discard;
  gl_FragColor = vec4( vCol * vI * a, 1.0 );
}
`;

interface SkyUniforms {
  [k: string]: THREE.IUniform;
}

/**
 * Sky colour keyframes over show time (design-bible §8.3 graded-video targets, converted to
 * scene-linear through the inverse of the PostFX Lottes curve). Interpolated geometrically, so the
 * sky darkens smoothly: teal-navy at 22:33, near-black from t ≈ 600 s.
 */
const SKY_T = [0, 120, 400, 800, 1300];
type RGB = [number, number, number];
const SKY_KEYS: Record<'zen' | 'se' | 'nw' | 'teal' | 'warm', RGB[]> = {
  // zenith: #0A2A4E → #06183A → #030A1E → #02060F → #010204
  zen: [[0.0034, 0.0258, 0.0848], [0.0024, 0.0119, 0.0551], [0.0017, 0.0057, 0.0242], [0.0016, 0.0047, 0.0123], [0.0012, 0.0025, 0.0049]],
  // horizon over the stage (SE): #0E2D4A → #081E3C → navy → #020206 → #010104 (red kept low: no lavender)
  se: [[0.005, 0.03, 0.0782], [0.0031, 0.0166, 0.0577], [0.002, 0.004, 0.025], [0.0016, 0.002, 0.0068], [0.001, 0.0012, 0.0028]],
  // horizon behind the audience (NW) above the glow: #1F4A6B → … → #050A14
  nw: [[0.0134, 0.0668, 0.1433], [0.0057, 0.0276, 0.069], [0.0037, 0.0157, 0.0382], [0.0027, 0.0109, 0.026], [0.002, 0.0069, 0.0159]],
  // teal twilight arc 3–10° (added; about half the physical #5E8C9A → #122838, never seen on camera)
  teal: [[0.08, 0.2, 0.22], [0.05, 0.14, 0.17], [0.018, 0.07, 0.1], [0.008, 0.03, 0.05], [0.004, 0.014, 0.025]],
  // warm core of the glow 0–3° (added; #C99A68 → #7A6450 → gone)
  warm: [[0.5, 0.26, 0.1], [0.25, 0.13, 0.06], [0.09, 0.055, 0.03], [0.02, 0.014, 0.01], [0.004, 0.003, 0.002]],
};
const ZEN_B0 = SKY_KEYS.zen[0][2];

/** geometric interpolation of a keyframed colour at show time t (no allocation) */
function skyKey(key: keyof typeof SKY_KEYS, t: number, out: THREE.Color): THREE.Color {
  const K = SKY_KEYS[key];
  let i = 0;
  while (i < SKY_T.length - 2 && t > SKY_T[i + 1]) i++;
  const s = smoothstep(SKY_T[i], SKY_T[i + 1], t);
  const a = K[i],
    b = K[i + 1];
  return out.setRGB(
    Math.exp(lerp(Math.log(a[0]), Math.log(b[0]), s)),
    Math.exp(lerp(Math.log(a[1]), Math.log(b[1]), s)),
    Math.exp(lerp(Math.log(a[2]), Math.log(b[2]), s)),
  );
}

export class EnvironmentSystem implements System {
  readonly name = 'environment';
  private app!: App;
  private enabled = true;
  private q!: QualitySettings;

  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private skyU!: SkyUniforms;
  private stars!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private starU!: SkyUniforms;
  private noise!: THREE.DataTexture;
  private fog!: THREE.FogExp2;
  private fogCfg!: HeightFogConfig;
  private hemi!: THREE.HemisphereLight;
  private moonLight!: THREE.DirectionalLight;
  private twilightLight!: THREE.DirectionalLight;

  private readonly sunDir = new THREE.Vector3();
  private readonly moonDir = new THREE.Vector3();
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpC = new THREE.Color();
  private readonly tint = new THREE.Color(1, 1, 1);
  private readonly cueBuf: Cue[] = [];
  private readonly glowBuf: Cue[] = [];
  private readonly glowC = new THREE.Color();
  private readonly bounceC = new THREE.Color();
  private readonly sidereal = new THREE.Matrix3();
  private readonly poleAxis = dirFromAzAlt(0, 52.44);
  private readonly rotM = new THREE.Matrix4();
  private fogBase = 0.0012;
  private level = 1;
  private stats_ = { level: 0, sunAlt: 0, moonAlt: 0, cover: 0, lightning: 0 };

  async init(app: App): Promise<void> {
    this.app = app;
    this.q = app.quality;
    const p0 = 0.5;
    // mid-show directions for the (static) fog in-scatter lobes
    dirFromAzAlt(lerp(EPHEM.sun.az[0], EPHEM.sun.az[1], p0), 0, this.sunDir);
    dirFromAzAlt(lerp(EPHEM.moon.az[0], EPHEM.moon.az[1], p0), lerp(EPHEM.moon.alt[0], EPHEM.moon.alt[1], p0), this.moonDir);
    this.fogCfg = {
      falloff: 1 / 38,
      base: 0,
      sunDir: this.sunDir.clone(),
      moonDir: this.moonDir.clone(),
      twilightGain: 1.6,
      moonGain: 0.6,
    };
    installHeightFog(this.fogCfg);
    this.fog = new THREE.FogExp2('#08101e', this.fogBase);
    app.scene.fog = this.fog;
    app.scene.background = new THREE.Color('#04081a');

    // lights: twilight sky dome (hemisphere), low warm moon, cool NW twilight fill
    this.hemi = new THREE.HemisphereLight('#3050a0', '#1a140e', 0.55);
    this.moonLight = new THREE.DirectionalLight('#ffd7a8', 0.16);
    this.twilightLight = new THREE.DirectionalLight('#6fb4c8', 0.22);
    app.scene.add(this.hemi, this.moonLight, this.twilightLight, this.moonLight.target, this.twilightLight.target);

    this.noise = await cloudNoiseTextureAsync(this.q.level === 'mobile' ? 256 : 512, new TimeSlicer(12));
    this.buildSky();
    this.buildStars();
    // env-driven values must be read after every show system wrote app.env this frame
    app.onFrame((ctx) => this.lateUpdate(ctx));
  }

  private buildSky(): void {
    const v3 = (c: string) => ({ value: new THREE.Color(c) });
    this.skyU = {
      tNoise: { value: this.noise },
      uSunDir: { value: new THREE.Vector3() },
      uMoonDir: { value: new THREE.Vector3() },
      uStageDir: { value: new THREE.Vector3(0, 0.2, -1).normalize() },
      uFlashDir: { value: new THREE.Vector3(0, 1, 0) },
      uFlashCol: { value: new THREE.Color(0, 0, 0) },
      uShowCol: { value: new THREE.Color(0, 0, 0) },
      uGlowCol: { value: new THREE.Color(0, 0, 0) },
      uLightning: { value: new THREE.Vector4(1, 0.05, 0.4, 0) },
      // scene-referred values tuned for the Lottes curve of the postfx (mid 0.18 → 0.19, toe ~x^1.5)
      uZenith: v3('#000000'),
      uHorizonSE: v3('#000000'),
      uHorizonNW: v3('#000000'),
      uTwilight: v3('#000000'),
      uTwilightWarm: v3('#000000'),
      uFogColor: { value: new THREE.Color() },
      uCloudDark: v3('#000000'),
      uCloudLit: v3('#000000'),
      uTint: { value: new THREE.Color(1, 1, 1) },
      uTintAmt: { value: 0 },
      uLevel: { value: 1 },
      uCover: { value: 0.52 },
      uTime: { value: 0 },
      uMoonI: { value: 1 },
      uHaze: { value: 0.6 },
      uSmoke: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.skyU,
      vertexShader: SKY_VERT,
      fragmentShader: skyFrag(this.fogCfg, this.q.level === 'mobile' ? 2 : 3),
      depthWrite: false,
      depthTest: true,
      depthFunc: THREE.LessEqualDepth,
      side: THREE.BackSide,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), mat);
    this.sky.name = 'sky';
    this.sky.userData.noFocus = true; // camera-centred dome: never an autofocus target
    this.sky.frustumCulled = false;
    this.sky.renderOrder = 1e6; // last among opaques: early-z skips everything already covered
    this.app.scene.add(this.sky);
  }

  private buildStars(): void {
    const n = STARS.length + 2;
    const pos = new Float32Array(n * 3);
    const mag = new Float32Array(n);
    const seed = new Float32Array(n);
    const kind = new Float32Array(n);
    const v = new THREE.Vector3();
    STARS.forEach(([az, alt, m], i) => {
      dirFromAzAlt(az, alt, v).toArray(pos, i * 3);
      mag[i] = m;
      seed[i] = (hash32(i * 31 + 7) % 1000) / 1000;
    });
    // planets: Venus and Jupiter in the NW twilight (positions updated per frame)
    mag[n - 2] = EPHEM.venus.mag;
    mag[n - 1] = EPHEM.jupiter.mag;
    kind[n - 2] = kind[n - 1] = 1;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aMag', new THREE.BufferAttribute(mag, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
    this.starU = {
      tNoise: { value: this.noise },
      uTime: { value: 0 },
      uCover: { value: 0.5 },
      uVis: { value: 0 },
      uPlanetVis: { value: 1 },
      uPx: { value: 1 },
      uSidereal: { value: this.sidereal },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.starU,
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      depthFunc: THREE.LessEqualDepth,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.stars = new THREE.Points(g, mat);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = 1e6 + 1;
    this.stars.name = 'stars';
    this.app.scene.add(this.stars);
  }

  update(ctx: FrameContext): void {
    // the site glow is written first in the frame (this system updates first), so the stage,
    // lights, fog and crowd can read app.env.glowColor in their own update
    this.app.env.smoke = this.glowAt(ctx.showTime, this.app.env.glowColor);
    if (!this.enabled) return;
    // keep sky + stars centred on the camera (they are drawn at the far plane anyway)
    this.sky.position.copy(ctx.camera.position);
    this.stars.position.copy(ctx.camera.position);
  }

  /**
   * `atmos.glow` cues → site-wide coloured ambient light (premultiplied by amount), a pure function
   * of show time: the orange light of a flame wall, the red smoke cloud over the whole site.
   * Params: `color`, `amount` 0..2 (default 0.6), `fade` s in (default 0.3), `out` s fade-out at the
   * end of dur (default 0.8), `flicker` 0..1 (fire light breathing, default 0), `smoke` 0..1 (the
   * site fills with smoke: denser height fog in the glow colour, default 0). Returns the smoke level.
   */
  private glowAt(t: number, out: THREE.Color): number {
    out.setRGB(0, 0, 0);
    let smoke = 0;
    const cues = this.app.show.active('atmos', t, this.glowBuf);
    for (let i = 0; i < cues.length; i++) {
      const c = cues[i];
      if (c.fx !== 'glow') continue;
      const fin = Math.max(0.01, num(c.p.fade, 0.3));
      const fout = Math.max(0.01, num(c.p.out, 0.8));
      const kin = clamp((t - c.t) / fin, 0, 1);
      const kout = clamp((c.t + c.dur - t) / fout, 0, 1);
      let k = kin * kin * (3 - 2 * kin) * kout * kout * (3 - 2 * kout);
      const fl = clamp(num(c.p.flicker, 0), 0, 1);
      if (fl > 0) {
        const n = 0.5 + 0.25 * Math.sin(t * 13.1 + c.seed) + 0.15 * Math.sin(t * 7.3 + 1.3) + 0.1 * Math.sin(t * 23.7 + 0.4);
        k *= 1 - fl * 0.6 * clamp(n, 0, 1);
      }
      smoke = Math.max(smoke, clamp(num(c.p.smoke, 0), 0, 1) * k);
      const a = clamp(num(c.p.amount, 0.6), 0, 2) * k;
      if (a <= 0) continue;
      resolveColor(c.p.color ?? 'primary', this.app.palette, this.glowC, 'primary');
      out.r += this.glowC.r * a;
      out.g += this.glowC.g * a;
      out.b += this.glowC.b * a;
    }
    return smoke;
  }

  /** after all systems: read app.env (flashes, haze, stage light) and the atmos cues */
  private lateUpdate(ctx: FrameContext): void {
    const env = this.app.env;
    // photosensitivity: the whole-field flash response is halved (the emitters scale their own share)
    updateWorldLights(env, ctx.showTime, this.app.reduceFlashing ? 0.5 : 1);
    if (!this.enabled) return;
    const t = ctx.showTime;
    const p = showProgress(t);
    const U = this.skyU;

    // --- ephemeris (pure function of show time)
    const sunAlt = lerp(EPHEM.sun.alt[0], EPHEM.sun.alt[1], p);
    dirFromAzAlt(lerp(EPHEM.sun.az[0], EPHEM.sun.az[1], p), sunAlt, U.uSunDir.value);
    const moonAlt = lerp(EPHEM.moon.alt[0], EPHEM.moon.alt[1], p);
    dirFromAzAlt(lerp(EPHEM.moon.az[0], EPHEM.moon.az[1], p), moonAlt, U.uMoonDir.value);
    // sky colours: keyframed graded-video targets (bible §8.3); level = zenith relative to t0
    skyKey('zen', t, U.uZenith.value);
    skyKey('se', t, U.uHorizonSE.value);
    skyKey('nw', t, U.uHorizonNW.value);
    skyKey('teal', t, U.uTwilight.value);
    skyKey('warm', t, U.uTwilightWarm.value);
    const level = U.uZenith.value.b / ZEN_B0;
    this.level = level;

    // --- atmos cues (sky tint / stars / lightning / cloud cover). No stars were visible on the night
    //     (FACT, bible §8.2): stars only if a cue asks for them; Venus / Jupiter stay (NW twilight)
    let tintAmt = 0,
      starVis = 0,
      cover = 0.3,
      lightningAmt = 0.35 + 0.45 * smoothstep(0.55, 1, p);
    this.tint.setRGB(1, 1, 1);
    const cues = this.app.show.active('atmos', t, this.cueBuf);
    for (const c of cues) {
      const k = clamp((t - c.t) / Math.max(0.01, Number(c.p.fade ?? 2)), 0, 1);
      if (c.fx === 'sky') {
        if (c.p.tint !== undefined) {
          resolveColor(c.p.tint, this.app.palette, this.tmpC, 'primary');
          this.tint.lerp(this.tmpC, k);
          tintAmt = lerp(tintAmt, clamp(Number(c.p.amount ?? 0.5), 0, 1), k);
        }
        if (c.p.stars !== undefined) starVis = lerp(starVis, clamp(Number(c.p.stars), 0, 2), k);
        if (c.p.clouds !== undefined) cover = lerp(cover, clamp(Number(c.p.clouds), 0, 1), k);
      } else if (c.fx === 'lightning') {
        lightningAmt = lerp(lightningAmt, clamp(Number(c.p.intensity ?? 1), 0, 2), k);
      } else if (c.fx === 'clouds') {
        cover = lerp(cover, clamp(Number(c.p.cover ?? 0.5), 0, 1), k);
      }
    }

    // --- clouds: a thin, broken deck ahead of the storm — dark against the sky, faintly lit from the NW
    const L = level;
    U.uCloudDark.value.copy(U.uZenith.value).multiplyScalar(0.6);
    U.uCloudLit.value.copy(U.uHorizonNW.value).multiplyScalar(0.85);
    U.uLevel.value = 1;
    U.uCover.value = cover;
    U.uTime.value = t;
    U.uMoonI.value = 0.9 + 0.1 * smoothstep(7.5, 9, moonAlt);
    U.uHaze.value = clamp(env.haze, 0, 1.5);
    U.uTint.value.copy(this.tint);
    U.uTintAmt.value = tintAmt;
    // sky radiance for glossy world materials (damp concrete, lake)
    const W = worldUniforms;
    W.uWSkyZen.value.copy(U.uZenith.value);
    W.uWSkyHor.value.copy(U.uHorizonSE.value);
    W.uWSkyHorNW.value.copy(U.uHorizonNW.value);
    this.tmpC.copy(U.uTwilight.value).multiplyScalar(0.5);
    W.uWSkyHorNW.value.add(this.tmpC);
    W.uWSunDir.value.copy(U.uSunDir.value);
    W.uWMoonDir.value.copy(U.uMoonDir.value);
    W.uWMoonI.value = 12 * (1 - cover * 0.6);

    // show light on haze / cloud undersides over the stage (tight lobe, see the sky shader)
    const cam = ctx.camera.position;
    this.tmpV.set(0, 22, -12).sub(cam).normalize();
    U.uStageDir.value.copy(this.tmpV);
    const show = clamp(env.stageIntensity * 0.5 + env.audienceWash * 0.3, 0, 3) * 0.04 + env.strobe * 0.04;
    U.uShowCol.value.copy(env.stageColor).multiplyScalar(show);
    // pyro / firework flashes light the haze and the cloud deck
    const fi = env.flashIntensity;
    const fk = flashCompression(fi);
    if (fi > 0) {
      this.tmpV.copy(env.flashPos).sub(cam).normalize();
      U.uFlashDir.value.copy(this.tmpV);
      U.uFlashCol.value.copy(env.flashColor).multiplyScalar(0.02 * fk);
    } else U.uFlashCol.value.setRGB(0, 0, 0);
    // lit smoke over the site: the atmos glow + the bounce of big flashes (see worldLights)
    const glow = env.glowColor;
    const bc = flashBounce(env, this.bounceC);
    U.uGlowCol.value.setRGB(glow.r * 0.05 + bc.r * 0.012, glow.g * 0.05 + bc.g * 0.012, glow.b * 0.05 + bc.b * 0.012);

    // distant lightning over the W horizon (storm front arriving from the west) — deterministic
    const li = this.lightningAt(t, lightningAmt, U.uLightning.value as THREE.Vector4);

    // --- fog colour: dark haze over the polder = the horizon over the stage, lit by flashes / strobes
    const se = U.uHorizonSE.value as THREE.Color;
    this.fog.color.setRGB(se.r * 0.95 + 0.0008, se.g * 0.95 + 0.001, se.b * 0.95 + 0.0015);
    if (fi > 0) {
      this.fog.color.r += env.flashColor.r * 0.0004 * fk;
      this.fog.color.g += env.flashColor.g * 0.0004 * fk;
      this.fog.color.b += env.flashColor.b * 0.0004 * fk;
    }
    // the haze itself takes the colour of the lit smoke (distant trees / terrain glow with the site);
    // with `smoke` the air is full of it and the veil is as bright as the light it scatters
    const sm = clamp(env.smoke, 0, 1);
    const gk = 0.03 + 0.4 * sm;
    this.fog.color.r += glow.r * gk + bc.r * 0.006;
    this.fog.color.g += glow.g * gk + bc.g * 0.006;
    this.fog.color.b += glow.b * gk + bc.b * 0.006;
    U.uSmoke.value = sm;
    const sb = env.strobe * 0.01;
    this.fog.color.r += sb;
    this.fog.color.g += sb;
    this.fog.color.b += sb;
    U.uFogColor.value.copy(this.fog.color);
    // atmos.glow `smoke`: the site fills with smoke (red smoke v1510–1537, pink whiteout v76)
    this.fog.density = this.fogBase * (0.75 + 0.45 * clamp(env.haze, 0, 1.5)) * (1 + 7 * env.smoke);
    (this.app.scene.background as THREE.Color).copy(this.fog.color);

    // --- lights (sky ambient follows the sky; the moon keeps a floor of cool-warm fill)
    const hl = 0.3 + 0.7 * Math.pow(L, 0.7);
    this.hemi.color.setRGB(0.16 * hl, 0.3 * hl, 0.64 * hl);
    this.hemi.groundColor.setRGB(0.04 * hl, 0.032 * hl, 0.024 * hl);
    this.hemi.intensity = 0.34;
    this.moonLight.position.copy(U.uMoonDir.value).multiplyScalar(500);
    this.moonLight.intensity = 0.14 * smoothstep(0, 1, 1 - cover * 0.6);
    this.twilightLight.position.copy(this.sunDir).setY(0.18).normalize().multiplyScalar(500);
    const tw = U.uTwilight.value.b / SKY_KEYS.teal[0][2];
    this.twilightLight.intensity = 0.22 * tw + 0.015;
    // flash and lightning also light the whole scene a little
    if (fi > 0) {
      this.hemi.color.r += env.flashColor.r * 0.002 * fk;
      this.hemi.color.g += env.flashColor.g * 0.002 * fk;
      this.hemi.color.b += env.flashColor.b * 0.002 * fk;
    }
    if (li > 0) this.hemi.color.addScalar(li * 0.05);
    // site glow on everything lit by the sky dome (set, props without the world-light patch)
    this.hemi.color.r += glow.r * 0.3 + bc.r * 0.05;
    this.hemi.color.g += glow.g * 0.3 + bc.g * 0.05;
    this.hemi.color.b += glow.b * 0.3 + bc.b * 0.05;

    // --- stars / planets
    const S = this.starU;
    S.uTime.value = t;
    S.uCover.value = cover;
    // stars only when a cue asks (none were visible on the night); planets low in the NW twilight
    S.uVis.value = starVis * 6 * (0.35 + 0.65 * smoothstep(1, 0.2, L));
    S.uPlanetVis.value = 3.5;
    S.uPx.value = Math.max(1, this.app.renderer.getPixelRatio());
    // sidereal rotation about the celestial pole relative to the 22:53 catalogue epoch
    const ang = ((t - 780) / 86164) * Math.PI * 2;
    this.rotM.makeRotationAxis(this.poleAxis, -ang);
    this.sidereal.setFromMatrix4(this.rotM);
    const pos = this.stars.geometry.getAttribute('position') as THREE.BufferAttribute;
    const n = pos.count;
    dirFromAzAlt(lerp(EPHEM.venus.az[0], EPHEM.venus.az[1], p), lerp(EPHEM.venus.alt[0], EPHEM.venus.alt[1], p), this.tmpV);
    pos.setXYZ(n - 2, this.tmpV.x, this.tmpV.y, this.tmpV.z);
    dirFromAzAlt(lerp(EPHEM.jupiter.az[0], EPHEM.jupiter.az[1], p), lerp(EPHEM.jupiter.alt[0], EPHEM.jupiter.alt[1], p), this.tmpV);
    pos.setXYZ(n - 1, this.tmpV.x, this.tmpV.y, this.tmpV.z);
    pos.needsUpdate = true;

    this.stats_.level = Math.round(L * 1000) / 1000;
    this.stats_.sunAlt = Math.round(sunAlt * 100) / 100;
    this.stats_.moonAlt = Math.round(moonAlt * 100) / 100;
    this.stats_.cover = cover;
    this.stats_.lightning = Math.round(li * 100) / 100;
  }

  /** deterministic distant lightning: events every ~20–70 s, multi-stroke flicker, W–NW horizon */
  private lightningAt(t: number, amount: number, out: THREE.Vector4): number {
    if (amount <= 0) {
      out.w = 0;
      return 0;
    }
    // fixed 16 s grid (seek-stable); `amount` only sets how many slots carry a strike and how bright
    const slot = 16;
    const k = Math.floor(t / slot);
    let best = 0;
    for (let j = k - 1; j <= k; j++) {
      const h = hash32(j * 2654435761 + 12345);
      if ((h & 0xff) / 255 > 0.12 + 0.4 * Math.min(1, amount)) continue; // not every slot has a strike
      const t0 = j * slot + ((h >>> 8) & 0xffff) / 65535 * slot * 0.8;
      const dt = t - t0;
      if (dt < 0 || dt > 1.2) continue;
      // 2–4 return strokes
      const strokes = 2 + ((h >>> 24) % 3);
      let v = 0;
      for (let s = 0; s < strokes; s++) {
        const ts = s * (0.09 + ((h >>> (s * 3)) & 7) * 0.02);
        const x = dt - ts;
        if (x >= 0) v = Math.max(v, Math.exp(-x * 18) * (1 - s * 0.18));
      }
      v += Math.exp(-dt * 3) * 0.15;
      if (v > best) {
        best = v;
        const az = 245 + (((h >>> 4) & 0xff) / 255) * 55;
        dirFromAzAlt(az, 2 + ((h >>> 12) & 0xf) * 0.5, this.tmpV);
        out.set(this.tmpV.x, this.tmpV.y, this.tmpV.z, 0);
      }
    }
    out.w = best * amount * 0.6;
    return out.w;
  }

  setQuality(q: QualitySettings): void {
    this.q = q;
    const byLevel: Record<string, number> = { ultra: 0.0011, high: 0.00125, medium: 0.0014, mobile: 0.0019 };
    this.fogBase = byLevel[q.level] ?? 0.0013;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.sky) this.sky.visible = on;
    if (this.stars) this.stars.visible = on;
  }

  /** current sky luminance factor (1 at 22:40, lower later) — for other world systems */
  get skyLevel(): number {
    return this.level;
  }

  stats(): Record<string, number | string> {
    return { ...this.stats_, fog: this.fog ? this.fog.density.toFixed(5) : 0 };
  }
}
