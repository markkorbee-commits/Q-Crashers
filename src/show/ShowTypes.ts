/**
 * Data-driven show format (public/show/*.json).
 * The show file describes WHAT happens WHEN; systems decide HOW it looks.
 */

export type SystemId =
  | 'lights' // moving heads, washes, blinders, stage illumination looks
  | 'strobe' // strobe hits / chases
  | 'lasers'
  | 'pyro' // flames, flame jets, CO2 jets, gerbs, sparkulars, stage explosions
  | 'fireworks' // aerial shells, comets, cakes, mines, waterfalls
  | 'stage' // dragon / wings / castle states (eyes, mouth fire, wing glow, window glow)
  | 'screens' // LED content
  | 'fog' // haze / low fog / smoke bursts
  | 'crowd' // crowd reactions (jump, hands up, flags, lighters, cheer)
  | 'camera' // show-camera shots
  | 'atmos'; // sky / global ambience changes

export interface TempoSegment {
  /** section start (s) */
  start: number;
  end: number;
  bpm: number;
  /** time (s) of a known downbeat (bar start) inside or near the segment */
  anchor: number;
  /** does this part have a pounding kick (drives kick-synced visuals) */
  kick: boolean;
  beatsPerBar?: number;
  /** 'authored' (from research) or 'analyzed' (refined from the real audio) */
  source?: 'authored' | 'analyzed';
}

export type SectionKind =
  | 'intro'
  | 'orchestral'
  | 'breakdown'
  | 'build'
  | 'drop'
  | 'climax'
  | 'vocal'
  | 'anticlimax'
  | 'outro'
  | 'silence';

export interface Section {
  start: number;
  end: number;
  label: string;
  kind: SectionKind;
  /** 0..1 */
  energy: number;
  /** key into ShowFile.palettes */
  palette: string;
  /** chapter/track title (display) */
  track?: string;
}

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  /** sky tint multiplier / atmosphere tint (optional) */
  atmos?: string;
}

export type RepeatEvery = number | 'beat' | 'halfbeat' | '2beat' | 'bar' | '2bar' | '4bar' | '8bar';

export interface CueRepeat {
  every: RepeatEvery;
  /** absolute end time (s, exclusive) */
  until?: number;
  count?: number;
  /** step pattern cycling over repeats: 'x' = fire, '-' = skip. e.g. "x-x-xxx-" */
  pattern?: string;
  /** parameter values cycled per fired step: { side: ['left','right'] } */
  cycle?: Record<string, unknown[]>;
  /** target lists cycled per fired step */
  cycleTargets?: string[][];
}

export interface CueDef {
  /** start time in seconds (video/audio time) */
  t: number;
  /** emission / active duration in seconds (defaults per system/fx) */
  dur?: number;
  sys: SystemId;
  /** effect id understood by the system, e.g. 'look', 'hit', 'jet', 'shell', 'fan', 'sweep' */
  fx: string;
  /** named target groups, e.g. 'deck', 'wings', 'towers', 'pillars', 'left', 'right', 'all' */
  target?: string | string[];
  /** effect parameters */
  p?: Record<string, unknown>;
  repeat?: CueRepeat;
  /** snap start to the tempo grid (applied after optional audio analysis refinement) */
  snap?: 'beat' | 'halfbeat' | 'bar' | 'none';
  /** free text note (research reference) */
  note?: string;
}

export interface ShowFile {
  version: 1;
  meta: {
    id: string;
    title: string;
    subtitle?: string;
    duration: number;
    audio: {
      /** candidate local files, tried in order (relative to the page) */
      src: string[];
      youtubeId?: string;
      /** audio time = show time + offset */
      offset?: number;
    };
    credits?: string;
  };
  chapters: { t: number; title: string; artist: string }[];
  tempo: TempoSegment[];
  sections: Section[];
  palettes: Record<string, Palette>;
  moments: { t: number; label: string }[];
  cues: CueDef[];
}

/** Compiled, expanded cue. Immutable. */
export interface Cue {
  /** stable index in compile order (use for deterministic seeds) */
  id: number;
  t: number;
  dur: number;
  /** visual lifetime (>= dur). Cue is 'alive' in [t, t + life). */
  life: number;
  end: number;
  sys: SystemId;
  fx: string;
  targets: string[];
  p: Record<string, any>;
  seed: number;
  /** index of this cue within its repeat expansion (0 for single cues) */
  step: number;
}
