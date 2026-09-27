# Round 9 — env: finale smoke over the head, sky/fog response

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-9 baseline 68.1 % raw / 51.7 % calibrated (colour 68.8, light 81.0, shape 56.3),
per moment in `research/video-timeline/data/similarity-mac-r8b.json`. Requests below come from the round-8 fixers
(measured in the page; show times). In parallel a features workflow edits src/camera/CameraRig.ts, src/player/**,
src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts, src/core/App.ts, Input.ts, types.ts,
EventBus.ts, target.ts and src/world/landmarks.ts, site.ts, Terrain.ts, structures.ts, Grounds.ts: never edit those.

- 1511.75: the dragon head disappears in red smoke; hiding pyro smoke costs −1.1, hiding the fog puffs +0.4, so what
  hides it is the atmos.glow site smoke / height fog (Environment smokeTune) or the haze (fx group). The video shows the
  head as a dark silhouette in front of the fan: thin the site smoke in front of the set during the finale bank.
- 1565.3-1566.75 (from the round-8 env measurement): the video's top band is red-orange v1565.5-1566.25 and black from
  v1566.75 while the U keeps blazing; check our sky/fog response follows that fall-off.
- SceneGlare: re-check 101 / 729.25 / 713.5 after the round-8 wing fire (one ~22 m line light per wing).

## Verify / stop
Touched moments + holdouts, then the default 64 (`--out "$ENDSHOW_DATA/work/sim/r9_env_64"`); never commit a change
that lowers the 64-moment calibrated score (noise ~1 point). validate-show 0 errors / check-sync after show edits;
mobile budget PASS for engine changes.

Files you own: src/world/Environment.ts, src/world/worldLights.ts, src/world/tex.ts, src/postfx/SceneGlare.ts,
research/design-bible.md. NOT: src/world/landmarks.ts, site.ts, Terrain.ts, structures.ts, Grounds.ts (features), other src.
