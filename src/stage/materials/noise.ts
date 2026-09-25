import { Rng } from '../../core/rng';

/**
 * Tileable value noise on a 256-periodic lattice (load-time texture generation only).
 * `period` lets a texture tile seamlessly: noise(x + period) == noise(x) when period divides 256.
 */
export class TileNoise {
  private readonly g = new Float32Array(256 * 256);

  constructor(seed: number) {
    const r = new Rng(seed);
    for (let i = 0; i < this.g.length; i++) this.g[i] = r.next();
  }

  /** value noise in [0,1], lattice period p (cells) */
  n(x: number, y: number, p = 256): number {
    const xi = Math.floor(x),
      yi = Math.floor(y);
    const fx = x - xi,
      fy = y - yi;
    const x0 = ((xi % p) + p) % p,
      y0 = ((yi % p) + p) % p;
    const x1 = (x0 + 1) % p,
      y1 = (y0 + 1) % p;
    const g = this.g;
    const a = g[(y0 & 255) * 256 + (x0 & 255)];
    const b = g[(y0 & 255) * 256 + (x1 & 255)];
    const c = g[(y1 & 255) * 256 + (x0 & 255)];
    const d = g[(y1 & 255) * 256 + (x1 & 255)];
    const ux = fx * fx * (3 - 2 * fx),
      uy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  /** fractal sum, u,v in [0,1) tile space, base frequency f cells per tile */
  fbm(u: number, v: number, f: number, oct = 4, gain = 0.5): number {
    let s = 0,
      amp = 1,
      norm = 0,
      freq = f;
    for (let o = 0; o < oct; o++) {
      s += this.n(u * freq, v * freq, freq) * amp;
      norm += amp;
      amp *= gain;
      freq *= 2;
    }
    return s / norm;
  }

  /** ridged noise (thin bright ridges where the noise crosses 0.5) */
  ridge(u: number, v: number, f: number, oct = 3): number {
    let s = 0,
      amp = 1,
      norm = 0,
      freq = f;
    for (let o = 0; o < oct; o++) {
      const k = 1 - Math.abs(this.n(u * freq, v * freq, freq) * 2 - 1);
      s += k * k * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return s / norm;
  }
}

/** Sobel normal map (tangent space, OpenGL convention) from a height field in [0,1] */
export function heightToNormal(h: Float32Array, w: number, hgt: number, strength: number, out: Uint8ClampedArray): void {
  for (let y = 0; y < hgt; y++) {
    const ym = (y - 1 + hgt) % hgt,
      yp = (y + 1) % hgt;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w,
        xp = (x + 1) % w;
      const tl = h[ym * w + xm],
        t = h[ym * w + x],
        tr = h[ym * w + xp];
      const l = h[y * w + xm],
        r = h[y * w + xp];
      const bl = h[yp * w + xm],
        b = h[yp * w + x],
        br = h[yp * w + xp];
      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      // canvas rows go down, texture v goes up -> flip dy
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      let nx = -dx,
        ny = dy,
        nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv;
      ny *= inv;
      nz *= inv;
      const i = (y * w + x) * 4;
      out[i] = (nx * 0.5 + 0.5) * 255;
      out[i + 1] = (ny * 0.5 + 0.5) * 255;
      out[i + 2] = (nz * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
}
