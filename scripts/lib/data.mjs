/**
 * The local data directory contract (see HANDOFF.md / CLAUDE.md): everything copyrighted or bulky that the
 * video tools need lives OUTSIDE the repository, in $ENDSHOW_DATA (default: endshow-data next to the MAIN checkout):
 *   video/endshow.mp4   the official video (never committed)
 *   f4/NNNNN.jpg        4 fps 480x270 frames, index = round(video_seconds * 4)
 *   features.npz        25 fps per-frame features (scripts/video-features.py)
 *   cuts.json           camera cut list (video s); a copy is committed in research/video-timeline/data/
 *   signals/NN.txt      per-span signal tables; copies committed in research/video-timeline/data/signals/
 *   spans/NN.json       per-span cue files for the span workflow (tools/video/split.py / merge.py)
 *   work/               renders, sheets, merged candidate shows, similarity runs
 *   venv/               Python with numpy + Pillow (python() below picks it up)
 * Default when ENDSHOW_DATA is unset: <main checkout>/../endshow-data. Inside a git worktree (e.g. the fixers'
 * <repo>/.claude/worktrees/<name>) the main checkout is found through `git rev-parse --git-common-dir`, so every
 * worktree shares the one data dir instead of inventing <repo>/.claude/worktrees/endshow-data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let mainRoot = null;
/** The main checkout (== repoRoot unless this copy is a git worktree). */
export function mainCheckout() {
  if (mainRoot) return mainRoot;
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    if (common && path.basename(common) === '.git') mainRoot = path.dirname(common);
  } catch {
    /* no git, or a git without --path-format: fall back to the path layout */
  }
  if (!mainRoot) {
    const m = repoRoot.match(/^(.*?)[\\/]\.claude[\\/]worktrees[\\/]/);
    mainRoot = m ? m[1] : repoRoot;
  }
  return mainRoot;
}

export function dataDir() {
  return path.resolve(process.env.ENDSHOW_DATA || path.join(mainCheckout(), '..', 'endshow-data'));
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

/** Python with numpy + Pillow: env PYTHON, else $ENDSHOW_DATA/venv/bin/python, else python3. */
export function python() {
  if (process.env.PYTHON) return process.env.PYTHON;
  const venv = dataPath('venv', 'bin', 'python');
  return fs.existsSync(venv) ? venv : 'python3';
}

/**
 * Stop a CLI tool (exit 1, before any rendering) when the video frames are not where it expects them, instead of
 * rendering black video halves. `refs` = the frame files the run will read; with allowMissing it only warns.
 */
export function checkFrames(framesDir, refs = [], { allowMissing = false } = {}) {
  const how =
    `  ENDSHOW_DATA=${process.env.ENDSHOW_DATA ? process.env.ENDSHOW_DATA : '(unset -> ' + dataDir() + ')'}\n` +
    '  set ENDSHOW_DATA (echo $ENDSHOW_DATA), pass --frames, or build the frames with tools/video/prepare-data.sh';
  if (!fs.existsSync(framesDir)) {
    console.error(`ERROR: video frames dir not found: ${framesDir}\n${how}`);
    process.exit(1);
  }
  const missing = refs.filter((p) => !fs.existsSync(p));
  if (missing.length) {
    const msg = `${missing.length} of ${refs.length} video frames missing (first: ${missing[0]})`;
    if (!allowMissing) {
      console.error(`ERROR: ${msg}\n${how}\n  (--allow-missing renders anyway)`);
      process.exit(1);
    }
    console.error(`WARNING: ${msg}`);
  }
  return missing;
}
