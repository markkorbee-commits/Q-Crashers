import * as THREE from 'three';
import { pollDelay, TimeSlicer } from './yieldTo';

/**
 * GPU warm-up run before the loading screen says "Ready", so the first frame (and the ENTER click)
 * never freezes on shader compilation, texture upload or geometry upload.
 *
 *  1. compile():  `renderer.compile()` creates every program the scene can use (it traverses hidden
 *     objects too) with the same render-target state as the PostFX scene pass, then polls
 *     KHR_parallel_shader_compile completion without blocking the main thread.
 *  2. upload():   pushes every material / uniform texture to the GPU in time slices.
 *  3. warm():     one draw of the whole scene (hidden objects forced visible, culling off) into a 4x4
 *     target: uploads vertex/instance buffers, builds VAOs and fetches uniform locations. It costs
 *     one vertex pass and next to no fill.
 *
 * Nothing here changes what is rendered afterwards: visibility / culling flags are restored and
 * lights are never force-enabled (a different light set would compile a different program variant).
 */
export class GpuWarmup {
  private probe: THREE.WebGLRenderTarget | null = null;
  private probeSamples = -1;
  /** MSAA samples of the real scene target (PostFX HDR): the probe matches it so pipelines match */
  samples = 0;
  /** programs whose link status has already been awaited */
  private readonly linked = new WeakSet<object>();

  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  /** true when programs can be compiled in parallel and polled without stalling */
  get parallel(): boolean {
    return this.renderer.extensions.has('KHR_parallel_shader_compile');
  }

  /**
   * Create all programs and wait until they are linked.
   * With KHR_parallel_shader_compile the driver links on its own threads and completion is polled
   * without blocking. Without it the link results are awaited one program at a time with a paint in
   * between, so the loading screen keeps moving and shows real progress instead of one long freeze
   * inside the first texture upload or the first frame.
   * @param offscreen true when the scene is rendered into an HDR target (PostFX on): programs are
   *   then keyed with linear output / no tone mapping, exactly like the real scene pass.
   */
  async compile(scene: THREE.Scene, camera: THREE.Camera, offscreen: boolean, onProgress: (done: number, total: number) => void): Promise<number> {
    const r = this.renderer;
    const prev = r.getRenderTarget();
    const programs = r.info.programs ?? [];
    if (!this.parallel) {
      // One object at a time: create its programs, then wait for their link result. The status
      // query sits at the end of the command stream, so it only waits for work already queued;
      // paints in between keep the loading screen alive and the progress real.
      const gl = r.getContext();
      const objects: THREE.Object3D[] = [];
      scene.traverse((o) => {
        const m = o as THREE.Mesh & { isPoints?: boolean; isLine?: boolean; isSprite?: boolean };
        if (m.material && (m.isMesh || m.isPoints || m.isLine || m.isSprite)) objects.push(o);
      });
      const slice = new TimeSlicer(16);
      // await every program not awaited yet, one at a time, painting whenever a slice is used up
      const settle = async (done: number) => {
        for (let k = 0; k < programs.length; k++) {
          const p = programs[k];
          if (this.linked.has(p)) continue;
          gl.getProgramParameter(p.program as WebGLProgram, gl.LINK_STATUS);
          this.linked.add(p);
          if (slice.due()) {
            onProgress(done, objects.length);
            await slice.yield();
          }
        }
      };
      // programs queued before this call (post passes, PMREM) first
      await settle(0);
      for (let i = 0; i < objects.length; i++) {
        r.setRenderTarget(offscreen ? this.target() : null);
        try {
          r.compile(objects[i], camera, scene);
        } finally {
          r.setRenderTarget(prev);
        }
        await settle(i + 1);
        if (slice.due()) {
          onProgress(i + 1, objects.length);
          await slice.yield();
        }
      }
      await settle(objects.length);
      onProgress(objects.length, objects.length);
      return programs.length;
    }
    r.setRenderTarget(offscreen ? this.target() : null);
    try {
      r.compile(scene, camera);
    } finally {
      r.setRenderTarget(prev);
    }
    const total = programs.length;
    const t0 = performance.now();
    for (;;) {
      let ready = 0;
      for (const p of programs) if ((p as unknown as { isReady(): boolean }).isReady()) ready++;
      onProgress(ready, total);
      // a driver that never reports completion must not hang the loading screen
      if (ready >= total || performance.now() - t0 > 60000) break;
      await pollDelay();
    }
    return total;
  }

  /** Upload every texture referenced by the scene's materials (time-sliced). Returns the count. */
  async upload(scene: THREE.Scene, onProgress: (done: number, total: number) => void): Promise<number> {
    const list = collectTextures(scene);
    const slice = new TimeSlicer(24);
    for (let i = 0; i < list.length; i++) {
      this.renderer.initTexture(list[i]);
      if (slice.due()) {
        onProgress(i + 1, list.length);
        await slice.yield();
      }
    }
    onProgress(list.length, list.length);
    return list.length;
  }

  /**
   * Draw every object once into a tiny target: uniform locations, VAOs, vertex / instance buffer
   * uploads and the driver-side pipeline for its program + render state. Each object draws a
   * single primitive and a single instance: the cost is per object, not per triangle, and idle
   * effects (instance count 0, empty draw range, hidden) are included, so their first cue does not
   * pay for any of this.
   */
  warm(scene: THREE.Scene, camera: THREE.Camera, offscreen: boolean): void {
    const r = this.renderer;
    const litBefore = new Set<THREE.Object3D>();
    scene.traverseVisible((o) => {
      if ((o as THREE.Light).isLight) litBefore.add(o);
    });
    const forced: THREE.Object3D[] = [];
    const unculled: THREE.Object3D[] = [];
    const muted: THREE.Object3D[] = [];
    const counts: [THREE.InstancedMesh, number][] = [];
    const instCounts: [THREE.InstancedBufferGeometry, number][] = [];
    const ranges: [THREE.BufferGeometry, number, number][] = [];
    const seenGeo = new Set<THREE.BufferGeometry>();
    scene.traverse((o) => {
      if ((o as THREE.Light).isLight || o.userData.noWarmup) return;
      if (!o.visible) {
        o.visible = true;
        forced.push(o);
      }
      if (o.frustumCulled) {
        o.frustumCulled = false;
        unculled.push(o);
      }
      const im = o as THREE.InstancedMesh;
      if (im.isInstancedMesh && im.instanceMatrix.count > 0 && im.count !== 1) {
        counts.push([im, im.count]);
        im.count = 1;
      }
      const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (!g || !g.isBufferGeometry || seenGeo.has(g)) return;
      seenGeo.add(g);
      const ig = g as THREE.InstancedBufferGeometry;
      if (ig.isInstancedBufferGeometry && ig.instanceCount !== 1) {
        instCounts.push([ig, ig.instanceCount]);
        ig.instanceCount = 1;
      }
      // multi-material groups need their own ranges; everything else draws one primitive
      if (g.groups.length === 0) {
        ranges.push([g, g.drawRange.start, g.drawRange.count]);
        g.drawRange.start = 0;
        g.drawRange.count = 3;
      }
    });
    // lights that only became reachable because a hidden parent was forced visible stay off
    scene.traverseVisible((o) => {
      if ((o as THREE.Light).isLight && !litBefore.has(o)) {
        o.visible = false;
        muted.push(o);
      }
    });
    const prev = r.getRenderTarget();
    const autoClear = r.autoClear;
    try {
      r.autoClear = true;
      if (offscreen) {
        // same program keys as the real pass: PostFX renders the scene into an offscreen target
        r.setRenderTarget(this.target());
      } else {
        // direct-to-canvas rendering keys programs with sRGB output: warm those, 1 px scissored
        r.setRenderTarget(null);
        r.setScissorTest(true);
        r.setScissor(0, 0, 1, 1);
      }
      r.render(scene, camera);
    } finally {
      if (!offscreen) r.setScissorTest(false);
      r.setRenderTarget(prev);
      r.autoClear = autoClear;
      for (const o of forced) o.visible = false;
      for (const o of unculled) o.frustumCulled = true;
      for (const o of muted) o.visible = true;
      for (const [m, n] of counts) m.count = n;
      for (const [g, n] of instCounts) g.instanceCount = n;
      for (const [g, s, n] of ranges) {
        g.drawRange.start = s;
        g.drawRange.count = n;
      }
    }
  }

  /**
   * Wait (without blocking the main thread) until the GPU has executed everything submitted so far.
   * GL calls are asynchronous: the warm draw returns immediately and its real cost (driver-side
   * pipeline creation, shader JIT on software rasterisers, buffer uploads) would otherwise land on
   * the first visible frame.
   */
  async idle(maxMs = 120000): Promise<void> {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync !== 'function') return;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) return;
    gl.flush();
    const t0 = performance.now();
    try {
      // the status only updates between tasks: poll once per painted frame
      while (gl.getSyncParameter(sync, gl.SYNC_STATUS) !== gl.SIGNALED) {
        if (gl.isContextLost() || performance.now() - t0 > maxMs) break;
        await pollDelay();
      }
    } finally {
      gl.deleteSync(sync);
    }
  }

  dispose(): void {
    this.probe?.depthTexture?.dispose();
    this.probe?.dispose();
    this.probe = null;
    this.probeSamples = -1;
  }

  /**
   * 4x4 stand-in for the PostFX scene target with the same colour format, MSAA sample count and
   * float depth texture, so the warm draw also builds the driver-side pipelines the real pass uses
   * (ANGLE-Vulkan / Metal / SwiftShader key pipelines on attachment formats and sample count).
   */
  private target(): THREE.WebGLRenderTarget {
    const samples = Math.min(this.samples, this.renderer.capabilities.maxSamples);
    if (this.probe && this.probeSamples === samples) return this.probe;
    this.dispose();
    const ext = this.renderer.extensions;
    const half = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
    const depth = new THREE.DepthTexture(4, 4, THREE.FloatType);
    depth.minFilter = depth.magFilter = THREE.NearestFilter;
    this.probe = new THREE.WebGLRenderTarget(4, 4, {
      type: half ? THREE.HalfFloatType : THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      depthTexture: depth,
      stencilBuffer: false,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      samples,
    });
    this.probeSamples = samples;
    return this.probe;
  }
}

const SKIP_KEYS = new Set(['envMapRotation', 'userData', 'defines']);

/** Every uploadable texture referenced by materials (maps + ShaderMaterial uniforms) and the scene. */
export function collectTextures(scene: THREE.Scene): THREE.Texture[] {
  const out = new Set<THREE.Texture>();
  const add = (v: unknown) => {
    const t = v as THREE.Texture | null;
    if (!t || t.isTexture !== true || out.has(t)) return;
    if (uploadable(t)) out.add(t);
  };
  const seen = new Set<THREE.Material>();
  const visit = (m: THREE.Material) => {
    if (seen.has(m)) return;
    seen.add(m);
    const rec = m as unknown as Record<string, unknown>;
    for (const k in rec) {
      if (SKIP_KEYS.has(k)) continue;
      const v = rec[k];
      if (v && typeof v === 'object' && (v as THREE.Texture).isTexture) add(v);
    }
    const uniforms = (m as THREE.ShaderMaterial).uniforms;
    if (uniforms) {
      for (const k in uniforms) {
        const v = uniforms[k]?.value;
        if (Array.isArray(v)) for (const x of v) add(x);
        else add(v);
      }
    }
  };
  scene.traverse((o) => {
    const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!mat) return;
    if (Array.isArray(mat)) for (const m of mat) visit(m);
    else visit(mat);
  });
  add(scene.background);
  add(scene.environment);
  return [...out];
}

function uploadable(t: THREE.Texture): boolean {
  const any = t as THREE.Texture & {
    isRenderTargetTexture?: boolean;
    isVideoTexture?: boolean;
    isFramebufferTexture?: boolean;
    isDepthTexture?: boolean;
  };
  if (any.isRenderTargetTexture || any.isVideoTexture || any.isFramebufferTexture || any.isDepthTexture) return false;
  if (t.version === 0) return false; // no data yet: three would skip (or warn about) it anyway
  const img = t.image as { complete?: boolean; width?: number } | null | undefined;
  if (img == null) return false;
  if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement && !img.complete) return false;
  return true;
}
