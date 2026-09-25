import * as THREE from 'three';
import type { FrameContext, QualitySettings } from '../core/types';
import type { StageLook } from './StageLook';

/** World positions the crown exposes (registered as anchors by MainStageSystem). */
export interface CrownAnchors {
  dragonMouth: THREE.Vector3;
  dragonEyes: [THREE.Vector3, THREE.Vector3];
  dragonHead: THREE.Vector3;
  wingTips: THREE.Vector3[];
  wingLeft: THREE.Vector3[];
  wingRight: THREE.Vector3[];
  /** top points of spikes/pinnacles usable for gerbs/comets */
  roof: THREE.Vector3[];
}

/**
 * The "crown" of the 2026 MainStage: the mechanical dragon (head, crest, jaws, neck, rider figure)
 * and the two giant mechanical wings with rosettes (STUB — replaced during implementation).
 * Built in its own local space where x=0 is the stage centre line, y=0 the ground, z=0 the stage
 * front edge; MainStageSystem adds `group` to the stage root without transforming it.
 */
export class DragonCrown {
  readonly group = new THREE.Group();

  async build(_q: QualitySettings): Promise<void> {
    this.group.name = 'DragonCrown';
    const m = new THREE.MeshStandardMaterial({ color: '#5a1010', metalness: 0.8, roughness: 0.4 });
    const head = new THREE.Mesh(new THREE.ConeGeometry(6, 16, 8), m);
    head.position.set(0, 30, -6);
    this.group.add(head);
  }

  update(_ctx: FrameContext, _look: StageLook): void {}

  anchors(): CrownAnchors {
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    return {
      dragonMouth: v(0, 24, -3),
      dragonEyes: [v(-3, 31, -4), v(3, 31, -4)],
      dragonHead: v(0, 30, -5),
      wingTips: [v(-60, 42, -8), v(60, 42, -8)],
      wingLeft: [v(-20, 38, -8), v(-35, 42, -8), v(-50, 40, -8)],
      wingRight: [v(20, 38, -8), v(35, 42, -8), v(50, 40, -8)],
      roof: [v(-55, 44, -8), v(-30, 46, -8), v(0, 42, -6), v(30, 46, -8), v(55, 44, -8)],
    };
  }

  setQuality(_q: QualitySettings): void {}

  stats(): Record<string, number | string> {
    return {};
  }
}
