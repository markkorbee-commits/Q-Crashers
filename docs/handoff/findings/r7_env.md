# Round 7 — env: ground flash, SceneGlare halos, site glow and fog, sky

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-7 baseline 64.7 % raw / 46.5 % calibrated (colour 63.7, light 79.4, shape 53.8), per moment in
`research/video-timeline/data/similarity-mac-r7.json`. MEASUREMENT CHANGED on 27 Sep: the reference frames `f4` are
now exact (they showed video time k/4 + 0.12 s before) and cue seeds no longer depend on the cue's position in the
file, so per-moment numbers of older baselines and round-6 reports are not comparable.

## 1. Ground flash lights the field (major)
src/world/worldLights.ts: flash buckets with an area-light term w = 400 + 0.8·spread² and a bounce radius
70 + 0.6·spread light the field centre between far-apart or high sources. Round 6: disabling all LightEnv flashes gave
264.75 +17 points and 484.75 +5.4; hiding the pyro FieldLight gave only +0.1 / +3.1. 264.75 is now 0.37 (the video is
almost black with one green smoke cloud). Add a ground share like STAGE_FLASH_SHARE (0.45, src/stage/look/
LookResolver.ts) or a height falloff for high firework breaks (flashPos y = 57 at 264.75); keep the orange-lit field
the video does show under low flame walls (1508-1510, 600.4).

## 2. SceneGlare halos (major)
src/postfx/SceneGlare.ts: the halos make the 'two orange domes' at the burning wings (101: glare off +2.2 raw) and
domes at 729.25 / 827.25. The wing lights are now at most 14 m long with a 0.45H + 2.5 m reach, so the halos can
shrink with them. Round-6 re-measure of the old G1/G2/G3 variants: +0.03 / +0.06 raw only. Find a halo size/threshold
that fixes 101 without losing 76.25 / 1509.5 (glare fully off cost −9.5 / −9.3 there).

## 3. Site glow / smoke veils (major)
- atmos.glow site glow: 1565.3 (red veil over the white fountains), 1508.305 (orange at 1510.25 while the video is dark
  purple), 600.5 (flat orange veil; nopost looks closer to the video). Keep the site glow local to the pyro.
- Site-smoke height fog at 2/7 of its density gave 76.25 +10.8, 1528 +3.3, 1566 +2.4, 1509.5 +1.5, but 1511.75 −1.5 and
  1536.25 −1.9 (round 6). Use `environment.smokeTune`; find a variant that keeps the finale moments (the fx and lighting
  groups work on the finale saturation in parallel).

## 4. Sky / FPV
1169.5: the video drone flies roughly on the axis looking ~12° down (moon position); keep the sky dome keyed to the
video. The FlyoverPath (free flyover mode) is yours, the Show camera shots are the camera group's.

## Verify / stop
Per iteration: `--times 264.75,484.75,101,729.25,827.25,76.25,1509.5,1565.25,1510.25,600.5,1511.75,1536.25` then the
default 64 (`--out "$ENDSHOW_DATA/work/sim/r7_env_64"`). Never commit a change that lowers the 64-moment calibrated
score. Mobile budget PASS.

Files you own: src/world/**, src/postfx/SceneGlare.ts, src/camera/CameraRig.ts, src/camera/FlyoverPath.ts,
research/design-bible.md.
NOT: src/postfx/PostFX.ts and src/postfx/shaders.ts (the perception workflow owns them this round), src/fx/**,
src/pyro/**, src/fireworks/**, src/stage/**, src/crowd/**, src/camera/ShowDirector.ts, src/lighting/**, src/lasers/**,
src/player/**, scripts/**, public/show/*.json.
