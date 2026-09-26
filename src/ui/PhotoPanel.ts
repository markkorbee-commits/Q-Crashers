import * as THREE from 'three';
import { IS_ARTIFACT } from '../core/target';
import { cameraRig, tryCall } from './contracts';
import { downloadBlob, h, setText, store } from './dom';
import { fmtTime } from './format';
import { icon } from './icons';
import type { UI } from './UI';

interface Ctl {
  input: HTMLInputElement;
  value: HTMLElement;
}

/** photo sizes (long edge in px); the capture renders one frame at this size, independent of the screen */
const RES: { id: string; px: number; label: string }[] = [
  { id: 'hd', px: 1920, label: 'HD' },
  { id: 'qhd', px: 2560, label: 'QHD' },
  { id: '4k', px: 3840, label: '4K' },
];

/**
 * Photo mode: hides the HUD, free camera, FOV / focus / aperture / exposure / roll, autofocus and
 * PNG capture. Uses the CameraRig photo API when present, otherwise drives camera + postfx.photo.
 *
 * Captures are rendered at a fixed photo size (HD / QHD / 4K long edge), not at the internal
 * render resolution the governor happens to use: one frame is re-rendered into a larger drawing
 * buffer, read back, and the live resolution is restored in the same task (no visible flash).
 */
export class PhotoPanel {
  readonly el: HTMLElement;
  private frame: HTMLElement;
  private flash: HTMLElement;
  private fov!: Ctl;
  private focus!: Ctl;
  private aperture!: Ctl;
  private exposure!: Ctl;
  private roll!: Ctl;
  open = false;
  /** roll (radians) applied by the UI when the rig has no setRoll */
  fallbackRoll = 0;
  private savedFov = 72;
  private tmpV = new THREE.Vector3();
  private res: number;
  private resBtns: HTMLButtonElement[] = [];
  private helpShown = false;
  /** show time readout + transport (frame the exact moment: pause, step ±1 s) */
  private timeEl: HTMLElement;
  private playBtn: HTMLButtonElement;
  private lastTenth = -1;
  private lastPlaying: boolean | null = null;
  private playChip: HTMLButtonElement | null = null;

  constructor(private ui: UI, parent: HTMLElement) {
    const touch = ui.touch && ui.root.classList.contains('touch');
    const mobile = ui.app.device.mobile;
    const stored = RES.find((r) => r.id === store.get('dq26.photoRes'));
    // phones: HD keeps the one-off render inside mobile GPU memory; desktops default to QHD
    this.res = stored?.px ?? (mobile ? 1920 : 2560);
    // touch: one compact strip at the top (setting chips + the active slider), a big shutter on the
    // right edge, foldable; desktop: the full side panel
    const chips = h('div', { class: 'ph-chips', role: 'tablist', 'aria-label': 'Photo setting' });
    const rows: HTMLElement[] = [];
    const ctl = (label: string, short: string, ico: string, min: number, max: number, step: number, value: number, on: (v: number) => void): Ctl => {
      const input = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value), 'aria-label': label });
      const val = h('span', { class: 'v' });
      input.addEventListener('input', () => {
        on(parseFloat(input.value));
        ui.hud.paintRange(input);
      });
      const row = h('div', { class: `ctl${rows.length === 0 ? ' active' : ''}` }, h('label', null, h('span', { html: `${icon(ico)}${label}` }), val), input);
      const idx = rows.length;
      rows.push(row);
      const chip = h('button', { class: `chip${idx === 0 ? ' on' : ''}`, type: 'button', role: 'tab', html: `${icon(ico)}<span>${short}</span>` });
      chip.addEventListener('click', () => {
        rows.forEach((c, i) => c.classList.toggle('active', i === idx));
        chips.querySelectorAll('.chip[role=tab]').forEach((c, i) => c.classList.toggle('on', i === idx));
      });
      chips.appendChild(chip);
      this.el.appendChild(row);
      return { input, value: val };
    };
    const exit = h('button', { class: 'btn small ghost ph-exit', type: 'button', html: `${icon('close')}<span>Exit</span>` });
    exit.addEventListener('click', () => ui.togglePhoto(false));
    const capture = h('button', { class: 'btn small primary ph-capture', type: 'button', html: `${icon('camera')}<span>Capture</span>` });
    capture.addEventListener('click', () => void this.capture());
    const af = h('button', { class: 'btn small', type: 'button', html: `${icon('focus')}<span>Autofocus</span>` });
    af.addEventListener('click', () => this.autofocus());
    const fold = h('button', { class: 'icon-btn ph-fold', type: 'button', 'aria-label': 'Fold the photo controls', html: icon('minus') });
    fold.addEventListener('click', () => {
      const folded = this.el.classList.toggle('folded');
      fold.innerHTML = icon(folded ? 'plus' : 'minus');
      fold.setAttribute('aria-label', folded ? 'Show the photo controls' : 'Fold the photo controls');
    });
    const help = touch
      ? 'Left thumb flies, <b>UP</b> / <b>DOWN</b> climb, swipe on the right to aim. Pick a setting below.'
      : 'Fly with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, <kbd>Space</kbd>/<kbd>C</kbd> up/down. Click the scene to look, <kbd>Esc</kbd> to adjust.<br><kbd>F</kbd> autofocus · <kbd>Q</kbd>/<kbd>E</kbd> roll · wheel zoom · <kbd>O</kbd> exits.';
    this.el = h(
      'aside',
      { class: `photo-panel glass strong rule-top${touch ? ' touch' : ''}`, 'aria-label': 'Photo mode' },
      // touch: the setting chips live in the head row (plus an autofocus chip), so the strip stays ~90 px
      h('div', { class: 'ph-head' }, h('div', { class: 'kicker' }, touch ? 'Photo' : 'Photo mode'), touch ? chips : null, touch ? exit : null, touch ? fold : null),
      h('p', { class: 'small muted ph-help', style: 'margin:6px 0 2px', html: help }),
    );
    this.fov = ctl('Field of view', 'FOV', 'fov', 12, 110, 1, 60, (v) => this.setFov(v));
    this.focus = ctl('Focus distance', 'Focus', 'focus', 0, 1, 0.001, 0.5, (v) => this.setFocus(this.focusFromSlider(v)));
    this.aperture = ctl('Aperture', 'Blur', 'aperture', 0, 1, 0.01, 0, (v) => this.setAperture(v));
    this.exposure = ctl('Exposure', 'Light', 'sun', -2, 2, 0.05, 0, (v) => this.setExposure(v));
    this.roll = ctl('Roll', 'Roll', 'roll', -45, 45, 0.5, 0, (v) => this.setRoll(v));
    if (touch) {
      const afChip = h('button', { class: 'chip', type: 'button', 'aria-label': 'Autofocus', html: `${icon('focus')}<span>AF</span>` });
      afChip.addEventListener('click', () => this.autofocus());
      // pause on the moment you want to frame
      this.playChip = h('button', { class: 'chip', type: 'button', 'aria-label': 'Play / pause the show', html: icon('pause') });
      this.playChip.addEventListener('click', () => ui.togglePlay());
      chips.prepend(this.playChip);
      chips.appendChild(afChip);
    }
    this.el.appendChild(h('div', { class: 'actions ph-actions' }, af, capture));
    // time: pause on the moment, step a second back / forward
    const step = (dt: number, ico: string, label: string) => {
      const b = h('button', { class: 'icon-btn', type: 'button', 'aria-label': label, 'data-tip': label, 'data-tip-pos': 'up', html: icon(ico) });
      b.addEventListener('click', () => {
        const c = ui.app.clock;
        c.seek(Math.max(0, Math.min(ui.app.show.duration, c.time + dt)));
      });
      return b;
    };
    this.playBtn = h('button', { class: 'icon-btn ph-play', type: 'button', 'aria-label': 'Play / pause the show (K)', html: icon('pause') });
    this.playBtn.addEventListener('click', () => ui.togglePlay());
    this.timeEl = h('span', { class: 'ph-t' }, '00:00.0');
    const timeRow = h('div', { class: 'ph-time' }, step(-1, 'back10', '−1 s'), this.playBtn, step(1, 'fwd10', '+1 s'), this.timeEl);
    for (const b of timeRow.querySelectorAll('.icon-btn:not(.ph-play) svg text')) b.textContent = '1';
    this.el.appendChild(timeRow);
    if (!touch) {
      // photo size: the PNG is rendered at this size whatever the screen / dynamic resolution
      const seg = h('div', { class: 'seg ph-res', role: 'radiogroup', 'aria-label': 'Photo size' });
      for (const r of RES) {
        const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(r.px === this.res), class: r.px === this.res ? 'on' : '', title: `${r.px} px wide` }, r.label);
        b.addEventListener('click', () => this.setRes(r.id));
        this.resBtns.push(b);
        seg.appendChild(b);
      }
      this.el.appendChild(h('div', { class: 'ph-res-row' }, h('span', { class: 'ctl-l' }, 'Photo size'), seg));
      this.el.appendChild(h('div', { class: 'actions', style: 'margin-top:8px' }, exit));
    }
    // big shutter for thumbs (touch layout only)
    this.shutter = h('button', { class: 'shutter', type: 'button', 'aria-label': 'Take the photo', html: icon('camera') });
    this.shutter.addEventListener('click', () => void this.capture());
    this.frame = h('div', { class: 'photo-frame', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'));
    this.flash = h('div', { class: 'flash' });
    parent.append(this.frame, this.el, this.shutter, this.flash);
    this.touch = touch;
  }

  private shutter: HTMLButtonElement;
  private touch = false;

  /** per frame while open: time readout (tenths) and the play / pause icon, DOM writes on change only */
  tick(): void {
    const c = this.ui.app.clock;
    const tenth = Math.floor(c.time * 10);
    if (tenth !== this.lastTenth) {
      this.lastTenth = tenth;
      setText(this.timeEl, `${fmtTime(c.time)}.${tenth % 10}`);
    }
    const playing = c.playing;
    if (playing !== this.lastPlaying) {
      this.lastPlaying = playing;
      this.playBtn.innerHTML = icon(playing ? 'pause' : 'play');
      this.playBtn.setAttribute('aria-label', playing ? 'Pause the show (K)' : 'Play the show (K)');
      if (this.playChip) this.playChip.innerHTML = icon(playing ? 'pause' : 'play');
    }
  }

  private setRes(id: string) {
    const r = RES.find((x) => x.id === id);
    if (!r) return;
    this.res = r.px;
    store.set('dq26.photoRes', id);
    RES.forEach((x, i) => {
      const b = this.resBtns[i];
      if (!b) return;
      b.classList.toggle('on', x.id === id);
      b.setAttribute('aria-checked', String(x.id === id));
    });
  }

  private focusFromSlider(v: number) {
    return 0.5 * Math.pow(1000, v); // 0.5 m .. 500 m
  }
  private sliderFromFocus(m: number) {
    return Math.log(Math.max(0.5, m) / 0.5) / Math.log(1000);
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    const cam = this.ui.app.camera;
    this.savedFov = cam.fov;
    const pf = this.ui.app.postfx.photo;
    const rig = cameraRig(this.ui.app);
    if (!rig?.setFov) pf.enabled = true;
    this.fov.input.value = String(Math.round(cam.fov));
    this.focus.input.value = String(this.sliderFromFocus(pf.focusDistance || 30));
    this.aperture.input.value = String(pf.aperture || 0);
    this.exposure.input.value = String(Math.log2(pf.exposure || 1));
    this.roll.input.value = '0';
    this.fallbackRoll = 0;
    for (const c of [this.fov, this.focus, this.aperture, this.exposure, this.roll]) this.ui.hud.paintRange(c.input);
    this.refreshLabels();
    if (!pf.focusDistance) this.autofocus();
    this.ui.app.events.emit('photo:mode', { on: true });
    // touch: the strip has no room for the flight help: say it once per visit
    if (this.touch && !this.helpShown) {
      this.helpShown = true;
      this.ui.toast('Photo mode: left thumb flies, UP / DOWN climb, swipe to aim · the red button takes the shot', 4200, 'camera');
    }
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    const rig = cameraRig(this.ui.app);
    const cam = this.ui.app.camera;
    if (!rig?.setFov) {
      cam.fov = this.savedFov;
      cam.updateProjectionMatrix();
    }
    if (!rig?.setRoll) this.fallbackRoll = 0;
    else tryCall(rig, 'setRoll', 0);
    this.ui.app.postfx.photo.enabled = false;
    this.ui.app.events.emit('photo:mode', { on: false });
  }

  private refreshLabels() {
    setText(this.fov.value, `${Math.round(parseFloat(this.fov.input.value))}°`);
    const m = this.focusFromSlider(parseFloat(this.focus.input.value));
    setText(this.focus.value, m < 10 ? `${m.toFixed(1)} m` : `${Math.round(m)} m`);
    const a = parseFloat(this.aperture.input.value);
    setText(this.aperture.value, a <= 0.001 ? 'off' : `f/${(22 * Math.pow(1.2 / 22, a)).toFixed(1)}`);
    const ev = parseFloat(this.exposure.input.value);
    setText(this.exposure.value, `${ev >= 0 ? '+' : ''}${ev.toFixed(1)} EV`);
    setText(this.roll.value, `${parseFloat(this.roll.input.value).toFixed(1)}°`);
  }

  private setFov(deg: number) {
    const rig = cameraRig(this.ui.app);
    if (!tryCall(rig, 'setFov', deg)) {
      const cam = this.ui.app.camera;
      cam.fov = deg;
      cam.updateProjectionMatrix();
    }
    this.refreshLabels();
  }
  private setFocus(m: number) {
    if (!tryCall(cameraRig(this.ui.app), 'setFocus', m)) this.ui.app.postfx.photo.focusDistance = m;
    this.refreshLabels();
  }
  private setAperture(a: number) {
    if (!tryCall(cameraRig(this.ui.app), 'setAperture', a)) this.ui.app.postfx.photo.aperture = a;
    this.refreshLabels();
  }
  /** EV slider -> exposure multiplier */
  private setExposure(ev: number) {
    const mult = Math.pow(2, ev);
    if (!tryCall(cameraRig(this.ui.app), 'setExposure', mult)) this.ui.app.postfx.photo.exposure = mult;
    this.refreshLabels();
  }
  /** degrees on the slider, radians to the rig */
  private setRoll(deg: number) {
    const rad = THREE.MathUtils.degToRad(deg);
    if (!tryCall(cameraRig(this.ui.app), 'setRoll', rad)) this.fallbackRoll = rad;
    this.refreshLabels();
  }

  autofocus(): void {
    const rig = cameraRig(this.ui.app);
    let d: number | undefined;
    if (rig && typeof rig.autoFocus === 'function') {
      const r = rig.autoFocus();
      if (typeof r === 'number' && Number.isFinite(r)) d = r;
    }
    if (d === undefined) {
      // fallback: view ray against the ground, else distance to the dragon's head
      const cam = this.ui.app.camera;
      const dir = cam.getWorldDirection(this.tmpV);
      const y = cam.position.y;
      if (dir.y < -0.01) d = Math.min(500, y / -dir.y);
      else {
        const head = this.ui.app.anchors.get('dragon_head')[0];
        d = head ? cam.position.distanceTo(head) : 60;
      }
      this.setFocus(d);
    }
    this.focus.input.value = String(this.sliderFromFocus(d));
    this.ui.hud.paintRange(this.focus.input);
    this.refreshLabels();
  }

  /** full-screen preview of a captured photo (right-click / long-press to save) */
  private showPhoto(blob: Blob, w: number, hgt: number): void {
    const url = URL.createObjectURL(blob);
    const img = h('img', { src: url, alt: 'Your Endshow photo', style: 'max-width:100%;max-height:72vh;display:block;margin:0 auto;border-radius:6px' });
    const card = h(
      'div',
      { class: 'card glass strong rule-top', style: 'max-width:min(92vw,1100px)' },
      h('div', { class: 'kicker' }, 'Photo mode'),
      h('h3', null, 'Your shot'),
      img,
      h('p', { class: 'note' }, `${w} × ${hgt} px. Right-click (or long-press on a phone) the image and choose “Save image”.`),
    );
    this.ui.layers.open('photo-result', card, { kind: 'modal', dismissible: true, onClose: () => URL.revokeObjectURL(url) });
  }

  /**
   * Render the last frame again into a drawing buffer whose long edge is `longEdge` px and read it
   * back. The canvas keeps its CSS size, so nothing on screen moves; the live resolution (preset x
   * dynamic scale) is restored right after the read-back, still inside this task.
   */
  private captureAt(longEdge: number): { blob: Promise<Blob | null>; w: number; h: number } {
    const app = this.ui.app;
    const r = app.renderer;
    const gl = r.getContext();
    const cssW = window.innerWidth,
      cssH = window.innerHeight;
    const dims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array | number[] | null;
    const maxDim = Math.min(r.capabilities.maxTextureSize || 4096, (gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number) || 4096, dims ? dims[0] : 4096, 4096);
    const target = Math.min(longEdge, maxDim);
    const pr = target / Math.max(cssW, cssH);
    if (pr <= r.getPixelRatio() * 1.01) {
      // the live frame is already at (or above) the photo size
      return { blob: app.postfx.capture(), w: gl.drawingBufferWidth, h: gl.drawingBufferHeight };
    }
    let blob: Promise<Blob | null>;
    let w = 0,
      hh = 0;
    try {
      r.setPixelRatio(pr);
      r.setSize(cssW, cssH, false);
      // the browser may clamp an oversized drawing buffer: size the post chain to what it got
      w = gl.drawingBufferWidth;
      hh = gl.drawingBufferHeight;
      app.postfx.setSize(w, hh);
      // renders the last frame (feedback buffers untouched) and copies the canvas synchronously
      blob = app.postfx.capture();
    } finally {
      app.resize();
      app.governor.reset({ cooldown: 2 });
    }
    return { blob, w, h: hh };
  }

  async capture(): Promise<void> {
    const app = this.ui.app;
    this.flash.classList.remove('go');
    void this.flash.offsetWidth;
    this.flash.classList.add('go');
    try {
      const shot = this.captureAt(this.res);
      const blob = await shot.blob;
      if (!blob) throw new Error('empty image');
      if (IS_ARTIFACT) {
        // sandboxed page: script downloads are blocked, so show the photo to save it by hand
        this.showPhoto(blob, shot.w, shot.h);
      } else {
        downloadBlob(blob, `defqon1-2026-endshow-${fmtTime(app.clock.time).replace(/:/g, '-')}.png`);
        this.ui.toast(`Photo saved to your downloads (${shot.w} × ${shot.h})`, 2600, 'camera');
      }
    } catch (e) {
      this.ui.toast(`Capture failed: ${(e as Error).message}`, 3000, 'warning');
    }
  }
}
