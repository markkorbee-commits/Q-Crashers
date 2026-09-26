> Handoff note: round-4 brief as given to the fixer (castle/LED look + mobile draw calls). The round was
> running at the handoff; check `git log` for its merge. Paths: $ENDSHOW_DATA = the local data dir (see HANDOFF.md).

# Round 4 — MainStage look vs the official video (objective metric) + mobile draw calls

Measured with scripts/similarity.mjs (Show camera vs official video frames; read the script headers). Baseline
52.0 % raw / 25.7 % calibrated. Stage-related gaps seen in the worst moments (left video, right ours):
  $ENDSHOW_DATA/work/compare/bright_pairs.jpg and the worst/best sheet of a similarity run (report.jpg) — both
  cloud-only, regenerate them first (vcompare --showcam at 484.75;264.75;1463;1438.5;1047.25;411.5, and
  scripts/similarity.mjs, whose report.jpg shows the 6 worst and 6 best moments) — VIEW BOTH FIRST.
1. CASTLE FACADE TOO BRIGHT: at 1047.25 and 1438.5 (and in many wide shots) our white/grey castle facade and towers
   are clearly lit (washes / floods / glow / flash light reach them); in the video the castle is almost invisible
   (dark silhouette) except for its LED outline / windows / portal when a look uses them. Find which terms light
   the castle (stage wash, env.glowColor, flood fx, flash light, blue facade intensity in some looks, masks that
   leave the castle lit) and bring them down so the castle reads like the video. Check at least 1047.25, 1438.5,
   1463, 600.25, 843, 1272 with the video frames $ENDSHOW_DATA/f4/NNNNN.jpg (index = round(video_s*4)).
2. LED SET vs VIDEO: compare the dragon/wing/rosette LED colours and brightness at 6-8 moments across the tracks
   (e.g. 142.5, 191.5, 460.5, 705, 900.5, 1145, 1243, 1389.5): where our emitters are much brighter/larger/
   differently coloured than the video, fix the looks' gains/colour handling in src/stage (not the show file —
   note needed show-file changes in contractRequests with times).
3. MOBILE DRAW CALLS: the new scripts/budget-check.mjs fails on mobile: 114-126 draws vs budget 110 (MainStage 30,
   crown split per material ≈ 20). Merge the crown static/jaw materials (and other per-material splits) on
   quality=mobile so MainStage drops to ≲ 20 draws; run `node scripts/budget-check.mjs --base http://localhost:<port>/`.
4. Leftovers if time permits: env.glowColor should tint the stage wash (not light the castle white); per-zone screen
   colours; per-side masks; stage init load sub-steps for the loading bar.
Metric use: `node scripts/similarity.mjs --port <port> --settle 500 --min-frames 30 --times <list> --out "$ENDSHOW_DATA/work/sim/st_<name>"`
with 8-10 stage-dominated moments per iteration (e.g. 1047.25,1438.5,1463,142.5,191.5,705,900.5,1243,1389.5,1145).
Report before/after numbers. Keep the night look deep and dark: never raise the castle or field brightness.
Files you own: src/stage/** (incl. the new booth/vault/podium — keep the walkable stage working: spots dj, dancers),
docs/show-format-ext/stage.md, docs/show-format-ext/stage-walk.md. NOT: src/world/**, src/lighting/**, src/lasers/**,
src/fx/**, src/postfx/**, public/show/*.json (other agents own them now).
