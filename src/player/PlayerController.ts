import * as THREE from 'three';
import type { App } from '../core/App';
import { clamp, lerp, smoothstep } from '../core/rng';
import type { FrameContext, Interactable, NamedSpot, System } from '../core/types';
import type { MotorEffects } from '../intoxication/PerceptionSystem';
import { stageWalk, surfaceTop, type StageWalk } from '../world/stageWalk';
import { damp, wobble } from './motion';
import { DEFAULT_SPOTS, DEFAULT_START_PITCH, DEFAULT_START_SPOT, START_CHOICES, type StartChoice } from './spots';

/**
 * A flat raised walkable area (stage deck, podium, vault floor, castle platform …), highest first.
 * Read by the camera rig (floor under the third-person camera); the player itself walks the full
 * stage walk map (world/stageWalk.ts: flat tops, stair ramps, walls with a height range).
 */
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
type CameraModeProvider = { mode?: string };

const SOBER: MotorEffects = { sway: 0, inputLag: 0, balance: 0, lookJitter: 0, speedScale: 1 };
const GRAVITY = 9.81;
const TAU = Math.PI * 2;
/** hard cap on camera roll from sway / bob / jostle (1°): rolled horizons cause simulator sickness */
const MAX_ROLL = 0.0175;
/** eye height (m) when sitting / slumped on the ground (perception motor.seated) */
const SEATED_EYE = 1.0;
/** localStorage keys (per-viewer conveniences, never required) */
const LS_REDUCE_MOTION = 'defqon.reduceMotion';
const LS_START_SPOT = 'defqon.startSpot';

function readStorage(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode / blocked storage: the setting just is not remembered */
  }
}

/** the OS / browser asks for reduced motion */
function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

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
  readonly out = { x: 0, y: 0, run: false, jump: false, interact: false };

  push(time: number, x: number, y: number, run: boolean, jump: boolean, interact: boolean): void {
    if (this.count === InputDelay.N) this.consume(); // overflow: oldest sample is due anyway
    const i = (this.head + this.count) % InputDelay.N;
    this.t[i] = time;
    this.x[i] = x;
    this.y[i] = y;
    this.flags[i] = (run ? 1 : 0) | (jump ? 2 : 0) | (interact ? 4 : 0);
    this.count++;
  }

  /** advance to `time - lag`; `out` then holds the delayed intent */
  sample(time: number, lag: number): void {
    this.out.jump = false;
    this.out.interact = false;
    const due = time - lag;
    while (this.count > 0 && this.t[this.head] <= due) this.consume();
  }

  clear(): void {
    this.count = 0;
    this.out.x = this.out.y = 0;
    this.out.run = this.out.jump = this.out.interact = false;
  }

  private consume(): void {
    const i = this.head;
    this.out.x = this.x[i];
    this.out.y = this.y[i];
    this.out.run = (this.flags[i] & 1) !== 0;
    if (this.flags[i] & 2) this.out.jump = true;
    if (this.flags[i] & 4) this.out.interact = true;
    this.head = (i + 1) % InputDelay.N;
    this.count--;
  }
}

/**
 * The spectator's body: human-scale walking / running / jumping with smooth acceleration,
 * collision sliding, crowd slow-down and jostle, intoxication motor effects, head bob and
 * interaction targeting. The CameraRig turns the exposed `eyeOffset` / `eyeRot` into the view.
 *
 * Comfort: mouse / touch look is always 1:1 (reaction-time lag only delays walking, jumping and
 * interacting), camera roll is capped at 1°, and `reduceMotion` (default: the OS setting
 * prefers-reduced-motion, remembered per viewer) removes head bob, sway, roll and jostle.
 *
 * Determinism: standing still, the view is a pure function of (real time, spot, intoxication):
 * crowd sway and balance loss are an eye offset, not accumulated body drift, and the crowd density
 * snaps on arrival / seek, so a seek or restart frames the show exactly like the first pass.
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
  /** drops up to this are stepped down; deeper ones are a (short) fall */
  static readonly STEP_DOWN = 0.5;
  /** third-person camera keeps this far under a roof (the vault) */
  static readonly ROOF_MARGIN = 0.28;

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
  /** crowd density at the body (people / m²); smoothed while walking, exact when standing */
  crowdDensity = 0;
  /** camera-local eye offset from bob / landing / sway / jostle (x right, y up, z back) in metres */
  readonly eyeOffset = new THREE.Vector3();
  /** eye rotation offsets (x pitch, y yaw, z roll) in radians */
  readonly eyeRot = new THREE.Vector3();
  /** body lean from intoxication (x roll, z pitch) for the third-person avatar */
  readonly bodyLean = { roll: 0, pitch: 0 };
  /** incremented on every teleport so cameras can snap instead of gliding */
  teleports = 0;
  /** flat raised walkable areas of the stage walk map, highest first (the camera rig reads them) */
  readonly platforms: Platform[] = [];
  /** every flat top of the walk map, highest first (`platforms` is the per-frame subset in reach) */
  private readonly allPlatforms: Platform[] = [];
  /** walkable fallback bounds (the world registers the real perimeter as colliders) */
  readonly bounds = { minX: -280, maxX: 280, minZ: -40, maxZ: 460 };
  /** optional hook for footstep sounds (called on every heel strike) */
  onFootstep: ((running: boolean) => void) | null = null;

  private app!: App;
  private jumpV = 0;
  private jumpQueued = false;
  /** the walkable stage (null: flat ground only) */
  private walk: StageWalk | null = null;
  /** feet supported by a stage surface (deck, stairs, podium, vault …) rather than the terrain */
  private onStage = false;
  /** vertical speed while falling off a ledge (m/s, <= 0; 0 = supported) */
  private fallV = 0;
  private rig: CameraModeProvider | null | undefined;
  private delay = new InputDelay();
  private densityValid = false;
  private reduced = false;
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
    // the walkable stage (pure data: deck, stairs, podium, vault, castle platform) + its flat tops for the camera
    this.walk = stageWalk();
    this.allPlatforms.length = 0;
    for (const s of this.walk.surfaces) if (s.axis === 0) this.allPlatforms.push({ minX: s.minX, maxX: s.maxX, minZ: s.minZ, maxZ: s.maxZ, y: s.y0 });
    this.allPlatforms.sort((a, b) => b.y - a.y);
    this.platforms.length = 0;
    this.platforms.push(...this.allPlatforms);
    // third-person camera: never through the vault roof (runs after the camera rig placed the camera)
    app.onFrame(() => this.clampCameraUnderRoof());
    for (const s of DEFAULT_SPOTS) if (!app.spots.some((x) => x.id === s.id)) app.addSpot(s);
    const P = app.params;
    const rm = P.get('reducemotion') ?? P.get('comfort');
    const stored = readStorage(LS_REDUCE_MOTION);
    this.reduced = rm !== null ? rm !== '0' && rm !== 'off' : stored !== null ? stored === '1' : prefersReducedMotion();
    // start: ?spot= > the viewer's last chosen viewing position > the middle of the field
    const remembered = readStorage(LS_START_SPOT);
    const want = P.get('spot') ?? (remembered && START_CHOICES.some((c) => c.id === remembered) ? remembered : DEFAULT_START_SPOT);
    const start = app.spots.find((s) => s.id === want) ?? app.spots.find((s) => s.id === DEFAULT_START_SPOT);
    if (start) {
      this.teleport(start, false);
      // arriving with the default framing: a touch more upward look so the dragon and the sky
      // (where the fireworks happen) fill the frame instead of the dark ground
      if (!P.has('spot') && start.id === DEFAULT_START_SPOT) this.pitch += DEFAULT_START_PITCH;
    }
  }

  /** Comfort setting: no head bob, sway, roll or jostle (motion-sensitive viewers). */
  get reduceMotion(): boolean {
    return this.reduced;
  }

  /** alias read by the perception system (screen swim, nystagmus and look lag follow this flag) */
  get reducedMotion(): boolean {
    return this.reduced;
  }

  setReduceMotion(on: boolean, remember = true): void {
    this.reduced = on;
    if (remember) writeStorage(LS_REDUCE_MOTION, on ? '1' : '0');
  }

  /** Curated start positions (id, title, blurb) for an onboarding position picker. */
  get startChoices(): readonly StartChoice[] {
    return START_CHOICES;
  }

  /** the viewer's remembered start choice (a spot id or 'showcam'), null when never chosen */
  get rememberedStart(): string | null {
    const id = readStorage(LS_START_SPOT);
    return id && START_CHOICES.some((c) => c.id === id) ? id : null;
  }

  /** remember a start choice for the next visit (e.g. 'showcam' picked in an onboarding picker) */
  rememberStart(id: string): void {
    if (START_CHOICES.some((c) => c.id === id)) writeStorage(LS_START_SPOT, id);
  }

  /** Teleport to a registered spot by id (remembered as the next start when it is a start choice). */
  teleportTo(id: string): boolean {
    const spot = this.app.spots.find((s) => s.id === id);
    if (!spot) return false;
    this.teleport(spot);
    return true;
  }

  teleport(spot: NamedSpot, remember = true): void {
    if (remember && START_CHOICES.some((c) => c.id === spot.id)) writeStorage(LS_START_SPOT, spot.id);
    const p = this.app.playerPos;
    p.copy(spot.position);
    // stand on the stage surface the spot names (its y), else on the ground
    const g = this.groundAt(p.x, p.z);
    const t = this.walk ? this.walk.topAt(p.x, p.z, spot.position.y + 0.3) : NaN;
    this.onStage = t >= g - 0.01;
    p.y = this.onStage ? t : g;
    this.fallV = 0;
    this.yaw = spot.yaw;
    this.pitch = spot.pitch ?? 0;
    this.velocity.set(0, 0, 0);
    this.jumpY = this.jumpV = 0;
    this.dip = this.dipV = 0;
    this.grounded = true;
    this.delay.clear();
    this.densityValid = false; // snap to the new spot's crowd on the next frame
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

  /** true while standing on the stage (deck, stairs, podium, vault, castle platform) */
  get onPlatform(): boolean {
    return this.onStage;
  }

  /** feet height of the walkable surface under (x, z): the stage walk map, else the terrain */
  floorAt(x: number, z: number, maxY = Infinity): number {
    const g = this.groundAt(x, z);
    const t = this.walk ? this.walk.topAt(x, z, maxY) : NaN;
    return t >= g ? t : g;
  }

  update(ctx: FrameContext): void {
    const dt = ctx.dt;
    const app = this.app;
    const input = app.input;
    const motor = this.motor();
    const p = app.playerPos;
    const t = ctx.time;

    // --- look: always 1:1 with the mouse / touch (lagged or smoothed head rotation is the main
    // trigger of simulator sickness); impaired reaction time delays walking, jumping, interacting
    const cmd = this.delay.out;
    if (this.controlsActive) {
      this.yaw -= input.look.x * this.lookSensitivity;
      this.pitch = clamp(this.pitch - input.look.y * this.lookSensitivity, -1.45, 1.45);
      this.delay.push(t, input.move.x, input.move.y, input.run, this.jumpQueued || input.pressed('Space'), input.pressed('KeyE'));
      this.jumpQueued = false;
      this.delay.sample(t, motor.inputLag);
      if (cmd.interact) this.interact();
    } else {
      this.jumpQueued = false;
      this.delay.clear();
    }

    // --- crowd density: exact when standing (seek / restart reproduce the same view), smoothed
    // while walking so crossing the density grid never pops
    const density = this.densityAt(p.x, p.z);
    if (!this.densityValid || ctx.seeked || this.speed < 0.05) this.crowdDensity = density;
    else this.crowdDensity += (density - this.crowdDensity) * damp(3, dt);
    this.densityValid = true;
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

    // balance loss + crowd jostle while WALKING: bounded lateral nudges that make a drunk or
    // squeezed walker drift off their line. Standing still, the same forces only sway the upper
    // body (eye offset in updateEyes), so the body never creeps and the view stays reproducible.
    let ex = 0,
      ez = 0;
    if (this.controlsActive && moving01 > 0 && !this.reduced) {
      const lateral = moving01 * (motor.balance * 0.45 * wobble(t * 0.43, 7) + crowd01 * 0.2 * wobble(t * 1.7, 11));
      const s = Math.sin(this.yaw),
        c = Math.cos(this.yaw);
      ex = c * lateral;
      ez = -s * lateral;
    }
    p.x += (this.velocity.x + ex) * dt;
    p.z += (this.velocity.z + ez) * dt;

    // --- jump / fall -------------------------------------------------------------------------
    if (cmd.jump && this.grounded && this.fallV === 0 && this.controlsActive) {
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
    this.filterPlatforms(p.y);
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

  /**
   * Third-person spring arm under a roof: the camera rig's arm collides in 2D only, so inside the
   * vault (and the portal throat) a long arm or a steep look down would put the lens through the
   * gold roof. Frame hook after all systems: clamp the lens under the ceiling (no allocation).
   */
  private clampCameraUnderRoof(): void {
    const w = this.walk;
    if (!w) return;
    if (this.rig === undefined) this.rig = (this.app.get('camera') as CameraModeProvider | undefined) ?? null;
    if (!this.rig || this.rig.mode !== 'third') return;
    const cam = this.app.camera.position;
    if (!w.underRoof(cam.x, cam.z)) return;
    const c = w.ceilingAt(cam.x, cam.z) - PlayerController.ROOF_MARGIN;
    if (cam.y > c) {
      cam.y = Math.max(c, this.app.playerPos.y + 0.6);
      this.app.camera.updateMatrixWorld();
    }
  }

  /**
   * The camera rig reads `platforms` as the floor under a third-person camera while the player stands on
   * the stage (highest containing top wins): only the tops within reach of the feet, so a camera
   * swinging over the castle platform (5.5) while you stand on the deck (1.9) does not jump up. On the
   * ground every top stays in (the rig blocks its arm with them). No allocation.
   */
  private filterPlatforms(feet: number): void {
    const all = this.allPlatforms;
    const out = this.platforms;
    out.length = 0;
    for (const pl of all) if (!this.onStage || (pl.y > feet - 1.2 && pl.y < feet + 1.0)) out.push(pl);
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

  /**
   * Feet follow the highest surface within a step (stage walk map) or the terrain: stepping up / down
   * (stair ramps, the 0.3 m podium) eases over ~0.1 s, a deeper drop (off the vault landing, off a
   * step's side) is a short fall with gravity and a knee dip on landing.
   */
  private updateHeight(p: THREE.Vector3, dt: number): void {
    const g = this.groundAt(p.x, p.z);
    const w = this.walk;
    const t = w ? w.topAt(p.x, p.z, p.y + PlayerController.STEP_HEIGHT) : NaN;
    const stage = t >= g - 0.01;
    this.onStage = stage;
    const sup = stage ? t : g;
    const d = sup - p.y;
    if (this.fallV < 0 || d < -PlayerController.STEP_DOWN) {
      // falling: gravity until the feet meet the support
      this.fallV -= GRAVITY * dt;
      p.y += this.fallV * dt;
      if (p.y <= sup) {
        this.dipV -= Math.min(4, -this.fallV) * 0.2;
        p.y = sup;
        this.fallV = 0;
      }
      return;
    }
    if (!stage) p.y += d * damp(18, dt);
    else if (Math.abs(d) < 0.004) p.y = sup;
    else p.y += d * damp(22, dt);
  }

  /** push the body circle out of colliders, stage walls and higher stage tops, sliding along them */
  private collide(p: THREE.Vector3): void {
    const r = PlayerController.RADIUS;
    const stage = this.onStage;
    const feet = p.y;
    const head = feet + PlayerController.BODY_HEIGHT;
    const reach = feet + PlayerController.STEP_HEIGHT;
    const w = this.walk && this.walk.near(p.x, p.z, 2) ? this.walk : null;
    for (let pass = 0; pass < 2; pass++) {
      // the world's 2D colliders: on the ground everything but the stage's own ('deck…'); on the stage
      // only the deck obstacles other builders register ('deck…', not the walk map's 'deckw…' copies)
      for (const c of this.app.colliders) {
        const tag = c.tag;
        const deck = tag !== undefined && tag.startsWith('deck');
        if (stage ? !deck || tag.startsWith('deckw') : deck) continue;
        if (c.kind === 'circle') this.pushCircle(p, c.x, c.z, c.r + r);
        else this.pushBox(p, c.minX, c.maxX, c.minZ, c.maxZ, r);
      }
      if (!w) continue;
      // stage walls with a height range: only those the body overlaps vertically
      for (const wl of w.walls) {
        if (wl.y1 <= feet + 0.05 || wl.y0 >= head) continue;
        if (wl.round) this.pushCircle(p, wl.x, wl.z, wl.r + r);
        else this.pushBox(p, wl.minX, wl.maxX, wl.minZ, wl.maxZ, r);
      }
      // stage tops more than a step above the feet are walls (deck front, landing, stair sides)
      for (const s of w.surfaces) {
        if (p.x < s.minX - r || p.x > s.maxX + r || p.z < s.minZ - r || p.z > s.maxZ + r) continue;
        if (surfaceTop(s, clamp(p.x, s.minX, s.maxX), clamp(p.z, s.minZ, s.maxZ)) <= reach) continue;
        this.pushBox(p, s.minX, s.maxX, s.minZ, s.maxZ, r);
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
    // comfort: reduced motion keeps the view rock steady (only a softened landing remains)
    const m = this.reduced ? 0 : 1;
    const bob = this.bobEnv * m;
    const ampV = lerp(0.0075, 0.013, runK) * bob; // 1.5 cm peak-to-peak when walking
    const ampL = lerp(0.008, 0.006, runK) * bob;

    // landing dip: critically-ish damped spring, sub-stepped for stability
    const steps = Math.max(1, Math.ceil(dt / 0.012));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.dipV += (-220 * this.dip - 22 * this.dipV) * h;
      this.dip += this.dipV * h;
    }

    const sway = motor.sway * m;
    const bal = motor.balance * m;
    const jit = motor.lookJitter * m;
    const idle = (1 - this.bobEnv) * m; // standing people breathe and shift their weight a little
    // standing in a crowd / unsteady on your feet: the upper body sways around planted feet
    // (a pure function of real time and the instantaneous density: no accumulated drift)
    const still = (1 - smoothstep(0.1, 1.2, v)) * m;
    const press = crowd01 * still;
    const o = this.eyeOffset;
    o.x =
      ampL * Math.sin(ph) +
      sway * 0.07 * wobble(t * 0.37, 1) +
      idle * 0.004 * wobble(t * 0.21, 13) +
      still * bal * 0.22 * wobble(t * 0.43, 7) +
      press * 0.035 * wobble(t * 1.7, 11);
    // intoxication outcomes (perception motor): a stumble dips the head ~6 cm and ~3° for a moment,
    // sitting / slumping down lowers the eyes towards ~1 m (walking is frozen by speedScale)
    const trip = smoothstep(0.5, 1, motor.stumble ?? 0) * (this.reduced ? 0.4 : 1);
    const seated = smoothstep(0, 1, motor.seated ?? 0);
    o.y =
      -ampV * Math.cos(2 * ph) +
      this.dip * (this.reduced ? 0.5 : 1) +
      sway * 0.02 * wobble(t * 0.29, 2) +
      idle * 0.0025 * Math.sin(t * 1.45) -
      0.06 * trip -
      (PlayerController.EYE_HEIGHT - SEATED_EYE) * seated;
    o.z = press * 0.045 * wobble(t * 1.3, 5);
    const r = this.eyeRot;
    r.x = 0.0015 * Math.sin(2 * ph) * bob + sway * 0.012 * wobble(t * 0.31, 5) + jit * 0.004 * wobble(t * 6.1, 8) + idle * 0.0006 * wobble(t * 0.33, 14) - 0.052 * trip;
    r.y = sway * 0.02 * wobble(t * 0.19, 4) + jit * 0.005 * wobble(t * 5.3, 9) + idle * 0.0008 * wobble(t * 0.17, 15);
    // roll is the most nauseating component: never more than 1°
    r.z = clamp(0.0022 * Math.sin(ph) * bob + sway * 0.012 * wobble(t * 0.23, 3) + crowd01 * m * 0.004 * wobble(t * 1.9, 12), -MAX_ROLL, MAX_ROLL);
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
      comfort: this.reduced ? 'reduced motion' : 'full',
    };
  }
}
