#!/usr/bin/env python3
"""Camera cuts + per-0.5 s signal tables from features.npz, one table per span.

    python3 tools/video/signals.py [--features <npz>] [--index <spans/index.json>] [--out <dir>]

Defaults: $ENDSHOW_DATA/features.npz, $ENDSHOW_DATA/spans/index.json (tools/video/split.py), output into
$ENDSHOW_DATA (cuts.json + signals/NN.txt). All times are VIDEO time; show time = video - 0.036.
Committed copies (numbers only): research/video-timeline/data/cuts.json and data/signals/NN.txt.
Cut rule: HSV-histogram distance > 0.28 to the previous frame, the 4x4 luma grid changes persistently
(> 0.035 two frames later) and it is not a flash (a +0.06 luma jump that falls back); cuts >= 0.4 s apart.
"""
import json
import os
import sys
import numpy as np
from endshow_paths import data, opt

argv = sys.argv[1:]
feat = opt(argv, 'features', data('features.npz'))
index = opt(argv, 'index', data('spans', 'index.json'))
out = opt(argv, 'out', data())
F = np.load(feat)
fps = int(F['fps'])
n = len(F['luma'])
t = np.arange(n) / fps
g = F['grid']
hd = F['hdist']
L = F['luma']
cuts = []
for i in range(2, n - 3):
    if hd[i] > 0.28:
        persist = np.abs(g[i + 2] - g[i - 1]).mean()
        flash = L[i] - L[i - 1] > 0.06 and abs(L[i + 2] - L[i - 1]) < 0.03
        if persist > 0.035 and not flash and (not cuts or t[i] - cuts[-1] > 0.4):
            cuts.append(round(float(t[i]), 2))
os.makedirs(os.path.join(out, 'signals'), exist_ok=True)
json.dump(cuts, open(os.path.join(out, 'cuts.json'), 'w'))
HUE = ['red', 'orange', 'yellow', 'chartreuse', 'green', 'spring', 'cyan', 'azure', 'blue', 'violet', 'magenta', 'rose']
flashes = [round(float(t[i]), 2) for i in range(1, n) if L[i] - L[i - 1] > 0.05]
idx = json.load(open(index))
for s in idx:
    a, b = s['t0'], s['t1']
    lines = [f"# span {s['k']:02d}: video {a:.2f}-{b:.2f} s (show time = video - 0.036). Columns per 0.5 s: luma(0-1) dark% white% fire% fireUpper% fireLower% whiteUpper% | top saturated hues (% of frame)",
             f"# camera cuts (video s): {[c for c in cuts if a <= c < b]}",
             f"# sudden brightening frames (flash/strobe/fireball candidates, luma +0.05 in 1/25 s): {[f for f in flashes if a <= f < b]}"]
    for k in np.arange(a, b, 0.5):
        m = (t >= k) & (t < k + 0.5)
        if not m.any():
            continue
        hue = F['hue'][m].mean(0)
        top = np.argsort(-hue)[:2]
        hs = ' '.join(f"{HUE[j]} {hue[j] * 100:.1f}" for j in top if hue[j] > 0.003)
        mark = ' CUT' if any(k <= c < k + 0.5 for c in cuts) else ''
        lines.append(f"{k:7.1f} {L[m].mean():.2f} {F['dark'][m].mean() * 100:3.0f} {F['white'][m].mean() * 100:4.1f} {F['fire'][m].mean() * 100:4.1f} "
                     f"{F['fireU'][m].mean() * 100:4.1f} {F['fireL'][m].mean() * 100:4.1f} {F['whiteU'][m].mean() * 100:4.1f} | {hs}{mark}")
    open(os.path.join(out, 'signals', f"{s['k']:02d}.txt"), 'w').write('\n'.join(lines) + '\n')
print(len(cuts), 'cuts;', len(flashes), 'flash frames ->', out)
