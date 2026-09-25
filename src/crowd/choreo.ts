import type { BeatInfo } from '../core/types';
import type { ShowEngine } from '../show/ShowEngine';
import type { Cue, Section } from '../show/ShowTypes';
import { M, MOOD_CHANNELS, type MoodKey } from './constants';

/**
 * Crowd choreography = a pure function of show time.
 *
 * Three layers (later layers win):
 *  1. the built-in Tribe-mode behaviour timeline, authored from design-bible §9.4 and the
 *     "Crowd (tribe)" column of show-analysis.md (every row, audio-aligned drops and silences);
 *  2. automatic modulation from the current section (kind / energy) and the tempo grid
 *     (no kick → no jumping, fists stay up instead of pumping; silences hush the crowd);
 *  3. 'crowd' cues of the show file (mood / cheer / flags), cross-faded over 1 s.
 * Output: 20 mood shares (constants.ts M) + a cheer envelope.
 */

type Partial = { [K in MoodKey]?: number };

interface Key {
  t: number;
  fade: number;
  m: Partial;
}

const K = (t: number, m: Partial, fade = 1.4): Key => ({ t, fade, m });

// ---- behaviour timeline (Tribe mode), video seconds -----------------------------------------
const TIMELINE: Key[] = [
  // 1 Winter (0–126.4): hush, phones up; roar on the three hits; the climax 75.5–97
  K(0, { PHONES: 0.35, SWAY: 0.3, FLAGS: 0.08, LOOKUP: 0.05, INTENS: 0.6 }, 0.1),
  K(14, { PHONES: 0.3, SWAY: 0.55, HANDS: 0.12, FLAGS: 0.2, INTENS: 0.7 }, 5),
  K(32, { PHONES: 0.28, SWAY: 0.7, HANDS: 0.2, FLAGS: 0.35, INTENS: 0.75 }, 6),
  K(47.2, { FIST: 0.35, HANDS: 0.25, PHONES: 0.22, SWAY: 0.6, FLAGS: 0.5, INTENS: 0.85 }, 0.4),
  K(69, { BOUNCE: 0.35, CLAP: 0.25, HANDS: 0.2, PHONES: 0.2, FLAGS: 0.55, INTENS: 0.85 }, 1),
  K(75.5, { JUMP: 0.35, HANDS: 0.4, FIST: 0.2, BOUNCE: 0.3, FLAGS: 0.8, PHONES: 0.12, INTENS: 1 }, 0.5),
  K(97, { SWAY: 0.7, HANDS: 0.12, PHONES: 0.25, FLAGS: 0.45, INTENS: 0.75 }, 3),
  K(110.4, { SWAY: 0.2, PHONES: 0.2, FLAGS: 0.3, INTENS: 0.6 }, 0.6),
  K(113.3, { HANDS: 0.25, FIST: 0.2, PHONES: 0.2, SWAY: 0.4, FLAGS: 0.5, INTENS: 0.8 }, 0.6),
  // 2 Discorecord (126.4–273): bounce, fists, the crouch before the 243.5 drop
  K(126.4, { BOUNCE: 0.45, HANDS: 0.2, FIST: 0.15, FLAGS: 0.6, INTENS: 0.85 }, 0.8),
  K(134, { BOUNCE: 0.7, FIST: 0.2, HANDS: 0.1, FLAGS: 0.6, INTENS: 0.9 }, 1),
  K(145.6, { FIST: 0.5, BOUNCE: 0.55, JUMP: 0.15, HAKKEN: 0.12, FLAGS: 0.75, INTENS: 1 }, 0.4),
  K(157.9, { SWAY: 0.2, HANDS: 0.3, FLAGS: 0.5, INTENS: 0.7 }, 0.3),
  K(160.9, { FIST: 0.55, BOUNCE: 0.55, JUMP: 0.12, HAKKEN: 0.15, FLAGS: 0.75, INTENS: 1 }, 0.3),
  K(171.6, { HANDS: 0.5, SWAY: 0.7, WAVE: 0.12, FLAGS: 0.6, INTENS: 0.8 }, 1.5),
  K(182.3, { SWAY: 0.75, PHONES: 0.35, HANDS: 0.25, WAVE: 0.18, HUG: 0.1, FLAGS: 0.55, INTENS: 0.75 }, 2),
  K(206.8, { HANDS: 0.5, WAVE: 0.25, SWAY: 0.7, PHONES: 0.15, FLAGS: 0.6, INTENS: 0.8 }, 2),
  K(219, { CLAP: 0.5, BOUNCE: 0.3, HANDS: 0.15, FLAGS: 0.6, INTENS: 0.85 }, 1),
  K(232.8, { CROUCH: 0.7, SWAY: 0.1, FLAGS: 0.3, INTENS: 0.8 }, 0.8),
  K(243.46, { JUMP: 0.48, FIST: 0.32, HANDS: 0.25, BOUNCE: 0.2, FLAGS: 1, INTENS: 1.1 }, 0.15),
  K(268, { HANDS: 0.45, SWAY: 0.5, FIST: 0.15, FLAGS: 0.8, INTENS: 0.9 }, 1.5),
  // 3 Sacred Oath (273–566): the anthem, sing-along, full jump on 415.4, climax 536.2
  K(273, { HANDS: 0.35, PHONES: 0.3, SWAY: 0.6, FLAGS: 0.9, INTENS: 0.85 }, 1),
  K(291.6, { HUG: 0.3, SWAY: 0.8, PHONES: 0.3, HANDS: 0.2, FLAGS: 0.8, INTENS: 0.8 }, 2),
  K(307, { FIST: 0.5, BOUNCE: 0.6, HAKKEN: 0.1, FLAGS: 0.85, INTENS: 0.95 }, 0.4),
  K(319.4, { HANDS: 0.5, SWAY: 0.75, WAVE: 0.12, FLAGS: 0.8, INTENS: 0.85 }, 1),
  K(330.3, { JUMP: 0.35, FIST: 0.3, BOUNCE: 0.3, FLAGS: 0.9, INTENS: 1 }, 0.3),
  K(341.1, { HUG: 0.4, SWAY: 0.85, PHONES: 0.35, HANDS: 0.12, FLAGS: 0.55, INTENS: 0.8 }, 2.5),
  K(403, { CLAP: 0.6, BOUNCE: 0.2, HANDS: 0.1, FLAGS: 0.6, INTENS: 0.9 }, 1),
  K(409.3, { FIST: 0.5, SWAY: 0.1, FLAGS: 0.6, INTENS: 0.9 }, 0.3),
  K(412.3, { CROUCH: 0.55, FLAGS: 0.5, INTENS: 0.9 }, 0.6),
  K(415.44, { JUMP: 0.55, HANDS: 0.5, FIST: 0.25, FLAGS: 1, INTENS: 1.15 }, 0.12),
  K(440.2, { SWAY: 0.7, HUG: 0.2, HANDS: 0.3, PHONES: 0.12, FLAGS: 0.8, INTENS: 0.85 }, 2),
  K(465, { HANDS: 0.4, PHONES: 0.3, SWAY: 0.6, FLAGS: 0.55, INTENS: 0.75 }, 2),
  K(477.4, { HANDS: 0.5, CLAP: 0.25, SWAY: 0.4, FLAGS: 0.6, INTENS: 0.85 }, 2),
  K(502.1, { JUMP: 0.5, FIST: 0.3, HANDS: 0.2, FLAGS: 1, INTENS: 1.1 }, 0.15),
  K(523.8, { FIST: 0.3, CLAP: 0.3, SWAY: 0.4, FLAGS: 0.8, INTENS: 0.9 }, 1),
  K(531.6, { CROUCH: 0.4, FIST: 0.2, FLAGS: 0.6, INTENS: 0.9 }, 0.8),
  K(536.2, { JUMP: 0.55, HANDS: 0.4, FIST: 0.25, FLAGS: 1, PHONES: 0.12, LOOKUP: 0.45, INTENS: 1.15 }, 0.12),
  K(558, { HUG: 0.35, HANDS: 0.35, SWAY: 0.6, FLAGS: 1, LOOKUP: 0.3, INTENS: 0.9 }, 3),
  K(564, { CLAP: 0.6, HANDS: 0.2, FLAGS: 0.8, INTENS: 0.85 }, 1),
  // 4 L.P.A. (566–622): "losse polsjes", then the blackout and the hush
  K(566, { POLS: 0.3, BOUNCE: 0.35, CLAP: 0.1, FLAGS: 0.6, INTENS: 0.9 }, 1),
  K(578.4, { POLS: 0.62, BOUNCE: 0.4, FLAGS: 0.5, INTENS: 0.95 }, 1),
  K(589.73, { POLS: 0.55, JUMP: 0.35, BOUNCE: 0.3, FLAGS: 0.8, INTENS: 1.1 }, 0.15),
  K(612.3, { HANDS: 0.2, SWAY: 0.2, FLAGS: 0.3, INTENS: 0.7 }, 0.5),
  K(622, { PHONES: 0.4, LIGHTERS: 0.6, SWAY: 0.3, FLAGS: 0.2, INTENS: 0.6 }, 3),
  // 5 Sacred Flame (638.6–886): tribal stomp with the dancers, burning wings, flame ring climax
  K(638.6, { PHONES: 0.3, SWAY: 0.35, FLAGS: 0.3, INTENS: 0.7 }, 2),
  K(649.2, { STOMP: 0.5, HANDS: 0.28, PHONES: 0.22, SWAY: 0.3, FLAGS: 0.5, INTENS: 0.85 }, 2),
  K(709.2, { HANDS: 0.7, JUMP: 0.1, FLAGS: 0.8, INTENS: 1 }, 0.2),
  K(712.2, { STOMP: 0.4, SWAY: 0.55, HANDS: 0.3, FLAGS: 0.7, INTENS: 0.9 }, 1.5),
  K(733.2, { HANDS: 0.5, SWAY: 0.5, FLAGS: 0.6, INTENS: 0.85 }, 1.5),
  K(745.2, { JUMP: 0.35, FIST: 0.3, PHONES: 0.35, FLAGS: 0.8, LOOKUP: 0.4, INTENS: 1 }, 0.8),
  K(781.2, { CLAP: 0.6, FLAGS: 0.6, INTENS: 0.95 }, 0.8),
  K(787.3, { CROUCH: 0.6, FLAGS: 0.4, INTENS: 0.9 }, 0.6),
  K(793.2, { JUMP: 0.52, FIST: 0.4, HANDS: 0.15, FLAGS: 1, LOOKUP: 0.3, INTENS: 1.1 }, 0.12),
  K(817.2, { HANDS: 0.6, SWAY: 0.4, FLAGS: 0.8, INTENS: 0.95 }, 1),
  K(826.3, { CROUCH: 0.6, FLAGS: 0.5, INTENS: 0.95 }, 0.6),
  K(829.25, { JUMP: 0.65, FIST: 0.35, HANDS: 0.3, FLAGS: 1, LOOKUP: 0.25, INTENS: 1.2 }, 0.12),
  K(877.3, { CLAP: 0.5, HANDS: 0.2, FLAGS: 0.6, INTENS: 0.8 }, 1),
  // 6 Domitor Draconis (886–1098): hush and sit for the piano, then head-banging and hard fists
  K(884.6, { SIT: 0.3, PHONES: 0.45, LIGHTERS: 0.75, SWAY: 0.2, FLAGS: 0.1, INTENS: 0.5 }, 3),
  K(933.8, { JUMP: 0.4, HANDS: 0.3, FIST: 0.2, FLAGS: 0.7, INTENS: 1.05 }, 0.2),
  K(943.4, { HEADBANG: 0.4, FIST: 0.5, BOUNCE: 0.35, JUMP: 0.12, FLAGS: 0.7, INTENS: 1 }, 1.5),
  K(1004, { HANDS: 0.3, CROUCH: 0.3, FLAGS: 0.5, INTENS: 0.9 }, 0.5),
  K(1006.7, { JUMP: 0.5, FIST: 0.4, HEADBANG: 0.15, FLAGS: 0.9, INTENS: 1.1 }, 0.15),
  K(1026.9, { JUMP: 0.5, FIST: 0.35, HANDS: 0.2, FLAGS: 0.95, LOOKUP: 0.2, INTENS: 1.1 }, 0.5),
  K(1081, { CLAP: 0.4, HANDS: 0.3, SWAY: 0.4, FLAGS: 0.6, INTENS: 0.8 }, 1.5),
  // 7 Embers (1098–1320): arms around shoulders, reaching into the laser sea, two drops
  K(1098, { HUG: 0.45, SWAY: 0.85, PHONES: 0.15, FLAGS: 0.45, INTENS: 0.75 }, 2.5),
  K(1110.6, { HANDS: 0.5, SWAY: 0.6, HUG: 0.15, FLAGS: 0.5, INTENS: 0.8 }, 2),
  K(1132, { HANDS: 0.55, WAVE: 0.3, SWAY: 0.5, FLAGS: 0.6, INTENS: 0.85 }, 1.5),
  K(1156, { JUMP: 0.4, FIST: 0.3, BOUNCE: 0.2, FLAGS: 0.8, INTENS: 1 }, 0.5),
  K(1182, { CROUCH: 0.6, FLAGS: 0.5, INTENS: 0.9 }, 0.6),
  K(1188.4, { JUMP: 0.55, FIST: 0.3, HANDS: 0.2, FLAGS: 1, LOOKUP: 0.4, INTENS: 1.1 }, 0.12),
  K(1227, { HANDS: 0.5, HUG: 0.35, SWAY: 0.6, FLAGS: 0.7, INTENS: 0.9 }, 1.5),
  K(1255.5, { JUMP: 0.5, FIST: 0.3, FLAGS: 0.9, INTENS: 1.05 }, 0.15),
  K(1287, { JUMP: 0.6, HANDS: 0.35, FIST: 0.2, FLAGS: 1, LOOKUP: 0.5, INTENS: 1.15 }, 0.12),
  K(1304, { SWAY: 0.8, HUG: 0.4, PHONES: 0.15, FLAGS: 0.5, INTENS: 0.7 }, 2),
  K(1312, { SWAY: 0.6, PHONES: 0.3, HANDS: 0.1, FLAGS: 0.4, INTENS: 0.7 }, 2),
  // 8 In The Cold (1320–1581): awe, the vocal, the emotional breakdown, the grand finale, farewell
  K(1320.4, { PHONES: 0.42, SWAY: 0.5, HANDS: 0.08, FLAGS: 0.35, INTENS: 0.7 }, 3),
  K(1371.8, { SWAY: 0.75, HANDS: 0.3, HUG: 0.25, PHONES: 0.2, FLAGS: 0.55, INTENS: 0.8 }, 2),
  K(1402.8, { CLAP: 0.6, FLAGS: 0.6, INTENS: 0.9 }, 1),
  K(1410.5, { CROUCH: 0.5, FLAGS: 0.5, INTENS: 0.9 }, 0.5),
  K(1412.1, { JUMP: 0.5, FIST: 0.3, HANDS: 0.2, FLAGS: 0.95, INTENS: 1.1 }, 0.12),
  K(1440, { FIST: 0.4, BOUNCE: 0.45, HAKKEN: 0.12, FLAGS: 0.8, INTENS: 1 }, 1),
  K(1452.3, { HANDS: 0.5, SWAY: 0.5, FLAGS: 0.7, INTENS: 0.85 }, 1),
  K(1461.6, { CLAP: 0.7, BOUNCE: 0.2, FLAGS: 0.6, INTENS: 0.9 }, 0.8),
  K(1474, { HANDS: 0.3, HUG: 0.35, PHONES: 0.6, LIGHTERS: 0.35, SWAY: 0.7, FLAGS: 0.5, INTENS: 0.75 }, 2),
  K(1507, { CROUCH: 0.6, FLAGS: 0.5, INTENS: 0.95 }, 1),
  K(1511.18, { JUMP: 0.6, HANDS: 0.4, FIST: 0.15, PHONES: 0.2, FLAGS: 1, LOOKUP: 0.55, INTENS: 1.2 }, 0.12),
  K(1536, { CLAP: 0.5, HUG: 0.4, HANDS: 0.1, FLAGS: 0.8, LOOKUP: 0.2, INTENS: 0.8 }, 2),
  K(1551, { HANDS: 0.5, FIST: 0.2, FLAGS: 0.9, INTENS: 0.95 }, 1),
  K(1557, { FIST: 0.4, CLAP: 0.45, FLAGS: 0.8, INTENS: 0.85 }, 1.5),
  K(1577.6, { SWAY: 0.4, CLAP: 0.2, FLAGS: 0.5, INTENS: 0.7 }, 1.5),
];

/** cheers / roars (drops, first fire, the anthem recognised, the flame ring …) */
const CHEERS: number[] = [
  16, 47.4, 55.3, 63.2, 75.5, 100.1, 114.4, 120.3, 126.4, 145.6, 158, 243.46, 274, 330.3, 409.5, 415.44, 502.1, 536.2, 564.5,
  567, 589.73, 612.5, 709.2, 793.2, 829.25, 859.25, 933.8, 1004.5, 1006.7, 1026.9, 1082, 1188.4, 1287, 1293.4, 1412.1,
  1511.18, 1537, 1554.8, 1571,
];

/** mood presets for 'crowd' / 'mood' cues */
const PRESETS: Record<string, Partial> = {
  idle: { SWAY: 0.25, INTENS: 0.7 },
  sway: { SWAY: 0.95, HANDS: 0.1, INTENS: 0.75 },
  bounce: { BOUNCE: 0.8, FIST: 0.2, INTENS: 0.95 },
  jump: { JUMP: 0.6, FIST: 0.25, HANDS: 0.25, FLAGS: 0.9, INTENS: 1.1 },
  handsup: { HANDS: 0.75, SWAY: 0.5, FLAGS: 0.7, INTENS: 0.9 },
  fistpump: { FIST: 0.65, BOUNCE: 0.5, FLAGS: 0.7, INTENS: 1 },
  lighters: { PHONES: 0.55, LIGHTERS: 0.9, SWAY: 0.6, INTENS: 0.7 },
  cheer: { HANDS: 0.55, CHEER: 1, FLAGS: 0.9, INTENS: 1 },
  wave: { WAVE: 0.6, SWAY: 0.6, INTENS: 0.85 },
  hug: { HUG: 0.6, SWAY: 0.85, INTENS: 0.8 },
  clap: { CLAP: 0.7, INTENS: 0.9 },
  crouch: { CROUCH: 0.7, INTENS: 0.9 },
  sit: { SIT: 0.5, PHONES: 0.3, INTENS: 0.5 },
  stomp: { STOMP: 0.6, HANDS: 0.2, INTENS: 0.9 },
  headbang: { HEADBANG: 0.5, FIST: 0.4, INTENS: 1 },
  pols: { POLS: 0.65, BOUNCE: 0.3, INTENS: 1 },
};

const KEYS = Object.keys(M) as MoodKey[];
const SILENCE_DAMP: number[] = [M.JUMP, M.BOUNCE, M.FIST, M.HAKKEN, M.STOMP, M.HEADBANG, M.POLS, M.CLAP];

function fill(out: Float32Array, m: Partial): void {
  out.fill(0);
  out[M.INTENS] = 1;
  for (const k of KEYS) {
    const v = m[k];
    if (v !== undefined) out[M[k]] = v;
  }
}

// precomputed targets (no per-frame allocation)
const TARGETS: Float32Array[] = TIMELINE.map((k) => {
  const a = new Float32Array(MOOD_CHANNELS);
  fill(a, k.m);
  return a;
});
const PRESET_ARR: Record<string, Float32Array> = {};
for (const [name, m] of Object.entries(PRESETS)) {
  const a = new Float32Array(MOOD_CHANNELS);
  fill(a, m);
  PRESET_ARR[name] = a;
}

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function cheerEnv(dt: number): number {
  if (dt < 0 || dt > 4.5) return 0;
  return dt < 0.18 ? dt / 0.18 : Math.exp(-(dt - 0.18) * 0.85);
}

export class Choreo {
  /** 20 mood shares for the shaders */
  readonly mood = new Float32Array(MOOD_CHANNELS);
  /** 0..1 cheer envelope */
  cheer = 0;
  /** latest active 'mood' cue state (for stats) */
  cueState = '-';
  private cueTmp: Cue[] = [];

  evaluate(t: number, beat: BeatInfo, section: Section | null, show: ShowEngine | null): void {
    const out = this.mood;
    // 1. built-in timeline
    let i = TIMELINE.length - 1;
    while (i > 0 && TIMELINE[i].t > t) i--;
    const cur = TARGETS[i];
    if (i > 0 && t >= TIMELINE[0].t) {
      const prev = TARGETS[i - 1];
      const k = smooth((t - TIMELINE[i].t) / TIMELINE[i].fade);
      for (let c = 0; c < MOOD_CHANNELS; c++) out[c] = prev[c] + (cur[c] - prev[c]) * k;
    } else out.set(cur);

    // cheers from the built-in list
    let ch = 0;
    for (let j = 0; j < CHEERS.length; j++) {
      const e = cheerEnv(t - CHEERS[j]);
      if (e > ch) ch = e;
    }

    // 2. section + tempo modulation
    if (section) {
      if (section.kind === 'silence') {
        for (let c = 0; c < SILENCE_DAMP.length; c++) out[SILENCE_DAMP[c]] *= 0.25;
      }
      out[M.INTENS] *= 0.8 + 0.3 * Math.min(1, Math.max(0, section.energy));
    }
    if (!beat.hasKick) {
      // no kick: nobody jumps on nothing; fists stay up, bounce becomes a slow sway
      const j = out[M.JUMP];
      out[M.JUMP] = 0;
      out[M.HANDS] = Math.min(1, out[M.HANDS] + j * 0.5);
      out[M.SWAY] = Math.min(1, out[M.SWAY] + out[M.BOUNCE] * 0.7 + out[M.HAKKEN]);
      out[M.BOUNCE] *= 0.3;
      out[M.HAKKEN] = 0;
      out[M.HEADBANG] *= 0.3;
    }

    // 3. show-file crowd cues
    this.cueState = '-';
    if (show && show.file) {
      const act = show.active('crowd', t, this.cueTmp);
      for (let a = 0; a < act.length; a++) {
        const c = act[a];
        const fadeIn = smooth((t - c.t) / 1);
        const fadeOut = smooth((c.t + c.dur - t) / 1);
        const w = Math.min(fadeIn, fadeOut);
        const inten = typeof c.p.intensity === 'number' ? Math.max(0, Math.min(1.5, c.p.intensity)) : 1;
        if (c.fx === 'mood') {
          const preset = PRESET_ARR[String(c.p.state ?? '')];
          if (!preset) continue;
          this.cueState = String(c.p.state);
          for (let k = 0; k < MOOD_CHANNELS; k++) {
            const target = k === M.INTENS ? preset[k] * (0.7 + 0.3 * inten) : k === M.FLAGS ? Math.max(out[k], preset[k]) : preset[k] * inten;
            out[k] += (target - out[k]) * w;
          }
          if (c.p.state === 'cheer') ch = Math.max(ch, cheerEnv(t - c.t) * inten);
        } else if (c.fx === 'cheer') {
          ch = Math.max(ch, cheerEnv(t - c.t) * inten);
        } else if (c.fx === 'flags') {
          const amt = typeof c.p.amount === 'number' ? Math.max(0, Math.min(1, c.p.amount)) : 1;
          out[M.FLAGS] += (amt - out[M.FLAGS]) * w;
        }
      }
      // fireworks in the sky → heads go up
      const fw = show.active('fireworks', t, this.cueTmp).length;
      if (fw > 0) out[M.LOOKUP] = Math.max(out[M.LOOKUP], Math.min(0.7, 0.2 + fw * 0.08));
    }
    out[M.CHEER] = ch;
    this.cheer = ch;
  }
}

/** section kind fallback used by stats/debug */
export function describeMood(m: Float32Array): string {
  let best = 'idle';
  let bv = 0.15;
  for (const k of KEYS) {
    if (k === 'INTENS' || k === 'FLAGS' || k === 'LOOKUP' || k === 'CHEER' || k === 'LIGHTERS') continue;
    const v = m[M[k]];
    if (v > bv) {
      bv = v;
      best = k.toLowerCase();
    }
  }
  return best;
}
