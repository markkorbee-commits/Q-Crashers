import type { AudioTrack } from '../audio/AudioTrack';

/** longest hold at a play/seek anchor waiting for a precise audio clock to start moving (ms) */
const START_HOLD_MAX_MS = 400;

/**
 * The single source of show time. Follows the active AudioTrack and smooths coarse/jittery
 * media clocks into a monotonic, frame-accurate time. PLAY/PAUSE/SEEK/RESTART all go through here.
 */
export class ShowClock {
  private baseTime = 0;
  private basePerf = 0;
  private lastTime = 0;
  private seekedFlag = true;
  private _playing = false;
  private lastReported = -1;
  private endedFired = false;
  /**
   * Set by play / seek / track swap. A precise audio clock reports the anchor time until the sound
   * actually starts (scheduling look-ahead + output latency, ~50-100 ms). Instead of letting the
   * predicted time run ahead and slewing it back over many frames, hold at the anchor until the
   * track time advances, then snap to it once.
   */
  private startPending = false;
  private pendingSince = 0;
  onEnded: (() => void) | null = null;
  /** measured |audio - smoothed| drift (s) for the debug menu */
  drift = 0;

  constructor(public track: AudioTrack, public duration: number) {}

  get playing(): boolean {
    return this._playing;
  }

  /** swap audio source keeping the current position and play state */
  async setTrack(track: AudioTrack): Promise<void> {
    const t = this.lastTime;
    const wasPlaying = this._playing;
    this.track.pause();
    this.track = track;
    track.seek(t);
    this.rebase(t);
    this.armStart();
    if (wasPlaying) await this.play();
  }

  async play(): Promise<void> {
    if (this.lastTime >= this.duration - 0.05) this.seek(0);
    this._playing = true;
    this.endedFired = false;
    this.rebase(this.lastTime);
    this.armStart();
    try {
      await this.track.play();
    } catch (e) {
      this._playing = false;
      throw e;
    }
  }

  pause(): void {
    this._playing = false;
    this.track.pause();
    this.lastTime = this.clampT(this.track.getTime() || this.lastTime);
    this.rebase(this.lastTime);
  }

  toggle(): Promise<void> | void {
    return this._playing ? this.pause() : this.play();
  }

  seek(t: number): void {
    t = this.clampT(t);
    this.track.seek(t);
    this.rebase(t);
    this.armStart();
    this.lastTime = t;
    this.seekedFlag = true;
    this.endedFired = false;
  }

  private armStart(): void {
    this.startPending = true;
    this.pendingSince = performance.now();
  }

  restart(): void {
    this.seek(0);
  }

  private clampT(t: number) {
    return Math.max(0, Math.min(this.duration, t));
  }

  private rebase(t: number) {
    this.baseTime = t;
    this.basePerf = performance.now();
    this.lastReported = -1;
  }

  /**
   * Advance once per frame. Returns time, delta and whether a discontinuity happened.
   * `now` = performance.now().
   */
  tick(now: number): { time: number; dt: number; seeked: boolean } {
    let time: number;
    if (this._playing) {
      const predicted = this.baseTime + (now - this.basePerf) / 1000;
      const reported = this.track.getTime();
      const trackAdvancing = this.track.playing;
      if (!trackAdvancing) {
        // buffering / not yet started: hold position at the reported time
        time = reported > 0 ? Math.max(reported, 0) : this.lastTime;
        this.rebase(time);
      } else if (this.startPending && !this.track.coarseClock) {
        if (reported > this.baseTime + 0.002 || now - this.pendingSince > START_HOLD_MAX_MS) {
          // the audio is audibly running: continue exactly from what is heard
          this.startPending = false;
          time = Math.max(reported, this.baseTime);
          this.rebase(time);
          this.lastReported = reported;
          this.drift = 0;
        } else {
          // scheduled but not yet heard: hold the picture at the anchor
          time = this.baseTime;
          this.basePerf = now;
        }
      } else {
        this.startPending = false;
        const drift = reported - predicted;
        this.drift = drift;
        const hard = this.track.coarseClock ? 0.6 : 0.25;
        if (Math.abs(drift) > hard) {
          this.rebase(reported);
          time = reported;
          this.seekedFlag = this.seekedFlag || Math.abs(drift) > 1.0;
        } else {
          // soft slew only when the source actually reported a new value
          if (reported !== this.lastReported) {
            this.baseTime += drift * (this.track.coarseClock ? 0.05 : 0.12);
            this.lastReported = reported;
          }
          time = this.baseTime + (now - this.basePerf) / 1000;
        }
      }
      // monotonic while playing (except explicit seeks)
      if (!this.seekedFlag && time < this.lastTime && this.lastTime - time < 0.2) time = this.lastTime;
      if (time >= this.duration) {
        time = this.duration;
        if (!this.endedFired) {
          this.endedFired = true;
          this._playing = false;
          this.track.pause();
          this.onEnded?.();
        }
      }
    } else {
      time = this.lastTime;
    }
    time = this.clampT(time);
    const dt = time - this.lastTime;
    this.lastTime = time;
    const seeked = this.seekedFlag;
    this.seekedFlag = false;
    return { time, dt, seeked };
  }

  get time(): number {
    return this.lastTime;
  }
}
