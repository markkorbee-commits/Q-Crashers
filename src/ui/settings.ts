import { store } from './dom';

/**
 * Viewer preferences shared by the UI and the touch controls (saved in dq26.* storage).
 * Plain mutable object: readers look at it when they need a value (no per-frame work).
 */
export interface Prefs {
  /** mouse look speed multiplier (0.3 .. 2.5) */
  lookSensitivity: number;
  /** invert vertical look (mouse and touch) */
  invertY: boolean;
  /** eye field of view in degrees (first / third person / free) */
  fov: number;
  /** touch swipe-look speed multiplier (0.4 .. 2.5) */
  touchLook: number;
  /** photosensitivity: damp strobes, blinders and flashes */
  reduceFlashing: boolean;
}

const num = (key: string, def: number, lo: number, hi: number): number => {
  const v = parseFloat(store.get(key) ?? '');
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def;
};

const reducedMotion = (() => {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
})();

const rf = store.get('dq26.reduceFlashing');

export const prefs: Prefs = {
  lookSensitivity: num('dq26.lookSensitivity', 1, 0.3, 2.5),
  invertY: store.get('dq26.invertY') === '1',
  fov: num('dq26.fov', 0, 0, 100),
  touchLook: num('dq26.touchLook', 1, 0.4, 2.5),
  // default ON for people who asked their OS for reduced motion
  reduceFlashing: rf === null ? reducedMotion : rf === '1',
};

export function savePref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  prefs[key] = value;
  store.set(`dq26.${key}`, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
}
