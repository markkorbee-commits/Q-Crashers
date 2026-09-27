# Round 9 — stage: calm resolver, window-bar LEDs, chroma

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-9 baseline 68.1 % raw / 51.7 % calibrated (colour 68.8, light 81.0, shape 56.3),
per moment in `research/video-timeline/data/similarity-mac-r8b.json`. Requests below come from the round-8 fixers
(measured in the page; show times). In parallel a features workflow edits src/camera/CameraRig.ts, src/player/**,
src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts, src/core/App.ts, Input.ts, types.ts,
EventBus.ts, target.ts and src/world/landmarks.ts, site.ts, Terrain.ts, structures.ts, Grounds.ts: never edit those.

- MainStage: set `this.resolver.calm = app.reduceFlashing` before each `resolver.resolve(...)` (the public field
  LookResolver.calm exists); today the stage only sees the option via src/fx/core/flashSafety.ts, which other systems
  update each frame (a toggle takes effect one frame late; with those systems off the stage ignores it).
- Window-bar LEDs (LedBuilder.windowTube, kind window): white-cored blue bars at high level with the overlay pass's
  minimum on-screen width (LedMaterial.ts); they read well at 338 but stay dim pure blue at 509.25, where the video
  shows white-cored blue bars. Windows (kind 1) are in OVERLAY_KINDS but not widened (uOverNear 0.3).
- Stage chroma deficit vs the video (stage rows over the 64): L10-20 −10.6, L20-35 −8.7, L35-50 −1.8, L50-70 −4.1,
  L70+ −8.7. A global tone saturation 1.15-1.3 gave only +0.4 calibrated (not adopted): look for stage-side emitter
  saturation losses (LED emissive colour path, crosstalk to white) in src/stage.

## Verify / stop
Touched moments + holdouts, then the default 64 (`--out "$ENDSHOW_DATA/work/sim/r9_stage_64"`); never commit a change
that lowers the 64-moment calibrated score (noise ~1 point). validate-show 0 errors / check-sync after show edits;
mobile budget PASS for engine changes.

Files you own: src/stage/**, docs/show-format-ext/stage.md, docs/show-format-ext/stage-walk.md. NOT: other src, show file.
