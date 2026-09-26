# Round 5 — atmosphere: haze/fog, lasers, field light, glare, stage-walk leftovers

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`): Mac baseline
57.5 % raw / 34.0 % calibrated (colour 55.6, light 71.3, shape 48.7); per moment in
`research/video-timeline/data/similarity-mac-r5.json`. The Show camera renders with exposure 0.5
(`SHOWCAM_EXPOSURE` in src/camera/CameraRig.ts, which you own this round); a lower exposure than 0.5 gained only
0.3 points and started to cost colour.

## 1. Beam-storm whiteout (major)
- 1243 (0.294): video = a clean beam storm: crisp white/blue beams fanning over the field, blue haze, dark gaps;
  ours = a milky white-grey veil over the whole frame, beams washed out. Stable on the Mac GPU (same result alone or
  after 1194: the cloud "determinism" suspicion does not reproduce here). Make the beams crisp and the haze
  blue/dark between them. Code: src/lighting/shaders.ts (beam volumes), src/fx/haze.ts, src/fx/FogSystem.ts.

## 2. Missing lit blue haze in the sky (major)
- 1120.5 (0.373, colour 0.00): video = the whole upper half a lit blue haze/smoke band; ours = a black sky.
- 1169.5 (0.283, colour 0.00): video = a bright blue laser sea filling the lower half, blue haze above; ours = a
  smaller laser sea with separate beams, black sky.
Let the rig light the high smoke band in the looks where the video shows it (FogSystem/haze), and match the laser sea
extent/brightness at 1169.5 (src/lasers/**).

## 3. Field lit grey / white haze slab at 484.75 (major)
- 484.75 (0.390, light 0.07): video = almost black grounds, a thin blue laser line on the horizon; ours = the paved
  field lit grey, a white haze patch over the stage. Find what lights the field there (worldLights / FieldLight /
  haze) and bring it to the video's black.

## 4. Laser sea not a pure function of show time (major, determinism rule)
The ground laser sea pattern differs depending on the previously rendered moment (forward vs reverse seek order of the
64 moments: mean pixel difference 6-7/255 at 1389.5, 1169.5, 1463, 1145; the difference is the moving sea pattern on
the ground). Make its animation phase a function of show time only (no accumulated dt / frame counter).

## 5. Glare halos (check with the pyro group's finding)
827.25 and 729.25: a wide soft orange glow blob washes out the frame where the video shows crisp flame rows. If the
analytic line-source halos (src/postfx/SceneGlare.ts, PostFX glareTune.halo = 16) cause it, reduce them there
without regressing 76, 600.4, 1508, 1565 (where they were tuned). Measure both.

## 6. Stage-walk leftovers (contract requests of round 4; `findings/r4_contracts_pillars.txt`, `r4_contracts_lightbalance.txt`)
- lighting rig blinder `T_BOOTH` → (0, 4.05, -6.35);
- arch-spot focus via `stageFloorAt()` (src/world/stageWalk.ts);
- near-camera fade in the beam-volume shader (grey slab when standing on the podium: `?autostart&spot=dj`);
- CameraRig `floorAt` on the stair ramps;
- design bible (research/design-bible.md) §8.3 sky targets measured on the video (sRGB [0,40,103] v20, [0,10,65] v118,
  [0,0,41] v509) and §5.4/§5.13 dimensions of vault/booth/podium.

## Verify / stop
Per iteration: `--times 1243,1120.5,1169.5,484.75,827.25,729.25,1145,1389.5,142.5,191.5` (similarity), then the
default 64 (`--out "$ENDSHOW_DATA/work/sim/r5_atmosphere_64"`). Report before/after against `similarity-mac-r5.json`;
keep a change only if the 64-moment calibrated score does not drop. Walkable stage must keep working (spots `dj`,
`dancers`; first-person and third-person on the stairs).

Files you own: src/fx/FogSystem.ts, src/fx/haze.ts, src/lighting/**, src/lasers/**, src/world/**, src/postfx/**,
src/camera/CameraRig.ts, src/camera/FlyoverPath.ts, research/design-bible.md, docs/show-format-ext/lights.md,
docs/show-format-ext/lasers.md.
NOT: src/fx/core/**, src/pyro/**, src/fireworks/**, src/stage/**, src/crowd/**, src/camera/ShowDirector.ts,
scripts/**, public/show/*.json (other fixers own them in this round).
