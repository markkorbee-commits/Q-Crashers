import * as THREE from 'three';
import type { App } from '../core/App';
import { clamp } from '../core/rng';
import type { FrameContext, NamedSpot, System } from '../core/types';

/**
 * The spectator's body: walking, running, jumping, collision (STUB baseline — extended during
 * implementation with crowd push-through, balance/sway from intoxication, footsteps...).
 * Human scale: body height 1.80 m, eye height 1.68 m, walk 1.4 m/s, run 3.4 m/s.
 */
export class PlayerController implements System {
  readonly name = 'player';
  static readonly EYE_HEIGHT = 1.68;
  static readonly BODY_HEIGHT = 1.8;
  static readonly RADIUS = 0.28;
  yaw = 0;
  pitch = 0;
  readonly velocity = new THREE.Vector3();
  /** vertical offset from jumping */
  jumpY = 0;
  private jumpV = 0;
  /** when false, the player body ignores input (free/flyover/show cameras) */
  controlsActive = true;
  walkSpeed = 1.4;
  runSpeed = 3.4;
  lookSensitivity = 0.0022;
  private app!: App;

  init(app: App): void {
    this.app = app;
    const start = app.params.get('spot');
    app.addSpot({ id: 'entrance', label: 'Field entrance', position: new THREE.Vector3(0, 0, 230), yaw: 0 });
    if (!start) app.playerPos.set(0, 0, 230);
  }

  teleport(spot: NamedSpot): void {
    this.app.playerPos.copy(spot.position);
    this.yaw = spot.yaw;
    this.pitch = spot.pitch ?? 0;
    this.velocity.set(0, 0, 0);
  }

  update(ctx: FrameContext): void {
    const input = this.app.input;
    if (this.controlsActive) {
      this.yaw -= input.look.x * this.lookSensitivity;
      this.pitch = clamp(this.pitch - input.look.y * this.lookSensitivity, -1.45, 1.45);
      const speed = input.run ? this.runSpeed : this.walkSpeed;
      const fx = -Math.sin(this.yaw),
        fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw),
        rz = -Math.sin(this.yaw);
      const tx = (fx * input.move.y + rx * input.move.x) * speed;
      const tz = (fz * input.move.y + rz * input.move.x) * speed;
      const a = 1 - Math.exp(-ctx.dt * 10);
      this.velocity.x += (tx - this.velocity.x) * a;
      this.velocity.z += (tz - this.velocity.z) * a;
      if (input.pressed('Space') && this.jumpY <= 0) this.jumpV = 3.2;
    } else {
      this.velocity.multiplyScalar(0.8);
    }
    const p = this.app.playerPos;
    p.x += this.velocity.x * ctx.dt;
    p.z += this.velocity.z * ctx.dt;
    this.jumpV -= 9.81 * ctx.dt;
    this.jumpY = Math.max(0, this.jumpY + this.jumpV * ctx.dt);
    if (this.jumpY <= 0) this.jumpV = 0;
    this.collide(p);
  }

  /** resolve collisions against 2D colliders */
  private collide(p: THREE.Vector3) {
    const r = PlayerController.RADIUS;
    for (const c of this.app.colliders) {
      if (c.kind === 'circle') {
        const dx = p.x - c.x,
          dz = p.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + r;
        if (d < min && d > 1e-6) {
          p.x = c.x + (dx / d) * min;
          p.z = c.z + (dz / d) * min;
        }
      } else {
        if (p.x > c.minX - r && p.x < c.maxX + r && p.z > c.minZ - r && p.z < c.maxZ + r) {
          const pushL = p.x - (c.minX - r),
            pushR = c.maxX + r - p.x,
            pushB = p.z - (c.minZ - r),
            pushF = c.maxZ + r - p.z;
          const m = Math.min(pushL, pushR, pushB, pushF);
          if (m === pushL) p.x = c.minX - r;
          else if (m === pushR) p.x = c.maxX + r;
          else if (m === pushB) p.z = c.minZ - r;
          else p.z = c.maxZ + r;
        }
      }
    }
  }
}
