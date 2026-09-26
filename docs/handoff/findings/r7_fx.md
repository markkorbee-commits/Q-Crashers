# Round 7 — fx: smoke, fog and haze (pyro haze, finale saturation, laser ceiling texture)

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-7 baseline 64.7 % raw / 46.5 % calibrated (colour 63.7, light 79.4, shape 53.8), per moment in
`research/video-timeline/data/similarity-mac-r7.json`. MEASUREMENT CHANGED on 27 Sep: the reference frames `f4` are
now exact (they showed video time k/4 + 0.12 s before) and cue seeds no longer depend on the cue's position in the
file, so per-moment numbers of older baselines and round-6 reports are not comparable.

## 1. Pyro haze too grey-white at 1438-1446 (major)
src/fx/haze.ts `uHazePyro.x = 7` turns the haze grey-white around the silver gerb walls at 1438.5-1446. Measured in
round 6: setting it to 0 gave 1438.5 +11.6 (before the silver dimming); 2.5 gave +0.3 calibrated on the 64. Find the
best value / shape (e.g. less white, more of the pyro colour, a shorter reach) and measure on the 64.

## 2. Finale saturation (major)
1511.75 (0.52) / 1536.25 (0.51): the video's mean colour is about 163/38/34 with black areas; ours 173/64/50 with a
flat red lower half. Round-6 diagnosis: the red comes from the flood volume (lighting), the pyro smoke and the fog
(fog.lowfog bank + site glow) together. Own the fog/smoke part: make the low fog bank and pyro smoke less uniform
(dark gaps, density falloff) and more saturated/darker where not lit, so black areas appear. Calibration hooks from
round 6: `environment.smokeTune` (env group), `lights.floodGlowK / floodSetK / floodFlashK / scatterK` (lighting).

## 3. 1120.5 laser ceiling texture (major)
1120.5 (0.44, colour 0.13): the video's upper half is a smooth lit blue haze band; ours shows a blotchy cloud texture
across the sky (the laser-lit smoke clouds / ceiling from round 5). Make that lit haze smooth and broad like the
video (and check 1145, 1169.5).

## 4. 802.75 low lit smoke (check)
802.75 (0.48): the video shows white beams/lasers low in thick lit smoke across the deck, with orange side pillars;
ours is clear and dark between the beams. Check the fog cues/levels there (fog.lowfog) against the engine response.

## 5. FogSystem burst lights per cluster
Verify glowing fog bursts push one light per group of targets (clusters(pts, 30) in src/fx/core/placement.ts), not one
light spanning e.g. 76.25 roof + wings or 873.67 deck_front + side_front; implement if still missing.

## Verify / stop
Per iteration: `--times 1438.5,1446,1511.75,1536.25,1120.5,1145,1169.5,802.75,76.25,1509.5,600.5,313.75` then the
default 64 (`--out "$ENDSHOW_DATA/work/sim/r7_fx_64"`). Never commit a change that lowers the 64-moment calibrated
score. Mobile budget PASS. Deterministic in show time.

Files you own: src/fx/** (core, FogSystem.ts, haze.ts, proxy.ts).
NOT: src/pyro/**, src/fireworks/**, src/stage/**, src/crowd/**, src/camera/**, src/lighting/**, src/lasers/**,
src/world/**, src/postfx/**, scripts/**, public/show/*.json (other fixers own them in this round).
