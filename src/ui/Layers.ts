import { h } from './dom';

export interface LayerOpts {
  /** modal = centred card on a blurred scrim; panel = popover / bottom sheet */
  kind: 'modal' | 'panel';
  onClose?: () => void;
  /** element that opened the layer (focus returns there; clicks on it don't count as "outside") */
  trigger?: HTMLElement | null;
  /** Escape / outside click closes it (default true) */
  dismissible?: boolean;
  scrimClass?: string;
}

interface Layer {
  id: string;
  el: HTMLElement;
  root: HTMLElement;
  opts: LayerOpts;
  dispose: () => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Scroll cue for a scrollable panel / card: `more-below` / `more-above` classes (CSS fades that
 * edge) while there is more content in that direction. Updates on scroll and on size changes.
 */
export function trackScrollEdges(el: HTMLElement): () => void {
  const sync = () => {
    const max = el.scrollHeight - el.clientHeight;
    const below = max > 4 && el.scrollTop < max - 4;
    const above = max > 4 && el.scrollTop > 4;
    if (el.classList.contains('more-below') !== below) el.classList.toggle('more-below', below);
    if (el.classList.contains('more-above') !== above) el.classList.toggle('more-above', above);
  };
  el.addEventListener('scroll', sync, { passive: true });
  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(sync);
    ro.observe(el);
    for (const c of Array.from(el.children)) ro.observe(c);
  }
  requestAnimationFrame(sync);
  return () => {
    el.removeEventListener('scroll', sync);
    ro?.disconnect();
  };
}

/** was the last user interaction a keyboard press? (focus moves into new layers only then) */
let keyboardMode = false;
window.addEventListener('keydown', () => (keyboardMode = true), true);
window.addEventListener('pointerdown', () => (keyboardMode = false), true);

/**
 * Stack of open menus / modals. Knows whether the UI currently captures input so the App can
 * stop walking / looking while a menu is open.
 */
export class Layers {
  private stack: Layer[] = [];
  onChange: ((anyOpen: boolean) => void) | null = null;

  constructor(private host: HTMLElement) {
    document.addEventListener('pointerdown', this.onDocDown, true);
    document.addEventListener('keydown', this.onTrapTab, true);
  }

  get anyOpen(): boolean {
    return this.stack.length > 0;
  }

  /** true when a modal card (scrim) is open */
  get modalOpen(): boolean {
    return this.stack.some((l) => l.opts.kind === 'modal');
  }

  /**
   * Host classes for CSS: `layer-open` (any layer), `modal-open` (a modal card) and `panel-open`
   * (a popover / bottom sheet). The HUD and the touch controls hide behind open layers.
   */
  private syncHost(): void {
    const c = this.host.classList;
    const modal = this.modalOpen;
    c.toggle('layer-open', this.stack.length > 0);
    c.toggle('modal-open', modal);
    c.toggle('panel-open', this.stack.some((l) => l.opts.kind === 'panel'));
  }

  get topId(): string | null {
    return this.stack.length ? this.stack[this.stack.length - 1].id : null;
  }

  isOpen(id: string): boolean {
    return this.stack.some((l) => l.id === id);
  }

  open(id: string, el: HTMLElement, opts: LayerOpts): void {
    if (this.isOpen(id)) this.close(id, true);
    // only one panel at a time; modals stack
    if (opts.kind === 'panel') for (const l of [...this.stack]) if (l.opts.kind === 'panel') this.close(l.id, true);
    let root = el;
    if (opts.kind === 'modal') {
      root = h('div', { class: `scrim ${opts.scrimClass ?? ''}` }, el);
      root.addEventListener('pointerdown', (e) => {
        if (e.target === root && opts.dismissible !== false) this.close(id);
      });
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
    } else {
      el.setAttribute('role', 'dialog');
    }
    // a toolbar button focused by an earlier layer must not look active for this one
    const prev = document.activeElement as HTMLElement | null;
    if (prev && prev !== opts.trigger && prev.closest?.('[data-keep-panel]')) prev.blur();
    this.host.appendChild(root);
    this.stack.push({ id, el, root, opts, dispose: trackScrollEdges(el) });
    opts.trigger?.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      if (!keyboardMode) {
        // pointer users: keep focus inside the layer without showing a focus ring
        el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
        return;
      }
      const all = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      const f = (el.querySelector('[autofocus]') as HTMLElement | null) ?? all.find((x) => !x.classList.contains('close-x')) ?? all[0] ?? null;
      f?.focus({ preventScroll: true });
    });
    this.syncHost();
    this.onChange?.(true);
  }

  /** close a layer (top-most when id is omitted) */
  close(id?: string, silent = false): void {
    const idx = id === undefined ? this.stack.length - 1 : this.stack.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const [l] = this.stack.splice(idx, 1);
    const hadFocus = l.root.contains(document.activeElement);
    l.dispose();
    l.root.remove();
    l.opts.trigger?.setAttribute('aria-expanded', 'false');
    if (hadFocus && l.opts.trigger && document.contains(l.opts.trigger)) l.opts.trigger.focus({ preventScroll: true });
    l.opts.onClose?.();
    this.syncHost();
    if (!silent || this.stack.length === 0) this.onChange?.(this.stack.length > 0);
  }

  closeAll(): void {
    while (this.stack.length) this.close(undefined, true);
    this.syncHost();
    this.onChange?.(false);
  }

  /** kind of an open layer (null when not open) */
  kindOf(id: string): 'modal' | 'panel' | null {
    return this.stack.find((l) => l.id === id)?.opts.kind ?? null;
  }

  /** Escape: close the top layer if it is dismissible; returns true when something closed */
  escape(): boolean {
    const top = this.stack[this.stack.length - 1];
    if (!top || top.opts.dismissible === false) return false;
    this.close(top.id);
    return true;
  }

  private onDocDown = (e: PointerEvent) => {
    const top = this.stack[this.stack.length - 1];
    if (!top || top.opts.kind !== 'panel' || top.opts.dismissible === false) return;
    const t = e.target as Node;
    if (top.el.contains(t) || top.opts.trigger?.contains(t)) return;
    // clicks inside another UI surface that opens layers (e.g. toolbar) are handled by it
    if ((t as HTMLElement).closest?.('[data-keep-panel]')) return;
    this.close(top.id);
  };

  /** keep Tab focus inside a modal */
  private onTrapTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const top = this.stack[this.stack.length - 1];
    if (!top || top.opts.kind !== 'modal') return;
    const items = Array.from(top.el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null);
    if (!items.length) return;
    const first = items[0],
      last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    } else if (!top.el.contains(document.activeElement)) {
      first.focus();
      e.preventDefault();
    }
  };
}
