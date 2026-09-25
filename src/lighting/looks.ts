import type { BeatInfo } from '../core/types';
import {
  P_AMBIENT,
  P_AUDIENCE,
  P_BALLYHOO,
  P_CIRCLE,
  P_CROSSHATCH,
  P_DARK,
  P_FAN,
  P_PULSE,
  P_SKY,
  P_STILL,
  P_SWEEP,
  P_TILT_WAVE,
  TAN_NARROW,
  type LightCue,
} from './cues';
import {
  G_FIELD,
  G_FLOOR,
  G_TOWERS,
  T_ALL,
  T_ARM,
  T_ARMEND,
  T_DECK,
  T_DRAGON,
  T_FOH,
  T_PA,
  T_PILLAR,
  T_PLINTH,
  T_ROOF,
  T_SIDE,
  T_SIDEFLOOR,
  T_SPAR,
  T_TOWER,
  type Fixture,
} from './rig';

/**
 * Which fixture positions take part in each preset (the others stay dark but follow the
 * preset's positions). A real LD rarely uses the whole rig for one effect: fans come from the
 * wing ribs and side sections, circles from the upper structure, etc.
 */
const PARTICIPATION: number[] = [
  0, // dark
  T_ALL, // ambient (sparse, see below)
  T_SPAR | T_SIDE | T_ARMEND | T_DECK | T_SIDEFLOOR | T_PILLAR | T_FOH | T_PA, // sweep
  T_SPAR | T_SIDE | T_ARMEND | T_DECK | T_SIDEFLOOR | T_FOH | T_PILLAR | T_DRAGON, // fan
  T_ALL, // ballyhoo
  T_SPAR | T_ROOF | T_TOWER | T_DRAGON | T_PA | T_PILLAR | T_FOH | T_ARM, // circle
  T_SPAR | T_ARM | T_ROOF | T_DECK | T_SIDE | T_ARMEND | T_PILLAR, // tilt_wave
  T_SPAR | T_SIDE | T_ARMEND | T_DECK | T_PILLAR | T_FOH | T_DRAGON, // audience
  T_SPAR | T_SIDE | T_ARMEND | T_TOWER | T_PILLAR | T_PA | T_DECK, // crosshatch
  T_ALL, // sky
  T_ALL, // pulse
  T_ALL, // still
];

/**
 * Moving-head look presets. Every preset is a PURE function of (show time, fixture, cue params,
 * beat) -> beam direction / dimmer / colour mix, so seeking and pausing are exact.
 * Angles in degrees; "tilt" = elevation above the horizon, "pan" = around the vertical axis
 * relative to the fixture's facing (+ = towards its right vector).
 */

export interface AimOut {
  x: number;
  y: number;
  z: number;
  dim: number;
  /** 0 = color, 1 = color2 */
  mix: number;
  /** tan(beam half-angle) */
  tan: number;
}

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

/** 32-bit hash -> [-1, 1) */
function h11(i: number, s: number): number {
  let x = (Math.imul(i, 374761393) + Math.imul(s, 668265263)) | 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x2c1b3c6d);
  x ^= x >>> 12;
  x = Math.imul(x, 0x297a2d39);
  x ^= x >>> 15;
  return ((x >>> 0) / 4294967296) * 2 - 1;
}

/** smooth 1D value noise in [-1, 1] */
export function vnoise(x: number, s: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = h11(i, s);
  return a + (h11(i + 1, s) - a) * u;
}

function setAim(f: Fixture, pan: number, tilt: number, o: AimOut): void {
  const p = pan * D2R;
  const t = tilt * D2R;
  const h = Math.cos(t);
  const cp = Math.cos(p) * h;
  const sp = Math.sin(p) * h;
  o.x = f.fwd.x * cp + f.right.x * sp;
  o.y = Math.sin(t);
  o.z = f.fwd.z * cp + f.right.z * sp;
}

/** direction in the fan plane (up + fanAxis), `ang` from vertical towards +fanAxis, leaned `lean` towards fwd */
function setFan(f: Fixture, ang: number, lean: number, o: AimOut): void {
  const a = ang * D2R;
  const l = lean * D2R;
  const sa = Math.sin(a);
  const cl = Math.cos(l);
  const sl = Math.sin(l);
  o.x = f.fanAxis.x * sa * cl + f.fwd.x * sl;
  o.y = Math.cos(a) * cl;
  o.z = f.fanAxis.z * sa * cl + f.fwd.z * sl;
  const n = Math.hypot(o.x, o.y, o.z) || 1;
  o.x /= n;
  o.y /= n;
  o.z /= n;
}

function setRest(f: Fixture, o: AimOut): void {
  o.x = f.rest.x;
  o.y = f.rest.y;
  o.z = f.rest.z;
}

const abs = Math.abs;
const sin = Math.sin;

/** Evaluate one look for one fixture at show time t. `c` null = dark. */
export function evalLook(c: LightCue | null, f: Fixture, t: number, beat: BeatInfo, o: AimOut): void {
  o.mix = 0;
  o.tan = c ? c.tan : TAN_NARROW;
  if (!c || c.preset === P_DARK) {
    setRest(f, o);
    o.dim = 0;
    return;
  }
  const tt = t - c.t0;
  // cycles since the cue start (speed = cycles per bar at the cue's tempo)
  const P = ((tt * c.bpm) / 240) * c.speed;
  const au = abs(f.u);
  const g = f.group;
  let dim = 1;
  switch (c.preset) {
    case P_AMBIENT: {
      const on = f.seed < 0.5 || f.n <= 2;
      const ang = f.fanOut * (10 + 20 * au) + 16 * sin(TAU * (P + f.seed));
      setFan(f, ang, 14 + 10 * sin(TAU * (0.7 * P + 2 * f.seed)), o);
      dim = on ? 0.34 * (0.7 + 0.3 * sin(TAU * (0.5 * P + f.seed))) : 0;
      o.mix = f.cluster & 1;
      break;
    }
    case P_SWEEP: {
      const base = g === G_FLOOR ? 36 : g === G_TOWERS ? 30 : 24;
      const pan = 52 * sin(TAU * P + f.u * 1.3) + f.ck * 7;
      setAim(f, pan * f.rx, (c.tilt ?? base) + 10 * sin(TAU * 2 * P + f.ck), o);
      o.mix = f.k & 1;
      break;
    }
    case P_FAN: {
      let spread = (c.spread ?? 36) * (0.72 + 0.28 * sin(TAU * P));
      let center: number;
      let lean = c.tilt !== null ? 90 - c.tilt : 16;
      if (f.tags & T_DECK) {
        center = f.fanOut * (30 + 42 * au);
        spread *= 0.8;
      } else if (f.tags & T_SIDEFLOOR) {
        center = f.fanOut * 58;
        spread *= 0.7;
        lean = 10;
      } else if (g === G_TOWERS) {
        center = f.fanOut * 10;
        spread *= 0.45;
        lean = 8;
      } else if (f.tags & T_FOH) {
        center = 0;
        spread *= 1.3;
        lean = 24;
      } else if (f.tags & T_PLINTH) {
        center = f.fanOut * 8;
      } else if (f.tags & (T_SIDE | T_ARMEND)) {
        // low half-sunbursts fanning outwards from the side sections (f024, f080)
        center = f.fanOut * 60;
        spread *= 0.85;
      } else {
        center = f.fanOut * (8 + 34 * au);
      }
      setFan(f, center + f.ck * spread + 5 * sin(TAU * 0.5 * P + f.seed * 6), lean, o);
      o.mix = f.cluster & 1;
      break;
    }
    case P_BALLYHOO: {
      const pan = 70 * vnoise(P * 2 + f.seed * 17.3, f.index);
      const tilt = 16 + 64 * (0.5 + 0.5 * vnoise(P * 2.3 + 5.1 + f.seed * 29.7, f.index + 911));
      setAim(f, pan, tilt, o);
      o.mix = f.seed < 0.5 ? 0 : 1;
      break;
    }
    case P_CIRCLE: {
      const R = c.spread ?? 20;
      const ph = TAU * P + (f.ck * 0.5 + f.u * 1.2) * Math.PI;
      const base = g === G_FLOOR ? 38 : g === G_TOWERS ? 52 : g === G_FIELD ? 40 : 46;
      setAim(f, f.out * (10 + 8 * au + R * Math.cos(ph)), (c.tilt ?? base) + R * sin(ph), o);
      o.mix = f.cluster & 1;
      break;
    }
    case P_TILT_WAVE: {
      const w = sin(TAU * (P - f.u * 0.9));
      setAim(f, f.out * (6 + 14 * au + f.ck * 14), 12 + 62 * (0.5 + 0.5 * w), o);
      o.mix = 0.5 - 0.5 * w;
      break;
    }
    case P_AUDIENCE: {
      // coherent sweeps through the crowd: each cluster scans its own zone in unison, the
      // fixtures of a cluster fan slightly so the pools form a moving row on the floor
      const ph = TAU * P + f.cluster * 0.9;
      const n1 = sin(ph) * 0.8 + 0.2 * vnoise(P * 1.5 + f.cluster * 3.7, f.cluster + 31);
      const n2 = sin(TAU * P * 0.73 + f.cluster * 1.7);
      let tx: number;
      let tz: number;
      if (g === G_TOWERS || f.tags & T_PLINTH) {
        tx = f.pos.x - f.side * 8 + 9 * n1 + f.ck * 3;
        tz = f.pos.z + 14 * n2;
      } else if (f.tags & T_FOH) {
        tx = 24 * n1 + f.ck * 6;
        tz = f.pos.z - 26 - 18 * (0.5 + 0.5 * n2);
      } else if (f.tags & (T_DECK | T_SIDEFLOOR)) {
        // low fixtures rake the front rows
        tx = f.pos.x * 0.8 + 10 * n1 + f.ck * 2.5;
        tz = f.pos.z + 9 + 9 * (0.5 + 0.5 * n2);
      } else {
        tx = f.pos.x * 0.5 + 16 * n1 + f.ck * 4;
        tz = 18 + 50 * (0.5 + 0.5 * n2) + abs(f.u) * 20;
      }
      const dx = tx - f.pos.x;
      const dy = -f.pos.y;
      const dz = tz - f.pos.z;
      const n = Math.hypot(dx, dy, dz) || 1;
      o.x = dx / n;
      o.y = dy / n;
      o.z = dz / n;
      o.mix = f.k & 1;
      break;
    }
    case P_CROSSHATCH: {
      if (g === G_TOWERS) setAim(f, -f.out * 55, 38 + f.ck * 8, o);
      else setAim(f, -f.out * (34 + 7 * sin(TAU * P + f.seed * 6)), (c.tilt ?? 30) + f.ck * 14 + 6 * sin(TAU * 0.5 * P + f.seed * 3), o);
      o.mix = f.side < 0 ? 0 : f.side > 0 ? 1 : f.k & 1;
      break;
    }
    case P_SKY: {
      const tilt = 84 - 7 * au + 3 * sin(TAU * P + f.seed * 6);
      setAim(f, f.out * (3 + 9 * au) + 4 * Math.cos(TAU * P + f.seed * 6), c.tilt ?? tilt, o);
      o.mix = f.cluster & 1;
      break;
    }
    case P_PULSE: {
      setFan(f, f.fanOut * (10 + 30 * au) + f.ck * (c.spread ?? 30), c.tilt !== null ? 90 - c.tilt : 16, o);
      const since = (beat.phase * 60) / Math.max(40, beat.bpm);
      dim = 0.12 + 0.88 * Math.exp(-since * 7);
      o.mix = Math.floor(beat.bar) & 1;
      break;
    }
    case P_STILL: {
      const base = g === G_TOWERS ? 20 : g === G_FIELD ? 16 : g === G_FLOOR ? 4 : 7;
      setAim(f, (c.pan ?? 0) + f.ck * 3 * f.out, c.tilt ?? base, o);
      o.mix = f.k & 1;
      break;
    }
    default:
      setRest(f, o);
  }
  if ((PARTICIPATION[c.preset] & f.tags) === 0) dim = 0;
  dim *= c.intensity;
  if (c.kick) dim *= 0.28 + 0.72 * beat.kick;
  o.dim = dim;
}
