/**
 * Web Worker running the tempo / structure analysis off the main thread.
 * Protocol:
 *   in : { type: 'analyze', id, input: AnalysisInput }  (input.samples transferred)
 *   out: { type: 'progress', id, p, stage } | { type: 'result', id, result } | { type: 'error', id, message }
 */
import { analyzeAudio, type AnalysisInput } from './analysisCore';

interface WorkerScope {
  postMessage(msg: unknown): void;
  onmessage: ((e: MessageEvent) => void) | null;
}
const scope = self as unknown as WorkerScope;

scope.onmessage = (e: MessageEvent) => {
  const msg = e.data as { type: string; id: number; input: AnalysisInput };
  if (msg?.type !== 'analyze') return;
  const { id } = msg;
  try {
    let last = -1;
    const result = analyzeAudio(msg.input, (p, stage) => {
      // throttle progress messages
      if (p - last >= 0.02 || p >= 1) {
        last = p;
        scope.postMessage({ type: 'progress', id, p, stage });
      }
    });
    scope.postMessage({ type: 'result', id, result });
  } catch (err) {
    scope.postMessage({ type: 'error', id, message: err instanceof Error ? err.message : String(err) });
  }
};
