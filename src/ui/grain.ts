/**
 * Film grain for panels and the landing: a small noise PNG generated once and tiled.
 * (A static bitmap is far cheaper than an SVG feTurbulence background, which browsers may
 * re-rasterise on every paint, and it needs no blend mode.)
 */
export function installGrain(): void {
  try {
    const n = 128;
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    if (!g) return;
    const img = g.createImageData(n, n);
    let seed = 1234567;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < n * n; i++) {
      const v = rnd();
      const light = v > 0.5;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = light ? 255 : 0;
      img.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) * 2 * 26);
    }
    g.putImageData(img, 0, 0);
    document.documentElement.style.setProperty('--grain', `url(${c.toDataURL('image/png')})`);
  } catch {
    /* purely cosmetic */
  }
}
