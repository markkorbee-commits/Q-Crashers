import type { AudioTrack } from './AudioTrack';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<any> | null = null;
function loadApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => reject(new Error('YouTube IFrame API could not be loaded'));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error('YouTube IFrame API timeout')), 15000);
  });
  return apiPromise;
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

  constructor(private videoId: string, private container: HTMLElement, private offset = 0) {}

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
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 0, disablekb: 1 },
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
          },
          onError: (e: any) => {
            clearTimeout(timer);
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
