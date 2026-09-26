# Round 8 — Show camera: closer framings in the finale and the fireworks moments, cut list

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-8 baseline 67.1 % raw / 50.2 % calibrated (colour 67.9, light 80.5, shape 54.8),
per moment in `research/video-timeline/data/similarity-mac-r8.json`. Shape (54.8) is the weakest part.

## 1. Closer framings the video uses (from round-7 reports)
- ~v1565.4 onwards: the video cuts to a much closer framing while our 1553.764 shot (pos 0,150,380) holds to 1581
  (1566 colour 0.0; the red veil is fixed by the show group this round).
- 1188-1198 and 1506-1510: the video's framings are closer than ours.
- v1509.8-1510.44: a dark-purple FAR drone behind the field; ours is the front-left drone from 1509.764.
- v803.8-804.9: the video frames the laser row on the deck across ~80 % of the frame width with lantern pairs in the
  foreground; ours (0,9,114, fov 38) shows it at ~40 %.
- 1435.9-1438.9: telephoto without the side sections (tried in round 7: closer lenses scored lower because our lit red
  pillars and grey smoke fill the frame; retry after the round-7 fixes, which darkened both).
Measure each against the neighbouring 0.25 s frames (holdouts), not only the 64 moment.

## 2. Cut list
The round-7 camera fixer found real cuts missing from `$ENDSHOW_DATA/cuts.json` (v506.52, v1188.36, v1510.08, v1521.0)
and listed flashes/look changes that are not camera cuts (v509.64, v510.2, v510.6, v1046.36, v1048.64, v1437.48,
v1508.48, v1509.8, v1510.44, v316.24, v606.68, v1285.68, v1520.8) — documented in docs/show-format-ext/core.md. Check
our camera.shot boundaries at the real cuts and that no shot changes at a false cut.

## 3. Not reachable (do not retry)
362.5 exact MC/dragon-mouth stack (the portal pier hides the mouth from a low deck camera); 1511.75 close drone at the
dragon (our gerb fans along the deck front hide the head); 1536.25 variants; 1169.5 FPV on-axis paths (−5 to −20);
167 / 1047.25 closer (geometry already matches).

## Verify / stop
Per iteration the touched moments + holdouts, then the default 64 (`--out "$ENDSHOW_DATA/work/sim/r8_camera_64"`);
never lower the 64-moment calibrated score. validate-show, check-sync after edits.
Files you own: cues with sys "camera" in public/show/endshow-2026.json, src/camera/ShowDirector.ts, src/crowd/**,
docs/show-format-ext/core.md, research/video-timeline/*.md (camera notes only).
NOT: non-camera cues, src/camera/CameraRig.ts and src/player/** (the player feature group this round), any other src.
