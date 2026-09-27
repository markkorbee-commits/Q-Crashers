import * as THREE from 'three';
import type { App } from '../core/App';
import { clamp, hashN, lerp, rand01, smoothstep } from '../core/rng';
import type { BeatInfo } from '../core/types';
import type { Cue } from '../show/ShowTypes';
import { easeDolly, easeInOut, wobble } from '../player/motion';
import { TERRACE } from '../world/site';

/** Output pose of a shot. */
export interface ShotPose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  roll: number;
  /**
   * 0.35..1 how much of the atmospheric haze veil this framing should show (1 = as the eye sees
   * it). Long lenses and cameras standing inside the stage haze cloud would otherwise stack tens
   * of metres of lit haze in front of the subject and turn the frame milky: real show cameras
   * avoid that with position, filtration and grading. Read by the haze renderers via CameraRig.
   */
  haze: number;
}

/** World layout the shots are framed on (resolved from anchors when the show camera starts). */
interface Layout {
  head: THREE.Vector3;
  stage: THREE.Vector3;
  deckY: number;
  foh: THREE.Vector3;
  delays: THREE.Vector3[];
  roofY: number;
  wing: number;
  fieldEnd: number;
}

type ShotKind = 'wide' | 'stage' | 'side' | 'crowd' | 'sky';

/**
 * Lens range of authored shots (degrees, vertical FOV): down to 5° for the official video's long
 * telephotos (≈ 270 mm on full frame), up to 110° for FPV / ultra-wide.
 */
export const SHOT_FOV = { min: 5, max: 110 } as const;

/** vertical FOV between a and b at k, interpolated in focal length (log tan), so a zoom runs at an even pace */
export function zoomFov(a: number, b: number, k: number): number {
  const ta = Math.log(Math.tan((a * Math.PI) / 360));
  const tb = Math.log(Math.tan((b * Math.PI) / 360));
  return (Math.atan(Math.exp(ta + (tb - ta) * k)) * 360) / Math.PI;
}

/** minimal duck type of the crowd system (Tribe mode density field) */
interface CrowdLike {
  densityAt?(x: number, z: number): number;
  subjectAt?(who: string, t: number, out: THREE.Vector3): boolean;
  /** the way a performer faces at show time t (yaw: 0 = towards the field, +z), NaN when not on stage */
  facingAt?(who: string, t: number): number;
}

/**
 * Keyframed flight of a `camera.shot` with a `path` (FPV drones): the shot's own pose is the key at 0 s, the
 * `path` entries the keys in between, `to` / `lookTo` / `rollTo` / `fovTo` the key at `dur`. Parsed once per cue
 * and show compile (flat arrays, evaluated without allocation).
 */
interface PathKeys {
  n: number;
  at: Float64Array;
  /** per key: pos xyz, look xyz, roll, log(tan(fov/2)) */
  v: Float64Array;
}
const PATH_CH = 8;
/** where a `subject` shot frames when the performer is not available (crowd system off): the portal front */
const SUBJECT_FALLBACK = new THREE.Vector3(0, 2.2, -4.5);
/** haze scale of a shot that follows a performer (see ShotPose.haze; 1 = the full lit veil) */
const SUBJECT_HAZE = 1;
/** shortest slot (s) of a stutter edit (`alt` / `altEvery`) with the photosensitivity option on */
const ALT_CALM = 0.34;
/** distance (m) of the fade card in front of the lens (the camera's near plane is 0.1 m) */
const CARD_Z = 0.15;
/** minimal duck type of the player controller (walkable ground height) */
interface GroundLike {
  groundAt?(x: number, z: number): number;
}

/** a PA hang cluster as seen by the show camera (K1 + K2 arrays and the ground-stacked truss tower) */
interface Occluder {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

/** Context of a shot slot: evaluated at the slot start so the choice is a pure function of time. */
interface SlotMood {
  energy: number;
  kick: boolean;
  fireworks: number;
  pyro: number;
  /** 0..1 how thick the stage haze / low fog is (close shots in the pit turn milky) */
  fog: number;
}

interface ShotDef {
  id: string;
  kind: ShotKind;
  /** relative weight for a mood */
  weight(m: SlotMood): number;
  /** k = eased progress 0..1, v = variant 0..1, t = show time (for handheld drift) */
  frame(L: Layout, k: number, v: number, t: number, o: ShotPose): void;
  /** handheld / beat shake amount (m) */
  shake?: number;
}

const side = (v: number) => (v < 0.5 ? -1 : 1);

/** The automatic director's shot list (~13 framings derived from the anchor layout). */
const SHOTS: ShotDef[] = [
  {
    id: 'foh_wide',
    kind: 'wide',
    weight: (m) => 1.1 + (1 - m.energy) * 0.6,
    frame(L, k, v, _t, o) {
      o.pos.set(L.foh.x + lerp(-4, 4, v), L.foh.y + 4.5, L.foh.z + 3 - 6 * k);
      o.look.set(0, L.stage.y + 1, L.stage.z);
      o.fov = lerp(40, 34, k);
    },
  },
  {
    id: 'front_low',
    kind: 'stage',
    // standing in the pit inside the haze cloud: only when the air is clear enough
    weight: (m) => (0.6 + m.pyro * 1.6 + m.energy * 0.4 - m.fireworks * 0.4) * (1 - smoothstep(0.25, 0.7, m.fog)),
    frame(L, k, v, _t, o) {
      const s = side(v);
      o.pos.set(s * lerp(2, 7, k), 1.15, 7.5);
      o.look.set(L.head.x * 0.5, L.head.y - 2, L.head.z);
      o.fov = 64;
      o.roll = -s * 0.03;
    },
    shake: 0.012,
  },
  {
    id: 'side_left',
    kind: 'side',
    weight: (m) => 0.7 + m.pyro * 0.5,
    frame(L, k, _v, _t, o) {
      o.pos.set(-L.wing * 0.72 + 10 * k, 7, lerp(24, 40, k));
      o.look.set(-8, L.stage.y, L.stage.z);
      o.fov = 44;
    },
  },
  {
    id: 'side_right',
    kind: 'side',
    weight: (m) => 0.7 + m.pyro * 0.5,
    frame(L, k, _v, _t, o) {
      o.pos.set(L.wing * 0.72 - 10 * k, 7, lerp(40, 24, k));
      o.look.set(8, L.stage.y, L.stage.z);
      o.fov = 44;
    },
  },
  {
    id: 'crane_crowd',
    kind: 'crowd',
    weight: (m) => 0.9 + m.energy * 0.5,
    frame(L, k, v, _t, o) {
      o.pos.set(lerp(-16, 16, v), lerp(12, 26, k), lerp(78, 58, k));
      o.look.set(0, L.stage.y * 0.8, L.stage.z);
      o.fov = 56;
    },
  },
  {
    id: 'aerial_drone',
    kind: 'wide',
    weight: (m) => 1.0 + m.fireworks * 2 + (1 - m.energy) * 0.3,
    frame(L, k, v, _t, o) {
      // high above the field, the pillar aisle leading into the stage (official drone framing)
      o.pos.set(lerp(-3, 3, v), lerp(64, 54, k), lerp(L.fieldEnd + 20, L.fieldEnd - 25, k));
      o.look.set(0, 8, 12);
      o.fov = 48;
    },
  },
  {
    id: 'dragon_close',
    kind: 'stage',
    weight: (m) => (0.7 + (1 - m.energy) * 0.7 - m.fireworks * 0.3) * (1 - 0.6 * smoothstep(0.3, 0.8, m.fog)),
    frame(L, k, v, _t, o) {
      const s = side(v);
      o.pos.set(L.head.x + s * lerp(-9, 9, k), L.head.y - 7, L.head.z + 36);
      o.look.copy(L.head);
      o.fov = lerp(24, 21, k);
    },
  },
  {
    id: 'wing_along',
    kind: 'side',
    weight: () => 0.55,
    frame(L, k, v, _t, o) {
      const s = side(v);
      o.pos.set(s * (L.wing + 6), L.roofY * 0.62, 18 + 8 * k);
      o.look.set(L.head.x, L.head.y - 3, L.head.z);
      o.fov = 40;
    },
  },
  {
    id: 'pit_track',
    kind: 'stage',
    weight: (m) => (0.35 + m.pyro * 2.6) * (1 - 0.8 * smoothstep(0.25, 0.7, m.fog)),
    frame(L, k, v, _t, o) {
      const s = side(v);
      const x = s * lerp(-34, 34, k);
      o.pos.set(x, L.deckY + 0.6, 3.4);
      o.look.set(x * 0.55, L.deckY + 5, -6);
      o.fov = 60;
    },
    shake: 0.008,
  },
  {
    id: 'crowd_pov',
    kind: 'crowd',
    weight: (m) => 0.7 + m.energy * 0.7,
    frame(L, k, v, _t, o) {
      o.pos.set(lerp(-8, 8, v), 1.9, lerp(40, 35, k));
      o.look.set(0, L.stage.y + 2, L.stage.z);
      o.fov = 52;
    },
    shake: 0.02,
  },
  {
    id: 'delay_tower',
    kind: 'crowd',
    weight: (m) => 0.6 + m.energy * 0.2,
    frame(L, k, v, _t, o) {
      const d = L.delays[Math.floor(v * L.delays.length) % Math.max(1, L.delays.length)] ?? new THREE.Vector3(30, 14, 95);
      o.pos.set(d.x, d.y + 3, d.z + 2);
      o.look.set(lerp(-10, 10, k), L.stage.y, L.stage.z);
      o.fov = 38;
    },
  },
  {
    id: 'reverse_stage',
    kind: 'crowd',
    weight: (m) => 0.25 + m.energy * 0.3,
    frame(L, k, v, _t, o) {
      const s = side(v);
      o.pos.set(s * 14, L.deckY + 7, -2);
      o.look.set(s * lerp(-10, 10, k), 1, 70);
      o.fov = 62;
    },
  },
  {
    id: 'skyline',
    kind: 'sky',
    weight: (m) => 0.15 + m.fireworks * 3.5,
    frame(L, k, v, _t, o) {
      o.pos.set(lerp(-12, 12, v), 2.4, L.fieldEnd + 30 - 8 * k);
      o.look.set(0, 55 + 10 * k, -40);
      o.fov = 58;
    },
  },
  {
    id: 'orbit_high',
    kind: 'wide',
    weight: (m) => 0.5 + m.fireworks * 1.3 + (1 - m.energy) * 0.4,
    frame(L, k, v, _t, o) {
      const a = side(v) * lerp(-0.55, 0.55, k);
      o.pos.set(Math.sin(a) * 125, 46, Math.cos(a) * 125 + 10);
      o.look.set(0, L.stage.y, L.stage.z);
      o.fov = 44;
    },
  },
];

const SHOT_BY_ID = new Map(SHOTS.map((s) => [s.id, s]));
const CUE_LABEL = new Map(SHOTS.map((s) => [s.id, `cue:${s.id}`]));
const FIREWORK_FX = new Set(['shell', 'salvo', 'finale', 'cake', 'comet', 'mine']);
const PYRO_FX = new Set(['flame', 'firewall', 'dragon_breath', 'burst', 'gerb', 'jet']);
const LOWFOG_FX = new Set(['lowfog', 'burst']);

/**
 * Show camera: follows authored `camera.shot` cues when present; otherwise an automatic
 * director cuts on bar boundaries between preset framings, choosing shot = f(show time, section
 * energy, active fireworks / pyro). Everything is a pure function of show time (seek-safe).
 */
export class ShowDirector {
  private L!: Layout;
  private cueBuf: Cue[] = [];
  private slotKey = -1;
  private slotShot = 0;
  private slotVariant = 0;
  private slot = { start: 0, end: 1 };
  private startPose: ShotPose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50, roll: 0, haze: 1 };
  private tmp = new THREE.Vector3();
  private rev = -1;
  private camCues: readonly Cue[] = [];
  private tmp2 = new THREE.Vector3();
  private tmp3 = new THREE.Vector3();
  /** lateral nudges (world offset) that keep PA hangs out of the centre of a framing, per shot key */
  private clearCache = new Map<number, THREE.Vector3>();
  private occluders: Occluder[] = [];
  private readonly f = new THREE.Vector3();
  private readonly r = new THREE.Vector3();
  private readonly u = new THREE.Vector3();
  private readonly corner = new THREE.Vector3();
  private readonly probe = new THREE.Vector3();
  private readonly subj = new THREE.Vector3();
  private crowd: CrowdLike | null | undefined;
  private ground: GroundLike | null | undefined;
  /** metres the current shot was lifted over the crowd (debug) */
  lifted = 0;
  /** metres the current shot was moved sideways to clear a PA hang (debug) */
  nudged = 0;
  /** id of the current shot (debug / UI) */
  current = '';
  /** comfort (reduced motion): no handheld drift or kick shake on the operated cameras */
  steady = false;
  /** the current authored shot follows a performer (`subject`): the deck operator's close-up */
  private subjectShot = false;
  /** keyframed flights of `path` shots, per cue id (cleared on every show compile) */
  private paths = new Map<number, PathKeys | null>();
  /** 0..1 how far the current shot is faded to black (`fadeIn` / `fadeOut` / `blackIn` / `blackOut`; debug / UI) */
  black = 0;
  /**
   * The fade card: a black quad just in front of the lens, drawn after everything else, so a dip to black of
   * the edit darkens the whole picture (sky, glow, bloom) exactly like the film's fades. Created on first use;
   * hidden (no draw call) while no shot fades, and in every frame the show camera did not evaluate.
   */
  private card: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  private evalFrame = -1;

  constructor(private app: App) {}

  /** resolve the framing layout from the current anchors */
  build(): void {
    const a = this.app.anchors;
    const head = (a.get('dragon_head')[0] ?? new THREE.Vector3(0, 28, -5)).clone();
    const delays = a.get('delay_towers').map((p) => p.clone());
    this.L = {
      head,
      stage: new THREE.Vector3(0, Math.max(10, head.y * 0.55), head.z - 2),
      deckY: a.get('deck_front')[0]?.y ?? 2.2,
      foh: (a.get('foh')[0] ?? new THREE.Vector3(0, 8, 110)).clone(),
      delays,
      roofY: Math.max(20, ...a.get('roof').map((p) => p.y)),
      wing: Math.max(80, ...a.get('wing_tips').map((p) => Math.abs(p.x))),
      fieldEnd: Math.max(170, ...[...delays, ...a.get('pillars_base')].map((p) => p.z)) + 30,
    };
    this.slotKey = -1;
    // PA hangs (design-bible §5.9): K1 array ±0.75 m, K2 side hang and the truss tower outboard
    // (tower at +2.85 m, 2.6 m wide), flown from 4.9 m up to the header at ~15.5 m, tower from the floor
    this.occluders = a.get('speaker_hangs').map((h) => {
      const s = h.x < 0 ? -1 : 1;
      const x0 = h.x - s * 0.9,
        x1 = h.x + s * 4.2;
      return { min: new THREE.Vector3(Math.min(x0, x1), 0, h.z - 1), max: new THREE.Vector3(Math.max(x0, x1), 15.6, h.z + 0.8) };
    });
    this.clearCache.clear();
  }

  /** evaluate the show camera at show time t */
  evaluate(t: number, beat: BeatInfo, o: ShotPose): void {
    if (!this.L) this.build();
    o.roll = 0;
    this.subjectShot = false;
    this.black = 0;
    if (!this.fromCue(t, o)) this.auto(t, beat, o);
    this.evalFrame = this.app.frame;
    this.setCard(this.black);
    this.clearTerrace(o);
    this.liftOverCrowd(o);
    // the deck operator's close-ups of a performer are milky in the film (v351, v409.5, v411.5): the lit
    // haze glows around him and the backlights bloom through it, so a subject shot keeps the full veil
    const hz = ShowDirector.hazeFor(o.pos, o.look, o.fov);
    // a smoke-filled site (atmos.glow smoke) is the picture: long lenses keep the whole veil then
    o.haze = lerp(this.subjectShot ? Math.max(hz, SUBJECT_HAZE) : hz, 1, clamp(this.app.env.smoke, 0, 1));
  }

  /**
   * The photo terrace (deck 5 m, front balustrade + glass to 6.1 m at z 166.1, deck to z 171.5): a show
   * camera standing on or just behind it must not film its own front rail. The official terrace tripod
   * stands ~4–6 m behind our front rail and looks up 8–10° over the field (round 8: fitted from the
   * lantern rows and the moon at v34.5, v69.25, v276, v309.5 and v793–805: (0, ~5–6, 170–172), fov 37–41),
   * so its rail normally stays under the bottom edge of the frame. Only when the rail top reaches into
   * the frame does the camera rise the few decimetres that put it ~1° under the bottom edge (aim kept).
   * A camera that would have to rise more than 3 m (one looking down) moves along its sight line to
   * just in front of the rail instead (≤ 9 m), keeping its height and aim.
   */
  private clearTerrace(o: ShotPose): void {
    const T = TERRACE;
    const p = o.pos;
    if (p.y >= T.deckY + 3 || p.y < T.deckY - 0.5 || Math.abs(p.x) > T.x1 + 1 || p.z < T.z0 - 0.6 || p.z > T.z1 + 5) return;
    if (o.look.z >= p.z - 5) return; // not looking towards the stage over the front rail
    const dz = p.z - (T.z0 + 0.1); // metres behind the front rail
    if (dz <= 0.05) return; // at or in front of the rail: nothing of the terrace in view
    const railY = T.deckY + 1.15;
    const edge = (o.fov * Math.PI) / 360 + 0.017; // half the vertical fov + ~1° clearance
    const y0 = p.y;
    // fixed-point iteration: rising with the aim kept tilts the camera down a little, so re-check
    for (let i = 0; i < 5; i++) {
      const pitch = Math.atan2(o.look.y - p.y, Math.hypot(o.look.x - p.x, o.look.z - p.z));
      if (pitch - edge < -1.4) break; // bottom edge (nearly) straight down: the deck is in view anyway
      const need = railY - dz * Math.tan(pitch - edge); // lowest height that keeps the rail out of frame
      if (p.y >= need - 1e-3) return;
      if (need - y0 > 3) break;
      p.y = need;
      if (i === 4) return; // converged to within millimetres
    }
    p.y = y0;
    const k = (T.z0 - 0.7 - p.z) / (o.look.z - p.z); // move along the sight line (aim and framing kept)
    p.lerp(o.look, Math.max(0, k));
  }

  /**
   * Tribe mode: the official edit was filmed over EMPTY grounds, so its eye-level shots stand where
   * the crowd now stands. A camera below head height inside the crowd would film the back of a head;
   * it rises (smoothly with the local density) to a camera-platform height of ~3.9 m, keeping its aim.
   */
  private liftOverCrowd(o: ShotPose): void {
    this.lifted = 0;
    const crowd = (this.crowd ??= (this.app.get('crowd') as unknown as CrowdLike | undefined) ?? null);
    if (!crowd?.densityAt) return;
    const dens = crowd.densityAt(o.pos.x, o.pos.z);
    if (!(dens > 0.05)) return;
    const player = (this.ground ??= (this.app.get('player') as unknown as GroundLike | undefined) ?? null);
    const g = player?.groundAt ? player.groundAt(o.pos.x, o.pos.z) : 0;
    const minY = g + 1.9 + 2.0 * smoothstep(0.05, 0.9, dens);
    if (o.pos.y >= minY) return;
    // soft floor (C1), so a dolly across the edge of the crowd does not kink
    const d = minY - o.pos.y;
    const lift = d + 0.15 * Math.exp(-d / 0.15) - 0.15;
    o.pos.y += lift;
    this.lifted = lift;
  }

  /**
   * Keep the PA hangs (black line arrays + truss towers between the camera and the castle) out of the
   * centre of a close framing: find the smallest sideways move (<= 8 m, aim kept) after which no hang
   * covers the central 56 % of the frame width. Evaluated once per shot from its start pose and cached,
   * so the offset is constant for the whole shot and a pure function of the cue.
   */
  private clearance(key: number, pos: THREE.Vector3, look: THREE.Vector3, fov: number): THREE.Vector3 | null {
    const hit = this.clearCache.get(key);
    if (hit !== undefined) return hit.lengthSq() > 0 ? hit : null;
    const out = new THREE.Vector3();
    this.clearCache.set(key, out);
    if (!this.occluders.length || !this.blocksCentre(pos, look, fov)) return null;
    // sideways = camera right, horizontal
    this.f.subVectors(look, pos);
    const side = this.tmp3.set(-this.f.z, 0, this.f.x);
    if (side.lengthSq() < 1e-6) return null;
    side.normalize();
    for (let step = 1; step <= 16; step++) {
      const d = step * 0.5;
      for (let j = 0; j < 2; j++) {
        const sg = j === 0 ? 1 : -1;
        this.probe.copy(pos).addScaledVector(side, d * sg);
        if (!this.blocksCentre(this.probe, look, fov)) {
          out.copy(side).multiplyScalar(d * sg);
          return out;
        }
      }
    }
    return null;
  }

  /** does a PA hang in front of the subject cover the centre of this framing (16:9)? */
  private blocksCentre(pos: THREE.Vector3, look: THREE.Vector3, fov: number): boolean {
    const f = this.f.subVectors(look, pos);
    const dist = f.length();
    if (dist < 1) return false;
    f.divideScalar(dist);
    const r = this.r.set(-f.z, 0, f.x);
    if (r.lengthSq() < 1e-6) return false;
    r.normalize();
    const u = this.u.crossVectors(r, f);
    const tv = Math.tan((fov * Math.PI) / 360);
    const th = (tv * 16) / 9;
    for (const oc of this.occluders) {
      let sx0 = Infinity,
        sx1 = -Infinity,
        sy0 = Infinity,
        sy1 = -Infinity,
        dmin = Infinity;
      for (let i = 0; i < 8; i++) {
        const c = this.corner.set(i & 1 ? oc.max.x : oc.min.x, i & 2 ? oc.max.y : oc.min.y, i & 4 ? oc.max.z : oc.min.z).sub(pos);
        const depth = c.dot(f);
        if (depth < 0.5) {
          dmin = -1;
          break;
        }
        dmin = Math.min(dmin, depth);
        const sx = c.dot(r) / (depth * th);
        const sy = c.dot(u) / (depth * tv);
        sx0 = Math.min(sx0, sx);
        sx1 = Math.max(sx1, sx);
        sy0 = Math.min(sy0, sy);
        sy1 = Math.max(sy1, sy);
      }
      if (dmin < 0 || dmin > dist * 0.9) continue; // behind the camera / behind the subject
      if (sx1 > -0.28 && sx0 < 0.28 && sy1 > -0.5 && sy0 < 0.5) return true;
    }
    return false;
  }

  /**
   * Haze scale a real camera crew would get for this framing (see ShotPose.haze): long lenses
   * compress the lit haze between camera and subject into a veil (≈0.5 at 16°), and cameras
   * standing in the pit / on the deck sit inside the stage haze cloud. Wide and aerial = 1.
   */
  static hazeFor(pos: THREE.Vector3, look: THREE.Vector3, fov: number): number {
    const tele = smoothstep(34, 12, fov);
    const dist = Math.hypot(look.x - pos.x, look.y - pos.y, look.z - pos.z);
    // in front of / on the stage below the wings, close to the set: inside the stage haze cloud
    const inCloud = (1 - smoothstep(10, 34, pos.z)) * (1 - smoothstep(60, 100, Math.abs(pos.x))) * (1 - smoothstep(24, 40, pos.y)) * (1 - smoothstep(26, 60, dist));
    return clamp(1 - 0.6 * Math.max(tele, inCloud * 0.9), 0.35, 1);
  }

  /**
   * Show the fade card at `black` (0..1, in display terms: 0.5 = the picture at half its displayed brightness).
   * The card blends in linear light before tone mapping, so the opacity is shaped by the display gamma to make
   * a linear `fadeOut` read as the even luma ramp of a video dip (v814.88–815.04).
   */
  private setCard(black: number): void {
    if (black <= 0.001) {
      if (this.card) this.card.visible = false;
      return;
    }
    const card = this.card ?? this.makeCard();
    card.visible = true;
    card.material.opacity = black >= 0.999 ? 1 : 1 - Math.pow(1 - black, 2.2);
  }

  private makeCard(): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 1, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
    // 2 m wide at 0.15 m: covers any show-camera lens (vertical fov ≤ 110°) at any aspect up to ~6:1
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    card.name = 'showcam-fade-card';
    card.position.set(0, 0, -CARD_Z);
    card.renderOrder = 1e9;
    card.frustumCulled = false;
    card.matrixAutoUpdate = false;
    card.updateMatrix();
    card.visible = false;
    // only the frame the show camera evaluated: another camera mode never renders the card (it hides itself)
    card.onBeforeRender = () => {
      if (this.evalFrame !== this.app.frame) {
        mat.opacity = 0;
        card.visible = false;
      }
    };
    this.app.camera.add(card);
    this.card = card;
    return card;
  }

  // --- authored cues ---------------------------------------------------------------------------

  /** authored camera cues (cached per show compile; empty when the show has none) */
  private cameraCues(): readonly Cue[] {
    const show = this.app.show;
    if (show.revision !== this.rev) {
      this.rev = show.revision;
      this.camCues = show.all('camera');
      this.paths.clear();
      // cue ids are positions in the compiled list: a recompiled show (e.g. an edited cue list) renumbers them
      this.clearCache.clear();
    }
    return this.camCues;
  }

  private fromCue(t: number, o: ShotPose): boolean {
    const show = this.app.show;
    if (this.cameraCues().length === 0) return false;
    const act = show.active('camera', t, this.cueBuf);
    let cue: Cue | null = null;
    for (let i = act.length - 1; i >= 0; i--) if (act[i].fx === 'shot') { cue = act[i]; break; }
    if (!cue) return false;
    const p = cue.p;
    const dur = Math.max(0.001, cue.dur);
    const s = t - cue.t; // seconds into the shot
    const k = easeK(p.ease, s / dur);
    // move window (`moveAt` / `moveDur`: `to`, `lookTo`, `rollTo`) and zoom window (`zoomAt` / `zoomDur`: `fovTo`)
    // inside the shot, so a static shot with a short move or zoom need not be split; default = the whole shot
    const km = windowK(p.ease, s, dur, p.moveAt, p.moveDur, k);
    const kz = windowK(p.ease, s, dur, p.zoomAt, p.zoomDur, k);
    // dips to black of the edit (`blackIn` → `fadeIn` at the start, `fadeOut` → `blackOut` at the end)
    this.black = fadeBlack(p, s, dur);
    const preset = typeof p.preset === 'string' ? SHOT_BY_ID.get(p.preset) : undefined;
    this.nudged = 0;
    // stutter edit (`alt` pose, cut every `altEvery` s): the odd slots show the second camera (v166.84–168.36:
    // two low frontal framings of the dragon cut together every 1–4 frames). Reduced motion (comfort) holds the
    // main angle. With the photosensitivity option (App.reduceFlashing) a stutter between a dark and a bright
    // framing is itself a flashing pattern, so the angles alternate no faster than every ALT_CALM s (< 1.5 flash
    // pairs per second).
    const alt = !this.steady && p.alt && typeof p.alt === 'object' ? (p.alt as Record<string, unknown>) : null;
    const every = clamp(num(p.altEvery, 0.1), 1 / 30, 10);
    const slot = this.app.reduceFlashing ? Math.max(every, ALT_CALM) : every;
    const altOn = alt !== null && Math.floor(s / slot) % 2 === 1;
    const subject = typeof p.subject === 'string' ? p.subject : null;
    if (preset) {
      o.fov = 50;
      preset.frame(this.L, k, rand01(cue.seed), t, o);
      this.current = CUE_LABEL.get(preset.id)!;
    } else if (altOn && alt && vec(alt.pos, o.pos) && vec(alt.look, o.look)) {
      if (subject) this.toSubject(subject, p.facing, cue.t, t, o);
      o.fov = clamp(num(alt.fov, num(p.fov, 50)), SHOT_FOV.min, SHOT_FOV.max);
      o.roll = num(alt.roll, 0);
      this.current = 'cue:alt';
      return true;
    } else {
      if (!vec(p.pos, o.pos) || !vec(p.look, o.look)) return false;
      // `subject` (e.g. 'mc'): pos / look / to / lookTo are offsets from the performer's feet, so the
      // camera follows him like the handheld deck operator in the film (no PA nudge: the framing is his)
      // PA hangs out of the centre of the framing (constant offset for the whole shot)
      const nudge = subject ? null : this.clearance(cue.id, o.pos, o.look, clamp(num(p.fov, 50), SHOT_FOV.min, SHOT_FOV.max));
      const keys = Array.isArray(p.path) ? this.pathKeys(cue) : null;
      o.fov = 50;
      o.roll = typeof p.roll === 'number' ? p.roll : 0;
      if (keys) {
        // `path`: a keyframed flight (FPV) through the keys, eased over the whole shot
        samplePath(keys, k * dur, o);
      } else {
        if (vec(p.to, this.tmp)) o.pos.lerp(this.tmp, km);
        if (vec(p.lookTo, this.tmp2)) o.look.lerp(this.tmp2, km);
        // `rollTo`: the camera banks from `roll` to `rollTo` with the move
        if (typeof p.rollTo === 'number' && Number.isFinite(p.rollTo)) o.roll = lerp(o.roll, p.rollTo, km);
      }
      if (subject) this.toSubject(subject, p.facing, cue.t, t, o);
      if (nudge) {
        o.pos.add(nudge);
        this.nudged = nudge.length();
      }
      this.current = keys ? 'cue:path' : 'cue';
      if (keys) return true;
    }
    if (typeof p.fov === 'number') {
      const f0 = clamp(p.fov, SHOT_FOV.min, SHOT_FOV.max);
      // `fovTo`: a real zoom during the shot (even pace in focal length), eased like the move (or in its window)
      o.fov = typeof p.fovTo === 'number' ? zoomFov(f0, clamp(p.fovTo, SHOT_FOV.min, SHOT_FOV.max), kz) : f0;
    }
    return true;
  }

  /**
   * Turn pos / look offsets into world positions around a performer (`subject`). With `facing` the offsets are in
   * the performer's own frame (+z = the way he faces, +x = his left, +y = up: the world axes while he faces the
   * field), so a shot authored "from the front" stays in front of him when he turns: `true` follows his facing at
   * every moment, `"start"` holds the facing of the shot's first frame (no swing during the shot).
   */
  private toSubject(who: string, facing: unknown, t0: number, t: number, o: ShotPose): void {
    if (facing === true || facing === 'start') {
      const yaw = this.facingAt(who, facing === 'start' ? t0 : t);
      if (yaw !== 0) {
        rotY(o.pos, yaw);
        rotY(o.look, yaw);
      }
    }
    const sp = this.subjectAt(who, t);
    o.pos.add(sp);
    o.look.add(sp);
    this.subjectShot = true;
  }

  /** a performer's facing at show time t (0 when unknown) */
  private facingAt(who: string, t: number): number {
    const crowd = (this.crowd ??= (this.app.get('crowd') as unknown as CrowdLike | undefined) ?? null);
    const y = crowd?.facingAt ? crowd.facingAt(who, t) : NaN;
    return Number.isFinite(y) ? y : 0;
  }

  /** the parsed keyframes of a `path` shot (cached per cue; null when the path is unusable) */
  private pathKeys(cue: Cue): PathKeys | null {
    const hit = this.paths.get(cue.id);
    if (hit !== undefined) return hit;
    const keys = parsePath(cue.p, cue.dur);
    this.paths.set(cue.id, keys);
    return keys;
  }

  /** a performer's feet at show time t (see `subject`), or the portal front when unavailable */
  private subjectAt(who: string, t: number): THREE.Vector3 {
    const crowd = (this.crowd ??= (this.app.get('crowd') as unknown as CrowdLike | undefined) ?? null);
    if (crowd?.subjectAt?.(who, t, this.subj)) return this.subj;
    return this.subj.copy(SUBJECT_FALLBACK);
  }

  // --- automatic director ----------------------------------------------------------------------

  private auto(t: number, beat: BeatInfo, o: ShotPose): void {
    const show = this.app.show;
    const tempo = show.tempo;
    const seg = tempo.segmentAt(t);
    const secIdx = tempo.sectionIndexAt(t);
    const sec = secIdx >= 0 ? tempo.sections[secIdx] : null;
    const energy = sec ? sec.energy : 0.6;
    const bpb = seg.beatsPerBar ?? 4;
    const barLen = (60 / seg.bpm) * bpb;
    let barsPerShot = !seg.kick ? (energy < 0.45 ? 8 : 4) : energy >= 0.85 ? 2 : energy >= 0.6 ? 4 : 8;
    while (barsPerShot > 1 && barsPerShot * barLen > 14) barsPerShot /= 2; // slow tempi: keep shots < 14 s
    const len = barsPerShot * barLen;
    // an authored cue that just ended acts like a section start (no flash cut after it)
    const s0 = Math.max(sec ? sec.start : 0, seg.start, this.lastCueEnd(t));
    const s1 = Math.min(sec ? sec.end : show.duration, seg.end);
    const minLen = Math.min(len, barLen) * 0.9;

    // slot = bar-aligned window, merged with tiny leftovers at section / tempo boundaries
    const idx = Math.floor((t - seg.anchor) / len);
    let lo = seg.anchor + idx * len;
    let hi = lo + len;
    if (lo - s0 < minLen) {
      lo = s0;
      if (hi - s0 < minLen) hi += len;
    }
    if (s1 - lo < minLen) lo -= len;
    if (s1 - hi < minLen) hi = s1;
    lo = Math.max(lo, s0);
    hi = Math.min(Math.max(hi, lo + 0.5), Math.max(s1, lo + 0.5));

    const key = (secIdx + 1) * 1e7 + Math.round(lo * 1000); // unique per slot, no hashing per frame
    if (key !== this.slotKey) {
      this.slotKey = key;
      this.slot.start = lo;
      this.slot.end = hi;
      const mood = this.mood(lo, hi, energy, seg.kick);
      let pick = this.choose(hashN(key, 1), mood);
      // never show the same framing twice in a row within a section: the previous slot showed
      // either its base pick or that pick's alternate, so avoid both (pure, no recursion)
      if (lo - len >= s0 - 1e-3) {
        const prevLo = lo - len;
        const prevKey = (secIdx + 1) * 1e7 + Math.round(prevLo * 1000);
        const prevBase = this.choose(hashN(prevKey, 1), this.mood(prevLo, lo, energy, seg.kick));
        const prevAlt = this.alternate(prevBase, prevKey);
        if (pick === prevBase || pick === prevAlt) pick = this.alternate(pick, key);
        while (pick === prevBase || pick === prevAlt) pick = (pick + 1) % SHOTS.length;
      }
      this.slotShot = pick;
      this.slotVariant = rand01(hashN(key, 3));
    }
    const shot = SHOTS[this.slotShot];
    this.current = shot.id;
    const k = easeDolly((t - this.slot.start) / Math.max(0.001, this.slot.end - this.slot.start));
    o.fov = 50;
    shot.frame(this.L, k, this.slotVariant, t, o);
    // PA hangs out of the centre of the framing (from the slot's start pose, constant over the slot)
    this.nudged = 0;
    if (shot.kind === 'stage' || shot.kind === 'side') {
      const key = -1 - this.slotKey; // negative: never collides with cue ids
      if (!this.clearCache.has(key)) {
        const s0 = this.startPose;
        s0.fov = 50;
        s0.roll = 0;
        shot.frame(this.L, 0, this.slotVariant, this.slot.start, s0);
        this.clearance(key, s0.pos, s0.look, s0.fov);
      }
      const nudge = this.clearCache.get(key);
      if (nudge && nudge.lengthSq() > 0) {
        o.pos.add(nudge);
        this.nudged = nudge.length();
      }
    }
    // handheld operators breathe; cameras near the stage feel the kick
    const sh = this.steady ? 0 : (shot.shake ?? 0);
    if (sh > 0) {
      o.pos.x += sh * wobble(t * 0.9, 1);
      o.pos.y += sh * 0.7 * wobble(t * 1.1, 2) - sh * 0.4 * beat.kick * beat.energy;
      o.roll += sh * 0.5 * wobble(t * 0.6, 3);
    }
  }

  /** what the slot [a, b) will show: counts cues launched in (or just before) the window */
  private mood(a: number, b: number, energy: number, kick: boolean): SlotMood {
    const fw = countIn(this.app.show.all('fireworks'), a - 1.5, b, FIREWORK_FX);
    const py = countIn(this.app.show.all('pyro'), a - 0.5, b, PYRO_FX);
    const per = 6 / Math.max(1, b - a); // normalise to "per 6 seconds"
    return { energy, kick, fireworks: Math.min(1, (fw * per) / 3), pyro: Math.min(1, (py * per) / 3), fog: this.fogAt(a, b) };
  }

  /** 0..1 haze thickness over the slot [a, b): the authored haze level + low fog / smoke bursts */
  private fogAt(a: number, b: number): number {
    const fog = this.app.show.all('fog');
    let level = 0.55;
    for (let i = 0; i < fog.length && fog[i].t <= a; i++) {
      const c = fog[i];
      if (c.fx !== 'level') continue;
      const v = typeof c.p.haze === 'number' ? c.p.haze : typeof c.p.density === 'number' ? c.p.density : level;
      if (Number.isFinite(v)) level = v;
    }
    const low = countIn(fog, a - 8, b, LOWFOG_FX);
    return clamp((level - 0.45) * 1.6 + low * 0.35, 0, 1);
  }

  /** end time of the latest authored camera cue that finished at or before t (0 if none) */
  private lastCueEnd(t: number): number {
    const cues = this.cameraCues();
    let end = 0;
    for (let i = 0; i < cues.length && cues[i].t <= t; i++) if (cues[i].fx === 'shot' && cues[i].end <= t && cues[i].end > end) end = cues[i].end;
    return end;
  }

  /** deterministic replacement for a pick that would repeat */
  private alternate(pick: number, key: number): number {
    return (pick + 1 + (hashN(key, 2) % (SHOTS.length - 1))) % SHOTS.length;
  }

  private choose(seed: number, m: SlotMood): number {
    let total = 0;
    for (const s of SHOTS) total += Math.max(0.02, s.weight(m));
    let r = rand01(seed) * total;
    for (let i = 0; i < SHOTS.length; i++) {
      r -= Math.max(0.02, SHOTS[i].weight(m));
      if (r <= 0) return i;
    }
    return SHOTS.length - 1;
  }

  /** ids of the preset framings (usable as `p.preset` in camera.shot cues) */
  static get presets(): string[] {
    return SHOTS.map((s) => s.id);
  }
}

/** number of cues with fx in `fx` starting in [a, b) (cues sorted by start) */
function countIn(cues: readonly Cue[], a: number, b: number, fx: Set<string>): number {
  let lo = 0,
    hi = cues.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].t < a) lo = mid + 1;
    else hi = mid;
  }
  let n = 0;
  for (let i = lo; i < cues.length && cues[i].t < b; i++) if (fx.has(cues[i].fx)) n++;
  return n;
}

const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** a shot's `ease` applied to raw progress (clamped to 0..1) */
function easeK(ease: unknown, raw: number): number {
  const r = clamp(raw, 0, 1);
  return ease === 'linear' ? r : ease === 'in' ? r * r : ease === 'out' ? 1 - (1 - r) * (1 - r) : easeInOut(r);
}

/**
 * Eased progress of a window inside a shot (`moveAt` / `moveDur`, `zoomAt` / `zoomDur`: s from the shot start):
 * 0 before it, 1 after it. Without either param the whole shot (`whole`, the shot's own eased progress).
 */
function windowK(ease: unknown, s: number, dur: number, at: unknown, len: unknown, whole: number): number {
  if (typeof at !== 'number' && typeof len !== 'number') return whole;
  const a = clamp(num(at, 0), 0, dur);
  const l = num(len, dur - a);
  if (!(l > 1e-3)) return s >= a ? 1 : 0;
  return easeK(ease, (s - a) / l);
}

/**
 * 0..1 black of the edit at s seconds into a shot of `dur` s: `blackIn` s of black, then a `fadeIn` s fade up;
 * at the end a `fadeOut` s fade down, then `blackOut` s of black (a dip to black across a cut = the first shot's
 * `fadeOut` / `blackOut` + the next shot's `blackIn` / `fadeIn`). Linear in displayed brightness.
 */
function fadeBlack(p: Record<string, unknown>, s: number, dur: number): number {
  const fi = num(p.fadeIn, 0);
  const fo = num(p.fadeOut, 0);
  const bi = num(p.blackIn, 0);
  const bo = num(p.blackOut, 0);
  if (fi <= 0 && fo <= 0 && bi <= 0 && bo <= 0) return 0;
  if (s < bi) return 1;
  const r = dur - s;
  if (r < bo) return 1;
  let vis = 1;
  if (fi > 0) vis = Math.min(vis, clamp((s - bi) / fi, 0, 1));
  if (fo > 0) vis = Math.min(vis, clamp((r - bo) / fo, 0, 1));
  return 1 - vis;
}

/** rotate an offset about the vertical axis by a performer's yaw (yaw 0 = identity; +z turns to (sin, cos)) */
function rotY(v: THREE.Vector3, yaw: number): void {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const x = v.x;
  v.x = x * c + v.z * s;
  v.z = -x * s + v.z * c;
}

const logTan = (fov: number): number => Math.log(Math.tan((clamp(fov, SHOT_FOV.min, SHOT_FOV.max) * Math.PI) / 360));

/**
 * Parse a shot's `path`: [{ at (s from the shot start), pos [x,y,z], look?, roll? (rad), fov? (deg) }, ...].
 * Key 0 is the shot's own pos / look / roll / fov; `to` / `lookTo` / `rollTo` / `fovTo`, when any is given, make
 * the key at `dur` (the others of that key hold the last value). A key without look / roll / fov takes the value
 * interpolated in time between its neighbours that have one. Null when fewer than two usable keys remain.
 */
function parsePath(p: Record<string, unknown>, dur: number): PathKeys | null {
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  if (!vec(p.pos, a) || !vec(p.look, b)) return null;
  interface Key {
    at: number;
    pos: number[];
    look: number[] | null;
    roll: number | null;
    fov: number | null;
  }
  const keys: Key[] = [{ at: 0, pos: [a.x, a.y, a.z], look: [b.x, b.y, b.z], roll: num(p.roll, 0), fov: num(p.fov, 50) }];
  const mid: Key[] = [];
  for (const e of p.path as unknown[]) {
    if (!e || typeof e !== 'object') continue;
    const q = e as Record<string, unknown>;
    const at = num(q.at, NaN);
    if (!(at > 1e-3 && at < dur - 1e-3) || !vec(q.pos, a)) continue;
    const hasLook = vec(q.look, b);
    mid.push({ at, pos: [a.x, a.y, a.z], look: hasLook ? [b.x, b.y, b.z] : null, roll: typeof q.roll === 'number' && Number.isFinite(q.roll) ? q.roll : null, fov: typeof q.fov === 'number' && Number.isFinite(q.fov) ? q.fov : null });
  }
  mid.sort((x, y) => x.at - y.at);
  for (const m of mid) if (m.at > keys[keys.length - 1].at + 1e-3) keys.push(m);
  const endPos = vec(p.to, a);
  const endLook = vec(p.lookTo, b);
  const endRoll = typeof p.rollTo === 'number' && Number.isFinite(p.rollTo) ? p.rollTo : null;
  const endFov = typeof p.fovTo === 'number' && Number.isFinite(p.fovTo) ? p.fovTo : null;
  if (endPos || endLook || endRoll !== null || endFov !== null) {
    const last = keys[keys.length - 1];
    keys.push({ at: Math.max(dur, last.at + 1e-3), pos: endPos ? [a.x, a.y, a.z] : last.pos.slice(), look: endLook ? [b.x, b.y, b.z] : null, roll: endRoll, fov: endFov });
  }
  if (keys.length < 2) return null;
  const n = keys.length;
  const at = new Float64Array(n);
  const v = new Float64Array(n * PATH_CH);
  // channel value of key i, or NaN when the key leaves it open
  const raw = (k: Key, c: number): number => (c < 3 ? k.pos[c] : c < 6 ? (k.look ? k.look[c - 3] : NaN) : c === 6 ? (k.roll ?? NaN) : k.fov === null ? NaN : logTan(k.fov));
  for (let i = 0; i < n; i++) at[i] = keys[i].at;
  for (let c = 0; c < PATH_CH; c++) {
    for (let i = 0; i < n; i++) {
      let x = raw(keys[i], c);
      if (Number.isNaN(x)) {
        // interpolate between the nearest keys that define this channel (key 0 always does)
        let lo = i - 1;
        while (lo > 0 && Number.isNaN(raw(keys[lo], c))) lo--;
        let hi = i + 1;
        while (hi < n && Number.isNaN(raw(keys[hi], c))) hi++;
        const x0 = v[lo * PATH_CH + c];
        x = hi < n ? lerp(x0, raw(keys[hi], c), (at[i] - at[lo]) / Math.max(1e-6, at[hi] - at[lo])) : x0;
      }
      v[i * PATH_CH + c] = x;
    }
  }
  return { n, at, v };
}

/**
 * Sample a keyframed flight at u seconds into the shot: a cubic Hermite through the keys with finite-difference
 * (Catmull-Rom, non-uniform) tangents, so position, aim, roll and lens change with a continuous velocity like a
 * flown drone; two keys give a straight linear move. The lens is interpolated in log(tan(fov/2)) (even zoom).
 */
function samplePath(K: PathKeys, u: number, o: ShotPose): void {
  const { n, at, v } = K;
  let i = 0;
  while (i < n - 2 && u >= at[i + 1]) i++;
  const h = Math.max(1e-6, at[i + 1] - at[i]);
  const f = clamp((u - at[i]) / h, 0, 1);
  const f2 = f * f;
  const f3 = f2 * f;
  const h00 = 2 * f3 - 3 * f2 + 1;
  const h10 = f3 - 2 * f2 + f;
  const h01 = -2 * f3 + 3 * f2;
  const h11 = f3 - f2;
  const a0 = i * PATH_CH;
  const a1 = a0 + PATH_CH;
  for (let c = 0; c < PATH_CH; c++) {
    const m0 = pathTangent(K, i, c) * h;
    const m1 = pathTangent(K, i + 1, c) * h;
    const x = h00 * v[a0 + c] + h10 * m0 + h01 * v[a1 + c] + h11 * m1;
    if (c < 3) o.pos.setComponent(c, x);
    else if (c < 6) o.look.setComponent(c - 3, x);
    else if (c === 6) o.roll = x;
    else o.fov = clamp((Math.atan(Math.exp(x)) * 360) / Math.PI, SHOT_FOV.min, SHOT_FOV.max);
  }
}

/** d(channel)/dt at key j (one-sided at the ends) */
function pathTangent(K: PathKeys, j: number, c: number): number {
  const { n, at, v } = K;
  const lo = Math.max(0, j - 1);
  const hi = Math.min(n - 1, j + 1);
  return (v[hi * PATH_CH + c] - v[lo * PATH_CH + c]) / Math.max(1e-6, at[hi] - at[lo]);
}

/** read [x,y,z] from a cue param */
function vec(v: unknown, out: THREE.Vector3): boolean {
  if (!Array.isArray(v) || v.length < 3) return false;
  const x = Number(v[0]),
    y = Number(v[1]),
    z = Number(v[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;
  out.set(x, y, z);
  return true;
}
