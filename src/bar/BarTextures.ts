import * as THREE from 'three';
import { Rng } from '../core/rng';
import { CATEGORY_LABEL, CATEGORY_ORDER, DRINKS } from './drinks';

/** Procedural canvas textures for the bars (generated once at load; no downloads). */

const DISPLAY = "'Oswald', 'Arial Narrow', 'Liberation Sans Narrow', 'DejaVu Sans Condensed', Impact, sans-serif";
const BODY = "'Inter', 'Liberation Sans', 'DejaVu Sans', Arial, sans-serif";

/** Wait (max ~1.2 s) for the web fonts so canvas text uses Oswald/Inter when available. */
export async function fontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  const load = Promise.all([fonts.load("700 120px 'Oswald'"), fonts.load("600 40px 'Inter'"), fonts.load("400 40px 'Inter'")]).catch(() => undefined);
  await Promise.race([load, new Promise((r) => setTimeout(r, 1200))]);
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  return [c, g];
}

function tex(c: HTMLCanvasElement, srgb = true, repeat = false, anisotropy = 4): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

/** angular mechanical wing (the same original motif as the UI emblem), dir -1 = left, +1 = right */
function wing(g: CanvasRenderingContext2D, x0: number, yc: number, k: number, dir: 1 | -1) {
  const pts = [
    [22.5, 30.5],
    [5, 22],
    [11.2, 36.5],
    [4, 44],
    [18.3, 42.8],
    [22, 51],
    [28.2, 43.4],
  ];
  g.beginPath();
  pts.forEach(([px, py], i) => {
    const x = x0 - dir * (px - 25) * k;
    const y = yc + (py - 37) * k;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  g.stroke();
}

/** "BAR" light-box face: black box, red frame, white-hot condensed letters with red bloom. */
export function signTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 288);
  const W = c.width,
    H = c.height;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#120304');
  bg.addColorStop(1, '#050102');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // inner frame
  g.strokeStyle = '#ff2010';
  g.lineWidth = 7;
  g.shadowColor = '#ff1a00';
  g.shadowBlur = 22;
  g.strokeRect(16, 16, W - 32, H - 32);
  g.lineWidth = 2;
  g.strokeRect(30, 30, W - 60, H - 60);
  // wings
  g.lineWidth = 9;
  g.lineJoin = 'miter';
  g.strokeStyle = '#ff2a12';
  wing(g, W / 2 - 205, H / 2 - 2, 5.2, -1);
  wing(g, W / 2 + 205, H / 2 - 2, 5.2, 1);
  // letters: red bloom pass then white-hot core
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 196px ${DISPLAY}`;
  g.shadowColor = '#ff1200';
  g.shadowBlur = 48;
  g.fillStyle = '#ff3a1a';
  g.fillText('BAR', W / 2, H / 2 + 8);
  g.shadowBlur = 16;
  g.fillStyle = '#fff1e6';
  g.fillText('BAR', W / 2, H / 2 + 8);
  g.shadowBlur = 0;
  // small caption
  g.font = `600 22px ${BODY}`;
  g.fillStyle = '#ff6a4a';
  g.fillText('DRINKS  ·  WATER  ·  COINS', W / 2, H - 50);
  return tex(c);
}

/** Price board with the drawn menu (reads DRINKS so it always matches the ordering UI). */
export function menuBoardTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 512);
  const W = c.width,
    H = c.height;
  g.fillStyle = '#0b0b0e';
  g.fillRect(0, 0, W, H);
  // subtle vignette + grain
  const rg = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
  rg.addColorStop(0, 'rgba(60,20,20,0.35)');
  rg.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = rg;
  g.fillRect(0, 0, W, H);
  const rng = new Rng(77);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(255,255,255,${rng.range(0.01, 0.04)})`;
    g.fillRect(rng.range(0, W), rng.range(0, H), 1.5, 1.5);
  }
  g.strokeStyle = '#e10600';
  g.lineWidth = 4;
  g.strokeRect(10, 10, W - 20, H - 20);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.fillStyle = '#f3ede4';
  g.font = `700 54px ${DISPLAY}`;
  g.fillText('DRINKS', 40, 76);
  g.fillStyle = '#e10600';
  g.fillRect(40, 90, 180, 5);
  g.font = `500 20px ${BODY}`;
  g.fillStyle = '#a39b92';
  g.textAlign = 'right';
  g.fillText('CASHLESS · PAY WITH YOUR BRACELET · € 2 CUP DEPOSIT', W - 40, 70);

  const price = (x: number, y: number, n: number) => {
    g.fillStyle = n === 0 ? '#7fd08a' : '#fff';
    g.font = `700 22px ${BODY}`;
    g.textAlign = 'right';
    g.fillText(n === 0 ? 'FREE' : `€ ${n.toFixed(2)}`, x + 30, y + 8);
  };
  const cols = [
    { x: 40, cats: CATEGORY_ORDER.slice(0, 3) },
    { x: 540, cats: CATEGORY_ORDER.slice(3) },
  ];
  for (const col of cols) {
    let y = 136;
    for (const cat of col.cats) {
      g.textAlign = 'left';
      g.font = `600 22px ${DISPLAY}`;
      g.fillStyle = '#e10600';
      g.fillText(CATEGORY_LABEL[cat].toUpperCase(), col.x, y);
      y += 30;
      for (const dr of DRINKS.filter((x) => x.category === cat)) {
        g.textAlign = 'left';
        g.font = `600 23px ${BODY}`;
        g.fillStyle = '#f3ede4';
        g.fillText(dr.name, col.x, y);
        g.font = `400 16px ${BODY}`;
        g.fillStyle = '#8d857d';
        const spec = dr.abv > 0 ? `${dr.volumeMl / 10} cl · ${(dr.abv * 100).toFixed(1)}%` : `${dr.volumeMl / 10} cl`;
        g.fillText(spec, col.x + measure(g, dr.name, `600 23px ${BODY}`) + 12, y);
        price(col.x + 420, y - 8, dr.price);
        y += 32;
      }
      y += 8;
    }
  }
  g.textAlign = 'center';
  g.font = `500 17px ${BODY}`;
  g.fillStyle = '#8d857d';
  g.fillText('FREE WATER AT EVERY WATER POINT   ·   NO ALCOHOL UNDER 18   ·   DRINK RESPONSIBLY', W / 2, H - 28);
  return tex(c);
}

function measure(g: CanvasRenderingContext2D, text: string, font: string): number {
  const f = g.font;
  g.font = font;
  const w = g.measureText(text).width;
  g.font = f;
  return w;
}

/** Glass-door drinks fridge (used as map + emissive map). */
export function fridgeTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 512);
  const W = c.width,
    H = c.height;
  g.fillStyle = '#0d0f12';
  g.fillRect(0, 0, W, H);
  // interior light
  const lg = g.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, '#dff3ff');
  lg.addColorStop(0.25, '#8fb8d6');
  lg.addColorStop(1, '#2a3a4a');
  g.fillStyle = lg;
  g.fillRect(18, 44, W - 36, H - 80);
  const rng = new Rng(9);
  const shelves = 5;
  const sh = (H - 90) / shelves;
  const palette = ['#c8102e', '#e8e8e8', '#1f7a2e', '#6a3a12', '#f2c230', '#1c3fa0', '#b8b8b8', '#ff5a12'];
  for (let s = 0; s < shelves; s++) {
    const y0 = 48 + s * sh;
    const base = y0 + sh - 6;
    let x = 24;
    const kind = rng.int(0, 2);
    while (x < W - 30) {
      const col = rng.pick(palette);
      if (kind === 0) {
        // cans
        const w = 22;
        g.fillStyle = col;
        g.fillRect(x, base - 44, w, 44);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(x + 4, base - 44, 4, 44);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(x, base - 44, w, 4);
        x += w + 3;
      } else {
        // bottles
        const w = 20;
        const bh = rng.range(58, 74);
        g.fillStyle = col;
        g.fillRect(x, base - bh + 22, w, bh - 22);
        g.fillRect(x + 6, base - bh, 8, 24);
        g.fillStyle = 'rgba(255,255,255,0.4)';
        g.fillRect(x + 3, base - bh + 26, 3, bh - 30);
        g.fillStyle = '#f3ede4';
        g.fillRect(x + 1, base - bh * 0.55, w - 2, 12);
        x += w + 5;
      }
    }
    // shelf edge
    g.fillStyle = '#e8f4ff';
    g.fillRect(18, base, W - 36, 4);
  }
  // glass reflection
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.beginPath();
  g.moveTo(40, 44);
  g.lineTo(110, 44);
  g.lineTo(30, H - 36);
  g.lineTo(18, H - 36);
  g.lineTo(18, 200);
  g.fill();
  // frame + brand-free header
  g.strokeStyle = '#2a2d33';
  g.lineWidth = 16;
  g.strokeRect(8, 8, W - 16, H - 16);
  g.fillStyle = '#c8102e';
  g.fillRect(16, 16, W - 32, 26);
  g.fillStyle = '#fff';
  g.font = `700 18px ${DISPLAY}`;
  g.textAlign = 'center';
  g.fillText('ICE COLD', W / 2, 36);
  return tex(c);
}

/** Backlit red counter front with vertical slats (repeats along the counter). */
export function counterFrontTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  const W = c.width,
    H = c.height;
  const lg = g.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, '#3a0000');
  lg.addColorStop(0.18, '#c40800');
  lg.addColorStop(0.55, '#ff2a0a');
  lg.addColorStop(0.85, '#b00600');
  lg.addColorStop(1, '#2a0000');
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);
  // slats
  for (let x = 0; x < W; x += 32) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(x, 0, 5, H);
    g.fillStyle = 'rgba(255,190,150,0.25)';
    g.fillRect(x + 5, 0, 2, H);
  }
  // top & bottom rails
  g.fillStyle = '#0a0a0c';
  g.fillRect(0, 0, W, 14);
  g.fillRect(0, H - 18, W, 18);
  return tex(c, true, true);
}

/** Festival ground-protection plates (trackway) — dimpled aluminium/plastic panels. */
export function trackwayTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  const W = c.width,
    H = c.height;
  g.fillStyle = '#3b3d3f';
  g.fillRect(0, 0, W, H);
  const rng = new Rng(4);
  for (let i = 0; i < 1400; i++) {
    const v = rng.range(40, 80);
    g.fillStyle = `rgb(${v},${v},${v + 2})`;
    g.fillRect(rng.range(0, W), rng.range(0, H), 2, 2);
  }
  for (let y = 8; y < H; y += 16) {
    for (let x = (y / 16) % 2 ? 8 : 16; x < W; x += 16) {
      g.fillStyle = '#56595c';
      g.beginPath();
      g.ellipse(x, y, 4, 2.4, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#26282a';
      g.fillRect(x - 4, y + 2, 8, 1);
    }
  }
  // plate seams
  g.fillStyle = '#151617';
  g.fillRect(0, 0, W, 3);
  g.fillRect(0, 0, 3, H);
  // mud
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(40,30,18,${rng.range(0.05, 0.2)})`;
    g.beginPath();
    g.ellipse(rng.range(0, W), rng.range(0, H), rng.range(6, 30), rng.range(3, 12), rng.range(0, 3), 0, Math.PI * 2);
    g.fill();
  }
  return tex(c, true, true, 8);
}

/**
 * Soft light spill for the ground in front of the counter: brightest at the counter edge (v = 1),
 * fading to exactly zero at the sides and the far edge (no visible decal border).
 */
export function glowTexture(): THREE.CanvasTexture {
  const W = 128,
    H = 128;
  const [c, g] = canvas(W, H);
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = ((x + 0.5) / W - 0.5) * 2;
      const dy = (y + 0.5) / H; // 0 at the counter edge (top of the canvas = v 1)
      const r = Math.min(1, Math.sqrt(dx * dx * 0.9 + dy * dy));
      const a = Math.pow(1 - r, 2.2);
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return tex(c, false);
}

/** Matcap for the first-person cup (lighting independent, warm stage key + red rim). */
export function matcapTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  const S = 256;
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x / (S - 1)) * 2 - 1;
      const ny = -((y / (S - 1)) * 2 - 1);
      const r2 = nx * nx + ny * ny;
      const i = (y * S + x) * 4;
      if (r2 > 1) {
        img.data[i + 3] = 255;
        continue;
      }
      const nz = Math.sqrt(1 - r2);
      // key light: upper left, warm
      const kd = Math.max(0, nx * -0.45 + ny * 0.55 + nz * 0.7);
      // rim from the stage (red, right)
      const rim = Math.pow(1 - nz, 2.2) * Math.max(0, nx * 0.8 + 0.3);
      // specular highlight
      const hx = nx + 0.35,
        hy = ny - 0.45;
      const spec = Math.exp(-(hx * hx + hy * hy) * 28);
      const amb = 0.16 + 0.1 * ny;
      const r = amb + kd * 0.78 + rim * 0.9 + spec * 0.9;
      const gg = amb + kd * 0.66 + rim * 0.18 + spec * 0.85;
      const b = amb + kd * 0.56 + rim * 0.12 + spec * 0.8;
      img.data[i] = Math.min(255, r * 230);
      img.data[i + 1] = Math.min(255, gg * 230);
      img.data[i + 2] = Math.min(255, b * 230);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}
