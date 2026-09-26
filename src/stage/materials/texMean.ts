import * as THREE from 'three';

const cache = new Map<THREE.Texture, [number, number, number]>();

/**
 * Mean linear colour of a canvas-backed texture (sRGB decoded when the texture is sRGB), from a
 * 16x16 downsample. Used by the MOBILE material merges to bake a texture's average albedo /
 * roughness into vertex data when several materials share one draw. Neutral 0.5 when the image is
 * not drawable (e.g. a DataTexture).
 */
export function texMean(t: THREE.Texture): [number, number, number] {
  const hit = cache.get(t);
  if (hit) return hit;
  let out: [number, number, number] = [0.5, 0.5, 0.5];
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (ctx && t.image) {
      ctx.drawImage(t.image as CanvasImageSource, 0, 0, 16, 16);
      const d = ctx.getImageData(0, 0, 16, 16).data;
      const srgb = t.colorSpace === THREE.SRGBColorSpace;
      const lin = (v: number) => (srgb ? THREE.SRGBToLinear(v / 255) : v / 255);
      const s = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) s[k] += lin(d[i + k]);
      const n = d.length / 4;
      out = [s[0] / n, s[1] / n, s[2] / n];
    }
  } catch {
    // not a drawable image: keep the neutral fallback
  }
  cache.set(t, out);
  return out;
}
