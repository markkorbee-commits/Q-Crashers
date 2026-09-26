# Round 8 — show file: cue requests from round 7

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-8 baseline 67.1 % raw / 50.2 % calibrated (colour 67.9, light 80.5, shape 54.8),
per moment in `research/video-timeline/data/similarity-mac-r8.json`. Each request below was measured in the page by a
round-7 fixer (show times). Apply, re-measure, keep what holds; reject with a note where the video disagrees.

## Lights
- 645.554 lights.flood stage #B01010 0.8 → 0.4-0.5 (0.4: 656 +1.9, 680.5 +2.9, 690 −0.9, 705 −1.7). Same time
  lights.look floor (#B00A0A / color2 #FFF0C0, tilt 38): drop color2 or make it red (the cream head aims up as a white
  column at 656 / 680.5).
- 1322.306 lights.wash #000000 0: add "fade": 0.1 (the pink wash stays on the wings until ~1323.3; video unlit 1322.5).
- 166.946-167.71: lighting says the video is violet at 167.0 and turns green at 167.75; you made 167 a green/purple
  flicker in round 7 (0.63). Verify on the 25 fps features and the exact frames which colour is right when.
- 1155.366 lights.pillars #42EEFD 1 → 0.4 (crystals dim in the laser sea 1163-1175; visual).
- 1508.36 lights.flood (area all, #FF7A20, 1.1, dur 1.2, fade 1.2): keeps field and air orange until ~1510.76, the
  video is dark purple at 1510.25 (lights off there: 1510.25 14.8 → 66.0 %). Fade ≤ 0.4 or a shorter dur.
- 509.25: the lantern pillars are lit red over the full shaft (pillars #FF2040, shaftIntensity 0.9); the video shows
  dark pillars with a lit orange-red lantern: lower shaftIntensity there.

## Stage / fog / atmos
- 409.227 stage.state: add "glowFloor": 0.6 (new, validated) so mouth and emblem stay pink/red through the veil.
- 1046.364 stage.garlands (dur 0.85) ends at 1047.214; the video still shows the lamp strings at 1047.25: extend to
  ~1047.7.
- 802.75 (0.48): add a low white smoke bank for the montage: `{"t":797.0,"dur":8,"sys":"fog","fx":"lowfog","p":{"area":"all","density":1.5,"color":"#FFFFFF"}}` (in page: 802.75 47.9 → 50.3).
- 1565.3 atmos.glow (#ff2418, 0.8, smoke 0.4) + 1564.815 atmos.sky (#FF3010, 0.12): the whole frame incl. the sky turns
  dull red; the video sky is black and only the field and the U glow (1566 colour 0.0). Lower the sky tint and the
  glow's smoke share there.

## Lasers (each measured in the page)
- 1051.265 deck_front grid: "height": 1.2, "intensity": 0.3 (1051.75 +19, 1053 +12).
- 1503.66 grid: "color": "#B040FF", "color2": "#6040FF" (1504 +12.5, 1505 +6).
- 133.315 deck_front grid "intensity": 0.3; 145.544 deck_front grid "intensity": 0.25 (139.75 +2.5, 142.5 +1).
- 1124.428 crossfire "tilt": 12 → 4 (1124.75 +1, 1125.5 +1.3).
- 803.734: the video changes figure every frame (lines v803.80, wedges v803.88-804.0, X v804.04-804.12, V v804.20-
  804.28, Λ tents v804.36, hourglass v804.44, V v804.52-804.60): put a short trees look at ~804.30-804.45 inside the
  zigzag.
Rejected before (do not retry): 1163.241 sweep on towers only, 1269.178 grid deck_front only, 317.979 as zigzag,
206.69 roof fans as a roof sheet, height 1.8 on the 133.315/145.544 grids.

## Fireworks / pyro cue params
- "glow": 1 on fireworks.comet 557.872 and 558.646 (558.25 +1.2, 558.75 +3.2).
- "column": true on pyro.gerb 1565.3 (height 32, #FFF2E0, the white U wall); consider "intensity": 2 after the red veil
  fix (1566 +1.4 with the veil).
- pyro.gerb 1192.116 (and 1198.116) colour #FFB0E0 renders magenta (the engine pushes pale colours with saturation
  ≥ 0.2); use #FFD8F0 (white-pink as filmed); dur 1.9 → ~1.75 (columns gone by v1193.9).

## Verify / stop
validate-show 0 errors, check-sync; touched moments + default 64 (`--out "$ENDSHOW_DATA/work/sim/r8_show_64"`), never
lower the 64-moment calibrated score. One cue per line; only your own cue lines.
Files you own: public/show/endshow-2026.json EXCEPT cues with sys "camera", scripts/check-sync.py, docs/show-format.md,
research/video-timeline/*.md (your notes). NOT: any src/**, camera cues, other scripts.
