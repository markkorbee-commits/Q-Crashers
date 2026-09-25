import type { OutcomeCardText } from './education';

export type OutcomeAction = OutcomeCardText['actions'][number]['id'];

const STYLE_ID = 'perception-outcome-style';
const CSS = `
.p-outcome{position:fixed;inset:0;z-index:45;pointer-events:auto;display:flex;align-items:center;justify-content:center;
  padding:calc(16px + env(safe-area-inset-top,0px)) 16px calc(16px + env(safe-area-inset-bottom,0px));
  background:radial-gradient(ellipse at 50% 50%,rgba(8,4,6,.25),rgba(4,3,5,.72));animation:p-out-in .5s ease-out}
.p-outcome .card{position:relative;width:min(600px,100%);max-height:100%;overflow:auto;color:var(--paper,#f3ede4);animation:none;
  background:var(--glass-2,rgba(9,9,12,.9));border:1px solid var(--line,rgba(243,237,228,.09));border-radius:var(--radius,14px);
  padding:26px 26px 22px;box-shadow:0 18px 50px rgba(0,0,0,.5);font:14px/1.45 var(--font-ui,system-ui,sans-serif)}
.p-outcome .kicker{font:600 11px/1.2 var(--font-ui,system-ui,sans-serif);letter-spacing:.22em;text-transform:uppercase;color:var(--red-hot,#ff2a12)}
.p-outcome h3{font-family:var(--font-display,Impact,sans-serif);font-size:clamp(24px,3.4vw,34px);font-weight:600;letter-spacing:.03em;
  text-transform:uppercase;margin:8px 0 10px;line-height:1.05}
.p-outcome p{margin:0 0 10px;color:var(--paper-2,#d9d2c8)}
.p-outcome .help{margin:14px 0 0;padding:12px 14px 10px 30px;border-radius:10px;background:rgba(11,138,58,.12);
  border:1px solid rgba(47,224,122,.28)}
.p-outcome .help li{margin:0 0 5px;color:var(--paper-2,#d9d2c8);font-size:13px}
.p-outcome .help-k{display:block;margin:0 0 6px -16px;font:600 10px/1.2 var(--font-ui,system-ui,sans-serif);letter-spacing:.2em;text-transform:uppercase;color:#7ddc8a}
.p-outcome .actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.p-outcome button{appearance:none;min-height:44px;padding:0 20px;border-radius:999px;border:1px solid var(--line-2,rgba(243,237,228,.16));
  background:rgba(255,255,255,.04);color:var(--paper,#f3ede4);font:600 13px/1 var(--font-ui,system-ui,sans-serif);letter-spacing:.06em;
  text-transform:uppercase;cursor:pointer}
.p-outcome button.primary{background:linear-gradient(180deg,#ff2210,#c80500);border-color:rgba(255,120,90,.55);color:#fff}
.p-outcome button:focus-visible{outline:2px solid #fff;outline-offset:2px}
@keyframes p-out-in{from{opacity:.55}}
@media (max-width:560px),(max-height:480px){.p-outcome .card{padding:18px 16px 14px}.p-outcome h3{margin:6px 0}.p-outcome .help{margin-top:10px}}
`;

/**
 * Modal outcome cards of the perception simulation (sit down / collapse / "dinsdagdip" epilogue).
 * Self-contained DOM (the UI module may take over by setting PerceptionSystem.renderOutcomeCards = false
 * and reading `perception.outcome`). Built only when an outcome happens — never per frame.
 */
export class OutcomeOverlay {
  private root: HTMLElement | null = null;
  private onKey: ((e: KeyboardEvent) => void) | null = null;

  get open(): boolean {
    return this.root !== null;
  }

  show(text: OutcomeCardText, fill: Record<string, string>, onAction: (id: OutcomeAction) => void): void {
    this.hide();
    if (typeof document === 'undefined') return;
    if (!document.getElementById(STYLE_ID)) {
      const st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const sub = (s: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => fill[k] ?? '—');
    const el = (tag: string, cls?: string, txt?: string) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (txt !== undefined) e.textContent = txt;
      return e;
    };
    const root = el('div', 'p-outcome');
    const card = el('div', 'card');
    card.setAttribute('role', 'alertdialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', text.title);
    card.append(el('div', 'kicker', text.kicker), el('h3', undefined, text.title));
    for (const p of text.body) card.appendChild(el('p', undefined, sub(p)));
    if (text.help.length) {
      const ul = el('ul', 'help');
      ul.appendChild(el('span', 'help-k', 'Help'));
      for (const h of text.help) ul.appendChild(el('li', undefined, sub(h)));
      card.appendChild(ul);
    }
    const actions = el('div', 'actions');
    let primary: HTMLButtonElement | null = null;
    let primaryId: OutcomeAction = text.actions[0]?.id ?? 'close';
    for (const a of text.actions) {
      const b = el('button', a.primary ? 'primary' : undefined, a.label) as HTMLButtonElement;
      b.type = 'button';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
        onAction(a.id);
      });
      actions.appendChild(b);
      if (a.primary || !primary) {
        primary = b;
        primaryId = a.id;
      }
    }
    card.appendChild(actions);
    root.appendChild(card);
    // stop clicks reaching the canvas (pointer lock) or the UI below
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.hide();
        onAction(primaryId);
      }
    };
    window.addEventListener('keydown', this.onKey, true);
    if (document.pointerLockElement) document.exitPointerLock();
    (document.getElementById('ui') ?? document.body).appendChild(root);
    this.root = root;
    const pb = primary as HTMLButtonElement | null;
    pb?.focus({ preventScroll: true });
  }

  hide(): void {
    if (this.onKey) window.removeEventListener('keydown', this.onKey, true);
    this.onKey = null;
    this.root?.remove();
    this.root = null;
  }
}
