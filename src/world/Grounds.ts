import * as THREE from 'three';
import type { App } from '../core/App';
import type { FrameContext, NamedSpot, QualitySettings, System } from '../core/types';
import { pitchTowards, yawTowards } from '../player/spots';
import { GeoBuilder, lin } from './geom';
import { Landmarks } from './landmarks';
import { LanternPillars } from './pillars';
import { buildProps, type PropsOut } from './props';
import { ARM, CAM_PEN, DECK_HALF, LANTERN_Y, PILLAR, PILLAR_ANCHOR_Y, PILLARS, SIDE_FRONT_Z, STAGE_HALF, TERRACE, terrainHeight } from './site';
import { buildStructures } from './structures';
import { patchWorldMaterial } from './worldLights';

/**
 * The grounds of the RED field: the 8 lantern pillars (delay towers), barriers and fences, the low FOH /
 * camera platform, the photo terrace, entrances, facilities, flags, and the distant skyline. Registers the world anchors
 * (pillars_top/base, delay_towers, foh, laser_field, fireworks_back/sides), the named viewing spots
 * and the colliders. Pillar lamps/shafts follow app.env (lighting engineer) every frame.
 */
export class GroundsSystem implements System {
  readonly name = 'grounds';
  private app!: App;
  private enabled = true;
  private readonly root = new THREE.Group();
  private pillars!: LanternPillars;
  private landmarks!: Landmarks;
  private props!: PropsOut;
  private structTris = 0;
  private proxy?: THREE.Object3D;
  private readonly size = new THREE.Vector2();
  private envSys: (System & { skyLevel?: number }) | null | undefined;

  init(app: App): void {
    this.app = app;
    const q = app.quality;
    const low = q.level === 'mobile';
    this.root.name = 'grounds';
    app.scene.add(this.root);

    this.pillars = new LanternPillars(q.textureSize, low);
    this.root.add(this.pillars.group);
    const s = buildStructures(this.root, low);
    this.structTris = s.triangles;
    s.colliders.forEach((c) => app.addCollider(c));
    this.props = buildProps(this.root, low);
    this.props.colliders.forEach((c) => app.addCollider(c));
    this.landmarks = new Landmarks(this.props.lamps, low);
    this.root.add(this.landmarks.group);

    this.registerAnchors();
    this.registerSpots();
    const sp = app.params.get('stageproxy');
    if (sp !== null) this.buildStageProxy(sp);
  }

  // -------------------------------------------------------------------------------------------

  private registerAnchors(): void {
    const A = this.app.anchors;
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    // pillar order = PILLARS (row-major from the stage outwards, left before right) — chase index.
    // 'pillars_top' Y = capital top + 3.2 (the rigs derive the capital ledge from it, bible §5.10)
    A.set('pillars_top', PILLARS.map((p) => v(p.x, PILLAR_ANCHOR_Y, p.z)));
    A.set('pillars_base', PILLARS.map((p) => v(p.x, PILLAR.deckH, p.z)));
    // fixture positions on the delay towers: the capital top (moving heads on its corners)
    A.set('delay_towers', PILLARS.map((p) => v(p.x, PILLAR.capTop + 0.4, p.z)));
    // FOH / camera platform on the axis (bible §5.11): deck centre (floor fixtures, crew, director)
    const yF = terrainHeight(CAM_PEN.x, CAM_PEN.z) + CAM_PEN.deckY;
    A.set('foh', [v(CAM_PEN.x, yF, CAM_PEN.z)]);
    // field laser emitters: pillar capitals (beams between pillar tops) + stands at the platform front
    const zF = CAM_PEN.z - CAM_PEN.d / 2 + 0.4;
    A.set('laser_field', [...PILLARS.map((p) => v(p.x, PILLAR.capTop + 0.5, p.z)), v(-5.6, yF + 2.2, zF), v(5.6, yF + 2.2, zF)]);
    // aerial shells from mortar racks on the rear bank between the stage rear (z ≈ −30) and the tree belt (z ≈ −57)
    A.set('fireworks_back', Array.from({ length: 9 }, (_, i) => {
      const x = -80 + i * 20;
      const z = -40;
      return v(x, terrainHeight(x, z), z);
    }));
    // ground fireworks / gerb fans along both bank crests (frames f025/f033: fans along the sides)
    const sides: THREE.Vector3[] = [];
    for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) {
      const x = sx * 104.5,
        z = 6 + k * 19;
      sides.push(v(x, terrainHeight(x, z), z));
    }
    A.set('fireworks_sides', sides);
  }

  private registerSpots(): void {
    const focus = new THREE.Vector3(0, 13, -6);
    const S = (id: string, label: string, x: number, z: number, look = focus, pitchScale = 0.55): NamedSpot => {
      const position = new THREE.Vector3(x, 0, z);
      const eye = new THREE.Vector3(x, terrainHeight(x, z), z);
      return { id, label, position, yaw: yawTowards(eye, look), pitch: pitchTowards(eye, look) * pitchScale };
    };
    // the official Endshow photo P (design-bible §5.12): front rail of the photo terrace, deck Y 5,
    // eye ≈ 6.8 m, looking straight down the aisle, slightly up
    const T = TERRACE;
    const photo: NamedSpot = { id: 'photo', label: 'Photo terrace (official photo)', position: new THREE.Vector3(-0.9, T.deckY, T.z0 + 1.6), yaw: 0, pitch: 0.06 };
    const spots: NamedSpot[] = [
      S('entrance', 'Field entrance (E1)', 121.4, 151.2),
      S('back', 'Back of the field', 0, 134),
      // just behind the FOH / camera platform on the axis, ≈ 95 m from the stage front
      S('foh', 'FOH / camera platform', 3.5, CAM_PEN.z + CAM_PEN.d / 2 + 2.2),
      photo,
      S('middle', 'Middle of the field', -4, 74),
      S('crowd', 'In the crowd', 6, 32),
      S('front', 'Front row', 0, 5.5, new THREE.Vector3(0, 16, -6), 0.6),
      S('side_left', 'Left bank', -70, 40),
      S('side_right', 'Right bank', 70, 40),
      S('dragon_view', 'Dragon view', 0, 45, new THREE.Vector3(0, 14, -4), 0.75),
      S('aisle', 'Lantern aisle', 0, 118),
      S('crest_left', 'Left crest (bars)', -93, 90),
      S('decking', 'Decking by the lake', -24, 162),
    ];
    for (const s of spots) this.app.addSpot(s);
  }

  /**
   * Scale-reference stand-in for the MainStage (only with ?stageproxy): 'box' = a 184 × 28 m block,
   * anything else = a silhouette of the design-bible outline (deck X ±37 at 1.9 m, castle facade Z −12
   * to 9.5 m with towers to 16–18 m, wings to 28 m, side sections to X ±92 at Z −4, corner towers,
   * forward arms along the banks to Z +58).
   */
  private buildStageProxy(kind: string): void {
    const mat = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, emissive: new THREE.Color(0.02, 0.004, 0.004) }), { key: 'proxy' });
    const b = new GeoBuilder();
    if (kind === 'box') {
      b.box(2 * STAGE_HALF, 28, 26, 0, 14, -13, lin('#401010'));
    } else {
      const stone = lin('#6b6a70');
      const red = lin('#6a1a18');
      b.box(2 * DECK_HALF, 1.9, 14, 0, 0.95, -7, lin('#3a0a12'));
      b.box(2 * DECK_HALF, 9.5, 12, 0, 4.75, -18, stone);
      for (const x of [-25.5, -17.3, 17.3, 25.5]) b.box(4.5, 16, 4.5, x, 8, -13, stone);
      // dragon head + wings (rough volumes)
      b.box(9, 13, 8, -2, 14, -9, red);
      for (const sx of [-1, 1]) {
        for (const [x, y] of [[14.5, 26.5], [29, 28], [40.5, 26.5]] as [number, number][]) {
          b.beam(new THREE.Vector3(sx * 26, 4, -17.5), new THREE.Vector3(sx * x, y, -21), 0.9, lin('#b0602a'));
        }
        b.box(30, 12, 1, sx * 26, 17, -20, lin('#8a2a1a'));
        // side sections (front Z −4, wall walk 9.5 over the rising bank), corner tower, arm
        const w = STAGE_HALF - DECK_HALF;
        b.box(w, 10.5, 20, sx * (DECK_HALF + w / 2), 4.25, SIDE_FRONT_Z - 10, stone);
        b.box(6, 16, 6, sx * STAGE_HALF, 7, SIDE_FRONT_Z, stone);
        const zm = (ARM.z0 + ARM.z1) / 2;
        const xm = (ARM.x0 + ARM.x1) / 2;
        b.box(1.2, 1.4, ARM.z1 - ARM.z0, sx * xm, terrainHeight(xm, zm) + 0.7, zm, stone);
        b.box(4, 8, 4, sx * ARM.x1, terrainHeight(ARM.x1, ARM.z1) + 4, ARM.z1, stone);
      }
    }
    const m = new THREE.Mesh(b.build(), mat);
    m.name = 'stage-proxy';
    this.proxy = m;
    this.app.scene.add(m);
  }

  // -------------------------------------------------------------------------------------------

  update(ctx: FrameContext): void {
    if (!this.enabled) return;
    const env = this.app.env;
    this.pillars.update(env, env.haze);
    this.props.update(ctx.showTime);
    this.app.renderer.getDrawingBufferSize(this.size);
    if (this.envSys === undefined) this.envSys = this.app.get<System & { skyLevel?: number }>('environment') ?? null;
    this.landmarks.update(ctx.showTime, this.app.renderer.getPixelRatio(), this.size.y, this.envSys?.skyLevel ?? 1);
  }

  setQuality(_q: QualitySettings): void {}

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.root.visible = on;
  }

  stats(): Record<string, number | string> {
    return {
      pillars: PILLARS.length,
      lanternY: LANTERN_Y,
      pillarTris: this.pillars?.triangles ?? 0,
      structureTris: Math.round(this.structTris + (this.props?.triangles ?? 0)),
      landmarkTris: Math.round(this.landmarks?.triangles ?? 0),
      distantLights: this.landmarks?.lightCount ?? 0,
      colliders: this.app?.colliders.length ?? 0,
      proxy: this.proxy ? 'on' : 'off',
    };
  }
}
