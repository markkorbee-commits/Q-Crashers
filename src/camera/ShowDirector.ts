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
}
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
    if (!this.fromCue(t, o)) this.auto(t, beat, o);
    this.clearTerrace(o);
    this.liftOverCrowd(o);
    // a smoke-filled site (atmos.glow smoke) is the picture: long lenses keep the whole veil then
    o.haze = lerp(ShowDirector.hazeFor(o.pos, o.look, o.fov), 1, clamp(this.app.env.smoke, 0, 1));
  }

  /**
   * The photo terrace (deck 5 m, rails to 6.1 m, z 166–171.5): a show camera standing on or behind it
   * below 8 m would film its own rails and glass. The official terrace shots are clean: the operator
   * works from the front edge. Such a camera moves forward to just in front of the front rail (≤ 9 m,
   * irrelevant for the long lenses used from there), keeping its height and aim.
   */
  private clearTerrace(o: ShotPose): void {
    const T = TERRACE;
    const p = o.pos;
    if (p.y >= T.deckY + 3 || p.y < T.deckY - 0.5 || Math.abs(p.x) > T.x1 + 1 || p.z < T.z0 - 0.6 || p.z > T.z1 + 5) return;
    if (o.look.z >= p.z - 5) return; // not looking towards the stage over the front rail
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

  // --- authored cues ---------------------------------------------------------------------------

  /** authored camera cues (cached per show compile; empty when the show has none) */
  private cameraCues(): readonly Cue[] {
    const show = this.app.show;
    if (show.revision !== this.rev) {
      this.rev = show.revision;
      this.camCues = show.all('camera');
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
    const raw = clamp((t - cue.t) / Math.max(0.001, cue.dur), 0, 1);
    const k = p.ease === 'linear' ? raw : p.ease === 'in' ? raw * raw : p.ease === 'out' ? 1 - (1 - raw) * (1 - raw) : easeInOut(raw);
    const preset = typeof p.preset === 'string' ? SHOT_BY_ID.get(p.preset) : undefined;
    this.nudged = 0;
    // stutter edit (`alt` pose, cut every `altEvery` s): the odd slots show the second camera.
    // Reduced motion (comfort) holds the main angle.
    const alt = !this.steady && p.alt && typeof p.alt === 'object' ? (p.alt as Record<string, unknown>) : null;
    const altOn = alt !== null && Math.floor((t - cue.t) / clamp(num(p.altEvery, 0.1), 1 / 30, 10)) % 2 === 1;
    if (preset) {
      o.fov = 50;
      preset.frame(this.L, k, rand01(cue.seed), t, o);
      this.current = CUE_LABEL.get(preset.id)!;
    } else if (altOn && alt && vec(alt.pos, o.pos) && vec(alt.look, o.look)) {
      o.fov = clamp(num(alt.fov, num(p.fov, 50)), SHOT_FOV.min, SHOT_FOV.max);
      o.roll = num(alt.roll, 0);
      this.current = 'cue:alt';
      return true;
    } else {
      if (!vec(p.pos, o.pos) || !vec(p.look, o.look)) return false;
      // PA hangs out of the centre of the framing (constant offset for the whole shot)
      const nudge = this.clearance(cue.id, o.pos, o.look, clamp(num(p.fov, 50), SHOT_FOV.min, SHOT_FOV.max));
      if (vec(p.to, this.tmp)) o.pos.lerp(this.tmp, k);
      if (vec(p.lookTo, this.tmp2)) o.look.lerp(this.tmp2, k);
      if (nudge) {
        o.pos.add(nudge);
        this.nudged = nudge.length();
      }
      o.fov = 50;
      o.roll = typeof p.roll === 'number' ? p.roll : 0;
      this.current = 'cue';
    }
    if (typeof p.fov === 'number') {
      const f0 = clamp(p.fov, SHOT_FOV.min, SHOT_FOV.max);
      // `fovTo`: a real zoom during the shot (even pace in focal length), eased like the move
      o.fov = typeof p.fovTo === 'number' ? zoomFov(f0, clamp(p.fovTo, SHOT_FOV.min, SHOT_FOV.max), k) : f0;
    }
    return true;
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
