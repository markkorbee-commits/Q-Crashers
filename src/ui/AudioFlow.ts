import { SilentTrack } from '../audio/AudioTrack';
import { IS_ARTIFACT } from '../core/target';
import { h, store } from './dom';
import { icon } from './icons';
import type { UI } from './UI';

export type SourceKind = 'file' | 'youtube' | 'synth' | 'silent';
const KEY = 'dq26.audio';

/**
 * Audio source resolution + switching: local Endshow file (auto-detected), a user file (picker or
 * drag & drop anywhere), the official YouTube video as a synced picture-in-picture, the
 * synthesized rehearsal track, or silence. The choice is remembered on this device.
 */
export class AudioFlow {
  private fileInput: HTMLInputElement;
  private drop: HTMLElement;
  private dragDepth = 0;
  private chooserResolve: (() => void) | null = null;
  private busy = false;

  constructor(private ui: UI) {
    this.fileInput = h('input', { type: 'file', accept: 'audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac,.webm', style: 'display:none', 'aria-hidden': 'true' });
    this.fileInput.addEventListener('change', () => {
      const f = this.fileInput.files?.[0];
      this.fileInput.value = '';
      if (f) void this.use('file', f);
    });
    document.body.appendChild(this.fileInput);
    this.drop = h('div', { class: 'drop' }, h('div', { class: 'zone', html: `${icon('upload')}<span>Drop the Endshow audio</span><small class="muted" style="font:500 12px/1.4 var(--font-ui);letter-spacing:0;text-transform:none">MP3 · M4A · WAV · OGG · FLAC</small>` }));
    ui.root.appendChild(this.drop);
    window.addEventListener('dragenter', this.onDragEnter);
    window.addEventListener('dragover', this.onDragOver);
    window.addEventListener('dragleave', this.onDragLeave);
    window.addEventListener('drop', this.onDrop);
  }

  get remembered(): SourceKind | null {
    const v = store.get(KEY);
    return v === 'file' || v === 'youtube' || v === 'synth' || v === 'silent' ? v : null;
  }

  /**
   * After ENTER: local file -> remembered choice -> chooser. Resolves once a source is active.
   */
  async resolve(): Promise<void> {
    const app = this.ui.app;
    // a file dropped on the landing page already chose the source
    if (app.sources.kind !== 'silent') {
      this.afterSwitch(app.sources.kind);
      return;
    }
    const rem = this.remembered;
    const usable = (rem === 'youtube' && !IS_ARTIFACT) || rem === 'synth' || rem === 'silent';
    // immediate feedback while the audio file is looked for: the chooser (options wait for the
    // search) or, for a remembered choice, a small status card
    const chooser = usable ? null : this.openChooser(true, true);
    if (usable) this.openSearching();
    let found = false;
    try {
      found = await app.sources.autoDetect();
    } catch (e) {
      console.warn('[ui] audio auto-detect failed', e);
    }
    this.ui.layers.close('searching', true);
    if (found) {
      this.afterSwitch('file');
      this.ui.toast('Endshow audio found — perfectly synced', 2800, 'music');
      return;
    }
    if (usable) {
      const ok = await this.use(rem, undefined, true);
      if (ok) return;
      await this.openChooser(true);
      return;
    }
    this.setDetecting(false);
    await chooser;
  }

  /** small modal while the Endshow audio file is looked for (remembered source) */
  private openSearching() {
    const card = h(
      'div',
      { class: 'card glass strong rule-top searching', 'aria-label': 'Preparing the audio' },
      h('div', { class: 'search-row' }, h('span', { class: 'spinner' }), h('span', null, h('b', null, 'Looking for the Endshow audio…'), h('small', null, 'Checking this page for a local copy of the official audio'))),
    );
    this.ui.layers.open('searching', card, { kind: 'modal', dismissible: false });
  }

  private chooserCard: HTMLElement | null = null;

  private setDetecting(on: boolean) {
    const card = this.chooserCard;
    if (!card) return;
    card.classList.toggle('detecting', on);
    card.querySelectorAll<HTMLButtonElement>('.option').forEach((b) => (b.disabled = on));
    if (!on) card.querySelector('.search-row')?.remove();
  }

  /** the source chooser card (initial = shown right after entering; must pick one) */
  openChooser(initial: boolean, detecting = false): Promise<void> {
    const ui = this.ui;
    return new Promise<void>((resolve) => {
      this.chooserResolve = resolve;
      const option = (kind: SourceKind, ico: string, title: string, sub: string, tag?: string, rec = false) => {
        const b = h('button', { class: 'option', type: 'button', 'data-kind': kind }, h('span', { class: 'oi', html: icon(ico) }), h('span', { class: 'ot' }, h('b', null, title), h('span', null, sub)), tag ? h('span', { class: `tag ${rec ? 'rec' : ''}` }, tag) : h('span'));
        b.addEventListener('click', async () => {
          if (this.busy || b.disabled) return;
          if (kind === 'file') {
            this.pickFile();
            return;
          }
          b.classList.add('busy');
          const oi = b.querySelector('.oi')!;
          const prev = oi.innerHTML;
          oi.innerHTML = '<span class="spinner"></span>';
          const ok = await this.use(kind);
          b.classList.remove('busy');
          oi.innerHTML = prev;
          if (ok) this.finishChooser();
        });
        return b;
      };
      const rem = this.remembered;
      const card = h(
        'div',
        { class: 'card glass strong rule-top chooser', 'aria-label': 'Choose the audio source' },
        h('div', { class: 'kicker' }, initial ? 'Before you enter' : 'Audio source'),
        h('h3', null, 'How do you want to hear the Endshow?'),
        h('p', { class: 'intro' }, 'The whole show is synchronised to the music. Pick a source — you can switch any time from the top bar.'),
        detecting ? h('div', { class: 'search-row' }, h('span', { class: 'spinner' }), h('span', null, h('b', null, 'Looking for the Endshow audio…'), h('small', null, 'A local copy of the official audio is used automatically'))) : null,
        h(
          'div',
          { class: 'options' },
          option('file', 'upload', 'Load the Endshow audio file', 'Your copy of the official Endshow audio (MP3, M4A, WAV…). Or drop it anywhere on this page.', rem === 'file' ? 'Last used' : 'Best', true),
          ...(IS_ARTIFACT ? [] : [option('youtube', 'broadcast', 'Play with the official video', 'Official broadcast as synced picture-in-picture — doubles as a live accuracy reference.', 'Online')]),
          option('synth', 'synth', 'Rehearsal track (synthesized)', 'A generated track that follows the show’s tempo map. Works offline.', 'Offline'),
          option('silent', 'mute', 'Silent', 'Visual show only, driven by a silent clock.'),
        ),
        h('p', { class: 'note', html: `${icon('info')}<span>No music is bundled with this fan tribute — copyrighted audio is never redistributed.</span>` }),
      );
      this.chooserCard = card;
      if (detecting) this.setDetecting(true);
      ui.layers.open('chooser', card, { kind: 'modal', dismissible: !initial, onClose: () => this.finishChooser(true) });
    });
  }

  private finishChooser(fromClose = false) {
    const r = this.chooserResolve;
    this.chooserResolve = null;
    this.chooserCard = null;
    if (!fromClose && this.ui.layers.isOpen('chooser')) this.ui.layers.close('chooser', true);
    r?.();
  }

  pickFile(): void {
    this.fileInput.click();
  }

  /** switch the music source; returns true on success */
  async use(kind: SourceKind, file?: File, quiet = false): Promise<boolean> {
    const ui = this.ui;
    const app = ui.app;
    if (this.busy) return false;
    this.busy = true;
    try {
      app.audio.ensure();
      if (kind === 'file') {
        if (!file) return false;
        if (!isAudio(file)) {
          ui.toast(`“${file.name}” is not an audio file`, 3200, 'warning');
          return false;
        }
        await app.sources.useFile(file);
        ui.toast(`Playing your file: ${file.name}`, 2600, 'music');
      } else if (kind === 'youtube') {
        ui.pip.show();
        try {
          await app.sources.useYouTube(ui.pip.video);
        } catch (e) {
          ui.pip.hide();
          ui.pip.video.innerHTML = '';
          throw e;
        }
        if (!quiet) ui.toast('Official broadcast connected — the show follows the video', 3000, 'broadcast');
      } else if (kind === 'synth') {
        await app.sources.useSynth();
        if (!quiet) ui.toast('Rehearsal track: synthesized, follows the tempo map', 2600, 'synth');
      } else {
        if (app.clock.track.kind !== 'silent') await app.setAudioTrack(new SilentTrack(app.show.duration));
        app.sources.kind = 'silent';
        app.sources.label = 'No audio (silent clock)';
      }
      this.afterSwitch(kind);
      store.set(KEY, kind);
      return true;
    } catch (e) {
      console.warn('[ui] audio source failed', e);
      const what = kind === 'youtube' ? 'The official video could not be loaded (offline or blocked).' : kind === 'file' ? 'This file could not be played.' : 'The audio source failed.';
      ui.toast(`${what} Try another source.`, 4200, 'warning');
      return false;
    } finally {
      this.busy = false;
    }
  }

  /** sync UI state with the active source */
  afterSwitch(kind: SourceKind): void {
    const ui = this.ui;
    if (kind !== 'youtube' && ui.app.clock.track.kind !== 'youtube') {
      ui.pip.hide();
    }
    ui.applyVolume();
    ui.refreshSource();
    if (this.chooserResolve && kind === 'file') this.finishChooser();
  }

  private hasFiles(e: DragEvent) {
    return !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
  }

  private onDragEnter = (e: DragEvent) => {
    if (!this.hasFiles(e)) return;
    e.preventDefault();
    this.dragDepth++;
    this.drop.classList.add('show');
    document.querySelectorAll('.option[data-kind="file"]').forEach((o) => o.classList.add('drag'));
  };
  private onDragOver = (e: DragEvent) => {
    if (!this.hasFiles(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };
  private onDragLeave = (e: DragEvent) => {
    if (!this.hasFiles(e)) return;
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.hideDrop();
  };
  private onDrop = (e: DragEvent) => {
    if (!this.hasFiles(e)) return;
    e.preventDefault();
    this.dragDepth = 0;
    this.hideDrop();
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    if (!this.ui.app.ready) {
      this.ui.toast('Still loading — drop the file again in a moment', 2600, 'info');
      return;
    }
    void this.use('file', f);
  };
  private hideDrop() {
    this.drop.classList.remove('show');
    document.querySelectorAll('.option.drag').forEach((o) => o.classList.remove('drag'));
  }
}

function isAudio(f: File): boolean {
  return f.type.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm|weba)$/i.test(f.name);
}
