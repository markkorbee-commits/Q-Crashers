import type { App } from '../core/App';

/** Virtual joystick + touch look for phones/tablets (STUB — replaced during implementation). */
export class TouchControls {
  constructor(private app: App, private parent: HTMLElement) {}
  enable(): void {}
}
