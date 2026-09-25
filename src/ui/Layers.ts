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
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

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
    this.host.appendChild(root);
    this.stack.push({ id, el, root, opts });
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
    this.onChange?.(true);
  }

  /** close a layer (top-most when id is omitted) */
  close(id?: string, silent = false): void {
    const idx = id === undefined ? this.stack.length - 1 : this.stack.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const [l] = this.stack.splice(idx, 1);
    const hadFocus = l.root.contains(document.activeElement);
    l.root.remove();
    l.opts.trigger?.setAttribute('aria-expanded', 'false');
    if (hadFocus && l.opts.trigger && document.contains(l.opts.trigger)) l.opts.trigger.focus({ preventScroll: true });
    l.opts.onClose?.();
    if (!silent || this.stack.length === 0) this.onChange?.(this.stack.length > 0);
  }

  closeAll(): void {
    while (this.stack.length) this.close(undefined, true);
    this.onChange?.(false);
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
