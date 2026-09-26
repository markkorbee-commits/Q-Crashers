import { L } from '../layout';

/**
 * The gold scaled vault, the DJ booth inside it, the grey steps and the dancers' podium in front of
 * it: the one place their dimensions live (geometry, walk map, performers and spots all read them).
 *
 * Sources: the user's daytime drone photos (refs/day/day3_aerial.jpg, day4_aerial_rider.jpg: a gold
 * scaled barrel vault under the dragon's chin whose front is the ornate portal, wide grey steps in
 * front of it down to the red deck), the official video (646–740 s: concentric ribbed rings inside
 * the arch, a ring of spots in the crown, the booth deep inside on a raised floor, the troupe on the
 * red floor in front) and design-bible §5.4 (portal 5.4 m wide, apex 7.2, front face Z −6).
 *
 * Coordinates: world metres, stage front Z 0, audience +Z, deck top Y 1.9.
 */
export const VAULT = {
  /** portal plane (front face of the porch screen, bible §5.4) */
  frontZ: L.porchFrontZ,
  /** back face of the porch screen: the tunnel starts here */
  screenZ: L.porchFrontZ - L.screenT,
  /** rear wall of the tunnel, just in front of the castle facade */
  backZ: L.facadeZ + 0.1,
  /** raised vault floor (the grey steps climb 0.5 m from the podium, 0.8 m above the deck) */
  floorY: L.deckY + 0.8,
  /** interior profile at the first rib: equilateral pointed arch, span / apex (the portal opening is 5.4 / 7.2) */
  span: 6.0,
  apex: 7.5,
  /** the rings shrink towards the back (the forced-perspective "turbine" of the real set) */
  backScale: 0.9,
  /** rib depth (radial) and thickness (along Z): chunky dark-steel bands as in the video */
  ribDepth: 0.32,
  ribT: 0.22,
  /** rib stations (Z of the rib front faces) */
  ribs: [-7.3, -8.25, -9.2, -10.15, -11.1] as readonly number[],
  /** exterior barrel: half width where the roof springs from the porch mass, crown height */
  outerHalf: 3.5,
  roofSpring: 4.6,
  roofApex: 8.1,
  /** top of the lowered porch mass beside the vault (the gold roof shows above it from the castle / drone) */
  massTop: 4.6,
} as const;

/** grey steps in front of the portal: landing at the vault floor, risers down to the podium */
export const STEPS = {
  halfW: 3.9,
  /** the top riser = front edge of the landing (Z −5 … −6 at the vault floor) */
  topZ: -5.0,
  /** the lowest riser (foot of the flight, on the podium) */
  botZ: -4.2,
  risers: 3,
  /** tread depth */
  tread: 0.4,
} as const;

/**
 * The dancers' podium: a red riser (0.3 m, black fascia) in front of the steps, U-shaped around the
 * lead dancer's pedestal, which stands on the deck at (0, −2) in the notch (crowd/props.ts). Two
 * "cheeks" run back beside the grey steps to the porch screen, so the flight is let into the podium.
 */
export const PODIUM = {
  top: L.deckY + 0.3,
  halfW: 5.6,
  backZ: STEPS.botZ,
  frontZ: -1.35,
  /** the notch (open to the audience) that frames the lead's pedestal */
  notchHalf: 1.5,
  notchZ: -2.9,
  /** cheeks beside the grey steps: |X| halfW(steps) … halfW, back to the porch screen */
  cheekBackZ: L.porchFrontZ - 0.02,
  /** half-height side steps along the outer flanks (clear of the front-line lamps at Z −2.8) */
  apron: 0.35,
  apronY: L.deckY + 0.15,
  apronZ0: -5.6,
  apronZ1: -3.1,
} as const;

/** the podium's walkable top as rectangles [minX, maxX, minZ, maxZ] (geometry, walk map and hardware read these) */
export function podiumRects(): [number, number, number, number][] {
  const P = PODIUM;
  const S = STEPS.halfW;
  return [
    [-P.halfW, P.halfW, P.backZ, P.notchZ],
    [-P.halfW, -P.notchHalf, P.notchZ, P.frontZ],
    [P.notchHalf, P.halfW, P.notchZ, P.frontZ],
    [-P.halfW, -S, P.cheekBackZ, P.backZ],
    [S, P.halfW, P.cheekBackZ, P.backZ],
  ];
}

/** DJ booth desk + DJ riser inside the vault */
export const BOOTH = {
  /** desk centre Z, half width, half depth, top above the vault floor */
  z: -9.9,
  halfW: 1.38,
  halfD: 0.45,
  height: 1.05,
  /** the low riser the DJ stands on (behind the desk) */
  matH: 0.1,
  matHalfW: 1.3,
  matFrontZ: -10.4,
  matBackZ: -11.75,
  /** where the DJ stands (the 'dj' viewing spot) */
  djZ: -10.95,
  /** booth monitors on tripods at the riser's back corners (the passage along the desk ends stays open) */
  monitorX: 1.72,
  monitorZ: -11.5,
} as const;

/** barrier gates in the front-of-stage barrier: the pit stairs (centre) and the crew stairs at the corners */
export const GATES = {
  centreHalf: 1.0,
  side: [43.2, 44.8] as readonly [number, number],
} as const;

/**
 * the castle stairs behind the stair arches (Castle.ts): the flight rises outwards from footX to
 * L.stairX1 (5.5); between the porch mass (L.stairX0) and footX the recess floor is the deck, the way
 * in through the arch
 */
export const CASTLE_STAIRS = {
  footX: 7.1,
  /** the flight's handrail on the screen side starts this far along it (the open way in) */
  railFrom: 0.6,
} as const;

/** crew stairs (black scaffold units) from the pit up to the corner plinths */
export const CREW_STAIRS = {
  /** top at the plinth edge |X| 40, bottom at |X| 43.3 */
  x0: L.plinthX1,
  x1: L.plinthX1 + 3.3,
  z0: -2.65,
  z1: -1.25,
  risers: 10,
} as const;

// ---------------------------------------------------------------------------------------------
// the vault's interior profile

const RISE = VAULT.span * Math.sin(Math.PI / 3);
/** springing line of the unscaled interior arch (below the vault floor: the arch meets the floor) */
const SPRING = VAULT.apex - RISE;

/** ring scale at Z (1 at the screen back, backScale at the rear wall) */
export function vaultScale(z: number): number {
  const t = Math.min(1, Math.max(0, (VAULT.screenZ - z) / (VAULT.screenZ - VAULT.backZ)));
  return 1 + (VAULT.backScale - 1) * t;
}

/** half width of the UNSCALED interior arch at height y (0 above the apex) */
function archHalf(y: number): number {
  const h = y - SPRING;
  if (h <= 0) return VAULT.span / 2;
  const r = VAULT.span;
  const q = r * r - h * h;
  return q <= 0 ? 0 : Math.max(0, -VAULT.span / 2 + Math.sqrt(q));
}

/** interior half width (skin) at height y above the ground and depth z (rings scaled about the floor centre) */
export function vaultHalfWidth(z: number, y: number): number {
  const s = vaultScale(z);
  const yy = VAULT.floorY + (y - VAULT.floorY) / s;
  return archHalf(yy) * s;
}

/** interior ceiling (skin) at lateral offset x and depth z */
export function vaultCeiling(z: number, x: number): number {
  const s = vaultScale(z);
  const ax = Math.abs(x) / s;
  const half = VAULT.span / 2;
  if (ax >= half) return VAULT.floorY;
  // right arc centred at (−half, SPRING), radius span: y = SPRING + sqrt(r² − (x + half)²)
  const d = ax + half;
  const y = SPRING + Math.sqrt(Math.max(0, VAULT.span * VAULT.span - d * d));
  return VAULT.floorY + (y - VAULT.floorY) * s;
}

/**
 * interior outline of one ring (skin) at scale s, from the left floor point over the apex to the
 * right floor point, `n` segments per side; `inset` pulls it inwards (the rib's inner edge)
 */
export function vaultOutline(s: number, n: number, inset = 0): [number, number][] {
  const out: [number, number][] = [];
  const F = VAULT.floorY;
  const half = VAULT.span / 2;
  const r = VAULT.span;
  // angle range of the right arc (centre (−half, SPRING)) from the floor to the apex
  const aFloor = Math.asin(Math.min(1, (F - SPRING) / r));
  const aApex = Math.PI / 3;
  const pt = (a: number, side: number): [number, number] => {
    const x = -half + r * Math.cos(a);
    const y = SPRING + r * Math.sin(a);
    // inward normal: towards the arc centre
    const nx = -Math.cos(a),
      ny = -Math.sin(a);
    const px = x + nx * inset,
      py = Math.max(F, y + ny * inset);
    return [side * px * s, F + (py - F) * s];
  };
  for (let i = 0; i <= n; i++) out.push(pt(aFloor + ((aApex - aFloor) * i) / n, -1));
  for (let i = n - 1; i >= 0; i--) out.push(pt(aFloor + ((aApex - aFloor) * i) / n, 1));
  return out;
}

/** exterior roof outline (round-pointed barrel from the porch mass to the crown), left to right */
export function roofOutline(n: number): [number, number][] {
  const h = VAULT.outerHalf;
  const rise = VAULT.roofApex - VAULT.roofSpring;
  // two arcs through (±h, spring) meeting at (0, apex): radius from h and rise
  const r = (h * h + rise * rise) / (2 * h);
  const cx = h - r; // centre of the LEFT arc lies at x = −h + r = −cx
  const aTop = Math.atan2(rise, cx);
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (Math.PI - aTop) * (i / n);
    out.push([-cx + r * Math.cos(a), VAULT.roofSpring + r * Math.sin(a)]);
  }
  for (let i = n - 1; i >= 0; i--) {
    const a = Math.PI - (Math.PI - aTop) * (i / n);
    out.push([-(-cx + r * Math.cos(a)), VAULT.roofSpring + r * Math.sin(a)]);
  }
  return out;
}

/** portal arch-crown downlight cans (same formula as the lighting rig's `archSpots`) */
export function archSpotPositions(): [number, number, number][] {
  const w = L.portalW,
    apex = L.portalApex,
    frontZ = L.porchFrontZ,
    wallT = L.screenT;
  const r = w;
  const half = w / 2;
  const springY = apex - r * Math.sin(Math.PI / 3);
  const out: [number, number, number][] = [];
  const n = 7;
  const u0 = 0.36;
  for (let k = 0; k < n; k++) {
    const q = (k / (n - 1)) * 2 - 1;
    const u = u0 + (1 - u0) * (1 - Math.abs(q));
    const a = Math.PI - (Math.PI / 3) * u;
    const x = half + r * Math.cos(a);
    const y = springY + r * Math.sin(a);
    const ix = (half - x) / r;
    const iy = (springY - y) / r;
    out.push([(q < 0 ? -1 : 1) * (x + ix * 0.25), y + iy * 0.25, frontZ - wallT * 0.45]);
  }
  return out;
}
