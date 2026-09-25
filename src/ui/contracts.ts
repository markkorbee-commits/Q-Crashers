/**
 * Defensive views of other modules' APIs. Those modules are built in parallel; the UI codes
 * against the agreed contracts but never assumes a method exists (optional members + runtime
 * checks), so the interface keeps working with stubs and with the final implementations.
 */
import type { App } from '../core/App';
import type { NamedSpot, System } from '../core/types';

export type CamMode = 'first' | 'third' | 'free' | 'flyover' | 'showcam' | 'photo';

export const CAMERA_MODES: { id: CamMode; label: string; short: string; icon: string; key: string; hint: string }[] = [
  { id: 'first', label: 'First person', short: '1st', icon: 'eye', key: '1', hint: 'Walk the grounds through your own eyes' },
  { id: 'third', label: 'Third person', short: '3rd', icon: 'person', key: '2', hint: 'Follow your avatar' },
  { id: 'free', label: 'Free camera', short: 'Free', icon: 'drone', key: '3', hint: 'Fly anywhere (Space / C for up and down)' },
  { id: 'flyover', label: 'Cinematic fly-over', short: 'Fly', icon: 'orbit', key: '4', hint: 'Automated sweeping drone shots' },
  { id: 'showcam', label: 'Show camera', short: 'Show', icon: 'film', key: '5', hint: 'Directed shots following the show' },
  { id: 'photo', label: 'Photo mode', short: 'Photo', icon: 'camera', key: '6', hint: 'Frame and capture a picture' },
];

export interface RiskLike {
  bodyTemp?: number;
  hydration?: number;
  heartRate?: number;
  warnings?: unknown[];
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
}

export interface CameraLike extends System {
  mode?: string;
  /** eye field of view (user setting) */
  fovSetting?: number;
  setBaseFov?(deg: number): void;
  setMode?(mode: CamMode): void;
  setFov?(deg: number): void;
  setRoll?(deg: number): void;
  setFocus?(metres: number): void;
  autoFocus?(): number | void;
  setAperture?(v: number): void;
  setExposure?(v: number): void;
}

export interface PlayerLike extends System {
  teleport?(spot: NamedSpot): void;
  yaw?: number;
  pitch?: number;
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
