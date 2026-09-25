import { GLSL_COMMON } from './glsl';

/**
 * Spark / star / comet ribbons. Each instance is one particle drawn as a camera-facing ribbon that
 * follows its own analytic trajectory back in time (the trail), with round caps. The head is the
 * particle "now", the trail samples the path over the last `TRAIL` seconds (plus sagging for dropped
 * glitter), so long-exposure streaks, willow droops and crossette branches come out of the maths.
 */
export const SPARK_VERT = /* glsl */ `
${GLSL_COMMON}
uniform float uSegments;

varying vec3 vCol;
varying vec3 vHot;
varying vec2 vUv;
varying float vTS;
varying float vGlit;
flat out float vKey;

#define REC(k) texelFetch(uEmit, ivec2(k, row), 0)

struct Star {
  vec3 p0; vec3 v0; float life; float k; vec3 acc;
  float ts; vec3 sp; vec3 sv;
  vec3 n1; vec3 n2; float serp; float wph;
};

vec3 starPos(Star s, float t) {
  vec3 p;
  if (s.ts > 0.0 && t > s.ts) p = ballistic(s.sp, s.sv, s.k, s.acc, t - s.ts);
  else p = ballistic(s.p0, s.v0, s.k, s.acc, t);
  if (s.serp > 0.0) {
    float a = s.serp * min(t * 1.5, 1.0);
    float w = t * 9.0 + s.wph;
    p += (s.n1 * cos(w) + s.n2 * sin(w)) * a;
  }
  return p;
}
vec3 starVel(Star s, float t) {
  if (s.ts > 0.0 && t > s.ts) return ballisticVel(s.sv, s.k, s.acc, t - s.ts);
  return ballisticVel(s.v0, s.k, s.acc, t);
}
vec3 sag(float age, float droop) {
  return vec3(0.0, -droop * age * age * 0.5 / (1.0 + age * 1.2), 0.0) + uWind * age * 0.35;
}

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
  int nRec = int(r5.w + 0.5);

  // derived indexing: crossette children and crackle pops share the star maths
  int bi = i;
  int bn = n;
  int sub = 0;
  int pops = 0;
  if ((flags & F_CROSSETTE) != 0) { bi = i / 4; bn = max(n / 4, 1); sub = i - bi * 4; }
  if ((flags & F_POPS) != 0) {
    pops = max(int(r9.y + 0.5), 1);
    bi = i / pops; bn = max(nRec / pops, 1); sub = i - bi * pops;
  }

  float te; uint cyc;
  if (!emitTime(r0.w, r5.z, r5.y, r8.w, bi, bn, seed, cont, te, cyc)) CULL();
  uint key = hashu(seed ^ hashu(uint(bi) * 0x9e3779b9u + cyc * 0x85ebca6bu + 1u));

  Star s;
  s.k = r2.z;
  s.acc = vec3(0.0, r2.w, 0.0) + s.k * uWind * r10.w;
  s.life = mix(r5.x, r5.y, rnd(key, 1u));
  s.p0 = r0.xyz;
  s.ts = -1.0;
  s.serp = 0.0;
  s.wph = rnd(key, 14u) * 6.2831853;
  s.n1 = vec3(1.0, 0.0, 0.0); s.n2 = vec3(0.0, 0.0, 1.0);
  s.sp = s.p0; s.sv = vec3(0.0);
  float spd = mix(r2.x, r2.y, rnd(key, 2u));
  vec3 axis = r7.xyz;
  vec3 dir;
  if (dist == DIST_SPHERE) {
    dir = fibDir(bi, bn, hf(seed ^ 0x51u) * 6.2831853);
    dir = normalize(dir + (vec3(rnd(key, 4u), rnd(key, 5u), rnd(key, 6u)) - 0.5) * r11.z);
  } else if (dist == DIST_RING) {
    vec3 nn = normalize(axis);
    vec3 a = orthoA(nn);
    vec3 b = cross(nn, a);
    float ph = 6.2831853 * (float(bi) + rnd(key, 4u) * 0.3) / float(bn);
    dir = normalize(a * cos(ph) + b * sin(ph) + nn * (rnd(key, 5u) - 0.5) * 0.06);
  } else if (dist == DIST_FAN) {
    int fi = bi;
    if ((flags & F_ZIPPER) != 0) fi = (bi % 2 == 0) ? bi / 2 : bn - 1 - bi / 2;
    float th = bn > 1 ? mix(-r1.w, r1.w, float(fi) / float(bn - 1)) : 0.0;
    th += (rnd(key, 4u) - 0.5) * r11.z;
    dir = normalize(r1.xyz * cos(th) + normalize(axis) * sin(th));
  } else if (dist == DIST_HEMI) {
    dir = coneDir(vec3(0.0, 1.0, 0.0), 1.35, rnd(key, 4u), rnd(key, 5u));
  } else if (dist == DIST_SINGLE) {
    dir = r1.xyz;
    spd = r2.x;
  } else {
    dir = coneDir(r1.xyz, r1.w, rnd(key, 4u), rnd(key, 5u));
    if (dist == DIST_LINE) s.p0 += axis * rnd(key, 6u);
    if (dist == DIST_BOX) s.p0 += (vec3(rnd(key, 6u), rnd(key, 7u), rnd(key, 8u)) - 0.5) * axis;
  }
  bool pistil = (flags & F_PISTIL) != 0 && (bi & 1) == 1;
  if (pistil) spd *= 0.5;
  s.v0 = dir * spd;
  if ((flags & F_SERPENT) != 0) {
    s.serp = r10.y * (0.6 + 0.8 * rnd(key, 9u));
    s.n1 = orthoA(dir);
    s.n2 = cross(dir, s.n1);
  }
  if ((flags & F_CROSSETTE) != 0) {
    float ts = r9.x * (0.85 + 0.3 * rnd(key, 10u));
    if (ts < s.life) {
      s.ts = ts;
      s.sp = ballistic(s.p0, s.v0, s.k, s.acc, ts);
      vec3 pv = ballisticVel(s.v0, s.k, s.acc, ts);
      vec3 pd = normalize(pv + vec3(0.0, 1e-4, 0.0));
      vec3 a = orthoA(pd);
      vec3 b = cross(pd, a);
      float ang = rnd(key, 11u) * 6.2831853 + float(sub) * 1.5707963;
      s.sv = pv * 0.3 + (a * cos(ang) + b * sin(ang)) * r9.y;
    }
  }

  float tau = uTime - te;
  int j = int(position.x + 0.5);
  float side = position.y;
  float M = uSegments;
  float sPar = clamp((float(j) - 1.0) / M, 0.0, 1.0);
  float cap = j == 0 ? -1.0 : (float(j) > M + 1.5 ? 1.0 : 0.0);
  float trail = r6.z;

  vec3 P;
  vec3 Pn;
  vec3 col;
  float I;
  float width;
  float glit = 0.0;
  float tS;
  float hot = 0.0;

  if (pops > 0) {
    uint pk = hashu(key ^ (uint(sub) * 0x27d4eb2du + 7u));
    float tp = s.life + hf(pk) * r9.z;
    float pd = 0.06 + 0.1 * hf(pk ^ 3u);
    float tt = tau - tp;
    if (tt < 0.0 || tt > pd) CULL();
    P = starPos(s, tp) + (vec3(hf(pk ^ 5u), hf(pk ^ 6u), hf(pk ^ 9u)) - 0.5) * r9.w;
    Pn = P;
    col = mix(r3.rgb, vec3(1.0, 0.95, 0.85), 0.55);
    I = r3.w * (1.0 - tt / pd) * (0.6 + 0.8 * hf(pk ^ 11u));
    width = r6.x;
    tS = tp;
    hot = 1.0;
  } else {
    float lifeEnd = s.life;
    float dead = tau - lifeEnd;
    float fadeWin = max(trail, 0.05) * 0.9 + 0.06;
    float pearl = 0.0;
    if ((flags & F_PEARL) != 0) {
      pearl = r11.y * exp(-max(dead, 0.0) / max(r9.x, 0.02)) * smoothstep(-0.04, 0.0, dead);
      fadeWin = max(fadeWin, r9.x * 4.0);
    }
    if (dead > fadeWin) CULL();
    float tHead = min(tau, lifeEnd);
    float tMin = ((flags & F_CROSSETTE) != 0 && sub != 0) ? (s.ts > 0.0 ? s.ts : 1e9) : 0.0;
    if (tHead < tMin) CULL();
    tS = max(tHead - sPar * trail, tMin);
    float tN = max(tS - max(trail / M, 0.012), tMin);
    float age = tau - tS;
    float ageN = tau - tN;
    P = starPos(s, tS) + sag(age, r10.z);
    Pn = starPos(s, tN) + sag(ageN, r10.z);
    if (distance(P, Pn) < 1e-3) Pn = P - starVel(s, tS) * 0.02 - vec3(0.0, 1e-3, 0.0);

    float attack = smoothstep(0.0, max(r11.x, 0.001), tau);
    float lf = tau / lifeEnd;
    float headI = attack * (1.0 - smoothstep(0.8, 1.0, lf));
    if ((flags & F_FLICKER) != 0) headI *= 0.65 + 0.7 * rnd(key, uint(floor(uTime * 22.0 + rnd(key, 15u) * 50.0)) + 100u);
    if ((flags & F_STROBE) != 0) {
      float ph = fract(uTime * r8.z + rnd(key, 13u));
      headI *= step(0.6, ph) * 2.2;
    }
    headI += pearl;
    // continuous emitters: soft start / stop of the emission
    if ((flags & F_RAMP) != 0) {
      float rt = max(r9.w, 0.01);
      float tE = te - r0.w;
      headI *= smoothstep(0.0, rt, tE) * (1.0 - smoothstep(r5.z - rt * 1.5, r5.z, tE)) * 0.8 + 0.2 * smoothstep(0.0, rt, tE);
    }
    float trailI = r10.x * pow(1.0 - sPar, 1.3) * (1.0 - smoothstep(0.0, fadeWin, dead)) * attack;
    I = r3.w * mix(headI, trailI, smoothstep(0.0, 1.0 / M, sPar));
    width = r6.x * mix(1.0 + pearl * 0.25, r6.y, sPar);

    vec3 c1 = pistil ? r4.rgb : r3.rgb;
    if ((flags & F_COLORCHANGE) != 0) c1 = mix(r3.rgb, r4.rgb, smoothstep(r4.w - 0.06, r4.w + 0.06, tS / lifeEnd));
    col = c1;
    if ((flags & F_COOL) != 0) {
      float cool = clamp(age / max(trail, 0.05), 0.0, 1.0);
      // sparks: white-hot -> gold -> deep orange as they age along the trail and over life.
      // Coloured stars (strontium red, pink, blue ...) keep their hue and only darken: a red comet's
      // tail stays red instead of turning into a charcoal-orange one.
      float lifeCool = (dist == DIST_CONE || dist == DIST_LINE || dist == DIST_HEMI) ? smoothstep(0.1, 1.0, lf) : 0.0;
      vec3 coolTo;
      if (r4.w < -0.5) coolTo = r4.rgb;
      else {
        vec3 hn = c1 / max(max(c1.r, max(c1.g, c1.b)), 1e-4);
        float goldish = step(hn.b, hn.g + 0.02) * step(hn.g, hn.r + 0.02) * smoothstep(0.12, 0.3, hn.g);
        coolTo = mix(hn * vec3(0.8, 0.5, 0.6), vec3(1.0, 0.3, 0.06), goldish);
      }
      col = mix(c1, coolTo, clamp(cool * 0.85 + lifeCool * 0.8, 0.0, 1.0));
    }
    glit = r6.w * smoothstep(0.0, 0.3, sPar);
    hot = (1.0 - sPar) * (0.35 + pearl * 0.4);
  }
  // saturated metal-salt stars (red, pink, blue, green): a small tinted core instead of a white-hot
  // one and less peak, so the tone mapper's path to white does not bleach a red comet into pink or
  // orange. Charcoal / titanium colours (gold, orange, white sparks) keep their full brightness.
  float cmx = max(col.r, max(col.g, col.b));
  vec3 chn = col / max(cmx, 1e-4);
  float sat = 1.0 - min(chn.r, min(chn.g, chn.b));
  float goldC = step(chn.b, chn.g + 0.02) * step(chn.g, chn.r + 0.02) * smoothstep(0.12, 0.3, chn.g);
  float s2 = sat * sat * (1.0 - goldC);
  hot *= mix(1.0, 0.3, s2);
  I *= mix(1.0, 0.42, s2);
  vec3 hotCol = mix(vec3(1.0, 0.94, 0.82), mix(chn, vec3(1.0), 0.45), s2);

  // sparks die on the ground (no spark ever tunnels through the field)
  I *= smoothstep(-0.3, 0.25, P.y);
  vec4 vp = viewMatrix * vec4(P, 1.0);
  float depth = -vp.z;
  if (depth < 0.15) CULL();
  vec4 c = projectionMatrix * vp;
  vec4 cn = projectionMatrix * (viewMatrix * vec4(Pn, 1.0));
  vec2 sc = c.xy / c.w * uHalfRes;
  vec2 scn = cn.xy / max(cn.w, 0.05) * uHalfRes;
  vec2 d = scn - sc;
  float L = length(d);
  vec2 dirS = L > 1e-3 ? d / L : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dirS.y, dirS.x);
  float wpx = width * uProjScale / depth;
  float gain = 1.0;
  if (wpx < uMinPx) {
    gain = pow(wpx / uMinPx, 1.5);
    wpx = uMinPx;
  }
  vec2 off = nrm * side * wpx + dirS * cap * wpx;
  c.xy += off / uHalfRes * c.w;
  gl_Position = c;

  float fog = fogT(depth);
  vCol = col * I * gain * fog;
  vHot = hotCol * I * gain * fog * hot;
  vUv = vec2(side, cap);
  vTS = tS;
  vGlit = glit;
  vKey = float(key & 0xffffu);
}
`;

export const SPARK_FRAG = /* glsl */ `
${GLSL_COMMON}
varying vec3 vCol;
varying vec3 vHot;
varying vec2 vUv;
varying float vTS;
varying float vGlit;
flat in float vKey;

void main() {
  float r2 = dot(vUv, vUv);
  if (r2 > 1.0) discard;
  float prof = exp(-r2 * 3.0) - 0.0498;
  float core = exp(-r2 * 11.0);
  vec3 col = vCol * prof + vHot * core;
  if (vGlit > 0.001) {
    float cell = floor(vTS * 36.0);
    uint k = hashu(uint(vKey) * 7919u + uint(int(cell) + 65536));
    float tw = hf(k ^ hashu(uint(floor(uTime * 16.0 + hf(k) * 4.0))));
    float g = tw > 0.5 ? 2.2 : 0.1;
    col *= mix(1.0, g, vGlit);
  }
  gl_FragColor = vec4(max(col, vec3(0.0)), 0.0);
}
`;
