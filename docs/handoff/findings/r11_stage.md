# Round 11 — stage: wing blades and proportions, head silhouette, festoon colour, head flash

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-11 baseline 69.3 % raw / 53.5 % calibrated (colour 70.3, light 82.2, shape 57.1),
per moment in `research/video-timeline/data/similarity-mac-r11.json`. The requests come from the round-10 video-match
agents (all 11 spans, exact frames; their notes are research/video-timeline/NN.md — read the parts that concern you).

HOW THIS ROUND WORKS: you build ENGINE support in your files only. You do NOT edit the show file. For every new param
or behaviour, write the cue changes that use it into `$ENDSHOW_DATA/work/r11_stage/cue_patch.json` as
`{"edits":[{"match":{"t":<exact t>,"sys":"..","fx":".."},"set":{"p.<param>":<value>, "dur":..},"why":"..","measured":".."}],
"adds":[{<full cue>,"why":"..","measured":".."}],"removes":[{"t":..,"sys":"..","fx":"..","why":".."}]}` — test each
in the page first (patch the cue list in-page via __app.show, recompile, render with vcompare/similarity) and record the
measured effect; a show agent applies the patches of all groups after the merge. Default behaviour of existing cues
must not change unless it measurably improves the 64 moments. In parallel a features workflow edits
src/camera/CameraRig.ts, src/player/**, src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts,
src/core/App.ts, Input.ts, types.ts, EventBus.ts, target.ts, src/world/landmarks.ts, site.ts, Terrain.ts,
structures.ts, Grounds.ts, src/intoxication/**, src/bar/**: never edit those.

- Wings (recurring in spans 02, 06, 10): in every terrace telephoto (v280.7-290, 305.5-308.4, 337.9-341.1, 412.2-414.8,
  v1463, v1500, v1552) the film's wings are diagonal BLADES rising from the towers to high upper corners (a V shape,
  v787.0-789.5, v813.9-816.9), and larger than ours; ours read as arches between the towers. Check against the design
  bible and the daytime reference (if $ENDSHOW_DATA/refs/day/ exists) and several angles; reshape/scale the wing
  spars and membranes if the evidence is consistent. Keep the anchors (wing_spars, wing_edge, wing_left/right, fire
  anchors) consistent and tell the pyro/fireworks groups the new coordinates in contractRequests.
- Dragon head: close-ups (v568.4, 572.3, 578.8, 594.3, 227.96, 846.84-849.68) show a longer-snouted, larger head that
  towers over a dark castle from the field telephotos (v666.4, 676.04); ours reads too low, flat and snake-like.
- Festoon bulbs (stage.garlands / state garlands) should take the cue colour (gold bulbs in orange smoke v165.5,
  v173.5; they render white-hot today) and bloom into white glare discs at close range in haze (v582.75-584.2).
- A transient head-flash (white dragon head during wing bursts v713.5-714.75, v719.75-720.5) and a short LED-only
  flicker (v96.08 / 96.28), e.g. a `flash` / `gate` fx targeting crown/dragon that reverts after dur.
- A garland target for a straight row of bulbs along the castle base (v412.7-413.3) and one that excludes the castle
  facade bulbs but keeps the wing eaves (v1268.12); per-zone wing colour inside a screens.content look (v515.5).

## Verify / stop
Touched moments + holdouts (in-page patches for cue-dependent features), then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r11_stage_64"`) with the committed code: never lower the 64-moment calibrated score (noise
~1 point). tsc, no console errors, deterministic, no per-frame allocations, mobile budget PASS
(`node scripts/budget-check.mjs --base http://localhost:<port>/`). Document new params in your docs/show-format-ext file
and, if the validator must know them, list them in contractRequests (scripts/validate-show.mjs is the orchestrator's).

Files you own: src/stage/**, docs/show-format-ext/stage.md, docs/show-format-ext/stage-walk.md.
NOT: everything else (other groups and the features workflow run in parallel); never the show file.
