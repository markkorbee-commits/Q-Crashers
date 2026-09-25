import * as THREE from 'three';

/**
 * Procedural textures of the crowd, drawn at load time (no downloaded assets):
 *  - silhouette atlas for the far impostors: 8 poses × 4 body variants, seen from behind.
 *    Channels: R = coverage, G = region (skin / hair / top / bottom), B = rim mask (edges facing up
 *    get more), A = 1.
 *  - flag atlas: national flags of the Defqon.1 crowd + original tribe flags and banners
 *    (no official logos: the "tribe mark" is an original ring-and-claws emblem).
 */

type Ctx = CanvasRenderingContext2D;
type V2 = [number, number];

const SKIN = '#ff0000';
const HAIR = '#ffff00';
const TOP = '#00ff00';
const BOT = '#0000ff';

interface ArmPose {
  r: [V2, V2, V2];
  l: [V2, V2, V2];
  phone?: boolean;
  fistR?: boolean;
  fistL?: boolean;
}

const SH = 0.118;
const mirror = (p: [V2, V2, V2]): [V2, V2, V2] => [
  [-p[0][0], p[0][1]],
  [-p[1][0], p[1][1]],
  [-p[2][0], p[2][1]],
];
const hang: [V2, V2, V2] = [
  [SH, 0.8],
  [0.142, 0.63],
  [0.152, 0.45],
];
const fistUp: [V2, V2, V2] = [
  [SH, 0.8],
  [0.175, 0.965],
  [0.16, 1.16],
];
const vUp: [V2, V2, V2] = [
  [SH, 0.8],
  [0.2, 0.975],
  [0.265, 1.165],
];
const phoneArm: [V2, V2, V2] = [
  [SH, 0.8],
  [0.16, 0.92],
  [0.1, 1.05],
];
const hugArm: [V2, V2, V2] = [
  [SH, 0.8],
  [0.27, 0.79],
  [0.4, 0.81],
];
const clapArm: [V2, V2, V2] = [
  [SH, 0.8],
  [0.15, 0.66],
  [0.06, 0.73],
];
const cockArm: [V2, V2, V2] = [
  [SH, 0.8],
  [0.165, 0.67],
  [0.135, 0.86],
];

const POSES: ArmPose[] = [
  { r: hang, l: mirror(hang) },
  { r: fistUp, l: mirror(hang), fistR: true },
  { r: vUp, l: mirror(vUp) },
  { r: phoneArm, l: mirror(hang), phone: true },
  { r: hugArm, l: mirror(hugArm) },
  { r: clapArm, l: mirror(clapArm) },
  { r: cockArm, l: mirror(cockArm) },
  { r: hang, l: mirror(fistUp), fistL: true },
];

function capsule(g: Ctx, a: V2, b: V2, w0: number, w1: number): void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  g.beginPath();
  g.moveTo(a[0] + nx * w0, a[1] + ny * w0);
  g.lineTo(b[0] + nx * w1, b[1] + ny * w1);
  g.lineTo(b[0] - nx * w1, b[1] - ny * w1);
  g.lineTo(a[0] - nx * w0, a[1] - ny * w0);
  g.closePath();
  g.fill();
  g.beginPath();
  g.ellipse(a[0], a[1], w0, w0, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(b[0], b[1], w1, w1, 0, 0, Math.PI * 2);
  g.fill();
}

function drawFigure(g: Ctx, pose: ArmPose, variant: number): void {
  const female = variant === 1 || variant === 3;
  const sh = female ? 0.104 : 0.122;
  const hip = female ? 0.108 : 0.098;
  // legs
  g.fillStyle = BOT;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * 0.005, 0.54);
    g.lineTo(s * (hip + 0.01), 0.54);
    g.lineTo(s * 0.092, 0.27);
    g.lineTo(s * 0.085, 0.03);
    g.lineTo(s * 0.035, 0.0);
    g.lineTo(s * 0.03, 0.27);
    g.closePath();
    g.fill();
  }
  // hips + torso
  g.beginPath();
  g.moveTo(-hip, 0.5);
  g.lineTo(hip, 0.5);
  g.lineTo(hip * 0.95, 0.6);
  g.lineTo(-hip * 0.95, 0.6);
  g.closePath();
  g.fill();
  g.fillStyle = TOP;
  g.beginPath();
  g.moveTo(-hip * 0.98, 0.56);
  g.lineTo(hip * 0.98, 0.56);
  g.lineTo(sh * 0.86, 0.72);
  g.lineTo(sh, 0.8);
  g.quadraticCurveTo(sh * 0.7, 0.845, 0.04, 0.845);
  g.lineTo(-0.04, 0.845);
  g.quadraticCurveTo(-sh * 0.7, 0.845, -sh, 0.8);
  g.lineTo(-sh * 0.86, 0.72);
  g.closePath();
  g.fill();
  // arms
  const arm = (p: [V2, V2, V2], fist: boolean) => {
    const a: V2 = [Math.sign(p[0][0]) * (sh - 0.012), p[0][1]];
    g.fillStyle = SKIN;
    capsule(g, a, p[1], 0.03, 0.026);
    capsule(g, p[1], p[2], 0.026, 0.022);
    g.beginPath();
    g.ellipse(p[2][0], p[2][1] + (p[2][1] > p[1][1] ? 0.025 : -0.03), fist ? 0.032 : 0.026, 0.038, 0, 0, Math.PI * 2);
    g.fill();
    // T-shirt sleeve
    g.fillStyle = TOP;
    const m: V2 = [a[0] + (p[1][0] - a[0]) * 0.4, a[1] + (p[1][1] - a[1]) * 0.4];
    capsule(g, a, m, 0.036, 0.033);
  };
  arm(pose.r, !!pose.fistR);
  arm(pose.l, !!pose.fistL);
  if (pose.phone) {
    g.fillStyle = HAIR;
    g.fillRect(pose.r[2][0] - 0.025, pose.r[2][1] + 0.02, 0.05, 0.085);
  }
  // neck + head
  g.fillStyle = SKIN;
  g.fillRect(-0.03, 0.83, 0.06, 0.05);
  g.beginPath();
  g.ellipse(0, 0.935, 0.062, 0.074, 0, 0, Math.PI * 2);
  g.fill();
  // hair (seen from behind most of the head is hair)
  g.fillStyle = HAIR;
  g.beginPath();
  g.ellipse(0, 0.945, 0.064, 0.068, 0, 0, Math.PI * 2);
  g.fill();
  if (variant === 1) {
    g.beginPath();
    g.moveTo(-0.062, 0.94);
    g.lineTo(0.062, 0.94);
    g.lineTo(0.07, 0.74);
    g.lineTo(-0.07, 0.74);
    g.closePath();
    g.fill();
  } else if (variant === 3) {
    capsule(g, [0, 0.92], [0.012, 0.78], 0.028, 0.018);
  } else if (variant === 2) {
    // cap crown + brim sticking out sideways a little
    g.beginPath();
    g.ellipse(0, 0.965, 0.072, 0.055, 0, 0, Math.PI * 2);
    g.fill();
    g.fillRect(-0.075, 0.95, 0.15, 0.018);
  }
}

/** 512 x 512 impostor atlas (DataTexture-like CanvasTexture with mipmaps) */
export function buildSilhouetteAtlas(): THREE.Texture {
  const W = 512;
  const H = 512;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  for (let variant = 0; variant < 4; variant++) {
    for (let p = 0; p < 8; p++) {
      const cx = p * 64;
      const cy = (3 - variant) * 128;
      g.save();
      g.beginPath();
      g.rect(cx, cy, 64, 128);
      g.clip();
      // quad = 0.86 H wide, 1.3 H tall, feet at the bottom
      g.setTransform(64 / 0.86, 0, 0, -128 / 1.3, cx + 32, cy + 127);
      drawFigure(g, POSES[p], variant);
      g.restore();
    }
  }
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  const cov = new Float32Array(W * H);
  const reg = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4];
    const gg = d[i * 4 + 1];
    const bb = d[i * 4 + 2];
    const c = Math.max(r, gg, bb) / 255;
    cov[i] = c;
    // region: 0 skin, 85 hair, 170 top, 255 bottom
    if (bb > r && bb > gg) reg[i] = 255;
    else if (r > 0.5 * 255 * c && gg > 0.5 * 255 * c) reg[i] = 85;
    else if (gg > r) reg[i] = 170;
    else reg[i] = 0;
  }
  // blurred coverage → rim mask on the silhouette edges, boosted where the edge faces up
  const blur = boxBlur(boxBlur(cov, W, H, 2), W, H, 2);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const c = cov[i];
      const edge = c * (1 - smoothstep(0.5, 0.97, blur[i]));
      const above = y > 0 ? blur[i - W] : 0;
      const below = y < H - 1 ? blur[i + W] : 0;
      const up = Math.min(1, Math.max(0, (below - above) * 3));
      d[i * 4] = Math.round(c * 255);
      d[i * 4 + 1] = reg[i];
      d[i * 4 + 2] = Math.round(Math.min(1, edge * (0.45 + 0.9 * up)) * 255);
      d[i * 4 + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function boxBlur(src: Float32Array, W: number, H: number, r: number): Float32Array {
  const tmp = new Float32Array(W * H);
  const out = new Float32Array(W * H);
  const n = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let s = 0;
    for (let x = -r; x <= r; x++) s += src[y * W + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = s / n;
      s += src[y * W + Math.min(W - 1, x + r + 1)] - src[y * W + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < W; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = s / n;
      s += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// flags
// ------------------------------------------------------------------------------------------------

function star(g: Ctx, x: number, y: number, r: number, pts = 5, inner = 0.45): void {
  g.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / pts;
    const rr = i % 2 === 0 ? r : r * inner;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

function hBands(g: Ctx, cols: string[], w: number, h: number, weights?: number[]): void {
  const ws = weights ?? cols.map(() => 1);
  const tot = ws.reduce((a, b) => a + b, 0);
  let y = 0;
  cols.forEach((c, i) => {
    const hh = (ws[i] / tot) * h;
    g.fillStyle = c;
    g.fillRect(0, y, w, hh + 1);
    y += hh;
  });
}

function vBands(g: Ctx, cols: string[], w: number, h: number): void {
  cols.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect((i * w) / cols.length, 0, w / cols.length + 1, h);
  });
}

function nordic(g: Ctx, bg: string, cross: string, w: number, h: number, border?: string): void {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const cx = w * 0.36;
  if (border) {
    g.fillStyle = border;
    g.fillRect(cx - w * 0.1, 0, w * 0.2, h);
    g.fillRect(0, h * 0.5 - h * 0.17, w, h * 0.34);
  }
  g.fillStyle = cross;
  g.fillRect(cx - w * 0.055, 0, w * 0.11, h);
  g.fillRect(0, h * 0.5 - h * 0.09, w, h * 0.18);
}

function unionJack(g: Ctx, x: number, y: number, w: number, h: number): void {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = '#012169';
  g.fillRect(x, y, w, h);
  g.lineCap = 'butt';
  g.strokeStyle = '#ffffff';
  g.lineWidth = h * 0.2;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + w, y + h);
  g.moveTo(x + w, y);
  g.lineTo(x, y + h);
  g.stroke();
  g.strokeStyle = '#c8102e';
  g.lineWidth = h * 0.07;
  g.stroke();
  g.fillStyle = '#ffffff';
  g.fillRect(x + w / 2 - h * 0.17, y, h * 0.34, h);
  g.fillRect(x, y + h / 2 - h * 0.17, w, h * 0.34);
  g.fillStyle = '#c8102e';
  g.fillRect(x + w / 2 - h * 0.1, y, h * 0.2, h);
  g.fillRect(x, y + h / 2 - h * 0.1, w, h * 0.2);
  g.restore();
}

/** original tribe mark: ring + three claw slashes */
function tribeMark(g: Ctx, x: number, y: number, r: number, col: string): void {
  g.strokeStyle = col;
  g.fillStyle = col;
  g.lineWidth = r * 0.2;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  g.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    g.lineWidth = r * (0.16 - 0.04 * Math.abs(i));
    g.beginPath();
    g.moveTo(x + i * r * 0.36 + r * 0.12, y - r * 0.6);
    g.lineTo(x + i * r * 0.36 - r * 0.12, y + r * 0.6);
    g.stroke();
  }
}

function sunRing(g: Ctx, x: number, y: number, r: number, col: string, spikes: number): void {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i * Math.PI) / spikes;
    const rr = i % 2 === 0 ? r * 1.25 : r * 0.98;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.arc(x, y, r * 0.8, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'source-over';
}

function pennant(g: Ctx, w: number, h: number): void {
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(w, 0);
  g.lineTo(w, h * 0.84);
  g.lineTo(w / 2, h);
  g.lineTo(0, h * 0.84);
  g.closePath();
  g.clip();
}

function mask(g: Ctx, x: number, y: number, s: number, face: string, dark: string, horns: boolean): void {
  g.fillStyle = face;
  g.beginPath();
  g.moveTo(x - s, y - s * 0.7);
  g.lineTo(x + s, y - s * 0.7);
  g.lineTo(x + s * 0.8, y + s * 0.4);
  g.lineTo(x, y + s * 1.1);
  g.lineTo(x - s * 0.8, y + s * 0.4);
  g.closePath();
  g.fill();
  if (horns) {
    g.beginPath();
    g.moveTo(x - s * 0.8, y - s * 0.6);
    g.quadraticCurveTo(x - s * 1.6, y - s * 1.2, x - s * 1.2, y - s * 1.9);
    g.lineTo(x - s * 0.4, y - s * 0.7);
    g.moveTo(x + s * 0.8, y - s * 0.6);
    g.quadraticCurveTo(x + s * 1.6, y - s * 1.2, x + s * 1.2, y - s * 1.9);
    g.lineTo(x + s * 0.4, y - s * 0.7);
    g.fill();
  }
  g.fillStyle = dark;
  g.fillRect(x - s * 0.6, y - s * 0.25, s * 0.45, s * 0.22);
  g.fillRect(x + s * 0.15, y - s * 0.25, s * 0.45, s * 0.22);
  g.fillRect(x - s * 0.35, y + s * 0.45, s * 0.7, s * 0.14);
}

type FlagDraw = (g: Ctx, w: number, h: number) => void;

export const FLAG_DRAW: FlagDraw[] = [
  (g, w, h) => hBands(g, ['#ae1c28', '#ffffff', '#21468b'], w, h), // 0 NL
  (g, w, h) => {
    // 1 tribe flag black/red: sun ring of spikes + tribe mark (original)
    g.fillStyle = '#242424';
    g.fillRect(0, 0, w, h);
    sunRing(g, w / 2, h / 2, h * 0.3, '#c02030', 14);
    tribeMark(g, w / 2, h / 2, h * 0.17, '#c02030');
  },
  (g, w, h) => {
    // 2 tribe flag black/white
    g.fillStyle = '#101010';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e8e4dc';
    g.lineWidth = 4;
    g.strokeRect(6, 6, w - 12, h - 12);
    tribeMark(g, w / 2, h / 2, h * 0.25, '#e8e4dc');
  },
  (g, w, h) => hBands(g, ['#000000', '#dd0000', '#ffce00'], w, h), // 3 DE
  (g, w, h) => vBands(g, ['#000000', '#fae042', '#ed2939'], w, h), // 4 BE
  (g, w, h) => unionJack(g, 0, 0, w, h), // 5 UK
  (g, w, h) => {
    // 6 AU
    g.fillStyle = '#012169';
    g.fillRect(0, 0, w, h);
    unionJack(g, 0, 0, w / 2, h / 2);
    g.fillStyle = '#ffffff';
    star(g, w * 0.25, h * 0.75, h * 0.11, 7, 0.45);
    for (const [x, y] of [
      [0.75, 0.2],
      [0.62, 0.45],
      [0.86, 0.4],
      [0.75, 0.82],
      [0.8, 0.58],
    ])
      star(g, w * x, h * y, h * 0.05, 7, 0.45);
  },
  (g, w, h) => vBands(g, ['#009246', '#ffffff', '#ce2b37'], w, h), // 7 IT
  (g, w, h) => vBands(g, ['#0055a4', '#ffffff', '#ef4135'], w, h), // 8 FR
  (g, w, h) => hBands(g, ['#aa151b', '#f1bf00', '#aa151b'], w, h, [1, 2, 1]), // 9 ES
  (g, w, h) => hBands(g, ['#ffffff', '#dc143c'], w, h), // 10 PL
  (g, w, h) => nordic(g, '#ba0c2f', '#00205b', w, h, '#ffffff'), // 11 NO
  (g, w, h) => nordic(g, '#006aa7', '#fecc02', w, h), // 12 SE
  (g, w, h) => nordic(g, '#ffffff', '#002f6c', w, h), // 13 FI
  (g, w, h) => {
    // 14 CH
    g.fillStyle = '#da291c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    g.fillRect(w / 2 - w * 0.07, h * 0.2, w * 0.14, h * 0.6);
    g.fillRect(w / 2 - w * 0.2, h / 2 - h * 0.1, w * 0.4, h * 0.2);
  },
  (g, w, h) => hBands(g, ['#c8102e', '#ffffff', '#c8102e'], w, h), // 15 AT
  (g, w, h) => {
    // 16 US
    for (let i = 0; i < 13; i++) {
      g.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff';
      g.fillRect(0, (i * h) / 13, w, h / 13 + 1);
    }
    g.fillStyle = '#3c3b6e';
    g.fillRect(0, 0, w * 0.4, h * (7 / 13));
    g.fillStyle = '#ffffff';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) star(g, w * (0.035 + c * 0.066), h * (0.05 + r * 0.1), h * 0.022);
  },
  (g, w, h) => {
    // 17 MX
    vBands(g, ['#006847', '#ffffff', '#ce1126'], w, h);
    g.fillStyle = '#8c5a2b';
    g.beginPath();
    g.arc(w / 2, h / 2, h * 0.12, 0, Math.PI * 2);
    g.fill();
  },
  (g, w, h) => {
    // 18 CL
    hBands(g, ['#ffffff', '#d52b1e'], w, h);
    g.fillStyle = '#0039a6';
    g.fillRect(0, 0, w / 3, h / 2);
    g.fillStyle = '#ffffff';
    star(g, w / 6, h / 4, h * 0.12);
  },
  (g, w, h) => {
    // 19 EU
    g.fillStyle = '#003399';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffcc00';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      star(g, w / 2 + Math.cos(a) * h * 0.3, h / 2 + Math.sin(a) * h * 0.3, h * 0.055);
    }
  },
  (g, w, h) => {
    // 20 JP
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#bc002d';
    g.beginPath();
    g.ellipse(w / 2, h / 2, h * 0.3 * (h / w), h * 0.3, 0, 0, Math.PI * 2);
    g.fill();
  },
  (g, w, h) => {
    // 21 BR
    g.fillStyle = '#009c3b';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffdf00';
    g.beginPath();
    g.moveTo(w * 0.08, h / 2);
    g.lineTo(w / 2, h * 0.1);
    g.lineTo(w * 0.92, h / 2);
    g.lineTo(w / 2, h * 0.9);
    g.closePath();
    g.fill();
    g.fillStyle = '#002776';
    g.beginPath();
    g.ellipse(w / 2, h / 2, w * 0.17, h * 0.25, 0, 0, Math.PI * 2);
    g.fill();
  },
  (g, w, h) => vBands(g, ['#169b62', '#ffffff', '#ff883e'], w, h), // 22 IE
  (g, w, h) => nordic(g, '#c8102e', '#ffffff', w, h), // 23 DK
  (g, w, h) => {
    // 24 Berserker banner (red / grey-blue, horned skull, original)
    pennant(g, w, h);
    g.fillStyle = '#90a8b4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e41818';
    g.fillRect(0, 0, w * 0.5, h);
    mask(g, w / 2, h * 0.42, w * 0.28, '#d9d4c8', '#1a1a1a', true);
    tribeMark(g, w / 2, h * 0.78, w * 0.12, '#f4f0e6');
  },
  (g, w, h) => {
    // 25 Guardian banner (terracotta / gold)
    pennant(g, w, h);
    g.fillStyle = '#f0c060';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c04848';
    g.lineWidth = w * 0.18;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, h * 0.7);
    g.moveTo(w, 0);
    g.lineTo(0, h * 0.7);
    g.stroke();
    mask(g, w / 2, h * 0.4, w * 0.26, '#7a2a1e', '#f0c060', true);
    tribeMark(g, w / 2, h * 0.78, w * 0.12, '#7a2a1e');
  },
  (g, w, h) => {
    // 26 Shaman banner (yellow / black spiral, green mask)
    pennant(g, w, h);
    g.fillStyle = '#fccc0c';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#111111';
    g.lineWidth = w * 0.16;
    g.beginPath();
    for (let i = 0; i < 40; i++) {
      const a = i * 0.45;
      const r = w * 0.08 + i * w * 0.012;
      g.lineTo(w / 2 + Math.cos(a) * r, h * 0.42 + Math.sin(a) * r * 1.8);
    }
    g.stroke();
    mask(g, w / 2, h * 0.42, w * 0.22, '#2f9a6a', '#fccc0c', false);
    tribeMark(g, w / 2, h * 0.78, w * 0.12, '#2f9a6a');
  },
];

/** 1024 x 512 flag atlas (8 x 4 cells of 128 px; a flag fills its cell, the cloth restores the aspect) */
export function buildFlagAtlas(): THREE.Texture {
  const C = 128;
  const cv = document.createElement('canvas');
  cv.width = C * 8;
  cv.height = C * 4;
  const g = cv.getContext('2d')!;
  g.clearRect(0, 0, cv.width, cv.height);
  FLAG_DRAW.forEach((draw, t) => {
    const col = t & 7;
    const row = 3 - (t >> 3);
    g.save();
    g.translate(col * C, row * C);
    g.beginPath();
    g.rect(0, 0, C, C);
    g.clip();
    draw(g, C, C);
    // fabric: subtle weave + a darker hem
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < C; y += 4) g.fillRect(0, y, C, 1);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, 0, 4, C);
    g.restore();
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
