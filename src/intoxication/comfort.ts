/** URL names of the comfort (reduced motion) switch: the perception system's and the player's */
const COMFORT_PARAMS = ['reducedmotion', 'reducemotion', 'comfort'] as const;
const OFF = new Set(['0', 'false', 'off', 'no']);

/**
 * Reduced motion from the URL, read the same way by the PerceptionSystem and the PlayerController:
 * true when any of ?reducedmotion / ?reducemotion / ?comfort is present with a value that is not
 * 0 / false / off / no (a bare `&comfort` counts as on, and an appended `&reducemotion=1` wins over an
 * earlier `reducemotion=0`); false when they are present but all off; null when none is given.
 */
export function comfortFromParams(p: URLSearchParams): boolean | null {
  let seen = false;
  for (const k of COMFORT_PARAMS) {
    for (const v of p.getAll(k)) {
      seen = true;
      if (!OFF.has(v.trim().toLowerCase())) return true;
    }
  }
  return seen ? false : null;
}
