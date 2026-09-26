import * as THREE from 'three';
import type { App } from '../core/App';
import { FxShared } from '../fx/core/FxShared';
import { GLARE_MAX } from './PostFX';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** distance (m) at which a pyro light's contribution to the lens glare has fallen to one half */
const GLARE_DIST = 350;
/** scene light energy (Σ intensity x view x distance x zoom) that gives 63 % of the full glare */
const GLARE_E0 = 7;
/** the site-wide `atmos.glow` (lit smoke) counts as a light of this intensity per unit of glow */
const GLOW_WEIGHT = 3;
/** view-space depth (m) at which a light segment is clipped (a flame row passing the camera) */
const NEAR = 1.5;
/** attack / release time constants (s) of the global glare amount (camera iris / eye response) */
const TAU_UP = 0.08;
const TAU_DOWN = 0.35;
/** photosensitivity option: glare capped, halos dimmer, amount slow (no full-frame flicker) */
const CALM_CAP = 0.5;
const CALM_HALO = 0.6;
const CALM_TAU = 0.6;

/**
 * Pyro veiling glare driver. The official drone and terrace footage owes much of its look to the
 * frame blooming in the pyro colour: a camera looking into a 200 m flame wall scatters that light
 * far around it (lens veiling glare, lit smoke). Each frame this reads the spatial pyro light field
 * (the ≤ 12 strongest pyro / firework line lights the fx engine packs for its shaders) and the
 * site-wide `atmos.glow`, and writes into `PostFX.glare`:
 *  - every light as a screen-space line source (projected, near-clipped segment + halo radius from
 *    its reach and distance) whose colour is scaled so the sum saturates (a 60-fountain wall is not
 *    30x brighter than two): the composite draws a soft r^-3 halo around each flame row;
 *  - a global amount (how much fire the camera sees: in or near the frame, distance, zoom) that
 *    widens the bloom, feeds the lens' wide scatter tail and a faint frame-wide lift in the fire
 *    colour.
 * The halos are a pure function of show time + camera; only the global amount has a short
 * iris-like smoothing (snapped on seek). Allocation-free.
 */
export class SceneGlare {
  /**
   * tuning: `psf` = angular radius of the lens' glare kernel (screen heights; fixed in image space),
   * `src` = visible size of a light around its line (share of its reach: the flames and the smoke they
   * light), `dist` (m) / `e0` / `glow` as the constants above
   */
  readonly tune = { psf: 0.05, src: 0.35, dist: GLARE_DIST, e0: GLARE_E0, glow: GLOW_WEIGHT };
  /** unsmoothed glare amount of this frame (debug) */
  target = 0;
  /** light energy seen this frame (debug) */
  energy = 0;
  private fx: FxShared | null = null;
  private primed = false;
  private readonly hue = new THREE.Color(1, 0.45, 0.15);

  update(app: App, dt: number, snap: boolean): void {
    const out = app.postfx.glare;
    if (!this.fx) {
      try {
        this.fx = FxShared.get(app);
      } catch {
        return;
      }
    }
    const cam = app.camera;
    const tn = this.tune;
    const lu = this.fx.lights.uniforms;
    const n = Math.min(GLARE_MAX, lu.uFxLN.value | 0);
    const m = cam.matrixWorldInverse.elements;
    const p = cam.projectionMatrix.elements;
    const aspect = Math.max(0.2, cam.aspect);
    const hx = aspect * 0.5;
    // a narrow lens magnifies the fire: it covers more of the frame
    const zoom = clamp(Math.sqrt(50 / Math.max(5, cam.fov / Math.max(0.01, cam.zoom))), 0.75, 1.5);

    let eVis = 0;
    let cr = 0;
    let cg = 0;
    let cb = 0;
    let k = 0;
    for (let j = 0; j < n; j++) {
      const A = lu.uFxLA.value[j];
      const B = lu.uFxLB.value[j];
      const C = lu.uFxLC.value[j];
      const I = Math.max(C.x, C.y, C.z);
      if (!(I > 1e-3)) continue;
      // view space end points
      let ax = m[0] * A.x + m[4] * A.y + m[8] * A.z + m[12];
      let ay = m[1] * A.x + m[5] * A.y + m[9] * A.z + m[13];
      let ad = -(m[2] * A.x + m[6] * A.y + m[10] * A.z + m[14]);
      let bx = m[0] * B.x + m[4] * B.y + m[8] * B.z + m[12];
      let by = m[1] * B.x + m[5] * B.y + m[9] * B.z + m[13];
      let bd = -(m[2] * B.x + m[6] * B.y + m[10] * B.z + m[14]);
      if (ad < NEAR && bd < NEAR) continue; // behind the camera
      if (ad < NEAR) {
        const t = (NEAR - ad) / (bd - ad);
        ax += (bx - ax) * t;
        ay += (by - ay) * t;
        ad = NEAR;
      } else if (bd < NEAR) {
        const t = (NEAR - bd) / (ad - bd);
        bx += (ax - bx) * t;
        by += (ay - by) * t;
        bd = NEAR;
      }
      // NDC
      const nax = (p[0] * ax) / ad;
      const nay = (p[5] * ay) / ad;
      const nbx = (p[0] * bx) / bd;
      const nby = (p[5] * by) / bd;
      // halo radius (screen heights): the lens kernel (fixed in image space) widened by the size of the
      // fire itself (flames + the smoke they light, projected)
      const size = tn.src * Math.max(1, A.w) * p[5] * 0.5;
      const sa = size / ad;
      const sb = size / bd;
      const ra = clamp(Math.sqrt(tn.psf * tn.psf + sa * sa), 0.01, 0.45);
      const rb = clamp(Math.sqrt(tn.psf * tn.psf + sb * sb), 0.01, 0.45);
      // how much of the source is in (or just outside) the frame: its halo still reaches in
      let vis = 0;
      for (let s = 0; s < 3; s++) {
        const t = s * 0.5;
        const nx = nax + (nbx - nax) * t;
        const ny = nay + (nby - nay) * t;
        const margin = 0.25 + 2 * (ra + (rb - ra) * t);
        const ox = Math.max(0, Math.abs(nx) - 1);
        const oy = Math.max(0, Math.abs(ny) - 1);
        vis += Math.exp(-(ox * ox + oy * oy) / (margin * margin)) / 3;
      }
      const mx = (ax + bx) * 0.5;
      const my = (ay + by) * 0.5;
      const md = (ad + bd) * 0.5;
      const dist = Math.sqrt(mx * mx + my * my + md * md);
      const df = (1 / (1 + (dist / tn.dist) * (dist / tn.dist))) * zoom;
      eVis += I * df * vis;
      cr += C.x * df * vis;
      cg += C.y * df * vis;
      cb += C.z * df * vis;
      if (vis < 0.002) continue;
      out.seg[k].set(nax * hx, nay * 0.5, nbx * hx, nby * 0.5);
      out.col[k].set(C.x * df, C.y * df, C.z * df, ra);
      out.rb[k] = rb;
      k++;
    }
    const g = app.env.glowColor;
    const glowA = Math.max(0, g.r, g.g, g.b);
    const eG = glowA * tn.glow;
    const e = eVis + eG;
    this.energy = e;
    const x = e / tn.e0;
    let target = 1 - Math.exp(-x);
    const calm = app.reduceFlashing;
    if (calm) target = Math.min(target, CALM_CAP);
    this.target = target;

    // halos: the lights' share of the saturated glare (G / E, stable for small E)
    const perE = (x > 1e-4 ? (1 - Math.exp(-x)) / x : 1 - x * 0.5) / tn.e0;
    const hk = perE * (calm ? CALM_HALO : 1);
    for (let i = 0; i < k; i++) {
      const c = out.col[i];
      c.x *= hk;
      c.y *= hk;
      c.z *= hk;
    }
    out.count = k;

    // global amount: iris-like smoothing (snapped on seek)
    if (snap || !this.primed) {
      this.primed = true;
      out.amount = target;
    } else {
      const up = target > out.amount;
      const tau = calm ? CALM_TAU : up ? TAU_UP : TAU_DOWN;
      out.amount += (target - out.amount) * (1 - Math.exp(-Math.max(0, dt) / tau));
    }
    // colour of the frame-wide lift: the fire seen + the glowing smoke
    const tr = cr + g.r * tn.glow;
    const tg = cg + g.g * tn.glow;
    const tb = cb + g.b * tn.glow;
    const tm = Math.max(tr, tg, tb);
    if (tm > 1e-3) this.hue.setRGB(tr / tm, tg / tm, tb / tm);
    out.r = this.hue.r;
    out.g = this.hue.g;
    out.b = this.hue.b;
  }
}
