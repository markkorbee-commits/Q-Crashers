#!/usr/bin/env python3
"""Contact sheet of official video frames with burned-in video-time labels.

    python3 tools/video/sheet.py <out.jpg> <t0> <t1> <step> [cols] [--frames <dir>]

t0/t1/step in VIDEO seconds (show time = video - 0.036). Frames come from $ENDSHOW_DATA/f4 (4 fps, frame i = i/4 s;
the frame for time t is round(t*4)), or --frames. A bare file name for <out.jpg> is written to
$ENDSHOW_DATA/work/sheets/. Exits with an error when the frames dir or all requested frames are missing.
Any python3 works: without Pillow it re-runs itself with $PYTHON or $ENDSHOW_DATA/venv/bin/python.
Example: 16 s per sheet at 1 fps, 4 columns:
    python3 tools/video/sheet.py sheet_03_a415.jpg 415 430 1 4
The sheet is derived from the copyrighted video: keep it in the data dir, never commit it.
"""
import os
import sys
from endshow_paths import data, work, opt, use_venv, frames_dir_or_exit

use_venv('PIL')
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

argv = sys.argv[1:]
frames = frames_dir_or_exit(opt(argv, 'frames', data('f4')))
pos = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or argv[i - 1] != '--frames')]
if len(pos) < 4:
    sys.exit(__doc__)
out, t0, t1, step = pos[0], float(pos[1]), float(pos[2]), float(pos[3])
cols = int(pos[4]) if len(pos) > 4 else 4
if not os.path.dirname(out):
    out = os.path.join(work('sheets'), out)
ts = []
t = t0
while t <= t1 + 1e-6:
    ts.append(t)
    t += step
w, h = 480, 270
rows = (len(ts) + cols - 1) // cols
im = Image.new('RGB', (cols * w, rows * h), (0, 0, 0))
d = ImageDraw.Draw(im)
f = None
for font in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',  # Linux
             '/System/Library/Fonts/Supplemental/Arial Bold.ttf',  # macOS
             '/Library/Fonts/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc'):
    try:
        f = ImageFont.truetype(font, 22)
        break
    except Exception:
        pass
if f is None:
    try:
        f = ImageFont.load_default(size=22)
    except TypeError:  # Pillow < 10.1
        f = ImageFont.load_default()
missing = 0
for k, t in enumerate(ts):
    p = os.path.join(frames, '%05d.jpg' % round(t * 4))
    if not os.path.exists(p):
        missing += 1
        continue
    x, y = (k % cols) * w, (k // cols) * h
    im.paste(Image.open(p), (x, y))
    lab = '%d:%05.2f' % (t // 60, t % 60)
    d.rectangle([x, y, x + 110, y + 28], fill=(0, 0, 0))
    d.text((x + 4, y + 2), lab, fill=(255, 255, 0), font=f)
if missing == len(ts):
    sys.exit('no video frames for %s-%s s in %s (frames not extracted for this range? tools/video/prepare-data.sh)' % (t0, t1, frames))
im.save(out, quality=82)
print(out, len(ts))
if missing:
    print('WARNING: %d of %d frames missing in %s (black tiles)' % (missing, len(ts), frames), file=sys.stderr)
