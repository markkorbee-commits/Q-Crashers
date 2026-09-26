import * as THREE from 'three';

/**
 * The booth's ONE small atlas (512 x 256): static UI chrome of the media-player touch screens, the jog
 * centre displays, mixer / effects displays, the laptop and the lit front-panel ornament. Generic
 * artwork only (no brand names, logos or wordmarks). The dynamic parts (scrolling waveforms, jog
 * position ring, pads, level meters) are drawn by the booth-screen shader on top.
 *
 * Regions in UV (x0, y0, w, h), v up (canvas rows are flipped by the texture upload).
 */
export const ATLAS = {
  /** media-player screen (9" touch): header, track info, overview waveform, browse bar */
  player: [0, 0.5, 0.5, 0.5] as const,
  /** jog centre display (artwork disc) */
  jog: [0.5, 0.5, 0.25, 0.5] as const,
  /** mixer display */
  mixer: [0.75, 0.75, 0.25, 0.25] as const,
  /** effects-unit display */
  fx: [0.75, 0.5, 0.25, 0.25] as const,
  /** laptop screen (DJ software: two decks + library) */
  laptop: [0, 0, 0.5, 0.5] as const,
  /** booth front panel ornament tile (gothic arch + flame, gold on dark red) */
  panel: [0.5, 0, 0.25, 0.5] as const,
  /** plain white (solid emissive strips) */
  white: [0.76, 0.02, 0.02, 0.02] as const,
};

export function makeBoothAtlas(small: boolean): THREE.CanvasTexture {
  const W = small ? 256 : 512;
  const H = W / 2;
  const s = W / 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.scale(s, s);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 512, 256);
  // canvas y down: region (x0, y0, w, h) in UV maps to canvas (x0*512, (1-y0-h)*256)
  const R = (r: readonly [number, number, number, number]) => [r[0] * 512, (1 - r[1] - r[3]) * 256, r[2] * 512, r[3] * 256] as const;
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const mono = (px: number) => `${px}px monospace`;

  // ---- media-player screen ----------------------------------------------------------------------
  {
    const [x, y, w, h] = R(ATLAS.player);
    g.fillStyle = '#05070c';
    g.fillRect(x, y, w, h);
    // header bar: deck number, track, BPM / key / time blocks
    g.fillStyle = '#10141e';
    g.fillRect(x + 2, y + 2, w - 4, 22);
    g.fillStyle = '#e8e8ea';
    g.font = mono(11);
    g.fillText('DECK', x + 6, y + 16);
    g.fillStyle = '#ff5a1a';
    g.fillText('A', x + 40, y + 16);
    g.fillStyle = '#c8ccd6';
    g.fillText('SACRED OATH  (EXTENDED)', x + 56, y + 16);
    g.fillStyle = '#10141e';
    g.fillRect(x + 2, y + 26, w - 4, 16);
    g.fillStyle = '#66d0ff';
    g.font = mono(10);
    g.fillText('150.00', x + 8, y + 38);
    g.fillStyle = '#9aa0ae';
    g.fillText('8A', x + 62, y + 38);
    g.fillText('-03:12', x + 96, y + 38);
    g.fillStyle = '#2a8a40';
    g.fillRect(x + 150, y + 30, 40, 8);
    g.fillStyle = '#d33';
    g.fillRect(x + 196, y + 30, 8, 8);
    // zoomed-waveform band (drawn live by the shader): dark lane with beat-grid ticks
    g.fillStyle = '#020306';
    g.fillRect(x + 2, y + 46, w - 4, 50);
    // overview waveform (static)
    g.fillStyle = '#0a0d14';
    g.fillRect(x + 2, y + 100, w - 4, 16);
    for (let i = 0; i < w - 8; i += 2) {
      const a = 2 + 6 * Math.abs(Math.sin(i * 0.05) * 0.6 + rnd() * 0.4);
      g.fillStyle = i < (w - 8) * 0.38 ? '#5a6272' : '#3a78c8';
      g.fillRect(x + 4 + i, y + 108 - a, 1.4, a * 2);
    }
    g.fillStyle = '#fff';
    g.fillRect(x + 4 + (w - 8) * 0.38, y + 100, 1.5, 16);
    // browse / hot-cue colour chips
    const cues = ['#1ec85a', '#ff3b30', '#ff9500', '#ffd60a', '#0a84ff', '#bf5af2', '#ff2d92', '#30d5c8'];
    for (let i = 0; i < 8; i++) {
      g.fillStyle = cues[i];
      g.fillRect(x + 6 + i * 30, y + 119, 24, 5);
    }
  }

  // ---- jog centre display: dark disc with a flame artwork and tick ring --------------------------
  {
    const [x, y, w, h] = R(ATLAS.jog);
    const cx = x + w / 2,
      cy = y + h / 2,
      r = Math.min(w, h) / 2 - 2;
    g.fillStyle = '#05060a';
    g.fillRect(x, y, w, h);
    const grd = g.createRadialGradient(cx, cy, 2, cx, cy, r);
    grd.addColorStop(0, '#3a0c08');
    grd.addColorStop(0.6, '#140406');
    grd.addColorStop(1, '#040406');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    // generic flame artwork
    g.fillStyle = '#ff6a1a';
    g.beginPath();
    g.moveTo(cx, cy - r * 0.42);
    g.quadraticCurveTo(cx + r * 0.3, cy - r * 0.05, cx + r * 0.12, cy + r * 0.3);
    g.quadraticCurveTo(cx, cy + r * 0.12, cx - r * 0.12, cy + r * 0.3);
    g.quadraticCurveTo(cx - r * 0.3, cy - r * 0.05, cx, cy - r * 0.42);
    g.fill();
    g.fillStyle = '#ffd24a';
    g.beginPath();
    g.moveTo(cx, cy - r * 0.18);
    g.quadraticCurveTo(cx + r * 0.12, cy + r * 0.05, cx, cy + r * 0.22);
    g.quadraticCurveTo(cx - r * 0.12, cy + r * 0.05, cx, cy - r * 0.18);
    g.fill();
    g.strokeStyle = '#586070';
    g.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const r0 = r * (i % 5 === 0 ? 0.8 : 0.86);
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
      g.stroke();
    }
  }

  // ---- mixer display ------------------------------------------------------------------------------
  {
    const [x, y, w, h] = R(ATLAS.mixer);
    g.fillStyle = '#04070a';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#58c8ff';
    g.font = mono(10);
    g.fillText('BEAT FX', x + 8, y + 16);
    g.fillStyle = '#e0e4ea';
    g.fillText('ECHO  1/2', x + 8, y + 32);
    g.fillStyle = '#ffae3a';
    g.fillText('CH 2', x + 70, y + 32);
    g.fillStyle = '#1b2a3a';
    g.fillRect(x + 8, y + 40, w - 16, 14);
    g.fillStyle = '#3aa0ff';
    g.fillRect(x + 8, y + 40, (w - 16) * 0.62, 14);
  }

  // ---- effects-unit display ------------------------------------------------------------------------
  {
    const [x, y, w, h] = R(ATLAS.fx);
    g.fillStyle = '#05050a';
    g.fillRect(x, y, w, h);
    const names = ['FILTER', 'ECHO', 'SPIRAL', 'REVERB', 'NOISE', 'CRUSH'];
    g.font = mono(9);
    for (let i = 0; i < 6; i++) {
      const cx = x + 6 + (i % 3) * 40,
        cy = y + 8 + Math.floor(i / 3) * 26;
      g.fillStyle = i === 1 ? '#ff7a1a' : '#1a2230';
      g.fillRect(cx, cy, 36, 20);
      g.fillStyle = i === 1 ? '#140400' : '#b8c2d0';
      g.fillText(names[i], cx + 2, cy + 13);
    }
  }

  // ---- laptop: DJ software (two decks + library) ----------------------------------------------------
  {
    const [x, y, w, h] = R(ATLAS.laptop);
    g.fillStyle = '#0b0c10';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#16181f';
    g.fillRect(x + 2, y + 2, w - 4, 10);
    // two deck lanes (the shader scrolls the waveforms inside them)
    for (let d = 0; d < 2; d++) {
      g.fillStyle = '#050608';
      g.fillRect(x + 2, y + 14 + d * 26, w - 4, 24);
    }
    // library rows
    g.font = mono(8);
    const titles = ['Sacred Oath', 'Dragon Riders', 'Holy Grounds', 'Weekend Warriors', 'Burning Wings', 'The Endshow', 'Warriors Of Fire', 'Night Of The Legends'];
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i === 2 ? '#1c3a5c' : i % 2 ? '#101218' : '#0d0f14';
      g.fillRect(x + 2, y + 68 + i * 7, w - 4, 7);
      g.fillStyle = i === 2 ? '#e8f0ff' : '#8a93a4';
      g.fillText(titles[i], x + 6, y + 74 + i * 7);
      g.fillText(`${148 + (i % 4)}.0`, x + w - 40, y + 74 + i * 7);
    }
  }

  // ---- front-panel ornament tile: gothic arch + flame, gold on deep red ------------------------------
  {
    const [x, y, w, h] = R(ATLAS.panel);
    const bg = g.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, '#2a0306');
    bg.addColorStop(1, '#4a0a0c');
    g.fillStyle = bg;
    g.fillRect(x, y, w, h);
    g.strokeStyle = '#e8a73e';
    g.lineWidth = 3;
    const cx = x + w / 2;
    const base = y + h - 14,
      top = y + 16;
    const hw = w * 0.34;
    // pointed arch (two arcs) on two jambs
    g.beginPath();
    g.moveTo(cx - hw, base);
    g.lineTo(cx - hw, y + h * 0.45);
    g.quadraticCurveTo(cx - hw, top + 10, cx, top);
    g.quadraticCurveTo(cx + hw, top + 10, cx + hw, y + h * 0.45);
    g.lineTo(cx + hw, base);
    g.stroke();
    g.lineWidth = 1.5;
    g.strokeRect(x + 5, y + 5, w - 10, h - 10);
    // flame in the arch
    g.fillStyle = '#ff8a24';
    g.beginPath();
    g.moveTo(cx, y + h * 0.36);
    g.quadraticCurveTo(cx + hw * 0.55, y + h * 0.62, cx + hw * 0.2, base - 12);
    g.quadraticCurveTo(cx, base - 22, cx - hw * 0.2, base - 12);
    g.quadraticCurveTo(cx - hw * 0.55, y + h * 0.62, cx, y + h * 0.36);
    g.fill();
    g.fillStyle = '#ffe07a';
    g.beginPath();
    g.moveTo(cx, y + h * 0.55);
    g.quadraticCurveTo(cx + hw * 0.22, y + h * 0.7, cx, base - 16);
    g.quadraticCurveTo(cx - hw * 0.22, y + h * 0.7, cx, y + h * 0.55);
    g.fill();
    // amber edge lines (top / bottom LED strips of the panel)
    g.fillStyle = '#ffb040';
    g.fillRect(x, y, w, 3);
    g.fillRect(x, y + h - 3, w, 3);
  }

  // ---- solid white ------------------------------------------------------------------------------------
  {
    const [x, y, w, h] = R(ATLAS.white);
    g.fillStyle = '#fff';
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  return t;
}
