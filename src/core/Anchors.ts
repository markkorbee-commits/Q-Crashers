import * as THREE from 'three';

/**
 * Named world positions shared between systems (emitters, fixture rigs, camera targets).
 * The MainStage / Grounds systems register exact positions during init; the defaults below are
 * design-bible estimates so every system can also run standalone.
 *
 * Coordinates: metres, stage front edge at z = 0, audience towards +Z, +X = spectator's right.
 */
export type AnchorName =
  | 'deck_front' // flame units along the front edge of the stage deck
  | 'deck_back' // units at the back of the deck (castle base)
  | 'wing_left' // points along the left wing (spectator's left, -X)
  | 'wing_right'
  | 'wing_tips' // outer wing tips (both sides)
  | 'towers_top' // tops of the castle towers
  | 'roof' // top edge of the stage structure (comet/gerb positions)
  | 'dragon_mouth' // inside the dragon's jaws (single point)
  | 'dragon_eyes' // 2 points
  | 'dragon_head' // centre of head (camera target)
  | 'speaker_hangs' // line array centres
  | 'dj_booth'
  | 'pillars_top' // tops of the lantern pillars on the field
  | 'pillars_base'
  | 'delay_towers' // delay/light towers in the field
  | 'foh' // FOH tower (lasers/followspots)
  | 'fireworks_back' // mortar racks behind the stage
  | 'fireworks_sides' // mortar positions left/right of the stage
  | 'laser_stage' // laser emitters on the stage structure
  | 'laser_field' // laser emitters in the field (towers/FOH)
  | 'fixtures_truss' // moving head positions on the stage structure
  | 'fixtures_floor'; // moving heads on the deck / castle base

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const row = (n: number, x0: number, x1: number, y: number, z: number) =>
  Array.from({ length: n }, (_, i) => v(x0 + ((x1 - x0) * i) / Math.max(1, n - 1), y, z));
const mirror = (pts: THREE.Vector3[]) => [...pts, ...pts.map((p) => v(-p.x, p.y, p.z))];

/** Design-bible default layout (overridden by the systems that own the geometry). */
function defaults(): Record<AnchorName, THREE.Vector3[]> {
  return {
    deck_front: row(24, -46, 46, 2.2, -0.4),
    deck_back: row(12, -40, 40, 2.2, -14),
    wing_left: row(10, -110, -50, 22, -8),
    wing_right: row(10, 50, 110, 22, -8),
    wing_tips: [v(-118, 30, -6), v(118, 30, -6)],
    towers_top: mirror([v(-22, 36, -10), v(-44, 30, -9), v(-64, 26, -8)]),
    roof: row(14, -60, 60, 40, -12),
    dragon_mouth: [v(0, 22, -3)],
    dragon_eyes: [v(-3.2, 30, -4), v(3.2, 30, -4)],
    dragon_head: [v(0, 28, -5)],
    speaker_hangs: [v(-18, 20, -2), v(18, 20, -2), v(-32, 18, -2), v(32, 18, -2)],
    dj_booth: [v(0, 2.2, -6)],
    pillars_top: mirror(Array.from({ length: 8 }, (_, i) => v(-9, 9, 18 + i * 16))),
    pillars_base: mirror(Array.from({ length: 8 }, (_, i) => v(-9, 0, 18 + i * 16))),
    delay_towers: [v(-30, 14, 95), v(30, 14, 95), v(-40, 14, 170), v(40, 14, 170)],
    foh: [v(0, 8, 110)],
    fireworks_back: row(9, -80, 80, 0, -60),
    fireworks_sides: [v(-140, 0, -20), v(140, 0, -20), v(-160, 0, 20), v(160, 0, 20)],
    laser_stage: [...row(8, -56, 56, 12, -3), ...row(6, -40, 40, 30, -8)],
    laser_field: [v(-30, 15, 95), v(30, 15, 95), v(0, 10, 110)],
    fixtures_truss: row(40, -90, 90, 34, -10),
    fixtures_floor: row(24, -50, 50, 2.6, -2),
  };
}

export class Anchors {
  private map = new Map<string, THREE.Vector3[]>();
  constructor() {
    for (const [k, pts] of Object.entries(defaults())) this.map.set(k, pts);
  }
  set(name: AnchorName, pts: THREE.Vector3[]) {
    this.map.set(name, pts.map((p) => p.clone()));
  }
  get(name: AnchorName): THREE.Vector3[] {
    return this.map.get(name) ?? [];
  }
  /** resolve a cue target list into positions (unknown names are ignored) */
  resolve(targets: string[], fallback: AnchorName): THREE.Vector3[] {
    const out: THREE.Vector3[] = [];
    for (const t of targets) {
      if (t === 'all') return this.get(fallback);
      const pts = this.map.get(t);
      if (pts) out.push(...pts);
      else if (t === 'left' || t === 'right') {
        const base = this.get(fallback);
        out.push(...base.filter((p) => (t === 'left' ? p.x < -0.01 : p.x > 0.01)));
      } else if (t === 'center') {
        const base = this.get(fallback);
        out.push(...base.filter((p) => Math.abs(p.x) < 12));
      }
    }
    return out.length ? out : this.get(fallback);
  }
  names(): string[] {
    return [...this.map.keys()];
  }
}
