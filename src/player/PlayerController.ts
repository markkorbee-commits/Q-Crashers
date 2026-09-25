import * as THREE from 'three';
import type { App } from '../core/App';
import { clamp, lerp, smoothstep } from '../core/rng';
import type { FrameContext, Interactable, NamedSpot, System } from '../core/types';
import type { MotorEffects } from '../intoxication/PerceptionSystem';
import { damp, wobble } from './motion';
import { DEFAULT_SPOTS, DEFAULT_START_SPOT } from './spots';

/** A raised walkable area (e.g. the stage deck). Walkers below its top treat it as a wall. */
export interface Platform {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** walking surface height (m) */
  y: number;
}

type DensityProvider = { densityAt(x: number, z: number): number };
type HeightProvider = { heightAt(x: number, z: number): number };

const SOBER: MotorEffects = { sway: 0, inputLag: 0, balance: 0, lookJitter: 0, speedScale: 1 };
const GRAVITY = 9.81;
const TAU = Math.PI * 2;

/**
 * Replays movement intent `lag` seconds late (reaction time under the influence).
 * Fixed ring buffer, no allocations; jump presses are never lost, only delayed.
 */
class InputDelay {
  private static readonly N = 256;
  private t = new Float64Array(InputDelay.N);
  private x = new Float32Array(InputDelay.N);
  private y = new Float32Array(InputDelay.N);
  private flags = new Uint8Array(InputDelay.N);
  private head = 0;
  private count = 0;
  readonly out = { x: 0, y: 0, run: false, jump: false };

  push(time: number, x: number, y: number, run: boolean, jump: boolean): void {
    if (this.count === InputDelay.N) this.consume(); // overflow: oldest sample is due anyway
    const i = (this.head + this.count) % InputDelay.N;
    this.t[i] = time;
    this.x[i] = x;
    this.y[i] = y;
    this.flags[i] = (run ? 1 : 0) | (jump ? 2 : 0);
    this.count++;
  }

  /** advance to `time - lag`; `out` then holds the delayed intent */
  sample(time: number, lag: number): void {
    this.out.jump = false;
    const due = time - lag;
    while (this.count > 0 && this.t[this.head] <= due) this.consume();
  }

  clear(): void {
    this.count = 0;
    this.out.x = this.out.y = 0;
    this.out.run = this.out.jump = false;
  }

  private consume(): void {
    const i = this.head;
    this.out.x = this.x[i];
    this.out.y = this.y[i];
    this.out.run = (this.flags[i] & 1) !== 0;
    if (this.flags[i] & 2) this.out.jump = true;
    this.head = (i + 1) % InputDelay.N;
    this.count--;
  }
}

/**
 * The spectator's body: human-scale walking / running / jumping with smooth acceleration,
 * collision sliding, crowd slow-down and jostle, intoxication motor effects, head bob and
 * interaction targeting. The CameraRig turns the exposed `eyeOffset` / `eyeRot` into the view.
 *
 * Human scale: body 1.80 m, eyes 1.68 m, walk 1.4 m/s, run 3.4 m/s, jump ~0.35 m.
 */
export class PlayerController implements System {
  readonly name = 'player';
  static readonly EYE_HEIGHT = 1.68;
  static readonly BODY_HEIGHT = 1.8;
  static readonly RADIUS = 0.28;
  static readonly JUMP_HEIGHT = 0.35;
  /** highest ledge you can simply walk onto */
  static readonly STEP_HEIGHT = 0.45;

  /** look direction (radians, 0 = facing -Z = the stage) */
  yaw = 0;
  pitch = 0;
  readonly velocity = new THREE.Vector3();
  /** vertical offset of the body from jumping (m, >= 0) */
  jumpY = 0;
  /** when false, the body ignores input (free / flyover / show / photo cameras) */
  controlsActive = true;
  walkSpeed = 1.4;
  runSpeed = 3.4;
  lookSensitivity = 0.0022;

  /** horizontal speed (m/s) and stride cycle 0..1 (two steps) — drives head bob and the avatar */
  speed = 0;
  stridePhase = 0;
  grounded = true;
  running = false;
  /** smoothed crowd density at the body (people / m²) */
  crowdDensity = 0;
  /** camera-local eye offset from bob / landing / sway (x right, y up) in metres */
  readonly eyeOffset = new THREE.Vector3();
  /** eye rotation offsets (x pitch, y yaw, z roll) in radians */
  readonly eyeRot = new THREE.Vector3();
  /** body lean from intoxication (x roll, z pitch) for the third-person avatar */
  readonly bodyLean = { roll: 0, pitch: 0 };
  /** incremented on every teleport so cameras can snap instead of gliding */
  teleports = 0;
  /** raised walkable areas; default = the MainStage deck (spots with y > 0 stand on it) */
  readonly platforms: Platform[] = [{ minX: -70, maxX: 70, minZ: -20, maxZ: 0, y: 2.2 }];
  /** walkable fallback bounds (the world registers the real perimeter as colliders) */
  readonly bounds = { minX: -280, maxX: 280, minZ: -40, maxZ: 460 };
  /** optional hook for footstep sounds (called on every heel strike) */
  onFootstep: ((running: boolean) => void) | null = null;

  private app!: App;
  private jumpV = 0;
  private jumpQueued = false;
  private platform: Platform | null = null;
  private delay = new InputDelay();
  private pendingLookX = 0;
  private pendingLookY = 0;
  private bobEnv = 0;
  private dip = 0;
  private dipV = 0;
  private current: Interactable | null = null;
  private currentLabel: string | null = null;
  private perception: { motor?: MotorEffects } | null | undefined;
  private terrain: HeightProvider | null | undefined;
  private crowd: DensityProvider | null | undefined;

  init(app: App): void {
    this.app = app;
    const deck = app.anchors.get('deck_front');
    if (deck.length) this.platforms[0].y = deck[0].y; // stage system owns the deck height
    for (const s of DEFAULT_SPOTS) if (!app.spots.some((x) => x.id === s.id)) app.addSpot(s);
    const want = app.params.get('spot') ?? DEFAULT_START_SPOT;
    const start = app.spots.find((s) => s.id === want) ?? app.spots.find((s) => s.id === DEFAULT_START_SPOT);
    if (start) this.teleport(start);
  }

  teleport(spot: NamedSpot): void {
    const p = this.app.playerPos;
    p.copy(spot.position);
    this.platform = this.platformAt(p.x, p.z, p.y);
    if (this.platform) p.y = this.platform.y;
    else p.y = this.groundAt(p.x, p.z);
    this.yaw = spot.yaw;
    this.pitch = spot.pitch ?? 0;
    this.velocity.set(0, 0, 0);
    this.jumpY = this.jumpV = 0;
    this.dip = this.dipV = 0;
    this.grounded = true;
    this.delay.clear();
    this.teleports++;
  }

  /** queue a jump (keyboard Space or the touch button); honours the reaction-time delay */
  requestJump(): void {
    this.jumpQueued = true;
  }

  /** interact with the currently targeted interactable (KeyE / touch button) */
  interact(): void {
    if (!this.current) return;
    try {
      this.current.onInteract();
    } catch (e) {
      console.error('[player] interaction failed', e);
    }
  }

  /** the interactable currently in reach and view (null when none) */
  get target(): Interactable | null {
    return this.current;
  }

  /** true while standing on a raised platform (stage deck) */
  get onPlatform(): boolean {
    return this.platform !== null;
  }

  update(ctx: FrameContext): void {
    const dt = ctx.dt;
    const app = this.app;
    const input = app.input;
    const motor = this.motor();
    const p = app.playerPos;
    const t = ctx.time;

    // --- look (sluggish when reaction time is impaired) --------------------------------------
    const cmd = this.delay.out;
    if (this.controlsActive) {
      this.pendingLookX += input.look.x;
      this.pendingLookY += input.look.y;
      const k = motor.inputLag > 0.01 ? damp(1 / (motor.inputLag * 0.6), dt) : 1;
      const lx = this.pendingLookX * k;
      const ly = this.pendingLookY * k;
      this.pendingLookX -= lx;
      this.pendingLookY -= ly;
      this.yaw -= lx * this.lookSensitivity;
      this.pitch = clamp(this.pitch - ly * this.lookSensitivity, -1.45, 1.45);

      this.delay.push(t, input.move.x, input.move.y, input.run, this.jumpQueued || input.pressed('Space'));
      this.jumpQueued = false;
      this.delay.sample(t, motor.inputLag);
      if (input.pressed('KeyE')) this.interact();
    } else {
      this.pendingLookX = this.pendingLookY = 0;
      this.jumpQueued = false;
      this.delay.clear();
    }

    // --- crowd density ---------------------------------------------------------------------
    const density = this.densityAt(p.x, p.z);
    this.crowdDensity += (density - this.crowdDensity) * damp(3, dt);
    const crowd01 = smoothstep(0.3, 3, this.crowdDensity);

    // --- walking intent -> target velocity -------------------------------------------------
    const mag = Math.min(1, Math.hypot(cmd.x, cmd.y));
    let tx = 0,
      tz = 0;
    if (mag > 0.01) {
      const fwd = cmd.y / mag;
      const dirScale = fwd >= 0 ? lerp(0.85, 1, fwd) : lerp(0.85, 0.65, -fwd); // strafing / backing up is slower
      const base = cmd.run ? this.runSpeed : this.walkSpeed;
      const target = base * mag * dirScale * motor.speedScale * lerp(1, 0.45, crowd01);
      const veer = motor.balance * 0.35 * wobble(t * 0.31, 3); // drunk walkers drift off their line
      const s = Math.sin(this.yaw + veer),
        c = Math.cos(this.yaw + veer);
      tx = ((-s * cmd.y + c * cmd.x) / mag) * target;
      tz = ((-c * cmd.y - s * cmd.x) / mag) * target;
    }
    this.running = cmd.run && mag > 0.5;
    const accelerating = tx * tx + tz * tz > this.velocity.x ** 2 + this.velocity.z ** 2;
    const a = damp(this.grounded ? (accelerating ? 5.5 : 8.5) : 1.2, dt);
    this.velocity.x += (tx - this.velocity.x) * a;
    this.velocity.z += (tz - this.velocity.z) * a;
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    const moving01 = smoothstep(0.1, 1.2, this.speed);

    // balance loss + crowd jostle: bounded lateral / longitudinal nudges on top of walking
    let ex = 0,
      ez = 0;
    if (this.controlsActive) {
      const lateral = motor.balance * (0.12 + 0.45 * moving01) * wobble(t * 0.43, 7) + crowd01 * (0.06 + 0.2 * moving01) * wobble(t * 1.7, 11);
      const along = crowd01 * 0.08 * wobble(t * 1.3, 5);
      const s = Math.sin(this.yaw),
        c = Math.cos(this.yaw);
      ex = c * lateral - s * along;
      ez = -s * lateral - c * along;
    }
    p.x += (this.velocity.x + ex) * dt;
    p.z += (this.velocity.z + ez) * dt;

    // --- jump / fall -------------------------------------------------------------------------
    if (cmd.jump && this.grounded && this.controlsActive) {
      this.jumpV = Math.sqrt(2 * GRAVITY * PlayerController.JUMP_HEIGHT);
      this.grounded = false;
    }
    if (!this.grounded) {
      this.jumpV -= GRAVITY * dt;
      this.jumpY += this.jumpV * dt;
      if (this.jumpY <= 0) {
        this.dipV -= Math.min(4, -this.jumpV) * 0.2; // knees absorb the landing
        this.jumpY = this.jumpV = 0;
        this.grounded = true;
      }
    }

    this.collide(p);
    this.updateHeight(p, dt);
    this.updateEyes(ctx, motor, crowd01);
    this.updateInteraction(p);
  }

  // ------------------------------------------------------------------------------------------

  private motor(): MotorEffects {
    if (this.perception === undefined) this.perception = (this.app.get('perception') as { motor?: MotorEffects } | undefined) ?? null;
    return this.perception?.motor ?? SOBER;
  }

  private densityAt(x: number, z: number): number {
    if (this.crowd === undefined) {
      const c = this.app.get('crowd');
      this.crowd = c && 'densityAt' in c && typeof (c as { densityAt?: unknown }).densityAt === 'function' ? (c as unknown as DensityProvider) : null;
    }
    if (!this.crowd || !this.app.isSystemEnabled('crowd')) return 0;
    const d = this.crowd.densityAt(x, z);
    return Number.isFinite(d) ? Math.max(0, d) : 0;
  }

  /** terrain height (m) at x,z; 0 when the terrain system has no height field */
  groundAt(x: number, z: number): number {
    if (this.terrain === undefined) {
      const t = this.app.get('terrain');
      this.terrain = t && 'heightAt' in t ? (t as unknown as HeightProvider) : null;
    }
    const h = this.terrain?.heightAt(x, z);
    return typeof h === 'number' && Number.isFinite(h) ? h : 0;
  }

  private platformAt(x: number, z: number, y: number): Platform | null {
    for (const pl of this.platforms) {
      if (x >= pl.minX && x <= pl.maxX && z >= pl.minZ && z <= pl.maxZ && y >= pl.y - PlayerController.STEP_HEIGHT) return pl;
    }
    return null;
  }

  private updateHeight(p: THREE.Vector3, dt: number): void {
    if (this.platform) {
      p.y = this.platform.y;
      return;
    }
    const h = this.groundAt(p.x, p.z);
    p.y += (h - p.y) * damp(18, dt);
  }

  /** push the body circle out of colliders / platform walls, sliding along them */
  private collide(p: THREE.Vector3): void {
    const r = PlayerController.RADIUS;
    const pl = this.platform;
    if (pl) {
      // on the deck: stay on it (edge rail), only deck obstacles collide
      p.x = clamp(p.x, pl.minX + r, pl.maxX - r);
      p.z = clamp(p.z, pl.minZ + r, pl.maxZ - r);
    }
    for (let pass = 0; pass < 2; pass++) {
      for (const c of this.app.colliders) {
        if (pl && !(c.tag && c.tag.startsWith('deck'))) continue;
        if (c.kind === 'circle') this.pushCircle(p, c.x, c.z, c.r + r);
        else this.pushBox(p, c.minX, c.maxX, c.minZ, c.maxZ, r);
      }
      if (!pl) {
        for (const w of this.platforms) if (p.y < w.y - PlayerController.STEP_HEIGHT) this.pushBox(p, w.minX, w.maxX, w.minZ, w.maxZ, r);
      }
    }
    const b = this.bounds;
    if (p.x < b.minX) this.slide(p, b.minX - p.x, 1, 0);
    if (p.x > b.maxX) this.slide(p, p.x - b.maxX, -1, 0);
    if (p.z < b.minZ) this.slide(p, b.minZ - p.z, 0, 1);
    if (p.z > b.maxZ) this.slide(p, p.z - b.maxZ, 0, -1);
  }

  private pushCircle(p: THREE.Vector3, cx: number, cz: number, min: number): void {
    const dx = p.x - cx,
      dz = p.z - cz;
    if (Math.abs(dx) >= min || Math.abs(dz) >= min) return;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) return;
    const d = Math.sqrt(d2);
    if (d < 1e-6) this.slide(p, min, 1, 0);
    else this.slide(p, min - d, dx / d, dz / d);
  }

  private pushBox(p: THREE.Vector3, minX: number, maxX: number, minZ: number, maxZ: number, r: number): void {
    if (p.x < minX - r || p.x > maxX + r || p.z < minZ - r || p.z > maxZ + r) return;
    const qx = clamp(p.x, minX, maxX),
      qz = clamp(p.z, minZ, maxZ);
    const dx = p.x - qx,
      dz = p.z - qz;
    const d2 = dx * dx + dz * dz;
    if (d2 > 1e-12) {
      if (d2 >= r * r) return;
      const d = Math.sqrt(d2);
      this.slide(p, r - d, dx / d, dz / d);
      return;
    }
    // centre inside the box: leave through the nearest face
    const l = p.x - minX,
      rr = maxX - p.x,
      b = p.z - minZ,
      f = maxZ - p.z;
    const m = Math.min(l, rr, b, f);
    if (m === l) this.slide(p, l + r, -1, 0);
    else if (m === rr) this.slide(p, rr + r, 1, 0);
    else if (m === b) this.slide(p, b + r, 0, -1);
    else this.slide(p, f + r, 0, 1);
  }

  /** move by `depth` along normal (nx, nz) and remove velocity going into the surface */
  private slide(p: THREE.Vector3, depth: number, nx: number, nz: number): void {
    p.x += nx * depth;
    p.z += nz * depth;
    const vn = this.velocity.x * nx + this.velocity.z * nz;
    if (vn < 0) {
      this.velocity.x -= vn * nx;
      this.velocity.z -= vn * nz;
    }
  }

  /** head bob, landing dip, intoxication sway, look jitter and crowd bumps */
  private updateEyes(ctx: FrameContext, motor: MotorEffects, crowd01: number): void {
    const dt = ctx.dt;
    const t = ctx.time;
    const v = this.speed;
    if (this.grounded) {
      const stride = lerp(1.4, 2.4, clamp((v - 1.4) / 2, 0, 1)); // two steps per stride
      const prev = this.stridePhase;
      this.stridePhase = (prev + (v * dt) / stride) % 1;
      if (this.onFootstep && v > 0.3 && Math.floor(prev * 2) !== Math.floor(this.stridePhase * 2)) this.onFootstep(this.running);
    }
    const env = this.grounded ? smoothstep(0.15, 1.1, v) : 0;
    this.bobEnv += (env - this.bobEnv) * damp(6, dt);
    const runK = clamp((v - 1.6) / 1.6, 0, 1);
    const ph = this.stridePhase * TAU;
    const ampV = lerp(0.0075, 0.013, runK) * this.bobEnv; // 1.5 cm peak-to-peak when walking
    const ampL = lerp(0.008, 0.006, runK) * this.bobEnv;

    // landing dip: critically-ish damped spring, sub-stepped for stability
    const steps = Math.max(1, Math.ceil(dt / 0.012));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.dipV += (-220 * this.dip - 22 * this.dipV) * h;
      this.dip += this.dipV * h;
    }

    const sway = motor.sway;
    const jit = motor.lookJitter;
    const idle = 1 - this.bobEnv; // standing people breathe and shift their weight a little
    const o = this.eyeOffset;
    o.x = ampL * Math.sin(ph) + sway * 0.07 * wobble(t * 0.37, 1) + idle * 0.004 * wobble(t * 0.21, 13);
    o.y = -ampV * Math.cos(2 * ph) + this.dip + sway * 0.02 * wobble(t * 0.29, 2) + idle * 0.0025 * Math.sin(t * 1.45);
    o.z = 0;
    const r = this.eyeRot;
    r.x = 0.0015 * Math.sin(2 * ph) * this.bobEnv + sway * 0.012 * wobble(t * 0.31, 5) + jit * 0.004 * wobble(t * 6.1, 8) + idle * 0.0006 * wobble(t * 0.33, 14);
    r.y = sway * 0.02 * wobble(t * 0.19, 4) + jit * 0.005 * wobble(t * 5.3, 9) + idle * 0.0008 * wobble(t * 0.17, 15);
    r.z = 0.0022 * Math.sin(ph) * this.bobEnv + sway * 0.04 * wobble(t * 0.23, 3) + crowd01 * 0.006 * wobble(t * 1.9, 12);
    this.bodyLean.roll = sway * 0.07 * wobble(t * 0.23, 3);
    this.bodyLean.pitch = sway * 0.04 * wobble(t * 0.31, 5);
  }

  /** nearest interactable within its radius that the spectator roughly faces */
  private updateInteraction(p: THREE.Vector3): void {
    let best: Interactable | null = null;
    let bestScore = Infinity;
    if (this.controlsActive) {
      const fx = -Math.sin(this.yaw),
        fz = -Math.cos(this.yaw);
      const eyeY = p.y + PlayerController.EYE_HEIGHT;
      for (const it of this.app.interactables) {
        const dx = it.position.x - p.x,
          dz = it.position.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d > it.radius || Math.abs(it.position.y - eyeY) > it.radius + 2.5) continue;
        const facing = d > 1e-3 ? (dx * fx + dz * fz) / d : 1;
        if (d > 1.2 && facing < 0.5) continue; // ~60 deg cone, unless right next to it
        const score = d * (1.8 - facing);
        if (score < bestScore) {
          bestScore = score;
          best = it;
        }
      }
    }
    const label = best ? best.label : null;
    if (best !== this.current || label !== this.currentLabel) {
      this.current = best;
      this.currentLabel = label;
      this.app.events.emit('interact:prompt', { label });
    }
  }

  stats(): Record<string, number | string> {
    const p = this.app.playerPos;
    return {
      pos: `${p.x.toFixed(1)},${p.y.toFixed(2)},${p.z.toFixed(1)}`,
      speed: this.speed.toFixed(2),
      density: this.crowdDensity.toFixed(2),
      target: this.currentLabel ?? '-',
    };
  }
}
