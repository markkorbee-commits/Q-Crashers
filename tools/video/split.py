#!/usr/bin/env python3
"""Split the show cues into span files (by section boundaries) for per-span video matching.

    python3 tools/video/split.py [--show public/show/endshow-2026.json] [--force]

Writes $ENDSHOW_DATA/spans/NN.json = {span:[t0,t1], sections:[...], cues:[...]} (show seconds), spans/index.json and
spans/source.json (provenance: sha256 of the show file and of every span's cues at split time; merge.py uses it to
refuse a merge that would silently revert cues edited in the show file after the split).
The 11 spans follow the approximate cut points below, snapped to the nearest section start (section starts come
from the audio and never move, so the span boundaries are stable). Existing span files are the WORK of the span
workflow (tools/workflows/video-match.js edits them): they are only overwritten with --force.
Merge them back with tools/video/merge.py. Re-split with --force right before every new video-match run (unless you
are resuming that same run): span files split from an older show file carry old cues.
"""
import datetime
import hashlib
import json
import os
import sys
from endshow_paths import REPO, SHOW, data, opt


def cues_hash(cues):
    return hashlib.sha256(json.dumps(cues, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


argv = sys.argv[1:]
show_path = opt(argv, 'show', SHOW)
out = data('spans')
if os.path.exists(os.path.join(out, 'index.json')) and '--force' not in argv:
    sys.exit(f'{out} already holds span files (possibly edited). Re-split from the show file with --force.')
os.makedirs(out, exist_ok=True)
raw = open(show_path, 'rb').read()
show = json.loads(raw)
secs = show['sections']
# span cut points (approx) -> snapped to the nearest section start
CUTS = [0, 114, 273, 420, 567, 638, 760, 886, 1098, 1318, 1450, 1581.2]
starts = [s['start'] for s in secs]
cp = [0] + [min(starts, key=lambda s: abs(s - c)) for c in CUTS[1:-1]] + [1e9]
idx = []
src = {'show': os.path.relpath(os.path.abspath(show_path), REPO), 'sha256': hashlib.sha256(raw).hexdigest(), 'cues': len(show['cues']),
       'split_at': datetime.datetime.now().astimezone().isoformat(timespec='seconds'), 'spans': {}}
for k in range(len(cp) - 1):
    a, b = cp[k], cp[k + 1]
    cues = [c for c in show['cues'] if a <= c['t'] < b]
    json.dump({'span': [a, min(b, show['meta']['duration'])], 'sections': [s for s in secs if a <= s['start'] < b], 'cues': cues},
              open(os.path.join(out, f'{k:02d}.json'), 'w'), indent=0, ensure_ascii=False)
    idx.append({'k': k, 't0': a, 't1': min(b, show['meta']['duration']), 'cues': len(cues), 'first': secs[starts.index(a)]['label']})
    src['spans'][f'{k:02d}'] = {'lo': a, 'hi': b, 'cues': len(cues), 'sha256': cues_hash(cues)}
json.dump(idx, open(os.path.join(out, 'index.json'), 'w'), indent=1, ensure_ascii=False)
json.dump(src, open(os.path.join(out, 'source.json'), 'w'), indent=1, ensure_ascii=False)
for i in idx:
    print(i)
