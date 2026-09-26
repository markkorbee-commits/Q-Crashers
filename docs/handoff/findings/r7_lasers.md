# Round 7 — lasers: laser moments vs the video (sea, fans, trees), per section

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on):
round-7 baseline 64.7 % raw / 46.5 % calibrated (colour 63.7, light 79.4, shape 53.8), per moment in
`research/video-timeline/data/similarity-mac-r7.json`. MEASUREMENT CHANGED on 27 Sep: the reference frames `f4` are
now exact (they showed video time k/4 + 0.12 s before) and cue seeds no longer depend on the cue's position in the
file, so per-moment numbers of older baselines and round-6 reports are not comparable.

Round 5-6 (docs/show-format-ext/lasers.md): laser drift on show time, laser air light / ceiling, the 'trees' preset
(the show group switches 803.734 to it this round).

## 1. Laser-dominated moments (major)
1169.5 (0.40, colour 0.21): the video is a bright blue laser sea filling the lower half with blue haze above; ours
has a smaller sea with separate beams. 1120.5 (0.44), 1145, 1194 (0.51), 1243 (0.54), 1389.5, 142.5: compare each
laser look against the video (1 fps sheets of 1110-1250 and 1380-1400, 0.25 s frames around the looks): sheet
extent, brightness, colour, beam count, scan speed, and how the sea reads from the drone.

## 2. Laser look audit across the show
Go through every lasers.look cue family (fan, sheet, tunnel, sweep, crossfire, sky, wave, cone, grid, burst, chevron,
zigzag, trees): render 2-3 representative moments per family side by side with the video and fix engine-side
mismatches (width, glow, haze interaction, far-distance fade). Cue-side mismatches go into contractRequests with
exact times and params.

## 3. Trees preset check
After the show group's 803.734 split, check the trees at 803.9-804.4 against the video (5 standing Λ trees, apex
~10 m, legs to the deck) and tune the preset.

## Verify / stop
Per iteration: `--times 1120.5,1145,1169.5,1194,1243,1389.5,142.5,803.9,289.25,802.75` then the default 64
(`--out "$ENDSHOW_DATA/work/sim/r7_lasers_64"`). Never commit a change that lowers the 64-moment calibrated score.
Deterministic in show time; mobile budget PASS.

Files you own: src/lasers/**, docs/show-format-ext/lasers.md.
NOT: src/fx/**, src/pyro/**, src/fireworks/**, src/stage/**, src/crowd/**, src/camera/**, src/lighting/**,
src/world/**, src/postfx/**, scripts/**, public/show/*.json (other fixers own them in this round).
