# CLAUDE.md — Defqon.1 2026 · The Endshow Experience

Guidance for Claude sessions working in this repository. The user-facing, step-by-step setup (Dutch) is
`HANDOFF.md`; its sections "Stand van zaken" and "Open punten" are the current state and the prioritised backlog.

## What this is

A real-time 3D reconstruction (Three.js r186 / WebGL2 / TypeScript strict / Vite) of the Defqon.1 2026 Endshow:
the 26:21 show performed on the empty Holy Grounds on Saturday 27 June 2026 after the heat cancellation, published
on YouTube (`fLWY-Sxb1bE`, 1581 s). The goal: fireworks, lights, lasers, pyro, stage LEDs and the Show camera match
the official video exactly, checked side by side, and run in sync with the audio. The show is a deterministic cue
list locked to the audio: `public/show/endshow-2026.json`.

## Where things are

| Path | What |
|---|---|
| `src/core/` | App, loop, LightEnv bus, Quality presets, Anchors (cue targets), precompile |
| `src/show/` | ShowEngine (compiles cues), ShowClock, TempoMap, ShowTypes, named colours |
| `src/camera/` | CameraRig, ShowDirector (Show camera = `camera.shot` cues), FlyoverPath |
| `src/stage/` | MainStage: castle, dragon, wings, deck, booth/vault/podium (walkable), LED looks, DevDaylight |
| `src/lighting/`, `src/lasers/`, `src/pyro/`, `src/fireworks/`, `src/fx/` | show systems (beams, lasers, flames, shells, fog/haze) |
| `src/world/` | terrain, grounds, pillars, props, world lights, stage walk |
| `src/crowd/`, `src/player/`, `src/ui/`, `src/postfx/`, `src/audio/`, `src/bar/`, `src/intoxication/`, `src/mobile/` | the rest of the app |
| `public/show/endshow-2026.json` | the show: sections, tempo grid, palettes, moments, ~1,900 cues |
| `public/show/audio-map.json` | measured music: tempo segments, events, onsets of the free-tempo parts |
| `docs/show-format.md` + `docs/show-format-ext/*.md` | the cue contract (the validator reads these files) |
| `docs/performance.md` | loading pipeline, budgets (desktop ≤ 150 draw calls / 3 M tris; mobile ≤ 110 / 0.8 M) |
| `research/` | design bible, stage/terrain/show/music analyses; `research/video-timeline/NN.md` = observed video timeline per span; `research/video-timeline/data/` = derived numbers (cuts, signals, similarity baseline) |
| `scripts/` | validators, sync check, render/measure harnesses (`scripts/lib/browser.mjs` launches Chrome) |
| `tools/video/` | video-data pipeline and side-by-side tools (see below) |
| `tools/workflows/` | Workflow scripts: `video-match.js`, `qa-judge.js`, `qa-fix.js` (all paths via args; see "Running the workflows") |
| `tools/setup/claude-env.mjs` | writes `ENDSHOW_DATA` + `PYTHON` into the git-ignored `.claude/settings.local.json` |
| `tools/handoff/` | `export-wip.sh` (round status + WIP patches into `docs/handoff/wip/`), `verify-pushed.sh` |
| `docs/handoff/findings/` | latest findings briefs (round 4) and open cue/engine gaps (`r2_show_contract.txt`) |
| `docs/handoff/wip/` | `STATUS.md`: per fixer group of the last cloud round merged (commit) or a WIP patch series to finish |

Paths from the cloud session in older notes: `<cloud-scratchpad>` = the scratchpad of the cloud session (reference
images, permits; not transferred). In `research/video-timeline/NN.md` and `docs/show-format-ext/*.md`,
`scratchpad/vid/X` or `vid/X` = `$ENDSHOW_DATA/X` (e.g. `vid/f4` = `$ENDSHOW_DATA/f4`, `vid/signals/05.txt` =
`$ENDSHOW_DATA/signals/05.txt`) and `scratchpad/video/endshow.mp4` = `$ENDSHOW_DATA/video/endshow.mp4`. Scripts named
there such as `gen*.py`, `pose*.py` or `fw2/mkcand.mjs` were one-off cloud scripts and were not transferred (not
needed; PyAV is not installed either: decode with ffmpeg as `scripts/video-features.py` does).

## Environment (check first in every session)

- `echo $ENDSHOW_DATA $PYTHON` must print the data dir and `<data dir>/venv/bin/python`. Both come from the git-ignored
  `.claude/settings.local.json` (`node tools/setup/claude-env.mjs`, then restart Claude Code), so they reach the
  desktop app and every subagent, including fixers in git worktrees. If they are empty, the tools fall back to
  `endshow-data` next to the MAIN checkout (also from a worktree) and to `$ENDSHOW_DATA/venv/bin/python`, but set them.
- Shell state does not persist between Bash calls: `source .../activate` or `export X=...` in one call is gone in the
  next. Never rely on it; prefix a command instead (`ENDSHOW_DATA=... PYTHON=... node ...`) when you need other values.
- Python: the Node tools run `$PYTHON` (else the venv, else `python3`); `tools/video/*.py` re-run themselves with the
  venv Python when the current one lacks numpy/Pillow, so `python3 tools/video/sheet.py ...` works from any shell.
  Other numpy scripts (`scripts/similarity-score.py`, `scripts/video-features.py`, `scripts/audio-onsets.py`): run them
  with `"$PYTHON"`. `scripts/check-sync.py`, `tools/video/split.py` and `merge.py` need only the standard library.
- Frames: `ls "$ENDSHOW_DATA/f4" | wc -l` = 6324. The tools stop with `video frames dir not found` instead of
  producing black video halves.

## Commands

```sh
npm install
npm run dev -- --strictPort                  # vite --host on http://localhost:5173 (fails instead of moving to 5174)
npx vite --port 5410 --strictPort            # extra dev server for a tool/agent (kill it by PID afterwards)
npx tsc --noEmit                             # TypeScript strict — must pass
node scripts/validate-show.mjs --quiet       # show file vs the cue contract — must print valid, 0 errors
python3 scripts/check-sync.py [show.json]    # hits vs tempo grid (steady tracks) / audio onsets (free tempo)
node scripts/similarity.mjs --port 5173 --settle 500 --min-frames 30 [--times t1,t2] [--n 64] --out "$ENDSHOW_DATA/work/sim/<name>"
node tools/video/vcompare.mjs --port 5173 --showcam --settle 600 --shots "411.5;1047.25" --out cmp.jpg   # -> $ENDSHOW_DATA/work/compare/
python3 tools/video/sheet.py sheet_415.jpg 415 430 1 4                 # contact sheet -> $ENDSHOW_DATA/work/sheets/
python3 tools/video/split.py --force                                   # spans from the CURRENT show (before a video-match run)
python3 tools/video/merge.py [--spans 3,5] --out "$ENDSHOW_DATA/work/merged.json"
node scripts/shot.mjs "autostart&t=700&camera=showcam" .shots/x.png --base http://localhost:5173/
node scripts/budget-check.mjs --base http://localhost:5173/   # mobile draw-call/triangle budget
npm run build:artifact                       # claude.ai artifact variant in dist-artifact/
```

URL params: `autostart`, `t=<s>`, `play`, `quality=ultra|high|medium|mobile`, `nogovernor`, `camera=first|third|free|flyover|showcam|photo`,
`cam=x,y,z,yaw,pitch`, `spot=<id>` (front, crowd, middle, foh, dj, dancers, bar_west, ...), `mode=filmed`, `off=<systems>`,
`nopost`, `debug`, `daylight` (dev), `analyze=0`. In the page: `window.__app` (`__app.clock.seek(t)`,
`__app.get('camera').setFreePose(x,y,z,yaw,pitch,fov)`, `__app.postfx.exposure`).

Browser for all harnesses (`scripts/lib/browser.mjs`): `CHROME_PATH`, else Google Chrome in /Applications (macOS),
else a Playwright Chromium, else /opt/pw-browsers. `RENDERER=gpu|swiftshader` overrides the automatic choice (macOS =
GPU, `--use-angle=metal`). Every run prints `[browser] WebGL renderer: ...` on stderr: on the Mac it must name the
Apple GPU. If it says SwiftShader, try `HEADED=1`. On `Protocol error` / `Target closed` with an auto-updated Google
Chrome: `npx playwright-core install chromium` and set `CHROME_PATH` to it (HANDOFF.md, troubleshooting).

## Data dir contract (`ENDSHOW_DATA`, default `endshow-data` next to the main checkout)

Nothing in it is ever committed.

| Path | Made by | What |
|---|---|---|
| `video/endshow.mp4` | the user (Google Drive) | the official video, 1920x1080, 25 fps, 1581.19 s |
| `f4/NNNNN.jpg` | `tools/video/extract-frames.sh` | 4 fps 480x270 frames; **index = round(video_s × 4)**, 00000 = 0.00 s, 6324 frames |
| `features.npz` | `scripts/video-features.py` in parallel chunks + `tools/video/combine.py` | 25 fps per-frame luma/grid/dark/white/fire/hue/hdist |
| `cuts.json`, `signals/NN.txt` | `tools/video/signals.py`, checked by `tools/video/check-derived.py` | cut list + per-0.5 s signal tables; always equal to the committed reference in `research/video-timeline/data/` (on a small drift the reference is installed and the local numbers are kept as `cuts.local.json`, `signals.local/`) |
| `spans/NN.json`, `spans/index.json`, `spans/source.json` | `tools/video/split.py` (never overwrites without `--force`) | per-span cue files for the span workflow + provenance (show sha256 at split time); `tools/video/merge.py` merges + validates and refuses stale spans |
| `refs/` | the user (optional) | own photos, e.g. `refs/day/day2_axis.jpg` (daytime stage photos) |
| `work/` | all tools | sheets, compare sheets, similarity runs, merged candidate shows, logs |
| `venv/` | the user | Python venv with numpy + Pillow |

`tools/video/prepare-data.sh` builds everything from the video (frames, features, spans, cuts, signals) and checks
cuts/signals against the committed copies (exit 3 = a different video); `--ss 400 --dur 30` is a 10 s smoke test.
Contact sheets: `python3 tools/video/sheet.py <name>.jpg <t0> <t1> <step> [cols]`.

## Working method that proved itself

1. **Per-span video matching** (`tools/workflows/video-match.js`): the show is split into 11 spans (`split.py`);
   one agent per span watches its span in contact sheets at 1 fps, zooms to 0.25 s frames around every event, reads
   the signal table (cuts, flashes, fire/white %), renders our show next to the video (`vcompare.mjs`), rewrites the
   span's cues and camera shots, validates via `merge.py --spans NN`, and writes `research/video-timeline/NN.md`. The
   camera order follows the official edit: one `camera.shot` per video cut. ALWAYS re-split right before a new run
   (`python3 tools/video/split.py --force`) unless you resume that same run: spans split from an older show file
   would revert every cue edited in the show since (merge.py refuses that with `STALE SPANS`). Apply the result
   with `python3 tools/video/merge.py --spans <the spans of the run>` and copy it onto the show file.
2. **Fixers per module group** (`tools/workflows/qa-fix.js`): each fixer works in its own git worktree on a disjoint
   set of files, fed with a findings file `docs/handoff/findings/r<round>_<group>.md` (what is wrong, evidence with
   video times, measurements, owned / not-owned files: write a "Files you own" line). Merge the branches afterwards
   (see "Git"). Judges (`tools/workflows/qa-judge.js`) produce findings; they never edit.
3. **Objective metric after every round**: `scripts/similarity.mjs` (Show camera vs video: colour layout ΔE, luminance
   histogram, SSIM; calibrated so video-vs-another-moment = 0 %, identical = 100 %). Iterate on 8-10 worst moments or
   the 32-moment set (`research/video-timeline/data/similarity-times32.txt`), confirm on the default 64. The cloud
   baseline (SwiftShader, before round 4) is in `research/video-timeline/data/similarity-baseline.json`; re-baseline
   on the Mac GPU before comparing (HANDOFF.md step 9).
   **Stop rule** (the measurement itself varies by about 1 point): always measure with `--settle 500 --min-frames 30`.
   A change counts only if the `normalised` score on the default 64 moments improves by >= 1.0 point, or the mean of
   the 10 worst moments by >= 2 points, without a part (colour/light/shape) dropping by more than 1 point. Stop a line
   of work after two consecutive rounds without such a gain, and revert a change that makes the 64-moment score worse.
4. **Timing rules**: video time → show time = video − 0.036 s. Fireworks cue `t` = LAUNCH; the break happens after
   0.8 + 0.021 · height s, so place the cue so the break lands on the visible burst. Steady tracks: snap hits to the
   show's tempo grid (beat/half beat within 0.12 s). Free-tempo parts (Vivaldi, Discorecord intro, bridge, Domitor,
   outro): snap to the nearest `audio-map.json` onset within 0.15 s. Section starts/ends come from the audio: never move them.
5. After changing the show file: `node scripts/validate-show.mjs --quiet` (0 errors) and `python3 scripts/check-sync.py`.

## Running the workflows

The scripts in `tools/workflows/` run with the Workflow tool: `scriptPath` = the absolute path of the script, `args` =
a JSON object (a JSON string is accepted too). Every path comes from `args`; the prompts prefix every data-dir
command with `ENDSHOW_DATA=<data> PYTHON=<python>`. Examples (replace `<you>`; ports must not collide):

```text
Workflow  scriptPath: /Users/<you>/Projects/Q-Crashers/tools/workflows/qa-fix.js
          args: {"repo":"/Users/<you>/Projects/Q-Crashers","data":"/Users/<you>/Projects/endshow-data","round":5,
                 "portBase":5460,"trailers":"<the attribution lines of your session>",
                 "groups":[{"key":"stage","owned":"src/stage/**, docs/show-format-ext/stage.md, docs/show-format-ext/stage-walk.md"}]}
Workflow  scriptPath: /Users/<you>/Projects/Q-Crashers/tools/workflows/qa-judge.js
          args: {"repo":"/Users/<you>/Projects/Q-Crashers","data":"/Users/<you>/Projects/endshow-data","round":5,
                 "lenses":["accuracy","stage"],"portBase":5300}
Workflow  scriptPath: /Users/<you>/Projects/Q-Crashers/tools/workflows/video-match.js
          args: {"repo":"/Users/<you>/Projects/Q-Crashers","data":"/Users/<you>/Projects/endshow-data","spans":[3],
                 "portBase":5410}
```

qa-fix reads `docs/handoff/findings/r<round>_<key>.md` (write it first; `owned` = its "Files you own" line). The
round-4 owned sets are in `docs/handoff/findings/r4_*.md`.
Without a Workflow tool: start one subagent (Agent/Task tool) per group or span with the prompt text of the script,
with `${R}`, `${D}`, `${PY}`, `${ENV}` and the port filled in by hand. For qa-fix give each subagent its own worktree
first: `git worktree add .claude/worktrees/fix-<key> -b fix-<key>` and `ln -s "$PWD/node_modules"
.claude/worktrees/fix-<key>/node_modules`, and tell it to work only there.

## Git

- Work on `claude/defqon-endshow-experience-wi4oos` in the main checkout; fixers work on their own branches/worktrees.
- Merge each finished fixer branch with `git merge --no-ff <branch>`, then run `npx tsc --noEmit`,
  `node scripts/validate-show.mjs --quiet` and `python3 scripts/check-sync.py` before the next merge.
- Push after every round: `git push origin claude/defqon-endshow-experience-wi4oos`. Remove merged worktrees
  (`git worktree remove <path>`) and their branches.
- Commit messages: a clear subject plus the attribution trailer lines your Claude Code session prescribes; pass the
  same lines to qa-fix as `args.trailers` so fixer commits carry them too.
- Never commit `node_modules` (fixer worktrees symlink it), `.claude/`, audio, video, frames or sheets.

## Hard rules

- Never commit or redistribute the video, its frames, the audio, or any image derived from them (sheets, compare
  renders with video frames). They live in `$ENDSHOW_DATA` or in git-ignored folders only.
- DJ gear is CDJ-style without real brand logos. There is no DJ figure in the Endshow (empty booth).
- Communicate with the user in Dutch, business-like. Give times in Dutch local time (CEST).
- Show visuals are a pure function of show time: seek/pause/restart give the same image; no wall-clock randomness.
- TypeScript strict; no per-frame allocations in hot paths; no console errors.
- Honour the quality presets: mobile stays light (draw-call budget 110, `scripts/budget-check.mjs`).
- No model identifiers anywhere in the repo.
- Parallel agents: own a disjoint set of files, run dev servers on distinct ports, kill them by PID (never `pkill -f vite`).
