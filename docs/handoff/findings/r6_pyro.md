# Round 6 — pyro / fireworks / fx core: finale smoke, lingering glows, flash on the ground, old engine gaps

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-6 baseline 61.0 % raw / 39.4 % calibrated (colour 59.8, light 76.2, shape 50.1), per moment in
`research/video-timeline/data/similarity-mac-r6.json`. Round 5 added lit flare/serpent/gerb smoke, lights per cluster
(clusters() in src/fx/core/placement.ts) and the flash-spread term (see docs/show-format-ext/pyro.md, fireworks.md).
Since then the atmosphere group removed the frame-wide glare lift (PostFX glareTune.flat 0) and halved the halos.

## 1. Finale: flat red frame (major)
1536.25 (0.344) and 1511.75 (0.400): the video shows the dragon/castle through the pyro, white-gold sparks and pink-
white smoke with dark gaps; ours is a flat saturated red lower half. Round 5 measured the pyro-smoke band as the
largest single part at 1511.75 (hiding it: +3.1); the Environment fog is being reduced by the light group this round.
Make the finale smoke less uniform and less saturated (pinker/whiter where lit by white sparks, dark gaps), so the set
reads through.

## 2. Gerb smoke too bright/white at 1438.5 (major)
1438.5 (0.385): the white gerbs (pyro gerb 1437.467, #F4F8FF, 20 m) fill the frame with grey-white lit smoke; the
video is almost black with a dark red dragon and four firework fountains. Darker, thinner smoke for short white gerbs.

## 3. Lingering red glow after the 333.849 burst (major)
338 (0.414, colour 0.13): two large red glow blobs over the castle base, still visible at 337.964 (1.7 s after the
2.45 s cue ends); off=pyro,fireworks removes them. The glow (smoke self-light / lights) should decay with the burst.

## 4. Burst flash lights the ground (major)
264.75 (0.410): the burst flash (env.flashColor ≈ 2.47/4.39/1.81, intensity 4.78) lights the field and the smoke
bright green; the video is almost black with one green smoke cloud. The stage now takes 45 % of the env flash
(STAGE_FLASH_SHARE in src/stage/look/LookResolver.ts): give the ground term (FieldLight / flash on the site) a similar
share or distance falloff. 484.75 (now 0.674): check that the arm_ends flash pot (x ±91, z 58) is no longer one
segment light lighting the field centre (round-5 measurement ceiling 74-78 %).

## 5. 558.25 fans (with the show group)
558.25 (0.219, colour 0.00): dense pink-white fans in lit smoke in the video. The show group raises per / glitter of
the V-fans at 550.13 / 557.87; make sure the engine renders many-comet fans as a dense fan with a lit smoke base
(round 5: a strong light variant lifted 558.25 by ~11 but over-lit 264.75 / 778.25 — keep lights local).

## 6. Older engine gaps (findings/r2_show_contract.txt, HANDOFF open point 8)
- 1041 towers_top flames read as billowing fireballs; the video shows tall thin flame columns.
- 1508.8 flame wall and 1566 eruption are far smaller than the video's massive fire cloud / tall white fountains
  along the U.
- 102 wing firewall reads as two orange blobs.
- heart cake (88.285): lobes should stop at ~270° (arc limit param in the fireworks engine; the show group may
  instead lower curl to ≈ -140 — coordinate via contractRequests, document any new param in fireworks.md).
- 1567.7 / 1565.x outro salvos: if the show group's sync pass needs a break-time helper, expose it.

## Verify / stop
Per iteration: `--times 1511.75,1536.25,1438.5,338,264.75,484.75,558.25,313.75,460.5,1508,1565,76.25` then the
default 64 (`--out "$ENDSHOW_DATA/work/sim/r6_pyro_64"`). Never commit a change that lowers the 64-moment calibrated
score. Mobile budget PASS (`node scripts/budget-check.mjs --base http://localhost:<port>/`). Show visuals stay a pure
function of show time.

Files you own: src/pyro/**, src/fireworks/**, src/fx/core/**, src/fx/proxy.ts, docs/show-format-ext/pyro.md,
docs/show-format-ext/fireworks.md.
NOT: src/fx/FogSystem.ts, src/fx/haze.ts, src/stage/**, src/crowd/**, src/camera/**, src/lighting/**, src/lasers/**,
src/world/**, src/postfx/**, scripts/**, public/show/*.json (other fixers own them in this round).
