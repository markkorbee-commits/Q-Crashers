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
    box(120, 1.9, 18, 0, 0, -9); // deck
    box(96, 9.3, 8, 0, 0, -10); // castle wall
    for (const s of [-1, 1]) {
      box(5, 15.5, 5, s * 20, 0, -8);
      box(5, 14.5, 5, s * 34, 0, -8);
      box(5, 13.5, 5, s * 46, 0, -8);
      box(0.9, 16, 0.9, s * 10.8, 0, -1.5); // PA truss tower
      // side section along (±60,0)->(±88,24)
      const len = Math.hypot(28, 24);
      const side = new THREE.Mesh(new THREE.BoxGeometry(len, 7.5, 5), this.setMat);
      side.position.set(s * 74, 3.75, 12 - 2.5);
      side.rotation.y = -s * Math.atan2(24, 28);
      this.group.add(side);
      // wing membrane: triangle fan between the three spars
      const shape = new THREE.Shape();
      shape.moveTo(s * 7, 13);
      shape.lineTo(s * 14, 24);
      shape.lineTo(s * 21, 17);
      shape.lineTo(s * 28, 26);
      shape.lineTo(s * 34, 18);
      shape.lineTo(s * 39, 24);
      shape.lineTo(s * 44, 6.5);
      shape.lineTo(s * 20, 10);
      shape.closePath();
      const wing = new THREE.Mesh(new THREE.ShapeGeometry(shape), this.wingMat);
      wing.position.z = -13.4;
      this.group.add(wing);
    }
    box(9, 8, 8, 0, 11, -5); // dragon head
    // lantern pillars
    for (const p of resolvePillars(app.anchors)) {
      const shaftMat = new THREE.MeshStandardMaterial({ color: 0x2c2a2a, roughness: 0.85, emissive: 0x000000 });
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.2, p.top.y - 3, 3.2), shaftMat);
      shaft.position.set(p.top.x, (p.top.y - 3) / 2, p.top.z);
      const lampMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(1.3, 0), lampMat);
      lamp.scale.set(1, 1.5, 1);
      lamp.position.set(p.top.x, p.top.y - 1.2, p.top.z);
      this.group.add(shaft, lamp);
      this.shafts.push(shaftMat);
      this.lamps.push(lampMat);
    }
    const foh = app.anchors.get('foh')[0] ?? new THREE.Vector3(0, 8, 110);
    void foh; // no FOH proxy: the default FOH anchor sits right in front of the 'foh' spot
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
