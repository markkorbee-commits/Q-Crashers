import * as THREE from 'three';
import type { App } from '../core/App';
import { clamp } from '../core/rng';
import type { FrameContext, System } from '../core/types';
import { PlayerController } from '../player/PlayerController';

export type CameraMode = 'first' | 'third' | 'free' | 'flyover' | 'showcam' | 'photo';

/**
 * Camera modes (STUB baseline: first + free). Extended during implementation with third person
 * avatar, cinematic fly-over, show camera, photo mode.
 */
export class CameraRig implements System {
  readonly name = 'camera';
  mode: CameraMode = 'first';
  private app!: App;
  private player!: PlayerController;
  private freePos = new THREE.Vector3(0, 30, 200);
  private freeYaw = 0;
  private freePitch = -0.1;

  init(app: App): void {
    this.app = app;
    this.player = app.get<PlayerController>('player')!;
    const cam = app.params.get('cam');
    if (cam) {
      const [x, y, z, yaw, pitch] = cam.split(',').map(Number);
      this.mode = 'free';
      this.freePos.set(x, y, z);
      this.freeYaw = yaw || 0;
      this.freePitch = pitch || 0;
    }
  }

  setMode(mode: CameraMode): void {
    if (mode === this.mode) return;
    if (mode === 'free') {
      this.freePos.copy(this.app.camera.position);
      this.freeYaw = this.player.yaw;
      this.freePitch = this.player.pitch;
    }
    this.mode = mode;
    this.player.controlsActive = mode === 'first' || mode === 'third';
    this.app.events.emit('camera:mode', { mode });
  }

  update(ctx: FrameContext): void {
    const cam = this.app.camera;
    if (this.mode === 'free' || this.mode === 'photo') {
      const input = this.app.input;
      this.freeYaw -= input.look.x * 0.0022;
      this.freePitch = clamp(this.freePitch - input.look.y * 0.0022, -1.5, 1.5);
      const speed = (input.run ? 40 : 12) * ctx.dt;
      const fx = -Math.sin(this.freeYaw) * Math.cos(this.freePitch),
        fy = Math.sin(this.freePitch),
        fz = -Math.cos(this.freeYaw) * Math.cos(this.freePitch);
      const rx = Math.cos(this.freeYaw),
        rz = -Math.sin(this.freeYaw);
      this.freePos.x += (fx * input.move.y + rx * input.move.x) * speed;
      this.freePos.y += (fy * input.move.y + input.vertical) * speed;
      this.freePos.z += (fz * input.move.y + rz * input.move.x) * speed;
      this.freePos.y = Math.max(0.3, this.freePos.y);
      cam.position.copy(this.freePos);
      cam.rotation.set(this.freePitch, this.freeYaw, 0, 'YXZ');
      return;
    }
    const p = this.app.playerPos;
    cam.position.set(p.x, p.y + PlayerController.EYE_HEIGHT + this.player.jumpY, p.z);
    cam.rotation.set(this.player.pitch, this.player.yaw, 0, 'YXZ');
  }
}
