import { GLSL_COMMON } from './glsl';

/**
 * Soft billboards: flame fireballs, CO2 plumes, smoke, burst flashes, nozzle glows, fog banks.
 * Premultiplied output (rgb = emission + lit colour * alpha, a = occlusion) so emissive fire and
 * sooty/grey smoke share one blend mode: ONE, ONE_MINUS_SRC_ALPHA.
 */
export const PUFF_VERT = /* glsl */ `
${GLSL_COMMON}

varying vec2 vUv;
varying vec3 vEmis;
varying vec3 vLit;
varying vec4 vPar;
varying vec3 vNoise;
varying float vErode;
varying float vWarm;
varying vec2 vFloor;

#define REC(k) texelFetch(uEmit, ivec2(k, row), 0)

void main() {
  int slot = gl_InstanceID / uSlotSize;
  int local = gl_InstanceID - slot * uSlotSize;
  vec4 sl = texelFetch(uSlots, ivec2(slot % uSlotTexW, slot / uSlotTexW), 0);
  int row = int(sl.x + 0.5);
  int i = int(sl.y + 0.5) + local;
  int n = int(sl.z + 0.5);
  if (i >= n) CULL();

  vec4 r0 = REC(0); vec4 r1 = REC(1); vec4 r2 = REC(2); vec4 r3 = REC(3);
  vec4 r4 = REC(4); vec4 r5 = REC(5); vec4 r6 = REC(6); vec4 r7 = REC(7);
  vec4 r8 = REC(8); vec4 r9 = REC(9); vec4 r10 = REC(10); vec4 r11 = REC(11);
  int dist = int(r8.x + 0.5);
  int flags = int(r8.y + 0.5);
  uint seed = uint(r7.w + 0.5);
  bool cont = (flags & F_CONTINUOUS) != 0;

  float te; uint cyc;
  if (!emitTime(r0.w, r5.z, r5.y, r8.w, i, n, seed, cont, te, cyc)) CULL();
  uint key = hashu(seed ^ hashu(uint(i) * 0x9e3779b9u + cyc * 0x85ebca6bu + 1u));
  float life = mix(r5.x, r5.y, rnd(key, 1u));
  float tau = uTime - te;
  if (tau > life) CULL();

  float k = r2.z;
  vec3 acc = vec3(0.0, r2.w, 0.0) + k * uWind * r10.w;
  vec3 p0 = r0.xyz;
  vec3 axis = r7.xyz;
  vec3 dir;
  if (dist == DIST_SPHERE) {
    dir = normalize(vec3(rnd(key, 4u), rnd(key, 5u), rnd(key, 6u)) - 0.5 + vec3(0.0, 1e-3, 0.0));
  } else if (dist == DIST_HEMI) {
    dir = coneDir(vec3(0.0, 1.0, 0.0), 1.35, rnd(key, 4u), rnd(key, 5u));
  } else if (dist == DIST_SINGLE) {
    dir = r1.xyz;
  } else {
    dir = coneDir(r1.xyz, r1.w, rnd(key, 4u), rnd(key, 5u));
    if (dist == DIST_LINE) p0 += axis * rnd(key, 6u);
    if (dist == DIST_BOX) p0 += (vec3(rnd(key, 6u), rnd(key, 7u), rnd(key, 8u)) - 0.5) * axis;
  }
  float spd = mix(r2.x, r2.y, rnd(key, 2u));
  vec3 P = ballistic(p0, dir * spd, k, acc, tau);
  float f = tau / life;
  float rad = (r6.x + r6.y * pow(f, max(r6.z, 0.05))) * (0.75 + 0.5 * rnd(key, 3u));
  int kind = int(r11.w + 0.5);

  float em = 1.0;
  if ((flags & F_RAMP) != 0) {
    float rt = max(r9.w, 0.01);
    float tE = te - r0.w;
    em = smoothstep(0.0, rt, tE) * (1.0 - smoothstep(r5.z - rt, r5.z, tE));
  }

  vec4 vp = viewMatrix * vec4(P, 1.0);
  vec2 vp0 = vp.xy;
  float depth = -vp.z;
  float ang = rnd(key, 4u) * 6.2831853 + r9.y * tau * (rnd(key, 5u) - 0.5) * 2.0;
  vec2 cs = vec2(cos(ang), sin(ang));
  vec2 corner = position.xy;
  vec2 rc = vec2(corner.x * cs.x - corner.y * cs.y, corner.x * cs.y + corner.y * cs.x);
  if ((flags & F_FLAT) != 0) {
    vp.xy += corner * rad * vec2(1.0, r11.y);
    rc = corner;
  } else if (r11.z > 0.0) {
    // fast puffs stretch along their screen-space velocity: flame tongues, jet cores
    vec3 vv = mat3(viewMatrix) * ballisticVel(dir * spd, k, acc, tau);
    float l = length(vv.xy);
    vec2 ay = l > 0.01 ? vv.xy / l : vec2(0.0, 1.0);
    vec2 ax = vec2(ay.y, -ay.x);
    float stretch = 1.0 + min(l * r11.z, 1.8);
    vp.xy += (ax * corner.x + ay * corner.y * stretch) * rad;
  } else {
    vp.xy += corner * rad;
  }
  gl_Position = projectionMatrix * vp;
  if (depth < 0.1) CULL();
  // world height of this corner (for the analytic floor fade of smoke / fog: no hard ground lines)
  vFloor = vec2(P.y + dot(viewMatrix[1].xy, vp.xy - vp0), kind == 0 || kind == 3 || kind == 4 ? -1e4 : r10.y);

  // fade when the camera is inside / very close to the puff (no depth texture: this is the cheap soft path)
  float nearF = smoothstep(rad * 0.2, rad * 1.2 + 0.5, depth);
  float fog = fogT(depth);
  vUv = rc;
  vNoise = vec3(rnd(key, 7u), rnd(key, 8u) + tau * 0.05, max(r6.w, 0.05));
  vErode = r9.z;
  vEmis = vec3(0.0);
  vLit = vec3(0.0);
  vWarm = r4.w;

  if (kind == 0) {
    // flame fireball: temperature falls with age; soot takes over near the end
    float temp = pow(1.0 - f, 1.1) * (0.66 + 0.26 * rnd(key, 9u));
    float soot = r10.x * smoothstep(r10.y, 0.92, f) * (1.0 - smoothstep(0.9, 1.0, f));
    vEmis = r3.rgb * r3.w * em * fog * nearF;
    vLit = (r4.rgb * envLight(P) * 1.4 + r3.rgb * r3.w * 0.004) * fog;
    vPar = vec4(smoothstep(0.0, 0.03, f) * em * nearF, temp, soot, 0.0);
  } else if (kind == 3 || kind == 4) {
    float decay = max(r9.x, 0.01);
    float g = kind == 3 ? exp(-tau / decay) : (0.75 + 0.5 * rnd(key, uint(floor(uTime * 30.0)) + 40u));
    vEmis = r3.rgb * r3.w * g * em * fog * smoothstep(0.0, 0.02, tau) * (1.0 - smoothstep(0.7, 1.0, f)) * nearF;
    vPar = vec4(0.0, 0.0, 0.0, float(kind));
  } else {
    // smoke / CO2 / fog: lit by the show's light bus (+ optional self illumination from a burst)
    float fadeIn = smoothstep(0.0, max(r10.z, 0.001), f);
    float fadeOut = 1.0 - smoothstep(kind == 2 ? 0.35 : 0.55, 1.0, f);
    float alpha = r3.w * fadeIn * fadeOut * em * nearF;
    vec3 light = envLight(P) * r11.x;
    vec3 self = vec3(0.0);
    if ((flags & F_SELFLIT) != 0) self = r4.rgb * exp(-tau / max(r9.x, 0.01));
    vLit = r3.rgb * r10.x * (light + self) * fog;
    vEmis = kind == 2 ? r4.rgb * alpha * (1.0 - f) * fog : vec3(0.0);
    vPar = vec4(alpha, 0.0, 0.0, float(kind));
  }
  vPar.w = float(kind);
}
`;

export const PUFF_FRAG = /* glsl */ `
${GLSL_COMMON}
uniform sampler2D uNoise;
varying vec2 vUv;
varying vec3 vEmis;
varying vec3 vLit;
varying vec4 vPar;
varying vec3 vNoise;
varying float vErode;
varying float vWarm;
varying vec2 vFloor;

vec3 flameRamp(vec3 base, float T, float warm) {
  float t = clamp(T, 0.0, 1.0);
  float I = max(base.r, max(base.g, base.b));
  vec3 c = base / max(I, 1e-4);
  // coloured flames: saturate toward the base hue as they cool, whiten when hot
  vec3 hue = pow(max(c, vec3(0.002)), vec3(mix(2.8, 0.2, t)));
  // hydrocarbon flames: soot-radiation ramp (red -> orange -> yellow -> white-yellow)
  vec3 bb = vec3(1.0, 0.95 * pow(t, 0.9), 0.6 * t * t * t);
  hue = mix(hue, bb * mix(vec3(1.0), c / max(vec3(1.0, 0.36, 0.08), vec3(0.05)), 0.15), warm);
  float lum = (0.08 + 0.5 * t + 0.9 * t * t) * I;
  return hue * lum;
}

void main() {
  float d2 = dot(vUv, vUv);
  if (d2 > 1.0) discard;
  float d = sqrt(d2);
  vec2 uv = vUv * vNoise.z + vNoise.xy;
  vec4 nz = texture(uNoise, uv);
  vec4 nz2 = texture(uNoise, uv * 2.37 + vNoise.yx * 1.7);
  int kind = int(vPar.w + 0.5);
  if (kind == 0) {
    float turb = (nz.r - 0.5) + (nz2.g - 0.5) * 0.7;
    float shape = smoothstep(0.92, 0.4, d + turb * vErode) * smoothstep(1.0, 0.8, d);
    float T = vPar.y * (1.4 - d * 0.9) + turb * 0.75;
    vec3 e = flameRamp(vEmis, T, vWarm) * shape;
    float soot = clamp(vPar.z * shape * (0.5 + nz2.b * 1.0), 0.0, 0.95);
    gl_FragColor = vec4((e * (1.0 - soot) + vLit * soot) * vPar.x, soot * vPar.x);
  } else if (kind == 3 || kind == 4) {
    float g = exp(-d2 * 5.0) * (0.8 + 0.4 * nz.r) + exp(-d2 * 28.0) * 0.9;
    gl_FragColor = vec4(vEmis * g, 0.0);
  } else {
    float turb = (nz.r - 0.5) * 0.9 + (nz2.g - 0.5) * 0.45;
    float shape = smoothstep(1.0, 0.1, d + turb * vErode) * smoothstep(1.0, 0.72, d);
    float dens = shape * (0.35 + 1.3 * nz.b * nz2.r);
    float a = clamp(vPar.x * dens, 0.0, 1.0) * smoothstep(vFloor.y, vFloor.y + 0.8, vFloor.x);
    gl_FragColor = vec4(vLit * a + vEmis * dens, a);
  }
}
`;
