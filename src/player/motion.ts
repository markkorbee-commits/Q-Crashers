/** Small allocation-free motion helpers shared by the player, avatar and camera rig. */

const TAU = Math.PI * 2;

/**
 * Smooth zero-mean pseudo noise in roughly [-1, 1]: three incommensurate sines, so it never
 * visibly repeats and its integral stays bounded (drift built from it does not wander off).
 */
export function wobble(t: number, seed = 0): number {
  const s = seed * 1.618;
  return Math.sin(t + s * 3.1) * 0.5 + Math.sin(t * 2.137 + s * 5.7) * 0.3 + Math.sin(t * 4.271 + s * 9.3) * 0.2;
}

/** Wrap an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

/** Move angle `a` towards `b` by fraction `k` along the shortest arc. */
export function approachAngle(a: number, b: number, k: number): number {
  return a + wrapAngle(b - a) * k;
}

/** Frame-rate independent exponential smoothing factor for a response `rate` (1/s). */
export function damp(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

/** Symmetric ease (smoothstep-ish, C1) of x in [0, 1]. */
export function easeInOut(x: number): number {
  x = x < 0 ? 0 : x > 1 ? 1 : x;
  return x * x * (3 - 2 * x);
}

/** Gentle ease that keeps some constant velocity (for camera dollies that never fully stop). */
export function easeDolly(x: number): number {
  return 0.35 * x + 0.65 * easeInOut(x);
}
