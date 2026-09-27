# Round 11b — apply the engine groups' cue patches to the show

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): baseline 69.3 % raw / 53.5 % calibrated (colour 70.3, light 82.2, shape 57.1), per moment
in `research/video-timeline/data/similarity-mac-r11.json` (the round-11 engine code is merged and neutral by itself).

## Task
Eight engine groups built new params/fx in round 11 (docs: docs/show-format-ext/*.md "Round 11" sections) and wrote
the cue changes that use them, each measured in the page, into:
`$ENDSHOW_DATA/work/r11_{stage,fireworks,pyro,lights,lasers,fx,camera,env}/cue_patch.json`
(format: `{"edits":[{"match":{"t","sys","fx"},"set":{"p.<param>":v,"dur":..},"why","measured"}],"adds":[...],"removes":[...]}`;
a reference applier is at `$ENDSHOW_DATA/work/r11_stage/apply_patch.py`). Counts: camera 17/1/5, env 1/4/0,
fireworks 21/0/0, fx 2/1/0, lasers 8/6/3, lights 7/9/2, pyro 9/1/0, stage 15/5/0 (edits/adds/removes).
1. Apply the patches group by group onto public/show/endshow-2026.json (match tolerance 2 ms; report entries that do
   not match any cue and why). Where two groups touch the same cue, merge the params when they are independent, else
   keep the better-measured one.
2. After each group: `node scripts/validate-show.mjs --quiet` (0 errors; if the validator does not know a new param,
   add it to scripts/validate-show.mjs from the group's docs), `python3 scripts/check-sync.py` (steady-track hits must
   stay on the grid), and measure that group's touched moments (from the patch's `measured` notes) plus the default 64.
   Drop entries (or a whole group) that lower the 64-moment calibrated score or visibly contradict the video.
3. Final: the default 64 (`--out "$ENDSHOW_DATA/work/sim/r11b_64"`) must not be below 53.5 calibrated; mobile budget
   PASS (`node scripts/budget-check.mjs`), and the expanded-cue count warning (4068 > 4000) must not grow much.
Keep the one-cue-per-line format (the compact writer in tools/video/merge.py / tools/video/merge-show-cues.py).
Write what you applied / dropped, with numbers, in research/video-timeline/sync-r11.md.

Files you own: public/show/endshow-2026.json, scripts/validate-show.mjs, scripts/check-sync.py,
research/video-timeline/sync-r11.md. NOT: any src/** (a features workflow edits src/ui, src/player, src/audio,
src/camera/CameraRig.ts and more in parallel).
