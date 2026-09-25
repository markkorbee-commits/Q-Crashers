import * as THREE from 'three';
import type { App } from '../core/App';
import type { AnchorName } from '../core/Anchors';
import type { BeatInfo, FrameContext, QualitySettings, System } from '../core/types';
import { resolveColor } from '../show/colors';
import {
  BLINDER_TAIL,
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
import { BeamLayer, createNoise3D, FixtureBodies, PoolLayer, SPR_BLINDER, SPR_LENS, SPR_STROBE, SpriteLayer, WashGlow, type SharedUniforms } from './layers';
import { evalLook, lookIsDark, vnoise, type AimOut } from './looks';
import { buildRig, GROUP_NAMES, isDefaultAnchor, RIG_SOURCES, type Rig } from './rig';

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
const BLINDER_FLASH = new THREE.Color('#ffd29a');

/**
 * LightingSystem ('lights'): the RED show rig.
 *  - moving-head beams (instanced bodies + volumetric haze cones + lens flares + ground pools)
 *    on the wing spars, lower wing arms, castle roofline / towers, dragon skull, PA towers,
 *    side sections, deck front, lantern pillars, pillar plinths and FOH
 *  - strobes and audience blinders (sprites + env flash)
 *  - stage wash (env.stageWash*) and lantern pillar lamps (env.pillar*)
 *  - haze glow of the set's floods (analytic gaussian haze volume in the wash colour)
 * Every value is a pure function of show time + the compiled cue list (seek / pause safe).
 * Draw calls: beams 1, lens flares + strobes + blinders 1, ground pools 1, haze glow 1, bodies 3.
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
 *  pillars: shaft | color2 (shaft uplight colour, default amber #c56e46), shaftIntensity (0..1, 0.8)
 *  hit / chase / blinder / strobe: target (anchor names, group names, left/right/center), groups
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

  // scratch (no per-frame allocation)
  private readonly A: AimOut = { x: 0, y: 1, z: 0, dim: 0, mix: 0, tan: 0 };
  private readonly B: AimOut = { x: 0, y: 1, z: 0, dim: 0, mix: 0, tan: 0 };
  private blends: StateBlend[] = [];
  private readonly washBlend: StateBlend = { from: null, to: null, k: 1 };
  private readonly pillarBlend: StateBlend = { from: null, to: null, k: 1 };
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
    this.root.add(this.bodies.group, this.glow.mesh, this.pools.mesh, this.beams.mesh, this.sprites.mesh);
    app.scene.add(this.root);

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
      if (volumetric) m.defines.USE_NOISE = '';
      else delete m.defines.USE_NOISE;
      m.needsUpdate = true;
    }
    this.rebuildRig();
  }

  private rebuildRig(): void {
    const anchors = this.app.anchors;
    // fit the rig to the beam budget
    let d = Math.min(1.5, Math.max(0.3, this.q.beamBudget / BASE_FIXTURES));
    let rig = buildRig(anchors, d, this.own);
    for (let i = 0; i < 8 && rig.fixtures.length > this.q.beamBudget; i++) {
      d *= 0.88;
      rig = buildRig(anchors, d, this.own);
    }
    this.density = d;
    this.rig = rig;
    const n = rig.fixtures.length;
    this.sDir = new Float32Array(n * 3);
    this.sCol = new Float32Array(n * 3);
    this.sDim = new Float32Array(n);
    this.sTan = new Float32Array(n);
    this.chaseArr = new Array(rig.pillars.length).fill(1);
    this.blends = rig.classes.map(() => ({ from: null, to: null, k: 1 }));
    // look tracks are per fixture class, hit / strobe masks per fixture / emitter: rebuild now (during
    // loading) instead of on the first rendered frame
    if (this.app.show.file) this.idx.sync(this.app.show, rig);
    else this.idx.revision = -1;
    const radial = this.q.level === 'mobile' ? 8 : this.q.level === 'medium' ? 10 : 12;
    this.beams.build(Math.min(n, this.q.beamBudget), radial);
    this.pools.build(n);
    this.sprites.build(n + rig.emitters.length);
    const housings = rig.emitters.map((e) => {
      const m = new THREE.Matrix4();
      const z = e.fwd.clone().setY(0).normalize();
      const y = new THREE.Vector3(0, 1, 0);
      const x = new THREE.Vector3().crossVectors(y, z);
      m.makeBasis(x, y, z).scale(e.size).setPosition(e.pos.x - e.fwd.x * 0.12, e.pos.y, e.pos.z - e.fwd.z * 0.12);
      return m;
    });
    this.bodies.build(n, housings);
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
    this.beams.material.uniforms.uHaze.value = 0.3 + 0.95 * haze;
    // denser haze carries the beams further before they fade out
    this.beams.material.uniforms.uExtinct.value = 0.055 - 0.035 * haze;
    this.beams.material.uniforms.uGain.value = 1;
    this.beams.material.uniforms.uNoise.value = 0.85;

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
      this.bodies.setHead(i, f.pos.x, f.pos.y, f.pos.z, up, dx, dy, dz, f.fwd.x, f.fwd.z);
      const dim = sDim[i];
      if (dim < 0.004) continue;
      const r = sCol[i * 3] * dim;
      const g = sCol[i * 3 + 1] * dim;
      const b = sCol[i * 3 + 2] * dim;
      const tan = sTan[i];
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
      this.beams.push(lx, ly, lz, r0, dx, dy, dz, len, r * BEAM_GAIN * 0.92, g * BEAM_GAIN * 0.97, b * BEAM_GAIN * 1.06, tan, f.seed, grounded ? gy + 1 : 0);
      this.sprites.push(SPR_LENS, lx, ly, lz, dx, dy, dz, Math.atan(tan), r * LENS_GAIN, g * LENS_GAIN, b * LENS_GAIN, 0.2);
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
          this.pools.push(hx, gy + 0.06, hz, a, dx / hl, dz / hl, rad, f.seed * 3.7, r * E, g * E, b * E, tan < 0.04 ? 1 : 0.4);
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
          const v = strobeEnv(c, t, beat) * c.intensity;
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
          const v = (u <= c.dur ? Math.min(1, u / 0.03) : Math.exp(-(u - c.dur) / 0.32)) * c.intensity;
          if (v > level) {
            level = v;
            // tungsten filament: cools towards deep orange as it decays
            const cool = u <= c.dur ? 0 : Math.pow(1 - Math.min(1, v / Math.max(0.01, c.intensity)), 0.7) * 0.9;
            col.copy(c.c1).lerp(TUNGSTEN, cool);
          }
        }
        if (level > 0.003) {
          this.sprites.push(SPR_BLINDER, e.pos.x, e.pos.y, e.pos.z, e.fwd.x, e.fwd.y, e.fwd.z, 0, col.r * level * BLINDER_GAIN, col.g * level * BLINDER_GAIN, col.b * level * BLINDER_GAIN, 1.2);
          blindMax = Math.max(blindMax, level);
          cr += col.r * level * 3;
          cg += col.g * level * 3;
          cb += col.b * level * 3;
        }
      }
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
    if (flashW > 0) {
      this.flashPos.multiplyScalar(1 / flashW);
      acc.multiplyScalar(1 / Math.max(1e-3, strobeMax * strobeOn));
      env.addFlash(acc, strobe * 2.2, this.flashPos);
    }
    if (blindMax > 0) {
      this.flashPos.set(0, 3, 2);
      env.addFlash(BLINDER_FLASH, blindMax * 1.4, this.flashPos);
    }
    const nf = Math.max(1, n);
    env.stageIntensity = Math.min(3, env.stageIntensity + (2.6 * sumDim) / nf + blindMax * 1.2 + strobe * 0.8);
    env.audienceWash = Math.min(1, env.audienceWash + aud / (nf * 0.28) + blindMax * 0.9);
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
      const e = this.blinderLevel * 0.5;
      W.r += 1 * e;
      W.g += 0.72 * e;
      W.b += 0.42 * e;
      I += e;
    }
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
  private writePillars(t: number, beat: BeatInfo, env: App['env']): void {
    const rig = this.rig!;
    const bl = this.idx.pillars.resolve(t, this.pillarBlend);
    const np = rig.pillars.length;
    const k = bl.k;
    let lampI = 0;
    let shaftI = 0;
    const lamp = this.cA.setRGB(0, 0, 0);
    const shaft = this.cB.setRGB(0, 0, 0);
    const arr = this.chaseArr;
    for (let i = 0; i < np; i++) arr[i] = 0;
    let modulated = false;
    const pal = this.app.palette;
    // two passes: target state (weight k) and previous state (weight 1-k)
    for (let pass = 0; pass < 2; pass++) {
      const c = pass === 0 ? bl.to : bl.from;
      const w = pass === 0 ? k : 1 - k;
      if (w <= 0) continue;
      let li = 1;
      let si = 0.8;
      let mode = 0;
      if (c) {
        resolveColor(c.color ?? '#4a86d8', pal, c.c1, 'primary');
        if (c.shaft) resolveColor(c.shaft, pal, c.c3, 'secondary');
        else c.c3.copy(DEFAULT_SHAFT);
        mode = c.mode;
        li = mode === PM_OFF ? 0 : c.intensity;
        si = mode === PM_OFF ? 0 : c.shaftIntensity;
        lamp.r += c.c1.r * li * w;
        lamp.g += c.c1.g * li * w;
        lamp.b += c.c1.b * li * w;
        shaft.r += c.c3.r * si * w;
        shaft.g += c.c3.g * si * w;
        shaft.b += c.c3.b * si * w;
      } else {
        lamp.r += DEFAULT_LAMP.r * w;
        lamp.g += DEFAULT_LAMP.g * w;
        lamp.b += DEFAULT_LAMP.b * w;
        shaft.r += DEFAULT_SHAFT.r * 0.8 * w;
        shaft.g += DEFAULT_SHAFT.g * 0.8 * w;
        shaft.b += DEFAULT_SHAFT.b * 0.8 * w;
      }
      lampI += li * w;
      shaftI += si * w;
      if (mode === PM_FLICKER || mode === PM_CHASE || mode === PM_PULSE) modulated = true;
      for (let i = 0; i < np; i++) arr[i] += (c ? pillarMult(c, mode, i, rig.pillars[i].row, rig.rows, t, beat) : 1) * w * (li > 0 ? li : 1);
    }
    if (lampI > 1e-4) {
      env.pillarLampColor.setRGB(lamp.r / lampI, lamp.g / lampI, lamp.b / lampI);
      for (let i = 0; i < np; i++) arr[i] /= lampI;
    }
    if (shaftI > 1e-4) env.pillarShaftColor.setRGB(shaft.r / shaftI, shaft.g / shaftI, shaft.b / shaftI);
    env.pillarLampIntensity = lampI;
    env.pillarShaftIntensity = shaftI;
    env.pillarChase = modulated ? arr : this.emptyArr;
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
      drawCalls: 7,
      cues: this.idx.count,
      classes: rig?.classes.length ?? 0,
      looks,
      strobe: Number(this.strobeLevel.toFixed(2)),
      blinder: Number(this.blinderLevel.toFixed(2)),
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
function strobeEnv(c: LightCue, t: number, beat: BeatInfo): number {
  const tt = t - c.t0;
  if (tt < 0) return 0;
  switch (c.cue.fx) {
    case 'burst': {
      const period = 1 / c.rate;
      const last = Math.floor(Math.min(tt, Math.max(0, c.dur - 1e-3)) / period) * period;
      const local = tt - last;
      return local < 0 ? 0 : Math.exp(-local / 0.022);
    }
    case 'kick': {
      const since = (beat.phase * 60) / Math.max(40, beat.bpm);
      const start = t - since;
      if (start < c.t0 - 0.03 || start > c.t0 + c.dur) return 0;
      return Math.exp(-since / 0.035);
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
