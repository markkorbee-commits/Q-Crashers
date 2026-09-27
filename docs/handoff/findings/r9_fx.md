# Round 9 — fx: low fog release and light-following, lit low fog puffs, field veil

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-9 baseline 68.1 % raw / 51.7 % calibrated (colour 68.8, light 81.0, shape 56.3),
per moment in `research/video-timeline/data/similarity-mac-r8b.json`. Requests below come from the round-8 fixers
(measured in the page; show times). In parallel a features workflow edits src/camera/CameraRig.ts, src/player/**,
src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts, src/core/App.ts, Input.ts, types.ts,
EventBus.ts, target.ts and src/world/landmarks.ts, site.ts, Terrain.ts, structures.ts, Grounds.ts: never edit those.

- fog.lowfog particles linger ~13 s after the cue ends and the bank does not darken when the set blacks out (cut to
  black v803.6): add a release param and let the fog brightness follow the light bus.
- Lit low fog: read app.env.lowFogLight (colour × level, premultiplied, ~0..3), lowFogPos (world m) and lowFogSpread
  (x, z RMS m) in glsl.ts envLight / FxShared.sync and add their light to the fog.lowfog puffs outside the 0.6 knee of the
  stage-light term, e.g. L += lowFogLight · exp(−0.5((dx/sx)²+(dz/sz)²)) · (1 − smoothstep(1.5, 3.5, p.y)), so the bank
  turns white under white beams (802.75).
- v600.5: our field carries a uniform gold veil over its whole width; the video lights the field only near the gerbs
  and keeps the far field and tree belts dark (worldLights gains do not change it: fx haze / FieldLight).
- 1511.75: the dragon head disappears in red smoke (atmos.glow smoke, haze density or low fog); the video shows the head
  as a dark silhouette in front of the fan.

## Verify / stop
Touched moments + holdouts, then the default 64 (`--out "$ENDSHOW_DATA/work/sim/r9_fx_64"`); never commit a change
that lowers the 64-moment calibrated score (noise ~1 point). validate-show 0 errors / check-sync after show edits;
mobile budget PASS for engine changes.

Files you own: src/fx/** EXCEPT src/fx/core/placement.ts and FxLights.ts (pyro group). NOT: other src, show file.
