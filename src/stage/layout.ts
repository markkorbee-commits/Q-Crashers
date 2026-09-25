import * as THREE from 'three';

/**
 * Canonical MainStage 2026 dimensions (research/stage-canonical.md). Metres, stage front z = 0,
 * audience +Z, +X = spectator's right. Everything the stage modules build is derived from these.
 */
export const L = {
  /** deck top (photogrammetry: 1.9 m) */
  deckY: 1.9,
  /** straight stage front line |x| <= frontHalf */
  frontHalf: 60,
  deckBackZ: -18,
  /** castle base extent |x| <= castleHalf */
  castleHalf: 48.5,
  /** recessed wall facade plane */
  facadeZ: -8,
  /** castle terrace (red skirt + railing) in front of the facade */
  terraceY: 3.1,
  terraceFrontZ: -6,
  wallTop: 9.3,
  /** portal (DJ gate): 5 m wide, apex 6 m above the deck */
  portalW: 5,
  portalApex: 7.9,
  gateHalf: 6,
  gateFrontZ: -6.2,
  /** DJ desk */
  boothZ: -4.1,
  /** front-of-stage barrier line */
  barrierZ: 3,
  /** side section straight wall */
  sideWallZ: -7,
  sideWallTop: 7.6,
  /** angled arms: front edge from armA to armB (right side; mirrored for the left) */
  armA: new THREE.Vector2(60, 0),
  armB: new THREE.Vector2(88, 24),
  armLedge: 3,
  armWallTop: 7.2,
  /** line arrays (K1-like): inner / outer x, hang plane z */
  innerArrayX: 10.8,
  outerArrayX: 31,
  arrayZ: -1.1,
  arrayBottom: 4.95,
  /** K1 box: 1.34 x 0.44 x 0.56 m */
  k1: { w: 1.34, h: 0.44, d: 0.56 },
  /** KS28 sub: 1.34 x 0.55 x 0.7 m */
  ks28: { w: 1.34, h: 0.55, d: 0.7 },
} as const;

/** towers of the central castle (right side; mirrored) */
export interface TowerSpec {
  x: number;
  w: number;
  depth: number;
  frontZ: number;
  body: number;
  cap: 'battlement' | 'spire' | 'cone';
  capTop: number;
}

export const TOWERS: TowerSpec[] = [
  { x: 20, w: 6, depth: 6, frontZ: -6.2, body: 14.0, cap: 'battlement', capTop: 17.2 },
  { x: 34, w: 5, depth: 5, frontZ: -6.5, body: 12.8, cap: 'spire', capTop: 17.4 },
  { x: 46, w: 5, depth: 5, frontZ: -6.5, body: 12.2, cap: 'cone', capTop: 15.8 },
];

/** unit direction of the right arm and its normals */
export function armFrame(): { dir: THREE.Vector2; len: number; nIn: THREE.Vector2; nOut: THREE.Vector2 } {
  const d = new THREE.Vector2().subVectors(L.armB, L.armA);
  const len = d.length();
  d.normalize();
  // inward (towards the audience / field centre) normal for the right arm
  const nIn = new THREE.Vector2(-d.y, d.x);
  if (nIn.y < 0) nIn.multiplyScalar(-1);
  return { dir: d, len, nIn, nOut: nIn.clone().multiplyScalar(-1) };
}
