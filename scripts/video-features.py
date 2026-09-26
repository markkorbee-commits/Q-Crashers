#!/usr/bin/env python3
"""Per-frame features of the official Endshow video (local file, never committed) for show reconstruction.

    python3 scripts/video-features.py <video.mp4> <out.npz> [--fps 25] [--w 192] [--ss start] [--t duration]

Decodes the video at low resolution and stores, per frame: luma (mean and a 4x4 grid), dark fraction,
white-hot fraction, fire fraction (saturated bright red..yellow), 12 hue bins of saturated bright pixels,
upper/lower-half splits of fire and white (sky fireworks vs stage pyro), and the HSV-histogram distance to the
previous frame (camera cuts). Derived numbers only.
"""
import sys, subprocess, shutil
import numpy as np

src, out = sys.argv[1], sys.argv[2]
ss = float(sys.argv[sys.argv.index('--ss') + 1]) if '--ss' in sys.argv else 0.0
dur = float(sys.argv[sys.argv.index('--t') + 1]) if '--t' in sys.argv else 0.0
fps = int(sys.argv[sys.argv.index('--fps') + 1]) if '--fps' in sys.argv else 25
W = int(sys.argv[sys.argv.index('--w') + 1]) if '--w' in sys.argv else 192
H = W * 9 // 16
ffmpeg = shutil.which('ffmpeg')
if not ffmpeg:
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
seek = (['-ss', str(ss)] if ss else []) + (['-t', str(dur)] if dur else [])
proc = subprocess.Popen([ffmpeg, '-v', 'error', *seek, '-i', src, '-vf', f'fps={fps},scale={W}:{H}:flags=area', '-f', 'rawvideo',
                         '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE, bufsize=10 ** 8)
FB = W * H * 3
CH = 250
feats = {k: [] for k in ('luma', 'grid', 'dark', 'white', 'fire', 'hue', 'fireU', 'fireL', 'whiteU', 'whiteL', 'hdist', 'rgb')}
prev_hist = None


def hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 1e-6, d / (mx + 1e-6), 0)
    return h, s, mx


n = 0
while True:
    buf = proc.stdout.read(FB * CH)
    if not buf:
        break
    k = len(buf) // FB
    x = np.frombuffer(buf[:k * FB], dtype=np.uint8).reshape(k, H, W, 3).astype(np.float32) / 255
    h, s, v = hsv(x)
    luma = 0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]
    feats['luma'].append(luma.mean((1, 2)))
    feats['grid'].append(luma.reshape(k, 4, H // 4, 4, W // 4).mean((2, 4)).reshape(k, 16))
    feats['rgb'].append(x.mean((1, 2)))
    feats['dark'].append((v < 0.08).mean((1, 2)))
    white = (s < 0.25) & (v > 0.85)
    fire = (s > 0.55) & (v > 0.55) & ((h < 50) | (h > 345))
    feats['white'].append(white.mean((1, 2)))
    feats['fire'].append(fire.mean((1, 2)))
    half = H // 2
    feats['fireU'].append(fire[:, :half].mean((1, 2)))
    feats['fireL'].append(fire[:, half:].mean((1, 2)))
    feats['whiteU'].append(white[:, :half].mean((1, 2)))
    feats['whiteL'].append(white[:, half:].mean((1, 2)))
    col = (s > 0.5) & (v > 0.5)
    hb = np.clip((h / 30).astype(int), 0, 11)
    feats['hue'].append(np.stack([(col & (hb == i)).mean((1, 2)) for i in range(12)], 1))
    # cut metric: HSV histogram (8 hue x 3 sat x 4 val) L1 distance to the previous frame
    idx = (np.clip((h / 45).astype(int), 0, 7) * 12 + np.clip((s * 3).astype(int), 0, 2) * 4 + np.clip((v * 4).astype(int), 0, 3))
    hist = np.stack([np.bincount(idx[i].ravel(), minlength=96) for i in range(k)]).astype(np.float32) / (H * W)
    pv = np.concatenate([[hist[0] if prev_hist is None else prev_hist], hist[:-1]])
    feats['hdist'].append(np.abs(hist - pv).sum(1) / 2)
    prev_hist = hist[-1]
    n += k
    if n % 5000 < CH:
        print(f'{n / fps:7.1f} s', flush=True)
proc.wait()
np.savez_compressed(out, fps=fps, t0=ss, **{k: np.concatenate(v) for k, v in feats.items()})
print(f'{n} frames -> {out}')
