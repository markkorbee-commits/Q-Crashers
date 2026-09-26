# Round 7 — Show camera framing, cut timing on exact frames, MC position, performer props

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-7 baseline 64.7 % raw / 46.5 % calibrated (colour 63.7, light 79.4, shape 53.8), per moment in
`research/video-timeline/data/similarity-mac-r7.json`. MEASUREMENT CHANGED on 27 Sep: the reference frames `f4` are
now exact (they showed video time k/4 + 0.12 s before) and cue seeds no longer depend on the cue's position in the
file, so per-moment numbers of older baselines and round-6 reports are not comparable. `vX` times in older notes that
were read from contact sheets can be ~0.12 s early (cuts, signals and features were always exact).

## 1. Cut timing on the exact frames (check first)
With the corrected frames, moments near cuts moved: 509.25 0.62 → 0.37, 1194 0.65 → 0.51, 167 0.56 → 0.44, 264.75
0.48 → 0.37, 802.75 0.56 → 0.48. For each, check that our camera.shot boundary matches the cut in
`$ENDSHOW_DATA/cuts.json` (exact) and that the framing matches the frame at that time; shot notes written from sheets
can be ~0.12 s early.

## 2. Framing requests from round 6
- 409-412: the video is lower and closer, MC from the knees up, lamps left of him.
- 1438.5: closer on the dragon (the video's telephoto keeps the silver side gerbs out of frame).
- 1511.75: a close drone at the dragon. 1536.25: the fountain row with the dragon lower right.
- 1508.75 and 558.25: the U fills the frame in the video (much closer).
- 509.25 / 1047.25 / 167: the video is closer on the dragon than ours (colour: see the stage and show findings).
One camera.shot per video cut; keep cut times, never move section starts.

## 3. MC position for 362.5 (the worst moment, 0.24, colour 0.00)
The stage group confirmed the dragon head is at the design-bible position (jaw tip Y 8.0, Z −7..−17; mouth centre
Y 11.9). The video (v360-363.9) stacks the dragon's LED heart directly behind/right of the MC's head, its lower tip at
shoulder height, from a low deck camera ~2.5 m in front of him. Move the MC (MC_PATH in src/crowd/performers.ts, your
file) for that shot so the stack works from a low camera, and frame it. Check the other MC shots do not break.

## 4. Performers
- The black box in the DJ portal at about (0, 2.7-3.7, −6.3) in MC / portal close-ups is part of the
  'performer-props' mesh (world bbox x −2.8..2.8, y 0..7.2, z −6.8..; behind the aerialist at 700). The video at 656 /
  705 / 739.75 shows no box there: remove or relocate it.
- Performers in the arch / on the podium can read app.env.archSpotColor (normalised) and app.env.archSpotIntensity
  (0-1.5, written each frame by LightingSystem) for their key light (656-740).
- 680.5 (0.36) and 656 (0.39) dropped when round 6 was merged (stacked troupe lighting; the lighting group owns that
  fix this round). Check only the framing there.

## Verify / stop
Per iteration: `--times 362.5,409.5,411.5,509.25,167,264.75,802.75,1194,1438.5,1511.75,1536.25,558.25,1047.25`, then
the default 64 (`--out "$ENDSHOW_DATA/work/sim/r7_camera_64"`). Never commit a change that lowers the 64-moment
calibrated score. After editing the show: validate-show (0 errors), check-sync.

Files you own: cues with sys "camera" in public/show/endshow-2026.json, src/camera/ShowDirector.ts, src/crowd/**,
docs/show-format-ext/core.md, research/video-timeline/*.md (camera notes only).
NOT: any non-camera cue, scripts/**, src/camera/CameraRig.ts, src/stage/**, src/lighting/**, src/fx/**, src/pyro/**,
src/fireworks/**, src/lasers/**, src/world/**, src/postfx/**, src/player/** (other fixers own them in this round).
