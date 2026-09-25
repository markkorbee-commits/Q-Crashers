import type { AudioEngine } from './AudioEngine';
import type { AudioTrack } from './AudioTrack';

/**
 * Streams a local or hosted audio file through an <audio> element routed into the Web Audio graph
 * (so perception filters apply). Works for /assets/audio/endshow-2026.* and user-picked files.
 */
export class MediaFileTrack implements AudioTrack {
  readonly kind = 'file' as const;
  readonly coarseClock = false;
  readonly el: HTMLAudioElement;
  private node: MediaElementAudioSourceNode | null = null;
  private objectUrl: string | null = null;

  constructor(
    private engine: AudioEngine,
    source: string | File,
    public readonly label: string,
    /** audio time = show time + offset */
    private offset = 0,
  ) {
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.crossOrigin = 'anonymous';
    if (typeof source === 'string') this.el.src = source;
    else {
      this.objectUrl = URL.createObjectURL(source);
      this.el.src = this.objectUrl;
    }
  }

  /** the raw source URL (for analysis) */
  get url(): string {
    return this.el.src;
  }

  get duration(): number {
    const d = this.el.duration;
    return Number.isFinite(d) ? d - this.offset : 0;
  }

  get playing(): boolean {
    return !this.el.paused && !this.el.ended;
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
    this.node.connect(this.engine.musicIn);
  }

  async play(): Promise<void> {
    this.connect();
    await this.el.play();
  }

  pause(): void {
    this.el.pause();
  }

  seek(t: number): void {
    this.el.currentTime = Math.max(0, t + this.offset);
  }

  getTime(): number {
    return this.el.currentTime - this.offset;
  }

  setVolume(v: number): void {
    this.el.volume = Math.max(0, Math.min(1, v));
  }

  setMuted(m: boolean): void {
    this.el.muted = m;
  }

  dispose(): void {
    this.el.pause();
    this.node?.disconnect();
    this.el.removeAttribute('src');
    this.el.load();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }
}

/** Probe candidate URLs (HEAD, falling back to a ranged GET) and return the first that exists. */
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
