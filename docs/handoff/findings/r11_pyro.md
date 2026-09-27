# Round 11 — pyro: finale fountains, arm columns, waterfall, CO2 clouds, capital-flame light

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-11 baseline 69.3 % raw / 53.5 % calibrated (colour 70.3, light 82.2, shape 57.1),
per moment in `research/video-timeline/data/similarity-mac-r11.json`. The requests come from the round-10 video-match
agents (all 11 spans, exact frames; their notes are research/video-timeline/NN.md — read the parts that concern you).

HOW THIS ROUND WORKS: you build ENGINE support in your files only. You do NOT edit the show file. For every new param
or behaviour, write the cue changes that use it into `$ENDSHOW_DATA/work/r11_pyro/cue_patch.json` as
`{"edits":[{"match":{"t":<exact t>,"sys":"..","fx":".."},"set":{"p.<param>":<value>, "dur":..},"why":"..","measured":".."}],
"adds":[{<full cue>,"why":"..","measured":".."}],"removes":[{"t":..,"sys":"..","fx":"..","why":".."}]}` — test each
in the page first (patch the cue list in-page via __app.show, recompile, render with vcompare/similarity) and record the
measured effect; a show agent applies the patches of all groups after the merge. Default behaviour of existing cues
must not change unless it measurably improves the 64 moments. In parallel a features workflow edits
src/camera/CameraRig.ts, src/player/**, src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts,
src/core/App.ts, Input.ts, types.ts, EventBus.ts, target.ts, src/world/landmarks.ts, site.ts, Terrain.ts,
structures.ts, Grounds.ts, src/intoxication/**, src/bar/**: never edit those.

- Finale fountains are far smaller and dimmer than filmed from the fitted drone poses (roof fan 1510.434, arm cakes
  1515.273 / 1520.886 / 1521.854, U wall 1522.628; v1515.32 pose (0.9, 92.8, 232.8), 24° down, vfov 53; v1521-1535
  (1.3,101,231) → (4.9,71,265)); the arm fountains in the eruption (v1565.4-1568.8) should lean outwards and read as tall
  orange-white columns along the whole arm; allow a much brighter site-wide fire light for v1565.4-1566.3 (video corners
  ~120/7/3, ours ~70/16/13 even with atmos.glow 2 + flood 2).
- waterfall: `density` / `height` params (gold glitter curtain v1092.3-1094.5, dense columns from above the frame).
- jet: `cloud: true` with `size` and `drift` (v767.25-768.0: one cloud from the deck centre growing to ~1/3 of the frame,
  drifting up-right); a start height / offset for the piano rig (v932.5-936.7).
- Lantern-capital flames (pillars_top) should light the smoke and the pillars around them (v275.84 … 289.68: frame fire
  up to 23 %, luma +0.1-0.18 for 0.15-0.4 s).
- gerb `colors` / `changes`: `changes` takes n−1 switch times; fix or clarify the docs example (a leading 0 switches at once).

## Verify / stop
Touched moments + holdouts (in-page patches for cue-dependent features), then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r11_pyro_64"`) with the committed code: never lower the 64-moment calibrated score (noise
~1 point). tsc, no console errors, deterministic, no per-frame allocations, mobile budget PASS
(`node scripts/budget-check.mjs --base http://localhost:<port>/`). Document new params in your docs/show-format-ext file
and, if the validator must know them, list them in contractRequests (scripts/validate-show.mjs is the orchestrator's).

Files you own: src/pyro/**, src/fx/core/placement.ts, src/fx/core/FxLights.ts, docs/show-format-ext/pyro.md.
NOT: everything else (other groups and the features workflow run in parallel); never the show file.
