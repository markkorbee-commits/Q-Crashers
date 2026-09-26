import * as THREE from 'three';
import type { LightEnv } from '../core/LightEnv';
import { Rng } from '../core/rng';
import { GeoBuilder, lin } from './geom';
import { PILLAR, PILLARS } from './site';
import { barrierMaterial } from './structures';
import { BARRIER_SOLID_UV, canvasTexture, makeCanvas } from './tex';
import { patchWorldMaterial, pillarChase } from './worldLights';

/**
 * The lantern pillars of the 2026 RED field = the 8 delay towers (design-bible §5.10, round 4 from the
 * daytime photos day2 / day3 and the official Endshow photo P; the night look from the video, e.g.
 * 1272–1276 s: dark shafts with a blue uplit foot, bright glowing lantern bowls):
 *  - a square black crowd-barrier fence (Mojo-style panels, grey foot plates outside) around a black
 *    equipment deck with road cases, an amp rack and two SFX launchers at the front corners (photo P:
 *    the angled "cannon" silhouettes inside the fences)
 *  - a stone base block, then a SLIM 1.8 m square shaft of white-painted stone blocks: a round-topped
 *    window niche low on every face (with a small robed figure), a mid niche and a small high window,
 *    RGB LED strips in the four edges (the "shaft" colour) and four uplights on the base ledge
 *  - one delay line array hung on the audience (+Z) face (day2), a stone cornice, a black steel
 *    lighting band and top plate (the moving heads on it are the lighting rig's), a red-bronze neck
 *  - the crystal lantern, turned 45° to the shaft: a flat inverted glass pyramid that glows in the lamp
 *    colour with a bright point at its bottom apex, a chrome girdle band, and a SILVER faceted glass
 *    pyramid with a chrome frame and finial (no dark hood)
 * Lamp + shaft colours/intensities come from app.env.pillar* (written by the lighting engineer),
 * per-pillar multipliers from app.env.pillarChase[i] (i = order of PILLARS / anchors pillars_top).
 * The glass emission is soft-limited in the shader so saturated lamp colours keep their hue.
 * Draw calls: 5 instanced meshes for all 8 pillars (stone, metal, glass, barrier, halo); on mobile 4
 * (the metal merges into the stone mesh) and the small props (cases, launchers, uplights, foot plates,
 * frame ribs, the per-box array) are left out.
 */

type Rect = [number, number, number, number];
// atlas regions (u0, v0, u1, v1), texture v up (CanvasTexture flipY)
const R_SHAFT: Rect = [0, 0, 0.5, 1];
const R_STONE: Rect = [0.5, 0, 1, 0.5];
const R_ARRAY: Rect = [0.5, 0.5, 0.75, 0.75];
const R_CASE: Rect = [0.75, 0.5, 1, 0.75];
const R_BLACK: Rect = [0.5, 0.75, 0.75, 1];
const R_TRIM: Rect = [0.75, 0.75, 1, 1];

/** dev `?daylight` (art review against the daytime photos): true albedo, every pillar emitter off */
const DAYLIGHT = typeof location !== 'undefined' && new URLSearchParams(location.search).has('daylight');
/**
 * The white-painted stone (day photos) has ~5.5x the albedo of the dark stone the night looks were
 * calibrated on (video 1272–1276 s: dark shafts, bright crystals; photo P: silhouetted pillars under
 * the fireworks): in the show the stone albedo is scaled back by the texture-mean ratio old / new, so
 * the uplight graze, the lantern pools and the flashes keep their calibrated levels. `?daylight` shows
 * the true albedo.
 */
const STONE_NIGHT_K = 0.18;
/**
 * uplight wash on the shaft (emission per unit of shaft colour × true paint albedo at the base): the video
 * shows the lower shafts clearly glowing in the shaft colour (26 s amber, 920 s green, 1272 s blue)
 */
const GRAZE_K = 1.4;
/** silver glass: keeps some sheen under the flashes, but no bright crystal "ghost" when the lamp is off */
const GLASS_NIGHT_K = 0.5;

const UP = new THREE.Vector3(0, 1, 0);
const T = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);

export class LanternPillars {
  readonly group = new THREE.Group();
  private halo!: THREE.InstancedMesh;
  private chase: THREE.InstancedBufferAttribute;
  private readonly U = {
    uShaftCol: { value: new THREE.Color() },
    uLampColP: { value: new THREE.Color() },
    uHaloK: { value: 1 },
    uHaloSize: { value: 3.8 },
    uStoneK: { value: DAYLIGHT ? 1 : STONE_NIGHT_K },
    uGlassK: { value: DAYLIGHT ? 1 : GLASS_NIGHT_K },
  };
  triangles = 0;

  constructor(texSize: number, private lowDetail: boolean) {
    this.group.name = 'lantern-pillars';
    this.chase = new THREE.InstancedBufferAttribute(new Float32Array(PILLARS.length).fill(1), 1);
    this.chase.setUsage(THREE.DynamicDrawUsage);
    const { atlas, glow } = pillarAtlas(Math.min(1024, texSize));
    const stone = new GeoBuilder();
    this.buildStone(stone);
    // mobile: the metal parts go into the matte stone mesh (one draw call less, no frame ribs)
    this.buildMetal(lowDetail ? stone : null);
    const stoneMat = patchWorldMaterial(
      new THREE.MeshStandardMaterial({ map: atlas, emissive: 0xffffff, emissiveMap: glow, roughness: 0.84, metalness: 0, vertexColors: true }),
      { key: 'pillar-stone3', edit: (sh) => this.editPillar(sh, 'stone') },
    );
    this.instanced(stone.build(), stoneMat, 'pillar-stone');
    this.buildFence();
    this.buildCrystal();
    this.buildHalo();
  }

  private instanced(geo: THREE.BufferGeometry, mat: THREE.Material, name: string): THREE.InstancedMesh {
    geo.setAttribute('aChase', this.chase);
    const mesh = new THREE.InstancedMesh(geo, mat, PILLARS.length);
    const m = new THREE.Matrix4();
    PILLARS.forEach((p, i) => {
      m.makeTranslation(p.x, 0, p.z);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.name = name;
    this.group.add(mesh);
    this.triangles += Math.round(geo.getAttribute('position').count / 3) * PILLARS.length;
    return mesh;
  }

  /** matte parts: deck, stone base / shaft / cornice, steel band, line array, cases (one atlas) */
  private buildStone(b: GeoBuilder): void {
    const P = PILLAR;
    const low = this.lowDetail;
    const w = 0xffffff;
    // black equipment deck inside the barrier fence (stage deck on the paving, rubber-matted top)
    b.box(P.deck - 0.1, P.deckH, P.deck - 0.1, 0, P.deckH / 2, 0, w, 0, R_BLACK);
    // stone base block and its chamfered moulding (the uplights stand on the ledge)
    b.box(P.base, P.baseTop - P.deckH - 0.14, P.base, 0, (P.deckH + P.baseTop - 0.14) / 2, 0, w, 0, R_STONE);
    b.box(P.base + 0.12, 0.14, P.base + 0.12, 0, P.baseTop - 0.07, 0, w, 0, R_TRIM);
    // the slim shaft (all four faces carry the niche / LED strip print)
    b.box(P.shaft, P.shaftTop - P.baseTop, P.shaft, 0, (P.baseTop + P.shaftTop) / 2, 0, w, 0, R_SHAFT);
    // capital: two-step stone cornice, black steel lighting band, top plate
    b.box(P.shaft + 0.14, 0.1, P.shaft + 0.14, 0, P.shaftTop + 0.05, 0, w, 0, R_TRIM);
    b.box(P.shaft + 0.44, 0.14, P.shaft + 0.44, 0, P.shaftTop + 0.17, 0, w, 0, R_TRIM);
    const bandB = P.shaftTop + 0.24,
      bandT = P.capTop - 0.15;
    b.box(P.shaft + 0.3, bandT - bandB, P.shaft + 0.3, 0, (bandB + bandT) / 2, 0, w, 0, R_BLACK);
    b.box(P.capital, 0.15, P.capital, 0, P.capTop - 0.075, 0, [1.6, 1.6, 1.6], 0, R_BLACK);
    // delay line array on the audience face (day2: one hang, narrower than the shaft), slight J at the
    // bottom; its bumper hangs from two outriggers under the cornice (metal)
    const zTop = P.shaft / 2 + 0.62;
    b.box(1.46, 0.08, 0.66, 0, P.arrayTop + 0.05, zTop, w, 0, R_BLACK);
    if (low) {
      const h = P.arrayTop - P.arrayBottom;
      b.box(1.34, h, 0.55, 0, P.arrayBottom + h / 2, zTop - 0.05, w, 0, R_ARRAY);
    } else {
      const n = 11;
      const bh = (P.arrayTop - P.arrayBottom) / n;
      const c = new THREE.Vector3(0, P.arrayTop - bh / 2, zTop);
      let ang = 0;
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3(1.34, bh - 0.008, 0.55);
      for (let k = 0; k < n; k++) {
        b.add(GeoBuilder.unit('box'), new THREE.Matrix4().compose(c, q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), ang), s), w, R_ARRAY);
        const next = k < 6 ? 0.004 * (k + 1) : 0.024 + 0.03 * (k - 5);
        // front faces tilt down: the box's own "down" runs back towards the shaft
        c.y -= (bh / 2) * (Math.cos(ang) + Math.cos(next));
        c.z -= (bh / 2) * (Math.sin(ang) + Math.sin(next));
        ang = next;
      }
    }
    if (!low) {
      // four RGB uplights on the base ledge grazing the shaft faces
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        const r = P.shaft / 2 + 0.22;
        b.box(0.26, 0.2, 0.26, Math.sin(a) * r, P.baseTop + 0.1, Math.cos(a) * r, w, 0, R_BLACK);
      }
      // road cases, an amp rack and the SFX launcher bases on the deck
      const y0 = P.deckH;
      const cases: [number, number, number, number, number, number][] = [
        // x, z, w, h, d, yaw
        [-2.5, -2.45, 1.2, 0.82, 0.9, 0.1],
        [2.3, -2.55, 1.0, 0.78, 0.8, -0.05],
        [-2.75, 1.4, 0.8, 0.72, 1.2, 0],
        [2.8, 0.4, 0.62, 1.42, 0.8, 0],
        [1.0, -2.85, 0.8, 0.6, 0.6, 0.2],
      ];
      for (const [x, z, cw, ch, cd, yaw] of cases) b.box(cw, ch, cd, x, y0 + ch / 2, z, w, yaw, R_CASE);
      for (const sx of [-1, 1]) b.box(0.62, 0.3, 0.72, sx * 2.8, y0 + 0.15, 2.75, w, sx * 0.5, R_BLACK);
    }
  }

  /**
   * metal: red-bronze neck, chrome crystal frame + girdle + finial, array outriggers, launcher barrels.
   * `into` (mobile): add them to the matte stone builder instead (light trim / black atlas texels).
   */
  private buildMetal(into: GeoBuilder | null): void {
    const P = PILLAR;
    const low = this.lowDetail;
    const b = into ?? new GeoBuilder();
    const light = into ? R_TRIM : undefined;
    const dark = into ? R_BLACK : undefined;
    const chrome = lin(into ? '#c8ccd2' : '#d4d8de');
    const steel = lin('#2a2b2e');
    const bronze = lin(into ? '#6a2c1e' : '#7a3322');
    // neck: collar on the top plate, square stem (faces with the shaft), cup under the glass apex
    b.box(1.0, 0.08, 1.0, 0, P.capTop + 0.04, 0, bronze, 0, light);
    const stemB = P.capTop + 0.08,
      stemT = P.lanternBottom - 0.1;
    const stem = new THREE.CylinderGeometry(0.28, 0.42, stemT - stemB, 4);
    stem.rotateY(Math.PI / 4);
    b.add(stem, T(0, (stemB + stemT) / 2, 0), bronze, light);
    b.add(new THREE.CylinderGeometry(0.3, 0.2, 0.12, 4), T(0, P.lanternBottom - 0.05, 0), bronze, light);
    // girdle band (CylinderGeometry(…, 4) puts its corners on ±X / ±Z = the glass corners)
    const r = P.crystalR;
    b.add(new THREE.CylinderGeometry(r * 1.02, r * 1.02, P.girdleTop - P.girdle, 4), T(0, (P.girdle + P.girdleTop) / 2, 0), chrome, light);
    // frame: the eight pyramid edges, ribs on the upper faces, a ring two fifths up
    const corner = (k: number, y: number, rr: number) => new THREE.Vector3(Math.cos((k * Math.PI) / 2) * rr, y, Math.sin((k * Math.PI) / 2) * rr);
    const apex = new THREE.Vector3(0, P.crystalTop, 0);
    const lowApex = new THREE.Vector3(0, P.lanternBottom, 0);
    for (let k = 0; k < 4; k++) {
      b.beam(corner(k, P.girdleTop, r * 1.01), apex, 0.055, chrome, false, light);
      b.beam(corner(k, P.girdle, r * 1.01), lowApex, 0.05, chrome, false, light);
      if (!low) {
        const c0 = corner(k, P.girdleTop, r);
        const c1 = corner(k + 1, P.girdleTop, r);
        const mid = c0.clone().add(c1).multiplyScalar(0.5);
        b.beam(mid, apex.clone().lerp(mid, 0.1), 0.035, chrome);
        b.beam(c0.clone().lerp(apex, 0.4), c1.clone().lerp(apex, 0.4), 0.035, chrome);
        const g0 = corner(k, P.girdle, r);
        const g1 = corner(k + 1, P.girdle, r);
        b.beam(g0.clone().add(g1).multiplyScalar(0.5), lowApex.clone().lerp(g0.clone().add(g1).multiplyScalar(0.5), 0.15), 0.03, chrome);
      }
    }
    // finial spike (+ ball)
    const spikeH = P.top - P.crystalTop;
    b.add(new THREE.ConeGeometry(0.05, spikeH, 6), T(0, P.crystalTop + spikeH / 2, 0), chrome, light);
    if (!low) b.add(new THREE.SphereGeometry(0.07, 8, 5), T(0, P.crystalTop + 0.03, 0), chrome);
    // array outriggers from the shaft face to the bumper
    const zTop = P.shaft / 2 + 0.62;
    for (const sx of [-0.5, 0.5]) b.box(0.06, 0.06, zTop - P.shaft / 2 + 0.1, sx, P.arrayTop + 0.12, (P.shaft / 2 + zTop) / 2 + 0.05, steel, 0, dark);
    if (!low) {
      // SFX launchers at the front corners of the deck, angled up and outwards (photo P)
      for (const sx of [-1, 1]) {
        const dir = new THREE.Vector3(sx * 0.55, 0.78, 0.3).normalize();
        const base = new THREE.Vector3(sx * 2.8, P.deckH + 0.36, 2.75);
        const barrel = new THREE.CylinderGeometry(0.1, 0.13, 1.05, 8);
        const m = new THREE.Matrix4().compose(base.clone().addScaledVector(dir, 0.45), new THREE.Quaternion().setFromUnitVectors(UP, dir), new THREE.Vector3(1, 1, 1));
        b.add(barrel, m, steel);
        for (const dx of [-0.2, 0.2]) b.box(0.04, 0.3, 0.3, base.x + dx, P.deckH + 0.42, base.z, steel);
      }
    }
    if (into) return;
    const mat = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.34 }), { key: 'pillar-metal2' });
    this.instanced(b.build(), mat, 'pillar-metal');
  }

  /** black crowd-barrier fence (alpha-tested bar panels) with corner posts, top rail and foot plates */
  private buildFence(): void {
    const P = PILLAR;
    const half = P.deck / 2;
    const b = new GeoBuilder();
    const black = lin('#2e2e30');
    const panels = Math.round(P.deck / 1.05);
    for (let k = 0; k < 4; k++) {
      const q = new THREE.Quaternion().setFromAxisAngle(UP, (k * Math.PI) / 2);
      const panel = new THREE.PlaneGeometry(P.deck, P.fenceH);
      const uv = panel.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * panels);
      b.add(panel, new THREE.Matrix4().compose(new THREE.Vector3(0, P.fenceH / 2, half).applyQuaternion(q), q, new THREE.Vector3(1, 1, 1)), black);
      // rolled top rail (the fence keeps a line edge-on)
      const rail = new THREE.Vector3(0, P.fenceH - 0.02, half).applyQuaternion(q);
      b.box(k % 2 ? 0.05 : P.deck, 0.05, k % 2 ? P.deck : 0.05, rail.x, rail.y, rail.z, black, 0, BARRIER_SOLID_UV);
      if (!this.lowDetail && k % 2) {
        // galvanised foot plates outside the two side runs, sticking out past the front and back
        // (photo P: the light strips at the fence corners seen from the aisle)
        const f = new THREE.Vector3(0, 0.012, half + 0.36).applyQuaternion(q);
        b.box(0.62, 0.024, P.deck + 1.3, f.x, f.y, f.z, lin('#8a8c90'), 0, BARRIER_SOLID_UV);
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.07, P.fenceH, 0.07, sx * half, P.fenceH / 2, sz * half, black, 0, BARRIER_SOLID_UV);
    this.instanced(b.build(), barrierMaterial(), 'pillar-fence');
  }

  /** the glass: 4 lower facets (glowing) + 4 upper facets (silver, dim inner glow) */
  private buildCrystal(): void {
    const P = PILLAR;
    const r = P.crystalR;
    const pos: number[] = [];
    const uv: number[] = [];
    // corners on ±X / ±Z: the glass is turned 45° to the shaft faces
    const ring = (y: number) => [0, 1, 2, 3].map((k) => new THREE.Vector3(Math.cos((k * Math.PI) / 2) * r, y, Math.sin((k * Math.PI) / 2) * r));
    const g0 = ring(P.girdle);
    const g1 = ring(P.girdleTop);
    const lowApex = new THREE.Vector3(0, P.lanternBottom, 0);
    const apex = new THREE.Vector3(0, P.crystalTop, 0);
    const push = (a: THREE.Vector3, bb: THREE.Vector3, c: THREE.Vector3) => pos.push(a.x, a.y, a.z, bb.x, bb.y, bb.z, c.x, c.y, c.z);
    for (let k = 0; k < 4; k++) {
      const k1 = (k + 1) % 4;
      // lower facet (outward winding): atlas left half, girdle edge along v = 1, apex at (0.25, 0)
      push(g0[k], g0[k1], lowApex);
      uv.push(0, 1, 0.5, 1, 0.25, 0);
      // upper facet: atlas right half, girdle edge along v = 0, apex at (0.75, 1)
      push(g1[k1], g1[k], apex);
      uv.push(1, 0, 0.5, 0, 0.75, 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const b = new GeoBuilder();
    b.add(g, new THREE.Matrix4(), 0xffffff);
    const { albedo, glow } = glassTextures();
    const mat = patchWorldMaterial(
      new THREE.MeshStandardMaterial({ map: albedo, emissive: 0xffffff, emissiveMap: glow, metalness: 0.3, roughness: 0.16, vertexColors: true }),
      { key: 'pillar-glass2', lamps: false, edit: (sh) => this.editPillar(sh, 'crystal') },
    );
    this.instanced(b.build(), mat, 'pillar-crystal');
  }

  /** additive glow in the haze around each lantern, with the hot point at the bottom apex */
  private buildHalo(): void {
    const g = new THREE.PlaneGeometry(2, 2);
    const cy = (PILLAR.lanternBottom + PILLAR.girdle) / 2;
    const mat = new THREE.ShaderMaterial({
      uniforms: this.U,
      vertexShader: /* glsl */ `
        attribute float aChase;
        uniform float uHaloSize;
        varying vec2 vUv;
        varying vec2 vApex;
        varying float vI;
        void main() {
          vec4 c = modelViewMatrix * instanceMatrix * vec4( 0.0, ${cy.toFixed(3)}, 0.0, 1.0 );
          vec4 a = modelViewMatrix * instanceMatrix * vec4( 0.0, ${PILLAR.lanternBottom.toFixed(3)} + 0.12, 0.0, 1.0 );
          // pulled towards the camera past the glass so the glass never depth-clips the hot point
          vec4 mv = c + vec4( position.xy * uHaloSize, ${(PILLAR.crystalR + 0.2).toFixed(2)}, 0.0 );
          gl_Position = projectionMatrix * mv;
          vUv = position.xy;
          // apex offset in halo units (follows the camera roll / pitch)
          vApex = ( a.xy - c.xy ) / uHaloSize;
          // fade the halo when the camera is inside it
          vI = aChase * smoothstep( 2.0, 10.0, - c.z );
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uLampColP;
        uniform float uHaloK;
        varying vec2 vUv;
        varying vec2 vApex;
        varying float vI;
        void main() {
          float r2 = dot( vUv, vUv );
          vec2 d = vUv - vApex;
          float core = exp( - dot( d, d ) * 900.0 ) * 1.4 + exp( - dot( d, d ) * 120.0 ) * 0.25;
          float a = exp( - r2 * 6.0 ) * 0.16 * uHaloK + core;
          a *= 1.0 - smoothstep( 0.8, 1.0, r2 );
          // hue-keeping: the halo never pushes a channel past ~1.2 on its own
          vec3 c = uLampColP * ( a * vI );
          float pk = max( max( c.r, c.g ), c.b );
          c *= pk > 1.2 ? ( 1.2 + ( pk - 1.2 ) * 0.3 ) / pk : 1.0;
          gl_FragColor = vec4( c, 1.0 );
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.halo = this.instanced(g, mat, 'pillar-halo');
    this.halo.renderOrder = 5;
    this.halo.frustumCulled = false;
  }

  /** shader edits shared by the stone and crystal materials (instance chase, night albedo, uplight, glow) */
  private editPillar(sh: THREE.WebGLProgramParametersWithUniforms, kind: 'stone' | 'crystal'): void {
    Object.assign(sh.uniforms, this.U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aChase;\nvarying float vChase;\nvarying vec3 vLP;\nvarying vec3 vLN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvChase = aChase;\nvLP = position;\nvLN = objectNormal;');
    const common = /* glsl */ `#include <common>
uniform vec3 uShaftCol;
uniform vec3 uLampColP;
uniform float uStoneK;
uniform float uGlassK;
varying float vChase;
varying vec3 vLP;
varying vec3 vLN;
// soft limit of an emissive colour: linear up to k, then compressed — keeps the hue (max-channel scale)
vec3 pillarSoftLimit( vec3 c, float k ) {
  float pk = max( max( c.r, c.g ), c.b );
  return pk > k ? c * ( ( k + ( pk - k ) * 0.2 ) / pk ) : c;
}`;
    const P = PILLAR;
    const f = (v: number) => v.toFixed(3);
    const stone = /* glsl */ `
#include <emissivemap_fragment>
{
  // night calibration of the white paint (see STONE_NIGHT_K): ambient / stage / flash light uses the
  // scaled albedo; the close uplights below see the true white paint
  vec3 paint = diffuseColor.rgb;
  diffuseColor.rgb *= uStoneK;
  // vertical LED strips in the shaft edges (emissive mask) in the shaft colour
  totalEmissiveRadiance = pillarSoftLimit( totalEmissiveRadiance * uShaftCol * vChase * 7.0, 3.0 );
  // the four uplights on the base ledge wash the shaft faces only (not the array / deck / cases): a
  // cone per face, brightest low and centred, widening and fading with height (video 26 s amber,
  // 920 s green, 1272 s blue: the lower shaft glows in the shaft colour)
  float onShaft = step( max( abs( vLP.x ), abs( vLP.z ) ), ${f(P.shaft / 2 + 0.02)} ) * step( vLP.y, ${f(P.shaftTop)} );
  float vert = 1.0 - smoothstep( 0.2, 0.6, abs( vLN.y ) );
  float hU = vLP.y - ${f(P.baseTop)};
  float across = abs( vLN.x ) > 0.5 ? vLP.z : vLP.x;
  float cw = 0.25 + 0.3 * max( hU, 0.0 );
  float cone = mix( 1.0, exp( - across * across / ( cw * cw ) ), 0.55 );
  float graze = onShaft * vert * cone * smoothstep( -0.02, 0.3, hU ) * ( exp( - max( hU, 0.0 ) / 3.0 ) + 0.04 );
  totalEmissiveRadiance += paint * pillarSoftLimit( uShaftCol * vChase, 1.6 ) * graze * ${GRAZE_K.toFixed(2)};
  // lantern light falling on the top plate
  float top = smoothstep( 0.3, 0.9, vLN.y ) * smoothstep( ${f(P.capTop - 0.2)}, ${f(P.capTop)}, hU );
  totalEmissiveRadiance += diffuseColor.rgb * pillarSoftLimit( uLampColP * vChase, 1.6 ) * top * 0.9;
}`;
    const crystal = /* glsl */ `
#include <emissivemap_fragment>
{
  diffuseColor.rgb *= uGlassK;
  vec3 n = normalize( vLN );
  // facets catch the inner light unevenly (the glass reads as cut, not flat)
  float facet = 0.78 + 0.22 * dot( n, normalize( vec3( 0.35, -0.3, 0.88 ) ) );
  // hot point at the bottom apex (the lamp sits low in the glass)
  float dA = length( vLP - vec3( 0.0, ${f(P.lanternBottom)}, 0.0 ) );
  float core = 1.0 + 3.2 * exp( - dA * dA * 6.0 );
  vec3 e = totalEmissiveRadiance * uLampColP * vChase * facet * core * 3.4;
  totalEmissiveRadiance = pillarSoftLimit( e, 3.6 );
}`;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', common).replace('#include <emissivemap_fragment>', kind === 'stone' ? stone : crystal);
  }

  /** per-frame: colours from app.env, chase multipliers */
  update(env: LightEnv, haze: number): void {
    const a = this.chase.array as Float32Array;
    for (let i = 0; i < a.length; i++) a[i] = pillarChase(env, i);
    this.chase.needsUpdate = true;
    if (DAYLIGHT) {
      this.U.uShaftCol.value.setRGB(0, 0, 0);
      this.U.uLampColP.value.setRGB(0, 0, 0);
      return;
    }
    this.U.uShaftCol.value.copy(env.pillarShaftColor).multiplyScalar(Math.max(0, env.pillarShaftIntensity));
    this.U.uLampColP.value.copy(env.pillarLampColor).multiplyScalar(Math.max(0, env.pillarLampIntensity));
    this.U.uHaloK.value = 0.4 + 0.9 * Math.min(1.5, Math.max(0, haze));
  }

  setVisible(on: boolean): void {
    this.group.visible = on;
  }
}

// -------------------------------------------------------------------------------------------------
// textures

function pillarAtlas(size: number): { atlas: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
  const S = size;
  const [c, g] = makeCanvas(S, S);
  const [ce, ge] = makeCanvas(S, S);
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, S, S);
  const rng = new Rng(2026);
  // canvas y is flipped vs texture v: region [u0,v0,u1,v1] -> canvas rect
  const rect = (r: Rect) => ({ x: r[0] * S, y: (1 - r[3]) * S, w: (r[2] - r[0]) * S, h: (r[3] - r[1]) * S });

  /** white-painted ashlar: staggered courses, per-block tint, chiselled edges, paint wear, weathering */
  const ashlar = (x: number, y: number, w: number, h: number, courseH: number, blockW: number, tone: number) => {
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    // mortar joints
    g.fillStyle = `rgb(${tone - 52},${tone - 53},${tone - 55})`;
    g.fillRect(x, y, w, h);
    const j = Math.max(1, courseH * 0.035);
    let row = 0;
    for (let yy = y + h; yy > y - courseH; yy -= courseH, row++) {
      // courses laid from the bottom up
      const top = yy - courseH;
      let xx = x - (row % 2 ? blockW * 0.5 : 0) - rng.range(0, blockW * 0.15);
      while (xx < x + w) {
        const bw = blockW * rng.range(0.78, 1.22);
        const t = tone + rng.range(-10, 7);
        const warm = rng.range(-2, 3);
        g.fillStyle = `rgb(${Math.round(t + warm)},${Math.round(t)},${Math.round(t - 3 - warm)})`;
        g.fillRect(xx + j, top + j, bw - 2 * j, courseH - 2 * j);
        // chiselled edges: lit top, shaded bottom and right side
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(xx + j, top + j, bw - 2 * j, Math.max(1, courseH * 0.05));
        g.fillStyle = 'rgba(40,36,32,0.14)';
        g.fillRect(xx + j, yy - j - Math.max(1, courseH * 0.08), bw - 2 * j, Math.max(1, courseH * 0.08));
        g.fillRect(xx + bw - j - Math.max(1, blockW * 0.02), top + j, Math.max(1, blockW * 0.02), courseH - 2 * j);
        // paint wear / pores
        for (let s = 0; s < 4; s++) {
          g.fillStyle = `rgba(95,88,80,${rng.range(0.05, 0.14).toFixed(3)})`;
          g.fillRect(xx + rng.range(0, bw), top + rng.range(0, courseH), rng.range(1, 3.5), rng.range(1, 2.5));
        }
        xx += bw;
      }
    }
    // weathering: faint rain streaks from the top, darker splash zone at the foot
    for (let i = 0; i < w / 7; i++) {
      g.fillStyle = `rgba(70,64,58,${rng.range(0.02, 0.06).toFixed(3)})`;
      g.fillRect(x + rng.range(0, w), y + rng.range(0, h * 0.2), rng.range(1, 3), rng.range(h * 0.1, h * 0.6));
    }
    const foot = g.createLinearGradient(0, y + h * 0.9, 0, y + h);
    foot.addColorStop(0, 'rgba(60,55,50,0)');
    foot.addColorStop(1, 'rgba(60,55,50,0.18)');
    g.fillStyle = foot;
    g.fillRect(x, y + h * 0.9, w, h * 0.1);
    g.restore();
  };

  // --- shaft face (1.8 m wide, Y baseTop → shaftTop): white ashlar, three round-topped niches, two
  //     string courses, LED strips in both edges (glow mask)
  {
    const r = rect(R_SHAFT);
    const faceW = PILLAR.shaft,
      faceH = PILLAR.shaftTop - PILLAR.baseTop;
    const px = r.w / faceW,
      py = r.h / faceH;
    const Y = (m: number) => r.y + r.h - (m - PILLAR.baseTop) * py; // world Y -> canvas y
    ashlar(r.x, r.y, r.w, r.h, 0.36 * py, 0.62 * px, 204);
    const cx = r.x + r.w / 2;
    // string courses (a slim projecting band with its shadow)
    for (const ym of [3.55, 6.5]) {
      g.fillStyle = 'rgb(222,220,214)';
      g.fillRect(r.x, Y(ym + 0.07), r.w, 0.1 * py);
      g.fillStyle = 'rgba(40,36,32,0.28)';
      g.fillRect(r.x, Y(ym - 0.03), r.w, Math.max(1, 0.04 * py));
    }
    /** round-topped opening (true semicircle in world metres: the atlas scale differs in x and y) */
    const arch = (w: number, yb: number, yt: number) => {
      const rx = w / 2,
        ry = (w / 2 / px) * py;
      g.beginPath();
      g.moveTo(cx - rx, yb);
      g.lineTo(cx - rx, yt + ry);
      g.ellipse(cx, yt + ry, rx, ry, 0, Math.PI, 0);
      g.lineTo(cx + rx, yb);
      g.closePath();
    };
    const niche = (y0: number, y1: number, wm: number, figure: boolean) => {
      const w = wm * px,
        yb = Y(y0),
        yt = Y(y1);
      // moulded surround (raised, a touch brighter, outlined)
      g.fillStyle = 'rgb(226,224,219)';
      arch(w + 0.18 * px, yb, yt - 0.09 * py);
      g.fill();
      g.strokeStyle = 'rgba(70,64,58,0.5)';
      g.lineWidth = Math.max(1, 0.018 * px);
      g.stroke();
      // reveal (the recess sides) and the dark interior, darkest under the arch
      g.fillStyle = 'rgb(118,112,104)';
      arch(w, yb, yt);
      g.fill();
      const gr = g.createLinearGradient(0, yt, 0, yb);
      gr.addColorStop(0, '#171412');
      gr.addColorStop(1, '#3a332d');
      g.fillStyle = gr;
      arch(w - 0.12 * px, yb - 0.05 * py, yt + 0.07 * py);
      g.fill();
      if (figure) {
        // a small robed figure in the niche (day2: red and white inside the low niches)
        const fh = (y1 - y0) * 0.62 * py;
        const fb = yb - 0.08 * py;
        g.fillStyle = '#5c1a16';
        g.beginPath();
        g.moveTo(cx - w * 0.2, fb);
        g.quadraticCurveTo(cx - w * 0.22, fb - fh * 0.6, cx - w * 0.1, fb - fh * 0.82);
        g.lineTo(cx + w * 0.1, fb - fh * 0.82);
        g.quadraticCurveTo(cx + w * 0.22, fb - fh * 0.6, cx + w * 0.2, fb);
        g.closePath();
        g.fill();
        g.fillStyle = '#b8ad9e';
        g.fillRect(cx - w * 0.1, fb - fh * 0.84, w * 0.2, fh * 0.07);
        g.beginPath();
        g.ellipse(cx, fb - fh * 0.92, w * 0.08, fh * 0.09, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,240,220,0.18)';
        g.fillRect(cx - w * 0.16, fb - fh * 0.7, w * 0.05, fh * 0.6);
      }
      // sill
      g.fillStyle = 'rgb(230,228,223)';
      g.fillRect(cx - w / 2 - 0.12 * px, yb, w + 0.24 * px, 0.08 * py);
      g.fillStyle = 'rgba(40,36,32,0.3)';
      g.fillRect(cx - w / 2 - 0.12 * px, yb + 0.08 * py, w + 0.24 * px, Math.max(1, 0.03 * py));
    };
    niche(1.74, 3.2, 0.7, true);
    niche(4.25, 5.6, 0.56, false);
    niche(7.15, 7.95, 0.4, false);
    // RGB LED strips in both edges (5 cm diffuser in a 7 cm channel): dark housing in the albedo,
    // the diffuser is the glow mask
    g.fillStyle = '#34312d';
    ge.fillStyle = '#fff';
    for (const ex of [0.02, faceW - 0.09]) {
      g.fillRect(r.x + ex * px, r.y, 0.07 * px, r.h);
      g.fillStyle = '#6f6b66';
      g.fillRect(r.x + (ex + 0.01) * px, r.y, 0.05 * px, r.h);
      g.fillStyle = '#34312d';
      ge.fillRect(r.x + (ex + 0.01) * px, r.y + 0.1 * py, Math.max(2, 0.05 * px), r.h - 0.15 * py);
    }
  }
  // --- plain ashlar (base block)
  {
    const r = rect(R_STONE);
    ashlar(r.x, r.y, r.w, r.h, r.h / 3, r.w / 2.2, 198);
  }
  // --- trim (cornice, base moulding): smooth paint, lit top edge, shadowed bottom
  {
    const r = rect(R_TRIM);
    g.fillStyle = 'rgb(214,212,206)';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(r.x, r.y, r.w, r.h * 0.12);
    g.fillStyle = 'rgba(40,36,32,0.3)';
    g.fillRect(r.x, r.y + r.h * 0.84, r.w, r.h * 0.16);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(95,88,80,${rng.range(0.04, 0.1).toFixed(3)})`;
      g.fillRect(r.x + rng.range(0, r.w), r.y + rng.range(0, r.h), rng.range(1, 3), rng.range(1, 3));
    }
  }
  // --- matte black (deck rubber, steel band, bumper)
  {
    const r = rect(R_BLACK);
    g.fillStyle = '#151516';
    g.fillRect(r.x, r.y, r.w, r.h);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(${rng.next() < 0.5 ? '255,255,255' : '0,0,0'},${rng.range(0.02, 0.05).toFixed(3)})`;
      g.fillRect(r.x + rng.range(0, r.w), r.y + rng.range(0, r.h), rng.range(2, 8), rng.range(2, 8));
    }
  }
  // --- line-array cabinet front: black cabinet, perforated grille, rigging plates at both sides
  {
    const r = rect(R_ARRAY);
    g.fillStyle = '#101011';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#1e1e20';
    g.fillRect(r.x + r.w * 0.08, r.y + r.h * 0.1, r.w * 0.84, r.h * 0.8);
    g.fillStyle = '#0b0b0c';
    const step = Math.max(2, r.w / 48);
    for (let yy = r.y + r.h * 0.12; yy < r.y + r.h * 0.88; yy += step * 2) for (let xx = r.x + r.w * 0.1; xx < r.x + r.w * 0.9; xx += step * 1.2) g.fillRect(xx, yy, step * 0.6, step);
    g.fillStyle = '#3a3b3e';
    g.fillRect(r.x, r.y, r.w * 0.05, r.h);
    g.fillRect(r.x + r.w * 0.95, r.y, r.w * 0.05, r.h);
    g.fillStyle = '#050505';
    g.fillRect(r.x, r.y + r.h * 0.97, r.w, r.h * 0.03);
  }
  // --- road case: black ply, aluminium edge extrusions, ball corners, butterfly latches
  {
    const r = rect(R_CASE);
    g.fillStyle = '#18181a';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = '#8e9296';
    g.lineWidth = r.w * 0.05;
    g.strokeRect(r.x + r.w * 0.025, r.y + r.h * 0.025, r.w * 0.95, r.h * 0.95);
    g.fillStyle = '#b4b8bc';
    for (const [u, v] of [[0.02, 0.02], [0.9, 0.02], [0.02, 0.9], [0.9, 0.9]]) g.fillRect(r.x + u * r.w, r.y + v * r.h, r.w * 0.08, r.h * 0.08);
    for (const u of [0.25, 0.68]) g.fillRect(r.x + u * r.w, r.y + r.h * 0.44, r.w * 0.07, r.h * 0.1);
  }
  const atlas = canvasTexture(c, { aniso: 8 });
  const glow = canvasTexture(ce, { aniso: 8 });
  return { atlas, glow };
}

/**
 * Glass atlas (albedo + glow), 2 facets: left half = a lower facet (girdle edge at v = 1, apex
 * (0.25, 0)): frosted glass that glows, brightest at the apex; right half = an upper facet (girdle edge
 * at v = 0, apex (0.75, 1)): silver cut glass, faint inner glow. Mullions: the facet edges, a centre bar
 * and two kite lines (the cut-crystal facets of the photos).
 */
function glassTextures(): { albedo: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
  const W = 256,
    H = 128;
  const [ca, ga] = makeCanvas(W, H);
  const [cg, gg] = makeCanvas(W, H);
  ga.fillStyle = '#9da3a9';
  ga.fillRect(0, 0, W, H);
  gg.fillStyle = '#000';
  gg.fillRect(0, 0, W, H);
  // canvas y = (1 - v) * H
  const lower = { a: [0, 0], b: [128, 0], c: [64, 128] };
  const upper = { a: [128, 128], b: [256, 128], c: [192, 0] };
  const tri = (ctx: CanvasRenderingContext2D, t: { a: number[]; b: number[]; c: number[] }) => {
    ctx.beginPath();
    ctx.moveTo(t.a[0], t.a[1]);
    ctx.lineTo(t.b[0], t.b[1]);
    ctx.lineTo(t.c[0], t.c[1]);
    ctx.closePath();
  };
  // albedo: two tones per facet half (cut facets catch the light differently) + a reflection streak
  for (const [t, l, d] of [
    [lower, '#c3c9cf', '#a9b0b7'],
    [upper, '#d9dde2', '#b3b9c0'],
  ] as const) {
    const mx = (t.a[0] + t.b[0]) / 2;
    ga.fillStyle = l;
    ga.beginPath();
    ga.moveTo(t.a[0], t.a[1]);
    ga.lineTo(mx, t.a[1]);
    ga.lineTo(t.c[0], t.c[1]);
    ga.closePath();
    ga.fill();
    ga.fillStyle = d;
    ga.beginPath();
    ga.moveTo(mx, t.a[1]);
    ga.lineTo(t.b[0], t.b[1]);
    ga.lineTo(t.c[0], t.c[1]);
    ga.closePath();
    ga.fill();
  }
  ga.save();
  tri(ga, upper);
  ga.clip();
  const st = ga.createLinearGradient(150, 128, 230, 20);
  st.addColorStop(0.35, 'rgba(255,255,255,0)');
  st.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  st.addColorStop(0.62, 'rgba(255,255,255,0)');
  ga.fillStyle = st;
  ga.fillRect(128, 0, 128, 128);
  ga.restore();
  // glow: lower facet brightens towards the apex (the lamp sits low), upper facet only a faint glimmer
  const gr = gg.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgb(150,150,150)');
  gr.addColorStop(0.55, 'rgb(215,215,215)');
  gr.addColorStop(1, 'rgb(255,255,255)');
  gg.fillStyle = gr;
  tri(gg, lower);
  gg.fill();
  gg.fillStyle = 'rgb(20,20,20)';
  tri(gg, upper);
  gg.fill();
  // mullions (dark in both maps)
  for (const [ctx, col] of [
    [ga, '#3c4046'],
    [gg, '#000'],
  ] as const) {
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    for (const t of [lower, upper]) {
      const mx = (t.a[0] + t.b[0]) / 2;
      const k = (p: number[], q: number[], s: number) => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s];
      ctx.lineWidth = 8;
      tri(ctx, t);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(mx, t.a[1]);
      ctx.lineTo(t.c[0], t.c[1]);
      ctx.stroke();
      // kite lines: from the base corners to the centre bar, 45 % up
      const m = k([mx, t.a[1]], t.c, 0.45);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t.a[0], t.a[1]);
      ctx.lineTo(m[0], m[1]);
      ctx.lineTo(t.b[0], t.b[1]);
      ctx.stroke();
    }
  }
  return { albedo: canvasTexture(ca, { aniso: 4 }), glow: canvasTexture(cg, { aniso: 4 }) };
}
