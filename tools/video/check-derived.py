#!/usr/bin/env python3
"""Compare the freshly computed cut list + signal tables in $ENDSHOW_DATA with the committed reference copies, and make
every tool read the reference numbers (the ones the show was built from).

    python3 tools/video/check-derived.py [--ref research/video-timeline/data] [--tol 0.04]

Called by tools/video/prepare-data.sh (step 5). Outcomes:
  identical        exit 0.
  small drift      (>= 95 % of the cuts match within --tol s; expected with another ffmpeg version / CPU architecture,
                   e.g. Homebrew ffmpeg 8 on Apple Silicon vs the static ffmpeg 7.0.2 on x86_64 the originals came from):
                   the fresh files are kept as cuts.local.json and signals.local/, the committed copies are installed as
                   cuts.json and signals/ so all agents read the reference numbers. Prints a WARNING line, exit 0.
  large difference (< 95 % of the cuts match): most likely a different video file or encode. Nothing is replaced;
                   check the video's sha256 (HANDOFF.md step 4). Exit 3.
"""
import json
import os
import shutil
import sys
from endshow_paths import REPO, data, opt

argv = sys.argv[1:]
ref = opt(argv, 'ref', os.path.join(REPO, 'research', 'video-timeline', 'data'))
tol = float(opt(argv, 'tol', '0.04'))
loc_cuts, ref_cuts = json.load(open(data('cuts.json'))), json.load(open(os.path.join(ref, 'cuts.json')))
names = sorted(f for f in os.listdir(os.path.join(ref, 'signals')) if f.endswith('.txt'))


def read(p):
    return open(p).read().splitlines() if os.path.exists(p) else None


diff_lines = total_lines = diff_files = 0
for n in names:
    a, b = read(data('signals', n)), read(os.path.join(ref, 'signals', n))
    total_lines += len(b)
    if a != b:
        diff_files += 1
        diff_lines += len(b) if a is None else sum(x != y for x, y in zip(a, b)) + abs(len(a) - len(b))

if loc_cuts == ref_cuts and not diff_files:
    print(f'  cuts.json ({len(ref_cuts)} cuts) and signals/*.txt identical to the committed copies')
    sys.exit(0)

# greedy one-to-one matching of cut times within tol
matched = 0
used = set()
for t in loc_cuts:
    best = min((k for k in range(len(ref_cuts)) if k not in used and abs(ref_cuts[k] - t) <= tol),
               key=lambda k: abs(ref_cuts[k] - t), default=None)
    if best is not None:
        used.add(best)
        matched += 1
share = matched / max(len(loc_cuts), len(ref_cuts), 1)
print(f'  cuts: {len(loc_cuts)} computed here vs {len(ref_cuts)} committed; {matched} match within {tol} s ({100 * share:.1f} %)')
print(f'  signals: {diff_files} of {len(names)} tables differ, {diff_lines} of {total_lines} lines')
if share < 0.95:
    print('ERROR: the cut list differs substantially from the committed one: probably a different video file/encode. '
          'Check `shasum -a 256 "$ENDSHOW_DATA/video/endshow.mp4"` against HANDOFF.md step 4. Nothing was replaced.')
    sys.exit(3)
# small drift: keep the local numbers aside, install the reference numbers
shutil.move(data('cuts.json'), data('cuts.local.json'))
shutil.copyfile(os.path.join(ref, 'cuts.json'), data('cuts.json'))
shutil.rmtree(data('signals.local'), ignore_errors=True)
shutil.move(data('signals'), data('signals.local'))
shutil.copytree(os.path.join(ref, 'signals'), data('signals'))
print('WARNING: small differences (another ffmpeg version / CPU architecture than the originals). The committed copies '
      'from research/video-timeline/data/ are now installed as cuts.json + signals/ (the reference the show was built '
      'from); the numbers computed here are kept as cuts.local.json + signals.local/. Nothing else to do.')
