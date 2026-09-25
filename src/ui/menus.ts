import { QUALITY_PRESETS } from '../core/Quality';
import type { QualityLevel } from '../core/types';
import { CAMERA_MODES, cameraRig, player } from './contracts';
import { h, store } from './dom';
import { fmtDistance, fmtTime } from './format';
import { icon } from './icons';
import { miniMapSvg, updateMiniMapPlayer } from './MiniMap';
import type { UI } from './UI';

/** Build a panel shell (glass popover / bottom sheet on phones). */
export function panelShell(ui: UI, kicker: string, title: string, wide = false): { el: HTMLElement; body: HTMLElement } {
  const close = h('button', { class: 'icon-btn close-x', type: 'button', 'aria-label': 'Close (Esc)', html: icon('close') });
  close.addEventListener('click', () => ui.layers.close());
  const body = h('div');
  const el = h(
    'div',
    { class: `panel glass strong rule-top ${wide ? 'wide' : ''}`, 'aria-label': title },
    h('header', null, h('div', null, h('div', { class: 'kicker' }, kicker), h('h4', null, title)), close),
    body,
  );
  return { el, body };
}

function rowBtn(ico: string | HTMLElement, title: string, sub: string, meta: string, onClick: () => void, on = false): HTMLButtonElement {
  const icoEl = typeof ico === 'string' ? h('span', { html: icon(ico), style: 'display:contents' }) : ico;
  const b = h('button', { class: `row-btn ${on ? 'on' : ''}`, type: 'button' }, icoEl, h('span', null, h('b', null, title), sub ? h('small', null, sub) : null), h('span', { class: 'meta' }, meta));
  b.addEventListener('click', onClick);
  return b;
}

// ------------------------------------------------------------------------------------------
// Positions (T)
// ------------------------------------------------------------------------------------------
export function openPositions(ui: UI, trigger?: HTMLElement | null): void {
  const app = ui.app;
  const { el, body } = panelShell(ui, 'Positions', 'Choose your spot', true);
  const spots = [...app.spots];
  const map = h('div', { html: miniMapSvg(app, spots) });
  const svg = map.querySelector('svg') as SVGSVGElement;
  const yaw = () => player(app)?.yaw ?? 0;
  updateMiniMapPlayer(svg, app, yaw());
  const go = (i: number) => {
    const s = spots[i];
    if (!s) return;
    ui.layers.close();
    ui.teleport(s);
  };
  const list = h('div', { class: 'list' });
  const rows: HTMLButtonElement[] = [];
  const view = spots.map((s, i) => ({ s, i })).filter((x) => !x.s.id.startsWith('bar_'));
  const bars = spots.map((s, i) => ({ s, i })).filter((x) => x.s.id.startsWith('bar_'));
  const addRows = (arr: { s: (typeof spots)[number]; i: number }[], heading: string) => {
    if (!arr.length) return;
    list.appendChild(h('div', { class: 'list-h', style: list.childElementCount ? '' : 'margin-top:0' }, heading));
    for (const { s, i } of arr) {
      const d = Math.hypot(s.position.x - app.playerPos.x, s.position.z - app.playerPos.z);
      const coords = `x ${s.position.x.toFixed(0)} · z ${s.position.z.toFixed(0)}`;
      const r = rowBtn(h('span', { class: 'n' }, String(i + 1)), s.label, coords, d < 3 ? 'here' : fmtDistance(d), () => go(i));
      r.addEventListener('pointerenter', () => svg.querySelector(`[data-spot="${i}"]`)?.classList.add('hl'));
      r.addEventListener('pointerleave', () => svg.querySelector(`[data-spot="${i}"]`)?.classList.remove('hl'));
      rows[i] = r;
      list.appendChild(r);
    }
  };
  addRows(view, 'Viewing spots');
  addRows(bars, 'Bars');
  if (!spots.length) list.appendChild(h('p', { class: 'muted small' }, 'No positions registered yet.'));
  svg.querySelectorAll<SVGGElement>('.spot').forEach((g) => {
    const i = Number(g.dataset.spot);
    g.addEventListener('click', () => go(i));
    g.addEventListener('pointerenter', () => rows[i]?.classList.add('hl'));
    g.addEventListener('pointerleave', () => rows[i]?.classList.remove('hl'));
  });
  body.append(
    h('div', { class: 'pos-wrap' }, map, h('div', { class: 'pos-list' }, list)),
    h('p', { class: 'note', html: `${icon('info')}<span>Teleporting switches to first-person view. Tap a number on the map or pick a spot from the list.</span>` }),
  );
  el.classList.add('xwide');
  ui.layers.open('positions', el, { kind: 'panel', trigger: trigger ?? ui.hud.btn.positions });
}

// ------------------------------------------------------------------------------------------
// Moments & tracks
// ------------------------------------------------------------------------------------------
export function openMoments(ui: UI, trigger?: HTMLElement | null): void {
  const app = ui.app;
  const { el, body } = panelShell(ui, 'Jump to', 'Moments & tracks');
  el.classList.add('at-bottom');
  const t = app.clock?.time ?? 0;
  const seek = (to: number) => {
    app.clock.seek(to);
    ui.toast(`Jumped to ${fmtTime(to)}`, 1600, 'flag');
    ui.layers.close();
  };
  const moments = app.show.file.moments ?? [];
  if (moments.length) {
    body.appendChild(h('div', { class: 'list-h', style: 'margin-top:0' }, 'Moments'));
    const list = h('div', { class: 'list' });
    let cur = -1;
    moments.forEach((m, i) => {
      if (m.t <= t) cur = i;
    });
    moments.forEach((m, i) => list.appendChild(rowBtn('sparkle', m.label, '', fmtTime(m.t), () => seek(m.t), i === cur)));
    body.appendChild(list);
  }
  const chapters = app.show.file.chapters ?? [];
  body.appendChild(h('div', { class: 'list-h', style: moments.length ? '' : 'margin-top:0' }, 'Tracks'));
  const list = h('div', { class: 'list' });
  const cur = app.show.chapterAt(t);
  chapters.forEach((c) => list.appendChild(rowBtn('music', c.title, c.artist, fmtTime(c.t), () => seek(c.t), c === cur)));
  body.appendChild(list);
  if (!moments.length) body.appendChild(h('p', { class: 'note', html: `${icon('info')}<span>Signature moments will appear here as the show timeline is authored.</span>` }));
  ui.layers.open('moments', el, { kind: 'panel', trigger: trigger ?? ui.hud.btn.moments });
}

// ------------------------------------------------------------------------------------------
// Graphics quality
// ------------------------------------------------------------------------------------------
const Q_DESC: Record<QualityLevel, string> = {
  ultra: 'Shadows, full crowd, maximum effects',
  high: 'Rich visuals for strong GPUs',
  medium: 'Balanced for laptops',
  mobile: 'Phones, tablets and older devices',
};

export function openQuality(ui: UI, trigger?: HTMLElement | null): void {
  const app = ui.app;
  const { el, body } = panelShell(ui, 'Graphics', 'Quality');
  const auto = app.governor.enabled;
  const list = h('div', { class: 'list' });
  const pick = (lvl: QualityLevel | 'auto') => {
    if (lvl === 'auto') {
      app.governor.enabled = true;
      store.set('dq26.quality', 'auto');
      ui.toast(`Automatic quality — adapting from ${app.quality.level.toUpperCase()}`, 2600, 'gauge');
    } else {
      app.governor.enabled = false;
      if (app.quality.level !== lvl) app.setQuality(lvl);
      store.set('dq26.quality', lvl);
      ui.toast(`Graphics set to ${lvl.toUpperCase()}`, 2000, 'gauge');
    }
    ui.layers.close();
  };
  list.appendChild(rowBtn('sparkle', 'Auto', `Adapts to your device — now ${app.quality.level.toUpperCase()}`, auto ? 'active' : '', () => pick('auto'), auto));
  for (const lvl of ['ultra', 'high', 'medium', 'mobile'] as QualityLevel[]) {
    const q = QUALITY_PRESETS[lvl];
    const meta = `${Math.round(q.crowdCount / 1000)}k crowd`;
    list.appendChild(rowBtn('gauge', lvl[0].toUpperCase() + lvl.slice(1), Q_DESC[lvl], meta, () => pick(lvl), !auto && app.quality.level === lvl));
  }
  body.append(list, h('p', { class: 'note', html: `${icon('info')}<span>GPU: ${escapeHtml(app.device.gpu)}. Auto lowers the internal resolution first, then the preset, based on measured frame times.</span>` }));
  ui.layers.open('quality', el, { kind: 'panel', trigger: trigger ?? ui.hud.btn.quality });
}

// ------------------------------------------------------------------------------------------
// Camera views (sheet on narrow phones)
// ------------------------------------------------------------------------------------------
export function openCameraSheet(ui: UI, trigger?: HTMLElement | null): void {
  const { el, body } = panelShell(ui, 'Camera', 'Choose a view');
  const mode = cameraRig(ui.app)?.mode ?? 'first';
  const list = h('div', { class: 'list' });
  for (const m of CAMERA_MODES) {
    list.appendChild(
      rowBtn(m.icon, m.label, m.hint, m.key, () => {
        ui.layers.close();
        ui.setCamera(m.id);
      }, m.id === mode),
    );
  }
  body.appendChild(list);
  ui.layers.open('camera', el, { kind: 'panel', trigger });
}

// ------------------------------------------------------------------------------------------
// Audio source menu
// ------------------------------------------------------------------------------------------
export function openAudioMenu(ui: UI, trigger?: HTMLElement | null): void {
  const app = ui.app;
  const { el, body } = panelShell(ui, 'Audio source', 'How you hear the show');
  const kind = app.sources.kind;
  body.appendChild(h('p', { class: 'muted small', style: 'margin:0 0 10px' }, `Now: ${app.sources.label}`));
  const list = h('div', { class: 'list' });
  const act = (k: 'file' | 'youtube' | 'synth' | 'silent') => async () => {
    ui.layers.close();
    if (k === 'file') ui.audio.pickFile();
    else await ui.audio.use(k);
  };
  list.append(
    rowBtn('upload', 'Load the Endshow audio file', 'MP3, M4A, WAV… or drop it anywhere', kind === 'file' ? 'active' : '', act('file'), kind === 'file'),
    rowBtn('broadcast', 'Official video (YouTube)', 'Synced picture-in-picture · accuracy reference', kind === 'youtube' ? 'active' : '', act('youtube'), kind === 'youtube'),
    rowBtn('synth', 'Rehearsal track', 'Synthesized, follows the show tempo', kind === 'synth' ? 'active' : '', act('synth'), kind === 'synth'),
    rowBtn('mute', 'Silent', 'Visual show only', kind === 'silent' ? 'active' : '', act('silent'), kind === 'silent'),
  );
  body.appendChild(list);
  if (kind === 'file') {
    const an = h('button', { class: 'btn small', type: 'button', html: `${icon('synth')}<span>Analyse beats of this file</span>`, style: 'margin-top:12px' });
    an.addEventListener('click', async () => {
      ui.layers.close();
      ui.toast('Analysing the audio to lock effects to the beat…', 2600, 'synth');
      try {
        await app.sources.analyze();
      } catch (e) {
        ui.toast(`Analysis failed: ${(e as Error).message}`, 3500, 'warning');
      }
    });
    body.appendChild(an);
  }
  body.appendChild(h('p', { class: 'note', html: `${icon('info')}<span>No music is bundled with this tribute. Your choice is remembered on this device.</span>` }));
  ui.layers.open('audio', el, { kind: 'panel', trigger: trigger ?? null });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
