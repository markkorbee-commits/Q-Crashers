#!/usr/bin/env python3
"""Store a similarity run as a committed numbers-only baseline (no paths, no images).

  python3 tools/video/sim-baseline.py <run dir with report.json> <out.json> "<what: machine, date, code state>"
"""
import json
import sys

src, out, what = sys.argv[1], sys.argv[2], sys.argv[3]
r = json.load(open(f'{src}/report.json'))
keep = ('t', 'track', 'score', 'colour', 'light', 'shape')
b = {
    'what': what,
    'overall': r['overall'],
    'baselineOtherMoment': r['baselineOtherMoment'],
    'normalised': r['normalised'],
    'parts': r['parts'],
    'tracks': r['tracks'],
    'pairs': [{k: p[k] for k in keep if k in p} for p in r['pairs']],
}
json.dump(b, open(out, 'w'), indent=1)
print(f"{out}: {b['overall']} % raw / {b['normalised']} % calibrated over {len(b['pairs'])} moments")
