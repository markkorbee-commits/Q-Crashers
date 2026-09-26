import * as THREE from 'three';
import { clamp, smoothstep } from '../../core/rng';
import type { BeatInfo } from '../../core/types';
import type { LightEnv } from '../../core/LightEnv';
import { resolveColor } from '../../show/colors';
import type { ResolvedPalette, ShowEngine } from '../../show/ShowEngine';
import type { Cue, SectionKind } from '../../show/ShowTypes';
import { CONTENT_MODE } from '../materials/LedMaterial';
import type { StageLook, StageLookEx } from '../StageLook';

type Mode = StageLook['mode'];
const MODES: Mode[] = ['dormant', 'awake', 'rage', 'frozen', 'ember'];

/** the numeric/colour part of a 'stage.state' cue after applying it on the base look */
interface StateVals {
  mode: Mode;
  eyes: THREE.Color;
  eyesIntensity: number;
  mouth: number;
  wings: number;
  rosettes: THREE.Color;
  windows: number;
  windowColor: THREE.Color;
  /** 0..1 master level of every set emitter (blackouts) */
  master: number;
  /** 0..1 how much of the set's practicals are on (dormant: follows windows / wings; else 1) */
  presence: number;
  /** 0..1 ember mask (only the dragon + inner wings lit) */
  ember: number;
  /** region levels (0..2): castle core, side sections, LED battens, dragon LEDs, wing LEDs */
  castle: number;
  sides: number;
  battens: number;
  dragon: number;
  wingLed: number;
  /** wash rig share on the wings / the dragon (mask isolations) */
  wingWash: number;
  dragonWash: number;
  /** region colour overrides (w = 0..1 weight of the override over the content / section colour) */
  castleCol: THREE.Color;
  castleColW: number;
  sidesCol: THREE.Color;
  sidesColW: number;
  crownCol: THREE.Color;
  crownColW: number;
  wingCol: THREE.Color;
  wingColW: number;
  /** persistent festoon level (all groups) + colour / pattern / rate */
  garlands: number;
  garlandCol: THREE.Color;
  garlandPat: number;
  garlandRate: number;
}

const newVals = (): StateVals => ({
  mode: 'awake',
  eyes: new THREE.Color(),
  eyesIntensity: 0,
  mouth: 0,
  wings: 0,
  rosettes: new THREE.Color(),
  windows: 0,
  windowColor: new THREE.Color(),
  master: 1,
  presence: 1,
  ember: 0,
  castle: 1,
  sides: 1,
  battens: 1,
  dragon: 1,
  wingLed: 1,
  wingWash: 1,
  dragonWash: 1,
  castleCol: new THREE.Color(),
  castleColW: 0,
  sidesCol: new THREE.Color(),
  sidesColW: 0,
  crownCol: new THREE.Color(),
  crownColW: 0,
  wingCol: new THREE.Color(),
  wingColW: 0,
  garlands: 0,
  garlandCol: new THREE.Color(),
  garlandPat: 0,
  garlandRate: 2,
});

/** stage.state `mask` presets: hard isolations applied after the explicit levels */
const MASKS = ['all', 'center', 'crown', 'wings', 'dragon'] as const;
/** garland pattern names (stage.state garlandPattern / stage.garlands pattern) */
const GARLAND_PATTERN: Record<string, number> = { steady: 0, chase: 1, twinkle: 2, strobe: 3 };
/** gate rates in pulses per beat + phase offset (stage.gate rate) */
const GATE_RATE: Record<string, [number, number]> = {
  '32nd': [8, 0],
  '16th': [4, 0],
  '8th': [2, 0],
  beat: [1, 0],
  offbeat: [1, 0.5],
  half: [0.5, 0],
  bar: [0.25, 0],
};
const clamp2 = (x: unknown, def: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(2, x)) : def);

/**
 * Dormant = the "sleeping" set: its practicals follow the state's window / wing levels, so
 * {mode:'dormant', windows:0, wings:0} is a TRUE blackout (show-analysis §10: crystals off, only moon
 * and sky), windows 0.12 reads as the ~30 % lamp row of the opening, windows >= 0.3 is fully present.
 */
function presenceOf(v: StateVals): number {
  return v.mode === 'dormant' ? smoothstep(0.02, 0.3, Math.max(v.windows, v.wings)) : 1;
}

/** what one 'screens.content' cue asks of the set (LED pattern / level / colours / panel content) */
interface ContentTarget {
  mode: number;
  pat: number;
  ledI: number;
  led: THREE.Color;
  led2: THREE.Color;
  col: THREE.Color;
  banner: number;
  skull: number;
  emblem: number;
}
const newTarget = (): ContentTarget => ({
  mode: 0,
  pat: 0,
  ledI: 0,
  led: new THREE.Color(),
  led2: new THREE.Color(),
  col: new THREE.Color(),
  banner: 0,
  skull: 0,
  emblem: 0,
});

/** 'screens.content' pattern names -> extended castle LED pattern (see StageLookEx.ledPatternX) */
const CONTENT_PATTERN: Record<string, number> = { solid: 0, chase: 1, pulse: 2, dots: 3, sparkle: 3, split: 4, fire: 5, stripes: 6, wave: 6, dashes: 7, runes: 7 };

const AMBER = new THREE.Color('#ffae42');
/** tungsten festoon bulbs */
const GARLAND_WARM = new THREE.Color('#ffb466');
const FIRE = new THREE.Color('#ff5a12');
const ICE = new THREE.Color('#a8dcff');
const DEEP_RED = new THREE.Color('#b00008');
/** design bible §5.6: 'ember' = only head + inner wings, red #982D3E */
const EMBER = new THREE.Color('#c8304e');
const WHITE = new THREE.Color(1, 1, 1);
const COLD_BLUE = new THREE.Color('#1e3cff');
const VIOLET = new THREE.Color('#8a2bff');
const RUNE_GOLD = new THREE.Color('#ffb640');
const _c = new THREE.Color();
const _c2 = new THREE.Color();

/**
 * Resolves the stage set look for show time t. Everything is a pure function of (t, beat, cues,
 * palette, env) — no state is accumulated between frames, so seek / pause / restart are exact.
 *
 * Layers (later wins): section defaults -> persistent 'stage.state' (cross-faded over `fade`) ->
 * 'screens.content' (LED content while alive, faded in over its own `fade`, or the `fade` of a
 * stage.state cue starting at the same time, cross-faded from an adjacent content cue) ->
 * transient 'stage.eyes_flash' / 'roar' / 'pulse' -> app.env wash / flash / strobe.
 */
export class LookResolver {
  private states: Cue[] = [];
  /** cumulative rosette angle at the start of each state cue */
  private stateAngle: number[] = [];
  private stateRpm: number[] = [];
  /** 'screens.content' cues (sorted) + per cue: fade-in (s), adjacent previous cue (-1 none), adjacent next cue continues */
  private contents: Cue[] = [];
  private cFade: number[] = [];
  private cPrev: number[] = [];
  private cNext: boolean[] = [];
  private revision = -1;
  private cur = newVals();
  private prev = newVals();
  private active: Cue[] = [];
  private tA = newTarget();
  private tB = newTarget();
  private static readonly DEFAULT_RPM = 1.2;

  constructor(private show: ShowEngine) {}

  private rebuild(): void {
    this.revision = this.show.revision;
    this.states = this.show.all('stage').filter((c) => c.fx === 'state');
    this.stateAngle = [];
    this.stateRpm = [];
    let ang = 0;
    let lastT = 0;
    let lastRpm = LookResolver.DEFAULT_RPM;
    for (const c of this.states) {
      ang += ((lastRpm * Math.PI * 2) / 60) * (c.t - lastT);
      this.stateAngle.push(ang);
      const rpm = typeof c.p.spin === 'number' ? c.p.spin : lastRpm;
      this.stateRpm.push(rpm);
      lastT = c.t;
      lastRpm = rpm;
    }
    // screens content: fades + adjacency (a content cue that directly follows a lit one cross-fades)
    const cs = this.show.all('screens').filter((c) => c.fx === 'content');
    this.contents = cs;
    this.cFade = cs.map((c) => {
      if (typeof c.p.fade === 'number') return Math.max(0, c.p.fade);
      // inherit the fade of a stage.state cue starting at the same moment (e.g. the 5.5 s reveal at 14.0)
      const st = this.states.find((s) => Math.abs(s.t - c.t) < 0.02);
      if (st && typeof st.p.fade === 'number') return Math.max(0, st.p.fade);
      return 0.6;
    });
    const isOn = (c: Cue) => (typeof c.p.mode === 'string' ? c.p.mode : 'color') !== 'off';
    this.cPrev = cs.map((c, i) => {
      for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
        const p = cs[j];
        if (p.t + p.dur >= c.t - 0.05 && p.t < c.t) return isOn(p) ? j : -1;
      }
      return -1;
    });
    this.cNext = cs.map((c, i) => {
      const n = cs[i + 1];
      return !!n && n.t <= c.t + c.dur + 0.05 && isOn(n);
    });
  }

  /** index of the latest state cue with t <= time (-1 when none) */
  private stateIndex(t: number): number {
    return latestIndex(this.states, t);
  }

  /** index of the latest content cue alive at t (-1 when none) */
  private contentIndex(t: number): number {
    const cs = this.contents;
    const last = latestIndex(cs, t);
    for (let i = last; i >= 0 && i >= last - 3; i--) if (t < cs[i].end) return i;
    return -1;
  }

  /** targets of one content cue on top of the section/state LED look (ledI / pat / led / led2 as resolved so far) */
  private contentTarget(c: Cue, pal: ResolvedPalette, ledI: number, pat: number, led: THREE.Color, led2: THREE.Color, energy: number, o: ContentTarget): ContentTarget {
    const mode = typeof c.p.mode === 'string' ? c.p.mode : 'color';
    const col = resolveColor(c.p.color, pal, _c, 'primary');
    o.mode = CONTENT_MODE[mode] ?? 1;
    o.col.copy(col);
    if (!c.p.color) {
      if (mode === 'eye' || mode === 'fire' || mode === 'embers') o.col.copy(FIRE);
      else if (mode === 'ice') o.col.copy(ICE);
      else if (mode === 'runes') o.col.copy(RUNE_GOLD);
    }
    o.pat = pat;
    o.ledI = ledI;
    o.led.copy(led);
    o.led2.copy(led2);
    o.banner = 0.55 + 0.45 * energy;
    o.skull = 0.6 + 0.6 * energy;
    o.emblem = 0.7 + 0.5 * energy;
    switch (mode) {
      case 'off':
        o.ledI = 0;
        break;
      case 'color':
        o.pat = 0;
        o.led.copy(col);
        o.ledI = Math.max(ledI, 0.8);
        break;
      case 'fire':
        o.pat = 5;
        o.led.copy(c.p.color ? col : FIRE);
        o.led2.copy(DEEP_RED);
        o.ledI = Math.max(ledI, 0.9);
        break;
      case 'ice':
        o.pat = 3;
        o.led.copy(c.p.color ? col : ICE);
        o.led2.copy(COLD_BLUE);
        o.ledI = Math.max(ledI, 0.8);
        break;
      case 'runes':
        o.pat = 7;
        o.led.copy(c.p.color ? col : RUNE_GOLD);
        o.ledI = Math.max(ledI, 0.85);
        break;
      case 'logo':
        o.pat = 4;
        o.led.copy(col);
        o.emblem = 4;
        o.ledI = Math.max(ledI, 0.8);
        break;
      case 'title':
        o.pat = 1;
        o.led.copy(c.p.color ? col : WHITE);
        o.ledI = Math.max(ledI, 0.9);
        break;
      case 'eye':
        o.pat = 2;
        o.led.copy(c.p.color ? col : DEEP_RED);
        o.banner = 3.5;
        o.skull = 4;
        o.ledI = Math.max(ledI, 0.8);
        break;
      case 'embers':
        o.pat = 3;
        o.led.copy(c.p.color ? col : FIRE);
        o.led2.copy(DEEP_RED);
        o.ledI = Math.max(ledI * 0.6, 0.5);
        break;
      case 'pulse':
        o.pat = 2;
        o.led.copy(col);
        o.ledI = Math.max(ledI, 0.9);
        break;
    }
    // optional second colour + pixel pattern of a 'color' look (stripes / chase / dashes / split / dots)
    if (mode !== 'off') {
      if (typeof c.p.color2 === 'string') resolveColor(c.p.color2, pal, o.led2, 'secondary');
      if (typeof c.p.pattern === 'string' && CONTENT_PATTERN[c.p.pattern] !== undefined) o.pat = CONTENT_PATTERN[c.p.pattern];
    }
    return o;
  }

  resolve(t: number, beat: BeatInfo, pal: ResolvedPalette, env: LightEnv, out: StageLookEx): StageLookEx {
    const show = this.show;
    if (show.revision !== this.revision) this.rebuild();
    const sec = show.section(t);
    const kind: SectionKind = sec?.kind ?? 'drop';
    const energy = clamp(sec ? sec.energy : beat.energy, 0, 1);
    out.energy = energy;

    // ---- 1. section defaults -------------------------------------------------------------------
    const base = this.prev; // reuse as scratch for the base values
    base.mode = kind === 'silence' ? 'dormant' : kind === 'intro' || kind === 'orchestral' ? 'dormant' : 'awake';
    base.eyes.copy(pal.secondary).lerp(FIRE, 0.4);
    base.eyesIntensity = 0.35 + 0.65 * energy;
    base.mouth = 0.2 + 0.6 * energy;
    base.wings = 0.35 + 0.65 * energy;
    base.rosettes.copy(pal.accent).lerp(VIOLET, 0.55);
    base.windows = 0.55 + 0.3 * energy;
    base.windowColor.copy(AMBER);
    base.master = kind === 'silence' ? 0.03 : 1;
    base.presence = presenceOf(base);
    base.ember = 0;
    base.castle = 1;
    base.sides = 1;
    base.battens = 1;
    base.dragon = 1;
    base.wingLed = 1;
    base.wingWash = 1;
    base.dragonWash = 1;
    base.castleColW = 0;
    base.sidesColW = 0;
    base.crownColW = 0;
    base.wingColW = 0;
    base.garlands = 0;
    base.garlandCol.copy(GARLAND_WARM);
    base.garlandPat = 0;
    base.garlandRate = 2;

    // ---- 2. persistent state cue with cross-fade ---------------------------------------------------
    const si = this.stateIndex(t);
    let rpm = LookResolver.DEFAULT_RPM;
    let angle = ((rpm * Math.PI * 2) / 60) * t;
    const cur = this.cur;
    copyVals(cur, base);
    if (si >= 0) {
      const cue = this.states[si];
      // previous state (or base) as the fade origin
      const from = newScratch;
      copyVals(from, base);
      if (si > 0) this.applyState(this.states[si - 1], pal, from);
      this.applyState(cue, pal, cur);
      const fade = typeof cue.p.fade === 'number' ? Math.max(0, cue.p.fade) : 1.5;
      const k = fade <= 0 ? 1 : smoothstep(0, 1, (t - cue.t) / fade);
      if (k < 1) {
        // a look fading in from (or out to) a blackout keeps its region isolation for the whole fade
        // (the dark side shows nothing, so e.g. a dragon-only fade-in never flashes the wings)
        if (from.master * from.presence < 0.02) copyIsolation(from, cur);
        else if (cur.master * cur.presence < 0.02) copyIsolation(cur, from);
        lerpVals(from, cur, k, cur);
      }
      rpm = this.stateRpm[si];
      angle = this.stateAngle[si] + ((rpm * Math.PI * 2) / 60) * (t - cue.t);
    }
    out.mode = cur.mode;
    out.eyes.copy(cur.eyes);
    out.eyesIntensity = cur.eyesIntensity;
    out.mouth = cur.mouth;
    out.jaw = 0.55 + 0.25 * energy;
    out.wings = cur.wings;
    out.rosettes.copy(cur.rosettes);
    out.rosetteAngle = angle % (Math.PI * 2);
    out.windows = cur.windows;
    out.windowColor.copy(cur.windowColor);
    out.master = cur.master;
    out.ember = cur.ember;
    out.emit = cur.master * cur.presence;
    out.castleGain = cur.castle;
    out.sidesGain = cur.sides;
    out.battenGain = cur.battens;
    out.dragonGain = cur.dragon;
    out.wingGain = cur.wingLed;
    out.wingWash = cur.wingWash;
    out.dragonWash = cur.dragonWash;
    out.garland.set(cur.garlands, cur.garlands, cur.garlands);
    out.garlandColor.copy(cur.garlandCol);
    out.garlandPattern = cur.garlandPat;
    out.garlandRate = cur.garlandRate;

    // ---- LED defaults from the section + mode ------------------------------------------------------
    out.led.copy(pal.primary);
    out.led2.copy(pal.secondary);
    let pat = 0;
    let ledI = 0.35 + 0.65 * energy;
    switch (kind) {
      case 'build':
        pat = 3;
        break;
      case 'drop':
      case 'climax':
        pat = 1;
        break;
      case 'vocal':
        pat = 6;
        break;
      case 'anticlimax':
        pat = 2;
        break;
      case 'silence':
        ledI = 0;
        break;
      default:
        pat = 0;
        ledI *= 0.7;
    }
    let winMode = 0;
    switch (out.mode) {
      case 'dormant':
        ledI *= 0.35;
        pat = 0;
        break;
      case 'rage':
        winMode = 1;
        pat = beat.hasKick ? 1 : 5;
        out.led.copy(pal.primary).lerp(FIRE, 0.35);
        break;
      case 'frozen':
        winMode = 2;
        pat = 3;
        out.led.copy(ICE);
        out.led2.copy(COLD_BLUE);
        break;
      case 'ember':
        winMode = 3;
        pat = 5;
        ledI *= 0.45;
        out.led.copy(EMBER);
        out.led2.copy(DEEP_RED).multiplyScalar(0.5);
        break;
    }

    // ---- 3. screens content (alive cues only; latest wins, faded / cross-faded) --------------------
    out.bannerGlow = 0.55 + 0.45 * energy;
    out.skullGlow = 0.6 + 0.6 * energy;
    out.emblemGlow = 0.7 + 0.5 * energy;
    out.content = 0;
    out.contentMix = 0;
    const ci = this.contentIndex(t);
    if (ci >= 0) {
      const c = this.contents[ci];
      const lt = t - c.t;
      const fade = this.cFade[ci];
      const k = fade <= 0 ? 1 : smoothstep(0, fade, lt);
      const tail = this.cNext[ci] ? 1 : 1 - smoothstep(c.dur - 0.6, c.dur, lt);
      const A = this.contentTarget(c, pal, ledI, pat, out.led, out.led2, energy, this.tA);
      const pi = this.cPrev[ci];
      let w: number; // weight of the content look over the section/state look
      let mixA: number;
      if (pi >= 0) {
        // cross-fade from the previous (lit) content cue: the panels stay on, colours blend
        const B = this.contentTarget(this.contents[pi], pal, ledI, pat, out.led, out.led2, energy, this.tB);
        blendTarget(B, A, k, A);
        w = tail;
        mixA = A.mode === 0 ? (1 - k) * tail : tail;
        if (A.mode === 0) A.mode = B.mode;
      } else {
        w = k * tail;
        mixA = A.mode === 0 ? 0 : k * tail;
      }
      out.content = A.mode;
      out.contentMix = mixA;
      out.contentColor.copy(A.col);
      out.led.lerp(A.led, w);
      out.led2.lerp(A.led2, w);
      out.bannerGlow += (A.banner - out.bannerGlow) * w;
      out.skullGlow += (A.skull - out.skullGlow) * w;
      out.emblemGlow += (A.emblem - out.emblemGlow) * w;
      pat = w > 0.5 ? A.pat : pat;
      ledI = ledI + (A.ledI - ledI) * w;
    }
    // ember: the dragon + inner wings glow on their own even when the pixel content is off
    if (cur.ember > 0) ledI += (Math.max(ledI, 0.35 + 0.65 * cur.wings) - ledI) * cur.ember;
    // fire looks: the backlit banners flicker (deterministic in t)
    if (out.mode === 'rage' || pat === 5) out.bannerGlow *= 0.8 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1) + 0.1 * Math.sin(t * 17.9);
    out.ledPatternX = pat;
    out.ledPattern = pat <= 4 ? pat : pat === 5 ? 3 : pat === 6 ? 1 : 2;
    out.ledIntensity = ledI;
    out.ledPhase = beat.bar * 0.5 - Math.floor(beat.bar * 0.5);
    out.windowMode = winMode;

    // ---- 4. transients -----------------------------------------------------------------------------
    let pulse = 0;
    out.pulseColor.setRGB(0, 0, 0);
    let gCastle = 1;
    let gCrown = 1;
    let gGarl = 1;
    let garlBest = cur.garlands;
    const act = show.active('stage', t, this.active);
    for (const c of act) {
      const lt = t - c.t;
      const e = smoothstep(0, 0.08, lt) * (1 - smoothstep(c.dur * 0.4, c.dur, lt));
      if (c.fx === 'garlands') {
        // warm festoon bulb strings: level per target group, own attack / release
        if (lt >= c.dur) continue;
        const att = typeof c.p.fade === 'number' ? Math.max(0, c.p.fade) : 0.08;
        const rel = typeof c.p.release === 'number' ? Math.max(0, c.p.release) : Math.min(0.3, c.dur * 0.4);
        const env = (att <= 0 ? 1 : smoothstep(0, att, lt)) * (rel <= 0 ? 1 : 1 - smoothstep(c.dur - rel, c.dur, lt));
        const lvl = clamp2(c.p.level, 1) * env;
        const tg = typeof c.p.target === 'string' ? c.p.target : 'all';
        const G = out.garland;
        if (tg === 'all' || tg === 'wings') G.x = Math.max(G.x, lvl);
        if (tg === 'all' || tg === 'castle') G.y = Math.max(G.y, lvl);
        if (tg === 'all' || tg === 'sides') G.z = Math.max(G.z, lvl);
        if (lvl >= garlBest) {
          garlBest = lvl;
          if (c.p.color !== undefined) resolveColor(c.p.color, pal, out.garlandColor, 'accent');
          if (typeof c.p.pattern === 'string' && GARLAND_PATTERN[c.p.pattern] !== undefined) out.garlandPattern = GARLAND_PATTERN[c.p.pattern];
          if (typeof c.p.rate === 'number' && c.p.rate > 0) out.garlandRate = c.p.rate;
        }
        continue;
      }
      if (c.fx === 'gate') {
        // LED gate / stutter on the beat grid (hard on/off, deterministic in the beat position)
        if (lt >= c.dur) continue;
        let rate = 4;
        let ph = 0;
        if (typeof c.p.rate === 'string' && GATE_RATE[c.p.rate]) [rate, ph] = GATE_RATE[c.p.rate];
        else if (typeof c.p.rate === 'number' && c.p.rate > 0) rate = c.p.rate;
        if (typeof c.p.phase === 'number') ph += c.p.phase;
        const duty = typeof c.p.duty === 'number' ? clamp(c.p.duty, 0.02, 0.98) : 0.5;
        const depth = typeof c.p.depth === 'number' ? clamp(c.p.depth, 0, 1) : 1;
        const x = beat.beat * rate + ph;
        const on = x - Math.floor(x) < duty ? 1 : 0;
        const g = 1 - depth * (1 - on);
        const tg = typeof c.p.target === 'string' ? c.p.target : 'all';
        if (tg === 'all' || tg === 'castle') gCastle *= g;
        if (tg === 'all' || tg === 'crown') gCrown *= g;
        if (tg === 'all' || tg === 'garlands') gGarl *= g;
        continue;
      }
      if (c.fx === 'eyes_flash') {
        out.eyesIntensity += 3 * e;
        if (c.p.color) out.eyes.lerp(resolveColor(c.p.color, pal, _c2), e);
      } else if (c.fx === 'roar') {
        out.mouth = Math.max(out.mouth, e);
        out.jaw = Math.max(out.jaw, 0.6 + 0.4 * e);
        out.eyesIntensity += 1.5 * e;
        out.ledIntensity += 0.5 * e;
      } else if (c.fx === 'pulse') {
        const k = (beat.hasKick ? beat.kick : Math.exp(-beat.phase * 5)) * smoothstep(0, 0.05, lt) * (1 - smoothstep(c.dur - 0.2, c.dur, lt));
        pulse = Math.max(pulse, k);
        resolveColor(c.p.color, pal, _c2, 'accent');
        out.pulseColor.copy(_c2).multiplyScalar(k);
      }
    }
    // energetic sections pump the LEDs on the kick
    if (beat.hasKick && (kind === 'drop' || kind === 'climax')) out.ledIntensity *= 0.8 + 0.35 * beat.kick;
    out.pulse = pulse;
    // gates fold into the region levels (castle / sides / crown / festoons)
    out.gateCastle = gCastle;
    out.gateCrown = gCrown;
    out.castleGain *= gCastle;
    out.sidesGain *= gCastle;
    out.dragonGain *= gCrown;
    out.wingGain *= gCrown;
    out.wings *= gCrown;
    out.garland.multiplyScalar(gGarl);

    // ---- region colours: the castle / side sections / crown can each take their own LED colour -------
    // castle core: content / section colour with the state's castleColor override
    const cw = cur.castleColW;
    out.castleLed.copy(out.led).lerp(cur.castleCol, cw);
    out.castleLed2.copy(out.led2).lerp(_c.copy(cur.castleCol).multiplyScalar(0.55), cw);
    const sw = cur.sidesColW;
    out.sidesLed.copy(out.castleLed).lerp(cur.sidesCol, sw);
    out.sidesLed2.copy(out.castleLed2).lerp(_c.copy(cur.sidesCol).multiplyScalar(0.55), sw);
    out.castleFloodTint = 0.5 * cw;
    out.sidesFloodTint = Math.max(0.5 * cw, sw);

    // ---- colours of the castle-only emitters --------------------------------------------------------
    // crystal lanterns on the ramparts / arm posts: the "side sections" colour of the look (the show's
    // windowColor: blue-white in Winter, cyan-white in Sacred Flame ...), tinted by the mode
    out.lantern.copy(out.windowColor);
    if (out.mode === 'frozen') out.lantern.lerp(ICE, 0.6);
    else if (out.mode === 'rage') out.lantern.lerp(FIRE, 0.4);
    else out.lantern.lerp(out.rosettes, 0.15);
    switch (out.mode) {
      case 'rage':
        out.arcade.copy(FIRE).lerp(pal.primary, 0.3);
        break;
      case 'frozen':
        out.arcade.copy(ICE).lerp(COLD_BLUE, 0.4);
        break;
      case 'ember':
        out.arcade.copy(DEEP_RED).multiplyScalar(0.6);
        break;
      case 'dormant':
        out.arcade.copy(COLD_BLUE).lerp(VIOLET, 0.4).multiplyScalar(0.7);
        break;
      default:
        out.arcade.copy(pal.secondary).lerp(COLD_BLUE, 0.35).lerp(out.castleLed2, 0.3);
    }
    out.portal.copy(pal.primary).lerp(out.eyes, 0.35);
    // front-line fixture lenses: coloured dots in the side-section colour (the "row of small blue /
    // cyan lamp dots along the stage front" of the footage), a little white in the core
    out.lamp.copy(WHITE).lerp(out.windowColor, 0.6).lerp(out.castleLed, 0.15);
    switch (out.mode) {
      case 'rage':
      case 'ember':
        out.accent.copy(out.castleLed).lerp(FIRE, 0.5);
        break;
      case 'frozen':
        out.accent.copy(ICE);
        break;
      default:
        out.accent.copy(pal.accent).lerp(ICE, 0.35).lerp(out.castleLed, 0.15);
    }
    // a castle colour override also takes the white pilaster battens (a monochrome castle look)
    if (cw > 0) out.accent.lerp(_c.copy(cur.castleCol).lerp(WHITE, 0.2), cw);
    out.sidesAccent.copy(out.accent);
    if (sw > 0) out.sidesAccent.lerp(_c.copy(cur.sidesCol).lerp(WHITE, 0.2), sw);

    // crown: crownColor tints the dragon + wings, wingColor the wings only
    if (cur.crownColW > 0) {
      out.led.lerp(cur.crownCol, cur.crownColW);
      out.led2.lerp(_c.copy(cur.crownCol).multiplyScalar(0.55), cur.crownColW);
    }
    out.wingLed.copy(out.led).lerp(cur.wingCol, cur.wingColW);
    out.wingLed2.copy(out.led2).lerp(_c.copy(cur.wingCol).multiplyScalar(0.55), cur.wingColW);

    // ---- 5. app.env: wash, flash, strobe --------------------------------------------------------------
    out.wash.copy(env.stageWashColor);
    out.washIntensity = env.stageWashIntensity;
    const fi = env.flashIntensity;
    out.flash.copy(env.flashColor);
    if (fi > 3) out.flash.multiplyScalar(3 / fi);
    out.strobe = clamp(env.strobe, 0, 1);
    out.pulse = Math.max(out.pulse, out.strobe * 0.6);
    // master level (blackouts) scales the shared fields the crown reads as well; the pixel LEDs also
    // follow the dormant presence (a dormant state with windows / wings at 0 is black)
    const M = out.master;
    if (M < 1) {
      out.eyesIntensity *= M;
      out.mouth *= M;
      out.wings *= M;
      out.windows *= M;
    }
    out.ledIntensity *= out.emit;
    return out;
  }

  /** apply one state cue's params on top of `v` (in place) */
  private applyState(c: Cue, pal: ResolvedPalette, v: StateVals): void {
    const p = c.p;
    if (typeof p.mode === 'string' && (MODES as string[]).includes(p.mode)) v.mode = p.mode as Mode;
    // mode presets
    switch (v.mode) {
      case 'dormant':
        v.eyesIntensity = 0.25;
        v.mouth = 0.1;
        v.wings = 0.25;
        v.windows = 0.4;
        v.windowColor.copy(AMBER);
        break;
      case 'rage':
        v.eyes.copy(FIRE);
        v.eyesIntensity = 1.4;
        v.mouth = 0.85;
        v.wings = 1;
        v.windows = 0.95;
        v.windowColor.copy(FIRE);
        break;
      case 'frozen':
        v.eyes.copy(ICE);
        v.eyesIntensity = 0.9;
        v.mouth = 0.4;
        v.wings = 0.8;
        v.windows = 0.8;
        v.windowColor.copy(ICE);
        v.rosettes.copy(ICE);
        break;
      case 'ember':
        v.eyes.copy(DEEP_RED);
        v.eyesIntensity = 0.7;
        v.mouth = 0.35;
        v.wings = 0.3;
        v.windows = 0.35;
        v.windowColor.copy(DEEP_RED);
        v.rosettes.copy(EMBER);
        break;
      default:
        break;
    }
    if (p.eyes !== undefined) resolveColor(p.eyes, pal, v.eyes, 'secondary');
    if (typeof p.eyesIntensity === 'number') v.eyesIntensity = p.eyesIntensity;
    if (typeof p.mouth === 'number') v.mouth = p.mouth;
    if (typeof p.wings === 'number') v.wings = p.wings;
    if (p.rosettes !== undefined) resolveColor(p.rosettes, pal, v.rosettes, 'accent');
    if (typeof p.windows === 'number') v.windows = p.windows;
    if (p.windowColor !== undefined) resolveColor(p.windowColor, pal, v.windowColor, 'secondary');
    // extension: 'master' (0..1) dims every set emitter, e.g. for blackouts
    if (typeof p.master === 'number') v.master = Math.max(0, Math.min(1, p.master));
    // ---- region isolation (docs/show-format-ext/stage.md) -------------------------------------------
    v.castle = clamp2(p.castle, 1);
    // the side sections follow the castle level unless they get their own
    v.sides = clamp2(p.sides, v.castle);
    v.battens = clamp2(p.battens, 1);
    v.dragon = clamp2(p.dragon, 1);
    v.wingLed = clamp2(p.wingLed, 1);
    v.wingWash = 1;
    v.dragonWash = 1;
    v.castleColW = colorOverride(p.castleColor, pal, v.castleCol);
    v.sidesColW = colorOverride(p.sidesColor, pal, v.sidesCol);
    v.crownColW = colorOverride(p.crownColor, pal, v.crownCol);
    v.wingColW = colorOverride(p.wingColor, pal, v.wingCol);
    // hard isolations, applied over the explicit levels
    const mask = typeof p.mask === 'string' && (MASKS as readonly string[]).includes(p.mask) ? p.mask : 'all';
    switch (mask) {
      case 'center':
        v.sides = 0;
        break;
      case 'crown':
        v.castle = 0;
        v.sides = 0;
        break;
      case 'wings':
        v.castle = 0;
        v.sides = 0;
        v.dragon = 0;
        v.dragonWash = 0.25;
        break;
      case 'dragon':
        v.castle = 0;
        v.sides = 0;
        v.wingLed = 0;
        v.wings = 0;
        v.wingWash = 0;
        v.rosettes.setRGB(0, 0, 0);
        break;
    }
    // warm festoon bulb strings (persistent level; stage.garlands cues add flashes / strobes on top)
    v.garlands = clamp2(p.garlands, 0);
    if (p.garlandColor !== undefined) resolveColor(p.garlandColor, pal, v.garlandCol, 'accent');
    if (typeof p.garlandPattern === 'string' && GARLAND_PATTERN[p.garlandPattern] !== undefined) v.garlandPat = GARLAND_PATTERN[p.garlandPattern];
    if (typeof p.garlandRate === 'number' && p.garlandRate > 0) v.garlandRate = p.garlandRate;
    v.presence = presenceOf(v);
    v.ember = v.mode === 'ember' ? 1 : 0;
  }
}

const newScratch = newVals();

/** index of the latest cue with c.t <= t in a start-sorted list (-1 when none) */
function latestIndex(s: Cue[], t: number): number {
  let lo = 0,
    hi = s.length - 1,
    best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (s[mid].t <= t) {
      best = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return best;
}

/** out = a -> b by k (pattern / content mode switch half-way); out may alias b */
function blendTarget(a: ContentTarget, b: ContentTarget, k: number, out: ContentTarget): void {
  out.mode = k < 0.5 && a.mode !== 0 ? a.mode : b.mode;
  out.pat = k < 0.5 ? a.pat : b.pat;
  out.ledI = a.ledI + (b.ledI - a.ledI) * k;
  out.led.lerpColors(a.led, b.led, k);
  out.led2.lerpColors(a.led2, b.led2, k);
  // fading out to 'off': the panels keep showing the outgoing content colour while they dissolve
  if (b.mode === 0) out.col.copy(a.col);
  else out.col.lerpColors(a.col, b.col, k);
  out.banner = a.banner + (b.banner - a.banner) * k;
  out.skull = a.skull + (b.skull - a.skull) * k;
  out.emblem = a.emblem + (b.emblem - a.emblem) * k;
}

function copyVals(dst: StateVals, src: StateVals): void {
  dst.mode = src.mode;
  dst.eyes.copy(src.eyes);
  dst.eyesIntensity = src.eyesIntensity;
  dst.mouth = src.mouth;
  dst.wings = src.wings;
  dst.rosettes.copy(src.rosettes);
  dst.windows = src.windows;
  dst.windowColor.copy(src.windowColor);
  dst.master = src.master;
  dst.presence = src.presence;
  dst.ember = src.ember;
  dst.castle = src.castle;
  dst.sides = src.sides;
  dst.battens = src.battens;
  dst.dragon = src.dragon;
  dst.wingLed = src.wingLed;
  dst.wingWash = src.wingWash;
  dst.dragonWash = src.dragonWash;
  dst.castleCol.copy(src.castleCol);
  dst.castleColW = src.castleColW;
  dst.sidesCol.copy(src.sidesCol);
  dst.sidesColW = src.sidesColW;
  dst.crownCol.copy(src.crownCol);
  dst.crownColW = src.crownColW;
  dst.wingCol.copy(src.wingCol);
  dst.wingColW = src.wingColW;
  dst.garlands = src.garlands;
  dst.garlandCol.copy(src.garlandCol);
  dst.garlandPat = src.garlandPat;
  dst.garlandRate = src.garlandRate;
}

/** region isolation part of a state (levels, wash shares, colour overrides): dst <- src */
function copyIsolation(dst: StateVals, src: StateVals): void {
  dst.castle = src.castle;
  dst.sides = src.sides;
  dst.battens = src.battens;
  dst.dragon = src.dragon;
  dst.wingLed = src.wingLed;
  dst.wingWash = src.wingWash;
  dst.dragonWash = src.dragonWash;
  dst.castleCol.copy(src.castleCol);
  dst.castleColW = src.castleColW;
  dst.sidesCol.copy(src.sidesCol);
  dst.sidesColW = src.sidesColW;
  dst.crownCol.copy(src.crownCol);
  dst.crownColW = src.crownColW;
  dst.wingCol.copy(src.wingCol);
  dst.wingColW = src.wingColW;
}

/** resolve an optional colour override into `out`; returns its weight (1 when given, else 0) */
function colorOverride(v: unknown, pal: ResolvedPalette, out: THREE.Color): number {
  if (v === undefined || v === null || v === '') return 0;
  resolveColor(v, pal, out, 'primary');
  return 1;
}

/** override colour a -> b: a colour only fades in / out through its weight (never from black) */
function lerpOverride(ca: THREE.Color, wa: number, cb: THREE.Color, wb: number, k: number, out: THREE.Color): number {
  if (wa > 0 && wb > 0) out.lerpColors(ca, cb, k);
  else if (wb > 0) out.copy(cb);
  else out.copy(ca);
  return wa + (wb - wa) * k;
}

const lerpN = (x: number, y: number, k: number): number => x + (y - x) * k;

/** out = a -> b by k; out may alias b (colours use lerpColors, which is alias safe for its 2nd operand) */
function lerpVals(a: StateVals, b: StateVals, k: number, out: StateVals): void {
  out.mode = k < 0.5 ? a.mode : b.mode;
  out.eyes.lerpColors(a.eyes, b.eyes, k);
  out.eyesIntensity = lerpN(a.eyesIntensity, b.eyesIntensity, k);
  out.mouth = lerpN(a.mouth, b.mouth, k);
  out.wings = lerpN(a.wings, b.wings, k);
  out.rosettes.lerpColors(a.rosettes, b.rosettes, k);
  out.windows = lerpN(a.windows, b.windows, k);
  out.windowColor.lerpColors(a.windowColor, b.windowColor, k);
  out.master = lerpN(a.master, b.master, k);
  out.presence = lerpN(a.presence, b.presence, k);
  out.ember = lerpN(a.ember, b.ember, k);
  out.castle = lerpN(a.castle, b.castle, k);
  out.sides = lerpN(a.sides, b.sides, k);
  out.battens = lerpN(a.battens, b.battens, k);
  out.dragon = lerpN(a.dragon, b.dragon, k);
  out.wingLed = lerpN(a.wingLed, b.wingLed, k);
  out.wingWash = lerpN(a.wingWash, b.wingWash, k);
  out.dragonWash = lerpN(a.dragonWash, b.dragonWash, k);
  out.castleColW = lerpOverride(a.castleCol, a.castleColW, b.castleCol, b.castleColW, k, out.castleCol);
  out.sidesColW = lerpOverride(a.sidesCol, a.sidesColW, b.sidesCol, b.sidesColW, k, out.sidesCol);
  out.crownColW = lerpOverride(a.crownCol, a.crownColW, b.crownCol, b.crownColW, k, out.crownCol);
  out.wingColW = lerpOverride(a.wingCol, a.wingColW, b.wingCol, b.wingColW, k, out.wingCol);
  out.garlands = lerpN(a.garlands, b.garlands, k);
  out.garlandCol.lerpColors(a.garlandCol, b.garlandCol, k);
  out.garlandPat = k < 0.5 ? a.garlandPat : b.garlandPat;
  out.garlandRate = k < 0.5 ? a.garlandRate : b.garlandRate;
}
