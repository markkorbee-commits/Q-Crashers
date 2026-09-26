#!/usr/bin/env python3
"""Merge the span files back into a full show file and validate it.

    python3 tools/video/merge.py [--out <path>] [--show public/show/endshow-2026.json]

Reads $ENDSHOW_DATA/spans/NN.json (see split.py), takes everything except the cues from --show (default: the
project's show file), replaces the cues with the spans' cues, copies section label/kind/energy/palette/track edits
(section start/end stay on the audio), writes the compact house format (one cue per line) to --out
(default $ENDSHOW_DATA/work/merged.json) and runs scripts/validate-show.mjs on it (must print "valid", 0 errors).
Apply a checked candidate with:  cp "$ENDSHOW_DATA/work/merged.json" public/show/endshow-2026.json
then `python3 scripts/check-sync.py` and `node scripts/validate-show.mjs --quiet` again before committing.
"""
import glob
import json
import os
import subprocess
import sys
from endshow_paths import REPO, SHOW, data, work, opt

argv = sys.argv[1:]
out = opt(argv, 'out', os.path.join(work(), 'merged.json'))
show = json.load(open(opt(argv, 'show', SHOW)))
cues = []
files = sorted(glob.glob(os.path.join(data('spans'), '[0-9][0-9].json')))
if not files:
    sys.exit(f"no span files in {data('spans')} (run tools/video/split.py first)")
for p in files:
    d = json.load(open(p))
    a, b = d['span']
    bad = [c['t'] for c in d['cues'] if not (a - 0.001 <= c['t'] < b + 0.001)]
    if bad:
        print(f'WARNING {os.path.basename(p)}: {len(bad)} cues outside span {a}-{b}: {bad[:5]}')
    cues += d['cues']
    # section edits: label/kind/energy/palette/track only (start/end stay on the audio)
    for es in d.get('sections', []):
        for s in show['sections']:
            if abs(s['start'] - es['start']) < 1e-6:
                for k in ('label', 'kind', 'energy', 'palette', 'track'):
                    if k in es:
                        s[k] = es[k]
show['cues'] = sorted(cues, key=lambda c: c['t'])


def compact(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))


parts = []
for k, v in show.items():
    parts.append(f'  "{k}": [\n' + ',\n'.join('    ' + compact(x) for x in v) + '\n  ]' if isinstance(v, list) else f'  "{k}": ' + compact(v))
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w').write('{\n' + ',\n'.join(parts) + '\n}\n')
print('merged', len(cues), 'cues ->', out)
r = subprocess.run(['node', 'scripts/validate-show.mjs', '--quiet', os.path.abspath(out)], cwd=REPO, capture_output=True, text=True)
print('\n'.join(line for line in (r.stdout + r.stderr).splitlines() if '⚠' in line or '✗' in line or 'valid' in line))
