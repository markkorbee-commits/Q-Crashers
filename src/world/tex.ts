import * as THREE from 'three';
import { hash32, Rng } from '../core/rng';

/** optional cooperative yield between rows of a long generator (loading screen keeps painting) */
export interface Slicer {
  maybeYield(): Promise<void>;
}

/**
 * Procedural texture helpers (all generated at load time — no downloaded assets).
 * Noise is tileable value-noise fBm on integer lattices so textures wrap seamlessly.
 */

/** tileable 2D value noise sampler with period `p` lattice cells */
function latticeValue(ix: number, iy: number, p: number, seed: number): number {
  const x = ((ix % p) + p) % p;
  const y = ((iy % p) + p) % p;
  return hash32(x * 7919 + y * 104729 + seed * 1299709) / 4294967296;
}

/**
 * Lattice values of an integer period, computed once per (period, seed) while a texture is generated:
 * the same numbers latticeValue() returns, without a hash + two modulos per corner and sample.
 */
const latticeCache = new Map<number, Float32Array>();
function latticeTable(p: number, seed: number): Float32Array {
  const key = p * 1000003 + seed;
  let t = latticeCache.get(key);
  if (!t) {
    t = new Float32Array(p * p);
    for (let y = 0; y < p; y++) for (let x = 0; x < p; x++) t[y * p + x] = hash32(x * 7919 + y * 104729 + seed * 1299709) / 4294967296;
    latticeCache.set(key, t);
  }
  return t;
}
/** free the lattice tables after a generator finished (they are only hot during generation) */
function releaseLattices(): void {
  latticeCache.clear();
}

export function tileNoise(u: number, v: number, p: number, seed: number): number {
  const x = u * p,
    y = v * p;
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const fx = x - ix,
    fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  let a: number, b: number, c: number, d: number;
  if (Number.isInteger(p) && p > 0 && p <= 1024) {
    const t = latticeTable(p, seed);
    const x0 = ((ix % p) + p) % p,
      y0 = ((iy % p) + p) % p;
    const x1 = x0 + 1 === p ? 0 : x0 + 1,
      y1 = y0 + 1 === p ? 0 : y0 + 1;
    a = t[y0 * p + x0];
    b = t[y0 * p + x1];
    c = t[y1 * p + x0];
    d = t[y1 * p + x1];
  } else {
    a = latticeValue(ix, iy, p, seed);
    b = latticeValue(ix + 1, iy, p, seed);
    c = latticeValue(ix, iy + 1, p, seed);
    d = latticeValue(ix + 1, iy + 1, p, seed);
  }
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** tileable fBm in 0..1, `base` = lattice period of the first octave */
export function tileFbm(u: number, v: number, base: number, octaves: number, seed: number, gain = 0.5): number {
  let sum = 0,
    amp = 0.5,
    norm = 0,
    p = base;
  for (let o = 0; o < octaves; o++) {
    sum += amp * tileNoise(u, v, p, seed + o * 17);
    norm += amp;
    amp *= gain;
    p *= 2;
  }
  return sum / norm;
}

/** tileable cellular (worley F1) distance 0..~1 */
export function tileWorley(u: number, v: number, p: number, seed: number): number {
  const x = u * p,
    y = v * p;
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let best = 9;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i,
        cy = iy + j;
      const wx = ((cx % p) + p) % p,
        wy = ((cy % p) + p) % p;
      const h = hash32(wx * 92821 + wy * 68917 + seed * 7);
      const px = cx + (h & 0xffff) / 65536;
      const py = cy + (h >>> 16) / 65536;
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < best) best = d;
    }
  return Math.sqrt(best);
}

export function dataTexture(data: Uint8Array, w: number, h: number, opts: { srgb?: boolean; repeat?: boolean; mips?: boolean; aniso?: number } = {}): THREE.DataTexture {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = opts.repeat === false ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.generateMipmaps = opts.mips !== false;
  t.minFilter = opts.mips !== false ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = opts.aniso ?? 1;
  t.colorSpace = opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export function canvasTexture(c: HTMLCanvasElement, opts: { srgb?: boolean; repeat?: boolean; aniso?: number; mips?: boolean } = {}): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = opts.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = opts.aniso ?? 1;
  t.generateMipmaps = opts.mips !== false;
  t.minFilter = opts.mips !== false ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: false })!;
  return [c, g];
}

/**
 * Cloud / sky noise: R = large-scale fBm, G = detail fBm, B = inverted worley (puffs), A = fine fBm.
 * Tileable, sampled in the sky shader on a cloud plane.
 */
export function cloudNoiseTexture(size: number): THREE.DataTexture {
  const d = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) cloudRow(d, size, y);
  releaseLattices();
  return dataTexture(d, size, size, { mips: true });
}

/** cloudNoiseTexture, generated in slices (the loading screen keeps painting) */
export async function cloudNoiseTextureAsync(size: number, slicer: Slicer): Promise<THREE.DataTexture> {
  const d = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    cloudRow(d, size, y);
    await slicer.maybeYield();
  }
  releaseLattices();
  return dataTexture(d, size, size, { mips: true });
}

function cloudRow(d: Uint8Array, size: number, y: number): void {
  const v = y / size;
  for (let x = 0; x < size; x++) {
    const u = x / size;
    const i = (y * size + x) * 4;
    d[i] = tileFbm(u, v, 4, 5, 11) * 255;
    d[i + 1] = tileFbm(u, v, 16, 4, 23) * 255;
    d[i + 2] = (1 - Math.min(1, tileWorley(u, v, 10, 5) * 1.25)) * 255;
    d[i + 3] = tileFbm(u, v, 32, 3, 41) * 255;
  }
}

/**
 * Ground detail (tileable, 1 tile ≈ 4 m): R = concrete aggregate/stains, G = dry grass blades & clumps,
 * B = gravel pebbles, A = fine cracks / dirt. Colour is applied in the ground shader.
 */
export async function groundDetailTexture(size: number, slicer?: Slicer): Promise<THREE.DataTexture> {
  const d = new Uint8Array(size * size * 4);
  const rng = new Rng(9001);
  // grass: accumulate thin blade strokes into a float buffer
  const grass = new Float32Array(size * size);
  const blades = Math.floor(size * size * 0.16);
  for (let b = 0; b < blades; b++) {
    let x = rng.next() * size,
      y = rng.next() * size;
    const len = 3 + rng.next() * size * 0.02;
    const ang = rng.range(0, Math.PI * 2);
    const val = 0.35 + rng.next() * 0.65;
    const dx = Math.cos(ang),
      dy = Math.sin(ang);
    for (let s = 0; s < len; s++) {
      const ix = ((Math.floor(x) % size) + size) % size;
      const iy = ((Math.floor(y) % size) + size) % size;
      const k = iy * size + ix;
      grass[k] = Math.max(grass[k], val * (1 - (s / len) * 0.5));
      x += dx;
      y += dy;
    }
  }
  for (let y = 0; y < size; y++) {
    if (slicer) await slicer.maybeYield();
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size;
      const i = (y * size + x) * 4;
      const agg = tileNoise(u, v, size / 3, 3) * 0.55 + tileFbm(u, v, 8, 4, 5) * 0.45;
      d[i] = Math.min(255, agg * 255);
      const clump = tileFbm(u, v, 12, 3, 77);
      d[i + 1] = Math.min(255, (grass[y * size + x] * 0.75 + clump * 0.35) * 255);
      const peb = 1 - Math.min(1, tileWorley(u, v, 48, 9) * 1.35);
      d[i + 2] = Math.min(255, (peb * 0.7 + tileNoise(u, v, size / 4, 13) * 0.3) * 255);
      const crack = 1 - Math.min(1, Math.abs(tileFbm(u, v, 6, 4, 101) - 0.5) * 18);
      d[i + 3] = Math.min(255, (crack * 0.6 + tileFbm(u, v, 20, 3, 55) * 0.4) * 255);
    }
  }
  releaseLattices();
  return dataTexture(d, size, size, { mips: true, aniso: 4 });
}
