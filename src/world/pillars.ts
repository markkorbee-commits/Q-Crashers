import * as THREE from 'three';
import type { LightEnv } from '../core/LightEnv';
import { Rng } from '../core/rng';
import { GeoBuilder, lin } from './geom';
import { PILLAR, PILLARS } from './site';
import { canvasTexture, makeCanvas } from './tex';
import { patchWorldMaterial, pillarChase } from './worldLights';

/**
 * The lantern pillars of the 2026 RED field = the 8 delay towers dressed as gothic crystal-lantern
 * obelisks (design-bible §5.10, the official Endshow photo P, frames f026 / f113, the oar2 day photo):
 *  - 8.4 m plinth deck (Y 0.4) inside a dark bronze lattice railing, bronze cannon props on the corners
 *  - stepped pedestal, slim 2.6 m square stone shaft with narrow blind lancet panels (dark, not lit) and
 *    vertical RGB LED strips along every face edge (the "shaft" colour), uplit from the pedestal
 *  - two delay line arrays under the capital on the audience-facing (+Z) face, a small red flame
 *    banner under them
 *  - plain 3.4 m cornice capital (no pinnacles — the moving heads on it belong to the lighting rig),
 *    a short tapered neck
 *  - the crystal lantern, turned 45° to the shaft (the "diamond" seen head-on from the aisle): an
 *    inverted glass pyramid that glows in the lamp colour with mullions and a bright point at its
 *    bottom apex, a metal crown band, and a tall dark metal hood with ribs and a finial (f113: dark hood
 *    over glowing lower glass)
 * Lamp + shaft colours/intensities come from app.env.pillar* (written by the lighting engineer),
 * per-pillar multipliers from app.env.pillarChase[i] (i = order of PILLARS / anchors pillars_top).
 * The glass emission is soft-limited in the shader so saturated lamp colours (amber #FFC080, orange,
 * violet) keep their hue through the tone curve instead of clipping to white.
 */

// atlas regions (u0, v0, u1, v1), texture v up (CanvasTexture flipY)
const R_SHAFT: [number, number, number, number] = [0, 0, 0.5, 1];
const R_STONE: [number, number, number, number] = [0.5, 0, 1, 0.5];
const R_BANNER: [number, number, number, number] = [0.5, 0.5, 0.75, 1];
const R_CAP: [number, number, number, number] = [0.75, 0.75, 1, 1];

export class LanternPillars {
  readonly group = new THREE.Group();
  private halo!: THREE.InstancedMesh;
  private chase: THREE.InstancedBufferAttribute;
  private readonly U = {
    uShaftCol: { value: new THREE.Color() },
    uLampColP: { value: new THREE.Color() },
    uHaloK: { value: 1 },
    uHaloSize: { value: 4.2 },
  };
  triangles = 0;

  constructor(texSize: number, private lowDetail: boolean) {
    this.group.name = 'lantern-pillars';
    this.chase = new THREE.InstancedBufferAttribute(new Float32Array(PILLARS.length).fill(1), 1);
    this.chase.setUsage(THREE.DynamicDrawUsage);
    const { atlas, glow } = pillarAtlas(Math.min(1024, texSize));
    this.buildStone(atlas, glow);
    this.buildMetal();
    this.buildRailing();
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
    this.triangles += (geo.getAttribute('position').count / 3) * PILLARS.length;
    return mesh;
  }

  private buildStone(atlas: THREE.Texture, glow: THREE.Texture): void {
    const P = PILLAR;
    const b = new GeoBuilder();
    const w = 0xffffff;
    const dark: [number, number, number] = [0.55, 0.55, 0.55];
    // plinth deck (dark stone paving) and the stepped pedestal
    b.box(P.deck, P.deckH, P.deck, 0, P.deckH / 2, 0, dark, 0, R_STONE);
    b.box(4.1, 0.4, 4.1, 0, P.deckH + 0.2, 0, w, 0, R_STONE);
    b.box(P.pedestal, P.pedestalTop - 0.8, P.pedestal, 0, (0.8 + P.pedestalTop) / 2, 0, w, 0, R_STONE);
    b.box(P.pedestal + 0.2, 0.16, P.pedestal + 0.2, 0, P.pedestalTop + 0.08, 0, [0.85, 0.85, 0.85], 0, R_STONE);
    b.box(3.0, P.baseTop - P.pedestalTop - 0.16, 3.0, 0, (P.pedestalTop + 0.16 + P.baseTop) / 2, 0, [0.8, 0.8, 0.8], 0, R_STONE);
    // shaft (all four faces carry the panel + LED strip print)
    b.box(P.shaft, P.shaftTop - P.baseTop, P.shaft, 0, (P.baseTop + P.shaftTop) / 2, 0, w, 0, R_SHAFT);
    // capital: cornice + frieze band + top slab — a plain block, no pinnacles
    b.box(P.capital, 0.26, P.capital, 0, P.shaftTop + 0.13, 0, w, 0, R_STONE);
    b.box(3.0, 0.42, 3.0, 0, P.shaftTop + 0.47, 0, w, 0, R_CAP);
    b.box(3.3, 0.12, 3.3, 0, P.capTop - 0.06, 0, [0.9, 0.9, 0.9], 0, R_STONE);
    // small red flame banner (1.2 × 2.6 m) on the audience-facing face, under the delay arrays
    const banner = new THREE.PlaneGeometry(1.2, 2.6);
    b.add(banner, new THREE.Matrix4().makeTranslation(0, 4.15, P.shaft / 2 + 0.03), w, R_BANNER);
    const stoneMat = patchWorldMaterial(
      new THREE.MeshStandardMaterial({ map: atlas, emissive: 0xffffff, emissiveMap: glow, roughness: 0.86, metalness: 0, vertexColors: true }),
      { key: 'pillar-stone2', edit: (sh) => this.editPillar(sh, 'stone') },
    );
    this.instanced(b.build(), stoneMat, 'pillar-stone');
  }

  private buildMetal(): void {
    const P = PILLAR;
    const b = new GeoBuilder();
    const dark = lin('#1c1c1f');
    const bronze = lin('#3b2c1e');
    const hoodCol = lin('#2a221b');
    const grey = lin('#303236');
    // delay line arrays: 2 hangs × 9 boxes (1.2 m wide), J-curve, on the +Z face under the cornice
    const zFace = P.shaft / 2;
    for (const sx of [-0.72, 0.72]) {
      let y = P.shaftTop - 0.12;
      let z = zFace + 0.36;
      let ang = 0;
      b.box(1.16, 0.08, 0.56, sx, y + 0.04, z - 0.02, grey);
      for (let i = 0; i < 9; i++) {
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(sx, y - 0.17, z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ang),
          new THREE.Vector3(1.1, 0.33, 0.5),
        );
        b.add(GeoBuilder.unit('box'), m, dark);
        y -= 0.335 * Math.cos(ang);
        z += 0.335 * Math.sin(ang);
        ang += i > 5 ? 0.035 : 0.01;
      }
    }
    // lantern neck: collar on the capital, tapered stem, crown ring under the glass
    b.box(1.5, 0.14, 1.5, 0, P.capTop + 0.07, 0, grey);
    const neck = new THREE.CylinderGeometry(0.42, 0.62, P.lanternBottom - P.capTop - 0.2, 4);
    neck.rotateY(Math.PI / 4);
    b.add(neck, new THREE.Matrix4().makeTranslation(0, (P.capTop + 0.14 + P.lanternBottom - 0.06) / 2, 0), bronze);
    // four ornamental brackets from the collar to the glass (they carry the lower mullions)
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const r1 = P.crystalR * 0.42;
      b.beam(
        new THREE.Vector3(Math.cos(a) * 0.55, P.capTop + 0.14, Math.sin(a) * 0.55),
        new THREE.Vector3(Math.cos(a) * r1, P.lanternBottom + (P.girdle - P.lanternBottom) * 0.42, Math.sin(a) * r1),
        0.07,
        bronze,
      );
    }
    // crown band at the girdle (the lantern frame): a short square prism, turned 45° like the glass
    const r = P.crystalR;
    const band = new THREE.CylinderGeometry(r * 1.03, r * 1.03, P.girdleTop - P.girdle, 4, 1, false);
    band.rotateY(0); // CylinderGeometry(…, 4) puts its corners on ±X / ±Z = the glass corners
    b.add(band, new THREE.Matrix4().makeTranslation(0, (P.girdle + P.girdleTop) / 2, 0), bronze);
    // the hood: a tall dark metal pyramid over the glass
    const hoodH = P.crystalTop - P.girdleTop;
    const hood = new THREE.ConeGeometry(r * 1.02, hoodH, 4, 1, false);
    b.add(hood, new THREE.Matrix4().makeTranslation(0, P.girdleTop + hoodH / 2, 0), hoodCol);
    // ribs: the four hood edges and a mid rib on every face (mullions of the metal cage)
    const apex = new THREE.Vector3(0, P.crystalTop, 0);
    const corner = (k: number, y: number, rr: number) => new THREE.Vector3(Math.cos((k * Math.PI) / 2) * rr, y, Math.sin((k * Math.PI) / 2) * rr);
    for (let k = 0; k < 4; k++) {
      b.beam(corner(k, P.girdleTop, r * 1.05), apex, 0.09, bronze);
      const c0 = corner(k, P.girdleTop, r * 1.04);
      const c1 = corner(k + 1, P.girdleTop, r * 1.04);
      const mid = c0.clone().add(c1).multiplyScalar(0.5);
      b.beam(mid, apex.clone().lerp(mid, 0.12), 0.06, bronze);
      // horizontal ring two thirds up
      const t = 0.45;
      b.beam(c0.clone().lerp(apex, t), c1.clone().lerp(apex, t), 0.06, bronze);
    }
    // finial: ball + spike
    b.cylinder(0.16, 0.12, 0, P.crystalTop + 0.02, 0, bronze, 8);
    const ball = new THREE.SphereGeometry(0.14, 8, 6);
    b.add(ball, new THREE.Matrix4().makeTranslation(0, P.crystalTop + 0.18, 0), bronze);
    const spikeH = P.top - P.crystalTop - 0.2;
    const fin = new THREE.ConeGeometry(0.06, spikeH, 6);
    b.add(fin, new THREE.Matrix4().makeTranslation(0, P.crystalTop + 0.2 + spikeH / 2, 0), bronze);
    // uplight fixtures on the pedestal step (4 RGB uplights grazing the shaft)
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const x = Math.sin(a) * 1.86,
        z = Math.cos(a) * 1.86;
      b.box(0.34, 0.22, 0.34, x, P.deckH + 0.51, z, dark);
    }
    // cannon props on the plinth corners, turned outwards (FACT look: Q-dance Endshow photo)
    if (!this.lowDetail) {
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const yaw = Math.atan2(sx, sz);
          const base = new THREE.Matrix4().compose(new THREE.Vector3(sx * 3.3, P.deckH, sz * 3.3), new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw), new THREE.Vector3(1, 1, 1));
          const part = (g: THREE.BufferGeometry, m: THREE.Matrix4, c: [number, number, number]) => b.add(g, base.clone().multiply(m), c);
          part(GeoBuilder.unit('box'), new THREE.Matrix4().compose(new THREE.Vector3(0, 0.4, -0.1), new THREE.Quaternion(), new THREE.Vector3(0.6, 0.34, 1.1)), bronze);
          const barrel = new THREE.CylinderGeometry(0.14, 0.22, 1.8, 10);
          part(barrel, new THREE.Matrix4().compose(new THREE.Vector3(0, 0.72, 0.2), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2 - 0.35), new THREE.Vector3(1, 1, 1)), dark);
          for (const wx of [-0.36, 0.36]) {
            const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 12);
            part(wheel, new THREE.Matrix4().compose(new THREE.Vector3(wx, 0.42, -0.15), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), new THREE.Vector3(1, 1, 1)), bronze);
          }
        }
    }
    const mat = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.48 }), { key: 'pillar-metal' });
    this.instanced(b.build(), mat, 'pillar-metal');
  }

  /** dark bronze lattice railing (1.1 m) around the plinth deck: alpha-tested panels + posts */
  private buildRailing(): void {
    const P = PILLAR;
    const h = 1.1;
    const half = P.deck / 2 - 0.08;
    const b = new GeoBuilder();
    for (let k = 0; k < 4; k++) {
      const yaw = (k * Math.PI) / 2;
      const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
      const pos = new THREE.Vector3(0, P.deckH + h / 2, half).applyQuaternion(q);
      const panel = new THREE.PlaneGeometry(P.deck - 0.16, h);
      // uv.x in metres so the lattice keeps its pitch
      const uv = panel.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (P.deck - 0.16) / h);
      b.add(panel, new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1)), 0xffffff);
    }
    const tex = latticeTexture();
    const mat = patchWorldMaterial(
      new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.55, color: new THREE.Color(0.2, 0.14, 0.085) }),
      { key: 'pillar-rail' },
    );
    this.instanced(b.build(), mat, 'pillar-railing');
  }

  private buildCrystal(): void {
    const P = PILLAR;
    const r = P.crystalR;
    const pos: number[] = [];
    const uv: number[] = [];
    // corners on ±X / ±Z: the glass is turned 45° to the shaft faces
    const ring = (y: number, rr: number) => [0, 1, 2, 3].map((k) => new THREE.Vector3(Math.cos((k * Math.PI) / 2) * rr, y, Math.sin((k * Math.PI) / 2) * rr));
    const g0 = ring(P.girdle, r);
    const lowApex = new THREE.Vector3(0, P.lanternBottom, 0);
    for (let k = 0; k < 4; k++) {
      const k1 = (k + 1) % 4;
      // lower glass facet (counter-clockwise seen from outside): uv (0,1)-(1,1) along the girdle, apex at (0.5, 0)
      pos.push(g0[k].x, g0[k].y, g0[k].z, g0[k1].x, g0[k1].y, g0[k1].z, lowApex.x, lowApex.y, lowApex.z);
      uv.push(0, 1, 1, 1, 0.5, 0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const b = new GeoBuilder();
    b.add(g, new THREE.Matrix4(), 0xffffff);
    const tex = glassTexture();
    const mat = patchWorldMaterial(
      new THREE.MeshStandardMaterial({ color: '#1e2328', emissive: 0xffffff, emissiveMap: tex, metalness: 0.3, roughness: 0.15, vertexColors: true }),
      { key: 'pillar-glass', lamps: false, edit: (sh) => this.editPillar(sh, 'crystal') },
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

  /** shader edits shared by the stone and crystal materials (instance chase, uplight, glow) */
  private editPillar(sh: THREE.WebGLProgramParametersWithUniforms, kind: 'stone' | 'crystal'): void {
    Object.assign(sh.uniforms, this.U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aChase;\nvarying float vChase;\nvarying vec3 vLP;\nvarying vec3 vLN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvChase = aChase;\nvLP = position;\nvLN = objectNormal;');
    const common = /* glsl */ `#include <common>
uniform vec3 uShaftCol;
uniform vec3 uLampColP;
varying float vChase;
varying vec3 vLP;
varying vec3 vLN;
// soft limit of an emissive colour: linear up to k, then compressed — keeps the hue (max-channel scale)
vec3 pillarSoftLimit( vec3 c, float k ) {
  float pk = max( max( c.r, c.g ), c.b );
  return pk > k ? c * ( ( k + ( pk - k ) * 0.2 ) / pk ) : c;
}`;
    const P = PILLAR;
    const stone = /* glsl */ `
#include <emissivemap_fragment>
{
  // vertical LED strips on the face edges (emissive mask) in the shaft colour
  totalEmissiveRadiance = pillarSoftLimit( totalEmissiveRadiance * uShaftCol * vChase * 7.0, 3.0 );
  // uplighters on the pedestal step grazing the four shaft faces, fading with height
  float vert = 1.0 - smoothstep( 0.2, 0.6, abs( vLN.y ) );
  float hU = vLP.y;
  float graze = vert * smoothstep( ${(P.baseTop - 0.1).toFixed(2)}, ${(P.baseTop + 0.35).toFixed(2)}, hU ) * ( exp( - ( hU - ${P.baseTop.toFixed(2)} ) / 2.4 ) + 0.05 ) * ( 1.0 - step( ${P.shaftTop.toFixed(2)}, hU ) );
  // the pedestal itself gets the fixtures' spill
  graze += vert * ( 1.0 - smoothstep( 0.9, ${P.pedestalTop.toFixed(2)}, hU ) ) * smoothstep( 0.75, 0.85, hU ) * 0.3;
  totalEmissiveRadiance += diffuseColor.rgb * pillarSoftLimit( uShaftCol * vChase, 1.6 ) * graze * 0.55;
  // lantern light falling on the capital top
  float top = smoothstep( 0.3, 0.9, vLN.y ) * smoothstep( ${(P.capTop - 0.2).toFixed(2)}, ${P.capTop.toFixed(2)}, hU );
  totalEmissiveRadiance += diffuseColor.rgb * pillarSoftLimit( uLampColP * vChase, 1.6 ) * top * 0.9;
}`;
    const crystal = /* glsl */ `
#include <emissivemap_fragment>
{
  vec3 n = normalize( vLN );
  // facets catch the inner light unevenly (the glass reads as cut, not flat)
  float facet = 0.78 + 0.22 * dot( n, normalize( vec3( 0.35, -0.3, 0.88 ) ) );
  // hot point at the bottom apex (the lamp inside sits low in the glass), lid under the hood dim
  float dA = length( vLP - vec3( 0.0, ${P.lanternBottom.toFixed(2)}, 0.0 ) );
  float core = 1.0 + 3.2 * exp( - dA * dA * 6.0 );
  float up = smoothstep( ${(P.girdle - 0.35).toFixed(2)}, ${P.girdle.toFixed(2)}, vLP.y ) * 0.35;
  vec3 e = totalEmissiveRadiance * uLampColP * vChase * facet * core * ( 1.0 - up ) * 3.4;
  totalEmissiveRadiance = pillarSoftLimit( e, 3.6 );
}`;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', common).replace('#include <emissivemap_fragment>', kind === 'stone' ? stone : crystal);
  }

  /** per-frame: colours from app.env, chase multipliers */
  update(env: LightEnv, haze: number): void {
    const a = this.chase.array as Float32Array;
    for (let i = 0; i < a.length; i++) a[i] = pillarChase(env, i);
    this.chase.needsUpdate = true;
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
  const rect = (r: [number, number, number, number]) => ({ x: r[0] * S, y: (1 - r[3]) * S, w: (r[2] - r[0]) * S, h: (r[3] - r[1]) * S });

  const stoneBase = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, course: number, tone: number) => {
    ctx.fillStyle = `rgb(${tone},${tone - 8},${tone - 20})`;
    ctx.fillRect(x, y, w, h);
    // ashlar courses with staggered joints, per-block tint, grime
    for (let yy = y; yy < y + h; yy += course) {
      let xx = x - rng.range(0, course * 1.5);
      while (xx < x + w) {
        const bw = course * rng.range(1.4, 2.4);
        const t = tone + rng.range(-12, 10);
        ctx.fillStyle = `rgb(${t},${t - 7},${t - 19})`;
        ctx.fillRect(xx + 1, yy + 1, bw - 2, course - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        ctx.fillRect(xx + 1, yy + course * 0.7, bw - 2, course * 0.3 - 1);
        xx += bw;
      }
      ctx.fillStyle = 'rgba(40,34,28,0.5)';
      ctx.fillRect(x, yy, w, 1.5);
    }
    // vertical grime streaks
    for (let i = 0; i < w / 6; i++) {
      ctx.fillStyle = `rgba(30,25,20,${rng.range(0.03, 0.1)})`;
      ctx.fillRect(x + rng.range(0, w), y + rng.range(0, h * 0.3), rng.range(1, 4), rng.range(h * 0.1, h * 0.8));
    }
  };

  // --- shaft face (2.6 m wide × 6.07 m tall): ashlar, a narrow blind lancet panel (dark recess, not
  //     lit), a small blind arcade under the capital, LED strips on both face edges (glow mask)
  {
    const r = rect(R_SHAFT);
    const faceW = PILLAR.shaft,
      faceH = PILLAR.shaftTop - PILLAR.baseTop;
    stoneBase(g, r.x, r.y, r.w, r.h, r.h / 14, 96);
    const cx = r.x + r.w / 2;
    const px = r.w / faceW,
      py = r.h / faceH;
    const Y = (m: number) => r.y + r.h - m * py; // metres above the shaft bottom -> canvas y
    const lancet = (ctx: CanvasRenderingContext2D, x0: number, x1: number, yb: number, yt: number) => {
      const w = x1 - x0;
      ctx.beginPath();
      ctx.moveTo(x0, yb);
      ctx.lineTo(x0, yt);
      ctx.quadraticCurveTo(x0, yt - w * 0.55, (x0 + x1) / 2, yt - w * 0.95);
      ctx.quadraticCurveTo(x1, yt - w * 0.55, x1, yt);
      ctx.lineTo(x1, yb);
      ctx.closePath();
    };
    // shallow pilaster edges (slightly lighter stone) framing the face
    g.fillStyle = 'rgba(150,135,115,0.18)';
    g.fillRect(r.x, r.y, 0.3 * px, r.h);
    g.fillRect(r.x + r.w - 0.3 * px, r.y, 0.3 * px, r.h);
    // narrow blind lancet panel: moulding + dark recess, two stacked lights
    g.fillStyle = '#6a5d4e';
    lancet(g, cx - 0.4 * px, cx + 0.4 * px, Y(0.5), Y(5.1));
    g.fill();
    g.fillStyle = '#2a231c';
    for (const [yb, yt] of [[0.7, 2.3], [2.7, 4.95]] as [number, number][]) {
      lancet(g, cx - 0.26 * px, cx + 0.26 * px, Y(yb), Y(yt));
      g.fill();
    }
    // colonnette in the recess
    g.fillStyle = '#5a4f42';
    g.fillRect(cx - 0.03 * px, Y(4.8), 0.06 * px, 4.1 * py);
    // blind arcade frieze under the capital
    g.fillStyle = '#4e443a';
    for (let k = 0; k < 4; k++) {
      const x0 = r.x + (k + 0.22) * (r.w / 4);
      lancet(g, x0, x0 + (r.w / 4) * 0.56, Y(5.95), Y(5.45));
      g.fill();
    }
    // vertical RGB LED strips along both face edges (5 cm diffuser in a 12 cm channel): the housing is
    // dark in the albedo, the diffuser is the glow mask
    g.fillStyle = '#17150f';
    ge.fillStyle = '#fff';
    for (const ex of [0.05, faceW - 0.17]) {
      g.fillRect(r.x + ex * px, r.y, 0.12 * px, r.h);
      ge.fillRect(r.x + (ex + 0.035) * px, r.y + 0.1 * py, Math.max(2, 0.05 * px), r.h - 0.2 * py);
    }
  }
  // --- plain stone
  {
    const r = rect(R_STONE);
    stoneBase(g, r.x, r.y, r.w, r.h, r.h / 8, 92);
  }
  // --- capital frieze (dentils + small arches)
  {
    const r = rect(R_CAP);
    stoneBase(g, r.x, r.y, r.w, r.h, r.h / 3, 94);
    g.fillStyle = '#4a4036';
    for (let k = 0; k < 10; k++) g.fillRect(r.x + (k + 0.25) * (r.w / 10), r.y + r.h * 0.12, r.w / 20, r.h * 0.22);
    g.fillStyle = '#3a3129';
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      g.arc(r.x + (k + 0.5) * (r.w / 6), r.y + r.h * 0.8, r.w / 16, Math.PI, 0);
      g.fill();
    }
  }
  // --- banner: deep red cloth, thin gold border, a flame (no emblem)
  {
    const r = rect(R_BANNER);
    // dark enough that the pedestal uplights graze it as cloth, not as a glowing red window
    g.fillStyle = '#26040a';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = '#5e4822';
    g.lineWidth = r.w * 0.03;
    g.strokeRect(r.x + r.w * 0.07, r.y + r.h * 0.04, r.w * 0.86, r.h * 0.9);
    const cx = r.x + r.w / 2,
      cy = r.y + r.h * 0.55;
    const flame = (s: number, col: string) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(cx, cy - r.h * 0.32 * s);
      g.bezierCurveTo(cx + r.w * 0.34 * s, cy - r.h * 0.04 * s, cx + r.w * 0.26 * s, cy + r.h * 0.2 * s, cx, cy + r.h * 0.24 * s);
      g.bezierCurveTo(cx - r.w * 0.26 * s, cy + r.h * 0.2 * s, cx - r.w * 0.34 * s, cy - r.h * 0.04 * s, cx, cy - r.h * 0.32 * s);
      g.fill();
    };
    flame(1, '#5a1a08');
    flame(0.66, '#7a3410');
    flame(0.36, '#9a6026');
    g.fillStyle = '#5e4822';
    for (let k = 0; k < 10; k++) g.fillRect(r.x + (k + 0.3) * (r.w / 10), r.y + r.h * 0.95, r.w / 26, r.h * 0.05);
  }
  const atlas = canvasTexture(c, { aniso: 8 });
  const glow = canvasTexture(ce, { aniso: 8 });
  return { atlas, glow };
}

/** lower-glass facet (triangle: girdle edge along v = 1, apex at (0.5, 0)): glass with mullions */
function glassTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S);
  // canvas y = (1 - v) * S: girdle edge at canvas y 0, apex at canvas bottom
  const grad = g.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, 'rgb(150,150,150)');
  grad.addColorStop(0.55, 'rgb(215,215,215)');
  grad.addColorStop(1, 'rgb(255,255,255)');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(S, 0);
  g.lineTo(S / 2, S);
  g.closePath();
  g.fill();
  // mullions: triangle edges (shared with the neighbour facet = the corner bars), a centre bar, and
  // two horizontal glazing bars
  g.strokeStyle = '#000';
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(S / 2, S);
  g.lineTo(S, 0);
  g.stroke();
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(S / 2, 0);
  g.lineTo(S / 2, S * 0.86);
  g.stroke();
  for (const v of [0.32, 0.62]) {
    const y = v * S;
    const half = (S / 2) * (1 - v);
    g.fillRect(S / 2 - half, y - 2, half * 2, 4);
  }
  // frame at the girdle
  g.fillRect(0, 0, S, 10);
  return canvasTexture(c, { aniso: 4 });
}

/** bronze lattice railing (diagonal lattice between a top rail, bottom rail and posts), alpha mask */
function latticeTexture(): THREE.CanvasTexture {
  const S = 128;
  const [c, g] = makeCanvas(S, S);
  g.clearRect(0, 0, S, S);
  g.fillStyle = '#fff';
  // top and bottom rails, a post at the tile edge (tile = 1.1 m square)
  g.fillRect(0, 0, S, 9);
  g.fillRect(0, S - 12, S, 12);
  g.fillRect(0, 0, 7, S);
  // diagonal lattice
  g.strokeStyle = '#fff';
  g.lineWidth = 4;
  for (let k = -2; k <= 2; k++) {
    g.beginPath();
    g.moveTo(k * (S / 2), S - 12);
    g.lineTo(k * (S / 2) + S, 9);
    g.stroke();
    g.beginPath();
    g.moveTo(k * (S / 2), 9);
    g.lineTo(k * (S / 2) + S, S - 12);
    g.stroke();
  }
  const t = canvasTexture(c, { repeat: true, aniso: 4 });
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
