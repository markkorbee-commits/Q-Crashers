import type { App } from '../core/App';
import { CAMERA_MODES, type CamMode } from './contracts';
import { h, setText, toggleClass } from './dom';
import { fmtTime } from './format';
import { emblem, icon } from './icons';
import { Timeline } from './Timeline';

export interface HudActions {
  togglePlay(): void;
  restart(): void;
  skip(dt: number): void;
  toggleMute(): void;
  setVolume(v: number): void;
  setCamera(m: CamMode): void;
  openMoments(trigger: HTMLElement): void;
  openPositions(trigger: HTMLElement): void;
  openPerception(trigger: HTMLElement): void;
  openQuality(trigger: HTMLElement): void;
  openAudio(trigger: HTMLElement): void;
  openCamera(trigger: HTMLElement): void;
  togglePhoto(): void;
  toggleCinema(): void;
  toggleFullscreen(): void;
  openHelp(trigger: HTMLElement): void;
  promptTap(): void;
  promptDiscard(): void;
  poke(): void;
}

/** Heads-up display: brand, toolbar (top), show bar (bottom), interaction prompt, resume hint. */
export class Hud {
  readonly brand: HTMLElement;
  readonly toolbar: HTMLElement;
  readonly showbar: HTMLElement;
  readonly prompt: HTMLElement;
  readonly resume: HTMLElement;
  readonly timeline: Timeline;
  readonly btn: Record<string, HTMLButtonElement> = {};
  private playBtn: HTMLButtonElement;
  private timeCur: HTMLElement;
  private timeDur: HTMLElement;
  private trackEl: HTMLElement;
  private srcChip: HTMLButtonElement;
  private srcLabel: HTMLElement;
  private volBtn: HTMLButtonElement;
  private vol: HTMLInputElement;
  private seg: HTMLElement;
  private segBtns = new Map<string, HTMLButtonElement>();
  private camBtn: HTMLButtonElement;
  private promptKey: HTMLElement;
  private promptText: HTMLElement;
  private promptSub: HTMLElement;
  private promptX: HTMLButtonElement;
  private resumeText: HTMLElement;
  private lastSec = -1;
  private lastPlaying: boolean | null = null;
  private lastChapter: unknown = undefined;
  private lastPrompt = '';
  hovering = false;

  constructor(private app: App, parent: HTMLElement, private a: HudActions, touch: boolean) {
    // ---- brand (top-left)
    this.brand = h(
      'div',
      { class: 'brand glass hud-el', 'aria-hidden': 'true' },
      h('div', { html: emblem(), style: 'display:contents' }),
      h('div', { class: 'txt' }, h('div', { class: 't1' }, 'DEFQON.1 2026'), h('div', { class: 't2' }, 'The Endshow')),
    );

    // ---- toolbar (top-right)
    const tb = (id: string, ico: string, tip: string, fn: (el: HTMLButtonElement) => void, extra = '') => {
      const b = h('button', { class: `icon-btn ${extra}`, type: 'button', 'aria-label': tip, 'data-tip': tip, 'data-tip-pos': id === 'help' ? 'left' : undefined, html: icon(ico) });
      b.addEventListener('click', (e) => {
        fn(b);
        if ((e as PointerEvent).detail > 0) b.blur();
      });
      this.btn[id] = b;
      return b;
    };
    this.srcLabel = h('span', { class: 'lbl' }, 'Silent');
    this.srcChip = h('button', { class: 'src-chip', type: 'button', 'aria-label': 'Audio source', 'data-tip': 'Audio source' }, h('span', { class: 'dot' }), h('span', { html: icon('music'), style: 'display:contents' }), this.srcLabel);
    this.srcChip.addEventListener('click', () => a.openAudio(this.srcChip));
    const fsOk = !!document.documentElement.requestFullscreen;
    this.toolbar = h(
      'nav',
      { class: 'toolbar glass hud-el', 'aria-label': 'Experience controls', 'data-keep-panel': '' },
      this.srcChip,
      h('span', { class: 'sep' }),
      tb('positions', 'pin', 'Positions (T)', (b) => a.openPositions(b)),
      tb('perception', 'waves', 'Perception (X)', (b) => a.openPerception(b)),
      tb('photo', 'camera', 'Photo mode (O)', () => a.togglePhoto()),
      tb('quality', 'gauge', 'Graphics quality', (b) => a.openQuality(b)),
      tb('cinema', 'cinema', 'Hide interface (H)', () => a.toggleCinema()),
      fsOk ? tb('fullscreen', 'fullscreen', 'Fullscreen (F)', () => a.toggleFullscreen()) : null,
      tb('help', 'help', 'Help (?)', (b) => a.openHelp(b)),
    );

    // ---- show bar (bottom)
    this.timeline = new Timeline(app);
    this.timeline.onInteract = () => a.poke();
    this.trackEl = h('span', { class: 'track' }, '—');
    this.timeCur = h('span', { class: 'cur' }, '00:00');
    this.timeDur = h('span', null, '00:00');
    this.playBtn = h('button', { class: 'icon-btn playbtn', type: 'button', 'aria-label': 'Play (K)', 'data-tip': 'Play / pause (K)', 'data-tip-pos': 'up', html: icon('play') });
    this.playBtn.addEventListener('click', (e) => {
      a.togglePlay();
      if (e.detail > 0) this.playBtn.blur();
    });
    const sb = (id: string, ico: string, tip: string, fn: (el: HTMLButtonElement) => void, cls = '') => {
      const b = h('button', { class: `icon-btn ${cls}`, type: 'button', 'aria-label': tip, 'data-tip': tip, 'data-tip-pos': 'up', html: icon(ico) });
      b.addEventListener('click', (e) => {
        fn(b);
        if (e.detail > 0) b.blur();
      });
      this.btn[id] = b;
      return b;
    };
    this.volBtn = sb('mute', 'volume', 'Mute (M)', () => a.toggleMute());
    this.vol = h('input', { type: 'range', min: '0', max: '1', step: '0.01', value: '0.85', 'aria-label': 'Volume' });
    this.vol.addEventListener('input', () => {
      a.setVolume(parseFloat(this.vol.value));
      this.paintRange(this.vol);
    });
    this.seg = h('div', { class: 'seg hide-narrow', role: 'radiogroup', 'aria-label': 'Camera' });
    for (const m of CAMERA_MODES) {
      const b = h('button', { type: 'button', role: 'radio', 'aria-checked': 'false', 'aria-label': `${m.label} (${m.key})`, 'data-tip': `${m.label} (${m.key})`, 'data-tip-pos': 'up', html: `${icon(m.icon)}<span class="t">${m.short}</span>` });
      b.addEventListener('click', (e) => {
        a.setCamera(m.id);
        if (e.detail > 0) b.blur();
      });
      this.segBtns.set(m.id, b);
      this.seg.appendChild(b);
    }
    this.camBtn = sb('camera', 'eye', 'Camera view', (b) => a.openCamera(b), 'show-narrow');
    this.camBtn.style.display = 'none';
    const moments = h('button', { class: 'icon-btn moments-btn', type: 'button', 'aria-label': 'Moments and tracks', 'data-tip': 'Jump to a moment', 'data-tip-pos': 'up', html: `${icon('flag')}<span class="t">Moments</span>` });
    moments.addEventListener('click', (e) => {
      a.openMoments(moments);
      if (e.detail > 0) moments.blur();
    });
    this.btn.moments = moments;

    this.showbar = h(
      'section',
      { class: 'showbar glass rule-top hud-el', 'aria-label': 'Show controls', 'data-keep-panel': '' },
      h('div', { class: 'sb-top' }, h('div', { class: 'now' }, h('span', { class: 'lbl' }, 'Now playing'), this.trackEl), h('div', { class: 'time' }, this.timeCur, ' / ', this.timeDur)),
      this.timeline.el,
      h(
        'div',
        { class: 'sb-bottom' },
        this.playBtn,
        sb('restart', 'restart', 'Restart', () => a.restart(), 'skip'),
        sb('back', 'back10', '−10 s (J)', () => a.skip(-10)),
        sb('fwd', 'fwd10', '+10 s (L)', () => a.skip(10)),
        h('div', { class: 'grow' }),
        moments,
        h('div', { class: 'vol' }, this.volBtn, this.vol),
        this.seg,
        this.camBtn,
      ),
    );
    this.showbar.addEventListener('pointerenter', () => (this.hovering = true));
    this.showbar.addEventListener('pointerleave', () => (this.hovering = false));

    // ---- interaction prompt
    this.promptKey = h('kbd', null, 'E');
    this.promptText = h('span', null, '');
    this.promptSub = h('span', { class: 'sub' }, '');
    this.promptX = h('button', { class: 'icon-btn x', type: 'button', 'aria-label': 'Put the drink away', html: icon('close') });
    this.promptX.addEventListener('click', (e) => {
      e.stopPropagation();
      a.promptDiscard();
    });
    this.prompt = h('div', { class: 'prompt glass strong hud-el ia', role: 'button', tabindex: '-1' }, this.promptKey, this.promptText, this.promptSub, this.promptX);
    this.prompt.addEventListener('click', () => a.promptTap());
    if (touch) this.promptKey.innerHTML = icon('touch');

    // ---- resume hint
    this.resumeText = h('span', null, 'Click to look around');
    this.resume = h('div', { class: 'resume glass strong' }, h('span', { html: icon('mouse'), style: 'display:contents' }), this.resumeText);

    parent.append(this.brand, this.toolbar, this.showbar, this.prompt, this.resume);
    this.updateNarrow();
    window.addEventListener('resize', () => this.updateNarrow());
    this.paintRange(this.vol);
  }

  /** on very narrow screens the segmented camera control collapses into one button */
  private updateNarrow() {
    const narrow = window.innerWidth <= 480;
    this.camBtn.style.display = narrow ? '' : 'none';
  }

  paintRange(r: HTMLInputElement): void {
    const min = parseFloat(r.min || '0'),
      max = parseFloat(r.max || '1');
    const p = ((parseFloat(r.value) - min) / (max - min)) * 100;
    r.style.setProperty('--p', `${p}%`);
  }

  build(): void {
    this.timeline.build();
    setText(this.timeDur, fmtTime(this.app.show.duration));
  }

  setVolumeUi(v: number, muted: boolean): void {
    this.vol.value = String(v);
    this.paintRange(this.vol);
    this.volBtn.innerHTML = icon(muted || v === 0 ? 'mute' : 'volume');
    this.volBtn.setAttribute('aria-label', muted ? 'Unmute (M)' : 'Mute (M)');
    this.volBtn.setAttribute('data-tip', muted ? 'Unmute (M)' : 'Mute (M)');
  }

  setSource(kind: string, label: string, live: boolean): void {
    const short = kind === 'youtube' ? 'Official broadcast' : kind === 'file' ? (label.startsWith('Your file') ? 'Your audio file' : 'Endshow audio') : kind === 'synth' ? 'Rehearsal track' : 'Silent';
    setText(this.srcLabel, short);
    this.srcChip.setAttribute('aria-label', `Audio source: ${label}`);
    this.srcChip.setAttribute('data-tip', label);
    toggleClass(this.srcChip, 'live', live);
  }

  setCameraMode(mode: string): void {
    for (const [id, b] of this.segBtns) {
      toggleClass(b, 'on', id === mode);
      b.setAttribute('aria-checked', String(id === mode));
    }
    const m = CAMERA_MODES.find((x) => x.id === mode);
    if (m) this.camBtn.innerHTML = icon(m.icon);
    toggleClass(this.btn.photo, 'on', mode === 'photo');
  }

  setToggle(id: string, on: boolean): void {
    const b = this.btn[id];
    if (b) toggleClass(b, 'on', on);
  }

  setBadge(id: string, on: boolean): void {
    const b = this.btn[id];
    if (!b) return;
    const has = !!b.querySelector('.badge');
    if (on && !has) b.appendChild(h('span', { class: 'badge' }));
    else if (!on && has) b.querySelector('.badge')?.remove();
  }

  setFullscreen(on: boolean): void {
    const b = this.btn.fullscreen;
    if (!b) return;
    b.innerHTML = icon(on ? 'unfullscreen' : 'fullscreen');
    b.setAttribute('aria-label', on ? 'Exit fullscreen (F)' : 'Fullscreen (F)');
    b.setAttribute('data-tip', on ? 'Exit fullscreen (F)' : 'Fullscreen (F)');
  }

  /** per-frame refresh; writes to the DOM only on change */
  update(time: number, playing: boolean): void {
    this.timeline.update(time);
    const s = Math.floor(time);
    if (s !== this.lastSec) {
      this.lastSec = s;
      setText(this.timeCur, fmtTime(time));
    }
    if (playing !== this.lastPlaying) {
      this.lastPlaying = playing;
      this.playBtn.innerHTML = icon(playing ? 'pause' : 'play');
      this.playBtn.setAttribute('aria-label', playing ? 'Pause (K)' : 'Play (K)');
    }
    const ch = this.app.show.chapterAt(time);
    if (ch !== this.lastChapter) {
      this.lastChapter = ch;
      this.trackEl.innerHTML = '';
      if (ch) this.trackEl.append(h('b', null, ch.artist), h('i', null, ' — '), ch.title);
      else this.trackEl.textContent = '—';
      this.trackEl.title = ch ? `${ch.artist} — ${ch.title}` : '';
    }
  }

  /** prompt: key label + text (+ optional sub text / discard button) */
  setPrompt(text: string | null, sub = '', discard = false, key = 'E'): void {
    const sig = text === null ? '' : `${key}|${text}|${sub}|${discard}`;
    if (sig === this.lastPrompt) return;
    this.lastPrompt = sig;
    toggleClass(this.prompt, 'show', text !== null);
    if (text === null) return;
    if (this.promptKey.textContent !== key && !this.promptKey.querySelector('svg')) this.promptKey.textContent = key;
    setText(this.promptText, text);
    setText(this.promptSub, sub);
    this.promptSub.style.display = sub ? '' : 'none';
    this.promptX.style.display = discard ? '' : 'none';
  }

  setResume(show: boolean, text: string): void {
    toggleClass(this.resume, 'show', show);
    if (show) setText(this.resumeText, text);
  }

  setAway(away: boolean): void {
    toggleClass(this.showbar, 'away', away);
  }
}
