# Round 5 — performers: MC/dancer lighting and close-up haze, troupe framing

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`): Mac baseline
57.5 % raw / 34.0 % calibrated (colour 55.6, light 71.3, shape 48.7); per moment in
`research/video-timeline/data/similarity-mac-r5.json`. The Show camera renders with exposure 0.5
(`SHOWCAM_EXPOSURE`, src/camera/CameraRig.ts). The two worst moments of all 64 are MC close-ups.

## 1. MC close-ups: flat grey-lit figure in clear air (blocker)
- 411.5 (0.066; colour 0.00, light 0.01): video = MC backlit in a dense, bright blue-white haze, a row of white
  lights behind him, the frame milky and bright; ours = a dark, evenly grey-lit MC in clear air on a dark deck.
- 362.5 (0.170, colour 0.00): video = MC close-up, red key light on him, the dragon crown's LED heart behind, white
  beams into the lens; ours = small MC in front of a flat red screen (the screen is fixed by the stage group).
- 351 blue key + haze, 403.5 red key, 409.5 white backlight in haze, 348.25 blue-lit MC in front of red art.
Tasks:
a) Performer lighting (src/crowd/shaders.ts performer path: uStageCol / uRimCol / lantern / key; src/crowd/performers.ts
   glow = key level; uniforms fed in src/crowd/CrowdSystem.ts ~l.957): tint the key by the stage wash colour (blue at
   351-357, red at 403-406), add a strong rim/backlight from the deck lights, and keep the figure's front darker than
   the rim (video: silhouette-ish with coloured edges).
b) Close-up haze: `ShowDirector.hazeFor` (src/camera/ShowDirector.ts ~l.446) cuts the haze to 0.35-0.5 for cameras
   in the stage cloud and long lenses. The video's deck close-ups ARE milky (411.5, 409.5, 351): let the MC/deck
   close-up shots keep (or raise) the lit haze, e.g. via the shot's `subject`, so the haze glows around the performer
   and the backlights bloom through it. Do not make the wide/aerial shots milky.
Check: `ENDSHOW_DATA=... node tools/video/vcompare.mjs --port <port> --showcam --settle 600 --shots "348.25;351;361;362.5;369;403.5;409.5;411.5;447" --out r5_perf_mc.jpg`.

## 2. Troupe / dancer shots 641-740 s: framing (major)
Correct already: 650, 674, 683.5, 697, 739.75. Wrong:
- 660.884: video = close-up of a dancer with fans ON STAGE, red-lit; ours = "field dancer, reverse angle" at z 50: a
  dark field with lanterns.
- 669.524: video = red close crop on a dancer / the set; ours = camera far out on a wide stage (or inside a dancer's
  body in other runs: too close).
- 705 (0.284): video = two dancers close, red-lit, lanterns/fans; ours = a wide stage shot.
- 723.804: check against the video (a dancer walking towards the camera on the deck vs our wide stage).
- 656 (0.411), 680.5 (0.450), 729.25 (0.414): check framing and subject against the video frames.
Approach as for the MC: extend `camera.shot` `p.subject` (src/camera/ShowDirector.ts subjectAt, src/crowd/performers.ts
subjectAt) to 'lead' / dancer indices so close-ups follow a dancer, and fix the shots in the show file (camera.shot cues
only, inside 640-745 s). Timing rule: one camera.shot per video cut (cuts in `$ENDSHOW_DATA/cuts.json`); never move
section starts. Document a new subject value in docs/show-format-ext/core.md (the validator reads it). After editing
the show: `node scripts/validate-show.mjs --quiet` (0 errors) and `python3 scripts/check-sync.py`.

## Verify / stop
Per iteration: `--times 338,348.25,362.5,411.5,387,436,656,680.5,705,729.25` (similarity), then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r5_performers_64"`). Report before/after against `similarity-mac-r5.json`; keep a
change only if the 64-moment calibrated score does not drop. Determinism: seek to a moment twice / from different
predecessors must give the same image.

Files you own: src/crowd/**, src/camera/ShowDirector.ts, docs/show-format-ext/core.md, and in
public/show/endshow-2026.json ONLY `camera.shot` cues between 340 s and 745 s.
NOT: src/stage/**, src/camera/CameraRig.ts, src/fx/**, src/pyro/**, src/fireworks/**, src/lighting/**, src/lasers/**,
src/world/**, src/postfx/**, scripts/**, any other cue in the show file (other fixers own them in this round).
