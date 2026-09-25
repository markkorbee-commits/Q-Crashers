import * as THREE from 'three';
import type { NamedSpot } from '../core/types';

/** Point the spectator's eyes are drawn to by default: the centre of the dragon / castle facade. */
export const STAGE_FOCUS = new THREE.Vector3(0, 14, -6);

/** Yaw (radians, 0 = facing -Z) that looks from `from` towards `to` on the ground plane. */
export function yawTowards(from: THREE.Vector3, to: THREE.Vector3): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

/** Pitch (radians, + = up) that looks from an eye at `from` (+ eye height) towards `to`. */
export function pitchTowards(from: THREE.Vector3, to: THREE.Vector3, eye = 1.68): number {
  const d = Math.hypot(to.x - from.x, to.z - from.z);
  return Math.atan2(to.y - (from.y + eye), Math.max(1, d));
}

const spot = (id: string, label: string, x: number, y: number, z: number, look = STAGE_FOCUS, pitchScale = 0.55): NamedSpot => {
  const position = new THREE.Vector3(x, y, z);
  return { id, label, position, yaw: yawTowards(position, look), pitch: pitchTowards(position, look) * pitchScale };
};

/**
 * Built-in viewing positions (the world / stage systems may override any of them by id).
 * Pitch is softened (x0.55) so the horizon and the crowd stay in view when arriving.
 */
export const DEFAULT_SPOTS: NamedSpot[] = [
  spot('entrance', 'Field entrance', 0, 0, 300),
  spot('back', 'Back of the field', 0, 0, 200),
  spot('foh', 'FOH tower', 12, 0, 118),
  spot('middle', 'Middle of the field', 0, 0, 70),
  spot('crowd', 'In the crowd', 6, 0, 32),
  spot('front', 'Front row', 0, 0, 6, new THREE.Vector3(0, 20, -6), 0.6),
  spot('side_left', 'Left side', -70, 0, 40),
  spot('side_right', 'Right side', 70, 0, 40),
  // on the stage deck wings, looking diagonally across the stage and out over the crowd
  spot('stage_left', 'Stage left wing', -55, 2.2, -4, new THREE.Vector3(0, 6, 40), 0.4),
  spot('stage_right', 'Stage right wing', 55, 2.2, -4, new THREE.Vector3(0, 6, 40), 0.4),
  spot('dragon_view', 'Dragon view', 0, 0, 45, new THREE.Vector3(0, 26, -5), 0.75),
];

/**
 * Spot used when the URL has no ?spot= parameter and the viewer never chose one: the middle of the
 * field (Grounds registers it at (-4, 74)), inside the Tribe with the whole set, both wings and the
 * sky above it in view. (The FOH tower at 146 m made the stage a thin strip on the horizon.)
 */
export const DEFAULT_START_SPOT = 'middle';
/** extra upward look (rad) when arriving at the default start: dragon + firework sky over the heads */
export const DEFAULT_START_PITCH = 0.06;

/** A curated starting position for an onboarding "choose your position" picker. */
export interface StartChoice {
  /** spot id (app.spots), or 'showcam' for the directed show camera */
  id: string;
  title: string;
  blurb: string;
}

/** Start positions offered on arrival, closest to the stage first. */
export const START_CHOICES: readonly StartChoice[] = [
  { id: 'front', title: 'Front row', blurb: 'On the barrier. The dragon towers over you, the flames hit your face.' },
  { id: 'crowd', title: 'In the crowd', blurb: 'Packed in the pit with the Tribe, 30 m from the stage.' },
  { id: 'middle', title: 'Middle of the field', blurb: 'The whole set, both wings and the firework sky. The classic view.' },
  { id: 'foh', title: 'FOH tower', blurb: 'The official camera position: the full symmetry of the show.' },
  { id: 'showcam', title: 'Show camera', blurb: 'Sit back: a director cuts the Endshow like the film.' },
];
