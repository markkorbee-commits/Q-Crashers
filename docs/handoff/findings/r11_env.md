# Round 11 — env: sky and off-site lights for the empty-grounds drone shots

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-11 baseline 69.3 % raw / 53.5 % calibrated (colour 70.3, light 82.2, shape 57.1),
per moment in `research/video-timeline/data/similarity-mac-r11.json`. The requests come from the round-10 video-match
agents (all 11 spans, exact frames; their notes are research/video-timeline/NN.md — read the parts that concern you).

HOW THIS ROUND WORKS: you build ENGINE support in your files only. You do NOT edit the show file. For every new param
or behaviour, write the cue changes that use it into `$ENDSHOW_DATA/work/r11_env/cue_patch.json` as
`{"edits":[{"match":{"t":<exact t>,"sys":"..","fx":".."},"set":{"p.<param>":<value>, "dur":..},"why":"..","measured":".."}],
"adds":[{<full cue>,"why":"..","measured":".."}],"removes":[{"t":..,"sys":"..","fx":"..","why":".."}]}` — test each
in the page first (patch the cue list in-page via __app.show, recompile, render with vcompare/similarity) and record the
measured effect; a show agent applies the patches of all groups after the merge. Default behaviour of existing cues
must not change unless it measurably improves the 64 moments. In parallel a features workflow edits
src/camera/CameraRig.ts, src/player/**, src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts,
src/core/App.ts, Input.ts, types.ts, EventBus.ts, target.ts, src/world/landmarks.ts, site.ts, Terrain.ts,
structures.ts, Grounds.ts, src/intoxication/**, src/bar/**: never edit those.

- An option to hide the off-site searchlight beams and a darker sky for the empty-grounds drone shots (v51-58.56 side
  drone, v23-33): the video sky is black with a grey cloud bank there; ours is too bright and shows white search beams.
  Find where the searchlights live; if they are in src/world/landmarks.ts (the features workflow's file), write the
  change as a contract request instead.
- Site-wide fire light for the eruption (v1565.4-1566.3) with the pyro group: the world ground/air response to a very
  bright short fire (video corners ~120/7/3, ours ~70/16/13).

## Verify / stop
Touched moments + holdouts (in-page patches for cue-dependent features), then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r11_env_64"`) with the committed code: never lower the 64-moment calibrated score (noise
~1 point). tsc, no console errors, deterministic, no per-frame allocations, mobile budget PASS
(`node scripts/budget-check.mjs --base http://localhost:<port>/`). Document new params in your docs/show-format-ext file
and, if the validator must know them, list them in contractRequests (scripts/validate-show.mjs is the orchestrator's).

Files you own: src/world/Environment.ts, src/world/worldLights.ts, src/world/tex.ts, src/postfx/SceneGlare.ts, research/design-bible.md.
NOT: everything else (other groups and the features workflow run in parallel); never the show file.
