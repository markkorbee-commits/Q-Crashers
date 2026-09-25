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
  await app.init();
  ui.onReady();
}

void boot();
