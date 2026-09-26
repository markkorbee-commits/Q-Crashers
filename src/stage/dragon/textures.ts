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
 * Printed wing membrane (daytime photos): a painted inferno - billowing orange / yellow flame
 * streams rising from the wrist through black smoke clouds and dark soot "bubbles" on a deep red
 * ground, fine glowing veins in the dark areas and a warm yellow glow under the gilded top hem.
 * u = across the panel, v = from the wrist (canvas bottom) to the top edge. Wraps horizontally.
 */
export function flameTexture(w: number, h: number, aniso: number): THREE.Texture {
  const [c, a] = canvas(w, h);
  const rnd = mulberry(7);
  const S = w / 2048;
  // ground: hot red low down, maroon / soot higher up
  const bg = a.createLinearGradient(0, h, 0, 0);
  bg.addColorStop(0, '#a8300f');
  bg.addColorStop(0.22, '#7a1a10');
  bg.addColorStop(0.55, '#4a0e0c');
  bg.addColorStop(0.88, '#380a0a');
  bg.addColorStop(1, '#5a1a0c');
  a.fillStyle = bg;
  a.fillRect(0, 0, w, h);
  const blob = (x: number, y: number, r: number, c0: string, c1: string) => {
    wrapDraw(w, h, x, y, r, (dx) => {
      const g = a.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      a.fillStyle = g;
      a.beginPath();
      a.arc(x + dx, y, r, 0, Math.PI * 2);
      a.fill();
    });
  };
  // red under-glow patches (the ground is never flat in the print)
  for (let i = 0; i < 40; i++) blob(rnd() * w, h * (0.15 + rnd() * 0.8), w * (0.03 + rnd() * 0.05), 'rgba(170,40,20,0.45)', 'rgba(170,40,20,0)');
  // flame streams: tall soft tongues, each a hot core in an orange body (additive glow)
  const tongue = (x: number, base: number, fh: number, fw: number, sway: number, phase: number, body: string, bodyTip: string, core: string | null) => {
    const N = 22;
    const side = (sgn: number, dx: number, k: number) => {
      const pts: [number, number][] = [];
      for (let j = 0; j <= N; j++) {
        const t = j / N;
        const cx = x + dx + sway * Math.sin(t * Math.PI * 1.6 + phase) * t;
        const hw = fw * k * Math.pow(1 - t, 0.8) * (0.7 + 0.5 * Math.sin(t * Math.PI + 0.3));
        pts.push([cx + sgn * hw, base - t * fh]);
      }
      return pts;
    };
    wrapDraw(w, h, x, base - fh / 2, Math.max(fh, fw * 6), (dx) => {
      const draw = (k: number, fill: string | CanvasGradient) => {
        const l = side(-1, dx, k);
        const r = side(1, dx, k).reverse();
        a.beginPath();
        a.moveTo(l[0][0], l[0][1]);
        for (const [px, py] of l) a.lineTo(px, py);
        for (const [px, py] of r) a.lineTo(px, py);
        a.closePath();
        a.fillStyle = fill;
        a.fill();
      };
      const g = a.createLinearGradient(0, base, 0, base - fh);
      g.addColorStop(0, body);
      g.addColorStop(0.65, bodyTip);
      g.addColorStop(1, 'rgba(120,20,10,0)');
      a.shadowColor = 'rgba(255,110,30,0.6)';
      a.shadowBlur = 14 * S;
      draw(1, g);
      a.shadowBlur = 0;
      if (core) {
        const g2 = a.createLinearGradient(0, base, 0, base - fh * 0.75);
        g2.addColorStop(0, core);
        g2.addColorStop(0.7, 'rgba(255,190,60,0.55)');
        g2.addColorStop(1, 'rgba(255,160,40,0)');
        draw(0.42, g2);
      }
    });
  };
  // back layer: tall dark-orange tongues through the whole panel
  for (let i = 0; i < 26; i++) {
    const fh = h * (0.45 + rnd() * 0.5);
    tongue(rnd() * w, h * (1.02 + rnd() * 0.05), fh, w * (0.02 + rnd() * 0.022), w * (rnd() - 0.5) * 0.08, rnd() * 6, 'rgba(220,70,20,0.9)', 'rgba(170,40,16,0.75)', null);
  }
  // black smoke clouds: clusters of soft dark puffs, mostly in the upper two thirds
  for (let i = 0; i < 22; i++) {
    const cx = rnd() * w;
    const cy = h * (0.08 + rnd() * 0.62);
    const n = 5 + Math.floor(rnd() * 7);
    for (let j = 0; j < n; j++) {
      const r = w * (0.012 + rnd() * 0.03);
      blob(cx + (rnd() - 0.5) * w * 0.07, cy + (rnd() - 0.5) * h * 0.1, r, 'rgba(14,6,6,0.82)', 'rgba(14,6,6,0)');
    }
  }
  // soot bubbles: dark spheres with a warm rim light
  for (let i = 0; i < 34; i++) {
    const x = rnd() * w;
    const y = h * (0.1 + rnd() * 0.75);
    const r = w * (0.004 + rnd() * 0.011);
    wrapDraw(w, h, x, y, r * 1.4, (dx) => {
      const g = a.createRadialGradient(x + dx - r * 0.35, y - r * 0.35, r * 0.1, x + dx, y, r);
      g.addColorStop(0, '#5a2a1c');
      g.addColorStop(0.6, '#1c0c0a');
      g.addColorStop(0.92, '#140806');
      g.addColorStop(1, 'rgba(255,120,40,0.7)');
      a.fillStyle = g;
      a.beginPath();
      a.arc(x + dx, y, r, 0, Math.PI * 2);
      a.fill();
    });
  }
  // glowing veins in the dark areas
  a.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    let x = rnd() * w;
    let y = h * (0.05 + rnd() * 0.7);
    a.strokeStyle = `rgba(255,${(90 + rnd() * 60) | 0},30,${0.25 + rnd() * 0.3})`;
    a.lineWidth = Math.max(1, 2.2 * S * (0.5 + rnd()));
    let ang = rnd() * Math.PI * 2;
    const pts: [number, number][] = [[x, y]];
    for (let j = 0; j < 8; j++) {
      ang += (rnd() - 0.5) * 1.4;
      x += Math.cos(ang) * w * 0.008;
      y += Math.sin(ang) * w * 0.008;
      pts.push([x, y]);
    }
    wrapDraw(w, h, pts[0][0], pts[0][1], w * 0.08, (dx) => {
      a.beginPath();
      a.moveTo(pts[0][0] + dx, pts[0][1]);
      for (const [px, py] of pts) a.lineTo(px + dx, py);
      a.stroke();
    });
  }
  // front layer: bright orange streams with yellow cores rising from the wrist
  for (let i = 0; i < 34; i++) {
    const fh = h * (0.25 + rnd() * 0.5);
    tongue(rnd() * w, h * (1.0 + rnd() * 0.06), fh, w * (0.012 + rnd() * 0.02), w * (rnd() - 0.5) * 0.06, rnd() * 6, 'rgba(255,128,26,0.95)', 'rgba(236,84,20,0.8)', '#ffe070');
  }
  // floating flame licks higher up (the fire climbs through the smoke)
  for (let i = 0; i < 18; i++) {
    const fh = h * (0.12 + rnd() * 0.18);
    tongue(rnd() * w, h * (0.35 + rnd() * 0.45), fh, w * (0.008 + rnd() * 0.012), w * (rnd() - 0.5) * 0.04, rnd() * 6, 'rgba(255,140,30,0.85)', 'rgba(230,80,20,0.6)', '#ffd860');
  }
  // warm glow under the gilded top hem
  const top = a.createLinearGradient(0, 0, 0, h * 0.14);
  top.addColorStop(0, 'rgba(255,196,80,0.75)');
  top.addColorStop(0.45, 'rgba(250,140,40,0.35)');
  top.addColorStop(1, 'rgba(230,100,30,0)');
  a.fillStyle = top;
  a.fillRect(0, 0, w, h * 0.14);
  const t = canvasTex(c, true, aniso);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/**
 * Leopard / giraffe hide for the neck, back and chest (daytime photos): rounded orange-tan patches
 * separated by an irregular dark-brown network, darker spots inside the bigger patches, a paler
 * centre per patch. Emissive = the patch interiors (the inner fire shines through the orange skin
 * in rage / ember looks while the dark network stays black) - weighted so its mean matches the old
 * lava-crack map.
 */
export function lavaTextures(size: number, aniso: number): { map: THREE.Texture; emissiveMap: THREE.Texture } {
  const rnd = mulberry(555);
  const cells = 9;
  const pts: number[] = [];
  const tone: number[] = [];
  for (let j = 0; j < cells; j++)
    for (let i = 0; i < cells; i++) {
      pts.push((i + 0.15 + rnd() * 0.7) / cells, (j + 0.15 + rnd() * 0.7) / cells);
      tone.push(rnd());
    }
  const alb = new Uint8Array(size * size * 4);
  const em = new Uint8Array(size * size * 4);
  // cheap tileable value noise for the wobbly network edges
  const nz = (x: number, y: number, f: number) => {
    const X = x * f,
      Y = y * f;
    const xi = Math.floor(X),
      yi = Math.floor(Y);
    const xf = X - xi,
      yf = Y - yi;
    const h = (a: number, b: number) => {
      const aa = ((a % f) + f) % f;
      const bb = ((b % f) + f) % f;
      const v = Math.sin(aa * 127.1 + bb * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const u = xf * xf * (3 - 2 * xf),
      v = yf * yf * (3 - 2 * yf);
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u0 = x / size;
      const v0 = y / size;
      const w = (nz(u0, v0, 18) - 0.5) * 0.022;
      const u = u0 + w;
      const v = v0 + (nz(u0 + 0.37, v0 + 0.61, 18) - 0.5) * 0.022;
      const ci = Math.floor(u * cells);
      const cj = Math.floor(v * cells);
      let d1 = 9;
      let d2 = 9;
      let best = 0;
      let bx = 0;
      let by = 0;
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
            best = jj * cells + ii;
            bx = px;
            by = py;
          } else if (d < d2) d2 = d;
        }
      }
      d1 = Math.sqrt(d1);
      d2 = Math.sqrt(d2);
      const edge = (d2 - d1) * cells; // 0 on the network line
      const line = 1 - THREE.MathUtils.smoothstep(edge, 0.09, 0.2);
      const t = tone[best];
      const centre = 1 - Math.min(1, d1 * cells * 1.6);
      // an inner spot in some patches
      const spot = t > 0.55 ? 1 - THREE.MathUtils.smoothstep(Math.hypot(u - bx - 0.012, v - by + 0.01) * cells, 0.12, 0.2) : 0;
      // patch colour: tan-orange with per-patch variation, a paler centre
      let r = 0.68 + 0.12 * t + 0.08 * centre;
      let g = 0.33 + 0.1 * t + 0.1 * centre;
      let b = 0.1 + 0.05 * t + 0.05 * centre;
      const k = Math.max(line, spot * 0.85);
      r = r * (1 - k) + 0.2 * k;
      g = g * (1 - k) + 0.1 * k;
      b = b * (1 - k) + 0.05 * k;
      const i = (y * size + x) * 4;
      alb[i] = Math.min(255, r * 255);
      alb[i + 1] = Math.min(255, g * 255);
      alb[i + 2] = Math.min(255, b * 255);
      alb[i + 3] = 255;
      const e = (1 - k) * (0.3 + 0.28 * centre);
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
