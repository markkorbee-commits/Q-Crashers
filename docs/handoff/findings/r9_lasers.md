# Round 9 — lasers: wide zigzag web and white fans across the U front

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-9 baseline 68.1 % raw / 51.7 % calibrated (colour 68.8, light 81.0, shape 56.3),
per moment in `research/video-timeline/data/similarity-mac-r8b.json`. Requests below come from the round-8 fixers
(measured in the page; show times). In parallel a features workflow edits src/camera/CameraRig.ts, src/player/**,
src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts, src/core/App.ts, Input.ts, types.ts,
EventBus.ts, target.ts and src/world/landmarks.ts, site.ts, Terrain.ts, structures.ts, Grounds.ts: never edit those.

- v803.8-804.9: the blue zigzag web spans the whole U front, about x ±85 m incl. the side sections (frame x 0.07-0.93
  from the fitted terrace tripod (0, 7, 170.7), fov 37); ours on the deck_front anchors (x ±35.6, z −0.4) covers ~35 %.
  If the engine needs a wider unit set (side sections / arm units) for zigzag and fans, add it and document the target
  in lasers.md (the show group can then retarget; coordinate via contractRequests).
- v802.8-803.5: the white beam fans also span frame x 0.05-0.95.
- Reduce flashing: check the round-8 calm limits for lasers still hold after your change.

## Verify / stop
Touched moments + holdouts, then the default 64 (`--out "$ENDSHOW_DATA/work/sim/r9_lasers_64"`); never commit a change
that lowers the 64-moment calibrated score (noise ~1 point). validate-show 0 errors / check-sync after show edits;
mobile budget PASS for engine changes.

Files you own: src/lasers/**, docs/show-format-ext/lasers.md. NOT: other src, show file.
