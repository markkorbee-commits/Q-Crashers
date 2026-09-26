# Round 6 — show file: free-tempo sync, cue-side contract requests

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-6 baseline 61.0 % raw / 39.4 % calibrated (colour 59.8, light 76.2, shape 50.1), per moment in
`research/video-timeline/data/similarity-mac-r6.json`. Sync: `python3 scripts/check-sync.py [--list]`.

## 1. Free-tempo sync (HANDOFF open point 7)
Steady tracks: 876 hits, 100 % within 20 ms of the grid. Free tempo: 103 hits, only 60 % within 100 ms of a measured
onset. Per region: dom_free2 (1074-1092 s) 32 hits, 41 % ≤ 100 ms, median 150 ms; outro (1565-1568) 56 %; viv_ramp
(42-76 s) 64 %; dom_100 (1033-1049) 74 %; disco_intro 67 % ≤ 20 ms. Worst (`--list`): comets at 1089.9-1091.2
(±0.5-1.0 s), salvos 1565.1-1567.7 (±0.3-0.6 s), flares 42.95 / 50.7 / 58.477 (±0.4-0.5 s), the 75.939 gerb/strobe/
crowd hit (-0.39 s), pyro.flame 1033.242 (-0.31 s) and 1038.042 (+0.18 s), lights.hit 1048.6 (-0.28 s).
Rules (CLAUDE.md): free-tempo hits snap to the nearest `public/show/audio-map.json` onset within 0.15 s, but ONLY where
the video shows the event on that onset. Check every candidate against the video: 0.25 s frames
(`$ENDSHOW_DATA/f4`, index = round(video_s*4)), contact sheets (`tools/video/sheet.py`), the signal tables
`$ENDSHOW_DATA/signals/NN.txt` (flash / fire / white % per 0.5 s) and `research/video-timeline/NN.md`.
Fireworks: cue `t` = LAUNCH; the break lands 0.8 + 0.021·height s later. check-sync.py compares the cue time itself:
make it compare the visible hit (the break time for shells/salvos/cakes with a break; the launch for comets, flares,
mines, pyro), then re-evaluate which cues are really off. Never move section starts or steady-track hits.
Target: free tempo ≥ 80 % within 100 ms without any cue drifting away from the video.

## 2. Cue-side requests from round 5
- Vivaldi 14.0-31.2 s: the stage.state cue at t = 14.0 (dur 17.196) gives the castle the pink content colour
  #8A2040; the video shows a blue castle (window bars, castle light), wings violet-pink. Add `"castleColor":"#3050D0"`
  (tested in-page by the stage fixer: 5 moments 52.9 → 53.1 %, colour 53.8 → 54.4).
- 558.25 (0.219, colour 0.00, the third-worst moment): the V-fans at 550.13 and 557.87 (front_comets + side_front +
  arm_posts, per: 2, angle 50, height 22) render as thin comet pairs; the video shows dense pink-white fans in lit
  smoke. Try per: 6, glitter 0.6 (optional tailGain 2; the launch-smoke glow and row light scale with sqrt(per)).
  The gold crossette / brocade lines (551.49, 554.97, 557.87, #FFB040 / #F0D8A0) are white-pink in the video.
- 333.849 pyro.burst red (dur 2.45): check against the video (blue by 336.3) and 338 (colour 0.13; the red glow
  blobs over the castle base at 338 come from it; the pyro group makes the glow decay with the burst).

## 3. Older cue gaps (findings/r2_show_contract.txt, HANDOFF open point 8), cue side only
- 76.0: twin white V gerb fans at the wing roots are missing (check 75.5-77 s in the video; add them with existing
  pyro.gerb params and anchors).
- 88.285 heart cake (curl -190) draws closed loops "OO"; the video's lobes are ~270° arcs meeting at the bottom: try
  curl ≈ -140 (the fireworks engine may add an arc limit in the pyro group; coordinate via contractRequests).
- 145.926 pyro.jet tower_torches: the video (v146.0) shows the CO2 plumes further out over the side sections / outer
  wing bays — consider p.pos [[-60,10,-6],[60,10,-6]] or corner/side anchors.
- 1551.295 burst side_rampart: blue plumes on the castle terrace roofline v1553.8-1564.7 (target roof_plumes, if the
  anchor exists; else a contract request).

## Verify / stop
After every edit: `node scripts/validate-show.mjs --quiet` (0 errors), `python3 scripts/check-sync.py`. Side by side
for changed moments: `ENDSHOW_DATA=... node tools/video/vcompare.mjs --port <port> --showcam --settle 600 --shots "<t;t>" --out r6_show.jpg`.
Similarity of the moments you touched plus the default 64 (`--out "$ENDSHOW_DATA/work/sim/r6_show_64"`); never commit a
change that lowers the 64-moment calibrated score. Keep the one-cue-per-line house format of the show file (the compact
writer in tools/video/merge.py).

Files you own: public/show/endshow-2026.json EXCEPT the `camera` cues (sys "camera" belongs to the camera group),
public/show/audio-map.json (read-only unless an onset is provably wrong), scripts/check-sync.py,
docs/show-format.md, research/video-timeline/*.md (notes on what you changed).
NOT: any src/**, camera cues, docs/show-format-ext/** (other fixers own them in this round).
