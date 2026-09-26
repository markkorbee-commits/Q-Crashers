import { DIST, F } from '../fx/core/Emitter';
import { FW_SWIM } from './starShader';

/**
 * Shell (star burst) recipes. Radii and burn times follow display-firework practice: stars leave the
 * break at 30-60 m/s, air drag (k ~ 1.5-2.8 1/s) stops them at roughly the burst radius, gravity pulls
 * them down at the terminal speed g/k. Trails are the glowing path over the last `trail` seconds.
 *
 * Look reference (official Endshow video, finale v1287-1311 and the canopies): display stars are
 * small bright points with thin tails and a lot of dark sky between them — never a solid ball. So
 * the heads stay small (0.2-0.3 m), tails are thin and dim relative to the head, and the textured
 * types (crackle, strobe, brocade, glitter) are sparse: few stars, the texture comes from the
 * crackle / flitter / strobe on top.
 */
export interface ShellSpec {
  stars: number;
  minStars: number;
  dist: number;
  drag: number;
  burn: [number, number];
  /** trail length (s) */
  trail: number;
  glitter: number;
  /** head radius (m) */
  head: number;
  /** tail width factor */
  tailW: number;
  flags: number;
  /** gravity (m/s^2, negative = down) */
  grav: number;
  trailGain: number;
  /** extra sag of dropped glitter (m/s^2) */
  droop: number;
  intensity: number;
  color: string;
  /** burst radius relative to the default (0.33 * height, see defaultRadius in FireworkSystem) */
  radiusK: number;
  jitter: number;
  hz?: number;
  /** crossette split time (s) */
  split?: number;
  /** crackle pops per star */
  pops?: number;
  /** crackle: seconds over which a star's pops go off after it dies */
  popSpread?: number;
  /** flitter sparks each star sheds along its path (glitter / brocade texture), 0 = none */
  shed?: number;
  /** swimmer wander amplitude (m) and frequency (rad/s) */
  swim?: number;
  swimHz?: number;
  /** trail drift (wavy tails), m/s */
  wave?: number;
  /** lift tail brightness (palms have a heavy rising "trunk") */
  liftGain: number;
  /** env flash multiplier */
  flash: number;
  /** break-flash size multiplier (textured shells have almost no glow ball) */
  flashSize?: number;
}

export const SHELLS: Record<string, ShellSpec> = {
  peony: {
    stars: 110, minStars: 28, dist: DIST.SPHERE, drag: 1.9, burn: [1.3, 1.9], trail: 0.12, glitter: 0, head: 0.3, tailW: 0.45,
    flags: F.FLICKER, grav: -9.81, trailGain: 0.3, droop: 0, intensity: 22, color: 'red', radiusK: 1, jitter: 0.1, liftGain: 1, flash: 1,
  },
  chrysanthemum: {
    stars: 120, minStars: 30, dist: DIST.SPHERE, drag: 1.7, burn: [1.6, 2.2], trail: 0.7, glitter: 0.45, head: 0.26, tailW: 0.32,
    flags: F.COOL | F.FLICKER, grav: -9.81, trailGain: 0.22, droop: 2, intensity: 18, color: 'gold', radiusK: 1, jitter: 0.1, liftGain: 1, flash: 1,
  },
  dahlia: {
    stars: 44, minStars: 18, dist: DIST.SPHERE, drag: 1.35, burn: [1.8, 2.4], trail: 0.3, glitter: 0, head: 0.5, tailW: 0.55,
    flags: F.FLICKER, grav: -9.81, trailGain: 0.35, droop: 0, intensity: 30, color: 'red', radiusK: 0.85, jitter: 0.14, liftGain: 1, flash: 1,
  },
  willow: {
    stars: 70, minStars: 24, dist: DIST.SPHERE, drag: 2.8, burn: [3.4, 4.6], trail: 2.8, glitter: 0.75, head: 0.2, tailW: 0.55,
    flags: F.COOL, grav: -12, trailGain: 0.38, droop: 3.5, intensity: 10, color: 'gold', radiusK: 0.9, jitter: 0.12, liftGain: 1.2, flash: 0.7,
  },
  palm: {
    stars: 8, minStars: 6, dist: DIST.SPHERE, drag: 1.05, burn: [2.3, 2.9], trail: 1.6, glitter: 0.9, head: 0.7, tailW: 0.45,
    flags: F.COOL | F.FLICKER, grav: -9.81, trailGain: 0.45, droop: 2.5, intensity: 26, color: 'gold', radiusK: 1.1, jitter: 0.3, liftGain: 4, flash: 0.9,
  },
  crossette: {
    stars: 14, minStars: 8, dist: DIST.SPHERE, drag: 1.4, burn: [1.9, 2.3], trail: 0.3, glitter: 0.3, head: 0.3, tailW: 0.4,
    flags: F.CROSSETTE | F.FLICKER, grav: -9.81, trailGain: 0.3, droop: 1, intensity: 20, color: 'gold', radiusK: 1, jitter: 0.25, split: 0.75, liftGain: 1, flash: 0.9,
  },
  ring: {
    stars: 60, minStars: 24, dist: DIST.RING, drag: 1.8, burn: [1.5, 2.0], trail: 0.14, glitter: 0, head: 0.32, tailW: 0.5,
    flags: F.FLICKER, grav: -9.81, trailGain: 0.35, droop: 0, intensity: 22, color: 'blue', radiusK: 1, jitter: 0.04, liftGain: 1, flash: 0.9,
  },
  /** sparse strobing points: no tails, the stars blink on and off while they fall */
  strobe: {
    stars: 64, minStars: 22, dist: DIST.SPHERE, drag: 2.1, burn: [2.4, 3.4], trail: 0, glitter: 0, head: 0.26, tailW: 1,
    flags: F.STROBE, grav: -9.81, trailGain: 0, droop: 0, intensity: 34, color: 'white', radiusK: 0.95, jitter: 0.22, hz: 11, liftGain: 1, flash: 0.6,
    flashSize: 0.5,
  },
  /**
   * crackle: comparatively few stars with thin tails; each dies in a spray of micro-flashes spread
   * over half a second (the crackle), so the canopy reads as a sparkling band, not a ball
   */
  crackle: {
    stars: 64, minStars: 20, dist: DIST.SPHERE, drag: 1.9, burn: [1.05, 1.5], trail: 0.45, glitter: 0.35, head: 0.24, tailW: 0.38,
    flags: F.COOL, grav: -9.81, trailGain: 0.22, droop: 1, intensity: 15, color: 'gold', radiusK: 1.2, jitter: 0.2, pops: 6, popSpread: 0.75,
    liftGain: 1, flash: 0.8, flashSize: 0.55,
  },
  /** brocade: thin gold stars that shed a long, twinkling flitter trail */
  brocade: {
    stars: 70, minStars: 24, dist: DIST.SPHERE, drag: 1.8, burn: [2.3, 3.1], trail: 1.1, glitter: 0.9, head: 0.22, tailW: 0.4,
    flags: F.COOL | F.FLICKER, grav: -9.81, trailGain: 0.16, droop: 2.5, intensity: 16, color: 'gold', radiusK: 1.15, jitter: 0.12, shed: 6,
    liftGain: 1, flash: 0.8, flashSize: 0.7,
  },
  kamuro: {
    stars: 130, minStars: 40, dist: DIST.SPHERE, drag: 2.5, burn: [3.6, 5.0], trail: 2.4, glitter: 1, head: 0.2, tailW: 0.5,
    flags: F.COOL | F.FLICKER, grav: -11, trailGain: 0.3, droop: 3, intensity: 11, color: 'gold', radiusK: 1.1, jitter: 0.1, liftGain: 1.2, flash: 0.7,
  },
  /** strobing "glitter willow": long-hanging stars that twinkle while they drift down (extra type) */
  glitter: {
    stars: 110, minStars: 34, dist: DIST.SPHERE, drag: 2.7, burn: [3.8, 5.2], trail: 0.35, glitter: 0.6, head: 0.18, tailW: 0.5,
    flags: F.STROBE | F.COOL, grav: -10.5, trailGain: 0.2, droop: 2, intensity: 18, color: 'white', radiusK: 1.15, jitter: 0.2, hz: 14, shed: 8,
    liftGain: 1, flash: 0.6, flashSize: 0.6,
  },
  /** spider: few fast stars with long straight legs that stop dead (small hard breaks, comet ends) */
  spider: {
    stars: 30, minStars: 14, dist: DIST.SPHERE, drag: 3.4, burn: [0.55, 0.85], trail: 0.4, glitter: 0.2, head: 0.2, tailW: 0.55,
    flags: F.COOL | F.FLICKER, grav: -6, trailGain: 0.35, droop: 0.5, intensity: 26, color: 'white', radiusK: 0.8, jitter: 0.25, liftGain: 1, flash: 0.9,
    flashSize: 0.6,
  },
  /**
   * swimmer / fish: a handful of self-propelled stars that wriggle in tight loops for 3-4 s with
   * short tails (the red "fish" sets over the set at v751.5 / v763.5)
   */
  swimmer: {
    stars: 5, minStars: 4, dist: DIST.SPHERE, drag: 2.4, burn: [3.2, 4.2], trail: 0.32, glitter: 0, head: 0.4, tailW: 0.45,
    flags: FW_SWIM | F.FLICKER, grav: -3.2, trailGain: 0.45, droop: 0, intensity: 40, color: 'red', radiusK: 0.22, jitter: 0.35, swim: 2.6, swimHz: 5.5,
    liftGain: 1, flash: 0.5, flashSize: 0.4,
  },
};
/** aliases accepted wherever a shell type is */
SHELLS.fish = SHELLS.swimmer;
SHELLS.hummer = SHELLS.swimmer;

export const SHELL_TYPES = Object.keys(SHELLS);

export function shellSpec(type: unknown): ShellSpec {
  return (typeof type === 'string' && SHELLS[type]) || SHELLS.peony;
}
