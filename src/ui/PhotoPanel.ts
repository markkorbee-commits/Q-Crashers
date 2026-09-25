import * as THREE from 'three';
import { cameraRig, tryCall } from './contracts';
import { downloadBlob, h, setText } from './dom';
import { fmtTime } from './format';
import { icon } from './icons';
import type { UI } from './UI';

interface Ctl {
  input: HTMLInputElement;
  value: HTMLElement;
}

/**
 * Photo mode: hides the HUD, free camera, FOV / focus / aperture / exposure / roll, autofocus and
 * PNG capture. Uses the CameraRig photo API when present, otherwise drives camera + postfx.photo.
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

  constructor(private ui: UI, parent: HTMLElement) {
    const ctl = (label: string, ico: string, min: number, max: number, step: number, value: number, on: (v: number) => void): Ctl => {
      const input = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value), 'aria-label': label });
      const val = h('span', { class: 'v' });
      input.addEventListener('input', () => {
        on(parseFloat(input.value));
        ui.hud.paintRange(input);
      });
      this.el.appendChild(h('div', { class: 'ctl' }, h('label', null, h('span', { html: `${icon(ico)}${label}` }), val), input));
      return { input, value: val };
    };
    const exit = h('button', { class: 'btn small ghost', type: 'button', html: `${icon('close')}<span>Exit</span>` });
    exit.addEventListener('click', () => ui.togglePhoto(false));
    const capture = h('button', { class: 'btn small primary', type: 'button', html: `${icon('camera')}<span>Capture</span>` });
    capture.addEventListener('click', () => void this.capture());
    const af = h('button', { class: 'btn small', type: 'button', html: `${icon('focus')}<span>Autofocus</span>` });
    af.addEventListener('click', () => this.autofocus());
    this.el = h(
      'aside',
      { class: 'photo-panel glass strong rule-top', 'aria-label': 'Photo mode' },
      h('div', { class: 'kicker' }, 'Photo mode'),
      h('p', { class: 'small muted', style: 'margin:6px 0 2px', html: 'Fly with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, <kbd>Space</kbd>/<kbd>C</kbd> up/down. Click the scene to look, <kbd>Esc</kbd> to adjust. <kbd>O</kbd> exits.' }),
    );
    this.fov = ctl('Field of view', 'fov', 12, 110, 1, 60, (v) => this.setFov(v));
    this.focus = ctl('Focus distance', 'focus', 0, 1, 0.001, 0.5, (v) => this.setFocus(this.focusFromSlider(v)));
    this.aperture = ctl('Aperture', 'aperture', 0, 1, 0.01, 0, (v) => this.setAperture(v));
    this.exposure = ctl('Exposure', 'sun', -2, 2, 0.05, 0, (v) => this.setExposure(v));
    this.roll = ctl('Roll', 'roll', -45, 45, 0.5, 0, (v) => this.setRoll(v));
    this.el.appendChild(h('div', { class: 'actions' }, af, capture));
    this.el.appendChild(h('div', { class: 'actions', style: 'margin-top:8px' }, exit));
    this.frame = h('div', { class: 'photo-frame', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'));
    this.flash = h('div', { class: 'flash' });
    parent.append(this.frame, this.el, this.flash);
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

  async capture(): Promise<void> {
    const app = this.ui.app;
    this.flash.classList.remove('go');
    void this.flash.offsetWidth;
    this.flash.classList.add('go');
    try {
      const blob = await app.postfx.capture();
      if (!blob) throw new Error('empty image');
      downloadBlob(blob, `defqon1-2026-endshow-${fmtTime(app.clock.time).replace(/:/g, '-')}.png`);
      this.ui.toast('Photo saved to your downloads', 2400, 'camera');
    } catch (e) {
      this.ui.toast(`Capture failed: ${(e as Error).message}`, 3000, 'warning');
    }
  }
}
