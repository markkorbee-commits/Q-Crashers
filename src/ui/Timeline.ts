import type { App } from '../core/App';
import { h, setText } from './dom';
import { fmtTime } from './format';

/**
 * Show timeline: chapter segments, section-energy silhouette (coloured with each section's
 * palette), moment markers, hover/scrub preview (time + track) and click/drag seeking.
 */
export class Timeline {
  readonly el: HTMLElement;
  private track: HTMLElement;
  private fill: HTMLElement;
  private head: HTMLElement;
  private hover: HTMLElement;
  private tip: HTMLElement;
  private tipTime: HTMLElement;
  private tipText: HTMLElement;
  private energy: HTMLCanvasElement;
  private dragging = false;
  private pid = -1;
  private lastSeekAt = 0;
  private pendingSeek = -1;
  private width = 0;
  private lastPx = -1;
  private lastAria = -1;
  private built = false;
  /** called whenever the user scrubs (so the HUD stays visible) */
  onInteract: (() => void) | null = null;

  constructor(private app: App) {
    this.fill = h('div', { class: 'fill' });
    this.track = h('div', { class: 'track' }, this.fill);
    this.head = h('div', { class: 'head' });
    this.tipTime = h('b');
    this.tipText = h('span');
    this.tip = h('div', { class: 'tip' }, this.tipTime, this.tipText);
    this.hover = h('div', { class: 'hover' }, this.tip);
    this.energy = h('canvas', { class: 'energy', 'aria-hidden': 'true' });
    this.el = h(
      'div',
      { class: 'tl', role: 'slider', tabindex: '0', 'aria-label': 'Show timeline', 'aria-valuemin': '0', 'aria-valuemax': '0', 'aria-valuenow': '0' },
      this.energy,
      this.track,
      this.head,
      this.hover,
    );
    this.el.addEventListener('pointerdown', this.onDown);
    this.el.addEventListener('pointermove', this.onMove);
    this.el.addEventListener('pointerup', this.onUp);
    this.el.addEventListener('pointercancel', this.onUp);
    this.el.addEventListener('pointerleave', () => {
      if (!this.dragging) this.el.classList.remove('hovering');
    });
    this.el.addEventListener('keydown', this.onKey);
    new ResizeObserver(() => this.layout()).observe(this.el);
  }

  /** build markers once the show is loaded */
  build(): void {
    const show = this.app.show;
    const dur = show.duration || 1;
    this.el.setAttribute('aria-valuemax', String(Math.round(dur)));
    // chapter segments with small gaps (like chapter markers)
    this.track.querySelectorAll('.seg-bg').forEach((n) => n.remove());
    const ch = show.file.chapters.length ? show.file.chapters : [{ t: 0, title: '', artist: '' }];
    const stops: string[] = [];
    for (let i = 0; i < ch.length; i++) {
      const a = ch[i].t / dur;
      const b = (i + 1 < ch.length ? ch[i + 1].t : dur) / dur;
      const seg = h('div', { class: 'seg-bg', style: `left:calc(${(a * 100).toFixed(3)}% + ${i ? 1.5 : 0}px);right:calc(${(100 - b * 100).toFixed(3)}% + ${i + 1 < ch.length ? 1.5 : 0}px)` });
      this.track.insertBefore(seg, this.fill);
      if (i > 0) {
        const pc = `${(a * 100).toFixed(3)}%`;
        stops.push(`#000 calc(${pc} - 1.5px), transparent calc(${pc} - 1.5px), transparent calc(${pc} + 1.5px), #000 calc(${pc} + 1.5px)`);
      }
    }
    // mask cuts the chapter gaps out of the progress fill as well
    this.fill.style.setProperty('--tl-mask', stops.length ? `linear-gradient(90deg, #000 0, ${stops.join(', ')}, #000 100%)` : 'none');
    this.el.querySelectorAll('.moment').forEach((n) => n.remove());
    for (const m of show.file.moments ?? []) {
      this.el.insertBefore(h('div', { class: 'moment', style: `left:${((m.t / dur) * 100).toFixed(3)}%`, title: m.label }), this.head);
    }
    this.built = true;
    this.layout();
  }

  private layout() {
    const r = this.el.getBoundingClientRect();
    this.width = r.width;
    this.lastPx = -1;
    if (this.built) this.drawEnergy();
  }

  /** silhouette of section energy, tinted by each section's palette */
  private drawEnergy() {
    const c = this.energy;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(this.width * dpr));
    const hh = Math.round(14 * dpr);
    c.width = w;
    c.height = hh;
    const g = c.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, w, hh);
    const show = this.app.show;
    const dur = show.duration || 1;
    const secs = show.file.sections ?? [];
    for (const s of secs) {
      const x0 = (s.start / dur) * w;
      const x1 = (Math.min(s.end, dur) / dur) * w;
      const pal = show.file.palettes[s.palette];
      const col = pal?.primary ?? '#e10600';
      const e = Math.max(0.08, Math.min(1, s.energy ?? 0.5));
      const top = hh - e * hh;
      const grad = g.createLinearGradient(0, top, 0, hh);
      grad.addColorStop(0, col);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.globalAlpha = 0.85;
      g.fillRect(x0 + 0.5, top, Math.max(1, x1 - x0 - 1), hh - top);
      g.globalAlpha = 1;
      g.fillStyle = col;
      g.fillRect(x0 + 0.5, top, Math.max(1, x1 - x0 - 1), Math.max(1, dpr));
    }
  }

  /** per-frame update (cheap: touches the DOM only when the playhead moved >= 0.5 px) */
  update(time: number): void {
    const dur = this.app.show.duration || 1;
    const p = Math.max(0, Math.min(1, time / dur));
    const px = p * this.width;
    if (Math.abs(px - this.lastPx) >= 0.5) {
      this.lastPx = px;
      this.fill.style.clipPath = `inset(0 ${(100 - p * 100).toFixed(3)}% 0 0)`;
      this.head.style.transform = `translateX(${px.toFixed(1)}px)`;
    }
    const s = Math.floor(time);
    if (s !== this.lastAria) {
      this.lastAria = s;
      this.el.setAttribute('aria-valuenow', String(s));
      const ch = this.app.show.chapterAt(time);
      this.el.setAttribute('aria-valuetext', `${fmtTime(time)}${ch ? ` — ${ch.artist} — ${ch.title}` : ''}`);
    }
  }

  private timeAt(clientX: number): number {
    const r = this.el.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width)));
    return p * (this.app.show.duration || 0);
  }

  private preview(clientX: number) {
    const r = this.el.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, clientX - r.left));
    const t = this.timeAt(clientX);
    this.hover.style.left = `${x}px`;
    // keep the tip inside the bar
    const tipW = this.tip.offsetWidth || 160;
    const shift = Math.max(tipW / 2 - x, Math.min(0, r.width - x - tipW / 2));
    this.tip.style.transform = `translateX(calc(-50% + ${shift}px))`;
    setText(this.tipTime, fmtTime(t));
    const ch = this.app.show.chapterAt(t);
    const m = this.nearMoment(t);
    setText(this.tipText, m ? m : ch ? `${ch.artist} — ${ch.title}` : '');
  }

  private nearMoment(t: number): string | null {
    const dur = this.app.show.duration || 1;
    const tol = (dur * 6) / Math.max(200, this.width);
    for (const m of this.app.show.file.moments ?? []) if (Math.abs(m.t - t) < tol) return m.label;
    return null;
  }

  private seek(t: number, final: boolean) {
    const clock = this.app.clock;
    if (!clock) return;
    const coarse = clock.track.coarseClock;
    const now = performance.now();
    if (!final && coarse && now - this.lastSeekAt < 180) {
      this.pendingSeek = t;
      return;
    }
    this.lastSeekAt = now;
    this.pendingSeek = -1;
    clock.seek(t);
    this.update(t);
  }

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.dragging = true;
    this.pid = e.pointerId;
    this.el.setPointerCapture(e.pointerId);
    this.el.classList.add('drag');
    this.preview(e.clientX);
    this.seek(this.timeAt(e.clientX), false);
    this.onInteract?.();
    e.preventDefault();
  };

  private onMove = (e: PointerEvent) => {
    this.preview(e.clientX);
    if (this.dragging && e.pointerId === this.pid) {
      this.seek(this.timeAt(e.clientX), false);
      this.onInteract?.();
    }
  };

  private onUp = (e: PointerEvent) => {
    if (!this.dragging || e.pointerId !== this.pid) return;
    this.dragging = false;
    this.el.classList.remove('drag');
    try {
      this.el.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    this.seek(this.pendingSeek >= 0 ? this.pendingSeek : this.timeAt(e.clientX), true);
    if (e.pointerType === 'mouse') this.el.blur();
  };

  private onKey = (e: KeyboardEvent) => {
    const clock = this.app.clock;
    if (!clock) return;
    const t = clock.time;
    let to = -1;
    if (e.key === 'ArrowLeft') to = t - 5;
    else if (e.key === 'ArrowRight') to = t + 5;
    else if (e.key === 'PageDown') to = t - 30;
    else if (e.key === 'PageUp') to = t + 30;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = this.app.show.duration - 1;
    if (to >= -10) {
      e.preventDefault();
      e.stopPropagation();
      this.seek(Math.max(0, to), true);
      this.onInteract?.();
    }
  };
}
