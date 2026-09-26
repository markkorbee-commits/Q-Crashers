# Round 5 — pyro / fireworks / fx core: lit smoke of the big moments, glow blobs, burst lights

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`): Mac baseline
57.5 % raw / 34.0 % calibrated (colour 55.6, light 71.3, shape 48.7); per moment in
`research/video-timeline/data/similarity-mac-r5.json`. The Show camera renders with exposure 0.5
(`SHOWCAM_EXPOSURE`, src/camera/CameraRig.ts).

## 1. Big pyro moments lack the dense LIT smoke of the video (major)
The video carries the light of the big moments in dense, brightly lit smoke that fills the frame:
- 558.25 (0.254, colour 0.00): video = pink/magenta fans + a wall of lit pink smoke over the whole stage front; ours =
  a thin row of gold sparks over a dark stage, almost no smoke.
- 313.75 (0.384): video = red flares with big red-lit smoke clouds on both sides; ours = small red glows, dark field.
- 460.5 (0.450): video = gerb wall with thick white lit smoke rolling over the stage; ours = thin white gerbs, no cloud.
- 600.4, 1509 and 1536.25: same pattern (check them).
Make gerb/comet/flare walls leave larger, brighter, longer-lived lit smoke (coloured by the pyro), deterministic in
show time. Code: src/pyro/PyroSystem.ts, src/fx/core/* (puffShader, Emitter, CueFxSystem, FxLayer, budget).
Keep the mobile preset light (fewer/larger puffs).

## 2. Over-dense red fog / wrong balance in the finale (major)
- 1511.75 (0.327) and 1536.25 (0.313): video = the dragon/castle visible through the pyro, sparks white-gold, the
  smoke pink-white with dark gaps; ours = the whole lower frame a flat, saturated red fog, the set invisible. Lower the
  red fog density/saturation there, keep structure (gaps, sparks) visible.

## 3. Warm glow blobs around fire rows (major)
- 827.25 (0.349) and 729.25 (0.414): video = crisp flame rows on a dark field (orange flames, dark surroundings);
  ours = a wide soft orange glow blob over the whole stage and field that washes out the frame. Find the source
  (pyro fire sprites' glow, FxLights/FieldLight on the ground, or the analytic glare halos in src/postfx/SceneGlare.ts,
  which belongs to the atmosphere group — then write a contract request with numbers) and make the flames crisp with
  a tight glow. Compare also 76, 600.4, 1508, 1565 (the glare was tuned there) so they do not regress.

## 4. Burst lights over far-apart targets (contract request from round 4)
`findings/r4_contracts_lightbalance.txt`: burst lights over far-apart targets (arm_ends X ±94) are ONE segment light
spanning the field → one light per target/cluster (> 30 m apart). `envLight()` flash term: weight by
sqrt(d²/(d²+spread²)) like src/world/worldLights.ts. Code: src/fx/core/FxLights.ts, FieldLight.ts.

## 5. Similarity harness: pre-roll before the screenshot (minor)
Make scripts/similarity.mjs seek to t − 2 s, render a few frames, then seek to t (option, default on), so state that
depends on the previously rendered moment cannot leak into a measurement. Measured on the Mac: forward vs reverse
order of the 64 moments gives the same scores (±0.015) but pixel differences at 1389.5, 1169.5, 1463, 1145 (the
ground laser sea pattern; lasers are owned by the atmosphere group). Keep the output format unchanged.

## Verify / stop
Per iteration: `--times 313.75,460.5,558.25,600.5,729.25,827.25,1511.75,1536.25,76.25,1508` (similarity), then the
default 64 (`--out "$ENDSHOW_DATA/work/sim/r5_pyro_64"`). Report before/after against `similarity-mac-r5.json`; keep a
change only if the 64-moment calibrated score does not drop. Side by side:
`ENDSHOW_DATA=... node tools/video/vcompare.mjs --port <port> --showcam --settle 600 --shots "313.75;460.5;558.25;600.5;729.25;827.25;1511.75;1536.25" --out r5_pyro.jpg`.

Files you own: src/pyro/**, src/fireworks/**, src/fx/core/**, src/fx/proxy.ts, scripts/similarity.mjs,
docs/show-format-ext/pyro.md, docs/show-format-ext/fireworks.md.
NOT: src/fx/FogSystem.ts, src/fx/haze.ts, src/stage/**, src/crowd/**, src/camera/**, src/lighting/**, src/lasers/**,
src/world/**, src/postfx/**, public/show/*.json (other fixers own them in this round).
