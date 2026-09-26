/** Tiny DOM helpers for the overlay UI (no framework, no per-frame allocation in the hot paths). */

type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, unknown>;

/**
 * Create an element. Attribute conventions:
 *  - `class`: class string
 *  - `html`: innerHTML (only for trusted, locally authored markup such as inline SVG icons)
 *  - `on<event>`: event listener (e.g. onclick)
 *  - `style`: css text
 *  - `data-*`, `aria-*`, and everything else: setAttribute (booleans toggle presence)
 */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'html') el.innerHTML = String(v);
      else if (k === 'style') el.style.cssText = String(v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'number' ? String(c) : c);
  }
  return el;
}

/** Query helper that throws a readable error when markup and code drift apart. */
export function $<T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string): T {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`[ui] missing element ${sel}`);
  return el as T;
}

/** Set text only when it changed (avoids layout work every frame). */
export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function toggleClass(el: Element, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

/** localStorage wrappers that never throw (private mode, blocked storage, sandboxed frames). */
export const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  },
};

/** true when a keyboard event originates from a text-entry control */
export function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return type !== 'range' && type !== 'checkbox' && type !== 'radio' && type !== 'button';
  }
  return false;
}

/** Download a blob with a file name. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name, style: 'display:none' });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}

/** Make an element draggable by a handle, constrained to the viewport. Returns a dispose fn. */
export function makeDraggable(el: HTMLElement, handle: HTMLElement, onMove?: () => void, onEnd?: () => void): () => void {
  let sx = 0,
    sy = 0,
    ox = 0,
    oy = 0,
    dragging = false,
    pid = -1;
  const down = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,input,select,a')) return;
    const r = el.getBoundingClientRect();
    dragging = true;
    pid = e.pointerId;
    sx = e.clientX;
    sy = e.clientY;
    ox = r.left;
    oy = r.top;
    handle.setPointerCapture(pid);
    el.classList.add('dragging');
    e.preventDefault();
  };
  const move = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== pid) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(4, Math.min(window.innerWidth - r.width - 4, ox + e.clientX - sx));
    const y = Math.max(4, Math.min(window.innerHeight - r.height - 4, oy + e.clientY - sy));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    onMove?.();
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== pid || !dragging) return;
    dragging = false;
    el.classList.remove('dragging');
    try {
      handle.releasePointerCapture(pid);
    } catch {
      /* already released */
    }
    onEnd?.();
  };
  handle.addEventListener('pointerdown', down);
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', up);
  return () => {
    handle.removeEventListener('pointerdown', down);
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    handle.removeEventListener('pointercancel', up);
  };
}
