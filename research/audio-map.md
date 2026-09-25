# Audio map: The Endshow | Defqon.1 2026 (measured from the real audio)

Status: analysis only. `public/show/endshow-2026.json` is not changed here. This report and the derived data
`public/show/audio-map.json` compare the authored timeline with the real audio: the official video's audio,
1581.12 s, 48 kHz stereo MP3, stored locally at `public/assets/audio/endshow-2026.mp3` (git-ignored and never committed).
The authored timeline used here is a snapshot of `public/show/endshow-2026.json` (113 sections, 55 tempo
segments, md5 `5142fe49…`), taken before another engineer started editing the file.

Claims are tagged **FACT** (measured on the audio, with the value given), **INFERENCE** (a judgement from measurements) or
**ASSUMPTION** (no audio evidence).

## 0. TL;DR

* **Global offset ≈ 0. Keep `meta.audio.offset = 0`.** (FACT) The file starts at video time 0 and is 1581.12 s long
  (the show says 1581.0). At clean kick entries after a silence, the authored downbeats differ from the measured kick
  onsets by a constant amount per track: Discorecord −0.070, Sacred Oath +0.053, L.P.A. −0.005 (after the one-beat
  error described below), Sacred Flame −0.115, Embers −0.014 and In The Cold (finale) −0.074 s. Across tracks the
  median is −0.04 s and the sign changes from track to track. These are small anchor errors in each authored grid, not
  a file offset.
* **Tempo per track (FACT, fitted over the whole track with a joint low-band and HF onset fold; width of the score peak in brackets):**
  Discorecord **157.000** (156.997–157.003), Sacred Oath **155.000** (154.998–155.005), L.P.A. **170.00** (169.996–170.025),
  Sacred Flame **160.000** (159.999–160.004), Embers **160.000** (159.998–160.002), In The Cold **155.000** (154.995–154.999).
  All are exact integer tempos, so one constant grid per track holds from the intro to the last drop, with one exception
  (In The Cold, see §2). **Vivaldi is not 121.52 BPM.** It is an orchestral accelerando from ~104 to ~157 BPM over
  0–44 s, then ~151–160 BPM until 97 s (FACT, from the spectral-flux periodicity). **Domitor Draconis has no stable tempo
  and no four-on-the-floor kick at all** (FACT: the low-band pulse score is 1.4–2.7, against 5–10 in every kick track). The
  one exception is a percussive passage from 1030 to 1066 with a 0.600 s period (100 BPM, or 200 BPM counted in half-time).
* **The authored drops are mostly right to within 0.12 s** (FACT: 145.556, 160.843, 243.390, 415.493, 502.203, 536.267,
  793.135, 829.135, 1188.386 and 1511.106. The Embers final climax is at 1287.386, authored 1287.0). The first automatic
  comparison (`analysis-authored.json`) reported "2–6 s off" for many sections. Those numbers were mostly artefacts of its
  ±6 s energy-jump search. The real problems are the following:
  1. **L.P.A. is one beat early everywhere** (the drop is at 590.078, not 589.73; the kick gaps are at 598.549 and 609.843).
  2. **Breakdown, build and intro boundaries** are 1.5–6 s off in several places (see the top 20 in §5).
  3. **Kind errors:** 15 authored `drop` or `climax` sections have no kick in any bar (0 %). These are all 8 Domitor
     Draconis sections, Sacred Flame 709/745/769, and Embers "LIQUID SKY", "kick & lead" and both "DROP 2" sections
     (1255.5–1287: no kick until 1287.386). Vivaldi's orchestral "climax" has no kick either. 5 of the 7 authored
     `silence` sections are not silent (their levels are −9 to −17 dB).
  4. **In The Cold drop 1** starts at **1414.219** (authored 1412.083). Its kick is half-time and sits 0.11 s off the
     finale grid.
* 42 of the 113 section starts move by ≥ 0.5 s, 27 by ≥ 1 s and 15 by ≥ 2 s. 57 move by < 0.15 s, which is only the
  snap to the measured downbeat.

## 1. Method

Pipeline (Python 3, numpy/scipy/librosa/soundfile; scripts in the session scratchpad `…/scratchpad/audio-map/`:
`features.py`, `env2.py`, `grid2.py`, `grids.py`, `build_map.py`, `events.py`, `compare.py`, `final.py`, `plots.py`.
They are not in the repo because this pass is analysis only).

1. **Decode**: MP3 → float, mono mix, resampled to 22.05 kHz (soxr_hq). The file is 1581.120 s long.
2. **Features.**
   * STFT (2048/256, 86.1 fps). The band energies are: sub 30–100 Hz, low 100–200 Hz, low-mid 200–800 Hz,
     mid 0.8–3 kHz, high 3–8 kHz and air 8–11 kHz.
   * 128-band log-mel spectral flux (overall, low, mid and high).
   * High-resolution envelopes at 1 kHz:
     * a < 200 Hz envelope (±15 ms box), whose log-novelty marks the rise of the kick body;
     * 1.5–5 kHz transients (±2 ms), which give the HF click novelty;
     * 10 ms RMS.
3. **Tempo and grid per track** (`grid2.py`, `grids.py`).
   * First, kick onsets are picked in the low-band novelty (adaptive threshold, ≥ 200 ms apart) and chained into
     "kick runs" (chains of onsets spaced by 1 or 2 beats, ±20–30 ms).
   * The BPM is then chosen to maximise the peak sharpness of the onset histogram folded on the beat. This fold is taken
     jointly over the low-band novelty (heavy-kick runs) and the HF novelty (all kick runs), searched in 0.001 BPM steps.
   * The beat phase is the low-band fold peak over the heavy-drop kicks. This is checked against the first kick after a
     pre-drop silence, where the onset is unambiguous. The steepest RMS rise falls on the grid within −33…+8 ms: 160.816,
     243.364, 590.056, 793.131, 829.142, 1188.353 and 1511.114.
   * The grid's consistency is checked by re-folding each kick run on its own. The HF phase agrees within about 2–7 ms
     across the drop runs of Discorecord, Oath, Flame, Embers and In The Cold (the latter including drop 1).
4. **Downbeats.** The downbeat is set on one drop per track. All 13 other kick re-entries (drops) then land on a
   downbeat of that grid (FACT, 13/13), and the vote over kick-run starts gives the same phase in every gridded track.
5. **Per beat and per bar.**
   * `kick` per beat = max of two terms:
     * A, the pulse term: the share of low-band onset energy within ±40 ms of the beat, compared with the whole beat,
       gated by level;
     * B, the sustained distorted-kick term: the < 200 Hz level within 5–8 dB of its loudest.
   * Term B is disabled in free-tempo regions (Domitor, bridge, outro), where it would react to sustained bass notes.
   * `bars[].kick` is the mean over the 4 beats.
   * `low`, `high` and `flux` are the bar means of the 30–200 Hz level, the 3–11 kHz level and the spectral flux. Each is
     normalised so that 0 is the 5th and 1 the 99th percentile over all bars (the dB ranges are in `normalisation`).
6. **Events** (`events.py`).
   * `silence_start`/`silence_end`: 10 ms RMS below −36 dB (relative to the 99.9th percentile) for ≥ 0.3 s, with a mean
     below −40 dB. The staccato rests of Vivaldi's opening (1.6–10 s) are excluded.
   * `drop`: a kick run of ≥ 2 bars after ≥ 2 bars without kick. A pickup kick up to 2 beats before the downbeat is
     snapped to that downbeat.
   * `breakdown`: the kick stops for ≥ 2 bars.
   * `build_start`: the start of the last monotonic rise of the high/mid-band level before a drop, or before its
     pre-drop silence.
   * `impact`: a spectral-flux peak above the 99.7th percentile with a level jump of ≥ 12 dB in < 0.2 s, outside kick bars.
   * `orchestral`, `vocal` and `outro` are hand-labelled points. Their times are measured; the labels are INFERENCE
     (vocal content comes from the research files and was not detected).
7. **Section matching** (`compare.py`).
   * Candidate boundaries within ±8 s of each authored start are:
     * the events above;
     * 2-bar level changes of ≥ 5 dB at downbeats;
     * 0.5 s level changes of ≥ 8 dB, refined to the steepest 1 kHz RMS rise.
   * Each candidate is scored by its compatibility with the authored kind and label keywords (DROP, silence, build, hit,
     fade…), by its confidence and by its distance. Candidates are then assigned one-to-one, keeping the sections in
     order.
   * Results are snapped to the downbeat if it is within 0.6 beat, otherwise to the beat. Free-tempo regions keep the
     raw onset.
   * Every chapter was then reviewed on the plots. 33 rows were decided by hand ("REVIEWED" in the table). Each of these
     is tagged INFERENCE, with its evidence given.
8. **Plots.** `…/scratchpad/audio-map/chapter0.png … chapter7.png` show, per chapter in 40 s rows: the mel spectrogram,
   the RMS, < 200 Hz and > 3 kHz envelopes, per-bar kick (red = kick bar), per-bar low/high levels, downbeats and 8-bar
   phrase lines, the AUTHORED section starts (green dashed), the RECOMMENDED starts (orange dotted, with yellow arrows),
   the detected events, and the kick segments (red shading).
   The zoom and diagnostic plots are in the same folder: `z_*.png` (zoomed windows), `s_*.png` (high-resolution
   spectrograms), `w_*.png` (waveforms with the grid) and `f_*.png` (bar-folded onset histograms).

Accuracy.
* Downbeat or beat times in the gridded tracks are good to about ±20 ms, and at worst ±35 ms (FACT: the clean kick
  entries fall within −33…+8 ms of the grid). They are referenced to the rise of the kick body.
* Many heavy kicks carry an HF element about a 16th note (~95 ms) before the body. In Oath, Flame and Cold, the non-kick
  sections have their strongest onsets on that 16th as well (§8). If visuals should hit the transient, not the thump,
  subtract ~0.09 s. This is INFERENCE and can only be settled by listening.
* In free-tempo regions, times are onsets (±30 ms). Their "bars" follow a nominal grid and carry no meaning.

## 2. Grids and tempo segments (the new `segments[]`)

| track | region | bpm | downbeat anchor | valid span | confidence | notes |
|---|---|---:|---:|---|---:|---|
| Vivaldi – Winter | `viv_ramp` | 104 → 160 | beat list (dynamic tracker) | 0–97.5 | 0.35 | accelerando. `segments[]` holds 2-bar pieces with their own bpm (FACT for the trend, INFERENCE for individual beats: orchestral, ±60 ms) |
| Discorecord intro | `disco_intro` | – | – | 97.5–130.9 | 0.2 | no pulse: the Vivaldi tail, near-silences 112.07–114.48 / 116.69–120.70 / 123.65–126.57 / 128.94–131.00, and hits at 114.48, 120.96, 126.57 and 131.00 |
| Frontliner – Discorecord | `disco` | **157** | 145.556 | 130.9–272.5 | 0.95 | one grid from the stabs at 131.0 to the fade |
| D-Sturb – Sacred Oath | `oath` | **155** | 415.493 | 272.5–566.5 | 0.95 | one grid; the "kick 2" at 330.3 has an on-beat click and a sub body 0.12 s later |
| Akimbo & Missy – L.P.A. | `lpa` | **170** | 590.078 | 566.5–613.5 | 0.9 | the authored grid (anchor 589.73) is **one beat early** |
| bridge | `bridge` | – | – | 613.5–637.8 | 0.2 | fade, then ambient near-silence (−36…−41 dB) |
| Bass Modulators – Sacred Flame | `flame` | **160** | 793.135 | 637.8–881.6 | 0.95 | one grid; the tribal section (645.6–741) has no hardstyle kick |
| JDX – Domitor Draconis | `dom_free`, `dom_100`, `dom_free2` | – / 100 | nominal | 881.6–1097.4 | 0.15 / 0.4 | no kick and no stable tempo. `dom_100` (1030.1–1066) has a 0.600 s pulse, but its downbeat is uncertain |
| D-Block & S-te-Fan – Embers | `embers` | **160** | 1188.386 | 1097.4–1317.0 | 0.9 | the pad enters exactly on the grid downbeat 1098.386 |
| Atmozfears & Jesse Jax – In The Cold | `cold_a` | **155** | 1414.219 | 1317.0–1452.0 | 0.7 | intro and drop 1. **The drop-1 kick bodies sit 0.11 s (0.29 beat) before the finale kick grid**, while the HF (hat/click) pulse phase is the same in both (FACT). The drop-1 kick is half-time (one long kick per 2 beats), so its kick-synced visuals need this separate anchor |
| In The Cold (finale) | `cold_b` | **155** | 1511.106 | 1452.0–1536.8 | 0.95 | the breakdown and the finale |
| Endshow outro | `outro` | – | – | 1536.8–1581.12 | 0.2 | custom outro with no stable pulse. The last near-silences are 1569.52–1571.77 and 1576.38 to the end (digital silence from 1579.0) |

Kick runs (FACT: every run of ≥ 2 bars with kick ≥ 0.5, allowing 1-bar fills; start = first kick downbeat):
133.327–139.441 (light "disco" kick; reviewed, as the detector only fires from 134.855), 145.556–156.257, 160.843–171.543,
243.390–269.378 · 308.654–317.945, 330.332–341.170 (reviewed; the detector only fires from 336.525), 415.493–435.622,
502.203–520.783, 536.267–547.106, 550.203–557.945 · 590.078–598.549, 601.372–609.843, 611.960 (pickup)–613.51 ·
793.135–812.635, 829.135–863.635 · 1188.386–1198.886, 1206.386–1225.886 (1-bar gap at 1222.886), 1287.386–1309.886 ·
1414.219–1449.832 (half-time), 1511.106–1531.235 (then a half kick until 1536.8).

## 3. Per-track structure (from the audio)

Kind = the audio's own classification. `build / pre-drop` = a span without kick of ≤ 30 s that ends in a kick section.
Energy = the mean normalised low/high bar levels. Events listed have confidence ≥ 0.5.

**Vivaldi – Winter (0–112)** (FACT unless noted):
* 0–1.41: digital silence.
* 1.45: staccato string chords begin with an accelerando, ~104 BPM rising to ~157 BPM by 44 s.
* 31.2: crescendo.
* 40–47: solo passage (the low band drops away at 44.1–44.9).
* Orchestral hits: **47.80**, **55.81**, **63.79** (low band +31, +33 and +41 dB) and **68.52** (+23 dB).
* **74.82**: tutti climax, sustained at about −10 dB until 98.98.
* 98.98: 1.3 s dip.
* **100.27**: re-entry, the "second half".
* 110.40: level drops by 17 dB.
* 112.07–114.48: near-silence (the Discorecord intro then begins with isolated hits).
**Frontliner – Discorecord (Galactixx Remix)**

| start–end | kind (audio) | bars | kick | energy low/high (0..1) | events inside |
|---|---|---:|---|---|---|
| 97.500–130.900 | free (no pulse) | 23 | no | 0.35 / 0.51 | silence_start 112.07, silence_end 114.48, silence_start 116.69, silence_end 120.70, impact 120.96, silence_start 123.65 … |
| 130.900–133.327 | build / pre-drop | 2 | no | 0.51 / 0.81 | impact 131.00, silence_end 131.00 |
| 133.327–139.441 | kick section / drop | 4 | yes | 0.73 / 0.84 |  |
| 139.441–145.556 | build / pre-drop | 4 | no | 0.78 / 0.86 | breakdown 139.44 |
| 145.556–156.257 | kick section / drop | 7 | yes | 0.89 / 0.90 |  |
| 156.257–160.843 | build / pre-drop | 3 | no | 0.59 / 0.81 | breakdown 156.26 |
| 160.843–171.543 | kick section / drop | 7 | yes | 0.96 / 0.83 |  |
| 171.543–243.390 | breakdown / intro (no kick) | 47 | no | 0.65 / 0.82 | breakdown 171.54, silence_start 205.96, impact 206.29, silence_end 206.30 |
| 243.390–269.378 | kick section / drop | 17 | yes | 0.92 / 0.93 |  |
| 269.378–272.500 | breakdown / intro (no kick) | 3 | no | 0.27 / 0.44 | breakdown 269.38 |

**D-Sturb ft. E-Life – Sacred Oath**

| start–end | kind (audio) | bars | kick | energy low/high (0..1) | events inside |
|---|---|---:|---|---|---|
| 272.500–308.654 | breakdown / intro (no kick) | 24 | no | 0.71 / 0.82 | impact 306.31 |
| 308.654–313.299 | kick section / drop | 3 | yes | 0.96 / 0.90 |  |
| 313.299–314.848 | kick gap / fill | 1 | no | 0.79 / 0.98 |  |
| 314.848–317.945 | kick section / drop | 2 | yes | 0.94 / 0.91 |  |
| 317.945–330.332 | build / pre-drop | 8 | no | 0.65 / 0.94 | breakdown 317.94 |
| 330.332–341.170 | kick section / drop | 7 | yes | 0.95 / 0.95 |  |
| 341.170–415.493 | breakdown / intro (no kick) | 48 | no | 0.75 / 0.90 | breakdown 341.17, impact 382.43 |
| 415.493–435.622 | kick section / drop | 13 | yes | 0.92 / 0.96 |  |
| 435.622–502.203 | breakdown / intro (no kick) | 43 | no | 0.78 / 0.92 | breakdown 435.62 |
| 502.203–506.848 | kick section / drop | 3 | yes | 0.99 / 0.96 |  |
| 506.848–508.396 | kick gap / fill | 1 | no | 0.79 / 0.99 |  |
| 508.396–520.783 | kick section / drop | 8 | yes | 0.95 / 0.96 |  |
| 520.783–536.267 | build / pre-drop | 10 | no | 0.71 / 0.96 | breakdown 520.78 |
| 536.267–547.106 | kick section / drop | 7 | yes | 0.94 / 0.97 |  |
| 547.106–550.203 | kick gap / fill | 2 | no | 0.76 / 0.96 | breakdown 547.11 |
| 550.203–557.945 | kick section / drop | 5 | yes | 0.93 / 0.99 |  |
| 557.945–566.500 | breakdown / intro (no kick) | 6 | no | 0.50 / 0.74 | breakdown 557.95, outro 564.07 |

**Akimbo & Missy – L.P.A.**

| start–end | kind (audio) | bars | kick | energy low/high (0..1) | events inside |
|---|---|---:|---|---|---|
| 566.500–590.078 | build / pre-drop | 17 | no | 0.38 / 0.77 | impact 577.26 |
| 590.078–598.549 | kick section / drop | 6 | yes | 0.99 / 0.74 |  |
| 598.549–601.372 | kick gap / fill | 2 | no | 0.73 / 0.82 | breakdown 598.55 |
| 601.372–609.843 | kick section / drop | 6 | yes | 1.00 / 0.80 |  |
| 609.843–611.254 | kick gap / fill | 1 | no | 0.61 / 0.88 |  |
| 611.254–613.500 | kick section / drop | 2 | yes | 0.91 / 0.84 |  |

**Bass Modulators – Sacred Flame**

| start–end | kind (audio) | bars | kick | energy low/high (0..1) | events inside |
|---|---|---:|---|---|---|
| 613.500–637.800 | free (no pulse) | 17 | no | 0.18 / 0.15 | breakdown 613.51, silence_start 625.11, silence_end 625.90, silence_start 628.06, silence_end 628.77, silence_start 637.13 |
| 637.800–793.135 | breakdown / intro (no kick) | 104 | no | 0.71 / 0.71 | silence_end 637.81, orchestral 645.76, impact 741.27, build_start 787.13 |
| 793.135–803.635 | kick section / drop | 7 | yes | 0.93 / 0.90 |  |
| 803.635–805.135 | kick gap / fill | 1 | no | 0.59 / 0.95 |  |
| 805.135–812.635 | kick section / drop | 5 | yes | 0.96 / 0.88 |  |
| 812.635–829.135 | build / pre-drop | 11 | no | 0.66 / 0.91 | breakdown 812.63, build_start 826.13 |
| 829.135–863.635 | kick section / drop | 23 | yes | 0.90 / 0.93 |  |
| 863.635–881.600 | breakdown / intro (no kick) | 12 | no | 0.72 / 0.85 | breakdown 863.63, outro 877.99 |

**JDX – Domitor Draconis**

| start–end | kind (audio) | bars | kick | energy low/high (0..1) | events inside |
|---|---|---:|---|---|---|
| 881.600–1030.100 | free (no pulse) | 63 | no | 0.47 / 0.28 | silence_start 881.60, silence_end 886.08, orchestral 886.08, silence_start 889.99, silence_end 891.34, silence_start 891.67 … |
| 1030.100–1066.000 | breakdown / intro (no kick) | 16 | no | 0.88 / 0.80 | impact 1030.12 |
| 1066.000–1097.400 | free (no pulse) | 14 | no | 0.76 / 0.75 | outro 1092.24 |

**D-Block & S-te-Fan – Embers**

| start–end | kind (audio) | bars | kick | energy low/high (0..1) | events inside |
|---|---|---:|---|---|---|
| 1097.400–1188.386 | breakdown / intro (no kick) | 61 | no | 0.56 / 0.64 |  |
| 1188.386–1198.886 | kick section / drop | 7 | yes | 0.97 / 0.89 |  |
| 1198.886–1206.386 | build / pre-drop | 5 | no | 0.71 / 0.93 | breakdown 1198.89 |
| 1206.386–1222.886 | kick section / drop | 11 | yes | 0.93 / 0.92 |  |
| 1222.886–1224.386 | kick gap / fill | 1 | no | 0.79 / 0.90 |  |
| 1224.386–1225.886 | kick section / drop | 1 | yes | 0.96 / 0.92 |  |
| 1225.886–1287.386 | breakdown / intro (no kick) | 41 | no | 0.65 / 0.80 | breakdown 1225.89 |
| 1287.386–1309.886 | kick section / drop | 15 | yes | 0.93 / 0.96 |  |
| 1309.886–1317.000 | breakdown / intro (no kick) | 5 | no | 0.55 / 0.67 | breakdown 1309.89, outro 1310.41 |

**Atmozfears & Jesse Jax – In The Cold**

| start–end | kind (audio) | bars | kick | energy low/high (0..1) | events inside |
|---|---|---:|---|---|---|
| 1317.000–1414.219 | breakdown / intro (no kick) | 63 | no | 0.56 / 0.55 |  |
| 1414.219–1449.832 | kick section / drop | 23 | yes | 0.93 / 0.85 |  |
| 1449.832–1452.000 | breakdown / intro (no kick) | 2 | no | 0.85 / 0.88 | breakdown 1449.83 |
| 1452.000–1511.106 | breakdown / intro (no kick) | 38 | no | 0.71 / 0.77 | build_start 1506.46 |
| 1511.106–1531.235 | kick section / drop | 13 | yes | 0.92 / 0.94 |  |
| 1531.235–1536.800 | breakdown / intro (no kick) | 4 | no | 0.87 / 0.95 | breakdown 1531.23 |
| 1536.800–1581.120 | free (no pulse) | 30 | no | 0.50 / 0.49 | outro 1536.80, silence_start 1569.52, silence_end 1571.77, outro 1574.55, silence_start 1576.38 |

## 4. CORRECTION TABLE: every authored section

Columns:
* **authored** = the section start in the show file (snapshot).
* **audio** = the recommended new start. It is already snapped to the measured downbeat or beat (to the onset in
  free-tempo regions).
* **Δ** = audio − authored (bold if ≥ 1 s).
* **conf** = 0..1.
* **tag**:
  * FACT = an automatic, measured boundary;
  * INFERENCE = reviewed by hand, with the evidence given;
  * ASSUMPTION = no audio boundary, so the authored time is kept or snapped to the nearest downbeat.
* **kind / energy check** flags an authored kind that the audio contradicts, or an authored energy that differs from the
  measured level by > 0.35. The measured level is the mean total level of the span mapped −36…−2 dB → 0…1, which is only
  a rough scale.

The labels are unchanged. Where Δ is about ±0.05–0.12 s, the change is only the correction of the per-track anchor.

| # | section label | kind | authored | audio | Δ s | conf | tag | kind / energy check | evidence |
|---|---|---|---:|---:|---:|---:|---|---|---|
| 0 | Winter — silhouettes at blue hour | intro | 0.000 | 0.000 | +0.00 | 0.90 | INFERENCE | ok | show start kept; digital silence 0-1.41, first string chord 1.45 |
| 1 | Winter — the cathedral reveal | intro | 14.000 | 14.000 | +0.00 | 0.30 | INFERENCE | ok | no boundary: continuous staccato accelerando (only a gradual +7 dB high-band crescendo); authored time kept |
| 2 | Winter — crescendo | build | 32.000 | 31.196 | -0.80 | 0.61 | FACT | ok | energy_up @ 31.20 (2-bar level change: total +4, low +4, high +7 dB) |
| 3 | Winter — first fire (hit 1) | orchestral | 45.700 | 47.803 | **+2.10** | 0.85 | INFERENCE | ok | orchestral hit 1: low band +31 dB, rms onset 47.80 (authored hit time 47.4 and section start 45.7 are early) |
| 4 | Winter — Bengal flares (hits 2–3) | orchestral | 55.300 | 55.812 | +0.51 | 0.85 | INFERENCE | ok | orchestral hit 2: low band +33 dB, rms onset 55.81 (hit 3 follows at 63.79) |
| 5 | Winter — gerbs on the lanterns | build | 69.000 | 68.519 | -0.48 | 0.80 | INFERENCE | ok | orchestral re-entry: low band +23 dB, rms onset 68.52 |
| 6 | Winter — orchestral climax | climax | 75.500 | 74.817 | -0.68 | 0.80 | INFERENCE | **authored climax but kick only in 11% of bars** | tutti climax entrance: +10 dB total over 2 bars, rms onset 74.82 |
| 7 | Winter — second half, corner fireballs | orchestral | 97.000 | 100.274 | **+3.27** | 0.75 | INFERENCE | ok | second half re-entry after a 1.3 s dip (98.98): +24 dB high band, rms onset 100.27 |
| 8 | Winter — the dramatic silence | anticlimax | 110.000 | 110.397 | +0.40 | 1.00 | FACT | ok | energy_down @ 110.40 (2-bar level change: total -17, low -18, high -19 dB) |
| 9 | Discorecord — intro hits, cyan lanterns | intro | 126.400 | 126.511 | +0.11 | 1.00 | FACT | ok | energy_up @ 126.51 (0.5-s level change: total +21, low +17, high >+40 dB) |
| 10 | Discorecord — the white laser web | build | 133.396 | 133.327 | -0.07 | 1.00 | FACT | ok | energy_up @ 133.29 (0.5-s level change: total +8, low +7, high +29 dB) |
| 11 | Discorecord — heavy kick | drop | 145.626 | 145.556 | -0.07 | 1.00 | FACT | ok | drop @ 145.56 (kick returns after 4 bars without kick; run 7 bars; low band +7 dB) |
| 12 | Discorecord — 2-bar silence | silence | 157.855 | 157.785 | -0.07 | 0.80 | INFERENCE | **authored silence but level -11 dB**; energy 0.20 authored vs 0.75 audio | 2-bar gap = downbeat 157.785 to the kick return 160.843 (8 beats); level -35..-44 dB low band, not true silence; a 2-beat drop-out already at 157.02 |
| 13 | Discorecord — kick under red pillars | drop | 160.912 | 160.843 | -0.07 | 1.00 | FACT | ok | drop @ 160.84 (kick returns after 3 bars without kick; run 7 bars; low band +17 dB) |
| 14 | Discorecord — riser, green laser sheet | build | 171.613 | 171.543 | -0.07 | 1.00 | FACT | ok | breakdown @ 171.54 (kick stops after 7 bars; 47 bars without kick follow) |
| 15 | Discorecord — vocal breakdown, the crown lit | vocal | 182.314 | 176.129 | **-6.18** | 0.85 | INFERENCE | ok | breakdown starts after the 3-bar riser: +23 dB low band at 176.08 = downbeat 176.129; nothing changes at 182.3 |
| 16 | Discorecord — lasers skim the empty field | breakdown | 206.772 | 206.702 | -0.07 | 0.85 | INFERENCE | ok | hard cut: 0.34 s near-silence 205.96-206.30, hit at 206.30, bass gone from downbeat 206.702 |
| 17 | Discorecord — build, comet fan from the crest | build | 219.001 | 218.932 | -0.07 | 0.75 | FACT | ok | energy_up @ 218.93 (2-bar level change: total +7, low +9, high +4 dB) |
| 18 | Discorecord — pre-drop | build | 231.231 | 232.690 | **+1.46** | 0.76 | FACT | ok | energy_down @ 232.69 (2-bar level change: total -8, low -12, high -4 dB) |
| 19 | Discorecord — DROP | drop | 243.460 | 243.390 | -0.07 | 1.00 | FACT | ok | drop @ 243.39 (kick returns after 47 bars without kick; run 17 bars; low band +11 dB) |
| 20 | Discorecord — fade | anticlimax | 267.919 | 269.378 | **+1.46** | 1.00 | FACT | ok | breakdown @ 269.38 (kick stops after 17 bars; 27 bars without kick follow) |
| 21 | Sacred Oath — cinematic intro | intro | 273.000 | 273.041 | +0.04 | 0.87 | FACT | ok | energy_up @ 273.04 (2-bar level change: total +17, low +20, high +19 dB) |
| 22 | Sacred Oath — melodic intro, lavender zig-zag | build | 291.569 | 290.461 | **-1.11** | 0.71 | FACT | ok; energy 0.45 authored vs 0.83 audio | energy_up @ 290.32 (0.5-s level change: total +5, low +5, high +17 dB) |
| 23 | Sacred Oath — intro kick | drop | 307.053 | 307.106 | +0.05 | 0.70 | INFERENCE | ok | intro kick section: +9 dB entry at downbeat 307.106; the full-level kick (low band -4 dB) starts one bar later at 308.654 |
| 24 | Sacred Oath — lead riff, magenta zig-zag | breakdown | 319.440 | 317.945 | **-1.50** | 1.00 | FACT | ok | breakdown @ 317.94 (kick stops after 6 bars; 8 bars without kick follow) |
| 25 | Sacred Oath — kick 2, comet columns | drop | 330.279 | 330.332 | +0.05 | 0.77 | FACT | **authored drop but kick only in 43% of bars** | energy_up @ 330.35 (0.5-s level change: total +7, low +13, high -1 dB) |
| 26 | Sacred Oath — E-Life on the empty stage | vocal | 341.117 | 341.170 | +0.05 | 1.00 | FACT | ok; energy 0.30 authored vs 0.80 audio | breakdown @ 341.17 (kick stops after 3 bars; 48 bars without kick follow) |
| 27 | Sacred Oath — the Oath: blue sunburst & red stars | vocal | 372.085 | 372.138 | +0.05 | 0.30 | INFERENCE | ok; energy 0.35 authored vs 0.85 audio | no clear boundary (only -9 dB high-band dip at 372.5); snapped to the 8-bar phrase downbeat |
| 28 | Sacred Oath — build-up | build | 403.053 | 403.106 | +0.05 | 0.20 | ASSUMPTION | ok | no audio boundary within ±8 s: authored start kept (snapped to nearest downbeat) |
| 29 | Sacred Oath — silence (blackout) | silence | 409.246 | 409.300 | +0.05 | 0.87 | FACT | **authored silence but level -9 dB**; energy 0.10 authored vs 0.79 audio | energy_down @ 409.24 (0.5-s level change: total -1, low -14, high -0 dB) |
| 30 | Sacred Oath — pre-drop strobe roll | build | 412.343 | 412.396 | +0.05 | 0.81 | FACT | ok | energy_down @ 412.62 (0.5-s level change: total -7, low -13, high -4 dB) |
| 31 | Sacred Oath — ANTHEM DROP 1 | drop | 415.440 | 415.493 | +0.05 | 1.00 | FACT | ok | drop @ 415.49 (kick returns after 48 bars without kick; run 13 bars; low band +7 dB) |
| 32 | Sacred Oath — mid-breakdown, serpent comets | breakdown | 440.214 | 440.267 | +0.05 | 0.65 | INFERENCE | ok | full kick ends 435.62 (4 bars of weaker half-kick follow); low band drops at 439.5; section snapped to the 16-bar phrase downbeat 440.267 |
| 33 | Sacred Oath — quiet, low fog | breakdown | 464.988 | 465.041 | +0.05 | 0.30 | INFERENCE | ok; energy 0.30 authored vs 0.83 audio | no strong boundary (small high-band moves 463.4/467.7, low -10 dB at 469.0); phrase downbeat kept |
| 34 | Sacred Oath — orchestral build | build | 477.375 | 477.428 | +0.05 | 0.20 | ASSUMPTION | ok; energy 0.50 authored vs 0.87 audio | no audio boundary within ±8 s: authored start kept (snapped to nearest downbeat) |
| 35 | Sacred Oath — pre-drop, backlight starburst | build | 489.763 | 489.816 | +0.05 | 0.20 | ASSUMPTION | ok | no audio boundary within ±8 s: authored start kept (snapped to nearest downbeat) |
| 36 | Sacred Oath — DROP 2 (violet starbursts) | drop | 502.150 | 502.203 | +0.05 | 1.00 | FACT | ok | drop @ 502.20 (kick returns after 43 bars without kick; run 12 bars; low band +10 dB) |
| 37 | Sacred Oath — DROP 2 (blue & red) | drop | 508.343 | 508.396 | +0.05 | 0.70 | FACT | ok | energy_up @ 508.31 (0.5-s level change: total +5, low +9, high -2 dB) |
| 38 | Sacred Oath — break | breakdown | 523.827 | 520.783 | **-3.04** | 0.90 | FACT | ok; energy 0.40 authored vs 0.85 audio | breakdown @ 520.78 (kick stops after 12 bars; 10 bars without kick follow) |
| 39 | Sacred Oath — near-silence | silence | 531.569 | 533.170 | **+1.60** | 0.83 | FACT | **authored silence but level -10 dB**; energy 0.10 authored vs 0.78 audio | energy_down @ 533.07 (0.5-s level change: total -0, low <-40, high -0 dB) |
| 40 | Sacred Oath — pickup | build | 534.666 | 534.719 | +0.05 | 0.86 | FACT | ok; energy 0.50 authored vs 0.86 audio | energy_up @ 534.72 (2-bar level change: total +5, low +17, high +1 dB) |
| 41 | Sacred Oath — FINAL KICK, the red canopy | climax | 536.214 | 536.267 | +0.05 | 1.00 | FACT | ok | drop @ 536.27 (kick returns after 10 bars without kick; run 7 bars; low band +12 dB) |
| 42 | Sacred Oath — outro | outro | 564.085 | 564.138 | +0.05 | 1.00 | FACT | ok | outro @ 564.07 (Sacred Oath: sub-bass stops (-34 dB), fade into L.P.A.) |
| 43 | L.P.A. — the Losse Polsjes chant | intro | 566.000 | 566.860 | +0.86 | 0.65 | INFERENCE | ok | L.P.A. entrance: low band +40 dB (0.5-s windows centred 566.86; rms onset 566.67); first L.P.A. downbeat is 567.490 |
| 44 | L.P.A. — stab build, pixel chases | build | 578.436 | 577.019 | **-1.42** | 0.73 | FACT | ok | energy_up @ 576.90 (0.5-s level change: total +12, low -6, high >+40 dB) |
| 45 | L.P.A. — UPTEMPO DROP | drop | 589.730 | 590.078 | +0.35 | 1.00 | FACT | ok | drop @ 590.08 (kick returns after 23 bars without kick; run 6 bars; low band +9 dB) |
| 46 | L.P.A. — kick gap | anticlimax | 598.201 | 598.549 | +0.35 | 1.00 | FACT | ok | breakdown @ 598.55 (kick stops after 6 bars; 2 bars without kick follow) |
| 47 | L.P.A. — drop, second half | drop | 601.024 | 601.372 | +0.35 | 1.00 | FACT | ok | drop @ 601.37 (kick returns after 2 bars without kick; run 9 bars; low band +4 dB) |
| 48 | L.P.A. — kick gap | anticlimax | 609.495 | 609.843 | +0.35 | 0.90 | INFERENCE | ok | kick stops on downbeat 609.843 (6-beat gap, kick re-enters with a 2-beat pickup at 611.960) |
| 49 | L.P.A. — blackout (kick in the dark) | anticlimax | 612.318 | 612.667 | +0.35 | 0.80 | INFERENCE | ok | kick bar after the gap (pickup 611.960, downbeat 612.667); kick ends 613.51, then fade |
| 50 | Bridge — darkness | silence | 622.000 | 618.268 | **-3.73** | 0.60 | INFERENCE | ok | fade after the last L.P.A. kick (613.51) reaches rms < -36 dB at 618.27; ambient bridge (-36..-41 dB) until 637.81 |
| 51 | Sacred Flame — the portal | intro | 638.600 | 637.885 | -0.71 | 0.91 | FACT | ok | silence_end @ 637.81 (sound resumes) |
| 52 | Sacred Flame — fire ritual: the lantern bearers | orchestral | 649.250 | 645.643 | **-3.61** | 0.85 | INFERENCE | ok | tribal percussion entrance: +27 dB low band, rms onset 645.64 (0.12 s before grid beat 645.760; drums pulse every 2 beats) |
| 53 | Sacred Flame — the aerialist in the arch | orchestral | 673.250 | 673.135 | -0.12 | 0.86 | FACT | ok | energy_down @ 673.13 (2-bar level change: total -0, low +1, high -20 dB) |
| 54 | Sacred Flame — the arch downlights | build | 697.250 | 697.135 | -0.12 | 0.35 | INFERENCE | ok | no strong boundary (high band +15 dB at 694.9 only); 16-bar phrase downbeat kept |
| 55 | Sacred Flame — BURNING WINGS | drop | 709.250 | 709.135 | -0.12 | 0.71 | FACT | **authored drop but kick only in 0% of bars** | energy_up @ 709.13 (2-bar level change: total +2, low -0, high +8 dB) |
| 56 | Sacred Flame — tribal groove | orchestral | 718.250 | 718.135 | -0.12 | 0.20 | ASSUMPTION | ok | no audio boundary within ±8 s: authored start kept (snapped to nearest downbeat) |
| 57 | Sacred Flame — break & riser, magenta pillars | build | 733.250 | 733.135 | -0.12 | 0.45 | INFERENCE | ok; energy 0.35 authored vs 0.75 audio | 8-bar phrase downbeat; break develops inside it: low -9 dB 735.4, mid/high -14 dB 738.6, near-silence 740.73-741.26 |
| 58 | Sacred Flame — silver glitter comets | drop | 745.250 | 742.135 | **-3.12** | 0.80 | INFERENCE | **authored drop but kick only in 0% of bars** | impact 741.26 after the 0.5 s near-silence, bass enters on downbeat 742.135 (+25 dB low); no kick in 742-781 |
| 59 | Sacred Flame — the glitter curtain | drop | 769.250 | 769.135 | -0.12 | 0.20 | ASSUMPTION | **authored drop but kick only in 0% of bars** | no audio boundary within ±8 s: authored start kept (snapped to nearest downbeat) |
| 60 | Sacred Flame — build-up, lavender fans | build | 781.250 | 787.135 | **+5.88** | 0.50 | FACT | ok | build_start @ 787.13 (high/mid band rises 6 dB over 4 bars before the drop at 793.13) |
| 61 | Sacred Flame — DROP 1 | drop | 793.250 | 793.135 | -0.12 | 1.00 | FACT | ok | drop @ 793.13 (kick returns after 121 bars without kick; run 13 bars; low band +13 dB) |
| 62 | Sacred Flame — build, striped wings | build | 817.250 | 817.135 | -0.12 | 0.82 | FACT | ok | energy_up @ 817.05 (0.5-s level change: total +3, low +17, high +1 dB) |
| 63 | Sacred Flame — MAIN CLIMAX | climax | 829.250 | 829.135 | -0.12 | 1.00 | FACT | ok | drop @ 829.13 (kick returns after 11 bars without kick; run 23 bars; low band +14 dB) |
| 64 | Sacred Flame — THE FLAME RING | climax | 859.250 | 859.135 | -0.12 | 0.20 | ASSUMPTION | **authored climax but kick only in 23% of bars** | no audio boundary within ±8 s: authored start kept (snapped to nearest downbeat) |
| 65 | Sacred Flame — outro, green uplights | outro | 877.250 | 877.885 | +0.64 | 1.00 | FACT | ok | outro @ 877.99 (Sacred Flame: fade-out begins (low -7 dB, then -4 dB per 0.5 s)) |
| 66 | Domitor Draconis — the tamer at the piano | orchestral | 886.000 | 886.076 | +0.08 | 0.89 | FACT | ok | silence_end @ 886.08 (sound resumes) |
| 67 | Domitor Draconis — IMPACT: the dragon wakes | drop | 933.800 | 933.752 | -0.05 | 1.00 | FACT | **authored drop but kick only in 0% of bars** | energy_up @ 933.75 (0.5-s level change: total +9, low >+40, high >+40 dB) |
| 68 | Domitor Draconis — venom green & red | drop | 943.400 | 943.719 | +0.32 | 0.85 | FACT | **authored drop but kick only in 0% of bars** | energy_up @ 943.72 (0.5-s level change: total +16, low +16, high >+40 dB) |
| 69 | Domitor Draconis — the dragon breathes (dimmed) | drop | 988.200 | 987.585 | -0.61 | 0.82 | FACT | **authored drop but kick only in 0% of bars** | energy_up @ 987.59 (0.5-s level change: total +1, low +1, high >+40 dB) |
| 70 | Domitor Draconis — pre-drop, blue laser fans | build | 1004.200 | 1003.485 | -0.71 | 0.91 | FACT | ok | energy_down @ 1003.49 (0.5-s level change: total -4, low -4, high <-40 dB) |
| 71 | Domitor Draconis — CLIMAX 1 | drop | 1006.700 | 1006.610 | -0.09 | 0.88 | FACT | **authored drop but kick only in 0% of bars** | energy_up @ 1006.61 (0.5-s level change: total +6, low +5, high +25 dB) |
| 72 | Domitor Draconis — fill | build | 1025.100 | 1025.776 | +0.68 | 0.60 | FACT | ok | energy_down @ 1025.78 (0.5-s level change: total -4, low -0, high -11 dB) |
| 73 | Domitor Draconis — CLIMAX 2: the twin torches | climax | 1026.900 | 1027.553 | +0.65 | 0.79 | FACT | **authored climax but kick only in 0% of bars** | energy_up @ 1027.55 (0.5-s level change: total +9, low +8, high +18 dB) |
| 74 | Domitor Draconis — blackout accent | anticlimax | 1046.100 | 1046.442 | +0.34 | 0.81 | FACT | ok; energy 0.40 authored vs 0.90 audio | energy_down @ 1046.55 (0.5-s level change: total +1, low +2, high -10 dB) |
| 75 | Domitor Draconis — tamed: deep blue & glitter | climax | 1049.300 | 1049.442 | +0.14 | 0.71 | FACT | **authored climax but kick only in 0% of bars** | energy_up @ 1049.44 (0.5-s level change: total +1, low +1, high +11 dB) |
| 76 | Domitor Draconis — magenta & ice | climax | 1065.300 | 1063.242 | **-2.06** | 0.60 | FACT | **authored climax but kick only in 0% of bars** | energy_up @ 1063.31 (0.5-s level change: total +8, low +15, high +3 dB) |
| 77 | Domitor Draconis — the comet barrage | climax | 1074.900 | 1074.737 | -0.16 | 0.83 | FACT | **authored climax but kick only in 0% of bars** | energy_up @ 1074.74 (0.5-s level change: total +2, low +2, high +17 dB) |
| 78 | Domitor Draconis — fade to blue | outro | 1090.900 | 1092.042 | **+1.14** | 0.95 | FACT | ok | energy_down @ 1092.04 (2-bar level change: total -11, low -9, high -15 dB) |
| 79 | Embers — monochrome blue | intro | 1098.000 | 1098.386 | +0.39 | 0.80 | INFERENCE | ok | Embers pad enters (+8 dB mid) exactly on grid downbeat 1098.386 |
| 80 | Embers — rising intro, the cyan X | build | 1110.400 | 1110.386 | -0.01 | 0.85 | FACT | ok | energy_up @ 1110.39 (2-bar level change: total +9, low +13, high -4 dB) |
| 81 | Embers — LIQUID SKY | drop | 1131.400 | 1131.386 | -0.01 | 0.87 | FACT | **authored drop but kick only in 0% of bars** | energy_up @ 1131.39 (2-bar level change: total +5, low +7, high +18 dB) |
| 82 | Embers — kick & lead, the fountain row | drop | 1155.400 | 1155.386 | -0.01 | 0.60 | INFERENCE | **authored drop but kick only in 0% of bars** | 1-bar bass drop-out on downbeat 1155.386 (-25 dB low), groove resumes ~1156.9; no hardstyle kick here |
| 83 | Embers — pre-drop gap | silence | 1182.400 | 1182.386 | -0.01 | 0.70 | INFERENCE | **authored silence but level -14 dB**; energy 0.30 authored vs 0.66 audio | 4-bar pre-drop on downbeat 1182.386; low band vanishes 1184.6-1187.1 (-27..-41 dB), not silent |
| 84 | Embers — DROP 1: the pink crackle band | drop | 1188.400 | 1188.386 | -0.01 | 1.00 | FACT | ok | drop @ 1188.39 (kick returns after 166 bars without kick; run 7 bars; low band +18 dB) |
| 85 | Embers — DROP 1: cold blue | drop | 1194.400 | 1194.386 | -0.01 | 0.20 | ASSUMPTION | ok | no audio boundary within ±8 s: authored start kept (snapped to nearest downbeat) |
| 86 | Embers — ICE-WHITE BEAM STORM | breakdown | 1227.400 | 1225.886 | **-1.51** | 1.00 | FACT | ok | breakdown @ 1225.89 (kick stops after 13 bars; 41 bars without kick follow) |
| 87 | Embers — DROP 2: the blue laser lattice | drop | 1255.500 | 1255.373 | -0.13 | 0.85 | INFERENCE | **authored drop but kick only in 0% of bars** | impact after the 1252-1255 drop-out: +20 dB total, rms onset 1255.373; NO kick follows until 1287.386 |
| 88 | Embers — DROP 2: magenta | drop | 1273.500 | 1273.886 | +0.39 | 0.20 | ASSUMPTION | **authored drop but kick only in 0% of bars** | no audio boundary within ±8 s: authored start kept (snapped to nearest downbeat) |
| 89 | Embers — FINAL CLIMAX: pink canopy over a cyan stage | climax | 1287.000 | 1287.386 | +0.39 | 1.00 | FACT | ok | drop @ 1287.39 (kick returns after 41 bars without kick; run 15 bars; low band +11 dB) |
| 90 | Embers — the last ember | anticlimax | 1305.000 | 1305.386 | +0.39 | 0.20 | ASSUMPTION | ok; energy 0.35 authored vs 0.93 audio | no audio boundary within ±8 s: authored start kept (snapped to nearest downbeat) |
| 91 | Embers — gold lines appear | outro | 1312.000 | 1309.886 | **-2.11** | 0.99 | FACT | ok | breakdown @ 1309.89 (kick stops after 15 bars; 68 bars without kick follow) |
| 92 | In The Cold — the golden chevron | intro | 1320.400 | 1317.566 | **-2.83** | 0.80 | INFERENCE | ok | In The Cold begins after the near-silence 1316.46-1317.5 (rms onset 1317.57) |
| 93 | In The Cold — the chevron scans | intro | 1345.503 | 1344.929 | -0.57 | 0.82 | FACT | ok; energy 0.35 authored vs 0.74 audio | energy_up @ 1344.90 (0.5-s level change: total +7, low -2, high >+40 dB) |
| 94 | In The Cold — golden tunnel between the pillars | build | 1357.890 | 1358.477 | +0.59 | 0.68 | FACT | ok | energy_up @ 1358.48 (0.5-s level change: total +1, low +12, high +5 dB) |
| 95 | In The Cold — violet haze, red wings | intro | 1371.825 | 1367.708 | **-4.12** | 0.60 | INFERENCE | ok; energy 0.30 authored vs 0.74 audio | bass returns +29 dB low band (rms onset 1367.71) |
| 96 | In The Cold — atmospheric intro | intro | 1384.212 | 1384.180 | -0.03 | 0.35 | INFERENCE | ok; energy 0.25 authored vs 0.84 audio | weak: low band -6 dB at 1384.18 (radio-edit start per research); no pulse |
| 97 | In The Cold — build: green mines | build | 1402.793 | 1403.380 | +0.59 | 0.20 | ASSUMPTION | ok; energy 0.45 authored vs 0.80 audio | no audio boundary within ±8 s: authored start kept (snapped to nearest downbeat) |
| 98 | In The Cold — silence | silence | 1408.986 | 1411.509 | **+2.52** | 0.66 | FACT | **authored silence but level -17 dB**; energy 0.20 authored vs 0.57 audio | energy_down @ 1411.53 (0.5-s level change: total -11, low -16, high -9 dB) |
| 99 | In The Cold — DROP 1: the silver gerb wall | drop | 1412.083 | 1414.219 | **+2.14** | 1.00 | FACT | ok | drop @ 1414.22 (kick returns after 68 bars without kick; run 23 bars; low band +13 dB) |
| 100 | In The Cold — drop 1 tail | drop | 1436.857 | 1435.896 | -0.96 | 0.59 | FACT | ok | energy_up @ 1435.91 (0.5-s level change: total +6, low +9, high -0 dB) |
| 101 | In The Cold — the magenta laser sheet | build | 1452.341 | 1449.832 | **-2.51** | 0.68 | FACT | ok; energy 0.40 authored vs 0.76 audio | breakdown @ 1449.83 (kick stops after 23 bars; 40 bars without kick follow) |
| 102 | In The Cold — percussive breakdown, the violet tunnel | breakdown | 1461.632 | 1460.476 | **-1.16** | 0.75 | INFERENCE | ok; energy 0.30 authored vs 0.72 audio | percussive breakdown entrance +15 dB low band after the 1456-1460 dip, rms onset 1460.48 |
| 103 | In The Cold — the laser cage | breakdown | 1474.019 | 1473.945 | -0.07 | 0.35 | INFERENCE | ok; energy 0.40 authored vs 0.85 audio | no strong boundary (low band +8 dB at 1472.9); phrase downbeat 24 bars before the finale |
| 104 | In The Cold — final build-up | build | 1498.793 | 1498.719 | -0.07 | 0.20 | ASSUMPTION | ok | no audio boundary within ±8 s: authored start kept (snapped to nearest downbeat) |
| 105 | In The Cold — GRAND FINALE | climax | 1511.180 | 1511.106 | -0.07 | 1.00 | FACT | ok | drop @ 1511.11 (kick returns after 40 bars without kick; run 13 bars; low band +6 dB) |
| 106 | In The Cold — finale afterglow | climax | 1523.567 | 1523.493 | -0.07 | 0.75 | INFERENCE | ok | 8 bars into the finale; 1-bar kick gap 1521.9-1523.1, kick returns with a pickup at 1523.106 |
| 107 | In The Cold — blackout (the music plays on) | anticlimax | 1529.761 | 1531.235 | **+1.47** | 1.00 | FACT | ok; energy 0.50 authored vs 0.92 audio | breakdown @ 1531.23 (kick stops after 13 bars; 34 bars without kick follow) |
| 108 | Outro — blue cold fire | breakdown | 1535.954 | 1537.429 | **+1.48** | 0.91 | FACT | ok | energy_down @ 1537.43 (2-bar level change: total -5, low -4, high -14 dB) |
| 109 | Outro — the final swell | build | 1551.000 | 1551.522 | +0.52 | 0.83 | FACT | ok | energy_up @ 1551.52 (0.5-s level change: total +16, low >+40, high +5 dB) |
| 110 | Outro — last light | outro | 1557.000 | 1557.000 | +0.00 | 0.20 | ASSUMPTION | ok; energy 0.30 authored vs 0.82 audio | no audio boundary within ±8 s: authored start kept |
| 111 | Forever One Tribe — black | outro | 1561.000 | 1561.000 | +0.00 | 0.30 | INFERENCE | ok | no audio boundary (visual cue: picture goes black); authored kept |
| 112 | Silence | silence | 1577.600 | 1576.379 | **-1.22** | 1.00 | FACT | ok | silence_start @ 1576.38 (near-silence 4.74 s (rms < -36 dB, mean -84 dB re loud level)) |

## 5. The 20 largest section-start corrections

| rank | # | section | authored | audio | Δ s | why |
|---:|---:|---|---:|---:|---:|---|
| 1 | 15 | Discorecord — vocal breakdown, the crown lit | 182.314 | 176.129 | -6.18 | breakdown starts after the 3-bar riser: +23 dB low band at 176.08 = downbeat 176.129; nothing changes at 182.3 |
| 2 | 60 | Sacred Flame — build-up, lavender fans | 781.250 | 787.135 | +5.88 | build_start @ 787.13 (high/mid band rises 6 dB over 4 bars before the drop at 793.13) |
| 3 | 95 | In The Cold — violet haze, red wings | 1371.825 | 1367.708 | -4.12 | bass returns +29 dB low band (rms onset 1367.71) |
| 4 | 50 | Bridge — darkness | 622.000 | 618.268 | -3.73 | fade after the last L.P.A. kick (613.51) reaches rms < -36 dB at 618.27; ambient bridge (-36..-41 dB) until 6… |
| 5 | 52 | Sacred Flame — fire ritual: the lantern bearers | 649.250 | 645.643 | -3.61 | tribal percussion entrance: +27 dB low band, rms onset 645.64 (0.12 s before grid beat 645.760; drums pulse e… |
| 6 | 7 | Winter — second half, corner fireballs | 97.000 | 100.274 | +3.27 | second half re-entry after a 1.3 s dip (98.98): +24 dB high band, rms onset 100.27 |
| 7 | 58 | Sacred Flame — silver glitter comets | 745.250 | 742.135 | -3.12 | impact 741.26 after the 0.5 s near-silence, bass enters on downbeat 742.135 (+25 dB low); no kick in 742-781 |
| 8 | 38 | Sacred Oath — break | 523.827 | 520.783 | -3.04 | breakdown @ 520.78 (kick stops after 12 bars; 10 bars without kick follow) |
| 9 | 92 | In The Cold — the golden chevron | 1320.400 | 1317.566 | -2.83 | In The Cold begins after the near-silence 1316.46-1317.5 (rms onset 1317.57) |
| 10 | 98 | In The Cold — silence | 1408.986 | 1411.509 | +2.52 | energy_down @ 1411.53 (0.5-s level change: total -11, low -16, high -9 dB) |
| 11 | 101 | In The Cold — the magenta laser sheet | 1452.341 | 1449.832 | -2.51 | breakdown @ 1449.83 (kick stops after 23 bars; 40 bars without kick follow) |
| 12 | 99 | In The Cold — DROP 1: the silver gerb wall | 1412.083 | 1414.219 | +2.14 | drop @ 1414.22 (kick returns after 68 bars without kick; run 23 bars; low band +13 dB) |
| 13 | 91 | Embers — gold lines appear | 1312.000 | 1309.886 | -2.11 | breakdown @ 1309.89 (kick stops after 15 bars; 68 bars without kick follow) |
| 14 | 3 | Winter — first fire (hit 1) | 45.700 | 47.803 | +2.10 | orchestral hit 1: low band +31 dB, rms onset 47.80 (authored hit time 47.4 and section start 45.7 are early) |
| 15 | 76 | Domitor Draconis — magenta & ice | 1065.300 | 1063.242 | -2.06 | energy_up @ 1063.31 (0.5-s level change: total +8, low +15, high +3 dB) |
| 16 | 39 | Sacred Oath — near-silence | 531.569 | 533.170 | +1.60 | energy_down @ 533.07 (0.5-s level change: total -0, low <-40, high -0 dB) |
| 17 | 86 | Embers — ICE-WHITE BEAM STORM | 1227.400 | 1225.886 | -1.51 | breakdown @ 1225.89 (kick stops after 13 bars; 41 bars without kick follow) |
| 18 | 24 | Sacred Oath — lead riff, magenta zig-zag | 319.440 | 317.945 | -1.50 | breakdown @ 317.94 (kick stops after 6 bars; 8 bars without kick follow) |
| 19 | 108 | Outro — blue cold fire | 1535.954 | 1537.429 | +1.48 | energy_down @ 1537.43 (2-bar level change: total -5, low -4, high -14 dB) |
| 20 | 107 | In The Cold — blackout (the music plays on) | 1529.761 | 1531.235 | +1.47 | breakdown @ 1531.23 (kick stops after 13 bars; 34 bars without kick follow) |

## 6. Kind and energy corrections (what the audio does, not only when)

* **Kick absent where the authored kind is `drop`/`climax`** (FACT, kick in 0% of the bars):
  * **Domitor Draconis 933.8–1090.9** (all 8 drop/climax sections). The track is cinematic: drones, orchestral hits and
    irregular percussion. INFERENCE: keep the high energy for the impact at 933.75 and for 1006.61, 1027.55 and 1030.12
    (+30 dB, the biggest hit), but drive the visuals from the `impact` events and `bars[].high`/`flux`, not from a kick
    grid. All 3 authored Domitor tempo segments with `kick:true` should be `kick:false`.
  * **Sacred Flame 709.25 "BURNING WINGS"** is a **2-bar break** (the low band dips 709.1–712.1, and the tribal groove
    resumes at 712.135). **745.25 / 769.25 "glitter"** is a melodic section with bass but **no kick** (742.135–787.1),
    so tempo segment 29 (745.25–781.25) should be `kick:false`.
  * **Sacred Flame 859.25 "THE FLAME RING"**: the kick continues only until 863.635; after that the lead plays on at
    high level without kick until the fade at 877.99.
  * **Embers 1131.4 "LIQUID SKY" and 1155.4 "kick & lead"** have no hardstyle kick. They are a rhythmic section with
    1-bar drop-outs (1137, 1143, 1149, 1155.4). Tempo segment 44 (1131.4–1182.4) should be `kick:false`.
  * **Embers 1255.5/1273.5 "DROP 2"** is an impact at 1255.373 followed by a **kickless** melodic section. The kick
    returns only at **1287.386** ("FINAL CLIMAX"). Tempo segment 48 (1255.5–1312) is kick only from 1287.386.
  * **Vivaldi "orchestral climax"** has no kick, which is expected for an orchestral piece.
* **Authored `silence` sections that are not silent** (FACT: level −9 to −17 dB):
  * Discorecord 157.855 is a 2-bar gap at −35…−44 dB low band, with a hit at 157.785;
  * Oath 409.246 has the low band −30…−35 dB (409.30–411.6);
  * Oath 531.569 loses its bass at 533.170;
  * Embers 1182.4 has no low band from 1184.6 to 1187.1;
  * In The Cold 1408.986 has a drop-out at 1411.51.

  These are "blackout" moments musically, but not silences. The real near-silences are listed under `events`
  (`silence_start`): 112.07, 116.69, 123.65, 128.94, 205.96 (0.34 s cut before the Disco breakdown), 618.3–637.8
  (bridge), 881.60, the gaps between the Domitor piano hits (889.99…928.62), 1316.46 (−39 dB), 1569.52 and 1576.38.
* **Authored `kick:true` where the audio has only bass** (FACT): Discorecord tempo segment 6 (219.001–232.759) is a
  build with a sustained bass and no kick. Its kick bits come only at 231.5–237 (partial). **Authored `kick:false`
  where a kick plays:** L.P.A. 609.495–612.318, because the gap is actually 609.843–611.960.
* **Half kicks:**
  * Oath 435.6–440.2 and 520.8–523.9: bars[].kick is 0.2–0.4 after the full kick stops.
  * In The Cold 1531.2–1536.8: the kick is about half present.
  * In The Cold drop 1 (1414.2–1449.8): a half-time kick.

  Use `bars[].kick` values of 0.2–0.5 for dimmer kick-synced effects in these spans.
* **Energy** (see the table): the measured level is flat-high in Oath's breakdowns (0.8–0.9 against the authored
  0.3–0.5). This is expected from a loud master; the contrast between breakdown and drop sits in `bars[].kick` and
  `bars[].low`, not in the total level.

## 7. Tempo-segment corrections (authored `tempo[]`)

Audio bpm is the track grid. "Audio downbeat" = the measured downbeat nearest the authored anchor. The share is the part
of the authored span covered by the audio's kick segments. Recommended replacement: `audio-map.json → segments[]`
(86 segments, each with its own downbeat anchor and kick flag).

| # | authored span | authored bpm / anchor / kick | audio bpm | audio downbeat nearest the authored anchor (Δ) | share of span inside audio kick segments | action |
|---:|---|---|---|---|---:|---|
| 0 | 0.000–126.400 | 121.52 / 47.4 / false | 99-167 (accelerando) | 47.171 (-0.229) | 0% | no stable grid: bpm is nominal, anchor |
| 1 | 126.400–133.396 | 157 / 127.282 / false | none (no stable pulse) | - | 1% | no stable grid: bpm is nominal |
| 2 | 133.396–157.855 | 157 / 133.396 / true | 157 | 133.327 (-0.069) | 68% | anchor |
| 3 | 157.855–160.912 | 157 / 157.855 / false | 157 | 157.785 (-0.070) | 2% | anchor |
| 4 | 160.912–171.613 | 157 / 160.912 / true | 157 | 160.843 (-0.069) | 99% | anchor |
| 5 | 171.613–219.001 | 157 / 171.613 / false | 157 | 171.543 (-0.070) | 0% | anchor |
| 6 | 219.001–232.759 | 157 / 219.001 / true | 157 | 218.932 (-0.069) | 0% | anchor, kick true → false |
| 7 | 232.759–243.460 | 157 / 232.759 / false | 157 | 232.690 (-0.069) | 1% | anchor |
| 8 | 243.460–267.919 | 157 / 243.46 / true | 157 | 243.390 (-0.070) | 100% | anchor |
| 9 | 267.919–273.000 | 157 / 267.919 / false | 157 | 267.849 (-0.070) | 29% | anchor |
| 10 | 273.000–307.053 | 155 / 274.537 / false | 155 | 274.590 (+0.053) | 0% | anchor |
| 11 | 307.053–319.440 | 155 / 307.053 / true | 155 | 307.106 (+0.053) | 62% | anchor |
| 12 | 319.440–330.279 | 155 / 319.44 / false | 155 | 319.493 (+0.053) | 0% | anchor |
| 13 | 330.279–341.117 | 155 / 330.279 / true | 155 | 330.332 (+0.053) | 100% | anchor |
| 14 | 341.117–415.440 | 155 / 341.117 / false | 155 | 341.170 (+0.053) | 0% | anchor |
| 15 | 415.440–440.214 | 155 / 415.44 / true | 155 | 415.493 (+0.053) | 81% | anchor |
| 16 | 440.214–502.150 | 155 / 440.214 / false | 155 | 440.267 (+0.053) | 0% | anchor |
| 17 | 502.150–523.827 | 155 / 502.15 / true | 155 | 502.203 (+0.053) | 79% | anchor |
| 18 | 523.827–536.214 | 155 / 523.827 / false | 155 | 523.880 (+0.053) | 0% | anchor |
| 19 | 536.214–564.085 | 155 / 536.214 / true | 155 | 536.267 (+0.053) | 67% | anchor |
| 20 | 564.085–566.000 | 155 / 564.085 / false | 155 | 564.138 (+0.053) | 0% | anchor |
| 21 | 566.000–589.730 | 170 / 567.142 / false | 170 | 567.490 (+0.348) | 0% | anchor |
| 22 | 589.730–598.201 | 170 / 589.73 / true | 170 | 590.078 (+0.348) | 96% | anchor |
| 23 | 598.201–601.024 | 170 / 598.201 / false | 170 | 598.549 (+0.348) | 12% | anchor |
| 24 | 601.024–609.495 | 170 / 601.024 / true | 170 | 601.372 (+0.348) | 96% | anchor |
| 25 | 609.495–612.318 | 170 / 609.495 / false | 170 | 609.843 (+0.348) | 50% | anchor, kick false → true |
| 26 | 612.318–622.000 | 170 / 612.318 / true | none (no stable pulse) | - | 12% | no stable grid: bpm is nominal, kick true → false |
| 27 | 622.000–638.600 | 160 / 622.25 / false | none (no stable pulse) | - | 0% | no stable grid: bpm is nominal |
| 28 | 638.600–745.250 | 160 / 638.75 / false | 160 | 638.635 (-0.115) | 0% | anchor |
| 29 | 745.250–781.250 | 160 / 745.25 / true | 160 | 745.135 (-0.115) | 0% | anchor, kick true → false |
| 30 | 781.250–793.250 | 160 / 781.25 / false | 160 | 781.135 (-0.115) | 1% | anchor |
| 31 | 793.250–814.250 | 160 / 793.25 / true | 160 | 793.135 (-0.115) | 85% | anchor |
| 32 | 814.250–829.250 | 160 / 814.25 / false | 160 | 814.135 (-0.115) | 1% | anchor |
| 33 | 829.250–877.250 | 160 / 829.25 / true | 160 | 829.135 (-0.115) | 72% | anchor |
| 34 | 877.250–886.000 | 160 / 877.25 / false | none (no stable pulse) | - | 0% | no stable grid: bpm is nominal |
| 35 | 886.000–933.800 | 145.8 / 887.2 / false | none (no stable pulse) | - | 0% | no stable grid: bpm is nominal |
| 36 | 933.800–943.400 | 150 / 933.8 / false | none (no stable pulse) | - | 0% | no stable grid: bpm is nominal |
| 37 | 943.400–1004.200 | 150 / 943.4 / true | none (no stable pulse) | - | 0% | no stable grid: bpm is nominal, kick true → false |
| 38 | 1004.200–1006.700 | 150 / 1004.2 / false | none (no stable pulse) | - | 0% | no stable grid: bpm is nominal |
| 39 | 1006.700–1025.100 | 150 / 1006.7 / true | none (no stable pulse) | - | 0% | no stable grid: bpm is nominal, kick true → false |
| 40 | 1025.100–1026.900 | 150 / 1025.9 / false | none (no stable pulse) | - | 0% | no stable grid: bpm is nominal |
| 41 | 1026.900–1090.900 | 150 / 1026.9 / true | 100 | 1032.042 (+5.142) | 0% | bpm 150 → 100, anchor, kick true → false |
| 42 | 1090.900–1098.000 | 150 / 1090.9 / false | none (no stable pulse) | - | 0% | no stable grid: bpm is nominal |
| 43 | 1098.000–1131.400 | 160 / 1098.4 / false | 160 | 1098.386 (-0.014) | 0% | ok |
| 44 | 1131.400–1182.400 | 160 / 1131.4 / true | 160 | 1131.386 (-0.014) | 0% | kick true → false |
| 45 | 1182.400–1188.400 | 160 / 1182.4 / false | 160 | 1182.386 (-0.014) | 0% | ok |
| 46 | 1188.400–1227.400 | 160 / 1188.4 / true | 160 | 1188.386 (-0.014) | 73% | ok |
| 47 | 1227.400–1255.500 | 160 / 1227.4 / false | 160 | 1227.386 (-0.014) | 0% | ok |
| 48 | 1255.500–1312.000 | 160 / 1255.5 / true | 160 | 1255.886 (+0.386) | 40% | anchor, kick true → false |
| 49 | 1312.000–1320.400 | 160 / 1312.5 / false | 160 | 1312.886 (+0.386) | 0% | anchor |
| 50 | 1320.400–1412.083 | 155 / 1320.728 / false | 155 | 1321.316 (+0.588) | 0% | anchor |
| 51 | 1412.083–1452.341 | 155 / 1412.083 / true | 155 | 1412.671 (+0.588) | 88% | anchor |
| 52 | 1452.341–1511.180 | 155 / 1452.341 / false | 155 | 1452.267 (-0.074) | 0% | anchor |
| 53 | 1511.180–1535.954 | 155 / 1511.18 / true | 155 | 1511.106 (-0.074) | 81% | anchor |
| 54 | 1535.954–1581.000 | 155 / 1535.954 / false | none (no stable pulse) | - | 0% | no stable grid: bpm is nominal |

Notes:
* Rows 0–1 and 26–27, 34–42 and 54 have no reliable grid. Use the 2-bar accelerando pieces (Vivaldi) or treat the span
  as free, with visuals driven by events.
* Rows 50–51: the In The Cold intro and drop 1 need their own anchor, **1414.219**. The finale anchor 1511.106 applies
  from 1452.0 on.

## 8. Uncertain or flagged items

* **Kick-onset reference** (INFERENCE): §1 "Accuracy". The HF pre-element and the tribal/breakdown onsets land about a
  16th before the kick-body grid in Oath, Flame and Cold. If visuals feel late in breakdowns, shift those segments by
  −0.09 s.
* **In The Cold grid split** (FACT for the offset, INFERENCE for the cause): the drop-1 kick bodies are 0.11 s before
  the finale kick grid, while the HF pulse keeps one phase through the whole track. So the two kick sounds sit
  differently against the same underlying beat. This is either the long pre-body of the finale kick (§1 Accuracy) or a
  syncopated drop-1 kick. The intro's big entrances follow the drop-1 kick grid. The breakdown (1452–1507) fits either
  grid, and its entrance at 1460.48 fits neither exactly.
* **Domitor** `dom_100` (1030–1066): the 0.600 s period is clear (flux autocorrelation 0.3–0.46), but the downbeat is not.
  The "kick" bars there come from bass notes (the detector is disabled for the sustained case).
* **Vivaldi beats** come from a dynamic-tempo tracker on the flux. The tempo trend is reliable; individual beats are
  ±60 ms (frame-quantised, orchestral onsets).
* **Weak or no audio boundary** (ASSUMPTION, the authored time is kept or snapped): sections 1, 27, 28, 33, 34, 35, 54,
  56, 57, 59, 64, 85, 88, 90, 97, 103, 104, 110 and 111. These are visual cues inside continuous music. Keep them where
  the design needs them.
* **Strong audio moments that start no section** (FACT, candidates for cues): 206.30 (hard cut, one beat before the
  breakdown downbeat), 741.26 (impact after the 0.5 s near-silence), 1030.12 (the biggest Domitor hit, +30 dB),
  1339.02 (the first full entrance of In The Cold, +21 dB), 1354.51 (+22 dB high band), 1413.50 (pre-drop impact, one
  pickup before drop 1), 1510.645 (pickup hit before the finale), 1547.40 (outro hit) and 1571.46 (the last hit after
  the 2.25 s near-silence).
* The silence threshold (−36 dB re loud level) counts the ambient Flame bridge and the Domitor piano gaps as silences
  (−38…−48 dB). The visual "blackout" feel there is correct.

## 9. `public/show/audio-map.json`

`{format, version, description, source, duration (1581.12), globalOffset (0), normalisation, chapters[], segments[], bars[], events[], sectionCorrections[], tempoCorrections[]}`

* `chapters[]`: the official chapter times plus `audioStart` (the measured musical start: 1.451, 114.479, 273.041,
  566.86, 637.811, 886.076, 1098.386, 1317.566), `bpm` and a note.
* `segments[]`: `{start, end, bpm, anchor (a downbeat), kick, confidence, track, region, free?, note?}`. There are 86;
  they tile 0–1581.12.
* `bars[]`: `{t, kick, low, high, flux}` for every bar (987 bars; free regions use a nominal grid).
* `events[]`: `{t, type, confidence, note}` (119 events). The types are drop, breakdown, build_start,
  silence_start/end, impact, orchestral, vocal and outro.
* `sectionCorrections[]` and `tempoCorrections[]`: the tables of §4 and §7 in machine-readable form.

The file holds derived numbers only and no audio content. It can be committed.

## Addendum (integration, 2026-09-25): kick attack phase and free-tempo onsets

* **Kick attack vs. kick body (FACT, measured).** Folding the 0.3–6 kHz onset strength over every tempo segment's
  beats puts the audible attack of the kick relative to this map's (sub-body) grid at: Discorecord −22 ms,
  Sacred Oath −83 ms (main kick; the "kick 2" part up to 341.17 s: +24 ms), L.P.A. −8 ms, Sacred Flame −99 ms,
  Embers −30 ms, In The Cold drop 1 +12 ms, finale −101 ms — consistent within ±5 ms inside each region. The
  hardstyle kicks sweep from the click into the sub over up to 0.1 s; visuals synced to the sub body look late.
  `scripts/retime-show.py` shifts the shipped tempo map to attack + 10 ms (P-centre allowance, ASSUMPTION).
* **Free-tempo onsets (FACT, measured).** `onsets[]` lists the sharp hits (≥ 12 dB level jump within 40 ms of
  the < 200 Hz or 100 Hz–8 kHz band) in the spans without a steady grid (`scripts/audio-onsets.py`). They pin the
  authored hit clusters there (e.g. Winter hit 1 = 47.94 s, hit 3 = 63.79 s, corner fireballs = 100.34 s,
  Discorecord intro hits 121.00 / 127.02 / 131.03 s, Domitor 1030.16 s).

