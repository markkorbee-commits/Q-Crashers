import type { QualityLevel, QualitySettings } from './types';

/**
 * The single source of the per-preset budgets. Other modules read these values (crowd: crowdCount;
 * lasers: laserBudget — design-bible §7.4 640 / 400 / 200 / 96; lights: beamBudget) and must not keep
 * their own per-level tables.
 */
export const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  ultra: {
    level: 'ultra',
    maxPixelRatio: 2,
    renderScale: 1,
    msaa: 4,
    shadows: false,
    shadowMapSize: 2048,
    crowdCount: 65000,
    flagCount: 420,
    particleScale: 1,
    beamBudget: 420,
    laserBudget: 640,
    volumetrics: true,
    bloom: true,
    bloomLevels: 6,
    postfx: true,
    drawDistance: 2200,
    treeCount: 2600,
    textureSize: 2048,
    anisotropy: 8,
  },
  high: {
    level: 'high',
    maxPixelRatio: 1.5,
    renderScale: 1,
    msaa: 4,
    shadows: false,
    shadowMapSize: 1024,
    crowdCount: 45000,
    flagCount: 300,
    particleScale: 0.75,
    beamBudget: 300,
    laserBudget: 400,
    volumetrics: true,
    bloom: true,
    bloomLevels: 5,
    postfx: true,
    drawDistance: 1800,
    treeCount: 1800,
    textureSize: 1024,
    anisotropy: 4,
  },
  medium: {
    level: 'medium',
    maxPixelRatio: 1.25,
    renderScale: 0.85,
    msaa: 0,
    shadows: false,
    shadowMapSize: 512,
    crowdCount: 26000,
    flagCount: 160,
    particleScale: 0.5,
    beamBudget: 180,
    laserBudget: 200,
    volumetrics: false,
    bloom: true,
    bloomLevels: 4,
    postfx: true,
    drawDistance: 1400,
    treeCount: 900,
    textureSize: 1024,
    anisotropy: 2,
  },
  mobile: {
    level: 'mobile',
    maxPixelRatio: 1.5,
    renderScale: 0.7,
    msaa: 0,
    shadows: false,
    shadowMapSize: 512,
    crowdCount: 11000,
    flagCount: 70,
    particleScale: 0.3,
    beamBudget: 96,
    laserBudget: 96,
    volumetrics: false,
    bloom: true,
    bloomLevels: 3,
    postfx: true,
    drawDistance: 1100,
    treeCount: 400,
    textureSize: 512,
    anisotropy: 1,
  },
};

export const QUALITY_ORDER: QualityLevel[] = ['mobile', 'medium', 'high', 'ultra'];

export interface DeviceProfile {
  mobile: boolean;
  touch: boolean;
  gpu: string;
  memoryGB: number | null;
  cores: number;
  screen: { w: number; h: number; dpr: number };
}

export function detectDevice(gl?: WebGL2RenderingContext | null): DeviceProfile {
  const ua = navigator.userAgent;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const mobile =
    /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua) ||
    (touch && /Macintosh/.test(ua) && navigator.maxTouchPoints > 1); // iPadOS
  let gpu = 'unknown';
  if (gl) {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  }
  const mem = (navigator as any).deviceMemory ?? null;
  return {
    mobile,
    touch,
    gpu,
    memoryGB: mem,
    cores: navigator.hardwareConcurrency || 4,
    screen: { w: screen.width, h: screen.height, dpr: window.devicePixelRatio || 1 },
  };
}

/** Initial preset guess. The runtime governor refines it using measured frame times. */
export function pickQuality(d: DeviceProfile): QualityLevel {
  const g = d.gpu.toLowerCase();
  if (d.mobile) return 'mobile';
  if (/swiftshader|llvmpipe|software|basic render/.test(g)) return 'mobile';
  if (/rtx|radeon rx [5-9]|rx 6|rx 7|rx 9|apple m[1-9] (pro|max|ultra)|arc a7/.test(g)) return 'ultra';
  if (/apple m[1-9]|geforce|radeon|arc/.test(g)) return 'high';
  if (/intel|uhd|iris|mali|adreno|powervr/.test(g)) return 'medium';
  return 'high';
}

/** Next lower / higher preset (null at the ends). */
export function neighbourLevel(level: QualityLevel, dir: -1 | 1): QualityLevel | null {
  const i = QUALITY_ORDER.indexOf(level) + dir;
  return i >= 0 && i < QUALITY_ORDER.length ? QUALITY_ORDER[i] : null;
}

/**
 * Dynamic-resolution steps (multipliers on the preset's renderScale). Few and coarse on purpose:
 * every step resizes the canvas and the post-processing targets.
 */
export const DYN_SCALES: readonly number[] = [1, 0.9, 0.8, 0.7, 0.6];
/** frames per measurement window */
const WINDOW = 45;
/** stable windows before probing a higher resolution; doubles after each failed probe */
const MIN_PROBE_WINDOWS = 8;
const MAX_PROBE_WINDOWS = 128;

/**
 * Runtime performance governor. At runtime it only ever changes the render resolution, which is
 * cheap and hitch-free: it never touches presets itself. When even the lowest resolution step misses
 * the budget for several seconds (or there is lasting headroom at full resolution) it returns a
 * preset *suggestion* ('down' / 'up'); the App applies it only at a safe moment (show paused / not
 * started), never in the middle of the show.
 *
 * Headroom detection: on a v-synced display the frame time never drops below the refresh interval,
 * so "much faster than budget" is only visible on high-refresh / unsynced displays. Otherwise the
 * governor probes one step up after a stable period and falls back at once if the probe misses,
 * doubling the wait after every failed probe.
 */
export class PerfGovernor {
  /** current dynamic resolution multiplier applied on top of preset.renderScale */
  scale = 1;
  fps = 60;
  frameMs = 16.7;
  /**
   * Automatic preset mode (the Graphics menu's "Auto"): preset suggestions ('down' / 'up') are only
   * made while it is on. A preset the user picked (enabled = false) keeps the resolution adaptation.
   */
  enabled = true;
  /** dynamic resolution on/off (off only for QA captures: ?nogovernor) */
  adaptResolution = true;
  /** index into DYN_SCALES */
  private step = 0;
  private readonly samples = new Float32Array(WINDOW);
  private n = 0;
  /** measurement windows still to ignore (warm-up after load, seek, quality or resolution change) */
  private cooldown = 2;
  private window = 0;
  private slowStreak = 0;
  private fastStreak = 0;
  private okStreak = 0;
  private heavyStreak = 0;
  private lightStreak = 0;
  private lastUpWindow = -100;
  private probeWindows = MIN_PROBE_WINDOWS;
  /** consecutive frames slower than the hitch limit (a device below ~4 fps is overloaded, not hitching) */
  private hitchRun = 0;

  constructor(private targetFps: number) {}

  setTarget(fps: number) {
    this.targetFps = fps;
  }

  /** current resolution step (0 = full resolution) */
  get level(): number {
    return this.step;
  }

  /**
   * Forget the current measurement (after a seek, a quality change or a long hitch).
   * `forget` also returns to full resolution and clears the probe back-off (new preset).
   */
  reset(opts: { cooldown?: number; forget?: boolean } = {}): void {
    this.n = 0;
    this.slowStreak = this.fastStreak = this.okStreak = this.heavyStreak = this.lightStreak = 0;
    this.cooldown = Math.max(this.cooldown, opts.cooldown ?? 1);
    if (opts.forget) {
      this.probeWindows = MIN_PROBE_WINDOWS;
      this.setStep(0);
    }
  }

  /**
   * Feed one frame's real duration. Returns a preset suggestion ('down' / 'up') or null. Resolution
   * changes are applied to `scale` directly (the caller watches it).
   */
  sample(dtSec: number): 'down' | 'up' | null {
    if (!(dtSec > 0)) return null;
    if (dtSec > 0.25) {
      // a single long frame is a hitch (tab switch, GC, seek rebuild): not steady-state cost. A run of
      // them is a device that cannot keep up at all: count those frames (capped) so it still adapts.
      if (++this.hitchRun < 3) return null;
      dtSec = Math.min(dtSec, 1);
    } else this.hitchRun = 0;
    this.samples[this.n++] = dtSec * 1000;
    if (this.n < WINDOW) return null;
    this.n = 0;
    this.samples.sort(); // typed array: numeric, in place, no allocation
    const median = this.samples[WINDOW >> 1];
    this.frameMs = median;
    this.fps = 1000 / median;
    this.window++;
    if (!this.adaptResolution) return null;
    if (this.cooldown > 0) {
      this.cooldown--;
      return null;
    }
    const budget = 1000 / this.targetFps;
    const probing = this.window - this.lastUpWindow <= 2;

    if (median > budget * 1.2) {
      this.fastStreak = this.okStreak = this.lightStreak = 0;
      this.slowStreak++;
      // react at once to a failed probe or a severe overload, otherwise confirm over two windows
      if (this.slowStreak < 2 && !probing && median < budget * 1.6) return null;
      this.slowStreak = 0;
      // the higher resolution we just tried is too expensive: back off before the next attempt
      if (probing) {
        this.probeWindows = Math.min(this.probeWindows * 2, MAX_PROBE_WINDOWS);
        this.lastUpWindow = -100; // probe over (failed)
      }
      if (this.step + 1 < DYN_SCALES.length) {
        this.setStep(this.step + 1);
        this.cooldown = 1;
        return null;
      }
      // lowest resolution and still over budget: suggest a lighter preset (applied later, safely)
      if (this.enabled && ++this.heavyStreak >= 3) {
        this.heavyStreak = 0;
        this.cooldown = 2;
        return 'down';
      }
      return null;
    }

    this.slowStreak = this.heavyStreak = 0;
    // a probe that survived its trial windows: the device copes, probe sooner next time
    if (this.window - this.lastUpWindow === 3) this.probeWindows = Math.max(MIN_PROBE_WINDOWS, this.probeWindows >> 1);
    if (median < budget * 0.75) {
      // real headroom (high-refresh or unsynced display)
      this.okStreak = 0;
      this.fastStreak++;
      if (this.step > 0 && this.fastStreak >= 3) {
        this.fastStreak = 0;
        this.up();
      } else if (this.step === 0 && this.enabled && ++this.lightStreak >= 20) {
        this.lightStreak = 0;
        return 'up';
      }
      return null;
    }

    // within budget: after a stable period, probe one resolution step up
    this.fastStreak = this.lightStreak = 0;
    this.okStreak++;
    if (this.step > 0 && this.okStreak >= this.probeWindows) {
      this.okStreak = 0;
      this.up();
    }
    return null;
  }

  private up(): void {
    this.setStep(this.step - 1);
    this.lastUpWindow = this.window;
    this.cooldown = 0;
  }

  private setStep(i: number): void {
    this.step = Math.max(0, Math.min(DYN_SCALES.length - 1, i));
    this.scale = DYN_SCALES[this.step];
  }
}
