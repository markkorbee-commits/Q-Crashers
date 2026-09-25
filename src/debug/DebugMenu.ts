import type { App } from '../core/App';
import type { FrameContext } from '../core/types';
import type { SystemId } from '../show/ShowTypes';
import { debugState } from './debugState';
import { DebugTools, type ToolId } from './DebugTools';
import { GpuTimer } from './GpuTimer';

const SHOW_SYSTEMS: SystemId[] = ['lights', 'strobe', 'lasers', 'pyro', 'fireworks', 'stage', 'screens', 'fog', 'crowd', 'camera', 'atmos'];
const TOGGLE_SYSTEMS = ['lights', 'lasers', 'pyro', 'fireworks', 'fog', 'crowd', 'stage', 'grounds', 'bar'];

const CSS = `
#dbg{position:fixed;left:12px;top:74px;z-index:58;width:372px;max-height:calc(100vh - 90px);overflow:auto;display:none;
  font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,'DejaVu Sans Mono',monospace;color:#d9d2c8;
  background:rgba(6,6,9,.9);border:1px solid rgba(243,237,228,.14);border-top:2px solid #e10600;border-radius:10px;
  box-shadow:0 18px 50px rgba(0,0,0,.5);user-select:text;-webkit-user-select:text;scrollbar-width:thin;touch-action:auto}
#dbg.show{display:block}
#dbg header{position:sticky;top:0;display:flex;align-items:center;gap:8px;padding:7px 8px 7px 10px;background:rgba(10,10,14,.98);
  cursor:grab;border-bottom:1px solid rgba(243,237,228,.08);z-index:1;touch-action:none}
#dbg header b{color:#ff2a12;letter-spacing:.14em}
#dbg header .fps{margin-left:auto;font-weight:700;color:#fff}
#dbg header button{all:unset;cursor:pointer;padding:2px 7px;border-radius:5px;color:#a39b92}
#dbg header button:hover{background:rgba(255,255,255,.08);color:#fff}
#dbg details{border-bottom:1px solid rgba(243,237,228,.06)}
#dbg summary{cursor:pointer;padding:5px 10px;color:#ff5a3a;letter-spacing:.12em;font-weight:700;list-style:none;outline:none}
#dbg summary::-webkit-details-marker{display:none}
#dbg summary::before{content:'▸ ';color:#6f6861}
#dbg details[open] summary::before{content:'▾ '}
#dbg summary:focus-visible{background:rgba(255,42,18,.15)}
#dbg pre{margin:0;padding:0 10px 8px;white-space:pre-wrap;word-break:break-word;font:inherit}
#dbg .row{display:flex;flex-wrap:wrap;gap:5px;align-items:center;padding:0 10px 8px}
#dbg button.b,#dbg select,#dbg input[type=text]{font:inherit;color:#f3ede4;background:rgba(255,255,255,.06);border:1px solid rgba(243,237,228,.16);
  border-radius:6px;padding:3px 7px;min-height:24px}
#dbg button.b{cursor:pointer}
#dbg button.b:hover{border-color:#ff2a12}
#dbg button.b.on{background:#e10600;border-color:#ff2a12;color:#fff}
#dbg input[type=text]{width:78px}
#dbg label.t{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:5px;background:rgba(255,255,255,.04);cursor:pointer}
#dbg label.t input{accent-color:#e10600;margin:0}
#dbg .sw{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin-right:3px;border:1px solid rgba(255,255,255,.3)}
#dbg .msg{color:#ffd23a;padding:0 10px 8px}
`;

/**
 * Hidden developer menu: toggle with the Backquote key (`) or ?debug=1. Performance, timings,
 * show/audio state, active cues, system stats, show navigation, system toggles and world tools.
 */
export class DebugMenu {
  private el: HTMLElement;
  private visible: boolean;
  private acc = 1;
  private ctx: FrameContext | null = null;
  private gpu: GpuTimer;
  private tools: DebugTools;
  private pre: Record<string, HTMLPreElement> = {};
  private details: Record<string, HTMLDetailsElement> = {};
  private fpsEl: HTMLElement;
  private msg: HTMLElement;
  private sysSel!: HTMLSelectElement;
  private swatches: HTMLElement[] = [];
  private toggles = new Map<string, HTMLInputElement>();

  constructor(private app: App) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.el = document.createElement('div');
    this.el.id = 'dbg';
    this.el.setAttribute('role', 'region');
    this.el.setAttribute('aria-label', 'Developer menu');
    document.body.appendChild(this.el);
    this.gpu = new GpuTimer(app.renderer.getContext() as WebGL2RenderingContext);
    this.tools = new DebugTools(app);
    this.tools.onMeasure = (t) => this.say(t);

    // header
    const header = document.createElement('header');
    header.innerHTML = '<b>DEV</b><span style="color:#6f6861">Endshow · ` to close</span><span class="fps">--</span>';
    this.fpsEl = header.querySelector('.fps') as HTMLElement;
    const close = document.createElement('button');
    close.textContent = '✕';
    close.setAttribute('aria-label', 'Close developer menu');
    close.addEventListener('click', () => this.setVisible(false));
    header.appendChild(close);
    this.el.appendChild(header);
    this.drag(header);

    this.section('perf', 'PERFORMANCE', true);
    this.section('cpu', 'CPU PER SYSTEM (ms)', true);
    this.section('world', 'PLAYER / CAMERA', true);
    const show = this.section('show', 'SHOW / AUDIO', true);
    const sw = document.createElement('div');
    sw.className = 'row';
    sw.style.paddingTop = '0';
    for (let i = 0; i < 4; i++) {
      const s = document.createElement('span');
      s.className = 'sw';
      this.swatches.push(s);
      sw.appendChild(s);
    }
    const swl = document.createElement('span');
    swl.textContent = 'palette: primary · secondary · accent · atmos';
    swl.style.color = '#6f6861';
    sw.appendChild(swl);
    show.appendChild(sw);
    this.section('cues', 'ACTIVE CUES', false);
    this.section('stats', 'SYSTEM STATS', false);
    this.buildControls();
    this.buildToggles();
    this.buildTools();
    this.msg = document.createElement('div');
    this.msg.className = 'msg';
    this.el.appendChild(this.msg);

    this.visible = app.params.has('debug');
    this.setVisible(this.visible);
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Backquote' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && (t as HTMLInputElement).type === 'text') return;
      e.preventDefault();
      this.setVisible(!this.visible);
    });
    app.onFrame((ctx) => this.frame(ctx));
  }

  private setVisible(on: boolean) {
    this.visible = on;
    debugState.visible = on;
    this.el.classList.toggle('show', on);
    this.gpu.setActive(on);
    this.acc = 1;
  }

  private section(id: string, title: string, open: boolean): HTMLDetailsElement {
    const d = document.createElement('details');
    d.open = open;
    const s = document.createElement('summary');
    s.textContent = title;
    d.appendChild(s);
    const pre = document.createElement('pre');
    d.appendChild(pre);
    this.el.appendChild(d);
    this.pre[id] = pre;
    this.details[id] = d;
    return d;
  }

  private btn(label: string, fn: () => void, title = ''): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = 'b';
    b.type = 'button';
    b.textContent = label;
    if (title) b.title = title;
    b.addEventListener('click', fn);
    return b;
  }

  private row(...els: HTMLElement[]): HTMLElement {
    const r = document.createElement('div');
    r.className = 'row';
    r.append(...els);
    return r;
  }

  private say(t: string) {
    this.msg.textContent = t;
  }

  private buildControls() {
    const app = this.app;
    const d = document.createElement('details');
    d.open = true;
    d.innerHTML = '<summary>SHOW CONTROL</summary>';
    const time = document.createElement('input');
    time.type = 'text';
    time.placeholder = 'mm:ss';
    time.setAttribute('aria-label', 'Jump to time');
    const go = () => {
      const v = parseT(time.value);
      if (Number.isFinite(v)) {
        app.clock.seek(v);
        this.say(`seek → ${fmt(v)}`);
      } else this.say('time: use mm:ss or seconds');
    };
    time.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') go();
      e.stopPropagation();
    });
    d.appendChild(
      this.row(
        this.btn('⟲ restart', () => {
          app.clock.restart();
          this.say('restart');
        }),
        this.btn('▶/❚❚', () => void (app.clock.playing ? app.clock.pause() : app.clock.play().catch(() => undefined))),
        this.btn('-1s', () => app.clock.seek(app.clock.time - 1)),
        this.btn('+1s', () => app.clock.seek(app.clock.time + 1)),
        time,
        this.btn('go', go),
      ),
    );
    this.sysSel = document.createElement('select');
    this.sysSel.setAttribute('aria-label', 'Cue system');
    for (const s of SHOW_SYSTEMS) {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      this.sysSel.appendChild(o);
    }
    const jump = (dir: 1 | -1) => {
      const sys = this.sysSel.value as SystemId;
      const all = app.show.all(sys);
      const t = app.clock.time;
      let c = null;
      if (dir > 0) {
        for (const x of all) if (x.t > t + 0.02) {
          c = x;
          break;
        }
      } else {
        for (let i = all.length - 1; i >= 0; i--) if (all[i].t < t - 0.3) {
          c = all[i];
          break;
        }
      }
      if (!c) {
        this.say(`no ${dir > 0 ? 'next' : 'previous'} ${sys} cue`);
        return;
      }
      app.clock.seek(Math.max(0, c.t - 0.05));
      this.say(`${sys} #${c.id} ${c.fx} @ ${fmt(c.t)} dur ${c.dur.toFixed(2)} ${JSON.stringify(c.p).slice(0, 80)}`);
    };
    d.appendChild(this.row(this.sysSel, this.btn('◀ prev cue', () => jump(-1)), this.btn('next cue ▶', () => jump(1))));
    const mom = document.createElement('select');
    mom.setAttribute('aria-label', 'Moments');
    const fill = () => {
      mom.innerHTML = '<option value="">moments / chapters…</option>';
      for (const m of app.show.file?.moments ?? []) mom.add(new Option(`★ ${fmt(m.t)} ${m.label}`, String(m.t)));
      for (const c of app.show.file?.chapters ?? []) mom.add(new Option(`♪ ${fmt(c.t)} ${c.title}`, String(c.t)));
    };
    mom.addEventListener('focus', fill);
    mom.addEventListener('pointerdown', fill);
    mom.addEventListener('change', () => {
      const v = parseFloat(mom.value);
      if (Number.isFinite(v)) {
        app.clock.seek(v);
        this.say(`seek → ${fmt(v)}`);
      }
    });
    d.appendChild(this.row(mom));
    this.el.appendChild(d);
  }

  private buildToggles() {
    const app = this.app;
    const d = document.createElement('details');
    d.open = true;
    d.innerHTML = '<summary>TOGGLES</summary>';
    const r = this.row();
    const mk = (name: string, get: () => boolean, set: (on: boolean) => void) => {
      const l = document.createElement('label');
      l.className = 't';
      const c = document.createElement('input');
      c.type = 'checkbox';
      c.checked = get();
      c.addEventListener('change', () => set(c.checked));
      l.append(c, document.createTextNode(name));
      this.toggles.set(name, c);
      r.appendChild(l);
    };
    for (const s of TOGGLE_SYSTEMS) mk(s, () => app.isSystemEnabled(s), (on) => app.setSystemEnabled(s, on));
    mk('postfx', () => app.postfx.enabled, (on) => (app.postfx.enabled = on));
    mk('governor', () => app.governor.enabled, (on) => (app.governor.enabled = on));
    d.appendChild(r);
    this.el.appendChild(d);
  }

  private buildTools() {
    const d = document.createElement('details');
    d.open = true;
    d.innerHTML = '<summary>TOOLS</summary>';
    const tools: [ToolId, string, string][] = [
      ['measure', 'measure', 'Click two points on the ground (y = 0)'],
      ['grid', 'grid 10/50 m', '10 m grid with 50 m major lines, x (yellow) / z (cyan) axes'],
      ['coords', 'coordinates', 'Live ground coordinates under the cursor'],
      ['pole', 'height 1.80 m', 'Reference pole next to the player'],
      ['stage', 'stage dims', 'Stage bounding box / dimensions'],
    ];
    const r = this.row();
    for (const [id, label, title] of tools) {
      const b = this.btn(label, () => {
        const on = this.tools.toggle(id);
        b.classList.toggle('on', on);
        if (id === 'measure') this.say(on ? 'measure: click two points on the ground' : '');
        if (id === 'stage') this.say(on ? this.tools.stageText : '');
      }, title);
      r.appendChild(b);
    }
    d.appendChild(r);
    this.el.appendChild(d);
  }

  private drag(handle: HTMLElement) {
    let sx = 0,
      sy = 0,
      ox = 0,
      oy = 0,
      pid = -1;
    handle.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      pid = e.pointerId;
      handle.setPointerCapture(pid);
      const r = this.el.getBoundingClientRect();
      sx = e.clientX;
      sy = e.clientY;
      ox = r.left;
      oy = r.top;
    });
    handle.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      const r = this.el.getBoundingClientRect();
      this.el.style.left = `${Math.max(0, Math.min(window.innerWidth - r.width, ox + e.clientX - sx))}px`;
      this.el.style.top = `${Math.max(0, Math.min(window.innerHeight - 40, oy + e.clientY - sy))}px`;
    });
    const up = (e: PointerEvent) => {
      if (e.pointerId === pid) pid = -1;
    };
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  private frame(ctx: FrameContext) {
    this.ctx = ctx;
    if (!this.visible) return;
    this.gpu.begin();
    this.tools.update();
    this.acc += ctx.dt;
    if (this.acc < 0.25) return;
    this.acc = 0;
    this.refresh();
  }

  /** text refresh at 4 Hz (only open sections are rebuilt) */
  private refresh() {
    const app = this.app;
    const ctx = this.ctx;
    if (!ctx) return;
    const g = app.governor;
    this.fpsEl.textContent = `${g.fps.toFixed(0)} fps · ${g.frameMs.toFixed(1)} ms`;
    const open = (id: string) => this.details[id]?.open;

    if (open('perf')) {
      const mem = app.renderer.info.memory;
      const gpu = this.gpu.supported ? (Number.isNaN(this.gpu.ms) ? 'measuring…' : `${this.gpu.ms.toFixed(2)} ms`) : 'n/a (no EXT_disjoint_timer_query_webgl2)';
      this.pre.perf.textContent =
        `frame   ${g.frameMs.toFixed(2)} ms   ${g.fps.toFixed(1)} fps (median of 45)\n` +
        `gpu     ${gpu}\n` +
        `draws   ${app.lastRender.calls}   tris ${fmtN(app.lastRender.triangles)}\n` +
        `memory  ${mem.geometries} geometries · ${mem.textures} textures\n` +
        `quality ${app.quality.level}   governor ${g.enabled ? 'on' : 'off'} · scale ${g.scale.toFixed(2)}\n` +
        `pixels  ${app.renderer.domElement.width}×${app.renderer.domElement.height} (dpr ${app.renderer.getPixelRatio().toFixed(2)})\n` +
        `gpu id  ${app.device.gpu.slice(0, 60)}`;
    }
    if (open('cpu')) {
      const rows = [...app.timings.entries()].sort((a, b) => b[1] - a[1]);
      const max = Math.max(0.5, ...rows.map((r) => r[1]));
      const total = rows.reduce((s, r) => s + r[1], 0);
      this.pre.cpu.textContent =
        rows.map(([n, ms]) => `${n.padEnd(12)}${ms.toFixed(2).padStart(6)} ${'█'.repeat(Math.round((ms / max) * 14))}${app.isSystemEnabled(n) ? '' : '  (off)'}`).join('\n') + `\n${'total'.padEnd(12)}${total.toFixed(2).padStart(6)}`;
    }
    if (open('world')) {
      const p = app.playerPos;
      const c = app.camera;
      const rig = app.get('camera') as unknown as { mode?: string } | undefined;
      const pl = app.get('player') as unknown as { yaw?: number; pitch?: number } | undefined;
      this.pre.world.textContent =
        `player  x ${p.x.toFixed(2)}  y ${p.y.toFixed(2)}  z ${p.z.toFixed(2)}\n` +
        `camera  x ${c.position.x.toFixed(2)}  y ${c.position.y.toFixed(2)}  z ${c.position.z.toFixed(2)}\n` +
        `look    yaw ${(pl?.yaw ?? c.rotation.y).toFixed(3)}  pitch ${(pl?.pitch ?? c.rotation.x).toFixed(3)}  fov ${c.fov.toFixed(1)}\n` +
        `mode    ${rig?.mode ?? '?'}   ?cam=${c.position.x.toFixed(1)},${c.position.y.toFixed(1)},${c.position.z.toFixed(1)},${c.rotation.y.toFixed(3)},${c.rotation.x.toFixed(3)}`;
    }
    if (open('show')) {
      const clk = app.clock;
      const sec = app.show.section(ctx.showTime);
      const ch = app.show.chapterAt(ctx.showTime);
      const b = ctx.beat;
      this.pre.show.textContent =
        `show    ${fmt(ctx.showTime)} (${ctx.showTime.toFixed(2)} s) ${clk.playing ? '▶' : '❚❚'} / ${fmt(app.show.duration)}\n` +
        `audio   ${clk.track.kind} · t ${clk.track.getTime().toFixed(2)} s · drift ${(clk.drift * 1000).toFixed(0)} ms${clk.track.coarseClock ? ' (coarse)' : ''}\n` +
        `tempo   ${b.bpm.toFixed(1)} bpm · beat ${b.beat.toFixed(2)} · bar ${Math.floor(b.bar)} · kick ${b.kick.toFixed(2)}${b.hasKick ? '' : ' (no kick)'}\n` +
        `section ${sec ? `${sec.label} [${sec.kind}] energy ${sec.energy.toFixed(2)} palette ${sec.palette}` : '-'}\n` +
        `track   ${ch ? `${ch.artist} — ${ch.title}` : '-'}\n` +
        `cues    ${app.show.cueCount} compiled · rev ${app.show.revision}`;
      const pal = app.palette;
      const cols = [pal.primary, pal.secondary, pal.accent, pal.atmos];
      for (let i = 0; i < 4; i++) this.swatches[i].style.background = `#${cols[i].getHexString()}`;
    }
    if (open('cues')) {
      const lines: string[] = [];
      for (const s of SHOW_SYSTEMS) {
        const act = app.show.active(s, ctx.showTime);
        if (!act.length) continue;
        const fx = new Map<string, number>();
        for (const c of act) fx.set(c.fx, (fx.get(c.fx) ?? 0) + 1);
        lines.push(`${s.padEnd(10)}${String(act.length).padStart(3)}  ${[...fx].map(([k, n]) => (n > 1 ? `${k}×${n}` : k)).join(' ')}`);
      }
      this.pre.cues.textContent = lines.length ? lines.join('\n') : 'no active cues';
    }
    if (open('stats')) {
      const lines: string[] = [];
      for (const s of app.allSystems()) {
        let st: Record<string, number | string> = {};
        try {
          st = s.stats?.() ?? {};
        } catch (e) {
          st = { error: String(e) };
        }
        const kv = Object.entries(st);
        if (kv.length) lines.push(`${s.name.padEnd(12)}${kv.map(([k, v]) => `${k}=${typeof v === 'number' ? fmtN(v) : v}`).join(' ')}`);
      }
      const pf = app.postfx.stats?.() ?? {};
      lines.push(`${'postfx'.padEnd(12)}${Object.entries(pf).map(([k, v]) => `${k}=${v}`).join(' ')}`);
      lines.push(`${'world'.padEnd(12)}colliders=${app.colliders.length} interactables=${app.interactables.length} spots=${app.spots.length}`);
      this.pre.stats.textContent = lines.join('\n');
    }
    for (const [name, c] of this.toggles) {
      const on = name === 'postfx' ? app.postfx.enabled : name === 'governor' ? app.governor.enabled : app.isSystemEnabled(name);
      if (c.checked !== on) c.checked = on;
    }
  }
}

function fmt(t: number): string {
  const s = Math.max(0, t);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
}

function fmtN(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e3).toFixed(1)}k`;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function parseT(s: string): number {
  const str = s.trim();
  if (/^\d+(\.\d+)?$/.test(str)) return parseFloat(str);
  const parts = str.split(':').map(Number);
  if (!parts.length || parts.some((x) => !Number.isFinite(x))) return NaN;
  return parts.reduce((a, p) => a * 60 + p, 0);
}
