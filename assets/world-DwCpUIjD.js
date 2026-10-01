const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./DevProxy-CleK4hdN.js","./three-C02pY5xm.js"])))=>i.map(i=>d[i]);
import{$ as e,A as t,B as n,Ct as r,D as i,Dt as a,E as o,Ft as s,H as c,I as l,It as u,J as d,L as f,Lt as p,M as m,Mt as h,Nt as g,O as _,Ot as v,P as y,Q as b,R as x,S,St as C,T as w,V as T,X as E,Z as D,_ as O,a as k,b as A,bt as ee,c as te,d as j,et as ne,f as M,ft as re,h as ie,ht as N,i as ae,it as oe,j as se,k as P,mt as F,n as ce,nt as le,p as ue,q as de,rt as fe,t as pe,u as me,ut as he,v as I,vt as ge,wt as _e,x as ve,y as ye,yt as be,z as xe}from"./three-C02pY5xm.js";import{A as Se,B as Ce,C as we,D as Te,E as Ee,F as De,G as Oe,H as ke,I as Ae,J as je,K as Me,L as Ne,M as Pe,N as Fe,O as Ie,P as Le,R as Re,S as ze,T as Be,U as Ve,V as He,W as Ue,X as We,Y as L,_ as Ge,a as Ke,at as qe,b as Je,c as Ye,ct as R,d as Xe,et as Ze,g as Qe,h as $e,i as et,it as z,j as tt,k as nt,l as rt,lt as it,m as at,n as ot,nt as st,o as ct,ot as lt,q as ut,r as dt,rt as ft,s as pt,st as mt,tt as ht,u as gt,ut as B,v as _t,w as vt,x as yt,y as bt,z as xt}from"./stage-Y6-F9PG-.js";var St=yt.x,Ct=yt.z,wt=yt.r,Tt=L(St,Ct)+wt+3,Et=.9,Dt=-Math.PI/2,Ot=Math.PI*2/16,kt=L(St,Ct),At=.22,jt=.09,Mt=.3,Nt=[-1.6,1.6].flatMap(e=>[-7,7].map(t=>[St+e*1.6,kt,Ct+t,St+e,Tt,Ct])),Pt=1.75,Ft=.25,It={w:1.3,d:1.9,floorY:-2.5,wallH:.72,roofY:-.38,seatH:.45,seatZ:.68,door:.36},Lt={x0:80,x1:85.6,z0:183,z1:192,y:0},Rt={x0:80,x1:82.8,z0:172.4,z1:183},zt={x0:80,x1:82.8,z:173.5},Bt=Lt.x1-.25,Vt=.21;function Ht(e){return e%300/300*Math.PI*2}function Ut(e,t){return Zt(e*Ot-Ht(t))}function Wt(e,t){return Zt(Ut(e,t)-Dt)}function Gt(e){let t=0,n=1/0;for(let r=0;r<16;r++){let i=Math.abs(Wt(r,e));i<n&&(n=i,t=r)}return t}function Kt(e,t,n){let r=Ut(e,t);return n.set(St,Tt+Math.sin(r)*wt,Ct+Math.cos(r)*wt),.017*(.7*Math.sin(t*2.5+e*1.7)+.3*Math.sin(t*.93+e*2.3))}function qt(e,t,n,r,i,a){let o=Math.cos(t),s=Math.sin(t);return a.set(e.x+n,e.y+r*o-i*s,e.z+r*s+i*o)}function Jt(e,t){let n=Lt,r=Rt;if(e<n.x0||e>n.x1||t<r.z0||t>n.z1)return null;if(t>=n.z0)return n.y;if(e>r.x1)return null;let i=L(e,r.z0),a=(t-r.z0)/(r.z1-r.z0);return i+(n.y-i)*a}function Yt(){let e=Lt,t=Rt,n=.08,r=(e,t,r,i)=>({kind:`box`,minX:Math.min(e,r)-n,maxX:Math.max(e,r)+n,minZ:Math.min(t,i)-n,maxZ:Math.max(t,i)+n,tag:`wheel`});return[r(t.x0,172.6,e.x0,e.z1),r(t.x1,172.6,t.x1,e.z0),r(t.x1,e.z0,e.x1,e.z0),r(e.x1,e.z0,e.x1,e.z1),r(e.x0,e.z1,e.x1,e.z1)]}function Xt(e,t,n,r,i,a,o){let s=1/0,c=0,l=1,u=0,d=n-Tt,f=r-Ct,p=Math.hypot(d,f),m=p>1e-6?d/p:1,h=p>1e-6?f/p:0,g=Ht(e);for(let e=-1;e<=1;e+=2){let n=t-(St+e*Et),r=p-wt,i=Math.hypot(n,r);i-At<s&&(s=i-At,i>1e-6?(c=n/i,l=m*r/i,u=h*r/i):(c=0,l=m,u=h))}if(!a){let e=Math.round((Math.atan2(d,f)+g)/Ot);for(let n=e-1;n<=e+1;n++){let e=n*Ot-g,r=Math.sin(e),i=Math.cos(e),a=Math.min(wt,Math.max(0,d*r+f*i)),o=d-r*a,p=f-i*a;for(let e=-1;e<=1;e+=2){let n=t-(St+e*Et),r=Math.hypot(n,o,p);r-jt<s&&r>1e-6&&(s=r-jt,c=n/r,l=o/r,u=p/r)}}}for(let a=0;a<16;a++){if(a===i)continue;let o=Ut(a,e),d=Tt+Math.sin(o)*wt-1.25,f=Ct+Math.cos(o)*wt,p=t-St,m=n-d,h=r-f,g=Math.abs(p)-.8,_=Math.abs(m)-1.33,v=Math.abs(h)-1.1;if(v>s||_>s)continue;let y=Math.max(g,0),b=Math.max(_,0),x=Math.max(v,0),S=Math.hypot(y,b,x),C=S>0?S:Math.max(g,_,v);C<s&&(s=C,S>0?(c=Math.sign(p)*y/S,l=Math.sign(m)*b/S,u=Math.sign(h)*x/S):g>=_&&g>=v?(c=Math.sign(p)||1,l=u=0):_>=v?(l=Math.sign(m)||1,c=u=0):(u=Math.sign(h)||1,c=l=0))}for(let e=0;e<Nt.length;e++){let i=Nt[e],a=i[3]-i[0],o=i[4]-i[1],d=i[5]-i[2],f=t-i[0],p=n-i[1],m=r-i[2],h=Math.min(1,Math.max(0,(f*a+p*o+m*d)/(a*a+o*o+d*d))),g=f-a*h,_=p-o*h,v=m-d*h,y=Math.hypot(g,_,v);y-.3<s&&y>1e-6&&(s=y-Mt,c=g/y,l=_/y,u=v/y)}{let e=t-Math.min(St+Pt,Math.max(St-Pt,t)),n=Math.hypot(e,d,f);n-Ft<s&&n>1e-6&&(s=n-Ft,c=e/n,l=d/n,u=f/n)}return o.set(c,l,u),s}function Zt(e){let t=Math.PI*2;return e=(e+Math.PI)%t,e<0&&(e+=t),e-Math.PI}var Qt=`
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
`,$t=`
${Qt}
varying vec3 vW;
varying float vDepth;
void main() {
  vW = position;
  vec4 vp = viewMatrix * vec4(position, 1.0);
  vDepth = -vp.z;
  gl_Position = projectionMatrix * vp;
}
`,en=`
${Qt}
uniform sampler2D uNoise;
uniform float uFieldGain;
uniform float uFieldReach;
varying vec3 vW;
varying float vDepth;
void main() {
  vec3 E = vec3(0.0);
  for (int i = 0; i < FX_MAX_LIGHTS; i++) {
    if (i >= uFxLN) break;
    vec3 a = uFxLA[i].xyz;
    vec3 b = uFxLB[i].xyz;
    float r = uFxLA[i].w * uFieldReach;
    vec3 ab = b - a;
    float t = clamp(dot(vW - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    vec3 d = a + ab * t - vW;
    float d2 = dot(d, d);
    // light from above reaches the floor; a source at floor level only grazes it (cosine term)
    float cosT = clamp((d.y + 2.0) * inversesqrt(d2 + 4.0), 0.12, 1.0);
    E += uFxLC[i].rgb * (r * r / (d2 + r * r)) * (0.35 + 0.65 * cosT);
  }
  E = E * uFieldGain + uFxGlow * 0.06;
  // ground albedo: the paved field (light concrete, bright under fire) vs the parched grass banks
  // (darker, olive), with patchy variation so the light reads as lying on a surface
  float n1 = texture(uNoise, vW.xz * 0.013).r;
  float n2 = texture(uNoise, vW.xz * 0.09 + 0.31).g;
  float n3 = texture(uNoise, vW.xz * 0.4 + 0.7).b;
  float paved = (1.0 - smoothstep(42.0, 47.0, abs(vW.x))) * smoothstep(-3.0, 0.0, vW.z) * (1.0 - smoothstep(134.0, 140.0, vW.z));
  // paved albedo = the terrain's pale concrete (Terrain.ts, linear ≈ 0.40 / 0.385 / 0.34, day photos)
  vec3 alb = mix(vec3(0.46, 0.45, 0.36), vec3(0.40, 0.385, 0.34), paved);
  alb *= (0.3 + 1.3 * n1 * (0.5 + 1.0 * n2)) * (0.7 + 0.6 * n3);
  // the sheet fades out before its border (no visible edge on the banks)
  float edge = (1.0 - smoothstep(105.0, 130.0, abs(vW.x))) * (1.0 - smoothstep(150.0, 168.0, vW.z));
  vec3 c = kneeC(E, 0.45, 0.3) * alb * edge * fogT(vDepth);
  gl_FragColor = vec4(c, 0.0);
}
`,tn=class{mesh;uniforms;constructor(t,n){let r=n?8:4,i=Math.round(264/r)+1,a=Math.round(176/r)+1,o=new Float32Array(i*a*3);for(let e=0;e<a;e++)for(let t=0;t<i;t++){let n=-132+264*t/(i-1),r=-6+176*e/(a-1),s=(e*i+t)*3;o[s]=n,o[s+1]=L(n,r)+.3,o[s+2]=r}let s=[];for(let e=0;e+1<a;e++)for(let t=0;t+1<i;t++){let n=e*i+t,r=n+1,a=n+i,o=a+1;s.push(n,a,r,r,a,o)}let c=new M;c.setAttribute(`position`,new j(o,3)),c.setIndex(s),this.uniforms={...t,uFieldGain:{value:.15},uFieldReach:{value:1}};let l=new C({name:`fx-fieldlight`,uniforms:this.uniforms,vertexShader:$t,fragmentShader:en,transparent:!0,depthWrite:!1,depthTest:!0,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-4,blending:5,blendEquation:100,blendSrc:201,blendDst:201});this.mesh=new e(c,l),this.mesh.name=`fx:fieldlight`,this.mesh.frustumCulled=!1,this.mesh.renderOrder=9,this.mesh.matrixAutoUpdate=!1,this.mesh.visible=!1}dispose(){this.mesh.geometry.dispose(),this.mesh.material.dispose(),this.mesh.removeFromParent()}},V={ORIGIN:0,T0:3,DIR:4,SPREAD:7,SPEED0:8,SPEED1:9,DRAG:10,GRAV:11,COL1:12,INT:15,COL2:16,COL2AT:19,LIFE0:20,LIFE1:21,EMITDUR:22,COUNT:23,SIZE0:24,SIZE1:25,TRAIL:26,GLITTER:27,AXIS:28,SEED:31,MODE:32,FLAGS:33,HZ:34,STAGGER:35,X0:36,X1:37,X2:38,X3:39,Y0:40,Y1:41,Y2:42,Y3:43,Z0:44,Z1:45,Z2:46,Z3:47},nn=.3,H={SPHERE:0,CONE:1,RING:2,FAN:3,LINE:4,HEMI:5,SINGLE:6,BOX:7},U={CONTINUOUS:1,STROBE:2,CROSSETTE:4,POPS:8,COOL:16,PEARL:32,PISTIL:64,COLORCHANGE:128,FLICKER:256,SERPENT:512,ZIPPER:1024,FLAT:2048,RAMP:4096,SELFLIT:8192,ABSCHANGE:16384,CUT:262144},rn={FLAME:0,SMOKE:1,CO2:2,FLASH:3,GLOW:4,FOG:5,GROUND:6},an=1;function on(e){return(qe(e)>>>8)/16777216}var W=class{f=new Float32Array(48);start=0;end=0;count=0;layer=0;row=-1;stamp=-1;keep=0;drawn=0;perm=0;tail0=0;tail1=0;uid=an++;constructor(e,t=0){this.f[V.MODE]=e,this.f[V.FLAGS]=t,this.f[V.DRAG]=1,this.f[V.LIFE0]=1,this.f[V.LIFE1]=1,this.f[V.INT]=1,this.f[V.SIZE0]=.2,this.f[V.SIZE1]=.4,this.f[V.COL1]=this.f[V.COL1+1]=this.f[V.COL1+2]=1,this.f[V.COL2]=this.f[V.COL2+1]=this.f[V.COL2+2]=1,this.f[V.COL2AT]=2,this.f[V.DIR+1]=1,this.f[V.AXIS]=1}origin(e,t,n){return this.f[V.ORIGIN]=e,this.f[V.ORIGIN+1]=t,this.f[V.ORIGIN+2]=n,this}originV(e){return this.origin(e.x,e.y,e.z)}time(e){return this.f[V.T0]=e,this}dir(e,t,n,r=0){let i=Math.hypot(e,t,n)||1;return this.f[V.DIR]=e/i,this.f[V.DIR+1]=t/i,this.f[V.DIR+2]=n/i,this.f[V.SPREAD]=r,this}dirV(e,t=0){return this.dir(e.x,e.y,e.z,t)}speed(e,t=e){return this.f[V.SPEED0]=e,this.f[V.SPEED1]=t,this}physics(e,t){return this.f[V.DRAG]=Math.max(.02,e),this.f[V.GRAV]=t,this}color(e,t){return this.f[V.COL1]=e.r,this.f[V.COL1+1]=e.g,this.f[V.COL1+2]=e.b,this.f[V.INT]=t,this}color2(e,t=.5){return this.f[V.COL2]=e.r,this.f[V.COL2+1]=e.g,this.f[V.COL2+2]=e.b,this.f[V.COL2AT]=t,this}life(e,t=e){return this.f[V.LIFE0]=e,this.f[V.LIFE1]=Math.max(e,t),this}emit(e,t=0,n=0){return this.count=Math.max(0,Math.round(e)),this.f[V.COUNT]=this.count,this.f[V.EMITDUR]=t,this.f[V.STAGGER]=n,t>0&&(this.f[V.FLAGS]=(this.f[V.FLAGS]|U.CONTINUOUS)>>>0),this}size(e,t){return this.f[V.SIZE0]=e,this.f[V.SIZE1]=t,this}trail(e,t=0){return this.f[V.TRAIL]=e,this.f[V.GLITTER]=t,this}axis(e,t,n){return this.f[V.AXIS]=e,this.f[V.AXIS+1]=t,this.f[V.AXIS+2]=n,this}axisV(e){return this.axis(e.x,e.y,e.z)}seed(e){return this.f[V.SEED]=e&16777215,this}hz(e){return this.f[V.HZ]=e,this}litUntil(e){return this.f[V.HZ]=e,this}releaseAfter(e,t){return this.f[V.HZ]=e,this.f[V.X0]=Math.max(0,t),this}visibleFrom(e){return this.f[V.Z2]=e,this}flag(e){return this.f[V.FLAGS]=(this.f[V.FLAGS]|e)>>>0,this}set(e,t){return this.f[e]=t,this}on(e){return this.layer=e,this}window(e,t){return this.start=e,this.end=t,this}get t0(){return this.f[V.T0]}copyFrom(e){return this.f.set(e.f),this.start=e.start,this.end=e.end,this.count=e.count,this}};function sn(e,t,n,r,i,a){let o=(1-Math.exp(-r*a))/r;return e.set(t.x+i.x/r*a+(n.x-i.x/r)*o,t.y+i.y/r*a+(n.y-i.y/r)*o,t.z+i.z/r*a+(n.z-i.z/r)*o),e}function cn(e,t,n,r,i,a){let o=(1-Math.exp(-r*a))/r;return e.set(i.x/r+(n.x-t.x-i.x/r*a)/o,i.y/r+(n.y-t.y-i.y/r*a)/o,i.z/r+(n.z-t.z-i.z/r*a)/o),e}function ln(e,t,n=9.81){let r=0,i=400;for(let a=0;a<40;a++){let a=(r+i)/2;a/t-n/(t*t)*Math.log(1+t*a/n)<e?r=a:i=a}return(r+i)/2}function un(e,t,n=9.81){return Math.log(1+t*e/n)/t}var dn=`high`,fn={"fw-stars":{scale:{ultra:1.3,high:1.3,medium:1.25,mobile:1},cap:{mobile:12e3}},"fw-points":{scale:{ultra:1.3,high:1.3,medium:1.25,mobile:1},cap:{mobile:12e3}},"fw-smoke":{scale:{ultra:1.5,high:1.5,medium:1.5,mobile:1.3}},"pyro-sparks":{cap:{mobile:12e3}}},pn={ultra:1,high:1,medium:.6,mobile:.4},mn={ultra:.05,high:.05,medium:.25,mobile:.5};function hn(e){dn=e}function gn(e,t){let n=fn[e];if(!n)return t;let r=t*(n.scale?.[dn]??1),i=n.cap?.[dn];return i!==void 0&&(r=Math.min(r,i)),Math.round(r)}function _n(e){return(e&U.POPS)===0?1:pn[dn]}function vn(){return mn[dn]}var yn=256,bn=8,xn=16384,Sn=16,Cn=2,wn=1.25,Tn=[1,.75,.5,.35,.25],En=.92,Dn=.72,On=1.5;function kn(e,t){for(;t;){let n=e%t;e=t,t=n}return e}function An(e){if(e<=3||e>=65536)return 1;let t=jn.get(e);if(t!==void 0)return t;let n=Math.round(e*.6180339887),r=1,i=1/0;for(let t=0;t<24&&i>4;t++)for(let a=0;a<2;a++){let o=a===0?n+t:n-t;if(o<=1||o>=e||kn(o,e)!==1)continue;let s=Mn(o,e);s<i&&(i=s,r=o)}return jn.size>4096&&jn.clear(),jn.set(e,r),r}var jn=new Map;function Mn(e,t){let n=t,r=e,i=0;for(;r;){let e=Math.floor(n/r),t=n-e*r;e>i&&(i=e),n=r,r=t}return i}function Nn(e){let t=e.f,n=t[V.FLAGS],r=t[V.T0];(n&(U.POPS|U.CROSSETTE|U.PEARL))===0?(n&U.CONTINUOUS)===0?(e.tail0=r+t[V.LIFE0],e.tail1=r+t[V.STAGGER]*e.count+t[V.LIFE1]):(e.tail0=r+t[V.EMITDUR],e.tail1=e.tail0+t[V.LIFE1]):e.tail0=e.tail1=1/0}function Pn(e,t){if(t<=e.tail0)return 1;let n=vn(),r=e.tail1-e.tail0;return r>.05?Math.max(n,Math.min(1,(e.tail1-t)/r)):t<e.tail1?1:n}var Fn=class{mesh;name;slotSize;maxEmitters;budget;maxSlots;slotCap;capacity;orderFree;geo;emitData;emitTex;slotData;slotTex;rowOwner;freeRows=[];rowRanges;list=[];listLen=0;frame=0;firstUpload=!0;usedSlotsPrev=0;pressure=0;relax=0;jumped=!1;emitters=0;particles=0;usedSlots=0;dropped=0;uploads=0;scaled=1;keepNow=1;hidden=0;constructor(n){this.name=n.name,this.orderFree=n.geometry.userData.segments!==void 0,this.slotSize=this.orderFree?Math.min(n.slotSize,Sn):n.slotSize,this.maxEmitters=Math.max(16,Math.min(2048,n.maxEmitters)),this.budget=Math.max(8*this.slotSize,gn(n.name,n.maxParticles)),this.maxSlots=Math.ceil(this.budget/this.slotSize),this.capacity=Math.min(xn,this.maxSlots*bn),this.slotCap=Math.min(this.capacity,this.maxSlots*Cn),this.emitData=new Float32Array(this.maxEmitters*48),this.emitTex=new S(this.emitData,12,this.maxEmitters,N,t),this.emitTex.magFilter=this.emitTex.minFilter=fe,this.emitTex.generateMipmaps=!1,this.emitTex.needsUpdate=!0;let r=Math.ceil(this.capacity/yn);this.slotData=new Float32Array(yn*r*4),this.slotTex=new S(this.slotData,yn,r,N,t),this.slotTex.magFilter=this.slotTex.minFilter=fe,this.slotTex.generateMipmaps=!1,this.slotTex.needsUpdate=!0,this.rowOwner=Array(this.maxEmitters).fill(null),this.rowRanges=[];for(let e=this.maxEmitters-1;e>=0;e--)this.freeRows.push(e);for(let e=0;e<this.maxEmitters;e++)this.rowRanges.push({start:e*48,count:48});let i=new xe;i.index=n.geometry.index;for(let[e,t]of Object.entries(n.geometry.attributes))i.setAttribute(e,t);i.setDrawRange(n.geometry.drawRange.start,n.geometry.drawRange.count),i.userData.segments=n.geometry.userData.segments,i.instanceCount=0,this.geo=i;let a=n.material.uniforms;a.uEmit={value:this.emitTex},a.uSlots={value:this.slotTex},a.uSlotSize={value:this.slotSize},a.uSlotTexW={value:yn},this.mesh=new e(i,n.material),this.mesh.name=`fx:${n.name}`,this.mesh.frustumCulled=!1,this.mesh.renderOrder=n.renderOrder,this.mesh.visible=!1,this.mesh.matrixAutoUpdate=!1}begin(){this.listLen=0}add(e){e.count<=0||(this.listLen<this.list.length?this.list[this.listLen]=e:this.list.push(e),this.listLen++)}drawnAt(e,t){let n=e.count;if(t>=1)return n;let r=2*this.slotSize;return n<=r?n:Math.max(r,Math.round(n*t))}setShare(e,t){let n=_n(e.f[V.FLAGS]),r=Math.min(t,n);e.keep=r,e.drawn=this.drawnAt(e,r),(e.drawn<e.count||this.orderFree)&&e.perm<=0&&(e.perm=An(e.count))}commit(e=1/60,t=0){let n=++this.frame,r=this.list,i=this.listLen;for(let e=0;e<i;e++)r[e].stamp=n;let a=this.rowOwner;for(let e=0;e<a.length;e++){let t=a[e];t!==null&&t.stamp!==n&&(t.row===e&&(t.row=-1,t.keep=0),a[e]=null,this.freeRows.push(e))}let o=0;this.dropped=0;let s=this.emitTex.updateRanges;for(let e=0;e<i;e++){let t=r[e];if(t.row>=0&&a[t.row]===t)continue;let n=this.freeRows.pop();if(n===void 0){t.row=-1,t.keep=0,this.dropped++;continue}t.row=n,t.keep=0,Nn(t),a[n]=t,this.emitData.set(t.f,n*48),o++,this.firstUpload||s.push(this.rowRanges[n])}o>0&&((this.firstUpload||o>48)&&(s.length=0),this.firstUpload=!1,this.emitTex.needsUpdate=!0,this.uploads++);let c=this.slotSize,l=this.budget,u=this.slotCap;if(this.jumped)for(let e=0;e<i;e++)r[e].keep=0;let d=0,f=0,p=0,m=0;for(let e=0;e<i;e++){let n=r[e];if(n.row<0)continue;let i=Pn(n,t);d+=n.count*i,n.keep>0?(f+=n.drawn*i,p+=Math.ceil(n.drawn/c)):n.keep===0&&m++}let h=0;for(;h<Tn.length-1&&d*Tn[h]>En*l;)h++;if(this.jumped?(this.jumped=!1,this.pressure=h,this.relax=0):h>this.pressure?(this.pressure=h,this.relax=0):h<this.pressure&&d*Tn[this.pressure-1]<=Dn*l?(this.relax+=Math.max(0,e),this.relax>=On&&(this.pressure--,this.relax=0)):this.relax=0,m>0){let e=this.pressure;for(;;){let n=Tn[e],a=0,o=0;for(let e=0;e<i;e++){let i=r[e];if(i.row<0||i.keep!==0)continue;let s=this.drawnAt(i,Math.min(n,_n(i.f[V.FLAGS])));a+=s*Pn(i,t),o+=Math.ceil(s/c)}if(f+a<=l&&p+o<=u||e===Tn.length-1)break;e++}let n=Tn[e];this.keepNow=n;let a=l*wn;for(let e=0;e<i;e++){let i=r[e];if(i.row<0||i.keep!==0)continue;this.setShare(i,n);let o=Math.ceil(i.drawn/c),s=i.drawn*Pn(i,t);if(p+o>u||f+s>a){i.keep=-1,i.drawn=0;continue}f+=s,p+=o}}else this.keepNow=Tn[this.pressure];let g=0,_=!1,v=0,y=0,b=0,x=this.slotData;for(let e=0;e<i;e++){let t=r[e];if(t.row<0)continue;let n=t.drawn,i=Math.ceil(n/c);if(i<=0||g+i>u){b++;continue}let a=n<t.count||this.orderFree?t.perm:1;y++,v+=n;for(let e=0;e<i;e++,g++){let r=g*4,i=e*c;(x[r]!==t.row||x[r+1]!==i||x[r+2]!==n||x[r+3]!==a)&&(x[r]=t.row,x[r+1]=i,x[r+2]=n,x[r+3]=a,_=!0)}}this.hidden=b,(_||g!==this.usedSlotsPrev)&&(_&&(this.slotTex.needsUpdate=!0,this.uploads++),this.usedSlotsPrev=g),this.scaled=d>0?v/d:1,this.usedSlots=g,this.emitters=y,this.particles=v,this.geo.instanceCount=g*c,this.mesh.visible=g>0}rebase(){this.jumped=!0}reset(){for(let e=0;e<this.rowOwner.length;e++){let t=this.rowOwner[e];t&&t.row===e&&(t.row=-1,t.keep=0),this.rowOwner[e]=null}this.freeRows.length=0;for(let e=this.maxEmitters-1;e>=0;e--)this.freeRows.push(e);this.listLen=0,this.pressure=0,this.relax=0}adopt(e){let t=this.mesh.material,n=e.mesh.material;return e.name!==this.name||e.slotSize!==this.slotSize||e.maxEmitters!==this.maxEmitters||e.maxSlots>this.capacity||t.vertexShader!==n.vertexShader||t.fragmentShader!==n.fragmentShader||e.geo.index?.count!==this.geo.index?.count?!1:(this.budget=e.budget,this.maxSlots=e.maxSlots,this.slotCap=Math.min(this.capacity,e.maxSlots*Cn),this.geo.setDrawRange(e.geo.drawRange.start,e.geo.drawRange.count),this.geo.userData.segments=e.geo.userData.segments,t.uniforms.uSegments&&n.uniforms.uSegments&&(t.uniforms.uSegments.value=n.uniforms.uSegments.value),this.mesh.renderOrder=e.mesh.renderOrder,!0)}dispose(){this.geo.dispose(),this.emitTex.dispose(),this.slotTex.dispose(),this.mesh.material.dispose(),this.mesh.removeFromParent()}};function In(e){let t=Math.max(1,Math.min(10,Math.round(e))),n=new Float32Array(78);for(let e=0;e<13;e++)n[e*2*3]=e,n[e*2*3+1]=-1,n[(e*2+1)*3]=e,n[(e*2+1)*3+1]=1;let r=[];for(let e=0;e<12;e++){let t=e*2,n=e*2+1,i=e*2+2,a=e*2+3;r.push(t,i,n,n,i,a)}let i=new M;return i.setAttribute(`position`,new j(n,3)),i.setIndex(r),i.setDrawRange(0,(t+2)*6),i.userData.segments=t,i}function Ln(){let e=new M;return e.setAttribute(`position`,new j(new Float32Array([0,-1,0,0,1,0,3,-1,0,3,1,0]),3)),e.setIndex([0,2,1,1,2,3]),e.setDrawRange(0,6),e.userData.segments=1,e}function Rn(){let e=new M;return e.setAttribute(`position`,new j(new Float32Array([-1,-1,0,1,-1,0,1,1,0,-1,1,0]),3)),e.setIndex([0,1,2,0,2,3]),e}var zn=256,Bn=class{uniforms;glow=new I(0,0,0);n=0;ax=new Float32Array(zn);ay=new Float32Array(zn);az=new Float32Array(zn);bx=new Float32Array(zn);by=new Float32Array(zn);bz=new Float32Array(zn);rad=new Float32Array(zn);cr=new Float32Array(zn);cg=new Float32Array(zn);cb=new Float32Array(zn);w=new Float32Array(zn);hw=new Float32Array(zn);pick=new Int32Array(12);used=new Uint8Array(zn);total=0;active=0;constructor(){let e=()=>Array.from({length:12},()=>new p);this.uniforms={uFxLA:{value:e()},uFxLB:{value:e()},uFxLC:{value:e()},uFxLN:{value:0},uFxGlow:{value:new I(0,0,0)}}}add(e,t){let n=e.gain,r=typeof n==`number`&&n>=0?t*n:t;if(!(r>.002))return;let i=this.n;if(i>=zn){let e=0;for(let t=1;t<zn;t++)this.w[t]<this.w[e]&&(e=t);if(this.w[e]>=r)return;i=e}else this.n++;this.ax[i]=e.a.x,this.ay[i]=e.a.y,this.az[i]=e.a.z,this.bx[i]=e.b.x,this.by[i]=e.b.y,this.bz[i]=e.b.z,this.rad[i]=e.radius,this.cr[i]=e.color.r*r,this.cg[i]=e.color.g*r,this.cb[i]=e.color.b*r,this.w[i]=r;let a=e.haze;this.hw[i]=typeof a==`number`&&a>0?Math.min(1,a)*r:0}pack(e){let t=this.n,n=Math.min(e,12,t),r=this.uniforms,i=0;for(let e=0;e<t;e++)this.used[e]=0,i+=this.w[e];for(let e=0;e<n;e++){let n=-1;for(let e=0;e<t;e++)!this.used[e]&&(n<0||this.w[e]>this.w[n])&&(n=e);this.used[n]=1,this.pick[e]=n}for(let e=0;e<t;e++){if(this.used[e])continue;let t=(this.ax[e]+this.bx[e])*.5,r=(this.ay[e]+this.by[e])*.5,i=(this.az[e]+this.bz[e])*.5,a=0,o=1/0;for(let e=0;e<n;e++){let n=this.pick[e],s=(this.ax[n]+this.bx[n])*.5-t,c=(this.ay[n]+this.by[n])*.5-r,l=(this.az[n]+this.bz[n])*.5-i,u=s*s+c*c+l*l;u<o&&(o=u,a=e)}if(n>0){let t=this.pick[a],n=.8/(1+o/(4*this.rad[t]*this.rad[t]+1));this.cr[t]+=this.cr[e]*n,this.cg[t]+=this.cg[e]*n,this.cb[t]+=this.cb[e]*n,this.w[t]+=this.w[e]*n,this.hw[t]+=this.hw[e]*n}}for(let e=0;e<12;e++)if(e<n){let t=this.pick[e];r.uFxLA.value[e].set(this.ax[t],this.ay[t],this.az[t],this.rad[t]),r.uFxLB.value[e].set(this.bx[t],this.by[t],this.bz[t],this.hw[t]/Math.max(1e-6,this.w[t])),r.uFxLC.value[e].set(this.cr[t],this.cg[t],this.cb[t],0)}else r.uFxLC.value[e].set(0,0,0,0);r.uFxLN.value=n,r.uFxGlow.value.copy(this.glow),this.total=i,this.active=t,this.n=0}},Vn=`
${Qt}

varying vec2 vUv;
varying vec3 vEmis;
varying vec3 vLit;
varying vec4 vPar;
varying vec3 vNoise;
varying float vErode;
varying float vWarm;
varying vec2 vFloor;
varying float vOpac;

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
  // over budget: a stable, evenly spread subset of the recorded puffs (FxLayer), phases and timing
  // from the recorded count; the thinner cloud gets a little more opacity / light per puff
  int nRec = max(int(r5.w + 0.5), 1);
  i = particleIndex(i, sl.w, nRec);
  float thinGain = n < nRec ? pow(float(n) / float(nRec), -0.35) : 1.0;

  float te; uint cyc;
  if (!emitTime(r0.w, r5.z, r5.y, r8.w, i, nRec, seed, cont, te, cyc)) CULL();
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
  // round 12: burning puffs (flames, glows, flashes) never shrink below PUFF_MIN_PX x uMinPx on screen:
  // a far drone camera sees a flame row as flames (v535.75, v870), not as sub-pixel specks the raster
  // misses. The grown puff keeps a bit more than its light (x s^PUFF_SUBPX_LAW, s = true / drawn size:
  // the camera's bloom and overexposure make a far flame read bigger than its geometry)
  float subK = 1.0;
  if (kind == 0 || kind == 3 || kind == 4) {
    float rpx = rad * uProjScale / max(depth, 0.1);
    float rmin = uMinPx * PUFF_MIN_PX;
    if (rpx < rmin) {
      float s = max(rpx, 0.02) / rmin;
      rad /= s;
      subK = pow(s, PUFF_SUBPX_LAW);
    }
  }
  float ang = rnd(key, 4u) * 6.2831853 + r9.y * tau * (rnd(key, 5u) - 0.5) * 2.0;
  vec2 cs = vec2(cos(ang), sin(ang));
  vec2 corner = position.xy;
  vec2 rc = vec2(corner.x * cs.x - corner.y * cs.y, corner.x * cs.y + corner.y * cs.x);
  if (kind == 6) {
    // light pool on the ground: a horizontal world-space quad (not a billboard), wound so its front
    // face points up (the material culls back faces)
    vp = viewMatrix * vec4(P + vec3(corner.x * rad, 0.0, -corner.y * rad * max(r11.y, 0.05)), 1.0);
    depth = -vp.z;
    rc = corner;
  } else if ((flags & F_FLAT) != 0) {
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
  vFloor = vec2(P.y + dot(viewMatrix[1].xy, vp.xy - vp0), kind == 0 || kind >= 3 && kind != 5 ? -1e4 : r10.y);

  // fade when the camera is inside / very close to the puff (no depth texture: this is the cheap soft path)
  float nearF = smoothstep(rad * 0.2, rad * 1.2 + 0.5, depth);
  float fog = fogT(depth);
  vUv = rc;
  vNoise = vec3(rnd(key, 7u), rnd(key, 8u) + tau * 0.05, max(r6.w, 0.05));
  vErode = r9.z;
  vEmis = vec3(0.0);
  vLit = vec3(0.0);
  vWarm = r4.w;
  vOpac = 0.0;

  if (kind == 0) {
    // flame fireball: temperature falls with age; soot takes over near the end
    float temp = pow(1.0 - f, 1.1) * (0.66 + 0.26 * rnd(key, 9u));
    // X0 (flames, round 12): extra heat of a blinding mass (the bulky eruption v1508.4-1509.8, the
    // flame ring v865): the young fire runs past T 1 into its white-hot core (flameRamp)
    temp += r9.x * pow(1.0 - f, 0.7);
    float soot = r10.x * smoothstep(r10.y, 0.92, f) * (1.0 - smoothstep(0.9, 1.0, f));
    // valve closed (a continuous projector past its emission window): the plume is fed no more and
    // burns out within ~0.35 s (v1509.6-1510.0: the 28 m wall is gone well within half a second of
    // the cut); only the soot the older puffs already carry stays behind as smoke
    float burn = 1.0;
    if (cont && (flags & F_RAMP) != 0) {
      float cut = uTime - (r0.w + r5.z);
      if (cut > 0.0) {
        burn = 1.0 - smoothstep(0.0, 0.35, cut);
        burn *= burn;
        // the soot of the plume thins out as well (v1509.8-1510.0: the dark sky is back within half
        // a second of the cut; what lingers is the row's smoke bank, not a wall of fire-sized soot)
        soot *= 0.25 + 0.75 * (1.0 - smoothstep(0.1, 0.6, cut));
      }
    }
    vEmis = r3.rgb * r3.w * em * fog * nearF * thinGain * burn * subK;
    vLit = (r4.rgb * envLight(P) * 1.4 + r3.rgb * r3.w * 0.004) * fog;
    vPar = vec4(smoothstep(0.0, 0.03, f) * em * nearF * min(1.0, subK * 1.5), temp, soot, 0.0);
    // flame body opacity (Z1): dense rows / billowing walls occlude what lies behind (and each
    // other) instead of summing into a clipped white band
    vOpac = r11.y * burn;
  } else if (kind == 3 || kind == 4 || kind == 6) {
    float decay = max(r9.x, 0.01);
    float g;
    float att = 0.02;
    if (uCalm > 0.5) {
      // photosensitivity option: a break / muzzle flash swells in and fades slower at ~40 % of its peak
      // (same light energy), glows and ground pools shimmer at <= 3 Hz by less than 10 %
      g = kind == 3 ? 0.4 * exp(-tau / (decay * 2.5))
        : kind == 4 ? (0.96 + 0.08 * rnd(key, uint(floor(uTime * 3.0)) + 40u))
                    : (0.97 + 0.06 * rnd(key, uint(floor(uTime * 3.0)) + 40u));
      att = kind == 3 ? 0.1 : 0.02;
    } else {
      g = kind == 3 ? exp(-tau / decay)
        : kind == 4 ? (0.75 + 0.5 * rnd(key, uint(floor(uTime * 30.0)) + 40u))
                    : (0.85 + 0.3 * rnd(key, uint(floor(uTime * 12.0)) + 40u));
    }
    vEmis = r3.rgb * r3.w * g * em * fog * smoothstep(0.0, att, tau) * (1.0 - smoothstep(0.7, 1.0, f)) * nearF * thinGain * subK;
    vPar = vec4(0.0, 0.0, 0.0, float(kind));
  } else {
    // smoke / CO2 / fog: lit by the show's light bus (+ optional self illumination from a burst)
    float fadeIn = smoothstep(0.0, max(r10.z, 0.001), f);
    float fadeOut = 1.0 - smoothstep(kind == 2 ? 0.35 : 0.55, 1.0, f);
    float alpha = r3.w * fadeIn * fadeOut * em * nearF * thinGain;
    vec3 light = envLight(P) * r11.x;
    vec3 self = vec3(0.0);
    if ((flags & F_SELFLIT) != 0) {
      self = r4.rgb * exp(-tau / max(r9.x, 0.01));
      // the source that lit it has gone out (r8.z = its end, show time): no light left to scatter
      if (r8.z > 0.0) self *= 1.0 - smoothstep(0.0, 0.3, uTime - r8.z);
    } else if (kind == 5) {
      // low fog bank released (Emitter.releaseAfter): the machines stopped at r8.z, the bank thins out over r9.x s
      if (r8.z > 0.0 && r9.x > 0.0) alpha *= 1.0 - smoothstep(r8.z, r8.z + r9.x, uTime);
      // a pre-warmed bank (Emitter.visibleFrom) fades in from r11.z over the ramp time
      if (r11.z > 0.0) alpha *= smoothstep(r11.z, r11.z + max(r9.w, 0.1), uTime);
    }
    vLit = r3.rgb * r10.x * (light + self) * fog;
    vEmis = kind == 2 ? r4.rgb * alpha * (1.0 - f) * fog : vec3(0.0);
    vPar = vec4(alpha, 0.0, 0.0, float(kind));
  }
  vPar.w = float(kind);
}
`,Hn=`
${Qt}
uniform sampler2D uNoise;
varying vec2 vUv;
varying vec3 vEmis;
varying vec3 vLit;
varying vec4 vPar;
varying vec3 vNoise;
varying float vErode;
varying float vWarm;
varying vec2 vFloor;
varying float vOpac;

vec3 flameRamp(vec3 base, float T, float warm) {
  float t = clamp(T, 0.0, 1.0);
  float I = max(base.r, max(base.g, base.b));
  vec3 c = base / max(I, 1e-4);
  // coloured flames (salt-doped / lit plumes): keep the hue saturated even in the hot core — only
  // a slight lift toward white, and a capped luminance so the tone mapper never bleaches them
  vec3 hue = pow(max(c, vec3(0.002)), vec3(mix(1.8, 0.7, t)));
  // hydrocarbon flames: soot-radiation ramp (red -> orange -> yellow -> white-yellow)
  vec3 bb = vec3(1.0, 0.95 * pow(t, 0.9), 0.6 * t * t * t);
  hue = mix(hue, bb * mix(vec3(1.0), c / max(vec3(1.0, 0.36, 0.08), vec3(0.05)), 0.15), warm);
  // dark hues (deep blue, red) get a luminance lift so a blue plume reads as brightly as a warm one
  float lumK = clamp(0.35 / max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.05), 1.0, 2.2);
  float lum = mix((0.12 + 0.55 * t + 0.45 * t * t) * lumK, 0.08 + 0.5 * t + 0.9 * t * t, warm) * I;
  // round 12: the hottest core of a hydrocarbon fireball (T past 1: a young puff's centre) burns
  // white-hot and the camera clips it to white (v1509.25 flame wall, v865 flame ring): near-neutral
  // and up to 1 + FLAME_HOT x brighter; coloured flames keep their hue
  float Tw = smoothstep(0.8, 1.3, T) * warm;
  hue = mix(hue, vec3(1.0, 0.96, 0.86), Tw * 0.85);
  return hue * lum * (1.0 + FLAME_HOT * Tw);
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
    vec3 e = clipWhite(flameRamp(vEmis, T, vWarm) * shape, 1.0);
    float soot = clamp(vPar.z * shape * (0.5 + nz2.b * 1.0), 0.0, 0.95);
    float body = vOpac * shape * (0.55 + 0.45 * nz.g);
    gl_FragColor = vec4((e * (1.0 - soot) + vLit * soot) * vPar.x, clamp(soot + body * (1.0 - soot), 0.0, 0.97) * vPar.x);
  } else if (kind == 3 || kind == 4 || kind == 6) {
    float g = kind == 6 ? exp(-d2 * 3.2) * (0.65 + 0.7 * nz.r) - 0.04
                        : exp(-d2 * 5.0) * (0.8 + 0.4 * nz.r) + exp(-d2 * 28.0) * 0.9;
    // (glows and flashes clip to white where they are far brighter than the camera's white; ground pools not)
    vec3 eg = vEmis * max(g, 0.0);
    gl_FragColor = vec4(kind == 6 ? eg : clipWhite(eg, 1.0), 0.0);
  } else {
    float turb = (nz.r - 0.5) * 0.9 + (nz2.g - 0.5) * 0.45;
    float shape = smoothstep(1.0, 0.1, d + turb * vErode) * smoothstep(1.0, 0.72, d);
    float dens = shape * (0.35 + 1.3 * nz.b * nz2.r);
    float a = clamp(vPar.x * dens, 0.0, 1.0) * smoothstep(vFloor.y, vFloor.y + 0.8, vFloor.x);
    gl_FragColor = vec4(vLit * a + vEmis * dens, a);
  }
}
`,Un=`
${Qt}
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
  // round 12: the valve closed at HZ (F_CUT): every spark in flight burns out within SPARK_CUT s
  float cutK = 1.0;
  if ((flags & F_CUT) != 0 && (flags & F_STROBE) == 0) {
    float cutT = uTime - r8.z;
    if (cutT > SPARK_CUT) CULL();
    cutK = 1.0 - smoothstep(0.0, SPARK_CUT, cutT);
  }
  int nRec = max(int(r5.w + 0.5), 1);
  // instance -> particle through the emitter's index permutation (FxLayer): a layer over budget
  // draws a stable, evenly spread, nested subset of it, with a little light compensation
  i = particleIndex(i, sl.w, nRec);
  float thinGain = n < nRec ? pow(float(n) / float(nRec), -0.3) : 1.0;

  // derived indexing: crossette children and crackle pops share the star maths (always from the
  // recorded count: the direction / phase of a particle never depends on how many are drawn)
  int bi = i;
  int bn = nRec;
  int sub = 0;
  int pops = 0;
  if ((flags & F_CROSSETTE) != 0) { bi = i / 4; bn = max(nRec / 4, 1); sub = i - bi * 4; }
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

    // photosensitivity option: burst stars swell in over ~0.12 s instead of popping on (continuous
    // emitters keep their nozzle bright)
    float attack = smoothstep(0.0, max(r11.x, uCalm > 0.5 && !cont ? 0.12 : 0.001), tau);
    float lf = tau / lifeEnd;
    float headI = attack * (1.0 - smoothstep(0.8, 1.0, lf));
    if ((flags & F_FLICKER) != 0) {
      // calm: a gentle <= 2.5 Hz shimmer (+-12 %) instead of the 22 Hz twinkle
      if (uCalm > 0.5) headI *= 0.88 + 0.24 * rnd(key, uint(floor(uTime * 2.5 + rnd(key, 15u) * 50.0)) + 100u);
      else headI *= 0.65 + 0.7 * rnd(key, uint(floor(uTime * 22.0 + rnd(key, 15u) * 50.0)) + 100u);
    }
    if ((flags & F_STROBE) != 0) {
      if (uCalm > 0.5) {
        // calm: the strobe star breathes at <= 2.5 Hz (random phase per star) around its average (0.4 x 2.2)
        float ph = fract(uTime * min(r8.z, 2.5) + rnd(key, 13u));
        headI *= 0.88 * (0.7 + 0.3 * cos(6.2831853 * ph));
      } else {
        float ph = fract(uTime * r8.z + rnd(key, 13u));
        headI *= step(0.6, ph) * 2.2;
      }
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
    // colour-changing fountains: the whole column (every spark in flight) turns at one moment
    if ((flags & F_ABSCHANGE) != 0) c1 = mix(r3.rgb, r4.rgb, smoothstep(r11.w - 0.04, r11.w + 0.04, uTime));
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
        // (round 12, as in the fireworks' star shader: a near-neutral titanium white is not a gold, it
        // cools to a pale warm white instead of deep orange; the white columns of the colour-sequence
        // walls v1522-1537 stayed salmon otherwise)
        float hs = 1.0 - min(hn.r, min(hn.g, hn.b));
        float goldish = step(hn.b, hn.g + 0.02) * step(hn.g, hn.r + 0.02) * smoothstep(0.12, 0.3, hn.g) * smoothstep(0.18, 0.35, hs);
        vec3 cold = mix(hn * vec3(0.95, 0.86, 0.74), hn * vec3(0.8, 0.5, 0.6), smoothstep(0.2, 0.45, hs));
        coolTo = mix(cold, vec3(1.0, 0.3, 0.06), goldish);
      }
      col = mix(c1, coolTo, clamp(cool * 0.85 + lifeCool * 0.8, 0.0, 1.0));
      // round 12: a titanium / charcoal spark that has just left the nozzle burns white-hot, and the
      // camera clips it to white (the finale walls v1509-1537, the pillar fans v1565): the young head
      // of a white spark turns near-neutral, a gold one partly; metal-salt colours keep their hue
      vec3 cn1 = c1 / max(max(c1.r, max(c1.g, c1.b)), 1e-4);
      float sat1 = 1.0 - min(cn1.r, min(cn1.g, cn1.b));
      float gold1 = step(cn1.b, cn1.g + 0.02) * step(cn1.g, cn1.r + 0.02) * smoothstep(0.12, 0.3, cn1.g);
      float whiteK = mix(gold1 * WH_GOLD, WH_WHITE, 1.0 - smoothstep(0.2, 0.4, sat1));
      float heat = (1.0 - smoothstep(0.0, HEAT_TRAIL, cool)) * (1.0 - smoothstep(0.35, 1.0, lf));
      col = mix(col, WHITE_HOT * max(c1.r, max(c1.g, c1.b)), whiteK * heat);
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
  // round 12: HDR white-hot core of white / gold heads (x HOT_K, near-neutral): dense columns and fans
  // reach the tone mapper's white where the video clips, their trails keep the colour
  // (light-neutral: the core gains what the soft body gives up, so a fan turns whiter, not brighter)
  float hotAdd = hot * (HOT_K - 1.0) * (1.0 - s2);
  hot += hotAdd;
  float bodyK = 1.0 / (1.0 + hotAdd * CORE_SHARE);
  hotCol = mix(hotCol, WHITE_HOT, (1.0 - s2) * 0.7);

  // sparks die on the ground (no spark ever tunnels through the field)
  I *= smoothstep(-0.3, 0.25, P.y) * thinGain * cutK;
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
  // round 12: sensor clipping. A white / gold spark far brighter than the camera's white records as
  // white whatever its hue (all three channels clip): past CLIP_LO its colour runs to WHITE_HOT
  float cmx2 = max(col.r, max(col.g, col.b));
  // (only the head clips: a trail keeps its colour, v1511.75: white heads, orange tails; pops are points)
  float headW = pops > 0 ? 1.0 : 1.0 - smoothstep(0.0, CLIP_TRAIL, sPar);
  col = mix(col, WHITE_HOT * cmx2, (1.0 - s2) * headW * smoothstep(CLIP_LO, CLIP_HI, I * gain * cmx2));
  vCol = col * I * gain * fog * bodyK;
  vHot = hotCol * I * gain * fog * hot;
  vUv = vec2(side, cap);
  vTS = tS;
  vGlit = glit;
  vKey = float(key & 0xffffu);
}
`,Wn=`
${Qt}
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
    // calm (photosensitivity option): the glitter twinkles at <= 2.5 Hz with a smaller swing, same mean
    bool calmG = uCalm > 0.5;
    float tw = hf(k ^ hashu(uint(floor(uTime * (calmG ? 2.5 : 16.0) + hf(k) * 4.0))));
    float g = calmG ? (tw > 0.5 ? 1.5 : 0.8) : (tw > 0.5 ? 2.2 : 0.1);
    col *= mix(1.0, g, vGlit);
  }
  gl_FragColor = vec4(max(col, vec3(0.0)), 0.0);
}
`,Gn=class e{app;static byApp=new WeakMap;static get(t){let n=e.byApp.get(t);return n||(n=new e(t),e.byApp.set(t,n)),n}wind=new u(.9,.05,-.45);noise;uniforms;lights=new Bn;field;fieldLayer=!0;size=new s;tmpColor=new I;constructor(e){this.app=e,this.noise=Kn(e.quality.level===`mobile`?128:256),this.uniforms={uTime:{value:0},uWind:{value:this.wind},uHalfRes:{value:new s(640,360)},uProjScale:{value:500},uMinPx:{value:1.25},uFogDensity:{value:0},uAmbient:{value:new I(.004,.007,.014)},uStageLight:{value:new I},uStageWash:{value:new I},uFlashCol:{value:e.env.flashColor},uFlashPos:{value:e.env.flashPos},uFlashSpread2:{value:0},uNoise:{value:this.noise},...this.lights.uniforms,uLampPos:{value:Array.from({length:8},(e,t)=>new p(Pe[t]?.x??0,nt+.8,Pe[t]?.z??-999,0))},uLampCol:{value:new I},uSiteGlow:{value:new I},uSiteSmoke:{value:0},uLowFogLight:{value:new I},uLowFogPos:{value:new u(0,1,14)},uLowFogSpread:{value:new s(30,14)},uLowFogGain:{value:1},uCalm:Ye},this.field=new tn(this.uniforms,e.quality.level===`mobile`),e.scene.add(this.field.mesh),e.onFrame(e=>this.sync(e))}sync(e){let t=this.uniforms,n=this.app,r=n.env;t.uTime.value=e.showTime,rt(n),n.renderer.getDrawingBufferSize(this.size),t.uHalfRes.value.set(this.size.x*.5,this.size.y*.5);let i=e.camera;t.uProjScale.value=i.projectionMatrix.elements[5]*this.size.y*.5,t.uMinPx.value=Math.max(1.3,this.size.y/540*1.5),t.uStageLight.value.copy(r.stageColor).multiplyScalar(r.stageIntensity),t.uStageWash.value.copy(r.stageWashColor).multiplyScalar(r.stageWashIntensity*.6);let a=r.flashSpread;t.uFlashSpread2.value=Number.isFinite(a)?a*a:0;let o=n.scene.fog,s=t.uAmbient.value;if(o&&o.isFogExp2)t.uFogDensity.value=o.density*.8,s.copy(o.color).multiplyScalar(.45);else if(o&&o.isFog){let e=o;t.uFogDensity.value=1.2/Math.max(50,e.far),s.copy(o.color).multiplyScalar(.45)}else{t.uFogDensity.value=0;let e=n.scene.background;e&&e.isColor?s.copy(e).multiplyScalar(.4):s.setRGB(.004,.007,.014)}s.lerp(this.tmpColor.copy(r.palettePrimary).multiplyScalar(.012),.25);let c=t.uLampPos.value,l=r.pillarChase;for(let e=0;e<c.length;e++){let t=l&&l.length?l[e]:1;c[e].w=typeof t==`number`&&Number.isFinite(t)?Math.max(0,t):1}t.uLampCol.value.copy(r.pillarLampColor).multiplyScalar(Math.max(0,r.pillarLampIntensity)*.9);let u=t.uSiteGlow.value,d=r.glowColor;d&&Number.isFinite(d.r+d.g+d.b)?u.setRGB(Math.max(0,d.r),Math.max(0,d.g),Math.max(0,d.b)):u.setRGB(0,0,0);let f=r.smoke;t.uSiteSmoke.value=typeof f==`number`&&Number.isFinite(f)?Math.min(1,Math.max(0,f)):0;let p=r.lowFogLight,m=t.uLowFogLight.value;p&&Number.isFinite(p.r+p.g+p.b)?m.setRGB(Math.max(0,p.r),Math.max(0,p.g),Math.max(0,p.b)):m.setRGB(0,0,0),r.lowFogPos&&Number.isFinite(r.lowFogPos.x+r.lowFogPos.y+r.lowFogPos.z)&&t.uLowFogPos.value.copy(r.lowFogPos),r.lowFogSpread&&Number.isFinite(r.lowFogSpread.x+r.lowFogSpread.y)&&t.uLowFogSpread.value.copy(r.lowFogSpread);let h=n.quality.level;this.lights.pack(h===`mobile`?4:h===`medium`?8:12);let g=this.lights.glow;this.field.mesh.visible=this.fieldLayer&&(this.lights.uniforms.uFxLN.value>0||g.r+g.g+g.b>.01)}sparkLayer(e,t,n,r,i,a=6){let o=Math.min(a,t.level===`mobile`?2:t.level===`medium`?4:6),s=new C({name:`fx-${e}`,uniforms:{...this.uniforms,uSegments:{value:o}},vertexShader:Un,fragmentShader:Wn,transparent:!0,depthWrite:!1,depthTest:!0,blending:5,blendEquation:100,blendSrc:201,blendDst:205});return new Fn({name:e,slotSize:32,maxEmitters:r,maxParticles:n,geometry:In(o),material:s,renderOrder:i})}puffLayer(e,t,n,r){let i=new C({name:`fx-${e}`,uniforms:{...this.uniforms},vertexShader:Vn,fragmentShader:Hn,transparent:!0,depthWrite:!1,depthTest:!0,blending:5,blendEquation:100,blendSrc:201,blendDst:205});return new Fn({name:e,slotSize:8,maxEmitters:n,maxParticles:t,geometry:Rn(),material:i,renderOrder:r})}};function Kn(e){let t=new Uint8Array(e*e*4),n=new ft(388817),r=e=>{let t=new Float32Array(e*e);for(let e=0;e<t.length;e++)t[e]=n.next();return t},i=[];for(let t=0;t<3;t++){let n=new Float32Array(e*e),a=.5,o=0;for(let i=0;i<5;i++){let s=4<<i,c=r(s),l=s/e;for(let t=0;t<e;t++){let r=t*l,i=Math.floor(r),o=r-i,u=o*o*(3-2*o),d=i%s*s,f=(i+1)%s*s;for(let r=0;r<e;r++){let i=r*l,o=Math.floor(i),p=i-o,m=p*p*(3-2*p),h=o%s,g=(o+1)%s,_=c[d+h]+(c[d+g]-c[d+h])*m,v=c[f+h]+(c[f+g]-c[f+h])*m;n[t*e+r]+=(_+(v-_)*u)*a}}o+=a,a*=t===2?.6:.5}for(let e=0;e<n.length;e++)n[e]/=o;i.push(n)}for(let e=0;e<3;e++){let n=i[e],r=1,a=0;for(let e=0;e<n.length;e++)r=Math.min(r,n[e]),a=Math.max(a,n[e]);let o=1/Math.max(.001,a-r);for(let i=0;i<n.length;i++)t[i*4+e]=Math.round(Math.min(1,Math.max(0,(n[i]-r)*o))*255)}for(let n=0;n<e*e;n++)t[n*4+3]=255;let a=new S(t,e,e,N,g);return a.wrapS=a.wrapT=be,a.magFilter=de,a.minFilter=d,a.generateMipmaps=!0,a.colorSpace=``,a.needsUpdate=!0,a}var qn={start:0,end:1e9,bpm:150,anchor:0,kick:!1,beatsPerBar:4},Jn=class{segments;sections;constructor(e,t){this.segments=e,this.sections=t,this.segments=[...e].sort((e,t)=>e.start-t.start),this.sections=[...t].sort((e,t)=>e.start-t.start)}segmentAt(e){let t=this.segments,n=0,r=t.length-1,i=-1;for(;n<=r;){let a=n+r>>1;t[a].start<=e?(i=a,n=a+1):r=a-1}return i<0?t[0]??qn:t[i]}sectionAt(e){let t=this.sections,n=0,r=t.length-1,i=-1;for(;n<=r;){let a=n+r>>1;t[a].start<=e?(i=a,n=a+1):r=a-1}if(i<0)return t[0]??null;let a=t[i];return a.end,a}sectionIndexAt(e){let t=this.sectionAt(e);return t?this.sections.indexOf(t):-1}beatLength(e){return 60/this.segmentAt(e).bpm}beatAt(e){let t=this.segmentAt(e);return(e-t.anchor)*t.bpm/60}timeOfBeat(e,t){let n=this.segmentAt(e);return n.anchor+t*60/n.bpm}stepSeconds(e,t){if(typeof e==`number`)return e;let n=this.beatLength(t),r=this.segmentAt(t).beatsPerBar??4;switch(e){case`halfbeat`:return n/2;case`beat`:return n;case`2beat`:return n*2;case`bar`:return n*r;case`2bar`:return n*r*2;case`4bar`:return n*r*4;case`8bar`:return n*r*8}}snap(e,t){let n=this.segmentAt(e),r=n.beatsPerBar??4,i=t===`beat`?1:t===`halfbeat`?.5:r,a=(e-n.anchor)*n.bpm/60/i;return n.anchor+Math.round(a)*i*60/n.bpm}beatInfo(e,t){let n=this.segmentAt(e),r=n.beatsPerBar??4,i=(e-n.anchor)*n.bpm/60,a=i-Math.floor(i),o=i/r;t.bpm=n.bpm,t.beat=i,t.phase=a,t.bar=o,t.barPhase=o-Math.floor(o);let s=e>=n.start&&e<n.end;t.hasKick=n.kick&&s;let c=a*60/n.bpm;t.kick=t.hasKick?Math.exp(-c*11):0;let l=this.sectionAt(e);return t.energy=l?l.energy:0,t}},Yn={pyro:.8,fireworks:.2,strobe:.25,lasers:4,lights:8,crowd:2,stage:4,screens:8,fog:6,camera:6,atmos:10},Xn=class{file;tempo;bySys=new Map;maxLife=new Map;lifetimes=new Map;palettes=new Map;out=[];cueCount=0;revision=0;get duration(){return this.file?.meta.duration??0}registerLifetime(e,t){this.lifetimes.set(e,t),this.file&&this.compile()}async load(e){let t=null;for(let n=0;n<3;n++){n&&await new Promise(e=>setTimeout(e,600*n));let r;try{r=await fetch(e)}catch(e){t=e;continue}if(r.status>=500){t=Error(`show file ${e}: HTTP ${r.status}`);continue}if(!r.ok)throw Error(`show file ${e}: HTTP ${r.status}`);this.setFile(await r.json());return}throw t instanceof Error?t:Error(`show file ${e}: ${String(t)}`)}setFile(e){this.file=e,this.palettes.clear();for(let[t,n]of Object.entries(e.palettes))this.palettes.set(t,Zn(n));this.tempo=new Jn(e.tempo,e.sections),this.compile()}setTempo(e){this.file.tempo=e,this.tempo=new Jn(e,this.file.sections),this.compile()}compile(){let e=[],t=0,n=this.file.cues,r=new Map;for(let i=0;i<n.length;i++){let a=n[i],o=`${a.sys}:${a.fx}:${a.t}`,s=r.get(o)??0;r.set(o,s+1);let c=mt(`${o}:${s}`),l=0;for(let n of this.expand(a)){let r={id:t,t:n.t,dur:n.dur,sys:a.sys,fx:a.fx,targets:n.targets,p:n.p,seed:lt(c,n.step,l++),step:n.step},i=this.lifetimes.get(a.sys),o=Math.max(r.dur,i?i(r):r.dur);e.push({...r,life:o,end:r.t+o}),t++}}this.bySys.clear(),this.maxLife.clear();for(let t of e){let e=this.bySys.get(t.sys);e||this.bySys.set(t.sys,e=[]),e.push(t),this.maxLife.set(t.sys,Math.max(this.maxLife.get(t.sys)??0,t.life))}for(let e of this.bySys.values())e.sort((e,t)=>e.t-t.t||e.id-t.id);this.cueCount=e.length,this.revision++}*expand(e){let t=e.target===void 0?[`all`]:Array.isArray(e.target)?e.target:[e.target],n=e.dur??Yn[e.sys]??1,r=e.p??{},i=e.t;if(e.snap&&e.snap!==`none`&&(i=this.tempo.snap(i,e.snap)),!e.repeat){yield{t:i,dur:n,targets:t,p:r,step:0};return}let a=e.repeat,o=a.until??1/0,s=a.count??1e5,c=a.pattern??`x`,l=i,u=0,d=0;for(;l<o&&u<s&&d<2e4;){if(c[d%c.length]!==`-`){let e=r;if(a.cycle){e={...r};for(let[t,n]of Object.entries(a.cycle))e[t]=n[u%n.length]}let i=a.cycleTargets?a.cycleTargets[u%a.cycleTargets.length]:t;yield{t:l,dur:n,targets:i,p:e,step:u},u++}d++;let e=this.tempo.stepSeconds(a.every,l);l=typeof a.every==`number`?i+d*e:this.gridAdvance(l,e)}}gridAdvance(e,t){let n=e+t,r=this.tempo.beatLength(n),i=this.tempo.snap(n,`halfbeat`);return Math.abs(i-n)<r*.2?i:n}active(e,t,n=this.out){n.length=0;let r=this.bySys.get(e);if(!r||r.length===0)return n;let i=this.maxLife.get(e)??0,a=0,o=r.length-1,s=-1;for(;a<=o;){let e=a+o>>1;r[e].t<=t?(s=e,a=e+1):o=e-1}for(let e=s;e>=0;e--){let a=r[e];if(a.t<t-i)break;t<a.end&&n.push(a)}return n.reverse(),n}all(e){return this.bySys.get(e)??[]}latest(e,t,n){let r=this.active(e,n,[]);for(let e=r.length-1;e>=0;e--)if(r[e].fx===t)return r[e];return null}next(e,t){let n=this.bySys.get(e);if(!n)return null;for(let e of n)if(e.t>t)return e;return null}section(e){return this.tempo.sectionAt(e)}paletteAt(e,t,n=1.5){let r=this.file.sections,i=this.tempo.sectionIndexAt(e),a=this.palettes.get(r[i]?.palette??``)??this.palettes.values().next().value,o=i>0?this.palettes.get(r[i-1].palette):void 0,s=o&&i>=0?Math.min(1,(e-r[i].start)/n):1;return!o||s>=1?(t.primary.copy(a.primary),t.secondary.copy(a.secondary),t.accent.copy(a.accent),t.atmos.copy(a.atmos)):(t.primary.copy(o.primary).lerp(a.primary,s),t.secondary.copy(o.secondary).lerp(a.secondary,s),t.accent.copy(o.accent).lerp(a.accent,s),t.atmos.copy(o.atmos).lerp(a.atmos,s)),t}static newPalette(){return{primary:new I,secondary:new I,accent:new I,atmos:new I}}chapterAt(e){let t=this.file.chapters,n=null;for(let r of t)r.t<=e&&(n=r);return n}};function Zn(e){return{primary:new I(e.primary),secondary:new I(e.secondary),accent:new I(e.accent),atmos:new I(e.atmos??e.primary)}}var Qn={deck_front:[[-35.65,1.9,-.4],[-32.55,1.9,-.4],[-29.45,1.9,-.4],[-26.35,1.9,-.4],[-23.25,1.9,-.4],[-20.15,1.9,-.4],[-17.05,1.9,-.4],[-13.95,1.9,-.4],[-10.85,1.9,-.4],[-7.75,1.9,-.4],[-4.65,1.9,-.4],[-1.55,1.9,-.4],[1.55,1.9,-.4],[4.65,1.9,-.4],[7.75,1.9,-.4],[10.85,1.9,-.4],[13.95,1.9,-.4],[17.05,1.9,-.4],[20.15,1.9,-.4],[23.25,1.9,-.4],[26.35,1.9,-.4],[29.45,1.9,-.4],[32.55,1.9,-.4],[35.65,1.9,-.4]],deck_back:[[-35,1.9,-12],[-30,1.9,-12],[-25,1.9,-12],[-20,1.9,-12],[-15,1.9,-12],[-10,1.9,-12],[-5,1.9,-12],[0,1.9,-12],[5,1.9,-12],[10,1.9,-12],[15,1.9,-12],[20,1.9,-12],[25,1.9,-12],[30,1.9,-12],[35,1.9,-12]],side_front:[[-41,1.9,-3.6],[-46.5,1.9,-3.6],[-52,1.9,-3.6],[-57.5,2.1,-3.6],[-63,2.63,-3.6],[-68.5,3.16,-3.6],[-74,3.69,-3.6],[-79.5,4.22,-3.6],[-85,4.74,-3.6],[-90.5,5.27,-3.6],[41,1.9,-3.6],[46.5,1.9,-3.6],[52,1.9,-3.6],[57.5,2.1,-3.6],[63,2.63,-3.6],[68.5,3.16,-3.6],[74,3.69,-3.6],[79.5,4.22,-3.6],[85,4.74,-3.6],[90.5,5.27,-3.6]],arm_posts:[[-93,5.9,2],[-93,5.9,10],[-93,5.9,18],[-93,5.9,26],[-93,5.9,34],[-93,5.9,42],[-93,5.9,50],[-93,5.9,58],[93,5.9,2],[93,5.9,10],[93,5.9,18],[93,5.9,26],[93,5.9,34],[93,5.9,42],[93,5.9,50],[93,5.9,58]],wing_left:[[-11.1,21.9,-20],[-13.65,25.35,-20],[-21,22.4,-20],[-27,26.6,-20],[-29.1,21.1,-20],[-37.65,25.15,-20]],wing_right:[[11.1,21.9,-20],[13.65,25.35,-20],[21,22.4,-20],[27,26.6,-20],[29.1,21.1,-20],[37.65,25.15,-20]],wing_tips:[[-14.5,26.5,-20],[-29,28,-20],[-40.5,26.5,-20],[14.5,26.5,-20],[29,28,-20],[40.5,26.5,-20]],towers_top:[[-24,18,-12],[-14,18,-12],[14,18,-12],[24,18,-12],[-48,13.5,-10],[-63,13.5,-10],[-78,13.5,-10],[-92,15,-4],[48,13.5,-10],[63,13.5,-10],[78,13.5,-10],[92,15,-4]],tower_torches:[[-14,16.5,-13],[14,16.5,-13]],corner_fireballs:[[-92,15.5,-4],[92,15.5,-4]],roof:[[-35,9.6,-12.5],[-30.3,9.6,-12.5],[-25.7,9.6,-12.5],[-21,18,-22],[-16.3,18,-22],[-11.7,18,-22],[-7,18,-22],[-2.3,18,-22],[2.3,18,-22],[7,18,-22],[11.7,18,-22],[16.3,18,-22],[21,18,-22],[25.7,9.6,-12.5],[30.3,9.6,-12.5],[35,9.6,-12.5]],side_rampart:[[-44,9.6,-4.5],[-50.5,9.6,-4.5],[-57,9.6,-4.5],[-63.5,9.6,-4.5],[-70,9.6,-4.5],[-76.5,9.6,-4.5],[-83,9.6,-4.5],[-89.5,9.6,-4.5],[44,9.6,-4.5],[50.5,9.6,-4.5],[57,9.6,-4.5],[63.5,9.6,-4.5],[70,9.6,-4.5],[76.5,9.6,-4.5],[83,9.6,-4.5],[89.5,9.6,-4.5]],roof_comets:[[-32,18,-22],[-24,18,-22],[-16,18,-22],[-8,18,-22],[0,18,-22],[8,18,-22],[16,18,-22],[24,18,-22],[32,18,-22]],front_comets:[[-38.5,1.9,-.6],[-31.5,1.9,-.6],[-24.5,1.9,-.6],[-17.5,1.9,-.6],[-10.5,1.9,-.6],[-3.5,1.9,-.6],[3.5,1.9,-.6],[10.5,1.9,-.6],[17.5,1.9,-.6],[24.5,1.9,-.6],[31.5,1.9,-.6],[38.5,1.9,-.6]],deck_gerbs:[[-38,1.9,-.8],[-34,1.9,-.8],[-30,1.9,-.8],[-26,1.9,-.8],[-22,1.9,-.8],[-18,1.9,-.8],[-14,1.9,-.8],[-10,1.9,-.8],[-6,1.9,-.8],[-2,1.9,-.8],[2,1.9,-.8],[6,1.9,-.8],[10,1.9,-.8],[14,1.9,-.8],[18,1.9,-.8],[22,1.9,-.8],[26,1.9,-.8],[30,1.9,-.8],[34,1.9,-.8],[38,1.9,-.8]],arm_ends:[[-94,5.9,58],[94,5.9,58]],crest_comets:[[-106,5.5,0],[-106,5.5,12],[-106,5.5,24],[-106,5.5,36],[-106,5.5,48],[-106,5.5,60],[106,5.5,0],[106,5.5,12],[106,5.5,24],[106,5.5,36],[106,5.5,48],[106,5.5,60]],co2:[[-30,16.5,-16],[-24,16.5,-16],[-18,16.5,-16],[-12,16.5,-16],[12,16.5,-16],[18,16.5,-16],[24,16.5,-16],[30,16.5,-16],[-35,1.9,-1.5],[-25,1.9,-1.5],[-15,1.9,-1.5],[-5,1.9,-1.5],[5,1.9,-1.5],[15,1.9,-1.5],[25,1.9,-1.5],[35,1.9,-1.5],[-94,5.9,58],[94,5.9,58]],bengal:[[-86,9.6,-4.5],[86,9.6,-4.5],[-30,1.9,-1],[-10,1.9,-1],[10,1.9,-1],[30,1.9,-1]],mines:[[-20,1.9,-1],[-8,1.9,-1],[8,1.9,-1],[20,1.9,-1]],hang_glitter:[[-11,16.5,-4],[11,16.5,-4]],dragon_mouth:[[-4,11,-5]],dragon_eyes:[[-5.9,16.2,-8.5],[.9,16.2,-7.8]],dragon_head:[[-2.5,15.5,-10]],speaker_hangs:[[-11,9.5,-4],[11,9.5,-4],[-31,9.5,-6],[31,9.5,-6]],dj_booth:[[0,1.9,-7.5]],pillars_top:[[-20,12.8,36],[20,12.8,36],[-20,12.8,69],[20,12.8,69],[-20,12.8,102],[20,12.8,102],[-20,12.8,135],[20,12.8,135]],pillars_base:[[-20,.45,36],[20,.45,36],[-20,.45,69],[20,.45,69],[-20,.45,102],[20,.45,102],[-20,.45,135],[20,.45,135]],delay_towers:[[-20,9.7,36],[20,9.7,36],[-20,9.7,69],[20,9.7,69],[-20,9.7,102],[20,9.7,102],[-20,9.7,135],[20,9.7,135]],foh:[[0,2.5,90]],piano:[[0,1.8,59]],fireworks_back:[[-80,4,-45],[-60,4,-45],[-40,4,-45],[-20,4,-45],[0,4,-45],[20,4,-45],[40,4,-45],[60,4,-45],[80,4,-45]],fireworks_sides:[[-106,5.5,0],[-106,5.5,12],[-106,5.5,24],[-106,5.5,36],[-106,5.5,48],[-106,5.5,60],[106,5.5,0],[106,5.5,12],[106,5.5,24],[106,5.5,36],[106,5.5,48],[106,5.5,60]],laser_stage:[[-33,2.2,-.5],[-27,2.2,-.5],[-21,2.2,-.5],[-15,2.2,-.5],[-9,2.2,-.5],[-3,2.2,-.5],[3,2.2,-.5],[9,2.2,-.5],[15,2.2,-.5],[21,2.2,-.5],[27,2.2,-.5],[33,2.2,-.5],[-24,16,-13],[-14,16,-13],[14,16,-13],[24,16,-13],[-32,10,-12],[-7,10,-12],[7,10,-12],[32,10,-12],[-7,15,-10],[7,15,-10],[-34,19,-19],[-20,20,-19],[20,20,-19],[34,19,-19],[-92,14,-4.5],[-92,14,-3.5],[92,14,-4.5],[92,14,-3.5]],laser_field:[[-94,12,57.5],[-94,12,58],[-94,12,58.5],[94,12,57.5],[94,12,58],[94,12,58.5],[-20,9.7,36],[20,9.7,36],[-20,9.7,69],[20,9.7,69],[-20,9.7,102],[20,9.7,102],[-20,9.7,135],[20,9.7,135],[0,1.8,59]],fixtures_truss:[[-36,16.5,-13],[-32,16.5,-13],[-28,16.5,-13],[-24,16.5,-13],[-20,16.5,-13],[-16,16.5,-13],[-12,16.5,-13],[-8,16.5,-13],[-4,16.5,-13],[0,16.5,-13],[4,16.5,-13],[8,16.5,-13],[12,16.5,-13],[16,16.5,-13],[20,16.5,-13],[24,16.5,-13],[28,16.5,-13],[32,16.5,-13],[36,16.5,-13],[-90,13.5,-10],[-84,13.5,-10],[-78,13.5,-10],[-72,13.5,-10],[-66,13.5,-10],[-60,13.5,-10],[-54,13.5,-10],[-48,13.5,-10],[-42,13.5,-10],[42,13.5,-10],[48,13.5,-10],[54,13.5,-10],[60,13.5,-10],[66,13.5,-10],[72,13.5,-10],[78,13.5,-10],[84,13.5,-10],[90,13.5,-10]],fixtures_floor:[[-36,1.9,-1.2],[-33,1.9,-1.2],[-30,1.9,-1.2],[-27,1.9,-1.2],[-24,1.9,-1.2],[-21,1.9,-1.2],[-18,1.9,-1.2],[-15,1.9,-1.2],[-12,1.9,-1.2],[-9,1.9,-1.2],[-6,1.9,-1.2],[-3,1.9,-1.2],[0,1.9,-1.2],[3,1.9,-1.2],[6,1.9,-1.2],[9,1.9,-1.2],[12,1.9,-1.2],[15,1.9,-1.2],[18,1.9,-1.2],[21,1.9,-1.2],[24,1.9,-1.2],[27,1.9,-1.2],[30,1.9,-1.2],[33,1.9,-1.2],[36,1.9,-1.2]]};function $n(){let e={};for(let[t,n]of Object.entries(Qn))e[t]=n.map(e=>new u(e[0],e[1],e[2]));return e}var er=class{map=new Map;constructor(){for(let[e,t]of Object.entries($n()))this.map.set(e,t)}set(e,t){this.map.set(e,t.map(e=>e.clone()))}get(e){return this.map.get(e)??[]}resolve(e,t){let n=[];for(let r of e){if(r===`all`)return this.get(t);let e=this.map.get(r);if(e)n.push(...e);else if(r===`left`||r===`right`){let e=this.get(t);n.push(...e.filter(e=>r===`left`?e.x<-.01:e.x>.01))}else if(r===`center`){let e=this.get(t);n.push(...e.filter(e=>Math.abs(e.x)<12))}}return n.length?n:this.get(t)}names(){return[...this.map.keys()]}},tr=null,nr=[];function rr(){return typeof MessageChannel>`u`?new Promise(e=>setTimeout(e,0)):(tr||(tr=new MessageChannel,tr.port1.onmessage=()=>nr.shift()?.()),new Promise(e=>{nr.push(e),tr.port2.postMessage(0)}))}function ir(){return typeof document>`u`||document.hidden||typeof requestAnimationFrame>`u`?rr():new Promise(e=>{let t=!1,n=()=>{t||(t=!0,clearTimeout(r),e())},r=setTimeout(n,120);requestAnimationFrame(()=>void rr().then(n))})}function ar(){return typeof document<`u`&&document.hidden?new Promise(e=>setTimeout(e,50)):ir()}var or=class{budgetMs;start=performance.now();constructor(e=12){this.budgetMs=e}due(){return performance.now()-this.start>=this.budgetMs}async yield(){await ir(),this.start=performance.now()}async maybeYield(){this.due()&&await this.yield()}},sr={ultra:{level:`ultra`,maxPixelRatio:1.5,renderScale:1,msaa:2,shadows:!1,shadowMapSize:2048,crowdCount:65e3,flagCount:420,particleScale:1,beamBudget:420,laserBudget:640,volumetrics:!0,bloom:!0,bloomLevels:6,postfx:!0,drawDistance:2200,treeCount:2600,textureSize:2048,anisotropy:8},high:{level:`high`,maxPixelRatio:1.5,renderScale:1,msaa:4,shadows:!1,shadowMapSize:1024,crowdCount:45e3,flagCount:300,particleScale:.75,beamBudget:300,laserBudget:400,volumetrics:!0,bloom:!0,bloomLevels:5,postfx:!0,drawDistance:1800,treeCount:1800,textureSize:1024,anisotropy:4},medium:{level:`medium`,maxPixelRatio:1.25,renderScale:.85,msaa:0,shadows:!1,shadowMapSize:512,crowdCount:26e3,flagCount:160,particleScale:.5,beamBudget:180,laserBudget:200,volumetrics:!1,bloom:!0,bloomLevels:4,postfx:!0,drawDistance:1400,treeCount:900,textureSize:1024,anisotropy:2},mobile:{level:`mobile`,maxPixelRatio:1.5,renderScale:.7,msaa:0,shadows:!1,shadowMapSize:512,crowdCount:11e3,flagCount:70,particleScale:.3,beamBudget:96,laserBudget:96,volumetrics:!1,bloom:!0,bloomLevels:3,postfx:!0,drawDistance:1100,treeCount:400,textureSize:512,anisotropy:1}},cr=[`mobile`,`medium`,`high`,`ultra`];function lr(e){let t=navigator.userAgent,n=`ontouchstart`in window||navigator.maxTouchPoints>0,r=/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(t)||n&&/Macintosh/.test(t)&&navigator.maxTouchPoints>1,i=`unknown`;if(e){let t=e.getExtension(`WEBGL_debug_renderer_info`);i=String(t?e.getParameter(t.UNMASKED_RENDERER_WEBGL):e.getParameter(e.RENDERER))}let a=navigator.deviceMemory??null;return{mobile:r,touch:n,gpu:i,memoryGB:a,cores:navigator.hardwareConcurrency||4,screen:{w:screen.width,h:screen.height,dpr:window.devicePixelRatio||1}}}function ur(e){let t=e.gpu.toLowerCase();return e.mobile||/swiftshader|llvmpipe|software|basic render/.test(t)?`mobile`:/rtx|radeon rx [5-9]|rx 6|rx 7|rx 9|apple m[1-9] (max|ultra)|arc a7/.test(t)?`ultra`:/apple m[1-9]|geforce|radeon|arc/.test(t)?`high`:/intel|uhd|iris|mali|adreno|powervr/.test(t)?`medium`:`high`}function dr(e,t){let n=cr.indexOf(e)+t;return n>=0&&n<cr.length?cr[n]:null}var fr=[1,.9,.8,.7,.6],pr=45,mr=8,hr=128,gr=class{targetFps;scale=1;fps=60;frameMs=16.7;enabled=!0;adaptResolution=!0;step=0;samples=new Float32Array(pr);n=0;cooldown=2;window=0;slowStreak=0;fastStreak=0;okStreak=0;heavyStreak=0;lightStreak=0;lastUpWindow=-100;probeWindows=mr;hitchRun=0;constructor(e){this.targetFps=e}setTarget(e){this.targetFps=e}get level(){return this.step}reset(e={}){this.n=0,this.slowStreak=this.fastStreak=this.okStreak=this.heavyStreak=this.lightStreak=0,this.cooldown=Math.max(this.cooldown,e.cooldown??1),e.forget&&(this.probeWindows=mr,this.setStep(0))}sample(e){if(!(e>0))return null;if(e>.25){if(++this.hitchRun<3)return null;e=Math.min(e,1)}else this.hitchRun=0;if(this.samples[this.n++]=e*1e3,this.n<pr)return null;this.n=0,this.samples.sort();let t=this.samples[22];if(this.frameMs=t,this.fps=1e3/t,this.window++,!this.adaptResolution)return null;if(this.cooldown>0)return this.cooldown--,null;let n=1e3/this.targetFps,r=this.window-this.lastUpWindow<=2;if(t>n*1.2)return this.fastStreak=this.okStreak=this.lightStreak=0,this.slowStreak++,this.slowStreak<2&&!r&&t<n*1.6?null:(this.slowStreak=0,r&&(this.probeWindows=Math.min(this.probeWindows*2,hr),this.lastUpWindow=-100),this.step+1<fr.length?(this.setStep(this.step+1),this.cooldown=1,null):this.enabled&&++this.heavyStreak>=3?(this.heavyStreak=0,this.cooldown=2,`down`):null);if(this.slowStreak=this.heavyStreak=0,this.window-this.lastUpWindow===3&&(this.probeWindows=Math.max(mr,this.probeWindows>>1)),t<n*.75){if(this.okStreak=0,this.fastStreak++,this.step>0&&this.fastStreak>=3)this.fastStreak=0,this.up();else if(this.step===0&&this.enabled&&++this.lightStreak>=20)return this.lightStreak=0,`up`;return null}return this.fastStreak=this.lightStreak=0,this.okStreak++,this.step>0&&this.okStreak>=this.probeWindows&&(this.okStreak=0,this.up()),null}up(){this.setStep(this.step-1),this.lastUpWindow=this.window,this.cooldown=0}setStep(e){this.step=Math.max(0,Math.min(fr.length-1,e)),this.scale=fr[this.step]}},_r=`#ff0000`,vr=`#ffff00`,yr=`#00ff00`,br=`#0000ff`,xr=.118,Sr=e=>[[-e[0][0],e[0][1]],[-e[1][0],e[1][1]],[-e[2][0],e[2][1]]],Cr=[[xr,.8],[.142,.63],[.152,.45]],wr=[[xr,.8],[.175,.965],[.16,1.16]],Tr=[[xr,.8],[.2,.975],[.265,1.165]],Er=[[xr,.8],[.16,.92],[.1,1.05]],Dr=[[xr,.8],[.27,.79],[.4,.81]],Or=[[xr,.8],[.15,.66],[.06,.73]],kr=[[xr,.8],[.165,.67],[.135,.86]],Ar=[{r:Cr,l:Sr(Cr)},{r:wr,l:Sr(Cr),fistR:!0},{r:Tr,l:Sr(Tr)},{r:Er,l:Sr(Cr),phone:!0},{r:Dr,l:Sr(Dr)},{r:Or,l:Sr(Or)},{r:kr,l:Sr(kr)},{r:Cr,l:Sr(wr),fistL:!0}];function jr(e,t,n,r,i){let a=n[0]-t[0],o=n[1]-t[1],s=Math.hypot(a,o)||1,c=-o/s,l=a/s;e.beginPath(),e.moveTo(t[0]+c*r,t[1]+l*r),e.lineTo(n[0]+c*i,n[1]+l*i),e.lineTo(n[0]-c*i,n[1]-l*i),e.lineTo(t[0]-c*r,t[1]-l*r),e.closePath(),e.fill(),e.beginPath(),e.ellipse(t[0],t[1],r,r,0,0,Math.PI*2),e.fill(),e.beginPath(),e.ellipse(n[0],n[1],i,i,0,0,Math.PI*2),e.fill()}function Mr(e,t,n){let r=n===1||n===3,i=r?.104:.122,a=r?.108:.098;e.fillStyle=br;for(let t of[-1,1])e.beginPath(),e.moveTo(t*.005,.54),e.lineTo(t*(a+.01),.54),e.lineTo(t*.092,.27),e.lineTo(t*.085,.03),e.lineTo(t*.035,0),e.lineTo(t*.03,.27),e.closePath(),e.fill();e.beginPath(),e.moveTo(-a,.5),e.lineTo(a,.5),e.lineTo(a*.95,.6),e.lineTo(-a*.95,.6),e.closePath(),e.fill(),e.fillStyle=yr,e.beginPath(),e.moveTo(-a*.98,.56),e.lineTo(a*.98,.56),e.lineTo(i*.86,.72),e.lineTo(i,.8),e.quadraticCurveTo(i*.7,.845,.04,.845),e.lineTo(-.04,.845),e.quadraticCurveTo(-i*.7,.845,-i,.8),e.lineTo(-i*.86,.72),e.closePath(),e.fill();let o=(t,n)=>{let r=[Math.sign(t[0][0])*(i-.012),t[0][1]];e.fillStyle=_r,jr(e,r,t[1],.03,.026),jr(e,t[1],t[2],.026,.022),e.beginPath(),e.ellipse(t[2][0],t[2][1]+(t[2][1]>t[1][1]?.025:-.03),n?.032:.026,.038,0,0,Math.PI*2),e.fill(),e.fillStyle=yr,jr(e,r,[r[0]+(t[1][0]-r[0])*.4,r[1]+(t[1][1]-r[1])*.4],.036,.033)};o(t.r,!!t.fistR),o(t.l,!!t.fistL),t.phone&&(e.fillStyle=vr,e.fillRect(t.r[2][0]-.025,t.r[2][1]+.02,.05,.085)),e.fillStyle=_r,e.fillRect(-.03,.83,.06,.05),e.beginPath(),e.ellipse(0,.935,.062,.074,0,0,Math.PI*2),e.fill(),e.fillStyle=vr,e.beginPath(),e.ellipse(0,.945,.064,.068,0,0,Math.PI*2),e.fill(),n===1?(e.beginPath(),e.moveTo(-.062,.94),e.lineTo(.062,.94),e.lineTo(.07,.74),e.lineTo(-.07,.74),e.closePath(),e.fill()):n===3?jr(e,[0,.92],[.012,.78],.028,.018):n===2&&(e.beginPath(),e.ellipse(0,.965,.072,.055,0,0,Math.PI*2),e.fill(),e.fillRect(-.075,.95,.15,.018))}function Nr(){let e=document.createElement(`canvas`);e.width=512,e.height=512;let t=e.getContext(`2d`,{willReadFrequently:!0});t.fillStyle=`#000`,t.fillRect(0,0,512,512);for(let e=0;e<4;e++)for(let n=0;n<8;n++){let r=n*64,i=(3-e)*128;t.save(),t.beginPath(),t.rect(r,i,64,128),t.clip(),t.setTransform(64/.86,0,0,-128/1.3,r+32,i+127),Mr(t,Ar[n],e),t.restore()}let n=t.getImageData(0,0,512,512),r=n.data,i=new Float32Array(262144),a=new Uint8Array(262144);for(let e=0;e<262144;e++){let t=r[e*4],n=r[e*4+1],o=r[e*4+2],s=Math.max(t,n,o)/255;i[e]=s,o>t&&o>n?a[e]=255:t>127.5*s&&n>127.5*s?a[e]=85:n>t?a[e]=170:a[e]=0}let o=Fr(Fr(i,512,512,2),512,512,2);for(let e=0;e<512;e++)for(let t=0;t<512;t++){let n=e*512+t,s=i[n],c=s*(1-Pr(.5,.97,o[n])),l=e>0?o[n-512]:0,u=e<511?o[n+512]:0,d=Math.min(1,Math.max(0,(u-l)*3));r[n*4]=Math.round(s*255),r[n*4+1]=a[n],r[n*4+2]=Math.round(Math.min(1,c*(.45+.9*d))*255),r[n*4+3]=255}t.putImageData(n,0,0);let s=new ue(e);return s.colorSpace=``,s.generateMipmaps=!0,s.minFilter=d,s.magFilter=de,s.needsUpdate=!0,s}function Pr(e,t,n){let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)}function Fr(e,t,n,r){let i=new Float32Array(t*n),a=new Float32Array(t*n),o=2*r+1;for(let a=0;a<n;a++){let n=0;for(let i=-r;i<=r;i++)n+=e[a*t+Math.min(t-1,Math.max(0,i))];for(let s=0;s<t;s++)i[a*t+s]=n/o,n+=e[a*t+Math.min(t-1,s+r+1)]-e[a*t+Math.max(0,s-r)]}for(let e=0;e<t;e++){let s=0;for(let a=-r;a<=r;a++)s+=i[Math.min(n-1,Math.max(0,a))*t+e];for(let c=0;c<n;c++)a[c*t+e]=s/o,s+=i[Math.min(n-1,c+r+1)*t+e]-i[Math.max(0,c-r)*t+e]}return a}function Ir(e,t,n,r,i=5,a=.45){e.beginPath();for(let o=0;o<i*2;o++){let s=-Math.PI/2+o*Math.PI/i,c=o%2==0?r:r*a;e.lineTo(t+Math.cos(s)*c,n+Math.sin(s)*c)}e.closePath(),e.fill()}function Lr(e,t,n,r,i){let a=i??t.map(()=>1),o=a.reduce((e,t)=>e+t,0),s=0;t.forEach((t,i)=>{let c=a[i]/o*r;e.fillStyle=t,e.fillRect(0,s,n,c+1),s+=c})}function Rr(e,t,n,r){t.forEach((i,a)=>{e.fillStyle=i,e.fillRect(a*n/t.length,0,n/t.length+1,r)})}function zr(e,t,n,r,i,a){e.fillStyle=t,e.fillRect(0,0,r,i);let o=r*.36;a&&(e.fillStyle=a,e.fillRect(o-r*.1,0,r*.2,i),e.fillRect(0,i*.5-i*.17,r,i*.34)),e.fillStyle=n,e.fillRect(o-r*.055,0,r*.11,i),e.fillRect(0,i*.5-i*.09,r,i*.18)}function Br(e,t,n,r,i){e.save(),e.beginPath(),e.rect(t,n,r,i),e.clip(),e.fillStyle=`#012169`,e.fillRect(t,n,r,i),e.lineCap=`butt`,e.strokeStyle=`#ffffff`,e.lineWidth=i*.2,e.beginPath(),e.moveTo(t,n),e.lineTo(t+r,n+i),e.moveTo(t+r,n),e.lineTo(t,n+i),e.stroke(),e.strokeStyle=`#c8102e`,e.lineWidth=i*.07,e.stroke(),e.fillStyle=`#ffffff`,e.fillRect(t+r/2-i*.17,n,i*.34,i),e.fillRect(t,n+i/2-i*.17,r,i*.34),e.fillStyle=`#c8102e`,e.fillRect(t+r/2-i*.1,n,i*.2,i),e.fillRect(t,n+i/2-i*.1,r,i*.2),e.restore()}function Vr(e,t,n,r,i){e.strokeStyle=i,e.fillStyle=i,e.lineWidth=r*.2,e.beginPath(),e.arc(t,n,r,0,Math.PI*2),e.stroke(),e.lineCap=`round`;for(let i=-1;i<=1;i++)e.lineWidth=r*(.16-.04*Math.abs(i)),e.beginPath(),e.moveTo(t+i*r*.36+r*.12,n-r*.6),e.lineTo(t+i*r*.36-r*.12,n+r*.6),e.stroke()}function Hr(e,t,n,r,i,a){e.fillStyle=i,e.beginPath();for(let i=0;i<a*2;i++){let o=i*Math.PI/a,s=i%2==0?r*1.25:r*.98;e.lineTo(t+Math.cos(o)*s,n+Math.sin(o)*s)}e.closePath(),e.fill(),e.globalCompositeOperation=`destination-out`,e.beginPath(),e.arc(t,n,r*.8,0,Math.PI*2),e.fill(),e.globalCompositeOperation=`source-over`}function Ur(e,t,n){e.beginPath(),e.moveTo(0,0),e.lineTo(t,0),e.lineTo(t,n*.84),e.lineTo(t/2,n),e.lineTo(0,n*.84),e.closePath(),e.clip()}function Wr(e,t,n,r,i,a,o){e.fillStyle=i,e.beginPath(),e.moveTo(t-r,n-r*.7),e.lineTo(t+r,n-r*.7),e.lineTo(t+r*.8,n+r*.4),e.lineTo(t,n+r*1.1),e.lineTo(t-r*.8,n+r*.4),e.closePath(),e.fill(),o&&(e.beginPath(),e.moveTo(t-r*.8,n-r*.6),e.quadraticCurveTo(t-r*1.6,n-r*1.2,t-r*1.2,n-r*1.9),e.lineTo(t-r*.4,n-r*.7),e.moveTo(t+r*.8,n-r*.6),e.quadraticCurveTo(t+r*1.6,n-r*1.2,t+r*1.2,n-r*1.9),e.lineTo(t+r*.4,n-r*.7),e.fill()),e.fillStyle=a,e.fillRect(t-r*.6,n-r*.25,r*.45,r*.22),e.fillRect(t+r*.15,n-r*.25,r*.45,r*.22),e.fillRect(t-r*.35,n+r*.45,r*.7,r*.14)}var Gr=[(e,t,n)=>Lr(e,[`#ae1c28`,`#ffffff`,`#21468b`],t,n),(e,t,n)=>{e.fillStyle=`#242424`,e.fillRect(0,0,t,n),Hr(e,t/2,n/2,n*.3,`#c02030`,14),Vr(e,t/2,n/2,n*.17,`#c02030`)},(e,t,n)=>{e.fillStyle=`#101010`,e.fillRect(0,0,t,n),e.strokeStyle=`#e8e4dc`,e.lineWidth=4,e.strokeRect(6,6,t-12,n-12),Vr(e,t/2,n/2,n*.25,`#e8e4dc`)},(e,t,n)=>Lr(e,[`#000000`,`#dd0000`,`#ffce00`],t,n),(e,t,n)=>Rr(e,[`#000000`,`#fae042`,`#ed2939`],t,n),(e,t,n)=>Br(e,0,0,t,n),(e,t,n)=>{e.fillStyle=`#012169`,e.fillRect(0,0,t,n),Br(e,0,0,t/2,n/2),e.fillStyle=`#ffffff`,Ir(e,t*.25,n*.75,n*.11,7,.45);for(let[r,i]of[[.75,.2],[.62,.45],[.86,.4],[.75,.82],[.8,.58]])Ir(e,t*r,n*i,n*.05,7,.45)},(e,t,n)=>Rr(e,[`#009246`,`#ffffff`,`#ce2b37`],t,n),(e,t,n)=>Rr(e,[`#0055a4`,`#ffffff`,`#ef4135`],t,n),(e,t,n)=>Lr(e,[`#aa151b`,`#f1bf00`,`#aa151b`],t,n,[1,2,1]),(e,t,n)=>Lr(e,[`#ffffff`,`#dc143c`],t,n),(e,t,n)=>zr(e,`#ba0c2f`,`#00205b`,t,n,`#ffffff`),(e,t,n)=>zr(e,`#006aa7`,`#fecc02`,t,n),(e,t,n)=>zr(e,`#ffffff`,`#002f6c`,t,n),(e,t,n)=>{e.fillStyle=`#da291c`,e.fillRect(0,0,t,n),e.fillStyle=`#ffffff`,e.fillRect(t/2-t*.07,n*.2,t*.14,n*.6),e.fillRect(t/2-t*.2,n/2-n*.1,t*.4,n*.2)},(e,t,n)=>Lr(e,[`#c8102e`,`#ffffff`,`#c8102e`],t,n),(e,t,n)=>{for(let r=0;r<13;r++)e.fillStyle=r%2==0?`#b22234`:`#ffffff`,e.fillRect(0,r*n/13,t,n/13+1);e.fillStyle=`#3c3b6e`,e.fillRect(0,0,t*.4,7/13*n),e.fillStyle=`#ffffff`;for(let r=0;r<5;r++)for(let i=0;i<6;i++)Ir(e,t*(.035+i*.066),n*(.05+r*.1),n*.022)},(e,t,n)=>{Rr(e,[`#006847`,`#ffffff`,`#ce1126`],t,n),e.fillStyle=`#8c5a2b`,e.beginPath(),e.arc(t/2,n/2,n*.12,0,Math.PI*2),e.fill()},(e,t,n)=>{Lr(e,[`#ffffff`,`#d52b1e`],t,n),e.fillStyle=`#0039a6`,e.fillRect(0,0,t/3,n/2),e.fillStyle=`#ffffff`,Ir(e,t/6,n/4,n*.12)},(e,t,n)=>{e.fillStyle=`#003399`,e.fillRect(0,0,t,n),e.fillStyle=`#ffcc00`;for(let r=0;r<12;r++){let i=r/12*Math.PI*2;Ir(e,t/2+Math.cos(i)*n*.3,n/2+Math.sin(i)*n*.3,n*.055)}},(e,t,n)=>{e.fillStyle=`#ffffff`,e.fillRect(0,0,t,n),e.fillStyle=`#bc002d`,e.beginPath(),e.ellipse(t/2,n/2,n*.3*(n/t),n*.3,0,0,Math.PI*2),e.fill()},(e,t,n)=>{e.fillStyle=`#009c3b`,e.fillRect(0,0,t,n),e.fillStyle=`#ffdf00`,e.beginPath(),e.moveTo(t*.08,n/2),e.lineTo(t/2,n*.1),e.lineTo(t*.92,n/2),e.lineTo(t/2,n*.9),e.closePath(),e.fill(),e.fillStyle=`#002776`,e.beginPath(),e.ellipse(t/2,n/2,t*.17,n*.25,0,0,Math.PI*2),e.fill()},(e,t,n)=>Rr(e,[`#169b62`,`#ffffff`,`#ff883e`],t,n),(e,t,n)=>zr(e,`#c8102e`,`#ffffff`,t,n),(e,t,n)=>{Ur(e,t,n),e.fillStyle=`#90a8b4`,e.fillRect(0,0,t,n),e.fillStyle=`#e41818`,e.fillRect(0,0,t*.5,n),Wr(e,t/2,n*.42,t*.28,`#d9d4c8`,`#1a1a1a`,!0),Vr(e,t/2,n*.78,t*.12,`#f4f0e6`)},(e,t,n)=>{Ur(e,t,n),e.fillStyle=`#f0c060`,e.fillRect(0,0,t,n),e.strokeStyle=`#c04848`,e.lineWidth=t*.18,e.beginPath(),e.moveTo(0,0),e.lineTo(t,n*.7),e.moveTo(t,0),e.lineTo(0,n*.7),e.stroke(),Wr(e,t/2,n*.4,t*.26,`#7a2a1e`,`#f0c060`,!0),Vr(e,t/2,n*.78,t*.12,`#7a2a1e`)},(e,t,n)=>{Ur(e,t,n),e.fillStyle=`#fccc0c`,e.fillRect(0,0,t,n),e.strokeStyle=`#111111`,e.lineWidth=t*.16,e.beginPath();for(let r=0;r<40;r++){let i=r*.45,a=t*.08+r*t*.012;e.lineTo(t/2+Math.cos(i)*a,n*.42+Math.sin(i)*a*1.8)}e.stroke(),Wr(e,t/2,n*.42,t*.22,`#2f9a6a`,`#fccc0c`,!1),Vr(e,t/2,n*.78,t*.12,`#2f9a6a`)}];function Kr(){let e=document.createElement(`canvas`);e.width=1024,e.height=512;let t=e.getContext(`2d`);t.clearRect(0,0,e.width,e.height),Gr.forEach((e,n)=>{let r=n&7,i=3-(n>>3);t.save(),t.translate(r*128,i*128),t.beginPath(),t.rect(0,0,128,128),t.clip(),e(t,128,128),t.globalCompositeOperation=`source-atop`,t.fillStyle=`rgba(0,0,0,0.12)`;for(let e=0;e<128;e+=4)t.fillRect(0,e,128,1);t.fillStyle=`rgba(0,0,0,0.25)`,t.fillRect(0,0,4,128),t.restore()});let n=new ue(e);return n.colorSpace=ee,n.anisotropy=4,n.needsUpdate=!0,n}var G={PELVIS:0,SPINE:1,HEAD:2,UARM_L:3,FARM_L:4,HAND_L:5,UARM_R:6,FARM_R:7,HAND_R:8,THIGH_L:9,SHIN_L:10,THIGH_R:11,SHIN_R:12,CAPE:13,FOOT_L:14,FOOT_R:15},qr={BODY:0,CAP:1,HAT:2,HAIR_LONG:3,PONY:4,BANDANA:5,CAPE:6,LANTERN_L:7,LANTERN_R:8,MIC:9,CAMERA:10,CTRL:11,HAIRCAP:12},K={SWAY:0,BOUNCE:1,JUMP:2,FIST:3,HANDS:4,PHONES:5,WAVE:6,HUG:7,CLAP:8,CROUCH:9,POLS:10,STOMP:11,HEADBANG:12,SIT:13,FLAGS:14,LIGHTERS:15,INTENS:16,HAKKEN:17,CHEER:18,LOOKUP:19},Jr={A:0,B:1,C:2,D:3,E:4,F:5,G:6,Q:7},Yr=`#f1c7a5.#e6b594.#d6a07f.#c48b69.#a8765a.#8d5b41.#6b4431.#f6d6bd.#16110e.#2c1f17.#4a3222.#6e4c2f.#b8955a.#d9c9a2.#7a3a1e.#8e8c88.#141414.#242424.#c02030.#7a1f2b.#4b2a6e.#e8e4dc.#8a8a8a.#2f6fd6.#39ff14.#ff2ea6.#ffd400.#3b4f6b.#556b2f.#2b1b45.#d6f000.#9e1512.#151515.#3b4f6b.#283246.#556b2f.#8c7e62.#4a4a4e.#5a1820.#9e1512.#0f0f10.#1a1a1c.#b01a22.#dad6ce.#b8a67e.#4b2a6e.#e0b000.#e8a07a.#e8e6e2.#151515.#6a6a6a.#b01a22.#c9a45c.#c8ccd0.#fff0c0.#ff6a00.#39ff14.#ffd400.#ff2ea6.#2f6fd6.#b01a22.#c02030.#e8e4dc.#0c0c0d`.split(`.`);function Xr(){return Yr.map(e=>new I(e))}var Zr={BLACK:0,CHARCOAL:1,RED:2,WINE:3,PURPLE:4,OFFWHITE:5,GREY:6,NEON_BLUE:7,NEON_GREEN:8,NEON_PINK:9,NEON_YELLOW:10,DENIM:11,OLIVE:12,MIDNIGHT:13,HIVIS:14,JUMPSUIT:15},Qr={BLACK:0,DENIM:1,DARK_DENIM:2,OLIVE:3,KHAKI:4,GREY:5,WINE:6,JUMPSUIT:7},$r={NONE:0,RED_EMBLEM:1,WHITE_TEXT:2,HIVIS:3,GOLD_STRIPES:4,TIEDYE:5,FLAMES:6},ei={NONE:0,CAP:1,CAP_BACK:2,BUCKET:3,BANDANA:4},ti={SHORT:0,LONG:1,PONY:2,BUZZ:3},ni={LANTERN_L:1,LANTERN_R:2,MIC:4,CAMERA:8,CTRL:16},ri={ax:.21,ay:.8,az:.015,drop:.145,w:.19,h:.2,d:.05};function ii(){return{skin:2,hairColor:1,hairStyle:0,female:!1,headwear:0,capColor:0,shoe:0,wristband:!1,top:0,print:0,shirtless:!1,tank:!1,bottom:0,longPants:!1,socks:!1,costume:!1,costumeColor:0,cape:!1,capeFlag:0,flagCarrier:!1,leftHanded:!1,props:0,glasses:!1,beard:!1}}var ai=e=>+!!e;function oi(e,t,n){t[n]=e.skin&7|(e.hairColor&7)<<3|(e.hairStyle&3)<<6|ai(e.female)<<8|(e.headwear&7)<<9|(e.capColor&7)<<12|(e.shoe&3)<<15|ai(e.wristband)<<17|ai(e.glasses)<<18|ai(e.beard)<<19,t[n+1]=e.top&15|(e.print&7)<<4|ai(e.shirtless)<<7|ai(e.tank)<<8|(e.bottom&7)<<9|ai(e.longPants)<<12|ai(e.socks)<<13|ai(e.costume)<<14|(e.costumeColor&3)<<15,t[n+2]=ai(e.cape)|(e.capeFlag&31)<<1|ai(e.flagCarrier)<<6|ai(e.leftHanded)<<7|(e.props&31)<<8,t[n+3]=0}var si=new u(.26,0,-.97).normalize(),ci=new s(0,-6),q=(e,t,n=1.4)=>({t:e,fade:n,m:t}),li=[q(0,{PHONES:.35,SWAY:.3,FLAGS:.08,LOOKUP:.05,INTENS:.6},.1),q(14,{PHONES:.3,SWAY:.55,HANDS:.12,FLAGS:.2,INTENS:.7},5),q(31.196,{PHONES:.28,SWAY:.7,HANDS:.2,FLAGS:.35,INTENS:.75},6),q(47.718,{FIST:.35,HANDS:.25,PHONES:.22,SWAY:.6,FLAGS:.5,INTENS:.85},.4),q(68.158,{BOUNCE:.35,CLAP:.25,HANDS:.2,PHONES:.2,FLAGS:.55,INTENS:.85},1),q(74.817,{JUMP:.35,HANDS:.4,FIST:.2,BOUNCE:.3,FLAGS:.8,PHONES:.12,INTENS:1},.5),q(100.274,{SWAY:.7,HANDS:.12,PHONES:.25,FLAGS:.45,INTENS:.75},3),q(110.809,{SWAY:.2,PHONES:.2,FLAGS:.3,INTENS:.6},.6),q(113.792,{HANDS:.25,FIST:.2,PHONES:.2,SWAY:.4,FLAGS:.5,INTENS:.8},.6),q(126.511,{BOUNCE:.45,HANDS:.2,FIST:.15,FLAGS:.6,INTENS:.85},.8),q(133.919,{BOUNCE:.7,FIST:.2,HANDS:.1,FLAGS:.6,INTENS:.9},1),q(145.544,{FIST:.5,BOUNCE:.55,JUMP:.15,HAKKEN:.12,FLAGS:.75,INTENS:1},.4),q(157.773,{SWAY:.2,HANDS:.3,FLAGS:.5,INTENS:.7},.3),q(160.831,{FIST:.55,BOUNCE:.55,JUMP:.12,HAKKEN:.15,FLAGS:.75,INTENS:1},.3),q(171.531,{HANDS:.5,SWAY:.7,WAVE:.12,FLAGS:.6,INTENS:.8},1.5),q(176.117,{SWAY:.75,PHONES:.35,HANDS:.25,WAVE:.18,HUG:.1,FLAGS:.55,INTENS:.75},2),q(206.69,{HANDS:.5,WAVE:.25,SWAY:.7,PHONES:.15,FLAGS:.6,INTENS:.8},2),q(218.92,{CLAP:.5,BOUNCE:.3,HANDS:.15,FLAGS:.6,INTENS:.85},1),q(234.051,{CROUCH:.7,SWAY:.1,FLAGS:.3,INTENS:.8},.8),q(243.378,{JUMP:.48,FIST:.32,HANDS:.25,BOUNCE:.2,FLAGS:1,INTENS:1.1},.15),q(269.425,{HANDS:.45,SWAY:.5,FIST:.15,FLAGS:.8,INTENS:.9},1.5),q(273.075,{HANDS:.35,PHONES:.3,SWAY:.6,FLAGS:.9,INTENS:.85},1),q(290.495,{HUG:.3,SWAY:.8,PHONES:.3,HANDS:.2,FLAGS:.8,INTENS:.8},2),q(307.14,{FIST:.5,BOUNCE:.6,HAKKEN:.1,FLAGS:.85,INTENS:.95},.4),q(317.979,{HANDS:.5,SWAY:.75,WAVE:.12,FLAGS:.8,INTENS:.85},1),q(330.366,{JUMP:.35,FIST:.3,BOUNCE:.3,FLAGS:.9,INTENS:1},.3),q(341.097,{HUG:.4,SWAY:.85,PHONES:.35,HANDS:.12,FLAGS:.55,INTENS:.8},2.5),q(403.033,{CLAP:.6,BOUNCE:.2,HANDS:.1,FLAGS:.6,INTENS:.9},1),q(409.227,{FIST:.5,SWAY:.1,FLAGS:.6,INTENS:.9},.3),q(412.323,{CROUCH:.55,FLAGS:.5,INTENS:.9},.6),q(415.42,{JUMP:.55,HANDS:.5,FIST:.25,FLAGS:1,INTENS:1.15},.12),q(440.194,{SWAY:.7,HUG:.2,HANDS:.3,PHONES:.12,FLAGS:.8,INTENS:.85},2),q(464.968,{HANDS:.4,PHONES:.3,SWAY:.6,FLAGS:.55,INTENS:.75},2),q(477.355,{HANDS:.5,CLAP:.25,SWAY:.4,FLAGS:.6,INTENS:.85},2),q(502.13,{JUMP:.5,FIST:.3,HANDS:.2,FLAGS:1,INTENS:1.1},.15),q(520.71,{FIST:.3,CLAP:.3,SWAY:.4,FLAGS:.8,INTENS:.9},1),q(533.097,{CROUCH:.4,FIST:.2,FLAGS:.6,INTENS:.9},.8),q(536.194,{JUMP:.55,HANDS:.4,FIST:.25,FLAGS:1,PHONES:.12,LOOKUP:.45,INTENS:1.15},.12),q(557.98,{HUG:.35,HANDS:.35,SWAY:.6,FLAGS:1,LOOKUP:.3,INTENS:.9},3),q(563.98,{CLAP:.6,HANDS:.2,FLAGS:.8,INTENS:.85},1),q(566.862,{POLS:.3,BOUNCE:.35,CLAP:.1,FLAGS:.6,INTENS:.9},1),q(577.021,{POLS:.62,BOUNCE:.4,FLAGS:.5,INTENS:.95},1),q(590.08,{POLS:.55,JUMP:.35,BOUNCE:.3,FLAGS:.8,INTENS:1.1},.15),q(612.669,{HANDS:.2,SWAY:.2,FLAGS:.3,INTENS:.7},.5),q(618.268,{PHONES:.4,LIGHTERS:.6,SWAY:.3,FLAGS:.2,INTENS:.6},3),q(637.796,{PHONES:.3,SWAY:.35,FLAGS:.3,INTENS:.7},2),q(645.554,{STOMP:.5,HANDS:.28,PHONES:.22,SWAY:.3,FLAGS:.5,INTENS:.85},2),q(709.046,{HANDS:.7,JUMP:.1,FLAGS:.8,INTENS:1},.2),q(711.996,{STOMP:.4,SWAY:.55,HANDS:.3,FLAGS:.7,INTENS:.9},1.5),q(733.046,{HANDS:.5,SWAY:.5,FLAGS:.6,INTENS:.85},1.5),q(742.046,{JUMP:.35,FIST:.3,PHONES:.35,FLAGS:.8,LOOKUP:.4,INTENS:1},.8),q(787.046,{CLAP:.6,FLAGS:.6,INTENS:.95},.8),q(790.071,{CROUCH:.6,FLAGS:.4,INTENS:.9},.6),q(793.046,{JUMP:.52,FIST:.4,HANDS:.15,FLAGS:1,LOOKUP:.3,INTENS:1.1},.12),q(817.046,{HANDS:.6,SWAY:.4,FLAGS:.8,INTENS:.95},1),q(826.096,{CROUCH:.6,FLAGS:.5,INTENS:.95},.6),q(829.046,{JUMP:.65,FIST:.35,HANDS:.3,FLAGS:1,LOOKUP:.25,INTENS:1.2},.12),q(877.796,{CLAP:.5,HANDS:.2,FLAGS:.6,INTENS:.8},1),q(884.751,{SIT:.62,PHONES:.45,LIGHTERS:.75,SWAY:.2,FLAGS:.1,INTENS:.5},3),q(933.965,{JUMP:.4,HANDS:.3,FIST:.2,FLAGS:.7,INTENS:1.05},.2),q(943.725,{HEADBANG:.4,FIST:.5,BOUNCE:.35,JUMP:.12,FLAGS:.7,INTENS:1},1.5),q(1003.286,{HANDS:.3,CROUCH:.3,FLAGS:.5,INTENS:.9},.5),q(1006.815,{JUMP:.5,FIST:.4,HEADBANG:.15,FLAGS:.9,INTENS:1.1},.15),q(1027.565,{JUMP:.5,FIST:.35,HANDS:.2,FLAGS:.95,LOOKUP:.2,INTENS:1.1},.5),q(1081.208,{CLAP:.4,HANDS:.3,SWAY:.4,FLAGS:.6,INTENS:.8},1.5),q(1098.366,{HUG:.45,SWAY:.85,PHONES:.15,FLAGS:.45,INTENS:.75},2.5),q(1110.566,{HANDS:.5,SWAY:.6,HUG:.15,FLAGS:.5,INTENS:.8},2),q(1131.966,{HANDS:.55,WAVE:.3,SWAY:.5,FLAGS:.6,INTENS:.85},1.5),q(1155.966,{JUMP:.4,FIST:.3,BOUNCE:.2,FLAGS:.8,INTENS:1},.5),q(1181.966,{CROUCH:.6,FLAGS:.5,INTENS:.9},.6),q(1188.366,{JUMP:.55,FIST:.3,HANDS:.2,FLAGS:1,LOOKUP:.4,INTENS:1.1},.12),q(1225.484,{HANDS:.5,HUG:.35,SWAY:.6,FLAGS:.7,INTENS:.9},1.5),q(1255.353,{JUMP:.5,FIST:.3,FLAGS:.9,INTENS:1.05},.15),q(1287.366,{JUMP:.6,HANDS:.35,FIST:.2,FLAGS:1,LOOKUP:.5,INTENS:1.15},.12),q(1304.366,{SWAY:.8,HUG:.4,PHONES:.15,FLAGS:.5,INTENS:.7},2),q(1309.866,{SWAY:.6,PHONES:.3,HANDS:.1,FLAGS:.4,INTENS:.7},2),q(1317.588,{PHONES:.42,SWAY:.5,HANDS:.08,FLAGS:.35,INTENS:.7},3),q(1367.73,{SWAY:.75,HANDS:.3,HUG:.25,PHONES:.2,FLAGS:.55,INTENS:.8},2),q(1403.402,{CLAP:.6,FLAGS:.6,INTENS:.9},1),q(1412.856,{CROUCH:.5,FLAGS:.5,INTENS:.9},.5),q(1414.241,{JUMP:.5,FIST:.3,HANDS:.2,FLAGS:.95,INTENS:1.1},.12),q(1438.747,{FIST:.4,BOUNCE:.45,HAKKEN:.12,FLAGS:.8,INTENS:1},1),q(1449.854,{HANDS:.5,SWAY:.5,FLAGS:.7,INTENS:.85},1),q(1460.385,{CLAP:.7,BOUNCE:.2,FLAGS:.6,INTENS:.9},.8),q(1473.854,{HANDS:.3,HUG:.35,PHONES:.6,LIGHTERS:.35,SWAY:.7,FLAGS:.5,INTENS:.75},2),q(1506.835,{CROUCH:.6,FLAGS:.5,INTENS:.95},1),q(1511.015,{JUMP:.6,HANDS:.4,FIST:.15,PHONES:.2,FLAGS:1,LOOKUP:.55,INTENS:1.2},.12),q(1537.429,{CLAP:.5,HUG:.4,HANDS:.1,FLAGS:.8,LOOKUP:.2,INTENS:.8},2),q(1551.522,{HANDS:.5,FIST:.2,FLAGS:.9,INTENS:.95},1),q(1557,{FIST:.4,CLAP:.45,FLAGS:.8,INTENS:.85},1.5),q(1576.379,{SWAY:.4,CLAP:.2,FLAGS:.5,INTENS:.7},1.5)],ui=[16,47.4,55.3,63.2,75.5,100.1,114.4,120.3,126.4,145.6,158,243.46,274,330.3,409.5,415.44,502.1,536.2,564.5,567,589.73,612.5,709.2,793.2,829.25,859.25,933.8,1004.5,1006.7,1026.9,1082,1188.4,1287,1293.4,1412.1,1511.18,1537,1554.8,1571],di={idle:{SWAY:.25,INTENS:.7},sway:{SWAY:.95,HANDS:.1,INTENS:.75},bounce:{BOUNCE:.8,FIST:.2,INTENS:.95},jump:{JUMP:.6,FIST:.25,HANDS:.25,FLAGS:.9,INTENS:1.1},handsup:{HANDS:.75,SWAY:.5,FLAGS:.7,INTENS:.9},fistpump:{FIST:.65,BOUNCE:.5,FLAGS:.7,INTENS:1},lighters:{PHONES:.55,LIGHTERS:.9,SWAY:.6,INTENS:.7},cheer:{HANDS:.55,CHEER:1,FLAGS:.9,INTENS:1},wave:{WAVE:.6,SWAY:.6,INTENS:.85},hug:{HUG:.6,SWAY:.85,INTENS:.8},clap:{CLAP:.7,INTENS:.9},crouch:{CROUCH:.7,INTENS:.9},sit:{SIT:.85,PHONES:.32,LIGHTERS:.35,INTENS:.5},stomp:{STOMP:.6,HANDS:.2,INTENS:.9},headbang:{HEADBANG:.5,FIST:.4,INTENS:1},pols:{POLS:.65,BOUNCE:.3,INTENS:1}},fi=Object.keys(K),pi=[K.JUMP,K.BOUNCE,K.FIST,K.HAKKEN,K.STOMP,K.HEADBANG,K.POLS,K.CLAP];function mi(e,t){e.fill(0),e[K.INTENS]=1;for(let n of fi){let r=t[n];r!==void 0&&(e[K[n]]=r)}}var hi=li.map(e=>{let t=new Float32Array(20);return mi(t,e.m),t}),gi={},_i=[K.PHONES,K.LIGHTERS,K.LOOKUP],vi={};for(let[e,t]of Object.entries(di)){let n=new Float32Array(20);mi(n,t),gi[e]=n;let r=new Uint8Array(20).fill(1);for(let e of fi)_i.includes(K[e])&&t[e]===void 0&&(r[K[e]]=0);vi[e]=r}var yi=.1,bi=.35,xi=.6,Si=6,Ci=e=>e<=0?0:e>=1?1:e*e*(3-2*e);function wi(e){return e<0||e>4.5?0:e<.18?e/.18:Math.exp(-(e-.18)*.85)}var Ti=class{mood=new Float32Array(20);cheer=0;cueState=`-`;cueTmp=[];fw=[];fwFile=null;fwMaxDur=0;fireworks(e,t){if(!t||!t.file)return 0;if(t.file!==this.fwFile){this.fwFile=t.file,this.fw=t.all(`fireworks`),this.fwMaxDur=0;for(let e=0;e<this.fw.length;e++)this.fwMaxDur=Math.max(this.fwMaxDur,this.fw[e].dur)}let n=this.fw,r=e-this.fwMaxDur-Si-2.5,i=0,a=n.length;for(;i<a;){let e=i+a>>1;n[e].t<r?i=e+1:a=e}let o=0;for(let t=i;t<n.length;t++){let r=n[t];if(r.t>e+xi+1.2)break;let i=Ci((e-r.t+xi+1.2)/1.2)*Ci((r.t+r.dur+Si+2.5-e)/2.5);i>o&&(o=i)}return o}evaluate(e,t,n,r){let i=this.mood,a=li.length-1;for(;a>0&&li[a].t>e;)a--;let o=hi[a];if(a>0&&e>=li[0].t){let t=hi[a-1],n=Ci((e-li[a].t)/li[a].fade);for(let e=0;e<20;e++)i[e]=t[e]+(o[e]-t[e])*n}else i.set(o);let s=0;for(let t=0;t<ui.length;t++){let n=wi(e-ui[t]);n>s&&(s=n)}if(n){if(n.kind===`silence`)for(let e=0;e<pi.length;e++)i[pi[e]]*=.25;i[K.INTENS]*=.8+.3*Math.min(1,Math.max(0,n.energy))}if(!t.hasKick){let e=i[K.JUMP];i[K.JUMP]=0,i[K.HANDS]=Math.min(1,i[K.HANDS]+e*.5),i[K.SWAY]=Math.min(1,i[K.SWAY]+i[K.BOUNCE]*.7+i[K.HAKKEN]),i[K.BOUNCE]*=.3,i[K.HAKKEN]=0,i[K.HEADBANG]*=.3}if(this.cueState=`-`,r&&r.file){let t=r.active(`crowd`,e,this.cueTmp);for(let n=0;n<t.length;n++){let r=t[n],a=Ci((e-r.t)/1),o=Ci((r.t+r.dur-e)/1),c=Math.min(a,o),l=typeof r.p.intensity==`number`?Math.max(0,Math.min(1.5,r.p.intensity)):1;if(r.fx===`mood`){let t=gi[String(r.p.state??``)];if(!t)continue;let n=vi[String(r.p.state)];this.cueState=String(r.p.state);for(let e=0;e<20;e++){if(n[e]===0)continue;let r=e===K.INTENS?t[e]*(.7+.3*l):e===K.FLAGS?Math.max(i[e],t[e]):t[e]*l;i[e]+=(r-i[e])*c}r.p.state===`cheer`&&(s=Math.max(s,wi(e-r.t)*l))}else if(r.fx===`cheer`)s=Math.max(s,wi(e-r.t)*l);else if(r.fx===`flags`){let e=typeof r.p.amount==`number`?Math.max(0,Math.min(1,r.p.amount)):1;i[K.FLAGS]+=(e-i[K.FLAGS])*c}}let n=r.active(`fireworks`,e,this.cueTmp).length;n>0&&(i[K.LOOKUP]=Math.max(i[K.LOOKUP],Math.min(.7,.2+n*.08)));let a=this.fireworks(e,r);a>0&&(i[K.PHONES]=Math.max(i[K.PHONES],bi*a))}i[K.PHONES]=Math.max(i[K.PHONES],yi*(1-Math.min(1,i[K.SIT]*1.5))),i[K.CHEER]=s,this.cheer=s}};function Ei(e){let t=`idle`,n=.15;for(let r of fi){if(r===`INTENS`||r===`FLAGS`||r===`LOOKUP`||r===`CHEER`||r===`LIGHTERS`)continue;let i=e[K[r]];i>n&&(n=i,t=r.toLowerCase())}return t}var Di=(e,t,n)=>new u(e,t,n);function Oi(e,t,n=0){if(!e.index){let t=e.getAttribute(`position`).count,n=Array(t);for(let e=0;e<t;e++)n[e]=e;e.setIndex(n)}e.deleteAttribute(`uv`);let r=e.getAttribute(`position`).count,i=new Float32Array(r).fill(t+32*n);return e.setAttribute(`aBone`,new j(i,1)),e}function ki(e,t,n=2,r=0){let i=[],a=[],o=[],s=2/n;for(let n of e){o.push(i.length/3);let e=n.ox??0,a=n.oz??0;if(n.rx<=0&&n.rz<=0){i.push(e,n.y,a);continue}for(let o=0;o<t;o++){let c=o/t*Math.PI*2+r,l=Math.sin(c),u=Math.cos(c);i.push(e+n.rx*Math.sign(l)*Math.abs(l)**+s,n.y,a+n.rz*Math.sign(u)*Math.abs(u)**+s)}}for(let n=0;n<e.length-1;n++){let r=o[n],i=o[n+1],s=e[n].rx<=0&&e[n].rz<=0,c=e[n+1].rx<=0&&e[n+1].rz<=0;for(let e=0;e<t;e++){let n=(e+1)%t;s&&c||(s?a.push(r,i+n,i+e):c?a.push(r+e,r+n,i):a.push(r+e,r+n,i+n,r+e,i+n,i+e))}}let c=new M;return c.setAttribute(`position`,new j(new Float32Array(i),3)),c.setIndex(a),c}function Ai(e,t,n){let r=n.clone().sub(t).normalize(),i=Di(1,0,0),a=i.clone().addScaledVector(r,-r.dot(i)).normalize(),o=new u().crossVectors(a,r),s=new b().makeBasis(a,r,o).setPosition(t);return e.applyMatrix4(s),e}function ji(e,t,n,r,i=[.8,.8],a=1,o=1){let s=e.distanceTo(t),c=[],l=n[0][1],u=n[n.length-1][1];i[0]>0&&(c.push({y:-l*i[0],rx:0,rz:0}),Mi&&c.push({y:-l*i[0]*.62,rx:l*.72*a,rz:l*.72*o}));for(let[e,t]of n)c.push({y:e*s,rx:t*a,rz:t*o});return i[1]>0&&(Mi&&c.push({y:s+u*i[1]*.62,rx:u*.72*a,rz:u*.72*o}),c.push({y:s+u*i[1],rx:0,rz:0})),Ai(ki(c,r),e,t)}var Mi=!0;function Ni(e,t,n,r,i,a,o){let s=[{y:-n,rx:0,rz:0}];for(let e=a;e>=1;e--){let i=Math.PI*e/(a+1);s.push({y:n*Math.cos(i),rx:t*Math.sin(i),rz:r*Math.sin(i)})}s.push({y:n,rx:0,rz:0});let c=ki(s,i);if(c.translate(e.x,e.y,e.z),o){let e=c.getAttribute(`position`),t=new u;for(let n=0;n<e.count;n++)t.set(e.getX(n),e.getY(n),e.getZ(n)),o(t),e.setXYZ(n,t.x,t.y,t.z)}return c}function Pi(e,t,n,r,i,a,o,s){let c=new he(1,1,o,s),l=c.getAttribute(`position`);for(let o=0;o<l.count;o++){let s=l.getX(o)+.5,c=.5-l.getY(o),u=e+(t-e)*c,d=(s-.5)*u,f=n+(r-n)*c,p=i-a*(1-4*(s-.5)*(s-.5))-.03*c;l.setXYZ(o,d,f,p)}c.computeVertexNormals();let u=c.clone(),d=u.getIndex().array;for(let e=0;e<d.length;e+=3){let t=d[e+1];d[e+1]=d[e+2],d[e+2]=t}let f=u.getAttribute(`normal`);for(let e=0;e<f.count;e++)f.setXYZ(e,-f.getX(e),-f.getY(e),-f.getZ(e));c.deleteAttribute(`uv`),u.deleteAttribute(`uv`);let p=pe([c,u],!1);return c.dispose(),u.dispose(),p}function Fi(e){let t=Math.abs((e+Math.PI)%(Math.PI*2)-Math.PI)/Math.PI;return t<.38?1.705-.04*t/.38:t<.62?1.665-.037*(t-.38)/.24:1.628-.072*(t-.62)/.38}var Ii=Di(0,1.645,.012),Li=[.08,.112,.098];function Ri(e,t){let n=Ii.x,r=Ii.y+.002,i=Ii.z-.002,a=Li[0]+.0075,o=Li[1]+.006,s=Li[2]+.009,c=[],l=[];for(let l=0;l<t;l++){let u=l/t;for(let t=0;t<e;t++){let l=t/e*Math.PI*2,d=Math.acos(E.clamp((Fi(l)-r)/o,-1,1))*(1-u),f=E.smoothstep(u,0,.55),p=1+.05*(1-Math.abs(1-2*u))*(Math.cos(l)<0?1:.5),m=Li[0]+(a-Li[0])*(.4+.6*f),h=Li[2]+(s-Li[2])*(.4+.6*f);c.push(n+m*p*Math.sin(d)*Math.sin(l),r+o*Math.cos(d),i+h*p*Math.sin(d)*Math.cos(l))}}let u=c.length/3;c.push(n,r+o+.004,i-.004);for(let n=0;n<t-1;n++){let t=n*e,r=t+e;for(let n=0;n<e;n++){let i=(n+1)%e;l.push(t+n,t+i,r+i,t+n,r+i,r+n)}}let d=(t-1)*e;for(let t=0;t<e;t++)l.push(d+t,d+(t+1)%e,u);let f=new M;return f.setAttribute(`position`,new j(new Float32Array(c),3)),f.setIndex(l),f}function zi(e,t){let[n,r,i]=Li;return Ni(Ii,n,r,i,e,t,e=>{let t=(e.y-Ii.y)/r,n=(e.z-Ii.z)/i,a=E.smoothstep(-t,.05,.95);e.x*=1-.2*a*(.55+.45*Math.max(0,n)),n>0&&(e.z+=.006*a*n),n>.6&&t>-.4&&(e.z-=.008*(n-.6)/.4),n<0&&t>-.2&&(e.z-=.006*-n*(1-Math.abs(t)))})}function Bi(e){let t=e===`hero`;Mi=t;let n=[],r=t?2.3:2.4,i=t?[{y:.83,rx:0,rz:0,oz:-.004},{y:.855,rx:.1,rz:.08},{y:.9,rx:.145,rz:.098,oz:-.004},{y:.95,rx:.16,rz:.104,oz:-.008},{y:1.005,rx:.154,rz:.1,oz:-.004},{y:1.06,rx:.15,rz:.097}]:[{y:.835,rx:0,rz:0},{y:.87,rx:.12,rz:.088},{y:.95,rx:.16,rz:.103,oz:-.006},{y:1.06,rx:.15,rz:.097}];n.push(Oi(ki(i,t?16:8,r,t?0:Math.PI/8),G.PELVIS));let a=t?[{y:1.03,rx:.15,rz:.098},{y:1.1,rx:.143,rz:.095,oz:.003},{y:1.18,rx:.15,rz:.1,oz:.008},{y:1.26,rx:.164,rz:.108,oz:.014},{y:1.33,rx:.176,rz:.11,oz:.013},{y:1.39,rx:.183,rz:.102,oz:.004},{y:1.43,rx:.176,rz:.09,oz:-.004},{y:1.458,rx:.14,rz:.075,oz:-.008},{y:1.478,rx:.075,rz:.058,oz:-.01},{y:1.49,rx:0,rz:0,oz:-.01}]:[{y:1.03,rx:.15,rz:.098},{y:1.13,rx:.145,rz:.097,oz:.004},{y:1.28,rx:.17,rz:.11,oz:.015},{y:1.4,rx:.183,rz:.1,oz:.004},{y:1.455,rx:.14,rz:.075,oz:-.008},{y:1.485,rx:0,rz:0,oz:-.01}];n.push(Oi(ki(a,t?16:8,r,t?0:Math.PI/8),G.SPINE)),n.push(Oi(ji(Di(0,1.43,-.012),Di(0,1.57,0),[[0,.052],[1,.046]],t?10:6,[0,0]),G.HEAD)),n.push(Oi(t?zi(16,10):zi(8,4),G.HEAD));let o=new ye(t?.015:.014,.032,t?6:3);if(o.rotateX(Math.PI/2+(t?.35:.2)),o.scale(1,1,.9),o.translate(0,1.628,.103),n.push(Oi(o,G.HEAD)),t)for(let e of[1,-1])n.push(Oi(Ni(Di(.079*e,1.638,.004),.011,.027,.017,6,3),G.HEAD));let s=t?9:5;for(let e of[1,-1]){let r=e>0,i=r?G.UARM_L:G.UARM_R,a=r?G.FARM_L:G.FARM_R,o=r?G.HAND_L:G.HAND_R,c=r?G.THIGH_L:G.THIGH_R,l=r?G.SHIN_L:G.SHIN_R,u=r?G.FOOT_L:G.FOOT_R,d=t?[[0,.051],[.18,.05],[.6,.042],[1,.036]]:[[0,.05],[.4,.046],[1,.036]];n.push(Oi(ji(Di(.188*e,1.435,-.012),Di(.205*e,1.13,-.01),d,s,[.75,.7]),i));let f=t?[[0,.036],[.22,.038],[.7,.029],[1,.024]]:[[0,.036],[.3,.036],[1,.024]];n.push(Oi(ji(Di(.205*e,1.13,-.01),Di(.21*e,.885,0),f,s,[.7,.5],.86,1.05),a));let p=t?[[0,.021],[.2,.031],[.45,.037],[.72,.034],[1,.023]]:[[0,.024],[.45,.036],[1,.025]],m=ji(Di(.21*e,.895,0),Di(.212*e,.725,.012),p,t?8:4,[.5,.75],.42,1),h=m.getAttribute(`position`);for(let t=0;t<h.count;t++){let n=h.getY(t),r=Math.max(0,.8-n)*.28;h.setX(t,h.getX(t)-e*r)}n.push(Oi(m,o)),t&&n.push(Oi(ji(Di(.203*e,.868,.03),Di(.19*e,.8,.05),[[0,.012],[1,.0095]],6,[.6,.8]),o));let g=t?[[0,.08],[.2,.087],[.65,.068],[1,.056]]:[[0,.084],[.45,.076],[1,.056]];n.push(Oi(ji(Di(.093*e,.99,0),Di(.1*e,.5,.015),g,t?9:6,[.4,.7]),c));let _=t?[[0,.053],[.25,.056],[.7,.038],[1,.033]]:[[0,.054],[.25,.054],[1,.034]];n.push(Oi(ji(Di(.1*e,.5,.015),Di(.1*e,.075,0),_,s,[.6,.3],1,1.04),l));let v=ki(t?[{y:-.082,rx:0,rz:0,oz:-.042},{y:-.066,rx:.038,rz:.04,oz:-.044},{y:-.02,rx:.045,rz:.05,oz:-.05},{y:.06,rx:.051,rz:.042,oz:-.042},{y:.14,rx:.048,rz:.031,oz:-.031},{y:.18,rx:.036,rz:.025,oz:-.025},{y:.197,rx:0,rz:0,oz:-.022}]:[{y:-.08,rx:0,rz:0,oz:-.044},{y:-.04,rx:.045,rz:.047,oz:-.047},{y:.1,rx:.049,rz:.036,oz:-.036},{y:.195,rx:0,rz:0,oz:-.022}],t?9:5,2.4,t?0:Math.PI/5);Ai(v,Di(.1*e,0,0),Di(.1*e,0,1)),n.push(Oi(v,u))}return n}function Vi(e){let t=e===`hero`;Mi=t;let n=[];n.push(Oi(t?Ri(16,5):Ri(8,2),G.HEAD,qr.HAIRCAP));let r=new v(.108,t?14:6,t?4:2,0,Math.PI*2,0,Math.PI/2);r.scale(.86,.95,1),r.translate(0,1.672,.008),n.push(Oi(r,G.HEAD,qr.CAP));let i=new A(.1,.1,.012,t?10:5,1,!1,-Math.PI/2,Math.PI);i.scale(.85,1,1.25),i.rotateX(-.12),i.translate(0,1.678,.062),n.push(Oi(i,G.HEAD,qr.CAP)),n.push(Oi(ji(Di(0,1.66,.01),Di(0,1.765,.01),[[0,.108],[1,.09]],t?12:6,[0,.35],1,1.05),G.HEAD,qr.HAT));let a=new A(.17,.17,.012,t?14:6,1,!1);a.translate(0,1.672,.01),n.push(Oi(a,G.HEAD,qr.HAT)),n.push(Oi(Pi(.17,.2,1.7,1.42,-.08,.035,t?4:2,t?5:2),G.HEAD,qr.HAIR_LONG));let o=new ye(.035,.24,t?8:4);return o.rotateX(Math.PI+.35),o.translate(0,1.6,-.125),n.push(Oi(o,G.HEAD,qr.PONY)),n.push(Oi(ji(Di(0,1.665,.012),Di(0,1.705,.012),[[0,.084],[1,.082]],t?14:6,[0,0],1,1.18),G.HEAD,qr.BANDANA)),n.push(Oi(Pi(.5,.78,1.45,.72,-.13,.05,t?3:2,t?5:3),G.CAPE,qr.CAPE)),n}function Hi(){let e=[],t=ri;for(let n of[1,-1]){let r=n>0?qr.LANTERN_L:qr.LANTERN_R,i=n>0?G.HAND_L:G.HAND_R,a=t.ax*n,o=t.ay-t.drop,s=new me(t.w,t.h,t.d);s.translate(a,o,t.az),e.push(Oi(s,i,r));for(let n of[o+t.h/2+.004,o-t.h/2-.004]){let o=new me(t.w+.008,.008,t.d+.008);o.translate(a,n,t.az),e.push(Oi(o,i,r))}let c=t.drop-t.h/2-.008,l=new me(.012,c,.012);l.translate(a,t.ay-c/2,t.az),e.push(Oi(l,i,r))}e.push(Oi(ji(Di(-.215,.79,.018),Di(-.035,.7835,.036),[[0,.015],[.62,.018],[.8,.026],[1,.029]],10,[.5,1]),G.HAND_R,qr.MIC));let n=new me(.13,.18,.42);n.translate(-.2,1.6,.06),e.push(Oi(n,G.SPINE,qr.CAMERA)),e.push(Oi(ji(Di(-.2,1.6,.27),Di(-.2,1.6,.38),[[0,.05],[1,.045]],8,[0,0]),G.SPINE,qr.CAMERA));let r=new me(.22,.03,.14);return r.translate(-.215,.76,.06),e.push(Oi(r,G.HAND_R,qr.CTRL)),e}function Ui(e){for(let t of e){t.getAttribute(`normal`)||t.computeVertexNormals();for(let e of Object.keys(t.attributes))e!==`position`&&e!==`normal`&&e!==`aBone`&&t.deleteAttribute(e)}let t=pe(e,!1);for(let t of e)t.dispose();if(!t)throw Error(`crowd: geometry merge failed`);return t.computeBoundingSphere(),t}function Wi(e){for(let t of e)t.getAttribute(`normal`)||t.computeVertexNormals();return e}function Gi(){return Ui(Wi([...Bi(`near`),...Vi(`near`)]))}function Ki(){return Ui(Wi([...Bi(`hero`),...Vi(`hero`)]))}function qi(e=`hero`){return Ui(Wi([...Bi(e),...Vi(e),...Hi()]))}function Ji(e,t,n,r,i){let a=e.distanceTo(t),o=new A(r,n,a,i,1,!0),s=e.clone().add(t).multiplyScalar(.5),c=t.clone().sub(e).normalize(),l=new F().setFromUnitVectors(new u(0,1,0),c);return o.applyQuaternion(l),o.translate(s.x,s.y,s.z),o}function Yi(){let e=[];e.push(Oi(ki([{y:.86,rx:.12,rz:.086},{y:1.06,rx:.152,rz:.098}],5,2.4,Math.PI/5),G.PELVIS)),e.push(Oi(ki([{y:1.03,rx:.15,rz:.098},{y:1.28,rx:.17,rz:.11,oz:.012},{y:1.42,rx:.182,rz:.096},{y:1.49,rx:0,rz:0,oz:-.01}],5,2.4,Math.PI/5),G.SPINE)),e.push(Oi(Ni(Ii.clone().setY(1.64),.084,.118,.1,6,2),G.HEAD));for(let t of[1,-1])e.push(Oi(Ji(Di(.19*t,1.44,-.01),Di(.205*t,1.13,-.01),.05,.042,3),t>0?G.UARM_L:G.UARM_R)),e.push(Oi(Ji(Di(.205*t,1.13,-.01),Di(.212*t,.72,0),.04,.03,3),t>0?G.FARM_L:G.FARM_R)),e.push(Oi(Ji(Di(.095*t,.98,0),Di(.1*t,.5,.015),.085,.06,3),t>0?G.THIGH_L:G.THIGH_R)),e.push(Oi(Ji(Di(.1*t,.5,.015),Di(.1*t,0,.05),.058,.045,3),t>0?G.SHIN_L:G.SHIN_R));return Ui(Wi(e))}function Xi(){let e=new M;return e.setAttribute(`position`,new j(new Float32Array([0,0,0,1,0,0,1,1,0,0,1,0]),3)),e.setAttribute(`uv`,new j(new Float32Array([0,0,1,0,1,1,0,1]),2)),e.setIndex([0,1,2,0,2,3]),e}function Zi(){let e=[],t=[],n=[],r=[],i=.016,a=[[i,i],[-.016,i],[-.016,-.016],[i,-.016]];for(let i=0;i<4;i++){let[o,s]=a[i],[c,l]=a[(i+1)%4],u=e.length/3;e.push(o,0,s,c,0,l,c,1,l,o,1,s);for(let e=0;e<4;e++)t.push(0,0),n.push(0);r.push(u,u+1,u+2,u,u+2,u+3)}let o=e.length/3;for(let r=0;r<=5;r++)for(let i=0;i<=10;i++)e.push(0,0,0),t.push(i/10,r/5),n.push(1);for(let e=0;e<5;e++)for(let t=0;t<10;t++){let n=o+e*11+t,i=n+10+1;r.push(n,i,n+1,n+1,i,i+1)}let s=new M;return s.setAttribute(`position`,new j(new Float32Array(e),3)),s.setAttribute(`uv`,new j(new Float32Array(t),2)),s.setAttribute(`aPart`,new j(new Float32Array(n),1)),s.setIndex(r),s}function Qi(){let e=new M;return e.setAttribute(`position`,new j(new Float32Array([-1,-1,0,1,-1,0,1,1,0,-1,1,0]),3)),e.setIndex([0,1,2,0,2,3]),e}function $i(e){return e.index?e.index.count/3:e.getAttribute(`position`).count/3}var ea=.42,ta=-112,na=-112,ra=[[-20,36],[20,36],[-20,69],[20,69],[-20,102],[20,102],[-20,135],[20,135]],ia=[[16,-59],[17,-63],[-40,-63],[-54,-82],[-64,-75],[-123,-71],[-128,-63],[-128,-37],[-124,-34],[-121,82],[-118,91],[-91,117],[-48,116],[-48,107],[-84,107],[-91,105],[-108,89],[-108,-48],[-105,-55],[-97,-58]],aa=[[128,-38],[124,-57],[118,-66],[109,-73],[98,-78],[87,-65],[24,-63],[27,-58],[87,-57],[99,-55],[105,-51],[108,-34],[108,99],[58,109],[56,113],[129,113]];function oa(e,t,n){let r=!1;for(let i=0,a=n.length-1;i<n.length;a=i++){let[o,s]=n[i],[c,l]=n[a];s>t!=l>t&&e<(c-o)*(t-s)/(l-s)+o&&(r=!r)}return r}var sa=$e.barrierZ,ca=$e.barrierX,la=sa+.45;function ua(e,t){let n=Math.abs(e);return!(n<=ca+.5&&t<la||t>sa-.5&&t<$e.armEnd.z+2&&n>ca-.45&&n<da(t)+1.3)}function da(e){return 92+2*(z(e,-4,58)+4)/62}var fa=[[6,4.5],[28,4.3],[33,3],[58,3],[63,2.2],[109,2.2],[116,1.5],[133,1.5],[140,.6],[172,.6],[174,0]];function pa(e){if(e<=fa[0][0])return fa[0][1];for(let t=1;t<fa.length;t++)if(e<=fa[t][0]){let[n,r]=fa[t-1],[i,a]=fa[t];return R(r,a,(e-n)/(i-n))}return 0}var ma=class extends Error{constructor(){super(`crowd layout superseded`)}},ha=12*Math.PI/180;function ga(e,t,n,r=!1){if(!n||n.length===0)return 1;let i=1;for(let a=0;a<n.length;a++){let o=n[a],s=e-o.x,c=t-o.z,l=s*s+c*c,u=o.yaw===void 0?o.ring+.8:Math.max(o.ring+.8,(o.r2??0)+1.5);if(l>=u*u)continue;let d=Math.sqrt(l);if(d<o.ring)return 0;let f=r?1:B(o.ring,o.ring+.8,d);if(o.yaw!==void 0&&d>.001){let e=(-s*Math.sin(o.yaw)-c*Math.cos(o.yaw))/d,t=Math.acos(z(e,-1,1)),n=o.cone??Math.PI/3,i=o.r1??6,a=o.r2??9,l=o.keep??.35;if(r){if(t<n&&d<i)return 0}else{let e=1-B(n,n+ha,t),r=d<i?0:d<a?l:R(l,1,B(a,a+1.5,d));f=Math.min(f,R(1,r,e))}}f<i&&(i=f)}return i}function _a(e,t,n){if(!n)return 0;let r=0;for(let i=0;i<n.length;i++){let a=n[i];if(a.yaw===void 0||!a.short)continue;let o=e-a.x,s=t-a.z,c=Math.hypot(o,s);if(c>a.short+1.5||c<.001)continue;let l=(-o*Math.sin(a.yaw)-s*Math.cos(a.yaw))/c,u=Math.acos(z(l,-1,1)),d=(a.cone??Math.PI/3)+22*Math.PI/180,f=(1-B(d,d+ha,u))*(1-B(a.short,a.short+1.5,c));f>r&&(r=f)}return r}function va(e){return e?e.map(e=>`${e.x.toFixed(1)},${e.z.toFixed(1)},${e.ring},${e.yaw?.toFixed(2)??`-`},${e.cone??``},${e.r1??``},${e.r2??``},${e.keep??``},${e.dense??``}`).join(`|`):``}function ya(e,t,n){let r=Math.abs(e);if(t>172||t<-2||r>107.5||!ua(e,t)||r>=37&&t<-3)return 0;if(t<=59.5&&r>90.5){let e=da(t);if(Math.abs(r-e)<1.3||t>55.5&&r>e-3.5&&r<e+3.5)return 0}if(oa(e,t,e<0?ia:aa))return 0;let i;if(r<=44)i=pa(t),i*=t<31?1-.33*B(22,44,r):1-.12*B(30,44,r),n.zone=t<30?Jr.A:t<60?Jr.B:t<113?Jr.C:t<137?Jr.D:Jr.G;else if(t<=105){if(t<=58?r>da(t):r>95)i=.8,n.zone=Jr.F;else{i=1.8*(1-.18*B(80,92,r));let e=pa(t)*.88;i=R(e,i,B(44,50,r)),n.zone=Jr.E}i*=1-.35*B(100,105,t)}else t<137?(i=r<60?.9:.5,n.zone=r<60?Jr.D:Jr.F):(i=r<60?.6:.35,n.zone=Jr.G);for(let n=0;n<ra.length;n++){let[r,i]=ra[n];if(Math.abs(e-r)<5.75&&Math.abs(t-i)<5.75)return 0}let a=Math.abs(r-20);if(a<2.2&&t>3&&t<137&&(i*=R(.42,1,B(1.2,2.2,a))),r<7.9&&t>85.5&&t<94.5||r<4.3&&t>55.5&&t<62.5)return 0;let o=Math.max(r-6.4,86.5-t,t-93.5,0);return o<5&&(i*=R(.7,1,o/5)),i}function ba(e,t,n,r){if(n.kind===`box`)return e>n.minX-r&&e<n.maxX+r&&t>n.minZ-r&&t<n.maxZ+r;let i=e-n.x,a=t-n.z,o=n.r+r;return i*i+a*a<o*o}var xa=4,Sa=.5,Ca=class{cs;cells=new Map;big=[];constructor(e){this.cs=e;for(let t=0;t<e.length;t++){let n=e[t],r=n.kind===`box`?n.minX:n.x-n.r,i=n.kind===`box`?n.maxX:n.x+n.r,a=n.kind===`box`?n.minZ:n.z-n.r,o=n.kind===`box`?n.maxZ:n.z+n.r,s=Math.floor((r-Sa)/xa),c=Math.floor((i+Sa)/xa),l=Math.floor((a-Sa)/xa),u=Math.floor((o+Sa)/xa);if((c-s+1)*(u-l+1)>4096){this.big.push(t);continue}for(let e=l;e<=u;e++)for(let n=s;n<=c;n++){let r=wa(n,e),i=this.cells.get(r);i||this.cells.set(r,i=[]),i.push(t)}}}hit(e,t,n){let r=this.cs;for(let i=0;i<this.big.length;i++)if(ba(e,t,r[this.big[i]],n))return!0;let i=this.cells.get(wa(Math.floor(e/xa),Math.floor(t/xa)));if(!i)return!1;for(let a=0;a<i.length;a++)if(ba(e,t,r[i[a]],n))return!0;return!1}},wa=(e,t)=>(e+32768)*65536+(t+32768);function Ta(e,t,n){let r=Math.floor(e),i=Math.floor(t),a=e-r,o=t-i,s=(e,t)=>qe(lt(e,t,n))/4294967296,c=a*a*(3-2*a),l=o*o*(3-2*o);return R(R(s(r,i),s(r+1,i),c),R(s(r,i+1),s(r+1,i+1),c),l)}var Ea=[.35,.5,.72,1.3,1.15,2,2.2,1],Da=.2,Oa=1.22,ka=[[0,20],[1,14],[2,3],[3,10],[4,6],[5,5],[6,5],[7,4],[8,4],[9,3],[10,3],[11,2],[12,2],[13,1],[14,1.5],[15,1.5],[16,3],[17,1.5],[18,1.5],[19,1.5],[20,1],[21,1],[22,1],[23,1],[24,1.2],[25,1.2],[26,1.2]],Aa=new Set([24,25,26]);function ja(e,t){let n=0;for(let[,e]of t)n+=e;let r=e*n;for(let[e,n]of t)if(r-=n,r<=0)return e;return t[t.length-1][0]}function Ma(e,t){let n=0;for(let e of t)n+=e;let r=e*n;for(let e=0;e<t.length;e++)if(r-=t[e],r<=0)return e;return t.length-1}function Na(e,t,n){let r=e.chance(.35);t.female=r,t.skin=Ma(e.next(),[16,18,18,14,11,8,6,9]),t.leftHanded=e.chance(.14),r?(t.hairStyle=Ma(e.next(),[10,55,32,3]),t.hairColor=Ma(e.next(),[18,26,22,8,16,6,4,0])):(t.hairStyle=Ma(e.next(),[72,4,2,22]),t.hairColor=Ma(e.next(),[30,30,18,8,7,2,2,3]));let i=e.next();if(i<.35){let n=e.next();t.headwear=n<.52?ei.CAP:n<.72?ei.CAP_BACK:ei.BUCKET,t.capColor=e.chance(.6)?+!e.chance(.5):2+Ma(e.next(),[22,16,18,16,10,8])}else t.headwear=i<.4?ei.BANDANA:ei.NONE;let a=!r&&e.chance(.3);t.shirtless=a,t.tank=!a&&e.chance(r?.35:.15);let o=Ma(e.next(),[34,12,7,5,6,4,8,6,2,2.5,2.5,3,4,4,0,0]);if(t.top=o,t.print=$r.NONE,o===Zr.BLACK||o===Zr.CHARCOAL){let n=e.next();t.print=n<.58?$r.RED_EMBLEM:n<.74?$r.WHITE_TEXT:n<.8?$r.FLAMES:$r.NONE}else o===Zr.PURPLE||o===Zr.MIDNIGHT?t.print=e.chance(.35)?$r.TIEDYE:$r.RED_EMBLEM*+!!e.chance(.3):(o===Zr.RED||o===Zr.WINE)&&(t.print=e.chance(.4)?$r.WHITE_TEXT:$r.NONE);t.bottom=Ma(e.next(),[45,18,10,11,8,6,2,0]),t.longPants=t.bottom===Qr.DARK_DENIM?e.chance(.8):e.chance(.14),t.socks=e.chance(.45),t.shoe=Ma(e.next(),[42,44,10,4]),t.wristband=e.chance(.55),t.costume=e.chance(.02),t.costumeColor=e.int(0,3),t.costume&&(t.headwear=ei.NONE),t.cape=!t.costume&&e.chance(.022),t.cape&&(t.capeFlag=ja(e.next(),ka)),t.flagCarrier=!1,t.props=0,t.glasses=e.chance(.07),t.beard=!r&&e.chance(.3),n===Jr.Q&&(t.shirtless=t.shirtless&&e.chance(.5));let s=z(r?1.68+e.gauss()*.065:1.815+e.gauss()*.07,1.55,2),c=r?z(.9+e.gauss()*.04,.82,1.02):z(1.02+e.gauss()*.06,.9,1.22);return t.hairStyle===ti.BUZZ&&t.headwear===ei.NONE&&e.chance(.3)&&(t.hairColor=7),{height:s,build:c}}var Pa=256;function Fa(e,t){for(let n=0;n<Pa;n++)t[n]=Math.min(Oa,e**(n/100));return t}function Ia(e,t,n,r){let i=ea*ea,a=Fa(n,r),o=0;for(let n=0;n<e.length;n++){let r=e[n];r>0&&(o+=Math.min(1,r*a[t[n]]*i))}return o}function La(e,t,n,r){let i=new Uint8Array(e.length);for(let t=0;t<e.length;t++)i[t]=Math.round(Ea[e[t]]*100);for(let a of r??[]){if(!a.dense)continue;let r=a.dense+16,o=Math.max(0,Math.floor((a.z-r-Ba)/ea)),s=Math.min(n-1,Math.ceil((a.z+r-Ba)/ea)),c=Math.max(0,Math.floor((a.x-r-za)/ea)-1),l=Math.min(t-1,Math.ceil((a.x+r-za)/ea));for(let n=o;n<=s;n++){let o=Ba+(n+.5)*ea,s=(n&1)*.5*ea;for(let u=c;u<=l;u++){let c=n*t+u,l=1-B(a.dense,r,Math.hypot(za+(u+.5)*ea+s-a.x,o-a.z));if(l<=0)continue;let d=Math.round(R(Ea[e[c]]*100,Math.min(Ea[e[c]]*100,Da*100),l));d<i[c]&&(i[c]=d)}}}return i}var Ra=null,za=-108,Ba=-2,Va=null;async function Ha(e){if(e&&(e.cancelled?.()||e.due?.()&&e.yield&&(await e.yield(),e.cancelled?.())))throw new ma}async function Ua(e,t,n,r){let i=`${e.length}:${t.length}`;if(Ra&&Ra.key===i)return Ra;let a=Math.ceil(216/ea),o=Math.ceil(175/ea),s=new Float32Array(a*o),c=new Uint8Array(a*o),l={zone:0};for(let e=0;e<o;e++){e&7||await Ha(r);let i=Ba+(e+.5)*ea,o=(e&1)*.5*ea;for(let r=0;r<a;r++){let u=za+(r+.5)*ea+o,d=ya(u,i,l);if(d>0&&n.hit(u,i,.45)&&(d=0),d>0)for(let e=0;e<t.length;e++){let n=t[e],r=u-n.x,a=i-n.z,o=r*n.dx+a*n.dz,s=Math.abs(r*n.dz-a*n.dx);if(o>-2&&o<11&&s<2.6){d*=.15;break}}let f=e*a+r;s[f]=d,c[f]=l.zone}}return Ra={key:i,dens:s,zones:c,nx:a,nz:o},Ra}function Wa(e,t,n,r){let i=va(r);if(!r||r.length===0)return e;if(Va&&Va.base===e&&Va.key===i)return Va.dens;let a=e.slice();for(let e of r){let i=e.yaw===void 0?e.ring+.8:Math.max(e.ring+.8,(e.r2??0)+1.5),o=Math.max(0,Math.floor((e.z-i-Ba)/ea)-1),s=Math.min(n-1,Math.ceil((e.z+i-Ba)/ea)+1),c=Math.max(0,Math.floor((e.x-i-za)/ea)-2),l=Math.min(t-1,Math.ceil((e.x+i-za)/ea)+1);for(let e=o;e<=s;e++){let n=Ba+(e+.5)*ea,i=(e&1)*.5*ea;for(let o=c;o<=l;o++){let s=e*t+o;a[s]<=0||(a[s]*=ga(za+(o+.5)*ea+i,n,r))}}}return Va={key:i,base:e,dens:a},a}function Ga(e,t,n,r,i){if(!i||i.length===0)return!1;if(ga(e,t,i,!0)<=0)return!0;if(!r)return!1;let a=Math.sin(n)*2.4,o=Math.cos(n)*2.4;return ga(e+a,t+o,i,!0)<=0||ga(e-a,t-o,i,!0)<=0}async function Ka(e,t){let n=e.seed??2026,r=new Ca(e.colliders);await t?.step?.(`crowd field`,0);let i=await Ua(e.colliders,e.queues,r,t),{zones:a,nx:o,nz:s}=i,c=Wa(i.dens,o,s,e.clear),l=e.clear,u=La(a,o,s,l),d=new Float32Array(Pa);await t?.step?.(`placing people`,.35);let f=[];for(let t=0;t<e.queues.length;t++){let i=e.queues[t],a=5+qe(lt(n,t,77))%7,o=-i.dz,s=i.dx;for(let e=0;e<a;e++){let a=lt(n,t,e,91),c=(qe(a)/4294967296-.5)*.5,u=1.1+e*.62+qe(a+1)/4294967296*.15,d=i.x+i.dx*u+o*c,p=i.z+i.dz*u+s*c;if(r.hit(d,p,.3)||!ua(d,p)||ga(d,p,l,!0)<=0)continue;let m=Math.atan2(-i.dx,-i.dz)+(qe(a+2)/4294967296-.5)*.5;f.push({x:d,z:p,zone:Jr.Q,seed:qe(a+3)&16777215,yaw:m})}}let p=Math.max(0,e.target-f.length),m=0,h=2;for(let e=0;e<22;e++){await Ha(t);let e=(m+h)/2;Ia(c,u,e,d)<p?m=e:h=e}let g=Fa((m+h)/2,d),_=ea*ea;for(let r=0;r<s&&f.length<e.target;r++){r&7||await Ha(t);let i=Ba+(r+.5)*ea,s=(r&1)*.5*ea;for(let t=0;t<o;t++){let d=r*o+t,p=c[d];if(p<=0)continue;let m=a[d],h=Math.min(1,p*g[u[d]]*_),v=lt(n,t,r);if(qe(v)/4294967296>=h)continue;let y=za+(t+.5)*ea+s,b=qe(v+11)/4294967296,x=qe(v+12)/4294967296,S=y+(b-.5)*ea*.62,C=i+(x-.5)*ea*.62;S+=(Ta(y*.31,i*.31,5)-.5)*.55,C+=(Ta(y*.31+17.3,i*.31-4.1,6)-.5)*.55;let w=m===Jr.D||m===Jr.F||m===Jr.G,T=Math.atan2(ci.x-S,ci.y-C),E=qe(v+13)/4294967296,D=qe(v+14)/4294967296;if(w){let e=Math.floor(S/3.2),t=Math.floor(C/3.2),r=lt(n,e,t,3);if(qe(r)/4294967296<(m===Jr.G?.55:.35)){let n=(e+.3+.4*(qe(r+1)/4294967296))*3.2,i=(t+.3+.4*(qe(r+2)/4294967296))*3.2,a=S-n,o=C-i,s=Math.hypot(a,o)||1,c=.55+.35*E;S=n+a/s*c,C=i+o/s*c,D<.75&&(T=Math.atan2(n-S,i-C))}T+=(E-.5)*.9}else T+=(E-.5)*.36+(Ta(S*.2,C*.2,9)-.5)*.3;if(ua(S,C)&&!(l&&Ga(S,C,T,w,l))&&(f.push({x:S,z:C,zone:m,seed:qe(v+15)&16777215,yaw:T}),f.length>=e.target))break}}let v=f.length,y=new Int32Array(v),b=new Int32Array(672);for(let e=0;e<v;e++){let t=f[e],n=z(Math.floor((t.x-ta)/8),0,27),r=z(Math.floor((t.z- -8)/8),0,23)*28+n;y[e]=r,b[r]++}let x=new Int32Array(672);for(let e=1;e<672;e++)x[e]=x[e-1]+b[e-1];let S=x.slice(),C=new Int32Array(v);for(let e=0;e<v;e++)C[S[y[e]]++]=e;let w=new Float32Array(v*4),T=new Float32Array(v*4),E=new Float32Array(v*4),D=[0,0,0,0,0,0,0,0],O=ii(),k=[],A=new Int32Array(v);for(let e=0;e<672;e++){if(b[e]===0)continue;let t=e%28,n=Math.floor(e/28);k.push({start:x[e],count:b[e],minX:ta+t*8-3.2,maxX:ta+(t+1)*8+3.2,minZ:-8+n*8-3.2,maxZ:-8+(n+1)*8+3.2,minY:1/0,maxY:-1/0});for(let t=x[e];t<x[e]+b[e];t++)A[t]=k.length-1}let ee=0;await t?.step?.(`dressing the Tribe`,.6);for(let n=0;n<v;n++){n&1023||await Ha(t);let r=f[C[n]],i=e.heightAt(r.x,r.z),a=Na(new ft(r.seed*2654435761+7),O,r.zone),o=a.height,s=a.build,c=l?_a(r.x,r.z,l):0;c>0&&(o=Math.min(o,R(o,1.57+.11*(qe(lt(r.seed,61))/4294967296),c))),O.cape&&ee++,w[n*4]=r.x,w[n*4+1]=i,w[n*4+2]=r.z,w[n*4+3]=r.yaw,T[n*4]=o,T[n*4+1]=s,T[n*4+2]=r.seed,T[n*4+3]=r.zone,oi(O,E,n*4),D[r.zone]++;let u=k[A[n]];u.minY=Math.min(u.minY,i),u.maxY=Math.max(u.maxY,i)}for(let e of k)e.minY-=.3,e.maxY+=2.6;if(await t?.step?.(`flags`,.9),t?.cancelled?.())throw new ma;let te=[],j=[.5,1.2,1.5,.8,1,.25,.2,0],ne=[],M=e.flagAvoid??[];for(let e=0;e<v;e++){let t=j[T[e*4+3]];if(t<=0)continue;let n=w[e*4],r=w[e*4+2];if(Math.abs(n)<8&&r<14)continue;let i=!1;for(let e=0;e<M.length&&!i;e++){let[t,a,o]=M[e];i=(n-t)*(n-t)+(r-a)*(r-a)<o*o}if(i)continue;let a=qe(lt(T[e*4+2],4242))/4294967296;ne.push({k:a/t,s:e})}ne.sort((e,t)=>e.k-t.k);let re=Math.min(e.flagTarget,ne.length);for(let e=0;e<re;e++){let t=ne[e].s,n=T[t*4+2],r=ja(qe(lt(n,17))/4294967296,ka),i=Aa.has(r),a=2.1+qe(lt(n,18))/4294967296*1.6;te.push({carrier:t,type:r,pole:a,w:i?.42:1.5,h:i?1.5:.9}),E[t*4+2]=E[t*4+2]|64}let ie=new Float32Array(10304);for(let e=0;e<v;e++){let t=Math.floor((w[e*4]-na)/2),n=Math.floor((w[e*4+2]- -8)/2);t<0||n<0||t>=112||n>=92||(ie[n*112+t]+=1/4)}return{count:v,pos:w,attr:T,look:E,chunks:k,flags:te,density:ie,zoneCounts:D,capes:ee}}function qa(e,t,n){let r=(t-na)/2-.5,i=(n- -8)/2-.5,a=Math.floor(r),o=Math.floor(i),s=r-a,c=i-o,l=(t,n)=>t<0||n<0||t>=112||n>=92?0:e[n*112+t];return R(R(l(a,o),l(a+1,o),s),R(l(a,o+1),l(a+1,o+1),s),c)}function Ja(e,t){let n=Math.abs(e),r=0;t>=-20&&t<=115&&(r=n<=100?z((n-46)*.096,0,5.2):n<=109?5.2+(n-100)/9*.4:Math.max(0,5.4-(n-109)*.32),t>105&&(r*=1-B(105,115,t)));let i=t<-5?z((-t-5)*.1,0,5.6):0,a=Math.max(r,i);return t>113&&(a+=-.5*(t-113)/59),a}var Ya=class e{mc={t0:332.1,t1:502.1};troupe={t0:641.8,t1:746.4};lead={t0:639.5,t1:746.4};pedestal={t0:638.8,t1:721.4};aerial={t0:678.8,t1:703.8};strap={t0:675.8,t1:705.8};pianist={t0:880.4,t1:1098.4};tubeHi={t0:885.1,t1:936};tubeLo={t0:876.5,t1:1098.4};dj=[];hype=[{t0:330.37,t1:341.1},{t0:415.42,t1:440},{t0:502.13,t1:520.71}];fromShow=!1;load(t){let n=new e;if(this.mc=n.mc,this.troupe=n.troupe,this.lead=n.lead,this.pedestal=n.pedestal,this.aerial=n.aerial,this.strap=n.strap,this.pianist=n.pianist,this.tubeHi=n.tubeHi,this.tubeLo=n.tubeLo,this.dj=n.dj,this.hype=n.hype,this.fromShow=!1,!t||!t.file)return;let r=[],i=[];for(let e of t.all(`crowd`)){let t={t0:e.t,t1:e.t+e.dur};if(e.fx===`mood`&&e.p.state===`jump`&&i.push(t),e.fx!==`performer`)continue;this.fromShow=!0;let n=String(e.p.who??``);n===`dj`?r.push(t):n===`tube`?typeof e.p.level==`number`&&e.p.level<.5?this.tubeLo=t:this.tubeHi=t:n===`mc`?this.mc=t:n===`troupe`?this.troupe=t:n===`lead`?this.lead=t:n===`pedestal`?this.pedestal=t:n===`strap`?this.strap=t:n===`pianist`?this.pianist=t:n===`aerialist`&&(this.aerial=t)}r.length&&(this.dj=r),i.length&&(this.hype=i)}},Xa=(e,t)=>e>t.t0&&e<t.t1,J=Math.PI/180;function Za(){return{off:[0,0,0],cape:.12,rootR:[0,0,0],spine:[0,0,0],head:[0,0],armL:[0,0,0,0],armR:[0,0,0,0],legL:[0,0,0],legR:[0,0,0],shoW:1,hipW:1}}function Qa(e){return e.off[0]=e.off[1]=e.off[2]=0,e.cape=.12,e.rootR[0]=e.rootR[1]=e.rootR[2]=0,e.spine[0]=e.spine[1]=e.spine[2]=0,e.head[0]=e.head[1]=0,Y(e.armL,5,7,12,0),Y(e.armR,5,7,14,0),e.legL[0]=e.legL[1]=e.legL[2]=0,e.legR[0]=e.legR[1]=e.legR[2]=0,e}function Y(e,t,n,r,i){e[0]=t*J,e[1]=n*J,e[2]=r*J,e[3]=i*J}function $a(e,t,n,r,i,a){e[0]+=(t*J-e[0])*a,e[1]+=(n*J-e[1])*a,e[2]+=(r*J-e[2])*a,e[3]+=(i*J-e[3])*a}function eo(e,t,n){let r=Math.sin(t*Math.PI*2),i=Math.cos(t*Math.PI*2);e.legL[0]+=24*J*r*n,e.legR[0]-=24*J*r*n,e.legL[2]+=Math.max(0,-i)*38*J*n+6*J*n,e.legR[2]+=Math.max(0,i)*38*J*n+6*J*n,e.armL[0]-=20*J*r*n,e.armR[0]+=20*J*r*n,e.off[1]-=Math.abs(r)*.025*n,e.rootR[1]+=5*J*r*n}function to(e,t){let n=Math.acos(z(1-t/.86,-1,1));e.legL[0]+=n,e.legL[2]+=2*n,e.legR[0]+=n,e.legR[2]+=2*n,e.off[1]-=t}var no=class{w;cum=[0];constructor(e){this.w=e;for(let t=1;t<e.length;t++)this.cum.push(this.cum[t-1]+Math.hypot(e[t].x-e[t-1].x,e[t].z-e[t-1].z))}at(e,t){let n=this.w,r=0;for(;r<n.length-2&&e>n[r+1].t;)r++;let i=n[r],a=n[r+1],o=z((e-i.t)/Math.max(.001,a.t-i.t),0,1),s=o*o*(3-2*o);t.x=R(i.x,a.x,s),t.z=R(i.z,a.z,s);let c=this.cum[r+1]-this.cum[r];t.dist=this.cum[r]+c*s;let l=6*o*(1-o);t.speed=o>0&&o<1?c*l/Math.max(.001,a.t-i.t):0,t.dx=a.x-i.x,t.dz=a.z-i.z}},ro=new no([{t:332,x:0,z:-7.2},{t:338,x:0,z:-3.6},{t:347,x:-4.2,z:-3.9},{t:351,x:-4.6,z:-4},{t:357,x:-5.5,z:-3.8},{t:360.2,x:-5,z:-2.5},{t:363,x:-5.2,z:-2.4},{t:364,x:-5.3,z:-2.3},{t:365.3,x:-5.5,z:-1.9},{t:366.9,x:-5.4,z:-1.6},{t:369.2,x:-5.1,z:-1.8},{t:373,x:-.5,z:-2.4},{t:380,x:3,z:-3.6},{t:389,x:5.5,z:-3.7},{t:397,x:-1.2,z:-3.6},{t:401.8,x:-.6,z:-1.8},{t:403.4,x:1,z:-2.6},{t:406,x:3.5,z:-4},{t:409,x:.8,z:-4.3},{t:414,x:1.2,z:-5},{t:430,x:-1.4,z:-5},{t:441,x:-3.5,z:-4.4},{t:446,x:-5.5,z:-4},{t:452,x:-2,z:-4.2},{t:458,x:-4,z:-3.8},{t:465,x:-4,z:-3.5},{t:478,x:8,z:-3.5},{t:489,x:12,z:-3.8},{t:495.6,x:3.8,z:-5.2},{t:496.6,x:3.6,z:-5.3},{t:497.7,x:2.2,z:-5.4},{t:502.2,x:2,z:-5.7}]),io=332,ao=[38,-24,130,0],oo=409.2,so=412.3,co=415.3;function lo(e,t,n){let r=Math.atan2(n.dx,n.dz);if(t<339)return r;let i=z(n.speed/.8,0,1);return i>.15?R(0,r,.55*i):.15*Math.sin(e*.3)}var uo=642,fo=-5.3,po=2.7,mo=657,ho=658.1,go=666.6,_o=668.2,vo=706.6,yo=720.6,bo=720.9,xo=723,So=722.2,Co=729.3,wo=.3,To=-.05,Eo=729.8,Do=734.4,Oo=1.42,ko=742.6,Ao=-7.6,jo=new no([{t:yo,x:0,z:fo},{t:So,x:0,z:-4.4},{t:Co,x:wo,z:To},{t:Eo,x:wo,z:To},{t:Do,x:0,z:-5.8},{t:ko,x:0,z:-5.8},{t:745.1,x:0,z:Ao}]),Mo=(()=>{let e=[],t=(e,t)=>[e,t,-1,Math.atan2(-e,-5.5-t)],n={0:[-1.05,-5.5,0,0],2:[-.35,-5.5,0,0],4:[.35,-5.5,0,0],6:[1.05,-5.5,0,0],8:[-.38,-5.58,1,0],1:[.38,-5.58,1,0],3:t(-2,-3.3),5:t(2,-3.3),7:t(-3.2,-2.9),9:t(3.2,-2.9)};for(let t=0;t<10;t++)e.push(n[t]);return e})(),No={RITUAL:0,DANCE:1,CRADLE:2,SPREAD:3,HIGH:4,LOW:5},Po=[[0,No.RITUAL],[668.2,No.DANCE],[690.6,No.CRADLE],[693.9,No.SPREAD],[696.6,No.HIGH],[702.6,No.LOW],[716,No.DANCE]],Fo=[18,-10,102,0],Io=[92,18,86,0],Lo=[40,20,90,0],Ro=[4,8,58,0],zo=[18,82,12,0];function Bo(e,t,n){e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3]}function Vo(e,t,n,r){for(let i=0;i<4;i++)e[t+i]+=(n[i]-e[t+i])*r}function Ho(e,t,n){let r=(t-e)%(Math.PI*2);return r>Math.PI&&(r-=Math.PI*2),r<-Math.PI&&(r+=Math.PI*2),e+r*n}var Uo=10,Wo=10,Go=new Set([`lead`,`aerialist`,`pianist`,...Array.from({length:Uo},(e,t)=>`dancer${t}`)]),Ko=class{count;perfs=[];iPos;iAttr;iLook;iP;lantern=new p(1,.72,.42,0);pedestal=0;strap=0;pianoTube=0;visibleCount=0;crewVisible=0;mcOn=!1;timing=new Ya;pose=Za();fr={visible:!1,x:0,y:0,z:0,yaw:0,glow:0};pp={x:0,z:0,dist:0,speed:0,dx:0,dz:0};spp={x:0,z:0,dist:0,speed:0,dx:0,dz:0};lp={x:0,z:0,dist:0,speed:0,dx:0,dz:0};fp={x:0,z:0,lift:0};fq={x:0,z:0,lift:0};ph={th:0,cont:0,col:0,pyr:0,faceYaw:0,gone:!1};armA=new Float32Array(9);armB=new Float32Array(9);sPose=Za();sFr={visible:!1,x:0,y:0,z:0,yaw:0,glow:0};byName=new Map;heightAt;constructor(e){this.heightAt=e;let t=(e,t,n,r,i=1)=>{let a=ii();n(a);let o=/(\d+)$/.exec(e);this.perfs.push({name:e,k:o?Number(o[1]):0,mode:t,look:a,height:r,build:i,seed:qe(this.perfs.length*977+31)&16777215})};t(`mc`,`both`,e=>{e.skin=4,e.hairColor=0,e.headwear=ei.CAP,e.capColor=0,e.top=Zr.MIDNIGHT,e.bottom=Qr.BLACK,e.shoe=0,e.socks=!1,e.props=ni.MIC,e.wristband=!0,e.beard=!0},1.8,1.12);for(let e=0;e<Uo;e++)t(`dancer${e}`,`both`,t=>{t.female=e%3!=1,t.skin=[1,2,3,5,0,4,2,6,1,3][e],t.hairColor=+(e%4==0),t.hairStyle=ti.PONY,t.top=Zr.JUMPSUIT,t.bottom=Qr.JUMPSUIT,t.longPants=!0,t.shoe=1,t.props=e%4==3?ni.LANTERN_R:ni.LANTERN_L|ni.LANTERN_R},e%3==1?1.8:1.68+e%2*.05,e%3==1?1:.9);t(`lead`,`both`,e=>{e.female=!0,e.skin=2,e.hairStyle=ti.LONG,e.hairColor=0,e.top=Zr.JUMPSUIT,e.bottom=Qr.JUMPSUIT,e.longPants=!0,e.shoe=1},1.72,.88),t(`aerialist`,`both`,e=>{e.female=!0,e.skin=1,e.hairStyle=ti.PONY,e.top=Zr.JUMPSUIT,e.bottom=Qr.JUMPSUIT,e.longPants=!0,e.shoe=1},1.66,.86),t(`pianist`,`both`,e=>{e.skin=4,e.hairColor=0,e.hairStyle=ti.PONY,e.top=Zr.BLACK,e.print=$r.GOLD_STRIPES,e.bottom=Qr.BLACK,e.longPants=!0,e.shoe=1},1.8,1),t(`dj`,`both`,e=>{e.headwear=ei.CAP,e.top=Zr.BLACK,e.bottom=Qr.BLACK,e.longPants=!0,e.shoe=1},1.8,1.05),t(`deckcam`,`both`,e=>{e.headwear=ei.CAP_BACK,e.top=Zr.BLACK,e.bottom=Qr.BLACK,e.longPants=!0,e.shoe=1,e.props=ni.CAMERA},1.82,1.08),t(`fohcam`,`both`,e=>{e.headwear=ei.CAP,e.top=Zr.BLACK,e.bottom=Qr.BLACK,e.longPants=!0,e.shoe=1},1.78,1.05),t(`pilot`,`filmed`,e=>{e.top=Zr.CHARCOAL,e.bottom=Qr.DARK_DENIM,e.longPants=!0,e.shoe=1,e.props=ni.CTRL,e.hairStyle=ti.BUZZ},1.84,1.02),t(`photog`,`filmed`,e=>{e.headwear=ei.BUCKET,e.capColor=0,e.top=Zr.BLACK,e.bottom=Qr.BLACK,e.longPants=!0,e.shoe=1,e.props=ni.CAMERA},1.76,1),t(`walker`,`filmed`,e=>{e.headwear=ei.CAP,e.top=Zr.BLACK,e.bottom=Qr.BLACK,e.shoe=1},1.8,1);for(let e=0;e<6;e++)t(`safety${e}`,`filmed`,t=>{t.top=Zr.HIVIS,t.print=$r.HIVIS,t.bottom=Qr.BLACK,t.longPants=!0,t.shoe=1,t.headwear=e%2==0?ei.CAP:ei.NONE,t.hairStyle=ti.BUZZ,t.skin=[1,3,0,5,2,4][e]},1.76+e%3*.04,1.05);t(`terrace`,`both`,e=>{e.top=Zr.BLACK,e.bottom=Qr.BLACK,e.longPants=!0,e.shoe=1,e.hairStyle=ti.SHORT},1.8,1);for(let e=0;e<Wo;e++)t(`security${e}`,`tribe`,t=>{t.top=Zr.HIVIS,t.print=$r.HIVIS,t.bottom=Qr.BLACK,t.longPants=!0,t.shoe=1,t.headwear=e%3==0?ei.CAP:ei.NONE,t.hairStyle=ti.BUZZ,t.skin=[2,0,4,1,5,3,2,6,1,0][e]},1.8+e*7%5*.03,1.12);this.count=this.perfs.length,this.iPos=new Float32Array(this.count*4),this.iAttr=new Float32Array(this.count*4),this.iLook=new Float32Array(this.count*4),this.iP=Array.from({length:7},()=>new Float32Array(this.count*4));for(let e=0;e<this.count;e++)oi(this.perfs[e].look,this.iLook,e*4);this.perfs.forEach((e,t)=>this.byName.set(e.name,t))}subjectAt(e,t,n){if(e===`mc`){if(!Xa(t,this.timing.mc))return!1;let e=this.spp;return ro.at(t-this.timing.mc.t0+io,e),n.x=e.x,n.z=e.z,n.y=Xe(e.x,e.z),!0}let r=this.evalSubject(e,t);return r?(n.x=r.x,n.y=r.y,n.z=r.z,!0):!1}facingAt(e,t){if(e===`mc`){if(!Xa(t,this.timing.mc))return NaN;let e=this.spp,n=t-this.timing.mc.t0+io;return ro.at(n,e),lo(t,n,e)}let n=this.evalSubject(e,t);return n?n.yaw:NaN}evalSubject(e,t){if(!Go.has(e))return null;let n=this.byName.get(e);if(n===void 0)return null;let r=this.perfs[n],i=this.sFr;i.visible=!1;let a=this.timing,o=this.pedestal;return this.pedestal=+!!Xa(t,a.pedestal),this.evalOne(r,n,t,t,0,150,0,Qa(this.sPose),i),this.pedestal=o,i.visible?i:null}update(e,t,n,r,i,a){this.visibleCount=0,this.crewVisible=0;let o=this.timing;this.mcOn=Xa(e,o.mc);let s=0;this.pedestal=+!!Xa(e,o.pedestal),this.strap=+!!Xa(e,o.strap),this.pianoTube=Xa(e,o.tubeHi)?1:Xa(e,o.tubeLo)?.25:.06;for(let t=0;t<this.count;t++){let o=this.perfs[t],c=Qa(this.pose);c.shoW=o.build*(o.look.female?.9:1),c.hipW=R(1,o.build,.5)*(o.look.female?1.08:1);let l=this.fr;l.visible=!1,l.glow=0,(o.mode===`both`||(o.mode===`filmed`?!a:a))&&this.evalOne(o,t,e,e,n,r,i,c,l),l.visible&&o.name.startsWith(`dancer`)&&(s=1),this.write(t,o,c,l),l.visible&&(this.visibleCount++,(o.mode!==`both`||o.name.endsWith(`cam`)||o.name===`terrace`)&&this.crewVisible++)}this.lantern.w=s*.14}evalOne(e,t,n,r,i,a,o,s,c){let l=i-Math.floor(i),u=Math.exp(-(l*60)/Math.max(60,a)*11),d=e.name,f=e.seed%1e3/159.2,p=this.timing;if(d===`mc`){if(!Xa(n,p.mc))return;let e=this.pp,t=n-p.mc.t0+io;ro.at(t,e),c.visible=!0,c.x=e.x,c.z=e.z,c.y=Xe(c.x,c.z);let r=z(e.speed/.8,0,1);c.yaw=lo(n,t,e),c.glow=-.9*B(336,339,t)*(1-B(501.4,502.1,t)),eo(s,e.dist/1.45,r),Y(s.armR,ao[0],ao[1],ao[2],ao[3]),s.head[1]-=.08;let i=t>oo&&t<so;for(let e=0;e<p.hype.length&&!i;e++)i=Xa(n,p.hype[e])&&t>=co;let a=.5+.5*Math.sin(n*.9+1.3);Y(s.armL,12-20*r*Math.sin(e.dist/1.45*Math.PI*2),10,20,0),i?(Y(s.armL,150+18*u,22,25-10*u,0),s.off[1]+=.12*Math.max(0,Math.sin(Math.PI*l))*(1-r)):r<.4&&$a(s.armL,72+22*a,16+8*Math.sin(n*.5),24+14*(1-a),-10,.85),i||to(s,.04*(.5+.5*Math.cos(l*Math.PI*2))*(1-r)),s.head[0]-=.1;return}if(d.startsWith(`dancer`)){let t=e.k;if(!(n>p.troupe.t0-1&&n<p.troupe.t1))return;let r=n-p.troupe.t0+uo;if(r<uo+t*.6)return;let a=this.fq;this.troupeAt(t,r+.12,a);let o=this.fp,u=this.troupeAt(t,r,o);if(u.gone)return;c.visible=!0,c.glow=1,c.x=o.x,c.z=o.z,c.y=Xe(c.x,c.z)+o.lift;let d=a.x-o.x,f=a.z-o.z,m=Math.hypot(d,f)/.12,h=z((m-.12)/.5,0,1),g=u.th,_=Math.atan2(-c.x,fo-c.z),v=B(go,670.2,r)*.6,y=u.col>.5||u.pyr>.5?u.faceYaw:u.cont>.5||r>vo&&r<715?_:R(_,0,.15+v);if(h>.05&&(y=Ho(y,Math.atan2(d,f),h)),c.yaw=y,eo(s,r*.9+t*.37,h),u.col>.5||u.pyr>.5){this.formationPose(s,t,u,h);return}if(this.lanternArms(s,t,r,g,i),u.cont>.02)to(s,.52*u.cont*(1-h)),$a(s.armR,84,16,30,-10,u.cont),$a(s.armL,70,22,36,-10,u.cont),s.spine[0]+=26*J*u.cont;else if(r>vo&&r<709.2)to(s,.48*B(vo,707.8000000000001,r)),Y(s.armR,45,20,20,0),Y(s.armL,45,20,20,0),s.spine[0]+=25*J;else if(r>=709.2&&r<716)Y(s.armR,168,28,12,0),Y(s.armL,168,28,12,0),s.off[1]+=.25*Math.max(0,Math.sin((r-709.2)*2.4))*(1-B(710.5,712,r)),s.spine[0]-=12*J;else{let e=Math.sin(Math.PI*z(l/.55,0,1));Math.floor(i)%2==0?(s.legL[0]+=30*J*e*(1-h),s.legL[2]+=45*J*e*(1-h)):(s.legR[0]+=30*J*e*(1-h),s.legR[2]+=45*J*e*(1-h))}return}if(d===`lead`){if(!Xa(n,p.lead))return;let e=n-p.troupe.t0+uo;if(c.visible=!0,c.glow=1,e>yo){let t=this.pp;if(jo.at(e,t),e>746)return;c.x=t.x,c.z=t.z;let n=B(yo,721.1,e),r=B(Do,735.6,e)*(1-B(ko,743.8000000000001,e));c.y=R(po+.5*this.pedestal,Xe(c.x,c.z),n)+Oo*2*r;let i=z(t.speed/.6,0,1);c.yaw=i>.1?Math.atan2(t.dx,t.dz):0,eo(s,t.dist/1.3,i),r>.5?(Y(s.armL,30,118,12,0),Y(s.armR,30,118,12,0),s.head[0]-=.2):(Y(s.armL,12,34,18,0),Y(s.armR,12,34,18,0),s.head[0]-=.05);return}if(Xa(n,p.aerial))return;c.x=0,c.z=fo,c.y=po+.5*this.pedestal,c.yaw=.25*Math.sin(n*.12);let t=Math.sin(n*1.6);s.rootR[2]+=7*J*t,s.spine[2]-=10*J*t,s.spine[0]-=6*J+4*J*Math.sin(n*.8),s.off[0]+=.05*t,e>709.2&&e<716?(Y(s.armL,150,62,10,0),Y(s.armR,150,62,10,0),s.head[0]-=.4):(Y(s.armL,172,-6,48+10*Math.sin(n*.9),0),Y(s.armR,172,-6,48+10*Math.sin(n*.9+.4),0),s.head[0]-=.25),s.legL[0]+=8*J,s.legR[0]-=6*J;let r=B(mo,ho,e)*(1-B(go,_o,e));if(r>0){let t=r*B(660.2,661.4,e)*(.6+.4*Math.sin((e-661.4)*.8));c.yaw=Ho(c.yaw,2.1,r),s.rootR[2]*=1-r,s.spine[2]*=1-r,s.off[0]*=1-r,s.spine[0]-=62*J*t,s.head[0]-=.5*t,to(s,.1*t)}return}if(d===`aerialist`){let e=p.aerial;if(!Xa(n,e))return;c.visible=!0;let t=B(e.t0,e.t0+5,n)*(1-B(e.t1-5,e.t1,n));c.x=0,c.z=-6.8,c.y=R(Xe(c.x,c.z),4.1,t),c.yaw=(n-e.t0)*.7,Y(s.armL,176,4,6,0),Y(s.armR,176,4,6,0);let r=t*(.6+.4*Math.sin(n*.7));s.legL[0]+=75*J*r,s.legR[0]-=45*J*r,s.spine[0]-=10*J*r,s.head[0]-=.35*t;return}if(d===`pianist`){if(!Xa(n,p.pianist))return;c.visible=!0,c.x=0,c.z=60.25,c.y=.6,c.yaw=Math.PI,c.glow=-(Xa(n,p.tubeHi)?.5+1.4*B(p.tubeHi.t0,p.tubeHi.t0+2,n):.5),s.off[1]-=.4,s.legL[0]+=86*J,s.legR[0]+=86*J,s.legL[2]+=78*J,s.legR[2]+=78*J,s.legL[1]+=6*J,s.legR[1]+=6*J;let e=Math.sin(n*1.3);Y(s.armL,52,9+9*Math.sin(n*1.3+.8),58,-18),Y(s.armR,52,9-9*e,58,-18),s.spine[0]+=(10+5*Math.sin(n*.7))*J,s.spine[1]+=7*J*e;let t=((n-p.tubeHi.t0-1)%6.66+6.66)%6.66,r=Math.exp(-t*2);s.head[0]+=.1+.18*r,s.head[1]+=.12*e;return}if(d===`dj`){let e=!1;for(let t=0;t<p.dj.length&&!e;t++)e=Xa(n,p.dj[t]);if(!e)return;c.visible=!0,c.x=.15,c.z=at.djZ,c.y=Xe(c.x,c.z),c.yaw=0,Y(s.armL,42,12,52,-20),Y(s.armR,42,12,52,-20),Math.sin(n*.37)>.8&&Y(s.armR,160,20,20,0),s.head[0]+=.12*(.5+.5*Math.cos(l*Math.PI*2))**2,s.spine[0]+=8*J;return}if(d===`deckcam`){let e=n>p.mc.t0+4&&n<p.mc.t1-5,t=n>p.troupe.t0+6&&n<p.troupe.t1-5;if(!e&&!t)return;if(c.visible=!0,e){let e=this.pp;ro.at(n-p.mc.t0+io-1.2,e);let t=e.x>0?-1:1;c.x=e.x+t*3.2,c.z=e.z+1,c.yaw=Math.atan2(e.x-c.x,e.z-c.z),eo(s,e.dist/1.2,z(e.speed/.8,0,1))}else c.x=9.5+.8*Math.sin(n*.1),c.z=-.8,c.yaw=Math.atan2(-c.x,-2.5-c.z);c.y=Xe(c.x,c.z),Y(s.armR,100,12,112,0),Y(s.armL,70,-24,118,0),s.head[1]-=.25;return}if(d===`fohcam`){c.visible=!0,c.x=.8,c.z=89.6,c.y=.5,c.yaw=Math.PI,Y(s.armR,58,12,62,0),Y(s.armL,50,-6,72,0),s.spine[1]+=.08*Math.sin(n*.05),s.spine[0]+=12*J,s.head[0]+=.15;return}if(d===`pilot`){c.visible=!0,c.x=-2.6,c.z=90.4,c.y=.5,c.yaw=Math.PI+.35,Y(s.armL,42,-24,102,0),Y(s.armR,42,-24,102,0);let e=Math.sin(n*.07+1);s.head[0]=e>.2?-.45:.35,this.idle(s,r,f);return}if(d===`photog`){if(n<378||n>422)return;c.visible=!0,c.x=-20+1.5*B(378,382,n),c.z=3.4,c.y=0,c.yaw=Math.PI-.25,to(s,.46),s.spine[0]+=20*J,Y(s.armR,100,10,120,0),Y(s.armL,88,-22,125,0),s.head[0]-=.2;return}if(d===`walker`){if(n<529||n>549)return;c.visible=!0;let e=z((n-530)/18,0,1);c.x=R(15.5,.5,e),c.z=R(9.5,28.5,e),c.y=0,c.yaw=Math.atan2(-15,19),eo(s,(n-529)*.95,1),s.head[0]-=o*.5;return}if(d.startsWith(`safety`)){let t=e.k,i=t%2==0?-1:1,a=t>>1;c.visible=!0,a===0?(c.x=i*97.5,c.z=62):a===1?(c.x=i*49,c.z=1.2):(c.x=i*23.6,c.z=39.6),c.y=a===2?.4:this.heightAt(c.x,c.z),c.yaw=a===1?Math.atan2(-i,-1):Math.atan2(-c.x*.4,-c.z-8),Math.sin(n*.11+t*1.3)>.75?Y(s.armR,32,-6,145,0):Y(s.armR,22,-14,110,0),Y(s.armL,24,-16,108,0),s.head[0]-=o*(.4+.1*a),this.idle(s,r,f);return}if(d===`terrace`){c.visible=!0,c.x=.6,c.z=168.5,c.y=this.heightAt(.6,168.5)>4?this.heightAt(.6,168.5):5,c.yaw=Math.PI,Y(s.armR,60,10,70,0),Y(s.armL,55,-8,80,0),s.spine[0]+=14*J;return}if(d.startsWith(`security`)){let t=e.k;c.visible=!0,c.x=-40+80*t/9,c.z=1.9,c.y=this.heightAt(c.x,c.z),c.yaw=.1*Math.sin(n*.13+t),t%2==0?(Y(s.armL,28,-14,112,0),Y(s.armR,24,-16,120,0)):(Y(s.armL,-12,14,60,0),Y(s.armR,-12,14,60,0)),s.head[1]+=.5*Math.sin(n*.17+t*2.1),this.idle(s,r,f);return}}troupeAt(e,t,n){let r=this.ph,i=uo+e*.6,a=.1*Math.sin((t-i)*.21+e)*(t<700||t>716?1:.2),o=(-14+208*e/9)*Math.PI/180+a,s=B(i,i+7,t),c=R(Math.cos(o)>=0?2.1:-2.1,3.6*Math.cos(o),s),l=R(-7.5,-4.9+1.9*Math.sin(o),s),u=B(mo+.05*e,ho,t)*(1-B(go,_o,t));if(u>0){let t=(-12+204*e/9)*Math.PI/180;c=R(c,1.95*Math.cos(t),u),l=R(l,fo+1.75*Math.sin(t),u)}let d=B(bo+.08*e,xo,t),f=0;if(d>0){let n,r;if(e%2==0){let i=e>>1,a=this.lp;jo.at(t,a),n=a.x+(i%2==0?-.07:.07),r=a.z-.62*(i+1)}else{let t=e>>1;n=(t%2==0?-1:1)*(3.3+.6*(t>>1)),r=-2.3-.7*(t>>1),f=Math.atan2(-n,-1.5-r)}c=R(c,n,d),l=R(l,r,d)}let p=B(Eo+.25*e,733.4+.1*e,t),m=0;if(p>0){let n=Mo[e];c=R(c,n[0],p),l=R(l,n[1],p),n[2]>0&&(m=Oo*B(733.4,734.4,t)*(1-B(ko,743.6,t))),f=n[3]}let h=B(ko+.3*e,745.2+.3*e,t);return h>0&&(c=R(c,0,h),l=R(l,Ao,h)),n.x=c,n.z=l,n.lift=m,r.th=o,r.cont=u,r.col=d*(1-p),r.pyr=p,r.faceYaw=f,r.gone=h>.97,r}lanternArms(e,t,n,r,i){let a=0;for(;a<Po.length-1&&n>=Po[a+1][0];)a++;let o=a>0?B(Po[a][0],Po[a][0]+.5,n):1,s=this.armA,c=this.armB;if(o<1){this.phraseArms(Po[a-1][1],t,n,r,i,s),this.phraseArms(Po[a][1],t,n,r,i,c);for(let e=0;e<9;e++)s[e]+=(c[e]-s[e])*o}else this.phraseArms(Po[a][1],t,n,r,i,s);Y(e.armL,s[0],s[1],s[2],s[3]),Y(e.armR,s[4],s[5],s[6],s[7]),e.spine[0]+=s[8]*J}phraseArms(e,t,n,r,i,a){let o=((n/3.75-r/Math.PI)%1+1)%1,s=B(0,.12,o)*(1-B(.3,.42,o)),c=t%2==0?4:0,l=Math.sin(i*Math.PI+t*.7);if(a[8]=0,e===No.RITUAL)Bo(a,0,Fo),Bo(a,4,Fo),a[1]+=6*l,a[5]-=6*l,Vo(a,c,Io,s),a[8]=8;else if(e===No.DANCE)Bo(a,0,Lo),Bo(a,4,Lo),a[1]+=22*l,a[5]-=22*l,a[0]+=10*l,a[4]-=10*l,Vo(a,c,Io,s);else if(e===No.CRADLE)Bo(a,0,Fo),Bo(a,4,Fo),a[0]+=4+3*l,a[4]+=4+3*l,a[8]=10;else if(e===No.SPREAD)Bo(a,0,zo),Bo(a,4,zo),a[0]+=6*l,a[4]-=6*l;else if(e===No.HIGH){Bo(a,0,Io),Bo(a,4,Lo);let e=.5+.5*Math.sin(i/2*Math.PI+t);for(let t=0;t<4;t++){let n=a[t],r=a[4+t];a[t]=n+(r-n)*e,a[4+t]=r+(n-r)*e}a[8]=-6}else Bo(a,0,Ro),Bo(a,4,Ro),a[1]+=16*l,a[5]-=16*l,a[0]+=14*Math.max(0,l),a[4]+=14*Math.max(0,-l),a[8]=12}formationPose(e,t,n,r){if(n.pyr>.5){let n=Mo[t][2];n===0?(Y(e.armL,160,16,40,0),Y(e.armR,160,16,40,0),e.legL[1]+=6*J,e.legR[1]+=6*J):n===1?(Y(e.armL,25,100,10,0),Y(e.armR,25,100,10,0)):(to(e,.45*(1-r)),Y(e.armL,140,22,18,0),Y(e.armR,128,26,18,0),e.spine[0]-=8*J);return}if(t%2==0){let n=38+24*(t>>1);Y(e.armL,12,n,12,0),Y(e.armR,12,n,12,0)}else to(e,.45*(1-r)),Y(e.armL,120,20,22,0),Y(e.armR,120,20,22,0)}idle(e,t,n){e.rootR[2]+=1.5*J*Math.sin(t*.6+n),e.head[1]+=.25*Math.sin(t*.21+n)}write(e,t,n,r){let i=e*4;this.iPos[i]=r.x,this.iPos[i+1]=r.y,this.iPos[i+2]=r.z,this.iPos[i+3]=r.yaw,this.iAttr[i]=r.visible?t.height:0,this.iAttr[i+1]=t.build,this.iAttr[i+2]=t.seed,this.iAttr[i+3]=r.glow;let a=this.iP;a[0][i]=n.off[0],a[0][i+1]=n.off[1],a[0][i+2]=n.off[2],a[0][i+3]=n.cape,a[1][i]=n.rootR[0],a[1][i+1]=n.rootR[1],a[1][i+2]=n.rootR[2],a[1][i+3]=n.head[0],a[2][i]=n.spine[0],a[2][i+1]=n.spine[1],a[2][i+2]=n.spine[2],a[2][i+3]=n.head[1],a[3].set(n.armL,i),a[4].set(n.armR,i),a[5][i]=n.legL[0],a[5][i+1]=n.legL[1],a[5][i+2]=n.legL[2],a[5][i+3]=n.legR[0],a[6][i]=n.legR[1],a[6][i+1]=n.legR[2],a[6][i+2]=n.shoW,a[6][i+3]=n.hipW}};function qo(e,t,n=0,r=0){let i=e.index?e.toNonIndexed():e;i!==e&&e.dispose(),i.deleteAttribute(`uv`);let a=i.getAttribute(`position`).count,o=new I(t),s=new Float32Array(a*3),c=new Float32Array(a*2);for(let e=0;e<a;e++)s[e*3]=o.r,s[e*3+1]=o.g,s[e*3+2]=o.b,c[e*2]=n,c[e*2+1]=r;return i.setAttribute(`color`,new j(s,3)),i.setAttribute(`aProp`,new j(c,2)),i}function Jo(e,t,n,r,i,a,o=0){let s=new me(e,t,n);return o&&s.rotateY(o),s.translate(r,i,a),s}function Yo(e,t,n,r,i,a,o=10){let s=new A(t,e,n,o);return s.translate(r,i+n/2,a),s}function Xo(e,t,n,r=5){let i=e.distanceTo(t),a=new A(n,n,i,r,1,!0),o=new F().setFromUnitVectors(new u(0,1,0),t.clone().sub(e).normalize());a.applyQuaternion(o);let s=e.clone().add(t).multiplyScalar(.5);return a.translate(s.x,s.y,s.z),a}var Zo=(e,t,n)=>new u(e,t,n);function Qo(){let e=new r,t=1.5;return e.moveTo(-1.5/2,0),e.lineTo(t/2,0),e.lineTo(t/2,-.55),e.bezierCurveTo(t/2,-1.15,t*.05,-1.05,-.05,-1.65),e.bezierCurveTo(-.15,-1.92,-1.5/2,-1.9,-1.5/2,-1.9+.3),e.lineTo(-1.5/2,0),e}function $o(e,t,n,r,i){let a=[],o=Zo(e,t+r,n);for(let r=0;r<3;r++){let i=r/3*Math.PI*2+.3;a.push(qo(Xo(o,Zo(e+Math.cos(i)*.42,t,n+Math.sin(i)*.42),.014),`#1b1b1d`))}a.push(qo(Jo(.2,.2,.36,e,t+r+.14,n,i),`#111113`));let s=new A(.06,.07,.2,10);return s.rotateX(Math.PI/2),s.rotateY(i),s.translate(e+Math.sin(i)*.25,t+r+.15,n+Math.cos(i)*.25),a.push(qo(s,`#0b0b0c`)),a}function es(){let e=[];e.push(qo(Jo(5.6,.6,4,0,.3,59),`#141416`)),e.push(qo(Jo(5.64,.02,4.04,0,.61,59),`#1d1d20`));let t=`#7d8086`,n=[[-2.75,61],[-2.75,57.05],[2.75,57.05],[2.75,61]];for(let r=0;r<n.length-1;r++){let[i,a]=n[r],[o,s]=n[r+1];e.push(qo(Xo(Zo(i,1.7,a),Zo(o,1.7,s),.022,6),t)),e.push(qo(Xo(Zo(i,1.15,a),Zo(o,1.15,s),.016,6),t));let c=Math.max(2,Math.round(Math.hypot(o-i,s-a)/1.3));for(let n=0;n<=c;n++){let r=i+(o-i)*n/c,l=a+(s-a)*n/c;e.push(qo(Xo(Zo(r,.6,l),Zo(r,1.7,l),.02,5),t))}}e.push(qo(Jo(1.6,.2,.35,0,.1,61.2),`#1a1a1c`)),e.push(qo(Jo(1.6,.2,.35,0,.3,61),`#1a1a1c`));let r=`#efede6`,i=new u(0,.6,59.95),a=new _(Qo(),{depth:.3,bevelEnabled:!1,curveSegments:10});a.rotateX(Math.PI/2),a.translate(i.x,i.y+1,i.z),e.push(qo(a,r));let o=new _e(Qo(),10);o.rotateX(-Math.PI/2),o.scale(.9,1,-.9),o.translate(i.x,i.y+.985,i.z-.08),e.push(qo(o,`#6b5a3a`)),e.push(qo(Jo(1.46,.08,.28,i.x,i.y+.7,i.z+.12),r)),e.push(qo(Jo(1.3,.025,.16,i.x,i.y+.755,i.z+.14),`#f6f3ea`));for(let t=0;t<35;t++){if(![0,1,3,4,5].includes(t%7))continue;let n=i.x-.63+(t+1)*.036;e.push(qo(Jo(.016,.022,.09,n,i.y+.775,i.z+.11),`#0c0c0c`))}e.push(qo(Jo(1.5,.12,.08,i.x,i.y+.82,i.z+.01),r));for(let[t,n]of[[-.66,-.12],[.66,-.12],[.02,-1.55]])e.push(qo(Yo(.055,.075,.72,i.x+t,i.y,i.z+n,8),r));e.push(qo(Jo(.18,.62,.05,i.x,i.y+.05,i.z-.2),r)),e.push(qo(Jo(.3,.04,.12,i.x,i.y+.06,i.z-.14),`#c9a45c`)),e.push(qo(Jo(.8,.07,.36,i.x,i.y+.5,i.z+.52),`#101012`));for(let t of[-.34,.34])for(let n of[.38,.66])e.push(qo(Jo(.04,.48,.04,i.x+t,i.y+.24,i.z+n),`#101012`));e.push(qo(Yo(.035,.035,.1,.12,1.55,58.75,10),`#303036`)),e.push(qo(Yo(.045,.045,.72,.12,1.62,58.75,12),`#ffffff`,1,14)),e.push(qo(Yo(.66,.6,1,0,2.2,-5.3,24),`#5f5d62`,2)),e.push(qo(Yo(.62,.62,.02,0,3.2,-5.3,24),`#a08a5c`,2)),e.push(qo(Jo(.05,2,.012,0,6.2,-6.8),`#b01a22`,3)),e.push(...$o(.8,.5,88.95,1.45,Math.PI)),e.push(...$o(.6,5,167.95,1.35,Math.PI));let s=pe(e,!1);for(let t of e)t.dispose();if(!s)throw Error(`crowd props: merge failed`);return s.computeBoundingSphere(),s}var ts=1.4,ns=1,rs=e=>e.toFixed(4),is=`
#define LAN_AX ${rs(ri.ax)}
#define LAN_AY ${rs(ri.ay)}
#define LAN_AZ ${rs(ri.az)}
#define LAN_DROP ${rs(ri.drop)}
#define LAN_W ${rs(ri.w)}
#define LAN_H ${rs(ri.h)}
#define LAN_D ${rs(ri.d)}
`,as=`
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
#define S_HAIRCAP 12

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
  float furl;   // flag lowered + furled (viewer right next to the carrier)
};

Pose restPose() {
  Pose Q;
  Q.off = vec3(0.0); Q.rootR = vec3(0.0); Q.spine = vec3(0.0); Q.head = vec2(0.0);
  Q.armL = vec4(0.0); Q.armR = vec4(0.0); Q.legL = vec3(0.0); Q.legR = vec3(0.0);
  Q.cape = 0.12; Q.phone = 0.0; Q.light = 0.0; Q.flagTilt = vec2(0.0); Q.flag = 0.0;
  Q.frame = 0.0; Q.squash = 1.0; Q.push = vec2(0.0); Q.walkYaw = 0.0; Q.shoW = 1.0; Q.hipW = 1.0; Q.furl = 0.0;
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

/**
 * Near-lens fade (1 visible … 0 gone): a person whose body axis (feet to raised hands, ~2.2 m) passes
 * within r1 m of the lens and who is in front of the camera dissolves (gone inside r0), so walking
 * through the Tribe, a low show camera or a teleport never fills the frame with a head. The crowd uses
 * a tight band (CROWD_FADE: gone inside 0.5 m, whole from 0.74 m) that the player / camera push keeps
 * everyone out of (nearest bodies ≥ 0.8 m / 0.75 m), so the packed rows around the viewer are never a
 * stippled ghost; the performers keep the wider 0.9–1.3 m band. CrowdSystem routes everyone within
 * ~2.4 m of the camera to the dithered 'crowd-fade' draw, which evaluates this per instance.
 */
${is}
#define CROWD_FADE vec2(0.5, 0.74)
#define PERF_FADE vec2(0.9, 1.3)
float lensFade(vec3 feet, float h, vec2 band) {
  float top = feet.y + 2.2 * h / 1.75;
  vec3 cp = vec3(feet.x, clamp(cameraPosition.y, feet.y, top), feet.z);
  float da = distance(cameraPosition, cp);
  if (da > band.y + 0.05) return 1.0;
  vec3 vc = (viewMatrix * vec4(cp, 1.0)).xyz;
  float inView = smoothstep(-0.25, 0.3, -vc.z / max(length(vc), 1e-3));
  return mix(1.0, smoothstep(band.x, band.y, da), inView);
}

/** the fist a hand lantern hangs from, posed (person-local, unscaled) */
vec3 lanternAnchor(bool left, Pose Q) {
  vec3 nn = vec3(0.0, 1.0, 0.0);
  return skinPt(left ? B_HAND_L : B_HAND_R, vec3(LAN_AX * (left ? 1.0 : -1.0), LAN_AY, LAN_AZ), nn, Q);
}

/**
 * A rest-pose lantern point, hanging plumb below the posed fist whatever the arm does (a lantern on its
 * bail), facing where the body faces and swinging / turning a little on its bail (show time: seek-safe).
 */
vec3 lanternPt(bool left, vec3 p, inout vec3 n, Pose Q, float seed) {
  vec3 A = vec3(LAN_AX * (left ? 1.0 : -1.0), LAN_AY, LAN_AZ);
  float ph = hh(seed, left ? 41.0 : 42.0) * TAU;
  float t = uClock.x;
  mat3 R = rY(Q.rootR.y + Q.spine.y + 0.12 * sin(0.7 * t + ph)) * rX(0.14 * sin(1.9 * t + ph)) * rZ(0.1 * sin(1.3 * t + 1.3 * ph));
  n = R * n;
  return lanternAnchor(left, Q) + R * (p - A);
}
`,os=`
  if (vFade < 0.999) {
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    if (ign >= vFade) discard;
  }
`,ss=`
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

  // personal beat: each person moves to the kick they HEAR, distance / 343 s after the stage (delay towers
  // are time-aligned to the main PA wavefront, so d / 343 holds; the listener hears the music with the same
  // delay), plus a short reaction spread; coherent 10 m clusters
  float bpm = max(uBeat.y, 60.0);
  float bps = bpm / 60.0;
  float dist = length(P.pos.xz - vec2(0.0, -6.0));
  float delay = dist / 343.0 + 0.03 * hh(sd, 11.0);
  float jit = (vnoise(P.pos.xz * 0.11) - 0.5) * 0.12;
  float b = uBeat.x - delay * bps - jit;
  float bp = fract(b);
  // some people move in halfT time (every 2nd kick, bigger), most on every kick
  float halfT = step(0.72, hh(sd, 26.0));
  float b2 = b * 0.5;
  float bpH = mix(bp, fract(b2), halfT);
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
  // packed pit / front floor (~0.5 m apart): raised arms go up steeper and closer to the body so
  // forearms do not pass through the neighbours' heads (hugs keep their reach)
  if (zone <= 1) {
    float tight = mix(1.0, zone == 0 ? 0.5 : 0.7, 1.0 - wHu);
    aL.y *= tight; aR.y *= tight;
    float rl = smoothstep(95.0 * D2R, 125.0 * D2R, aL.x) * (1.0 - wHu);
    float rr = smoothstep(95.0 * D2R, 125.0 * D2R, aR.x) * (1.0 - wHu);
    aL.x = mix(aL.x, max(aL.x, 142.0 * D2R), rl); aL.z = mix(aL.z, min(aL.z, 70.0 * D2R), rl);
    aR.x = mix(aR.x, max(aR.x, 142.0 * D2R), rr); aR.z = mix(aR.z, min(aR.z, 70.0 * D2R), rr);
  }

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
  float s = clamp((bpH - 0.1 * (1.0 - halfT) - 0.05 * halfT) / mix(0.78, 0.6, halfT), 0.0, 1.0);
  float hop = 4.0 * s * (1.0 - s);
  float hj = (0.12 + 0.17 * e) * inten * (zone == 0 ? 1.25 : 1.0) * (1.0 + 0.5 * halfT);
  lift += wJ * hj * hop;
  drop += wJ * 0.09 * (1.0 - smoothstep(0.0, 0.14, bpH));
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
  // hakken: fast heel kicks on the halfT beats
  float hb2 = fract(b * 2.0);
  float wh = mod(floor(b * 2.0), 2.0);
  float kk = sin(PI * hb2);
  vec3 hk = vec3(26.0, 0.0, 10.0) * D2R * kk * wK;
  if (wh < 0.5) xL += hk; else xR += hk;
  drop += wK * 0.035 * (1.0 - kk);
  twist += wK * 9.0 * D2R * (wh * 2.0 - 1.0) * kk;
  // hardstyle bounce: lowest on the kick
  float bnc = (0.5 + 0.5 * cos(TAU * bpH)) * kickOn + (1.0 - kickOn) * (0.5 + 0.5 * sin(TAU * st * 0.5 + ph)) * 0.4;
  drop += wB * (0.035 + 0.05 * e) * inten * bnc;
  lean += wB * 4.0 * D2R * bnc;
  headP += wB * 7.0 * D2R * bnc;
  // crouch before the drop; sit down on the ground for the piano (knees up, arms around them)
  drop += wCr * 0.5;
  lean += wCr * 36.0 * D2R - wSi * 10.0 * D2R;
  headP -= wCr * 22.0 * D2R - wSi * 6.0 * D2R;
  vec4 knees = AR(40.0, 14.0, 66.0, 0.0);
  aL = mix(aL, knees, wCr);
  aR = mix(aR, knees, wCr);
  aL = mix(aL, AR(58.0, 8.0, 58.0 + 10.0 * hh(sd, 34.0), 0.0), wSi * (1.0 - wPh));
  aR = mix(aR, AR(56.0, 8.0, 62.0, 0.0), wSi * (1.0 - wPh));
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
    // a viewer right next to the carrier: the flag is lowered away from them and furled
    vec2 vPl = uPlayer.xz - P.pos.xz;
    vec2 vCm = cameraPosition.xz - P.pos.xz;
    float nPl = uPlayer.w > 0.5 ? smoothstep(4.2, 2.4, length(vPl)) : 0.0;
    float nCm = smoothstep(4.2, 2.4, length(vCm)) * step(cameraPosition.y, P.pos.y + 5.0);
    vec2 vv = nCm > nPl ? vCm : vPl;
    float furl = max(nPl, nCm);
    fw *= 1.0 - furl;
    float fph = TAU * st * (0.55 + 0.35 * hh(sd, 15.0)) + ph;
    float sf = sin(fph);
    aR = mix(AR(66.0, 10.0, 78.0, -25.0), AR(150.0 + 10.0 * sf, 16.0 + 12.0 * sf, 22.0, -18.0), fw);
    aL = mix(AR(52.0, -8.0, 92.0, 0.0), AR(118.0, -2.0, 58.0, 0.0), fw);
    Q.flagTilt = vec2(0.42 * sf, 0.26 * sin(2.0 * fph)) * fw + vec2(0.05, -0.08) * (1.0 - fw);
    float cy = cos(P.yaw), sy = sin(P.yaw);
    vec2 lv = vec2(cy * vv.x - sy * vv.y, sy * vv.x + cy * vv.y);
    Q.flagTilt = mix(Q.flagTilt, -normalize(lv + vec2(1e-4, 0.0)) * 1.05, furl);
    Q.spine.z += 5.0 * D2R * sf * fw;
    Q.flag = fw;
    Q.furl = furl;
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

  // make room for the player (a packed-crowd bubble, not a clearing): everyone within 1.6 m is eased out
  // to 0.8–1.6 m (monotonic, no crossing), i.e. just outside the near-lens fade band (CROWD_FADE, whole
  // from 0.74 m): the nearest ring is solid bodies, never a stippled ghost; a few glance at the viewer
  vec2 dpl = P.pos.xz + Q.push - uPlayer.xz;
  float rpl = length(dpl);
  if (uPlayer.w > 0.5 && rpl < 1.6) {
    float rn = rpl + (1.6 - rpl) * (1.6 - rpl) * 0.3125;
    Q.push += (rpl > 1e-3 ? dpl / rpl : vec2(1.0, 0.0)) * (rn - rpl);
  }
  // a low free / drone camera: the same bubble (≥ 0.75 m) around the lens
  vec2 dcm = P.pos.xz + Q.push - uCamPush.xy;
  float rcm = length(dcm);
  if (uCamPush.w > 0.01 && rcm < 1.5) {
    float rn = rcm + (1.5 - rcm) * (1.5 - rcm) * 0.3333;
    Q.push += (rcm > 1e-3 ? dcm / rcm : vec2(1.0, 0.0)) * (rn - rcm) * uCamPush.w;
  }
  if (uPlayer.w > 0.5 && rpl < 2.2 && hh(sd, 33.0) < 0.22) {
    vec2 fwd = vec2(sin(P.yaw), cos(P.yaw));
    vec2 to = -dpl / max(rpl, 1e-3);
    float ang = atan(fwd.x * to.y - fwd.y * to.x, dot(fwd, to));
    float glance = smoothstep(0.55, 1.0, sin(st * 0.37 + ph));
    headY += clamp(-ang, -1.0, 1.0) * 0.6 * smoothstep(2.2, 1.0, rpl) * glance;
  }
  // look up at fireworks
  headP -= moodv(M_LOOKUP) * (0.22 + 0.28 * hh(sd, 16.0));
  headP += headDown * wId;

  // legs: keep the feet planted when the pelvis drops (2-bone IK, equal segment lengths)
  float a = acos(clamp(1.0 - drop / 0.86, -1.0, 1.0));
  Q.legL = vec3(a, 0.0, 2.0 * a) + xL;
  Q.legR = vec3(a, 0.0, 2.0 * a) + xR;
  Q.legL.y += 3.0 * D2R; Q.legR.y += 3.0 * D2R;
  // seated on the ground: hip joint ~0.16 m up, thighs rising forward, shins down to the feet
  Q.legL = mix(Q.legL, vec3(128.0, 17.0, 130.0) * D2R, wSi);
  Q.legR = mix(Q.legR, vec3(124.0, 15.0, 126.0) * D2R, wSi);
  drop = mix(drop, 0.79, wSi);
  lift *= 1.0 - wSi;
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
`,cs=`
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
  vec3 skin = uPal[L.x & 7] * 0.72; // palette swatches are sRGB picks; skin reflects ~35-50 %
  bool costume = ((L.y >> 14) & 1) == 1;
  bool shirtless = ((L.y >> 7) & 1) == 1;
  bool tank = ((L.y >> 8) & 1) == 1;
  // night: dyed cotton reflects less than the palette swatch (neons do not glow without UV)
  vec3 top = shirtless ? skin : uPal[16 + (L.y & 15)] * 0.78;
  vec3 bot = uPal[32 + ((L.y >> 9) & 7)] * 0.85;
  if (costume) { top = uPal[56 + ((L.y >> 15) & 3)] * 0.8; bot = top; }
  // the MC (the mic owner): a dark navy shirt (v411, v440, v500)
  if (((L.z >> 8) & 4) != 0) top = vec3(0.02, 0.028, 0.065);
  int print = (L.y >> 4) & 7;
  // (the MC — the mic owner — wears a black cap with a white brim, v411 / v500)
  if (slot == S_CAP && ((L.z >> 8) & 4) != 0 && lp.z > 0.105 && lp.y < 1.692) return vec3(0.78);
  if (slot == S_CAP || slot == S_HAT) return uPal[40 + ((L.x >> 12) & 7)] * (lp.y > 1.676 && lp.y < 1.69 && slot == S_HAT ? 0.7 : 0.9);
  if (slot == S_HAIR || slot == S_PONY || slot == S_HAIRCAP) return uPal[8 + ((L.x >> 3) & 7)];
  if (slot == S_BANDANA) return mix(uPal[60], uPal[63], step(0.5, fract(lp.x * 40.0 + lp.y * 25.0)) * 0.7);
  if (slot == S_LANTERN_L || slot == S_LANTERN_R) return vec3(0.9, 0.8, 0.6);
  if (slot == S_MIC) return lp.x > -0.07 ? vec3(0.07) : vec3(0.02); // grille, black handle
  if (slot == S_CAMERA || slot == S_CTRL) return vec3(0.025);
  vec3 c = skin;
  if (bone == B_HEAD) {
    int hs = (L.x >> 6) & 3;
    vec3 hair = uPal[8 + ((L.x >> 3) & 7)];
    // painted hairline = the hair-cap shell's hairline (geometry.ts hairline()): forehead 1.705,
    // temples 1.665, above the ears 1.628, nape 1.556 (a buzz cut sits a little higher)
    float k = abs(atan(lp.x, lp.z - 0.012)) / PI;
    float hl = k < 0.38 ? 1.705 - 0.04 * k / 0.38 : (k < 0.62 ? 1.665 - 0.037 * (k - 0.38) / 0.24 : 1.628 - 0.072 * (k - 0.62) / 0.38);
    if (hs == 3) hl += 0.008;
    bool isHair = lp.y > hl - 0.003 || (hs == 1 && lp.z < -0.035 && lp.y > 1.5);
    if (isHair && lp.y > 1.52) c = hair;
    // face: eyes, brows, mouth, beards, festival sunglasses (front hemisphere only)
    if (lp.z > 0.035 && !isHair) {
      float ax = abs(lp.x);
      // soft eye sockets, almond eyes (dark iris / lash line), brows, lips
      vec2 e = vec2(ax - 0.03, lp.y - 1.652);
      float socket = 1.0 - smoothstep(0.012, 0.024, length(e * vec2(0.85, 1.4)));
      float eye = 1.0 - smoothstep(0.0085, 0.0115, length(e * vec2(1.0, 2.4)));
      float brow = (1.0 - smoothstep(0.0025, 0.005, abs(lp.y - 1.671 + 0.004 * (ax - 0.03) / 0.02))) * (1.0 - smoothstep(0.016, 0.021, abs(ax - 0.031)));
      float mouth = (1.0 - smoothstep(0.0022, 0.0045, abs(lp.y - 1.597))) * (1.0 - smoothstep(0.017, 0.022, ax));
      float lip = (1.0 - smoothstep(0.004, 0.008, abs(lp.y - 1.592))) * (1.0 - smoothstep(0.014, 0.02, ax));
      c = mix(c, c * 0.78, socket);
      c = mix(c, c * 0.18, eye * 0.9);
      c = mix(c, hair * 0.9, brow * 0.75);
      c = mix(c, c * vec3(0.85, 0.62, 0.62), lip * 0.6);
      c = mix(c, c * 0.4, mouth);
      if (((L.x >> 19) & 1) == 1) {
        // beard: full on chin / jaw, stubble on the cheeks, moustache above the lip
        float jaw = smoothstep(1.62, 1.6, lp.y) * smoothstep(1.535, 1.55, lp.y);
        float moust = (1.0 - smoothstep(0.004, 0.007, abs(lp.y - 1.607))) * (1.0 - smoothstep(0.022, 0.028, ax));
        float full = step(0.55, fract(float(L.x) * 0.0137));
        float amt = max(jaw * mix(0.45, 0.8, full) * (1.0 - lip * 0.8), moust * mix(0.4, 0.75, full));
        c = mix(c, hair * 0.85, amt);
      }
      if (((L.x >> 18) & 1) == 1 && abs(lp.y - 1.652) < 0.017 && ax < 0.058) c = vec3(0.012);
    }
    if (costume && ((L.y >> 15) & 3) == 0) c = top; // morph suit
  } else if (bone == B_SPINE) {
    c = top;
    if (!shirtless && !costume) {
      // ribbed collar + shoulder seams
      if (lp.y > 1.452) c *= 0.72;
      if (abs(abs(lp.x) - 0.15) < 0.006 && lp.y > 1.36) c *= 0.8;
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
    // T-shirt hem, waistband
    if (!shirtless && !costume && lp.y > 1.02 && lp.y < 1.036) c *= 0.7;
    if (lp.y <= 1.02 && lp.y > 0.99) c *= 0.62;
  } else if (bone == B_UARM_L || bone == B_UARM_R) {
    c = (!shirtless && !tank && lp.y > 1.27) || costume ? top : skin;
    if (!shirtless && !tank && !costume && lp.y > 1.27 && lp.y < 1.29) c *= 0.7;
  } else if (bone == B_FARM_L || bone == B_FARM_R || bone == B_HAND_L || bone == B_HAND_R) {
    c = costume ? top : skin;
    if (((L.x >> 17) & 1) == 1 && lp.y < 0.915 && lp.y > 0.885) c = uPal[61];
  } else if (bone == B_THIGH_L || bone == B_THIGH_R) {
    c = bot;
  } else if (bone == B_FOOT_L || bone == B_FOOT_R) {
    c = uPal[48 + ((L.x >> 15) & 3)];
    if (lp.y < 0.02) c = mix(c, vec3(0.62), 0.7);      // sole
    if (lp.y > 0.07 && lp.z > 0.02 && lp.z < 0.1) c *= 0.75; // laces / tongue
  } else if (bone == B_SHIN_L || bone == B_SHIN_R) {
    bool lng = ((L.y >> 12) & 1) == 1 || costume;
    c = (lng || lp.y > 0.5) ? bot : skin;
    if (!lng && lp.y > 0.5 && lp.y < 0.525) c *= 0.72; // shorts hem
    if (((L.y >> 13) & 1) == 1 && lp.y < 0.2 && !lng) c = vec3(0.8);
    if (lp.y < 0.105) c = uPal[48 + ((L.x >> 15) & 3)];
  }
  return c;
}

bool slotVisible(int slot, ivec4 L) {
  if (slot == S_BODY) return true;
  int hw = (L.x >> 9) & 7;
  int hs = (L.x >> 6) & 3;
  if (slot == S_HAIRCAP) return hs != 3 && (hw == 0 || hw == 4) && ((L.y >> 14) & 1) == 0;
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
`,ls=`
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
uniform vec3 uHazeAmb;   // lit haze over the field scatters the show colour from above / the front
uniform float uLumCap;   // crowd luminance ceiling (a fraction of the lit set's brightness)

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
  return 0.05 + 1.3 * s;
}

vec3 stageLight(vec3 wp, vec3 N) {
  vec3 Ls = uStagePos - wp;
  float ds = length(Ls);
  Ls /= ds;
  float att = 1.0 / (1.0 + ds * ds / 14400.0);
  float ndl = max(dot(N, Ls), 0.0);
  // strobes / blinders on the set face the audience: front-facing surfaces only
  return (uStageCol * (ndl + 0.01) + vec3(uStrobe * 1.5) * ndl) * att;
}

vec3 envLight(vec3 wp, vec3 N) {
  vec3 c = stageLight(wp, N);
  // sky dome: shoulders / heads catch it, flanks and backs are shadowed by the packed neighbours
  c += mix(uSkyLow, uSkyUp, N.y * 0.5 + 0.5) * (0.4 + 0.6 * max(N.y, 0.0));
  // haze scatter: from above and from the stage side; surfaces facing away get ~8 %
  vec3 Lh = normalize(vec3(-wp.x * 0.003, 0.0, -1.0));
  float hzW = 0.07 + 0.42 * max(N.y, 0.0) + 0.3 * max(dot(N, Lh), 0.0);
  c += uHazeAmb * hzW / (1.0 + max(0.0, wp.z - 20.0) / 160.0);
  c += uTwilight * max(dot(N, normalize(vec3(0.12, 0.3, 1.0))), 0.0);
  c += uMoonCol * max(dot(N, uMoonDir), 0.0);
  vec3 Lf = uFlashPos - wp;
  float df = length(Lf);
  c += uFlashCol * max(dot(N, Lf / df), 0.0) / (1.0 + df * df / 3600.0);
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
  float fres = pow(1.0 - nv, 3.0);
  float back = clamp(dot(Ls, -V) * 0.8 + 0.25, 0.0, 1.0);
  float side = clamp(dot(N, Ls) * 0.7 + 0.45, 0.0, 1.0);
  vec3 rim = (uRimCol + vec3(uStrobe * 1.1)) * att * back * side;
  vec3 Lf = normalize(uFlashPos - wp);
  rim += uFlashCol * 0.3 * clamp(dot(Lf, -V) * 0.8 + 0.2, 0.0, 1.0) * clamp(dot(N, Lf) * 0.7 + 0.45, 0.0, 1.0);
  return rim * fres;
}

/** soft luminance ceiling: dark values untouched, highlights roll off towards cap */
vec3 crowdTone(vec3 c, float cap) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  const float k = 0.12;
  if (l <= k) return c;
  float x = l - k;
  float lo = k + x / (1.0 + x / max(cap - k, 0.02));
  return c * (lo / l);
}
`,us=`#include <fog_pars_vertex>`,ds=`#include <fog_pars_fragment>`;function fs(e,t=!1){let n=e===`performer`,r=e===`mid`,i=t&&!r;return`
${as}
${n?``:ss}
${cs}
${ls}
${us}
attribute float aBone;
${n?`attribute vec4 iPos; attribute vec4 iAttr; attribute vec4 iLook;
attribute vec4 iP0; attribute vec4 iP1; attribute vec4 iP2; attribute vec4 iP3; attribute vec4 iP4; attribute vec4 iP5; attribute vec4 iP6;`:`attribute float aIdx;`}
${r?`varying vec3 vCol;`:`varying vec3 vN; varying vec3 vW; varying vec3 vLocal; flat varying ivec4 vLook; flat varying int vBone; flat varying int vSlot;`}
${n?`varying float vGlow; varying float vKey; varying vec3 vLanL; varying vec3 vLanR; varying vec2 vLanOn;`:``}
${i?`varying float vFade;`:``}

void main() {
${n?`  Person P;
  P.pos = iPos.xyz; P.yaw = iPos.w; P.h = iAttr.x; P.build = iAttr.y; P.seed = iAttr.z; P.zone = 0.0;
  P.look = ivec4(iLook + 0.5);
  Pose Q = restPose();
  Q.off = iP0.xyz; Q.cape = iP0.w; Q.rootR = iP1.xyz; Q.head.x = iP1.w; Q.spine = iP2.xyz; Q.head.y = iP2.w;
  Q.armL = iP3; Q.armR = iP4; Q.legL = iP5.xyz; Q.legR = vec3(iP5.w, iP6.xy); Q.shoW = iP6.z; Q.hipW = iP6.w;
  // iAttr.w > 0: lantern bearer (glow), < 0: performer in a follow spot / key light (level)
  vGlow = max(iAttr.w, 0.0);
  vKey = max(-iAttr.w, 0.0);
  vLanL = toWorld(P, Q, lanternAnchor(true, Q) - vec3(0.0, LAN_DROP, 0.0));
  vLanR = toWorld(P, Q, lanternAnchor(false, Q) - vec3(0.0, LAN_DROP, 0.0));
  int props = (P.look.z >> 8) & 31;
  vLanOn = vec2((props & 1) != 0 ? 1.0 : 0.0, (props & 2) != 0 ? 1.0 : 0.0) * vGlow;`:`  Person P = fetchPerson(aIdx);
  Pose Q = personPose(P);`}
  int bone = int(mod(aBone, 32.0) + 0.5);
  int slot = int(floor(aBone / 32.0 + 0.01));
  vec3 p = position;
  vec3 n = normal;
  if (!slotVisible(slot, P.look)) p = vec3(0.0, 1.2, 0.0);
  if (slot == S_CAP && ((P.look.x >> 9) & 7) == 2) { p.z = 0.024 - p.z; n.z = -n.z; }
  vec3 lp = ${n?`(slot == S_LANTERN_L || slot == S_LANTERN_R) ? lanternPt(slot == S_LANTERN_L, p, n, Q, P.seed) : `:``}skinPt(bone, p, n, Q);
  vec3 wp = toWorld(P, Q, lp);
  vec3 wn = normalize(rY(P.yaw + Q.walkYaw) * n);
  vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mvPosition;
${i?`  vFade = P.h > 0.01 ? lensFade(P.pos + vec3(Q.push.x, 0.0, Q.push.y), P.h, ${n?`PERF_FADE`:`CROWD_FADE`}) : 1.0;
  // fully dissolved: collapse the instance outside the clip volume (no raster work at all)
  if (vFade < 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);`:``}
${r?`  vec3 alb = max(albedoOf(bone, slot, p, P.look), vec3(0.022));
  vec3 V = normalize(cameraPosition - wp);
  float ao = mix(0.28, 1.0, smoothstep(0.35, 1.5, p.y));
  vCol = crowdTone(alb * envLight(wp, wn) * ao + rimLight(wp, wn, V) * (0.35 + 0.65 * smoothstep(0.9, 1.6, p.y)), uLumCap);`:`  vN = wn; vW = wp; vLocal = p; vLook = P.look; vBone = bone; vSlot = slot;`}
  #include <fog_vertex>
}
`}function ps(e,t=!1){let n=e===`performer`,r=t&&e!==`mid`;return e===`mid`?`
${ds}
varying vec3 vCol;
void main() {
  gl_FragColor = vec4(vCol, 1.0);
  #include <fog_fragment>
  #include <colorspace_fragment>
}
`:`
uniform vec4 uClock;
${ms}
${ls}
${ds}
uniform sampler2D tFlags;
${n?`uniform vec4 uLantern; uniform vec4 uTube; uniform vec4 uKey; uniform vec4 uArch; uniform vec3 uPerfKey; uniform vec3 uPerfBack; varying float vGlow; varying float vKey; varying vec3 vLanL; varying vec3 vLanR; varying vec2 vLanOn;`:``}
varying vec3 vN; varying vec3 vW; varying vec3 vLocal; flat varying ivec4 vLook; flat varying int vBone; flat varying int vSlot;
${r?`varying float vFade;`:``}

void main() {
${r?os:``}
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
  bool isSkin = alb == uPal[vLook.x & 7] * 0.72 && vSlot == S_BODY;
  // woven cotton / skin micro-variation (breaks the flat plastic look up close)
  alb *= 0.93 + 0.14 * vnoise(vLocal.xy * vec2(46.0, 61.0) + vLocal.z * 37.0);
${n?`  float flick = 0.82 + 0.1 * sin(uClock.x * 23.0 + vW.x * 7.0) + 0.08 * sin(uClock.x * 37.0 + vW.z * 3.0); // show time: seek-safe
  if (vSlot == S_LANTERN_L || vSlot == S_LANTERN_R) {
    // flat square panel lantern (the film's lanterns are the brightest things in frame): a warm-white
    // glowing body — pillow-like, hottest in the middle, orange towards a thin dark frame — well above
    // the bloom threshold; cap / base plates and the bail stay dark metal
    vec3 q = vLocal - vec3(LAN_AX * (vSlot == S_LANTERN_L ? 1.0 : -1.0), LAN_AY - LAN_DROP, LAN_AZ);
    vec3 a = abs(q) / (vec3(LAN_W, LAN_H, LAN_D) * 0.5);
    alb = vec3(0.035, 0.03, 0.028);
    if (a.y < 0.995 && max(a.x, a.z) > 0.97) {
      // broad faces front / back; the narrow sides glow dimmer (a flat panel, not a glowing cube)
      bool broad = a.z > a.x;
      vec2 f = broad ? a.xy : a.zy;
      float r = max(f.x, f.y);
      float core = 1.0 - 0.5 * dot(f, f);
      vec3 c = mix(vec3(1.0, 0.72, 0.34), vec3(1.0, 0.36, 0.07), smoothstep(0.1, 0.9, r));
      emit = c * (2.5 + 9.0 * core * core * core) * (broad ? 1.0 : 0.3) * flick * (1.0 - smoothstep(0.9, 0.94, r)) * vGlow;
    }
  }`:``}
  // humid skin gets a sheen towards the stage (hot night); hair a soft anisotropic-ish sheen
  bool isHair = vSlot == S_HAIRCAP || vSlot == S_HAIR || vSlot == S_PONY;
  alb = max(alb, vec3(0.022));
  float spec = isSkin ? 1.0 : 0.0;
  // crowd occlusion: bodies below the head plane are shadowed by the neighbours
  float ao = ${n?`1.0`:`mix(0.28, 1.0, smoothstep(0.35, 1.5, vLocal.y))`};
  vec3 light = envLight(vW, N) * ao;
  float col0rim = 0.0;
${n?`  light += uLantern.rgb * uLantern.a * (0.55 + 0.45 * max(N.y, 0.0));
  // each bearer's own lanterns light their hands, face and costume from below / in front (flickering warm
  // point lights, 1 / (1 + 10 d²): hands, forearms, the face above them); added after the tone cap so the glow on the faces reads as in the film
  vec3 lanKey = vec3(0.0);
  if (vLanOn.x + vLanOn.y > 0.0 && vSlot != S_LANTERN_L && vSlot != S_LANTERN_R) {
    vec3 d1 = vLanL - vW; float l1 = max(length(d1), 0.08);
    vec3 d2 = vLanR - vW; float l2 = max(length(d2), 0.08);
    float pl = vLanOn.x * (0.15 + 0.85 * max(dot(N, d1 / l1), 0.0)) / (1.0 + 10.0 * l1 * l1)
      + vLanOn.y * (0.15 + 0.85 * max(dot(N, d2 / l2), 0.0)) / (1.0 + 10.0 * l2 * l2);
    lanKey = vec3(1.0, 0.6, 0.28) * flick * pl * ${ns.toFixed(2)};
  }
  vec3 Lt = vec3(0.12, 1.95, 58.75) - vW;
  float dt = length(Lt);
  light += uTube.rgb * uTube.a * (max(dot(N, Lt / dt), 0.0) * 1.6 + 0.15) / (1.0 + dt * dt * 0.5);
  // performers on the deck: the set wash spilling onto the deck
  float onDeck = smoothstep(3.0, -0.5, vW.z);
  vec3 Lk = normalize(vec3(0.0, 11.0, 88.0) - vW);
  // (the fire troupe, vGlow > 0, stands in the thick red wash of the film: v646–740 red floor, red costumes)
  // (the MC, vKey > 0 on the deck, is lit by the rig's colour in the film — blue v348–357 in front of the red set —
  // so the set wash reaches him only a little)
  light += uKey.rgb * uKey.a * onDeck * (max(dot(N, Lk), 0.0) * 0.9 + 0.12) * (vGlow > 0.0 ? 2.2 : vKey > 0.0 && vW.z < 20.0 ? 0.35 : 1.0);
  if (vKey > 0.0) {
    if (vW.z > 20.0) {
      // pianist: white key from the delay tower on his right + a separation light from behind (the laser tube)
      vec3 Lk2 = normalize(vec3(14.0, 14.0, 42.0) - vW);
      light += vec3(0.93, 0.96, 1.0) * vKey * (max(dot(N, Lk2), 0.0) + 0.06);
      col0rim = vKey * 0.35;
    } else {
      // deck (the MC): no white follow spot in the film — the rig's own colour from the front (blue at
      // v351, red at v403, magenta at v446) plus a faint neutral fill so the face still reads
      vec3 Lk2 = normalize(vec3(vW.x * 0.3, 7.0, 40.0) - vW);
      light += (uPerfKey + vec3(0.035, 0.035, 0.04)) * vKey * (max(dot(N, Lk2), 0.0) + 0.08);
    }
  }
  // the portal's ring of arch-crown downlights (LightingSystem, LightEnv.archSpot*): the performers in the arch
  // and on the podium in front of it take their key light from the cans above them (v646–740: the lead on her
  // pedestal and the bearers round her lit from the crown, the colour of the cans)
  float inArch = smoothstep(3.8, 2.4, abs(vW.x)) * smoothstep(-10.5, -8.8, vW.z) * smoothstep(-0.8, -2.6, vW.z);
  if (inArch > 0.0 && uArch.a > 0.0) {
    // (the cans hang in the throat and are focused forward onto the deck: light from above, a little in front)
    vec3 La = vec3(clamp(vW.x * 0.6, -1.9, 1.9), 6.6, max(vW.z + 0.8, -8.5)) - vW;
    float la = max(length(La), 0.3);
    light += uArch.rgb * (uArch.a * inArch * ${ts.toFixed(3)}) * (max(dot(N, La / la), 0.0) + 0.3 * max(N.y, 0.0) + 0.12) * (8.0 / (6.0 + la * la));
  }
  // backlight from the set behind the deck performers (rig, backlight blinders, LED walls): the film's
  // deck close-ups show coloured edges around a darker front; seen from behind it lights their backs
  vec3 Lb = normalize(vec3(vW.x * 0.6, vW.y + 5.0, -14.0) - vW);
  // (the troupe stays in its red wash: the rig behind them only draws their edges)
  light += uPerfBack * onDeck * max(dot(N, Lb), 0.0) * (vGlow > 0.0 ? 0.15 : 0.45);
  float nvb = clamp(dot(N, V), 0.0, 1.0);
  float edge = pow(1.0 - nvb, 2.0) * clamp(dot(N, Lb) * 0.75 + 0.45, 0.0, 1.0) * clamp(dot(Lb, -V) * 0.6 + 0.5, 0.0, 1.0);
  // the edge glow takes some of the costume's colour (red jumpsuits glow red, the MC's black shirt stays cool)
  vec3 backRim = uPerfBack * onDeck * edge * 1.8 * mix(vec3(1.0), min(alb * 3.0, vec3(1.5)), 0.5);`:``}
  vec3 Hs = normalize(normalize(uStagePos - vW) + V);
  float sheen = pow(max(dot(N, Hs), 0.0), 24.0) * spec * 0.35 + (isHair ? pow(max(dot(N, Hs), 0.0), 10.0) * 0.12 : 0.0);
  vec3 col = alb * light + rimLight(vW, N, V) * (0.4 + 0.6 * smoothstep(0.9, 1.6, vLocal.y)) * (1.0 + spec * 0.5) + (uStageCol + uRimCol * 0.5) * sheen;
  col += vec3(0.85, 0.9, 1.0) * col0rim * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.5);
  col = crowdTone(col, uLumCap${n?` * 2.6`:``}) + emit${n?` + backRim + alb * lanKey`:``};
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
  #include <colorspace_fragment>
}
`}var ms=`
${is}
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
#define S_HAIRCAP 12
uint hu(uint x) { x ^= x >> 16u; x *= 0x7feb352du; x ^= x >> 15u; x *= 0x846ca68bu; x ^= x >> 16u; return x; }
float h2(vec2 c) { return float(hu(uint(int(c.x) + 8192) * 73856093u ^ uint(int(c.y) + 8192) * 19349663u)) * (1.0 / 4294967296.0); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y);
}
${cs}
`,hs=`
${as}
${ss}
${cs}
${ls}
${us}
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
`,gs=`
uniform sampler2D tAtlas;
uniform vec4 uClock;
${ls}
${ds}
varying vec2 vUv;
varying float vH;
varying vec3 vSkin; varying vec3 vTop; varying vec3 vBot; varying vec3 vHair;
varying vec3 vLight; varying vec3 vRim;
void main() {
  vec4 a = texture2D(tAtlas, vUv);
  float ao = mix(0.28, 1.0, smoothstep(0.2, 0.86, vH));
  if (a.r < 0.5) discard;
  vec3 alb = max(a.g < 0.17 ? vSkin : (a.g < 0.5 ? vHair : (a.g < 0.83 ? vTop : vBot)), vec3(0.022));
  vec3 col = crowdTone(alb * vLight * ao + vRim * a.b, uLumCap);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
  #include <colorspace_fragment>
}
`,_s=`
${as}
${ss}
${ls}
${us}
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
    float droop = mix(mix(0.62, 0.18, waveAmt), 1.6, Q.furl);
    vec3 fly = normalize(vec3(sin(flyA), -droop * u, cos(flyA)));
    vec3 perp = normalize(cross(fly, vec3(0.0, 1.0, 0.0)));
    float rip = (0.07 + 0.05 * waveAmt) * u * sin(u * 9.0 - rt * (7.0 + 4.0 * waveAmt) + ph) + 0.03 * u * sin(u * 17.0 - rt * 13.0 + ph * 2.0);
    float W = iFlag.w * mix(1.0, 0.16, Q.furl), H = iFlag2.x * mix(1.0, 0.8, Q.furl);
    rip *= 1.0 - 0.8 * Q.furl;
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
  // the carrier dissolved at the lens (see lensFade): the pole and the cloth go with them
  if (lensFade(P.pos + vec3(Q.push.x, 0.0, Q.push.y), P.h, CROWD_FADE) < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  #include <fog_vertex>
}
`,vs=`
uniform vec4 uClock;
uniform sampler2D tFlags;
${ls}
${ds}
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
  col = crowdTone(col, uLumCap * 1.4);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
  #include <colorspace_fragment>
}
`,ys=`
${as}
${ss}
${us}
uniform vec3 uScreen;
uniform float uPixel;  // world size of ~1 px at 1 m
varying vec2 vQ;
varying vec3 vCol;
varying float vShape;
flat varying float vKind;
flat varying float vSeed;
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
  bool flash = Q.light > 0.5;
  float bright = 0.3 + 0.7 * hh(P.seed, 23.0);
  // kind 0: the screen filming the stage (seen from behind), 1: flashlight LED (from the stage side), 2: lighter
  float kind = flash ? (lighter ? 2.0 : (seesScreen > 0.5 ? 0.0 : 1.0)) : 0.0;
  vec3 col;
  vec2 hs;
  if (kind < 0.5) {
    col = mix(uScreen, vec3(0.75, 0.8, 0.9), hh(P.seed, 22.0) * 0.3) * 0.34 * bright * seesScreen;
    hs = vec2(0.034, 0.072);
  } else if (kind < 1.5) {
    col = vec3(0.95, 0.97, 1.0) * 7.0 * bright * (1.0 - seesScreen);
    hs = vec2(0.035);
  } else {
    float fl = 0.8 + 0.2 * sin(uClock.y * 19.0 + P.seed) * sin(uClock.y * 7.3 + P.seed * 0.37);
    col = vec3(1.0, 0.5, 0.14) * 2.6 * fl * (0.6 + 0.4 * bright);
    hs = vec2(0.03, 0.05);
    c.y += 0.05;
  }
  float vis = on * step(0.002, dot(col, vec3(1.0)));
  // no phone floating in front of the lens once its owner has dissolved there
  if (dist < 2.6) vis *= step(0.5, lensFade(P.pos + vec3(Q.push.x, 0.0, Q.push.y), P.h, CROWD_FADE));
  // never smaller than ~0.6 px; energy conserving (tiny, dim dots far away, no bright cards)
  float px = dist * uPixel;
  vec2 size = max(hs, vec2(px * 0.6));
  float k = (hs.x * hs.y) / (size.x * size.y);
  vShape = clamp(hs.x / size.x, 0.0, 1.0);
  vCol = col * vis * k;
  vKind = kind;
  vSeed = fract(P.seed * 0.000123);
  vQ = position.xy;
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 dir = toCam / max(dist, 1e-3);
  vec3 right = normalize(cross(up, dir));
  vec3 up2 = cross(dir, right);
  vec3 wp = c + (right * position.x * size.x + up2 * position.y * size.y) * (vis > 0.0 ? 1.0 : 0.0);
  vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`,bs=`
${ds}
varying vec2 vQ;
varying vec3 vCol;
varying float vShape;
flat varying float vKind;
flat varying float vSeed;
void main() {
  vec3 col = vCol;
  float d2 = dot(vQ, vQ);
  float a;
  if (vKind < 0.5) {
    // phone screen: rounded rectangle, dark bezel, a "video of the stage" (dark, a few coloured lights)
    vec2 q = abs(vQ);
    float rect = 1.0 - smoothstep(0.78, 0.97, max(q.x, q.y * 0.98));
    float content = 0.14 + 1.1 * exp(-dot(vQ - vec2(0.35 * sin(vSeed * 40.0), 0.25), vQ - vec2(0.35 * sin(vSeed * 40.0), 0.25)) * 7.0)
      + 0.6 * exp(-dot(vQ - vec2(-0.3, -0.35 + 0.3 * cos(vSeed * 25.0)), vQ - vec2(-0.3, -0.35 + 0.3 * cos(vSeed * 25.0))) * 9.0);
    float bez = smoothstep(0.7, 0.8, max(q.x, q.y));
    float screen = mix(1.0, content * (1.0 - 0.85 * bez), vShape);
    a = mix(exp(-d2 * 3.0), rect * screen, vShape);
  } else if (vKind < 1.5) {
    a = exp(-d2 * 16.0) + 0.1 * exp(-d2 * 2.2);   // LED core + halo
  } else {
    vec2 f = vec2(vQ.x * 1.6, vQ.y + 0.25);
    a = exp(-dot(f, f) * 5.0) + 0.12 * exp(-d2 * 2.0); // flame + glow
  }
  if (a < 0.004) discard;
  col *= a;
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float fogF = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    col *= 1.0 - fogF;
  #endif
  gl_FragColor = vec4(col, 1.0);
}
`,xs=`
${us}
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
`,Ss=`
uniform vec4 uClock;
uniform vec4 uTube; // rgb, intensity
${ls}
${ds}
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
`,Cs=256,ws=45e3,Ts=65e3,Es={ultra:{heroN:150,heroR:8,nearN:1e3,nearR:20,midN:4e3,midR:70,head:65e3},high:{heroN:100,heroR:7,nearN:500,nearR:15,midN:2400,midR:55,head:45e3},medium:{heroN:60,heroR:6,nearN:340,nearR:12,midN:1600,midR:45,head:26e3},mobile:{heroN:0,heroR:5,nearN:150,nearR:10,midN:800,midR:36,head:11e3}},Ds=16384,Os=128,ks=2.4,As=4.8,js=256,Ms=new Set([...Ze.map(e=>e.id),`dragon_view`]),Ns=new Set(Ze.map(e=>e.id)),Ps={ring:1.1,cone:.55,r1:2.6,r2:4.2,keep:.8,short:9},Fs=18,Is={ring:1.2,cone:.42,r1:4.2,r2:4.2,keep:1},Ls=1.8;function Rs(e){return e.tag===`barrier`&&e.kind===`box`&&Math.abs((e.minZ+e.maxZ)/2-sa)<.1&&e.maxX-e.minX>1.5}var zs=[[6,32,5.5],[0,5.5,5],[-4,74,5.5],[-70,40,5.5],[70,40,5.5],[0,45,5],[0,118,5],[4.6,64.2,5],[4,146,5]],Bs=[[0,`#0a2a4e`,`#c99a68`],[120,`#06183a`,`#a8805e`],[400,`#030a1e`,`#7a6450`],[800,`#02060f`,`#4a4040`],[1300,`#010204`,`#2a2a2e`]],Vs=class{name=`crowd`;populated=!0;app;enabled=!0;q;target=ws;layout=null;heightAt=Ja;queues=[];root=new y;crowdGroup=new y;u;texPos=null;texAttr=null;texLook=null;atlas;flagTex;meshes=null;idx;fade;fadeN=0;flagMesh;flagGeo;lightsMesh;perfMesh;perfGeo;perfAttrs=[];perfRows=[];perfDrawn=0;perfHidden=0;crewMask=new Uint8Array;cameraRig=void 0;buildGen=0;building=!1;propsMesh;perf;choreo=new Ti;tris={hero:0,near:0,mid:0,far:2,flag:0,perf:0};frustum=new m;projScreen=new b;box=new te;order=new Int32Array;dist=new Float32Array;visChunk=new Int32Array;visDist=new Float32Array;bins=new Int32Array(512);chunkLod=new Uint8Array;lastCam=new u(1e9,0,0);lastDir=new u;tmpV=new u;counts={hero:0,near:0,mid:0,far:0,visible:0};candIdx=new Int32Array(Ds);candD=new Float32Array(Ds);lodBins=new Int32Array(Os);hAllow=new Int32Array(Os);nAllow=new Int32Array(Os);frame=0;cpuMs=0;lateDue=!1;updMs=0;rebuildTimer=0;testEnv=!1;testColor=null;tmpC=new I;tmpC2=new I;sky=[];densityAt(e,t){return!this.populated||!this.enabled||!this.layout?0:qa(this.layout.density,e,t)}subjectAt(e,t,n){return this.perf?this.perf.subjectAt(e,t,n):!1}facingAt(e,t){return this.perf?this.perf.facingAt(e,t):NaN}setPopulated(e){this.populated=e,this.crowdGroup.visible=e&&this.enabled,this.lastCam.set(1e9,0,0),this.app?.events.emit(`crowd:populated`,{on:e,count:e?this.count:0})}get mode(){return this.populated?`tribe`:`filmed`}get lod(){return Es[this.q?.level??`high`]??Es.high}get maxCount(){let e=this.q?.crowdCount;return Math.min(Ts,e!==void 0&&Number.isFinite(e)&&e>0?e:this.lod.head)}maxCountFor(e){if(this.q&&e===this.q.level)return this.maxCount;let t=sr[e]?.crowdCount;return t!==void 0&&Number.isFinite(t)&&t>0?Math.min(Ts,t):Es[e]?.head??0}setCount(e){let t=Math.round(z(e,0,Ts));t===this.target&&this.layout||(this.target=t,this.app&&this.q&&(window.clearTimeout(this.rebuildTimer),this.rebuildTimer=window.setTimeout(()=>void this.rebuild(),150)))}get count(){return this.layout?.count??0}get targetCount(){return this.target}async init(e){this.app=e,this.q=e.quality;let t=e.params,n=parseInt(t.get(`crowd`)??``,10);Number.isFinite(n)&&(this.target=z(n,0,Ts)),(t.has(`filmed`)||t.get(`mode`)===`filmed`||t.get(`populated`)===`0`)&&(this.populated=!1),this.testEnv=t.has(`crowdenv`);let r=t.get(`crowdenv`)??``;/^[0-9a-f]{6}$/i.test(r)&&(this.testColor=new I(`#${r}`));let i=e.get(`terrain`);if(i&&typeof i.heightAt==`function`&&!t.has(`crowdslope`)){let e=i.heightAt.bind(i);this.heightAt=(t,n)=>{let r=e(t,n);return Number.isFinite(r)?r:Ja(t,n)}}this.queues=this.findQueues();for(let e of Bs)this.sky.push({t:e[0],z:new I(e[1]),w:new I(e[2])});this.root.name=`crowd`,this.crowdGroup.name=`crowd-tribe`,this.root.add(this.crowdGroup),e.scene.add(this.root),await e.loadStep(`silhouettes`,0),this.atlas=Nr(),this.flagTex=Kr(),this.u=this.makeUniforms(),await e.loadStep(`bodies`,.08),this.buildMeshes(),e.onFrame(e=>this.lateUpdate(e)),e.addCollider({kind:`box`,minX:-2.8,maxX:2.8,minZ:57,maxZ:61,tag:`piano-riser`}),e.addSpot({id:`piano`,label:`Piano riser (Domitor Draconis)`,position:new u(4.6,0,64.2),yaw:.72,pitch:-.05}),await this.rebuild(!0),this.setPopulated(this.populated)}findQueues(){let e=[],t=this.app.spots;for(let n of this.app.interactables){let r=/^bar_(.+)_\d+$/.exec(n.id);if(!r)continue;let i=t.find(e=>e.id===`bar_${r[1]}`);if(!i)continue;let a=n.position;a.z>175||a.z<-5||Math.abs(a.x)>115||e.push({x:a.x,z:a.z,dx:Math.sin(i.yaw),dz:Math.cos(i.yaw)})}return e}makeUniforms(){let e=[];for(let t=0;t<5;t++)e.push(new p);return{tPos:{value:null},tAttr:{value:null},tLook:{value:null},tAtlas:{value:this.atlas},tFlags:{value:this.flagTex},uMood:{value:e},uBeat:{value:new p(0,150,0,.5)},uClock:{value:new p},uPlayer:{value:new p(0,0,160,1)},uCamPush:{value:new p(0,0,0,0)},uPal:{value:Xr()},uStageCol:{value:new I},uStagePos:{value:new u(0,14,-12)},uRimCol:{value:new I},uWashCol:{value:new I},uFlashCol:{value:new I},uFlashPos:{value:new u(0,20,-10)},uStrobe:{value:0},uSkyUp:{value:new I},uSkyLow:{value:new I},uTwilight:{value:new I},uMoonCol:{value:new I(`#f2dcc0`).multiplyScalar(.035)},uMoonDir:{value:new u(.282,.128,-.951).normalize()},uHazeAmb:{value:new I},uWind:{value:si.clone()},uScreen:{value:new I(`#dfe8ff`)},uPixel:{value:.001},uLantern:{value:new p},uKey:{value:new p},uArch:{value:new p},uPerfKey:{value:new I},uPerfBack:{value:new I},uGroups:{value:new p},uTube:{value:new p(.85,.92,1,0)},uLumCap:{value:.5}}}material(e,t,n={}){return new C({uniforms:{...h.clone(k.fog),...this.u},vertexShader:e,fragmentShader:t,fog:!0,...n})}instanced(e){let t=new xe;e.index&&t.setIndex(e.index);for(let[n,r]of Object.entries(e.attributes))t.setAttribute(n,r);return t.instanceCount=0,t}lodMesh(t,n,r,i=65536){let a=this.instanced(t),s=new x(new Uint16Array(i),1);s.setUsage(o),a.setAttribute(`aIdx`,s);let c=new e(a,n);return c.name=r,c.frustumCulled=!1,c.matrixAutoUpdate=!1,this.crowdGroup.add(c),{mesh:c,idx:s}}buildMeshes(){let t=Ki(),n=Gi(),r=Yi(),i=Xi();this.tris.hero=$i(t),this.tris.near=$i(n),this.nearVerts=n.getAttribute(`position`).count,this.tris.mid=$i(r);let a=this.lodMesh(t,this.material(fs(`hero`),ps(`hero`)),`crowd-hero`,2048),s=this.lodMesh(n,this.material(fs(`near`),ps(`near`)),`crowd-near`),c=this.lodMesh(r,this.material(fs(`mid`),ps(`mid`)),`crowd-mid`),l=this.material(hs,gs,{side:2}),u=this.lodMesh(i,l,`crowd-far`);a.mesh.renderOrder=1,s.mesh.renderOrder=1,c.mesh.renderOrder=2,u.mesh.renderOrder=3,this.meshes={hero:a.mesh,near:s.mesh,mid:c.mesh,far:u.mesh},this.idx={hero:a.idx,near:s.idx,mid:c.idx,far:u.idx};let d=this.material(fs(`hero`,!0),ps(`hero`,!0)),f=this.lodMesh(t,d,`crowd-fade`,js),p=this.instanced(n);p.setAttribute(`aIdx`,f.idx);let m=new e(p,d);m.name=`crowd-fade-near`,m.frustumCulled=!1,m.matrixAutoUpdate=!1,f.mesh.renderOrder=0,m.renderOrder=0,this.crowdGroup.add(m),this.fade={hero:f.mesh,near:m,idx:f.idx};let g=Zi();this.tris.flag=$i(g),this.flagGeo=this.instanced(g),this.flagMesh=new e(this.flagGeo,this.material(_s,vs,{side:2})),this.flagMesh.name=`crowd-flags`,this.flagMesh.frustumCulled=!1,this.crowdGroup.add(this.flagMesh);let _=this.instanced(Qi());this.lightsMesh=new e(_,new C({uniforms:{...h.clone(k.fog),...this.u},vertexShader:ys,fragmentShader:bs,transparent:!0,depthWrite:!1,blending:2,fog:!0})),this.lightsMesh.name=`crowd-phones`,this.lightsMesh.frustumCulled=!1,this.lightsMesh.renderOrder=10,this.crowdGroup.add(this.lightsMesh),this.perf=new Ko(this.heightAt);let v=qi(this.q.level===`mobile`?`near`:`hero`);this.tris.perf=$i(v),this.perfGeo=this.instanced(v);let y=(e,t)=>{let n=new Float32Array(t.length),r=new x(n,4);r.setUsage(o),this.perfGeo.setAttribute(e,r),this.perfAttrs.push(r),this.perfRows.push({src:t,dst:n})};y(`iPos`,this.perf.iPos),y(`iAttr`,this.perf.iAttr),y(`iLook`,this.perf.iLook),this.perf.iP.forEach((e,t)=>y(`iP${t}`,e)),this.perfGeo.instanceCount=0,this.crewMask=new Uint8Array(this.perf.count),this.perf.perfs.forEach((e,t)=>{let n=e.mode!==`both`||e.name.endsWith(`cam`)||e.name===`terrace`;this.crewMask[t]=e.name===`deckcam`?2:+!!n}),this.perfMesh=new e(this.perfGeo,this.material(fs(`performer`,!0),ps(`performer`,!0))),this.perfMesh.name=`performers`,this.perfMesh.frustumCulled=!1,this.root.add(this.perfMesh),this.propsMesh=new e(es(),this.material(xs,Ss,{side:2})),this.propsMesh.name=`performer-props`,this.root.add(this.propsMesh)}clearZones(){let e=new Map;for(let t of We)e.set(t.id,t);for(let t of this.app.spots)e.set(t.id,t);let t=[];for(let n of e.values()){let e=n.position;if(e.y>=8)continue;if(n.id===`piano`){t.push({x:e.x,z:e.z,yaw:n.yaw,...Is});continue}if(!(Ms.has(n.id)||e.z<3)){t.push({x:e.x,z:e.z,ring:Ls});continue}let r=e.y-this.heightAt(e.x,e.z)>=1.5,i=e.z>sa?Math.min(Ps.r1,Math.max(0,e.z-sa-.3)):Ps.r1;t.push({x:e.x,z:e.z,yaw:n.yaw,...Ps,r1:i,r2:Math.max(i,Ps.r2),keep:r?1:Ps.keep,short:r?0:Ps.short,dense:!r&&Ns.has(n.id)?Fs:0})}return t}async rebuild(e=!1){let n=++this.buildGen,r=this.q,i=Math.min(this.target,this.maxCount),a=Math.min(r.flagCount,Math.round(i*.008)),o=zs.slice();for(let e of this.app.spots)e.position.y<8&&o.push([e.position.x,e.position.z,5]);let s=performance.now(),c=new or(12),l=this.app,u=0,d=async e=>{let t=performance.now();await e,u+=performance.now()-t};this.building=!0;let f=this.clearZones();this.clearCount=f.length;let p;try{p=await Ka({target:i,heightAt:this.heightAt,colliders:this.app.colliders.filter(e=>e.tag!==`piano-riser`&&!Rs(e)),queues:this.queues,flagTarget:a,flagAvoid:o,clear:f},{step:e?(e,t)=>d(l.loadStep(e,.1+.88*t)):void 0,due:()=>c.due(),yield:()=>d(c.yield()),cancelled:()=>n!==this.buildGen})}catch(e){if(e instanceof ma)return;throw e}finally{n===this.buildGen&&(this.building=!1)}if(n!==this.buildGen)return;this.layout=p;let m=Math.max(1,Math.ceil(p.count/Cs)),h=(e,n)=>{n?.dispose();let r=new Float32Array(Cs*m*4);r.set(e);let i=new S(r,Cs,m,N,t);return i.minFilter=fe,i.magFilter=fe,i.generateMipmaps=!1,i.needsUpdate=!0,i};this.texPos=h(p.pos,this.texPos),this.texAttr=h(p.attr,this.texAttr),this.texLook=h(p.look,this.texLook),this.u.tPos.value=this.texPos,this.u.tAttr.value=this.texAttr,this.u.tLook.value=this.texLook;let g=p.flags.length,_=new Float32Array(Math.max(1,g)*4),v=new Float32Array(Math.max(1,g)*4);p.flags.forEach((e,t)=>{_.set([e.carrier,e.type,e.pole,e.w],t*4),v.set([e.h,+(e.w<1),qe(lt(e.carrier,5))/4294967296*6.28,0],t*4)}),this.flagGeo.dispose(),this.flagGeo.setAttribute(`iFlag`,new x(_,4)),this.flagGeo.setAttribute(`iFlag2`,new x(v,4)),this.flagGeo.instanceCount=g,this.lightsMesh.geometry.instanceCount=p.count,this.order=new Int32Array(p.chunks.length),this.dist=new Float32Array(p.chunks.length),this.visChunk=new Int32Array(p.chunks.length),this.chunkLod=new Uint8Array(p.chunks.length).fill(2),this.visDist=new Float32Array(p.chunks.length),this.lastCam.set(1e9,0,0),this.buildMs=performance.now()-s-u,this.buildWallMs=performance.now()-s}buildMs=0;buildWallMs=0;clearCount=0;showFile=null;nearVerts=0;bucketMs=0;setQuality(e){let t=this.q;this.q=e,this.app&&((!t||t.level!==e.level||t.crowdCount!==e.crowdCount||t.flagCount!==e.flagCount)&&this.rebuild(),this.lastCam.set(1e9,0,0))}setEnabled(e){this.enabled=e,this.root.visible=e,this.crowdGroup.visible=e&&this.populated}update(e){if(!this.enabled||!this.layout||!this.meshes)return;let t=performance.now();this.frame++;let n=this.app,r=e.showTime,i=this.u,a=n.show.file?n.show.section(r):null;this.choreo.evaluate(r,e.beat,a,n.show.file?n.show:null);let o=i.uMood.value,s=this.choreo.mood;for(let e=0;e<5;e++)o[e].set(s[e*4],s[e*4+1],s[e*4+2],s[e*4+3]);i.uBeat.value.set(e.beat.beat,e.beat.bpm,+!!e.beat.hasKick,e.beat.energy),i.uClock.value.set(r,e.time,0,this.choreo.cheer);let c=e.playerPos;i.uPlayer.value.set(c.x,c.y,c.z,1);let l=e.camera.position,u=+(l.y-this.heightAt(l.x,l.z)<2.4&&(l.x-c.x)**2+(l.z-c.z)**2>.25);i.uCamPush.value.set(l.x,l.z,0,u),this.testEnv&&this.fakeEnv(e),this.updateLighting(r,e),n.show.file!==this.showFile&&(this.showFile=n.show.file,this.perf.timing.load(n.show.file?n.show:null)),this.perf.update(r,e.time,e.beat.beat,e.beat.bpm,s[K.LOOKUP],this.populated),i.uLantern.value.copy(this.perf.lantern);let d=n.env;i.uKey.value.set(d.stageWashColor.r*d.stageWashIntensity*.5,d.stageWashColor.g*d.stageWashIntensity*.5,d.stageWashColor.b*d.stageWashIntensity*.5,1),i.uArch.value.set(d.archSpotColor.r,d.archSpotColor.g,d.archSpotColor.b,z(d.archSpotIntensity,0,1.5));let f=z(d.stageIntensity,0,3),p=z(d.stageWashIntensity,0,2),m=i.uPerfKey.value;m.copy(d.stageColor).multiplyScalar(.15+.28*f),m.r+=d.stageWashColor.r*p*.06,m.g+=d.stageWashColor.g*p*.06,m.b+=d.stageWashColor.b*p*.06,Hs(m,1.2);let h=i.uPerfBack.value,g=d.flashStage,_=z(d.strobe,0,1.2);h.copy(d.stageColor).multiplyScalar(.12+.6*f),h.r+=d.stageWashColor.r*p*.12+g.color.r*.25+_*.6,h.g+=d.stageWashColor.g*p*.12+g.color.g*.25+_*.6,h.b+=d.stageWashColor.b*p*.12+g.color.b*.25+_*.6,Hs(h,2.4),i.uGroups.value.set(1,this.perf.pedestal,this.perf.strap,0),i.uTube.value.w=this.perf.pianoTube;let v=e.camera;i.uPixel.value=2*Math.tan(v.fov*Math.PI/360)/Math.max(200,n.renderer.domElement.height),this.populated&&(this.lightsMesh.visible=s[K.PHONES]>.01||s[K.LIGHTERS]>.01,this.flagMesh.visible=this.layout.flags.length>0),this.updMs=performance.now()-t,this.lateDue=!0}lateUpdate(e){if(!this.lateDue)return;this.lateDue=!1;let t=performance.now(),n=e.camera;if(this.uploadPerformers(n),this.populated&&this.layout&&this.meshes&&(n.getWorldDirection(this.tmpV),n.position.distanceToSquared(this.lastCam)>.36||this.tmpV.dot(this.lastDir)<.995||this.frame%3==0||e.seeked)){let e=performance.now();this.bucket(n),this.bucketMs=this.bucketMs*.8+(performance.now()-e)*.2}let r=this.updMs+performance.now()-t;this.cpuMs=this.cpuMs*.9+r*.1}uploadPerformers(e){let t=this.perf,n=this.perfRows,r=t.iPos,i=t.iAttr;this.cameraRig===void 0&&(this.cameraRig=this.app.get(`camera`)??null);let a=this.cameraRig?.mode===`showcam`,o=e.position,s=0,c=0;for(let e=0;e<t.count;e++){let t=e*4;if(!(i[t]>0))continue;if(a&&this.crewMask[e]===2){c++;continue}if(a&&this.crewMask[e]){let e=r[t]-o.x,n=r[t+1]+1.5-o.y,i=r[t+2]-o.z;if(e*e+n*n+i*i<36){c++;continue}}let l=s*4;for(let e=0;e<n.length;e++){let r=n[e].src,i=n[e].dst;i[l]=r[t],i[l+1]=r[t+1],i[l+2]=r[t+2],i[l+3]=r[t+3]}s++}if(this.perfGeo.instanceCount=s,this.perfMesh.visible=s>0,this.perfDrawn=s,this.perfHidden=c,s!==0)for(let e=0;e<this.perfAttrs.length;e++){let t=this.perfAttrs[e];t.clearUpdateRanges(),t.addUpdateRange(0,s*4),t.needsUpdate=!0}}bucket(e){let t=this.layout;e.updateMatrixWorld(),this.projScreen.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this.frustum.setFromProjectionMatrix(this.projScreen),this.lastCam.copy(e.position),e.getWorldDirection(this.lastDir);let n=e.position,r=t.chunks,i=this.order,a=this.dist,o=this.bins;o.fill(0);let s=this.visChunk,c=this.visDist,l=0;for(let e=0;e<r.length;e++){let t=r[e];if(this.box.min.set(t.minX,t.minY,t.minZ),this.box.max.set(t.maxX,t.maxY+.6,t.maxZ),!this.frustum.intersectsBox(this.box))continue;let i=Math.max(t.minX-n.x,0,n.x-t.maxX),a=Math.max(t.minY-n.y,0,n.y-t.maxY),u=Math.max(t.minZ-n.z,0,n.z-t.maxZ),d=Math.sqrt(i*i+a*a+u*u);s[l]=e,c[l]=d,l++,o[Math.min(511,d|0)]++}let u=0;for(let e=0;e<512;e++){let t=o[e];o[e]=u,u+=t}for(let e=0;e<l;e++){let t=o[Math.min(511,c[e]|0)]++;i[t]=s[e],a[t]=c[e]}let d=l,f=this.lod,p=t.pos,m=n.x,h=n.y,g=n.z;f.heroR*f.heroR;let _=f.nearR*f.nearR,v=this.idx.hero.array,y=this.idx.near.array,b=this.idx.mid.array,x=this.idx.far.array,S=this.candIdx,C=this.candD,w=t.attr,T=this.fade.idx.array,E=ks*ks,D=As*As,O=0,k=0,A=0,ee=0,te=0,j=0;for(let e=0;e<d;e++){let t=i[e],n=r[t],o=a[e],s=n.start,c=s+n.count,l=this.chunkLod[t];if(o<f.nearR+(l===0?2:0)){for(let e=s;e<c;e++){let t=p[e*4]-m,n=p[e*4+1]+1.1-h,r=p[e*4+2]-g,i=t*t+r*r;if(i<D&&j<js){let t=w[e*4+3],n=t===3||t===5||t===6?D:E,r=p[e*4+1],a=Math.max(0,r-h,h-r-2.3);if(i+a*a<n){T[j++]=e;continue}}let a=i+n*n;a<_&&O<Ds?(S[O]=e,C[O]=a,O++):ee<f.midN?b[ee++]=e:x[te++]=e}this.chunkLod[t]=0}else if(o<f.midR+(l<=1?4:0)&&ee+n.count<=f.midN){for(let e=s;e<c;e++)b[ee++]=e;this.chunkLod[t]=1}else{for(let e=s;e<c;e++)x[te++]=e;this.chunkLod[t]=2}}let ne=this.lodBins,M=this.hAllow,re=this.nAllow;ne.fill(0);let ie=Os/f.nearR;for(let e=0;e<O;e++){let t=Math.min(127,Math.sqrt(C[e])*ie|0);C[e]=t,ne[t]++}let N=f.heroN,ae=f.nearN;for(let e=0;e<Os;e++){let t=ne[e],n=(e+.5)/ie<f.heroR?Math.min(t,N):0;N-=n;let r=Math.min(t-n,ae);ae-=r,M[e]=n,re[e]=r}for(let e=0;e<O;e++){let t=C[e],n=S[e];M[t]>0?(M[t]--,v[k++]=n):re[t]>0?(re[t]--,y[A++]=n):ee<f.midN?b[ee++]=n:x[te++]=n}this.commit(this.idx.hero,this.meshes.hero,k),this.commit(this.idx.near,this.meshes.near,A),this.commit(this.idx.mid,this.meshes.mid,ee),this.commit(this.idx.far,this.meshes.far,te);let oe=f.heroN>0;this.commit(this.fade.idx,oe?this.fade.hero:this.fade.near,j);let se=oe?this.fade.near:this.fade.hero;se.geometry.instanceCount=0,se.visible=!1,this.fadeN=j,this.counts.hero=k,this.counts.near=A,this.counts.mid=ee,this.counts.far=te,this.counts.visible=k+A+ee+te+j}commit(e,t,n){t.geometry.instanceCount=n,t.visible=n>0,n!==0&&(e.clearUpdateRanges(),e.addUpdateRange(0,n),e.needsUpdate=!0)}updateLighting(e,t){let n=this.app.env,r=this.u,i=Math.max(0,n.stageIntensity),a=r.uStageCol.value;a.copy(n.stageColor).multiplyScalar(.12+i*.5),a.r+=n.stageWashColor.r*n.stageWashIntensity*.22+n.palettePrimary.r*.025,a.g+=n.stageWashColor.g*n.stageWashIntensity*.22+n.palettePrimary.g*.025,a.b+=n.stageWashColor.b*n.stageWashIntensity*.22+n.palettePrimary.b*.025;let o=r.uRimCol.value;o.copy(n.stageWashColor).multiplyScalar(.25+n.stageWashIntensity*.9),o.r+=n.stageColor.r*i*.9+n.palettePrimary.r*.08,o.g+=n.stageColor.g*i*.9+n.palettePrimary.g*.08,o.b+=n.stageColor.b*i*.9+n.palettePrimary.b*.08,Hs(a,2.2),Hs(o,1.8);let s=r.uHazeAmb.value;s.copy(a).multiplyScalar(.5).add(this.tmpC.copy(o).multiplyScalar(.25)),s.multiplyScalar(.12*z(n.haze,0,1.2)),r.uWashCol.value.copy(n.stageColor).lerp(n.paletteSecondary,.25).multiplyScalar(n.audienceWash*(.1+i*.1)),r.uScreen.value.setRGB(.55,.62,.75).lerp(n.stageColor,.35).lerp(n.palettePrimary,.2);let c=r.uFlashCol.value;c.copy(n.flashColor).multiplyScalar(.8),Hs(c,3);let l=r.uFlashPos.value;l.copy(n.flashPos),l.z=Math.min(l.z,4),l.y=Math.max(l.y,6),r.uStrobe.value=z(n.strobe,0,1.2),r.uLumCap.value=.36+.14*z(i/3,0,1);let u=this.sky,d=0;for(;d<u.length-2&&e>u[d+1].t;)d++;let f=z((e-u[d].t)/(u[d+1].t-u[d].t),0,1);this.tmpC.copy(u[d].z).lerp(u[d+1].z,f),this.tmpC2.copy(u[d].w).lerp(u[d+1].w,f),r.uSkyUp.value.copy(this.tmpC).multiplyScalar(2.6).addScalar(.0025),r.uSkyLow.value.copy(this.tmpC).multiplyScalar(.8).addScalar(.001),r.uTwilight.value.copy(this.tmpC2).multiplyScalar(.05*(1-z(e/1500,0,.8)));let p=z(e/1581,0,1);r.uMoonDir.value.set(.282+(.372-.282)*p,.128+.018*p,-.951+.034*p).normalize()}fakeEnv(e){let t=this.app.env;if(t.stageIntensity>.001)return;let n=e.beat.energy;t.stageColor.copy(this.testColor??t.palettePrimary),t.stageIntensity=.6+1.4*n*(.5+.5*e.beat.kick),t.audienceWash=.35+.4*n,t.stageWashColor.copy(this.testColor??t.palettePrimary).lerp(t.paletteSecondary,this.testColor?.1:.3),t.stageWashIntensity=.9+.6*n}stats(){let e=this.layout;return this.enabled?{mode:this.populated?`tribe`:`as filmed`,total:this.populated?e?.count??0:0,target:this.target,hero:this.populated?this.counts.hero:0,near:this.populated?this.counts.near:0,mid:this.populated?this.counts.mid:0,far:this.populated?this.counts.far:0,fade:this.populated?this.fadeN:0,flags:this.populated?e?.flags.length??0:0,capes:e?.capes??0,performers:this.perf?this.perf.visibleCount:0,crew:this.perf?this.perf.crewVisible:0,perfDrawn:this.perfDrawn,crewHidden:this.perfHidden,perfTris:this.perfDrawn*this.tris.perf,clearZones:this.clearCount,mood:Ei(this.choreo.mood),cheer:this.choreo.cheer.toFixed(2),cue:this.choreo.cueState,zones:e?e.zoneCounts.join(`/`):`-`,tris:`${this.tris.hero}/${this.tris.near}/${this.tris.mid}/${this.tris.far}`,crowdTris:this.populated?this.crowdTris():0,lod:`${this.lod.heroN}@${this.lod.heroR}m/${this.lod.nearN}@${this.lod.nearR}m/${this.lod.midN}@${this.lod.midR}m`,nearVerts:this.nearVerts,drawCalls:this.drawCalls(),cpuMs:this.cpuMs.toFixed(3),bucketMs:this.bucketMs.toFixed(3),buildMs:this.buildMs.toFixed(0),buildWallMs:this.buildWallMs.toFixed(0),building:+!!this.building}:{mode:`disabled`,total:0,near:0,mid:0,far:0,flags:0,drawCalls:0}}crowdTris(){let e=this.counts,t=this.tris,n=e.hero*t.hero+e.near*t.near+e.mid*t.mid+e.far*t.far;return n+=this.fadeN*(this.lod.heroN>0?t.hero:t.near),this.lightsMesh?.visible&&(n+=(this.layout?.count??0)*2),this.flagMesh?.visible&&(n+=(this.layout?.flags.length??0)*t.flag),n}drawCalls(){let e=1;return this.perfMesh?.visible&&e++,this.populated&&this.meshes&&((this.fade.hero.visible||this.fade.near.visible)&&e++,this.meshes.hero.visible&&e++,this.meshes.near.visible&&e++,this.meshes.mid.visible&&e++,this.meshes.far.visible&&e++,this.flagMesh.visible&&e++,this.lightsMesh.visible&&e++),e}dispose(){this.root.removeFromParent(),this.texPos?.dispose(),this.texAttr?.dispose(),this.texLook?.dispose(),this.atlas?.dispose(),this.flagTex?.dispose()}};function Hs(e,t){let n=Math.max(e.r,e.g,e.b);if(n<=t*.5)return;let r=t*.5+t*.5*Math.tanh((n-t*.5)/(t*.5));e.multiplyScalar(r/n)}var Us=class{emitters=[];flashes=[];lights=[];lastFrame=0;cueT=0;derived=!1;used=!1;add(e){return this.emitters.push(e),e}},Ws=5,Gs=1,Ks=[`deck_front`,`deck_back`,`wing_left`,`wing_right`,`wing_tips`,`towers_top`,`roof`,`dragon_mouth`,`dragon_head`,`pillars_top`,`delay_towers`,`foh`,`fireworks_back`,`fireworks_sides`],qs=class{app;shared;layers=[];enabled=!0;quality;palette=Xn.newPalette();cache=new Map;prefetchFailed=new Set;lastT=-1e9;revision=-1;anchorRefs=[];cueBuf=[];frameNo=0;activeCues=0;flashSum=0;flashN=0;flashBuf=Array(512);flashI=new Float32Array(512);lightBuf=Array(256);lightI=new Float32Array(256);lightD=new Uint8Array(256);lightN=0;lightSum=0;lightSumD=0;flashCap=2.5;lightCap=9;sharedLightCap=!1;flashLightGain=.3;cpuMs=0;init(e){this.app=e,this.shared=Gn.get(e),this.quality=e.quality,hn(e.quality.level),this.buildLayers(e.quality),e.show.registerLifetime(this.sys,e=>{try{return this.lifetime(e)}catch{return e.dur}}),this.onInit(e)}onInit(e){}afterUpdate(e){}update(e){if(!this.enabled)return;let t=performance.now();this.frameNo++,this.checkInvalidation();let n=e.showTime,r=this.layers,i=n<this.lastT-.001||n-this.lastT>1;if(i)for(let e=0;e<r.length;e++)r[e].rebase();let a=i?0:Math.min(.1,n-this.lastT);this.lastT=n;for(let e=0;e<r.length;e++)r[e].begin();let o=this.app.show.active(this.sys,n,this.cueBuf);this.activeCues=o.length;let s=rt(this.app);this.flashSum=0,this.lightSum=0,this.lightSumD=0,this.lightN=0;let c=0;for(let e=0;e<o.length;e++){let t=o[e],i=this.cache.get(t.id);if(!i){i=new Us,i.cueT=t.t;try{this.app.show.paletteAt(t.t,this.palette),this.expand(t,i),this.deriveLights(i)}catch(e){this.frameNo%600==1&&console.warn(`[${this.name}] cue ${t.fx} failed to expand`,e)}this.cache.set(t.id,i),c++}i.used=!0,i.lastFrame=this.frameNo;let a=i.emitters;for(let e=0;e<a.length;e++){let t=a[e];n>=t.start&&n<t.end&&r[t.layer].add(t)}let l=i.flashes;for(let e=0;e<l.length;e++){let t=Ys(l[e],n,s);t>.002&&this.flashN<this.flashBuf.length&&(this.flashBuf[this.flashN]=l[e],this.flashI[this.flashN++]=t,this.flashSum+=t)}let u=i.lights,d=+!!i.derived;for(let e=0;e<u.length;e++){let t=Ys(u[e],n,s);t>.002&&this.lightN<this.lightBuf.length&&(this.lightBuf[this.lightN]=u[e],this.lightD[this.lightN]=d,this.lightI[this.lightN++]=t,d?this.lightSumD+=t:this.lightSum+=t)}}let l=this.flashCap,u=this.flashSum>l?l*(1+Math.log(this.flashSum/l))/this.flashSum:1,d=s?.4:1;for(let e=0;e<this.flashN;e++)this.app.env.addFlash(this.flashBuf[e].color,this.flashI[e]*u*d,this.flashBuf[e].pos);this.flashN=0;let f=this.lightCap,p=this.lightCap*.3,m=this.lightSum,h=this.lightSumD,g=d<1?.6:1,_,v;if(this.sharedLightCap){let e=m+h;_=v=(e>p?p*(1+Math.log(e/p))/e:1)*g}else _=(m>f?f*(1+Math.log(m/f))/m:1)*g,v=(h>p?p*(1+Math.log(h/p))/h:1)*g;let y=this.shared.lights;for(let e=0;e<this.lightN;e++)y.add(this.lightBuf[e],this.lightI[e]*(this.lightD[e]?v:_));this.lightSum=m+h;for(let e=0;e<r.length;e++)r[e].commit(a,n);c===0&&this.prefetch(n),this.afterUpdate(e),this.frameNo%120==0&&this.sweep(n),this.cpuMs=this.cpuMs*.9+(performance.now()-t)*.1}prefetch(e){let t=this.app.show.all(this.sys),n=0,r=t.length;for(;n<r;){let i=n+r>>1;t[i].t<=e?n=i+1:r=i}let i=performance.now();for(let r=n;r<t.length;r++){let n=t[r];if(n.t>e+Ws)break;if(this.cache.has(n.id)||this.prefetchFailed.has(n.id))continue;let a=new Us;a.cueT=n.t;try{this.app.show.paletteAt(n.t,this.palette),this.expand(n,a),this.deriveLights(a),a.lastFrame=this.frameNo,this.cache.set(n.id,a)}catch{this.prefetchFailed.add(n.id)}if(performance.now()-i>=Gs)break}}deriveLights(e){if(!(e.lights.length||!e.flashes.length||this.flashLightGain<=0)){e.derived=!0;for(let t of e.flashes)e.lights.push({...t,peak:t.peak*this.flashLightGain,a:t.pos,b:t.pos,radius:12+.2*Math.max(0,t.pos.y)})}}sweep(e){for(let[t,n]of this.cache)(n.used?this.frameNo-n.lastFrame>240:n.cueT<e-2||n.cueT>e+Ws+3)&&this.cache.delete(t);this.prefetchFailed.size>256&&this.prefetchFailed.clear()}checkInvalidation(){let e=this.app.show.revision!==this.revision,t=this.app.anchors;for(let n=0;n<Ks.length;n++){let r=t.get(Ks[n]);this.anchorRefs[n]!==r&&(this.anchorRefs[n]=r,e=!0)}e&&(this.revision=this.app.show.revision,this.invalidate())}invalidate(){this.cache.clear(),this.prefetchFailed.clear();for(let e of this.layers)e.reset()}setQuality(e){if(!this.app)return;if(this.quality&&this.quality.level===e.level&&this.layers.length){this.quality=e;return}this.quality=e,hn(e.level);let t=this.layers;this.layers=[],this.buildLayers(e);let n=this.layers;for(let e=0;e<n.length;e++){let r=t.findIndex(t=>t!==null&&t.name===n[e].name);if(r<0)continue;let i=t[r];i.adopt(n[e])&&(n[e].dispose(),n[e]=i,t[r]=null)}for(let e of t)e?.dispose();this.invalidate();for(let e of this.layers)e.mesh.visible=!1}setEnabled(e){if(this.enabled=e,!e)for(let e of this.layers)e.mesh.visible=!1}stats(){let e={cues:this.activeCues,cached:this.cache.size,cpuMs:+this.cpuMs.toFixed(3),flash:+this.flashSum.toFixed(2),light:+this.lightSum.toFixed(2)};for(let t of this.layers)e[`${t.name}.emitters`]=t.emitters,e[`${t.name}.particles`]=t.particles,e[`${t.name}.slots`]=`${t.usedSlots}/${t.maxSlots}`,t.dropped&&(e[`${t.name}.dropped`]=t.dropped),t.scaled<1&&(e[`${t.name}.scaled`]=+t.scaled.toFixed(2)),t.keepNow<1&&(e[`${t.name}.keep`]=t.keepNow),t.hidden&&(e[`${t.name}.hidden`]=t.hidden);return e}dispose(){for(let e of this.layers)e.dispose();this.layers=[],this.cache.clear()}pc(e,t=1){return Math.max(t,Math.round(e*this.quality.particleScale))}sub(e,t){return qe(e.seed^Math.imul(t+1,2654435769))&16777215}},Js=(e,t,n)=>{let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)};function Ys(e,t,n=!1){if(t<e.t0||t>e.t1)return 0;let r=t-e.t0,i;if(e.kind===0)i=n?e.peak*Js(0,.12,r)*(.3*Math.exp(-r/.3)+.28*Math.exp(-r/Math.max(.05,e.decay))):e.peak*(Math.exp(-r/.08)+.28*Math.exp(-r/Math.max(.05,e.decay)));else{let a=e.t1-e.t0;i=e.peak*Js(0,.08,r)*(1-Js(a-Math.max(.05,e.decay),a,r));let o=(qe(Math.floor(t*24)^e.pos.x*7|0)>>>8)/16777216;i*=n?.91+.08*(o-.5):.82+.18*o}if(e.strobe>0){if(n)i*=Xs;else{let n=t*e.strobe;i*=n-Math.floor(n)>.55?1.6:.25}}return i}var Xs=.45*1.6+.1375,Zs={red:[1,.075,.035],deepred:[1,.03,.02],blood:[.9,.02,.015],orange:[1,.36,.06],amber:[1,.52,.12],gold:[1,.6,.2],fire:[1,.33,.06],white:[1,.96,.9],silver:[.92,.95,1],warm:[1,.82,.6],cold:[.78,.88,1],ice:[.6,.82,1],blue:[.12,.26,1],deepblue:[.05,.1,.9],cyan:[.2,.9,1],green:[.28,1,.22],lime:[.6,1,.15],purple:[.55,.14,1],magenta:[1,.12,.62],pink:[1,.3,.62],uv:[.35,.1,1]},Qs={blue:.75,deepblue:.6,purple:.8,uv:.7,white:1.25,silver:1.2,gold:1.1};function $s(e,t,n,r){let i=typeof e==`string`&&e.length?e:r,a=Zs[i];return a?(n.setRGB(a[0],a[1],a[2]),Qs[i]??1):(pt(i,t,n,`primary`),tc(n))}function ec(e,t,n,r){let i=typeof e==`string`&&e.length?e:r;return i===`silver`?n.setRGB(.92,.95,1):(pt(i,t,n,`primary`),n)}function tc(e){let t=Math.max(e.r,e.g,e.b,1e-4);return e.multiplyScalar(1/t),1}function nc(e,t){if(Array.isArray(e)){let n=e.filter(e=>typeof e==`string`&&e.length>0);return n.length?n:t}return typeof e==`string`&&e.length?e.split(`,`).map(e=>e.trim()).filter(Boolean):t}function X(e,t,n=-1/0,r=1/0){let i=typeof e==`number`?e:typeof e==`string`?parseFloat(e):NaN;return Number.isFinite(i)?i<n?n:i>r?r:i:t}function rc(e,t){return typeof e==`string`&&e.length?e:t}function ic(e,t){return typeof e==`boolean`?e:e===`true`||e===1?!0:e===`false`||e===0?!1:t}var ac=84;function oc(e){let t=Math.abs(e.x);return t>ac&&e.z>0?Math.sign(e.x)*(t+e.z):e.x}function sc(e,t,n,r){let i=e.length,a=Array(i).fill(0);if(i===0)return a;let o=e.map((e,t)=>t),s=e.map(oc);switch(t){case`lr`:o.sort((e,t)=>s[e]-s[t]);break;case`rl`:o.sort((e,t)=>s[t]-s[e]);break;case`center_out`:o.sort((e,t)=>Math.abs(s[e])-Math.abs(s[t]));break;case`out_center`:o.sort((e,t)=>Math.abs(s[t])-Math.abs(s[e]));break;case`random`:o.sort((e,t)=>qe(n^e*7919)-qe(n^t*7919));break;case`alternate`:{let e=[...o].sort((e,t)=>s[e]-s[t]);for(let t=0;t<i;t++)a[e[t]]=t%2==(r&1)?0:-1;return a}default:return a}if(t===`center_out`||t===`out_center`){let e=-1,t=NaN;for(let n=0;n<i;n++){let r=Math.round(Math.abs(s[o[n]])*2)/2;r!==t&&(e++,t=r),a[o[n]]=e}return a}for(let e=0;e<i;e++)a[o[e]]=e;return a}function cc(e,t,n){let r=[...e].sort((e,t)=>e.x-t.x),i=[];for(let e of r){let t=i[i.length-1];t&&Math.abs(t[t.length-1].x-e.x)<4.5&&Math.sign(t[0].x)===Math.sign(e.x)?t.push(e):i.push([e])}let a=[],o=[],s=(e,t,r,i)=>{let o=Math.max(1,Math.round(e.distanceTo(t)/n));for(let n=+!i;n<=o;n++){let i=n/o,s=e.clone().lerp(t,i);s.y-=r*4*i*(1-i),a.push(s)}};for(let e of i){e.sort((e,t)=>e.y-t.y);let n=e[e.length-1],r=null,i=12;for(let e of t){let t=e.distanceTo(n);t<i&&e.y>n.y&&(i=t,r=e)}r&&e.push(n.clone().lerp(r,.85)),o.push(e[e.length-1]);for(let t=0;t+1<e.length;t++)s(e[t],e[t+1],0,t===0)}for(let e=0;e+1<o.length;e++){let t=o[e],n=o[e+1],r=t.distanceTo(n);Math.sign(t.x)!==Math.sign(n.x)||r>22||(s(t,n,r*.2,!1),a.pop())}return{points:a,tops:o}}var lc=[.35,.6,.82],uc=.93,dc=[3.8,5.4,3.4],fc=new u(-10.4,-7,.2);function pc(e,t=2,n=.42,r=.3,i=.3){let a={points:[],level:[],tops:[],bands:[]};for(let o of[-1,1]){let s=e.filter(e=>Math.sign(e.x)===o).sort((e,t)=>o*(t.x-e.x)),c=[];for(let e of s){let t=c[c.length-1];t&&Math.abs(t[t.length-1].x-e.x)<4.5?t.push(e):c.push([e])}if(c.length!==3||c.some(e=>e.length<2||e.length>3))return null;let l=c.map(e=>{let t=[...e].sort((e,t)=>e.y-t.y),n=t.length===3?lc:lc.slice(1);return(e,r=new u)=>{r.set(0,0,0);for(let i=0;i<t.length;i++){let a=1;for(let r=0;r<t.length;r++)r!==i&&(a*=(e-n[r])/(n[i]-n[r]));r.addScaledVector(t[i],a)}return r}}),d=l[0](.6).sub(l[2](.6)),f=l[1](.82).sub(l[1](.35)).clone().cross(d).normalize();f.z<0&&f.negate();let p=a.points.length,m=(e,n)=>{e.addScaledVector(f,r);for(let n=p;n<a.points.length;n++)if(a.points[n].distanceToSquared(e)<t*t*.2)return;a.points.push(e),a.level.push(n)},h=l.map(e=>e(uc)),g=h[2].clone().add(new u(fc.x*o,fc.y,fc.z)),_=0;for(let e=0;e<3;e++){let r=e===2,a=l[e],o=r?null:l[e+1],s=dc[e],c=r?i:1,u=a(uc).distanceTo(a(n)),d=r?0:Math.max(1,Math.round(u/(t*1.3)));for(let i=0;i<=d;i++){let l=i===d,p=r?uc:n+(uc-n)*i/d,v=r?1:i/d,y=a(p),b=l?r?g:h[e+1]:o(p),x=l?1:v**2,S=y.distanceTo(b)*c,C=Math.max(1,Math.round(S/t)),w=i%2==1&&!l,T=[0];for(let e=1;e<=C;e++)T.push((w&&e<C?e-.5:e)/C*c);w&&T.push((C-.5)/C*c);for(let e of T){let t=y.clone().lerp(b,e),n=2*e*(1-e)*x;t.y-=n*s,t.addScaledVector(f,-.5*n),m(t,v)}!r&&i>0&&(_+=S*u/d)}}for(let e of l){let t=e(1);a.tops.push(t.clone()),m(t,1)}let v=[];for(let e=p;e<a.points.length;e++)v.push(e);let y=l[0](n+(uc-n)*.7).addScaledVector(f,1.5),b=l[2](n+(uc-n)*.7).addScaledVector(f,1.5);a.bands.push({a:y,b,n:f,area:_,units:v})}return a}function mc(e,t,n=3){if(e.length<2)return e.map(e=>e.clone());let r=[...e].sort((e,t)=>oc(e)-oc(t)||e.z-t.z),i=[];for(let e=0;e<r.length&&(i.push(r[e].clone()),e!==r.length-1);e++){let a=r[e],o=r[e+1],s=a.distanceTo(o);if(s>t&&s<t*(n+1)*2.5){let e=Math.min(n,Math.ceil(s/t)-1);for(let t=1;t<=e;t++)i.push(a.clone().lerp(o,t/(e+1)))}}return i}function hc(e,t){if(t>=e.length)return e.map(e=>e.clone());let n=[...e].sort((e,t)=>e.x-t.x),r=[];if(t<=1)return r.push(n[Math.floor(n.length/2)].clone()),r;for(let e=0;e<t;e++)r.push(n[Math.round(e*(n.length-1)/(t-1))].clone());return r}function gc(e,t=new u){if(t.set(0,0,0),!e.length)return t;for(let n of e)t.add(n);return t.multiplyScalar(1/e.length)}function _c(e){let t=1;for(let n of e)t=Math.max(t,Math.abs(n.x));return t}function vc(e,t,n,r=0){let i=t*Math.PI/180,a=Math.abs(e)<.5?0:Math.sign(e);return n.set(Math.sin(i)*a,Math.cos(i),r).normalize()}function yc(e,t,n=40,r=24){let i=[];for(let n=0;n<e.length;n++)(!t||t[n]>=0)&&i.push(n);if(!i.length)return[];i.sort((t,n)=>oc(e[t])-oc(e[n])||e[t].z-e[n].z);let a=[],o=[i[0]];for(let t=1;t<i.length;t++){let s=e[i[t]];(s.distanceTo(e[o[0]])>n||s.distanceTo(e[i[t-1]])>r)&&(a.push(o),o=[]),o.push(i[t])}return a.push(o),a}function bc(e,t){let n=e.length,r=new Int32Array(n).fill(-1),i=t*t,a=0;for(let t=0;t<n;t++){if(r[t]>=0)continue;r[t]=a;let o=[t];for(;o.length;){let t=o.pop();for(let s=0;s<n;s++)r[s]<0&&e[t].distanceToSquared(e[s])<=i&&(r[s]=a,o.push(s))}a++}let o=Array.from({length:a},()=>[]);for(let t=0;t<n;t++)o[r[t]].push(e[t]);return o}var xc=16384,Sc=32768,Cc=65536,wc=131072,Tc=`
${Qt}
uniform float uSegments;

#define FW_SHED ${xc}
#define FW_SWIM ${Sc}
#define FW_CURL ${Cc}
#define FW_TRUE ${wc}

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
  float curl; vec3 ce1; vec3 ce2; float cv; float ca;
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
    // the turn stops after s.ca seconds: from there the star flies on straight (drag-slowed)
    float tc = min(t, s.ca);
    vec2 c = curlPos(s.k, s.curl, tc);
    if (t > tc) {
      float a = s.curl * tc;
      c += vec2(cos(a), sin(a)) * (exp(-s.k * tc) * (1.0 - exp(-s.k * (t - tc))) / s.k);
    }
    c *= s.cv;
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
    float a = s.curl * min(t, s.ca);
    return ballisticVel(vec3(0.0), s.k, s.acc, t) + (s.ce1 * cos(a) + s.ce2 * sin(a)) * E;
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
  int nRec = max(int(r5.w + 0.5), 1);
  // instance -> star through the emitter's index permutation (FxLayer): a layer over budget draws a
  // stable, evenly spread, nested subset of it, with a little light compensation
  i = particleIndex(i, sl.w, nRec);
  float thinGain = n < nRec ? pow(float(n) / float(nRec), -0.3) : 1.0;

  // derived indexing: crossette children, crackle pops and shed sparks share the star maths (always
  // from the recorded count: the direction / phase of a star never depends on how many are drawn)
  int bi = i;
  int bn = nRec;
  int sub = 0;
  int pops = 0;
  int shed = 0;
  if ((flags & F_CROSSETTE) != 0) { bi = i / 4; bn = max(nRec / 4, 1); sub = i - bi * 4; }
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
  s.curl = 0.0; s.ce1 = vec3(0.0, 1.0, 0.0); s.ce2 = vec3(1.0, 0.0, 0.0); s.cv = 0.0; s.ca = 1e9;
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
    if (r10.y > 0.0) s.ca = r10.y;
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
    // colour-true crackle keeps the star colour (a red canopy crackles red); default: white-hot flashes
    bool trueCol = (flags & FW_TRUE) != 0;
    col = trueCol ? r3.rgb : mix(r3.rgb, vec3(1.0, 0.95, 0.85), 0.55);
    I = r3.w * (1.0 - tt / pd) * (0.6 + 0.8 * hf(pk ^ 11u));
    width = r6.x;
    tS = tp;
    hot = trueCol ? 0.3 : 1.0;
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
    // (calm, photosensitivity option: no blinking, the spark burns at the blink's average)
    float blink = uCalm > 0.5 ? 0.65 : step(0.35, hf(pk ^ uint(floor(uTime * 26.0 + hf(pk ^ 12u) * 9.0))));
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

    // photosensitivity option: burst stars swell in over ~0.12 s instead of popping on (continuous
    // emitters keep their nozzle bright)
    float attack = smoothstep(0.0, max(r11.x, uCalm > 0.5 && !cont ? 0.12 : 0.001), tau);
    float lf = tau / lifeEnd;
    // a pearl comet does not fade into its pearl, it flares into it
    float headI = attack * ((flags & F_PEARL) != 0 ? 1.0 : 1.0 - smoothstep(0.8, 1.0, lf));
    if ((flags & F_FLICKER) != 0) {
      // calm: a gentle <= 2.5 Hz shimmer (+-12 %) instead of the 22 Hz twinkle
      if (uCalm > 0.5) headI *= 0.88 + 0.24 * rnd(key, uint(floor(uTime * 2.5 + rnd(key, 15u) * 50.0)) + 100u);
      else headI *= 0.65 + 0.7 * rnd(key, uint(floor(uTime * 22.0 + rnd(key, 15u) * 50.0)) + 100u);
    }
    if ((flags & F_STROBE) != 0) {
      if (uCalm > 0.5) {
        // calm: the strobe star breathes at <= 2.5 Hz (random phase per star) around its average (0.4 x 2.2)
        float ph = fract(uTime * min(r8.z, 2.5) + rnd(key, 13u));
        headI *= 0.88 * (0.7 + 0.3 * cos(6.2831853 * ph));
      } else {
        float ph = fract(uTime * r8.z + rnd(key, 13u));
        headI *= step(0.6, ph) * 2.2;
      }
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
      // round 12: the young head of a white / gold star or comet burns white-hot (the camera clips it,
      // v1511.75, v1530): white stars turn near-neutral, gold ones partly, metal-salt colours not
      vec3 cn1 = c1 / max(max(c1.r, max(c1.g, c1.b)), 1e-4);
      float sat1 = 1.0 - min(cn1.r, min(cn1.g, cn1.b));
      float gold1 = step(cn1.b, cn1.g + 0.02) * step(cn1.g, cn1.r + 0.02) * smoothstep(0.12, 0.3, cn1.g);
      float whiteK = mix(gold1 * WH_GOLD, WH_WHITE, 1.0 - smoothstep(0.2, 0.4, sat1));
      float heat = (1.0 - smoothstep(0.0, HEAT_TRAIL, cool)) * (1.0 - smoothstep(0.35, 1.0, lf));
      col = mix(col, WHITE_HOT * max(c1.r, max(c1.g, c1.b)), whiteK * heat);
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
  // round 12: HDR white-hot core of white / gold heads (x HOT_K, near-neutral), see glsl.ts
  // (colour-true crackle, FW_TRUE: the pops keep their authored colour, no white-hot core, v539-545:
  // the S9 canopy crackles red / pink, not white)
  float wkS = (flags & FW_TRUE) != 0 && pops > 0 ? 0.0 : 1.0 - s2;
  // (light-neutral: the core gains what the soft body gives up, so a fan turns whiter, not brighter)
  float hotAdd = hot * (HOT_K - 1.0) * wkS;
  hot += hotAdd;
  float bodyK = 1.0 / (1.0 + hotAdd * CORE_SHARE);
  hotCol = mix(hotCol, WHITE_HOT, wkS * 0.7);

  // sparks die on the ground (no spark ever tunnels through the field)
  I *= smoothstep(-0.3, 0.25, P.y) * thinGain;
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
  // round 12: sensor clipping of white / gold stars far brighter than the camera's white (glsl.ts)
  float cmx2 = max(col.r, max(col.g, col.b));
  // (only the head clips: a trail keeps its colour; pops and shed sparks are points)
  float headW = pops > 0 || shed > 0 ? 1.0 : 1.0 - smoothstep(0.0, CLIP_TRAIL, sPar);
  col = mix(col, WHITE_HOT * cmx2, wkS * headW * smoothstep(CLIP_LO, CLIP_HI, I * gain * cmx2));
  vCol = col * I * gain * fog * bodyK;
  vHot = hotCol * I * gain * fog * hot;
  vUv = vec2(side, cap);
  vTS = tS;
  vGlit = glit;
  vKey = float(key & 0xffffu);
}
`,Ec=`
${Qt}
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
    // calm (photosensitivity option): the glitter twinkles at <= 2.5 Hz with a smaller swing, same mean
    bool calmG = uCalm > 0.5;
    float tw = hf(k ^ hashu(uint(floor(uTime * (calmG ? 2.5 : 16.0) + hf(k) * 4.0))));
    float g = calmG ? (tw > 0.5 ? 1.5 : 0.8) : (tw > 0.5 ? 2.2 : 0.1);
    col *= mix(1.0, g, vGlit);
  }
  gl_FragColor = vec4(max(col, vec3(0.0)), 0.0);
}
`,Dc={peony:{stars:110,minStars:28,dist:H.SPHERE,drag:1.9,burn:[1.3,1.9],trail:.12,glitter:0,head:.3,tailW:.45,flags:U.FLICKER,grav:-9.81,trailGain:.3,droop:0,intensity:22,color:`red`,radiusK:1,jitter:.1,liftGain:1,flash:1},chrysanthemum:{stars:120,minStars:30,dist:H.SPHERE,drag:1.7,burn:[1.6,2.2],trail:.7,glitter:.45,head:.26,tailW:.32,flags:U.COOL|U.FLICKER,grav:-9.81,trailGain:.22,droop:2,intensity:18,color:`gold`,radiusK:1,jitter:.1,liftGain:1,flash:1},dahlia:{stars:44,minStars:18,dist:H.SPHERE,drag:1.35,burn:[1.8,2.4],trail:.3,glitter:0,head:.5,tailW:.55,flags:U.FLICKER,grav:-9.81,trailGain:.35,droop:0,intensity:30,color:`red`,radiusK:.85,jitter:.14,liftGain:1,flash:1},willow:{stars:70,minStars:24,dist:H.SPHERE,drag:2.8,burn:[3.4,4.6],trail:2.8,glitter:.75,head:.2,tailW:.55,flags:U.COOL,grav:-12,trailGain:.38,droop:3.5,intensity:10,color:`gold`,radiusK:.9,jitter:.12,liftGain:1.2,flash:.7},palm:{stars:8,minStars:6,dist:H.SPHERE,drag:1.05,burn:[2.3,2.9],trail:1.6,glitter:.9,head:.7,tailW:.45,flags:U.COOL|U.FLICKER,grav:-9.81,trailGain:.45,droop:2.5,intensity:26,color:`gold`,radiusK:1.1,jitter:.3,liftGain:4,flash:.9},crossette:{stars:14,minStars:8,dist:H.SPHERE,drag:1.4,burn:[1.9,2.3],trail:.3,glitter:.3,head:.3,tailW:.4,flags:U.CROSSETTE|U.FLICKER,grav:-9.81,trailGain:.3,droop:1,intensity:20,color:`gold`,radiusK:1,jitter:.25,split:.75,liftGain:1,flash:.9,flashSize:.45},ring:{stars:60,minStars:24,dist:H.RING,drag:1.8,burn:[1.5,2],trail:.14,glitter:0,head:.32,tailW:.5,flags:U.FLICKER,grav:-9.81,trailGain:.35,droop:0,intensity:22,color:`blue`,radiusK:1,jitter:.04,liftGain:1,flash:.9},strobe:{stars:64,minStars:22,dist:H.SPHERE,drag:2.1,burn:[2.4,3.4],trail:0,glitter:0,head:.26,tailW:1,flags:U.STROBE,grav:-9.81,trailGain:0,droop:0,intensity:34,color:`white`,radiusK:.95,jitter:.22,hz:11,liftGain:1,flash:.6,flashSize:.5},crackle:{stars:64,minStars:20,dist:H.SPHERE,drag:1.9,burn:[1.05,1.5],trail:.45,glitter:.35,head:.24,tailW:.38,flags:U.COOL,grav:-9.81,trailGain:.22,droop:1,intensity:15,color:`gold`,radiusK:1.2,jitter:.2,pops:6,popSpread:.75,liftGain:1,flash:.8,flashSize:.55},brocade:{stars:70,minStars:24,dist:H.SPHERE,drag:1.8,burn:[2.3,3.1],trail:1.1,glitter:.9,head:.22,tailW:.4,flags:U.COOL|U.FLICKER,grav:-9.81,trailGain:.16,droop:2.5,intensity:16,color:`gold`,radiusK:1.15,jitter:.12,shed:6,liftGain:1,flash:.8,flashSize:.7},kamuro:{stars:130,minStars:40,dist:H.SPHERE,drag:2.5,burn:[3.6,5],trail:2.4,glitter:1,head:.2,tailW:.5,flags:U.COOL|U.FLICKER,grav:-11,trailGain:.3,droop:3,intensity:11,color:`gold`,radiusK:1.1,jitter:.1,liftGain:1.2,flash:.7},glitter:{stars:110,minStars:34,dist:H.SPHERE,drag:2.7,burn:[3.8,5.2],trail:.35,glitter:.6,head:.18,tailW:.5,flags:U.STROBE|U.COOL,grav:-10.5,trailGain:.2,droop:2,intensity:18,color:`white`,radiusK:1.15,jitter:.2,hz:14,shed:8,liftGain:1,flash:.6,flashSize:.6},spider:{stars:30,minStars:14,dist:H.SPHERE,drag:3.4,burn:[.55,.85],trail:.4,glitter:.2,head:.2,tailW:.55,flags:U.COOL|U.FLICKER,grav:-6,trailGain:.35,droop:.5,intensity:26,color:`white`,radiusK:.8,jitter:.25,liftGain:1,flash:.9,flashSize:.6},swimmer:{stars:5,minStars:4,dist:H.SPHERE,drag:2.4,burn:[3.2,4.2],trail:.32,glitter:0,head:.4,tailW:.45,flags:Sc|U.FLICKER,grav:-3.2,trailGain:.45,droop:0,intensity:40,color:`red`,radiusK:.22,jitter:.35,swim:2.6,swimHz:5.5,liftGain:1,flash:.5,flashSize:.4}};Dc.fish=Dc.swimmer,Dc.hummer=Dc.swimmer;var Oc=Object.keys(Dc);function kc(e){return typeof e==`string`&&Dc[e]||Dc.peony}var Ac=0,jc=1,Mc=2,Nc=3,Pc=new I(.6,.6,.62),Fc=new I(1,1,1),Ic=new I(1,.55,.2),Lc=7.5,Rc=.3,zc=.42,Bc=Math.PI/180,Vc=class extends qs{name=`fireworks`;sys=`fireworks`;sharedLightCap=!0;c1=new I;c2=new I;c3=new I;tmpA=new u;tmpB=new u;acc=new u;buildLayers(e){let t=e.particleScale,n=this.shared.puffLayer(`fw-smoke`,Math.round(8192*Math.max(.35,t)),1024,11),r=this.shared.puffLayer(`fw-flash`,2048,1024,13),i=this.starLayer(e,Math.round(9e4*Math.max(.15,t)),2048,15),a=this.starLayer(e,Math.round(9e4*Math.max(.15,t)),2048,15,!0);this.layers=[n,r,i,a];for(let e of this.layers)this.app.scene.add(e.mesh)}starLayer(e,t,n,r,i=!1){let a=i?1:e.level===`mobile`?3:e.level===`medium`?5:e.level===`high`?8:10,o=i?`fw-points`:`fw-stars`,s=new C({name:`fx-${o}`,uniforms:{...this.shared.uniforms,uSegments:{value:a}},vertexShader:Tc,fragmentShader:Ec,transparent:!0,depthWrite:!1,depthTest:!0,blending:5,blendEquation:100,blendSrc:201,blendDst:205});return new Fn({name:o,slotSize:32,maxEmitters:n,maxParticles:t,geometry:i?Ln():In(a),material:s,renderOrder:r})}lifetime(e){let t=e.p,n=X(t.height,90,10,400),r=t.rise===void 0?Yc(n):X(t.rise,0,0,10),i=ic(t.smoke,!1)?12:0;switch(e.fx){case`shell`:case`salvo`:return e.dur+r+6+24+X(t.stagger,0,0,2)*X(t.count,8,1,60);case`comet`:return e.dur+X(t.stagger,0,0,2)*X(t.count,10,1,200)*Math.max(1,X(t.per,1,1,60))+5+(t.end?24:9)+i;case`cake`:return e.dur+5+(t.type?24:9)+i;case`mine`:return e.dur+12;case`finale`:return e.dur+r+26;case`flare`:return Math.max(.5,e.dur)+14;default:return e.dur}}expand(e,t){this.expandCue(e,t);let n=t.emitters;for(let e=0;e<n.length;e++){let t=n[e];t.layer===Mc&&t.f[V.FLAGS]&(U.POPS|16384)&&(t.layer=Nc)}}expandCue(e,t){switch(e.fx){case`shell`:this.shellCue(e,t);break;case`salvo`:this.salvo(e,t);break;case`comet`:this.comets(e,t);break;case`cake`:this.cake(e,t);break;case`mine`:this.mines(e,t);break;case`finale`:this.finale(e,t);break;case`flare`:this.flares(e,t)}}points(e,t){return this.app.anchors.resolve(e.targets,t).map(e=>e.clone())}launchPoints(e,t,n=!0){let r=e.p,i=this.points(e,t),a=i,o=Uc(r.x),s=Wc(r.pos);if(s.length)a=ic(r.mirror,!1)?[...s,...s.filter(e=>Math.abs(e.x)>.01).map(e=>new u(-e.x,e.y,e.z))]:s;else if(o.length){let e=Uc(r.z),t=Uc(r.y);a=(ic(r.mirror,!1)?[...o,...o.filter(e=>Math.abs(e)>.01).map(e=>-e)]:o).map((n,r)=>{let a=null,s=1/0;for(let e of i){let t=Math.abs(e.x-n)+Math.abs(Math.sign(e.x)-Math.sign(n))*.01;t<s&&(s=t,a=e)}let c=r%o.length,l=t.length?t[c%t.length]:a?a.y:0,d=e.length?e[c%e.length]:a?a.z:0;return new u(n,l,d)})}else if(r.z!==void 0&&Uc(r.z).length){let e=Uc(r.z)[0];a=i.map(t=>t.setZ(e))}let c=rc(r.side,``);c===`left`?a=a.filter(e=>e.x<-.01):c===`right`&&(a=a.filter(e=>e.x>.01));let l=Uc(r.absx);l.length>=2&&(a=a.filter(e=>Math.abs(e.x)>=l[0]-.01&&Math.abs(e.x)<=l[1]+.01));let d=Uc(r.points);if(d.length&&a.length){let e=[...a].sort((e,t)=>e.x-t.x),t=[];for(let n of d){let r=Math.round(n<0?e.length+n:n);r>=0&&r<e.length&&!t.includes(e[r])&&t.push(e[r])}a=t}let f=n?this.betweenCount(e):0;if(f>0&&a.length>1){let e=[];for(let t of yc(a,void 0,1/0,24))for(let n=0;n<t.length;n++){let r=a[t[n]];if(e.push(r),n+1>=t.length)continue;let i=a[t[n+1]];for(let t=1;t<=f;t++)e.push(r.clone().lerp(i,t/(f+1)))}a=e}let p=Uc(r.offset);if(p.length){let e=p[0]??0,t=p[1]??0,n=p[2]??0;a=a.map(r=>new u(r.x+(Math.abs(r.x)<.5?0:Math.sign(r.x))*e,r.y+t,r.z+n))}return a}betweenCount(e){return this.quality.level===`mobile`?0:Math.round(X(e.p.between,0,0,8))}gravAcc(e,t=1){return this.acc.copy(this.shared.wind).multiplyScalar(e*t).add(this.tmpB.set(0,-9.81,0))}addShell(e,t,n,r,i,a,o,s){let{tL:c,tb:l,radius:u}=s,d=l-c;if(s.lift&&d>.05){let o=cn(this.tmpA,r,i,Rc,this.gravAcc(Rc),d),u=n.liftGain,f=u>2,p=s.liftCol??null;e.add(new W(H.SINGLE,p?U.FLICKER:U.COOL|U.FLICKER).on(Mc).originV(r).time(c).dir(o.x,o.y,o.z).speed(o.length()).physics(Rc,-9.81).color(f?a:p??Ic,(f?7:p?4.5:2.2)*Math.min(u,2)).life(d).emit(1).size(f?.3:p?.14:.11,.6).trail(f?.9:.5,f?.9:.7).seed(t^17).set(V.Y0,f?1.1:1.3).set(V.Y2,1.5).set(V.Y3,1).set(V.Z0,.02).window(c,l+.9)),e.add(new W(H.SINGLE,0).on(jc).origin(r.x,r.y+.8,r.z).time(c).dir(0,1,0).speed(2).physics(1,0).color(this.c2.copy(p??Ic).lerp(Fc,.5),7).life(.25).emit(1).size(1.4,1).trail(1,1).seed(t^18).set(V.X0,.05).set(V.Z3,rn.FLASH).window(c,c+.3))}let f=n.drag,p=s.burnK??1,m=n.burn[0]*p,h=n.burn[1]*p,g=(m+h)*.5,_=u*f/(1-Math.exp(-f*g)),v=(n.flags&U.CROSSETTE)!==0,y=Math.max(4,Math.round(this.pc(n.stars,n.minStars)*(s.starsK??1))),b=n.flags,x=n.pops?s.col2:null;s.col2&&!x&&(n===Dc.chrysanthemum||n===Dc.brocade||n===Dc.peony?b|=U.PISTIL:b|=U.COLORCHANGE);let S=l+h+n.trail+.35,C=new W(n.dist,b).on(Mc).originV(i).time(l).speed(_*.93,_*1.06).physics(f,n.grav).color(a,n.intensity*o*2.2).life(m,h).emit(v?y*4:y).size(n.head,n.tailW).trail(n.trail,n.glitter).seed(t).hz(n.swimHz??(n.hz?n.hz*(.85+.3*on(t^7)):0)).set(V.Y0,n.trailGain).set(V.Y1,n.swim??0).set(V.Y2,n.droop).set(V.Y3,1).set(V.Z0,.03).set(V.Z2,n.jitter).set(V.Z3,n.wave??0).window(l,S);if(s.col2&&!x&&C.color2(s.col2,.55),v&&C.set(V.X0,n.split??.75).set(V.X1,_*.42),n.dist===H.RING){let e=(on(t^3)-.5)*1.3,n=(on(t^5)-.5)*.8;C.axis(Math.sin(e),Math.sin(n)*.6,Math.cos(e))}if(e.add(C),n.pops){let t=n.pops,r=(n.popSpread??.7)*p,i=new W(n.dist,0).copyFrom(C),c=s.popCol??null;i.f[V.FLAGS]=n.flags&~U.FLICKER|U.POPS|(c?wc:0),i.on(Mc).color(c?this.c2.copy(c):x?this.c2.copy(x).lerp(a,.2):this.c2.copy(a).lerp(Fc,.65),(c?30:24)*o).emit(y*t).size(.26,1).set(V.X1,t).set(V.X2,r).set(V.X3,u*.3).window(l+m,l+h+r+.3),e.add(i)}if(n.shed){let t=Math.max(2,Math.round(n.shed*Math.min(1,.45+this.quality.particleScale*.7))),r=new W(n.dist,0).copyFrom(C);r.f[V.FLAGS]=b&(U.CROSSETTE|U.PISTIL|Sc)|xc,r.on(Mc).color(this.c2.copy(a).lerp(Fc,.3),16*o).emit((v?y*4:y)*t).size(.13,1).set(V.X1,t).set(V.X2,.35).set(V.X3,.8).set(V.Z3,.4).window(l,l+h+1.1),e.add(r)}let w=n.flashSize??1;e.add(new W(H.SINGLE,0).on(jc).originV(i).time(l).dir(0,1,0).speed(.1).physics(1,0).color(this.c2.copy(a).lerp(Fc,.45),9*o*n.flash*(.5+.5*w)).life(.28).emit(1).size(u*.28*w,u*.18*w).trail(.5,1).seed(t^33).set(V.X0,.055).set(V.Z3,rn.FLASH).window(l,l+.6)),s.smoke>0&&e.add(new W(H.SPHERE,U.SELFLIT).on(Ac).originV(i).time(l).speed(u*.55,u*1.15).physics(3,.15).color(Pc,.1).color2(this.c2.copy(a).multiplyScalar(.8*o),0).litUntil(l+h).life(16,24).emit(s.smoke).size(u*.2,u*.5).trail(.5,.25).seed(t^49).set(V.X0,g*.45).set(V.X1,.05).set(V.X2,.9).set(V.Y0,.8).set(V.Y2,.02).set(V.Y3,1).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(l,l+24.5)),e.flashes.push({kind:0,t0:l,t1:l+h,color:a.clone(),peak:(.35+u/45)*n.flash*s.flashK*Math.min(1.5,o),decay:g*.45,pos:i.clone(),strobe:n.hz??0})}smokeCount(e){return Math.max(1,Math.round(e*Math.min(1,this.quality.particleScale*1.4)))}shellParams(e,t){let n=e.p,r=kc(n.type);return{spec:r,radius:X(n.size,Kc(t)*r.radiusK,2,150),lifeK:n.life===void 0?1:X(n.life,1,.2,12)/((r.burn[0]+r.burn[1])*.5)}}liftColor(e){let t=e.p.liftColor;return typeof t!=`string`||!t?null:($s(t,this.palette,this.c2,`white`),this.c2.clone())}popColor(e,t){let n=e.p.popColor??e.p.crackleColor;return n===!0||n===`star`?t.clone():typeof n!=`string`||!n||n===`false`?null:($s(n,this.palette,this.c3,`red`),this.c3.clone())}shellCue(e,t){let n=e.p,r;if(n.x!==void 0||n.z!==void 0)r=[new u(X(n.x,0),0,X(n.z,-60))];else if(e.targets.every(e=>e===`all`||e===`left`||e===`right`||e===`center`)){let t=this.points(e,`fireworks_back`);r=t.length?[t[Math.floor(on(e.seed)*t.length)%t.length]]:[new u(0,0,-60)]}else r=this.points(e,`fireworks_back`);let i=X(n.height,90,15,400),{spec:a,radius:o,lifeK:s}=this.shellParams(e,i),c=nc(n.color,[a.color]),l=this.liftColor(e);r.forEach((r,d)=>{let f=this.sub(e,d),p=Math.max(i*(1+(on(f^9)-.5)*.06),r.y+12),m=n.rise===void 0?Yc(p-r.y):X(n.rise,0,0,10),h=e.t+m+X(n.stagger,0,0,3)*d,g=new u(r.x+(on(f^1)-.5)*.06*p,p,r.z+(on(f^2)-.5)*.04*p),_=$s(c[d%c.length],this.palette,this.c1,a.color),v=this.c1.clone(),y=n.color2?($s(n.color2,this.palette,this.c2,`white`),this.c2.clone()):null;this.addShell(t,f,a,r,g,v,_,{tL:h-m,tb:h,radius:o,smoke:this.smokeCount(5),lift:m>0,flashK:1,col2:y,liftCol:l,popCol:this.popColor(e,v),burnK:s})})}salvo(e,t){let n=e.p,r=this.points(e,`fireworks_back`),i=gc(r,new u);i.x=X(n.x,i.x,-400,400),i.z=X(n.z,i.z,-400,400);let a=Math.round(X(n.count,Math.max(3,Math.min(r.length,12)),1,80)),o=X(n.spread,120,0,600),s=X(n.depth,6,0,400),c=X(n.height,90,15,400),{spec:l,radius:d,lifeK:f}=this.shellParams(e,c),p=nc(n.color,[l.color]),m=rc(n.pattern,`line`),h=X(n.stagger,0,0,3),g=n.color2?($s(n.color2,this.palette,this.c2,`white`),this.c2.clone()):null,_=this.liftColor(e);for(let r=0;r<a;r++){let v=this.sub(e,r),y=a>1?r/(a-1)-.5:0,b=new u(i.x+o*y+(a>1?(on(v^8)-.5)*.45*(o/(a-1)):0),i.y,i.z+(on(v^10)-.5)*s),x=c;m===`v`?x=c*(.75+.75*Math.abs(y)):m===`arc`?x=c*(1.1-.8*y*y):m===`random`&&(x=c*(.8+.4*on(v^4))),x=Math.max(x*(1+(on(v^9)-.5)*.2),b.y+12);let S=n.rise===void 0?Yc(x-b.y):X(n.rise,0,0,10),C=h>0?h*r:on(v^6)*.28,w=e.t+C+S,T=new u(b.x+(on(v^1)-.5)*.04*x,x,b.z+(on(v^2)-.5)*.04*x),E=$s(p[r%p.length],this.palette,this.c1,l.color),D=this.c1.clone();this.addShell(t,v,l,b,T,D,E,{tL:w-S,tb:w,radius:d*(.85+.3*on(v^3)),smoke:this.smokeCount(a>10?3:4),lift:S>0,flashK:a>8?.7:1,col2:g,liftCol:_,popCol:this.popColor(e,D),burnK:f})}}cometLook(e,t,n){let r=e.p,i=r.tailColor??r.color2,a=null;typeof i==`string`&&i&&($s(i,this.palette,this.c2,`gold`),a=this.c2.clone());let o=ic(r.serpent,!1);return{col:new I,gain:1,tailCol:a,head:.3*X(r.width,1,.3,4),tail:X(r.tail,0,0,5),trailGain:.07*X(r.tailGain,1,0,8),glitter:X(r.glitter,n>1?.25:.4,0,1),crackle:ic(r.crackle,!1),wave:X(r.wave,o?2.2:.9,0,6),intensity:X(r.intensity,1,0,3),end:t,endSize:X(r.endSize,0,0,60),serpent:o,zipper:ic(r.zipper,!1),spray:n,smoke:ic(r.smoke,o),curl:X(r.curl,0,-1080,1080)*Bc,arc:X(r.arc,0,0,1440)*Bc,pearlTime:X(r.pearlTime,1,.05,4),glow:X(r.glow,0,0,3),popCol:null,popStar:!1,endBurn:X(r.endBurn,1,.2,3),wriggle:X(r.wriggle,0,0,6),wriggleHz:X(r.wriggleHz,0,0,40),gerb:X(r.gerb,0,0,3)}}lookPops(e,t){let n=e.p.popColor??e.p.crackleColor;t.popStar=n===!0||n===`star`,t.popCol=t.popStar?null:this.popColor(e,t.col)}cometFan(e,t,n,r,i,a,o,s,c,l,d,f=null,p=1){let{col:m,gain:h,end:g}=d,_=d.spray>1,v=_&&d.curl!==0,y=v?.35:_?1.3:zc,b=v?-3:-9.81,x=Hc(.5+l*.013,.6,1.8),S=_?ln(l,y):Jc(l,y,x),C=_?un(S,y):x,w=g===`pearl`||g===`pops`||g===`none`?void 0:Dc[g],T=g===`pearl`,E=0;if(d.curl!==0){let e=this.tmpA.copy(r).cross(i),t=n.x<-.5?-1:1;E=e.lengthSq()>1e-6&&Math.abs(e.normalize().z)>.2?-t*d.curl*Math.sign(e.z):d.curl}let D=E&&d.arc>0?d.arc/Math.abs(E):1/0,O=Math.min(C,D),k=d.wriggle>0&&!E,A=U.COOL|U.FLICKER|((d.serpent||k)&&!E?U.SERPENT:0)|(T?U.PEARL:0)|(d.zipper?U.ZIPPER:0)|(E?Cc:0),ee=d.popStar?m:d.popCol,te=d.tail>0?d.tail:_?.42:d.serpent?.95:Hc(O*.65,.4,1.1),j=_?[.55,1]:[.95,1.05],ne=e=>(e.on(Mc).physics(y,b).color(m,(_?16:24)*h*d.intensity).size(_?d.head*.55:d.head,_?.6:.3).trail(te,_?.7:.45).set(V.X0,d.pearlTime).set(V.X2,_?.6:.3).set(V.X3,_?0:.8).set(V.Y0,_?.3:d.trailGain).set(V.Y1,k?d.wriggle:d.serpent?.35:0).set(V.Y2,_?2.5:1.2).set(V.Y3,.6).set(V.Z0,.03).set(V.Z1,2.2).set(V.Z3,d.wave),k&&d.wriggleHz>0&&e.hz(d.wriggleHz),E&&(e.hz(E),e.set(V.Y1,Number.isFinite(D)?D:0)),d.tailCol&&e.color2(d.tailCol,-1),e),M=(t,n,r)=>{if(d.glitter<=0&&!d.crackle)return;let i=d.crackle,a=Math.min(1,.45+this.quality.particleScale*.7)*(this.quality.level===`mobile`&&n>=4?.5:1)*p,o=i?7:_?Math.max(1,Math.round(8*d.glitter*a)):Math.max(3,Math.round(30*d.glitter*a)),s=new W(0,0).copyFrom(t);s.f[V.FLAGS]=t.f[V.FLAGS]&(U.SERPENT|U.ZIPPER|Cc)|xc;let c=i?ee?this.c2.copy(ee):this.c2.copy(m).lerp(Fc,.75):this.c2.copy(m).lerp(Fc,.35);s.on(Mc).color(c,(i?36:4+22*d.glitter)*h*d.intensity).color2(d.tailCol??m,-1).emit(n*o,0,t.f[V.STAGGER]).size(i?.2:.13,1).set(V.X1,o).set(V.X2,i?.7:.35).set(V.X3,i?2.2:.9).set(V.Z3,i?.075:.45).window(t.start,r+.9),e.add(s)},re=(t,r,a,o,s,c)=>{if(d.gerb<=0)return;let l=Math.max(3,Math.round(8*d.gerb*Math.min(1,.5+this.quality.particleScale*.6))),u=Hc(O*.95,.3,2.5);e.add(new W(H.FAN,A&(U.SERPENT|Cc)|U.COOL).on(Mc).originV(n).time(o).dirV(t,r).axisV(i).physics(y,b).speed(S*.7,S*1).life(O*.88,O*1.02).emit(a*l,0,s/l).color(this.c2.copy(d.tailCol??m),11*h*d.intensity).size(d.head*.45,.8).trail(u,.15).seed((c^24143)&16777215).hz(E||(k&&d.wriggleHz>0?d.wriggleHz:0)).set(V.X2,.35).set(V.Y0,.22*Math.min(2,d.gerb)).set(V.Y1,E?Number.isFinite(D)?D:0:k?d.wriggle:d.serpent?.35:0).set(V.Y2,1.2).set(V.Y3,.6).set(V.Z0,.03).set(V.Z2,r>0?.07:.16).set(V.Z3,d.wave).window(o,o+s*a+O*1.02+u+.4))},ie=f!==null&&!E;if(!w){let l=ne(new W(ie?H.LINE:o>1?H.FAN:H.SINGLE,A)).originV(n).time(s).dirV(r,ie?Math.max(.04,a):a).axisV(ie&&f?f:i).speed(S*(_?.72:.94),S*1.02).life(O*j[0],O*j[1]).emit(o,0,c).seed(t).set(V.Z2,_?.16:o>1?Math.min(.08,a*2/o):.04).window(s,s+c*o+O+te+.6);if(o===1&&!ie&&l.speed(S*(.96+.05*on(t^5))),e.add(l),M(l,o,s+c*o+O),ie||re(r,a,o,s,c,t),g===`pops`){let t=new W(0,0).copyFrom(l);t.f[V.FLAGS]=A&~(U.FLICKER|U.PEARL)|U.POPS|(ee?wc:0),t.on(Mc).color(ee?this.c2.copy(ee):this.c2.copy(m).lerp(Fc,.6),(ee?40:34)*h).emit(o*6,0,c).size(.26,1).set(V.X1,6).set(V.X2,.8*d.endBurn).set(V.X3,d.endSize>0?d.endSize:2.8).window(s+O*j[0],s+c*o+O+.3+.8*d.endBurn),e.add(t)}d.smoke&&!ie&&this.cometSmoke(e,t,n,r,i,a,o,s,c,S,y,O,m,d);return}let N=this.gravAcc(y,.6).clone();for(let f=0;f<o;f++){let p=d.zipper?f%2==0?f/2:o-1-(f-1)/2:f,g=o>1?-a+2*a*p/(o-1):0,_=new u().copy(r).multiplyScalar(Math.cos(g)).addScaledVector(i,Math.sin(g)).normalize(),v=t^Math.imul(f+1,625341585),b=S*(.95+.05*on(v)),x=O,C=s+c*f,T=ne(new W(H.SINGLE,A&~(U.ZIPPER|U.PEARL))).originV(n).time(C).axisV(i).dirV(_).speed(b).life(x).emit(1).seed(v&16777215).window(C,C+x+te+.4);e.add(T),M(T,1,C+x),re(_,0,1,C,0,v);let k=E?qc(new u,n,_,i,b,y,N,E,x,D):sn(new u,n,_.multiplyScalar(b),y,N,x),j=d.endSize>0?d.endSize:Hc(l*.16,3.5,10);this.addShell(e,v&16777215,w,n,k,m,h,{tL:C+x,tb:C+x,radius:j,smoke:o>6?1:2,lift:!1,flashK:.45,col2:null,starsK:Hc((j/16)**1.2,.2,1),burnK:Hc(j/16,.35,1)*d.endBurn,popCol:ee})}d.smoke&&this.cometSmoke(e,t,n,r,i,a,o,s,c,S,y,O,m,d)}fanGlow(e,t,n,r,i,a,o,s,c,l){let u=zc,d=Hc(.5+c*.013,.6,1.8),f=Jc(c,u,d),p=Hc(.1*c,1.5,6),m=Math.max(2,a*2);e.add(new W(H.CONE,0).on(jc).originV(n).time(o).dirV(r,Math.max(.05,i)).speed(f*.9,f).physics(u,-9.81).color(this.c2.copy(l.col).lerp(Fc,.2),l.glow*Math.min(1.3,l.gain)*l.intensity).life(d*.95,d*1.05).emit(m,0,s*a/m).size(p*.5,p).trail(.8,1).seed(t^456433).set(V.Z3,rn.GLOW).window(o,o+s*a+d*1.05+.05))}cometSmoke(e,t,n,r,i,a,o,s,c,l,d,f,p,m){let h=this.quality.level,g=m.serpent,_=h===`mobile`?3:h===`medium`?6:9,v=this.gravAcc(d,.6).clone(),y=new u,b=new u,x=new u,S=new u,C=Math.min(o,12),w=this.c1.copy(p).multiplyScalar((g?2.6:.6)*Math.min(1.3,m.gain)*m.intensity).clone();for(let u=0;u<C;u++){let p=C===o?u:Math.round(u*(o-1)/Math.max(1,C-1)),m=o>1?-a+2*a*p/(o-1):0;y.copy(r).multiplyScalar(Math.cos(m)).addScaledVector(i,Math.sin(m)).normalize(),S.set(-y.z,0,y.x),S.lengthSq()<1e-4&&S.copy(i),S.normalize(),y.multiplyScalar(l);let T=on(t^Math.imul(u+3,12139))*6.2832,E=e=>g&&e>0?1.3*Math.sin(T+e*2.4):0;for(let r=1;r<=_;r++){let i=f*r/_,a=f*(r-1)/_;sn(b,n,y,d,v,i);let o=s+c*p+i,l=(t^Math.imul(u*16+r+1,1759714724))&16777215;if(g){sn(x,n,y,d,v,a).addScaledVector(S,E(r-1)),b.addScaledVector(S,E(r));let t=s+c*p+a,u=h===`mobile`?2:h===`medium`?6:8;e.add(new W(H.LINE,U.SELFLIT).on(Ac).originV(x).axis(b.x-x.x,b.y-x.y,b.z-x.z).time(t).dir(0,1,0,1.2).speed(.1,.5).physics(1.2,.25).color(Pc,.3).color2(w,0).life(3.5,4.5).emit(u,0,(o-t)/u).size(.55+i*.3,1.6).trail(.5,.45).seed(l).set(V.X0,2.2).set(V.X1,.12).set(V.X2,.7).set(V.Y0,.75).set(V.Y2,.02).set(V.Y3,1.3).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(t,o+4.7));continue}e.add(new W(H.SPHERE,U.SELFLIT).on(Ac).originV(b).time(o).speed(.2,.8).physics(1.2,.25).color(Pc,.2).color2(w,0).life(7,10).emit(h===`mobile`?1:2).size(.5+i*.3,2.4).trail(.5,.35).seed(l).set(V.X0,.6).set(V.X1,.12).set(V.X2,.85).set(V.Y0,.75).set(V.Y2,.04).set(V.Y3,1.3).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(o,o+10.2))}}}comets(e,t){let n=e.p,r=rc(n.end,`none`);r===`crackle_comet`&&(r=`pops`);let i=this.betweenCount(e),a=i>0&&(r===`none`||r===`pearl`||r===`pops`||!Dc[r])&&X(n.curl,0)===0&&X(n.cross,0)===0,o=this.launchPoints(e,`roof`,!a),s=X(n.angle,0,-180,180),c=n.count===void 0?0:Math.round(X(n.count,1,1,400)),l=Math.round(X(n.per,0,0,60)),d=o;if(l)c>0&&c<o.length&&(d=hc(o,c));else{let e=c||(s!==0&&o.length<=2?7:o.length);e<=o.length?(d=hc(o,e),l=1):l=Math.ceil(e/Math.max(1,o.length))}let f=X(n.height,40,3,250),p=X(n.stagger,l>1?.04:0,0,3),m=nc(n.color,[`gold`]),h=this.cometLook(e,r,1),g=s*Bc,_=_c(d),v=X(n.lean,.08,-1,1),y=X(n.tilt,0,-90,90)*Bc,b=X(n.cross,0,0,60),x=X(n.crossAngle,22,0,80)*Bc,S=0,C=[],w=new I(0,0,0),T=(n,r,i,a)=>{let o=new u(r.y,-r.x,0);o.lengthSq()<1e-6&&o.set(1,0,0),o.normalize(),this.cometFan(t,a,n,r,o,i,l,e.t,p,f,h),h.glow>0&&h.curl===0&&this.fanGlow(t,a,n,r,i,l,e.t,p,f,h),this.launchSmoke(t,a,n,e.t,Math.min(l,5),f,.3+p*l,h.col,1.5*Math.sqrt(Math.min(l,6))*Math.min(1.3,h.gain)*h.intensity,.35+p*l),C.push(n),w.add(h.col),S++};if(d.forEach((t,n)=>{let r=this.sub(e,n);h.gain=$s(m[n%m.length],this.palette,h.col,`gold`),h.col=h.col.clone(),this.lookPops(e,h);let i=Math.abs(t.x)<.5?0:Math.sign(t.x);if(b>0){for(let e=-1;e<=1;e+=2){let n=t.clone();n.x+=e*b/2;let a=-e*x+i*y;T(n,new u(Math.sin(a),Math.cos(a),v).normalize(),l>1?Math.abs(g)/2:0,r^(e>0?5921370:0))}return}if(l===1&&s!==0){let e=g/2*Hc(t.x/_,-1,1)+i*y;T(t,new u(Math.sin(e),Math.cos(e),v).normalize(),0,r)}else{let e=i*y;T(t,new u(Math.sin(e),Math.cos(e),v).normalize(),Math.abs(g)/2,r)}}),a&&d.length>1){let n=0;for(let r of yc(d,void 0,1/0,24))for(let a=0;a+1<r.length;a++,n++){let o=d[r[a]],s=d[r[a+1]],c=this.sub(e,9e3+n);h.gain=$s(m[r[a]%m.length],this.palette,h.col,`gold`),h.col=h.col.clone(),this.lookPops(e,h);let _=s.clone().sub(o),b=o.clone().addScaledVector(_,.5/(i+1)),x=o.clone().lerp(s,.5),C=(Math.abs(x.x)<.5?0:Math.sign(x.x))*y,w=new u(Math.sin(C),Math.cos(C),v).normalize(),T=new u(w.y,-w.x,0).normalize(),E=Math.max(1,l)*i;this.cometFan(t,c,b,w,T,l>1?Math.abs(g)/2:.04,E,e.t,p/i,f,h,_.multiplyScalar(i/(i+1)),1/Math.sqrt(i+1)),this.launchSmoke(t,c,x,e.t,Math.min(E,4),f,.3+p*l,h.col,1.5*Math.sqrt(Math.min(l,6))*Math.min(1.3,h.gain)*h.intensity,.35+p*l),S+=i}}if(S){let n=Math.min(1.2,.025*S*l+.1);this.rowFlashes(t,C,f*.5,{kind:1,t0:e.t,t1:e.t+p*l+2.2,color:h.col,peak:n,decay:1,strobe:0}),w.multiplyScalar(1/Math.max(1,C.length)),this.rowLights(t,C,e.t,e.t+p*l+2.2,1,Math.min(12,f*.2),w,.36*n*Math.sqrt(Math.max(2,Math.min(l,12))/2),12+.1*f)}}cake(e,t){let n=e.p,r=this.launchPoints(e,`roof`),i=Math.round(X(n.shots,20,1,300)),a=e.dur>=.5?e.dur:i*.14,o=X(n.angle,60,0,170),s=X(n.height,35,3,200),c=nc(n.color,[`gold`]),l=rc(n.type,`comet`),d=Dc[l]?l:l===`crackle_comet`?`pops`:rc(n.end,`none`);d===`crackle_comet`&&(d=`pops`);let f=Math.round(X(n.fill,0,0,40)),p=Math.round(X(n.spray,1,1,12)),m=this.cometLook(e,d,p),h=n.from!==void 0||n.to!==void 0,g=X(n.from,-o/2,-270,270)*Bc,_=X(n.to,o/2,-270,270)*Bc,v=X(n.lean,.1,-1,1),y=X(n.tilt,0,-90,90)*Bc,b=X(n.jitter,0,0,1),x=new I(0,0,0);if(r.forEach((n,r)=>{let l=this.sub(e,r);m.gain=$s(c[r%c.length],this.palette,m.col,`gold`),m.col=m.col.clone(),this.lookPops(e,m);let d=b>0?b*on(l^15386):0,S=Math.abs(n.x)<.5?1:Math.sign(n.x),C,w,T;if(h){let e=(g+_)/2;T=Math.abs(_-g)/2,C=new u(Math.sin(e)*S,Math.cos(e),v).normalize(),w=new u(Math.cos(e)*S,-Math.sin(e),0).multiplyScalar(_>=g?1:-1)}else{let e=(Math.abs(n.x)<.5?0:S)*y;C=new u(Math.sin(e),Math.cos(e),v).normalize(),w=new u(Math.cos(e),-Math.sin(e),0).multiplyScalar(r%2==0?1:-1),T=o/2*Bc}if(f>0){let r=f>1?2*T/(f-1):0;for(let o=0;o<i;o++){let c=(on(l^o*40503+5)-.5)*r*.8,u=C.clone().multiplyScalar(Math.cos(c)).addScaledVector(w,Math.sin(c)),p=w.clone().multiplyScalar(Math.cos(c)).addScaledVector(C,-Math.sin(c));this.cometFan(t,(l^Math.imul(o+1,668265261))&16777215,n,u,p,T,f,e.t+(o+d)*a/i,0,s,m)}}else{let r=p>1?Math.max(i,Math.round(i*p*Math.min(1,.4+this.quality.particleScale))):i;this.cometFan(t,l,n,C,w,T,r,e.t+d*a/r,a/r,s,m)}this.launchSmoke(t,l,n,e.t,Math.max(1,Math.min(4,Math.round(a*1.5))),s,a,m.col,2.2*Math.min(1.3,m.gain)*m.intensity,.9),x.add(m.col)}),r.length){let n=Math.min(1.5,.08*r.length*Math.max(1,f*.3)+.15);this.rowFlashes(t,r,s*.5,{kind:1,t0:e.t,t1:e.t+a+1.5,color:m.col,peak:n,decay:1,strobe:0}),x.multiplyScalar(1/r.length),this.rowLights(t,r,e.t,e.t+a+1.5,1,Math.min(12,s*.2),x,.36*n,12+.1*s)}}mines(e,t){let n=e.p,r=this.launchPoints(e,`roof`),i=X(n.height,25,3,150),a=nc(n.color,[`gold`]),o=rc(n.type,`comet`),s=1.4,c=ln(i,s),l=un(c,s),u=e.dur>=.5?e.dur:0,d=this.pc(X(n.count,36,4,400),10);r.forEach((r,f)=>{let p=this.sub(e,f),m=$s(a[f%a.length],this.palette,this.c1,`gold`),h=this.c1.clone(),g=Math.min(h.r,h.g,h.b)/Math.max(h.r,h.g,h.b,1e-4)>.75?U.FLICKER:U.COOL|U.FLICKER;o===`strobe`&&(g=U.STROBE);let _=new W(H.CONE,g).on(Mc).originV(r).time(e.t).dir(0,1,.05,X(n.spread,18,0,80)*Bc).speed(c*.62,c*1.02).physics(s,-9.81).color(h,(o===`strobe`?28:18)*m*X(n.intensity,1,0,3)).life(l*.8,l*1.25).emit(d,0,u/d).size(.26,.4).trail(o===`strobe`?0:X(n.tail,.38,0,3),o===`glitter`?1:.5).seed(p).hz(12+4*on(p)).set(V.Y0,o===`glitter`?.6:1).set(V.Y2,1).set(V.Y3,.6).set(V.Z0,.02).window(e.t,e.t+u+l*1.25+.6);if(t.add(_),o===`crackle`){let n=new W(0,0).copyFrom(_),r=this.popColor(e,h);n.f[V.FLAGS]=U.POPS|(r?wc:0),n.on(Mc).color(r?this.c2.copy(r):this.c2.copy(h).lerp(Fc,.6),(r?38:32)*m).emit(_.count*5).size(.28,1).set(V.X1,5).set(V.X2,.8).set(V.X3,2).window(e.t+l*.8,e.t+u+l*1.25+1),t.add(n)}else if(o===`glitter`){let n=Math.max(2,Math.round(4*Math.min(1,.45+this.quality.particleScale*.7))),r=new W(0,0).copyFrom(_);r.f[V.FLAGS]=xc,r.on(Mc).color(this.c2.copy(h).lerp(Fc,.4),22*m).emit(_.count*n).size(.13,1).set(V.X1,n).set(V.X2,.3).set(V.X3,.8).set(V.Z3,.45).window(e.t,e.t+u+l*1.25+1.1),t.add(r)}t.add(new W(H.SINGLE,0).on(jc).origin(r.x,r.y+1,r.z).time(e.t).dir(0,1,0).speed(1).physics(1,0).color(this.c2.copy(h).lerp(Fc,.5),16).life(.35).emit(1).size(3.5,2).trail(.5,1).seed(p^4).set(V.X0,.08).set(V.Z3,rn.FLASH).window(e.t,e.t+.4)),this.launchSmoke(t,p,r,e.t,u?5:3,i,Math.max(.3,u),h,2.2*Math.min(1.3,m),u?.9:l*.8),t.flashes.push({kind:+!!u,t0:e.t,t1:e.t+u+l*1.2,color:h,peak:.55,decay:l*.6,pos:r.clone().setY(r.y+i*.4),strobe:o===`strobe`?12:0})})}launchSmoke(e,t,n,r,i,a,o=.3,s=null,c=0,l=1){let u=s!==null&&c>0,d=new W(H.CONE,u?U.SELFLIT:0).on(Ac).origin(n.x,n.y+2,n.z).time(r+(u?.03:.1)).dir(0,1,0,.5).speed(1,u?4:3).physics(.8,.35).color(Pc,.16).life(7,11).emit(Math.max(1,Math.round(i*Math.min(1,this.quality.particleScale*1.5))),0,Math.max(.05,o/Math.max(1,i))).size(1.5+a*.03,4+a*.1).trail(.55,.3).seed(t^65).set(V.X1,.15).set(V.X2,.8).set(V.Y0,.75).set(V.Y2,u?.02:.1).set(V.Y3,1).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(r+.03,r+o+11.5);u&&d.color2(this.c2.copy(s).multiplyScalar(c),0).set(V.X0,l).litUntil(r+o+.4),e.add(d)}rowLights(e,t,n,r,i,a,o,s,c){if(!(s>0)||!t.length)return;let l=t.length;for(let d of yc(t)){let f=t[d[0]],p=t[d[d.length-1]],m=new u(f.x,f.y+a,f.z),h=new u(p.x,p.y+a,p.z);e.lights.push({kind:1,t0:n,t1:r,decay:Math.max(.1,i),strobe:0,color:o.clone(),peak:s*d.length/l,pos:m.clone().add(h).multiplyScalar(.5),a:m,b:h,radius:c+.15*m.distanceTo(h)})}}rowFlashes(e,t,n,r){if(!(r.peak>0)||!t.length)return;let i=t.length;for(let a of yc(t)){let o=new u;for(let e of a)o.add(t[e]);o.multiplyScalar(1/a.length),o.y+=n,e.flashes.push({...r,color:r.color.clone(),peak:r.peak*a.length/i,pos:o})}}flares(e,t){let n=e.p,r=Math.max(.5,e.dur),i=[];if(Array.isArray(n.path))for(let e of n.path)Uc(e).length>=3&&i.push(Gc(e,new u));i.length<2&&(i.length=0,i.push(Gc(n.from,new u(-60,30,30)),Gc(n.to,new u(-30,32,10))));let a=i.slice(1).map((e,t)=>Math.max(.01,e.distanceTo(i[t]))),o=a.reduce((e,t)=>e+t,0),s=o/r,c=Math.round(X(n.count,4,1,12)),l=X(n.spacing,2.2,0,20),d=X(n.size,1,.3,4),f=X(n.intensity,1,0,3),p=X(n.halo,Lc,0,20),m=X(n.haloGain,1,0,4),h=X(n.smokeGlow,1,0,3),g=X(n.smokeSize,1,.2,3),_=$s(rc(n.color,`red`),this.palette,this.c1,`red`),v=this.c1.clone(),y=this.c2.copy(v).lerp(Fc,.55).clone(),b=(e,t)=>{let n=e*o;for(let e=0;e<a.length;e++){if(n<=a[e]||e===a.length-1)return t.copy(i[e]).lerp(i[e+1],Math.min(1,n/a[e]));n-=a[e]}return t.copy(i[i.length-1])};for(let n=0;n<c;n++){let o=this.sub(e,n),h=e.t;for(let e=0;e<a.length;e++){let g=a[e]/s,b=h+g,x=e===a.length-1,S=i[e+1].clone().sub(i[e]).normalize(),C=new u(-S.z,0,S.x);C.lengthSq()<1e-4&&C.set(1,0,0),C.normalize();let w=i[e].clone().addScaledVector(C,(n-(c-1)/2)*l).add(this.tmpA.set(0,(on(o^3)-.5)*l*.6,0));t.add(new W(H.SINGLE,U.FLICKER).on(Mc).originV(w).time(h).dirV(S).speed(s).physics(.02,0).color(y,90*_*f).life(x?g:g*1.4).emit(1).size(.6*d,.7).trail(Math.min(.22,g),0).seed(o).set(V.Y0,.25).set(V.Y3,0).set(V.Z0,e===0?.15:.001).window(h,x?b+.3:b)),p>0&&m>0&&t.add(new W(H.SINGLE,0).on(jc).originV(w).time(h).dirV(S).speed(s).physics(.02,0).color(this.c2.copy(v).lerp(Fc,.15),3.2*f*m).life(x?g:g*1.4).emit(1).size(p*d,1).trail(1,1).seed(o^119).set(V.X0,r).set(V.Z3,rn.GLOW).window(h,b)),h=b}}let x=this.quality.level===`mobile`?4:8,S=ic(n.smoke,!0),C=new u,w=new u,T=new u,E=30+8*d+l*c*.5,D=this.quality.level===`mobile`;for(let n=0;n<x;n++){let i=(n+.5)/x,a=e.t+i*r;if(b(i,C),b(n/x,w),b((n+1)/x,T),S){let i=D?3:6;t.add(new W(H.LINE,U.SELFLIT).on(Ac).originV(w).axis(T.x-w.x,T.y-w.y,T.z-w.z).time(e.t+n/x*r).dir(0,1,0,1.4).speed(.8,2.6).physics(1,.25).color(Pc,.24).color2(this.c2.copy(v).multiplyScalar(6.5*f*h),0).litUntil(e.t+r+.2).life(5,8).emit(i,0,r/x/i).size((2.6*d+l*c*.35)*(D?1.25:1)*g,13*d*g).trail(.45,.35).seed((e.seed^Math.imul(n+1,5369127))&16777215).set(V.X0,3).set(V.X1,.1).set(V.X2,.85).set(V.Y0,.8).set(V.Y2,.02).set(V.Y3,1.2).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(e.t+n/x*r,a+8.2))}t.flashes.push({kind:1,t0:e.t+n/x*r,t1:e.t+(n+1)/x*r+.15,color:v.clone(),peak:Math.min(2.2,.55*c*f),decay:.12,pos:C.clone(),strobe:0}),t.lights.push({kind:1,t0:e.t+n/x*r,t1:e.t+(n+1)/x*r+(n===x-1?.3:.12),decay:n===x-1?.3:.1,strobe:0,color:v.clone(),peak:1.1*Math.sqrt(c)*f*d,pos:w.clone().add(T).multiplyScalar(.5),a:w.clone(),b:T.clone(),radius:E})}}finale(e,t){let n=e.p,r=Math.max(1,e.dur),i=X(n.density,15,.5,40),a=nc(n.palette,[`red`,`orange`,`gold`,`white`]),o=nc(n.types,[]).filter(e=>Dc[e]),s=X(n.height,62,20,300),c=[],l=e.targets.length===1&&e.targets[0]===`all`?null:e.targets,d=n.x!==void 0||n.z!==void 0,f=X(n.depth,0,0,400);if(l&&!d)c.push(...this.points(e,`fireworks_back`));else{let e=gc(this.app.anchors.get(`fireworks_back`),new u(0,0,-50));e.x=X(n.x,e.x,-400,400),e.z=X(n.z,e.z,-400,400),d&&(e.y=0);let t=X(n.spread,210,20,600),r=f>0?4:1;for(let n=0;n<r;n++){let i=r>1?(n/(r-1)-.5)*f:0;for(let r=0;r<15;r++)c.push(new u(e.x+t*(r/14-.5)+n%2*(t/28),e.y,e.z+i))}d||c.push(...this.app.anchors.get(`roof`).map(e=>e.clone()))}c.length||c.push(new u(0,0,-60));let p=Math.min(Math.round(i*r*Math.min(1,.55+this.quality.particleScale*.6)),480),m=o.length?o.map(e=>[e,1]):[[`crackle`,.28],[`brocade`,.2],[`peony`,.14],[`chrysanthemum`,.14],[`strobe`,.1],[`willow`,.06],[`kamuro`,.05],[`dahlia`,.03]],h=m.reduce((e,t)=>e+t[1],0),g=i>10?1:2,_=this.liftColor(e);for(let n=0;n<p;n++){let i=this.sub(e,n),o=on(i^119)*h,l=m[0][0];for(let[e,t]of m)if(o-=t,o<=0){l=e;break}let d=Dc[l]??Dc.peony,f=c[Math.floor(on(i^19)*c.length)%c.length],v=Math.max(s*(.72+.5*on(i^25)),f.y+14),y=Yc(v-f.y),b=e.t+r*(n+on(i^35)*.9)/p,x=new u(f.x+(on(i^1)-.5)*16,v,f.z+(on(i^2)-.5)*.15*v),S=a[Math.floor(on(i^41)*a.length)%a.length],C=$s(S,this.palette,this.c1,`gold`),w=Hc(.3*v,9,50)*d.radiusK*(.85+.3*on(i^3)),T=this.c1.clone();this.addShell(t,i,d,f,x,T,C,{tL:b,tb:b+y,radius:w,smoke:g,lift:!0,flashK:.55,col2:null,liftCol:_,popCol:this.popColor(e,T)})}let v=this.app.anchors.get(`roof`),y=X(n.comets,1.6,0,10),b=Math.round(y*r),x=this.cometLook(e,`none`,1);x.glitter=.3;for(let n=0;n<b&&v.length;n++){let i=this.sub(e,5e3+n),o=v[Math.floor(on(i)*v.length)%v.length],s=a[Math.floor(on(i^3)*a.length)%a.length];x.gain=$s(s,this.palette,x.col,`gold`),x.col=x.col.clone();let c=e.t+r*(n+on(i^5)*.8)/b,l=new u(1,0,0);this.cometFan(t,i,o,new u(0,1,.1).normalize(),l,.55,7,c,.03,38+20*on(i^9),x)}}static types=Oc};function Hc(e,t,n){return e<t?t:e>n?n:e}function Uc(e){return typeof e==`number`&&Number.isFinite(e)?[e]:Array.isArray(e)?e.filter(e=>typeof e==`number`&&Number.isFinite(e)):typeof e==`string`&&e.length?e.split(`,`).map(e=>parseFloat(e)).filter(e=>Number.isFinite(e)):[]}function Wc(e){if(!Array.isArray(e)||!e.length)return[];if(typeof e[0]==`number`){let t=Uc(e);return t.length>=3?[new u(t[0],t[1],t[2])]:[]}let t=[];for(let n of e){let e=Uc(n);e.length>=3&&t.push(new u(e[0],e[1],e[2]))}return t}function Gc(e,t){let n=Uc(e);return n.length>=3?new u(n[0],n[1],n[2]):t}function Kc(e){return Hc(.33*e,10,70)}function qc(e,t,n,r,i,a,o,s,c,l=1/0){let d=new u().copy(n).cross(r);d.lengthSq()<1e-6&&d.set(0,0,1),d.normalize();let f=new u().copy(d).cross(n).normalize(),p=Math.min(c,l),m=Math.exp(-a*p),h=Math.cos(s*p),g=Math.sin(s*p),_=i/(a*a+s*s),v=(a*(1-m*h)+s*m*g)*_,y=(s*(1-m*h)-a*m*g)*_;if(c>p){let e=i*m*(1-Math.exp(-a*(c-p)))/a;v+=h*e,y+=g*e}return sn(e,t,new u,a,o,c),e.addScaledVector(n,v).addScaledVector(f,y)}function Jc(e,t,n,r=9.81){let i=1-Math.exp(-t*n);return(e+r*n/t)*t/i-r/t}function Yc(e){return .8+.021*Math.max(0,e)}var Xc=`
${Qt}
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
`,Zc=`
${Qt}
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
`,Qc=class{mesh;uniforms;total;zoneCounts;count;constructor(t,n,r=[],i=77){let a=new ft(i),o=n.reduce((e,t)=>e+t.count,0)+r.reduce((e,t)=>e+t.count,0);this.total=o,this.count=o,this.zoneCounts=[...n.map(e=>e.count),...r.map(e=>e.count)];let c=new Float32Array(o*3),l=new Float32Array(o*4),d=0,f=(e,t)=>{let n=Array.from({length:e},(t,n)=>(n+.5)/e);for(let e=n.length-1;e>0;e--){let r=Math.floor(t.next()*(e+1)),i=n[e];n[e]=n[r],n[r]=i}return n};n.forEach((e,t)=>{let n=f(e.count,a);for(let r=0;r<e.count;r++,d++)c[d*3]=a.range(e.min.x,e.max.x),c[d*3+1]=a.range(e.min.y,e.max.y),c[d*3+2]=a.range(e.min.z,e.max.z),l[d*4]=a.range(e.size[0],e.size[1]),l[d*4+1]=n[r],l[d*4+2]=t,l[d*4+3]=a.next()});let m=new ft(i+1201);for(let e of r){let t=f(e.count,m),n=f(e.count,m);for(let r=0;r<e.count;r++,d++)c[d*3]=m.range(e.min.x,e.max.x),c[d*3+1]=m.range(e.min.y,e.max.y),c[d*3+2]=m.range(e.min.z,e.max.z),l[d*4]=m.range(e.size[0],e.size[1]),l[d*4+1]=t[r],l[d*4+2]=3+e.group,l[d*4+3]=(n[r]+.3*(m.next()-.5)/e.count+1)%1}let h=new he(2,2),g=new xe;g.index=h.index,g.setAttribute(`position`,h.getAttribute(`position`)),g.setAttribute(`aCenter`,new x(c,3)),g.setAttribute(`aPar`,new x(l,4)),g.instanceCount=o;let _=n.map(e=>e.min.clone()),v=n.map(e=>e.max.clone().sub(e.min));for(;_.length<3;)_.push(new u),v.push(new u(1,1,1));this.uniforms={...t,uDensity:{value:new p(.1,.05,0,0)},uZoneMin:{value:_},uZoneSize:{value:v},uZoneAspect:{value:new u(n[0]?.aspect??1,n[1]?.aspect??1,n[2]?.aspect??1)},uZoneOcclusion:{value:new u(.35,.15,.55)},uStageBoost:{value:1},uHazePyro:{value:new p(.5,14,7,4)},uHazePyroK:{value:new u(8,7,7)},uHazeTint:{value:new I(1,1,1)},uHazeSite:{value:new s(1.6,3)},uHazeKeep:{value:1.01},uCloseUp:{value:0},uBank:{value:new p(0,0,0,0)},uBankLight:{value:new p(1,.8,1,.4)},uBankShape:{value:new u(.5,.35,.2)},uBankFill:{value:new u(.08,.2,.12)},uShaftCol:{value:new I(0,0,0)},uViewer:{value:0}};let y=new C({name:`fx-haze`,uniforms:this.uniforms,vertexShader:Xc,fragmentShader:Zc,transparent:!0,depthWrite:!1,depthTest:!0,blending:5,blendEquation:100,blendSrc:201,blendDst:205});this.mesh=new e(g,y),this.mesh.name=`fx:haze`,this.mesh.frustumCulled=!1,this.mesh.renderOrder=10,this.mesh.matrixAutoUpdate=!1}setShare(e){let t=Math.max(0,Math.min(1,e));this.uniforms.uHazeKeep.value=t>=1?1.01:t;let n=0;for(let e of this.zoneCounts)for(let r=0;r<e;r++)((r+.5)/e<t||t>=1)&&n++;this.count=n}setTint(e){this.uniforms.uHazeTint.value.copy(e)}setCloseUp(e){this.uniforms.uCloseUp.value=Math.max(0,Math.min(1,e))}setDensity(e,t,n){this.uniforms.uDensity.value.set(e,t,n,0);let r=this.uniforms.uBank.value;this.mesh.visible=e+t+n+r.x+r.y+r.z+r.w>.002}setBanks(e,t,n,r){this.uniforms.uBank.value.set(e,t,n,r)}setShaftLight(e,t){this.uniforms.uShaftCol.value.copy(e).multiplyScalar(Math.max(0,t))}setViewer(e){this.uniforms.uViewer.value=Math.max(0,Math.min(1,e))}dispose(){this.mesh.geometry.dispose(),this.mesh.material.dispose(),this.mesh.removeFromParent()}};function $c(t){let n=(e,t,n)=>new u(e,t,n),r=(e,t,r,i,a)=>Array.from({length:e},(o,s)=>n(t+(r-t)*s/Math.max(1,e-1),i,a)),i=e=>[...e,...e.map(e=>n(-e.x,e.y,e.z))],a=t.anchors,o=e=>Array.from({length:8},(t,r)=>n(e*(62+r*3.8),7.2,3+r*3.1));a.set(`deck_front`,[...r(24,-46,46,2,-.3),...o(-1),...o(1)]),a.set(`wing_left`,[n(-14,24.5,-6),n(-18,19,-6),n(-24,17,-6),n(-28,25,-6),n(-33,18.5,-6),n(-39,24,-6)]),a.set(`wing_right`,[n(14,24.5,-6),n(18,19,-6),n(24,17,-6),n(28,25,-6),n(33,18.5,-6),n(39,24,-6)]),a.set(`wing_tips`,[n(-39,25.5,-6),n(39,25.5,-6)]),a.set(`towers_top`,i([n(-14,16,-7),n(-34,14.5,-8),n(-46,13.5,-8)])),a.set(`roof`,r(14,-46,46,10,-9)),a.set(`dragon_mouth`,[n(0,11,-2)]),a.set(`dragon_head`,[n(0,14,-4)]),a.set(`pillars_top`,i([46.5,73.5,100.7,127.7].map(e=>n(-22,14.6,e)))),a.set(`fireworks_back`,r(9,-80,80,0,-45)),a.set(`fireworks_sides`,[n(-95,0,12),n(95,0,12),n(-90,0,32),n(90,0,32)]);let s=new le({color:`#2a2a30`,roughness:.9,metalness:.1,emissive:`#050507`}),c=new le({color:`#5a1a14`,roughness:.7,metalness:.3,emissive:`#120202`}),l=new y;l.name=`fx-proxy-stage`;let d=(t,n,r,i,a,o,c=s)=>{let u=new e(new me(t,n,r),c);return u.position.set(i,a+n/2,o),l.add(u),u};d(100,1.9,18,0,0,-9),d(96,9.3,10,0,1.9,-12);for(let e of[-46,-34,-20,20,34,46])d(5,12.1,5,e,1.9,-8);d(9,11,9,0,8,-6,c);for(let t of[-1,1]){for(let[n,r]of[[14,24.5],[28,25],[39,24]]){let i=Math.hypot(n-6,r-10),a=new e(new me(1.2,i,1.2),c);a.position.set(t*(6+n)/2,(10+r)/2,-7),a.rotation.z=t*Math.atan2(n-6,r-10),l.add(a)}let n=new e(new me(34,7,6),s);n.position.set(t*74,3.5,12),n.rotation.y=-t*Math.atan2(24,28),l.add(n);for(let e of[46.5,73.5,100.7,127.7])d(3.2,14.5,3.2,t*22,0,e)}t.scene.add(l);let f=!1;t.onFrame(()=>{if(f)return;let e=t.scene.getObjectByName(`placeholder-stage`);e&&(e.visible=!1,f=!0)})}var el=0,tl=new I(.9,.9,.92),nl=.55,rl=10,il=3,al=class extends qs{name=`fog`;sys=`fog`;haze=null;levels=[];levelRev=-1;c1=new I;stageSmoke=0;groundSmoke=0;skySmoke=0;hazeLevel=nl;glowNow=new I;tintCache=new Map;tintSum=new I;tint=new I(1,1,1);crowdSys=void 0;camSys=void 0;tune={tintLean:.3,perTarget:!0,release:rl,prewarm:!0,tallBank:1,bankBase:0,bankSmoke:1.2,bankK0:.15,bankK1:1.1,bankDeck:.7,bankPillars:.7,bankSides:2,bankArms:.8,viewer:1};onInit(e){e.params.has(`fxproxy`)&&$c(e),this.buildHaze(e.quality)}buildLayers(e){let t=this.shared.puffLayer(`fog-puffs`,Math.round(4e3*Math.max(.35,e.particleScale)),256,11);this.layers=[t],this.app.scene.add(t.mesh)}buildHaze(e){this.haze?.dispose();let t=(e,t,n)=>new u(e,t,n),n=[{min:t(-38,1.5,1),max:t(38,3.5,6),size:[10,16],count:14,group:0}];for(let e of Le)for(let r of[-1,1])n.push({min:t(r*20-5,.9,e-4),max:t(r*20+3,2.2,e+4),size:[5,9],count:6,group:1});for(let e of[-1,1])n.push({min:t(e>0?38:-92,.8,-3),max:t(e>0?92:-38,2.4,3),size:[9,15],count:8,group:2}),n.push({min:t(e*93-3,.8,2),max:t(e*93+3,2.4,56),size:[9,14],count:5,group:3});this.haze=new Qc(this.shared.uniforms,[{min:t(-105,3,-38),max:t(105,30,12),size:[13,26],aspect:.8,count:46},{min:t(-80,1.5,4),max:t(80,8,205),size:[16,30],aspect:.35,count:64},{min:t(-150,40,-110),max:t(150,105,20),size:[24,44],aspect:.65,count:26}],n),this.haze.setShare(ol(e)),this.app.scene.add(this.haze.mesh)}setQuality(e){super.setQuality(e),this.haze?.setShare(ol(e))}invalidate(){super.invalidate(),this.tintCache.clear()}setEnabled(e){super.setEnabled(e),this.haze&&(this.haze.mesh.visible=e),!e&&this.app&&(this.app.env.haze=nl,this.shared.lights.glow.setRGB(0,0,0))}lifetime(e){switch(e.fx){case`burst`:return X(e.p.roll,0,0,150)>0?e.dur+X(e.p.life,6,1,30)+1:e.dur+Math.min(22,X(e.p.life,16,1,30)+6);case`lowfog`:{let t=this.lowfogRelease(e);return e.dur+(t>0?Math.min(19.5,Math.max(t,rl)+.5):16)}default:return e.dur}}expand(e,t){e.fx===`burst`?this.burst(e,t):e.fx===`lowfog`&&this.lowfog(e,t)}burst(e,t){let n=e.p,r=this.app.anchors.resolve(e.targets,`wing_tips`),i=X(n.size,1,.2,8),a=ec(n.color,this.palette,this.c1,`white`).clone(),o=X(n.glow,0,0,4),s=X(n.density,1,.2,4),c=X(n.life,13,1,30),l=X(n.rise,1,.2,4),d=X(n.rate,0,0,8),f=X(n.lift,e.targets.includes(`pillars_top`)?1.8:0,-10,30),p=X(n.roll,0,0,150);if(p>0&&r.length){this.rollOut(e,t,r,p,a,o,s,X(n.life,6,1,30),f);return}let m=Math.sqrt(i),h=1/Math.sqrt(Math.max(1,r.length/4)),g=Math.min(1,this.quality.particleScale*1.5),_=o>0?a.clone().multiplyScalar(o*2.2):null,v=n.glow!==void 0||n.density!==void 0||n.rate!==void 0||n.life!==void 0,y=_?U.SELFLIT:0,b=Math.min(.95,.28*s),x=d>0?Math.max(1,Math.min(Math.floor(e.dur*d)+1,Math.floor(64/Math.max(1,r.length)))):1,S=d>0?e.dur/x:0,C=d>0?Math.min(.35,S*.8):Math.max(.4,Math.min(e.dur,o>0?.7:4));for(let n=0;n<x;n++){let i=e.t+n*S;r.forEach((r,u)=>{let p=Math.max(d>0?4:3,Math.round(9*m*h*g*Math.sqrt(s)*(d>0?.45:1))),x=v?p:Math.max(2,Math.round(p*Math.min(1,.12+1.5*C/c))),S=new W(H.CONE,y).on(el).origin(r.x,r.y+f,r.z).time(i).dir(0,1,.25,.7).speed(2.5*m*l,6.5*m*l).physics(1.1,.25).color(a,d>0?Math.min(.95,b*1.5):b).life(c*.62,c).emit(x,0,C/x).size((1.5+1.2*m)*(d>0?.6:o>0?1.8:1),7.5*m*(d>0?.55:1)).trail(.45,.28).seed(this.sub(e,u+n*131)).set(V.X1,.12).set(V.X2,.85).set(V.Y0,.85).set(V.Y2,.05).set(V.Y3,1).set(V.Z0,1.25).set(V.Z3,rn.SMOKE).window(i,i+C+c+.5);_&&S.color2(_,0).set(V.X0,Math.max(.6,Math.min(3,e.dur*.6))),t.add(S)})}if(_&&r.length){let n=Math.max(.5,Math.min(e.dur,3)+.8),i=this.app.anchors.names(),s=this.tune.perTarget&&e.targets.length>1&&e.targets.every(e=>i.includes(e))?e.targets.flatMap(e=>bc(this.app.anchors.resolve([e],`wing_tips`),30)):bc(r,30),c=o*.7*m*Math.min(2,Math.sqrt(r.length)),l=0;for(let e of s)l+=Math.min(4,e.length);let d=Math.sqrt(l);for(let r of s){let i=new u(1/0,1/0,1/0),o=new u(-1/0,-1/0,-1/0);for(let e of r)i.min(e),o.max(e);i.y=o.y=(i.y+o.y)*.5+4*m,t.lights.push({kind:1,t0:e.t,t1:e.t+n,decay:n*.6,strobe:0,color:a.clone(),peak:c*Math.min(2,Math.sqrt(r.length))/d,pos:i.clone().add(o).multiplyScalar(.5),a:i.clone(),b:o.clone(),radius:8+6*m,haze:1})}}}rollOut(e,t,n,r,i,a,o,s,c){let l=bc(n,30),d=Math.min(1,this.quality.particleScale*1.5),f=2.6,p=5+.2*r,m=.12,h=Math.min(.95,.34*o),g=a>0?i.clone().multiplyScalar(a*2.2):null,_=e.t+Math.max(.15,e.dur-.15),v=1/Math.sqrt(l.length),y=0;for(let e of l)y+=Math.min(4,e.length);let b=Math.sqrt(y);l.forEach((n,l)=>{let y=new u(1/0,1/0,1/0),x=new u(-1/0,-1/0,-1/0);for(let e of n)y.min(e),x.max(e);let S=y.clone().add(x).multiplyScalar(.5),C=x.x-y.x,w=Math.max(8,Math.round((20+.9*r+.12*C)*v*d*Math.sqrt(o))),T=new W(H.BOX,g?U.SELFLIT:0).on(el).origin(S.x,S.y+c+1,S.z+2).axis(C+8,2,x.z-y.z+4).time(e.t).dir(0,.32,1,1.05).speed(.12*r*f,r*f).physics(f,.35).color(i,h).life(s*.7,s).emit(w,0,m/w).size(.45*p,p).trail(.35,.3).seed(this.sub(e,7300+l)).set(V.X1,.1).set(V.X2,.8).set(V.Y0,.85).set(V.Y2,Math.min(.2,.15/s)).set(V.Y3,.6).set(V.Z0,1.25).set(V.Z3,rn.SMOKE).window(e.t,e.t+m+s+.5);if(g&&T.color2(g,0).set(V.X0,Math.max(.5,Math.min(3,e.dur*1.5))).litUntil(_),t.add(T),g){let o=S.z+.45*r,s=S.y+c+.2*r,l=new u(y.x-.3*r,s,o),d=new u(x.x+.3*r,s,o),f=a*.7*Math.sqrt(p/5)*Math.min(2,Math.sqrt(n.length))/b,m=Math.max(.3,e.dur);t.lights.push({kind:1,t0:e.t,t1:_+.3,decay:m*.6,strobe:0,color:i.clone(),peak:f,pos:S.clone().setZ(o).setY(s),a:l,b:d,radius:8+.35*r,haze:1})}})}lowfog(e,t){let n=e.p,r=X(n.density,.8,0,1.5),i=rc(n.area,`deck`),a=this.app.anchors.resolve(e.targets,`deck_front`),o=1/0,s=-1/0,c=0,l=0;for(let e of a)o=Math.min(o,e.x),s=Math.max(s,e.x),c+=e.y,l+=e.z;a.length?(c/=a.length,l/=a.length):(o=-45,s=45);let d=Math.max(20,s-o+16),f=(o+s)/2,p=Math.max(1,e.dur),m=this.lowfogRelease(e),h=m>0?Math.min(19.5,m+.5):19.5,g=this.tune.prewarm?13:0,_=X(n.fadeIn,il,.05,10),v=ec(n.color,this.palette,this.c1,`white`),y=1-Math.min(v.r,v.g,v.b)/Math.max(v.r,v.g,v.b,1e-4),b=v.lerp(tl,y>.6?.025:.3).clone(),x=[],S=Math.max(0,c-.3),C=Math.min(1,Math.max(0,(r-.9)/.6)),w=C*C*(3-2*C)*this.tune.tallBank,T=.32+.2*w;i!==`field`&&x.push([new u(f,S+.5+1.2*w,l-9),new u(d,.7+2*w,20),.35,S,T]),(i!==`deck`||n.spill!==!1)&&x.push([new u(f,.45+1.2*w,l+16),new u(d*.95,.5+2*w,34),i===`deck`?.55:1,0,T]),(i===`field`||i===`all`)&&x.push([new u(0,.45,90),new u(90,.5,130),.65,0,.32]),x.forEach(([n,i,a,o,s],c)=>{let l=i.x*i.z>4e3?1.5:1,u=Math.max(12,Math.round(i.x*i.z/(60*l)*Math.min(1,this.quality.particleScale*1.3)));t.add(new W(H.BOX,U.FLAT|U.RAMP).on(el).originV(n).time(e.t-g).axisV(i).dir(0,.05,1,.8).speed(.2,.7).physics(.25,0).color(b,.42*r*a/Math.sqrt(l)).life(9.1,13).emit(Math.min(u,400),p+6.5+g).size(6.5*l,5*l).trail(.7,.2).seed(this.sub(e,c)).set(V.X1,.03).set(V.X2,.7).set(V.X3,_).set(V.Y0,.9).set(V.Y1,o-.2).set(V.Y2,.25).set(V.Y3,.35).set(V.Z0,1.3).set(V.Z1,s).set(V.Z3,rn.FOG).releaseAfter(m>0?e.t+e.dur:0,m).visibleFrom(g>0?e.t:0).window(e.t,e.t+p+h))})}lowfogRelease(e){let t=e.p.release;return typeof t==`number`&&Number.isFinite(t)?Math.min(30,Math.max(.1,t)):Math.max(0,this.tune.release)}rebuildLevels(){this.levels.length=0;let e=nl,t=new I(0,0,0);for(let n of this.app.show.all(`fog`)){if(n.fx!==`level`)continue;let r=X(n.p.haze,X(n.p.density,e,0,1.5),0,1.5),i=X(n.p.fade,2,0,120),a=this.levels[this.levels.length-1];a&&(e=sl(a,n.t),cl(a,n.t,t));let o=X(n.p.glow,0,0,3),s=o>0?ec(n.p.glowColor??n.p.color,this.app.show.paletteAt(n.t,this.palette),new I,`primary`).multiplyScalar(o*.6):new I(0,0,0);this.levels.push({t:n.t,fade:i,from:e,to:r,g0:t.clone(),g1:s}),e=r}this.levelRev=this.app.show.revision}segAt(e){let t=this.levels;if(!t.length||e<t[0].t)return-1;let n=0,r=t.length-1,i=0;for(;n<=r;){let a=n+r>>1;t[a].t<=e?(i=a,n=a+1):r=a-1}return i}hazeAt(e){let t=this.segAt(e);return t<0?nl:sl(this.levels[t],e)}accumulate(e,t,n){let r=this.app.show.all(e),i=0,a=r.length;for(;i<a;){let e=i+a>>1;r[e].t<t-50?i=e+1:a=e}let o=0;for(let e=i;e<r.length;e++){let i=r[e];if(i.t>t)break;let a=ll(i,n);if(a<=0)continue;let s=t-i.t;o+=a*(1-Math.exp(-s/1.8))*Math.exp(-s/(n?30:22))}return o}smokeTint(e){let t=this.app.show.all(`fog`),n=0,r=t.length;for(;n<r;){let i=n+r>>1;t[i].t<e-50?n=i+1:r=i}let i=this.tintSum.setRGB(0,0,0),a=0;for(let r=n;r<t.length;r++){let n=t[r];if(n.t>e)break;if(n.fx!==`burst`)continue;let o=ll(n,!1);if(o<=0)continue;let s=e-n.t,c=o*(1-Math.exp(-s/1.2))*Math.exp(-s/22),l=this.tintCache.get(n.id);if(!l){l=ec(n.p.color,this.app.show.paletteAt(n.t,this.palette),new I,`white`);let e=Math.max(l.r,l.g,l.b,1e-4);l.multiplyScalar(1/e),this.tintCache.set(n.id,l)}i.r+=l.r*c,i.g+=l.g*c,i.b+=l.b*c,a+=c}return this.tint.setRGB(1,1,1),a>1e-4&&(i.multiplyScalar(1/a),this.tint.lerp(i,Math.min(.96,a/(a+.3)))),this.tint}afterUpdate(e){this.levelRev!==this.app.show.revision&&this.rebuildLevels();let t=e.showTime,n=this.hazeAt(t);this.hazeLevel=n;let r=this.accumulate(`pyro`,t,!1)+this.accumulate(`fog`,t,!1),i=r+this.accumulate(`fireworks`,t,!1);this.groundSmoke=1-Math.exp(-r);let a=this.accumulate(`fireworks`,t,!0);this.stageSmoke=1-Math.exp(-i),this.skySmoke=1-Math.exp(-a);let o=this.app.env;o.haze=Math.min(1,n+this.stageSmoke*.08);let s=this.segAt(t);if(s>=0?cl(this.levels[s],t,this.glowNow):this.glowNow.setRGB(0,0,0),this.shared.lights.glow.copy(this.glowNow),this.haze){let r=this.crowdMode()===`tribe`,i=Math.min(1,Math.max(0,Number.isFinite(o.smoke)?o.smoke:0)),a=1+2*i,s=(.062*n+.1*this.stageSmoke)*a+.22*i,c=((.022*n+.02*this.stageSmoke)*a+.09*i)*(r?.55:1),l=.02*n+.2*this.skySmoke+.12*i,u=this.tune,d=Math.min(1,Math.max(0,(this.groundSmoke-u.bankK0)/Math.max(.01,u.bankK1-u.bankK0))),f=u.bankSmoke*d*d*(3-2*d),p=u.bankBase*n,m=u.bankSides*n+.6*f;this.haze.setBanks((p+f)*u.bankDeck,(p+f)*u.bankPillars,m,m*u.bankArms),this.haze.setShaftLight(o.pillarShaftColor,o.pillarShaftIntensity);let h=this.cameraMode();this.haze.setViewer(h===`first`||h===`third`?this.tune.viewer:0),this.haze.setDensity(s,c,l);let g=e.camera.position,_=Math.max(0,Math.abs(g.x)-37),v=Math.max(0,g.z-8,-30-g.z),y=Math.max(0,g.y-20),b=Math.sqrt(_*_+y*y+v*v),x=1-Math.min(1,Math.max(0,(b-6)/22));this.haze.setCloseUp(x*x*(3-2*x));let S=this.smokeTint(t),C=o.glowColor,w=Math.max(C.r,C.g,C.b);if(i>0&&w>.001){let e=this.tune.tintLean*i;S.setRGB(S.r+(C.r/w-S.r)*e,S.g+(C.g/w-S.g)*e,S.b+(C.b/w-S.b)*e)}this.haze.setTint(S)}}cameraMode(){this.camSys===void 0&&(this.camSys=this.app.get(`camera`)??null);let e=this.camSys?.mode;return typeof e==`string`?e:`showcam`}crowdMode(){this.crowdSys===void 0&&(this.crowdSys=this.app.get(`crowd`)??null);let e=this.crowdSys?.mode;return typeof e==`string`?e:`filmed`}stats(){let e=super.stats();return e.haze=+this.hazeLevel.toFixed(2),e.stageSmoke=+this.stageSmoke.toFixed(2),e.groundSmoke=+this.groundSmoke.toFixed(2),e.skySmoke=+this.skySmoke.toFixed(2),e.hazeSprites=this.haze?.count??0,e}dispose(){super.dispose(),this.haze?.dispose()}};function ol(e){return e.level===`ultra`?1:e.level===`high`?.8:e.level===`medium`?.55:.35}function sl(e,t){if(e.fade<=0)return e.to;let n=Math.min(1,Math.max(0,(t-e.t)/e.fade));return e.from+(e.to-e.from)*n*n*(3-2*n)}function cl(e,t,n){let r=e.fade<=0?1:Math.min(1,Math.max(0,(t-e.t)/e.fade));return n.copy(e.g0).lerp(e.g1,r*r*(3-2*r))}function ll(e,t){let n=e.p,r=(e,t)=>typeof e==`number`&&Number.isFinite(e)?e:t;if(e.sys===`fireworks`)return t?e.fx===`shell`?.05:e.fx===`salvo`?.03*r(n.count,8):e.fx===`finale`?.02*r(n.density,15)*e.dur:0:e.fx===`comet`?.006*Math.min(60,r(n.count,10)):e.fx===`cake`?.012*Math.min(40,r(n.shots,20)):e.fx===`mine`?.05:e.fx===`finale`?.01*r(n.density,15)*e.dur:0;if(e.sys===`fog`)return e.fx===`burst`?.25*Math.min(8,r(n.size,1))*Math.min(3,r(n.density,1))*(r(n.rate,0)>0?.4:1):0;switch(e.fx){case`flame`:return .035*(r(n.height,8)/8)*Math.max(.4,e.dur);case`firewall`:case`dragon_breath`:return .07*e.dur;case`jet`:return .015*e.dur;case`gerb`:return .05*Math.sqrt(Math.max(.5,e.dur))*(r(n.height,8)/10);case`waterfall`:return .03*e.dur;case`burst`:return .14*r(n.size,1)*(e.dur>=2||n.type===`bengal`?Math.max(.5,e.dur*.5):1);case`bengal`:return .12*e.dur;default:return 0}}var ul=[1,.012,.004],dl=[0,1,.17],fl=[0,-.09,1],pl=fl;function ml(e,t){let n=Math.max(e.r,e.g,e.b,1e-5),r=Math.min(e.r,e.g,e.b)*.6,i=1/Math.max(1e-5,n-r),a=(e.r-r)*i,o=(e.g-r)*i,s=(e.b-r)*i;a=a<.05?0:a,o=o<.05?0:o,s=s<.05?0:s;let c=a*ul[0]+o*dl[0]+s*pl[0],l=a*ul[1]+o*dl[1]+s*pl[1],u=a*ul[2]+o*dl[2]+s*pl[2];c=Math.max(0,c),l=Math.max(0,l),u=Math.max(0,u);let d=1/Math.max(c,l,u,1e-5);c*=d,l*=d,u*=d;let f=.2126*c+.7152*l+.0722*u,p=Math.min(4,Math.max(.75,.55/Math.max(f,.001)))**.55;return t.r=c*p,t.g=l*p,t.b=u*p,t}function hl(e,t=334462){let n=e*e*e,r=new Float32Array(n),i=new ft(t);for(let[t,n]of[[4,.52],[8,.3],[16,.18]]){let a=new Float32Array(t*t*t);for(let e=0;e<a.length;e++)a[e]=i.next();let o=t/e,s=(e,n,r)=>(r%t*t+n%t)*t+e%t,c=0;for(let t=0;t<e;t++){let i=t*o,l=Math.floor(i),u=i-l;u=u*u*(3-2*u);for(let t=0;t<e;t++){let i=t*o,d=Math.floor(i),f=i-d;f=f*f*(3-2*f);for(let t=0;t<e;t++,c++){let e=t*o,i=Math.floor(e),p=e-i;p=p*p*(3-2*p);let m=a[s(i,d,l)],h=a[s(i+1,d,l)],g=a[s(i,d+1,l)],_=a[s(i+1,d+1,l)],v=a[s(i,d,l+1)],y=a[s(i+1,d,l+1)],b=a[s(i,d+1,l+1)],x=a[s(i+1,d+1,l+1)],S=m+(h-m)*p,C=g+(_-g)*p,w=v+(y-v)*p,T=b+(x-b)*p,E=S+(C-S)*f,D=w+(T-w)*f;r[c]+=(E+(D-E)*u)*n}}}}let a=1/0,o=-1/0;for(let e=0;e<n;e++){let t=r[e];t<a&&(a=t),t>o&&(o=t)}let s=new Uint8Array(n),c=1/Math.max(1e-6,o-a);for(let e=0;e<n;e++)s[e]=Math.round((r[e]-a)*c*255);let l=new ve(s,e,e,e);return l.format=ge,l.type=g,l.minFilter=de,l.magFilter=de,l.wrapS=be,l.wrapT=be,l.wrapR=be,l.generateMipmaps=!1,l.unpackAlignment=1,l.needsUpdate=!0,l}var gl=`
uniform sampler3D uNoise;
uniform vec3 uDrift;
uniform float uHaze;
uniform float uLowHaze;
uniform float uNoiseAmt;
uniform float uOct;
uniform float uFogD;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogMode;
uniform float uFlow;
uniform float uExt;
uniform float uFieldHaze;
uniform float uStageL;

float hazeNoise(vec3 p) {
  float n = texture(uNoise, p * vec3(0.017, 0.028, 0.017) + uDrift).r;
  if (uOct > 1.5) n = n * 0.6 + texture(uNoise, p * 0.067 - uDrift * 1.7).r * 0.4;
  return n;
}

float hazeProfile(float y) {
  y = max(y, 0.0);
  return 0.8 * exp(-y / 34.0) + 0.2 * exp(-y / 170.0) + uLowHaze * exp(-y / 4.5);
}

// stage cloud -> thin field air (1 at the set, uFieldHaze far out over the field)
float stageHaze(vec3 p) {
  return mix(uFieldHaze, 1.0, exp(-max(p.z - 2.0, 0.0) / uStageL));
}

// hazeProfile with the stage -> field gradient on the air part (the low fog keeps its own extent)
float hazeProfileAt(vec3 p) {
  float y = max(p.y, 0.0);
  return (0.8 * exp(-y / 34.0) + 0.2 * exp(-y / 170.0)) * stageHaze(p) + uLowHaze * exp(-y / 4.5);
}

float hazeDensity(vec3 p) {
  float puff = smoothstep(0.36, 0.68, hazeNoise(p));
  return uHaze * hazeProfileAt(p) * mix(1.0, puff * puff * 2.4 + 0.04, uNoiseAmt);
}

float fogTransmit(float d) {
  if (uFogMode > 1.5) return clamp((uFogFar - d) / max(uFogFar - uFogNear, 1.0), 0.0, 1.0);
  if (uFogMode > 0.5) return exp(-uFogD * uFogD * d * d);
  return 1.0;
}

// Henyey-Greenstein mixed with an isotropic part, normalised to 1 at 90 degrees
float hazePhase(float c) {
  const float g = 0.4;
  const float g2 = g * g;
  float hg = (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5);
  float hg90 = (1.0 - g2) / pow(1.0 + g2, 1.5);
  return 0.4 + 0.6 * hg / hg90;
}
`,_l=`
attribute vec4 iA; // origin.xyz, length
attribute vec4 iB; // dir.xyz, dash (fract) + hit (>= 1)
attribute vec4 iC; // colour * power (rgb), width scale
attribute vec4 iD; // direction one shutter interval earlier (motion smear), w = visible reach (floor(m) + fade start fraction, 0 = none)

uniform float uPixAng;
uniform float uHalo;

varying vec3 vWorld;
varying vec3 vColor;
varying vec3 vDir;
varying float vX;
varying float vM;
varying float vSigC;
varying float vSigH;
varying float vAlong;
varying float vLen;
varying float vDash;
varying float vNear;
varying vec2 vReach;

void main() {
  vec3 O = iA.xyz;
  float L = max(iA.w, 0.01);
  vec3 D = iB.xyz;
  vec3 D2 = dot(iD.xyz, iD.xyz) > 0.5 ? iD.xyz : D;
  float sc = clamp(dot(cameraPosition - O, D) / L, 0.0, 1.0);
  float k = position.x;
  float s;
  if (k <= 0.5) { float q = 1.0 - k * 2.0; s = sc * (1.0 - q * q); }
  else { float q = (k - 0.5) * 2.0; s = sc + (1.0 - sc) * q * q; }
  float along = s * L;
  vec3 P = O + D * along;
  vec3 toCam = cameraPosition - P;
  float dist = length(toCam);
  // constant along the beam (cross(D, C - O - D s) = cross(D, C - O)): the ribbon never twists
  vec3 side = cross(D, toCam);
  float sl = length(side);
  side = sl > 1e-5 ? side / sl : normalize(cross(D, vec3(0.31, 0.93, 0.17)));
  float pix = dist * uPixAng;
  float rPhys = (0.003 + 0.00035 * along) * iC.w;
  float sigC = max(rPhys * 0.5, 0.6 * pix);
  float sigH = max((0.006 + 0.0004 * along) * uHalo * iC.w, 1.7 * pix);
  // shutter smear: where the beam was one exposure ago, projected on the ribbon's lateral axis
  float m = dot(D2 - D, side) * along;
  float x = position.y < 0.0 ? min(0.0, m) - 3.0 * sigH : max(0.0, m) + 3.0 * sigH;
  P += side * x;
  vWorld = P;
  vColor = iC.rgb;
  vDir = D;
  vX = x;
  vM = m;
  vSigC = sigC;
  vSigH = sigH;
  vAlong = along;
  vLen = L;
  vDash = fract(iB.w);
  vReach = vec2(floor(iD.w), fract(iD.w));
  // distance from the eye to the beam axis: beams brushing past the camera fade out (no "light sabre")
  vec3 oc = cameraPosition - O;
  float dAxis = length(oc - D * clamp(dot(oc, D), 0.0, L));
  vNear = smoothstep(0.15, 1.6, dAxis);
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}
`,vl=`
uniform float uGain;
uniform float uTime;
uniform float uCalm;
${gl}
varying vec3 vWorld;
varying vec3 vColor;
varying vec3 vDir;
varying float vX;
varying float vM;
varying float vSigC;
varying float vSigH;
varying float vAlong;
varying float vLen;
varying float vDash;
varying float vNear;
varying vec2 vReach;

// logistic approximation of the normal CDF
float ncdf(float x) { return 1.0 / (1.0 + exp(-1.702 * x)); }
// gaussian (sigma s) convolved with the shutter smear box [0, m]; integral is constant (0.02*sqrt(2pi))
// so a fast-moving beam spreads the same energy into a wider, dimmer wedge
float smearProfile(float x, float m, float s) {
  float w = max(abs(m), 0.2 * s);
  float c0 = 0.5 * m;
  return (ncdf((x - c0 + 0.5 * w) / s) - ncdf((x - c0 - 0.5 * w) / s)) * (0.0501 / w);
}

void main() {
  vec3 V = cameraPosition - vWorld;
  float dist = length(V);
  V /= max(dist, 1e-4);
  vec3 D = normalize(vDir);
  float c = dot(D, V);
  float s = sqrt(max(1.0 - c * c, 0.0));
  float hz = uGain * hazeDensity(vWorld);
  float ph = hazePhase(c);
  // single scattering (core): forward-peaked phase and 1/sin path length -> flares down the beam
  // (calm, photosensitivity option: a beam aimed at the viewer gets at most ~3x its side-on level instead of
  // ~27x, so a fan sweeping across the lens does not flash once per beam)
  float line = hz * ph / max(s, 0.14);
  if (uCalm > 0.5) line = hz * min(ph, 1.6) / max(s, 0.5);
  // multiple scattering (halo): far less directional
  float haloLine = hz * (0.6 + 0.4 * ph) / max(s, 0.3);
  float core = smearProfile(vX, vM, vSigC);
  float halo = smearProfile(vX, vM, vSigH) * 0.13;
  vec3 col = vColor * (line * core + haloLine * halo);
  // scanned figures break up into dashes (galvo blanking seen through the camera shutter)
  if (vDash > 0.01) {
    float d = fract(vAlong * 0.22 - uTime * 1.7);
    col *= mix(1.0, 0.04 + 0.96 * smoothstep(0.1, 0.25, d) * (1.0 - smoothstep(0.55, 0.7, d)), vDash);
  }
  // emerges from the aperture, loses power to the haze along the way (extinction), ends at the hit point
  col *= smoothstep(0.12, 0.5, vAlong) * (1.0 - smoothstep(vLen - 0.05, vLen, vAlong)) * exp(-vAlong * uExt);
  // visible reach: the figure dissolves in the haze after 'reach' metres (compact looks near the set)
  if (vReach.x > 0.5) col *= 1.0 - smoothstep(vReach.x * vReach.y, vReach.x, vAlong);
  col *= fogTransmit(dist) * vNear;
  // soft knee: a beam seen (nearly) end-on is 20-30x brighter than side-on (phase x path length); the
  // camera / eye shows it as a bright coloured line with a flare at the source, not a white-hot bar
  // flooding the bloom — moderate beams keep ~85 % of their level
  float mx = max(max(col.r, col.g), col.b);
  col *= 1.0 / (1.0 + mx * 0.2);
  gl_FragColor = vec4(col, 1.0);
}
`,yl=`
attribute vec4 sA; // apex.xyz, range
attribute vec4 sB; // forward.xyz, angle (fan half-angle | cone half-angle)
attribute vec4 sC; // normal.xyz, kind (0 sheet fan, 1 cone, 2 low-fog layer fan)
attribute vec4 sD; // colour * power (rgb), wave amplitude (rad)
attribute vec4 sE; // wave phase 1, wave phase 2, segment mask amount, segment phase
attribute vec4 sF; // safety zone |x| limit, cone vertical squash, sheet height above the fog top, -
attribute vec4 sG; // cone rings: spacing (m, 0 = none), ring phase (cycles), figure lobes (0 = circle), lobe amplitude

varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vDir;
varying vec3 vColor;
varying float vU;
varying float vR;
varying float vRange;
varying float vMode;
varying float vSeg;
varying float vSegPh;
varying float vZone;
varying float vLift;
varying vec3 vColor2;
varying vec2 vRing;
varying float vCeilK;
// sheet extras (round 11): near edge (m), thin band (m), patches (0-1)
varying vec3 vSheet;
uniform float uPixAng;
// the lit low-fog layer on the side banks (a dense bank floods the bowl): x = amount (0 = flat at the fog top),
// y = bank toe |x| (m), z = slope, w = crest height (terrain-layout.json sideBanks, Z -20..105, ramp to 115)
uniform vec4 uBank;

float bankY(vec3 p) {
  float s = clamp((abs(p.x) - uBank.y) * uBank.z, 0.0, uBank.w);
  return s * step(-20.0, p.z) * (1.0 - smoothstep(105.0, 115.0, p.z));
}

vec3 rayDir(float u) {
  vec3 F = sB.xyz;
  vec3 N = sC.xyz;
  vec3 R = normalize(cross(N, F));
  float amp = sD.w;
  if (sC.w < 0.5 || sC.w > 1.5) {
    float a = (u - 0.5) * 2.0 * sB.w;
    float alpha = amp * (0.62 * sin(5.0 * a + sE.x) + 0.38 * sin(8.7 * a - sE.y + 1.3));
    vec3 d = cos(a) * F + sin(a) * R;
    return normalize(d * cos(alpha) + N * sin(alpha));
  }
  // (elliptical) cone: horizontal half-angle sB.w, the vertical aperture scaled by sF.y; the drawn
  // figure is a circle or, with lobes (sG.z), a spirograph rosette, rotated by sE.y
  float phi = u * 6.2831853;
  vec2 c = vec2(cos(phi + sE.y), sin(phi + sE.y));
  if (sG.z > 0.5) c = (c + sG.w * vec2(cos(sG.z * phi - sE.y), -sin(sG.z * phi - sE.y))) / (1.0 + sG.w);
  float th = tan(sB.w * (1.0 + amp * sin(3.0 * phi + sE.x)));
  return normalize(F + th * (c.x * R + sF.y * c.y * N));
}

void main() {
  float u = position.x;
  float v = position.y;
  float range = sA.w;
  float r = mix(0.4, range, pow(v, 1.75));
  vec3 d = rayDir(u);
  vec3 d1 = rayDir(u + 0.0025);
  vec3 d0 = rayDir(u - 0.0025);
  vNormal = normalize(cross(d, d1 - d0));
  vec3 P = sA.xyz + d * r;
  if (sC.w > 1.5 && uBank.x > 0.0) P.y += uBank.x * bankY(P);
  // a thin sheet (band param) seen edge-on from inside its plane projects to a line of zero area: vertices near the
  // camera's plane are pushed off it by ~1.5 px, alternately to either side, so the eye-level line keeps its width
  if (sC.w < 0.5 && sG.y > 0.0) {
    vec3 Np = normalize(sC.xyz);
    float need = length(cameraPosition - P) * uPixAng * 1.5;
    float pd = abs(dot(cameraPosition - P, Np));
    float alt = mod(float(gl_VertexID), 2.0) < 0.5 ? 1.0 : -1.0;
    P += Np * alt * need * (1.0 - smoothstep(need, 2.0 * need, pd));
  }
  vWorld = P;
  vDir = d;
  vColor = sD.rgb;
  vU = u;
  vR = r;
  vRange = range;
  vMode = sC.w;
  vSeg = sE.z;
  vSegPh = sE.w;
  vZone = sF.x;
  vLift = sF.z;
  vCeilK = sF.w > 0.0 ? sF.w : 1.0;
  vRing = sG.xy;
  vSheet = sG.xyz;
  // low-fog layer: the crest colour rides in the (unused) wave-phase slots
  vColor2 = sC.w > 1.5 ? sE.xyz : sD.rgb;
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}
`,bl=`
uniform float uGainS;
uniform vec4 uCeil;
uniform float uTime;
// laser sea: x = trough floor, y = falloff exponent with the distance from the deck, z = gain
uniform vec4 uSea;
// ceiling seen from far below: x = smooth broad clouds instead of the fine smoke texture, y = weight towards the set
uniform vec4 uCeilT;
${gl}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vDir;
varying vec3 vColor;
varying float vU;
varying float vR;
varying float vRange;
varying float vMode;
varying float vSeg;
varying float vSegPh;
varying float vZone;
varying float vCeilK;
varying float vLift;
varying vec3 vColor2;
varying vec2 vRing;
varying vec3 vSheet;

// anti-aliased family of thin lines at u*n: fades to its mean where lines get denser than pixels
float lines(float x, float sharp) {
  float w = fwidth(x);
  float l = pow(0.5 + 0.5 * cos(6.2831853 * x), sharp);
  float mean = 1.0 / sqrt(sharp * 3.14159);
  return mix(l, mean, smoothstep(0.12, 0.45, w));
}

void main() {
  if (vWorld.y < 0.02) discard;
  // safety zoning (Tribe mode): the scanner blanks the directions that would reach the raised banks
  float zone = 1.0 - smoothstep(vZone - 5.0, vZone, abs(vWorld.x));
  if (zone <= 0.001) discard;
  vec3 V = cameraPosition - vWorld;
  float dist = length(V);
  V /= max(dist, 1e-4);
  vec3 Nn = normalize(vNormal);
  float nvs = dot(Nn, V);
  float nv = abs(nvs);
  float c = dot(normalize(vDir), V);
  // the scanned plane only shows where there is smoke. Low fog pushed from the stage rolls towards
  // the audience: structures elongated along x (parallel to the stage), advected along +z.
  vec3 q = vWorld + vec3(0.0, 0.0, -uFlow * 1.3);
  float n1 = texture(uNoise, q * vec3(0.011, 0.05, 0.034) + uDrift).r;
  float n2 = texture(uNoise, q * vec3(0.043, 0.2, 0.11) - uDrift * 2.3).r;
  float n3 = uOct > 1.5 ? texture(uNoise, vWorld * vec3(0.16, 0.4, 0.16) + uDrift * 4.0).r : 0.5;
  float tex = smoothstep(0.34, 0.74, n1 * 0.55 + n2 * 0.3 + n3 * 0.15);
  float fade = (1.0 - smoothstep(0.6, 1.0, vR / vRange)) * smoothstep(0.3, 3.0, vR) * exp(-vR * uExt);
  vec3 col;
  float capI = 2.6;
  if (vMode > 1.5) {
    // ---- the low-fog layer under a skimming sheet ("laser sea", Embers f115/f116): the waving plane
    // dips into the fog tops and lights them; the scan lines land on the fog as drifting streaks.
    // A ~0.5 m thick glowing layer: its path-length boost is small (1/max(|n.v|, 0.22)).
    // rolling swells (~10 x 5 m) and ripples (~3.5 x 2 m) pushed out from the stage; only the crests that
    // rise into the sheet catch its light -> bright waves over dark troughs (f116)
    // The noise tile's lowest octave is a 4-cell lattice repeating every 1/scale metres: on the flat fog
    // top, axis-aligned samples showed it as a checkerboard. Sampled on rotated axes with a domain warp
    // and at the swell scale (lattice cells ~8 x 4 m, ripples ~4 x 2 m), the waves read as rolling fog.
    vec3 qr = vec3(q.x * 0.83 + q.z * 0.56, q.y, q.z * 0.83 - q.x * 0.56);
    vec3 wp = vec3(n1 - 0.5, 0.0, n2 - 0.5) * 0.8;
    float w1 = texture(uNoise, qr * vec3(0.032, 0.3, 0.064) + wp + uDrift).r;
    // (one octave: the mid-scale haze noise stands in for the ripples, not a flat 0.5 that evens the sea out)
    float w2 = uOct > 1.5 ? texture(uNoise, qr.zyx * vec3(0.11, 0.5, 0.06) - wp * 0.5 - uDrift * 2.0).r : n2;
    float fogTex = smoothstep(0.34, 0.76, w1 * 0.55 + w2 * 0.3 + n1 * 0.15);
    float crest = fogTex * fogTex;
    float streak = lines(vU * 29.0 + uTime * 0.07, 5.0);
    float edgeU = smoothstep(0.0, 0.12, min(vU, 1.0 - vU));
    // most of the sea is dark trough; the light sits on the crests that rise into the sheet (video
    // Embers v1139-1160: bright rolling waves and dark gaps, never an evenly lit floor)
    float I = uGainS * uSea.z * uLowHaze * (uSea.x + 0.5 * crest + 3.6 * crest * crest) * (0.55 + 1.3 * streak) * (0.55 + 0.45 * hazePhase(c))
      * pow(max(vR, 6.0), -uSea.y) / max(nv, 0.25) * exp(-vLift / 1.3) * edgeU;
    // deep scan colour in the troughs and on most of the swell, the second colour only on the brightest
    // crests (v1145: a saturated deep-blue sea with pale-blue highlights)
    col = mix(vColor, vColor2, smoothstep(0.3, 0.9, crest)) * I;
    capI = 2.2;
  } else if (vMode < 0.5) {
    // ---- a scanned sheet ("liquid sky"). Single scattering in a thin plane: radiance ∝ 1/|n.v| (the
    // path through the sheet grows at grazing views), limited by the sheet's thickness + waviness
    // (~0.03). Seen from inside / right next to its plane the sheet therefore collapses into a crisp
    // bright line with a faint veil towards the camera — never a uniformly lit screen.
    // Seen from above (drone) the smoke texture is a continuous sea; from below / edge-on it breaks
    // into clumps but stays a readable ceiling.
    float above = step(0.0, nvs * sign(Nn.y + 1e-4));
    float faceOn = smoothstep(0.25, 0.7, nv) * above;
    // far BELOW the plane (a roof projector tilted up over the field, Embers v1110-1128 / v1182-1188):
    // the camera no longer sees a line to expose for, but the smoke clouds the plane slices through, lit
    // from inside — a blue ceiling of clouds over the upper half of the frame, the scan lines lost in the
    // smoke. uCeil: x extra gain, y..z plane distance (m) over which this takes over, w pattern loss
    float planeDist = abs(dot(cameraPosition - vWorld, Nn));
    float farBelow = (1.0 - above) * smoothstep(uCeil.y * vCeilK, uCeil.z * vCeilK, planeDist);
    float texC = smoothstep(0.3, 0.75, n1 * 0.7 + n2 * 0.3);
    float ceilT = 0.1 + 1.6 * texC * texC;
    if (uCeilT.x > 0.0 && farBelow > 0.0) {
      // broad, soft clouds (tens of metres): the lit smoke over the set reads as a smooth band, not blotches
      float nB = texture(uNoise, vWorld * vec3(0.0045, 0.011, 0.0065) + uDrift * 0.6).r;
      ceilT = mix(ceilT, 0.25 + 1.1 * smoothstep(0.25, 0.8, nB * 0.8 + n1 * 0.2), uCeilT.x);
    }
    ceilT *= 1.0 + uCeilT.y * (stageHaze(vWorld) - 0.5);
    float t3 = mix(mix(0.12 + 1.7 * tex * tex, tex * 0.9 + 0.3, faceOn), ceilT, farBelow);
    // the air part thins from the stage cloud to the field air (as for the beams: the stage haze drifts
    // back over the set, the far field holds little of it) and the low fog adds half its density here —
    // its lit tops are the sea layer (pushSea). A sheet over the far field is a faint veil, not a lit
    // floor (video v1389 / v1463: violet near the deck lip, the far field dark)
    float yS = max(vWorld.y, 0.0);
    float haze = uHaze * ((0.8 * exp(-yS / 34.0) + 0.2 * exp(-yS / 170.0)) * stageHaze(vWorld) + 0.5 * uLowHaze * exp(-yS / 4.5)) * t3;
    // Near its plane (and from below) the eye / camera exposes for the blinding edge-on line: the rest
    // of the plane, 10–30x dimmer, falls away into the dark (f017 / f147: a thin crisp band in a dark
    // scene, not a lit floor or a coloured sky). From a drone high above, the whole sea stays readable.
    // Round 4: this holds up to ~20 m above the plane (the FOH / tower / crane cameras: v1389, v1463 show
    // a line and violet haze near the deck, not a lit violet floor), and the grazing path length is
    // capped by the sheet's waviness + scan jitter (~0.045 rad) once the eye is off the plane (next to
    // it, the crisp edge-on line keeps the thickness cap)
    float kNear = 40.0 * (1.0 - smoothstep(0.5, 22.0, planeDist));
    kNear = max(kNear, 10.0 * (1.0 - above) * (1.0 - farBelow));
    float E = inversesqrt(nv * nv + mix(0.0005, 0.002, smoothstep(1.0, 4.0, planeDist))) * exp(-nv * kNear);
    float I = uGainS * haze * hazePhase(c) * pow(max(vR, 4.0), -0.75) * E * (1.0 + farBelow * uCeil.x);
    // round 11 extras: the sheet starts vSheet.x m out (extent); a thin sheet (band vSheet.y m) reads only as the
    // edge-on line from inside its band and fades out when the eye is further off its plane (no broad wash from
    // just below it: v1470-1471.3); patches (vSheet.z) break it into a few lit clouds (v1505.6-1507)
    if (vSheet.x > 0.0) I *= smoothstep(vSheet.x, vSheet.x * 1.15 + 2.0, vR);
    if (vSheet.y > 0.0) I *= 1.0 - smoothstep(vSheet.y, 2.0 * vSheet.y, planeDist);
    if (vSheet.z > 0.0) {
      float nP = texture(uNoise, vWorld * vec3(0.0075, 0.02, 0.0075) + uDrift * 0.5).r * 0.75 + n1 * 0.25;
      float t0 = mix(0.66, 0.42, vSheet.z);
      I *= smoothstep(t0, t0 + 0.1, nP);
    }
    // scan structure: the fan of discrete beams the scanner draws (+ a second, sliding family -> moire)
    float s1 = lines(vU * 41.0 + uTime * 0.21, 5.0);
    float s2 = lines(vU * 53.0 - uTime * 0.16, 3.0);
    float pattern = mix(0.35 + 1.5 * s1 + 0.45 * s1 * s2, 0.3 + 2.4 * s1, faceOn);
    // the scanning beam itself: a brighter line travelling back and forth inside the sheet
    float scan = 0.5 + 0.5 * sin(uTime * 4.1 + vSegPh);
    pattern += 1.1 * exp(-pow((vU - scan) * 45.0, 2.0));
    // galvo turnarounds dwell at the fan edges -> brighter edges
    float e = min(vU, 1.0 - vU);
    pattern *= 1.0 + 2.0 * exp(-e * 80.0);
    // fine flicker (scanner sampling / speckle)
    pattern *= 0.88 + 0.12 * sin(uTime * 41.0 + vU * 331.0 + vR * 0.7);
    pattern = mix(pattern, 0.8 + 0.4 * s1 * (1.0 - uCeilT.x), farBelow * uCeil.w);
    col = vColor * I * pattern;
  } else {
    // ---- cone shell (tunnel): the drawn circle = dense scan lines + rotating bright segments
    float t3 = tex * tex * 1.8 + 0.1;
    float haze = uHaze * hazeProfileAt(vWorld) * t3;
    float I = uGainS * haze * hazePhase(c) * pow(max(vR, 4.0), -0.75) * inversesqrt(nv * nv + 0.0036);
    float l = lines(vU * 96.0, 10.0);
    float m = 0.5 + 0.5 * cos(6.2831853 * (vU * 5.0 - vSegPh));
    float pattern = (0.6 + 1.6 * l) * mix(1.0, 0.15 + 1.6 * m * m * m, vSeg);
    if (vRing.x > 0.0) {
      // rings scanned down the cone ("laser tunnel" circles travelling towards the audience): thin
      // bright circles in the smoke over a faint shell; they fade in off the aperture
      float ring = lines(vR / vRing.x - vRing.y, 16.0);
      pattern *= (0.07 + 4.2 * ring) * smoothstep(0.8, 3.0, vR);
    }
    pattern *= 0.88 + 0.12 * sin(uTime * 41.0 + vU * 331.0 + vR * 0.7);
    col = vColor * I * pattern;
    capI = 6.0;
  }
  col *= fade * fogTransmit(dist) * zone;
  // soft ceiling: however close the eye gets, a sheet stays a textured glow, never a flat colour field
  float mx = max(max(col.r, col.g), col.b);
  col *= capI / max(mx, capI);
  gl_FragColor = vec4(col, 1.0);
}
`,xl=`
attribute vec4 pA; // position.xyz, world size
attribute vec4 pB; // colour (rgb), kind (0 aperture flare, 1 hit spot, 2 lens veil, 3 + tan(half aperture) / 4 lit V wedge,
                 // 4 cone halo, 5 + tan(half aperture) / 4 lit tent, 6 lit cloud, 7 + tan / 4 lined V wedge)
uniform float uPixAng;
varying vec2 vUv;
varying vec3 vColor;
varying float vKind;
varying float vDist;
// world point under the fragment (at the sprite's own position, before the pull): the lit cloud's smoke texture
varying vec3 vWp;
void main() {
  vec3 P = pA.xyz;
  vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vWp = pA.xyz + (camR * position.x + camU * position.y) * pA.w;
  vec3 toCam = cameraPosition - P;
  float dist = max(length(toCam), 1e-3);
  float size;
  if (pB.w > 1.5 && pB.w < 2.5) {
    // lens veil: an in-camera effect, so it is drawn just in front of the lens at the same angular
    // size (nothing in the scene can cut it)
    float dn = 1.5;
    size = pA.w * dn / dist;
    P = cameraPosition - toCam / dist * dn;
    vColor = pB.rgb;
  } else {
    float minSize = (pB.w > 0.5 ? 2.2 : 3.2) * dist * uPixAng;
    size = max(pA.w, minSize);
    // pull towards the camera so the billboard is not cut by the surface it sits on (a lit V wedge stands
    // in the air in front of the set: pulled less, and shrunk to keep its angular size)
    // (a cone halo, kind 4, is the air between the camera and the aperture lit by the beams: pulled halfway, so the
    // ground in front of the lantern does not cut it)
    float pull = pB.w > 3.95 && pB.w < 4.5 ? dist * 0.5 : pB.w > 2.5 ? min(size * 0.3, dist * 0.2) : min(size * 1.1, dist * 0.5);
    P += toCam / dist * pull;
    // energy conservation when clamped to the minimum pixel footprint
    float k = pA.w / size;
    vColor = pB.rgb * k * k;
    if (pB.w > 2.5) size *= (dist - pull) / dist;
  }
  vec4 mv = viewMatrix * vec4(P, 1.0);
  mv.xy += position.xy * size;
  vUv = position.xy;
  vKind = pB.w;
  // (the lens veil is not dimmed by the air between the projector and the lens: the beam is collimated)
  bool veil = pB.w > 1.5 && pB.w < 2.5;
  vDist = veil ? 0.0 : dist;
  gl_Position = projectionMatrix * mv;
  // the lens veil sits on the lens: nothing in the scene may cut it
  if (veil) gl_Position.z = -0.999 * gl_Position.w;
}
`,Sl=`
${gl}
varying vec2 vUv;
varying vec3 vColor;
varying float vKind;
varying float vDist;
varying vec3 vWp;
void main() {
  float r2 = dot(vUv, vUv);
  if (r2 > 1.0) discard;
  float I;
  if (vKind > 5.95 && vKind < 6.5) {
    // a smoke cloud of the low cloud deck lit by the beams (cloud param, round 11): the smoke texture in world space
    // (it drifts with show time like the haze), a soft round falloff
    float n1 = texture(uNoise, vWp * vec3(0.011, 0.028, 0.011) + uDrift * 0.6).r;
    float n2 = texture(uNoise, vWp * vec3(0.034, 0.07, 0.034) - uDrift).r;
    // (sparse: a few separate lit clouds, not a continuous ceiling — v207.5-217.5 shows one to three patches)
    float cl = smoothstep(0.46, 0.8, n1 * 0.7 + n2 * 0.3);
    I = cl * cl * 2.4 * exp(-r2 * 2.2) * (1.0 - r2);
  } else if (vKind > 3.95 && vKind < 4.5) {
    // the halo of a cone seen from inside it (round 11, halo param): the smoke around the aperture lit by the beams all
    // around the view direction — a broad soft disc with a brighter core, sized in angle
    // (the rays: the beams of the cone converging on the aperture, seen end-on through the smoke)
    float r = sqrt(r2);
    float a = atan(vUv.y, vUv.x);
    float ray = pow(0.5 + 0.5 * cos(a * 23.0 + 3.0 * sin(a * 7.0)), 6.0) + 0.6 * pow(0.5 + 0.5 * cos(a * 37.0 + 1.3), 12.0);
    I = exp(-r * 4.5) * (1.0 - r2) * (0.3 + 1.4 * ray);
  } else if (vKind > 4.95 && vKind < 6.0) {
    // the smoke inside a scanned tent (trees, fill param): a soft Λ standing on its base, apex at the top, the legs
    // (where the galvo turns) brighter than the inside, a little dimmer towards the base
    float tH = fract(vKind) * 4.0;
    float h = inversesqrt(1.0 + 4.0 * tH * tH);
    float yy = h - vUv.y;
    float d = abs(vUv.x) - max(yy, 0.0) * tH;
    float inside = smoothstep(0.03, -0.03, d) * smoothstep(-0.02, 0.03, yy) * (1.0 - smoothstep(2.0 * h - 0.03, 2.0 * h + 0.01, yy));
    float legs = exp(-d * d * 500.0) * step(0.0, yy) * step(yy, 2.0 * h);
    float down = clamp(yy / (2.0 * h), 0.0, 1.0);
    I = (inside * 0.45 + legs * 0.9) * (1.0 - 0.35 * down) + exp(-r2 * 4.0) * 0.03;
  } else if (vKind > 6.95 && vKind < 8.0) {
    // a scanned V fan drawn as a dense fan of scan lines (zigzag lines param, round 11: the dense low web of
    // v1258.3-1259 / v1264.3-1265 / v1269.2-1271.2 — many thin lines, not a smooth glow): 16 rays from the apex
    // across the wedge, the edges brighter, fading out to the top line
    float tH = fract(vKind) * 4.0;
    float h = inversesqrt(1.0 + 4.0 * tH * tH);
    float yy = vUv.y + h;
    float ang = atan(vUv.x, max(yy, 1e-4)) / max(atan(tH), 1e-3);
    float inside = step(abs(ang), 1.0) * smoothstep(-0.02, 0.03, yy);
    float up = clamp(yy / (2.0 * h), 0.0, 1.0);
    float ray = pow(0.5 + 0.5 * cos(ang * 3.14159265 * 8.0), 10.0);
    float edge = exp(-(1.0 - abs(ang)) * (1.0 - abs(ang)) * 400.0);
    I = inside * (ray * 1.2 + edge * 0.8 + 0.06) * (1.0 - up * up) * (0.25 + 0.75 * exp(-up * 2.5));
  } else if (vKind > 2.5) {
    // the smoke lit by a scanned V fan (zigzag web): a soft wedge, apex at the bottom, brightest near the
    // apex where the scan is densest, fading out to the top line; a faint bloom around it
    float tH = fract(vKind) * 4.0;
    float h = inversesqrt(1.0 + 4.0 * tH * tH);
    float yy = vUv.y + h;
    float d = abs(vUv.x) - max(yy, 0.0) * tH;
    float edge = exp(-max(d, 0.0) * max(d, 0.0) * 220.0) * smoothstep(-0.03, 0.02, yy);
    float up = clamp(yy / (2.0 * h), 0.0, 1.0);
    I = edge * (1.0 - up * up) * (0.15 + 0.85 * exp(-up * 4.5)) + exp(-r2 * 4.0) * 0.03;
  } else if (vKind > 1.5) {
    // lens hit: a beam straight into the camera floods the frame (veiling glare + anamorphic streak)
    float r = sqrt(r2);
    I = exp(-r2 * 60.0) * 3.0 + exp(-r2 * 9.0) * 0.45 + 0.1 * (1.0 - r) + exp(-abs(vUv.y) * 70.0) * (1.0 - abs(vUv.x)) * 0.7;
  } else if (vKind < 0.5) {
    float core = exp(-r2 * 26.0);
    float glow = exp(-r2 * 5.0) * 0.28;
    float star = (exp(-abs(vUv.y) * 60.0) + exp(-abs(vUv.x) * 60.0)) * (1.0 - sqrt(r2)) * 0.22;
    I = core + glow + star;
  } else {
    I = exp(-r2 * 9.0) + exp(-r2 * 2.5) * 0.15;
  }
  gl_FragColor = vec4(min(vColor * I * fogTransmit(vDist), vec3(96.0)), 1.0);
}
`,Cl=16,wl=28,Tl=8,El=16,Dl=12,Ol=21e5;function kl(e){switch(e.level){case`ultra`:return{maxSurfaces:12,segU:96,segV:40};case`high`:return{maxSurfaces:9,segU:80,segV:34};case`medium`:return{maxSurfaces:6,segU:60,segV:26};default:return{maxSurfaces:4,segU:44,segV:18}}}var Al=class{group=new y;beamCap=0;beamBudget=0;surfCap=0;spriteCap=0;beamCount=0;surfCount=0;spriteCount=0;sq={maxSurfaces:4,segU:44,segV:18};beamData=new Float32Array;surfData=new Float32Array;spriteData=new Float32Array;beamBuf;surfBuf;spriteBuf;beamGeo;surfGeo;spriteGeo;beamMesh;surfMesh;spriteMesh;housings=null;housingMat=new le({color:`#16181c`,metalness:.55,roughness:.45});noise=null;shared;beamMat;surfMat;spriteMat;constructor(){this.group.name=`Lasers`,this.shared={uNoise:{value:null},uDrift:{value:new u},uHaze:{value:.6},uLowHaze:{value:0},uNoiseAmt:{value:.75},uOct:{value:2},uFogD:{value:0},uFogNear:{value:1},uFogFar:{value:2e3},uFogMode:{value:0},uPixAng:{value:.002},uTime:{value:0},uFlow:{value:0},uExt:{value:.004},uFieldHaze:{value:.22},uStageL:{value:34},uCalm:Ye};let e={transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,fog:!1};this.beamMat=new C({...e,vertexShader:_l,fragmentShader:vl,uniforms:{...this.shared,uGain:{value:1},uHalo:{value:1}}}),this.surfMat=new C({...e,vertexShader:yl,fragmentShader:bl,uniforms:{...this.shared,uGainS:{value:1},uCeil:{value:new p(Dl,12,35,.85)},uCeilT:{value:new p(1,1.5,0,0)},uSea:{value:new p(.015,.55,1,0)},uBank:{value:new p(0,46,.096,5.2)}}}),this.spriteMat=new C({...e,vertexShader:xl,fragmentShader:Sl,uniforms:{...this.shared}}),this.beamMat.name=`laser-beams`,this.surfMat.name=`laser-sheets`,this.spriteMat.name=`laser-flares`}get beamUniforms(){return this.beamMat.uniforms}get surfUniforms(){return this.surfMat.uniforms}preRender=null;onBefore=()=>{this.preRender?.()};setPreRender(e){this.preRender=e}init(e){this.noise=hl(e.level===`mobile`?32:64),this.shared.uNoise.value=this.noise,this.setQuality(e)}setQuality(e){let t=Math.max(32,e.laserBudget);this.beamBudget=t,this.sq=kl(e),this.shared.uOct.value=e.volumetrics?2:1,this.shared.uNoiseAmt.value=e.volumetrics?.78:.6,t!==this.beamCap&&this.buildBeams(t),this.buildSurfaces(this.sq);let n=t+96;n!==this.spriteCap&&this.buildSprites(n)}updateBudget(e){let t=e>Ol?Math.max(.5,Math.sqrt(Ol/e)):1;return this.beamBudget=Math.max(32,Math.floor(this.beamCap*t)),this.beamBudget}buildBeams(t){this.beamMesh&&(this.group.remove(this.beamMesh),this.beamGeo.dispose()),this.beamCap=t,this.beamData=new Float32Array(t*Cl);let r=new xe,i=[],a=[];for(let e=0;e<=El;e++){let t=e/El;if(i.push(t,-1,0,t,1,0),e<El){let t=e*2;a.push(t,t+1,t+2,t+1,t+3,t+2)}}r.setAttribute(`position`,new P(i,3)),r.setIndex(a);let s=new n(this.beamData,Cl,1);s.setUsage(o),r.setAttribute(`iA`,new c(s,4,0)),r.setAttribute(`iB`,new c(s,4,4)),r.setAttribute(`iC`,new c(s,4,8)),r.setAttribute(`iD`,new c(s,4,12)),r.instanceCount=0,this.beamBuf=s,this.beamGeo=r,this.beamMesh=new e(r,this.beamMat),this.beamMesh.frustumCulled=!1,this.beamMesh.renderOrder=20,this.beamMesh.name=`laser-beams`,this.beamMesh.onBeforeRender=this.onBefore,this.group.add(this.beamMesh)}buildSurfaces(t){this.surfMesh&&(this.group.remove(this.surfMesh),this.surfGeo.dispose()),this.surfCap=t.maxSurfaces,this.surfData=new Float32Array(this.surfCap*wl);let r=new xe,i=[],a=[],s=t.segU,l=t.segV;for(let e=0;e<=l;e++)for(let t=0;t<=s;t++)i.push(t/s,e/l,0);for(let e=0;e<l;e++)for(let t=0;t<s;t++){let n=e*(s+1)+t,r=n+s+1;a.push(n,r,n+1,n+1,r,r+1)}r.setAttribute(`position`,new P(i,3)),r.setIndex(a);let u=new n(this.surfData,wl,1);u.setUsage(o),r.setAttribute(`sA`,new c(u,4,0)),r.setAttribute(`sB`,new c(u,4,4)),r.setAttribute(`sC`,new c(u,4,8)),r.setAttribute(`sD`,new c(u,4,12)),r.setAttribute(`sE`,new c(u,4,16)),r.setAttribute(`sF`,new c(u,4,20)),r.setAttribute(`sG`,new c(u,4,24)),r.instanceCount=0,this.surfBuf=u,this.surfGeo=r,this.surfMesh=new e(r,this.surfMat),this.surfMesh.frustumCulled=!1,this.surfMesh.renderOrder=19,this.surfMesh.name=`laser-sheets`,this.surfMesh.onBeforeRender=this.onBefore,this.group.add(this.surfMesh)}buildSprites(t){this.spriteMesh&&(this.group.remove(this.spriteMesh),this.spriteGeo.dispose()),this.spriteCap=t,this.spriteData=new Float32Array(t*Tl);let r=new xe;r.setAttribute(`position`,new P([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3)),r.setIndex([0,1,2,0,2,3]);let i=new n(this.spriteData,Tl,1);i.setUsage(o),r.setAttribute(`pA`,new c(i,4,0)),r.setAttribute(`pB`,new c(i,4,4)),r.instanceCount=0,this.spriteBuf=i,this.spriteGeo=r,this.spriteMesh=new e(r,this.spriteMat),this.spriteMesh.frustumCulled=!1,this.spriteMesh.renderOrder=21,this.spriteMesh.name=`laser-flares`,this.spriteMesh.onBeforeRender=this.onBefore,this.group.add(this.spriteMesh)}buildHousings(e){this.housings&&=(this.group.remove(this.housings),this.housings.geometry.dispose(),null);let t=e.filter(e=>e.housing);if(!t.length)return;let n=new me(.62,.34,.56),r=new T(n,this.housingMat,t.length),i=new oe;for(let e=0;e<t.length;e++){let n=t[e];i.position.copy(n.pos).addScaledVector(n.fwd,-.3),i.position.y-=.04,i.rotation.set(0,Math.atan2(n.fwd.x,n.fwd.z),0),i.updateMatrix(),r.setMatrixAt(e,i.matrix)}r.instanceMatrix.needsUpdate=!0,r.name=`laser-housings`,r.computeBoundingSphere(),this.housings=r,this.group.add(r)}begin(){this.beamCount=0,this.surfCount=0,this.spriteCount=0}pushBeam(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g=0,_=.35){if(this.beamCount>=this.beamBudget)return!1;let v=this.beamData,y=this.beamCount*Cl;return v[y++]=e,v[y++]=t,v[y++]=n,v[y++]=o,v[y++]=r,v[y++]=i,v[y++]=a,v[y++]=+!!d+Math.min(.99,Math.max(0,u)),v[y++]=s,v[y++]=c,v[y++]=l,v[y++]=f,v[y++]=p,v[y++]=m,v[y++]=h,v[y]=g>=1?Math.floor(g)+Math.min(.95,Math.max(.05,_)):0,this.beamCount++,!0}pushSurface(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g,_,v,y,b=0,x=1,S=0,C=0,w=0,T=0,E=0,D=0){if(this.surfCount>=this.surfCap)return!1;let O=this.surfData,k=this.surfCount*wl;return O[k++]=e,O[k++]=t,O[k++]=n,O[k++]=r,O[k++]=i,O[k++]=a,O[k++]=o,O[k++]=s,O[k++]=c,O[k++]=l,O[k++]=u,O[k++]=d,O[k++]=f,O[k++]=p,O[k++]=m,O[k++]=h,O[k++]=g,O[k++]=_,O[k++]=v,O[k++]=y,O[k++]=b>0?b:1e5,O[k++]=x,O[k++]=S,O[k++]=D,O[k++]=C,O[k++]=w-Math.floor(w),O[k++]=T,O[k]=E,this.surfCount++,!0}setSheetExtras(e,t,n){if(this.surfCount<=0)return;let r=(this.surfCount-1)*wl+24;this.surfData[r]=e,this.surfData[r+1]=t,this.surfData[r+2]=n,this.surfData[r+3]=0}pushSprite(e,t,n,r,i,a,o,s){if(this.spriteCount>=this.spriteCap)return!1;let c=this.spriteData,l=this.spriteCount*Tl;return c[l++]=e,c[l++]=t,c[l++]=n,c[l++]=r,c[l++]=i,c[l++]=a,c[l++]=o,c[l]=s,this.spriteCount++,!0}end(){let e=(e,t,n)=>{e.clearUpdateRanges(),t>0&&(e.addUpdateRange(0,t*n),e.needsUpdate=!0)};e(this.beamBuf,this.beamCount,Cl),e(this.surfBuf,this.surfCount,wl),e(this.spriteBuf,this.spriteCount,Tl),this.beamGeo.instanceCount=this.beamCount,this.surfGeo.instanceCount=this.surfCount,this.spriteGeo.instanceCount=this.spriteCount,this.beamMesh.visible=this.beamCount>0,this.surfMesh.visible=this.surfCount>0,this.spriteMesh.visible=this.spriteCount>0}get drawCalls(){return+(this.beamCount>0)+ +(this.surfCount>0)+ +(this.spriteCount>0)+ +!!this.housings}get triangles(){return this.beamCount*El*2+this.surfCount*this.sq.segU*this.sq.segV*2+this.spriteCount*2}dispose(){this.beamGeo?.dispose(),this.surfGeo?.dispose(),this.spriteGeo?.dispose(),this.housings?.geometry.dispose(),this.beamMat.dispose(),this.surfMat.dispose(),this.spriteMat.dispose(),this.housingMat.dispose(),this.noise?.dispose()}},jl=new u(0,1,0),Ml=new er,Nl=[`laser_stage`,`laser_field`,`pillars_top`],Pl=[[-20,36],[20,36],[-20,69],[20,69],[-20,102],[20,102],[-20,135],[20,135]],Fl=11.2,Il=[40,55,70,85],Ll=10.6,Rl=-4.3,zl=[40,55,70,85],Bl=2,Vl=-3.2,Hl=12,Ul=12;function Wl(e,t){let n=Ml.get(e);if(n.length!==t.length)return!1;for(let e=0;e<n.length;e++)if(n[e].distanceToSquared(t[e])>1e-6)return!1;return!0}function Gl(e){let t=e.length*7919;for(let n of e)t+=n.x*1.3+n.y*7.1+n.z*3.7;return t}var Kl=class{emitters=[];byGroup={deck:[],tower:[],dragon:[],high:[],corner:[],turret:[],pillar:[],base:[],piano:[],rampart:[],floor:[]};mirrors=[];mine=new Map;src=new Map;sig=0;anchorSignature(e){let t=0;for(let n=0;n<Nl.length;n++)t=t*1.0001+Gl(e.get(Nl[n]))*(n+1);return t}get signatureValue(){return this.sig}custom(e,t){let n=e.get(t);if(!n.length||Wl(t,n))return null;let r=this.mine.get(t);return r!==void 0&&Math.abs(r-Gl(n))<1e-6?this.src.get(t)??null:(this.src.set(t,n.map(e=>e.clone())),n)}build(e){this.emitters.length=0,this.mirrors.length=0;for(let e of Object.keys(this.byGroup))this.byGroup[e].length=0;let t=(e,t,n)=>new u(e,t,n),n=(e,t,n,r,i=!0)=>{let a=e===`pillar`||e===`base`||e===`turret`||e===`piano`?`field`:`stage`,o=n.clone().setY(0).normalize(),s={index:this.emitters.length,group:e,origin:a,pos:t.clone(),fwd:o,lat:new u().crossVectors(jl,o).normalize(),side:Math.abs(t.x)<.5?this.emitters.length%2?1:-1:Math.sign(t.x),rank:.5,order:0,row:-1,partner:-1,front:!1,power:r,housing:i};return this.emitters.push(s),this.byGroup[e].push(s),s},r=t(0,0,1),i=this.custom(e,`laser_stage`);if(i)for(let e of i){let i=Math.abs(e.x),a=e.y<5?`deck`:i>80?`corner`:i<9&&e.y>12?`dragon`:e.y>=18?`high`:`tower`;n(a,e,a===`corner`?t(-Math.sign(e.x)*.5,0,1):r,a===`high`?1.25:1,a===`deck`)}if(!this.byGroup.deck.length)for(let e=0;e<12;e++)n(`deck`,t(-33+e*6,2.2,-.5),r,1);if(!i){for(let[e,i,a]of[[-24,16,-13],[-14,16,-13],[14,16,-13],[24,16,-13],[-32,10,-12],[-7,10,-12],[7,10,-12],[32,10,-12]])n(`tower`,t(e,i,a),r,1.1);n(`dragon`,t(-7,15,-10),r,1.3),n(`dragon`,t(7,15,-10),r,1.3);for(let[e,i]of[[-34,19],[-20,20],[20,20],[34,19]])n(`high`,t(e,i,-19),r,1.25);for(let e of[-1,1])n(`corner`,t(e*92,14,-4.5),t(-e*.35,0,1),1.1),n(`corner`,t(e*92,14,-3.5),t(-e*.9,0,1),1.1)}let a=this.custom(e,`pillars_top`),o=a?a.map(e=>[e.x,e.z]):Pl.map(e=>[e[0],e[1]]);o.sort((e,t)=>e[1]-t[1]||e[0]-t[0]);for(let[e,r]of o){let i=Math.sign(e)||1;n(`pillar`,t(e-i*1.45,9.85,r),t(-i*.3,0,-1),.85),this.mirrors.push(t(e,Fl,r))}for(let[e,r]of o){let i=Math.sign(e)||1;n(`base`,t(e-i*4,1.5,r-4),t(-i,0,-.25),.55)}for(let e of[-1,1])for(let r of[-.5,0,.5])n(`turret`,t(e*94,12,58+r),t(-e,0,-.18+r*.4),1.1);n(`piano`,t(0,1.8,59),t(0,0,-1),1.2,!1);for(let e of[-1,1])for(let i of Il)n(`rampart`,t(e*i,Ll,Rl),r,.9);for(let e of[-1,1])for(let i of zl)n(`floor`,t(e*i,Bl,Vl),r,.9);for(let e of Object.keys(this.byGroup)){let t=[...this.byGroup[e]].sort((e,t)=>e.pos.x-t.pos.x||e.pos.z-t.pos.z);t.forEach((e,n)=>{e.rank=t.length>1?n/(t.length-1):.5,e.order=n})}for(let e of[-1,1]){let t=this.emitters.filter(t=>(t.group===`rampart`||t.group===`tower`&&t.pos.y<Hl)&&Math.sign(t.pos.x)===e).sort((e,t)=>Math.abs(e.pos.x)-Math.abs(t.pos.x)),n=-1/0;for(let e of t)Math.abs(e.pos.x)-n<Ul||(e.front=!0,n=Math.abs(e.pos.x))}let s=this.byGroup.pillar,c=[...new Set(s.map(e=>Math.round(e.pos.z)))].sort((e,t)=>e-t);for(let e of s)e.row=c.indexOf(Math.round(e.pos.z));for(let e of this.byGroup.base)e.row=c.findIndex(t=>Math.abs(t-(e.pos.z+4))<3);for(let e of s){let t=-1,n=1/0;for(let r of s){if(Math.sign(r.pos.x)===Math.sign(e.pos.x)||r.row!==e.row-1)continue;let i=Math.abs(r.pos.x+e.pos.x);i<n&&(n=i,t=r.index)}e.partner=t}this.sig=this.anchorSignature(e)}mirror(e,t){let n=e*2+(t<0?0:1);return this.mirrors[n]??null}register(e){e.set(`laser_stage`,this.emitters.filter(e=>e.origin===`stage`&&e.group!==`rampart`&&e.group!==`floor`).map(e=>e.pos)),e.set(`laser_field`,this.emitters.filter(e=>e.origin===`field`&&e.group!==`base`).map(e=>e.pos)),this.mine.set(`laser_stage`,Gl(e.get(`laser_stage`))),this.mine.set(`laser_field`,Gl(e.get(`laser_field`))),this.sig=this.anchorSignature(e)}},Z={deck:1,tower:2,high:4,corner:8,pillar:16,base:32,turret:64,dragon:128,piano:256,rampart:512,floor:1024},ql=Z.deck|Z.tower|Z.high|Z.corner|Z.dragon,Jl=60,Yl=2.2,Xl=Z.pillar|Z.base|Z.turret|Z.piano,Zl=6.3,Ql=.95,$l=47,eu=46,tu=.096,nu=5.2,ru=-20,iu=105,au=2,ou=175,su=125,cu=70,lu=12,uu=.34,du=120,fu=42,pu=new Set([`fan`,`sweep`,`wave`,`burst`,`cone`]),mu=e=>e.group!==`deck`||Math.round(Math.abs(e.pos.x))%12==3,hu={fan:{count:12,spread:84,tilt:7,speed:.25,stage:Z.deck|Z.high,field:Z.pillar|Z.turret},sheet:{count:0,spread:104,tilt:NaN,speed:.12,stage:Z.deck,field:Z.turret,tribeStage:Z.tower,tribePick:e=>e.group!==`tower`||e.pos.y<12},tunnel:{count:8,spread:22,tilt:1.5,speed:.5,stage:Z.deck,field:Z.pillar,pick:e=>e.group===`deck`?Math.abs(e.pos.x)<5:e.group!==`pillar`||e.row===3,tribeStage:Z.tower,tribePick:e=>e.group!==`tower`||e.pos.y>12&&Math.abs(e.pos.x)<20},sweep:{count:2,spread:76,tilt:5,speed:.5,stage:Z.deck|Z.tower,field:Z.pillar},crossfire:{count:3,spread:5,tilt:30,speed:.125,stage:Z.dragon|Z.tower,field:Z.piano},sky:{count:3,spread:26,tilt:81,speed:.12,stage:Z.high|Z.tower,field:Z.pillar},wave:{count:10,spread:96,tilt:3,speed:.5,stage:Z.deck,field:Z.pillar},cone:{count:18,spread:38,tilt:6,speed:.25,stage:Z.deck,field:Z.pillar,pick:e=>e.group!==`deck`||e.order%2==0},grid:{count:10,spread:60,tilt:50,speed:.1,stage:Z.deck|Z.high,field:Z.base,tribeField:Z.pillar},burst:{count:36,spread:124,tilt:12,speed:.12,stage:Z.corner|Z.deck,field:Z.turret,pick:e=>e.group===`deck`?Math.abs(e.pos.x)<5:e.group!==`turret`||e.order%3==1},chevron:{count:12,spread:16,tilt:-1.5,speed:.06,stage:Z.deck,field:Z.deck,pick:e=>Math.abs(e.pos.x)>5,tribeStage:Z.tower,tribeField:Z.tower},zigzag:{count:4,spread:70,tilt:74,speed:.25,stage:Z.deck,field:Z.base},x:{count:1,spread:2.5,tilt:0,speed:.05,stage:Z.deck,field:Z.base},rings:{count:10,spread:40,tilt:6,speed:1,stage:Z.deck,field:Z.pillar,pick:mu,tribeStage:Z.tower|Z.high},dashes:{count:4,spread:90,tilt:0,speed:.5,stage:Z.deck,field:Z.base,pick:mu},trees:{count:9,spread:46,tilt:0,speed:.25,stage:Z.deck,field:Z.base,pick:mu}},gu={laser_stage:[ql,0],stage:[ql,0],laser_field:[Z.pillar|Z.turret|Z.piano,0],field:[Xl,0],deck_front:[Z.deck,0],deck:[Z.deck,0],deck_back:[Z.deck,0],fixtures_floor:[Z.deck,0],dj_booth:[Z.deck,0],towers_top:[Z.tower,0],towers:[Z.tower,0],castle:[Z.tower,0],roof:[Z.tower|Z.high,0],wings:[Z.high,0],wing_tips:[Z.high,0],fixtures_truss:[Z.high|Z.tower,0],wing_left:[Z.high,-1],wing_right:[Z.high,1],dragon:[Z.dragon,0],dragon_head:[Z.dragon,0],dragon_mouth:[Z.dragon,0],dragon_eyes:[Z.dragon,0],corners:[Z.corner,0],arms:[Z.corner|Z.turret,0],sides:[Z.corner|Z.turret,0],fireworks_sides:[Z.corner|Z.turret,0],turrets:[Z.turret,0],pillars_top:[Z.pillar,0],pillars:[Z.pillar,0],delay_towers:[Z.pillar,0],pillars_base:[Z.base,0],plinths:[Z.base,0],piano:[Z.piano,0],foh:[Z.piano,0],ramparts:[Z.rampart,0],side_rampart:[Z.rampart,0],side_sections:[Z.rampart,0],front_line:[Z.rampart|Z.tower,0],side_floor:[Z.floor,0],front_floor:[Z.floor|Z.deck,0]},_u=[[-37,0,-14,37,1.9,.3],[-92,0,-40,92,9.5,-4],[-42,0,-40,42,24,-6]],vu=[[-1,0,0,1],[-1,0,0,-1],[0,-1,1,-1],[0,1,1,1],[1,-1,2,1],[1,1,2,-1],[2,1,3,-1],[2,-1,3,1]],yu=Math.PI*2,bu=Math.PI/180,xu=24,Su=1/45,Cu=e=>e<0?0:e>1?1:e,wu=(e,t,n,r)=>typeof e==`number`&&Number.isFinite(e)?e<n?n:e>r?r:e:t,Tu=class{cue=null;preset=`fan`;hit=!1;starHit=!1;color=new I;color2=new I;hasColor2=!1;count=0;spread=0;tilt=0;tiltGiven=!1;speed=0;height=4;intensity=1;kick=!1;fade=0;origin=0;groupMask=0;groupSide=0;hasGroupToken=!1;filter=0;env=1;bars=0;barsNow=0;barLen=1.6;phase0=0;surfWant=0;surfGrant=0;members=[];nEff=0;layer=0;heightGiven=!1;hasAim=!1;aim=new u;reach=0;gate=1;rowMask=0;rings=0;lobes=0;lobeAmp=0;squash=1;parallel=!1;lens=!1;distance=0;splay=0;frontOnly=!1;halo=0;haloK=1;gain=1;widthMul=1;fill=0;wave=1;band=0;near=0;far=0;patches=0;cloud=0;cloudK=1;cloudSize=18;lines=!1},Eu=class{name=`lasers`;app;enabled=!0;q;rig=new Kl;gfx=new Al;rigDirty=!0;frameNo=0;act=[];slots=Array.from({length:xu},()=>new Tu);slotCount=0;cur=new Int16Array;prev=new Int16Array;toCam=new Float32Array;flare=new Float32Array;glowA=new Float32Array;haloA=new Float32Array;tmpColor=new I;tmpColor2=new I;v2=new s;camPos=new u;dx=0;dy=0;dz=0;oOverride=!1;ox=0;oy=0;oz=0;tribe=!1;audienceMode=`auto`;crowdSys=void 0;bx=new Float32Array(9);offs=[];reachNow=0;reachFade=.35;widthK=1;xL=null;xR=null;chevSideX=21;deckPitch=6;pA=new u;pB=new u;hazeBase=.6;lensE=-1;camSys=void 0;beatGate=1;calm=!1;kickEnv=0;hasKick=!1;budgetScale=1;requested=0;envR=0;envG=0;envB=0;envPow=0;audienceWash=0;lowHaze=0;seaR=0;airR=0;airG=0;airB=0;seaG=0;seaB=0;airLight=new I(0,0,0);airGate0=.65;tune={blueR:0,blueG:-.09,seaFloor:.015,seaFall:.55,seaGain:1,seaBank:0,seaBankX:$l,ceilGain:12,ceilD0:12,ceilD1:35,ceilRoofK:.35,ceilSmooth:1,ceilStage:1.5,webK:.3,glowK:3,glowSize:7,bankClip:1,scanK:2.2,scanW:1.6,webGlow:2,webFade:.45,webEdge:2,haloGain:1,cloudGain:1};stepCache=new Map;stepRev=-1;stepDip=1;cloudH=0;cloudAcc=new Float32Array(12);seaZoneX=$l;sea2R=0;sea2G=0;sea2B=0;beamWidth=1;terrain=null;looksSig=-1;recording=!1;recIdx=0;recCount=0;smear=new Float32Array;stat={beams:0,requested:0,surfaces:0,sprites:0,active:0,looks:``};init(e){this.app=e,this.q=e.quality,this.gfx.init(e.quality),this.gfx.setPreRender(this.preRender),e.scene.add(this.gfx.group),this.buildRig()}buildRig(){let e=this.app.anchors;this.rig.build(e),this.rig.register(e);let t=this.rig.emitters.length;this.cur=new Int16Array(t*2),this.prev=new Int16Array(t*2),this.toCam=new Float32Array(t*3),this.flare=new Float32Array(t*4),this.glowA=new Float32Array(t*3),this.haloA=new Float32Array(t),this.gfx.buildHousings(this.rig.emitters);let n=this.rig.byGroup.deck,r=0,i=0,a=1/0,o=-1/0;for(let e of n)a=Math.min(a,e.pos.x),o=Math.max(o,e.pos.x),!(Math.abs(e.pos.x)<=5)&&(r+=Math.abs(e.pos.x),i++);this.chevSideX=i?r/i:21,this.deckPitch=n.length>1?(o-a)/(n.length-1):6,this.rigDirty=!1}preRender=()=>{this.camSys===void 0&&(this.camSys=this.app.get(`camera`)??null);let e=this.camSys?.hazeScale,t=typeof e==`number`&&Number.isFinite(e)?.45+.55*Cu(e):1;this.gfx.shared.uHaze.value=this.hazeBase*t};setQuality(e){this.q=e,this.gfx.setQuality(e)}setEnabled(e){this.enabled=e,this.gfx.group.visible=e}update(e){if(!this.enabled)return;let t=this.app;this.frameNo++,(this.rigDirty||this.frameNo%60==1&&this.rig.anchorSignature(t.anchors)!==this.rig.signatureValue)&&this.buildRig();let n=e.showTime,r=e.camera,i=this.calm=rt(t);this.camPos.copy(r.position),this.updateUniforms(e);let a=this.rig.emitters,o=a.length;for(let e=0;e<o;e++){let t=a[e],n=this.camPos.x-t.pos.x,r=this.camPos.y-t.pos.y,i=this.camPos.z-t.pos.z,o=Math.sqrt(n*n+r*r+i*i)||1;n/=o,r/=o,i/=o,this.toCam[e*3]=n,this.toCam[e*3+1]=r,this.toCam[e*3+2]=i,this.cur[e*2]=this.cur[e*2+1]=-1,this.prev[e*2]=this.prev[e*2+1]=-1}this.flare.fill(0),this.glowA.fill(0),this.haloA.fill(0),this.lensE=-1,this.envR=this.envG=this.envB=this.envPow=0,this.audienceWash=0,this.seaR=this.seaG=this.seaB=0,this.airR=this.airG=this.airB=0,this.sea2R=this.sea2G=this.sea2B=0,this.airLight.setRGB(0,0,0),this.terrain||=t.get(`terrain`)??{},this.tribe=this.detectTribe();let s=e.beat;this.hasKick=s.hasKick,this.kickEnv=s.kick,this.beatGate=s.hasKick?s.phase<.16?1:Math.max(i?.5:.05,Math.exp(-(s.phase-.16)*10)):1;let c=t.show.active(`lasers`,n,this.act);this.slotCount=0;let l=this.offs;l.length=0;for(let e of c)e.fx===`off`&&l.push(e);for(let e of c){if(e.fx!==`look`&&e.fx!==`hit`)continue;if(this.slotCount>=xu)break;let t=this.slots[this.slotCount];if(!this.resolveSlot(t,e,n))continue;let r=1,s=i?.12:.03;for(let t=0;t<l.length;t++){let i=l[t];i.t<e.t-1e-4||(r=Math.min(r,1-Cu((n-i.t)/s)*Cu((i.t+i.dur-n)/s)))}t.gate=r;let c=this.slotCount++;t.members.length=0;for(let e=0;e<o;e++){let n=a[e];if(!this.selects(t,n)||(t.members.push(n),t.hit))continue;let r=e*2+t.layer;this.cur[r]>=0&&(this.prev[r]=this.cur[r]),this.cur[r]=c}}let u=0,d=0;for(let e=0;e<this.slotCount;e++){let t=this.slots[e];if(!t.hit){let r=0;for(let i=0;i<t.members.length;i++){let a=t.members[i],o=a.index*2+t.layer;(this.cur[o]===e||this.prev[o]===e&&this.fadeWeightPrev(o,n)>0)&&(t.members[r++]=a)}t.members.length=r}t.surfWant=0,t.gate>.001&&(!t.hit&&t.preset===`sheet`?t.surfWant=Math.min(t.members.length,2):!t.hit&&t.preset===`tunnel`?t.surfWant=Math.min(t.members.length,3):!t.hit&&t.preset===`rings`&&(t.surfWant=Math.min(t.members.length,8)),d+=t.surfWant,u+=this.slotBeams(t))}this.requested=u;let f=this.gfx.updateBudget(this.v2.x*this.v2.y);this.budgetScale=u>f?f/u:1,this.beamWidth=1+.8*(1-Math.sqrt(this.budgetScale));let p=Math.max(1,this.gfx.surfCap-+(this.lowHaze>.05&&d>0)),m=d>p?p/d:1;for(let e=0;e<this.slotCount;e++){let t=this.slots[e],n=this.beamsPerEmitter(t);t.nEff=n<=0?0:Math.max(1,Math.floor(n*this.budgetScale)),t.surfGrant=t.surfWant>0?Math.max(1,Math.floor(t.surfWant*m)):0}this.gfx.begin(),this.ensureSmearCapacity(),this.recording=!0,this.recIdx=0;for(let e=0;e<this.slotCount;e++){let t=this.slots[e];t.gate<=.001||(t.bars=t.barsNow-Su/t.barLen,t.hit?this.genHit(t,n-Su):this.genLook(t,e,n))}this.recCount=this.recIdx,this.recording=!1,this.recIdx=0;for(let e=0;e<this.slotCount;e++){let t=this.slots[e];t.gate<=.001||(t.bars=t.barsNow,t.hit?this.genHit(t,n):this.genLook(t,e,n))}if(this.pushSea(),this.pushFlares(),this.gfx.end(),this.envPow>0){let e=t.env,n=1/this.envPow,r=Math.max(.12,e.stageIntensity),i=Math.min(.1,this.envPow*.0012),a=r+i;e.stageColor.setRGB((e.stageColor.r*r+this.envR*n*i)/a,(e.stageColor.g*r+this.envG*n*i)/a,(e.stageColor.b*r+this.envB*n*i)/a),e.stageIntensity+=i,e.audienceWash=Math.min(1,e.audienceWash+Math.min(.1,this.audienceWash*.004))}let h=this.stat;h.beams=this.gfx.beamCount,h.requested=this.requested,h.surfaces=this.gfx.surfCount,h.sprites=this.gfx.spriteCount;let g=0;for(let e=0;e<o;e++)(this.cur[e*2]>=0||this.cur[e*2+1]>=0)&&g++;h.active=g;let _=this.slotCount;for(let e=0;e<this.slotCount;e++){let t=this.slots[e].preset;_=(_*31+(this.slots[e].cue?.id??0)+1+t.charCodeAt(0)*7919+t.length*104729)%2147483647}if(_!==this.looksSig){this.looksSig=_;let e=``;for(let t=0;t<this.slotCount;t++)e+=(e?`,`:``)+(this.slots[t].hit?`hit`:this.slots[t].preset);h.looks=e||`-`}}detectTribe(){if(this.audienceMode!==`auto`)return this.audienceMode===`tribe`;let e=this.app,t=e.params.get(`mode`)??e.params.get(`lasermode`);if(t===`filmed`||t===`asfilmed`||t===`empty`)return!1;if(t===`tribe`)return!0;if(!e.isSystemEnabled(`crowd`))return!1;this.crowdSys===void 0&&(this.crowdSys=e.get(`crowd`)??null);let n=this.crowdSys;return!n||n.mode===`filmed`||n.mode===`empty`||n.mode===`asfilmed`||typeof n.count==`number`&&n.count<=0?!1:e.quality.crowdCount>0}setAudienceMode(e){this.audienceMode=e}updateUniforms(e){let t=this.app,n=this.gfx.shared,r=e.camera;t.renderer.getDrawingBufferSize(this.v2),n.uPixAng.value=2*Math.tan(r.fov*bu/2)/Math.max(1,this.v2.y/Math.max(.001,r.zoom));let i=t.env.haze;this.hazeBase=.22+.9*i,n.uHaze.value=this.hazeBase,n.uExt.value=.0012+.0045*i;let a=0,o=t.show.active(`fog`,e.showTime,this.act);for(let t of o){if(t.fx!==`lowfog`)continue;let n=typeof t.p.density==`number`?t.p.density:.6,r=wu(t.p.rise,6,0,30),i=e.showTime,o=r>0?Cu((i-t.t)/r):+(i>=t.t),s=t.p.release,c;if(typeof s==`number`&&Number.isFinite(s)){let e=Cu((i-t.t-t.dur)/Math.min(30,Math.max(.1,s)));c=1-e*e*(3-2*e)}else c=Cu((t.t+t.dur-i)/3);a=Math.max(a,n*o*c)}this.lowHaze=a,n.uLowHaze.value=a*.9;let s=this.tune;fl[0]=s.blueR,fl[1]=s.blueG;let c=this.gfx.surfUniforms,l=Cu((a-.75)/.15),u=l*l*(3-2*l);c.uSea.value.set(.015+(s.seaFloor-.015)*u,.55+(s.seaFall-.55)*u,s.seaGain,0),this.seaZoneX=$l+(Math.max($l,s.seaBankX)-$l)*u*s.seaBank,c.uBank.value.x=u*s.seaBank,c.uCeil.value.set(s.ceilGain,s.ceilD0,Math.max(s.ceilD0+1,s.ceilD1),.85),c.uCeilT.value.set(s.ceilSmooth,s.ceilStage,0,0);let d=e.showTime;n.uDrift.value.set(d*.0042,-d*.0011,d*.0017),n.uTime.value=d,n.uFlow.value=d;let f=t.scene.fog;f&&f.isFogExp2?(n.uFogMode.value=1,n.uFogD.value=f.density*.8):f&&f.isFog?(n.uFogMode.value=2,n.uFogNear.value=f.near,n.uFogFar.value=f.far*1.25):n.uFogMode.value=0,this.gfx.beamUniforms.uGain.value=7,this.gfx.beamUniforms.uHalo.value=.8+i*.8,this.gfx.surfUniforms.uGainS.value=2.2}cueParams(e,t){this.stepDip=1;let n=e.p.steps;if(!Array.isArray(n)||n.length===0)return e.p;this.app.show.revision!==this.stepRev&&(this.stepCache.clear(),this.stepRev=this.app.show.revision);let r=this.stepCache.get(e);if(!r){let t=e.p;r=n.map(e=>{if(!e||typeof e!=`object`||Array.isArray(e))return t;let n={...t,...e};return delete n.steps,delete n.at,n}),this.stepCache.set(e,r)}let i=t-e.t,a=wu(e.p.loop,0,0,120),o=this.calm?Math.floor(i/uu)*uu:i,s=Du(n,o,a);return this.calm&&i>=uu&&s!==Du(n,o-uu,a)&&(this.stepDip=.5+.5*Cu((i-o)/.12)),s<0?e.p:r[s]}resolveSlot(e,t,n){let r=this.cueParams(t,n);e.cue=t,e.hit=t.fx===`hit`,e.layer=+(t.fx===`look`&&r.preset===`sheet`),e.hasAim=!1;let i=this.app.palette;if(e.hit){e.preset=`fan`,e.starHit=r.pattern===`star`,pt(r.color,i,this.tmpColor,`accent`),ml(this.tmpColor,e.color),e.hasColor2=!1,e.count=Math.round(wu(r.count,14,1,64)),e.spread=wu(r.spread,e.starHit?120:140,0,340)*bu,e.tilt=wu(r.tilt,12,-45,90)*bu,e.tiltGiven=!0,e.speed=0,e.intensity=wu(r.intensity,1,0,1),e.kick=!1,e.fade=0,e.lens=r.lens===!0,e.reach=wu(r.reach,0,0,650);let a=Math.min(t.dur,2),o=n-t.t;if(o>a+.4)return!1;let s=Math.max(0,a-.32);if(e.env=o<s?1:Math.exp(-(o-s)*9),this.calm&&(e.env*=.6*Cu(o/.1)),e.env<.01)return!1}else{if(r.preset!==void 0&&!(typeof r.preset==`string`&&Object.prototype.hasOwnProperty.call(hu,r.preset)))return!1;let a=r.preset??`fan`,o=hu[a];e.preset=a,pt(r.color,i,this.tmpColor,`primary`),ml(this.tmpColor,e.color),e.hasColor2=typeof r.color2==`string`&&r.color2.length>0,e.hasColor2&&(pt(r.color2,i,this.tmpColor2,`secondary`),ml(this.tmpColor2,e.color2)),e.count=Math.round(wu(r.count,o.count,1,64)),e.spread=wu(r.spread,o.spread,0,340)*bu,e.tiltGiven=typeof r.tilt==`number`&&Number.isFinite(r.tilt),e.tilt=wu(r.tilt,o.tilt,-45,90)*bu,e.speed=wu(r.speed,o.speed,-8,8),e.height=wu(r.height,4,.6,40),e.heightGiven=typeof r.height==`number`&&Number.isFinite(r.height),e.intensity=wu(r.intensity,1,0,1),e.kick=r.kick===!0,e.fade=wu(r.fade,0,0,8);let s=r.aim;e.hasAim=Array.isArray(s)&&s.length===3&&Number.isFinite(s[0])&&Number.isFinite(s[1])&&Number.isFinite(s[2]),e.hasAim&&e.aim.set(s[0],s[1],s[2]),e.lens=!1,e.reach=wu(r.reach,0,0,650),e.rings=Math.round(wu(r.rings,a===`rings`?3:0,0,24)),e.lobes=Math.round(wu(r.lobes,0,0,9)),e.lobeAmp=e.lobes>0?wu(r.lobeAmp,.42,.05,.95):0,e.squash=wu(r.squash,a===`rings`?.5:1,.1,3),e.parallel=r.parallel===!0,e.distance=wu(r.distance,a===`x`?15:a===`dashes`?14:70,a===`chevron`?20:2,200),e.splay=wu(r.splay,0,-80,80)*bu,e.halo=wu(r.halo,0,0,40)*bu,e.haloK=wu(r.haloK,1,0,8),e.gain=wu(r.gain,1,.1,4),e.widthMul=wu(r.width,1,.25,6),e.fill=wu(r.fill,+(a===`zigzag`),0,4),e.wave=wu(r.wave,1,0,3),e.band=wu(r.band,0,0,20),e.patches=wu(r.patches,0,0,1),e.lines=r.lines===!0,e.cloud=wu(r.cloud,0,0,200),e.cloudK=wu(r.cloudK,1,0,8),e.cloudSize=wu(r.cloudSize,18,4,80);let c=r.extent;e.near=0,e.far=0,typeof c==`number`&&Number.isFinite(c)?e.far=Math.min(400,Math.max(5,c)):Array.isArray(c)&&c.length===2&&Number.isFinite(c[0])&&Number.isFinite(c[1])&&(e.near=Math.min(390,Math.max(0,c[0])),e.far=Math.min(400,Math.max(e.near+5,c[1])));let l=n-t.t,u=t.t+t.dur-n;if(e.env=(this.calm?Cu(l/.12)*Cu(u/.12):Cu(l/.03)*Cu(u/.05))*this.stepDip,e.env<=0)return!1}let a=r.origin;e.origin=a===`field`?2:a===`all`?3:1,e.groupMask=0,e.groupSide=0,e.hasGroupToken=!1,e.filter=0,e.frontOnly=!1;let o=!1;e.rowMask=0;let s=r.rows;if(typeof s==`number`&&s>=1&&s<=16)e.rowMask=1<<Math.round(s)-1;else if(Array.isArray(s))for(let t=0;t<s.length;t++){let n=s[t];typeof n==`number`&&n>=1&&n<=16&&(e.rowMask|=1<<Math.round(n)-1)}for(let n of t.targets)if(n===`left`)e.filter=-1;else if(n===`right`)e.filter=1;else if(n===`center`)e.filter=2;else{let t=typeof n==`string`&&Object.prototype.hasOwnProperty.call(gu,n)?gu[n]:void 0;t&&(e.groupMask|=t[0],t[1]!==0&&(e.groupSide=t[1]),e.hasGroupToken=!0,n===`front_line`?e.frontOnly=!0:t[0]&Z.tower&&(o=!0))}o&&(e.frontOnly=!1),e.hit&&!e.hasGroupToken&&(e.groupMask=(e.origin&1?ql:0)|(e.origin&2?Z.pillar|Z.turret:0),e.hasGroupToken=!0);let c=this.app.show.tempo.segmentAt(t.t),l=60/c.bpm*(c.beatsPerBar??4),u=(t.t-c.anchor)/l;return e.phase0=u-Math.floor(u),e.barLen=l,e.barsNow=(n-t.t)/l+e.phase0,e.bars=e.barsNow,!0}selects(e,t){if(e.rowMask!==0&&t.row>=0&&!(e.rowMask&1<<t.row)||e.filter===-1&&t.pos.x>-.5||e.filter===1&&t.pos.x<.5||e.filter===2&&Math.abs(t.pos.x)>12)return!1;let n=Z[t.group];if(e.hasGroupToken)return!(!(e.groupMask&n)||e.groupSide!==0&&Math.sign(t.pos.x)!==e.groupSide||e.frontOnly&&t.group===`tower`&&!t.front);let r=hu[e.preset],i=this.tribe,a=i&&r.tribeStage!==void 0?r.tribeStage:r.stage,o=i&&r.tribeField!==void 0?r.tribeField:r.field;if(!(((e.origin&1?a:0)|(e.origin&2?o:0))&n))return!1;let s=i&&r.tribePick?r.tribePick:r.pick;return!s||s(t)}beamsPerEmitter(e){return e.hit?e.lens?1:e.count:e.preset===`sheet`?2:e.count}slotBeams(e){let t=e.members.length;if(e.hit)return e.lens?Math.min(t,1):t*e.count;switch(e.preset){case`sheet`:return t*2;case`x`:return Math.min(t,2)*e.count*2;default:return t*e.count}}fadeWeightPrev(e,t){let n=this.cur[e];if(n<0)return 0;let r=this.slots[n];return r.fade<=0||!r.cue?0:1-Cu((t-r.cue.t)/r.fade)}genLook(e,t,n){let r=e.members;if(!r.length)return;let i=e.intensity*e.env*e.gate*(e.kick?this.beatGate:1);if(i<=.001)return;let a=e.surfGrant,o=r.length;if(e.preset===`x`){this.xL=this.xR=null;for(let e=0;e<o;e++){let t=r[e];t.pos.x<0&&(!this.xL||t.pos.x<this.xL.pos.x)&&(this.xL=t),t.pos.x>=0&&(!this.xR||t.pos.x>this.xR.pos.x)&&(this.xR=t)}}for(let s=0;s<o;s++){let c=r[s],l=c.index*2+e.layer,u=1;if(this.cur[l]===t){let e=this.fadeWeightPrev(l,n);u=e>0?1-e:1}else u=this.fadeWeightPrev(l,n);if(u<=.001)continue;let d=i*u*c.power,f=!1;for(let e=0;e<a&&!f;e++)f=s===Math.round((e+.5)/a*(o-1));switch(this.reachNow=e.reach>0?e.reach:(c.group===`corner`||c.group===`turret`)&&pu.has(e.preset)?cu:0,this.reachFade=.35,this.cloudH=e.cloud,e.cloud>0&&this.cloudAcc.fill(0),e.preset){case`fan`:this.genFan(e,c,d);break;case`sweep`:this.genSweep(e,c,d);break;case`wave`:this.genWave(e,c,d);break;case`sky`:this.genSky(e,c,d);break;case`crossfire`:this.genCrossfire(e,c,d);break;case`cone`:this.genCone(e,c,d,!1,!1);break;case`tunnel`:this.genCone(e,c,d,!0,f);break;case`grid`:this.genGrid(e,c,d);break;case`burst`:this.genBurst(e,c,d);break;case`chevron`:this.genChevron(e,c,d);break;case`sheet`:f?this.genSheet(e,c,d):this.glow(c,e.color,d*.2);break;case`zigzag`:this.genZigzag(e,c,d);break;case`x`:(c===this.xL||c===this.xR)&&this.genX(e,c,d);break;case`rings`:this.genRings(e,c,d,f);break;case`dashes`:this.genDashes(e,c,d);break;case`trees`:this.genTrees(e,c,d)}e.cloud>0&&this.flushCloud(e,c)}this.reachNow=0,this.cloudH=0}cloudAt(e,t,n,r,i,a,o,s,c,l){let u=this.cloudH,d=Math.min(s,du),f=n+a*d,p,m;if(n>=u)return;f>=u?(p=(u-n)/Math.max(1e-4,a),m=1):(p=d,m=Math.exp(-(u-f)/lu));let h=m*l;if(h<=1e-5)return;let g=(i*e.lat.x+o*e.lat.z<0?0:1)*6,_=this.cloudAcc;_[g]+=h,_[g+1]+=(t+i*p)*h,_[g+2]+=(r+o*p)*h,_[g+3]+=c.r*h,_[g+4]+=c.g*h,_[g+5]+=c.b*h}flushCloud(e,t){if(this.recording)return;let n=this.cloudAcc;for(let r=0;r<12;r+=6){let i=n[r];if(i<.001)continue;let a=e.cloudK*this.tune.cloudGain,o=n[r+1]/i+(r?1:-1)*.5*t.lat.x,s=n[r+2]/i+(r?1:-1)*.5*t.lat.z;this.gfx.pushSprite(o,this.cloudH,s,e.cloudSize,n[r+3]*a,n[r+4]*a,n[r+5]*a,6)}}perBeam(e){return 1.7/Math.sqrt(Math.max(1,e))}lerpColor(e,t){return e.hasColor2?this.tmpColor.copy(e.color).lerp(e.color2,t):e.color}genFan(e,t,n){let r=e.nEff,i=yu*e.speed*e.bars,a=this.aimYP(e,t),o=(a?.05:.2)*e.spread*Math.sin(i)*t.side+(a?this.aimYaw:0),s=e.spread*(.72+.28*(.5+.5*Math.cos(i*.5))),c=(a?this.aimPitch:e.tilt+(t.group===`high`&&!e.tiltGiven?4*bu:0)+(t.origin===`field`&&!e.tiltGiven?-4*bu:0))+(a?.012:.06)*Math.sin(i*.5+t.rank*Math.PI),l=n*this.perBeam(r);for(let n=0;n<r;n++){let i=r>1?n/(r-1):.5;this.dirYP(t,o+(i-.5)*s,c),this.beam(t,this.lerpColor(e,i),l,0)}}genSweep(e,t,n){let r=e.nEff,i=yu*e.speed*e.bars-t.rank*Math.PI*.85,a=this.aimYP(e,t),o=.5*e.spread*Math.sin(i)+(a?this.aimYaw:0),s=(a?this.aimPitch:e.tilt)+.035*Math.sin(i*2),c=n*this.perBeam(r);for(let n=0;n<r;n++)this.dirYP(t,o+(n-(r-1)/2)*.05,s),this.beam(t,this.lerpColor(e,r>1?n/(r-1):0),c,0)}genWave(e,t,n){let r=e.nEff,i=n*this.perBeam(r),a=yu*e.speed*e.bars;for(let n=0;n<r;n++){let o=r>1?n/(r-1):.5,s=(o-.5)*e.spread,c=e.tilt+.12*Math.sin(yu*1.25*o-a+t.rank*Math.PI);this.dirYP(t,s,c),this.beam(t,this.lerpColor(e,o),i,0)}}genSky(e,t,n){let r=e.nEff,i=yu*e.speed*e.bars,a=Math.max(0,Math.PI/2-e.tilt)+.07*Math.sin(i+t.rank*yu),o=Math.tan(a),s=t.side*.07*Math.sin(i*.5)+e.splay*Math.max(-1,Math.min(1,t.pos.x/Jl)),c=n*this.perBeam(r);for(let n=0;n<r;n++){let i=r>1?n/(r-1):.5,a=(i-.5)*e.spread+s,l=Math.cos(a),u=Math.sin(a);this.setDir(u*t.lat.x+o*t.fwd.x,l,u*t.lat.z+o*t.fwd.z),this.beam(t,this.lerpColor(e,i),c,0)}}genCrossfire(e,t,n){let r=e.nEff,i=yu*e.speed*e.bars,a=n*this.perBeam(r),o=e.hasColor2&&t.side>0?e.color2:e.color;if(t.group===`piano`){this.genBounce(e,t,n);return}if(t.group===`pillar`){let e=t.partner>=0?this.rig.emitters[t.partner].pos:null,n=e?e.x:0,i=e?e.y:2,s=e?e.z:59;for(let e=0;e<r;e++){let r=n,c=i,l=s;e>0&&(r=-t.pos.x,l=t.pos.z+(e===1?0:(e-1)*33*(e%2?1:-1)),c=t.pos.y);let u=this.setDir(r-t.pos.x,c-t.pos.y,l-t.pos.z);this.beam(t,o,a,0,u,!0)}return}let s=t.side,c=46+24*Math.sin(i),l=70+18*Math.cos(i*.5),u=Math.tan(e.tilt)*l+10*Math.sin(i*.5+1),d=-s*c,f=t.pos.y+u,p=t.origin===`stage`?l:t.pos.z-l;this.setDir(d-t.pos.x,f-t.pos.y,p-t.pos.z);let m=Math.atan2(this.dx*t.lat.x+this.dz*t.lat.z,this.dx*t.fwd.x+this.dz*t.fwd.z),h=Math.asin(Math.max(-1,Math.min(1,this.dy)));for(let n=0;n<r;n++){let i=r>1?(n/(r-1)-.5)*e.spread:0;this.dirYP(t,m+i,h+i*.35),this.beam(t,o,a,0)}}genBounce(e,t,n){let r=e.cue?.p.path;if(Array.isArray(r)&&r.length>0){this.genPath(e,t,n,r);return}let i=Math.round(wu(e.cue?.p.segments,4,1,vu.length)),a=e.color;for(let e=0;e<i;e++){let[r,i,o,s]=vu[e],c=r<0?t.pos:this.rig.mirror(r,i),l=this.rig.mirror(o,s);if(!c||!l)continue;let u=r<0?0:r+1,d=n*1.05*.86**u,f=this.setDir(l.x-c.x,l.y-c.y,l.z-c.z);this.beamFrom(t,c.x,c.y,c.z,a,d,f),this.recording||this.gfx.pushSprite(l.x,l.y,l.z,.5,a.r*d*9,a.g*d*9,a.b*d*9,0)}}pathPoint(e,t,n){if(typeof e==`string`){if(e===`P`||e===`piano`)return n.copy(t.pos),1;if(e.length===2){let t=e[0]===`L`?-1:+(e[0]===`R`),r=e.charCodeAt(1)-49,i=t!==0&&r>=0&&r<8?this.rig.mirror(r,t):null;if(i)return n.copy(i),1}return 0}return Array.isArray(e)&&e.length===3&&Number.isFinite(e[0])&&Number.isFinite(e[1])&&Number.isFinite(e[2])?(n.set(e[0],e[1],e[2]),2):0}genPath(e,t,n,r){let i=Math.round(wu(e.cue?.p.segments,r.length,1,r.length)),a=e.color,o=this.pA,s=this.pB;for(let e=0;e<i;e++){let i=r[e];if(!Array.isArray(i)||i.length<2)continue;let c=this.pathPoint(i[0],t,o),l=this.pathPoint(i[1],t,s);if(!c||!l)continue;let u=n*1.05*.9**e,d=this.setDir(s.x-o.x,s.y-o.y,s.z-o.z);if(d<.05)continue;let f=l===2;this.beamFrom(t,o.x,o.y,o.z,a,u,f?650:d,0,!f),!this.recording&&(f||this.gfx.pushSprite(s.x,s.y,s.z,.5,a.r*u*9,a.g*u*9,a.b*u*9,0),c===1&&o.distanceToSquared(t.pos)>.01&&this.gfx.pushSprite(o.x,o.y,o.z,.42,a.r*u*6,a.g*u*6,a.b*u*6,0))}}genCone(e,t,n,r,i){let a=e.nEff,o=yu*e.speed*e.bars,s=this.hasKick?.12*this.kickEnv:0,c=.5*e.spread*(r?1+.1*Math.sin(o*.5):.88+s),l=1;if(r){let n,r,i;t.origin===`stage`?(n=t.pos.x*.3,i=96,r=1.2+Math.tan(e.tilt)*96,!this.tribe&&e.heightGiven&&(r=Math.min(Math.max(e.height,.8),4),l=Math.min(2.2,Math.max(.8,r*.8))/96/Math.max(.02,Math.tan(c)))):(n=t.pos.x*.2,i=-2,r=6+Math.tan(e.tilt)*60),this.tribe&&t.origin===`stage`&&(r=Math.max(r,Zl+Math.tan(.5*e.spread)*96)),this.setDir(n-t.pos.x,r-t.pos.y,i-t.pos.z)}else{this.aimYP(e,t)?this.dirYP(t,this.aimYaw,this.aimPitch):this.dirYP(t,t.side*.1,e.tilt);let r=t.index*3,i=this.dx*this.toCam[r]+this.dy*this.toCam[r+1]+this.dz*this.toCam[r+2],a=Math.cos(c);if(i>a&&this.tune.glowK>0&&!this.recording){let o=(i-a)/Math.max(1e-4,1-a),s=n*this.tune.glowK*o*o*(e.halo>0?e.haloK:1);e.halo>this.haloA[t.index]&&(this.haloA[t.index]=e.halo);let c=e.hasColor2?e.color2:e.color;this.glowA[r]+=(e.color.r+c.r)*.5*s,this.glowA[r+1]+=(e.color.g+c.g)*.5*s,this.glowA[r+2]+=(e.color.b+c.b)*.5*s}}this.basis(this.dx,this.dy,this.dz);let u=this.bx,d=o*(r?1:t.side),f=Math.tan(c),p=n*this.perBeam(a);for(let n=0;n<a;n++){let i=d+yu*n/a,o=Math.cos(i)*f,s=Math.sin(i)*f*l;this.setDir(u[0]+o*u[3]+s*u[6],u[1]+o*u[4]+s*u[7],u[2]+o*u[5]+s*u[8]),r&&this.tribe&&this.tribeLift(t.pos.x,t.pos.y,t.pos.z),this.beam(t,e.hasColor2&&n%2?e.color2:e.color,p*(r?l<1?.55:.3:1),r?.3:.55)}if(r&&i){let r=e.color,i=n*(l<1?.8:1.2),a=e.rings>0;this.recording||this.gfx.pushSurface(t.pos.x,t.pos.y,t.pos.z,170,u[0],u[1],u[2],c,u[6],u[7],u[8],1,r.r*i,r.g*i,r.b*i,a?.015:.04,o*.5,0,a?.25:.85,o*.5+it(t.index*31+(e.cue?.id??0)),0,l,0,a?170/e.rings:0,e.speed*e.bars),this.recording||this.envAdd(r,i)}if(r&&l<1&&!this.recording&&this.lowHaze>.05){let t=n*.2,r=e.hasColor2?e.color2:e.color;this.seaR+=e.color.r*t,this.seaG+=e.color.g*t,this.seaB+=e.color.b*t,this.sea2R+=r.r*t,this.sea2G+=r.g*t,this.sea2B+=r.b*t}}genGrid(e,t,n){let r=e.nEff,i=yu*e.speed*e.bars,a=n*this.perBeam(r);if(t.group===`base`||t.group===`pillar`||t.group===`turret`||t.group===`deck`&&e.heightGiven&&!this.tribe){let n=this.tribe?Math.max(e.height,Zl):Math.min(e.height,6),o=Math.atan2(n-t.pos.y,40),s=.08*Math.sin(i+(t.row+1)*1.3);for(let n=0;n<r;n++){let i=r>1?n/(r-1):.5;this.dirYP(t,(i-.5)*e.spread+s,o),this.tribe&&this.tribeLift(t.pos.x,t.pos.y,t.pos.z),this.beam(t,this.lerpColor(e,i),a*this.tune.webK,0,170)}return}let o=(Math.round(t.rank*20)%2==0?1:-1)*(.42+.12*Math.sin(i)),s=Math.cos(o),c=Math.sin(o),l=s*t.fwd.x+c*t.lat.x,u=s*t.fwd.z+c*t.lat.z;for(let n=0;n<r;n++){let i=r>1?n/(r-1):.5,o=e.tilt+(i-.5)*e.spread,s=Math.cos(o);this.setDir(s*l,Math.sin(o),s*u),this.beam(t,this.lerpColor(e,i),a,0)}}genBurst(e,t,n){let r=e.nEff,i=yu*e.speed*e.bars,a=t.group===`corner`?-t.side*.3:0;this.aimYP(e,t)?this.dirYP(t,this.aimYaw,this.aimPitch):this.dirYP(t,a,e.tilt),this.basis(this.dx,this.dy,this.dz);let o=this.bx,s=Math.cos(Math.min(Math.PI*.98,e.spread*.5)),c=i*.5,l=n*this.perBeam(r)*1.2*(this.hasKick?.55+.45*this.kickEnv:1);for(let n=0;n<r;n++){let i=1-(n+.5)/r*(1-s),a=Math.sqrt(Math.max(0,1-i*i)),u=n*2.3999632+c,d=Math.cos(u)*a,f=Math.sin(u)*a;this.setDir(i*o[0]+d*o[3]+f*o[6],i*o[1]+d*o[4]+f*o[7],i*o[2]+d*o[5]+f*o[8]),this.beam(t,e.hasColor2&&n%3==0?e.color2:e.color,l,.2)}}genChevron(e,t,n){let r=e.nEff,i=yu*e.speed*e.bars,a=e.distance,o=this.tribe,s=e.hasAim?e.aim.x:0,c=e.hasAim?e.aim.z:a+8,l=e.hasAim?e.aim.y:o?7.8:0;if(e.parallel){this.genChevronBands(e,t,n,s,o?Math.max(l,7.8):l,c);return}let u=s-t.pos.x,d=c-t.pos.z,f=Math.hypot(u,d)||1;u/=f,d/=f;let p=d,m=-u,h=Math.min(1,Math.abs(t.pos.x)/33),g=e.spread/bu,_=.78+.22*Math.sin(i+t.rank*1.3),v=(1+.16*g)*(.35+.65*h)*_,y=8+.3*g,b=n*this.perBeam(r)*.8;for(let n=0;n<r;n++){let i=r>1?n/(r-1):.5,a=(i-.5)*2*v,f=((n*.618034+t.order*.371)%1-.5)*y*(1-Math.abs(i-.5));this.setDir(s+p*a+u*f-t.pos.x,l-t.pos.y,c+m*a+d*f-t.pos.z),o&&this.tribeLift(t.pos.x,t.pos.y,t.pos.z),this.beam(t,this.lerpColor(e,i),b,0)}}genChevronBands(e,t,n,r,i,a){let o=e.nEff,s=r-t.side*this.chevSideX,c=a-t.pos.z,l=Math.hypot(s,c)||1;s/=l,c/=l;let u=(i-t.pos.y)/l,d=this.deckPitch*Math.abs(c)*(o-1)/Math.max(1,o)*(e.spread/(16*bu))/l,f=n*this.perBeam(o)*.9;for(let n=0;n<o;n++){let r=o>1?n/(o-1):.5,i=(r-.5)*d,a=Math.cos(i),l=Math.sin(i);this.setDir(s*a-c*l,u,c*a+s*l),this.tribe&&this.tribeLift(t.pos.x,t.pos.y,t.pos.z),this.beam(t,this.lerpColor(e,r),f,0)}}genZigzag(e,t,n){let r=e.nEff,i=yu*e.speed*e.bars,a=t.order%2?1:-1,o=e.tilt+.05*Math.sin(i*.5+t.rank*Math.PI);this.tribe&&o<.6&&(o=1.2);let s=Math.cos(o),c=Math.sin(o),l=e.spread*(.8+.2*Math.sin(i+a*1.3)),u=(e.heightGiven?e.height:11)+this.figureLift(t),d=n*this.perBeam(r)*.9*this.tune.scanK*e.gain,f=this.reachNow;this.widthK=this.tune.scanW*e.widthMul;for(let n=0;n<r;n++){let i=r>1?n/(r-1):.5,a=(i-.5)*l,o=Math.cos(a),p=Math.sin(a);this.setDir(o*s*t.fwd.x+p*t.lat.x,o*c,o*s*t.fwd.z+p*t.lat.z);let m=650;this.reachNow=f,this.reachFade=.35,this.dy>.02&&u>t.pos.y+.3&&(m=(u-t.pos.y)/this.dy,(f<=0||m<f)&&(this.reachNow=m+1,this.reachFade=this.tune.webFade)),this.tribe&&this.tribeLift(t.pos.x,t.pos.y,t.pos.z),this.beam(t,this.lerpColor(e,i),r>2&&(n===0||n===r-1)?d*this.tune.webEdge:d,.35,m)}this.reachNow=f,this.widthK=1;let p=this.tune.webGlow*e.fill*(t.group===`deck`?Math.min(1,this.deckPitch/15):1);if(p>0&&c>.3&&!this.recording){let n=u>t.pos.y+.3?u-t.pos.y:12*c,i=Math.tan(Math.min(.5*l,1.3)),a=.5*n/c,o=d*Math.sqrt(r)*p,f=e.color;this.gfx.pushSprite(t.pos.x+s*t.fwd.x*a,t.pos.y+c*a,t.pos.z+s*t.fwd.z*a,.5*n*Math.sqrt(1+4*i*i),f.r*o,f.g*o,f.b*o,(e.lines?7:3)+i/4)}}figureLift(e){return e.pos.y>5?e.pos.y-Yl:0}genTrees(e,t,n){let r=e.nEff,i=(e.heightGiven?e.height:10)+this.figureLift(t),a=i-t.pos.y;if(a<.5)return;let o=yu*e.speed*e.bars,s=t.order%2?1:-1,c=Math.min(170*bu,e.spread*(.86+.14*Math.sin(o+s*1.3))),l=n*this.perBeam(r)*1.4*this.tune.scanK*e.gain,u=t.pos.x,d=t.pos.z;this.widthK=this.tune.scanW*e.widthMul;for(let n=0;n<r;n++){let o=r>1?n/(r-1):.5,s=(o-.5)*c,f=Math.sin(s),p=Math.cos(s);this.setDir(f*t.lat.x,-p,f*t.lat.z),this.beamFrom(t,u,i,d,this.lerpColor(e,o),l,a/Math.max(.05,p),.35,!1)}if(this.widthK=1,this.recording||this.gfx.pushSprite(u,i,d,.7,e.color.r*l*.5,e.color.g*l*.5,e.color.b*l*.5,1),e.fill>0&&!this.recording){let n=Math.tan(Math.min(.5*c,1.3)),i=l*Math.sqrt(r)*e.fill,o=e.color;this.gfx.pushSprite(u,t.pos.y+.5*a,d,.5*a*Math.sqrt(1+4*n*n),o.r*i,o.g*i,o.b*i,5+n/4)}this.glow(t,e.color,n*.2)}genX(e,t,n){let r=e.nEff,i=yu*e.speed*e.bars,a=e.hasAim?e.aim.x:0,o=e.hasAim?e.aim.y:e.heightGiven?e.height:1.2,s=e.hasAim?e.aim.z:e.distance;this.tribe&&s>au&&(o=Math.max(o,this.groundAt(a,s)+Zl)),this.setDir(a-t.pos.x,o-t.pos.y,s-t.pos.z);let c=Math.atan2(this.dx*t.lat.x+this.dz*t.lat.z,this.dx*t.fwd.x+this.dz*t.fwd.z)+.015*Math.sin(i)*t.side,l=Math.asin(Math.max(-1,Math.min(1,this.dy))),u=e.hasColor2&&t.side>0?e.color2:e.color,d=n*this.perBeam(r)*2.4;this.widthK=3,t===this.xR&&!this.recording&&this.gfx.pushSprite(a,o,s,3.2,u.r*d*.3,u.g*d*.3,u.b*d*.3,1);let f=this.reachNow;this.tribe&&f<=0&&(this.reachNow=2.1*Math.hypot(a-t.pos.x,o-t.pos.y,s-t.pos.z),this.reachFade=.6);for(let n=0;n<r;n++){let i=r>1?(n/(r-1)-.5)*e.spread:0;this.dirYP(t,c+i,l),this.tribe&&this.tribeLift(t.pos.x,t.pos.y,t.pos.z),this.beam(t,u,d,0),this.tribe||this.floorGraze(t,u,d*.8)}this.widthK=1,this.reachNow=f}floorGraze(e,t,n){let r=this.dy,i=Math.hypot(this.dx,this.dz);if(r>-.001||i<.001)return;let a=e.pos.y/-r,o=Math.max(0,(e.pos.y-.7)/-r);if(a-o<1)return;let s=this.dx/i,c=this.dz/i,l=e.pos.x+this.dx*o,u=e.pos.z+this.dz*o;this.setDir(s,0,c),this.beamFrom(e,l,.05,u,t,n,(a-o)*i,0,!1)}genRings(e,t,n,r){let i=e.nEff,a=e.reach>0?e.reach:fu,o=Math.min(1.25,.5*e.spread),s=yu*e.speed*e.bars,c,l;this.aimYP(e,t)?(c=this.aimYaw,l=this.aimPitch):(c=t.origin===`stage`?(t.rank-.5)*.3:0,l=e.tilt),this.tribe&&(l=Math.max(l,Math.atan2(Zl-t.pos.y,a*.8)+o*Math.min(1,e.squash))),this.dirYP(t,c,l),this.basis(this.dx,this.dy,this.dz);let u=this.bx,d=s*.125*t.side+t.order*.7,f=e.hasColor2&&t.order%2?e.color2:e.color,p=e.lobes,m=e.lobeAmp,h=Math.tan(o),g=e.squash,_=n*this.perBeam(i)*(r?.4:.75);this.reachNow=a,this.reachFade=.3;for(let e=0;e<i;e++){let n=yu*e/i,r=Math.cos(n+d),o=Math.sin(n+d);p>0&&(r=(r+m*Math.cos(p*n-d))/(1+m),o=(o-m*Math.sin(p*n-d))/(1+m)),this.setDir(u[0]+h*(r*u[3]+g*o*u[6]),u[1]+h*(r*u[4]+g*o*u[7]),u[2]+h*(r*u[5]+g*o*u[8])),this.beam(t,f,_,.75,a)}if(r&&!this.recording){let r=n*1.3,i=e.speed*e.bars+t.order%2*.5;this.gfx.pushSurface(t.pos.x,t.pos.y,t.pos.z,a,u[0],u[1],u[2],o,u[6],u[7],u[8],1,f.r*r,f.g*r,f.b*r,.012,s*.5,d,.3,s*.25+t.order,0,g,0,a/Math.max(1,e.rings),i,p,m),this.envAdd(f,r*.5)}}genDashes(e,t,n){if(this.tribe)return;let r=e.nEff,i=yu*e.speed*e.bars,a=e.reach>0?e.reach:26,o=e.distance,s=e.color,c=n*this.perBeam(r),l=.3*e.spread*Math.sin(i+t.rank*2.2);this.reachNow=0;for(let n=0;n<r;n++){let u=r>1?n/(r-1):.5,d=.5+.5*Math.sin(i*1.7+n*2.39+t.order*1.13),f=o+a*.55*d,p=a*(.1+.16*(.5+.5*Math.sin(i*1.1+n*1.7+t.order*.7)));this.dirYP(t,(u-.5)*e.spread+l,0);let m=this.dx,h=this.dz,g=t.pos.x+m*f,_=t.pos.z+h*f,v=Math.max(0,this.groundAt(g,_))+.05;this.setDir(m,0,h),this.beamFrom(t,g,v,_,e.hasColor2&&n%2?e.color2:s,c*.55,p,.95,!1)}}genSheet(e,t,n){let r=yu*e.speed*e.bars,i=t.origin===`stage`,a=this.tribe,o=a?Math.max(e.height,Zl):e.height,s=t.pos.y-o>1.5?i?150:110:i?62:48,c=e.tiltGiven?e.tilt:Math.atan2(o-t.pos.y,s),l=t.group===`deck`?t.side*.1*(.3+Math.abs(t.pos.x)/50):0;this.aimYP(e,t)&&(l=this.aimYaw,c=this.aimPitch);let u=Math.min(Math.PI*.49,e.spread*.5),d=e.far>0?e.far:i?250:150;a&&(c=Math.max(c,this.sheetClearancePitch(t,l,u,d))),this.dirYP(t,l,c);let f=this.dx,p=this.dy,m=this.dz,h=Math.cos(l),g=Math.sin(l),_=h*t.lat.x-g*t.fwd.x,v=h*t.lat.z-g*t.fwd.z,y=p*v-m*0,b=m*_-f*v,x=f*0-p*_,S=Math.sqrt(y*y+b*b+x*x)||1;y/=S,b/=S,x/=S,b<0&&(y=-y,b=-b,x=-x);let C=(.011+.004*Math.sin(r*.25))*e.wave,w=it(qe(t.index*977+(e.cue?.id??0))),T=r+w*yu,E=r*.73+w*3.1,D=n*1/Math.max(.4,2*u),O=e.color,k=t.pos.y>8?Cu((p-.03)/.08):0,A=1+(this.tune.ceilRoofK-1)*k;if(!this.recording&&this.gfx.pushSurface(t.pos.x,t.pos.y,t.pos.z,d,f,p,m,u,y,b,x,0,O.r*D,O.g*D,O.b*D,C,T,E,0,w*yu,0,1,0,0,0,0,0,A)&&this.gfx.setSheetExtras(e.near,e.band,e.patches),!this.recording&&!a&&this.lowHaze>.05){let r=t.pos.y+Math.tan(c)*40,i=n*Math.exp(-Math.max(0,r-Ql)/1.3),a=e.hasColor2?e.color2:O;this.seaR+=O.r*i,this.airR+=O.r*i,this.airG+=O.g*i,this.airB+=O.b*i,this.seaG+=O.g*i,this.seaB+=O.b*i,this.sea2R+=a.r*i,this.sea2G+=a.g*i,this.sea2B+=a.b*i}let ee=b*m-x*p,te=x*f-y*m,j=y*p-b*f;for(let e=0;e<2;e++){let r=(e===0?-1:1)*u,i=C*(.62*Math.sin(5*r+T)+.38*Math.sin(8.7*r-E+1.3)),a=Math.cos(r),o=Math.sin(r),s=Math.cos(i),c=Math.sin(i);this.setDir((a*f+o*ee)*s+y*c,(a*p+o*te)*s+b*c,(a*m+o*j)*s+x*c),this.beam(t,O,n*.15,0,d*.9)}this.recording||(this.envAdd(O,n*1.2),this.audienceWash+=n*3)}pushSea(){let e=this.seaR+this.seaG+this.seaB,t=Math.min(1,Math.max(0,(this.lowHaze-.45)/.4)),n=t*t*(3-2*t),r=Math.min(1,Math.max(0,(this.lowHaze-this.airGate0)/(.9-this.airGate0))),i=r*r*(3-2*r);if(this.tribe||this.airLight.setRGB(this.airR*i,this.airG*i,this.airB*i),this.tribe||n<.01||e<.01)return;let a=2*n;this.gfx.pushSurface(0,Ql,-1,160,0,0,1,1.25,0,1,0,2,this.seaR*a,this.seaG*a,this.seaB*a,0,this.sea2R*a,this.sea2G*a,this.sea2B*a,0,this.seaZoneX,1,0)}groundAt(e,t){let n=this.terrain?.heightAt;return n?n.call(this.terrain,e,t):0}tribeLift(e,t,n){let r=Math.hypot(this.dx,this.dz);if(r<.001)return;let i=this.dx/r,a=this.dz/r,o=-1/0;for(let r=1;r<=8;r++){let s=r*25,c=e+i*s,l=n+a*s;if(l<au||l>ou||c>su||c<-125)continue;let u=(this.groundAt(c,l)+Zl-t)/s;u>o&&(o=u)}o<=this.dy/r||this.setDir(i,o,a)}sheetClearancePitch(e,t,n,r){let i=Math.cos(t),a=Math.sin(t),o=i*e.fwd.x+a*e.lat.x,s=i*e.fwd.z+a*e.lat.z,c=i*e.lat.x-a*e.fwd.x,l=i*e.lat.z-a*e.fwd.z,u=-1/0;for(let t=0;t<5;t++){let i=(t/4-.5)*2*n,a=Math.cos(i),d=Math.sin(i);for(let t=1;t<=8;t++){let n=t/8*r,i=e.pos.x+(o*a+c*d)*n,f=e.pos.z+(s*a+l*d)*n;if(f<au||f>ou||i>su||i<-125)continue;let p=n*a;if(p<1)continue;let m=(this.groundAt(i,f)+Zl-e.pos.y)/p;m>u&&(u=m)}}return u===-1/0?-Math.PI/2:Math.atan(u)}genHit(e,t){let n=e.members,r=e.nEff,i=e.intensity*e.env*e.gate;if(i<=.001||r<=0)return;if(e.lens){this.genLens(e,i);return}let a=e.cue?e.cue.seed:0,o=it(a)*yu+(t-(e.cue?.t??0))*.6;for(let t=0;t<n.length;t++){let a=n[t],s=i*a.power*this.perBeam(r)*1.3;if(this.reachNow=e.reach>0?e.reach:a.group===`corner`||a.group===`turret`?cu:0,this.reachFade=.35,e.starHit){this.dirYP(a,0,a.origin===`field`?8*bu:22*bu),this.basis(this.dx,this.dy,this.dz);let t=this.bx,n=Math.cos(e.spread*.5);for(let i=0;i<r;i++){let c=1-(i+.5)/r*(1-n),l=Math.sqrt(Math.max(0,1-c*c)),u=i*2.3999632+o,d=Math.cos(u)*l,f=Math.sin(u)*l;this.setDir(c*t[0]+d*t[3]+f*t[6],c*t[1]+d*t[4]+f*t[7],c*t[2]+d*t[5]+f*t[8]),this.beam(a,e.color,s,0)}}else{let t=e.tilt+(a.group===`high`?8*bu:0);for(let n=0;n<r;n++){let i=r>1?n/(r-1):.5;this.dirYP(a,(i-.5)*e.spread,t),this.beam(a,e.color,s,0)}}}this.reachNow=0}genLens(e,t){let n=e.members,r=null,i=-2;for(let e=0;e<n.length;e++){let t=n[e],a=t.index*3,o=this.toCam[a]*t.fwd.x+this.toCam[a+2]*t.fwd.z+(t.origin===`stage`?.2:0);o>i&&(i=o,r=t)}if(!r)return;let a=r.index*3;this.recording||(this.lensE=r.index),this.setDir(this.toCam[a],this.toCam[a+1],this.toCam[a+2]),this.reachNow=0,this.beam(r,e.color,t*2.5*r.power,0)}ensureSmearCapacity(){let e=(this.gfx.beamCap+this.rig.emitters.length*4+64)*3;this.smear.length<e&&(this.smear=new Float32Array(e))}aimYaw=0;aimPitch=0;aimYP(e,t){if(!e.hasAim)return!1;let n=e.aim.x-t.pos.x,r=e.aim.y-t.pos.y,i=e.aim.z-t.pos.z,a=n*t.fwd.x+i*t.fwd.z,o=n*t.lat.x+i*t.lat.z;return this.aimYaw=Math.atan2(o,a),this.aimPitch=Math.atan2(r,Math.sqrt(a*a+o*o)),!0}dirYP(e,t,n){let r=Math.cos(n),i=Math.cos(t)*r,a=Math.sin(t)*r;this.dx=i*e.fwd.x+a*e.lat.x,this.dy=Math.sin(n),this.dz=i*e.fwd.z+a*e.lat.z}setDir(e,t,n){let r=Math.sqrt(e*e+t*t+n*n)||1;return this.dx=e/r,this.dy=t/r,this.dz=n/r,r}basis(e,t,n){let r=this.bx;r[0]=e,r[1]=t,r[2]=n;let i=-e*t,a=1-t*t,o=-n*t,s=Math.sqrt(i*i+a*a+o*o);s<1e-4&&(i=1,a=0,o=0,s=1),i/=s,a/=s,o/=s,r[3]=a*n-o*t,r[4]=o*e-i*n,r[5]=i*t-a*e,r[6]=i,r[7]=a,r[8]=o}beamFrom(e,t,n,r,i,a,o,s=0,c=!0){this.oOverride=!0,this.ox=t,this.oy=n,this.oz=r,this.beam(e,i,a,s,o,c),this.oOverride=!1}beam(e,t,n,r,i=650,a=!1){if(n<=5e-4)return;let o=this.recIdx++*3;if(this.recording){if(o+2>=this.smear.length)return;this.smear[o]=this.dx,this.smear[o+1]=this.dy,this.smear[o+2]=this.dz;return}let s=0,c=0,l=0;o+2<this.recCount*3&&o+2<this.smear.length&&(s=this.smear[o],c=this.smear[o+1],l=this.smear[o+2]);let u=!this.oOverride,d=u?e.pos.x:this.ox,f=u?e.pos.y:this.oy,p=u?e.pos.z:this.oz,m=this.dx,h=this.dy,g=this.dz,_=i,v=a,y=!1;if(h<-1e-4){let e=f/-h;e<_&&(_=e,v=!0,y=!0)}if(this.tune.bankClip>0&&h<.2){let e=Ou(d,f,p,m,h,g);e>0&&e<_&&(_=e,v=!0,y=!0)}if(e.origin===`field`)for(let e=0;e<_u.length;e++){let t=ku(d,f,p,m,h,g,_u[e]);t>0&&t<_&&(_=t,v=!0,y=!1)}let b=this.reachNow,x=1;if(b>0){if(b<_)_=b,v=!1;else if(v){let e=b*this.reachFade,t=Cu((_-e)/Math.max(.01,b-e));x=1-t*t*(3-2*t)}}this.cloudH>0&&!this.recording&&this.cloudAt(e,d,f,p,m,h,g,_,t,n);let S=t.r*n,C=t.g*n,w=t.b*n;if(!this.gfx.pushBeam(d,f,p,m,h,g,_,S,C,w,r,v,this.beamWidth*this.widthK,s,c,l,b,this.reachFade))return;if(v&&x>.01){let e=(y&&!a?Math.min(1,Math.max(.1,-h*5)):1)*x;this.gfx.pushSprite(d+m*_,f+h*_,p+g*_,a?.32:.2,S*5*e,C*5*e,w*5*e,1)}if(!u){this.envAdd(t,n);return}let T=e.index*4,E=e.index*3,D=m*this.toCam[E]+h*this.toCam[E+1]+g*this.toCam[E+2],O=D>.9?Math.exp((D-1)*1400):0,k=D>.5?Math.exp((D-1)*35):0,A=this.calm?.12:1,ee=n*(.05+.6*k+60*O*A);this.flare[T]+=t.r*ee,this.flare[T+1]+=t.g*ee,this.flare[T+2]+=t.b*ee,this.flare[T+3]+=n*O*A,this.envAdd(t,n),e.origin===`stage`&&g>.3&&h<.25&&(this.audienceWash+=n)}glow(e,t,n){if(this.recording)return;let r=e.index*4;this.flare[r]+=t.r*n*.3,this.flare[r+1]+=t.g*n*.3,this.flare[r+2]+=t.b*n*.3}envAdd(e,t){this.envR+=e.r*t,this.envG+=e.g*t,this.envB+=e.b*t,this.envPow+=t}pushFlares(){let e=this.rig.emitters;for(let t=0;t<e.length;t++){let n=t*4,r=this.flare[n],i=this.flare[n+1],a=this.flare[n+2],o=r+i+a;if(o<.003)continue;let s=e[t],c=this.flare[n+3],l=.16*(1+Math.min(10,Math.sqrt(c)*3)),u=s.pos.x+s.fwd.x*.05,d=s.pos.z+s.fwd.z*.05;this.gfx.pushSprite(u,s.pos.y,d,l,r*5,i*5,a*5,0);let f=t*3,p=this.glowA[f],m=this.glowA[f+1],h=this.glowA[f+2];if(p+m+h>.01){let e=this.tune.glowK,n=this.haloA[t];if(n>0){let t=Math.max(1,Math.hypot(this.camPos.x-u,this.camPos.y-s.pos.y,this.camPos.z-d)),r=Math.max(this.tune.glowSize,t*Math.tan(n)),i=e*Math.sqrt(this.tune.glowSize/r)*this.tune.haloGain;this.gfx.pushSprite(u,s.pos.y,d,r,p*i,m*i,h*i,4)}else this.gfx.pushSprite(u,s.pos.y,d,this.tune.glowSize,p*e,m*e,h*e,1)}let g=t===this.lensE;if(c>(g?.05:.35)){let e=Math.hypot(this.camPos.x-u,this.camPos.y-s.pos.y,this.camPos.z-d),t=Math.min(1,c),n=Math.min(2.5,c*1.6)/o*(g?1.2:.4)*(this.calm?g?.4:.5:1);this.gfx.pushSprite(u,s.pos.y,d,e*(g?.12+.32*t:.06+.12*t),r*n,i*n,a*n,2)}}}stats(){let e=this.stat;return{beams:e.beams,requested:e.requested,budget:this.gfx.beamBudget,budgetScale:+this.budgetScale.toFixed(2),surfaces:e.surfaces,sprites:e.sprites,emitters:this.rig.emitters.length,activeEmitters:e.active,looks:e.looks,drawCalls:this.gfx.drawCalls,triangles:this.gfx.triangles,haze:+this.gfx.shared.uHaze.value.toFixed(2),mode:this.tribe?`tribe`:`filmed`,lowHaze:+this.lowHaze.toFixed(2)}}dispose(){this.app?.scene.remove(this.gfx.group),this.gfx.dispose()}};function Du(e,t,n){let r=t;n>.05&&r>0&&(r-=Math.floor(r/n)*n);let i=-1;for(let t=0;t<e.length;t++){let n=e[t],a=n&&typeof n==`object`?n.at:void 0;(typeof a==`number`&&Number.isFinite(a)?a:0)<=r+1e-6&&(i=t)}return i}function Ou(e,t,n,r,i,a){if(Math.abs(r)<1e-4)return-1;let o=r>0?1:-1,s=tu*Math.abs(r)-i;if(s<=1e-5)return-1;let c=(t-tu*(o*e-eu))/s;if(c<=0)return-1;let l=t+i*c;if(l<0||l>nu)return-1;let u=n+a*c;return u<ru||u>iu?-1:c}function ku(e,t,n,r,i,a,o){let s=-1/0,c=1/0;for(let l=0;l<3;l++){let u=l===0?e:l===1?t:n,d=l===0?r:l===1?i:a,f=o[l],p=o[l+3];if(Math.abs(d)<1e-9){if(u<f||u>p)return-1;continue}let m=(f-u)/d,h=(p-u)/d;if(m>h){let e=m;m=h,h=e}m>s&&(s=m),h<c&&(c=h)}return c<s||c<=0||s<=0?-1:s}var Au=[`truss`,`floor`,`towers`,`field`],ju=1024,Mu=2048,Nu=4096,Pu=8191,Fu=8192,Iu=16384,Lu=32768,Ru=65536,zu=122880,Bu=[767,256,3072,Nu],Vu={all:Pu,truss:Bu[0],fixtures_truss:Bu[0],floor:Bu[1],fixtures_floor:Bu[1],towers:3072,field:Nu,delay_towers:3072,pillars:3072,pillars_top:ju,pillars_base:Mu,laser_field:5248,foh:Nu,wings:1,wing_left:1,wing_right:1,wing_tips:1,deck:256,deck_front:256,deck_back:Fu,backlight:Fu,backlights:Fu,roof:60,towers_top:8,tower_torches:8,castle:12,dragon:16,dragon_head:16,dragon_mouth:16,dragon_eyes:16,speaker_hangs:32,hang_glitter:32,sides:706,side_sections:576,side_front:576,side_rampart:64,corner_fireballs:512,corners:512,arms:130,arm_posts:2,arm_ends:128,laser_stage:588,stage:Bu[0]|Bu[1],dj_booth:49152,arch:Lu,portal:Lu,booth:Iu,spar_lamps:Ru,spar_lamp:Ru,wing_lamps:Ru};function Hu(e,t,n){let r=0,i=!1,a=!1,o=0;for(let t of e){(t===`left`||t===`wing_left`)&&(i=!0),(t===`right`||t===`wing_right`)&&(a=!0),t===`center`&&(o|=1),(t===`outer`||t===`ends`)&&(o|=2);let e=Vu[t];e&&(r|=e)}let s=typeof t==`string`?[t]:Array.isArray(t)?t:null;if(s){let e=0;for(let t of s){let n=Au.indexOf(t);n>=0&&(e|=Bu[n])}e&&(r=r&&r!==8191?r&e|r&zu:e)}return n.tags=r||8191,n.side=o===1?0:i&&!a?-1:a&&!i?1:0,n.band=o,n}function Uu(e,t,n){if((e.tags&t)===0)return!1;if(e.band!==0){let t=Math.abs(n);if(!(e.band&1&&t<14||e.band&2&&t>=20))return!1}return e.side===0?!0:e.side<0?n<-.5:n>.5}function Wu(e){let t=typeof e==`string`?[e]:Array.isArray(e)?e:null;if(!t)return 15;let n=0;for(let e of t){let t=Au.indexOf(e);t>=0&&(n|=1<<t)}return n||15}var Gu=[-30,-17,-6,0,6,17,30];function Ku(e){let t=new Map,n=[];for(let r of e){let e=r.pos.x,i=e<=-20?-3:e<=-14?-2:e<-.5?-1:e<=.5?0:e<14?1:e<20?2:3,a=`${r.group}:${r.tags}:${i}`,o=t.get(a);o===void 0&&(o=n.length,t.set(a,o),n.push({group:r.group,tags:r.tags,x:Gu[i+3]})),r.cls=o}return n}var qu=new er,Ju=(e,t,n)=>new u(e,t,n);function Yu(e,t){let n=e.get(t),r=qu.get(t);if(n.length!==r.length)return!1;for(let e=0;e<n.length;e++)if(n[e].distanceToSquared(r[e])>1e-6)return!1;return!0}var Xu=[8,7,5],Zu=.36,Qu=[[14,16,-12],[24,14,-12],[48,13.5,-10],[63,13.5,-10],[78,13.5,-10]],$u=[[11,-4],[31,-6]],ed={x:92,z:-4,top:15},td={x:94,z:58,top:12.5},nd=[36,69,102,135],rd=20,id=12.8,ad=Ju(0,.5,90),od={w:5.4,apex:7.2,frontZ:-6,wallT:.9,deckY:1.9,depth:3},sd=[[.3,6.05],[.88,5.9],[1.42,5.55],[1.9,4.95]],cd=od.frontZ-od.depth+.6,ld=3.2,ud=.35,dd=[0,2,40],fd=7;function pd(){let{w:e,apex:t,frontZ:n,wallT:r}=od,i=e,a=e/2,o=t-i*Math.sin(Math.PI/3),s=(e,t)=>{let s=Math.PI-Math.PI/3*e,c=a+i*Math.cos(s),l=o+i*Math.sin(s),u=(a-c)/i,d=(o-l)/i;return Ju(t*(c+u*.25),l+d*.25,n-r*.45)},c=[],l=fd;for(let e=0;e<l;e++){let t=e/6*2-1,n=.36+.64*(1-Math.abs(t));c.push(s(n,t<0?-1:1))}return c}var md=[`fixtures_truss`,`fixtures_floor`,`pillars_top`,`pillars_base`,`delay_towers`,`foh`,`wing_left`,`wing_right`,`towers_top`,`dragon_head`];function hd(e,t,n,r){let i=Ke(e),a=ct(i);return ot(i,t,n,dt(i,t,a)).addScaledVector(a,et(n)+r)}function gd(e){if(!Yu(e,`towers_top`)&&e.get(`towers_top`).length>0)return e.get(`towers_top`);let t=[];for(let e of[-1,1])for(let[n,r,i]of Qu)t.push(Ju(e*n,r,i));return t}function _d(e,t,n){let r=t=>{let r=e.get(t);return r.length>0&&!Yu(e,t)&&n?.get(t)!==r},i=[],a=[],o=0,s=(e,n=1)=>Math.max(n,Math.round(e*t)),c=Ju(0,1,0),l=Ju(0,0,1),d=Ju(1,0,0),f=(e,t,n,r,a,o,s,l,f=d)=>{let p=i.length,m=r.clone().setY(0).normalize(),h=new u().crossVectors(c,m).normalize(),g=n.x<-.75?-1:+(n.x>.75),_=g===0?1:Math.sign(h.x*g)||1;i.push({index:p,group:e,tags:t,pos:n.clone(),hang:a,fwd:m,right:h,fanAxis:f.clone(),side:g,out:_,fanOut:g===0||f.x*g>=0?1:-1,rx:h.x>=0?1:-1,u:Math.max(-1,Math.min(1,n.x/94)),cluster:l,k:o,n:s,ck:s>1?o/(s-1)*2-1:0,cx:0,seed:qe(p*7919+17)/4294967296,sel:0,rest:new u,cls:0,focus:null,body:!0})},p=(e,t,n,r,i,a,s,c=!1,l=d)=>{for(let u=0;u<n;u++)f(e,t,r.clone().addScaledVector(i,(u-(n-1)/2)*a),s,c,u,n,o,l);o++},m=(e,t,n,r,i,a=d)=>{let s=Math.ceil(n/2),l=new u().crossVectors(c,i).normalize();for(let c=0;c<n;c++){let u=c%s,d=Math.floor(c/s),p=r.clone().addScaledVector(l,(u-(s-1)/2)*.62).addScaledVector(i,d===0?.3:-.3);f(e,t,p,i,!1,c,n,o,a)}o++},h=(e,t,n,r=!1)=>a.push({kind:`strobe`,tags:e,pos:t.clone(),fwd:n.clone().normalize(),twoSided:r,seed:qe(a.length*131+5)/4294967296,size:Ju(.62,.16,.22)}),g=(e,t,n)=>a.push({kind:`blinder`,tags:e,pos:t.clone(),fwd:n.clone().normalize(),twoSided:!1,seed:qe(a.length*131+5)/4294967296,size:Ju(.62,.62,.2)}),_=()=>{let t=e.get(`dragon_head`)[0],n=!!t&&!Yu(e,`dragon_head`),r=n?t.x:-2.5,i=n?t.y+4.6:18.6,a=n?t.z-.8:-12.6,c=s(8,2);for(let e=0;e<c;e++){let t=e/(c-1)*2-1;f(0,16,Ju(r+t*3.9,i+.9*(1-t*t),a),l,!1,e,c,o)}o++};if(r(`fixtures_truss`))o=xd(e.get(`fixtures_truss`),t,o,f),i.some(e=>e.tags===16)||_();else{for(let e of[-1,1]){let t=Ke(e);for(let n=0;n<3;n++){let r=s(t.bases[n].distanceTo(t.tips[n])/1.3,3);for(let t=0;t<r;t++)f(0,1,hd(e,n,.08+.86*t/Math.max(1,r-1),.5),l,!1,t,r,o);o++}}_();for(let e of[-1,1])for(let t of[14.5,29.5])p(0,4,s(10,2),Ju(e*t,9.95,-12.4),d,1.45,l);for(let t of gd(e))p(0,8,s(2),Ju(t.x,t.y+.3,t.z+1.2),d,1.5,l);for(let e of[-1,1])for(let[t,n]of $u)m(0,32,s(8,2),Ju(e*t,16.8,n),l);for(let e of[-1,1])for(let t of[52,77])p(0,64,s(8,2),Ju(e*t,9.95,-4.4),d,1.6,l);for(let e of[-1,1])m(0,512,s(6,2),Ju(e*ed.x,ed.top+.3,ed.z),l);for(let e of[-1,1])m(0,128,s(5,2),Ju(e*td.x,td.top+.3,td.z),Ju(-e,0,0),l)}if(r(`fixtures_floor`))o=Cd(e.get(`fixtures_floor`),1,256,!1,o,f,t);else for(let e of[-28,-9.5,9.5,28])p(1,256,s(10,2),Ju(e,2.2,-.65),d,1.7,l);let v=wd(e),y=v.reduce((e,t)=>Math.max(e,t.row+1),0),b=t>=1.25?2:1,x=Ju(0,0,-1);for(let e of v){let t=e.top.x<0?-1:1;for(let n=0;n<b;n++){let r=b>1?n===0?-1.15:1.15:-1.15;f(2,ju,Ju(e.top.x-t*1.25,e.capitalY+.35,e.top.z+r),x,!1,n,b,o)}o++}let S=r(`foh`)?e.get(`foh`)[0]:ad,C=S.y>4;p(3,Nu,s(6,2),Ju(S.x,S.y+(C?-.5:.4),S.z-2.7),d,2,x,C);for(let[e,t]of pd().entries()){f(0,Lu,t,l,!0,e,fd,o);let n=i[i.length-1];n.body=!1;let r=t.x*.45,a=od.frontZ+2.6,s=gt(r,a);n.focus=Ju(r,Number.isFinite(s)?s:od.deckY,a)}o++;for(let e=0;e<40;e++)h(256,Ju(-36.2+72.4*(e+.5)/40,2,.05),l);for(let e of[-1,1]){Xu.forEach((t,n)=>{for(let r=0;r<t;r++)h(1,hd(e,n,.15+.8*(r+.5)/t,Zu),l)});for(let t=0;t<6;t++)h(4,Ju(e*(9+t*5.4),9.6,-12.1),l);for(let t=0;t<4;t++)h(2,Ju(e*(92.6+t*.4),6.1,6+t*14),Ju(-e,0,0));for(let t=0;t<4;t++)g(512,Ju(e*ed.x+(t%2?.8:-.8),ed.top-2.2-Math.floor(t/2)*.9,ed.z+3.1),l)}for(let e=0;e<24;e++)g(256,Ju(-35.5+71*(e+.5)/24,2.6,-.3),l);for(let e of v)g(Mu,Ju(e.top.x,e.capitalY-1.4,e.top.z+1.45),l);for(let[e,t]of sd)for(let n of[-1,1])g(Fu,Ju(n*e,t,cd),l);let w=od.frontZ-.35,T=gt(0,w);g(Iu,Ju(0,(Number.isFinite(T)?T:od.deckY+.8)+1.35,w),l);for(let e of[-1,1]){let t=i.filter(t=>t.tags===1&&t.pos.x*e>.5).map(e=>e.pos);if(t.length<2)continue;let n=0,r=0,a=0,o=0,s=1/0,c=0;for(let e of t)n++,r+=e.x,a+=e.y,o+=e.z,s=Math.min(s,Math.abs(e.x)),c=Math.max(c,Math.abs(e.x));r/=n,a/=n,o/=n;let l=0,u=0,d=0;for(let e of t)l+=(e.x-r)**2,u+=(e.x-r)*(e.y-a),d+=(e.x-r)*(e.z-o);let f=l>1e-6?u/l:0,p=l>1e-6?d/l:0,m=s+(c-s)*ud,h=(c-m)*Math.sqrt(1+f*f),_=Math.max(2,Math.round(h/ld)+1);for(let t=0;t<_;t++){let n=e*(m+(c-m)*t/(_-1)),i=Ju(n,a+f*(n-r)-.1,o+p*(n-r)+.3);g(Ru,i,Ju(dd[0]-i.x,dd[1]-i.y,dd[2]-i.z))}}vd(i),yd(i);for(let e of i){let t=(e.cx*28+e.fanOut*Math.abs(e.side)*12)*Math.PI/180;e.rest.copy(c).multiplyScalar(Math.cos(t)).addScaledVector(e.fanAxis,Math.sin(t)).multiplyScalar(Math.cos(.3)).addScaledVector(e.fwd,Math.sin(.3)).normalize(),e.focus&&e.rest.subVectors(e.focus,e.pos).normalize()}return{fixtures:i,classes:Ku(i),emitters:a,pillars:v,rows:y,clusters:o,sources:md.map(t=>e.get(t))}}function vd(e){let t=new Map;for(let n of e){let e=t.get(n.cluster);e||t.set(n.cluster,e=[]),e.push(n)}for(let e of t.values()){if(e.length<2)continue;let t=new u;for(let n of e)t.add(n.pos);t.multiplyScalar(1/e.length);let n=0;for(let r of e)n=Math.max(n,Math.abs(r.pos.clone().sub(t).dot(r.fanAxis)));for(let r of e)r.cx=n>.05?r.pos.clone().sub(t).dot(r.fanAxis)/n:r.ck}}function yd(e){let t=new Map;for(let n of e){let e=t.get(n.cluster);e||t.set(n.cluster,e=[]),e.push(n)}for(let e of t.values())e.sort((e,t)=>Math.abs(e.pos.x)-Math.abs(t.pos.x)||e.pos.x-t.pos.x||e.pos.y-t.pos.y),e.forEach((e,t)=>e.sel=t*.6180339887%1)}function bd(e){let t=Math.abs(e.x);return t>88&&e.z>2?e.z>54?128:2:t>86?512:t>38?e.y>12?8:64:e.z>-8&&e.y>15?32:e.z<-15.5&&e.y>8?1:t<9&&e.y>15?16:e.y>12?8:4}function xd(e,t,n,r){let i=new u(0,0,1),a=e.map(bd),o=0;for(let s=1;s<=e.length;s++){if(!(s===e.length||a[s]!==a[s-1]||e[s].distanceTo(e[s-1])>3||s-o>=12))continue;let c=a[o],l=c===2||c===128,d=Sd(s-o,t);d.forEach((t,a)=>{let s=e[o+t],f=l?new u(-Math.sign(s.x)||1,0,.2).normalize():i;r(0,c,s,f,!1,a,d.length,n,l?i:void 0)}),n++,o=s}return n}function Sd(e,t){let n=Math.min(e,Math.max(1,Math.round(e*t))),r=[];for(let t=0;t<n;t++)r.push(Math.min(e-1,Math.round((t+.5)*e/n-.5)));return r}function Cd(e,t,n,r,i,a,o=1){let s=[...e].sort((e,t)=>e.x-t.x),c=new u(0,0,1),l=0;for(let e=1;e<=s.length;e++){if(!(e===s.length||s[e].distanceTo(s[e-1])>6||e-l>=12))continue;let u=Sd(e-l,o);u.forEach((e,o)=>a(t,n,s[l+e],c,r,o,u.length,i)),i++,l=e}return i}function wd(e){let t=[],n=[];if(Yu(e,`pillars_top`)?Yu(e,`delay_towers`)||(t=e.get(`delay_towers`)):(t=e.get(`pillars_top`),n=Yu(e,`pillars_base`)?[]:e.get(`pillars_base`)),t.length===0)for(let e of nd)for(let n of[-20,rd])t.push(Ju(n,id,e));let r=[...new Set(t.map(e=>Math.round(e.z)))].sort((e,t)=>e-t);return t.map((e,t)=>{let i=n[t],a=i?i.clone():Ju(e.x,0,e.z),o=e.y-a.y>11.5?e.y-3.200000000000001:Math.max(a.y+3,e.y-1.6);return{top:e.clone(),base:a,capitalY:o,row:r.indexOf(Math.round(e.z)),index:t}})}var Td=[`dark`,`ambient`,`sweep`,`fan`,`ballyhoo`,`circle`,`tilt_wave`,`audience`,`crosshatch`,`sky`,`pulse`,`still`,`curtain`],Ed=[0,.0625,.25,.125,1,.25,.25,.125,.125,.0625,0,0,0],Dd=Math.tan(1.3*Math.PI/180),Od=Math.tan(3.4*Math.PI/180);function kd(e){return Math.min(1,Math.max(.2,1.6*e-.35))}var Ad=1.5,jd=(e,t)=>typeof e==`number`&&Number.isFinite(e)?e:t,Md=e=>typeof e==`string`&&e.length>0?e:void 0,Nd=e=>Array.isArray(e)&&e.length===3&&e.every(e=>typeof e==`number`&&Number.isFinite(e))?new u(e[0],e[1],e[2]):null,Pd=[`steady`,`flicker`,`chase`,`twinkle`,`pulse`,`off`],Fd={wings:1,wing_left:1,wing_right:1,wing_tips:1,castle:2,roof:2,deck_back:2,sides:4,side_sections:4,side_front:4,side_rampart:4,torches:8,tower_torches:8,towers_top:8,all:7};function Id(e){let t=0,n=!1,r=!1;for(let i of e)t|=Fd[i]??0,(i===`left`||i===`wing_left`)&&(n=!0),(i===`right`||i===`wing_right`)&&(r=!0);t||=Fd.all;let i=n===r?3:n?1:2,a=0;for(let e=0;e<4;e++)t&1<<e&&(a|=i<<e*2);return a}function Ld(e,t){let n=e.p??{},r=e.targets,i=r.includes(`left`),a=i===r.includes(`right`)?12:i?4:8,o=e=>{switch(e){case`stage`:case`castle`:case`set`:return 1;case`field`:case`audience`:return 2;case`sides`:case`side_sections`:case`side_front`:case`side_rampart`:return a;case`all`:return 15;default:return 0}};if(t===`flood`){let e=e=>e===`aisle`?16:e===`front`||e===`deck_front`?32:e===`pools`?48:0,t=Array.isArray(n.area)?n.area:[n.area],i=0;for(let n of t)i|=e(n)||o(Md(n));return i||r.reduce((e,t)=>e|o(t),0)||15}let s=0;for(let e of r)e!==`all`&&o(e)&12&&(s|=a);return s}var Rd=[`steady`,`flicker`,`chase`,`pulse`,`off`,`strobe`];function zd(e,t){switch(e){case`quarter`:return .25;case`halfbeat`:return .5;case`beat`:return 1;case`2beat`:return 2;case`bar`:return 4;default:return typeof e==`number`&&Number.isFinite(e)&&e>0?Math.min(16,Math.max(.125,e)):t}}var Bd=e=>{if(!Array.isArray(e))return null;let t=e.filter(e=>typeof e==`string`&&e.length>0);return t.length?t:null};function Vd(e,t){let n=e.p??{},r=Td.indexOf(n.preset),i=r>=0?r:e.fx===`look`?3:0,a=Md(n.beam),o=i===1,s=Math.max(0,jd(n.intensity,1)),c={cue:e,t0:e.t,dur:e.dur,fade:Math.max(0,jd(n.fade,e.fx===`wash`?1:e.fx===`pillars`?.6:.5)),seed:e.seed,bpm:t.tempo?t.tempo.segmentAt(e.t).bpm:150,intensity:s,color:Md(n.color),color2:Md(n.color2),c1:new I(1,1,1),c2:new I(1,1,1),preset:i,speed:jd(n.speed,Ed[i]??.25),groups:Wu(n.groups),tan:a===`wide`?Od:a===`narrow`?Dd:o?Od:Dd,kick:n.kick===!0,tilt:typeof n.tilt==`number`?n.tilt:null,pan:typeof n.pan==`number`?n.pan:null,spread:typeof n.spread==`number`?n.spread:null,density:typeof n.density==`number`&&Number.isFinite(n.density)?Math.min(1,Math.max(.05,n.density)):kd(s),densitySet:typeof n.density==`number`&&Number.isFinite(n.density),level:Math.min(s,1)**+Ad*Math.max(1,s),aim:Nd(n.aim),sway:Math.max(0,jd(n.sway,0)),gobo:+(n.gobo===`dots`||n.gobo===`glitter`||n.gobo===`breakup`),flare:e.fx===`look`?Math.min(2,Math.max(0,jd(n.flare,0))):0,target:Hu(e.targets,n.groups,{tags:0,side:0,band:0}),mask:null,pattern:Md(n.pattern)??`lr`,every:n.every===`halfbeat`?.5:n.every===`bar`?4:n.every===`2beat`?2:n.every===`quarter`&&e.fx===`pillars`?.25:1,everySet:n.every!==void 0,rate:Math.max(.5,Math.min(30,jd(n.rate,12))),mode:Math.max(0,(e.fx===`festoon`?Pd:Rd).indexOf(Md(n.mode)??`steady`)),shaft:Md(n.shaft)??Md(n.color2),shaftIntensity:Math.max(0,jd(n.shaftIntensity,.8)),c3:new I(1,1,1),pmask:null,colors:e.fx===`pillars`?Bd(n.colors):null,rowColors:e.fx===`pillars`?Bd(n.rowColors):null,shafts:e.fx===`pillars`?Bd(n.shafts):null,rowShafts:e.fx===`pillars`?Bd(n.rowShafts):null,blAttack:e.fx===`blinder`&&typeof n.attack==`number`&&Number.isFinite(n.attack)?Math.max(.01,n.attack):-1,release:e.fx===`blinder`&&typeof n.release==`number`&&Number.isFinite(n.release)?Math.min(3,Math.max(.02,n.release)):-1,tail:-1,gate:e.fx===`flood`&&n.gate!==void 0?zd(n.gate,0):0,duty:Math.min(.95,Math.max(.05,jd(n.duty,.5))),gateOffset:(jd(n.offset,0)%1+1)%1,area:e.fx===`flood`||e.fx===`wash`?Ld(e,e.fx):0,attack:Math.max(.01,jd(n.attack,.08)),fieldShare:e.fx===`wash`?Math.min(1,Math.max(0,jd(n.fieldShare,0))):0,strings:e.fx===`festoon`?Id(e.targets):0};return e.fx===`flood`&&(c.fade=Math.max(0,jd(n.fade,.8))),e.fx===`festoon`&&(c.fade=Math.max(0,jd(n.fade,.4))),e.fx===`storm`&&(c.attack=Math.max(.01,jd(n.attack,.6)),c.fade=Math.max(0,jd(n.fade,1.2))),c.release>=0&&(c.tail=Math.max(.05,c.release*3.5)),c}var Hd=.002,Ud=.5,Wd=.15,Gd=class e{touch;items=[];maxDur=0;constructor(e=!1){this.touch=e}push(e){this.items.push(e)}finish(){this.items.sort((e,t)=>e.t0-t.t0||e.cue.id-t.cue.id),this.maxDur=0;for(let e of this.items)this.maxDur=Math.max(this.maxDur,e.dur)}calmCopy(){let t=new e(this.touch),n=null;for(let e of this.items){if(n){let t=n.t0+n.dur,r=e.t0-t;if(e.dur<Ud&&e.t0-n.t0<qd){let i=e.t0+e.dur;i>t&&r<qd&&(n.dur=i-n.t0);continue}r>0&&r<qd&&(n.dur=e.t0-n.t0)}n={...e,fade:Math.max(e.fade,Wd)},t.push(n)}return t.finish(),t}upper(e){let t=this.items,n=0,r=t.length-1,i=-1;for(;n<=r;){let a=n+r>>1;t[a].t0<=e?(i=a,n=a+1):r=a-1}return i}winnerAt(e,t=1/0){let n=Math.min(this.upper(e),t-1),r=this.items;for(;n>=0;n--){let t=r[n];if(t.t0<e-this.maxDur)break;if(e<t.t0+t.dur)return n}return-1}resolve(e,t){let n=this.items,r=this.winnerAt(e),i=r>=0?n[r]:null,a=-1/0,o=null,s=0;if(i){a=i.t0,s=i.fade;let e=this.winnerAt(i.t0,r);e<0&&this.touch&&(e=this.winnerAt(i.t0-Hd,r)),o=e>=0?n[e]:null}let c=this.upper(e);for(let t=c;t>r;t--){let r=n[t],i=r.t0+r.dur;if(i<=e&&i>a&&e-i<r.fade&&(a=i,o=r,s=r.fade),r.t0<e-this.maxDur-30)break}let l=s>0?(e-a)/s:1;return l=l<0?0:l>1?1:l,t.from=l>=1?null:o,t.to=i,t.k=l*l*(3-2*l),t}},Kd=class{tail;withFade;items=[];maxLife=0;constructor(e,t=!1){this.tail=e,this.withFade=t}life(e){return e.dur+(this.withFade?e.fade:e.tail>=0?e.tail:this.tail)}push(e){this.items.push(e)}finish(){this.items.sort((e,t)=>e.t0-t.t0||e.cue.id-t.cue.id),this.maxLife=0;for(let e of this.items)this.maxLife=Math.max(this.maxLife,this.life(e))}alive(e,t){t.length=0;let n=this.items,r=0,i=n.length-1,a=-1;for(;r<=i;){let t=r+i>>1;n[t].t0<=e?(a=t,r=t+1):i=t-1}let o=a+1;for(let t=a;t>=0&&!(n[t].t0<e-this.maxLife);t--)o=t;for(let r=o;r<=a;r++){let i=n[r];e<i.t0+this.life(i)&&t.push(i)}return t}},qd=1.05/3,Jd=2.5;function Yd(e){return Math.max(1/e.rate,1/Jd)}function Xd(e){let t=60/Math.max(40,e.bpm),n=Math.max(1,e.every);for(;n*t<qd&&n<64;)n*=2;return n*t}var Zd=0,Qd=1,$d=2,ef=class{kept=new Float64Array;offered=0;dropped=0;tiers=[[],[],[]];clear(){for(let e of this.tiers)e.length=0}add(e,t){Number.isFinite(e)&&this.tiers[t].push(e)}build(){let e=[],t=[];this.offered=0,this.dropped=0;for(let n=0;n<this.tiers.length;n++){let r=this.tiers[n].sort((e,t)=>e-t);for(let i of r){this.offered++;let r=0,a=e.length;for(;r<a;){let t=r+a>>1;e[t]<i?r=t+1:a=t}let o=r>0?e[r-1]:-1/0,s=r<e.length?e[r]:1/0;n===Zd?(e.splice(r,0,i),t.push(i)):i-o<=.04||s-i<=.04?t.push(i):i-o>=qd&&s-i>=qd?(e.splice(r,0,i),t.push(i)):this.dropped++}}t.sort((e,t)=>e-t),this.kept=Float64Array.from(t)}ok(e){let t=this.kept,n=0,r=t.length;for(;n<r;){let i=n+r>>1;t[i]<e-1e-4?n=i+1:r=i}return n<t.length&&t[n]<=e+1e-4}},tf=1.1,nf=.2,rf=class{looks=[];wash=new Gd(!0);washSides=[new Gd(!0),new Gd(!0)];pillars=[];festoon=Array.from({length:8},()=>new Gd(!0));floods=new Kd(0,!0);storms=new Kd(0,!0);key=new Gd(!0);calmLooks=[];calmWash=new Gd(!0);calmWashSides=[];calmPillars=[];calmFestoon=[];hits=new Kd(0);chases=new Kd(0);blinders=new Kd(tf);strobes=new Kd(nf);calm=new ef;revision=-1;count=0;sig=NaN;rig=null;sync(e,t){let n=cf(e);(n!==this.sig||t!==this.rig)&&this.rebuild(e,t),this.sig=n,this.rig=t,this.revision=e.revision}rebuild(e,t){let n=t.classes;this.looks=n.map(()=>new Gd(!0)),this.wash.items.length=0;for(let e of this.washSides)e.items.length=0;this.pillars=t.pillars.map(()=>new Gd(!0));for(let e of this.festoon)e.items.length=0;this.floods.items.length=0,this.storms.items.length=0,this.key.items.length=0,this.hits.items.length=0,this.chases.items.length=0,this.blinders.items.length=0,this.strobes.items.length=0,this.count=0;for(let r of e.all(`lights`)){let i=Vd(r,e);switch(this.count++,r.fx){case`look`:for(let e=0;e<n.length;e++){let t=n[e];i.groups&1<<t.group&&Uu(i.target,t.tags,t.x)&&this.looks[e].push(i)}break;case`wash`:i.area&12?(i.area&4&&this.washSides[0].push(i),i.area&8&&this.washSides[1].push(i)):this.wash.push(i);break;case`pillars`:i.pmask=af(r,t);for(let e=0;e<this.pillars.length;e++)(!i.pmask||i.pmask[e])&&this.pillars[e].push(i);break;case`flood`:this.floods.push(i);break;case`storm`:this.storms.push(i);break;case`key`:this.key.push(i);break;case`festoon`:for(let e=0;e<this.festoon.length;e++)i.strings&1<<e&&this.festoon[e].push(i);break;case`hit`:i.mask=of(i.target,t),this.hits.push(i);break;case`chase`:i.mask=of(i.target,t),this.chases.push(i);break;case`blinder`:i.mask=sf(i.target,t),this.blinders.push(i);break;default:this.count--}}for(let n of e.all(`strobe`)){if(n.fx!==`hit`&&n.fx!==`burst`&&n.fx!==`kick`)continue;let r=Vd(n,e);r.mask=sf(r.target,t),this.strobes.push(r),this.count++}for(let e of this.looks)e.finish();this.wash.finish();for(let e of this.washSides)e.finish();for(let e of this.pillars)e.finish();for(let e of this.festoon)e.finish();this.floods.finish(),this.storms.finish(),this.key.finish(),this.hits.finish(),this.chases.finish(),this.blinders.finish(),this.strobes.finish(),this.buildCalm(e.tempo??null),this.calmLooks=this.looks.map(e=>e.calmCopy()),this.calmWash=this.wash.calmCopy(),this.calmWashSides=this.washSides.map(e=>e.calmCopy()),this.calmPillars=this.pillars.map(e=>e.calmCopy()),this.calmFestoon=this.festoon.map(e=>e.calmCopy()),this.revision=e.revision}buildCalm(e){let t=this.calm;t.clear();for(let e of this.blinders.items)t.add(e.t0,Zd);for(let e of this.hits.items)t.add(e.t0,Qd);for(let e of this.chases.items){let n=Xd(e);for(let r=0;r*n<e.dur&&r<4096;r++)t.add(e.t0+r*n,$d)}for(let n of this.strobes.items)if(n.cue.fx===`burst`){let e=Yd(n),r=Math.floor(Math.max(0,n.dur-.001)/e);for(let i=0;i<=r&&i<4096;i++)t.add(n.t0+i*e,i===0?Qd:$d)}else if(n.cue.fx===`kick`){if(!e)continue;let r=n.t0-.03;for(let i=0;i<4096;i++){let i=Math.ceil(e.beatAt(r)-1e-6),a=e.timeOfBeat(r,i);if(a>n.t0+n.dur)break;i&1||t.add(a,$d),r=a+.001}}else t.add(n.t0,Qd);t.build()}};function af(e,t){let n=e.p??{},r=e=>typeof e==`number`?[e]:Array.isArray(e)?e.filter(e=>typeof e==`number`):null,i=r(n.rows??n.row),a=r(n.index??n.pillars),o=e.targets.includes(`left`),s=e.targets.includes(`right`);if(!i&&!a&&o===s)return null;let c=new Uint8Array(t.pillars.length);return t.pillars.forEach((e,t)=>{let n=!0;i&&(n=i.includes(e.row)),a&&(n&&=a.includes(e.index)),o!==s&&(n&&=o?e.top.x<0:e.top.x>0),c[t]=+!!n}),c}function of(e,t){let n=new Uint8Array(t.fixtures.length);for(let r=0;r<n.length;r++){let i=t.fixtures[r];n[r]=+!!Uu(e,i.tags,i.pos.x)}return n}function sf(e,t){let n=new Uint8Array(t.emitters.length);for(let r=0;r<n.length;r++){let i=t.emitters[r];n[r]=+!!Uu(e,i.tags,i.pos.x)}return n}function cf(e){let t=17,n=e=>{for(let n=0;n<e.length;n++)t=Math.imul(t,31)+e.charCodeAt(n)|0};for(let r of[`lights`,`strobe`]){let i=e.all(r);t=Math.imul(t,31)+i.length|0;for(let r=0;r<i.length;r++){let a=i[r];t=Math.imul(t,31)+Math.round(a.t*1e3)|0,t=Math.imul(t,31)+Math.round(a.dur*1e3)|0,t=Math.imul(t,31)+a.seed|0,n(a.fx),n(a.targets.join(`,`)),n(JSON.stringify(a.p??null)),e.tempo&&(t=Math.imul(t,31)+Math.round(e.tempo.segmentAt(a.t).bpm*100)|0)}}return t}var lf={x0:7.2,x1:36.6,y:9.2,z:-11.62,pitch:1.45,sag:.22,span:4.4},uf={x0:40.5,x1:90.5,y:9.25,z:-3.62,pitch:1.35,sag:.75,span:8},df=e=>{let t=Math.imul(e+40503,2246822507);return t^=t>>>13,t=Math.imul(t,3266489909),t^=t>>>16,(t>>>0)/4294967296};function ff(e){let t=[],n=(e,n,r,i,a,o)=>t.push({pos:new u(e,n,r),str:i*2+(e<0?0:1),u:Math.min(1,Math.max(0,a)),seed:df(t.length*7+i),size:o}),r=e.get(`fixtures_truss`),i=[];if(!Yu(e,`fixtures_truss`)){let e=[];for(let t of r){if(bd(t)!==1){e.length&&i.push(e),e=[];continue}e.length&&t.distanceTo(e[e.length-1])>3&&(i.push(e),e=[]),e.push(t)}e.length&&i.push(e)}if(i.length)for(let e of i)for(let t=0;t<e.length;t++){let r=e[t];if(t+1<e.length){let i=e[t+1];n((r.x+i.x)/2,(r.y+i.y)/2-.9,(r.z+i.z)/2+.12,0,Math.abs(r.x+i.x)/84,.27)}}else{let t=e.get(`wing_tips`);for(let e of[-1,1]){let r=t.filter(t=>Math.sign(t.x)===e).sort((e,t)=>Math.abs(e.x)-Math.abs(t.x)),i=[new u(e*6.2,17.2,-16.6),...r.map(e=>new u(e.x,e.y-3.4,e.z))];for(let e=0;e+1<i.length;e++){let t=i[e],r=i[e+1],a=Math.max(3,Math.round(t.distanceTo(r)/.7));for(let e=0;e<a;e++){let i=(e+.5)/a,o=t.x+(r.x-t.x)*i;n(o,t.y+(r.y-t.y)*i-2.2*Math.sin(Math.PI*i),t.z+(r.z-t.z)*i+.3,0,Math.abs(o)/42,.2)}}}}let a=(e,t,r)=>{for(let i of[-1,1]){let a=Math.round((e.x1-e.x0)/e.pitch);for(let o=0;o<=a;o++){let s=e.x0+(e.x1-e.x0)*o/a,c=(s-e.x0)/e.span%1;n(i*s,e.y-e.sag*Math.sin(Math.PI*c),e.z,t,(s-e.x0)/(e.x1-e.x0),r)}}};a(lf,1,.15),a(uf,2,.17);for(let t of e.get(`tower_torches`))n(t.x,t.y+.4,t.z+.6,3,0,.8);return t}var pf=`
precision highp sampler3D;
uniform sampler3D tNoise;
uniform float uTime;
`,mf=`
uniform vec4 uLowFog;     // zone density: x deck, y near field, z far field; w = in-scatter gain
uniform vec3 uLowFogTint; // fog albedo (max 1)
float lowFogAt(vec3 p) {
  float zDeck = smoothstep(-21.0, -16.0, p.z) * (1.0 - smoothstep(-1.5, 1.5, p.z));
  float zNear = smoothstep(-1.5, 1.5, p.z) * (1.0 - smoothstep(40.0, 60.0, p.z));
  float zFar = smoothstep(28.0, 52.0, p.z) * (1.0 - smoothstep(140.0, 170.0, p.z));
  float top = mix(2.2, 3.2, zDeck);
  float v = 1.0 - smoothstep(top - 1.2, top + 0.9, p.y);
  float w = 1.0 - smoothstep(36.0, 50.0, abs(p.x));
  return (uLowFog.x * zDeck + max(uLowFog.y * zNear, uLowFog.z * zFar)) * v * w;
}
`,hf=`
attribute vec4 iPos;   // xyz lens position, w = lens radius (m)
attribute vec4 iDir;   // xyz unit direction, w = beam length (m)
attribute vec4 iCol;   // rgb (linear, x dimmer), w = tan(half angle)
attribute vec4 iMisc;  // x seed, y = 0 ends in the air, else floor height at the hit + 1, z gobo
uniform float uPixelAngle;
uniform float uSoft;   // 0 clear air .. 1 storm haze: beams bloom into wide soft shafts
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vAxis;
varying vec3 vCol;
varying vec4 vData;    // along, length, radius, energy
varying vec4 vLocal;   // circle xy, seed, ground end
varying float vGobo;
varying float vNearBeam;

void main() {
  vec3 d = iDir.xyz;
  float L = iDir.w;
  // a lens right next to (or inside) a beam near its fixture — standing on the podium under the arch
  // downlights, beside a deck head — sees no crisp cone but a diffuse glow: the ruled cone surface would
  // fill the frame as a flat grey slab. Fade the volume while the camera is within a few metres of the
  // cone, close to the lens (a beam aimed at the camera from the stage keeps its flare disc)
  vec3 cr = cameraPosition - iPos.xyz;
  float aC = dot(cr, d);
  float rC = iPos.w + max(aC, 0.0) * iCol.w;
  float dPerp = length(cr - d * aC);
  float inReach = step(-1.0, aC) * step(aC, L);
  vNearBeam = 1.0 - inReach * (1.0 - smoothstep(rC + 0.3, rC + 4.0, dPerp)) * (1.0 - smoothstep(10.0, 25.0, aC));
  vec3 up = abs(d.y) < 0.98 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t1 = normalize(cross(up, d));
  vec3 t2 = cross(t1, d);
  float along = position.y * L;
  float r = iPos.w + along * iCol.w;
  vec3 axisP = iPos.xyz + d * along;
  // keep far / thin beams at least ~1.7 px wide (no shimmering), energy conserved below
  float dist = length(axisP - cameraPosition);
  // in dense haze the multiple scattering spreads every beam into a soft glowing shaft
  float rDraw = max(r * (1.0 + uSoft * 2.2) + uSoft * 0.25, dist * uPixelAngle * 0.85);
  vec3 radial = t1 * position.x + t2 * position.z;
  vec3 wp = axisP + radial * rDraw;
  vWorld = wp;
  vNormal = radial - d * iCol.w;
  vAxis = d;
  vCol = iCol.rgb;
  vData = vec4(along, L, r, r / rDraw);
  vLocal = vec4(position.x, position.z, iMisc.x, iMisc.y);
  vGobo = iMisc.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,gf=`
${pf}
${mf}
uniform float uHaze;
uniform float uNoise;
uniform float uGain;
uniform float uExtinct;
uniform float uSoft;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vAxis;
varying vec3 vCol;
varying vec4 vData;
varying vec4 vLocal;
varying float vGobo;
varying float vNearBeam;

void main() {
  vec3 V = cameraPosition - vWorld;
  float camDist = length(V);
  V /= camDist;
  float ndv = abs(dot(normalize(vNormal), V));
  float cosT = dot(vAxis, V);
  // optical depth through the cone ~ chord / sin^2(view angle) (capped when looking down the beam)
  float sin2 = max(1.0 - cosT * cosT, 0.03);
  // gaussian beam profile across the cone (b/r)^2 ~ 1 - ndv^2: crisp core, soft glowing edge
  float q2 = 1.0 - ndv * ndv;
  float prof = mix(exp(-3.2 * q2) + 0.45 * exp(-14.0 * q2) * vData.w, exp(-1.6 * q2) * 0.75 + 0.35 * exp(-9.0 * q2) * vData.w, uSoft);
  float chord = min(prof / sin2, 3.0);
  // Henyey-Greenstein forward scattering (haze), normalised to 1 at 90 degrees
  const float g = 0.32;
  float hg = pow(1.0 + g * g, 1.5) / pow(1.0 + g * g - 2.0 * g * cosT, 1.5);
  float along = vData.x;
  float L = vData.y;
  float r = vData.z;
  // power spreads over the widening cross section; brighter near the lens
  float spreadF = 0.3 / (r + 0.1) + 0.008 + exp(-along * 0.6) * 0.9 + exp(-along * 0.07) * 0.3;
  float atten = exp(-along * uExtinct);
  // ends in the air: soft fade; ends on the ground: soft intersection with the floor
  float grounded = step(0.5, vLocal.w);
  float tail = mix(1.0 - smoothstep(L * 0.6, L, along), 1.0, grounded);
  float gy = grounded * (vLocal.w - 1.0);
  // low fog: the beam lights the bank where it passes through it (v802.75: white floor beams turn the smoke
  // on the field into a bright white band); in the bank the beam also runs down into the fog to its pool
  float lf = uLowFog.w > 0.0 ? lowFogAt(vWorld) : 0.0;
  float ground = smoothstep(gy, gy + mix(2.2, 0.5, min(lf, 1.0)), vWorld.y);
  float nearF = smoothstep(0.5, 9.0, camDist);
  // haze is densest near the ground / stage and thins out with altitude
  float haze = uHaze * (0.03 + 0.97 * exp(-max(vWorld.y - 6.0, 0.0) * 0.058));
#ifdef USE_NOISE
  vec3 q = vWorld * 0.026 + vec3(uTime * 0.018, uTime * 0.005, -uTime * 0.011);
  float nz = texture(tNoise, q).r * 0.6 + texture(tNoise, q * 2.9 + 0.31).r * 0.4;
  haze *= mix(1.0, smoothstep(0.18, 0.82, nz) * 1.75 + 0.12, uNoise);
  // lengthwise striations (gobo / lens breakup), drifting slowly
  float st = texture(tNoise, vec3(vLocal.xy * 0.42 + vLocal.z * 5.0, along * 0.005 - uTime * 0.017)).r;
  haze *= 0.5 + st;
  // gobo: the beam breaks up into rays (the projected dot pattern seen in the haze)
  if (vGobo > 0.5) {
    float rays = texture(tNoise, vec3(vLocal.xy * 1.6 + vLocal.z * 3.0, along * 0.0015)).r;
    haze *= smoothstep(0.42, 0.62, rays) * 2.4;
  }
#endif
  // the beam emerges from the lens glow instead of starting with a hard cut
  float start = smoothstep(0.0, 0.8, along);
  float k = chord * hg * spreadF * atten * tail * ground * nearF * vNearBeam * haze * start * vData.w * uGain;
  // (the fog's share scatters in the beam colour x the smoke's albedo)
  gl_FragColor = vec4(vCol * k * (vec3(1.0) + uLowFogTint * (lf * uLowFog.w)), 1.0);
}
`,_f=`
attribute vec4 iCenter; // xyz centre, w = semi-major axis (m)
attribute vec4 iAxis;   // xy = major axis direction on the ground (x,z), z = semi-minor (m), w = seed
attribute vec4 iCol;    // rgb, w = sharpness 0..1
varying vec2 vUv;
varying vec4 vCol;
varying float vSeed;
void main() {
  vec2 ax = iAxis.xy;
  vec2 pe = vec2(-ax.y, ax.x);
  vec2 p = ax * position.x * iCenter.w + pe * position.y * iAxis.z;
  vec3 wp = vec3(iCenter.x + p.x, iCenter.y, iCenter.z + p.y);
  vUv = position.xy;
  vCol = iCol;
  vSeed = iAxis.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,vf=`
${pf}
varying vec2 vUv;
varying vec4 vCol;
varying float vSeed;
void main() {
  // uv spans 2.2x the geometric footprint: sharp-ish spot + haze/bounce halo around it
  float d = length(vUv);
  float edge = mix(0.6, 0.92, vCol.w > 1.5 ? vCol.w - 2.0 : vCol.w);
  float spot = 1.0 - smoothstep(edge, 1.06, d);
  float core = exp(-d * d * 2.4);
  float halo = exp(-max(d - 0.8, 0.0) * 2.2) * (1.0 - smoothstep(1.7, 2.2, d));
  float v = spot * (0.5 + 0.5 * core) + halo * 0.07;
  if (vCol.w > 1.5) {
    // gobo 'dots': a slowly turning field of small sharp spots inside the beam footprint (glitter gobo)
    float ang = uTime * 0.35 + vSeed * 6.2831;
    vec2 q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * vUv * 3.4;
    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;
    float h = fract(sin(dot(id, vec2(127.1, 311.7)) + vSeed * 13.0) * 43758.5453);
    vec2 o = vec2(h, fract(h * 17.31)) - 0.5;
    float dots = smoothstep(0.2, 0.09, length(f - o * 0.45)) * step(0.22, h);
    v = (1.0 - smoothstep(0.9, 1.35, d)) * dots * 2.6 + halo * 0.05;
  }
#ifdef USE_NOISE
  float n = texture(tNoise, vec3(vUv * 0.28 + vSeed, uTime * 0.03)).r;
  v *= 0.7 + 0.6 * n;
#endif
  gl_FragColor = vec4(vCol.rgb * v, 1.0);
}
`,yf=`
attribute vec4 iPos;  // xyz, w = type
attribute vec4 iDir;  // xyz facing direction, w = beam half angle (rad) or two-sided flag
attribute vec4 iCol;  // rgb (linear x intensity), w = size (m)
uniform float uPixelAngle;
uniform float uMinPx;
uniform float uFlarePx;
varying vec2 vUv;
varying vec3 vCol;
varying float vType;
varying float vHot;
void main() {
  vec3 toCam = cameraPosition - iPos.xyz;
  float dist = length(toCam);
  toCam /= max(dist, 1e-3);
  float facing = dot(iDir.xyz, toCam);
  float type = iPos.w;
  float size = iCol.w;
  float glow;
  float hot = 0.0;
  float px = dist * uPixelAngle;
  if (type < 0.5) {
    float ang = acos(clamp(facing, -1.0, 1.0));
    hot = exp(-pow(ang / (iDir.w * 1.35 + 0.004), 2.0));
    glow = 0.07 * smoothstep(-0.1, 0.95, facing) + 0.02 + 1.4 * hot;
    // a lens flare is an optical artefact: its size lives in screen space
    size = max(size, px * (uMinPx + hot * uFlarePx));
  } else if (type < 1.5) {
    glow = pow(max(facing, 0.0), 1.3) * 0.94 + 0.06;
  } else if (type < 2.5) {
    float f = iDir.w > 0.5 ? abs(facing) : facing;
    glow = max(f, 0.0) * 0.72 + 0.28;
  } else {
    // festoon bulb / practical lamp: radiates all round, a little brighter towards its front; it stays a
    // readable dot from the far field (min ~1.6x the lens minimum)
    glow = 0.8 + 0.2 * max(facing, 0.0);
    size = max(size, px * uMinPx * 1.25);
  }
  size = max(size, px * uMinPx);
  // blinder: how many pixels its face spans (1 = close enough to resolve the 2x2 lamps, 0 = one round glare);
  // the lens flare passes its hot-spot level in the same varying
  float detail = type > 0.5 && type < 1.5 ? smoothstep(14.0, 44.0, size / max(px, 1e-6)) : hot;
  vec4 mv = viewMatrix * vec4(iPos.xyz, 1.0);
  // the glare lives in the lens/eye: pull it towards the viewer so its own housing does not clip it
  mv.xyz += normalize(-mv.xyz) * min(size * 0.8, 3.0);
  mv.xy += position.xy * size;
  vUv = position.xy;
  vCol = iCol.rgb * glow;
  vType = type;
  vHot = detail;
  gl_Position = projectionMatrix * mv;
  // standing in the beam means a clear line of sight to the lens: the glare is not occluded by
  // the floor / set around the fixture (it lives in the viewer's optics)
  float bypass = smoothstep(0.12, 0.45, hot);
  gl_Position.z = mix(gl_Position.z, -gl_Position.w * 0.9999, bypass);
}
`,bf=`
varying vec2 vUv;
varying vec3 vCol;
varying float vType;
varying float vHot;
void main() {
  vec2 p = vUv;
  float r2 = dot(p, p);
  float v;
  if (vType < 0.5) {
    float r = sqrt(r2);
    // when hot the quad is large: keep the lens core small, spread glare / streaks wide
    float h = vHot;
    float core = exp(-r2 * mix(30.0, 420.0, h));
    float halo = exp(-r * mix(5.5, 8.0, h)) * mix(0.2, 0.28, h);
    float star = (exp(-abs(p.y) * 160.0) * exp(-abs(p.x) * 3.2) + exp(-abs(p.x) * 160.0) * exp(-abs(p.y) * 3.2)) * h;
    vec2 pr = vec2(p.x + p.y, p.x - p.y) * 0.7071;
    float star2 = (exp(-abs(pr.y) * 220.0) * exp(-abs(pr.x) * 5.0) + exp(-abs(pr.x) * 220.0) * exp(-abs(pr.y) * 5.0)) * h * 0.35;
    float streak = exp(-abs(p.y) * 70.0) * exp(-abs(p.x) * 1.6) * h * 0.3;
    v = core * mix(3.2, 14.0, h) + halo + star * 0.7 + star2 + streak;
  } else if (vType > 2.5) {
    // bulb: small hot filament core, soft round glass glow, faint wide halo
    float r = sqrt(r2);
    v = exp(-r2 * 30.0) * 2.6 + exp(-r * 7.0) * 0.09;
  } else if (vType < 1.5) {
    // 2x2 tungsten "molefay": four hot lamps close up; from the field (a face of a few pixels) the lamps merge
    // into one round glare blooming in the haze (v1224.5 / v1283: round glows in the smoke, never a row of
    // lit squares) — plus the wide glare halo
    vec2 q = abs(p) - vec2(0.13);
    float lamps = exp(-dot(q, q) * 380.0) * 4.0 + exp(-r2 * 60.0) * 0.8;
    float r = sqrt(r2);
    v = mix(exp(-r2 * 22.0) * 1.9, lamps, vHot) + exp(-r * 4.2) * 0.34;
  } else {
    // LED strobe bar + glare halo and a faint horizontal streak
    float bar = exp(-pow(abs(p.x) / 0.24, 6.0) - pow(abs(p.y) / 0.05, 4.0));
    float r = sqrt(r2);
    v = bar * 4.0 + exp(-r * 4.0) * 0.32 + exp(-abs(p.y) * 60.0) * exp(-abs(p.x) * 3.0) * 0.25;
  }
  // quad edge: the lens flare's star streaks run to the square's edge; every other glare fades out ROUND
  // (a square window left the halos of a blinder / strobe row as a row of lit squares at a distance)
  v *= vType < 0.5 ? 1.0 - smoothstep(0.82, 1.0, max(abs(p.x), abs(p.y))) : 1.0 - smoothstep(0.55, 1.0, sqrt(r2));
  gl_FragColor = vec4(vCol * v, 1.0);
}
`,xf=`
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,Sf=`
attribute vec2 aSlice;  // view depth of the slice / of the next slice (m)
uniform vec2 uTan;      // tan(half fov) x (aspect, 1), with a margin
uniform float uNearEdge; // the pre-slice (only the local blobs glow in it) ends here
varying vec3 vView;
varying float vRatio;
varying float vPre;
void main() {
  float d = aSlice.x;
  vec3 vp = vec3(position.xy * uTan * d, -d);
  vView = vp;
  vRatio = aSlice.y / aSlice.x;
  vPre = aSlice.y <= uNearEdge ? 1.0 : 0.0;
  gl_Position = projectionMatrix * vec4(vp, 1.0);
}
`,Cf=`
uniform vec4 uBlobC[12];   // centre xyz, w = weight (12 = FLOOD_BLOBS in layers.ts)
uniform vec3 uBlobS[12];   // sigma (m) per axis
uniform vec3 uBlobCol[12]; // colour x intensity (0 = slot off)
uniform float uBlobNear[12]; // share of the blob in the near pre-slice (lamps aimed at the lens)
uniform float uScale;     // camera haze scale (telephoto show shots see less haze)
varying vec3 vView;
varying float vRatio;
varying float vPre;

float erfA(float x) {
  float s = sign(x);
  x = abs(x);
  float t = 1.0 / (1.0 + 0.3275911 * x);
  float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x);
  return s * y;
}

void main() {
  float t0 = length(vView);
  float t1 = t0 * vRatio;
  // view ray -> world (the view rotation is orthonormal: inverse = transpose)
  vec3 rd = (vView / t0) * mat3(viewMatrix);
  vec3 ro = cameraPosition;
  // the ground ends every ray that points down (terrain ~ flat around the field)
  if (rd.y < -1e-3) t1 = min(t1, max(ro.y + 0.5, 0.0) / -rd.y);
  if (t1 <= t0) discard;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    vec3 col = uBlobCol[i] * (vPre > 0.5 ? uBlobNear[i] : 1.0);
    if (col.r + col.g + col.b <= 0.0) continue;
    vec3 s = uBlobS[i];
    vec3 o = (ro - uBlobC[i].xyz) / s;
    vec3 d = rd / s;
    float a = dot(d, d);
    float b = dot(o, d);
    float c = dot(o, o);
    float sa = sqrt(a);
    float m = b / a;
    float e = c - b * m;
    if (e > 12.0) continue;
    float I = exp(-e) * 0.8862269 / sa * (erfA(sa * (t1 + m)) - erfA(sa * (t0 + m)));
    acc += col * (I * uBlobC[i].w);
  }
  gl_FragColor = vec4(acc * uScale, 1.0);
}
`,wf=`
uniform vec4 uBlobC[4];   // centre xyz, w = weight
uniform vec3 uBlobS[4];   // sigma (m) per axis
uniform vec3 uBlobCol[4]; // colour x intensity
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform float uScale;
varying vec3 vWorld;

float erfA(float x) {
  // Abramowitz & Stegun 7.1.26
  float s = sign(x);
  x = abs(x);
  float t = 1.0 / (1.0 + 0.3275911 * x);
  float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x);
  return s * y;
}

void main() {
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorld - ro);
  // ray / box
  vec3 inv = 1.0 / rd;
  vec3 ta = (uBoxMin - ro) * inv;
  vec3 tb = (uBoxMax - ro) * inv;
  vec3 tmin = min(ta, tb);
  vec3 tmax = max(ta, tb);
  float t0 = max(max(max(tmin.x, tmin.y), tmin.z), 0.0);
  float t1 = min(min(tmax.x, tmax.y), tmax.z);
  if (t1 <= t0) discard;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 s = uBlobS[i];
    vec3 o = (ro - uBlobC[i].xyz) / s;
    vec3 d = rd / s;
    float a = dot(d, d);
    float b = dot(o, d);
    float c = dot(o, o);
    float sa = sqrt(a);
    float m = b / a;
    float I = exp(-(c - b * m)) * 0.8862269 / sa * (erfA(sa * (t1 + m)) - erfA(sa * (t0 + m)));
    acc += uBlobCol[i] * (I * uBlobC[i].w);
  }
  gl_FragColor = vec4(acc * uScale, 1.0);
}
`;function Tf(e=32){let t=new Uint8Array(e*e*e),n=(e,t)=>{let n=new Float32Array(e*e*e),r=t>>>0;for(let e=0;e<n.length;e++){r=r+1831565813>>>0;let t=r;t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),n[e]=((t^t>>>14)>>>0)/4294967296}return n},r=(e,t,n,r,i)=>{let a=Math.floor(n),o=Math.floor(r),s=Math.floor(i),c=n-a,l=r-o,u=i-s,d=c*c*(3-2*c),f=l*l*(3-2*l),p=u*u*(3-2*u),m=(n,r,i)=>e[(i%t+t)%t*t*t+(r%t+t)%t*t+(n%t+t)%t],h=(e,t,n)=>e+(t-e)*n;return h(h(h(m(a,o,s),m(a+1,o,s),d),h(m(a,o+1,s),m(a+1,o+1,s),d),f),h(h(m(a,o,s+1),m(a+1,o,s+1),d),h(m(a,o+1,s+1),m(a+1,o+1,s+1),d),f),p)},i=n(4,20973),a=n(8,10911),o=n(16,30659),s=0,c=1,l=0,u=new Float32Array(t.length);for(let t=0;t<e;t++)for(let n=0;n<e;n++)for(let d=0;d<e;d++){let f=r(i,4,d*4/e,n*4/e,t*4/e)*.5+r(a,8,d*8/e,n*8/e,t*8/e)*.32+r(o,16,d*16/e,n*16/e,t*16/e)*.18;u[s++]=f,c=Math.min(c,f),l=Math.max(l,f)}for(let e=0;e<u.length;e++)t[e]=Math.round((u[e]-c)/(l-c)*255);let d=new ve(t,e,e,e);return d.format=ge,d.type=g,d.minFilter=de,d.magFilter=de,d.wrapS=d.wrapT=d.wrapR=be,d.unpackAlignment=1,d.needsUpdate=!0,d}function Ef(e,t,n){let r=new x(new Float32Array(n*4),4);return r.setUsage(o),e.setAttribute(t,r),r}var Df=class{mesh;material;geo;aPos;aDir;aCol;aMisc;cap=0;count=0;constructor(t){this.material=new C({name:`LightBeams`,vertexShader:hf,fragmentShader:gf,uniforms:{...t,uHaze:{value:.6},uNoise:{value:1},uGain:{value:1},uExtinct:{value:.035},uSoft:{value:0}},transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:1,fog:!1,toneMapped:!1}),this.mesh=new e(new M,this.material),this.mesh.frustumCulled=!1,this.mesh.renderOrder=10,this.mesh.name=`LightBeams`}build(e,t){this.geo?.dispose();let n=[0,.015,.045,.1,.19,.32,.5,.74,1],r=[],i=[];for(let e=0;e<n.length;e++)for(let i=0;i<=t;i++){let a=i/t*Math.PI*2;r.push(Math.cos(a),n[e],Math.sin(a))}let a=t+1;for(let e=0;e<n.length-1;e++)for(let n=0;n<t;n++){let t=e*a+n,r=t+1,o=t+a,s=o+1;i.push(t,o,r,r,o,s)}let o=new xe;o.setAttribute(`position`,new P(r,3)),o.setIndex(i),this.aPos=Ef(o,`iPos`,e),this.aDir=Ef(o,`iDir`,e),this.aCol=Ef(o,`iCol`,e),this.aMisc=Ef(o,`iMisc`,e),o.instanceCount=0,this.geo=o,this.mesh.geometry=o,this.cap=e}begin(){this.count=0}push(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m=0){if(this.count>=this.cap)return;let h=this.count*4,g=this.aPos.array,_=this.aDir.array,v=this.aCol.array,y=this.aMisc.array;g[h]=e,g[h+1]=t,g[h+2]=n,g[h+3]=r,_[h]=i,_[h+1]=a,_[h+2]=o,_[h+3]=s,v[h]=c,v[h+1]=l,v[h+2]=u,v[h+3]=d,y[h]=f,y[h+1]=p,y[h+2]=m,this.count++}end(){this.geo.instanceCount=this.count,this.count>0&&(this.aPos.needsUpdate=!0,this.aDir.needsUpdate=!0,this.aCol.needsUpdate=!0,this.aMisc.needsUpdate=!0),this.mesh.visible=this.count>0}dispose(){this.geo?.dispose(),this.material.dispose()}},Of=class{mesh;material;geo;aCenter;aAxis;aCol;cap=0;count=0;constructor(t){this.material=new C({name:`LightPools`,vertexShader:_f,fragmentShader:vf,uniforms:{...t},transparent:!0,depthWrite:!1,depthTest:!0,blending:2,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-8,fog:!1,toneMapped:!1}),this.mesh=new e(new M,this.material),this.mesh.frustumCulled=!1,this.mesh.renderOrder=9,this.mesh.name=`LightPools`}build(e){this.geo?.dispose();let t=new xe,n=2.2;t.setAttribute(`position`,new P([-2.2,-2.2,0,n,-2.2,0,n,n,0,-2.2,n,0],3)),t.setIndex([0,2,1,0,3,2]),this.aCenter=Ef(t,`iCenter`,e),this.aAxis=Ef(t,`iAxis`,e),this.aCol=Ef(t,`iCol`,e),t.instanceCount=0,this.geo=t,this.mesh.geometry=t,this.cap=e}begin(){this.count=0}push(e,t,n,r,i,a,o,s,c,l,u,d){if(this.count>=this.cap)return;let f=this.count*4,p=this.aCenter.array,m=this.aAxis.array,h=this.aCol.array;p[f]=e,p[f+1]=t,p[f+2]=n,p[f+3]=r,m[f]=i,m[f+1]=a,m[f+2]=o,m[f+3]=s,h[f]=c,h[f+1]=l,h[f+2]=u,h[f+3]=d,this.count++}end(){this.geo.instanceCount=this.count,this.count>0&&(this.aCenter.needsUpdate=!0,this.aAxis.needsUpdate=!0,this.aCol.needsUpdate=!0),this.mesh.visible=this.count>0}dispose(){this.geo?.dispose(),this.material.dispose()}},kf=class{mesh;material;geo;aPos;aDir;aCol;cap=0;count=0;constructor(t){this.material=new C({name:`LightSprites`,vertexShader:yf,fragmentShader:bf,uniforms:{uPixelAngle:t.uPixelAngle,uMinPx:{value:3},uFlarePx:{value:110}},transparent:!0,depthWrite:!1,depthTest:!0,blending:2,fog:!1,toneMapped:!1}),this.mesh=new e(new M,this.material),this.mesh.frustumCulled=!1,this.mesh.renderOrder=11,this.mesh.name=`LightSprites`}build(e){this.geo?.dispose();let t=new xe;t.setAttribute(`position`,new P([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3)),t.setIndex([0,1,2,0,2,3]),this.aPos=Ef(t,`iPos`,e),this.aDir=Ef(t,`iDir`,e),this.aCol=Ef(t,`iCol`,e),t.instanceCount=0,this.geo=t,this.mesh.geometry=t,this.cap=e}begin(){this.count=0}push(e,t,n,r,i,a,o,s,c,l,u,d){if(this.count>=this.cap)return;let f=this.count*4,p=this.aPos.array,m=this.aDir.array,h=this.aCol.array;p[f]=t,p[f+1]=n,p[f+2]=r,p[f+3]=e,m[f]=i,m[f+1]=a,m[f+2]=o,m[f+3]=s,h[f]=c,h[f+1]=l,h[f+2]=u,h[f+3]=d,this.count++}end(){this.geo.instanceCount=this.count,this.count>0&&(this.aPos.needsUpdate=!0,this.aDir.needsUpdate=!0,this.aCol.needsUpdate=!0),this.mesh.visible=this.count>0}dispose(){this.geo?.dispose(),this.material.dispose()}},Af=class{group=new y;yokes=null;heads=null;housings=null;mat;lensMat;yokeGeo;headGeo;boxGeo;constructor(){this.group.name=`FixtureBodies`,this.mat=new le({color:1447706,metalness:.55,roughness:.42}),this.lensMat=new le({color:658189,metalness:.2,roughness:.35,emissive:0});let e=new me(.46,.14,.36).translate(0,-.33,0),t=new me(.06,.4,.14).translate(-.24,-.12,0),n=new me(.06,.4,.14).translate(.24,-.12,0);this.yokeGeo=pe([e,t,n]);let r=new A(.17,.2,.44,12).rotateX(Math.PI/2).translate(0,0,-.02),i=new A(.19,.19,.05,12).rotateX(Math.PI/2).translate(0,0,.22);this.headGeo=pe([r,i]),this.boxGeo=new me(1,1,1)}build(e,t){for(let e of[this.yokes,this.heads,this.housings])e&&this.group.remove(e);this.yokes?.dispose(),this.heads?.dispose(),this.housings?.dispose(),this.yokes=new T(this.yokeGeo,this.mat,Math.max(1,e)),this.heads=new T(this.headGeo,this.mat,Math.max(1,e)),this.housings=new T(this.boxGeo,this.lensMat,Math.max(1,t.length));for(let t of[this.yokes,this.heads])t.instanceMatrix.setUsage(o),t.count=e,t.frustumCulled=!1;t.forEach((e,t)=>this.housings.setMatrixAt(t,e)),this.housings.count=t.length,this.housings.instanceMatrix.needsUpdate=!0,this.housings.computeBoundingSphere(),this.yokes.name=`MovingHeadYokes`,this.heads.name=`MovingHeadHeads`,this.housings.name=`StrobeBlinderHousings`,this.group.add(this.yokes,this.heads,this.housings)}m=new b;bx=new u;by=new u;bz=new u;setHead(e,t,n,r,i,a,o,s,c,l){let u=this.m,d=a,f=s,p=Math.hypot(d,f);p<.001&&(d=c,f=l,p=Math.hypot(d,f)||1),d/=p,f/=p,this.by.set(0,i,0),this.bz.set(d,0,f),this.bx.crossVectors(this.by,this.bz),u.makeBasis(this.bx,this.by,this.bz),u.setPosition(t,n,r),this.yokes.setMatrixAt(e,u),this.bz.set(a,o,s),this.bx.set(f,0,-d).multiplyScalar(i),this.by.crossVectors(this.bz,this.bx),u.makeBasis(this.bx,this.by,this.bz),u.setPosition(t,n,r),this.heads.setMatrixAt(e,u)}hide(e){this.m.makeScale(0,0,0),this.yokes.setMatrixAt(e,this.m),this.heads.setMatrixAt(e,this.m)}commit(){this.yokes&&(this.yokes.instanceMatrix.needsUpdate=!0),this.heads&&(this.heads.instanceMatrix.needsUpdate=!0)}dispose(){this.yokes?.dispose(),this.heads?.dispose(),this.housings?.dispose(),this.yokeGeo.dispose(),this.headGeo.dispose(),this.boxGeo.dispose(),this.mat.dispose(),this.lensMat.dispose()}},jf=class{group=new y;mesh;inner;material;innerMaterial;min=new u(-135,-1,-42);max=new u(135,58,64);cols;constructor(){let t=(e,t,n,r)=>new p(e,t,n,r),n=(e,t,n)=>new u(e,t,n);this.cols=[n(0,0,0),n(0,0,0),n(0,0,0),n(0,0,0)];let r={uBlobC:{value:[t(0,11,-6,1),t(-44,10,-8,.7),t(44,10,-8,.7),t(0,3.5,8,.1)]},uBlobS:{value:[n(27,9.5,9),n(20,8.5,9),n(20,8.5,9),n(60,4,12)]},uBlobCol:{value:this.cols},uBoxMin:{value:this.min},uBoxMax:{value:this.max},uScale:{value:1}},i=e=>new C({name:e?`WashGlowInside`:`WashGlow`,vertexShader:xf,fragmentShader:wf,uniforms:r,transparent:!0,depthWrite:!1,depthTest:!e,blending:2,side:+!!e,fog:!1,toneMapped:!1});this.material=i(!1),this.innerMaterial=i(!0);let a=new u().subVectors(this.max,this.min),o=new me(a.x,a.y,a.z).translate((this.min.x+this.max.x)/2,(this.min.y+this.max.y)/2,(this.min.z+this.max.z)/2);this.mesh=new e(o,this.material),this.inner=new e(o,this.innerMaterial);for(let e of[this.mesh,this.inner])e.frustumCulled=!1,e.renderOrder=8;this.mesh.name=`WashGlow`,this.inner.name=`WashGlowInside`,this.inner.visible=!1,this.group.name=`WashGlow`,this.group.add(this.mesh,this.inner)}update(e,t,n,r,i,a){let o=e.x>this.min.x&&e.x<this.max.x&&e.y>this.min.y&&e.y<this.max.y&&e.z>this.min.z&&e.z<this.max.z,s=n*a;for(let e=0;e<3;e++)this.cols[e].set(t.r*s,t.g*s,t.b*s);let c=i*a;this.cols[3].set(r.r*c,r.g*c,r.b*c);let l=!1;for(let e=0;e<4&&!l;e++)l=this.cols[e].x+this.cols[e].y+this.cols[e].z>1e-4;this.mesh.visible=l&&!o,this.inner.visible=l&&o}dispose(){this.mesh.geometry.dispose(),this.material.dispose(),this.innerMaterial.dispose()}},Mf=[1.2,3.2],Nf=[0,0,0,0,0,0,1,.6,1,1,0,1],Pf=class{mesh;material;geo=null;cols=[];tan=new s(1,1);slices=0;constructor(){let t=(e,t,n,r)=>new p(e,t,n,r),n=(e,t,n)=>new u(e,t,n);for(let e=0;e<12;e++)this.cols.push(n(0,0,0));let r=[],i=[];r[0]=t(0,12,-8,1),i[0]=n(46,15,20),r[1]=t(0,30,-18,.28),i[1]=n(80,22,34),r[2]=t(-64,6,-1,.9),i[2]=n(26,7,10),r[3]=t(64,6,-1,.9),i[3]=n(26,7,10),r[4]=t(0,4,20,1.2),i[4]=n(72,12,28),r[5]=t(0,3,95,.4),i[5]=n(95,10,60),r[6]=t(0,5.2,-7.2,1),i[6]=n(2.8,1.8,2.2),r[8]=t(0,3.6,-5.2,.25),i[8]=n(8,3.5,4.5),r[9]=t(0,3.4,-4.5,1),i[9]=n(18,3.2,8),r[7]=t(0,3.2,-4,1),i[7]=n(3.5,2.5,3.5),r[10]=t(0,1,14,1),i[10]=n(30,1.4,14),r[11]=t(0,2,10,1),i[11]=n(2,2,2),this.material=new C({name:`FloodGlow`,vertexShader:Sf,fragmentShader:Cf,uniforms:{uBlobC:{value:r},uBlobS:{value:i},uBlobCol:{value:this.cols},uBlobNear:{value:Nf},uNearEdge:{value:4},uTan:{value:this.tan},uScale:{value:1}},transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:0,fog:!1,toneMapped:!1}),this.mesh=new e(new M,this.material),this.mesh.frustumCulled=!1,this.mesh.renderOrder=7,this.mesh.name=`FloodGlow`,this.mesh.visible=!1}build(e,t=4,n=620){this.geo?.dispose();let r=new he(2,2),i=new xe;i.index=r.index,i.setAttribute(`position`,r.getAttribute(`position`));let a=Mf.length,o=new Float32Array((e+a)*2);for(let r=0;r<e;r++)o[r*2]=t*(n/t)**+(r/e),o[r*2+1]=t*(n/t)**+((r+1)/e);for(let n=0;n<a;n++)o[(e+n)*2]=Mf[n],o[(e+n)*2+1]=n+1<a?Mf[n+1]:t;i.setAttribute(`aSlice`,new x(o,2)),i.instanceCount=e,this.material.uniforms.uNearEdge.value=t*.999,this.geo=i,this.mesh.geometry=i,this.slices=e}update(){let e=!1;for(let t=0;t<12&&!e;t++)e=this.cols[t].x+this.cols[t].y+this.cols[t].z>1e-4;this.mesh.visible=e&&this.slices>0,this.syncSlices()}syncSlices(){if(!this.geo)return;let e=!1;for(let t=0;t<12&&!e;t++)e=Nf[t]>0&&this.cols[t].x+this.cols[t].y+this.cols[t].z>1e-4;this.geo.instanceCount=this.slices+(e?Mf.length:0)}fit(e){let t=e.projectionMatrix.elements,n=Math.abs(t[0])>1e-6?(1+Math.abs(t[8]))/Math.abs(t[0]):1,r=Math.abs(t[5])>1e-6?(1+Math.abs(t[9]))/Math.abs(t[5]):1;this.tan.set(n*1.06,r*1.06)}dispose(){this.geo?.dispose(),this.material.dispose()}},Ff=[0,Pu,961|ju|Nu|32,833|Nu|ju|48,Pu,61|ju|Nu|512,965|ju,833|ju|Nu|16,ju|1001,Pu,Pu,Pu,877|ju|Nu],If=325,Lf=[1,1,.5,1,1,.5,.5,1,.5,.5,1,.5,1],Rf=Math.PI*2,zf=Math.PI/180;function Bf(e,t){let n=Math.imul(e,374761393)+Math.imul(t,668265263)|0;return n^=n>>>15,n=Math.imul(n,739982445),n^=n>>>12,n=Math.imul(n,695872825),n^=n>>>15,(n>>>0)/4294967296*2-1}function Vf(e,t){let n=Math.floor(e),r=e-n,i=r*r*(3-2*r),a=Bf(n,t);return a+(Bf(n+1,t)-a)*i}function Hf(e,t,n,r){let i=t*zf,a=n*zf,o=Math.cos(a),s=Math.cos(i)*o,c=Math.sin(i)*o;r.x=e.fwd.x*s+e.right.x*c,r.y=Math.sin(a),r.z=e.fwd.z*s+e.right.z*c}function Uf(e,t,n,r){let i=t*zf,a=n*zf,o=Math.sin(i),s=Math.cos(a),c=Math.sin(a);r.x=e.fanAxis.x*o*s+e.fwd.x*c,r.y=Math.cos(i)*s,r.z=e.fanAxis.z*o*s+e.fwd.z*c;let l=Math.hypot(r.x,r.y,r.z)||1;r.x/=l,r.y/=l,r.z/=l}function Wf(e,t,n,r,i){let a=t-e.pos.x,o=n-e.pos.y,s=r-e.pos.z,c=Math.hypot(a,o,s)||1;i.x=a/c,i.y=o/c,i.z=s/c}function Gf(e,t){t.x=e.rest.x,t.y=e.rest.y,t.z=e.rest.z}var Kf=Math.abs,qf=Math.sin;function Jf(e,t,n,r,i,a=!1){if(i.mix=0,i.tan=e?e.tan:Dd,i.gobo=e?e.gobo:0,!e||e.preset===0){Gf(t,i),i.dim=0;return}let o=(n-e.t0)*e.bpm/240*e.speed,s=Kf(t.u),c=t.group,l=1;switch(e.preset){case 1:{let e=t.seed<.5||t.n<=2;Uf(t,t.fanOut*(10+20*s)+16*qf(Rf*(o+t.seed)),14+10*qf(Rf*(.7*o+2*t.seed)),i),l=e?.34*(.7+.3*qf(Rf*(.5*o+t.seed))):0,i.mix=t.cluster&1;break}case 2:{let n=c===1?36:c===2?30:24;Hf(t,(52*qf(Rf*o+t.u*1.3)+t.ck*7)*t.rx,(e.tilt??n)+10*qf(Rf*2*o+t.ck),i),i.mix=t.k&1;break}case 3:{if(e.aim){Wf(t,e.aim.x,e.aim.y,e.aim.z,i);let n=(t.cx*(e.spread??36)*.5+(e.sway>0?e.sway*qf(Rf*o):0))*zf,r=Math.cos(n),a=Math.sin(n),s=i.x*r+i.z*a;i.z=-i.x*a+i.z*r,i.x=s,i.mix=t.cluster&1,t.tags&1&&t.k&1&&(l=0);break}let n=(e.spread??36)*(.72+.28*qf(Rf*o)),r,a=e.tilt===null?16:90-e.tilt;t.tags&256?(r=t.fanOut*(28+60*s),n*=.8):c===2?(r=t.fanOut*10,n*=.45,a=8):t.tags&4096?(r=0,n*=1.3,a=24):t.tags&128?(r=0,n*=1.1,a=34):t.tags&576?(r=t.fanOut*60,n*=.85):r=t.fanOut*(8+30*s),Uf(t,r+t.cx*n+5*qf(Rf*.5*o+t.seed*6),a,i),i.mix=t.cluster&1,t.tags&1&&t.k&1&&(l=0);break}case 4:Hf(t,70*Vf(o*2+t.seed*17.3,t.index),16+64*(.5+.5*Vf(o*2.3+5.1+t.seed*29.7,t.index+911)),i),i.mix=t.seed<.5?0:1;break;case 5:{let n=e.spread??20,r=Rf*o+(t.ck*.5+t.u*1.2)*Math.PI,a=c===1?38:c===2?52:c===3?40:46;Hf(t,t.out*(10+8*s+n*Math.cos(r)),(e.tilt??a)+n*qf(r),i),i.mix=t.cluster&1;break}case 6:{let e=qf(Rf*(o-t.u*.9));Hf(t,t.out*(6+14*s+t.ck*14),12+62*(.5+.5*e),i),i.mix=.5-.5*e;break}case 7:{let e=qf(Rf*o+t.cluster*.9)*.8+.2*Vf(o*1.5+t.cluster*3.7,t.cluster+31),n=qf(Rf*o*.73+t.cluster*1.7),r,a;c===2?(r=t.pos.x-t.side*8+9*e+t.ck*3,a=t.pos.z+14*n):t.tags&4096?(r=24*e+t.ck*6,a=t.pos.z-26-18*(.5+.5*n)):t.tags&256?(r=t.pos.x*.8+10*e+t.ck*2.5,a=t.pos.z+9+9*(.5+.5*n)):(r=t.pos.x*.6+22*e+t.ck*4,a=16+80*(.5+.5*n)+Kf(t.u)*15);let s=r-t.pos.x,u=-t.pos.y,d=a-t.pos.z,f=Math.hypot(s,u,d)||1;i.x=s/f,i.y=u/f,i.z=d/f,i.mix=t.k&1,t.tags&1&&t.k&1&&(l=0);break}case 8:c===2?Hf(t,-t.out*55,38+t.ck*8,i):Hf(t,-t.out*(34+7*qf(Rf*o+t.seed*6)),(e.tilt??30)+t.ck*14+6*qf(Rf*.5*o+t.seed*3),i),i.mix=t.side<0?0:t.side>0?1:t.k&1;break;case 9:{let n=84-7*s+3*qf(Rf*o+t.seed*6);Hf(t,t.out*(3+9*s)+4*Math.cos(Rf*o+t.seed*6),e.tilt??n,i),i.mix=t.cluster&1;break}case 10:{Uf(t,t.fanOut*(10+30*s)+t.cx*(e.spread??30),e.tilt===null?16:90-e.tilt,i);let n=r.phase*60/Math.max(40,r.bpm);l=a?.7+.3*Math.exp(-n*4):.12+.88*Math.exp(-n*7),i.mix=Math.floor(r.bar)&1;break}case 11:if(e.aim)Wf(t,e.aim.x,e.aim.y,e.aim.z,i);else if(t.focus&&e.tilt===null&&e.pan===null)Wf(t,t.focus.x,t.focus.y,t.focus.z,i);else{let n=c===2?20:c===3?16:c===1?4:22;Hf(t,(e.pan??0)+t.cx*3*t.rx,e.tilt??n,i)}i.mix=t.k&1;break;case 12:{let n=e.sway>0?e.sway*qf(Rf*o):0,r=(e.tilt??78)*zf,a=((e.pan??180)+n)*zf,s=Math.cos(r);i.x=Math.sin(a)*s,i.y=Math.sin(r),i.z=Math.cos(a)*s,i.mix=t.cluster&1;break}default:Gf(t,i)}if(t.tags&122880)e.densitySet&&t.sel>=e.density&&(l=0),t.focus&&e.preset!==4&&e.preset!==5&&e.preset!==2&&(e.preset!==11||!e.aim&&e.tilt===null&&e.pan===null)&&Wf(t,t.focus.x,t.focus.y,t.focus.z,i);else if((Ff[e.preset]&t.tags)===0)l=0;else{let n=e.density*(t.tags&If?Lf[e.preset]:1);n<1&&t.sel>=n&&(l=0)}l*=e.level,e.kick&&(l*=a?.75+.25*r.kick:.28+.72*r.kick),i.dim=l}function Yf(e){return!e||e.preset===0||e.level<=0}var Xf=`modulepreload`,Zf=function(e,t){return new URL(e,t).href},Qf={},$f=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function s(e){return import.meta.resolve?import.meta.resolve(e):new URL(e,import.meta.url).href}r=o(t.map(t=>{if(t=Zf(t,n),t=s(t),t in Qf)return;Qf[t]=!0;let r=t.endsWith(`.css`);for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}let i=document.createElement(`link`);if(i.rel=r?`stylesheet`:Xf,r||(i.as=`script`),i.crossOrigin=``,i.href=t,a&&i.setAttribute(`nonce`,a),document.head.appendChild(i),r)return new Promise((e,n)=>{i.addEventListener(`load`,e),i.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}).filter(e=>e!==void 0))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},ep=.6,tp=.12,np=.25,rp=.35,ip=2.8,ap=26,op=16,sp=38,cp=70,lp=320,up=316,dp=new I(`#4a86d8`),fp=new I(`#c56e46`),pp=new I(1,.26,.035),mp=.12,hp=1.2,gp=.12,_p=.3,vp=.6,yp=1.4,bp=10.7,xp=11,Sp=.03,Cp=.05,wp=.02,Tp=.06,Ep=1.3,Dp=.3,Op=.035,kp=2.6,Ap=.9,jp={ultra:10,high:9,medium:7,mobile:4},Mp=.76,Np=4,Pp=1,Fp=1,Ip=.5,Lp=.45,Rp=.012,zp=3,Bp=.5,Vp=0,Hp=1,Up=Math.tan(6*Math.PI/180),Wp=7,Gp=.12,Kp=0,qp=3,Jp=.6,Yp=.004,Xp=.05,Zp=class{name=`lights`;app;enabled=!0;q;root=new y;shared={tNoise:{value:null},uTime:{value:0},uPixelAngle:{value:.002},uLowFog:{value:new p(0,0,0,0)},uLowFogTint:{value:new I(1,1,1)}};beams;pools;sprites;bodies;glow;flood;bulbs=[];floorGlow=new I;rig=null;idx=new rf;own=new Map;density=1;sDir=new Float32Array;sCol=new Float32Array;sDim=new Float32Array;sTan=new Float32Array;sGobo=new Uint8Array;sFlare=new Float32Array;lensVeil=new I;lensDir=new u;flareK=Op;A={x:0,y:1,z:0,dim:0,mix:0,tan:0,gobo:0};B={x:0,y:1,z:0,dim:0,mix:0,tan:0,gobo:0};blends=[];washBlend={from:null,to:null,k:1};washSideBlend=[{from:null,to:null,k:1},{from:null,to:null,k:1}];pillarBlends=[];festoonBlends=Array.from({length:8},()=>({from:null,to:null,k:1}));floods=[];pillarLamp=new Float32Array;pLampCols=[];pShaftCols=[];emptyCols=[];nSparLamps=0;blindCol=new I;backCol=new I;boothCol=new I;backLevel=0;boothLevel=0;archLevel=0;archCol=new I;nArch=0;floodStage=new I;floodField=new I;floodSideL=new I;floodSideR=new I;floodAisle=new I;floodFront=new I;poolK=Ap;poolFlashK=.8;cF=new I;cSW=new I;cSR=new I;floodBase=Array.from({length:12},()=>new u);laserSys=void 0;laserAirK=Rp;laserAirSat=zp;sparLampK=hp;sparLampHalf=gp;sparLampSize=_p;sparLampDiscK=1;sparLampDisc=1.2;backGlowK=1;backLensK=2.5;backSize=.32;backCool=new I(.5,.72,1);cSL=new I;baseHaze=.6;hazeCam=null;festoonLit=0;hits=[];chases=[];blinders=[];strobes=[];cA=new I;cB=new I;cT=new I;acc=new I;flashPos=new u;chaseArr=[];emptyArr=[];nBeams=0;nPools=0;nSprites=0;cpuMs=0;strobeLevel=0;blinderLevel=0;dev=null;async init(e){this.app=e,this.q=e.quality,this.root.name=`LightingSystem`,this.shared.tNoise.value=Tf(32),this.beams=new Df(this.shared),this.pools=new Of(this.shared),this.sprites=new kf(this.shared),this.bodies=new Af,this.glow=new jf,this.flood=new Pf,this.root.add(this.bodies.group,this.glow.group,this.flood.mesh,this.pools.mesh,this.beams.mesh,this.sprites.mesh),e.scene.add(this.root);let t=()=>{this.hazeCam||=e.get(`camera`)??{};let t=this.hazeCam.hazeScale;return typeof t==`number`&&Number.isFinite(t)?Math.min(1,Math.max(.2,t)):1};this.beams.mesh.onBeforeRender=()=>{this.beams.material.uniforms.uHaze.value=this.baseHaze*t()};let n=()=>{let e=t();this.glow.material.uniforms.uScale.value=e,this.flood.material.uniforms.uScale.value=e};this.glow.mesh.onBeforeRender=n,this.glow.inner.onBeforeRender=n,this.flood.mesh.onBeforeRender=(e,t,r)=>{n(),this.flood.fit(r);let i=this.flood.cols[9],a=dm(r);i.set(this.deckBase.x*a,this.deckBase.y*a,this.deckBase.z*a);let o=this.closeFloodK*a;for(let e=0;e<2;e++){let t=this.stageAll[e],n=this.stageFl[e];this.flood.cols[e===0?0:1].set(t.x-n.x*o,t.y-n.y*o,t.z-n.z*o)}this.placeLensVeil(r);let s=fm(r),c=this.backBase;this.flood.cols[6].set(c.x*s,c.y*s,c.z*s),this.flood.cols[8].set(c.x*s,c.y*s,c.z*s),this.flood.syncSlices()},e.onFrame(()=>this.applyLaserAir()),e.show.registerLifetime(`lights`,e=>{let t=typeof e.p?.fade==`number`?e.p.fade:.5;return e.fx===`look`||e.fx===`wash`||e.fx===`pillars`?e.dur+Math.max(0,t):e.fx===`blinder`?e.dur+(typeof e.p?.release==`number`?Math.max(.05,e.p.release*3.5):tf):e.fx===`storm`?e.dur+(typeof e.p?.fade==`number`?Math.max(0,e.p.fade):1.2):e.fx===`key`?e.dur+Math.max(0,typeof e.p?.fade==`number`?e.p.fade:.5):e.dur}),e.show.registerLifetime(`strobe`,e=>e.dur+nf);let r=e.events.on(`loading:progress`,t=>{t.progress<1||(r(),this.rig&&this.anchorsChanged()&&this.rebuildRig(),this.rig&&this.idx.revision!==e.show.revision&&this.idx.sync(e.show,this.rig))});if(e.params.has(`lightsdev`)||e.params.has(`lightstest`)){let t=await $f(()=>import(`./DevProxy-CleK4hdN.js`),__vite__mapDeps([0,1]),import.meta.url);e.params.has(`lightstest`)&&t.injectTestShow(e),e.params.has(`lightsdev`)&&(this.dev=new t.DevProxy(e))}}setQuality(e){if(this.q=e,!this.app)return;let t=e.volumetrics;for(let e of[this.beams.material,this.pools.material])`USE_NOISE`in e.defines!==t&&(t?e.defines.USE_NOISE=``:delete e.defines.USE_NOISE,e.needsUpdate=!0);this.flood.build(jp[e.level]??6,4,Math.min(620,e.drawDistance*.45)),this.rebuildRig()}rebuildRig(){let e=this.app.anchors,t=Math.min(1.5,Math.max(.3,this.q.beamBudget/up)),n=_d(e,t,this.own),r=e=>e.fixtures.reduce((e,t)=>e+(t.tags&122880?1:0),0);for(let i=0;i<8&&n.fixtures.length-r(n)>this.q.beamBudget;i++)t*=.88,n=_d(e,t,this.own);let i=r(n);this.density=t,this.rig=n,this.nArch=n.fixtures.reduce((e,t)=>e+ +!!t.focus,0);let a=n.fixtures.length;this.sDir=new Float32Array(a*3),this.sCol=new Float32Array(a*3),this.sDim=new Float32Array(a),this.sTan=new Float32Array(a),this.sGobo=new Uint8Array(a),this.sFlare=new Float32Array(a),this.chaseArr=Array(n.pillars.length).fill(1),this.pillarLamp=new Float32Array(n.pillars.length),this.pillarBlends=n.pillars.map(()=>({from:null,to:null,k:1})),this.pLampCols=n.pillars.map(()=>new I),this.pShaftCols=n.pillars.map(()=>new I),this.nSparLamps=n.emitters.reduce((e,t)=>e+(t.tags&65536?1:0),0),this.blends=n.classes.map(()=>({from:null,to:null,k:1})),this.bulbs=ff(e),this.app.show.file?this.idx.sync(this.app.show,n):this.idx.revision=-1;let o=this.q.level===`mobile`?8:this.q.level===`medium`?10:12;this.beams.build(Math.min(a,this.q.beamBudget+i),o),this.pools.build(a+6),this.sprites.build(a+n.emitters.length+this.bulbs.length+n.pillars.length+16);let s=n.emitters.filter(e=>(e.tags&zu)===0).map(e=>{let t=new b,n=e.fwd.clone().setY(0).normalize(),r=new u(0,1,0),i=new u().crossVectors(r,n);return t.makeBasis(i,r,n).scale(e.size).setPosition(e.pos.x-e.fwd.x*.12,e.pos.y,e.pos.z-e.fwd.z*.12),t});this.bodies.build(a,s);for(let e of n.fixtures)e.body||this.bodies.hide(e.index);this.publishAnchor(`fixtures_truss`,n.fixtures.filter(e=>e.group===0).map(e=>e.pos)),this.publishAnchor(`fixtures_floor`,n.fixtures.filter(e=>e.group===1).map(e=>e.pos))}publishAnchor(e,t){let n=this.app.anchors,r=n.get(e),i=this.own.get(e);(Yu(n,e)||i&&i===r)&&(n.set(e,t),this.own.set(e,n.get(e)))}anchorsChanged(){let e=this.rig;if(!e)return!0;let t=this.app.anchors;for(let n=0;n<md.length;n++){let r=md[n],i=t.get(r);if(i!==e.sources[n]&&i!==this.own.get(r))return!0}return!1}update(e){if(!this.enabled)return;let t=performance.now(),n=this.app,r=n.show;this.anchorsChanged()&&this.rebuildRig(),this.terrain||=n.get(`terrain`)??{};let i=this.rig;this.idx.revision!==r.revision&&this.idx.sync(r,i);let a=e.showTime,o=e.beat,s=n.env,c=n.palette,l=e.camera,u=Math.max(1,n.renderer.domElement.height);this.shared.uPixelAngle.value=2*Math.tan(E.degToRad(l.fov)*.5)/u/Math.max(.1,l.zoom),this.shared.uTime.value=a,this.sprites.material.uniforms.uFlarePx.value=u*.085,this.sprites.material.uniforms.uMinPx.value=Math.max(2,u/300);let d=E.clamp(s.haze,0,1);this.baseHaze=.3+.95*d,this.beams.material.uniforms.uHaze.value=this.baseHaze,this.beams.material.uniforms.uExtinct.value=.055-.035*d,this.beams.material.uniforms.uGain.value=1,this.beams.material.uniforms.uNoise.value=.85,this.storm=this.evalStorm(a),this.beams.material.uniforms.uSoft.value=Lp*Math.max(om((d-.7)/.22),Math.min(1,this.storm));let f=this.reduceFlashing();this.rf=f;let p=f?this.idx.calmLooks:this.idx.looks;for(let e=0;e<this.blends.length;e++){let t=p[e].resolve(a,this.blends[e]);this.resolveCueColors(t.from),this.resolveCueColors(t.to)}this.idx.hits.alive(a,this.hits),this.idx.chases.alive(a,this.chases),this.idx.blinders.alive(a,this.blinders),this.idx.strobes.alive(a,this.strobes),this.idx.floods.alive(a,this.floods);for(let e=0;e<this.floods.length;e++)this.resolveCueColors(this.floods[e],`primary`);for(let e=0;e<this.hits.length;e++)this.resolveCueColors(this.hits[e],`accent`);for(let e=0;e<this.chases.length;e++)this.resolveCueColors(this.chases[e]);for(let e=0;e<this.blinders.length;e++)this.resolveCueColors(this.blinders[e],`warm`);for(let e=0;e<this.strobes.length;e++)this.resolveCueColors(this.strobes[e],`white`);let m=i.fixtures,h=m.length,g=this.A,_=this.B,v=this.cA,y=this.cB,b=this.sDir,x=this.sCol,S=this.sDim,C=this.sTan,w=this.hits.length,T=this.chases.length,D=this.idx.calm;for(let e=0;e<h;e++){let t=m[e],n=this.blends[t.cls];if(Yf(n.to)&&(n.k>=1||Yf(n.from))){let n=!1;for(let t=0;t<w&&!n;t++)n=this.hits[t].mask[e]===1;for(let t=0;t<T&&!n;t++)n=this.chases[t].mask[e]===1;if(!n){S[e]=0,C[e]=Dd,this.sGobo[e]=0,this.sFlare[e]=0,b[e*3]=t.rest.x,b[e*3+1]=t.rest.y,b[e*3+2]=t.rest.z;continue}}Jf(n.to,t,a,o,g,f),n.to?v.copy(n.to.c1).lerp(n.to.c2,g.mix):v.setRGB(1,1,1);let r=g.dim,i=g.x,s=g.y,c=g.z,l=g.tan,u=v.r,d=v.g,p=v.b,h=n.k;if(h<1){Jf(n.from,t,a,o,_,f),n.from?y.copy(n.from.c1).lerp(n.from.c2,_.mix):y.setRGB(1,1,1);let e=(1-h)*_.dim,m=h*g.dim;r=e+m;let b=(1-h)*(_.dim+.02),x=h*(g.dim+.02);i=_.x*b+g.x*x,s=_.y*b+g.y*x,c=_.z*b+g.z*x;let S=Math.hypot(i,s,c);S>1e-4?(i/=S,s/=S,c/=S):(i=g.x,s=g.y,c=g.z);let C=e+m>1e-5?e+m:1;u=(y.r*e+v.r*m)/C,d=(y.g*e+v.g*m)/C,p=(y.b*e+v.b*m)/C,e+m<=1e-5&&(u=v.r,d=v.g,p=v.b),l=_.tan+(g.tan-_.tan)*h}for(let t=0;t<w;t++){let n=this.hits[t];if(n.mask[e]!==1)continue;let i=(a-n.t0)/Math.max(.05,n.dur);if(i<0||i>=1)continue;let o=n.intensity*(1-i)*(1-i);f&&(o=D.ok(n.t0)?o*ep*om((a-n.t0)/tp):0);let s=r+o>1e-4?o/Math.max(r,o):1;u+=(n.c1.r-u)*s,d+=(n.c1.g-d)*s,p+=(n.c1.b-p)*s,o>r&&(r=o)}for(let n=0;n<T;n++){let i=this.chases[n];if(a>=i.t0+i.dur||i.mask[e]!==1)continue;let o=(f?$p(i,t.u,t.cluster,a,D):Qp(i,t.u,t.cluster,a))*i.intensity;if(r=r*(f?.6:.3)+o,i.color){let e=o>0?Math.min(1,o):0;u+=(i.c1.r-u)*e,d+=(i.c1.g-d)*e,p+=(i.c1.b-p)*e}}r>1.5&&(r=1.5),S[e]=r,C[e]=l,this.sGobo[e]=h<.5&&n.from?_.gobo:g.gobo,this.sFlare[e]=(n.to?n.to.flare*h:0)+(h<1&&n.from?n.from.flare*(1-h):0),b[e*3]=i,b[e*3+1]=s,b[e*3+2]=c,x[e*3]=u,x[e*3+1]=d,x[e*3+2]=p}this.writeLowFog(a);let O=this.shared.uLowFog.value,k=this.lowFogGlowK>0&&O.x+O.y+O.z>.001;this.lowAcc.set(0,0,0,0),this.lowPos.set(0,0,0,0),this.lowCol.setRGB(0,0,0),this.lensVeil.setRGB(0,0,0),this.lensDir.set(0,0,0);let A=l.position.x,ee=l.position.y,te=l.position.z;this.beams.begin(),this.pools.begin(),this.sprites.begin();let j=0,ne=0;this.archCol.setRGB(0,0,0);let M=0,re=0,ie=0,N=0;for(let e=0;e<h;e++){let t=m[e],n=b[e*3],r=b[e*3+1],i=b[e*3+2],a=t.hang?-1:1;t.body&&this.bodies.setHead(e,t.pos.x,t.pos.y,t.pos.z,a,n,r,i,t.fwd.x,t.fwd.z);let o=S[e];if(o<.004)continue;let s=x[e*3]*o,c=x[e*3+1]*o,l=x[e*3+2]*o,u=t.focus?Math.max(C[e],Up):C[e],d=t.pos.x+n*.26,f=t.pos.y+r*.26,p=t.pos.z+i*.26,h=.085,g=lp,_=0,v=0;if(r<-.004){let e=f/-r;if(e<lp){for(let t=0;t<2&&(v=this.groundAt(d+n*e,p+i*e),!(v>=f));t++)e=(f-v)/-r;v<f&&e<lp&&(g=e,_=1)}}let y=this.sGobo[e],w=ip*(t.focus?this.archBeamK:1);this.beams.push(d,f,p,h,n,r,i,g,s*w*.92,c*w*.97,l*w*1.06,u,t.seed,_?v+1:0,y),this.sprites.push(0,d,f,p,n,r,i,Math.atan(u),s*ap,c*ap,l*ap,.2),t.focus&&(this.sprites.push(3,d,f,p,n,r,i,0,s*this.archCanK,c*this.archCanK,l*this.archCanK,.16),ne+=o,this.archCol.r+=s,this.archCol.g+=c,this.archCol.b+=l);let T=(s+c+l)*.333;k&&this.depositLowFog(d,f,p,n,r,i,g,s,c,l);let E=this.sFlare[e];if(E>0){let e=A-d,t=ee-f,a=te-p,o=Math.hypot(e,t,a)||1,m=Math.min(1,Math.max(-1,(n*e+r*t+i*a)/o)),h=Math.acos(m)/(Math.atan(u)*1.35+.03),g=Math.exp(-h*h);if(g>.01){let n=E*g/(1+o/40*(o/40));this.lensVeil.r+=s*n,this.lensVeil.g+=c*n,this.lensVeil.b+=l*n;let r=n*(s+c+l)/o;this.lensDir.x-=e*r,this.lensDir.y-=t*r,this.lensDir.z-=a*r}}if(j+=o,re+=s,ie+=c,N+=l,_){let e=d+n*g,a=p+i*g,f=h+g*u,m=Math.max(.08,-r),_=f/m,b=Math.hypot(n,i)||1,x=Math.min(9,op*m/(Math.PI*f*f*.9+.35));x*T>.004&&(this.pools.push(e,v+.06,a,_,n/b,i/b,f,t.seed*3.7,s*x,c*x,l*x,(u<.04?1:.4)+(y?2:0)),a>3&&a<240&&Math.abs(e)<125&&(M+=o))}else r<-.05&&i>.2&&(M+=o*.5)}this.bodies.commit(),this.nBeams=this.beams.count,this.nPools=this.pools.count;let ae=0,oe=0,se=0;this.blindCol.setRGB(0,0,0),this.backCol.setRGB(0,0,0),this.boothCol.setRGB(0,0,0);let P=0,F=0,ce=0,le=this.acc.setRGB(0,0,0);this.flashPos.set(0,0,0);let ue=0,de=i.emitters;for(let e=0;e<de.length;e++){let t=de[e],n=0,r=this.cT.setRGB(0,0,0);if(t.kind===`strobe`){for(let t=0;t<this.strobes.length;t++){let i=this.strobes[t];if(i.mask[e]!==1)continue;let s=tm(i,a,o,f,D)*i.intensity*(f?.4:1);s>n&&(n=s,r.copy(i.c1))}n>.003&&(this.sprites.push(2,t.pos.x,t.pos.y,t.pos.z,t.fwd.x,t.fwd.y,t.fwd.z,+!!t.twoSided,r.r*n*cp,r.g*n*cp,r.b*n*cp,1.3),ae=Math.max(ae,n),oe++,le.r+=r.r*n,le.g+=r.g*n,le.b+=r.b*n,this.flashPos.addScaledVector(t.pos,n),ue+=n)}else{let i=(t.tags&Ru)!==0,o=null;for(let t=0;t<this.blinders.length;t++){let s=this.blinders[t];if(s.mask[e]!==1)continue;let c=a-s.t0,l=s.blAttack>=0?s.blAttack:.03,u=s.release>=0?s.release:i?mp:.32,d=(c<=s.dur?Math.min(1,c/(f?Math.max(.25,l):l)):Math.exp(-(c-s.dur)/u))*s.intensity*(f?.5:1);if(d>n){n=d,o=s;let e=c<=s.dur||i||s.release>=0?0:(1-Math.min(1,d/Math.max(.01,s.intensity)))**.7*.9;r.copy(s.c1).lerp(pp,e)}}if(n>.003){if(i){let e=t.fwd.x,i=t.fwd.y,a=t.fwd.z,s=o?.aim;if(s){e=s.x-t.pos.x,i=s.y-t.pos.y,a=s.z-t.pos.z;let n=Math.hypot(e,i,a)||1;e/=n,i/=n,a/=n}let c=n*ap*this.sparLampK,l=o&&o.spread!==null?Math.min(1.2,Math.max(.01,o.spread*Math.PI/180)):this.sparLampHalf;this.sprites.push(0,t.pos.x,t.pos.y,t.pos.z,e,i,a,l,r.r*c,r.g*c,r.b*c,this.sparLampSize);let u=n*xp*this.sparLampDiscK;u>0&&this.sprites.push(3,t.pos.x,t.pos.y,t.pos.z,e,i,a,0,r.r*u,r.g*u,r.b*u,this.sparLampDisc),ce=Math.max(ce,n),re+=r.r*n*.4,ie+=r.g*n*.4,N+=r.b*n*.4;continue}if(t.tags&8192){let e=n*sp*this.backLensK;this.sprites.push(3,t.pos.x,t.pos.y,t.pos.z,t.fwd.x,t.fwd.y,t.fwd.z,0,r.r*e,r.g*e,r.b*e,this.backSize)}else if(t.tags&16384){let e=n*ap*1.4;this.sprites.push(0,t.pos.x,t.pos.y,t.pos.z,t.fwd.x,t.fwd.y,t.fwd.z,.42,r.r*e,r.g*e,r.b*e,.35)}else this.sprites.push(1,t.pos.x,t.pos.y,t.pos.z,t.fwd.x,t.fwd.y,t.fwd.z,0,r.r*n*sp,r.g*n*sp,r.b*n*sp,1.2);t.tags&8192?(P=Math.max(P,n),this.backCol.r+=r.r*n,this.backCol.g+=r.g*n,this.backCol.b+=r.b*n,re+=r.r*n*1.5,ie+=r.g*n*1.5,N+=r.b*n*1.5):t.tags&16384?(F=Math.max(F,n),this.boothCol.r+=r.r*n,this.boothCol.g+=r.g*n,this.boothCol.b+=r.b*n,re+=r.r*n,ie+=r.g*n,N+=r.b*n):(se=Math.max(se,n),this.blindCol.r+=r.r*n,this.blindCol.g+=r.g*n,this.blindCol.b+=r.b*n,re+=r.r*n*3,ie+=r.g*n*3,N+=r.b*n*3)}}}this.backLevel=P,this.boothLevel=F,this.archLevel=this.nArch>0?Math.min(1.5,ne/this.nArch):0,pm(this.archCol,s.archSpotColor),s.archSpotIntensity=this.archLevel,this.writeFestoon(a,o);let fe=this.evalFloods(a,o,f);{let e=this.poolK*(f?.6:1),t=this.floodAisle;t.r+t.g+t.b>1e-4&&this.pools.push(0,.07,88,58,0,1,13,.9,t.r*e,t.g*e,t.b*e,0);let n=this.floodFront;n.r+n.g+n.b>1e-4&&this.pools.push(0,.07,10,34,1,0,9,2.3,n.r*e,n.g*e,n.b*e,0)}if(fe.field>0){let e=this.floodField,t=Dp*(f?.6:1);this.pools.push(0,.07,26,56,1,0,36,.3,e.r*t,e.g*t,e.b*t,0),this.pools.push(0,.07,100,52,1,0,50,1.7,e.r*t*.2,e.g*t*.2,e.b*t*.2,0)}this.writePillars(a,o,s),this.nSprites=this.sprites.count,this.beams.end(),this.pools.end(),this.sprites.end(),this.strobeLevel=ae,this.blinderLevel=se;let pe=Math.max(1,de.length-this.nSparLamps),me=ae*Math.min(1,.45+oe/pe*1.6);s.strobe=Math.max(s.strobe,me);let he=f?.4:1;ue>0&&(this.flashPos.multiplyScalar(1/ue),le.multiplyScalar(1/Math.max(.001,ae*oe)),s.addFlash(le,me*2.2*he,this.flashPos)),se>0&&(pm(this.blindCol,this.cF),this.flashPos.set(0,3,2),this.blindFlashK>0&&s.addFlash(this.cF,se*1.4*this.blindFlashK*he,this.flashPos)),re+=this.floodStage.r*2+this.floodField.r*3+(this.floodSideL.r+this.floodSideR.r),ie+=this.floodStage.g*2+this.floodField.g*3+(this.floodSideL.g+this.floodSideR.g),N+=this.floodStage.b*2+this.floodField.b*3+(this.floodSideL.b+this.floodSideR.b);let I=Math.max(1,h);s.stageIntensity=Math.min(3,s.stageIntensity+2.6*j/I+se*1.2+me*.8+P*.5+F*.2+ce*.2+fe.stage*.5+fe.field*.7),s.audienceWash=Math.min(1,s.audienceWash+M/(I*.28)+se*.9+P*.45+fe.field*.5);let ge=Math.max(re,ie,N);ge>1e-4?s.stageColor.setRGB(re/ge,ie/ge,N/ge):s.stageColor.copy(c.primary).multiplyScalar(.25),this.writeWash(a,s),this.writeKey(a,s);let _e=.25+.75*d;this.floorGlow.copy(s.stageColor);let ve=Math.min(1.5,1.4*j/I)+me*.6+se*.8;me>0&&this.floorGlow.lerp(this.cT.setRGB(1,1,1),Math.min(1,me));let ye=s.stageWashIntensity/(1+.45*s.stageWashIntensity);this.glow.update(l.position,s.stageWashColor,(ye+me*.35)*this.washGlowK,this.floorGlow,ve*this.floorGlowK,.02*_e),this.writeFloodGlow(s,d,j/I,me,a);for(let e=0;e<12;e++)this.floodBase[e].copy(this.flood.cols[e]);this.stageAll[0].copy(this.flood.cols[0]),this.stageAll[1].copy(this.flood.cols[1]),this.flood.update(),this.dev?.update(e),this.cpuMs=this.cpuMs*.9+(performance.now()-t)*.1}groundAt(e,t){if(t<0&&t>-14&&e>-37&&e<37)return 1.9;if(t>-4&&t<113&&e>-46&&e<46)return 0;let n=this.terrain?.heightAt;return n?n.call(this.terrain,e,t):0}terrain=null;resolveCueColors(e,t=`primary`){if(!e)return;let n=this.app.palette;pt(e.color??t,n,e.c1,`primary`),e.color2?pt(e.color2,n,e.c2,`secondary`):e.c2.copy(e.c1)}writeWash(e,t){let n=(this.rf?this.idx.calmWash:this.idx.wash).resolve(e,this.washBlend),r=this.app.palette,i=this.acc.setRGB(0,0,0);this.washI=0,this.addWash(n.to,n.k),n.k<1&&this.addWash(n.from,1-n.k);let a=this.washI;for(let t=0;t<this.hits.length;t++){let n=this.hits[t],r=(e-n.t0)/Math.max(.05,n.dur);if(r<0||r>=1)continue;let o=n.intensity*(1-r)*(1-r)*.7;this.rf&&(o=this.idx.calm.ok(n.t0)?o*ep*om((e-n.t0)/tp):0),i.r+=n.c1.r*o,i.g+=n.c1.g*o,i.b+=n.c1.b*o,a+=o}if(this.blinderLevel>0){let e=this.blinderLevel*this.blindSetK;pm(this.blindCol,this.cF),i.r+=this.cF.r*e,i.g+=this.cF.g*e,i.b+=this.cF.b*e,a+=e}if(this.boothLevel>0){let e=this.boothLevel*.12;pm(this.boothCol,this.cF),i.r+=this.cF.r*e,i.g+=this.cF.g*e,i.b+=this.cF.b*e,a+=e}let o=this.floodStage,s=.25*this.floodSetK,c=.35*this.floodSetK;i.r+=o.r*c+(this.floodSideL.r+this.floodSideR.r)*s,i.g+=o.g*c+(this.floodSideL.g+this.floodSideR.g)*s,i.b+=o.b*c+(this.floodSideL.b+this.floodSideR.b)*s,a+=cm(o)*c+(cm(this.floodSideL)+cm(this.floodSideR))*s,a>1e-4?t.stageWashColor.setRGB(i.r/a,i.g/a,i.b/a):t.stageWashColor.copy(r.primary),t.stageWashIntensity=Math.min(2,a)}writeKey(e,t){let n=this.idx.key.resolve(e,this.keyBlend),r=t.dragonKeyColor,i=t.dragonKeyColor2;r.setRGB(0,0,0),i.setRGB(0,0,0);let a=0,o=this.app.palette;for(let e=0;e<2;e++){let t=e===0?n.to:n.from,s=e===0?n.k:1-n.k;if(!t||s<=0)continue;let c=Math.min(2,t.intensity)*s;pt(t.color??`primary`,o,t.c1,`primary`),t.color2?pt(t.color2,o,t.c2,`secondary`):t.c2.copy(t.c1),r.r+=t.c1.r*c,r.g+=t.c1.g*c,r.b+=t.c1.b*c,i.r+=t.c2.r*c,i.g+=t.c2.g*c,i.b+=t.c2.b*c,a+=c}t.dragonKeyIntensity=a}keyBlend={from:null,to:null,k:1};washI=0;addWash(e,t){if(t<=0)return;let n=this.acc,r=this.app.palette;e?(pt(e.color??`primary`,r,e.c1,`primary`),n.r+=e.c1.r*e.intensity*t,n.g+=e.c1.g*e.intensity*t,n.b+=e.c1.b*e.intensity*t,this.washI+=e.intensity*t):this.idx.wash.items.length===0&&(n.r+=r.primary.r*.35*t,n.g+=r.primary.g*.35*t,n.b+=r.primary.b*.35*t,this.washI+=.35*t)}writePillars(e,t,n){let r=this.rig,i=r.pillars.length,a=this.cA.setRGB(0,0,0),o=this.cB.setRGB(0,0,0),s=this.chaseArr,c=this.pillarLamp,l=!1,u=0,d=0,f=0,p=0,m=NaN,h=!0,g=!0,_=-1,v=this.app.palette,y=this.rf?this.idx.calmPillars:this.idx.pillars,b=this.pcL,x=this.pcS;for(let n=0;n<i;n++){let i=r.pillars[n],S=this.pillarBlends[n];y[n]?y[n].resolve(e,S):(S.from=null,S.to=null,S.k=1);let C=S.k,w=0,T=0,E=0,D=this.pLampCols[n].setRGB(0,0,0),O=this.pShaftCols[n].setRGB(0,0,0),k=0,A=0;for(let s=0;s<2;s++){let c=s===0?S.to:S.from,u=s===0?C:1-C;if(u<=0)continue;let d=1,f=.8,p=0;if(c){let e=c.colors?c.colors[i.index%c.colors.length]:c.rowColors?c.rowColors[Math.max(0,i.row)%c.rowColors.length]:c.color;pt(e??`#4a86d8`,v,b,`primary`);let t=c.shafts?c.shafts[i.index%c.shafts.length]:c.rowShafts?c.rowShafts[Math.max(0,i.row)%c.rowShafts.length]:c.shaft;t?pt(t,v,x,`secondary`):x.copy(fp),p=c.mode,d=p===4?0:c.intensity,f=p===4?0:c.shaftIntensity}else b.copy(dp),x.copy(fp);a.r+=b.r*d*u,a.g+=b.g*d*u,a.b+=b.b*d*u,o.r+=x.r*f*u,o.g+=x.g*f*u,o.b+=x.b*f*u;let m=u*Math.max(d,.001);D.r+=b.r*m,D.g+=b.g*m,D.b+=b.b*m,k+=m;let h=u*Math.max(f,.001);O.r+=x.r*h,O.g+=x.g*h,O.b+=x.b*h,A+=h,w+=d*u,T+=f*u,(p===1||p===2||p===3||p===5)&&(l=!0),E+=(c?nm(c,p,n,i.row,r.rows,e,t,this.rf):1)*u*(d>0?d:1)}if(k>0&&D.multiplyScalar(1/k),A>0&&O.multiplyScalar(1/A),w>.01&&g){if(_<0)_=n;else{let e=this.pLampCols[_],t=this.pShaftCols[_];g=Math.abs(D.r-e.r)+Math.abs(D.g-e.g)+Math.abs(D.b-e.b)<.002&&Math.abs(O.r-t.r)+Math.abs(O.g-t.g)+Math.abs(O.b-t.b)<.002}}s[n]=w>1e-4?E/w:0,c[n]=w,d+=w,p+=T,w>u&&(u=w),T>f&&(f=T);let ee=(S.to?S.to.cue.id:-1)*7+(S.from?S.from.cue.id+1:0)*131+S.k;n===0?m=ee:ee!==m&&(h=!1)}if(d>1e-4&&n.pillarLampColor.setRGB(a.r/d,a.g/d,a.b/d),p>1e-4&&n.pillarShaftColor.setRGB(o.r/p,o.g/p,o.b/p),n.pillarLampIntensity=u,n.pillarShaftIntensity=f*this.shaftK,!h&&u>1e-4){for(let e=0;e<i;e++)s[e]*=c[e]/u;l=!0}if(n.pillarChase=l?s:this.emptyArr,n.pillarLampColors=g?this.emptyCols:this.pLampCols,n.pillarShaftColors=g?this.emptyCols:this.pShaftCols,this.pillarColored=!g,!g&&this.pillarGlowK>0&&u>1e-4)for(let e=0;e<i;e++){let t=(l?s[e]:1)*u*this.pillarGlowK*xp;if(t<.01)continue;let n=r.pillars[e],i=this.pLampCols[e];this.sprites.push(3,n.top.x,n.base.y+bp,n.top.z,0,0,1,0,i.r*t,i.g*t,i.b*t,this.pillarGlowSize)}}pillarColored=!1;pcL=new I;pcS=new I;pillarGlowK=vp;pillarGlowSize=yp;floodOut={stage:0,field:0,sides:0};evalFloods(e,t,n){let r=this.app.env,i=this.floodOut;i.stage=0,i.field=0,i.sides=0,this.floodStage.setRGB(0,0,0),this.floodField.setRGB(0,0,0),this.floodSideL.setRGB(0,0,0),this.floodSideR.setRGB(0,0,0),this.floodAisle.setRGB(0,0,0),this.floodFront.setRGB(0,0,0);for(let r=0;r<this.floods.length;r++){let a=this.floods[r],o=im(a,e,n);if(a.kick&&(o*=n?.85+.15*t.kick:.5+.5*t.kick),a.gate>0&&(o*=rm(a,t,n)),n&&(o*=.6),o<=1e-4)continue;let s=a.c1;a.area&16&&(this.floodAisle.r+=s.r*o,this.floodAisle.g+=s.g*o,this.floodAisle.b+=s.b*o),a.area&32&&(this.floodFront.r+=s.r*o,this.floodFront.g+=s.g*o,this.floodFront.b+=s.b*o),a.area&1&&(this.floodStage.r+=s.r*o,this.floodStage.g+=s.g*o,this.floodStage.b+=s.b*o,i.stage+=o),a.area&2&&(this.floodField.r+=s.r*o,this.floodField.g+=s.g*o,this.floodField.b+=s.b*o,i.field+=o),a.area&4&&(this.floodSideL.r+=s.r*o,this.floodSideL.g+=s.g*o,this.floodSideL.b+=s.b*o,i.sides+=o*.5),a.area&8&&(this.floodSideR.r+=s.r*o,this.floodSideR.g+=s.g*o,this.floodSideR.b+=s.b*o,i.sides+=o*.5)}let a=this.app.palette;{let t=(this.rf?this.idx.calmWash:this.idx.wash).resolve(e,this.washBlend);for(let e=0;e<2;e++){let n=e===0?t.to:t.from,r=e===0?t.k:1-t.k;if(!n||r<=0||n.fieldShare<=0)continue;pt(n.color??`primary`,a,n.c1,`primary`);let o=n.intensity*n.fieldShare*r;this.floodField.r+=n.c1.r*o,this.floodField.g+=n.c1.g*o,this.floodField.b+=n.c1.b*o,i.field+=o}}for(let t=0;t<2;t++){let n=(this.rf?this.idx.calmWashSides:this.idx.washSides)[t].resolve(e,this.washSideBlend[t]),r=t===0?this.floodSideL:this.floodSideR;for(let e=0;e<2;e++){let t=e===0?n.to:n.from,o=e===0?n.k:1-n.k;if(!t||o<=0)continue;pt(t.color??`primary`,a,t.c1,`primary`);let s=t.intensity*o*.8;r.r+=t.c1.r*s,r.g+=t.c1.g*s,r.b+=t.c1.b*s,i.sides+=s*.5}}let o=(n?.4:1)*this.floodFlashK;i.field>0&&(pm(this.floodField,this.cF),this.flashPos.set(0,12,28),r.addFlash(this.cF,Math.min(5,i.field*2.6)*o,this.flashPos)),i.stage>0&&(pm(this.floodStage,this.cF),this.flashPos.set(0,12,-4),r.addFlash(this.cF,Math.min(3,i.stage*1.2)*o,this.flashPos));for(let e=0;e<2;e++){let t=e===0?this.floodSideL:this.floodSideR,n=cm(t);n<=1e-4||(pm(t,this.cF),this.flashPos.set(e===0?-64:64,6,6),r.addFlash(this.cF,Math.min(2.5,n*1.2)*o,this.flashPos))}for(let e=0;e<2;e++){let t=e===0?this.floodAisle:this.floodFront,n=cm(t);n<=1e-4||(pm(t,this.cF),e===0?this.flashPos.set(0,3,80):this.flashPos.set(0,3,10),r.addFlash(this.cF,Math.min(2,n*this.poolFlashK)*o,this.flashPos))}return i}writeFloodGlow(e,t,n,r,i){let a=this.flood.cols;for(let e=0;e<12;e++)a[e].set(0,0,0);let o=.35+.9*t,s=this.addGlow,c=o*this.floodGlowK,l=um(this.floodStage,this.floodGlowSat,this.floodSatGain,this.cGS),u=um(this.floodField,this.floodGlowSat,this.floodSatGain,this.cGF),d=this.floodHighK;s(0,l,Sp*c),s(1,l,Sp*c*d),s(4,u,wp*c),s(5,u,wp*c),s(0,u,Sp*c*.35);{let e=Sp*c;this.stageFl[0].set((l.r+u.r*.35)*e,(l.g+u.g*.35)*e,(l.b+u.b*.35)*e),this.stageFl[1].set(l.r*e*d,l.g*e*d,l.b*e*d)}if(s(2,um(this.floodSideL,this.floodGlowSat,this.floodSatGain,this.cGX),Cp*o),s(3,um(this.floodSideR,this.floodGlowSat,this.floodSatGain,this.cGX),Cp*o),this.backLevel>0){let e=pm(this.backCol,this.cF),t=Math.min(e.r,e.g,e.b);e.lerp(this.backCool,t*t);let n=Ep*this.backGlowK*o*this.backLevel;this.backBase.set(e.r*n,e.g*n,e.b*n)}else this.backBase.set(0,0,0);{let e=fm(this.app.camera),t=this.backBase;a[6].set(t.x*e,t.y*e,t.z*e),a[8].set(t.x*e,t.y*e,t.z*e)}this.boothLevel>0&&s(7,pm(this.boothCol,this.cF),Tp*o*this.boothLevel*.8);{let e=this.lensVeil;e.r+e.g+e.b>1e-4&&(s(11,e,this.flareK),this.placeLensVeil(this.app.camera))}{let t=this.lowAcc;if(t.x>1e-5){let n=t.y/t.x,r=t.z/t.x,i=Math.sqrt(Math.max(0,t.w/t.x-n*n)),o=Math.sqrt(Math.max(0,this.lowPos.x/t.x-r*r)),s=this.flood.material.uniforms.uBlobC.value[10],c=this.flood.material.uniforms.uBlobS.value[10];s.set(n,1.1+1.5*(1-sm(-2,2,r)),r,1),c.set(Math.min(50,i+14),1.3,Math.min(40,o+9));let l=this.shared.uLowFogTint.value,u=1/Math.max(.3,this.density),d=this.lowFogGlowK*u;a[10].set(this.lowCol.r*l.r*d,this.lowCol.g*l.g*d,this.lowCol.b*l.b*d),e.lowFogLight.setRGB(this.lowCol.r*l.r*u*Xp,this.lowCol.g*l.g*u*Xp,this.lowCol.b*l.b*u*Xp),e.lowFogPos.set(s.x,s.y,s.z),e.lowFogSpread.set(i,o)}}{let t=this.deckSmoke(i);if(this.deckBase.set(0,0,0),t>.001){let r=e.stageWashIntensity/(1+.45*e.stageWashIntensity),i=Math.min(1.2,n*2.2)*this.deckRigK,a=e.stageWashColor,o=e.stageColor,s=this.deckFogTint,c=this.deckHazeK*t;this.deckBase.set((a.r*r+o.r*i)*s.r*c,(a.g*r+o.g*i)*s.g*c,(a.b*r+o.b*i)*s.b*c)}let r=dm(this.app.camera);a[9].set(this.deckBase.x*r,this.deckBase.y*r,this.deckBase.z*r)}this.archLevel>0&&this.archGlowK>0&&s(7,this.app.env.archSpotColor,this.archGlowK*o*this.archLevel);let f=Math.max(om((t-Mp)/.16000000000000003),this.storm);if(this.scatter=f,f>0){let t=Math.min(1.5,e.stageWashIntensity),i=Math.min(1,n*2.2)+r*.6,a=lm(e.stageWashColor,Np,this.cSW),o=lm(e.stageColor,Np,this.cSR);this.stormTint>0&&(a.lerp(this.stormCol,this.stormTint),o.lerp(this.stormCol,this.stormTint));let c=f*Ip*this.scatterK,l=Sp*c*.42*t;s(0,a,l),s(1,a,l*.8);let u=Sp*c*.5*i;s(0,o,u),s(1,o,u*.9),s(4,o,wp*c*.5*(i+t*.4)),s(4,a,wp*c*.35*t)}}scatter=0;placeLensVeil(e){let t=this.flood.material.uniforms.uBlobC.value[11],n=e.matrixWorld.elements,r=this.lensDir,i=Math.hypot(r.x,r.y,r.z),a=i>1e-6?kp/i:0;t.set(n[12]+r.x*a,n[13]+r.y*a,n[14]+r.z*a,1)}storm=0;stormTint=0;stormCol=new I;stormArr=[];stormTintK=.7;evalStorm(e){let t=this.idx.storms.alive(e,this.stormArr),n=0,r=0;for(let i=0;i<t.length;i++){let a=t[i],o=Math.min(1.5,im(a,e,!1));o>n&&(n=o,a.color?(pt(a.color,this.app.palette,this.stormCol,`accent`),pm(this.stormCol,this.stormCol),r=this.stormTintK):r=0)}return this.stormTint=n>0?r:0,n}deckBase=new u;stageAll=[new u,new u];stageFl=[new u,new u];closeFloodK=Hp;backBase=new u;deckFogTint=new I(1,1,1);fogBuf=[];deckSmoke(e){let t=this.app.show.active(`fog`,e,this.fogBuf),n=0;for(let r=0;r<t.length;r++){let i=t[r];if(i.fx!==`lowfog`)continue;let a=typeof i.p.area==`string`?i.p.area:`deck`;if(a!==`deck`&&a!==`all`)continue;let o=typeof i.p.density==`number`&&Number.isFinite(i.p.density)?Math.min(1.5,Math.max(0,i.p.density)):.8,s=Math.min(1,Math.max(0,(e-i.t)/2.5)),c=Math.min(1,Math.max(0,1-(e-i.t-i.dur)/8)),l=o*s*s*(3-2*s)*c;l>n&&(n=l,pt(typeof i.p.color==`string`?i.p.color:`white`,this.app.palette,this.deckFogTint,`primary`))}return n>0&&pm(this.deckFogTint,this.deckFogTint),n}writeLowFog(e){let t=this.shared.uLowFog.value;if(t.set(0,0,0,0),this.lowFogBeamK<=0&&this.lowFogGlowK<=0)return;let n=this.app.show.active(`fog`,e,this.fogBuf),r=0;for(let i=0;i<n.length;i++){let a=n[i];if(a.fx!==`lowfog`)continue;let o=typeof a.p.area==`string`?a.p.area:`deck`,s=typeof a.p.density==`number`&&Number.isFinite(a.p.density)?Math.min(1.5,Math.max(0,a.p.density)):.8,c=Math.min(1,Math.max(0,(e-a.t)/2.5)),l=Math.min(1,Math.max(0,1-(e-a.t-a.dur)/10)),u=s*c*c*(3-2*c)*l;if(u<=.001)continue;let d=o===`deck`||o===`all`?u:0,f=o===`deck`?a.p.spill===!1?0:u*.55:u,p=o===`field`||o===`all`?u*.65:0;t.x=Math.max(t.x,d),t.y=Math.max(t.y,f),t.z=Math.max(t.z,p),u>r&&(r=u,pt(typeof a.p.color==`string`?a.p.color:`white`,this.app.palette,this.shared.uLowFogTint.value,`primary`))}r>0&&(pm(this.shared.uLowFogTint.value,this.shared.uLowFogTint.value).lerp(this.cT.setRGB(1,1,1),Jp),t.w=Math.max(0,this.lowFogBeamK))}lowFogBeamK=qp;lowFogGlowK=Yp;lowAcc=new p;lowPos=new p;lowCol=new I;lowFogDensity(e,t){let n=this.shared.uLowFog.value,r=sm(-21,-16,t)*(1-sm(-1.5,1.5,t)),i=sm(-1.5,1.5,t)*(1-sm(40,60,t)),a=sm(28,52,t)*(1-sm(140,170,t)),o=1-sm(36,50,Math.abs(e));return(n.x*r+Math.max(n.y*i,n.z*a))*o}depositLowFog(e,t,n,r,i,a,o,s,c,l){let u=n<0?3.2:2.2,d=0,f=o;if(i<-1e-4)d=t>u?(t-u)/-i:0;else if(t>=u)return;else i>1e-4&&(f=Math.min(o,(u-t)/i));f=Math.min(f,d+60);let p=f-d;if(p<=.05)return;let m=0,h=0,g=0;for(let t=0;t<3;t++){let i=d+p*(.17+.33*t),o=e+r*i,s=n+a*i,c=this.lowFogDensity(o,s);m+=c,h+=c*o,g+=c*s}if(m<=1e-4)return;let _=m/3*Math.min(1,p/24)*((s+c+l)*.333),v=h/m,y=g/m,b=this.lowAcc;b.x+=_,b.y+=_*v,b.z+=_*y,b.w+=_*v*v,this.lowPos.x+=_*y*y;let x=m/3*Math.min(1,p/24);this.lowCol.r+=s*x,this.lowCol.g+=c*x,this.lowCol.b+=l*x}floodGlowSat=Pp;floodSatGain=Fp;floodHighK=1;cGS=new I;cGF=new I;cGX=new I;floodSetK=1;floodFlashK=1;floodGlowK=1;scatterK=1;deckHazeK=Bp;deckRigK=Vp;washGlowK=1;floorGlowK=1;archBeamK=Gp;archCanK=Wp;archGlowK=Kp;blindSetK=0;blindFlashK=.5;shaftK=.5;applyLaserAir(){if(!this.flood||!this.app.isSystemEnabled(`lights`))return;let e=this.flood.cols;for(let t=0;t<12;t++)e[t].copy(this.floodBase[t]);this.laserSys===void 0&&(this.laserSys=this.app.get(`lasers`)??null);let t=this.laserSys&&this.app.isSystemEnabled(`lasers`)?this.laserSys.airLight:null;if(t instanceof I&&t.r+t.g+t.b>1e-4){let e=lm(t,this.laserAirSat,this.cSL),n=this.laserAirK;this.addGlow(4,e,n),this.addGlow(5,e,n*1.2),this.addGlow(0,e,n*.5),this.addGlow(1,e,n*.8)}this.stageAll[0].copy(e[0]),this.stageAll[1].copy(e[1]),this.flood.update()}addGlow=(e,t,n)=>{if(n<=0)return;let r=this.flood.cols[e];r.x+=t.r*n,r.y+=t.g*n,r.z+=t.b*n};writeFestoon(e,t){let n=this.bulbs,r=.8+.7*Math.min(1,Math.max(0,this.app.env.haze)),i=this.rf?this.idx.calmFestoon:this.idx.festoon,a=this.festoonBlends,o=this.app.palette,s=0;for(let t=0;t<a.length;t++){let n=i[t].resolve(e,a[t]);n.to&&pt(n.to.color??`warm`,o,n.to.c1,`primary`),n.from&&pt(n.from.color??`warm`,o,n.from.c1,`primary`)}for(let i=0;i<n.length;i++){let o=n[i],c=a[o.str];if(!c.to&&!c.from)continue;let l=0,u=0,d=0;for(let n=0;n<2;n++){let r=n===0?c.to:c.from,i=n===0?c.k:1-c.k;if(!r||i<=0||r.mode===5)continue;let a=r.intensity*i*am(r,o,e,t,this.rf);l+=r.c1.r*a,u+=r.c1.g*a,d+=r.c1.b*a}if(l+u+d<.004)continue;s+=l+u+d;let f=xp*(o.size>.4?2.4:1);this.sprites.push(3,o.pos.x,o.pos.y,o.pos.z,0,0,1,0,l*f,u*f,d*f,o.size*r)}this.festoonLit=s}reduceFlashing(){return this.app.reduceFlashing===!0}rf=!1;setEnabled(e){this.enabled=e,this.root.visible=e}stats(){let e=this.rig,t=Au.map((t,n)=>{let r=e?e.classes.findIndex(e=>e.group===n):-1,i=r>=0?this.blends[r]:void 0;return`${t}:${i?.to?Td[i.to.preset]:`dark`}`}).join(` `);return{fixtures:e?.fixtures.length??0,emitters:e?.emitters.length??0,pillars:e?.pillars.length??0,density:Number(this.density.toFixed(2)),beams:this.nBeams,beamBudget:this.q?.beamBudget??0,pools:this.nPools,sprites:this.nSprites,drawCalls:7+ +!!this.flood?.mesh.visible,cues:this.idx.count,classes:e?.classes.length??0,looks:t,strobe:Number(this.strobeLevel.toFixed(2)),blinder:Number(this.blinderLevel.toFixed(2)),bulbs:this.bulbs.length,festoonLit:Number(this.festoonLit.toFixed(2)),floods:this.floods.length,floodSlices:this.flood?.mesh.visible?this.flood.slices:0,scatter:Number(this.scatter.toFixed(2)),storm:Number(this.storm.toFixed(2)),cpuMs:Number(this.cpuMs.toFixed(3))}}dispose(){this.beams.dispose(),this.pools.dispose(),this.sprites.dispose(),this.bodies.dispose(),this.glow.dispose(),this.shared.tNoise.value?.dispose(),this.root.removeFromParent()}};function Qp(e,t,n,r){let i=60/e.bpm*e.every,a=r-e.t0;if(a<0)return 0;let o=Math.floor(a/i),s=a/i-o;return em(e.pattern,o,t,n)?Math.exp(-s*3.4):0}function $p(e,t,n,r,i){let a=Xd(e),o=r-e.t0;if(o<0)return 0;let s=Math.floor(o/a),c=s;for(;c>=0&&s-c<4&&!i.ok(e.t0+c*a);)c--;if(c<0||s-c>=4)return np;let l=o-c*a;return em(e.pattern,c,t,n)?np+rp*om(l/tp)*Math.exp(-l/a*1.2):np}function em(e,t,n,r){switch(e){case`rl`:{let e=1-2*(t%8+.5)/8;return Math.abs(n-e)<1/8}case`center_out`:{let e=(t%5+.5)/5;return Math.abs(Math.abs(n)*1.6-e)<.5/5}case`out_center`:{let e=1-(t%5+.5)/5;return Math.abs(Math.abs(n)*1.6-e)<.5/5}case`random`:return Vf(t*1,r*131+7)>.35;default:{let e=-1+2*(t%8+.5)/8;return Math.abs(n-e)<1/8}}}function tm(e,t,n,r,i){let a=t-e.t0;if(a<0)return 0;switch(e.cue.fx){case`burst`:{if(r){let t=Yd(e),n=Math.floor(Math.min(a,Math.max(0,e.dur-.001))/t);if(!i.ok(e.t0+n*t))return 0;let r=a-n*t;return r<0?0:Math.exp(-r/.022)}let t=1/e.rate,n=a-Math.floor(Math.min(a,Math.max(0,e.dur-.001))/t)*t;return n<0?0:Math.exp(-n/.022)}case`kick`:{let a=n.phase*60/Math.max(40,n.bpm),o=t-a;return o<e.t0-.03||o>e.t0+e.dur||r&&(Math.floor(n.beat)&1||!i.ok(o))?0:Math.exp(-a/(r?.09:.035))}default:return r&&!i.ok(e.t0)?0:Math.exp(-a/.04)}}function nm(e,t,n,r,i,a,o,s){switch(t){case 1:{let e=.74+.2*Vf(a*6.5+n*3.1,n+77)+.1*Vf(a*17+n*1.7,n+191);return e<0?0:e>1?1:e}case 2:{let t=(a-e.t0)*e.bpm/60/(e.everySet?Math.max(.25,e.every):1),n=Math.max(1,i),o=t%n+0-r;return o<-.35&&(o+=n),.1+.9*Math.exp(-Math.max(0,o)*2.4)*Math.min(1,(o+.35)/.35)}case 3:{let e=o.phase*60/Math.max(40,o.bpm);return s?.75+.25*Math.exp(-e*4):.25+.75*Math.exp(-e*6)}case 5:{let t=e.everySet?Math.max(.25,e.every):.5,n=60/Math.max(40,o.bpm);if(s)for(;t*n<qd&&t<16;)t*=2;let r=o.beat/t,i=(r-Math.floor(r))*t*n;return s?.7+.3*Math.exp(-i*4):.06+.94*Math.exp(-i/.07)}case 4:return 0;default:return 1}}function rm(e,t,n){let r=60/Math.max(40,t.bpm),i=e.gate*r,a=t.beat/e.gate-e.gateOffset,o=(a-Math.floor(a))*i,s=om(o/.02)*(1-om((o-e.duty*i)/.03));return n?.75+.25*s:s}function im(e,t,n){let r=t-e.t0;if(r<0)return 0;let i=n?Math.max(.3,e.attack):e.attack,a=r<i?om(r/i):1,o=1;return r>e.dur&&(o=e.fade>0?1-om((r-e.dur)/e.fade):0),e.intensity*a*(o>0?o:0)}function am(e,t,n,r,i){switch(e.mode){case 1:{let e=.78+.16*Vf(n*7.3+t.seed*91,t.seed*997|0)+.12*Vf(n*19+t.seed*37,(t.seed*613|0)+5);return e<0?0:e>1?1:e}case 2:{let r=(((n-e.t0)*e.bpm/240-t.u)%1+1)%1;return .18+.82*Math.exp(-r*9)}case 3:{let e=Vf(n*3.1+t.seed*53,t.seed*4001|0),r=e>0?e:0;return Math.min(1,.35+1.4*r*r)}case 4:{let e=r.phase*60/Math.max(40,r.bpm);return i?.75+.25*Math.exp(-e*4):.3+.7*Math.exp(-e*6)}default:return 1}}function om(e){let t=e<0?0:e>1?1:e;return t*t*(3-2*t)}function sm(e,t,n){return om((n-e)/(t-e))}function cm(e){return(e.r+e.g+e.b)*.3333}function lm(e,t,n){let r=Math.max(e.r,e.g,e.b);return r<=1e-6?n.setRGB(0,0,0):n.setRGB(r*(Math.max(0,e.r)/r)**+t,r*(Math.max(0,e.g)/r)**+t,r*(Math.max(0,e.b)/r)**+t)}function um(e,t,n,r){let i=Math.max(e.r,e.g,e.b);if(t<=0||i<=1e-6)return r.copy(e);let a=Math.min(e.r,e.g,e.b),o=t*sm(.75,.9,1-a/i)*a;if(o<=0)return r.copy(e);let s=.2126*e.r+.7152*e.g+.0722*e.b;r.setRGB(e.r-o,e.g-o,e.b-o);let c=.2126*r.r+.7152*r.g+.0722*r.b;return r.multiplyScalar(c>1e-6?Math.min(n,s/c):1)}function dm(e){let t=e.matrixWorld.elements,n=Math.max(0,Math.abs(t[12])-30),r=Math.max(0,t[14]-8,-12-t[14]),i=Math.max(0,t[13]-9),a=Math.sqrt(n*n+i*i+r*r),o=1-Math.min(1,Math.max(0,(a-1)/11));o=o*o*(3-2*o);let s=Math.min(1,Math.max(0,(t[10]+.2)/.7));return o*s*s*(3-2*s)}function fm(e){let t=e.matrixWorld.elements,n=Math.min(1,Math.max(0,(t[14]-cd)/1.5)),r=Math.min(1,Math.max(0,(t[10]+.1)/.6));return .1+.9*n*r*r*(3-2*r)}function pm(e,t){let n=Math.max(e.r,e.g,e.b);return n<=1e-6?t.setRGB(0,0,0):t.setRGB(e.r/n,e.g/n,e.b/n)}var mm=0,hm=1,gm=2,_m=new I(.13,.105,.09),vm=new I(1,1,1),ym=new I(.62,.62,.64),bm=new I(1,.36,.08),xm=new I(1,.46,.14),Sm=new I(1,.3,.06),Cm=new I(1,.72,.4),wm=new I(1,.86,.66),Tm=.33,Em=2,Dm={life:.45,lifeH:.05,rise:.6,riseM:1.5,grow:.17,r0:.5,rate:30,bright:4,spread:.22,stretch:.12},Om={life:.4,lifeH:.03,rise:.25,riseM:0,grow:.1,r0:.6,rate:24,bright:2.8,spread:.45,stretch:.06},km=.9,Am=1.25,jm=.5,Mm=.62,Nm=250,Pm=1.6,Fm=14,Im=.6,Lm=.35,Rm=2.6,zm=12,Bm=.85,Vm=.5,Hm=60,Um=.75,Wm=.25,Gm=.3,Km=2.2,qm=2.2,Jm=.6,Ym=.3,Xm=12,Zm=.8,Qm=.5,$m=1.8,eh=.7,th=14,nh=.6,rh=.9,ih=new I(.8,.8,.82),ah=.8,oh=.09,sh=.55,ch=3.1,lh=1.45,uh=3.4,dh=class extends qs{name=`pyro`;sys=`pyro`;c1=new I;c2=new I;v1=new u;v2=new u;warm=1;buildLayers(e){let t=e.particleScale,n=this.shared.puffLayer(`pyro-smoke`,Math.round(6e3*Math.max(.35,t)),768,12),r=this.shared.puffLayer(`pyro-fire`,Math.round(16e3*Math.max(.35,t)),1024,13),i=this.shared.sparkLayer(`pyro-sparks`,e,Math.round(7e4*Math.max(.2,t)),1024,14,2);mh(i.mesh.material),this.layers=[n,r,i];for(let e of this.layers)this.app.scene.add(e.mesh)}lifetime(e){let t=e.p,n=X(t.stagger,.06)*30;switch(e.fx){case`flame`:return e.dur+Math.min(n,3)+7;case`firewall`:case`dragon_breath`:return e.dur+8;case`jet`:return e.dur+(ic(t.cloud,!1)?Math.max(4,X(t.life,2.8,.5,10)+1.5):2.5);case`gerb`:return e.dur+10;case`sparkular`:return e.dur+2.5;case`waterfall`:{let n=typeof t.height==`number`&&Number.isFinite(t.height)?Math.min(60,Math.max(3,t.height)):0;return e.dur+(n>0?Math.max(5,(n+4.36)/6.54+.5):5)}case`burst`:case`bengal`:return e.dur+12;default:return e.dur}}expand(e,t){switch(e.fx){case`flame`:this.flames(e,t,!1);break;case`firewall`:this.flames(e,t,!0);break;case`dragon_breath`:this.breath(e,t);break;case`jet`:this.jets(e,t);break;case`gerb`:this.fountains(e,t,!1);break;case`sparkular`:this.fountains(e,t,!0);break;case`waterfall`:this.waterfall(e,t);break;case`burst`:e.dur>=2||e.p.type===`bengal`||Array.isArray(e.p.path)?this.bengal(e,t):this.burst(e,t);break;case`bengal`:this.bengal(e,t)}}flameColor(e){let t=ec(e,this.palette,this.c1,`fire`),n=Math.max(t.r,t.g,t.b,1e-4);return t.multiplyScalar(1/n),this.warm=+(t.r>.98&&t.b<.35),this.warm&&t.lerp(bm,.7),t}rowLight(e,t,n,r,i,a,o,s,c,l,d,f=40,p=1){if(l>0&&p>0)for(let m of yc(n,r,f)){let f=n[m[0]],h=n[m[m.length-1]],g=1/0,_=-1/0;for(let e of m)g=Math.min(g,r[e]),_=Math.max(_,r[e]);let v=l*6*(1-Math.exp(-m.length/6)),y=new u(f.x,f.y+s,f.z),b=new u(h.x,h.y+s,h.z);e.lights.push({kind:1,t0:t.t+g*i,t1:t.t+_*i+a+o,decay:Math.max(.1,o),strobe:0,color:c.clone(),peak:v,pos:y.clone().add(b).multiplyScalar(.5),a:y,b,radius:d+.15*y.distanceTo(b),...p===1?{}:{gain:p}})}}wingLight(e,t,n,r,i,a,o){for(let s of n.bands){let n=Math.sqrt(Math.max(1,s.area)/Nm),c=Pm*Math.sqrt(n)*(r/6)**.5*o;if(!(c>0))continue;let l=s.a.distanceTo(s.b);e.lights.push({kind:1,t0:t.t,t1:t.t+i+.3,decay:.3,strobe:0,color:a.clone(),peak:c,pos:s.a.clone().add(s.b).multiplyScalar(.5),a:s.a.clone(),b:s.b.clone(),radius:Fm*n+.3*r+.1*l,haze:Im})}}rowFlash(e,t,n,r,i){let a=yc(t,n),o=0;for(let e of a)o+=e.length;if(o&&i.peak>0)for(let n of a){let a=new u;for(let e of n)a.add(t[e]);a.multiplyScalar(1/n.length),a.y+=r,e.flashes.push({...i,color:i.color.clone(),peak:i.peak*n.length/o,pos:a})}}groupFlash(e,t,n,r,i){if(t.length&&i.peak>0)for(let a of bc(t,n)){let n=new u;for(let e of a)n.add(e);n.multiplyScalar(1/a.length),n.y+=r,e.flashes.push({...i,color:i.color.clone(),peak:i.peak*a.length/t.length,pos:n})}}pointLight(e,t,n,r,i,a,o,s,c,l,u=1){s>0&&u>0&&e.lights.push({kind:t,t0:n,t1:r,decay:i,strobe:0,color:o.clone(),peak:s,pos:a.clone(),a:a.clone(),b:(l??a).clone(),radius:c,...u===1?{}:{gain:u}})}rowSmoke(e,t,n,r,i,a,o,s,c,l,d,f,p,m,h,g=.9,_=1,v=0){let y=yc(n,r),b=0;for(let e of y)b+=e.length;if(!b)return;let x=Math.max(1,Math.min(64,Math.round(l*Math.min(1,this.quality.particleScale*1.6)))),S=new u,C=new u,w=this.c2.copy(o).multiplyScalar(s);y.forEach((r,o)=>{S.set(1/0,1/0,1/0),C.set(-1/0,-1/0,-1/0);for(let e of r)S.min(n[e]),C.max(n[e]);let s=Math.max(1,Math.round(x*r.length/b)),l=(S.x+C.x)*.5,u=(S.y+C.y)*.5,y=(S.z+C.z)*.5;e.add(new W(H.BOX,U.SELFLIT).on(mm).origin(l,u+i,y).axis(C.x-S.x+1,1,C.z-S.z+1).time(d).dir(0,1,0,.5).speed(1,2.4).physics(.65,.4).color(ym,c).color2(w,0).life(p,m).emit(s,0,Math.max(.2,f)/s).size((.2*a+.5)*_,(.45*a+1.5)*_).trail(.6,.35).seed(this.sub(t,9999+o*131)).litUntil(v).set(V.X0,g).set(V.X1,.22).set(V.X2,.8).set(V.Y0,h).set(V.Y2,.12).set(V.Y3,1).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(d,d+f+m+.5))})}burnCloud(e,t,n,r,i,a,o,s,c,l,d,f){let p=yc(n,r),m=Math.min(1,this.quality.particleScale*1.4),h=1.3+.03*s,g=this.c2.copy(c).multiplyScalar(l),_=new u,v=new u;p.forEach((c,l)=>{_.set(1/0,1/0,1/0),v.set(-1/0,-1/0,-1/0);let u=1/0,p=0;for(let e of c)_.min(n[e]),v.max(n[e]),u=Math.min(u,r[e]*i),p=Math.max(p,r[e]*i);let y=c.length,b=Math.max(3,Math.round((4+1.6*Math.min(y,24))*m)),x=1+(1-m)*.5,S=a+u,C=o+(p-u);e.add(new W(H.BOX,U.SELFLIT|U.RAMP).on(mm).origin((_.x+v.x)*.5,(_.y+v.y)*.5+s*.28,(_.z+v.z)*.5).axis(v.x-_.x+2,s*.35,v.z-_.z+2).time(S).dir(0,1,0,.6).speed(1.5,4).physics(1.2,.8).color(ym,d).color2(g,0).life(h*.7,h).emit(b,C).size((.22*s+2)*x,(.4*s+3)*x).trail(.5,.35).seed(this.sub(t,8800+l*57)).litUntil(S+C).set(V.X0,h*.8).set(V.X1,.25).set(V.X2,.8).set(V.X3,Math.max(.12,Math.min(f,C*.45))).set(V.Y0,.75).set(V.Y2,.08).set(V.Y3,.6).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(S,S+C+h))})}points(e,t){let n=e.p,r=[],i=vh(n.pos),a=!i.length||ic(n.posAdd,!1),o=typeof n.at==`string`&&this.app.anchors.get(n.at).length?[n.at]:null;if(a)for(let n of this.app.anchors.resolve(o??e.targets,t)){let e=!1;for(let t=0;t<r.length&&!e;t++)e=r[t].distanceToSquared(n)<1.6;e||r.push(n.clone())}for(let e of i)r.push(e);let s=n.rows;if(Array.isArray(s)&&s.length&&r.length>1){let e=[];for(let t of[...r].sort((e,t)=>e.z-t.z))(!e.length||t.z-e[e.length-1]>3)&&e.push(t.z);let t=r.filter(t=>{let n=0;for(;n+1<e.length&&t.z-e[n+1]>-3;)n++;return s.includes(n+1)});t.length&&(r=t)}let c=ic(n.corners,!1),l=X(n.split,0,0,30);if(c||l>0){let t=e.targets.includes(`pillars_top`)||n.at===`pillars_top`,i=e.targets.includes(`pillars_base`)||n.at===`pillars_base`,a=[];for(let e of r)if(c&&t){let t=e.z+lh*(e.z>0?1:-1);a.push(new u(e.x-lh,e.y-ch,t),new u(e.x+lh,e.y-ch,t))}else if(c&&i){let t=e.z+uh;a.push(new u(e.x-uh,e.y,t),new u(e.x+uh,e.y,t))}else{let t=(l>0?l:2)*.5;a.push(new u(e.x-t,e.y,e.z),new u(e.x+t,e.y,e.z))}r=a}let d=_h(n.offset);if(d)for(let e of r)e.add(d);return r}flames(e,t,n){let r=e.p,i=X(r.height,n?6:8,.5,40);if(!n&&ic(r.fireball,!1)){this.fireballs(e,t,i);return}let a=n&&e.targets.length>0&&e.targets.every(e=>e===`wing_left`||e===`wing_right`),o=this.points(e,`deck_front`),s=[],c=null;if(a){if(c=pc(this.app.anchors.get(`wing_spars`),Em,.73-.31*wh(3.5,6,i)),c){let t=e.targets.includes(`wing_left`),n=e.targets.includes(`wing_right`);t&&n||(c=hh(c,t?-1:1)),{points:o,tops:s}=c}else({points:o,tops:s}=cc(o,this.app.anchors.get(`wing_tips`),1.8))}else n&&(o=mc(o,3.2));let l=this.flameColor(r.color),u=this.warm,d=rc(r.pattern,`all`),f=X(r.stagger,d===`all`?0:.06,0,2),p=X(r.intensity,1,0,3);if(!a&&ic(r.billow,i>=14&&o.length>8)){this.billowWall(e,t,o,i,l,p,d,f,ic(r.blowout,!1),X(r.width,1,.3,4));return}let m=X(r.angle,0,-80,80),h=Math.round(X(r.fan,1,1,7)),g=X(r.fanSpread,50,0,160),_=sc(o,d,e.seed,e.step),v=Math.max(.12,e.dur),y=!a&&i>=12&&o.length<=8,b=X(r.width,1,.3,4),x=(a?.8:y?.75+.055*i:.28+.03*i)*b,S=(a?.39*i:y?.25*i:.13*i)*b*(u?1:1.35),C=(a?.75:.5)+(y?.055:.05)*i,w=a?2:2.4,T=7.5,E=T/w,D=C*.75,O=E+((a?.45:.93)*i-E*D)*w/(1-Math.exp(-w*D)),k=a?24:y?52:38,A=this.pc(k*C/Math.sqrt(h),8),ee=u?a?.7:y?.5:.55:.08,te=a?.45:y?.62:.58,j=0,ne=0;for(let r=0;r<o.length;r++){if(_[r]<0)continue;let s=o[r],d=n?.85+.3*gh(e.seed,r,3):.94+.12*gh(e.seed,r,3),D=e.t+_[r]*f;j=Math.max(j,_[r]*f);let k=this.sub(e,r*8),M=C,re=O,ie=x,N=S,ae=A,oe=(u?a?5:8:6)*p,se=a?.42:y?.38:.075,P=a?.02:y?.04:.075,F=c!==null&&c.level[r]>.99;if(c){let e=c.level[r],t=F?Dm:Om;M=t.life+t.lifeH*i;let n=M*.75;re=Math.max(.8,E+(i*t.rise+t.riseM-E*n)*w/(1-Math.exp(-w*n))),ie=t.r0*b,N=i*t.grow*b*(u?1:1.35),ae=this.pc(t.rate*M,6),oe=(u?t.bright:t.bright*1.2)*(F?1:.6+.4*e)*p,se=t.spread,P=t.stretch}for(let e=0;e<h;e++){let n=h>1?m+g*(e/(h-1)-.5):m,r=vc(s.x,n,this.v1),o=new W(c&&!F?H.BOX:H.CONE,U.RAMP);c&&!F&&o.axis(Em*1.1,Em*.9,.4),t.add(o.on(hm).originV(s).time(D).dirV(r,se).speed(re*d*.86,re*d*1.06).physics(w,T).color(l,oe).color2(_m,u).life(M*.8,M*1.05).emit(ae,v).size(ie,N*d).trail(a?.7:.9,c?km:.55+.02*i).seed(k+e*13681).set(V.X1,1.5).set(V.X2,c?Am:.95).set(V.X3,.06).set(V.Y0,c?ee*jm:ee).set(V.Y1,c?Mm:te).set(V.Y3,.6).set(V.Z2,P).set(V.Z3,rn.FLAME).window(D,D+v+M*1.1))}let ce=vc(s.x,m,this.v1);a||t.add(new W(H.SINGLE,0).on(hm).origin(s.x+ce.x*.6,s.y+ce.y*.6,s.z).time(D).dirV(ce).speed(.5).physics(1,0).color(this.c2.copy(l).lerp(vm,u?.5:.15),(u?3.5:2)*p).life(.1,.14).emit(3,v).size(x*.9*(h>1?1.4:1),.3).trail(1,1).seed(k^85).set(V.X0,.2).set(V.Z3,rn.GLOW).window(D,D+v+.15)),!a&&(o.length<10||r%3==0)&&t.add(new W(H.SINGLE,U.RAMP).on(hm).origin(s.x+ce.x*i*.45,s.y+ce.y*i*.45,s.z).time(D).dirV(ce).speed(.4).physics(1,0).color(l,.12*p).life(.35,.45).emit(2,v).size(.18*i+.8+S*.2,.08*i).trail(1,1).seed(k^102).set(V.X3,.12).set(V.Z3,rn.GLOW).window(D,D+v+.5)),ne++}if(ne>0){if(a&&s.forEach((n,r)=>this.fireball(t,this.sub(e,7e3+r),n.x+Math.sign(n.x)*1.5,n.y+i*.2,n.z,e.t+.12+.05*r,.5*i,l,1,.2,0,!0,c?Lm:1)),y)for(let n=0;n<o.length;n++)_[n]>=0&&this.fireball(t,this.sub(e,n*8+3),o[n].x,o[n].y+i*.9,o[n].z,e.t+_[n]*f+v-.1,.2*i*b,l,p*.8,.3);u&&this.rowSmoke(t,e,o,_,i*.8,i,l,2,(a?.16:.1)*p,(1+v)*Math.min(ne,30),e.t+.25,v+j,3.2,5,.35,.9,1,e.t+j+v+.2);let n=u?xm:l,d=(a?.22:.5)*(i/8)**.8*p*(u?1:.8)*Math.sqrt(h),m=X(r.light,1,0,4),g=Math.sqrt(Math.max(1,m));c?this.wingLight(t,e,c,i,v+j,n,p*(u?1:.8)*m):this.rowLight(t,e,o,_,f,v,.3,i*.45,n,d,typeof r.reach==`number`?X(r.reach,10,2,120):(.45*i+(a?2.5:6))*g,a?14:40,m),this.rowFlash(t,o,_,i*.5,{kind:1,t0:e.t,t1:e.t+j+v+.35,color:l,peak:Math.min(2.2,.05*ne*(i/8)+.25)*p*(u?1:.7)*m,decay:.35,strobe:0})}}billowWall(e,t,n,r,i,a,o,s,c,l){let u=this.warm,d=Math.min(1.8,Math.max(.7,Math.sqrt(l))),f=Math.max(4.5,Math.min(8,.22*r)),p=[],m=[...n].sort((e,t)=>oc(e)-oc(t)||e.z-t.z),h=null;for(let e of m)h&&e.distanceTo(h)<f||(p.push(e),h=e);let g=sc(p,o,e.seed,e.step),_=Math.max(.3,e.dur),v=g.filter(e=>e>=0).length,y=r*(.8+.2*Math.min(1,_/1.2)),b=wh(1.3,1.7,d),x=1.5+.035*y,S=.45,C=3+((.78+.35*(d-1)+Jm*b)*y-3*S)*3/(1-Math.exp(-3*S)),w=this.pc(30*x*Math.min(1,Math.sqrt(26/Math.max(1,v))),10),T=0;for(let n=0;n<p.length;n++){if(g[n]<0)continue;let o=p[n],l=e.t+g[n]*s;T=Math.max(T,g[n]*s);let f=this.sub(e,n*8),m=.8+.4*gh(e.seed,n,5);if(t.add(new W(H.CONE,U.RAMP).on(hm).origin(o.x,o.y+.5,o.z).time(l).dir(0,1,.05+.2*(d-1),.3+.1*(d-1)).speed(C*m*.55,C*m*1.05).physics(3,9).color(i,(u?6.5:4.5)*a*(1+.6*(d-1))).color2(_m,u).life(x*.75,x).emit(w,_).size((1.4+.04*r)*d*(1+Ym*b),.3*y*m*d*(1+Ym*b)).trail(.45,.32).seed(f).set(V.X1,1.1).set(V.X2,1.25).set(V.X3,.1).set(V.Y0,u?.55/d:.08).set(V.Y1,.55).set(V.Y3,.8).set(V.Z1,.5/(d*d)).set(V.Z2,.012).set(V.Z3,rn.FLAME).set(V.X0,Wm*b).window(l,l+_+x*1.05)),t.add(new W(H.CONE,U.RAMP).on(hm).originV(o).time(l).dir(0,1,0,.12).speed(C*.5,C*.65).physics(3.2,9).color(i,(u?7:5)*a/d).color2(_m,u).life(.32,.42).emit(this.pc(28,8),_).size(.7+.02*r,.1*r).trail(.8,.5).seed(f^43).set(V.X1,1.4).set(V.X2,.9).set(V.X3,.05).set(V.Y0,.1).set(V.Y1,.8).set(V.Y3,.5).set(V.Z2,.05).set(V.Z3,rn.FLAME).set(V.X0,Gm).window(l,l+_+.5)),c&&n%2==0){let e=ln(r*.9,1.05),n=un(e,1.05);t.add(new W(H.CONE,U.COOL|U.FLICKER|U.RAMP|U.CUT).on(gm).origin(o.x,o.y+.3,o.z+.5).time(l).dir(0,1,.08,.2).speed(e*.7,e).physics(1.05,-9.81).color(Cm,14*a).color2(Sm,-1).life(n*.8,n*1.7).emit(this.pc(420*n,40),_).size(.05,.45).trail(.12,.3).seed(f^90).set(V.X3,.15).set(V.Y0,.85).set(V.Y3,.3).set(V.Z0,.02).set(V.HZ,l+_).window(l,l+_+nn))}}if(!v)return;for(let n=0;c&&n<p.length;n++){if(g[n]<0)continue;let r=p[n];this.fireball(t,this.sub(e,9100+n),r.x,r.y+y*.75,r.z,e.t+g[n]*s+_-.15,.2*y,i,a*.6,.35,.45,n%6==1,.4)}this.rowSmoke(t,e,p,g,y*.85,y*1.3,i,4,.34*a,(3+_*3)*Math.min(v,30),e.t+.25,_+T,5,8,.5,1.6,e.t+T+_+.3);let E=u?xm:i;this.rowLight(t,e,p,g,s,_,c?.45:.25,y*.45,E,1.1*(y/20)**.7*a*(c?1.4:1),.4*y+10);let D=c?.45:.25;this.rowFlash(t,p,g,y*.5,{kind:1,t0:e.t,t1:e.t+T+_+D,color:i,peak:Math.min(c?3.2:2.6,.1*v+.6)*a*(u?1:.7),decay:D,strobe:0})}fireball(e,t,n,r,i,a,o,s,c,l,u=0,d=!0,f=1,p=1){let m=(1.1+.06*o)*p,h=this.pc(10+3*o,8);e.add(new W(H.SPHERE,0).on(hm).origin(n,r,i).time(a).speed(o*1.1,o*2.2).physics(2.6,6).color(s,7*c).color2(_m,this.warm).life(m*.75,m).emit(h,0,.3/h).size(o*.3,o*.55).trail(.6,.5).seed(t).set(V.X1,1.2).set(V.X2,.9).set(V.Y0,this.warm?.9:.1).set(V.Y1,.3+l).set(V.Y3,.6).set(V.Z1,u).set(V.Z3,rn.FLAME).window(a,a+.3+m)),this.warm&&e.add(new W(H.SPHERE,U.SELFLIT).on(mm).origin(n,r+o*.6,i).time(a+m*.5).speed(.5,1.5).physics(.8,1.6).color(this.c2.setRGB(.14,.12,.11),.42).color2(this.c2.copy(s).multiplyScalar(1.5),0).litUntil(a+m).life(3.5,5).emit(Math.max(2,Math.round(5*Math.min(1,this.quality.particleScale*1.6))),0,.06).size(o*.45,o*.8).trail(.5,.3).seed(t^153).set(V.X0,.5).set(V.X1,.25).set(V.X2,.8).set(V.Y0,.25).set(V.Y2,.1).set(V.Y3,1).set(V.Z0,.6).set(V.Z3,rn.SMOKE).window(a+m*.5,a+m*.5+5.5)),d&&e.add(new W(H.SINGLE,0).on(hm).origin(n,r,i).time(a).dir(0,1,0).speed(1).physics(1,0).color(s,.9*c).life(.7).emit(1).size(Math.min(o*1.6,14),o*.6).trail(.6,1).seed(t^119).set(V.X0,.35).set(V.Z3,rn.FLASH).window(a,a+.75)),this.v1.set(n,r,i),f>0&&this.pointLight(e,1,a,a+m*.9,m*.5,this.v1,this.warm?xm:s,1.8*f*c*Math.sqrt(o/5),o*2+6)}fireballs(e,t,n){let r=e.p,i=this.points(e,`corner_fireballs`),a=this.flameColor(r.color),o=X(r.size,1,.3,60),s=o>3.5?Math.min(3,Math.max(.3,o/(1.4*(2.2+.14*n)))):o,c=(2.2+.14*n)*s,l=i.length,u=l>6,d=X(r.intensity,1,0,3)*(u?Math.max(.42,Math.sqrt(6/l)):1),f=u?Math.ceil(l/6):1;i.forEach((r,i)=>{let o=this.sub(e,i*8);t.add(new W(H.CONE,U.RAMP).on(hm).originV(r).time(e.t).dir(0,1,0,.12).speed(n*2.6,n*3.1).physics(3,6).color(a,8*d).color2(_m,this.warm).life(.3,.42).emit(this.pc(22,6),.28).size(.6,c*.25).trail(.9,.6).seed(o).set(V.X1,1.5).set(V.X2,.9).set(V.X3,.05).set(V.Y0,.3).set(V.Y1,.7).set(V.Z2,.08).set(V.Z3,rn.FLAME).window(e.t,e.t+.8)),this.fireball(t,o^15420,r.x,r.y+n*.75,r.z,e.t+(u?.06+.12*gh(e.seed,i,9):.18),c,a,d,.15,u?.45:0,i%f===0,u?.5:1,u?.72:1)}),i.length&&this.groupFlash(t,i,30,n,{kind:1,t0:e.t,t1:e.t+1.6,color:a,peak:Math.min(2.4,.9*i.length*s*d),decay:.8,strobe:0})}breath(e,t){let n=e.p,r=this.app.anchors.get(`dragon_mouth`)[0]??new u(0,11,-2),i=X(n.length,18,3,60),a=this.flameColor(n.color),o=Math.max(.3,e.dur),s=1.15,c=2.1,l=i/((1-Math.exp(-2.1*s))/c),d=this.sub(e,1),f=this.v1.set(0,X(n.pitch,.16,-1,1),1).normalize();t.add(new W(H.CONE,U.RAMP).on(hm).originV(r).time(e.t).dirV(f,.11).speed(l*.8,l*1.05).physics(c,6).color(a,14).color2(_m,this.warm).life(s*.75,s*1.1).emit(this.pc(60*s,16),o).size(.5,.3*i).trail(.7,.45).seed(d).set(V.X1,1.2).set(V.X2,1).set(V.X3,.1).set(V.Y0,.55).set(V.Y1,.55).set(V.Y3,.5).set(V.Z3,rn.FLAME).window(e.t,e.t+o+s*1.2)),t.add(new W(H.SINGLE,0).on(hm).originV(r).time(e.t).dirV(f).speed(1).physics(1,0).color(this.c2.copy(a).lerp(vm,.6),14).life(.1,.14).emit(3,o).size(1.6,.5).trail(1,1).seed(d^3).set(V.Z3,rn.GLOW).window(e.t,e.t+o+.15));let p=Math.max(2,Math.round(3*o*Math.min(1,this.quality.particleScale*1.6)));t.add(new W(H.CONE,U.SELFLIT).on(mm).origin(r.x,r.y+3,r.z+i*.6).time(e.t+.3).dir(0,1,.3,.5).speed(1.5,3).physics(.6,.5).color(ym,.2).color2(this.c2.copy(a).multiplyScalar(2.5),0).litUntil(e.t+o+.3).life(5,8).emit(p,0,o/p).size(3,9).trail(.6,.3).seed(d^9).set(V.X0,.8).set(V.X2,.8).set(V.Y0,.4).set(V.Y2,.12).set(V.Y3,1).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(e.t+.3,e.t+o+8.5));let m=r.clone().addScaledVector(f,i*.75);this.pointLight(t,1,e.t,e.t+o+.4,.4,r,this.warm?xm:a,2.4,10,m),t.flashes.push({kind:1,t0:e.t,t1:e.t+o+.4,color:a.clone(),peak:1.6,decay:.4,pos:r.clone().add(new u(0,2,i*.4)),strobe:0})}jets(e,t){let n=e.p,r=this.points(e,`deck_front`),i=X(n.height,8,1,25),a=ec(n.color,this.palette,this.c1,`white`),o=rc(n.pattern,`all`),s=X(n.stagger,o===`all`?0:.05,0,2),c=X(n.angle,0,-80,80),l=Math.round(X(n.count,1,1,12)),d=X(n.radius,2.5,0,20),f=ic(n.cloud,!1),p=X(n.glow,1,0,4),m=X(n.life,2.8,.5,10),h=[],g=[];for(let e of r){if(l<=1){h.push(e),g.push(0);continue}for(let t=0;t<l;t++){let n=t/l*Math.PI*2+.3;h.push(new u(e.x+Math.cos(n)*d,e.y,e.z+Math.sin(n)*d)),g.push(n)}}let _=sc(h,o,e.seed,e.step),v=Math.max(.2,e.dur),y=3.2,b=ln(i*1.05,y,4),x=1.7;for(let n=0;n<h.length;n++){if(_[n]<0)continue;let r=h[n],o=e.t+_[n]*s,u=vc(r.x,c,this.v1);l>1&&(u.x+=Math.cos(g[n])*.12,u.z+=Math.sin(g[n])*.12,u.normalize()),t.add(new W(H.CONE,U.RAMP).on(mm).originV(r).time(o).dirV(u,.07).speed(b*.85,b*1.05).physics(y,-3).color(vm,.5).color2(this.c2.copy(a).multiplyScalar(.9*p),0).life(x*.7,x).emit(this.pc(34*x/Math.sqrt(l),10),v).size(.25,.32*i).trail(.55,.5).seed(this.sub(e,n)).set(V.X1,1).set(V.X2,.7).set(V.X3,.05).set(V.Y0,.9).set(V.Y2,.04).set(V.Y3,.3).set(V.Z0,1.3).set(V.Z2,.045).set(V.Z3,rn.CO2).window(o,o+v+x))}if(f&&h.length){let r=new u(1/0,1/0,1/0),o=new u(-1/0,-1/0,-1/0);for(let e of h)r.min(e),o.max(e);let s=r.clone().add(o).multiplyScalar(.5),c=o.sub(r),l=X(n.size,1,.3,4),d=_h(n.drift),f=d?d.length():0,g=(Math.min(c.x*.45,3*i)+i*.6)*l,_=this.pc((34+1.5*Math.min(40,h.length))*Math.min(2.5,Math.sqrt(l)),14),y=new W(H.BOX,0);d&&f>.01?y.dir(d.x/f,d.y/f,d.z/f,.5).speed(f*.55,f*1.2):y.dir(.3,1,.05,.9).speed(1.5,4),t.add(y.on(mm).origin(s.x,s.y+i*.7*Math.min(1,l),s.z).axis(g,i*.5*l,(Math.min(c.z,2*i)+i*.4)*l).time(e.t+.08).physics(1.2,.8).color(this.c2.copy(a).lerp(vm,.35),.6).color2(this.c1.copy(a).multiplyScalar(1.2*p),0).life(n.life===void 0?1.8:m*.643,m).emit(_,0,Math.min(v,1.2)/_).size(.3*i*l,.6*i*l).trail(.5,.3).seed(this.sub(e,7777)).set(V.X1,.3).set(V.X2,.75).set(V.Y0,.9).set(V.Y2,.08).set(V.Y3,.6).set(V.Z0,1.3).set(V.Z3,rn.CO2).window(e.t,e.t+Math.min(v,1.2)+(n.life===void 0?3.1:m+.3)))}}fountains(e,t,n){let r=e.p,i=this.points(e,`deck_front`),a=X(r.height,n?3.5:8,.5,40),o=rc(r.pattern,`all`),s=X(r.stagger,o===`all`?0:.05,0,2),c=X(r.angle,0,-80,80),l=n?1:1-.6*wh(14,30,a),u=X(r.spread,n?7:Math.min(10,4+.28*a)*l,0,60)*Math.PI/180,d=sc(i,o,e.seed,e.step),f=Math.max(.3,e.dur),p=n?1.9:1.05,m=!n&&a>14,h=ln(a,p)*(m?1.14:1),g=un(h,p),_=m?g*.5:g*.75,v=n?g*1.5:g*(m?.78:1.75),y=n?320:280+14*a,b=0;for(let e=0;e<d.length;e++)d[e]>=0&&b++;let x=this.pc(y*v*Math.min(1,Math.sqrt(28/Math.max(1,b))),40),S=X(r.intensity,1,0,3),C=!n&&ic(r.column,!1),w=n?1:Math.round(X(r.fan,1,1,7)),T=X(r.fanSpread,70,0,160),E=X(r.lean,m&&i.length>=8&&r.angle===void 0&&w===1?Xm:0,-30,45),D=r.spread===void 0?Zm:0,O=X(r.light,1,0,4),k=typeof r.glow==`number`&&Number.isFinite(r.glow)?Math.min(2,Math.max(0,r.glow)):-1,A=(Array.isArray(r.lightColor)?r.lightColor:[r.lightColor]).map(e=>typeof e==`string`&&e?Ch(ec(e,this.palette,new I,`gold`)):null),ee=A[0]??null,te=Math.min(3,typeof r.smoke==`number`?r.smoke:+!!ic(r.smoke,!1)),j=xh(r.colors),ne=j.length?j:[r.color],M=ne.length,re=bh(r.changes);M>1&&re.length>=M&&re[0]<=.05&&re.shift();let ie=[0];for(let e=1;e<M;e++)ie.push(Math.min(f,Math.max(ie[e-1]+.05,re[e-1]??f*e/M)));ie.push(f);let N=0,ae=0,oe=new I,se=[],P=[];for(let e=0;e<M;e++){let t=jh(ec(ne[e],this.palette,this.c1,n?`warm`:`gold`),new I);se.push(t),P.push(Ah(t))}for(let o=0;o<M;o++){let l=ie[o],g=Math.max(.05,ie[o+1]-l),y=se[o];o===0&&oe.copy(y);let b=kh(y),k=!b&&Eh(y),j=Oh(y),ne=b||k?0:1-wh(.12,.3,Th(y)),re=o+1<M?this.c2.copy(se[o+1]).multiplyScalar(P[o+1]/P[o]).clone():null,F=b?wm.clone():k?Sm.clone():y.clone().multiplyScalar(.55),ce=P[o],le=S*(n?11:17)*ce,ue=b||j?.6:k?.45:.18+.42*ne,de=b&&m&&S<1.3?1-sh*Sh(a):1;for(let r=0;r<i.length;r++){if(d[r]<0)continue;let O=i[r],A=e.t+d[r]*s+l,ee=e.t+d[r]*s+f;o===0&&(ae=Math.max(ae,d[r]*s));let ne=E===0?0:wh(40,88,Math.abs(O.x)),ie=this.sub(e,r*4+o*997),oe=o===0?U.RAMP:0;for(let e=0;e<w;e++){let r=(w>1?c+T*(e/(w-1)-.5):c)+E*ne,i=vc(O.x,r,this.v2),a=new W(H.CONE,U.COOL|U.FLICKER|U.CUT|oe|(re?U.ABSCHANGE:0)|(C?fh:0));re?a.color2(re,0).set(V.Z3,A+g):a.color2(F,-1),t.add(a.on(gm).originV(O).time(A).dirV(i,u*(1+D*ne)).speed(h*.72,h*1.02).physics(p,-9.81).color(y,le).life(_,v).emit(Math.max(10,Math.round(x*de*Math.min(1,g/f+.35)/Math.max(1,Math.sqrt(M))/Math.sqrt(w))),g).size(n?.03:.05,.45).trail(n?.06:.12,n?.55:.3).seed(ie+e*13681).set(V.X3,m?.06:.18).set(V.Y0,.85).set(V.Y3,.3).set(V.Z0,.02).set(V.HZ,ee).window(A,Math.min(A+g+v,ee+nn)))}let se=vc(O.x,c+E*ne,this.v1);t.add(new W(H.SINGLE,U.RAMP).on(hm).origin(O.x,O.y+.25,O.z).time(A).dirV(se).speed(.3).physics(1,0).color(this.c2.copy(y).lerp(vm,ue),(n?4:7)*(b||k?1:.8)).life(.09,.12).emit(3,g).size(n?.35:.55,.3).trail(1,1).seed(ie^5).set(V.X3,.15).set(V.Z3,rn.GLOW).window(A,A+g+.15));let P=!n&&(b||k);if(t.add(new W(H.CONE,U.RAMP).on(hm).originV(O).time(A).dirV(se,u*.5).speed(h*.55,h*.8).physics(p,-9.81).color(this.c2.copy(y).lerp(vm,P?b||j?.9:.7:ue*.75),(n?1.6:2.6)*(b||k?1:1.15)*(P?Km*Math.min(1.2,Math.sqrt(S)):1)).life(.22*(P&&m?qm:1),.3*(P&&m?qm:1)).emit(this.pc((n?14:20)*(P&&m?1.5:1),6),g).size(n?.14:P&&m?.45+.02*a:.2+.012*a,P&&m?.025*a:.1).trail(1,1).seed(ie^6).set(V.X3,.15).set(V.Z2,.05).set(V.Z3,rn.GLOW).window(A,A+g+.35)),te>0&&o===0){let e=Math.max(3,Math.round(6*te*Math.min(1,this.quality.particleScale*1.6)*Math.max(1,f)));t.add(new W(H.CONE,U.SELFLIT).on(mm).origin(O.x,O.y+1,O.z).time(A).dir(0,1,0,.22).speed(6,11).physics(.7,1.4).color(ym,.3*Math.min(1.5,te)).color2(this.c2.copy(y).multiplyScalar(3),0).litUntil(A+f).life(4,7).emit(e,0,f/e).size(.6,.18*a+3).trail(.45,.3).seed(ie^12593).set(V.X0,f*.8+.4).set(V.X1,.2).set(V.X2,.8).set(V.Y0,.6).set(V.Y2,.08).set(V.Y3,1).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(A,A+f+7.5))}o===0&&N++}let fe=(n?.05:.2*(a/10)**.6)*S*(b?1-.6*Sh(a):k?1:.85);this.rowLight(t,{...e,t:e.t+l},i,d,s,g,.25,a*.4,(Array.isArray(r.lightColor)?A[o]:ee)??Dh(y,this.c1),fe,typeof r.reach==`number`?X(r.reach,10,2,120):(.35*a+5)*Math.sqrt(Math.max(1,O)),40,O)}if(N>0){if(ee?oe.copy(ee):Dh(oe,oe),!n){let n=Math.min(1,Math.max(0,(S-1.5)/1.5)),r=.6*wh(18,30,a)*wh(2.5,4,f),o=k>=0?k:Math.max(n,r);o>=.08&&this.burnCloud(t,e,i,d,s,e.t,f,a,oe,4.5*Math.sqrt(o)*(P[0]<1?.8:1),.17*Math.min(1.3,o),k>=0||n>=r?.12:3);let c=kh(se[0])?Sh(a):0;this.rowSmoke(t,e,i,d,a*.35,a,oe,1.4*(1-ah*c)*Math.min(2,Math.max(1,S)),.14-oh*c,(1+f*.8)*N,e.t+.3,f+ae,6,9,.7,.9,1,e.t+ae+f+.2)}this.rowFlash(t,i,d,a*.5,{kind:1,t0:e.t,t1:e.t+ae+f+.3,color:oe,peak:Math.min(1.6,(n?.012:.03)*N*Math.sqrt(a/8)+.1)*O,decay:.4,strobe:0})}}waterfall(e,t){let n=e.p,r=this.points(e,`roof`).sort((e,t)=>e.x-t.x),i=ec(n.color,this.palette,this.c1,`gold`),a=Math.max(.5,e.dur),o=[];r.length===1&&o.push([r[0].clone().add(new u(-5,0,0)),r[0].clone().add(new u(5,0,0))]);for(let e=0;e+1<r.length;e++)r[e].distanceTo(r[e+1])<30&&o.push([r[e],r[e+1]]);let s=X(n.density,1,.2,4),c=typeof n.height==`number`&&Number.isFinite(n.height)?Math.min(60,Math.max(3,n.height)):0,l=X(n.columns,0,0,20),d=c>0?Math.max(1,(c+4.36)/6.54):3.2,f=c>0?d*.56:1.8,p=new u;o.forEach(([n,r],o)=>{let u=n.distanceTo(r),m=this.pc(u*30*d*s,30);if(l>0){let s=Math.max(1,Math.round(u/l)+1),c=Math.max(8,Math.round(m/s));for(let l=0;l<s;l++){let u=s>1?l/(s-1):.5;t.add(new W(H.CONE,U.COOL|U.FLICKER|U.RAMP).on(gm).origin(n.x+(r.x-n.x)*u,n.y+(r.y-n.y)*u,n.z+(r.z-n.z)*u).time(e.t).dir(0,-1,.04,.14).speed(1.5,4.5).physics(1.5,-9.81).color(i,11).life(f,d).emit(c,a).size(.045,.45).trail(.13,.5).seed(this.sub(e,o*64+l)).set(V.X3,.3).set(V.Y0,.8).set(V.Y3,.4).window(e.t,e.t+a+d))}}else t.add(new W(H.LINE,U.COOL|U.FLICKER|U.RAMP).on(gm).originV(n).time(e.t).dir(0,-1,.15,.6).speed(.3,2.2).physics(1.5,-9.81).color(i,11).life(f,d).emit(m,a).size(.045,.45).trail(.13,.5).axis(r.x-n.x,r.y-n.y,r.z-n.z).seed(this.sub(e,o)).set(V.X3,.3).set(V.Y0,.8).set(V.Y3,.4).window(e.t,e.t+a+d));let h=c>0?c*.3:3;this.pointLight(t,1,e.t,e.t+a+.6,.6,n.clone().setY(n.y-h),i,(.35+.02*u)*Math.sqrt(s),9+(c>0?.25*c:0),r.clone().setY(r.y-h)),p.add(n).add(r)}),o.length&&(p.multiplyScalar(1/(o.length*2)),t.flashes.push({kind:1,t0:e.t,t1:e.t+a+.5,color:i.clone(),peak:Math.min(1.2,.08*o.length+.1)*Math.sqrt(s),decay:.8,pos:p,strobe:0}))}burst(e,t){let n=e.p,r=this.points(e,`deck_front`),i=X(n.size,1,.2,5),a=ec(n.color,this.palette,this.c1,`warm`),o=Math.sqrt(i);r.forEach((n,r)=>{let s=this.sub(e,r*4);t.add(new W(H.SINGLE,0).on(hm).origin(n.x,n.y+1.4*i,n.z).time(e.t).dir(0,1,0).speed(1.5).physics(1,0).color(this.c2.copy(a).lerp(bm,.25).lerp(vm,.3),32*o).life(.45).emit(1).size(2.8*i,1.5*i).trail(.5,1).seed(s).set(V.X0,.09).set(V.Z3,rn.FLASH).window(e.t,e.t+.5)),t.add(new W(H.HEMI,U.COOL|U.FLICKER).on(gm).originV(n).time(e.t).speed(10*o,26*o).physics(2.1,-9.81).color(a,16).life(.6,1.4).emit(this.pc(80,20)).size(.06,.4).trail(.12,.4).seed(s^1).set(V.Y0,.9).set(V.Z0,.01).window(e.t,e.t+1.7)),t.add(new W(H.SPHERE,U.SELFLIT).on(mm).origin(n.x,n.y+1.2*i,n.z).time(e.t).speed(3*o,7*o).physics(1.6,.6).color(ym,.3).color2(this.c2.copy(a).multiplyScalar(6),0).litUntil(e.t+.5).life(7,10).emit(Math.max(2,Math.round(6*Math.min(1,this.quality.particleScale*1.6)))).size(1.3*i,5*i).trail(.55,.35).seed(s^2).set(V.X0,.25).set(V.X1,.2).set(V.X2,.8).set(V.Y0,.55).set(V.Y2,.03).set(V.Y3,1).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(e.t,e.t+10.5))});let s=X(n.light,1,0,4),c=typeof n.lightColor==`string`&&n.lightColor?Ch(ec(n.lightColor,this.palette,new I,`warm`)):null;if(r.length){this.groupFlash(t,r,30,2,{kind:0,t0:e.t,t1:e.t+1.2,color:c??a,peak:Math.min(3,1.1*i+.1*r.length)*s,decay:.25,strobe:0});for(let n of bc(r,30)){let r=new u(1/0,0,1/0),l=new u(-1/0,0,-1/0),d=0;for(let e of n)r.min(e),l.max(e),d+=e.y;r.y=l.y=d/n.length+2,this.pointLight(t,0,e.t,e.t+1.2,.3,r,c??a,Math.min(8,2.5*i*Math.sqrt(n.length)),10+5*o,l,s),i>=$m&&this.blastCloud(t,e,n,i,a,s,c)}}}blastCloud(e,t,n,r,i,a=1,o=null){let s=new u(1/0,1/0,1/0),c=new u(-1/0,-1/0,-1/0);for(let e of n)s.min(e),c.max(e);let l=s.clone().add(c).multiplyScalar(.5),d=wh($m,3,r),f=6+6*r,p=this.pc(30+16*r,10),m=t.t+Math.max(.3,t.dur)+eh;e.add(new W(H.BOX,U.SELFLIT).on(mm).origin(l.x,l.y+1.5,l.z+2).axis(c.x-s.x+4,2,c.z-s.z+4).time(t.t).dir(0,1,.55,1.1).speed(8*r,20*r).physics(2.3,1.2).color(ih,.6*(.6+.4*d)).color2(this.c2.copy(i).lerp(vm,.3).multiplyScalar(th*(.5+1.5*d)),0).litUntil(m).life(3.5,5.5).emit(p,0,.22/p).size(.35*f,f).trail(.35,.3).seed(this.sub(t,6100+Math.round(l.x))).set(V.X0,eh).set(V.X1,.15).set(V.X2,.8).set(V.Y0,.7).set(V.Y2,.03).set(V.Y3,1).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(t.t,t.t+6));let h=new u(s.x-4,l.y+.35*f,l.z+.25*f),g=new u(c.x+4,l.y+.35*f,l.z+.25*f);e.lights.push({kind:1,t0:t.t,t1:m,decay:eh,strobe:0,color:o?o.clone():this.c2.copy(i).lerp(vm,.3).clone(),peak:rh*r*(.5+.5*d),pos:l.clone(),a:h,b:g,radius:.8*f+4,haze:nh,...a===1?{}:{gain:a}});let _=wh(Rm,3,r);_>0&&this.eruption(e,t,s,c,r,i,_,a,o)}eruption(e,t,n,r,i,a,o,s=1,c=null){let l=(n.x+r.x)*.5,d=(n.z+r.z)*.5,f=(r.x-n.x+40)*Math.sqrt(Math.max(1,s)),p=new u(l,12,d+4),m=new u(l,12,d+Hm*Math.sqrt(Math.max(1,s)));e.lights.push({kind:1,t0:t.t,t1:t.t+Math.max(.3,t.dur)+Bm,decay:Bm*.7,strobe:0,color:c?c.clone():this.c2.copy(a).lerp(vm,.3).lerp(xm,Vm).clone(),peak:zm*i*o,pos:p.clone().add(m).multiplyScalar(.5),a:p,b:m,radius:Um*f,haze:nh,...s===1?{}:{gain:s}})}bengal(e,t){let n=e.p,r=X(n.size,1,.2,5),i=ic(n.sparkler,!1),a=i?new I(1,.93,.8):ec(n.color,this.palette,this.c1,`red`).clone(),o=Math.max(.3,e.dur),s=yh(n.path);if(s.length){let c=ic(n.mirror,!1),l=bh(n.times),d=0;for(let n of s)this.flareDrone(e,t,n,l,o,a,r,i,d++),c&&this.flareDrone(e,t,n.map(e=>new u(-e.x,e.y,e.z)),l,o,a,r,i,d++);return}let c=this.points(e,`wing_tips`);c.forEach((n,i)=>{let s=this.sub(e,i*4);t.add(new W(H.CONE,U.RAMP).on(hm).originV(n).time(e.t).dir(0,1,0,.6).speed(.2,.8).physics(1,1).color(this.c2.copy(a).lerp(vm,.25),30*r).life(.12,.18).emit(8,o).size(1.2*r,.8*r).trail(1,1).seed(s).set(V.X3,Math.min(.4,o*.25)).set(V.Z3,rn.GLOW).window(e.t,e.t+o+.2));let c=o<2?7:11,l=Math.max(6,Math.round(3.2*c*Math.min(1,this.quality.particleScale*1.5)*Math.min(1,.4+o/3))),u=Math.max(4,Math.round(l*Math.min(1,.2+1.5*o/c)));t.add(new W(H.CONE,U.SELFLIT).on(mm).origin(n.x,n.y+1,n.z).time(e.t).dir(0,1,0,.35).speed(1.5,3.2).physics(.45,.25).color(ym,.3).color2(this.c2.copy(a).multiplyScalar(5*r),0).litUntil(e.t+o+.1).life(c*.7,c).emit(u,0,o/u).size(1.2*r,9*r).trail(.6,.3).seed(s^7).set(V.X0,1.6).set(V.X1,.18).set(V.X2,.85).set(V.Y0,.6).set(V.Y2,.08).set(V.Y3,1).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(e.t,e.t+o+c)),this.pointLight(t,1,e.t,e.t+o+.3,.3,this.v1.set(n.x,n.y+2.5,n.z),a,1.5*r,12*r+4)}),this.groupFlash(t,c,30,3,{kind:1,t0:e.t,t1:e.t+o+.6,color:a,peak:Math.min(2.5,.7*r*c.length),decay:.6,strobe:0})}flareDrone(e,t,n,r,i,a,o,s,c){let l=n.length===1?[n[0],n[0].clone().add(new u(.6,.4,0))]:n,d=[0];if(r.length>=l.length)for(let e=1;e<l.length;e++)d.push(Math.min(i,Math.max(d[e-1]+.01,r[e])));else{let e=0,t=[0];for(let n=1;n<l.length;n++)t.push(e+=l[n].distanceTo(l[n-1]));for(let n=1;n<l.length;n++)d.push(e>0?t[n]/e*i:i*n/(l.length-1))}d[d.length-1]=Math.max(d[d.length-1],i);let f=(t,n)=>{let r=0;for(;r+2<d.length&&t>d[r+1];)r++;let i=Math.min(1,Math.max(0,(t-d[r])/Math.max(.001,d[r+1]-d[r]))),a=i*i*(3-2*i);return n.copy(l[r]).lerp(l[r+1],a),n.y+=Math.sin((e.t+t)*2.1+c)*.15,n},p=Math.max(1,Math.ceil(i/.12)),m=X(e.p.smoke,1,0,3),h=new u,g=new u,_=Math.min(1,this.quality.particleScale*1.6);for(let n=0;n<p;n++){let r=n/p*i,l=(n+1)/p*i;f(r,h),f(l,g);let u=e.t+r,d=l-r,v=this.sub(e,5e4+c*1e3+n),y=g.x-h.x,b=g.y-h.y,x=g.z-h.z;t.add(new W(H.LINE,0).on(hm).originV(h).axis(y,b,x).time(u).dir(0,1,0,.5).speed(.1,.4).physics(1,0).color(this.c2.copy(a).lerp(vm,s?.4:.3),(s?14:24)*o).life(.1,.14).emit(4,d).size((s?.6:1.3)*o,.3*o).trail(1,1).seed(v).set(V.Z3,rn.GLOW).window(u,u+d+.15)),t.add(new W(H.LINE,0).on(hm).originV(h).axis(y,b,x).time(u).dir(0,1,0,.5).speed(.1,.3).physics(1,0).color(a,(s?.5:1.1)*o).life(.12,.16).emit(2,d).size((s?2.5:5)*o,.5*o).trail(1,1).seed(v^29).set(V.Z3,rn.GLOW).window(u,u+d+.17)),s&&t.add(new W(H.LINE,U.COOL|U.FLICKER).on(gm).originV(h).axis(y,b,x).time(u).dir(0,-.3,0,1.6).speed(2,7).physics(2.2,-9.81).color(a,16*o).color2(Cm,-1).life(.4,.9).emit(this.pc(90*d*4,6),0,d/this.pc(90*d*4,6)).size(.035,.4).trail(.1,.5).seed(v^81).set(V.Y0,.9).set(V.Y3,.3).set(V.Z0,.01).window(u,u+d+1)),m>0&&(n%2==0||_>.7)&&t.add(new W(H.LINE,U.SELFLIT).on(mm).originV(h).axis(y,b,x).time(u).dir(0,1,0,.8).speed(.3,1.2).physics(.6,.35).color(ym,(s?.16:.26)*Math.min(1.5,m)).color2(this.c2.copy(a).multiplyScalar((s?2:4)*o),0).litUntil(e.t+i+.1).life(3,5).emit(Math.max(1,Math.round(2*m*_)),0,d/2).size(.6*o,3.5*o).trail(.6,.35).seed(v^119).set(V.X0,.8).set(V.X1,.2).set(V.X2,.85).set(V.Y0,.6).set(V.Y2,.1).set(V.Y3,1).set(V.Z0,1).set(V.Z3,rn.SMOKE).window(u,u+d+5)),this.pointLight(t,1,u,u+d+.06,.06,h,a,(s?.7:1.4)*o,12*o+3,g),n%3==0&&t.flashes.push({kind:1,t0:u,t1:u+d*3+.06,color:a.clone(),peak:(s?.35:.8)*o,decay:.06,pos:h.clone(),strobe:0})}}},fh=32768,ph=`gain = pow(wpx / uMinPx, 1.5);`;function mh(e){let t=e.vertexShader;t.includes(ph)&&(e.vertexShader=t.replace(ph,`gain = (flags & ${fh}) != 0 ? wpx / uMinPx : pow(wpx / uMinPx, 1.5);`),e.needsUpdate=!0)}function hh(e,t){let n={points:[],level:[],tops:e.tops.filter(e=>Math.sign(e.x)===t),bands:[]};for(let r of e.bands){if(Math.sign(r.a.x)!==t)continue;let i=[];for(let t of r.units)i.push(n.points.length),n.points.push(e.points[t]),n.level.push(e.level[t]);n.bands.push({...r,units:i})}return n}function gh(e,t,n){let r=e^Math.imul(t+1,2654435769)^Math.imul(n,2246822507)|0;return r^=r>>>16,r=Math.imul(r,2146121005),r^=r>>>15,r=Math.imul(r,2221713035),r^=r>>>16,(r>>>8)/16777216}function _h(e){return Array.isArray(e)&&e.length>=3&&e.slice(0,3).every(e=>typeof e==`number`&&Number.isFinite(e))?new u(e[0],e[1],e[2]):null}function vh(e){let t=_h(e);if(t)return[t];if(!Array.isArray(e))return[];let n=[];for(let t of e){let e=_h(t);e&&n.push(e)}return n}function yh(e){if(!Array.isArray(e)||!e.length)return[];if(_h(e[0])){let t=vh(e);return t.length?[t]:[]}let t=[];for(let n of e){let e=vh(n);e.length&&t.push(e)}return t}function bh(e){return Array.isArray(e)?e.filter(e=>typeof e==`number`&&Number.isFinite(e)):[]}function xh(e){return Array.isArray(e)?e.filter(e=>typeof e==`string`&&e.length>0):typeof e==`string`&&e.includes(`,`)?e.split(`,`).map(e=>e.trim()).filter(Boolean):[]}function Sh(e){return 1-wh(22,30,e)}function Ch(e){return e.multiplyScalar(1/Math.max(e.r,e.g,e.b,1e-4))}function wh(e,t,n){let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)}function Th(e){let t=Math.max(e.r,e.g,e.b,1e-4);return 1-Math.min(e.r,e.g,e.b)/t}function Eh(e){let t=Math.max(e.r,e.g,e.b,1e-4),n=e.r/t,r=e.g/t;return e.b/t<=r+.02&&r<=n+.02&&r>.12}function Dh(e,t){if(t.copy(e),kh(e)||Eh(e))return t;let n=Th(e);if(n>=Qm)return t;let r=Math.max(e.r,e.g,e.b,1e-4),i=Qm/Math.max(n,.001);return t.setRGB(1-(1-e.r/r)*i,1-(1-e.g/r)*i,1-(1-e.b/r)*i)}function Oh(e){return!kh(e)&&Eh(e)&&Th(e)<Tm}function kh(e){let t=Th(e);return t<.1||t<.22&&Eh(e)}function Ah(e){return kh(e)||Eh(e)?1:1-.38*wh(.12,.3,Th(e))}function jh(e,t){let n=Math.max(e.r,e.g,e.b,1e-4);t.setRGB(e.r/n,e.g/n,e.b/n);let r=Th(t);if(Eh(t)&&r<Tm)return t;let i=r<.2?1:1+Math.min(.7,(r-.2)*2.2),a=1+.25*wh(.12,.3,r),o=Eh(t)?i:a+(i-a)*wh(.4,.55,r);return o===1||t.setRGB(Math.max(.02,1-(1-t.r)*o),Math.max(.02,1-(1-t.g)*o),Math.max(.02,1-(1-t.b)*o)),t}function Mh(e,t,n,r){let i=(e%n+n)%n,a=(t%n+n)%n;return qe(i*7919+a*104729+r*1299709)/4294967296}var Nh=new Map;function Ph(e,t){let n=e*1000003+t,r=Nh.get(n);if(!r){r=new Float32Array(e*e);for(let n=0;n<e;n++)for(let i=0;i<e;i++)r[n*e+i]=qe(i*7919+n*104729+t*1299709)/4294967296;Nh.set(n,r)}return r}function Fh(){Nh.clear()}function Ih(e,t,n,r){let i=e*n,a=t*n,o=Math.floor(i),s=Math.floor(a),c=i-o,l=a-s,u=c*c*(3-2*c),d=l*l*(3-2*l),f,p,m,h;if(Number.isInteger(n)&&n>0&&n<=1024){let e=Ph(n,r),t=(o%n+n)%n,i=(s%n+n)%n,a=t+1===n?0:t+1,c=i+1===n?0:i+1;f=e[i*n+t],p=e[i*n+a],m=e[c*n+t],h=e[c*n+a]}else f=Mh(o,s,n,r),p=Mh(o+1,s,n,r),m=Mh(o,s+1,n,r),h=Mh(o+1,s+1,n,r);return f+(p-f)*u+(m-f)*d+(f-p-m+h)*u*d}function Lh(e,t,n,r,i,a=.5){let o=0,s=.5,c=0,l=n;for(let n=0;n<r;n++)o+=s*Ih(e,t,l,i+n*17),c+=s,s*=a,l*=2;return o/c}function Rh(e,t,n,r){let i=e*n,a=t*n,o=Math.floor(i),s=Math.floor(a),c=9;for(let e=-1;e<=1;e++)for(let t=-1;t<=1;t++){let l=o+t,u=s+e,d=(l%n+n)%n,f=(u%n+n)%n,p=qe(d*92821+f*68917+r*7),m=l+(p&65535)/65536,h=u+(p>>>16)/65536,g=(m-i)*(m-i)+(h-a)*(h-a);g<c&&(c=g)}return Math.sqrt(c)}function zh(e,t,n,r={}){let i=new S(e,t,n,N,g);return i.wrapS=i.wrapT=r.repeat===!1?O:be,i.generateMipmaps=r.mips!==!1,i.minFilter=r.mips===!1?de:d,i.magFilter=de,i.anisotropy=r.aniso??1,i.colorSpace=r.srgb?ee:``,i.needsUpdate=!0,i}function Bh(e,t={}){let n=new ue(e);return n.wrapS=n.wrapT=t.repeat?be:O,n.colorSpace=t.srgb===!1?``:ee,n.anisotropy=t.aniso??1,n.generateMipmaps=t.mips!==!1,n.minFilter=t.mips===!1?de:d,n.needsUpdate=!0,n}function Vh(){let[e,t]=Uh(128,128);t.clearRect(0,0,128,128);let n=(e,n,r,i)=>{let a=t.createLinearGradient(0,e,0,e+n);a.addColorStop(0,`rgb(${r},${r},${r})`),a.addColorStop(1,`rgb(${i},${i},${i})`),t.fillStyle=a};for(let e=12;e<122;e+=12.8)n(0,128,170,120),t.fillRect(Math.round(e),0,7,128),t.fillStyle=`rgba(255,255,255,0.25)`,t.fillRect(Math.round(e),0,1,128);n(0,10,255,150),t.fillRect(0,0,128,10),n(20,6,210,140),t.fillRect(0,20,128,6),n(116,12,190,110),t.fillRect(0,116,128,12),n(0,128,220,140),t.fillRect(0,0,9,128),t.fillRect(125,0,3,128);let r=Bh(e,{repeat:!0,aniso:4});return r.wrapT=O,r}var Hh=[.02,.2,.05,.8];function Uh(e,t){let n=document.createElement(`canvas`);return n.width=e,n.height=t,[n,n.getContext(`2d`,{willReadFrequently:!1})]}async function Wh(e,t){let n=new Uint8Array(e*e*4);for(let r=0;r<e;r++)Gh(n,e,r),await t.maybeYield();return Fh(),zh(n,e,e,{mips:!0})}function Gh(e,t,n){let r=n/t;for(let i=0;i<t;i++){let a=i/t,o=(n*t+i)*4;e[o]=Lh(a,r,4,5,11)*255,e[o+1]=Lh(a,r,16,4,23)*255,e[o+2]=(1-Math.min(1,Rh(a,r,10,5)*1.25))*255,e[o+3]=Lh(a,r,32,3,41)*255}}async function Kh(e,t){let n=new Uint8Array(e*e*4),r=new ft(9001),i=new Float32Array(e*e),a=Math.floor(e*e*.16);for(let t=0;t<a;t++){let t=r.next()*e,n=r.next()*e,a=3+r.next()*e*.02,o=r.range(0,Math.PI*2),s=.35+r.next()*.65,c=Math.cos(o),l=Math.sin(o);for(let r=0;r<a;r++){let o=(Math.floor(t)%e+e)%e,u=(Math.floor(n)%e+e)%e*e+o;i[u]=Math.max(i[u],s*(1-r/a*.5)),t+=c,n+=l}}for(let r=0;r<e;r++){t&&await t.maybeYield();for(let t=0;t<e;t++){let a=t/e,o=r/e,s=(r*e+t)*4,c=Ih(a,o,e/3,3)*.55+Lh(a,o,8,4,5)*.45;n[s]=Math.min(255,c*255);let l=Lh(a,o,12,3,77);n[s+1]=Math.min(255,(i[r*e+t]*.75+l*.35)*255);let u=1-Math.min(1,Rh(a,o,48,9)*1.35);n[s+2]=Math.min(255,(u*.7+Ih(a,o,e/4,13)*.3)*255);let d=1-Math.min(1,Math.abs(Lh(a,o,6,4,101)-.5)*18);n[s+3]=Math.min(255,(d*.6+Lh(a,o,20,3,55)*.4)*255)}}return Fh(),zh(n,e,e,{mips:!0,aniso:4})}var qh=Pe.length,Jh={uWLamp:{value:Pe.map(e=>new p(e.x,nt,e.z,1))},uWLampCol:{value:Pe.map(()=>new u)},uWSpillCol:{value:Pe.map(()=>new u)},uWStage:{value:new p(0,16,-12,900)},uWStageCol:{value:new u},uWFlash:{value:new p(0,40,-20,400)},uWFlashCol:{value:new u},uWFlash2:{value:new p(0,40,60,400)},uWFlashCol2:{value:new u},uWAmbPos:{value:new p(0,15,0,1/52900)},uWAmbCol:{value:new u},uWGlowCol:{value:new u},uWSmokeC:{value:new p(0,25,30,0)},uWSmokeInv:{value:new u(1/170,1/55,1/170)},uWFogGlow:{value:new u},uWTime:{value:0},uWSkyZen:{value:new I(.004,.03,.12)},uWSkyHor:{value:new I(.012,.05,.16)},uWSkyHorNW:{value:new I(.03,.12,.2)},uWSunDir:{value:new u(0,-.07,1)},uWMoonDir:{value:new u(.35,.14,-.92)},uWMoonI:{value:12}},Yh=`
vec3 wlSky( vec3 r ) {
  float e = max( r.y, 0.0 );
  vec2 dxz = normalize( r.xz + 1e-5 );
  float sunSide = dot( dxz, normalize( uWSunDir.xz ) ) * 0.5 + 0.5;
  vec3 hor = mix( uWSkyHor, uWSkyHorNW, pow( sunSide, 1.6 ) );
  return mix( hor, uWSkyZen, pow( e, 0.42 ) );
}
`,Xh=55,Zh=65,Qh=.4,$h=2200,eg=.03,tg=1400,ng=2.5,rg=7,ig=1.6,ag=.6,og=6,sg=70,cg=3,lg=.8,ug={h0:30,hw:15,smokeFilter:1.5},dg={r:1,g:1,b:1},fg=dg;function pg(e,t){let n=e.glowColor,r=Math.max(n.r,n.g,n.b),i=Math.min(1,Math.max(0,t)*ug.smokeFilter);if(!(r>1e-4)||!(i>0)){fg.r=fg.g=fg.b=1;return}fg.r=1-i+i*n.r/r,fg.g=1-i+i*n.g/r,fg.b=1-i+i*n.b/r}function mg(e){let t=Math.max(0,(e-ug.h0)/Math.max(1,ug.hw));return 1/(1+t*t)}var hg=new I;function gg(e,t,n,r,i,a){let o=Math.max(e,t,n);if(!(o>0)){a.r=a.g=a.b=0;return}a.r=o*(Math.max(0,e)/o)**+r*i,a.g=o*(Math.max(0,t)/o)**+r*i,a.b=o*(Math.max(0,n)/o)**+r*i}var _g={r:0,g:0,b:0};function vg(e,t){let n=e.flashIntensity;if(!(n>0))return t.setRGB(0,0,0);let r=Math.min(1.2,Math.max(0,e.haze)),i=ig*xg(n,rg)*(n/(n+2))*(.45+.55*r),a=e.flashColor;return gg(a.r,a.g,a.b,cg,i,_g),t.setRGB(_g.r,_g.g,_g.b)}var yg=new I;function bg(e,t,n,r){let i=tg*t*mg(e.pos.y),a=e.color;gg(a.r*fg.r,a.g*fg.g,a.b*fg.b,ng,i,_g),r.set(_g.r,_g.g,_g.b);let o=e.spread;n.set(e.pos.x,e.pos.y,e.pos.z,400+.8*o*o)}function xg(e,t=18){return e>0?t*(1-Math.exp(-e/t))/e:0}function Sg(e,t){let n=e.pillarChase;if(!n||n.length===0)return 1;let r=n[t];return typeof r==`number`&&Number.isFinite(r)?Math.max(0,r):1}function Cg(e,t,n=1,r=0,i){let a=Jh;a.uWTime.value=t;for(let t=0;t<qh;t++){let n=Sg(e,t),r=Math.max(0,e.pillarLampIntensity)*n*Xh;hg.copy(e.pillarLampColor),a.uWLampCol.value[t].set(hg.r*r,hg.g*r,hg.b*r);let i=Math.max(0,e.pillarShaftIntensity)*n*Zh;hg.copy(e.pillarShaftColor),a.uWSpillCol.value[t].set(hg.r*i,hg.g*i,hg.b*i)}let o=(Math.max(0,e.stageIntensity)*.6+Math.max(0,e.audienceWash)*.8+eg)*$h;a.uWStageCol.value.set(e.stageColor.r*o,e.stageColor.g*o,e.stageColor.b*o);let s=Math.max(0,e.strobe)*$h*.9;a.uWStageCol.value.x+=s,a.uWStageCol.value.y+=s,a.uWStageCol.value.z+=s;let c=xg(e.flashIntensity,rg)*n;pg(e,r),bg(e.flashStage,c,a.uWFlash.value,a.uWFlashCol.value),bg(e.flashField,c,a.uWFlash2.value,a.uWFlashCol2.value),vg(e,yg);let l=e.flashIntensity,u=l>0?n*ag*l*mg(e.flashPos.y)/(l+og):0;a.uWAmbCol.value.set(yg.r*u*fg.r,yg.g*u*fg.g,yg.b*u*fg.b);let d=sg+.6*e.flashSpread;a.uWAmbPos.value.set(e.flashPos.x,Math.max(8,e.flashPos.y),e.flashPos.z,1/(d*d));let f=i??e.glowColor;a.uWGlowCol.value.set(f.r*lg,f.g*lg,f.b*lg)}var wg=`
#define WL_LAMP_FLOOR ${Qh.toFixed(3)}
uniform vec4 uWLamp[${qh}];
uniform vec3 uWLampCol[${qh}];
uniform vec3 uWSpillCol[${qh}];
uniform vec4 uWStage;
uniform vec3 uWStageCol;
uniform vec4 uWFlash;
uniform vec3 uWFlashCol;
uniform vec4 uWFlash2;
uniform vec3 uWFlashCol2;
uniform vec4 uWAmbPos;
uniform vec3 uWAmbCol;
uniform vec3 uWGlowCol;
uniform vec4 uWSmokeC;
uniform vec3 uWSmokeInv;
uniform vec3 uWFogGlow;
uniform float uWTime;
// the world materials bound the lit-smoke part of their height fog to the smoke over the site (fog_fragment)
#define WL_FOG_SITE
// 1 inside the lit smoke over the grounds, exp(-k (q² - 1)) outside it (world position)
float wlSite( vec3 p ) {
  if ( uWSmokeC.w <= 0.0 ) return 1.0;
  vec3 q = ( p - uWSmokeC.xyz ) * uWSmokeInv;
  return exp( - uWSmokeC.w * max( dot( q, q ) - 1.0, 0.0 ) );
}
uniform vec3 uWSkyZen;
uniform vec3 uWSkyHor;
uniform vec3 uWSkyHorNW;
uniform vec3 uWSunDir;
uniform vec3 uWMoonDir;
uniform float uWMoonI;
${Yh}
`,Tg=`
{
  IncidentLight wl;
  wl.visible = true;
  vec3 upV = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
  // how much the surface faces up (the ground, deck tops, plinths): the show light that reaches a
  // floor is the light that comes down steeply — grazing light from far sources barely lights it
  float wlUp = clamp( dot( geometryNormal, upV ), 0.0, 1.0 );
#ifdef WL_LAMPS
  // the lantern's own base and hood shade the floor straight below: the pools on the pale paving stay
  // soft coloured pools, the shafts and the plinth fences keep the full light
  float wlLampUp = 1.0 - WL_LAMP_FLOOR * wlUp;
  for ( int i = 0; i < ${qh}; i ++ ) {
    vec3 lp = ( viewMatrix * vec4( uWLamp[ i ].xyz, 1.0 ) ).xyz;
    vec3 L = lp - geometryPosition;
    float d2 = dot( L, L );
    if ( d2 < 4900.0 ) {
      float win = 1.0 - d2 / 4900.0;
      wl.direction = L * inversesqrt( d2 );
      wl.color = uWLampCol[ i ] * ( win * win / ( d2 + 3.0 ) ) * wlLampUp;
      RE_Direct( wl, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
    }
    vec3 sp = ( viewMatrix * vec4( uWLamp[ i ].x, 0.9, uWLamp[ i ].z, 1.0 ) ).xyz;
    vec3 S = sp - geometryPosition;
    float s2 = dot( S, S );
    if ( s2 < 484.0 ) {
      float w2 = 1.0 - s2 / 484.0;
      float nd = max( dot( geometryNormal, S * inversesqrt( s2 ) ), 0.0 ) * 0.85 + 0.15;
      reflectedLight.directDiffuse += uWSpillCol[ i ] * ( w2 * w2 * nd / ( s2 + 6.0 ) * wlLampUp ) * BRDF_Lambert( material.diffuseColor );
    }
  }
#endif
  {
    PhysicalMaterial wm = material;
    wm.roughness = max( material.roughness, 0.42 );
    vec3 lp = ( viewMatrix * vec4( uWStage.xyz, 1.0 ) ).xyz;
    vec3 L = lp - geometryPosition;
    float d2 = dot( L, L );
    wl.direction = L * inversesqrt( d2 );
    // the rig is aimed at the air and the front rows: on the ground its light is a pool at the deck
    // lip (window ≈ 0.45 at 25 m, 0.12 at 60 m, 0.05 at 100 m on top of 1/d²); walls and pillars
    // facing the stage keep the wider throw (≈ 0.4 at 30 m, 0.1 at 90 m). The video: the light lives
    // in the haze and on the set, the grounds read near-black
    wl.color = uWStageCol / ( d2 + uWStage.w ) * mix( 1400.0 / ( 1400.0 + d2 ), 500.0 / ( 500.0 + d2 ), wlUp );
    RE_Direct( wl, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, wm, reflectedLight );
    // flash buckets = soft area lights at the centroid of their sources. A bucket of sources spread
    // wide (the two arm ends 190 m apart, a gerb row along the deck) is not one lamp hanging over the
    // middle of the field: an up-facing surface receives it from the sources themselves, at grazing
    // angles — its cosine drops by sqrt( d² / ( d² + spread² ) ) (spread² = 1.25 (w − 400))
    lp = ( viewMatrix * vec4( uWFlash.xyz, 1.0 ) ).xyz;
    L = lp - geometryPosition;
    d2 = dot( L, L );
    wl.direction = L * inversesqrt( d2 );
    wl.color = uWFlashCol / ( d2 + uWFlash.w ) * mix( 1.0, sqrt( d2 / ( d2 + 1.25 * ( uWFlash.w - 400.0 ) ) ), wlUp );
    RE_Direct( wl, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, wm, reflectedLight );
    if ( dot( uWFlashCol2, vec3( 1.0 ) ) > 0.0 ) {
      lp = ( viewMatrix * vec4( uWFlash2.xyz, 1.0 ) ).xyz;
      L = lp - geometryPosition;
      d2 = dot( L, L );
      wl.direction = L * inversesqrt( d2 );
      wl.color = uWFlashCol2 / ( d2 + uWFlash2.w ) * mix( 1.0, sqrt( d2 / ( d2 + 1.25 * ( uWFlash2.w - 400.0 ) ) ), wlUp );
      RE_Direct( wl, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, wm, reflectedLight );
    }
    // lit smoke / haze overhead and the site glow: soft sky-weighted fill (no direction, no specular).
    // Both belong to the smoke in the air (drawn by the haze): the grounds only get a trace of them
    float wlHemi = 0.55 + 0.45 * dot( geometryNormal, upV );
    vec3 ac = ( viewMatrix * vec4( uWAmbPos.xyz, 1.0 ) ).xyz - geometryPosition;
    vec3 gc = ( viewMatrix * vec4( 0.0, 10.0, 50.0, 1.0 ) ).xyz - geometryPosition;
    float wlAf = 1.0 / ( 1.0 + dot( ac, ac ) * uWAmbPos.w );
    // the site glow belongs to the smoke over the grounds: bounded by it (the land around stays dark)
    vec3 wlWP = ( vec4( geometryPosition, 0.0 ) * viewMatrix ).xyz + cameraPosition;
    vec3 wlAmb = uWAmbCol * ( wlAf * wlAf ) + uWGlowCol * ( wlSite( wlWP ) / ( 1.0 + dot( gc, gc ) * 4e-6 ) );
    reflectedLight.indirectDiffuse += wlAmb * wlHemi * BRDF_Lambert( material.diffuseColor );
  }
}
`;function Eg(e,t={}){let n=t.lamps!==!1;e.onBeforeCompile=e=>{Object.assign(e.uniforms,Jh),t.edit?.(e),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>\n${n?`#define WL_LAMPS
`:``}${wg}`).replace(`#include <aomap_fragment>`,`${Tg}\n#include <aomap_fragment>`)};let r=`world-${n?`l`:`n`}-${t.key??``}`;return e.customProgramCacheKey=()=>r,e}var Dg=e=>`vec3( ${e.x.toFixed(5)}, ${e.y.toFixed(5)}, ${e.z.toFixed(5)} )`;function Og(e){let t=ae;t.fog_pars_vertex=`
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogWorld;
#endif
`,t.fog_vertex=`
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogWorld = mvPosition.xyz * mat3( viewMatrix );
#endif
`,t.fog_pars_fragment=`
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
  vec3 worldFogTint( vec3 d, vec3 fc ) {
    float tw = max( dot( d, ${Dg(e.sunDir)} ), 0.0 );
    float mo = max( dot( d, ${Dg(e.moonDir)} ), 0.0 );
    float low = 1.0 - clamp( abs( d.y ) * 3.0, 0.0, 1.0 );
    return fc * ( 1.0 + ${e.twilightGain.toFixed(3)} * tw * tw * tw * low + ${e.moonGain.toFixed(3)} * pow( mo, 24.0 ) );
  }
#endif
`,t.fog_fragment=`
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogDist = length( vFogWorld );
    float fogT = ${e.falloff.toFixed(5)} * vFogWorld.y;
    float fogI = abs( fogT ) > 1e-3 ? ( 1.0 - exp( - fogT ) ) / fogT : 1.0 - 0.5 * fogT;
    float fogTau = fogDensity * exp( - ${e.falloff.toFixed(5)} * ( cameraPosition.y - ${e.base.toFixed(2)} ) ) * fogDist * fogI;
    float fogFactor = 1.0 - exp( - max( fogTau, 0.0 ) );
    vec3 fogC = fogColor;
    #ifdef WL_FOG_SITE
      // world materials: the lit-smoke part of the fog colour only over the grounds (see wlSite); a camera inside
      // the smoke keeps it on the land around it, fading over ≈ 200 m
      fogC -= uWFogGlow * ( 1.0 - max( wlSite( cameraPosition + vFogWorld ), wlSite( cameraPosition ) * exp( - fogDist * 0.005 ) ) );
    #endif
    vec3 fogCol = worldFogTint( vFogWorld / max( fogDist, 1e-3 ), fogC );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
    vec3 fogCol = fogColor;
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogCol, fogFactor );
#endif
`}function kg(e){return`
vec3 worldFogTintC( vec3 d, vec3 fc ) {
  float tw = max( dot( d, ${Dg(e.sunDir)} ), 0.0 );
  float mo = max( dot( d, ${Dg(e.moonDir)} ), 0.0 );
  float low = 1.0 - clamp( abs( d.y ) * 3.0, 0.0, 1.0 );
  return fc * ( 1.0 + ${e.twilightGain.toFixed(3)} * tw * tw * tw * low + ${e.moonGain.toFixed(3)} * pow( mo, 24.0 ) );
}
`}var Ag=`
varying vec3 vDir;
void main() {
  vDir = normalize( position );
  vec4 p = projectionMatrix * vec4( mat3( viewMatrix ) * position, 1.0 );
  gl_Position = p.xyww; // at the far plane
}
`;function jg(e,t){return`
precision highp float;
varying vec3 vDir;
uniform sampler2D tNoise;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform vec3 uStageDir;
uniform vec3 uFlashDir;
uniform vec3 uFlashCol;
uniform vec3 uShowCol;
uniform vec3 uGlowCol;     // site glow (atmos.glow): the smoke-filled air glows, a broad low dome
uniform vec3 uBounceCol;   // bounce of the flashes off the smoke over the site (the lit cloud)
uniform float uBounceFill; // 1 = the site is full of smoke (atmos.glow smoke): the bounce lights the whole dome
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
uniform vec3 uCloudRel;    // camera position relative to the lit smoke volume over the site, in units of its radii
uniform vec4 uCloudInv;    // xyz = 1 / radii of that volume, w = falloff outside it (0 = the glow fills the whole dome)
uniform vec3 uFogGlow;     // the lit-smoke part of uFogColor (atmos.glow + flash bounce): it lives over the grounds
uniform vec3 uGlowRel;     // camera position relative to the lit smoke over the grounds (groundsVol), in units of its radii
uniform vec4 uGlowInv;     // xyz = 1 / radii of that volume, w = falloff outside it (0 = the site glow fills the whole dome)
${kg(e)}

// how much of a lit smoke volume (an ellipsoid) a sky ray passes through: 1 inside / through it, falling off for rays
// that pass above or beside it (seen from far away the glow is a lobe over the site)
float volSmoke( vec3 d, vec3 rel, vec4 inv ) {
  if ( inv.w <= 0.0 ) return 1.0;
  vec3 ds = normalize( d * inv.xyz );
  float tc = max( - dot( rel, ds ), 0.0 );
  vec3 q = rel + ds * tc;
  return exp( - inv.w * max( dot( q, q ) - 1.0, 0.0 ) );
}
// the flash bounce in the smoke over the site (round 9)
float siteSmoke( vec3 d ) {
  return volSmoke( d, uCloudRel, uCloudInv );
}

float cloudField( vec2 p ) {
  // streaky broken deck: stretched along the wind (from NNW), two scales + detail
  // cloud streets aligned with the NNW wind (world Z), gently sheared
  vec2 q = vec2( p.x + p.y * 0.12, p.y * 0.42 );
  float a = texture2D( tNoise, q * 0.9 ).r;
  float b = texture2D( tNoise, q * 2.3 + vec2( 0.37, 0.11 ) + a * 0.15 ).g;
  float d = a * 0.62 + b * 0.38;
#if ${t} > 2
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
  // the flash bounce and the site glow live in the smoke over the site: seen from outside it, only the rays
  // through it glow (from inside, every ray passes through it: the whole dome glows). Round 12: the glow and the
  // smoke veil too (v1518-1533, drone outside the smoke: a red field under a black sky and a black landscape)
  float sG = volSmoke( d, uGlowRel, uGlowInv );
  vec3 bounce = uBounceCol * mix( siteSmoke( d ), 1.0, uBounceFill );
  vec3 glowS = uGlowCol * sG;
  vec3 fogS = uFogColor - uFogGlow * ( 1.0 - sG );
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
    cloudAdd += ( glowS + bounce ) * ( 0.5 + 0.9 * thick ) * ( 0.4 + 0.6 * exp( - eh / 0.3 ) );
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
  add += ( glowS + bounce ) * ( 0.3 + 0.7 * exp( - eh / 0.2 ) ) * hazeK;
  add += vec3( 0.7, 0.75, 1.0 ) * uLightning.w * pow( max( dot( d, uLightning.xyz ), 0.0 ), 16.0 ) * exp( - eh / 0.1 ) * 0.35;

  col = col * uLevel + add;
  col += glow;
  col = mix( col, cloudCol * uLevel + cloudAdd + add * 0.5 + glow * 0.6, cover );
  col += moonDisc * ( 1.0 - cover * 0.85 );

  // atmos cue tint
  col = mix( col, col * uTint * 1.6, uTintAmt );
  // a smoke-filled site (atmos.glow smoke): the lit smoke veils the sky too, most of all low down
  col = mix( col, fogS * ( 0.7 + 0.3 * exp( - eh / 0.25 ) ), uSmoke * sG * ( 0.55 + 0.35 * exp( - eh / 0.3 ) ) );

  // below the horizon: the dark polder under haze (matches the height fog on distant terrain)
  vec3 land = worldFogTintC( d, fogS );
  col = mix( col, land, smoothstep( 0.012, -0.03, e ) );

  gl_FragColor = vec4( max( col, 0.0 ), 1.0 );
}
`}var Mg=(e,t)=>typeof e==`number`&&Number.isFinite(e)?e:t,Ng=4,Pg=8,Fg=`
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
`,Ig=`
varying vec3 vCol;
varying float vI;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( c, c );
  float a = exp( - r2 * 4.0 );
  if ( a < 0.02 ) discard;
  gl_FragColor = vec4( vCol * vI * a, 1.0 );
}
`,Lg=[0,120,400,800,1300],Rg={zen:[[.001,.018,.11],[7e-4,.008,.07],[6e-4,.003,.03],[6e-4,.002,.013],[6e-4,.0012,.005]],se:[[.0015,.02,.1],[.001,.009,.068],[8e-4,.0025,.03],[7e-4,.0012,.008],[6e-4,8e-4,.003]],nw:[[.004,.045,.16],[.002,.018,.08],[.0015,.009,.04],[.0012,.006,.026],[.001,.004,.016]],teal:[[.03,.14,.24],[.02,.09,.18],[.008,.04,.1],[.004,.017,.05],[.002,.008,.025]],warm:[[.5,.26,.1],[.25,.13,.06],[.09,.055,.03],[.02,.014,.01],[.004,.003,.002]]},zg=Rg.zen[0][2],Bg={zen:[[22e-5,.06,.36],[15e-5,.0015,.14],[75e-6,38e-5,.082],[75e-6,22e-5,.0288],[75e-6,15e-5,.0045]],se:[[38e-5,.045,.12],[22e-5,.009,.052],[15e-5,.0022,.038],[15e-5,75e-5,.0144],[75e-6,38e-5,.003]],nw:[[75e-5,.09,.22],[45e-5,.03,.135],[3e-4,.006,.09],[22e-5,.0022,.0608],[15e-5,.0015,.015]]};function Vg(e,t,n){let r=Bg[e],i=0;for(;i<Lg.length-2&&t>Lg[i+1];)i++;let a=B(Lg[i],Lg[i+1],t),o=r[i],s=r[i+1];return n.setRGB(Math.exp(R(Math.log(o[0]),Math.log(s[0]),a)),Math.exp(R(Math.log(o[1]),Math.log(s[1]),a)),Math.exp(R(Math.log(o[2]),Math.log(s[2]),a)))}function Hg(e,t,n){let r=Rg[e],i=0;for(;i<Lg.length-2&&t>Lg[i+1];)i++;let a=B(Lg[i],Lg[i+1],t),o=r[i],s=r[i+1];return n.setRGB(Math.exp(R(Math.log(o[0]),Math.log(s[0]),a)),Math.exp(R(Math.log(o[1]),Math.log(s[1]),a)),Math.exp(R(Math.log(o[2]),Math.log(s[2]),a)))}var Ug=class{name=`environment`;app;enabled=!0;q;sky;skyU;stars;starU;noise;fog;domeGrade=!0;fogCfg;hemi;moonLight;twilightLight;sunDir=new u;moonDir=new u;tmpV=new u;tmpC=new I;tint=new I(1,1,1);cueBuf=[];glowBuf=[];glowC=new I;groundGlow=new I;bounceC=new I;sidereal=new D;poleAxis=Ve(0,52.44);rotM=new b;fogBase=.0012;smokeTune={fog:3,glow:.25,shade:4,sky:1,build:4,linger:6};skyTune={bounce:1,bounceSkySmoke:.2,bounceFog:1,bounceFogSmoke:.2,fillRG:.15,fogRG:.15,fillOutside:0};siteSmokeVol={x:0,y:25,z:30,rh:170,rv:55,k:2};groundsVol={x:0,y:5,z:65,rx:105,ry:50,rz:110,k:3};domeKeys=Bg;smokeFog=0;glowReach=0;smokeCues=[];smokeRev=-1;worldTune=ug;level=1;stats_={level:0,sunAlt:0,moonAlt:0,cover:0,lightning:0};async init(e){this.app=e,this.q=e.quality;let t=.5;Ve(R(Je.sun.az[0],Je.sun.az[1],t),0,this.sunDir),Ve(R(Je.moon.az[0],Je.moon.az[1],t),R(Je.moon.alt[0],Je.moon.alt[1],t),this.moonDir),this.fogCfg={falloff:1/38,base:0,sunDir:this.sunDir.clone(),moonDir:this.moonDir.clone(),twilightGain:1.6,moonGain:.6},Og(this.fogCfg),this.fog=new se(`#08101e`,this.fogBase),e.scene.fog=this.fog,e.scene.background=new I(`#04081a`),this.hemi=new l(`#3050a0`,`#1a140e`,.55),this.moonLight=new w(`#ffd7a8`,.16),this.twilightLight=new w(`#6fb4c8`,.22),e.scene.add(this.hemi,this.moonLight,this.twilightLight,this.moonLight.target,this.twilightLight.target),this.noise=await Wh(this.q.level===`mobile`?256:512,new or(12)),this.buildSky(),this.buildStars(),e.onFrame(e=>this.lateUpdate(e))}buildSky(){let t=e=>({value:new I(e)});this.skyU={tNoise:{value:this.noise},uSunDir:{value:new u},uMoonDir:{value:new u},uStageDir:{value:new u(0,.2,-1).normalize()},uFlashDir:{value:new u(0,1,0)},uFlashCol:{value:new I(0,0,0)},uShowCol:{value:new I(0,0,0)},uGlowCol:{value:new I(0,0,0)},uBounceCol:{value:new I(0,0,0)},uBounceFill:{value:1},uLightning:{value:new p(1,.05,.4,0)},uZenith:t(`#000000`),uHorizonSE:t(`#000000`),uHorizonNW:t(`#000000`),uTwilight:t(`#000000`),uTwilightWarm:t(`#000000`),uFogColor:{value:new I},uCloudDark:t(`#000000`),uCloudLit:t(`#000000`),uTint:{value:new I(1,1,1)},uTintAmt:{value:0},uLevel:{value:1},uCover:{value:.52},uTime:{value:0},uMoonI:{value:1},uHaze:{value:.6},uSmoke:{value:0},uCloudRel:{value:new u},uCloudInv:{value:new p(1,1,1,0)},uFogGlow:{value:new I(0,0,0)},uGlowRel:{value:new u},uGlowInv:{value:new p(1,1,1,0)}};let n=new C({uniforms:this.skyU,vertexShader:Ag,fragmentShader:jg(this.fogCfg,this.q.level===`mobile`?2:3),depthWrite:!1,depthTest:!0,depthFunc:3,side:1,fog:!1});this.sky=new e(new v(10,48,24),n),this.sky.name=`sky`,this.sky.userData.noFocus=!0,this.sky.frustumCulled=!1,this.sky.renderOrder=1e6,this.app.scene.add(this.sky)}buildStars(){let e=Ne.length+2,t=new Float32Array(e*3),n=new Float32Array(e),r=new Float32Array(e),i=new Float32Array(e),a=new u;Ne.forEach(([e,i,o],s)=>{Ve(e,i,a).toArray(t,s*3),n[s]=o,r[s]=qe(s*31+7)%1e3/1e3}),n[e-2]=Je.venus.mag,n[e-1]=Je.jupiter.mag,i[e-2]=i[e-1]=1;let o=new M;o.setAttribute(`position`,new j(t,3)),o.setAttribute(`aMag`,new j(n,1)),o.setAttribute(`aSeed`,new j(r,1)),o.setAttribute(`aKind`,new j(i,1)),this.starU={tNoise:{value:this.noise},uTime:{value:0},uCover:{value:.5},uVis:{value:0},uPlanetVis:{value:1},uPx:{value:1},uSidereal:{value:this.sidereal}};let s=new C({uniforms:this.starU,vertexShader:Fg,fragmentShader:Ig,transparent:!0,depthWrite:!1,depthTest:!0,depthFunc:3,blending:2,fog:!1});this.stars=new re(o,s),this.stars.frustumCulled=!1,this.stars.renderOrder=1e6+1,this.stars.name=`stars`,this.app.scene.add(this.stars)}update(e){this.app.env.smoke=this.glowAt(e.showTime,this.app.env.glowColor),this.enabled&&(this.sky.position.copy(e.camera.position),this.stars.position.copy(e.camera.position))}glowAt(e,t){t.setRGB(0,0,0);let n=this.groundGlow.setRGB(0,0,0),r=0,i=0,a=0,o=this.app.show.active(`atmos`,e,this.glowBuf);for(let s=0;s<o.length;s++){let c=o[s];if(c.fx!==`glow`)continue;let l=Math.max(.01,Mg(c.p.fade,.3)),u=Math.max(.01,Mg(c.p.out,.8)),d=z((e-c.t)/l,0,1),f=z((c.t+c.dur-e)/u,0,1),p=d*d*(3-2*d)*f*f*(3-2*f),m=z(Mg(c.p.flicker,0),0,1);if(m>0){let t=.5+.25*Math.sin(e*13.1+c.seed)+.15*Math.sin(e*7.3+1.3)+.1*Math.sin(e*23.7+.4);p*=1-m*.6*z(t,0,1)}r=Math.max(r,z(Mg(c.p.smoke,0),0,1)*p);let h=z(Mg(c.p.amount,.6),0,Ng)*p;if(h<=0)continue;pt(c.p.color??`primary`,this.app.palette,this.glowC,`primary`),t.r+=this.glowC.r*h,t.g+=this.glowC.g*h,t.b+=this.glowC.b*h;let g=z(Mg(c.p.ground,1),0,Pg);i+=h,a+=h*z((g-1)/3,0,1),g>1&&this.app.reduceFlashing&&(g=1+(g-1)*.5);let _=h*g;n.r+=this.glowC.r*_,n.g+=this.glowC.g*_,n.b+=this.glowC.b*_}return this.glowReach=a/Math.max(i,.5),this.smokeFog=this.smokeAt(e),r}smokeAt(e){let t=this.app.show;if(this.smokeRev!==t.revision){this.smokeRev=t.revision,this.smokeCues.length=0;let e=t.all(`atmos`);for(let t=0;t<e.length;t++){let n=e[t];n.fx===`glow`&&Mg(n.p.smoke,0)>0&&this.smokeCues.push(n)}}let n=this.smokeTune.build,r=0;for(let t=0;t<this.smokeCues.length;t++){let i=this.smokeCues[t];if(i.t>e)break;let a=i.t+i.dur,o=Math.max(Mg(i.p.out,.8),this.smokeTune.linger,.05);if(e>a+o*5)continue;let s=z(Mg(i.p.smoke,0),0,1),c=z((e-i.t)/Math.max(.01,Mg(i.p.fade,.3)),0,1),l=Math.min(e,a)-i.t,u=s*c*c*(3-2*c)*(n>0?z(l/n,0,1):1);e>a&&(u*=Math.exp(-(e-a)/o)),u>r&&(r=u)}return r}lateUpdate(e){let t=this.app.env;if(Cg(t,e.showTime,this.app.reduceFlashing?.5:1,this.smokeFog,this.groundGlow),!this.enabled)return;let n=e.showTime,r=ut(n),i=this.skyU,a=R(Je.sun.alt[0],Je.sun.alt[1],r);Ve(R(Je.sun.az[0],Je.sun.az[1],r),a,i.uSunDir.value);let o=R(Je.moon.alt[0],Je.moon.alt[1],r);Ve(R(Je.moon.az[0],Je.moon.az[1],r),o,i.uMoonDir.value),Hg(`zen`,n,i.uZenith.value),Hg(`se`,n,i.uHorizonSE.value),Hg(`nw`,n,i.uHorizonNW.value),Hg(`teal`,n,i.uTwilight.value),Hg(`warm`,n,i.uTwilightWarm.value);let s=i.uZenith.value.b/zg;this.level=s;let c=0,l=0,u=.3,d=1,f=1,p=.35+.45*B(.55,1,r);this.tint.setRGB(1,1,1);let m=this.app.show.active(`atmos`,n,this.cueBuf);for(let e of m){let t=z((n-e.t)/Math.max(.01,Number(e.p.fade??2)),0,1);e.fx===`sky`?(e.p.tint!==void 0&&(pt(e.p.tint,this.app.palette,this.tmpC,`primary`),this.tint.lerp(this.tmpC,t),c=R(c,z(Number(e.p.amount??.5),0,1),t)),e.p.stars!==void 0&&(l=R(l,z(Number(e.p.stars),0,2),t)),e.p.clouds!==void 0&&(u=R(u,z(Number(e.p.clouds),0,1),t)),e.p.level!==void 0&&(d=R(d,z(Mg(e.p.level,1),0,2),t)),e.p.air!==void 0&&(f=R(f,z(Mg(e.p.air,1),0,2),t))):e.fx===`lightning`?p=R(p,z(Number(e.p.intensity??1),0,2),t):e.fx===`clouds`&&(u=R(u,z(Number(e.p.cover??.5),0,1),t))}let h=s;i.uCloudDark.value.copy(i.uZenith.value).multiplyScalar(.6),i.uCloudLit.value.copy(i.uHorizonNW.value).multiplyScalar(.85),i.uLevel.value=d,i.uCover.value=u,i.uTime.value=n,i.uMoonI.value=.9+.1*B(7.5,9,o),i.uHaze.value=z(t.haze,0,1.5),i.uTint.value.copy(this.tint),i.uTintAmt.value=c;let g=Jh;g.uWSkyZen.value.copy(i.uZenith.value),g.uWSkyHor.value.copy(i.uHorizonSE.value),g.uWSkyHorNW.value.copy(i.uHorizonNW.value),this.tmpC.copy(i.uTwilight.value).multiplyScalar(.5),g.uWSkyHorNW.value.add(this.tmpC),g.uWSunDir.value.copy(i.uSunDir.value),g.uWMoonDir.value.copy(i.uMoonDir.value),g.uWMoonI.value=12*(1-u*.6);let _=e.camera.position;this.tmpV.set(0,22,-12).sub(_).normalize(),i.uStageDir.value.copy(this.tmpV);let v=z(t.stageIntensity*.5+t.audienceWash*.3,0,3)*.04+t.strobe*.04;i.uShowCol.value.copy(t.stageColor).multiplyScalar(v);let y=t.flashIntensity,b=xg(y),x=dg;y>0?(this.tmpV.copy(t.flashPos).sub(_).normalize(),i.uFlashDir.value.copy(this.tmpV),i.uFlashCol.value.copy(t.flashColor).multiplyScalar(.02*b),i.uFlashCol.value.r*=x.r,i.uFlashCol.value.g*=x.g,i.uFlashCol.value.b*=x.b):i.uFlashCol.value.setRGB(0,0,0);let S=t.glowColor,C=vg(t,this.bounceC);C.r*=x.r,C.g*=x.g,C.b*=x.b;let w=this.skyTune,T=z(t.smoke,0,1),E=w.bounceSkySmoke;i.uBounceFill.value=(E>0?z(T/E,0,1):1)*Math.max(z(w.fillOutside,0,1),this.glowReach);let D=.012*w.bounce;i.uGlowCol.value.setRGB(S.r*.05,S.g*.05,S.b*.05),i.uBounceCol.value.setRGB(C.r*D,C.g*D,C.b*D);let O=this.lightningAt(n,p,i.uLightning.value),k=i.uHorizonSE.value,A=this.skyTune.fogRG;this.fog.color.setRGB((k.r*.95+3e-4)*A*f,(k.g*.95+6e-4)*A*f,(k.b*.95+.0015)*f),y>0&&(this.fog.color.r+=t.flashColor.r*4e-4*b*x.r,this.fog.color.g+=t.flashColor.g*4e-4*b*x.g,this.fog.color.b+=t.flashColor.b*4e-4*b*x.b);let ee=z(this.smokeFog,0,1),te=.03+this.smokeTune.glow*T/(1+this.smokeTune.shade*ee),j=this.skyTune.bounceFogSmoke,ne=.006*this.skyTune.bounceFog*(j>0?z(T/j,0,1):1),M=i.uFogGlow.value;M.setRGB(S.r*te+C.r*ne,S.g*te+C.g*ne,S.b*te+C.b*ne),this.fog.color.r+=M.r,this.fog.color.g+=M.g,this.fog.color.b+=M.b,i.uSmoke.value=T*this.smokeTune.sky;let re=this.siteSmokeVol,ie=i.uCloudInv.value;re.k>0&&re.rh>0&&re.rv>0?(ie.set(1/re.rh,1/re.rv,1/re.rh,re.k),i.uCloudRel.value.set((_.x-re.x)/re.rh,(_.y-re.y)/re.rv,(_.z-re.z)/re.rh)):ie.w=0;let N=this.groundsVol,ae=i.uGlowInv.value,oe=N.rx>0&&N.ry>0&&N.rz>0?Math.max(0,N.k)*(1-this.glowReach):0;oe>0?(ae.set(1/N.rx,1/N.ry,1/N.rz,oe),i.uGlowRel.value.set((_.x-N.x)/N.rx,(_.y-N.y)/N.ry,(_.z-N.z)/N.rz),g.uWSmokeC.value.set(N.x,N.y,N.z,oe),g.uWSmokeInv.value.set(1/N.rx,1/N.ry,1/N.rz)):(ae.w=0,g.uWSmokeC.value.w=0),g.uWFogGlow.value.set(oe>0?M.r:0,oe>0?M.g:0,oe>0?M.b:0);let se=t.strobe*.01;this.fog.color.r+=se,this.fog.color.g+=se,this.fog.color.b+=se,i.uFogColor.value.copy(this.fog.color),this.fog.density=this.fogBase*(.75+.45*z(t.haze,0,1.5))*(1+this.smokeTune.fog*ee),this.app.scene.background.copy(this.fog.color);let P=.22+.78*h**.8,F=this.skyTune.fillRG*P;this.hemi.color.setRGB(.16*F,.3*F,.64*P),this.hemi.groundColor.setRGB(.04*P,.032*P,.024*P),this.hemi.intensity=.26,this.moonLight.position.copy(i.uMoonDir.value).multiplyScalar(500),this.moonLight.intensity=.14*B(0,1,1-u*.6),this.twilightLight.position.copy(this.sunDir).setY(.18).normalize().multiplyScalar(500);let ce=i.uTwilight.value.b/Rg.teal[0][2];this.twilightLight.intensity=.22*ce+.015,y>0&&(this.hemi.color.r+=t.flashColor.r*.002*b,this.hemi.color.g+=t.flashColor.g*.002*b,this.hemi.color.b+=t.flashColor.b*.002*b),O>0&&this.hemi.color.addScalar(O*.05);let le=this.groundGlow;this.hemi.color.r+=le.r*.12+C.r*.02,this.hemi.color.g+=le.g*.12+C.g*.02,this.hemi.color.b+=le.b*.12+C.b*.02,this.domeGrade&&(Vg(`zen`,n,i.uZenith.value),Vg(`se`,n,i.uHorizonSE.value),Vg(`nw`,n,i.uHorizonNW.value));let ue=this.starU;ue.uTime.value=n,ue.uCover.value=u,ue.uVis.value=l*6*(.35+.65*B(1,.2,h)),ue.uPlanetVis.value=3.5,ue.uPx.value=Math.max(1,this.app.renderer.getPixelRatio());let de=(n-780)/86164*Math.PI*2;this.rotM.makeRotationAxis(this.poleAxis,-de),this.sidereal.setFromMatrix4(this.rotM);let fe=this.stars.geometry.getAttribute(`position`),pe=fe.count;Ve(R(Je.venus.az[0],Je.venus.az[1],r),R(Je.venus.alt[0],Je.venus.alt[1],r),this.tmpV),fe.setXYZ(pe-2,this.tmpV.x,this.tmpV.y,this.tmpV.z),Ve(R(Je.jupiter.az[0],Je.jupiter.az[1],r),R(Je.jupiter.alt[0],Je.jupiter.alt[1],r),this.tmpV),fe.setXYZ(pe-1,this.tmpV.x,this.tmpV.y,this.tmpV.z),fe.needsUpdate=!0,this.stats_.level=Math.round(h*1e3)/1e3,this.stats_.sunAlt=Math.round(a*100)/100,this.stats_.moonAlt=Math.round(o*100)/100,this.stats_.cover=u,this.stats_.lightning=Math.round(O*100)/100}lightningAt(e,t,n){if(t<=0)return n.w=0,0;let r=Math.floor(e/16),i=0;for(let a=r-1;a<=r;a++){let r=qe(a*2654435761+12345);if((r&255)/255>.12+.4*Math.min(1,t))continue;let o=e-(a*16+(r>>>8&65535)/65535*16*.8);if(o<0||o>1.2)continue;let s=2+(r>>>24)%3,c=0;for(let e=0;e<s;e++){let t=o-e*(.09+(r>>>e*3&7)*.02);t>=0&&(c=Math.max(c,Math.exp(-t*18)*(1-e*.18)))}if(c+=Math.exp(-o*3)*.15,c>i){i=c;let e=245+(r>>>4&255)/255*55;Ve(e,2+(r>>>12&15)*.5,this.tmpV),n.set(this.tmpV.x,this.tmpV.y,this.tmpV.z,0)}}return n.w=i*t*.6,n.w}setQuality(e){this.q=e;let t={ultra:.0011,high:.00125,medium:.0014,mobile:.0019};this.fogBase=t[e.level]??.0013}setEnabled(e){this.enabled=e,this.sky&&(this.sky.visible=e),this.stars&&(this.stars.visible=e)}get skyLevel(){return this.level}stats(){return{...this.stats_,fog:this.fog?this.fog.density.toFixed(5):0,smokeAir:+this.smokeFog.toFixed(3)}}},Q=class e{pos=[];nor=[];uv=[];col=[];m3=new D;v=new u;n=new u;static cache=new Map;get vertexCount(){return this.pos.length/3}add(e,t,n=16777215,r){let i=e.index?e.toNonIndexed():e,a=i.getAttribute(`position`),o=i.getAttribute(`normal`),s=i.getAttribute(`uv`),c=i.getAttribute(`color`);this.m3.getNormalMatrix(t);let l=Array.isArray(n)?n:new I(n).toArray();for(let e=0;e<a.count;e++){this.v.fromBufferAttribute(a,e).applyMatrix4(t),this.pos.push(this.v.x,this.v.y,this.v.z),o?this.n.fromBufferAttribute(o,e).applyMatrix3(this.m3).normalize():this.n.set(0,1,0),this.nor.push(this.n.x,this.n.y,this.n.z);let n=s?s.getX(e):0,i=s?s.getY(e):0;r&&(n=r[0]+n*(r[2]-r[0]),i=r[1]+i*(r[3]-r[1])),this.uv.push(n,i),c?this.col.push(c.getX(e)*l[0],c.getY(e)*l[1],c.getZ(e)*l[2]):this.col.push(l[0],l[1],l[2])}return this}box(t,n,r,i,a,o,s=16777215,c=0,l){let d=new b().compose(new u(i,a,o),new F().setFromAxisAngle(oe.DEFAULT_UP,c),new u(t,n,r));return this.add(e.unit(`box`),d,s,l)}beam(t,n,r,i=16777215,a=!1,o){let s=new u().subVectors(n,t),c=s.length();if(c<1e-4)return this;let l=new F().setFromUnitVectors(oe.DEFAULT_UP,s.normalize()),d=new b().compose(new u().addVectors(t,n).multiplyScalar(.5),l,new u(r,c,r));return this.add(e.unit(a?`cyl6`:`box`),d,i,o)}cylinder(t,n,r,i,a,o=16777215,s=8,c=t){let l=`cyl${s}`,d=new b().compose(new u(r,i,a),new F,new u(t,n,t));if(c!==t){let e=new A(c,t,n,s);return this.add(e,new b().makeTranslation(r,i,a),o)}return this.add(e.unit(l),d,o)}build(){let e=new M;return e.setAttribute(`position`,new P(this.pos,3)),e.setAttribute(`normal`,new P(this.nor,3)),e.setAttribute(`uv`,new P(this.uv,2)),e.setAttribute(`color`,new P(this.col,3)),e.computeBoundingSphere(),e.computeBoundingBox(),e}static unit(t){let n=e.cache.get(t);return n||(n=t===`box`?new me(1,1,1):t.startsWith(`cyl`)?new A(1,1,1,Number(t.slice(3))||8):new me(1,1,1),n=n.toNonIndexed(),e.cache.set(t,n)),n}};function $(e){return new I(e).toArray()}var Wg=e=>({x:e.x,y:e.y,z:e.z}),Gg=class{group=new y;rotors;rotorBase=[];wheel;gondolas;lights;areaBeams=null;U={uTime:{value:0},uPx:{value:1},uGain:{value:1},uViewH:{value:720},uWheel:{value:new p(Tt,Ct,1,0)}};pv=new u;q=new F;one=new u(1,1,1);xAxis=new u(1,0,0);m=new b;r=new b;triangles=0;lightCount=0;constructor(e,t){this.group.name=`landmarks`;let n=Eg(new le({vertexColors:!0,roughness:.7,metalness:.4}),{key:`landmark`,lamps:!1}),r=[...e];this.buildGoliath(n,r),this.buildWheel(n,r,t),this.buildTurbines(n,r,t),this.buildAreas(n,r),this.buildLights(r)}add(t,n,r){let i=new e(t,n);return i.name=r,this.group.add(i),this.triangles+=t.getAttribute(`position`).count/3,i}buildGoliath(e,t){let n=new Q,r=$(`#5a1612`),i=$(`#6d7176`),a=Ee.map(([e,t],n)=>new u(e,L(e,t)+(Te[n]??5),t)),o=new ie(a,!1,`centripetal`),s=Math.floor(o.getLength()/4),c=o.getSpacedPoints(s);for(let e=1;e<c.length;e++)if(n.beam(c[e-1],c[e],.9,r),e%3==0){let t=c[e],r=L(t.x,t.z);t.y-r>3&&n.beam(new u(t.x,r,t.z),new u(t.x,t.y-.4,t.z),t.y-r>25?1.1:.6,i,!0)}let l=a[6],d=a[7];for(let e=0;e<=12;e++){let t=e/12,r=new u().lerpVectors(l,d,t);n.beam(new u(r.x-1.5,L(r.x,r.z),r.z),new u(r.x-.4,r.y,r.z),.35,i,!0),n.beam(new u(r.x+1.5,L(r.x,r.z),r.z),new u(r.x+.4,r.y,r.z),.35,i,!0)}this.add(n.build(),e,`goliath`),t.push({x:d.x,y:d.y+1.5,z:d.z,color:`#ff1a0a`,size:3.5,kind:3})}buildWheel(t,n,r){let i=St,s=Ct,c=wt,l=new u(i,Tt,s),d=new Q,f=$(`#c8ccd2`);for(let e of Nt)d.beam(new u(e[0],e[1],e[2]),new u(e[3],e[4],e[5]),Mt*2,f,!0);d.beam(new u(i-1.75,l.y,s),new u(i+1.75,l.y,s),.5,f,!0),this.add(d.build(),t,`ferris-frame`);let p=Eg(new le({vertexColors:!0,roughness:.75,metalness:.2,emissive:new I(.055,.04,.026)}),{key:`ferris-ride`,lamps:!1,edit:e=>{e.fragmentShader=e.fragmentShader.replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
	totalEmissiveRadiance *= vColor.rgb;`)}}),m=new Q;this.buildAccess(m,n,r),this.add(m.build(),p,`ferris-access`);let h=new Q;for(let e of[-Et,Et])for(let t=0;t<32;t++){let n=t/32*Math.PI*2,r=(t+1)/32*Math.PI*2;h.beam(new u(e,Math.sin(n)*c,Math.cos(n)*c),new u(e,Math.sin(r)*c,Math.cos(r)*c),.35,f),t%2==0&&h.beam(new u(e,0,0),new u(e,Math.sin(n)*c,Math.cos(n)*c),.14,f)}for(let e=0;e<16;e++){let t=e/16*Math.PI*2;h.beam(new u(-Et,Math.sin(t)*c,Math.cos(t)*c),new u(Et,Math.sin(t)*c,Math.cos(t)*c),.12,f,!0)}let g=new e(h.build(),t);g.name=`ferris-wheel`,this.wheel=new y,this.wheel.position.copy(l),this.wheel.add(g),this.group.add(this.wheel),this.triangles+=g.geometry.getAttribute(`position`).count/3;let _=Kg(r);this.gondolas=new T(_,p,16),this.gondolas.name=`ferris-gondolas`,this.gondolas.instanceMatrix.setUsage(o);let v=new I;for(let e=0;e<16;e++)this.gondolas.setColorAt(e,v.setRGB(...$(e%2?`#7a2a8a`:`#d8d2c0`)));_.boundingSphere=new a(l.clone(),c+4),this.gondolas.boundingSphere=new a(l.clone(),c+4),this.group.add(this.gondolas),this.triangles+=_.getAttribute(`position`).count/3*16,this.poseWheel(0);for(let e of[-1,1])for(let t=0;t<48;t++){let r=t/48*Math.PI*2;n.push({x:l.x+e,y:l.y+Math.sin(r)*c,z:l.z+Math.cos(r)*c,color:t%2?`#ffd9a0`:`#c77dff`,size:.9,kind:5})}for(let e=0;e<16;e++){let t=e/16*Math.PI*2;n.push({x:l.x,y:l.y+Math.sin(t)*c,z:l.z+Math.cos(t)*c,color:`#ffc88a`,size:.55,kind:6})}}buildAccess(e,t,n){let r=Lt,i=Rt,a=zt,o=$(`#8a7458`),s=$(`#2a2530`),c=$(`#9aa0a6`),l=$(`#5c2470`),d=$(`#e0b422`),f=L(i.x0,i.z0),p=new b,m=new F,h=new u,g=new u;{let t=Math.hypot(i.z1-i.z0,r.y-f),n=Math.atan2(r.y-f,i.z1-i.z0);m.setFromAxisAngle(new u(1,0,0),-n),h.set((i.x0+i.x1)/2,(f+r.y)/2-.06,(i.z0+i.z1)/2),p.compose(h,m,g.set(i.x1-i.x0,.12,t+.02)),e.add(Q.unit(`box`),p,o)}let _=(r.x0+r.x1)/2,v=(r.z0+r.z1)/2;e.box(r.x1-r.x0,.14,r.z1-r.z0,_,r.y-.07,v,o),e.box(r.x1-r.x0,r.y-f,r.z1-r.z0-.3,_,(r.y+f)/2-.07,v,s),e.box(.14,.012,r.z1-r.z0-.2,r.x1-.12,r.y+.006,v,d);let y=(r,i,a,o,s,d)=>{let f=Math.hypot(a-r,o-i),p=Math.max(1,Math.round(f/1.4));for(let t=0;t<=p;t++){let n=t/p,l=r+(a-r)*n,u=i+(o-i)*n,f=s+(d-s)*n;e.box(.06,1.05,.06,l,f+.525,u,c)}for(let t of[1.05,.55])e.beam(new u(r,s+t,i),new u(a,d+t,o),.05,t>1?l:c);if(!n||p>3){let e=Math.max(2,Math.round(f/1.1));for(let n=0;n<=e;n++){let c=(n+.5)/(e+1);t.push({x:r+(a-r)*c,y:s+(d-s)*c+1.12,z:i+(o-i)*c,color:n%3==1?`#c77dff`:`#ffd9a0`,size:.28,kind:7})}}},x=a.z+.3;y(i.x0,x,i.x0,r.z0,f+(r.y-f)*((x-i.z0)/(i.z1-i.z0)),r.y),y(i.x1,x,i.x1,r.z0,f+(r.y-f)*((x-i.z0)/(i.z1-i.z0)),r.y),y(r.x0,r.z0,r.x0,r.z1,r.y,r.y),y(r.x0,r.z1,r.x1,r.z1,r.y,r.y),y(i.x1,r.z0,r.x1,r.z0,r.y,r.y),y(r.x1,r.z0,r.x1,r.z0+1,r.y,r.y),y(r.x1,r.z1-1,r.x1,r.z1,r.y,r.y);let S=L((a.x0+a.x1)/2,a.z);for(let t of[a.x0-.12,a.x1+.12])e.box(.18,3.6,.18,t,S+1.8,a.z,l);e.box(a.x1-a.x0+.6,.55,.14,(a.x0+a.x1)/2,S+3.35,a.z,l);for(let e=0;e<=8;e++){let n=e/8;t.push({x:a.x0-.2+(a.x1-a.x0+.4)*n,y:S+3.68,z:a.z-.1,color:e%2?`#c77dff`:`#ffd9a0`,size:.35,kind:7})}for(let e of[a.x0-.12,a.x1+.12])for(let n=0;n<4;n++)t.push({x:e,y:S+.6+n*.8,z:a.z-.12,color:`#ffd9a0`,size:.3,kind:7});let C=r.x0-1.1,w=r.z0+.9,T=L(C,w);e.box(1.5,2.3,1.5,C,T+1.15,w,$(`#3a2d44`)),e.box(1.8,.12,1.8,C,T+2.36,w,l),t.push({x:C+.78,y:T+1.5,z:w,color:`#ffe2b0`,size:.9,kind:7})}poseWheel(e){let t=Ht(e);this.wheel.rotation.x=t,this.U.uWheel.value.z=Math.cos(t),this.U.uWheel.value.w=Math.sin(t);for(let t=0;t<16;t++){let n=Kt(t,e,this.pv);this.q.setFromAxisAngle(this.xAxis,n),this.m.compose(this.pv,this.q,this.one),this.gondolas.setMatrixAt(t,this.m)}this.gondolas.instanceMatrix.needsUpdate=!0}buildTurbines(e,t,n){let r=new ft(1234),i=new Q,a=$(`#aeb4ba`),s=[];for(let[e,t,i,a]of[[352,30,5,7],[20,70,3.2,7],[70,104,4.5,6]])for(let o=0;o<(n?Math.ceil(a/2):a);o++){let n=e+(t-e+360)%360*((o+.5+r.range(-.2,.2))/a),c=i*1e3*r.range(.9,1.1),l=E.clamp(760+(c-3e3)*.06,760,1e3),d=l/c,f=Ve(n,0),p=new u(f.x*l,-.8,f.z*l);s.push({p,h:135*d,s:d})}let c=new Q;for(let e=0;e<3;e++){let t=e/3*Math.PI*2,n=new u(Math.cos(t),Math.sin(t),0);c.beam(new u(0,0,0),n,.045,a)}c.cylinder(.06,.12,0,0,0,a,8);for(let e of s)i.cylinder(3.5*e.s,e.h,e.p.x,e.p.y+e.h/2,e.p.z,a,8,2*e.s),i.box(4*e.s,4*e.s,12*e.s,e.p.x,e.p.y+e.h+2*e.s,e.p.z,a),t.push({x:e.p.x,y:e.p.y+e.h+4.5*e.s,z:e.p.z,color:`#ff1206`,size:18*e.s+1.5,kind:1});this.add(i.build(),e,`turbine-towers`);let l=c.build();this.rotors=new T(l,e,s.length),this.rotors.name=`turbine-rotors`,s.forEach(e=>{let t=new F().setFromUnitVectors(new u(0,0,1),Ve(340,0)),n=new b().compose(new u(e.p.x,e.p.y+e.h+2*e.s,e.p.z),t,new u(60*e.s,60*e.s,60*e.s));this.rotorBase.push(n)}),this.rotorBase.forEach((e,t)=>this.rotors.setMatrixAt(t,e)),this.rotors.instanceMatrix.setUsage(o),this.rotors.frustumCulled=!1,this.group.add(this.rotors),this.triangles+=l.getAttribute(`position`).count/3*s.length}buildAreas(e,t){let n=new Q,r=new Q,i=new ft(4040),a=[],o=$(`#141416`);for(let e of Se){let s=Math.hypot(e.x,e.z),c=s>330?330/s:1,l=e.x*c,d=e.z*c,f=L(l,d)-.3,p=Math.atan2(-l,-d),m=new F().setFromAxisAngle(oe.DEFAULT_UP,p+i.range(-.5,.5)),h=new b().compose(new u(l,f,d),m,new u(c,c,c)),g=(e,t,n)=>new u(e,t,n).applyMatrix4(h),_=(e,t,r,i,a,o,s)=>n.add(Q.unit(`box`),h.clone().multiply(new b().compose(new u(i,a,o),new F,new u(e,t,r))),s),v=new I(e.hue),y=e.r*1.1;if(e.name===`PURPLE`)for(let e=0;e<3;e++){let t=(e===2?-3:e-1)*12,a=i.range(-3,3),s=new he(11,9,6,4),c=s.getAttribute(`position`);for(let e=0;e<c.count;e++){let t=c.getX(e)/11,n=c.getY(e)/9;c.setZ(e,(t*t-n*n)*6+7.5)}s.rotateX(-Math.PI/2),s.computeVertexNormals(),r.add(s,h.clone().multiply(new b().makeTranslation(t,0,a)),$(`#b8b2c8`));for(let[e,r]of[[-5.5,-4.5],[5.5,-4.5],[-5.5,4.5],[5.5,4.5]])n.beam(g(t+e,0,a+r),g(t+e,9.5,a+r),.18,o)}else{let e=y,s=9+i.range(0,4);for(let t of[-e/2,e/2])for(let e of[-5,5])n.beam(g(t,0,e),g(t,s,e),.6,o);for(let t of[-5,5])n.beam(g(-e/2,s,t),g(e/2,s,t),.5,o);for(let t=0;t<=4;t++)n.beam(g(-e/2+e*t/4,s,-5),g(-e/2+e*t/4,s,5),.35,o);_(e*.9,1.4,8,0,.7,0,$(`#0c0c0d`)),_(e*.8,s*.6,.3,0,s*.3+1.4,-4.7,$(`#0e0e10`));let l=2+i.int(0,1);for(let n=0;n<l;n++){let a=(n%2?1:-1)*(e/2+7+i.range(0,6)),o=i.range(-4,8),s=i.range(6,9);r.add(Q.unit(`box`),h.clone().multiply(new b().compose(new u(a,1.3,o),new F,new u(s,2.6,s))),$(`#8f8a80`));let l=new ye(s*.72,3.2,4);l.rotateY(Math.PI/4),r.add(l,h.clone().multiply(new b().makeTranslation(a,4.2,o)),$(`#a39e92`)),t.push({...Wg(g(a,2.2,o+s/2+.2)),color:`#ffcf8a`,size:2.2*c+.6,kind:0})}let d=3+i.int(0,2);for(let t=0;t<d;t++){let n=-e/2+e*(t+.5)/d,r=new u(i.range(-.35,.35),1,i.range(-.25,.25)).normalize().applyQuaternion(m);a.push({p:g(n,s-.4,0),dir:r,col:v.clone().lerp(new I(`#ffffff`),i.range(0,.2)),len:70*c+25,w:.6*c+.2,seed:i.next()})}}let x=12+i.int(0,8);for(let n=0;n<x;n++){let n=i.chance(.6),r=g(i.range(-y/2,y/2),n?i.range(1.5,9):i.range(3,10),i.range(-5,6));t.push({...Wg(r),color:n?e.hue:i.pick([`#fff1d6`,`#ffd49a`,`#e8f0ff`]),size:(n?4.5:2.2)*c+.8,kind:n?2:0})}t.push({...Wg(g(0,7,0)),color:e.hue,size:y*1.2*c+8,kind:4})}this.add(n.build(),e,`other-areas`);let s=Eg(new le({vertexColors:!0,roughness:.85,side:2,emissive:new I(.03,.022,.04)}),{key:`area-fabric`,lamps:!1});this.add(r.build(),s,`other-areas-fabric`),this.buildAreaBeams(a);for(let e=0;e<70;e++){let e=i.range(30,62),n=Ve(e,0),r=i.range(900,1e3);t.push({x:n.x*r,y:i.range(1,9),z:n.z*r,color:i.pick([`#ffb45a`,`#ffcf8a`,`#fff0d0`]),size:i.range(2,4),kind:0})}for(let e=0;e<60;e++){let e=i.range(0,360),n=Ve(e,0),r=i.range(520,1e3);Math.abs(n.x*r)<300&&n.z*r>-300&&n.z*r<350||t.push({x:n.x*r,y:i.range(2,7),z:n.z*r,color:i.pick([`#ffb45a`,`#ffe0b0`,`#ffffff`]),size:i.range(1.5,3),kind:i.chance(.1)?2:0})}}buildAreaBeams(t){if(!t.length)return;let n=[],r=[],i=[],a=[],o=new u(0,1,0),s=new u,c=new u;for(let e of t){s.crossVectors(e.dir,o),s.lengthSq()<1e-4&&s.set(1,0,0),s.normalize(),c.crossVectors(e.dir,s).normalize();let t=n.length/3;for(let t of[0,1]){let a=e.w*(1+t*5);for(let o=0;o<6;o++){let l=o/6*Math.PI*2,u=e.p.clone().addScaledVector(e.dir,e.len*t).addScaledVector(s,Math.cos(l)*a).addScaledVector(c,Math.sin(l)*a);n.push(u.x,u.y,u.z),r.push(e.col.r,e.col.g,e.col.b),i.push(e.seed,e.len,t)}}for(let e=0;e<6;e++){let n=t+e,r=t+(e+1)%6,i=t+6+e,o=t+6+(e+1)%6;a.push(n,r,i,r,o,i)}}let l=new M;l.setAttribute(`position`,new P(n,3)),l.setAttribute(`color`,new P(r,3)),l.setAttribute(`aSway`,new P(i,3)),l.setIndex(a),l.computeBoundingSphere();let d=new C({uniforms:{uTime:this.U.uTime},vertexShader:`
        attribute vec3 color;
        attribute vec3 aSway;
        uniform float uTime;
        varying vec3 vCol;
        varying float vT;
        void main() {
          vec3 p = position;
          float s = aSway.x * 6.283;
          p.xz += vec2( sin( uTime * 0.31 + s ), cos( uTime * 0.23 + s * 1.7 ) ) * aSway.z * aSway.y * 0.2;
          vec4 mv = modelViewMatrix * vec4( p, 1.0 );
          gl_Position = projectionMatrix * mv;
          vCol = color;
          vT = aSway.z;
        }`,fragmentShader:`
        varying vec3 vCol;
        varying float vT;
        void main() {
          float a = pow( 1.0 - vT, 2.0 ) * 0.014;
          gl_FragColor = vec4( vCol * a, 1.0 );
        }`,transparent:!0,depthWrite:!1,blending:2,side:2,fog:!1}),f=new e(l,d);f.name=`area-beams`,f.renderOrder=4,f.visible=!1,this.areaBeams=f,this.group.add(f),this.triangles+=a.length/3}buildLights(e){let t=e.length,n=new Float32Array(t*3),r=new Float32Array(t*3),i=new Float32Array(t),a=new Float32Array(t),o=new Float32Array(t),s=new I;e.forEach((e,t)=>{n.set([e.x,e.y,e.z],t*3),s.set(e.color),r.set([s.r,s.g,s.b],t*3),i[t]=e.size,a[t]=e.kind,o[t]=qe(t*977)%1e3/1e3});let c=new M;c.setAttribute(`position`,new j(n,3)),c.setAttribute(`color`,new j(r,3)),c.setAttribute(`aSize`,new j(i,1)),c.setAttribute(`aKind`,new j(a,1)),c.setAttribute(`aSeed`,new j(o,1));let l=new C({uniforms:this.U,vertexShader:`
        attribute vec3 color;
        attribute float aSize;
        attribute float aKind;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPx;
        uniform float uGain;
        uniform float uViewH;
        uniform vec4 uWheel;
        varying vec3 vCol;
        void main() {
          vec3 p = position;
          float kind = aKind;
          if ( aKind > 4.5 && aKind < 6.5 ) {
            // Ferris wheel bulbs: turn about the axle (X) with the rims; gondola lamps hang below it
            vec2 d = p.yz - uWheel.xy;
            p.y = uWheel.x + d.x * uWheel.z - d.y * uWheel.w;
            p.z = uWheel.y + d.x * uWheel.w + d.y * uWheel.z;
            if ( aKind > 5.5 ) p.y -= 0.5;
          }
          if ( aKind > 4.5 ) kind = 0.0;
          vec4 mv = modelViewMatrix * vec4( p, 1.0 );
          gl_Position = projectionMatrix * mv;
          float dist = max( 1.0, - mv.z );
          // projected size of the glow sprite, at least ~1.6 px (distant lamps stay visible points)
          float px = aSize * projectionMatrix[1][1] * 0.5 * uViewH / dist;
          // the Ferris wheel's own bulbs (kinds 5-7) seen from the walkway, the platform or a gondola, 1-10 m
          // away: a world-size glow would draw each as a 30-48 px disc; up close they read as small bulbs
          // (from ~20 m on nothing changes)
          if ( aKind > 4.5 ) px = min( px, mix( 10.0, 48.0, smoothstep( 2.0, 20.0, dist ) ) * uPx );
          gl_PointSize = clamp( px, 1.6 * uPx, 48.0 * uPx );
          px /= uPx;
          float k = 1.0;
          if ( kind > 0.5 && kind < 1.5 ) {
            // synchronised W-rot obstruction lights: 1 s on, 0.5 off, 1 on, 1.5 off
            float ph = mod( uTime, 4.0 );
            k = ( ph < 1.0 || ( ph > 1.5 && ph < 2.5 ) ) ? 1.0 : 0.04;
          } else if ( kind > 1.5 && kind < 2.5 || kind > 3.5 ) {
            k = 0.65 + 0.35 * sin( uTime * ( 1.3 + aSeed * 2.0 ) + aSeed * 30.0 );
          }
          // small sprites carry the energy of the whole lamp: brighter when sub-pixel
          float area = max( 1.0, 2.6 / max( px, 0.3 ) );
          // kind 4 = broad dim haze glow over a lit area (no hot core)
          float gain = kind > 3.5 ? 0.12 : ( kind > 0.5 && kind < 1.5 || kind > 2.5 ? 3.0 : 1.6 );
          vCol = color * k * uGain * min( area, 4.0 ) * gain;
        }`,fragmentShader:`
        varying vec3 vCol;
        void main() {
          vec2 c = gl_PointCoord * 2.0 - 1.0;
          float r2 = dot( c, c );
          float a = exp( - r2 * 5.0 ) + exp( - r2 * 40.0 ) * 1.5;
          if ( a < 0.01 ) discard;
          gl_FragColor = vec4( vCol * a, 1.0 );
        }`,transparent:!0,depthWrite:!1,blending:2,fog:!1});this.lights=new re(c,l),this.lights.name=`distant-lights`,this.lights.frustumCulled=!1,this.lights.renderOrder=4,this.group.add(this.lights),this.lightCount=t}setAreaBeams(e){this.areaBeams&&(this.areaBeams.visible=e)}update(e,t,n,r){this.U.uTime.value=e,this.U.uPx.value=t,this.U.uViewH.value=n,this.U.uGain.value=.9+.3*(1-r);for(let t=0;t<this.rotorBase.length;t++)this.r.makeRotationZ(e*1.25+t*1.7),this.m.multiplyMatrices(this.rotorBase[t],this.r),this.rotors.setMatrixAt(t,this.m);this.rotors.instanceMatrix.needsUpdate=!0,this.poseWheel(e)}};function Kg(e){let t=It,n=new Q,r=$(`#ffffff`),i=$(`#b4b8be`),a=$(`#8a7a66`),o=t.w/2,s=t.d/2,c=t.floorY,l=c+t.wallH,d=t.roofY;for(let e of[-.5,.5])n.box(.06,-d,.06,e,d/2,0,i);if(n.box(t.w+.2,.07,t.d+.2,0,d+.035,0,r),!e){let e=new ye(Math.SQRT1_2,.3,4);e.rotateY(Math.PI/4),n.add(e,new b().compose(new u(0,d+.22,0),new F,new u(t.w+.2,1,t.d+.2)),r)}for(let e of[-1,1])for(let t of[-1,1])n.box(.05,d-l,.05,e*(o-.03),(d+l)/2,t*(s-.03),i);n.box(t.w,.06,t.d,0,c-.03,0,a);for(let e of[-1,1])n.box(t.w,t.wallH,.04,0,c+t.wallH/2,e*(s-.02),r);n.box(.04,t.wallH,t.d,o-.02,c+t.wallH/2,0,r);let f=s-t.door;for(let e of[-1,1])n.box(.04,t.wallH,f,-(o-.02),c+t.wallH/2,e*(t.door+f/2),r);for(let e of[-1,1])n.box(t.w+.04,.04,.07,0,l,e*(s-.02),i);for(let e of[t.wallH,t.wallH*.5])n.box(.04,.04,2*t.door+.04,-(o-.02),c+e,0,i);for(let r of[-1,1])n.box(t.w-.1,.07,.42,0,c+t.seatH-.035,r*(s-.27),a),n.box(t.w-.1,.3,.05,0,c+t.seatH+.19,r*(s-.07),a),e||n.box(t.w-.1,t.seatH-.07,.04,0,c+(t.seatH-.07)/2,r*(s-.47),a);return n.build()}var qg=null;function Jg(){return qg??=Eg(new le({map:Vh(),alphaTest:.5,side:2,vertexColors:!0,metalness:.35,roughness:.55}),{key:`barrier`}),qg}var Yg=$(`#8d9196`),Xg=$(`#b7bcc2`),Zg=$(`#141416`);function Qg(e,t,n=!1){let r=[],i=n?[...e,e[0]]:e;for(let e=1;e<i.length;e++){let[n,a]=i[e-1],[o,s]=i[e],c=Math.hypot(o-n,s-a),l=Math.max(1,Math.round(c/t)),d=Math.atan2(-(s-a),o-n),f=new F().setFromAxisAngle(oe.DEFAULT_UP,d),p=c/l/t;for(let e=0;e<l;e++){let t=(e+.5)/l,i=n+(o-n)*t,c=a+(s-a)*t;r.push(new b().compose(new u(i,L(i,c),c),f,new u(p,1,1)))}}return r}function $g(t,n){let r=[],i=[],a=0,o=Eg(new le({vertexColors:!0,metalness:.6,roughness:.45}),{key:`metal`}),s=(e,n,r,o)=>{if(!r.length)return;let s=new T(e,n,r.length);r.forEach((e,t)=>s.setMatrixAt(t,e)),s.instanceMatrix.needsUpdate=!0,s.computeBoundingSphere(),s.name=o,t.add(s),i.push(s),a+=e.getAttribute(`position`).count/3*r.length},c=(n,r,o)=>{let s=new e(n,r);return s.name=o,t.add(s),i.push(s),a+=n.getAttribute(`position`).count/3,s};for(let e of Pe)r.push({kind:`box`,minX:e.x-tt.fence/2,maxX:e.x+tt.fence/2,minZ:e.z-tt.fence/2,maxZ:e.z+tt.fence/2,tag:`pillar`});let l=[],d=[],f=[];{let e=new ft(61),t=Qe.x0+3,n=[[[-t,-6],[-109.5,-6],[-109.5,-22]],[[t,-6],[109.5,-6],[109.5,-22]],[[-109.5,-6],[-109.5,99]],[[109.5,-6],[109.5,99]],[[109.5,99],[130,150]],[[-109.5,99],[-109.5,120],[-135,150]]];for(let t of n){let n=Qg(t,3.5);for(let t of n){l.push(t);let n=e.next();f.push(n<.55?0:n<.72?1:n<.84?2:n<.94?3:4)}}d.push(...Qg([[-120,173.5],[bt.x0,173.5]],3.5)),d.push(...Qg([[bt.x1+4,173.5],[zt.x0,173.5]],3.5)),d.push(...Qg([[zt.x1,173.5],[125,173.5]],3.5))}s(e_(),o,[...l,...d],`heras-frames`);{let e=t_(),t=Eg(new le({map:e,alphaTest:.5,side:2,roughness:.9,metalness:0}),{key:`scrim`,lamps:!0,edit:e=>{e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
attribute vec2 aCell;`).replace(`#include <uv_vertex>`,`#include <uv_vertex>
#ifdef USE_MAP
vMapUv = ( uv + aCell ) * vec2( 0.5, 0.25 );
#endif`)}}),n=new he(3.45,1.95);n.translate(0,1.075,0);let r=l.length+d.length,i=new Float32Array(r*2);for(let e=0;e<r;e++){let t=e<l.length?f[e]:7;i[e*2]=t%2,i[e*2+1]=3-Math.floor(t/2)}n.setAttribute(`aCell`,new x(i,2)),s(n,t,[...l,...d],`heras-scrim`)}{let o=vt,s=new Q,c=L(o.x,o.z),l=o.x-o.w/2,d=o.x+o.w/2,f=o.z-o.d/2,p=o.z+o.d/2,m=$(`#2e2e30`),h=Hh,g=(e,t,n,r)=>{let i=Math.hypot(n-e,r-t),a=Math.atan2(-(r-t),n-e),l=Math.max(1,Math.round(i/1.05)),d=new he(i,o.fenceH),f=d.getAttribute(`uv`);for(let e=0;e<f.count;e++)f.setX(e,f.getX(e)*l);let p=(e+n)/2,g=(t+r)/2,_=new F().setFromAxisAngle(oe.DEFAULT_UP,a);s.add(d,new b().compose(new u(p,c+o.fenceH/2,g),_,new u(1,1,1)),m),s.box(i,.05,.05,p,c+o.fenceH-.02,g,m,a,h),s.box(.07,o.fenceH,.07,e,c+o.fenceH/2,t,m,a,h)};g(l,f,d,f),g(d,f,d,p),g(d,p,l,p),g(l,p,l,f);let _=$(`#8a8c90`);if(!n)for(let e of[l-.45,d+.45])s.box(.9,.024,o.d+.5,e,c+.012,o.z,_,0,h);let v=$(`#1c1c1e`),y=f+.06,x=p-.5;s.box(o.w-.7,o.riserY,x-y,o.x,c+o.riserY/2,(y+x)/2,v,0,h),s.box(1.6,o.riserY/2,.36,o.x+2.6,c+o.riserY/4,p-.3,v,0,h);let S=_t.z-_t.d/2+.4,C=c+_t.deckY+2.2;for(let e of[-5.6,5.6])s.box(.06,C-.18-(c+o.riserY),.06,e,(C-.18+c+o.riserY)/2,S,m,0,h),s.box(.34,.2,.46,e,C-.1,S,v,0,h),n||(s.box(.34,.04,.34,e,c+o.riserY+.02,S+.02,m,0,h),s.box(.1,.3,.1,e,c+o.riserY+.19,S,m,0,h));if(!n)for(let[e,t,n]of[[-4.6,1.2,.8],[-3.2,1.2,.8],[4.2,1.6,.9]])s.box(t,n,.6,e,c+o.riserY+n/2,x-.35,v,0,h);let w=new e(s.build(),Jg());w.name=`foh-pen`,t.add(w),i.push(w),a+=w.geometry.getAttribute(`position`).count/3,r.push({kind:`box`,minX:l-.1,maxX:d+.1,minZ:f-.1,maxZ:p+.1,tag:`campen`})}{let n=Re,a=new Q,s=(n.z0+n.z1)/2,l=n.z1-n.z0,d=(e,t)=>L(e,t),f=n.deckY;a.box(n.x1-n.x0,.12,l,0,f-.06,s,$(`#4a3a2c`)),a.box(n.x1-n.x0,.4,.12,0,f-.32,n.z0+.06,$(`#1a1a1c`)),a.box(n.x1-n.x0,.4,.12,0,f-.32,n.z1-.06,$(`#1a1a1c`));for(let e of[-24,-12,0,12,24])a.box(.2,.36,l,e,f-.3,s,$(`#2a2a2d`));let p=[-30,-18,-6.5,6.5,18,30];for(let e of p)for(let t of[n.z0+.25,n.z1-.25])a.beam(new u(e,d(e,t),t),new u(e,f-.5,t),.22,$(`#2c2d31`));for(let e=1;e<p.length;e++)if(!(Math.abs(p[e-1]+p[e])<1))for(let t of[n.z0+.25,n.z1-.25]){let n=d(p[e-1],t)+.4;a.beam(new u(p[e-1],n,t),new u(p[e],f-.6,t),.08,Yg),a.beam(new u(p[e],n,t),new u(p[e-1],f-.6,t),.08,Yg)}let m=e=>{for(let t of[f+1.1,f+.1])a.beam(new u(n.x0,t,e),new u(n.x1,t,e),.06,Xg,!0);for(let t=n.x0;t<=n.x1+.01;t+=2)a.beam(new u(t,f,e),new u(t,f+1.1,e),.05,Xg,!0)};m(n.z0+.1),m(n.z1-.1);let h=Math.round((f-d(n.x1,s))/.18);for(let e of[-1,1]){for(let t=0;t<h;t++){let r=t/h,i=(t+1)/h,o=e*(n.x1+n.stair*r),c=e*(n.x1+n.stair*i),u=d((o+c)/2,s),p=f-(f-u)*i;a.box(Math.abs(c-o),Math.max(.05,p-u),l,(o+c)/2,(p+u)/2,s,$(t%2?`#3f3226`:`#46382a`))}for(let t of[n.z0+.1,n.z1-.1]){let r=new u(e*n.x1,f+1,t),i=new u(e*(n.x1+n.stair),d(e*(n.x1+n.stair),t)+1,t);a.beam(r,i,.05,Xg,!0)}}c(a.build(),o,`photo-terrace`);let g=new e(new he(n.x1-n.x0,.95),new le({color:`#9fb4c0`,transparent:!0,opacity:.12,roughness:.05,metalness:.2,depthWrite:!1}));g.position.set(0,f+.6,n.z0+.1),g.name=`terrace-glass`,t.add(g),i.push(g);let _=n.x1+n.stair;r.push({kind:`box`,minX:-_,maxX:_,minZ:n.z0-.35,maxZ:n.z0+.15,tag:`terrace`}),r.push({kind:`box`,minX:-_,maxX:_,minZ:n.z1-.15,maxZ:n.z1+.35,tag:`terrace`})}{let e=new Q,t=[[116,144,Math.atan2(-.6,-.8)],[-116,132,Math.atan2(.85,-.53)]],n=[];for(let[i,a,o]of t){let t=L(i,a),s=new F().setFromAxisAngle(oe.DEFAULT_UP,o),c=new b().compose(new u(i,t,a),s,new u(1,1,1)),l=(t,n,r,i,a,o,s)=>{e.add(Q.unit(`box`),c.clone().multiply(new b().compose(new u(i,a,o),new F,new u(t,n,r))),s)};for(let e of[-7,7])l(1.6,7,1.6,e,3.5,0,Zg),l(1.9,.3,1.9,e,7.15,0,$(`#2a2a2d`));l(15.6,.5,.5,0,6.6,0,$(`#2a2a2d`)),l(15.6,.5,.5,0,5.3,0,$(`#2a2a2d`)),n.push(c.clone().multiply(new b().makeTranslation(0,5.95,.3))),n.push(c.clone().multiply(new b().compose(new u(0,5.95,-.3),new F().setFromAxisAngle(oe.DEFAULT_UP,Math.PI),new u(1,1,1)))),r.push({kind:`circle`,x:i+Math.cos(o)*7,z:a-Math.sin(o)*7,r:1.3,tag:`gate`}),r.push({kind:`circle`,x:i-Math.cos(o)*7,z:a+Math.sin(o)*7,r:1.3,tag:`gate`})}c(e.build(),o,`entrance-gates`);let i=n_();s(new he(13.5,1.5),new ne({map:i,color:new I(.9,.9,.9)}),n,`gate-banners`)}{let e=new Q,t=ke+2.4,n=$(`#4a3a2c`);e.box(De.x1-De.x0,.4,De.z1-De.z0-4,(De.x0+De.x1)/2,t-.2,(De.z0+4+De.z1)/2,n);for(let t=De.x0+2;t<De.x1;t+=6)for(let n=De.z0+6;n<De.z1;n+=6)e.box(.3,3,.3,t,ke+.3,n,$(`#2a2420`));for(let n=De.x0;n<De.x1;n+=2.5)e.box(.05,1.1,.05,n,t+.55,De.z0+4,Xg);e.box(De.x1-De.x0,.05,.05,(De.x0+De.x1)/2,t+1.1,De.z0+4,Xg);for(let r of[-26,-10,22,40]){let i=new u(r,L(r,bt.z1)+.1,bt.z1),a=new u(r,t,De.z0+4.5);e.beam(i,a,.1,n),e.box(2.4,.15,a.z-i.z,r,(i.y+a.y)/2,(i.z+a.z)/2,n)}c(e.build(),o,`premium-deck`);let r=new Q;for(let[e,n]of[[-53,-20],[-12,13],[16,50]]){let i=(e+n)/2,a=n-e,o=new he(a,13,8,4),s=o.getAttribute(`position`);for(let e=0;e<s.count;e++){let t=s.getX(e)/a,n=s.getY(e)/13;s.setZ(e,(t*t-n*n)*7+5.5)}o.rotateX(-Math.PI/2),o.computeVertexNormals(),r.add(o,new b().makeTranslation(i,t,194.5),$(`#8a857b`));for(let e of[-.5,.5])for(let n of[-6.5,6.5])r.box(.2,8,.2,i+e*a,t+4,194.5+n,Xg)}let i=Eg(new le({vertexColors:!0,roughness:.8,side:2}),{key:`sail`,lamps:!1});c(r.build(),i,`premium-sails`)}return{colliders:r,triangles:a,drawables:i}}function e_(){let e=new Q,t=3.45;for(let n of[-3.45/2,t/2])e.box(.04,2,.04,n,1.12,0,Yg);e.box(t,.04,.04,0,2.12,0,Yg),e.box(t,.04,.04,0,.14,0,Yg);for(let n of[-3.45/2,t/2])e.box(.22,.14,.62,n,.07,0,$(`#6c6a66`));return e.build()}function t_(){let[e,t]=Uh(1024,1024),n=e=>({x:e%2*512,y:Math.floor(e/2)*256}),r=(e,n)=>{t.fillStyle=`#131315`,t.fillRect(e,n,512,256),t.fillStyle=`rgba(255,255,255,0.03)`;for(let r=0;r<256;r+=3)t.fillRect(e,n+r,512,1);for(let r=0;r<512;r+=3)t.fillRect(e+r,n,1,256);t.fillStyle=`#2a2a2e`;for(let r=10;r<512;r+=40)t.fillRect(e+r,n+2,5,6),t.fillRect(e+r,n+256-8,5,6)},i=(e,n,r,i,a,o)=>{t.save(),t.font=`900 ${i}px "Arial Narrow", "Roboto Condensed", Impact, "Helvetica Neue", Arial, sans-serif`;let s=t.measureText(e).width,c=Math.min(.78,o/Math.max(1,s));t.translate(n,r),t.scale(c,1),t.fillStyle=a,t.textAlign=`center`,t.textBaseline=`middle`,t.fillText(e,0,0),t.restore()};r(n(0).x,n(0).y);{let{x:e,y:i}=n(1);r(e,i),t.fillStyle=`#7a0d18`,t.beginPath(),t.moveTo(e,i+256);for(let n=0;n<=16;n++)t.lineTo(e+n*512/16,i+256-(n%2?90:40)-n*37%23);t.lineTo(e+512,i+256),t.fill()}{let{x:e,y:a}=n(2);r(e,a),t.fillStyle=`#8c0f1c`,t.fillRect(e,a+158.72,512,25.6),i(`RED`,e+256,a+115.2,170,`#e8e4dc`,307.2)}{let{x:e,y:t}=n(3);r(e,t),i(`HOLY GROUNDS`,e+256,t+128,110,`#c9a45c`,460.8)}{let{x:e,y:r}=n(4);t.fillStyle=`#131315`,t.fillRect(e,r,512,256),t.save(),t.beginPath(),t.rect(e,r,512,256),t.clip(),t.fillStyle=`#6e0c16`;for(let n=-4;n<12;n++)t.beginPath(),t.moveTo(e+n*60,r+256),t.lineTo(e+n*60+30,r+256),t.lineTo(e+n*60+30+256,r),t.lineTo(e+n*60+256,r),t.fill();t.restore()}{let{x:e,y:r}=n(7);t.clearRect(e,r,512,256),t.fillStyle=`#9aa0a6`;for(let n=0;n<512;n+=8)t.fillRect(e+n,r,2,256);for(let n=0;n<256;n+=26)t.fillRect(e,r+n,512,2)}return Bh(e,{aniso:4})}function n_(){let[e,t]=Uh(1024,128);t.fillStyle=`#0d0d0f`,t.fillRect(0,0,1024,128),t.fillStyle=`#9b0f1f`,t.fillRect(0,100,1024,28),t.save(),t.font=`900 86px "Arial Narrow", "Roboto Condensed", Impact, Arial, sans-serif`;let n=t.measureText(`MAINSTAGE RED`).width;return t.translate(512,55),t.scale(Math.min(.8,900/n),1),t.textAlign=`center`,t.textBaseline=`middle`,t.fillStyle=`#efeae0`,t.fillText(`MAINSTAGE RED`,0,0),t.restore(),Bh(e,{aniso:4})}var r_=[0,0,.5,1],i_=[.5,0,1,.5],a_=[.5,.5,.75,.75],o_=[.75,.5,1,.75],s_=[.5,.75,.75,1],c_=[.75,.75,1,1],l_=typeof location<`u`&&new URLSearchParams(location.search).has(`daylight`),u_=.18,d_=1.4,f_=.5,p_=new u(0,1,0),m_=(e,t,n)=>new b().makeTranslation(e,t,n),h_=class{lowDetail;group=new y;halo;chase;U={uShaftCol:{value:new I},uLampColP:{value:new I},uHaloK:{value:1},uHaloSize:{value:3.8},uStoneK:{value:l_?1:u_},uGlassK:{value:l_?1:f_}};triangles=0;constructor(e,t){this.lowDetail=t,this.group.name=`lantern-pillars`,this.chase=new x(new Float32Array(Pe.length).fill(1),1),this.chase.setUsage(o);let{atlas:n,glow:r}=g_(Math.min(1024,e)),i=new Q;this.buildStone(i),this.buildMetal(t?i:null);let a=Eg(new le({map:n,emissive:16777215,emissiveMap:r,roughness:.84,metalness:0,vertexColors:!0}),{key:`pillar-stone3`,edit:e=>this.editPillar(e,`stone`)});this.instanced(i.build(),a,`pillar-stone`),this.buildFence(),this.buildCrystal(),this.buildHalo()}instanced(e,t,n){e.setAttribute(`aChase`,this.chase);let r=new T(e,t,Pe.length),i=new b;return Pe.forEach((e,t)=>{i.makeTranslation(e.x,0,e.z),r.setMatrixAt(t,i)}),r.instanceMatrix.needsUpdate=!0,r.computeBoundingSphere(),r.name=n,this.group.add(r),this.triangles+=Math.round(e.getAttribute(`position`).count/3)*Pe.length,r}buildStone(e){let t=tt,n=this.lowDetail,r=16777215;e.box(t.deck-.1,t.deckH,t.deck-.1,0,t.deckH/2,0,r,0,s_),e.box(t.base,t.baseTop-t.deckH-.14,t.base,0,(t.deckH+t.baseTop-.14)/2,0,r,0,i_),e.box(t.base+.12,.14,t.base+.12,0,t.baseTop-.07,0,r,0,c_),e.box(t.shaft,t.shaftTop-t.baseTop,t.shaft,0,(t.baseTop+t.shaftTop)/2,0,r,0,r_),e.box(t.shaft+.14,.1,t.shaft+.14,0,t.shaftTop+.05,0,r,0,c_),e.box(t.shaft+.44,.14,t.shaft+.44,0,t.shaftTop+.17,0,r,0,c_);let i=t.shaftTop+.24,a=t.capTop-.15;e.box(t.shaft+.3,a-i,t.shaft+.3,0,(i+a)/2,0,r,0,s_),e.box(t.capital,.15,t.capital,0,t.capTop-.075,0,[1.6,1.6,1.6],0,s_);let o=t.shaft/2+.62;if(e.box(1.46,.08,.66,0,t.arrayTop+.05,o,r,0,s_),n){let n=t.arrayTop-t.arrayBottom;e.box(1.34,n,.55,0,t.arrayBottom+n/2,o-.05,r,0,a_)}else{let n=(t.arrayTop-t.arrayBottom)/11,i=new u(0,t.arrayTop-n/2,o),a=0,s=new F,c=new u(1.34,n-.008,.55);for(let t=0;t<11;t++){e.add(Q.unit(`box`),new b().compose(i,s.setFromAxisAngle(new u(1,0,0),a),c),r,a_);let o=t<6?.004*(t+1):.024+.03*(t-5);i.y-=n/2*(Math.cos(a)+Math.cos(o)),i.z-=n/2*(Math.sin(a)+Math.sin(o)),a=o}}if(!n){for(let n=0;n<4;n++){let i=n/4*Math.PI*2,a=t.shaft/2+.22;e.box(.26,.2,.26,Math.sin(i)*a,t.baseTop+.1,Math.cos(i)*a,r,0,s_)}let n=t.deckH;for(let[t,i,a,o,s,c]of[[-2.5,-2.45,1.2,.82,.9,.1],[2.3,-2.55,1,.78,.8,-.05],[-2.75,1.4,.8,.72,1.2,0],[2.8,.4,.62,1.42,.8,0],[1,-2.85,.8,.6,.6,.2]])e.box(a,o,s,t,n+o/2,i,r,c,o_);for(let t of[-1,1])e.box(.62,.3,.72,t*2.8,n+.15,2.75,r,t*.5,s_)}}buildMetal(e){let t=tt,n=this.lowDetail,r=e??new Q,i=e?c_:void 0,a=e?s_:void 0,o=$(e?`#c8ccd2`:`#d4d8de`),s=$(`#2a2b2e`),c=$(e?`#6a2c1e`:`#7a3322`);r.box(1,.08,1,0,t.capTop+.04,0,c,0,i);let l=t.capTop+.08,d=t.lanternBottom-.1,f=new A(.28,.42,d-l,4);f.rotateY(Math.PI/4),r.add(f,m_(0,(l+d)/2,0),c,i),r.add(new A(.3,.2,.12,4),m_(0,t.lanternBottom-.05,0),c,i);let p=t.crystalR;r.add(new A(p*1.02,p*1.02,t.girdleTop-t.girdle,4),m_(0,(t.girdle+t.girdleTop)/2,0),o,i);let m=(e,t,n)=>new u(Math.cos(e*Math.PI/2)*n,t,Math.sin(e*Math.PI/2)*n),h=new u(0,t.crystalTop,0),g=new u(0,t.lanternBottom,0);for(let e=0;e<4;e++)if(r.beam(m(e,t.girdleTop,p*1.01),h,.055,o,!1,i),r.beam(m(e,t.girdle,p*1.01),g,.05,o,!1,i),!n){let n=m(e,t.girdleTop,p),i=m(e+1,t.girdleTop,p),a=n.clone().add(i).multiplyScalar(.5);r.beam(a,h.clone().lerp(a,.1),.035,o),r.beam(n.clone().lerp(h,.4),i.clone().lerp(h,.4),.035,o);let s=m(e,t.girdle,p),c=m(e+1,t.girdle,p);r.beam(s.clone().add(c).multiplyScalar(.5),g.clone().lerp(s.clone().add(c).multiplyScalar(.5),.15),.03,o)}let _=t.top-t.crystalTop;r.add(new ye(.05,_,6),m_(0,t.crystalTop+_/2,0),o,i),n||r.add(new v(.07,8,5),m_(0,t.crystalTop+.03,0),o);let y=t.shaft/2+.62;for(let e of[-.5,.5])r.box(.06,.06,y-t.shaft/2+.1,e,t.arrayTop+.12,(t.shaft/2+y)/2+.05,s,0,a);if(!n)for(let e of[-1,1]){let n=new u(e*.55,.78,.3).normalize(),i=new u(e*2.8,t.deckH+.36,2.75),a=new A(.1,.13,1.05,8),o=new b().compose(i.clone().addScaledVector(n,.45),new F().setFromUnitVectors(p_,n),new u(1,1,1));r.add(a,o,s);for(let e of[-.2,.2])r.box(.04,.3,.3,i.x+e,t.deckH+.42,i.z,s)}if(e)return;let x=Eg(new le({vertexColors:!0,metalness:.45,roughness:.34}),{key:`pillar-metal2`});this.instanced(r.build(),x,`pillar-metal`)}buildFence(){let e=tt,t=e.deck/2,n=new Q,r=$(`#2e2e30`),i=Math.round(e.deck/1.05);for(let a=0;a<4;a++){let o=new F().setFromAxisAngle(p_,a*Math.PI/2),s=new he(e.deck,e.fenceH),c=s.getAttribute(`uv`);for(let e=0;e<c.count;e++)c.setX(e,c.getX(e)*i);n.add(s,new b().compose(new u(0,e.fenceH/2,t).applyQuaternion(o),o,new u(1,1,1)),r);let l=new u(0,e.fenceH-.02,t).applyQuaternion(o);if(n.box(a%2?.05:e.deck,.05,a%2?e.deck:.05,l.x,l.y,l.z,r,0,Hh),!this.lowDetail&&a%2){let r=new u(0,.012,t+.36).applyQuaternion(o);n.box(.62,.024,e.deck+1.3,r.x,r.y,r.z,$(`#8a8c90`),0,Hh)}}for(let i of[-1,1])for(let a of[-1,1])n.box(.07,e.fenceH,.07,i*t,e.fenceH/2,a*t,r,0,Hh);this.instanced(n.build(),Jg(),`pillar-fence`)}buildCrystal(){let e=tt,t=e.crystalR,n=[],r=[],i=e=>[0,1,2,3].map(n=>new u(Math.cos(n*Math.PI/2)*t,e,Math.sin(n*Math.PI/2)*t)),a=i(e.girdle),o=i(e.girdleTop),s=new u(0,e.lanternBottom,0),c=new u(0,e.crystalTop,0),l=(e,t,r)=>n.push(e.x,e.y,e.z,t.x,t.y,t.z,r.x,r.y,r.z);for(let e=0;e<4;e++){let t=(e+1)%4;l(a[e],a[t],s),r.push(0,1,.5,1,.25,0),l(o[t],o[e],c),r.push(1,0,.5,0,.75,1)}let d=new M;d.setAttribute(`position`,new P(n,3)),d.setAttribute(`uv`,new P(r,2)),d.computeVertexNormals();let f=new Q;f.add(d,new b,16777215);let{albedo:p,glow:m}=__(),h=Eg(new le({map:p,emissive:16777215,emissiveMap:m,metalness:.3,roughness:.16,vertexColors:!0}),{key:`pillar-glass2`,lamps:!1,edit:e=>this.editPillar(e,`crystal`)});this.instanced(f.build(),h,`pillar-crystal`)}buildHalo(){let e=new he(2,2),t=(tt.lanternBottom+tt.girdle)/2,n=new C({uniforms:this.U,vertexShader:`
        attribute float aChase;
        uniform float uHaloSize;
        varying vec2 vUv;
        varying vec2 vApex;
        varying float vI;
        void main() {
          vec4 c = modelViewMatrix * instanceMatrix * vec4( 0.0, ${t.toFixed(3)}, 0.0, 1.0 );
          vec4 a = modelViewMatrix * instanceMatrix * vec4( 0.0, ${tt.lanternBottom.toFixed(3)} + 0.12, 0.0, 1.0 );
          // pulled towards the camera past the glass so the glass never depth-clips the hot point
          vec4 mv = c + vec4( position.xy * uHaloSize, ${(tt.crystalR+.2).toFixed(2)}, 0.0 );
          gl_Position = projectionMatrix * mv;
          vUv = position.xy;
          // apex offset in halo units (follows the camera roll / pitch)
          vApex = ( a.xy - c.xy ) / uHaloSize;
          // fade the halo when the camera is inside it
          vI = aChase * smoothstep( 2.0, 10.0, - c.z );
        }`,fragmentShader:`
        uniform vec3 uLampColP;
        uniform float uHaloK;
        varying vec2 vUv;
        varying vec2 vApex;
        varying float vI;
        void main() {
          float r2 = dot( vUv, vUv );
          vec2 d = vUv - vApex;
          float core = exp( - dot( d, d ) * 900.0 ) * 1.4 + exp( - dot( d, d ) * 120.0 ) * 0.25;
          float a = exp( - r2 * 6.0 ) * 0.16 * uHaloK + core;
          a *= 1.0 - smoothstep( 0.8, 1.0, r2 );
          // hue-keeping: the halo never pushes a channel past ~1.2 on its own
          vec3 c = uLampColP * ( a * vI );
          float pk = max( max( c.r, c.g ), c.b );
          c *= pk > 1.2 ? ( 1.2 + ( pk - 1.2 ) * 0.3 ) / pk : 1.0;
          gl_FragColor = vec4( c, 1.0 );
        }`,transparent:!0,depthWrite:!1,blending:2,fog:!1});this.halo=this.instanced(e,n,`pillar-halo`),this.halo.renderOrder=5,this.halo.frustumCulled=!1}editPillar(e,t){Object.assign(e.uniforms,this.U),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
attribute float aChase;
varying float vChase;
varying vec3 vLP;
varying vec3 vLN;`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
vChase = aChase;
vLP = position;
vLN = objectNormal;`);let n=tt,r=e=>e.toFixed(3),i=`
#include <emissivemap_fragment>
{
  // night calibration of the white paint (see STONE_NIGHT_K): ambient / stage / flash light uses the
  // scaled albedo; the close uplights below see the true white paint
  vec3 paint = diffuseColor.rgb;
  diffuseColor.rgb *= uStoneK;
  // vertical LED strips in the shaft edges (emissive mask) in the shaft colour
  totalEmissiveRadiance = pillarSoftLimit( totalEmissiveRadiance * uShaftCol * vChase * 7.0, 3.0 );
  // the four uplights on the base ledge wash the shaft faces only (not the array / deck / cases): a
  // cone per face, brightest low and centred, widening and fading with height (video 26 s amber,
  // 920 s green, 1272 s blue: the lower shaft glows in the shaft colour)
  float onShaft = step( max( abs( vLP.x ), abs( vLP.z ) ), ${r(n.shaft/2+.02)} ) * step( vLP.y, ${r(n.shaftTop)} );
  float vert = 1.0 - smoothstep( 0.2, 0.6, abs( vLN.y ) );
  float hU = vLP.y - ${r(n.baseTop)};
  float across = abs( vLN.x ) > 0.5 ? vLP.z : vLP.x;
  float cw = 0.25 + 0.3 * max( hU, 0.0 );
  float cone = mix( 1.0, exp( - across * across / ( cw * cw ) ), 0.55 );
  float graze = onShaft * vert * cone * smoothstep( -0.02, 0.3, hU ) * ( exp( - max( hU, 0.0 ) / 3.0 ) + 0.04 );
  totalEmissiveRadiance += paint * pillarSoftLimit( uShaftCol * vChase, 1.6 ) * graze * ${d_.toFixed(2)};
  // lantern light falling on the top plate
  float top = smoothstep( 0.3, 0.9, vLN.y ) * smoothstep( ${r(n.capTop-.2)}, ${r(n.capTop)}, hU );
  totalEmissiveRadiance += diffuseColor.rgb * pillarSoftLimit( uLampColP * vChase, 1.6 ) * top * 0.9;
}`,a=`
#include <emissivemap_fragment>
{
  diffuseColor.rgb *= uGlassK;
  vec3 n = normalize( vLN );
  // facets catch the inner light unevenly (the glass reads as cut, not flat)
  float facet = 0.78 + 0.22 * dot( n, normalize( vec3( 0.35, -0.3, 0.88 ) ) );
  // hot point at the bottom apex (the lamp sits low in the glass)
  float dA = length( vLP - vec3( 0.0, ${r(n.lanternBottom)}, 0.0 ) );
  float core = 1.0 + 3.2 * exp( - dA * dA * 6.0 );
  vec3 e = totalEmissiveRadiance * uLampColP * vChase * facet * core * 3.4;
  totalEmissiveRadiance = pillarSoftLimit( e, 3.6 );
}`;e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
uniform vec3 uShaftCol;
uniform vec3 uLampColP;
uniform float uStoneK;
uniform float uGlassK;
varying float vChase;
varying vec3 vLP;
varying vec3 vLN;
// soft limit of an emissive colour: linear up to k, then compressed — keeps the hue (max-channel scale)
vec3 pillarSoftLimit( vec3 c, float k ) {
  float pk = max( max( c.r, c.g ), c.b );
  return pk > k ? c * ( ( k + ( pk - k ) * 0.2 ) / pk ) : c;
}`).replace(`#include <emissivemap_fragment>`,t===`stone`?i:a)}update(e,t){let n=this.chase.array;for(let t=0;t<n.length;t++)n[t]=Sg(e,t);if(this.chase.needsUpdate=!0,l_){this.U.uShaftCol.value.setRGB(0,0,0),this.U.uLampColP.value.setRGB(0,0,0);return}this.U.uShaftCol.value.copy(e.pillarShaftColor).multiplyScalar(Math.max(0,e.pillarShaftIntensity)),this.U.uLampColP.value.copy(e.pillarLampColor).multiplyScalar(Math.max(0,e.pillarLampIntensity)),this.U.uHaloK.value=.4+.9*Math.min(1.5,Math.max(0,t))}setVisible(e){this.group.visible=e}};function g_(e){let t=e,[n,r]=Uh(t,t),[i,a]=Uh(t,t);a.fillStyle=`#000`,a.fillRect(0,0,t,t);let o=new ft(2026),s=e=>({x:e[0]*t,y:(1-e[3])*t,w:(e[2]-e[0])*t,h:(e[3]-e[1])*t}),c=(e,t,n,i,a,s,c)=>{r.save(),r.beginPath(),r.rect(e,t,n,i),r.clip(),r.fillStyle=`rgb(${c-52},${c-53},${c-55})`,r.fillRect(e,t,n,i);let l=Math.max(1,a*.035),u=0;for(let d=t+i;d>t-a;d-=a,u++){let t=d-a,i=e-(u%2?s*.5:0)-o.range(0,s*.15);for(;i<e+n;){let e=s*o.range(.78,1.22),n=c+o.range(-10,7),u=o.range(-2,3);r.fillStyle=`rgb(${Math.round(n+u)},${Math.round(n)},${Math.round(n-3-u)})`,r.fillRect(i+l,t+l,e-2*l,a-2*l),r.fillStyle=`rgba(255,255,255,0.22)`,r.fillRect(i+l,t+l,e-2*l,Math.max(1,a*.05)),r.fillStyle=`rgba(40,36,32,0.14)`,r.fillRect(i+l,d-l-Math.max(1,a*.08),e-2*l,Math.max(1,a*.08)),r.fillRect(i+e-l-Math.max(1,s*.02),t+l,Math.max(1,s*.02),a-2*l);for(let n=0;n<4;n++)r.fillStyle=`rgba(95,88,80,${o.range(.05,.14).toFixed(3)})`,r.fillRect(i+o.range(0,e),t+o.range(0,a),o.range(1,3.5),o.range(1,2.5));i+=e}}for(let a=0;a<n/7;a++)r.fillStyle=`rgba(70,64,58,${o.range(.02,.06).toFixed(3)})`,r.fillRect(e+o.range(0,n),t+o.range(0,i*.2),o.range(1,3),o.range(i*.1,i*.6));let d=r.createLinearGradient(0,t+i*.9,0,t+i);d.addColorStop(0,`rgba(60,55,50,0)`),d.addColorStop(1,`rgba(60,55,50,0.18)`),r.fillStyle=d,r.fillRect(e,t+i*.9,n,i*.1),r.restore()};{let e=s(r_),t=tt.shaft,n=tt.shaftTop-tt.baseTop,i=e.w/t,o=e.h/n,l=t=>e.y+e.h-(t-tt.baseTop)*o;c(e.x,e.y,e.w,e.h,.36*o,.62*i,204);let u=e.x+e.w/2;for(let t of[3.55,6.5])r.fillStyle=`rgb(222,220,214)`,r.fillRect(e.x,l(t+.07),e.w,.1*o),r.fillStyle=`rgba(40,36,32,0.28)`,r.fillRect(e.x,l(t-.03),e.w,Math.max(1,.04*o));let d=(e,t,n)=>{let a=e/2,s=e/2/i*o;r.beginPath(),r.moveTo(u-a,t),r.lineTo(u-a,n+s),r.ellipse(u,n+s,a,s,0,Math.PI,0),r.lineTo(u+a,t),r.closePath()},f=(e,t,n,a)=>{let s=n*i,c=l(e),f=l(t);r.fillStyle=`rgb(226,224,219)`,d(s+.18*i,c,f-.09*o),r.fill(),r.strokeStyle=`rgba(70,64,58,0.5)`,r.lineWidth=Math.max(1,.018*i),r.stroke(),r.fillStyle=`rgb(118,112,104)`,d(s,c,f),r.fill();let p=r.createLinearGradient(0,f,0,c);if(p.addColorStop(0,`#171412`),p.addColorStop(1,`#3a332d`),r.fillStyle=p,d(s-.12*i,c-.05*o,f+.07*o),r.fill(),a){let n=(t-e)*.62*o,i=c-.08*o;r.fillStyle=`#5c1a16`,r.beginPath(),r.moveTo(u-s*.2,i),r.quadraticCurveTo(u-s*.22,i-n*.6,u-s*.1,i-n*.82),r.lineTo(u+s*.1,i-n*.82),r.quadraticCurveTo(u+s*.22,i-n*.6,u+s*.2,i),r.closePath(),r.fill(),r.fillStyle=`#b8ad9e`,r.fillRect(u-s*.1,i-n*.84,s*.2,n*.07),r.beginPath(),r.ellipse(u,i-n*.92,s*.08,n*.09,0,0,Math.PI*2),r.fill(),r.fillStyle=`rgba(255,240,220,0.18)`,r.fillRect(u-s*.16,i-n*.7,s*.05,n*.6)}r.fillStyle=`rgb(230,228,223)`,r.fillRect(u-s/2-.12*i,c,s+.24*i,.08*o),r.fillStyle=`rgba(40,36,32,0.3)`,r.fillRect(u-s/2-.12*i,c+.08*o,s+.24*i,Math.max(1,.03*o))};f(1.74,3.2,.7,!0),f(4.25,5.6,.56,!1),f(7.15,7.95,.4,!1),r.fillStyle=`#34312d`,a.fillStyle=`#fff`;for(let n of[.02,t-.09])r.fillRect(e.x+n*i,e.y,.07*i,e.h),r.fillStyle=`#6f6b66`,r.fillRect(e.x+(n+.01)*i,e.y,.05*i,e.h),r.fillStyle=`#34312d`,a.fillRect(e.x+(n+.01)*i,e.y+.1*o,Math.max(2,.05*i),e.h-.15*o)}{let e=s(i_);c(e.x,e.y,e.w,e.h,e.h/3,e.w/2.2,198)}{let e=s(c_);r.fillStyle=`rgb(214,212,206)`,r.fillRect(e.x,e.y,e.w,e.h),r.fillStyle=`rgba(255,255,255,0.35)`,r.fillRect(e.x,e.y,e.w,e.h*.12),r.fillStyle=`rgba(40,36,32,0.3)`,r.fillRect(e.x,e.y+e.h*.84,e.w,e.h*.16);for(let t=0;t<40;t++)r.fillStyle=`rgba(95,88,80,${o.range(.04,.1).toFixed(3)})`,r.fillRect(e.x+o.range(0,e.w),e.y+o.range(0,e.h),o.range(1,3),o.range(1,3))}{let e=s(s_);r.fillStyle=`#151516`,r.fillRect(e.x,e.y,e.w,e.h);for(let t=0;t<160;t++)r.fillStyle=`rgba(${o.next()<.5?`255,255,255`:`0,0,0`},${o.range(.02,.05).toFixed(3)})`,r.fillRect(e.x+o.range(0,e.w),e.y+o.range(0,e.h),o.range(2,8),o.range(2,8))}{let e=s(a_);r.fillStyle=`#101011`,r.fillRect(e.x,e.y,e.w,e.h),r.fillStyle=`#1e1e20`,r.fillRect(e.x+e.w*.08,e.y+e.h*.1,e.w*.84,e.h*.8),r.fillStyle=`#0b0b0c`;let t=Math.max(2,e.w/48);for(let n=e.y+e.h*.12;n<e.y+e.h*.88;n+=t*2)for(let i=e.x+e.w*.1;i<e.x+e.w*.9;i+=t*1.2)r.fillRect(i,n,t*.6,t);r.fillStyle=`#3a3b3e`,r.fillRect(e.x,e.y,e.w*.05,e.h),r.fillRect(e.x+e.w*.95,e.y,e.w*.05,e.h),r.fillStyle=`#050505`,r.fillRect(e.x,e.y+e.h*.97,e.w,e.h*.03)}{let e=s(o_);r.fillStyle=`#18181a`,r.fillRect(e.x,e.y,e.w,e.h),r.strokeStyle=`#8e9296`,r.lineWidth=e.w*.05,r.strokeRect(e.x+e.w*.025,e.y+e.h*.025,e.w*.95,e.h*.95),r.fillStyle=`#b4b8bc`;for(let[t,n]of[[.02,.02],[.9,.02],[.02,.9],[.9,.9]])r.fillRect(e.x+t*e.w,e.y+n*e.h,e.w*.08,e.h*.08);for(let t of[.25,.68])r.fillRect(e.x+t*e.w,e.y+e.h*.44,e.w*.07,e.h*.1)}return{atlas:Bh(n,{aniso:8}),glow:Bh(i,{aniso:8})}}function __(){let[e,t]=Uh(256,128),[n,r]=Uh(256,128);t.fillStyle=`#9da3a9`,t.fillRect(0,0,256,128),r.fillStyle=`#000`,r.fillRect(0,0,256,128);let i={a:[0,0],b:[128,0],c:[64,128]},a={a:[128,128],b:[256,128],c:[192,0]},o=(e,t)=>{e.beginPath(),e.moveTo(t.a[0],t.a[1]),e.lineTo(t.b[0],t.b[1]),e.lineTo(t.c[0],t.c[1]),e.closePath()};for(let[e,n,r]of[[i,`#c3c9cf`,`#a9b0b7`],[a,`#d9dde2`,`#b3b9c0`]]){let i=(e.a[0]+e.b[0])/2;t.fillStyle=n,t.beginPath(),t.moveTo(e.a[0],e.a[1]),t.lineTo(i,e.a[1]),t.lineTo(e.c[0],e.c[1]),t.closePath(),t.fill(),t.fillStyle=r,t.beginPath(),t.moveTo(i,e.a[1]),t.lineTo(e.b[0],e.b[1]),t.lineTo(e.c[0],e.c[1]),t.closePath(),t.fill()}t.save(),o(t,a),t.clip();let s=t.createLinearGradient(150,128,230,20);s.addColorStop(.35,`rgba(255,255,255,0)`),s.addColorStop(.5,`rgba(255,255,255,0.45)`),s.addColorStop(.62,`rgba(255,255,255,0)`),t.fillStyle=s,t.fillRect(128,0,128,128),t.restore();let c=r.createLinearGradient(0,0,0,128);c.addColorStop(0,`rgb(150,150,150)`),c.addColorStop(.55,`rgb(215,215,215)`),c.addColorStop(1,`rgb(255,255,255)`),r.fillStyle=c,o(r,i),r.fill(),r.fillStyle=`rgb(20,20,20)`,o(r,a),r.fill();for(let[e,n]of[[t,`#3c4046`],[r,`#000`]]){e.strokeStyle=n,e.fillStyle=n;for(let t of[i,a]){let n=(t.a[0]+t.b[0])/2,r=(e,t,n)=>[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n];e.lineWidth=8,o(e,t),e.stroke(),e.lineWidth=4,e.beginPath(),e.moveTo(n,t.a[1]),e.lineTo(t.c[0],t.c[1]),e.stroke();let i=r([n,t.a[1]],t.c,.45);e.lineWidth=3,e.beginPath(),e.moveTo(t.a[0],t.a[1]),e.lineTo(i[0],i[1]),e.lineTo(t.b[0],t.b[1]),e.stroke()}}return{albedo:Bh(e,{aniso:4}),glow:Bh(n,{aniso:4})}}var v_=$(`#8d9196`),y_=(e,t,n,r)=>Math.atan2(n-e,r-t),b_=[`MAINSTAGE RED`,`EXIT`,`FREE WATER`,`FIRST AID`,`BAR`,`TOILETS`,`EXIT`,`STAY HYDRATED`];function x_(t,n){let r=[],i=[],a=0,o=Eg(new le({vertexColors:!0,metalness:.5,roughness:.55}),{key:`props-metal`}),s=e=>{t.add(e);let n=e.geometry.getAttribute(`position`).count/3;a+=n*(e.isInstancedMesh?e.count:1)},c=(e,t,n,r)=>{let i=new T(e,t,Math.max(1,n.length));return i.count=n.length,n.forEach((e,t)=>i.setMatrixAt(t,e)),i.instanceMatrix.needsUpdate=!0,i.computeBoundingSphere(),i.name=r,s(i),i},l=(e,t,n,r=1)=>new b().compose(new u(e,L(e,t),t),new F().setFromAxisAngle(oe.DEFAULT_UP,n),new u(r,r,r)),d=new Q;{let e=[[110,152,170,172,0],[-110,140,-150,150,0],[62,133,0,70,1],[-62,129,0,70,6],[-102,146,-60,128,5],[-72,160,-40,135,2],[106,130,60,118,3],[-94,90,-60,60,4],[94,88,60,60,4],[-24,140,-10,175,7],[30,139,10,100,7],[48,124,10,100,2],[-48,124,-10,100,2],[-35,150,-10,120,1],[35,150,10,120,6]],t=d,n=[],i=new Float32Array(e.length*2);e.forEach(([e,a,o,s,c],d)=>{let f=y_(e,a,o,s),p=l(e,a,f);t.add(Q.unit(`box`),p.clone().multiply(new b().compose(new u(-.95,1.4,-.05),new F,new u(.08,2.8,.08))),v_),t.add(Q.unit(`box`),p.clone().multiply(new b().compose(new u(.95,1.4,-.05),new F,new u(.08,2.8,.08))),v_),t.add(Q.unit(`box`),p.clone().multiply(new b().compose(new u(0,2.3,-.1),new F,new u(2.1,1.1,.12))),$(`#111113`)),n.push(p.clone().multiply(new b().makeTranslation(0,2.3,-.035))),i[d*2]=c%2,i[d*2+1]=3-Math.floor(c/2),r.push({kind:`circle`,x:e,z:a,r:1.1,tag:`sign`})});let a=w_(),o=new he(2,1);o.setAttribute(`aCell`,new x(i,2)),c(o,Eg(new le({map:a,emissiveMap:a,emissive:new I(.55,.55,.55),roughness:.4}),{key:`signs`,edit:e=>{e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
attribute vec2 aCell;`).replace(`#include <uv_vertex>`,`#include <uv_vertex>
#ifdef USE_MAP
vMapUv = ( uv + aCell ) * vec2( 0.5, 0.25 );
#endif
#ifdef USE_EMISSIVEMAP
vEmissiveMapUv = ( uv + aCell ) * vec2( 0.5, 0.25 );
#endif`)}}),n,`sign-faces`)}{let e=[...He.map(([e,t])=>[e,t,y_(e,t,0,120)]),[50,121,y_(50,121,0,80)],[-50,121,y_(-50,121,0,80)],[100,94,y_(100,94,40,60)],[-100,94,y_(-100,94,-40,60)]],t=d,n=$(`#1a5fb4`);for(let[i,a,o]of e){let e=l(i,a,o),s=(n,r,i,a,o,s,c)=>t.add(Q.unit(`box`),e.clone().multiply(new b().compose(new u(a,o,s),new F,new u(n,r,i))),c);s(3.2,.22,.55,0,.82,0,v_);for(let e of[-1.5,1.5])for(let t of[-.22,.22])s(.05,.8,.05,e,.4,t,v_);s(3,.07,.07,0,1.3,-.18,v_);for(let e=0;e<6;e++)s(.04,.16,.12,-1.25+e*.5,1.2,-.1,$(`#c9ccd0`));s(.08,3.4,.08,1.8,1.7,0,v_),s(.9,.9,.05,1.8,3.1,.06,n),r.push({kind:`circle`,x:i,z:a,r:1.9,tag:`water`})}for(let[t,n,r]of e){let e=new u(1.8,3.1,.1).applyAxisAngle(oe.DEFAULT_UP,r);i.push({x:t+e.x,y:L(t,n)+e.y,z:n+e.z,color:`#3a8cff`,size:.9,kind:0})}}{let[e,t]=ze,n=y_(e,t,60,110),a=l(e,t,n),o=d,s=$(`#d8dadc`),c=(e,t,n,r,i,s,c=0)=>o.add(e,a.clone().multiply(new b().compose(new u(t,n,r),new F().setFromAxisAngle(oe.DEFAULT_UP,c),i)),s);c(Q.unit(`box`),0,1.25,0,new u(6,2.5,6),s),c(new ye(4.3,2.4,4),0,3.7,0,new u(1,1,1),s,Math.PI/4),c(Q.unit(`box`),0,2.2,3.03,new u(1.5,1,.05),$(`#0b8a3a`)),c(Q.unit(`box`),0,2.2,3.07,new u(.9,.24,.02),s),c(Q.unit(`box`),0,2.2,3.07,new u(.24,.8,.02),s),c(Q.unit(`box`),5.2,1.3,-1,new u(2.5,2.6,6),$(`#9aa3a8`)),c(Q.unit(`box`),5.2,2.75,-1,new u(1,.35,.8),$(`#5a5f63`)),r.push({kind:`box`,minX:e-4.5,maxX:e+7.5,minZ:t-4.5,maxZ:t+4.5,tag:`firstaid`});let f=new u(0,2.2,3.1).applyAxisAngle(oe.DEFAULT_UP,n);i.push({x:e+f.x,y:L(e,t)+f.y,z:t+f.z,color:`#2fe07a`,size:1.2,kind:0}),i.push({x:e+f.x*1.3,y:L(e,t)+2.9,z:t+f.z*1.3,color:`#ffe8c0`,size:1,kind:0})}{let e=new Q;e.box(1.15,2.2,1.2,0,1.1,0,16777215),e.box(1.2,.08,1.25,0,2.24,0,$(`#d0d4d8`)),e.box(.8,1.9,.02,0,1,.61,$(`#dde1e5`));let t=[],n=[];for(let e of xt){let a=Math.floor((e.x1-e.x0)/1.25);for(let r=0;r<a;r++)for(let[i,a]of[[e.z0+.7,Math.PI],[e.z1-.7,0]]){let o=e.x0+.6+r*1.25;t.push(l(o,i,a)),n.push(new I(r%7==3?`#2d8a4a`:`#1d4f9c`))}r.push({kind:`box`,minX:e.x0,maxX:e.x1,minZ:e.z0,maxZ:e.z1,tag:`toilets`}),i.push({x:(e.x0+e.x1)/2,y:3.4,z:e.z0-.5,color:`#fff2d8`,size:1.4,kind:0})}let a=Eg(new le({vertexColors:!0,roughness:.6}),{key:`toilets`,lamps:!1}),o=c(e.build(),a,t,`toilets`);n.forEach((e,t)=>o.setColorAt(t,e)),o.instanceColor&&(o.instanceColor.needsUpdate=!0)}{let e=d,t=[[146,172,y_(146,172,140,150),`#5b1016`],[156,175,y_(156,175,150,155),`#1b1b1d`],[166,178,y_(166,178,160,158),`#d6cfbd`],[-146,118,y_(-146,118,-120,120),`#1b1b1d`],[-150,106,y_(-150,106,-120,110),`#6a1a12`],[-152,94,y_(-152,94,-125,98),`#2c3e2a`]];for(let[n,a,o,s]of t){let t=l(n,a,o),c=(n,r,i,a,o,s,c)=>e.add(Q.unit(`box`),t.clone().multiply(new b().compose(new u(a,o,s),new F,new u(n,r,i))),c);c(6.4,2.6,2.4,0,1.75,0,$(s)),c(1.8,1.6,2.3,3.9,1.25,0,$(`#202022`)),c(3.8,1,.05,-.4,2,1.22,$(`#0a0a0a`)),c(4.2,.06,1.3,-.4,2.75,1.8,$(`#1a1a1a`));for(let e of[-2.2,2.2,3.9])for(let t of[-1.1,1.1])c(.8,.8,.25,e,.4,t,$(`#0a0a0a`));r.push({kind:`circle`,x:n,z:a,r:3.6,tag:`stall`});let d=new u(-.4,2.45,1.4).applyAxisAngle(oe.DEFAULT_UP,o);i.push({x:n+d.x,y:L(n,a)+d.y,z:a+d.z,color:`#ffb46a`,size:1.6,kind:2})}{let t=l(-72,152,y_(-72,152,-40,130)),n=(n,r,i,a,o,s,c)=>e.add(Q.unit(`box`),t.clone().multiply(new b().compose(new u(a,o,s),new F,new u(n,r,i))),c);n(6,2.6,2.4,0,1.3,0,$(`#141416`)),n(6.4,.08,2.4,0,2.7,2.2,$(`#101012`)),n(5.6,.6,.05,0,3,1.24,$(`#7a0f1a`)),r.push({kind:`box`,minX:-75.4,maxX:-68.6,minZ:148.6,maxZ:155.4,tag:`stall`}),i.push({x:-72,y:L(-72,152)+2.5,z:154.4,color:`#ffd9a0`,size:1.5,kind:0})}}{let e=new Q;e.cylinder(.3,.9,0,.45,0,16777215,12),e.cylinder(.33,.06,0,.93,0,$(`#303033`),12),e.cylinder(.12,.05,0,.98,0,$(`#202022`),8);let t=new ft(19),n=[[60,130],[-60,126],[100,140],[-100,136],[48,118],[-48,118],[96,96],[-96,96],[-16,139],[140,165],[-140,110],[-80,168],[110,124],[-106,150],[24,147],[-24,147],[96,30],[-96,30],[102,60],[-102,60]],i=e.build();for(let[e,a]of n){let n=2+t.int(0,2);for(let r=0;r<n;r++){let n=l(e+r*.75+t.range(-.1,.1),a+t.range(-.2,.2),t.range(0,6.28));d.add(i,n,$(t.pick([`#1b1b1e`,`#2a2d31`,`#6e1116`,`#1b1b1e`])))}r.push({kind:`circle`,x:e+.75,z:a,r:1.2,tag:`bin`})}}let f=null;{let e=[];for(let t=4;t<=100;t+=12)e.push([-106.5,t,8]),e.push([106.5,t,8]);for(let t of[-66,-54,54,66])e.push([t,138.5,6.5]);e.push([108,150,7],[124,139,7],[-108,126,7],[-124,138,7]);let t=n?e.filter((e,t)=>t%2==0).length:e.length,i=n?e.filter((e,t)=>t%2==0):e,a=new Q;a.cylinder(.045,1,0,.5,0,v_,6);let o=a.build(),s=[],l=[],p=new Float32Array(t),m=new ft(7);i.forEach(([e,t,n],i)=>{let a=L(e,t);s.push(new b().compose(new u(e,a,t),new F,new u(1,n,1)));let o=Math.PI/2+m.range(-.25,.25)-.26;l.push(new b().compose(new u(e,a+n-.05,t),new F().setFromAxisAngle(oe.DEFAULT_UP,o),new u(1,1,1))),p[i]=m.int(0,3),r.push({kind:`circle`,x:e,z:t,r:.3,tag:`flag`})});for(let e of s)d.add(o,e);let h=new he(2.4,1.5,12,5);h.translate(1.2,-.75,0),h.setAttribute(`aDesign`,new x(p,1));let g={uTime:{value:0}};f=g;let _=T_(),v=c(h,Eg(new le({map:_,side:2,roughness:.85}),{key:`flags`,edit:e=>{Object.assign(e.uniforms,g),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
uniform float uTime;
attribute float aDesign;`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
            {
              float u = clamp( position.x / 2.4, 0.0, 1.0 );
              float seed = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.11;
              float w = sin( u * 7.0 - uTime * 5.2 + seed ) * 0.5 + sin( u * 13.0 - uTime * 8.3 + seed * 1.7 ) * 0.2;
              transformed.z += w * u * 0.32;
              transformed.y += ( sin( uTime * 2.1 + seed ) * 0.08 - 0.12 ) * u * u;
              transformed.x -= abs( w ) * u * 0.06;
            }`).replace(`#include <uv_vertex>`,`#include <uv_vertex>
#ifdef USE_MAP
vMapUv = vec2( ( uv.x + aDesign ) * 0.25, uv.y );
#endif`)}}),l,`flags`);v.frustumCulled=!1}{let e=d;for(let[t,n,a]of[[104,110,15],[-104,106,15],[70,140,9],[-70,136,9],[106,8,9],[-106,8,9]]){let o=L(t,n);e.beam(new u(t,o,n),new u(t,o+a,n),.16,v_,!0),e.box(2.2,.6,1.4,t,o+.5,n,$(`#c9b23a`)),e.box(1.6,.5,.25,t,o+a+.1,n,$(`#2a2a2c`)),r.push({kind:`circle`,x:t,z:n,r:1.3,tag:`mast`}),a>12&&i.push({x:t,y:o+a+.5,z:n,color:`#ff2010`,size:1.4,kind:3})}for(let t=1;t<Ae.length;t++){let[n,r]=Ae[t-1],[a,o]=Ae[t],s=Math.hypot(a-n,o-r),c=Math.floor(s/34);for(let t=0;t<=c;t++){let s=c?t/c:0,l=n+(a-n)*s,d=r+(o-r)*s+7.5;if(Math.abs(l)<50&&d<160)continue;let f=L(l,d);e.beam(new u(l,f,d),new u(l,f+8,d),.1,v_,!0),e.box(.8,.15,.3,l-.3,f+8,d,$(`#2a2a2c`)),i.push({x:l-.5,y:f+7.9,z:d,color:`#ffa640`,size:1.1,kind:0})}}}let p=new e(d.build(),o);return p.name=`props-merged`,s(p),{colliders:r,triangles:a,lamps:i,update:e=>{f&&(f.uTime.value=e)}}}function S_(e,t,n,r,i,a,o,s=900){e.save(),e.font=`${s} ${i}px "Arial Narrow", "Roboto Condensed", Impact, "Helvetica Neue", Arial, sans-serif`;let c=e.measureText(t).width,l=Math.min(.8,o/Math.max(1,c));e.translate(n,r),e.scale(l,1),e.fillStyle=a,e.textAlign=`center`,e.textBaseline=`middle`,e.fillText(t,0,0),e.restore()}function C_(e,t,n,r,i){e.save(),e.translate(t,n),e.rotate(i===`up`?0:i===`right`?Math.PI/2:-Math.PI/2),e.fillStyle=`#efeae0`,e.beginPath(),e.moveTo(0,-r),e.lineTo(r*.8,0),e.lineTo(r*.3,0),e.lineTo(r*.3,r),e.lineTo(-r*.3,r),e.lineTo(-r*.3,0),e.lineTo(-r*.8,0),e.closePath(),e.fill(),e.restore()}function w_(){let[e,t]=Uh(1024,1024);return b_.forEach((e,n)=>{let r=n%2*512,i=Math.floor(n/2)*256,a=e===`FIRST AID`?`#0b8a3a`:e===`FREE WATER`||e===`STAY HYDRATED`?`#1a5fb4`:`#a3101f`;t.fillStyle=`#0c0c0e`,t.fillRect(r,i,512,256),t.fillStyle=a,t.fillRect(r,i,512,34),t.fillRect(r,i+256-10,512,10),t.strokeStyle=`#3a3a3e`,t.lineWidth=6,t.strokeRect(r+3,i+3,506,250);let o=r+90,s=i+140;if(t.fillStyle=a,t.fillRect(o-62,s-62,124,124),e===`MAINSTAGE RED`)C_(t,o,s,44,`up`);else if(e===`EXIT`)C_(t,o,s,44,n===1?`right`:`left`);else if(e===`FIRST AID`)t.fillStyle=`#fff`,t.fillRect(o-42,s-13,84,26),t.fillRect(o-13,s-42,26,84);else if(e===`FREE WATER`||e===`STAY HYDRATED`)t.fillStyle=`#fff`,t.beginPath(),t.moveTo(o,s-46),t.bezierCurveTo(o+40,s,o+36,s+42,o,s+42),t.bezierCurveTo(o-36,s+42,o-40,s,o,s-46),t.fill();else if(e===`BAR`)t.fillStyle=`#fff`,t.beginPath(),t.arc(o,s,44,0,Math.PI*2),t.fill(),S_(t,`B`,o,s+3,70,a,60);else if(e===`TOILETS`){t.fillStyle=`#fff`;for(let e of[-22,22])t.beginPath(),t.arc(o+e,s-30,11,0,Math.PI*2),t.fill(),t.fillRect(o+e-12,s-16,24,56)}let c=e===`STAY HYDRATED`?`FREE WATER AT ALL TOILETS`:e===`MAINSTAGE RED`?`HOLY GROUNDS`:e===`FREE WATER`?`REFILL HERE`:e===`FIRST AID`?`EHBO • MEDICAL`:e===`EXIT`?`UITGANG`:e===`BAR`?`DRINKS • WATER`:`WC`;S_(t,e,r+320,i+118,84,`#efeae0`,330),S_(t,c,r+320,i+190,40,`#b9b3a8`,320,700)}),Bh(e,{aniso:4})}function T_(){let[e,t]=Uh(1024,256);for(let e=0;e<4;e++){let n=e*256;if(t.fillStyle=e%2?`#0e0e10`:`#9c0f1d`,t.fillRect(n,0,256,256),t.save(),t.beginPath(),t.rect(n,0,256,256),t.clip(),e===0){t.fillStyle=`#0e0e10`,t.beginPath(),t.moveTo(n,256);for(let e=0;e<=8;e++)t.lineTo(n+e*256/8,256*(e%2?.35:.6));t.lineTo(n+256,256),t.fill()}else if(e===1)t.fillStyle=`#9c0f1d`,t.fillRect(n,0,256,84.48),t.fillRect(n,171.52,256,84.48);else if(e===2){t.fillStyle=`#0e0e10`;for(let e=0;e<4;e++)t.beginPath(),t.moveTo(n+e*70-40,0),t.lineTo(n+e*70+20,128),t.lineTo(n+e*70-40,256),t.lineTo(n+e*70-10,256),t.lineTo(n+e*70+50,128),t.lineTo(n+e*70-10,0),t.fill()}else t.fillStyle=`#c2410f`,t.beginPath(),t.moveTo(n+128,38.4),t.bezierCurveTo(n+217.6,128,n+179.2,217.6,n+128,225.28),t.bezierCurveTo(n+76.8,217.6,n+38.4,128,n+128,38.4),t.fill(),t.fillStyle=`#ffb347`,t.beginPath(),t.arc(n+128,158.72,30.72,0,Math.PI*2),t.fill();t.restore(),t.fillStyle=`rgba(0,0,0,0.35)`,t.fillRect(n,0,8,256)}return Bh(e,{aniso:2})}var E_=class{name=`grounds`;app;enabled=!0;root=new y;pillars;landmarks;props;structTris=0;proxy;size=new s;envSys;crowdSys;camRig;init(e){this.app=e;let t=e.quality,n=t.level===`mobile`;this.root.name=`grounds`,e.scene.add(this.root),this.pillars=new h_(t.textureSize,n),this.root.add(this.pillars.group);let r=$g(this.root,n);this.structTris=r.triangles,r.colliders.forEach(t=>e.addCollider(t)),this.props=x_(this.root,n),this.props.colliders.forEach(t=>e.addCollider(t)),this.landmarks=new Gg(this.props.lamps,n),this.root.add(this.landmarks.group),Yt().forEach(t=>e.addCollider(t)),this.registerAnchors(),this.registerSpots();let i=e.params.get(`stageproxy`);i!==null&&this.buildStageProxy(i)}registerAnchors(){let e=this.app.anchors,t=(e,t,n)=>new u(e,t,n);e.set(`pillars_top`,Pe.map(e=>t(e.x,Fe,e.z))),e.set(`pillars_base`,Pe.map(e=>t(e.x,tt.deckH,e.z))),e.set(`delay_towers`,Pe.map(e=>t(e.x,tt.capTop+.4,e.z)));let n=L(_t.x,_t.z)+_t.deckY;e.set(`foh`,[t(_t.x,n,_t.z)]);let r=_t.z-_t.d/2+.4;e.set(`laser_field`,[...Pe.map(e=>t(e.x,tt.capTop+.5,e.z)),t(-5.6,n+2.2,r),t(5.6,n+2.2,r)]),e.set(`fireworks_back`,Array.from({length:9},(e,n)=>{let r=-80+n*20;return t(r,L(r,-40),-40)}));let i=[];for(let e of[-1,1])for(let n=0;n<7;n++){let r=e*104.5,a=6+n*19;i.push(t(r,L(r,a),a))}e.set(`fireworks_sides`,i)}registerSpots(){let e=new u(0,13,-6),t=(t,n,r,i,a=e,o=.55)=>{let s=new u(r,0,i),c=new u(r,L(r,i),i);return{id:t,label:n,position:s,yaw:st(c,a),pitch:ht(c,a)*o}},n=Re,r={id:`photo`,label:`Photo terrace (official photo)`,position:new u(-.9,n.deckY,n.z0+1.6),yaw:0,pitch:.06},i=new u(Lt.x0+2.2,Lt.y,Ct-1.6),a={id:`ferris`,label:`Ferris wheel`,position:i,yaw:st(i,new u(Bt+1.2,0,Ct)),pitch:.2},o=[t(`entrance`,`Field entrance (E1)`,121.4,151.2),t(`back`,`Back of the field`,0,134),t(`foh`,`FOH / camera platform`,3.5,_t.z+_t.d/2+2.2),r,t(`middle`,`Middle of the field`,-4,74),t(`crowd`,`In the crowd`,6,32),t(`front`,`Front row`,0,5.5,new u(0,16,-6),.6),t(`side_left`,`Left bank`,-70,40),t(`side_right`,`Right bank`,70,40),t(`dragon_view`,`Dragon view`,0,45,new u(0,14,-4),.75),t(`aisle`,`Lantern aisle`,0,118),t(`crest_left`,`Left crest (bars)`,-93,90),t(`decking`,`Decking by the lake`,-24,162),a];for(let e of o)this.app.addSpot(e)}buildStageProxy(t){let n=Eg(new le({vertexColors:!0,roughness:.8,emissive:new I(.02,.004,.004)}),{key:`proxy`}),r=new Q;if(t===`box`)r.box(184,28,26,0,14,-13,$(`#401010`));else{let e=$(`#6b6a70`),t=$(`#6a1a18`);r.box(74,1.9,14,0,.95,-7,$(`#3a0a12`)),r.box(74,9.5,12,0,4.75,-18,e);for(let t of[-25.5,-17.3,17.3,25.5])r.box(4.5,16,4.5,t,8,-13,e);r.box(9,13,8,-2,14,-9,t);for(let t of[-1,1]){for(let[e,n]of[[14.5,26.5],[29,28],[40.5,26.5]])r.beam(new u(t*26,4,-17.5),new u(t*e,n,-21),.9,$(`#b0602a`));r.box(30,12,1,t*26,17,-20,$(`#8a2a1a`)),r.box(55,10.5,20,t*64.5,4.25,-14,e),r.box(6,16,6,t*92,7,-4,e);let n=(Qe.z0+Qe.z1)/2,i=(Qe.x0+Qe.x1)/2;r.box(1.2,1.4,Qe.z1-Qe.z0,t*i,L(i,n)+.7,n,e),r.box(4,8,4,t*Qe.x1,L(Qe.x1,Qe.z1)+4,Qe.z1,e)}}let i=new e(r.build(),n);i.name=`stage-proxy`,this.proxy=i,this.app.scene.add(i)}update(e){if(!this.enabled)return;let t=this.app.env;this.pillars.update(t,t.haze),this.props.update(e.showTime),this.app.renderer.getDrawingBufferSize(this.size),this.envSys===void 0&&(this.envSys=this.app.get(`environment`)??null),this.landmarks.update(e.showTime,this.app.renderer.getPixelRatio(),this.size.y,this.envSys?.skyLevel??1),this.crowdSys===void 0&&(this.crowdSys=this.app.get(`crowd`)??null),this.camRig===void 0&&(this.camRig=this.app.get(`camera`)??null),this.landmarks.setAreaBeams(this.crowdSys?.mode===`tribe`&&this.camRig?.mode!==`showcam`)}setQuality(e){}setEnabled(e){this.enabled=e,this.root.visible=e}stats(){return{pillars:Pe.length,lanternY:nt,pillarTris:this.pillars?.triangles??0,structureTris:Math.round(this.structTris+(this.props?.triangles??0)),landmarkTris:Math.round(this.landmarks?.triangles??0),distantLights:this.landmarks?.lightCount??0,colliders:this.app?.colliders.length??0,proxy:this.proxy?`on`:`off`}}},D_={x0:-320,z0:-260,w:640,h:640};async function O_(e,t){let n=e,r=n/D_.w,i=()=>{let e=document.createElement(`canvas`);e.width=e.height=n;let t=e.getContext(`2d`,{willReadFrequently:!0});return t.fillStyle=`#000`,t.fillRect(0,0,n,n),t.setTransform(r,0,0,r,-D_.x0*r,-D_.z0*r),[e,t]},a=(e,t,n,r,i,a)=>{e.fillStyle=A_(a),e.fillRect(t,n,r-t,i-n)},o=(e,t,n,r)=>{e.strokeStyle=A_(r),e.lineWidth=n,e.lineCap=`round`,e.lineJoin=`round`,e.beginPath(),t.forEach(([t,n],r)=>r?e.lineTo(t,n):e.moveTo(t,n)),e.stroke()},s=e=>{a(e,-we.x,-4,we.x,we.z1,1),a(e,-45,-4,-41.8,143,.92),a(e,41.8,-4,45,143,.92),a(e,-104,19.5,-44,22.5,.85),a(e,44,19.5,104,22.5,.85),a(e,-107,-20,-99,106,.7),a(e,98,-20,106,106,.7)},c=e=>{a(e,-we.x,we.z1,we.x,we.hard1,.55),o(e,Ae,12,1),o(e,[[89,-69],[-35,-68],[-54,-94]],5,.8),o(e,[[-32,-2],[-38,-68]],5,.8),o(e,[[-49,-101],[92,-105]],5,.8),o(e,[[-137,94],[-150,60],[-152,-30]],6,.85)},l=Math.max(1,Math.round(1.5*r)),u=e=>{let t=new ft(4242);a(e,-52,0,-44,110,.55),a(e,44,0,52,110,.55),a(e,-99,26,-88,84,.6),a(e,88,24,99,80,.6),o(e,[[-44,118],[-70,110],[-96,100]],5,.7),o(e,[[44,118],[70,110],[96,98]],5,.7),o(e,[[-100,138],[-123,146]],4,.8),o(e,[[100,138],[117,123]],3.5,.75);for(let[t,n]of He)e.fillStyle=A_(.85),e.beginPath(),e.arc(t,n,6,0,Math.PI*2),e.fill();for(let t of xt)a(e,t.x0-4,t.z0-5,t.x1+4,t.z1+5,.9);e.beginPath(),e.arc(ze[0],ze[1],7,0,Math.PI*2),e.fill(),a(e,-18,-68,19,-34,.9),a(e,Ge.x0,Ge.z0,Ge.x1,Ge.z1,1);for(let n=0;n<90;n++){let n=(t.chance(.5)?-1:1)*t.range(50,106),r=t.range(-10,110);e.fillStyle=A_(t.range(.15,.5)),e.beginPath(),e.ellipse(n,r,t.range(2,7),t.range(2,9),t.range(0,Math.PI),0,Math.PI*2),e.fill()}},d=e=>{a(e,bt.x0,bt.z0,bt.x1,bt.z1,1)},f=new Uint8Array(n*n*4),p=[s,c,u,d];for(let e=0;e<4;e++){let[r,a]=i();p[e](a);let o=a.getImageData(0,0,r.width,r.height).data;for(let t=0,r=n*n;t<r;t++)f[t*4+e]=o[t*4];r.width=r.height=0,t&&await t.maybeYield()}return k_(f,n,2,Math.max(1,Math.round(l*.9)),3),t&&await t.maybeYield(),zh(f,n,n,{repeat:!1,mips:!0,aniso:4})}function k_(e,t,n,r,i){let a=new Float32Array(t),o=1/(2*r+1);for(let s=0;s<i;s++)for(let i=0;i<2;i++)for(let s=0;s<t;s++){for(let r=0;r<t;r++)a[r]=e[((i===0?s*t+r:r*t+s)<<2)+n];let c=0;for(let e=-r;e<=r;e++)c+=a[Math.min(t-1,Math.max(0,e))];for(let l=0;l<t;l++)e[((i===0?s*t+l:l*t+s)<<2)+n]=Math.round(c*o),c+=a[Math.min(t-1,l+r+1)]-a[Math.max(0,l-r)]}}function A_(e){let t=Math.round(Math.min(1,Math.max(0,e))*255);return`rgb(${t},${t},${t})`}var j_=170;function M_(e,t,n,r,i){let a=new f(1,r),o=a.getAttribute(`position`),s=new Float32Array(o.count*3),c=new u;for(let r=0;r<o.count;r++){c.fromBufferAttribute(o,r);let a=c.clone().normalize(),l=1+((qe(Math.round(a.x*40)*73856093+Math.round(a.y*40)*19349663+Math.round(a.z*40)*83492791+e)&1023)/1023-.5)*i;c.set(a.x*t*l,a.y*n*l,a.z*t*l),o.setXYZ(r,c.x,c.y,c.z);let u=.55+.45*(a.y*.5+.5);s[r*3]=u,s[r*3+1]=u,s[r*3+2]=u}a.setAttribute(`color`,new j(s,3)),a.deleteAttribute(`uv`),a.deleteAttribute(`normal`);let l=ce(a,1e-4);return l.computeVertexNormals(),l}function N_(e,t){let n=new A(t*.7,t,e,5,1,!0);n.translate(0,e/2,0),n.deleteAttribute(`uv`);let r=n.getAttribute(`position`).count,i=new Float32Array(r*3).fill(.35);return n.setAttribute(`color`,new j(i,3)),n}function P_(e,t){let n=[],r=(e,r,i,a,o,s,c)=>{let l=M_(e,r,i,t,c);l.translate(a,o,s),n.push(l)};if(e===`poplar`)n.push(N_(.2,.02)),r(10,.2,.17,.02,.2,0,.3),r(11,.17,.22,0,.4,0,.2),r(12,.155,.24,.01,.62,.01,.2),r(13,.12,.19,-.01,.83,0,.18);else if(e===`round`){n.push(N_(.3,.03)),r(20,.32,.17,.03,.24,-.02,.3);for(let e=0;e<4;e++){let t=e/4*Math.PI*2+.4;r(21+e,.28,.22,Math.cos(t)*.17,.5+e%2*.08,Math.sin(t)*.17,.24)}r(29,.26,.2,0,.78,0,.22)}else n.push(N_(.22,.04)),r(30,.38,.2,0,.22,0,.3),r(31,.42,.28,0,.5,0,.24),r(33,.3,.2,.14,.72,-.08,.22),r(34,.28,.18,-.16,.64,.1,.22);return pe(n.map(e=>e.index?e.toNonIndexed():e))}function F_(e){e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
varying vec3 vTW;`).replace(`#include <project_vertex>`,`#include <project_vertex>
{ vec4 twp = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
twp = instanceMatrix * twp;
#endif
vTW = ( modelMatrix * twp ).xyz; }`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
varying vec3 vTW;
float tHash( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float tNoise( vec3 x ) {
  vec3 i = floor( x ); vec3 f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( tHash( i ), tHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( tHash( i + vec3( 0, 1, 0 ) ), tHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( tHash( i + vec3( 0, 0, 1 ) ), tHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( tHash( i + vec3( 0, 1, 1 ) ), tHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}`).replace(`#include <normal_fragment_begin>`,`#include <normal_fragment_begin>
{
  float facing = abs( dot( normalize( normal ), normalize( vViewPosition ) ) );
  float edge = 1.0 - facing;
  float n1 = tNoise( vTW * 0.9 ) * 0.6 + tNoise( vTW * 2.6 ) * 0.4;
  if ( n1 < ( edge - 0.28 ) * 2.3 ) discard;
  // leaf-mass shading: darker hollows
  diffuseColor.rgb *= 0.6 + 0.6 * n1;
}`)}var I_=class{maxTrees;group=new y;species=[];placements=[];material;ribbon;count=0;triangles=0;split;constructor(e,t){this.maxTrees=e,this.group.name=`vegetation`,this.split=!t;let n=+!t;this.species=[`poplar`,`round`,`willow`].map((e,t)=>{let r=P_(e,n);return{name:e,geo:r,farGeo:n>0?P_(e,0):r,share:[.45,.35,.2][t]}}),this.material=Eg(new le({color:`#ffffff`,vertexColors:!0,roughness:.95,metalness:0}),{lamps:!1,key:`tree`,edit:F_}),this.place(),this.build(),this.buildRibbons()}place(){let e=new ft(777),t=Ce.reduce((e,t)=>e+Oe(t),0),n=Math.max(3.3,Math.sqrt(t/Math.max(1,this.maxTrees*.72))),r=Math.min(1.5,n/3.3),i=(t,n,r,i)=>{let a=e.next(),o=a<.45?0:a<.8?1:2,s=o===0?e.range(17,22):o===1?e.range(15,19.5):e.range(12.5,16);this.placements.push({x:t,z:n,h:s,s:e.range(.95,1.2)*i,rot:e.range(0,Math.PI*2),tint:e.next(),sp:o,near:r,far:this.split&&Math.hypot(t,n-60)>j_})};for(let t of Ce){let a=Me(t);for(let o=a.z0+n/2;o<a.z1;o+=n)for(let s=a.x0+n/2;s<a.x1;s+=n){let a=s+e.range(-.38,.38)*n,c=o+e.range(-.38,.38)*n;Ue(t,a,c)&&i(a,c,!0,r)}}for(let t of Be){let n=7.5,r=Me(t),a=Oe(t),o=Math.floor(a/(n*n)),s=0,c=0;for(;s<o&&c<o*6;){c++;let n=e.range(r.x0,r.x1),a=e.range(r.z0,r.z1);Ue(t,n,a)&&(i(n,a,!1,1.15),s++)}}this.placements.sort((e,t)=>Number(t.near)-Number(e.near)||Math.hypot(e.x,e.z-60)-Math.hypot(t.x,t.z-60))}counts(e){let t=[0,0,0],n=[0,0,0];for(let r=0;r<e;r++){let e=this.placements[r];e.far?n[e.sp]++:t[e.sp]++}return{near:t,far:n}}build(){let e=Math.min(this.placements.length,this.maxTrees),t=this.counts(e),n=new b,r=new F,i=new u,a=new u,o=new I,s=[0,0,0],c=[0,0,0];this.species.forEach((e,n)=>{let r=new T(e.geo,this.material,Math.max(1,t.near[n]));if(r.name=`trees-${e.name}`,r.count=t.near[n],e.mesh=r,this.group.add(r),!this.split)return;let i=new T(e.farGeo,this.material,Math.max(1,t.far[n]));i.name=`trees-${e.name}-far`,i.count=t.far[n],i.visible=i.count>0,e.farMesh=i,this.group.add(i)});for(let t=0;t<e;t++){let e=this.placements[t],l=this.species[e.sp],u=e.far?l.farMesh:l.mesh,d=e.far?c:s,f=L(e.x,e.z)-.3;a.set(e.x,f,e.z),r.setFromAxisAngle(oe.DEFAULT_UP,e.rot);let p=e.h*(e.sp===0?.85:.95)*e.s;i.set(p,e.h,p),n.compose(a,r,i),u.setMatrixAt(d[e.sp],n);let m=e.sp===0?`#3a4a2a`:e.sp===1?`#34462c`:`#4a5634`;o.set(m).offsetHSL((e.tint-.5)*.03,(e.tint-.5)*.1,(e.tint-.5)*.06),u.setColorAt(d[e.sp],o),d[e.sp]++}for(let e of this.species)for(let t of[e.mesh,e.farMesh])t&&(t.instanceMatrix.needsUpdate=!0,t.instanceColor&&(t.instanceColor.needsUpdate=!0),t.computeBoundingSphere());this.count=e,this.triangles=this.treeTriangles()}treeTriangles(){let e=0;for(let t of this.species)e+=t.geo.getAttribute(`position`).count/3*(t.mesh?.count??0),e+=t.farGeo.getAttribute(`position`).count/3*(t.farMesh?.count??0);return e}buildRibbons(){let t=new ft(31337),n=[];for(let e of[-520,-700,-880,560,720,900])n.push([-950,e,950,e]);for(let e of[-480,-660,-860,500,680,880])n.push([e,-950,e,950]);let r=[],i=[],a=2.5;for(let[e,o,s,c]of n){let n=Math.hypot(s-e,c-o),l=(s-e)/n,u=(c-o)/n,d=t.range(0,120);for(;d<n;){let s=t.range(90,360),c=Math.min(n,d+s),f=t.chance(.55),p=[];for(let e=d;e<c;e+=f?t.range(4,6):t.range(6,11))p.push([e,f?t.range(2.5,3.6):t.range(4,7),f?t.range(18,25):t.range(12,19)]);let m=e=>{let t=0;for(let[n,r,i]of p){let a=Math.abs(e-n);a<r?t=Math.max(t,i-r*(f?1.6:1)+Math.sqrt(r*r-a*a)*(f?1.6:1)):a<r*1.6&&(t=Math.max(t,(i-r)*(1-(a-r)/(r*.6))*.9))}return t};for(let t=d;t<c;t+=a){let n=Math.min(c,t+a),s=e+l*t,d=o+u*t,f=e+l*n,p=o+u*n,h=m(t),g=m(n);if(h<.5&&g<.5)continue;let _=-.8;r.push(s,_,d,f,-.8,p,f,g,p,s,_,d,f,g,p,s,h,d);for(let e=0;e<6;e++){let t=e===2||e===4||e===5?.9:.3;i.push(t,t,t)}}d=c+t.range(25,160)}}let o=new M;o.setAttribute(`position`,new P(r,3)),o.setAttribute(`color`,new P(i,3)),o.computeVertexNormals();let s=Eg(new le({color:`#27321f`,vertexColors:!0,roughness:1,side:2}),{lamps:!1,key:`ribbon`});this.ribbon=new e(o,s),this.ribbon.name=`far-windbreaks`,this.group.add(this.ribbon),this.ribbonTris=r.length/9,this.triangles+=this.ribbonTris}ribbonTris=0;setBudget(e){let t=Math.min(this.placements.length,e),n=this.counts(t);this.species.forEach((e,t)=>{e.mesh&&(e.mesh.count=Math.min(n.near[t],e.mesh.instanceMatrix.count)),e.farMesh&&(e.farMesh.count=Math.min(n.far[t],e.farMesh.instanceMatrix.count),e.farMesh.visible=e.farMesh.count>0)}),this.count=t,this.triangles=this.treeTriangles()+this.ribbonTris}},L_=class{name=`terrain`;app;enabled=!0;ground;water;waterMat;vegetation;plates;ramps;siteMask;detail;macro;groundTris=0;plateCount=0;async init(e){this.app=e;let t=e.quality,n=t.level===`mobile`,r=Math.min(1024,t.textureSize),i=new or(12);await e.loadStep(`site masks`,0),this.siteMask=await O_(n?512:1024,i),await e.loadStep(`ground detail`,.3),this.detail=await Kh(n?256:Math.min(512,r),i),this.detail.anisotropy=t.anisotropy,this.macro=await Wh(n?128:256,i),this.macro.anisotropy=t.anisotropy,this.siteMask.anisotropy=Math.max(4,t.anisotropy),await e.loadStep(`ground`,.55),this.buildGround(n),await i.maybeYield(),this.buildWater(),this.buildPlates(),this.buildCableRamps(),await e.loadStep(`trees`,.75),this.vegetation=new I_(t.treeCount,n),e.scene.add(this.vegetation.group),this.registerBounds()}heightAt(e,t){return je(e,t)??Jt(e,t)??L(e,t)}axis(e,t,n,r,i){let a=[];for(let[t,n,r]of e){let e=Math.max(1,Math.round((n-t)/r));for(let r=0;r<e;r++)a.push(t+(n-t)*r/e)}a.push(e[e.length-1][1]);let o=t,s=r,c=[];for(;Math.abs(o)<Math.abs(n);)s*=1.09,o+=i*s,c.push(o);return i>0?[...a,...c]:[...c.reverse(),...a]}buildGround(t){let n=t?2:1,r=[[-330,-135,6*n],[-135,-40,2*n],[-40,40,6*n],[40,135,2*n],[135,330,6*n]],i=[[-110,-2,2*n],[-2,100,6*n],[100,122,2*n],[122,165,6*n],[165,262,3*n],[262,400,6*n]],a=[...this.axis(r,-330,-2400,6,-1).filter((e,t,n)=>t===0||e!==n[t-1]),...this.axis([[330,330.001,1]],330,2400,6,1).slice(1)],o=[...this.axis(i,-110,-2400,6,-1),...this.axis([[400,400.001,1]],400,2400,6,1).slice(1)],s=e=>e.filter((t,n)=>n===0||t>e[n-1]+.001),c=s(a.sort((e,t)=>e-t)),l=s(o.sort((e,t)=>e-t)),d=c.length,f=l.length,m=new Float32Array(d*f*3),h=new Float32Array(d*f*3),g=new ft(5);for(let e=0;e<f;e++)for(let t=0;t<d;t++){let n=c[t],r=l[e],i=L(n,r);Math.max(Math.abs(n),Math.abs(r-60))>420&&(i+=-.6+Math.sin(n*.004+g.next()*.01)*Math.cos(r*.003)*.4);let a=(e*d+t)*3;m[a]=n,m[a+1]=i,m[a+2]=r;let o=.75,s=L(n+o,r)-L(n-o,r),f=L(n,r+o)-L(n,r-o),p=new u(-s,2*o,-f).normalize();h[a]=p.x,h[a+1]=p.y,h[a+2]=p.z}let _=new Uint32Array((d-1)*(f-1)*6),v=0;for(let e=0;e<f-1;e++)for(let t=0;t<d-1;t++){let n=e*d+t,r=n+1,i=n+d,a=i+1;_[v++]=n,_[v++]=i,_[v++]=r,_[v++]=r,_[v++]=i,_[v++]=a}let y=new M;y.setAttribute(`position`,new j(m,3)),y.setAttribute(`normal`,new j(h,3)),y.setIndex(new j(_,1)),y.computeBoundingSphere(),this.groundTris=_.length/3;let b=new le({color:`#ffffff`,roughness:.9,metalness:0}),x={tSite:{value:this.siteMask},tDetail:{value:this.detail},tMacro:{value:this.macro},uSiteRect:{value:new p(D_.x0,D_.z0,1/D_.w,1/D_.h)},uWet:{value:0}};Eg(b,{key:`ground`,edit:e=>{Object.assign(e.uniforms,x),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
varying vec3 vGW;`).replace(`#include <worldpos_vertex>`,`#include <worldpos_vertex>
vGW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>\n${V_}`).replace(`#include <map_fragment>`,H_).replace(`#include <roughnessmap_fragment>`,`float roughnessFactor = gRough;`).replace(`#include <normal_fragment_maps>`,`normal = gPerturb( - vViewPosition, normal, gH, 0.035, faceDirection );`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>\n${U_}`)}}),this.ground=new e(y,b),this.ground.name=`ground`,this.ground.renderOrder=9e5,this.app.scene.add(this.ground)}buildWater(){let t=new r(Ie.map(([e,t])=>new s(e,-t))),n=new _e(t,4);n.rotateX(-Math.PI/2),n.translate(0,ke,0),this.waterMat=new C({uniforms:h.merge([k.fog,{tNoise:{value:this.macro}}]),vertexShader:W_,fragmentShader:G_,fog:!0}),Object.assign(this.waterMat.uniforms,Jh),this.water=new e(n,this.waterMat),this.water.name=`lake`,this.app.scene.add(this.water)}buildPlates(){let e=[[[-47,121],[-72,112],[-97,104]],[[47,121],[72,112],[97,102]],[[-96,140],[-112,146]],[[-60,150],[-72,166]],[[104,136],[116,126]],[[-46,46],[-96,46]],[[46,46],[96,46]]],t=B_(),n=Eg(new le({map:t,color:`#ffffff`,metalness:.15,roughness:.6}),{key:`plates`}),r=new me(3,.03,2),a=[],o=new ft(88),s=new b,c=new F,l=new u,d=new i;for(let t of e)for(let e=1;e<t.length;e++){let[n,r]=t[e-1],[i,f]=t[e],p=Math.hypot(i-n,f-r),m=Math.atan2(-(f-r),i-n),h=Math.floor(p/2.05);for(let e=0;e<h;e++){let t=(e+.5)/h;for(let e of[-1.02,1.02]){let p=n+(i-n)*t,h=r+(f-r)*t,g=p+Math.cos(m+Math.PI/2)*e*1.5,_=h-Math.sin(m+Math.PI/2)*e*1.5,v=L(g,_),y=L(g+1,_)-L(g-1,_),b=L(g,_+1)-L(g,_-1);l.set(-y,2,-b).normalize(),d.set(0,m+Math.PI/2+o.range(-.03,.03),0),c.setFromEuler(d);let x=new F().setFromUnitVectors(oe.DEFAULT_UP,l);c.premultiply(x),s.compose(new u(g,v+.02+o.range(0,.01),_),c,new u(1,1,1)),a.push(s.clone())}}}this.plates=new T(r,n,a.length),a.forEach((e,t)=>this.plates.setMatrixAt(t,e)),this.plates.instanceMatrix.needsUpdate=!0,this.plates.computeBoundingSphere(),this.plates.name=`rijplaten`,this.plateCount=a.length,this.app.scene.add(this.plates)}buildCableRamps(){let e=.9,t=new me(.52,.06,e);t.translate(0,.03,0);let n=new me(.16,.01,e);n.translate(0,.064,0);let r=new Float32Array(t.getAttribute(`position`).count*3).fill(.05);t.setAttribute(`color`,new j(r,3));let i=n.getAttribute(`position`).count,a=new Float32Array(i*3);for(let e=0;e<i;e++)a.set([.2,.15,.03],e*3);n.setAttribute(`color`,new j(a,3));let o=z_([t,n]),s=Eg(new le({vertexColors:!0,roughness:.8}),{key:`ramps`}),c=[],l=new b;for(let t of[-1,1]){let n=t*23.9,r=Pe.filter(e=>e.side===t).reduce((e,t)=>Math.max(e,t.z),0)-4;for(let t=4.5;t<r;t+=e)l.makeTranslation(n,0,t+e/2),c.push(l.clone())}this.ramps=new T(o,s,c.length),c.forEach((e,t)=>this.ramps.setMatrixAt(t,e)),this.ramps.instanceMatrix.needsUpdate=!0,this.ramps.computeBoundingSphere(),this.ramps.name=`cable-ramps`,this.app.scene.add(this.ramps)}registerBounds(){let e=Qe.x0+3,t=.8,n=zt.x0-t,r=[[[zt.x1+t,173],[125,173],[130,150],[108.5,99],[108.5,-6],[e,-6]],[[n,173],[-120,173],[-135,150],[-108.5,120],[-108.5,-6],[-e,-6]]],i=e=>this.app.addCollider(e);for(let e of r)for(let n=1;n<e.length;n++)R_(e[n-1],e[n],t,`bounds`).forEach(i)}update(e){this.enabled}setQuality(e){this.vegetation&&this.vegetation.setBudget(e.treeCount);for(let t of[this.detail,this.macro])t&&(t.anisotropy=e.anisotropy,t.needsUpdate=!0)}setEnabled(e){this.enabled=e;for(let t of[this.ground,this.water,this.vegetation?.group,this.plates,this.ramps])t&&(t.visible=e)}stats(){return{groundTris:this.groundTris,trees:this.vegetation?.count??0,treeTris:this.vegetation?.triangles??0,plates:this.plateCount}}};function R_(e,t,n,r){let[i,a]=e,[o,s]=t,c=[];if(Math.abs(i-o)<.001||Math.abs(a-s)<.001)return c.push({kind:`box`,minX:Math.min(i,o)-n,maxX:Math.max(i,o)+n,minZ:Math.min(a,s)-n,maxZ:Math.max(a,s)+n,tag:r}),c;let l=Math.hypot(o-i,s-a),u=Math.ceil(l/n);for(let e=0;e<=u;e++){let t=e/u;c.push({kind:`circle`,x:i+(o-i)*t,z:a+(s-a)*t,r:n,tag:r})}return c}function z_(e){let t=e.map(e=>e.index?e.toNonIndexed():e),n=[`position`,`normal`,`color`],r=new M;for(let e of n){let n=t.map(t=>t.getAttribute(e).array),i=n.reduce((e,t)=>e+t.length,0),a=new Float32Array(i),o=0;for(let e of n)a.set(e,o),o+=e.length;r.setAttribute(e,new j(a,3))}return r}function B_(){let[e,t]=Uh(256,256),n=new ft(3);t.fillStyle=`#8f8b84`,t.fillRect(0,0,256,256);for(let e=0;e<256;e+=16)for(let n=0;n<256;n+=16){let r=e/16%2?8:0;t.save(),t.translate(n+r+8,e+8),t.rotate(e/16%2?.6:-.6),t.fillStyle=`#aeaaa3`,t.fillRect(-6,-1.5,12,3),t.fillStyle=`#4d4a47`,t.fillRect(-6,1.5,12,1),t.restore()}for(let e=0;e<40;e++)t.fillStyle=n.chance(.5)?`rgba(110,60,30,0.25)`:`rgba(70,55,40,0.3)`,t.beginPath(),t.ellipse(n.range(0,256),n.range(0,256),n.range(6,40),n.range(4,22),n.range(0,3),0,Math.PI*2),t.fill();t.fillStyle=`#222`;for(let[e,n]of[[12,12],[244,12],[12,244],[244,244]])t.beginPath(),t.arc(e,n,5,0,Math.PI*2),t.fill();return Bh(e,{repeat:!1})}var V_=`
varying vec3 vGW;
uniform sampler2D tSite;
uniform sampler2D tDetail;
uniform sampler2D tMacro;
uniform vec4 uSiteRect;
uniform float uWet;
float gHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
vec3 gPerturb( vec3 surf_pos, vec3 surf_norm, float h, float scale, float fd ) {
  vec3 sx = dFdx( surf_pos );
  vec3 sy = dFdy( surf_pos );
  vec2 dh = vec2( dFdx( h ), dFdy( h ) ) * scale;
  vec3 r1 = cross( sy, surf_norm );
  vec3 r2 = cross( surf_norm, sx );
  float det = dot( sx, r1 ) * fd;
  vec3 grad = sign( det ) * ( dh.x * r1 + dh.y * r2 );
  return normalize( abs( det ) * surf_norm - grad );
}
`,H_=`
float gRough = 0.95;
float gH = 0.0;
float gDamp = 0.0;
{
  vec2 xz = vGW.xz;
  vec2 suv = ( xz - uSiteRect.xy ) * uSiteRect.zw;
  float inSite = step( 0.0, suv.x ) * step( suv.x, 1.0 ) * step( 0.0, suv.y ) * step( suv.y, 1.0 );
  vec4 m = texture2D( tSite, clamp( suv, 0.001, 0.999 ) ) * inSite;
  vec4 d1 = texture2D( tDetail, xz * 0.25 );
  vec4 d2 = texture2D( tDetail, xz * 0.83 + 0.37 );
  vec4 mac = texture2D( tMacro, xz * ( 1.0 / 260.0 ) );
  vec4 mac2 = texture2D( tMacro, xz * ( 1.0 / 47.0 ) + 0.21 );
  float dist = length( vGW - cameraPosition );
  float fine = 1.0 - smoothstep( 40.0, 160.0, dist );
  // high-frequency detail (pebbles, blades, aggregate) fades to its mean well before it would alias
  float nearD = 1.0 - smoothstep( 6.0, 38.0, dist );
  float d2b = mix( 0.5, d2.b, nearD );
  // metres per pixel on the ground (joint / grate anti-aliasing)
  vec2 fwm = max( fwidth( xz ), vec2( 1e-4 ) );

  // --- heat-parched grass (straw / olive / bare soil)
  float patchy = smoothstep( 0.32, 0.72, mac.r * 0.55 + mac2.g * 0.45 );
  vec3 straw = vec3( 0.30, 0.24, 0.11 );
  vec3 olive = vec3( 0.13, 0.14, 0.06 );
  vec3 soil = vec3( 0.14, 0.10, 0.065 );
  vec4 mid = texture2D( tMacro, xz * ( 1.0 / 11.0 ) + 0.63 );
  patchy = clamp( patchy + ( mid.g - 0.5 ) * 0.9, 0.0, 1.0 );
  vec3 grass = mix( olive, straw, patchy );
  grass *= 0.8 + 0.4 * mid.r;
  grass *= mix( 1.0, 0.74 + 0.52 * d1.g, nearD * 0.75 + fine * 0.1 );
  grass = mix( grass, soil, smoothstep( 0.5, 0.85, mix( 0.5, d2.a, nearD ) ) * 0.4 + smoothstep( 0.62, 0.8, mac2.r ) * 0.25 );
  float hG = d1.g * 0.7 + d2.g * 0.3;

  // --- far polder: crop parcels on the site grid, ditches between them
  float farW = smoothstep( 250.0, 420.0, max( abs( xz.x ), abs( xz.y - 60.0 ) ) );
  if ( farW > 0.0 ) {
    vec2 pq = vec2( ( xz.x + 37.0 ) / 310.0, ( xz.y + 11.0 ) / 140.0 );
    float ph = gHash( floor( pq ) );
    vec3 crop = ph < 0.3 ? vec3( 0.15, 0.12, 0.05 ) : ph < 0.55 ? vec3( 0.035, 0.05, 0.02 ) : ph < 0.75 ? vec3( 0.065, 0.045, 0.03 ) : vec3( 0.06, 0.07, 0.03 );
    vec2 fq = abs( fract( pq + 0.5 ) - 0.5 ) * vec2( 310.0, 140.0 );
    float ditch = 1.0 - smoothstep( 0.6, 2.4, min( fq.x, fq.y ) );
    crop *= 0.8 + 0.4 * d1.g;
    grass = mix( grass, mix( crop, vec3( 0.02, 0.025, 0.03 ), ditch ), farW );
  }

  // --- worn ground: dirt / gravel / sand
  vec3 dirt = mix( vec3( 0.14, 0.105, 0.072 ), vec3( 0.19, 0.155, 0.11 ), d2b );
  vec3 sand = vec3( 0.45, 0.42, 0.35 ) * ( 0.9 + 0.15 * mix( 0.5, d1.b, nearD ) );
  vec3 worn = xz.y > 240.0 ? sand : ( xz.y < -30.0 ? mix( dirt, vec3( 0.26, 0.24, 0.2 ), 0.6 ) : dirt );
  float wear = clamp( m.b * ( 0.75 + 0.5 * mac2.b ), 0.0, 1.0 );
  vec3 col = mix( grass, worn, wear );
  float h = mix( hG, d2.b * 0.6, wear );
  float rough = 0.96;

  // --- roads / hard-standing (light gravel-asphalt road, darker compacted gravel hard-standing):
  //     low-contrast grain near the eye, broad tyre-worn and dusty patches at every distance
  float road = smoothstep( 0.25, 0.45, m.g );
  vec3 roadC = mix( vec3( 0.12, 0.112, 0.1 ), vec3( 0.30, 0.28, 0.23 ), smoothstep( 0.6, 0.95, m.g ) ) * ( 0.91 + 0.16 * d2b ) * ( 0.84 + 0.3 * mac2.g ) * ( 0.9 + 0.2 * mid.b );
  col = mix( col, roadC, road );
  h = mix( h, d2.b * 0.3, road );
  rough = mix( rough, 0.82 + 0.1 * mac2.r, road );

  // --- concrete floor: pale paving (the user's daytime photos: a light beige-grey concrete apron,
  //     4 m slabs with faint sawn joints, a few broad stains), gutters with gully grates at X ±29 and
  //     RED painted lines along both aisle edges. Albedo ≈ #A9A99C (design-bible §6.3); at night it
  //     stays dark in the show light because the show light on the ground is local (worldLights)
  float conc = smoothstep( 0.3, 0.6, m.r );
  if ( conc > 0.0 ) {
    vec2 sl = xz / 4.0;
    vec2 cell = floor( sl );
    vec2 fr = fract( sl );
    // sawn joints (≈ 3.5 cm) box-filtered against the pixel footprint: no dotted "ant trails" at
    // grazing angles, the lines fade to their true average darkness with distance
    vec2 e2 = min( fr, 1.0 - fr ) * 4.0;
    const float JW = 0.018;
    vec2 jl = ( 1.0 - smoothstep( JW - fwm * 0.5, JW + fwm * 0.5, e2 ) ) * min( vec2( 1.0 ), ( 2.0 * JW ) / fwm );
    float joint = max( jl.x, jl.y );
    float tint = gHash( cell );
    // slab-to-slab variation kept subtle (poured concrete, not tile); broad dust / stains at 10–60 m
    // scales, very light tyre wear: the photos show an almost uniform pale apron
    vec3 cc = vec3( 0.40, 0.385, 0.34 ) * ( 0.96 + 0.08 * tint ) * ( 0.93 + 0.14 * mix( 0.5, d1.r, nearD ) ) * ( 0.9 + 0.2 * mac.b );
    cc *= 0.88 + 0.2 * smoothstep( 0.2, 0.8, mac2.g );
    cc *= m.r < 0.95 ? 0.85 : 1.0;
    float tyre = smoothstep( 0.72, 1.0, sin( xz.x * 1.7 + mac2.r * 5.0 ) ) * smoothstep( 0.5, 0.8, mac.g ) * 0.1 * ( 0.4 + 0.6 * fine );
    cc *= 1.0 - tyre - smoothstep( 0.6, 0.92, mix( 0.5, d2.a, nearD ) ) * 0.12 - smoothstep( 0.55, 0.85, mac2.a ) * 0.12;
    cc *= 1.0 - joint * 0.3;
    // red painted lines (≈ 0.4 m) along the aisle edges X ±15.75 — the inner corners of the pillar
    // plinths — from the pit barrier to the back of the paved floor, box-filtered like the joints;
    // weathered paint (worn patches, dust)
    const float RW = 0.2;
    float rl = abs( abs( xz.x ) - 15.75 );
    float red = ( 1.0 - smoothstep( RW - fwm.x * 0.5, RW + fwm.x * 0.5, rl ) ) * min( 1.0, ( 2.0 * RW ) / fwm.x );
    red *= smoothstep( 5.5, 6.5, xz.y ) * ( 1.0 - smoothstep( 112.0, 113.0, xz.y ) );
    red *= 0.78 + 0.22 * smoothstep( 0.25, 0.6, mix( 0.5, d1.g, nearD ) + ( mac2.b - 0.5 ) * 0.4 );
    cc = mix( cc, vec3( 0.42, 0.05, 0.035 ) * ( 0.9 + 0.2 * mac.b ), red );
    float gd = abs( abs( xz.x ) - 29.0 );
    float inFloor = step( xz.y, 113.0 ) * step( 0.0, xz.y );
    float gut = ( 1.0 - smoothstep( 0.1, 0.45 + fwm.x, gd ) ) * inFloor;
    float gz = abs( fract( xz.y / 10.0 + 0.5 ) - 0.5 ) * 10.0;
    float grate = ( 1.0 - smoothstep( 0.28 - fwm.x * 0.5, 0.28 + fwm.x * 0.5, gd ) ) * ( 1.0 - smoothstep( 0.3 - fwm.y * 0.5, 0.3 + fwm.y * 0.5, gz ) ) * inFloor;
    cc = mix( cc, cc * 0.6, gut );
    cc = mix( cc, vec3( 0.025 ), grate );
    // damp (uWet, 0 = the dry night of bible §8.4): gutters and low spots with a glossy sky reflection
    float damp = uWet * clamp( gut * 1.2 + smoothstep( 0.7, 0.86, mac2.b + ( d2.a - 0.5 ) * 0.2 ) * 0.6 + smoothstep( 0.74, 0.86, mac.a ) * 0.4, 0.0, 1.0 );
    gDamp = damp * conc;
    cc *= 1.0 - 0.35 * damp;
    col = mix( col, cc, conc );
    h = mix( h, d1.r * 0.2 - joint * 0.9 - grate * 0.5, conc );
    // roughness varies with wear / dust (no uniform polished sheen)
    rough = mix( rough, mix( 0.74 + 0.18 * mac2.r, 0.18, damp ), conc );
  }

  // --- timber decking ("flonders") behind the road
  float deck = smoothstep( 0.3, 0.6, m.a );
  if ( deck > 0.0 ) {
    float bw = 0.145;
    float bi = floor( xz.x / bw );
    float bf = fract( xz.x / bw );
    float gap = smoothstep( 0.0, 0.07, bf ) * smoothstep( 1.0, 0.93, bf );
    float bt = gHash( vec2( bi, floor( ( xz.y + bi * 1.7 ) / 3.1 ) ) );
    vec3 wood = mix( vec3( 0.12, 0.09, 0.065 ), vec3( 0.22, 0.19, 0.15 ), bt ) * ( 0.75 + 0.45 * d1.a ) * mix( 0.25, 1.0, gap );
    col = mix( col, wood, deck );
    h = mix( h, gap * 0.5 + d1.a * 0.2, deck );
    rough = mix( rough, 0.85, deck );
  }
  diffuseColor.rgb *= col;
  gRough = rough;
  // derivative bump only close to the eye: far away it turns into per-pixel sparkle ("TV static")
  gH = h * nearD;
}
`,U_=`
if ( gDamp > 0.01 ) {
  vec3 V = normalize( vGW - cameraPosition );
  vec3 Nw = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  vec3 R = reflect( V, Nw );
  float cosT = max( dot( -V, Nw ), 0.0 );
  float F = 0.02 + 0.98 * pow( 1.0 - cosT, 5.0 );
  vec3 sky = wlSky( R );
  float glint = pow( max( dot( R, uWMoonDir ), 0.0 ), 3000.0 ) * uWMoonI;
  totalEmissiveRadiance += ( sky * 0.55 + vec3( 1.0, 0.8, 0.6 ) * glint * 0.08 ) * F * gDamp * gDamp;
}
`,W_=`
#include <common>
#include <fog_pars_vertex>
varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vW = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`,G_=`
#include <common>
#include <fog_pars_fragment>
uniform sampler2D tNoise;
uniform vec3 uWSkyZen;
uniform vec3 uWSkyHor;
uniform vec3 uWSkyHorNW;
uniform vec3 uWSunDir;
uniform vec3 uWMoonDir;
uniform float uWMoonI;
uniform vec4 uWStage;
uniform vec3 uWStageCol;
uniform vec4 uWFlash;
uniform vec3 uWFlashCol;
uniform float uWTime;
varying vec3 vW;
${Yh}
void main() {
  vec3 V = normalize( vW - cameraPosition );
  // wind ripples from the NNW (~4–5 m/s): two scrolling noise layers
  vec2 uv = vW.xz;
  float t = uWTime;
  vec2 n1 = texture2D( tNoise, uv * 0.035 + vec2( 0.011, 0.023 ) * t ).rg - 0.5;
  vec2 n2 = texture2D( tNoise, uv * 0.11 - vec2( 0.019, 0.008 ) * t ).ba - 0.5;
  vec3 N = normalize( vec3( ( n1.x + n2.x * 0.6 ) * 0.22, 1.0, ( n1.y + n2.y * 0.6 ) * 0.22 ) );
  vec3 R = reflect( V, N );
  R.y = abs( R.y );
  float cosT = max( dot( -V, N ), 0.0 );
  float F = 0.02 + 0.98 * pow( 1.0 - cosT, 5.0 );
  vec3 col = wlSky( R ) * F;
  // moon glitter path
  col += vec3( 1.0, 0.8, 0.6 ) * pow( max( dot( R, uWMoonDir ), 0.0 ), 300.0 ) * uWMoonI * 0.25;
  // reflected glow of the stage and of pyro flashes (broad lobes; the coefficients undo the round-4
  // ground-light gains of worldLights: a mirror image of the emitters keeps its brightness)
  vec3 sd = normalize( uWStage.xyz - vW );
  col += uWStageCol * 0.000037 * pow( max( dot( R, sd ), 0.0 ), 24.0 );
  vec3 fd = normalize( uWFlash.xyz - vW );
  col += uWFlashCol * 0.00008 * pow( max( dot( R, fd ), 0.0 ), 12.0 );
  col += vec3( 0.004, 0.006, 0.006 ) * ( 1.0 - F );
  gl_FragColor = vec4( col, 1.0 );
  #include <fog_fragment>
}
`;export{wt as A,Gn as C,Et as D,It as E,qt as F,Kt as I,Gt as L,Ct as M,Wt as N,Lt as O,Ut as P,Xt as R,Xn as S,Bt as T,ur as _,Zp as a,ar as b,Eu as c,Vs as d,gr as f,dr as g,lr as h,dh as i,St as j,Tt as k,al as l,sr as m,E_ as n,$f as o,cr as p,Ug as r,wd as s,L_ as t,Vc as u,or as v,Vt as w,er as x,ir as y};