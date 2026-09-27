# Round 9 — lighting: reduce-flashing chase/strobe budget, flood glow saturation, wash field share

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-9 baseline 68.1 % raw / 51.7 % calibrated (colour 68.8, light 81.0, shape 56.3),
per moment in `research/video-timeline/data/similarity-mac-r8b.json`. Requests below come from the round-8 fixers
(measured in the page; show times). In parallel a features workflow edits src/camera/CameraRig.ts, src/player/**,
src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts, src/core/App.ts, Input.ts, types.ts,
EventBus.ts, target.ts and src/world/landmarks.ts, site.ts, Terrain.ts, structures.ts, Grounds.ts: never edit those.

- Reduce flashing ON: `lights.chase` with every 'halfbeat' + pattern 'random' runs at 5.3 Hz at 160 bpm (v406.1-409.0:
  5 flashes/s, steps 0.03 → 0.14 in tiles covering ~11 % of the frame). At most one step per beat and a shallower swing
  when calm. The strobe cap sits exactly at 3 Hz, so any other source in the same second goes over it (lights.hit 1266.18
  + capped strobe = 4 flashes/s at v1265.3-1266.3): cap at ≤ 2.5 Hz or use a shared budget (flashSafety.CALM_MAX_HZ in
  src/fx/core/flashSafety.ts is exported).
- 509.25: the lavender-grey castle base is the violet haze/flood glow in front of the set; ours rgb 74/35/147 (C 70),
  video 99/18/190 (C 95): our glow is desaturated (green double the video's). Saturate the flood-volume glow colour.
- lights.wash does not light the field (the show group needed extra floods at 1192/1198): document it in lights.md or
  give wash an optional field share.

## Verify / stop
Touched moments + holdouts, then the default 64 (`--out "$ENDSHOW_DATA/work/sim/r9_lighting_64"`); never commit a change
that lowers the 64-moment calibrated score (noise ~1 point). validate-show 0 errors / check-sync after show edits;
mobile budget PASS for engine changes.

Files you own: src/lighting/**, src/core/LightEnv.ts, docs/show-format-ext/lights.md. NOT: other src, show file.
