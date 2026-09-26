#!/usr/bin/env python3
"""Resolve a merge conflict in public/show/endshow-2026.json at CUE level.

When two fixers edited the show file in parallel with disjoint ownership (e.g. the camera group owns sys "camera", the
show group everything else), git often reports conflicts on adjacent lines. Run this during the conflicted merge:

  python3 tools/video/merge-show-cues.py --ours-sys camera      # our side (HEAD) owns camera cues, theirs the rest

It reads the three stages (:1 base, :2 ours, :3 theirs) from the git index, checks that each side only changed the
cues it owns (and which top-level keys changed), writes the merged file in the one-cue-per-line house format and
validates it. Stage it with git add afterwards.
"""
import json
import subprocess
import sys

PATH = 'public/show/endshow-2026.json'
args = sys.argv[1:]
ours_sys = set(args[args.index('--ours-sys') + 1].split(',')) if '--ours-sys' in args else {'camera'}


def stage(n):
    return json.loads(subprocess.run(['git', 'show', f':{n}:{PATH}'], capture_output=True, text=True, check=True).stdout)


base, ours, theirs = stage(1), stage(2), stage(3)
canon = lambda c: json.dumps(c, sort_keys=True)
mine = lambda c: c['sys'] in ours_sys


def part(show, own):
    return sorted(canon(c) for c in show['cues'] if mine(c) == own)


ok = True
if part(ours, False) != part(base, False):
    print('WARNING: ours changed cues it does not own'); ok = False
if part(theirs, True) != part(base, True):
    print('WARNING: theirs changed cues it does not own'); ok = False
res = dict(theirs)
for k in base:
    if k == 'cues':
        continue
    co, ct = canon(ours.get(k)) != canon(base.get(k)), canon(theirs.get(k)) != canon(base.get(k))
    if co and ct:
        print(f'WARNING: both sides changed top-level "{k}" (keeping theirs)'); ok = False
    elif co:
        res[k] = ours[k]
res['cues'] = sorted([c for c in theirs['cues'] if not mine(c)] + [c for c in ours['cues'] if mine(c)], key=lambda c: c['t'])
compact = lambda v: json.dumps(v, ensure_ascii=False, separators=(',', ':'))
parts = [f'  "{k}": [\n' + ',\n'.join('    ' + compact(x) for x in v) + '\n  ]' if isinstance(v, list) else f'  "{k}": ' + compact(v) for k, v in res.items()]
open(PATH, 'w').write('{\n' + ',\n'.join(parts) + '\n}\n')
print(f'merged {len(res["cues"])} cues (ours: {",".join(sorted(ours_sys))}; theirs: the rest)')
r = subprocess.run(['node', 'scripts/validate-show.mjs', '--quiet'], capture_output=True, text=True)
print((r.stdout + r.stderr).strip().splitlines()[-1])
sys.exit(0 if ok and r.returncode == 0 else 1)
