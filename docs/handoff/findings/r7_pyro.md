# Round 7 — pyro and fireworks: canopies, fountains, wing fire, finale balance

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-7 baseline 64.7 % raw / 46.5 % calibrated (colour 63.7, light 79.4, shape 53.8), per moment in
`research/video-timeline/data/similarity-mac-r7.json`. MEASUREMENT CHANGED on 27 Sep: the reference frames `f4` are
now exact (they showed video time k/4 + 0.12 s before) and cue seeds no longer depend on the cue's position in the
file, so per-moment numbers of older baselines and round-6 reports are not comparable.

Round 6 (docs/show-format-ext/pyro.md, fireworks.md): per-group/stretch flash split, white gerb light factor 0.4
(height-gated), smoke flash share 0.2, bulk-billow soot fix, fireworks `arc` param. Smoke/fog now belongs to the fx
group (src/fx/**), ground flash light to the env group (src/world/worldLights.ts): coordinate via contractRequests.

## 1. 558.25 pink canopy (major)
558.25 (0.59): the video frame is a saturated pink-magenta burst canopy over the whole U; ours is darker with separate
fans. The show group raised the V-fans to per 6 / height 32 / glitter 0.6 / tailGain 2 in round 6. Make many-comet
fans and the crossette breaks read as a dense canopy (break size, star count, glitter persistence, lit launch smoke)
without over-lighting other moments (a strong light variant over-lit 264.75 / 778.25 before).

## 2. 1565-1567 white fountains (major)
The 1566 eruption / tall white fountains exist (30k sparks) but read dim from the distant drone camera. The video
shows tall, bright white columns. Make distant fountain columns read (column brightness/width at distance, e.g. a
per-column glow billboard when a column is sub-pixel), energy-conserving; do not raise all sparks (the sub-pixel
exponent change cost 1438.5 −6 and 69.25 −4 before).

## 3. 1194 fireworks at the stage (major)
1194 (0.51): the video shows pink fireworks at the stage with the set and a red field visible; ours is a pink wall of
sparks that hides the set. Compare 1190-1198 in 1 fps sheets: star count, spread and the frame fill.

## 4. Wing fire (101-102) and flame shapes
- 101: the wing_left / wing_right fire anchors sit above the visible wing geometry (stage group); the wing firewall
  reads as two orange domes (partly the SceneGlare halos, env group). Check the flame placement against the video
  and request anchor changes with numbers if needed.
- 1508.8 flame wall: check its size and height against the video at 1508.3-1509.6.

## 5. 338 red-magenta blobs
The show group removed the deck pots of the 333.849 red bengal; verify at 336-339 that no red glow remains over the
castle base, and that the side pots at ±86 fade with the cue.

## Verify / stop
Per iteration: `--times 558.25,1194,1565.25,1566,101,338,1508.75,1511.75,1536.25,264.75,778.25,313.75` then the default
64 (`--out "$ENDSHOW_DATA/work/sim/r7_pyro_64"`). Never commit a change that lowers the 64-moment calibrated score.
Mobile budget PASS. Show visuals stay a pure function of show time.

Files you own: src/pyro/**, src/fireworks/**, docs/show-format-ext/pyro.md, docs/show-format-ext/fireworks.md.
NOT: src/fx/** (the fx group owns smoke, fog and haze this round), src/stage/**, src/crowd/**, src/camera/**,
src/lighting/**, src/lasers/**, src/world/**, src/postfx/**, scripts/**, public/show/*.json.
