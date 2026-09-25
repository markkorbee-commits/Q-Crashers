import { h } from './dom';
import { emblem, icon } from './icons';
import type { UI } from './UI';

/** controls legend shared by the onboarding card and the help overlay */
export function legend(touch: boolean, full = false): HTMLElement {
  const k = (...keys: string[]) => h('span', { class: 'keys' }, ...keys.map((x) => (x.startsWith('<') ? h('span', { html: x, style: 'display:contents' }) : h('kbd', null, x))));
  const row = (keys: HTMLElement, text: string) => h('div', null, keys, h('span', null, text));
  const el = h('div', { class: 'legend' });
  if (touch) {
    el.append(
      row(k(icon('move')), 'Left thumb: walk (joystick)'),
      row(k(icon('touch')), 'Right thumb: swipe to look around'),
      row(k(icon('person')), 'On-screen buttons: jump, run, interact'),
      row(k(icon('pin')), 'Positions, perception and camera in the top bar'),
      row(k(icon('play')), 'Tap the screen to show the show controls'),
      row(k(icon('cup')), 'Walk to a bar and tap “Order a drink”'),
    );
    if (!full) return el;
  }
  el.append(
    row(k('W', 'A', 'S', 'D'), 'Walk'),
    row(k(icon('mouse')), 'Look around'),
    row(k('Shift'), 'Run'),
    row(k('Space'), 'Jump'),
    row(k('E'), 'Interact · drink'),
    row(k('K'), 'Play / pause the show'),
    row(k('J', 'L'), '−10 s / +10 s'),
    row(k('1', '–', '6'), 'Camera views'),
    row(k('T'), 'Positions'),
    row(k('X'), 'Perception'),
    row(k('O'), 'Photo mode'),
    row(k('H'), 'Hide the interface'),
    row(k('M'), 'Mute'),
    row(k('F'), 'Fullscreen'),
    row(k('?'), 'Help'),
  );
  if (full) el.append(row(k('`'), 'Developer menu'), row(k('Esc'), 'Release the mouse / close menus'));
  else el.append(row(k('`'), 'Developer menu'));
  return el;
}

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
    const card = h(
      'div',
      { class: 'card wide glass strong rule-top', 'aria-label': 'Welcome' },
      h('div', { class: 'kicker' }, 'Welcome to the Holy Grounds'),
      h('p', { class: 'lead', html: 'Explore the grounds.<br>Choose your position.<br><em>Experience the Endshow.</em>' }),
      legend(ui.touch),
      h('div', { class: 'actions' }, start, explore),
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
    { class: 'card wide glass strong rule-top', 'aria-label': 'Help' },
    close,
    h('div', { class: 'kicker' }, 'Help'),
    h('h3', null, 'Controls'),
    legend(ui.touch, true),
    h('div', { class: 'list-h', style: 'margin-top:22px' }, 'About this tribute'),
    h(
      'p',
      { class: 'small' },
      'On 26 June 2026 Defqon.1 was cancelled because of an extreme-heat red warning — the first ever in the Netherlands. The Endshow was still performed on the empty grounds on Saturday evening 27 June, filmed, and released on 2 July 2026. This is a fan-made, real-time reconstruction: a digital memory of a festival weekend that never got to happen.',
    ),
    h('p', { class: 'small muted' }, 'Fan-made tribute. Not affiliated with, endorsed by or connected to Q-dance or Defqon.1. No music or video is bundled: audio comes from your own file, the official YouTube video or a synthesized rehearsal track. Built with Three.js.'),
    h('p', { class: 'small muted' }, 'The alcohol and XTC modes are educational simulations with health information. They never encourage drug use. Feeling unwell at a real festival? Go to the first-aid post or call 112.'),
  );
  ui.layers.open('help', card, { kind: 'modal', trigger });
}

export function openEnded(ui: UI): void {
  if (ui.layers.isOpen('ended')) return;
  const replay = h('button', { class: 'btn primary', type: 'button', autofocus: true, html: `${icon('restart')}<span>Replay the Endshow</span>` });
  const explore = h('button', { class: 'btn ghost', type: 'button', html: `${icon('map')}<span>Explore the grounds</span>` });
  replay.addEventListener('click', () => {
    ui.layers.close('ended');
    ui.app.clock.seek(0);
    void ui.play();
  });
  explore.addEventListener('click', () => ui.layers.close('ended'));
  const card = h(
    'div',
    { class: 'card glass strong rule-top ended', 'aria-label': 'Show ended', style: 'text-align:center' },
    h('div', { html: emblem(), style: 'display:flex;justify-content:center' }),
    h('div', { class: 'kicker', style: 'margin-top:12px' }, 'The Endshow · Defqon.1 2026'),
    h('h3', null, 'Thank you'),
    h('p', null, 'The festival that never was. The Endshow that still happened.'),
    h('p', { class: 'small muted' }, 'Until we meet again on the Holy Grounds.'),
    h('div', { class: 'actions', style: 'justify-content:center' }, replay, explore),
  );
  ui.layers.open('ended', card, { kind: 'modal' });
}
