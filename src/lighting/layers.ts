import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BEAM_FRAG, BEAM_VERT, GLOW_FRAG, GLOW_VERT, POOL_FRAG, POOL_VERT, SPRITE_FRAG, SPRITE_VERT } from './shaders';

/**
 * GPU layers of the lighting system. Each layer is ONE instanced draw call whose per-instance
 * data is rewritten every frame into preallocated Float32Arrays (no per-frame allocation).
 */

/** Tileable 3D value-noise (2 octaves baked) used for haze density and beam striations. */
export function createNoise3D(size = 32): THREE.Data3DTexture {
  const data = new Uint8Array(size * size * size);
  const lattice = (period: number, seed: number) => {
    const v = new Float32Array(period * period * period);
    let s = seed >>> 0;
    for (let i = 0; i < v.length; i++) {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      v[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return v;
  };
  const sample = (v: Float32Array, p: number, x: number, y: number, z: number) => {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      zi = Math.floor(z);
    const fx = x - xi,
      fy = y - yi,
      fz = z - zi;
    const sx = fx * fx * (3 - 2 * fx),
      sy = fy * fy * (3 - 2 * fy),
      sz = fz * fz * (3 - 2 * fz);
    const at = (a: number, b: number, c: number) => v[(((c % p) + p) % p) * p * p + (((b % p) + p) % p) * p + (((a % p) + p) % p)];
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    return l(
      l(l(at(xi, yi, zi), at(xi + 1, yi, zi), sx), l(at(xi, yi + 1, zi), at(xi + 1, yi + 1, zi), sx), sy),
      l(l(at(xi, yi, zi + 1), at(xi + 1, yi, zi + 1), sx), l(at(xi, yi + 1, zi + 1), at(xi + 1, yi + 1, zi + 1), sx), sy),
      sz,
    );
  };
  const p1 = 4,
    p2 = 8,
    p3 = 16;
  const l1 = lattice(p1, 0x51ed),
    l2 = lattice(p2, 0x2a9f),
    l3 = lattice(p3, 0x77c3);
  let i = 0;
  let mn = 1,
    mx = 0;
  const tmp = new Float32Array(data.length);
  for (let z = 0; z < size; z++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const v =
          sample(l1, p1, (x * p1) / size, (y * p1) / size, (z * p1) / size) * 0.5 +
          sample(l2, p2, (x * p2) / size, (y * p2) / size, (z * p2) / size) * 0.32 +
          sample(l3, p3, (x * p3) / size, (y * p3) / size, (z * p3) / size) * 0.18;
        tmp[i++] = v;
        mn = Math.min(mn, v);
        mx = Math.max(mx, v);
      }
  for (let j = 0; j < tmp.length; j++) data[j] = Math.round(((tmp[j] - mn) / (mx - mn)) * 255);
  const tex = new THREE.Data3DTexture(data, size, size, size);
  tex.format = THREE.RedFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

function dynAttr(geo: THREE.InstancedBufferGeometry, name: string, cap: number): THREE.InstancedBufferAttribute {
  const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
  a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute(name, a);
  return a;
}

/** shared uniforms (noise, time, pixel angle) */
export interface SharedUniforms {
  tNoise: { value: THREE.Data3DTexture | null };
  uTime: { value: number };
  uPixelAngle: { value: number };
}

// ------------------------------------------------------------------------------------------ beams
export class BeamLayer {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  private geo!: THREE.InstancedBufferGeometry;
  private aPos!: THREE.InstancedBufferAttribute;
  private aDir!: THREE.InstancedBufferAttribute;
  private aCol!: THREE.InstancedBufferAttribute;
  private aMisc!: THREE.InstancedBufferAttribute;
  cap = 0;
  count = 0;

  constructor(shared: SharedUniforms) {
    this.material = new THREE.ShaderMaterial({
      name: 'LightBeams',
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: { ...shared, uHaze: { value: 0.6 }, uNoise: { value: 1 }, uGain: { value: 1 }, uExtinct: { value: 0.035 } },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      fog: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
    this.mesh.name = 'LightBeams';
  }

  build(cap: number, radial: number): void {
    this.geo?.dispose();
    // rings along the beam, denser near the lens (where brightness changes fastest)
    const rings = [0, 0.015, 0.045, 0.1, 0.19, 0.32, 0.5, 0.74, 1];
    const pos: number[] = [];
    const idx: number[] = [];
    for (let j = 0; j < rings.length; j++)
      for (let i = 0; i <= radial; i++) {
        const a = (i / radial) * Math.PI * 2;
        pos.push(Math.cos(a), rings[j], Math.sin(a));
      }
    const row = radial + 1;
    for (let j = 0; j < rings.length - 1; j++)
      for (let i = 0; i < radial; i++) {
        const a = j * row + i;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    this.aPos = dynAttr(geo, 'iPos', cap);
    this.aDir = dynAttr(geo, 'iDir', cap);
    this.aCol = dynAttr(geo, 'iCol', cap);
    this.aMisc = dynAttr(geo, 'iMisc', cap);
    geo.instanceCount = 0;
    this.geo = geo;
    this.mesh.geometry = geo;
    this.cap = cap;
  }

  begin(): void {
    this.count = 0;
  }

  push(px: number, py: number, pz: number, r0: number, dx: number, dy: number, dz: number, len: number, r: number, g: number, b: number, tan: number, seed: number, grounded: number): void {
    if (this.count >= this.cap) return;
    const o = this.count * 4;
    const P = this.aPos.array as Float32Array;
    const D = this.aDir.array as Float32Array;
    const C = this.aCol.array as Float32Array;
    const M = this.aMisc.array as Float32Array;
    P[o] = px;
    P[o + 1] = py;
    P[o + 2] = pz;
    P[o + 3] = r0;
    D[o] = dx;
    D[o + 1] = dy;
    D[o + 2] = dz;
    D[o + 3] = len;
    C[o] = r;
    C[o + 1] = g;
    C[o + 2] = b;
    C[o + 3] = tan;
    M[o] = seed;
    M[o + 1] = grounded;
    this.count++;
  }

  end(): void {
    this.geo.instanceCount = this.count;
    if (this.count > 0) {
      this.aPos.needsUpdate = true;
      this.aDir.needsUpdate = true;
      this.aCol.needsUpdate = true;
      this.aMisc.needsUpdate = true;
    }
    this.mesh.visible = this.count > 0;
  }

  dispose(): void {
    this.geo?.dispose();
    this.material.dispose();
  }
}

// ------------------------------------------------------------------------------------------ pools
export class PoolLayer {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  private geo!: THREE.InstancedBufferGeometry;
  private aCenter!: THREE.InstancedBufferAttribute;
  private aAxis!: THREE.InstancedBufferAttribute;
  private aCol!: THREE.InstancedBufferAttribute;
  cap = 0;
  count = 0;

  constructor(shared: SharedUniforms) {
    this.material = new THREE.ShaderMaterial({
      name: 'LightPools',
      vertexShader: POOL_VERT,
      fragmentShader: POOL_FRAG,
      uniforms: { ...shared },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -8,
      fog: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    this.mesh.name = 'LightPools';
  }

  build(cap: number): void {
    this.geo?.dispose();
    const geo = new THREE.InstancedBufferGeometry();
    const s = 2.2;
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-s, -s, 0, s, -s, 0, s, s, 0, -s, s, 0], 3));
    geo.setIndex([0, 2, 1, 0, 3, 2]);
    this.aCenter = dynAttr(geo, 'iCenter', cap);
    this.aAxis = dynAttr(geo, 'iAxis', cap);
    this.aCol = dynAttr(geo, 'iCol', cap);
    geo.instanceCount = 0;
    this.geo = geo;
    this.mesh.geometry = geo;
    this.cap = cap;
  }

  begin(): void {
    this.count = 0;
  }

  push(x: number, y: number, z: number, a: number, axx: number, axz: number, b: number, seed: number, r: number, g: number, bl: number, sharp: number): void {
    if (this.count >= this.cap) return;
    const o = this.count * 4;
    const C = this.aCenter.array as Float32Array;
    const A = this.aAxis.array as Float32Array;
    const K = this.aCol.array as Float32Array;
    C[o] = x;
    C[o + 1] = y;
    C[o + 2] = z;
    C[o + 3] = a;
    A[o] = axx;
    A[o + 1] = axz;
    A[o + 2] = b;
    A[o + 3] = seed;
    K[o] = r;
    K[o + 1] = g;
    K[o + 2] = bl;
    K[o + 3] = sharp;
    this.count++;
  }

  end(): void {
    this.geo.instanceCount = this.count;
    if (this.count > 0) {
      this.aCenter.needsUpdate = true;
      this.aAxis.needsUpdate = true;
      this.aCol.needsUpdate = true;
    }
    this.mesh.visible = this.count > 0;
  }

  dispose(): void {
    this.geo?.dispose();
    this.material.dispose();
  }
}

// ------------------------------------------------------------------------------------------ sprites
export const SPR_LENS = 0;
export const SPR_BLINDER = 1;
export const SPR_STROBE = 2;

export class SpriteLayer {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  private geo!: THREE.InstancedBufferGeometry;
  private aPos!: THREE.InstancedBufferAttribute;
  private aDir!: THREE.InstancedBufferAttribute;
  private aCol!: THREE.InstancedBufferAttribute;
  cap = 0;
  count = 0;

  constructor(shared: SharedUniforms) {
    this.material = new THREE.ShaderMaterial({
      name: 'LightSprites',
      vertexShader: SPRITE_VERT,
      fragmentShader: SPRITE_FRAG,
      uniforms: { uPixelAngle: shared.uPixelAngle, uMinPx: { value: 3 }, uFlarePx: { value: 110 } },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      fog: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 11;
    this.mesh.name = 'LightSprites';
  }

  build(cap: number): void {
    this.geo?.dispose();
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.aPos = dynAttr(geo, 'iPos', cap);
    this.aDir = dynAttr(geo, 'iDir', cap);
    this.aCol = dynAttr(geo, 'iCol', cap);
    geo.instanceCount = 0;
    this.geo = geo;
    this.mesh.geometry = geo;
    this.cap = cap;
  }

  begin(): void {
    this.count = 0;
  }

  push(type: number, x: number, y: number, z: number, dx: number, dy: number, dz: number, w: number, r: number, g: number, b: number, size: number): void {
    if (this.count >= this.cap) return;
    const o = this.count * 4;
    const P = this.aPos.array as Float32Array;
    const D = this.aDir.array as Float32Array;
    const C = this.aCol.array as Float32Array;
    P[o] = x;
    P[o + 1] = y;
    P[o + 2] = z;
    P[o + 3] = type;
    D[o] = dx;
    D[o + 1] = dy;
    D[o + 2] = dz;
    D[o + 3] = w;
    C[o] = r;
    C[o + 1] = g;
    C[o + 2] = b;
    C[o + 3] = size;
    this.count++;
  }

  end(): void {
    this.geo.instanceCount = this.count;
    if (this.count > 0) {
      this.aPos.needsUpdate = true;
      this.aDir.needsUpdate = true;
      this.aCol.needsUpdate = true;
    }
    this.mesh.visible = this.count > 0;
  }

  dispose(): void {
    this.geo?.dispose();
    this.material.dispose();
  }
}

// ------------------------------------------------------------------------------------------ bodies
/**
 * Fixture housings: moving-head yokes + heads (per-frame matrices from the beam direction) and
 * static strobe / blinder housings. 3 draw calls.
 */
export class FixtureBodies {
  readonly group = new THREE.Group();
  yokes: THREE.InstancedMesh | null = null;
  heads: THREE.InstancedMesh | null = null;
  housings: THREE.InstancedMesh | null = null;
  private readonly mat: THREE.MeshStandardMaterial;
  private readonly lensMat: THREE.MeshStandardMaterial;
  private yokeGeo: THREE.BufferGeometry;
  private headGeo: THREE.BufferGeometry;
  private boxGeo: THREE.BufferGeometry;

  constructor() {
    this.group.name = 'FixtureBodies';
    this.mat = new THREE.MeshStandardMaterial({ color: 0x16171a, metalness: 0.55, roughness: 0.42 });
    this.lensMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, metalness: 0.2, roughness: 0.35, emissive: 0x000000 });
    // yoke: base plate + two arms (pivot at origin, +Y = away from the mount)
    const base = new THREE.BoxGeometry(0.46, 0.14, 0.36).translate(0, -0.33, 0);
    const armL = new THREE.BoxGeometry(0.06, 0.4, 0.14).translate(-0.24, -0.12, 0);
    const armR = new THREE.BoxGeometry(0.06, 0.4, 0.14).translate(0.24, -0.12, 0);
    this.yokeGeo = mergeGeometries([base, armL, armR])!;
    // head: body cylinder along +Z with a front bezel
    const body = new THREE.CylinderGeometry(0.17, 0.2, 0.44, 12).rotateX(Math.PI / 2).translate(0, 0, -0.02);
    const bezel = new THREE.CylinderGeometry(0.19, 0.19, 0.05, 12).rotateX(Math.PI / 2).translate(0, 0, 0.22);
    this.headGeo = mergeGeometries([body, bezel])!;
    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
  }

  build(nHeads: number, housingMatrices: THREE.Matrix4[]): void {
    for (const m of [this.yokes, this.heads, this.housings]) if (m) this.group.remove(m);
    this.yokes?.dispose();
    this.heads?.dispose();
    this.housings?.dispose();
    this.yokes = new THREE.InstancedMesh(this.yokeGeo, this.mat, Math.max(1, nHeads));
    this.heads = new THREE.InstancedMesh(this.headGeo, this.mat, Math.max(1, nHeads));
    this.housings = new THREE.InstancedMesh(this.boxGeo, this.lensMat, Math.max(1, housingMatrices.length));
    for (const m of [this.yokes, this.heads]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = nHeads;
      m.frustumCulled = false;
    }
    housingMatrices.forEach((m, i) => this.housings!.setMatrixAt(i, m));
    this.housings.count = housingMatrices.length;
    this.housings.instanceMatrix.needsUpdate = true;
    this.housings.computeBoundingSphere();
    this.yokes.name = 'MovingHeadYokes';
    this.heads.name = 'MovingHeadHeads';
    this.housings.name = 'StrobeBlinderHousings';
    this.group.add(this.yokes, this.heads, this.housings);
  }

  private readonly m = new THREE.Matrix4();
  private readonly bx = new THREE.Vector3();
  private readonly by = new THREE.Vector3();
  private readonly bz = new THREE.Vector3();

  /** orient fixture i: mount pivot p, mount up (+1 standing / -1 hanging), beam direction d */
  setHead(i: number, px: number, py: number, pz: number, up: number, dx: number, dy: number, dz: number, fwdX: number, fwdZ: number): void {
    const m = this.m;
    // yoke: rotates about the mount axis (world Y), faces the horizontal beam direction
    let hx = dx;
    let hz = dz;
    let hl = Math.hypot(hx, hz);
    if (hl < 1e-3) {
      hx = fwdX;
      hz = fwdZ;
      hl = Math.hypot(hx, hz) || 1;
    }
    hx /= hl;
    hz /= hl;
    // basis: y = up * mount, z = horizontal facing, x = y cross z
    this.by.set(0, up, 0);
    this.bz.set(hx, 0, hz);
    this.bx.crossVectors(this.by, this.bz);
    m.makeBasis(this.bx, this.by, this.bz);
    m.setPosition(px, py, pz);
    this.yokes!.setMatrixAt(i, m);
    // head: z = beam direction, x = tilt axis (horizontal)
    this.bz.set(dx, dy, dz);
    this.bx.set(hz, 0, -hx).multiplyScalar(up);
    this.by.crossVectors(this.bz, this.bx);
    m.makeBasis(this.bx, this.by, this.bz);
    m.setPosition(px, py, pz);
    this.heads!.setMatrixAt(i, m);
  }

  commit(): void {
    if (this.yokes) this.yokes.instanceMatrix.needsUpdate = true;
    if (this.heads) this.heads.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.yokes?.dispose();
    this.heads?.dispose();
    this.housings?.dispose();
    this.yokeGeo.dispose();
    this.headGeo.dispose();
    this.boxGeo.dispose();
    this.mat.dispose();
    this.lensMat.dispose();
  }
}

// ------------------------------------------------------------------------------------------ wash glow
/**
 * The set's decor floods scattering in the stage haze: an analytic glow volume around the stage
 * in the wash colour. One draw call; drawn from outside with the box's front faces (depth tested,
 * so the crowd / pillars in front occlude it) and from inside with its back faces.
 */
export class WashGlow {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  private readonly min = new THREE.Vector3(-135, -1, -42);
  private readonly max = new THREE.Vector3(135, 58, 64);
  private readonly cols: THREE.Vector3[];

  constructor() {
    const C = (x: number, y: number, z: number, w: number) => new THREE.Vector4(x, y, z, w);
    const S = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    this.cols = [S(0, 0, 0), S(0, 0, 0), S(0, 0, 0), S(0, 0, 0)];
    this.material = new THREE.ShaderMaterial({
      name: 'WashGlow',
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      uniforms: {
        uBlobC: { value: [C(0, 14, -5, 1), C(-44, 13, -9, 0.75), C(44, 13, -9, 0.75), C(0, 4, 10, 0.1)] },
        uBlobS: { value: [S(30, 15, 12), S(22, 13, 11), S(22, 13, 11), S(62, 4.5, 14)] },
        uBlobCol: { value: this.cols },
        uBoxMin: { value: this.min },
        uBoxMax: { value: this.max },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      fog: false,
      toneMapped: false,
    });
    const size = new THREE.Vector3().subVectors(this.max, this.min);
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z).translate((this.min.x + this.max.x) / 2, (this.min.y + this.max.y) / 2, (this.min.z + this.max.z) / 2);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;
    this.mesh.name = 'WashGlow';
  }

  /** colour (linear) x intensity per blob; `cam` decides front/back face rendering */
  update(cam: THREE.Vector3, wash: THREE.Color, washI: number, floor: THREE.Color, floorI: number, gain: number): void {
    const inside = cam.x > this.min.x && cam.x < this.max.x && cam.y > this.min.y && cam.y < this.max.y && cam.z > this.min.z && cam.z < this.max.z;
    const side = inside ? THREE.BackSide : THREE.FrontSide;
    if (this.material.side !== side) {
      this.material.side = side;
      this.material.depthTest = !inside;
      this.material.needsUpdate = true;
    }
    const k = washI * gain;
    for (let i = 0; i < 3; i++) this.cols[i].set(wash.r * k, wash.g * k, wash.b * k);
    const kf = floorI * gain;
    this.cols[3].set(floor.r * kf, floor.g * kf, floor.b * kf);
    this.mesh.visible = k + kf > 1e-4;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
