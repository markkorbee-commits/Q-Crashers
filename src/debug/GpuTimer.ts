/**
 * GPU frame time via EXT_disjoint_timer_query_webgl2 (when the driver exposes it).
 * begin() is called from a frame hook right before the render; end() from a requestAnimationFrame
 * callback that runs before the next App.step (i.e. right after the previous frame's render).
 * Results are read asynchronously from a small query ring (no stalls, no allocation per frame).
 */
interface TimerExt {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

export class GpuTimer {
  readonly supported: boolean;
  /** smoothed GPU ms (NaN until the first result) */
  ms = NaN;
  private ext: TimerExt | null;
  private ring: (WebGLQuery | null)[] = [];
  private busy: boolean[] = [];
  private cur = -1;
  private raf = 0;
  private active = false;

  constructor(private gl: WebGL2RenderingContext) {
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null;
    this.supported = !!this.ext;
    if (this.ext) {
      for (let i = 0; i < 6; i++) {
        this.ring.push(gl.createQuery());
        this.busy.push(false);
      }
    }
  }

  setActive(on: boolean): void {
    if (!this.supported || on === this.active) return;
    this.active = on;
    if (on) {
      const loop = () => {
        if (!this.active) return;
        this.end();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(this.raf);
      this.end();
    }
  }

  /** start timing (right before the frame is rendered) */
  begin(): void {
    if (!this.active || !this.ext || this.cur >= 0) return;
    this.poll();
    const i = this.busy.indexOf(false);
    if (i < 0) return;
    const q = this.ring[i];
    if (!q) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.busy[i] = true;
    this.cur = i;
  }

  private end(): void {
    if (!this.ext || this.cur < 0) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.cur = -1;
  }

  private poll(): void {
    const gl = this.gl;
    const disjoint = this.ext ? gl.getParameter(this.ext.GPU_DISJOINT_EXT) : false;
    for (let i = 0; i < this.ring.length; i++) {
      if (!this.busy[i] || i === this.cur) continue;
      const q = this.ring[i]!;
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) continue;
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
      this.busy[i] = false;
      if (disjoint) continue;
      const ms = ns / 1e6;
      this.ms = Number.isNaN(this.ms) ? ms : this.ms * 0.85 + ms * 0.15;
    }
  }
}
