import * as THREE from 'three';
import type { App } from '../core/App';
import { hash32, rand01 } from '../core/rng';
import type { FrameContext, QualitySettings, System } from '../core/types';
import { resolveColor } from '../show/colors';
import type { Cue } from '../show/ShowTypes';
import { laserize } from './laserColor';
import { LaserRenderer, SURF_CONE, SURF_FOG, SURF_SHEET } from './LaserRenderer';
import { type Emitter, type EmitterGroup, LaserRig } from './LaserRig';

/**
 * LaserSystem ('lasers') — show lasers of the 2026 RED Endshow.
 *
 * Cue contract (docs/show-format.md):
 *   look  preset fan|sheet|tunnel|sweep|crossfire|sky|wave|cone|grid|burst (+ extension: chevron);
 *         color, color2, count, speed (cycles/bar), spread (deg), tilt (deg), origin stage|field|all,
 *         height (sheet / web / chevron, m), intensity, kick;
 *         extensions (optional): fade (s crossfade from the look it replaces), aim [x,y,z] (world point the
 *         figure centres on), distance (chevron convergence Z), segments (piano bounce: segments lit)
 *   hit   short full-rig burst: color, pattern fan|star
 *   off   all lasers off for dur
 *
 * Semantics: every projector runs the latest-started active `look` that selects it (target groups /
 * origin / left|right|center filters, or the preset's natural projector set). Sheets live on their own
 * layer, so a deck sheet and a beam figure can run on the same projectors (as a laser console layers
 * cues). Everything is a pure function of show time (+ the tempo map): pause / seek / restart give the
 * identical picture.
 *
 * Audience mode (design-bible §7.4): "As filmed" (empty field) lets sheets / tunnels / the web skim 1–3 m
 * over the floor; "Tribe" mode (crowd present) keeps audience-level sheets, tunnels, the web and the
 * chevron >= 4.5 m above the LOCAL head plane — terrain-aware, so the 5.2 m side banks, the crest and the
 * bar queues on them are cleared too (tribeLift / sheetClearancePitch).
 *
 * Sheets: a projector well above the requested height slopes its plane gently (reaching the height only
 * 110–150 m out) instead of diving through the field. Under a sheet that skims a fog.lowfog layer the fog
 * tops light up ("laser sea", one extra surface: pushSea); a skimming tunnel feeds the same layer.
 * In As-filmed mode a `tunnel` with `height` is a flattened cone of near-horizontal beams at 0.5–4 m.
 * Budget: design-bible §7.4 segment counts (LaserRenderer), thinned for very large drawing buffers.
 *
 * Rendering (LaserRenderer): instanced camera-facing ribbons with a physical single-scattering haze
 * model and shutter motion smear, instanced ruled surfaces for sheets and tunnels, instanced aperture
 * flares + hit spots, instanced projector housings.
 */

type Preset = 'fan' | 'sheet' | 'tunnel' | 'sweep' | 'crossfire' | 'sky' | 'wave' | 'cone' | 'grid' | 'burst' | 'chevron';

const G: Record<EmitterGroup, number> = { deck: 1, tower: 2, high: 4, corner: 8, pillar: 16, base: 32, turret: 64, dragon: 128, piano: 256 };
const STAGE_MASK = G.deck | G.tower | G.high | G.corner | G.dragon;
const FIELD_MASK = G.pillar | G.base | G.turret | G.piano;
/** head plane of a standing crowd (m) and the audience-scanning clearance above it (design-bible §7.4) */
const HEAD_PLANE = 1.8;
const TRIBE_MIN_H = HEAD_PLANE + 4.5;
/** top of the fog.lowfog layer (FogSystem: puffs at Y ≈ 0.45 ± 0.5) — the "laser sea" glows there */
const FOG_TOP = 0.95;
/** the low fog lies on the paved field (|X| ≤ 44, FogSystem regions ±45): the sea layer stops at the bank toe */
const FOG_ZONE_X = 47;
/** audience area checked by the Tribe-mode clearance (field + side banks + back plaza) */
const AUD_ZMIN = 2;
const AUD_ZMAX = 175;
const AUD_XMAX = 125;

interface PresetDef {
  count: number;
  /** degrees */
  spread: number;
  /** degrees */
  tilt: number;
  speed: number;
  stage: number;
  field: number;
  /** extra per-emitter selection rule for the preset's natural set (only when no explicit target group) */
  pick?: (e: Emitter) => boolean;
  /** Tribe mode (crowd present): projectors that keep the figure above the heads (replaces stage / field) */
  tribeStage?: number;
  tribeField?: number;
  tribePick?: (e: Emitter) => boolean;
}

const PRESETS: Record<Preset, PresetDef> = {
  fan: { count: 12, spread: 84, tilt: 7, speed: 0.25, stage: G.deck | G.high, field: G.pillar | G.turret },
  sheet: {
    count: 0,
    spread: 104,
    tilt: NaN,
    speed: 0.12,
    stage: G.deck,
    field: G.turret,
    // over a crowd the liquid sky comes from the lower castle-roof units (Y 10) as a ceiling
    tribeStage: G.tower,
    tribePick: (e) => e.group !== 'tower' || e.pos.y < 12,
  },
  tunnel: {
    count: 8,
    spread: 22,
    tilt: 1.5,
    speed: 0.5,
    stage: G.deck,
    field: G.pillar,
    // the centre deck pair down the aisle; from the field the last pillar pair back at the stage
    pick: (e) => (e.group === 'deck' ? Math.abs(e.pos.x) < 5 : e.group === 'pillar' ? e.row === 3 : true),
    tribeStage: G.tower,
    tribePick: (e) => e.group !== 'tower' || (e.pos.y > 12 && Math.abs(e.pos.x) < 20),
  },
  sweep: { count: 2, spread: 76, tilt: 5, speed: 0.5, stage: G.deck | G.tower, field: G.pillar },
  crossfire: { count: 3, spread: 5, tilt: 30, speed: 0.125, stage: G.dragon | G.tower, field: G.piano },
  sky: { count: 3, spread: 26, tilt: 81, speed: 0.12, stage: G.high | G.tower, field: G.pillar },
  wave: { count: 10, spread: 96, tilt: 3, speed: 0.5, stage: G.deck, field: G.pillar },
  cone: {
    count: 18,
    spread: 38,
    tilt: 6,
    speed: 0.25,
    stage: G.deck,
    field: G.pillar,
    pick: (e) => e.group !== 'deck' || e.order % 2 === 0,
  },
  grid: { count: 10, spread: 60, tilt: 50, speed: 0.1, stage: G.deck | G.high, field: G.base, tribeField: G.pillar },
  burst: {
    count: 36,
    spread: 124,
    tilt: 12,
    speed: 0.12,
    stage: G.corner | G.deck,
    field: G.turret,
    // side positions: the corner towers + the centre deck pair; in the field the arm-end turrets
    pick: (e) => (e.group === 'deck' ? Math.abs(e.pos.x) < 5 : e.group === 'turret' ? e.order % 3 === 1 : true),
  },
  // gold chevron (In The Cold, show-analysis 8.1): 5 + 5 deck units, centre pair dark
  chevron: {
    count: 12,
    spread: 16,
    tilt: -1.5,
    speed: 0.06,
    stage: G.deck,
    field: G.deck,
    pick: (e) => Math.abs(e.pos.x) > 5,
    tribeStage: G.tower,
    tribeField: G.tower,
  },
};

/** cue target tokens → projector groups (+ optional side restriction) */
const TOKENS: Record<string, [number, number]> = {
  laser_stage: [STAGE_MASK, 0],
  stage: [STAGE_MASK, 0],
  laser_field: [G.pillar | G.turret | G.piano, 0],
  field: [FIELD_MASK, 0],
  deck_front: [G.deck, 0],
  deck: [G.deck, 0],
  deck_back: [G.deck, 0],
  fixtures_floor: [G.deck, 0],
  dj_booth: [G.deck, 0],
  towers_top: [G.tower, 0],
  towers: [G.tower, 0],
  castle: [G.tower, 0],
  roof: [G.tower | G.high, 0],
  wings: [G.high, 0],
  wing_tips: [G.high, 0],
  fixtures_truss: [G.high | G.tower, 0],
  wing_left: [G.high, -1],
  wing_right: [G.high, 1],
  dragon: [G.dragon, 0],
  dragon_head: [G.dragon, 0],
  dragon_mouth: [G.dragon, 0],
  dragon_eyes: [G.dragon, 0],
  corners: [G.corner, 0],
  arms: [G.corner | G.turret, 0],
  sides: [G.corner | G.turret, 0],
  fireworks_sides: [G.corner | G.turret, 0],
  turrets: [G.turret, 0],
  pillars_top: [G.pillar, 0],
  pillars: [G.pillar, 0],
  delay_towers: [G.pillar, 0],
  pillars_base: [G.base, 0],
  plinths: [G.base, 0],
  piano: [G.piano, 0],
  foh: [G.piano, 0],
};

/** crude solid volumes of the stage set (design-bible §5): beams from the field stop on them */
const STAGE_BOXES: readonly (readonly number[])[] = [
  [-37, 0, -14, 37, 1.9, 0.3], // central deck
  [-92, 0, -40, 92, 9.5, -4], // castle wall + side sections
  [-42, 0, -40, 42, 24, -6], // dragon, crest and inner wings
];

/** piano bounce path: [fromRow, fromSide, toRow, toSide]; fromRow -1 = the piano light tube */
const BOUNCE: readonly (readonly [number, number, number, number])[] = [
  [-1, 0, 0, 1], // piano -> R1 (889: a single beam up-right)
  [-1, 0, 0, -1], // piano -> L1 (899: the "A" roof between the row-1 crystals)
  [0, -1, 1, -1], // L1 -> L2 (909: zig-zag piano -> L1 -> L2)
  [0, 1, 1, 1], // R1 -> R2 (918: the symmetric V)
  [1, -1, 2, 1], // extensions: the bounce keeps zig-zagging down the aisle
  [1, 1, 2, -1],
  [2, 1, 3, -1],
  [2, -1, 3, 1],
];

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const MAX_SLOTS = 24;
/** exposure time of the virtual camera / eye used for beam motion smear (s) */
const SHUTTER = 1 / 45;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** numeric cue parameter with default + range (unknown / NaN values fall back to the default) */
const num = (v: unknown, def: number, lo: number, hi: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? (v < lo ? lo : v > hi ? hi : v) : def;

class LookSlot {
  cue: Cue | null = null;
  preset: Preset = 'fan';
  hit = false;
  starHit = false;
  color = new THREE.Color();
  color2 = new THREE.Color();
  hasColor2 = false;
  count = 0;
  spread = 0;
  tilt = 0;
  tiltGiven = false;
  speed = 0;
  height = 4;
  intensity = 1;
  kick = false;
  fade = 0;
  origin = 0; // 1 stage, 2 field, 3 all
  groupMask = 0;
  groupSide = 0;
  hasGroupToken = false;
  filter = 0; // 0 none, -1 left, 1 right, 2 center
  env = 1;
  /** musical time used by the generators (set per pass), and its value at the current show time */
  bars = 0;
  barsNow = 0;
  barLen = 1.6;
  phase0 = 0;
  /** requested surfaces / granted surfaces for this frame */
  surfWant = 0;
  surfGrant = 0;
  members: Emitter[] = [];
  /** effective beams per emitter after the budget */
  nEff = 0;
  /** 0 = beam figure layer, 1 = sheet layer */
  layer = 0;
  heightGiven = false;
  /** optional world aim point (param `aim: [x,y,z]`) */
  hasAim = false;
  aim = new THREE.Vector3();
}

export class LaserSystem implements System {
  readonly name = 'lasers';
  private app!: App;
  private enabled = true;
  private q!: QualitySettings;
  private readonly rig = new LaserRig();
  private readonly gfx = new LaserRenderer();
  private rigDirty = true;
  private frameNo = 0;

  // per-frame scratch (no allocations in update)
  private readonly act: Cue[] = [];
  private readonly slots: LookSlot[] = Array.from({ length: MAX_SLOTS }, () => new LookSlot());
  private slotCount = 0;
  private cur = new Int16Array(0);
  private prev = new Int16Array(0);
  private toCam = new Float32Array(0);
  private flare = new Float32Array(0); // per emitter: r, g, b, eye
  private readonly tmpColor = new THREE.Color();
  private readonly tmpColor2 = new THREE.Color();
  private readonly v2 = new THREE.Vector2();
  private readonly camPos = new THREE.Vector3();
  // direction scratch (written by dirYP / basis helpers)
  private dx = 0;
  private dy = 0;
  private dz = 0;
  // origin override for mirror-bounce segments
  private oOverride = false;
  private ox = 0;
  private oy = 0;
  private oz = 0;
  /** audience present (Tribe mode): audience-level sheets / tunnels / web are clamped above the heads */
  private tribe = false;
  /** 'auto' follows the crowd system / URL; 'tribe' | 'filmed' force the mode */
  audienceMode: 'auto' | 'tribe' | 'filmed' = 'auto';
  private crowdSys: { mode?: unknown; count?: unknown } | null | undefined = undefined;
  private bx = new Float32Array(9); // basis F, R, N
  private offGate = 1;
  private beatGate = 1;
  private kickEnv = 0;
  private hasKick = false;
  private budgetScale = 1;
  private requested = 0;
  private envR = 0;
  private envG = 0;
  private envB = 0;
  private envPow = 0;
  private audienceWash = 0;
  private lowHaze = 0;
  /** low-fog "sea" lit by the skimming sheets this frame (colour × power, summed over the sheets) */
  private seaR = 0;
  private seaG = 0;
  private seaB = 0;
  /** second scan colour (lights the crests) */
  private sea2R = 0;
  private sea2G = 0;
  private sea2B = 0;
  /** ribbon width scale: budget-thinned figures draw slightly wider beams */
  private beamWidth = 1;
  private terrain: { heightAt?(x: number, z: number): number } | null = null;
  private looksSig = -1;
  // shutter smear bookkeeping
  private recording = false;
  private recIdx = 0;
  private recCount = 0;
  private smear = new Float32Array(0);
  private stat = { beams: 0, requested: 0, surfaces: 0, sprites: 0, active: 0, looks: '' };

  init(app: App): void {
    this.app = app;
    this.q = app.quality;
    this.gfx.init(app.quality);
    app.scene.add(this.gfx.group);
    // provisional layout from what is registered now (stage systems init before us);
    // rebuilt on the first frame once the grounds have registered the pillars / FOH
    this.buildRig();
  }

  private buildRig(): void {
    const a = this.app.anchors;
    this.rig.build(a);
    this.rig.register(a);
    const n = this.rig.emitters.length;
    // two layers per projector: 0 = beam figures, 1 = sheets (a console can layer a sheet under a figure)
    this.cur = new Int16Array(n * 2);
    this.prev = new Int16Array(n * 2);
    this.toCam = new Float32Array(n * 3);
    this.flare = new Float32Array(n * 4);
    this.gfx.buildHousings(this.rig.emitters);
    this.rigDirty = false;
  }

  setQuality(q: QualitySettings): void {
    this.q = q;
    this.gfx.setQuality(q);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.gfx.group.visible = on;
  }

  // ------------------------------------------------------------------------------------------ frame
  update(ctx: FrameContext): void {
    if (!this.enabled) return;
    const app = this.app;
    this.frameNo++;
    if (this.rigDirty || (this.frameNo % 60 === 1 && this.rig.anchorSignature(app.anchors) !== this.rig.signatureValue)) this.buildRig();

    const t = ctx.showTime;
    const cam = ctx.camera;
    // the camera rig updates later in the frame: use last frame's pose (flares only; shaders use the live one)
    this.camPos.copy(cam.position);
    this.updateUniforms(ctx);

    const emitters = this.rig.emitters;
    const nE = emitters.length;
    for (let i = 0; i < nE; i++) {
      const e = emitters[i];
      let x = this.camPos.x - e.pos.x;
      let y = this.camPos.y - e.pos.y;
      let z = this.camPos.z - e.pos.z;
      const l = Math.sqrt(x * x + y * y + z * z) || 1;
      x /= l;
      y /= l;
      z /= l;
      this.toCam[i * 3] = x;
      this.toCam[i * 3 + 1] = y;
      this.toCam[i * 3 + 2] = z;
      this.cur[i * 2] = this.cur[i * 2 + 1] = -1;
      this.prev[i * 2] = this.prev[i * 2 + 1] = -1;
    }
    this.flare.fill(0);
    this.envR = this.envG = this.envB = this.envPow = 0;
    this.audienceWash = 0;
    this.seaR = this.seaG = this.seaB = 0;
    this.sea2R = this.sea2G = this.sea2B = 0;
    if (!this.terrain) this.terrain = (app.get('terrain') as { heightAt?(x: number, z: number): number } | undefined) ?? {};

    this.tribe = this.detectTribe();

    // beat gates (deterministic: derived from show time through the tempo map)
    const beat = ctx.beat;
    this.hasKick = beat.hasKick;
    this.kickEnv = beat.kick;
    this.beatGate = beat.hasKick ? (beat.phase < 0.16 ? 1 : Math.max(0.05, Math.exp(-(beat.phase - 0.16) * 10))) : 1;

    // ------------------------------------------------------------------ resolve active cues
    const act = app.show.active('lasers', t, this.act);
    this.slotCount = 0;
    this.offGate = 1;
    for (const c of act) {
      if (c.fx === 'off') {
        const a = t - c.t;
        const b = c.t + c.dur - t;
        this.offGate = Math.min(this.offGate, 1 - clamp01(a / 0.03) * clamp01(b / 0.03));
      }
    }
    for (const c of act) {
      if (c.fx !== 'look' && c.fx !== 'hit') continue;
      if (this.slotCount >= MAX_SLOTS) break;
      const s = this.slots[this.slotCount];
      if (!this.resolveSlot(s, c, t)) continue;
      const si = this.slotCount++;
      s.members.length = 0;
      for (let i = 0; i < nE; i++) {
        const e = emitters[i];
        if (!this.selects(s, e)) continue;
        s.members.push(e);
        if (s.hit) continue;
        const li = i * 2 + s.layer;
        if (this.cur[li] >= 0) this.prev[li] = this.cur[li];
        this.cur[li] = si;
      }
    }
    // members only keep the emitters that still run the look (latest wins), hits keep everything
    let req = 0;
    let surfReq = 0;
    for (let si = 0; si < this.slotCount; si++) {
      const s = this.slots[si];
      if (!s.hit) {
        let w = 0;
        for (let k = 0; k < s.members.length; k++) {
          const e = s.members[k];
          const li = e.index * 2 + s.layer;
          const live = this.cur[li] === si || (this.prev[li] === si && this.fadeWeightPrev(li, t) > 0);
          if (live) s.members[w++] = e;
        }
        s.members.length = w;
      }
      s.surfWant = 0;
      if (!s.hit && s.preset === 'sheet') s.surfWant = Math.min(s.members.length, 2);
      else if (!s.hit && s.preset === 'tunnel') s.surfWant = Math.min(s.members.length, 3);
      surfReq += s.surfWant;
      req += s.members.length * this.beamsPerEmitter(s);
    }
    this.requested = req;
    // design-bible budget, cut further for very large drawing buffers (fill rate)
    const budget = this.gfx.updateBudget(this.v2.x * this.v2.y);
    this.budgetScale = req > budget ? budget / req : 1;
    this.beamWidth = 1 + 0.8 * (1 - Math.sqrt(this.budgetScale));
    // one surface stays reserved for the low-fog sea while sheets skim a low fog
    const surfCap = Math.max(1, this.gfx.surfCap - (this.lowHaze > 0.05 && surfReq > 0 ? 1 : 0));
    const surfScale = surfReq > surfCap ? surfCap / surfReq : 1;
    for (let si = 0; si < this.slotCount; si++) {
      const s = this.slots[si];
      const n = this.beamsPerEmitter(s);
      s.nEff = n <= 0 ? 0 : Math.max(1, Math.floor(n * this.budgetScale));
      s.surfGrant = s.surfWant > 0 ? Math.max(1, Math.floor(s.surfWant * surfScale)) : 0;
    }

    // ------------------------------------------------------------------ generate
    this.gfx.begin();
    if (this.offGate > 0.001) {
      // pass 1 records every beam direction one shutter interval earlier (same beams, same order),
      // pass 2 emits the beams at t with that direction as motion smear. Pure function of show time.
      this.ensureSmearCapacity();
      this.recording = true;
      this.recIdx = 0;
      for (let si = 0; si < this.slotCount; si++) {
        const s = this.slots[si];
        s.bars = s.barsNow - SHUTTER / s.barLen;
        if (s.hit) this.genHit(s, t - SHUTTER);
        else this.genLook(s, si, t);
      }
      this.recCount = this.recIdx;
      this.recording = false;
      this.recIdx = 0;
      for (let si = 0; si < this.slotCount; si++) {
        const s = this.slots[si];
        s.bars = s.barsNow;
        if (s.hit) this.genHit(s, t);
        else this.genLook(s, si, t);
      }
      this.pushSea();
    }
    this.pushFlares();
    this.gfx.end();

    // ------------------------------------------------------------------ light environment
    if (this.envPow > 0) {
      const env = app.env;
      // lasers light the haze, hardly the people or the ground: a small contribution to the ambient
      // show light (a sheet skimming the field must not tint the whole scene — f017 / f147)
      const inv = 1 / this.envPow;
      const w0 = Math.max(0.12, env.stageIntensity);
      const w1 = Math.min(0.1, this.envPow * 0.0012);
      const tw = w0 + w1;
      env.stageColor.setRGB(
        (env.stageColor.r * w0 + this.envR * inv * w1) / tw,
        (env.stageColor.g * w0 + this.envG * inv * w1) / tw,
        (env.stageColor.b * w0 + this.envB * inv * w1) / tw,
      );
      env.stageIntensity += w1;
      env.audienceWash = Math.min(1, env.audienceWash + Math.min(0.1, this.audienceWash * 0.004));
    }

    const st = this.stat;
    st.beams = this.gfx.beamCount;
    st.requested = this.requested;
    st.surfaces = this.gfx.surfCount;
    st.sprites = this.gfx.spriteCount;
    let active = 0;
    for (let i = 0; i < nE; i++) if (this.cur[i * 2] >= 0 || this.cur[i * 2 + 1] >= 0) active++;
    st.active = active;
    let sig = this.slotCount;
    for (let si = 0; si < this.slotCount; si++) sig = sig * 31 + (this.slots[si].cue?.id ?? 0) + 1;
    if (sig !== this.looksSig) {
      this.looksSig = sig;
      let names = '';
      for (let si = 0; si < this.slotCount; si++) names += (names ? ',' : '') + (this.slots[si].hit ? 'hit' : this.slots[si].preset);
      st.looks = names || '-';
    }
  }

  /**
   * Is there an audience on the field? ("Tribe" mode, design-bible §2 — the default) versus the empty
   * grounds "As filmed". Order: explicit audienceMode, URL ?mode=filmed|tribe, the crowd system.
   */
  private detectTribe(): boolean {
    if (this.audienceMode !== 'auto') return this.audienceMode === 'tribe';
    const app = this.app;
    const m = app.params.get('mode') ?? app.params.get('lasermode');
    if (m === 'filmed' || m === 'asfilmed' || m === 'empty') return false;
    if (m === 'tribe') return true;
    if (!app.isSystemEnabled('crowd')) return false;
    if (this.crowdSys === undefined) this.crowdSys = (app.get('crowd') as unknown as { mode?: unknown; count?: unknown } | undefined) ?? null;
    const crowd = this.crowdSys;
    if (!crowd) return false;
    if (crowd.mode === 'filmed' || crowd.mode === 'empty' || crowd.mode === 'asfilmed') return false;
    if (typeof crowd.count === 'number' && crowd.count <= 0) return false;
    return app.quality.crowdCount > 0;
  }

  /** force the audience mode ('auto' follows the crowd system) */
  setAudienceMode(mode: 'auto' | 'tribe' | 'filmed'): void {
    this.audienceMode = mode;
  }

  private updateUniforms(ctx: FrameContext): void {
    const app = this.app;
    const u = this.gfx.shared;
    const cam = ctx.camera;
    app.renderer.getDrawingBufferSize(this.v2);
    u.uPixAng.value = (2 * Math.tan((cam.fov * DEG) / 2)) / Math.max(1, this.v2.y / Math.max(0.001, cam.zoom));
    const haze = app.env.haze;
    u.uHaze.value = 0.22 + 0.9 * haze;
    // extinction of the beam power in the haze (visibility of a few hundred metres in show haze)
    u.uExt.value = 0.0012 + 0.0045 * haze;
    // low fog layer: from fog.lowfog cues (ground haze over the field carries the laser sheets)
    let low = 0;
    const fogs = app.show.active('fog', ctx.showTime, this.act);
    for (const c of fogs) {
      if (c.fx !== 'lowfog') continue;
      const d = typeof c.p.density === 'number' ? c.p.density : 0.6;
      const a = clamp01((ctx.showTime - c.t) / 3) * clamp01((c.t + c.dur - ctx.showTime) / 3);
      low = Math.max(low, d * a);
    }
    this.lowHaze = low;
    u.uLowHaze.value = low * 0.9;
    const tt = ctx.time;
    (u.uDrift.value as THREE.Vector3).set(tt * 0.0042, -tt * 0.0011, tt * 0.0017);
    // show-driven animation (scan lines, dashes, flicker) follows show time; the air itself drifts in real time
    u.uTime.value = ctx.showTime;
    u.uFlow.value = tt % 2000;
    const fog = app.scene.fog as (THREE.Fog | THREE.FogExp2 | null);
    if (fog && (fog as THREE.FogExp2).isFogExp2) {
      u.uFogMode.value = 1;
      // beams are self-luminous: attenuate a little less than the scene's surfaces
      u.uFogD.value = (fog as THREE.FogExp2).density * 0.8;
    } else if (fog && (fog as THREE.Fog).isFog) {
      u.uFogMode.value = 2;
      u.uFogNear.value = (fog as THREE.Fog).near;
      u.uFogFar.value = (fog as THREE.Fog).far * 1.25;
    } else u.uFogMode.value = 0;
    this.gfx.beamUniforms.uGain.value = 9;
    this.gfx.beamUniforms.uHalo.value = 0.8 + haze * 0.8;
    this.gfx.surfUniforms.uGainS.value = 2.2;
  }

  // ------------------------------------------------------------------------------------ cue parsing
  private resolveSlot(s: LookSlot, c: Cue, t: number): boolean {
    const p = c.p;
    s.cue = c;
    s.hit = c.fx === 'hit';
    s.layer = c.fx === 'look' && p.preset === 'sheet' ? 1 : 0;
    s.hasAim = false;
    const palette = this.app.palette;
    if (s.hit) {
      s.preset = 'fan';
      s.starHit = p.pattern === 'star';
      resolveColor(p.color, palette, this.tmpColor, 'accent');
      laserize(this.tmpColor, s.color);
      s.hasColor2 = false;
      s.count = Math.round(num(p.count, 14, 1, 64));
      s.spread = num(p.spread, s.starHit ? 120 : 140, 0, 340) * DEG;
      s.tilt = num(p.tilt, 12, -45, 90) * DEG;
      s.tiltGiven = true;
      s.speed = 0;
      s.intensity = num(p.intensity, 1, 0, 1);
      s.kick = false;
      s.fade = 0;
      const hitDur = Math.min(c.dur, 2);
      const rel = t - c.t;
      if (rel > hitDur + 0.4) return false;
      const hold = Math.max(0, hitDur - 0.32);
      s.env = rel < hold ? 1 : Math.exp(-(rel - hold) * 9);
      if (s.env < 0.01) return false;
    } else {
      // no preset -> fan; an unknown preset is ignored (contract: unknown values never break the show)
      if (p.preset !== undefined && !(typeof p.preset === 'string' && Object.prototype.hasOwnProperty.call(PRESETS, p.preset))) return false;
      const pr = (p.preset as Preset | undefined) ?? 'fan';
      const def = PRESETS[pr];
      s.preset = pr;
      resolveColor(p.color, palette, this.tmpColor, 'primary');
      laserize(this.tmpColor, s.color);
      s.hasColor2 = typeof p.color2 === 'string' && p.color2.length > 0;
      if (s.hasColor2) {
        resolveColor(p.color2, palette, this.tmpColor2, 'secondary');
        laserize(this.tmpColor2, s.color2);
      }
      s.count = Math.round(num(p.count, def.count, 1, 64));
      s.spread = num(p.spread, def.spread, 0, 340) * DEG;
      s.tiltGiven = typeof p.tilt === 'number' && Number.isFinite(p.tilt);
      s.tilt = num(p.tilt, def.tilt, -45, 90) * DEG;
      s.speed = num(p.speed, def.speed, -8, 8);
      s.height = num(p.height, 4, 0.6, 40);
      s.heightGiven = typeof p.height === 'number' && Number.isFinite(p.height);
      s.intensity = num(p.intensity, 1, 0, 1);
      s.kick = p.kick === true;
      s.fade = num(p.fade, 0, 0, 8);
      const aim = p.aim;
      s.hasAim = Array.isArray(aim) && aim.length === 3 && Number.isFinite(aim[0]) && Number.isFinite(aim[1]) && Number.isFinite(aim[2]);
      if (s.hasAim) s.aim.set(aim[0], aim[1], aim[2]);
      const a = t - c.t;
      const b = c.t + c.dur - t;
      s.env = clamp01(a / 0.03) * clamp01(b / 0.05);
      if (s.env <= 0) return false;
    }
    // origin + target tokens
    const o = p.origin;
    s.origin = o === 'field' ? 2 : o === 'all' ? 3 : 1;
    s.groupMask = 0;
    s.groupSide = 0;
    s.hasGroupToken = false;
    s.filter = 0;
    for (const tk of c.targets) {
      if (tk === 'left') s.filter = -1;
      else if (tk === 'right') s.filter = 1;
      else if (tk === 'center') s.filter = 2;
      else {
        const m = typeof tk === 'string' && Object.prototype.hasOwnProperty.call(TOKENS, tk) ? TOKENS[tk] : undefined;
        if (m) {
          s.groupMask |= m[0];
          if (m[1] !== 0) s.groupSide = m[1];
          s.hasGroupToken = true;
        }
      }
    }
    if (s.hit && !s.hasGroupToken) {
      s.groupMask = (s.origin & 1 ? STAGE_MASK : 0) | (s.origin & 2 ? G.pillar | G.turret : 0);
      s.hasGroupToken = true;
    }
    // musical clock of this cue: bars since its start, phase-locked to the bar grid
    const tempo = this.app.show.tempo;
    const seg = tempo.segmentAt(c.t);
    const barLen = (60 / seg.bpm) * (seg.beatsPerBar ?? 4);
    const ph0 = (c.t - seg.anchor) / barLen;
    s.phase0 = ph0 - Math.floor(ph0);
    s.barLen = barLen;
    s.barsNow = (t - c.t) / barLen + s.phase0;
    s.bars = s.barsNow;
    return true;
  }

  private selects(s: LookSlot, e: Emitter): boolean {
    if (s.filter === -1 && e.pos.x > -0.5) return false;
    if (s.filter === 1 && e.pos.x < 0.5) return false;
    if (s.filter === 2 && Math.abs(e.pos.x) > 12) return false;
    const bit = G[e.group];
    if (s.hasGroupToken) {
      if (!(s.groupMask & bit)) return false;
      if (s.groupSide !== 0 && Math.sign(e.pos.x) !== s.groupSide) return false;
      return true;
    }
    const def = PRESETS[s.preset];
    const tr = this.tribe;
    const stageMask = tr && def.tribeStage !== undefined ? def.tribeStage : def.stage;
    const fieldMask = tr && def.tribeField !== undefined ? def.tribeField : def.field;
    const mask = (s.origin & 1 ? stageMask : 0) | (s.origin & 2 ? fieldMask : 0);
    if (!(mask & bit)) return false;
    const pick = tr && def.tribePick ? def.tribePick : def.pick;
    return pick ? pick(e) : true;
  }

  /** beams one projector asks for (a sheet only draws its two bright scan edges; the surface is the sheet) */
  private beamsPerEmitter(s: LookSlot): number {
    return !s.hit && s.preset === 'sheet' ? 2 : s.count;
  }

  /** weight of the look being replaced on layer slot `li` (= emitter * 2 + layer) */
  private fadeWeightPrev(li: number, t: number): number {
    const ci = this.cur[li];
    if (ci < 0) return 0;
    const s = this.slots[ci];
    if (s.fade <= 0 || !s.cue) return 0;
    return 1 - clamp01((t - s.cue.t) / s.fade);
  }

  // --------------------------------------------------------------------------------- generators
  private genLook(s: LookSlot, si: number, t: number): void {
    const mem = s.members;
    if (!mem.length) return;
    const baseI = s.intensity * s.env * this.offGate * (s.kick ? this.beatGate : 1);
    if (baseI <= 0.001) return;
    // surfaces for sheets / tunnels: evenly spaced, symmetric subset of the members
    const grant = s.surfGrant;
    const m = mem.length;
    for (let k = 0; k < m; k++) {
      const e = mem[k];
      const li = e.index * 2 + s.layer;
      let w = 1;
      if (this.cur[li] === si) {
        const fw = this.fadeWeightPrev(li, t);
        w = fw > 0 ? 1 - fw : 1;
      } else w = this.fadeWeightPrev(li, t);
      if (w <= 0.001) continue;
      const I = baseI * w * e.power;
      let surf = false;
      for (let j = 0; j < grant && !surf; j++) surf = k === Math.round(((j + 0.5) / grant) * (m - 1));
      switch (s.preset) {
        case 'fan':
          this.genFan(s, e, I);
          break;
        case 'sweep':
          this.genSweep(s, e, I);
          break;
        case 'wave':
          this.genWave(s, e, I);
          break;
        case 'sky':
          this.genSky(s, e, I);
          break;
        case 'crossfire':
          this.genCrossfire(s, e, I);
          break;
        case 'cone':
          this.genCone(s, e, I, false, false);
          break;
        case 'tunnel':
          this.genCone(s, e, I, true, surf);
          break;
        case 'grid':
          this.genGrid(s, e, I);
          break;
        case 'burst':
          this.genBurst(s, e, I);
          break;
        case 'chevron':
          this.genChevron(s, e, I);
          break;
        case 'sheet':
          if (surf) this.genSheet(s, e, I);
          else this.glow(e, s.color, I * 0.2);
          break;
      }
    }
  }

  /** per-beam power: a projector splits its output over the beams it draws */
  private perBeam(n: number): number {
    return 1.7 / Math.sqrt(Math.max(1, n));
  }

  private lerpColor(s: LookSlot, u: number): THREE.Color {
    if (!s.hasColor2) return s.color;
    return this.tmpColor.copy(s.color).lerp(s.color2, u);
  }

  private genFan(s: LookSlot, e: Emitter, I: number): void {
    const n = s.nEff;
    const ph = TAU * s.speed * s.bars;
    const aimed = this.aimYP(s, e);
    const swing = (aimed ? 0.05 : 0.2) * s.spread * Math.sin(ph) * e.side + (aimed ? this.aimYaw : 0);
    const spreadT = s.spread * (0.72 + 0.28 * (0.5 + 0.5 * Math.cos(ph * 0.5)));
    const tiltBase = aimed
      ? this.aimPitch
      : s.tilt + (e.group === 'high' && !s.tiltGiven ? 4 * DEG : 0) + (e.origin === 'field' && !s.tiltGiven ? -4 * DEG : 0);
    const pitch = tiltBase + (aimed ? 0.012 : 0.06) * Math.sin(ph * 0.5 + e.rank * Math.PI);
    const pb = I * this.perBeam(n);
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0.5;
      this.dirYP(e, swing + (u - 0.5) * spreadT, pitch);
      this.beam(e, this.lerpColor(s, u), pb, 0);
    }
  }

  private genSweep(s: LookSlot, e: Emitter, I: number): void {
    const n = s.nEff;
    const ph = TAU * s.speed * s.bars - e.rank * Math.PI * 0.85;
    const aimed = this.aimYP(s, e);
    const yaw = 0.5 * s.spread * Math.sin(ph) + (aimed ? this.aimYaw : 0);
    const pitch = (aimed ? this.aimPitch : s.tilt) + 0.035 * Math.sin(ph * 2);
    const pb = I * this.perBeam(n);
    for (let i = 0; i < n; i++) {
      this.dirYP(e, yaw + (i - (n - 1) / 2) * 0.05, pitch);
      this.beam(e, this.lerpColor(s, n > 1 ? i / (n - 1) : 0), pb, 0);
    }
  }

  private genWave(s: LookSlot, e: Emitter, I: number): void {
    const n = s.nEff;
    const A = 0.12;
    const pb = I * this.perBeam(n);
    const ph = TAU * s.speed * s.bars;
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0.5;
      const yaw = (u - 0.5) * s.spread;
      const pitch = s.tilt + A * Math.sin(TAU * 1.25 * u - ph + e.rank * Math.PI);
      this.dirYP(e, yaw, pitch);
      this.beam(e, this.lerpColor(s, u), pb, 0);
    }
  }

  private genSky(s: LookSlot, e: Emitter, I: number): void {
    const n = s.nEff;
    const ph = TAU * s.speed * s.bars;
    const lean = Math.max(0, Math.PI / 2 - s.tilt) + 0.07 * Math.sin(ph + e.rank * TAU);
    const tl = Math.tan(lean);
    const sway = e.side * 0.07 * Math.sin(ph * 0.5);
    const pb = I * this.perBeam(n);
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0.5;
      const a = (u - 0.5) * s.spread + sway;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // vertical fan in the (up, lat) plane, leaned towards the audience
      this.setDir(sa * e.lat.x + tl * e.fwd.x, ca, sa * e.lat.z + tl * e.fwd.z);
      this.beam(e, this.lerpColor(s, u), pb, 0);
    }
  }

  private genCrossfire(s: LookSlot, e: Emitter, I: number): void {
    const n = s.nEff;
    const ph = TAU * s.speed * s.bars;
    const pb = I * this.perBeam(n);
    const col = s.hasColor2 && e.side > 0 ? s.color2 : s.color;
    if (e.group === 'piano') {
      this.genBounce(s, e, I);
      return;
    }
    if (e.group === 'pillar') {
      // pillar-to-pillar: to the opposite capital one row closer, front row -> the piano riser
      const tgt = e.partner >= 0 ? this.rig.emitters[e.partner].pos : null;
      const tx = tgt ? tgt.x : 0;
      const ty = tgt ? tgt.y : 2.0;
      const tz = tgt ? tgt.z : 59;
      for (let i = 0; i < n; i++) {
        let x = tx;
        let y = ty;
        let z = tz;
        if (i > 0) {
          // extra beams: straight across the aisle, then to rows further back / forward
          x = -e.pos.x;
          z = e.pos.z + (i === 1 ? 0 : (i - 1) * 33 * (i % 2 ? 1 : -1));
          y = e.pos.y;
        }
        const len = this.setDir(x - e.pos.x, y - e.pos.y, z - e.pos.z);
        this.beam(e, col, pb, 0, len, true);
      }
      return;
    }
    // stage: X figures — each side aims up and across to the other side, slow scissor motion
    const side = e.side;
    const X = 46 + 24 * Math.sin(ph);
    const dist = 70 + 18 * Math.cos(ph * 0.5);
    const rise = Math.tan(s.tilt) * dist + 10 * Math.sin(ph * 0.5 + 1);
    const tx = -side * X;
    const ty = e.pos.y + rise;
    const tz = e.origin === 'stage' ? dist : e.pos.z - dist;
    this.setDir(tx - e.pos.x, ty - e.pos.y, tz - e.pos.z);
    const yaw0 = Math.atan2(this.dx * e.lat.x + this.dz * e.lat.z, this.dx * e.fwd.x + this.dz * e.fwd.z);
    const pitch0 = Math.asin(Math.max(-1, Math.min(1, this.dy)));
    for (let i = 0; i < n; i++) {
      const off = n > 1 ? (i / (n - 1) - 0.5) * s.spread : 0;
      this.dirYP(e, yaw0 + off, pitch0 + off * 0.35);
      this.beam(e, col, pb, 0);
    }
  }

  /**
   * Domitor Draconis mirror bounce (show-analysis 6.1): one white laser from the light tube on the piano,
   * reflected by the crystal lanterns. `segments` (default 4 = the symmetric V of f093) lights the path
   * segment by segment — author one cue per piano hit with segments 1, 2, 3, 4 to build it up.
   */
  private genBounce(s: LookSlot, e: Emitter, I: number): void {
    const segs = Math.round(num(s.cue?.p.segments, 4, 1, BOUNCE.length));
    const col = s.color;
    for (let k = 0; k < segs; k++) {
      const [fr, fs, tr, ts] = BOUNCE[k];
      const a = fr < 0 ? e.pos : this.rig.mirror(fr, fs);
      const b = this.rig.mirror(tr, ts);
      if (!a || !b) continue;
      const depth = fr < 0 ? 0 : fr + 1;
      const pw = I * 1.5 * Math.pow(0.86, depth);
      const len = this.setDir(b.x - a.x, b.y - a.y, b.z - a.z);
      this.beamFrom(e, a.x, a.y, a.z, col, pw, len);
      // the crystal lights up where the beam lands (mirror glint)
      if (!this.recording) this.gfx.pushSprite(b.x, b.y, b.z, 0.5, col.r * pw * 9, col.g * pw * 9, col.b * pw * 9, 0);
    }
  }

  /** cone (sunburst aimed at the audience) or tunnel (rotating cone shell down the aisle) */
  private genCone(s: LookSlot, e: Emitter, I: number, tunnel: boolean, surf: boolean): void {
    const n = s.nEff;
    const ph = TAU * s.speed * s.bars;
    const kickBreath = this.hasKick ? 0.12 * this.kickEnv : 0;
    const h = 0.5 * s.spread * (tunnel ? 1 + 0.1 * Math.sin(ph * 0.5) : 0.88 + kickBreath);
    /** vertical / horizontal aperture of the cone (1 = round) */
    let squash = 1;
    if (tunnel) {
      // aim down the aisle (stage) or at the stage (field)
      let tx: number;
      let ty: number;
      let tz: number;
      if (e.origin === 'stage') {
        tx = e.pos.x * 0.3;
        tz = 96;
        ty = 1.2 + Math.tan(s.tilt) * 96;
        if (!this.tribe && s.heightGiven) {
          // skimming tunnel over the empty field (In The Cold 1357.9 f138, the violet tunnel 1461.6): a
          // flattened cone of near-horizontal beams between ~0.5 and ~4 m — a corridor between the
          // lantern pillars that the low fog carries — instead of a round cone raking the floor
          ty = Math.min(Math.max(s.height, 0.8), 4);
          const rV = Math.min(2.2, Math.max(0.8, ty * 0.8));
          squash = rV / 96 / Math.max(0.02, Math.tan(h));
        }
      } else {
        tx = e.pos.x * 0.2;
        tz = -2;
        ty = 6 + Math.tan(s.tilt) * 60;
      }
      // Tribe mode: the lower edge of the cone stays >= 4.5 m above the heads over the audience
      if (this.tribe && e.origin === 'stage') ty = Math.max(ty, TRIBE_MIN_H + Math.tan(0.5 * s.spread) * 96);
      this.setDir(tx - e.pos.x, ty - e.pos.y, tz - e.pos.z);
    } else {
      if (this.aimYP(s, e)) this.dirYP(e, this.aimYaw, this.aimPitch);
      else this.dirYP(e, e.side * 0.1, s.tilt);
    }
    this.basis(this.dx, this.dy, this.dz);
    const b = this.bx;
    const rot = ph * (tunnel ? 1 : e.side);
    const th = Math.tan(h);
    const pb = I * this.perBeam(n);
    for (let i = 0; i < n; i++) {
      const phi = rot + (TAU * i) / n;
      const cp = Math.cos(phi) * th;
      const sp = Math.sin(phi) * th * squash;
      this.setDir(b[0] + cp * b[3] + sp * b[6], b[1] + cp * b[4] + sp * b[7], b[2] + cp * b[5] + sp * b[8]);
      if (tunnel && this.tribe) this.tribeLift(e.pos.x, e.pos.y, e.pos.z);
      this.beam(e, s.hasColor2 && i % 2 ? s.color2 : s.color, pb * (tunnel ? (squash < 1 ? 0.55 : 0.3) : 1), tunnel ? 0.3 : 0.55);
    }
    if (tunnel && surf) {
      const c = s.color;
      const P = I * (squash < 1 ? 0.8 : 1.2);
      if (!this.recording) this.gfx.pushSurface(
        e.pos.x, e.pos.y, e.pos.z, 170,
        b[0], b[1], b[2], h,
        b[6], b[7], b[8], SURF_CONE,
        c.r * P, c.g * P, c.b * P, 0.04,
        ph * 0.5, 0, 0.85, ph * 0.5 + rand01(e.index * 31 + (s.cue?.id ?? 0)),
        0, squash,
      );
      if (!this.recording) this.envAdd(c, P);
    }
    // a skimming tunnel runs through the low fog: its lower beams light the fog tops (golden corridor, f138)
    if (tunnel && squash < 1 && !this.recording && this.lowHaze > 0.05) {
      const w = I * 0.7;
      const c2 = s.hasColor2 ? s.color2 : s.color;
      this.seaR += s.color.r * w;
      this.seaG += s.color.g * w;
      this.seaB += s.color.b * w;
      this.sea2R += c2.r * w;
      this.sea2G += c2.g * w;
      this.sea2B += c2.b * w;
    }
  }

  private genGrid(s: LookSlot, e: Emitter, I: number): void {
    const n = s.nEff;
    const ph = TAU * s.speed * s.bars;
    const pb = I * this.perBeam(n);
    if (e.group === 'base' || e.group === 'pillar' || e.group === 'turret' || (e.group === 'deck' && s.heightGiven && !this.tribe)) {
      // the web over the field: flat fans across the aisle at `height` (show-analysis 2.2: plinth corners
      // + deck front)
      const h = this.tribe ? Math.max(s.height, TRIBE_MIN_H) : Math.min(s.height, 6);
      const pitch = Math.atan2(h - e.pos.y, 40);
      const sway = 0.08 * Math.sin(ph + (e.row + 1) * 1.3);
      for (let i = 0; i < n; i++) {
        const u = n > 1 ? i / (n - 1) : 0.5;
        this.dirYP(e, (u - 0.5) * s.spread + sway, pitch);
        // over a crowd the web keeps its clearance above the heads — also where it reaches the banks
        if (this.tribe) this.tribeLift(e.pos.x, e.pos.y, e.pos.z);
        this.beam(e, this.lerpColor(s, u), pb, 0, 170);
      }
      return;
    }
    // vertical fans leaning alternately left / right → diamond / X lattices above the stage
    const parity = Math.round(e.rank * 20) % 2 === 0 ? 1 : -1;
    const lean = parity * (0.42 + 0.12 * Math.sin(ph));
    const cl = Math.cos(lean);
    const sl = Math.sin(lean);
    const hx = cl * e.fwd.x + sl * e.lat.x;
    const hz = cl * e.fwd.z + sl * e.lat.z;
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0.5;
      const el = s.tilt + (u - 0.5) * s.spread;
      const ce = Math.cos(el);
      this.setDir(ce * hx, Math.sin(el), ce * hz);
      this.beam(e, this.lerpColor(s, u), pb, 0);
    }
  }

  private genBurst(s: LookSlot, e: Emitter, I: number): void {
    const n = s.nEff;
    const ph = TAU * s.speed * s.bars;
    const inward = e.group === 'corner' ? -e.side * 0.3 : 0;
    if (this.aimYP(s, e)) this.dirYP(e, this.aimYaw, this.aimPitch);
    else this.dirYP(e, inward, s.tilt);
    this.basis(this.dx, this.dy, this.dz);
    const b = this.bx;
    const capCos = Math.cos(Math.min(Math.PI * 0.98, s.spread * 0.5));
    const rot = ph * 0.5;
    const pb = I * this.perBeam(n) * 1.2 * (this.hasKick ? 0.55 + 0.45 * this.kickEnv : 1);
    for (let i = 0; i < n; i++) {
      const zc = 1 - ((i + 0.5) / n) * (1 - capCos);
      const rho = Math.sqrt(Math.max(0, 1 - zc * zc));
      const phi = i * 2.3999632 + rot;
      const cp = Math.cos(phi) * rho;
      const sp = Math.sin(phi) * rho;
      this.setDir(zc * b[0] + cp * b[3] + sp * b[6], zc * b[1] + cp * b[4] + sp * b[7], zc * b[2] + cp * b[5] + sp * b[8]);
      this.beam(e, s.hasColor2 && i % 3 === 0 ? s.color2 : s.color, pb, 0.2);
    }
  }

  /**
   * Gold chevron (In The Cold, show-analysis 8.1, f135/f136): 5 + 5 deck units each fire a narrow fan of
   * thin beams down-forward at a shallow angle. Every fan lands in a small zone on the aisle axis 0–20 m
   * past `distance` (70), beyond the row-2 lanterns, so seen from above the two groups draw a long hatched
   * V whose arms start at the deck ends and meet at the apex. The fan width is set in metres at the apex
   * (not as an angle), narrower for the inner units: no beam crosses the axis before ~Z 60, which would
   * shrink the V into a blob next to the deck. Over a crowd the fans converge in the air above the heads.
   */
  private genChevron(s: LookSlot, e: Emitter, I: number): void {
    const n = s.nEff;
    const ph = TAU * s.speed * s.bars;
    const zc = num(s.cue?.p.distance, 70, 20, 200);
    const tr = this.tribe;
    const ax = s.hasAim ? s.aim.x : 0;
    const az = s.hasAim ? s.aim.z : zc + 8;
    const yc = s.hasAim ? s.aim.y : tr ? TRIBE_MIN_H + 1.5 : 0;
    // horizontal frame unit -> apex
    let hx = ax - e.pos.x;
    let hz = az - e.pos.z;
    const hd = Math.hypot(hx, hz) || 1;
    hx /= hd;
    hz /= hd;
    const lx = hz;
    const lz = -hx;
    const outer = Math.min(1, Math.abs(e.pos.x) / 33);
    const spreadDeg = s.spread / DEG;
    // slow scanning spread (1344 s "scanning spread"), phase-shifted across the units
    const scanK = 0.78 + 0.22 * Math.sin(ph + e.rank * 1.3);
    /** lateral half-width of the fan at the apex (m) and depth of the landing zone along the fan (m) */
    const w = (1 + 0.16 * spreadDeg) * (0.35 + 0.65 * outer) * scanK;
    const depth = 8 + 0.3 * spreadDeg;
    // thin lines with dark gaps: ~120 beams converge on a few square metres, keep each one modest
    const pb = I * this.perBeam(n) * 0.8;
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0.5;
      const lat = (u - 0.5) * 2 * w;
      // deterministic depth offsets (golden-ratio sequence): the landing points fill a narrow diamond, so
      // the core of the V reads as a streak along the aisle rather than one hot spot
      const v = ((i * 0.618034 + e.order * 0.371) % 1) - 0.5;
      const along = v * depth * (1 - Math.abs(u - 0.5));
      this.setDir(ax + lx * lat + hx * along - e.pos.x, yc - e.pos.y, az + lz * lat + hz * along - e.pos.z);
      if (tr) this.tribeLift(e.pos.x, e.pos.y, e.pos.z);
      this.beam(e, this.lerpColor(s, u), pb, 0);
    }
  }

  /** "liquid sky": a scanned plane at `height` with gentle waves, plus its bright edge beams */
  private genSheet(s: LookSlot, e: Emitter, I: number): void {
    const ph = TAU * s.speed * s.bars;
    const stage = e.origin === 'stage';
    const tr = this.tribe;
    const h = tr ? Math.max(s.height, TRIBE_MIN_H) : s.height;
    // the plane contains the aperture: a projector well above the requested height tilts it so that it
    // reaches that height only far out over the field (a gently sloping ceiling), instead of diving
    // through the requested height after 50–60 m and cutting into the ground in front of the camera
    const reach = e.pos.y - h > 1.5 ? (stage ? 150 : 110) : stage ? 62 : 48;
    let pitch = s.tiltGiven ? s.tilt : Math.atan2(h - e.pos.y, reach);
    const yaw = e.group === 'deck' ? e.side * 0.1 * (0.3 + Math.abs(e.pos.x) / 50) : 0;
    const half = Math.min(Math.PI * 0.49, s.spread * 0.5);
    const range = stage ? 250 : 150;
    // Tribe mode: the whole fan footprint (field, banks, crest) stays >= 4.5 m above the local head plane
    if (tr) pitch = Math.max(pitch, this.sheetClearancePitch(e, yaw, half, range));
    this.dirYP(e, yaw, pitch);
    const fx = this.dx;
    const fy = this.dy;
    const fz = this.dz;
    // plane normal: perpendicular to the pitched forward and the horizontal lateral axis
    const cl = Math.cos(yaw);
    const sl = Math.sin(yaw);
    // lateral of the yawed frame
    const lx = cl * e.lat.x - sl * e.fwd.x;
    const lz = cl * e.lat.z - sl * e.fwd.z;
    // N = F x L  (points up for a forward-facing, level sheet)
    let nx = fy * lz - fz * 0;
    let ny = fz * lx - fx * lz;
    let nz = fx * 0 - fy * lx;
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const amp = 0.011 + 0.004 * Math.sin(ph * 0.25);
    const seed = rand01(hash32(e.index * 977 + (s.cue?.id ?? 0)));
    const ph1 = ph + seed * TAU;
    const ph2 = ph * 0.73 + seed * 3.1;
    const P = I * 1.0 / Math.max(0.4, 2 * half);
    const c = s.color;
    if (!this.recording) this.gfx.pushSurface(e.pos.x, e.pos.y, e.pos.z, range, fx, fy, fz, half, nx, ny, nz, SURF_SHEET, c.r * P, c.g * P, c.b * P, amp, ph1, ph2, 0, seed * TAU);
    // a sheet skimming a low fog lights the fog tops ("laser sea"): collected here, drawn once (pushSea)
    if (!this.recording && !tr && this.lowHaze > 0.05) {
      const hField = e.pos.y + Math.tan(pitch) * 40;
      const wSea = I * Math.exp(-Math.max(0, hField - FOG_TOP) / 1.3);
      // the fog picks up both scan colours (Embers: deep blue sheet in the troughs, the ice-blue second
      // colour on the crests)
      const c2 = s.hasColor2 ? s.color2 : c;
      this.seaR += c.r * wSea;
      this.seaG += c.g * wSea;
      this.seaB += c.b * wSea;
      this.sea2R += c2.r * wSea;
      this.sea2G += c2.g * wSea;
      this.sea2B += c2.b * wSea;
    }
    // edge beams: identical ray formula as the surface shader (u = 0, 1)
    const rx = ny * fz - nz * fy;
    const ry = nz * fx - nx * fz;
    const rz = nx * fy - ny * fx;
    for (let k = 0; k < 2; k++) {
      const a = (k === 0 ? -1 : 1) * half;
      const alpha = amp * (0.62 * Math.sin(5.0 * a + ph1) + 0.38 * Math.sin(8.7 * a - ph2 + 1.3));
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const cA = Math.cos(alpha);
      const sA = Math.sin(alpha);
      this.setDir((ca * fx + sa * rx) * cA + nx * sA, (ca * fy + sa * ry) * cA + ny * sA, (ca * fz + sa * rz) * cA + nz * sA);
      this.beam(e, c, I * 0.15, 0, range * 0.9);
    }
    if (!this.recording) {
      this.envAdd(c, I * 1.2);
      this.audienceWash += I * 3;
    }
  }

  /**
   * The low-fog layer lit by the skimming sheets (Embers "liquid sky", f115/f116): one horizontal fan
   * surface at the fog top over the paved field, in the power-weighted colour of the sheets. Visible
   * from eye level as a glowing, rolling sea under the sheet, and from the drones as the lit field.
   */
  private pushSea(): void {
    const w = this.seaR + this.seaG + this.seaB;
    // only a dense low fog forms a readable sea (Embers 0.9); a thin drift (0.2–0.4) stays dark
    const x = Math.min(1, Math.max(0, (this.lowHaze - 0.3) / 0.4));
    const gate = x * x * (3 - 2 * x);
    if (this.tribe || gate < 0.01 || w < 0.01) return;
    const k = 2.0 * gate;
    // (the fog kind carries the crest colour in the wave-phase slots)
    this.gfx.pushSurface(0, FOG_TOP, -1, 185, 0, 0, 1, 1.25, 0, 1, 0, SURF_FOG, this.seaR * k, this.seaG * k, this.seaB * k, 0, this.sea2R * k, this.sea2G * k, this.sea2B * k, 0, FOG_ZONE_X, 1, 0);
  }

  /** ground height (terrain system; flat 0 fallback) */
  private groundAt(x: number, z: number): number {
    const h = this.terrain?.heightAt;
    return h ? h.call(this.terrain, x, z) : 0;
  }

  /**
   * Tribe mode: raise the current direction (this.dx/dy/dz) just enough that the beam stays
   * >= 4.5 m above the local head plane wherever it passes over the audience area (flat field, the
   * 5.2 m side banks, the back plaza). Samples the terrain every 25 m along the beam.
   */
  private tribeLift(ox: number, oy: number, oz: number): void {
    const hl = Math.hypot(this.dx, this.dz);
    if (hl < 1e-3) return;
    const ux = this.dx / hl;
    const uz = this.dz / hl;
    let need = -Infinity;
    for (let k = 1; k <= 8; k++) {
      const d = k * 25;
      const x = ox + ux * d;
      const z = oz + uz * d;
      if (z < AUD_ZMIN || z > AUD_ZMAX || x > AUD_XMAX || x < -AUD_XMAX) continue;
      const req = (this.groundAt(x, z) + TRIBE_MIN_H - oy) / d;
      if (req > need) need = req;
    }
    if (need <= this.dy / hl) return;
    this.setDir(ux, need, uz);
  }

  /** Tribe mode: minimum pitch of a sheet plane so that its whole footprint clears the heads (+4.5 m) */
  private sheetClearancePitch(e: Emitter, yaw: number, half: number, range: number): number {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    // yawed horizontal forward / lateral of the plane
    const fx = cy * e.fwd.x + sy * e.lat.x;
    const fz = cy * e.fwd.z + sy * e.lat.z;
    const lx = cy * e.lat.x - sy * e.fwd.x;
    const lz = cy * e.lat.z - sy * e.fwd.z;
    let need = -Infinity;
    for (let a = 0; a < 5; a++) {
      const ang = (a / 4 - 0.5) * 2 * half;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      for (let k = 1; k <= 8; k++) {
        const d = (k / 8) * range;
        const x = e.pos.x + (fx * ca + lx * sa) * d;
        const z = e.pos.z + (fz * ca + lz * sa) * d;
        if (z < AUD_ZMIN || z > AUD_ZMAX || x > AUD_XMAX || x < -AUD_XMAX) continue;
        // the plane is level across its lateral axis: its height here depends on the forward distance only
        const along = d * ca;
        if (along < 1) continue;
        const req = (this.groundAt(x, z) + TRIBE_MIN_H - e.pos.y) / along;
        if (req > need) need = req;
      }
    }
    return need === -Infinity ? -Math.PI / 2 : Math.atan(need);
  }

  private genHit(s: LookSlot, t: number): void {
    const mem = s.members;
    const n = s.nEff;
    const I0 = s.intensity * s.env * this.offGate;
    if (I0 <= 0.001 || n <= 0) return;
    const seed = s.cue ? s.cue.seed : 0;
    const rot = rand01(seed) * TAU + (t - (s.cue?.t ?? 0)) * 0.6;
    for (let k = 0; k < mem.length; k++) {
      const e = mem[k];
      const I = I0 * e.power * this.perBeam(n) * 1.3;
      if (s.starHit) {
        this.dirYP(e, 0, e.origin === 'field' ? 8 * DEG : 22 * DEG);
        this.basis(this.dx, this.dy, this.dz);
        const b = this.bx;
        const capCos = Math.cos(s.spread * 0.5);
        for (let i = 0; i < n; i++) {
          const zc = 1 - ((i + 0.5) / n) * (1 - capCos);
          const rho = Math.sqrt(Math.max(0, 1 - zc * zc));
          const phi = i * 2.3999632 + rot;
          const cp = Math.cos(phi) * rho;
          const sp = Math.sin(phi) * rho;
          this.setDir(zc * b[0] + cp * b[3] + sp * b[6], zc * b[1] + cp * b[4] + sp * b[7], zc * b[2] + cp * b[5] + sp * b[8]);
          this.beam(e, s.color, I, 0);
        }
      } else {
        const pitch = s.tilt + (e.group === 'high' ? 8 * DEG : 0);
        for (let i = 0; i < n; i++) {
          const u = n > 1 ? i / (n - 1) : 0.5;
          this.dirYP(e, (u - 0.5) * s.spread, pitch);
          this.beam(e, s.color, I, 0);
        }
      }
    }
  }

  // ------------------------------------------------------------------------------------ helpers
  private ensureSmearCapacity(): void {
    // generators may emit a few more than the budget (min 1 beam per emitter): size generously
    const need = (this.gfx.beamCap + this.rig.emitters.length * 4 + 64) * 3;
    if (this.smear.length < need) this.smear = new Float32Array(need);
  }

  private aimYaw = 0;
  private aimPitch = 0;

  /** optional `aim: [x,y,z]`: yaw / pitch (emitter frame) towards a world point → aimYaw / aimPitch */
  private aimYP(s: LookSlot, e: Emitter): boolean {
    if (!s.hasAim) return false;
    const x = s.aim.x - e.pos.x;
    const y = s.aim.y - e.pos.y;
    const z = s.aim.z - e.pos.z;
    const f = x * e.fwd.x + z * e.fwd.z;
    const l = x * e.lat.x + z * e.lat.z;
    this.aimYaw = Math.atan2(l, f);
    this.aimPitch = Math.atan2(y, Math.sqrt(f * f + l * l));
    return true;
  }

  /** direction from yaw (towards +lat) and pitch (up) in the emitter frame → this.dx/dy/dz */
  private dirYP(e: Emitter, yaw: number, pitch: number): void {
    const cp = Math.cos(pitch);
    const cy = Math.cos(yaw) * cp;
    const sy = Math.sin(yaw) * cp;
    this.dx = cy * e.fwd.x + sy * e.lat.x;
    this.dy = Math.sin(pitch);
    this.dz = cy * e.fwd.z + sy * e.lat.z;
  }

  /** normalise and store a direction; returns its original length */
  private setDir(x: number, y: number, z: number): number {
    const l = Math.sqrt(x * x + y * y + z * z) || 1;
    this.dx = x / l;
    this.dy = y / l;
    this.dz = z / l;
    return l;
  }

  /** orthonormal basis around axis F: bx = [F, R, N] with N the "up-most" perpendicular */
  private basis(fx: number, fy: number, fz: number): void {
    const b = this.bx;
    b[0] = fx;
    b[1] = fy;
    b[2] = fz;
    // N = up - F (F.up)
    let nx = -fx * fy;
    let ny = 1 - fy * fy;
    let nz = -fz * fy;
    let nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (nl < 1e-4) {
      nx = 1;
      ny = 0;
      nz = 0;
      nl = 1;
    }
    nx /= nl;
    ny /= nl;
    nz /= nl;
    // R = N x F
    b[3] = ny * fz - nz * fy;
    b[4] = nz * fx - nx * fz;
    b[5] = nx * fy - ny * fx;
    b[6] = nx;
    b[7] = ny;
    b[8] = nz;
  }

  /**
   * Emit one beam from emitter e along (this.dx, dy, dz): clip on the ground / stage set, write the
   * instance, a hit spot, and accumulate the aperture flare (blinding when it points at the eye).
   */
  /** a beam segment that starts somewhere other than the projector aperture (mirror bounces) */
  private beamFrom(e: Emitter, ox: number, oy: number, oz: number, col: THREE.Color, power: number, len: number): void {
    this.oOverride = true;
    this.ox = ox;
    this.oy = oy;
    this.oz = oz;
    this.beam(e, col, power, 0, len, true);
    this.oOverride = false;
  }

  private beam(e: Emitter, col: THREE.Color, power: number, dash: number, maxLen = 650, target = false): void {
    if (power <= 0.0005) return;
    const k3 = this.recIdx++ * 3;
    if (this.recording) {
      if (k3 + 2 >= this.smear.length) return;
      this.smear[k3] = this.dx;
      this.smear[k3 + 1] = this.dy;
      this.smear[k3 + 2] = this.dz;
      return;
    }
    // previous direction (static figures and hits without motion get px = current)
    let px = 0;
    let py = 0;
    let pz = 0;
    if (k3 + 2 < this.recCount * 3 && k3 + 2 < this.smear.length) {
      px = this.smear[k3];
      py = this.smear[k3 + 1];
      pz = this.smear[k3 + 2];
    }
    const fromAperture = !this.oOverride;
    const ox = fromAperture ? e.pos.x : this.ox;
    const oy = fromAperture ? e.pos.y : this.oy;
    const oz = fromAperture ? e.pos.z : this.oz;
    const dx = this.dx;
    const dy = this.dy;
    const dz = this.dz;
    let len = maxLen;
    let hit = target;
    let floorHit = false;
    if (dy < -1e-4) {
      const tg = oy / -dy;
      if (tg < len) {
        len = tg;
        hit = true;
        floorHit = true;
      }
    }
    if (e.origin === 'field') {
      for (let i = 0; i < STAGE_BOXES.length; i++) {
        const tb = rayBox(ox, oy, oz, dx, dy, dz, STAGE_BOXES[i]);
        if (tb > 0 && tb < len) {
          len = tb;
          hit = true;
          floorHit = false;
        }
      }
    }
    const r = col.r * power;
    const g = col.g * power;
    const b = col.b * power;
    if (!this.gfx.pushBeam(ox, oy, oz, dx, dy, dz, len, r, g, b, dash, hit, this.beamWidth, px, py, pz)) return;
    if (hit) {
      // a beam grazing the floor spreads its spot over a long ellipse (1 / sin of the incidence): dim, so
      // a fan of shallow beams landing together (chevron apex) does not bloom into one hot blob
      const inc = floorHit && !target ? Math.min(1, Math.max(0.1, -dy * 5)) : 1;
      this.gfx.pushSprite(ox + dx * len, oy + dy * len, oz + dz * len, target ? 0.32 : 0.2, r * 5 * inc, g * 5 * inc, b * 5 * inc, 1);
    }
    if (!fromAperture) {
      this.envAdd(col, power);
      return;
    }
    // aperture flare
    const i4 = e.index * 4;
    const i3 = e.index * 3;
    const c = dx * this.toCam[i3] + dy * this.toCam[i3 + 1] + dz * this.toCam[i3 + 2];
    const eye = c > 0.9 ? Math.exp((c - 1) * 1400) : 0;
    // haze glow around the aperture when the beam heads roughly towards the viewer (~10°): a fan of a
    // dozen beams must read as a bright point, not bloom into a blob over the deck (f137)
    const wide = c > 0.5 ? Math.exp((c - 1) * 35) : 0;
    const f = power * (0.05 + 0.6 * wide + 60 * eye);
    this.flare[i4] += col.r * f;
    this.flare[i4 + 1] += col.g * f;
    this.flare[i4 + 2] += col.b * f;
    this.flare[i4 + 3] += power * eye;
    this.envAdd(col, power);
    if (e.origin === 'stage' && dz > 0.3 && dy < 0.25) this.audienceWash += power;
  }

  /** aperture glow for projectors that are armed but not drawing beams (e.g. sheet reserve units) */
  private glow(e: Emitter, col: THREE.Color, power: number): void {
    if (this.recording) return;
    const i4 = e.index * 4;
    this.flare[i4] += col.r * power * 0.3;
    this.flare[i4 + 1] += col.g * power * 0.3;
    this.flare[i4 + 2] += col.b * power * 0.3;
  }

  private envAdd(col: THREE.Color, power: number): void {
    this.envR += col.r * power;
    this.envG += col.g * power;
    this.envB += col.b * power;
    this.envPow += power;
  }

  private pushFlares(): void {
    const em = this.rig.emitters;
    for (let i = 0; i < em.length; i++) {
      const i4 = i * 4;
      const r = this.flare[i4];
      const g = this.flare[i4 + 1];
      const b = this.flare[i4 + 2];
      const m = r + g + b;
      if (m < 0.003) continue;
      const e = em[i];
      const eye = this.flare[i4 + 3];
      const size = 0.16 * (1 + Math.min(10, Math.sqrt(eye) * 3));
      this.gfx.pushSprite(e.pos.x + e.fwd.x * 0.05, e.pos.y, e.pos.z + e.fwd.z * 0.05, size, r * 5, g * 5, b * 5, 0);
    }
  }

  stats(): Record<string, number | string> {
    const s = this.stat;
    return {
      beams: s.beams,
      requested: s.requested,
      budget: this.gfx.beamBudget,
      budgetScale: +this.budgetScale.toFixed(2),
      surfaces: s.surfaces,
      sprites: s.sprites,
      emitters: this.rig.emitters.length,
      activeEmitters: s.active,
      looks: s.looks,
      drawCalls: this.gfx.drawCalls,
      triangles: this.gfx.triangles,
      haze: +(this.gfx.shared.uHaze.value as number).toFixed(2),
      mode: this.tribe ? 'tribe' : 'filmed',
      lowHaze: +this.lowHaze.toFixed(2),
    };
  }

  dispose(): void {
    this.app?.scene.remove(this.gfx.group);
    this.gfx.dispose();
  }
}

/** slab test; returns entry distance (> 0) or -1 when missed / origin inside */
function rayBox(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, b: readonly number[]): number {
  let t0 = -Infinity;
  let t1 = Infinity;
  for (let k = 0; k < 3; k++) {
    const o = k === 0 ? ox : k === 1 ? oy : oz;
    const d = k === 0 ? dx : k === 1 ? dy : dz;
    const lo = b[k];
    const hi = b[k + 3];
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return -1;
      continue;
    }
    let a = (lo - o) / d;
    let c = (hi - o) / d;
    if (a > c) {
      const tmp = a;
      a = c;
      c = tmp;
    }
    if (a > t0) t0 = a;
    if (c < t1) t1 = c;
  }
  if (t1 < t0 || t1 <= 0 || t0 <= 0) return -1;
  return t0;
}
