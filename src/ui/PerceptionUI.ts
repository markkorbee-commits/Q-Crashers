import * as THREE from 'three';
import * as EDU from '../intoxication/education';
import { asText, FIRST_AID, perception, player, tryCall, type PerceptionLike } from './contracts';
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
const RISK = ((EDU as unknown as { RISK_MESSAGES?: Record<string, string> }).RISK_MESSAGES ?? {}) as Record<string, string>;

const BAC_MAX = 4;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * State names per tier (what the player IS, not the threshold number); the range comes from the
 * tier table. Falls back to the education label without its "0.5‰ — " prefix.
 */
const STATE: Record<string, string> = {
  '0.2': 'First effects',
  '0.5': 'Over the driving limit',
  '0.8': 'Clearly impaired',
  '1.2': 'Drunk',
  '1.6': 'Very drunk',
  '2': 'Danger',
};
const SOBER: Tier = { bac: 0, label: 'Sober', effects: [] };

/** the tier for a BAC, selected at the precision it is displayed with (2 decimals); Sober below the first */
export function tierFor(bac: number): Tier {
  const b = Math.round(bac * 100) / 100;
  let t: Tier = SOBER;
  for (const x of TIERS) if (x.bac <= b + 1e-6) t = x;
  return t;
}

/** "Clearly impaired · 0.8–1.2‰" */
export function tierName(t: Tier): string {
  if (t === SOBER || t.bac <= 0) return 'Sober';
  const name = STATE[String(t.bac)] ?? t.label.replace(/^[\d.]+\s*‰\s*[—-]\s*/, '');
  const i = TIERS.indexOf(t);
  const next = TIERS[i + 1];
  return next ? `${name} · ${t.bac}–${next.bac}‰` : `${name} · ${t.bac}‰+`;
}

/** BAC meter: fill, labelled ticks (0.5 = Dutch legal driving limit, 1, 2, 3 ‰) */
function meter(labels = false): { el: HTMLElement; fill: HTMLElement } {
  const fill = h('div', { class: 'fill' });
  const el = h('div', { class: `meter${labels ? ' labelled' : ''}`, 'aria-hidden': 'true' }, fill);
  for (const v of [0.5, 1, 2, 3]) {
    const tick = h('div', { class: `tick${v === 0.5 ? ' limit' : ''}`, style: `left:${((v / BAC_MAX) * 100).toFixed(1)}%`, title: v === 0.5 ? '0.5‰ — Dutch legal driving limit' : `${v}‰` });
    if (labels) tick.appendChild(h('span', null, v === 0.5 ? '0.5' : String(v)));
    el.appendChild(tick);
  }
  if (labels) el.appendChild(h('span', { class: 'end' }, '4‰'));
  return { el, fill };
}

/** the most severe messages (pinned, never rotated away) */
const DANGER = new Set([RISK.hyperthermia, RISK.alcoholDanger, RISK.heart].filter(Boolean));
const HELP = RISK.help ?? 'First aid posts and staff help without judgement.';

/** trusted help links (rendered as real links) */
const LINKS: { label: string; url: string; test: RegExp }[] = [
  { label: 'drugsinfo.nl (Trimbos)', url: 'https://www.drugsinfo.nl', test: /drugsinfo/i },
  { label: 'jellinek.nl', url: 'https://www.jellinek.nl', test: /jellinek/i },
  { label: 'unity.nu — peer info at festivals', url: 'https://www.unity.nu', test: /unity/i },
  { label: 'celebratesafe.nl', url: 'https://www.celebratesafe.nl', test: /celebrate ?safe/i },
  { label: 'nida.nih.gov — MDMA research report', url: 'https://nida.nih.gov/publications/research-reports/mdma-ecstasy-abuse', test: /nida/i },
  { label: 'trimbos.nl', url: 'https://www.trimbos.nl', test: /trimbos.*alcohol|alcoholinfo/i },
  { label: 'rijksoverheid.nl — alcohol and driving', url: 'https://www.rijksoverheid.nl/onderwerpen/alcohol-en-drugs-in-het-verkeer', test: /rijksoverheid/i },
];

function linkFor(text: string): { label: string; url: string } | null {
  return LINKS.find((l) => l.test.test(text)) ?? null;
}

/**
 * Perception menu (X), XTC educational disclaimer, status widget (BAC / vitals / warnings / help
 * actions), first-aid and overheating outcomes, the XTC epilogue and the draggable compare divider.
 * Everything is driven by the PerceptionSystem API.
 */
export class PerceptionUI {
  readonly status: HTMLElement;
  readonly divider: HTMLElement;
  private bacBig: HTMLElement;
  private tierEl: HTMLElement;
  private bacMeter: { el: HTMLElement; fill: HTMLElement };
  private bacBox: HTMLElement;
  private xtcBox: HTMLElement;
  private xtcKicker: HTMLElement;
  private vT: HTMLElement;
  private vH: HTMLElement;
  private vR: HTMLElement;
  private vHLabel: HTMLElement;
  private vitalT: HTMLElement;
  private vitalH: HTMLElement;
  private vitalR: HTMLElement;
  private warnBox: HTMLElement;
  private warn: HTMLElement;
  private warnSub: HTMLElement;
  private actions: HTMLElement;
  private restBtn: HTMLButtonElement;
  private aidBtn: HTMLButtonElement;
  private cmpTag: HTMLElement;
  private acc = 0;
  private warnIdx = 0;
  private warnAt = 0;
  private split = 0.5;
  private lastPhase = 'off';
  /** the XTC run was ended by the reset button (no epilogue) */
  private xtcReset = false;
  /** outcome cards shown once per episode (re-armed when the value falls back) */
  private aidShown = false;
  private heatShown = false;
  /** seconds the body monitor stays after the XTC timeline ended (cool-down) */
  private recoverLeft = 0;
  /** live elements of the open panel (refreshed at 4 Hz) */
  private panelBac: { big: HTMLElement; tier: HTMLElement; fill: HTMLElement; fx: HTMLElement; tierLabel: string } | null = null;

  constructor(private ui: UI, parent: HTMLElement) {
    this.bacBig = h('span', { class: 'big' }, '0.00');
    this.tierEl = h('span', { class: 'tier' }, 'Sober');
    this.bacMeter = meter(true);
    this.bacBox = h('div', { class: 'bac-box' }, h('div', { class: 'kicker', style: 'margin-bottom:8px' }, 'Blood alcohol'), h('div', { class: 'row' }, h('span', null, this.bacBig, h('span', { class: 'unit' }, '‰')), this.tierEl), this.bacMeter.el);
    const vital = (ico: string, label: string, unit: string) => {
      const b = h('b', null, '—');
      const small = h('small', null, label);
      const el = h('div', { class: 'vital', title: label }, h('span', { class: 'vh' }, h('span', { html: icon(ico), style: 'display:contents' }), small), h('span', null, b, h('i', null, unit)));
      return [el, b, small] as const;
    };
    [this.vitalT, this.vT] = vital('thermo', 'Temp', '°C');
    [this.vitalH, this.vH, this.vHLabel] = vital('drop', 'Water', '%');
    [this.vitalR, this.vR] = vital('heart', 'Pulse', 'bpm');
    this.xtcKicker = h('div', { class: 'kicker', style: 'margin-bottom:6px' }, 'XTC · risk monitor');
    this.xtcBox = h('div', { class: 'xtc-box' }, this.xtcKicker, h('div', { class: 'vitals' }, this.vitalT, this.vitalH, this.vitalR));
    this.warn = h('span');
    this.warnSub = h('small');
    this.warnBox = h('div', { class: 'warnline' }, h('span', { html: icon('warning'), style: 'display:contents' }), h('span', { class: 'wt' }, this.warn, this.warnSub));
    this.restBtn = h('button', { class: 'btn small', type: 'button', html: `${icon('pause')}<span>Rest &amp; cool down</span>` });
    this.restBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleRest();
    });
    this.aidBtn = h('button', { class: 'btn small danger', type: 'button', html: `${icon('plus')}<span>Find first aid</span>` });
    this.aidBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.goToFirstAid();
    });
    this.actions = h('div', { class: 'st-actions' }, this.restBtn, this.aidBtn);
    this.cmpTag = h('div', { class: 'compare-tag', html: `${icon('split')}<span>Compare · drag the divider</span>` });
    this.status = h('aside', { class: 'status glass strong hud-el', 'aria-live': 'polite', 'aria-label': 'Perception status' }, this.bacBox, this.xtcBox, this.warnBox, this.actions, this.cmpTag);
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
    if (p?.xtcPhase && p.xtcPhase !== 'off') this.xtcReset = true;
    tryCall(p, 'setXtc', false);
    tryCall(p, 'setCompare', false);
    tryCall(p, 'soberUp');
    tryCall(p, 'setResting', false);
    this.aidShown = this.heatShown = false;
    this.ui.app.events.emit('perception:changed', { mode: 'sober' });
    this.ui.toast('Back to sober perception', 1800, 'reset');
  }

  /** jump to a BAC to preview how that level feels (secondary control in the panel) */
  previewBac(v: number): void {
    if (!tryCall(this.p, 'setBac', v)) {
      this.ui.toast('The alcohol simulation is not available yet', 2400, 'info');
      return;
    }
    this.ui.app.events.emit('perception:changed', { mode: v > 0 ? 'alcohol' : 'sober' });
    this.ui.toast(`Previewing ${v.toFixed(1)}‰ — ${tierName(tierFor(v))}`, 2200, 'beer');
  }

  startXtc(): void {
    if (!tryCall(this.p, 'setXtc', true)) {
      this.ui.toast('The XTC simulation is not available yet', 2400, 'info');
      return;
    }
    this.xtcReset = false;
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

  /** rest: stop dancing, the body cools down (the risk model lowers activity) */
  toggleRest(on?: boolean): void {
    const p = this.p;
    const next = on ?? !p?.resting;
    if (!tryCall(p, 'setResting', next)) return;
    this.ui.toast(next ? 'Resting — you stop dancing and cool down. Sip water, find shade.' : 'Back on your feet', 2600, next ? 'pause' : 'play');
    this.acc = 1; // refresh the widget now
  }

  /** walk (teleport) to the first-aid post of the RED stage and sit down there */
  goToFirstAid(): void {
    const ui = this.ui;
    const tent = new THREE.Vector3(FIRST_AID.x, 0, FIRST_AID.z);
    // 8 m in front of the entrance (the tent faces the field, towards (60, 110))
    const dir = new THREE.Vector3(60 - tent.x, 0, 110 - tent.z).normalize();
    const pos = tent.clone().addScaledVector(dir, 8);
    const yaw = Math.atan2(-(tent.x - pos.x), -(tent.z - pos.z));
    ui.layers.closeAll();
    if (ui.photo.open) ui.togglePhoto(false, 'first');
    if (ui.camMode() !== 'first') ui.setCamera('first');
    player(ui.app)?.teleport?.({ id: 'first_aid', label: 'First aid post', position: pos, yaw, pitch: -0.04 });
    tryCall(this.p, 'setResting', true);
    ui.toast('First aid post (EHBO): the team helps without judgement and without consequences. In an emergency call 112.', 6000, 'plus');
  }

  // ---------------------------------------------------------------------------------------
  // panel
  // ---------------------------------------------------------------------------------------
  open(trigger?: HTMLElement | null): void {
    const ui = this.ui;
    const p = this.p;
    const mode = p?.mode ?? 'sober';
    const { el, body } = panelShell(ui, 'Perception', 'How do you experience it?', true);
    el.classList.add('perception');
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
      card('alcohol', 'beer', 'Alcohol', 'Effects per blood-alcohol level', mode === 'alcohol', () => {
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
    const heat = h('p', { class: 'note', html: `${icon('sun')}<span></span>` });
    (heat.lastElementChild as HTMLElement).textContent = 'Heat (26–27 June 2026 was a red heat warning): for everyone — take breaks in the shade, cool down and drink water regularly.';
    const alcoholActive = mode === 'alcohol' || (p?.bac ?? 0) > 0.005;
    // with alcohol active its details (the current state) come first
    if (alcoholActive) body.append(detail, grid, heat, reset);
    else body.append(grid, detail, heat, reset);
    if (alcoholActive) this.alcoholDetail(detail);
    else if (this.compareOn) this.compareDetail(detail);
    ui.layers.open('perception', el, { kind: 'panel', trigger: trigger ?? ui.hud.btn.perception, onClose: () => (this.panelBac = null) });
  }

  private alcoholDetail(host: HTMLElement) {
    const bac = this.p?.bac ?? 0;
    const t = tierFor(bac);
    const big = h('span', { class: 'big', style: 'font:600 30px/1 var(--font-display)' }, bac.toFixed(2));
    const tier = h('span', { class: 'tier', style: 'font:600 11px/1.2 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--red-hot);text-align:right' }, tierName(t));
    const m = meter(true);
    m.fill.style.transform = `scaleX(${Math.min(1, bac / BAC_MAX)})`;
    const fx = h('ul', { class: 'fx' });
    for (const e of t.effects) fx.appendChild(h('li', null, e));
    if (!t.effects.length) fx.appendChild(h('li', null, 'No alcohol in your blood: clear senses. Order a drink at a bar to see how each level changes perception.'));
    // tier preview: a secondary selector, not a "drink more" button
    const preview = h('div', { class: 'seg-pick', role: 'group', 'aria-label': 'Preview a blood-alcohol level' });
    for (const v of [0.5, 0.8, 1.2, 1.6, 2.0]) {
      const b = h('button', { type: 'button', class: Math.abs(bac - v) < 0.05 ? 'on' : '' }, `${v.toFixed(1)}‰`);
      b.addEventListener('click', () => {
        this.previewBac(v);
        preview.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      });
      preview.appendChild(b);
    }
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
        h('div', { class: 'list-h' }, 'Preview a level'),
        preview,
        h('p', { class: 'note', html: `${icon('cup')}<span>At the bars every drink raises your blood alcohol. The same drinks give a much higher level for lighter people, women, young people and on an empty stomach.</span>` }),
        TIME_NOTE ? h('p', { class: 'note', html: `${icon('info')}<span></span>` }) : null,
        h('div', { class: 'actions' }, bar),
      ),
    );
    if (TIME_NOTE) {
      const spans = host.querySelectorAll('.note span');
      spans[spans.length - 1].textContent = TIME_NOTE;
    }
    this.panelBac = { big, tier, fill: m.fill, fx, tierLabel: t.label };
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
        (this.p?.mode ?? 'sober') === 'sober' ? h('p', { class: 'note', html: `${icon('info')}<span>You are sober right now, so the right half shows the 1.0‰ preview. Order a drink or start the XTC simulation to compare your own state.</span>` }) : null,
      ),
    );
  }

  openXtcInfo(): void {
    const ui = this.ui;
    const col = (title: string, items: unknown[]) => {
      if (!items.length) return null;
      const ul = h('ul', { class: 'fx' });
      for (const it of items) ul.appendChild(h('li', null, asText(it)));
      return h('div', null, h('h5', null, title), ul);
    };
    // hydration advice belongs to general heat safety (for everyone), not to the XTC card
    const help = list(XTC.help)
      .map(asText)
      .filter((t) => t && !/litre per hour|glass per hour/i.test(t) && !/^Questions\?/i.test(t));
    const links = h('ul', { class: 'fx links' });
    for (const l of [LINKS[0], LINKS[1], LINKS[2], LINKS[3]]) links.appendChild(h('li', null, h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.label)));
    links.appendChild(h('li', null, 'Drugs Infolijn (Trimbos): 0900-1995'));
    const sources = h('ul', { class: 'fx links' });
    for (const s of list(XTC.sources)) {
      const text = asText(s);
      const l = linkFor(text);
      sources.appendChild(h('li', null, l ? h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, text) : text));
    }
    const check = h('input', { type: 'checkbox', id: 'xtc-ok' });
    const start = h('button', { class: 'btn primary', type: 'button', disabled: true, html: `${icon('check')}<span>I understand — start simulation</span>` });
    check.addEventListener('change', () => (start.disabled = !check.checked));
    start.addEventListener('click', () => {
      ui.layers.close('xtc');
      this.startXtc();
    });
    const cancel = h('button', { class: 'btn ghost', type: 'button' }, 'Cancel');
    cancel.addEventListener('click', () => ui.layers.close('xtc'));
    const disclaimer = String(XTC.disclaimer ?? 'This is an educational simulation. It does not encourage drug use.').replace(/It is not realistic, not an endorsement/, 'It is a simplified approximation, not an endorsement');
    const card = h(
      'div',
      { class: 'card wide glass strong rule-top', 'aria-label': 'XTC simulation information' },
      h('div', { class: 'kicker' }, 'Educational simulation'),
      h('h3', null, String(XTC.title ?? 'XTC (MDMA) — perception simulation')),
      h('div', { class: 'disclaimer-box', html: `${icon('warning')}<span></span>` }),
      h('p', { class: 'small', style: 'margin:12px 0 0' }, h('b', null, 'Q-dance has a zero-tolerance drug policy.'), ' Drugs are not allowed at its events, and they are never obtainable in this experience. The First Aid team is your friend: no judgement, no consequences.'),
      h('div', { class: 'info-cols', style: 'margin-top:16px' }, col('How it can change perception', list(XTC.effects)), col('Risks', list(XTC.risks)), col('Help on site', help), h('div', null, h('h5', null, 'Information & support'), links)),
      h('div', { class: 'list-h' }, 'Sources'),
      sources,
      h('label', { class: 'check-row', for: 'xtc-ok' }, check, h('span', null, 'I have read this. This simulation does not encourage drug use.')),
      h('div', { class: 'actions' }, start, cancel),
    );
    (card.querySelector('.disclaimer-box span') as HTMLElement).textContent = disclaimer;
    ui.layers.open('xtc', card, { kind: 'modal' });
  }

  /** after the XTC timeline: the days after ("dinsdagdip"), mixing, help and information */
  private openEpilogue(): void {
    const ui = this.ui;
    const ok = h('button', { class: 'btn primary', type: 'button', autofocus: true, html: `${icon('check')}<span>Close</span>` });
    ok.addEventListener('click', () => ui.layers.close('xtc-after'));
    const links = h('ul', { class: 'fx links' });
    for (const l of [LINKS[0], LINKS[1], LINKS[2], LINKS[3]]) links.appendChild(h('li', null, h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.label)));
    links.appendChild(h('li', null, 'Drugs Infolijn (Trimbos): 0900-1995'));
    const card = h(
      'div',
      { class: 'card wide glass strong rule-top', 'aria-label': 'After the simulation' },
      h('div', { class: 'kicker' }, 'XTC simulation · the days after'),
      h('h3', null, 'The comedown does not end at the festival'),
      h('p', null, 'After MDMA many people feel drained for up to about three days: tired, low, irritable, unable to concentrate — the “dinsdagdip” (Tuesday dip). Sleep, food and rest help; the dip passes.'),
      h(
        'div',
        { class: 'info-cols' },
        h('div', null, h('h5', null, 'Mixing and repeated use'), h('ul', { class: 'fx' }, h('li', null, 'Mixing with alcohol or other drugs raises every risk: overheating, dehydration, heart strain.'), h('li', null, 'Repeated use makes the dips deeper and can damage memory and mood.'), h('li', null, 'Not using is the only way to avoid the risks.'))),
        h('div', null, h('h5', null, 'Information & support'), links),
      ),
      h('p', { class: 'small muted', style: 'margin-top:12px' }, 'Q-dance has a zero-tolerance drug policy. At a festival the First Aid team helps without judgement and without consequences; in an emergency call 112.'),
      h('div', { class: 'actions' }, ok),
    );
    ui.layers.open('xtc-after', card, { kind: 'modal' });
  }

  /** ≥ 2.0‰ or overheating: the body forces a stop (bible §12.2 / §12.3 outcome) */
  private openOutcome(kind: 'alcohol' | 'heat'): void {
    const ui = this.ui;
    if (ui.layers.isOpen('outcome')) return;
    const aid = h('button', { class: 'btn primary', type: 'button', autofocus: true, html: `${icon('plus')}<span>Go to the first aid post</span>` });
    aid.addEventListener('click', () => this.goToFirstAid());
    const rest = h('button', { class: 'btn ghost', type: 'button', html: `${icon('pause')}<span>Sit down and rest</span>` });
    rest.addEventListener('click', () => {
      ui.layers.close('outcome');
      this.toggleRest(true);
    });
    const alcohol = kind === 'alcohol';
    const card = h(
      'div',
      { class: 'card glass strong rule-top outcome', 'aria-label': alcohol ? 'You need help' : 'You are overheating' },
      h('div', { class: 'kicker' }, alcohol ? 'Blood alcohol 2.0‰ and higher' : 'Body temperature ≥ 39.5 °C'),
      h('h3', null, alcohol ? 'You need to sit down' : 'You are overheating'),
      h(
        'p',
        null,
        alcohol
          ? 'You can hardly stand, your memory drops out and you may vomit. From about 3‰ people can lose consciousness and stop breathing properly — alcohol poisoning. Never leave a very drunk friend alone; if someone cannot be woken, call 112.'
          : 'Headache, confusion, hot dry skin and fainting are signs of heat stroke — an emergency. Stop dancing, get into the shade, cool down and go to the first aid post. Call 112 if someone is confused or collapses.',
      ),
      h('p', { class: 'small muted' }, 'The First Aid team is your friend: no judgement, no consequences.'),
      h('div', { class: 'actions' }, aid, rest),
    );
    ui.layers.open('outcome', card, { kind: 'modal' });
  }

  // ---------------------------------------------------------------------------------------
  // per-frame (throttled to 4 Hz)
  // ---------------------------------------------------------------------------------------
  update(dt: number): void {
    this.acc += dt;
    if (this.acc < 0.25) return;
    this.acc = 0;
    const p = this.p;
    // rounded like the display, so "2.00‰" and the danger state always agree
    const bac = Math.round((p?.bac ?? 0) * 100) / 100;
    const stomach = p?.stomach ?? 0;
    const cmp = !!p?.compare;
    const phase = p?.xtcPhase ?? ((p?.xtc ?? 0) > 0.001 ? 'plateau' : 'off');
    const risk = p?.risk;
    const temp = risk?.bodyTemp;
    const hr = risk?.heartRate;

    // XTC timeline ended by itself -> epilogue card; the monitor stays while the body cools down
    if (phase === 'off' && this.lastPhase !== 'off') {
      if (!this.xtcReset && this.ui.entered) this.openEpilogue();
      this.recoverLeft = this.xtcReset ? 0 : 150;
    }
    if (phase !== 'off') this.xtcReset = false;
    this.lastPhase = phase;
    this.recoverLeft = Math.max(0, this.recoverLeft - 0.25);

    const alcohol = bac > 0.005 || stomach > 0.05;
    // the monitor stays through comedown / after, and until the body has cooled down
    const recovering = typeof temp === 'number' && temp >= 37.3 && this.recoverLeft > 0;
    const showX = phase !== 'off' || recovering;
    const show = alcohol || showX || cmp;
    toggleClass(this.status, 'show', show);
    toggleClass(this.divider, 'show', cmp);
    const mode = p?.mode ?? (phase !== 'off' ? 'xtc' : alcohol ? 'alcohol' : 'sober');
    this.ui.hud.setBadge('perception', mode !== 'sober' || cmp);
    toggleClass(this.ui.root, 'has-status', show);

    // outcomes: once per episode, re-armed when the value falls back
    if (bac >= 2.0 && !this.aidShown && this.ui.entered) {
      this.aidShown = true;
      this.openOutcome('alcohol');
    } else if (bac < 1.6) this.aidShown = false;
    if (typeof temp === 'number') {
      if (temp >= 39.5 && !this.heatShown && this.ui.entered) {
        this.heatShown = true;
        this.openOutcome('heat');
      } else if (temp < 38.8) this.heatShown = false;
    }

    if (!show) {
      if (this.xtcBox.dataset.on === '1') this.clearVitals();
      return;
    }
    // alcohol
    this.bacBox.style.display = alcohol ? '' : 'none';
    if (alcohol) {
      setText(this.bacBig, bac.toFixed(2));
      setText(this.tierEl, tierName(tierFor(bac)));
      this.bacMeter.fill.style.transform = `scaleX(${Math.min(1, bac / BAC_MAX).toFixed(3)})`;
    }
    // xtc / body monitor
    this.xtcBox.style.display = showX ? '' : 'none';
    if (showX) {
      this.xtcBox.dataset.on = '1';
      const PH: Record<string, string> = { onset: 'onset', plateau: 'peak', comedown: 'comedown', after: 'after', off: 'recovering' };
      setText(this.xtcKicker, `XTC · risk monitor · ${PH[phase] ?? phase}`);
      const hyd = risk?.hydration;
      const over = typeof hyd === 'number' && hyd > 1.02;
      const hydPct = typeof hyd === 'number' ? Math.round(Math.min(1, hyd) * 100) : null;
      setText(this.vT, typeof temp === 'number' ? temp.toFixed(1) : '—');
      setText(this.vH, hydPct === null ? '—' : over ? '100+' : String(hydPct));
      setText(this.vHLabel, over ? 'Too much' : 'Water');
      setText(this.vR, typeof hr === 'number' ? `${Math.round(hr)}` : '—');
      toggleClass(this.vitalT, 'hot', typeof temp === 'number' && temp >= 38.5);
      toggleClass(this.vitalT, 'warn', typeof temp === 'number' && temp >= 37.8 && temp < 38.5);
      toggleClass(this.vitalH, 'hot', hydPct !== null && !over && hydPct < 55);
      toggleClass(this.vitalH, 'warn', over || (hydPct !== null && hydPct >= 55 && hydPct < 75));
      this.vitalH.title = over ? 'Over-hydrated: with MDMA the body retains water (hyponatraemia risk)' : 'Water';
      toggleClass(this.vitalR, 'hot', typeof hr === 'number' && hr >= 140);
      toggleClass(this.vitalR, 'warn', typeof hr === 'number' && hr >= 110 && hr < 140);
    } else if (this.xtcBox.dataset.on === '1') this.clearVitals();

    // warnings (alcohol and XTC): the most severe one is pinned, the others rotate below it
    const warnings = list(risk?.warnings).map(asText).filter(Boolean);
    const first = warnings[0];
    const danger = !!first && DANGER.has(first);
    const rest = warnings.filter((w) => w !== first && w !== HELP);
    const now = performance.now();
    if (now - this.warnAt > 5000) {
      this.warnAt = now;
      this.warnIdx++;
    }
    const main = first ?? (showX ? 'Keep cool: take breaks in the shade and sip water regularly.' : '');
    const sub = danger ? HELP : rest.length ? rest[this.warnIdx % rest.length] : '';
    this.warnBox.style.display = main ? '' : 'none';
    setText(this.warn, main);
    setText(this.warnSub, sub);
    this.warnSub.style.display = sub ? '' : 'none';
    toggleClass(this.warnBox, 'danger', danger);
    const heatRisk = typeof temp === 'number' && temp >= 38.5;
    toggleClass(this.status, 'danger', danger || bac >= 2.0);

    // actions: rest while the body is under strain, first aid when in danger
    const resting = !!p?.resting;
    const restVisible = showX || heatRisk || resting;
    this.restBtn.style.display = restVisible ? '' : 'none';
    toggleClass(this.restBtn, 'on', resting);
    const restLabel = resting ? 'Resting · stand up' : 'Rest & cool down';
    const rl = this.restBtn.lastElementChild as HTMLElement;
    if (rl.textContent !== restLabel) rl.textContent = restLabel;
    this.aidBtn.style.display = danger || bac >= 2.0 || heatRisk ? '' : 'none';
    this.actions.style.display = restVisible || danger || bac >= 2.0 || heatRisk ? '' : 'none';

    this.cmpTag.style.display = cmp ? '' : 'none';
    // live values in the open panel
    const pb = this.panelBac;
    if (pb) {
      setText(pb.big, bac.toFixed(2));
      const t = tierFor(bac);
      if (pb.tierLabel !== t.label) {
        pb.tierLabel = t.label;
        pb.tier.textContent = tierName(t);
        pb.fx.innerHTML = '';
        for (const e of t.effects) pb.fx.appendChild(h('li', null, e));
      }
      pb.fill.style.transform = `scaleX(${Math.min(1, bac / BAC_MAX).toFixed(3)})`;
    }
  }

  /** no stale vitals once the monitor is hidden */
  private clearVitals() {
    this.xtcBox.dataset.on = '0';
    setText(this.vT, '—');
    setText(this.vH, '—');
    setText(this.vR, '—');
    setText(this.vHLabel, 'Water');
    for (const v of [this.vitalT, this.vitalH, this.vitalR]) v.classList.remove('hot', 'warn');
  }
}
