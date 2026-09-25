import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { heightToNormal } from './noise';

/**
 * Procedural decor atlas (drawn with Canvas2D at load time, all motifs are original designs):
 * flame-eye banners, skull medallion, bronze shield, the portal keystone emblem, skull niche,
 * kintsugi stone face, booth banner with gold scrollwork and a chevron trim strip.
 * Three atlases share one layout: albedo (sRGB), emissive (what glows at night) and a height
 * field that becomes the normal map.
 */
export type DecorRegion = 'banner' | 'medallion' | 'shield' | 'emblem' | 'skullNiche' | 'faceNiche' | 'banner2' | 'booth' | 'chevron';

/** atlas rectangles in canvas units (0..1, y down) */
export const DECOR_REGIONS: Record<DecorRegion, [number, number, number, number]> = {
  banner: [0, 0, 0.25, 0.6],
  medallion: [0.25, 0, 0.5, 0.25],
  shield: [0.5, 0, 0.75, 0.25],
  emblem: [0.75, 0, 1, 0.25],
  skullNiche: [0.25, 0.25, 0.5, 0.65],
  faceNiche: [0.5, 0.25, 0.75, 0.65],
  banner2: [0.75, 0.25, 1, 0.65],
  booth: [0, 0.65, 1, 0.9],
  chevron: [0, 0.9, 1, 1],
};

/** remap a 0..1 uv into the atlas region (texture v points up, canvas y down) */
export function regionUV(r: DecorRegion, u: number, v: number): [number, number] {
  const [x0, y0, x1, y1] = DECOR_REGIONS[r];
  return [x0 + (x1 - x0) * u, 1 - y1 + (y1 - y0) * v];
}

type Mode = 'albedo' | 'emissive' | 'height';

interface Pal {
  /** colour for semantic slot in the current mode */
  (slot: Slot): string;
}
type Slot =
  | 'void'
  | 'stone'
  | 'stoneDark'
  | 'gold'
  | 'goldDark'
  | 'bone'
  | 'boneShade'
  | 'socket'
  | 'socketGlow'
  | 'red'
  | 'redDark'
  | 'flame'
  | 'flameCore'
  | 'eyeWhite'
  | 'pupil'
  | 'bronze'
  | 'blueStone'
  | 'cream'
  | 'bannerGlow';

const ALBEDO: Record<Slot, string> = {
  void: '#0b0708',
  stone: '#8e8a84',
  stoneDark: '#4c4a4a',
  gold: '#c9a45c',
  goldDark: '#7a5a2a',
  bone: '#ddd6c4',
  boneShade: '#8f8676',
  socket: '#120b0b',
  socketGlow: '#1a0a08',
  red: '#7c0f18',
  redDark: '#3e060c',
  flame: '#f07a22',
  flameCore: '#ffd27a',
  eyeWhite: '#f2e6c8',
  pupil: '#1a0a06',
  bronze: '#8a6a3a',
  blueStone: '#6e7a8a',
  cream: '#e8e0cc',
  bannerGlow: '#7c0f18',
};
const EMISSIVE: Record<Slot, string> = {
  void: '#000000',
  stone: '#000000',
  stoneDark: '#000000',
  gold: '#000000',
  goldDark: '#000000',
  bone: '#000000',
  boneShade: '#000000',
  socket: '#000000',
  socketGlow: '#ff3a0a',
  red: '#2a0204',
  redDark: '#100001',
  flame: '#ff5a0a',
  flameCore: '#ffc060',
  eyeWhite: '#ffe8b0',
  pupil: '#000000',
  bronze: '#000000',
  blueStone: '#000000',
  cream: '#000000',
  bannerGlow: '#3a0306',
};
const HEIGHT: Record<Slot, number> = {
  void: 0,
  stone: 0.35,
  stoneDark: 0.2,
  gold: 0.75,
  goldDark: 0.6,
  bone: 0.8,
  boneShade: 0.62,
  socket: 0.3,
  socketGlow: 0.3,
  red: 0.4,
  redDark: 0.38,
  flame: 0.45,
  flameCore: 0.47,
  eyeWhite: 0.5,
  pupil: 0.46,
  bronze: 0.6,
  blueStone: 0.55,
  cream: 0.55,
  bannerGlow: 0.4,
};

function palette(mode: Mode): Pal {
  if (mode === 'albedo') return (s) => ALBEDO[s];
  if (mode === 'emissive') return (s) => EMISSIVE[s];
  return (s) => {
    const g = Math.round(HEIGHT[s] * 255);
    return `rgb(${g},${g},${g})`;
  };
}

// ---------------------------------------------------------------------------------------------

function flamePath(ctx: CanvasRenderingContext2D, cx: number, base: number, w: number, h: number, tongues = 5): void {
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, base);
  const n = tongues;
  // left side up
  ctx.bezierCurveTo(cx - w * 0.7, base - h * 0.35, cx - w * 0.2, base - h * 0.55, cx - w * 0.38, base - h * 0.78);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = cx - w * 0.38 + w * 0.76 * t;
    const tipY = base - h * (0.72 + 0.28 * Math.sin(Math.PI * t));
    const nx = cx - w * 0.38 + w * 0.76 * Math.min(1, t + 1 / (n - 1));
    ctx.quadraticCurveTo(x + (nx - x) * 0.2, tipY, x + (nx - x) * 0.5, base - h * (0.6 + 0.12 * Math.sin(Math.PI * t)));
  }
  ctx.bezierCurveTo(cx + w * 0.2, base - h * 0.55, cx + w * 0.7, base - h * 0.35, cx + w / 2, base);
  ctx.closePath();
}

function eye(ctx: CanvasRenderingContext2D, P: Pal, cx: number, cy: number, w: number, h: number, mode: Mode): void {
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.quadraticCurveTo(cx, cy - h, cx + w / 2, cy);
  ctx.quadraticCurveTo(cx, cy + h, cx - w / 2, cy);
  ctx.closePath();
  ctx.fillStyle = P('eyeWhite');
  ctx.fill();
  ctx.lineWidth = w * 0.06;
  ctx.strokeStyle = P('goldDark');
  ctx.stroke();
  // iris + slit pupil
  ctx.beginPath();
  ctx.arc(cx, cy, h * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = mode === 'albedo' ? '#e0681c' : P('flame');
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy, h * 0.14, h * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = P('pupil');
  ctx.fill();
}

function goldBorder(ctx: CanvasRenderingContext2D, P: Pal, x: number, y: number, w: number, h: number, t: number): void {
  ctx.lineWidth = t;
  ctx.strokeStyle = P('gold');
  ctx.strokeRect(x + t / 2, y + t / 2, w - t, h - t);
  ctx.lineWidth = t * 0.3;
  ctx.strokeStyle = P('goldDark');
  ctx.strokeRect(x + t * 1.6, y + t * 1.6, w - t * 3.2, h - t * 3.2);
}

function drawBanner(ctx: CanvasRenderingContext2D, P: Pal, mode: Mode, x: number, y: number, w: number, h: number, variant: number): void {
  // red field with a scalloped (swallowtail-ish) bottom
  ctx.fillStyle = P('void');
  ctx.fillRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h * 0.9);
  ctx.lineTo(x + w * 0.75, y + h * 0.97);
  ctx.lineTo(x + w * 0.5, y + h * 0.9);
  ctx.lineTo(x + w * 0.25, y + h * 0.97);
  ctx.lineTo(x, y + h * 0.9);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, P('redDark'));
  g.addColorStop(0.35, P('red'));
  g.addColorStop(1, P('redDark'));
  ctx.fillStyle = mode === 'height' ? P('red') : g;
  ctx.fill();
  ctx.lineWidth = w * 0.035;
  ctx.strokeStyle = P('gold');
  ctx.stroke();
  // inner gold frame line
  ctx.lineWidth = w * 0.012;
  ctx.strokeStyle = P('goldDark');
  ctx.strokeRect(x + w * 0.08, y + h * 0.04, w * 0.84, h * 0.8);
  // top ornament: row of small gold triangles
  ctx.fillStyle = P('gold');
  for (let i = 0; i < 7; i++) {
    const tx = x + w * (0.14 + i * 0.12);
    ctx.beginPath();
    ctx.moveTo(tx - w * 0.035, y + h * 0.075);
    ctx.lineTo(tx + w * 0.035, y + h * 0.075);
    ctx.lineTo(tx, y + h * 0.105);
    ctx.fill();
  }
  const cx = x + w / 2;
  if (variant === 0) {
    // the flame with an all-seeing eye
    flamePath(ctx, cx, y + h * 0.74, w * 0.62, h * 0.5, 5);
    ctx.fillStyle = P('flame');
    ctx.fill();
    flamePath(ctx, cx, y + h * 0.72, w * 0.36, h * 0.34, 3);
    ctx.fillStyle = P('flameCore');
    ctx.fill();
    eye(ctx, P, cx, y + h * 0.55, w * 0.42, h * 0.07, mode);
    // radiating gold rays
    ctx.strokeStyle = P('gold');
    ctx.lineWidth = w * 0.012;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.15 + 0.7 * (i / 8));
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * w * 0.26, y + h * 0.55 + Math.sin(a) * w * 0.26);
      ctx.lineTo(cx + Math.cos(a) * w * 0.38, y + h * 0.55 + Math.sin(a) * w * 0.38);
      ctx.stroke();
    }
  } else {
    // variant: a sun-disc with a flame crown and a descending blade (original "oath" motif)
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.33, w * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = P('flame');
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.33, w * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = P('flameCore');
    ctx.fill();
    ctx.strokeStyle = P('gold');
    ctx.lineWidth = w * 0.02;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * w * 0.25, y + h * 0.33 + Math.sin(a) * w * 0.25);
      ctx.lineTo(cx + Math.cos(a) * w * (i % 2 ? 0.3 : 0.36), y + h * 0.33 + Math.sin(a) * w * (i % 2 ? 0.3 : 0.36));
      ctx.stroke();
    }
    // blade
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.05, y + h * 0.47);
    ctx.lineTo(cx + w * 0.05, y + h * 0.47);
    ctx.lineTo(cx + w * 0.035, y + h * 0.78);
    ctx.lineTo(cx, y + h * 0.83);
    ctx.lineTo(cx - w * 0.035, y + h * 0.78);
    ctx.closePath();
    ctx.fillStyle = P('gold');
    ctx.fill();
    ctx.fillRect(cx - w * 0.16, y + h * 0.47, w * 0.32, h * 0.018);
  }
}

function drawSkull(ctx: CanvasRenderingContext2D, P: Pal, mode: Mode, cx: number, cy: number, s: number, glowEyes: boolean): void {
  // cranium
  const grd = ctx.createRadialGradient(cx - s * 0.12, cy - s * 0.25, s * 0.05, cx, cy - s * 0.05, s * 0.62);
  grd.addColorStop(0, P('bone'));
  grd.addColorStop(1, P('boneShade'));
  ctx.fillStyle = mode === 'emissive' ? P('bone') : grd;
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.12, s * 0.42, s * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
  // cheek / jaw block
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, cy + s * 0.05);
  ctx.quadraticCurveTo(cx - s * 0.34, cy + s * 0.32, cx - s * 0.2, cy + s * 0.42);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.42);
  ctx.quadraticCurveTo(cx + s * 0.34, cy + s * 0.32, cx + s * 0.36, cy + s * 0.05);
  ctx.closePath();
  ctx.fill();
  // eye sockets
  const sock = glowEyes ? P('socketGlow') : P('socket');
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + sx * s * 0.16, cy - s * 0.02, s * 0.12, s * 0.1, sx * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = sock;
    ctx.fill();
    if (glowEyes && mode !== 'height') {
      const eg = ctx.createRadialGradient(cx + sx * s * 0.16, cy - s * 0.02, 0, cx + sx * s * 0.16, cy - s * 0.02, s * 0.1);
      eg.addColorStop(0, mode === 'emissive' ? '#ffd080' : '#3a1208');
      eg.addColorStop(1, sock);
      ctx.fillStyle = eg;
      ctx.fill();
    }
  }
  // nose
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.06);
  ctx.lineTo(cx - s * 0.055, cy + s * 0.17);
  ctx.lineTo(cx + s * 0.055, cy + s * 0.17);
  ctx.closePath();
  ctx.fillStyle = P('socket');
  ctx.fill();
  // teeth
  ctx.fillStyle = P('bone');
  ctx.strokeStyle = P('socket');
  ctx.lineWidth = s * 0.012;
  for (let i = -3; i <= 3; i++) {
    const tx = cx + i * s * 0.055;
    ctx.fillRect(tx - s * 0.024, cy + s * 0.24, s * 0.048, s * 0.1);
    ctx.strokeRect(tx - s * 0.024, cy + s * 0.24, s * 0.048, s * 0.1);
  }
  // cracks
  ctx.strokeStyle = P('boneShade');
  ctx.lineWidth = s * 0.008;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.05, cy - s * 0.55);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.42);
  ctx.lineTo(cx + s * 0.06, cy - s * 0.33);
  ctx.lineTo(cx + s * 0.14, cy - s * 0.24);
  ctx.stroke();
}

function arch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pointed: boolean): void {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  if (pointed) {
    const springY = y + w * 0.87;
    ctx.lineTo(x, springY);
    ctx.quadraticCurveTo(x, y + w * 0.25, x + r, y);
    ctx.quadraticCurveTo(x + w, y + w * 0.25, x + w, springY);
  } else {
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 0);
  }
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function drawEmblem(ctx: CanvasRenderingContext2D, P: Pal, mode: Mode, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = P('void');
  ctx.fillRect(x, y, w, h);
  const cx = x + w / 2;
  // heater shield
  const shield = () => {
    ctx.beginPath();
    ctx.moveTo(x + w * 0.12, y + h * 0.1);
    ctx.lineTo(x + w * 0.88, y + h * 0.1);
    ctx.lineTo(x + w * 0.88, y + h * 0.45);
    ctx.quadraticCurveTo(x + w * 0.86, y + h * 0.78, cx, y + h * 0.95);
    ctx.quadraticCurveTo(x + w * 0.14, y + h * 0.78, x + w * 0.12, y + h * 0.45);
    ctx.closePath();
  };
  shield();
  ctx.fillStyle = P('gold');
  ctx.fill();
  ctx.save();
  ctx.translate(cx, y + h * 0.5);
  ctx.scale(0.82, 0.82);
  ctx.translate(-cx, -(y + h * 0.5));
  shield();
  ctx.fillStyle = P('redDark');
  ctx.fill();
  ctx.restore();
  // flame crown
  flamePath(ctx, cx, y + h * 0.52, w * 0.5, h * 0.38, 5);
  ctx.fillStyle = P('flame');
  ctx.fill();
  // dragon eye with slit pupil
  eye(ctx, P, cx, y + h * 0.56, w * 0.5, h * 0.1, mode);
  // two wing strokes
  ctx.strokeStyle = P('gold');
  ctx.lineWidth = w * 0.025;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * w * 0.12, y + h * 0.72);
    ctx.quadraticCurveTo(cx + s * w * 0.3, y + h * 0.7, cx + s * w * 0.34, y + h * 0.62);
    ctx.stroke();
  }
}

function drawBooth(ctx: CanvasRenderingContext2D, P: Pal, _mode: Mode, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = P('redDark');
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = P('red');
  ctx.fillRect(x + w * 0.01, y + h * 0.06, w * 0.98, h * 0.88);
  ctx.lineWidth = h * 0.03;
  ctx.strokeStyle = P('gold');
  ctx.strokeRect(x + w * 0.015, y + h * 0.08, w * 0.97, h * 0.84);
  // symmetric scrollwork
  const cx = x + w / 2,
    cy = y + h / 2;
  ctx.lineWidth = h * 0.025;
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const ox = cx + s * w * (0.12 + k * 0.1);
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const a = t * Math.PI * 3.2;
        const r = h * 0.32 * (1 - t * 0.8);
        const px = ox + s * Math.cos(a) * r;
        const py = cy + Math.sin(a) * r * (k % 2 ? -1 : 1);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // leaf chevrons toward the ends
    ctx.beginPath();
    ctx.moveTo(cx + s * w * 0.46, cy - h * 0.25);
    ctx.lineTo(cx + s * w * 0.5, cy);
    ctx.lineTo(cx + s * w * 0.46, cy + h * 0.25);
    ctx.stroke();
  }
  // central medallion with the flame-eye
  ctx.beginPath();
  ctx.arc(cx, cy, h * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = P('gold');
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, h * 0.24, 0, Math.PI * 2);
  ctx.fillStyle = P('redDark');
  ctx.fill();
  flamePath(ctx, cx, cy + h * 0.18, h * 0.3, h * 0.36, 3);
  ctx.fillStyle = P('gold');
  ctx.fill();
}

function drawShield(ctx: CanvasRenderingContext2D, P: Pal, _mode: Mode, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = P('stone');
  ctx.fillRect(x, y, w, h);
  const cx = x + w / 2,
    cy = y + h / 2,
    R = w * 0.46;
  const rings: [number, Slot][] = [
    [1, 'goldDark'],
    [0.94, 'bronze'],
    [0.7, 'goldDark'],
    [0.64, 'bronze'],
    [0.26, 'gold'],
    [0.18, 'goldDark'],
  ];
  for (const [k, s] of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, R * k, 0, Math.PI * 2);
    ctx.fillStyle = P(s);
    ctx.fill();
  }
  ctx.fillStyle = P('gold');
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82, R * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
  // radial blades
  ctx.strokeStyle = P('goldDark');
  ctx.lineWidth = w * 0.015;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * 0.28, cy + Math.sin(a) * R * 0.28);
    ctx.lineTo(cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.62);
    ctx.stroke();
  }
}

function drawMedallion(ctx: CanvasRenderingContext2D, P: Pal, mode: Mode, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = P('stone');
  ctx.fillRect(x, y, w, h);
  const cx = x + w / 2,
    cy = y + h / 2,
    R = w * 0.48;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = P('gold');
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.86, 0, Math.PI * 2);
  ctx.fillStyle = P('stoneDark');
  ctx.fill();
  // gold studs on the ring
  ctx.fillStyle = P('goldDark');
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * R * 0.93, cy + Math.sin(a) * R * 0.93, R * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  drawSkull(ctx, P, mode, cx, cy + R * 0.05, R * 1.25, true);
}

function drawSkullNiche(ctx: CanvasRenderingContext2D, P: Pal, mode: Mode, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = P('stone');
  ctx.fillRect(x, y, w, h);
  arch(ctx, x + w * 0.06, y + h * 0.04, w * 0.88, h * 0.92, false);
  ctx.fillStyle = P('gold');
  ctx.fill();
  arch(ctx, x + w * 0.12, y + h * 0.08, w * 0.76, h * 0.84, false);
  ctx.fillStyle = P('stoneDark');
  ctx.fill();
  drawSkull(ctx, P, mode, x + w / 2, y + h * 0.48, w * 0.72, true);
}

function drawFaceNiche(ctx: CanvasRenderingContext2D, P: Pal, mode: Mode, x: number, y: number, w: number, h: number, rng: Rng): void {
  ctx.fillStyle = P('stone');
  ctx.fillRect(x, y, w, h);
  arch(ctx, x + w * 0.06, y + h * 0.04, w * 0.88, h * 0.92, false);
  ctx.fillStyle = P('gold');
  ctx.fill();
  arch(ctx, x + w * 0.1, y + h * 0.07, w * 0.8, h * 0.86, false);
  ctx.fillStyle = P('stoneDark');
  ctx.fill();
  const cx = x + w / 2,
    cy = y + h * 0.5;
  // serene stone face (closed eyes), grey-blue
  const grd = ctx.createRadialGradient(cx - w * 0.08, cy - h * 0.1, w * 0.02, cx, cy, w * 0.4);
  grd.addColorStop(0, mode === 'height' ? 'rgb(170,170,170)' : '#8793a3');
  grd.addColorStop(1, P('blueStone'));
  ctx.fillStyle = mode === 'emissive' ? '#000' : grd;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.27, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = mode === 'height' ? 'rgb(90,90,90)' : '#3a4250';
  ctx.lineWidth = w * 0.012;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + s * w * 0.1, cy - h * 0.04, w * 0.06, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + s * w * 0.1, cy - h * 0.1, w * 0.07, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.06);
  ctx.lineTo(cx - w * 0.03, cy + h * 0.07);
  ctx.lineTo(cx + w * 0.03, cy + h * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.07, cy + h * 0.15);
  ctx.quadraticCurveTo(cx, cy + h * 0.18, cx + w * 0.07, cy + h * 0.15);
  ctx.stroke();
  // gold kintsugi veins
  ctx.strokeStyle = P('gold');
  for (let k = 0; k < 5; k++) {
    ctx.lineWidth = w * (0.006 + rng.next() * 0.01);
    ctx.beginPath();
    let px = cx + (rng.next() - 0.5) * w * 0.4,
      py = cy - h * 0.3 + rng.next() * h * 0.2;
    ctx.moveTo(px, py);
    for (let i = 0; i < 9; i++) {
      px += (rng.next() - 0.5) * w * 0.1;
      py += h * 0.05 * (0.5 + rng.next());
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

function drawChevron(ctx: CanvasRenderingContext2D, P: Pal, _mode: Mode, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = P('goldDark');
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = P('cream');
  const n = 20;
  for (let i = 0; i < n; i++) {
    const x0 = x + (w / n) * i;
    ctx.beginPath();
    ctx.moveTo(x0, y + h * 0.15);
    ctx.lineTo(x0 + w / n / 2, y + h * 0.55);
    ctx.lineTo(x0 + w / n, y + h * 0.15);
    ctx.lineTo(x0 + w / n, y + h * 0.45);
    ctx.lineTo(x0 + w / n / 2, y + h * 0.85);
    ctx.lineTo(x0, y + h * 0.45);
    ctx.closePath();
    ctx.fill();
  }
}

function drawAll(ctx: CanvasRenderingContext2D, S: number, mode: Mode): void {
  const P = palette(mode);
  const R = (r: DecorRegion) => {
    const [x0, y0, x1, y1] = DECOR_REGIONS[r];
    return [x0 * S, y0 * S, (x1 - x0) * S, (y1 - y0) * S] as const;
  };
  ctx.fillStyle = P('void');
  ctx.fillRect(0, 0, S, S);
  drawBanner(ctx, P, mode, ...R('banner'), 0);
  drawBanner(ctx, P, mode, ...R('banner2'), 1);
  drawMedallion(ctx, P, mode, ...R('medallion'));
  drawShield(ctx, P, mode, ...R('shield'));
  drawEmblem(ctx, P, mode, ...R('emblem'));
  drawSkullNiche(ctx, P, mode, ...R('skullNiche'));
  drawFaceNiche(ctx, P, mode, ...R('faceNiche'), new Rng(77));
  drawBooth(ctx, P, mode, ...R('booth'));
  drawChevron(ctx, P, mode, ...R('chevron'));
}

export interface DecorSet {
  map: THREE.Texture;
  emissiveMap: THREE.Texture;
  normalMap: THREE.Texture;
}

export function makeDecorAtlas(size: number, aniso: number): DecorSet {
  const S = size;
  const mk = (mode: Mode) => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d', { willReadFrequently: mode === 'height' })!;
    drawAll(ctx, S, mode);
    return c;
  };
  const tex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = aniso;
    t.needsUpdate = true;
    return t;
  };
  const albedo = mk('albedo');
  const emissive = mk('emissive');
  const hc = mk('height');
  // blur the height slightly for softer relief, then derive normals
  const hctx = hc.getContext('2d')!;
  const img = hctx.getImageData(0, 0, S, S);
  const h = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) h[i] = img.data[i * 4] / 255;
  const hb = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += h[((y + dy + S) % S) * S + ((x + dx + S) % S)];
      hb[y * S + x] = s / 9;
    }
  const nrm = new Uint8ClampedArray(S * S * 4);
  heightToNormal(hb, S, S, 3 * (S / 1024), nrm);
  const nc = document.createElement('canvas');
  nc.width = nc.height = S;
  nc.getContext('2d')!.putImageData(new ImageData(nrm as unknown as Uint8ClampedArray<ArrayBuffer>, S, S), 0, 0);
  return { map: tex(albedo, true), emissiveMap: tex(emissive, true), normalMap: tex(nc, false) };
}
