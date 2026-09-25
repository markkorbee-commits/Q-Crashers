/**
 * Cooperative scheduling helpers for loading work on the main thread.
 *
 * `setTimeout(0)` is not enough to keep a loading screen alive: after a long task the browser may run
 * the next timer before it paints, timers are clamped to >= 4 ms once nested, and hidden tabs throttle
 * them to 1 s (or 1 min). These helpers yield in a way that (a) guarantees a paint when the page is
 * visible and (b) is never throttled when it is not.
 *
 * Usage inside a long generator loop (any system's init):
 *   const slice = new TimeSlicer(12);
 *   for (let y = 0; y < h; y++) { ...row...; if (slice.due()) await slice.yield(); }
 */

let channel: MessageChannel | null = null;
const queue: (() => void)[] = [];

/** Resolve on the next macrotask via MessageChannel (no 4 ms clamp, not throttled in hidden tabs). */
export function yieldTask(): Promise<void> {
  if (typeof MessageChannel === 'undefined') return new Promise((r) => setTimeout(r, 0));
  if (!channel) {
    channel = new MessageChannel();
    channel.port1.onmessage = () => queue.shift()?.();
  }
  return new Promise((r) => {
    queue.push(r);
    channel!.port2.postMessage(0);
  });
}

/**
 * Resolve after the browser has had a chance to paint (visible page), or on the next macrotask when
 * the page is hidden (rAF does not fire there). A 120 ms fallback covers rAF starvation.
 */
export function nextPaint(): Promise<void> {
  if (typeof document === 'undefined' || document.hidden || typeof requestAnimationFrame === 'undefined') return yieldTask();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, 120);
    requestAnimationFrame(() => void yieldTask().then(finish));
  });
}

/**
 * Delay between polls of an external condition (GPU fence, parallel shader compile): one painted
 * frame when visible; a plain timer when hidden, so a background tab does not spin on macrotasks.
 */
export function pollDelay(): Promise<void> {
  if (typeof document !== 'undefined' && document.hidden) return new Promise((r) => setTimeout(r, 50));
  return nextPaint();
}

/** Splits a long synchronous job into slices of `budgetMs`, yielding to paint in between. */
export class TimeSlicer {
  private start = performance.now();
  constructor(private readonly budgetMs = 12) {}

  /** true when the current slice has used up its budget */
  due(): boolean {
    return performance.now() - this.start >= this.budgetMs;
  }

  /** yield to the browser (paint) and start a new slice */
  async yield(): Promise<void> {
    await nextPaint();
    this.start = performance.now();
  }

  /** yield only when the slice is used up */
  async maybeYield(): Promise<void> {
    if (this.due()) await this.yield();
  }
}
