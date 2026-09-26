#!/usr/bin/env python3
"""Merge the span files back into a full show file and validate it.

    python3 tools/video/merge.py [--out <path>] [--show public/show/endshow-2026.json] [--spans 3,5] [--force]

Reads $ENDSHOW_DATA/spans/NN.json (see split.py) and takes everything except the cues from --show (default: the
project's show file). Without --spans every span's cues replace all cues of the show; with --spans only the cues
inside those spans' windows are replaced and the rest of the show is kept as it is now (use this to render or apply
one agent's span while other spans are still being edited). Section label/kind/energy/palette/track edits of the
merged spans are copied (section start/end stay on the audio). Writes the compact house format (one cue per line)
to --out (default $ENDSHOW_DATA/work/merged.json) and runs scripts/validate-show.mjs on it (must print "valid",
0 errors).

STALE-SPAN CHECK: split.py records in spans/source.json the sha256 of the show file and of every span's cues at split
time. If the show file changed inside a merged span's window since then (fixers or show passes edited cues there),
the merge would silently revert those edits: merge.py then refuses (exit 1) and reports per span how many current
show cues the merge would drop. Re-split (`split.py --force`) and redo the span edit, or pass --force to accept.
Span files without spans/source.json (split before this check existed) are refused the same way.

Apply a checked candidate with:  cp "$ENDSHOW_DATA/work/merged.json" public/show/endshow-2026.json
then `python3 scripts/check-sync.py` and `node scripts/validate-show.mjs --quiet` again before committing.
"""
import glob
import hashlib
import json
import os
import subprocess
import sys
from collections import Counter
from endshow_paths import REPO, SHOW, data, work, opt

argv = sys.argv[1:]
force = '--force' in argv
out = opt(argv, 'out', os.path.join(work(), 'merged.json'))
show_path = opt(argv, 'show', SHOW)
raw = open(show_path, 'rb').read()
show = json.loads(raw)
spans_dir = data('spans')
files = sorted(glob.glob(os.path.join(spans_dir, '[0-9][0-9].json')))
if not files:
    sys.exit(f'no span files in {spans_dir} (run tools/video/split.py first)')
sel = opt(argv, 'spans')
if sel:
    want = {f'{int(k):02d}' for k in sel.split(',') if k.strip()}
    files = [p for p in files if os.path.basename(p)[:2] in want]
    missing = want - {os.path.basename(p)[:2] for p in files}
    if missing:
        sys.exit(f'span files not found in {spans_dir}: {sorted(missing)}')


def canon(c):
    return json.dumps(c, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def cues_hash(cues):
    return hashlib.sha256(canon(cues).encode()).hexdigest()


spans = {os.path.basename(p)[:2]: json.load(open(p)) for p in files}
src_path = os.path.join(spans_dir, 'source.json')
src = json.load(open(src_path)) if os.path.exists(src_path) else None


def window(kk, d):
    """[lo, hi) of the span in show seconds (hi of the last span is open)"""
    if src and kk in src['spans']:
        return src['spans'][kk]['lo'], src['spans'][kk]['hi']
    return d['span'][0], d['span'][1] + 0.001


# ---- stale-span check
stale = []
if src is None or src['sha256'] != hashlib.sha256(raw).hexdigest():
    if src is None:
        stale.append(f'{src_path} missing: these span files were split before the provenance check existed, so nothing '
                     'tells whether the show file changed since (differences below may also be span edits)')
    for kk, d in spans.items():
        lo, hi = window(kk, d)
        cur = [c for c in show['cues'] if lo <= c['t'] < hi]
        rec = src['spans'].get(kk) if src else None
        if rec and cues_hash(cur) == rec['sha256']:
            continue
        lost = sum((Counter(canon(c) for c in cur) - Counter(canon(c) for c in d['cues'])).values())
        if src is None and not lost:
            continue
        then = f"{rec['cues']} cues at the split, " if rec else ''
        stale.append(f'span {kk} ({lo:.1f}-{min(hi, show["meta"]["duration"]):.1f} s): {then}{len(cur)} in the show now, '
                     f'{len(d["cues"])} in the span file; the merge would drop {lost} current show cue(s)')
if stale:
    print('STALE SPANS: the show file differs from the one these spans were split from' +
          (f' (split at {src["split_at"]})' if src else '') + ':')
    for s in stale:
        print('  ' + s)
    if not force:
        sys.exit('refused: re-split (`python3 tools/video/split.py --force`, after saving span edits you want to keep) '
                 'and redo the span edits, merge only untouched spans with --spans, or pass --force to overwrite the '
                 'newer show cues')
    print('--force: merging anyway')

# ---- merge
if sel:
    wins = [window(kk, d) for kk, d in spans.items()]
    cues = [c for c in show['cues'] if not any(lo <= c['t'] < hi for lo, hi in wins)]
else:
    cues = []
for kk, d in spans.items():
    a, b = d['span']
    bad = [c['t'] for c in d['cues'] if not (a - 0.001 <= c['t'] < b + 0.001)]
    if bad:
        print(f'WARNING {kk}.json: {len(bad)} cues outside span {a}-{b}: {bad[:5]}')
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
print('merged', len(cues), 'cues', f'(spans {",".join(spans)} into the current show)' if sel else f'({len(spans)} spans)', '->', out)
r = subprocess.run(['node', 'scripts/validate-show.mjs', '--quiet', os.path.abspath(out)], cwd=REPO, capture_output=True, text=True)
print('\n'.join(line for line in (r.stdout + r.stderr).splitlines() if '⚠' in line or '✗' in line or 'valid' in line))
sys.exit(1 if r.returncode else 0)
