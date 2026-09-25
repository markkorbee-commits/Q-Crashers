import type { BarSystem } from '../bar/BarSystem';
import { barById } from '../bar/bars';
import { CATEGORY_LABEL, CATEGORY_ORDER, CUP_DEPOSIT_EUR, DRINKS, eur, TOPUP_EUR, type Drink } from '../bar/drinks';
import { perception } from './contracts';
import { h, setText } from './dom';
import { icon } from './icons';
import { tierFor } from './PerceptionUI';
import type { UI } from './UI';

const VESSEL_ICON: Record<string, string> = { redcup: 'beer', clearcup: 'glass', bottle: 'drop', can: 'bolt', shotglass: 'shot' };

/** Ordering menu shown when the player interacts with a bar ('bar:open'). */
export class BarMenu {
  private coinsEl: HTMLElement | null = null;
  private buyBtns = new Map<string, HTMLButtonElement>();
  private body: HTMLElement | null = null;
  private barId = '';
  private pouring = false;

  constructor(private ui: UI) {}

  private get bar(): BarSystem | undefined {
    return this.ui.app.get<BarSystem>('bar');
  }

  get isOpen(): boolean {
    return this.ui.layers.isOpen('bar');
  }

  open(barId: string): void {
    const bar = this.bar;
    if (!bar) return;
    if (this.isOpen && barId === this.barId) return; // idempotent (E handled twice)
    this.barId = barId;
    this.pouring = false;
    const def = barById(barId);
    const close = h('button', { class: 'icon-btn close-x', type: 'button', 'aria-label': 'Close (Esc)', html: icon('close') });
    close.addEventListener('click', () => this.ui.layers.close('bar'));
    this.body = h('div');
    const card = h(
      'div',
      { class: 'card wide glass strong rule-top bar-menu', 'aria-label': 'Bar menu' },
      close,
      h('div', { class: 'kicker' }, `Bar · ${def?.name ?? 'Festival bar'}`),
      h('h3', null, 'What can we get you?'),
      this.body,
    );
    this.renderMenu();
    this.ui.layers.open('bar', card, {
      kind: 'modal',
      scrimClass: 'light',
      onClose: () => {
        this.coinsEl = null;
        this.body = null;
        this.ui.app.events.emit('bar:close', {});
      },
    });
  }

  private renderMenu() {
    const bar = this.bar!;
    const body = this.body!;
    body.innerHTML = '';
    this.buyBtns.clear();
    this.coinsEl = h('span', null, eur(bar.credit));
    const topUp = h('button', { class: 'btn small', type: 'button', html: `${icon('plus')}<span>Top up ${eur(TOPUP_EUR)}</span>` });
    topUp.addEventListener('click', () => {
      bar.topUp(TOPUP_EUR);
      this.refresh();
      this.ui.toast(`+${eur(TOPUP_EUR)} on your bracelet (simulated top-up — no real payment)`, 2600, 'coin');
    });
    body.appendChild(
      h(
        'div',
        { class: 'wallet' },
        h('span', { class: 'coins' }, h('span', { html: icon('coin'), style: 'display:contents' }), this.coinsEl, h('small', null, 'bracelet')),
        h('span', { class: 'muted small', style: 'flex:1;min-width:160px' }, `Cashless Legendary Bracelet · ${eur(CUP_DEPOSIT_EUR)} cup deposit · prices 2026 estimated`),
        topUp,
      ),
    );
    // one dense grid, grouped by category (a small label on each card keeps the grouping readable)
    const grid = h('div', { class: 'drinks' });
    for (const cat of CATEGORY_ORDER) for (const d of DRINKS) if (d.category === cat) grid.appendChild(this.drinkRow(d));
    body.appendChild(grid);
    // responsible drinking strip
    const bac = perception(this.ui.app)?.bac ?? 0;
    const fill = h('div', { class: 'fill', style: `transform:scaleX(${Math.min(1, bac / 4).toFixed(3)})` });
    body.appendChild(
      h(
        'div',
        { class: 'bac-strip' },
        h('span', { html: `${icon('drop')}` , style: 'display:contents' }),
        h('span', null, `BAC ${bac.toFixed(2)} ‰ · ${tierFor(bac)?.label ?? 'Sober'}`),
        h('div', { class: 'meter' }, fill),
        h('span', null, 'No alcohol under 18 · water is free at every water point'),
      ),
    );
    this.refresh();
  }

  private drinkRow(d: Drink): HTMLElement {
    const meta =
      d.grams > 0
        ? h('small', { class: 'alc' }, `${(d.abv * 100).toFixed(1)} % · ≈ ${d.grams.toFixed(1)} g alcohol`)
        : d.category === 'water'
          ? h('small', { class: 'free' }, 'Also free at water points')
          : h('small', { class: 'free' }, 'Alcohol-free');
    const buy = h('button', { class: 'buy', type: 'button', 'aria-label': `Order ${d.name} for ${d.price ? eur(d.price) : 'free'}` }, d.price ? d.price.toFixed(2) : 'FREE', h('small', null, d.price ? 'EUR' : 'water'));
    buy.addEventListener('click', () => this.order(d));
    this.buyBtns.set(d.id, buy);
    return h(
      'div',
      { class: `drink cat-${d.category}` },
      h('span', { class: 'vi', html: icon(VESSEL_ICON[d.vessel] ?? 'cup') }),
      h('span', null, h('span', { class: 'cat' }, CATEGORY_LABEL[d.category]), h('b', null, d.name), h('small', null, d.desc), meta),
      buy,
    );
  }

  private refresh() {
    const bar = this.bar;
    if (!bar || !this.coinsEl) return;
    setText(this.coinsEl, eur(bar.credit));
    for (const d of DRINKS) {
      const b = this.buyBtns.get(d.id);
      if (b) b.disabled = !bar.canAfford(d);
    }
  }

  private order(d: Drink) {
    const bar = this.bar;
    if (!bar || this.pouring || !this.body) return;
    const r = bar.order(d.id);
    if (!r.ok) {
      this.ui.toast(r.message, 2400, 'coin');
      return;
    }
    this.pouring = true;
    const liquid = d.liquid;
    const cup =
      d.vessel === 'redcup' ? '#d4121f' : d.vessel === 'can' ? '#c9ced6' : d.vessel === 'bottle' ? 'rgba(200,230,255,.35)' : 'rgba(240,245,250,.25)';
    const foam = d.foam ? `<rect x="30" y="34" width="50" height="10" rx="4" fill="#fff6e6" class="liquid" style="animation-delay:.9s;transform-origin:50% 100%"/>` : '';
    this.body.innerHTML = '';
    this.body.appendChild(
      h(
        'div',
        { class: 'pour', role: 'status' },
        h('div', {
          html: `<svg viewBox="0 0 110 140" aria-hidden="true">
            <rect class="stream" x="52" y="0" width="6" height="120" rx="3" fill="${liquid}" opacity=".9"/>
            <defs><clipPath id="cupclip"><path d="M24 36 H86 L78 128 H32 Z"/></clipPath></defs>
            <g clip-path="url(#cupclip)"><rect class="liquid" x="20" y="40" width="70" height="90" fill="${liquid}"/>${foam}</g>
            <path d="M24 36 H86 L78 128 H32 Z" fill="none" stroke="${cup}" stroke-width="4" stroke-linejoin="round"/>
            <path d="M22 36 H88" stroke="${cup}" stroke-width="5" stroke-linecap="round"/>
          </svg>`,
        }),
        h('h3', { style: 'margin-top:10px' }, `Pouring your ${d.name}…`),
        h('p', { class: 'muted' }, this.ui.touch ? 'Then tap the Drink pill to take a sip.' : 'Then press E to drink.'),
      ),
    );
    setTimeout(() => {
      bar.serve(d.id);
      this.pouring = false;
      if (this.isOpen) this.ui.layers.close('bar');
      this.ui.toast(`Enjoy your ${d.name}! ${this.ui.touch ? 'Tap the drink pill' : 'Press E'} to drink.`, 2600, VESSEL_ICON[d.vessel] ?? 'cup');
    }, 1450);
  }
}
