/**
 * Defensive views of other modules' APIs. Those modules are built in parallel; the UI codes
 * against the agreed contracts but never assumes a method exists (optional members + runtime
 * checks), so the interface keeps working with stubs and with the final implementations.
 */
import type { App } from '../core/App';
import type { NamedSpot, System } from '../core/types';

export type CamMode = 'first' | 'third' | 'free' | 'flyover' | 'showcam';

export const CAMERA_MODES: { id: CamMode; label: string; short: string; icon: string; key: string; hint: string }[] = [
  { id: 'first', label: 'First person', short: '1st', icon: 'eye', key: '1', hint: 'Walk the grounds through your own eyes' },
  { id: 'third', label: 'Third person', short: '3rd', icon: 'person', key: '2', hint: 'Follow your avatar' },
  { id: 'free', label: 'Free camera', short: 'Free', icon: 'drone', key: '3', hint: 'Fly anywhere (Space / C for up and down)' },
  { id: 'flyover', label: 'Cinematic fly-over', short: 'Fly', icon: 'orbit', key: '4', hint: 'Automated sweeping drone shots' },
  { id: 'showcam', label: 'Show camera', short: 'Show', icon: 'film', key: '5', hint: 'Directed shots following the show' },
];

export interface RiskLike {
  bodyTemp?: number;
  hydration?: number;
  heartRate?: number;
  warnings?: unknown[];
  /** apparent temperature (humidity, crowd, flames) */
  feelsLikeC?: number;
}

export interface HeatScenarioLike {
  id: string;
  label: string;
  short: string;
  note?: string;
}

export interface PerceptionLike extends System {
  bac?: number;
  xtc?: number;
  compare?: boolean;
  mode?: string;
  risk?: RiskLike;
  /** 'off' | 'onset' | 'plateau' | 'comedown' | 'after' */
  xtcPhase?: string;
  /** grams of alcohol drunk but not yet absorbed */
  stomach?: number;
  resting?: boolean;
  addAlcohol?(grams: number): void;
  setBac?(promille: number): void;
  setResting?(on: boolean): void;
  soberUp?(): void;
  setXtc?(on: boolean): void;
  setCompare?(on: boolean): void;
  setSplit?(x: number): void;
  /** "Air 22.5 °C · 81 % humidity" */
  air?: string;
  /** "Dancing" / "Walking" / "Standing" / "Resting" / "Cooling down" / "First aid" */
  activityLabel?: string;
  heat?: HeatScenarioLike;
  setActivity?(mode: 'auto' | 'dance' | 'rest'): void;
  setHeatScenario?(id: 'endshow' | 'heatwave'): void;
  /** ketamine scenario: 0..1 dissociation, 'off' | 'onset' | 'peak' | 'hole' | 'return' | 'after' */
  ket?: number;
  ketPhase?: string;
  setKetamine?(on: boolean): void;
  /** ketamine risk monitor (0..1, 1 = unimpaired) and its current messages */
  ketMonitor?: { coordination: number; awareness: number; movement: number };
  ketWarnings?: readonly string[];
  /** effect strength: 'strong' (exaggerated, default) or 'realistic' */
  strength?: string;
  setStrength?(s: 'strong' | 'realistic', remember?: boolean): void;
  /** false while the view is not the player's own (Show camera, fly-over, free): effects paused */
  viewActive?: boolean;
  /** outcome card currently shown: 'none' | 'sitdown' | 'collapse' | 'epilogue' | 'khole' | 'ketEpilogue' */
  outcome?: string;
}

export interface CameraLike extends System {
  mode?: string;
  /** eye field of view (user setting) */
  fovSetting?: number;
  setBaseFov?(deg: number): void;
  setMode?(mode: CamMode): void;
}

export interface PlayerLike extends System {
  teleport?(spot: NamedSpot): void;
  /** act on the interactable the player targets (the prompt it announced) */
  interact?(): void;
  yaw?: number;
  pitch?: number;
  reduceMotion?: boolean;
  setReduceMotion?(on: boolean): void;
  rememberStart?(id: string): void;
  rememberedStart?: string | null;
}

/** Tribe (populated) or the empty grounds as filmed; size capped by the quality preset */
export interface CrowdLike {
  populated: boolean;
  count: number;
  targetCount: number;
  maxCount: number;
  setPopulated(on: boolean): void;
  setCount(n: number): void;
  /** optional: head-count cap of any preset (falls back to the UI mirror below) */
  maxCountFor?(level: string): number;
}

/**
 * Mirror of the crowd's per-preset head-count caps (src/crowd/CrowdSystem.ts LOD.head) for the
 * presets that are not active. The active preset always shows the live CrowdSystem.maxCount.
 */
const HEADCOUNT_FALLBACK: Record<string, number> = { ultra: 65000, high: 45000, medium: 26000, mobile: 11000 };

export const crowdSys = (app: App) => app.get('crowd') as unknown as CrowdLike | undefined;

/** people the crowd can show at a quality preset (live value for the active preset) */
export function crowdCap(app: App, level: string): number {
  const c = crowdSys(app);
  if (c?.maxCountFor) return c.maxCountFor(level);
  if (c && level === app.quality.level) return c.maxCount;
  return HEADCOUNT_FALLBACK[level] ?? 0;
}

/** the first-aid post of the RED stage (official 2026 floorplan, design bible §6.5) */
export const FIRST_AID = { x: 116.7, z: 122.7 };

export const perception = (app: App) => app.get<PerceptionLike>('perception');
export const cameraRig = (app: App) => app.get<CameraLike>('camera');
export const player = (app: App) => app.get<PlayerLike>('player');

/** call an optional method by name if it exists (returns true when called) */
export function tryCall(obj: unknown, method: string, ...args: unknown[]): boolean {
  const o = obj as Record<string, unknown> | null | undefined;
  if (o && typeof o[method] === 'function') {
    (o[method] as (...a: unknown[]) => unknown).apply(o, args);
    return true;
  }
  return false;
}

/** Render an unknown content value (string or {label/title/text/name, url}) as plain text. */
export function asText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const t = o.label ?? o.title ?? o.text ?? o.name ?? o.org ?? '';
    const d = o.desc ?? o.description ?? o.detail ?? '';
    return [t, d].filter((x) => typeof x === 'string' && x).join(' — ');
  }
  return '';
}

export function asUrl(v: unknown): string | null {
  if (v && typeof v === 'object') {
    const u = (v as Record<string, unknown>).url ?? (v as Record<string, unknown>).href;
    if (typeof u === 'string' && /^https?:\/\//.test(u)) return u;
  }
  if (typeof v === 'string') {
    const m = v.match(/https?:\/\/\S+/);
    if (m) return m[0].replace(/[).,]+$/, '');
  }
  return null;
}
