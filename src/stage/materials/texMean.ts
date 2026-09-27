import * as THREE from 'three';

const cache = new Map<THREE.Texture, [number, number, number]>();

/** sRGB transfer function -> linear (IEC 61966-2-1), v in 0..1 */
function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** 16x16 RGBA downsample of a drawable texture image, or null when the image is not drawable */
function sample16(t: THREE.Texture): Uint8ClampedArray | null {
  if (!t.image || typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(t.image as CanvasImageSource, 0, 0, 16, 16);
    return ctx.getImageData(0, 0, 16, 16).data;
  } catch {
    // not a drawable image (e.g. a DataTexture's plain object) or a tainted canvas
    return null;
  }
}

/**
 * Mean linear colour of a canvas-backed texture (sRGB decoded when the texture is sRGB), from a
 * 16x16 downsample. Used by the MOBILE material merges to bake a texture's average albedo /
 * roughness into vertex data when several materials share one draw. Neutral 0.5 when the image is
 * not drawable (e.g. a DataTexture). Round 12: the decode is inlined (three r186 does not export
 * SRGBToLinear: every sRGB map silently fell back to 0.5), and only the canvas calls sit in a
 * try / catch, so a code error can no longer pass for "not drawable".
 */
export function texMean(t: THREE.Texture): [number, number, number] {
  const hit = cache.get(t);
  if (hit) return hit;
  let out: [number, number, number] = [0.5, 0.5, 0.5];
  const d = sample16(t);
  if (d) {
    const srgb = t.colorSpace === THREE.SRGBColorSpace;
    let r = 0,
      g = 0,
      b = 0;
    for (let i = 0; i < d.length; i += 4) {
      const vr = d[i] / 255,
        vg = d[i + 1] / 255,
        vb = d[i + 2] / 255;
      r += srgb ? srgbToLinear(vr) : vr;
      g += srgb ? srgbToLinear(vg) : vg;
      b += srgb ? srgbToLinear(vb) : vb;
    }
    const n = d.length / 4;
    out = [r / n, g / n, b / n];
  }
  cache.set(t, out);
  return out;
}
