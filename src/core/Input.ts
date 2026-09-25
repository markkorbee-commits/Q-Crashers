/**
 * Unified input state (keyboard, mouse + pointer lock, touch sticks written by mobile/TouchControls).
 * Consumers read the state once per frame; `endFrame()` clears per-frame deltas/edges.
 */
export class Input {
  /** movement intent: x = strafe right, y = forward, both -1..1 */
  readonly move = { x: 0, y: 0 };
  /** accumulated look delta in pixels this frame (mouse or touch) */
  readonly look = { x: 0, y: 0 };
  /** vertical intent for free/photo camera: +1 up, -1 down */
  vertical = 0;
  run = false;
  /** touch-driven movement (set by TouchControls) */
  readonly touchMove = { x: 0, y: 0 };
  touchRun = false;
  pointerLocked = false;
  /** mouse wheel delta this frame */
  wheel = 0;
  private down = new Set<string>();
  private edges = new Set<string>();
  private enabled = true;
  /** when true, keyboard input is ignored (e.g. typing in a UI field / modal open) */
  uiCapture = false;

  constructor(private el: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.down.clear());
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.el;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.pointerLocked) {
        this.look.x += e.movementX;
        this.look.y += e.movementY;
      }
    });
    this.el.addEventListener('wheel', (e) => {
      this.wheel += e.deltaY;
    }, { passive: true });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.uiCapture || !this.enabled) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (!this.down.has(e.code)) this.edges.add(e.code);
    this.down.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code) || (e.code === 'Tab' && this.pointerLocked)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code);
  };

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** true only on the frame the key went down */
  pressed(code: string): boolean {
    return this.edges.has(code);
  }

  requestPointerLock(): void {
    if (this.pointerLocked) return;
    const req = this.el.requestPointerLock?.bind(this.el);
    try {
      const p = req?.({ unadjustedMovement: true } as any) as unknown as Promise<void> | undefined;
      p?.catch?.(() => {
        const retry = req?.() as unknown as Promise<void> | undefined;
        retry?.catch?.(() => undefined);
      });
    } catch {
      req?.();
    }
  }

  exitPointerLock(): void {
    if (this.pointerLocked) document.exitPointerLock();
  }

  /** compute combined movement from keyboard + touch; call at frame start */
  beginFrame(): void {
    let x = 0,
      y = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp') || this.isDown('KeyZ')) y += 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft') || this.isDown('KeyQ')) x -= 1;
    x += this.touchMove.x;
    y += this.touchMove.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    this.move.x = x;
    this.move.y = y;
    this.run = this.isDown('ShiftLeft') || this.isDown('ShiftRight') || this.touchRun;
    this.vertical = (this.isDown('Space') ? 1 : 0) - (this.isDown('ControlLeft') || this.isDown('KeyC') ? 1 : 0);
  }

  endFrame(): void {
    this.look.x = 0;
    this.look.y = 0;
    this.wheel = 0;
    this.edges.clear();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.down.clear();
  }
}
