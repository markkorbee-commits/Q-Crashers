import * as THREE from 'three';
import type { App } from '../core/App';
import type { AnchorName } from '../core/Anchors';
import type { BeatInfo, FrameContext, QualitySettings, System } from '../core/types';
import { resolveColor } from '../show/colors';
import {
  AREA_FIELD,
  AREA_SIDES_L,
  AREA_SIDES_R,
  AREA_STAGE,
  BLINDER_TAIL,
  FM_CHASE,
  FM_FLICKER,
  FM_OFF,
  FM_PULSE,
  FM_TWINKLE,
  FS_KINDS,
  LightCueIndex,
  PM_CHASE,
  PM_FLICKER,
  PM_OFF,
  PM_PULSE,
  PRESETS,
  STROBE_TAIL,
  TAN_NARROW,
  type LightCue,
  type StateBlend,
} from './cues';
import { buildFestoon, type Bulb } from './festoon';
import {
  BeamLayer,
  createNoise3D,
  FB_BACK,
  FB_BOOTH,
  FB_FIELD,
  FB_FIELD_FAR,
  FB_SIDE_L,
  FB_SIDE_R,
  FB_STAGE,
  FB_STAGE_HIGH,
  FixtureBodies,
  FLOOD_BLOBS,
  FloodGlow,
  PoolLayer,
  SPR_BLINDER,
  SPR_BULB,
  SPR_LENS,
  SPR_STROBE,
  SpriteLayer,
  WashGlow,
  type SharedUniforms,
} from './layers';
import { evalLook, lookIsDark, vnoise, type AimOut } from './looks';
import { buildRig, GROUP_NAMES, isDefaultAnchor, RIG_SOURCES, T_BACK, T_BOOTH, T_EXPLICIT, type Rig } from './rig';

/** HDR scale of a beam's haze column (the shader adds geometry/phase terms) */
const BEAM_GAIN = 2.8;
/** HDR scale of a lit lens seen off-axis / on-axis (flare) */
const LENS_GAIN = 26;
const POOL_GAIN = 16;
const BLINDER_GAIN = 38;
const STROBE_GAIN = 70;
/** beam range in the air (m) */
const RANGE = 320;
/** reference fixture count for density 1 */
const BASE_FIXTURES = 316;

const DEFAULT_LAMP = new THREE.Color('#4a86d8');
const DEFAULT_SHAFT = new THREE.Color('#c56e46');
const TUNGSTEN = new THREE.Color(1, 0.26, 0.035);
/** festoon bulb HDR gain (a warm dot that reads from the far field, not a flare) */
const BULB_GAIN = 11;
/** flood haze glow gain per unit density-metre (stage / sides / field volumes) */
const FLOOD_K_STAGE = 0.03;
const FLOOD_K_SIDES = 0.05;
const FLOOD_K_FIELD = 0.02;
/** backlight / booth haze glow */
const LOCAL_GLOW_K = 0.06;
/** field flood: HDR of the lit-ground pool per unit flood level */
const FLOOD_GROUND = 0.55;
/** flood slices per quality level (depth-sliced haze integral) */
const FLOOD_SLICES: Record<string, number> = { ultra: 10, high: 9, medium: 7, mobile: 4 };
/** dense-haze scatter ("storm haze"): env.haze range over which the lit haze turns into a glowing cloud */
const SCATTER_H0 = 0.76;
const SCATTER_H1 = 0.92;
/** static downlights (arch crown): PAR-can beam half angle and the lit lens face seen off-axis */
const TAN_CAN = Math.tan((6 * Math.PI) / 180);
const CAN_GAIN = 5;

/**
 * LightingSystem ('lights'): the RED show rig.
 *  - moving-head beams (instanced bodies + volumetric haze cones + lens flares + ground pools)
 *    on the wing spars, lower wing arms, castle roofline / towers, dragon skull, PA towers,
 *    side sections, deck front, lantern pillars, pillar plinths and FOH
 *  - strobes and audience blinders (sprites + env flash)
 *  - stage wash (env.stageWash*) and lantern pillar lamps (env.pillar*)
 *  - haze glow of the set's floods (analytic gaussian haze volume in the wash colour)
 *  - light floods / dense lit haze (depth-sliced analytic haze volume: 'flood' fx, zone washes,
 *    backlight / booth glow, the storm scatter of the whole rig in haze ≥ 0.76)
 *  - festoon bulb garlands on the wings / castle / side sections and the tower torches ('festoon' fx)
 *  - DJ portal arch-crown downlights, the booth spot and the backlight row (explicit targets)
 * Every value is a pure function of show time + the compiled cue list (seek / pause safe).
 * Draw calls: beams 1, lens flares + strobes + blinders + bulbs 1, ground pools 1, haze glow 1,
 * flood glow 1 (only while lit), bodies 3.
 *
 * Cue parameters beyond docs/show-format.md (all optional):
 *  look:    target (common convention: anchor / position names + left/right/center) narrows a look to
 *           those fixtures — the latest matching look wins per fixture, so e.g. a 'sides' fan can run on
 *           top of a rig-wide sky look; tilt (deg, base elevation / fan lean), pan (deg, 'still'),
 *           spread (deg, fan / circle size); density (0..1 share of the heads, default from the
 *           intensity: ≤ 0.35 → 1/5 of the heads … ≥ 0.85 → all, see cues.defaultDensity). The look
 *           intensity goes through a dimmer curve (LOOK_GAMMA 1.5). 'still' without tilt stands the
 *           structure heads in a raised fan (22°) instead of aiming them into the eye line.
 *  position names: wings, deck, roof, castle, towers_top, dragon, speaker_hangs, sides, side_sections,
 *           corners, arms, towers / delay_towers / pillars (obelisk capitals), foh, truss, floor, field
 *  pillars: shaft | color2 (shaft uplight colour, default amber #c56e46), shaftIntensity (0..1, 0.8);
 *           subset: target left/right, rows (0 = nearest the stage), index (pillars_top order)
 *  hit / chase / blinder / strobe: target (anchor names, group names, left/right/center), groups
 *  flood / festoon / wash zones / curtain / aim: see docs/show-format-ext/lights.md
 */
export class LightingSystem implements System {
  readonly name = 'lights';
  private app!: App;
  private enabled = true;
  private q!: QualitySettings;
  private readonly root = new THREE.Group();
  private readonly shared: SharedUniforms = { tNoise: { value: null }, uTime: { value: 0 }, uPixelAngle: { value: 0.002 } };
  private beams!: BeamLayer;
  private pools!: PoolLayer;
  private sprites!: SpriteLayer;
  private bodies!: FixtureBodies;
  private glow!: WashGlow;
  private flood!: FloodGlow;
  private bulbs: Bulb[] = [];
  private readonly floorGlow = new THREE.Color();
  private rig: Rig | null = null;
  private readonly idx = new LightCueIndex();
  /** anchors registered by this system (treated as "not registered by the geometry owner") */
  private readonly own = new Map<AnchorName, THREE.Vector3[]>();
  private density = 1;

  // per-fixture state of the current frame
  private sDir = new Float32Array(0);
  private sCol = new Float32Array(0);
  private sDim = new Float32Array(0);
  private sTan = new Float32Array(0);
  private sGobo = new Uint8Array(0);

  // scratch (no per-frame allocation)
  private readonly A: AimOut = { x: 0, y: 1, z: 0, dim: 0, mix: 0, tan: 0, gobo: 0 };
  private readonly B: AimOut = { x: 0, y: 1, z: 0, dim: 0, mix: 0, tan: 0, gobo: 0 };
  private blends: StateBlend[] = [];
  private readonly washBlend: StateBlend = { from: null, to: null, k: 1 };
  private readonly washSideBlend: StateBlend[] = [
    { from: null, to: null, k: 1 },
    { from: null, to: null, k: 1 },
  ];
  private pillarBlends: StateBlend[] = [];
  private readonly festoonBlends: StateBlend[] = Array.from({ length: FS_KINDS * 2 }, () => ({ from: null, to: null, k: 1 }));
  private readonly floods: LightCue[] = [];
  /** per-pillar lamp level / multiplier scratch */
  private pillarLamp = new Float32Array(0);
  // this frame's blinder / backlight / booth output (colour premultiplied by level)
  private readonly blindCol = new THREE.Color();
  private readonly backCol = new THREE.Color();
  private readonly boothCol = new THREE.Color();
  private backLevel = 0;
  private boothLevel = 0;
  /** accumulated flood output per area this frame (premultiplied colour) */
  private readonly floodStage = new THREE.Color();
  private readonly floodField = new THREE.Color();
  private readonly floodSideL = new THREE.Color();
  private readonly floodSideR = new THREE.Color();
  private readonly cF = new THREE.Color();
  private baseHaze = 0.6;
  private hazeCam: { hazeScale?: number } | null = null;
  private festoonLit = 0;
  private readonly hits: LightCue[] = [];
  private readonly chases: LightCue[] = [];
  private readonly blinders: LightCue[] = [];
  private readonly strobes: LightCue[] = [];
  private readonly cA = new THREE.Color();
  private readonly cB = new THREE.Color();
  private readonly cT = new THREE.Color();
  private readonly acc = new THREE.Color();
  private readonly flashPos = new THREE.Vector3();
  private chaseArr: number[] = [];
  private readonly emptyArr: number[] = [];

  // stats
  private nBeams = 0;
  private nPools = 0;
  private nSprites = 0;
  private cpuMs = 0;
  private strobeLevel = 0;
  private blinderLevel = 0;
  private dev: { update(ctx: FrameContext): void } | null = null;

  async init(app: App): Promise<void> {
    this.app = app;
    this.q = app.quality;
    this.root.name = 'LightingSystem';
    this.shared.tNoise.value = createNoise3D(32);
    this.beams = new BeamLayer(this.shared);
    this.pools = new PoolLayer(this.shared);
    this.sprites = new SpriteLayer(this.shared);
    this.bodies = new FixtureBodies();
    this.glow = new WashGlow();
    this.flood = new FloodGlow();
    this.root.add(this.bodies.group, this.glow.group, this.flood.mesh, this.pools.mesh, this.beams.mesh, this.sprites.mesh);
    app.scene.add(this.root);
    // the show camera / photo mode thin the haze for long lenses (CameraRig.hazeScale); it updates after
    // us, so apply it right before drawing (no one-frame lag at cuts)
    const hazeScale = () => {
      if (!this.hazeCam) this.hazeCam = (app.get('camera') as { hazeScale?: number } | undefined) ?? {};
      const k = this.hazeCam.hazeScale;
      return typeof k === 'number' && Number.isFinite(k) ? Math.min(1, Math.max(0.2, k)) : 1;
    };
    this.beams.mesh.onBeforeRender = () => {
      this.beams.material.uniforms.uHaze.value = this.baseHaze * hazeScale();
    };
    const glowScale = () => {
      const k = hazeScale();
      this.glow.material.uniforms.uScale.value = k;
      this.flood.material.uniforms.uScale.value = k;
    };
    this.glow.mesh.onBeforeRender = glowScale;
    this.glow.inner.onBeforeRender = glowScale;
    this.flood.mesh.onBeforeRender = (_r, _s, camera) => {
      glowScale();
      this.flood.fit(camera);
    };

    // visual lifetimes: looks fade out, blinders glow down, strobe flashes decay
    app.show.registerLifetime('lights', (c) => {
      const fade = typeof c.p?.fade === 'number' ? c.p.fade : 0.5;
      if (c.fx === 'look' || c.fx === 'wash' || c.fx === 'pillars') return c.dur + Math.max(0, fade);
      if (c.fx === 'blinder') return c.dur + BLINDER_TAIL;
      return c.dur;
    });
    app.show.registerLifetime('strobe', (c) => c.dur + STROBE_TAIL);
    // systems initialised after us (grounds, terrain…) register the real pillar / FOH anchors: refit the
    // rig once loading is complete, not in the first rendered frame
    const off = app.events.on('loading:progress', (e) => {
      if (e.progress < 1) return;
      off();
      if (this.rig && this.anchorsChanged()) this.rebuildRig();
      if (this.rig && this.idx.revision !== app.show.revision) this.idx.sync(app.show, this.rig);
    });

    if (app.params.has('lightsdev') || app.params.has('lightstest')) {
      const dev = await import('./dev/DevProxy');
      if (app.params.has('lightstest')) dev.injectTestShow(app);
      if (app.params.has('lightsdev')) this.dev = new dev.DevProxy(app);
    }
    // the App calls setQuality() right after init(), which builds the rig
  }

  setQuality(q: QualitySettings): void {
    this.q = q;
    if (!this.app) return;
    const volumetric = q.volumetrics;
    for (const m of [this.beams.material, this.pools.material]) {
      const has = 'USE_NOISE' in m.defines;
      if (has === volumetric) continue;
      if (volumetric) m.defines.USE_NOISE = '';
      else delete m.defines.USE_NOISE;
      m.needsUpdate = true;
    }
    this.flood.build(FLOOD_SLICES[q.level] ?? 6, 4, Math.min(620, q.drawDistance * 0.45));
    this.rebuildRig();
  }

  private rebuildRig(): void {
    const anchors = this.app.anchors;
    // fit the rig to the beam budget
    let d = Math.min(1.5, Math.max(0.3, this.q.beamBudget / BASE_FIXTURES));
    let rig = buildRig(anchors, d, this.own);
    // the explicit-only arch downlights (7, every level) do not count against the moving-head budget
    const extra = (r: Rig) => r.fixtures.reduce((m, f) => m + (f.tags & T_EXPLICIT ? 1 : 0), 0);
    for (let i = 0; i < 8 && rig.fixtures.length - extra(rig) > this.q.beamBudget; i++) {
      d *= 0.88;
      rig = buildRig(anchors, d, this.own);
    }
    const nExplicit = extra(rig);
    this.density = d;
    this.rig = rig;
    const n = rig.fixtures.length;
    this.sDir = new Float32Array(n * 3);
    this.sCol = new Float32Array(n * 3);
    this.sDim = new Float32Array(n);
    this.sTan = new Float32Array(n);
    this.sGobo = new Uint8Array(n);
    this.chaseArr = new Array(rig.pillars.length).fill(1);
    this.pillarLamp = new Float32Array(rig.pillars.length);
    this.pillarBlends = rig.pillars.map(() => ({ from: null, to: null, k: 1 }));
    this.blends = rig.classes.map(() => ({ from: null, to: null, k: 1 }));
    this.bulbs = buildFestoon(anchors);
    // look tracks are per fixture class, hit / strobe masks per fixture / emitter: rebuild now (during
    // loading) instead of on the first rendered frame
    if (this.app.show.file) this.idx.sync(this.app.show, rig);
    else this.idx.revision = -1;
    const radial = this.q.level === 'mobile' ? 8 : this.q.level === 'medium' ? 10 : 12;
    this.beams.build(Math.min(n, this.q.beamBudget + nExplicit), radial);
    this.pools.build(n + 4);
    this.sprites.build(n + rig.emitters.length + this.bulbs.length + 16);
    const housings = rig.emitters.map((e) => {
      const m = new THREE.Matrix4();
      const z = e.fwd.clone().setY(0).normalize();
      const y = new THREE.Vector3(0, 1, 0);
      const x = new THREE.Vector3().crossVectors(y, z);
      m.makeBasis(x, y, z).scale(e.size).setPosition(e.pos.x - e.fwd.x * 0.12, e.pos.y, e.pos.z - e.fwd.z * 0.12);
      return m;
    });
    this.bodies.build(n, housings);
    for (const f of rig.fixtures) if (!f.body) this.bodies.hide(f.index);
    // publish the fixture positions if the stage engineer did not register real ones
    this.publishAnchor('fixtures_truss', rig.fixtures.filter((f) => f.group === 0).map((f) => f.pos));
    this.publishAnchor('fixtures_floor', rig.fixtures.filter((f) => f.group === 1).map((f) => f.pos));
  }

  private publishAnchor(name: AnchorName, pts: THREE.Vector3[]): void {
    const anchors = this.app.anchors;
    const cur = anchors.get(name);
    const mine = this.own.get(name);
    // only (re)publish while the anchor is the design-bible default or our own earlier publication
    if (!(isDefaultAnchor(anchors, name) || (mine && mine === cur))) return;
    anchors.set(name, pts);
    this.own.set(name, anchors.get(name));
  }

  /** anchors changed by another system since the rig was built? */
  private anchorsChanged(): boolean {
    const rig = this.rig;
    if (!rig) return true;
    const anchors = this.app.anchors;
    for (let i = 0; i < RIG_SOURCES.length; i++) {
      const name = RIG_SOURCES[i];
      const cur = anchors.get(name);
      if (cur !== rig.sources[i] && cur !== this.own.get(name)) return true;
    }
    return false;
  }

  update(ctx: FrameContext): void {
    if (!this.enabled) return;
    const t0 = performance.now();
    const app = this.app;
    const show = app.show;
    if (this.anchorsChanged()) this.rebuildRig();
    if (!this.terrain) this.terrain = (app.get('terrain') as { heightAt?(x: number, z: number): number } | undefined) ?? {};
    const rig = this.rig!;
    if (this.idx.revision !== show.revision) this.idx.sync(show, rig);
    const t = ctx.showTime;
    const beat = ctx.beat;
    const env = app.env;
    const pal = app.palette;

    // ---------------------------------------------------------------- shared uniforms
    const cam = ctx.camera;
    const hPx = Math.max(1, app.renderer.domElement.height);
    this.shared.uPixelAngle.value = (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5)) / hPx / Math.max(0.1, cam.zoom);
    this.shared.uTime.value = t;
    this.sprites.material.uniforms.uFlarePx.value = hPx * 0.085;
    this.sprites.material.uniforms.uMinPx.value = Math.max(2, hPx / 300);
    const haze = THREE.MathUtils.clamp(env.haze, 0, 1);
    this.baseHaze = 0.3 + 0.95 * haze;
    this.beams.material.uniforms.uHaze.value = this.baseHaze;
    // denser haze carries the beams further before they fade out
    this.beams.material.uniforms.uExtinct.value = 0.055 - 0.035 * haze;
    this.beams.material.uniforms.uGain.value = 1;
    this.beams.material.uniforms.uNoise.value = 0.85;
    // storm haze: beams bloom into soft shafts (energy spread over a wider cone)
    this.beams.material.uniforms.uSoft.value = 0.85 * smooth01((haze - 0.7) / 0.22);

    // ---------------------------------------------------------------- cue state
    for (let g = 0; g < this.blends.length; g++) {
      const b = this.idx.looks[g].resolve(t, this.blends[g]);
      this.resolveCueColors(b.from);
      this.resolveCueColors(b.to);
    }
    this.idx.hits.alive(t, this.hits);
    this.idx.chases.alive(t, this.chases);
    this.idx.blinders.alive(t, this.blinders);
    this.idx.strobes.alive(t, this.strobes);
    this.idx.floods.alive(t, this.floods);
    for (let i = 0; i < this.floods.length; i++) this.resolveCueColors(this.floods[i], 'primary');
    for (let i = 0; i < this.hits.length; i++) this.resolveCueColors(this.hits[i], 'accent');
    for (let i = 0; i < this.chases.length; i++) this.resolveCueColors(this.chases[i]);
    for (let i = 0; i < this.blinders.length; i++) this.resolveCueColors(this.blinders[i], 'warm');
    for (let i = 0; i < this.strobes.length; i++) this.resolveCueColors(this.strobes[i], 'white');

    // ---------------------------------------------------------------- fixtures
    const fx = rig.fixtures;
    const n = fx.length;
    const A = this.A;
    const B = this.B;
    const cA = this.cA;
    const cB = this.cB;
    const sDir = this.sDir;
    const sCol = this.sCol;
    const sDim = this.sDim;
    const sTan = this.sTan;
    const nHits = this.hits.length;
    const nChases = this.chases.length;
    for (let i = 0; i < n; i++) {
      const f = fx[i];
      const bl = this.blends[f.cls];
      // both looks dark (the whole blackout / quiet passages): park the head, skip the look maths
      const toDark = lookIsDark(bl.to);
      if (toDark && (bl.k >= 1 || lookIsDark(bl.from))) {
        let lit = false;
        for (let h = 0; h < nHits && !lit; h++) lit = this.hits[h].mask![i] === 1;
        for (let h = 0; h < nChases && !lit; h++) lit = this.chases[h].mask![i] === 1;
        if (!lit) {
          sDim[i] = 0;
          sTan[i] = TAN_NARROW;
          this.sGobo[i] = 0;
          sDir[i * 3] = f.rest.x;
          sDir[i * 3 + 1] = f.rest.y;
          sDir[i * 3 + 2] = f.rest.z;
          continue;
        }
      }
      evalLook(bl.to, f, t, beat, A);
      if (bl.to) cA.copy(bl.to.c1).lerp(bl.to.c2, A.mix);
      else cA.setRGB(1, 1, 1);
      let dim = A.dim;
      let dx = A.x;
      let dy = A.y;
      let dz = A.z;
      let tan = A.tan;
      let r = cA.r;
      let g = cA.g;
      let b = cA.b;
      const k = bl.k;
      if (k < 1) {
        evalLook(bl.from, f, t, beat, B);
        if (bl.from) cB.copy(bl.from.c1).lerp(bl.from.c2, B.mix);
        else cB.setRGB(1, 1, 1);
        const wa = (1 - k) * B.dim;
        const wb = k * A.dim;
        dim = wa + wb;
        // positions move while the light is dark (or cross-move when both are lit)
        const pa = (1 - k) * (B.dim + 0.02);
        const pb = k * (A.dim + 0.02);
        dx = B.x * pa + A.x * pb;
        dy = B.y * pa + A.y * pb;
        dz = B.z * pa + A.z * pb;
        const ln = Math.hypot(dx, dy, dz);
        if (ln > 1e-4) {
          dx /= ln;
          dy /= ln;
          dz /= ln;
        } else {
          dx = A.x;
          dy = A.y;
          dz = A.z;
        }
        const wsum = wa + wb > 1e-5 ? wa + wb : 1;
        r = (cB.r * wa + cA.r * wb) / wsum;
        g = (cB.g * wa + cA.g * wb) / wsum;
        b = (cB.b * wa + cA.b * wb) / wsum;
        if (wa + wb <= 1e-5) {
          r = cA.r;
          g = cA.g;
          b = cA.b;
        }
        tan = B.tan + (A.tan - B.tan) * k;
      }
      // hits: snap to full in the hit colour, decaying over dur
      for (let h = 0; h < nHits; h++) {
        const c = this.hits[h];
        if (c.mask![i] !== 1) continue;
        const u = (t - c.t0) / Math.max(0.05, c.dur);
        if (u < 0 || u >= 1) continue;
        const e = c.intensity * (1 - u) * (1 - u);
        const m = dim + e > 1e-4 ? e / Math.max(dim, e) : 1;
        r += (c.c1.r - r) * m;
        g += (c.c1.g - g) * m;
        b += (c.c1.b - b) * m;
        if (e > dim) dim = e;
      }
      // chases: a flash running across the rig on the beat grid
      for (let h = 0; h < nChases; h++) {
        const c = this.chases[h];
        if (t >= c.t0 + c.dur || c.mask![i] !== 1) continue;
        const e = chaseEnv(c, f.u, f.cluster, t) * c.intensity;
        dim = dim * 0.3 + e;
        if (c.color) {
          const m = e > 0 ? Math.min(1, e) : 0;
          r += (c.c1.r - r) * m;
          g += (c.c1.g - g) * m;
          b += (c.c1.b - b) * m;
        }
      }
      if (dim > 1.5) dim = 1.5;
      sDim[i] = dim;
      sTan[i] = tan;
      // gobo: the dominant state's wheel position
      this.sGobo[i] = k < 0.5 && bl.from ? B.gobo : A.gobo;
      sDir[i * 3] = dx;
      sDir[i * 3 + 1] = dy;
      sDir[i * 3 + 2] = dz;
      sCol[i * 3] = r;
      sCol[i * 3 + 1] = g;
      sCol[i * 3 + 2] = b;
    }

    // ---------------------------------------------------------------- GPU: beams, lenses, pools, bodies
    this.beams.begin();
    this.pools.begin();
    this.sprites.begin();
    let sumDim = 0;
    let aud = 0;
    let cr = 0,
      cg = 0,
      cb = 0;
    for (let i = 0; i < n; i++) {
      const f = fx[i];
      const dx = sDir[i * 3];
      const dy = sDir[i * 3 + 1];
      const dz = sDir[i * 3 + 2];
      const up = f.hang ? -1 : 1;
      if (f.body) this.bodies.setHead(i, f.pos.x, f.pos.y, f.pos.z, up, dx, dy, dz, f.fwd.x, f.fwd.z);
      const dim = sDim[i];
      if (dim < 0.004) continue;
      const r = sCol[i * 3] * dim;
      const g = sCol[i * 3 + 1] * dim;
      const b = sCol[i * 3 + 2] * dim;
      const tan = f.focus ? Math.max(sTan[i], TAN_CAN) : sTan[i];
      const lx = f.pos.x + dx * 0.26;
      const ly = f.pos.y + dy * 0.26;
      const lz = f.pos.z + dz * 0.26;
      const r0 = 0.085;
      let len = RANGE;
      let grounded = 0;
      let gy = 0;
      if (dy < -0.004) {
        // intersect the floor: flat field first, then refine on the terrain / stage deck
        let th = ly / -dy;
        if (th < RANGE) {
          for (let it = 0; it < 2; it++) {
            gy = this.groundAt(lx + dx * th, lz + dz * th);
            if (gy >= ly) break;
            th = (ly - gy) / -dy;
          }
          if (gy < ly && th < RANGE) {
            len = th;
            grounded = 1;
          }
        }
      }
      // discharge-lamp beams read slightly cool (~7500 K)
      const gobo = this.sGobo[i];
      this.beams.push(lx, ly, lz, r0, dx, dy, dz, len, r * BEAM_GAIN * 0.92, g * BEAM_GAIN * 0.97, b * BEAM_GAIN * 1.06, tan, f.seed, grounded ? gy + 1 : 0, gobo);
      this.sprites.push(SPR_LENS, lx, ly, lz, dx, dy, dz, Math.atan(tan), r * LENS_GAIN, g * LENS_GAIN, b * LENS_GAIN, 0.2);
      // a PAR can's big lens reads as a bright disc from well off its axis
      if (f.focus) this.sprites.push(SPR_BULB, lx, ly, lz, dx, dy, dz, 0, r * CAN_GAIN, g * CAN_GAIN, b * CAN_GAIN, 0.13);
      const lum = (r + g + b) * 0.333;
      sumDim += dim;
      cr += r;
      cg += g;
      cb += b;
      if (grounded) {
        const hx = lx + dx * len;
        const hz = lz + dz * len;
        const rad = r0 + len * tan;
        const sinE = Math.max(0.08, -dy);
        const a = rad / sinE;
        const hl = Math.hypot(dx, dz) || 1;
        const E = Math.min(9, (POOL_GAIN * sinE) / (Math.PI * rad * rad * 0.9 + 0.35));
        if (E * lum > 0.004) {
          // sharpness 1 (narrow) / 0.4 (wide); a gobo adds 2 (the pool shader draws the pattern)
          this.pools.push(hx, gy + 0.06, hz, a, dx / hl, dz / hl, rad, f.seed * 3.7, r * E, g * E, b * E, (tan < 0.04 ? 1 : 0.4) + (gobo ? 2 : 0));
          if (hz > 3 && hz < 240 && Math.abs(hx) < 125) aud += dim;
        }
      } else if (dy < -0.05 && dz > 0.2) aud += dim * 0.5;
    }
    this.bodies.commit();
    this.nBeams = this.beams.count;
    this.nPools = this.pools.count;

    // ---------------------------------------------------------------- strobes & blinders
    let strobeMax = 0;
    let strobeOn = 0;
    let blindMax = 0;
    const rf = this.reduceFlashing();
    this.blindCol.setRGB(0, 0, 0);
    this.backCol.setRGB(0, 0, 0);
    this.boothCol.setRGB(0, 0, 0);
    let backMax = 0;
    let boothMax = 0;
    const acc = this.acc.setRGB(0, 0, 0);
    this.flashPos.set(0, 0, 0);
    let flashW = 0;
    const em = rig.emitters;
    for (let j = 0; j < em.length; j++) {
      const e = em[j];
      let level = 0;
      const col = this.cT.setRGB(0, 0, 0);
      if (e.kind === 'strobe') {
        for (let h = 0; h < this.strobes.length; h++) {
          const c = this.strobes[h];
          if (c.mask![j] !== 1) continue;
          const v = strobeEnv(c, t, beat, rf) * c.intensity * (rf ? 0.4 : 1);
          if (v > level) {
            level = v;
            col.copy(c.c1);
          }
        }
        if (level > 0.003) {
          this.sprites.push(SPR_STROBE, e.pos.x, e.pos.y, e.pos.z, e.fwd.x, e.fwd.y, e.fwd.z, e.twoSided ? 1 : 0, col.r * level * STROBE_GAIN, col.g * level * STROBE_GAIN, col.b * level * STROBE_GAIN, 1.3);
          strobeMax = Math.max(strobeMax, level);
          strobeOn++;
          acc.r += col.r * level;
          acc.g += col.g * level;
          acc.b += col.b * level;
          this.flashPos.addScaledVector(e.pos, level);
          flashW += level;
        }
      } else {
        for (let h = 0; h < this.blinders.length; h++) {
          const c = this.blinders[h];
          if (c.mask![j] !== 1) continue;
          const u = t - c.t0;
          const v = (u <= c.dur ? Math.min(1, u / (rf ? 0.25 : 0.03)) : Math.exp(-(u - c.dur) / 0.32)) * c.intensity * (rf ? 0.5 : 1);
          if (v > level) {
            level = v;
            // tungsten filament: cools towards deep orange as it decays
            const cool = u <= c.dur ? 0 : Math.pow(1 - Math.min(1, v / Math.max(0.01, c.intensity)), 0.7) * 0.9;
            col.copy(c.c1).lerp(TUNGSTEN, cool);
          }
        }
        if (level > 0.003) {
          if (e.tags & T_BACK) {
            // round PAR-style backlight lamp in the haze
            const k = level * BLINDER_GAIN * 0.45;
            this.sprites.push(SPR_BULB, e.pos.x, e.pos.y, e.pos.z, e.fwd.x, e.fwd.y, e.fwd.z, 0, col.r * k, col.g * k, col.b * k, 0.5);
          } else if (e.tags & T_BOOTH) {
            // a single spot aimed at the audience: a lens flare seen from anywhere in front (wide half angle)
            const k = level * LENS_GAIN * 1.4;
            this.sprites.push(SPR_LENS, e.pos.x, e.pos.y, e.pos.z, e.fwd.x, e.fwd.y, e.fwd.z, 0.42, col.r * k, col.g * k, col.b * k, 0.35);
          } else this.sprites.push(SPR_BLINDER, e.pos.x, e.pos.y, e.pos.z, e.fwd.x, e.fwd.y, e.fwd.z, 0, col.r * level * BLINDER_GAIN, col.g * level * BLINDER_GAIN, col.b * level * BLINDER_GAIN, 1.2);
          if (e.tags & T_BACK) {
            // backlights face the audience from behind the performers: they light the haze around them and
            // the crowd, never the set (the castle behind them stays dark under master 0.1)
            backMax = Math.max(backMax, level);
            this.backCol.r += col.r * level;
            this.backCol.g += col.g * level;
            this.backCol.b += col.b * level;
            cr += col.r * level * 1.5;
            cg += col.g * level * 1.5;
            cb += col.b * level * 1.5;
          } else if (e.tags & T_BOOTH) {
            boothMax = Math.max(boothMax, level);
            this.boothCol.r += col.r * level;
            this.boothCol.g += col.g * level;
            this.boothCol.b += col.b * level;
            cr += col.r * level;
            cg += col.g * level;
            cb += col.b * level;
          } else {
            blindMax = Math.max(blindMax, level);
            this.blindCol.r += col.r * level;
            this.blindCol.g += col.g * level;
            this.blindCol.b += col.b * level;
            cr += col.r * level * 3;
            cg += col.g * level * 3;
            cb += col.b * level * 3;
          }
        }
      }
    }
    this.backLevel = backMax;
    this.boothLevel = boothMax;
    // ---------------------------------------------------------------- festoon bulbs + practicals
    this.writeFestoon(t, beat);
    // ---------------------------------------------------------------- floods (+ their light on the field)
    const flood = this.evalFloods(t, beat, rf);
    if (flood.field > 0) {
      // the flooded air lights the paved field: a broad soft pool, brightest in front of the stage
      const fc = this.floodField;
      const kf = FLOOD_GROUND * (rf ? 0.6 : 1);
      this.pools.push(0, 0.07, 30, 62, 1, 0, 40, 0.3, fc.r * kf, fc.g * kf, fc.b * kf, 0);
      this.pools.push(0, 0.07, 105, 52, 1, 0, 50, 1.7, fc.r * kf * 0.45, fc.g * kf * 0.45, fc.b * kf * 0.45, 0);
    }
    this.nSprites = this.sprites.count;
    this.beams.end();
    this.pools.end();
    this.sprites.end();
    this.strobeLevel = strobeMax;
    this.blinderLevel = blindMax;

    // ---------------------------------------------------------------- env outputs
    const nStrobes = Math.max(1, em.length);
    const strobe = strobeMax * Math.min(1, 0.45 + (strobeOn / nStrobes) * 1.6);
    env.strobe = Math.max(env.strobe, strobe);
    const flashK = rf ? 0.4 : 1;
    if (flashW > 0) {
      this.flashPos.multiplyScalar(1 / flashW);
      acc.multiplyScalar(1 / Math.max(1e-3, strobeMax * strobeOn));
      env.addFlash(acc, strobe * 2.2 * flashK, this.flashPos);
    }
    if (blindMax > 0) {
      // the blinders' own colour (a cyan blinder must not light the set beige)
      normalizeColor(this.blindCol, this.cF);
      this.flashPos.set(0, 3, 2);
      env.addFlash(this.cF, blindMax * 1.4 * flashK, this.flashPos);
    }
    // (backlights add no env flash: the stage set reads the flash colour, and the castle behind the
    // backlights must stay dark; they light the crowd through stageColor / audienceWash instead)
    cr += this.floodStage.r * 2 + this.floodField.r * 3 + (this.floodSideL.r + this.floodSideR.r);
    cg += this.floodStage.g * 2 + this.floodField.g * 3 + (this.floodSideL.g + this.floodSideR.g);
    cb += this.floodStage.b * 2 + this.floodField.b * 3 + (this.floodSideL.b + this.floodSideR.b);
    const nf = Math.max(1, n);
    env.stageIntensity = Math.min(3, env.stageIntensity + (2.6 * sumDim) / nf + blindMax * 1.2 + strobe * 0.8 + backMax * 0.5 + boothMax * 0.2 + flood.stage * 0.5 + flood.field * 0.7);
    env.audienceWash = Math.min(1, env.audienceWash + aud / (nf * 0.28) + blindMax * 0.9 + backMax * 0.45 + flood.field * 0.5);
    const cm = Math.max(cr, cg, cb);
    if (cm > 1e-4) env.stageColor.setRGB(cr / cm, cg / cm, cb / cm);
    else env.stageColor.copy(pal.primary).multiplyScalar(0.25);

    this.writeWash(t, env);
    this.writePillars(t, beat, env);

    // haze glow around the set: floods in the wash colour + the rig's own spill low in front
    const hz = 0.25 + 0.75 * haze;
    this.floorGlow.copy(env.stageColor);
    const floorI = Math.min(1.5, (1.4 * sumDim) / nf) + strobe * 0.6 + blindMax * 0.8;
    if (strobe > 0) this.floorGlow.lerp(this.cT.setRGB(1, 1, 1), Math.min(1, strobe));
    // (the wash level saturates: a 1.1 wash reads as a stronger set colour, not as a denser fog)
    const washGlow = env.stageWashIntensity / (1 + 0.45 * env.stageWashIntensity);
    this.glow.update(cam.position, env.stageWashColor, washGlow + strobe * 0.35, this.floorGlow, floorI, 0.02 * hz);
    this.writeFloodGlow(env, haze, sumDim / nf, strobe);
    this.flood.update();

    this.dev?.update(ctx);
    this.cpuMs = this.cpuMs * 0.9 + (performance.now() - t0) * 0.1;
  }

  /** floor height under (x, z): stage deck, else the terrain system's heightAt (flat 0 fallback) */
  private groundAt(x: number, z: number): number {
    if (z < 0 && z > -14 && x > -37 && x < 37) return 1.9;
    // the paved field is flat (terrain-layout.json: banks from |X| 46, rear bank behind Z −4, fall after 113)
    if (z > -4 && z < 113 && x > -46 && x < 46) return 0;
    const h = this.terrain?.heightAt;
    return h ? h.call(this.terrain, x, z) : 0;
  }
  private terrain: { heightAt?(x: number, z: number): number } | null = null;

  private resolveCueColors(c: LightCue | null, fallback: string = 'primary'): void {
    if (!c) return;
    const pal = this.app.palette;
    resolveColor(c.color ?? fallback, pal, c.c1, 'primary');
    if (c.color2) resolveColor(c.color2, pal, c.c2, 'secondary');
    else c.c2.copy(c.c1);
  }

  // ------------------------------------------------------------------------------------ stage wash
  private writeWash(t: number, env: App['env']): void {
    const bl = this.idx.wash.resolve(t, this.washBlend);
    const pal = this.app.palette;
    // premultiplied blend of the two wash states (none = palette primary at 0.35)
    const W = this.acc.setRGB(0, 0, 0);
    this.washI = 0;
    this.addWash(bl.to, bl.k);
    if (bl.k < 1) this.addWash(bl.from, 1 - bl.k);
    let I = this.washI;
    // hits and blinders splash onto the set
    for (let i = 0; i < this.hits.length; i++) {
      const c = this.hits[i];
      const u = (t - c.t0) / Math.max(0.05, c.dur);
      if (u < 0 || u >= 1) continue;
      const e = c.intensity * (1 - u) * (1 - u) * 0.7;
      W.r += c.c1.r * e;
      W.g += c.c1.g * e;
      W.b += c.c1.b * e;
      I += e;
    }
    if (this.blinderLevel > 0) {
      // the audience blinders' own colour splashes onto the set (cyan -> cyan, gold -> gold)
      const e = this.blinderLevel * 0.5;
      normalizeColor(this.blindCol, this.cF);
      W.r += this.cF.r * e;
      W.g += this.cF.g * e;
      W.b += this.cF.b * e;
      I += e;
    }
    if (this.boothLevel > 0) {
      // the booth spot lights the deck and the portal around the DJ a little
      const e = this.boothLevel * 0.12;
      normalizeColor(this.boothCol, this.cF);
      W.r += this.cF.r * e;
      W.g += this.cF.g * e;
      W.b += this.cF.b * e;
      I += e;
    }
    // floods: the set takes the flood colour (stage area fully, side zones a little)
    const fs = this.floodStage;
    const fsd = 0.25;
    const fsk = 0.35;
    W.r += fs.r * fsk + (this.floodSideL.r + this.floodSideR.r) * fsd;
    W.g += fs.g * fsk + (this.floodSideL.g + this.floodSideR.g) * fsd;
    W.b += fs.b * fsk + (this.floodSideL.b + this.floodSideR.b) * fsd;
    I += lum(fs) * fsk + (lum(this.floodSideL) + lum(this.floodSideR)) * fsd;
    if (I > 1e-4) env.stageWashColor.setRGB(W.r / I, W.g / I, W.b / I);
    else env.stageWashColor.copy(pal.primary);
    env.stageWashIntensity = Math.min(2, I);
  }

  private washI = 0;
  private addWash(c: LightCue | null, w: number): void {
    if (w <= 0) return;
    const W = this.acc;
    const pal = this.app.palette;
    if (c) {
      resolveColor(c.color ?? 'primary', pal, c.c1, 'primary');
      W.r += c.c1.r * c.intensity * w;
      W.g += c.c1.g * c.intensity * w;
      W.b += c.c1.b * c.intensity * w;
      this.washI += c.intensity * w;
    } else {
      W.r += pal.primary.r * 0.35 * w;
      W.g += pal.primary.g * 0.35 * w;
      W.b += pal.primary.b * 0.35 * w;
      this.washI += 0.35 * w;
    }
  }

  // ------------------------------------------------------------------------------------ pillar lamps
  /**
   * Lantern pillar lamps. Every pillar resolves its own state track (a pillars cue may target a subset:
   * left/right, rows, index), so the crystals can light one by one. The world gets one lamp / shaft colour
   * (intensity-weighted over the pillars) and per-pillar multipliers in env.pillarChase.
   */
  private writePillars(t: number, beat: BeatInfo, env: App['env']): void {
    const rig = this.rig!;
    const np = rig.pillars.length;
    const lamp = this.cA.setRGB(0, 0, 0);
    const shaft = this.cB.setRGB(0, 0, 0);
    const arr = this.chaseArr;
    const lampOf = this.pillarLamp;
    let modulated = false;
    let lampMax = 0;
    let lampSum = 0;
    let shaftMax = 0;
    let shaftSum = 0;
    let first = Number.NaN;
    let uniform = true;
    const pal = this.app.palette;
    const tracks = this.idx.pillars;
    for (let i = 0; i < np; i++) {
      const bl = this.pillarBlends[i];
      if (tracks[i]) tracks[i].resolve(t, bl);
      else {
        bl.from = null;
        bl.to = null;
        bl.k = 1;
      }
      const k = bl.k;
      let li = 0;
      let si = 0;
      let num = 0;
      // two passes: target state (weight k) and previous state (weight 1-k)
      for (let pass = 0; pass < 2; pass++) {
        const c = pass === 0 ? bl.to : bl.from;
        const w = pass === 0 ? k : 1 - k;
        if (w <= 0) continue;
        let l = 1;
        let sh = 0.8;
        let mode = 0;
        if (c) {
          resolveColor(c.color ?? '#4a86d8', pal, c.c1, 'primary');
          if (c.shaft) resolveColor(c.shaft, pal, c.c3, 'secondary');
          else c.c3.copy(DEFAULT_SHAFT);
          mode = c.mode;
          l = mode === PM_OFF ? 0 : c.intensity;
          sh = mode === PM_OFF ? 0 : c.shaftIntensity;
          lamp.r += c.c1.r * l * w;
          lamp.g += c.c1.g * l * w;
          lamp.b += c.c1.b * l * w;
          shaft.r += c.c3.r * sh * w;
          shaft.g += c.c3.g * sh * w;
          shaft.b += c.c3.b * sh * w;
        } else {
          lamp.r += DEFAULT_LAMP.r * w;
          lamp.g += DEFAULT_LAMP.g * w;
          lamp.b += DEFAULT_LAMP.b * w;
          shaft.r += DEFAULT_SHAFT.r * 0.8 * w;
          shaft.g += DEFAULT_SHAFT.g * 0.8 * w;
          shaft.b += DEFAULT_SHAFT.b * 0.8 * w;
        }
        li += l * w;
        si += sh * w;
        if (mode === PM_FLICKER || mode === PM_CHASE || mode === PM_PULSE) modulated = true;
        num += (c ? pillarMult(c, mode, i, rig.pillars[i].row, rig.rows, t, beat) : 1) * w * (l > 0 ? l : 1);
      }
      // mode multiplier of this pillar (intensity-weighted over the two states)
      arr[i] = li > 1e-4 ? num / li : 0;
      lampOf[i] = li;
      lampSum += li;
      shaftSum += si;
      if (li > lampMax) lampMax = li;
      if (si > shaftMax) shaftMax = si;
      // every pillar in the same state (the usual case) -> exactly the old global behaviour
      const sig = (bl.to ? bl.to.cue.id : -1) * 7 + (bl.from ? bl.from.cue.id + 1 : 0) * 131 + bl.k;
      if (i === 0) first = sig;
      else if (sig !== first) uniform = false;
    }
    if (lampSum > 1e-4) env.pillarLampColor.setRGB(lamp.r / lampSum, lamp.g / lampSum, lamp.b / lampSum);
    if (shaftSum > 1e-4) env.pillarShaftColor.setRGB(shaft.r / shaftSum, shaft.g / shaftSum, shaft.b / shaftSum);
    env.pillarLampIntensity = lampMax;
    env.pillarShaftIntensity = shaftMax;
    if (!uniform && lampMax > 1e-4) {
      // pillars in different states: their lamp level relative to the brightest scales lamp + shaft
      for (let i = 0; i < np; i++) arr[i] *= lampOf[i] / lampMax;
      modulated = true;
    }
    env.pillarChase = modulated ? arr : this.emptyArr;
  }

  // ------------------------------------------------------------------------------------ floods
  private readonly floodOut = { stage: 0, field: 0, sides: 0 };
  /**
   * Alive 'flood' cues -> premultiplied colour per area (floodStage / floodField / floodSideL / R), zone
   * washes on the side sections included, plus the ground-light flashes. Returns the summed levels.
   */
  private evalFloods(t: number, beat: BeatInfo, rf: boolean): { stage: number; field: number; sides: number } {
    const env = this.app.env;
    const o = this.floodOut;
    o.stage = 0;
    o.field = 0;
    o.sides = 0;
    this.floodStage.setRGB(0, 0, 0);
    this.floodField.setRGB(0, 0, 0);
    this.floodSideL.setRGB(0, 0, 0);
    this.floodSideR.setRGB(0, 0, 0);
    for (let i = 0; i < this.floods.length; i++) {
      const c = this.floods[i];
      let e = floodEnv(c, t, rf);
      if (c.kick) e *= 0.5 + 0.5 * beat.kick;
      if (rf) e *= 0.6;
      if (e <= 1e-4) continue;
      const col = c.c1;
      if (c.area & AREA_STAGE) {
        this.floodStage.r += col.r * e;
        this.floodStage.g += col.g * e;
        this.floodStage.b += col.b * e;
        o.stage += e;
      }
      if (c.area & AREA_FIELD) {
        this.floodField.r += col.r * e;
        this.floodField.g += col.g * e;
        this.floodField.b += col.b * e;
        o.field += e;
      }
      if (c.area & AREA_SIDES_L) {
        this.floodSideL.r += col.r * e;
        this.floodSideL.g += col.g * e;
        this.floodSideL.b += col.b * e;
        o.sides += e * 0.5;
      }
      if (c.area & AREA_SIDES_R) {
        this.floodSideR.r += col.r * e;
        this.floodSideR.g += col.g * e;
        this.floodSideR.b += col.b * e;
        o.sides += e * 0.5;
      }
    }
    // zone washes on the side sections (a wash with target sides / side_front …): a local glow there
    const pal = this.app.palette;
    for (let s = 0; s < 2; s++) {
      const bl = this.idx.washSides[s].resolve(t, this.washSideBlend[s]);
      const dst = s === 0 ? this.floodSideL : this.floodSideR;
      for (let pass = 0; pass < 2; pass++) {
        const c = pass === 0 ? bl.to : bl.from;
        const w = pass === 0 ? bl.k : 1 - bl.k;
        if (!c || w <= 0) continue;
        resolveColor(c.color ?? 'primary', pal, c.c1, 'primary');
        const e = c.intensity * w * 0.8;
        dst.r += c.c1.r * e;
        dst.g += c.c1.g * e;
        dst.b += c.c1.b * e;
        o.sides += e * 0.5;
      }
    }
    // the flooded air lights the ground: field floods from above the aisle, stage floods from the set
    const fk = rf ? 0.4 : 1;
    if (o.field > 0) {
      normalizeColor(this.floodField, this.cF);
      this.flashPos.set(0, 12, 28);
      env.addFlash(this.cF, Math.min(5, o.field * 2.6) * fk, this.flashPos);
    }
    if (o.stage > 0) {
      normalizeColor(this.floodStage, this.cF);
      this.flashPos.set(0, 12, -4);
      env.addFlash(this.cF, Math.min(3, o.stage * 1.2) * fk, this.flashPos);
    }
    for (let s = 0; s < 2; s++) {
      const src = s === 0 ? this.floodSideL : this.floodSideR;
      const l = lum(src);
      if (l <= 1e-4) continue;
      normalizeColor(src, this.cF);
      this.flashPos.set(s === 0 ? -64 : 64, 6, 6);
      env.addFlash(this.cF, Math.min(2.5, l * 1.2) * fk, this.flashPos);
    }
    return o;
  }

  /** flood / zone / backlight / booth / storm-scatter haze glow (depth-sliced volume) */
  private writeFloodGlow(env: App['env'], haze: number, rigOut: number, strobe: number): void {
    const cols = this.flood.cols;
    for (let i = 0; i < FLOOD_BLOBS; i++) cols[i].set(0, 0, 0);
    // flooded air glows in proportion to how much haze / smoke it holds
    const hk = 0.35 + 0.9 * haze;
    const add = this.addGlow;
    add(FB_STAGE, this.floodStage, FLOOD_K_STAGE * hk);
    add(FB_STAGE_HIGH, this.floodStage, FLOOD_K_STAGE * hk);
    add(FB_FIELD, this.floodField, FLOOD_K_FIELD * hk);
    add(FB_FIELD_FAR, this.floodField, FLOOD_K_FIELD * hk);
    // a field flood also lifts the air over the stage a little (one continuous cloud)
    add(FB_STAGE, this.floodField, FLOOD_K_STAGE * hk * 0.35);
    add(FB_SIDE_L, this.floodSideL, FLOOD_K_SIDES * hk);
    add(FB_SIDE_R, this.floodSideR, FLOOD_K_SIDES * hk);
    // backlights and the booth spot glow in the haze around them (hue x the brightest lamp's level)
    if (this.backLevel > 0) add(FB_BACK, normalizeColor(this.backCol, this.cF), LOCAL_GLOW_K * hk * this.backLevel);
    if (this.boothLevel > 0) add(FB_BOOTH, normalizeColor(this.boothCol, this.cF), LOCAL_GLOW_K * hk * this.boothLevel * 0.8);
    // storm haze: in very dense haze / smoke the whole rig + wash light scatters into a lit cloud
    const sc = smooth01((haze - SCATTER_H0) / (SCATTER_H1 - SCATTER_H0));
    this.scatter = sc;
    if (sc > 0) {
      const washI = Math.min(1.5, env.stageWashIntensity);
      const rig = Math.min(1, rigOut * 2.2) + strobe * 0.6;
      const kw = FLOOD_K_STAGE * sc * 0.42 * washI;
      add(FB_STAGE, env.stageWashColor, kw);
      add(FB_STAGE_HIGH, env.stageWashColor, kw * 0.8);
      const kr = FLOOD_K_STAGE * sc * 0.5 * rig;
      add(FB_STAGE, env.stageColor, kr);
      add(FB_STAGE_HIGH, env.stageColor, kr * 0.9);
      add(FB_FIELD, env.stageColor, FLOOD_K_FIELD * sc * 0.5 * (rig + washI * 0.4));
      add(FB_FIELD, env.stageWashColor, FLOOD_K_FIELD * sc * 0.35 * washI);
    }
  }
  private scatter = 0;
  /** add colour x k to a flood glow slot (bound once: no per-frame closure) */
  private readonly addGlow = (slot: number, c: THREE.Color, k: number): void => {
    if (k <= 0) return;
    const o = this.flood.cols[slot];
    o.x += c.r * k;
    o.y += c.g * k;
    o.z += c.b * k;
  };

  // ------------------------------------------------------------------------------------ festoon
  /** festoon bulbs: per string state (latest cue wins, cross-faded), mode, colour -> bulb sprites */
  private writeFestoon(t: number, beat: BeatInfo): void {
    const bulbs = this.bulbs;
    // in thick haze every bulb carries a bigger glow around it
    const halo = 0.8 + 0.7 * Math.min(1, Math.max(0, this.app.env.haze));
    const tracks = this.idx.festoon;
    const blends = this.festoonBlends;
    const pal = this.app.palette;
    let lit = 0;
    // resolve every string once
    for (let s = 0; s < blends.length; s++) {
      const bl = tracks[s].resolve(t, blends[s]);
      if (bl.to) resolveColor(bl.to.color ?? 'warm', pal, bl.to.c1, 'primary');
      if (bl.from) resolveColor(bl.from.color ?? 'warm', pal, bl.from.c1, 'primary');
    }
    for (let i = 0; i < bulbs.length; i++) {
      const b = bulbs[i];
      const bl = blends[b.str];
      if (!bl.to && !bl.from) continue;
      let r = 0;
      let g = 0;
      let bb = 0;
      for (let pass = 0; pass < 2; pass++) {
        const c = pass === 0 ? bl.to : bl.from;
        const w = pass === 0 ? bl.k : 1 - bl.k;
        if (!c || w <= 0 || c.mode === FM_OFF) continue;
        const e = c.intensity * w * festoonMult(c, b, t, beat);
        r += c.c1.r * e;
        g += c.c1.g * e;
        bb += c.c1.b * e;
      }
      if (r + g + bb < 0.004) continue;
      lit += r + g + bb;
      const k = BULB_GAIN * (b.size > 0.4 ? 2.4 : 1);
      this.sprites.push(SPR_BULB, b.pos.x, b.pos.y, b.pos.z, 0, 0, 1, 0, r * k, g * k, bb * k, b.size * halo);
    }
    this.festoonLit = lit;
  }

  private reduceFlashing(): boolean {
    return (this.app as unknown as { reduceFlashing?: boolean }).reduceFlashing === true;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.root.visible = on;
  }

  stats(): Record<string, number | string> {
    const rig = this.rig;
    // current look of each group (its first fixture class)
    const looks = GROUP_NAMES.map((name, g) => {
      const ci = rig ? rig.classes.findIndex((c) => c.group === g) : -1;
      const b = ci >= 0 ? this.blends[ci] : undefined;
      return `${name}:${b?.to ? PRESETS[b.to.preset] : 'dark'}`;
    }).join(' ');
    return {
      fixtures: rig?.fixtures.length ?? 0,
      emitters: rig?.emitters.length ?? 0,
      pillars: rig?.pillars.length ?? 0,
      density: Number(this.density.toFixed(2)),
      beams: this.nBeams,
      beamBudget: this.q?.beamBudget ?? 0,
      pools: this.nPools,
      sprites: this.nSprites,
      drawCalls: 7 + (this.flood?.mesh.visible ? 1 : 0),
      cues: this.idx.count,
      classes: rig?.classes.length ?? 0,
      looks,
      strobe: Number(this.strobeLevel.toFixed(2)),
      blinder: Number(this.blinderLevel.toFixed(2)),
      bulbs: this.bulbs.length,
      festoonLit: Number(this.festoonLit.toFixed(2)),
      floods: this.floods.length,
      floodSlices: this.flood?.mesh.visible ? this.flood.slices : 0,
      scatter: Number(this.scatter.toFixed(2)),
      cpuMs: Number(this.cpuMs.toFixed(3)),
    };
  }

  dispose(): void {
    this.beams.dispose();
    this.pools.dispose();
    this.sprites.dispose();
    this.bodies.dispose();
    this.glow.dispose();
    this.shared.tNoise.value?.dispose();
    this.root.removeFromParent();
  }
}

// ------------------------------------------------------------------------------------ envelopes

/** chase flash for a fixture at rig position u (-1..1) */
function chaseEnv(c: LightCue, u: number, cluster: number, t: number): number {
  const stepLen = (60 / c.bpm) * c.every;
  const tt = t - c.t0;
  if (tt < 0) return 0;
  const step = Math.floor(tt / stepLen);
  const ph = tt / stepLen - step;
  const env = Math.exp(-ph * 3.4);
  let lit = false;
  switch (c.pattern) {
    case 'rl': {
      const N = 8;
      const pos = 1 - (2 * ((step % N) + 0.5)) / N;
      lit = Math.abs(u - pos) < 1 / N;
      break;
    }
    case 'center_out': {
      const N = 5;
      const pos = ((step % N) + 0.5) / N;
      lit = Math.abs(Math.abs(u) * 1.6 - pos) < 0.5 / N;
      break;
    }
    case 'out_center': {
      const N = 5;
      const pos = 1 - ((step % N) + 0.5) / N;
      lit = Math.abs(Math.abs(u) * 1.6 - pos) < 0.5 / N;
      break;
    }
    case 'random':
      lit = vnoise(step * 1.0, cluster * 131 + 7) > 0.35;
      break;
    default: {
      const N = 8;
      const pos = -1 + (2 * ((step % N) + 0.5)) / N;
      lit = Math.abs(u - pos) < 1 / N;
    }
  }
  return lit ? env : 0;
}

/** strobe flash envelope 0..1 */
function strobeEnv(c: LightCue, t: number, beat: BeatInfo, rf = false): number {
  const tt = t - c.t0;
  if (tt < 0) return 0;
  switch (c.cue.fx) {
    case 'burst': {
      // photosensitivity option: at most 3 flashes per second
      const period = 1 / (rf ? Math.min(3, c.rate) : c.rate);
      const last = Math.floor(Math.min(tt, Math.max(0, c.dur - 1e-3)) / period) * period;
      const local = tt - last;
      return local < 0 ? 0 : Math.exp(-local / 0.022);
    }
    case 'kick': {
      const since = (beat.phase * 60) / Math.max(40, beat.bpm);
      const start = t - since;
      if (start < c.t0 - 0.03 || start > c.t0 + c.dur) return 0;
      // photosensitivity option: every second kick only (<= 3 Hz at hardstyle tempo), softer decay
      if (rf && Math.floor(beat.beat) & 1) return 0;
      return Math.exp(-since / (rf ? 0.09 : 0.035));
    }
    default:
      return Math.exp(-tt / 0.04);
  }
}

/** per-pillar lamp multiplier for a pillar mode */
function pillarMult(c: LightCue, mode: number, i: number, row: number, rows: number, t: number, beat: BeatInfo): number {
  switch (mode) {
    case PM_FLICKER: {
      const v = 0.74 + 0.2 * vnoise(t * 6.5 + i * 3.1, i + 77) + 0.1 * vnoise(t * 17 + i * 1.7, i + 191);
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }
    case PM_CHASE: {
      const beats = ((t - c.t0) * c.bpm) / 60;
      const R = Math.max(1, rows);
      const head = (beats % R) + 0.0;
      let d = head - row;
      if (d < -0.35) d += R;
      return 0.1 + 0.9 * Math.exp(-Math.max(0, d) * 2.4) * Math.min(1, (d + 0.35) / 0.35);
    }
    case PM_PULSE: {
      const since = (beat.phase * 60) / Math.max(40, beat.bpm);
      return 0.25 + 0.75 * Math.exp(-since * 6);
    }
    case PM_OFF:
      return 0;
    default:
      return 1;
  }
}

/** flood envelope: rises over `attack`, holds for dur, releases over `fade` (smooth) */
function floodEnv(c: LightCue, t: number, rf: boolean): number {
  const u = t - c.t0;
  if (u < 0) return 0;
  const att = rf ? Math.max(0.3, c.attack) : c.attack;
  const a = u < att ? smooth01(u / att) : 1;
  let r = 1;
  if (u > c.dur) r = c.fade > 0 ? 1 - smooth01((u - c.dur) / c.fade) : 0;
  return c.intensity * a * (r > 0 ? r : 0);
}

/** festoon bulb multiplier for its string's mode */
function festoonMult(c: LightCue, b: Bulb, t: number, beat: BeatInfo): number {
  switch (c.mode) {
    case FM_FLICKER: {
      // candle / old filament: each bulb breathes on its own, with rare dips
      const v = 0.78 + 0.16 * vnoise(t * 7.3 + b.seed * 91, (b.seed * 997) | 0) + 0.12 * vnoise(t * 19 + b.seed * 37, ((b.seed * 613) | 0) + 5);
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }
    case FM_CHASE: {
      // a bright wave running outwards along every string, once per bar
      const P = ((t - c.t0) * c.bpm) / 240;
      const d = (((P - b.u) % 1) + 1) % 1;
      return 0.18 + 0.82 * Math.exp(-d * 9);
    }
    case FM_TWINKLE: {
      const v = vnoise(t * 3.1 + b.seed * 53, (b.seed * 4001) | 0);
      const p = v > 0 ? v : 0;
      return Math.min(1, 0.35 + 1.4 * p * p);
    }
    case FM_PULSE: {
      const since = (beat.phase * 60) / Math.max(40, beat.bpm);
      return 0.3 + 0.7 * Math.exp(-since * 6);
    }
    default:
      return 1;
  }
}

function smooth01(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

function lum(c: THREE.Color): number {
  return (c.r + c.g + c.b) * 0.3333;
}

/** out = c / max(c) (the hue at full value), black stays black */
function normalizeColor(c: THREE.Color, out: THREE.Color): THREE.Color {
  const m = Math.max(c.r, c.g, c.b);
  if (m <= 1e-6) return out.setRGB(0, 0, 0);
  return out.setRGB(c.r / m, c.g / m, c.b / m);
}
