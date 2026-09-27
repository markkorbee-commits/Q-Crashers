import * as THREE from 'three';
import type { App } from '../core/App';
import type { FrameContext, Interactable } from '../core/types';
import { BOARD_WINDOW, DOOR_X, fromBottom, GONDOLA, gondolaPoint, gondolaPose, nearestGondola, WHEEL_DECK, WHEEL_PERIOD, WHEEL_Z } from '../world/ferris';
import { easeInOut } from './motion';
import { STAGE_FOCUS, yawTowards } from './spots';

/**
 * off     not on the ride
 * walk    boarding, step 1: walking along the platform to the edge next to the arriving gondola
 * board   boarding, step 2: stepping through the door and sitting down on the bench
 * ride    seated; the wheel turns from show time
 * alight  getting off, step 1: standing up and stepping out onto the platform
 * leave   getting off, step 2: a few steps back from the edge (then control returns)
 */
export type RidePhase = 'off' | 'walk' | 'board' | 'ride' | 'alight' | 'leave';

/** eye height of a seated rider above the gondola floor (bench 0.45 m) */
export const SEAT_EYE = 1.24;
/**
 * where on the +Z bench the rider sits, across the car (gondola X). Seen from the bench the Mainstage lies
 * ~24° left of the bench's facing. From the middle of the bench the car's front-left corner post stood
 * right on that line and split the show down the middle; at the -X (door) end the wheel's own spoke
 * (x = -0.9, straight down from the axle near the top of the wheel) became a 10° wide band over the left
 * wing. At the +X end the post is a thin line ~8° left of the stage centre and the spokes stay out of
 * the stage's 40° width at every point of the turn.
 */
export const SEAT_X = 0.35;
const BOARD_S = 1.5;
const ALIGHT_S = 1.3;
const LEAVE_S = 0.9;
const LABEL_BOARD = 'Board the Ferris wheel';
const LABEL_EXIT = 'Get off the Ferris wheel';

/**
 * The Ferris wheel ride (world/ferris.ts): a scripted body path while boarding / getting off and a
 * seat that follows the gondola, all driven by the gondola pose from SHOW time (so the seat and the
 * rendered car always agree). The PlayerController owns it: while it is not 'off' the controller skips
 * walking, collision and gravity and copies `pos` into app.playerPos; look input stays 1:1.
 * One interactable: "Board the Ferris wheel" at the platform edge; while riding the controller offers it
 * as "Get off the Ferris wheel" whenever the gondola passes the platform. No per-frame allocations.
 */
export class FerrisRide {
  phase: RidePhase = 'off';
  /** gondola index (0..15) while on the ride, -1 when off */
  gondola = -1;
  /** 0 standing … 1 seated (eye height, avatar pose) */
  seat = 0;
  /** feet position (world) along the scripted path / in the gondola */
  readonly pos = new THREE.Vector3();
  /** body velocity along the path (m/s): drives the avatar's walk cycle and the head bob */
  readonly vel = new THREE.Vector3();
  /** yaw the rider turns to while stepping in and sitting down (facing the stage), null otherwise */
  turnTo: number | null = null;
  /** facing of the seated body (the bench faces -Z) */
  readonly seatYaw = 0;
  /** the ride's interactable (registered with the app; label / position switch with the phase) */
  readonly point: Interactable;

  private app!: App;
  private t = 0;
  private dur = 1;
  private readonly from = new THREE.Vector3();
  private readonly to = new THREE.Vector3();
  private readonly pivot = new THREE.Vector3();
  private readonly door = new THREE.Vector3();
  private readonly mid = new THREE.Vector3();
  private readonly seatP = new THREE.Vector3();
  private readonly prev = new THREE.Vector3();
  private readonly boardPos = new THREE.Vector3(DOOR_X - 0.3, WHEEL_DECK.y + 1.0, WHEEL_Z);
  private hintAt = -1e9;
  /** the car has left the platform since boarding (a fresh rider is not offered "Get off" at once) */
  private departed = false;
  /** the "how to get down" hint was shown for the current pause (reset when the show plays again) */
  private pauseHinted = false;

  constructor() {
    this.point = {
      id: 'ferris_wheel',
      position: this.boardPos.clone(),
      radius: 4.3,
      label: LABEL_BOARD,
      onInteract: () => this.onInteract(),
    };
  }

  init(app: App): void {
    this.app = app;
    app.addInteractable(this.point);
  }

  /** on the ride in any phase (the controller hands the body to the ride) */
  get active(): boolean {
    return this.phase !== 'off';
  }

  /** in or at the gondola (boarding step 2, riding, stepping out): the third-person arm ignores 2D colliders */
  get mounted(): boolean {
    return this.phase === 'board' || this.phase === 'ride' || this.phase === 'alight';
  }

  /**
   * seated and the gondola is at the platform: getting off is possible now — once the car has been round
   * (right after sitting down the prompt would invite an impatient second tap to throw you straight back
   * out), or at once while the show is paused
   */
  get canAlight(): boolean {
    return this.phase === 'ride' && (this.departed || !this.app.clock?.playing) && Math.abs(fromBottom(this.gondola, this.showTime())) <= BOARD_WINDOW;
  }

  /** start boarding from the feet position `feet` (the gondola arriving at the platform is picked) */
  board(feet: THREE.Vector3, instant = false): void {
    if (this.phase !== 'off') return;
    const t = this.showTime();
    this.pos.copy(feet);
    this.prev.copy(feet);
    this.vel.set(0, 0, 0);
    this.seat = 0;
    this.departed = false;
    this.pauseHinted = false;
    if (instant) {
      this.gondola = nearestGondola(t);
      this.setPhase('ride');
      this.seat = 1;
      this.seatAt(t, this.pos, false);
    } else this.walkTo(t);
    this.app.events.emit('toast', {
      text: this.app.device.touch
        ? 'All aboard! One turn takes 5 minutes — tap “Get off” when your gondola is back at the platform, or open Spots (the pin button) to leave at once.'
        : 'All aboard! One turn takes 5 minutes — press E when your gondola is back at the platform to get off.',
      ms: 5200,
      icon: 'wheel',
    });
  }

  /** start getting off (only while the gondola is at the platform) */
  alight(): void {
    if (!this.canAlight) return;
    this.next('alight', ALIGHT_S);
    this.turnTo = null;
  }

  /** leave the ride at once (teleport, reset): the controller places the body itself */
  cancel(): void {
    this.setPhase('off');
    this.gondola = -1;
    this.seat = 0;
    this.turnTo = null;
    this.vel.set(0, 0, 0);
    this.resetPoint();
  }

  /**
   * Advance the ride by one frame: writes `pos`, `vel`, `seat`, `turnTo`. `steady` (reduced motion)
   * ignores the gondola's pendulum sway for the seat. Returns false when the ride just ended
   * (the body stands on the platform at `pos`).
   */
  update(ctx: FrameContext, steady: boolean): boolean {
    const t = ctx.showTime;
    const dt = Math.max(1e-4, ctx.dt);
    this.prev.copy(this.pos);
    this.turnTo = null;
    // a seek / restart while stepping in or out moves the car away: never fly the body after it (the
    // turning wheel alone never takes the chosen car further than ~0.3 rad from the bottom in these phases)
    if ((this.phase === 'walk' || this.phase === 'board' || this.phase === 'alight') && (ctx.seeked || Math.abs(fromBottom(this.gondola, t)) > BOARD_WINDOW * 2)) {
      if (this.phase === 'alight') {
        // back on the platform edge at once, then the few steps away from it
        this.doorAt(t, this.door);
        this.pos.copy(this.door);
        this.prev.copy(this.door);
        this.from.copy(this.door);
        this.to.set(this.door.x - 1.6, WHEEL_DECK.y, this.door.z);
        this.seat = 0;
        this.next('leave', LEAVE_S);
      } else {
        // walk (again) from here to the car now arriving at the platform
        this.seat = 0;
        this.walkTo(t);
      }
    }
    this.t += ctx.dt;
    const e = Math.min(1, this.t / this.dur);
    switch (this.phase) {
      case 'walk': {
        this.doorAt(t, this.door);
        this.pos.lerpVectors(this.from, this.door, easeInOut(e));
        this.seat = 0;
        if (e >= 1) this.next('board', BOARD_S);
        break;
      }
      case 'board': {
        // through the door to the middle of the car, then turn and sit down on the +Z bench
        this.doorAt(t, this.door);
        this.seatAt(t, this.seatP, steady);
        this.midAt(t, this.mid, steady);
        if (e < 0.5) {
          const s = easeInOut(e / 0.5);
          this.pos.lerpVectors(this.door, this.mid, s);
          this.pos.y += 0.1 * Math.sin(Math.PI * s); // the step over the sill
        } else this.pos.lerpVectors(this.mid, this.seatP, easeInOut((e - 0.5) / 0.5));
        this.seat = THREE.MathUtils.smoothstep(e, 0.45, 1);
        if (e > 0.35) this.turnTo = yawTowards(this.seatP, STAGE_FOCUS);
        if (e >= 1) this.next('ride', 1);
        break;
      }
      case 'ride': {
        this.seatAt(t, this.pos, steady);
        this.seat = 1;
        if (!this.departed && (ctx.seeked || Math.abs(fromBottom(this.gondola, t)) > BOARD_WINDOW)) this.departed = true;
        // the show paused (or ended) halfway round: say once how to get down
        const playing = !!this.app.clock?.playing;
        if (playing) this.pauseHinted = false;
        else if (!this.pauseHinted && !this.canAlight) {
          this.pauseHinted = true;
          this.hint(performance.now() / 1000, true);
        }
        break;
      }
      case 'alight': {
        this.seatAt(t, this.seatP, steady);
        this.midAt(t, this.mid, steady);
        this.doorAt(t, this.door);
        this.seat = 1 - THREE.MathUtils.smoothstep(e, 0, 0.5);
        if (e < 0.5) this.pos.lerpVectors(this.seatP, this.mid, easeInOut(e / 0.5));
        else {
          const s = easeInOut((e - 0.5) / 0.5);
          this.pos.lerpVectors(this.mid, this.door, s);
          this.pos.y += 0.1 * Math.sin(Math.PI * s);
        }
        if (e >= 1) {
          this.from.copy(this.door);
          this.to.set(this.door.x - 1.6, WHEEL_DECK.y, this.door.z);
          this.next('leave', LEAVE_S);
        }
        break;
      }
      case 'leave':
        this.pos.lerpVectors(this.from, this.to, easeInOut(e));
        this.seat = 0;
        if (e >= 1) {
          this.cancel();
          this.vel.set(0, 0, 0);
          return false;
        }
        break;
      default:
        return false;
    }
    // path velocity (a seek jumps the gondola: never read that as walking)
    this.vel.subVectors(this.pos, this.prev).divideScalar(dt);
    if (this.vel.lengthSq() > 36 || this.phase === 'ride') this.vel.set(0, 0, 0);
    this.vel.y = 0;
    // the interactable rides along (UI distance checks) and names the next action
    this.point.position.set(this.pos.x, this.pos.y + 1.0, this.pos.z);
    this.point.label = LABEL_EXIT;
    return true;
  }

  /**
   * E / the touch button pressed while on the ride without a prompt: explain when getting off is
   * possible (throttled toast).
   */
  hint(now: number, force = false): void {
    if (this.phase !== 'ride' || (!force && now - this.hintAt < 3)) return;
    this.hintAt = now;
    const clock = this.app.clock;
    const leave = this.app.device.touch ? 'Open Spots (the pin button) to leave at once.' : 'Pick another spot (T) to leave at once.';
    let text: string;
    if (!clock?.playing) text = `The wheel turns with the show — press play to ride on. ${leave}`;
    else {
      const d = fromBottom(this.gondola, this.showTime());
      const turn = Math.PI * 2;
      // still at the platform right after boarding: a whole turn to go
      const a = d > 0 ? d : turn + d;
      const s = Math.round(((this.departed ? a : a < BOARD_WINDOW * 2 ? turn : a) / turn) * WHEEL_PERIOD);
      const mm = Math.floor(s / 60),
        ss = String(s % 60).padStart(2, '0');
      text = `You can get off when your gondola is back at the platform — in about ${mm}:${ss}. ${leave}`;
    }
    this.app.events.emit('toast', { text, ms: 4200, icon: 'wheel' });
  }

  // ------------------------------------------------------------------------------------------

  private onInteract(): void {
    if (this.phase === 'off') {
      this.board(this.app.playerPos);
      return;
    }
    if (this.canAlight) this.alight();
    else this.hint(performance.now() / 1000);
  }

  /**
   * walk from `pos` to the platform edge beside the car that will be at the bottom when we get there
   * (~1.5 m/s; nothing moves while the show is paused)
   */
  private walkTo(t: number): void {
    const rate = this.app.clock?.playing ? 1 : 0;
    this.from.copy(this.pos);
    this.gondola = nearestGondola(t);
    this.doorAt(t, this.door);
    const walk = THREE.MathUtils.clamp(this.from.distanceTo(this.door) / 1.5, 0.45, 3);
    this.gondola = nearestGondola(t + (walk + BOARD_S * 0.5) * rate);
    this.next('walk', walk);
  }

  private next(phase: RidePhase, dur: number): void {
    this.setPhase(phase);
    this.t = 0;
    this.dur = dur;
  }

  private setPhase(phase: RidePhase): void {
    if (phase === this.phase) return;
    this.phase = phase;
    this.app?.events.emit('ride:state', { phase });
  }

  private resetPoint(): void {
    this.point.position.copy(this.boardPos);
    this.point.label = LABEL_BOARD;
  }

  private showTime(): number {
    return this.app.clock?.time ?? 0;
  }

  /** the platform edge point beside the gondola's door (deck height, clamped to the platform) */
  private doorAt(t: number, out: THREE.Vector3): THREE.Vector3 {
    gondolaPose(this.gondola, t, this.pivot);
    const D = WHEEL_DECK;
    return out.set(DOOR_X, D.y, THREE.MathUtils.clamp(this.pivot.z, D.z0 + 0.6, D.z1 - 0.6));
  }

  /** the rider's feet under the seat (floor of the gondola) */
  private seatAt(t: number, out: THREE.Vector3, steady: boolean): THREE.Vector3 {
    const sway = gondolaPose(this.gondola, t, this.pivot);
    return gondolaPoint(this.pivot, steady ? 0 : sway, SEAT_X, GONDOLA.floorY, GONDOLA.seatZ, out);
  }

  /** the middle of the gondola floor (behind the door) */
  private midAt(t: number, out: THREE.Vector3, steady: boolean): THREE.Vector3 {
    const sway = gondolaPose(this.gondola, t, this.pivot);
    return gondolaPoint(this.pivot, steady ? 0 : sway, -0.15, GONDOLA.floorY, 0, out);
  }
}
