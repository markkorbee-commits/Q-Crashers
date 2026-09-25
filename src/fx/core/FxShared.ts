import * as THREE from 'three';
import type { App } from '../../core/App';
import type { FrameContext, QualitySettings } from '../../core/types';
import { Rng } from '../../core/rng';
import { FxLayer, quadGeometry, ribbonGeometry } from './FxLayer';
import { PUFF_FRAG, PUFF_VERT } from './puffShader';
import { SPARK_FRAG, SPARK_VERT } from './sparkShader';

/**
 * Per-app shared state of the special-effects engine: uniforms common to all particle layers (show
 * time, wind, camera pixel scale, fog, the LightEnv lighting bus) and the procedural noise texture.
 * The uniforms are synced in an App frame hook, i.e. after every system (incl. the camera) updated,
 * right before rendering — so particles always use this frame's camera and accumulated flashes.
 */
export class FxShared {
  private static byApp = new WeakMap<App, FxShared>();

  static get(app: App): FxShared {
    let s = FxShared.byApp.get(app);
    if (!s) {
      s = new FxShared(app);
      FxShared.byApp.set(app, s);
    }
    return s;
  }

  /** deterministic, constant gentle breeze (m/s): hot still night, smoke drifts slowly to +X / -Z */
  readonly wind = new THREE.Vector3(0.9, 0.05, -0.45);
  readonly noise: THREE.DataTexture;
  readonly uniforms: Record<string, THREE.IUniform>;
  private readonly size = new THREE.Vector2();
  private readonly tmpColor = new THREE.Color();

  private constructor(private app: App) {
    this.noise = makeNoiseTexture(app.quality.level === 'mobile' ? 128 : 256);
    this.uniforms = {
      uTime: { value: 0 },
      uWind: { value: this.wind },
      uHalfRes: { value: new THREE.Vector2(640, 360) },
      uProjScale: { value: 500 },
      uMinPx: { value: 1.25 },
      uFogDensity: { value: 0 },
      uAmbient: { value: new THREE.Color(0.004, 0.007, 0.014) },
      uStageLight: { value: new THREE.Color() },
      uStageWash: { value: new THREE.Color() },
      uFlashCol: { value: app.env.flashColor },
      uFlashPos: { value: app.env.flashPos },
      uNoise: { value: this.noise },
    };
    app.onFrame((ctx) => this.sync(ctx));
  }

  private sync(ctx: FrameContext): void {
    const u = this.uniforms;
    const app = this.app;
    const env = app.env;
    u.uTime.value = ctx.showTime;
    app.renderer.getDrawingBufferSize(this.size);
    (u.uHalfRes.value as THREE.Vector2).set(this.size.x * 0.5, this.size.y * 0.5);
    const cam = ctx.camera;
    u.uProjScale.value = cam.projectionMatrix.elements[5] * this.size.y * 0.5;
    u.uMinPx.value = Math.max(1.3, this.size.y / 540 * 1.5);
    (u.uStageLight.value as THREE.Color).copy(env.stageColor).multiplyScalar(env.stageIntensity);
    (u.uStageWash.value as THREE.Color).copy(env.stageWashColor).multiplyScalar(env.stageWashIntensity * 0.6);
    const fog = app.scene.fog;
    const amb = u.uAmbient.value as THREE.Color;
    if (fog && (fog as THREE.FogExp2).isFogExp2) {
      u.uFogDensity.value = (fog as THREE.FogExp2).density * 0.8;
      amb.copy(fog.color).multiplyScalar(0.45);
    } else if (fog && (fog as THREE.Fog).isFog) {
      const f = fog as THREE.Fog;
      u.uFogDensity.value = 1.2 / Math.max(50, f.far);
      amb.copy(fog.color).multiplyScalar(0.45);
    } else {
      u.uFogDensity.value = 0;
      const bg = app.scene.background;
      if (bg && (bg as THREE.Color).isColor) amb.copy(bg as THREE.Color).multiplyScalar(0.4);
      else amb.setRGB(0.004, 0.007, 0.014);
    }
    // the palette tints the ambient scatter a touch (haze glows in the section colour)
    amb.lerp(this.tmpColor.copy(env.palettePrimary).multiplyScalar(0.012), 0.25);
  }

  /** spark ribbon layer (additive HDR) */
  sparkLayer(name: string, q: QualitySettings, maxParticles: number, maxEmitters: number, renderOrder: number, maxSegments = 6): FxLayer {
    const seg = Math.min(maxSegments, q.level === 'mobile' ? 3 : q.level === 'medium' ? 4 : 6);
    const mat = new THREE.ShaderMaterial({
      name: `fx-${name}`,
      uniforms: { ...this.uniforms, uSegments: { value: seg } },
      vertexShader: SPARK_VERT,
      fragmentShader: SPARK_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    return new FxLayer({ name, slotSize: 32, maxEmitters, maxParticles, geometry: ribbonGeometry(seg), material: mat, renderOrder });
  }

  /** billboard puff layer (premultiplied: emissive fire + occluding smoke) */
  puffLayer(name: string, maxParticles: number, maxEmitters: number, renderOrder: number): FxLayer {
    const mat = new THREE.ShaderMaterial({
      name: `fx-${name}`,
      uniforms: { ...this.uniforms },
      vertexShader: PUFF_VERT,
      fragmentShader: PUFF_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    return new FxLayer({ name, slotSize: 8, maxEmitters, maxParticles, geometry: quadGeometry(), material: mat, renderOrder });
  }
}

/** Tileable fbm value noise (R, G, B = three independent octaves stacks), generated at load. */
export function makeNoiseTexture(size: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const rng = new Rng(0x5eed1);
  const lattice = (period: number) => {
    const g = new Float32Array(period * period);
    for (let i = 0; i < g.length; i++) g[i] = rng.next();
    return g;
  };
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < 3; ch++) {
    const out = new Float32Array(size * size);
    let amp = 0.5;
    let total = 0;
    for (let o = 0; o < 5; o++) {
      const period = 4 << o;
      const g = lattice(period);
      const scale = period / size;
      for (let y = 0; y < size; y++) {
        const fy = y * scale;
        const y0 = Math.floor(fy);
        const ty = fy - y0;
        const sy = ty * ty * (3 - 2 * ty);
        const ya = (y0 % period) * period;
        const yb = ((y0 + 1) % period) * period;
        for (let x = 0; x < size; x++) {
          const fx = x * scale;
          const x0 = Math.floor(fx);
          const tx = fx - x0;
          const sx = tx * tx * (3 - 2 * tx);
          const xa = x0 % period;
          const xb = (x0 + 1) % period;
          const a = g[ya + xa] + (g[ya + xb] - g[ya + xa]) * sx;
          const b = g[yb + xa] + (g[yb + xb] - g[yb + xa]) * sx;
          out[y * size + x] += (a + (b - a) * sy) * amp;
        }
      }
      total += amp;
      amp *= ch === 2 ? 0.6 : 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= total;
    channels.push(out);
  }
  for (let ch = 0; ch < 3; ch++) {
    // stretch contrast to use the full range
    const c = channels[ch];
    let lo = 1,
      hi = 0;
    for (let i = 0; i < c.length; i++) {
      lo = Math.min(lo, c[i]);
      hi = Math.max(hi, c[i]);
    }
    const k = 1 / Math.max(1e-3, hi - lo);
    for (let i = 0; i < c.length; i++) data[i * 4 + ch] = Math.round(Math.min(1, Math.max(0, (c[i] - lo) * k)) * 255);
  }
  for (let i = 0; i < size * size; i++) data[i * 4 + 3] = 255;
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}
