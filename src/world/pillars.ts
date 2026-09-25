import * as THREE from 'three';
import type { LightEnv } from '../core/LightEnv';
import { Rng } from '../core/rng';
import { GeoBuilder, lin } from './geom';
import { LANTERN_Y, PILLAR, PILLARS } from './site';
import { canvasTexture, makeCanvas } from './tex';
import { patchWorldMaterial, pillarChase } from './worldLights';

/**
 * The lantern pillars of the 2026 RED field = the 8 delay towers dressed as gothic stone obelisks
 * (terrain-analysis §8, stage-analysis §3.4, stage-canonical):
 *  - 5 m stone plinth, stepped pedestal, 3.2 m square shaft with gothic lancet panels (lit amber from
 *    inside), cornice capital with moving heads on the corners
 *  - two delay line arrays + a red flame banner on the audience-facing (+Z) face (oar2 photo)
 *  - a faceted crystal lantern (square bipyramid, turned 45° to the shaft — the "diamond" seen head-on
 *    in f026 / the Q-dance photo), dark upper cap over glowing glass (f113), finial at 14.6 m
 *  - crowd-barrier ring ≈ 8 m square with small bronze cannon props at the corners
 * Lamp + shaft colours/intensities come from app.env.pillar* (written by the lighting engineer),
 * per-pillar multipliers from app.env.pillarChase[i] (i = order of PILLARS / anchors pillars_top).
 */

// atlas regions (u0, v0, u1, v1), texture v up (CanvasTexture flipY)
const R_SHAFT: [number, number, number, number] = [0, 0, 0.5, 1];
const R_STONE: [number, number, number, number] = [0.5, 0, 1, 0.5];
const R_BANNER: [number, number, number, number] = [0.5, 0.5, 0.75, 1];
const R_CAP: [number, number, number, number] = [0.75, 0.75, 1, 1];
const R_DARK: [number, number, number, number] = [0.76, 0.52, 0.99, 0.72];

export class LanternPillars {
  readonly group = new THREE.Group();
  private stone!: THREE.InstancedMesh;
  private metal!: THREE.InstancedMesh;
  private crystal!: THREE.InstancedMesh;
  private halo!: THREE.InstancedMesh;
  private chase: THREE.InstancedBufferAttribute;
  private readonly U = {
    uShaftCol: { value: new THREE.Color() },
    uLampColP: { value: new THREE.Color() },
    uHaloK: { value: 1 },
    uHaloSize: { value: 5.0 },
  };
  triangles = 0;

  constructor(texSize: number, private lowDetail: boolean) {
    this.group.name = 'lantern-pillars';
    this.chase = new THREE.InstancedBufferAttribute(new Float32Array(PILLARS.length).fill(1), 1);
    this.chase.setUsage(THREE.DynamicDrawUsage);
    const { atlas, glow } = pillarAtlas(Math.min(1024, texSize));
    this.buildStone(atlas, glow);
    this.buildMetal();
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
    b.box(P.plinth, P.plinthH, P.plinth, 0, P.plinthH / 2, 0, w, 0, R_STONE);
    b.box(4.1, 0.55, 4.1, 0, P.plinthH + 0.275, 0, w, 0, R_STONE);
    b.box(3.6, P.baseTop - 1.0, 3.6, 0, (1.0 + P.baseTop) / 2, 0, w, 0, R_STONE);
    // chamfer strips between pedestal and shaft
    b.box(3.4, 0.12, 3.4, 0, P.baseTop + 0.06, 0, [0.8, 0.8, 0.8], 0, R_STONE);
    // shaft (all four faces carry the lancet panel print)
    b.box(P.shaft, P.shaftTop - P.baseTop, P.shaft, 0, (P.baseTop + P.shaftTop) / 2, 0, w, 0, R_SHAFT);
    // capital: cornice + frieze band + top slab
    b.box(3.9, 0.3, 3.9, 0, P.shaftTop + 0.15, 0, w, 0, R_STONE);
    b.box(3.5, 0.62, 3.5, 0, P.shaftTop + 0.61, 0, w, 0, R_CAP);
    b.box(3.75, 0.13, 3.75, 0, P.capTop - 0.065, 0, [0.9, 0.9, 0.9], 0, R_STONE);
    // corner pinnacles on the capital
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        b.box(0.34, 0.5, 0.34, sx * 1.62, P.capTop + 0.25, sz * 1.62, [0.85, 0.85, 0.85], 0, R_STONE);
        const cone = new THREE.ConeGeometry(0.2, 0.55, 4);
        cone.rotateY(Math.PI / 4);
        b.add(cone, new THREE.Matrix4().makeTranslation(sx * 1.62, P.capTop + 0.77, sz * 1.62), [0.8, 0.8, 0.8], R_STONE);
      }
    // red flame banner on the audience-facing face, under the delay arrays (oar2 photo)
    const banner = new THREE.PlaneGeometry(1.5, 3.6);
    b.add(banner, new THREE.Matrix4().makeTranslation(0, 3.78, P.shaft / 2 + 0.03), w, R_BANNER);
    const stoneMat = patchWorldMaterial(
      new THREE.MeshStandardMaterial({ map: atlas, emissive: 0xffffff, emissiveMap: glow, roughness: 0.86, metalness: 0, vertexColors: true }),
      { key: 'pillar-stone', edit: (sh) => this.editPillar(sh, 'stone') },
    );
    this.stone = this.instanced(b.build(), stoneMat, 'pillar-stone');
  }

  private buildMetal(): void {
    const P = PILLAR;
    const b = new GeoBuilder();
    const dark = lin('#1c1c1f');
    const bronze = lin('#3b2c1e');
    const grey = lin('#303236');
    // delay line arrays: 2 hangs × 9 boxes (K2 class, 1.34 m wide), J-curve, on the +Z face
    const zFace = P.shaft / 2;
    for (const sx of [-0.73, 0.73]) {
      let y = 9.95;
      let z = zFace + 0.42;
      let ang = 0;
      b.box(1.42, 0.1, 0.62, sx, y + 0.12, z - 0.02, grey);
      for (let i = 0; i < 12; i++) {
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(sx, y - 0.18, z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ang),
          new THREE.Vector3(1.34, 0.35, 0.55),
        );
        b.add(GeoBuilder.unit('box'), m, dark);
        y -= 0.355 * Math.cos(ang);
        z += 0.355 * Math.sin(ang);
        ang += i > 7 ? 0.03 : 0.008;
      }
      // rigging bar to the capital
      b.beam(new THREE.Vector3(sx, 10.05, zFace + 0.4), new THREE.Vector3(sx, P.shaftTop + 0.3, zFace + 0.1), 0.05, grey);
    }
    // moving heads on the capital corners (yoke + head)
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const x = sx * 1.25,
          z = sz * 1.25;
        b.box(0.34, 0.12, 0.34, x, P.capTop + 0.06, z, grey);
        b.box(0.08, 0.36, 0.3, x - 0.2, P.capTop + 0.3, z, grey);
        b.box(0.08, 0.36, 0.3, x + 0.2, P.capTop + 0.3, z, grey);
        b.cylinder(0.15, 0.42, x, P.capTop + 0.36, z, dark, 8);
      }
    // lantern neck + collar under the crystal
    b.box(1.35, 0.2, 1.35, 0, P.capTop + 0.1, 0, grey);
    b.cylinder(0.42, P.lanternBottom - P.capTop - 0.2, 0, (P.capTop + 0.2 + P.lanternBottom) / 2, 0, grey, 8);
    // four ornamental brackets holding the crystal
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const r0 = 0.45,
        r1 = 0.9;
      b.beam(
        new THREE.Vector3(Math.cos(a) * r0, P.capTop + 0.25, Math.sin(a) * r0),
        new THREE.Vector3(Math.cos(a) * r1, P.lanternBottom + 0.55, Math.sin(a) * r1),
        0.07,
        bronze,
      );
    }
    // cannon props at the plinth corners, turned outwards (Q-dance Endshow photo)
    if (!this.lowDetail) {
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const yaw = Math.atan2(sx, sz);
          const base = new THREE.Matrix4().compose(new THREE.Vector3(sx * 3.05, 0, sz * 3.05), new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw), new THREE.Vector3(1, 1, 1));
          const part = (g: THREE.BufferGeometry, m: THREE.Matrix4, c: [number, number, number]) => b.add(g, base.clone().multiply(m), c);
          part(GeoBuilder.unit('box'), new THREE.Matrix4().compose(new THREE.Vector3(0, 0.42, -0.1), new THREE.Quaternion(), new THREE.Vector3(0.55, 0.35, 1.0)), bronze);
          const barrel = new THREE.CylinderGeometry(0.13, 0.2, 1.55, 10);
          part(barrel, new THREE.Matrix4().compose(new THREE.Vector3(0, 0.72, 0.15), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2 - 0.3), new THREE.Vector3(1, 1, 1)), dark);
          for (const wx of [-0.34, 0.34]) {
            const wheel = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 12);
            part(wheel, new THREE.Matrix4().compose(new THREE.Vector3(wx, 0.4, -0.15), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), new THREE.Vector3(1, 1, 1)), bronze);
          }
        }
    }
    const mat = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.5 }), { key: 'pillar-metal' });
    this.metal = this.instanced(b.build(), mat, 'pillar-metal');
  }

  private buildCrystal(): void {
    const P = PILLAR;
    const r = P.crystalR;
    const pos: number[] = [];
    const uv: number[] = [];
    const ring = (y: number) => [0, 1, 2, 3].map((k) => new THREE.Vector3(Math.cos((k * Math.PI) / 2) * r, y, Math.sin((k * Math.PI) / 2) * r));
    const g0 = ring(P.girdle),
      g1 = ring(P.girdleTop);
    const lowApex = new THREE.Vector3(0, P.lanternBottom, 0);
    const topApex = new THREE.Vector3(0, P.crystalTop, 0);
    const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, uvs: number[]) => {
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      uv.push(...uvs);
    };
    for (let k = 0; k < 4; k++) {
      const k1 = (k + 1) % 4;
      // lower glass facets (bright): uv region [0,0.5]x[0,0.5]
      tri(g0[k1], g0[k], lowApex, [0, 0.5, 0.5, 0.5, 0.25, 0]);
      // girdle band: [0.5,1]x[0,1]
      tri(g0[k], g0[k1], g1[k1], [0.5, 0, 1, 0, 1, 1]);
      tri(g0[k], g1[k1], g1[k], [0.5, 0, 1, 1, 0.5, 1]);
      // upper cap facets (dimmer, framed): [0,0.5]x[0.5,1]
      tri(g1[k], g1[k1], topApex, [0, 0.5, 0.5, 0.5, 0.25, 1]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    // finial spike (metal: uv into a dark corner of the glow map)
    const fin = new THREE.ConeGeometry(0.1, P.top - P.crystalTop + 0.05, 6);
    fin.translate(0, (P.crystalTop + P.top) / 2, 0);
    const b = new GeoBuilder();
    b.add(g, new THREE.Matrix4(), 0xffffff);
    const ball = new THREE.SphereGeometry(0.13, 8, 6);
    ball.translate(0, P.crystalTop + 0.04, 0);
    b.add(ball, new THREE.Matrix4(), 0xffffff, [0.51, 0.51, 0.52, 0.52]);
    b.add(fin, new THREE.Matrix4(), 0xffffff, [0.51, 0.51, 0.52, 0.52]);
    const tex = crystalTexture();
    const mat = patchWorldMaterial(
      new THREE.MeshStandardMaterial({ color: '#2a3036', emissive: 0xffffff, emissiveMap: tex, map: tex, metalness: 0.4, roughness: 0.18, vertexColors: true }),
      { key: 'pillar-crystal', lamps: false, edit: (sh) => this.editPillar(sh, 'crystal') },
    );
    this.crystal = this.instanced(b.build(), mat, 'pillar-crystal');
  }

  /** additive billboard glow around each lantern (light scattering in the haze) */
  private buildHalo(): void {
    const g = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.U,
      vertexShader: /* glsl */ `
        attribute float aChase;
        uniform float uHaloSize;
        varying vec2 vUv;
        varying float vI;
        void main() {
          vec4 c = modelViewMatrix * instanceMatrix * vec4( 0.0, ${LANTERN_Y.toFixed(2)}, 0.0, 1.0 );
          vec4 mv = c + vec4( position.xy * uHaloSize, 0.0, 0.0 );
          gl_Position = projectionMatrix * mv;
          vUv = position.xy;
          // fade the halo when the camera is inside it
          vI = aChase * smoothstep( 2.0, 10.0, - c.z );
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uLampColP;
        uniform float uHaloK;
        varying vec2 vUv;
        varying float vI;
        void main() {
          float r2 = dot( vUv, vUv );
          float a = exp( - r2 * 7.0 ) * 0.28 + exp( - r2 * 40.0 ) * 0.9;
          a *= 1.0 - smoothstep( 0.8, 1.0, r2 );
          gl_FragColor = vec4( uLampColP * ( a * vI * uHaloK ), 1.0 );
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
    const common = '#include <common>\nuniform vec3 uShaftCol;\nuniform vec3 uLampColP;\nvarying float vChase;\nvarying vec3 vLP;\nvarying vec3 vLN;';
    const stone = /* glsl */ `
#include <emissivemap_fragment>
{
  // backlit lancet panels / LED strips (emissive mask) in the shaft colour
  totalEmissiveRadiance *= uShaftCol * vChase * 6.0;
  // uplighters at the pedestal grazing the four shaft faces, fading with height
  float vert = 1.0 - smoothstep( 0.2, 0.6, abs( vLN.y ) );
  float hU = vLP.y;
  float graze = vert * smoothstep( 1.6, 2.1, hU ) * ( exp( - ( hU - 1.7 ) / 2.2 ) * 1.0 + 0.05 ) * ( 1.0 - step( ${PILLAR.shaftTop.toFixed(2)}, hU ) );
  // the pedestal itself gets the fixtures' spill
  graze += vert * ( 1.0 - smoothstep( 0.6, 1.7, hU ) ) * 0.35;
  totalEmissiveRadiance += diffuseColor.rgb * uShaftCol * vChase * graze * 0.6;
  // lantern light falling on the capital top and pinnacles
  float top = smoothstep( 0.3, 0.9, vLN.y ) * smoothstep( 10.2, 11.0, hU );
  totalEmissiveRadiance += diffuseColor.rgb * uLampColP * vChase * top * 1.6;
}`;
    const crystal = /* glsl */ `
#include <emissivemap_fragment>
{
  vec3 n = normalize( vLN );
  float facet = 0.72 + 0.28 * dot( n, normalize( vec3( 0.35, 0.3, 0.88 ) ) );
  totalEmissiveRadiance *= uLampColP * vChase * 11.0 * facet;
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
    this.U.uHaloK.value = 0.55 + 0.9 * Math.min(1.5, Math.max(0, haze));
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
        const t = tone + rng.range(-16, 14);
        ctx.fillStyle = `rgb(${t},${t - 7},${t - 19})`;
        ctx.fillRect(xx + 1, yy + 1, bw - 2, course - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(xx + 1, yy + course * 0.7, bw - 2, course * 0.3 - 1);
        xx += bw;
      }
      ctx.fillStyle = 'rgba(40,34,28,0.55)';
      ctx.fillRect(x, yy, w, 1.5);
    }
    // vertical grime streaks
    for (let i = 0; i < w / 6; i++) {
      ctx.fillStyle = `rgba(30,25,20,${rng.range(0.03, 0.1)})`;
      ctx.fillRect(x + rng.range(0, w), y + rng.range(0, h * 0.3), rng.range(1, 4), rng.range(h * 0.1, h * 0.8));
    }
  };

  // --- shaft face: ashlar with a gothic lancet panel, rose window, frieze
  {
    const r = rect(R_SHAFT);
    stoneBase(g, r.x, r.y, r.w, r.h, r.h / 17, 100);
    const cx = r.x + r.w / 2;
    // face is 3.2 m wide x 8.5 m tall: px per metre
    const px = r.w / 3.2,
      py = r.h / 8.5;
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
    // outer moulding
    g.fillStyle = '#5e5347';
    lancet(g, cx - 0.66 * px, cx + 0.66 * px, Y(0.3), Y(6.55));
    g.fill();
    g.fillStyle = '#7a6c5c';
    lancet(g, cx - 0.55 * px, cx + 0.55 * px, Y(0.4), Y(6.55));
    g.fill();
    // recessed panel with two lancets + tracery; glow mask = the glass
    g.fillStyle = '#231c16';
    ge.fillStyle = '#fff';
    for (const [a, b] of [[-0.44, -0.05], [0.05, 0.44]]) {
      lancet(g, cx + a * px, cx + b * px, Y(0.55), Y(5.75));
      g.fill();
      lancet(ge, cx + a * px, cx + b * px, Y(0.55), Y(5.75));
      ge.fill();
    }
    // quatrefoil / rose above the lancets
    const rose = (ctx: CanvasRenderingContext2D, rr: number) => {
      ctx.beginPath();
      ctx.arc(cx, Y(6.35), rr, 0, Math.PI * 2);
      ctx.fill();
    };
    g.fillStyle = '#231c16';
    rose(g, 0.27 * px);
    rose(ge, 0.27 * px);
    // tracery bars (dark in the glow mask)
    ge.fillStyle = '#000';
    g.fillStyle = '#6a5c4c';
    for (let k = 0; k < 4; k++) {
      const yy = Y(1.4 + k * 1.1);
      ge.fillRect(cx - 0.7 * px, yy, 1.4 * px, 0.05 * py);
      g.fillRect(cx - 0.7 * px, yy, 1.4 * px, 0.05 * py);
    }
    ge.save();
    ge.translate(cx, Y(6.35));
    g.save();
    g.translate(cx, Y(6.35));
    for (let k = 0; k < 4; k++) {
      ge.rotate(Math.PI / 4);
      g.rotate(Math.PI / 4);
      ge.fillRect(-0.27 * px, -0.03 * px, 0.54 * px, 0.06 * px);
      g.fillRect(-0.27 * px, -0.03 * px, 0.54 * px, 0.06 * px);
    }
    ge.restore();
    g.restore();
    // blind arcade frieze near the top
    g.fillStyle = '#5a4f43';
    for (let k = 0; k < 5; k++) {
      const x0 = r.x + (k + 0.2) * (r.w / 5);
      lancet(g, x0, x0 + r.w / 5 * 0.6, Y(7.9), Y(7.2));
      g.fill();
    }
    // vertical LED strips at both face edges (uplight strips) — glow mask only, dim
    ge.fillStyle = 'rgb(90,90,90)';
    ge.fillRect(r.x + 0.06 * px, Y(8.4), 0.05 * px, 8.2 * py);
    ge.fillRect(r.x + r.w - 0.11 * px, Y(8.4), 0.05 * px, 8.2 * py);
  }
  // --- plain stone
  {
    const r = rect(R_STONE);
    stoneBase(g, r.x, r.y, r.w, r.h, r.h / 8, 96);
  }
  // --- capital frieze (dentils + small arches)
  {
    const r = rect(R_CAP);
    stoneBase(g, r.x, r.y, r.w, r.h, r.h / 3, 98);
    g.fillStyle = '#4a4036';
    for (let k = 0; k < 10; k++) g.fillRect(r.x + (k + 0.25) * (r.w / 10), r.y + r.h * 0.12, r.w / 20, r.h * 0.22);
    g.fillStyle = '#3a3129';
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      g.arc(r.x + (k + 0.5) * (r.w / 6), r.y + r.h * 0.8, r.w / 16, Math.PI, 0);
      g.fill();
    }
  }
  // --- banner: dark red cloth, gold border, original flame-and-eye emblem
  {
    const r = rect(R_BANNER);
    g.fillStyle = '#4e0913';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = '#b8903e';
    g.lineWidth = r.w * 0.04;
    g.strokeRect(r.x + r.w * 0.06, r.y + r.h * 0.04, r.w * 0.88, r.h * 0.9);
    const cx = r.x + r.w / 2,
      cy = r.y + r.h * 0.45;
    const flame = (s: number, col: string) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(cx, cy - r.h * 0.3 * s);
      g.bezierCurveTo(cx + r.w * 0.35 * s, cy - r.h * 0.05 * s, cx + r.w * 0.28 * s, cy + r.h * 0.22 * s, cx, cy + r.h * 0.26 * s);
      g.bezierCurveTo(cx - r.w * 0.28 * s, cy + r.h * 0.22 * s, cx - r.w * 0.35 * s, cy - r.h * 0.05 * s, cx, cy - r.h * 0.3 * s);
      g.fill();
    };
    flame(1, '#c2410f');
    flame(0.72, '#f08a1c');
    flame(0.45, '#ffd06a');
    // eye
    g.fillStyle = '#2a0508';
    g.beginPath();
    g.ellipse(cx, cy + r.h * 0.06, r.w * 0.16, r.h * 0.035, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffe8b0';
    g.beginPath();
    g.arc(cx, cy + r.h * 0.06, r.h * 0.022, 0, Math.PI * 2);
    g.fill();
    // fringe
    g.fillStyle = '#b8903e';
    for (let k = 0; k < 12; k++) g.fillRect(r.x + (k + 0.3) * (r.w / 12), r.y + r.h * 0.95, r.w / 30, r.h * 0.05);
  }
  // --- dark metal swatch
  {
    const r = rect(R_DARK);
    g.fillStyle = '#26221e';
    g.fillRect(r.x, r.y, r.w, r.h);
  }
  const atlas = canvasTexture(c, { aniso: 4 });
  const glow = canvasTexture(ce, { aniso: 4 });
  return { atlas, glow };
}

function crystalTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S);
  // canvas y = 1 - v. lower facet region v 0..0.5 = canvas bottom half, left
  const facet = (y0: number, bright: number, apexUp: boolean) => {
    const h = S / 2,
      w = S / 2;
    const grad = g.createLinearGradient(0, y0, 0, y0 + h);
    const lo = `rgba(255,255,255,${bright})`;
    const hi = `rgba(255,255,255,${bright * 0.65})`;
    grad.addColorStop(0, apexUp ? hi : lo);
    grad.addColorStop(1, apexUp ? lo : hi);
    g.fillStyle = grad;
    g.beginPath();
    if (apexUp) {
      g.moveTo(0, y0 + h);
      g.lineTo(w, y0 + h);
      g.lineTo(w / 2, y0);
    } else {
      g.moveTo(0, y0);
      g.lineTo(w, y0);
      g.lineTo(w / 2, y0 + h);
    }
    g.closePath();
    g.fill();
    // frame along the edges + a central mullion
    g.strokeStyle = '#000';
    g.lineWidth = 7;
    g.stroke();
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(w / 2, y0);
    g.lineTo(w / 2, y0 + h);
    g.stroke();
  };
  // upper facets (v 0.5..1 -> canvas top half): apex at v=1 -> canvas top => apexUp
  facet(0, 0.62, true);
  // lower facets (v 0..0.5 -> canvas bottom half): apex at v=0 -> canvas bottom
  facet(S / 2, 1.0, false);
  // girdle band (u 0.5..1): bright glass with a frame top/bottom
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillRect(S / 2, 0, S / 2, S);
  g.fillStyle = '#000';
  g.fillRect(S / 2, 0, S / 2, S * 0.12);
  g.fillRect(S / 2, S * 0.88, S / 2, S * 0.12);
  g.fillRect(S / 2, 0, 5, S);
  // metal corner used by the finial
  g.fillStyle = '#000';
  g.fillRect(S * 0.5, S * 0.47, S * 0.03, S * 0.03);
  return canvasTexture(c, { aniso: 2 });
}
