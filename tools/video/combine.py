#!/usr/bin/env python3
"""Combine the parallel feature chunks of scripts/video-features.py into one features.npz.

    python3 tools/video/combine.py [--dir $ENDSHOW_DATA/work/features] [--out $ENDSHOW_DATA/features.npz]

Chunks are feat_*.npz, ordered by their start time t0. A chunk that starts before the previous chunk ends
(prepare-data.sh starts every chunk after the first one frame early, so the cut metric 'hdist' of its first real
frame is measured against the true previous frame) has those overlapping leading frames dropped. The original
4 x 400 s chunks (no overlap) combine unchanged.
"""
import glob
import os
import sys
from endshow_paths import data, work, opt, use_venv

use_venv('numpy')
import numpy as np  # noqa: E402

argv = sys.argv[1:]
src = opt(argv, 'dir', work('features'))
out = opt(argv, 'out', data('features.npz'))
paths = glob.glob(os.path.join(src, 'feat_*.npz'))
if not paths:
    sys.exit(f'no feat_*.npz in {src}')
parts = sorted((np.load(p) for p in paths), key=lambda p: float(p['t0']))
fps = int(parts[0]['fps'])
keys = [k for k in parts[0].files if k not in ('fps', 't0')]
out_parts = {k: [] for k in keys}
end = None  # time of the first frame after the previous chunk
for p in parts:
    t0, n = float(p['t0']), len(p['luma'])
    skip = 0 if end is None else max(0, int(round((end - t0) * fps)))
    if end is not None and t0 > end + 0.5 / fps:
        sys.exit(f'gap between chunks: {end:.2f} s .. {t0:.2f} s')
    for k in keys:
        out_parts[k].append(p[k][skip:])
    end = t0 + n / fps
    print(f'chunk t0 {t0:8.2f} s  {n:6d} frames  (dropped {skip} overlapping)')
res = {k: np.concatenate(v) for k, v in out_parts.items()}
np.savez_compressed(out, fps=fps, **res)
print('frames', len(res['luma']), '=', len(res['luma']) / fps, 's ->', out)
