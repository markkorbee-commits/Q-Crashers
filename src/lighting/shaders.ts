/**
 * GLSL for the lighting system (ShaderMaterial, WebGL2 / GLSL ES 3.00 via three's prefix).
 * Scene-referred HDR output: the post pipeline blooms values > ~1 and tone-maps.
 */

const NOISE_DECL = /* glsl */ `
precision highp sampler3D;
uniform sampler3D tNoise;
uniform float uTime;
`;

/**
 * Low fog (`fog.lowfog`, round 8): the smoke-machine bank on the deck and the field as a density field the beams
 * pass through. Zones along Z follow FogSystem.lowfog's regions: the deck (Z −19…0, the fog on the deck surface
 * Y 1.9, top ~3.2 m), the near field (Z 0…50, where the bank spills out, top ~2.2 m) and the far field (Z 50…160).
 * Density 0..~1.5 of the zone at p (x its height / width fall-off).
 */
const LOWFOG_DECL = /* glsl */ `
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
`;

// ------------------------------------------------------------------------------------ beams
export const BEAM_VERT = /* glsl */ `
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
`;

export const BEAM_FRAG = /* glsl */ `
${NOISE_DECL}
${LOWFOG_DECL}
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
`;

// ------------------------------------------------------------------------------------ ground pools
export const POOL_VERT = /* glsl */ `
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
`;

export const POOL_FRAG = /* glsl */ `
${NOISE_DECL}
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
`;

// ------------------------------------------------------------------------------------ sprites
// type 0 = moving-head lens / flare, 1 = blinder (2x2 lamps), 2 = strobe bar, 3 = festoon bulb / practical
export const SPRITE_VERT = /* glsl */ `
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
`;

export const SPRITE_FRAG = /* glsl */ `
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
`;

// ------------------------------------------------------------------------------------ wash glow
// The decor floods washing the set scatter in the stage haze: the whole set sits in a glow of the
// wash colour (f002 blue, f008 red, f029 magenta, f041 cyan). Analytic line integral of a few
// anisotropic gaussian haze blobs along the view ray (no ray marching, no depth texture).
export const GLOW_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

// ------------------------------------------------------------------------------------ flood glow
// Depth-sliced analytic haze: slice i is a camera-facing quad at view depth d0 that adds the gaussian
// in-scatter of the ray segment between view depths d0 and d1. The quad is depth tested, so geometry
// nearer than d0 hides that segment (and every segment behind it).
export const FLOOD_VERT = /* glsl */ `
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
`;

export const FLOOD_FRAG = /* glsl */ `
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
`;

export const GLOW_FRAG = /* glsl */ `
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
`;
