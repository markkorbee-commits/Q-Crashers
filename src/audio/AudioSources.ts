import type { App } from '../core/App';
import type { TempoSegment } from '../show/ShowTypes';
import { ANALYSIS_FILENAME, analyzeSource, cacheGet, cacheKey, cachePut, downloadAnalysis, validateAnalysis, type AnalysisResult, type AnalysisShow } from './AudioAnalyzer';
import { SilentTrack } from './AudioTrack';
import { findAudioFile, MediaFileTrack } from './MediaFileTrack';
import { SynthTrack } from './SynthTrack';
import { YouTubeTrack } from './YouTubeTrack';

export type AudioSourceKind = 'file' | 'youtube' | 'synth' | 'silent';
export type AnalysisState = 'idle' | 'running' | 'done' | 'failed' | 'skipped';

/** where a pre-computed analysis may be shipped (tried in order) */
const SHIPPED_ANALYSIS = [`./assets/audio/${ANALYSIS_FILENAME}`, `./show/${ANALYSIS_FILENAME}`];

/**
 * Chooses and switches the music source behind the show clock, and keeps the show's tempo grid
 * locked to the real audio (shipped analysis JSON, IndexedDB cache, or in-browser analysis).
 * The UI calls these methods; the show engine never knows which source is active.
 *
 * Events: 'audio:source' (from App.setAudioTrack), 'audio:analysis' { status, message }.
 * URL params: ?analyze=0 disables the automatic analysis, ?analyze=force runs it on any device,
 * ?synth selects the rehearsal track at start-up (when no local file is found).
 */
export class AudioSources {
  kind: AudioSourceKind = 'silent';
  label = 'No audio';
  /** the analysis currently applied to the show (null = authored tempo map) */
  analysis: AnalysisResult | null = null;
  analysisState: AnalysisState = 'idle';
  /** 0..1 while running */
  analysisProgress = 0;
  /** where the applied analysis came from */
  analysisOrigin: 'shipped' | 'cache' | 'analyzed' | null = null;
  private authoredTempo: TempoSegment[] | null = null;
  private shipped: AnalysisResult | null = null;
  private runId = 0;
  private abort: AbortController | null = null;

  constructor(private app: App) {}

  // ------------------------------------------------------------------ sources

  /**
   * Start-up: apply a shipped analysis JSON (if present) without decoding anything, then try the
   * project's local audio file(s) listed in the show file.
   */
  async autoDetect(): Promise<boolean> {
    // A show whose tempo map was measured offline from this very audio (every segment 'analyzed')
    // needs no shipped analysis: probing the default locations would only log two 404s per visit.
    const shippedUrl = this.app.show.file.meta.audio.analysis;
    if (typeof shippedUrl === 'string' && shippedUrl) await this.loadShippedAnalysis([shippedUrl]);
    else if (!this.tempoMeasured()) await this.loadShippedAnalysis();
    const meta = this.app.show.file.meta.audio;
    const url = await findAudioFile(meta.src);
    if (!url) {
      if (this.app.params.has('synth')) await this.useSynth();
      return false;
    }
    await this.useUrl(url, 'Endshow audio (local file)');
    return true;
  }

  async useUrl(url: string, label: string): Promise<void> {
    this.cancelAnalysis();
    // the shipped analysis belongs to the project's own file: use its offset for it
    const offset = this.shipped ? this.shipped.offset : this.baseOffset();
    const track = new MediaFileTrack(this.app.audio, url, label, offset);
    await this.app.setAudioTrack(track);
    this.kind = 'file';
    this.label = label;
    // the project's own file: a tempo map measured offline from this very audio (scripts/retime-show.py,
    // public/show/audio-map.json) beats the in-browser estimate — only ?analyze=force re-runs it
    if (!this.shipped && !(this.tempoMeasured() && this.app.params.get('analyze') !== 'force')) this.autoAnalyze();
  }

  /** true when every tempo segment of the show was measured from the real audio (source 'analyzed') */
  tempoMeasured(): boolean {
    const segs = this.app.show.file.tempo;
    return segs.length > 0 && segs.every((s) => s.source === 'analyzed');
  }

  /** A file picked / dropped by the user (analysed automatically on desktop). */
  async useFile(file: File): Promise<void> {
    this.cancelAnalysis();
    const track = new MediaFileTrack(this.app.audio, file, `Your file: ${file.name}`, this.baseOffset());
    await this.app.setAudioTrack(track);
    this.kind = 'file';
    this.label = track.label;
    this.autoAnalyze();
  }

  /** Official video as synced picture-in-picture (container must be >= 200x200 px and visible). */
  async useYouTube(container: HTMLElement): Promise<void> {
    this.cancelAnalysis();
    const id = this.app.show.file.meta.audio.youtubeId;
    if (!id) throw new Error('No YouTube id in show file');
    const track = new YouTubeTrack(id, container, this.app.show.file.meta.audio.offset ?? 0);
    await this.app.setAudioTrack(track);
    this.kind = 'youtube';
    this.label = track.label;
  }

  /** Synthesized rehearsal track following the show's tempo map, sections and chapters. */
  async useSynth(): Promise<void> {
    this.cancelAnalysis();
    const d = this.app.device;
    const lite = d.mobile || (d.memoryGB !== null && d.memoryGB < 4) || d.cores <= 2;
    const track = new SynthTrack(this.app.audio, this.app.show, { lite });
    await this.app.setAudioTrack(track);
    this.kind = 'synth';
    this.label = track.label;
  }

  /** Back to the silent clock (no audio). */
  async useSilent(): Promise<void> {
    this.cancelAnalysis();
    await this.app.setAudioTrack(new SilentTrack(this.app.show.duration));
    this.kind = 'silent';
    this.label = 'No audio';
  }

  // ------------------------------------------------------------------ analysis

  /** Why the automatic analysis would be skipped on this device (null = allowed). */
  analysisBlocker(): string | null {
    const p = this.app.params.get('analyze');
    if (p === 'force') return null;
    if (p === '0' || p === 'off') return 'disabled by ?analyze=0';
    const d = this.app.device;
    if (d.mobile) return 'mobile device';
    if (d.memoryGB !== null && d.memoryGB < 4) return `low memory (${d.memoryGB} GB)`;
    return null;
  }

  private autoAnalyze(): void {
    if (this.analysisBlocker()) {
      // still try the cache (cheap, no decoding)
      void this.analyze({ cacheOnly: true }).catch(() => undefined);
      return;
    }
    void this.analyze().catch(() => undefined);
  }

  /**
   * Analyse the active file (onsets/beats/sections) and refine the show's tempo grid so kick-synced
   * effects lock to the real audio. Skipped automatically on mobile / low memory unless `force`.
   * Results are cached in IndexedDB (file name + size + duration + authored tempo hash).
   */
  async analyze(opts: { force?: boolean; cacheOnly?: boolean; ignoreCache?: boolean } = {}): Promise<AnalysisResult | null> {
    const track = this.app.clock?.track;
    if (!(track instanceof MediaFileTrack)) {
      this.emit('failed', 'Tempo analysis needs an audio file as the music source');
      return null;
    }
    const run = ++this.runId;
    const show = this.analysisShow();
    const info = track.fileInfo;
    try {
      await track.load();
    } catch {
      /* duration unknown -> key without it */
    }
    const dur = Number.isFinite(track.fileDuration) ? track.fileDuration : 0;
    const key = cacheKey(info.name, info.size, dur, show);
    if (!opts.ignoreCache) {
      const cached = validateAnalysis(await cacheGet(key), show);
      if (cached && run === this.runId && this.app.clock.track === track) {
        this.apply(cached, track, 'cache');
        this.emit('done', this.summary(cached, 'cached analysis'));
        return cached;
      }
    }
    if (opts.cacheOnly) return null;
    const blocker = this.analysisBlocker();
    if (blocker && !opts.force) {
      this.analysisState = 'skipped';
      this.emit('done', `Tempo analysis skipped (${blocker}) — using the authored tempo map`);
      return null;
    }
    this.abort?.abort();
    const abort = (this.abort = new AbortController());
    this.analysisState = 'running';
    this.analysisProgress = 0;
    this.emit('running', 'Analysing the audio… 0%');
    let lastPct = -1;
    try {
      const result = await analyzeSource(track.source, info, show, {
        baseOffset: this.baseOffset(),
        signal: abort.signal,
        onProgress: (p, stage) => {
          if (run !== this.runId) return;
          this.analysisProgress = p;
          const pct = Math.floor(p * 20) * 5;
          if (pct !== lastPct) {
            lastPct = pct;
            this.emit('running', `Analysing the audio (${stage})… ${pct}%`);
          }
        },
      });
      if (run !== this.runId || this.app.clock.track !== track) return null; // source changed meanwhile
      this.apply(result, track, 'analyzed');
      void cachePut(key, result);
      this.emit('done', this.summary(result, 'analysis'));
      return result;
    } catch (e) {
      if (run !== this.runId) return null;
      const aborted = (e as Error)?.name === 'AbortError';
      this.analysisState = aborted ? 'idle' : 'failed';
      if (!aborted) {
        console.warn('[analysis] failed', e);
        this.emit('failed', `Tempo analysis failed: ${(e as Error)?.message ?? e}`);
      }
      return null;
    } finally {
      if (this.abort === abort) this.abort = null;
    }
  }

  /** stop a running analysis (source switch) */
  cancelAnalysis(): void {
    this.runId++;
    this.abort?.abort();
    this.abort = null;
    if (this.analysisState === 'running') this.analysisState = 'idle';
  }

  /** Try the shipped analysis JSON (no decoding). Applies its tempo map when it matches the show. */
  async loadShippedAnalysis(urls: string[] = SHIPPED_ANALYSIS): Promise<boolean> {
    const show = this.analysisShow();
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        const type = res.headers.get('content-type') ?? '';
        if (!res.ok || type.includes('text/html')) continue;
        const result = validateAnalysis(await res.json(), show);
        if (!result) {
          console.info(`[analysis] ${url} does not match this show's tempo map — ignored`);
          continue;
        }
        this.shipped = result;
        this.apply(result, null, 'shipped');
        this.emit('done', this.summary(result, 'shipped analysis'));
        return true;
      } catch {
        /* not present */
      }
    }
    return false;
  }

  /** Restore the authored tempo map (and the show file's audio offset). */
  resetTempo(): void {
    this.cancelAnalysis();
    const authored = this.authored();
    this.app.show.setTempo(authored.map((s) => ({ ...s })));
    const track = this.app.clock?.track;
    if (track instanceof MediaFileTrack) track.setOffset(this.baseOffset());
    this.analysis = null;
    this.analysisOrigin = null;
    this.analysisState = 'idle';
  }

  /** Download the applied analysis as JSON (to ship it as public/assets/audio/endshow-2026.analysis.json). */
  exportAnalysis(filename = ANALYSIS_FILENAME): boolean {
    if (!this.analysis) return false;
    downloadAnalysis(this.analysis, filename);
    return true;
  }

  // ------------------------------------------------------------------ internals

  private apply(result: AnalysisResult, track: MediaFileTrack | null, origin: 'shipped' | 'cache' | 'analyzed'): void {
    this.authored(); // make sure the authored map is captured before replacing it
    this.app.show.setTempo(result.tempo.map((s) => ({ ...s })));
    if (track) track.setOffset(result.offset);
    this.analysis = result;
    this.analysisOrigin = origin;
    this.analysisState = 'done';
    this.analysisProgress = 1;
  }

  private authored(): TempoSegment[] {
    if (!this.authoredTempo) this.authoredTempo = this.app.show.file.tempo.map((s) => ({ ...s }));
    return this.authoredTempo;
  }

  private analysisShow(): AnalysisShow {
    const f = this.app.show.file;
    return { id: f.meta.id, tempo: this.authored(), sections: f.sections, duration: this.app.show.duration };
  }

  private baseOffset(): number {
    return this.app.show.file.meta.audio.offset ?? 0;
  }

  private summary(r: AnalysisResult, what: string): string {
    const refined = r.segments.filter((s) => s.refined);
    const bpms = refined.map((s) => s.bpm);
    const range = bpms.length ? (Math.min(...bpms) === Math.max(...bpms) ? `${bpms[0].toFixed(2)} BPM` : `${Math.min(...bpms).toFixed(2)}–${Math.max(...bpms).toFixed(2)} BPM`) : 'authored tempo';
    const off = Math.abs(r.offset) >= 0.005 ? ` · audio offset ${r.offset >= 0 ? '+' : ''}${r.offset.toFixed(3)} s` : '';
    return `Beat grid locked (${what}): ${refined.length}/${r.segments.filter((s) => s.kick).length} kick segments refined · ${range}${off}`;
  }

  private emit(status: 'running' | 'done' | 'failed', message: string): void {
    this.app.events.emit('audio:analysis', { status, message });
  }
}
