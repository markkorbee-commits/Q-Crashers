import * as THREE from 'three';
import { AudioEngine } from '../audio/AudioEngine';
import { AudioSources } from '../audio/AudioSources';
import type { AudioTrack } from '../audio/AudioTrack';
import { SilentTrack } from '../audio/AudioTrack';
import { PostFX } from '../postfx/PostFX';
import { SceneGlare } from '../postfx/SceneGlare';
import { ShowClock } from '../show/ShowClock';
import { ShowEngine, type ResolvedPalette } from '../show/ShowEngine';
import { Anchors } from './Anchors';
import { EventBus } from './EventBus';
import { Input } from './Input';
import { LightEnv } from './LightEnv';
import { GpuWarmup } from './Precompile';
import { detectDevice, neighbourLevel, pickQuality, PerfGovernor, QUALITY_ORDER, QUALITY_PRESETS, type DeviceProfile } from './Quality';
import type { BeatInfo, Collider2D, FrameContext, Interactable, NamedSpot, QualityLevel, QualitySettings, System } from './types';
import { nextPaint } from './yieldTo';

export interface AppOptions {
  canvasParent: HTMLElement;
  showUrl: string;
}

/**
 * Expected build time per system init (ms, typical desktop at HIGH; QA measurements scaled). They
 * size each system's share of the loading bar so it moves at a steady pace instead of crawling
 * through the procedural-texture-heavy systems. After the first visit the measured times of this
 * device (LOAD_PROFILE_KEY) replace them.
 */
const LOAD_ESTIMATE_MS: Record<string, number> = {
  environment: 250,
  stage: 1300,
  lights: 40,
  lasers: 200,
  pyro: 80,
  fireworks: 15,
  fog: 20,
  terrain: 3800,
  grounds: 130,
  bar: 50,
  crowd: 900,
};
const LOAD_ESTIMATE_DEFAULT_MS = 10;
const LOAD_PROFILE_KEY = 'dq26.loadProfile';
/** loading-bar ranges: system builds, then GPU preparation (shaders, textures, first draw) */
const BUILD_START = 0.05;
const BUILD_END = 0.8;
const GPU_END = 0.99;

/** preset the user picked in the Graphics menu (owned by the UI; read here to build the right preset once) */
const PREF_KEY = 'dq26.quality';
/** preset the automatic governor settled on for this GPU, applied at the next load */
const AUTO_HINT_KEY = 'dq26.autoQuality';

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Composition root. Owns renderer, scene, camera, clock, show engine and the ordered list of systems.
 * Systems are updated in registration order each frame:
 *   show emitters (stage, lights, lasers, pyro, fireworks, fog) -> world receivers (sky, terrain,
 *   grounds, crowd) -> player / camera -> perception -> audio ambience -> debug.
 */
export class App {
  readonly events = new EventBus();
  readonly params = new URLSearchParams(location.search);
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly input: Input;
  readonly audio = new AudioEngine();
  /** music source selection (file / YouTube / synth / silent); used by the UI */
  readonly sources: AudioSources = new AudioSources(this);
  readonly show = new ShowEngine();
  readonly anchors = new Anchors();
  readonly env = new LightEnv();
  readonly colliders: Collider2D[] = [];
  readonly interactables: Interactable[] = [];
  readonly spots: NamedSpot[] = [];
  readonly device: DeviceProfile;
  readonly governor: PerfGovernor;
  quality: QualitySettings;
  clock!: ShowClock;
  postfx: PostFX;
  /** pyro veiling glare driver (pyro light field -> postfx.glare), updated right before rendering */
  readonly sceneGlare = new SceneGlare();
  palette: ResolvedPalette = ShowEngine.newPalette();
  /** player feet position, maintained by the PlayerController */
  readonly playerPos = new THREE.Vector3(0, 0, 160);
  /** set by UI: hides HUD for cinema/photo mode */
  cinema = false;
  /**
   * Photosensitivity setting (set by the UI). Show systems read it to cap strobe / blinder rates
   * (≤ 3 Hz, ~40 %), soften kick strobes and scale their LightEnv flash contributions (~0.4).
   */
  reduceFlashing = false;
  ready = false;
  frame = 0;
  private systems: System[] = [];
  private disabled = new Set<string>();
  private lastPerf = 0;
  private startPerf = performance.now();
  private beat: BeatInfo = { bpm: 150, beat: 0, phase: 0, bar: 0, barPhase: 0, kick: 0, hasKick: false, energy: 0 };
  private ctx!: FrameContext;
  private running = false;
  /** hooks run after systems update, before render (UI HUD refresh etc.) */
  private frameHooks: ((ctx: FrameContext) => void)[] = [];
  /** timings per system (ms, smoothed) for the debug menu */
  readonly timings = new Map<string, number>();
  /** wall-clock ms of each loading phase (system builds, shader compile, uploads) for diagnostics */
  readonly loadTimings: Record<string, number> = {};
  /** GPU warm-up statistics of the last preparation (programs, textures, parallel compile) */
  readonly gpuPrep = { programs: 0, textures: 0, parallel: false, compileMs: 0, uploadMs: 0, warmMs: 0 };
  /** the preset picked automatically at start (the governor never suggests going above it) */
  readonly autoLevel: QualityLevel;
  private readonly warmup: GpuWarmup;
  /** loading-bar band of the system currently initialising (for loadStep) */
  private loadBand: { label: string; p0: number; p1: number } | null = null;
  /** world paused (no system updates, no render) while a preset switch rebuilds and compiles */
  private holdRender = false;
  /** the first frame after a hold behaves like a seek (show time jumped while paused) */
  private resumeSeeked = false;
  private prepGen = 0;
  private qualityGen = 0;
  /** preset the governor asked for; applied at the next safe moment (show not playing) */
  private pendingLevel: QualityLevel | null = null;

  constructor(private opts: AppOptions) {
    const canvas = document.createElement('canvas');
    canvas.id = 'gl';
    opts.canvasParent.appendChild(canvas);
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: this.params.has('capture'),
    });
    if (!gl) throw new Error('WebGL2 is not available in this browser.');
    this.renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.info.autoReset = false;
    // Link-status / info-log queries block until the driver has finished linking and defeat
    // KHR_parallel_shader_compile. Keep them for development (and ?debug), skip them in production.
    this.renderer.debug.checkShaderErrors = !import.meta.env.PROD || this.params.has('debug');
    this.warmup = new GpuWarmup(this.renderer);
    this.primePixelStore();

    this.device = detectDevice(gl);
    this.autoLevel = pickQuality(this.device);
    const forced = this.params.get('quality') as QualityLevel | null;
    const pref = storageGet(PREF_KEY) as QualityLevel | null;
    const userPick = !forced && pref && pref in QUALITY_PRESETS ? pref : null;
    let level: QualityLevel;
    if (forced && QUALITY_PRESETS[forced]) level = forced;
    else if (userPick) level = userPick; // the UI re-applies it after Ready; building it now avoids a second build
    else level = this.autoHint() ?? this.autoLevel;
    this.quality = { ...QUALITY_PRESETS[level] };
    this.governor = new PerfGovernor(this.device.mobile ? 30 : 58);
    // `enabled` = automatic preset mode (the Graphics menu's "Auto"). Dynamic resolution stays on for
    // a preset the user picked (the hitch-free safety net); ?nogovernor (QA, captures) turns both off.
    this.governor.enabled = !forced && !userPick && !this.params.has('nogovernor');
    this.governor.adaptResolution = !this.params.has('nogovernor');

    this.camera = new THREE.PerspectiveCamera(this.device.mobile ? 70 : 72, 1, 0.1, this.quality.drawDistance);
    this.camera.position.set(0, 1.72, 160);
    this.scene.add(this.camera);
    this.input = new Input(canvas);
    this.postfx = new PostFX(this.renderer, this.quality);
    if (this.params.has('nopost')) this.postfx.enabled = false;
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * Seed three's pixel-store cache. A partial texture update (texture.updateRanges, used by the
   * particle emitter rows) reads UNPACK_ROW_LENGTH / SKIP_PIXELS / SKIP_ROWS through state.getParameter,
   * which falls through to a synchronous gl.getParameter round trip while the value is not cached:
   * a pipeline flush on the first pyro / firework birth after play (2.1 s on SwiftShader). Setting
   * them once through the state object caches them.
   */
  private primePixelStore(): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const st = this.renderer.state;
    for (const p of [gl.UNPACK_ROW_LENGTH, gl.UNPACK_SKIP_PIXELS, gl.UNPACK_SKIP_ROWS, gl.UNPACK_IMAGE_HEIGHT, gl.UNPACK_SKIP_IMAGES]) st.pixelStorei(p, 0);
  }

  register(...systems: System[]): void {
    this.systems.push(...systems);
  }

  get<T extends System>(name: string): T | undefined {
    return this.systems.find((s) => s.name === name) as T | undefined;
  }

  allSystems(): readonly System[] {
    return this.systems;
  }

  onFrame(fn: (ctx: FrameContext) => void): void {
    this.frameHooks.push(fn);
  }

  setSystemEnabled(name: string, on: boolean): void {
    if (on) this.disabled.delete(name);
    else this.disabled.add(name);
    this.get(name)?.setEnabled?.(on);
  }

  isSystemEnabled(name: string): boolean {
    return !this.disabled.has(name);
  }

  addCollider(c: Collider2D): void {
    this.colliders.push(c);
  }

  addInteractable(i: Interactable): void {
    this.interactables.push(i);
  }

  addSpot(s: NamedSpot): void {
    const i = this.spots.findIndex((x) => x.id === s.id);
    if (i >= 0) this.spots[i] = s;
    else this.spots.push(s);
  }

  /** Load show data and initialise all systems (reports progress to the loading screen). */
  async init(): Promise<void> {
    const tInit = performance.now();
    this.progress('Loading show data', 0.02);
    await this.show.load(this.opts.showUrl);
    this.clock = new ShowClock(new SilentTrack(this.show.duration), this.show.duration);
    this.clock.onEnded = () => this.events.emit('show:ended', {});
    this.events.emit('show:loaded', { duration: this.show.duration, title: this.show.file.meta.title });

    for (const off of (this.params.get('off') ?? '').split(',').filter(Boolean)) this.disabled.add(off);

    const n = this.systems.length;
    const expected = this.loadProfile();
    let total = 0;
    for (const s of this.systems) total += expected[s.name];
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const s = this.systems[i];
      const w = expected[s.name];
      const p0 = BUILD_START + ((BUILD_END - BUILD_START) * acc) / total;
      acc += w;
      const p1 = BUILD_START + ((BUILD_END - BUILD_START) * acc) / total;
      this.loadBand = { label: `Building ${s.name}`, p0, p1 };
      this.events.emit('loading:progress', { label: this.loadBand.label, progress: p0, next: p1, etaMs: Math.round(w) });
      // let the loading screen paint (rAF-guaranteed, not throttled in background tabs)
      await nextPaint();
      const t0 = performance.now();
      try {
        await s.init?.(this);
        s.setQuality?.(this.quality);
        if (this.disabled.has(s.name)) s.setEnabled?.(false);
      } catch (e) {
        console.error(`[app] system ${s.name} failed to init`, e);
      }
      this.loadTimings[s.name] = Math.round(performance.now() - t0);
    }
    this.loadBand = null;
    this.saveLoadProfile();
    this.show.compile(); // lifetimes registered during init
    this.postfx.setQuality(this.quality);
    this.resize();

    const t = parseFloat(this.params.get('t') ?? '');
    if (Number.isFinite(t)) this.clock.seek(t);
    this.ctx = {
      dt: 0,
      time: 0,
      showTime: this.clock.time,
      showDt: 0,
      showPlaying: false,
      seeked: true,
      beat: this.beat,
      camera: this.camera,
      playerPos: this.playerPos,
    };

    // GPU preparation: compile every program in parallel, upload textures, draw once. After this the
    // first visible frame (and the ENTER click) costs a normal frame instead of a multi-second freeze.
    await this.prepareGpu((label, f) => this.progress(label, BUILD_END + (GPU_END - BUILD_END) * f), true);
    this.loadTimings.total = Math.round(performance.now() - tInit);

    this.progress('Ready', 1);
    this.ready = true;
    this.governor.reset({ cooldown: 2 });
  }

  /**
   * Report a sub-step of a long system init (e.g. "stone textures") on the loading screen and yield
   * so it can paint. `fraction` (0..1) is the position inside the calling system's share of the bar.
   * Safe to call at any time: outside of init() it just yields.
   */
  loadStep(label: string, fraction: number): Promise<void> {
    const b = this.loadBand;
    if (b) {
      const f = Math.max(0, Math.min(1, fraction));
      this.progress(`${b.label} · ${label}`, b.p0 + (b.p1 - b.p0) * f);
    }
    return nextPaint();
  }

  private progress(label: string, progress: number): void {
    this.events.emit('loading:progress', { label, progress });
  }

  /** expected init ms per system: this device's last measurement, else the static estimate */
  private loadProfile(): Record<string, number> {
    let stored: Record<string, number> = {};
    try {
      const raw = storageGet(LOAD_PROFILE_KEY);
      const p = raw ? (JSON.parse(raw) as { level?: string; ms?: Record<string, number> }) : null;
      if (p && p.level === this.quality.level && p.ms) stored = p.ms;
    } catch {
      /* corrupt entry: use estimates */
    }
    const out: Record<string, number> = {};
    for (const s of this.systems) {
      const m = stored[s.name];
      out[s.name] = Math.max(5, Number.isFinite(m) ? m : (LOAD_ESTIMATE_MS[s.name] ?? LOAD_ESTIMATE_DEFAULT_MS));
    }
    return out;
  }

  private saveLoadProfile(): void {
    const ms: Record<string, number> = {};
    for (const s of this.systems) ms[s.name] = this.loadTimings[s.name] ?? 0;
    storageSet(LOAD_PROFILE_KEY, JSON.stringify({ level: this.quality.level, ms }));
  }

  /** does the scene pass render into an offscreen HDR target (PostFX) or straight to the canvas */
  private get offscreenScene(): boolean {
    return this.postfx.enabled && this.quality.postfx;
  }

  /**
   * Compile all programs (parallel, polled), upload textures and draw everything once.
   * `report(label, 0..1)` receives progress. Resolves early (stale) if a newer preparation started.
   */
  private async prepareGpu(report: (label: string, f: number) => void, fullFrame = false): Promise<boolean> {
    const gen = ++this.prepGen;
    const w = this.warmup;
    w.samples = this.quality.msaa;
    this.scene.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    let t0 = performance.now();
    try {
      const programs = await w.compile(this.scene, this.camera, this.offscreenScene, (done, total) => {
        const f = total ? done / total : 1;
        if (gen === this.prepGen) report(`Compiling shaders ${Math.round(100 * f)}%`, 0.7 * f);
      });
      if (gen !== this.prepGen) return false;
      this.gpuPrep.programs = programs;
      this.gpuPrep.parallel = w.parallel;
      this.gpuPrep.compileMs = Math.round(performance.now() - t0);
      t0 = performance.now();
      const textures = await w.upload(this.scene, (done, total) => {
        if (gen === this.prepGen) report(`Uploading textures ${done}/${total}`, 0.7 + 0.2 * (total ? done / total : 1));
      });
      if (gen !== this.prepGen) return false;
      this.gpuPrep.textures = textures;
      this.gpuPrep.uploadMs = Math.round(performance.now() - t0);
      report('Preparing the first frame', 0.92);
      await nextPaint();
      if (gen !== this.prepGen) return false;
      t0 = performance.now();
      w.warm(this.scene, this.camera, this.offscreenScene);
      // the first real frame, rendered behind the loading screen (targets, post passes, lazy
      // first-update work of the systems). Resize first: after a preset switch the canvas and
      // targets change size here, and the frame is drawn in the same task (no blank canvas).
      if (fullFrame) {
        this.resize();
        this.warmFrame();
      }
      await w.idle();
      if (gen !== this.prepGen) return false;
      this.primePixelStore(); // in case the warm-up reset the renderer state
      this.gpuPrep.warmMs = Math.round(performance.now() - t0);
      Object.assign(this.loadTimings, { shaders: this.gpuPrep.compileMs, textures: this.gpuPrep.uploadMs, warm: this.gpuPrep.warmMs });
      report('Preparing the first frame', 1);
    } catch (e) {
      // never block the experience on the warm-up: the first frame compiles whatever is missing
      console.warn('[app] GPU warm-up skipped', e);
    }
    return gen === this.prepGen;
  }

  async setAudioTrack(track: AudioTrack): Promise<void> {
    await track.load();
    track.setVolume(1);
    const old = this.clock.track;
    await this.clock.setTrack(track);
    if (old !== track) old.dispose();
    this.events.emit('audio:source', { kind: track.kind, label: track.label, ready: true });
  }

  /**
   * Switch the graphics preset (explicit user choice, or a governor suggestion applied while the show
   * is not playing). After Ready the switch never freezes the page in one piece: the last picture
   * stays on screen and the world pauses (audio and HUD keep running), each system rebuilds in its
   * own task, the new program variants compile (in parallel where the driver can), and the first
   * frame of the new preset is drawn and fenced before the world resumes. `app.quality` and the
   * 'quality:changed' event update immediately.
   */
  setQuality(level: QualityLevel): void {
    this.pendingLevel = null;
    if (this.ready && level === this.quality.level) {
      // re-picking the active preset: nothing to rebuild, but start again from full resolution
      this.governor.reset({ cooldown: 2, forget: true });
      this.resize();
      this.events.emit('quality:changed', { level });
      return;
    }
    this.quality = { ...QUALITY_PRESETS[level] };
    this.camera.far = this.quality.drawDistance;
    this.camera.updateProjectionMatrix();
    this.governor.reset({ cooldown: 2, forget: true });
    const gen = ++this.qualityGen;
    if (!this.ready) {
      this.applyQualityToSystems();
      this.postfx.setQuality(this.quality);
      this.resize();
      this.events.emit('quality:changed', { level });
      return;
    }
    this.holdRender = true;
    this.events.emit('quality:changed', { level });
    void (async () => {
      const q = this.quality;
      for (const s of this.systems) {
        await nextPaint();
        if (gen !== this.qualityGen) return; // a newer switch took over
        try {
          s.setQuality?.(q);
        } catch (e) {
          console.error(`[app] ${s.name}.setQuality failed`, e);
        }
      }
      this.postfx.setQuality(q);
      const current = await this.prepareGpu(() => undefined, true);
      if (!current || gen !== this.qualityGen) return;
      this.holdRender = false;
    })();
  }

  private applyQualityToSystems(): void {
    for (const s of this.systems) {
      try {
        s.setQuality?.(this.quality);
      } catch (e) {
        console.error(`[app] ${s.name}.setQuality failed`, e);
      }
    }
  }

  /** Persisted governor decision for this GPU (applied at load; never above the auto-picked preset). */
  private autoHint(): QualityLevel | null {
    if (this.params.has('nogovernor')) return null;
    try {
      const raw = storageGet(AUTO_HINT_KEY);
      if (!raw) return null;
      const h = JSON.parse(raw) as { gpu?: string; level?: QualityLevel };
      if (h.gpu !== this.device.gpu || !h.level || !(h.level in QUALITY_PRESETS)) return null;
      return QUALITY_ORDER.indexOf(h.level) < QUALITY_ORDER.indexOf(this.autoLevel) ? h.level : null;
    } catch {
      return null;
    }
  }

  /** A governor preset suggestion: remember it for the next load and apply it at a safe moment. */
  private suggestLevel(dir: 'down' | 'up'): void {
    const next = neighbourLevel(this.quality.level, dir === 'down' ? -1 : 1);
    if (!next) return;
    // only recover upwards to the preset picked for this device, never beyond
    if (dir === 'up' && QUALITY_ORDER.indexOf(next) > QUALITY_ORDER.indexOf(this.autoLevel)) return;
    if (this.pendingLevel === next) return;
    this.pendingLevel = next;
    storageSet(AUTO_HINT_KEY, next === this.autoLevel ? null : JSON.stringify({ gpu: this.device.gpu, level: next }));
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.lastScale = this.governor.scale;
    const pr = Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio) * this.quality.renderScale * this.governor.scale;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, true);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.postfx.setSize(Math.floor(w * pr), Math.floor(h * pr));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastPerf = performance.now();
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      this.step(performance.now());
    };
    requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
  }

  /** One frame. Public so tests can drive frames deterministically. */
  step(now: number): void {
    if (!this.ready) {
      this.lastPerf = now;
      return;
    }
    const rawDt = Math.max(0, (now - this.lastPerf) / 1000);
    const dt = Math.min(0.1, rawDt);
    this.lastPerf = now;
    this.frame++;
    this.input.beginFrame();
    const clk = this.clock.tick(now);
    const ctx = this.ctx;
    ctx.dt = dt;
    ctx.time = (now - this.startPerf) / 1000;
    ctx.showTime = clk.time;
    ctx.showDt = clk.dt;
    ctx.seeked = clk.seeked;
    ctx.showPlaying = this.clock.playing;
    if (this.holdRender) {
      // a preset switch is rebuilding / compiling: the last picture stays, the HUD keeps running
      this.resumeSeeked = true;
      for (const h of this.frameHooks) h(ctx);
      this.input.endFrame();
      return;
    }
    if (this.resumeSeeked) {
      this.resumeSeeked = false;
      ctx.seeked = true;
      ctx.showDt = 0;
    }
    // per-system timings: every 30th frame (and every frame for the first seconds, so a slow
    // renderer or a short QA capture still reports them)
    this.updateSystems(ctx, this.params.has('debug') || this.frame % 30 === 0 || this.frame < 90);
    for (const h of this.frameHooks) h(ctx);
    this.input.endFrame();
    // after the frame hooks: the fx engine has packed this frame's pyro light field
    this.sceneGlare.update(this, dt, ctx.seeked);
    this.postfx.render(this.scene, this.camera, dt, ctx.time);
    this.lastRender.calls = this.renderer.info.render.calls;
    this.lastRender.triangles = this.renderer.info.render.triangles;

    // Runtime adaptation is resolution-only; a seek (cache rebuilds) is not steady-state cost.
    if (ctx.seeked) this.governor.reset();
    // the governor sees the real frame time (the systems' dt is clamped to 0.1 s)
    const verdict = this.governor.sample(rawDt);
    if (this.governor.scale !== this.lastScale) {
      this.lastScale = this.governor.scale;
      this.resize();
    }
    if (verdict) this.suggestLevel(verdict);
    // preset changes rebuild systems: only while the show is not playing (pre-show, paused, ended),
    // and only in automatic mode (a preset the user picked is never overridden)
    if (this.pendingLevel && !this.clock.playing && this.governor.enabled) {
      const level = this.pendingLevel;
      this.setQuality(level);
      this.events.emit('toast', { text: `Graphics adjusted to ${level.toUpperCase()} for smooth playback`, ms: 3000 });
    }
  }
  private lastScale = 1;
  /** draw calls / triangles of the previous frame (renderer.info is reset every frame) */
  readonly lastRender = { calls: 0, triangles: 0 };

  /** show-derived frame state + every enabled system's update, in registration order */
  private updateSystems(ctx: FrameContext, measure: boolean): void {
    this.show.tempo.beatInfo(ctx.showTime, this.beat);
    this.show.paletteAt(ctx.showTime, this.palette);
    this.env.reset();
    this.env.palettePrimary.copy(this.palette.primary);
    this.env.paletteSecondary.copy(this.palette.secondary);
    this.env.paletteAccent.copy(this.palette.accent);

    this.renderer.info.reset();
    for (const s of this.systems) {
      if (this.disabled.has(s.name)) continue;
      const t0 = measure ? performance.now() : 0;
      try {
        s.update(ctx);
      } catch (e) {
        if (this.frame % 300 === 1) console.error(`[app] ${s.name}.update failed`, e);
      }
      if (measure) {
        const ms = performance.now() - t0;
        this.timings.set(s.name, (this.timings.get(s.name) ?? ms) * 0.8 + ms * 0.2);
      }
    }
  }

  /**
   * Dry run of the first frame during loading (behind the loading screen): every system updates at
   * the start time, exactly as the first real frame will (show time, seeked, no time step), and
   * the frame is rendered through the post chain. Whatever a system builds lazily on its first
   * update and every first-use GPU cost of the real targets and post passes lands here, not on the
   * first visible frame. The clock is not advanced, so the first real frame still sees `seeked`.
   */
  private warmFrame(): void {
    const ctx = this.ctx;
    ctx.dt = 0;
    ctx.time = (performance.now() - this.startPerf) / 1000;
    ctx.showTime = this.clock.time;
    ctx.showDt = 0;
    ctx.seeked = true;
    ctx.showPlaying = false;
    this.updateSystems(ctx, false);
    for (const h of this.frameHooks) h(ctx);
    this.sceneGlare.update(this, 0, true);
    this.postfx.render(this.scene, this.camera, 0, ctx.time);
  }
}
