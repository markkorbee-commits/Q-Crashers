import * as THREE from 'three';
import type { App } from '../core/App';
import type { AnchorName } from '../core/Anchors';
import type { BeatInfo, FrameContext, QualitySettings, System } from '../core/types';
import { resolveColor } from '../show/colors';
import type { Cue } from '../show/ShowTypes';
import {
  AREA_AISLE,
  AREA_FIELD,
  AREA_FRONT,
  AREA_SIDES_L,
  AREA_SIDES_R,
  AREA_STAGE,
  BLINDER_TAIL,
  CALM_GAP,
  calmBurstPeriod,
  calmChaseStep,
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
  PM_STROBE,
  PRESETS,
  STROBE_TAIL,
  TAN_NARROW,
  type CalmBudget,
  type LightCue,
  type StateBlend,
} from './cues';
import { buildFestoon, type Bulb } from './festoon';
import {
  BeamLayer,
  createNoise3D,
  FB_BACK,
  FB_BACK_WIDE,
  FB_BOOTH,
  FB_DECK,
  FB_FIELD,
  FB_FIELD_FAR,
  FB_LENS,
  FB_LOWFOG,
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
import { BACKLIGHT_Z, buildRig, GROUP_NAMES, isDefaultAnchor, RIG_SOURCES, T_BACK, T_BOOTH, T_EXPLICIT, T_SPARLAMP, type Rig } from './rig';

/**
 * Photosensitivity option (App.reduceFlashing): a budgeted `lights.hit` fires at this share and swells in over
 * CALM_RISE (s); a calm chase swings between CALM_CHASE_FLOOR and FLOOR + SWING (was dark -> full)
 */
const CALM_HIT_K = 0.6;
const CALM_RISE = 0.12;
const CALM_CHASE_FLOOR = 0.25;
const CALM_CHASE_SWING = 0.35;
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
/** spar lamp row (round 11): release after dur (s), lens gain, glare half angle (rad), halo size (m) */
const SPARLAMP_RELEASE = 0.12;
const SPARLAMP_K = 1.2;
const SPARLAMP_HALF = 0.12;
const SPARLAMP_SIZE = 0.3;
/** per-lantern colour glow (round 11): gain (x BULB_GAIN), size (m), height over the pillar base (lower glass) */
const PILLAR_GLOW_K = 0.6;
const PILLAR_GLOW_SIZE = 1.4;
const PILLAR_GLOW_Y = 10.7;
/** festoon bulb HDR gain (a warm dot that reads from the far field, not a flare) */
const BULB_GAIN = 11;
/** flood haze glow gain per unit density-metre (stage / sides / field volumes) */
const FLOOD_K_STAGE = 0.03;
const FLOOD_K_SIDES = 0.05;
const FLOOD_K_FIELD = 0.02;
/** backlight / booth haze glow */
const LOCAL_GLOW_K = 0.06;
/**
 * Round 6: the backlight arc in the portal faces the camera through dense haze (v409.0–412.1: the frame
 * goes milky blue-white around the MC, the set almost gone behind it). Forward scatter of lamps aimed at
 * the lens is far stronger than the side scatter of LOCAL_GLOW_K; the haze takes a cool blue-white.
 */
const BACK_GLOW_K = 1.3;
/**
 * field flood: HDR of the lit-ground pool per unit flood level. Round 4 (similarity against the video):
 * a flood is lit AIR — the paving under it only catches a soft pool in front of the deck, the far
 * field stays dark (was 0.55 with a second pool over the back of the field)
 */
const FLOOD_GROUND = 0.3;
/** lens veil per unit of beam light aimed at the lens (look `flare`, round 11) */
const FLARE_K = 0.035;
/** distance (m) of the lens-veil blob from the camera towards the flaring lamps */
const FLARE_OFF = 2.6;
/** local ground pools (flood area `aisle` / `front`, round 11): HDR per unit flood level */
const POOL_FLOOD_K = 0.9;
/** flood slices per quality level (depth-sliced haze integral) */
const FLOOD_SLICES: Record<string, number> = { ultra: 10, high: 9, medium: 7, mobile: 4 };
/** dense-haze scatter ("storm haze"): env.haze range over which the lit haze turns into a glowing cloud */
const SCATTER_H0 = 0.76;
const SCATTER_H1 = 0.92;
/**
 * Round 5 (similarity against the video, 1243 s beam storm: 29 % -> 47 %): the storm cloud is multiple
 * scattering in dense haze, which saturates its light towards the dominant hue of the rig and the wash
 * (c' = max · (c / max)^SCATTER_SAT, like the pyro bounce in worldLights): a cool-white rig under a steel
 * wash lights STEEL-BLUE haze between crisp white beams (video mean sRGB 86 / 128 / 165), not a milky
 * grey veil over the whole frame (ours was 154 / 170 / 185 with p10 luma 139). SCATTER_GAIN: its level.
 */
const SCATTER_SAT = 4;
/**
 * flood glow saturation (LightingSystem.floodGlowSat: 1 = the white part of a saturated flood colour removed) and
 * its luminance make-up cap (1 = none; 1.3 / 1.6 measured worse, see floodGlowSat)
 */
const FLOOD_GLOW_SAT = 1;
const FLOOD_SAT_GAIN = 1;
const SCATTER_GAIN = 0.5;
/** storm haze: how far the beams bloom into soft shafts (was 0.85: wide milky shafts; the video's are crisp) */
const STORM_SOFT = 0.45;
/**
 * Laser light held by the smoke (LaserSystem.airLight: sheets scanning a dense low fog) in the flood
 * volume: the air over the field and the stage glows in the sea colour (Embers v1112-1175: the whole frame
 * a saturated blue smoke volume, sRGB ≈ [0, 4, 100] where ours was black). Per unit of air light.
 */
const LASER_AIR_K = 0.012;
/**
 * saturation of that glow (as SCATTER_SAT): the sheets' #2A60FF reads periwinkle in a flat veil; the video's
 * lit smoke is a deep pure blue. Round 5: 1169.5 s 29 -> 42 %, 1165 26 -> 43 %; a flat periwinkle veil at the
 * same level lost 2-15 points (it greys the frame out)
 */
const LASER_AIR_SAT = 3;
/**
 * Round 6: deck close-ups (v656–711): a camera among the performers stands in the smoke-machine fog over the
 * deck (`fog.lowfog` on the deck), lit by the wash in the fog's colour — the film's close-ups of the fire
 * ritual are full of red air, ours were clean and dark (705 s 30 -> 47 %). Gain per unit wash level x unit
 * lowfog density (+ DECK_RIG_K x the rig's output: 0, a rig-lit veil greyed the pink / white looks).
 * Without deck fog there is no deck air (v348 / v403: dark close-ups, a veil there lost 16–32 points).
 */
const DECK_HAZE_K = 0.5;
const DECK_RIG_K = 0;
/**
 * Round 7: a camera on the deck (deckCloseUp) stands under the stage flood. The film's close-ups of the fire
 * ritual (v656, v680.5) keep dark air over the performers — the red smoke lies on the deck (FB_DECK) and the
 * flood colours the set — where the stage-wide flood volume veiled the whole frame pink-red. Share of the
 * flood cues' stage air (FB_STAGE / FB_STAGE_HIGH) a full close-up loses; scatter and laser air stay.
 */
const CLOSE_FLOOD_K = 1;
/** static downlights (arch crown): PAR-can beam half angle and the lit lens face seen off-axis */
const TAN_CAN = Math.tan((6 * Math.PI) / 180);
const CAN_GAIN = 7;
/**
 * Round 6: the arch cans' haze cones (v656–711). The film shows the ring of lamps in the crown and their
 * light on the performers and in the smoke around them, never a set of cream cones filling the portal (seen
 * from inside the portal at 658–666 they filled the frame). Their volume is drawn at this share.
 */
const ARCH_BEAM_K = 0.12;
/**
 * arch downlights: haze glow around the portal mouth per unit of mean level. Round 7: 0 (was 0.035). The
 * local blob (FB_BOOTH, with its near pre-slice share) filled the portal mouth of every close-up with a cream
 * haze on top of the stage flood and the deck air; the film's portal shows the lamps and the red smoke,
 * not a lit cloud (troupe close-ups 656 / 690 / 705 +2.5 / +2.2 / +1.1 points, none lower)
 */
const ARCH_GLOW_K = 0;
/**
 * Round 8: a beam passing through the low fog (`fog.lowfog` on the deck / field) scatters this much more light
 * per unit fog density there than in the haze alone: white floor beams through a white bank light it up as a
 * bright band (v802.75), not a grey layer lit only by the soft-kneed rig term of the smoke shader.
 */
const LOWFOG_BEAM_K = 3;
/** how far the fog's albedo leans to white (its cue colour is mostly the light it holds) */
const LOWFOG_WHITE = 0.6;
/** glow of the bank lit by the beams (flood volume FB_LOWFOG) per unit of beam light deposited in it */
const LOWFOG_GLOW_K = 0.004;
/** scale of LightEnv.lowFogLight per unit of deposited beam light (~1 for a dozen full white beams in a dense bank) */
const LOWFOG_ENV_K = 0.05;

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
 *  round 11 (same doc): the spar lamp row (target `spar_lamps`), blinder attack / release / aim / spread, per-lantern
 *           colours (`colors`, `rowColors`, `shafts`, `rowShafts`) and pillar mode `strobe`, flood `gate` / `duty` /
 *           `offset` and the local pool areas `aisle` / `front`, the `storm` and `key` (dragon key) fx, the flat
 *           fan (`fan` + `aim`), the lens veil (look `flare`), and the calm (reduce flashing) state tracks
 */
export class LightingSystem implements System {
  readonly name = 'lights';
  private app!: App;
  private enabled = true;
  private q!: QualitySettings;
  private readonly root = new THREE.Group();
  private readonly shared: SharedUniforms = {
    tNoise: { value: null },
    uTime: { value: 0 },
    uPixelAngle: { value: 0.002 },
    uLowFog: { value: new THREE.Vector4(0, 0, 0, 0) },
    uLowFogTint: { value: new THREE.Color(1, 1, 1) },
  };
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
  /** round 11: lens-veil gain of each head's look (`flare`), 0 = none */
  private sFlare = new Float32Array(0);
  /** this frame's lens veil (premultiplied colour) from the heads aimed at the camera, and its gain */
  private readonly lensVeil = new THREE.Color();
  /** weighted direction from the camera to the flaring lamps (the veil leans that way: glare from the lamp's side) */
  private readonly lensDir = new THREE.Vector3();
  flareK = FLARE_K;

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
  /** per-pillar lamp / shaft colour this frame (LightEnv.pillarLampColors / pillarShaftColors while they differ) */
  private pLampCols: THREE.Color[] = [];
  private pShaftCols: THREE.Color[] = [];
  private readonly emptyCols: THREE.Color[] = [];
  /** spar lamps in the rig (explicit `spar_lamps` emitters; not counted in the strobe coverage) */
  private nSparLamps = 0;
  // this frame's blinder / backlight / booth output (colour premultiplied by level)
  private readonly blindCol = new THREE.Color();
  private readonly backCol = new THREE.Color();
  private readonly boothCol = new THREE.Color();
  private backLevel = 0;
  private boothLevel = 0;
  /** arch-crown downlights this frame: mean level, premultiplied colour sum, count in the rig */
  private archLevel = 0;
  private readonly archCol = new THREE.Color();
  private nArch = 0;
  /** accumulated flood output per area this frame (premultiplied colour) */
  private readonly floodStage = new THREE.Color();
  private readonly floodField = new THREE.Color();
  private readonly floodSideL = new THREE.Color();
  private readonly floodSideR = new THREE.Color();
  /** round 11: this frame's local ground-pool floods (premultiplied): the aisle between the lanterns, the deck front */
  private readonly floodAisle = new THREE.Color();
  private readonly floodFront = new THREE.Color();
  /** local ground pools: HDR gain of the pool and share of their light-bus flash (side-by-side calibration) */
  poolK = POOL_FLOOD_K;
  poolFlashK = 0.8;
  private readonly cF = new THREE.Color();
  /** saturated wash / rig colour of the storm-haze scatter (scratch) */
  private readonly cSW = new THREE.Color();
  private readonly cSR = new THREE.Color();
  /** this frame's flood colours before the laser air (the frame hook adds it idempotently) */
  private readonly floodBase: THREE.Vector3[] = Array.from({ length: FLOOD_BLOBS }, () => new THREE.Vector3());
  private laserSys: { airLight?: unknown } | null | undefined = undefined;
  /** laser air gain (LASER_AIR_K), exposed for side-by-side calibration */
  laserAirK = LASER_AIR_K;
  laserAirSat = LASER_AIR_SAT;
  /** spar lamp row: lens gain multiplier, glare half angle (rad) and size (m) (side-by-side calibration) */
  sparLampK = SPARLAMP_K;
  sparLampHalf = SPARLAMP_HALF;
  sparLampSize = SPARLAMP_SIZE;
  /** spar lamp disc: gain (x BULB_GAIN) and size (m) of the soft lens disc under the star */
  sparLampDiscK = 1;
  sparLampDisc = 1.2;
  /** backlight haze glow / lens gain multipliers (side-by-side calibration) */
  backGlowK = 1;
  backLensK = 2.5;
  backSize = 0.32;
  /** hue a white backlight takes in the haze (cool blue-white; the lamps' colour otherwise) */
  readonly backCool = new THREE.Color(0.5, 0.72, 1);
  private readonly cSL = new THREE.Color();
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
      // the deck air glows only for a camera on / at the deck: weighted with THIS camera's position (the
      // rig updates after us), so a cut never carries the veil a frame into a wide shot
      const c = this.flood.cols[FB_DECK];
      const k = deckCloseUp(camera);
      c.set(this.deckBase.x * k, this.deckBase.y * k, this.deckBase.z * k);
      // ... and stands under the stage flood: the flood's lit air over the whole set is replaced by that
      // deck smoke (CLOSE_FLOOD_K), so a close-up keeps the dark air above the performers
      const s = this.closeFloodK * k;
      for (let j = 0; j < 2; j++) {
        const all = this.stageAll[j];
        const fl = this.stageFl[j];
        this.flood.cols[j === 0 ? FB_STAGE : FB_STAGE_HIGH].set(all.x - fl.x * s, all.y - fl.y * s, all.z - fl.z * s);
      }
      // the lens veil sits at the camera that draws (round 11)
      this.placeLensVeil(camera);
      // the backlight veil is forward scatter: only a camera in front of the lamps, facing them, sees it
      const f = backFacing(camera);
      const b = this.backBase;
      this.flood.cols[FB_BACK].set(b.x * f, b.y * f, b.z * f);
      this.flood.cols[FB_BACK_WIDE].set(b.x * f, b.y * f, b.z * f);
      this.flood.syncSlices();
    };
    // the lasers update after us: their light in the smoke joins the flood volume once every system ran
    app.onFrame(() => this.applyLaserAir());

    // visual lifetimes: looks fade out, blinders glow down, strobe flashes decay
    app.show.registerLifetime('lights', (c) => {
      const fade = typeof c.p?.fade === 'number' ? c.p.fade : 0.5;
      if (c.fx === 'look' || c.fx === 'wash' || c.fx === 'pillars') return c.dur + Math.max(0, fade);
      if (c.fx === 'blinder') return c.dur + (typeof c.p?.release === 'number' ? Math.max(0.05, c.p.release * 3.5) : BLINDER_TAIL);
      if (c.fx === 'storm') return c.dur + (typeof c.p?.fade === 'number' ? Math.max(0, c.p.fade) : 1.2);
      if (c.fx === 'key') return c.dur + Math.max(0, typeof c.p?.fade === 'number' ? c.p.fade : 0.5);
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
    this.nArch = rig.fixtures.reduce((m, f) => m + (f.focus ? 1 : 0), 0);
    const n = rig.fixtures.length;
    this.sDir = new Float32Array(n * 3);
    this.sCol = new Float32Array(n * 3);
    this.sDim = new Float32Array(n);
    this.sTan = new Float32Array(n);
    this.sGobo = new Uint8Array(n);
    this.sFlare = new Float32Array(n);
    this.chaseArr = new Array(rig.pillars.length).fill(1);
    this.pillarLamp = new Float32Array(rig.pillars.length);
    this.pillarBlends = rig.pillars.map(() => ({ from: null, to: null, k: 1 }));
    this.pLampCols = rig.pillars.map(() => new THREE.Color());
    this.pShaftCols = rig.pillars.map(() => new THREE.Color());
    this.nSparLamps = rig.emitters.reduce((m, e) => m + (e.tags & T_SPARLAMP ? 1 : 0), 0);
    this.blends = rig.classes.map(() => ({ from: null, to: null, k: 1 }));
    this.bulbs = buildFestoon(anchors);
    // look tracks are per fixture class, hit / strobe masks per fixture / emitter: rebuild now (during
    // loading) instead of on the first rendered frame
    if (this.app.show.file) this.idx.sync(this.app.show, rig);
    else this.idx.revision = -1;
    const radial = this.q.level === 'mobile' ? 8 : this.q.level === 'medium' ? 10 : 12;
    this.beams.build(Math.min(n, this.q.beamBudget + nExplicit), radial);
    this.pools.build(n + 6);
    this.sprites.build(n + rig.emitters.length + this.bulbs.length + rig.pillars.length + 16);
    // Round 8: no housing box for the explicit-only lamps in the DJ portal (booth spot, backlight arc). The booth
    // spot's 0.62 m box at (0, 4.05, −6.47) stood in the portal mouth in front of the arch-crown cans: a black
    // square in every close-up of the portal (v409–412, 656, 705, 739.75), where the film shows nothing. The
    // lamps stay (flare / disc sprites, haze glow, light on the deck); only the box is gone.
    const housings = rig.emitters.filter((e) => (e.tags & T_EXPLICIT) === 0).map((e) => {
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
    // storm haze (round 11: also a `lights.storm` cue, whatever the fog level): the lit cloud's level, 0..1.5
    this.storm = this.evalStorm(t);
    // storm haze: beams bloom into soft shafts (energy spread over a wider cone)
    this.beams.material.uniforms.uSoft.value = STORM_SOFT * Math.max(smooth01((haze - 0.7) / 0.22), Math.min(1, this.storm));

    // ---------------------------------------------------------------- cue state
    // photosensitivity option: every flash shares the calm budget (LightCueIndex.calm), the state tracks drop
    // their authored stutters (LightCueIndex.calm*)
    const rf = this.reduceFlashing();
    this.rf = rf;
    const lookTracks = rf ? this.idx.calmLooks : this.idx.looks;
    for (let g = 0; g < this.blends.length; g++) {
      const b = lookTracks[g].resolve(t, this.blends[g]);
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
    const calm = this.idx.calm;
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
          this.sFlare[i] = 0;
          sDir[i * 3] = f.rest.x;
          sDir[i * 3 + 1] = f.rest.y;
          sDir[i * 3 + 2] = f.rest.z;
          continue;
        }
      }
      evalLook(bl.to, f, t, beat, A, rf);
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
        evalLook(bl.from, f, t, beat, B, rf);
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
        let e = c.intensity * (1 - u) * (1 - u);
        // calm: a budgeted hit swells in over CALM_RISE at 60 % (a dropped one does not fire)
        if (rf) e = calm.ok(c.t0) ? e * CALM_HIT_K * smooth01((t - c.t0) / CALM_RISE) : 0;
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
        const e = (rf ? chaseEnvCalm(c, f.u, f.cluster, t, calm) : chaseEnv(c, f.u, f.cluster, t)) * c.intensity;
        // (calm: the look underneath keeps more of its level, the chase swings over a third of the range)
        dim = dim * (rf ? 0.6 : 0.3) + e;
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
      // lens veil gain (look `flare`), cross-faded with the look
      this.sFlare[i] = (bl.to ? bl.to.flare * k : 0) + (k < 1 && bl.from ? bl.from.flare * (1 - k) : 0);
      sDir[i * 3] = dx;
      sDir[i * 3 + 1] = dy;
      sDir[i * 3 + 2] = dz;
      sCol[i * 3] = r;
      sCol[i * 3 + 1] = g;
      sCol[i * 3 + 2] = b;
    }

    // ---------------------------------------------------------------- GPU: beams, lenses, pools, bodies
    // (the low fog first: the beams passing through it light the bank)
    this.writeLowFog(t);
    const lfu = this.shared.uLowFog.value;
    const fogOn = this.lowFogGlowK > 0 && lfu.x + lfu.y + lfu.z > 0.001;
    this.lowAcc.set(0, 0, 0, 0);
    this.lowPos.set(0, 0, 0, 0);
    this.lowCol.setRGB(0, 0, 0);
    this.lensVeil.setRGB(0, 0, 0);
    this.lensDir.set(0, 0, 0);
    const cpx = cam.position.x;
    const cpy = cam.position.y;
    const cpz = cam.position.z;
    this.beams.begin();
    this.pools.begin();
    this.sprites.begin();
    let sumDim = 0;
    let archDim = 0;
    this.archCol.setRGB(0, 0, 0);
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
      // discharge-lamp beams read slightly cool (~7500 K); the arch cans' short throw hardly shows a cone
      const gobo = this.sGobo[i];
      const bk = BEAM_GAIN * (f.focus ? this.archBeamK : 1);
      this.beams.push(lx, ly, lz, r0, dx, dy, dz, len, r * bk * 0.92, g * bk * 0.97, b * bk * 1.06, tan, f.seed, grounded ? gy + 1 : 0, gobo);
      this.sprites.push(SPR_LENS, lx, ly, lz, dx, dy, dz, Math.atan(tan), r * LENS_GAIN, g * LENS_GAIN, b * LENS_GAIN, 0.2);
      if (f.focus) {
        // a PAR can's big lens reads as a bright disc from well off its axis (the ring of lamps in the arch
        // crown, v656 / v705)
        this.sprites.push(SPR_BULB, lx, ly, lz, dx, dy, dz, 0, r * this.archCanK, g * this.archCanK, b * this.archCanK, 0.16);
        archDim += dim;
        this.archCol.r += r;
        this.archCol.g += g;
        this.archCol.b += b;
      }
      const lum = (r + g + b) * 0.333;
      if (fogOn) this.depositLowFog(lx, ly, lz, dx, dy, dz, len, r, g, b);
      const fl = this.sFlare[i];
      if (fl > 0) {
        // round 11: a head of a `flare` look pointing its beam at the camera veils the lens (the hot factor of the lens
        // sprite, a little wider; stronger the closer the lamp)
        const vx = cpx - lx;
        const vy = cpy - ly;
        const vz = cpz - lz;
        const dist = Math.hypot(vx, vy, vz) || 1;
        const ca = Math.min(1, Math.max(-1, (dx * vx + dy * vy + dz * vz) / dist));
        const ang = Math.acos(ca) / (Math.atan(tan) * 1.35 + 0.03);
        const hot = Math.exp(-ang * ang);
        if (hot > 0.01) {
          const w = fl * hot / (1 + (dist / 40) * (dist / 40));
          this.lensVeil.r += r * w;
          this.lensVeil.g += g * w;
          this.lensVeil.b += b * w;
          const wl = (w * (r + g + b)) / dist;
          this.lensDir.x -= vx * wl;
          this.lensDir.y -= vy * wl;
          this.lensDir.z -= vz * wl;
        }
      }
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
    this.blindCol.setRGB(0, 0, 0);
    this.backCol.setRGB(0, 0, 0);
    this.boothCol.setRGB(0, 0, 0);
    let backMax = 0;
    let boothMax = 0;
    let sparMax = 0;
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
          const v = strobeEnv(c, t, beat, rf, calm) * c.intensity * (rf ? 0.4 : 1);
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
        const spar = (e.tags & T_SPARLAMP) !== 0;
        let aimC: LightCue | null = null;
        for (let h = 0; h < this.blinders.length; h++) {
          const c = this.blinders[h];
          if (c.mask![j] !== 1) continue;
          const u = t - c.t0;
          // rise over `attack` (default 0.03 s; calm: at least 0.25 s), release over `release` after dur (default the
          // 0.32 s tungsten afterglow; the spar lamps are discharge lamps: SPARLAMP_RELEASE, no cooling)
          const att = c.blAttack >= 0 ? c.blAttack : 0.03;
          const rel = c.release >= 0 ? c.release : spar ? SPARLAMP_RELEASE : 0.32;
          const v = (u <= c.dur ? Math.min(1, u / (rf ? Math.max(0.25, att) : att)) : Math.exp(-(u - c.dur) / rel)) * c.intensity * (rf ? 0.5 : 1);
          if (v > level) {
            level = v;
            aimC = c;
            // tungsten filament: cools towards deep orange as it decays (not with an explicit release, nor the spar lamps)
            const cool = u <= c.dur || spar || c.release >= 0 ? 0 : Math.pow(1 - Math.min(1, v / Math.max(0.01, c.intensity)), 0.7) * 0.9;
            col.copy(c.c1).lerp(TUNGSTEN, cool);
          }
        }
        if (level > 0.003) {
          if (spar) {
            // a moving head's lens staring into the camera (round 11): a glare star with a small halo, no beam cone.
            // Aimed at the deck front (SPARLAMP_AIM) or the cue's `aim`; the wide half angle keeps the star for the
            // deck cameras around the aim point
            let fx = e.fwd.x;
            let fy = e.fwd.y;
            let fz = e.fwd.z;
            const a = aimC?.aim;
            if (a) {
              fx = a.x - e.pos.x;
              fy = a.y - e.pos.y;
              fz = a.z - e.pos.z;
              const ln = Math.hypot(fx, fy, fz) || 1;
              fx /= ln;
              fy /= ln;
              fz /= ln;
            }
            const k = level * LENS_GAIN * this.sparLampK;
            // the glare star shows within about the lamp's half angle of its axis (`spread`, deg; default SPARLAMP_HALF)
            const half = aimC && aimC.spread !== null ? Math.min(1.2, Math.max(0.01, (aimC.spread * Math.PI) / 180)) : this.sparLampHalf;
            this.sprites.push(SPR_LENS, e.pos.x, e.pos.y, e.pos.z, fx, fy, fz, half, col.r * k, col.g * k, col.b * k, this.sparLampSize);
            // the over-exposed lens disc blooming in the haze around the star (v358–363: soft cyan-white discs)
            const kd = level * BULB_GAIN * this.sparLampDiscK;
            if (kd > 0) this.sprites.push(SPR_BULB, e.pos.x, e.pos.y, e.pos.z, fx, fy, fz, 0, col.r * kd, col.g * kd, col.b * kd, this.sparLampDisc);
            sparMax = Math.max(sparMax, level);
            // their light reaches the air and the crowd in front of the wings a little (not the set)
            cr += col.r * level * 0.4;
            cg += col.g * level * 0.4;
            cb += col.b * level * 0.4;
            continue;
          }
          if (e.tags & T_BACK) {
            // round PAR-style backlight lamp aimed at the audience (the camera): a big soft hot disc blooming
            // through the haze (v409–412)
            const k = level * BLINDER_GAIN * this.backLensK;
            this.sprites.push(SPR_BULB, e.pos.x, e.pos.y, e.pos.z, e.fwd.x, e.fwd.y, e.fwd.z, 0, col.r * k, col.g * k, col.b * k, this.backSize);
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
    // arch-crown downlights: mean level + colour for the troupe in the arch (LightEnv) and the haze glow
    this.archLevel = this.nArch > 0 ? Math.min(1.5, archDim / this.nArch) : 0;
    normalizeColor(this.archCol, env.archSpotColor);
    env.archSpotIntensity = this.archLevel;
    // ---------------------------------------------------------------- festoon bulbs + practicals
    this.writeFestoon(t, beat);
    // ---------------------------------------------------------------- floods (+ their light on the field)
    const flood = this.evalFloods(t, beat, rf);
    {
      // round 11: local pools (flood area `aisle` / `front`): the aisle between the lantern rows (x ±13, z 30–146)
      // and the paving in front of the deck (x ±34, z 1–19), soft edges, no lit air
      const kp = this.poolK * (rf ? 0.6 : 1);
      const a = this.floodAisle;
      if (a.r + a.g + a.b > 1e-4) this.pools.push(0, 0.07, 88, 58, 0, 1, 13, 0.9, a.r * kp, a.g * kp, a.b * kp, 0);
      const f = this.floodFront;
      if (f.r + f.g + f.b > 1e-4) this.pools.push(0, 0.07, 10, 34, 1, 0, 9, 2.3, f.r * kp, f.g * kp, f.b * kp, 0);
    }
    if (flood.field > 0) {
      // the flooded air lights the paved field: a broad soft pool, brightest in front of the stage
      const fc = this.floodField;
      const kf = FLOOD_GROUND * (rf ? 0.6 : 1);
      this.pools.push(0, 0.07, 26, 56, 1, 0, 36, 0.3, fc.r * kf, fc.g * kf, fc.b * kf, 0);
      this.pools.push(0, 0.07, 100, 52, 1, 0, 50, 1.7, fc.r * kf * 0.2, fc.g * kf * 0.2, fc.b * kf * 0.2, 0);
    }
    // lantern pillar lamps (before the sprites close: lanterns in different colours add their glow sprites)
    this.writePillars(t, beat, env);
    this.nSprites = this.sprites.count;
    this.beams.end();
    this.pools.end();
    this.sprites.end();
    this.strobeLevel = strobeMax;
    this.blinderLevel = blindMax;

    // ---------------------------------------------------------------- env outputs
    // (the spar lamp row, round 11, stays out of the coverage count: the strobe level of a cue is unchanged by it)
    const nStrobes = Math.max(1, em.length - this.nSparLamps);
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
      if (this.blindFlashK > 0) env.addFlash(this.cF, blindMax * 1.4 * this.blindFlashK * flashK, this.flashPos);
    }
    // (backlights add no env flash: the stage set reads the flash colour, and the castle behind the
    // backlights must stay dark; they light the crowd through stageColor / audienceWash instead)
    cr += this.floodStage.r * 2 + this.floodField.r * 3 + (this.floodSideL.r + this.floodSideR.r);
    cg += this.floodStage.g * 2 + this.floodField.g * 3 + (this.floodSideL.g + this.floodSideR.g);
    cb += this.floodStage.b * 2 + this.floodField.b * 3 + (this.floodSideL.b + this.floodSideR.b);
    const nf = Math.max(1, n);
    env.stageIntensity = Math.min(3, env.stageIntensity + (2.6 * sumDim) / nf + blindMax * 1.2 + strobe * 0.8 + backMax * 0.5 + boothMax * 0.2 + sparMax * 0.2 + flood.stage * 0.5 + flood.field * 0.7);
    env.audienceWash = Math.min(1, env.audienceWash + aud / (nf * 0.28) + blindMax * 0.9 + backMax * 0.45 + flood.field * 0.5);
    const cm = Math.max(cr, cg, cb);
    if (cm > 1e-4) env.stageColor.setRGB(cr / cm, cg / cm, cb / cm);
    else env.stageColor.copy(pal.primary).multiplyScalar(0.25);

    this.writeWash(t, env);
    this.writeKey(t, env);

    // haze glow around the set: floods in the wash colour + the rig's own spill low in front
    const hz = 0.25 + 0.75 * haze;
    this.floorGlow.copy(env.stageColor);
    const floorI = Math.min(1.5, (1.4 * sumDim) / nf) + strobe * 0.6 + blindMax * 0.8;
    if (strobe > 0) this.floorGlow.lerp(this.cT.setRGB(1, 1, 1), Math.min(1, strobe));
    // (the wash level saturates: a 1.1 wash reads as a stronger set colour, not as a denser fog)
    const washGlow = env.stageWashIntensity / (1 + 0.45 * env.stageWashIntensity);
    this.glow.update(cam.position, env.stageWashColor, (washGlow + strobe * 0.35) * this.washGlowK, this.floorGlow, floorI * this.floorGlowK, 0.02 * hz);
    this.writeFloodGlow(env, haze, sumDim / nf, strobe, t);
    for (let i = 0; i < FLOOD_BLOBS; i++) this.floodBase[i].copy(this.flood.cols[i]);
    this.stageAll[0].copy(this.flood.cols[FB_STAGE]);
    this.stageAll[1].copy(this.flood.cols[FB_STAGE_HIGH]);
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
    const bl = (this.rf ? this.idx.calmWash : this.idx.wash).resolve(t, this.washBlend);
    const pal = this.app.palette;
    // premultiplied blend of the two wash states (none = dark; palette primary at 0.35 only in a show without washes)
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
      let e = c.intensity * (1 - u) * (1 - u) * 0.7;
      if (this.rf) e = this.idx.calm.ok(c.t0) ? e * CALM_HIT_K * smooth01((t - c.t0) / CALM_RISE) : 0;
      W.r += c.c1.r * e;
      W.g += c.c1.g * e;
      W.b += c.c1.b * e;
      I += e;
    }
    if (this.blinderLevel > 0) {
      // the audience blinders' own colour splashes onto the set (cyan -> cyan, gold -> gold)
      const e = this.blinderLevel * this.blindSetK;
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
    const fsd = 0.25 * this.floodSetK;
    const fsk = 0.35 * this.floodSetK;
    W.r += fs.r * fsk + (this.floodSideL.r + this.floodSideR.r) * fsd;
    W.g += fs.g * fsk + (this.floodSideL.g + this.floodSideR.g) * fsd;
    W.b += fs.b * fsk + (this.floodSideL.b + this.floodSideR.b) * fsd;
    I += lum(fs) * fsk + (lum(this.floodSideL) + lum(this.floodSideR)) * fsd;
    if (I > 1e-4) env.stageWashColor.setRGB(W.r / I, W.g / I, W.b / I);
    else env.stageWashColor.copy(pal.primary);
    env.stageWashIntensity = Math.min(2, I);
  }

  /**
   * `lights.key` (round 11): a key light on the dragon sculpture, independent of the set wash (LightEnv.dragonKey*):
   * `color` from the audience-left / front, `color2` (default `color`) from the right, `intensity` 0..2, cross-faded
   * over `fade` (latest cue wins). The film floods the head red and green at v944–1010 and v1043.9 while the castle
   * stays dark. The stage's dragon / crown materials read it (contract); the rig itself draws nothing for it.
   */
  private writeKey(t: number, env: App['env']): void {
    const bl = this.idx.key.resolve(t, this.keyBlend);
    const a = env.dragonKeyColor;
    const b = env.dragonKeyColor2;
    a.setRGB(0, 0, 0);
    b.setRGB(0, 0, 0);
    let lv = 0;
    const pal = this.app.palette;
    for (let pass = 0; pass < 2; pass++) {
      const c = pass === 0 ? bl.to : bl.from;
      const w = pass === 0 ? bl.k : 1 - bl.k;
      if (!c || w <= 0) continue;
      const e = Math.min(2, c.intensity) * w;
      resolveColor(c.color ?? 'primary', pal, c.c1, 'primary');
      if (c.color2) resolveColor(c.color2, pal, c.c2, 'secondary');
      else c.c2.copy(c.c1);
      a.r += c.c1.r * e;
      a.g += c.c1.g * e;
      a.b += c.c1.b * e;
      b.r += c.c2.r * e;
      b.g += c.c2.g * e;
      b.b += c.c2.b * e;
      lv += e;
    }
    env.dragonKeyIntensity = lv;
  }
  private readonly keyBlend: StateBlend = { from: null, to: null, k: 1 };

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
    } else if (this.idx.wash.items.length === 0) {
      // a show without any set-wash cue: the palette primary at 0.35. A show that writes its washes means
      // "no wash" between them (and after an explicit black / 0 cue): the set stays dark (video 1322.5 /
      // 1323.5: the isolated wings over an unlit set, not a gold flood)
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
    let sameColor = true;
    let ref = -1;
    const pal = this.app.palette;
    // (reduce flashing: the tracks without the authored stutters)
    const tracks = this.rf ? this.idx.calmPillars : this.idx.pillars;
    const pc = this.pcL;
    const ps = this.pcS;
    for (let i = 0; i < np; i++) {
      const pl = rig.pillars[i];
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
      // this pillar's own lamp / shaft colour (intensity-weighted over the two states)
      const own = this.pLampCols[i].setRGB(0, 0, 0);
      const ownS = this.pShaftCols[i].setRGB(0, 0, 0);
      let ow = 0;
      let osw = 0;
      // two passes: target state (weight k) and previous state (weight 1-k)
      for (let pass = 0; pass < 2; pass++) {
        const c = pass === 0 ? bl.to : bl.from;
        const w = pass === 0 ? k : 1 - k;
        if (w <= 0) continue;
        let l = 1;
        let sh = 0.8;
        let mode = 0;
        if (c) {
          // round 11: `colors` (per pillar, cycled) / `rowColors` (per row) before the cue colour
          const lc = c.colors ? c.colors[pl.index % c.colors.length] : c.rowColors ? c.rowColors[Math.max(0, pl.row) % c.rowColors.length] : c.color;
          resolveColor(lc ?? '#4a86d8', pal, pc, 'primary');
          const sc = c.shafts ? c.shafts[pl.index % c.shafts.length] : c.rowShafts ? c.rowShafts[Math.max(0, pl.row) % c.rowShafts.length] : c.shaft;
          if (sc) resolveColor(sc, pal, ps, 'secondary');
          else ps.copy(DEFAULT_SHAFT);
          mode = c.mode;
          l = mode === PM_OFF ? 0 : c.intensity;
          sh = mode === PM_OFF ? 0 : c.shaftIntensity;
        } else {
          pc.copy(DEFAULT_LAMP);
          ps.copy(DEFAULT_SHAFT);
        }
        lamp.r += pc.r * l * w;
        lamp.g += pc.g * l * w;
        lamp.b += pc.b * l * w;
        shaft.r += ps.r * sh * w;
        shaft.g += ps.g * sh * w;
        shaft.b += ps.b * sh * w;
        // (a dark state still names its colour: a lantern fading in from off takes its new colour at once)
        const wl = w * Math.max(l, 1e-3);
        own.r += pc.r * wl;
        own.g += pc.g * wl;
        own.b += pc.b * wl;
        ow += wl;
        const wsh = w * Math.max(sh, 1e-3);
        ownS.r += ps.r * wsh;
        ownS.g += ps.g * wsh;
        ownS.b += ps.b * wsh;
        osw += wsh;
        li += l * w;
        si += sh * w;
        if (mode === PM_FLICKER || mode === PM_CHASE || mode === PM_PULSE || mode === PM_STROBE) modulated = true;
        num += (c ? pillarMult(c, mode, i, pl.row, rig.rows, t, beat, this.rf) : 1) * w * (l > 0 ? l : 1);
      }
      if (ow > 0) own.multiplyScalar(1 / ow);
      if (osw > 0) ownS.multiplyScalar(1 / osw);
      // (only lit lanterns count: a dark lantern shows no colour)
      if (li > 0.01 && sameColor) {
        if (ref < 0) ref = i;
        else {
          const o = this.pLampCols[ref];
          const so = this.pShaftCols[ref];
          sameColor = Math.abs(own.r - o.r) + Math.abs(own.g - o.g) + Math.abs(own.b - o.b) < 2e-3 && Math.abs(ownS.r - so.r) + Math.abs(ownS.g - so.g) + Math.abs(ownS.b - so.b) < 2e-3;
        }
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
    env.pillarShaftIntensity = shaftMax * this.shaftK;
    if (!uniform && lampMax > 1e-4) {
      // pillars in different states: their lamp level relative to the brightest scales lamp + shaft
      for (let i = 0; i < np; i++) arr[i] *= lampOf[i] / lampMax;
      modulated = true;
    }
    env.pillarChase = modulated ? arr : this.emptyArr;
    // round 11: per-pillar colours while the lanterns differ (LightEnv.pillarLampColors; empty = all the same)
    env.pillarLampColors = sameColor ? this.emptyCols : this.pLampCols;
    env.pillarShaftColors = sameColor ? this.emptyCols : this.pShaftCols;
    this.pillarColored = !sameColor;
    if (!sameColor && this.pillarGlowK > 0 && lampMax > 1e-4) {
      // Until the lantern renderer (src/world/pillars.ts) reads the per-pillar colours, its crystals show the mean
      // colour: every lit lantern also carries a glow in its OWN colour at the lower glass (the magenta near lantern
      // among blue ones at v190). Nothing is drawn while all lanterns share one colour (the default look).
      for (let i = 0; i < np; i++) {
        const lv = (modulated ? arr[i] : 1) * lampMax * this.pillarGlowK * BULB_GAIN;
        if (lv < 0.01) continue;
        const pl = rig.pillars[i];
        const c = this.pLampCols[i];
        this.sprites.push(SPR_BULB, pl.top.x, pl.base.y + PILLAR_GLOW_Y, pl.top.z, 0, 0, 1, 0, c.r * lv, c.g * lv, c.b * lv, this.pillarGlowSize);
      }
    }
  }
  /** lanterns in different colours this frame (their glow sprites are drawn) */
  private pillarColored = false;
  /** scratch: a pillar's lamp / shaft colour of one state */
  private readonly pcL = new THREE.Color();
  private readonly pcS = new THREE.Color();
  /** per-lantern glow while the lanterns differ in colour (x BULB_GAIN; 0 = off) and its size (m) */
  pillarGlowK = PILLAR_GLOW_K;
  pillarGlowSize = PILLAR_GLOW_SIZE;

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
    this.floodAisle.setRGB(0, 0, 0);
    this.floodFront.setRGB(0, 0, 0);
    for (let i = 0; i < this.floods.length; i++) {
      const c = this.floods[i];
      let e = floodEnv(c, t, rf);
      // (calm: the kick pumps the flood by 15 %, not 50 %)
      if (c.kick) e *= rf ? 0.85 + 0.15 * beat.kick : 0.5 + 0.5 * beat.kick;
      // round 11: `gate` on the beat grid (the LED gate of v588.6–589.9 dims the lit haze with it)
      if (c.gate > 0) e *= floodGate(c, beat, rf);
      if (rf) e *= 0.6;
      if (e <= 1e-4) continue;
      const col = c.c1;
      // round 11: local ground pools (area `aisle` / `front`): light on the paving only, no lit air
      if (c.area & AREA_AISLE) {
        this.floodAisle.r += col.r * e;
        this.floodAisle.g += col.g * e;
        this.floodAisle.b += col.b * e;
      }
      if (c.area & AREA_FRONT) {
        this.floodFront.r += col.r * e;
        this.floodFront.g += col.g * e;
        this.floodFront.b += col.b * e;
      }
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
    const pal = this.app.palette;
    // a set wash with `fieldShare` also floods the field (the air over it and the paving in front of the stage)
    // at share x its level, in its colour, following its cross-fades: a field flood without an extra cue
    {
      const bl = (this.rf ? this.idx.calmWash : this.idx.wash).resolve(t, this.washBlend);
      for (let pass = 0; pass < 2; pass++) {
        const c = pass === 0 ? bl.to : bl.from;
        const w = pass === 0 ? bl.k : 1 - bl.k;
        if (!c || w <= 0 || c.fieldShare <= 0) continue;
        resolveColor(c.color ?? 'primary', pal, c.c1, 'primary');
        const e = c.intensity * c.fieldShare * w;
        this.floodField.r += c.c1.r * e;
        this.floodField.g += c.c1.g * e;
        this.floodField.b += c.c1.b * e;
        o.field += e;
      }
    }
    // zone washes on the side sections (a wash with target sides / side_front …): a local glow there
    for (let s = 0; s < 2; s++) {
      const bl = (this.rf ? this.idx.calmWashSides : this.idx.washSides)[s].resolve(t, this.washSideBlend[s]);
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
    const fk = (rf ? 0.4 : 1) * this.floodFlashK;
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
    // local pools: a low, local flash (the lantern plinths and the crowd there catch it; the far field stays dark)
    for (let s = 0; s < 2; s++) {
      const src = s === 0 ? this.floodAisle : this.floodFront;
      const l = lum(src);
      if (l <= 1e-4) continue;
      normalizeColor(src, this.cF);
      if (s === 0) this.flashPos.set(0, 3, 80);
      else this.flashPos.set(0, 3, 10);
      env.addFlash(this.cF, Math.min(2, l * this.poolFlashK) * fk, this.flashPos);
    }
    return o;
  }

  /** flood / zone / backlight / booth / storm-scatter haze glow (depth-sliced volume) */
  private writeFloodGlow(env: App['env'], haze: number, rigOut: number, strobe: number, t: number): void {
    const cols = this.flood.cols;
    for (let i = 0; i < FLOOD_BLOBS; i++) cols[i].set(0, 0, 0);
    // flooded air glows in proportion to how much haze / smoke it holds
    const hk = 0.35 + 0.9 * haze;
    const add = this.addGlow;
    const fg = hk * this.floodGlowK;
    // the lit air glows in the flood's own saturated hue (see glowSaturate)
    const fs = glowSaturate(this.floodStage, this.floodGlowSat, this.floodSatGain, this.cGS);
    const ff = glowSaturate(this.floodField, this.floodGlowSat, this.floodSatGain, this.cGF);
    const hi = this.floodHighK;
    add(FB_STAGE, fs, FLOOD_K_STAGE * fg);
    add(FB_STAGE_HIGH, fs, FLOOD_K_STAGE * fg * hi);
    add(FB_FIELD, ff, FLOOD_K_FIELD * fg);
    add(FB_FIELD_FAR, ff, FLOOD_K_FIELD * fg);
    // a field flood also lifts the air over the stage a little (one continuous cloud)
    add(FB_STAGE, ff, FLOOD_K_STAGE * fg * 0.35);
    // (the flood share of the stage air, for the deck close-up weighting at draw time)
    {
      const k0 = FLOOD_K_STAGE * fg;
      this.stageFl[0].set((fs.r + ff.r * 0.35) * k0, (fs.g + ff.g * 0.35) * k0, (fs.b + ff.b * 0.35) * k0);
      this.stageFl[1].set(fs.r * k0 * hi, fs.g * k0 * hi, fs.b * k0 * hi);
    }
    add(FB_SIDE_L, glowSaturate(this.floodSideL, this.floodGlowSat, this.floodSatGain, this.cGX), FLOOD_K_SIDES * hk);
    add(FB_SIDE_R, glowSaturate(this.floodSideR, this.floodGlowSat, this.floodSatGain, this.cGX), FLOOD_K_SIDES * hk);
    // backlights and the booth spot glow in the haze around them (hue x the brightest lamp's level)
    if (this.backLevel > 0) {
      // lamps aimed at the viewer through haze: strong forward scatter, a milky veil in the lamp colour
      // (a white lamp reads cool blue-white in the haze, v409.5 / v411.5)
      const c = normalizeColor(this.backCol, this.cF);
      const white = Math.min(c.r, c.g, c.b);
      c.lerp(this.backCool, white * white);
      const k = BACK_GLOW_K * this.backGlowK * hk * this.backLevel;
      this.backBase.set(c.r * k, c.g * k, c.b * k);
    } else this.backBase.set(0, 0, 0);
    {
      const f = backFacing(this.app.camera);
      const b = this.backBase;
      cols[FB_BACK].set(b.x * f, b.y * f, b.z * f);
      cols[FB_BACK_WIDE].set(b.x * f, b.y * f, b.z * f);
    }
    if (this.boothLevel > 0) add(FB_BOOTH, normalizeColor(this.boothCol, this.cF), LOCAL_GLOW_K * hk * this.boothLevel * 0.8);
    // round 11: the lens veil of heads aimed at the camera (look `flare`), centred on the camera
    {
      const v = this.lensVeil;
      if (v.r + v.g + v.b > 1e-4) {
        add(FB_LENS, v, this.flareK);
        this.placeLensVeil(this.app.camera);
      }
    }
    // the low fog bank lit by the beams that pass through it (round 8): a flat glowing layer over the lit part of
    // the bank, in the beams' colour x the smoke's albedo (v802.75: white floor beams -> a bright white band)
    {
      const a = this.lowAcc;
      if (a.x > 1e-5) {
        const mx = a.y / a.x;
        const mz = a.z / a.x;
        const sx = Math.sqrt(Math.max(0, a.w / a.x - mx * mx));
        const sz = Math.sqrt(Math.max(0, this.lowPos.x / a.x - mz * mz));
        const c = (this.flood.material.uniforms.uBlobC.value as THREE.Vector4[])[FB_LOWFOG];
        const sg = (this.flood.material.uniforms.uBlobS.value as THREE.Vector3[])[FB_LOWFOG];
        c.set(mx, 1.1 + 1.5 * (1 - smoothstep(-2, 2, mz)), mz, 1);
        sg.set(Math.min(50, sx + 14), 1.3, Math.min(40, sz + 9));
        const tint = this.shared.uLowFogTint.value;
        const kd = 1 / Math.max(0.3, this.density);
        const k = this.lowFogGlowK * kd;
        cols[FB_LOWFOG].set(this.lowCol.r * tint.r * k, this.lowCol.g * tint.g * k, this.lowCol.b * tint.b * k);
        // (published for the smoke puffs of the bank: LightEnv.lowFogLight)
        env.lowFogLight.setRGB(this.lowCol.r * tint.r * kd * LOWFOG_ENV_K, this.lowCol.g * tint.g * kd * LOWFOG_ENV_K, this.lowCol.b * tint.b * kd * LOWFOG_ENV_K);
        env.lowFogPos.set(c.x, c.y, c.z);
        env.lowFogSpread.set(sx, sz);
      }
    }
    // deck air: the smoke machines' fog over the deck (fog.lowfog on the deck) holds the wash and the rig's
    // light around the performers (deck close-ups)
    {
      const smoke = this.deckSmoke(t);
      this.deckBase.set(0, 0, 0);
      if (smoke > 0.001) {
        const washI = env.stageWashIntensity / (1 + 0.45 * env.stageWashIntensity);
        const rig = Math.min(1.2, rigOut * 2.2) * this.deckRigK;
        const wc = env.stageWashColor;
        const sc = env.stageColor;
        const ft = this.deckFogTint;
        const k = this.deckHazeK * smoke;
        this.deckBase.set((wc.r * washI + sc.r * rig) * ft.r * k, (wc.g * washI + sc.g * rig) * ft.g * k, (wc.b * washI + sc.b * rig) * ft.b * k);
      }
      const cu = deckCloseUp(this.app.camera);
      cols[FB_DECK].set(this.deckBase.x * cu, this.deckBase.y * cu, this.deckBase.z * cu);
    }
    // the arch downlights light the smoke in and in front of the portal (their cones are faint, see ARCH_BEAM_K)
    if (this.archLevel > 0 && this.archGlowK > 0) add(FB_BOOTH, this.app.env.archSpotColor, this.archGlowK * hk * this.archLevel);
    // storm haze: in very dense haze / smoke the whole rig + wash light scatters into a lit cloud
    // (round 11: a `lights.storm` cue sets the cloud's level directly, up to 1.5, whatever the fog level)
    const sc = Math.max(smooth01((haze - SCATTER_H0) / (SCATTER_H1 - SCATTER_H0)), this.storm);
    this.scatter = sc;
    if (sc > 0) {
      const washI = Math.min(1.5, env.stageWashIntensity);
      const rig = Math.min(1, rigOut * 2.2) + strobe * 0.6;
      // multiple scattering saturates the cloud's light (see SCATTER_SAT)
      const wash = saturateColor(env.stageWashColor, SCATTER_SAT, this.cSW);
      const rigC = saturateColor(env.stageColor, SCATTER_SAT, this.cSR);
      if (this.stormTint > 0) {
        // a storm cue with its own `color`: the cloud leans to it (the ice-white storm of v1230.7–1249)
        wash.lerp(this.stormCol, this.stormTint);
        rigC.lerp(this.stormCol, this.stormTint);
      }
      const g = sc * SCATTER_GAIN * this.scatterK;
      const kw = FLOOD_K_STAGE * g * 0.42 * washI;
      add(FB_STAGE, wash, kw);
      add(FB_STAGE_HIGH, wash, kw * 0.8);
      const kr = FLOOD_K_STAGE * g * 0.5 * rig;
      add(FB_STAGE, rigC, kr);
      add(FB_STAGE_HIGH, rigC, kr * 0.9);
      add(FB_FIELD, rigC, FLOOD_K_FIELD * g * 0.5 * (rig + washI * 0.4));
      add(FB_FIELD, wash, FLOOD_K_FIELD * g * 0.35 * washI);
    }
  }
  private scatter = 0;
  /**
   * round 11: centre the lens-veil blob (FB_LENS) FLARE_OFF m from the camera towards the flaring lamps: the veil is
   * densest on the lamp's side of the frame (the white glare from the upper left at v673.3), not a flat lift
   */
  private placeLensVeil(camera: THREE.Camera): void {
    const lc = (this.flood.material.uniforms.uBlobC.value as THREE.Vector4[])[FB_LENS];
    const cm = camera.matrixWorld.elements;
    const d = this.lensDir;
    const n = Math.hypot(d.x, d.y, d.z);
    const k = n > 1e-6 ? FLARE_OFF / n : 0;
    lc.set(cm[12] + d.x * k, cm[13] + d.y * k, cm[14] + d.z * k, 1);
  }
  /** storm haze boost of this frame (`lights.storm`, round 11) and its colour (stormTint 0 = none) */
  private storm = 0;
  private stormTint = 0;
  private readonly stormCol = new THREE.Color();
  private readonly stormArr: LightCue[] = [];
  /** share a coloured storm cue pulls the cloud's colour towards its own */
  stormTintK = 0.7;

  /**
   * `lights.storm` (round 11): the storm scatter (the lit cloud of the rig + wash light, see SCATTER_SAT) at the
   * cue's level (intensity 0..1.5) with attack / fade, independent of `fog.level`: v1230.7–1249 hundreds of beams
   * in a near-white cloud that hides the set. Pure function of t.
   */
  private evalStorm(t: number): number {
    const a = this.idx.storms.alive(t, this.stormArr);
    let best = 0;
    let tint = 0;
    for (let i = 0; i < a.length; i++) {
      const c = a[i];
      const e = Math.min(1.5, floodEnv(c, t, false));
      if (e > best) {
        best = e;
        if (c.color) {
          resolveColor(c.color, this.app.palette, this.stormCol, 'accent');
          normalizeColor(this.stormCol, this.stormCol);
          tint = this.stormTintK;
        } else tint = 0;
      }
    }
    this.stormTint = best > 0 ? tint : 0;
    return best;
  }
  /** deck-air glow colour before the close-up weight (FB_DECK) */
  private readonly deckBase = new THREE.Vector3();
  /** stage air (FB_STAGE, FB_STAGE_HIGH) of this frame, and the flood cues' share of it (close-up weighting) */
  private readonly stageAll = [new THREE.Vector3(), new THREE.Vector3()];
  private readonly stageFl = [new THREE.Vector3(), new THREE.Vector3()];
  /** share of the stage flood's lit air a deck close-up loses (side-by-side calibration) */
  closeFloodK = CLOSE_FLOOD_K;
  /** backlight veil colour before the facing weight (FB_BACK, FB_BACK_WIDE) */
  private readonly backBase = new THREE.Vector3();
  /** albedo of the deck fog (its cue colour, max channel 1) and scratch for the active fog cues */
  private readonly deckFogTint = new THREE.Color(1, 1, 1);
  private readonly fogBuf: Cue[] = [];

  /**
   * 0..~1.5: smoke-machine fog lying on the deck at show time t (`fog.lowfog` with area deck / all: its
   * density, in over 2.5 s, lingering 8 s after the cue). Also sets deckFogTint. Pure function of t.
   */
  private deckSmoke(t: number): number {
    const cues = this.app.show.active('fog', t, this.fogBuf);
    let best = 0;
    for (let i = 0; i < cues.length; i++) {
      const c = cues[i];
      if (c.fx !== 'lowfog') continue;
      const area = typeof c.p.area === 'string' ? c.p.area : 'deck';
      if (area !== 'deck' && area !== 'all') continue;
      const dens = typeof c.p.density === 'number' && Number.isFinite(c.p.density) ? Math.min(1.5, Math.max(0, c.p.density)) : 0.8;
      const a = Math.min(1, Math.max(0, (t - c.t) / 2.5));
      const b = Math.min(1, Math.max(0, 1 - (t - c.t - c.dur) / 8));
      const v = dens * a * a * (3 - 2 * a) * b;
      if (v > best) {
        best = v;
        resolveColor(typeof c.p.color === 'string' ? c.p.color : 'white', this.app.palette, this.deckFogTint, 'primary');
      }
    }
    if (best > 0) normalizeColor(this.deckFogTint, this.deckFogTint);
    return best;
  }
  /**
   * Round 8: the low fog as the beams see it (SharedUniforms.uLowFog): per zone (deck, near field, far field) the
   * densest `fog.lowfog` lying there at show time t, with FogSystem.lowfog's regions and shares (area `deck`: the
   * deck + 55 % spill onto the near field; `field`: the near field + 65 % over the far field; `all`: every zone),
   * in over 2.5 s, lingering 10 s after the cue while the bank flows out and settles. Pure function of t.
   */
  private writeLowFog(t: number): void {
    const u = this.shared.uLowFog.value;
    u.set(0, 0, 0, 0);
    if (this.lowFogBeamK <= 0 && this.lowFogGlowK <= 0) return;
    const cues = this.app.show.active('fog', t, this.fogBuf);
    let best = 0;
    for (let i = 0; i < cues.length; i++) {
      const c = cues[i];
      if (c.fx !== 'lowfog') continue;
      const area = typeof c.p.area === 'string' ? c.p.area : 'deck';
      const dens = typeof c.p.density === 'number' && Number.isFinite(c.p.density) ? Math.min(1.5, Math.max(0, c.p.density)) : 0.8;
      const a = Math.min(1, Math.max(0, (t - c.t) / 2.5));
      const b = Math.min(1, Math.max(0, 1 - (t - c.t - c.dur) / 10));
      const v = dens * a * a * (3 - 2 * a) * b;
      if (v <= 0.001) continue;
      const deck = area === 'deck' || area === 'all' ? v : 0;
      const near = area === 'deck' ? (c.p.spill === false ? 0 : v * 0.55) : v;
      const far = area === 'field' || area === 'all' ? v * 0.65 : 0;
      u.x = Math.max(u.x, deck);
      u.y = Math.max(u.y, near);
      u.z = Math.max(u.z, far);
      if (v > best) {
        best = v;
        resolveColor(typeof c.p.color === 'string' ? c.p.color : 'white', this.app.palette, this.shared.uLowFogTint.value, 'primary');
      }
    }
    if (best > 0) {
      // albedo: the cue colour (max 1) leaned to white — the smoke is white, its colour is mostly the light it
      // holds, so a white beam through a blue bank stays a (slightly blue) white
      const tint = normalizeColor(this.shared.uLowFogTint.value, this.shared.uLowFogTint.value);
      tint.lerp(this.cT.setRGB(1, 1, 1), LOWFOG_WHITE);
      u.w = Math.max(0, this.lowFogBeamK);
    }
  }
  /** in-scatter gain of a beam in the low fog per unit fog density (side-by-side calibration; 0 = off) */
  lowFogBeamK = LOWFOG_BEAM_K;
  /** glow of the bank lit by the beams (FB_LOWFOG) per unit of deposited beam light (calibration; 0 = off) */
  lowFogGlowK = LOWFOG_GLOW_K;
  /** this frame's beam light deposited in the low fog: Σ w, Σ w·x, Σ w·z, Σ w·x² (lowAcc) / Σ w·z² (lowPos.x) */
  private readonly lowAcc = new THREE.Vector4();
  private readonly lowPos = new THREE.Vector4();
  private readonly lowCol = new THREE.Color();

  /** low fog density (zones of uLowFog, as lowFogAt in the beam shader, without the height fall-off) at x, z */
  private lowFogDensity(x: number, z: number): number {
    const u = this.shared.uLowFog.value;
    const zDeck = smoothstep(-21, -16, z) * (1 - smoothstep(-1.5, 1.5, z));
    const zNear = smoothstep(-1.5, 1.5, z) * (1 - smoothstep(40, 60, z));
    const zFar = smoothstep(28, 52, z) * (1 - smoothstep(140, 170, z));
    const w = 1 - smoothstep(36, 50, Math.abs(x));
    return (u.x * zDeck + Math.max(u.y * zNear, u.z * zFar)) * w;
  }

  /**
   * A lit beam (lens l, unit direction d, length len, colour x dimmer rgb) deposits light in the low fog along the
   * part of its path below the bank's top (3.2 m over the deck, 2.2 m over the field): weight = fog density
   * (mean of 3 samples) x path length in the bank (saturating at 24 m). Accumulates colour, centroid and spread.
   */
  private depositLowFog(lx: number, ly: number, lz: number, dx: number, dy: number, dz: number, len: number, r: number, g: number, b: number): void {
    const top = lz < 0 ? 3.2 : 2.2;
    let t0 = 0;
    let t1 = len;
    if (dy < -1e-4) t0 = ly > top ? (ly - top) / -dy : 0;
    else if (ly >= top) return;
    else if (dy > 1e-4) t1 = Math.min(len, (top - ly) / dy);
    // (a beam skimming the bank horizontally lights it only over the first stretch: cap the path)
    t1 = Math.min(t1, t0 + 60);
    const seg = t1 - t0;
    if (seg <= 0.05) return;
    let wsum = 0;
    let wx = 0;
    let wz = 0;
    for (let k = 0; k < 3; k++) {
      const tt = t0 + seg * (0.17 + 0.33 * k);
      const x = lx + dx * tt;
      const z = lz + dz * tt;
      const w = this.lowFogDensity(x, z);
      wsum += w;
      wx += w * x;
      wz += w * z;
    }
    if (wsum <= 1e-4) return;
    const w = (wsum / 3) * Math.min(1, seg / 24) * ((r + g + b) * 0.333);
    const cx = wx / wsum;
    const cz = wz / wsum;
    const a = this.lowAcc;
    a.x += w;
    a.y += w * cx;
    a.z += w * cz;
    a.w += w * cx * cx;
    this.lowPos.x += w * cz * cz;
    const m = (wsum / 3) * Math.min(1, seg / 24);
    this.lowCol.r += r * m;
    this.lowCol.g += g * m;
    this.lowCol.b += b * m;
  }

  /**
   * Round 9: the flooded air glows in the flood's saturated hue (0 = the cue colour as is, 1 = its white part
   * removed, see glowSaturate). The violet flood at v509.25 reads deep violet round the castle base in the film
   * (72/10/178 in our probe region), ours was lavender (69/32/144 -> 65/24/142): the glow carried the cue colour's
   * small green share, which the dark air turns into a grey veil after the sRGB encode. Flood moments: 509.25
   * +3.0, 289.25 +1.9, 338 +1.8, 558.25 +1.2, 1511.75 +0.5, 1194 −0.6, 1047.25 −2.4 (there the film's air is amber
   * smoke, not the violet flood of the cue). Make-up gain 1.3 / 1.6: 509.25 the same, 1047.25 −5.4 / −6.6.
   */
  floodGlowSat = FLOOD_GLOW_SAT;
  /** luminance make-up cap of the saturated glow (1 = none) */
  floodSatGain = FLOOD_SAT_GAIN;
  /** share of the stage flood in the upper air blob (FB_STAGE_HIGH) */
  floodHighK = 1;
  private readonly cGS = new THREE.Color();
  private readonly cGF = new THREE.Color();
  private readonly cGX = new THREE.Color();

  /** flood tuning: share of the flood light on the set (wash) and in the world flash bus */
  floodSetK = 1;
  floodFlashK = 1;
  floodGlowK = 1;
  /** storm-scatter gain multiplier (side-by-side calibration) */
  scatterK = 1;
  /** deck-air glow gain (side-by-side calibration) and the rig's share in it */
  deckHazeK = DECK_HAZE_K;
  deckRigK = DECK_RIG_K;
  /** set haze glow (WashGlow): wash part and floor-spill part multipliers (side-by-side calibration) */
  washGlowK = 1;
  floorGlowK = 1;
  /** arch-crown downlights: cone share, lens-disc gain and haze glow (side-by-side calibration) */
  archBeamK = ARCH_BEAM_K;
  archCanK = CAN_GAIN;
  archGlowK = ARCH_GLOW_K;
  /**
   * audience blinders: share of their colour splashed onto the set wash, and of their light-bus flash. Round 8:
   * 0.5 / 1 -> 0 / 0.5. Blinders face the audience: they light the haze, the field and the crowd, never the facade
   * behind them (a warm blinder row lit the castle grey-beige, facade ~RGB 50/41/50 with every stage key off). The
   * flash still reaches the set through its share of the light bus (STAGE_FLASH_SHARE), hence the half flash.
   * Blinder moments (16, mean): 48.4 -> 48.3 % with both 0 (1224.5 +5.3, 1189.25 +4.2, 1283–1285.75 −2…−2.6).
   */
  blindSetK = 0;
  blindFlashK = 0.5;
  /**
   * lantern pillars: multiplier on the shaft uplight level written to app.env. Round 8: 1 -> 0.5. The film's
   * pillars read as dark shafts under a lit crystal (v509.25, v1046.75: seen from the front the shaft is the dark
   * delay array; v20.25 / v338: the uplight glows only at the foot); a cue's shaftIntensity 0.9 lit ours red over
   * the whole height. The edge strips stay near their soft limit, the painted shaft's graze halves. 64 moments:
   * 67.1 / 50.2 % unchanged, shape 54.8 -> 55.0 (974 +1.0, 240.25 +0.8, 191.5 +0.6, 753.75 −0.8).
   */
  shaftK = 0.5;

  /**
   * flood colours = this frame's floods + the laser light held by the smoke (LaserSystem.airLight, read
   * after all systems ran; idempotent, so a frame hook that runs twice adds it once)
   */
  private applyLaserAir(): void {
    if (!this.flood || !this.app.isSystemEnabled('lights')) return;
    const cols = this.flood.cols;
    for (let i = 0; i < FLOOD_BLOBS; i++) cols[i].copy(this.floodBase[i]);
    if (this.laserSys === undefined) this.laserSys = (this.app.get('lasers') as unknown as { airLight?: unknown } | undefined) ?? null;
    const la = this.laserSys && this.app.isSystemEnabled('lasers') ? this.laserSys.airLight : null;
    if (la instanceof THREE.Color && la.r + la.g + la.b > 1e-4) {
      // (saturated like the storm scatter: the video's lit smoke is a deep pure blue, not periwinkle)
      const c = saturateColor(la, this.laserAirSat, this.cSL);
      const k = this.laserAirK;
      this.addGlow(FB_FIELD, c, k);
      this.addGlow(FB_FIELD_FAR, c, k * 1.2);
      this.addGlow(FB_STAGE, c, k * 0.5);
      this.addGlow(FB_STAGE_HIGH, c, k * 0.8);
    }
    this.stageAll[0].copy(cols[FB_STAGE]);
    this.stageAll[1].copy(cols[FB_STAGE_HIGH]);
    this.flood.update();
  }

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
    const tracks = this.rf ? this.idx.calmFestoon : this.idx.festoon;
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
        const e = c.intensity * w * festoonMult(c, b, t, beat, this.rf);
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
  /** App.reduceFlashing as read at the start of this frame's fixture pass */
  private rf = false;

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
      storm: Number(this.storm.toFixed(2)),
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
  return chaseLit(c.pattern, step, u, cluster) ? Math.exp(-ph * 3.4) : 0;
}

/**
 * Photosensitivity option: a chase steps at most once per beat (calmChaseStep) on the calm budget, each step
 * swells in over CALM_RISE and decays slowly, and it swings between a floor and a shallow peak (0.25 -> 0.6)
 * instead of dark -> full. A step the budget drops holds the previous kept step (no new onset).
 */
function chaseEnvCalm(c: LightCue, u: number, cluster: number, t: number, calm: CalmBudget): number {
  const step = calmChaseStep(c);
  const tt = t - c.t0;
  if (tt < 0) return 0;
  const k = Math.floor(tt / step);
  let kk = k;
  while (kk >= 0 && k - kk < 4 && !calm.ok(c.t0 + kk * step)) kk--;
  if (kk < 0 || k - kk >= 4) return CALM_CHASE_FLOOR;
  const since = tt - kk * step;
  if (!chaseLit(c.pattern, kk, u, cluster)) return CALM_CHASE_FLOOR;
  return CALM_CHASE_FLOOR + CALM_CHASE_SWING * smooth01(since / CALM_RISE) * Math.exp((-since / step) * 1.2);
}

/** is the fixture at rig position u lit on chase step `step` */
function chaseLit(pattern: string, step: number, u: number, cluster: number): boolean {
  switch (pattern) {
    case 'rl': {
      const N = 8;
      const pos = 1 - (2 * ((step % N) + 0.5)) / N;
      return Math.abs(u - pos) < 1 / N;
    }
    case 'center_out': {
      const N = 5;
      const pos = ((step % N) + 0.5) / N;
      return Math.abs(Math.abs(u) * 1.6 - pos) < 0.5 / N;
    }
    case 'out_center': {
      const N = 5;
      const pos = 1 - ((step % N) + 0.5) / N;
      return Math.abs(Math.abs(u) * 1.6 - pos) < 0.5 / N;
    }
    case 'random':
      return vnoise(step * 1.0, cluster * 131 + 7) > 0.35;
    default: {
      const N = 8;
      const pos = -1 + (2 * ((step % N) + 0.5)) / N;
      return Math.abs(u - pos) < 1 / N;
    }
  }
}

/** strobe flash envelope 0..1 (`calm`: the shared reduce-flashing budget, consulted only when rf) */
function strobeEnv(c: LightCue, t: number, beat: BeatInfo, rf: boolean, calm: CalmBudget): number {
  const tt = t - c.t0;
  if (tt < 0) return 0;
  switch (c.cue.fx) {
    case 'burst': {
      if (rf) {
        // photosensitivity option: at most CALM_BURST_HZ pulses, and only the ones the shared budget keeps
        const period = calmBurstPeriod(c);
        const k = Math.floor(Math.min(tt, Math.max(0, c.dur - 1e-3)) / period);
        if (!calm.ok(c.t0 + k * period)) return 0;
        const local = tt - k * period;
        return local < 0 ? 0 : Math.exp(-local / 0.022);
      }
      const period = 1 / c.rate;
      const last = Math.floor(Math.min(tt, Math.max(0, c.dur - 1e-3)) / period) * period;
      const local = tt - last;
      return local < 0 ? 0 : Math.exp(-local / 0.022);
    }
    case 'kick': {
      const since = (beat.phase * 60) / Math.max(40, beat.bpm);
      const start = t - since;
      if (start < c.t0 - 0.03 || start > c.t0 + c.dur) return 0;
      // photosensitivity option: every second kick only (<= 3 Hz at hardstyle tempo), on the shared budget,
      // softer decay
      if (rf && (Math.floor(beat.beat) & 1 || !calm.ok(start))) return 0;
      return Math.exp(-since / (rf ? 0.09 : 0.035));
    }
    default:
      if (rf && !calm.ok(c.t0)) return 0;
      return Math.exp(-tt / 0.04);
  }
}

/** per-pillar lamp multiplier for a pillar mode */
function pillarMult(c: LightCue, mode: number, i: number, row: number, rows: number, t: number, beat: BeatInfo, rf: boolean): number {
  switch (mode) {
    case PM_FLICKER: {
      const v = 0.74 + 0.2 * vnoise(t * 6.5 + i * 3.1, i + 77) + 0.1 * vnoise(t * 17 + i * 1.7, i + 191);
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }
    case PM_CHASE: {
      // one row per `every` step (default a beat)
      const beats = ((t - c.t0) * c.bpm) / 60 / (c.everySet ? Math.max(0.25, c.every) : 1);
      const R = Math.max(1, rows);
      const head = (beats % R) + 0.0;
      let d = head - row;
      if (d < -0.35) d += R;
      return 0.1 + 0.9 * Math.exp(-Math.max(0, d) * 2.4) * Math.min(1, (d + 0.35) / 0.35);
    }
    case PM_PULSE: {
      const since = (beat.phase * 60) / Math.max(40, beat.bpm);
      // (reduce flashing: a shallow breath on the beat instead of a 75 % pulse)
      return rf ? 0.75 + 0.25 * Math.exp(-since * 4) : 0.25 + 0.75 * Math.exp(-since * 6);
    }
    case PM_STROBE: {
      // round 11: a flash on every `every` step of the beat grid (default a half beat; v1223.5–1226, v1267.9–1269.2).
      // Reduce flashing: never faster than CALM_GAP, and a shallow swell instead of dark -> full
      let step = c.everySet ? Math.max(0.25, c.every) : 0.5;
      const spb = 60 / Math.max(40, beat.bpm);
      if (rf) while (step * spb < CALM_GAP && step < 16) step *= 2;
      const ph = beat.beat / step;
      const since = (ph - Math.floor(ph)) * step * spb;
      return rf ? 0.7 + 0.3 * Math.exp(-since * 4) : 0.06 + 0.94 * Math.exp(-since / 0.07);
    }
    case PM_OFF:
      return 0;
    default:
      return 1;
  }
}

/**
 * flood `gate` (round 11): lit for `duty` of every gate step on the beat grid (quarter / half beat / beat / 2 beats /
 * bar), from `offset` (share of the step) on, 20–30 ms edges. Reduce flashing: a shallow 25 % swing, not on / off.
 */
function floodGate(c: LightCue, beat: BeatInfo, rf: boolean): number {
  const spb = 60 / Math.max(40, beat.bpm);
  const stepS = c.gate * spb;
  const ph = beat.beat / c.gate - c.gateOffset;
  const x = (ph - Math.floor(ph)) * stepS;
  const g = smooth01(x / 0.02) * (1 - smooth01((x - c.duty * stepS) / 0.03));
  return rf ? 0.75 + 0.25 * g : g;
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
function festoonMult(c: LightCue, b: Bulb, t: number, beat: BeatInfo, rf: boolean): number {
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
      return rf ? 0.75 + 0.25 * Math.exp(-since * 4) : 0.3 + 0.7 * Math.exp(-since * 6);
    }
    default:
      return 1;
  }
}

function smooth01(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

/** GLSL smoothstep */
function smoothstep(e0: number, e1: number, x: number): number {
  return smooth01((x - e0) / (e1 - e0));
}

function lum(c: THREE.Color): number {
  return (c.r + c.g + c.b) * 0.3333;
}

/** out = max · (c / max)^p per channel: saturates towards the dominant channel, keeps the peak */
function saturateColor(c: THREE.Color, p: number, out: THREE.Color): THREE.Color {
  const m = Math.max(c.r, c.g, c.b);
  if (m <= 1e-6) return out.setRGB(0, 0, 0);
  return out.setRGB(m * Math.pow(Math.max(0, c.r) / m, p), m * Math.pow(Math.max(0, c.g) / m, p), m * Math.pow(Math.max(0, c.b) / m, p));
}

/**
 * Saturate a glow colour: remove `k` x its white part (the smallest channel), then make up the Rec.709 luminance
 * by at most `gain` (1 = no make-up). Keeps the hue (HSV); only colours that are already saturated (chroma >=
 * ~0.8) change, so a white or pastel flood (#A8D4FF at v411.5) stays as it is.
 */
function glowSaturate(c: THREE.Color, k: number, gain: number, out: THREE.Color): THREE.Color {
  const m = Math.max(c.r, c.g, c.b);
  if (k <= 0 || m <= 1e-6) return out.copy(c);
  const lo = Math.min(c.r, c.g, c.b);
  const chroma = 1 - lo / m;
  const s = k * smoothstep(0.75, 0.9, chroma) * lo;
  if (s <= 0) return out.copy(c);
  const l0 = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  out.setRGB(c.r - s, c.g - s, c.b - s);
  const l1 = 0.2126 * out.r + 0.7152 * out.g + 0.0722 * out.b;
  return out.multiplyScalar(l1 > 1e-6 ? Math.min(gain, l0 / l1) : 1);
}

/** out = c / max(c) (the hue at full value), black stays black */
/**
 * 0..1: how far a camera is inside the deck air (full on the deck / in the pit, 0 from 12 m out) AND looks
 * at the set: the wash lights the smoke between the deck lip and the castle, seen against the lit set; a
 * camera in the portal looking out over the dark field (v658–666) sees that smoke from behind, dark.
 */
function deckCloseUp(cam: THREE.Camera): number {
  const e = cam.matrixWorld.elements;
  const ex = Math.max(0, Math.abs(e[12]) - 30);
  const ez = Math.max(0, e[14] - 8, -12 - e[14]);
  const ey = Math.max(0, e[13] - 9);
  const d = Math.sqrt(ex * ex + ey * ey + ez * ez);
  let k = 1 - Math.min(1, Math.max(0, (d - 1) / 11));
  k = k * k * (3 - 2 * k);
  // view direction = -Z column of the camera matrix: towards the set (-z) = 1, out over the field = 0
  const toSet = Math.min(1, Math.max(0, (e[10] + 0.2) / 0.7));
  return k * toSet * toSet * (3 - 2 * toSet);
}

/**
 * 0..1: the backlight arc's haze veil is forward scatter of lamps aimed at the audience (+z): a camera in
 * front of the portal looking into it sees it in full; one beside / behind the lamps (the DJ at the booth,
 * looking out) or looking away sees only a trace.
 */
function backFacing(cam: THREE.Camera): number {
  const e = cam.matrixWorld.elements;
  const front = Math.min(1, Math.max(0, (e[14] - BACKLIGHT_Z) / 1.5));
  const look = Math.min(1, Math.max(0, (e[10] + 0.1) / 0.6));
  return 0.1 + 0.9 * front * look * look * (3 - 2 * look);
}

function normalizeColor(c: THREE.Color, out: THREE.Color): THREE.Color {
  const m = Math.max(c.r, c.g, c.b);
  if (m <= 1e-6) return out.setRGB(0, 0, 0);
  return out.setRGB(c.r / m, c.g / m, c.b / m);
}
