#!/usr/bin/env python3
"""Pin the one-off hit cues of the free-tempo parts to the nearest measured onset (idempotent).

    python3 scripts/snap-free-hits.py [public/show/endshow-2026.json] [public/show/audio-map.json] [--dry]

Domitor Draconis, the Vivaldi opening, the Discorecord intro, the bridge and the outro have no steady beat, so
the grid snap of scripts/retime-show.py does not apply there. Every cluster of cues that contains a one-off hit
(pyro, strobe/lights hit, stage pulse/eyes_flash, crowd jump; fireworks and repeats excluded) and lies in such a
span moves, as a whole, to the nearest measured onset (audio-map onsets[], >= 15 dB) within 0.45 s. Cues,
section starts and moments sharing the cluster time move with it. Grid repeats of hits inside those spans (bar
hits on an assumed tempo) are first replaced by one-off hits on the strongest measured accent of each step.
"""
import json, sys, bisect

args = [a for a in sys.argv[1:] if not a.startswith('--')]
path = args[0] if args else 'public/show/endshow-2026.json'
show = json.load(open(path))
amap = json.load(open(args[1] if len(args) > 1 else 'public/show/audio-map.json'))
WIN, MIN_DB, CL = 0.45, 15.0, 0.06

free = [(s['start'] - 0.2, s['end'] + 0.2) for s in amap['segments'] if s.get('confidence', 1) < 0.5]
onsets = sorted((o['t'], max(o['low'], o['bb'])) for o in amap.get('onsets', []) if max(o['low'], o['bb']) >= MIN_DB)
ot = [o[0] for o in onsets]


def in_free(t):
    return any(a <= t < b for a, b in free)


def is_hit(c):
    if c.get('repeat') or c['sys'] == 'fireworks':
        return False
    return (c['sys'] == 'pyro' or (c['sys'] in ('strobe', 'lights') and c['fx'] == 'hit')
            or (c['sys'] == 'stage' and c['fx'] in ('pulse', 'eyes_flash'))
            or (c['sys'] == 'crowd' and c['fx'] == 'mood' and (c.get('p') or {}).get('state') == 'jump'))


# 1) grid repeats inside free spans (bar-level hits on an assumed tempo) become one-off hits on the music's
#    real accents: per nominal step the strongest onset within +-40 % of the step, none where there is no accent
tempo = sorted(show['tempo'], key=lambda s: s['start'])
tts = [s['start'] for s in tempo]
STEP = {'halfbeat': 0.5, 'beat': 1, '2beat': 2, 'bar': 4, '2bar': 8, '4bar': 16, '8bar': 32}
converted, added = 0, []
for c in list(show['cues']):
    r = c.get('repeat')
    if not r or c['sys'] == 'fireworks' or not in_free(c['t']) or isinstance(r.get('every'), (int, float)):
        continue
    if not (c['sys'] in ('pyro', 'strobe', 'lights', 'stage')):
        continue
    seg = tempo[max(0, bisect.bisect_right(tts, c['t']) - 1)]
    step = STEP.get(r['every'], 4) * 60 / seg['bpm']
    until = r.get('until', c['t'] + step * r.get('count', 1))
    cyc = r.get('cycle') or {}
    target, k, last = c['t'], 0, -1e9
    while target < until - 0.05 and k < 400:
        lo, hi = target - 0.4 * step, target + 0.4 * step
        i0, i1 = bisect.bisect_left(ot, max(lo, last + 0.5 * step)), bisect.bisect_right(ot, min(hi, until))
        if i1 > i0:
            j = max(range(i0, i1), key=lambda q: onsets[q][1])
            one = {kk: vv for kk, vv in c.items() if kk not in ('repeat', 'snap')}
            one['t'] = round(ot[j], 3)
            one['p'] = dict(c.get('p') or {})
            for kk, vals in cyc.items():
                one['p'][kk] = vals[len([a for a in added if a[0] is c]) % len(vals)]
            added.append((c, one))
            last = ot[j]
            target = ot[j] + step
        else:
            target += step
        k += 1
    show['cues'].remove(c)
    converted += 1
show['cues'] += [one for _, one in added]
print(f'{converted} free-span grid repeats -> {len(added)} one-off hits on measured accents')

# the nominal grid of a free span means nothing: a `snap` there would pull a placed cue off its accent
unsnapped = 0
for c in show['cues']:
    if c.get('snap') and not c.get('repeat') and in_free(c['t']):
        del c['snap']
        unsnapped += 1
if unsnapped:
    print(f'{unsnapped} grid snaps removed in free spans')

times = sorted(set(round(c['t'], 3) for c in show['cues'] if is_hit(c) and in_free(c['t'])))
clusters = []
for t in times:
    if clusters and t - clusters[-1][-1] < CL:
        clusters[-1].append(t)
    else:
        clusters.append([t])

moves = []
used = set()
for cl in clusters:
    t = cl[0]
    i = bisect.bisect_left(ot, t)
    best = None
    for j in range(max(0, i - 4), min(len(ot), i + 4)):
        d = ot[j] - t
        if abs(d) <= WIN and j not in used and (best is None or abs(d) < abs(best[1])):
            best = (j, d)
    if best is None or abs(best[1]) < 0.02:
        if best:
            used.add(best[0])
        continue
    used.add(best[0])
    moves.append((cl[0] - CL / 2, cl[-1] + CL / 2, best[1]))


def shift(t):
    for a, b, d in moves:
        if a <= t <= b:
            return round(t + d, 3)
    return t


n = 0
for c in show['cues']:
    t1 = shift(c['t'])
    if t1 != c['t']:
        n += 1
        if c.get('dur') and c['dur'] > 2:
            c['dur'] = round(max(0.05, c['dur'] - (t1 - c['t'])), 3)  # keep the cue's end
        c['t'] = t1
for m in show.get('moments', []):
    m['t'] = shift(m['t'])
secs = show['sections']
for i, s in enumerate(secs):
    s['start'] = shift(s['start'])
for i, s in enumerate(secs):
    s['end'] = secs[i + 1]['start'] if i + 1 < len(secs) else s['end']
show['cues'].sort(key=lambda c: c['t'])
print(f'{len(moves)} hit clusters pinned to onsets ({n} cues moved); mean |shift| '
      f'{sum(abs(d) for *_, d in moves) / max(1, len(moves)) * 1000:.0f} ms')

if '--dry' not in sys.argv:
    def compact(v):
        return json.dumps(v, ensure_ascii=False, separators=(',', ':'))

    parts = []
    for k, v in show.items():
        if isinstance(v, list):
            parts.append(f'  "{k}": [\n' + ',\n'.join('    ' + compact(x) for x in v) + '\n  ]')
        else:
            parts.append(f'  "{k}": ' + compact(v))
    with open(path, 'w') as f:
        f.write('{\n' + ',\n'.join(parts) + '\n}\n')
