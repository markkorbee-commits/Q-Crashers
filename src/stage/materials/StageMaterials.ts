import * as THREE from 'three';
import type { QualitySettings } from '../../core/types';
import { type DecorSet, makeDecorAtlas } from './decorAtlas';
import { createLedMaterial } from './LedMaterial';
import { createStageUniforms, makeNightEnv, patchStageShading, type StageUniforms } from './StageShading';
import { makeGrainTextures, makeStoneTextures, type PbrSet } from './stoneTextures';
import { texMean } from './texMean';

/** one set material folded into the mobile set mix */
export interface SetMixPart {
  metal: number;
  rough: number;
  /** env-map (reflection) intensity */
  env: number;
  /** virtual flood strength (patchStageShading `flood`) */
  flood: number;
  /** linear colour factor baked into the vertex colour (material colour / texture mean ratio) */
  tint: [number, number, number];
}

/** K1-style cabinet front: black perforated grille, chamfered frame, rigging hardware hints. */
function makeGrilleTexture(aniso: number): THREE.Texture {
  const W = 256,
    H = 96;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#121214';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#26262a';
  for (let y = 6; y < H - 6; y += 4) for (let x = 8 + ((y / 4) % 2) * 2; x < W - 8; x += 4) g.fillRect(x, y, 2, 2);
  g.strokeStyle = '#3a3a40';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, W - 3, H - 3);
  g.fillStyle = '#4a4a50';
  g.fillRect(W / 2 - 18, H - 12, 36, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

/**
 * All MainStage materials (created once): procedural PBR stone, paint, black steel, gold/bronze,
 * decor atlas, speaker grille, aluminium barrier and the LED shader. Every lit material is
 * patched with the shared virtual-flood shading (StageShading.ts).
 */
export class StageMaterials {
  readonly u: StageUniforms = createStageUniforms();
  readonly env: THREE.Texture;
  readonly stone: THREE.MeshStandardMaterial;
  readonly paint: THREE.MeshStandardMaterial;
  readonly metal: THREE.MeshStandardMaterial;
  readonly gold: THREE.MeshStandardMaterial;
  readonly decor: THREE.MeshStandardMaterial;
  readonly speaker: THREE.MeshStandardMaterial;
  readonly barrier: THREE.MeshStandardMaterial;
  readonly led: THREE.ShaderMaterial;
  private textures: THREE.Texture[] = [];
  /** generation timings (ms) */
  readonly ms = { env: 0, stone: 0, decor: 0 };

  /** generate all procedural textures, yielding to the event loop between the heavy steps */
  static async create(renderer: THREE.WebGLRenderer, q: QualitySettings): Promise<StageMaterials> {
    const idle = () => new Promise<void>((r) => setTimeout(r, 0));
    const aniso = Math.min(q.anisotropy, renderer.capabilities.getMaxAnisotropy());
    const ms = { env: 0, stone: 0, decor: 0 };
    let t = performance.now();
    const env = makeNightEnv(renderer);
    ms.env = performance.now() - t;
    await idle();
    t = performance.now();
    const stone = makeStoneTextures(q.level === 'mobile' ? 512 : 1024, aniso);
    ms.stone = performance.now() - t;
    await idle();
    t = performance.now();
    const grain = makeGrainTextures(q.level === 'mobile' ? 128 : 256, aniso);
    const decor = makeDecorAtlas(q.level === 'mobile' ? 512 : 1024, aniso);
    ms.decor = performance.now() - t;
    await idle();
    return new StageMaterials(aniso, { env, stone, grain, decor }, ms, q.level === 'mobile');
  }

  private constructor(
    aniso: number,
    tex: { env: THREE.Texture; stone: PbrSet; grain: PbrSet; decor: DecorSet },
    ms: { env: number; stone: number; decor: number },
    mobile: boolean,
  ) {
    const { stone, grain, decor } = tex;
    this.env = tex.env;
    Object.assign(this.ms, ms);
    const grille = makeGrilleTexture(aniso);
    this.textures.push(stone.map, stone.normalMap, stone.orm, grain.map, grain.normalMap, grain.orm, decor.map, decor.emissiveMap, decor.normalMap, grille, this.env);

    this.stone = new THREE.MeshStandardMaterial({
      name: 'stage-stone',
      map: stone.map,
      normalMap: stone.normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughnessMap: stone.orm,
      metalnessMap: stone.orm,
      roughness: 1,
      metalness: 1,
      vertexColors: true,
      envMap: this.env,
      envMapIntensity: 0.55,
    });
    // the off-white print of the daytime photos is ~2x the old grey: scaled back in the show, and a
    // little further (round 4, objective match to the official video): at night the printed castle
    // is a dark flat that only reads where the show lights it
    patchStageShading(this.stone, this.u, { flood: 1, nightK: 0.36 });

    this.paint = new THREE.MeshStandardMaterial({
      name: 'stage-paint',
      map: grain.map,
      normalMap: grain.normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: 0.82,
      metalness: 0,
      vertexColors: true,
      envMap: this.env,
      envMapIntensity: 0.35,
    });
    patchStageShading(this.paint, this.u, { flood: 0.7 });

    this.metal = new THREE.MeshStandardMaterial({
      name: 'stage-metal',
      map: grain.map,
      roughnessMap: grain.orm,
      roughness: 0.62,
      metalness: 0.75,
      vertexColors: true,
      envMap: this.env,
      envMapIntensity: 0.9,
    });
    patchStageShading(this.metal, this.u, { flood: 0.6 });

    this.gold = new THREE.MeshStandardMaterial({
      name: 'stage-gold',
      color: new THREE.Color('#d0a45a'),
      map: grain.map,
      roughnessMap: grain.orm,
      normalMap: grain.normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughness: 0.48,
      metalness: 1,
      envMap: this.env,
      envMapIntensity: 1.6,
    });
    patchStageShading(this.gold, this.u, { flood: 1 });

    this.decor = new THREE.MeshStandardMaterial({
      name: 'stage-decor',
      map: decor.map,
      emissiveMap: decor.emissiveMap,
      emissive: new THREE.Color(1, 1, 1),
      emissiveIntensity: 1,
      normalMap: decor.normalMap,
      roughness: 0.62,
      metalness: 0.05,
      envMap: this.env,
      envMapIntensity: 0.5,
    });
    patchStageShading(this.decor, this.u, { flood: 1, glowGroups: true, nightK: 0.66 });

    this.speaker = new THREE.MeshStandardMaterial({
      name: 'stage-speaker',
      map: grille,
      roughness: 0.78,
      metalness: 0.15,
      envMap: this.env,
      envMapIntensity: 0.4,
    });
    patchStageShading(this.speaker, this.u, { flood: 0.35 });

    this.barrier = new THREE.MeshStandardMaterial({
      name: 'stage-barrier',
      color: new THREE.Color('#5a6066'),
      map: grain.map,
      roughnessMap: grain.orm,
      roughness: 0.62,
      metalness: 0.8,
      envMap: this.env,
      envMapIntensity: 0.6,
    });
    patchStageShading(this.barrier, this.u, { flood: 0.2 });

    this.led = createLedMaterial();

    if (mobile) {
      // MOBILE: paint / metal / gold / speakers / barrier in ONE draw (per-vertex PBR + flood level,
      // the part's texture mean baked into the vertex colour; the shared grain print stays)
      this.setMix = new THREE.MeshStandardMaterial({
        name: 'stage-setmix',
        map: grain.map,
        normalMap: grain.normalMap,
        normalScale: new THREE.Vector2(0.3, 0.3),
        roughness: 1,
        metalness: 1,
        vertexColors: true,
        envMap: this.env,
        envMapIntensity: 1,
      });
      patchStageShading(this.setMix, this.u, { perVertex: true });
      const g = texMean(grain.map);
      const gr = texMean(grain.orm)[1];
      const gs = texMean(grille);
      const flat: [number, number, number] = [1, 1, 1];
      const rel = (m: [number, number, number]): [number, number, number] => [m[0] / Math.max(1e-3, g[0]), m[1] / Math.max(1e-3, g[1]), m[2] / Math.max(1e-3, g[2])];
      const gold = this.gold.color;
      const bar = this.barrier.color;
      this.mixParts = {
        paint: { metal: 0, rough: 0.82, env: 0.35, flood: 0.7, tint: flat },
        metal: { metal: 0.75, rough: 0.62 * gr, env: 0.9, flood: 0.6, tint: flat },
        gold: { metal: 1, rough: 0.48 * gr, env: 1.6, flood: 1, tint: [gold.r, gold.g, gold.b] },
        speaker: { metal: 0.15, rough: 0.78, env: 0.4, flood: 0.35, tint: rel(gs) },
        barrier: { metal: 0.8, rough: 0.62 * gr, env: 0.6, flood: 0.2, tint: [bar.r, bar.g, bar.b] },
      };
    }
  }

  /** MOBILE set mix (null on the other presets) + the per-part values folded into it */
  readonly setMix: THREE.MeshStandardMaterial | null = null;
  readonly mixParts: Record<'paint' | 'metal' | 'gold' | 'speaker' | 'barrier', SetMixPart> | null = null;

  /**
   * Prepare a built set geometry for the mobile set mix: `smr` (metalness, roughness, reflection
   * level, flood strength) per vertex and the part's tint / texture mean in the vertex colour.
   */
  toSetMix(g: THREE.BufferGeometry, part: keyof NonNullable<StageMaterials['mixParts']>): THREE.BufferGeometry {
    const p = this.mixParts![part];
    const n = g.attributes.position.count;
    let col = g.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (!col) {
      col = new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3);
      g.setAttribute('color', col);
    }
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    const t = p.tint;
    for (let i = 0; i < n; i++) col.setXYZ(i, col.getX(i) * t[0], col.getY(i) * t[1], col.getZ(i) * t[2]);
    const a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      a[i * 4] = p.metal;
      a[i * 4 + 1] = p.rough;
      a[i * 4 + 2] = p.env;
      a[i * 4 + 3] = p.flood;
    }
    g.setAttribute('smr', new THREE.BufferAttribute(a, 4));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'smr'].includes(k)) g.deleteAttribute(k);
    g.clearGroups();
    return g;
  }

  /** materials of the crown without an env map get ours (only when the scene has no environment) */
  adoptEnv(root: THREE.Object3D, scene: THREE.Scene): number {
    if (scene.environment) return 0;
    let n = 0;
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      const list = Array.isArray(m) ? m : m ? [m] : [];
      for (const mat of list) {
        const s = mat as THREE.MeshStandardMaterial;
        if (s.isMeshStandardMaterial && !s.envMap) {
          s.envMap = this.env;
          s.needsUpdate = true;
          n++;
        }
      }
    });
    return n;
  }

  get textureCount(): number {
    return this.textures.length;
  }

  dispose(): void {
    for (const t of this.textures) t.dispose();
    for (const m of [this.stone, this.paint, this.metal, this.gold, this.decor, this.speaker, this.barrier, this.led]) m.dispose();
    this.setMix?.dispose();
  }
}
