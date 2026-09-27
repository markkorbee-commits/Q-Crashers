# Round 11b: the engine groups' cue patches applied to the show

All times are video seconds (`v`) unless marked as show time (`s` = v − 0.036). Source: the eight round-11 cue patches
`$ENDSHOW_DATA/work/r11_{stage,fireworks,pyro,lights,lasers,fx,camera,env}/cue_patch.json` (each entry measured by
its engine group in the page). Applied group by group onto `public/show/endshow-2026.json` in that order, with an
applier that keeps the one-cue-per-line house format (a round trip of the unpatched show is byte-identical); match =
`t` within 2 ms + `sys` + `fx` (+ `target` / `p.preset` where the patch gives them). Every one of the 117 entries
(80 edits, 27 adds, 10 removes) matched exactly one cue; no two groups touch the same cue.

Measurement: `scripts/similarity.mjs --settle 500 --min-frames 30`, pre-roll on, Mac M4 Max GPU (ANGLE Metal),
exact-time frames. The unpatched show re-measured first: 69.3 % raw / 53.5 % calibrated = the r11 baseline
(`data/similarity-mac-r11.json`). After each group: `validate-show` (0 errors), `check-sync`, that group's touched
moments (the times in its `measured` notes) before → after on the cumulative show, and the default 64.
Scores below are × 100 (raw, per moment); "mean" is the mean raw score of the listed moments.

## Applied

| group | entries (edit / add / remove) | touched moments, mean before → after | default 64 after the group | largest moves |
|---|---|---|---|---|
| stage | 15 / 5 / 0 | 47: 49.71 → 50.30 (+0.59) | 69.3 / 53.5 | per-side wing colours v514.4–517.2: 515 +5.7, 515.5 +3.9, 516 +7.5, 516.5 +2.9, 517 +4.8; castle-front festoon row 413.25 +1.1; glare discs 591.5 +0.9 / 592 −0.4; white head flash 713.75–720.25 +0.4 … +0.6; gold bulbs (`hot` 0.15) and spar plates within ±0.3 (visual: gold bulbs in orange smoke as filmed at v165.5) |
| fireworks | 21 / 0 / 0 | 90: 62.26 → 63.12 (+0.86) | 69.3 / 53.5 (44.75 −0.4, 558.25 −0.9 untouched: the spark pattern of a later cue shifts, 1438.5 +0.6) | dense comet wall (`between` 3) 253.5 +7.8, 254 +10.6, 254.5 +10.9, 254.75 +10.2; flares 47.5 +4.3, 51 +4.1, 54.5 +5.7, 55.5 −4.1, 43.5 −1.0; crest streams 66.25 / 66.75 +2.5 / +2.3; `endBurn` 269.5 / 270.5 +2.3 / +2.7; red canopy 543–548 +1.0 … +2.4 |
| pyro | 6 / 1 / 0 (2 skipped, 1 dropped: below) | 32: 53.68 → 55.41 (+1.72, measured with the 1565.3 burst edit that was later dropped) | 69.3 / 53.5 | finale fan + split U wall: 1513.5 +5.7, 1514.5 +5.3, 1516.25 +2.5, 1521.5 +2.9, 1523.5 +8.9, 1527 +8.5, but 1533 −8.5, 1534.5 −3.8, 1535.5 −3.5 (the red-lit air of the drone-behind shot, whose sky is black in the film); eruption wall (`lean` 24, red light) 1567 +6.7, 1567.5 +4.8, 1568 +6.1; CO2 `glow` 2.5 934 +2.1, 935 +5.3, 933 −2.9; green cloud 767.5 +3.9 / 767.75 −3.1 (net 0, the look as filmed) |
| lights | 7 / 9 / 2 | 45: 56.74 → 57.64 (+0.90) | 69.3 / 53.5 | flood gate 589.25 +9.6; spar lamps in place of the truss looks 375 +3.8, 376 +4.2, 397.5 +1.8, 398.5 +2.1; left spar-lamp stars 358.5–360.5 +1.7 … +2.7; booth spot dip 105 / 105.25 +1.8 / +2.3; lantern strobe 1223.75 +2.6, 1268.25 +2.7, 1268.75 +3.1, 1268 −1.3, 1269 −1.4; `flare` 674.5 +1.9 |
| lasers | 8 / 6 / 3 | 64: 64.14 → 65.92 (+1.77) | 69.3 / 53.5 (215.75 +1.8) | dense web 1259 +8.9, 1265 +10.8, 1270 +17.8, 1270.5 +19.5, 1271 +26.2, but 1269.5 −24.0 (fixed by the split below); front-floor sunburst 810.25 +8.2, 810.5 +7.5, 810.75 −3.0; lit clouds 208–215.75 +1.1 … +3.4, 217.5 −2.3; eye-level line + violet glow 1469.5 +5.0, 1470 +5.8, 1470.5 +5.3; green tents 1058.75 +5.7, cyan tents 1062.25 +3.1 / 1062.75 −3.0 |
| fx | 2 / 1 / 0 (1 proposal not applied) | 19: 62.16 → 64.58 (+2.42) | 69.4 / 53.6 (802.75 +5.9) | fog roll-out 1417 +21.1, 1417.25 +8.2; white smoke veil 802.75 +6.0, 803.25 +9.8; finale bank timing neutral |
| camera | 17 / 1 / 5 | 65: 55.13 → 60.43 (+5.30) | 69.4 / 53.6 (1414 +3.2) | dip to black v815: 815 +45.8, 815.25 +39.7; banking FPV v80.6: 80.75 +33.6 … 83.25 +13.8; MC `facing` 440.25–460 +2.6 … +11.3; fades / black 1412–1580 +0.9 … +5.2; FPV 1426 / 1441 −1.9 … +6.6; lead walk 725–728 +1.9 … +3.3, 724 −6.5 (her start on the podium) |
| env | 1 / 4 / 0 | 34: 66.38 → 69.83 (+3.45) | 69.5 / 53.8 (191.5 +5.7, 44.75 +0.8) | side-drone black sky 53 +16.4, 57 +17.3, 58.25 +16.6, 51.5 +6.4, 55 +5.2; darker drone sky 177–199.25 +5.8 … +6.8; teal rear-drone sky 23.5–50.75 +0.8 … +3.5; eruption glow timing + `ground` 8: 1565.5 +6.6, 1565.75 +1.4, 1566 +3.5, 1566.25 −2.2 |

### Own changes on top of the patches

| cue (show time) | change | measured |
|---|---|---|
| 1269.178 `lasers.look` (the lasers group's zigzag web) | split at the half beat s1269.553: the old flat `grid` web (deck_front + roof, 24 fans, tilt 3) stays for s1269.178–1269.553, the dense zigzag web runs s1269.553–1272.366. The film shows a band of flat crossing planes low over the field at v1269.25–1269.5 and the dense web with the lamp strings from v1269.75 (25 fps sheet). This removes the lasers group's one loss without a camera change | 1269.25 17.5 → 41.4, 1269.5 30.9 → 54.9, 1269.75 / 1270 / 1270.5 / 1271 within ±0.9 |
| 713.464 `stage.flash` head (stage add) | snapped to the half beat s713.546 (was −82 ms off the grid), end unchanged (dur 1.25 → 1.168). The 25 fps frames put the white head at v713.48–713.52, between the grid points; the steady-track rule wins | 713.5 / 713.75 / 714 / 714.5 ±0.1 |
| 96.0 `stage.flash` LED flicker (stage add) | snapped to the onset s95.965 (was +35 ms; the flicker is on at v96.02–96.10). The second flicker (s96.2) has no onset within 0.15 s and stays on the filmed flicker (v96.22–96.26) | 96 / 96.25 ±0.0 |

## Skipped / dropped

* **pyro 1515.273 / 1520.886 `pyro.gerb` arm cakes** (`group: fitted-drone-camera`): they pay off only with the
  pyro group's fitted drone-behind poses for the 1515.284 / 1520.964 shots, which are not in the camera patch; at the
  current camera the pyro group measured 1516.25 −0.10 and 1521.5 −0.07. The fitted poses themselves scored lower
  than the current camera (16 moments 1511.75–1536.75: 48.6 with the fitted poses vs 51.6 at the current camera,
  pyro group), so they were not added either.
* **pyro 1565.3 `pyro.burst` `light` 3.5 / `lightColor` #FF2008** (dropped after the env group): both groups relight
  the eruption red (pyro: a red site light on the burst; env: `atmos.glow` `amount` 3 + `ground` 8), each measured
  alone. Stacked, the site overshoots: with both vs env alone on 1565.25–1568: 57.92 → 59.45 without the burst light
  (1565.5 +5.8, 1565.75 +7.2, 1566 +3.3, 1566.25 −0.9, the rest ±0.0). The pyro wall edit (lean 24, red light 2,
  glow 0.6) stays: it carries the 1567–1568 gains.
* **fx proposal 602.08 `fog.lowfog`** (white field smoke v602.25–603.75): conditional on
  `LightingSystem.writeLowFog` honouring `p.fadeIn` / `p.release`; it still uses a fixed 2.5 s rise and 10 s linger
  (`deckSmoke` 8 s), so the 1.6 s bank would stay lit between the kicks where the film is dark. Not applied.
* The groups' own rejected variants (fireworks `notTaken`, pyro `not_applied`, lasers `notProposed`, the lights notes,
  env `notTested`) were not re-tested.

## Checked, kept

* **Cross-group moments.** 1268–1272 (stage festoons, lights strobe, lasers web) and 1565–1568 (pyro, env) were
  measured cumulatively; only the eruption needed a change (above).
* **Visual checks** (video | before | after, `$ENDSHOW_DATA/work/r11_cuepatch/vis*.jpg`): the comet wall v254.5 as
  dense as filmed; the orange right wing / violet left wing v515.5; gold festoon bulbs v165.5; the field-level
  sunburst v810.25 (closer, still sparser than filmed); green tents v1058.75; the warm smoke roll v1417 as filmed;
  the FPV bank v81.75 (the wing now runs along the right frame edge, sky on the left); the v815 dip to black; the
  MC from the front, castle stairs behind v446.25; the black side-drone sky v57; the lavender gated haze v589.25; the
  lead with the portal behind her v726.
* **Remaining losses** among the 381 touched moments (≥ 1.5): 724 −6.5 (the lead's walk starts on the podium, camera
  group), 1533 −8.5 / 1534.5 −3.7 / 1535.5 −3.6 (the red-lit air of the U wall; the film's sky is black there),
  1062.75 −3.0, 810.75 −2.8, 933 −2.9, 767.75 −2.8, 217.5 −2.3, 1538.5 −2.1, 1432.75 −2.0, 1429.75 −1.9, 55.5 −1.8.

## Tooling

* `scripts/validate-show.mjs`: knows the round-11 vocabulary the patches use: the spar lamp row (`spar_lamps` /
  `spar_lamp` / `wing_lamps`, read from the `T_SPARLAMP` entries of `src/lighting/rig.ts`, valid for
  `lights.blinder` only), `lights.pillars` `mode` `strobe`, and the environment params documented only in
  `src/world/Environment.ts` so far (`atmos.sky` `level` / `air`, `atmos.glow` `ground`).
* `scripts/check-sync.py`: the round-11 `stage.flash` counts as a hit (like `pulse` / `eyes_flash`).

## Measurement

Default 64 moments (`$ENDSHOW_DATA/work/sim/r11b_64`): 69.3 % / 53.5 % (colour 70.3, light 82.2, shape 57.0) →
**69.5 % / 53.8 %** (colour 70.4, light 82.6, shape 57.3); per track Vivaldi 65.7 → 66.0, Discorecord 68.8 → 69.9,
Sacred Oath 63.0 → 62.9, L.P.A. 73.3 → 73.3, Sacred Flame 63.0 → 63.6, Domitor 80.9 → 80.9, Embers 66.9 → 66.9,
In The Cold 75.2 → 75.6. Default-64 members that moved ≥ 0.4: 802.75 +6.0, 191.5 +5.8, 1414 +3.0, 215.75 +1.7,
1389.5 +0.9, 1438.5 +0.6, 44.75 +0.5, 362.5 −0.5, 1536.25 −0.4, 558.25 −0.9.
All 381 touched moments together (union of the groups' lists + 1269.25 and the eruption holdouts): 58.6 % / 39.5 %
→ **61.2 % / 43.3 %** (mean +2.59; colour 55.3 → 58.5, light 73.9 → 75.9, shape 51.0 → 53.1).
`validate-show` valid, 0 errors (expanded cues 4068 → 4086, the one existing > 4000 warning); `check-sync` steady
tracks 872 hits 99 % within 20 ms (the two new `stage.flash` hits: 719.714 −19 ms, 713.546 on the grid), free tempo 90
hits 70 % within 100 ms (96.2 +235 ms: no onset near the filmed flicker). `tsc --noEmit` passes. Mobile budget PASS
(843 / 1515 and 254.4 / 515.5 / 1057 / 1270.5 / 1417 / 1523.5 / 1566, default + overview): at most 106 draw calls
(1523.5 overview, as before the patches); triangles at 254.4 default 717 k → 752 k of 800 k (the denser comet wall).

## Open (requests to other groups)

* Lighting: `LightingSystem.writeLowFog` / `deckSmoke` should honour `fog.lowfog` `fadeIn` / `release` as
  `FogSystem` does; then apply the fx group's 602.08 proposal, and the 1510.434 bank's `release` 1 reaches the beams.
* Environment: document `atmos.sky` `level` / `air` and `atmos.glow` `ground` (and `amount` up to 4) in
  `docs/show-format.md` or a `docs/show-format-ext` page; the validator lists them in `SRC_PARAMS` until then.
* Lights docs: write the pillars `strobe` mode as `lights pillars \`mode\`: add \`strobe\`` (the idiom the validator
  parses) so its hard-coded `EXT_ENUM` entry can go.
* Camera: the drone-behind shot v1527–1535 (red-lit wall, black sky in the film: 1533 / 1534.5 / 1535.5 lose
  4–9 points) and v1270.0, which looks like a low field camera between the terrace frames of v1269.75 / 1270.25.
