# Round 6 — free-tempo sync audit and cue-side fixes (show group)

Show time = video − 0.036. Timing evidence comes from the 25 fps feature luma (`$ENDSHOW_DATA/features.npz`, exact
frame times), the 0.25 s frames (`$ENDSHOW_DATA/f4`, see the frame-lag note below), the camera cuts and a 10 ms
band-level printout of the audio (< 200 Hz, 100 Hz–8 kHz, > 3 kHz; derived numbers only, not stored).

## The 0.25 s frames lag their file name by ~0.11 s

`f4/NNNNN.jpg` does **not** show video time NNNNN/4 but about NNNNN/4 + 0.11 s (ffmpeg's `fps=4` filter keeps the
last source frame that rounds to each output slot):

* frame-vs-feature correlation over 900 frames: the best match is feature index round(k/4·25) + 2…3 (+0.08…0.12 s);
* camera cuts (`cuts.json`, from the exact 25 fps features): an f4 frame labelled up to 0.10–0.125 s *before* a cut
  already shows the new shot in 72–82 % of the cuts (0.15 s before: 20 %).

So an event first seen in the frame labelled vX happened before vX + 0.11. Every "vX" in the older timelines that
comes from f4 frames reads ~0.1 s early, and `scripts/similarity.mjs` / `tools/video/vcompare.mjs` compare our show
at t − 0.036 with a frame that shows t + 0.11 (a 0.15 s mismatch on fast events). Tool fix requested (contract
request): re-extract with exact timestamps, or let the tools render at t + 0.075 for frame t.

## check-sync.py now scores the visible hit

* shells / salvos at their break (`rise`, or 0.8 + 0.021·(H − launch y) from the target anchors;
  v / arc / random salvos break their lowest shells first at ≈ 0.75 / 0.9 / 0.8 H); cakes with a shell `type` at the
  comet burnout; comets, plain cakes, mines, flares, finales, pyro, lights, stage, crowd at the cue time;
* a free-tempo rake (numeric `repeat.every` < 0.4 s: the comet rakes 1085.645 ×11 and 1089.9 ×9) scores only its
  first shot; the follow-up shots are a timed sequence, not musical accents (reported on their own line).

Steady tracks with the break rule: 98 % of 876 hits ≤ 20 ms, 100 % ≤ 100 ms (the green In The Cold drop salvos had
`rise` 0.5 = 2.58 half beats; see below). Free tempo: 60 % → 71 % of 85 scored hits ≤ 100 ms.

## Free-tempo decisions (video wins over the onset list)

| cue (show s) | was | now | evidence |
|---|---|---|---|
| side-section cake 1082.3 | +365 ms | **1081.935** (onset) | first streak at the right frame edge in f4 v1082.00 (= v≈1082.11), growing in v1082.25/.50; the old cue fired after the video |
| centre fan (dj_booth) 1086.2 | +285 ms | **1085.915** (onset) | the white tent is half built in v1086.25 (≈ v1086.36) and complete by v1086.5; a 1086.2 launch is only 0.1 s old there. Launch point moved from the booth (0, 1.9, −7.5: hidden under the deck roof, the fan never showed) to behind the dragon head (0, 16, −12) as an X-fan (cross 14 m, 28°), so the tent rises over the dragon as filmed |
| side_front cake 1089.9 | +575 ms | **1089.325** (onset), dur 2.775, 6 shots | outer side fans run without a gap v1089.25–1092.0; our sides were empty 1089.2–1089.9 |
| waterfall 1091.9 | +135 ms | **1091.765** (onset), end kept (1094.3) | hidden until the cut v1092.24, fully developed at the cut |
| crowd jump 1074.737 | −128 ms | **1074.865** (onset) | no crowd in the empty-grounds edit; jump on the first hit after the black |
| V flame fans 1033.242 (+ capitals) | −313 ms | **1033.42** (video) | 25 fps luma: dark to 1033.404, rising 1033.444, peak 1033.524; the > 3 kHz attack is at 1033.555: the real flame ignites 0.13 s early and peaks on the hit. Still −135 ms in check-sync |
| V flame fans 1038.042 (+ capitals) | +177 ms | **1038.22** (video) | luma rises 1038.244–1038.324 (peak), attack 1038.36; f4 v1038.00 dark, v1038.25 fans lit. −135 ms |
| green drop salvos 1414.241 / 1426.628 (cold_a, steady) | break 81 ms off the half beat | `rise` 0.5 → **0.581** (1.5 beats) | beat-phase profile of the frame luma over 1414.5–1435.5 (4×4 grid rows 1–2): the brightening sits at phase 0.5–0.8 (the off-beat), our breaks were at phase 0.29 |

Kept on purpose (off in check-sync, on the video):

* 75.939 hit (gerbs, strobe, crowd): the cut + white-pink blast is v75.92–76.0; the audio has a +16 dB attack in the
  > 3 kHz band at 75.90–75.92 that the onset detector (< 200 Hz and 100 Hz–8 kHz only) does not see; nearest listed
  onset 76.325 is the low drop hit 0.39 s later.
* 1565.3 white burst group (5 hits): 25 fps luma rises from 1565.244; the audio is a swell (+6…8 dB steps
  1565.26–1565.46), no ≥ 12 dB attack. 1565.1 / 1566.3 / 1567.7 salvos are the fillers of a continuous crackle band
  between the listed onsets 1564.815 / 1565.725 / 1566.885 / 1567.095 / 1568.285 / 1568.745.
* 1048.6 warm flash: luma rises exactly at 1048.60 (cut at v1048.64); audio attacks 1048.46–1048.52 and 1048.76–1048.88.
* 1075.242 roof comets: sparks at the wing tips in f4 v1075.25 (≈ 1075.32 show), 20–30 m up in v1075.5; onsets
  1074.865 / 1075.845 are 0.4–0.6 s away.
* 1080.76 wing cakes: fans ~15 m up in v1081.00 (≈ 1081.07), none in v1080.75 (≈ 1080.82); onsets 1079.855 / 1081.315.
* 1089.9 comet wall (rake start): first short streaks over the deck in v1090.25; no onset between 1089.325 and 1091.535.
* flare drones 42.95 / 50.7 / 58.477: each lights between the f4 frames around the cue (v42.75 dark → v43.0 lit,
  v50.5 dark → v50.75 lit, lit by v58.5); the nearest onsets are 0.4–0.5 s off and excluded by those frames.
* 56.0 sparkler drone: appears between v55.75 (≈ 55.82) and v56.0 (≈ 56.07); the 55.805 onset is just before it.

Target "≥ 80 % within 100 ms" is not reachable without moving hits away from the video: the remaining misses are
video-confirmed accents the onset list does not contain (hi-band attacks, swells) or texture fillers. An onset
detector with a > 3 kHz band would add 75.91 (and 1048.48); requested as a contract change of scripts/audio-onsets.py.

## Cue-side fixes (round-5 requests and older gaps)

* 14.0 stage.state: `castleColor` #3050D0 (blue castle under the pink content colour, v14–31).
* 75.939 pink whiteout: the pink smoke burst (size 4, density 2.2, glow 2.2, life 5 s) kept the whole telephoto
  frame a pink wall until ~81 s; the video is clear red/blue by v76.75. Now size 2, density 0.8, glow 1, life 1.2 s,
  dur 0.4; the red-smoke haze after it (76.564) 0.45 / glow 0.3. The frame still reads hazier than the video
  (gerb smoke + haze in a 170 m telephoto; engine side). The twin white V gerb fans at the wings exist as the
  75.939 wing gerb cue (6 units per wing, angle 28, spread 28).
* 88.285 heart cake: curl −190 → −120. −140 still drew closed "OO" loops at v90.5; −120 gives open ~270° lobes
  meeting at the bottom like the video's heart.
* 145.926 CO2 jets already sit at ±60 (p.pos); 1551.295 plumes already target roof_plumes + side_rampart.
* 333.849 red Bengal: only the two side pots (±86, p.pos), dur 2.45 → 2.85 (red side flares still burn in
  v336.25–336.5, faint by v336.75). The four deck pots left red glow blobs over the castle base at 338; the video is
  blue there.
* 313.333 red wash → red flood over the whole site (the flare drones' red smoke fills the frame, v313.3–314.9).
* 409.032–412.3 MC backlight: blinders 1.0 cyan-white, haze 0.9 with a cyan-white glow (3), plus a cyan-white flood
  over the whole site (1.3; an `area: stage` flood showed as a flat pale patch behind the arch): the film's deck
  close-up is a bright milky blue haze (mean frame RGB 156/176/193; ours was dark grey).
* 550.13 / 557.872 / 558.646 / 559.807 V-fans: per 2 → 6, height 22 → 32, glitter 0.6, tailGain 2 (dense tall fans).
* 554.968 crossettes: `color2` #FFE0EC: gold-orange at the break (v557.0–557.5, as filmed), white-pink when they
  spread over the pink smoke (v557.75–558.25). The 551.485 line stays gold (gold-orange in v553.75–554.25).
* 557.678 pink look → pink flood over the whole site (v557.9–559.3: the smoke over the U glows pink).
* 160.8–171.5 Discorecord colour chase: the one-colour steps (violet, cyan, green, dark green) now colour the castle,
  side sections and crown too (`castleColor` / `sidesColor` / `crownColor`): the video's whole set turns green at
  v164.75–165.0, v167.0–167.25, v168.25–168.75 and violet at v161.0 / v168.0.
* 645.554–709.0 fire ritual + arch downlights: a red stage flood (0.8): the film's deck shots are red-lit smoke, ours
  showed pale stone and cream light cones.

Measured on the default 64 moments (Mac GPU M4 Max, `--settle 500 --min-frames 30`, pre-roll on): 61.0 % raw /
39.4 % calibrated (colour 59.8, light 76.2, shape 50.1) → **62.3 % / 41.4 %** (colour 61.7, light 77.3, shape 50.6);
mean of the 10 worst moments 31.2 → 36.8 %. Biggest moments: 558.25 0.22 → 0.51, 411.5 0.07 → 0.31, 705.0 0.30 →
0.39, 313.75 0.48 → 0.57, 656.0 0.44 → 0.50, 680.5 0.49 → 0.52. Only drop: 1145.0 0.50 → 0.46 (seed re-roll, below).
Mobile budget at 313.75 / 410.5 / 558.25 / 656: ≤ 98 draw calls, ≤ 0.72 M triangles (PASS).

## Engine note: cue seeds depend on the cue's index

`ShowEngine.compile()` seeds every cue with `hash(sys:fx:t:di)` where `di` is the cue's index in the file. Adding
or removing ONE cue re-rolls the random details (laser sheet waves, shell positions, …) of every later cue: 1145.0
moved 0.50 → 0.46 in the similarity run only because two cues were inserted earlier in the file (nothing near 1145
changed). Parallel edits by other groups (camera shots) re-roll the same way at merge time. Contract request: seed from
`sys:fx:t` plus the occurrence count among cues with the same key, so edits stay local.
