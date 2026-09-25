import type { App } from '../core/App';

/** Hidden developer menu (STUB baseline: FPS readout). Toggle with ` or ?debug=1. */
export class DebugMenu {
  private el: HTMLElement;
  private visible: boolean;
  private acc = 0;
  constructor(private app: App) {
    this.el = document.createElement('pre');
    this.el.id = 'debug';
    this.el.style.cssText =
      'position:fixed;left:8px;top:8px;z-index:50;color:#0f0;background:rgba(0,0,0,.6);font:11px monospace;padding:6px;pointer-events:none;margin:0;white-space:pre';
    document.body.appendChild(this.el);
    this.visible = app.params.has('debug');
    this.el.style.display = this.visible ? 'block' : 'none';
    app.onFrame((ctx) => {
      if (app.input.pressed('Backquote')) {
        this.visible = !this.visible;
        this.el.style.display = this.visible ? 'block' : 'none';
      }
      if (!this.visible) return;
      this.acc += ctx.dt;
      if (this.acc < 0.25) return;
      this.acc = 0;
      const i = { render: app.lastRender };
      this.el.textContent = `fps ${app.governor.fps.toFixed(0)}  ${app.governor.frameMs.toFixed(1)}ms  q=${app.quality.level} scale=${app.governor.scale.toFixed(2)}
calls ${i.render.calls} tris ${(i.render.triangles / 1e6).toFixed(2)}M
show ${ctx.showTime.toFixed(2)}s  beat ${ctx.beat.beat.toFixed(2)} bpm ${ctx.beat.bpm}
pos ${app.playerPos.x.toFixed(1)}, ${app.playerPos.z.toFixed(1)}  cam ${app.camera.position.toArray().map((v) => v.toFixed(1)).join(', ')}`;
    });
  }
}
