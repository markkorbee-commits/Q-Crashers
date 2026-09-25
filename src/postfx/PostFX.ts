import * as THREE from 'three';
import type { PerceptionParams, PhotoParams, QualitySettings } from '../core/types';
import { AFTERIMAGE, COMPOSITE, DOF, DOWNSAMPLE, GLARE, PREFILTER, TRAILS, UPSAMPLE, VERT } from './shaders';

type RT = THREE.WebGLRenderTarget;
type Uniforms = Record<string, THREE.IUniform>;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
/** afterimage (retinal bleaching) decay time constant, seconds */
const AFTERIMAGE_TAU = 2.4;

/**
 * HDR render pipeline:
 *   scene -> half-float MSAA target (+ depth texture)
 *   -> [trails feedback] -> MRT prefilter (blurred scene | thresholded bright) at 1/2 res (1/4 mobile)
 *   -> scene blur chain (1/4, 1/8) + COD-style bloom mip chain (13-tap down, tent up, energy normalised)
 *   -> [afterimage feedback] [star glare] [bokeh DOF gather]
 *   -> ONE composite pass (perception effects, energy-conserving bloom, hue-preserving Lottes tone
 *      map, vignette, grain, dither, compare split) -> sRGB canvas.
 * No per-frame allocations: every uniform object is created once and mutated.
 */
export class PostFX {
  perception: PerceptionParams = PostFX.defaults();
  photo: PhotoParams = { enabled: false, focusDistance: 0, aperture: 0, exposure: 1, vignette: 0.25, grain: 0.04 };
  enabled = true;
  /** base exposure (scene-referred), tweakable in the debug menu */
  exposure = 1;
  /** share of bright-pass energy redistributed into the glow (0..1) */
  bloomStrength = 0.3;
  /** bloom threshold / soft knee in exposed scene units (1 = display white) */
  bloomThreshold = 1.1;
  bloomKnee = 0.8;
  /** tent radius of the bloom upsample (texels) */
  bloomRadius = 1;
  /** relative weight of each bloom mip (fine -> wide); normalised, so energy is conserved */
  bloomWeights = [0.6, 0.8, 1, 1, 0.9, 0.8, 0.7, 0.6];
  vignette = 0.2;
  grain = 0.03;
  /** energy share of the bright pass spread into star streaks at lightSensitivity = 1 */
  glareStrength = 0.5;
  /** camera-motion blur applied to both sides of the compare split (cinematic cameras), 0..1 */
  motionBlurBase = 0;
  /** hue-preserving tone curve (Lottes 2016). hdrMax = scene value that maps to display white */
  readonly tone = { contrast: 1.5, shoulder: 0.95, hdrMax: 64, midIn: 0.18, midOut: 0.19, crosstalk: 10, crossSaturation: 1.6, saturation: 1 };
  /** musical drive for rhythmic perception effects (written by the PerceptionSystem) */
  readonly rhythm = { breath: 0, kick: 0 };

  private readonly sober = PostFX.defaults();
  private readonly hdrType: THREE.TextureDataType;
  private width = 2;
  private height = 2;
  private levels = 0;
  private baseDiv = 2;
  private mobile = false;
  private passCount = 0;
  private frameNo = 0;

  private hdr: RT | null = null;
  private base: RT | null = null;
  private d2: RT | null = null;
  private d3: RT | null = null;
  private bloomDown: RT[] = [];
  private bloomUp: RT[] = [];
  private trail: RT[] = [];
  private after: RT[] = [];
  private glare: RT | null = null;
  private dof: RT | null = null;
  private trailIdx = 0;
  private trailValid = false;
  private afterIdx = 0;
  private afterValid = false;

  private readonly quad: THREE.Mesh;
  private readonly quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly mPrefilter: THREE.RawShaderMaterial;
  private readonly mDown: THREE.RawShaderMaterial;
  private readonly mUp: THREE.RawShaderMaterial;
  private readonly mTrails: THREE.RawShaderMaterial;
  private readonly mAfter: THREE.RawShaderMaterial;
  private readonly mGlare: THREE.RawShaderMaterial;
  private readonly mDof: THREE.RawShaderMaterial;
  private readonly mComposite: THREE.RawShaderMaterial;

  // camera history for motion blur
  private readonly viewProj = new THREE.Matrix4();
  private readonly invViewProj = new THREE.Matrix4();
  private readonly prevViewProj = new THREE.Matrix4();
  private readonly camPos = new THREE.Vector3();
  private readonly prevCamPos = new THREE.Vector3();
  private readonly camDir = new THREE.Vector3();
  private readonly prevCamDir = new THREE.Vector3();
  private hasPrev = false;

  private last: { scene: THREE.Scene | null; camera: THREE.Camera | null; dt: number; time: number } = { scene: null, camera: null, dt: 0, time: 0 };

  constructor(
    private renderer: THREE.WebGLRenderer,
    private quality: QualitySettings,
  ) {
    const ext = renderer.extensions;
    this.hdrType = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;

    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = new THREE.Mesh(tri);
    this.quad.frustumCulled = false;

    const v2 = () => ({ value: new THREE.Vector2() });
    const v4 = () => ({ value: new THREE.Vector4() });
    const f = (value = 0) => ({ value });
    const tex = () => ({ value: null as THREE.Texture | null });

    this.mPrefilter = mat(PREFILTER, { tSrc: tex(), uTexel: v2(), uSpread: f(1), uThreshold: v4(), uExposure: v2(), uSplit: f(-1), uKaris: f(0.25) });
    this.mDown = mat(DOWNSAMPLE, { tSrc: tex(), uTexel: v2(), uSpread: f(1) });
    this.mUp = mat(UPSAMPLE, { tLow: tex(), tCur: tex(), uLowTexel: v2(), uRadius: f(1), uLowWeight: f(1), uCurWeight: f(1) });
    this.mTrails = mat(TRAILS, { tCur: tex(), tPrev: tex(), uPersist: v2(), uSplit: f(-1), uSmear: f(0.35) });
    this.mAfter = mat(AFTERIMAGE, { tBright: tex(), tPrev: tex(), uDecay: f(0), uFloor: f(0.6) });
    this.mGlare = mat(GLARE, {
      tSrc: tex(),
      uTexel: v2(),
      uDir: { value: [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()] },
      uFalloff: { value: [0.26, 0.3, 0.3] },
      uGain: f(0.05),
    });
    this.mDof = mat(DOF, { tColor: tex(), tDepth: tex(), uTexel: v2(), uClip: v2(), uDof: v4() });
    this.mComposite = mat(COMPOSITE, {
      tScene: tex(),
      tDepth: tex(),
      tD1: tex(),
      tD2: tex(),
      tD3: tex(),
      tBloom: tex(),
      tGlare: tex(),
      tAfter: tex(),
      tDof: tex(),
      uRes: v4(),
      uD2Size: v4(),
      uD3Size: v4(),
      uAfterSize: v4(),
      uBaseSize: v4(),
      uLodScale: f(1),
      uTime: f(),
      uFrame: f(),
      uSplit: f(-1),
      uA0: v4(),
      uA1: v4(),
      uA2: v4(),
      uA3: v4(),
      uB0: v4(),
      uB1: v4(),
      uB2: v4(),
      uB3: v4(),
      uThr: v4(),
      uBloom: v2(),
      uLook: v4(),
      uFeat: v4(),
      uMB: v2(),
      uInvViewProj: { value: new THREE.Matrix4() },
      uPrevViewProj: { value: new THREE.Matrix4() },
      uRhythm: v4(),
      uTone: v4(),
      uTone2: v4(),
      uClip: v2(),
      uDof: v4(),
    });
    this.setQuality(quality);
  }

  static defaults(): PerceptionParams {
    return {
      blur: 0,
      doubleVision: 0,
      chroma: 0,
      wobble: 0,
      tunnel: 0,
      saturation: 1,
      contrast: 1,
      exposure: 1,
      bloomBoost: 0,
      lightSensitivity: 0,
      trails: 0,
      afterimage: 0,
      patternWarp: 0,
      hueShift: 0,
      motionBlur: 0,
      split: -1,
    };
  }

  /** drawing-buffer pixels */
  setSize(w: number, h: number): void {
    w = Math.max(2, Math.floor(w));
    h = Math.max(2, Math.floor(h));
    if (w === this.width && h === this.height && this.hdr) return;
    this.width = w;
    this.height = h;
    this.allocate();
  }

  setQuality(q: QualitySettings): void {
    this.quality = q;
    this.mobile = q.level === 'mobile';
    const div = this.mobile ? 4 : 2;
    const levels = clamp(Math.round(q.bloomLevels), 2, 8);
    const samples = Math.min(q.msaa, this.renderer.capabilities.maxSamples);
    const rebuild = !this.hdr || this.hdr.samples !== samples || div !== this.baseDiv || levels !== this.levels;
    this.baseDiv = div;
    this.levels = levels;

    const mbSamples = q.level === 'ultra' ? 12 : q.level === 'high' ? 8 : q.level === 'medium' ? 6 : 0;
    setDefines(this.mComposite, { MB_SAMPLES: mbSamples });
    setDefines(this.mDof, { SAMPLES: q.level === 'ultra' ? 96 : q.level === 'high' ? 64 : q.level === 'medium' ? 40 : 24 });
    setDefines(this.mGlare, this.mobile ? { AXES: 2, TAPS: 6 } : { AXES: 3, TAPS: q.level === 'medium' ? 8 : 11 });
    this.mPrefilter.uniforms.uSpread.value = div / 2;
    this.mComposite.uniforms.uLodScale.value = div === 2 ? 1 : 0.62;

    if (rebuild) {
      this.disposeTargets();
      this.allocate();
    }
    this.precompile();
  }

  /** compile every pass program up front: no hitch when XTC / photo mode first enable a pass */
  private precompile(): void {
    if (!this.quality.postfx) return;
    for (const m of this.materials()) {
      this.quad.material = m;
      this.renderer.compile(this.quad, this.quadCam);
    }
  }

  private materials(): THREE.RawShaderMaterial[] {
    return [this.mPrefilter, this.mDown, this.mUp, this.mTrails, this.mAfter, this.mGlare, this.mDof, this.mComposite];
  }

  render(scene: THREE.Scene, camera: THREE.Camera, dt: number, time: number): void {
    this.last.scene = scene;
    this.last.camera = camera;
    this.last.dt = dt;
    this.last.time = time;
    this.frame(scene, camera, dt, time, true);
  }

  /**
   * PNG of the final image: re-renders the last frame (without advancing feedback buffers) and
   * snapshots the canvas in the same task, so it works without preserveDrawingBuffer.
   */
  async capture(): Promise<Blob | null> {
    const l = this.last;
    if (l.scene && l.camera) this.frame(l.scene, l.camera, l.dt, l.time, false);
    return new Promise((resolve) => this.renderer.domElement.toBlob((b) => resolve(b), 'image/png'));
  }

  stats(): Record<string, number | string> {
    const on = this.enabled && this.quality.postfx;
    const p = this.perception;
    const fx: string[] = [];
    if (p.trails > 0.003) fx.push('trails');
    if (p.afterimage > 0.003) fx.push('afterimage');
    if (p.lightSensitivity > 0.003) fx.push('glare');
    if (p.blur > 0.001 || p.tunnel > 0.001) fx.push('blur');
    if (this.dofActive(this.last.camera)) fx.push('dof');
    if (this.motionBlurActive()) fx.push('motionblur');
    if (p.split >= 0) fx.push('split');
    return {
      postfx: on ? 'on' : 'off',
      passes: this.passCount,
      bloomLevels: this.quality.bloom ? this.levels : 0,
      target: `${this.width}x${this.height}`,
      base: `${this.levelW(0)}x${this.levelH(0)}`,
      msaa: this.hdr?.samples ?? 0,
      hdr: this.hdrType === THREE.HalfFloatType ? 'half-float' : 'ldr-fallback',
      active: fx.join(',') || 'none',
    };
  }

  dispose(): void {
    this.disposeTargets();
    for (const m of this.materials()) m.dispose();
    this.quad.geometry.dispose();
  }

  // ------------------------------------------------------------------ frame

  private frame(scene: THREE.Scene, camera: THREE.Camera, dt: number, time: number, commit: boolean): void {
    const r = this.renderer;
    if (!this.enabled || !this.quality.postfx || !this.hdr || !this.base) {
      r.setRenderTarget(null);
      r.render(scene, camera);
      this.passCount = 1;
      this.hasPrev = this.trailValid = this.afterValid = false;
      return;
    }
    const autoClear = r.autoClear;
    const hdr = this.hdr;
    const base = this.base;
    this.passCount = 0;
    r.autoClear = true;
    r.setRenderTarget(hdr);
    r.render(scene, camera);
    this.passCount++;
    r.autoClear = false;
    const cut = this.updateCamera(camera);

    const p = this.perception;
    const split = p.split >= 0 ? clamp(p.split, 0, 1) : -1;
    const photo = this.photo.enabled;
    const baseEx = this.exposure * (photo ? this.photo.exposure : 1);
    const ls = clamp(p.lightSensitivity, 0, 1);
    const thA = this.bloomThreshold;
    const knA = this.bloomKnee;
    const thB = thA * (1 - 0.72 * ls);
    const knB = knA * (1 + 0.6 * ls);
    const step = Math.max(dt, 1 / 240);

    // 1. visual persistence feedback (before bloom, so trails glow)
    let src: THREE.Texture = hdr.texture;
    const trails = clamp(p.trails, 0, 0.97);
    if (trails > 0.003) {
      this.ensureFeedback(this.trail, this.width, this.height);
      const prev = this.trail[this.trailIdx];
      const next = this.trail[1 - this.trailIdx];
      const u = this.mTrails.uniforms;
      u.tCur.value = src;
      u.tPrev.value = prev.texture;
      (u.uPersist.value as THREE.Vector2).set(0, this.trailValid && !cut ? Math.pow(trails, step * 60) : 0);
      u.uSplit.value = split;
      this.draw(this.mTrails, next);
      src = next.texture;
      if (commit) {
        this.trailIdx = 1 - this.trailIdx;
        this.trailValid = true;
      }
    } else this.trailValid = false;

    // 2. MRT prefilter: blurred scene + bright pass
    {
      const u = this.mPrefilter.uniforms;
      u.tSrc.value = src;
      (u.uTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
      (u.uThreshold.value as THREE.Vector4).set(thA, knA, thB, knB);
      (u.uExposure.value as THREE.Vector2).set(baseEx * this.sober.exposure, baseEx * p.exposure);
      u.uSplit.value = split;
      this.draw(this.mPrefilter, base);
    }
    const d1 = base.textures[0];
    const bright = base.textures[1];

    // 3. scene blur chain (only when something needs it)
    const needBlur = p.blur > 0.001 || p.tunnel > 0.001;
    if (needBlur && this.d2 && this.d3) {
      this.down(d1, 0, this.d2);
      this.down(this.d2.texture, 1, this.d3);
    }

    // 4. bloom mip chain
    const n = this.levels;
    const bloomOn = this.quality.bloom;
    let bloomTex: THREE.Texture | null = null;
    if (bloomOn) {
      let s: THREE.Texture = bright;
      for (let i = 1; i < n; i++) {
        this.down(s, i - 1, this.bloomDown[i]);
        s = this.bloomDown[i].texture;
      }
      let wsum = 0;
      for (let i = 0; i < n; i++) wsum += this.bloomWeights[i] ?? 0.85;
      const inv = 1 / wsum;
      const u = this.mUp.uniforms;
      u.uRadius.value = this.bloomRadius;
      let low: THREE.Texture = this.bloomDown[n - 1].texture;
      for (let i = n - 2; i >= 0; i--) {
        u.tLow.value = low;
        u.tCur.value = i === 0 ? bright : this.bloomDown[i].texture;
        (u.uLowTexel.value as THREE.Vector2).set(1 / this.levelW(i + 1), 1 / this.levelH(i + 1));
        u.uLowWeight.value = (i === n - 2 ? (this.bloomWeights[n - 1] ?? 0.85) : 1) * (i === 0 ? inv : 1);
        u.uCurWeight.value = (this.bloomWeights[i] ?? 0.85) * (i === 0 ? inv : 1);
        this.draw(this.mUp, this.bloomUp[i]);
        low = this.bloomUp[i].texture;
      }
      bloomTex = low;
    }

    // 5. afterimage (retinal bleaching) feedback at 1/4 (1/8 mobile)
    let afterTex: THREE.Texture | null = null;
    const afterOn = p.afterimage > 0.003 && bloomOn;
    if (afterOn) {
      this.ensureFeedback(this.after, this.levelW(1), this.levelH(1));
      const prev = this.after[this.afterIdx];
      const next = this.after[1 - this.afterIdx];
      const u = this.mAfter.uniforms;
      u.tBright.value = this.bloomDown[1].texture;
      u.tPrev.value = prev.texture;
      u.uDecay.value = this.afterValid ? Math.exp(-step / AFTERIMAGE_TAU) : 0;
      this.draw(this.mAfter, next);
      afterTex = next.texture;
      if (commit) {
        this.afterIdx = 1 - this.afterIdx;
        this.afterValid = true;
      }
    } else this.afterValid = false;

    // 6. star / anamorphic glare
    let glareTex: THREE.Texture | null = null;
    if (ls > 0.003) {
      const g = (this.glare ??= this.target(this.levelW(0), this.levelH(0)));
      const u = this.mGlare.uniforms;
      u.tSrc.value = bright;
      const w = this.levelW(0);
      const h = this.levelH(0);
      (u.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
      const dirs = u.uDir.value as THREE.Vector2[];
      const stride = this.mobile ? 1.6 : 1.25;
      if (this.mobile) {
        dirs[0].set(stride * 1.6, 0);
        dirs[1].set(0, stride);
      } else {
        dirs[0].set(stride * 1.5, 0); // longer horizontal (anamorphic-like) streak
        dirs[1].set(stride * 0.5, stride * 0.866);
        dirs[2].set(-stride * 0.5, stride * 0.866);
      }
      // normalise so the streaks redistribute `glareStrength` of the bright energy
      const falloff = u.uFalloff.value as number[];
      const axes = this.mobile ? 2 : 3;
      const taps = (this.mGlare.defines?.TAPS as number) ?? 10;
      let wsum = 0;
      for (let a = 0; a < axes; a++) for (let i = 1; i <= taps; i++) wsum += 2 * Math.pow(2, -i * falloff[a]);
      u.uGain.value = this.glareStrength / wsum;
      this.draw(this.mGlare, g);
      glareTex = g.texture;
    }

    // 7. bokeh depth of field (photo mode)
    const persp = camera as THREE.PerspectiveCamera;
    const dofOn = this.dofActive(camera);
    const cocScale = this.photo.aperture * 0.028 * this.levelW(0);
    const maxCoc = Math.min(0.034 * this.levelW(0), this.mobile ? 14 : 26);
    if (dofOn) {
      const t = (this.dof ??= this.target(this.levelW(0), this.levelH(0)));
      const u = this.mDof.uniforms;
      u.tColor.value = d1;
      u.tDepth.value = hdr.depthTexture;
      (u.uTexel.value as THREE.Vector2).set(1 / this.levelW(0), 1 / this.levelH(0));
      (u.uClip.value as THREE.Vector2).set(persp.near, persp.far);
      (u.uDof.value as THREE.Vector4).set(this.photo.focusDistance, cocScale, maxCoc, 0);
      this.draw(this.mDof, t);
    }

    // 8. composite
    const u = this.mComposite.uniforms;
    u.tScene.value = src;
    u.tDepth.value = hdr.depthTexture;
    u.tD1.value = d1;
    u.tD2.value = this.d2?.texture ?? null;
    u.tD3.value = this.d3?.texture ?? null;
    u.tBloom.value = bloomTex;
    u.tGlare.value = glareTex;
    u.tAfter.value = afterTex;
    u.tDof.value = dofOn ? this.dof!.texture : null;
    (u.uRes.value as THREE.Vector4).set(this.width, this.height, 1 / this.width, 1 / this.height);
    const w2 = this.levelW(1);
    const h2 = this.levelH(1);
    const w3 = this.levelW(2);
    const h3 = this.levelH(2);
    (u.uD2Size.value as THREE.Vector4).set(w2, h2, 1 / w2, 1 / h2);
    (u.uD3Size.value as THREE.Vector4).set(w3, h3, 1 / w3, 1 / h3);
    (u.uAfterSize.value as THREE.Vector4).set(w2, h2, 1 / w2, 1 / h2);
    const w0 = this.levelW(0);
    const h0 = this.levelH(0);
    (u.uBaseSize.value as THREE.Vector4).set(w0, h0, 1 / w0, 1 / h0);
    u.uTime.value = time % 10000;
    u.uFrame.value = this.frameNo % 4096;
    u.uSplit.value = split;
    packParams(this.sober, u.uA0.value, u.uA1.value, u.uA2.value, u.uA3.value);
    packParams(p, u.uB0.value, u.uB1.value, u.uB2.value, u.uB3.value);
    const mbAllowed = !this.mobile;
    if (!mbAllowed) (u.uB3.value as THREE.Vector4).y = 0;
    (u.uThr.value as THREE.Vector4).set(thA, knA, thB, knB);
    (u.uBloom.value as THREE.Vector2).set(bloomOn ? this.bloomStrength : 0, bloomOn ? 1 : 0);
    (u.uLook.value as THREE.Vector4).set(baseEx, photo ? this.photo.vignette : this.vignette, photo ? this.photo.grain : this.grain, 0);
    (u.uFeat.value as THREE.Vector4).set(glareTex ? 1 : 0, afterTex ? 1 : 0, dofOn ? 1 : 0, mbAllowed && !cut ? this.motionBlurBase : 0);
    if (cut) (u.uB3.value as THREE.Vector4).y = 0;
    (u.uMB.value as THREE.Vector2).set(1 / 60 / step, 0.05);
    (u.uInvViewProj.value as THREE.Matrix4).copy(this.invViewProj);
    (u.uPrevViewProj.value as THREE.Matrix4).copy(this.prevViewProj);
    (u.uRhythm.value as THREE.Vector4).set(clamp(this.rhythm.breath, 0, 1), clamp(this.rhythm.kick, 0, 1), 0, 0);
    const tn = this.tone;
    lottes(tn.contrast, tn.shoulder, tn.hdrMax, tn.midIn, tn.midOut, u.uTone.value as THREE.Vector4);
    (u.uTone2.value as THREE.Vector4).set(tn.crosstalk, tn.crossSaturation, tn.saturation, 0);
    (u.uClip.value as THREE.Vector2).set(persp.near ?? 0.1, persp.far ?? 1000);
    (u.uDof.value as THREE.Vector4).set(this.photo.focusDistance, cocScale, maxCoc, 0);
    this.draw(this.mComposite, null);

    r.autoClear = autoClear;
    if (commit) {
      this.prevViewProj.copy(this.viewProj);
      this.prevCamPos.copy(this.camPos);
      this.prevCamDir.copy(this.camDir);
      this.hasPrev = true;
      this.frameNo++;
    }
  }

  /** current view-projection; returns true on a camera cut (teleport / mode switch) */
  private updateCamera(camera: THREE.Camera): boolean {
    this.viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.invViewProj.copy(this.viewProj).invert();
    this.camPos.setFromMatrixPosition(camera.matrixWorld);
    camera.getWorldDirection(this.camDir);
    const cut = !this.hasPrev || this.camPos.distanceToSquared(this.prevCamPos) > 36 || this.camDir.dot(this.prevCamDir) < 0.85;
    if (cut) this.prevViewProj.copy(this.viewProj);
    return cut;
  }

  private dofActive(camera: THREE.Camera | null): boolean {
    const ph = this.photo;
    return !!camera && ph.enabled && ph.focusDistance > 0 && ph.aperture > 0.001 && (camera as THREE.PerspectiveCamera).isPerspectiveCamera === true;
  }

  private motionBlurActive(): boolean {
    return !this.mobile && (this.motionBlurBase > 0.001 || this.perception.motionBlur > 0.001);
  }

  private down(src: THREE.Texture, srcLevel: number, dst: RT): void {
    const u = this.mDown.uniforms;
    u.tSrc.value = src;
    (u.uTexel.value as THREE.Vector2).set(1 / this.levelW(srcLevel), 1 / this.levelH(srcLevel));
    this.draw(this.mDown, dst);
  }

  private draw(m: THREE.Material, target: RT | null): void {
    this.quad.material = m;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quad, this.quadCam);
    this.passCount++;
  }

  // ------------------------------------------------------------------ targets

  private levelW(i: number): number {
    return Math.max(1, Math.round(this.width / this.baseDiv / (1 << i)));
  }

  private levelH(i: number): number {
    return Math.max(1, Math.round(this.height / this.baseDiv / (1 << i)));
  }

  private target(w: number, h: number, extra?: THREE.RenderTargetOptions): RT {
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: this.hdrType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
      ...extra,
    });
    for (const t of rt.textures) t.name = 'postfx';
    return rt;
  }

  private ensureFeedback(pair: RT[], w: number, h: number): void {
    if (pair.length === 2 && pair[0].width === w && pair[0].height === h) return;
    for (const t of pair) t.dispose();
    pair.length = 0;
    pair.push(this.target(w, h), this.target(w, h));
    if (pair === this.trail) this.trailValid = false;
    else this.afterValid = false;
  }

  /** (re)size every target; created on first use, resized in place afterwards */
  private allocate(): void {
    const w = this.width;
    const h = this.height;
    if (!this.hdr) {
      const depth = new THREE.DepthTexture(w, h, THREE.FloatType);
      depth.minFilter = depth.magFilter = THREE.NearestFilter;
      this.hdr = this.target(w, h, {
        samples: Math.min(this.quality.msaa, this.renderer.capabilities.maxSamples),
        depthBuffer: true,
        depthTexture: depth,
      });
    } else this.hdr.setSize(w, h);

    const size = (rt: RT | null, i: number, extra?: THREE.RenderTargetOptions): RT => {
      if (rt) {
        rt.setSize(this.levelW(i), this.levelH(i));
        return rt;
      }
      return this.target(this.levelW(i), this.levelH(i), extra);
    };
    this.base = size(this.base, 0, { count: 2 });
    this.d2 = size(this.d2, 1);
    this.d3 = size(this.d3, 2);
    for (let i = 1; i < this.levels; i++) this.bloomDown[i] = size(this.bloomDown[i] ?? null, i);
    for (let i = 0; i < this.levels - 1; i++) this.bloomUp[i] = size(this.bloomUp[i] ?? null, i);
    if (this.glare) this.glare.setSize(this.levelW(0), this.levelH(0));
    if (this.dof) this.dof.setSize(this.levelW(0), this.levelH(0));
    if (this.trail.length) this.ensureFeedback(this.trail, w, h);
    if (this.after.length) this.ensureFeedback(this.after, this.levelW(1), this.levelH(1));
    this.hasPrev = false;
  }

  private disposeTargets(): void {
    const all = [this.hdr, this.base, this.d2, this.d3, this.glare, this.dof, ...this.bloomDown, ...this.bloomUp, ...this.trail, ...this.after];
    for (const t of all) {
      if (!t) continue;
      t.depthTexture?.dispose();
      t.dispose();
    }
    this.hdr = this.base = this.d2 = this.d3 = this.glare = this.dof = null;
    this.bloomDown = [];
    this.bloomUp = [];
    this.trail = [];
    this.after = [];
    this.trailValid = this.afterValid = this.hasPrev = false;
  }
}

function mat(fragmentShader: string, uniforms: Uniforms): THREE.RawShaderMaterial {
  return new THREE.RawShaderMaterial({
    vertexShader: VERT,
    fragmentShader,
    uniforms,
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
  });
}

function setDefines(m: THREE.RawShaderMaterial, defines: Record<string, number>): void {
  let changed = false;
  m.defines ??= {};
  for (const [k, v] of Object.entries(defines)) {
    if (m.defines[k] !== v) {
      m.defines[k] = v;
      changed = true;
    }
  }
  if (changed) m.needsUpdate = true;
}

/** perception params -> 4 vec4 uniforms (layout mirrored in the composite shader) */
function packParams(p: PerceptionParams, u0: THREE.Vector4, u1: THREE.Vector4, u2: THREE.Vector4, u3: THREE.Vector4): void {
  u0.set(clamp(p.blur, 0, 1), clamp(p.doubleVision, 0, 1), clamp(p.chroma, 0, 1), clamp(p.wobble, 0, 1));
  u1.set(clamp(p.tunnel, 0, 1), clamp(p.saturation, 0, 3), clamp(p.contrast, 0.3, 2), clamp(p.exposure, 0, 8));
  u2.set(Math.max(0, p.bloomBoost), clamp(p.lightSensitivity, 0, 1), clamp(p.afterimage, 0, 1), clamp(p.patternWarp, 0, 1));
  u3.set(p.hueShift, clamp(p.motionBlur, 0, 1), clamp(p.trails, 0, 0.97), 0);
}

/** Lottes tone curve constants: returns (a, d, b, c) for x^a / (x^(a*d) * b + c) */
function lottes(a: number, d: number, hdrMax: number, midIn: number, midOut: number, out: THREE.Vector4): void {
  const ad = a * d;
  const hA = Math.pow(hdrMax, a);
  const hAD = Math.pow(hdrMax, ad);
  const mA = Math.pow(midIn, a);
  const mAD = Math.pow(midIn, ad);
  const den = (hAD - mAD) * midOut;
  out.set(a, d, (-mA + hA * midOut) / den, (hAD * mA - hA * mAD * midOut) / den);
}
