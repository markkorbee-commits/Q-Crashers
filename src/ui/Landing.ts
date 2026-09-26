import { h } from './dom';
import { emblem } from './icons';

/**
 * Full-screen title: the empty Holy Grounds at dusk — an original silhouette of the castle and
 * the mechanical dragon's spread wings against a heat-red horizon, rising embers and heat haze.
 */
export class Landing {
  readonly el: HTMLElement;
  private bar: HTMLElement;
  private label: HTMLElement;
  private pct: HTMLElement;
  readonly enterBtn: HTMLButtonElement;
  private embers: Embers;

  constructor(parent: HTMLElement, mobile: boolean) {
    this.enterBtn = h('button', { class: 'btn primary enter', disabled: true, type: 'button' }, 'Enter the Holy Grounds');
    this.bar = h('div', { class: 'bar' });
    this.label = h('span', null, 'Preparing');
    this.pct = h('span', null, '0%');
    const canvas = h('canvas', { class: 'embers', 'aria-hidden': 'true' });
    this.el = h(
      'section',
      { class: 'landing', 'aria-label': 'Defqon.1 2026 — The Endshow Experience' },
      h('div', { class: 'sun' }),
      h('div', { class: 'haze' }),
      h('div', { class: 'haze b' }),
      h('div', { html: horizonSvg(), style: 'display:contents' }),
      canvas,
      h('div', { class: 'vignette' }),
      h('div', { class: 'grain' }),
      h(
        'div',
        { class: 'content' },
        h('div', { html: emblem(), style: 'display:contents' }),
        h('div', { class: 'dateline' }, 'Holy Grounds, Biddinghuizen · Saturday 27 June 2026 · 22:33'),
        h('h1', { html: 'DEFQON<span class="dot">.</span>1 2026' }),
        h('h2', null, 'The Endshow Experience'),
        h('p', { class: 'tribute' }, 'The festival that never was. The Endshow that still happened.'),
        h('div', { class: 'disclaimer' }, 'Fan-made tribute. Not affiliated with Q-dance.'),
        h('div', { class: 'flashing', role: 'note' }, '⚠ Contains flashing lights and strobe effects — you can reduce them after entering.'),
        h(
          'div',
          { class: 'loader', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': 'Loading' },
          h('div', { class: 'progress' }, this.bar),
          h('div', { class: 'load-row' }, this.label, this.pct),
        ),
        this.enterBtn,
      ),
      h(
        'div',
        { class: 'footnote' },
        'Cancelled on 26 June 2026 by the first-ever extreme-heat red warning in the Netherlands, the Endshow was still performed on the empty grounds on Saturday 27 June at dusk. A digital memory of a festival weekend that never got to happen.',
      ),
    );
    parent.appendChild(this.el);
    this.embers = new Embers(canvas, mobile ? 46 : 90);
    this.embers.start();
  }

  /**
   * Progress: jump to the reached value, then glide towards `next` over the expected time. The glide
   * is a compositor transition (transform), so the bar keeps moving while a system's synchronous
   * generator blocks the main thread.
   */
  setProgress(label: string, p: number, next?: number, etaMs?: number): void {
    const v = Math.max(0, Math.min(1, p));
    const bs = this.bar.style;
    bs.transition = '';
    bs.transform = `scaleX(${v})`;
    if (next !== undefined && etaMs && next > v + 0.002) {
      void this.bar.offsetWidth; // commit the start value before the long transition
      bs.transition = `transform ${Math.max(300, Math.min(30000, etaMs * 1.15)).toFixed(0)}ms cubic-bezier(0.25, 0.6, 0.45, 1)`;
      bs.transform = `scaleX(${Math.min(1, next).toFixed(4)})`;
    }
    this.label.textContent = label;
    this.pct.textContent = `${Math.round(v * 100)}%`;
    this.el.querySelector('.loader')?.setAttribute('aria-valuenow', String(Math.round(v * 100)));
  }

  setReady(): void {
    this.setProgress('Ready', 1);
    this.enterBtn.disabled = false;
    this.enterBtn.focus({ preventScroll: true });
  }

  hide(): void {
    this.el.classList.add('gone');
    setTimeout(() => {
      this.embers.stop();
      this.el.remove();
    }, 950);
  }

  /** immediate removal (autostart) */
  destroy(): void {
    this.embers.stop();
    this.el.remove();
  }
}

const GLOW = ['rgb(255,96,20)', 'rgb(255,150,40)'];
const CORE = ['rgb(255,190,110)', 'rgb(255,226,170)'];

/** Cheap 2D ember particles (additive dots), paused when hidden. */
class Embers {
  private ctx: CanvasRenderingContext2D | null;
  private raf = 0;
  private ps: Float32Array;
  private last = 0;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private onResize = () => this.resize();

  constructor(private canvas: HTMLCanvasElement, private n: number) {
    this.ctx = canvas.getContext('2d');
    // x, y, vx, vy, size, life, maxLife, phase
    this.ps = new Float32Array(n * 8);
  }

  start(): void {
    this.resize();
    for (let i = 0; i < this.n; i++) this.spawn(i, true);
    window.addEventListener('resize', this.onResize);
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.step(dt, now / 1000);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
  }

  private resize() {
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.w = this.canvas.clientWidth || window.innerWidth;
    this.h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  private spawn(i: number, initial: boolean) {
    const p = this.ps;
    const o = i * 8;
    p[o] = Math.random() * this.w;
    p[o + 1] = initial ? this.h * (0.3 + Math.random() * 0.75) : this.h * (0.75 + Math.random() * 0.3);
    p[o + 2] = (Math.random() - 0.5) * 14;
    p[o + 3] = -(18 + Math.random() * 46);
    p[o + 4] = 0.6 + Math.random() * Math.random() * 2.6;
    p[o + 6] = 4 + Math.random() * 7;
    p[o + 5] = initial ? Math.random() * p[o + 6] : 0;
    p[o + 7] = Math.random() * 6.28;
  }

  private step(dt: number, t: number) {
    const g = this.ctx;
    if (!g) return;
    const p = this.ps;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.n; i++) {
      const o = i * 8;
      p[o + 5] += dt;
      if (p[o + 5] > p[o + 6] || p[o + 1] < -10) {
        this.spawn(i, false);
        continue;
      }
      // turbulent drift
      p[o + 2] += Math.sin(t * 1.3 + p[o + 7] + p[o + 1] * 0.01) * 12 * dt;
      p[o] += p[o + 2] * dt;
      p[o + 1] += p[o + 3] * dt;
      const life = p[o + 5] / p[o + 6];
      const fade = Math.min(1, life * 5) * (1 - life);
      const flicker = 0.65 + 0.35 * Math.sin(t * 9 + p[o + 7] * 3);
      const a = fade * flicker;
      const s = p[o + 4];
      const big = s > 1.6 ? 1 : 0;
      g.globalAlpha = a * 0.16;
      g.fillStyle = GLOW[big];
      g.beginPath();
      g.arc(p[o], p[o + 1], s * 4.5, 0, 6.283);
      g.fill();
      g.globalAlpha = a * 0.9;
      g.fillStyle = CORE[big];
      g.beginPath();
      g.arc(p[o], p[o + 1], s, 0, 6.283);
      g.fill();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
}

/** Original silhouette artwork (not the official logo or stage design drawings). */
function horizonSvg(): string {
  // mechanical wing: angular feathers, drawn for the left side then mirrored
  const wingL =
    'M772 186 L700 150 L610 118 L520 96 L420 82 L330 86 L392 118 L350 132 L430 146 L398 170 L478 172 L452 204 L530 196 L516 236 L590 214 L592 256 L652 232 L672 272 L716 246 L744 282 L768 250 Z';
  const spars = ['M772 186 L330 86', 'M760 196 L398 170', 'M752 214 L452 204', 'M748 232 L516 236', 'M752 246 L592 256', 'M760 256 L672 272'];
  const mirror = (d: string) => d.replace(/(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g, (_m, x, y) => `${1600 - parseFloat(x)} ${y}`);
  const pillars = [
    [565, 392, 34],
    [455, 402, 62],
    [290, 416, 118],
  ]
    .map(([x, y, hgt]) =>
      [x, 1600 - x]
        .map(
          (px) =>
            `<rect x="${px - hgt * 0.035}" y="${y - hgt}" width="${hgt * 0.07}" height="${hgt}" fill="#0a0405"/><circle cx="${px}" cy="${y - hgt - hgt * 0.04}" r="${hgt * 0.07}" fill="#ffb070" filter="url(#hz-glow)"/><rect x="${px - hgt * 0.06}" y="${y - hgt - hgt * 0.1}" width="${hgt * 0.12}" height="${hgt * 0.1}" fill="#1a0806"/>`,
        )
        .join(''),
    )
    .join('');
  return `<svg class="horizon" viewBox="-200 0 2000 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="hz-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140607"/><stop offset="1" stop-color="#050304"/></linearGradient>
    <linearGradient id="hz-set" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0708"/><stop offset="1" stop-color="#080304"/></linearGradient>
    <filter id="hz-glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="hz-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>
  </defs>
  <path d="M-200 350 Q-160 340 -120 346 T-40 342 T0 352 Q40 338 80 346 T160 340 T240 346 T320 336 T400 344 T480 336 T560 342 L1040 342 T1120 336 T1200 344 T1280 336 T1360 346 T1440 338 T1520 346 T1600 340 T1680 346 T1760 338 T1840 346 L1840 420 L-200 420 Z" fill="#110506"/>
  <g fill="url(#hz-set)" stroke="rgba(255,42,18,0.35)" stroke-width="1.2" stroke-linejoin="miter">
    <path d="${wingL}"/>
    <path d="${mirror(wingL)}"/>
  </g>
  <g stroke="rgba(255,60,20,0.28)" stroke-width="1" fill="none">${spars.map((d) => `<path d="${d}"/><path d="${mirror(d)}"/>`).join('')}</g>
  <g fill="url(#hz-set)">
    <path d="M788 190 L772 150 L784 118 L800 104 L816 118 L828 150 L812 190 Z"/>
    <path d="M784 118 L770 96 L786 108 Z M816 118 L830 96 L814 108 Z"/>
    <path d="M792 138 L800 160 L808 138 L800 146 Z" fill="#050203"/>
    <rect x="620" y="300" width="360" height="90"/>
    <path d="M750 390 V206 L800 164 L850 206 V390 Z"/>
    <path d="M676 390 V238 L698 206 L720 238 V390 Z"/>
    <path d="M880 390 V238 L902 206 L924 238 V390 Z"/>
    <path d="M628 390 V266 L645 242 L662 266 V390 Z"/>
    <path d="M938 390 V266 L955 242 L972 266 V390 Z"/>
    <path d="M600 390 V300 H1000 V390 Z"/>
    ${[610, 630, 650, 950, 970, 990].map((x) => `<rect x="${x - 6}" y="292" width="12" height="10"/>`).join('')}
  </g>
  <g fill="#ff3a14" opacity=".75">
    <rect x="793" y="250" width="14" height="30" rx="7"/>
    <rect x="693" y="262" width="10" height="22" rx="5"/>
    <rect x="897" y="262" width="10" height="22" rx="5"/>
    <rect x="785" y="318" width="30" height="72" rx="15" opacity=".5"/>
  </g>
  <g fill="#ff2a12" filter="url(#hz-glow)"><circle cx="793" cy="132" r="3.2"/><circle cx="807" cy="132" r="3.2"/></g>
  <g fill="#ff5a1f"><circle cx="793" cy="132" r="1.6"/><circle cx="807" cy="132" r="1.6"/></g>
  <rect x="-200" y="384" width="2000" height="40" fill="url(#hz-ground)"/>
  <path d="M-200 386 H1800" stroke="rgba(255,80,30,0.18)" stroke-width="1"/>
  ${Array.from({ length: 50 }, (_, i) => `<rect x="${i * 40 - 198}" y="376" width="2" height="10" fill="#0c0405"/>`).join('')}
  <path d="M-200 378 H1800" stroke="#0c0405" stroke-width="1.2"/>
  ${pillars}
</svg>`;
}
