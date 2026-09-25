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

/**
 * Light arriving at a point from the show (stage rig + pyro/firework flashes), used to light smoke.
 * Soft-clamped: smoke glows in the show's colour but stays well below the sources, so drops keep
 * their contrast instead of turning into one uniformly lit fog.
 */
vec3 envLight(vec3 p) {
  vec3 q = (p - vec3(0.0, 12.0, -10.0)) * vec3(0.011, 0.028, 0.02);
  float stageF = 1.0 / (1.0 + dot(q, q) * 1.5);
  vec3 df = p - uFlashPos;
  float flashF = 1.0 / (1.0 + dot(df, df) * (1.0 / 4900.0));
  vec3 L = uAmbient + (uStageLight * 0.6 + uStageWash * 0.35) * stageF + uFlashCol * flashF * 0.45;
  float m = max(L.r, max(L.g, L.b));
  return m > 0.6 ? L * ((0.6 + (m - 0.6) * 0.35) / m) : L;
}

#define CULL() { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
`;
