/**
 * GLSL for the laser renderer. All passes are additive HDR (scene-referred: ~1 = display white,
 * bloom above ~1.1, 64 = pure white after tone mapping).
 *
 * Physical model (single scattering in haze):
 *  - a beam of power P seen at scattering angle θ (between its propagation direction and the ray
 *    towards the eye) has a line radiance ∝ σ(haze) · P · phase(θ) / sin θ. The 1/sin θ path-length
 *    term and the forward-peaked Henyey-Greenstein phase make a beam flare when you look down it.
 *  - the cross-section is an energy-normalised gaussian core (physical beam radius, never thinner
 *    than ~0.6 px so distant beams stay anti-aliased and get dimmer instead of vanishing) plus a
 *    wider multiple-scattering halo.
 *  - a sheet (scanned plane) of power P over fan angle Φ has radiance ∝ σ · P / (Φ · r · |n·v|):
 *    edge-on it becomes a glowing line/ceiling, face-on it is a faint textured veil.
 *  - σ(haze) = global haze · height profile · stage→field gradient · 3D noise (shared world-space
 *    field → coherent smoke). The smoke machines stand at the set: the air is thickest around the
 *    stage and thins out over the empty field (FogSystem: field ≈ 1/3 of the stage cloud), so beams
 *    read brightest near the set and fade on their way over the field — as in the official video.
 *    The low-fog layer (fog.lowfog) is not part of the gradient: it covers the field itself.
 */

export const HAZE_GLSL = /* glsl */ `
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
`;

// ------------------------------------------------------------------------------------------------
// Beams: one camera-facing ribbon per instance, tessellated densest around the point of the beam
// closest to the camera (so a beam passing over your head stays smooth).
// ------------------------------------------------------------------------------------------------
export const BEAM_VERT = /* glsl */ `
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
`;

export const BEAM_FRAG = /* glsl */ `
uniform float uGain;
uniform float uTime;
${HAZE_GLSL}
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
  float line = hz * ph / max(s, 0.14);
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
`;

// ------------------------------------------------------------------------------------------------
// Surfaces: scanned sheets ("liquid sky") and cone shells (tunnels). One instanced polar grid,
// every vertex is a point on a straight ray from the apex (a ruled surface, as a scanner draws it).
// ------------------------------------------------------------------------------------------------
export const SURF_VERT = /* glsl */ `
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
  vRing = sG.xy;
  // low-fog layer: the crest colour rides in the (unused) wave-phase slots
  vColor2 = sC.w > 1.5 ? sE.xyz : sD.rgb;
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}
`;

export const SURF_FRAG = /* glsl */ `
uniform float uGainS;
uniform float uTime;
${HAZE_GLSL}
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
    float w1 = texture(uNoise, q * vec3(0.1, 0.3, 0.2) + uDrift).r;
    float w2 = uOct > 1.5 ? texture(uNoise, q * vec3(0.29, 0.5, 0.52) - uDrift * 2.0).r : 0.5;
    float fogTex = smoothstep(0.34, 0.76, w1 * 0.55 + w2 * 0.3 + n1 * 0.15);
    float crest = fogTex * fogTex;
    float streak = lines(vU * 29.0 + uTime * 0.07, 5.0);
    float edgeU = smoothstep(0.0, 0.12, min(vU, 1.0 - vU));
    float I = uGainS * uLowHaze * (0.025 + 0.8 * crest + 3.4 * crest * crest) * (0.55 + 1.3 * streak) * (0.55 + 0.45 * hazePhase(c))
      * pow(max(vR, 6.0), -0.55) / max(nv, 0.25) * exp(-vLift / 1.3) * edgeU;
    // deep scan colour in the troughs, the second colour on the lit crests
    col = mix(vColor, vColor2, smoothstep(0.12, 0.6, crest)) * I;
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
    float t3 = mix(0.12 + 1.7 * tex * tex, tex * 0.9 + 0.3, faceOn);
    float haze = uHaze * hazeProfile(vWorld.y) * t3;
    // Near its plane (and from below) the eye / camera exposes for the blinding edge-on line: the rest
    // of the plane, 10–30x dimmer, falls away into the dark (f017 / f147: a thin crisp band in a dark
    // scene, not a lit floor or a coloured sky). From a drone high above, the whole sea stays readable.
    float planeDist = abs(dot(cameraPosition - vWorld, Nn));
    float kNear = 40.0 * (1.0 - smoothstep(0.5, 9.0, planeDist));
    kNear = max(kNear, 10.0 * (1.0 - above));
    float E = inversesqrt(nv * nv + 0.0005) * exp(-nv * kNear);
    float I = uGainS * haze * hazePhase(c) * pow(max(vR, 4.0), -0.75) * E;
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
`;

// ------------------------------------------------------------------------------------------------
// Sprites: projector aperture flares (blinding when a beam points at you) + beam hit spots.
// ------------------------------------------------------------------------------------------------
export const SPRITE_VERT = /* glsl */ `
attribute vec4 pA; // position.xyz, world size
attribute vec4 pB; // colour (rgb), kind (0 aperture flare, 1 hit spot)
uniform float uPixAng;
varying vec2 vUv;
varying vec3 vColor;
varying float vKind;
varying float vDist;
void main() {
  vec3 P = pA.xyz;
  vec3 toCam = cameraPosition - P;
  float dist = max(length(toCam), 1e-3);
  float size;
  if (pB.w > 1.5) {
    // lens veil: an in-camera effect, so it is drawn just in front of the lens at the same angular
    // size (nothing in the scene can cut it)
    float dn = 1.5;
    size = pA.w * dn / dist;
    P = cameraPosition - toCam / dist * dn;
    vColor = pB.rgb;
  } else {
    float minSize = (pB.w > 0.5 ? 2.2 : 3.2) * dist * uPixAng;
    size = max(pA.w, minSize);
    // pull towards the camera so the billboard is not cut by the surface it sits on
    P += toCam / dist * min(size * 1.1, dist * 0.5);
    // energy conservation when clamped to the minimum pixel footprint
    float k = pA.w / size;
    vColor = pB.rgb * k * k;
  }
  vec4 mv = viewMatrix * vec4(P, 1.0);
  mv.xy += position.xy * size;
  vUv = position.xy;
  vKind = pB.w;
  // (the lens veil is not dimmed by the air between the projector and the lens: the beam is collimated)
  vDist = pB.w > 1.5 ? 0.0 : dist;
  gl_Position = projectionMatrix * mv;
  // the lens veil sits on the lens: nothing in the scene may cut it
  if (pB.w > 1.5) gl_Position.z = -0.999 * gl_Position.w;
}
`;

export const SPRITE_FRAG = /* glsl */ `
${HAZE_GLSL}
varying vec2 vUv;
varying vec3 vColor;
varying float vKind;
varying float vDist;
void main() {
  float r2 = dot(vUv, vUv);
  if (r2 > 1.0) discard;
  float I;
  if (vKind > 1.5) {
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
`;
