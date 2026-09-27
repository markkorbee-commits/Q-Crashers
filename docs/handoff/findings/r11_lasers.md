# Round 11 — lasers: bounded sheets, readable trees, cone glow at distance, dense webs, sequenced looks

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-11 baseline 69.3 % raw / 53.5 % calibrated (colour 70.3, light 82.2, shape 57.1),
per moment in `research/video-timeline/data/similarity-mac-r11.json`. The requests come from the round-10 video-match
agents (all 11 spans, exact frames; their notes are research/video-timeline/NN.md — read the parts that concern you).

HOW THIS ROUND WORKS: you build ENGINE support in your files only. You do NOT edit the show file. For every new param
or behaviour, write the cue changes that use it into `$ENDSHOW_DATA/work/r11_lasers/cue_patch.json` as
`{"edits":[{"match":{"t":<exact t>,"sys":"..","fx":".."},"set":{"p.<param>":<value>, "dur":..},"why":"..","measured":".."}],
"adds":[{<full cue>,"why":"..","measured":".."}],"removes":[{"t":..,"sys":"..","fx":"..","why":".."}]}` — test each
in the page first (patch the cue list in-page via __app.show, recompile, render with vcompare/similarity) and record the
measured effect; a show agent applies the patches of all groups after the merge. Default behaviour of existing cues
must not change unless it measurably improves the 64 moments. In parallel a features workflow edits
src/camera/CameraRig.ts, src/player/**, src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts,
src/core/App.ts, Input.ts, types.ts, EventBus.ts, target.ts, src/world/landmarks.ts, site.ts, Terrain.ts,
structures.ts, Grounds.ts, src/intoxication/**, src/bar/**: never edit those.

- A bounded or thin 'sheet' (band width / extent) so a sheet at lens height reads as the filmed eye-level line
  (v1470-1471.3) and the liquid sky can be a few patches inside a web (v1505.6-1507).
- `trees` tents that read from the terrace (~170 m): brighter/thicker scan or a `scale` param (v1052-1053.9 blue, v1056
  violet, v1058.5-1059.6 green, v1061.3-1063.2 cyan).
- Cone aperture glow that scales with distance or a size param (the lantern starburst v1383-1395: violet halo ~0.3 of
  the frame width; ours a 7 m sprite).
- A denser low 'web' figure that fills a telephoto frame (v1269.2-1271.2, v1258.3-1259, v1264.3-1265).
- A sequenced look (preset list with per-step times) for the 4 Hz figure flicker v1056-1057.8 (calm-limited).
- Laser sheets and fans should light the low cloud deck (v206.7-218.5 green/cyan clouds); a flat triangular fan unit
  at pillar-base height on the outer side sections (v317.3-320.8); field-level fan/burst units along the whole front
  (x ≈ −85..85, y 1-4) for the sunburst fans v810.24-810.9 (round 9 added front_line / ramparts: check and extend).
- The laser low-haze layer ramps up over 6 s / releases over 3 s after fog.lowfog: a per-cue ramp param (v1370.9-1380.1).

## Verify / stop
Touched moments + holdouts (in-page patches for cue-dependent features), then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r11_lasers_64"`) with the committed code: never lower the 64-moment calibrated score (noise
~1 point). tsc, no console errors, deterministic, no per-frame allocations, mobile budget PASS
(`node scripts/budget-check.mjs --base http://localhost:<port>/`). Document new params in your docs/show-format-ext file
and, if the validator must know them, list them in contractRequests (scripts/validate-show.mjs is the orchestrator's).

Files you own: src/lasers/**, docs/show-format-ext/lasers.md.
NOT: everything else (other groups and the features workflow run in parallel); never the show file.
