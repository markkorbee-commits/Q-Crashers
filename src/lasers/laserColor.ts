import type * as THREE from 'three';

/**
 * RGB diode laser colour model.
 *
 * Show projectors mix three diodes: 638 nm red, 520 nm green and 450 nm blue (FACT, general
 * physics; research/production-analysis.md §5.1). Monochromatic light lies outside sRGB, so on
 * camera the primaries read as hyper-saturated: red with no orange, a slightly cyan-leaning green
 * and a royal blue / violet blue. Every requested cue colour is re-expressed as a mix of these
 * primaries (in linear working space), which keeps "gold", "cyan", "magenta" etc. pure while
 * white stays (slightly cool / lavender) white.
 *
 * Round 7: 450 nm lies below the sRGB blue primary; in linear sRGB it has a NEGATIVE green part (about
 * -0.1 of its blue, CIE 1931), which cancels the faint green of a blue cue mix (#2040FF, #2A60FF) instead of
 * turning it periwinkle. The official video's blue laser haze is a pure royal blue (Embers mean sRGB of the
 * blue areas ≈ [0, 5, 123] at v1120.5, ours was [21, 28, 112]); the red part the camera shows is ~0.
 */
const RED = [1.0, 0.012, 0.004]; // 638 nm
const GREEN = [0.0, 1.0, 0.17]; // 520 nm
/** 450 nm, unclipped (G < 0; mutable only for side-by-side calibration: LaserSystem.tune.blueR / blueG) */
export const LASER_BLUE = [0.0, -0.09, 1.0];
const BLUE = LASER_BLUE;

/**
 * Convert a resolved (linear) colour into a laser mix. `out` may be `c` itself.
 * The mix is normalised to max channel 1, then scaled by a perceptual compensation so that pure
 * blue / red beams (low luminance per watt on screen) still read as strongly as green ones —
 * the way they do on festival footage.
 */
export function laserize(c: THREE.Color, out: THREE.Color): THREE.Color {
  const m = Math.max(c.r, c.g, c.b, 1e-5);
  const lo = Math.min(c.r, c.g, c.b);
  // saturation boost without hue shift: remove most of the white component of the drive levels
  const w = lo * 0.6;
  const k0 = 1 / Math.max(1e-5, m - w);
  let r = (c.r - w) * k0;
  let g = (c.g - w) * k0;
  let b = (c.b - w) * k0;
  // below the diode threshold a real projector would not light that colour at all
  r = r < 0.05 ? 0 : r;
  g = g < 0.05 ? 0 : g;
  b = b < 0.05 ? 0 : b;
  let R = r * RED[0] + g * GREEN[0] + b * BLUE[0];
  let G = r * RED[1] + g * GREEN[1] + b * BLUE[1];
  let B = r * RED[2] + g * GREEN[2] + b * BLUE[2];
  // (the negative green of the blue diode clips at 0 on screen)
  R = Math.max(0, R);
  G = Math.max(0, G);
  B = Math.max(0, B);
  const k = 1 / Math.max(R, G, B, 1e-5);
  R *= k;
  G *= k;
  B *= k;
  const lum = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const comp = Math.pow(Math.min(4, Math.max(0.75, 0.55 / Math.max(lum, 1e-3))), 0.55);
  out.r = R * comp;
  out.g = G * comp;
  out.b = B * comp;
  return out;
}
