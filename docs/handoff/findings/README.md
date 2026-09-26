# Findings files

Input for `tools/workflows/qa-fix.js`: the fixer of module group `<key>` in round `<n>` reads `r<n>_<key>.md` from
this folder (`args.findingsDir`, default `docs/handoff/findings`).

| File | What |
|---|---|
| `r4_lightbalance.md` | round 4: field light balance vs the video (field 3-30x too bright) + pale concrete paving |
| `r4_pillars.md` | round 4: lantern pillars, fences and the FOH/camera pen from the user's daytime photos; mobile prop culling |
| `r4_stage.md` | round 4: castle facade too bright, LED set vs video, mobile draw calls of the MainStage |
| `r2_show_contract.txt` | open cue/engine gaps reported after round 2 (see HANDOFF.md, "Open punten" item 8) |

Round 4 status at the handoff (per group: merged with its merge commit, or a WIP patch series to finish):
`docs/handoff/wip/STATUS.md`. The owned file sets of round 4 are in each brief ("Files you own"); pass the same set as
`owned` when you re-run a group with `tools/workflows/qa-fix.js` (CLAUDE.md, "Running the workflows").

## Writing a findings file

One file per module group, plain Markdown, no images (the video and anything derived from it stays in
`$ENDSHOW_DATA`). Give: the goal, the measured gap (similarity numbers, per-moment values, video times), evidence as
video times plus commands that regenerate the sheets (`tools/video/vcompare.mjs`, `tools/video/sheet.py`), likely
sources in the code, concrete tasks, how to verify (moments to re-measure, stop criterion), and the files the group
owns and must NOT touch (the fixers run in parallel). Paths into the data dir are written as `$ENDSHOW_DATA/...`.
