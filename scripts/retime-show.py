#!/usr/bin/env python3
"""Re-time the authored Endshow timeline onto the measured audio map.

    python3 scripts/retime-show.py [show.json] [audio-map.json] [--dry] [--report research/retime-report.md]

Input: the authored show (public/show/endshow-2026.json) whose section starts / tempo grid came from the
storyboard + research, and the measured audio map (public/show/audio-map.json, scripts in research/audio-map.md).

What it does
1. Tempo: replaces `tempo[]` with the measured per-track grids (audio-map segments), marked source 'analyzed'.
   Every gridded region is shifted from the kick-body grid of the audio map to the audible kick ATTACK
   (mid/HF transient, measured by folding the 0.3-6 kHz onset strength over each segment's beats) plus 10 ms
   (P-centre allowance). Hardstyle kicks sweep from the click into the sub over up to ~0.1 s: flashes on
   the sub body look late (see ATTACK below and research/audio-map.md §1).
2. Sections: every section start moves to the recommended audio time (+ the region's attack shift when it is a
   grid time); ends follow the next start.
3. Cues / moments / chapters: a monotone piecewise-linear warp through (authored section start -> new start)
   maps every time. Cues that sat on the authored beat grid (same track tempo) are re-snapped to the new
   grid (beat or half-beat); long cue ends and repeat `until`s are warped (and snapped) the same way;
   short cues (<= 2 s) keep their duration.
The show file is rewritten in place (one cue per line) unless --dry. One-shot: it refuses an already re-timed file.
"""
import json, sys, bisect, argparse

ap = argparse.ArgumentParser()
ap.add_argument('show', nargs='?', default='public/show/endshow-2026.json')
ap.add_argument('amap', nargs='?', default='public/show/audio-map.json')
ap.add_argument('--dry', action='store_true')
ap.add_argument('--report', default=None)
args = ap.parse_args()

show = json.load(open(args.show))
amap = json.load(open(args.amap))
if show['tempo'] and all(s.get('source') == 'analyzed' for s in show['tempo']):
    sys.exit(f'{args.show} is already re-timed (tempo source "analyzed"): this is a one-shot migration of the authored timeline')
DUR = float(amap['duration'])

# ---------------------------------------------------------------------------------------------- 1. tempo
# measured attack phase (s) of each gridded region relative to the audio-map (kick-body) grid, + 0.010 P-centre
# (fold of the 0.3-6 kHz onset strength per segment, 2026-09-25; consistent within ±5 ms inside each region)
ATTACK = [
    # (region, from, to, shift)
    ('disco', 0, 1e9, -0.022 + 0.010),
    ('oath', 0, 341.17, +0.024 + 0.010),     # "kick 2" part: on-beat click, sub 0.12 s later
    ('oath', 341.17, 1e9, -0.083 + 0.010),   # main Oath kick: attack a 16th before the sub body
    ('lpa', 0, 1e9, -0.008 + 0.010),
    ('flame', 0, 1e9, -0.099 + 0.010),
    ('embers', 0, 1e9, -0.030 + 0.010),
    ('cold_a', 0, 1e9, +0.012 + 0.010),
    ('cold_b', 0, 1e9, -0.101 + 0.010),
    # pulse-less stretches carry their track's nominal grid: keep it continuous with the neighbouring track
    ('disco_intro', 0, 1e9, -0.022 + 0.010),
    ('bridge', 0, 1e9, -0.099 + 0.010),
    ('outro', 0, 1e9, -0.101 + 0.010),
]


def attack_shift(region, t):
    for r, a, b, s in ATTACK:
        if r == region and a <= t < b:
            return s
    return 0.0


segs = amap['segments']
new_tempo = []
for s in segs:
    sh = attack_shift(s['region'], s['start'])
    new_tempo.append({
        'start': round(0.0 if s['start'] <= 0 else s['start'] + sh, 3),
        'end': 0.0,
        'bpm': s['bpm'],
        'anchor': round(s['anchor'] + sh, 3),
        'kick': bool(s['kick']),
        'beatsPerBar': 4,
        'source': 'analyzed',
        '_region': s['region'],
        '_conf': s.get('confidence', 0),
    })
for i, s in enumerate(new_tempo):
    s['end'] = new_tempo[i + 1]['start'] if i + 1 < len(new_tempo) else round(DUR, 3)
starts_new = [s['start'] for s in new_tempo]

GRIDDED = {'disco', 'oath', 'lpa', 'flame', 'embers', 'cold_a', 'cold_b'}


def seg_new(t):
    i = max(0, bisect.bisect_right(starts_new, t) - 1)
    return new_tempo[i]


old_tempo = sorted(show['tempo'], key=lambda s: s['start'])
starts_old = [s['start'] for s in old_tempo]


def seg_old(t):
    i = max(0, bisect.bisect_right(starts_old, t) - 1)
    return old_tempo[i]


def grid_pos(seg, t):
    return (t - seg['anchor']) * seg['bpm'] / 60.0


def on_old_grid(t):
    """'beat' | 'halfbeat' | None — was t authored on the old grid (within 15 ms)?"""
    s = seg_old(t)
    b = grid_pos(s, t)
    bl = 60.0 / s['bpm']
    if abs(b - round(b)) * bl < 0.015:
        return 'beat'
    if abs(b * 2 - round(b * 2)) * bl / 2 < 0.015:
        return 'halfbeat'
    return None


def snap_new(t, unit):
    s = seg_new(t)
    u = 1.0 if unit == 'beat' else 0.5
    b = grid_pos(s, t) / u
    return s['anchor'] + round(b) * u * 60.0 / s['bpm']


def gridded_new(t):
    s = seg_new(t)
    return s['_region'] in GRIDDED and s['_conf'] >= 0.5


# ---------------------------------------------------------------------------------------------- 2. sections
secs = sorted(show['sections'], key=lambda s: s['start'])
corr = amap['sectionCorrections']
pairs = []
unmatched = []
used = set()
for i, sec in enumerate(secs):
    best = None
    for c in corr:
        if c['i'] in used:
            continue
        if c['label'] == sec['label'] and abs(c['authored'] - sec['start']) < 1.0:
            best = c
            break
    if best is None:
        for c in corr:
            if c['i'] not in used and c['i'] == i and abs(c['authored'] - sec['start']) < 1.0:
                best = c
                break
    if best is None:
        unmatched.append((i, sec['label'], sec['start']))
        continue
    used.add(best['i'])
    target = float(best['audio'])
    s = seg_new(target)
    # grid times get the attack shift of their region (the audio map snapped them to kick-body downbeats)
    if gridded_new(target):
        raw = None
        for m in segs:
            if m['start'] <= target < m['end']:
                raw = m
                break
        if raw is not None:
            target = target + attack_shift(raw['region'], raw['start'])
    pairs.append((sec['start'], round(target, 3), sec['label'], best))

# monotone warp control points
pts = [(0.0, 0.0)]
dropped = []
for a, b, label, _ in sorted(pairs):
    if a <= pts[-1][0]:
        continue
    if b <= pts[-1][1] + 0.05:
        dropped.append((label, a, b))
        continue
    pts.append((a, b))
end_old = max(float(show['meta'].get('duration', DUR)), pts[-1][0] + 1)
pts.append((end_old, max(DUR, pts[-1][1] + 1)))
XA = [p[0] for p in pts]
XB = [p[1] for p in pts]


def warp(t):
    if t <= 0:
        return t
    i = bisect.bisect_right(XA, t) - 1
    if i >= len(XA) - 1:
        return XB[-1] + (t - XA[-1])
    a0, a1, b0, b1 = XA[i], XA[i + 1], XB[i], XB[i + 1]
    return b0 + (t - a0) * (b1 - b0) / (a1 - a0)


def map_time(t, snap=True, free_unit='halfbeat'):
    """warp + re-snap for times that were on the authored grid of the same track tempo"""
    w = warp(t)
    if not snap:
        return w
    if not gridded_new(w):
        return w
    unit = on_old_grid(t)
    if unit and abs(seg_old(t)['bpm'] - seg_new(w)['bpm']) < 1.0:
        return snap_new(w, unit)
    # storyboard-timed cue inside a steady track: live shows fire on the grid, so take the nearest half beat
    return snap_new(w, free_unit)


exact = {a: b for a, b in pts}  # section starts map exactly (no re-snap)


def map_t(t, free_unit='halfbeat'):
    if t in exact:
        return exact[t]
    return map_time(t, free_unit=free_unit)


new_secs = []
for sec in secs:
    ns = dict(sec)
    ns['start'] = round(map_t(sec['start']), 3)
    new_secs.append(ns)
for i, ns in enumerate(new_secs):
    ns['end'] = new_secs[i + 1]['start'] if i + 1 < len(new_secs) else round(DUR, 3)

# ---------------------------------------------------------------------------------------------- 3. cues
moved = []
snapped = 0
for c in show['cues']:
    t0 = c['t']
    r = c.get('repeat')
    # a beat-grid repeat must start on a beat (not a half beat) or every step lands off the kick
    beat_rep = bool(r) and r.get('every') in ('beat', '2beat', 'bar', '2bar', '4bar', '8bar')
    t1 = map_t(t0, 'beat' if beat_rep else 'halfbeat')
    if on_old_grid(t0) and t0 not in exact:
        snapped += 1
    dur = c.get('dur')
    if dur is not None and dur > 2.0:
        e1 = map_t(t0 + dur)
        c['dur'] = round(max(0.05, e1 - t1), 3)
    if r and 'until' in r:
        r['until'] = round(map_t(r['until']), 3)
    c['t'] = round(max(0.0, t1), 3)
    moved.append(abs(c['t'] - t0))

for m in show.get('moments', []):
    m['t'] = round(map_t(m['t']), 3)

chap_audio = {c['title']: c.get('audioStart') for c in amap.get('chapters', [])}
for ch in show.get('chapters', []):
    a = chap_audio.get(ch['title'])
    ch['t'] = round(a if a is not None and ch['t'] > 0 else map_t(ch['t']), 3)

show['tempo'] = [{k: v for k, v in s.items() if not k.startswith('_')} for s in new_tempo]
show['sections'] = new_secs
show['meta']['duration'] = round(DUR, 2)
show['cues'].sort(key=lambda c: c['t'])

# ---------------------------------------------------------------------------------------------- output
moved.sort()
n = len(moved)
summary = {
    'sections': len(secs), 'matched': len(pairs), 'unmatched': unmatched, 'droppedNonMonotone': dropped,
    'tempoSegments': len(show['tempo']), 'cues': n, 'reSnapped': snapped,
    'cueShift': {'median': moved[n // 2], 'p90': moved[int(n * 0.9)], 'max': moved[-1]},
    'moved>0.5s': sum(1 for x in moved if x > 0.5), 'moved>2s': sum(1 for x in moved if x > 2),
}
print(json.dumps(summary, indent=1))

if not args.dry:
    # house format: top-level keys, arrays one compact item per line
    def compact(v):
        return json.dumps(v, ensure_ascii=False, separators=(',', ':'))

    parts = []
    for k, v in show.items():
        if isinstance(v, list):
            parts.append(f'  "{k}": [\n' + ',\n'.join('    ' + compact(x) for x in v) + '\n  ]')
        else:
            parts.append(f'  "{k}": ' + compact(v))
    with open(args.show, 'w') as f:
        f.write('{\n' + ',\n'.join(parts) + '\n}\n')
    print('written', args.show)

if args.report:
    rows = []
    for a, b, label, c in sorted(pairs):
        if abs(b - a) >= 0.05:
            rows.append(f"| {label} | {a:.3f} | {b:.3f} | {b - a:+.3f} | {c.get('confidence', '')} | {c.get('basis', '')[:90]} |")
    with open(args.report, 'w') as f:
        f.write('# Show re-timing onto the measured audio\n\n'
                'Generated by `scripts/retime-show.py` from `public/show/audio-map.json` (method: `research/audio-map.md`).\n\n'
                '* Tempo: %d measured segments (source `analyzed`), shifted to the audible kick attack + 10 ms:\n' % len(show['tempo'])
                + ''.join(f"  * `{r}` {a:g}–{'end' if b >= 1e8 else f'{b:g}'} s: {s * 1000:+.0f} ms\n" for r, a, b, s in ATTACK)
                + f"* Cues: {n}, re-snapped to the new grid: {snapped}; shift median {summary['cueShift']['median']:.3f} s,"
                  f" p90 {summary['cueShift']['p90']:.3f} s, max {summary['cueShift']['max']:.3f} s;"
                  f" {summary['moved>0.5s']} moved > 0.5 s, {summary['moved>2s']} > 2 s.\n"
                + (f"* Unmatched sections (kept on the warp): {unmatched}\n" if unmatched else '')
                + (f"* Dropped warp points (non-monotone): {dropped}\n" if dropped else '')
                + '\n| section | authored (s) | re-timed (s) | Δ (s) | confidence | audio evidence |\n|---|---:|---:|---:|---:|---|\n'
                + '\n'.join(rows) + '\n')
    print('report', args.report)
