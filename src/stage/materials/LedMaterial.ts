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
} as const;

/**
 * Pixel-mapped LED / emissive material for everything that glows on the castle and side sections.
 * Pure function of the uniforms (show time, beat, look) -> deterministic and seek safe.
 * Output is scene-referred HDR (values > 1 bloom in the post pipeline).
 */
export function createLedMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
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
      },
    ]),
    vertexShader: /* glsl */ `
      attribute vec4 aLed;
      varying vec4 vLed;
      varying vec2 vUv;
      varying vec3 vWP;
      varying vec3 vN;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vLed = aLed;
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWP = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
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
      varying vec4 vLed;
      varying vec2 vUv;
      varying vec3 vWP;
      varying vec3 vN;
      #include <common>
      #include <fog_pars_fragment>

      float h11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
      float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vnoise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
      }

      // pattern value for one pixel: returns colour
      vec3 ledPattern(float pid, float s, float strip, vec3 wp, float grp) {
        vec3 cA = grp > 0.5 ? uAccent : uLed;
        vec3 cB = grp > 0.5 ? uAccent * 0.6 : uLed2;
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
          c = mix(cA * 0.12, mix(cA, vec3(1.0), 0.45) * 1.8, clamp(on, 0.0, 1.0));
        } else if (pat < 4.5) {
          float swap = mod(floor(uBeat / 4.0), 2.0);
          float side = step(0.0, wp.x);
          c = mix(cA, cB, abs(side - swap));
        } else if (pat < 5.5) {
          // fire: flickering flames rising along each batten
          float n = vnoise(vec2(strip * 3.1, s * 1.6 - uTime * 4.0)) * 0.7 + vnoise(vec2(strip * 7.7, s * 4.0 - uTime * 9.0)) * 0.3;
          float hgt = clamp(wp.y / 11.0, 0.0, 1.0);
          float heat = clamp(n * 1.4 - hgt * 0.6, 0.0, 1.0);
          c = mix(cB * 0.2, mix(cA, vec3(1.0, 0.85, 0.5), heat * heat), heat);
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

      void main() {
        float kind = vLed.z;
        float s = vLed.x;
        float strip = vLed.y;
        float rnd = vLed.w;
        vec3 col = vec3(0.0);
        float pulse = 1.0 + uPulse * 1.2;
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
          col = ledPattern(pid, s, strip, vWP, rnd) * m * pulse;
        } else if (kind < 1.5) {
          // window pane: glow brightest low-centre, tracery bars, per-window variation / flicker
          float g = 0.7 + 0.45 * (1.0 - vUv.y) * (1.0 - abs(vUv.x - 0.5) * 1.2);
          float bars = 1.0;
          float bx = abs(vUv.x - 0.5);
          bars *= smoothstep(0.018, 0.035, bx);
          float by = fract(vUv.y * 3.0);
          bars *= mix(1.0, smoothstep(0.0, 0.05, by) * smoothstep(1.0, 0.95, by), 0.85);
          float var = 0.75 + 0.5 * rnd;
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
          col = uWin * g * mix(0.25, 1.0, bars) * var * pulse;
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
        } else {
          float g = mix(0.9, 0.05, clamp(vUv.y * 1.3, 0.0, 1.0));
          col = uArcade * 0.16 * g * pulse;
        }
        col += vec3(uStrobe) * 3.0 * step(kind, 0.5);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
  });
}
