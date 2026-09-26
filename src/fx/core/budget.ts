import type { QualityLevel } from '../../core/types';
import { F } from './Emitter';

/**
 * Particle budgets of the FX layers per quality preset. The FX engine owns them: a system passes the
 * nominal numbers of its layer (`maxParticles`), FxLayer asks `layerBudget()` for the final one.
 *
 *  - fw-stars / fw-smoke get headroom on the desktop presets: the finale barrages (e.g. 841-846 s)
 *    exceeded the nominal budget and had to be thinned.
 *  - mobile caps the ribbon layers to what a phone GPU draws comfortably (every ribbon particle is
 *    (segments + 3) * 2 vertices): fw-stars ~15k, pyro sparks ~12k particles.
 *  - crackle pops (F.POPS emitters: stars x pops) are thinned on medium / mobile: each star keeps a
 *    random ~60 % / ~40 % of its pops. Their light is compensated a little in the shaders.
 *
 * The level is set by CueFxSystem before it builds its layers (init / setQuality).
 */
let level: QualityLevel = 'high';

interface Rule {
  /** multiplier on the nominal budget per preset */
  scale?: Partial<Record<QualityLevel, number>>;
  /** hard cap (particles) per preset */
  cap?: Partial<Record<QualityLevel, number>>;
}

const RULES: Record<string, Rule> = {
  'fw-stars': { scale: { ultra: 1.3, high: 1.3, medium: 1.25, mobile: 1 }, cap: { mobile: 15000 } },
  'fw-smoke': { scale: { ultra: 1.5, high: 1.5, medium: 1.5, mobile: 1.3 } },
  'pyro-sparks': { cap: { mobile: 12000 } },
};

const POPS_KEEP: Record<QualityLevel, number> = { ultra: 1, high: 1, medium: 0.6, mobile: 0.4 };

/**
 * Lowest weight of an emitter whose particles are dying out (FxLayer tail weighting). Its dead
 * instances still run the vertex shader up to their death test, so the small presets count them
 * for more: a phone keeps close to its hard particle caps.
 */
const TAIL_FLOOR: Record<QualityLevel, number> = { ultra: 0.05, high: 0.05, medium: 0.25, mobile: 0.5 };

export function setFxBudgetLevel(l: QualityLevel): void {
  level = l;
}

export function fxBudgetLevel(): QualityLevel {
  return level;
}

/** final particle budget of a layer for the current preset */
export function layerBudget(name: string, requested: number): number {
  const r = RULES[name];
  if (!r) return requested;
  let n = requested * (r.scale?.[level] ?? 1);
  const cap = r.cap?.[level];
  if (cap !== undefined) n = Math.min(n, cap);
  return Math.round(n);
}

/** upper bound of an emitter's budget share from its kind (crackle pops on the small presets) */
export function keepCap(flags: number): number {
  return (flags & F.POPS) !== 0 ? POPS_KEEP[level] : 1;
}

/** lowest budget weight of a dying emitter on the current preset (see FxLayer) */
export function tailFloor(): number {
  return TAIL_FLOOR[level];
}
