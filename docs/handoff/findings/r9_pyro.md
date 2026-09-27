# Round 9 — pyro/fireworks: finale eruption brightness, wider U fans, taller fire wall

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-9 baseline 68.1 % raw / 51.7 % calibrated (colour 68.8, light 81.0, shape 56.3),
per moment in `research/video-timeline/data/similarity-mac-r8b.json`. Requests below come from the round-8 fixers
(measured in the page; show times). In parallel a features workflow edits src/camera/CameraRig.ts, src/player/**,
src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts, src/core/App.ts, Input.ts, types.ts,
EventBus.ts, target.ts and src/world/landmarks.ts, site.ts, Terrain.ts, structures.ts, Grounds.ts: never edit those.

- 1566: the whole gap is the eruption's brightness: the white burst + the U fountain wall (1565.3-1566.3) render at a
  frame mean [55,26,24] vs the video [177,80,64]; in the video the field is lit bright orange far out to the sides by
  the fountain rows along the field edges. Column gerbs over-brighten distant walls once the glow drops (1567-1568
  −8 with column:true): a distance-aware brightness so the U reads as bright columns from far without a white mass.
- 1189-1200: the white/pink gerb/fountain U fans outward over frame x 0.05-0.95 up to y ≈ 0.05 from the fitted drone
  ((−3,70,243), fov 48 at v1194); ours covers ~0.2-0.8.
- 1508.4-1509.8: the fire wall seen from the fitted drone ((−0.3,66.7,231.8), fov 52) fills frame x 0.12-0.85 and rises
  to y ≈ 0.1, far taller and wider than ours.
- Pale gerb colours with saturation ≥ 0.2 are pushed towards magenta: make the rule gentler or documented.

## Verify / stop
Touched moments + holdouts, then the default 64 (`--out "$ENDSHOW_DATA/work/sim/r9_pyro_64"`); never commit a change
that lowers the 64-moment calibrated score (noise ~1 point). validate-show 0 errors / check-sync after show edits;
mobile budget PASS for engine changes.

Files you own: src/pyro/**, src/fireworks/**, src/fx/core/placement.ts, src/fx/core/FxLights.ts,
docs/show-format-ext/pyro.md, docs/show-format-ext/fireworks.md. NOT: the rest of src/fx/**, other src, show file.
