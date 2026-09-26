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
| `tools/workflows/` | Workflow scripts: `video-match.js`, `qa-judge.js`, `qa-fix.js` (all paths via args) |
| `docs/handoff/findings/` | latest findings briefs (round 4) and open cue/engine gaps (`r2_show_contract.txt`) |

`<cloud-scratchpad>` in older research notes = the scratchpad of the cloud session that built the project
(reference images, permits); it was not transferred.

## Commands

```sh
npm install
npm run dev                                  # vite --host, http://localhost:5173
npx vite --port 5410 --strictPort            # extra dev server for a tool/agent (kill it by PID afterwards)
npx tsc --noEmit                             # TypeScript strict — must pass
node scripts/validate-show.mjs --quiet       # show file vs the cue contract — must print valid, 0 errors
python3 scripts/check-sync.py [show.json]    # hits vs tempo grid (steady tracks) / audio onsets (free tempo)
node scripts/similarity.mjs --port 5173 --settle 500 --min-frames 30 [--times t1,t2] [--n 64] --out "$ENDSHOW_DATA/work/sim/<name>"
node tools/video/vcompare.mjs --port 5173 --showcam --settle 600 --shots "411.5;1047.25" --out cmp.jpg
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
GPU). Every run prints `[browser] WebGL renderer: ...` on stderr: on the Mac it must name the Apple GPU. If it says
SwiftShader, try `HEADED=1` or `CHROME_ARGS="--use-angle=metal"`. Python tools need numpy + Pillow: use
`$ENDSHOW_DATA/venv` (`source "$ENDSHOW_DATA/venv/bin/activate"`, or `PYTHON=$ENDSHOW_DATA/venv/bin/python`).

## Data dir contract (`ENDSHOW_DATA`, default `../endshow-data` next to the repo)

Nothing in it is ever committed.

| Path | Made by | What |
|---|---|---|
| `video/endshow.mp4` | the user (Google Drive) | the official video, 1920x1080, 25 fps, 1581.19 s |
| `f4/NNNNN.jpg` | `tools/video/extract-frames.sh` | 4 fps 480x270 frames; **index = round(video_s × 4)**, 00000 = 0.00 s, 6324 frames |
| `features.npz` | `scripts/video-features.py` in parallel chunks + `tools/video/combine.py` | 25 fps per-frame luma/grid/dark/white/fire/hue/hdist |
| `cuts.json`, `signals/NN.txt` | `tools/video/signals.py` | cut list + per-0.5 s signal tables (identical copies in `research/video-timeline/data/`) |
| `spans/NN.json`, `spans/index.json` | `tools/video/split.py` (never overwrites without `--force`) | per-span cue files for the span workflow; `tools/video/merge.py` merges + validates |
| `refs/` | the user (optional) | own photos, e.g. `refs/day/day2_axis.jpg` (daytime stage photos) |
| `work/` | all tools | sheets, compare sheets, similarity runs, merged candidate shows, logs |
| `venv/` | the user | Python venv with numpy + Pillow |

`tools/video/prepare-data.sh` builds everything from the video (frames, features, spans, cuts, signals) and checks
cuts/signals against the committed copies. Contact sheets: `python3 tools/video/sheet.py <name>.jpg <t0> <t1> <step> [cols]`.

## Working method that proved itself

1. **Per-span video matching** (`tools/workflows/video-match.js`): the show is split into 11 spans (`split.py`);
   one agent per span watches its span in contact sheets at 1 fps, zooms to 0.25 s frames around every event, reads
   the signal table (cuts, flashes, fire/white %), renders our show next to the video (`vcompare.mjs`), rewrites the
   span's cues and camera shots, validates via `merge.py`, and writes `research/video-timeline/NN.md`. The camera
   order follows the official edit: one `camera.shot` per video cut.
2. **Fixers per module group** (`tools/workflows/qa-fix.js`): each fixer works in its own git worktree on a disjoint
   set of files, fed with a findings file `docs/handoff/findings/r<round>_<group>.md` (what is wrong, evidence with
   video times, measurements, owned / not-owned files). Merge the branches afterwards. Judges
   (`tools/workflows/qa-judge.js`) produce findings; they never edit.
3. **Objective metric after every round**: `scripts/similarity.mjs` (Show camera vs video: colour layout ΔE, luminance
   histogram, SSIM; calibrated so video-vs-another-moment = 0 %, identical = 100 %). Iterate on 8-10 worst moments or
   the 32-moment set (`research/video-timeline/data/similarity-times32.txt`), confirm on the default 64. Stop a line of
   work when a round brings no measurable gain. The cloud baseline (SwiftShader) is in
   `research/video-timeline/data/similarity-baseline.json`; re-baseline on the Mac GPU before comparing.
4. **Timing rules**: video time → show time = video − 0.036 s. Fireworks cue `t` = LAUNCH; the break happens after
   0.8 + 0.021 · height s, so place the cue so the break lands on the visible burst. Steady tracks: snap hits to the
   show's tempo grid (beat/half beat within 0.12 s). Free-tempo parts (Vivaldi, Discorecord intro, bridge, Domitor,
   outro): snap to the nearest `audio-map.json` onset within 0.15 s. Section starts/ends come from the audio: never move them.
5. After changing the show file: `node scripts/validate-show.mjs --quiet` (0 errors) and `python3 scripts/check-sync.py`.

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
