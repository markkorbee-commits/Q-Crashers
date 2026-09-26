import './ui/styles.css';
import { AmbienceSystem } from './audio/AmbienceSystem';
import { BarSystem } from './bar/BarSystem';
import { CameraRig } from './camera/CameraRig';
import { App } from './core/App';
import { CrowdSystem } from './crowd/CrowdSystem';
import { FireworkSystem } from './fireworks/FireworkSystem';
import { FogSystem } from './fx/FogSystem';
import { PerceptionSystem } from './intoxication/PerceptionSystem';
import { LaserSystem } from './lasers/LaserSystem';
import { LightingSystem } from './lighting/LightingSystem';
import { TouchControls } from './mobile/TouchControls';
import { PlayerController } from './player/PlayerController';
import { PyroSystem } from './pyro/PyroSystem';
import { MainStageSystem } from './stage/MainStage';
import { UI } from './ui/UI';
import { EnvironmentSystem } from './world/Environment';
import { GroundsSystem } from './world/Grounds';
import { TerrainSystem } from './world/Terrain';

/**
 * The developer menu (` key or ?debug) is loaded on demand: it is a separate chunk that regular
 * visitors never download. The first ` press loads it and then opens it.
 */
function installDebugMenu(app: App): void {
  let loading: Promise<void> | null = null;
  const load = (open: boolean) =>
    (loading ??= import('./debug/DebugMenu')
      .then(({ DebugMenu }) => {
        window.removeEventListener('keydown', onKey);
        new DebugMenu(app); // opens itself with ?debug and handles ` from now on
        if (open && !app.params.has('debug')) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote', key: '`' }));
      })
      .catch((e) => {
        loading = null;
        console.warn('[debug] developer menu failed to load', e);
      }));
  const onKey = (e: KeyboardEvent) => {
    if (e.code !== 'Backquote' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && (t as HTMLInputElement).type === 'text') return;
    e.preventDefault();
    void load(true);
  };
  if (app.params.has('debug')) void load(false);
  else window.addEventListener('keydown', onKey);
}

/**
 * A failed start (show file unreachable, a system throwing outside its guarded init, no GPU memory)
 * must never leave the visitor on a frozen loading bar: show what happened and offer a retry.
 */
function showFatal(err: unknown): void {
  console.error('[boot] start failed', err);
  const msg = err instanceof Error ? err.message : String(err);
  const box = document.createElement('div');
  box.className = 'fatal';
  box.setAttribute('role', 'alert');
  box.style.cssText =
    'position:fixed;inset:0;z-index:100000;margin:0;max-width:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;background:#050508;color:#e8e2dc;font:15px/1.5 system-ui,sans-serif;text-align:center';
  const h = document.createElement('h1');
  h.textContent = 'DEFQON.1 2026 — THE ENDSHOW EXPERIENCE';
  h.style.cssText = 'font-size:18px;letter-spacing:.12em;margin:0;color:#ff3b2f';
  const p1 = document.createElement('p');
  p1.textContent = 'The experience could not start.';
  p1.style.margin = '0';
  const p2 = document.createElement('p');
  p2.textContent = msg;
  p2.style.cssText = 'margin:0;max-width:560px;opacity:.7;font-size:13px;word-break:break-word';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Retry';
  btn.style.cssText = 'margin-top:8px;padding:10px 28px;border-radius:999px;border:1px solid #ff3b2f;background:#ff3b2f;color:#fff;font:600 14px system-ui,sans-serif;letter-spacing:.08em;cursor:pointer';
  btn.addEventListener('click', () => location.reload());
  box.append(h, p1, p2, btn);
  document.body.appendChild(box);
  btn.focus();
}

async function boot() {
  const root = document.getElementById('app')!;
  let app: App;
  try {
    app = new App({ canvasParent: root, showUrl: './show/endshow-2026.json' });
  } catch (e) {
    root.innerHTML = `<div class="fatal"><h1>DEFQON.1 2026 — THE ENDSHOW EXPERIENCE</h1><p>${(e as Error).message}</p><p>Please use a recent version of Chrome, Edge, Firefox or Safari with hardware acceleration enabled.</p></div>`;
    return;
  }
  (window as any).__app = app;

  // Update order matters: emitters write app.env, receivers read it.
  app.register(
    new EnvironmentSystem(),
    new MainStageSystem(),
    new LightingSystem(),
    new LaserSystem(),
    new PyroSystem(),
    new FireworkSystem(),
    new FogSystem(),
    new TerrainSystem(),
    new GroundsSystem(),
    new BarSystem(),
    new CrowdSystem(),
    new PlayerController(),
    new CameraRig(),
    new PerceptionSystem(),
    new AmbienceSystem(),
  );

  const ui = new UI(app, root);
  installDebugMenu(app);
  if (app.device.touch) new TouchControls(app, root).enable();
  app.start();
  try {
    await app.init();
  } catch (e) {
    app.stop();
    showFatal(e);
    return;
  }
  ui.onReady();
}

void boot();
