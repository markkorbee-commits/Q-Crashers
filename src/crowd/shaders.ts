/**
 * GLSL for the crowd (WebGL2 / GLSL ES 3.00 through three's ShaderMaterial compatibility layer).
 *
 * Everything that moves is evaluated on the GPU from a handful of uniforms:
 *   per-person static data  → 3 float textures (position/yaw, height/build/seed/zone, packed look)
 *   crowd mood              → uMood[5] (20 shares, see constants.ts M)
 *   music                   → uBeat (beat, bpm, hasKick, energy) — deterministic from show time
 * A person's actions are a partition of unity over a personal random number, so when a share
 * rises the crowd joins in progressively and every pose blends smoothly (no popping).
 */

export const COMMON = /* glsl */ `
#define PI 3.14159265
#define TAU 6.28318531
#define D2R 0.01745329

#define B_PELVIS 0
#define B_SPINE 1
#define B_HEAD 2
#define B_UARM_L 3
#define B_FARM_L 4
#define B_HAND_L 5
#define B_UARM_R 6
#define B_FARM_R 7
#define B_HAND_R 8
#define B_THIGH_L 9
#define B_SHIN_L 10
#define B_THIGH_R 11
#define B_SHIN_R 12
#define B_CAPE 13
#define B_FOOT_L 14
#define B_FOOT_R 15

#define S_BODY 0
#define S_CAP 1
#define S_HAT 2
#define S_HAIR 3
#define S_PONY 4
#define S_BANDANA 5
#define S_CAPE 6
#define S_LANTERN_L 7
#define S_LANTERN_R 8
#define S_MIC 9
#define S_CAMERA 10
#define S_CTRL 11

#define M_SWAY 0
#define M_BOUNCE 1
#define M_JUMP 2
#define M_FIST 3
#define M_HANDS 4
#define M_PHONES 5
#define M_WAVE 6
#define M_HUG 7
#define M_CLAP 8
#define M_CROUCH 9
#define M_POLS 10
#define M_STOMP 11
#define M_HEADBANG 12
#define M_SIT 13
#define M_FLAGS 14
#define M_LIGHTERS 15
#define M_INTENS 16
#define M_HAKKEN 17
#define M_CHEER 18
#define M_LOOKUP 19

uniform highp sampler2D tPos;
uniform highp sampler2D tAttr;
uniform highp sampler2D tLook;
uniform vec4 uMood[5];
uniform vec4 uBeat;   // beat (float), bpm, hasKick (0/1), section energy
uniform vec4 uClock;  // show time, real time, -, cheer envelope
uniform vec4 uPlayer; // player feet xyz, push on/off
uniform vec4 uCamPush; // low free camera xz (+ weight) — people also step away from it

float moodv(int i) { return uMood[i >> 2][i & 3]; }

uint hu(uint x) {
  x ^= x >> 16u; x *= 0x7feb352du; x ^= x >> 15u; x *= 0x846ca68bu; x ^= x >> 16u;
  return x;
}
float hh(float seed, float k) { return float(hu(uint(seed) ^ hu(uint(k) * 0x9E3779B9u + 0x632BE5ABu))) * (1.0 / 4294967296.0); }
float h2(vec2 c) { return float(hu(uint(int(c.x) + 8192) * 73856093u ^ uint(int(c.y) + 8192) * 19349663u)) * (1.0 / 4294967296.0); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y);
}

// zone factors: A pit, B front-middle, C middle, D rear floor, E banks, F crests, G back plaza, Q bar queues
const float ZJ[8] = float[8](1.75, 1.1, 0.85, 0.5, 0.6, 0.2, 0.15, 0.0);  // jumping
const float ZF[8] = float[8](1.0, 1.2, 1.05, 0.7, 0.85, 0.35, 0.3, 0.05); // fist pumps
const float ZH[8] = float[8](1.1, 1.0, 1.0, 0.8, 0.9, 0.45, 0.4, 0.1);   // hands / waves
const float ZP[8] = float[8](1.0, 1.0, 1.0, 0.9, 1.0, 0.7, 0.6, 0.35);   // phones
const float ZD[8] = float[8](1.0, 1.0, 1.0, 0.75, 0.8, 0.35, 0.3, 0.05); // bounce / stomp / clap
const float ZK[8] = float[8](0.35, 0.8, 1.9, 1.5, 0.6, 0.2, 0.3, 0.0);   // hakken (space in zone C)
const float ZC[8] = float[8](1.0, 1.0, 1.0, 1.0, 1.0, 0.6, 0.6, 0.25);   // hugs / sitting

struct Person { vec3 pos; float yaw; float h; float build; float seed; float zone; ivec4 look; };

Person fetchPerson(float idx) {
  int i = int(idx + 0.5);
  ivec2 c = ivec2(i & 255, i >> 8);
  vec4 a = texelFetch(tPos, c, 0);
  vec4 b = texelFetch(tAttr, c, 0);
  vec4 l = texelFetch(tLook, c, 0);
  Person P;
  P.pos = a.xyz; P.yaw = a.w; P.h = b.x; P.build = b.y; P.seed = b.z; P.zone = b.w;
  P.look = ivec4(l + 0.5);
  return P;
}

struct Pose {
  vec3 off;     // pelvis offset (reference metres)
  vec3 rootR;   // lean fwd (x), twist (y), roll (z)
  vec3 spine;
  vec2 head;    // pitch (down +), yaw
  vec4 armL;    // shoulder flex, abduction, elbow, wrist (radians)
  vec4 armR;
  vec3 legL;    // hip flex, hip abduction, knee
  vec3 legR;
  float cape;
  float phone;  // phone held up 0..1
  float light;  // flashlight / lighter on 0..1
  vec2 flagTilt;
  float flag;
  float frame;  // impostor frame
  float squash; // impostor height scale
  vec2 push;    // world xz offset (step aside for the player)
  float walkYaw; // extra body yaw (walkers turning around)
  float shoW;
  float hipW;
};

Pose restPose() {
  Pose Q;
  Q.off = vec3(0.0); Q.rootR = vec3(0.0); Q.spine = vec3(0.0); Q.head = vec2(0.0);
  Q.armL = vec4(0.0); Q.armR = vec4(0.0); Q.legL = vec3(0.0); Q.legR = vec3(0.0);
  Q.cape = 0.12; Q.phone = 0.0; Q.light = 0.0; Q.flagTilt = vec2(0.0); Q.flag = 0.0;
  Q.frame = 0.0; Q.squash = 1.0; Q.push = vec2(0.0); Q.walkYaw = 0.0; Q.shoW = 1.0; Q.hipW = 1.0;
  return Q;
}

vec4 AR(float f, float b, float e, float w) { return vec4(f, b, e, w) * D2R; }
float below(float u, float c) { return 1.0 - smoothstep(c - 0.035, c + 0.035, u); }

mat3 rX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
mat3 rYXZ(vec3 e) { return rY(e.y) * rX(e.x) * rZ(e.z); }

const vec3 PV_HIP = vec3(0.0, 0.95, 0.0);
const vec3 PV_WAIST = vec3(0.0, 1.07, 0.0);
const vec3 PV_NECK = vec3(0.0, 1.47, -0.01);
const vec3 PV_CAPE = vec3(0.0, 1.45, -0.12);

/** rotate a rest-pose point of a bone into the posed (still person-local, unscaled) space */
vec3 skinPt(int bone, vec3 p, inout vec3 n, Pose Q) {
  mat3 R = mat3(1.0);
  if (bone == B_PELVIS) p.x *= Q.hipW;
  else if (bone == B_SPINE || bone == B_CAPE) p.x *= Q.shoW;
  if (bone >= B_UARM_L && bone <= B_HAND_R) {
    bool left = bone <= B_HAND_L;
    float sx = left ? 1.0 : -1.0;
    vec4 A = left ? Q.armL : Q.armR;
    float dx = sx * 0.19 * (Q.shoW - 1.0);
    p.x += dx;
    vec3 sho = vec3(0.19 * sx + dx, 1.42, -0.01);
    vec3 elb = vec3(0.205 * sx + dx, 1.13, -0.01);
    vec3 wri = vec3(0.21 * sx + dx, 0.885, 0.0);
    int seg = bone - (left ? B_UARM_L : B_UARM_R);
    if (seg == 2) { mat3 W = rX(-A.w); p = W * (p - wri) + wri; R = W; }
    if (seg >= 1) { mat3 E = rX(-A.z); p = E * (p - elb) + elb; R = E * R; }
    mat3 S = rX(-A.x) * rZ(A.y * sx); p = S * (p - sho) + sho; R = S * R;
  } else if ((bone >= B_THIGH_L && bone <= B_SHIN_R) || bone >= B_FOOT_L) {
    bool left = bone <= B_SHIN_L || bone == B_FOOT_L;
    float sx = left ? 1.0 : -1.0;
    vec3 L = left ? Q.legL : Q.legR;
    float dx = sx * 0.095 * (Q.hipW - 1.0);
    p.x += dx;
    vec3 hj = vec3(0.095 * sx + dx, 0.95, 0.0);
    vec3 kn = vec3(0.1 * sx + dx, 0.5, 0.015);
    if (bone >= B_FOOT_L) {
      // ankle keeps the sole level with the ground (points the toes a little when airborne)
      vec3 an = vec3(0.1 * sx + dx, 0.085, 0.0);
      mat3 A = rX(L.x - L.z - Q.rootR.x + clamp(Q.off.y, 0.0, 0.3) * 2.2);
      p = A * (p - an) + an; R = A;
    }
    if (bone != B_THIGH_L && bone != B_THIGH_R) { mat3 K = rX(L.z); p = K * (p - kn) + kn; R = K * R; }
    mat3 H = rX(-L.x) * rZ(L.y * sx); p = H * (p - hj) + hj; R = H * R;
    mat3 RL = rYXZ(Q.rootR); p = RL * (p - PV_HIP) + PV_HIP + Q.off;
    n = RL * R * n;
    return p;
  } else if (bone == B_HEAD) {
    mat3 Hd = rY(Q.head.y) * rX(Q.head.x); p = Hd * (p - PV_NECK) + PV_NECK; R = Hd;
  } else if (bone == B_CAPE) {
    mat3 C = rX(Q.cape); p = C * (p - PV_CAPE) + PV_CAPE; R = C;
  }
  if (bone != B_PELVIS) { mat3 Sp = rYXZ(Q.spine); p = Sp * (p - PV_WAIST) + PV_WAIST; R = Sp * R; }
  mat3 RR = rYXZ(Q.rootR); p = RR * (p - PV_HIP) + PV_HIP + Q.off; R = RR * R;
  n = R * n;
  return p;
}

vec3 toWorld(Person P, Pose Q, vec3 lp) {
  return P.pos + vec3(Q.push.x, 0.0, Q.push.y) + rY(P.yaw + Q.walkYaw) * (lp * (P.h / 1.75));
}
`;

/** the procedural crowd brain: mood shares + beat → a pose (crowd instances only) */
export const PERSON_POSE = /* glsl */ `
Pose personPose(Person P) {
  Pose Q = restPose();
  float sd = P.seed;
  float e = hh(sd, 5.0);
  int zone = clamp(int(P.zone + 0.5), 0, 7);
  float rt = uClock.y;
  float st = uClock.x;
  float inten = moodv(M_INTENS);
  bool female = ((P.look.x >> 8) & 1) == 1;
  bool leftH = ((P.look.z >> 7) & 1) == 1;
  bool carrier = ((P.look.z >> 6) & 1) == 1;
  Q.shoW = P.build * (female ? 0.9 : 1.0);
  Q.hipW = mix(1.0, P.build, 0.5) * (female ? 1.08 : 1.0);

  // personal beat: sound delay (delay towers keep it < 0.15 s), coherent 10 m clusters
  float bpm = max(uBeat.y, 60.0);
  float bps = bpm / 60.0;
  float dist = length(P.pos.xz - vec2(0.0, -6.0));
  float delay = min(0.15, dist / 343.0 * 0.55) + 0.03 * hh(sd, 11.0);
  float jit = (vnoise(P.pos.xz * 0.11) - 0.5) * 0.12;
  float b = uBeat.x - delay * bps - jit;
  float bp = fract(b);
  float kickOn = uBeat.z;
  float kick = kickOn * exp(-bp / bps * 11.0);
  float ph = hh(sd, 6.0) * TAU;

  // ---- arm actions: partition of unity over u
  float u = mix(0.04, 1.0, hh(sd, 1.0));
  float s0 = moodv(M_PHONES) * ZP[zone];
  float s1 = moodv(M_FIST) * ZF[zone] * (0.65 + 0.7 * e);
  float s2 = moodv(M_HANDS) * ZH[zone];
  float s3 = moodv(M_WAVE) * ZH[zone];
  float s4 = moodv(M_CLAP) * ZD[zone];
  float s5 = moodv(M_HUG) * ZC[zone];
  float s6 = moodv(M_POLS) * ZD[zone];
  float tot = s0 + s1 + s2 + s3 + s4 + s5 + s6;
  float nr = tot > 0.97 ? 0.97 / tot : 1.0;
  float c1 = s0 * nr; float c2 = c1 + s1 * nr; float c3 = c2 + s2 * nr; float c4 = c3 + s3 * nr;
  float c5 = c4 + s4 * nr; float c6 = c5 + s5 * nr; float c7 = c6 + s6 * nr;
  float e1 = below(u, c1), e2 = below(u, c2), e3 = below(u, c3), e4 = below(u, c4), e5 = below(u, c5), e6 = below(u, c6), e7 = below(u, c7);
  float wPh = e1, wFi = e2 - e1, wHa = e3 - e2, wWa = e4 - e3, wCl = e5 - e4, wHu = e6 - e5, wPo = e7 - e6, wId = 1.0 - e7;

  // ---- body actions: partition over v
  float v = mix(0.04, 1.0, hh(sd, 2.0));
  float t0 = moodv(M_JUMP) * ZJ[zone] * (0.6 + 0.8 * e) * kickOn;
  float t1 = moodv(M_STOMP) * ZD[zone];
  float t2 = moodv(M_HAKKEN) * ZK[zone] * kickOn;
  float t3 = moodv(M_BOUNCE) * ZD[zone];
  float t4 = moodv(M_CROUCH) * (zone == 7 ? 0.2 : 1.0);
  float t5 = moodv(M_SIT) * ZC[zone];
  float tt = t0 + t1 + t2 + t3 + t4 + t5;
  float nb = tt > 0.97 ? 0.97 / tt : 1.0;
  float d1 = t0 * nb; float d2 = d1 + t1 * nb; float d3 = d2 + t2 * nb; float d4 = d3 + t3 * nb; float d5 = d4 + t4 * nb; float d6 = d5 + t5 * nb;
  float f1 = below(v, d1), f2 = below(v, d2), f3 = below(v, d3), f4 = below(v, d4), f5 = below(v, d5), f6 = below(v, d6);
  float wJ = f1, wS = f2 - f1, wK = f3 - f2, wB = f4 - f3, wCr = f5 - f4, wSi = f6 - f5, wSw = 1.0 - f6;

  float wCh = uClock.w * below(hh(sd, 4.0), 0.88 * ZH[zone]);
  float wHb = below(mix(0.04, 1.0, hh(sd, 3.0)), moodv(M_HEADBANG) * ZF[zone]) * kickOn;

  // ---- arms
  float iv = hh(sd, 7.0);
  float br = sin(rt * 0.7 + ph);
  vec4 idL = AR(4.0 + 3.0 * br, 7.0, 12.0 + 8.0 * hh(sd, 8.0), 0.0);
  vec4 idR = AR(4.0 - 3.0 * br, 7.0, 14.0, 0.0);
  float headDown = 0.0;
  if (iv > 0.62 && iv < 0.76) { idL = AR(30.0, -14.0, 112.0, 0.0); idR = AR(26.0, -16.0, 120.0, 0.0); }
  else if (iv >= 0.76 && iv < 0.9) { float sip = smoothstep(0.85, 1.0, sin(rt * 0.23 + ph)); idR = AR(18.0 + 40.0 * sip, 8.0, 85.0 + 45.0 * sip, -10.0); }
  else if (iv >= 0.9) { idL = AR(24.0, 6.0, 100.0, 0.0); idR = AR(26.0, -2.0, 98.0, 10.0); headDown = 0.4; }

  float pump = kickOn > 0.5 ? exp(-pow((bp - 0.5) * 4.2, 2.0)) : 0.8 + 0.2 * sin(st * 2.0 + ph);
  vec4 fistUp = mix(AR(122.0, 22.0, 112.0, 0.0), AR(168.0, 12.0, 12.0, 0.0), pump);
  vec4 fistOther = AR(12.0, 12.0, 55.0 + 20.0 * kick, 0.0);
  float hsw = sin(b * PI * 0.5 + ph);
  float ha = hh(sd, 10.0), hb = hh(sd, 24.0), hc = hh(sd, 25.0);
  vec4 handsL = AR(146.0 + 22.0 * ha + 7.0 * sin(st * 1.1 + ph), 12.0 + 22.0 * hb + 6.0 * hsw, 8.0 + 34.0 * hc, -12.0);
  vec4 handsR = AR(146.0 + 22.0 * hb + 7.0 * sin(st * 1.1 + ph + 0.9), 12.0 + 22.0 * ha - 6.0 * hsw, 8.0 + 34.0 * (1.0 - hc), -12.0);
  float wv = sin(TAU * b / 4.0 + P.pos.x * 0.03);
  vec4 waveL = AR(156.0, 22.0 + 24.0 * wv, 18.0, 0.0);
  vec4 waveR = AR(156.0, 22.0 - 24.0 * wv, 18.0, 0.0);
  float cp = exp(-pow(min(bp, 1.0 - bp) * 7.0, 2.0));
  vec4 clap = AR(56.0, mix(26.0, 2.0, cp), 80.0, 0.0);
  vec4 hug = AR(16.0, 64.0 + 8.0 * hh(sd, 12.0), -62.0, 10.0);
  float flop = 0.5 + 0.5 * cos(TAU * (bp - 0.08));
  vec4 polL = AR(38.0, 14.0, 106.0 + 12.0 * kick, mix(15.0, 85.0, flop));
  vec4 polR = AR(38.0, 14.0, 106.0 + 12.0 * kick, mix(15.0, 85.0, 0.5 + 0.5 * cos(TAU * (bp - 0.14))));
  float hi = hh(sd, 9.0);
  vec4 phoneA = AR(116.0 + 42.0 * hi, 6.0, 72.0 - 56.0 * hi, -12.0);

  vec4 aL = idL * wId + handsL * wHa + waveL * wWa + clap * wCl + hug * wHu + polL * wPo;
  vec4 aR = idR * wId + handsR * wHa + waveR * wWa + clap * wCl + hug * wHu + polR * wPo;
  if (leftH) { aL += fistUp * wFi + phoneA * wPh; aR += fistOther * wFi + idR * wPh; }
  else { aR += fistUp * wFi + phoneA * wPh; aL += fistOther * wFi + idL * wPh; }

  // ---- body
  float drop = 0.0, lift = 0.0, lean = 0.0, roll = 0.0, twist = 0.0;
  vec3 xL = vec3(0.0), xR = vec3(0.0);   // extra hip flex / abduction / knee
  float headP = 0.0, headY = 0.0;
  float swA = mix(0.4, 1.0, moodv(M_SWAY)) * (wSw + 0.35 * (1.0 - wSw));
  float sw = sin(TAU * (0.3 + 0.16 * hh(sd, 13.0)) * st + ph);
  roll += 2.4 * D2R * sw * swA;
  Q.off.x += 0.03 * sw * swA;
  twist += 3.0 * D2R * sin(0.21 * rt + ph);
  headY += 0.22 * sin(0.13 * rt + ph * 1.7) * wSw;
  // hugging rows sway together, neighbouring rows in counter-phase
  float row = sin(TAU * st * 0.24 + floor(P.pos.z / 1.4) * PI + floor(P.pos.x / 12.0) * 0.4);
  roll += 7.0 * D2R * row * wHu;
  Q.off.x += 0.07 * row * wHu;
  // wave: whole upper body follows the arms
  Q.spine.z += 5.0 * D2R * wv * wWa;
  // push waves rolling through the packed pit
  if (zone == 0) {
    float pw = sin(P.pos.x * 0.21 + P.pos.z * 0.08 - st * 1.25) * smoothstep(0.3, 1.0, inten) * (0.5 + 0.5 * moodv(M_JUMP) + 0.3 * moodv(M_FIST));
    Q.off.x += 0.07 * pw;
    Q.off.z += 0.04 * pw;
    roll -= 3.0 * D2R * pw;
  }

  // jump: airborne between kicks, land (compressed) on the kick
  float s = clamp((bp - 0.1) / 0.78, 0.0, 1.0);
  float hop = 4.0 * s * (1.0 - s);
  float hj = (0.12 + 0.17 * e) * inten * (zone == 0 ? 1.25 : 1.0);
  lift += wJ * hj * hop;
  drop += wJ * 0.09 * (1.0 - smoothstep(0.0, 0.14, bp));
  float tuck = wJ * sin(PI * s);
  xL += vec3(20.0, 0.0, 38.0) * D2R * tuck;
  xR += vec3(20.0, 0.0, 38.0) * D2R * tuck;
  // stomp (tribal, legs alternate every beat)
  float which = mod(floor(b), 2.0);
  float lp = sin(PI * clamp(bp / 0.55, 0.0, 1.0));
  vec3 st3 = vec3(38.0, 0.0, 58.0) * D2R * lp * wS;
  if (which < 0.5) xL += st3; else xR += st3;
  drop += wS * 0.05 * (0.5 + 0.5 * cos(TAU * bp));
  lean += wS * 9.0 * D2R;
  // hakken: fast heel kicks on the half beats
  float hb2 = fract(b * 2.0);
  float wh = mod(floor(b * 2.0), 2.0);
  float kk = sin(PI * hb2);
  vec3 hk = vec3(26.0, 0.0, 10.0) * D2R * kk * wK;
  if (wh < 0.5) xL += hk; else xR += hk;
  drop += wK * 0.035 * (1.0 - kk);
  twist += wK * 9.0 * D2R * (wh * 2.0 - 1.0) * kk;
  // hardstyle bounce: lowest on the kick
  float bnc = (0.5 + 0.5 * cos(TAU * bp)) * kickOn + (1.0 - kickOn) * (0.5 + 0.5 * sin(TAU * st * 0.5 + ph)) * 0.4;
  drop += wB * (0.035 + 0.05 * e) * inten * bnc;
  lean += wB * 4.0 * D2R * bnc;
  headP += wB * 7.0 * D2R * bnc;
  // crouch before the drop / sit for the piano
  drop += wCr * 0.5 + wSi * 0.6;
  lean += wCr * 36.0 * D2R + wSi * 6.0 * D2R;
  headP -= wCr * 22.0 * D2R;
  xL.y += wSi * 24.0 * D2R; xR.y += wSi * 24.0 * D2R;
  vec4 knees = AR(40.0, 14.0, 66.0, 0.0);
  aL = mix(aL, knees, wCr + wSi);
  aR = mix(aR, knees, wCr + wSi);
  // head banging (Domitor Draconis)
  float nod = pow(0.5 + 0.5 * cos(TAU * bp), 2.0);
  headP += wHb * 30.0 * D2R * nod;
  Q.spine.x += wHb * 13.0 * D2R * nod;
  // cheer: arms thrown up + small hops
  aL = mix(aL, AR(166.0, 26.0, 12.0, 0.0), wCh);
  aR = mix(aR, AR(162.0, 22.0, 14.0, 0.0), wCh);
  lift += wCh * 0.09 * max(0.0, sin(TAU * 1.9 * st + ph));

  // flag carriers: hold the pole, wave figure-eights when flags are up
  if (carrier) {
    float fw = below(mix(0.04, 1.0, hh(sd, 14.0)), moodv(M_FLAGS) * 1.1);
    float fph = TAU * st * (0.55 + 0.35 * hh(sd, 15.0)) + ph;
    float sf = sin(fph);
    aR = mix(AR(66.0, 10.0, 78.0, -25.0), AR(150.0 + 10.0 * sf, 16.0 + 12.0 * sf, 22.0, -18.0), fw);
    aL = mix(AR(52.0, -8.0, 92.0, 0.0), AR(118.0, -2.0, 58.0, 0.0), fw);
    Q.flagTilt = vec2(0.42 * sf, 0.26 * sin(2.0 * fph)) * fw + vec2(0.05, -0.08) * (1.0 - fw);
    Q.spine.z += 5.0 * D2R * sf * fw;
    Q.flag = fw;
  }

  // walkers in the sparse zones (rear floor, crests, back plaza): to the bar, the toilets, friends …
  if ((zone == 3 || zone == 5 || zone == 6) && hh(sd, 30.0) < 0.07 && !carrier) {
    float range = 2.4;
    float spd = 1.05 + 0.3 * hh(sd, 31.0);
    float cyc = st * spd / (4.0 * range) + hh(sd, 32.0);
    float tri = abs(fract(cyc) * 2.0 - 1.0) * 2.0 - 1.0;     // -1..1 triangle
    float dirSign = fract(cyc) < 0.5 ? 1.0 : -1.0;
    vec2 fw = vec2(sin(P.yaw), cos(P.yaw));
    Q.push += fw * tri * range;
    Q.walkYaw = dirSign < 0.0 ? PI : 0.0;
    float gp = TAU * st * spd / 1.4 + ph;
    float gs = sin(gp);
    Q.legL = vec3(0.0); Q.legR = vec3(0.0);
    xL = vec3(24.0 * gs, 0.0, 8.0 + max(0.0, -cos(gp)) * 36.0) * D2R;
    xR = vec3(-24.0 * gs, 0.0, 8.0 + max(0.0, cos(gp)) * 36.0) * D2R;
    aL = AR(-18.0 * gs + 4.0, 7.0, 16.0, 0.0);
    aR = AR(18.0 * gs + 4.0, 7.0, 16.0, 0.0);
    drop = abs(gs) * 0.02;
    lift = 0.0; lean = 3.0 * D2R; headP = 0.0;
    wCh = 0.0; wPh = 0.0; wId = 1.0;
  }

  // step aside for the player, and look at them
  vec2 dpl = P.pos.xz + Q.push - uPlayer.xz;
  float rpl = length(dpl);
  if (uPlayer.w > 0.5 && rpl < 1.9) {
    float rn = rpl + (1.9 - rpl) * (1.9 - rpl) * 0.28;
    Q.push += (rpl > 1e-3 ? dpl / rpl : vec2(1.0, 0.0)) * (rn - rpl);
  }
  vec2 dcm = P.pos.xz + Q.push - uCamPush.xy;
  float rcm = length(dcm);
  if (uCamPush.w > 0.01 && rcm < 1.6) {
    float rn = rcm + (1.6 - rcm) * (1.6 - rcm) * 0.33;
    Q.push += (rcm > 1e-3 ? dcm / rcm : vec2(1.0, 0.0)) * (rn - rcm) * uCamPush.w;
  }
  if (uPlayer.w > 0.5 && rpl < 3.0) {
    vec2 fwd = vec2(sin(P.yaw), cos(P.yaw));
    vec2 to = -dpl / max(rpl, 1e-3);
    float ang = atan(fwd.x * to.y - fwd.y * to.x, dot(fwd, to));
    headY += clamp(-ang, -1.1, 1.1) * 0.8 * smoothstep(3.0, 1.2, rpl);
  }
  // look up at fireworks
  headP -= moodv(M_LOOKUP) * (0.22 + 0.28 * hh(sd, 16.0));
  headP += headDown * wId;

  // legs: keep the feet planted when the pelvis drops (2-bone IK, equal segment lengths)
  float a = acos(clamp(1.0 - drop / 0.86, -1.0, 1.0));
  Q.legL = vec3(a, 0.0, 2.0 * a) + xL;
  Q.legR = vec3(a, 0.0, 2.0 * a) + xR;
  Q.legL.y += 3.0 * D2R; Q.legR.y += 3.0 * D2R;
  Q.off.y += lift - drop;
  Q.rootR = vec3(lean * 0.4, twist, roll);
  Q.spine += vec3(lean * 0.6, 0.0, 0.0);
  Q.head = vec2(headP, headY);
  Q.armL = aL;
  Q.armR = aR;
  Q.cape = 0.14 + 0.5 * clamp(lift * 3.0, 0.0, 1.0) + 0.05 * sin(rt * 2.3 + ph) + 0.3 * lean;
  Q.phone = wPh;
  Q.light = below(mix(0.04, 1.0, hh(sd, 17.0)), moodv(M_LIGHTERS));

  // impostor frame (argmax of arm actions)
  float best = wId; Q.frame = 0.0;
  if (wFi > best) { best = wFi; Q.frame = pump > 0.45 ? (leftH ? 7.0 : 1.0) : 6.0; }
  if (wHa + wWa + wCh > best) { best = wHa + wWa + wCh; Q.frame = 2.0; }
  if (wPh > best) { best = wPh; Q.frame = 3.0; }
  if (wHu > best) { best = wHu; Q.frame = 4.0; }
  if (wCl > best) { best = wCl; Q.frame = 5.0; }
  if (wPo > best) { best = wPo; Q.frame = 6.0; }
  if (carrier && Q.flag > 0.5) Q.frame = 2.0;
  Q.squash = 1.0 - 0.3 * wCr - 0.4 * wSi;
  return Q;
}
`;

/** albedo of a body point (bone + slot + rest-pose position) from the packed look */
export const ALBEDO = /* glsl */ `
uniform vec3 uPal[64];

float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }

// original "tribe mark": a ring with three claw slashes (no official logo)
float emblem(vec2 p, float r) {
  float ring = abs(length(p) - r) - r * 0.11;
  float cl = 1e3;
  for (int i = -1; i <= 1; i++) {
    float fx = float(i) * r * 0.36;
    cl = min(cl, sdSeg(p, vec2(fx + r * 0.1, r * 0.62), vec2(fx - r * 0.12, -r * 0.6)) - r * 0.075 * (1.0 - 0.3 * abs(float(i))));
  }
  return min(ring, cl);
}

vec3 albedoOf(int bone, int slot, vec3 lp, ivec4 L) {
  vec3 skin = uPal[L.x & 7];
  bool costume = ((L.y >> 14) & 1) == 1;
  bool shirtless = ((L.y >> 7) & 1) == 1;
  bool tank = ((L.y >> 8) & 1) == 1;
  vec3 top = shirtless ? skin : uPal[16 + (L.y & 15)];
  vec3 bot = uPal[32 + ((L.y >> 9) & 7)];
  if (costume) { top = uPal[56 + ((L.y >> 15) & 3)]; bot = top; }
  int print = (L.y >> 4) & 7;
  if (slot == S_CAP || slot == S_HAT) return uPal[40 + ((L.x >> 12) & 7)];
  if (slot == S_HAIR || slot == S_PONY) return uPal[8 + ((L.x >> 3) & 7)];
  if (slot == S_BANDANA) return mix(uPal[60], uPal[63], step(0.5, fract(lp.x * 40.0 + lp.y * 25.0)) * 0.7);
  if (slot == S_LANTERN_L || slot == S_LANTERN_R) return vec3(0.9, 0.8, 0.6);
  if (slot == S_MIC) return vec3(0.02);
  if (slot == S_CAMERA || slot == S_CTRL) return vec3(0.025);
  vec3 c = skin;
  if (bone == B_HEAD) {
    int hs = (L.x >> 6) & 3;
    vec3 hair = uPal[8 + ((L.x >> 3) & 7)];
    float hairTop = hs == 3 ? 1.69 : 1.665;
    bool isHair = lp.y > hairTop - 0.03 * smoothstep(0.02, -0.08, lp.z) || (lp.z < -0.035 && lp.y > (hs == 1 ? 1.5 : 1.575));
    if (isHair && lp.y > 1.52) c = hair;
    // face: eyes, brows, mouth, beards, festival sunglasses (front hemisphere only)
    if (lp.z > 0.035 && !isHair) {
      vec2 e = vec2(abs(lp.x) - 0.031, lp.y - 1.652);
      float eye = 1.0 - smoothstep(0.009, 0.014, length(e * vec2(1.0, 1.6)));
      float brow = (1.0 - smoothstep(0.004, 0.008, abs(lp.y - 1.672))) * step(abs(abs(lp.x) - 0.031), 0.02);
      float mouth = (1.0 - smoothstep(0.003, 0.006, abs(lp.y - 1.596))) * step(abs(lp.x), 0.022);
      c = mix(c, c * 0.25, eye * 0.85);
      c = mix(c, hair * 0.9, brow * 0.7);
      c = mix(c, c * 0.45, mouth);
      if (((L.x >> 19) & 1) == 1 && lp.y < 1.615 && lp.y > 1.55) c = mix(c, hair, 0.85);
      if (((L.x >> 18) & 1) == 1 && abs(lp.y - 1.652) < 0.017 && abs(lp.x) < 0.058) c = vec3(0.012);
    }
    if (costume && ((L.y >> 15) & 3) == 0) c = top; // morph suit
  } else if (bone == B_SPINE) {
    c = top;
    if (!shirtless && !costume) {
      vec2 q = vec2(lp.x, lp.y);
      if (print == 1) {
        float d = lp.z < -0.05 ? emblem(q - vec2(0.0, 1.29), 0.085) : emblem(q - vec2(0.075, 1.36), 0.028);
        if (lp.z > -0.05 && lp.z < 0.05) d = 1.0;
        c = mix(c, uPal[18] * 1.1, 1.0 - smoothstep(0.0, 0.004, d));
      } else if (print == 2) {
        float lines = step(0.5, fract(lp.y * 55.0)) * step(abs(lp.x), 0.1) * step(1.27, lp.y) * step(lp.y, 1.37);
        lines *= step(0.3, fract(lp.x * 23.0 + floor(lp.y * 55.0) * 0.37));
        if (lp.z < -0.05) c = mix(c, vec3(0.8), lines);
      } else if (print == 3) {
        float band = step(abs(lp.y - 1.19), 0.02) + step(abs(lp.y - 1.31), 0.02);
        c = mix(c, uPal[53] * 1.2, clamp(band, 0.0, 1.0));
      } else if (print == 4) {
        c = mix(c, uPal[52], step(0.72, fract(lp.x * 22.0)));
      } else if (print == 5) {
        float n = vnoise(lp.xy * 24.0 + lp.z * 11.0);
        c = mix(c, uPal[25] * 0.7, smoothstep(0.45, 0.8, n));
      } else if (print == 6) {
        float n = vnoise(vec2(lp.x * 30.0, lp.y * 9.0 - lp.x * 3.0));
        float fl = smoothstep(1.2 + 0.14 * n, 1.08, lp.y);
        c = mix(c, mix(uPal[18], uPal[55], smoothstep(1.06, 1.16, lp.y)), fl * step(0.35, n));
      }
      if (tank && abs(lp.x) > 0.11 && lp.y > 1.34) c = skin;
    }
  } else if (bone == B_PELVIS) {
    c = lp.y > 1.02 ? top : bot;
    if (shirtless && lp.y > 1.02) c = skin;
  } else if (bone == B_UARM_L || bone == B_UARM_R) {
    c = (!shirtless && !tank && lp.y > 1.27) || costume ? top : skin;
  } else if (bone == B_FARM_L || bone == B_FARM_R || bone == B_HAND_L || bone == B_HAND_R) {
    c = costume ? top : skin;
    if (((L.x >> 17) & 1) == 1 && lp.y < 0.915 && lp.y > 0.885) c = uPal[61];
  } else if (bone == B_THIGH_L || bone == B_THIGH_R) {
    c = bot;
  } else if (bone == B_FOOT_L || bone == B_FOOT_R) {
    c = uPal[48 + ((L.x >> 15) & 3)];
  } else if (bone == B_SHIN_L || bone == B_SHIN_R) {
    bool lng = ((L.y >> 12) & 1) == 1 || costume;
    c = (lng || lp.y > 0.5) ? bot : skin;
    if (((L.y >> 13) & 1) == 1 && lp.y < 0.2 && !lng) c = vec3(0.8);
    if (lp.y < 0.105) c = uPal[48 + ((L.x >> 15) & 3)];
  }
  return c;
}

bool slotVisible(int slot, ivec4 L) {
  if (slot == S_BODY) return true;
  int hw = (L.x >> 9) & 7;
  int hs = (L.x >> 6) & 3;
  if (slot == S_CAP) return hw == 1 || hw == 2;
  if (slot == S_HAT) return hw == 3;
  if (slot == S_BANDANA) return hw == 4;
  if (slot == S_HAIR) return hs == 1 && hw != 3;
  if (slot == S_PONY) return hs == 2 && hw != 3;
  if (slot == S_CAPE) return (L.z & 1) == 1;
  int props = (L.z >> 8) & 31;
  if (slot == S_LANTERN_L) return (props & 1) != 0;
  if (slot == S_LANTERN_R) return (props & 2) != 0;
  if (slot == S_MIC) return (props & 4) != 0;
  if (slot == S_CAMERA) return (props & 8) != 0;
  if (slot == S_CTRL) return (props & 16) != 0;
  return false;
}
`;

/** LightEnv-driven fake global illumination (stage, audience wash, flashes, strobes, sky, moon) */
export const LIGHTING = /* glsl */ `
uniform vec3 uStageCol;   // stage light reaching the audience (colour * intensity)
uniform vec3 uStagePos;
uniform vec3 uRimCol;     // rim from the luminous set behind the silhouettes
uniform vec3 uWashCol;    // audience wash (beams sweeping the crowd)
uniform vec3 uFlashCol;
uniform vec3 uFlashPos;
uniform float uStrobe;
uniform vec3 uSkyUp;
uniform vec3 uSkyLow;
uniform vec3 uTwilight;
uniform vec3 uMoonCol;
uniform vec3 uMoonDir;
uniform vec3 uHazeAmb;   // lit haze over the field scatters the show colour from above

float washPattern(vec3 wp) {
  float t = uClock.x;
  vec2 rel = wp.xz - vec2(0.0, -8.0);
  float ang = atan(rel.x, rel.y);
  float r = length(rel);
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float c = 0.62 * sin(t * (0.19 + 0.07 * fi) + fi * 1.7);
    float rr = 35.0 + 70.0 * (0.5 + 0.5 * sin(t * (0.11 + 0.05 * fi) + fi * 2.3));
    float dA = (ang - c) * r;
    float dR = r - rr;
    s += exp(-(dA * dA) / 32.0 - (dR * dR) / 700.0);
  }
  return 0.3 + 1.6 * s;
}

vec3 stageLight(vec3 wp, vec3 N) {
  vec3 Ls = uStagePos - wp;
  float ds = length(Ls);
  Ls /= ds;
  float att = 1.0 / (1.0 + ds * ds / 14400.0);
  float ndl = dot(N, Ls);
  return (uStageCol + vec3(uStrobe * 2.4)) * att * (max(ndl, 0.0) + 0.035);
}

vec3 envLight(vec3 wp, vec3 N) {
  vec3 c = stageLight(wp, N);
  c += mix(uSkyLow, uSkyUp, N.y * 0.5 + 0.5);
  c += uHazeAmb * (0.35 + 0.65 * max(N.y, 0.0)) / (1.0 + max(0.0, wp.z - 20.0) / 160.0);
  c += uTwilight * max(dot(N, normalize(vec3(0.12, 0.3, 1.0))), 0.0);
  c += uMoonCol * max(dot(N, uMoonDir), 0.0);
  vec3 Lf = uFlashPos - wp;
  float df = length(Lf);
  c += uFlashCol * max(dot(N, Lf / df), 0.0) / (1.0 + df * df / 8100.0);
  // beams from the rig sweeping the audience hit heads, shoulders and faces
  vec3 Lw = normalize(vec3(-wp.x * 0.004, 0.75, -0.66));
  c += uWashCol * washPattern(wp) * max(dot(N, Lw), 0.0);
  return c;
}

vec3 rimLight(vec3 wp, vec3 N, vec3 V) {
  vec3 Ls = normalize(uStagePos - wp);
  float ds = length(uStagePos - wp);
  float att = 1.0 / (1.0 + ds * ds / 22500.0);
  float nv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - nv, 2.6);
  float back = clamp(dot(Ls, -V) * 0.7 + 0.35, 0.0, 1.0);
  float side = clamp(dot(N, Ls) * 0.6 + 0.55, 0.0, 1.0);
  vec3 Lf = normalize(uFlashPos - wp);
  vec3 rim = (uRimCol + vec3(uStrobe * 1.5)) * att * back * side;
  rim += uFlashCol * 0.05 * clamp(dot(Lf, -V) * 0.7 + 0.3, 0.0, 1.0);
  return rim * fres;
}
`;

const FOG_V = /* glsl */ `#include <fog_pars_vertex>`;
const FOG_F = /* glsl */ `#include <fog_pars_fragment>`;

// ---------------------------------------------------------------------------------------------
// NEAR / MID bodies (instanced over an index list) and PERFORMERS (pose from instance attributes)
// ---------------------------------------------------------------------------------------------

export function bodyVertex(kind: 'near' | 'mid' | 'performer'): string {
  const performer = kind === 'performer';
  const mid = kind === 'mid';
  return /* glsl */ `
${COMMON}
${performer ? '' : PERSON_POSE}
${ALBEDO}
${LIGHTING}
${FOG_V}
attribute float aBone;
${
  performer
    ? `attribute vec4 iPos; attribute vec4 iAttr; attribute vec4 iLook;
attribute vec4 iP0; attribute vec4 iP1; attribute vec4 iP2; attribute vec4 iP3; attribute vec4 iP4; attribute vec4 iP5; attribute vec4 iP6;`
    : 'attribute float aIdx;'
}
${mid ? 'varying vec3 vCol;' : 'varying vec3 vN; varying vec3 vW; varying vec3 vLocal; flat varying ivec4 vLook; flat varying int vBone; flat varying int vSlot;'}
${performer ? 'varying float vGlow;' : ''}

void main() {
${
  performer
    ? `  Person P;
  P.pos = iPos.xyz; P.yaw = iPos.w; P.h = iAttr.x; P.build = iAttr.y; P.seed = iAttr.z; P.zone = 0.0;
  P.look = ivec4(iLook + 0.5);
  Pose Q = restPose();
  Q.off = iP0.xyz; Q.cape = iP0.w; Q.rootR = iP1.xyz; Q.head.x = iP1.w; Q.spine = iP2.xyz; Q.head.y = iP2.w;
  Q.armL = iP3; Q.armR = iP4; Q.legL = iP5.xyz; Q.legR = vec3(iP5.w, iP6.xy); Q.shoW = iP6.z; Q.hipW = iP6.w;
  vGlow = iAttr.w;`
    : `  Person P = fetchPerson(aIdx);
  Pose Q = personPose(P);`
}
  int bone = int(mod(aBone, 32.0) + 0.5);
  int slot = int(floor(aBone / 32.0 + 0.01));
  vec3 p = position;
  vec3 n = normal;
  if (!slotVisible(slot, P.look)) p = vec3(0.0, 1.2, 0.0);
  if (slot == S_CAP && ((P.look.x >> 9) & 7) == 2) { p.z = 0.024 - p.z; n.z = -n.z; }
  vec3 lp = skinPt(bone, p, n, Q);
  vec3 wp = toWorld(P, Q, lp);
  vec3 wn = normalize(rY(P.yaw + Q.walkYaw) * n);
  vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mvPosition;
${
  mid
    ? `  vec3 alb = max(albedoOf(bone, slot, p, P.look), vec3(0.022));
  vec3 V = normalize(cameraPosition - wp);
  float ao = mix(0.28, 1.0, smoothstep(0.35, 1.5, p.y));
  vCol = alb * envLight(wp, wn) * ao + rimLight(wp, wn, V) * (0.35 + 0.65 * smoothstep(0.9, 1.6, p.y));`
    : `  vN = wn; vW = wp; vLocal = p; vLook = P.look; vBone = bone; vSlot = slot;`
}
  #include <fog_vertex>
}
`;
}

export function bodyFragment(kind: 'near' | 'mid' | 'performer'): string {
  const performer = kind === 'performer';
  if (kind === 'mid') {
    return /* glsl */ `
${FOG_F}
varying vec3 vCol;
void main() {
  gl_FragColor = vec4(vCol, 1.0);
  #include <fog_fragment>
  #include <colorspace_fragment>
}
`;
  }
  return /* glsl */ `
uniform vec4 uClock;
${ALBEDO_HEADER}
${LIGHTING}
${FOG_F}
uniform sampler2D tFlags;
${performer ? 'uniform vec4 uLantern; uniform vec4 uTube; uniform vec4 uKey; varying float vGlow;' : ''}
varying vec3 vN; varying vec3 vW; varying vec3 vLocal; flat varying ivec4 vLook; flat varying int vBone; flat varying int vSlot;

void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  vec3 alb;
  vec3 emit = vec3(0.0);
  if (vSlot == S_CAPE) {
    int fi = (vLook.z >> 1) & 31;
    vec2 cuv = vec2(clamp(vLocal.x / 0.72 + 0.5, 0.0, 1.0), clamp((1.45 - vLocal.y) / 0.73, 0.0, 1.0));
    vec2 cell = vec2(float(fi & 7), float(fi >> 3));
    alb = texture2D(tFlags, (cell + vec2(cuv.x, 1.0 - cuv.y) * 0.96 + 0.02) / vec2(8.0, 4.0)).rgb * 0.8;
  } else {
    alb = albedoOf(vBone, vSlot, vLocal, vLook);
  }
${
  performer
    ? `  if (vSlot == S_LANTERN_L || vSlot == S_LANTERN_R) {
    float fl = 0.85 + 0.15 * sin(uClock.y * 23.0 + vW.x * 7.0) * sin(uClock.y * 7.3 + vW.z);
    emit = vec3(1.0, 0.86, 0.55) * 7.0 * vGlow * fl;
  }`
    : ''
}
  // black cotton still reflects ~3 %; humid skin gets a sheen towards the stage (hot night)
  bool isSkin = alb == uPal[vLook.x & 7];
  alb = max(alb, vec3(0.022));
  float spec = isSkin ? 1.0 : 0.0;
  // crowd occlusion: bodies below the head plane are shadowed by the neighbours
  float ao = ${performer ? '1.0' : 'mix(0.28, 1.0, smoothstep(0.35, 1.5, vLocal.y))'};
  vec3 light = envLight(vW, N) * ao;
${
  performer
    ? `  light += uLantern.rgb * uLantern.a * (0.55 + 0.45 * max(N.y, 0.0));
  vec3 Lt = vec3(0.12, 1.95, 58.75) - vW;
  float dt = length(Lt);
  light += uTube.rgb * uTube.a * (max(dot(N, Lt / dt), 0.0) * 1.6 + 0.15) / (1.0 + dt * dt * 0.5);
  // performers on the deck: front key from the FOH follow spots + the set wash spilling onto the deck
  float onDeck = smoothstep(3.0, -0.5, vW.z);
  vec3 Lk = normalize(vec3(0.0, 11.0, 88.0) - vW);
  light += uKey.rgb * uKey.a * onDeck * (max(dot(N, Lk), 0.0) * 0.9 + 0.12);`
    : ''
}
  vec3 Hs = normalize(normalize(uStagePos - vW) + V);
  float sheen = pow(max(dot(N, Hs), 0.0), 24.0) * spec * 0.35;
  vec3 col = alb * light + rimLight(vW, N, V) * (0.4 + 0.6 * smoothstep(0.9, 1.6, vLocal.y)) * (1.0 + spec * 0.5) + (uStageCol + uRimCol * 0.5) * sheen + emit;
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
  #include <colorspace_fragment>
}
`;
}

/** ALBEDO needs the vnoise/hash helpers + look defines on the fragment side as well */
const ALBEDO_HEADER = /* glsl */ `
#define PI 3.14159265
#define TAU 6.28318531
#define B_PELVIS 0
#define B_SPINE 1
#define B_HEAD 2
#define B_UARM_L 3
#define B_FARM_L 4
#define B_HAND_L 5
#define B_UARM_R 6
#define B_FARM_R 7
#define B_HAND_R 8
#define B_THIGH_L 9
#define B_SHIN_L 10
#define B_THIGH_R 11
#define B_SHIN_R 12
#define B_CAPE 13
#define B_FOOT_L 14
#define B_FOOT_R 15
#define S_BODY 0
#define S_CAP 1
#define S_HAT 2
#define S_HAIR 3
#define S_PONY 4
#define S_BANDANA 5
#define S_CAPE 6
#define S_LANTERN_L 7
#define S_LANTERN_R 8
#define S_MIC 9
#define S_CAMERA 10
#define S_CTRL 11
uint hu(uint x) { x ^= x >> 16u; x *= 0x7feb352du; x ^= x >> 15u; x *= 0x846ca68bu; x ^= x >> 16u; return x; }
float h2(vec2 c) { return float(hu(uint(int(c.x) + 8192) * 73856093u ^ uint(int(c.y) + 8192) * 19349663u)) * (1.0 / 4294967296.0); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y);
}
${ALBEDO}
`;

// ---------------------------------------------------------------------------------------------
// FAR impostors: camera-facing quads with a procedurally drawn silhouette atlas
// ---------------------------------------------------------------------------------------------

export const IMPOSTOR_VERT = /* glsl */ `
${COMMON}
${PERSON_POSE}
${ALBEDO}
${LIGHTING}
${FOG_V}
attribute float aIdx;
varying vec2 vUv;
varying float vH;
varying vec3 vSkin; varying vec3 vTop; varying vec3 vBot; varying vec3 vHair;
varying vec3 vLight; varying vec3 vRim;
void main() {
  Person P = fetchPerson(aIdx);
  vH = uv.y * 1.3;
  Pose Q = personPose(P);
  vec3 base = P.pos + vec3(Q.push.x, 0.0, Q.push.y);
  vec3 toCam = cameraPosition - base;
  vec2 tc = normalize(toCam.xz + vec2(1e-4, 0.0));
  vec3 right = vec3(tc.y, 0.0, -tc.x);
  float s = P.h / 1.75;
  float w = 0.86 * P.h * mix(1.0, P.build, 0.6);
  float h = 1.3 * P.h * Q.squash;
  float lift = (Q.off.y + 0.02) * s;
  // lean the card towards steep (drone) cameras so the crowd does not collapse into lines
  vec3 dirC = normalize(toCam);
  float elevC = clamp(dirC.y, 0.0, 1.0);
  vec3 upV = normalize(mix(vec3(0.0, 1.0, 0.0), normalize(vec3(0.0, 1.0, 0.0) - dirC * dirC.y + vec3(0.0, 1e-3, 0.0)), smoothstep(0.35, 0.95, elevC) * 0.75));
  vec3 wp = base + right * (uv.x - 0.5) * w + upV * (uv.y * h) + vec3(0.0, lift, 0.0);
  vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  // atlas cell: 8 poses x 4 body variants; mirror when seen from the front
  int hs = (P.look.x >> 6) & 3;
  int hw = (P.look.x >> 9) & 7;
  bool female = ((P.look.x >> 8) & 1) == 1;
  float variant = female ? (hs == 2 ? 3.0 : 1.0) : (hw >= 1 && hw <= 3 ? 2.0 : 0.0);
  vec2 fwd = vec2(sin(P.yaw + Q.walkYaw), cos(P.yaw + Q.walkYaw));
  bool front = dot(fwd, tc) > 0.0;
  float ux = front ? 1.0 - uv.x : uv.x;
  vUv = vec2((Q.frame + ux) / 8.0, (variant + uv.y) / 4.0);
  vSkin = albedoOf(B_HEAD, 0, vec3(0.0, 1.6, 0.1), P.look);
  vTop = albedoOf(B_SPINE, 0, vec3(0.0, 1.2, 0.2), P.look);
  vBot = albedoOf(B_THIGH_L, 0, vec3(0.1, 0.7, 0.0), P.look);
  vHair = (hw >= 1 && hw <= 3) ? uPal[40 + ((P.look.x >> 12) & 7)] : (hs == 3 ? mix(vSkin, uPal[8 + ((P.look.x >> 3) & 7)], 0.5) : uPal[8 + ((P.look.x >> 3) & 7)]);
  float elev = clamp(toCam.y / max(length(toCam), 1e-3), 0.0, 1.0);
  vec3 N = normalize(mix(vec3(tc.x, 0.25, tc.y), vec3(0.0, 1.0, 0.0), elev * 0.8));
  vec3 chest = base + vec3(0.0, 1.3 * s, 0.0);
  vLight = envLight(chest, N);
  vec3 V = normalize(cameraPosition - chest);
  vRim = rimLight(chest, normalize(right * 0.9 + vec3(0.0, 0.45, 0.0)), V) * 1.3;
  #include <fog_vertex>
}
`;

export const IMPOSTOR_FRAG = /* glsl */ `
uniform sampler2D tAtlas;
${FOG_F}
varying vec2 vUv;
varying float vH;
varying vec3 vSkin; varying vec3 vTop; varying vec3 vBot; varying vec3 vHair;
varying vec3 vLight; varying vec3 vRim;
void main() {
  vec4 a = texture2D(tAtlas, vUv);
  float ao = mix(0.28, 1.0, smoothstep(0.2, 0.86, vH));
  if (a.r < 0.5) discard;
  vec3 alb = max(a.g < 0.17 ? vSkin : (a.g < 0.5 ? vHair : (a.g < 0.83 ? vTop : vBot)), vec3(0.022));
  vec3 col = alb * vLight * ao + vRim * a.b;
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
  #include <colorspace_fragment>
}
`;

// ---------------------------------------------------------------------------------------------
// FLAGS (pole + waving cloth attached to the carrier's hand)
// ---------------------------------------------------------------------------------------------

export const FLAG_VERT = /* glsl */ `
${COMMON}
${PERSON_POSE}
${LIGHTING}
${FOG_V}
uniform vec3 uWind;
attribute float aPart;
attribute vec4 iFlag;  // carrier index, atlas type, pole length, cloth width
attribute vec4 iFlag2; // cloth height, banner (0/1), phase
varying vec2 vUv;
varying vec3 vW; varying vec3 vN;
flat varying float vType;
flat varying float vPart;
void main() {
  Person P = fetchPerson(iFlag.x);
  Pose Q = personPose(P);
  vec3 n = vec3(0.0, 1.0, 0.0);
  vec3 grip = toWorld(P, Q, skinPt(B_HAND_R, vec3(-0.212, 0.78, 0.02), n, Q));
  float tx = Q.flagTilt.x, tz = Q.flagTilt.y;
  vec3 dirL = normalize(vec3(sin(tx), cos(tx) * cos(tz), sin(tz)));
  vec3 pole = rY(P.yaw) * dirL;
  float L = iFlag.z;
  vec3 bottom = grip - pole * 0.45;
  vec3 top = grip + pole * (L - 0.45);
  float rt = uClock.y;
  float ph = iFlag2.z;
  vec3 wp;
  vec3 N;
  if (aPart < 0.5) {
    vec3 side = normalize(cross(pole, vec3(0.0, 0.0, 1.0)) + vec3(1e-4));
    vec3 fwd = cross(side, pole);
    wp = bottom + side * position.x + fwd * position.z + pole * position.y * L;
    N = normalize(side * position.x + fwd * position.z);
    vUv = vec2(0.0);
  } else {
    float u = uv.x, v = uv.y;
    float waveAmt = Q.flag;
    float windA = atan(uWind.x, uWind.z);
    float swing = 1.2 * sin(TAU * uClock.x * 0.62 + ph - u * 1.9) * waveAmt;
    float flyA = windA + swing + 0.25 * sin(rt * 0.6 + ph) * (1.0 - waveAmt);
    float droop = mix(0.62, 0.18, waveAmt);
    vec3 fly = normalize(vec3(sin(flyA), -droop * u, cos(flyA)));
    vec3 perp = normalize(cross(fly, vec3(0.0, 1.0, 0.0)));
    float rip = (0.07 + 0.05 * waveAmt) * u * sin(u * 9.0 - rt * (7.0 + 4.0 * waveAmt) + ph) + 0.03 * u * sin(u * 17.0 - rt * 13.0 + ph * 2.0);
    float W = iFlag.w, H = iFlag2.x;
    if (iFlag2.y > 0.5) {
      // vertical banner hanging from a short crossbar at the pole top
      vec3 bar = normalize(vec3(fly.x, 0.0, fly.z));
      wp = top + bar * (u * W) - vec3(0.0, v * H, 0.0) + perp * (rip * 0.6 + 0.12 * v * sin(rt * 1.7 + ph + v * 2.0)) ;
      N = perp;
    } else {
      wp = top - pole * (v * H) + fly * (u * W) + perp * rip;
      N = normalize(perp + fly * 0.3 * cos(u * 9.0 - rt * 7.0 + ph));
    }
    vUv = vec2(u, v);
  }
  vW = wp;
  vN = N;
  vType = iFlag.y;
  vPart = aPart;
  vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const FLAG_FRAG = /* glsl */ `
uniform vec4 uClock;
uniform sampler2D tFlags;
${LIGHTING}
${FOG_F}
varying vec2 vUv;
varying vec3 vW; varying vec3 vN;
flat varying float vType;
flat varying float vPart;
void main() {
  vec3 alb;
  if (vPart < 0.5) {
    alb = vec3(0.12);
  } else {
    int t = int(vType + 0.5);
    vec2 cell = vec2(float(t & 7), float(t >> 3));
    vec4 tx = texture2D(tFlags, (cell + vec2(vUv.x, 1.0 - vUv.y) * 0.96 + 0.02) / vec2(8.0, 4.0));
    if (tx.a < 0.5) discard;
    alb = tx.rgb * 0.85;
  }
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  if (dot(N, V) < 0.0) N = -N;
  vec3 col = alb * envLight(vW, N);
  // translucent cloth: stage light shining through from behind
  vec3 Ls = normalize(uStagePos - vW);
  float through = max(dot(Ls, -V), 0.0);
  float ds = length(uStagePos - vW);
  col += alb * (uStageCol + uRimCol * 0.6 + vec3(uStrobe)) * through * through * 0.9 / (1.0 + ds * ds / 20000.0) * step(0.5, vPart);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
  #include <colorspace_fragment>
}
`;

// ---------------------------------------------------------------------------------------------
// PHONES / FLASHLIGHTS / LIGHTERS (additive sprites in the hands)
// ---------------------------------------------------------------------------------------------

export const LIGHTS_VERT = /* glsl */ `
${COMMON}
${PERSON_POSE}
uniform vec3 uScreen;
uniform float uPixel;  // world size of ~1 px at 1 m
varying vec2 vQ;
varying vec3 vCol;
varying float vShape;
void main() {
  Person P = fetchPerson(float(gl_InstanceID));
  Pose Q = personPose(P);
  bool leftH = ((P.look.z >> 7) & 1) == 1;
  float on = Q.phone;
  vec3 n = vec3(0.0, 1.0, 0.0);
  vec3 hp;
  if (leftH) hp = skinPt(B_HAND_L, vec3(0.212, 0.72, 0.05), n, Q);
  else hp = skinPt(B_HAND_R, vec3(-0.212, 0.72, 0.05), n, Q);
  vec3 c = toWorld(P, Q, hp);
  vec3 toCam = cameraPosition - c;
  float dist = length(toCam);
  vec2 fwd = vec2(sin(P.yaw), cos(P.yaw));
  float seesScreen = smoothstep(-0.1, 0.25, -dot(fwd, toCam.xz / max(dist, 1e-3)));
  bool lighter = hh(P.seed, 21.0) < 0.14;
  float flash = Q.light;
  // screens show the stage: tinted by the show colours, a few brighter / whiter
  vec3 col = mix(uScreen, vec3(0.9, 0.95, 1.0), hh(P.seed, 22.0) * 0.6) * (1.2 + 0.9 * hh(P.seed, 23.0)) * seesScreen;
  // flashlight LEDs sit on the back of the phone (seen from the stage side); lighters glow all round
  if (flash > 0.5) col = lighter ? vec3(1.0, 0.62, 0.22) * (3.2 + 0.8 * sin(uClock.y * 19.0 + P.seed)) : col + vec3(0.9, 0.95, 1.0) * 6.0 * (1.0 - seesScreen);
  float vis = on * step(0.02, dot(col, vec3(1.0)));
  float real = 0.036;
  float size = max(real, dist * uPixel * 1.6);
  float k = real / size;
  vCol = col * vis * max(k * k, mix(0.012, 0.035, 1.0 - seesScreen)) * (0.6 + 0.4 * k);
  vShape = k;
  vQ = position.xy;
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 dir = toCam / max(dist, 1e-3);
  vec3 right = normalize(cross(up, dir));
  vec3 up2 = cross(dir, right);
  float asp = mix(1.0, 1.9, k);
  vec3 wp = c + (right * position.x + up2 * position.y * asp) * size * (vis > 0.0 ? 1.0 : 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

export const LIGHTS_FRAG = /* glsl */ `
varying vec2 vQ;
varying vec3 vCol;
varying float vShape;
void main() {
  float d = length(vQ);
  float rect = 1.0 - smoothstep(0.75, 0.95, max(abs(vQ.x), abs(vQ.y)));
  float dot_ = exp(-d * d * 3.0);
  float a = mix(dot_, rect, vShape);
  if (a < 0.01) discard;
  gl_FragColor = vec4(vCol * a, 1.0);
}
`;

// ---------------------------------------------------------------------------------------------
// PROPS (piano riser, piano, light tube, pedestal, tripods)
// ---------------------------------------------------------------------------------------------

export const PROP_VERT = /* glsl */ `
${FOG_V}
uniform vec4 uClock;
uniform vec4 uGroups; // visibility of groups 1..4
attribute vec3 color;
attribute vec2 aProp; // group, emissive strength
varying vec3 vCol; varying vec3 vW; varying vec3 vN; varying float vEmit; flat varying float vGroup;
void main() {
  float g = aProp.x;
  float vis = g < 0.5 ? 1.0 : (g < 1.5 ? uGroups.x : (g < 2.5 ? uGroups.y : (g < 3.5 ? uGroups.z : uGroups.w)));
  vec3 p = position;
  if (vis < 0.5) p = vec3(0.0);
  vec4 wp4 = modelMatrix * vec4(p, 1.0);
  vW = wp4.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vCol = color;
  vEmit = aProp.y;
  vGroup = g;
  vec4 mvPosition = viewMatrix * wp4;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const PROP_FRAG = /* glsl */ `
uniform vec4 uClock;
uniform vec4 uTube; // rgb, intensity
${LIGHTING}
${FOG_F}
varying vec3 vCol; varying vec3 vW; varying vec3 vN; varying float vEmit; flat varying float vGroup;
void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  vec3 col = vCol * envLight(vW, N) + rimLight(vW, N, V) * 0.5;
  // the vertical light tube lights the white lacquer of the piano
  vec3 tubeP = vec3(0.12, 1.95, 58.75);
  vec3 Lt = tubeP - vW;
  float dt = length(Lt);
  col += vCol * uTube.rgb * uTube.a * (max(dot(N, Lt / dt), 0.0) * 1.8 + 0.12) / (1.0 + dt * dt * 0.5);
  col += vCol * uTube.rgb * vEmit * uTube.a;
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
  #include <colorspace_fragment>
}
`;
