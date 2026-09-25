/**
 * Harmony + arrangement tables for the synthesized rehearsal track.
 * Everything is ORIGINAL material (chord loops are generic minor-key progressions; motifs are
 * written for this project) — no melody of the real Endshow tracks is reproduced.
 */
import type { SectionKind } from '../../show/ShowTypes';

/** natural minor scale (semitones) */
const MINOR = [0, 2, 3, 5, 7, 8, 10];

export type Timbre = 'hardstyle' | 'orchestral';

export interface Style {
  name: string;
  /** MIDI note of the tonic in octave 3 (48..59) */
  root: number;
  /** chord loop as scale degrees (0 = i) */
  prog: number[];
  /** raise the 3rd of the v chord (harmonic minor V) */
  harmonicV: boolean;
  /**
   * lead motif over 2 bars of 8th notes: chord-tone index (0 root, 1 third, 2 fifth, 3 octave,
   * 4 = 10th, 5 = 12th, -1 = 7th below / leading), null = rest, '~' = tie previous note
   */
  motif: (number | null | '~')[];
  /** arp pattern over one bar of 16ths: chord-tone indices */
  arp: number[];
  timbre: Timbre;
  /** detune/brightness flavour 0..1 */
  flavour: number;
}

/**
 * Hand-written styles. The first is the orchestral opener in F minor (the key of Vivaldi's
 * "Winter"), the rest are euphoric/raw hardstyle flavours in typical minor keys.
 */
export const STYLES: Style[] = [
  {
    name: 'winter',
    root: 53, // F minor
    prog: [0, 6, 5, 4], // i VII VI V  (baroque lament cadence)
    harmonicV: true,
    motif: [3, '~', 2, '~', 1, 2, 3, 4, '~', '~', 3, '~', 2, null, 1, '~'],
    arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 1],
    timbre: 'orchestral',
    flavour: 0.3,
  },
  {
    name: 'disco-euphoria',
    root: 55, // G minor
    prog: [0, 5, 2, 6], // i VI III VII
    harmonicV: false,
    motif: [2, null, 3, 2, null, 3, 4, '~', 3, null, 2, 1, null, 2, 0, '~'],
    arp: [0, 2, 3, 2, 1, 2, 3, 4, 0, 2, 3, 2, 1, 2, 4, 3],
    timbre: 'hardstyle',
    flavour: 0.6,
  },
  {
    name: 'anthem',
    root: 50, // D minor
    prog: [5, 6, 0, 0], // VI VII i i
    harmonicV: false,
    motif: [3, '~', 3, 4, 5, '~', 4, 3, 2, '~', 3, '~', 1, '~', 0, null],
    arp: [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 4, 3],
    timbre: 'hardstyle',
    flavour: 0.8,
  },
  {
    name: 'raw',
    root: 54, // F# minor
    prog: [0, 0, 5, 4],
    harmonicV: true,
    motif: [0, null, 0, 3, null, 2, null, 1, 0, null, 0, 3, null, 4, 3, null],
    arp: [0, 3, 0, 2, 0, 3, 0, 4, 0, 3, 0, 2, 0, 1, 0, 2],
    timbre: 'hardstyle',
    flavour: 0.9,
  },
  {
    name: 'sacred-flame',
    root: 57, // A minor
    prog: [0, 3, 5, 4], // i iv VI v
    harmonicV: true,
    motif: [2, '~', 3, '~', 4, 3, 2, '~', 1, '~', 2, 3, 1, '~', 0, '~'],
    arp: [0, 2, 1, 3, 2, 4, 3, 2, 0, 2, 1, 3, 2, 4, 5, 4],
    timbre: 'hardstyle',
    flavour: 0.7,
  },
  {
    name: 'draconis',
    root: 52, // E minor
    prog: [0, 5, 3, 4],
    harmonicV: true,
    motif: [0, 1, 2, 3, '~', 2, 1, 2, 3, 4, '~', 3, 2, '~', 1, '~'],
    arp: [0, 1, 2, 0, 1, 2, 3, 2, 0, 1, 2, 0, 1, 2, 4, 3],
    timbre: 'hardstyle',
    flavour: 0.85,
  },
  {
    name: 'embers',
    root: 49, // C# minor
    prog: [5, 2, 6, 0], // VI III VII i
    harmonicV: false,
    motif: [4, '~', 3, 2, '~', 3, 2, 1, '~', '~', 2, 1, 0, '~', 1, '~'],
    arp: [0, 2, 4, 2, 3, 2, 4, 5, 0, 2, 4, 2, 3, 4, 5, 4],
    timbre: 'hardstyle',
    flavour: 0.55,
  },
  {
    name: 'in-the-cold',
    root: 56, // G# minor -> cold, glassy
    prog: [0, 6, 5, 6],
    harmonicV: false,
    motif: [3, '~', '~', 2, '~', '~', 1, '~', 2, '~', '~', 3, '~', 4, '~', '~'],
    arp: [0, 3, 2, 3, 1, 3, 2, 3, 0, 3, 2, 3, 4, 3, 2, 1],
    timbre: 'hardstyle',
    flavour: 0.45,
  },
];

/** Choose a style for a chapter (orchestral titles get the orchestral style). */
export function styleForChapter(index: number, title: string): Style {
  if (/winter|vivaldi|seasons|orchestr|symphon/i.test(title)) return STYLES[0];
  if (index <= 0) return STYLES[0];
  return STYLES[1 + ((index - 1) % (STYLES.length - 1))];
}

/** semitone offset of a (possibly negative / >6) scale degree */
export function degreeSemis(d: number): number {
  const o = Math.floor(d / 7);
  const i = d - o * 7;
  return o * 12 + MINOR[i];
}

/**
 * Chord tones (MIDI) for a scale degree: returns 6 tones [root, 3rd, 5th, oct, 10th, 12th]
 * plus index -1 (leading tone below) available via `tone(-1)`.
 */
export function chordTones(style: Style, degree: number, octave: number, out: number[]): number[] {
  const base = style.root + octave * 12;
  const r = degreeSemis(degree);
  let third = degreeSemis(degree + 2);
  if (style.harmonicV && ((degree % 7) + 7) % 7 === 4) third += 1; // major V
  const fifth = degreeSemis(degree + 4);
  out.length = 0;
  out.push(base + r, base + third, base + fifth, base + r + 12, base + third + 12, base + fifth + 12);
  return out;
}

export function chordToneIndex(tones: number[], idx: number): number {
  if (idx < 0) return tones[2] - 12; // fifth below
  return tones[Math.min(idx, tones.length - 1)];
}

/** Per section kind: how the arrangement behaves. */
export interface KindRecipe {
  barsPerChord: number;
  pad: 'saw' | 'strings' | 'choir' | 'soft' | null;
  lead: 'arp' | 'motif' | 'both' | 'bell' | 'violin' | 'screech' | null;
  clap: boolean;
  hats: 0 | 1 | 2;
  bass: 'reverse' | 'sub' | 'cello' | null;
  ostinato: boolean;
  /** pad brightness 0..1 */
  bright: number;
}

export function recipe(kind: SectionKind, timbre: Timbre, energy: number): KindRecipe {
  const orch = timbre === 'orchestral';
  switch (kind) {
    case 'orchestral':
      return { barsPerChord: 2, pad: 'strings', lead: 'violin', clap: false, hats: 0, bass: 'cello', ostinato: true, bright: 0.5 };
    case 'intro':
      return orch
        ? { barsPerChord: 2, pad: 'strings', lead: 'violin', clap: false, hats: 0, bass: 'cello', ostinato: false, bright: 0.35 }
        : { barsPerChord: 2, pad: 'soft', lead: 'bell', clap: false, hats: 0, bass: 'sub', ostinato: false, bright: 0.3 };
    case 'breakdown':
      return orch
        ? { barsPerChord: 2, pad: 'strings', lead: 'violin', clap: false, hats: 0, bass: 'cello', ostinato: energy > 0.45, bright: 0.45 }
        : { barsPerChord: 2, pad: 'soft', lead: 'bell', clap: false, hats: 0, bass: 'sub', ostinato: false, bright: 0.35 };
    case 'vocal':
      return { barsPerChord: 2, pad: 'choir', lead: energy > 0.6 ? 'motif' : 'bell', clap: energy > 0.6, hats: energy > 0.6 ? 1 : 0, bass: energy > 0.6 ? 'reverse' : 'sub', ostinato: false, bright: 0.5 };
    case 'build':
      return { barsPerChord: 1, pad: orch ? 'strings' : 'saw', lead: 'arp', clap: false, hats: 1, bass: null, ostinato: orch, bright: 0.2 };
    case 'drop':
      return { barsPerChord: 1, pad: 'saw', lead: energy >= 0.8 ? 'motif' : 'arp', clap: true, hats: 1, bass: 'reverse', ostinato: false, bright: 0.75 };
    case 'climax':
      return { barsPerChord: 1, pad: 'saw', lead: 'both', clap: true, hats: 2, bass: 'reverse', ostinato: false, bright: 0.95 };
    case 'anticlimax':
      return { barsPerChord: 2, pad: null, lead: 'screech', clap: true, hats: 1, bass: 'reverse', ostinato: false, bright: 0.6 };
    case 'outro':
      return { barsPerChord: 2, pad: orch ? 'strings' : 'soft', lead: null, clap: false, hats: 0, bass: 'sub', ostinato: false, bright: 0.3 };
    case 'silence':
    default:
      return { barsPerChord: 2, pad: null, lead: null, clap: false, hats: 0, bass: null, ostinato: false, bright: 0 };
  }
}
