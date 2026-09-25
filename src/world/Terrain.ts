import * as THREE from 'three';
import type { App } from '../core/App';
import type { FrameContext, QualitySettings, System } from '../core/types';

/** Ground surface, paths, trackway plates, playable bounds (STUB — replaced during implementation). */
export class TerrainSystem implements System {
  readonly name = 'terrain';

  init(app: App): void {
    const g = new THREE.PlaneGeometry(1600, 1600);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshStandardMaterial({ color: '#2d3a1c', roughness: 1 });
    const ground = new THREE.Mesh(g, m);
    ground.name = 'ground';
    app.scene.add(ground);
    // placeholder stage block so the scaffold is navigable
    const stage = new THREE.Mesh(new THREE.BoxGeometry(120, 40, 20), new THREE.MeshStandardMaterial({ color: '#401010', emissive: '#300808' }));
    stage.position.set(0, 20, -10);
    stage.name = 'placeholder-stage';
    app.scene.add(stage);
  }

  /** ground height at x,z (flat field) */
  heightAt(_x: number, _z: number): number {
    return 0;
  }

  update(_ctx: FrameContext): void {}

  setQuality(_q: QualitySettings): void {}
}
