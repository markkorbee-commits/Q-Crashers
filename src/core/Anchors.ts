import * as THREE from 'three';
import { LAYOUT_ANCHORS, type LayoutAnchorName } from '../data/layout.gen';

/**
 * Named world positions shared between systems (emitters, fixture rigs, camera targets).
 * The MainStage / Grounds systems register exact positions during init; the defaults below are
 * design-bible estimates so every system can also run standalone.
 *
 * Coordinates: metres, stage front edge at z = 0, audience towards +Z, +X = spectator's right.
 */

/**
 * Anchor names. Core set (documented in docs/show-format.md):
 *  deck_front, deck_back, wing_left, wing_right, wing_tips, towers_top, roof, dragon_mouth,
 *  dragon_eyes, dragon_head, speaker_hangs, dj_booth, pillars_top, pillars_base, delay_towers, foh,
 *  fireworks_back, fireworks_sides, laser_stage, laser_field, fixtures_truss, fixtures_floor
 * plus the design-bible pyro groups: side_front, arm_posts, tower_torches, corner_fireballs,
 *  side_rampart, roof_comets, front_comets, deck_gerbs, arm_ends, crest_comets, co2, bengal, mines,
 *  hang_glitter, piano.
 */
export type AnchorName = LayoutAnchorName;

/** Design-bible default layout (generated from research/terrain-layout.json; owners override). */
function defaults(): Record<string, THREE.Vector3[]> {
  const out: Record<string, THREE.Vector3[]> = {};
  for (const [k, pts] of Object.entries(LAYOUT_ANCHORS)) out[k] = (pts as readonly (readonly number[])[]).map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  return out;
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
