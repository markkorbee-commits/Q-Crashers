> Handoff note: round-4 brief as given to the fixer (light balance + paving). The round was running at the
> handoff; check `git log` for its merge. Paths: $ENDSHOW_DATA = the local data dir (see HANDOFF.md).

# Round 4 — field light balance vs the official video (objective metric) + field paving

GOAL: make our Show-camera frames match the official video's light distribution. The single biggest measured gap:
OUR FIELD / GROUND / FLOOR IS FAR TOO BRIGHT. In the video the grounds are close to black at night; the light lives
in the AIR (haze, smoke, beams, bursts) and on the stage emitters, not on the ground.

## Measurement (scripts/similarity.mjs + scripts/similarity-score.py, already in the repo — read their headers)
Score = 0.45 colour-layout (ΔE) + 0.25 luminance histogram + 0.30 structure (SSIM). Baseline 64 moments: 52.0 % raw,
25.7 % after calibration. Our frames are brighter than the video in 54/64 moments (median 1.7x).
Lower-half (floor) mean luminance, video vs ours (0..1):
  t=484.75  video 0.006  ours 0.238   (drone high: our whole field is grey-lit, pillars visible; video: black ground)
  t=264.75  video 0.091  ours 0.414   (our lawn/field glows bright GREEN; video: green smoke glow in the AIR only)
  t=1463.0  video 0.077  ours 0.309   (our floor is a flat purple plane; video: purple only near the stage lip)
  t=1438.5  video 0.072  ours 0.303   (our field lit brown/orange by the gerbs; video: dark field, bright gerbs)
  t=1389.5  video 0.038  ours 0.189
  t=1047.25 video 0.100  ours 0.364   (also our white castle facade is lit; the video castle is dark — castle is NOT yours, note it)
  t=607.0   video 0.078  ours 0.182
  t=778.25  video 0.080  ours 0.231
  t=191.5, 142.5, 1218.5, 1316.25, 1487.5, 1365.25: whole frame 3-8x too bright
Contact sheet (left video, right ours) of 484.75 / 264.75 / 1463 / 1438.5 / 1047.25 / 411.5:
  $ENDSHOW_DATA/work/compare/bright_pairs.jpg — cloud-only sheet, not transferred; regenerate it first:
  node tools/video/vcompare.mjs --port <port> --showcam --settle 600 --out bright_pairs.jpg --shots "484.75;264.75;1463;1438.5;1047.25;411.5"
Full baseline numbers: research/video-timeline/data/similarity-baseline.json (64 moments); the 32-moment set
research/video-timeline/data/similarity-times32.txt. Its results at exposure 1 / 0.55 / 0.35 (cloud runs, not
transferred) showed that lowering the
global exposure only gains ~3 points because the RATIO floor:air is wrong, not the overall level.
Opposite gap (secondary): close-ups at 411.5 and 362.5 — the video is a bright, milky, hazy close-up of the MC
(light scattered in dense haze around the performer); ours is dark and crisp.

## Likely sources (verify each, measure, then fix)
- src/world/worldLights.ts: the stage as a broad soft source (uWStage/uWStageCol), flash area lights (flashStage /
  flashField), the flash bounce ambient (uWAmbCol, radius 230 m!), the site-wide atmos.glow (uWGlowCol), the sky /
  moon terms (uWSkyZen/Hor, uWMoonI) lighting the ground. At 484.75 the whole field is lit — a site-wide ambient.
- src/lighting/** : moving-head/wash/flood floor hits, gobo/flood projection on the field.
- src/lasers/** : laser floor-hit planes / sheet glow on the ground (1463 purple floor).
- Ground material albedo/roughness in src/world/Terrain.ts / Grounds.ts / groundMaps.ts.
- src/fx/haze.ts, src/fx/FogSystem.ts: the air glow that SHOULD carry the light (keep/increase in-air scattering
  near sources, especially for close cameras).

## Tasks
1. Measure first: run the 32-moment set at the current state (dev server on your port; frames dir
   $ENDSHOW_DATA/f4):
     node scripts/similarity.mjs --port <port> --settle 500 --min-frames 30 --times "$(cat research/video-timeline/data/similarity-times32.txt)" --out "$ENDSHOW_DATA/work/sim/lb_base"
   For fast iteration use 8-10 of the worst moments (--times 484.75,264.75,1463,1438.5,1389.5,1047.25,607,778.25,191.5,411.5).
   You can experiment live with --eval "js" (e.g. poke worldUniforms / app.env) before changing code.
2. Reduce the ground/field irradiance from the stage wash, floods, flash bounce, atmos.glow and sky/moon so the field
   reads near-black like the video, except: the stage lip / deck front under strong looks, the pools around the
   pillar plinths, and brief local pyro light near the flame sources (spatial falloff, not a site-wide wash). Keep
   the light in the air: haze glow, smoke lit from inside, beams. atmos.glow must colour the SMOKE/AIR, not the lawn.
3. Paving (from the user's daytime photos $ENDSHOW_DATA/refs/day/day2_axis.jpg, day3_aerial.jpg, day5_front.jpg —
   view them): the audience field in front of the stage is PALE CONCRETE PAVING with RED painted lines running from
   the deck corners along the aisle. Change the field material/texture accordingly — but it must stay dark at night
   in the Show camera (pale albedo x much less light). Daylight / dev ?daylight mode should show the pale paving.
4. Close-up haze (secondary): for cameras within ~25 m of lit performers/stage fixtures, the video shows a bright
   milky in-scatter; see whether haze in-scatter near the deck can rise without lifting the far field.
5. Re-measure the 32 set; iterate until the score stops improving. Then run ONE confirmation on the default 64-moment
   set (no --times; different moments, guards against overfitting): must beat the baseline 52.0 % raw.
   Report per-part numbers (colour/light/shape) before and after, and which exposure (--eval "__app.postfx.exposure=x")
   scores best AFTER your change (try 1, 0.7, 0.5) — do not edit src/postfx (another agent owns it); report the
   best value in contractRequests.
6. Walk-mode / tribe-mode sanity: the field must still be readable enough to walk at eye level in the default
   (non-show-camera) view: check 2 screenshots at eye level on the aisle (cam=0,1.7,60,0,0.05) during a bright look and
   a dark look; if too dark to walk, prefer a subtle eye-adaptation-free minimum (moonlight level) over lighting the floor.
Do NOT touch: src/stage/** (castle/deck are being edited by another agent — note castle over-lighting at 1047.25 /
1438.5 in contractRequests), src/postfx/**, src/core/**, public/show/*.json.
