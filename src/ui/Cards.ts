import type { NamedSpot } from '../core/types';
import { START_CHOICES } from '../player/spots';
import { cameraRig, crowdSys, player } from './contracts';
import { h, store } from './dom';
import { fmtTime } from './format';
import { emblem, icon } from './icons';
import { prefs } from './settings';
import type { UI } from './UI';

/** does the device also have a mouse / trackpad (tablet with keyboard, touch laptop)? */
function hasFinePointer(): boolean {
  try {
    return matchMedia('(any-pointer: fine)').matches;
  } catch {
    return false;
  }
}

type Row = [keys: string[], text: string, cls?: string];

/** keyboard + mouse controls, grouped (help overlay); `short` = the onboarding subset */
const KEY_GROUPS: [title: string, rows: Row[]][] = [
  [
    'Walk',
    [
      [['W', 'A', 'S', 'D'], 'Walk'],
      [['<mouse>'], 'Look around'],
      [['Shift'], 'Run'],
      [['Space'], 'Jump'],
      [['V'], 'First / third person'],
      [['E'], 'Interact · order · drink'],
      [['Esc'], 'Free the mouse for the show controls'],
    ],
  ],
  [
    'Show',
    [
      [['K'], 'Play / pause the show'],
      [['J', 'L'], '−10 s / +10 s'],
      [['←', '→'], 'Timeline focused: −5 s / +5 s'],
      [['PgDn', 'PgUp'], 'Timeline focused: −30 s / +30 s · Home / End'],
      [['M'], 'Mute'],
      [['H'], 'Hide the interface'],
      [['F'], 'Fullscreen'],
    ],
  ],
  [
    'Views & panels',
    [
      [['1', '–', '6'], 'Camera views'],
      [['<wheel>'], 'Third person: zoom · free camera: speed'],
      [['Space', 'C'], 'Free camera: up / down'],
      [['T'], 'Positions'],
      [['G'], 'Crowd: the Tribe or as filmed'],
      [['X'], 'Perception'],
      [['?'], 'Help'],
    ],
  ],
  [
    'Photo mode',
    [
      [['O'], 'Photo mode on / off'],
      [['F'], 'Autofocus'],
      [['Q', 'E'], 'Roll the camera'],
      [['<wheel>'], 'Zoom (field of view)'],
      [['Esc'], 'Free the mouse to adjust the settings'],
    ],
  ],
];

/** onboarding: the essentials, three columns */
const KEY_SHORT: Row[] = [
  [['W', 'A', 'S', 'D'], 'Walk'],
  [['<mouse>'], 'Look around'],
  [['Shift'], 'Run · Space jump'],
  [['E'], 'Interact · drink'],
  [['Esc'], 'Free the mouse'],
  [['K'], 'Play / pause'],
  [['J', 'L'], '−10 s / +10 s'],
  [['1', '–', '6'], 'Camera views'],
  [['T'], 'Positions'],
  [['G'], 'Crowd: Tribe / as filmed'],
  [['X'], 'Perception'],
  [['O'], 'Photo mode'],
  [['H'], 'Hide the interface'],
  [['M'], 'Mute'],
  [['?'], 'All controls'],
];

const TOUCH_ROWS: Row[] = [
  [['<move>'], 'Left thumb: walk — push past the ring to run'],
  [['<touch>'], 'Right thumb: swipe to look around'],
  [['<eye>'], 'Camera views: eye button in the show bar'],
  [['<back10>'], 'Double-tap left / right edge: −10 s / +10 s'],
  [['<person>'], 'Buttons: jump, run, first / third person', 'extra'],
  [['<pin>'], 'Spots, crowd and perception in the top bar', 'extra'],
  [['<play>'], 'Tap the screen to bring back the show bar', 'extra'],
  [['<cup>'], 'Walk up to a bar and tap “Order a drink”', 'extra'],
];

const ICON_KEY: Record<string, string> = { '<mouse>': 'mouse', '<wheel>': 'mouse', '<move>': 'move', '<touch>': 'touch', '<eye>': 'eye', '<back10>': 'back10', '<person>': 'person', '<pin>': 'pin', '<play>': 'play', '<cup>': 'cup' };

function keysEl(keys: string[]): HTMLElement {
  return h(
    'span',
    { class: 'keys' },
    ...keys.map((x) => {
      const ico = ICON_KEY[x];
      if (ico) return h('span', { html: icon(ico), style: 'display:contents', title: x === '<wheel>' ? 'Mouse wheel' : undefined });
      if (x === '–') return h('span', { class: 'to' }, '–');
      return h('kbd', null, x);
    }),
  );
}

function rows(el: HTMLElement, list: Row[]) {
  for (const [keys, text, cls] of list) el.append(h('div', { class: cls ?? null }, keysEl(keys), h('span', null, text)));
}

/** controls legend shared by the onboarding card and the help overlay */
export function legend(touch: boolean, full = false, debug = false): HTMLElement {
  const el = h('div', { class: `legend${full ? ' full' : ''}${touch ? ' touch' : ''}` });
  if (touch) {
    rows(el, TOUCH_ROWS);
    // keyboard shortcuts only where a keyboard / mouse is likely
    if (!full || !hasFinePointer()) return el;
  }
  if (!full) {
    rows(el, KEY_SHORT);
    return el;
  }
  for (const [title, list] of KEY_GROUPS) {
    el.append(h('div', { class: 'legend-h' }, title));
    rows(el, list);
  }
  if (debug) rows(el, [[['`'], 'Developer menu']]);
  return el;
}

/** a labelled switch (safety / comfort block) */
function switchRow(label: string, checked: boolean, onChange: (on: boolean) => void): HTMLElement {
  const input = h('input', { type: 'checkbox', role: 'switch', 'aria-label': label });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'sw' }, h('span', { class: 'sw-l' }, label), h('span', { class: 'switch' }, input, h('i')));
}

/**
 * Photosensitivity + comfort block: the flashing-lights warning with the "Reduce flashing" and
 * "Reduce motion" switches (onboarding, quality panel, help).
 */
export function flashingToggle(ui: UI, compact = false): HTMLElement {
  const flash = switchRow('Reduce flashing', prefs.reduceFlashing, (on) => {
    ui.setReduceFlashing(on);
    ui.toast(on ? 'Reduce flashing on — strobes, blinders and flashes are damped' : 'Reduce flashing off', 2200, 'warning');
  });
  const motion = switchRow('Reduce motion', ui.reduceMotion, (on) => {
    ui.setReduceMotion(on);
    ui.toast(on ? 'Reduce motion on — no head bob, sway, roll or camera shake' : 'Reduce motion off', 2200, 'motion');
  });
  return h(
    'div',
    { class: `safety${compact ? ' compact' : ''}` },
    h('span', { class: 'si', html: icon('warning') }),
    h('span', { class: 'st' }, h('b', null, 'Contains flashing lights and strobe effects.'), h('small', null, 'Reduce flashing damps strobes, blinders and pyro / firework flashes. Reduce motion removes head bob, sway and camera shake.')),
    h('span', { class: 'sw-group' }, flash, motion),
  );
}

/** onboarding chip icons per start choice */
const CHIP_ICON: Record<string, string> = { dj: 'music', front: 'crowd', crowd: 'person', middle: 'pin', foh: 'platform', photo: 'terrace', showcam: 'film' };

/** "Explore the grounds. Choose your position. Experience the Endshow." */
export function openOnboarding(ui: UI): Promise<'start' | 'explore'> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: 'start' | 'explore') => {
      if (done) return;
      done = true;
      ui.layers.close('onboarding', true);
      resolve(v);
    };
    const start = h('button', { class: 'btn primary', type: 'button', autofocus: true, html: `${icon('play')}<span>Start the Endshow</span>` });
    start.addEventListener('click', () => finish('start'));
    const explore = h('button', { class: 'btn ghost', type: 'button', html: `${icon('map')}<span>Explore first</span>` });
    explore.addEventListener('click', () => finish('explore'));
    const t = ui.app.clock?.time ?? 0;
    const app = ui.app;

    // ---- who is on the grounds: the Tribe (as it should have been) or as filmed (empty grounds)
    const crowd = crowdSys(app);
    const seg = h('div', { class: 'crowd-seg', role: 'radiogroup', 'aria-label': 'Who is on the Holy Grounds?' });
    const segOpt = (tribe: boolean, ico: string, title: string, sub: string) => {
      const b = h('button', { class: 'cs-opt', type: 'button', role: 'radio' }, h('span', { class: 'cs-i', html: icon(ico) }), h('span', { class: 'cs-t' }, h('b', null, title), h('small', null, sub)));
      b.addEventListener('click', () => {
        if (!crowd) return;
        if (crowd.populated !== tribe) crowd.setPopulated(tribe);
        store.set('dq26.crowd', tribe ? 'tribe' : 'filmed');
        syncSeg();
      });
      seg.appendChild(b);
      return b;
    };
    const tribeBtn = segOpt(true, 'crowd', 'The Tribe', 'As it should have been: the Warriors on the Holy Grounds');
    const filmedBtn = segOpt(false, 'empty', 'As filmed', 'The empty Holy Grounds, Saturday 27 June 2026');
    const syncSeg = () => {
      const on = crowd?.populated ?? true;
      for (const [b, v] of [
        [tribeBtn, on],
        [filmedBtn, !on],
      ] as const) {
        b.classList.toggle('on', v);
        b.setAttribute('aria-checked', String(v));
      }
    };
    syncSeg();

    // ---- choose your position: teleports right away, so the view behind the card previews it
    const chips = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Choose your position' });
    const blurb = h('p', { class: 'chip-blurb' }, '');
    const here = (s: NamedSpot) => Math.hypot(s.position.x - app.playerPos.x, s.position.z - app.playerPos.z) < 3;
    const pl = player(app);
    const setBlurb = (id: string) => {
      blurb.textContent = START_CHOICES.find((c) => c.id === id)?.blurb ?? '';
    };
    const mark = (btn: HTMLButtonElement) =>
      chips.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('on', b === btn);
        b.setAttribute('aria-checked', String(b === btn));
      });
    const pick = (id: string, btn: HTMLButtonElement) => {
      mark(btn);
      setBlurb(id);
      if (id === 'showcam') {
        pl?.rememberStart?.('showcam');
        cameraRig(app)?.setMode?.('showcam');
        return;
      }
      const s = app.spots.find((x) => x.id === id);
      if (!s) return;
      if (ui.camMode() !== 'first') cameraRig(app)?.setMode?.('first');
      pl?.teleport?.(s);
      ui.arrivalToast(id);
    };
    // a remembered 'Show camera' choice starts in the show camera again
    if (pl?.rememberedStart === 'showcam' && ui.camMode() === 'first') cameraRig(app)?.setMode?.('showcam');
    let chosen = '';
    for (const c of START_CHOICES) {
      const s = app.spots.find((x) => x.id === c.id);
      if (c.id !== 'showcam' && !s) continue;
      const on = c.id === 'showcam' ? ui.camMode() === 'showcam' : ui.camMode() === 'first' && !!s && !chosen && here(s);
      if (on) chosen = c.id;
      const b = h('button', { class: `chip${on ? ' on' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(on), title: c.blurb, html: `${icon(CHIP_ICON[c.id] ?? 'pin')}<span>${c.short}</span>` });
      b.addEventListener('click', () => pick(c.id, b));
      chips.appendChild(b);
    }
    setBlurb(chosen || 'middle');

    const card = h(
      'div',
      { class: 'card wide glass strong rule-top onboarding', 'aria-label': 'Welcome' },
      h('div', { class: 'kicker' }, 'Welcome to the Holy Grounds'),
      h('p', { class: 'lead', html: 'Explore the grounds. <br>Choose your position. <br><em>Experience the Endshow.</em>' }),
      crowd ? h('div', { class: 'list-h', style: 'margin-top:0' }, 'Who is on the Holy Grounds?') : null,
      crowd ? seg : null,
      h('div', { class: 'list-h' }, 'Where do you want to stand?'),
      chips,
      blurb,
      h('div', { class: 'actions' }, start, explore),
      flashingToggle(ui, true),
      legend(ui.touch && ui.root.classList.contains('touch')),
      h('p', { class: 'note', html: `${icon('music')}<span>Audio: ${ui.app.sources.label}${t > 1 ? ` · the show resumes at ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : ''}. Change it any time in the top bar.</span>` }),
    );
    ui.layers.open('onboarding', card, { kind: 'modal', dismissible: true, onClose: () => finish('explore') });
  });
}

export function openHelp(ui: UI, trigger?: HTMLElement | null): void {
  const close = h('button', { class: 'icon-btn close-x', type: 'button', 'aria-label': 'Close (Esc)', html: icon('close') });
  close.addEventListener('click', () => ui.layers.close('help'));
  const card = h(
    'div',
    { class: 'card wide glass strong rule-top help', 'aria-label': 'Help' },
    close,
    h('div', { class: 'kicker' }, 'Help'),
    h('h3', null, 'Controls'),
    legend(ui.touch && ui.root.classList.contains('touch'), true, ui.app.params.has('debug')),
    h('div', { class: 'list-h', style: 'margin-top:22px' }, 'Safety & comfort'),
    flashingToggle(ui),
    h('div', { class: 'list-h', style: 'margin-top:22px' }, 'About this tribute'),
    h(
      'p',
      { class: 'small' },
      'On 26 June 2026 Defqon.1 was cancelled because of an extreme-heat red warning — the first ever in the Netherlands. The Endshow was still performed on the empty grounds on Saturday evening 27 June, filmed, and released on 2 July 2026. This is a fan-made, real-time reconstruction: a digital memory of a festival weekend that never got to happen. Press G to switch between the Tribe as it should have been and the empty grounds as filmed.',
    ),
    h('p', { class: 'small muted' }, 'Fan-made tribute. Not affiliated with, endorsed by or connected to Q-dance or Defqon.1. No music or video is bundled: audio comes from your own file, the official YouTube video or a synthesized rehearsal track. Built with Three.js.'),
    h('p', { class: 'small muted' }, 'The alcohol and XTC modes are educational simulations with health information. They never encourage drug use; Q-dance has a zero-tolerance drug policy. Feeling unwell at a real festival? The First Aid team is your friend — no judgement, no consequences. In an emergency call 112.'),
  );
  ui.layers.open('help', card, { kind: 'modal', trigger: trigger ?? ui.hud.btn.help });
}

/** "Thank you" card over the final frame, with the setlist of the Endshow */
export function openEnded(ui: UI): void {
  if (ui.layers.isOpen('ended')) return;
  const replay = h('button', { class: 'btn primary', type: 'button', autofocus: true, html: `${icon('restart')}<span>Replay the Endshow</span>` });
  const explore = h('button', { class: 'btn ghost', type: 'button', html: `${icon('map')}<span>Explore the grounds</span>` });
  replay.addEventListener('click', () => ui.restart());
  explore.addEventListener('click', () => ui.layers.close('ended'));
  const chapters = ui.app.show.file.chapters ?? [];
  const setlist = chapters.length
    ? h(
        'ol',
        { class: 'setlist' },
        ...chapters.map((c) => h('li', null, h('span', { class: 'sl-t' }, fmtTime(c.t)), h('span', { class: 'sl-a' }, h('b', null, c.artist), h('span', null, c.title)))),
      )
    : null;
  const card = h(
    'div',
    { class: 'card glass strong rule-top ended', 'aria-label': 'Show ended' },
    h('div', { html: emblem(), class: 'ended-mark' }),
    h('div', { class: 'kicker', style: 'margin-top:12px' }, 'The Endshow · Defqon.1 2026'),
    h('h3', null, 'Thank you'),
    h('p', null, 'The festival that never was. The Endshow that still happened.'),
    setlist ? h('div', { class: 'list-h' }, 'Setlist') : null,
    setlist,
    h('p', { class: 'small muted', style: 'margin-top:14px' }, 'Until we meet again on the Holy Grounds.'),
    h('div', { class: 'actions', style: 'justify-content:center' }, replay, explore),
  );
  ui.layers.open('ended', card, { kind: 'modal', scrimClass: 'light ended-scrim' });
}
