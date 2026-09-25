import * as THREE from 'three';
import { mulberry } from './geom';

/**
 * Procedural textures for the crown, generated at load (canvas 2D + CPU normal maps).
 * All textures tile (RepeatWrapping). Sizes follow QualitySettings.textureSize.
 */

export interface PbrSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  emissiveMap?: THREE.Texture;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  return [c, ctx];
}

/** Draw a callback wrapped around the tile edges so the result tiles seamlessly. */
function wrapDraw(w: number, h: number, x: number, y: number, r: number, fn: (dx: number, dy: number) => void) {
  for (const dx of [-w, 0, w]) {
    if (x + dx + r < 0 || x + dx - r > w) continue;
    for (const dy of [-h, 0, h]) {
      if (y + dy + r < 0 || y + dy - r > h) continue;
      fn(dx, dy);
    }
  }
}

/** Height (grey canvas) -> tangent-space normal map (Sobel, wrapped). */
function normalFromHeight(hc: HTMLCanvasElement, strength: number): THREE.DataTexture {
  const w = hc.width;
  const h = hc.height;
  const src = hc.getContext('2d')!.getImageData(0, 0, w, h).data;
  const H = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) H[i] = src[i * 4] / 255;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const ym = ((y - 1 + h) % h) * w;
    const y0 = y * w;
    const yp = ((y + 1) % h) * w;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w;
      const xp = (x + 1) % w;
      const dx = H[ym + xp] + 2 * H[y0 + xp] + H[yp + xp] - H[ym + xm] - 2 * H[y0 + xm] - H[yp + xm];
      const dy = H[yp + xm] + 2 * H[yp + x] + H[yp + xp] - H[ym + xm] - 2 * H[ym + x] - H[ym + xp];
      let nx = -dx * strength;
      let ny = dy * strength; // canvas y down -> texture v up
      let nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l;
      ny /= l;
      nz /= l;
      const i = (y0 + x) * 4;
      out[i] = (nx * 0.5 + 0.5) * 255;
      out[i + 1] = (ny * 0.5 + 0.5) * 255;
      out[i + 2] = (nz * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  t.flipY = true;
  finish(t, false);
  return t;
}

function finish(t: THREE.Texture, srgb: boolean, aniso = 4): THREE.Texture {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

function canvasTex(c: HTMLCanvasElement, srgb: boolean, aniso: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  finish(t, srgb, aniso);
  return t;
}

/**
 * Dragon hide: overlapping shield-shaped scale plates in staggered rows, black outline grooves,
 * a centre ridge, a rivet per plate and worn bright edges. Albedo is near-neutral warm so the
 * material colour / vertex tint sets the hue.
 */
export function scaleTextures(size: number, aniso: number): PbrSet {
  const [ac, a] = canvas(size, size);
  const hs = Math.max(256, size >> 1);
  const [hc, h] = canvas(hs, hs);
  h.setTransform(hs / size, 0, 0, hs / size, 0, 0);
  const [rc, r] = canvas(size, size);
  const rnd = mulberry(1337);
  a.fillStyle = '#2a1414';
  a.fillRect(0, 0, size, size);
  h.fillStyle = '#000';
  h.fillRect(0, 0, size, size);
  r.fillStyle = '#b0b0b0';
  r.fillRect(0, 0, size, size);
  const cols = 8;
  const rows = 10;
  const cw = size / cols;
  const rh = size / rows;
  // rows drawn top -> bottom; each row overlaps the one above (shingles pointing down)
  for (let row = -1; row <= rows; row++) {
    for (let col = -1; col <= cols; col++) {
      const cx = (col + (row % 2 ? 0.5 : 0)) * cw;
      const top = row * rh - rh * 0.35;
      const bw = cw * 0.54;
      const bh = rh * 1.35;
      const shape = (ctx: CanvasRenderingContext2D, dx: number, dy: number, inset: number) => {
        const x = cx + dx;
        const y = top + dy;
        ctx.beginPath();
        ctx.moveTo(x - bw + inset, y + inset);
        ctx.lineTo(x + bw - inset, y + inset);
        ctx.quadraticCurveTo(x + bw - inset, y + bh * 0.62, x, y + bh - inset * 1.4);
        ctx.quadraticCurveTo(x - bw + inset, y + bh * 0.62, x - bw + inset, y + inset);
        ctx.closePath();
      };
      const tone = 0.75 + rnd() * 0.35;
      const wear = rnd();
      wrapDraw(size, size, cx, top + bh / 2, Math.max(bw, bh), (dx, dy) => {
        // albedo: outline groove, plate body with vertical gradient, bright worn rim
        shape(a, dx, dy, 0);
        a.fillStyle = '#120808';
        a.fill();
        shape(a, dx, dy, cw * 0.035);
        const g = a.createLinearGradient(0, top + dy, 0, top + dy + bh);
        const c0 = Math.round(150 * tone);
        const c1 = Math.round(205 * tone);
        g.addColorStop(0, `rgb(${c0 * 0.55 | 0},${c0 * 0.36 | 0},${c0 * 0.34 | 0})`);
        g.addColorStop(0.7, `rgb(${c1 * 0.95 | 0},${c1 * 0.72 | 0},${c1 * 0.66 | 0})`);
        g.addColorStop(1, `rgb(${(c1 * 1.0) | 0},${(c1 * 0.82) | 0},${(c1 * 0.7) | 0})`);
        a.fillStyle = g;
        a.fill();
        a.lineWidth = Math.max(1, size / 700);
        a.strokeStyle = `rgba(255,220,190,${0.25 + wear * 0.35})`;
        a.stroke();
        // height: dome rising towards the free lower edge
        shape(h, dx, dy, 0);
        h.fillStyle = '#000';
        h.fill();
        shape(h, dx, dy, cw * 0.04);
        const hg = h.createLinearGradient(0, top + dy, 0, top + dy + bh);
        hg.addColorStop(0, '#303030');
        hg.addColorStop(0.75, '#c8c8c8');
        hg.addColorStop(1, '#e0e0e0');
        h.fillStyle = hg;
        h.fill();
        // centre ridge
        h.strokeStyle = 'rgba(255,255,255,0.35)';
        h.lineWidth = cw * 0.05;
        h.beginPath();
        h.moveTo(cx + dx, top + dy + bh * 0.2);
        h.lineTo(cx + dx, top + dy + bh * 0.85);
        h.stroke();
        // rivet
        const rx = cx + dx;
        const ry = top + dy + bh * 0.28;
        const rg = h.createRadialGradient(rx, ry, 0, rx, ry, cw * 0.06);
        rg.addColorStop(0, '#fff');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        h.fillStyle = rg;
        h.fillRect(rx - cw * 0.07, ry - cw * 0.07, cw * 0.14, cw * 0.14);
        a.fillStyle = 'rgba(40,30,30,0.9)';
        a.beginPath();
        a.arc(rx, ry, cw * 0.035, 0, Math.PI * 2);
        a.fill();
        // roughness: grooves rough, plates satin, worn rims polished
        shape(r, dx, dy, 0);
        r.fillStyle = '#e8e8e8';
        r.fill();
        shape(r, dx, dy, cw * 0.035);
        r.fillStyle = `rgb(${(95 + rnd() * 50) | 0},${(95 + rnd() * 50) | 0},${(95 + rnd() * 50) | 0})`;
        r.fill();
        r.lineWidth = cw * 0.03;
        r.strokeStyle = 'rgba(40,40,40,0.8)';
        r.stroke();
      });
    }
  }
  // grime + scratches
  for (let i = 0; i < size * 1.2; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const l = size * (0.004 + rnd() * 0.02);
    const ang = rnd() * Math.PI;
    a.strokeStyle = `rgba(255,230,210,${0.05 + rnd() * 0.12})`;
    a.lineWidth = 1;
    a.beginPath();
    a.moveTo(x, y);
    a.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l);
    a.stroke();
    r.strokeStyle = 'rgba(60,60,60,0.5)';
    r.beginPath();
    r.moveTo(x, y);
    r.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l);
    r.stroke();
  }
  return {
    map: canvasTex(ac, true, aniso),
    normalMap: normalFromHeight(hc, hs / 160),
    roughnessMap: canvasTex(rc, false, aniso),
  };
}

/**
 * Machined armour panels: random rectangular subdivision with recessed seams, rivet rows,
 * scratches and oily grime. Neutral albedo (tinted by material/vertex colour).
 */
export function panelTextures(size: number, aniso: number): PbrSet {
  const [ac, a] = canvas(size, size);
  const hs = Math.max(256, size >> 1);
  const [hc, h] = canvas(hs, hs);
  h.setTransform(hs / size, 0, 0, hs / size, 0, 0);
  const [rc, r] = canvas(size, size);
  const rnd = mulberry(4242);
  a.fillStyle = '#b8b0a8';
  a.fillRect(0, 0, size, size);
  h.fillStyle = '#808080';
  h.fillRect(0, 0, size, size);
  r.fillStyle = '#707070';
  r.fillRect(0, 0, size, size);
  const rects: [number, number, number, number][] = [];
  const split = (x: number, y: number, w: number, hh: number, d: number) => {
    if (d > 4 || (d > 1 && rnd() < 0.25) || w < size / 12 || hh < size / 12) {
      rects.push([x, y, w, hh]);
      return;
    }
    if (w > hh) {
      const s = w * (0.3 + rnd() * 0.4);
      split(x, y, s, hh, d + 1);
      split(x + s, y, w - s, hh, d + 1);
    } else {
      const s = hh * (0.3 + rnd() * 0.4);
      split(x, y, w, s, d + 1);
      split(x, y + s, w, hh - s, d + 1);
    }
  };
  split(0, 0, size, size, 0);
  const seam = Math.max(2, size / 256);
  for (const [x, y, w, hh] of rects) {
    const t = 0.85 + rnd() * 0.25;
    a.fillStyle = `rgb(${(188 * t) | 0},${(180 * t) | 0},${(172 * t) | 0})`;
    a.fillRect(x + seam, y + seam, w - seam * 2, hh - seam * 2);
    // bevelled panel height
    const g = h.createLinearGradient(x, y, x, y + hh);
    g.addColorStop(0, '#9a9a9a');
    g.addColorStop(1, '#8a8a8a');
    h.fillStyle = '#303030';
    h.fillRect(x, y, w, hh);
    h.fillStyle = g;
    h.fillRect(x + seam, y + seam, w - seam * 2, hh - seam * 2);
    r.fillStyle = `rgb(${(80 + rnd() * 60) | 0},0,0)`;
    r.fillStyle = `rgb(${(80 + rnd() * 60) | 0},${(80 + rnd() * 60) | 0},${(80 + rnd() * 60) | 0})`;
    r.fillRect(x + seam, y + seam, w - seam * 2, hh - seam * 2);
    // seam darkening in albedo
    a.strokeStyle = 'rgba(20,16,14,0.9)';
    a.lineWidth = seam;
    a.strokeRect(x + seam / 2, y + seam / 2, w - seam, hh - seam);
    // rivets along the long edges
    const step = size / 40;
    const rr = size / 300 + 1;
    const rivet = (px: number, py: number) => {
      const rg = h.createRadialGradient(px, py, 0, px, py, rr * 2);
      rg.addColorStop(0, '#ffffff');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      h.fillStyle = rg;
      h.fillRect(px - rr * 2, py - rr * 2, rr * 4, rr * 4);
      a.fillStyle = 'rgba(230,220,210,0.9)';
      a.beginPath();
      a.arc(px, py, rr, 0, Math.PI * 2);
      a.fill();
    };
    if (w > hh) for (let px = x + step; px < x + w - step / 2; px += step) rivet(px, y + seam * 3.5);
    else for (let py = y + step; py < y + hh - step / 2; py += step) rivet(x + seam * 3.5, py);
  }
  for (let i = 0; i < size * 2; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const l = size * (0.003 + rnd() * 0.03);
    const ang = rnd() < 0.7 ? rnd() * 0.3 : rnd() * Math.PI;
    a.strokeStyle = `rgba(255,250,240,${0.06 + rnd() * 0.15})`;
    a.lineWidth = 1;
    a.beginPath();
    a.moveTo(x, y);
    a.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l);
    a.stroke();
    r.strokeStyle = 'rgba(30,30,30,0.6)';
    r.beginPath();
    r.moveTo(x, y);
    r.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l);
    r.stroke();
  }
  // grime streaks running down
  for (let i = 0; i < 60; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const g = a.createLinearGradient(x, y, x, y + size * 0.2);
    g.addColorStop(0, 'rgba(30,20,15,0.25)');
    g.addColorStop(1, 'rgba(30,20,15,0)');
    a.fillStyle = g;
    a.fillRect(x, y, size * (0.005 + rnd() * 0.02), size * 0.2);
  }
  return {
    map: canvasTex(ac, true, aniso),
    normalMap: normalFromHeight(hc, hs / 220),
    roughnessMap: canvasTex(rc, false, aniso),
  };
}

/** Brushed steel: fine streaks along V (roughness + subtle normal). */
export function steelTextures(size: number, aniso: number): PbrSet {
  const [ac, a] = canvas(size, size);
  const [hc, h] = canvas(size, size);
  const [rc, r] = canvas(size, size);
  const rnd = mulberry(99);
  a.fillStyle = '#c8ccd2';
  a.fillRect(0, 0, size, size);
  h.fillStyle = '#808080';
  h.fillRect(0, 0, size, size);
  r.fillStyle = '#5a5a5a';
  r.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 3; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const l = size * (0.05 + rnd() * 0.4);
    const v = rnd();
    r.strokeStyle = `rgba(${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${0.04 + rnd() * 0.08})`;
    r.lineWidth = 1;
    r.beginPath();
    r.moveTo(x, y);
    r.lineTo(x + (rnd() - 0.5) * 2, y + l);
    r.stroke();
    h.strokeStyle = `rgba(${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},0.08)`;
    h.beginPath();
    h.moveTo(x, y);
    h.lineTo(x, y + l);
    h.stroke();
    a.strokeStyle = `rgba(${v > 0.5 ? 255 : 60},${v > 0.5 ? 255 : 60},${v > 0.5 ? 255 : 70},0.05)`;
    a.beginPath();
    a.moveTo(x, y);
    a.lineTo(x, y + l);
    a.stroke();
  }
  // a few dings / dark blotches
  for (let i = 0; i < 40; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const rr = size * (0.01 + rnd() * 0.04);
    const g = a.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, 'rgba(70,60,55,0.35)');
    g.addColorStop(1, 'rgba(70,60,55,0)');
    a.fillStyle = g;
    a.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    const g2 = r.createRadialGradient(x, y, 0, x, y, rr);
    g2.addColorStop(0, 'rgba(200,200,200,0.4)');
    g2.addColorStop(1, 'rgba(200,200,200,0)');
    r.fillStyle = g2;
    r.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  return {
    map: canvasTex(ac, true, aniso),
    normalMap: normalFromHeight(hc, size / 400),
    roughnessMap: canvasTex(rc, false, aniso),
  };
}

/**
 * Printed wing membrane: rising flame tongues (sun-yellow cores, orange, red, crimson) with black
 * soot outlines on a dark crimson ground. u = across the panel, v = from the wrist to the top edge.
 * Wraps horizontally.
 */
export function flameTexture(w: number, h: number, aniso: number): THREE.Texture {
  const [c, a] = canvas(w, h);
  const rnd = mulberry(7);
  const bg = a.createLinearGradient(0, h, 0, 0);
  bg.addColorStop(0, '#2a0a0c');
  bg.addColorStop(0.5, '#5a1418');
  bg.addColorStop(1, '#3a0c10');
  a.fillStyle = bg;
  a.fillRect(0, 0, w, h);
  const layers: { n: number; scale: number; cols: string[] }[] = [
    { n: 22, scale: 1.0, cols: ['#6E1A1E', '#8a2420', '#1A1214'] },
    { n: 34, scale: 0.8, cols: ['#B0382A', '#c4462c', '#1A1214'] },
    { n: 40, scale: 0.62, cols: ['#E0662A', '#ec7a2c', '#1A1214'] },
    { n: 36, scale: 0.45, cols: ['#F6B23A', '#ffd35a', '#3a1210'] },
  ];
  for (const L of layers) {
    for (let i = 0; i < L.n; i++) {
      const x = rnd() * w;
      const base = h * (0.6 + rnd() * 0.5); // canvas y (down); flames rise towards y=0
      const fh = h * (0.28 + rnd() * 0.45) * L.scale;
      const fw = w * (0.035 + rnd() * 0.06) * (0.6 + L.scale * 0.6);
      const lean = (rnd() - 0.5) * fw * 1.6;
      const curl = (rnd() - 0.5) * fw * 2.2;
      const drawFlame = (dx: number) => {
        const bx = x + dx;
        a.beginPath();
        a.moveTo(bx - fw, base);
        a.bezierCurveTo(bx - fw * 1.3, base - fh * 0.4, bx - fw * 0.2 + lean, base - fh * 0.6, bx + curl + lean, base - fh);
        a.bezierCurveTo(bx + fw * 0.4 + lean, base - fh * 0.62, bx + fw * 1.4, base - fh * 0.35, bx + fw, base);
        a.closePath();
        const g = a.createLinearGradient(0, base, 0, base - fh);
        g.addColorStop(0, L.cols[1]);
        g.addColorStop(0.55, L.cols[0]);
        g.addColorStop(1, L.cols[0]);
        a.fillStyle = g;
        a.fill();
        a.lineWidth = Math.max(1.5, w / 380);
        a.strokeStyle = L.cols[2];
        a.stroke();
      };
      wrapDraw(w, h, x, base, fw * 2.5, (dx) => drawFlame(dx));
    }
  }
  // soot swirls
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    a.strokeStyle = `rgba(20,10,12,${0.3 + rnd() * 0.4})`;
    a.lineWidth = w / 260 + rnd() * 3;
    a.beginPath();
    a.moveTo(x, y);
    a.bezierCurveTo(x + (rnd() - 0.5) * w * 0.1, y - h * 0.05, x + (rnd() - 0.5) * w * 0.1, y - h * 0.1, x + (rnd() - 0.5) * w * 0.06, y - h * 0.16);
    a.stroke();
  }
  const t = canvasTex(c, true, aniso);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/**
 * Lava-crack hide for the neck and chest: voronoi cracks. Albedo = soot black plates with ember
 * rims; emissive = crack mask (driven by the inner-fire uniform).
 */
export function lavaTextures(size: number, aniso: number): { map: THREE.Texture; emissiveMap: THREE.Texture } {
  const rnd = mulberry(555);
  const cells = 9;
  const pts: number[] = [];
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) pts.push((i + 0.15 + rnd() * 0.7) / cells, (j + 0.15 + rnd() * 0.7) / cells);
  const alb = new Uint8Array(size * size * 4);
  const em = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const ci = Math.floor(u * cells);
      const cj = Math.floor(v * cells);
      let d1 = 9;
      let d2 = 9;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ii = (((ci + di) % cells) + cells) % cells;
          const jj = (((cj + dj) % cells) + cells) % cells;
          const px = pts[(jj * cells + ii) * 2] + (ci + di - ii) / cells;
          const py = pts[(jj * cells + ii) * 2 + 1] + (cj + dj - jj) / cells;
          const d = (px - u) * (px - u) + (py - v) * (py - v);
          if (d < d1) {
            d2 = d1;
            d1 = d;
          } else if (d < d2) d2 = d;
        }
      }
      d1 = Math.sqrt(d1);
      d2 = Math.sqrt(d2);
      const edge = d2 - d1; // 0 at the crack
      const crack = Math.max(0, 1 - edge * cells * 7);
      const glow = Math.max(0, 1 - edge * cells * 2.2);
      const i = (y * size + x) * 4;
      const plate = 0.16 + 0.1 * (d1 * cells);
      alb[i] = Math.min(255, (plate * 0.9 + glow * 0.5 + crack * 0.6) * 255);
      alb[i + 1] = Math.min(255, (plate * 0.55 + glow * 0.18 + crack * 0.35) * 255);
      alb[i + 2] = Math.min(255, (plate * 0.5 + crack * 0.08) * 255);
      alb[i + 3] = 255;
      const e = Math.min(1, crack + glow * 0.35);
      em[i] = em[i + 1] = em[i + 2] = e * 255;
      em[i + 3] = 255;
    }
  }
  const map = new THREE.DataTexture(alb, size, size, THREE.RGBAFormat);
  finish(map, true, aniso);
  const emissiveMap = new THREE.DataTexture(em, size, size, THREE.RGBAFormat);
  finish(emissiveMap, true, aniso);
  return { map, emissiveMap };
}
