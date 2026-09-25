import type { App } from '../core/App';

/**
 * DOM overlay: landing, loading, onboarding, HUD show controls, menus (STUB baseline).
 * Replaced during implementation. The UI talks to the App; systems never import UI.
 */
export class UI {
  private root: HTMLElement;
  constructor(private app: App, parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'ui';
    parent.appendChild(this.root);
    this.root.innerHTML = `
      <div class="landing" id="landing">
        <h1>DEFQON.1 2026</h1><h2>THE ENDSHOW EXPERIENCE</h2>
        <div class="progress"><div class="bar" id="load-bar"></div></div>
        <div class="load-label" id="load-label">Loading…</div>
        <button id="enter" disabled>ENTER THE HOLY GROUNDS</button>
      </div>`;
    app.events.on('loading:progress', ({ label, progress }) => {
      (this.root.querySelector('#load-bar') as HTMLElement).style.width = `${Math.round(progress * 100)}%`;
      (this.root.querySelector('#load-label') as HTMLElement).textContent = label;
    });
  }

  onReady(): void {
    const btn = this.root.querySelector('#enter') as HTMLButtonElement;
    btn.disabled = false;
    btn.onclick = () => this.enter();
    if (this.app.params.has('autostart')) this.enter();
  }

  private enter() {
    this.app.audio.ensure();
    (this.root.querySelector('#landing') as HTMLElement).remove();
    if (!this.app.device.touch && !this.app.params.has('autostart')) this.app.input.requestPointerLock();
    this.app.canvas.addEventListener('click', () => this.app.input.requestPointerLock());
    if (this.app.params.has('play')) void this.app.clock.play();
  }
}
