import * as THREE from 'three';
import type { App } from '../core/App';
import type { FrameContext, NamedSpot, QualitySettings, System } from '../core/types';
import { pitchTowards, yawTowards } from '../player/spots';
import { GeoBuilder, lin } from './geom';
import { Landmarks } from './landmarks';
import { LanternPillars } from './pillars';
import { buildProps, type PropsOut } from './props';
import { ARM_TIP, FOH, LANTERN_Y, PILLAR, PILLARS, STAGE_HALF, terrainHeight } from './site';
import { buildStructures } from './structures';
import { patchWorldMaterial } from './worldLights';

/**
 * The grounds of the RED field: the 8 lantern pillars (delay towers), barriers and fences, the FOH /
 * press tower, entrances, facilities, flags, and the distant skyline. Registers the world anchors
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
    // pillar order = PILLARS (row-major from the stage outwards, left before right) — chase index
    A.set('pillars_top', PILLARS.map((p) => v(p.x, PILLAR.top, p.z)));
    A.set('pillars_base', PILLARS.map((p) => v(p.x, PILLAR.plinthH, p.z)));
    // fixture positions on the delay towers: the capital top (moving heads on its corners)
    A.set('delay_towers', PILLARS.map((p) => v(p.x, PILLAR.capTop + 0.4, p.z)));
    // FOH / press tower: front edge of the roof (followspots / field lasers / camera position)
    const yF = terrainHeight(0, FOH.z0);
    A.set('foh', [v(0, yF + FOH.roof + 0.3, FOH.z0 - 0.4)]);
    // field laser emitters: pillar capitals (beams between pillar tops) + the FOH roof corners
    A.set('laser_field', [...PILLARS.map((p) => v(p.x, PILLAR.capTop + 0.5, p.z)), v(-6.5, yF + FOH.roof + 0.2, FOH.z0), v(6.5, yF + FOH.roof + 0.2, FOH.z0)]);
    // aerial shells from mortar racks on the rear bank behind the stage (research: Z −30 … −50)
    A.set('fireworks_back', Array.from({ length: 9 }, (_, i) => {
      const x = -80 + i * 20;
      const z = -52;
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
    const spots: NamedSpot[] = [
      S('entrance', 'Field entrance (E1)', 112, 147),
      S('back', 'Back of the field', 0, 134),
      S('foh', 'FOH tower', 4, 146),
      S('middle', 'Middle of the field', -4, 74),
      S('crowd', 'In the crowd', 6, 32),
      S('front', 'Front row', 0, 5.5, new THREE.Vector3(0, 16, -6), 0.6),
      S('side_left', 'Left bank', -70, 40),
      S('side_right', 'Right bank', 70, 40),
      S('dragon_view', 'Dragon view', 0, 45, new THREE.Vector3(0, 14, -4), 0.75),
      S('aisle', 'Lantern aisle', 0, 118),
      S('crest_left', 'Left crest (bars)', -100, 12),
      S('decking', 'Decking by the lake', -24, 162),
    ];
    for (const s of spots) this.app.addSpot(s);
  }

  /**
   * Scale-reference stand-in for the MainStage (only with ?stageproxy): 'box' = the 120 × 40 m
   * scaffold placeholder, anything else = a silhouette at the canonical dimensions
   * (stage-canonical.md: deck 1.9 m, castle wall 9.3 m, towers 13–16 m, wing tips ~25 m, arms).
   */
  private buildStageProxy(kind: string): void {
    const mat = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, emissive: new THREE.Color(0.02, 0.004, 0.004) }), { key: 'proxy' });
    const b = new GeoBuilder();
    if (kind === 'box') {
      b.box(120, 40, 20, 0, 20, -10, lin('#401010'));
    } else {
      const stone = lin('#6b6a70');
      const red = lin('#6a1a18');
      b.box(2 * STAGE_HALF, 1.9, 18, 0, 0.95, -9, lin('#3a0a12'));
      b.box(96, 9.3, 6, 0, 1.9 + 4.65, -9, stone);
      for (const x of [-46, -34, -20, 20, 34, 46]) b.box(5, 14.5, 5, x, 7.25, -9, stone);
      // dragon head + wings (rough volumes at canonical heights)
      b.box(9, 15, 8, 0, 12, -6, red);
      for (const sx of [-1, 1]) {
        for (const [x, y] of [[14, 24], [28, 25.5], [39, 24.5]] as [number, number][]) {
          b.beam(new THREE.Vector3(sx * 6, 12, -14), new THREE.Vector3(sx * x, y, -16), 0.9, lin('#b0602a'));
        }
        b.box(34, 10, 1, sx * 22, 16, -16, lin('#8a2a1a'));
        // arms to the field corners
        const a = new THREE.Vector3(sx * STAGE_HALF, 0, 0),
          c = new THREE.Vector3(sx * ARM_TIP.x, 0, ARM_TIP.z);
        const len = a.distanceTo(c);
        const yaw = Math.atan2(-(c.z - a.z), c.x - a.x);
        const mid = a.clone().add(c).multiplyScalar(0.5);
        b.box(len, 7, 3, mid.x, terrainHeight(mid.x, mid.z) + 3.5, mid.z, stone, yaw);
        b.box(28, 9, 6, sx * 74, 4.5, -8, stone);
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
    const envSys = this.app.get<System & { skyLevel?: number }>('environment');
    this.landmarks.update(ctx.showTime, this.app.renderer.getPixelRatio(), this.size.y, envSys?.skyLevel ?? 1);
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
