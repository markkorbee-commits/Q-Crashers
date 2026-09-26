# Round 8 — pyro: burning wings on the wing surface, finale fountains, gerb smoke

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-8 baseline 67.1 % raw / 50.2 % calibrated (colour 67.9, light 80.5, shape 54.8),
per moment in `research/video-timeline/data/similarity-mac-r8.json`.

## 1. Burning wings (major; 101, 713.5, 729.25)
In the video the fire runs along the top edge and membranes of each wing (fully engulfed at v713.5). Ours: wingFire
(src/fx/core/placement.ts, yours this round together with src/fx/core/FxLights.ts) extends every finger chain 85 % toward the spear tops
and samples the edge between finger tops at spear-top height, so 6 m columns stand ABOVE the membranes. The stage
provides the anchor `wing_spars` (per finger 35/60/82 % of the spar, 18 points, left wing first; usable via `p.at`).
Membrane top edges attach at 93 % of each finger and sag 3.8 m (outer panel), 5.4 m (middle) and 3.4 m (inner) below
the chord. Put the fire ON the wing surface: points along the membrane scallops ~2 m apart, flames covering the upper
two thirds of the wing, shorter columns.
Also: FxLights packs the burning wings as six 12 m point lights at 1.2-2.0 each (the same energy as the v76 whiteout
wall): scale the packed intensity by fire size in src/fx/core/FxLights.ts, so FieldLight and the haze see it too.

## 2. Finale fountains and smoke
- 1565.3: the white fountain wall has not risen by v1565.5, while the video is at peak brightness then: check rise time.
- 1438.5/1446: remaining whiteness comes from the silver gerbs' own smoke puffs: darker/thinner smoke for short white
  gerbs. `LightSpec.haze` (0..1, src/fx/core/FxLights.ts) is available: set it on lights that ARE lit smoke.
- 1511.75: the video shows one roof gerb fan behind the dragon's head and the head as a silhouette in red smoke; ours
  runs gerb fans along the whole deck front and the red smoke hides the head (limits the camera). Compare the
  1510-1513 cues' visual result with the video and fix engine-side (fan density, smoke opacity near the head).

## Verify / stop
Per iteration: `--times 101,713.5,729.25,1565.5,1566,1438.5,1446,1511.75,1536.25,76.25` then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r8_pyro_64"`); never lower the 64-moment calibrated score. Mobile budget PASS.
Files you own: src/pyro/**, src/fx/core/placement.ts, src/fx/core/FxLights.ts, docs/show-format-ext/pyro.md.
NOT: the rest of src/fx/** and src/fireworks/** (the flash feature group), src/stage/**, public/show/*.json,
everything else.
