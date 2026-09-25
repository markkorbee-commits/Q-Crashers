import type { App } from '../core/App';
import { findAudioFile, MediaFileTrack } from './MediaFileTrack';
import { YouTubeTrack } from './YouTubeTrack';

export type AudioSourceKind = 'file' | 'youtube' | 'synth' | 'silent';

/**
 * Chooses and switches the music source behind the show clock (baseline — extended during
 * implementation with the synthesized rehearsal track and the in-browser tempo analysis).
 * The UI calls these methods; the show engine never knows which source is active.
 */
export class AudioSources {
  kind: AudioSourceKind = 'silent';
  label = 'No audio';

  constructor(private app: App) {}

  /** Try the project's local audio file(s) listed in the show file. */
  async autoDetect(): Promise<boolean> {
    const meta = this.app.show.file.meta.audio;
    const url = await findAudioFile(meta.src);
    if (!url) return false;
    await this.useUrl(url, 'Endshow audio (local file)');
    return true;
  }

  async useUrl(url: string, label: string): Promise<void> {
    const track = new MediaFileTrack(this.app.audio, url, label, this.app.show.file.meta.audio.offset ?? 0);
    await this.app.setAudioTrack(track);
    this.kind = 'file';
    this.label = label;
  }

  /** A file picked / dropped by the user. */
  async useFile(file: File): Promise<void> {
    const track = new MediaFileTrack(this.app.audio, file, `Your file: ${file.name}`, this.app.show.file.meta.audio.offset ?? 0);
    await this.app.setAudioTrack(track);
    this.kind = 'file';
    this.label = track.label;
  }

  /** Official video as synced picture-in-picture (container must be >= 200x200 px and visible). */
  async useYouTube(container: HTMLElement): Promise<void> {
    const id = this.app.show.file.meta.audio.youtubeId;
    if (!id) throw new Error('No YouTube id in show file');
    const track = new YouTubeTrack(id, container, this.app.show.file.meta.audio.offset ?? 0);
    await this.app.setAudioTrack(track);
    this.kind = 'youtube';
    this.label = track.label;
  }

  /** Synthesized rehearsal track following the show's tempo map (implemented later). */
  async useSynth(): Promise<void> {
    this.kind = 'synth';
    this.label = 'Rehearsal track (synthesized)';
  }

  /**
   * Analyse the active file (onsets/beats) and refine the show's tempo grid so kick-synced
   * effects lock to the real audio (implemented later).
   */
  async analyze(): Promise<void> {}
}
