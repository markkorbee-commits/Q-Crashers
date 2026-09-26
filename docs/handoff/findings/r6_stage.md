# Round 6 — stage: masks, castle colour, wing proportion/bulbs, seek residue, portal clutter

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-6 baseline 61.0 % raw / 39.4 % calibrated (colour 59.8, light 76.2, shape 50.1), per moment in
`research/video-timeline/data/similarity-mac-r6.json`. Round 5 (docs/show-format-ext/stage.md "Round 5"): castle print
on the screens, STAGE_FLASH_SHARE 0.45, wing print tint.

## 1. Masks leave the castle lit (major; r2 gaps)
- 1322.3 mask:'wings' (cues 1322.306 / 1323.467) and mask:'crown' (1392.6) leave the castle stone and the whole crown
  orange-lit; the video shows only the wing outlines / crown LEDs.
- 1267.9 garland strobe lights the castle stone white; the video keeps it dark behind the strings.
Render 1322.3, 1323.5, 1392.6, 1267.9 with vcompare --showcam, fix the masking so only the named part emits/lights.

## 2. Castle colour and wing proportion at 330-341 (major)
338 (0.414, colour 0.13): castleColor '#3050FF' castle 1.8 at 330-341 reads purple/red, the video's facade is clearly
blue (the red blobs over the base are pyro glow, handled by the pyro group). The wings are much lower than the
video's in the 337.9 telephoto (wing tips ~48 % from the frame top vs ~22 %): check the set's vertical proportion
against research/design-bible.md and the video (337.9-341, also 20.25 and 582.75); change geometry only with clear
evidence from several angles.

## 3. Wing bulb garland (major)
582.75 (0.403): the video shows the right wing's white bulb garland as bright white points (and bright rosettes);
ours reads dim. Compare bulb level/size of the wing garlands at 582.75, 607, 631.5 and 1463 with the video.

## 4. Dragon head position vs the MC close-ups (check)
The performers fixer reported: in the video (6:01-6:03, 6:44-6:46) the dragon mouth ("heart" with teeth and LEDs)
appears right behind/above the MC at deck level; ours is at y 11.9, z -7.6. This is probably a long-lens stacking
effect (the camera group is re-framing 362.5 first). Only verify the head height/position against the design bible
and wide shots; report, do not move the head unless the wide shots prove it wrong.
Also: a black speaker/monitor block ("stage-speaker") stands in the portal at about (0, 2.7-3.7, -6.3); check whether
the video shows anything there (portal close-ups 656, 705, 739.75) and remove/lower it if not.

## 5. Seek residue on the wings (determinism)
After a seek the dragon wings differ by up to ~60/255 in a few pixels between seek orders at 1463 (lasers are
deterministic since round 5; the residue is on the wing art/LEDs). Make every wing/crown animation a pure function of
show time (no accumulated dt / frame counters).

## Verify / stop
Per iteration: `--times 338,20.25,582.75,607,631.5,1463,1322.25,1392.5,1267.75,656,705` then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r6_stage_64"`). Never commit a change that lowers the 64-moment calibrated score.
Mobile budget PASS (90-100 of 110 now). Walkable stage keeps working (spots dj, dancers).

Files you own: src/stage/**, docs/show-format-ext/stage.md, docs/show-format-ext/stage-walk.md.
NOT: src/crowd/**, src/camera/**, src/fx/**, src/pyro/**, src/fireworks/**, src/lighting/**, src/lasers/**,
src/world/**, src/postfx/**, src/core/**, scripts/**, public/show/*.json (other fixers own them in this round).
