# Round 7 — lighting: troupe over-lighting (merge interaction), wash fallback bug, arch spots, beams

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-7 baseline 64.7 % raw / 46.5 % calibrated (colour 63.7, light 79.4, shape 53.8), per moment in
`research/video-timeline/data/similarity-mac-r7.json`. MEASUREMENT CHANGED on 27 Sep: the reference frames `f4` are
now exact (they showed video time k/4 + 0.12 s before) and cue seeds no longer depend on the cue's position in the
file, so per-moment numbers of older baselines and round-6 reports are not comparable.

## 1. Troupe section 646-740: stacked lighting after the round-6 merge (blocker; you own the fix)
680.5 fell 0.487 → 0.362 and 656 fell 0.439 → 0.386 when round 6 was merged, although each branch alone improved them.
Likely cause: three levers stacked — the show group's red stage flood 645.554-709 (cue), your arch glow (FB_BOOTH blob,
near share 0.6, round 6) and the stage group's FOH key ×3 (src/stage). Now: 680.5 0.36 (colour 0.26), 656 0.39.
The video (656, 690, 705, 724.5) is amber-red haze with warm-white castle walls and red floor light; our arch-crown
spots render as big cream/white cones (a white column at 680.5) on a dark-brown castle. Test all three levers with
in-page overrides (the red flood level via the show cue in-page, the FOH key via its uniform), fix your engine side,
and write the cue / stage-side values that win into contractRequests (applied next round).

## 2. Wash fallback bug (major)
src/lighting/LightingSystem.ts writeWash: at 1322.3-1323.5 env.stageWashColor/Intensity resolve to the cold_gold
palette primary (linear 1, 0.527, 0) at I 0.33 although the active lights.wash cue (1322.306) is #000000 intensity 0.
The 'none = palette primary at 0.35' fallback fires for an intensity-0 wash cue and floods the isolated wings gold.
An explicit black / 0 wash cue must give 0 (video 1322.5: no wash on the set).

## 3. Finale flood volume saturation (major, with the fx group)
1511.75 (0.52) / 1536.25 (0.51): the video's mean colour is about 163/38/34 with black areas; ours 173/64/50. The flood
volume is one of three parts of the flat red (with the fx fog/smoke). Use your hooks (floodGlowK / floodSetK /
floodFlashK / scatterK) to find a finale balance that gives black areas without breaking 567.5 / 600.5 (flood volume
×0.5 broke those before).

## 4. Beams at 1163-1175 and 289.25 (check)
1163-1175: the video shows a laser sea and a small stage with almost no beams; our lit lantern-pillar crystals and
dense beam fans are prominent. 289.25 (0.48): white beams fan over the set in both, but ours is pinker; check beam
colour/level vs the video.

## 5. Floods lighting the set (r2 gap, check)
Floods should colour thin air, not light the set like daylight (567.4 field flood, 594.3 flat cyan set). Round 6 found
floodSetK 0.3 neutral; re-check with the exact frames.

## Verify / stop
Per iteration: `--times 656,680.5,690,705,724.5,1322.25,1511.75,1536.25,1169.5,289.25,567.5,594.25,600.5` then the
default 64 (`--out "$ENDSHOW_DATA/work/sim/r7_lighting_64"`). Never commit a change that lowers the 64-moment
calibrated score. Mobile budget PASS; walkable stage keeps working.

Files you own: src/lighting/**, src/core/LightEnv.ts, docs/show-format-ext/lights.md.
NOT: src/fx/**, src/pyro/**, src/fireworks/**, src/stage/**, src/crowd/**, src/camera/**, src/lasers/**, src/world/**,
src/postfx/**, scripts/**, public/show/*.json (other fixers own them in this round).
