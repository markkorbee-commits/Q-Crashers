import * as THREE from 'three';
import { AudioEngine } from '../audio/AudioEngine';
import type { AudioTrack } from '../audio/AudioTrack';
import { SilentTrack } from '../audio/AudioTrack';
import { PostFX } from '../postfx/PostFX';
import { ShowClock } from '../show/ShowClock';
import { ShowEngine, type ResolvedPalette } from '../show/ShowEngine';
import { Anchors } from './Anchors';
import { EventBus } from './EventBus';
import { Input } from './Input';
import { LightEnv } from './LightEnv';
import { detectDevice, pickQuality, PerfGovernor, QUALITY_ORDER, QUALITY_PRESETS, type DeviceProfile } from './Quality';
import type { BeatInfo, Collider2D, FrameContext, Interactable, NamedSpot, QualityLevel, QualitySettings, System } from './types';

export interface AppOptions {
  canvasParent: HTMLElement;
  showUrl: string;
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
  palette: ResolvedPalette = ShowEngine.newPalette();
  /** player feet position, maintained by the PlayerController */
  readonly playerPos = new THREE.Vector3(0, 0, 160);
  /** set by UI: hides HUD for cinema/photo mode */
  cinema = false;
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

    this.device = detectDevice(gl);
    const forced = this.params.get('quality') as QualityLevel | null;
    const level = forced && QUALITY_PRESETS[forced] ? forced : pickQuality(this.device);
    this.quality = { ...QUALITY_PRESETS[level] };
    this.governor = new PerfGovernor(this.device.mobile ? 30 : 58);
    this.governor.enabled = !forced && !this.params.has('nogovernor');

    this.camera = new THREE.PerspectiveCamera(this.device.mobile ? 70 : 72, 1, 0.1, this.quality.drawDistance);
    this.camera.position.set(0, 1.72, 160);
    this.scene.add(this.camera);
    this.input = new Input(canvas);
    this.postfx = new PostFX(this.renderer, this.quality);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
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
    this.events.emit('loading:progress', { label: 'Loading show data', progress: 0.02 });
    await this.show.load(this.opts.showUrl);
    this.clock = new ShowClock(new SilentTrack(this.show.duration), this.show.duration);
    this.clock.onEnded = () => this.events.emit('show:ended', {});
    this.events.emit('show:loaded', { duration: this.show.duration, title: this.show.file.meta.title });

    for (const off of (this.params.get('off') ?? '').split(',').filter(Boolean)) this.disabled.add(off);

    const n = this.systems.length;
    for (let i = 0; i < n; i++) {
      const s = this.systems[i];
      this.events.emit('loading:progress', { label: `Building ${s.name}`, progress: 0.05 + (0.9 * i) / n });
      // yield so the loading screen can paint
      await new Promise((r) => setTimeout(r, 0));
      try {
        await s.init?.(this);
        s.setQuality?.(this.quality);
        if (this.disabled.has(s.name)) s.setEnabled?.(false);
      } catch (e) {
        console.error(`[app] system ${s.name} failed to init`, e);
      }
    }
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
    this.events.emit('loading:progress', { label: 'Ready', progress: 1 });
    this.ready = true;
  }

  async setAudioTrack(track: AudioTrack): Promise<void> {
    await track.load();
    track.setVolume(1);
    const old = this.clock.track;
    await this.clock.setTrack(track);
    if (old !== track) old.dispose();
    this.events.emit('audio:source', { kind: track.kind, label: track.label, ready: true });
  }

  setQuality(level: QualityLevel): void {
    this.quality = { ...QUALITY_PRESETS[level] };
    this.camera.far = this.quality.drawDistance;
    this.camera.updateProjectionMatrix();
    for (const s of this.systems) {
      try {
        s.setQuality?.(this.quality);
      } catch (e) {
        console.error(`[app] ${s.name}.setQuality failed`, e);
      }
    }
    this.postfx.setQuality(this.quality);
    this.resize();
    this.events.emit('quality:changed', { level });
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
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
    const dt = Math.min(0.1, Math.max(0, (now - this.lastPerf) / 1000));
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
    this.show.tempo.beatInfo(clk.time, this.beat);
    this.show.paletteAt(clk.time, this.palette);
    this.env.reset();
    this.env.palettePrimary.copy(this.palette.primary);
    this.env.paletteSecondary.copy(this.palette.secondary);
    this.env.paletteAccent.copy(this.palette.accent);

    this.renderer.info.reset();
    const measure = this.params.has('debug') || this.frame % 30 === 0;
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
    for (const h of this.frameHooks) h(ctx);
    this.postfx.render(this.scene, this.camera, dt, ctx.time);
    this.lastRender.calls = this.renderer.info.render.calls;
    this.lastRender.triangles = this.renderer.info.render.triangles;
    this.input.endFrame();

    const verdict = this.governor.sample(dt);
    if (this.governor.scale !== this.lastScale) {
      this.lastScale = this.governor.scale;
      this.resize();
    }
    if (verdict === 'down') {
      const i = QUALITY_ORDER.indexOf(this.quality.level);
      if (i > 0) {
        this.setQuality(QUALITY_ORDER[i - 1]);
        this.events.emit('toast', { text: `Graphics adjusted to ${QUALITY_ORDER[i - 1].toUpperCase()} for smooth playback`, ms: 3000 });
      }
    }
  }
  private lastScale = 1;
  /** draw calls / triangles of the previous frame (renderer.info is reset every frame) */
  readonly lastRender = { calls: 0, triangles: 0 };
}
