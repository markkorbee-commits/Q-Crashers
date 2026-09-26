import type { BarSystem } from '../bar/BarSystem';
import { barById } from '../bar/bars';
import type { App } from '../core/App';
import { QUALITY_PRESETS } from '../core/Quality';
import type { FrameContext, Interactable, NamedSpot, QualityLevel } from '../core/types';
import { debugState } from '../debug/debugState';
import { AudioFlow } from './AudioFlow';
import { BarMenu } from './BarMenu';
import { openEnded, openHelp, openOnboarding } from './Cards';
import { CAMERA_MODES, cameraRig, player, tryCall, type CameraLike, type CamMode } from './contracts';
import { h, isTypingTarget, store } from './dom';
import { installGrain } from './grain';
import { Hud } from './Hud';
import { icon } from './icons';
import { Landing } from './Landing';
import { Layers } from './Layers';
import { openAudioMenu, openCameraSheet, openCrowd, openMoments, openPositions, openQuality } from './menus';
import { PerceptionUI } from './PerceptionUI';
import { PhotoPanel } from './PhotoPanel';
import { PiP } from './PiP';
import { prefs, savePref } from './settings';
import { Toasts } from './Toasts';

const LOCK_MODES = new Set(['first', 'third', 'free', 'photo']);
const DIGIT_MODES: Record<string, CamMode> = { Digit1: 'first', Digit2: 'third', Digit3: 'free', Digit4: 'flyover', Digit5: 'showcam', Digit6: 'photo' };
/** play / skip / mute: also active while a panel is open */
const MEDIA_KEYS = new Set(['KeyK', 'KeyJ', 'KeyL', 'KeyM']);
/** shortcuts still active in photo mode (F = autofocus there, not fullscreen) */
const PHOTO_KEYS = new Set(['KeyO', 'KeyH', 'KeyF', 'KeyK', 'KeyJ', 'KeyL', 'KeyM', ...Object.keys(DIGIT_MODES)]);
/** seconds between the last show frame and the "Thank you" card (the final image breathes first) */
const END_CARD_DELAY = 5;

/**
 * DOM overlay: landing, audio source, onboarding, HUD show controls, menus, photo / cinema modes,
 * toasts, bar ordering. The UI talks to the App; systems never import UI.
 */
export class UI {
  readonly root: HTMLElement;
  readonly layers: Layers;
  readonly toasts: Toasts;
  readonly pip: PiP;
  readonly hud: Hud;
  readonly audio: AudioFlow;
  readonly perc: PerceptionUI;
  readonly photo: PhotoPanel;
  readonly barMenu: BarMenu;
  readonly touch: boolean;
  readonly autostart: boolean;
  entered = false;
  cinema = false;
  private landing: Landing | null = null;
  private cinemaExit: HTMLButtonElement;
  private cinemaExitTimer = 0;
  private volume = 0.85;
  private muted = false;
  /** the show bar stays visible until this performance.now() time */
  private hudUntil = 0;
  private resumeEligible = false;
  private resumeSince = 0;
  /** reduce-flashing limiter state */
  private flashDamp = 1;
  private flashSlow = 0;
  private baseExposure = -1;
  private baseBloom = -1;
  private wroteExposure = -1;
  private wroteBloom = -1;
  private coachTimer = 0;
  private endTimer = 0;
  /** double tap on the left / right third of the view (touch): ±10 s */
  private lastTap = { t: -1e9, x: 0, side: 0 };
  private ripple: HTMLElement | null = null;
  private rippleTimer = 0;
  private externalPrompt = false;
  private externalLabel: string | null = null;
  private nearest: Interactable | null = null;
  private camEvents = 0;
  private pendingKey: { code: string; frame: number; camEvents: number } | null = null;
  private prevCamMode: CamMode = 'first';
  private lastCamMode = '';
  private lastLocked = false;
  private lastPlaying = false;
  private tapStart = { x: 0, y: 0, t: 0, id: -1 };
  /** seconds the official video has been "playing" without its clock advancing */
  private stall = 0;
  private stallWarned = false;

  constructor(readonly app: App, parent: HTMLElement) {
    this.touch = app.device.touch;
    this.autostart = app.params.has('autostart');
    installGrain();
    // web fonts load without blocking the first paint (index.html): switch the stylesheet on once it
    // arrived, also where an inline onload handler is not allowed (strict CSP / sandboxed page)
    const fontCss = document.getElementById('webfonts') as HTMLLinkElement | null;
    if (fontCss && fontCss.media !== 'all') {
      if (fontCss.sheet) fontCss.media = 'all';
      else fontCss.addEventListener('load', () => (fontCss.media = 'all'), { once: true });
    }
    // phones / tablets get the touch layout (slim show bar, thumb controls above it)
    let coarse = false;
    try {
      coarse = matchMedia('(pointer: coarse)').matches;
    } catch {
      /* old browsers */
    }
    this.root = h('div', { id: 'ui', class: `pre${this.touch && (app.device.mobile || coarse) ? ' touch' : ''}` });
    parent.appendChild(this.root);
    this.applyStoredQuality();
    this.setReduceFlashing(prefs.reduceFlashing, false);
    if (!this.autostart) {
      this.landing = new Landing(this.root, app.device.mobile);
      this.landing.enterBtn.addEventListener('click', () => void this.enter());
      // keyboard belongs to the landing (Space/Enter activate the button, no walking behind it)
      app.input.uiCapture = true;
    }
    this.layers = new Layers(this.root);
    this.layers.onChange = (open) => {
      app.input.uiCapture = open;
      if (open) app.input.exitPointerLock();
      this.poke();
    };
    this.toasts = new Toasts(this.root);
    this.hud = new Hud(app, this.root, this.actions(), this.touch);
    this.perc = new PerceptionUI(this, this.root);
    this.photo = new PhotoPanel(this, this.root);
    this.pip = new PiP(this.root, this.root.classList.contains('touch'));
    this.barMenu = new BarMenu(this);
    this.audio = new AudioFlow(this);
    this.cinemaExit = h('button', { class: 'btn cinema-exit glass strong', type: 'button', html: `${icon('eye')}<span>Show interface</span>` });
    this.cinemaExit.addEventListener('click', () => this.toggleCinema(false));
    this.root.appendChild(this.cinemaExit);

    // ---- app events
    const ev = app.events;
    ev.on('loading:progress', ({ label, progress, next, etaMs }) => this.landing?.setProgress(label, progress, next, etaMs));
    ev.on('toast', ({ text, ms }) => this.toast(text, ms));
    ev.on('show:ended', () => {
      if (!this.entered || this.autostart) return;
      // let the last firework / cold-fire moment breathe before the card fades in over it
      clearTimeout(this.endTimer);
      this.endTimer = window.setTimeout(() => {
        const c = this.app.clock;
        if (!c.playing && c.time >= this.app.show.duration - 1 && !this.layers.modalOpen) openEnded(this);
      }, END_CARD_DELAY * 1000);
    });
    ev.on('audio:source', () => this.refreshSource());
    ev.on('audio:analysis', ({ status, message }) => {
      if (status === 'done') this.toast(message ?? 'Beat grid locked to your audio file', 2600, 'check');
      else if (status === 'failed') this.toast(message ?? 'Audio analysis failed', 3200, 'warning');
    });
    ev.on('camera:mode', ({ mode }) => this.onCameraMode(mode));
    ev.on('interact:prompt', ({ label }) => {
      this.externalPrompt = true;
      this.externalLabel = label;
    });
    ev.on('bar:open', ({ barId }) => this.barMenu.open(barId));
    ev.on('quality:changed', () => {
      if (this.layers.isOpen('quality')) openQuality(this);
      this.updateLite();
    });

    // ---- input
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keydown', this.onTabCapture, true);
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' && !app.input.pointerLocked) this.poke();
    });
    // mouse look sensitivity / invert Y: capture phase runs before Input's own listener; the
    // correction is additive, so Input's += movement ends up as (sensitivity * movement)
    window.addEventListener(
      'mousemove',
      (e) => {
        if (!app.input.pointerLocked) return;
        const s = prefs.lookSensitivity;
        const sy = prefs.invertY ? -s : s;
        if (s !== 1) app.input.look.x += (s - 1) * e.movementX;
        if (sy !== 1) app.input.look.y += (sy - 1) * e.movementY;
      },
      true,
    );
    // tap detection uses event timestamps (robust against slow frames)
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') this.tapStart = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId };
    });
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse' || e.pointerId !== this.tapStart.id) return;
      const moved = Math.hypot(e.clientX - this.tapStart.x, e.clientY - this.tapStart.y);
      if (moved < 14 && e.timeStamp - this.tapStart.t < 450) this.onTap(e.target === app.canvas ? e.clientX : -1, e.timeStamp);
    });
    app.canvas.addEventListener('click', () => {
      this.tryLock();
    });
    document.addEventListener('fullscreenchange', () => this.hud.setFullscreen(!!document.fullscreenElement));
    app.onFrame((ctx) => this.frame(ctx));
    (window as unknown as { __ui: UI }).__ui = this;
  }

  /** weakest preset: opaque panels instead of backdrop blur over the WebGL canvas */
  private updateLite() {
    this.root.classList.toggle('lite', this.app.quality.level === 'mobile' && this.app.device.mobile);
  }

  /** Called by main.ts once App.init() finished. */
  onReady(): void {
    const app = this.app;
    this.hud.build();
    this.updateLite();
    // restore preferences
    const v = parseFloat(store.get('dq26.volume') ?? '');
    if (Number.isFinite(v)) this.volume = Math.max(0, Math.min(1, v));
    this.muted = store.get('dq26.muted') === '1';
    this.applyVolume();
    const q = store.get('dq26.quality');
    if (!app.params.get('quality') && q && q !== 'auto' && q in QUALITY_PRESETS) {
      app.governor.enabled = false;
      if (app.quality.level !== q) app.setQuality(q as QualityLevel);
    }
    if (prefs.fov >= 50) tryCall(this.rig(), 'setBaseFov', prefs.fov);
    const crowd = app.get('crowd') as unknown as { setPopulated?(on: boolean): void; setCount?(n: number): void } | undefined;
    const cm = store.get('dq26.crowd');
    if (!app.params.has('mode') && !app.params.has('filmed') && (cm === 'filmed' || cm === 'tribe')) crowd?.setPopulated?.(cm === 'tribe');
    const cc = parseInt(store.get('dq26.crowdCount') ?? '', 10);
    if (!app.params.has('crowd') && Number.isFinite(cc)) crowd?.setCount?.(cc);
    this.onCameraMode(cameraRig(app)?.mode ?? 'first', true);
    this.refreshSource();

    if (this.autostart) {
      this.entered = true;
      this.root.classList.remove('pre');
      if (app.params.has('play')) void this.play();
      return;
    }
    this.landing?.setReady();
  }

  /** ENTER THE HOLY GROUNDS (user gesture) */
  private async enter(): Promise<void> {
    if (!this.app.ready || this.entered) return;
    const btn = this.landing?.enterBtn;
    if (btn) btn.disabled = true;
    this.app.audio.ensure();
    this.landing?.hide();
    this.landing = null;
    this.app.input.uiCapture = this.layers.anyOpen;
    // the HUD stays hidden ('pre') behind the audio chooser and the welcome card
    await this.audio.resolve();
    const choice = await openOnboarding(this);
    this.root.classList.remove('pre');
    this.entered = true;
    const start = choice === 'start' || this.app.params.has('play');
    if (start) void this.play();
    if (this.touch) {
      if (!start) this.toast('Explore freely — tap ▶ in the show bar to start the Endshow', 3600, 'play');
    } else {
      // pointer lock hides the cursor: say how to get the show controls back
      this.toast(start ? 'Esc frees the mouse for the show controls · K pause · J / L skip 10 s' : 'Explore freely — press K to start the Endshow · Esc frees the mouse', 6500, 'keyboard');
    }
    this.tryLock();
    // keep the show bar up for a while so first-time viewers see where the controls are
    this.poke(7500);
    this.coach();
  }

  /** one-time labels under the toolbar icons (icons alone do not say 'Perception' or 'Quality') */
  private coach(): void {
    const key = this.touch ? 'dq26.coach' : 'dq26.coachDesk';
    if (store.get(key) === '1') return;
    store.set(key, '1');
    this.root.classList.add('coach');
    clearTimeout(this.coachTimer);
    const off = () => {
      this.root.classList.remove('coach');
      window.removeEventListener('pointerdown', early, true);
    };
    // stays until the first touch after 2.5 s, or 9 s at most
    const shownAt = performance.now();
    const early = () => {
      if (performance.now() - shownAt > 2500) off();
    };
    window.addEventListener('pointerdown', early, true);
    this.coachTimer = window.setTimeout(off, 9000);
  }

  /** a stored quality choice is applied before the world is built (no double build) */
  private applyStoredQuality(): void {
    const app = this.app;
    const q = store.get('dq26.quality');
    if (app.ready || app.params.get('quality') || !q || q === 'auto' || !(q in QUALITY_PRESETS)) return;
    app.governor.enabled = false;
    if (app.quality.level === q) return;
    app.quality = { ...QUALITY_PRESETS[q as QualityLevel] };
    app.camera.far = app.quality.drawDistance;
    app.camera.updateProjectionMatrix();
  }

  /** photosensitivity option: other systems read app.reduceFlashing; the UI also limits flash peaks */
  setReduceFlashing(on: boolean, save = true): void {
    if (save) savePref('reduceFlashing', on);
    else prefs.reduceFlashing = on;
    (this.app as unknown as { reduceFlashing?: boolean }).reduceFlashing = on;
  }

  // ---------------------------------------------------------------------------------------
  // actions
  // ---------------------------------------------------------------------------------------
  private actions() {
    return {
      togglePlay: () => this.togglePlay(),
      restart: () => this.restart(),
      skip: (dt: number) => this.skip(dt),
      toggleMute: () => this.toggleMute(),
      setVolume: (v: number) => this.setVolume(v),
      setCamera: (m: CamMode) => this.setCamera(m),
      openMoments: (t: HTMLElement) => this.togglePanel('moments', () => openMoments(this, t)),
      openPositions: (t: HTMLElement) => this.togglePanel('positions', () => openPositions(this, t)),
      openPerception: (t: HTMLElement) => this.togglePanel('perception', () => this.perc.open(t)),
      openQuality: (t: HTMLElement) => this.togglePanel('quality', () => openQuality(this, t)),
      openCrowd: (t: HTMLElement) => this.togglePanel('crowd', () => openCrowd(this, t)),
      openAudio: (t: HTMLElement) => this.togglePanel('audio', () => openAudioMenu(this, t)),
      openCamera: (t: HTMLElement) => this.togglePanel('camera', () => openCameraSheet(this, t)),
      togglePhoto: () => this.togglePhoto(),
      toggleCinema: () => this.toggleCinema(),
      toggleFullscreen: () => this.toggleFullscreen(),
      openHelp: (t: HTMLElement) => openHelp(this, t),
      promptTap: () => this.promptTap(),
      promptDiscard: () => this.barSys()?.discard(),
      poke: () => this.poke(),
    };
  }

  private togglePanel(id: string, open: () => void) {
    if (this.layers.isOpen(id)) this.layers.close(id);
    else open();
  }

  /** "Show ended" overlay (also used by QA tooling) */
  showEnded(): void {
    openEnded(this);
  }

  toast(text: string, ms = 3200, ico = 'info'): void {
    this.toasts.show(text, ms, ico);
  }

  async play(): Promise<void> {
    const app = this.app;
    try {
      app.audio.ensure();
      if (app.clock.time >= app.show.duration - 0.5) app.clock.seek(0);
      await app.clock.play();
    } catch (e) {
      console.warn('[ui] play failed', e);
      this.toast('Playback was blocked by the browser — press play again', 3200, 'warning');
    }
    this.refreshSource();
  }

  togglePlay(): void {
    if (this.app.clock.playing) {
      this.app.clock.pause();
      this.refreshSource();
    } else void this.play();
    this.poke();
  }

  /** from the top, playing (a paused show restarts too: 'Restart' means replay, not rewind) */
  restart(): void {
    clearTimeout(this.endTimer);
    if (this.layers.isOpen('ended')) this.layers.close('ended');
    this.app.clock.seek(0);
    void this.play();
    this.toast('Restarting the Endshow', 1600, 'restart');
    this.poke();
  }

  skip(dt: number): void {
    const c = this.app.clock;
    c.seek(Math.max(0, Math.min(this.app.show.duration, c.time + dt)));
    this.poke();
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.volume > 0 && this.muted) this.muted = false;
    store.set('dq26.volume', String(this.volume));
    store.set('dq26.muted', this.muted ? '1' : '0');
    this.applyVolume();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): void {
    this.muted = !this.muted;
    store.set('dq26.muted', this.muted ? '1' : '0');
    this.applyVolume();
    this.toast(this.muted ? 'Muted — press M to unmute' : 'Sound on', 1400, this.muted ? 'mute' : 'volume');
  }

  /** push volume/mute to the Web Audio master and to the YouTube player (not routed via Web Audio) */
  applyVolume(): void {
    const app = this.app;
    app.audio.setVolume(this.volume);
    app.audio.setMuted(this.muted);
    const tr = app.clock?.track;
    if (tr && tr.kind === 'youtube') {
      tr.setVolume(this.volume);
      tr.setMuted(this.muted);
    }
    this.hud.setVolumeUi(this.volume, this.muted);
  }

  refreshSource(): void {
    const app = this.app;
    const kind = app.sources.kind;
    this.hud.setSource(kind, app.sources.label, !!app.clock?.playing && kind !== 'silent');
  }

  camMode(): string {
    return this.rig()?.mode ?? 'first';
  }

  // cached system lookups (App.get searches the system list; called several times per frame)
  private rigRef: CameraLike | null | undefined = undefined;
  private barRef: BarSystem | null | undefined = undefined;
  private rig(): CameraLike | undefined {
    if (this.rigRef === undefined && this.app.ready) this.rigRef = cameraRig(this.app) ?? null;
    return this.rigRef ?? (this.app.ready ? undefined : cameraRig(this.app));
  }

  setCamera(m: CamMode): void {
    if (m === 'photo') {
      this.togglePhoto(true);
      return;
    }
    if (this.photo.open) {
      this.togglePhoto(false, m);
      return;
    }
    const rig = this.rig();
    if (!rig?.setMode) {
      this.toast('Camera modes are not available yet', 2000, 'info');
      return;
    }
    rig.setMode(m);
  }

  private onCameraMode(mode: string, initial = false) {
    this.camEvents++;
    this.hud.setCameraMode(mode);
    if (mode === 'photo' && !this.photo.open) {
      if (this.lastCamMode && this.lastCamMode !== 'photo') this.prevCamMode = this.lastCamMode as CamMode;
      this.enterPhotoUi();
    } else if (mode !== 'photo' && this.photo.open) this.exitPhotoUi();
    if (!initial && mode !== this.lastCamMode && mode !== 'photo' && !this.layers.modalOpen) {
      const m = CAMERA_MODES.find((x) => x.id === mode);
      if (m) this.toast(`${m.label} — ${m.hint}`, 1800, m.icon);
    }
    this.lastCamMode = mode;
  }

  togglePhoto(on?: boolean, exitTo?: CamMode): void {
    const want = on ?? !this.photo.open;
    const rig = cameraRig(this.app);
    if (want) {
      if (this.photo.open) return;
      const cur = this.camMode();
      if (cur !== 'photo') this.prevCamMode = cur as CamMode;
      rig?.setMode?.('photo');
      this.enterPhotoUi();
    } else {
      if (!this.photo.open && this.camMode() !== 'photo') return;
      this.exitPhotoUi();
      if (this.camMode() === 'photo') rig?.setMode?.(exitTo ?? (this.prevCamMode === 'photo' ? 'first' : this.prevCamMode));
    }
  }

  private enterPhotoUi() {
    this.layers.closeAll();
    this.root.classList.add('photo');
    this.photo.show();
    this.hud.setCameraMode('photo');
  }

  private exitPhotoUi() {
    this.root.classList.remove('photo');
    this.photo.hide();
    this.poke();
  }

  toggleCinema(on?: boolean): void {
    const want = on ?? !this.cinema;
    this.cinema = want;
    this.app.cinema = want;
    this.root.classList.toggle('cinema', want);
    this.hud.setToggle('cinema', want);
    if (want) {
      this.layers.closeAll();
      this.toast(this.touch ? 'Interface hidden — tap the screen to bring it back' : 'Press H to show the interface', 2600, 'cinema');
    } else {
      this.cinemaExit.classList.remove('show');
      this.poke();
    }
  }

  toggleFullscreen(): void {
    const d = document as Document & { webkitFullscreenElement?: Element };
    if (document.fullscreenElement || d.webkitFullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    else {
      const el = document.documentElement;
      if (!el.requestFullscreen) {
        this.toast('Fullscreen is not supported in this browser', 2200, 'info');
        return;
      }
      el.requestFullscreen({ navigationUI: 'hide' }).catch(() => this.toast('Fullscreen was blocked by the browser', 2200, 'info'));
    }
  }

  teleport(spot: NamedSpot): void {
    const p = player(this.app);
    if (!p?.teleport) {
      this.toast('Teleporting is not available yet', 2000, 'info');
      return;
    }
    p.teleport(spot);
    if (this.photo.open) this.togglePhoto(false, 'first');
    else if (this.camMode() !== 'first') cameraRig(this.app)?.setMode?.('first');
    if (spot.id.startsWith('bar_')) this.toast(`${spot.label} — walk up to the counter and ${this.touch ? 'tap “Order a drink”' : 'press E'} to order`, 3400, 'cup');
    else if (!this.arrivalToast(spot.id)) this.toast(`You are now at: ${spot.label}`, 2000, 'pin');
    this.tryLock();
  }

  /** a spot's own arrival toast (the stage spots); false when the spot has none */
  arrivalToast(id: string): boolean {
    if (id === 'dj') this.toast('DJ-booth — zo ziet de DJ het veld', 3600, 'music');
    else if (id === 'dancers') this.toast("Dancers' podium — walk up the grey steps into the vault to the DJ booth", 3200, 'pin');
    else if (id === 'castle') this.toast('Castle gallery — up the stone stairs, over the troupe and the field', 3000, 'pin');
    else return false;
    return true;
  }

  goToNearestBar(): void {
    const bars = this.app.spots.filter((s) => s.id.startsWith('bar_'));
    if (!bars.length) {
      this.toast('No bars on the grounds yet', 2000, 'cup');
      return;
    }
    const p = this.app.playerPos;
    let best = bars[0],
      bd = Infinity;
    for (const s of bars) {
      const d = Math.hypot(s.position.x - p.x, s.position.z - p.z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    this.teleport(best);
  }

  private barSys(): BarSystem | undefined {
    if (this.barRef === undefined && this.app.ready) this.barRef = this.app.get<BarSystem>('bar') ?? null;
    return this.barRef ?? undefined;
  }

  // ---------------------------------------------------------------------------------------
  // interaction prompt / drinking
  // ---------------------------------------------------------------------------------------
  private findNearest(): Interactable | null {
    const p = this.app.playerPos;
    let best: Interactable | null = null;
    let bd = Infinity;
    const list = this.app.interactables;
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const dx = it.position.x - p.x,
        dz = it.position.z - p.z;
      const d2 = dx * dx + dz * dz;
      const r = it.radius + (this.externalPrompt ? 1 : 0);
      if (d2 < r * r && d2 < bd) {
        bd = d2;
        best = it;
      }
    }
    return best;
  }

  private interact() {
    if (!this.externalPrompt && this.nearest) {
      this.nearest.onInteract();
      return;
    }
    if (!(this.externalPrompt && this.externalLabel)) this.barSys()?.sip();
  }

  private promptTap() {
    if (this.nearest && (this.externalLabel || !this.externalPrompt)) this.nearest.onInteract();
    else if (this.barSys()?.holding) this.barSys()!.sip();
    this.poke();
  }

  /** prompt state of the previous frame (strings are only rebuilt when this changes) */
  private pState = { kind: 0, label: '' as string | null, near: '', drink: '', sips: -1 };

  private updatePrompt() {
    const mode = this.camMode();
    const walk = mode === 'first' || mode === 'third';
    this.nearest = walk && this.entered ? this.findNearest() : null;
    const ps = this.pState;
    if (!this.entered || this.layers.anyOpen || this.photo.open) {
      if (ps.kind !== 0) this.hud.setPrompt(null);
      ps.kind = 0;
      return;
    }
    const label = this.externalPrompt ? (walk ? this.externalLabel : null) : (this.nearest?.label ?? null);
    const key = this.touch ? 'Tap' : 'E';
    const bar = this.barSys();
    const d = mode === 'first' ? bar?.holding : null;
    const nearBar = !!this.nearest && this.nearest.id.startsWith('bar_');
    // a drink in hand takes priority over the bar counter (the counter action then also sips)
    if (label && !(d && (nearBar || !this.nearest))) {
      const near = this.nearest?.id ?? '';
      if (ps.kind === 1 && ps.label === label && ps.near === near) return;
      ps.kind = 1;
      ps.label = label;
      ps.near = near;
      const m = near.match(/^bar_([^_]+)/);
      this.hud.setPrompt(label, m ? (barById(m[1])?.name ?? '') : '', false, key);
      return;
    }
    if (d) {
      const n = bar!.sipsLeft;
      if (ps.kind === 2 && ps.drink === d.id && ps.sips === n) return;
      ps.kind = 2;
      ps.drink = d.id;
      ps.sips = n;
      this.hud.setPrompt('Drink', `${d.name} · ${n} sip${n === 1 ? '' : 's'} left`, true, key);
    } else if (ps.kind !== 0) {
      ps.kind = 0;
      this.hud.setPrompt(null);
    }
  }

  // ---------------------------------------------------------------------------------------
  // input
  // ---------------------------------------------------------------------------------------
  private canLock(): boolean {
    return !this.touch && !this.autostart && this.entered && !this.layers.anyOpen && !debugState.capturePointer && LOCK_MODES.has(this.camMode());
  }

  /** request pointer lock only when allowed and while the browser still sees a user gesture */
  private tryLock(): void {
    if (!this.canLock()) return;
    const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
    if (ua && !ua.isActive) return;
    this.app.input.requestPointerLock();
  }

  /** show the HUD (resets the auto-hide timer; holdMs = how long it stays at least) */
  poke(holdMs = 3000): void {
    this.hudUntil = Math.max(this.hudUntil, performance.now() + holdMs);
  }

  private onTap(x = -1, ts = 0) {
    this.poke(this.touch ? 4000 : 3000);
    if (x >= 0) this.doubleTapSkip(x, ts);
    if (this.cinema && this.touch) {
      this.cinemaExit.classList.add('show');
      clearTimeout(this.cinemaExitTimer);
      this.cinemaExitTimer = window.setTimeout(() => this.cinemaExit.classList.remove('show'), 3500);
    }
  }

  /**
   * Touch: double tap on the left or right third of the picture skips 10 s back / forward (video-app
   * convention), with a ripple on that side. Not in photo mode (taps there aim the shot).
   */
  private doubleTapSkip(x: number, ts: number): void {
    if (!this.entered || this.photo.open || this.layers.anyOpen || !this.root.classList.contains('touch')) return;
    const w = window.innerWidth;
    const side = x < w / 3 ? -1 : x > (2 * w) / 3 ? 1 : 0;
    // event timestamps: a slow frame between the two taps must not break the double tap
    const now = ts || performance.now();
    const lt = this.lastTap;
    if (side !== 0 && lt.side === side && now - lt.t < 360) {
      this.skip(side * 10);
      this.showRipple(side);
      lt.t = -1e9;
      return;
    }
    lt.t = now;
    lt.side = side;
    lt.x = x;
  }

  private showRipple(side: number): void {
    if (!this.ripple) {
      this.ripple = h('div', { class: 'skip-ripple', 'aria-hidden': 'true' });
      this.root.appendChild(this.ripple);
    }
    const r = this.ripple;
    r.className = `skip-ripple ${side < 0 ? 'left' : 'right'}`;
    r.innerHTML = `${icon(side < 0 ? 'back10' : 'fwd10')}<span>${side < 0 ? '−10 s' : '+10 s'}</span>`;
    void r.offsetWidth;
    r.classList.add('go');
    clearTimeout(this.rippleTimer);
    this.rippleTimer = window.setTimeout(() => r.classList.remove('go'), 700);
  }

  /** comfort: no head bob, sway, roll, jostle, drone drift or bass shake (player + perception follow) */
  setReduceMotion(on: boolean): void {
    tryCall(player(this.app), 'setReduceMotion', on);
    const perc = this.app.get('perception') as unknown as { setReducedMotion?(v: boolean | null): void } | undefined;
    perc?.setReducedMotion?.(null);
  }

  get reduceMotion(): boolean {
    const p = player(this.app) as unknown as { reduceMotion?: boolean } | undefined;
    return !!p?.reduceMotion;
  }

  /** let Tab move focus through the interface while the mouse is free (Input blocks it otherwise) */
  private onTabCapture = (e: KeyboardEvent) => {
    // (with a layer open, Input already ignores keys and the Layers focus trap must see the event)
    if (e.code === 'Tab' && !this.app.input.pointerLocked && !this.layers.anyOpen && (this.entered || this.landing)) e.stopImmediatePropagation();
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Escape') {
      if (this.layers.escape()) e.preventDefault();
      else if (this.photo.open) this.togglePhoto(false);
      else if (this.cinema) this.toggleCinema(false);
      return;
    }
    if (isTypingTarget(e.target) || e.repeat || !this.entered) return;
    const top = this.layers.topId;
    if (top) {
      const own: Record<string, string> = { KeyT: 'positions', KeyX: 'perception', KeyG: 'crowd' };
      if (own[e.code] === top || (e.key === '?' && top === 'help')) {
        this.layers.close(top);
        e.preventDefault();
        return;
      }
      // media keys keep working while a panel (not a modal card) is open
      if (!(this.layers.kindOf(top) === 'panel' && MEDIA_KEYS.has(e.code))) return;
    }
    if (this.photo.open && !PHOTO_KEYS.has(e.code)) return;
    let handled = true;
    switch (e.code) {
      case 'KeyK':
        this.togglePlay();
        break;
      case 'KeyJ':
        this.skip(-10);
        this.toast('−10 s', 700, 'back10');
        break;
      case 'KeyL':
        this.skip(10);
        this.toast('+10 s', 700, 'fwd10');
        break;
      case 'KeyT':
        openPositions(this);
        break;
      case 'KeyX':
        this.perc.open(this.hud.btn.perception);
        break;
      case 'KeyG':
        openCrowd(this, this.hud.btn.crowd);
        break;
      case 'KeyH':
        this.toggleCinema();
        break;
      case 'KeyM':
        this.toggleMute();
        break;
      case 'KeyF':
        // photo mode: F = autofocus (the camera rig focuses; the panel follows)
        if (this.photo.open) this.photo.autofocus();
        else this.toggleFullscreen();
        break;
      case 'KeyE':
        this.interact();
        break;
      case 'KeyO':
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
      case 'Digit6':
        // the CameraRig may bind these itself: act only if it did not react this frame
        this.pendingKey = { code: e.code, frame: this.app.frame, camEvents: this.camEvents };
        break;
      default:
        if (e.key === '?') openHelp(this);
        else handled = false;
    }
    if (handled) this.poke();
  };

  private handlePendingKey() {
    const pk = this.pendingKey;
    if (!pk || this.app.frame <= pk.frame) return;
    this.pendingKey = null;
    if (this.camEvents !== pk.camEvents) return; // the camera rig handled it
    if (pk.code === 'KeyO') this.togglePhoto();
    else {
      const m = DIGIT_MODES[pk.code];
      if (m && m !== this.camMode()) this.setCamera(m);
    }
  }

  // ---------------------------------------------------------------------------------------
  // per frame
  // ---------------------------------------------------------------------------------------
  private frame(ctx: FrameContext): void {
    if (!this.app.clock) return;
    this.hud.update(ctx.showTime, ctx.showPlaying);
    this.perc.update(ctx.dt);
    this.handlePendingKey();
    this.updatePrompt();

    const playing = ctx.showPlaying;
    if (playing !== this.lastPlaying) {
      this.lastPlaying = playing;
      this.refreshSource();
      if (!playing) this.poke();
    }
    // auto-hide the show bar while the show plays and nobody touches the mouse
    const now = performance.now();
    const keep = !playing || !this.entered || this.layers.anyOpen || this.hud.hovering || now < this.hudUntil;
    this.hud.setAway(!keep);

    // click-to-resume hint (desktop pointer lock): bottom centre, fades after a few seconds
    const locked = this.app.input.pointerLocked;
    if (locked !== this.lastLocked) {
      this.lastLocked = locked;
      if (!locked) this.poke();
    }
    const eligible = this.canLock() && !locked && !this.cinema;
    if (eligible && !this.resumeEligible) this.resumeSince = now;
    this.resumeEligible = eligible;
    const showResume = eligible && !this.hud.hovering && now - this.resumeSince < 4500;
    this.hud.setResume(showResume, this.photo.open ? 'Click the scene to look around · Esc to adjust the photo' : 'Click the scene to look around');

    this.limitFlashes(ctx.dt);

    // watchdog: the embedded video can be unavailable (region, embedding, network)
    const tr = this.app.clock.track;
    if (playing && tr.kind === 'youtube' && !tr.playing) this.stall += ctx.dt;
    else this.stall = 0;
    if (this.stall > 8 && !this.stallWarned) {
      this.stallWarned = true;
      this.toast('The official video is not playing (unavailable, blocked or buffering). Switch the audio source in the top bar.', 6000, 'warning');
    }
    if (tr.kind !== 'youtube') this.stallWarned = false;

    // roll fallback for photo mode when the rig has no setRoll
    if (this.photo.open) {
      this.photo.tick();
      if (this.photo.fallbackRoll !== 0) this.app.camera.rotation.z = this.photo.fallbackRoll;
    }
  }

  /**
   * Reduce flashing: an automatic-exposure limiter on top of whatever the show systems do.
   * Strobes, blinders and pyro / firework flashes (LightEnv) pull the exposure down instantly and
   * it recovers over ~0.6 s, so bursts read as one dimmed pulse instead of a 12 Hz flicker.
   * Tracks external edits (debug menu) of the base values; restores them when switched off.
   */
  private limitFlashes(dt: number): void {
    const pf = this.app.postfx;
    if (!prefs.reduceFlashing) {
      if (this.baseExposure >= 0) {
        if (pf.exposure === this.wroteExposure) pf.exposure = this.baseExposure;
        if (pf.bloomStrength === this.wroteBloom) pf.bloomStrength = this.baseBloom;
        this.baseExposure = this.baseBloom = -1;
        this.flashDamp = 1;
      }
      return;
    }
    if (this.baseExposure < 0 || pf.exposure !== this.wroteExposure) this.baseExposure = pf.exposure;
    if (this.baseBloom < 0 || pf.bloomStrength !== this.wroteBloom) this.baseBloom = pf.bloomStrength;
    const env = this.app.env;
    const f = Math.min(4, env.flashIntensity) + env.strobe * 1.5;
    // only sudden rises are damped: steady light (burning flames, long washes) keeps its level
    this.flashSlow += (f - this.flashSlow) * (1 - Math.exp(-dt / 1.5));
    const spike = Math.max(0, f - this.flashSlow * 0.7);
    const target = 1 / (1 + 0.6 * spike);
    this.flashDamp = target < this.flashDamp ? target : this.flashDamp + (target - this.flashDamp) * (1 - Math.exp(-dt / 0.6));
    pf.exposure = this.wroteExposure = this.baseExposure * this.flashDamp;
    pf.bloomStrength = this.wroteBloom = this.baseBloom * (0.55 + 0.25 * this.flashDamp);
  }
}
