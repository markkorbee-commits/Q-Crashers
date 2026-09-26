# Round 5 — stage: LED screens as castle art, castle/floods still too bright in wide shots

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`): the Mac
baseline after round 4 + Show camera exposure 0.5 is 57.5 % raw / 34.0 % calibrated (colour 55.6, light 71.3, shape
48.7); per moment in `research/video-timeline/data/similarity-mac-r5.json`. NOTE: the Show camera now renders with
exposure 0.5 (`SHOWCAM_EXPOSURE` in src/camera/CameraRig.ts); `--eval "__app.postfx.exposure=X"` multiplies on top.

## 1. Screens render as flat, saturated panels (blocker: every deck close-up)
`screens.content` mode `'color'` (and `'pulse'`) fill the two tall LED banner screens left/right of the portal with one
flat colour: bright orange/red at 348.25, 351, 361, 369, 403.5, magenta at 447, red at 725.5 and 739.75 (behind the MC
and the dancers). The video shows castle art on those screens: a red ornament print (348.25), dark stone with stairs
and arches (447), warm castle architecture lit red (725.5, 739.75) — never a flat, evenly lit panel, and at a much
lower level than our panels (in the video the performer is the brightest thing, not the screen).
Task: render the colour modes as castle/ornament art (stone blocks, arches, ornament scrolls — procedural or from the
existing decor atlas / stone textures) tinted by `color`/`color2`, at a moderate level with dark regions, keeping the
LED pixel grid. Keep the other content modes working. Code: `src/stage/materials/LedMaterial.ts` (CONTENT_MODE,
shader), `src/stage/look/LookResolver.ts` (mode resolve ~l.248), `src/stage/StageLook.ts`.
Check: `ENDSHOW_DATA=... node tools/video/vcompare.mjs --port <port> --showcam --settle 600 --shots "348.25;351;361;369;403.5;447;725.5;739.75" --out r5_screens.jpg`
(before/after), and the similarity numbers of 338, 362.5, 411.5, 705, 656, 680.5, 729.25 (all show the screens).

## 2. Castle and floods too bright in wide shots (major)
Round 4 darkened the castle, but these still read far too lit (video = dark silhouette + LED outline):
- 1438.5 (0.308; c 0.34 l 0.30 s 0.26): video dark red dragon + four firework fountains; ours white/grey castle,
  towers lit orange, two green floods lighting the set, white smoke.
- 264.75 (0.343): video almost black with a green smoke cloud; ours the whole set lit, green-lit ground in front.
- 338 (0.391, colour 0.06): video blue/purple set with red rosettes; ours pink/red set with a lit red castle base.
- 20.25 (0.427): video blue-dominated castle; ours pink/red emitters.
- 1463 (0.530), 167 (0.467): lit facade/crown vs dark video.
The green floods (look / flood fx) must colour the air/smoke and the dragon's front, not light the castle and deck
like a daylight wash (r2 gap "flood without lighting the set"). Check which terms light the castle at these moments
(`debug` overlay, `off=` systems) and bring them down; compare LED colours of the looks at 20.25 and 338 with the
video (blue vs pink: if the show file asks for pink, write a contract request with times instead of changing it).
Keep the night look deep and dark: never raise castle or field brightness.

## Verify / stop
Per iteration measure 10 stage moments: `--times 338,362.5,411.5,705,729.25,1438.5,264.75,20.25,1463,167`, then the
default 64 (`--out "$ENDSHOW_DATA/work/sim/r5_screens_64"`). Report before/after (raw, calibrated, parts) against
`similarity-mac-r5.json`. Keep a change only if the 64-moment calibrated score does not drop. Mobile budget must stay
PASS (`node scripts/budget-check.mjs --base http://localhost:<port>/`, now 90-100 draws vs 110).

Files you own: src/stage/**, docs/show-format-ext/stage.md, docs/show-format-ext/stage-walk.md.
NOT: src/crowd/**, src/camera/**, src/fx/**, src/pyro/**, src/fireworks/**, src/lighting/**, src/lasers/**,
src/world/**, src/postfx/**, public/show/*.json, scripts/** (other fixers own them in this round).
