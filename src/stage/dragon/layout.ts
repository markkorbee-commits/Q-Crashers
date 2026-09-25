import * as THREE from 'three';

/**
 * Crown layout (world metres; x = 0 stage centre line, y = 0 field level, z = 0 deck front edge,
 * +z towards the audience). Build numbers from research/design-bible.md §5 (which supersedes
 * stage-canonical.md), cross-checked against the official thumbnail, the golden-hour telephoto and
 * the night lighting test:
 *   head: skull ~9 m wide, mouth ~7 x 5.5 m, gape ~40 deg, chin Y 9.3 (right above the logo shield),
 *         snout/teeth line Z ~ -5 overhanging the DJ portal, turned towards audience-left, crest
 *         top ~21.5-22, rider top ~23 at (+6.5, -, -16..-18)
 *   wings: plane Z ~ -20 leaning back 10 deg; 3 finger spars per wing fanning up from a low wrist
 *          hidden behind the castle; finial tops (±14.5, 26.5), (±29, 28), (±40.5, 26.5)
 *   rosettes: 3 per wing, diameter ~4.5 m, centres near (±16, 16.5), (±24, 16.5), (±32, 15.5)
 */
export const HEAD = {
  hinge: new THREE.Vector3(-1.0, 15.2, -11.6),
  /** radians, negative = snout turned towards audience-left (-X) */
  yaw: -0.3,
  /** radians, positive = nose down (the head glares down at the field; the jaw hangs almost vertical) */
  pitch: 0.38,
  /** jaw opening at look.jaw = 0 / 1 (radians); the default look.jaw 0.6 gives a ~5.5 m tall gape */
  jawMin: 0.6,
  jawMax: 1.05,
};

export function headMatrix(): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(HEAD.pitch, HEAD.yaw, 0, 'YXZ'));
  return new THREE.Matrix4().compose(HEAD.hinge, q, new THREE.Vector3(1, 1, 1));
}

export interface WingLayout {
  side: number;
  shoulder: THREE.Vector3;
  /** knuckle block where the spar roots meet (behind the castle) */
  wrist: THREE.Vector3;
  /** base (root) of each finger spar: outer, middle, inner */
  bases: THREE.Vector3[];
  /** finger ends (base of the finial): outer, middle, inner */
  tips: THREE.Vector3[];
  /** top of the finial spear (highest point) */
  finialTops: THREE.Vector3[];
  /** where the arm meets the inner finger */
  armJoin: THREE.Vector3;
  rosettes: THREE.Vector3[];
}

export function wingLayout(side: number): WingLayout {
  const s = side;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x * s, y, z);
  const bases = [v(30.6, 4.6, -17.6), v(27.4, 3.9, -17.5), v(24.0, 3.9, -17.4)];
  const tips = [v(40.2, 23.2, -21.2), v(29.0, 24.7, -21.5), v(14.7, 23.2, -20.9)];
  const finialTops = [v(40.6, 26.5, -21.3), v(29.1, 28.0, -21.6), v(14.2, 26.5, -21.0)];
  const armJoin = new THREE.Vector3().lerpVectors(bases[2], tips[2], 0.36);
  return {
    side,
    shoulder: v(6.2, 14.6, -16.6),
    wrist: v(27.3, 3.2, -17.3),
    bases,
    tips,
    finialTops,
    armJoin,
    rosettes: [v(32.5, 15.6, -19.4), v(23.4, 16.3, -19.4), v(15.4, 17.3, -18.8)],
  };
}
