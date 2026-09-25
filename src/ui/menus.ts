import { QUALITY_PRESETS } from '../core/Quality';
import type { QualityLevel } from '../core/types';
import { CAMERA_MODES, cameraRig, player } from './contracts';
import { h, store } from './dom';
import { fmtDistance, fmtTime } from './format';
import { icon } from './icons';
import { clusterSpots, miniMapSvg, updateMiniMapPlayer, X0, X1, Z0, Z1 } from './MiniMap';
import { prefs, savePref } from './settings';
import { flashingToggle } from './Cards';
import { IS_ARTIFACT } from '../core/target';
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
  // touch: bigger markers (≥ 30 px hit areas) and a name callout before teleporting
  const big = ui.touch;
  const clusters = clusterSpots(spots, big ? 17 : 14);
  const map = h('div', { class: 'map-wrap', html: miniMapSvg(app, spots, clusters, big) });
  const svg = map.querySelector('svg') as SVGSVGElement;
  const yaw = () => player(app)?.yaw ?? 0;
  updateMiniMapPlayer(svg, app, yaw());
  const go = (i: number) => {
    const s = spots[i];
    if (!s) return;
    ui.layers.close();
    ui.teleport(s);
  };
  const dist = (i: number) => Math.hypot(spots[i].position.x - app.playerPos.x, spots[i].position.z - app.playerPos.z);
  const list = h('div', { class: 'list' });
  const rows: HTMLButtonElement[] = [];
  const view = spots.map((s, i) => ({ s, i })).filter((x) => !x.s.id.startsWith('bar_'));
  const bars = spots.map((s, i) => ({ s, i })).filter((x) => x.s.id.startsWith('bar_'));
  const markerOf = (i: number) => svg.querySelector(`[data-cluster="${clusters.findIndex((c) => c.idx.includes(i))}"]`);
  const addRows = (arr: { s: (typeof spots)[number]; i: number }[], heading: string) => {
    if (!arr.length) return;
    list.appendChild(h('div', { class: 'list-h', style: list.childElementCount ? '' : 'margin-top:0' }, heading));
    for (const { s, i } of arr) {
      const d = dist(i);
      const coords = `x ${s.position.x.toFixed(0)} · z ${s.position.z.toFixed(0)}`;
      const r = rowBtn(h('span', { class: 'n' }, String(i + 1)), s.label, coords, d < 3 ? 'here' : fmtDistance(d), () => go(i));
      r.addEventListener('pointerenter', () => markerOf(i)?.classList.add('hl'));
      r.addEventListener('pointerleave', () => markerOf(i)?.classList.remove('hl'));
      rows[i] = r;
      list.appendChild(r);
    }
  };
  addRows(view, 'Viewing spots');
  addRows(bars, 'Bars');
  if (!spots.length) list.appendChild(h('p', { class: 'muted small' }, 'No positions registered yet.'));

  // callout over the map: the names behind a marker, each with a Go button
  const callout = h('div', { class: 'map-callout glass strong', role: 'dialog', 'aria-label': 'Spots at this marker' });
  map.appendChild(callout);
  let openCluster = -1;
  const hideCallout = () => {
    callout.classList.remove('show');
    svg.querySelector('.spot.sel')?.classList.remove('sel');
    openCluster = -1;
  };
  const showCallout = (ci: number) => {
    const c = clusters[ci];
    hideCallout();
    openCluster = ci;
    svg.querySelector(`[data-cluster="${ci}"]`)?.classList.add('sel');
    callout.innerHTML = '';
    for (const i of c.idx) {
      const b = h('button', { class: 'co-row', type: 'button' }, h('span', { class: 'n' }, String(i + 1)), h('span', { class: 'co-t' }, h('b', null, spots[i].label), h('small', null, dist(i) < 3 ? 'you are here' : fmtDistance(dist(i)))), h('span', { class: 'go', html: `Go${icon('play')}` }));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        go(i);
      });
      callout.appendChild(b);
    }
    // marker position in the wrapper (the SVG letterboxes its view box)
    const wr = map.getBoundingClientRect();
    const m = svg.getScreenCTM();
    let px = ((c.x - X0) / (X1 - X0)) * wr.width,
      pz = ((c.z - Z0) / (Z1 - Z0)) * wr.height;
    if (m) {
      const p = new DOMPoint(c.x, c.z).matrixTransform(m);
      px = p.x - wr.left;
      pz = p.y - wr.top;
    }
    const half = Math.min(120, wr.width / 2 - 4);
    callout.style.left = `${Math.min(wr.width - half, Math.max(half, px)).toFixed(0)}px`;
    callout.style.top = `${pz.toFixed(0)}px`;
    callout.classList.toggle('below', pz < wr.height * 0.45);
    callout.classList.add('show');
  };
  svg.querySelectorAll<SVGGElement>('.spot').forEach((g) => {
    const ci = Number(g.dataset.cluster);
    const idx = clusters[ci].idx;
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      // mouse on a single spot: teleport at once; touch or overlapping spots: name first
      if (idx.length === 1 && !big) go(idx[0]);
      else if (openCluster === ci) hideCallout();
      else showCallout(ci);
    });
    g.addEventListener('pointerenter', () => idx.forEach((i) => rows[i]?.classList.add('hl')));
    g.addEventListener('pointerleave', () => idx.forEach((i) => rows[i]?.classList.remove('hl')));
  });
  svg.addEventListener('click', hideCallout);
  body.append(
    h('div', { class: 'pos-wrap' }, map, h('div', { class: 'pos-list' }, list)),
    h('p', { class: 'note pos-note', html: `${icon('info')}<span>Teleporting switches to first-person view. ${big ? 'Tap a marker to see its name, then Go' : 'Click a number on the map'} — or pick a spot from the list.</span>` }),
  );
  el.classList.add('xwide', 'positions');
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
  body.append(
    list,
    h('p', { class: 'note', html: `${icon('info')}<span>GPU: ${escapeHtml(app.device.gpu)}. Auto lowers the internal resolution first, then the preset, based on measured frame times.</span>` }),
    h('div', { class: 'list-h' }, 'Safety'),
    flashingToggle(ui),
    h('div', { class: 'list-h' }, 'Controls'),
    controlsSection(ui),
  );
  ui.layers.open('quality', el, { kind: 'panel', trigger: trigger ?? ui.hud.btn.quality });
}

/** look sensitivity, invert Y, field of view, touch look speed (saved on this device) */
function controlsSection(ui: UI): HTMLElement {
  const wrap = h('div', { class: 'controls' });
  const slider = (label: string, min: number, max: number, step: number, value: number, fmt: (v: number) => string, on: (v: number) => void) => {
    const input = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value), 'aria-label': label }) as HTMLInputElement;
    const val = h('span', { class: 'meta' }, fmt(value));
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      val.textContent = fmt(v);
      ui.hud.paintRange(input);
      on(v);
    });
    ui.hud.paintRange(input);
    wrap.appendChild(h('div', { class: 'ctl-row' }, h('span', { class: 'ctl-l' }, label), input, val));
  };
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  if (!ui.touch || matchMedia('(any-pointer: fine)').matches) slider('Mouse look', 0.3, 2.5, 0.05, prefs.lookSensitivity, pct, (v) => savePref('lookSensitivity', v));
  if (ui.touch) slider('Touch look', 0.4, 2.5, 0.05, prefs.touchLook, pct, (v) => savePref('touchLook', v));
  const rig = cameraRig(ui.app);
  const fov0 = prefs.fov >= 50 ? prefs.fov : (rig?.fovSetting ?? 72);
  slider('Field of view', 60, 100, 1, fov0, (v) => `${Math.round(v)}°`, (v) => {
    savePref('fov', v);
    rig?.setBaseFov?.(v);
  });
  const inv = h('input', { type: 'checkbox', role: 'switch', 'aria-label': 'Invert vertical look' }) as HTMLInputElement;
  inv.checked = prefs.invertY;
  inv.addEventListener('change', () => savePref('invertY', inv.checked));
  wrap.appendChild(h('label', { class: 'ctl-row toggle' }, h('span', { class: 'ctl-l' }, 'Invert vertical look'), h('span', { class: 'switch' }, inv, h('i'))));
  return wrap;
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
      rowBtn(m.icon, m.label, ui.touch ? m.hint.replace(/ \(Space \/ C for up and down\)/, '') : m.hint, ui.touch ? '' : m.key, () => {
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
    // the published artifact cannot embed YouTube (sandboxed page)
    IS_ARTIFACT ? '' : rowBtn('broadcast', 'Official video (YouTube)', 'Synced picture-in-picture · accuracy reference', kind === 'youtube' ? 'active' : '', act('youtube'), kind === 'youtube'),
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

// ------------------------------------------------------------------------------------------
// Crowd (G): the Tribe as it should have been, or the empty grounds as filmed
// ------------------------------------------------------------------------------------------
interface CrowdLike {
  populated: boolean;
  count: number;
  targetCount: number;
  maxCount: number;
  setPopulated(on: boolean): void;
  setCount(n: number): void;
}

export function openCrowd(ui: UI, trigger?: HTMLElement | null): void {
  const app = ui.app;
  const crowd = app.get('crowd') as unknown as CrowdLike | undefined;
  const { el, body } = panelShell(ui, 'Crowd', 'Who is on the Holy Grounds?');
  if (!crowd) {
    body.appendChild(h('p', { class: 'muted small' }, 'The crowd is not available.'));
    ui.layers.open('crowd', el, { kind: 'panel', trigger: trigger ?? null });
    return;
  }
  const list = h('div', { class: 'list' });
  const pick = (on: boolean) => {
    crowd.setPopulated(on);
    store.set('dq26.crowd', on ? 'tribe' : 'filmed');
    ui.toast(on ? 'The Tribe is here' : 'As filmed on 27 June 2026: the empty Holy Grounds', 2600, 'crowd');
    ui.layers.close();
  };
  list.appendChild(rowBtn('crowd', 'The Tribe', 'As it should have been: the Warriors on the Holy Grounds', `${Math.round(crowd.count / 1000)}k`, () => pick(true), crowd.populated));
  list.appendChild(rowBtn('eye', 'As filmed', 'The empty grounds: only crew and performers, as in the 2026 Endshow video', '0', () => pick(false), !crowd.populated));
  const max = crowd.maxCount;
  const slider = h('input', { id: 'crowd-size', type: 'range', min: '5000', max: String(max), step: '1000', value: String(Math.min(max, crowd.targetCount || max)), 'aria-label': 'Crowd size' }) as HTMLInputElement;
  const val = h('span', { class: 'meta' }, `${Math.round(Number(slider.value) / 1000)}k`);
  slider.addEventListener('input', () => {
    val.textContent = `${Math.round(Number(slider.value) / 1000)}k`;
    ui.hud.paintRange(slider);
  });
  slider.addEventListener('change', () => {
    crowd.setCount(Number(slider.value));
    if (!crowd.populated) crowd.setPopulated(true);
    store.set('dq26.crowdCount', slider.value);
  });
  body.append(
    list,
    h('div', { class: 'list-h' }, 'Crowd size'),
    h('div', { style: 'display:flex;gap:12px;align-items:center' }, slider, val),
    h('p', { class: 'note', html: `${icon('info')}<span>Saturday 27 June 2026 would have held about 45,000 people at RED (reduced by the heat plan). Larger crowds need a stronger GPU; this device allows up to ${Math.round(max / 1000)}k.</span>` }),
  );
  ui.hud.paintRange(slider);
  ui.layers.open('crowd', el, { kind: 'panel', trigger: trigger ?? null });
}
