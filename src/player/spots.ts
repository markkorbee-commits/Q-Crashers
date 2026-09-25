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

/** Spot used when the URL has no ?spot= parameter. */
export const DEFAULT_START_SPOT = 'foh';
