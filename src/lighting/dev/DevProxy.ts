import * as THREE from 'three';
import type { App } from '../../core/App';
import type { FrameContext } from '../../core/types';
import type { CueDef, ShowFile } from '../../show/ShowTypes';
import { resolvePillars } from '../rig';

/**
 * Developer aids for the lighting system (only loaded with ?lightsdev / ?lightstest):
 *  - DevProxy: a crude night set (sky, floor, stage silhouette, lantern pillars reading app.env)
 *    so the rig can be judged while the world / stage modules are stubs.
 *  - injectTestShow: a local cue list that exercises every lights / strobe fx and preset.
 */
export class DevProxy {
  private readonly group = new THREE.Group();
  private readonly setMat: THREE.MeshStandardMaterial;
  private readonly wingMat = new THREE.MeshStandardMaterial({ color: 0x3a1c16, roughness: 0.8, side: THREE.DoubleSide, emissive: 0x000000 });
  private readonly lamps: THREE.MeshBasicMaterial[] = [];
  private readonly shafts: THREE.MeshStandardMaterial[] = [];

  constructor(private app: App) {
    this.group.name = 'LightsDevProxy';
    // sky dome: blue hour gradient
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 top = vec3(0.004,0.008,0.03); vec3 hor = vec3(0.02,0.04,0.11); vec3 c = mix(hor, top, smoothstep(0.0, 0.45, h)); c = mix(vec3(0.004), c, smoothstep(-0.05, 0.02, h)); gl_FragColor = vec4(c, 1.0); }',
      }),
    );
    sky.renderOrder = -10;
    this.group.add(sky);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.92 }));
    floor.position.set(0, 0, 150);
    this.group.add(floor);
    this.group.add(new THREE.HemisphereLight(0x3a4a90, 0x101218, 1.4));

    this.setMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.8, emissive: 0x000000 });
    const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.setMat);
      m.position.set(x, y + h / 2, z);
      this.group.add(m);
    };
    // design-bible §5 massing
    box(74, 1.9, 14, 0, 0, -7); // central deck
    box(74, 9.5, 8, 0, 0, -16); // castle core, facade Z -12
    box(9, 8, 8, -2.5, 10, -9); // dragon head
    for (const s of [-1, 1]) {
      box(5.5, 16, 5.5, s * 14, 0, -14.75);
      box(5.5, 14, 5.5, s * 24, 0, -14.75);
      box(55, 9.5, 18, s * 64.5, 0, -13); // side section, front wall Z -4
      for (const x of [48, 63, 78]) box(5, 13.5, 5, s * x, 0, -12.5);
      box(6, 15, 6, s * 92, 0, -4); // corner tower
      box(2, 5.9, 62, s * 93, 0, 27); // forward arm rampart
      box(4, 12.5, 4, s * 94, 0, 58); // arm-end turret
      box(1, 16.5, 1, s * 11, 0, -4); // PA hang towers
      box(1, 16.5, 1, s * 31, 0, -6);
      // wing membrane between the three finger spars, plane Z -20
      const shape = new THREE.Shape();
      shape.moveTo(s * 5, 14);
      shape.lineTo(s * 14.5, 26.5);
      shape.lineTo(s * 20, 18.5);
      shape.lineTo(s * 29, 28);
      shape.lineTo(s * 34.5, 18.5);
      shape.lineTo(s * 40.5, 26.5);
      shape.lineTo(s * 41, 11);
      shape.lineTo(s * 22, 12.5);
      shape.closePath();
      const wing = new THREE.Mesh(new THREE.ShapeGeometry(shape), this.wingMat);
      wing.position.z = -20.3;
      this.group.add(wing);
    }
    // lantern pillars (obelisks): shaft 2.6, capital 3.4 at Y 8.8-9.6, crystal Y 9.6-12.8
    for (const p of resolvePillars(app.anchors)) {
      const shaftMat = new THREE.MeshStandardMaterial({ color: 0x2c2a2a, roughness: 0.85, emissive: 0x000000 });
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.6, p.capitalY - 0.8, 2.6), shaftMat);
      shaft.position.set(p.top.x, (p.capitalY - 0.8) / 2, p.top.z);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 3.4), this.setMat);
      cap.position.set(p.top.x, p.capitalY - 0.4, p.top.z);
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.4, 8.5), this.setMat);
      plinth.position.set(p.top.x, 0.2, p.top.z);
      const lampMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(1.25, 0), lampMat);
      lamp.scale.set(1, 1.28, 1);
      lamp.position.set(p.top.x, (p.capitalY + p.top.y) / 2, p.top.z);
      this.group.add(shaft, cap, plinth, lamp);
      this.shafts.push(shaftMat);
      this.lamps.push(lampMat);
    }
    box(12.8, 0.5, 6, 0, 0, 90); // FOH / camera platform
    app.scene.add(this.group);
    // the terrain stub's 40 m placeholder block hides the rig
    const ph = app.scene.getObjectByName('placeholder-stage');
    if (ph) ph.visible = false;
  }

  update(_ctx: FrameContext): void {
    const env = this.app.env;
    const ph = this.app.scene.getObjectByName('placeholder-stage');
    if (ph) ph.visible = false;
    this.setMat.emissive.copy(env.stageWashColor).multiplyScalar(env.stageWashIntensity * 0.12 + env.strobe * 0.6);
    this.wingMat.emissive.copy(env.stageWashColor).multiplyScalar(env.stageWashIntensity * 0.35 + env.strobe * 0.6);
    for (let i = 0; i < this.lamps.length; i++) {
      const m = env.pillarChase.length ? (env.pillarChase[i] ?? 1) : 1;
      this.lamps[i].color.copy(env.pillarLampColor).multiplyScalar(env.pillarLampIntensity * m * 6);
      this.shafts[i].emissive.copy(env.pillarShaftColor).multiplyScalar(env.pillarShaftIntensity * 0.12);
    }
  }
}

/** Replace the show's cue list with a local test covering every lights / strobe fx. */
export function injectTestShow(app: App): void {
  const cues: CueDef[] = [];
  const look = (t: number, dur: number, preset: string, p: Record<string, unknown> = {}) => cues.push({ t, dur, sys: 'lights', fx: 'look', p: { preset, ...p } });
  // 8 s per preset, 150 bpm (bar = 1.6 s)
  look(0, 8, 'ambient', { color: 'blue', color2: 'cyan' });
  look(8, 8, 'sweep', { color: 'white' });
  look(16, 8, 'fan', { color: 'white', groups: ['truss', 'floor'] });
  look(16, 8, 'sky', { color: 'white', groups: ['towers'], intensity: 0.6 });
  look(24, 8, 'ballyhoo', { color: 'ice', color2: 'white' });
  look(32, 8, 'circle', { color: 'cyan', color2: 'blue' });
  look(40, 8, 'tilt_wave', { color: 'magenta', color2: 'white' });
  look(48, 8, 'audience', { color: 'warm' });
  look(56, 8, 'crosshatch', { color: 'purple', color2: 'white' });
  look(64, 8, 'sky', { color: 'blue' });
  look(72, 8, 'pulse', { color: 'red', color2: 'white' });
  look(80, 8, 'still', { color: 'ice', beam: 'wide' });
  look(88, 8, 'dark');
  look(96, 8, 'fan', { color: 'red', color2: 'orange', kick: true });
  look(104, 8, 'ballyhoo', { color: 'white' });
  look(112, 8, 'sweep', { color: 'white', groups: ['truss', 'floor'] });
  look(112, 8, 'sky', { color: 'green', groups: ['towers', 'field'] });
  look(120, 40, 'fan', { color: 'magenta', color2: 'white' });
  look(160, 20, 'fan', { color: 'white', speed: 0.25 });
  look(180, 20, 'audience', { color: 'white' });
  // reference moments of the 2026 Endshow (storyboard frames)
  look(200, 10, 'fan', { color: 'white', groups: ['truss', 'floor'] }); // f080: red stage, white fans
  look(210, 10, 'fan', { color: 'white', tilt: 72, spread: 22, groups: ['truss'] }); // f029: magenta, white sky fans
  look(220, 10, 'ballyhoo', { color: 'ice', color2: 'white', speed: 1.5 }); // f124: ice-white beam storm
  look(230, 10, 'sky', { color: 'blue', groups: ['truss', 'floor'] }); // f030: blue sky beams
  look(240, 10, 'fan', { color: 'ice', color2: 'blue', groups: ['floor', 'truss'], spread: 44 }); // f126
  cues.push({ t: 220, dur: 10, sys: 'strobe', fx: 'kick', target: ['deck', 'roof'] });
  // hits, chases, blinders, strobes
  cues.push({ t: 97.6, dur: 0.6, sys: 'lights', fx: 'hit', p: { color: 'white' }, repeat: { every: 'bar', until: 104 } });
  cues.push({ t: 96, dur: 8, sys: 'strobe', fx: 'kick', target: 'deck' });
  cues.push({ t: 104, dur: 2, sys: 'strobe', fx: 'burst', p: { rate: 14 } });
  cues.push({ t: 106, dur: 0.4, sys: 'lights', fx: 'blinder', repeat: { every: 'bar', count: 3 } });
  cues.push({ t: 110.5, sys: 'strobe', fx: 'hit', target: ['wings', 'towers_top'] });
  cues.push({ t: 112, dur: 8, sys: 'lights', fx: 'chase', p: { pattern: 'lr', every: 'beat', color: 'cyan' } });
  cues.push({ t: 120, dur: 12, sys: 'lights', fx: 'chase', p: { pattern: 'center_out', every: 'halfbeat' } });
  cues.push({ t: 132, dur: 8, sys: 'lights', fx: 'chase', p: { pattern: 'random', every: 'beat', color: 'white' } });
  cues.push({ t: 140, dur: 1, sys: 'lights', fx: 'blinder', target: 'deck' });
  // stage wash
  const wash = (t: number, dur: number, color: string, intensity: number) => cues.push({ t, dur, sys: 'lights', fx: 'wash', p: { color, intensity } });
  wash(0, 40, 'blue', 0.5);
  wash(40, 40, 'red', 0.8);
  wash(80, 16, 'cyan', 0.6);
  wash(96, 24, 'red', 1);
  wash(120, 80, 'magenta', 0.8);
  wash(200, 10, 'red', 1);
  wash(210, 10, 'magenta', 1);
  wash(220, 10, 'ice', 0.6);
  wash(230, 20, 'blue', 0.7);
  // lantern pillars
  const pil = (t: number, dur: number, p: Record<string, unknown>) => cues.push({ t, dur, sys: 'lights', fx: 'pillars', p });
  pil(0, 40, { color: '#4a86d8', mode: 'steady' });
  pil(40, 24, { color: 'amber', shaft: 'red', mode: 'flicker' });
  pil(64, 24, { color: 'cyan', mode: 'steady' });
  pil(88, 8, { color: 'white', mode: 'chase' });
  pil(96, 8, { color: 'red', mode: 'pulse' });
  pil(104, 8, { mode: 'off' });
  pil(112, 88, { color: '#ff5a3a', shaft: 'green', shaftIntensity: 1, mode: 'steady' });
  pil(200, 10, { color: 'amber', shaft: 'red', mode: 'flicker' });
  pil(210, 10, { color: '#ffb040', shaft: 'purple', mode: 'flicker' });
  pil(220, 30, { color: 'cyan', shaft: 'blue', mode: 'steady' });

  const file: ShowFile = {
    ...app.show.file,
    tempo: [{ start: 0, end: 1581, bpm: 150, anchor: 0, kick: true }],
    sections: [
      { start: 0, end: 40, label: 'test cold', kind: 'build', energy: 0.5, palette: 'blue' },
      { start: 40, end: 80, label: 'test fire', kind: 'drop', energy: 0.9, palette: 'red' },
      { start: 80, end: 120, label: 'test ice', kind: 'climax', energy: 1, palette: 'ice' },
      { start: 120, end: 1581, label: 'test anthem', kind: 'drop', energy: 0.9, palette: 'magenta' },
    ],
    palettes: {
      blue: { primary: '#1f4dff', secondary: '#12e8ff', accent: '#ffffff' },
      red: { primary: '#ff1206', secondary: '#ff6a00', accent: '#ffffff' },
      ice: { primary: '#9fd8ff', secondary: '#1f4dff', accent: '#ffffff' },
      magenta: { primary: '#ff1ab8', secondary: '#8a1cff', accent: '#ffffff' },
    },
    cues: [...app.show.file.cues.filter((c) => c.sys !== 'lights' && c.sys !== 'strobe'), ...cues],
  };
  app.show.setFile(file);
}
