# Round 11 — lights: per-lantern colours, spar lamps, dragon key flood, local pool flashes, storm haze

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-11 baseline 69.3 % raw / 53.5 % calibrated (colour 70.3, light 82.2, shape 57.1),
per moment in `research/video-timeline/data/similarity-mac-r11.json`. The requests come from the round-10 video-match
agents (all 11 spans, exact frames; their notes are research/video-timeline/NN.md — read the parts that concern you).

HOW THIS ROUND WORKS: you build ENGINE support in your files only. You do NOT edit the show file. For every new param
or behaviour, write the cue changes that use it into `$ENDSHOW_DATA/work/r11_lights/cue_patch.json` as
`{"edits":[{"match":{"t":<exact t>,"sys":"..","fx":".."},"set":{"p.<param>":<value>, "dur":..},"why":"..","measured":".."}],
"adds":[{<full cue>,"why":"..","measured":".."}],"removes":[{"t":..,"sys":"..","fx":"..","why":".."}]}` — test each
in the page first (patch the cue list in-page via __app.show, recompile, render with vcompare/similarity) and record the
measured effect; a show agent applies the patches of all groups after the merge. Default behaviour of existing cues
must not change unless it measurably improves the 64 moments. In parallel a features workflow edits
src/camera/CameraRig.ts, src/player/**, src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts,
src/core/App.ts, Input.ts, types.ts, EventBus.ts, target.ts, src/world/landmarks.ts, site.ts, Terrain.ts,
structures.ts, Grounds.ts, src/intoxication/**, src/bar/**: never edit those.

- lights.pillars per-lantern colours / chase (requested in spans 01, 08, 09 r9): a colour list per pillar or row/side
  offsets (v190, v197 a magenta near lantern among blue ones; v509.4, 510.64-511 pale-orange and blue neighbours;
  v1223.5-1226 half-beat strobe/chase of the near crystals).
- A spar lamp row (glare sprites + small halo, no beam cones) on the wing spars for the lamps that stare into the lens
  (v358-363.9, v374.2-377.4, v397-399.5); a diagonal 'starburst' backlight row beside the portal (v498.64-502.08).
- A flood that lights the dragon sculpture itself (red/green key on the head) independent of the set wash (v944-1010,
  v1043.9).
- A localized field-pool flash for blinder/pillar hits (orange light on the aisle between the lanterns and in front of
  the deck, not the whole field: v742.66, 744.16, 745.66, v716.44, 717.88); a lens-flare hit for moving heads crossing
  a close camera (v673.30, 674.40, 683.38, 691.29 … : frame luma +0.1 for ~0.5 s).
- A 'storm' haze scattering boost (hundreds of beams in near-white haze that hides the set, v1230.7-1249) instead of
  fog.level; a flat fan preset aimed at the lens (v834.88-838.08); low horizontal white beams across the deck from one
  side (v604.5-605.25); a gate option on lights.flood following the beat grid (v588.6-589.9).
- A single booth-spot target that can dip without dimming the set (v104.75-105.5).
- Reduce flashing: cap authored look stutters (colour changes up to 12.5/s at v160.8-171.4) when calm.

## Verify / stop
Touched moments + holdouts (in-page patches for cue-dependent features), then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r11_lights_64"`) with the committed code: never lower the 64-moment calibrated score (noise
~1 point). tsc, no console errors, deterministic, no per-frame allocations, mobile budget PASS
(`node scripts/budget-check.mjs --base http://localhost:<port>/`). Document new params in your docs/show-format-ext file
and, if the validator must know them, list them in contractRequests (scripts/validate-show.mjs is the orchestrator's).

Files you own: src/lighting/**, src/core/LightEnv.ts, docs/show-format-ext/lights.md.
NOT: everything else (other groups and the features workflow run in parallel); never the show file.
