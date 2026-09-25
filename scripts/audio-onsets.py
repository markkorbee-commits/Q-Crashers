#!/usr/bin/env python3
"""Measure the strong hits (onsets) of the free-tempo parts of the Endshow audio and store them in the audio map.

    python3 scripts/audio-onsets.py [public/assets/audio/endshow-2026.mp3] [public/show/audio-map.json]

The beat grid cannot place effects in the parts without a steady pulse (Vivaldi, the Discorecord intro,
the bridge, Domitor Draconis, the outro): there the orchestral / piano hits ARE the sync points. For every
10 ms frame this computes the level (dB) of the < 200 Hz band and of the 100 Hz - 8 kHz band, picks
sharp jumps of >= 12 dB within 40 ms (the largest within +-150 ms) and writes `onsets: [{t, low, bb}]` (derived
numbers only, no audio) into the audio map. scripts/retime-show.py uses them as hit anchors.
Needs numpy + scipy and ffmpeg (PATH, or the imageio-ffmpeg binary).
"""
import json, shutil, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfiltfilt

audio = sys.argv[1] if len(sys.argv) > 1 else 'public/assets/audio/endshow-2026.mp3'
amap_path = sys.argv[2] if len(sys.argv) > 2 else 'public/show/audio-map.json'
amap = json.load(open(amap_path))

ffmpeg = shutil.which('ffmpeg')
if not ffmpeg:
    try:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit('ffmpeg not found (install ffmpeg or `pip install imageio-ffmpeg`)')
SR = 24000  # 240-sample frames = exactly 10 ms
raw = subprocess.run([ffmpeg, '-v', 'error', '-i', audio, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                     check=True, capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)

# free-tempo spans = audio-map segments without a trustworthy grid
free = [(s['start'] - 1.0, s['end'] + 1.0) for s in amap['segments'] if s.get('confidence', 1) < 0.5]  # +1 s margins
spans = []
for a, b in sorted(free):
    if spans and a <= spans[-1][1] + 0.01:
        spans[-1] = (spans[-1][0], max(spans[-1][1], b))
    else:
        spans.append((a, b))

FR = int(0.01 * SR)


def level_db(sos):
    y = sosfiltfilt(sos, x) ** 2
    n = len(y) // FR
    return 10 * np.log10(y[: n * FR].reshape(n, FR).mean(1) + 1e-10)


low = level_db(butter(4, 200, 'low', fs=SR, output='sos'))
bb = level_db(butter(2, [100, 8000], 'band', fs=SR, output='sos'))


def jump(e):
    """dB jump into frame j over the quietest of the previous 40 ms: sharp attacks, also inside loud passages"""
    n = len(e)
    j = np.full(n, -99.0)
    for k in range(1, 5):
        j[4:] = np.maximum(j[4:], e[4:] - np.minimum.reduce([e[4 - m:n - m] for m in range(1, k + 1)]))
    return j


jl, jb = jump(low), jump(bb)
score = np.maximum(jl, jb)
onsets = []
for a, b in spans:
    i0, i1 = max(5, int(a * 100)), min(len(score) - 16, int(b * 100))
    for i in range(i0, i1):
        # a peak of >= 12 dB, the largest within +-150 ms
        if score[i] >= 12 and score[i] == score[max(i0, i - 15):i + 16].max():
            if onsets and i / 100 - onsets[-1]['t'] < 0.15:
                continue
            # the attack starts one frame before the level arrives
            onsets.append({'t': round((i - 0.5) / 100, 3), 'low': round(float(jl[i]), 1), 'bb': round(float(jb[i]), 1)})

amap['onsets'] = onsets
amap.setdefault('description', '')
if 'onsets[]' not in amap['description']:
    amap['description'] += (' onsets[] = sharp hits in the free-tempo spans: dB jump within 40 ms of the < 200 Hz band `low` and the'
                            ' 100 Hz-8 kHz band `bb` (>= 12 dB), attack instant; scripts/audio-onsets.py.')
def compact(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))


parts = []
for k, v in amap.items():
    if isinstance(v, list):
        parts.append(f'"{k}":[\n' + ',\n'.join(compact(i) for i in v) + '\n]')
    else:
        parts.append(f'"{k}":' + compact(v))
with open(amap_path, 'w') as f:
    f.write('{' + ',\n'.join(parts) + '}\n')
print(f'{len(onsets)} onsets in {len(spans)} free-tempo spans -> {amap_path}')
