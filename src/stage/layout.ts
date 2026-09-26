import { terrainHeight } from '../world/site';

/**
 * MainStage 2026 build dimensions — research/design-bible.md §5 + research/terrain-layout.json
 * (authoritative; stage-canonical.md is superseded). Metres, origin = centre of the deck FRONT edge
 * at floor level, audience +Z, +X = spectator's right. Every stage module derives from these.
 *
 * Where the bible's castle numbers collide with the (fixed, camera-calibrated) dragon crown the
 * castle yields — documented next to each value:
 *  - inner castle towers: bible X ±14; they stand at X ±17.3 (4 m wide) set back to Z −15 so the
 *    wing arm arches in front of them (round 3, daytime photos: towers under the wing arches).
 *  - logo shield: bible Y 7.4–9.0; kept below 8.5 because the dragon's chin hangs at Y 8.7 right
 *    behind it (crown layout).
 *  - skull medallions: bible Y 6.5; lifted to 7.1 so the gallery floor (Y 5.5) does not cut them.
 */
export const L = {
  /** deck top (people vs fascia ruler: 1.9 m) */
  deckY: 1.9,
  /** central deck X ±37, Z −14…0 */
  deckHalf: 37,
  deckBackZ: -14,
  /** corner plinths joining the deck front (Z 0) to the side-section ledge (Z −3) */
  plinthX1: 40,

  // ---- castle core ----------------------------------------------------------------------------
  facadeZ: -12,
  coreHalf: 37,
  /** crenellation line = wall walk of the side sections (bible 9.5; the lamp row sits on it) */
  wallTop: 9.5,
  merlonH: 1.05,
  /**
   * wall walk of the castle CORE facade (X ±37). Round 3: the daytime photos show the white core
   * front topping out level with the skull cubes / just over the portal crown (~8 m), under the
   * lower wings - the bible's 9.5 hid the wing bottoms and the towers under the arches.
   */
  coreTop: 8.1,
  /** dark roof over the core (just under its wall walk) and the side sections' roof */
  coreRoofY: 7.75,
  /** dark roof over the side sections and their scaffold back wall */
  roofY: 9.2,
  coreBackZ: -30,
  /** gate porch (DJ portal block) in front of the facade */
  porchHalf: 12.2,
  porchFrontZ: -6,
  /** porch screen wall: front face at porchFrontZ, this thick */
  screenT: 0.9,
  porchTop: 8.3,
  /** stair recess behind the screen (flights rise outward X ±6.2 → ±11.6) */
  stairX0: 6.2,
  stairX1: 11.6,
  stairBackZ: -9.9,
  /** DJ portal: 5.4 m wide, apex 7.2 m, front face Z −6, 3 m deep; desk at Z −7.5 */
  portalW: 5.4,
  portalApex: 7.2,
  portalDepth: 3,
  boothZ: -7.5,
  shieldY0: 7.05,
  shieldY1: 8.5,
  /** upper castle platform (Y 5.5): porch rear + a gallery along the facade */
  platformY: 5.5,
  galleryFrontZ: -10.4,
  /** plain coping over the dragon's chest (|X| below this), merlons outboard */
  copingHalf: 10.4,

  // ---- PA (K1 ruler) ------------------------------------------------------------------------------
  innerHangX: 11,
  innerHangZ: -4,
  outerHangX: 31,
  outerHangZ: -6,
  arrayBottom: 4.9,
  arrayTop: 14.2,
  bumperY: 14.6,
  trussTop: 16.5,
  /** K1 box: 1.34 x 0.44 x 0.56 m, K2: 1.34 x 0.35 x 0.5 m */
  k1: { w: 1.34, h: 0.44, d: 0.56 },
  k2: { w: 1.34, h: 0.35, d: 0.5 },
  /** sub block = 2 wide x 3 high KS28 */
  subBlock: { w: 2.7, h: 1.65, d: 1.1 },

  // ---- side sections ------------------------------------------------------------------------------
  sideX0: 37,
  sideX1: 92,
  sideFrontZ: -4,
  sideWallT: 1.3,
  /** rear wall Z −22 at |X| 37 → −30 at |X| 80 */
  sideRear: (ax: number) => (ax <= 37 ? -22 : ax >= 80 ? -30 : -22 - ((ax - 37) / 43) * 8),
  ledgeFrontZ: -3,
  sideTowers: [48, 63, 78],
  sideTowerZ: -10,
  sideTowerW: 5,
  sideTowerTop: 13.5,
  corner: { x: 92, z: -4, w: 6, top: 15 },
  lanternPitch: 8,
  lanternTop: 11.5,

  // ---- forward arms (axis-parallel along the bank) ------------------------------------------------
  armZ0: -4,
  armZ1: 58,
  armPostsZ: [2, 10, 18, 26, 34, 42, 50],
  armOpenings: [
    [28, 32],
    [36, 40],
    [44, 48],
    [52, 56],
  ] as [number, number][],
  rampartH: 1.4,
  rampartT: 1.2,
  armEnd: { x: 94, z: 58, w: 4, top: 12.5 },

  // ---- front of house ------------------------------------------------------------------------------
  /** front-of-stage barrier line Z +3 across |X| ≤ 90, arm barriers along X ±90 */
  barrierZ: 3,
  barrierX: 90,
} as const;

/** the arm's centre line: X from ±92 at Z −4 to ±94 at Z 58 (right side; mirror for the left) */
export function armX(z: number): number {
  return 92 + ((z - L.armZ0) / (L.armZ1 - L.armZ0)) * 2;
}

/** ground height (terrain) */
export const ground = terrainHeight;

/** top of the side-section flame ledge at |x| (bible: Y = max(1.9, ground + 1)) */
export function ledgeTop(x: number): number {
  return Math.max(L.deckY, terrainHeight(x, -3.6) + 1);
}

/** rampart top of the arm at z (1.4 m above the local bank) */
export function rampartTop(s: number, z: number): number {
  return terrainHeight(s * armX(z), z) + L.rampartH;
}
