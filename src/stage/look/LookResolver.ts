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
});

const AMBER = new THREE.Color('#ffae42');
const FIRE = new THREE.Color('#ff5a12');
const ICE = new THREE.Color('#a8dcff');
const DEEP_RED = new THREE.Color('#b00008');
const WHITE = new THREE.Color(1, 1, 1);
const COLD_BLUE = new THREE.Color('#1e3cff');
const VIOLET = new THREE.Color('#8a2bff');
const _c = new THREE.Color();
const _c2 = new THREE.Color();

/**
 * Resolves the stage set look for show time t. Everything is a pure function of (t, beat, cues,
 * palette, env) — no state is accumulated between frames, so seek / pause / restart are exact.
 *
 * Layers (later wins): section defaults -> persistent 'stage.state' (cross-faded over `fade`) ->
 * 'screens.content' (LED content while alive) -> transient 'stage.eyes_flash' / 'roar' / 'pulse' ->
 * app.env wash / flash / strobe.
 */
export class LookResolver {
  private states: Cue[] = [];
  /** cumulative rosette angle at the start of each state cue */
  private stateAngle: number[] = [];
  private stateRpm: number[] = [];
  private revision = -1;
  private cur = newVals();
  private prev = newVals();
  private active: Cue[] = [];
  private screens: Cue[] = [];
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
  }

  /** index of the latest state cue with t <= time (-1 when none) */
  private stateIndex(t: number): number {
    const s = this.states;
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
      if (k < 1) lerpVals(from, cur, k, cur);
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
        out.led.copy(DEEP_RED);
        out.led2.copy(FIRE).multiplyScalar(0.4);
        break;
    }

    // ---- 3. screens content (alive cues only; latest wins) -----------------------------------------
    out.bannerGlow = 0.55 + 0.45 * energy;
    out.skullGlow = 0.6 + 0.6 * energy;
    out.emblemGlow = 0.7 + 0.5 * energy;
    out.content = 0;
    out.contentMix = 0;
    const scr = show.active('screens', t, this.screens);
    for (let i = scr.length - 1; i >= 0; i--) {
      const c = scr[i];
      if (c.fx !== 'content') continue;
      const env01 = smoothstep(0, 0.3, t - c.t) * (1 - smoothstep(c.dur - 0.5, c.dur, t - c.t));
      const mode = typeof c.p.mode === 'string' ? c.p.mode : 'color';
      const col = resolveColor(c.p.color, pal, _c, 'primary');
      out.content = CONTENT_MODE[mode] ?? 1;
      // panels dissolve in over ~0.6 s and out over the last 0.6 s
      out.contentMix = smoothstep(0, 0.6, t - c.t) * (1 - smoothstep(c.dur - 0.6, c.dur, t - c.t));
      out.contentColor.copy(col);
      if (!c.p.color) {
        if (mode === 'eye' || mode === 'fire' || mode === 'embers') out.contentColor.copy(FIRE);
        else if (mode === 'ice') out.contentColor.copy(ICE);
        else if (mode === 'runes') out.contentColor.set('#ffb640');
      }
      let cPat = pat;
      let cI = ledI;
      switch (mode) {
        case 'off':
          cI = 0;
          break;
        case 'color':
          cPat = 0;
          out.led.copy(col);
          cI = Math.max(ledI, 0.8);
          break;
        case 'fire':
          cPat = 5;
          out.led.copy(c.p.color ? col : FIRE);
          out.led2.copy(DEEP_RED);
          cI = Math.max(ledI, 0.9);
          break;
        case 'ice':
          cPat = 3;
          out.led.copy(c.p.color ? col : ICE);
          out.led2.copy(COLD_BLUE);
          cI = Math.max(ledI, 0.8);
          break;
        case 'runes':
          cPat = 7;
          out.led.copy(c.p.color ? col : _c2.set('#ffb640'));
          cI = Math.max(ledI, 0.85);
          break;
        case 'logo':
          cPat = 4;
          out.led.copy(col);
          out.emblemGlow = 1 + 3 * env01;
          cI = Math.max(ledI, 0.8);
          break;
        case 'title':
          cPat = 1;
          out.led.copy(c.p.color ? col : WHITE);
          cI = Math.max(ledI, 0.9);
          break;
        case 'eye':
          cPat = 2;
          out.led.copy(c.p.color ? col : DEEP_RED);
          out.bannerGlow = 1 + 2.5 * env01;
          out.skullGlow = 1 + 3 * env01;
          cI = Math.max(ledI, 0.8);
          break;
        case 'embers':
          cPat = 3;
          out.led.copy(c.p.color ? col : FIRE);
          out.led2.copy(DEEP_RED);
          cI = Math.max(ledI * 0.6, 0.5);
          break;
        case 'pulse':
          cPat = 2;
          out.led.copy(col);
          cI = Math.max(ledI, 0.9);
          break;
      }
      pat = env01 > 0.5 ? cPat : pat;
      ledI = ledI + (cI - ledI) * env01;
      break;
    }
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
    const act = show.active('stage', t, this.active);
    for (const c of act) {
      const lt = t - c.t;
      const e = smoothstep(0, 0.08, lt) * (1 - smoothstep(c.dur * 0.4, c.dur, lt));
      if (c.fx === 'eyes_flash') {
        out.eyesIntensity += 3 * e;
        if (c.p.color) out.eyes.lerp(resolveColor(c.p.color, pal, _c), e);
      } else if (c.fx === 'roar') {
        out.mouth = Math.max(out.mouth, e);
        out.jaw = Math.max(out.jaw, 0.6 + 0.4 * e);
        out.eyesIntensity += 1.5 * e;
        out.ledIntensity += 0.5 * e;
      } else if (c.fx === 'pulse') {
        const k = (beat.hasKick ? beat.kick : Math.exp(-beat.phase * 5)) * smoothstep(0, 0.05, lt) * (1 - smoothstep(c.dur - 0.2, c.dur, lt));
        pulse = Math.max(pulse, k);
        resolveColor(c.p.color, pal, _c, 'accent');
        out.pulseColor.copy(_c).multiplyScalar(k);
      }
    }
    // energetic sections pump the LEDs on the kick
    if (beat.hasKick && (kind === 'drop' || kind === 'climax')) out.ledIntensity *= 0.8 + 0.35 * beat.kick;
    out.pulse = pulse;

    // ---- colours of the castle-only emitters --------------------------------------------------------
    out.lantern.copy(out.mode === 'frozen' ? ICE : out.mode === 'rage' || out.mode === 'ember' ? FIRE : VIOLET).lerp(out.rosettes, 0.35);
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
        out.arcade.copy(pal.secondary).lerp(COLD_BLUE, 0.35).lerp(out.led2, 0.3);
    }
    out.portal.copy(pal.primary).lerp(out.eyes, 0.35);
    out.lamp.copy(WHITE).lerp(out.led, 0.25);
    switch (out.mode) {
      case 'rage':
      case 'ember':
        out.accent.copy(out.led).lerp(FIRE, 0.5);
        break;
      case 'frozen':
        out.accent.copy(ICE);
        break;
      default:
        out.accent.copy(pal.accent).lerp(ICE, 0.35).lerp(out.led, 0.15);
    }

    // ---- 5. app.env: wash, flash, strobe --------------------------------------------------------------
    out.wash.copy(env.stageWashColor);
    out.washIntensity = env.stageWashIntensity;
    const fi = env.flashIntensity;
    out.flash.copy(env.flashColor);
    if (fi > 3) out.flash.multiplyScalar(3 / fi);
    out.strobe = clamp(env.strobe, 0, 1);
    out.pulse = Math.max(out.pulse, out.strobe * 0.6);
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
  }
}

const newScratch = newVals();

function copyVals(dst: StateVals, src: StateVals): void {
  dst.mode = src.mode;
  dst.eyes.copy(src.eyes);
  dst.eyesIntensity = src.eyesIntensity;
  dst.mouth = src.mouth;
  dst.wings = src.wings;
  dst.rosettes.copy(src.rosettes);
  dst.windows = src.windows;
  dst.windowColor.copy(src.windowColor);
}

function lerpVals(a: StateVals, b: StateVals, k: number, out: StateVals): void {
  out.mode = k < 0.5 ? a.mode : b.mode;
  out.eyes.copy(a.eyes).lerp(b.eyes, k);
  out.eyesIntensity = a.eyesIntensity + (b.eyesIntensity - a.eyesIntensity) * k;
  out.mouth = a.mouth + (b.mouth - a.mouth) * k;
  out.wings = a.wings + (b.wings - a.wings) * k;
  out.rosettes.copy(a.rosettes).lerp(b.rosettes, k);
  out.windows = a.windows + (b.windows - a.windows) * k;
  out.windowColor.copy(a.windowColor).lerp(b.windowColor, k);
}
