import { YouTubeTrack } from '../audio/YouTubeTrack';
import { IS_ARTIFACT } from '../core/target';
import type { FrameContext } from '../core/types';
import { cameraRig } from './contracts';
import { h, setText, toggleClass } from './dom';
import { icon } from './icons';
import { prefs } from './settings';
import type { UI } from './UI';

/** measured offset of the official video against show time: show = video − 0.036 s (CLAUDE.md, timing rules) */
export const VIDEO_OFFSET = 0.036;
/** playing: re-seek the muted video only beyond this drift (its clock is coarse; a seek while playing buffers) */
const DRIFT_SEEK = 0.4;
/** after a play / pause / seek command, drift is not judged for this long (s): the player buffers */
const SETTLE = 1.2;
/** at least this long between two drift re-seeks (s) */
const SEEK_GAP = 2.5;
/** playing: show seeks (a scrub while playing) reach the video at most this often (s) */
const PLAY_SEEK_GAP = 0.25;
/** paused: the still frame follows seeks (scrubbing) at most this often (s) */
const PAUSED_SEEK_GAP = 0.15;
/** paused: a still frame this far off the show (s) is sought again */
const PAUSED_TOL = 0.08;
/** first settle after a play / seek this far off (s): one corrective seek with the lead just learnt */
const LEAD_FIX = 0.08;
/** a play that has not started after this long (s) is issued again */
const REPLAY_AFTER = 2.5;
/** "should play, but the video's clock stands still" for this long (s): say so in the status */
const STALL_WARN = 5;
/** height of the pane's title bar (px; CSS .vcmp-bar) */
const BAR = 34;
const BAR_COMPACT = 30;
const GAP = 8;
/** YouTube's minimum embedded player size is 200 x 200 px: a 16:9 picture needs this width for 200 px height */
const MIN_W = 356;
/** fallbacks when the HUD has no layout box yet (px): toolbar bottom edge, show bar height */
const TOOLBAR_BOTTOM = 60;
const SHOWBAR_H = 114;
const SHOWBAR_H_TOUCH = 56;
/** non-touch screens stack only when that gives clearly larger pictures than side by side */
const STACK_BONUS = 1.1;

export type CompareLayout = 'side' | 'stack';
type Status = 'closed' | 'loading' | 'sync' | 'drift' | 'syncing' | 'buffering' | 'paused' | 'stalled' | 'error';

const STATUS_TEXT: Record<Status, string> = {
  closed: '',
  loading: 'Connecting to YouTube…',
  sync: 'In sync',
  drift: 'Within 0.4 s',
  syncing: 'Syncing…',
  buffering: 'Buffering…',
  paused: 'Paused · in sync',
  stalled: 'Waiting for YouTube (buffering or an ad)',
  error: 'Unavailable',
};

/** a pixel box */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** one computed split of the window */
interface Split {
  side: boolean;
  bar: number;
  video: Box;
  canvas: Box;
  region: Box;
  /** desktop side by side: the show bar spans both pictures in the band below them (x, w) */
  showbar: { x: number; w: number } | null;
}

/** layer id of the "Reduce flashing is on" question */
const CONFIRM_ID = 'cmp-confirm';
const TOO_SMALL = 'The window is too small for the compare view: YouTube needs the video at least 200 px high. Turn the device or enlarge the window.';

/** YouTube error code -> what the viewer is told */
function errorText(code: number): string {
  if (code === 101 || code === 150 || code === 153) return 'The owner of the video does not allow it to be played in embedded players.';
  if (code === 100) return 'The video is unavailable (removed or private).';
  if (code === 5) return 'The YouTube player could not play the video in this browser.';
  if (code === 2) return 'YouTube rejected the request.';
  if (code === -2) return 'YouTube could not be reached: offline, or blocked by a content blocker or the network.';
  return `YouTube reported an error (${code}).`;
}

/**
 * Compare mode: our render next to the OFFICIAL Endshow video, synced to show time.
 *
 * The video is the YouTube embed (nothing of it is copied or stored), played as a MUTED SLAVE: the
 * show clock and the local audio stay the master (perception filters, distance delay). The slave
 * follows play / pause, jumps along with every show seek, and re-seeks only when its (coarse) clock
 * drifts more than 0.4 s; a learnt lead compensates the time a seek needs to start playing again.
 * The measured offset applies: video time = show time + 0.036 s.
 *
 * Layout is a real split, nothing ever overlays the player (YouTube's rules): side by side on
 * landscape screens (video left, render right, two equal 16:9 pictures at the same height), stacked
 * on portrait screens and phones held upright (video on top, render below). The canvas gets its own
 * 16:9 box (App.resize follows the canvas box), so the Show camera frames exactly what the video
 * shows; the interface (#ui) is confined to the render side, and the split keeps the toolbar and show
 * bar bands free so neither covers the render. The player is never smaller than YouTube's 200 x 200
 * px minimum: a window too small for that gets a message instead. Touch landscape also puts the
 * render on the right: the thumb controls swipe-look on the right half and sit bottom-right.
 *
 * Photosensitivity: the official video cannot be damped. With "Reduce flashing" on, opening it asks
 * first (Cancel is the default); `?autostart` (the harness path) only says so in a toast.
 *
 * Not in the claude.ai artifact (no third-party iframes there): it says so instead. With the
 * official video already the audio source (picture-in-picture master) it asks to switch first.
 */
export class VideoCompare {
  readonly pane: HTMLElement;
  private slot: HTMLElement;
  private msg: HTMLElement;
  private statusEl: HTMLElement;
  private statusText: HTMLElement;
  private driftEl: HTMLElement;
  private camBtn: HTMLButtonElement;
  private track: YouTubeTrack | null = null;
  private gen = 0;
  private _open = false;
  layoutMode: CompareLayout = 'side';
  /** sync state, readable for QA as window.__ui.compare.stats */
  readonly stats = {
    status: 'closed' as Status,
    /** smoothed video − (show + offset) while playing (s) */
    drift: 0,
    /** last raw drift sample (s) */
    raw: 0,
    /** largest |smoothed drift| since the last seek settled (s) */
    maxAbsDrift: 0,
    /** seeks issued by the sync (show seeks included) */
    seeks: 0,
    /** re-seeks caused by drift alone */
    driftSeeks: 0,
    /** learnt start-up lead for seeks while playing (s; measured ~0.05 s cold here, a few 10 ms warm) */
    lead: 0.05,
    /** corrective seeks after a first settle more than LEAD_FIX off */
    leadFixes: 0,
    errorCode: null as number | null,
  };
  private lastV = -1;
  private lastVAt = 0;
  private cmdAt = 0;
  private seekAt = -1e9;
  private wantPlaying = false;
  private leadCheck = false;
  /** the one corrective seek per play / seek was used */
  private leadFixed = false;
  /** paused: a seek was sent to a player that was not paused (cued / ended / playing): pause it as soon as it runs */
  private pauseDue = false;
  /** "Open it anyway" was confirmed for this visit with Reduce flashing on (reset when it is switched on again) */
  private flashConsent = false;
  /** a show seek / play start the video still has to follow (throttled while scrubbing) */
  private seekPending = false;
  private settled = false;
  private pausedTarget = -1;
  private pausedTries = 0;
  private stall = 0;
  private uiAcc = 0;
  private lastDriftText = '';
  private link: HTMLAnchorElement;

  constructor(private ui: UI) {
    this.statusText = h('span', null, '');
    this.statusEl = h('span', { class: 'vcmp-st', role: 'status', 'aria-live': 'polite' }, h('i'), this.statusText);
    this.driftEl = h('span', { class: 'vcmp-drift', title: 'Video minus show time (the measured 0.036 s offset applied)' }, '');
    this.camBtn = h('button', { class: 'btn small ghost vcmp-cam', type: 'button', title: 'The Show camera follows the official edit shot by shot (5)', html: `${icon('film')}<span>Show camera</span>` });
    this.camBtn.addEventListener('click', () => {
      cameraRig(this.ui.app)?.setMode?.('showcam');
    });
    const close = h('button', { class: 'icon-btn vcmp-x', type: 'button', 'aria-label': 'Close the video compare (B)', 'data-tip': 'Close (B)', 'data-tip-pos': 'left', html: icon('close') });
    close.addEventListener('click', () => this.close());
    this.slot = h('div', { class: 'vcmp-video' });
    this.link = h('a', { class: 'btn small ghost', href: '#', target: '_blank', rel: 'noopener noreferrer', html: `${icon('broadcast')}<span>Watch on YouTube</span>` });
    this.link.addEventListener('pointerdown', () => this.updateLink());
    this.link.addEventListener('focus', () => this.updateLink());
    const retry = h('button', { class: 'btn small', type: 'button', html: `${icon('restart')}<span>Try again</span>` });
    retry.addEventListener('click', () => this.createPlayer());
    this.msg = h('div', { class: 'vcmp-msg', role: 'alert' }, h('b', null, 'The official video cannot be shown here'), h('p', null, ''), h('div', { class: 'vcmp-msg-actions' }, retry, this.link));
    this.pane = h(
      'aside',
      { class: 'vcmp glass strong', 'aria-label': 'Official video (YouTube), muted and synced to the show' },
      h('header', { class: 'vcmp-bar' }, h('span', { class: 'vcmp-t' }, 'Official video'), this.statusEl, this.driftEl, h('span', { class: 'grow' }), this.camBtn, close),
      this.slot,
      this.msg,
    );
    // the touch controls listen on #app: a tap on the pane must not start walking / looking
    this.pane.addEventListener('pointerdown', (e) => e.stopPropagation());
    // before #ui in the document: Tab goes from the pane's buttons on into the interface
    const parent = ui.root.parentElement;
    if (parent) parent.insertBefore(this.pane, ui.root);
    else document.body.appendChild(this.pane);
    window.addEventListener('resize', () => this.layout());
    // a click on the video (pause) moves the focus into the cross-origin iframe, where the show's
    // keys (K, B, J / L, Esc) no longer arrive: take it back right after the click
    window.addEventListener('blur', () => {
      if (!this._open) return;
      setTimeout(() => {
        const f = this.track?.iframe;
        if (!f || document.activeElement !== f) return;
        f.blur();
        window.focus();
      }, 0);
    });
  }

  get isOpen(): boolean {
    return this._open;
  }

  toggle(): void {
    if (this._open) this.close();
    else this.open();
  }

  open(): void {
    if (this._open) return;
    const ui = this.ui;
    const app = ui.app;
    if (ui.layers.isOpen(CONFIRM_ID)) return;
    if (IS_ARTIFACT) {
      ui.toast('Compare with the official video is available on the full website: this artifact cannot embed YouTube.', 4200, 'info');
      return;
    }
    if (!app.ready || !app.show.file.meta.audio.youtubeId) return;
    if (app.clock.track.kind === 'youtube') {
      ui.toast('The official video is already your audio source (picture-in-picture). Switch the audio source in the top bar to compare side by side.', 5200, 'broadcast');
      return;
    }
    if (!this.split()) {
      ui.toast(TOO_SMALL, 5200, 'compare');
      return;
    }
    // the official video is shown as published: with Reduce flashing on, ask first (not on the harness path)
    if (prefs.reduceFlashing && !ui.autostart && !this.flashConsent) {
      void this.confirmFlashing().then((ok) => {
        if (!ok) return;
        this.flashConsent = true;
        this.open();
      });
      return;
    }
    this._open = true;
    document.documentElement.classList.add('vcmp-on');
    this.pane.classList.add('show');
    ui.hud.setToggle('compare', true);
    this.layout();
    if (!this._open) return;
    this.createPlayer();
    this.onCameraMode(ui.camMode());
    if (prefs.reduceFlashing && ui.autostart) ui.toast('Reduce flashing is on: the official video is shown as published (its flashes are not reduced)', 4200, 'warning');
    else if (ui.camMode() !== 'showcam') ui.toast('Compare: the Show camera (5) follows the official edit shot by shot', 3200, 'film');
  }

  /** "Reduce flashing" was switched: on closes the pane (its video cannot be damped) and asks again next time */
  onReduceFlashing(on: boolean): void {
    if (!on) return;
    this.flashConsent = false;
    if (this._open && !this.ui.autostart) this.close('Compare closed: the official video’s strobes and flashes cannot be reduced. B opens it again.');
  }

  /**
   * Reduce flashing is on: the official video in the pane is not damped. Cancel is the default
   * (autofocus, Escape, a click outside); "Open it anyway" ignores the second click of a double click.
   */
  private confirmFlashing(): Promise<boolean> {
    const ui = this.ui;
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        ui.layers.close(CONFIRM_ID, true);
        resolve(ok);
      };
      const cancel = h('button', { class: 'btn primary', type: 'button', autofocus: true }, 'Cancel');
      cancel.addEventListener('click', () => finish(false));
      const go = h('button', { class: 'btn ghost', type: 'button', html: `${icon('compare')}<span>Open it anyway</span>` });
      const openedAt = performance.now();
      go.addEventListener('click', (e) => {
        if (e.detail > 1 || performance.now() - openedAt < 500) return;
        finish(true);
      });
      const card = h(
        'div',
        { class: 'card glass strong rule-top gate cmp-confirm', 'aria-labelledby': 'cmpc-title', 'aria-describedby': 'cmpc-desc' },
        h('div', { class: 'gate-kicker' }, h('span', { html: icon('warning'), style: 'display:contents' }), h('span', { class: 'kicker' }, 'Reduce flashing is on')),
        h('h3', { id: 'cmpc-title' }, 'Open the official video?'),
        h('p', { id: 'cmpc-desc', class: 'gate-lead' }, 'The official video is shown as published: its strobes and flashes cannot be reduced. Open it anyway?'),
        h('div', { class: 'actions' }, cancel, go),
      );
      ui.layers.open(CONFIRM_ID, card, { kind: 'modal', onClose: () => finish(false) });
      card.setAttribute('role', 'alertdialog');
    });
  }

  /** close the pane and give the whole window back to the render */
  close(note?: string): void {
    if (!this._open) return;
    this._open = false;
    this.disposePlayer();
    this.pane.classList.remove('show', 'failed');
    const root = document.documentElement;
    root.classList.remove('vcmp-on', 'vcmp-side', 'vcmp-stack');
    root.classList.remove('vcmp-sbw');
    for (const k of ['cx', 'cy', 'cw', 'ch', 'ux', 'uy', 'uw', 'uh', 'bx', 'bw']) root.style.removeProperty(`--vc-${k}`);
    this.ui.hud.setToggle('compare', false);
    this.setStatus('closed');
    this.afterLayout();
    if (note) this.ui.toast(note, 3600, 'broadcast');
  }

  onCameraMode(mode: string): void {
    this.camBtn.hidden = mode === 'showcam';
  }

  // ---------------------------------------------------------------------------------------------
  // player
  // ---------------------------------------------------------------------------------------------

  private createPlayer(): void {
    this.disposePlayer();
    const gen = ++this.gen;
    const id = this.ui.app.show.file.meta.audio.youtubeId;
    if (!id) return;
    this.pane.classList.remove('failed');
    this.stats.errorCode = null;
    this.setStatus('loading');
    const host = h('div', { class: 'vcmp-host' });
    this.slot.appendChild(host);
    const tr = new YouTubeTrack(id, host, 0, {
      muted: true,
      onError: (code) => {
        if (gen === this.gen) this.fail(code);
      },
      onState: (s) => {
        if (gen === this.gen) this.onPlayerState(s);
      },
    });
    this.track = tr;
    this.resetSync();
    tr.load().then(
      () => {
        if (gen !== this.gen) return;
        tr.setMuted(true);
        // out of the Tab order: the player has no controls of its own (controls:0, disablekb) and
        // focus inside it swallows the show's keys
        const f = tr.iframe;
        if (f) f.tabIndex = -1;
        this.cmdAt = performance.now();
      },
      () => {
        if (gen === this.gen) this.fail(tr.errorCode ?? -2);
      },
    );
  }

  private disposePlayer(): void {
    this.gen++;
    this.track?.dispose();
    this.track = null;
    this.slot.textContent = '';
    this.resetSync();
  }

  private resetSync(): void {
    this.lastV = -1;
    this.lastVAt = performance.now();
    this.cmdAt = performance.now();
    this.seekAt = -1e9;
    this.wantPlaying = false;
    this.leadCheck = false;
    this.leadFixed = false;
    this.pauseDue = false;
    this.seekPending = false;
    this.settled = false;
    this.pausedTarget = -1;
    this.pausedTries = 0;
    this.stall = 0;
    this.stats.drift = this.stats.raw = this.stats.maxAbsDrift = 0;
  }

  /** the player is replaced by the message (never drawn over it) */
  private fail(code: number): void {
    this.disposePlayer();
    this.stats.errorCode = code;
    const p = this.msg.querySelector('p');
    if (p) p.textContent = errorText(code);
    this.pane.classList.add('failed');
    this.setStatus('error');
    this.updateLink();
  }

  private updateLink(): void {
    const id = this.ui.app.show.file.meta.audio.youtubeId ?? '';
    const t = Math.max(0, Math.floor((this.ui.app.clock?.time ?? 0) + VIDEO_OFFSET));
    this.link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}&t=${t}s`;
  }

  /**
   * A pause from inside the video (a click on the picture) pauses the show as well, instead of the
   * sync resuming the video against the viewer's will. Only for a visible page and well after the
   * sync's own last command (the player also pauses on its own when a tab is hidden).
   */
  private onPlayerState(s: number): void {
    if (s !== 2 || !this.wantPlaying || document.visibilityState !== 'visible') return;
    if (performance.now() - this.cmdAt < 1500 || !this.ui.app.clock.playing) return;
    this.wantPlaying = false;
    this.ui.togglePlay();
  }

  private seek(t: number, now: number): void {
    this.track?.seekVideo(t);
    this.seekAt = this.cmdAt = now;
    this.stats.seeks++;
    this.settled = false;
  }

  /**
   * Per frame (UI frame hook). Allocation-free; does nothing while the pane is closed. The video's
   * clock is a coarse postMessage snapshot: it is extrapolated from the moment its value last changed.
   */
  frame(ctx: FrameContext): void {
    if (!this._open) return;
    const tr = this.track;
    this.uiAcc += ctx.dt;
    if (!tr || !tr.isReady) {
      if (this.uiAcc > 0.25) this.uiAcc = 0;
      return;
    }
    const app = this.ui.app;
    const now = performance.now();
    const target = ctx.showTime + VIDEO_OFFSET;
    const playing = ctx.showPlaying && ctx.showTime < app.show.duration - 0.05;
    const st = tr.playerState;
    const v = tr.videoTime();
    if (v !== this.lastV) {
      this.lastV = v;
      this.lastVAt = now;
    }
    const sinceCmd = (now - this.cmdAt) / 1000;
    const advancing = st === 1 && now - this.lastVAt < 1500;
    const s = this.stats;

    if (playing) {
      this.pausedTarget = -1;
      this.pauseDue = false;
      if (!this.wantPlaying || ctx.seeked) this.seekPending = true;
      if (this.seekPending && now - this.seekAt > PLAY_SEEK_GAP * 1000) {
        // play / show seek: jump along, a little ahead for the time the player needs to (re)start
        this.seekPending = false;
        this.seek(target + s.lead, now);
        this.leadCheck = true;
        this.leadFixed = false;
      }
      if (!this.wantPlaying || (st !== 1 && st !== 3 && sinceCmd > REPLAY_AFTER)) {
        tr.play();
        this.wantPlaying = true;
        this.cmdAt = now;
      }
      // judged only well after the last command (a command issued this frame restarts the wait)
      if (advancing && !this.seekPending && now - this.cmdAt > SETTLE * 1000) {
        const est = v + Math.min(1, (now - this.lastVAt) / 1000);
        const raw = est - target;
        s.raw = raw;
        if (!this.settled) {
          this.settled = true;
          s.drift = raw;
          s.maxAbsDrift = 0;
          if (this.leadCheck) {
            // a seek lands late by the player's start-up time: learn it for the next one
            this.leadCheck = false;
            s.lead = Math.max(0, Math.min(1.5, s.lead - raw * 0.8));
            // noticeably off but below the drift re-seek (0.4 s), it would stay that way for minutes:
            // seek once more with the lead just learnt (once per play / seek, so it cannot loop)
            if (!this.leadFixed && Math.abs(raw) > LEAD_FIX) {
              this.leadFixed = true;
              s.leadFixes++;
              this.seek(target + s.lead, now);
              this.leadCheck = true;
            }
          }
        } else {
          s.drift += (raw - s.drift) * (1 - Math.exp(-ctx.dt / 0.5));
        }
        const ad = Math.abs(s.drift);
        if (ad > s.maxAbsDrift) s.maxAbsDrift = ad;
        if (ad > DRIFT_SEEK && now - this.seekAt > SEEK_GAP * 1000) {
          this.seek(target + s.lead, now);
          this.leadCheck = true;
          this.leadFixed = false;
          s.driftSeeks++;
        }
      }
      this.stall = advancing ? 0 : this.stall + ctx.dt;
    } else {
      this.stall = 0;
      this.seekPending = false;
      // paused / ended: stop the video, then hold its still frame on the show's
      if (this.wantPlaying || ((st === 1 || st === 3) && sinceCmd > 0.4) || (st === 1 && this.pauseDue)) {
        tr.pause();
        this.wantPlaying = false;
        this.pauseDue = false;
        this.cmdAt = now;
      }
      const sinceSeek = (now - this.seekAt) / 1000;
      if (Math.abs(target - this.pausedTarget) > 0.01) {
        if (sinceSeek > PAUSED_SEEK_GAP) {
          this.seek(target, now);
          this.pausedTarget = target;
          this.pausedTries = 0;
          // seekTo starts a cued / unstarted / ended player (it has to, to load the frame): pause it
          // the moment it reports playing instead of 0.4 s later (no visible motion while paused)
          if (st !== 2) this.pauseDue = true;
        }
      } else if (st === 2 && Math.abs(v - target) > PAUSED_TOL && sinceSeek > 0.8 && this.pausedTries < 3) {
        this.seek(target, now);
        this.pausedTries++;
      }
    }

    // status chip + drift readout, 4 times a second
    if (this.uiAcc < 0.25) return;
    this.uiAcc = 0;
    let status: Status;
    // paused: 'in sync' only once the player holds a frame (not while it still loads one)
    if (!playing) status = st === 3 ? 'buffering' : st === -1 || st === 5 || this.pauseDue ? 'syncing' : 'paused';
    else if (this.stall > STALL_WARN) status = 'stalled';
    else if (st === 3 || !advancing) status = 'buffering';
    else if (!this.settled) status = 'syncing';
    // amber within the tolerance (no re-seek below 0.4 s), green when tight
    else status = Math.abs(s.drift) < 0.1 ? 'sync' : 'drift';
    this.setStatus(status);
    const dt = playing && this.settled ? `Δ ${s.drift >= 0 ? '+' : '−'}${Math.abs(s.drift).toFixed(2)} s` : '';
    if (dt !== this.lastDriftText) {
      this.lastDriftText = dt;
      setText(this.driftEl, dt);
    }
  }

  private setStatus(st: Status): void {
    if (this.stats.status === st && this.statusText.textContent) return;
    this.stats.status = st;
    setText(this.statusText, STATUS_TEXT[st]);
    this.statusEl.dataset.s = st;
    if (st !== 'sync' && st !== 'drift') {
      this.lastDriftText = '';
      setText(this.driftEl, '');
    }
  }

  // ---------------------------------------------------------------------------------------------
  // layout
  // ---------------------------------------------------------------------------------------------

  /**
   * Compute the split of the window (no DOM writes), or null when the window cannot show the video at
   * YouTube's minimum size either way. Side by side: two equal 16:9 pictures at the same height (video
   * left with its title bar above it, render right), placed between the toolbar band and the show bar
   * band; the render column holds the interface, and on desktops the show bar spans both pictures in
   * the band below them. Stacked: the video on top, the render right under the interface's toolbar
   * (the two pictures close together), the show bar below it; free space collects above the show bar.
   * Desktops stack only for clearly larger pictures; touch devices stack when upright and go side by
   * side when turned (each falls back to the other when its pictures would be too small).
   */
  private split(): Split | null {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const touch = this.ui.root.classList.contains('touch');
    const bar = touch || W < 640 || H < 520 ? BAR_COMPACT : BAR;
    // the interface bands (measured; the HUD may not have a box yet on the first open)
    const tb = this.ui.hud.toolbar;
    const sb = this.ui.hud.showbar;
    const TB = (tb.offsetHeight ? tb.offsetTop + tb.offsetHeight : TOOLBAR_BOTTOM) + GAP / 2;
    let sbBottom = 14;
    try {
      sbBottom = parseFloat(getComputedStyle(sb).bottom) || 14;
    } catch {
      /* no computed style */
    }
    const SB = (sb.offsetHeight || (touch ? SHOWBAR_H_TOUCH : SHOWBAR_H)) + sbBottom + GAP / 2;
    // side by side: the render between the two bands, the video level with it (its bar above it)
    const sideTop = Math.max(TB, bar + GAP);
    const sideW = Math.max(0, Math.min((W - 3 * GAP) / 2, ((H - sideTop - SB) * 16) / 9));
    // stacked: GAP, video bar + picture, GAP / 2, toolbar band, render picture, show bar band
    const stackW = Math.max(0, Math.min(W - 2 * GAP, (((H - 1.5 * GAP - bar - TB - SB) / 2) * 16) / 9));
    let side = touch ? W > H : sideW * STACK_BONUS >= stackW;
    if ((side ? sideW : stackW) < MIN_W) side = !side;
    const pw = Math.floor(side ? sideW : stackW);
    if (pw < MIN_W) return null;
    const ph = Math.round((pw * 9) / 16);
    if (side) {
      // the two pictures meet in the middle, GAP apart, at the same height
      const half = Math.round(W / 2);
      const top = Math.round(sideTop + Math.max(0, (H - sideTop - SB - ph) / 2));
      const vx = half - GAP / 2 - pw;
      return {
        side,
        bar,
        video: { x: vx, y: top - bar, w: pw, h: ph + bar },
        region: { x: half, y: 0, w: W - half, h: H },
        canvas: { x: half + GAP / 2, y: top, w: pw, h: ph },
        // (touch keeps its slim show bar in the render column: the thumb controls sit above it)
        showbar: touch ? null : { x: vx, w: 2 * pw + GAP },
      };
    }
    const video = { x: Math.round((W - pw) / 2), y: GAP, w: pw, h: ph + bar };
    const ry = video.y + video.h + GAP / 2;
    return {
      side,
      bar,
      video,
      region: { x: 0, y: ry, w: W, h: H - ry },
      canvas: { x: Math.round((W - pw) / 2), y: Math.round(ry + TB), w: pw, h: ph },
      showbar: null,
    };
  }

  /** apply the split (open, window resize); a window that became too small closes the compare */
  layout(): void {
    if (!this._open) return;
    const sp = this.split();
    if (!sp) {
      this.close(TOO_SMALL);
      return;
    }
    const { side, bar, video, canvas, region } = sp;
    this.layoutMode = side ? 'side' : 'stack';
    const root = document.documentElement;
    root.classList.toggle('vcmp-side', side);
    root.classList.toggle('vcmp-stack', !side);
    root.classList.toggle('vcmp-sbw', !!sp.showbar);
    const set = (k: string, v: number) => root.style.setProperty(`--vc-${k}`, `${v}px`);
    set('cx', canvas.x);
    set('cy', canvas.y);
    set('cw', canvas.w);
    set('ch', canvas.h);
    set('ux', region.x);
    set('uy', region.y);
    set('uw', region.w);
    set('uh', region.h);
    if (sp.showbar) {
      set('bx', sp.showbar.x);
      set('bw', sp.showbar.w);
    }
    const ps = this.pane.style;
    ps.left = `${video.x}px`;
    ps.top = `${video.y}px`;
    ps.width = `${video.w}px`;
    ps.setProperty('--vc-bar', `${bar}px`);
    toggleClass(this.pane, 'compact', bar === BAR_COMPACT);
    this.afterLayout();
  }

  /** the canvas and the interface changed their boxes: size the drawing buffer now (no stretched frame) */
  private afterLayout(): void {
    this.ui.app.resize();
    this.ui.hud.relayout();
    this.ui.perc.relayout();
    this.ui.pip.layout();
  }
}
