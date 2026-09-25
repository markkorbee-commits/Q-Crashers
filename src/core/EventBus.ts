/** Tiny typed event bus used for system -> UI communication (systems never import UI). */

export interface AppEvents {
  'show:loaded': { duration: number; title: string };
  'show:state': { playing: boolean };
  'show:seek': { time: number };
  'show:ended': Record<string, never>;
  'audio:source': { kind: string; label: string; ready: boolean };
  'audio:analysis': { status: 'running' | 'done' | 'failed'; message?: string };
  'quality:changed': { level: string };
  'camera:mode': { mode: string };
  'interact:prompt': { label: string | null };
  'bar:open': { barId: string };
  'bar:close': Record<string, never>;
  'toast': { text: string; ms?: number };
  'perception:changed': { mode: string };
  'photo:mode': { on: boolean };
  'crowd:populated': { on: boolean; count: number };
  /**
   * `progress` = bar position now. Optional: the step that just started is expected to end at
   * `next` after about `etaMs`. A UI can animate the bar towards `next` on the compositor (CSS
   * transform transition), so it keeps moving while the main thread is busy generating content.
   */
  'loading:progress': { label: string; progress: number; next?: number; etaMs?: number };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private map = new Map<string, Set<Handler<any>>>();

  on<K extends keyof AppEvents>(type: K, fn: Handler<AppEvents[K]>): () => void {
    let set = this.map.get(type);
    if (!set) this.map.set(type, (set = new Set()));
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit<K extends keyof AppEvents>(type: K, payload: AppEvents[K]): void {
    const set = this.map.get(type);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (e) {
        console.error(`[events] handler for ${type} failed`, e);
      }
    }
  }
}
