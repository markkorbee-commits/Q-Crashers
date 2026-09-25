import * as THREE from 'three';
import type { App } from '../core/App';
import type { AnchorName } from '../core/Anchors';
import type { FrameContext, QualitySettings, System } from '../core/types';
import type { Platform, PlayerController } from '../player/PlayerController';
import { yawTowards } from '../player/spots';
import { CastleBuilder } from './castle/Castle';
import { SidesBuilder } from './castle/Sides';
import { barrierLayout, barrierSegmentGeometry, DeckBuilder } from './deck/Deck';
import { SpeakerBuilder } from './deck/Speakers';
import { DragonCrown } from './DragonCrown';
import { createKit, type StageKit } from './kit';
import { armFrame, L } from './layout';
import { LookResolver } from './look/LookResolver';
import { StageMaterials } from './materials/StageMaterials';
import { StageLights } from './StageLights';
import { createStageLookEx, type StageLookEx } from './StageLook';

const RANK: Record<QualitySettings['level'], number> = { mobile: 0, medium: 1, high: 2, ultra: 3 };

/** c += src * k (THREE.Color has no addScaled) */
function addScaled(c: THREE.Color, src: THREE.Color, k: number): THREE.Color {
  c.r += src.r * k;
  c.g += src.g * k;
  c.b += src.b * k;
  return c;
}

/**
 * The 2026 MainStage (RED, "Sacred Oath"): gothic castle base, deck, stage front line, angled
 * side sections, PA, barrier + the dragon/wings crown (DragonCrown, built by its own module).
 *
 * Per frame: the 'stage' + 'screens' cues and app.env are resolved into ONE StageLook (pure
 * function of show time), which drives the LED shader, the virtual flood field of every set
 * material, a handful of real lights and the crown. The env-dependent part runs in an app
 * frame hook (after all emitters wrote their flash / wash / strobe for this frame).
 */
export class MainStageSystem implements System {
  readonly name = 'stage';
  readonly root = new THREE.Group();
  readonly look: StageLookEx = createStageLookEx();
  private app!: App;
  private enabled = true;
  private crown = new DragonCrown();
  private mats!: StageMaterials;
  private lights = new StageLights();
  private resolver!: LookResolver;
  private meshes: THREE.Mesh[] = [];
  private barrier: THREE.InstancedMesh | null = null;
  private detailMeshes: THREE.Object3D[] = [];
  private kitStats = { tris: 0, ledMetres: 0, windows: 0, lamps: 0, lanterns: 0, barrier: 0 };
  private buildMs = 0;
  private timing = { materials: 0, geometry: 0, crown: 0 };
  private lastFrame = -1;
  private hooked = false;

  async init(app: App): Promise<void> {
    const t0 = performance.now();
    this.app = app;
    this.root.name = 'MainStage';
    const q = app.quality;
    this.mats = new StageMaterials(app.renderer, q);
    this.resolver = new LookResolver(app.show);
    const t1 = performance.now();
    this.timing.materials = t1 - t0;

    // ---- geometry --------------------------------------------------------------------------------
    const kit = createKit(RANK[q.level] >= 2 ? 2 : RANK[q.level] === 1 ? 1 : 0);
    new CastleBuilder(kit).build();
    new SidesBuilder(kit).build();
    new DeckBuilder(kit).build();
    new SpeakerBuilder(kit).build();
    this.buildMeshes(kit);
    const t2 = performance.now();
    this.timing.geometry = t2 - t1;

    // barrier: one instanced mesh
    const bl = barrierLayout();
    const bg = barrierSegmentGeometry();
    this.barrier = new THREE.InstancedMesh(bg, this.mats.barrier, bl.length);
    bl.forEach((m, i) => this.barrier!.setMatrixAt(i, m));
    this.barrier.instanceMatrix.needsUpdate = true;
    this.barrier.computeBoundingSphere();
    this.barrier.name = 'stage-barrier';
    this.root.add(this.barrier);
    this.kitStats.barrier = bl.length;

    // ---- crown -----------------------------------------------------------------------------------
    try {
      await this.crown.build(q);
    } catch (e) {
      console.error('[stage] crown build failed', e);
    }
    this.root.add(this.crown.group);
    this.mats.adoptEnv(this.crown.group, app.scene);
    this.timing.crown = performance.now() - t2;

    this.root.add(this.lights.group);
    app.scene.add(this.root);

    this.registerAnchors(kit);
    this.registerWorld(app);
    app.onFrame((ctx) => this.frame(ctx));
    this.hooked = true;
    this.buildMs = performance.now() - t0;
  }

  private buildMeshes(kit: StageKit): void {
    const m = this.mats;
    const add = (geo: THREE.BufferGeometry | null, mat: THREE.Material, name: string, detail = false) => {
      if (!geo) return;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = name;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.castShadow = mat !== m.led && mat !== m.decor;
      mesh.receiveShadow = mat === m.stone || mat === m.paint;
      this.root.add(mesh);
      this.meshes.push(mesh);
      if (detail) this.detailMeshes.push(mesh);
      this.kitStats.tris += (geo.attributes.position.count / 3) | 0;
    };
    add(kit.stone.build(), m.stone, 'stage-stone');
    add(kit.paint.build(), m.paint, 'stage-paint');
    add(kit.metal.build(), m.metal, 'stage-metal');
    add(kit.gold.build(), m.gold, 'stage-gold');
    add(kit.decor.build(), m.decor, 'stage-decor');
    add(kit.speaker.build(), m.speaker, 'stage-speaker');
    const led = kit.led.build();
    add(led, m.led, 'stage-led');
    this.kitStats.ledMetres = Math.round(kit.led.metres);
    this.kitStats.windows = kit.led.count.windows;
    this.kitStats.lamps = kit.led.count.lamps;
    this.kitStats.lanterns = kit.led.count.lanterns;
  }

  // -------------------------------------------------------------------------------------------
  // anchors, colliders, spots, platforms

  private registerAnchors(kit: StageKit): void {
    const a = this.app.anchors;
    const set = (n: AnchorName, pts: THREE.Vector3[]) => {
      if (pts.length) a.set(n, pts);
    };
    const P = kit.pts;
    // ordered left -> right along the flame ring (left arm tip ... front line ... right arm tip);
    // every deck_front point is at deck height (index 0 is read by the PlayerController)
    const byX = (pts: THREE.Vector3[]) => [...pts].sort((p, q) => p.x - q.x || p.z - q.z);
    set('deck_front', byX(P.deckFront));
    set('deck_back', byX(P.deckBack));
    set('towers_top', byX(P.towersTop));
    set('speaker_hangs', P.speakerHangs);
    set('dj_booth', [new THREE.Vector3(0, L.deckY + 0.3, L.boothZ - 1.1)]);
    set('laser_stage', byX(P.laserStage));
    set('fixtures_truss', byX(P.fixturesTruss));
    set('fixtures_floor', byX(P.fixturesFloor));
    const c = this.crown.anchors();
    set('dragon_mouth', [c.dragonMouth]);
    set('dragon_eyes', [c.dragonEyes[0], c.dragonEyes[1]]);
    set('dragon_head', [c.dragonHead]);
    set('wing_tips', c.wingTips);
    set('wing_left', c.wingLeft);
    set('wing_right', c.wingRight);
    set('roof', [...P.roof, ...c.roof].sort((p, q) => p.x - q.x));
  }

  private registerWorld(app: App): void {
    // raised walkable deck (the player on it is clamped to this rectangle)
    const player = app.get<PlayerController>('player');
    const deck: Platform = { minX: -L.frontHalf - 1.5, maxX: L.frontHalf + 1.5, minZ: L.terraceFrontZ + 0.35, maxZ: -0.05, y: L.deckY };
    if (player && Array.isArray(player.platforms)) {
      player.platforms.length = 0;
      player.platforms.push(deck);
    }
    // colliders ON the deck (tag 'deck*'): booth, truss tower bases, stair railings of the terrace
    app.addCollider({ kind: 'box', minX: -3.4, maxX: 3.4, minZ: L.boothZ - 0.6, maxZ: L.boothZ + 0.62, tag: 'deck-booth' });
    for (const x of [L.innerArrayX, -L.innerArrayX, L.outerArrayX, -L.outerArrayX]) {
      const z = L.arrayZ - 1.45;
      app.addCollider({ kind: 'box', minX: x - 1.1, maxX: x + 1.1, minZ: z - 1.1, maxZ: z + 1.1, tag: 'deck-truss' });
    }
    for (const s of [-1, 1]) {
      const x0 = s * (L.gateHalf + 0.25),
        x1 = s * (L.gateHalf + 1.7);
      app.addCollider({ kind: 'box', minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: L.terraceFrontZ, maxZ: -3.9, tag: 'deck-steps' });
    }
    // stage body (ground walkers): deck + castle + backstage block, central stairs
    app.addCollider({ kind: 'box', minX: -L.frontHalf - 2, maxX: L.frontHalf + 2, minZ: -40, maxZ: 0.75, tag: 'stage' });
    app.addCollider({ kind: 'box', minX: -2.7, maxX: 2.7, minZ: 0, maxZ: 2.25, tag: 'stage-stairs' });
    // front barrier (straight) — the 'front' spot at z = 6 sits right behind it
    const { dir, len, nIn } = armFrame();
    const p0x = L.armA.x + nIn.x * L.barrierZ,
      p0z = L.armA.y + nIn.y * L.barrierZ;
    const tMeet = (L.barrierZ - p0z) / dir.y;
    const xMeet = p0x + dir.x * tMeet;
    app.addCollider({ kind: 'box', minX: -xMeet, maxX: xMeet, minZ: L.barrierZ - 0.8, maxZ: L.barrierZ + 0.85, tag: 'barrier' });
    for (const s of [-1, 1]) {
      // angled barrier + arm body as chains of circles
      for (let t = tMeet; t <= len + L.armLedge; t += 0.9) {
        app.addCollider({ kind: 'circle', x: s * (p0x + dir.x * t), z: p0z + dir.y * t + 0.3, r: 0.75, tag: 'barrier' });
      }
      for (let t = 0; t <= len + 2; t += 2.5) {
        const cx = L.armA.x + dir.x * t - nIn.x * 1.5,
          cz = L.armA.y + dir.y * t - nIn.y * 1.5;
        app.addCollider({ kind: 'circle', x: s * cx, z: cz, r: 3.2, tag: 'stage-arm' });
      }
    }
    // spots on the deck
    const look = new THREE.Vector3(0, 6, 40);
    const spot = (id: string, label: string, x: number, z: number, target: THREE.Vector3, pitch: number) => {
      const position = new THREE.Vector3(x, L.deckY, z);
      app.addSpot({ id, label, position, yaw: yawTowards(position, target), pitch });
    };
    spot('stage_left', 'Stage left wing', -52, -2.4, look, -0.02);
    spot('stage_right', 'Stage right wing', 52, -2.4, look, -0.02);
    spot('dj_booth', 'Behind the decks', 0, L.boothZ - 1.4, new THREE.Vector3(0, 2, 60), 0.02);
  }

  // -------------------------------------------------------------------------------------------

  update(ctx: FrameContext): void {
    if (!this.enabled) return;
    // cue-driven part of the look (env-dependent parts are refreshed in the frame hook)
    const app = this.app;
    this.resolver.resolve(ctx.showTime, ctx.beat, app.palette, app.env, this.look);
    this.lastFrame = app.frame;
  }

  /** runs after every system updated (env holds this frame's flash / strobe / wash) */
  private frame(ctx: FrameContext): void {
    if (!this.enabled || !this.hooked) return;
    const app = this.app;
    const look = this.look;
    if (this.lastFrame !== app.frame) this.resolver.resolve(ctx.showTime, ctx.beat, app.palette, app.env, look);
    else {
      // refresh the env-driven fields only
      look.wash.copy(app.env.stageWashColor);
      look.washIntensity = app.env.stageWashIntensity;
      const fi = app.env.flashIntensity;
      look.flash.copy(app.env.flashColor);
      if (fi > 3) look.flash.multiplyScalar(3 / fi);
      look.strobe = Math.min(1, Math.max(0, app.env.strobe));
      look.pulse = Math.max(look.pulse, look.strobe * 0.6);
    }
    this.applyUniforms(ctx, look);
    this.lights.update(look, app.env.flashPos, app.env.flashIntensity);
    try {
      this.crown.update(ctx, look);
    } catch (e) {
      if (app.frame % 300 === 1) console.error('[stage] crown update failed', e);
    }
  }

  private applyUniforms(ctx: FrameContext, look: StageLookEx): void {
    const u = this.mats.u;
    const wi = look.washIntensity;
    // virtual floods: set A follows the lighting wash, set B leans to the LED secondary colour
    u.uFloodA.value.copy(look.wash).multiplyScalar(wi * 3.2 * (0.55 + 0.6 * look.energy));
    u.uFloodB.value.copy(look.wash).lerp(look.led2, 0.55).multiplyScalar(wi * 2.8 * (0.55 + 0.6 * look.energy));
    addScaled(u.uFront.value.copy(look.wash).multiplyScalar(wi * 0.42), look.pulseColor, 1.2);
    u.uFront.value.r += look.strobe * 2.5;
    u.uFront.value.g += look.strobe * 2.5;
    u.uFront.value.b += look.strobe * 2.5;
    addScaled(u.uBack.value.setRGB(0.012, 0.02, 0.045), look.led, 0.06 * look.ledIntensity);
    u.uFlash.value.copy(look.flash).multiplyScalar(1.6);
    u.uFlashPos.value.copy(this.app.env.flashPos);
    addScaled(u.uEnvTint.value.setRGB(0.35, 0.35, 0.42), look.wash, wi * 1.2);
    u.uGlow.value.set(look.bannerGlow, look.skullGlow * (0.6 + look.eyesIntensity * 0.5), look.emblemGlow, 1);

    const l = this.mats.led.uniforms;
    l.uTime.value = ctx.showTime;
    l.uBeat.value = ctx.beat.beat;
    l.uKick.value = ctx.beat.kick;
    l.uPhase.value = look.ledPhase;
    l.uPattern.value = look.ledPatternX;
    const ledGain = 9 * look.ledIntensity;
    (l.uLed.value as THREE.Color).copy(look.led).multiplyScalar(ledGain);
    (l.uLed2.value as THREE.Color).copy(look.led2).multiplyScalar(ledGain);
    (l.uAccent.value as THREE.Color).copy(look.accent).multiplyScalar(ledGain * 0.75);
    (l.uWin.value as THREE.Color).copy(look.windowColor).multiplyScalar(2.3 * look.windows);
    l.uWinMode.value = look.windowMode;
    (l.uArcade.value as THREE.Color).copy(look.arcade).multiplyScalar(1.6 * (0.4 + 0.6 * look.windows));
    (l.uLamp.value as THREE.Color).copy(look.lamp).multiplyScalar(2 + 10 * look.ledIntensity);
    (l.uLantern.value as THREE.Color).copy(look.lantern).multiplyScalar(3.5 + 3 * look.energy);
    (l.uCandle.value as THREE.Color).set('#ffb45a').multiplyScalar(1.4);
    (l.uPortal.value as THREE.Color).copy(look.portal).multiplyScalar(1.2 + 1.5 * look.mouth);
    l.uPulse.value = look.pulse;
    l.uStrobe.value = look.strobe;
  }

  setQuality(q: QualitySettings): void {
    this.lights.setQuality(q);
    const r = RANK[q.level];
    for (const m of this.detailMeshes) m.visible = r >= 1;
    try {
      this.crown.setQuality(q);
    } catch (e) {
      console.error('[stage] crown setQuality failed', e);
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.root.visible = on;
  }

  stats(): Record<string, number | string> {
    const box = new THREE.Box3().setFromObject(this.root, false);
    const size = box.getSize(new THREE.Vector3());
    let crownTris = 0;
    let crownCalls = 0;
    this.crown.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) {
        crownCalls++;
        const g = m.geometry;
        const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
        crownTris += n * ((o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1);
      }
    });
    const bTris = this.barrier ? ((this.barrier.geometry.attributes.position.count / 3) | 0) * this.barrier.count : 0;
    const crownStats = this.crown.stats();
    return {
      width: +size.x.toFixed(1),
      height: +size.y.toFixed(1),
      depth: +size.z.toFixed(1),
      tris: this.kitStats.tris + bTris + crownTris,
      setTris: this.kitStats.tris + bTris,
      crownTris,
      calls: this.meshes.length + (this.barrier ? 1 : 0) + crownCalls,
      lights: this.lights.count,
      ledMetres: this.kitStats.ledMetres,
      windows: this.kitStats.windows,
      lanterns: this.kitStats.lanterns,
      barrierSections: this.kitStats.barrier,
      mode: this.look.mode,
      ledPattern: this.look.ledPatternX,
      buildMs: Math.round(this.buildMs),
      buildMaterialsMs: Math.round(this.timing.materials),
      buildGeometryMs: Math.round(this.timing.geometry),
      buildCrownMs: Math.round(this.timing.crown),
      texStoneMs: Math.round(this.mats.ms.stone),
      texDecorMs: Math.round(this.mats.ms.decor),
      envMs: Math.round(this.mats.ms.env),
      ...Object.fromEntries(Object.entries(crownStats).map(([k, v]) => [`crown.${k}`, v])),
    };
  }

  dispose(): void {
    this.app.scene.remove(this.root);
    for (const m of this.meshes) m.geometry.dispose();
    this.barrier?.geometry.dispose();
    this.mats.dispose();
  }
}
