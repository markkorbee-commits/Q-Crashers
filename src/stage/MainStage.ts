import * as THREE from 'three';
import type { App } from '../core/App';
import type { AnchorName } from '../core/Anchors';
import type { FrameContext, QualitySettings, System } from '../core/types';
import type { Platform, PlayerController } from '../player/PlayerController';
import { yawTowards } from '../player/spots';
import { CastleBuilder } from './castle/Castle';
import { SidesBuilder } from './castle/Sides';
import { barrierLayout, barrierRuns, barrierSegmentGeometry, DeckBuilder } from './deck/Deck';
import { SpeakerBuilder } from './deck/Speakers';
import { DragonCrown } from './DragonCrown';
import { createKit, type StageKit } from './kit';
import { armX, L } from './layout';
import { LookResolver } from './look/LookResolver';
import { StageMaterials } from './materials/StageMaterials';
import { StageLights } from './StageLights';
import { createStageLookEx, type StageLookEx } from './StageLook';

const RANK: Record<QualitySettings['level'], number> = { mobile: 0, medium: 1, high: 2, ultra: 3 };

const CANDLE = new THREE.Color('#ffb45a');

/** c += src * k (THREE.Color has no addScaled) */
function addScaled(c: THREE.Color, src: THREE.Color, k: number): THREE.Color {
  c.r += src.r * k;
  c.g += src.g * k;
  c.b += src.b * k;
  return c;
}

/**
 * The 2026 MainStage (RED, "Sacred Oath"), laid out on design-bible §5 (src/stage/layout.ts): the
 * gothic castle core with the DJ portal and the stairs, the central deck, side sections with corner
 * towers, the forward arms along the banks, PA, crowd barriers + the dragon/wings crown (DragonCrown,
 * built by its own module). Registers every stage anchor on the built geometry, the deck platform,
 * the deck / stage / barrier colliders and the deck spots.
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
    this.mats = await StageMaterials.create(app.renderer, q);
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
    const bl = barrierLayout(barrierRuns());
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
    const add = (geo: THREE.BufferGeometry | null, mat: THREE.Material, name: string) => {
      if (!geo) return;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = name;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.castShadow = mat !== m.led && mat !== m.decor;
      mesh.receiveShadow = mat === m.stone || mat === m.paint;
      this.root.add(mesh);
      this.meshes.push(mesh);
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
    const byX = (pts: THREE.Vector3[]) => [...pts].sort((p, q) => p.x - q.x || p.z - q.z);
    /** ring order: left arm from its far end towards the stage, then the right arm outwards */
    const ring = (pts: THREE.Vector3[]) => [...pts].sort((p, q) => Math.sign(p.x) - Math.sign(q.x) || Math.sign(p.x) * (p.z - q.z));
    // every deck_front point is at deck height (index 0 is read by the PlayerController)
    set('deck_front', byX(P.deckFront));
    set('deck_back', byX(P.deckBack));
    set('side_front', byX(P.sideFront));
    set('arm_posts', ring(P.armPosts));
    set('arm_ends', byX(P.armEnds));
    set('deck_gerbs', byX(P.deckGerbs));
    set('front_comets', byX(P.frontComets));
    set('roof_comets', byX(P.roofComets));
    set('side_rampart', byX(P.sideRampart));
    set('tower_torches', byX(P.towerTorches));
    set('corner_fireballs', byX(P.cornerFireballs));
    set('towers_top', byX(P.towersTop));
    set('co2', byX(P.co2));
    set('bengal', byX(P.bengal));
    set('mines', byX(P.mines));
    set('speaker_hangs', byX(P.speakerHangs));
    set('hang_glitter', byX(P.hangGlitter));
    set('dj_booth', [new THREE.Vector3(0, L.deckY + 0.3, L.boothZ - 1.0)]);
    set('fixtures_floor', byX(P.fixturesFloor));
    let c: ReturnType<DragonCrown['anchors']> | null = null;
    try {
      c = this.crown.anchors();
    } catch (e) {
      console.error('[stage] crown anchors failed', e);
    }
    // structure moving heads in rows (the lighting rig clusters consecutive points of a row)
    const truss = [...P.fixturesTruss];
    const lasers = [...P.laserStage];
    const roof = [...P.roof, ...P.sideRampart];
    if (c) {
      for (const row of c.wingFixtures) truss.push(...row);
      set('dragon_mouth', [c.dragonMouth]);
      set('dragon_eyes', [c.dragonEyes[0], c.dragonEyes[1]]);
      set('dragon_head', [c.dragonHead]);
      set('wing_tips', byX(c.wingTips));
      // "burning wings": the spar flames at ~60 % and ~90 % of every finger (crown points 7/8, 10/11, 13/14)
      const sparFlames = (pts: THREE.Vector3[]) => (pts.length >= 15 ? [7, 8, 10, 11, 13, 14].map((i) => pts[i]) : pts);
      set('wing_left', sparFlames(c.wingLeft));
      set('wing_right', sparFlames(c.wingRight));
      // lasers on the dragon's shoulders and on the inner / outer fingers (bible: flanks + wing bases)
      for (const sh of c.shoulders) lasers.push(sh.clone().add(new THREE.Vector3(0, 2.0, 0.2)));
      for (const w of [c.wingLeft, c.wingRight]) if (w.length >= 15) lasers.push(w[8].clone(), w[14].clone());
      roof.push(...c.roof);
    }
    set('laser_stage', byX(lasers));
    set('fixtures_truss', truss);
    set('roof', byX(roof));
  }

  private registerWorld(app: App): void {
    // raised walkable deck (the player on it is clamped to this rectangle; only 'deck*' colliders apply)
    const player = app.get<PlayerController>('player');
    const deck: Platform = { minX: -L.plinthX1, maxX: L.plinthX1, minZ: L.facadeZ + 0.05, maxZ: -0.05, y: L.deckY };
    if (player && Array.isArray(player.platforms)) {
      player.platforms.length = 0;
      player.platforms.push(deck);
    }
    const box = (minX: number, maxX: number, minZ: number, maxZ: number, tag: string) => app.addCollider({ kind: 'box', minX, maxX, minZ, maxZ, tag });
    // colliders ON the deck: porch (screen, stairs, side walls), portal niche, booth, towers, PA truss bases
    box(-L.porchHalf - 0.7, -L.portalW / 2 - 0.3, L.facadeZ, L.porchFrontZ, 'deck-porch');
    box(L.portalW / 2 + 0.3, L.porchHalf + 0.7, L.facadeZ, L.porchFrontZ, 'deck-porch');
    box(-L.portalW / 2 - 0.3, L.portalW / 2 + 0.3, L.facadeZ, L.porchFrontZ - L.portalDepth, 'deck-portal');
    box(-2.1, 2.1, L.boothZ - 0.6, L.boothZ + 0.6, 'deck-booth');
    for (const s of [-1, 1]) {
      const ox = 25.5;
      box(s > 0 ? ox - 2.5 : -ox - 2.5, s > 0 ? ox + 2.5 : -ox + 2.5, -15.2, -10.2, 'deck-tower');
      for (const [hx, hz] of [
        [L.innerHangX + 2.85, L.innerHangZ],
        [L.outerHangX + 2.85, L.outerHangZ],
      ])
        box(s * hx - 0.8, s * hx + 0.8, hz - 0.8, hz + 0.8, 'deck-truss');
      box(s > 0 ? L.sideX0 : -L.plinthX1, s > 0 ? L.plinthX1 : -L.sideX0, L.facadeZ, L.sideFrontZ, 'deck-side');
    }
    // stage body for ground walkers: deck + castle + backstage, side sections, corner towers
    box(-L.plinthX1, L.plinthX1, -45, 0.75, 'stage');
    box(-2.2, 2.2, 0, 2.25, 'stage-stairs');
    for (const s of [-1, 1]) {
      const sx = (a: number, b: number): [number, number] => [Math.min(s * a, s * b), Math.max(s * a, s * b)];
      const [a0, a1] = sx(L.plinthX1, L.corner.x - L.corner.w / 2);
      box(a0, a1, -45, L.ledgeFrontZ + 0.1, 'stage-side');
      const [c0, c1] = sx(L.corner.x - L.corner.w / 2, L.corner.x + L.corner.w / 2);
      box(c0, c1, -45, L.corner.z + L.corner.w / 2 + 1.0, 'stage-corner');
      // arm ramparts between the openings (4 m gates to the crest bars from Z 28 on)
      let z0 = L.corner.z + L.corner.w / 2;
      const spans: [number, number][] = [];
      for (const [oa, ob] of L.armOpenings) {
        spans.push([z0, oa]);
        z0 = ob;
      }
      for (const [za, zb] of spans) {
        const [r0, r1] = sx(armX(za) - 0.85, armX(zb) + 0.85);
        box(r0, r1, za - 0.4, zb + 0.4, 'stage-arm');
      }
      const E = L.armEnd;
      const [e0, e1] = sx(E.x - E.w / 2 - 1.4, E.x + E.w / 2);
      box(e0, e1, E.z - E.w / 2 - 0.4, E.z + E.w / 2, 'stage-armend');
    }
    // crowd barriers (front line + arm lines with the channels)
    for (const r of barrierRuns()) {
      const [ax, az] = r.a;
      const [bx, bz] = r.b;
      if (Math.abs(az - bz) < 1e-3) box(Math.min(ax, bx), Math.max(ax, bx), az - 0.5, az + 0.5, 'barrier');
      else if (Math.abs(ax - bx) < 1e-3) box(ax - 0.5, ax + 0.5, Math.min(az, bz), Math.max(az, bz), 'barrier');
      else {
        const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
        for (let i = 0; i <= n; i++) app.addCollider({ kind: 'circle', x: ax + ((bx - ax) * i) / n, z: az + ((bz - az) * i) / n, r: 0.5, tag: 'barrier' });
      }
    }
    // spots on the deck
    const look = new THREE.Vector3(0, 6, 40);
    const spot = (id: string, label: string, x: number, z: number, target: THREE.Vector3, pitch: number) => {
      const position = new THREE.Vector3(x, L.deckY, z);
      app.addSpot({ id, label, position, yaw: yawTowards(position, target), pitch });
    };
    spot('stage_left', 'Stage left (deck)', -30, -3.4, look, -0.02);
    spot('stage_right', 'Stage right (deck)', 30, -3.4, look, -0.02);
    spot('dj_booth', 'Behind the decks', 0, L.boothZ - 1.0, new THREE.Vector3(0, 2, 60), 0.02);
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
    // soft-limited: env wash intensities above ~1 compress instead of blowing out the set
    const wi = 1.5 * (1 - Math.exp(-Math.max(0, look.washIntensity) / 1.1));
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
    const M = look.master;
    const dorm = look.mode === 'dormant' ? 0.45 : 1;
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
    (l.uArcade.value as THREE.Color).copy(look.arcade).multiplyScalar(1.6 * (0.25 + 0.75 * look.windows) * M);
    (l.uLamp.value as THREE.Color).copy(look.lamp).multiplyScalar((2 + 10 * look.ledIntensity) * M * dorm);
    (l.uLantern.value as THREE.Color).copy(look.lantern).multiplyScalar((3.5 + 3 * look.energy) * M * dorm);
    (l.uCandle.value as THREE.Color).copy(CANDLE).multiplyScalar(1.4 * Math.max(M, 0.15));
    (l.uPortal.value as THREE.Color).copy(look.portal).multiplyScalar((0.5 + 0.8 * look.mouth) * M);
    l.uPulse.value = look.pulse;
    l.uStrobe.value = look.strobe;
    l.uContent.value = look.content;
    l.uContentMix.value = look.contentMix;
    (l.uContentCol.value as THREE.Color).copy(look.contentColor).multiplyScalar(2.2 * M);
    u.uGlow.value.multiplyScalar(M);
  }

  setQuality(q: QualitySettings): void {
    this.lights.setQuality(q);
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
    this.hooked = false;
    this.app.scene.remove(this.root);
    for (const m of this.meshes) m.geometry.dispose();
    this.barrier?.geometry.dispose();
    this.mats.dispose();
  }
}
