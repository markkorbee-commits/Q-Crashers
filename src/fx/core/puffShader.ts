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
`;
