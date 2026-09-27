# Round 9 — Show camera: terrace-tripod pose fits, finale/fireworks framings, calm stutter

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-9 baseline 68.1 % raw / 51.7 % calibrated (colour 68.8, light 81.0, shape 56.3),
per moment in `research/video-timeline/data/similarity-mac-r8b.json`. Requests below come from the round-8 fixers
(measured in the page; show times). In parallel a features workflow edits src/camera/CameraRig.ts, src/player/**,
src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts, src/core/App.ts, Input.ts, types.ts,
EventBus.ts, target.ts and src/world/landmarks.ts, site.ts, Terrain.ts, structures.ts, Grounds.ts: never edit those.

- Pose-fitting recipe (docs/show-format-ext/core.md, round 8): many 'ground', 'AISLE' and 'axis drone' shots are
  probably the same terrace tripod (0, ~7, 171), lens 7-11° up, fov 36-43. Candidates listed in 01.md / 06.md:
  86.764, 290.044, 316-330, 415-529, 595-611, 728-769, 822-858. Fit each against the geometry (lantern crystals x ±20,
  z 36/69/102/135; arm-end lights ±94, 12.5, 58; moon) and the exact frames; keep what scores better incl. holdouts.
- 1565.5 / 1566: ours is wider/higher than the video; 788.5: ours lower/further back.
- 1188.324: the pyro group widens the 1189-1200 U fans this round; the measured fovTo is 42: re-check after.
- 167.75 (0.49): the video is a closer, lower shot of the head (colours match).
- 1267.764 'stutter edit' alternates two framings every 0.12 s (4.2 Hz): with reduce flashing ON (app.reduceFlashing)
  hold one framing or alternate no faster than every 0.34 s (ShowDirector).

## Verify / stop
Touched moments + holdouts, then the default 64 (`--out "$ENDSHOW_DATA/work/sim/r9_camera_64"`); never commit a change
that lowers the 64-moment calibrated score (noise ~1 point). validate-show 0 errors / check-sync after show edits;
mobile budget PASS for engine changes.

Files you own: cues with sys "camera" in public/show/endshow-2026.json, src/camera/ShowDirector.ts, src/crowd/**,
docs/show-format-ext/core.md, research/video-timeline/*.md (camera notes only). NOT: src/camera/CameraRig.ts, other src.
