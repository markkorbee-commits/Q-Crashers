# Round 9, show group: cue requests from round 8, checked on exact frames and the metric

All times are video seconds (`v`) unless marked as show time (`s` = v − 0.036). Every request was measured on its
touched moments with the candidate show loaded in the page (`--eval "__app.show.load('/.shots/<candidate>.json')"`;
an unchanged copy reproduces the plain run to ±0.001) and the result confirmed on the default 64 moments.
Mac M4 Max GPU, `--settle 500 --min-frames 30`, pre-roll on. The 25 fps readings come from frames decoded with
ffmpeg into the data dir (`work/r9_show/f25_*`), zoomed onto the nearest lantern.

## Applied

| cue (show time) | change | touched moments (score before → after) |
|---|---|---|
| 1435.918 / 1437.467 `lights.look` lime deck ends | the dark look now covers ALL deck heads (`["deck_front"]`) and stands on the line BEFORE the two lime looks (same `t`, the later line wins); the lime looks target `["deck_front","left","outer"]` / `["deck_front","right","outer"]`. `aim` [∓70, 8, 110] → [∓45, 30, 60] (1435.9) and [∓45, 22, 60] (1437.5): with the old aim the beams left the telephoto frame at its bottom corners and only lit the grass green there; the video's lime sits at the left / right frame edge at about half height (v1436.5, v1437.25) and at three quarters (v1438.0). Checked with three aims side by side; the chosen one crosses the frame edges at those heights | 1436.5 0.559 → 0.565, 1438.5 0.606 → 0.603 |
| 508.323 `lights.pillars` chase | `every` beat → `halfbeat` (dur 0.194) with a 62-step colour list read per 25 fps frame: v508.4 pale, 508.6 blue, 508.8–509.3 red, 509.4 pale (flames), 509.6 pink, 509.8 violet, 510.0 red, 510.2 blue, 510.4 pink, 510.5 pale, 510.7 blue, 510.9–511.6 pale (flames), 511.7 blue, 511.9 red, 512.1 blue, 512.3 red, 512.4–512.7 pale (flames), 512.8–514.9 blue, then the fast mixed chase to v519 and violet / pink / blue at the end. The crystals are pale white under the capital flames: the amber read on the small frames is the flame jets beside the crystal (v512.48–512.92 zoomed). `color2` (shafts) stays red, violet / pink / blue from v519.0 (the near shafts turn with the crystals). s509.21 is now red (was blue) as filmed at v509.25 | 509.25 0.642 → 0.642, 511.75 +0.010, 518.5 +0.033 (pillars alone), 519.5 +0.013, 512.5 −0.022 (the filmed crystal is pale white; blue scored higher, kept as filmed) |
| 508.323 `lights.pillars` (steady + chase) | `shaftIntensity` 0.2 → 0.5. Not inert: 0 leaves the pillars black, 1 lights the edge strips red over the whole height. The near pillars of the wide shots from behind (v511.5–514, v518) have lit red-orange shafts; the frontal shots (v509) show them darker. 0.5 vs 0.2 over the 12 moments of 508–520: +0.015 in total. 502.13 kept at 0.9 (0.5 there: 503 / 504.5 / 506 −0.002…−0.004) | see the chase row |
| 508.323 `pyro.flame` pillars_top | `pattern` "x--x--x-" → the 32-beat "x--x--x-x--x------xxx-xx-xxx----": flames at v508.4, 509.5, 510.7, 511.5, 512.6, none through the blue run v512.8–515.2, then 515.3, 515.7, 516.1, 516.9, 517.3, 518.0, 518.4, 518.8, none after (25 fps) | 518.5 +0.039, 516.25 −0.034 (the video has flames there too, v515.96–516.28), 515.5 −0.004 |
| 712.796 (new) `atmos.glow` #ff7424 1.0 | as requested: the air turns orange with wing burst 2 (v713.25–714.25); not at 733.046 | 713.5 0.271 → 0.410 |
| 1510.434 `pyro.gerb` white-gold fan | one fan behind the head instead of the head + PA-hang + tower-torch spread: `pos` 7 units x −18 … 18 (Y 17–22, Z −16 … −18), `angle` 30, `spread` 30 (the drone shots v1515–1522 show one broad fan behind the head, the frontal v1513.5 an arc over the castle width). The requested 5-unit fan (x ±9, angle 22, spread 26) was measured too: 1520 +0.107, 1536.25 +0.012, but 1513 −0.035, 1516 −0.014, 1518 −0.015; the wider 7-unit fan keeps 1520 and loses nothing | 1520 0.206 → 0.314, 1513 −0.017, 1522 +0.004, 1525 +0.003, 1516 / 1518 / 1530 / 1536.25 / 1511.75 ±0.002 |
| 803.734 (new) `lasers.look` zigzag, corners | a second V web from the corner towers (count 8, spread 100, height 24, tilt 40) fills the frame edges of v804.0–804.75, where the filmed web runs on over the side sections (x ≈ ±85); the deck web covers x ±35 only. There are no laser units between the deck ends (±33) and the corner towers (±90): see "Open" | 804 0.572 → 0.581, 804.5 0.646 → 0.652 |
| 802.8 (new) `lights.look` fan, side_front, 0.371 s | the side sections fan white and low (tilt 36, spread 60) on the beat of v802.98 instead of the bar's tall up-fans; the beat after (s803.171, tilt 28) already matches | 803 0.732 → 0.734 |

## Checked, no change

* **797.0 `fog.lowfog` 0.9 / 6.5 s vs the committed 1.5 / 8 s.** 802.75 0.498 → 0.479, 799.5 +0.004, 800.5 −0.003,
  801.5 +0.002, 803 −0.003, 803.5–804.5 ±0.002. Kept 1.5 / 8.
* **502.13 `shaftIntensity` 0.9 → 0.5.** 503 −0.002, 504.5 −0.003, 506 −0.004 (the wide shots from behind show
  lit shafts there). Kept 0.9.
* **802.8 fans on `laser_stage` + `side_front` with the deck heads (`groups` truss + floor).** The deck heads draw a
  white burst at the deck centre that the video does not have. Not used; `laser_stage` already includes the side
  sections for lights, so the tall centre up-fans came from the spars, not from missing targets.

## Open (engine requests)

* Lasers: no units between x ±33 (deck) and ±90 (corner towers, Y 14.8). The v803.8–804.9 V web spans x ≈ ±85 at
  deck height; a row of deck-level units on the side sections (x ±40 … ±88, Y 2–4) or a `pos` param for laser
  looks would let the zigzag cover it.
* Lantern pillars: the video gives neighbouring lanterns different colours at the same instant (v509.40 white /
  blue, v510.64–511.0 pale-orange / blue); `lights.pillars` colours all eight alike.

## Measurement

Default 64 moments (re-measured in this worktree first: identical to the round-9 baseline) 68.1 % raw / 51.7 %
calibrated (colour 68.8, light 81.0, shape 56.3) → **68.1 % / 51.7 %** (colour 68.8, light 81.0, shape 56.3). Only
five of the 64 lie in the touched spans: 509.25 +0.001, 802.75 ±0, 1438.5 −0.002, 1511.75 +0.001, 1536.25 +0.002
(no moment moved by 0.01 or more). The gains are on moments outside the 64: 713.5 +0.139, 1520 +0.108, 518.5 +0.072,
519.5 +0.014, 511.75 +0.010, 804 +0.009, 804.5 +0.006, 1436.5 +0.006; losses 516.25 −0.041 (flames, filmed),
512.5 −0.023 (pale crystal, filmed), 1513 −0.017. `validate-show` 0 errors / 0 warnings, `check-sync` steady 870 hits
98 %, free tempo 83 hits 71 %. Mobile budget at 509.3 / 518.5 / 713.5 / 803 / 804.3 / 1436.5 / 1515 / 1520: ≤ 100
draw calls (PASS).
