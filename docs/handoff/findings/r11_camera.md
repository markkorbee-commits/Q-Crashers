# Round 11 — camera + performers: roll keyframes, zoom window, dip to black, cut lists, MC facing, lead path

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-11 baseline 69.3 % raw / 53.5 % calibrated (colour 70.3, light 82.2, shape 57.1),
per moment in `research/video-timeline/data/similarity-mac-r11.json`. The requests come from the round-10 video-match
agents (all 11 spans, exact frames; their notes are research/video-timeline/NN.md — read the parts that concern you).

HOW THIS ROUND WORKS: you build ENGINE support in your files only. You do NOT edit the show file. For every new param
or behaviour, write the cue changes that use it into `$ENDSHOW_DATA/work/r11_camera/cue_patch.json` as
`{"edits":[{"match":{"t":<exact t>,"sys":"..","fx":".."},"set":{"p.<param>":<value>, "dur":..},"why":"..","measured":".."}],
"adds":[{<full cue>,"why":"..","measured":".."}],"removes":[{"t":..,"sys":"..","fx":"..","why":".."}]}` — test each
in the page first (patch the cue list in-page via __app.show, recompile, render with vcompare/similarity) and record the
measured effect; a show agent applies the patches of all groups after the merge. Default behaviour of existing cues
must not change unless it measurably improves the 64 moments. In parallel a features workflow edits
src/camera/CameraRig.ts, src/player/**, src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts,
src/core/App.ts, Input.ts, types.ts, EventBus.ts, target.ts, src/world/landmarks.ts, site.ts, Terrain.ts,
structures.ts, Grounds.ts, src/intoxication/**, src/bar/**: never edit those.

- camera.shot: roll keyframes (roll → rollTo) or a multi-point path for the banking FPVs (v1426.4-1432.8,
  v1441.9-1451.2, v80.6-83.28); a zoom window inside a shot (`zoomAt` / `zoomDur`: v998.4, v1051.6); a fade/dip-to-black
  (v815.0-815.24).
- docs/show-format-ext/core.md: add the round-10 cut corrections (false cuts and missing real cuts listed in spans 01,
  02, 08; e.g. v313.24, 314.08, 315.72, 336.32 are light changes; missing v1210.8, 1211.44, 1211.8, 1312.9; all 13 'cuts'
  v1267.8-1274.84 are a lamp-string strobe) and the drone/tripod pose tables; the alt/altEvery stutter examples at
  v1222.6-1225 and v1267.8 are wrong (one camera with strobing lights): re-base or drop them.
- Performers: expose the MC's facing so subject shots can be authored from the front (v440, 446, 452, 458.5); move
  the lead's procession path (v723.84-728.9) to 1-2 m in front of the deck lip, ahead of the troupe.

## Verify / stop
Touched moments + holdouts (in-page patches for cue-dependent features), then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r11_camera_64"`) with the committed code: never lower the 64-moment calibrated score (noise
~1 point). tsc, no console errors, deterministic, no per-frame allocations, mobile budget PASS
(`node scripts/budget-check.mjs --base http://localhost:<port>/`). Document new params in your docs/show-format-ext file
and, if the validator must know them, list them in contractRequests (scripts/validate-show.mjs is the orchestrator's).

Files you own: src/camera/ShowDirector.ts, src/crowd/**, docs/show-format-ext/core.md (camera cue changes go into the cue patch).
NOT: everything else (other groups and the features workflow run in parallel); never the show file.
