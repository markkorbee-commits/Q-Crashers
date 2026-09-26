# Round 8 — lighting: portal box, blinder faces, pillar shafts, deck-head filter, lit low fog

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-8 baseline 67.1 % raw / 50.2 % calibrated (colour 67.9, light 80.5, shape 54.8),
per moment in `research/video-timeline/data/similarity-mac-r8.json`.

## 1. Black box in the DJ portal (major, visible in many close-ups)
StrobeBlinderHousings instance 148 at world (0, 4.05, −6.47), 0.62×0.62×0.2, in front of the arch-crown cans
(instances 140-147 at z −8.52): the dark box in the portal at 656 / 705 / 739.75 and the MC close-ups 409-412 (found
by bisecting scene objects; not a stage or performer mesh). The video shows nothing there: remove it or move it out of
the portal (keep the round-6 T_BOOTH blinder behaviour for the walkable stage).

## 2. Blinder faces at 1047.25
lights.blinder 1046.335 (dur 0.9, warm 0.8) renders a bright row of ~20 square blinder faces along the deck front and
lights the portal block grey-beige (facade ~RGB 50,41,50 with all stage keys off). The video at 1046.4-1047.25 shows
the lamp strings plus amber haze and no row of blinders. Make blinders read as glare/haze at a distance, not as a lit
row of squares, and do not let them light the facade.

## 3. Lantern pillar shafts at 509.25
The pillars are lit red over their full shaft height (pillars #FF2040, shaftIntensity 0.9); the video shows dark
pillars with a lit orange-red lantern on top. Check the shaft vs lantern balance of the pillars look.

## 4. Deck-head target filter
The show group needs an 'outer' / 'ends' target filter (|x| ≥ N) for deck heads: 'center' only removes |x| < 14, so
heads out to |x| 20 still draw into the telephoto at 1438.5. Add it, document it in docs/show-format-ext/lights.md and
the validator vocabulary if needed (write a contract request for scripts/validate-show.mjs).

## 5. Low fog lit by white beams
fog.lowfog puffs are lit only by the rig term (stage light × distance falloff, knee 0.6), so a bank under white beams
stays grey instead of bright white (802.75; the show group adds a white lowfog cue at 797). If the beams' light on low
fog is computed in lighting (LightEnv / flood volume), make white beams light the bank; FogSystem itself belongs to
nobody this round: coordinate via contractRequests if the change must be there.

## Verify / stop
Per iteration: `--times 656,705,739.75,409.5,411.5,1047.25,1046.75,509.25,1438.5,802.75` then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r8_lighting_64"`); never lower the 64-moment calibrated score. Walkable stage and
mobile budget OK.
Files you own: src/lighting/**, src/core/LightEnv.ts, docs/show-format-ext/lights.md, src/fx/FogSystem.ts (lit low
fog only).
NOT: src/fx/core/**, src/fireworks/**, src/lasers/**, src/stage/**, src/world/**, src/postfx/**, public/show/*.json.
