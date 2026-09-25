import { h, makeDraggable, store } from './dom';
import { icon } from './icons';

type PipSize = 'small' | 'normal' | 'large';
const SIZES: PipSize[] = ['small', 'normal', 'large'];

/**
 * "Official broadcast" picture-in-picture panel for the YouTube source. The video must stay
 * visible while it plays (YouTube requirement), so the panel can be moved and resized but never
 * shrinks below 256 x 144 px (always >= 200 px wide).
 */
export class PiP {
  readonly el: HTMLElement;
  readonly video: HTMLElement;
  private size: PipSize;
  private sizeBtn: HTMLButtonElement;

  constructor(parent: HTMLElement) {
    this.size = (store.get('dq26.pipSize') as PipSize) || 'normal';
    if (!SIZES.includes(this.size)) this.size = 'normal';
    this.video = h('div', { class: 'video' });
    this.sizeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Change picture size', 'data-tip': 'Size', html: icon('fullscreen') });
    this.sizeBtn.addEventListener('click', () => this.cycle());
    const bar = h('div', { class: 'bar', title: 'Drag to move' }, h('span', { class: 't' }, 'Official broadcast'), this.sizeBtn);
    this.el = h('aside', { class: `pip glass strong ${this.size}`, 'aria-label': 'Official broadcast (YouTube)' }, bar, this.video);
    bar.addEventListener('dblclick', () => this.cycle());
    parent.appendChild(this.el);
    makeDraggable(this.el, bar);
    window.addEventListener('resize', () => this.keepInside());
  }

  show(): void {
    this.el.classList.add('show');
  }

  hide(): void {
    this.el.classList.remove('show');
  }

  get visible(): boolean {
    return this.el.classList.contains('show');
  }

  private cycle() {
    const i = SIZES.indexOf(this.size);
    this.el.classList.remove(this.size);
    this.size = SIZES[(i + 1) % SIZES.length];
    if (this.size === 'large' && window.innerWidth < 700) this.size = 'small';
    this.el.classList.add(this.size);
    store.set('dq26.pipSize', this.size);
    this.keepInside();
  }

  private keepInside() {
    if (!this.el.style.left) return;
    const r = this.el.getBoundingClientRect();
    const x = Math.max(4, Math.min(window.innerWidth - r.width - 4, r.left));
    const y = Math.max(4, Math.min(window.innerHeight - r.height - 4, r.top));
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }
}
