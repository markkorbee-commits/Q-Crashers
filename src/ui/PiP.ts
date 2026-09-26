import { h, makeDraggable, store } from './dom';
import { icon } from './icons';

type PipSize = 'small' | 'normal' | 'large';
const SIZES: PipSize[] = ['small', 'normal', 'large'];
/** panel widths (px): roomy screens / phones and short windows (the video is 16:9 below a 30-34 px bar) */
const WIDTH: Record<'wide' | 'compact', Record<PipSize, number>> = {
  wide: { small: 256, normal: 320, large: 480 },
  compact: { small: 208, normal: 240, large: 320 },
};
/** HUD surfaces the panel must not cover (the show bar also counts while it is auto-hidden) */
const OBSTACLES = ['.toolbar', '.showbar', '.status.show', '.tc-cluster', '.photo-panel', '.shutter', '.prompt.show'];
const GAP = 8;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * "Official broadcast" picture-in-picture panel for the YouTube source. The video must stay
 * visible while it plays (YouTube requirement), so the panel can be moved and resized but never
 * shrinks below 208 x 117 px (always >= 200 px wide).
 *
 * Placement: docked in the first free slot that covers none of the HUD (toolbar, show bar, touch
 * buttons, status widget) — above the show bar on the right on desktops, top-left (in place of
 * the brand) on phones and short windows. A dragged panel stays where it was put, but is nudged
 * off the HUD when dropped on it and kept inside the window on resize.
 */
export class PiP {
  readonly el: HTMLElement;
  readonly video: HTMLElement;
  private size: PipSize;
  private sizeBtn: HTMLButtonElement;
  private title: HTMLElement;
  private compact = false;
  /** 'dock' = automatic slot; 'user' = where the viewer dragged it */
  private placed: 'dock' | 'user' = 'dock';
  private moved = false;
  private hintTimer = 0;
  private raf = 0;

  constructor(private parent: HTMLElement, private touch = false) {
    this.compact = this.isCompact();
    this.size = this.storedSize();
    this.video = h('div', { class: 'video' });
    this.sizeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Change picture size', 'data-tip': 'Size', html: icon('resize') });
    this.sizeBtn.addEventListener('click', () => this.cycle());
    this.title = h('span', { class: 't' }, 'Official broadcast');
    const bar = h('div', { class: 'bar', title: 'Drag to move · double-click to resize' }, h('span', { class: 'grip', html: icon('grip') }), this.title, this.sizeBtn);
    this.el = h('aside', { class: `pip glass strong ${this.size}`, 'aria-label': 'Official broadcast (YouTube)' }, bar, this.video);
    bar.addEventListener('dblclick', () => this.cycle());
    parent.appendChild(this.el);
    makeDraggable(
      this.el,
      bar,
      () => {
        this.moved = true;
        this.hint(false);
      },
      () => {
        if (!this.moved) return;
        this.moved = false;
        this.placed = 'user';
        this.layout();
      },
    );
    this.applyWidth();
    window.addEventListener('resize', () => this.schedule());
    // HUD surfaces appear / disappear with the #ui state classes (layers, photo, cinema, coach)
    new MutationObserver(() => this.schedule()).observe(parent, { attributes: true, attributeFilter: ['class'] });
  }

  show(): void {
    if (this.visible) return;
    this.el.classList.add('show');
    this.parent.classList.add('pip-on');
    this.layout();
    // touch: nothing says the panel can be moved; tell once
    if (this.touch && store.get('dq26.pipHint') !== '1') {
      store.set('dq26.pipHint', '1');
      this.hint(true);
    }
  }

  hide(): void {
    this.el.classList.remove('show');
    this.parent.classList.remove('pip-on', 'pip-tl');
    this.hint(false);
  }

  get visible(): boolean {
    return this.el.classList.contains('show');
  }

  /** current panel box (for tests / other overlays) */
  get rect(): DOMRect {
    return this.el.getBoundingClientRect();
  }

  private isCompact(): boolean {
    return this.touch || window.innerHeight < 520 || window.innerWidth < 640;
  }

  private storedSize(): PipSize {
    const s = store.get(this.compact ? 'dq26.pipSizeC' : 'dq26.pipSize') as PipSize | null;
    return s && SIZES.includes(s) ? s : this.compact ? 'small' : 'normal';
  }

  private hint(on: boolean) {
    clearTimeout(this.hintTimer);
    this.el.classList.toggle('hinting', on);
    this.title.textContent = on ? 'Drag to move' : 'Official broadcast';
    if (on) this.hintTimer = window.setTimeout(() => this.hint(false), 6000);
  }

  private cycle() {
    const i = SIZES.indexOf(this.size);
    let next = SIZES[(i + 1) % SIZES.length];
    const w = WIDTH[this.compact ? 'compact' : 'wide'][next];
    // never larger than ~45 % of the window (a large panel on a small screen wraps to small)
    if (w > window.innerWidth * 0.46 || (w * 9) / 16 + 34 > window.innerHeight * 0.55) next = 'small';
    this.size = next;
    store.set(this.compact ? 'dq26.pipSizeC' : 'dq26.pipSize', next);
    this.applyWidth();
    this.layout();
  }

  private applyWidth() {
    for (const s of SIZES) this.el.classList.toggle(s, s === this.size);
    this.el.classList.toggle('compact', this.compact);
    this.el.style.width = `${WIDTH[this.compact ? 'compact' : 'wide'][this.size]}px`;
  }

  private schedule() {
    if (!this.visible || this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      const c = this.isCompact();
      if (c !== this.compact) {
        this.compact = c;
        this.size = this.storedSize();
        this.applyWidth();
        this.placed = 'dock';
      }
      this.layout();
    });
  }

  /** HUD rectangles the panel should stay clear of (hidden surfaces have no box and are skipped) */
  private obstacles(): Box[] {
    const out: Box[] = [];
    for (const sel of OBSTACLES) {
      const e = (sel.startsWith('.tc') ? document : this.parent).querySelector<HTMLElement>(sel);
      if (!e) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      // the auto-hidden show bar slides down (transform): use its resting place
      const top = e === this.showbar() ? e.offsetTop : r.top;
      out.push({ x: r.left - GAP, y: top - GAP, w: r.width + 2 * GAP, h: r.height + 2 * GAP });
    }
    return out;
  }

  private showbar(): HTMLElement | null {
    return this.parent.querySelector<HTMLElement>('.showbar');
  }

  private place(x: number, y: number) {
    this.el.style.left = `${Math.round(x)}px`;
    this.el.style.top = `${Math.round(y)}px`;
    this.el.style.right = 'auto';
    this.el.style.bottom = 'auto';
  }

  /** dock into the first free slot, or keep a dragged panel inside the window and off the HUD */
  layout(): void {
    if (!this.visible) return;
    const W = window.innerWidth,
      H = window.innerHeight;
    const r = this.el.getBoundingClientRect();
    const w = r.width,
      ht = r.height;
    const obs = this.obstacles();
    const overlap = (x: number, y: number) => {
      let a = 0;
      for (const o of obs) {
        const ox = Math.min(x + w, o.x + o.w) - Math.max(x, o.x);
        const oy = Math.min(y + ht, o.y + o.h) - Math.max(y, o.y);
        if (ox > 0 && oy > 0) a += ox * oy;
      }
      return a;
    };
    const clampX = (x: number) => Math.max(4, Math.min(W - w - 4, x));
    const clampY = (y: number) => Math.max(4, Math.min(H - ht - 4, y));
    let best: [number, number];
    if (this.placed === 'user') {
      // nudge the smallest distance that clears the HUD (up / down / left / right of each surface)
      let x = clampX(r.left),
        y = clampY(r.top);
      if (overlap(x, y) > 0) {
        const cands: [number, number][] = [[x, y]];
        for (const o of obs) cands.push([x, clampY(o.y - ht)], [x, clampY(o.y + o.h)], [clampX(o.x - w), y], [clampX(o.x + o.w), y]);
        let bd = Infinity;
        for (const [cx, cy] of cands) {
          const d = overlap(cx, cy) * 1000 + Math.hypot(cx - x, cy - y);
          if (d < bd) {
            bd = d;
            x = cx;
            y = cy;
          }
        }
      }
      best = [x, y];
    } else {
      const tb = this.parent.querySelector('.toolbar')?.getBoundingClientRect();
      const sbEl = this.showbar();
      const left = GAP;
      const right = W - w - GAP - 6;
      const belowToolbar = tb ? tb.bottom + GAP : 70;
      const aboveShowbar = (sbEl && sbEl.offsetHeight > 0 ? sbEl.offsetTop : H - 140) - ht - GAP * 2;
      const slots: [number, number][] = this.compact
        ? [
            // top-left in place of the brand, or under the toolbar where it spans the width
            [left, tb && tb.left < left + w + GAP ? belowToolbar : GAP],
            [left, belowToolbar],
            [right, belowToolbar],
            [left, aboveShowbar],
          ]
        : [
            [right, aboveShowbar],
            [right, belowToolbar],
            [left, belowToolbar],
            [left, aboveShowbar],
          ];
      best = [clampX(slots[0][0]), clampY(slots[0][1])];
      let bo = Infinity;
      for (const [sx, sy] of slots) {
        const x = clampX(sx),
          y = clampY(sy);
        const o = overlap(x, y);
        if (o < bo - 1) {
          bo = o;
          best = [x, y];
        }
        if (o <= 0) break;
      }
    }
    this.place(best[0], best[1]);
    // the brand hides under a panel docked in the top-left corner
    const brand = this.parent.querySelector('.brand')?.getBoundingClientRect();
    const covers = !!brand && brand.width > 0 && best[0] < brand.right && best[1] < brand.bottom && best[0] + w > brand.left && best[1] + ht > brand.top;
    this.parent.classList.toggle('pip-tl', covers);
  }
}
