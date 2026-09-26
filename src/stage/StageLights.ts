import * as THREE from 'three';
import type { QualitySettings } from '../core/types';
import type { StageLookEx } from './StageLook';

interface Rig {
  light: THREE.SpotLight | THREE.PointLight;
  /** minimum quality rank (0 mobile .. 3 ultra) */
  rank: number;
  role: 'front' | 'center' | 'base' | 'rim' | 'flash';
  side: number;
}

const RANK: Record<QualitySettings['level'], number> = { mobile: 0, medium: 1, high: 2, ultra: 3 };
const _c = new THREE.Color();

/**
 * The few REAL lights aimed at the set (everything else is the virtual flood field + emissives):
 * two front washes from the FOH direction, a centre uplight on the dragon, two low base lights,
 * a rim light behind the crown and the pyro/firework flash. The count is fixed per quality
 * (changing light counts recompiles every material), intensities follow the StageLook each frame.
 */
export class StageLights {
  readonly group = new THREE.Group();
  private rigs: Rig[] = [];
  private active = 0;

  constructor() {
    this.group.name = 'StageLights';
    const spot = (role: Rig['role'], rank: number, side: number, pos: THREE.Vector3, target: THREE.Vector3, angle: number, dist: number) => {
      const l = new THREE.SpotLight(0xffffff, 0, dist, angle, 0.75, 1.2);
      l.position.copy(pos);
      l.target.position.copy(target);
      l.castShadow = false;
      this.group.add(l, l.target);
      this.rigs.push({ light: l, rank, role, side });
    };
    const point = (role: Rig['role'], rank: number, side: number, pos: THREE.Vector3, dist: number, decay: number) => {
      const l = new THREE.PointLight(0xffffff, 0, dist, decay);
      l.position.copy(pos);
      this.group.add(l);
      this.rigs.push({ light: l, rank, role, side });
    };
    point('flash', 0, 0, new THREE.Vector3(0, 25, -10), 110, 2);
    spot('center', 0, 0, new THREE.Vector3(0, 2.3, -1.2), new THREE.Vector3(0, 13, -7), 0.6, 60);
    spot('front', 1, -1, new THREE.Vector3(-30, 17, 38), new THREE.Vector3(-14, 7, -7), 0.5, 140);
    spot('front', 1, 1, new THREE.Vector3(30, 17, 38), new THREE.Vector3(14, 7, -7), 0.5, 140);
    point('base', 2, -1, new THREE.Vector3(-27, 3.4, -3.2), 26, 1.4);
    point('base', 2, 1, new THREE.Vector3(27, 3.4, -3.2), 26, 1.4);
    spot('rim', 3, 0, new THREE.Vector3(0, 30, -34), new THREE.Vector3(0, 14, -6), 0.7, 90);
  }

  setQuality(q: QualitySettings): void {
    const r = RANK[q.level];
    this.active = 0;
    for (const rig of this.rigs) {
      rig.light.visible = rig.rank <= r;
      if (rig.light.visible) this.active++;
    }
  }

  get count(): number {
    return this.active;
  }

  update(look: StageLookEx, flashPos: THREE.Vector3, flashI: number): void {
    const wash = look.wash;
    // soft-limited: env wash intensities above ~1 compress instead of blowing out the set
    const wi = 1.5 * (1 - Math.exp(-Math.max(0, look.washIntensity) / 1.1));
    // the constant "work light" parts follow the set practicals (0 in blackouts); the wash-driven parts
    // come from the lighting cues. Nothing here lights the set while the show asks for darkness.
    const E = look.emit * (1 - 0.7 * look.ember);
    for (const rig of this.rigs) {
      const l = rig.light;
      if (!l.visible) continue;
      switch (rig.role) {
        case 'flash': {
          l.position.copy(flashPos);
          _c.copy(look.flash);
          const m = Math.max(_c.r, _c.g, _c.b);
          if (m > 1e-4) l.color.copy(_c).multiplyScalar(1 / m);
          l.intensity = Math.min(3, flashI) * 2600;
          break;
        }
        case 'center':
          l.color.copy(wash).lerp(look.led, 0.45 * E);
          l.intensity = (60 * E + 140 * wi) * (0.5 + 0.7 * look.energy) * (1 + look.pulse);
          break;
        case 'front':
          // FOH washes aimed at the castle: they follow the castle level (a dark-castle look keeps them low)
          l.color.copy(wash).lerp(look.castleLed2, (rig.side > 0 ? 0.25 : 0.1) * E);
          l.intensity = (50 * E + 130 * wi) * (0.6 + 0.5 * look.energy) * (1 + 0.6 * look.pulse + look.strobe * 2) * (0.15 + 0.85 * Math.min(1.3, look.castleGain));
          break;
        case 'base':
          // low lights on the castle base: they belong to the castle (region level / colour)
          l.color.copy(look.castleLed2).lerp(wash, 0.35);
          l.intensity = 45 * (0.4 * E + look.ledIntensity) * Math.min(1.5, look.castleGain);
          break;
        case 'rim':
          l.color.copy(look.led).lerp(wash, 0.5);
          l.intensity = 220 * (0.4 + 0.6 * look.energy) * (0.5 * E + wi);
          break;
      }
    }
  }
}
