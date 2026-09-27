import type { AudioTrack } from './AudioTrack';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<any> | null = null;
/**
 * Loads the IFrame API once. A failed attempt (script error, blocked, 15 s timeout) is forgotten, so
 * the next call (the compare pane's 'Try again') makes a fresh request instead of re-using the
 * rejected promise.
 */
function loadApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  const attempt: Promise<any> = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    const s = document.createElement('script');
    let settled = false;
    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (apiPromise === attempt) apiPromise = null;
      s.remove();
      if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = prev;
      // a half-loaded API (YT.loading set, widget script missing) would make the next iframe_api
      // skip loading the widget script: start clean
      if (window.YT && !window.YT.Player) window.YT = undefined;
      reject(new Error(msg));
    };
    const ready = () => {
      prev?.();
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(window.YT);
    };
    window.onYouTubeIframeAPIReady = ready;
    const timer = setTimeout(() => fail('YouTube IFrame API timeout'), 15000);
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => fail('YouTube IFrame API could not be loaded');
    document.head.appendChild(s);
  });
  apiPromise = attempt;
  return attempt;
}

/**
 * Slave mode (the video-compare pane): a muted player the UI drives itself (play / pause / seek to
 * follow the show clock) instead of a clock source. Errors and state changes are reported through
 * callbacks, also after the player was ready (embedding blocked, video removed, HTML5 failure).
 */
export interface YouTubeSlaveOptions {
  /** start muted (muted playback may start without a user gesture) */
  muted?: boolean;
  /** YT player state changes: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued */
  onState?: (state: number) => void;
  /** YT error codes: 2 bad request, 5 HTML5 player, 100 not found / private, 101 / 150 embedding not allowed */
  onError?: (code: number) => void;
}

/**
 * Plays the OFFICIAL Endshow video through the YouTube IFrame player (visible picture-in-picture,
 * as YouTube's terms require) and exposes its time as the show clock. No media is copied.
 * The player's getCurrentTime() is coarse, so the ShowClock smooths it.
 */
export class YouTubeTrack implements AudioTrack {
  readonly kind = 'youtube' as const;
  readonly label = 'Official video (YouTube, synced picture-in-picture)';
  readonly coarseClock = true;
  private player: any = null;
  private ready = false;
  private _duration = 0;
  private state = -1;
  /** last YT error code (null = none) */
  errorCode: number | null = null;

  constructor(private videoId: string, private container: HTMLElement, private offset = 0, private slave: YouTubeSlaveOptions | null = null) {}

  /** YT player state (-1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued) */
  get playerState(): number {
    return this.state;
  }

  get isReady(): boolean {
    return this.ready;
  }

  /** the player's <iframe> (null before the player exists) */
  get iframe(): HTMLIFrameElement | null {
    try {
      return (this.player?.getIframe?.() as HTMLIFrameElement | undefined) ?? null;
    } catch {
      return null;
    }
  }

  /** the video's own clock (s), without the offset; 0 before the player is ready */
  videoTime(): number {
    return this.ready ? (this.player.getCurrentTime?.() ?? 0) : 0;
  }

  /** seek on the video's own clock (no offset) */
  seekVideo(t: number): void {
    if (this.ready) this.player.seekTo(Math.max(0, t), true);
  }

  get duration() {
    return this._duration ? this._duration - this.offset : 0;
  }

  /**
   * Only PLAYING counts as advancing: while the player buffers (3) its clock stands still, and the
   * ShowClock must hold instead of predicting ahead and snapping back.
   */
  get playing() {
    return this.state === 1;
  }

  async load(): Promise<void> {
    const YT = await loadApi();
    const host = document.createElement('div');
    this.container.appendChild(host);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('YouTube player timeout')), 20000);
      this.player = new YT.Player(host, {
        videoId: this.videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 0,
          disablekb: 1,
          ...(this.slave?.muted ? { mute: 1 } : {}),
          ...(this.slave && /^https?:/.test(location.origin) ? { origin: location.origin } : {}),
        },
        events: {
          onReady: () => {
            clearTimeout(timer);
            this.ready = true;
            this._duration = this.player.getDuration?.() ?? 0;
            resolve();
          },
          onStateChange: (e: any) => {
            this.state = e.data;
            if (!this._duration) this._duration = this.player.getDuration?.() ?? 0;
            this.slave?.onState?.(e.data);
          },
          onError: (e: any) => {
            clearTimeout(timer);
            const code = typeof e?.data === 'number' ? e.data : -1;
            this.errorCode = code;
            this.slave?.onError?.(code);
            reject(new Error(`YouTube player error ${e?.data}`));
          },
        },
      });
    });
  }

  async play() {
    if (this.ready) this.player.playVideo();
  }
  pause() {
    if (this.ready) this.player.pauseVideo();
  }
  seek(t: number) {
    if (this.ready) this.player.seekTo(Math.max(0, t + this.offset), true);
  }
  getTime() {
    return this.ready ? (this.player.getCurrentTime?.() ?? 0) - this.offset : 0;
  }
  setVolume(v: number) {
    if (this.ready) this.player.setVolume(Math.round(v * 100));
  }
  setMuted(m: boolean) {
    if (!this.ready) return;
    if (m) this.player.mute();
    else this.player.unMute();
  }
  dispose() {
    try {
      this.player?.destroy();
    } catch {
      /* ignore */
    }
    this.container.innerHTML = '';
  }
}
