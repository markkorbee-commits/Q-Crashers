# Round 8 — env: site smoke fog per cue, finale veil, ground flash centroid

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-8 baseline 67.1 % raw / 50.2 % calibrated (colour 67.9, light 80.5, shape 54.8),
per moment in `research/video-timeline/data/similarity-mac-r8.json`.

## 1. Site-smoke height fog (major)
src/world/Environment.ts smokeTune: attribution run with smokeTune.fog 7 → 0: 76.25 +9.5 (37.4 → 46.9), 1509.5 +1.2,
1536.25 −3.0, 1511.75 −0.4, others 0. The smoke height fog hides the stage in the 76.25 whiteout (the video shows the
pillars and gerbs through it) but helps the finale. Make it depend on the cue / smoke age (a sudden whiteout thinner
than the 27 s finale bank), or per atmos.glow param, so both win.

## 2. 1565-1569 red sky
atmos.glow 1565.3 (#ff2418, 0.8, smoke 0.4) + atmos.sky 1564.815 (#FF3010, 0.12) turn the whole frame dull red incl. the
sky (fog colour #781b16, density 0.0056 at 1566); the video sky is black, only the field and the U glow. The show group
lowers the cues; check the engine response (sky tint should not colour a black night sky that strongly; glow local).

## 3. Ground flash from a mixed centroid (minor)
LightEnv flash buckets use an intensity-weighted centroid mixing low flame rows and high breaks; the ground height
falloff (round 7) works on that centroid. If measurable, a per-source height weight in worldLights (you own the ground
term) — LightEnv.ts itself belongs to the lighting group this round (contract request).

## Verify / stop
Per iteration: `--times 76.25,1509.5,1511.75,1536.25,1566,1567,264.75,484.75,600.5` then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r8_env_64"`); never lower the 64-moment calibrated score.
Files you own: src/world/Environment.ts, src/world/worldLights.ts, src/world/tex.ts, src/postfx/SceneGlare.ts,
research/design-bible.md.
NOT: src/world/landmarks.ts, site.ts, Terrain.ts, structures.ts, Grounds.ts (the player feature group builds the Ferris
wheel access there), src/postfx/PostFX.ts + shaders.ts, src/core/**, public/show/*.json, everything else.
