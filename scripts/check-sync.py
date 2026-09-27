#!/usr/bin/env python3
"""Objective audio/visual sync check of the show file against the measured audio map.

    python3 scripts/check-sync.py [public/show/endshow-2026.json] [public/show/audio-map.json] [--list] [--region R]

For every expanded hit cue (pyro, fireworks, strobe/lights hit, stage pulse/eyes_flash, crowd jump mood) it takes the
VISIBLE hit time and compares it with the music:
  * in a steady track: distance to the nearest half beat of the show's tempo map (which is the measured grid)
  * in the free-tempo spans: distance to the nearest measured onset (audio-map onsets[] / impacts)

Visible hit time (what the eye sees land on the music):
  * fireworks shell / salvo: the BREAK = cue t + rise, rise = p.rise when given, else the engine's
    riseTime(height - launch height) = 0.8 + 0.021 * (H - y0) s (src/fireworks/FireworkSystem.ts). The launch height
    y0 comes from the target anchors (src/data/layout.gen.ts; salvos launch from the centroid, shells from each point);
    salvo patterns break their lowest shells first (v: 0.75 H, arc: 0.9 H, random: 0.8 H, line: H).
  * fireworks cake with a shell `type` (a break at the top of each comet): cue t + the comet burnout time
    clamp(0.5 + 0.013 * height, 0.6, 1.8) s. Plain cakes, comets, mines, flares and finales: the launch (cue t),
    since their comets / sparks are visible from the ground up.
  * pyro, strobe, lights, stage (pulse, eyes_flash and the round-11 head / dragon `flash`), crowd: cue t.
Rakes: a repeat with a numeric `every` < 0.4 s (a comet rake, a volley fired as a texture) scores only its FIRST shot;
the follow-up shots are counted on a separate line and not scored (they are a timed sequence, not musical accents).
Prints the distribution per region; --list prints the worst hits (cue t, visible t, kind, offset).
"""
import json, os, re, sys, bisect

args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt_region = sys.argv[sys.argv.index('--region') + 1] if '--region' in sys.argv else None
if opt_region in args:
    args.remove(opt_region)
show = json.load(open(args[0] if args else 'public/show/endshow-2026.json'))
amap = json.load(open(args[1] if len(args) > 1 else 'public/show/audio-map.json'))

tempo = sorted(show['tempo'], key=lambda s: s['start'])
ts = [s['start'] for s in tempo]
seg_conf = sorted(((s['start'], s.get('confidence', 1), s['region']) for s in amap['segments']))
sc_t = [x[0] for x in seg_conf]

# launch positions of the anchors (generated from research/terrain-layout.json)
ANCH = {}
_gen = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'layout.gen.ts')
try:
    for m in re.finditer(r'^\s*([a-z_0-9]+):\s*(\[\[.*?\]\]),?\s*$', open(_gen).read(), re.M):
        ANCH[m.group(1)] = json.loads(m.group(2))
except OSError:
    pass
# cake / comet `type` values that end in a shell break (src/fireworks/shells.ts SHELLS keys)
BREAK_TYPES = {'peony', 'chrysanthemum', 'dahlia', 'willow', 'palm', 'crossette', 'ring', 'strobe', 'crackle',
               'brocade', 'kamuro', 'glitter', 'swimmer', 'heart', 'spider', 'horsetail', 'fish'}


def seg(t):
    return tempo[max(0, bisect.bisect_right(ts, t) - 1)]


def region(t):
    i = max(0, bisect.bisect_right(sc_t, t + 0.2) - 1)
    return seg_conf[i][2], seg_conf[i][1] >= 0.5


onsets = sorted([o['t'] for o in amap.get('onsets', [])] + [e['t'] for e in amap['events'] if e['type'] in ('impact', 'drop')])


def is_hit(c):
    return (c['sys'] in ('pyro', 'fireworks') or (c['sys'] in ('strobe', 'lights') and c['fx'] == 'hit')
            or (c['sys'] == 'stage' and c['fx'] in ('pulse', 'eyes_flash', 'flash'))
            or (c['sys'] == 'crowd' and c['fx'] == 'mood' and (c.get('p') or {}).get('state') == 'jump'))


def num(v, d):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else d


def launch_points(c, fallback):
    tg = c.get('target', 'all')
    tg = tg if isinstance(tg, list) else [tg]
    base = ANCH.get(fallback, [[0, 0, 0]])
    out = []
    for t in tg:
        if t == 'all':
            return base
        if t in ANCH:
            out += ANCH[t]
        elif t == 'left':
            out += [p for p in base if p[0] < -0.01]
        elif t == 'right':
            out += [p for p in base if p[0] > 0.01]
        elif t == 'center':
            out += [p for p in base if abs(p[0]) < 12]
    return out or base


def rise_time(h):
    return 0.8 + 0.021 * max(0, h)


def visible(c, p):
    """(offset of the visible hit after the cue's own time, 'break' | 'launch')"""
    if c['sys'] != 'fireworks':
        return 0.0, 'launch'
    fx = c['fx']
    if fx in ('shell', 'salvo'):
        H0 = min(400, max(15, num(p.get('height'), 90)))
        if 'rise' in p:
            return max(0.0, num(p['rise'], 0)), 'break'
        if fx == 'salvo':
            pts = launch_points(c, 'fireworks_back')
            y0 = sum(q[1] for q in pts) / len(pts)
            k = {'v': 0.75, 'arc': 0.9, 'random': 0.8}.get(p.get('pattern', 'line'), 1.0)
            return rise_time(max(H0 * k, y0 + 12) - y0), 'break'
        if 'x' in p or 'z' in p:
            y0 = 0.0
        else:
            y0 = max(q[1] for q in launch_points(c, 'fireworks_back'))
        return rise_time(max(H0, y0 + 12) - y0), 'break'
    if fx == 'cake' and p.get('type') in BREAK_TYPES:
        h = min(200, max(3, num(p.get('height'), 35)))
        return min(1.8, max(0.6, 0.5 + 0.013 * h)), 'break'
    return 0.0, 'launch'


def expand(c):
    """[(time, params, rake follow-up?)] of the cue's expanded shots"""
    p0 = c.get('p') or {}
    t0 = c['t']
    if c.get('snap') in ('beat', 'halfbeat', 'bar'):
        s = seg(t0)
        u = {'beat': 1, 'halfbeat': 0.5, 'bar': s.get('beatsPerBar', 4)}[c['snap']]
        t0 = s['anchor'] + round((t0 - s['anchor']) * s['bpm'] / 60 / u) * u * 60 / s['bpm']
    r = c.get('repeat')
    if not r:
        return [(t0, p0, False)]
    out, t, k = [], t0, 0
    step_beats = {'halfbeat': 0.5, 'beat': 1, '2beat': 2, 'bar': 4, '2bar': 8, '4bar': 16, '8bar': 32}
    until, count = r.get('until', 1e9), r.get('count', 1e9)
    pat = r.get('pattern', 'x')
    cyc = r.get('cycle') or {}
    e = r['every']
    rake = isinstance(e, (int, float)) and e < 0.4
    fired = 0
    while t < until and fired < count and k < 4000:
        if pat[k % len(pat)] != '-':
            p = dict(p0)
            for key, vals in cyc.items():
                if isinstance(vals, list) and vals:
                    p[key] = vals[fired % len(vals)]
            out.append((t, p, rake and fired > 0))
            fired += 1
        k += 1
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
rakes = {}
for c in show['cues']:
    if not is_hit(c):
        continue
    for tc, p, follow in expand(c):
        dv, kind = visible(c, p)
        t = tc + dv
        reg, gridded = region(t)
        if follow:
            rakes[reg] = rakes.get(reg, 0) + 1
            continue
        if gridded:
            s = seg(t)
            bl = 60 / s['bpm']
            b = (t - s['anchor']) / bl * 2
            d = (b - round(b)) / 2 * bl
        else:
            i = bisect.bisect_left(onsets, t)
            near = [onsets[j] for j in (i - 1, i) if 0 <= j < len(onsets)]
            d = min((t - o for o in near), key=abs) if near else 9
        rows.append((reg, gridded, t, d, c['sys'], c['fx'], tc, kind))

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
nb = sum(1 for r in rows if r[7] == 'break')
print(f"\nsteady tracks: {len(all_g)} hits, {100 * sum(1 for v in all_g if v <= 0.02) / max(1, len(all_g)):.0f}% within 20 ms of the grid")
print(f"free tempo:    {len(all_f)} hits, {100 * sum(1 for v in all_f if v <= 0.1) / max(1, len(all_f)):.0f}% within 100 ms of a measured onset")
print(f"({nb} hits scored at the firework break; rake follow-up shots not scored: "
      + (', '.join(f'{k} {v}' for k, v in sorted(rakes.items())) or 'none') + ')')
if '--list' in sys.argv:
    sel = [r for r in rows if not opt_region or r[0] == opt_region]
    print(f"\n  {'cue t':>9s} {'visible':>9s} {'region':10s} {'hit':18s} {'kind':6s} {'offset':>7s}")
    for reg, gridded, t, d, sy, fx, tc, kind in sorted(sel, key=lambda r: -abs(r[3]))[:40]:
        print(f"  {tc:9.3f} {t:9.3f} {reg:10s} {sy + '.' + fx:18s} {kind:6s} {d * 1000:+6.0f} ms")
