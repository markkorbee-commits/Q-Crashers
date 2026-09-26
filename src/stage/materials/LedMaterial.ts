import * as THREE from 'three';

/** Emissive element kinds (aLed.z). Keep in sync with the fragment shader below. */
export const LED_KIND = {
  /** pixel-mapped LED batten (10 px / m) */
  bar: 0,
  /** glowing window pane (castle windows) */
  window: 1,
  /** lens of a static fixture along the stage front line */
  lamp: 2,
  /** faceted crystal lantern (side sections) */
  lantern: 3,
  /** chandelier candles / warm points */
  candle: 4,
  /** arcade backlight panel */
  arcade: 5,
  /** deep portal interior glow */
  portal: 6,
  /** sparse pixel dots (bigger pitch, round) */
  dots: 7,
  /** tiny screens on DJ gear */
  screen: 8,
  /** blind arcade: dim recessed glow (arms) */
  blind: 9,
  /** LED panel over a printed banner: shows 'screens' content, invisible (discarded) when off */
  panel: 10,
} as const;

/** 'screens.content' modes -> uContent index used by the panel shader */
export const CONTENT_MODE: Record<string, number> = {
  off: 0,
  color: 1,
  fire: 2,
  ice: 3,
  runes: 4,
  logo: 5,
  title: 6,
  eye: 7,
  embers: 8,
  pulse: 9,
};

/**
 * Pixel-mapped LED / emissive material for everything that glows on the castle and side sections.
 * Pure function of the uniforms (show time, beat, look) -> deterministic and seek safe.
 * Output is scene-referred HDR (values > 1 bloom in the post pipeline).
 */
export function createLedMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'stage-led',
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uBeat: { value: 0 },
        uKick: { value: 0 },
        uPhase: { value: 0 },
        uPattern: { value: 0 },
        uLed: { value: new THREE.Color(1, 0.1, 0.05) },
        uLed2: { value: new THREE.Color(0.1, 0.2, 1) },
        uAccent: { value: new THREE.Color(1, 1, 1) },
        uWin: { value: new THREE.Color(1, 0.6, 0.2) },
        uWinMode: { value: 0 },
        uArcade: { value: new THREE.Color(0.2, 0.1, 0.6) },
        uLamp: { value: new THREE.Color(1, 1, 1) },
        uLantern: { value: new THREE.Color(0.6, 0.2, 1) },
        uCandle: { value: new THREE.Color(1, 0.6, 0.25) },
        uPortal: { value: new THREE.Color(0.6, 0.1, 0.3) },
        uPulse: { value: 0 },
        uStrobe: { value: 0 },
        uContent: { value: 0 },
        uContentCol: { value: new THREE.Color(1, 0.3, 0.1) },
        uContentMix: { value: 0 },
        uContentGain: { value: 1 },
        // side sections (|x| > 37.5) take their own LED colours
        uLedS: { value: new THREE.Color(1, 0.1, 0.05) },
        uLed2S: { value: new THREE.Color(0.1, 0.2, 1) },
        uAccentS: { value: new THREE.Color(1, 1, 1) },
        /** x castle-core level, y side-section level, z LED batten level, w horizontal outline battens */
        uRegion: { value: new THREE.Vector4(1, 1, 1, 0.35) },
        /** 0..1 window level (share of the windows lit) */
        uWinLvl: { value: 1 },
      },
    ]),
    vertexShader: LED_VERT,
    fragmentShader: LED_FRAG,
  });
}

const LED_VERT = /* glsl */ `
      attribute vec4 aLed;
      varying vec4 vLed;
      varying vec2 vUv;
      varying vec3 vWP;
      varying vec3 vN;
      #ifdef LED_OVERLAY
      attribute vec4 aAux;
      uniform float uPixel;
      uniform float uMinPx;
      uniform float uOverNear;
      uniform float uOverFloor;
      varying float vOverlay;
      varying float vFarO;
      #endif
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vLed = aLed;
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWP = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 mvPosition = viewMatrix * wp;
        #ifdef LED_OVERLAY
        {
          // far-field pass: battens / pixel dots / lenses never get thinner than uMinPx on screen
          // (camera-facing widening, pulled towards the camera so the wall does not bury them)
          float kind = aLed.z;
          float px = max(-mvPosition.z, 0.1) * uPixel;
          vec3 toCam = normalize(-mvPosition.xyz);
          vec3 nV = normalize(mat3(viewMatrix) * vN);
          float facing = dot(nV, toCam);
          float ratio = 1.0;
          if (kind < 0.5 || (kind > 6.5 && kind < 7.5)) {
            float hw = max(aAux.w, 1e-3);
            float extra = max(0.5 * uMinPx * px - hw, 0.0);
            vec3 dirV = normalize(mat3(viewMatrix) * aAux.xyz);
            vec3 side = cross(dirV, toCam);
            float sl = length(side);
            side = sl > 1e-4 ? side / sl : vec3(0.0, 1.0, 0.0);
            float sg = dot(side, cross(nV, dirV)) < 0.0 ? -1.0 : 1.0;
            mvPosition.xyz += side * (sg * (uv.y * 2.0 - 1.0) * extra) + toCam * (extra * 2.0);
            ratio = hw / (hw + extra);
          } else if (kind > 1.5 && kind < 2.5) {
            float hs = max(aAux.w, 1e-3);
            float extra = max(0.6 * uMinPx * px - hs, 0.0);
            mvPosition.xy += (uv * 2.0 - 1.0) * extra;
            mvPosition.xyz += toCam * (extra * 2.0);
            ratio = hs / (hs + extra);
          }
          // near: a faint extra glow above the haze; far: the minimum-width line carries the element
          vOverlay = mix(uOverNear, 1.0, 1.0 - ratio) * max(sqrt(ratio), uOverFloor) * step(-0.15, facing);
          vFarO = smoothstep(0.1, 0.7, 1.0 - ratio);
        }
        #endif
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`;

const LED_FRAG = /* glsl */ `
      uniform float uTime;
      uniform float uBeat;
      uniform float uKick;
      uniform float uPhase;
      uniform float uPattern;
      uniform vec3 uLed;
      uniform vec3 uLed2;
      uniform vec3 uAccent;
      uniform vec3 uWin;
      uniform float uWinMode;
      uniform vec3 uArcade;
      uniform vec3 uLamp;
      uniform vec3 uLantern;
      uniform vec3 uCandle;
      uniform vec3 uPortal;
      uniform float uPulse;
      uniform float uStrobe;
      uniform float uContent;
      uniform vec3 uContentCol;
      uniform float uContentMix;
      uniform float uContentGain;
      uniform vec3 uLedS;
      uniform vec3 uLed2S;
      uniform vec3 uAccentS;
      uniform vec4 uRegion;
      uniform float uWinLvl;
      varying vec4 vLed;
      varying vec2 vUv;
      varying vec3 vWP;
      varying vec3 vN;
      #ifdef LED_OVERLAY
      varying float vOverlay;
      varying float vFarO;
      #endif
      #include <common>
      #include <fog_pars_fragment>

      float h11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
      float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vnoise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
      }

      // pattern value for one pixel: returns colour. grp: 0 content colour, 1 accent (pilasters),
      // 2 horizontal outline (content colour at the outline level); sideW: 0 castle core .. 1 side sections
      vec3 ledPattern(float pid, float s, float strip, vec3 wp, float grp, float sideW) {
        vec3 led = mix(uLed, uLedS, sideW);
        vec3 acc = mix(uAccent, uAccentS, sideW);
        vec3 cA = grp > 0.5 && grp < 1.5 ? acc : led;
        vec3 cB = grp > 0.5 && grp < 1.5 ? acc * 0.6 : mix(uLed2, uLed2S, sideW);
        if (grp > 1.5) { cA *= uRegion.w; cB *= uRegion.w; }
        float pat = uPattern;
        vec3 c = cA;
        if (pat < 0.5) {
          c = cA;
        } else if (pat < 1.5) {
          // chase: bands sweep across the whole set and up each batten
          float k = fract(wp.x / 26.0 - uPhase + s * 0.035);
          float band = smoothstep(0.0, 0.08, k) * (1.0 - smoothstep(0.1, 0.42, k));
          c = mix(cB * 0.25, cA * 1.4, band);
        } else if (pat < 2.5) {
          float env = exp(-fract(uBeat) * 5.0);
          c = cA * (0.15 + 1.1 * env);
        } else if (pat < 3.5) {
          float tick = floor(uTime * 11.0);
          float r = h21(vec2(pid, tick));
          float r2 = h21(vec2(pid + 17.0, tick - 1.0));
          float on = step(0.86, r) + 0.45 * step(0.9, r2);
          // sparkle pixels flash towards white at the batten's own level (dark battens stay dark)
          c = mix(cA * 0.12, mix(cA, vec3(max(cA.r, max(cA.g, cA.b))), 0.45) * 1.8, clamp(on, 0.0, 1.0));
        } else if (pat < 4.5) {
          float swap = mod(floor(uBeat / 4.0), 2.0);
          float side = step(0.0, wp.x);
          c = mix(cA, cB, abs(side - swap));
        } else if (pat < 5.5) {
          // fire: flickering flames rising along each batten
          float n = vnoise(vec2(strip * 3.1, s * 1.6 - uTime * 4.0)) * 0.7 + vnoise(vec2(strip * 7.7, s * 4.0 - uTime * 9.0)) * 0.3;
          float hgt = clamp(wp.y / 11.0, 0.0, 1.0);
          float heat = clamp(n * 1.4 - hgt * 0.6, 0.0, 1.0);
          c = mix(cB * 0.2, mix(cA, vec3(1.0, 0.85, 0.5) * max(cA.r, max(cA.g, cA.b)), heat * heat), heat);
          c *= 0.4 + 1.2 * heat;
        } else if (pat < 6.5) {
          // wave: vertical sine sweep
          float v = 0.5 + 0.5 * sin(wp.y * 0.9 - uPhase * 6.2832 * 2.0 + wp.x * 0.06);
          c = mix(cB * 0.2, cA * 1.3, v * v);
        } else {
          // runes: blocky segments flip on the beat
          float seg = floor(s / 0.7);
          float on = step(0.5, h21(vec2(seg + strip * 13.0, floor(uBeat))));
          c = mix(cA * 0.06, cA * 1.5, on);
        }
        return c;
      }

      float fbm2(vec2 p) { return vnoise(p) * 0.55 + vnoise(p * 2.03 + 7.1) * 0.3 + vnoise(p * 4.1 + 3.3) * 0.15; }

      // procedural LED content on a panel; p = local metres (x from the left edge, y from the bottom), size = w,h
      vec3 panelContent(vec2 p, vec2 size) {
        float m = uContent;
        vec2 c = p - size * 0.5;
        vec3 col = uContentCol;
        if (m < 1.5) {
          return col * 1.2;
        } else if (m < 2.5) {
          // fire rising from the bottom
          float n = fbm2(vec2(p.x * 1.4, p.y * 0.9 - uTime * 2.2));
          float hgt = p.y / size.y;
          float heat = clamp(n * 1.5 - hgt * 1.05 + 0.25, 0.0, 1.0);
          vec3 fire = mix(vec3(0.35, 0.01, 0.0), mix(vec3(1.0, 0.25, 0.01), vec3(1.0, 0.62, 0.14), heat), heat);
          return fire * (0.12 + 1.7 * heat * heat);
        } else if (m < 3.5) {
          // ice: slow crystalline cells + glints
          vec2 q = p * 1.6;
          vec2 i = floor(q);
          float cell = h21(i);
          float glint = step(0.93, h21(i + floor(uTime * 3.0)));
          float edge = min(fract(q.x), fract(q.y));
          vec3 ice = mix(vec3(0.05, 0.25, 0.6), vec3(0.6, 0.9, 1.0), cell);
          return ice * (0.4 + 0.6 * smoothstep(0.0, 0.08, edge)) * 0.9 + vec3(glint) * 2.0;
        } else if (m < 4.5) {
          // runes: glyph cells toggling on the beat
          vec2 g = vec2(0.42, 0.55);
          vec2 i = floor(p / g);
          vec2 f = fract(p / g);
          float on = step(0.45, h21(i + vec2(floor(uBeat), 3.0)));
          float stroke = step(0.35, h21(floor(f * vec2(3.0, 4.0)) + i * 7.0));
          float inset = step(0.12, f.x) * step(f.x, 0.88) * step(0.1, f.y) * step(f.y, 0.9);
          return col * on * stroke * inset * 1.6;
        } else if (m < 5.5) {
          // logo: an original shield outline with a pulsing core (no official marks)
          vec2 d = c / (size.x * 0.42);
          float shield = max(abs(d.x) - 0.8, d.y - 0.9);
          shield = max(shield, length(vec2(d.x, max(d.y + 0.2, 0.0) * 0.0 + min(d.y + 0.2, 0.0))) - 0.95);
          float ring = 1.0 - smoothstep(0.0, 0.06, abs(shield));
          float core = 1.0 - smoothstep(0.1, 0.35, length(d - vec2(0.0, 0.05)));
          return col * (ring * 1.6 + core * (0.8 + 0.6 * exp(-fract(uBeat) * 4.0)));
        } else if (m < 6.5) {
          // title: bright bars scrolling upwards
          float b = step(0.55, fract(p.y * 1.2 - uTime * 0.8));
          return col * b * 1.3;
        } else if (m < 7.5) {
          // eye: almond eye with a slit pupil that slowly looks around
          vec2 d = c / (size.x * 0.46);
          float lid = abs(d.y) - 0.55 * (1.0 - d.x * d.x);
          float eyeMask = 1.0 - smoothstep(-0.02, 0.02, lid);
          vec2 look = vec2(sin(uTime * 0.7) * 0.25, sin(uTime * 0.43) * 0.08);
          float iris = 1.0 - smoothstep(0.26, 0.3, length(d - look));
          float pupil = 1.0 - smoothstep(0.035, 0.06, abs(d.x - look.x)) * (1.0 - step(0.26, length(d - look)));
          vec3 e = mix(vec3(1.0, 0.85, 0.6) * 0.8, col * 1.8, iris);
          e *= mix(1.0, 0.05, iris * (1.0 - smoothstep(0.035, 0.06, abs(d.x - look.x))));
          vec3 glow = col * 0.25 * (1.0 - smoothstep(0.0, 0.6, lid));
          return e * eyeMask + glow * (1.0 - eyeMask);
        } else if (m < 8.5) {
          // embers: sparse sparks drifting up
          vec2 q = vec2(p.x * 3.0, p.y * 2.0 - uTime * 1.2);
          vec2 i = floor(q);
          vec2 f = fract(q) - 0.5;
          float r = h21(i);
          float spark = step(0.8, r) * (1.0 - smoothstep(0.05, 0.14, length(f + (vec2(h21(i + 3.1), h21(i + 7.7)) - 0.5) * 0.6)));
          return mix(vec3(1.0, 0.45, 0.05), vec3(1.0, 0.9, 0.5), r) * spark * 2.5 + vec3(0.25, 0.03, 0.0) * (1.0 - p.y / size.y);
        }
        return col * (0.15 + 1.4 * exp(-fract(uBeat) * 5.0));
      }

      void main() {
        float kind = vLed.z;
        float s = vLed.x;
        float strip = vLed.y;
        float rnd = vLed.w;
        vec3 col = vec3(0.0);
        float pulse = 1.0 + uPulse * 1.2;
        // region: castle core (|x| < 37.5) vs side sections / arms
        float sideW = smoothstep(37.3, 38.3, abs(vWP.x));
        float regG = mix(uRegion.x, uRegion.y, sideW);
        if (kind < 0.5 || (kind > 6.5 && kind < 7.5)) {
          // pixel batten or dots
          float pitch = kind < 0.5 ? 0.1 : 0.3;
          float q = s / pitch;
          float pid = floor(q) + strip * 1000.0;
          float f = fract(q);
          float fw = fwidth(q);
          float m;
          if (kind < 0.5) {
            m = smoothstep(0.0, 0.18, f) * smoothstep(1.0, 0.82, f);
            float across = 1.0 - smoothstep(0.25, 0.5, abs(vUv.y - 0.5));
            m *= across;
          } else {
            vec2 d = vec2(f - 0.5, (vUv.y - 0.5) * 1.0);
            m = 1.0 - smoothstep(0.18, 0.36, length(d));
          }
          m = mix(m, 0.55, clamp(fw * 1.5 - 0.3, 0.0, 1.0));
          col = ledPattern(pid, s, strip, vWP, rnd, sideW) * m * pulse;
          #ifdef LED_OVERLAY
          // far away a chase / sparkle averages over many pixels: keep a steady outline level
          vec3 steady = rnd > 0.5 && rnd < 1.5 ? mix(uAccent, uAccentS, sideW) : mix(uLed, uLedS, sideW) * (rnd > 1.5 ? uRegion.w : 1.0);
          col = max(col, steady * 0.45 * m * vFarO);
          #endif
          col *= uRegion.z;
        } else if (kind < 1.5) {
          // window: a dim pane with two vertical LED tubes standing in the opening (the "window bars"
          // of the real set) + per-window variation / flicker. Only a share of the windows is lit at
          // mid levels, so the castle reads as a dark set with sparse practicals, not a lit palace.
          float g = 0.05 + 0.06 * (1.0 - vUv.y);
          float bx = abs(abs(vUv.x - 0.5) - 0.2);
          float fwx = fwidth(vUv.x) * 1.5;
          float tube = 1.0 - smoothstep(0.045, 0.045 + fwx + 0.01, bx);
          tube *= smoothstep(0.04, 0.1, vUv.y) * (1.0 - smoothstep(0.66, 0.74, vUv.y));
          // far away the tubes average out: keep their mean light instead of shimmering
          tube = mix(tube, 0.11, clamp(fwx * 4.0 - 0.5, 0.0, 1.0));
          float bars = g + 1.5 * tube;
          float lit = smoothstep(rnd - 0.12, rnd + 0.12, 0.25 + 0.85 * uWinLvl);
          float var = (0.75 + 0.5 * rnd) * lit;
          float mode = uWinMode;
          if (mode > 0.5 && mode < 1.5) {
            // fire flicker
            var *= 0.55 + 0.6 * vnoise(vec2(rnd * 91.0, uTime * 7.0)) + 0.25 * vnoise(vec2(rnd * 13.0, uTime * 17.0));
          } else if (mode > 1.5 && mode < 2.5) {
            // frozen shimmer
            var *= 0.8 + 0.35 * vnoise(vec2(rnd * 50.0 + vUv.x * 6.0, vUv.y * 8.0 + uTime * 0.6));
          } else if (mode > 2.5) {
            // embers: slow breathing, some windows dark
            var *= step(0.35, rnd) * (0.4 + 0.6 * (0.5 + 0.5 * sin(uTime * 1.3 + rnd * 20.0)));
          }
          // windows act as big pixels of the facade mapping
          float wp = 1.0;
          float pat = uPattern;
          if (pat > 0.5 && pat < 1.5) {
            float k = fract(vWP.x / 26.0 - uPhase);
            wp = 0.55 + 0.75 * smoothstep(0.0, 0.1, k) * (1.0 - smoothstep(0.12, 0.45, k));
          } else if (pat > 1.5 && pat < 2.5) {
            wp = 0.65 + 0.5 * exp(-fract(uBeat) * 4.0);
          } else if (pat > 2.5 && pat < 3.5) {
            wp = 0.6 + 0.9 * step(0.82, h21(vec2(rnd * 131.0, floor(uTime * 4.0))));
          } else if (pat > 3.5 && pat < 4.5) {
            float swap = mod(floor(uBeat / 4.0), 2.0);
            wp = mix(1.15, 0.45, abs(step(0.0, vWP.x) - swap));
          }
          col = uWin * bars * var * wp * pulse;
        } else if (kind < 2.5) {
          float r = length(vUv - 0.5) * 2.0;
          float core = 1.0 - smoothstep(0.35, 1.0, r);
          // front-line fixtures follow the LED pattern: chase band / kick pulse / twinkle
          float le = 1.0;
          float pat = uPattern;
          if (pat > 0.5 && pat < 1.5) {
            float k = fract(vWP.x / 26.0 - uPhase);
            le = 0.25 + 1.2 * smoothstep(0.0, 0.08, k) * (1.0 - smoothstep(0.1, 0.35, k));
          } else if (pat > 1.5 && pat < 2.5) {
            le = 0.2 + 1.1 * exp(-fract(uBeat) * 5.0);
          } else if (pat > 2.5 && pat < 3.5) {
            le = 0.3 + 1.2 * step(0.8, h21(vec2(rnd * 97.0, floor(uTime * 6.0))));
          }
          col = uLamp * (0.35 + 2.4 * core) * le * pulse;
        } else if (kind < 3.5) {
          float facet = 0.55 + 0.45 * abs(dot(normalize(vN), normalize(vec3(0.4, 0.3, 0.86))));
          float core = 1.0 - smoothstep(0.0, 0.5, abs(vUv.y - 0.5));
          col = uLantern * facet * (0.7 + 0.8 * core) * pulse;
        } else if (kind < 4.5) {
          float fl = 0.8 + 0.2 * sin(uTime * 13.0 + rnd * 40.0) * sin(uTime * 7.3 + rnd * 11.0);
          float r = length(vUv - 0.5) * 2.0;
          col = uCandle * fl * (1.0 - smoothstep(0.2, 1.0, r)) * 3.0;
        } else if (kind < 5.5) {
          float g = mix(1.25, 0.25, clamp(vUv.y, 0.0, 1.0));
          col = uArcade * g * (0.85 + 0.3 * rnd) * pulse;
        } else if (kind < 6.5) {
          float g = 1.0 - smoothstep(0.0, 0.9, length((vUv - vec2(0.5, 0.0)) * vec2(1.2, 1.6)));
          col = uPortal * (0.04 + 0.5 * g * g) * pulse;
        } else if (kind < 8.5) {
          float scan = 0.85 + 0.15 * sin(vUv.y * 60.0);
          col = vec3(0.25, 0.7, 1.0) * 0.9 * scan;
        } else if (kind < 9.5) {
          float g = mix(0.9, 0.05, clamp(vUv.y * 1.3, 0.0, 1.0));
          col = uArcade * 0.16 * g * pulse;
        } else {
          // LED panel over a printed banner: dissolves in/out (screen-door), discarded when off
          float d = h21(floor(gl_FragCoord.xy));
          if (uContent < 0.5 || d >= uContentMix) discard;
          vec2 size = vec2(max(0.01, vLed.w), max(0.01, strip));
          vec2 p = vec2(vUv.x * size.x, vUv.y * size.y);
          // LED module grid (5 cm pitch)
          vec2 f = fract(p / 0.05);
          float grid = smoothstep(0.0, 0.2, f.x) * smoothstep(1.0, 0.8, f.x) * smoothstep(0.0, 0.2, f.y) * smoothstep(1.0, 0.8, f.y);
          grid = mix(grid, 0.6, clamp(fwidth(p.x / 0.05) - 0.4, 0.0, 1.0));
          col = panelContent(p, size) * (0.35 + 0.65 * grid) * pulse * uContentGain;
        }
        col += vec3(uStrobe) * 3.0 * step(kind, 0.5) * uRegion.z;
        col *= regG;
        #ifdef LED_OVERLAY
        col *= vOverlay;
        if (max(col.r, max(col.g, col.b)) < 1e-4) discard;
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
        #ifdef USE_FOG
        // additive pass: fog only attenuates (no in-scatter added twice)
        gl_FragColor.rgb = col * (1.0 - fogFactor);
        #endif
        #else
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
        #endif
      }`;

/**
 * Far-field / above-the-haze pass of the point and line emitters (LED battens, pixel dots, fixture
 * lenses, crystal lanterns): drawn additively AFTER the haze sprites (renderOrder 12 > haze 10), with
 * a minimum on-screen width, so the U of lamp rows, battens and lanterns reads from the back of the
 * field and from the drone instead of dissolving into sub-pixel aliasing and haze. Shares the uniform
 * objects of the main LED material (one resolve per frame drives both).
 */
export function createLedOverlayMaterial(main: THREE.ShaderMaterial): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'stage-led-overlay',
    fog: true,
    defines: { LED_OVERLAY: '' },
    uniforms: {
      ...main.uniforms,
      uPixel: { value: 0.002 },
      uMinPx: { value: 2 },
      uOverNear: { value: 0.3 },
      uOverFloor: { value: 0.5 },
    },
    vertexShader: LED_VERT,
    fragmentShader: LED_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
}
