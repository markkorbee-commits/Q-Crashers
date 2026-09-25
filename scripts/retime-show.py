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
   grid time); ends follow the next start. In the free-tempo parts the authored hit clusters are also matched to
   the measured onsets (audio-map `onsets[]`, scripts/audio-onsets.py) and those hit anchors win over a section
   anchor that contradicts them.
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
ap.add_argument('--warp-out', default=None, help='write the warp anchors [[authored, audio], ...] as JSON')
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

# section-only warp (first estimate)
def make_warp(points):
    xa = [p[0] for p in points]
    xb = [p[1] for p in points]

    def f(t):
        if t <= 0:
            return t
        i = bisect.bisect_right(xa, t) - 1
        if i >= len(xa) - 1:
            return xb[-1] + (t - xa[-1])
        a0, a1, b0, b1 = xa[i], xa[i + 1], xb[i], xb[i + 1]
        return b0 + (t - a0) * (b1 - b0) / (a1 - a0)
    return f


end_old = float(show['meta'].get('duration', DUR))
sec_pts = [(a, b) for a, b, _, _ in sorted(pairs)]
warp0 = make_warp([(0.0, 0.0)] + sec_pts + [(end_old, DUR)])

# ------------------------------------------------------------------------------ hit anchors (free tempo)
# Where the music has no steady pulse the section starts alone are not enough: the audio map sometimes put a
# section start ON the hit that the authored section led into (e.g. Winter hit 1). Authored hit clusters
# (pyro, fireworks, strobe/lights hits, stage pulses) are matched one-to-one, in order, to the measured strong
# onsets (audio-map onsets[] in the free-tempo spans, plus confident impacts) and become warp anchors that
# take precedence over conflicting section anchors.
def is_hit(c):
    return (c['sys'] in ('pyro', 'fireworks') or (c['sys'] in ('strobe', 'lights') and c['fx'] == 'hit')
            or (c['sys'] == 'stage' and c['fx'] in ('pulse', 'eyes_flash')))


hit_ts = sorted(set(round(c['t'], 3) for c in show['cues'] if is_hit(c)))
clusters = []
for t in hit_ts:
    if clusters and t - clusters[-1][-1] < 0.06:
        clusters[-1].append(t)
    else:
        clusters.append([t])
cands = sorted((o['t'], max(o['low'], o['bb'])) for o in amap.get('onsets', []) if max(o['low'], o['bb']) >= 15)


def free_at(t):
    return not gridded_new(t)


def sparse_at(t):
    # isolated orchestral hits (Vivaldi, Discorecord intro, outro) vs the dense Domitor percussion / bridge
    return t < 131.5 or t >= 1536.8


pairs_h = []
for ci, cl in enumerate(clusters):
    a = cl[0]
    r = warp0(a)
    if not (free_at(r) or free_at(a)):
        continue
    best = None
    for oi, (ot, jmp) in enumerate(cands):
        da, dr = abs(ot - a), abs(ot - r)
        if sparse_at(r):
            # the strongest hit near the authored or section-warped time (weak ones only when very close)
            if not (dr <= 1.5 or da <= 1.0) or (jmp < 20 and da > 0.5):
                continue
            cost = -jmp + 2 * min(da, dr)
        else:
            # dense percussion: the nearest hit only
            if min(da, dr) > 0.35:
                continue
            cost = min(da, dr) - 0.01 * jmp
        if best is None or cost < best[0]:
            best = (cost, oi)
    if best:
        pairs_h.append((best[0], ci, best[1]))
pairs_h.sort()
used_c, used_o, hit_pts = set(), set(), []
for _, ci, oi in pairs_h:
    if ci in used_c or oi in used_o:
        continue
    a, b = clusters[ci][0], cands[oi][0]
    # keep the order: no crossing with accepted anchors, and at least 0.1 s between them
    if any((a - x) * (b - y) <= 0 or abs(b - y) < 0.1 for x, y in hit_pts):
        continue
    used_c.add(ci)
    used_o.add(oi)
    hit_pts.append((a, b))
hit_pts.sort()

# merge: hit anchors first; a section anchor stays only if it keeps the warp monotone with a sane local rate
pts = [(0.0, 0.0)] + hit_pts + [(end_old, DUR)]
dropped = []
for a, b, label, _ in sorted(pairs):
    i = bisect.bisect_left([p[0] for p in pts], a)
    if i < len(pts) and abs(pts[i][0] - a) < 1e-6:
        continue
    lo, hi = pts[i - 1], pts[i]
    ok = lo[1] < b < hi[1]
    # next to a hit anchor (within 3 s) the local rate must stay sane, else the section start was measured ON
    # the hit the authored section led into (the hit wins)
    if ok and lo in hit_pts and a - lo[0] < 3:
        ok = 0.4 <= (b - lo[1]) / (a - lo[0]) <= 2.5
    if ok and hi in hit_pts and hi[0] - a < 3:
        ok = 0.4 <= (hi[1] - b) / (hi[0] - a) <= 2.5
    if ok:
        pts.insert(i, (a, b))
    else:
        dropped.append((label, a, b))
XA = [p[0] for p in pts]
XB = [p[1] for p in pts]
warp = make_warp(pts)


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


exact = {a: b for a, b in pts}  # anchors map exactly (no re-snap)
for cl in clusters:  # every time of an anchored cluster lands on its onset
    if cl[0] in exact:
        for t in cl[1:]:
            exact[t] = exact[cl[0]]


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
    'sections': len(secs), 'matched': len(pairs), 'unmatched': unmatched, 'droppedSectionAnchors': dropped,
    'hitAnchors': [(a, b) for a, b in hit_pts],
    'tempoSegments': len(show['tempo']), 'cues': n, 'reSnapped': snapped,
    'cueShift': {'median': moved[n // 2], 'p90': moved[int(n * 0.9)], 'max': moved[-1]},
    'moved>0.5s': sum(1 for x in moved if x > 0.5), 'moved>2s': sum(1 for x in moved if x > 2),
}
print(json.dumps(summary, indent=1))

if args.warp_out:
    json.dump([[a, b] for a, b in pts], open(args.warp_out, 'w'))

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
    final = {sec['start']: ns['start'] for sec, ns in zip(secs, new_secs)}
    for a, _, label, c in sorted(pairs):
        b = final[a]
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
                + (f"* Section anchors dropped in favour of a measured hit (the audio map had put the section start ON the"
                   f" hit the authored section led into): {[(l, a, b) for l, a, b in dropped]}\n" if dropped else '')
                + f"* Hit anchors (free tempo: authored hit cluster -> measured onset, `onsets[]`): "
                + ', '.join(f"{a:g} -> {b:g}" for a, b in hit_pts) + '\n'
                + '\n| section | authored (s) | re-timed (s) | Δ (s) | confidence | audio evidence |\n|---|---:|---:|---:|---:|---|\n'
                + '\n'.join(rows) + '\n')
    print('report', args.report)
