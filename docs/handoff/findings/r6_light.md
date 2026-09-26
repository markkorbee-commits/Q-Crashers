# Round 6 — light / atmosphere: milky backlit haze at the MC, site fog, glare tuning, floods, lasers

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-6 baseline 61.0 % raw / 39.4 % calibrated (colour 59.8, light 76.2, shape 50.1), per moment in
`research/video-timeline/data/similarity-mac-r6.json`. Round 5 (docs/show-format-ext/lights.md, lasers.md): storm
scatter saturated, laser air light / ceiling, laser drift on show time, glare flat lift 0 and halo 8, sky dome keyed
to the video, stage-walk leftovers done.

## 1. 411.5 / 409.5: the milky backlit haze (blocker: worst moment of the 64, 0.074, colour 0.00, light 0.01)
Video: the whole frame milky white-blue, a row of white lamps behind the MC, the set almost gone behind the glare.
Ours: a black frame with only the MC. Cues: 'lights blinder' 409.032 (white 0.65, 3.29 s, deck_back) + 'fog burst'
409.032 (white, size 2.2, deck_back), haze 0.8; stage.state master 0.1 is intended. The Show camera's hazeScale is 1
for subject shots since round 5. Make the blinder light the haze/fog burst around the deck (FloodGlow FB_BACK,
FogSystem burst) into a bright, slightly blue-white veil with visible lamp sources. Also check 351 (blue), 403.5
(red), 348.25 for the same deck haze glow.

## 2. Site fog: flat red / orange veils (major)
1511.75 (0.400) / 1536.25 (0.344): flat red lower half; 600.5 (~0.57): flat orange veil (atmos.glow #ffb050); in both
cases `nopost` looks closer to the video. Round-5 pyro measurements: forcing scene.fog.density to 0 changed little,
the suspects are the Environment custom fog uniforms (density × (1 + 7·env.smoke), colour from glowColor) and the
SceneGlare lift; env.smoke × 0.25 (patched through Environment.glowAt) gave 76.25 +10.5, 1528 +1.8, others ±1.
Keep the site glow local to the pyro and let the dragon/castle read through.

## 3. SceneGlare tuning (major)
Measured by the pyro fixer before the atmosphere merge (64 moments, --eval on __app.sceneGlare.tune): G1 src
0.35→0.15, psf 0.05→0.035: +0.3; G2 e0 7→14: +0.6; G3 = G1+G2: +0.9 calibrated (729.25 +11.5, 1194 +7.7, 827.25 +7.3,
1438.5 +6, 484.75 +4.5; 313.75 -8, 558.25 -2.2). Glare fully off hurts 76.25 (-9.5) and 1509.5 (-9.3). Re-measure G1/
G2/G3 on the merged code and keep what gains.

## 4. Floods light the set / floor looks as green wedges (major; r2 gap "flood without lighting the set")
1438.5 (0.385): the floor 'look' cues at 1435.918 / 1437.467 (#B0FF20, groups floor, narrow) render as bright green
wedges in the haze in front of the castle; video: almost black. 567.4 field flood makes the dark L.P.A. set visible;
594.3 flood 0.12 + wash 0.03 gives a flat cyan set. Floods should colour thin air, not light the set like daylight.
Also: the arch spots (cones in the arch crown) fill the frame at 658-666 when seen from the portal; in the video
(10:59-11:06) they are not visible — dim their volume there, and expose arch-spot level/colour in LightEnv so the
troupe in the arch can be lit by them.

## 5. Lasers: Lambda "trees" preset (r2 gap)
803.7: the video look is 5 standing Λ "trees" (apex ~10 m, legs to the deck); the zigzag cannot make them. Add an
apex/tent preset to the laser engine and document it in docs/show-format-ext/lasers.md (the show group can switch
the 803.7 cue to it in a later round; give the exact cue params in contractRequests). Also: towers floor pools
(176-199.5, tilt -58) and gobo dots (1392) are not visible from the show cameras at medium quality.

## 6. FogSystem burst lights (contract from round 5)
Glowing fog bursts push ONE light from min to max over all targets (e.g. 76.25 roof + wings, 873.67 deck_front +
side_front): push one light per group with clusters(pts, 30) from src/fx/core/placement.ts.

## Verify / stop
Per iteration: `--times 411.5,409.5,351,1511.75,1536.25,600.5,1438.5,729.25,827.25,76.25,1509.5,313.75,567.5,594.25`
then the default 64 (`--out "$ENDSHOW_DATA/work/sim/r6_light_64"`). Never commit a change that lowers the 64-moment
calibrated score. Walkable stage keeps working (spots dj, dancers). Mobile budget PASS.

Files you own: src/lighting/**, src/lasers/**, src/world/**, src/postfx/**, src/fx/FogSystem.ts, src/fx/haze.ts,
src/camera/CameraRig.ts, src/camera/FlyoverPath.ts, src/core/LightEnv.ts, research/design-bible.md,
docs/show-format-ext/lights.md, docs/show-format-ext/lasers.md.
NOT: src/fx/core/**, src/pyro/**, src/fireworks/**, src/stage/**, src/crowd/**, src/camera/ShowDirector.ts,
scripts/**, public/show/*.json (other fixers own them in this round).
