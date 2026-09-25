import * as THREE from 'three';
import { Rng } from '../core/rng';

/**
 * Tileable 3D value-noise fBm (R8, trilinear, repeat on all axes) generated at load.
 * Used as the "haze density" field every laser beam and sheet samples in world space, so beams
 * and sheets crossing the same smoke patch brighten together (a coherent volume, not per-beam noise).
 */
export function makeHazeNoise3D(size: number, seed = 0x51a7e): THREE.Data3DTexture {
  const n3 = size * size * size;
  const acc = new Float32Array(n3);
  const rng = new Rng(seed);
  // octaves: lattice cells across the tile, amplitude
  const octaves: [number, number][] = [
    [4, 0.52],
    [8, 0.3],
    [16, 0.18],
  ];
  for (const [cells, amp] of octaves) {
    const lat = new Float32Array(cells * cells * cells);
    for (let i = 0; i < lat.length; i++) lat[i] = rng.next();
    const scale = cells / size;
    const idx = (x: number, y: number, z: number) => ((z % cells) * cells + (y % cells)) * cells + (x % cells);
    let o = 0;
    for (let z = 0; z < size; z++) {
      const fz = z * scale;
      const iz = Math.floor(fz);
      let tz = fz - iz;
      tz = tz * tz * (3 - 2 * tz);
      for (let y = 0; y < size; y++) {
        const fy = y * scale;
        const iy = Math.floor(fy);
        let ty = fy - iy;
        ty = ty * ty * (3 - 2 * ty);
        for (let x = 0; x < size; x++, o++) {
          const fx = x * scale;
          const ix = Math.floor(fx);
          let tx = fx - ix;
          tx = tx * tx * (3 - 2 * tx);
          const c000 = lat[idx(ix, iy, iz)];
          const c100 = lat[idx(ix + 1, iy, iz)];
          const c010 = lat[idx(ix, iy + 1, iz)];
          const c110 = lat[idx(ix + 1, iy + 1, iz)];
          const c001 = lat[idx(ix, iy, iz + 1)];
          const c101 = lat[idx(ix + 1, iy, iz + 1)];
          const c011 = lat[idx(ix, iy + 1, iz + 1)];
          const c111 = lat[idx(ix + 1, iy + 1, iz + 1)];
          const x00 = c000 + (c100 - c000) * tx;
          const x10 = c010 + (c110 - c010) * tx;
          const x01 = c001 + (c101 - c001) * tx;
          const x11 = c011 + (c111 - c011) * tx;
          const y0 = x00 + (x10 - x00) * ty;
          const y1 = x01 + (x11 - x01) * ty;
          acc[o] += (y0 + (y1 - y0) * tz) * amp;
        }
      }
    }
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < n3; i++) {
    const v = acc[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const data = new Uint8Array(n3);
  const inv = 1 / Math.max(1e-6, hi - lo);
  for (let i = 0; i < n3; i++) data[i] = Math.round(((acc[i] - lo) * inv) * 255);
  const tex = new THREE.Data3DTexture(data, size, size, size);
  tex.format = THREE.RedFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.wrapR = THREE.RepeatWrapping;
  tex.generateMipmaps = false;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}
