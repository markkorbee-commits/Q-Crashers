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
  /**
   * round 3: the daytime photos (axis telephoto, calibrated on the PA hangs and the portal) show
   * the head ~15 % bigger than built (horn crown to Y ~23.5, jaw tip resting on the portal crown):
   * the whole head is scaled about a raised hinge
   */
  hinge: new THREE.Vector3(-1.0, 15.9, -11.8),
  scale: 1.15,
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
  return new THREE.Matrix4().compose(HEAD.hinge, q, new THREE.Vector3(HEAD.scale, HEAD.scale, HEAD.scale));
}

export interface WingLayout {
  side: number;
  shoulder: THREE.Vector3;
  /** knuckle where the arm ends and the outer / middle spars rise (low, in front of the castle) */
  wrist: THREE.Vector3;
  /** control point of the arched arm (shoulder -> wrist) */
  armCtrl: THREE.Vector3;
  /** base (root) of each finger spar: outer, middle, inner (the inner one rises from the arm) */
  bases: THREE.Vector3[];
  /** finger ends (the finial's sun disc sits here): outer, middle, inner */
  tips: THREE.Vector3[];
  /** top of the finial spear (highest point) */
  finialTops: THREE.Vector3[];
  /** where the inner finger leaves the arm (= bases[2]) and its arm parameter */
  armJoin: THREE.Vector3;
  armJoinT: number;
  rosettes: THREE.Vector3[];
}

/**
 * Round-3 (daytime photos of the real set, telephoto on the axis + ground / drone views): each wing
 * is a bat wing whose ARM arches from the dragon's shoulder out and down to a WRIST standing low in
 * front of the outer castle bays (Y ~4.6, Z ~ -8.8, hooked tusks hanging to the deck), with the outer
 * and middle spars rising from the wrist and the inner spar from the arm; the spars lean back ~30 deg
 * so the finials stand at Z ~ -21. The outer and middle spars stand near-vertical (the outer one is
 * the wing's outer edge, ending in hooked spikes by the side sections), the inner spar leans in from
 * the arm to the head. Finial tops: X from the official photo P (outer tips just outside the row-2
 * crystals, middle / inner at 0.75 / 0.37 of the outer span: ±39.8 / 29.4 / 14.5, the bible values),
 * heights from the daytime photos (the outer finial clearly lower than the middle / inner ones) -
 * the round-2 1.12x scale-up had the outer tips ~4 m too far out and 2.4 m too high.
 * Under the arm the castle towers show through the arch (thumbnail, day photos).
 */
export function wingLayout(side: number): WingLayout {
  const s = side;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x * s, y, z);
  const shoulder = v(6.2, 14.6, -16.6);
  const wrist = v(26.4, 4.6, -8.8);
  const armCtrl = v(17.5, 19.5, -12.2);
  const armJoinT = 0.74;
  const armJoin = qb(shoulder, armCtrl, wrist, armJoinT);
  const finialTops = [v(39.8, 26.8, -21.3), v(29.4, 29.9, -21.6), v(14.5, 29.5, -21.0)];
  const bases = [v(36.2, 6.8, -9.8), v(27.6, 5.2, -9.0), armJoin.clone()];
  // the finger end sits ~5.6 m below the spear tip along the spar's line
  const tips = finialTops.map((t, i) => {
    const d = new THREE.Vector3().subVectors(t, bases[i]).normalize();
    return t.clone().addScaledVector(d, -5.6);
  });
  return {
    side,
    shoulder,
    wrist,
    armCtrl,
    bases,
    tips,
    finialTops,
    armJoin,
    armJoinT,
    rosettes: [v(33.3, 17.4, -15), v(24.4, 17.9, -15), v(16.2, 17.3, -15)],
  };
}

function qb(a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const u = 1 - t;
  return new THREE.Vector3(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  );
}
