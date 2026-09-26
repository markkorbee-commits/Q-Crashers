# Round 7 — stage: bright castle facade, crown material, wing spars and bulbs, portal box

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-7 baseline 64.7 % raw / 46.5 % calibrated (colour 63.7, light 79.4, shape 53.8), per moment in
`research/video-timeline/data/similarity-mac-r7.json`. MEASUREMENT CHANGED on 27 Sep: the reference frames `f4` are
now exact (they showed video time k/4 + 0.12 s before) and cue seeds no longer depend on the cue's position in the
file, so per-moment numbers of older baselines and round-6 reports are not comparable.

## 1. Castle facade still lit white in wide shots (major)
- 509.25 (0.37, colour 0.00): the video is a purple/blue wash over the whole set; ours has the castle base lit
  white/grey (a bright band under the crown), red pillars.
- 1047.25 (0.50): the video is a purple-blue dragon over a dark castle; ours has a bright white/yellow window row and a
  lit facade. Also 289.25, 338, 20.25 (colour).
Find what lights the facade white there (window/arcade emissives, FOH keys ×3 from round 6, flash share, castle floods)
and make the castle take the wash colour at a low level, dark where the video is dark.

## 2. Crown material (major, deferred from round 6)
The video often shows the dragon and wings flooded in the content colour (167 purple/white crown, 998.25 green head,
1047.25 violet). Content-coloured floods barely lit the metallic head (shell metalness 0.8) and lowered the score in
round 6. Recalibrate the crown shell as painted/dielectric (less metal, more diffuse response to the wash and floods)
and re-test the content-coloured crown floods.

## 3. Wing finger spars and garland bulbs (major)
v581.5-584.2 (582.75, 0.51): the video's right wing shows three large finger spars (orange flame-tipped spires with blue
fins) and a sagging garland of big glaring white bulbs between them, with rosettes below. Our wing tips are small
spikes and the garland bulbs tiny. Compare several angles (582.75, 607, 631.5, 1463, wide shots) before changing
geometry; make the garland bulbs read as big glaring white points.

## 4. Portal and anchors
- v658-660 portal view (camera at (−1.8, 4.2, −7.9) looking out): an unidentified dark box at the upper left, probably
  the booth blinder or a porch-screen edge. Identify it and slim it down if the video does not show it. (The black box
  in the portal centre is the performer-props mesh: the camera group handles that one.)
- 101: the wing_left / wing_right fire anchors sit above the visible wing geometry; move them onto the wing if the
  video shows the fire on the wing surface (the pyro group checks the flame placement).
- 409-412: the video keeps the dragon mouth and emblem visibly pink/red through the white veil; if a stage.state
  master of about 0.3 (show group) is not enough, give the mouth/emblem LEDs a floor there.

## Verify / stop
Per iteration: `--times 509.25,1047.25,289.25,338,20.25,167,998.25,582.75,607,631.5,1463,656,101,411.5` then the default
64 (`--out "$ENDSHOW_DATA/work/sim/r7_stage_64"`). Never commit a change that lowers the 64-moment calibrated score.
Mobile budget PASS (90-100 of 110 now). Walkable stage keeps working (spots dj, dancers).

Files you own: src/stage/**, docs/show-format-ext/stage.md, docs/show-format-ext/stage-walk.md.
NOT: src/crowd/**, src/camera/**, src/fx/**, src/pyro/**, src/fireworks/**, src/lighting/**, src/lasers/**, src/world/**,
src/postfx/**, src/core/**, scripts/**, public/show/*.json (other fixers own them in this round).
