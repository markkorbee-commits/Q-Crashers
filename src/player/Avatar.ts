import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { LightEnv } from '../core/LightEnv';
import { clamp, lerp, Rng, smoothstep } from '../core/rng';
import type { FrameContext } from '../core/types';
import { approachAngle, damp, wrapAngle } from './motion';
import type { PlayerController } from './PlayerController';

const TAU = Math.PI * 2;

/** Surface look of a body part: sRGB colour, roughness, printed (uses the T-shirt texture). */
interface Look {
  color: string;
  rough: number;
  print?: boolean;
}

/** The default outfit: black Defqon.1 tee, black shorts, white socks, black sneakers, black cap. */
const L = {
  skin: { color: '#c48965', rough: 0.62 },
  print: { color: '#ffffff', rough: 0.95, print: true },
  shirt: { color: '#0e0e11', rough: 0.95 },
  shorts: { color: '#17171b', rough: 0.8 },
  sock: { color: '#e6e3de', rough: 0.9 },
  shoe: { color: '#141416', rough: 0.55 },
  sole: { color: '#efece6', rough: 0.7 },
  accent: { color: '#d2101a', rough: 0.5 },
  hair: { color: '#2a1c13', rough: 0.8 },
  cap: { color: '#0b0b0d', rough: 0.7 },
} satisfies Record<string, Look>;

/** T-shirt texture layout: torso v in [0, PRINT_V]; white texels above for untextured parts. */
const PRINT_V = 0.86;
const WHITE_UV = [0.5, 0.965] as const;

/**
 * Procedural low-poly Defqon.1 fan (~1.80 m) for the third-person view.
 * Built from primitives on a 15-bone skeleton and merged into ONE rigidly skinned mesh
 * (one draw call; colour + roughness per vertex, printed tee via a canvas texture).
 * Animated procedurally: walk / run cycle synced to the player's stride phase (feet match the
 * head bob), hardstyle bounce + fist pumps on the beat when standing, jump tuck, head tracking
 * the look direction. A stage-facing rim light driven by the LightEnv makes the silhouette read
 * against the stage like the people in the crowd. Faces -Z at yaw 0 (towards the stage).
 */
export class Avatar {
  readonly root = new THREE.Group();
  /** body facing (radians); turns towards walking direction, or the look direction when idle */
  bodyYaw = 0;
  private skel = new THREE.Bone();
  private hips = new THREE.Bone();
  private spine = new THREE.Bone();
  private neck = new THREE.Bone();
  private head = new THREE.Bone();
  private shoulderL = new THREE.Bone();
  private shoulderR = new THREE.Bone();
  private elbowL = new THREE.Bone();
  private elbowR = new THREE.Bone();
  private hipL = new THREE.Bone();
  private hipR = new THREE.Bone();
  private kneeL = new THREE.Bone();
  private kneeR = new THREE.Bone();
  private ankleL = new THREE.Bone();
  private ankleR = new THREE.Bone();
  private mesh!: THREE.SkinnedMesh;
  private parts: { geo: THREE.BufferGeometry; bone: THREE.Bone; look: Look }[] = [];
  private walkEnv = 0;
  private rim = { uRimColor: { value: new THREE.Color() }, uRimDir: { value: new THREE.Vector3(0, 0, -1) } };
  private texture!: THREE.CanvasTexture;
  private tmp = new THREE.Vector3();

  constructor(opts: { detail: 'low' | 'high'; textureSize: number }) {
    this.root.name = 'player-avatar';
    this.root.rotation.order = 'YXZ';
    this.build(opts.detail === 'high' ? 12 : 8, opts.textureSize);
  }

  setShadows(on: boolean): void {
    this.mesh.castShadow = on;
  }

  // --- construction ---------------------------------------------------------------------------

  /** add a primitive to a bone (geometry given in the bone's local space) */
  private part(geo: THREE.BufferGeometry, bone: THREE.Bone, look: Look, x = 0, y = 0, z = 0): void {
    geo.translate(x, y, z);
    this.parts.push({ geo, bone, look });
  }

  private joint(bone: THREE.Bone, parent: THREE.Object3D, x: number, y: number, z: number): THREE.Bone {
    bone.position.set(x, y, z);
    parent.add(bone);
    return bone;
  }

  /**
   * Tapered, rounded limb hanging down from its joint (pivot at the top): radius rTop at the
   * joint, rMid (muscle bulge) at `midAt` of the length, rBot at the far end.
   */
  private limb(len: number, rTop: number, rMid: number, rBot: number, midAt: number, seg: number): THREE.BufferGeometry {
    const V = (x: number, y: number) => new THREE.Vector2(x, y);
    const prof = [
      V(0.001, -len - rBot * 0.9),
      V(rBot * 0.72, -len - rBot * 0.62),
      V(rBot, -len),
      V(rMid, -len * midAt),
      V(rTop, -rTop * 0.15),
      V(rTop * 0.74, rTop * 0.55),
      V(0.001, rTop * 0.85),
    ];
    return new THREE.LatheGeometry(prof, seg);
  }

  private build(seg: number, texSize: number): void {
    // skeleton (rest pose = bind pose, all rotations zero)
    this.joint(this.hips, this.skel, 0, 0.95, 0);
    this.joint(this.spine, this.hips, 0, 0.02, 0);
    this.joint(this.neck, this.spine, 0, 0.48, 0);
    this.joint(this.head, this.neck, 0, 0.1, 0);
    this.joint(this.shoulderL, this.spine, -0.19, 0.418, 0.01);
    this.joint(this.shoulderR, this.spine, 0.19, 0.418, 0.01);
    this.joint(this.elbowL, this.shoulderL, 0, -0.29, 0);
    this.joint(this.elbowR, this.shoulderR, 0, -0.29, 0);
    this.joint(this.hipL, this.hips, -0.092, -0.03, 0);
    this.joint(this.hipR, this.hips, 0.092, -0.03, 0);
    this.joint(this.kneeL, this.hipL, 0, -0.44, 0);
    this.joint(this.kneeR, this.hipR, 0, -0.44, 0);
    this.joint(this.ankleL, this.kneeL, 0, -0.41, 0);
    this.joint(this.ankleR, this.kneeR, 0, -0.41, 0);

    // pelvis / shorts waist
    const pelvis = new THREE.CylinderGeometry(0.156, 0.17, 0.22, seg + 4);
    pelvis.scale(1, 1, 0.72);
    this.part(pelvis, this.hips, L.shorts, 0, -0.05, 0);

    // torso: elliptic lathe, printed T-shirt (u = 0 at the chest centre, 0.5 at the back)
    const prof = [
      [0.163, -0.1],
      [0.158, 0.0],
      [0.151, 0.1],
      [0.159, 0.2],
      [0.174, 0.3],
      [0.18, 0.37],
      [0.172, 0.43],
      [0.14, 0.476],
      [0.092, 0.502],
      [0.055, 0.515],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const torso = new THREE.LatheGeometry(prof, seg + 8, Math.PI, TAU);
    torso.scale(1, 1, 0.64);
    // v linear in height (-0.1 .. 0.5) so the print layout maps to real centimetres
    const tp = torso.getAttribute('position');
    const tuv = torso.getAttribute('uv');
    for (let i = 0; i < tp.count; i++) tuv.setY(i, ((tp.getY(i) + 0.1) / 0.6) * PRINT_V);
    this.part(torso, this.spine, L.print);

    // neck + head (eyes at ~1.68 m, crown ~1.80 m with the cap)
    this.part(this.limb(0.1, 0.054, 0.056, 0.06, 0.5, seg), this.neck, L.skin, 0, 0.1, 0);
    const skull = new THREE.SphereGeometry(0.1, seg + 4, seg);
    skull.scale(0.9, 1.12, 1.0);
    this.part(skull, this.head, L.skin, 0, 0.13, 0);
    const hair = new THREE.SphereGeometry(0.104, seg + 4, seg, 0, TAU, 0, Math.PI * 0.6);
    hair.scale(0.92, 1.1, 1.03);
    hair.rotateX(0.5); // lower at the back of the head
    this.part(hair, this.head, L.hair, 0, 0.13, 0.006);
    for (const s of [-1, 1]) {
      const ear = new THREE.SphereGeometry(0.024, 6, 6);
      ear.scale(0.5, 1, 0.8);
      this.part(ear, this.head, L.skin, s * 0.09, 0.125, 0.005);
      const eye = new THREE.SphereGeometry(0.011, 6, 4);
      eye.scale(1.2, 0.8, 0.6);
      this.part(eye, this.head, L.hair, s * 0.034, 0.138, -0.093);
      const brow = new THREE.BoxGeometry(0.032, 0.007, 0.012);
      brow.rotateZ(s * -0.12);
      this.part(brow, this.head, L.hair, s * 0.035, 0.157, -0.094);
    }
    const nose = new THREE.ConeGeometry(0.014, 0.035, 5);
    nose.rotateX(-Math.PI / 2 - 0.3);
    this.part(nose, this.head, L.skin, 0, 0.115, -0.1);
    // cap: crown + brim + red front badge
    const crown = new THREE.SphereGeometry(0.108, seg + 4, 6, 0, TAU, 0, Math.PI * 0.5);
    crown.scale(0.95, 0.85, 1.03);
    this.part(crown, this.head, L.cap, 0, 0.165, 0);
    const brim = new THREE.CylinderGeometry(0.098, 0.098, 0.01, seg + 4, 1, false, Math.PI / 2, Math.PI);
    brim.scale(0.9, 1, 1.05);
    brim.rotateX(-0.12);
    this.part(brim, this.head, L.cap, 0, 0.17, -0.045);
    const badge = new THREE.PlaneGeometry(0.05, 0.028);
    badge.rotateX(-0.28);
    badge.rotateY(Math.PI);
    this.part(badge, this.head, L.accent, 0, 0.205, -0.1);

    // arms (short sleeves), festival wristband on the left wrist
    for (const side of [-1, 1] as const) {
      const sh = side < 0 ? this.shoulderL : this.shoulderR;
      const el = side < 0 ? this.elbowL : this.elbowR;
      const sleeve = new THREE.CylinderGeometry(0.056, 0.066, 0.17, seg);
      this.part(sleeve, sh, L.shirt, 0, -0.08, 0);
      this.part(new THREE.SphereGeometry(0.056, seg, 6, 0, TAU, 0, Math.PI / 2), sh, L.shirt);
      this.part(this.limb(0.29, 0.052, 0.05, 0.04, 0.4, seg), sh, L.skin);
      this.part(this.limb(0.26, 0.044, 0.046, 0.03, 0.25, seg), el, L.skin);
      const hand = new THREE.SphereGeometry(0.046, seg, 6);
      hand.scale(0.75, 1.15, 0.6);
      this.part(hand, el, L.skin, 0, -0.29, 0);
      if (side < 0) this.part(new THREE.CylinderGeometry(0.046, 0.046, 0.022, seg), el, L.accent, 0, -0.225, 0);
    }

    // legs: board shorts, white socks, black sneakers with white soles and a red stripe
    for (const side of [-1, 1] as const) {
      const hp = side < 0 ? this.hipL : this.hipR;
      const kn = side < 0 ? this.kneeL : this.kneeR;
      const an = side < 0 ? this.ankleL : this.ankleR;
      this.part(new THREE.CylinderGeometry(0.1, 0.092, 0.38, seg), hp, L.shorts, 0, -0.17, 0);
      this.part(this.limb(0.44, 0.088, 0.078, 0.058, 0.45, seg), hp, L.skin);
      this.part(this.limb(0.42, 0.056, 0.062, 0.036, 0.28, seg), kn, L.skin);
      this.part(new THREE.CylinderGeometry(0.047, 0.045, 0.08, seg), kn, L.sock, 0, -0.37, 0);
      const upper = new THREE.CapsuleGeometry(0.047, 0.17, 3, seg);
      upper.rotateX(Math.PI / 2);
      upper.scale(1.05, 0.72, 1);
      this.part(upper, an, L.shoe, 0, -0.022, -0.045);
      this.part(new THREE.BoxGeometry(0.1, 0.024, 0.275), an, L.sole, 0, -0.058, -0.047);
      this.part(new THREE.BoxGeometry(0.104, 0.012, 0.12), an, L.accent, 0, -0.03, -0.035);
    }

    this.texture = this.makeShirtTexture(Math.min(1024, Math.max(256, texSize)));
    this.assemble();
  }

  /** bake every part into bind-pose model space and merge into one rigidly skinned mesh */
  private assemble(): void {
    const bones: THREE.Bone[] = [];
    this.skel.traverse((o) => {
      if ((o as THREE.Bone).isBone) bones.push(o as THREE.Bone);
    });
    this.skel.updateMatrixWorld(true);
    const col = new THREE.Color();
    const geos = this.parts.map(({ geo, bone, look }) => {
      geo.applyMatrix4(bone.matrixWorld);
      const n = geo.getAttribute('position').count;
      const colors = new Float32Array(n * 4);
      const index = new Uint16Array(n * 4);
      const weight = new Float32Array(n * 4);
      col.set(look.color); // linear working space
      const bi = bones.indexOf(bone);
      for (let i = 0; i < n * 4; i += 4) {
        colors[i] = col.r;
        colors[i + 1] = col.g;
        colors[i + 2] = col.b;
        colors[i + 3] = look.rough;
        index[i] = bi;
        weight[i] = 1;
      }
      if (!look.print) {
        const uv = geo.getAttribute('uv');
        for (let i = 0; i < uv.count; i++) uv.setXY(i, WHITE_UV[0], WHITE_UV[1]);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(index, 4));
      geo.setAttribute('skinWeight', new THREE.BufferAttribute(weight, 4));
      return geo;
    });
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    this.parts.length = 0;
    if (!merged) throw new Error('avatar: geometry merge failed');

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: this.texture, roughness: 1, metalness: 0 });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = this.rim.uRimColor;
      shader.uniforms.uRimDir = this.rim.uRimDir;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;\nuniform vec3 uRimDir;')
        .replace(
          '#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\n#ifdef USE_COLOR_ALPHA\n  roughnessFactor = vColor.a; // per-part roughness\n#endif',
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          {
            // light spilling from the stage: rim on silhouette edges facing it + a faint front wash
            vec3 rN = normalize(normal);
            float nv = clamp(abs(dot(rN, normalize(vViewPosition))), 0.0, 1.0);
            float toward = dot(rN, uRimDir);
            float fres = pow(1.0 - nv, 3.0);
            totalEmissiveRadiance += uRimColor * (fres * clamp(toward * 0.7 + 0.45, 0.0, 1.0) * 1.3 + max(toward, 0.0) * 0.1);
          }`,
        );
    };
    mat.customProgramCacheKey = () => 'avatar-rim';

    const mesh = (this.mesh = new THREE.SkinnedMesh(merged, mat));
    mesh.name = 'player-avatar-body';
    mesh.frustumCulled = false; // animated limbs leave the bind-pose bounds
    mesh.add(this.skel);
    mesh.bind(new THREE.Skeleton(bones));
    this.root.add(mesh);
  }

  /** black cotton tee with a red Defqon.1 print: small emblem on the chest, big back print */
  private makeShirtTexture(w: number): THREE.CanvasTexture {
    const h = Math.round((w * 0.56) / PRINT_V); // ~2 mm per texel both ways at the back
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    // canvas row for torso fraction f (0 = neckline, 1 = hem)
    const Y = (f: number) => h * (1 - PRINT_V + PRINT_V * f);
    const draw = () => {
      const g = cv.getContext('2d');
      if (!g) return;
      g.fillStyle = '#ffffff'; // untextured parts sample this strip
      g.fillRect(0, 0, w, h);
      g.fillStyle = L.shirt.color;
      g.fillRect(0, h * 0.08, w, h);
      // cotton speckle
      const rng = new Rng(7);
      for (let i = 0; i < w * 3; i++) {
        g.fillStyle = rng.chance(0.5) ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.25)';
        g.fillRect(rng.next() * w, Y(rng.next()), 1 + rng.next() * 2, 1);
      }
      const red = L.accent.color;
      const s = w / 512;
      // back print centred at u = 0.5
      this.emblem(g, w * 0.5, Y(0.16), 22 * s, red);
      g.fillStyle = red;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const px = Math.round(40 * s);
      g.font = `700 ${px}px Oswald, Impact, 'Arial Narrow', sans-serif`;
      const fit = Math.min(1, (w * 0.2) / Math.max(1, g.measureText('DEFQON.1').width));
      g.font = `700 ${Math.round(px * fit)}px Oswald, Impact, 'Arial Narrow', sans-serif`;
      g.fillText('DEFQON.1', w * 0.5, Y(0.3));
      g.font = `600 ${Math.round(10 * s)}px Oswald, Impact, 'Arial Narrow', sans-serif`;
      this.spaced(g, 'WEEKEND  WARRIOR', w * 0.5, Y(0.4), 1.6 * s);
      g.font = `400 ${Math.round(9 * s)}px Oswald, Impact, 'Arial Narrow', sans-serif`;
      this.spaced(g, '2026', w * 0.5, Y(0.47), 1.6 * s);
      // left-chest emblem (wearer's left = +u from the chest centre)
      this.emblem(g, w * 0.06, Y(0.22), 10 * s, red);
      g.font = `700 ${Math.round(9 * s)}px Oswald, Impact, sans-serif`;
      g.fillText('DEFQON.1', w * 0.06, Y(0.29));
      // worn print: knock out a few specks
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(14,14,17,0.55)';
      for (let i = 0; i < 260; i++) g.fillRect(w * 0.35 + rng.next() * w * 0.3, Y(0.08 + rng.next() * 0.46), 1.5 * s, 1.5 * s);
      g.globalCompositeOperation = 'source-over';
      tex.needsUpdate = true;
    };
    draw();
    // redraw once the display font is available
    document.fonts?.ready.then(draw).catch(() => {});
    return tex;
  }

  /** stylised dragon-wing emblem (two swept wings around a blade) */
  private emblem(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
    g.save();
    g.translate(cx, cy);
    g.fillStyle = color;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * r * 0.12, -r * 0.1);
      g.quadraticCurveTo(s * r * 0.6, -r * 0.75, s * r * 1.35, -r * 0.55);
      g.lineTo(s * r * 1.05, -r * 0.3);
      g.lineTo(s * r * 1.2, -r * 0.18);
      g.lineTo(s * r * 0.85, -r * 0.02);
      g.lineTo(s * r * 0.98, r * 0.12);
      g.quadraticCurveTo(s * r * 0.5, r * 0.08, s * r * 0.12, r * 0.35);
      g.closePath();
      g.fill();
    }
    g.beginPath();
    g.moveTo(0, -r * 0.95);
    g.lineTo(r * 0.1, -r * 0.1);
    g.lineTo(0, r * 0.8);
    g.lineTo(-r * 0.1, -r * 0.1);
    g.closePath();
    g.fill();
    g.restore();
  }

  private spaced(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, spacing: number): void {
    const widths = [...text].map((c) => g.measureText(c).width + spacing);
    let x = cx - (widths.reduce((a, b) => a + b, 0) - spacing) / 2;
    g.textAlign = 'left';
    for (let i = 0; i < text.length; i++) {
      g.fillText(text[i], x, cy);
      x += widths[i];
    }
    g.textAlign = 'center';
  }

  // --- per frame --------------------------------------------------------------------------------

  /** stage-facing rim light from the show's light environment (view-space direction) */
  updateLighting(env: LightEnv, camera: THREE.Camera, stageFocus: THREE.Vector3): void {
    const col = this.rim.uRimColor.value;
    const k = 0.35 + Math.min(2.5, env.stageIntensity) * 0.5 + env.audienceWash * 0.4;
    col.copy(env.stageColor).multiplyScalar(k);
    col.r += env.palettePrimary.r * 0.12 + env.flashColor.r * 0.25 + env.strobe * 0.6;
    col.g += env.palettePrimary.g * 0.12 + env.flashColor.g * 0.25 + env.strobe * 0.6;
    col.b += env.palettePrimary.b * 0.12 + env.flashColor.b * 0.25 + env.strobe * 0.6;
    const m = Math.max(col.r, col.g, col.b);
    if (m > 1.6) col.multiplyScalar(1.6 / m);
    const d = this.tmp.copy(stageFocus).sub(this.root.position).normalize();
    d.transformDirection(camera.matrixWorldInverse);
    this.rim.uRimDir.value.copy(d);
  }

  /** pose the body from the player state and the music */
  update(ctx: FrameContext, pl: PlayerController, pos: THREE.Vector3): void {
    const dt = ctx.dt;
    const v = pl.speed;
    // facing follows the walking direction; standing still the camera can orbit freely
    if (v > 0.25) this.bodyYaw = approachAngle(this.bodyYaw, Math.atan2(-pl.velocity.x, -pl.velocity.z), damp(7, dt));
    const lookDelta = wrapAngle(pl.yaw - this.bodyYaw);
    // head tracks the look direction, easing back to neutral when looking from the front
    const track = 1 - smoothstep(1.6, 2.3, Math.abs(lookDelta));
    this.root.position.set(pos.x, pos.y + pl.jumpY, pos.z);
    this.root.rotation.set(pl.bodyLean.pitch, this.bodyYaw, pl.bodyLean.roll);

    this.walkEnv += (smoothstep(0.08, 0.9, v) - this.walkEnv) * damp(8, dt);
    const w = this.walkEnv;
    const runK = clamp((v - 1.7) / 1.5, 0, 1);
    const th = pl.stridePhase * TAU;
    const c = Math.cos(th),
      s = Math.sin(th);

    // walk / run cycle (left heel strike at phase 0, right at 0.5 — matches the head bob)
    const thA = lerp(0.33, 0.62, runK);
    const thO = lerp(0.12, 0.22, runK); // hips flex further forward than they extend
    const wThL = thO + thA * c;
    const wThR = thO - thA * c;
    const knA = lerp(0.95, 1.6, runK);
    const wKnL = -(0.08 + knA * Math.max(0, -s));
    const wKnR = -(0.08 + knA * Math.max(0, s));
    const armA = lerp(0.32, 0.75, runK);
    const wShL = -armA * c;
    const wShR = armA * c;
    const wElL = lerp(0.22, 1.35, runK) + 0.15 * Math.max(0, c);
    const wElR = lerp(0.22, 1.35, runK) + 0.15 * Math.max(0, -c);
    const wHipsY = -lerp(0.02, 0.04, runK) * Math.cos(2 * th);
    const wLean = -(0.04 + 0.14 * runK);

    // idle: hardstyle bounce on the kick, fist pumps / hands up at high energy
    const b = ctx.beat;
    let bounce = 0,
      pump = 0,
      handsUp = 0,
      sway = 0,
      d = 0;
    if (ctx.showPlaying && b.hasKick) {
      d = Math.pow(0.5 + 0.5 * Math.cos(b.phase * TAU), 1.4); // 1 on the kick
      bounce = (0.3 + 0.7 * b.energy) * d;
      pump = smoothstep(0.68, 0.8, b.energy);
      handsUp = smoothstep(0.9, 0.98, b.energy);
    } else if (ctx.showPlaying) {
      sway = Math.sin((b.beat * Math.PI) / 2) * (0.4 + 0.6 * b.energy);
    } else {
      sway = Math.sin(ctx.time * 0.9) * 0.25;
    }
    const breathe = Math.sin(ctx.time * 1.7) * 0.012;
    const i = 1 - w;

    // air: tuck legs, lift arms
    const air = pl.grounded ? 0 : clamp(pl.jumpY / 0.3, 0, 1);

    this.hips.position.y = 0.95 + wHipsY * w - 0.053 * bounce * i - 0.04 * air;
    this.hips.position.x = 0.012 * s * w + (0.02 * sway + 0.014) * i; // weight over the right leg
    this.hips.rotation.set(0, 0.1 * c * w, (0.035 * sway + 0.028) * i);
    this.spine.rotation.set(wLean * w + 0.05 * bounce * i, -0.14 * c * w + clamp(lookDelta, -1, 1) * 0.15 * track, -0.03 * sway * i);
    this.spine.scale.y = 1 + breathe * i * 0.5;

    const thI = 0.35 * bounce + 0.4 * air; // knee = -2 x hip keeps the feet under the pelvis
    const knI = -0.7 * bounce - 0.8 * air;
    this.hipL.rotation.set(wThL * w + (thI + 0.06) * i, 0, -0.03);
    this.hipR.rotation.set(wThR * w + thI * i, 0, 0.03);
    this.kneeL.rotation.x = wKnL * w + (knI - 0.14) * i; // relaxed left knee
    this.kneeR.rotation.x = wKnR * w + knI * i;
    this.ankleL.rotation.x = -(this.hipL.rotation.x + this.kneeL.rotation.x) * 0.8;
    this.ankleR.rotation.x = -(this.hipR.rotation.x + this.kneeR.rotation.x) * 0.8;

    // arms: right fist pump (punch up on the kick), both up at the climax
    const upL = handsUp;
    const upR = Math.max(pump, handsUp);
    const iShL = lerp(0.06 + 0.1 * bounce, 2.75 + 0.12 * d, upL) + 0.5 * air;
    const iShR = lerp(0.06 + 0.1 * bounce, 2.35 + 0.45 * d, upR) + 0.5 * air;
    this.shoulderL.rotation.set(wShL * w + iShL * i, 0, -0.13 - 0.3 * upL * i);
    this.shoulderR.rotation.set(wShR * w + iShR * i, 0, 0.13 + 0.25 * upR * i);
    this.elbowL.rotation.x = wElL * w + lerp(0.3 + 0.2 * bounce, 0.25, upL) * i;
    this.elbowR.rotation.x = wElR * w + lerp(0.3 + 0.2 * bounce, 0.95 - 0.8 * d, upR) * i;

    // head follows the look direction, nods on the kick
    const hy = clamp(lookDelta, -1.1, 1.1) * track;
    this.neck.rotation.set(0, hy * 0.35, 0);
    this.head.rotation.set(clamp(pl.pitch, -0.6, 0.7) * 0.75 * track - 0.12 * bounce * i, hy * 0.5, 0.04 * sway * i);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.texture.dispose();
    this.mesh.skeleton.dispose();
  }
}
