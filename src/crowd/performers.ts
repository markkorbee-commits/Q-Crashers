import * as THREE from 'three';
import { clamp, hash32, lerp, smoothstep } from '../core/rng';
import type { ShowEngine } from '../show/ShowEngine';
import { BOTTOM, HAIR, HEAD, newLook, packLook, PRINT, PROP, TOP, type Look } from './constants';

/**
 * People on the grounds besides the crowd (show-analysis §0.4, design-bible §9.1):
 *  - the MC / vocalist on the deck during the anthem (335–502 s),
 *  - the Sacred Flame fire-ritual troupe: 10 lantern bearers in red, the lead dancer on a round
 *    pedestal and an aerialist on a strap in the DJ arch (642–733 s),
 *  - the pianist at the white grand piano on the field riser (Domitor Draconis, 882–1098 s),
 *  - a silhouette at the DJ booth, deck / FOH camera operators,
 *  - "As filmed" only: drone pilot, pit photographer, a crew member crossing the field (photo P),
 *    safety crew in hi-vis at the pyro positions, the official photographer on the terrace;
 *  - Tribe mode only: security in hi-vis in the pit, facing the crowd.
 * Everything is a pure function of show time; poses are computed on the CPU (≤ 40 instances) and
 * uploaded as instance attributes to the same GPU-skinned body as the crowd.
 *
 * Timing comes from the show file (docs/show-format.md, crowd cues): `crowd` / `performer` cues with
 * `p.who` = mc | troupe | lead | aerialist | strap | pedestal | pianist | tube | dj set the windows,
 * `crowd` / `mood` cues with state `jump` are the MC's hype windows. Choreography inside a window
 * is authored relative to its start, so retiming the show moves the performers with it. Without
 * such cues the 2026 Endshow defaults below apply.
 */

interface Win {
  t0: number;
  t1: number;
}

/**
 * show-time windows of the performers (defaults = the 2026 Endshow as filmed, on the audio-locked
 * timeline of scripts/retime-show.py)
 */
export class PerfTiming {
  // the video shows the MC on the deck until v502.08 (research/video-timeline/03.md)
  mc: Win = { t0: 332.1, t1: 502.1 };
  // the troupe choreography is keyed to TROUPE_T0 (642): 641.8 lands its leap on the burning wings (709.05)
  troupe: Win = { t0: 641.8, t1: 732.8 };
  lead: Win = { t0: 639.5, t1: 733.6 };
  pedestal: Win = { t0: 638.8, t1: 734.4 };
  aerial: Win = { t0: 678.8, t1: 703.8 };
  strap: Win = { t0: 675.8, t1: 705.8 };
  pianist: Win = { t0: 880.4, t1: 1098.4 };
  tubeHi: Win = { t0: 885.1, t1: 936 };
  tubeLo: Win = { t0: 876.5, t1: 1098.4 };
  /** no DJ performs in the 2026 Endshow (confirmed by the user): the booth stays empty unless a show adds `performer` who:'dj' cues */
  dj: Win[] = [];
  /** MC hype windows (crowd jump moods; the show file's jump moods replace these) */
  hype: Win[] = [
    { t0: 330.37, t1: 341.1 },
    { t0: 415.42, t1: 440 },
    { t0: 502.13, t1: 520.71 },
  ];
  /** did the show file provide the performer windows (vs the built-in defaults) */
  fromShow = false;

  /** read the windows from the compiled show (defaults without a show file / performer cues) */
  load(show: ShowEngine | null): void {
    const d = new PerfTiming();
    this.mc = d.mc;
    this.troupe = d.troupe;
    this.lead = d.lead;
    this.pedestal = d.pedestal;
    this.aerial = d.aerial;
    this.strap = d.strap;
    this.pianist = d.pianist;
    this.tubeHi = d.tubeHi;
    this.tubeLo = d.tubeLo;
    this.dj = d.dj;
    this.hype = d.hype;
    this.fromShow = false;
    if (!show || !show.file) return;
    const dj: Win[] = [];
    const hype: Win[] = [];
    for (const c of show.all('crowd')) {
      const w = { t0: c.t, t1: c.t + c.dur };
      if (c.fx === 'mood' && c.p.state === 'jump') hype.push(w);
      if (c.fx !== 'performer') continue;
      this.fromShow = true;
      const who = String(c.p.who ?? '');
      if (who === 'dj') dj.push(w);
      else if (who === 'tube') {
        if (typeof c.p.level === 'number' && c.p.level < 0.5) this.tubeLo = w;
        else this.tubeHi = w;
      } else if (who === 'mc') this.mc = w;
      else if (who === 'troupe') this.troupe = w;
      else if (who === 'lead') this.lead = w;
      else if (who === 'pedestal') this.pedestal = w;
      else if (who === 'strap') this.strap = w;
      else if (who === 'pianist') this.pianist = w;
      else if (who === 'aerialist') this.aerial = w;
    }
    if (dj.length) this.dj = dj;
    if (hype.length) this.hype = hype;
  }
}

const inWin = (t: number, w: Win) => t > w.t0 && t < w.t1;

const D = Math.PI / 180;

export interface CPose {
  off: [number, number, number];
  cape: number;
  rootR: [number, number, number];
  spine: [number, number, number];
  head: [number, number];
  armL: [number, number, number, number];
  armR: [number, number, number, number];
  legL: [number, number, number];
  legR: [number, number, number];
  shoW: number;
  hipW: number;
}

function newPose(): CPose {
  return {
    off: [0, 0, 0], cape: 0.12, rootR: [0, 0, 0], spine: [0, 0, 0], head: [0, 0],
    armL: [0, 0, 0, 0], armR: [0, 0, 0, 0], legL: [0, 0, 0], legR: [0, 0, 0], shoW: 1, hipW: 1,
  };
}

function resetPose(p: CPose): CPose {
  p.off[0] = p.off[1] = p.off[2] = 0;
  p.cape = 0.12;
  p.rootR[0] = p.rootR[1] = p.rootR[2] = 0;
  p.spine[0] = p.spine[1] = p.spine[2] = 0;
  p.head[0] = p.head[1] = 0;
  setArm(p.armL, 5, 7, 12, 0);
  setArm(p.armR, 5, 7, 14, 0);
  p.legL[0] = p.legL[1] = p.legL[2] = 0;
  p.legR[0] = p.legR[1] = p.legR[2] = 0;
  return p;
}

function setArm(a: number[], f: number, b: number, e: number, w: number): void {
  a[0] = f * D;
  a[1] = b * D;
  a[2] = e * D;
  a[3] = w * D;
}

function mixArm(a: number[], f: number, b: number, e: number, w: number, k: number): void {
  a[0] += (f * D - a[0]) * k;
  a[1] += (b * D - a[1]) * k;
  a[2] += (e * D - a[2]) * k;
  a[3] += (w * D - a[3]) * k;
}

/** walking: legs + arm swing + bob for a gait phase (cycles) and amount 0..1 */
function walk(p: CPose, phase: number, amt: number): void {
  const s = Math.sin(phase * Math.PI * 2);
  const c = Math.cos(phase * Math.PI * 2);
  p.legL[0] += 24 * D * s * amt;
  p.legR[0] -= 24 * D * s * amt;
  p.legL[2] += Math.max(0, -c) * 38 * D * amt + 6 * D * amt;
  p.legR[2] += Math.max(0, c) * 38 * D * amt + 6 * D * amt;
  p.armL[0] -= 20 * D * s * amt;
  p.armR[0] += 20 * D * s * amt;
  p.off[1] -= Math.abs(s) * 0.025 * amt;
  p.rootR[1] += 5 * D * s * amt;
}

/** knee-bend drop with the feet planted */
function dropLegs(p: CPose, drop: number): void {
  const a = Math.acos(clamp(1 - drop / 0.86, -1, 1));
  p.legL[0] += a;
  p.legL[2] += 2 * a;
  p.legR[0] += a;
  p.legR[2] += 2 * a;
  p.off[1] -= drop;
}

interface Way {
  t: number;
  x: number;
  z: number;
}

/** piecewise path with eased segments; returns position + cumulative distance (pure function of t) */
class Path {
  private cum: number[] = [0];
  constructor(private w: Way[]) {
    for (let i = 1; i < w.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(w[i].x - w[i - 1].x, w[i].z - w[i - 1].z));
  }
  at(t: number, out: { x: number; z: number; dist: number; speed: number; dx: number; dz: number }): void {
    const w = this.w;
    let i = 0;
    while (i < w.length - 2 && t > w[i + 1].t) i++;
    const a = w[i];
    const b = w[i + 1];
    const f = clamp((t - a.t) / Math.max(1e-3, b.t - a.t), 0, 1);
    const e = f * f * (3 - 2 * f);
    out.x = lerp(a.x, b.x, e);
    out.z = lerp(a.z, b.z, e);
    const len = this.cum[i + 1] - this.cum[i];
    out.dist = this.cum[i] + len * e;
    const de = 6 * f * (1 - f);
    out.speed = f > 0 && f < 1 ? (len * de) / Math.max(1e-3, b.t - a.t) : 0;
    out.dx = b.x - a.x;
    out.dz = b.z - a.z;
  }
}

/**
 * The MC's walk (authored in 2026 show time, shifted with the 'mc' window). He works the deck
 * UPSTAGE of the pyro line (flame heads at z −0.4, gerbs −0.85, comets −1.1: ≥ 3 m safety distance,
 * as a pyro operator would demand) and steps back next to the booth for the anthem drops.
 */
const MC_PATH = new Path([
  { t: 332, x: 0, z: -7.2 },
  { t: 338, x: 0, z: -3.6 },
  { t: 350, x: -9, z: -3.5 },
  { t: 362, x: -12.5, z: -3.8 },
  { t: 376, x: 3, z: -3.4 },
  { t: 389, x: 13.5, z: -3.7 },
  { t: 402, x: 6, z: -3.4 },
  { t: 409, x: 2.5, z: -4.4 },
  { t: 414, x: 1.2, z: -5.0 },
  { t: 430, x: -1.4, z: -5.0 },
  { t: 441, x: -3.5, z: -4.4 },
  { t: 452, x: -13.5, z: -3.8 },
  { t: 465, x: -4, z: -3.5 },
  { t: 478, x: 8, z: -3.5 },
  { t: 489, x: 12, z: -3.8 },
  // the close-ups v496.12 / v497.60 (cameras at (5.6, -3.2) / (0.4, -3.5) aimed at the portal):
  // he stands on their axes in front of the porch screen (Z −6), then dances on the spot in the
  // cyan backlight (v498.36–502.04) until the cut to the terrace at the drop
  { t: 495.6, x: 3.8, z: -5.2 },
  { t: 496.6, x: 3.6, z: -5.3 },
  { t: 497.7, x: 2.2, z: -5.4 },
  { t: 502.2, x: 2.0, z: -5.7 },
]);
const MC_T0 = 332;
const TROUPE_T0 = 642;

type Mode = 'both' | 'filmed' | 'tribe';

interface Perf {
  name: string;
  /** index within its group (dancer k, safety k, security k) */
  k: number;
  mode: Mode;
  look: Look;
  height: number;
  build: number;
  seed: number;
}

export interface PerfFrame {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  glow: number;
}

const DANCERS = 10;
const SECURITY = 10;

export class Performers {
  readonly count: number;
  readonly perfs: Perf[] = [];
  readonly iPos: Float32Array;
  readonly iAttr: Float32Array;
  readonly iLook: Float32Array;
  readonly iP: Float32Array[];
  /** lantern light on the performers (rgb, intensity) */
  readonly lantern = new THREE.Vector4(1, 0.72, 0.42, 0);
  /** which props groups are active: pedestal, strap (for the props mesh) */
  pedestal = 0;
  strap = 0;
  pianoTube = 0;
  visibleCount = 0;
  crewVisible = 0;
  /** the MC is on stage (for the follow spot) */
  mcOn = false;
  /** show windows (from the show file when it provides them) */
  readonly timing = new PerfTiming();
  private pose = newPose();
  private fr: PerfFrame = { visible: false, x: 0, y: 0, z: 0, yaw: 0, glow: 0 };
  private pp = { x: 0, z: 0, dist: 0, speed: 0, dx: 0, dz: 0 };
  private heightAt: (x: number, z: number) => number;

  constructor(heightAt: (x: number, z: number) => number) {
    this.heightAt = heightAt;
    const add = (name: string, mode: Mode, f: (l: Look) => void, height: number, build = 1) => {
      const l = newLook();
      f(l);
      const m = /(\d+)$/.exec(name);
      this.perfs.push({ name, k: m ? Number(m[1]) : 0, mode, look: l, height, build, seed: hash32(this.perfs.length * 977 + 31) & 0xffffff });
    };
    add('mc', 'both', (l) => {
      l.skin = 3; l.hairColor = 0; l.headwear = HEAD.CAP; l.capColor = 0; l.top = TOP.CHARCOAL; l.bottom = BOTTOM.BLACK;
      l.shoe = 0; l.socks = true; l.props = PROP.MIC; l.wristband = true;
    }, 1.8, 1.12);
    for (let i = 0; i < DANCERS; i++) {
      add(`dancer${i}`, 'both', (l) => {
        l.female = i % 3 !== 1;
        l.skin = [1, 2, 3, 5, 0, 4, 2, 6, 1, 3][i];
        l.hairColor = i % 4 === 0 ? 1 : 0;
        l.hairStyle = HAIR.PONY;
        l.top = TOP.JUMPSUIT; l.bottom = BOTTOM.JUMPSUIT; l.longPants = true; l.shoe = 1;
        l.props = i % 4 === 3 ? PROP.LANTERN_R : PROP.LANTERN_L | PROP.LANTERN_R;
      }, i % 3 !== 1 ? 1.68 + (i % 2) * 0.05 : 1.8, i % 3 !== 1 ? 0.9 : 1.0);
    }
    add('lead', 'both', (l) => {
      l.female = true; l.skin = 2; l.hairStyle = HAIR.LONG; l.hairColor = 0;
      l.top = TOP.JUMPSUIT; l.bottom = BOTTOM.JUMPSUIT; l.longPants = true; l.shoe = 1;
    }, 1.72, 0.88);
    add('aerialist', 'both', (l) => {
      l.female = true; l.skin = 1; l.hairStyle = HAIR.PONY; l.top = TOP.JUMPSUIT; l.bottom = BOTTOM.JUMPSUIT; l.longPants = true; l.shoe = 1;
    }, 1.66, 0.86);
    add('pianist', 'both', (l) => {
      l.skin = 4; l.hairColor = 0; l.hairStyle = HAIR.PONY; l.top = TOP.BLACK; l.print = PRINT.GOLD_STRIPES;
      l.bottom = BOTTOM.BLACK; l.longPants = true; l.shoe = 1;
    }, 1.8, 1.0);
    add('dj', 'both', (l) => {
      l.headwear = HEAD.CAP; l.top = TOP.BLACK; l.bottom = BOTTOM.BLACK; l.longPants = true; l.shoe = 1;
    }, 1.8, 1.05);
    add('deckcam', 'both', (l) => {
      l.headwear = HEAD.CAP_BACK; l.top = TOP.BLACK; l.bottom = BOTTOM.BLACK; l.longPants = true; l.shoe = 1; l.props = PROP.CAMERA;
    }, 1.82, 1.08);
    add('fohcam', 'both', (l) => {
      l.headwear = HEAD.CAP; l.top = TOP.BLACK; l.bottom = BOTTOM.BLACK; l.longPants = true; l.shoe = 1;
    }, 1.78, 1.05);
    add('pilot', 'filmed', (l) => {
      l.top = TOP.CHARCOAL; l.bottom = BOTTOM.DARK_DENIM; l.longPants = true; l.shoe = 1; l.props = PROP.CTRL; l.hairStyle = HAIR.BUZZ;
    }, 1.84, 1.02);
    add('photog', 'filmed', (l) => {
      l.headwear = HEAD.BUCKET; l.capColor = 0; l.top = TOP.BLACK; l.bottom = BOTTOM.BLACK; l.longPants = true; l.shoe = 1; l.props = PROP.CAMERA;
    }, 1.76, 1.0);
    add('walker', 'filmed', (l) => {
      l.headwear = HEAD.CAP; l.top = TOP.BLACK; l.bottom = BOTTOM.BLACK; l.shoe = 1;
    }, 1.8, 1.0);
    for (let i = 0; i < 6; i++) {
      add(`safety${i}`, 'filmed', (l) => {
        l.top = TOP.HIVIS; l.print = PRINT.HIVIS; l.bottom = BOTTOM.BLACK; l.longPants = true; l.shoe = 1;
        l.headwear = i % 2 === 0 ? HEAD.CAP : HEAD.NONE; l.hairStyle = HAIR.BUZZ; l.skin = [1, 3, 0, 5, 2, 4][i];
      }, 1.76 + (i % 3) * 0.04, 1.05);
    }
    add('terrace', 'both', (l) => {
      l.top = TOP.BLACK; l.bottom = BOTTOM.BLACK; l.longPants = true; l.shoe = 1; l.hairStyle = HAIR.SHORT;
    }, 1.8, 1.0);
    for (let i = 0; i < SECURITY; i++) {
      add(`security${i}`, 'tribe', (l) => {
        l.top = TOP.HIVIS; l.print = PRINT.HIVIS; l.bottom = BOTTOM.BLACK; l.longPants = true; l.shoe = 1;
        l.headwear = i % 3 === 0 ? HEAD.CAP : HEAD.NONE; l.hairStyle = HAIR.BUZZ; l.skin = [2, 0, 4, 1, 5, 3, 2, 6, 1, 0][i];
      }, 1.8 + ((i * 7) % 5) * 0.03, 1.12);
    }
    this.count = this.perfs.length;
    this.iPos = new Float32Array(this.count * 4);
    this.iAttr = new Float32Array(this.count * 4);
    this.iLook = new Float32Array(this.count * 4);
    this.iP = Array.from({ length: 7 }, () => new Float32Array(this.count * 4));
    for (let i = 0; i < this.count; i++) packLook(this.perfs[i].look, this.iLook, i * 4);
  }

  /** evaluate every performer at show time t (pure). populated = Tribe mode. */
  update(t: number, rt: number, beat: number, bpm: number, lookUp: number, populated: boolean): void {
    this.visibleCount = 0;
    this.crewVisible = 0;
    const T = this.timing;
    this.mcOn = inWin(t, T.mc);
    let lanternOn = 0;
    this.pedestal = inWin(t, T.pedestal) ? 1 : 0;
    this.strap = inWin(t, T.strap) ? 1 : 0;
    // piano light tube: white glow for the piano intro, dim otherwise
    this.pianoTube = inWin(t, T.tubeHi) ? 1 : inWin(t, T.tubeLo) ? 0.25 : 0.06;
    for (let i = 0; i < this.count; i++) {
      const pf = this.perfs[i];
      const p = resetPose(this.pose);
      p.shoW = pf.build * (pf.look.female ? 0.9 : 1);
      p.hipW = lerp(1, pf.build, 0.5) * (pf.look.female ? 1.08 : 1);
      const f = this.fr;
      f.visible = false;
      f.glow = 0;
      const modeOk = pf.mode === 'both' || (pf.mode === 'filmed' ? !populated : populated);
      if (modeOk) this.evalOne(pf, i, t, rt, beat, bpm, lookUp, p, f);
      if (f.visible && pf.name.startsWith('dancer')) lanternOn = 1;
      this.write(i, pf, p, f);
      if (f.visible) {
        this.visibleCount++;
        if (pf.mode !== 'both' || pf.name.endsWith('cam') || pf.name === 'terrace') this.crewVisible++;
      }
    }
    // the other bearers' lanterns: a faint warm fill on the deck (each bearer's own are lit per body)
    this.lantern.w = lanternOn * 0.14;
  }

  private evalOne(pf: Perf, i: number, t: number, rt: number, beat: number, bpm: number, lookUp: number, p: CPose, f: PerfFrame): void {
    const bp = beat - Math.floor(beat);
    const kick = Math.exp(-(bp * 60) / Math.max(60, bpm) * 11);
    const name = pf.name;
    const ph = (pf.seed % 1000) / 159.2;
    const T = this.timing;
    if (name === 'mc') {
      if (!inWin(t, T.mc)) return;
      const pp = this.pp;
      const tm = t - T.mc.t0 + MC_T0;
      MC_PATH.at(tm, pp);
      f.visible = true;
      f.x = pp.x;
      f.z = pp.z;
      f.y = 1.9;
      const moving = clamp(pp.speed / 0.8, 0, 1);
      const walkYaw = Math.atan2(pp.dx, pp.dz);
      f.yaw = moving > 0.15 ? lerp(0, walkYaw, 0.55 * moving) : 0.15 * Math.sin(t * 0.3);
      if (tm < 339) f.yaw = walkYaw;
      // white follow spot from the FOH tower while he performs
      f.glow = -0.9 * smoothstep(MC_T0 + 4, MC_T0 + 7, tm) * (1 - smoothstep(501.4, 502.1, tm));
      walk(p, pp.dist / 1.45, moving);
      // mic at the mouth (left hand)
      setArm(p.armL, 58, -14, 142, 10);
      // right arm: hype gestures — up on drops, pointing / waving to the crowd otherwise
      let drop = false;
      for (let h = 0; h < T.hype.length && !drop; h++) drop = inWin(t, T.hype[h]);
      const point = 0.5 + 0.5 * Math.sin(t * 0.9 + 1.3);
      setArm(p.armR, 12 - 20 * moving * Math.sin((pp.dist / 1.45) * Math.PI * 2), 10, 20, 0);
      if (drop) {
        setArm(p.armR, 150 + 18 * kick, 22, 25 - 10 * kick, 0);
        p.off[1] += 0.12 * Math.max(0, Math.sin(Math.PI * bp)) * (1 - moving);
      } else if (moving < 0.4) mixArm(p.armR, 95 + 40 * point, 30, 25, 0, 0.8);
      if (!drop) dropLegs(p, 0.04 * (0.5 + 0.5 * Math.cos(bp * Math.PI * 2)) * (1 - moving));
      p.head[0] -= 0.1;
      return;
    }
    if (name.startsWith('dancer')) {
      const k = pf.k;
      // choreography authored in 2026 show time, shifted with the 'troupe' window
      const tt = t - T.troupe.t0 + TROUPE_T0;
      const enter = TROUPE_T0 + k * 0.6;
      const exit = TROUPE_T0 + (T.troupe.t1 - T.troupe.t0) - 8 + (DANCERS - k) * 0.5;
      if (tt < enter || tt > exit + 8) return;
      f.visible = true;
      f.glow = 1;
      // a tight ritual horseshoe around the lead on her pedestal (0, −2), open to the audience
      // (f066, f069–f071): ~7 m wide, 2 m deep, ≥ 1.2 m behind the pyro line; it breathes / sways
      const sway = 0.1 * Math.sin((tt - enter) * 0.21 + k) * (tt < 700 || tt > 716 ? 1 : 0.2);
      const th = ((-14 + (208 * k) / (DANCERS - 1)) * Math.PI) / 180 + sway;
      const rx = 3.6 * Math.cos(th);
      const rz = -2.1 - 2.0 * Math.sin(th);
      const pe = smoothstep(enter, enter + 7, tt) * (1 - smoothstep(exit, exit + 7, tt));
      f.x = lerp(0, rx, pe);
      f.z = lerp(-7.5, rz, pe);
      f.y = 1.9;
      const moving = tt < enter + 7 || tt > exit ? 1 : 0;
      const walkYaw = tt > exit ? Math.atan2(-rx, -7.5 - rz) : Math.atan2(rx, rz + 7.5);
      const faceIn = Math.atan2(-rx, -2 - rz);
      f.yaw = moving > 0.5 ? walkYaw : tt > 700 && tt < 715 ? faceIn : lerp(faceIn, 0, 0.6);
      walk(p, tt * 0.9 + k * 0.37, moving);
      // lantern waves passing around the ring (canon)
      const wave = 0.5 + 0.5 * Math.sin((tt / 3.75) * Math.PI * 2 - th * 2);
      setArm(p.armR, 25 + 135 * wave, 18, 25, -20);
      setArm(p.armL, 25 + 135 * (1 - wave), 18, 25, -20);
      p.spine[0] += (18 - 26 * wave) * D;
      if (tt > 700 && tt < 709.2) {
        // anticipation: kneel, lanterns low towards the lead dancer
        dropLegs(p, 0.48 * smoothstep(700, 703, tt));
        setArm(p.armR, 45, 20, 20, 0);
        setArm(p.armL, 45, 20, 20, 0);
        p.spine[0] += 25 * D;
      } else if (tt >= 709.2 && tt < 716) {
        // burning wings: leap up, both lanterns overhead
        setArm(p.armR, 168, 28, 12, 0);
        setArm(p.armL, 168, 28, 12, 0);
        p.off[1] += 0.25 * Math.max(0, Math.sin((tt - 709.2) * 2.4)) * (1 - smoothstep(710.5, 712, tt));
        p.spine[0] -= 12 * D;
      } else {
        // tribal stomp on the percussion
        const lp = Math.sin(Math.PI * clamp(bp / 0.55, 0, 1));
        if (Math.floor(beat) % 2 === 0) {
          p.legL[0] += 30 * D * lp * (1 - moving);
          p.legL[2] += 45 * D * lp * (1 - moving);
        } else {
          p.legR[0] += 30 * D * lp * (1 - moving);
          p.legR[2] += 45 * D * lp * (1 - moving);
        }
      }
      return;
    }
    if (name === 'lead') {
      if (!inWin(t, T.lead)) return;
      const tt = t - T.troupe.t0 + TROUPE_T0;
      f.visible = true;
      f.x = 0;
      f.z = -2;
      f.y = 1.9 + 0.5 * this.pedestal;
      f.yaw = 0.25 * Math.sin(t * 0.12);
      const und = Math.sin(t * 1.6);
      p.rootR[2] += 7 * D * und;
      p.spine[2] -= 10 * D * und;
      p.spine[0] -= 6 * D + 4 * D * Math.sin(t * 0.8);
      p.off[0] += 0.05 * und;
      if (tt > 709.2 && tt < 716) {
        setArm(p.armL, 150, 62, 10, 0);
        setArm(p.armR, 150, 62, 10, 0);
        p.head[0] -= 0.4;
      } else {
        // hands joined above the head (f066)
        setArm(p.armL, 172, -6, 48 + 10 * Math.sin(t * 0.9), 0);
        setArm(p.armR, 172, -6, 48 + 10 * Math.sin(t * 0.9 + 0.4), 0);
        p.head[0] -= 0.25;
      }
      p.legL[0] += 8 * D;
      p.legR[0] -= 6 * D;
      return;
    }
    if (name === 'aerialist') {
      const A = T.aerial;
      if (!inWin(t, A)) return;
      f.visible = true;
      const up = smoothstep(A.t0, A.t0 + 5, t) * (1 - smoothstep(A.t1 - 5, A.t1, t));
      f.x = 0;
      f.z = -6.8;
      f.y = 1.9 + 2.2 * up;
      f.yaw = (t - A.t0) * 0.7;
      setArm(p.armL, 176, 4, 6, 0);
      setArm(p.armR, 176, 4, 6, 0);
      const split = up * (0.6 + 0.4 * Math.sin(t * 0.7));
      p.legL[0] += 75 * D * split;
      p.legR[0] -= 45 * D * split;
      p.spine[0] -= 10 * D * split;
      p.head[0] -= 0.35 * up;
      return;
    }
    if (name === 'pianist') {
      if (!inWin(t, T.pianist)) return;
      f.visible = true;
      f.x = 0;
      f.z = 60.25;
      f.y = 0.6;
      f.yaw = Math.PI;
      // white key light for the piano reveal (f094), a softer one for the rest of the track
      f.glow = -(inWin(t, T.tubeHi) ? 0.5 + 1.4 * smoothstep(T.tubeHi.t0, T.tubeHi.t0 + 2, t) : 0.5);
      // seated at the bench, hands running over the keys
      p.off[1] -= 0.4;
      p.legL[0] += 86 * D;
      p.legR[0] += 86 * D;
      p.legL[2] += 78 * D;
      p.legR[2] += 78 * D;
      p.legL[1] += 6 * D;
      p.legR[1] += 6 * D;
      const run = Math.sin(t * 1.3);
      setArm(p.armL, 52, 9 + 9 * Math.sin(t * 1.3 + 0.8), 58, -18);
      setArm(p.armR, 52, 9 - 9 * run, 58, -18);
      p.spine[0] += (10 + 5 * Math.sin(t * 0.7)) * D;
      p.spine[1] += 7 * D * run;
      const ph6 = (((t - T.tubeHi.t0 - 1) % 6.66) + 6.66) % 6.66;
      const hit = Math.exp(-ph6 * 2);
      p.head[0] += 0.1 + 0.18 * hit;
      p.head[1] += 0.12 * run;
      return;
    }
    if (name === 'dj') {
      let on = false;
      for (let w = 0; w < T.dj.length && !on; w++) on = inWin(t, T.dj[w]);
      if (!on) return;
      f.visible = true;
      f.x = 0.4;
      f.z = -8.3;
      f.y = 1.9;
      f.yaw = 0;
      setArm(p.armL, 42, 12, 52, -20);
      setArm(p.armR, 42, 12, 52, -20);
      if (Math.sin(t * 0.37) > 0.8) setArm(p.armR, 160, 20, 20, 0);
      p.head[0] += 0.12 * Math.pow(0.5 + 0.5 * Math.cos(bp * Math.PI * 2), 2);
      p.spine[0] += 8 * D;
      return;
    }
    if (name === 'deckcam') {
      const mcOn = t > T.mc.t0 + 4 && t < T.mc.t1 - 5;
      const dnOn = t > T.troupe.t0 + 6 && t < T.troupe.t1 - 5;
      if (!mcOn && !dnOn) return;
      f.visible = true;
      f.y = 1.9;
      if (mcOn) {
        const pp = this.pp;
        MC_PATH.at(t - T.mc.t0 + MC_T0 - 1.2, pp);
        const side = pp.x > 0 ? -1 : 1;
        f.x = pp.x + side * 3.2;
        f.z = pp.z + 1.0;
        f.yaw = Math.atan2(pp.x - f.x, pp.z - f.z);
        walk(p, pp.dist / 1.2, clamp(pp.speed / 0.8, 0, 1));
      } else {
        f.x = 9.5 + 0.8 * Math.sin(t * 0.1);
        f.z = -0.8;
        f.yaw = Math.atan2(-f.x, -2.5 - f.z);
      }
      setArm(p.armR, 100, 12, 112, 0);
      setArm(p.armL, 70, -24, 118, 0);
      p.head[1] -= 0.25;
      return;
    }
    if (name === 'fohcam') {
      f.visible = true;
      f.x = 0.8;
      f.z = 89.6;
      f.y = 0.5;
      f.yaw = Math.PI;
      setArm(p.armR, 58, 12, 62, 0);
      setArm(p.armL, 50, -6, 72, 0);
      p.spine[1] += 0.08 * Math.sin(t * 0.05);
      p.spine[0] += 12 * D;
      p.head[0] += 0.15;
      return;
    }
    if (name === 'pilot') {
      f.visible = true;
      f.x = -2.6;
      f.z = 90.4;
      f.y = 0.5;
      f.yaw = Math.PI + 0.35;
      setArm(p.armL, 42, -24, 102, 0);
      setArm(p.armR, 42, -24, 102, 0);
      const look = Math.sin(t * 0.07 + 1.0);
      p.head[0] = look > 0.2 ? -0.45 : 0.35;
      this.idle(p, rt, ph);
      return;
    }
    if (name === 'photog') {
      if (t < 378 || t > 422) return;
      f.visible = true;
      f.x = -20 + 1.5 * smoothstep(378, 382, t);
      f.z = 3.4;
      f.y = 0;
      f.yaw = Math.PI - 0.25;
      dropLegs(p, 0.46);
      p.spine[0] += 20 * D;
      setArm(p.armR, 100, 10, 120, 0);
      setArm(p.armL, 88, -22, 125, 0);
      p.head[0] -= 0.2;
      return;
    }
    if (name === 'walker') {
      if (t < 529 || t > 549) return;
      f.visible = true;
      const k = clamp((t - 530) / 18, 0, 1);
      f.x = lerp(15.5, 0.5, k);
      f.z = lerp(9.5, 28.5, k);
      f.y = 0;
      f.yaw = Math.atan2(-15, 19);
      walk(p, (t - 529) * 0.95, 1);
      p.head[0] -= lookUp * 0.5;
      return;
    }
    if (name.startsWith('safety')) {
      const k = pf.k;
      const side = k % 2 === 0 ? -1 : 1;
      const slot = k >> 1;
      f.visible = true;
      if (slot === 0) {
        f.x = side * 97.5;
        f.z = 62;
      } else if (slot === 1) {
        f.x = side * 49;
        f.z = 1.2;
      } else {
        f.x = side * 23.6;
        f.z = 39.6;
      }
      f.y = slot === 2 ? 0.4 : this.heightAt(f.x, f.z);
      f.yaw = slot === 1 ? Math.atan2(-side, -1) : Math.atan2(-f.x * 0.4, -f.z - 8);
      const radio = Math.sin(t * 0.11 + k * 1.3) > 0.75;
      if (radio) setArm(p.armR, 32, -6, 145, 0);
      else setArm(p.armR, 22, -14, 110, 0);
      setArm(p.armL, 24, -16, 108, 0);
      p.head[0] -= lookUp * (0.4 + 0.1 * slot);
      this.idle(p, rt, ph);
      return;
    }
    if (name === 'terrace') {
      f.visible = true;
      f.x = 0.6;
      f.z = 168.5;
      f.y = this.heightAt(0.6, 168.5) > 4 ? this.heightAt(0.6, 168.5) : 5.0;
      f.yaw = Math.PI;
      setArm(p.armR, 60, 10, 70, 0);
      setArm(p.armL, 55, -8, 80, 0);
      p.spine[0] += 14 * D;
      return;
    }
    if (name.startsWith('security')) {
      const k = pf.k;
      f.visible = true;
      f.x = -40 + (80 * k) / (SECURITY - 1);
      f.z = 4.3;
      f.y = 0;
      f.yaw = 0.1 * Math.sin(t * 0.13 + k);
      if (k % 2 === 0) {
        setArm(p.armL, 28, -14, 112, 0);
        setArm(p.armR, 24, -16, 120, 0);
      } else {
        setArm(p.armL, -12, 14, 60, 0);
        setArm(p.armR, -12, 14, 60, 0);
      }
      p.head[1] += 0.5 * Math.sin(t * 0.17 + k * 2.1);
      this.idle(p, rt, ph);
      return;
    }
    void i;
  }

  private idle(p: CPose, rt: number, ph: number): void {
    p.rootR[2] += 1.5 * D * Math.sin(rt * 0.6 + ph);
    p.head[1] += 0.25 * Math.sin(rt * 0.21 + ph);
  }

  private write(i: number, pf: Perf, p: CPose, f: PerfFrame): void {
    const o = i * 4;
    this.iPos[o] = f.x;
    this.iPos[o + 1] = f.y;
    this.iPos[o + 2] = f.z;
    this.iPos[o + 3] = f.yaw;
    this.iAttr[o] = f.visible ? pf.height : 0;
    this.iAttr[o + 1] = pf.build;
    this.iAttr[o + 2] = pf.seed;
    this.iAttr[o + 3] = f.glow;
    const P = this.iP;
    P[0][o] = p.off[0]; P[0][o + 1] = p.off[1]; P[0][o + 2] = p.off[2]; P[0][o + 3] = p.cape;
    P[1][o] = p.rootR[0]; P[1][o + 1] = p.rootR[1]; P[1][o + 2] = p.rootR[2]; P[1][o + 3] = p.head[0];
    P[2][o] = p.spine[0]; P[2][o + 1] = p.spine[1]; P[2][o + 2] = p.spine[2]; P[2][o + 3] = p.head[1];
    P[3].set(p.armL, o);
    P[4].set(p.armR, o);
    P[5][o] = p.legL[0]; P[5][o + 1] = p.legL[1]; P[5][o + 2] = p.legL[2]; P[5][o + 3] = p.legR[0];
    P[6][o] = p.legR[1]; P[6][o + 1] = p.legR[2]; P[6][o + 2] = p.shoW; P[6][o + 3] = p.hipW;
  }
}
