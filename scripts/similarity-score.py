#!/usr/bin/env python3
"""Score our renders against the official video frames (see scripts/similarity.mjs).

    python3 scripts/similarity-score.py <pairs.json> <out-prefix>

Per pair (both resized to 160x90):
  colour  = 1 - mean CIE76 ΔE of the 16x9 colour layouts / 40   (where the light and colour sit in the frame)
  light   = histogram intersection of the 32-bin luminance histograms   (dark/bright balance)
  shape   = SSIM of the 64x36 luminance images, mapped to 0..1          (structure: silhouettes, beams, bursts)
  score   = 0.45 colour + 0.25 light + 0.30 shape
Writes <out-prefix>.json (per pair + per track) and <out-prefix>.jpg (worst/best contact sheet), prints a summary.
"""
import json, sys
import numpy as np
from PIL import Image

pairs_path, prefix = sys.argv[1], sys.argv[2]
data = json.load(open(pairs_path))
TRACKS = [(0, 114.5, 'Vivaldi'), (114.5, 273, 'Discorecord'), (273, 566.9, 'Sacred Oath'), (566.9, 637.8, 'L.P.A.'),
          (637.8, 886.1, 'Sacred Flame'), (886.1, 1098.4, 'Domitor Draconis'), (1098.4, 1317.6, 'Embers'),
          (1317.6, 1581.2, 'In The Cold')]


def load(p, size):
    return np.asarray(Image.open(p).convert('RGB').resize(size, Image.BILINEAR), dtype=np.float64) / 255


def lab(rgb):
    c = np.where(rgb > 0.04045, ((rgb + 0.055) / 1.055) ** 2.4, rgb / 12.92)
    x = c @ np.array([[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]])
    x /= np.array([0.9505, 1.0, 1.089])
    f = np.where(x > 0.008856, np.cbrt(x), 7.787 * x + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def luma(rgb):
    return rgb @ np.array([0.2126, 0.7152, 0.0722])


def ssim(a, b):
    c1, c2 = 0.01 ** 2, 0.03 ** 2
    k = 7
    def blur(x):
        from numpy.lib.stride_tricks import sliding_window_view
        p = np.pad(x, k // 2, mode='edge')
        return sliding_window_view(p, (k, k)).mean((-1, -2))
    ma, mb = blur(a), blur(b)
    va, vb, cov = blur(a * a) - ma ** 2, blur(b * b) - mb ** 2, blur(a * b) - ma * mb
    return float((((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma ** 2 + mb ** 2 + c1) * (va + vb + c2))).mean())


def score_pair(ref_path, ours_path):
    r, o = load(ref_path, (160, 90)), load(ours_path, (160, 90))
    lr, lo = lab(load(ref_path, (16, 9))), lab(load(ours_path, (16, 9)))
    colour = max(0.0, 1 - float(np.linalg.norm(lr - lo, axis=-1).mean()) / 40)
    hr, _ = np.histogram(luma(r), 32, (0, 1))
    ho, _ = np.histogram(luma(o), 32, (0, 1))
    light = float(np.minimum(hr / hr.sum(), ho / ho.sum()).sum())
    shape = max(0.0, (ssim(luma(load(ref_path, (64, 36))), luma(load(ours_path, (64, 36)))) + 0.2) / 1.2)
    return colour, light, shape, 0.45 * colour + 0.25 * light + 0.30 * shape


rows = []
for p in data['pairs']:
    try:
        colour, light, shape, score = score_pair(p['ref'], p['ours'])
    except FileNotFoundError:
        continue
    track = next(n for a, b, n in TRACKS if a <= p['t'] < b)
    rows.append({'t': p['t'], 'track': track, 'colour': round(colour, 3), 'light': round(light, 3), 'shape': round(shape, 3),
                 'score': round(score, 3), 'ref': p['ref'], 'ours': p['ours']})

by = {}
for r in rows:
    by.setdefault(r['track'], []).append(r['score'])
summary = {n: round(100 * float(np.mean(by[n])), 1) for _, _, n in TRACKS if n in by}
overall = round(100 * float(np.mean([r['score'] for r in rows])), 1) if rows else 0
parts = {k: round(100 * float(np.mean([r[k] for r in rows])), 1) for k in ('colour', 'light', 'shape')} if rows else {}
# calibration: the real video against itself at another sampled moment (same show, wrong moment). 'normalised' maps
# that level to 0 % and identical frames to 100 %.
refs = [r['ref'] for r in rows]
base = float(np.mean([score_pair(refs[i], refs[(i + len(refs) // 2) % len(refs)])[3] for i in range(len(refs))])) if len(refs) > 1 else 0
normalised = round(100 * max(0.0, (overall / 100 - base) / (1 - base)), 1) if rows else 0
json.dump({'overall': overall, 'baselineOtherMoment': round(100 * base, 1), 'normalised': normalised, 'parts': parts, 'tracks': summary, 'pairs': rows, 'errors': data.get('errors', [])},
          open(prefix + '.json', 'w'), indent=1)

# contact sheet: the 6 worst and 6 best moments (video | ours)
srt = sorted(rows, key=lambda r: r['score'])
pick = srt[:6] + srt[-6:]
W, H = 320, 180
sheet = Image.new('RGB', (W * 4, H * 6), (0, 0, 0))
for i, r in enumerate(pick):
    x0 = (i // 6) * 2 * W
    y0 = (i % 6) * H
    sheet.paste(Image.open(r['ref']).convert('RGB').resize((W, H)), (x0, y0))
    sheet.paste(Image.open(r['ours']).convert('RGB').resize((W, H)), (x0 + W, y0))
sheet.save(prefix + '.jpg', quality=82)
print(f"overall {overall} %  (colour {parts.get('colour')}, light {parts.get('light')}, shape {parts.get('shape')})")
print(f"calibration: the real video vs another moment of itself scores {100 * base:.1f} % -> normalised similarity {normalised} %")
for k, v in summary.items():
    print(f"  {k:18s} {v:5.1f} %")
print(f"{len(rows)} moments; worst: " + ', '.join(f"{r['t']:.1f}s {100 * r['score']:.0f}%" for r in srt[:5]))
