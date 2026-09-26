import * as THREE from 'three';
import type { App } from '../core/App';
import { QUALITY_PRESETS } from '../core/Quality';
import { clamp, hash32, hashN } from '../core/rng';
import type { FrameContext, NamedSpot, QualityLevel, QualitySettings, System } from '../core/types';
import { TimeSlicer } from '../core/yieldTo';
import { DEFAULT_SPOTS, START_CHOICES } from '../player/spots';
import { buildFlagAtlas, buildSilhouetteAtlas } from './atlas';
import { Choreo, describeMood } from './choreo';
import { M, paletteColors, WIND_DIR } from './constants';
import {
  buildFlagGeometry,
  buildHeroGeometry,
  buildImpostorGeometry,
  buildMidGeometry,
  buildNearGeometry,
  buildPerformerGeometry,
  buildSpriteGeometry,
  triCount,
} from './geometry';
import { analyticHeight, generateLayout, LayoutCancelled, sampleDensity, type ClearZone, type CrowdLayout, type QueuePoint } from './layout';
import { Performers } from './performers';
import { buildProps } from './props';
import {
  bodyFragment,
  bodyVertex,
  FLAG_FRAG,
  FLAG_VERT,
  IMPOSTOR_FRAG,
  IMPOSTOR_VERT,
  LIGHTS_FRAG,
  LIGHTS_VERT,
  PROP_FRAG,
  PROP_VERT,
} from './shaders';

/**
 * CrowdSystem ('crowd') — the Defqon.1 Tribe the 2026 Endshow never had (design-bible §9),
 * plus everyone who WAS there on 27 June 2026 (MC, fire troupe, pianist, crew).
 *
 * Rendering (≤ 8 draw calls for the whole module):
 *   hero   smooth ~2.8k-tri bodies (hair caps, mitten hands, shoes) for the ~100 nearest people
 *   near   smooth ~0.7k-tri bodies + optional cap / hat / hair / bandana / cape slots, up to ~15 m
 *   mid    80-tri prism bodies with the same skeleton and per-vertex lighting
 *   far    camera-facing impostors from a procedurally drawn silhouette atlas (8 poses × 4 bodies)
 *   flags  poles + waving cloth attached to the carrier's hand (same pose code as the bodies)
 *   lights phone screens / flashlights / lighters (additive sprites in the hands)
 *   performers (CPU-posed, same body shader) + props (piano riser, white grand piano, pedestal …)
 * Per-person data lives in 3 float textures; each LOD draws an index list refreshed by chunked
 * frustum/LOD bucketing every few frames (8 m chunks; per person only in the nearest chunks).
 * All animation is a pure function of show time + the tempo grid → seek/pause safe.
 */

const TEX_W = 256;
const DEFAULT_COUNT = 45000;
const MAX_COUNT = 65000;

/**
 * LOD budgets per quality level. The headcount is decoupled from the detailed-LOD budgets: extra
 * people only go to the far impostors (2 tris each), so High shows the full 45,000-strong Tribe.
 *   hero  smooth ~2.8k-tri bodies for the nearest people (within heroR m)
 *   near  ~0.7k-tri bodies up to nearR m
 *   mid   ~110-tri bodies (chunks up to midR m)
 *   far   impostors
 * Near-range people are ranked by distance, so the nearest always get the finest mesh; everyone
 * within FADE_R of the lens goes to the dithered near-lens fade draw instead (hero body, near body on
 * mobile). Mobile has no hero bodies at all (the 0.8 M-triangle budget, docs/performance.md).
 * Worst-case crowd triangles (all budgets full, incl. phones + flags): ultra ~1.8M, high ~1.09M,
 * medium ~0.72M, mobile ~0.2M.
 */
interface LodBudget {
  heroN: number;
  heroR: number;
  nearN: number;
  nearR: number;
  midN: number;
  midR: number;
  /** headcount cap of the preset (all LODs) */
  head: number;
}
const LOD: Record<QualityLevel, LodBudget> = {
  ultra: { heroN: 150, heroR: 8, nearN: 1000, nearR: 20, midN: 4000, midR: 70, head: 65000 },
  high: { heroN: 100, heroR: 7, nearN: 500, nearR: 15, midN: 2400, midR: 55, head: 45000 },
  medium: { heroN: 60, heroR: 6, nearN: 340, nearR: 12, midN: 1600, midR: 45, head: 26000 },
  mobile: { heroN: 0, heroR: 5, nearN: 150, nearR: 10, midN: 800, midR: 36, head: 11000 },
};
const CAND_MAX = 16384;
const CAND_BINS = 128;
/** people whose body axis is within this distance (m) of the camera use the near-lens fade draw */
const FADE_R = 2.4;
/** walkers (sparse zones) stroll ± 2.4 m from their base position: route them earlier */
const FADE_R_WALKER = FADE_R + 2.4;
const FADE_MAX = 256;
/** a crew member (camera operators, photographers, safety) closer than this to the show camera is not filmed */
const CREW_HIDE_R = 6;

/**
 * Viewpoints the crowd keeps clear (see layout.ts ClearZone): every start choice plus the other
 * showcase viewpoints — nobody within 2.5 m, nobody in the ±60° forward cone out to 6 m, ~35 % of
 * the people between 6 and 9 m. Raised spots (y ≥ 8) look over the heads and need nothing.
 */
const CLEAR_VIEW_IDS = new Set<string>([...START_CHOICES.map((c) => c.id), 'dragon_view', 'piano']);
const CLEAR_VIEW = { ring: 2.5, cone: Math.PI / 3, r1: 6, r2: 9, keep: 0.35 };
/** every other named ground spot: a small ring so a teleport never lands inside a body */
const CLEAR_RING = 1.8;

/** viewpoints where no flag carrier should stand right in front of the camera (x, z, radius) */
const FLAG_FREE: [number, number, number][] = [
  [6, 32, 5.5], [0, 5.5, 5], [-4, 74, 5.5], [-70, 40, 5.5], [70, 40, 5.5], [0, 45, 5], [0, 118, 5], [4.6, 64.2, 5], [4, 146, 5],
];

const SKY_KEYS = [
  // t, zenith (sRGB), twilight low (sRGB) — design-bible §8.3
  [0, '#0a2a4e', '#c99a68'],
  [120, '#06183a', '#a8805e'],
  [400, '#030a1e', '#7a6450'],
  [800, '#02060f', '#4a4040'],
  [1300, '#010204', '#2a2a2e'],
] as const;

type Shared = Record<string, THREE.IUniform>;

export class CrowdSystem implements System {
  readonly name = 'crowd';
  /** Tribe mode (true) vs "As filmed" empty grounds (false) */
  populated = true;
  private app!: App;
  private enabled = true;
  private q!: QualitySettings;
  private target = DEFAULT_COUNT;
  private layout: CrowdLayout | null = null;
  private heightAt: (x: number, z: number) => number = analyticHeight;
  private queues: QueuePoint[] = [];
  private readonly root = new THREE.Group();
  private readonly crowdGroup = new THREE.Group();
  private u!: Shared;
  private texPos: THREE.DataTexture | null = null;
  private texAttr: THREE.DataTexture | null = null;
  private texLook: THREE.DataTexture | null = null;
  private atlas!: THREE.Texture;
  private flagTex!: THREE.Texture;
  private meshes: { hero: THREE.Mesh; near: THREE.Mesh; mid: THREE.Mesh; far: THREE.Mesh } | null = null;
  private idx!: {
    hero: THREE.InstancedBufferAttribute;
    near: THREE.InstancedBufferAttribute;
    mid: THREE.InstancedBufferAttribute;
    far: THREE.InstancedBufferAttribute;
  };
  /** near-lens fade draw: hero body (desktop) / near body (mobile), one shared dithered material */
  private fade!: { hero: THREE.Mesh; near: THREE.Mesh; idx: THREE.InstancedBufferAttribute };
  private fadeN = 0;
  private flagMesh!: THREE.Mesh;
  private flagGeo!: THREE.InstancedBufferGeometry;
  private lightsMesh!: THREE.Mesh;
  private perfMesh!: THREE.Mesh;
  private perfGeo!: THREE.InstancedBufferGeometry;
  private perfAttrs: THREE.InstancedBufferAttribute[] = [];
  /** compacted per-instance performer data (visible rows only) → the GPU attributes */
  private perfRows: { src: Float32Array; dst: Float32Array }[] = [];
  private perfDrawn = 0;
  private perfHidden = 0;
  private crewMask: Uint8Array = new Uint8Array(0);
  private cameraRig: { mode?: string } | null | undefined = undefined;
  /** layout build generation: a newer rebuild supersedes a running one */
  private buildGen = 0;
  private building = false;
  private propsMesh!: THREE.Mesh;
  private perf!: Performers;
  private choreo = new Choreo();
  private tris = { hero: 0, near: 0, mid: 0, far: 2, flag: 0, perf: 0 };
  // bucketing state (preallocated)
  private readonly frustum = new THREE.Frustum();
  private readonly projScreen = new THREE.Matrix4();
  private readonly box = new THREE.Box3();
  private order = new Int32Array(0);
  private dist = new Float32Array(0);
  private visChunk = new Int32Array(0);
  private visDist = new Float32Array(0);
  private readonly bins = new Int32Array(512);
  private chunkLod = new Uint8Array(0);
  private lastCam = new THREE.Vector3(1e9, 0, 0);
  private lastDir = new THREE.Vector3();
  private tmpV = new THREE.Vector3();
  private counts = { hero: 0, near: 0, mid: 0, far: 0, visible: 0 };
  private readonly candIdx = new Int32Array(CAND_MAX);
  private readonly candD = new Float32Array(CAND_MAX);
  private readonly lodBins = new Int32Array(CAND_BINS);
  private readonly hAllow = new Int32Array(CAND_BINS);
  private readonly nAllow = new Int32Array(CAND_BINS);
  private frame = 0;
  private cpuMs = 0;
  /** update() ran this frame: lateUpdate() owes the camera-dependent part */
  private lateDue = false;
  private updMs = 0;
  private rebuildTimer = 0;
  private testEnv = false;
  private testColor: THREE.Color | null = null;
  private tmpC = new THREE.Color();
  private tmpC2 = new THREE.Color();
  private sky: { t: number; z: THREE.Color; w: THREE.Color }[] = [];

  // ------------------------------------------------------------------------------------------
  // public API
  // ------------------------------------------------------------------------------------------

  /** people per m² at a ground position (0 in "As filmed" mode) */
  densityAt(x: number, z: number): number {
    if (!this.populated || !this.enabled || !this.layout) return 0;
    return sampleDensity(this.layout.density, x, z);
  }

  /** Tribe mode (true) or the empty grounds as filmed in 2026 (false). */
  setPopulated(on: boolean): void {
    this.populated = on;
    this.crowdGroup.visible = on && this.enabled;
    this.lastCam.set(1e9, 0, 0);
    this.app?.events.emit('crowd:populated', { on, count: on ? this.count : 0 });
  }

  /** 'tribe' (crowd present) or 'filmed' (the empty 2026 grounds) — read by lasers / ambience */
  get mode(): 'tribe' | 'filmed' {
    return this.populated ? 'tribe' : 'filmed';
  }

  /** LOD budgets of the current preset */
  private get lod(): LodBudget {
    return LOD[this.q?.level ?? 'high'] ?? LOD.high;
  }

  /**
   * Upper bound for setCount() on this device's quality preset (far impostors carry the extra people).
   * QualitySettings.crowdCount (core/Quality.ts) is the single source; LOD.head is only the fallback.
   */
  get maxCount(): number {
    const c = this.q?.crowdCount;
    return Math.min(MAX_COUNT, c !== undefined && Number.isFinite(c) && c > 0 ? c : this.lod.head);
  }

  /** head-count cap of any preset (the Graphics menu labels the presets with it) */
  maxCountFor(level: string): number {
    if (this.q && level === this.q.level) return this.maxCount;
    const c = (QUALITY_PRESETS as Partial<Record<string, QualitySettings>>)[level]?.crowdCount;
    if (c !== undefined && Number.isFinite(c) && c > 0) return Math.min(MAX_COUNT, c);
    return (LOD as Partial<Record<string, LodBudget>>)[level]?.head ?? 0;
  }

  /** crowd size (Tribe mode), 0…65,000, capped by the quality preset */
  setCount(n: number): void {
    const t = Math.round(clamp(n, 0, MAX_COUNT));
    if (t === this.target && this.layout) return;
    this.target = t;
    if (!this.app || !this.q) return;
    window.clearTimeout(this.rebuildTimer);
    this.rebuildTimer = window.setTimeout(() => void this.rebuild(), 150);
  }

  get count(): number {
    return this.layout?.count ?? 0;
  }

  get targetCount(): number {
    return this.target;
  }

  // ------------------------------------------------------------------------------------------

  async init(app: App): Promise<void> {
    this.app = app;
    this.q = app.quality;
    const P = app.params;
    const cnt = parseInt(P.get('crowd') ?? '', 10);
    if (Number.isFinite(cnt)) this.target = clamp(cnt, 0, MAX_COUNT);
    if (P.has('filmed') || P.get('mode') === 'filmed' || P.get('populated') === '0') this.populated = false;
    this.testEnv = P.has('crowdenv');
    const envHex = P.get('crowdenv') ?? '';
    if (/^[0-9a-f]{6}$/i.test(envHex)) this.testColor = new THREE.Color(`#${envHex}`);

    const terrain = app.get('terrain') as unknown as { heightAt?: (x: number, z: number) => number } | undefined;
    if (terrain && typeof terrain.heightAt === 'function' && !P.has('crowdslope')) {
      const fn = terrain.heightAt.bind(terrain);
      this.heightAt = (x, z) => {
        const y = fn(x, z);
        return Number.isFinite(y) ? y : analyticHeight(x, z);
      };
    }
    this.queues = this.findQueues();
    for (const s of SKY_KEYS) this.sky.push({ t: s[0], z: new THREE.Color(s[1]), w: new THREE.Color(s[2]) });

    this.root.name = 'crowd';
    this.crowdGroup.name = 'crowd-tribe';
    this.root.add(this.crowdGroup);
    app.scene.add(this.root);

    await app.loadStep('silhouettes', 0);
    this.atlas = buildSilhouetteAtlas();
    this.flagTex = buildFlagAtlas();
    this.u = this.makeUniforms();
    await app.loadStep('bodies', 0.08);
    this.buildMeshes();
    app.onFrame((ctx) => this.lateUpdate(ctx));

    // the piano riser is ours (bible §5.11): block the player, offer it as a viewpoint
    app.addCollider({ kind: 'box', minX: -2.8, maxX: 2.8, minZ: 57, maxZ: 61, tag: 'piano-riser' });
    app.addSpot({ id: 'piano', label: 'Piano riser (Domitor Draconis)', position: new THREE.Vector3(4.6, 0, 64.2), yaw: 0.72, pitch: -0.05 });
    await this.rebuild(true);
    this.setPopulated(this.populated);
  }

  private findQueues(): QueuePoint[] {
    const out: QueuePoint[] = [];
    const spots = this.app.spots;
    for (const it of this.app.interactables) {
      const m = /^bar_(.+)_\d+$/.exec(it.id);
      if (!m) continue;
      const spot = spots.find((s) => s.id === `bar_${m[1]}`);
      if (!spot) continue;
      const p = it.position;
      if (p.z > 175 || p.z < -5 || Math.abs(p.x) > 115) continue;
      out.push({ x: p.x, z: p.z, dx: Math.sin(spot.yaw), dz: Math.cos(spot.yaw) });
    }
    return out;
  }

  private makeUniforms(): Shared {
    const mood: THREE.Vector4[] = [];
    for (let i = 0; i < 5; i++) mood.push(new THREE.Vector4());
    return {
      tPos: { value: null },
      tAttr: { value: null },
      tLook: { value: null },
      tAtlas: { value: this.atlas },
      tFlags: { value: this.flagTex },
      uMood: { value: mood },
      uBeat: { value: new THREE.Vector4(0, 150, 0, 0.5) },
      uClock: { value: new THREE.Vector4() },
      uPlayer: { value: new THREE.Vector4(0, 0, 160, 1) },
      uCamPush: { value: new THREE.Vector4(0, 0, 0, 0) },
      uPal: { value: paletteColors() },
      uStageCol: { value: new THREE.Color() },
      uStagePos: { value: new THREE.Vector3(0, 14, -12) },
      uRimCol: { value: new THREE.Color() },
      uWashCol: { value: new THREE.Color() },
      uFlashCol: { value: new THREE.Color() },
      uFlashPos: { value: new THREE.Vector3(0, 20, -10) },
      uStrobe: { value: 0 },
      uSkyUp: { value: new THREE.Color() },
      uSkyLow: { value: new THREE.Color() },
      uTwilight: { value: new THREE.Color() },
      uMoonCol: { value: new THREE.Color('#f2dcc0').multiplyScalar(0.035) },
      uMoonDir: { value: new THREE.Vector3(0.282, 0.128, -0.951).normalize() },
      uHazeAmb: { value: new THREE.Color() },
      uWind: { value: WIND_DIR.clone() },
      uScreen: { value: new THREE.Color('#dfe8ff') },
      uPixel: { value: 0.001 },
      uLantern: { value: new THREE.Vector4() },
      uKey: { value: new THREE.Vector4() },
      uGroups: { value: new THREE.Vector4() },
      uTube: { value: new THREE.Vector4(0.85, 0.92, 1, 0) },
      uLumCap: { value: 0.5 },
    };
  }

  private material(vs: string, fs: string, opts: Partial<THREE.ShaderMaterialParameters> = {}): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...this.u },
      vertexShader: vs,
      fragmentShader: fs,
      fog: true,
      ...opts,
    });
  }

  private instanced(base: THREE.BufferGeometry): THREE.InstancedBufferGeometry {
    const g = new THREE.InstancedBufferGeometry();
    if (base.index) g.setIndex(base.index);
    for (const [k, a] of Object.entries(base.attributes)) g.setAttribute(k, a);
    g.instanceCount = 0;
    return g;
  }

  private lodMesh(base: THREE.BufferGeometry, mat: THREE.Material, name: string, cap = 65536): { mesh: THREE.Mesh; idx: THREE.InstancedBufferAttribute } {
    const g = this.instanced(base);
    const idx = new THREE.InstancedBufferAttribute(new Uint16Array(cap), 1);
    idx.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aIdx', idx);
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = name;
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    this.crowdGroup.add(mesh);
    return { mesh, idx };
  }

  private buildMeshes(): void {
    const heroBase = buildHeroGeometry();
    const nearBase = buildNearGeometry();
    const midBase = buildMidGeometry();
    const farBase = buildImpostorGeometry();
    this.tris.hero = triCount(heroBase);
    this.tris.near = triCount(nearBase);
    this.nearVerts = nearBase.getAttribute('position').count;
    this.tris.mid = triCount(midBase);
    const hero = this.lodMesh(heroBase, this.material(bodyVertex('hero'), bodyFragment('hero')), 'crowd-hero', 2048);
    const near = this.lodMesh(nearBase, this.material(bodyVertex('near'), bodyFragment('near')), 'crowd-near');
    const mid = this.lodMesh(midBase, this.material(bodyVertex('mid'), bodyFragment('mid')), 'crowd-mid');
    const farMat = this.material(IMPOSTOR_VERT, IMPOSTOR_FRAG, { side: THREE.DoubleSide });
    const far = this.lodMesh(farBase, farMat, 'crowd-far');
    hero.mesh.renderOrder = 1;
    near.mesh.renderOrder = 1;
    mid.mesh.renderOrder = 2;
    far.mesh.renderOrder = 3;
    this.meshes = { hero: hero.mesh, near: near.mesh, mid: mid.mesh, far: far.mesh };
    this.idx = { hero: hero.idx, near: near.idx, mid: mid.idx, far: far.idx };

    // near-lens fade: the few people right at the camera, dissolved with a dithered discard (its own
    // program, so the big hero / near draws keep early-Z). Both bodies share the index list and the
    // material; only the one matching the preset gets instances.
    const fadeMat = this.material(bodyVertex('hero', true), bodyFragment('hero', true));
    const fadeHero = this.lodMesh(heroBase, fadeMat, 'crowd-fade', FADE_MAX);
    const fadeNearGeo = this.instanced(nearBase);
    fadeNearGeo.setAttribute('aIdx', fadeHero.idx);
    const fadeNear = new THREE.Mesh(fadeNearGeo, fadeMat);
    fadeNear.name = 'crowd-fade-near';
    fadeNear.frustumCulled = false;
    fadeNear.matrixAutoUpdate = false;
    fadeHero.mesh.renderOrder = 0;
    fadeNear.renderOrder = 0;
    this.crowdGroup.add(fadeNear);
    this.fade = { hero: fadeHero.mesh, near: fadeNear, idx: fadeHero.idx };

    // flags
    const flagBase = buildFlagGeometry();
    this.tris.flag = triCount(flagBase);
    this.flagGeo = this.instanced(flagBase);
    this.flagMesh = new THREE.Mesh(this.flagGeo, this.material(FLAG_VERT, FLAG_FRAG, { side: THREE.DoubleSide }));
    this.flagMesh.name = 'crowd-flags';
    this.flagMesh.frustumCulled = false;
    this.crowdGroup.add(this.flagMesh);

    // phone screens / flashlights / lighters
    const lightsGeo = this.instanced(buildSpriteGeometry());
    this.lightsMesh = new THREE.Mesh(
      lightsGeo,
      new THREE.ShaderMaterial({
        uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...this.u },
        vertexShader: LIGHTS_VERT,
        fragmentShader: LIGHTS_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: true,
      }),
    );
    this.lightsMesh.name = 'crowd-phones';
    this.lightsMesh.frustumCulled = false;
    this.lightsMesh.renderOrder = 10;
    this.crowdGroup.add(this.lightsMesh);

    // performers & crew
    this.perf = new Performers(this.heightAt);
    const perfBase = buildPerformerGeometry(this.q.level === 'mobile' ? 'near' : 'hero');
    this.tris.perf = triCount(perfBase);
    this.perfGeo = this.instanced(perfBase);
    // the GPU gets only the performers that are on this frame (compacted rows), so the ~38 bodies of
    // the cast do not cost triangles while they are off stage
    const pa = (name: string, src: Float32Array) => {
      const dst = new Float32Array(src.length);
      const a = new THREE.InstancedBufferAttribute(dst, 4);
      a.setUsage(THREE.DynamicDrawUsage);
      this.perfGeo.setAttribute(name, a);
      this.perfAttrs.push(a);
      this.perfRows.push({ src, dst });
    };
    pa('iPos', this.perf.iPos);
    pa('iAttr', this.perf.iAttr);
    pa('iLook', this.perf.iLook);
    this.perf.iP.forEach((arr, i) => pa(`iP${i}`, arr));
    this.perfGeo.instanceCount = 0;
    // crew: never in front of the show camera (camera operators, photographers, drone pilot, safety)
    this.crewMask = new Uint8Array(this.perf.count);
    this.perf.perfs.forEach((p, i) => {
      const crew = p.mode !== 'both' || p.name.endsWith('cam') || p.name === 'terrace';
      this.crewMask[i] = crew ? 1 : 0;
    });
    this.perfMesh = new THREE.Mesh(this.perfGeo, this.material(bodyVertex('performer', true), bodyFragment('performer', true)));
    this.perfMesh.name = 'performers';
    this.perfMesh.frustumCulled = false;
    this.root.add(this.perfMesh);

    // props
    this.propsMesh = new THREE.Mesh(buildProps(), this.material(PROP_VERT, PROP_FRAG, { side: THREE.DoubleSide }));
    this.propsMesh.name = 'performer-props';
    this.root.add(this.propsMesh);
  }

  /**
   * The viewpoints kept clear of people: each start choice (+ dragon view, piano riser, the deck
   * spots) gets the full clear view, every other named ground spot a small ring. Spots not registered
   * yet (the player adds its defaults after the crowd) come from player/spots.ts DEFAULT_SPOTS.
   */
  private clearZones(): ClearZone[] {
    const spots = new Map<string, NamedSpot>();
    for (const s of DEFAULT_SPOTS) spots.set(s.id, s);
    for (const s of this.app.spots) spots.set(s.id, s);
    const out: ClearZone[] = [];
    for (const s of spots.values()) {
      const p = s.position;
      if (p.y >= 8) continue;
      const view = CLEAR_VIEW_IDS.has(s.id) || p.z < 3; // start choices, showcase views, the deck spots
      if (!view) {
        out.push({ x: p.x, z: p.z, ring: CLEAR_RING });
        continue;
      }
      // raised viewpoints (stage deck, photo terrace) look over the heads: their cone stays clear,
      // but the 6–9 m band is not thinned (it would open holes in the packed barrier rows)
      const raised = p.y - this.heightAt(p.x, p.z) >= 1.5;
      out.push({ x: p.x, z: p.z, yaw: s.yaw, ...CLEAR_VIEW, keep: raised ? 1 : CLEAR_VIEW.keep });
    }
    return out;
  }

  /**
   * (Re)generate the crowd for the current target count / quality. Sliced (≤ 12 ms per task) with
   * loading-bar sub-steps during init; a live count / preset change keeps the current Tribe on
   * screen until the new one is ready, and a newer request supersedes a running build.
   */
  private async rebuild(loading = false): Promise<void> {
    const gen = ++this.buildGen;
    const q = this.q;
    const n = Math.min(this.target, this.maxCount);
    const flagTarget = Math.min(q.flagCount, Math.round(n * 0.008));
    const avoid: [number, number, number][] = FLAG_FREE.slice();
    for (const sp of this.app.spots) if (sp.position.y < 8) avoid.push([sp.position.x, sp.position.z, 5]);
    const t0 = performance.now();
    const slicer = new TimeSlicer(12);
    const app = this.app;
    let idle = 0;
    const timed = async (p: Promise<void>) => {
      const a = performance.now();
      await p;
      idle += performance.now() - a;
    };
    this.building = true;
    const clear = this.clearZones();
    this.clearCount = clear.length;
    let layout: CrowdLayout;
    try {
      layout = await generateLayout(
        {
          target: n,
          heightAt: this.heightAt,
          colliders: this.app.colliders.filter((c) => c.tag !== 'piano-riser'),
          queues: this.queues,
          flagTarget,
          flagAvoid: avoid,
          clear,
        },
        {
          step: loading ? (label, f) => timed(app.loadStep(label, 0.1 + 0.88 * f)) : undefined,
          due: () => slicer.due(),
          yield: () => timed(slicer.yield()),
          cancelled: () => gen !== this.buildGen,
        },
      );
    } catch (e) {
      if (e instanceof LayoutCancelled) return;
      throw e;
    } finally {
      if (gen === this.buildGen) this.building = false;
    }
    if (gen !== this.buildGen) return;
    this.layout = layout;
    const rows = Math.max(1, Math.ceil(layout.count / TEX_W));
    const mk = (src: Float32Array, old: THREE.DataTexture | null) => {
      old?.dispose();
      const data = new Float32Array(TEX_W * rows * 4);
      data.set(src);
      const tex = new THREE.DataTexture(data, TEX_W, rows, THREE.RGBAFormat, THREE.FloatType);
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    };
    this.texPos = mk(layout.pos, this.texPos);
    this.texAttr = mk(layout.attr, this.texAttr);
    this.texLook = mk(layout.look, this.texLook);
    this.u.tPos.value = this.texPos;
    this.u.tAttr.value = this.texAttr;
    this.u.tLook.value = this.texLook;

    // flags (instance attributes)
    const nf = layout.flags.length;
    const f1 = new Float32Array(Math.max(1, nf) * 4);
    const f2 = new Float32Array(Math.max(1, nf) * 4);
    layout.flags.forEach((f, i) => {
      f1.set([f.carrier, f.type, f.pole, f.w], i * 4);
      f2.set([f.h, f.w < 1 ? 1 : 0, (hash32(hashN(f.carrier, 5)) / 4294967296) * 6.28, 0], i * 4);
    });
    this.flagGeo.dispose();
    this.flagGeo.setAttribute('iFlag', new THREE.InstancedBufferAttribute(f1, 4));
    this.flagGeo.setAttribute('iFlag2', new THREE.InstancedBufferAttribute(f2, 4));
    this.flagGeo.instanceCount = nf;
    (this.lightsMesh.geometry as THREE.InstancedBufferGeometry).instanceCount = layout.count;

    this.order = new Int32Array(layout.chunks.length);
    this.dist = new Float32Array(layout.chunks.length);
    this.visChunk = new Int32Array(layout.chunks.length);
    this.chunkLod = new Uint8Array(layout.chunks.length).fill(2);
    this.visDist = new Float32Array(layout.chunks.length);
    this.lastCam.set(1e9, 0, 0);
    this.buildMs = performance.now() - t0 - idle;
    this.buildWallMs = performance.now() - t0;
  }
  /** CPU time of the last layout build (ms, without the yields) and its wall-clock time */
  private buildMs = 0;
  private buildWallMs = 0;
  private clearCount = 0;
  private showFile: unknown = null;
  private nearVerts = 0;
  private bucketMs = 0;

  setQuality(q: QualitySettings): void {
    const prev = this.q;
    this.q = q;
    if (!this.app) return;
    if (!prev || prev.level !== q.level || prev.crowdCount !== q.crowdCount || prev.flagCount !== q.flagCount) void this.rebuild();
    this.lastCam.set(1e9, 0, 0);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.root.visible = on;
    this.crowdGroup.visible = on && this.populated;
  }

  // ------------------------------------------------------------------------------------------
  // per frame
  // ------------------------------------------------------------------------------------------

  update(ctx: FrameContext): void {
    if (!this.enabled || !this.layout || !this.meshes) return;
    const t0 = performance.now();
    this.frame++;
    const app = this.app;
    const t = ctx.showTime;
    const u = this.u;

    // --- mood + beat
    const section = app.show.file ? app.show.section(t) : null;
    this.choreo.evaluate(t, ctx.beat, section, app.show.file ? app.show : null);
    const mood = u.uMood.value as THREE.Vector4[];
    const m = this.choreo.mood;
    for (let i = 0; i < 5; i++) mood[i].set(m[i * 4], m[i * 4 + 1], m[i * 4 + 2], m[i * 4 + 3]);
    (u.uBeat.value as THREE.Vector4).set(ctx.beat.beat, ctx.beat.bpm, ctx.beat.hasKick ? 1 : 0, ctx.beat.energy);
    (u.uClock.value as THREE.Vector4).set(t, ctx.time, 0, this.choreo.cheer);
    const pp = ctx.playerPos;
    (u.uPlayer.value as THREE.Vector4).set(pp.x, pp.y, pp.z, 1);
    // a free / drone camera flying low through the crowd pushes people aside too
    const cp = ctx.camera.position;
    const camLow = cp.y - this.heightAt(cp.x, cp.z) < 2.4 && (cp.x - pp.x) ** 2 + (cp.z - pp.z) ** 2 > 0.25 ? 1 : 0;
    (u.uCamPush.value as THREE.Vector4).set(cp.x, cp.z, 0, camLow);

    // --- light environment → uniforms
    if (this.testEnv) this.fakeEnv(ctx);
    this.updateLighting(t, ctx);

    // --- performers (both modes), props — windows from the show file (re-read when it changes)
    if (app.show.file !== this.showFile) {
      this.showFile = app.show.file;
      this.perf.timing.load(app.show.file ? app.show : null);
    }
    this.perf.update(t, ctx.time, ctx.beat.beat, ctx.beat.bpm, m[M.LOOKUP], this.populated);
    (u.uLantern.value as THREE.Vector4).copy(this.perf.lantern);
    // set wash spilling onto the deck (follow spots / key lights are per performer, see Performers)
    const env = app.env;
    const key = u.uKey.value as THREE.Vector4;
    key.set(env.stageWashColor.r * env.stageWashIntensity * 0.5, env.stageWashColor.g * env.stageWashIntensity * 0.5, env.stageWashColor.b * env.stageWashIntensity * 0.5, 1);
    (u.uGroups.value as THREE.Vector4).set(1, this.perf.pedestal, this.perf.strap, 0);
    (u.uTube.value as THREE.Vector4).w = this.perf.pianoTube;
    const cam = ctx.camera;
    u.uPixel.value = (2 * Math.tan((cam.fov * Math.PI) / 360)) / Math.max(200, app.renderer.domElement.height);

    if (this.populated) {
      this.lightsMesh.visible = m[M.PHONES] > 0.01 || m[M.LIGHTERS] > 0.01;
      this.flagMesh.visible = this.layout.flags.length > 0;
    }
    // the camera-dependent work (LOD lists, near-lens fade list, crew culling) runs in lateUpdate(),
    // after the camera rig has placed this frame's camera
    this.updMs = performance.now() - t0;
    this.lateDue = true;
  }

  /**
   * After every system updated (App.onFrame hook, before render): LOD bucketing and the performer
   * upload with the camera pose this frame is rendered with. Run inside update() (crowd updates
   * before the camera rig) they used the previous frame's camera: the first frame after every show
   * camera cut or teleport drew the crowd bucketed for the old viewpoint — the people around the
   * new camera were missing for one frame (a flicker at each cut).
   */
  private lateUpdate(ctx: FrameContext): void {
    if (!this.lateDue) return;
    this.lateDue = false;
    const t0 = performance.now();
    const cam = ctx.camera;
    this.uploadPerformers(cam);
    // --- crowd LOD bucketing (every 3rd frame, or at once when the camera jumps / turns)
    if (this.populated && this.layout && this.meshes) {
      cam.getWorldDirection(this.tmpV);
      // 0.6 m: the near-lens fade list must follow a fast camera (slower moves re-bucket every 3rd frame)
      const moved = cam.position.distanceToSquared(this.lastCam) > 0.36 || this.tmpV.dot(this.lastDir) < 0.995;
      if (moved || this.frame % 3 === 0 || ctx.seeked) {
        const tb = performance.now();
        this.bucket(cam);
        this.bucketMs = this.bucketMs * 0.8 + (performance.now() - tb) * 0.2;
      }
    }
    const ms = this.updMs + performance.now() - t0;
    this.cpuMs = this.cpuMs * 0.9 + ms * 0.1;
  }

  /**
   * Copy the performers that are on this frame into the front rows of the GPU attributes (the draw
   * covers only them). Crew members (camera operators, the terrace photographer, pilot, safety) are
   * left out while the show camera is within CREW_HIDE_R of them: a film crew keeps itself out of
   * its own shots (e.g. the terrace photographer at the photo-terrace camera positions).
   */
  private uploadPerformers(cam: THREE.PerspectiveCamera): void {
    const P = this.perf;
    const rows = this.perfRows;
    const src0 = P.iPos;
    const attr = P.iAttr;
    if (this.cameraRig === undefined) this.cameraRig = (this.app.get('camera') as unknown as { mode?: string } | undefined) ?? null;
    const showcam = this.cameraRig?.mode === 'showcam';
    const cp = cam.position;
    let n = 0;
    let hidden = 0;
    for (let i = 0; i < P.count; i++) {
      const o = i * 4;
      if (!(attr[o] > 0)) continue; // not on this frame
      if (showcam && this.crewMask[i]) {
        const dx = src0[o] - cp.x;
        const dy = src0[o + 1] + 1.5 - cp.y;
        const dz = src0[o + 2] - cp.z;
        if (dx * dx + dy * dy + dz * dz < CREW_HIDE_R * CREW_HIDE_R) {
          hidden++;
          continue;
        }
      }
      const d = n * 4;
      for (let r = 0; r < rows.length; r++) {
        const s = rows[r].src;
        const w = rows[r].dst;
        w[d] = s[o];
        w[d + 1] = s[o + 1];
        w[d + 2] = s[o + 2];
        w[d + 3] = s[o + 3];
      }
      n++;
    }
    this.perfGeo.instanceCount = n;
    this.perfMesh.visible = n > 0;
    this.perfDrawn = n;
    this.perfHidden = hidden;
    if (n === 0) return;
    for (let r = 0; r < this.perfAttrs.length; r++) {
      const a = this.perfAttrs[r];
      a.clearUpdateRanges();
      a.addUpdateRange(0, n * 4);
      a.needsUpdate = true;
    }
  }

  private bucket(cam: THREE.PerspectiveCamera): void {
    const L = this.layout!;
    cam.updateMatrixWorld();
    this.projScreen.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreen);
    this.lastCam.copy(cam.position);
    cam.getWorldDirection(this.lastDir);
    const cp = cam.position;
    const chunks = L.chunks;
    const order = this.order;
    const dist = this.dist;
    // frustum test + distance, then an O(n) counting sort on 1 m distance bins (front to back)
    const bins = this.bins;
    bins.fill(0);
    const vis = this.visChunk;
    const vd = this.visDist;
    let nvis = 0;
    for (let c = 0; c < chunks.length; c++) {
      const ch = chunks[c];
      this.box.min.set(ch.minX, ch.minY, ch.minZ);
      this.box.max.set(ch.maxX, ch.maxY + 0.6, ch.maxZ);
      if (!this.frustum.intersectsBox(this.box)) continue;
      const dx = Math.max(ch.minX - cp.x, 0, cp.x - ch.maxX);
      const dy = Math.max(ch.minY - cp.y, 0, cp.y - ch.maxY);
      const dz = Math.max(ch.minZ - cp.z, 0, cp.z - ch.maxZ);
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      vis[nvis] = c;
      vd[nvis] = d;
      nvis++;
      bins[Math.min(511, d | 0)]++;
    }
    let acc = 0;
    for (let b = 0; b < 512; b++) {
      const n = bins[b];
      bins[b] = acc;
      acc += n;
    }
    for (let k = 0; k < nvis; k++) {
      const slot = bins[Math.min(511, vd[k] | 0)]++;
      order[slot] = vis[k];
      dist[slot] = vd[k];
    }
    const nv = nvis;
    const B = this.lod;
    const pos = L.pos;
    const cx = cp.x;
    const cy = cp.y;
    const cz = cp.z;
    const heroR2 = B.heroR * B.heroR;
    const nearR2 = B.nearR * B.nearR;
    const ah = this.idx.hero.array as Uint16Array;
    const an = this.idx.near.array as Uint16Array;
    const am = this.idx.mid.array as Uint16Array;
    const af = this.idx.far.array as Uint16Array;
    const candIdx = this.candIdx;
    const candD = this.candD;
    const attr = L.attr;
    const afd = this.fade.idx.array as Uint16Array;
    const fR2 = FADE_R * FADE_R;
    const fRw2 = FADE_R_WALKER * FADE_R_WALKER;
    let nc = 0;
    let nh = 0;
    let nn = 0;
    let nm = 0;
    let nfar = 0;
    let nfd = 0;
    for (let k = 0; k < nv; k++) {
      const ci = order[k];
      const ch = chunks[ci];
      const d = dist[k];
      const s = ch.start;
      const e = s + ch.count;
      // hysteresis: a chunk keeps its finer LOD for a few metres past the threshold (no flicker)
      const prev = this.chunkLod[ci];
      if (d < B.nearR + (prev === 0 ? 2 : 0)) {
        // close chunks: everyone within nearR becomes a candidate, ranked by distance below
        for (let i = s; i < e; i++) {
          const dx = pos[i * 4] - cx;
          const dy = pos[i * 4 + 1] + 1.1 - cy;
          const dz = pos[i * 4 + 2] - cz;
          // right at the lens (body axis within FADE_R; walkers within their stroll): the fade draw
          const hd2 = dx * dx + dz * dz;
          if (hd2 < fRw2 && nfd < FADE_MAX) {
            const zone = attr[i * 4 + 3];
            const r2 = zone === 3 || zone === 5 || zone === 6 ? fRw2 : fR2;
            // vertical gap between the lens and the body axis (feet … raised hands, ~2.3 m)
            const py = pos[i * 4 + 1];
            const dv = Math.max(0, py - cy, cy - py - 2.3);
            if (hd2 + dv * dv < r2) {
              afd[nfd++] = i;
              continue;
            }
          }
          const d2 = hd2 + dy * dy;
          if (d2 < nearR2 && nc < CAND_MAX) {
            candIdx[nc] = i;
            candD[nc] = d2;
            nc++;
          } else if (nm < B.midN) am[nm++] = i;
          else af[nfar++] = i;
        }
        this.chunkLod[ci] = 0;
      } else if (d < B.midR + (prev <= 1 ? 4 : 0) && nm + ch.count <= B.midN) {
        for (let i = s; i < e; i++) am[nm++] = i;
        this.chunkLod[ci] = 1;
      } else {
        for (let i = s; i < e; i++) af[nfar++] = i;
        this.chunkLod[ci] = 2;
      }
    }
    // rank the candidates by distance (128 bins over nearR): the nearest heroN within heroR → hero,
    // the next nearN → near, the rest mid / far — elevated or wide views never waste detail on the
    // back of the near range while someone right in front of the camera is drawn as a prism
    const lb = this.lodBins;
    const hAllow = this.hAllow;
    const nAllow = this.nAllow;
    lb.fill(0);
    const bs = CAND_BINS / B.nearR;
    for (let j = 0; j < nc; j++) {
      const bin = Math.min(CAND_BINS - 1, (Math.sqrt(candD[j]) * bs) | 0);
      candD[j] = bin;
      lb[bin]++;
    }
    let hq = B.heroN;
    let nq = B.nearN;
    for (let b = 0; b < CAND_BINS; b++) {
      const cnt = lb[b];
      const h = (b + 0.5) / bs < B.heroR ? Math.min(cnt, hq) : 0;
      hq -= h;
      const n = Math.min(cnt - h, nq);
      nq -= n;
      hAllow[b] = h;
      nAllow[b] = n;
    }
    for (let j = 0; j < nc; j++) {
      const bin = candD[j];
      const i = candIdx[j];
      if (hAllow[bin] > 0) {
        hAllow[bin]--;
        ah[nh++] = i;
      } else if (nAllow[bin] > 0) {
        nAllow[bin]--;
        an[nn++] = i;
      } else if (nm < B.midN) am[nm++] = i;
      else af[nfar++] = i;
    }
    this.commit(this.idx.hero, this.meshes!.hero, nh);
    this.commit(this.idx.near, this.meshes!.near, nn);
    this.commit(this.idx.mid, this.meshes!.mid, nm);
    this.commit(this.idx.far, this.meshes!.far, nfar);
    // the fade draw uses the hero body, the near body on presets without hero bodies (mobile)
    const fadeHero = B.heroN > 0;
    this.commit(this.fade.idx, fadeHero ? this.fade.hero : this.fade.near, nfd);
    const other = fadeHero ? this.fade.near : this.fade.hero;
    (other.geometry as THREE.InstancedBufferGeometry).instanceCount = 0;
    other.visible = false;
    this.fadeN = nfd;
    this.counts.hero = nh;
    this.counts.near = nn;
    this.counts.mid = nm;
    this.counts.far = nfar;
    this.counts.visible = nh + nn + nm + nfar + nfd;
  }

  private commit(attr: THREE.InstancedBufferAttribute, mesh: THREE.Mesh, n: number): void {
    (mesh.geometry as THREE.InstancedBufferGeometry).instanceCount = n;
    mesh.visible = n > 0;
    if (n === 0) return;
    attr.clearUpdateRanges();
    attr.addUpdateRange(0, n);
    attr.needsUpdate = true;
  }

  /** LightEnv → crowd lighting uniforms (cheap fake GI; silhouettes against the stage) */
  private updateLighting(t: number, ctx: FrameContext): void {
    const env = this.app.env;
    const u = this.u;
    const si = Math.max(0, env.stageIntensity);
    const stage = u.uStageCol.value as THREE.Color;
    stage.copy(env.stageColor).multiplyScalar(0.12 + si * 0.5);
    stage.r += env.stageWashColor.r * env.stageWashIntensity * 0.22 + env.palettePrimary.r * 0.025;
    stage.g += env.stageWashColor.g * env.stageWashIntensity * 0.22 + env.palettePrimary.g * 0.025;
    stage.b += env.stageWashColor.b * env.stageWashIntensity * 0.22 + env.palettePrimary.b * 0.025;
    const rim = u.uRimCol.value as THREE.Color;
    rim.copy(env.stageWashColor).multiplyScalar(0.25 + env.stageWashIntensity * 0.9);
    rim.r += env.stageColor.r * si * 0.9 + env.palettePrimary.r * 0.08;
    rim.g += env.stageColor.g * si * 0.9 + env.palettePrimary.g * 0.08;
    rim.b += env.stageColor.b * si * 0.9 + env.palettePrimary.b * 0.08;
    softClamp(stage, 2.2);
    softClamp(rim, 1.8);
    // haze scattering: the lit haze above the field acts like a coloured sky dome (from above / the front)
    const hz = u.uHazeAmb.value as THREE.Color;
    hz.copy(stage).multiplyScalar(0.5).add(this.tmpC.copy(rim).multiplyScalar(0.25));
    hz.multiplyScalar(0.12 * clamp(env.haze, 0, 1.2));
    // beams sweeping the audience: moving pools, not a flood light
    const wash = u.uWashCol.value as THREE.Color;
    wash.copy(env.stageColor).lerp(env.paletteSecondary, 0.25).multiplyScalar(env.audienceWash * (0.1 + si * 0.1));
    (u.uScreen.value as THREE.Color).setRGB(0.55, 0.62, 0.75).lerp(env.stageColor, 0.35).lerp(env.palettePrimary, 0.2);
    // pyro / firework / strobe flashes (one weighted centre from LightEnv): directional only, soft-limited
    const fl = u.uFlashCol.value as THREE.Color;
    fl.copy(env.flashColor).multiplyScalar(0.8);
    softClamp(fl, 3);
    // LightEnv merges every flash into one weighted centre; strobes / blinders / pyro face the
    // audience from the stage, so keep the crowd's flash on the stage side (never from behind the
    // spectators, which would fill their backs with light)
    const fp = u.uFlashPos.value as THREE.Vector3;
    fp.copy(env.flashPos);
    fp.z = Math.min(fp.z, 4);
    fp.y = Math.max(fp.y, 6);
    u.uStrobe.value = clamp(env.strobe, 0, 1.2);
    // the crowd never outshines the lit set: its luminance rolls off towards ~1/3 of the set level
    u.uLumCap.value = 0.36 + 0.14 * clamp(si / 3, 0, 1);
    // sky ambient + the last twilight behind the audience (design-bible §8.3)
    const S = this.sky;
    let i = 0;
    while (i < S.length - 2 && t > S[i + 1].t) i++;
    const k = clamp((t - S[i].t) / (S[i + 1].t - S[i].t), 0, 1);
    this.tmpC.copy(S[i].z).lerp(S[i + 1].z, k);
    this.tmpC2.copy(S[i].w).lerp(S[i + 1].w, k);
    (u.uSkyUp.value as THREE.Color).copy(this.tmpC).multiplyScalar(2.6).addScalar(0.0025);
    (u.uSkyLow.value as THREE.Color).copy(this.tmpC).multiplyScalar(0.8).addScalar(0.001);
    (u.uTwilight.value as THREE.Color).copy(this.tmpC2).multiplyScalar(0.05 * (1 - clamp(t / 1500, 0, 0.8)));
    // moon drifts from az 161.5° to 167.1° over the show
    const mk = clamp(t / 1581, 0, 1);
    (u.uMoonDir.value as THREE.Vector3).set(0.282 + (0.372 - 0.282) * mk, 0.128 + 0.018 * mk, -0.951 + 0.034 * mk).normalize();
    void ctx;
  }

  /** ?crowdenv — stand-in light environment for testing the crowd without the lighting system */
  private fakeEnv(ctx: FrameContext): void {
    const env = this.app.env;
    if (env.stageIntensity > 0.001) return;
    const e = ctx.beat.energy;
    env.stageColor.copy(this.testColor ?? env.palettePrimary);
    env.stageIntensity = 0.6 + 1.4 * e * (0.5 + 0.5 * ctx.beat.kick);
    env.audienceWash = 0.35 + 0.4 * e;
    env.stageWashColor.copy(this.testColor ?? env.palettePrimary).lerp(env.paletteSecondary, this.testColor ? 0.1 : 0.3);
    env.stageWashIntensity = 0.9 + 0.6 * e;
  }

  stats(): Record<string, number | string> {
    const L = this.layout;
    if (!this.enabled) return { mode: 'disabled', total: 0, near: 0, mid: 0, far: 0, flags: 0, drawCalls: 0 };
    return {
      mode: this.populated ? 'tribe' : 'as filmed',
      total: this.populated ? (L?.count ?? 0) : 0,
      target: this.target,
      hero: this.populated ? this.counts.hero : 0,
      near: this.populated ? this.counts.near : 0,
      mid: this.populated ? this.counts.mid : 0,
      far: this.populated ? this.counts.far : 0,
      fade: this.populated ? this.fadeN : 0,
      flags: this.populated ? (L?.flags.length ?? 0) : 0,
      capes: L?.capes ?? 0,
      performers: this.perf ? this.perf.visibleCount : 0,
      crew: this.perf ? this.perf.crewVisible : 0,
      perfDrawn: this.perfDrawn,
      crewHidden: this.perfHidden,
      perfTris: this.perfDrawn * this.tris.perf,
      clearZones: this.clearCount,
      mood: describeMood(this.choreo.mood),
      cheer: this.choreo.cheer.toFixed(2),
      cue: this.choreo.cueState,
      zones: L ? L.zoneCounts.join('/') : '-',
      tris: `${this.tris.hero}/${this.tris.near}/${this.tris.mid}/${this.tris.far}`,
      crowdTris: this.populated ? this.crowdTris() : 0,
      lod: `${this.lod.heroN}@${this.lod.heroR}m/${this.lod.nearN}@${this.lod.nearR}m/${this.lod.midN}@${this.lod.midR}m`,
      nearVerts: this.nearVerts,
      drawCalls: this.drawCalls(),
      cpuMs: this.cpuMs.toFixed(3),
      bucketMs: this.bucketMs.toFixed(3),
      buildMs: this.buildMs.toFixed(0),
      buildWallMs: this.buildWallMs.toFixed(0),
      building: this.building ? 1 : 0,
    };
  }

  /** triangles submitted for the crowd (bodies of every LOD + the fade draw + phone sprites + flags) */
  private crowdTris(): number {
    const c = this.counts;
    const T = this.tris;
    let n = c.hero * T.hero + c.near * T.near + c.mid * T.mid + c.far * T.far;
    n += this.fadeN * (this.lod.heroN > 0 ? T.hero : T.near);
    if (this.lightsMesh?.visible) n += (this.layout?.count ?? 0) * 2;
    if (this.flagMesh?.visible) n += (this.layout?.flags.length ?? 0) * T.flag;
    return n;
  }

  /** draw calls issued by this module this frame (crowd LODs, flags, phones, performers, props) */
  private drawCalls(): number {
    let n = 1; // props
    if (this.perfMesh?.visible) n++;
    if (this.populated && this.meshes) {
      if (this.fade.hero.visible || this.fade.near.visible) n++;
      if (this.meshes.hero.visible) n++;
      if (this.meshes.near.visible) n++;
      if (this.meshes.mid.visible) n++;
      if (this.meshes.far.visible) n++;
      if (this.flagMesh.visible) n++;
      if (this.lightsMesh.visible) n++;
    }
    return n;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.texPos?.dispose();
    this.texAttr?.dispose();
    this.texLook?.dispose();
    this.atlas?.dispose();
    this.flagTex?.dispose();
  }
}

/** compress a light colour so its brightest channel approaches `max` smoothly (keeps the hue) */
function softClamp(c: THREE.Color, max: number): void {
  const m = Math.max(c.r, c.g, c.b);
  if (m <= max * 0.5) return;
  const k = max * 0.5 + (max * 0.5) * Math.tanh((m - max * 0.5) / (max * 0.5));
  c.multiplyScalar(k / m);
}

