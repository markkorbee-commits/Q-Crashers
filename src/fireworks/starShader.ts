import { GLSL_COMMON } from '../fx/core/glsl';

/**
 * Firework star / comet ribbons: the fireworks' own variant of the shared spark shader
 * (src/fx/core/sparkShader.ts, same record layout, same analytic model). It adds what aerial
 * fireworks need and pyro sparks do not:
 *  - FW_SHED: a derived emitter whose particles are sparks the parent star sheds along its path
 *    (particle i = star i/X1, spark i%X1). Each spark leaves the star at a fraction of its burn, falls
 *    away with its own drag, and flashes after a delay: glitter / flitter tails (twinkling dots that
 *    hang behind the head) and crackling tails, instead of one solid ribbon.
 *  - FW_SWIM: "swimmer" / fish stars that wriggle on their own (a Lissajous wander around the
 *    ballistic path, amplitude Y1, frequency HZ).
 *  - trail drift (Z3, m/s): every bit of a trail drifts sideways with its age like real spark smoke,
 *    so long comet tails turn slightly wavy instead of ruler-straight.
 *  - a capped pearl: the end-of-life flash of a comet stays a small bright point (no blob).
 *  - serpent frequency from HZ (default 9 rad/s).
 */
export const FW_SHED = 16384;
export const FW_SWIM = 32768;
/** curling stars: the velocity turns at HZ rad/s in the fan plane while drag slows it (hooks, rings) */
export const FW_CURL = 65536;

export const STAR_VERT = /* glsl */ `
${GLSL_COMMON}
uniform float uSegments;

#define FW_SHED ${FW_SHED}
#define FW_SWIM ${FW_SWIM}
#define FW_CURL ${FW_CURL}

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
  vec3 n1; vec3 n2; vec3 d; float serp; float wph; float wf;
  float swim; vec3 sw; vec3 sph;
  float curl; vec3 ce1; vec3 ce2; float cv;
};

// closed form of a drag-slowed velocity turning at a constant rate w: v(t) = v0 e^((-k + i w) t)
vec2 curlPos(float k, float w, float t) {
  float E = exp(-k * t);
  float c = cos(w * t), sn = sin(w * t);
  float q = 1.0 / (k * k + w * w);
  return vec2(k * (1.0 - E * c) + w * E * sn, w * (1.0 - E * c) - k * E * sn) * q;
}

vec3 starPos(Star s, float t) {
  vec3 p;
  if (s.ts > 0.0 && t > s.ts) p = ballistic(s.sp, s.sv, s.k, s.acc, t - s.ts);
  else if (s.curl != 0.0) {
    vec2 c = curlPos(s.k, s.curl, t) * s.cv;
    p = ballistic(s.p0, vec3(0.0), s.k, s.acc, t) + s.ce1 * c.x + s.ce2 * c.y;
  } else p = ballistic(s.p0, s.v0, s.k, s.acc, t);
  if (s.serp > 0.0) {
    float a = s.serp * min(t * 1.5, 1.0);
    float w = t * s.wf + s.wph;
    p += (s.n1 * cos(w) + s.n2 * sin(w)) * a;
  }
  if (s.swim > 0.0) {
    // a fish: darts around its drifting burst point in tight, changing loops
    float g = s.swim * (1.0 - exp(-t * 1.8)) * (0.8 + 0.25 * t);
    p += (s.n1 * sin(t * s.sw.x + s.sph.x) + s.n2 * sin(t * s.sw.y + s.sph.y) + s.d * 0.7 * sin(t * s.sw.z + s.sph.z)) * g;
  }
  return p;
}
vec3 starVel(Star s, float t) {
  if (s.ts > 0.0 && t > s.ts) return ballisticVel(s.sv, s.k, s.acc, t - s.ts);
  if (s.curl != 0.0) {
    float E = exp(-s.k * t) * s.cv;
    return ballisticVel(vec3(0.0), s.k, s.acc, t) + (s.ce1 * cos(s.curl * t) + s.ce2 * sin(s.curl * t)) * E;
  }
  return ballisticVel(s.v0, s.k, s.acc, t);
}
vec3 sag(float age, float droop) {
  return vec3(0.0, -droop * age * age * 0.5 / (1.0 + age * 1.2), 0.0) + uWind * age * 0.35;
}
vec3 driftV(float t, float ph) {
  return vec3(sin(t * 7.3 + ph), 0.45 * sin(t * 5.1 + ph * 1.7), cos(t * 6.1 + ph * 2.3));
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

  // derived indexing: crossette children, crackle pops and shed sparks share the star maths
  int bi = i;
  int bn = n;
  int sub = 0;
  int pops = 0;
  int shed = 0;
  if ((flags & F_CROSSETTE) != 0) { bi = i / 4; bn = max(n / 4, 1); sub = i - bi * 4; }
  if ((flags & F_POPS) != 0) {
    pops = max(int(r9.y + 0.5), 1);
    bi = i / pops; bn = max(nRec / pops, 1); sub = i - bi * pops;
  } else if ((flags & FW_SHED) != 0) {
    shed = max(int(r9.y + 0.5), 1);
    bi = i / shed; bn = max(nRec / shed, 1); sub = i - bi * shed;
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
  s.swim = 0.0;
  s.wph = rnd(key, 14u) * 6.2831853;
  s.wf = r8.z > 0.0 ? r8.z : 9.0;
  s.n1 = vec3(1.0, 0.0, 0.0); s.n2 = vec3(0.0, 0.0, 1.0); s.d = vec3(0.0, 1.0, 0.0);
  s.sp = s.p0; s.sv = vec3(0.0);
  s.sw = vec3(0.0); s.sph = vec3(0.0);
  s.curl = 0.0; s.ce1 = vec3(0.0, 1.0, 0.0); s.ce2 = vec3(1.0, 0.0, 0.0); s.cv = 0.0;
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
  if ((flags & FW_CURL) != 0 && r8.z != 0.0) {
    // turn in the fan plane (DIR, AXIS): positive = towards AXIS
    vec3 N = cross(r1.xyz, normalize(axis));
    N = dot(N, N) > 1e-6 ? normalize(N) : vec3(0.0, 0.0, 1.0);
    s.curl = r8.z * (dist == DIST_SINGLE ? 1.0 : 0.9 + 0.2 * rnd(key, 23u));
    s.ce1 = dir;
    s.ce2 = normalize(cross(N, dir));
    s.cv = spd;
  }
  if ((flags & (F_SERPENT | FW_SWIM)) != 0) {
    s.n1 = orthoA(dir);
    s.n2 = cross(dir, s.n1);
    s.d = dir;
    if ((flags & F_SERPENT) != 0) s.serp = r10.y * (0.6 + 0.8 * rnd(key, 9u));
    else {
      s.swim = r10.y * (0.7 + 0.6 * rnd(key, 9u));
      float w = s.wf;
      s.sw = w * vec3(0.75 + 0.5 * rnd(key, 16u), 0.8 + 0.6 * rnd(key, 17u), 0.5 + 0.4 * rnd(key, 18u));
      s.sph = vec3(rnd(key, 19u), rnd(key, 20u), rnd(key, 21u)) * 6.2831853;
    }
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
  // trail samples are packed towards the head (the first segment is short), so the bright head stays
  // a compact point and the tail drops off right behind it instead of a bright first segment
  float sPar = pow(clamp((float(j) - 1.0) / M, 0.0, 1.0), 1.6);
  float s1 = pow(1.0 / M, 1.6);
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
  } else if (shed > 0) {
    // a spark the star dropped at tp: it falls away from the path and flashes after a delay
    uint pk = hashu(key ^ (uint(sub) * 0x2c1b3c6du + 13u));
    float tp = s.life * clamp((float(sub) + hf(pk)) / float(shed), 0.0, 1.0);
    float dl = r9.z * hf(pk ^ 3u);
    float pd = max(r11.w, 0.03) * (0.5 + hf(pk ^ 4u));
    float tt = tau - tp;
    if (tt < dl || tt > dl + pd) CULL();
    vec3 sv = starVel(s, tp) * 0.1 + (vec3(hf(pk ^ 5u), hf(pk ^ 6u), hf(pk ^ 9u)) - 0.5) * (2.0 * r9.w);
    P = starPos(s, tp) + ballistic(vec3(0.0), sv, 3.0, vec3(0.0, -9.81, 0.0) + uWind * 1.8, tt);
    Pn = P;
    float u = (tt - dl) / pd;
    // flitter: every spark blinks a couple of times while it burns
    float blink = step(0.35, hf(pk ^ uint(floor(uTime * 26.0 + hf(pk ^ 12u) * 9.0))));
    I = r3.w * (1.0 - u * u) * (0.35 + 0.65 * blink) * (0.6 + 0.8 * hf(pk ^ 11u));
    col = mix(r3.rgb, r4.rgb, hf(pk ^ 14u) * step(r4.w, -0.5));
    width = r6.x;
    tS = tp;
    hot = 0.8;
  } else {
    float lifeEnd = s.life;
    float dead = tau - lifeEnd;
    // how long the trail hangs on after the star died (X2 > 0: comets burn out fast)
    float fadeWin = max(trail, 0.05) * (r9.z > 0.0 ? r9.z : 0.9) + 0.06;
    float pearl = 0.0;
    if ((flags & F_PEARL) != 0) {
      pearl = r11.y * exp(-max(dead, 0.0) / max(r9.x, 0.02)) * smoothstep(-0.04, 0.0, dead);
      fadeWin = max(fadeWin, r9.x * 1.5);
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
    if (r11.w > 0.0) {
      // the trail's sparks drift with their age: long tails turn softly wavy
      float ph = rnd(key, 22u) * 6.2831853;
      P += driftV(tS, ph) * (r11.w * age);
      Pn += driftV(tN, ph) * (r11.w * ageN);
    }
    if (distance(P, Pn) < 1e-3) Pn = P - starVel(s, tS) * 0.02 - vec3(0.0, 1e-3, 0.0);

    float attack = smoothstep(0.0, max(r11.x, 0.001), tau);
    float lf = tau / lifeEnd;
    // a pearl comet does not fade into its pearl, it flares into it
    float headI = attack * ((flags & F_PEARL) != 0 ? 1.0 : 1.0 - smoothstep(0.8, 1.0, lf));
    if ((flags & F_FLICKER) != 0) headI *= 0.65 + 0.7 * rnd(key, uint(floor(uTime * 22.0 + rnd(key, 15u) * 50.0)) + 100u);
    if ((flags & F_STROBE) != 0) {
      float ph = fract(uTime * r8.z + rnd(key, 13u));
      headI *= step(0.6, ph) * 2.2;
    }
    headI += pearl;
    if ((flags & F_RAMP) != 0) {
      float rt = max(r9.w, 0.01);
      float tE = te - r0.w;
      headI *= smoothstep(0.0, rt, tE) * (1.0 - smoothstep(r5.z - rt * 1.5, r5.z, tE)) * 0.8 + 0.2 * smoothstep(0.0, rt, tE);
    }
    float trailI = r10.x * pow(1.0 - sPar, 1.3) * (1.0 - smoothstep(0.0, fadeWin, dead)) * attack;
    I = r3.w * mix(headI, trailI, smoothstep(0.0, s1, sPar));
    // X3 (stars without RAMP): shutter streak - a fast comet head smears into a short bright line
    // over the first trail segment, as in any 1/50 s video frame
    if (r9.w > 0.0 && (flags & F_RAMP) == 0 && sPar <= s1 * 1.01) I = max(I, r3.w * headI * r9.w * (1.0 - 0.6 * sPar / s1));
    // a pearl is a bright point, never a blob: its size grows only a little with its brightness
    float behind = smoothstep(0.0, s1, sPar);
    width = r6.x * mix(1.0 + min(pearl, 3.0) * 0.3, r6.y, mix(behind, 1.0, sPar));

    vec3 c1 = pistil ? r4.rgb : r3.rgb;
    if ((flags & F_COLORCHANGE) != 0) c1 = mix(r3.rgb, r4.rgb, smoothstep(r4.w - 0.06, r4.w + 0.06, tS / lifeEnd));
    col = c1;
    if ((flags & F_COOL) != 0) {
      float cool = clamp(age / max(trail, 0.05), 0.0, 1.0);
      float lifeCool = (dist == DIST_CONE || dist == DIST_LINE || dist == DIST_HEMI) ? smoothstep(0.1, 1.0, lf) : 0.0;
      vec3 coolTo;
      if (r4.w < -0.5) coolTo = r4.rgb;
      else {
        vec3 hn = c1 / max(max(c1.r, max(c1.g, c1.b)), 1e-4);
        float hs = 1.0 - min(hn.r, min(hn.g, hn.b));
        float goldish = step(hn.b, hn.g + 0.02) * step(hn.g, hn.r + 0.02) * smoothstep(0.12, 0.3, hn.g) * smoothstep(0.18, 0.35, hs);
        // titanium white / silver sparks stay white-ish as they cool (a touch warmer and dimmer)
        vec3 cold = mix(hn * vec3(0.9, 0.82, 0.74), hn * vec3(0.8, 0.5, 0.6), smoothstep(0.2, 0.45, hs));
        coolTo = mix(cold, vec3(1.0, 0.3, 0.06), goldish);
      }
      // a separate tail colour (r4.w < -0.5) takes over right behind the head
      float ck = r4.w < -0.5 ? smoothstep(0.0, 0.25, cool) : cool * 0.85;
      col = mix(c1, coolTo, clamp(ck + lifeCool * 0.8, 0.0, 1.0));
    }
    glit = r6.w * smoothstep(0.0, 0.3, sPar);
    hot = (1.0 - behind * 0.8) * (1.0 - sPar) * (0.35 + min(pearl, 4.0) * 0.3);
  }
  // saturated metal-salt stars (red, pink, blue, green): a small tinted core instead of a white-hot
  // one and less peak, so the tone mapper's path to white does not bleach a red comet into pink
  float cmx = max(col.r, max(col.g, col.b));
  vec3 chn = col / max(cmx, 1e-4);
  float sat = 1.0 - min(chn.r, min(chn.g, chn.b));
  float goldC = step(chn.b, chn.g + 0.02) * step(chn.g, chn.r + 0.02) * smoothstep(0.12, 0.3, chn.g) * smoothstep(0.18, 0.35, sat);
  float s2 = sat * sat * (1.0 - goldC);
  hot *= mix(1.0, 0.3, s2);
  I *= mix(1.0, 0.42, s2);
  // white-hot core: warm for charcoal gold, neutral for white / silver (a warm core on a dense white
  // cluster tone-maps to yellow), tinted for metal-salt colours
  vec3 hotCol = mix(mix(mix(chn, vec3(1.0), 0.5), vec3(1.0, 0.94, 0.82), goldC), mix(chn, vec3(1.0), 0.45), s2);

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

export const STAR_FRAG = /* glsl */ `
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
