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

/**
 * `?calm` / `?reduceflashing` force "Reduce flashing" on for this visit (a link a photosensitive viewer can
 * share or bookmark). Kept in memory only: the stored choice is untouched, and a later switch in Help or
 * Quality still saves as usual. `?reduceflashing=0` (or false / off) does not force anything.
 */
export const calmForced = (() => {
  try {
    const q = new URLSearchParams(location.search);
    const v = q.has('calm') ? q.get('calm') : q.has('reduceflashing') ? q.get('reduceflashing') : null;
    return v !== null && !/^(0|false|off|no)$/i.test(v);
  } catch {
    return false;
  }
})();

/**
 * Has the viewer answered the photosensitivity warning (either way) on this device? The OS
 * reduced-motion default does not count as an answer.
 */
export function flashingAnswered(): boolean {
  return store.get('dq26.reduceFlashing') !== null;
}

export const prefs: Prefs = {
  lookSensitivity: num('dq26.lookSensitivity', 1, 0.3, 2.5),
  invertY: store.get('dq26.invertY') === '1',
  fov: num('dq26.fov', 0, 0, 100),
  touchLook: num('dq26.touchLook', 1, 0.4, 2.5),
  // default ON for people who asked their OS for reduced motion; a ?calm link forces it on
  reduceFlashing: calmForced || (rf === null ? reducedMotion : rf === '1'),
};

export function savePref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  prefs[key] = value;
  store.set(`dq26.${key}`, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
}
