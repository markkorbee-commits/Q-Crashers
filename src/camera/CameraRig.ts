import * as THREE from 'three';
import type { App } from '../core/App';
import { clamp, smoothstep } from '../core/rng';
import type { FrameContext, QualitySettings, System } from '../core/types';
import { Avatar } from '../player/Avatar';
import { damp, easeInOut, wobble } from '../player/motion';
import { PlayerController } from '../player/PlayerController';
import { RideArm } from '../player/rideArm';
import { STAGE_FOCUS } from '../player/spots';
import { FlyoverPath } from './FlyoverPath';
import { SHOT_FOV, ShowDirector, type ShotPose } from './ShowDirector';

export type CameraMode = 'first' | 'third' | 'free' | 'flyover' | 'showcam';
/** keyboard order: 1..5 */
export const CAMERA_MODES: readonly CameraMode[] = ['first', 'third', 'free', 'flyover', 'showcam'];

const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
const NUMPAD = ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5'];
/** modes that sit near the spectator and may glide into each other instead of cutting */
const GLIDE = new Set<CameraMode>(['first', 'third', 'free']);
/**
 * exposure of the Show camera: the film crew exposed for the lit set and the fire, so the dark grounds sink away.
 * Measured on the default 64 moments of the official video (scripts/similarity.mjs, Mac GPU, after round 4):
 * 1 -> 27.9 %, 0.7 -> 31.8 %, 0.6 -> 32.9 %, 0.5 -> 34.0 %, 0.4 -> 34.3 % (colour starts to drop).
 */
const SHOWCAM_EXPOSURE = 0.5;
/** shortest third-person arm (m) on the Ferris wheel: the rider, the car and the show all in frame */
const RIDE_ARM = 4.5;

/**
 * All camera modes:
 *  - first:   the spectator's eyes (+ head bob, jump, sway, felt-bass micro shake)
 *  - third:   spring-arm over-the-shoulder camera around a procedural festival-goer avatar
 *  - free:    fly camera (WASD + mouse, Space / C up-down, Shift fast, wheel = speed)
 *  - flyover: cinematic looping drone path derived from the stage anchors
 *  - showcam: director camera (authored `camera` cues, else automatic bar-synced cutting)
 * Keys: 1..5 select modes, V toggles first/third. `setMode('first')` always returns to your view.
 */
export class CameraRig implements System {
  readonly name = 'camera';
  mode: CameraMode = 'first';
  /** subtle "felt bass" micro shake (max ~2 mm) near the stage in first person */
  bassShake = true;
  /** third-person arm length (m), mouse wheel zooms 1.5..8 */
  armLength = 3.2;
  freeSpeed = 12;
  freeFastSpeed = 45;
  /** multiplier on free-fly speed (mouse wheel) */
  freeSpeedScale = 1;
  /** vertical intent from touch buttons (free camera): +1 up, -1 down */
  touchVertical = 0;
  avatar: Avatar | null = null;

  private app!: App;
  private player!: PlayerController;
  private baseFov = 72;
  private flyover = new FlyoverPath();
  private director!: ShowDirector;
  private flyTime = 0;
  private freePos = new THREE.Vector3(0, 30, 200);
  private freeVel = new THREE.Vector3();
  private freeYaw = 0;
  private freePitch = -0.1;
  private pivot = new THREE.Vector3();
  private arm = 3.2;
  private seenTeleports = -1;
  /** 0..1 how far the third-person camera is raised over a dense crowd */
  private crowdLift = 0;
  /** 0..1 third-person "this is you" rim on the avatar */
  private selfRim = 0;
  private pendingMode: CameraMode | null = null;
  /** third-person lens while riding the Ferris wheel (clear of rims, spokes, cars and legs) */
  private readonly rideArm = new RideArm();
  private readonly rideLens = new THREE.Vector3();
  /** the player was in / at a gondola last third-person frame; seconds left of the glide back to the plain arm */
  private wasMounted = false;
  private dismount = 0;
  private blend = { t: 1, dur: 0.65, checked: true, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 72 };
  private pose: ShotPose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50, roll: 0, haze: 1 };
  /**
   * 0.35..1 atmospheric haze scale requested by the current camera (1 = as the eye sees it).
   * The show camera lowers it for telephoto and in-pit framings (ShowDirector.hazeFor). Haze
   * renderers multiply their veil density by it (read it at render time, e.g. in onBeforeRender,
   * to stay in sync with cuts).
   */
  hazeScale = 1;
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private q1 = new THREE.Quaternion();

  init(app: App): void {
    this.app = app;
    this.player = app.get<PlayerController>('player')!;
    this.director = new ShowDirector(app);
    this.baseFov = app.device.mobile ? 70 : 72;
    this.avatar = new Avatar({ detail: app.quality.level === 'mobile' ? 'low' : 'high', textureSize: app.quality.textureSize });
    this.avatar.root.visible = false;
    app.scene.add(this.avatar.root);
    this.seenTeleports = this.player.teleports;
    this.snapPivot();

    const cam = app.params.get('cam');
    // a viewer who chose the directed show camera last time starts there again
    const remembered = !app.params.has('spot') && this.player.rememberedStart === 'showcam' ? 'showcam' : null;
    const want = (app.params.get('camera') ?? this.pendingMode ?? remembered) as CameraMode | null;
    // free starts at the spectator's eyes unless ?cam= gives a pose
    const p = app.playerPos;
    this.freePos.set(p.x, p.y + PlayerController.EYE_HEIGHT, p.z);
    this.freeYaw = this.player.yaw;
    this.freePitch = this.player.pitch;
    if (cam) {
      const [x, y, z, yaw, pitch] = cam.split(',').map(Number);
      this.freePos.set(x || 0, Number.isFinite(y) ? y : 30, z || 0);
      this.freeYaw = yaw || 0;
      this.freePitch = pitch || 0;
      this.enter('free', false);
    } else if (want && CAMERA_MODES.includes(want)) {
      this.enter(want, false);
    }
  }

  /** field of view (degrees) of the eye / third-person / free cameras (user setting) */
  get fovSetting(): number {
    return this.baseFov;
  }

  setBaseFov(v: number): void {
    this.baseFov = clamp(v, 50, 100);
  }

  setMode(mode: CameraMode): void {
    if (mode === this.mode || !CAMERA_MODES.includes(mode)) return;
    if (!this.app) {
      this.pendingMode = mode; // requested before init: applied there
      return;
    }
    this.enter(mode, true);
  }

  /** Jump the free camera to an exact pose (QA tools, deep links). yaw 0 = looking at the stage. */
  setFreePose(x: number, y: number, z: number, yaw: number, pitch: number, fov?: number): void {
    if (this.mode !== 'free') this.enter('free', false);
    this.freePos.set(x, y, z);
    this.freeVel.set(0, 0, 0);
    this.freeYaw = yaw;
    this.freePitch = pitch;
    this.blend.t = this.blend.dur;
    // tools and ?cam= may frame like a long lens (the official edit uses ~6° telephotos): show-camera range
    if (fov) this.baseFov = clamp(fov, SHOT_FOV.min, SHOT_FOV.max);
  }

  /** V key / touch button: toggle between the eye view and the third-person avatar view */
  toggleView(): void {
    this.setMode(this.mode === 'first' ? 'third' : 'first');
  }

  // --- mode switching ---------------------------------------------------------------------------

  private enter(mode: CameraMode, glide: boolean): void {
    const app = this.app;
    const cam = app.camera;
    const prev = this.mode;
    if (mode === 'free') {
      if (glide) {
        this.freePos.copy(cam.position);
        this.euler.setFromQuaternion(cam.quaternion, 'YXZ');
        this.freePitch = this.euler.x;
        this.freeYaw = this.euler.y;
      }
      this.freeVel.set(0, 0, 0);
    }
    if (mode === 'flyover') {
      this.flyover.build(app.anchors);
      this.flyTime = 4; // start on the straight glide in
    }
    if (mode === 'showcam') this.director.build();
    if (mode === 'third') {
      this.snapPivot();
      this.arm = this.armLength;
      this.rideArm.reset();
      this.wasMounted = this.player.mounted;
      this.dismount = 0;
      // start on the crowd-aware arm (no rise from shoulder height through the neighbours' heads)
      this.crowdLift = smoothstep(0.6, 2.0, this.player.crowdDensity);
    }
    const b = this.blend;
    if (glide && GLIDE.has(prev) && GLIDE.has(mode)) {
      b.t = 0;
      b.checked = false;
      b.pos.copy(cam.position);
      b.quat.copy(cam.quaternion);
      b.fov = cam.fov;
    } else b.t = b.dur;
    this.mode = mode;
    this.player.controlsActive = mode === 'first' || mode === 'third';
    app.events.emit('camera:mode', { mode });
  }

  private snapPivot(): void {
    const p = this.app.playerPos;
    this.pivot.set(p.x, p.y + 1.62, p.z);
  }

  // --- per frame --------------------------------------------------------------------------------

  update(ctx: FrameContext): void {
    const app = this.app;
    const input = app.input;
    for (let i = 0; i < CAMERA_MODES.length; i++) if (input.pressed(DIGITS[i]) || input.pressed(NUMPAD[i])) this.setMode(CAMERA_MODES[i]);
    if (input.pressed('KeyV')) this.toggleView();
    if (this.player.teleports !== this.seenTeleports) {
      this.seenTeleports = this.player.teleports;
      this.snapPivot();
      // a teleport leaves the Ferris wheel at once: no glide from the gondola across the grounds
      this.rideArm.reset();
      this.wasMounted = this.player.mounted;
      this.dismount = 0;
      if (!this.player.controlsActive) this.setMode('first');
      this.blend.t = this.blend.dur;
    }

    const cam = app.camera;
    let fov = this.baseFov;
    switch (this.mode) {
      case 'first':
        this.updateFirst(ctx, cam);
        break;
      case 'third':
        this.updateThird(ctx, cam);
        break;
      case 'free':
        this.updateFree(ctx, cam);
        break;
      case 'flyover': {
        this.flyTime += ctx.dt;
        const roll = this.flyover.sample(this.flyTime, this.pose.pos, this.pose.look);
        // a real drone never holds perfectly still (unless the viewer asked for reduced motion)
        const drift = this.player.reduceMotion ? 0 : 1;
        this.pose.pos.x += 0.12 * drift * wobble(ctx.time * 0.7, 21);
        this.pose.pos.y += 0.08 * drift * wobble(ctx.time * 0.9, 22);
        cam.position.copy(this.pose.pos);
        cam.up.set(0, 1, 0);
        cam.lookAt(this.pose.look);
        cam.rotateZ(roll);
        fov = this.flyover.fovAt(this.pose.pos);
        break;
      }
      case 'showcam':
        this.director.steady = this.player.reduceMotion;
        this.director.evaluate(ctx.showTime, ctx.beat, this.pose);
        cam.position.copy(this.pose.pos);
        cam.up.set(0, 1, 0);
        cam.lookAt(this.pose.look);
        if (this.pose.roll) cam.rotateZ(this.pose.roll);
        fov = this.pose.fov;
        break;
    }

    app.postfx.cameraExposure = this.mode === 'showcam' ? SHOWCAM_EXPOSURE : 1;
    this.hazeScale = this.mode === 'showcam' ? this.pose.haze : 1;

    // glide between nearby modes instead of cutting
    const b = this.blend;
    if (b.t < b.dur) {
      if (!b.checked) {
        b.checked = true;
        if (b.pos.distanceTo(cam.position) > 40) b.t = b.dur;
      }
      b.t += ctx.dt;
      const s = easeInOut(b.t / b.dur);
      cam.position.lerpVectors(b.pos, cam.position, s);
      this.q1.copy(cam.quaternion);
      cam.quaternion.copy(b.quat).slerp(this.q1, s);
      fov = b.fov + (fov - b.fov) * s;
    }
    if (Math.abs(cam.fov - fov) > 1e-3) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    this.updateAvatar(ctx);
  }

  private updateFirst(ctx: FrameContext, cam: THREE.PerspectiveCamera): void {
    const pl = this.player;
    const p = this.app.playerPos;
    const o = pl.eyeOffset;
    const yaw = pl.yaw + pl.eyeRot.y;
    let pitch = clamp(pl.pitch + pl.eyeRot.x, -1.52, 1.52);
    const rx = Math.cos(yaw),
      rz = -Math.sin(yaw);
    let y = p.y + PlayerController.EYE_HEIGHT + pl.jumpY + o.y;
    // felt bass: a sub-perceptual body jolt on the kick close to the stacks (max ~2 mm)
    const beat = ctx.beat;
    if (this.bassShake && !pl.reduceMotion && beat.hasKick && ctx.showPlaying) {
      const d = Math.hypot(p.x * 0.6, Math.max(0, p.z));
      const a = (1 - smoothstep(8, 40, d)) * beat.kick * beat.kick * (0.4 + 0.6 * beat.energy);
      y -= 0.002 * a;
      pitch += 0.0004 * a;
    }
    // eye offset is camera-local: x right, z back (back = -forward = (sin yaw, cos yaw))
    const bx = Math.sin(yaw),
      bz = Math.cos(yaw);
    cam.position.set(p.x + rx * o.x + bx * o.z, y, p.z + rz * o.x + bz * o.z);
    cam.rotation.set(pitch, yaw, pl.eyeRot.z, 'YXZ');
  }

  private updateThird(ctx: FrameContext, cam: THREE.PerspectiveCamera): void {
    const pl = this.player;
    const p = this.app.playerPos;
    const dt = ctx.dt;
    const input = this.app.input;
    if (input.wheel) this.armLength = clamp(this.armLength * Math.exp(input.wheel * 0.0012), 1.5, 8);

    const yaw = pl.yaw + pl.eyeRot.y * 0.5;
    // in a packed crowd, raised arms (2.1–2.3 m) would fill a shoulder-height frame: the camera
    // rises well above the hands (≈ 2.9 m) on a slightly longer arm, tilting down onto the avatar. Looking up
    // (at the dragon, at fireworks) no longer swings the arm down between the neighbours: the arm
    // stays level above the heads and only the lens tilts up.
    const lift = (this.crowdLift += (smoothstep(0.6, 2.0, pl.crowdDensity) - this.crowdLift) * damp(2.5, dt));
    // over a packed crowd the lens looks ~9° further down onto the avatar and the stage beyond
    const pitch = clamp(pl.pitch - 0.16 * lift, -1.2, 1.25 - 1.2 * lift);
    const armPitch = pitch + (Math.min(pitch, -0.08) - pitch) * lift;
    const rx = Math.cos(yaw),
      rz = -Math.sin(yaw);
    // follow the head with a little lag (vertical lag softens jumps); seated in a Ferris wheel gondola
    // the head is ~0.45 m lower
    const tx = p.x + rx * pl.eyeOffset.x * 0.5,
      ty = p.y + 1.62 - 0.45 * pl.seated + pl.jumpY * 0.6,
      tz = p.z + rz * pl.eyeOffset.x * 0.5;
    this.pivot.x += (tx - this.pivot.x) * damp(16, dt);
    this.pivot.z += (tz - this.pivot.z) * damp(16, dt);
    this.pivot.y += (ty - this.pivot.y) * damp(9, dt);

    const cp = Math.cos(armPitch);
    const fx = -Math.sin(yaw) * cp,
      fy = Math.sin(armPitch),
      fz = -Math.cos(yaw) * cp;
    // Tribe mode: a crane-like arm ~3.5 m back and ~1.3 m over the head (camera ≈ 2.9 m), so the
    // frame shows YOU in the crowd and the show, not the neighbours' heads
    const side = 0.34 * (1 - 0.35 * lift),
      up = 0.28 + 1.0 * lift;
    const L = this.armLength * (1 + 0.1 * lift);
    // desired camera position and spring-arm collision against the 2D colliders. In / at a Ferris wheel
    // gondola the ride's own arm keeps the lens clear of the wheel (player/rideArm.ts): the platform
    // rails would pinch a 2D arm at every height, and rims, spokes, cars and legs need a 3D test.
    const dx = -fx * L + rx * side,
      dz = -fz * L + rz * side;
    const mounted = pl.mounted;
    const last = cam.position;
    if (mounted !== this.wasMounted) {
      // stepping into the car the lens glides from where it is; stepping out it eases back onto the plain arm
      if (mounted) this.rideArm.resetFrom(last.x - this.pivot.x, last.y - this.pivot.y, last.z - this.pivot.z);
      else this.dismount = 0.8;
      this.wasMounted = mounted;
    }
    let x: number, y: number, z: number;
    if (mounted) {
      if (ctx.seeked) this.rideArm.reset();
      const A = Math.max(RIDE_ARM, L);
      const lens = this.rideArm.solve(dt, ctx.showTime, pl.ride.gondola, this.pivot, -fx * A + rx * side, -fy * A + up, -fz * A + rz * side, p.y, this.rideLens);
      x = lens.x;
      y = lens.y;
      z = lens.z;
      // leaving the ride continues from about this arm
      this.arm = clamp(Math.hypot(x - this.pivot.x, z - this.pivot.z), 0.35, L);
    } else {
      const free = this.armFree(this.pivot.x, this.pivot.z, this.pivot.x + dx, this.pivot.z + dz, this.pivot.y - fy * L + up);
      const want = Math.max(0.35, L * free - (free < 1 ? 0.25 : 0));
      this.arm += (want - this.arm) * damp(want < this.arm ? 30 : 3, dt);
      const k = this.arm / L;
      x = this.pivot.x + dx * k;
      z = this.pivot.z + dz * k;
      y = this.pivot.y + (-fy * L + up) * k;
      if (this.dismount > 0) {
        this.dismount -= dt;
        const a = damp(7, dt);
        x = last.x + (x - last.x) * a;
        y = last.y + (y - last.y) * a;
        z = last.z + (z - last.z) * a;
      }
    }
    const floor = this.floorAt(x, z);
    // over a dense crowd: well above the raised hands (~2.3 m)
    y = Math.max(y, floor + 0.25, floor + (1.62 + 1.25 * lift + pl.jumpY * 0.6) * lift);
    cam.position.set(x, y, z);
    cam.rotation.set(pitch, yaw, pl.eyeRot.z * 0.5, 'YXZ');
  }

  /**
   * walkable floor height under a camera position (the stage when standing on it). On the stage this is
   * the walk map's highest top within reach of the feet (≤ 1 m above them: the pivot is the head, 1.62 m
   * up), stair ramps included — the flat `platforms` alone dropped the floor to the terrain under the
   * pit / crew / castle stairs, so the arm could sink into the steps
   */
  private floorAt(x: number, z: number): number {
    const pl = this.player;
    if (pl.onPlatform) return pl.floorAt(x, z, this.pivot.y - 0.62);
    return pl.groundAt(x, z);
  }

  /** fraction (0..1) of the arm segment a->b that is free of colliders */
  private armFree(ax: number, az: number, bx: number, bz: number, camY: number): number {
    let tMin = 1;
    const dx = bx - ax,
      dz = bz - az;
    const m = 0.15;
    const onDeck = this.player.onPlatform;
    for (const c of this.app.colliders) {
      if (onDeck && !(c.tag && c.tag.startsWith('deck'))) continue;
      // the Ferris wheel's low walkway / platform rails never block a lens at head height
      if (c.tag === 'wheel') continue;
      if (c.kind === 'circle') tMin = Math.min(tMin, segCircle(ax, az, dx, dz, c.x, c.z, c.r + m));
      else tMin = Math.min(tMin, segBox(ax, az, dx, dz, c.minX - m, c.maxX + m, c.minZ - m, c.maxZ + m));
    }
    if (!onDeck) {
      for (const w of this.player.platforms) {
        if (camY < w.y + 0.3) tMin = Math.min(tMin, segBox(ax, az, dx, dz, w.minX - m, w.maxX + m, w.minZ - m, w.maxZ + m));
      }
    }
    return tMin;
  }

  private updateFree(ctx: FrameContext, cam: THREE.PerspectiveCamera): void {
    const input = this.app.input;
    const dt = ctx.dt;
    const sens = 0.0022;
    this.freeYaw -= input.look.x * sens;
    this.freePitch = clamp(this.freePitch - input.look.y * sens, -1.55, 1.55);
    let mx = input.move.x;
    let my = input.move.y;
    if (input.wheel) this.freeSpeedScale = clamp(this.freeSpeedScale * Math.exp(-input.wheel * 0.0015), 0.1, 6);
    const speed = (input.run ? this.freeFastSpeed : this.freeSpeed) * this.freeSpeedScale;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    const vert = clamp(input.vertical + this.touchVertical, -1, 1);
    const cp = Math.cos(this.freePitch);
    const fx = -Math.sin(this.freeYaw) * cp,
      fy = Math.sin(this.freePitch),
      fz = -Math.cos(this.freeYaw) * cp;
    const rx = Math.cos(this.freeYaw),
      rz = -Math.sin(this.freeYaw);
    const v = this.freeVel;
    const a = damp(7, dt);
    v.x += ((fx * my + rx * mx) * speed - v.x) * a;
    v.y += ((fy * my + vert) * speed - v.y) * a;
    v.z += ((fz * my + rz * mx) * speed - v.z) * a;
    const p = this.freePos;
    p.addScaledVector(v, dt);
    const floor = this.player.groundAt(p.x, p.z) + 0.3;
    if (p.y < floor) {
      p.y = floor;
      if (v.y < 0) v.y = 0;
    }
    cam.position.copy(p);
    cam.rotation.set(this.freePitch, this.freeYaw, 0, 'YXZ');
  }

  private updateAvatar(ctx: FrameContext): void {
    const av = this.avatar;
    if (!av) return;
    // hidden in first person, and whenever the camera is inside / right at the head
    // (arm pulled in by a wall, gliding between the eye and the third-person view)
    const p = this.app.playerPos;
    const cam = this.app.camera.position;
    const dy = cam.y - (p.y + this.player.jumpY + 1.6);
    const nearHead = (cam.x - p.x) ** 2 + dy * dy + (cam.z - p.z) ** 2 < 0.6 * 0.6;
    const show = (this.mode !== 'first' || this.blend.t < this.blend.dur * 0.7) && !nearHead;
    av.root.visible = show;
    this.selfRim += ((this.mode === 'third' ? 1 : 0) - this.selfRim) * damp(4, ctx.dt);
    if (!show) {
      av.bodyYaw = this.player.yaw; // keep facing in sync so switching views does not spin the body
      return;
    }
    av.setSelfHighlight(this.selfRim);
    av.update(ctx, this.player, this.app.playerPos);
    av.updateLighting(this.app.env, this.app.camera, STAGE_FOCUS);
  }

  setQuality(q: QualitySettings): void {
    this.avatar?.setShadows(q.shadows);
  }

  stats(): Record<string, number | string> {
    return {
      mode: this.mode,
      fov: this.app.camera.fov.toFixed(1),
      shot: this.mode === 'showcam' ? this.director.current : '-',
      haze: this.hazeScale.toFixed(2),
      pos: this.app.camera.position.toArray().map((v) => v.toFixed(1)).join(','),
      lift: this.mode === 'showcam' ? this.director.lifted.toFixed(2) : '-',
      nudge: this.mode === 'showcam' ? this.director.nudged.toFixed(2) : '-',
    };
  }

  dispose(): void {
    this.avatar?.dispose();
  }
}

/** first entry parameter t in [0,1] of segment a + t*d into a circle (1 when none) */
function segCircle(ax: number, az: number, dx: number, dz: number, cx: number, cz: number, r: number): number {
  const fx = ax - cx,
    fz = az - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-9) return 1;
  const b = 2 * (fx * dx + fz * dz);
  const c = fx * fx + fz * fz - r * r;
  if (c < 0) return 1; // starts inside (pivot touching): ignore
  const disc = b * b - 4 * a * c;
  if (disc < 0) return 1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : 1;
}

/** first entry parameter t in [0,1] of segment a + t*d into an axis-aligned box (slab test) */
function segBox(ax: number, az: number, dx: number, dz: number, minX: number, maxX: number, minZ: number, maxZ: number): number {
  if (ax > minX && ax < maxX && az > minZ && az < maxZ) return 1; // starts inside: ignore
  let t0 = 0,
    t1 = 1;
  if (Math.abs(dx) < 1e-9) {
    if (ax < minX || ax > maxX) return 1;
  } else {
    const u0 = (minX - ax) / dx,
      u1 = (maxX - ax) / dx;
    t0 = Math.max(t0, Math.min(u0, u1));
    t1 = Math.min(t1, Math.max(u0, u1));
  }
  if (Math.abs(dz) < 1e-9) {
    if (az < minZ || az > maxZ) return 1;
  } else {
    const u0 = (minZ - az) / dz,
      u1 = (maxZ - az) / dz;
    t0 = Math.max(t0, Math.min(u0, u1));
    t1 = Math.min(t1, Math.max(u0, u1));
  }
  return t0 <= t1 ? t0 : 1;
}
