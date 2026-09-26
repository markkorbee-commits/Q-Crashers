# Data pipeline verification (cloud container, 26 Sep 2026)

How the ported tools were checked against the data the project was built with. Frame and feature files themselves
are derived from the copyrighted video and stay in `$ENDSHOW_DATA`; only these numbers are recorded here.

## Frames (`tools/video/extract-frames.sh`)

Original extraction: one ffmpeg 7.0.2 pass over the whole video,
`ffmpeg -i endshow.mp4 -vf "fps=4,scale=480:270:flags=area" -q:v 4 -start_number 0 f4/%05d.jpg` (6324 frames).
The script uses the same filter chain; partial ranges and parallel chunks seek with `-ss <index/4>`, number their
first frame `round(ss*4)` and are cut with `-frames:v`.

| Check | Result |
|---|---|
| 600-620 s (80 frames, 1 job) vs the original frames, mean abs pixel difference | same index 0.000 (max 0.000); index-1 11.02 (min 0.04); index+1 10.88 (min 0.04); same index best match 80/80; byte-identical 80/80 |
| 600-620 s in 2 chunks (boundary at 610 s) | identical numbers, byte-identical 80/80 |
| 1560 s to the end in 2 chunks (last chunk runs to the end of the video) | 84 frames 06240-06323, byte-identical 84/84 |

The ±1 minimum of 0.04 comes from still frames; on average a neighbouring index differs by ~11 grey levels, the
same index by 0.

## Features (`scripts/video-features.py` + `tools/video/combine.py`)

The original `features.npz` was built as 4 chunks of 400 s without overlap, so the cut metric `hdist` is 0 at the
first frame of each chunk. `prepare-data.sh` starts every chunk after the first one frame (0.04 s) early and
`combine.py` drops that frame, so the result no longer depends on the chunk count.

| Check | Result |
|---|---|
| 396-404 s as 2 overlapping chunks vs one pass | all 12 feature arrays identical (max diff 0) |
| one pass vs the original `features.npz` (frames 9900-10099) | identical except `hdist` at the chunk starts (frame 9900 = start of the test window, 10000 = original chunk boundary: 0.000 original vs 0.022 true) |
| true `hdist` at the other original boundaries | 800 s: 0.070, 1200 s: 0.046 — all far below the cut threshold 0.28, so the cut list is unaffected |

## Cuts and signals (`tools/video/signals.py`)

Run on the original `features.npz` and `spans/index.json`: `cuts.json` (370 cuts) and `signals/00-10.txt` are
byte-identical to the originals, which are committed in `research/video-timeline/data/`. `prepare-data.sh` repeats
this comparison on the Mac.

## Span round trip (`tools/video/split.py` + `tools/video/merge.py`)

Splitting `public/show/endshow-2026.json` into 11 spans and merging them back gives a byte-identical show file
(2998 cues, validator: valid, 0 warnings).

## Browser launcher (`scripts/lib/browser.mjs`)

On the cloud container (Linux, no /dev/dri) it resolves to the same Chromium and the same SwiftShader flags as before.
`scripts/similarity.mjs` at 411.5 s and 1047.25 s, old and new script run concurrently against the same dev server:
old 8.1 % / 27.4 % (overall 17.8 %), new 8.1 % / 27.3 % (overall 17.7 %). A separate earlier pair gave 7.5 / 27.3
(old) and 8.1 / 12.1 (new, under much higher CPU load): the 1047.25 s render depends on how many frames are drawn
during the settle time after a seek, which is why `similarity.mjs` now has `--min-frames`.
