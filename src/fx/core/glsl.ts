/**
 * Shared GLSL for the analytic particle layers (compiled as GLSL ES 3.00 by three.js).
 * Record layout: see Emitter.ts (R.*). Keep offsets in sync.
 */
export const GLSL_COMMON = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D uEmit;
uniform sampler2D uSlots;
uniform int uSlotSize;
uniform int uSlotTexW;
uniform float uTime;
uniform vec3 uWind;
uniform vec2 uHalfRes;
uniform float uProjScale;
uniform float uMinPx;
uniform float uFogDensity;
// photosensitivity option (flashSafety.ts): 1 = strobes / flicker hold their average, bursts swell in softly
uniform float uCalm;

// lighting bus (LightEnv) for lit smoke
uniform vec3 uAmbient;
uniform vec3 uStageLight;
uniform vec3 uStageWash;
uniform vec3 uFlashCol;
uniform vec3 uFlashPos;
// RMS distance² (m²) of this frame's flash sources from uFlashPos (LightEnv.flashSpread²)
uniform float uFlashSpread2;

// pyro light field (FxLights.ts): line-segment sources A..B, xyz + reach (A.w), colour * intensity
#define FX_MAX_LIGHTS 12
uniform vec4 uFxLA[FX_MAX_LIGHTS];
uniform vec4 uFxLB[FX_MAX_LIGHTS];
uniform vec4 uFxLC[FX_MAX_LIGHTS];
uniform int uFxLN;
uniform vec3 uFxGlow;
// atmos.glow: site-wide coloured light (app.env.glowColor, premultiplied) and site smoke 0..1
uniform vec3 uSiteGlow;
uniform float uSiteSmoke;
// the 8 lantern crystals on the field (xyz + chase level) and their colour * intensity
uniform vec4 uLampPos[8];
uniform vec3 uLampCol;
// beam light held by the low fog bank (LightEnv.lowFogLight: colour x level, premultiplied), the centre of the lit
// part of the bank (world m, y = its floor + ~1 m) and its RMS spread (x, z m); uLowFogGain = calibration
uniform vec3 uLowFogLight;
uniform vec3 uLowFogPos;
uniform vec2 uLowFogSpread;
uniform float uLowFogGain;

#define DIST_SPHERE 0
#define DIST_CONE 1
#define DIST_RING 2
#define DIST_FAN 3
#define DIST_LINE 4
#define DIST_HEMI 5
#define DIST_SINGLE 6
#define DIST_BOX 7

#define F_CONTINUOUS 1
#define F_STROBE 2
#define F_CROSSETTE 4
#define F_POPS 8
#define F_COOL 16
#define F_PEARL 32
#define F_PISTIL 64
#define F_COLORCHANGE 128
#define F_FLICKER 256
#define F_SERPENT 512
#define F_ZIPPER 1024
#define F_FLAT 2048
#define F_RAMP 4096
#define F_SELFLIT 8192
#define F_ABSCHANGE 16384
#define F_CUT 262144
// round 12: a fountain whose valve closed (F_CUT, HZ = the show time) is dark within SPARK_CUT s: the
// sparks in flight burn out instead of raining down for another 1-2 s (v613.75: the gerb ring is gone)
#define SPARK_CUT 0.3

// round 12: white-hot heads of titanium / charcoal sparks, stars and comets (the camera clips them to
// white): the near-neutral head colour, the x of their HDR core, and how far a young white / gold
// head turns to WHITE_HOT (metal-salt colours keep their hue)
#define WHITE_HOT vec3(1.0, 0.96, 0.9)
#define HOT_K 3.0
// light of the core profile relative to the soft body profile of a ribbon (mean exp(-11 r2) / mean exp(-3 r2) - 0.05)
#define CORE_SHARE 0.34
#define WH_WHITE 0.9
#define WH_GOLD 0.6
// trail age (x the trail length) over which a white-hot head cools back to the spark colour
#define HEAT_TRAIL 0.5
// sensor clipping: a white / gold spark whose own HDR level (scene units) passes CLIP_LO .. CLIP_HI records white
#define CLIP_LO 5.0
#define CLIP_HI 24.0
// ... and the trail fraction over which that clipping fades out behind the head
#define CLIP_TRAIL 0.3
// ... and the extra brightness of the white-hot core of a hydrocarbon flame puff (puffShader flameRamp)
#define FLAME_HOT 1.5
// minimum on-screen radius of a burning puff (x uMinPx) and the light law of a grown one (puffShader)
#define PUFF_MIN_PX 1.6
#define PUFF_SUBPX_LAW 1.0

uint hashu(uint x) {
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}
// 24-bit precision uniform float in [0,1) (matches hf() in Emitter.ts)
float hf(uint x) { return float(hashu(x) >> 8u) * (1.0 / 16777216.0); }
float rnd(uint key, uint n) { return hf(key ^ (n * 0x9e3779b9u + 0x632be5abu)); }

vec3 ballistic(vec3 p0, vec3 v0, float k, vec3 acc, float t) {
  vec3 vT = acc / k;
  return p0 + vT * t + (v0 - vT) * ((1.0 - exp(-k * t)) / k);
}
vec3 ballisticVel(vec3 v0, float k, vec3 acc, float t) {
  vec3 vT = acc / k;
  return vT + (v0 - vT) * exp(-k * t);
}

vec3 orthoA(vec3 n) {
  return normalize(abs(n.y) < 0.95 ? cross(n, vec3(0.0, 1.0, 0.0)) : cross(n, vec3(1.0, 0.0, 0.0)));
}
vec3 coneDir(vec3 axis, float spread, float u, float v) {
  float ct = mix(cos(spread), 1.0, u);
  float st = sqrt(max(0.0, 1.0 - ct * ct));
  float ph = 6.2831853 * v;
  vec3 a = orthoA(axis);
  vec3 b = cross(axis, a);
  return normalize(axis * ct + (a * cos(ph) + b * sin(ph)) * st);
}
vec3 fibDir(int i, int n, float rot) {
  float y = 1.0 - 2.0 * (float(i) + 0.5) / float(max(n, 1));
  float r = sqrt(max(0.0, 1.0 - y * y));
  float ph = float(i) * 2.39996323 + rot;
  return vec3(r * cos(ph), y, r * sin(ph));
}

/**
 * Recorded particle index of drawn instance i of an emitter the layer thinned (FxLayer: fewer drawn
 * than recorded). mul = golden-ratio permutation multiplier (slot texel .w): the first n of the
 * permuted indices are an evenly spread, nested subset. Directions, phases and timing always use the
 * recorded count, so thinning never moves or re-times a particle.
 */
int particleIndex(int i, float mul, int nRec) {
  uint a = uint(mul + 0.5);
  return a > 1u ? int((uint(i) * a) % uint(max(nRec, 1))) : i;
}

/**
 * Emission time of particle i. Continuous emitters recycle the index every lifeMax seconds
 * during [t0, t0 + emitDur]. Returns false when the particle has not been born.
 */
bool emitTime(float t0, float emitDur, float lifeMax, float stagger, int i, int n, uint seed, bool continuous, out float te, out uint cyc) {
  cyc = 0u;
  if (continuous) {
    float P = max(lifeMax, 0.02);
    float ph = (float(i) + hf(seed ^ hashu(uint(i) + 17u)) * 0.999) / float(max(n, 1));
    float c = floor((uTime - t0) / P - ph);
    float cmax = floor(emitDur / P - ph);
    c = min(c, cmax);
    if (c < 0.0) return false;
    te = t0 + (c + ph) * P;
    cyc = uint(c) + 1u;
  } else {
    te = t0 + stagger * float(i);
  }
  return uTime >= te;
}

float fogT(float dist) {
  float d = uFogDensity * dist;
  return exp(-d * d);
}

float segDist2(vec3 p, vec3 a, vec3 b) {
  vec3 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  vec3 d = p - a - ab * t;
  return dot(d, d);
}

/**
 * Light of the burning pyro at p (sum over the light field, Lorentzian falloff with each light's
 * reach scaled by reach): smoke next to a flame row glows orange, a pink gerb wall turns its own
 * smoke pink, and the far side of the field stays dark.
 */
vec3 fxLight(vec3 p, float reach) {
  vec3 L = vec3(0.0);
  for (int i = 0; i < FX_MAX_LIGHTS; i++) {
    if (i >= uFxLN) break;
    float r = uFxLA[i].w * reach;
    float d2 = segDist2(p, uFxLA[i].xyz, uFxLB[i].xyz);
    L += uFxLC[i].rgb * (r * r / (d2 + r * r));
  }
  return L;
}

/**
 * Light of the moving-head beams held by the low fog bank at p (round 9): the beams that run down into a
 * fog.lowfog bank light it where they pass (v802.75: white floor beams turn the white bank into a bright white
 * band). A gaussian around the lit part of the bank (its RMS spread, at least ~8 x 6 m), only in the bank's
 * lower metres (the bank top lies ~2 m over its floor; smoke higher up is not in the lit layer).
 */
vec3 lowFogLit(vec3 p) {
  vec2 s = sqrt(uLowFogSpread * uLowFogSpread + vec2(64.0, 36.0));
  vec2 d = (p.xz - uLowFogPos.xz) / s;
  float h = 1.0 - smoothstep(uLowFogPos.y + 0.4, uLowFogPos.y + 2.4, p.y);
  return uLowFogLight * (uLowFogGain * h * exp(-0.5 * dot(d, d)));
}

/** soft knee: linear up to k, then compressed (keeps the hue) */
vec3 kneeC(vec3 L, float k, float slope) {
  float m = max(L.r, max(L.g, L.b));
  return m > k ? L * ((k + (m - k) * slope) / m) : L;
}

/**
 * Light arriving at a point from the show (stage rig + flash centroid + the pyro light field), used
 * to light smoke. The rig part is soft-clamped low (drops keep their contrast instead of one
 * uniformly lit fog); the pyro part may get much brighter — smoke hanging in a flame wall glows.
 */
vec3 envLight(vec3 p) {
  vec3 q = (p - vec3(0.0, 12.0, -10.0)) * vec3(0.011, 0.028, 0.02);
  float stageF = 1.0 / (1.0 + dot(q, q) * 1.5);
  // flash term: the centroid of spread-out sources (a burst on both arm ends, X ±94) is not a source
  // itself — every source is at least ~spread away from a point near the centroid, so the falloff
  // uses d² + spread² (smoke in the middle of the field stays dark, smoke at a source stays lit
  // through the pyro light field)
  vec3 df = p - uFlashPos;
  float flashF = 1.0 / (1.0 + (dot(df, df) + uFlashSpread2) * (1.0 / 4900.0));
  // (the flash share on smoke is small: the smoke right at a burst, a flare or a comet row is lit by
  // the pyro light field; this term is only the far glow of the site's flashes, v264.75)
  vec3 L = uAmbient + (uStageLight * 0.6 + uStageWash * 0.35) * stageF + uFlashCol * flashF * 0.2;
  // smoke drifting past a lantern crystal glows in its colour (the puffing crystals of v146 / v206)
  for (int i = 0; i < 8; i++) {
    vec3 d = p - uLampPos[i].xyz;
    L += uLampCol * (uLampPos[i].w * 16.0 / (dot(d, d) + 16.0));
  }
  L = kneeC(L, 0.6, 0.35);
  // the site glow (atmos.glow: the red smoke over the whole grounds, the pink whiteout) lights every
  // bit of smoke like the pyro light field does; so do the beams held by the low fog bank (outside the
  // rig's low knee: a bank lit by a dozen white beams glows white, not grey)
  return L + kneeC(fxLight(p, 1.0) + uFxGlow + uSiteGlow * 1.1 + lowFogLit(p), 2.2, 0.3);
}

/**
 * Round 12: sensor clipping of a bright emitter. A white / gold / warm source far brighter than the
 * camera's white records as white whatever its hue (all three channels clip): past CLIP_LO (scene
 * units, x k) the colour runs to WHITE_HOT at the same peak. Saturated metal-salt / lit colours
 * (red, pink, blue ...) keep their hue, as in the spark shaders.
 */
vec3 clipWhite(vec3 c, float k) {
  float m = max(c.r, max(c.g, c.b));
  vec3 hn = c / max(m, 1e-4);
  float sat = 1.0 - min(hn.r, min(hn.g, hn.b));
  float goldC = step(hn.b, hn.g + 0.02) * step(hn.g, hn.r + 0.02) * smoothstep(0.12, 0.3, hn.g);
  float s2 = sat * sat * (1.0 - goldC);
  return mix(c, WHITE_HOT * m, (1.0 - s2) * smoothstep(CLIP_LO, CLIP_HI, m * k));
}

#define CULL() { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
`;
