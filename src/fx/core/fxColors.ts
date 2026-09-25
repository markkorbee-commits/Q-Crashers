import * as THREE from 'three';
import type { ResolvedPalette } from '../../show/ShowEngine';
import { resolveColor } from '../../show/colors';

/**
 * Pyrotechnic colour mapping. Cue colours name the *intent* ("red", "gold", "primary"); burning metal
 * salts emit characteristic spectra, so named colours map onto real star chemistry (linear RGB, the
 * brightness is carried by the HDR intensity separately):
 *   strontium red, barium green, copper blue (weak, deep), sodium / charcoal gold, titanium /
 *   magnesium white "silver", strontium + copper purple.
 */
const STAR: Record<string, [number, number, number]> = {
  red: [1.0, 0.075, 0.035],
  deepred: [1.0, 0.03, 0.02],
  blood: [0.9, 0.02, 0.015],
  orange: [1.0, 0.36, 0.06],
  amber: [1.0, 0.52, 0.12],
  gold: [1.0, 0.6, 0.2],
  fire: [1.0, 0.33, 0.06],
  white: [1.0, 0.96, 0.9],
  silver: [0.92, 0.95, 1.0],
  warm: [1.0, 0.82, 0.6],
  cold: [0.78, 0.88, 1.0],
  ice: [0.6, 0.82, 1.0],
  blue: [0.12, 0.26, 1.0],
  deepblue: [0.05, 0.1, 0.9],
  cyan: [0.2, 0.9, 1.0],
  green: [0.28, 1.0, 0.22],
  lime: [0.6, 1.0, 0.15],
  purple: [0.55, 0.14, 1.0],
  magenta: [1.0, 0.12, 0.62],
  pink: [1.0, 0.3, 0.62],
  uv: [0.35, 0.1, 1.0],
};

/** brightness multipliers per chemistry (copper blue is famously dim, white is the brightest) */
const STAR_GAIN: Record<string, number> = { blue: 0.75, deepblue: 0.6, purple: 0.8, uv: 0.7, white: 1.25, silver: 1.2, gold: 1.1 };

/** Resolve a cue colour to a firework star colour. Returns the brightness gain. */
export function starColor(spec: unknown, palette: ResolvedPalette, out: THREE.Color, fallback: string): number {
  const s = typeof spec === 'string' && spec.length ? spec : fallback;
  const named = STAR[s];
  if (named) {
    out.setRGB(named[0], named[1], named[2]);
    return STAR_GAIN[s] ?? 1;
  }
  resolveColor(s, palette, out, 'primary');
  return saturateForLight(out);
}

/** Resolve a cue colour for flames / lit smoke / generic emitters (named = design colours). */
export function fxColor(spec: unknown, palette: ResolvedPalette, out: THREE.Color, fallback: string): THREE.Color {
  const s = typeof spec === 'string' && spec.length ? spec : fallback;
  if (s === 'silver') return out.setRGB(0.92, 0.95, 1.0);
  resolveColor(s, palette, out, 'primary');
  return out;
}

/** normalise a colour so its max channel is 1 (light sources carry intensity separately) */
export function saturateForLight(c: THREE.Color): number {
  const m = Math.max(c.r, c.g, c.b, 1e-4);
  c.multiplyScalar(1 / m);
  return 1;
}

/** Parse a palette list param ("red,gold" or ["red","gold"]) */
export function colorList(v: unknown, fallback: string[]): string[] {
  if (Array.isArray(v)) {
    const out = v.filter((x): x is string => typeof x === 'string' && x.length > 0);
    return out.length ? out : fallback;
  }
  if (typeof v === 'string' && v.length) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return fallback;
}

export function num(v: unknown, def: number, lo = -Infinity, hi = Infinity): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  if (!Number.isFinite(n)) return def;
  return n < lo ? lo : n > hi ? hi : n;
}

export function str(v: unknown, def: string): string {
  return typeof v === 'string' && v.length ? v : def;
}

export function bool(v: unknown, def: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 1) return true;
  if (v === 'false' || v === 0) return false;
  return def;
}
