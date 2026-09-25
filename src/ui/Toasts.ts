import { h } from './dom';
import { icon } from './icons';

/** Short notifications (top centre). Listens to the app's 'toast' events via UI. */
export class Toasts {
  readonly el: HTMLElement;
  private last = '';
  private lastAt = 0;

  constructor(parent: HTMLElement) {
    this.el = h('div', { class: 'toasts', 'aria-live': 'polite', role: 'status' });
    parent.appendChild(this.el);
  }

  show(text: string, ms = 3200, ico = 'info'): void {
    const now = performance.now();
    if (text === this.last && now - this.lastAt < 1500) return; // de-duplicate bursts
    this.last = text;
    this.lastAt = now;
    const t = h('div', { class: 'toast glass strong', html: icon(ico) }, h('span', null, text));
    this.el.appendChild(t);
    while (this.el.children.length > 3) this.el.firstElementChild?.remove();
    const dur = Math.max(1600, ms);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 380);
    }, dur);
  }
}
