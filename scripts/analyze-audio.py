#!/usr/bin/env python3
"""
Offline tempo / structure analysis of the Endshow audio (for users who prefer to analyse once on
their own machine instead of in the browser).

Writes the SAME JSON format as the in-browser analyser (src/audio/analysisCore.ts), so the result
can be shipped as  public/assets/audio/endshow-2026.analysis.json  and is applied at start-up
without decoding anything (AudioSources.autoDetect -> loadShippedAnalysis).

Algorithm (identical to the browser version, numpy port):
  * mono 11025 Hz; full-band energy (50 Hz frames); HF transient energy (first difference,
    1.45 ms frames); zero-phase 40-160 Hz band-pass -> ±12 ms low-band envelope -> onset novelty
  * global offset: kick-density template cross-correlation (±20 s), refined by the median shift
    of section boundaries (energy jumps)
  * per authored kick segment: comb/fold search BPM ±1.5 (0.05 steps, then 0.005), phase pulled to
    the kick transient (every-beat consensus), then a beat tracker + least-squares line fit
  * section boundaries: largest matching energy jump within ±6 s of each authored start (report)
librosa is used for decoding/resampling and as an independent cross-check (beat_track tempo per
kick segment, reported as `librosaBpm`).

Usage:
  python3 scripts/analyze-audio.py public/assets/audio/endshow-2026.m4a
  python3 scripts/analyze-audio.py my.wav --show public/show/endshow-2026.json --out out.json [--offset 0.0] [--fixed-offset]

Requires: numpy, scipy, librosa (+ ffmpeg/audioread for m4a/opus/webm).
"""
import argparse
import datetime
import json
import math
import os
import sys
import time

import numpy as np

try:
    import librosa
except ImportError:  # pragma: no cover
    sys.exit('librosa is required: pip install librosa soundfile')
from scipy.signal import butter, sosfiltfilt

SR = 11025
FINE_HOP = 16
COARSE_RATE = 50
BINS = 256
KIND_KICK_WEIGHT = {'drop': 1, 'climax': 1, 'anticlimax': 1, 'build': 0.7, 'vocal': 0.6, 'intro': 0.45,
                    'outro': 0.45, 'breakdown': 0.15, 'orchestral': 0.1, 'silence': 0}


# ------------------------------------------------------------------------------------ helpers

def authored_hash(tempo, sections):
    """FNV-1a over the same JSON string as the TypeScript authoredHash()."""
    def num(v):
        # JSON.stringify number formatting (integers without .0)
        if isinstance(v, bool):
            return 'true' if v else 'false'
        f = float(v)
        return str(int(f)) if f.is_integer() else repr(f)

    def js(v):
        if isinstance(v, list):
            return '[' + ','.join(js(x) for x in v) + ']'
        if isinstance(v, str):
            return json.dumps(v)
        return num(v)

    s = js([[[t['start'], t['end'], t['bpm'], t['anchor'], bool(t['kick'])] for t in tempo],
            [[x['start'], x['end'], x['kind']] for x in sections]])
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return format(h, '08x')


def novelty(e, k):
    m = float(e.mean()) or 1e-12
    c = np.log1p(100.0 * e / m)
    s = np.zeros_like(c)
    s[1:-1] = 0.25 * c[:-2] + 0.5 * c[1:-1] + 0.25 * c[2:]
    out = np.zeros_like(c)
    d = s[2 * k:] - s[:-2 * k]
    out[k:-k] = np.maximum(d, 0)
    return out


def smooth_circ(h, r):
    w = np.array([r + 1 - abs(j) for j in range(-r, r + 1)], dtype=np.float64)
    w /= w.sum()
    hp = np.concatenate([h[-r:], h, h[:r]])
    return np.convolve(hp, w, mode='valid')


def parabolic(h, bi):
    n = len(h)
    l, c, r = h[(bi - 1) % n], h[bi], h[(bi + 1) % n]
    den = l - 2 * c + r
    return (0.5 * (l - r)) / den if den < 0 else 0.0


def fold(nov, fr, a, b, bpm, ref, radius=3):
    period = 60.0 / bpm
    i0 = max(0, math.ceil(a * fr))
    i1 = min(len(nov), math.floor(b * fr))
    if i1 <= i0:
        return 0.0, 0.0, np.zeros(BINS)
    idx = np.arange(i0, i1)
    ph = (idx / fr - ref) / period
    ph -= np.floor(ph)
    bins = (ph * BINS).astype(np.int64) % BINS
    hist = np.bincount(bins, weights=nov[i0:i1], minlength=BINS)
    sm = smooth_circ(hist, radius)
    bi = int(np.argmax(sm))
    avg = sm.mean() or 1e-12
    off = parabolic(sm, bi)
    phase = (((bi + 0.5 + off) / BINS) % 1.0) * period
    return float(sm[bi] / avg), phase, sm


def wrap_half(x, period):
    y = math.fmod(x, period)
    if y > period / 2:
        y -= period
    if y < -period / 2:
        y += period
    return y


def transient_phase(nov_hf, fr, a, b, bpm, ref, low_phase):
    period = 60.0 / bpm
    i0 = max(0, math.ceil(a * fr))
    i1 = min(len(nov_hf), math.floor(b * fr))
    idx = np.arange(i0, i1)
    x = (idx / fr - ref) / period
    k = np.floor(x).astype(np.int64)
    bins = ((x - k) * BINS).astype(np.int64) % BINS
    h = np.full(BINS, np.inf)
    for c in range(4):
        m = (k % 4) == c
        sub = np.bincount(bins[m], weights=nov_hf[i0:i1][m], minlength=BINS)
        h = np.minimum(h, smooth_circ(sub, 1))

    def bin_of(p):
        return int(math.floor((((p / period) % 1) + 1) % 1 * BINS))

    lo = bin_of(low_phase - 0.045)
    span = math.ceil((0.05 / period) * BINS)
    win = [(lo + j) % BINS for j in range(span + 1)]
    best_i = max(win, key=lambda i: h[i])
    best = h[best_i]
    med = float(np.median(h)) or 1e-12
    if best < med * 3:
        return None
    pre0 = max(1, round((0.003 / period) * BINS))
    pre1 = max(pre0 + 1, round((0.010 / period) * BINS))
    cand, rises = [], []
    for i in win:
        v = h[i]
        if v < 0.2 * best or v < h[(i - 1) % BINS] or v < h[(i + 1) % BINS]:
            continue
        pre = max(h[(i - j) % BINS] for j in range(pre0, pre1 + 1))
        cand.append(i)
        rises.append(v - pre)
    bi = best_i
    if cand:
        br = max(rises)
        for i, r in zip(cand, rises):
            if r >= 0.35 * br:
                bi = i
                break
    off = parabolic(h, bi)
    return (((bi + 0.5 + off) / BINS) % 1.0) * period


def regress_beats(nov, fr, a, b, t0, period):
    win = max(2, round(0.007 * fr))
    k0 = math.ceil((a - t0) / period)
    k1 = math.floor((b - t0) / period)
    if k1 - k0 < 16:
        return None
    i0, i1 = max(1, math.floor(a * fr)), min(len(nov) - 1, math.floor(b * fr))
    seg = nov[i0:i1]
    strong = float(np.quantile(seg[::7], 0.995)) if len(seg) > 7 else float(seg.max())
    thr = 0.15 * strong
    kc = round(((a + b) / 2 - t0) / period)
    ks, ts = [], []
    p, c = period, t0
    sums = [0, 0.0, 0.0, 0.0, 0.0]  # n, sk, st, skk, skt

    def refit():
        nonlocal p, c
        n, sk, st, skk, skt = sums
        den = n * skk - sk * sk
        if n >= 6 and den > 0:
            p = (n * skt - sk * st) / den
            c = (st - p * sk) / n

    for step in range(2 * (k1 - k0) + 3):
        k = kc + ((step + 1) // 2 if step % 2 else -(step // 2))
        if k < k0 or k > k1:
            continue
        pred = (c + p * k) * fr
        ci = round(pred)
        lo, hi = max(1, ci - win), min(len(nov) - 2, ci + win)
        bi, bd = -1, 1e9
        for i in range(lo, hi + 1):
            v = nov[i]
            if v < thr or v < nov[i - 1] or v < nov[i + 1]:
                continue
            if abs(i - pred) < bd:
                bd, bi = abs(i - pred), i
        if bi < 0:
            continue
        l, v, r = nov[bi - 1], nov[bi], nov[bi + 1]
        den = l - 2 * v + r
        off = (0.5 * (l - r)) / den if den < 0 else 0.0
        t = (bi + off) / fr
        ks.append(k)
        ts.append(t)
        sums[0] += 1
        sums[1] += k
        sums[2] += t
        sums[3] += k * k
        sums[4] += k * t
        if sums[0] % 4 == 0:
            refit()
    if len(ks) < 16:
        return None
    refit()
    ks_a, ts_a = np.array(ks, dtype=np.float64), np.array(ts)
    res = ts_a - (c + p * ks_a)
    mad = float(np.median(np.abs(res))) or 1e-4
    keep = np.abs(res) <= max(3 * mad, 0.002)
    if keep.sum() < 16:
        return None
    sums[:] = [int(keep.sum()), ks_a[keep].sum(), ts_a[keep].sum(), (ks_a[keep] ** 2).sum(), (ks_a[keep] * ts_a[keep]).sum()]
    refit()
    e = ts_a[keep] - (c + p * ks_a[keep])
    rms = float(np.sqrt(np.mean(e ** 2)))
    if rms > 0.003 or keep.sum() < 0.5 * (k1 - k0 + 1):
        return None
    return {'t0': c, 'period': p, 'n': int(keep.sum()), 'rms': rms}


def estimate_offset(nov_low, fr, tempo, sections, show_duration, base, duration):
    R = 10
    n_show = int(show_duration * R)
    if n_show < 60:
        return None
    t = np.arange(n_show) / R
    T = np.zeros(n_show)
    for s in tempo:
        if not s['kick']:
            continue
        m = (t >= s['start']) & (t < s['end'])
        T[m] = 0.5
        for sec in sections:
            mm = m & (t >= sec['start']) & (t < sec['end'])
            T[mm] = KIND_KICK_WEIGHT.get(sec['kind'], 0.5)
    if T.std() < 0.08:
        return None
    n_a = int(duration * R)
    per = fr / R
    edges = (np.arange(n_a + 1) * per).astype(np.int64)
    cs = np.concatenate([[0], np.cumsum(nov_low, dtype=np.float64)])
    edges = np.minimum(edges, len(nov_low))
    K0 = cs[edges[1:]] - cs[edges[:-1]]
    K = np.convolve(K0, np.ones(11) / 11, mode='same')

    def corr(lag):
        sh = round((base + lag) * R)
        i = np.arange(n_show)
        j = i + sh
        m = (j >= 0) & (j < n_a)
        if m.sum() < 60:
            return -1.0
        x, y = T[m], K[j[m]]
        if x.std() < 1e-9 or y.std() < 1e-9:
            return -1.0
        return float(np.corrcoef(x, y)[0, 1])

    lags = np.arange(-200, 201) / R
    rs = np.array([corr(l) for l in lags])
    bi = int(np.argmax(rs))
    best, lag = float(rs[bi]), float(lags[bi])
    r0 = corr(0.0)
    candidate = abs(lag) >= 0.3 and best >= 0.35
    return {'lag': lag, 'confidence': max(0.0, best), 'accept': candidate and best - r0 >= 0.08, 'candidate': candidate}


def detect_sections(e_full, e_low, cr, sections, offset, tempo, radius=6.0):
    dbF = np.concatenate([[0], np.cumsum(10 * np.log10(e_full + 1e-10))])
    dbL = np.concatenate([[0], np.cumsum(10 * np.log10(e_low + 1e-10))])
    n = len(e_full)
    W = round(cr)
    out = []
    ordered = sorted(sections, key=lambda s: s['start'])
    for si, sec in enumerate(ordered):
        rep = {'index': sections.index(sec), 'label': sec['label'], 'kind': sec['kind'], 'authored': sec['start'],
               'detected': None, 'delta': None, 'confidence': 0}
        out.append(rep)
        if si == 0 or sec['start'] < 1:
            continue
        prev = ordered[si - 1]
        expected = sec['energy'] - prev['energy']
        sign = math.copysign(1, expected) if abs(expected) >= 0.12 else 0
        c = round((sec['start'] + offset) * cr)
        r = round(radius * cr)
        i = np.arange(c - r, c + r + 1)
        i = i[(i - W >= 0) & (i + W <= n)]
        if len(i) < 10:
            continue
        dF = (dbF[i + W] - dbF[i]) / W - (dbF[i] - dbF[i - W]) / W
        dL = (dbL[i + W] - dbL[i]) / W - (dbL[i] - dbL[i - W]) / W
        s = sign * (dF + dL) if sign != 0 else np.abs(dF) + np.abs(dL)
        s = s - 0.12 * np.abs(i - c) / cr
        k = int(np.argmax(s))
        conf = max(0.0, min(1.0, float((s[k] - np.median(s)) / 8)))
        t = i[k] / cr - offset
        seg = next((x for x in tempo if x['start'] <= t < x['end']), None)
        if seg:
            beat = 60 / seg['bpm']
            snapped = seg['anchor'] + round((t - seg['anchor']) / beat) * beat
            if abs(snapped - t) < 0.12:
                t = snapped
        rep['detected'] = round(t, 3)
        rep['delta'] = round(t - sec['start'], 3)
        rep['confidence'] = round(conf, 2)
    return out


# ------------------------------------------------------------------------------------ main

def analyze(x, sr, tempo_in, sections, show_duration, base_offset=0.0, fixed_offset=False, log=print):
    timings = {}
    tm = time.time()

    def mark(name):
        nonlocal tm
        t = time.time()
        timings[name] = round((t - tm) * 1000)
        tm = t

    x = np.asarray(x, dtype=np.float64)
    n = len(x)
    duration = n / sr
    fr = sr / FINE_HOP
    n_fine = n // FINE_HOP
    coarse_hop = max(1, round(sr / COARSE_RATE))
    cr = sr / coarse_hop
    n_coarse = n // coarse_hop

    e_full = (x[:n_coarse * coarse_hop] ** 2).reshape(n_coarse, coarse_hop).mean(axis=1)
    d2 = np.concatenate([[0.0], np.diff(x) ** 2])
    cs = np.concatenate([[0.0], np.cumsum(d2)])
    centers = np.arange(n_fine) * FINE_HOP
    a = np.clip(centers - FINE_HOP, 1, n)
    b = np.clip(centers + FINE_HOP, 0, n)
    e_hf = cs[b] - cs[a]
    mark('energy')

    low = sosfiltfilt(butter(2, 40, 'highpass', fs=sr, output='sos'), x)
    low = sosfiltfilt(butter(2, 160, 'lowpass', fs=sr, output='sos'), low)
    mark('filter')
    W = round(0.012 * sr)
    cs = np.concatenate([[0.0], np.cumsum(low ** 2)])
    a = np.clip(centers - W, 0, n)
    b = np.clip(centers + W, 0, n)
    e_low = cs[b] - cs[a]
    nov_low = novelty(e_low, 3)
    nov_hf = novelty(e_hf, 1)
    per = coarse_hop / FINE_HOP
    e_low_c = np.array([e_low[int(j * per):min(n_fine, int((j + 1) * per))].mean() if int(j * per) < min(n_fine, int((j + 1) * per)) else 0
                        for j in range(n_coarse)])
    mark('onsets')

    tempo = [dict(t) for t in tempo_in]
    offset, offset_conf, method = base_offset, 0.0, 'fixed' if fixed_offset else 'none'
    if not fixed_offset:
        est = estimate_offset(nov_low, fr, tempo_in, sections, show_duration, base_offset, duration)
        lag = est['lag'] if est and (est['accept'] or est['candidate']) else 0.0
        offset_conf = est['confidence'] if est else 0.0
        pre = detect_sections(e_full, e_low_c, cr, sections, base_offset + lag, [], 2.5 if lag != 0 else 6)
        ds = [r['delta'] for r in pre if r['delta'] is not None and r['confidence'] >= 0.5]
        refined = None
        if len(ds) >= 3:
            md = float(np.median(ds))
            mad = float(np.median(np.abs(np.array(ds) - md)))
            if mad <= 0.12:
                refined = lag + md
        if refined is not None and abs(refined) >= 0.04 and ((est and (est['accept'] or est['candidate'])) or len(ds) >= 4):
            offset, method = base_offset + refined, 'xcorr'
        elif est and est['accept']:
            offset, method = base_offset + lag, 'xcorr'
    mark('offset')

    segments, phases = [], {}
    for si, seg in enumerate(tempo):
        rep = {'index': si, 'start': seg['start'], 'end': seg['end'], 'kick': bool(seg['kick']), 'authoredBpm': seg['bpm'],
               'authoredAnchor': seg['anchor'], 'bpm': seg['bpm'], 'anchor': seg['anchor'], 'confidence': 0,
               'refined': False, 'transient': False}
        segments.append(rep)
        if not seg['kick']:
            rep['note'] = 'no kick: authored grid kept'
            continue
        a, b = max(0.0, seg['start'] + offset), min(duration, seg['end'] + offset)
        if b - a < 4:
            rep['note'] = 'segment outside the audio or too short'
            continue
        ref = seg['anchor'] + offset
        best_bpm, best_score = seg['bpm'], -1.0
        for k in range(-30, 31):
            bpm = seg['bpm'] + k * 0.05
            sc = fold(nov_low, fr, a, b, bpm, ref)[0]
            if sc > best_score:
                best_score, best_bpm = sc, bpm
        center = best_bpm
        for k in range(-12, 13):
            bpm = center + k * 0.005
            sc = fold(nov_low, fr, a, b, bpm, ref, 2)[0]
            if sc > best_score:
                best_score, best_bpm = sc, bpm
        score, low_phase, _ = fold(nov_low, fr, a, b, best_bpm, ref, 2)
        rep['confidence'] = round(score, 2)
        if score < 4:
            rep['note'] = 'no clear pulse: authored grid kept'
            continue
        if abs(best_bpm - seg['bpm']) > 1.45:
            rep['note'] = 'best tempo at the edge of the search range: authored grid kept'
            continue
        period = 60 / best_bpm
        tr = transient_phase(nov_hf, fr, a, b, best_bpm, ref, low_phase)
        phase = wrap_half(tr if tr is not None else low_phase, period)
        fit = regress_beats(nov_hf if tr is not None else nov_low, fr, a, b, ref + phase, period)
        if fit and abs(fit['period'] - period) < period * 0.0008:
            period = fit['period']
            best_bpm = 60 / period
            phase = wrap_half(fit['t0'] - ref, period)
            rep['note'] = f"{fit['n']} beats fitted, rms {fit['rms'] * 1000:.1f} ms"
        # independent cross-check with librosa's beat tracker
        try:
            y = x[int(a * sr):int(b * sr)].astype(np.float32)
            lt, _ = librosa.beat.beat_track(y=y, sr=sr, start_bpm=seg['bpm'], tightness=400)
            rep['librosaBpm'] = round(float(np.atleast_1d(lt)[0]), 2)
        except Exception:  # pragma: no cover
            pass
        phases[si] = phase
        rep['transient'] = tr is not None
        rep['bpm'] = round(best_bpm, 4)
        rep['refined'] = True
    if method == 'xcorr':
        ph = [phases[r['index']] for r in segments if r['refined']]
        if ph:
            fine = float(np.median(ph))
            offset += fine
            for r in segments:
                if r['refined']:
                    phases[r['index']] -= fine
    for rep in segments:
        if not rep['refined']:
            continue
        seg = tempo[rep['index']]
        rep['anchor'] = round(seg['anchor'] + phases[rep['index']], 4)
        seg['bpm'] = rep['bpm']
        seg['anchor'] = rep['anchor']
        seg['source'] = 'analyzed'
    mark('tempo')
    secs = detect_sections(e_full, e_low_c, cr, sections, offset, tempo)
    mark('sections')
    return {
        'format': 'endshow-analysis', 'version': 1,
        'created': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'tool': 'librosa (scripts/analyze-audio.py)',
        'file': {'name': '', 'size': 0, 'duration': round(duration, 3)},
        'authoredHash': authored_hash(tempo_in, sections),
        'sampleRate': sr, 'frameRate': round(fr, 3),
        'offset': round(offset, 4), 'offsetConfidence': round(offset_conf, 3), 'offsetMethod': method,
        'tempo': tempo, 'segments': segments, 'sections': secs, 'timings': timings,
    }


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('audio', help='Endshow audio file (m4a/mp3/ogg/opus/webm/wav)')
    ap.add_argument('--show', default=os.path.join(root, 'public', 'show', 'endshow-2026.json'))
    ap.add_argument('--out', default=os.path.join(root, 'public', 'assets', 'audio', 'endshow-2026.analysis.json'))
    ap.add_argument('--offset', type=float, default=None, help='base audio offset (default: show meta.audio.offset)')
    ap.add_argument('--fixed-offset', action='store_true', help='do not estimate the global offset')
    args = ap.parse_args()

    show = json.load(open(args.show, encoding='utf-8'))
    base = args.offset if args.offset is not None else float(show['meta']['audio'].get('offset', 0) or 0)
    t0 = time.time()
    print(f'loading {args.audio} ...', flush=True)
    y, sr = librosa.load(args.audio, sr=SR, mono=True)
    print(f'  {len(y) / sr:.1f} s at {sr} Hz ({time.time() - t0:.1f} s)')
    res = analyze(y, sr, show['tempo'], show['sections'], float(show['meta']['duration']), base, args.fixed_offset)
    res['file'] = {'name': os.path.basename(args.audio), 'size': os.path.getsize(args.audio), 'duration': round(len(y) / sr, 3)}
    res['showId'] = show['meta'].get('id')
    res['timings']['total'] = round((time.time() - t0) * 1000)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(res, f, indent=1)
    print(f"offset {res['offset']:+.3f} s ({res['offsetMethod']}, confidence {res['offsetConfidence']})")
    for s in res['segments']:
        if s['kick']:
            print(f"  segment {s['index']:2d} @ {s['start']:7.2f}s: {s['authoredBpm']:.2f} -> {s['bpm']:.3f} BPM, anchor {s['anchor']:.4f}"
                  f"  (conf {s['confidence']}, librosa {s.get('librosaBpm', '-')}) {s.get('note', '')}")
    for s in res['sections']:
        if s['detected'] is not None:
            print(f"  section {s['label']!r:>18} ({s['kind']}): authored {s['authored']:.2f}  detected {s['detected']:.2f}  Δ {s['delta']:+.2f} s  conf {s['confidence']}")
    print(f'wrote {args.out}')


if __name__ == '__main__':
    main()
