import type { AudioEngine } from './AudioEngine';
import type { AudioTrack } from './AudioTrack';

/**
 * Streams a local or hosted audio file through an <audio> element routed into the Web Audio graph
 * (so perception filters and the distance model apply). Works for /assets/audio/endshow-2026.* and
 * user-picked files.
 *
 * Robustness:
 *  - `playing` is false while the element is buffering / seeking, so the ShowClock HOLDS instead of
 *    running ahead and snapping back.
 *  - show times outside the file (file shorter than the show, or negative audio time because of the
 *    offset) are covered by a silent "virtual" clock, so the show always runs to its end; when the
 *    virtual clock re-enters the file the element takes over again.
 *  - volume/mute go through a GainNode once routed into Web Audio (iOS ignores element.volume).
 */
export class MediaFileTrack implements AudioTrack {
  readonly kind = 'file' as const;
  readonly coarseClock = false;
  readonly el: HTMLAudioElement;
  /** what the track plays (for analysis): URL string or the user's File */
  readonly source: string | File;
  private node: MediaElementAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private objectUrl: string | null = null;
  private wantPlay = false;
  /** show time the element (re)started from; `playing` stays false until it is actually heard */
  private resumeAt = 0;
  private audible = false;
  private waiting = false;
  private seeking = false;
  /** silent clock covering show times outside the file */
  private virtual: { base: number; perf: number } | null = null;
  private volume = 1;
  private muted = false;
  private listeners: [string, EventListener][] = [];
  /** last media error (for UI / debug) */
  error: string | null = null;

  constructor(
    private engine: AudioEngine,
    source: string | File,
    public readonly label: string,
    /** audio time = show time + offset */
    private offset = 0,
  ) {
    this.source = source;
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.crossOrigin = 'anonymous';
    if (typeof source === 'string') this.el.src = source;
    else {
      this.objectUrl = URL.createObjectURL(source);
      this.el.src = this.objectUrl;
    }
    const on = (type: string, fn: EventListener) => {
      this.el.addEventListener(type, fn);
      this.listeners.push([type, fn]);
    };
    on('waiting', () => (this.waiting = true));
    on('playing', () => (this.waiting = false));
    on('canplaythrough', () => (this.waiting = false));
    on('seeking', () => (this.seeking = true));
    on('seeked', () => (this.seeking = false));
    on('ended', () => this.onEnded());
    on('error', () => {
      const err = this.el.error;
      this.error = err ? `media error ${err.code}${err.message ? ': ' + err.message : ''}` : 'media error';
      console.warn(`[audio] ${this.label}: ${this.error}`);
    });
  }

  /** the raw source URL (for analysis) */
  get url(): string {
    return this.el.src;
  }

  /** name / size of the underlying file (for analysis caching) */
  get fileInfo(): { name: string; size?: number } {
    if (typeof this.source !== 'string') return { name: this.source.name, size: this.source.size };
    const clean = this.source.split(/[?#]/)[0];
    return { name: decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1)) || clean };
  }

  get audioOffset(): number {
    return this.offset;
  }

  /** file duration in seconds (audio time) or NaN */
  get fileDuration(): number {
    return this.el.duration;
  }

  get duration(): number {
    const d = this.el.duration;
    return Number.isFinite(d) ? d - this.offset : 0;
  }

  get playing(): boolean {
    if (!this.wantPlay) return false;
    if (this.virtual) return true;
    if (this.el.paused || this.el.ended || this.waiting || this.seeking || this.el.readyState < 3) return false;
    // after play / seek the first samples need the output latency to reach the listener: hold the
    // show clock at the start position until then instead of running ahead and slewing back
    if (!this.audible) this.audible = this.getTime() >= this.resumeAt - 0.004;
    return this.audible;
  }

  load(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.el.readyState >= 1) return resolve();
      const ok = () => {
        cleanup();
        resolve();
      };
      const fail = () => {
        cleanup();
        reject(new Error(`cannot load audio: ${this.label}`));
      };
      const cleanup = () => {
        this.el.removeEventListener('loadedmetadata', ok);
        this.el.removeEventListener('error', fail);
      };
      this.el.addEventListener('loadedmetadata', ok);
      this.el.addEventListener('error', fail);
      this.el.load();
    });
  }

  private connect() {
    if (this.node) return;
    const ctx = this.engine.ensure();
    this.node = ctx.createMediaElementSource(this.el);
    this.gain = ctx.createGain();
    this.gain.gain.value = this.muted ? 0 : this.volume;
    this.el.volume = 1;
    this.el.muted = false;
    this.node.connect(this.gain).connect(this.engine.musicIn);
  }

  async play(): Promise<void> {
    this.connect();
    this.wantPlay = true;
    this.resumeAt = this.el.currentTime - this.offset;
    this.audible = false;
    if (this.virtual) {
      this.virtual.perf = performance.now();
      this.pump(this.virtual.base);
      return;
    }
    try {
      await this.el.play();
    } catch (e) {
      this.wantPlay = false;
      throw e;
    }
  }

  pause(): void {
    if (this.virtual) {
      this.virtual.base = this.virtualTime();
      this.virtual.perf = performance.now();
    }
    this.wantPlay = false;
    this.el.pause();
  }

  seek(t: number): void {
    const a = t + this.offset;
    const dur = this.el.duration;
    const inside = a >= 0 && (!Number.isFinite(dur) || a < dur - 0.05);
    if (!inside) {
      this.virtual = { base: t, perf: performance.now() };
      if (!this.el.paused) this.el.pause();
      return;
    }
    this.virtual = null;
    this.el.currentTime = a;
    this.resumeAt = t;
    this.audible = false;
    if (this.wantPlay && this.el.paused) void this.el.play().catch((e) => console.warn('[audio] resume after seek failed', e));
  }

  getTime(): number {
    if (this.virtual) {
      const t = this.virtualTime();
      this.pump(t);
      return t;
    }
    // while audible, report what is HEARD: the element position minus the graph/output latency
    const lat = this.node && !this.el.paused ? this.engine.outputDelay() : 0;
    return this.el.currentTime - this.offset - lat;
  }

  /**
   * Change the audio offset at runtime (e.g. after analysis found leading silence). The show time
   * stays where it is; the audio jumps to the matching position.
   */
  setOffset(offset: number): void {
    if (!Number.isFinite(offset) || Math.abs(offset - this.offset) < 1e-4) return;
    const t = this.getTime();
    this.offset = offset;
    if (Number.isFinite(t)) this.seek(t);
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
    const ctx = this.engine.ctx;
    if (this.gain && ctx) this.gain.gain.setTargetAtTime(this.muted ? 0 : this.volume, ctx.currentTime, 0.02);
    else {
      this.el.volume = this.volume;
      this.el.muted = this.muted;
    }
  }

  dispose(): void {
    this.wantPlay = false;
    this.el.pause();
    for (const [type, fn] of this.listeners) this.el.removeEventListener(type, fn);
    this.listeners.length = 0;
    try {
      this.node?.disconnect();
      this.gain?.disconnect();
    } catch {
      /* ignore */
    }
    this.el.removeAttribute('src');
    this.el.load();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  private virtualTime(): number {
    const v = this.virtual!;
    return v.base + (this.wantPlay ? (performance.now() - v.perf) / 1000 : 0);
  }

  /** virtual clock re-entered the file: hand over to the element */
  private pump(t: number): void {
    if (!this.wantPlay || !this.virtual) return;
    const a = t + this.offset;
    const dur = this.el.duration;
    if (a >= 0 && Number.isFinite(dur) && a < dur - 0.05) {
      this.virtual = null;
      this.el.currentTime = a;
      this.resumeAt = t;
      this.audible = false;
      void this.el.play().catch((e) => console.warn('[audio] resume failed', e));
    }
  }

  private onEnded(): void {
    // file shorter than the show: keep the show clock running silently until the show ends
    if (!this.wantPlay) return;
    const d = this.el.duration;
    this.virtual = { base: (Number.isFinite(d) ? d : this.el.currentTime) - this.offset, perf: performance.now() };
  }
}

/** Probe candidate URLs (HEAD) and return the first that exists. */
export async function findAudioFile(candidates: string[]): Promise<string | null> {
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      const type = res.headers.get('content-type') ?? '';
      if (res.ok && !type.includes('text/html')) return url;
    } catch {
      /* try next */
    }
  }
  return null;
}
