import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { heightToNormal, TileNoise } from './noise';

export interface PbrSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  /** R = ambient occlusion, G = roughness, B = metalness (three.js ORM convention) */
  orm: THREE.Texture;
}

/** metres covered by one repeat of the stone texture */
export const STONE_TILE_M = 4;

function canvasTex(w: number, h: number, data: Uint8ClampedArray, srgb: boolean, aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.putImageData(new ImageData(data as unknown as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

/**
 * Weathered ashlar stone of the printed castle flats: running-bond courses of warm-grey blocks with
 * dark mortar, per-block tone variation, chipped arrises, rain/grime streaks, lichen-dark patches and
 * sparse gold "kintsugi" veins (metallic in the ORM map). Tileable, 4 x 4 m per repeat.
 */
export function makeStoneTextures(size: number, aniso: number, seed = 1337): PbrSet {
  const N = size;
  const noise = new TileNoise(seed);
  const rng = new Rng(seed ^ 0x51f15e);
  const pxPerM = N / STONE_TILE_M;

  // --- courses (tileable vertically) -----------------------------------------------------------
  const courses: { y0: number; y1: number; edges: number[]; tone: number[]; hue: number[] }[] = [];
  {
    const hs: number[] = [];
    let tot = 0;
    while (tot < STONE_TILE_M - 0.4) {
      const h = rng.range(0.42, 0.68);
      hs.push(h);
      tot += h;
    }
    const k = STONE_TILE_M / tot;
    let y = 0;
    for (const h0 of hs) {
      const h = h0 * k;
      const edges: number[] = [];
      let x = rng.range(0, 1.2);
      const start = x;
      while (x < start + STONE_TILE_M - 0.5) {
        edges.push(x);
        x += rng.range(0.55, 1.75);
      }
      // wrap: last block ends at start + tile
      const tone: number[] = [];
      const hue: number[] = [];
      for (let i = 0; i < edges.length; i++) {
        tone.push(rng.range(0.82, 1.1) * (rng.chance(0.08) ? 0.8 : 1));
        hue.push(rng.range(-1, 1));
      }
      courses.push({ y0: y, y1: y + h, edges, tone, hue });
      y += h;
    }
  }

  const height = new Float32Array(N * N);
  const col = new Uint8ClampedArray(N * N * 4);
  const orm = new Uint8ClampedArray(N * N * 4);
  const mortarHalf = 0.014;
  const bevel = 0.045;

  // low-frequency fields at 1/4 resolution (bilinear), the per-pixel work stays small
  const R = Math.max(16, N >> 2);
  const lowField = (fn: (u: number, v: number) => number) => {
    const f = new Float32Array(R * R);
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) f[y * R + x] = fn(x / R, y / R);
    return f;
  };
  const sampleLow = (f: Float32Array, u: number, v: number) => {
    const fx = u * R - 0.5,
      fy = v * R - 0.5;
    const x0 = Math.floor(fx),
      y0 = Math.floor(fy);
    const tx = fx - x0,
      ty = fy - y0;
    const xa = ((x0 % R) + R) % R,
      xb = (xa + 1) % R,
      ya = ((y0 % R) + R) % R,
      yb = (ya + 1) % R;
    const a = f[ya * R + xa],
      b = f[ya * R + xb],
      c = f[yb * R + xa],
      d = f[yb * R + xb];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
  const F_large = lowField((u, v) => noise.fbm(u, v, 6, 4));
  const F_blotch = lowField((u, v) => noise.fbm(u + 0.7, v + 0.3, 3, 3));
  const F_mask = lowField((u, v) => noise.fbm(u + 3.1, v + 1.7, 4, 3));
  const F_streak = lowField((u, v) => noise.fbm(u, v * 0.0625 + 0.5, 32, 2) * 0.7 + noise.fbm(u, v, 16, 1) * 0.3);

  let ci = 0;
  for (let py = 0; py < N; py++) {
    // metres from the TOP of the canvas == tile v from 1 down to 0; we define ym = metres from bottom
    const ym = STONE_TILE_M * (1 - (py + 0.5) / N);
    while (ci < courses.length - 1 && ym >= courses[ci].y1) ci++;
    while (ci > 0 && ym < courses[ci].y0) ci--;
    const c = courses[ci];
    const v = ym / STONE_TILE_M;
    const dyEdge = Math.min(ym - c.y0, c.y1 - ym);
    const E = c.edges;
    const start = E[0];
    let bi = 0;
    for (let px = 0; px < N; px++) {
      const xm = (px + 0.5) / pxPerM;
      const u = xm / STONE_TILE_M;
      // block index: position relative to first edge, wrapped into [start, start+tile)
      let xr = xm;
      if (xr < start) xr += STONE_TILE_M;
      if (xr >= start + STONE_TILE_M) xr -= STONE_TILE_M;
      while (bi > 0 && xr < E[bi]) bi--;
      while (bi + 1 < E.length && xr >= E[bi + 1]) bi++;
      const bx0 = E[bi];
      const bx1 = bi + 1 < E.length ? E[bi + 1] : start + STONE_TILE_M;
      const dxEdge = Math.min(xr - bx0, bx1 - xr);
      let d = Math.min(dxEdge, dyEdge);
      // chipped edges: perturb the edge distance with noise (only near an edge)
      if (d < 0.07) d += (noise.fbm(u, v, 48, 2) - 0.5) * 0.028;
      const large = sampleLow(F_large, u, v);
      const fine = noise.fbm(u + 0.37, v + 0.11, 64, 2);
      const streak = sampleLow(F_streak, u, v);
      const blotch = sampleLow(F_blotch, u, v);
      const i4 = (py * N + px) * 4;

      let r: number, g: number, b: number, rough: number, metal: number, h: number;
      if (d < mortarHalf) {
        // mortar (grey painted joints)
        const m = 0.42 + fine * 0.08;
        r = m * 1.0;
        g = m * 1.0;
        b = m * 1.04;
        rough = 0.97;
        metal = 0;
        h = 0.05 + fine * 0.05;
      } else {
        const tone = c.tone[bi] ?? 1;
        const hu = c.hue[bi] ?? 0;
        const e = Math.min(1, (d - mortarHalf) / bevel);
        const bev = e * (2 - e); // rounded arris
        // painted light stone, off-white #DCD8CF (daytime photos: the castle flats read white / light
        // grey with grey joints) with a slight blue / beige swing per block; the show scales the albedo
        // back to its night calibration (StageUniforms.uDay / nightK)
        const base = tone * (0.9 + 0.16 * large) * (0.93 + 0.14 * fine);
        r = 0.86 * base * (1 + 0.03 * hu);
        g = 0.845 * base;
        b = 0.81 * base * (1 - 0.035 * hu);
        // grime: darker near the lower edge of each block and along streaks
        const lowEdge = Math.max(0, 1 - (ym - c.y0) / 0.18);
        const grime = 0.12 * lowEdge + 0.16 * Math.max(0, streak - 0.55) * 2.2 + 0.14 * Math.max(0, 0.45 - blotch) * 2;
        r *= 1 - grime;
        g *= 1 - grime * 0.95;
        b *= 1 - grime * 0.9;
        // edge wear: lighter chipped arris
        r += (1 - bev) * 0.04;
        g += (1 - bev) * 0.04;
        b += (1 - bev) * 0.04;
        rough = 0.82 + 0.12 * fine - 0.08 * (1 - bev);
        metal = 0;
        h = 0.55 + 0.35 * bev + 0.1 * (large - 0.5) + 0.08 * (fine - 0.5);
        // sparse gold kintsugi veins: thin ridges masked by a low-frequency field
        const mask = sampleLow(F_mask, u, v);
        if (mask > 0.6) {
          const rd = noise.ridge(u + 1.3, v + 2.9, 7, 3);
          const vein = Math.max(0, (rd - 0.9) / 0.1) * Math.min(1, (mask - 0.6) / 0.08);
          if (vein > 0.05) {
            const k = Math.min(1, vein * 1.6);
            r = r * (1 - k) + 0.83 * k;
            g = g * (1 - k) + 0.64 * k;
            b = b * (1 - k) + 0.22 * k;
            rough = rough * (1 - k) + 0.28 * k;
            metal = k;
            h -= 0.12 * k;
          }
        }
      }
      col[i4] = Math.min(255, r * 255);
      col[i4 + 1] = Math.min(255, g * 255);
      col[i4 + 2] = Math.min(255, b * 255);
      col[i4 + 3] = 255;
      orm[i4] = 255;
      orm[i4 + 1] = rough * 255;
      orm[i4 + 2] = metal * 255;
      orm[i4 + 3] = 255;
      height[py * N + px] = h;
    }
  }
  const nrm = new Uint8ClampedArray(N * N * 4);
  heightToNormal(height, N, N, 2.2 * (N / 1024), nrm);
  return {
    map: canvasTex(N, N, col, true, aniso),
    normalMap: canvasTex(N, N, nrm, false, aniso),
    orm: canvasTex(N, N, orm, false, aniso),
  };
}

/**
 * Painted / fabric / steel surfaces share a small tileable grain texture (roughness breakup + fine
 * normal). R = grain for albedo modulation, used as map (greyscale), normal from the same field.
 */
export function makeGrainTextures(size: number, aniso: number, seed = 99): { map: THREE.Texture; normalMap: THREE.Texture; orm: THREE.Texture } {
  const N = size;
  const noise = new TileNoise(seed);
  const col = new Uint8ClampedArray(N * N * 4);
  const orm = new Uint8ClampedArray(N * N * 4);
  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const u = x / N,
        v = y / N;
      const f = noise.fbm(u, v, 32, 4);
      const scratch = noise.ridge(u * 0.3 + 0.2, v * 4, 16, 2);
      const g = 0.78 + 0.22 * f - 0.1 * Math.max(0, scratch - 0.85) * 6;
      const i = (y * N + x) * 4;
      col[i] = col[i + 1] = col[i + 2] = Math.max(0, Math.min(255, g * 255));
      col[i + 3] = 255;
      orm[i] = 255;
      orm[i + 1] = (0.55 + 0.4 * f) * 255;
      orm[i + 2] = 255;
      orm[i + 3] = 255;
      h[y * N + x] = f * 0.6 + Math.max(0, scratch - 0.85) * 2;
    }
  const nrm = new Uint8ClampedArray(N * N * 4);
  heightToNormal(h, N, N, 1.2, nrm);
  return { map: canvasTex(N, N, col, true, aniso), normalMap: canvasTex(N, N, nrm, false, aniso), orm: canvasTex(N, N, orm, false, aniso) };
}
