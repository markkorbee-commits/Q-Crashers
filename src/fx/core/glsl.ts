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

// lighting bus (LightEnv) for lit smoke
uniform vec3 uAmbient;
uniform vec3 uStageLight;
uniform vec3 uStageWash;
uniform vec3 uFlashCol;
uniform vec3 uFlashPos;

// pyro light field (FxLights.ts): line-segment sources A..B, xyz + reach (A.w), colour * intensity
#define FX_MAX_LIGHTS 12
uniform vec4 uFxLA[FX_MAX_LIGHTS];
uniform vec4 uFxLB[FX_MAX_LIGHTS];
uniform vec4 uFxLC[FX_MAX_LIGHTS];
uniform int uFxLN;
uniform vec3 uFxGlow;
// the 8 lantern crystals on the field (xyz + chase level) and their colour * intensity
uniform vec4 uLampPos[8];
uniform vec3 uLampCol;

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
  vec3 df = p - uFlashPos;
  float flashF = 1.0 / (1.0 + dot(df, df) * (1.0 / 4900.0));
  vec3 L = uAmbient + (uStageLight * 0.6 + uStageWash * 0.35) * stageF + uFlashCol * flashF * 0.3;
  // smoke drifting past a lantern crystal glows in its colour (the puffing crystals of v146 / v206)
  for (int i = 0; i < 8; i++) {
    vec3 d = p - uLampPos[i].xyz;
    L += uLampCol * (uLampPos[i].w * 16.0 / (dot(d, d) + 16.0));
  }
  L = kneeC(L, 0.6, 0.35);
  return L + kneeC(fxLight(p, 1.0) + uFxGlow, 2.2, 0.3);
}

#define CULL() { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
`;
