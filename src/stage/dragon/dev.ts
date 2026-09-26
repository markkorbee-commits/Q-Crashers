/**
 * DEV ONLY (never imported by production code): mounts the DragonCrown into a running app for
 * screenshots, with an optional grey placeholder castle/deck/PA for context, and drives the
 * StageLook from named presets.
 *
 *   node scripts/shot.mjs "autostart&cam=0,1.7,120,0,0.1" out.png \
 *     --eval "import('/src/stage/dragon/dev.ts').then(m => m.installCrownDev(__app, {preset:'magenta'}))"
 */
import * as THREE from 'three';
import type { App } from '../../core/App';
import type { FrameContext } from '../../core/types';
import { DragonCrown } from '../DragonCrown';
import { createStageLookEx, type StageLook } from '../StageLook';

export interface DevOpts {
  preset?: string;
  castle?: boolean;
  pattern?: number;
  jaw?: number;
  /** freeze LED phase / rosette angle to this value (s) */
  t?: number;
  /** override the camera field of view (deg) */
  fov?: number;
  /** aim the camera at this world point */
  look?: [number, number, number];
  /** kick pulse 0..1 */
  pulse?: number;
  /** pyro/firework flash colour (premultiplied), e.g. '#ff8030' */
  flash?: string;
  /** override the stage mode */
  mode?: StageLook['mode'];
}

type Preset = (l: StageLook, t: number) => void;

const P: Record<string, Preset> = {
  dormant: (l) => {
    l.mode = 'dormant';
    l.wash.set('#301018');
    l.washIntensity = 0.25;
    l.ledIntensity = 0.12;
    l.led.set('#ff2a10');
    l.led2.set('#2a60ff');
    l.eyes.set('#ff5a00');
    l.eyesIntensity = 0.3;
    l.mouth = 0.15;
    l.wings = 0.1;
    l.rosettes.set('#502080');
  },
  magenta: (l) => {
    l.mode = 'awake';
    l.wash.set('#ff2a70');
    l.washIntensity = 0.7;
    l.led.set('#ff4a9a');
    l.led2.set('#a050ff');
    l.ledIntensity = 0.8;
    l.eyes.set('#ffb070');
    l.eyesIntensity = 1;
    l.mouth = 0.8;
    l.wings = 0.6;
    l.rosettes.set('#b040ff');
  },
  blue: (l) => {
    l.mode = 'awake';
    l.wash.set('#2a48ff');
    l.washIntensity = 0.7;
    l.led.set('#ff6a1a');
    l.led2.set('#40a0ff');
    l.ledIntensity = 0.9;
    l.eyes.set('#ff7a20');
    l.eyesIntensity = 1;
    l.mouth = 0.7;
    l.wings = 0.9;
    l.rosettes.set('#ffe0b0');
  },
  green: (l) => {
    l.mode = 'rage';
    l.wash.set('#20c040');
    l.washIntensity = 0.65;
    l.led.set('#ff2a10');
    l.led2.set('#30ff60');
    l.ledIntensity = 0.9;
    l.eyes.set('#ff1a00');
    l.eyesIntensity = 1;
    l.mouth = 0.9;
    l.wings = 0.7;
    l.rosettes.set('#ff3010');
  },
  red: (l) => {
    l.mode = 'rage';
    l.wash.set('#ff1a08');
    l.washIntensity = 0.7;
    l.led.set('#ff7a10');
    l.led2.set('#ffd060');
    l.ledIntensity = 1;
    l.eyes.set('#ffcc40');
    l.eyesIntensity = 1;
    l.mouth = 1;
    l.wings = 1;
    l.rosettes.set('#ff8020');
  },
  white: (l) => {
    l.mode = 'awake';
    l.wash.set('#ffffff');
    l.washIntensity = 0.7;
    l.led.set('#ffffff');
    l.led2.set('#80c0ff');
    l.ledIntensity = 0.5;
    l.eyes.set('#ff6010');
    l.eyesIntensity = 1;
    l.mouth = 0.6;
    l.wings = 0.5;
    l.rosettes.set('#ffffff');
  },
};

export async function installCrownDev(app: App, o: DevOpts = {}): Promise<Record<string, number | string>> {
  const crown = new DragonCrown();
  await crown.build(app.quality);
  app.scene.add(crown.group);
  // the terrain stub's placeholder stage block would hide the crown
  app.scene.getObjectByName('placeholder-stage')?.removeFromParent();
  if (o.castle !== false) app.scene.add(placeholderCastle(crown));
  const look = createStageLookEx();
  const preset = P[o.preset ?? 'magenta'] ?? P.magenta;
  app.onFrame((ctx: FrameContext) => {
    const t = o.t ?? ctx.showTime;
    preset(look, t);
    look.wingLed.copy(look.led);
    look.wingLed2.copy(look.led2);
    look.ledPattern = o.pattern ?? 0;
    look.ledPhase = t * 2.5;
    look.rosetteAngle = t * 0.6;
    look.jaw = o.jaw ?? 0.6;
    look.pulse = o.pulse ?? 0;
    if (o.flash) look.flash.set(o.flash);
    if (o.mode) look.mode = o.mode;
    crown.update(ctx, look);
    if (o.fov) {
      ctx.camera.fov = o.fov;
      ctx.camera.updateProjectionMatrix();
    }
    if (o.look) {
      ctx.camera.lookAt(o.look[0], o.look[1], o.look[2]);
      ctx.camera.updateMatrixWorld();
    }
  });
  (window as unknown as { __crown: DragonCrown }).__crown = crown;
  return crown.stats();
}

/** Grey block-out of the castle, deck and PA (dev context only; the real one is MainStage's). */
function placeholderCastle(crown: DragonCrown): THREE.Group {
  const g = new THREE.Group();
  g.name = 'dev-castle';
  const stone = new THREE.MeshStandardMaterial({ color: '#242226', roughness: 0.9, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.6, metalness: 0.3 });
  const red = new THREE.MeshStandardMaterial({ color: '#5c0a19', roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: '#b08d57', roughness: 0.4, metalness: 0.8 });
  crown.applyWashRig(stone, 'dev-stone');
  crown.applyWashRig(dark, 'dev-dark');
  crown.applyWashRig(red, 'dev-red');
  crown.applyWashRig(gold, 'dev-gold');
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y + h / 2, z);
    g.add(b);
    return b;
  };
  // design bible §5.4-5.5, 5.9: deck Z -14..0 (top 1.9), facade Z -12, wall top 9.5, towers at
  // X ±14 (top 16) and ±24 (top 14), portal 5.4 m wide / apex 7.2 at Z -6, shield Y 7.4-9.0
  box(74, 1.9, 14, 0, 0, -7, red);
  box(110, 1.9, 10, 0, 0, -9, red);
  box(33, 9.5, 3, -20.5, 0, -13.5, stone);
  box(33, 9.5, 3, 20.5, 0, -13.5, stone);
  box(8, 7.4, 3, 0, 0, -13.5, stone);
  box(12, 5.5, 5, 0, 0, -9.5, stone);
  box(5.4, 5.3, 0.6, 0, 1.9, -6.2, dark);
  box(6.4, 0.6, 1.0, 0, 7.2, -6.4, gold);
  box(1.8, 1.6, 0.4, 0, 7.4, -6.6, gold);
  for (let x = -36; x <= 36; x += 2.4) if (Math.abs(x) > 4.5) box(1.2, 1.0, 3, x, 9.5, -13.5, stone);
  for (const x of [-24, -14, 14, 24]) {
    const h = Math.abs(x) < 20 ? 16 : 14;
    box(5.5, h, 5.5, x, 0, -12.5, stone);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(3.9, 3, 4), stone);
    cap.position.set(x, h + 1.5, -12.5);
    cap.rotation.y = Math.PI / 4;
    g.add(cap);
  }
  // side sections
  box(55, 9.5, 3, -64.5, 0, -5.5, stone);
  box(55, 9.5, 3, 64.5, 0, -5.5, stone);
  for (const x of [-78, -63, -48, 48, 63, 78]) box(5, 13.5, 5, x, 0, -6, stone);
  for (const [x, z] of [[-11, -4], [11, -4], [-31, -6], [31, -6]]) {
    box(1.34, 9.3, 1.2, x, 4.9, z, dark);
    box(1.0, 16.5, 1.0, x + Math.sign(x) * 1.25, 0, z, dark);
  }
  return g;
}
