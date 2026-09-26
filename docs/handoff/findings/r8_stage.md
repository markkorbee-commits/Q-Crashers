# Round 8 — stage: wing membranes under masks, castle base at 509.25, wing-edge anchors, chroma

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-8 baseline 67.1 % raw / 50.2 % calibrated (colour 67.9, light 80.5, shape 54.8),
per moment in `research/video-timeline/data/similarity-mac-r8.json`.

## 1. Wing membranes under mask 'wings' / 'crown' without wash (major)
At 1320.7 and 1322.5 the membranes read orange from the print texture; the video shows dark red membranes with red /
pink strokes. The print should take the mask/crown colour (crownColor #FF2040/#FF2030 is set by the show group) and stay
dark without a wash.

## 2. Castle base at 509.25 (major)
castle 1.6 floods the castle base stone grey-white; the video's base is blue windows on a purple-blue base. Make the
castle flood take the wash/haze colour (violet flood 508.3-511 from the show) and keep the stone darker; windows blue.

## 3. Wing-edge anchor for the burning wings
The pyro group moves the wing fire onto the wing surface this round. Provide an anchor set along the membrane
scallops between the finger tips (~2 m apart; attach at 93 % of each finger, sag 3.8 / 5.4 / 3.4 m below the chord for
outer / middle / inner panel), e.g. `wing_edge`, registered like `wing_spars`; document it in stage.md.

## 4. Stage-colour chroma deficit (check)
Across the 64 moments our stage rows are on average 7 chroma units less saturated than the video at the same
luminance (round 7). Stage calibration knobs each moved ≤ 0.1 point; check the LED emitters' saturation path (tone map
crosstalk / desaturation of bright emitters) in src/stage only: if the loss happens in the tone map (postfx, not
yours), write it as a contract request with numbers.

## Verify / stop
Per iteration: `--times 1320.75,1322.25,509.25,289.25,338,20.25,167,998.25,1047.25,101` then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r8_stage_64"`); never lower the 64-moment calibrated score. Mobile budget PASS;
walkable stage OK.
Files you own: src/stage/** EXCEPT src/stage/look/LookResolver.ts, src/stage/DragonCrown.ts and
src/stage/materials/LedMaterial.ts (the flash feature group edits those this round: coordinate via contractRequests),
docs/show-format-ext/stage.md, docs/show-format-ext/stage-walk.md.
NOT: everything else.
