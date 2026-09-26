# Round 7 — show file: cue-side requests from round 6, look colours, visual-event timing audit

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-7 baseline 64.7 % raw / 46.5 % calibrated (colour 63.7, light 79.4, shape 53.8), per moment in
`research/video-timeline/data/similarity-mac-r7.json`. MEASUREMENT CHANGED on 27 Sep: the reference frames `f4` are
now exact (they showed video time k/4 + 0.12 s before) and cue seeds no longer depend on the cue's position in the
file, so per-moment numbers of older baselines and round-6 reports are not comparable. `vX` times in older notes that
were read from contact sheets can be ~0.12 s early (cuts, signals and features were always exact).

## 1. Cue requests from round 6 (apply, then render side by side)
- Lasers 803.734: split per the video: the zigzag web `{"t":803.734,"dur":0.2,…current zigzag…}`; trees with NO target
  (the 6 deck units) `{"t":803.934,"dur":0.5,"sys":"lasers","fx":"look","p":{"preset":"trees","color":"#2438FF","count":9,"spread":46,"height":10,"speed":1,"intensity":1,"fade":0.05}}`;
  a V web 804.434-804.859 with zigzag at default tilt and height ≈ 6 (not tilt −3). The validator knows preset "trees".
- 1435.918 / 1437.467 lime floor looks (#B0FF20): target the OUTER deck units (the video's lime beams come from the
  deck ends at the frame edges); the centre heads draw green wedges in front of the castle. End the 1435.918 pillars
  cue (#FF2050) at about 1437.8 (the video's lanterns go dark there).
- MC close-ups 348.25 / 351 / 403.5: the wash is red (#FF1830 / #FF2040), but the video is blue-lit at 348.25 and 351
  (blue beams, blue haze; a red ornament screen behind him at 348.25) and red-keyed at 403.5. Check each frame.
- 409-412: stage.state master 0.1 blacks out the dragon mouth and emblem; the video keeps them visibly pink/red
  through the white veil (≈ 0.3 for the dragon and emblem).
- Crown colours: 1323.467 has no rosettes, so add `"crownColor":"#FF2030"` (video: red wing outlines, fading);
  optionally crownColor "#FF2040" on 1320.564 and 1322.306.
- Heart 88.285: the fireworks engine has an `arc` param now (docs/show-format-ext/fireworks.md). Compare the current
  curl -120 with curl -190 + arc 270 against the video and keep the closer one.
- 1508.305 eruption: the video is dark by about v1509.6-1509.75; end the wall cues (firewall deck_front+side_front,
  flame arm_posts, fireball row) around 1509.55. The 1508.305 atmos.glow (amount 1.2, out 0.5) leaves the frame orange
  at 1510.25 while the video is dark purple there.
- 1565.3 atmos.glow red veil (amount 0.8, smoke 0.4) hides the white fountain wall, which the video shows as tall,
  bright white columns.
- Deck lit air now depends on fog.lowfog on the deck: add it only where the film shows lit smoke around the
  performers (348.25 and 403.5 are dark close-ups; a veil there cost 16-32 points).

## 2. Look colours vs the video (major: colour is the weakest part at these moments)
- 509.25 (0.37, colour 0.00): the video is a purple/blue wash over the whole set; ours has the castle base lit
  white/grey and red pillars. 1047.25 (0.50): the video is a purple-blue dragon; ours has a bright window row.
- 167 (0.44, colour 0.18): the video is a purple/white dragon and wings; ours has green emitters (per the stage fixer,
  our wash is still fading green → blue at 166.964, inside the 0.08 s fade of the cue at 166.946).
- 289.25 (0.48, colour 0.22), 338 (0.53), 20.25 (0.55): the video is blue/purple dominated; ours is red/pink.
Check each look's palette / wash / castleColor / content colours against 1 fps sheets of the surrounding section and
fix the colours in the cues (the stage group fixes engine-side castle brightness in parallel).

## 3. Visual-event timing audit (the frame offset)
Cues placed from contact sheets before 27 Sep may be ~0.12 s early. Steady-track hits are grid-snapped and free-tempo
hits onset-snapped, so those are fine. Audit the NON-snapped visual events (look changes, fades, stage.state
changes, fog bursts, colour changes) against the exact per-frame signals (`$ENDSHOW_DATA/signals/NN.txt`, and
`$ENDSHOW_DATA/features.npz` read with numpy) and move a cue only where the signal proves it.

## Verify / stop
After every edit: `node scripts/validate-show.mjs --quiet` (0 errors) and `python3 scripts/check-sync.py`. Measure the
touched moments and the default 64 (`--out "$ENDSHOW_DATA/work/sim/r7_show_64"`); never commit a change that lowers
the 64-moment calibrated score. Keep the one-cue-per-line format and change only your own cue lines.

Files you own: public/show/endshow-2026.json EXCEPT cues with sys "camera", public/show/audio-map.json (only for a
provably wrong onset), scripts/check-sync.py, docs/show-format.md, research/video-timeline/*.md (your notes).
NOT: any src/**, camera cues, scripts/similarity.mjs, docs/show-format-ext/** (other fixers own them in this round).
