/**
 * Abstract music source. The show clock follows whichever track is active, so the timing engine
 * never depends on manual clicks. Implementations: local/hosted file, official YouTube embed,
 * synthesized rehearsal track, silent clock.
 */
export type TrackKind = 'file' | 'youtube' | 'synth' | 'silent';

export interface AudioTrack {
  readonly kind: TrackKind;
  readonly label: string;
  /** seconds; may be 0 until loaded */
  readonly duration: number;
  readonly playing: boolean;
  load(): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(t: number): void;
  /** current playback time in seconds (as reported by the source) */
  getTime(): number;
  setVolume(v: number): void;
  setMuted(m: boolean): void;
  /** true when the source reports time with coarse granularity (clock smoothing is stronger) */
  readonly coarseClock: boolean;
  dispose(): void;
}

/** A pure clock without audio (performance.now based). Used before any audio is chosen. */
export class SilentTrack implements AudioTrack {
  readonly kind = 'silent' as const;
  readonly label = 'No audio (silent clock)';
  readonly coarseClock = false;
  playing = false;
  private base = 0;
  private startPerf = 0;
  constructor(public duration: number) {}
  async load() {}
  async play() {
    if (this.playing) return;
    this.startPerf = performance.now();
    this.playing = true;
  }
  pause() {
    if (!this.playing) return;
    this.base = this.getTime();
    this.playing = false;
  }
  seek(t: number) {
    this.base = Math.max(0, Math.min(this.duration, t));
    this.startPerf = performance.now();
  }
  getTime() {
    return this.playing ? this.base + (performance.now() - this.startPerf) / 1000 : this.base;
  }
  setVolume() {}
  setMuted() {}
  dispose() {}
}
