/**
 * Main-thread side of the audio analysis: fetch/read the file, decode it with an
 * OfflineAudioContext at 11025 Hz, mix to mono, hand the samples (transferred, zero-copy) to the
 * analysis worker, cache results in IndexedDB, validate / export the analysis JSON.
 */
import type { Section, TempoSegment } from '../show/ShowTypes';
import { analyzeAudio, authoredHash, type AnalysisInput, type AnalysisResult } from './analysisCore';
import { createOffline } from './audioUtils';

export type { AnalysisResult, SectionReport, SegmentReport } from './analysisCore';

export const ANALYSIS_RATE = 11025;
export const ANALYSIS_FILENAME = 'endshow-2026.analysis.json';

export interface AnalysisShow {
  id?: string;
  tempo: TempoSegment[];
  sections: Section[];
  duration: number;
}

export interface AnalyzeOptions {
  /** current audio offset (audio time = show time + offset) */
  baseOffset?: number;
  fixedOffset?: boolean;
  onProgress?: (p: number, stage: string) => void;
  signal?: AbortSignal;
}

/** File / Blob / ArrayBuffer / URL -> ArrayBuffer */
export async function readAudioData(src: File | Blob | ArrayBuffer | string, signal?: AbortSignal): Promise<ArrayBuffer> {
  if (src instanceof ArrayBuffer) return src;
  if (typeof src === 'string') {
    const res = await fetch(src, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} while reading the audio file`);
    return res.arrayBuffer();
  }
  return src.arrayBuffer();
}

/** decode + resample to `rate` + mix to mono (the input ArrayBuffer is detached) */
export async function decodeMono(buf: ArrayBuffer, rate = ANALYSIS_RATE): Promise<{ samples: Float32Array<ArrayBuffer>; sampleRate: number }> {
  const ctx = createOffline(1, 1 / 1000, rate);
  const audio = await new Promise<AudioBuffer>((resolve, reject) => {
    try {
      const p = ctx.decodeAudioData(buf, resolve, (e) => reject(e ?? new Error('decode failed')));
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    } catch (e) {
      reject(e);
    }
  });
  const n = audio.length;
  const out = new Float32Array(n);
  const nc = audio.numberOfChannels;
  for (let ch = 0; ch < nc; ch++) {
    const d = audio.getChannelData(ch);
    for (let i = 0; i < n; i++) out[i] += d[i];
  }
  if (nc > 1) for (let i = 0; i < n; i++) out[i] /= nc;
  // engines that refused 11025 Hz: decimate by an integer factor (box filter)
  const factor = Math.round(audio.sampleRate / rate);
  if (factor >= 2) {
    const m = Math.floor(n / factor);
    const dec = new Float32Array(m);
    for (let i = 0; i < m; i++) {
      let s = 0;
      for (let k = 0; k < factor; k++) s += out[i * factor + k];
      dec[i] = s / factor;
    }
    return { samples: dec, sampleRate: audio.sampleRate / factor };
  }
  return { samples: out, sampleRate: audio.sampleRate };
}

let nextId = 1;

/** Run the analysis in a Web Worker (falls back to the main thread if workers are unavailable). */
export function runAnalysis(samples: Float32Array<ArrayBuffer>, sampleRate: number, show: AnalysisShow, opts: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const input: AnalysisInput = {
    samples,
    sampleRate,
    tempo: show.tempo.map((t) => ({ ...t })),
    sections: show.sections.map((s) => ({ ...s })),
    showDuration: show.duration,
    baseOffset: opts.baseOffset ?? 0,
    fixedOffset: opts.fixedOffset,
  };
  let worker: Worker | null = null;
  try {
    worker = new Worker(new URL('./analyzer.worker.ts', import.meta.url), { type: 'module', name: 'endshow-analyzer' });
  } catch (e) {
    console.warn('[analysis] worker unavailable, analysing on the main thread', e);
  }
  if (!worker) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(analyzeAudio(input, opts.onProgress));
        } catch (e) {
          reject(e);
        }
      }, 30);
    });
  }
  const w = worker;
  const id = nextId++;
  return new Promise<AnalysisResult>((resolve, reject) => {
    const done = () => {
      w.terminate();
      opts.signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      done();
      reject(new DOMException('analysis aborted', 'AbortError'));
    };
    opts.signal?.addEventListener('abort', onAbort);
    w.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; id: number; p?: number; stage?: string; result?: AnalysisResult; message?: string };
      if (m.id !== id) return;
      if (m.type === 'progress') opts.onProgress?.(m.p ?? 0, m.stage ?? '');
      else if (m.type === 'result') {
        done();
        resolve(m.result!);
      } else if (m.type === 'error') {
        done();
        reject(new Error(m.message ?? 'analysis failed'));
      }
    };
    w.onerror = (e) => {
      done();
      reject(new Error(e.message || 'analysis worker crashed'));
    };
    w.postMessage({ type: 'analyze', id, input }, [samples.buffer]);
  });
}

/** fetch/read -> decode -> worker. Progress: 0..0.35 read+decode, 0.35..1 analysis. */
export async function analyzeSource(
  src: File | Blob | ArrayBuffer | string,
  info: { name: string; size?: number },
  show: AnalysisShow,
  opts: AnalyzeOptions = {},
): Promise<AnalysisResult> {
  const prog = opts.onProgress ?? (() => {});
  const t0 = performance.now();
  prog(0.01, 'reading');
  const buf = await readAudioData(src, opts.signal);
  const size = info.size ?? buf.byteLength;
  prog(0.1, 'decoding');
  const { samples, sampleRate } = await decodeMono(buf);
  if (opts.signal?.aborted) throw new DOMException('analysis aborted', 'AbortError');
  const duration = samples.length / sampleRate;
  const tDecode = performance.now() - t0;
  prog(0.35, 'analysing');
  const result = await runAnalysis(samples, sampleRate, show, { ...opts, onProgress: (p, s) => prog(0.35 + 0.65 * p, s) });
  result.file = { name: info.name, size, duration: +duration.toFixed(3) };
  result.showId = show.id;
  result.timings = { decode: Math.round(tDecode), ...result.timings, total: Math.round(performance.now() - t0) };
  return result;
}

// ------------------------------------------------------------------------------------ cache

const DB = 'defqon1-endshow';
const STORE = 'analysis';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        try {
          req.result.createObjectStore(STORE);
        } catch {
          /* exists */
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function cacheKey(name: string, size: number | undefined, duration: number, show: AnalysisShow): string {
  return `${name}|${size ?? '?'}|${duration.toFixed(1)}|${authoredHash(show.tempo, show.sections)}`;
}

export async function cacheGet(key: string): Promise<AnalysisResult | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as AnalysisResult) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  }).finally(() => db.close()) as Promise<AnalysisResult | null>;
}

export async function cachePut(key: string, value: AnalysisResult): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

// ------------------------------------------------------------------------------------ JSON

/**
 * Validate an analysis JSON against the current show. Returns the result when its tempo segments
 * line up with the authored ones (same count and boundaries), otherwise null.
 */
export function validateAnalysis(obj: unknown, show: AnalysisShow): AnalysisResult | null {
  if (!obj || typeof obj !== 'object') return null;
  const r = obj as Partial<AnalysisResult>;
  if (r.format !== 'endshow-analysis' || r.version !== 1 || !Array.isArray(r.tempo)) return null;
  if (r.tempo.length !== show.tempo.length) return null;
  const a = [...show.tempo].sort((p, q) => p.start - q.start);
  const b = [...r.tempo].sort((p, q) => p.start - q.start);
  for (let i = 0; i < a.length; i++) {
    const s = b[i];
    if (!s || ![s.start, s.end, s.bpm, s.anchor].every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
    if (Math.abs(s.start - a[i].start) > 0.05 || Math.abs(s.end - a[i].end) > 0.05) return null;
    if (s.bpm < 40 || s.bpm > 300) return null;
  }
  if (typeof r.offset !== 'number' || !Number.isFinite(r.offset)) r.offset = 0;
  return r as AnalysisResult;
}

export function analysisToJson(result: AnalysisResult): string {
  return JSON.stringify(result, null, 1);
}

/** Offer the analysis as a file download (ship it as public/assets/audio/endshow-2026.analysis.json). */
export function downloadAnalysis(result: AnalysisResult, filename = ANALYSIS_FILENAME): void {
  const blob = new Blob([analysisToJson(result)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
