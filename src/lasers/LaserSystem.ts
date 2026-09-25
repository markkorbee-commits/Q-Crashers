import * as THREE from 'three';
import type { App } from '../core/App';
import { hash32, rand01 } from '../core/rng';
import type { FrameContext, QualitySettings, System } from '../core/types';
import { resolveColor } from '../show/colors';
import type { Cue } from '../show/ShowTypes';
import { laserize } from './laserColor';
import { LaserRenderer } from './LaserRenderer';
import { type Emitter, type EmitterGroup, LaserRig } from './LaserRig';

/**
 * LaserSystem ('lasers') — show lasers of the 2026 RED Endshow.
 *
 * Cue contract (docs/show-format.md):
 *   look  preset fan|sheet|tunnel|sweep|crossfire|sky|wave|cone|grid|burst; color, color2, count,
 *         speed (cycles/bar), spread (deg), tilt (deg), origin stage|field|all, height (sheet),
 *         intensity, kick, fade (s, optional crossfade from the look it replaces)
 *   hit   short full-rig burst: color, pattern fan|star
 *   off   all lasers off for dur
 *
 * Semantics: every projector runs the latest-started active `look` that selects it (target groups /
 * origin / left|right|center filters, or the preset's natural projector set), so a deck sheet and
 * a roof crossfire can run together. Everything is a pure function of show time (+ the tempo map):
 * pause / seek / restart give the identical picture.
 *
 * Rendering (LaserRenderer): instanced camera-facing ribbons with a physical single-scattering
 * haze model, instanced ruled surfaces for sheets and tunnels, instanced aperture flares + hit spots.
 */

type Preset = 'fan' | 'sheet' | 'tunnel' | 'sweep' | 'crossfire' | 'sky' | 'wave' | 'cone' | 'grid' | 'burst';

const G: Record<EmitterGroup, number> = { deck: 1, tower: 2, high: 4, arm: 8, pillar: 16, base: 32, foh: 64 };
const STAGE_MASK = G.deck | G.tower | G.high | G.arm;
const FIELD_MASK = G.pillar | G.base | G.foh;

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
}

const PRESETS: Record<Preset, PresetDef> = {
  fan: { count: 12, spread: 84, tilt: 7, speed: 0.25, stage: G.deck | G.high, field: G.pillar | G.foh },
  sheet: { count: 0, spread: 104, tilt: NaN, speed: 0.12, stage: G.deck, field: G.foh },
  tunnel: {
    count: 8,
    spread: 22,
    tilt: 1.5,
    speed: 0.5,
    stage: G.deck,
    field: G.foh,
    pick: (e) => (e.group === 'deck' ? Math.abs(e.pos.x) < 6 : true),
  },
  sweep: { count: 2, spread: 76, tilt: 5, speed: 0.5, stage: G.deck | G.tower, field: G.pillar },
  crossfire: { count: 3, spread: 5, tilt: 30, speed: 0.125, stage: G.tower | G.high | G.arm, field: G.pillar },
  sky: { count: 3, spread: 26, tilt: 81, speed: 0.12, stage: G.high | G.tower, field: G.pillar },
  wave: { count: 10, spread: 96, tilt: 3, speed: 0.5, stage: G.deck, field: G.pillar },
  cone: {
    count: 18,
    spread: 38,
    tilt: 6,
    speed: 0.25,
    stage: G.deck,
    field: G.pillar,
    pick: (e) => e.group !== 'deck' || Math.round(e.rank * 11) % 2 === 0,
  },
  grid: { count: 10, spread: 60, tilt: 50, speed: 0.1, stage: G.high | G.deck, field: G.base },
  burst: {
    count: 36,
    spread: 124,
    tilt: 12,
    speed: 0.12,
    stage: G.arm | G.deck,
    field: G.foh,
    pick: (e) => (e.group === 'arm' ? Math.abs(e.pos.x) > 80 : e.group === 'deck' ? Math.abs(e.pos.x) < 6 : true),
  },
};

/** cue target tokens → projector groups (+ optional side restriction) */
const TOKENS: Record<string, [number, number]> = {
  laser_stage: [STAGE_MASK, 0],
  stage: [STAGE_MASK, 0],
  laser_field: [G.pillar | G.foh, 0],
  field: [FIELD_MASK, 0],
  deck_front: [G.deck, 0],
  deck: [G.deck, 0],
  deck_back: [G.deck, 0],
  fixtures_floor: [G.deck, 0],
  dj_booth: [G.deck, 0],
  towers_top: [G.tower, 0],
  towers: [G.tower, 0],
  roof: [G.high, 0],
  wings: [G.high, 0],
  wing_tips: [G.high, 0],
  fixtures_truss: [G.high | G.tower, 0],
  wing_left: [G.high, -1],
  wing_right: [G.high, 1],
  dragon_head: [G.high, 0],
  arms: [G.arm, 0],
  sides: [G.arm, 0],
  fireworks_sides: [G.arm, 0],
  pillars_top: [G.pillar, 0],
  pillars: [G.pillar, 0],
  delay_towers: [G.pillar, 0],
  pillars_base: [G.base, 0],
  foh: [G.foh, 0],
};

/** crude solid volumes of the stage set: beams from the field stop on them */
const STAGE_BOXES: readonly (readonly number[])[] = [
  [-62, 0, -40, 62, 1.9, 0.2], // deck
  [-60, 0, -40, 60, 9.5, -4], // castle wall
  [-44, 0, -40, 44, 21, -5], // dragon + inner wings
];

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const MAX_SLOTS = 24;
/** exposure time of the virtual camera / eye used for beam motion smear (s) */
const SHUTTER = 1 / 45;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

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
      const l = Math.hypot(x, y, z) || 1;
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
    const budget = this.gfx.beamCap;
    this.budgetScale = req > budget ? budget / req : 1;
    const surfCap = this.gfx.surfCap;
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
    }
    this.pushFlares();
    this.gfx.end();

    // ------------------------------------------------------------------ light environment
    if (this.envPow > 0) {
      const env = app.env;
      // lasers light the haze more than the people: a modest contribution to the audience light
      const k = Math.min(0.5, this.envPow * 0.006);
      const inv = 1 / this.envPow;
      const w0 = env.stageIntensity;
      const w1 = k * 0.5;
      const tw = w0 + w1;
      if (tw > 0) {
        env.stageColor.setRGB(
          (env.stageColor.r * w0 + this.envR * inv * w1) / tw,
          (env.stageColor.g * w0 + this.envG * inv * w1) / tw,
          (env.stageColor.b * w0 + this.envB * inv * w1) / tw,
        );
      }
      env.stageIntensity += w1;
      env.audienceWash = Math.min(1, env.audienceWash + Math.min(0.35, this.audienceWash * 0.01));
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

  private updateUniforms(ctx: FrameContext): void {
    const app = this.app;
    const u = this.gfx.shared;
    const cam = ctx.camera;
    app.renderer.getDrawingBufferSize(this.v2);
    u.uPixAng.value = (2 * Math.tan((cam.fov * DEG) / 2)) / Math.max(1, this.v2.y / Math.max(0.001, cam.zoom));
    const haze = app.env.haze;
    u.uHaze.value = 0.22 + 0.9 * haze;
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
      s.count = typeof p.count === 'number' ? p.count : 14;
      s.spread = (typeof p.spread === 'number' ? p.spread : s.starHit ? 120 : 140) * DEG;
      s.tilt = (typeof p.tilt === 'number' ? p.tilt : 12) * DEG;
      s.tiltGiven = true;
      s.speed = 0;
      s.intensity = typeof p.intensity === 'number' ? clamp01(p.intensity) : 1;
      s.kick = false;
      s.fade = 0;
      const hitDur = Math.min(c.dur, 2);
      const rel = t - c.t;
      if (rel > hitDur + 0.4) return false;
      const hold = Math.max(0, hitDur - 0.32);
      s.env = rel < hold ? 1 : Math.exp(-(rel - hold) * 9);
      if (s.env < 0.01) return false;
    } else {
      const pr = PRESETS[p.preset as Preset] ? (p.preset as Preset) : 'fan';
      const def = PRESETS[pr];
      s.preset = pr;
      resolveColor(p.color, palette, this.tmpColor, 'primary');
      laserize(this.tmpColor, s.color);
      s.hasColor2 = typeof p.color2 === 'string' && p.color2.length > 0;
      if (s.hasColor2) {
        resolveColor(p.color2, palette, this.tmpColor2, 'secondary');
        laserize(this.tmpColor2, s.color2);
      }
      s.count = typeof p.count === 'number' ? Math.max(1, Math.min(64, Math.round(p.count))) : def.count;
      s.spread = (typeof p.spread === 'number' ? Math.max(0, Math.min(340, p.spread)) : def.spread) * DEG;
      s.tiltGiven = typeof p.tilt === 'number';
      s.tilt = (s.tiltGiven ? Math.max(-45, Math.min(90, p.tilt as number)) : def.tilt) * DEG;
      s.speed = typeof p.speed === 'number' ? p.speed : def.speed;
      s.height = typeof p.height === 'number' ? Math.max(0.6, Math.min(40, p.height)) : 4;
      s.intensity = typeof p.intensity === 'number' ? clamp01(p.intensity) : 1;
      s.kick = p.kick === true;
      s.fade = typeof p.fade === 'number' ? Math.max(0, Math.min(8, p.fade)) : 0;
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
        const m = TOKENS[tk];
        if (m) {
          s.groupMask |= m[0];
          if (m[1] !== 0) s.groupSide = m[1];
          s.hasGroupToken = true;
        }
      }
    }
    if (s.hit && !s.hasGroupToken) {
      s.groupMask = (s.origin & 1 ? STAGE_MASK : 0) | (s.origin & 2 ? G.pillar | G.foh : 0);
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
    const mask = (s.origin & 1 ? def.stage : 0) | (s.origin & 2 ? def.field : 0);
    if (!(mask & bit)) return false;
    return def.pick ? def.pick(e) : true;
  }

  private beamsPerEmitter(s: LookSlot): number {
    if (s.hit) return s.count;
    switch (s.preset) {
      case 'sheet':
        return 2; // bright scan edges (surfaces carry the sheet itself)
      case 'crossfire':
        return s.count;
      default:
        return s.count;
    }
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
    if (e.group === 'pillar') {
      // beam bounces over the aisle: to the opposite lantern one row closer, front row → stage centre
      const tgt = e.partner >= 0 ? this.rig.emitters[e.partner].pos : null;
      const tx = tgt ? tgt.x : 0;
      const ty = tgt ? tgt.y : 2.6;
      const tz = tgt ? tgt.z : -1.5;
      for (let i = 0; i < n; i++) {
        let x = tx;
        let y = ty;
        let z = tz;
        if (i > 0) {
          // extra beams: straight across the aisle, then to rows further back
          const k = i;
          x = -e.pos.x + e.side * 1.75 * 2;
          z = e.pos.z + (k === 1 ? 0 : (k - 1) * 27 * (k % 2 ? 1 : -1));
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
    const tz = e.origin === 'stage' ? dist : -dist * 0.5;
    this.setDir(tx - e.pos.x, ty - e.pos.y, tz - e.pos.z);
    const yaw0 = Math.atan2(this.dx * e.lat.x + this.dz * e.lat.z, this.dx * e.fwd.x + this.dz * e.fwd.z);
    const pitch0 = Math.asin(Math.max(-1, Math.min(1, this.dy)));
    for (let i = 0; i < n; i++) {
      const off = n > 1 ? (i / (n - 1) - 0.5) * s.spread : 0;
      this.dirYP(e, yaw0 + off, pitch0 + off * 0.35);
      this.beam(e, col, pb, 0);
    }
  }

  /** cone (sunburst aimed at the audience) or tunnel (rotating cone shell down the aisle) */
  private genCone(s: LookSlot, e: Emitter, I: number, tunnel: boolean, surf: boolean): void {
    const n = s.nEff;
    const ph = TAU * s.speed * s.bars;
    if (tunnel) {
      // aim down the aisle (stage) or at the stage (field)
      let tx: number;
      let ty: number;
      let tz: number;
      if (e.origin === 'stage') {
        tx = e.pos.x * 0.3;
        tz = 96;
        ty = 1.2 + Math.tan(s.tilt) * 96 + (e.group === 'high' ? -2 : 0);
      } else {
        tx = e.pos.x * 0.2;
        tz = -2;
        ty = 6 + Math.tan(s.tilt) * 60;
      }
      this.setDir(tx - e.pos.x, ty - e.pos.y, tz - e.pos.z);
    } else {
      if (this.aimYP(s, e)) this.dirYP(e, this.aimYaw, this.aimPitch);
      else this.dirYP(e, e.side * 0.1, s.tilt);
    }
    this.basis(this.dx, this.dy, this.dz);
    const b = this.bx;
    const kickBreath = this.hasKick ? 0.12 * this.kickEnv : 0;
    const h = 0.5 * s.spread * (tunnel ? 1 + 0.1 * Math.sin(ph * 0.5) : 0.88 + kickBreath);
    const rot = ph * (tunnel ? 1 : e.side);
    const ch = Math.cos(h);
    const sh = Math.sin(h);
    const pb = I * this.perBeam(n);
    for (let i = 0; i < n; i++) {
      const phi = rot + (TAU * i) / n;
      const cp = Math.cos(phi) * sh;
      const sp = Math.sin(phi) * sh;
      this.setDir(ch * b[0] + cp * b[3] + sp * b[6], ch * b[1] + cp * b[4] + sp * b[7], ch * b[2] + cp * b[5] + sp * b[8]);
      this.beam(e, s.hasColor2 && i % 2 ? s.color2 : s.color, pb * (tunnel ? 0.3 : 1), tunnel ? 0.3 : 0.55);
    }
    if (tunnel && surf) {
      const c = s.color;
      const P = I * 1.2;
      if (!this.recording) this.gfx.pushSurface(
        e.pos.x, e.pos.y, e.pos.z, 170,
        b[0], b[1], b[2], h,
        b[6], b[7], b[8], 1,
        c.r * P, c.g * P, c.b * P, 0.04,
        ph * 0.5, 0, 0.85, ph * 0.5 + rand01(e.index * 31 + (s.cue?.id ?? 0)),
      );
      if (!this.recording) this.envAdd(c, P * 3);
    }
  }

  private genGrid(s: LookSlot, e: Emitter, I: number): void {
    const n = s.nEff;
    const ph = TAU * s.speed * s.bars;
    const pb = I * this.perBeam(n);
    if (e.group === 'base' || (e.origin === 'field' && e.group !== 'pillar' && e.group !== 'foh')) {
      // low web over the field: horizontal fans across the aisle at `height`
      const h = s.height > 0 ? Math.min(s.height, 6) : 2;
      const pitch = Math.atan2(h - e.pos.y, 44);
      const sway = 0.08 * Math.sin(ph + (e.row + 1) * 1.3);
      for (let i = 0; i < n; i++) {
        const u = n > 1 ? i / (n - 1) : 0.5;
        this.dirYP(e, (u - 0.5) * s.spread + sway, pitch);
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
    const inward = e.group === 'arm' ? -e.side * 0.3 : 0;
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

  /** "liquid sky": a scanned plane at `height` with gentle waves, plus its bright edge beams */
  private genSheet(s: LookSlot, e: Emitter, I: number): void {
    const ph = TAU * s.speed * s.bars;
    const dist = e.origin === 'stage' ? 62 : 48;
    const pitch = s.tiltGiven ? s.tilt : Math.atan2(s.height - e.pos.y, dist);
    const yaw = e.group === 'deck' ? e.side * 0.1 * (0.3 + Math.abs(e.pos.x) / 50) : 0;
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
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const half = Math.min(Math.PI * 0.49, s.spread * 0.5);
    const range = e.origin === 'stage' ? 250 : 150;
    const amp = 0.011 + 0.004 * Math.sin(ph * 0.25);
    const seed = rand01(hash32(e.index * 977 + (s.cue?.id ?? 0)));
    const ph1 = ph + seed * TAU;
    const ph2 = ph * 0.73 + seed * 3.1;
    const P = I * 1.0 / Math.max(0.4, 2 * half);
    const c = s.color;
    if (!this.recording) this.gfx.pushSurface(e.pos.x, e.pos.y, e.pos.z, range, fx, fy, fz, half, nx, ny, nz, 0, c.r * P, c.g * P, c.b * P, amp, ph1, ph2, 0, seed * TAU);
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
      this.envAdd(c, I * 4);
      this.audienceWash += I * 10;
    }
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
    this.aimPitch = Math.atan2(y, Math.hypot(f, l));
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
    const l = Math.hypot(x, y, z) || 1;
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
    let nl = Math.hypot(nx, ny, nz);
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
    const ox = e.pos.x;
    const oy = e.pos.y;
    const oz = e.pos.z;
    const dx = this.dx;
    const dy = this.dy;
    const dz = this.dz;
    let len = maxLen;
    let hit = target;
    if (dy < -1e-4) {
      const tg = oy / -dy;
      if (tg < len) {
        len = tg;
        hit = true;
      }
    }
    if (e.origin === 'field') {
      for (let i = 0; i < STAGE_BOXES.length; i++) {
        const tb = rayBox(ox, oy, oz, dx, dy, dz, STAGE_BOXES[i]);
        if (tb > 0 && tb < len) {
          len = tb;
          hit = true;
        }
      }
    }
    const r = col.r * power;
    const g = col.g * power;
    const b = col.b * power;
    if (!this.gfx.pushBeam(ox, oy, oz, dx, dy, dz, len, r, g, b, dash, hit, 1, px, py, pz)) return;
    if (hit) this.gfx.pushSprite(ox + dx * len, oy + dy * len, oz + dz * len, target ? 0.32 : 0.2, r * 5, g * 5, b * 5, 1);
    // aperture flare
    const i4 = e.index * 4;
    const i3 = e.index * 3;
    const c = dx * this.toCam[i3] + dy * this.toCam[i3 + 1] + dz * this.toCam[i3 + 2];
    const eye = c > 0.9 ? Math.exp((c - 1) * 1400) : 0;
    const wide = c > 0 ? Math.exp((c - 1) * 22) : 0;
    const f = power * (0.06 + 1.2 * wide + 60 * eye);
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
      budget: this.gfx.beamCap,
      budgetScale: +this.budgetScale.toFixed(2),
      surfaces: s.surfaces,
      sprites: s.sprites,
      emitters: this.rig.emitters.length,
      activeEmitters: s.active,
      looks: s.looks,
      drawCalls: this.gfx.drawCalls,
      triangles: this.gfx.triangles,
      haze: +(this.gfx.shared.uHaze.value as number).toFixed(2),
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
