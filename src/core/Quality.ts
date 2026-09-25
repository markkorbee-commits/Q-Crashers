import type { QualityLevel, QualitySettings } from './types';

export const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  ultra: {
    level: 'ultra',
    maxPixelRatio: 2,
    renderScale: 1,
    msaa: 4,
    shadows: true,
    shadowMapSize: 2048,
    crowdCount: 42000,
    crowdNearCount: 3500,
    flagCount: 420,
    particleScale: 1,
    beamBudget: 420,
    laserBudget: 1400,
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
    crowdCount: 28000,
    crowdNearCount: 2200,
    flagCount: 300,
    particleScale: 0.75,
    beamBudget: 300,
    laserBudget: 900,
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
    crowdCount: 14000,
    crowdNearCount: 1100,
    flagCount: 160,
    particleScale: 0.5,
    beamBudget: 180,
    laserBudget: 500,
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
    crowdCount: 6500,
    crowdNearCount: 450,
    flagCount: 70,
    particleScale: 0.3,
    beamBudget: 96,
    laserBudget: 260,
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

/**
 * Runtime performance governor: dynamic resolution first, preset step-down second.
 * Measures real frame times (not assumptions).
 */
export class PerfGovernor {
  /** current dynamic resolution multiplier applied on top of preset.renderScale */
  scale = 1;
  private samples: number[] = [];
  private cooldown = 3;
  private lowStreak = 0;
  fps = 60;
  frameMs = 16.7;
  enabled = true;

  constructor(private targetFps: number) {}

  setTarget(fps: number) {
    this.targetFps = fps;
  }

  /** returns 'down' when the preset should be lowered, 'up' when there is plenty headroom */
  sample(dtSec: number): 'down' | 'up' | null {
    if (dtSec <= 0 || dtSec > 0.5) return null;
    this.samples.push(dtSec * 1000);
    if (this.samples.length < 45) return null;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length * 0.5)];
    this.samples.length = 0;
    this.frameMs = median;
    this.fps = 1000 / median;
    if (!this.enabled) return null;
    if (this.cooldown > 0) {
      this.cooldown--;
      return null;
    }
    const budget = 1000 / this.targetFps;
    if (median > budget * 1.18) {
      if (this.scale > 0.62) {
        this.scale = Math.max(0.6, this.scale - 0.1);
        this.cooldown = 1;
        return null;
      }
      this.lowStreak++;
      if (this.lowStreak >= 2) {
        this.lowStreak = 0;
        this.cooldown = 3;
        this.scale = 1;
        return 'down';
      }
    } else {
      this.lowStreak = 0;
      if (median < budget * 0.8 && this.scale < 1) {
        this.scale = Math.min(1, this.scale + 0.05);
        this.cooldown = 1;
      }
    }
    return null;
  }
}
