import { AudioEngine } from './AudioEngine';
import type { AudioTrack } from './AudioTrack';
import { SynthEngine, type SynthShowSource } from './synth/SynthEngine';
import { renderSynthSamples, type SynthSamples } from './synth/SynthSamples';

/** scheduler horizon (s) while the tab is visible / hidden (timers are throttled when hidden) */
const LOOKAHEAD = 0.2;
const LOOKAHEAD_HIDDEN = 1.4;
const TICK_MS = 25;
/** latency between a (re)start request and the first scheduled sample */
const START_DELAY = 0.05;

/**
 * Deterministic synthesized REHEARSAL track: follows the show's tempo map, sections and chapters
 * so the show feels alive without the original audio. Time is derived from the AudioContext clock
 * (what is actually being heard, compensating output latency), so visuals and audio stay locked.
 */
export class SynthTrack implements AudioTrack {
  readonly kind = 'synth' as const;
  readonly label = 'Rehearsal track (synthesized)';
  readonly coarseClock = false;
  private engine: SynthEngine | null = null;
  private samples: SynthSamples | null = null;
  private gain: GainNode | null = null;
  private _playing = false;
  private pausedAt = 0;
  private showStart = 0;
  private ctxStart = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private volume = 1;
  private muted = false;
  private loading: Promise<void> | null = null;
  private disposed = false;
  /** while paused the whole synth graph is detached (after its tails) so it costs no CPU */
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private attached = false;

  constructor(
    private audio: AudioEngine,
    private show: SynthShowSource,
    private opts: { lite?: boolean; level?: number } = {},
  ) {}

  get duration(): number {
    return this.show.duration;
  }

  get playing(): boolean {
    return this._playing && this.audio.ctx?.state === 'running';
  }

  load(): Promise<void> {
    if (!this.loading) this.loading = this.doLoad();
    return this.loading;
  }

  private async doLoad(): Promise<void> {
    const ctx = this.audio.ensure();
    const t0 = performance.now();
    this.samples = await renderSynthSamples(ctx.sampleRate, SynthEngine.rootsFor(this.show));
    if (this.disposed) return;
    this.gain = ctx.createGain();
    this.gain.gain.value = this.targetGain();
    this.engine = new SynthEngine(ctx, this.gain, this.show, this.samples, { lite: this.opts.lite });
    console.info(`[synth] rehearsal track ready (${Math.round(performance.now() - t0)} ms)`);
  }

  private targetGain(): number {
    return this.muted ? 0 : this.volume * (this.opts.level ?? 0.8);
  }

  async play(): Promise<void> {
    if (this._playing) return;
    await this.load();
    const ctx = this.audio.ensure();
    if (ctx.state !== 'running') {
      await Promise.race([ctx.resume().catch(() => undefined), new Promise((r) => setTimeout(r, 1500))]);
    }
    if (this.disposed || !this.engine) return;
    this.attach(true);
    this._playing = true;
    this.startAt(this.pausedAt);
    this.timer ??= setInterval(this.tick, TICK_MS);
  }

  pause(): void {
    if (!this._playing) return;
    this.pausedAt = this.getTime();
    this._playing = false;
    this.engine?.killSession();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.attach(false);
  }

  /** connect now / detach once the reverb tail has rung out */
  private attach(on: boolean): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    if (!this.gain) return;
    if (on) {
      if (!this.attached) this.gain.connect(this.audio.musicIn);
      this.attached = true;
      return;
    }
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (this._playing || !this.gain || !this.attached) return;
      try {
        this.gain.disconnect();
      } catch {
        /* ignore */
      }
      this.attached = false;
    }, 3500);
  }

  seek(t: number): void {
    const tt = Math.max(0, Math.min(this.duration, t));
    if (this._playing && this.engine) this.startAt(tt);
    else this.pausedAt = tt;
  }

  /** show time of the audio being HEARD right now */
  getTime(): number {
    if (!this._playing) return this.pausedAt;
    // the synth's glue compressor and the master limiter each add a look-ahead delay
    const heard = this.heardContextTime() - 2 * AudioEngine.COMPRESSOR_DELAY;
    return Math.min(this.duration, this.showStart + Math.max(0, heard - this.ctxStart));
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyGain();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyGain();
  }

  private applyGain() {
    const ctx = this.audio.ctx;
    if (this.gain && ctx) this.gain.gain.setTargetAtTime(this.targetGain(), ctx.currentTime, 0.03);
  }

  dispose(): void {
    this.disposed = true;
    this.pause();
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.engine?.dispose();
    this.engine = null;
    try {
      this.gain?.disconnect();
    } catch {
      /* ignore */
    }
    this.attached = false;
  }

  /** debug / stats */
  stats(): Record<string, number | string> {
    return { voices: this.engine?.activeVoices() ?? 0, started: this.engine?.voices ?? 0 };
  }

  private startAt(t: number): void {
    const ctx = this.audio.ctx!;
    this.showStart = t;
    this.ctxStart = ctx.currentTime + START_DELAY;
    this.engine!.startSession(t, this.ctxStart);
    this.tick();
  }

  private tick = (): void => {
    const ctx = this.audio.ctx;
    if (!this._playing || !ctx || !this.engine) return;
    const la = typeof document !== 'undefined' && document.hidden ? LOOKAHEAD_HIDDEN : LOOKAHEAD;
    const horizon = this.showStart + (ctx.currentTime + la - this.ctxStart);
    this.engine.scheduleUntil(horizon);
  };

  /**
   * Context time currently reaching the speakers. Uses getOutputTimestamp() (extrapolated with
   * performance.now for sub-callback smoothness) and falls back to currentTime - output latency.
   */
  private heardContextTime(): number {
    const ctx = this.audio.ctx!;
    const fallback = ctx.currentTime - (ctx.baseLatency || 0) - ((ctx as AudioContext & { outputLatency?: number }).outputLatency || 0);
    try {
      const ts = ctx.getOutputTimestamp?.();
      if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.contextTime > 0 && ts.performanceTime > 0) {
        const est = ts.contextTime + Math.max(0, performance.now() - ts.performanceTime) / 1000;
        if (Math.abs(est - fallback) < 0.35 && est <= ctx.currentTime + 0.01) return est;
      }
    } catch {
      /* fall through */
    }
    return fallback;
  }
}

/** Offline render of the rehearsal track (tests, analyzer self-check, exports). */
export async function renderSynthOffline(show: SynthShowSource, t0: number, seconds: number, sampleRate = 44100, lite = false): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const samples = await renderSynthSamples(sampleRate, SynthEngine.rootsFor(show));
  const eng = new SynthEngine(ctx, ctx.destination, show, samples, { lite });
  eng.output.gain.value = 0.8;
  eng.startSession(t0, 0);
  eng.scheduleUntil(t0 + seconds);
  return ctx.startRendering();
}
