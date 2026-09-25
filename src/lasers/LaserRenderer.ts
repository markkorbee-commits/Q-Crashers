import * as THREE from 'three';
import type { QualitySettings } from '../core/types';
import type { Emitter } from './LaserRig';
import { makeHazeNoise3D } from './noise3d';
import { BEAM_FRAG, BEAM_VERT, SPRITE_FRAG, SPRITE_VERT, SURF_FRAG, SURF_VERT } from './shaders';

const BEAM_STRIDE = 16;
const SURF_STRIDE = 24;
const SPRITE_STRIDE = 8;
/** vertices along a beam ribbon (redistributed around the camera's closest point in the shader) */
const BEAM_SEGMENTS = 16;

/** surface kinds (instance attribute sC.w) */
export const SURF_SHEET = 0;
export const SURF_CONE = 1;
/** the low-fog layer lit where the sheets skim it ("laser sea") */
export const SURF_FOG = 2;

/**
 * Laser segment budget per quality level — research/design-bible.md §7.4 (ultra 640 / high 400 /
 * medium 200 / mobile 96). The quality preset's laserBudget can only lower it. Big drawing buffers
 * (4K, high-DPR phones) get a further fill-rate cut; the generators then draw fewer, brighter and
 * slightly wider beams (per-beam power ∝ 1/√n) so the figures keep their weight.
 */
const BIBLE_BEAMS: Record<string, number> = { ultra: 640, high: 400, medium: 200, mobile: 96 };
/** drawing-buffer pixel count up to which the full budget applies */
const FULL_BUDGET_PIXELS = 2.1e6;

export interface SurfaceQuality {
  maxSurfaces: number;
  segU: number;
  segV: number;
}

function surfaceQuality(q: QualitySettings): SurfaceQuality {
  switch (q.level) {
    case 'ultra':
      return { maxSurfaces: 12, segU: 96, segV: 40 };
    case 'high':
      return { maxSurfaces: 9, segU: 80, segV: 34 };
    case 'medium':
      return { maxSurfaces: 6, segU: 60, segV: 26 };
    default:
      return { maxSurfaces: 4, segU: 44, segV: 18 };
  }
}

/**
 * GPU side of the laser system: 3 instanced draw calls (beams, surfaces, sprites) + 1 instanced
 * housing mesh. The CPU writes instance data into preallocated Float32Arrays every frame and uploads
 * only the used range.
 */
export class LaserRenderer {
  readonly group = new THREE.Group();
  /** allocated beam instances (the quality budget) */
  beamCap = 0;
  /** beams the generators may use this frame (≤ beamCap, scaled down for very large drawing buffers) */
  beamBudget = 0;
  surfCap = 0;
  spriteCap = 0;
  beamCount = 0;
  surfCount = 0;
  spriteCount = 0;
  sq: SurfaceQuality = { maxSurfaces: 4, segU: 44, segV: 18 };

  private beamData = new Float32Array(0);
  private surfData = new Float32Array(0);
  private spriteData = new Float32Array(0);
  private beamBuf!: THREE.InstancedInterleavedBuffer;
  private surfBuf!: THREE.InstancedInterleavedBuffer;
  private spriteBuf!: THREE.InstancedInterleavedBuffer;
  private beamGeo!: THREE.InstancedBufferGeometry;
  private surfGeo!: THREE.InstancedBufferGeometry;
  private spriteGeo!: THREE.InstancedBufferGeometry;
  private beamMesh!: THREE.Mesh;
  private surfMesh!: THREE.Mesh;
  private spriteMesh!: THREE.Mesh;
  private housings: THREE.InstancedMesh | null = null;
  private housingMat = new THREE.MeshStandardMaterial({ color: '#16181c', metalness: 0.55, roughness: 0.45 });
  private noise: THREE.Data3DTexture | null = null;
  readonly shared: Record<string, THREE.IUniform>;
  private beamMat: THREE.ShaderMaterial;
  private surfMat: THREE.ShaderMaterial;
  private spriteMat: THREE.ShaderMaterial;

  constructor() {
    this.group.name = 'Lasers';
    this.shared = {
      uNoise: { value: null },
      uDrift: { value: new THREE.Vector3() },
      uHaze: { value: 0.6 },
      uLowHaze: { value: 0 },
      uNoiseAmt: { value: 0.75 },
      uOct: { value: 2 },
      uFogD: { value: 0 },
      uFogNear: { value: 1 },
      uFogFar: { value: 2000 },
      uFogMode: { value: 0 },
      uPixAng: { value: 0.002 },
      uTime: { value: 0 },
      uFlow: { value: 0 },
      uExt: { value: 0.004 },
    };
    const common = {
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    } as const;
    this.beamMat = new THREE.ShaderMaterial({
      ...common,
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: { ...this.shared, uGain: { value: 1 }, uHalo: { value: 1 } },
    });
    this.surfMat = new THREE.ShaderMaterial({
      ...common,
      vertexShader: SURF_VERT,
      fragmentShader: SURF_FRAG,
      uniforms: { ...this.shared, uGainS: { value: 1 } },
    });
    this.spriteMat = new THREE.ShaderMaterial({
      ...common,
      vertexShader: SPRITE_VERT,
      fragmentShader: SPRITE_FRAG,
      uniforms: { ...this.shared },
    });
    this.beamMat.name = 'laser-beams';
    this.surfMat.name = 'laser-sheets';
    this.spriteMat.name = 'laser-flares';
  }

  get beamUniforms(): Record<string, THREE.IUniform> {
    return this.beamMat.uniforms;
  }

  get surfUniforms(): Record<string, THREE.IUniform> {
    return this.surfMat.uniforms;
  }

  init(q: QualitySettings): void {
    this.noise = makeHazeNoise3D(q.level === 'mobile' ? 32 : 64);
    this.shared.uNoise.value = this.noise;
    this.setQuality(q);
  }

  setQuality(q: QualitySettings): void {
    const beams = Math.max(32, Math.min(q.laserBudget, BIBLE_BEAMS[q.level] ?? q.laserBudget));
    this.beamBudget = beams;
    this.sq = surfaceQuality(q);
    this.shared.uOct.value = q.volumetrics ? 2 : 1;
    this.shared.uNoiseAmt.value = q.volumetrics ? 0.78 : 0.6;
    if (beams !== this.beamCap) this.buildBeams(beams);
    this.buildSurfaces(this.sq);
    const sprites = beams + 96;
    if (sprites !== this.spriteCap) this.buildSprites(sprites);
  }

  /** per-frame budget from the drawing-buffer size (fill rate of the additive ribbons scales with it) */
  updateBudget(pixels: number): number {
    const k = pixels > FULL_BUDGET_PIXELS ? Math.max(0.5, Math.sqrt(FULL_BUDGET_PIXELS / pixels)) : 1;
    this.beamBudget = Math.max(32, Math.floor(this.beamCap * k));
    return this.beamBudget;
  }

  // ---------------------------------------------------------------- geometry
  private buildBeams(cap: number): void {
    if (this.beamMesh) {
      this.group.remove(this.beamMesh);
      this.beamGeo.dispose();
    }
    this.beamCap = cap;
    this.beamData = new Float32Array(cap * BEAM_STRIDE);
    const g = new THREE.InstancedBufferGeometry();
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= BEAM_SEGMENTS; i++) {
      const k = i / BEAM_SEGMENTS;
      pos.push(k, -1, 0, k, 1, 0);
      if (i < BEAM_SEGMENTS) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const buf = new THREE.InstancedInterleavedBuffer(this.beamData, BEAM_STRIDE, 1);
    buf.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iA', new THREE.InterleavedBufferAttribute(buf, 4, 0));
    g.setAttribute('iB', new THREE.InterleavedBufferAttribute(buf, 4, 4));
    g.setAttribute('iC', new THREE.InterleavedBufferAttribute(buf, 4, 8));
    g.setAttribute('iD', new THREE.InterleavedBufferAttribute(buf, 4, 12));
    g.instanceCount = 0;
    this.beamBuf = buf;
    this.beamGeo = g;
    this.beamMesh = new THREE.Mesh(g, this.beamMat);
    this.beamMesh.frustumCulled = false;
    this.beamMesh.renderOrder = 20;
    this.beamMesh.name = 'laser-beams';
    this.group.add(this.beamMesh);
  }

  private buildSurfaces(sq: SurfaceQuality): void {
    if (this.surfMesh) {
      this.group.remove(this.surfMesh);
      this.surfGeo.dispose();
    }
    this.surfCap = sq.maxSurfaces;
    this.surfData = new Float32Array(this.surfCap * SURF_STRIDE);
    const g = new THREE.InstancedBufferGeometry();
    const pos: number[] = [];
    const idx: number[] = [];
    const nu = sq.segU;
    const nv = sq.segV;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) pos.push(i / nu, j / nv, 0);
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i;
        const b = a + nu + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const buf = new THREE.InstancedInterleavedBuffer(this.surfData, SURF_STRIDE, 1);
    buf.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('sA', new THREE.InterleavedBufferAttribute(buf, 4, 0));
    g.setAttribute('sB', new THREE.InterleavedBufferAttribute(buf, 4, 4));
    g.setAttribute('sC', new THREE.InterleavedBufferAttribute(buf, 4, 8));
    g.setAttribute('sD', new THREE.InterleavedBufferAttribute(buf, 4, 12));
    g.setAttribute('sE', new THREE.InterleavedBufferAttribute(buf, 4, 16));
    g.setAttribute('sF', new THREE.InterleavedBufferAttribute(buf, 4, 20));
    g.instanceCount = 0;
    this.surfBuf = buf;
    this.surfGeo = g;
    this.surfMesh = new THREE.Mesh(g, this.surfMat);
    this.surfMesh.frustumCulled = false;
    this.surfMesh.renderOrder = 19;
    this.surfMesh.name = 'laser-sheets';
    this.group.add(this.surfMesh);
  }

  private buildSprites(cap: number): void {
    if (this.spriteMesh) {
      this.group.remove(this.spriteMesh);
      this.spriteGeo.dispose();
    }
    this.spriteCap = cap;
    this.spriteData = new Float32Array(cap * SPRITE_STRIDE);
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const buf = new THREE.InstancedInterleavedBuffer(this.spriteData, SPRITE_STRIDE, 1);
    buf.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('pA', new THREE.InterleavedBufferAttribute(buf, 4, 0));
    g.setAttribute('pB', new THREE.InterleavedBufferAttribute(buf, 4, 4));
    g.instanceCount = 0;
    this.spriteBuf = buf;
    this.spriteGeo = g;
    this.spriteMesh = new THREE.Mesh(g, this.spriteMat);
    this.spriteMesh.frustumCulled = false;
    this.spriteMesh.renderOrder = 21;
    this.spriteMesh.name = 'laser-flares';
    this.group.add(this.spriteMesh);
  }

  /** small projector housings (static; rebuilt when the rig layout changes) */
  buildHousings(emitters: readonly Emitter[]): void {
    if (this.housings) {
      this.group.remove(this.housings);
      this.housings.geometry.dispose();
      this.housings = null;
    }
    const list = emitters.filter((e) => e.housing);
    if (!list.length) return;
    const geo = new THREE.BoxGeometry(0.62, 0.34, 0.56);
    const m = new THREE.InstancedMesh(geo, this.housingMat, list.length);
    const o = new THREE.Object3D();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      o.position.copy(e.pos).addScaledVector(e.fwd, -0.3);
      o.position.y -= 0.04;
      o.rotation.set(0, Math.atan2(e.fwd.x, e.fwd.z), 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.name = 'laser-housings';
    m.computeBoundingSphere();
    this.housings = m;
    this.group.add(m);
  }

  // ---------------------------------------------------------------- per-frame writers
  begin(): void {
    this.beamCount = 0;
    this.surfCount = 0;
    this.spriteCount = 0;
  }

  /** returns false when the buffer is full */
  pushBeam(
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number, len: number,
    r: number, g: number, b: number,
    dash: number, hit: boolean, width: number,
    px: number, py: number, pz: number,
  ): boolean {
    if (this.beamCount >= this.beamBudget) return false;
    const d = this.beamData;
    let o = this.beamCount * BEAM_STRIDE;
    d[o++] = ox;
    d[o++] = oy;
    d[o++] = oz;
    d[o++] = len;
    d[o++] = dx;
    d[o++] = dy;
    d[o++] = dz;
    d[o++] = (hit ? 1 : 0) + Math.min(0.99, Math.max(0, dash));
    d[o++] = r;
    d[o++] = g;
    d[o++] = b;
    d[o++] = width;
    d[o++] = px;
    d[o++] = py;
    d[o++] = pz;
    d[o] = 0;
    this.beamCount++;
    return true;
  }

  /**
   * One ruled surface: apex, range, forward axis, fan half-angle (sheet / fog) or cone half-angle,
   * plane normal (sheet) / cone up axis, kind (SURF_*), colour × power, wave amplitude, wave phases,
   * segment mask + phase, and the extras: `zoneX` = |x| beyond which the surface is blanked (laser
   * safety zoning over the banks; 0 = none), `squash` = vertical / horizontal aperture of an
   * elliptical cone (1 = round), `lift` = sheet height above the low-fog top (fog layer only).
   */
  pushSurface(
    ax: number, ay: number, az: number, range: number,
    fx: number, fy: number, fz: number, angle: number,
    nx: number, ny: number, nz: number, mode: number,
    r: number, g: number, b: number, waveAmp: number,
    ph1: number, ph2: number, seg: number, segPh: number,
    zoneX = 0, squash = 1, lift = 0,
  ): boolean {
    if (this.surfCount >= this.surfCap) return false;
    const d = this.surfData;
    let o = this.surfCount * SURF_STRIDE;
    d[o++] = ax;
    d[o++] = ay;
    d[o++] = az;
    d[o++] = range;
    d[o++] = fx;
    d[o++] = fy;
    d[o++] = fz;
    d[o++] = angle;
    d[o++] = nx;
    d[o++] = ny;
    d[o++] = nz;
    d[o++] = mode;
    d[o++] = r;
    d[o++] = g;
    d[o++] = b;
    d[o++] = waveAmp;
    d[o++] = ph1;
    d[o++] = ph2;
    d[o++] = seg;
    d[o++] = segPh;
    d[o++] = zoneX > 0 ? zoneX : 1e5;
    d[o++] = squash;
    d[o++] = lift;
    d[o] = 0;
    this.surfCount++;
    return true;
  }

  pushSprite(x: number, y: number, z: number, size: number, r: number, g: number, b: number, kind: number): boolean {
    if (this.spriteCount >= this.spriteCap) return false;
    const d = this.spriteData;
    let o = this.spriteCount * SPRITE_STRIDE;
    d[o++] = x;
    d[o++] = y;
    d[o++] = z;
    d[o++] = size;
    d[o++] = r;
    d[o++] = g;
    d[o++] = b;
    d[o] = kind;
    this.spriteCount++;
    return true;
  }

  end(): void {
    const up = (buf: THREE.InstancedInterleavedBuffer, n: number, stride: number) => {
      buf.clearUpdateRanges();
      if (n > 0) {
        buf.addUpdateRange(0, n * stride);
        buf.needsUpdate = true;
      }
    };
    up(this.beamBuf, this.beamCount, BEAM_STRIDE);
    up(this.surfBuf, this.surfCount, SURF_STRIDE);
    up(this.spriteBuf, this.spriteCount, SPRITE_STRIDE);
    this.beamGeo.instanceCount = this.beamCount;
    this.surfGeo.instanceCount = this.surfCount;
    this.spriteGeo.instanceCount = this.spriteCount;
    this.beamMesh.visible = this.beamCount > 0;
    this.surfMesh.visible = this.surfCount > 0;
    this.spriteMesh.visible = this.spriteCount > 0;
  }

  /** draw calls issued this frame (for stats) */
  get drawCalls(): number {
    return (this.beamCount > 0 ? 1 : 0) + (this.surfCount > 0 ? 1 : 0) + (this.spriteCount > 0 ? 1 : 0) + (this.housings ? 1 : 0);
  }

  get triangles(): number {
    return this.beamCount * BEAM_SEGMENTS * 2 + this.surfCount * this.sq.segU * this.sq.segV * 2 + this.spriteCount * 2;
  }

  dispose(): void {
    this.beamGeo?.dispose();
    this.surfGeo?.dispose();
    this.spriteGeo?.dispose();
    this.housings?.geometry.dispose();
    this.beamMat.dispose();
    this.surfMat.dispose();
    this.spriteMat.dispose();
    this.housingMat.dispose();
    this.noise?.dispose();
  }
}
