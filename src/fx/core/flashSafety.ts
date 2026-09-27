/**
 * Photosensitivity option ("Reduce flashing", `App.reduceFlashing`, set by the UI) as seen by the show engine.
 *
 * Target with the option on: no full-screen or large-area luminance change of 10 % or more repeats faster than
 * CALM_MAX_HZ, and no saturated red flashing. Every flicker source then either holds its average (a steady
 * level instead of a strobe), slows to a shimmer of at most CALM_MAX_HZ with a smaller depth, or softens its
 * onset (bursts swell in over ~0.1 s instead of stepping). With the option off nothing changes: the calm paths
 * are separate branches, the original arithmetic is untouched.
 *
 * The flag is mirrored here once per frame by the systems that hold the App (CueFxSystem, FxShared's frame hook,
 * LaserSystem), so code without an App at hand — the stage look resolver, the LED material — follows it too.
 * The GLSL side reads `uCalm` (0 / 1): FxShared puts CALM_UNIFORM into every particle material, the LED
 * material shares the same object.
 */

/** highest flash rate (Hz) of any large-area luminance change while the option is on */
export const CALM_MAX_HZ = 3;

/** shared `uCalm` uniform object (0 = off, 1 = on); materials reference it, never copy it */
export const CALM_UNIFORM: { value: number } = { value: 0 };

let calm = false;

/** mirror App.reduceFlashing (call once per frame from a system that holds the App); returns the flag */
export function syncFlashCalm(app: { reduceFlashing?: boolean }): boolean {
  const on = app.reduceFlashing === true;
  if (on !== calm) {
    calm = on;
    CALM_UNIFORM.value = on ? 1 : 0;
  }
  return on;
}

/** the option as last mirrored (false until a system synced it) */
export function flashCalm(): boolean {
  return calm;
}

/**
 * Pulses per beat that keep a beat-locked on/off pattern at or below CALM_MAX_HZ at `bpm` (the show's
 * tempo is 100-170 bpm: 1 pulse per beat always fits, 16ths never do).
 */
export function calmPulsesPerBeat(ratePerBeat: number, bpm: number): number {
  const maxPerBeat = (CALM_MAX_HZ * 60) / Math.max(40, bpm);
  if (ratePerBeat <= maxPerBeat) return ratePerBeat;
  // the largest musical subdivision (1, 1/2, 1/4 pulse per beat) that fits
  let r = 1;
  while (r > maxPerBeat && r > 0.125) r *= 0.5;
  return r;
}
