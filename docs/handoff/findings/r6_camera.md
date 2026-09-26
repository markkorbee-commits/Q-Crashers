# Round 6 — Show camera framing and performers

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-6 baseline 61.0 % raw / 39.4 % calibrated (colour 59.8, light 76.2, shape 50.1), per moment in
`research/video-timeline/data/similarity-mac-r6.json`. The shape part is the weakest (50.1): framing matters most.
Round 5 (findings/r5_performers.md) gave the MC a coloured key + backlight, full haze in subject shots, and reworked
the troupe choreography 641-740 s; `Performers.subjectAt` supports mc, lead, aerialist, pianist, dancer0-9.

## 1. Framing of the worst-shape moments (major)
Lowest shape scores of the 64: 264.75 (0.23), 411.5 (0.24), 680.5 (0.25), 705 (0.26), 362.5 (0.27), 1438.5 (0.28),
1243 (0.29), 656 (0.30), 558.25 / 582.75 / 1536.25 (0.33), 460.5, 167, 974 (0.38-0.39). For each, compare our Show
camera with the video frame (`$ENDSHOW_DATA/f4/NNNNN.jpg`, index = round(video_s*4)) and a 1 fps contact sheet of the
shot (`tools/video/sheet.py`), and fix position / look / fov / lens movement of that `camera.shot` where the framing
differs. Known cases:
- 264.75: the video is a FAR drone shot (stage small, almost black frame, one green smoke cloud); ours is close to the
  stage and fills the frame with the set.
- 362.5 (0.172, colour 0.00): the video frames the MC right in front of the dragon head's LED "heart" (white LED dots,
  teeth), telephoto from low; ours frames the castle arcade/pier at X -5. Our dragon mouth sits at y 11.9, z -7.6
  (10 m above the deck): find a camera position/lens that stacks the MC in front of the head as in the video
  (low + long lens from the pit) before asking the stage group to move anything.
- 582.75 (0.403): the video is a low, close view up at the right wing with its white bulb garland and rosettes; ours
  is far and higher.
- 1169.5: the FPV path at 1163-1175 flies over the left bank (x -65..-86); the video flies lower over the field
  (the lit laser sea covers only the paved field).
- 680.5, 705, 656: troupe shots; check lens distance and height against the video.
One camera.shot per video cut (cuts in `$ENDSHOW_DATA/cuts.json`); keep cut times, never move section starts.

## 2. Troupe close-ups with subjects
scripts/validate-show.mjs now accepts the subjects mc, lead, aerialist, pianist, dancer0-9 (engine:
src/crowd/performers.ts SUBJECTS). Where the video follows a performer (660.9, 669.5, 723.8, 738.8 and others in
641-740 s), author the shot with `p.subject` instead of a fixed deck pose, and compare with the video.

## 3. Deck close-ups: MC lighting check
411.5 / 409.5 remain the worst moments (0.074): the milky backlit haze is being fixed by the light group
(FloodGlow + fog burst at 409.032). Keep your subject shots at full haze; check the MC key/backlight colours at
348.25, 351, 403.5, 409.5, 447 after the round.

## Verify / stop
Per iteration: `--times 264.75,362.5,411.5,582.75,656,680.5,705,1169.5,1243,460.5,167,974` then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r6_camera_64"`). Never commit a change that lowers the 64-moment calibrated score.
After editing the show: `node scripts/validate-show.mjs --quiet`, `python3 scripts/check-sync.py`.

Files you own: the `camera` cues (sys "camera") in public/show/endshow-2026.json, src/camera/ShowDirector.ts,
src/crowd/**, docs/show-format-ext/core.md, research/video-timeline/*.md (camera notes only).
NOT: any non-camera cue, scripts/**, src/camera/CameraRig.ts, src/stage/**, src/lighting/**, src/fx/**, src/pyro/**,
src/fireworks/**, src/lasers/**, src/world/**, src/postfx/** (other fixers own them in this round).
