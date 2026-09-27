import * as THREE from 'three';
import type { FrameContext, QualitySettings } from '../core/types';
import type { StageLookEx } from './StageLook';
import { buildBody } from './dragon/body';
import { buildHead } from './dragon/head';
import { createKit, type PartBuckets } from './dragon/kit';
import { HEAD, headMatrix, headRigMatrix, wingLayout } from './dragon/layout';
import {
  createBulbMaterial,
  createEnvMap,
  createGarlandMaterial,
  GARLAND,
  GARLAND_BULB,
  Garlands,
  createRosetteGlowMaterial,
  ROSETTE_R,
  createStripMaterial,
  createUniforms,
  patchStandard,
  type CrownUniforms,
} from './dragon/shading';
import { flameTexture, lavaTextures, panelTextures, scaleTextures, steelTextures, type PbrSet } from './dragon/textures';
import { buildWings, rosetteGear, WING_FX } from './dragon/wings';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texMean } from './materials/texMean';

/** World positions the crown exposes (registered as anchors by MainStageSystem). */
export interface CrownAnchors {
  dragonMouth: THREE.Vector3;
  dragonEyes: [THREE.Vector3, THREE.Vector3];
  dragonHead: THREE.Vector3;
  wingTips: THREE.Vector3[];
  wingLeft: THREE.Vector3[];
  wingRight: THREE.Vector3[];
  /** top points of spikes/pinnacles usable for gerbs/comets */
  roof: THREE.Vector3[];
  /** moving heads modelled along the wings' leading edges (rows per membrane panel) */
  wingFixtures: THREE.Vector3[][];
  /** the dragon's shoulders (wing roots on the yoke): laser / fixture mounting points */
  shoulders: [THREE.Vector3, THREE.Vector3];
}

const yieldFrame = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * The "crown" of the 2026 MainStage: the mechanical dragon (head with crest frill and open fanged
 * jaws, neck, chest, forelegs gripping the castle parapet, the skeletal rider) and the two giant
 * mechanical bat wings with gear rosettes. Fully procedural (geometry + textures generated at load).
 *
 * Built in its own local space where x=0 is the stage centre line, y=0 the ground, z=0 the stage
 * front edge; MainStageSystem adds `group` to the stage root without transforming it.
 *
 * Rendering: ~20 draw calls. All static parts are merged per material in world space; the lower
 * jaw is a separate articulated rig; the 6 rosettes are instanced. Show state arrives as a
 * StageLook each frame and is pushed into ONE shared uniform block (pure function of the look ->
 * deterministic, seek-safe; no per-frame allocations).
 */
export class DragonCrown {
  readonly group = new THREE.Group();
  private U: CrownUniforms = createUniforms();
  private headRig = new THREE.Group();
  private jawPivot = new THREE.Group();
  private rosettes: THREE.InstancedMesh | null = null;
  private rosetteGlow: THREE.InstancedMesh | null = null;
  private rosetteFrames: THREE.Matrix4[] = [];
  private eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
  private materials: THREE.Material[] = [];
  private textures: THREE.Texture[] = [];
  private meshes: THREE.Mesh[] = [];
  private anchorData: CrownAnchors | null = null;
  private stat = { buildMs: 0, texMs: 0, headMs: 0, bodyWingMs: 0, mergeMs: 0, tris: 0, ledSegments: 0, bulbs: 0, texSize: 0, draws: 0, garlandBulbs: 0 };
  private tmpM = new THREE.Matrix4();
  private tmpR = new THREE.Matrix4();
  private tmpC = new THREE.Color();
  private tmpC2 = new THREE.Color();
  private level: QualitySettings['level'] = 'high';
  /** festoon bulb strings (wings here; the castle / side sections add theirs before finishGarlands) */
  readonly garlands = new Garlands();
  private garlandMesh: THREE.Mesh | null = null;

  /**
   * @param step optional loading-bar sub-step reporter (label, 0..1 within the crown build); it must
   * yield to the event loop like the default does
   */
  async build(q: QualitySettings, step: (label: string, f: number) => Promise<void> = () => yieldFrame()): Promise<void> {
    const t0 = performance.now();
    this.group.name = 'DragonCrown';
    this.level = q.level;
    const detail = q.level === 'ultra' ? 1 : q.level === 'high' ? 0.85 : q.level === 'medium' ? 0.6 : 0.38;
    const ts = Math.min(q.textureSize, 2048);
    const aniso = q.anisotropy;
    this.stat.texSize = ts;

    // ---------------------------------------------------------------- textures
    await step('dragon scale textures', 0);
    const scale = scaleTextures(Math.min(ts, 1024), aniso);
    await step('armour + steel textures', 0.2);
    const panel = panelTextures(Math.min(ts, 1024), aniso);
    const steel = steelTextures(Math.max(256, Math.min(ts / 2, 512)), aniso);
    await step('wing print textures', 0.35);
    const flame = flameTexture(Math.min(ts, 2048), Math.min(ts, 2048) / 2, aniso);
    const lava = lavaTextures(Math.max(256, Math.min(ts / 2, 512)), aniso);
    const env = createEnvMap();
    this.textures.push(...texList(scale), ...texList(panel), ...texList(steel), flame, lava.map, lava.emissiveMap, env);
    this.stat.texMs = Math.round(performance.now() - t0);
    await step('dragon head', 0.5);

    // ---------------------------------------------------------------- materials
    const U = this.U;
    const lite = q.level === 'mobile';
    const std = (key: string, p: THREE.MeshStandardMaterialParameters, set?: PbrSet, extra: Parameters<typeof patchStandard>[2] = { key }) => {
      const m = new THREE.MeshStandardMaterial({
        vertexColors: true,
        envMap: env,
        ...(set ? { map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap } : {}),
        ...p,
      });
      patchStandard(m, U, { ...extra, key, lite });
      this.materials.push(m);
      return m;
    };
    const mats = {
      // the scale hide is painted (round 7: 0.8 metal / 0.42 rough caught coloured floods only as a glint;
      // the footage floods the head in the look's colours, video 998.25 / 1047.25)
      shell: std('shell', { metalness: SHELL.metal, roughness: SHELL.rough, envMapIntensity: 1.5, side: THREE.DoubleSide, normalScale: new THREE.Vector2(1.3, 1.3) }, scale),
      armor: std('armor', { metalness: 0.82, roughness: 0.55, envMapIntensity: 1.2 }, panel, { key: 'armor' }),
      steel: std('steel', { metalness: 0.95, roughness: 0.7, envMapIntensity: 0.8 }, steel, { key: 'steel', plates: true }),
      copper: std('copper', { metalness: 0.7, roughness: 0.75, envMapIntensity: 0.9 }, steel),
      // leopard hide (daytime photos): ~2.5x the albedo of the old lava hide, scaled back in the show
      lava: std('lava', { map: lava.map, emissiveMap: lava.emissiveMap, emissive: 0x000000, normalMap: scale.normalMap, metalness: 0.2, roughness: 0.62, envMapIntensity: 0.6 }, undefined, { key: 'lava', lava: true, nightK: 0.74 }),
      ivory: std('ivory', { metalness: 0.0, roughness: 0.3, envMapIntensity: 0.5 }),
      flesh: std('flesh', { metalness: 0.0, roughness: 0.38, envMapIntensity: 0.4, side: THREE.DoubleSide }),
      rider: std('rider', { metalness: 0.7, roughness: 0.75, envMapIntensity: 0.9 }, panel),
    };
    const membraneMat = new THREE.MeshStandardMaterial({
      map: flame,
      metalness: 0.05,
      roughness: 0.72,
      side: THREE.DoubleSide,
      envMap: env,
      envMapIntensity: 0.35,
      vertexColors: true,
    });
    // the painted inferno of the daytime photos is ~1.9x brighter than the old print: its night
    // albedo and its self-lit level are normalised to the old means (texture statistics)
    patchStandard(membraneMat, U, { key: 'membrane', membrane: true, lite, nightK: 0.53, printGain: 0.75 });
    // the white spiky crown ring round each printed sun (daytime photos): painted white metal
    const rosetteMat = new THREE.MeshStandardMaterial({ color: '#e9ebef', metalness: 0.45, roughness: 0.4, envMap: env, envMapIntensity: 1.0 });
    // at night the ring is a grey silhouette round the lit sun (video 338 / 1047.25: gold sunbursts,
    // no white rims); the daytime view keeps the white paint
    patchStandard(rosetteMat, U, { key: 'rosette', lite, nightK: 0.4 });
    const stripMat = createStripMaterial(U);
    const bulbMat = createBulbMaterial(U);
    const glowMat = createRosetteGlowMaterial(U);
    this.materials.push(membraneMat, rosetteMat, stripMat, bulbMat, glowMat, this.eyeMat);

    // ---------------------------------------------------------------- geometry
    const HM = headMatrix();
    const kit = createKit(detail, HM);
    let t1 = performance.now();
    const head = buildHead(kit);
    this.stat.headMs = Math.round(performance.now() - t1);
    await step('body + wings', 0.6);
    t1 = performance.now();
    const body = buildBody(kit);
    const { wings, membrane } = buildWings(kit);
    for (const w of wings) for (const g of w.garlands) this.garlands.string(g, GARLAND.wings, 0.85, GARLAND_BULB.wings);
    this.stat.bodyWingMs = Math.round(performance.now() - t1);
    await step('merging the crown', 0.85);
    t1 = performance.now();

    // head rig: jaw pivot lives in head space
    this.headRig.matrixAutoUpdate = false;
    this.headRig.matrix.copy(headRigMatrix());
    // (the jaw carries the snout stretch along its own axis: head rig x jaw rotation x stretch)
    this.jawPivot.scale.set(1, 1, HEAD.snout);
    this.headRig.add(this.jawPivot);
    this.group.add(this.headRig);

    // MOBILE: the untextured-looking parts (armour, steel, copper, teeth, mouth, rider; on the jaw also
    // its shell) share ONE material with per-vertex metalness / roughness / reflection level and the
    // albedo of their texture baked into the vertex colour (~9 fewer draw calls; the scale hide and the
    // leopard hide keep their textures). The eyes join the static mix as an emissive part.
    const mixParts: Record<string, LitePart> = {
      shell: { metal: SHELL.metal, rough: SHELL.rough, env: 1.5, set: scale },
      armor: { metal: 0.82, rough: 0.55, env: 1.2, set: panel },
      steel: { metal: 0.95, rough: 0.7, env: 0.8, set: steel },
      copper: { metal: 0.7, rough: 0.75, env: 0.9, set: steel },
      ivory: { metal: 0, rough: 0.3, env: 0.5 },
      flesh: { metal: 0, rough: 0.38, env: 0.4 },
      rider: { metal: 0.7, rough: 0.75, env: 0.9, set: panel },
    };
    const mixMat = lite ? createLiteMixMaterial(env, U) : null;
    if (mixMat) this.materials.push(mixMat);
    const addBuckets = (b: PartBuckets, parent: THREE.Object3D, tag: string, extra: THREE.BufferGeometry[] = []) => {
      const pairs: [keyof typeof mats, THREE.Material][] = Object.entries(mats) as [keyof typeof mats, THREE.Material][];
      const mix: THREE.BufferGeometry[] = [...extra];
      for (const [name, mat] of pairs) {
        const bucket = b[name];
        if (bucket.empty) continue;
        this.stat.tris += bucket.tris;
        const part = mixParts[name];
        // the static shell keeps its scale texture; the jaw's shell joins the mix
        if (mixMat && part && (name !== 'shell' || tag === 'jaw')) {
          mix.push(toLiteMix(bucket.build(), part, 0));
          continue;
        }
        const mesh = new THREE.Mesh(bucket.build(), mat);
        mesh.name = `crown-${tag}-${name}`;
        mesh.castShadow = q.shadows;
        mesh.receiveShadow = q.shadows;
        mesh.matrixAutoUpdate = false;
        parent.add(mesh);
        this.meshes.push(mesh);
      }
      if (mixMat && mix.length) {
        const g = mergeGeometries(mix, false)!;
        for (const m of mix) m.dispose();
        g.computeBoundingSphere();
        const mesh = new THREE.Mesh(g, mixMat);
        mesh.name = `crown-${tag}-mix`;
        mesh.matrixAutoUpdate = false;
        parent.add(mesh);
        this.meshes.push(mesh);
      }
      if (b.strips.segments) {
        this.stat.ledSegments += b.strips.segments;
        const m = b.strips.build(stripMat);
        m.name = `crown-${tag}-led`;
        m.matrixAutoUpdate = false;
        parent.add(m);
        this.meshes.push(m);
      }
      if (b.bulbs.count) {
        this.stat.bulbs += b.bulbs.count;
        const m = b.bulbs.build(bulbMat);
        m.name = `crown-${tag}-bulbs`;
        m.matrixAutoUpdate = false;
        parent.add(m);
        this.meshes.push(m);
      }
    };
    // the jaw's LED strips and pixel dots ride in the static strip / bulb draws, following the jaw
    // through uJawMat (2 draws less on every preset)
    const restJaw = new THREE.Matrix4()
      .multiplyMatrices(this.headRig.matrix, new THREE.Matrix4().makeRotationX(THREE.MathUtils.lerp(HEAD.jawMin, HEAD.jawMax, 0.6)))
      .multiply(new THREE.Matrix4().makeScale(1, 1, HEAD.snout));
    this.U.uJawMat.value.copy(restJaw);
    kit.world.strips.absorb(kit.jaw.strips, restJaw);
    kit.world.bulbs.absorb(kit.jaw.bulbs, restJaw);
    // mobile: the eyeballs ride in the static mix (emissive part) instead of their own draw
    addBuckets(kit.world, this.group, 'static', mixMat ? [toLiteMix(head.eyeballs, EYE_PART, 1)] : []);
    addBuckets(kit.jaw, this.jawPivot, 'jaw');

    // membrane
    {
      const m = new THREE.Mesh(membrane, membraneMat);
      m.name = 'crown-membranes';
      m.matrixAutoUpdate = false;
      m.receiveShadow = q.shadows;
      this.stat.tris += membrane.index!.count / 3;
      this.group.add(m);
      this.meshes.push(m);
    }
    // eyes (the throat glow rides in the rosette-glow draw, see below)
    if (!mixMat) {
      const eyes = new THREE.Mesh(head.eyeballs, this.eyeMat);
      eyes.name = 'crown-eyes';
      eyes.matrixAutoUpdate = false;
      this.group.add(eyes);
      this.meshes.push(eyes);
    }
    head.throat.dispose();
    // rosettes (instanced gear + glow)
    {
      const frames = wings.flatMap((w) => w.rosetteFrames);
      this.rosetteFrames = frames;
      const parts = rosetteGear(detail).map((g) => {
        const n = g.getAttribute('position').count;
        g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
        g.setAttribute('fx', new THREE.BufferAttribute(new Float32Array(n).fill(WING_FX), 1));
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'fx'].includes(k)) g.deleteAttribute(k);
        return g.index ? g.toNonIndexed() : g;
      });
      const gear = mergeGeometries(parts, false)!;
      const inst = new THREE.InstancedMesh(gear, rosetteMat, frames.length);
      inst.name = 'crown-rosettes';
      // the rosette suns + (last instance, iKind 1) the throat glow: one additive draw
      const glowGeo = new THREE.CircleGeometry(ROSETTE_R, 48);
      const kind = new Float32Array(frames.length + 1);
      kind[frames.length] = 1;
      glowGeo.setAttribute('iKind', new THREE.InstancedBufferAttribute(kind, 1));
      const glow = new THREE.InstancedMesh(glowGeo, glowMat, frames.length + 1);
      glow.name = 'crown-rosette-glow';
      glow.renderOrder = 12;
      frames.forEach((f, i) => {
        inst.setMatrixAt(i, f);
        glow.setMatrixAt(i, f.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.2)));
      });
      // throat disc (head frame): 3.3 x 2.5 m, 1.2 m below and 1 m behind the head origin
      glow.setMatrixAt(frames.length, HM.clone().multiply(new THREE.Matrix4().makeTranslation(0, -1.2, -1.0)).multiply(new THREE.Matrix4().makeScale(3.3 / ROSETTE_R, 2.5 / ROSETTE_R, 1)));
      inst.computeBoundingSphere();
      glow.computeBoundingSphere();
      this.stat.tris += (gear.getAttribute('position').count / 3) * frames.length;
      this.group.add(inst, glow);
      this.rosettes = inst;
      this.rosetteGlow = glow;
      this.meshes.push(inst, glow);
    }
    this.group.updateMatrixWorld(true);

    // ---------------------------------------------------------------- anchors
    const toW = (p: THREE.Vector3) => p.clone().applyMatrix4(HM);
    const jawA = THREE.MathUtils.lerp(HEAD.jawMin, HEAD.jawMax, 0.6);
    // between the front gums (upper snout arc and the lower jaw tip at the default gape), a little inside
    const lowerFront = new THREE.Vector3(0, 0.3, 6.2).applyAxisAngle(new THREE.Vector3(1, 0, 0), jawA);
    const mouthH = new THREE.Vector3(0, 0.9, 6.6).add(lowerFront).multiplyScalar(0.5);
    mouthH.z -= 0.6;
    const [wl, wr] = wings;
    this.anchorData = {
      dragonMouth: toW(mouthH),
      dragonEyes: [toW(head.eyesH[0]), toW(head.eyesH[1])],
      dragonHead: toW(head.headH),
      wingTips: [...wl.layout.finialTops, ...wr.layout.finialTops].map((p) => p.clone()),
      wingLeft: wl.points.map((p) => p.clone()),
      wingRight: wr.points.map((p) => p.clone()),
      roof: [...wl.roof, ...[...head.crestTips].sort((a, b) => b.y - a.y).slice(0, 3), body.riderTop, ...wr.roof].map((p) => p.clone()),
      wingFixtures: [...wl.fixtureRows, ...wr.fixtureRows].map((r) => r.map((p) => p.clone())),
      shoulders: [wl.layout.shoulder.clone(), wr.layout.shoulder.clone()],
    };
    this.U.uMouthPos.value.copy(toW(new THREE.Vector3(0, -1.0, 1.6)));
    // the head's centre for a head-only stage.flash (skull between the hinge and the snout, under the crest)
    this.U.uHeadC.value.copy(toW(new THREE.Vector3(0, 1.8, 1.2)));

    this.stat.mergeMs = Math.round(performance.now() - t1);
    this.stat.draws = this.meshes.length;
    this.stat.buildMs = Math.round(performance.now() - t0);
    this.setQuality(q);
  }

  /** build the single instanced festoon mesh (after every set piece added its strings) */
  finishGarlands(): void {
    if (this.garlandMesh || this.garlands.count === 0) return;
    const mat = createGarlandMaterial(this.U);
    this.materials.push(mat);
    const m = this.garlands.build(mat);
    this.group.add(m);
    this.meshes.push(m);
    this.garlandMesh = m;
    this.stat.garlandBulbs = this.garlands.count;
  }

  update(ctx: FrameContext, look: StageLookEx): void {
    const U = this.U;
    const cam = ctx.camera;
    U.uPixel.value = (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5)) / Math.max(200, typeof window !== 'undefined' ? window.innerHeight : 720);
    // the membranes' breeze runs on SHOW time (a pure function of the show: a seek gives the same image;
    // round 6 found wall-clock motion as seek residue of up to ~60/255 on the wing art at 1463)
    U.uTime.value = ctx.showTime;
    U.uShowT.value = ctx.showTime;
    U.uPoolAmt.value = look.mode === 'dormant' ? 0 : 0.4;
    // practicals (constant glows) follow the look's emitter level: 0 in blackouts
    const E = Math.max(0, Math.min(1, look.emit));
    U.uEmit.value = E;
    U.uEmber.value = look.ember;
    U.uMinPx.value = this.level === 'mobile' ? 1.5 : 2.0;

    // LEDs (dragon colours; the wings may carry their own) + region levels
    U.uLed.value.copy(look.led);
    U.uLed2.value.copy(look.led2);
    U.uLedW.value.copy(look.wingLed);
    U.uLedW2.value.copy(look.wingLed2);
    U.uLedWR.value.copy(look.wingLedR);
    U.uLedWR2.value.copy(look.wingLedR2);
    U.uDragonG.value = look.dragonGain;
    U.uWingG.value = look.wingGain;
    U.uWingWash.value = look.wingWash;
    U.uSide.value.set(look.sideL, look.sideR);
    U.uDragonWash.value = look.dragonWash;
    // stage.flash (round 11): the transient light on the sculpture
    const sf = look.sculptFlash;
    U.uSFlash.value.set(sf.r * SCULPT_FLASH_GAIN, sf.g * SCULPT_FLASH_GAIN, sf.b * SCULPT_FLASH_GAIN, look.sculptFlashHead);
    U.uSFlashReg.value.copy(look.sculptFlashReg);
    U.uPlateGlow.value = look.plateGlow;
    U.uBeat.value = ctx.beat.beat;
    // (a crown-isolating mask keeps the crown's outlines lit without screen content: crownLedFloor)
    U.uLedI.value = Math.max(0, look.ledIntensity, look.crownLedFloor);
    // festoons: HDR level per group (not tied to the master level: a cue may light them in a blackout)
    U.uGarl.value.copy(look.garland);
    U.uGarlCol.value.copy(look.garlandColor);
    U.uGarlPat.value = look.garlandPattern;
    U.uGarlRate.value = look.garlandRate;
    U.uGarlHG.value.set(look.garlandHot, look.garlandGlare);
    const G = look.garland;
    if (this.garlandMesh) this.garlandMesh.visible = Math.max(G.x, G.y, G.z, G.w) > 0.002;
    U.uPattern.value = look.ledPattern;
    U.uPhase.value = look.ledPhase;
    U.uPulse.value = Math.max(0, Math.min(1, look.pulse));
    U.uWings.value = look.wings;
    // the wing print's uplights take the wing LED hue (a warm share keeps the print legible)
    const wl = look.wingLed;
    const wm = Math.max(wl.r, wl.g, wl.b, 1e-4);
    U.uPrintTint.value.setRGB(wl.r / wm, wl.g / wm, wl.b / wm).lerp(PRINT_WARM, PRINT_WARM_SHARE);
    const wr = look.wingLedR;
    const wmr = Math.max(wr.r, wr.g, wr.b, 1e-4);
    U.uPrintTintR.value.setRGB(wr.r / wmr, wr.g / wmr, wr.b / wmr).lerp(PRINT_WARM, PRINT_WARM_SHARE);
    U.uRosette.value.copy(look.rosettes).multiplyScalar(E);
    U.uMouth.value = look.mouth;
    U.uEyes.value.copy(look.eyes).multiplyScalar(look.eyesIntensity);

    // virtual wash rig
    const wi = Math.max(0, look.washIntensity);
    const pulse = U.uPulse.value;
    const wash = this.tmpC.copy(look.wash).multiplyScalar(wi * 9 * CROWN_TUNE.wash * (1 + 0.5 * pulse));
    U.uWashA.value.copy(wash);
    U.uWashB.value.copy(wash).lerp(this.tmpC2.copy(look.led2).multiplyScalar(wi * 5), 0.18);
    // content-coloured floods: while a screens content cue is alive the crown's two low floods also
    // take the look's colours (A: the crown LED colour, B: the content's second colour), as the
    // official footage floods the sculpture in the content colours (video 998.25: a green / red head
    // under a dark rig; 1047.25 violet / blue; 167 purple-white)
    const cf = CROWN_TUNE.contentFlood * look.contentMix * E;
    if (cf > 0) {
      addScaled(U.uWashA.value, look.led, cf);
      addScaled(U.uWashB.value, look.contentColor2, cf);
    }
    // a faint FOH work light that goes out with the practicals (blackouts: only sky + moon remain)
    addScaled(U.uKey.value.setRGB(0.05, 0.06, 0.1).multiplyScalar(0.35 + 0.65 * E), wash, 0.22);
    // pyro / firework flash: fireworks burst far above the crown and the pyro fires away from it, so
    // the metal takes a glint, not a floodlight (video 1438.5: a full canopy over a dark red dragon;
    // round 3 had ~6x the flash colour as irradiance and lit the crown white-orange on every burst)
    const flash = look.flash;
    U.uFlash.value.copy(flash).multiplyScalar(0.3);
    addScaled(addScaled(U.uRim.value.setRGB(0.06, 0.08, 0.18), flash, 0.22), look.led, 0.35 * U.uLedI.value);
    // the env map carries the rig's hot fixture spots: dim them with the practicals
    addScaled(addScaled(U.uEnvTint.value.setRGB(0.3, 0.34, 0.46).multiplyScalar((0.2 + 0.8 * E) * CROWN_TUNE.envGrey), look.wash, wi * 0.9), flash, 0.25);
    addScaled(U.uAmbient.value.setRGB(0.015, 0.018, 0.03), look.led, 0.05 * U.uLedI.value);
    // inner fire: throat point light + lava cracks
    // throat light: pale pink-red (the mouth interior glows pink / white, not orange), lava stays fiery
    const fire = this.tmpC2.setRGB(1.0, 0.32, 0.06).lerp(look.eyes, 0.55);
    U.uLava.value.copy(fire).multiplyScalar(look.mouth * 0.5 + (look.mode === 'ember' || look.mode === 'rage' ? 0.22 : 0.03) * E);
    const throat = this.tmpC2.setRGB(1.0, 0.45, 0.42).lerp(look.eyes, 0.3).lerp(THROAT_LIGHT_RED, CROWN_TUNE.throatRed);
    U.uMouthCol.value.copy(throat).multiplyScalar((look.mouth * 10 + 0.3 * E) * CROWN_TUNE.throatLight);
    U.uThroat.value.set(CROWN_TUNE.throat, CROWN_TUNE.throatRed);
    if (look.mode === 'frozen') {
      // frozen: the inner fire dies, the metal takes a cold frosty sheen
      U.uLava.value.setRGB(0, 0, 0);
      addScaled(U.uEnvTint.value, FROST, 0.5);
      addScaled(U.uKey.value, FROST, 0.25);
    }

    this.eyeMat.color.copy(look.eyes).multiplyScalar(Math.max(0.05 * E, look.eyesIntensity) * 0.45);

    // jaw (+ the jaw-local LEDs riding in the static strip / bulb draws)
    this.jawPivot.rotation.x = THREE.MathUtils.lerp(HEAD.jawMin, HEAD.jawMax, THREE.MathUtils.clamp(look.jaw, 0, 1));
    this.jawPivot.updateMatrix();
    U.uJawMat.value.multiplyMatrices(this.headRig.matrix, this.jawPivot.matrix);

    // rosettes: alternate spin direction per rosette
    if (this.rosettes && this.rosetteGlow) {
      for (let i = 0; i < this.rosetteFrames.length; i++) {
        const dir = i % 2 ? -1 : 1;
        this.tmpR.makeRotationZ(look.rosetteAngle * dir + i * 0.4);
        this.tmpM.multiplyMatrices(this.rosetteFrames[i], this.tmpR);
        this.rosettes.setMatrixAt(i, this.tmpM);
        this.tmpR.makeTranslation(0, 0, 0.2);
        this.tmpM.multiply(this.tmpR);
        this.rosetteGlow.setMatrixAt(i, this.tmpM);
      }
      this.rosettes.instanceMatrix.needsUpdate = true;
      this.rosetteGlow.instanceMatrix.needsUpdate = true;
    }
  }

  /** DEV `?daylight` (MainStage): every crown emitter off, the wash rig replaced by bright sky reflections */
  daylight(): void {
    const U = this.U;
    for (let i = 0; i < DAY_OFF.length; i++) (U[DAY_OFF[i]].value as THREE.Color).setRGB(0, 0, 0);
    U.uEnvTint.value.setRGB(3.2, 3.3, 3.5);
    U.uLedI.value = 0;
    U.uWings.value = 0;
    U.uEmit.value = 0;
    U.uMouth.value = 0;
    U.uPulse.value = 0;
    U.uPoolAmt.value = 0;
    U.uWingWash.value = 1;
    U.uDragonWash.value = 1;
    U.uGarl.value.set(0, 0, 0, 0);
    U.uDay.value = 1;
    if (this.garlandMesh) this.garlandMesh.visible = false;
    this.eyeMat.color.setRGB(0.04, 0.015, 0.01);
  }

  /**
   * Share the crown's virtual wash rig with another set piece (e.g. the castle): the material then
   * receives the same stage wash / rim / flash / throat light as the dragon. Call after build().
   */
  applyWashRig(mat: THREE.MeshStandardMaterial, key = 'ext'): void {
    patchStandard(mat, this.U, { key: 'ext-' + key });
    mat.needsUpdate = true;
  }

  anchors(): CrownAnchors {
    if (this.anchorData) return this.anchorData;
    // before build: layout-derived estimates
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const l = wingLayout(-1);
    const r = wingLayout(1);
    return {
      dragonMouth: v(-2.9, 12.8, -6.9),
      dragonEyes: [v(-4.6, 16.7, -10.4), v(0.6, 16.7, -8.5)],
      dragonHead: v(-1.4, 16.0, -11.0),
      wingTips: [...l.finialTops, ...r.finialTops],
      wingLeft: [...l.tips, ...l.finialTops],
      wingRight: [...r.tips, ...r.finialTops],
      roof: [...l.finialTops, v(0.1, 22.0, -17.9), v(6.7, 23.2, -18.3), ...r.finialTops],
      wingFixtures: [],
      shoulders: [l.shoulder, r.shoulder],
    };
  }

  setQuality(q: QualitySettings): void {
    // anisotropy is applied once at build (a runtime change would re-upload every crown texture) and
    // the crown casts no shadows (the renderer's shadow map is off in every preset)
    this.level = q.level;
  }

  stats(): Record<string, number | string> {
    return {
      crownDraws: this.stat.draws,
      crownTris: Math.round(this.stat.tris),
      ledSegments: this.stat.ledSegments,
      bulbs: this.stat.bulbs,
      garlandBulbs: this.stat.garlandBulbs,
      buildMs: this.stat.buildMs,
      buildSplit: `tex ${this.stat.texMs} / head ${this.stat.headMs} / body+wings ${this.stat.bodyWingMs} / merge ${this.stat.mergeMs}`,
      texSize: this.stat.texSize,
      level: this.level,
    };
  }

  dispose(): void {
    for (const m of this.meshes) m.geometry.dispose();
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
  }
}

/** scale-hide shell: metalness / roughness (desktop material and the mobile mix alike; was 0.8 / 0.42) */
const SHELL = { metal: 0.5, rough: 0.5 };

/** crown calibration (exposed for in-page tuning by the QA tools: `__app.get('stage').crownTune`) */
export const CROWN_TUNE = {
  /**
   * level of the content-coloured floods on the crown (0 = off; round 7: 1.5, metric-neutral on 20 moments,
   * 2-4 lost ~0.1-0.25 point: the show's colour at 167 differs from the video's, and the red portal
   * close-ups want no extra flood)
   */
  contentFlood: 1.5,
  /** gain of the lighting wash on the crown */
  wash: 1,
  /**
   * level of the neutral (grey-blue) part of the crown's reflections (round 9: 1 -> 0, with the set's sky share
   * 0.45 -> 0 and floods x3: the crown's reflections take the wash colour only; 64 moments +0.3, chroma)
   */
  envGrey: 0,
  /**
   * round 9: throat glow level at mouth 1 (was 0.5) and how far the glow and the throat light are pulled to a
   * saturated red (0 = the old pale pink); the mouth reads red under every look in the footage (998.25 green
   * look: a red mouth, where the pink-white throat light bloomed into a pale ball; 680.5 / 656 red)
   */
  throat: 0.3,
  throatRed: 0.85,
  /** round 9: level of the throat point light (x its old level) */
  throatLight: 0.8,
};
/**
 * irradiance of a stage.flash at level 1 (round 11): the night-calibrated hide / steel read bone-white under it
 * (video 713.5 / 719.75), like the head of the 716.4 white look
 */
const SCULPT_FLASH_GAIN = 6;
/** saturated red the throat light is pulled to by CROWN_TUNE.throatRed (round 9) */
const THROAT_LIGHT_RED = new THREE.Color(1.0, 0.14, 0.1);

const FROST = new THREE.Color(0.55, 0.8, 1.0);
/** warm share of the wing print's uplights (tungsten-ish), mixed into the wing LED hue */
const PRINT_WARM = new THREE.Color(1.0, 0.72, 0.5);
const PRINT_WARM_SHARE = 0.2;
/** colour uniforms of the wash rig / emitters switched off by the dev `?daylight` view */
const DAY_OFF = ['uWashA', 'uWashB', 'uKey', 'uRim', 'uFlash', 'uAmbient', 'uMouthCol', 'uLava', 'uRosette', 'uEyes'] as const;

function addScaled(c: THREE.Color, o: THREE.Color, s: number): THREE.Color {
  c.r += o.r * s;
  c.g += o.g * s;
  c.b += o.b * s;
  return c;
}

function texList(s: PbrSet): THREE.Texture[] {
  return [s.map, s.normalMap, s.roughnessMap];
}

// ---------------------------------------------------------------------------------------------
// MOBILE: one shared "mix" material for the crown's secondary parts (draw-call budget)
// ---------------------------------------------------------------------------------------------

/** a crown material folded into the mobile mix: its scalar PBR values + its texture set (for the mean albedo / roughness) */
interface LitePart {
  metal: number;
  rough: number;
  /** env-map (reflection) intensity */
  env: number;
  set?: PbrSet;
}

/** the eyeballs: a dark glass the eye colour glows through (emissive flag in the mix) */
const EYE_PART: LitePart = { metal: 0, rough: 0.3, env: 0.3 };

/**
 * Prepare a part geometry for the mobile mix: indexed, position / normal / uv / color / fx + `mr`
 * (metalness, roughness, reflection level, emissive-eye flag); the texture's mean albedo is baked
 * into the vertex colour and its mean roughness into `mr.y`.
 */
function toLiteMix(g: THREE.BufferGeometry, p: LitePart, eye: number): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  if (!g.index) g.setIndex(Array.from({ length: n }, (_, i) => i));
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.getAttribute('fx')) g.setAttribute('fx', new THREE.BufferAttribute(new Float32Array(n), 1));
  let col = g.getAttribute('color') as THREE.BufferAttribute | undefined;
  if (!col) {
    col = new THREE.BufferAttribute(new Float32Array(n * 3).fill(eye ? 0.02 : 1), 3);
    g.setAttribute('color', col);
  }
  const alb = p.set ? texMean(p.set.map) : [1, 1, 1];
  const rough = p.set ? Math.min(1, Math.max(0.05, p.rough * texMean(p.set.roughnessMap)[1])) : p.rough;
  for (let i = 0; i < n; i++) col.setXYZ(i, col.getX(i) * alb[0], col.getY(i) * alb[1], col.getZ(i) * alb[2]);
  const mr = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    mr[i * 4] = p.metal;
    mr[i * 4 + 1] = rough;
    mr[i * 4 + 2] = p.env;
    mr[i * 4 + 3] = eye;
  }
  g.setAttribute('mr', new THREE.BufferAttribute(mr, 4));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'fx', 'mr'].includes(k)) g.deleteAttribute(k);
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

/** the mobile mix material: the crown's wash rig (lite) with per-vertex metalness / roughness / reflections */
function createLiteMixMaterial(env: THREE.Texture, U: CrownUniforms): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, envMap: env, metalness: 1, roughness: 1, envMapIntensity: 1, side: THREE.DoubleSide });
  patchStandard(m, U, { key: 'mix', lite: true });
  const crown = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    crown.call(m, sh, r);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 mr;\nvarying vec4 vMR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMR = mr;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vMR;\nuniform vec3 uEyes;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vMR.y;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMR.x;')
      .replace(
        '#include <lights_fragment_maps>',
        `#include <lights_fragment_maps>
#if defined( RE_IndirectSpecular )
radiance *= vMR.z;
#endif
iblIrradiance *= vMR.z;`,
      )
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEyes * 0.45 * vMR.w;');
  };
  return m;
}
