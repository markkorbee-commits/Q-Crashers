import * as EDU from '../intoxication/education';
import { asText, asUrl, perception, tryCall, type PerceptionLike } from './contracts';
import { h, setText, toggleClass } from './dom';
import { icon } from './icons';
import { panelShell } from './menus';
import type { UI } from './UI';

/** Education content, read defensively (the perception engineer owns the final texts). */
interface Tier {
  bac: number;
  label: string;
  effects: string[];
}
const TIERS: Tier[] = ((EDU as unknown as { ALCOHOL_TIERS?: Tier[] }).ALCOHOL_TIERS ?? []).slice().sort((a, b) => a.bac - b.bac);
const XTC = (EDU as unknown as { XTC_INFO?: Record<string, unknown> }).XTC_INFO ?? {};
const COMPARE = (EDU as unknown as { COMPARE_INFO?: { title?: string; text?: string } }).COMPARE_INFO ?? {};
const TIME_NOTE = String((EDU as unknown as { TIME_COMPRESSION_NOTE?: string }).TIME_COMPRESSION_NOTE ?? '');

const BAC_MAX = 4;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function tierFor(bac: number): Tier | null {
  let t: Tier | null = null;
  for (const x of TIERS) if (x.bac <= bac + 1e-6) t = x;
  return t ?? TIERS[0] ?? null;
}

function meter(): { el: HTMLElement; fill: HTMLElement } {
  const fill = h('div', { class: 'fill' });
  const el = h('div', { class: 'meter', 'aria-hidden': 'true' }, fill);
  for (const t of TIERS) if (t.bac > 0 && t.bac < BAC_MAX) el.appendChild(h('div', { class: 'tick', style: `left:${((t.bac / BAC_MAX) * 100).toFixed(1)}%`, title: `${t.bac} ‰ — ${t.label}` }));
  return { el, fill };
}

/**
 * Perception menu (X), XTC educational disclaimer, status widget (BAC / vitals / warnings) and the
 * draggable compare divider. Everything is driven by the PerceptionSystem API.
 */
export class PerceptionUI {
  readonly status: HTMLElement;
  readonly divider: HTMLElement;
  private bacBig: HTMLElement;
  private tierEl: HTMLElement;
  private bacMeter: { el: HTMLElement; fill: HTMLElement };
  private bacBox: HTMLElement;
  private xtcBox: HTMLElement;
  private vT: HTMLElement;
  private vH: HTMLElement;
  private vR: HTMLElement;
  private vitalT: HTMLElement;
  private vitalH: HTMLElement;
  private vitalR: HTMLElement;
  private warn: HTMLElement;
  private cmpTag: HTMLElement;
  private acc = 0;
  private warnIdx = 0;
  private warnAt = 0;
  private split = 0.5;
  private lastMode = '';
  /** live elements of the open panel (refreshed at 4 Hz) */
  private panelBac: { big: HTMLElement; tier: HTMLElement; fill: HTMLElement; fx: HTMLElement } | null = null;

  constructor(private ui: UI, parent: HTMLElement) {
    this.bacBig = h('span', { class: 'big' }, '0.00');
    this.tierEl = h('span', { class: 'tier' }, 'Sober');
    this.bacMeter = meter();
    this.bacBox = h('div', null, h('div', { class: 'kicker', style: 'margin-bottom:8px' }, 'Blood alcohol'), h('div', { class: 'row' }, h('span', null, this.bacBig, h('span', { class: 'unit' }, '‰')), this.tierEl), this.bacMeter.el);
    const vital = (ico: string, label: string, unit: string) => {
      const b = h('b', null, '—');
      const el = h('div', { class: 'vital', title: label }, h('span', { class: 'vh', html: `${icon(ico)}<small>${label}</small>` }), h('span', null, b, h('i', null, unit)));
      return [el, b] as const;
    };
    [this.vitalT, this.vT] = vital('thermo', 'Temp', '°C');
    [this.vitalH, this.vH] = vital('drop', 'Water', '%');
    [this.vitalR, this.vR] = vital('heart', 'Pulse', 'bpm');
    this.warn = h('div', { class: 'warnline' });
    this.xtcBox = h('div', { class: 'xtc-box' }, h('div', { class: 'kicker', style: 'margin-bottom:6px' }, 'XTC · risk monitor'), h('div', { class: 'vitals' }, this.vitalT, this.vitalH, this.vitalR), this.warn);
    this.cmpTag = h('div', { class: 'compare-tag', html: `${icon('split')}<span>Compare · drag the divider</span>` });
    this.status = h('aside', { class: 'status glass strong hud-el', 'aria-live': 'polite', 'aria-label': 'Perception status' }, this.bacBox, this.xtcBox, this.cmpTag);
    this.status.addEventListener('click', () => this.open());
    this.status.classList.add('ia');
    this.status.style.cursor = 'pointer';

    // compare divider
    const knob = h('div', { class: 'knob', html: icon('split') });
    this.divider = h('div', { class: 'divider hud-el keep-photo ia', role: 'slider', tabindex: '0', 'aria-label': 'Compare divider', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '50' }, h('span', { class: 'lab l' }, 'Sober'), h('span', { class: 'lab r' }, 'Altered'), knob);
    let pid = -1;
    this.divider.addEventListener('pointerdown', (e) => {
      pid = e.pointerId;
      this.divider.setPointerCapture(pid);
      e.preventDefault();
    });
    this.divider.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      this.setSplit(e.clientX / window.innerWidth);
    });
    const up = (e: PointerEvent) => {
      if (e.pointerId === pid) pid = -1;
    };
    this.divider.addEventListener('pointerup', up);
    this.divider.addEventListener('pointercancel', up);
    this.divider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.setSplit(this.split - 0.05);
      else if (e.key === 'ArrowRight') this.setSplit(this.split + 0.05);
      else return;
      e.preventDefault();
      e.stopPropagation();
    });
    parent.append(this.status, this.divider);
  }

  private get p(): PerceptionLike | undefined {
    return perception(this.ui.app);
  }

  get compareOn(): boolean {
    return !!this.p?.compare;
  }

  setSplit(x: number): void {
    this.split = Math.max(0.04, Math.min(0.96, x));
    this.divider.style.left = `${(this.split * 100).toFixed(2)}%`;
    this.divider.setAttribute('aria-valuenow', String(Math.round(this.split * 100)));
    const p = this.p;
    if (!tryCall(p, 'setSplit', this.split)) {
      // fallback: drive the postfx parameter directly
      const pf = this.ui.app.postfx as unknown as { perception?: { split: number } };
      if (pf.perception) pf.perception.split = this.split;
    }
  }

  // ---------------------------------------------------------------------------------------
  // actions
  // ---------------------------------------------------------------------------------------
  sober(): void {
    const p = this.p;
    tryCall(p, 'setXtc', false);
    tryCall(p, 'setCompare', false);
    tryCall(p, 'soberUp');
    this.ui.app.events.emit('perception:changed', { mode: 'sober' });
    this.ui.toast('Back to sober perception', 1800, 'reset');
  }

  addDrink(): void {
    const grams = 9.9; // one 25 cl pilsner (5 %)
    if (!tryCall(this.p, 'addAlcohol', grams)) {
      this.ui.toast('The alcohol simulation is not available yet', 2400, 'info');
      return;
    }
    this.ui.app.events.emit('perception:changed', { mode: 'alcohol' });
    this.ui.toast('+1 drink (25 cl pilsner, 9.9 g alcohol)', 1800, 'beer');
  }

  startXtc(): void {
    if (!tryCall(this.p, 'setXtc', true)) {
      this.ui.toast('The XTC simulation is not available yet', 2400, 'info');
      return;
    }
    this.ui.app.events.emit('perception:changed', { mode: 'xtc' });
    this.ui.toast('XTC perception simulation started — watch the risk monitor', 2800, 'warning');
  }

  toggleCompare(on?: boolean): void {
    const next = on ?? !this.compareOn;
    if (!tryCall(this.p, 'setCompare', next)) {
      this.ui.toast('The compare view is not available yet', 2400, 'info');
      return;
    }
    if (next) this.setSplit(this.split);
    this.ui.app.events.emit('perception:changed', { mode: this.p?.mode ?? 'sober' });
  }

  // ---------------------------------------------------------------------------------------
  // panel
  // ---------------------------------------------------------------------------------------
  open(trigger?: HTMLElement | null): void {
    const ui = this.ui;
    const p = this.p;
    const mode = p?.mode ?? 'sober';
    const { el, body } = panelShell(ui, 'Perception', 'How do you experience it?', true);
    body.appendChild(h('p', { class: 'muted small', style: 'margin:-4px 0 12px' }, 'An educational simulation of how alcohol or XTC change perception at a festival — never an encouragement.'));
    const card = (id: string, ico: string, title: string, sub: string, on: boolean, fn: () => void) => {
      const b = h('button', { class: `p-card ${on ? 'on' : ''}`, type: 'button', 'data-id': id }, h('span', { html: icon(ico), style: 'display:contents' }), h('b', null, title), h('small', null, sub));
      b.addEventListener('click', fn);
      return b;
    };
    const detail = h('div');
    const grid = h(
      'div',
      { class: 'p-grid' },
      card('sober', 'eye', 'Sober', 'Clear senses — the reference', mode === 'sober' && !this.compareOn, () => {
        this.sober();
        ui.layers.close();
      }),
      card('alcohol', 'beer', 'Alcohol', 'Blood alcohol builds up with every drink', mode === 'alcohol', () => {
        refresh('alcohol');
        this.alcoholDetail(detail);
      }),
      card('xtc', 'pill', 'XTC simulation', 'Read the information first', mode === 'xtc', () => {
        ui.layers.close();
        this.openXtcInfo();
      }),
      card('compare', 'split', 'Compare', 'Split view: sober | altered', this.compareOn, () => {
        this.toggleCompare();
        refresh();
        this.compareDetail(detail);
      }),
    );
    /** highlight the cards from the live perception state (+ the card whose details are shown) */
    const refresh = (selected?: string) => {
      const m = this.p?.mode ?? 'sober';
      grid.querySelectorAll<HTMLElement>('.p-card').forEach((c) => {
        const id = c.dataset.id;
        const on = id === selected || (id === 'sober' ? m === 'sober' && !this.compareOn && !selected : id === 'compare' ? this.compareOn : id === m);
        toggleClass(c, 'on', on);
      });
    };
    const reset = h('button', { class: 'btn small ghost', type: 'button', html: `${icon('reset')}<span>Reset to sober</span>`, style: 'margin-top:12px' });
    reset.addEventListener('click', () => {
      this.sober();
      ui.layers.close();
    });
    body.append(grid, detail, reset);
    if (mode === 'alcohol' || (p?.bac ?? 0) > 0) this.alcoholDetail(detail);
    else if (this.compareOn) this.compareDetail(detail);
    ui.layers.open('perception', el, { kind: 'panel', trigger: trigger ?? ui.hud.btn.perception, onClose: () => (this.panelBac = null) });
  }

  private alcoholDetail(host: HTMLElement) {
    const bac = this.p?.bac ?? 0;
    const t = tierFor(bac);
    const big = h('span', { class: 'big', style: 'font:600 30px/1 var(--font-display)' }, bac.toFixed(2));
    const tier = h('span', { class: 'tier', style: 'font:600 11px/1.2 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--red-hot)' }, t?.label ?? '');
    const m = meter();
    m.fill.style.transform = `scaleX(${Math.min(1, bac / BAC_MAX)})`;
    const fx = h('ul', { class: 'fx' });
    for (const e of t?.effects ?? []) fx.appendChild(h('li', null, e));
    const drink = h('button', { class: 'btn small primary', type: 'button', html: `${icon('plus')}<span>+1 drink (demo)</span>` });
    drink.addEventListener('click', () => this.addDrink());
    const bar = h('button', { class: 'btn small', type: 'button', html: `${icon('cup')}<span>Go to the nearest bar</span>` });
    bar.addEventListener('click', () => {
      this.ui.layers.close();
      this.ui.goToNearestBar();
    });
    host.innerHTML = '';
    host.appendChild(
      h(
        'div',
        { class: 'sub-panel' },
        h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;gap:10px' }, h('span', null, big, h('span', { class: 'unit', style: 'color:var(--muted);margin-left:3px' }, '‰ BAC')), tier),
        m.el,
        fx,
        h('p', { class: 'note', html: `${icon('cup')}<span>Walk up to one of the bars and press <kbd>E</kbd> to order — every drink raises your blood alcohol.</span>` }),
        TIME_NOTE ? h('p', { class: 'note', html: `${icon('info')}<span></span>` }) : null,
        h('div', { class: 'actions' }, drink, bar),
      ),
    );
    if (TIME_NOTE) {
      const spans = host.querySelectorAll('.note span');
      spans[spans.length - 1].textContent = TIME_NOTE;
    }
    this.panelBac = { big, tier, fill: m.fill, fx };
  }

  private compareDetail(host: HTMLElement) {
    this.panelBac = null;
    host.innerHTML = '';
    host.appendChild(
      h(
        'div',
        { class: 'sub-panel' },
        h('b', null, COMPARE.title ?? 'Compare'),
        h('p', { class: 'small muted', style: 'margin:6px 0 0' }, COMPARE.text ?? 'Left: sober. Right: altered. Drag the divider.'),
        (this.p?.mode ?? 'sober') === 'sober' ? h('p', { class: 'note', html: `${icon('info')}<span>You are sober right now, so both halves look the same — add a drink or start the XTC simulation to see the difference.</span>` }) : null,
      ),
    );
  }

  openXtcInfo(): void {
    const ui = this.ui;
    const col = (title: string, items: unknown[]) => {
      if (!items.length) return null;
      const ul = h('ul', { class: 'fx' });
      for (const it of items) {
        const url = asUrl(it);
        const text = asText(it);
        ul.appendChild(url ? h('li', null, h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, text || url)) : h('li', null, text));
      }
      return h('div', null, h('h5', null, title), ul);
    };
    const check = h('input', { type: 'checkbox', id: 'xtc-ok' });
    const start = h('button', { class: 'btn primary', type: 'button', disabled: true, html: `${icon('check')}<span>I understand — start simulation</span>` });
    check.addEventListener('change', () => (start.disabled = !check.checked));
    start.addEventListener('click', () => {
      ui.layers.close('xtc');
      this.startXtc();
    });
    const cancel = h('button', { class: 'btn ghost', type: 'button' }, 'Cancel');
    cancel.addEventListener('click', () => ui.layers.close('xtc'));
    const card = h(
      'div',
      { class: 'card wide glass strong rule-top', 'aria-label': 'XTC simulation information' },
      h('div', { class: 'kicker' }, 'Educational simulation'),
      h('h3', null, String(XTC.title ?? 'XTC (MDMA) — perception simulation')),
      h('div', { class: 'disclaimer-box', html: `${icon('warning')}<span></span>` }),
      h('div', { class: 'info-cols', style: 'margin-top:16px' }, col('How it can change perception', list(XTC.effects)), col('Risks', list(XTC.risks)), col('Help on site', list(XTC.help)), col('Sources', list(XTC.sources))),
      h('label', { class: 'check-row', for: 'xtc-ok' }, check, h('span', null, 'I have read this. This simulation does not encourage drug use.')),
      h('div', { class: 'actions' }, start, cancel),
    );
    (card.querySelector('.disclaimer-box span') as HTMLElement).textContent = String(XTC.disclaimer ?? 'This is an educational simulation. It does not encourage drug use.');
    ui.layers.open('xtc', card, { kind: 'modal' });
  }

  // ---------------------------------------------------------------------------------------
  // per-frame (throttled to 4 Hz)
  // ---------------------------------------------------------------------------------------
  update(dt: number): void {
    this.acc += dt;
    if (this.acc < 0.25) return;
    this.acc = 0;
    const p = this.p;
    const bac = p?.bac ?? 0;
    const xtc = p?.xtc ?? 0;
    const cmp = !!p?.compare;
    const mode = p?.mode ?? (xtc > 0 ? 'xtc' : bac > 0 ? 'alcohol' : 'sober');
    const show = bac > 0.005 || xtc > 0.001 || cmp;
    toggleClass(this.status, 'show', show);
    toggleClass(this.divider, 'show', cmp);
    this.ui.hud.setBadge('perception', mode !== 'sober' || cmp);
    if (mode !== this.lastMode) {
      this.lastMode = mode;
    }
    if (!show) return;
    // alcohol
    this.bacBox.style.display = bac > 0.005 ? '' : 'none';
    if (bac > 0.005) {
      setText(this.bacBig, bac.toFixed(2));
      setText(this.tierEl, tierFor(bac)?.label ?? '');
      this.bacMeter.fill.style.transform = `scaleX(${Math.min(1, bac / BAC_MAX).toFixed(3)})`;
    }
    // xtc
    const risk = p?.risk;
    const showX = xtc > 0.001;
    this.xtcBox.style.display = showX ? '' : 'none';
    if (showX) {
      const temp = risk?.bodyTemp;
      let hyd = risk?.hydration;
      if (typeof hyd === 'number' && hyd <= 1.0001) hyd *= 100;
      const hr = risk?.heartRate;
      setText(this.vT, typeof temp === 'number' ? temp.toFixed(1) : '—');
      setText(this.vH, typeof hyd === 'number' ? String(Math.round(hyd)) : '—');
      setText(this.vR, typeof hr === 'number' ? `${Math.round(hr)}` : '—');
      toggleClass(this.vitalT, 'hot', typeof temp === 'number' && temp >= 38.5);
      toggleClass(this.vitalT, 'warn', typeof temp === 'number' && temp >= 37.8 && temp < 38.5);
      toggleClass(this.vitalH, 'hot', typeof hyd === 'number' && hyd < 55);
      toggleClass(this.vitalH, 'warn', typeof hyd === 'number' && hyd >= 55 && hyd < 75);
      toggleClass(this.vitalR, 'hot', typeof hr === 'number' && hr >= 140);
      toggleClass(this.vitalR, 'warn', typeof hr === 'number' && hr >= 110 && hr < 140);
      const warnings = list(risk?.warnings).map(asText).filter(Boolean);
      const now = performance.now();
      if (now - this.warnAt > 5000) {
        this.warnAt = now;
        this.warnIdx++;
      }
      const w = warnings.length ? warnings[this.warnIdx % warnings.length] : 'Keep cool, take breaks in the shade and sip water regularly.';
      if (this.warn.textContent !== w) this.warn.innerHTML = `${icon('warning')}<span></span>`;
      (this.warn.lastElementChild as HTMLElement).textContent = w;
    }
    this.cmpTag.style.display = cmp ? '' : 'none';
    // live values in the open panel
    const pb = this.panelBac;
    if (pb) {
      setText(pb.big, bac.toFixed(2));
      const t = tierFor(bac);
      if (pb.tier.textContent !== (t?.label ?? '')) {
        pb.tier.textContent = t?.label ?? '';
        pb.fx.innerHTML = '';
        for (const e of t?.effects ?? []) pb.fx.appendChild(h('li', null, e));
      }
      pb.fill.style.transform = `scaleX(${Math.min(1, bac / BAC_MAX).toFixed(3)})`;
    }
  }
}
