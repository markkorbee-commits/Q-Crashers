# Round 8, show group: cue requests from round 7, checked on exact frames and the metric

All times are video seconds (`v`) unless marked as show time (`s` = v − 0.036). Every request was measured on the
touched moments (in-page cue patch, then again on the saved file) and confirmed on the default 64 moments.
Mac M4 Max GPU, `--settle 500 --min-frames 30`, pre-roll on.

## Applied

| cue (show time) | change | touched moments (score before → after) |
|---|---|---|
| 1051.265 `lasers.look` grid, deck_front | `height` 1.2, `intensity` 0.5 → 0.3 (the low blue web) | 1051.75 0.61 → 0.84, 1053 0.47 → 0.62 |
| 1503.66 `lasers.look` grid | `color` `#B040FF`, `color2` `#6040FF` (violet web, not white) | 1504 0.42 → 0.54, 1505 0.49 → 0.55 |
| 133.315 / 145.544 `lasers.look` grid, deck_front | `intensity` 0.7 → 0.3 / 0.5 → 0.25 | 139.75 +0.024, 142.5 +0.010 |
| 1124.428 `lasers.look` crossfire | `tilt` 12 → 4 | 1124.75 +0.008, 1125.5 +0.013 |
| 804.3 (new) `lasers.look` trees, deck_front, 0.12 s | a row of Λ tents inside the V web: at 25 fps v804.36–804.40 show tents, v804.44 is already V / hourglass again. The r7 rejection was about a long split; this cue covers only those two frames, the zigzag returns by v804.55 (checked in a Show-camera render). No f4 frame samples it (804.25 / 804.5 unchanged) | visual |
| 557.872 / 558.646 `fireworks.comet` | `glow` 1 | 558.25 +0.017, 558.75 +0.028 |
| 1192.116 / 1198.116 `pyro.gerb` | `color` `#FFB0E0` → `#FFD8F0` (the engine pushes a pale colour with saturation ≥ 0.2 to magenta; the filmed columns have white cores) with `colors` `["#FFD8F0","#FFA0D8"]` switching at 1.55 / 1.75 s (the sparks turn pink at the end of the burn, v1193.75–1194.0 / v1199.75–1200.0); the 1192 wave `dur` 1.9 → 1.75 (columns gone by v1193.9) | see the flood row |
| 1192.116 / 1198.116 (new) `lights.flood` all `#FF3090` 0.6, attack 0.5 | the field and the smoke under both fountain waves are pink in the drone shot (v1192.5–1194.1, v1198.5–1200.2); the set `wash` alone left the field black | 1193 0.26 → 0.54, 1193.5 0.28 → 0.55, 1194 0.51 → 0.60, 1199 0.22 → 0.42, 1199.5 0.25 → 0.44 |
| 1198.116 flood end | `dur` 1.85, `fade` 0.2: with 2.0 / 0.3 the pink air still released past the cut to the blue laser lattice at v1200.25 | 1200.25 0.21 → 0.27 (= without the flood), 1200 unchanged |
| 803.546 → 803.25 blackout (`lights.look` dark, `wash`, `pillars` off, `stage.state` master 0.06) | `fade` 0.1 → 0.3, same end time: the features show the set fading to black over v803.28–803.6 (luma 0.10 → 0.002), not at v803.6. Found while checking the new 797 smoke bank, which cost 803.5 −0.03 only because our set was still fully lit there | 803.5 0.63 → 0.80, 803.25 / 803.75 unchanged |
| 1322.306 `lights.wash` black | `fade` 0.1 (the pink wash left the wings at once; video unlit from v1322.5) | 1322.5 0.76 → 0.80 |
| 797.0 (new) `fog.lowfog` all, white, 1.5, 8 s | low white smoke bank over the field in the montage (the particles linger ~13 s, so a shorter `dur` does not clear it earlier) | 802.75 0.48 → 0.51, 797.5 / 800 unchanged, 803.5 fine with the earlier blackout (row above) |
| 645.554 `lights.look` floor | `color2` `#FFF0C0` removed: the cream head drew a white column up into the fire-ritual frames | 656 +0.010, 680.5 +0.007, 690 / 705 unchanged |
| 508.323 `lights.pillars` (steady and the beat chase) | `shaftIntensity` 0.9 → 0.2: v509.0–510.5 the pillar shafts are dark under lit lanterns | 509.25 +0.005, 510.25 +0.003 |
| 1155.366 `lights.pillars` | `intensity` 1 → 0.4 (crystals dim in the laser sea) | 1163 −0.009, 1169.5 / 1175 unchanged (visual request; the FPV frames hardly show the lanterns) |
| 409.227 `stage.state` | `glowFloor` 0.6 (mouth and emblem keep some light under the veil) | 409.5–411.5 unchanged: the Show camera frames the MC there; a free view from the field (cam 0,9,32) shows only a subtle difference, the veil washes the set out |

## Checked, no change

* **v166.84–169.04 green / purple.** The 25 fps hues (features.npz): green 166.84–166.96, violet 167.00–167.04,
  green 167.08–167.12, violet 167.16–167.28, green 167.32–167.36, violet 167.40–167.48, green 167.52–167.56, violet
  167.64–167.68, green 167.72–167.80, … The r7 repeat (every 0.109 s from s166.804, green first) is in phase with
  every one of these windows: the f4 frame at v167.0 is violet in both, v167.75 green in both. 167.75 scores low
  (0.49) because of framing (a closer, lower view of the head in the video): camera group.
* **645.554 stage flood.** Already 0.2 since round 7 (the request, 0.8 → 0.4, was measured on the older file);
  the set is not darker than the video at 656.
* **1508.36 flood.** Already `fade` 0.2 since round 7 (dark by s1509.76, the cut is at v1509.8); 1510.25 scores
  0.72.
* **1046.364 garlands.** Already `dur` 1.1 + `release` 0.4 since round 7 (lit to v1047.4). Extending to 1.35 kept
  the strings lit at v1047.5 where the video has them off: 1047.5 −0.010. Kept at 1.1.

## Tried and rejected

* **1565.3 `atmos.glow` smoke 0.4 → 0.1 and 1564.815 `atmos.sky` 0.12 → 0.03.** 1566 −0.015, the rest ±0.002.
  The exact frames v1565.5–1566.0 do show a red-orange sky over the whole drone frame (the eruption lights the
  smoke up to the top edge); the sky is black again only from v1566.25.
* **`column: true` on the 1565.3 white wall gerb.** 1566 +0.030, 1566.5 +0.022, but 1567 −0.046, 1567.5 −0.079,
  1568 −0.075: once the red glow releases, the wall becomes an overexposed white mass; the filmed columns at
  v1567–1568 are modest and orange-gold. With `intensity` 0.55 it is neutral (−0.012 … +0.004). Not used.

## Measurement

Default 64 moments: 67.1 % raw / 50.2 % calibrated (colour 67.9, light 80.5, shape 54.8) → **67.4 % / 50.6 %**
(colour 68.2, light 80.7, shape 55.0). Moments that moved: 142.5 +0.010, 558.25 +0.016, 656 +0.010, 802.75 +0.025,
1194 +0.084; none dropped by 0.01 or more (re-measured after the 803.25 / 1198 flood fixes: identical). 44
touched moments: 53.1 → 56.7 % raw; edge moments on the saved file 803.5 0.80, 1200.25 0.27. `check-sync` unchanged (steady
869 hits 98 %, free tempo 83 hits 71 %). Mobile budget at 558.3 / 803 / 804.33 / 1051.7 / 1193 / 1199 (+ 843 / 1515):
≤ 104 draw calls (PASS).
