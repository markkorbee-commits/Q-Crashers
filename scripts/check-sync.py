#!/usr/bin/env python3
"""Objective audio/visual sync check of the show file against the measured audio map.

    python3 scripts/check-sync.py [public/show/endshow-2026.json] [public/show/audio-map.json] [--list]

For every expanded hit cue (pyro, fireworks, strobe/lights hit, stage pulse/eyes_flash, crowd jump mood):
  * in a steady track: distance to the nearest half beat of the show's tempo map (which is the measured grid)
  * in the free-tempo spans: distance to the nearest measured onset (audio-map onsets[] / impacts)
Prints the distribution per region; --list prints the worst cues.
"""
import json, sys, bisect

args = [a for a in sys.argv[1:] if not a.startswith('--')]
show = json.load(open(args[0] if args else 'public/show/endshow-2026.json'))
amap = json.load(open(args[1] if len(args) > 1 else 'public/show/audio-map.json'))

tempo = sorted(show['tempo'], key=lambda s: s['start'])
ts = [s['start'] for s in tempo]
seg_conf = sorted(((s['start'], s.get('confidence', 1), s['region']) for s in amap['segments']))
sc_t = [x[0] for x in seg_conf]


def seg(t):
    return tempo[max(0, bisect.bisect_right(ts, t) - 1)]


def region(t):
    i = max(0, bisect.bisect_right(sc_t, t + 0.2) - 1)
    return seg_conf[i][2], seg_conf[i][1] >= 0.5


onsets = sorted([o['t'] for o in amap.get('onsets', [])] + [e['t'] for e in amap['events'] if e['type'] in ('impact', 'drop')])


def is_hit(c):
    return (c['sys'] in ('pyro', 'fireworks') or (c['sys'] in ('strobe', 'lights') and c['fx'] == 'hit')
            or (c['sys'] == 'stage' and c['fx'] in ('pulse', 'eyes_flash'))
            or (c['sys'] == 'crowd' and c['fx'] == 'mood' and (c.get('p') or {}).get('state') == 'jump'))


def expand(c):
    t0 = c['t']
    if c.get('snap') in ('beat', 'halfbeat', 'bar'):
        s = seg(t0)
        u = {'beat': 1, 'halfbeat': 0.5, 'bar': s.get('beatsPerBar', 4)}[c['snap']]
        t0 = s['anchor'] + round((t0 - s['anchor']) * s['bpm'] / 60 / u) * u * 60 / s['bpm']
    r = c.get('repeat')
    if not r:
        return [t0]
    out, t, k = [], t0, 0
    step_beats = {'halfbeat': 0.5, 'beat': 1, '2beat': 2, 'bar': 4, '2bar': 8, '4bar': 16, '8bar': 32}
    until, count = r.get('until', 1e9), r.get('count', 1e9)
    pat = r.get('pattern', 'x')
    fired = 0
    while t < until and fired < count and k < 4000:
        if pat[k % len(pat)] != '-':
            out.append(t)
            fired += 1
        k += 1
        e = r['every']
        if isinstance(e, (int, float)):
            t = t0 + k * e
        else:
            s = seg(t)
            nxt = t + step_beats[e] * 60 / s['bpm']
            s2 = seg(nxt)
            b = (nxt - s2['anchor']) * s2['bpm'] / 60 * 2
            sn = s2['anchor'] + round(b) / 2 * 60 / s2['bpm']
            t = sn if abs(sn - nxt) < 0.2 * 60 / s2['bpm'] else nxt
    return out


rows = []
for c in show['cues']:
    if not is_hit(c):
        continue
    for t in expand(c):
        reg, gridded = region(t)
        if gridded:
            s = seg(t)
            bl = 60 / s['bpm']
            b = (t - s['anchor']) / bl * 2
            d = (b - round(b)) / 2 * bl
        else:
            i = bisect.bisect_left(onsets, t)
            near = [onsets[j] for j in (i - 1, i) if 0 <= j < len(onsets)]
            d = min((t - o for o in near), key=abs) if near else 9
        rows.append((reg, gridded, t, d, c['sys'], c['fx']))

by = {}
for reg, gridded, t, d, *_ in rows:
    by.setdefault((gridded, reg), []).append(abs(d))
print(f"{'region':12s} {'kind':6s} {'hits':>5s} {'≤20ms':>6s} {'≤50ms':>6s} {'≤100ms':>7s} {'median':>7s}")
for (gridded, reg), ds in sorted(by.items(), key=lambda kv: (not kv[0][0], kv[0][1])):
    ds.sort()
    n = len(ds)
    f = lambda x: 100 * sum(1 for v in ds if v <= x) / n
    print(f"{reg:12s} {'grid' if gridded else 'onset':6s} {n:5d} {f(0.02):5.0f}% {f(0.05):5.0f}% {f(0.1):6.0f}% {ds[n // 2] * 1000:5.0f}ms")
all_g = [abs(d) for _, g, _, d, *_ in rows if g]
all_f = [abs(d) for _, g, _, d, *_ in rows if not g]
print(f"\nsteady tracks: {len(all_g)} hits, {100 * sum(1 for v in all_g if v <= 0.02) / max(1, len(all_g)):.0f}% within 20 ms of the grid")
print(f"free tempo:    {len(all_f)} hits, {100 * sum(1 for v in all_f if v <= 0.1) / max(1, len(all_f)):.0f}% within 100 ms of a measured onset")
if '--list' in sys.argv:
    for reg, gridded, t, d, sy, fx in sorted(rows, key=lambda r: -abs(r[3]))[:40]:
        print(f"  {t:9.3f} {reg:10s} {sy}.{fx:12s} {d * 1000:+6.0f} ms")
