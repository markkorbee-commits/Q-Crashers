import * as THREE from 'three';
import type { FlashSpec } from './Emitter';

/**
 * Pyro light field: the light that burning pyrotechnics throw onto the smoke, the haze and the
 * field around them (the orange / pink / gold "whole site lit" frames of the official video).
 *
 * The LightEnv bus only carries ONE weighted flash centroid (fine for the set and the crowd, useless
 * for a 200 m fire U: the field in front of the left arm must glow while the right arm is dark). So
 * every cue-driven effect system also emits `LightSpec`s: line-segment light sources (a row of
 * flames / fountains between A and B) with an analytic time envelope. Per frame the systems add
 * the alive ones here; the frame hook keeps the strongest N (per quality level), folds the rest into
 * their nearest kept neighbour (energy conserving) and uploads them as uniforms that every fx shader
 * sees (GLSL `fxLight()` in glsl.ts): lit smoke, lit haze and the additive field-light layer.
 * Everything is a pure function of show time (seek-safe, deterministic) and allocation-free.
 */
export interface LightSpec extends FlashSpec {
  /** segment end points (world, metres) at the height of the light's centre */
  a: THREE.Vector3;
  b: THREE.Vector3;
  /** reach (m): distance at which the light on smoke has fallen to one half */
  radius: number;
}

/** compile-time maximum of lights in the shaders (keep in sync with FX_MAX_LIGHTS in glsl.ts) */
export const FX_MAX_LIGHTS = 12;
const CAP = 256;

export class FxLights {
  readonly uniforms: {
    uFxLA: { value: THREE.Vector4[] };
    uFxLB: { value: THREE.Vector4[] };
    uFxLC: { value: THREE.Vector4[] };
    uFxLN: { value: number };
    uFxGlow: { value: THREE.Color };
  };
  /** global smoke-volume glow (fog.level `glow`): colour * amount, set by the FogSystem each frame */
  readonly glow = new THREE.Color(0, 0, 0);
  private n = 0;
  private readonly ax = new Float32Array(CAP);
  private readonly ay = new Float32Array(CAP);
  private readonly az = new Float32Array(CAP);
  private readonly bx = new Float32Array(CAP);
  private readonly by = new Float32Array(CAP);
  private readonly bz = new Float32Array(CAP);
  private readonly rad = new Float32Array(CAP);
  private readonly cr = new Float32Array(CAP);
  private readonly cg = new Float32Array(CAP);
  private readonly cb = new Float32Array(CAP);
  private readonly w = new Float32Array(CAP);
  private readonly pick = new Int32Array(FX_MAX_LIGHTS);
  private readonly used = new Uint8Array(CAP);
  /** total light intensity this frame (stats) */
  total = 0;
  active = 0;

  constructor() {
    const v4 = () => Array.from({ length: FX_MAX_LIGHTS }, () => new THREE.Vector4());
    this.uniforms = {
      uFxLA: { value: v4() },
      uFxLB: { value: v4() },
      uFxLC: { value: v4() },
      uFxLN: { value: 0 },
      uFxGlow: { value: new THREE.Color(0, 0, 0) },
    };
  }

  /** add an alive light with its current intensity (already enveloped) */
  add(s: LightSpec, I: number): void {
    if (!(I > 0.002)) return;
    let k = this.n;
    if (k >= CAP) {
      // full: replace the weakest if this one is stronger
      let m = 0;
      for (let i = 1; i < CAP; i++) if (this.w[i] < this.w[m]) m = i;
      if (this.w[m] >= I) return;
      k = m;
    } else this.n++;
    this.ax[k] = s.a.x;
    this.ay[k] = s.a.y;
    this.az[k] = s.a.z;
    this.bx[k] = s.b.x;
    this.by[k] = s.b.y;
    this.bz[k] = s.b.z;
    this.rad[k] = s.radius;
    this.cr[k] = s.color.r * I;
    this.cg[k] = s.color.g * I;
    this.cb[k] = s.color.b * I;
    this.w[k] = I;
  }

  /**
   * Keep the `max` strongest lights, fold the others into the nearest kept one (their energy stays
   * in the picture, only the position is approximated), upload, and start a new frame.
   */
  pack(max: number): void {
    const n = this.n;
    const N = Math.min(max, FX_MAX_LIGHTS, n);
    const u = this.uniforms;
    let total = 0;
    for (let i = 0; i < n; i++) {
      this.used[i] = 0;
      total += this.w[i];
    }
    for (let j = 0; j < N; j++) {
      let best = -1;
      for (let i = 0; i < n; i++) if (!this.used[i] && (best < 0 || this.w[i] > this.w[best])) best = i;
      this.used[best] = 1;
      this.pick[j] = best;
    }
    // fold the rest into the nearest kept light (distance between segment mid points)
    for (let i = 0; i < n; i++) {
      if (this.used[i]) continue;
      const mx = (this.ax[i] + this.bx[i]) * 0.5,
        my = (this.ay[i] + this.by[i]) * 0.5,
        mz = (this.az[i] + this.bz[i]) * 0.5;
      let bj = 0,
        bd = Infinity;
      for (let j = 0; j < N; j++) {
        const p = this.pick[j];
        const dx = (this.ax[p] + this.bx[p]) * 0.5 - mx,
          dy = (this.ay[p] + this.by[p]) * 0.5 - my,
          dz = (this.az[p] + this.bz[p]) * 0.5 - mz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bd) {
          bd = d;
          bj = j;
        }
      }
      if (N > 0) {
        const p = this.pick[bj];
        // a far-away light only partly helps the kept one (it would light the wrong place)
        const k = 0.8 / (1 + bd / (4 * this.rad[p] * this.rad[p] + 1));
        this.cr[p] += this.cr[i] * k;
        this.cg[p] += this.cg[i] * k;
        this.cb[p] += this.cb[i] * k;
      }
    }
    for (let j = 0; j < FX_MAX_LIGHTS; j++) {
      if (j < N) {
        const p = this.pick[j];
        u.uFxLA.value[j].set(this.ax[p], this.ay[p], this.az[p], this.rad[p]);
        u.uFxLB.value[j].set(this.bx[p], this.by[p], this.bz[p], 0);
        u.uFxLC.value[j].set(this.cr[p], this.cg[p], this.cb[p], 0);
      } else u.uFxLC.value[j].set(0, 0, 0, 0);
    }
    u.uFxLN.value = N;
    u.uFxGlow.value.copy(this.glow);
    this.total = total;
    this.active = n;
    this.n = 0;
  }
}
