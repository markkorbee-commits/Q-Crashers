import * as THREE from 'three';
import type { FrameContext, QualitySettings } from '../core/types';
import type { StageLook } from './StageLook';
import { buildBody } from './dragon/body';
import { buildHead } from './dragon/head';
import { createKit, type PartBuckets } from './dragon/kit';
import { HEAD, headMatrix, wingLayout } from './dragon/layout';
import {
  createBulbMaterial,
  createEnvMap,
  createRosetteGlowMaterial,
  createStripMaterial,
  createThroatMaterial,
  createUniforms,
  patchStandard,
  type CrownUniforms,
} from './dragon/shading';
import { flameTexture, lavaTextures, panelTextures, scaleTextures, steelTextures, type PbrSet } from './dragon/textures';
import { buildWings, rosetteGear } from './dragon/wings';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
  private stat = { buildMs: 0, texMs: 0, headMs: 0, bodyWingMs: 0, mergeMs: 0, tris: 0, ledSegments: 0, bulbs: 0, texSize: 0, draws: 0 };
  private tmpM = new THREE.Matrix4();
  private tmpR = new THREE.Matrix4();
  private tmpC = new THREE.Color();
  private tmpC2 = new THREE.Color();
  private level: QualitySettings['level'] = 'high';

  async build(q: QualitySettings): Promise<void> {
    const t0 = performance.now();
    this.group.name = 'DragonCrown';
    this.level = q.level;
    const detail = q.level === 'ultra' ? 1 : q.level === 'high' ? 0.85 : q.level === 'medium' ? 0.6 : 0.38;
    const ts = Math.min(q.textureSize, 2048);
    const aniso = q.anisotropy;
    this.stat.texSize = ts;

    // ---------------------------------------------------------------- textures
    const scale = scaleTextures(Math.min(ts, 1024), aniso);
    await yieldFrame();
    const panel = panelTextures(Math.min(ts, 1024), aniso);
    const steel = steelTextures(Math.max(256, Math.min(ts / 2, 512)), aniso);
    await yieldFrame();
    const flame = flameTexture(Math.min(ts, 2048), Math.min(ts, 2048) / 2, aniso);
    const lava = lavaTextures(Math.max(256, Math.min(ts / 2, 512)), aniso);
    const env = createEnvMap();
    this.textures.push(...texList(scale), ...texList(panel), ...texList(steel), flame, lava.map, lava.emissiveMap, env);
    this.stat.texMs = Math.round(performance.now() - t0);
    await yieldFrame();

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
      shell: std('shell', { metalness: 0.8, roughness: 0.42, envMapIntensity: 1.5, side: THREE.DoubleSide, normalScale: new THREE.Vector2(1.3, 1.3) }, scale),
      armor: std('armor', { metalness: 0.82, roughness: 0.55, envMapIntensity: 1.2 }, panel, { key: 'armor' }),
      steel: std('steel', { metalness: 0.95, roughness: 0.7, envMapIntensity: 0.8 }, steel),
      copper: std('copper', { metalness: 0.7, roughness: 0.75, envMapIntensity: 0.9 }, steel),
      lava: std('lava', { map: lava.map, emissiveMap: lava.emissiveMap, emissive: 0x000000, normalMap: scale.normalMap, metalness: 0.35, roughness: 0.6, envMapIntensity: 0.6 }, undefined, { key: 'lava', lava: true }),
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
    patchStandard(membraneMat, U, { key: 'membrane', membrane: true, lite });
    const rosetteMat = new THREE.MeshStandardMaterial({ color: '#c8a060', metalness: 0.9, roughness: 0.35, envMap: env, envMapIntensity: 1.1, map: panel.map, normalMap: panel.normalMap });
    patchStandard(rosetteMat, U, { key: 'rosette', lite });
    const stripMat = createStripMaterial(U);
    const bulbMat = createBulbMaterial(U);
    const glowMat = createRosetteGlowMaterial(U);
    const throatMat = createThroatMaterial(U);
    this.materials.push(membraneMat, rosetteMat, stripMat, bulbMat, glowMat, throatMat, this.eyeMat);

    // ---------------------------------------------------------------- geometry
    const HM = headMatrix();
    const kit = createKit(detail, HM);
    let t1 = performance.now();
    const head = buildHead(kit);
    this.stat.headMs = Math.round(performance.now() - t1);
    await yieldFrame();
    t1 = performance.now();
    const body = buildBody(kit);
    const { wings, membrane } = buildWings(kit);
    this.stat.bodyWingMs = Math.round(performance.now() - t1);
    await yieldFrame();
    t1 = performance.now();

    // head rig: jaw pivot lives in head space
    this.headRig.matrixAutoUpdate = false;
    this.headRig.matrix.copy(HM);
    this.headRig.add(this.jawPivot);
    this.group.add(this.headRig);

    const addBuckets = (b: PartBuckets, parent: THREE.Object3D, tag: string) => {
      const pairs: [keyof typeof mats, THREE.Material][] = Object.entries(mats) as [keyof typeof mats, THREE.Material][];
      for (const [name, mat] of pairs) {
        const bucket = b[name];
        if (bucket.empty) continue;
        this.stat.tris += bucket.tris;
        const mesh = new THREE.Mesh(bucket.build(), mat);
        mesh.name = `crown-${tag}-${name}`;
        mesh.castShadow = q.shadows;
        mesh.receiveShadow = q.shadows;
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
    addBuckets(kit.world, this.group, 'static');
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
    // eyes + throat
    {
      const eyes = new THREE.Mesh(head.eyeballs, this.eyeMat);
      eyes.name = 'crown-eyes';
      eyes.matrixAutoUpdate = false;
      this.group.add(eyes);
      this.meshes.push(eyes);
      const throat = new THREE.Mesh(head.throat, throatMat);
      throat.name = 'crown-throat';
      throat.matrixAutoUpdate = false;
      throat.renderOrder = 12;
      this.group.add(throat);
      this.meshes.push(throat);
    }
    // rosettes (instanced gear + glow)
    {
      const frames = wings.flatMap((w) => w.rosetteFrames);
      this.rosetteFrames = frames;
      const parts = rosetteGear(detail).map((g) => {
        const n = g.getAttribute('position').count;
        g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
        g.setAttribute('fx', new THREE.BufferAttribute(new Float32Array(n), 1));
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'fx'].includes(k)) g.deleteAttribute(k);
        return g.index ? g.toNonIndexed() : g;
      });
      const gear = mergeGeometries(parts, false)!;
      const inst = new THREE.InstancedMesh(gear, rosetteMat, frames.length);
      inst.name = 'crown-rosettes';
      const glowGeo = new THREE.CircleGeometry(2.35, 48);
      const glow = new THREE.InstancedMesh(glowGeo, glowMat, frames.length);
      glow.name = 'crown-rosette-glow';
      glow.renderOrder = 12;
      frames.forEach((f, i) => {
        inst.setMatrixAt(i, f);
        glow.setMatrixAt(i, f.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.2)));
      });
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

    this.stat.mergeMs = Math.round(performance.now() - t1);
    this.stat.draws = this.meshes.length;
    this.stat.buildMs = Math.round(performance.now() - t0);
    this.setQuality(q);
  }

  update(ctx: FrameContext, look: StageLook): void {
    const U = this.U;
    const cam = ctx.camera;
    U.uPixel.value = (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5)) / Math.max(200, typeof window !== 'undefined' ? window.innerHeight : 720);
    U.uTime.value = ctx.time;
    U.uShowT.value = ctx.showTime;
    U.uPoolAmt.value = look.mode === 'dormant' ? 0 : 0.4;
    // practicals (constant glows) follow the look's emitter level: 0 in blackouts
    const E = Math.max(0, Math.min(1, look.emit));
    U.uEmit.value = E;
    U.uEmber.value = look.ember;
    U.uMinPx.value = this.level === 'mobile' ? 1.5 : 2.0;

    // LEDs
    U.uLed.value.copy(look.led);
    U.uLed2.value.copy(look.led2);
    U.uLedI.value = Math.max(0, look.ledIntensity);
    U.uPattern.value = look.ledPattern;
    U.uPhase.value = look.ledPhase;
    U.uPulse.value = Math.max(0, Math.min(1, look.pulse));
    U.uWings.value = look.wings;
    U.uRosette.value.copy(look.rosettes).multiplyScalar(E);
    U.uMouth.value = look.mouth;
    U.uEyes.value.copy(look.eyes).multiplyScalar(look.eyesIntensity);

    // virtual wash rig
    const wi = Math.max(0, look.washIntensity);
    const pulse = U.uPulse.value;
    const wash = this.tmpC.copy(look.wash).multiplyScalar(wi * 9 * (1 + 0.5 * pulse));
    U.uWashA.value.copy(wash);
    U.uWashB.value.copy(wash).lerp(this.tmpC2.copy(look.led2).multiplyScalar(wi * 5), 0.18);
    // a faint FOH work light that goes out with the practicals (blackouts: only sky + moon remain)
    addScaled(U.uKey.value.setRGB(0.05, 0.06, 0.1).multiplyScalar(0.35 + 0.65 * E), wash, 0.22);
    const flash = look.flash;
    U.uFlash.value.copy(flash).multiplyScalar(6);
    addScaled(addScaled(U.uRim.value.setRGB(0.06, 0.08, 0.18), flash, 2.5), look.led, 0.35 * U.uLedI.value);
    // the env map carries the rig's hot fixture spots: dim them with the practicals
    addScaled(addScaled(U.uEnvTint.value.setRGB(0.3, 0.34, 0.46).multiplyScalar(0.2 + 0.8 * E), look.wash, wi * 0.9), flash, 1.2);
    addScaled(U.uAmbient.value.setRGB(0.015, 0.018, 0.03), look.led, 0.05 * U.uLedI.value);
    // inner fire: throat point light + lava cracks
    // throat light: pale pink-red (the mouth interior glows pink / white, not orange), lava stays fiery
    const fire = this.tmpC2.setRGB(1.0, 0.32, 0.06).lerp(look.eyes, 0.55);
    U.uLava.value.copy(fire).multiplyScalar(look.mouth * 0.5 + (look.mode === 'ember' || look.mode === 'rage' ? 0.22 : 0.03) * E);
    const throat = this.tmpC2.setRGB(1.0, 0.45, 0.42).lerp(look.eyes, 0.3);
    U.uMouthCol.value.copy(throat).multiplyScalar(look.mouth * 10 + 0.3 * E);
    if (look.mode === 'frozen') {
      // frozen: the inner fire dies, the metal takes a cold frosty sheen
      U.uLava.value.setRGB(0, 0, 0);
      addScaled(U.uEnvTint.value, FROST, 0.5);
      addScaled(U.uKey.value, FROST, 0.25);
    }

    this.eyeMat.color.copy(look.eyes).multiplyScalar(Math.max(0.05 * E, look.eyesIntensity) * 0.45);

    // jaw
    this.jawPivot.rotation.x = THREE.MathUtils.lerp(HEAD.jawMin, HEAD.jawMax, THREE.MathUtils.clamp(look.jaw, 0, 1));

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
    this.level = q.level;
    for (const t of this.textures) {
      if (t.anisotropy !== q.anisotropy && !(t instanceof THREE.DataTexture && t.mapping === THREE.EquirectangularReflectionMapping)) {
        t.anisotropy = q.anisotropy;
        t.needsUpdate = true;
      }
    }
    for (const m of this.meshes) {
      m.castShadow = q.shadows && !(m.material instanceof THREE.ShaderMaterial);
    }
  }

  stats(): Record<string, number | string> {
    return {
      crownDraws: this.stat.draws,
      crownTris: Math.round(this.stat.tris),
      ledSegments: this.stat.ledSegments,
      bulbs: this.stat.bulbs,
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

const FROST = new THREE.Color(0.55, 0.8, 1.0);

function addScaled(c: THREE.Color, o: THREE.Color, s: number): THREE.Color {
  c.r += o.r * s;
  c.g += o.g * s;
  c.b += o.b * s;
  return c;
}

function texList(s: PbrSet): THREE.Texture[] {
  return [s.map, s.normalMap, s.roughnessMap];
}
