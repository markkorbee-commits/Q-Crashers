import { DIST, F } from '../fx/core/Emitter';

/**
 * Shell (star burst) recipes. Radii and burn times follow display-firework practice: stars leave the
 * break at 30-60 m/s, air drag (k ~ 1.5-2.8 1/s) stops them at roughly the burst radius, gravity pulls
 * them down at the terminal speed g/k. Trails are the glowing path over the last `trail` seconds.
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
  /** lift tail brightness (palms have a heavy rising "trunk") */
  liftGain: number;
  /** env flash multiplier */
  flash: number;
}

export const SHELLS: Record<string, ShellSpec> = {
  peony: {
    stars: 140, minStars: 30, dist: DIST.SPHERE, drag: 1.9, burn: [1.3, 1.9], trail: 0.11, glitter: 0, head: 0.34, tailW: 0.5,
    flags: F.FLICKER, grav: -9.81, trailGain: 0.9, droop: 0, intensity: 22, color: 'red', radiusK: 1, jitter: 0.1, liftGain: 1, flash: 1,
  },
  chrysanthemum: {
    stars: 150, minStars: 32, dist: DIST.SPHERE, drag: 1.7, burn: [1.6, 2.2], trail: 0.75, glitter: 0.45, head: 0.3, tailW: 0.35,
    flags: F.COOL | F.FLICKER, grav: -9.81, trailGain: 0.9, droop: 2, intensity: 18, color: 'gold', radiusK: 1, jitter: 0.1, liftGain: 1, flash: 1,
  },
  dahlia: {
    stars: 44, minStars: 18, dist: DIST.SPHERE, drag: 1.35, burn: [1.8, 2.4], trail: 0.3, glitter: 0, head: 0.55, tailW: 0.6,
    flags: F.FLICKER, grav: -9.81, trailGain: 0.8, droop: 0, intensity: 30, color: 'red', radiusK: 0.85, jitter: 0.14, liftGain: 1, flash: 1,
  },
  willow: {
    stars: 70, minStars: 24, dist: DIST.SPHERE, drag: 2.8, burn: [3.4, 4.6], trail: 2.8, glitter: 0.75, head: 0.2, tailW: 0.55,
    flags: F.COOL, grav: -12, trailGain: 1.1, droop: 3.5, intensity: 10, color: 'gold', radiusK: 0.9, jitter: 0.12, liftGain: 1.2, flash: 0.7,
  },
  palm: {
    stars: 8, minStars: 6, dist: DIST.SPHERE, drag: 1.05, burn: [2.3, 2.9], trail: 1.6, glitter: 0.9, head: 0.7, tailW: 0.45,
    flags: F.COOL | F.FLICKER, grav: -9.81, trailGain: 1.2, droop: 2.5, intensity: 26, color: 'gold', radiusK: 1.1, jitter: 0.3, liftGain: 4, flash: 0.9,
  },
  crossette: {
    stars: 14, minStars: 8, dist: DIST.SPHERE, drag: 1.4, burn: [1.9, 2.3], trail: 0.3, glitter: 0.3, head: 0.32, tailW: 0.45,
    flags: F.CROSSETTE | F.FLICKER, grav: -9.81, trailGain: 0.9, droop: 1, intensity: 20, color: 'gold', radiusK: 1, jitter: 0.25, split: 0.75, liftGain: 1, flash: 0.9,
  },
  ring: {
    stars: 60, minStars: 24, dist: DIST.RING, drag: 1.8, burn: [1.5, 2.0], trail: 0.14, glitter: 0, head: 0.34, tailW: 0.5,
    flags: F.FLICKER, grav: -9.81, trailGain: 0.9, droop: 0, intensity: 22, color: 'blue', radiusK: 1, jitter: 0.04, liftGain: 1, flash: 0.9,
  },
  strobe: {
    stars: 100, minStars: 30, dist: DIST.SPHERE, drag: 2.1, burn: [2.4, 3.4], trail: 0, glitter: 0, head: 0.36, tailW: 1,
    flags: F.STROBE, grav: -9.81, trailGain: 0, droop: 0, intensity: 30, color: 'white', radiusK: 0.95, jitter: 0.18, hz: 11, liftGain: 1, flash: 0.8,
  },
  crackle: {
    stars: 120, minStars: 30, dist: DIST.SPHERE, drag: 1.9, burn: [1.15, 1.6], trail: 0.55, glitter: 0.4, head: 0.3, tailW: 0.45,
    flags: F.COOL, grav: -9.81, trailGain: 1.1, droop: 1, intensity: 16, color: 'gold', radiusK: 1.2, jitter: 0.16, pops: 7, liftGain: 1, flash: 1,
  },
  brocade: {
    stars: 130, minStars: 34, dist: DIST.SPHERE, drag: 1.8, burn: [2.3, 3.1], trail: 1.3, glitter: 1, head: 0.26, tailW: 0.5,
    flags: F.COOL | F.FLICKER, grav: -9.81, trailGain: 1.05, droop: 2.5, intensity: 16, color: 'gold', radiusK: 1.15, jitter: 0.1, liftGain: 1, flash: 0.9,
  },
  kamuro: {
    stars: 150, minStars: 40, dist: DIST.SPHERE, drag: 2.5, burn: [3.6, 5.0], trail: 2.4, glitter: 1, head: 0.22, tailW: 0.5,
    flags: F.COOL | F.FLICKER, grav: -11, trailGain: 1.1, droop: 3, intensity: 11, color: 'gold', radiusK: 1.1, jitter: 0.1, liftGain: 1.2, flash: 0.7,
  },
  /** strobing "glitter willow": long-hanging stars that twinkle while they drift down (extra type) */
  glitter: {
    stars: 110, minStars: 34, dist: DIST.SPHERE, drag: 2.7, burn: [3.8, 5.2], trail: 0.35, glitter: 0.6, head: 0.2, tailW: 0.5,
    flags: F.STROBE | F.COOL, grav: -10.5, trailGain: 0.5, droop: 2, intensity: 18, color: 'white', radiusK: 1.15, jitter: 0.2, hz: 14, liftGain: 1, flash: 0.6,
  },
};

export const SHELL_TYPES = Object.keys(SHELLS);

export function shellSpec(type: unknown): ShellSpec {
  return (typeof type === 'string' && SHELLS[type]) || SHELLS.peony;
}
