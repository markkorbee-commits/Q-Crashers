import * as THREE from 'three';
import type { ResolvedPalette } from './ShowEngine';

/** Named show colours (linear-ish sRGB hex). Keep in sync with research/design-bible.md. */
export const NAMED_COLORS: Record<string, string> = {
  red: '#ff1206',
  deepred: '#b00000',
  blood: '#7a0000',
  orange: '#ff6a00',
  amber: '#ffa21a',
  gold: '#ffc23a',
  fire: '#ff4a0a',
  white: '#ffffff',
  warm: '#ffe2b8',
  cold: '#cfe6ff',
  ice: '#9fd8ff',
  blue: '#1f4dff',
  deepblue: '#0a1f8f',
  cyan: '#12e8ff',
  green: '#12ff4a',
  lime: '#9dff12',
  purple: '#8a1cff',
  magenta: '#ff1ab8',
  pink: '#ff4fa3',
  uv: '#5a12ff',
};

/**
 * Resolve a cue colour spec: 'primary' | 'secondary' | 'accent' | named colour | '#hex'.
 * Writes into `out` (no allocation).
 */
export function resolveColor(spec: unknown, palette: ResolvedPalette, out: THREE.Color, fallback: 'primary' | 'secondary' | 'accent' = 'primary'): THREE.Color {
  if (typeof spec !== 'string' || spec.length === 0) return out.copy(palette[fallback]);
  if (spec === 'primary' || spec === 'secondary' || spec === 'accent') return out.copy(palette[spec]);
  const named = NAMED_COLORS[spec];
  if (named) return out.set(named);
  if (spec[0] === '#') return out.set(spec);
  return out.copy(palette[fallback]);
}
