/**
 * The local data directory contract (see HANDOFF.md / CLAUDE.md): everything copyrighted or bulky that the
 * video tools need lives OUTSIDE the repository, in $ENDSHOW_DATA (default: ../endshow-data next to the repo):
 *   video/endshow.mp4   the official video (never committed)
 *   f4/NNNNN.jpg        4 fps 480x270 frames, index = round(video_seconds * 4)
 *   features.npz        25 fps per-frame features (scripts/video-features.py)
 *   cuts.json           camera cut list (video s); a copy is committed in research/video-timeline/data/
 *   signals/NN.txt      per-span signal tables; copies committed in research/video-timeline/data/signals/
 *   spans/NN.json       per-span cue files for the span workflow (tools/video/split.py / merge.py)
 *   work/               renders, sheets, merged candidate shows, similarity runs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function dataDir() {
  return path.resolve(process.env.ENDSHOW_DATA || path.join(repoRoot, '..', 'endshow-data'));
}

/** A path inside the data dir (not created). */
export function dataPath(...parts) {
  return path.join(dataDir(), ...parts);
}

/** A work sub-directory inside the data dir (created). */
export function workDir(...parts) {
  const p = dataPath('work', ...parts);
  fs.mkdirSync(p, { recursive: true });
  return p;
}
