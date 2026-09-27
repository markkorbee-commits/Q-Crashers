# Round 11 — fireworks: launch offsets, flare halo, red crackle, comet walls, swimmers, crossing fans

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-11 baseline 69.3 % raw / 53.5 % calibrated (colour 70.3, light 82.2, shape 57.1),
per moment in `research/video-timeline/data/similarity-mac-r11.json`. The requests come from the round-10 video-match
agents (all 11 spans, exact frames; their notes are research/video-timeline/NN.md — read the parts that concern you).

HOW THIS ROUND WORKS: you build ENGINE support in your files only. You do NOT edit the show file. For every new param
or behaviour, write the cue changes that use it into `$ENDSHOW_DATA/work/r11_fireworks/cue_patch.json` as
`{"edits":[{"match":{"t":<exact t>,"sys":"..","fx":".."},"set":{"p.<param>":<value>, "dur":..},"why":"..","measured":".."}],
"adds":[{<full cue>,"why":"..","measured":".."}],"removes":[{"t":..,"sys":"..","fx":"..","why":".."}]}` — test each
in the page first (patch the cue list in-page via __app.show, recompile, render with vcompare/similarity) and record the
measured effect; a show agent applies the patches of all groups after the merge. Default behaviour of existing cues
must not change unless it measurably improves the 64 moments. In parallel a features workflow edits
src/camera/CameraRig.ts, src/player/**, src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts,
src/core/App.ts, Input.ts, types.ts, EventBus.ts, target.ts, src/world/landmarks.ts, site.ts, Terrain.ts,
structures.ts, Grounds.ts, src/intoxication/**, src/bar/**: never edit those.

- A `pos` / offset for comet and cake launch points outside the anchor set (red crest streams at x ≈ ±125, z 20-55,
  v66.3), and comets from x ≈ ±58 on the side sections with inward tilt for true crossing X-fans (v853-861.8).
- fireworks.flare: a smaller default halo for drone flares (v43-64: bright points with a modest red glow).
- A red crackle option (colour-true pops) for the red crackle canopy v538-548 and crossette bands v429.8/432.9/436.0.
- A denser 'comet wall' for row comets (50-60 m walls along the whole U incl. the arms, v252.9-255.3, v267.5-269)
  whose smoke/crackle does not linger into the next dark shots (v270.5); comet columns with thinner, wavier tails
  (v324.7-330, v384.7-396.4); a comet/cake mode with a dense orange gerb-like tail topped by a glitter break (v1426.6-1439).
- Swimmers: a `life` / wriggle duration (filmed swimmers fade ~3.8 s after the break: v751.5-755.5, v763.7-767.5).
- The dj_booth anchor (0, 1.9, −7.5) is under the portal roof: fans launched there are invisible (v415.5, 421.7,
  437.7, 536.5, 536.7-548): propose a deck-front-centre alternative in the cue patch.
- QA: the span-06 glitter curtain now fires ~1700 comets (was ~270): check CPU/mobile at 786, 787.5, 874.5.

## Verify / stop
Touched moments + holdouts (in-page patches for cue-dependent features), then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r11_fireworks_64"`) with the committed code: never lower the 64-moment calibrated score (noise
~1 point). tsc, no console errors, deterministic, no per-frame allocations, mobile budget PASS
(`node scripts/budget-check.mjs --base http://localhost:<port>/`). Document new params in your docs/show-format-ext file
and, if the validator must know them, list them in contractRequests (scripts/validate-show.mjs is the orchestrator's).

Files you own: src/fireworks/**, docs/show-format-ext/fireworks.md.
NOT: everything else (other groups and the features workflow run in parallel); never the show file.
