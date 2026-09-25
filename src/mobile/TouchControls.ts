import type { CameraMode, CameraRig } from '../camera/CameraRig';
import type { App } from '../core/App';
import type { PlayerController } from '../player/PlayerController';
import { prefs } from '../ui/settings';
import './touch.css';

type Group = 'walk' | 'fly' | 'watch';

const ICON = {
  jump: '<svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6"/><path d="M6 19h12"/></svg>',
  run: '<svg viewBox="0 0 24 24"><path d="M5 7l5 5-5 5"/><path d="M12 7l5 5-5 5"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>',
  phone:
    '<svg viewBox="0 0 96 96"><g class="tc-phone"><rect x="33" y="18" width="30" height="60" rx="5"/><path d="M44 71h8"/></g>' +
    '<path class="tc-arrow" d="M55 9A40 40 0 0 1 87.4 41.1"/><path class="tc-arrow" d="M90.4 33.8L87.4 41.1 81.4 35.4"/></svg>',
};

const HINTS_KEY = 'd1.touch.hints';
const PORTRAIT_KEY = 'd1.touch.portrait';
/** storage that never throws (private mode / blocked storage); portrait advice is per session */
const store = {
  area(k: string): Storage {
    return k === PORTRAIT_KEY ? sessionStorage : localStorage;
  },
  get(k: string): string | null {
    try {
      return this.area(k).getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string): void {
    try {
      this.area(k).setItem(k, v);
    } catch {
      /* unavailable: the advice simply shows again next time */
    }
  },
};

/**
 * Touch controls for phones / tablets:
 *  - dynamic virtual joystick on the left half (appears under the thumb; push past the ring = run)
 *  - swipe-look on the right half (and with a second finger anywhere)
 *  - buttons: jump, run toggle, first/third view, interact (only while a prompt is active),
 *    up / down in the free & photo cameras, "my view" to return from any camera
 *  - dismissible advice to rotate to landscape (portrait keeps working)
 * Multi-touch safe (tracked per pointerId), honours safe-area insets, writes into app.input.
 */
export class TouchControls {
  private el!: HTMLElement;
  private joy!: HTMLElement;
  private knob!: HTMLElement;
  private runBtn!: HTMLElement;
  private viewBtn!: HTMLElement;
  private interactLabel!: HTMLElement;
  private portrait!: HTMLElement;
  private hintMove!: HTMLElement;
  private hintLook!: HTMLElement;
  private joyId: number | null = null;
  private lookId: number | null = null;
  private ox = 0;
  private oy = 0;
  private lastX = 0;
  private lastY = 0;
  private runLatched = false;
  private edgeRun = false;
  private group: Group = 'walk';
  private enabled = false;
  private primaryTouch = true;
  private safe = { l: 0, r: 0, t: 0, b: 0 };
  private probe!: HTMLElement;
  /** px the controls sit above the bottom edge (clear of the touch show bar; CSS --tc-lift) */
  private lift = 0;
  /** hidden by the overlay UI (cinema, menus): swipes only look around, nothing walks */
  private hidden = false;
  /** joystick radius in CSS px (knob travel) */
  readonly radius = 56;
  /** swipe-look speed multiplier (1 = right half of the screen is ~110 degrees); × the viewer's setting */
  lookSpeed = 1;

  constructor(private app: App, private parent: HTMLElement) {}

  private get player(): PlayerController | undefined {
    return this.app.get<PlayerController>('player');
  }

  private get rig(): CameraRig | undefined {
    return this.app.get<CameraRig>('camera');
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.build();
    // touch laptops / convertibles: stay out of the way until the screen is actually touched
    this.primaryTouch = this.app.device.mobile || matchMedia('(pointer: coarse)').matches;
    if (!this.primaryTouch) {
      this.el.classList.add('tc-dormant');
      const wake = (e: PointerEvent) => {
        if (e.pointerType !== 'touch') return;
        this.el.classList.remove('tc-dormant');
        window.removeEventListener('pointerdown', wake, true);
      };
      window.addEventListener('pointerdown', wake, true);
    }
    this.parent.addEventListener('pointerdown', this.onDown, { passive: false });
    window.addEventListener('pointermove', this.onMove, { passive: false });
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('blur', this.releaseAll);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    this.app.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.app.events.on('camera:mode', ({ mode }) => this.setGroup(mode as CameraMode));
    this.app.events.on('interact:prompt', ({ label }) => {
      this.el.classList.toggle('can-interact', !!label);
      if (label) this.interactLabel.textContent = label;
    });
    this.onResize();
    if (store.get(HINTS_KEY)) this.hideHints();
    else setTimeout(() => this.hideHints(), 14000);
    // follow the overlay UI: cinema / menus / landing hide the thumb controls (CSS), and any
    // held joystick or button is released so nothing keeps walking behind a menu
    const ui = document.getElementById('ui');
    if (ui) {
      const sync = () => {
        const c = ui.classList;
        const hide = c.contains('pre') || c.contains('cinema') || c.contains('layer-open');
        if (hide !== this.hidden) {
          this.hidden = hide;
          this.releaseAll();
        }
        if (c.contains('touch') !== this.lastTouchLayout) {
          this.lastTouchLayout = c.contains('touch');
          this.onResize();
        }
      };
      new MutationObserver(sync).observe(ui, { attributes: true, attributeFilter: ['class'] });
      sync();
    }
  }

  private lastTouchLayout = false;

  /** hide / show all touch UI (e.g. for a cinema mode) */
  setVisible(on: boolean): void {
    this.el?.classList.toggle('tc-hidden', !on);
    this.hidden = !on;
    if (!on) this.releaseAll();
  }

  // --- DOM ----------------------------------------------------------------------------------------

  private build(): void {
    const el = (this.el = document.createElement('div'));
    el.className = 'tc';
    el.dataset.group = 'walk';
    el.innerHTML = `
      <div class="tc-joy is-idle"><div class="tc-joy-ring"></div><div class="tc-joy-knob"></div></div>
      <div class="tc-hint tc-hint-move">DRAG TO MOVE</div>
      <div class="tc-hint tc-hint-look">SWIPE TO LOOK</div>
      <button class="tc-interact" aria-label="Interact"><span class="tc-interact-key">TAP</span><span class="tc-interact-label"></span></button>
      <div class="tc-cluster">
        <button class="tc-btn tc-jump tc-g-walk" aria-label="Jump">${ICON.jump}JUMP</button>
        <button class="tc-btn tc-run tc-g-walk" aria-label="Run">${ICON.run}RUN</button>
        <button class="tc-btn tc-view tc-g-walk" aria-label="Switch view">3RD</button>
        <button class="tc-btn tc-up tc-g-fly" aria-label="Up">${ICON.up}UP</button>
        <button class="tc-btn tc-down tc-g-fly" aria-label="Down">${ICON.down}DOWN</button>
        <button class="tc-btn tc-back tc-g-back" aria-label="Back to my view">${ICON.eye}MY VIEW</button>
      </div>`;
    this.parent.appendChild(el);
    const q = <T extends HTMLElement>(s: string) => el.querySelector(s) as T;
    this.joy = q('.tc-joy');
    this.knob = q('.tc-joy-knob');
    this.runBtn = q('.tc-run');
    this.viewBtn = q('.tc-view');
    this.interactLabel = q('.tc-interact-label');
    this.hintMove = q('.tc-hint-move');
    this.hintLook = q('.tc-hint-look');

    this.button(q('.tc-jump'), () => this.player?.requestJump());
    this.button(this.runBtn, () => {
      this.runLatched = !this.runLatched;
      this.runBtn.classList.toggle('is-on', this.runLatched);
      this.syncRun();
    });
    this.button(this.viewBtn, () => this.rig?.toggleView());
    this.button(q('.tc-interact'), () => this.player?.interact());
    this.button(q('.tc-back'), () => this.rig?.setMode('first'));
    this.hold(q('.tc-up'), 1);
    this.hold(q('.tc-down'), -1);

    // portrait advice
    const pt = (this.portrait = document.createElement('div'));
    pt.className = 'tc-portrait';
    pt.innerHTML = `<div class="tc-portrait-card">${ICON.phone}
      <p class="tc-portrait-title">Rotate your phone to landscape for the best experience</p>
      <p class="tc-portrait-sub">The Endshow is wide: the dragon's wings span the whole horizon.</p>
      <button type="button">CONTINUE IN PORTRAIT</button></div>`;
    pt.querySelector('button')!.addEventListener('click', () => {
      store.set(PORTRAIT_KEY, '1');
      pt.classList.remove('is-shown');
    });
    document.body.appendChild(pt);

    // reads env(safe-area-inset-*) as pixels
    const probe = (this.probe = document.createElement('div'));
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.appendChild(probe);
    this.placeGhost();
  }

  /** tap button: fires on press (no 300 ms click delay), with pressed feedback */
  private button(b: HTMLElement, fn: () => void): void {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      b.classList.add('is-down');
      fn();
    });
    const up = () => b.classList.remove('is-down');
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  }

  /** hold button for vertical flight (free / photo cameras) */
  private hold(b: HTMLElement, dir: number): void {
    let id: number | null = null;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      id = e.pointerId;
      b.classList.add('is-down');
      if (this.rig) this.rig.touchVertical = dir;
    });
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      b.classList.remove('is-down');
      if (this.rig && this.rig.touchVertical === dir) this.rig.touchVertical = 0;
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
  }

  private setGroup(mode: CameraMode): void {
    const g: Group = mode === 'first' || mode === 'third' ? 'walk' : mode === 'free' || mode === 'photo' ? 'fly' : 'watch';
    this.viewBtn.textContent = mode === 'third' ? '1ST' : '3RD';
    if (g === this.group) return;
    this.group = g;
    this.el.dataset.group = g;
    this.releaseAll();
  }

  private hideHints(): void {
    this.hintMove.classList.add('is-gone');
    this.hintLook.classList.add('is-gone');
  }

  // --- pointers -----------------------------------------------------------------------------------

  private onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' || e.target !== this.app.canvas || this.group === 'watch') return;
    e.preventDefault();
    if (e.clientX < window.innerWidth * 0.5 && this.joyId === null && !this.hidden) {
      this.joyId = e.pointerId;
      const R = this.radius + 8;
      this.ox = Math.min(Math.max(e.clientX, this.safe.l + R), window.innerWidth * 0.5);
      this.oy = Math.min(Math.max(e.clientY, this.safe.t + R), window.innerHeight - this.safe.b - this.lift - R * 0.6);
      this.joy.classList.remove('is-idle');
      this.joy.style.transform = `translate(${this.ox}px, ${this.oy}px)`;
      this.stick(e.clientX, e.clientY);
      this.hintMove.classList.add('is-gone');
      this.markHintsUsed();
    } else if (this.lookId === null) {
      this.lookId = e.pointerId;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
  };

  private onMove = (e: PointerEvent): void => {
    if (e.pointerId === this.joyId) {
      e.preventDefault();
      this.stick(e.clientX, e.clientY);
    } else if (e.pointerId === this.lookId) {
      e.preventDefault();
      const s = (1700 / Math.max(320, window.innerWidth)) * this.lookSpeed * prefs.touchLook;
      const input = this.app.input;
      input.look.x += (e.clientX - this.lastX) * s;
      input.look.y += (e.clientY - this.lastY) * s * (prefs.invertY ? -1 : 1);
      if (Math.abs(e.clientX - this.lastX) > 2) {
        this.hintLook.classList.add('is-gone');
        this.markHintsUsed();
      }
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
  };

  private onUp = (e: PointerEvent): void => {
    if (e.pointerId === this.joyId) this.releaseJoy();
    if (e.pointerId === this.lookId) this.lookId = null;
  };

  private releaseAll = (): void => {
    this.releaseJoy();
    this.lookId = null;
    const rig = this.rig;
    if (rig) rig.touchVertical = 0;
  };

  private releaseJoy(): void {
    this.joyId = null;
    this.edgeRun = false;
    const input = this.app.input;
    input.touchMove.x = 0;
    input.touchMove.y = 0;
    this.syncRun();
    if (!this.joy) return;
    this.knob.style.transform = '';
    this.joy.classList.remove('is-run');
    this.joy.classList.add('is-idle');
    this.placeGhost();
  }

  /** thumb at (x, y): knob position, analog intent with dead zone, run past the ring */
  private stick(x: number, y: number): void {
    const R = this.radius;
    let dx = x - this.ox,
      dy = y - this.oy;
    let d = Math.hypot(dx, dy);
    const drag = R * 1.7;
    if (d > drag) {
      // thumb wandered far: drag the base along so reversing direction stays instant
      this.ox += (dx / d) * (d - drag);
      this.oy += (dy / d) * (d - drag);
      this.joy.style.transform = `translate(${this.ox}px, ${this.oy}px)`;
      dx = x - this.ox;
      dy = y - this.oy;
      d = drag;
    }
    const k = d > R ? R / d : 1;
    this.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    const mag = Math.min(1, d / R);
    const dead = 0.12;
    const m = mag < dead ? 0 : (mag - dead) / (1 - dead);
    const input = this.app.input;
    input.touchMove.x = d > 0 ? (dx / d) * m : 0;
    input.touchMove.y = d > 0 ? (-dy / d) * m : 0;
    const run = d > R * 1.22 && this.group === 'walk';
    if (run !== this.edgeRun) {
      this.edgeRun = run;
      this.joy.classList.toggle('is-run', run);
      this.syncRun();
    }
  }

  private syncRun(): void {
    this.app.input.touchRun = this.runLatched || this.edgeRun;
  }

  private markHintsUsed(): void {
    if (this.hintMove.classList.contains('is-gone') && this.hintLook.classList.contains('is-gone')) store.set(HINTS_KEY, '1');
  }

  // --- layout -------------------------------------------------------------------------------------

  private onResize = (): void => {
    const cs = getComputedStyle(this.probe);
    this.safe.t = parseFloat(cs.paddingTop) || 0;
    this.safe.r = parseFloat(cs.paddingRight) || 0;
    this.safe.b = parseFloat(cs.paddingBottom) || 0;
    this.safe.l = parseFloat(cs.paddingLeft) || 0;
    this.lift = parseFloat(getComputedStyle(this.el).getPropertyValue('--tc-lift')) || 0;
    if (this.joyId === null) this.placeGhost();
    const portrait = window.innerHeight > window.innerWidth * 1.05;
    this.portrait.classList.toggle('is-shown', portrait && this.primaryTouch && !store.get(PORTRAIT_KEY));
  };

  /** faint resting joystick bottom-left (above the show bar), showing where to put the thumb */
  private placeGhost(): void {
    this.ox = this.safe.l + 96;
    this.oy = window.innerHeight - this.safe.b - this.lift - (this.lift ? 76 : 100);
    this.joy.style.transform = `translate(${this.ox}px, ${this.oy}px)`;
  }
}
