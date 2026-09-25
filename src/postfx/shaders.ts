/**
 * GLSL ES 3.00 sources of the HDR post chain (used with RawShaderMaterial + GLSL3).
 * All passes draw one fullscreen triangle. Colour values are linear, scene-referred HDR until the
 * composite pass tone maps and encodes to sRGB.
 */

const HEADER = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;
#define LUMA vec3(0.2126, 0.7152, 0.0722)
float maxc(vec3 c) { return max(c.r, max(c.g, c.b)); }
float minc(vec3 c) { return min(c.r, min(c.g, c.b)); }
/** kill NaN/Inf from misbehaving materials before they spread through the blur chain */
vec3 sanitize(vec3 c) { return (any(isnan(c)) || any(isinf(c))) ? vec3(0.0) : clamp(c, 0.0, 16384.0); }
`;

export const VERT = /* glsl */ `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Jimenez (CoD:AW, 2014) 13-tap downsample: 5 overlapping 2x2 boxes. */
const DOWN13 = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uSpread;
in vec2 vUv;
vec3 tap(vec2 o) { return texture(tSrc, vUv + o * uTexel * uSpread).rgb; }
/** b0 = centre box (weight 0.5), b1..b4 = corner boxes (0.125 each) */
void gather13(out vec3 b0, out vec3 b1, out vec3 b2, out vec3 b3, out vec3 b4) {
  vec3 a = tap(vec2(-2.0, 2.0)), b = tap(vec2(0.0, 2.0)), c = tap(vec2(2.0, 2.0));
  vec3 d = tap(vec2(-2.0, 0.0)), e = tap(vec2(0.0)), f = tap(vec2(2.0, 0.0));
  vec3 g = tap(vec2(-2.0, -2.0)), h = tap(vec2(0.0, -2.0)), i = tap(vec2(2.0, -2.0));
  vec3 j = tap(vec2(-1.0, 1.0)), k = tap(vec2(1.0, 1.0)), l = tap(vec2(-1.0, -1.0)), m = tap(vec2(1.0, -1.0));
  b0 = (j + k + l + m) * 0.25; b1 = (a + b + d + e) * 0.25; b2 = (b + c + e + f) * 0.25;
  b3 = (d + e + g + h) * 0.25; b4 = (e + f + h + i) * 0.25;
}
`;

/**
 * First downsample of the HDR frame (MRT):
 *  out0 = plain blurred scene (blur / tunnel / DOF chain)
 *  out1 = exposure-scaled, soft-knee thresholded bright pass with soft Karis weighting (bloom chain).
 * The threshold differs per side of the compare split.
 */
export const PREFILTER = /* glsl */ `${HEADER}${DOWN13}
uniform vec4 uThreshold; // sober: threshold, knee | altered: threshold, knee
uniform vec2 uExposure;  // sober, altered
uniform float uSplit;
uniform float uKaris;
layout(location = 0) out vec4 oScene;
layout(location = 1) out vec4 oBright;
vec3 bright(vec3 c, vec2 tk) {
  float br = maxc(c);
  float rq = clamp(br - tk.x + tk.y, 0.0, 2.0 * tk.y);
  rq = rq * rq / (4.0 * tk.y + 1e-4);
  return c * (max(rq, br - tk.x) / max(br, 1e-4));
}
float karis(vec3 c) { return 1.0 / (1.0 + uKaris * dot(c, LUMA)); }
void main() {
  vec3 b0, b1, b2, b3, b4;
  gather13(b0, b1, b2, b3, b4);
  b0 = sanitize(b0); b1 = sanitize(b1); b2 = sanitize(b2); b3 = sanitize(b3); b4 = sanitize(b4);
  oScene = vec4(b0 * 0.5 + (b1 + b2 + b3 + b4) * 0.125, 1.0);
  bool altered = uSplit < 0.0 || vUv.x >= uSplit;
  float ex = altered ? uExposure.y : uExposure.x;
  vec2 tk = altered ? uThreshold.zw : uThreshold.xy;
  b0 = bright(b0 * ex, tk); b1 = bright(b1 * ex, tk); b2 = bright(b2 * ex, tk);
  b3 = bright(b3 * ex, tk); b4 = bright(b4 * ex, tk);
  float w0 = karis(b0) * 0.5, w1 = karis(b1) * 0.125, w2 = karis(b2) * 0.125, w3 = karis(b3) * 0.125, w4 = karis(b4) * 0.125;
  oBright = vec4((b0 * w0 + b1 * w1 + b2 * w2 + b3 * w3 + b4 * w4) / (w0 + w1 + w2 + w3 + w4), 1.0);
}
`;

export const DOWNSAMPLE = /* glsl */ `${HEADER}${DOWN13}
out vec4 fragColor;
void main() {
  vec3 b0, b1, b2, b3, b4;
  gather13(b0, b1, b2, b3, b4);
  fragColor = vec4(b0 * 0.5 + (b1 + b2 + b3 + b4) * 0.125, 1.0);
}
`;

/** 3x3 tent upsample of the lower level + weighted add of the current level. */
export const UPSAMPLE = /* glsl */ `${HEADER}
uniform sampler2D tLow;
uniform sampler2D tCur;
uniform vec2 uLowTexel;
uniform float uRadius;
uniform float uLowWeight;
uniform float uCurWeight;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec2 o = uLowTexel * uRadius;
  vec3 s = texture(tLow, vUv).rgb * 4.0;
  s += (texture(tLow, vUv + vec2(-o.x, 0.0)).rgb + texture(tLow, vUv + vec2(o.x, 0.0)).rgb +
        texture(tLow, vUv + vec2(0.0, -o.y)).rgb + texture(tLow, vUv + vec2(0.0, o.y)).rgb) * 2.0;
  s += texture(tLow, vUv - o).rgb + texture(tLow, vUv + o).rgb +
       texture(tLow, vUv + vec2(-o.x, o.y)).rgb + texture(tLow, vUv + vec2(o.x, -o.y)).rgb;
  fragColor = vec4(s * (uLowWeight / 16.0) + texture(tCur, vUv).rgb * uCurWeight, 1.0);
}
`;

/**
 * Visual persistence feedback (HDR, before bloom so trails glow too):
 * bright echoes decay geometrically ("light painting"), plus a little true smear.
 */
export const TRAILS = /* glsl */ `${HEADER}
uniform sampler2D tCur;
uniform sampler2D tPrev;
uniform vec2 uPersist; // per-frame persistence: sober, altered
uniform float uSplit;
uniform float uSmear;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec3 cur = sanitize(texture(tCur, vUv).rgb);
  vec3 prev = texture(tPrev, vUv).rgb;
  float k = (uSplit < 0.0 || vUv.x >= uSplit) ? uPersist.y : uPersist.x;
  vec3 o = max(mix(cur, prev, k * uSmear), prev * k);
  fragColor = vec4(min(o, vec3(4096.0)), 1.0);
}
`;

/**
 * Retinal bleaching buffer: charges instantly from strong light, decays slowly (rgb, 0..1).
 * alpha = ghost strength: bleached areas that are no longer lit (seen in the complementary colour).
 */
export const AFTERIMAGE = /* glsl */ `${HEADER}
uniform sampler2D tBright;
uniform sampler2D tPrev;
uniform float uDecay;
uniform float uFloor;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec3 b = max(texture(tBright, vUv).rgb - uFloor, 0.0);
  b /= 1.0 + maxc(b);
  vec3 a = max(texture(tPrev, vUv).rgb * uDecay, b);
  fragColor = vec4(a, max(maxc(a) - maxc(b) * 1.15, 0.0));
}
`;

/** Star / anamorphic glare streaks from the bright pass (light sensitivity, dilated pupils). */
export const GLARE = /* glsl */ `${HEADER}
#ifndef AXES
#define AXES 3
#endif
#ifndef TAPS
#define TAPS 10
#endif
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform vec2 uDir[AXES];
uniform float uFalloff[AXES];
uniform float uGain;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec3 acc = vec3(0.0);
  for (int a = 0; a < AXES; a++) {
    vec2 d = uDir[a] * uTexel;
    float fo = uFalloff[a];
    for (int i = 1; i <= TAPS; i++) {
      float fi = float(i);
      float w = exp2(-fi * fo);
      acc += (texture(tSrc, vUv + d * fi).rgb + texture(tSrc, vUv - d * fi).rgb) * w;
    }
  }
  fragColor = vec4(acc * uGain, 1.0);
}
`;

/** Shared depth helpers (perspective depth -> positive view distance) and circle of confusion. */
const DEPTH = /* glsl */ `
uniform vec2 uClip;  // near, far
uniform vec4 uDof;   // focus distance (m), coc scale (px), max coc (px), unused
float viewZ(float d) {
  float z = d * 2.0 - 1.0;
  return 2.0 * uClip.x * uClip.y / (uClip.y + uClip.x - z * (uClip.y - uClip.x));
}
float cocPx(float z) { return min(uDof.y * abs(1.0 - uDof.x / max(z, 1e-3)), uDof.z); }
`;

/**
 * Bokeh depth of field, gather at base resolution (scatter-as-gather, golden-angle spiral).
 * A sparse ring probe finds blurry foreground so it can bleed over sharper background.
 * out.a = kernel radius (px) used by the composite to blend sharp -> blurred.
 */
export const DOF = /* glsl */ `${HEADER}${DEPTH}
#ifndef SAMPLES
#define SAMPLES 48
#endif
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  float zc = viewZ(texture(tDepth, vUv).r);
  float cc = cocPx(zc);
  float R = cc;
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 0.5236 + 0.2;
    float rad = uDof.z * (i < 6 ? 0.45 : 0.95);
    vec2 o = vec2(cos(a), sin(a)) * rad;
    float zs = viewZ(texture(tDepth, vUv + o * uTexel).r);
    if (zs < zc) { float cs = cocPx(zs); if (cs > rad * 0.8) R = max(R, cs); }
  }
  vec3 acc = texture(tColor, vUv).rgb;
  float wsum = 1.0;
  if (R > 0.5) {
    float rot = ign(gl_FragCoord.xy) * 6.2831853;
    for (int i = 0; i < SAMPLES; i++) {
      float fi = float(i) + 0.5;
      float r = sqrt(fi / float(SAMPLES)) * R;
      float a = fi * 2.3999632 + rot;
      vec2 suv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
      float zs = viewZ(texture(tDepth, suv).r);
      float cs = cocPx(zs);
      if (zs > zc) cs = min(cs, cc * 1.5 + 0.5);
      float w = smoothstep(r - 1.0, r + 0.5, cs);
      acc += texture(tColor, suv).rgb * w;
      wsum += w;
    }
  }
  fragColor = vec4(acc / wsum, R);
}
`;

/**
 * The composite: warps -> sharp image (motion blur, chroma) -> double vision -> DOF -> blur/tunnel
 * -> exposure -> energy-conserving bloom, glare, afterimage -> vignette -> grading -> hue-preserving
 * tone map -> contrast -> sRGB + grain + dither -> compare divider.
 * Perception params come as two sets (sober A / altered B) selected per pixel by the compare split.
 */
export const COMPOSITE = /* glsl */ `${HEADER}${DEPTH}
#ifndef MB_SAMPLES
#define MB_SAMPLES 8
#endif
uniform sampler2D tScene;
uniform sampler2D tDepth;
uniform sampler2D tD1;
uniform sampler2D tD2;
uniform sampler2D tD3;
uniform sampler2D tBloom;
uniform sampler2D tGlare;
uniform sampler2D tAfter;
uniform sampler2D tDof;
uniform vec4 uRes;       // w, h, 1/w, 1/h
uniform vec4 uD2Size;    // w, h, 1/w, 1/h
uniform vec4 uD3Size;
uniform vec4 uAfterSize;
uniform vec4 uBaseSize;
uniform float uLodScale; // blur chain starts at 1/2 res (1) or 1/4 res on mobile (< 1)
uniform float uTime;
uniform float uFrame;
uniform float uSplit;
uniform vec4 uA0, uA1, uA2, uA3;  // sober params
uniform vec4 uB0, uB1, uB2, uB3;  // altered params
uniform vec4 uThr;       // bloom threshold/knee: sober xy, altered zw
uniform vec2 uBloom;     // strength, enabled
uniform vec4 uLook;      // exposure, vignette, grain, unused
uniform vec4 uFeat;      // glare gain, afterimage on, dof on, base motion blur
uniform vec2 uMB;        // velocity scale (shutter / dt), max length (uv)
uniform mat4 uInvViewProj;
uniform mat4 uPrevViewProj;
uniform vec4 uRhythm;    // breath 0..1, kick 0..1
uniform vec4 uTone;      // Lottes curve: a, d, b, c
uniform vec4 uTone2;     // crosstalk, cross saturation, saturation, unused
in vec2 vUv;
out vec4 fragColor;

// ---------- helpers ----------
vec3 hash3(vec3 p) {
  uvec3 v = uvec3(ivec3(p)) * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return vec3(v) * (1.0 / 4294967295.0);
}

vec4 cubicW(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x, y = s.y - 4.0 * s.x, z = s.z - 4.0 * s.y + 6.0 * s.x;
  return vec4(x, y, z, 6.0 - x - y - z) * (1.0 / 6.0);
}
/** B-spline bicubic from 4 bilinear taps: smooth upsampling of coarse buffers */
vec4 bicubic4(sampler2D t, vec2 uv, vec4 size) {
  vec2 st = uv * size.xy - 0.5;
  vec2 f = fract(st);
  st -= f;
  vec4 xc = cubicW(f.x), yc = cubicW(f.y);
  vec4 c = st.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 o = (c + vec4(xc.yw, yc.yw) / s) * size.zzww;
  vec4 s0 = texture(t, o.xz), s1 = texture(t, o.yz), s2 = texture(t, o.xw), s3 = texture(t, o.yw);
  float sx = s.x / (s.x + s.y), sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}
vec3 bicubic(sampler2D t, vec2 uv, vec4 size) { return bicubic4(t, uv, size).rgb; }

vec3 fetch(vec2 uv, float chroma) {
  if (chroma < 0.001) return texture(tScene, uv).rgb;
  vec2 d = (uv - 0.5) * chroma * 0.018;
  return vec3(texture(tScene, uv + d).r, texture(tScene, uv).g, texture(tScene, uv - d).b);
}

vec3 motionBlurred(vec2 uv, float amount, float chroma) {
#if MB_SAMPLES == 0
  return fetch(uv, chroma);
#else
  float d = texture(tDepth, uv).r;
  vec4 wp = uInvViewProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  wp /= wp.w;
  vec4 pp = uPrevViewProj * wp;
  if (pp.w <= 0.0) return fetch(uv, chroma);
  vec2 vel = (uv - (pp.xy / pp.w * 0.5 + 0.5)) * uMB.x * amount;
  float len = length(vel);
  if (len > uMB.y) vel *= uMB.y / len;
  if (len * uRes.x < 1.0) return fetch(uv, chroma);
  float jit = hash3(vec3(gl_FragCoord.xy, uFrame)).x;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < MB_SAMPLES; i++) {
    float t = (float(i) + jit) / float(MB_SAMPLES) - 0.5;
    acc += fetch(uv + vel * t, chroma);
  }
  return acc / float(MB_SAMPLES);
#endif
}

vec3 blurLayer(vec2 uv, float lod) {
  vec3 a = texture(tD1, uv).rgb;
  if (lod <= 1.0) return a;
  vec3 b = bicubic(tD2, uv, uD2Size);
  if (lod <= 2.0) return mix(a, b, lod - 1.0);
  return mix(b, bicubic(tD3, uv, uD3Size), min(lod - 2.0, 1.0));
}

/** slow, low-frequency screen swim (alcohol): gentle on purpose (0.03-0.09 Hz) */
vec2 wobbleOffset(vec2 uv, float w, float aspect) {
  float t = uTime;
  vec2 o = vec2(
    sin(uv.y * 3.7 + t * 0.53) * 0.6 + sin(uv.y * 6.9 - t * 0.37 + 1.3) * 0.4,
    sin(uv.x * 3.1 - t * 0.47 + 0.7) * 0.6 + sin(uv.x * 5.7 + t * 0.31) * 0.4) * 0.0035;
  vec2 c = (uv - 0.5) * vec2(aspect, 1.0);
  float ang = sin(t * 0.19) * 0.014 + sin(t * 0.07 + 2.0) * 0.008;
  vec2 rc = vec2(c.x * cos(ang) - c.y * sin(ang), c.x * sin(ang) + c.y * cos(ang));
  float zoom = 1.0 - 0.012 * (0.5 + 0.5 * sin(t * 0.29));
  vec2 rot = (rc * zoom - c) / vec2(aspect, 1.0);
  return (o + rot + vec2(sin(t * 0.23), cos(t * 0.17)) * 0.0025) * w;
}

/** breathing hexagonal quasi-lattice + 6-fold radial ripple (visual overload) */
vec2 patternOffset(vec2 cp, float r, float w, float aspect) {
  float t = uTime;
  float breath = uRhythm.x;
  float f = 17.0 + 5.0 * breath;
  vec2 g = vec2(0.0);
  for (int k = 0; k < 3; k++) {
    float a = float(k) * 2.0943951 + t * 0.021;
    vec2 d = vec2(cos(a), sin(a));
    g += d * sin(dot(cp, d) * f + t * 0.35 + float(k) * 1.7);
  }
  vec2 rd = cp / max(r, 1e-3);
  float ang = atan(cp.y, cp.x);
  g += rd * (sin(r * 26.0 - t * 1.1 - breath * 2.5) * 0.7 + sin(ang * 6.0 + t * 0.15) * 0.5) * smoothstep(0.02, 0.25, r);
  return g * w * (0.0018 + 0.0022 * breath + 0.0012 * uRhythm.y) / vec2(aspect, 1.0);
}

/** slowly rotating interference of two fine gratings: moire shimmer */
float moire(vec2 cp) {
  float t = uTime;
  float a1 = t * 0.013, a2 = a1 + 0.045 + 0.02 * sin(t * 0.11);
  vec2 d1 = vec2(cos(a1), sin(a1)), d2 = vec2(cos(a2), sin(a2));
  return sin(dot(cp, d1) * 260.0) * sin(dot(cp, d2) * 260.0 + t * 0.6);
}

vec3 hueRotate(vec3 c, float a) {
  const vec3 k = vec3(0.57735027);
  float ca = cos(a);
  return max(c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca), 0.0);
}

float brightShare(vec3 c, vec2 tk) {
  float br = maxc(c);
  float rq = clamp(br - tk.x + tk.y, 0.0, 2.0 * tk.y);
  rq = rq * rq / (4.0 * tk.y + 1e-4);
  return max(rq, br - tk.x) / max(br, 1e-4);
}

/** Lottes 2016: max-RGB curve keeps hue; crosstalk pushes only the extreme core towards white */
vec3 tonemap(vec3 c) {
  float peak = max(maxc(c), 1e-6);
  vec3 ratio = c / peak;
  float z = exp2(uTone.x * log2(peak));
  float tp = min(z / (exp2(uTone.y * log2(z)) * uTone.z + uTone.w), 1.0);
  float white = exp2(uTone2.x * log2(max(tp, 1e-6)));
  // path to white only matters near display white: skip 6 pows for most pixels
  if (white > 0.002 || uTone2.z != 1.0) {
    ratio = pow(ratio, vec3(uTone2.z / uTone2.y));
    ratio = mix(ratio, vec3(1.0), white);
    ratio = pow(ratio, vec3(uTone2.y));
  }
  return tp * ratio;
}

vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x * uRes.w;
  float side = uSplit < 0.0 ? 1.0 : step(uSplit, uv.x);
  vec4 p0 = mix(uA0, uB0, side); // blur, doubleVision, chroma, wobble
  vec4 p1 = mix(uA1, uB1, side); // tunnel, saturation, contrast, exposure
  vec4 p2 = mix(uA2, uB2, side); // bloomBoost, lightSensitivity, afterimage, patternWarp
  vec4 p3 = mix(uA3, uB3, side); // hueShift, motionBlur, trails, -
  vec2 cp = (uv - 0.5) * vec2(aspect, 1.0);
  float r = length(cp);

  // ---- screen-space warps
  vec2 suv = uv;
  if (p0.w > 0.001) suv += wobbleOffset(uv, p0.w, aspect);
  if (p2.w > 0.001) suv += patternOffset(cp, r, p2.w, aspect);

  // ---- sharp image
  float mb = max(p3.y, uFeat.w);
  vec3 col = mb > 0.001 ? motionBlurred(suv, mb, p0.z) : fetch(suv, p0.z);

  // ---- double vision: second image with slow vergence drift
  vec2 ghostOff = vec2(0.0);
  float ghostMix = 0.0;
  if (p0.y > 0.001) {
    ghostOff = vec2(0.03 * (0.85 + 0.25 * sin(uTime * 0.31)), 0.005 * sin(uTime * 0.23 + 1.0)) * p0.y;
    ghostMix = 0.48 * smoothstep(0.0, 0.4, p0.y);
    col = mix(col, fetch(suv + ghostOff, p0.z), ghostMix);
  }

  // ---- photographic depth of field
  if (uFeat.z > 0.5) {
    vec4 dof = bicubic4(tDof, suv, uBaseSize);
    float coc = cocPx(viewZ(texture(tDepth, suv).r));
    col = mix(col, dof.rgb, smoothstep(0.35, 1.3, max(coc, dof.a)));
  }

  // ---- blur + tunnel vision (blurred, dark periphery)
  float tun = p1.x;
  float tunMask = tun > 0.001 ? smoothstep(0.6 - 0.38 * tun, 0.98 - 0.3 * tun, r) : 0.0;
  float lod = (p0.x * 3.0 + tunMask * tun * 2.4) * uLodScale;
  if (lod > 0.01) {
    vec3 bl = blurLayer(suv, lod);
    if (ghostMix > 0.0) bl = mix(bl, blurLayer(suv + ghostOff, lod), ghostMix);
    col = mix(col, bl, clamp(lod, 0.0, 1.0));
  }

  // ---- exposure + energy-conserving bloom: the share that feeds the glow is taken from the pixel
  float ex = uLook.x * p1.w;
  col *= ex;
  if (uBloom.y > 0.5) {
    float bs = min(uBloom.x * (1.0 + p2.x), 1.0);
    vec2 tk = side > 0.5 ? uThr.zw : uThr.xy;
    col = col * (1.0 - bs * brightShare(col, tk)) + texture(tBloom, suv).rgb * bs;
  }
  if (uFeat.x > 0.0 && p2.y > 0.001) col += texture(tGlare, suv).rgb * (uFeat.x * p2.y);

  // ---- afterimages: bleached regions no longer lit show the complementary colour
  if (uFeat.y > 0.5 && p2.z > 0.001) {
    vec4 af = bicubic4(tAfter, suv, uAfterSize);
    float g = clamp(af.a, 0.0, 1.0) * p2.z;
    vec3 hue = af.rgb / max(maxc(af.rgb), 1e-4);
    vec3 comp = vec3(1.0 + minc(hue)) - hue;
    col = col * (1.0 - 0.35 * g) + comp * (0.16 * g);
  }

  // ---- optics: tunnel darkening + natural vignette (cos^4-like falloff)
  col *= 1.0 - tunMask * tun * 0.88;
  float v2 = dot(cp, cp) / (0.25 * (aspect * aspect + 1.0));
  col *= mix(1.0, 1.0 / ((1.0 + 0.9 * v2) * (1.0 + 0.9 * v2)), uLook.y * 1.4);

  // ---- grading (linear): hue, saturation, moire shimmer
  if (abs(p3.x) > 0.001) col = hueRotate(col, p3.x);
  float l = dot(col, LUMA);
  col = max(mix(vec3(l), col, p1.y), 0.0);
  if (p2.w > 0.001) col *= 1.0 + moire(cp) * 0.07 * p2.w * smoothstep(0.02, 0.6, l);

  // ---- tone map + contrast (display linear)
  col = tonemap(col);
  if (abs(p1.z - 1.0) > 0.001) {
    // log-space contrast about mid grey (keeps black), plus a slight veil when contrast drops
    vec3 lc = 0.18 * pow(col / 0.18, vec3(p1.z));
    col = mix(lc, mix(vec3(0.18), col, p1.z), 0.2);
  }
  col = clamp(col, 0.0, 1.0);

  // ---- encode, film grain (luminance weighted), triangular dither against banding
  vec3 s = toSRGB(col);
  vec3 n = hash3(vec3(gl_FragCoord.xy, uFrame));
  float lum = dot(s, LUMA);
  s += (n.x - 0.5) * uLook.z * (1.2 - lum) + (n.y + n.z - 1.0) / 255.0;

  // ---- compare divider
  if (uSplit >= 0.0) {
    float dpx = abs(uv.x - uSplit) * uRes.x;
    s *= 1.0 - 0.45 * (1.0 - smoothstep(1.5, 7.0, dpx));
    s = mix(s, vec3(1.0), 1.0 - smoothstep(0.6, 1.4, dpx));
  }
  fragColor = vec4(s, 1.0);
}
`;
