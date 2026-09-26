# Round 5 — next work for the local session (measured in the cloud session, 26 Sep 2026 evening)

Metric state (scripts/similarity.mjs, default 64 moments, Show camera vs video): baseline 52.0 % raw / 25.7 %
calibrated → after round-4 light balance 54.1 % / 29.0 % (colour 54.3, light 67.3, shape 42.8). Pillars/pen and a
FieldLight albedo fix were merged after that measurement; the stage round-4 was stopped half-way (see wip/).
Re-measure first on the Mac (fast GPU) to get the new baseline, then work top-down. Stop criterion per item: no
measurable gain on the metric AND no visible gain side by side.

## 1. Finish the stage round 4 (wip/stage-r4-wip.patch)
Apply on a branch (`git am docs/handoff/wip/stage-r4-wip.patch`), then continue docs/handoff/findings/r4_stage.md:
castle facade too bright (1047.25, 1438.5, 167, 998.25: lower-half luma 3-4x the video even with the world show light
removed), LED calibration against the video, mobile draw calls (budget-check.mjs: 114-126 vs 110). The WIP commits
already contain: dark castle (sky share, flash from above, narrow FOH keys, nightK), LED calibration, sunburst
rosettes, crown mix material / set mix / barrier baked / jaw LEDs in static strips (draw calls), dimmer floods/front
wash, loading sub-steps, warm FOH keys, per-zone panel colours, dark masked castle, crown flash glint only, grey
rosette rims at night, per-side isolation (state side). Unverified: measure before/after, keep what gains.

## 2. Screens render as flat, saturated panels (high visual impact in every deck close-up)
`screens.content` mode 'color' (and 'pulse') fill the castle screens left/right of the portal with one flat colour
(bright orange/pink/magenta/red rectangles behind the MC at 348, 361, 369, 447 s and behind the dancers at 725.5,
739.75 s). The video shows castle art / ornament patterns there (red ornament print at 348, stone + stairs at 447).
Render the colour modes as the castle/ornament art tinted by `color`/`color2` at a moderate level (the LED pixel grid
stays), so the screens read like the video. Check 348.25, 361, 369, 447, 725.5, 739.75.

## 3. Performer lighting
The MC (and dancers) are evenly grey-lit (white FOH follow spot as key); the video shows strong coloured key light,
hard backlight rims into the lens and dense lit haze around them (351-357 blue, 403-406 red, 409-412 white backlight
in haze). Tint the key by the stage wash, add a strong rim/backlight from the deck lights, and a close-up haze glow.
Files: src/crowd/shaders.ts (performer path: uStageCol/uRimCol/lantern/key), src/crowd/performers.ts (glow = key level).

## 4. Troupe / dancer shots (641-740 s) — framing
Checked 8 moments: 650, 674, 683.5, 697, 739.75 are close; wrong: 660.884 ("field dancer, reverse angle" at z 50:
the video shows a close-up of a dancer with fans ON STAGE), 669.524 (camera inside a dancer's body — too close),
723.804 (video: a dancer walking towards the camera on the deck; ours: a wide stage). Consider extending camera.shot
`subject` (src/camera/ShowDirector.ts subjectAt, src/crowd/performers.ts subjectAt) to 'lead' / 'dancer<k>'.

## 5. Exposure / filmed look
After round 4 the light-balance agent measured exposure on 12 moments: 1 → 57.7 %, 0.7 → 58.1 %, 0.5 → 58.2 %
(lower exposure trades colour for light/shape). Recommendation: 0.7 in the Show camera only, or leave at 1.
Re-test after items 1-3.

## 6. Determinism after a seek (1243 s)
The same moment renders differently between runs (clean beam storm 34-38 % vs a white storm-haze whiteout 24 %).
haze/camera values are pure functions of show time (checked); suspect state that survives a seek (particles / smoke
puffs / FX budgets from the previously rendered moment). Repro: render 1243 alone vs right after 1194 in one
similarity run. Also make similarity.mjs seek to t-2 s, render a few frames, then seek to t.

## 7. Contract requests from round 4 (details in findings/r4_contracts_lightbalance.txt, r4_contracts_pillars.txt)
- fx core: burst lights over far-apart targets (arm_ends X ±94) are one segment light spanning the field → one light
  per target/cluster (> 30 m apart). envLight() flash term: weight by sqrt(d²/(d²+spread²)) like worldLights.ts.
- pyro: the video carries the light of big moments in dense LIT SMOKE (460.5 gerb wall, 313.75 red flares, 558.25 pink
  fans, 600.4, 1509, 1536.25) — ours has little smoke there. Larger, brighter lit smoke from gerb/comet walls.
- design bible §8.3: sky targets measured on the video (sRGB [0,40,103] v20, [0,10,65] v118, [0,0,41] v509).
- stage-walk leftovers: T_BOOTH blinder → (0,4.05,-6.35); arch-spot focus via stageFloorAt(); near-camera fade in the
  beam-volume shader (grey slab when standing on the podium); CameraRig floorAt on stair ramps; bible §5.4/§5.13 numbers.

## 8. Older gaps (findings/r2_show_contract.txt)
Lambda "trees" laser preset; heart fireworks arc limit; flood without lighting the set; twin white V gerbs at 76 s;
towers_top thin flame columns; bigger fire cloud 1508.8 / 1566. Free-tempo sync (Vivaldi, Discorecord intro, bridge,
Domitor, outro) is 60 % within 100 ms of a measured onset (steady tracks 100 % within 20 ms).

## 9. Finish
Final judges (tools/workflows/qa-judge.js), `npm run build:artifact`, republish the artifact
(https://claude.ai/artifact/8ZTMp8XW6hczruUKoiJhDi — update in place), final presentation to the user in Dutch.
