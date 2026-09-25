# Music analysis: The Endshow, Defqon.1 2026

Classification: every claim is tagged **FACT** (sourced or directly measured), **INFERENCE** (strong
deduction from measured data), **ASSUMPTION** (reasoned fill-in) or **UNKNOWN**.
All times are **video seconds** of `https://youtu.be/fLWY-Sxb1bE` (duration 1581 s) unless marked
`orig` (time inside the official radio edit of a track).
Research date: 2026-09-25.

---

## 0. TL;DR for the show engine

* FACT (measured): the Endshow is **not one tempo**. It is a chain of the tracks' own radio edits at
  their native tempos: **157 → 155 → 170 → 160 → (?) → (~160?) → 155 BPM**.
* INFERENCE (waveform cross-correlation, r = 0.82–0.96): four tracks play as **the unedited official radio
  edit**, placed on the video timeline at these offsets (radio-edit t=0 → video t):
  Discorecord (Galactixx Remix) **126.4 s**, Sacred Oath **273.0 s**, L.P.A. **566.0 s**, Sacred Flame **638.6 s**.
  The fifth, In The Cold, plays as **In The Cold (The Story)**. Its t=0 is at **1320.4 s**, which puts
  radio-edit t=0 at 1384.2 s. The Endshow then leaves the record at ~1536 s for a custom outro.
* The big moments (drop downbeats, ±0.3 s):

| # | Video s | Moment | Class |
|---|---|---|---|
| 1 | 145.6 | Discorecord: heavy kick enters | INFERENCE |
| 2 | **243.5** | Discorecord: main drop (16 bars to 268.0) | INFERENCE |
| 3 | 308.6 | Sacred Oath: intro kick | INFERENCE |
| 4 | **415.4** | Sacred Oath: anthem drop 1 (after 74 s breakdown + 3 s silence at 409.3–412.3) | INFERENCE |
| 5 | **502.1** | Sacred Oath: drop 2 | INFERENCE |
| 6 | 536.2 | Sacred Oath: final kick section (to ~564) | INFERENCE |
| 7 | **589.7** | L.P.A.: uptempo drop, 170 BPM | INFERENCE |
| 8 | **793.2** | Sacred Flame: drop 1 | INFERENCE |
| 9 | **829.25** | Sacred Flame: main climax, 32 bars to 877.3 | INFERENCE |
| 10 | 933.8 | Domitor Draconis: impact after piano intro | INFERENCE (waveform only) |
| 11 | 1006.7 / 1026.9 | Domitor Draconis: climaxes | INFERENCE (low) |
| 12 | **1188.4** | Embers: drop 1 | INFERENCE (medium) |
| 13 | 1255.5 / 1287–1293 | Embers: drop 2 / final climax | INFERENCE (medium) |
| 14 | 1412.1 | In The Cold: drop 1 | INFERENCE |
| 15 | **1511.2** | In The Cold: **grand finale drop**, 16 bars to 1536.0 | INFERENCE; also the YouTube "most replayed" peak, a FACT |

* The quietest and calmest parts, good for slow orchestral staging, are listed below.

| Video s | Calm part | Class |
|---|---|---|
| 0–45 | Vivaldi opening | INFERENCE |
| 110–126 | Dramatic silence and hits | INFERENCE |
| 206.8–219.0 | Discorecord breakdown | INFERENCE |
| 341–409 | Sacred Oath main breakdown with E-Life vocals | INFERENCE |
| 440–502 | Sacred Oath mid-breakdown | INFERENCE |
| 622–649 | Blackout / ambient bridge | INFERENCE |
| 886–934 | Domitor piano intro | INFERENCE |
| 1098–1132 | Embers intro | INFERENCE |
| 1320–1409 | In The Cold "Story" intro | INFERENCE |
| 1461–1499 | In The Cold emotional breakdown | INFERENCE |
| 1536–1551 | Outro | INFERENCE |

* The full section map is in section 5, and a machine-readable JSON version is in section 6.

---

## 1. Evidence base and method

| Source | What it gave | Class |
|---|---|---|
| YouTube metadata (yt-dlp JSON already in scratchpad `yt/meta.json`) | chapters, description, **"most replayed" heatmap (100 bins × 15.8 s)**, duration 1581 s, upload 2026-07-02, 1,969,028 views / 48,521 likes (at fetch time) | FACT |
| Deezer public API (`api.deezer.com/search`, `/track/{id}`) | 30 s preview MP3s, durations, release dates, ISRCs, Deezer BPM (only for the 2011 Discorecord: 149.8) | FACT |
| iTunes Search API | second set of 30 s previews (AAC), durations, dates | FACT |
| **Hardstyle.com track previews** (`hardstyle.com/track_preview/375/<uuid>`) | **long previews ≈ 80 % of each extended mix**: Sacred Oath 257 s, Sacred Flame 221 s, In The Cold 194 s, L.P.A. 140 s, Discorecord (Galactixx) 139 s. Used for per-bar structure analysis. | FACT (audio), analysis = INFERENCE |
| SoundCloud waveform JSON (`wave.sndcdn.com/<id>_m.json`, 1800 peak samples per track) | amplitude envelopes of (a) the official Q-dance radio edits, (b) **five fan re-uploads of the full Endshow audio (1581.2 s)**, (c) fan rips of single Endshow segments (Discorecord 159.2 s, Sacred Flame 266.5 s, Embers 219.3 / 223.9 s). **No audio downloaded from SoundCloud**; only the public waveform images/JSON. | FACT (data), alignment = INFERENCE |
| Mixgraph, SongBPM, web search summaries | published BPM / key | FACT (third-party) |
| Storyboard frames (160 × 320×180, every 9.88 s) | visual confirmation of drops (pyro, fireworks), performers | FACT (what is visible) |

Analysis pipeline. Scripts are in the scratchpad `refs/music/` and `web_music/`; nothing copyrighted is in the repo.

1. **Tempo.** Onset envelope of the 35–150 Hz kick band, a phase-aligned comb search from 120 to 185 BPM
   in 0.05 BPM steps, then linear regression over the detected kick onsets. It was run on every preview.
   It was cross-checked with librosa `beat_track` and with the spectral peak of the high-resolution waveform.
2. **Key.** Krumhansl-Schmuckler correlation on the mean CQT chroma of harmonic-separated audio. This is
   weak on 30 s clips, so the published key is preferred wherever one exists.
3. **Where the previews sit in each track.** The preview's peak envelope was cross-correlated with the SoundCloud
   waveform of the radio edit (r = 0.87–0.97). Example: the Sacred Oath Deezer preview is orig 136.0–166.0 s.
4. **Where each track sits in the Endshow.** The radio-edit waveform, and the fan rips of single segments, were
   cross-correlated against the full-Endshow waveform, first in chunks (to detect edits) and then at
   0.01 s sub-bin steps. Every value was checked against a second upload of the full Endshow.
5. **Per-bar structure.** For each long preview: sub-bass (30–110 Hz) level and full-band level per bar,
   printed on a bar grid anchored at a detected drop downbeat. Spot checks on mel spectrograms
   (kick = regular vertical striping). A kick section = sub level within about 4 dB of the track maximum and
   regular striping.
6. **Tracks with no official audio** (Vivaldi "Defqon.1 Version", Domitor Draconis) and Embers (fan rip only):
   structure comes from the waveform envelope, plus heatmap and storyboard. Confidence is lower.

Precision: offsets are ±0.2–0.3 s; drop downbeats are ±0.3 s; sections are ±1 bar (~1.5 s).
The Endshow waveform itself has only 0.878 s resolution, so segments covered only by it are ±1 s.

---

## 2. Per-track reference data

| # | Track (chapter start) | BPM | Key | Radio / ext. length | Release, label, ISRC |
|---|---|---|---|---|---|
| 1 | VIVALDI - The Four Seasons "Winter" (Defqon.1 Version), 00:00 | UNKNOWN (no audio source found; see §4.1) | original concerto: **F minor**, RV 297, 1st mvt "Allegro non molto" (FACT, Wikipedia) | UNKNOWN; not found on Deezer / iTunes / SoundCloud / Hardstyle.com (FACT as of 2026-09-25) | UNKNOWN; probably exclusive to the Endshow (ASSUMPTION) |
| 2 | Frontliner - Discorecord (Galactixx Remix), 01:55 | **157** (measured 157.00 / 156.82–157.02; FACT Mixgraph 157) | **D major** (FACT Mixgraph, Camelot 10B); measured chroma ambiguous (E min / G maj / D maj) | radio **156.7 s**; extended 2:54 (FACT) | released 2026-07-24 (Deezer; hardstyle.com news); Scantraxx / Defqon.1 Records; ISRC NLS762600280. The 2011 original is **150 BPM** (FACT: Deezer 149.8, SongBPM 150, measured 150.0), key "A" per SongBPM |
| 3 | D-Sturb ft. E-Life - Sacred Oath (Defqon.1 2026 Anthem), 04:34 | **155** (FACT Mixgraph / Beatport summary; measured 155.00) | **F minor** (FACT Mixgraph, Camelot 4A; measured F min r=0.73 ✓) | radio **298.9 s**; extended 5:22 | 2026-03-26; Defqon.1 Records; ISRC NLH2L2600063 |
| 4 | Akimbo & Missy - L.P.A. (Losse Polsjes Anthem), 09:27 | **170** (measured 170.00 / 169.8; genre listed as *Uptempo* on hardstyle.com) | UNKNOWN (measured F minor, r=0.51, weak) | radio **151.1 s**; extended 2:55 | 2026-05-21/22; Q-dance Records; ISRC NLH2L2600126 |
| 5 | Bass Modulators - Sacred Flame, 10:22 | **160** (measured 160.00 / 159.9 / 160.0 from the waveform spectrum); Mixgraph says 159 | **A♭ (G♯) minor** (FACT Mixgraph, Camelot 1A; measured G♯ min ✓) | radio **246.0 s**; extended 4:36 | 2026-07-17; Defqon.1 Records; ISRC NLH2L2600214 |
| 6 | JDX - Domitor Draconis, 14:46 | UNKNOWN (unreleased; not on Deezer / iTunes / SoundCloud / Hardstyle.com). Intro hits every ~6.66 s; possibly 144 BPM (4 bars) or a free-tempo piano intro (INFERENCE, low) | UNKNOWN | UNKNOWN | UNKNOWN (unreleased per WeRaveYou) |
| 7 | D-Block & S-te-Fan - Embers, 18:18 | **~160?** (INFERENCE, low: waveform-spectrum peaks at 159.5–160.8 BPM in 4 of 5 windows; two drop onsets are 105.0 s = 70 bars @160 apart) | UNKNOWN | UNKNOWN (unreleased; only fan rips of the Endshow segment exist, both posted 2026-07-02) | UNKNOWN |
| 8 | Atmozfears & Jesse Jax - In The Cold, 21:58 | **155** (FACT Mixgraph / web summary; measured 155.00) | **E major** (FACT Mixgraph, Camelot 12B; measured A maj / E maj, ambiguous) | radio **214.2 s**; *The Story* **295.6 s**; extended 4:03 | 2026-07-10 (Deezer; Apple lists 07-03); Defqon.1 Records; ISRC NLH2L2600191 (radio), NLH2L2600230 (Story) |

Harmonic / tempo chain (INFERENCE): Winter (F minor) → Discorecord remix (D major, 157) → Sacred Oath
(F minor, 155) → L.P.A. (170) → Sacred Flame (A♭ minor, 160) → Domitor (?) → Embers (~160?) → In The Cold
(E major, 155). The opening Vivaldi movement shares the anthem's key, F minor. That is a FACT for both keys;
that the choice was deliberate is an ASSUMPTION.

Preview positions inside the radio edits. FACT: measured by cross-correlation, r ≥ 0.87. Labels place previews just before a drop.

| Track | Preview window (orig s) | Kick returns at (orig s) |
|---|---|---|
| Sacred Oath (Deezer & iTunes) | 136.0–166.0 | **142.52** |
| Discorecord Galactixx | 90.0–120.0 | **117.04** |
| L.P.A. | 18.0–48.0 | **23.72** |
| Sacred Flame | 186.0–216.0 | **190.66** |
| In The Cold radio | 119.0–149.0 | **126.9** |
| In The Cold (The Story) | 186.05–216.05 | **190.74** |

In The Cold: Story time = radio time + 63.8 s.

---

## 3. How the Endshow was assembled (alignment results)

| Track | Official edit used | Radio t=0 at video | Match | Portion used (orig s) | Video span of the music | Class |
|---|---|---|---|---|---|---|
| Discorecord (Galactixx Remix) | radio edit | **126.4** (rip-based 126.4, direct 126.46) | r=0.90 (radio vs full Endshow), 0.96 (radio vs 159.2 s fan rip, constant offset over orig 0–132) | 0 → ~141.6 (climax cut after 16 bars) | 126.4–268.0 (+ fade to 273) | INFERENCE |
| Sacred Oath | radio edit, **complete** | **273.0** | r=0.86; the offset is identical at the start (orig 0–80) and the end (orig 220–290) | 0 → 298.9 | 273.0–571.9 | INFERENCE |
| L.P.A. | radio edit, excerpt, **at native 170 BPM** | **566.0** (±0.3) | r=0.91 at 170 BPM vs 0.87 at 160 BPM and 0.83 at 155 BPM | 0 → ~56 | 566.0–~622 | INFERENCE |
| Sacred Flame | radio edit, **complete** | **638.6** | r=0.95 (vs 266.5 s fan rip, constant offset) | 0 → 246.0 | 638.6–884.6 | INFERENCE |
| Domitor Draconis | unknown (unreleased) | – | – | – | 884.6–1098.0 | – |
| Embers | unknown (unreleased) | fan rip starts at **1098.0** | r=0.93 | – | 1098.0–~1320 | INFERENCE |
| In The Cold | **The Story** version, then custom outro | Story t=0 at **1320.4**; radio t=0 at 1384.2 | r=0.79 | Story 0 → ~215.6 | 1320.4–~1536, custom outro 1536–1581 | INFERENCE |

Chapter markers vs audio. The YouTube chapters mark the visual/title changes, not always the first sample of a track (INFERENCE):
* Discorecord chapter 115, but its radio edit starts at 126.4. 110–126 is a dramatic silence and hit transition.
* Sacred Flame chapter 622, but its radio edit starts at 638.6. 622–638.6 is a quiet/black bridge.
* Title cards appear at about 563 (L.P.A.), 642 (Sacred Flame), 879 (Domitor Draconis) and 1324 (In The Cold). Source: storyboard frames, FACT.

Performers seen in the storyboard (FACT that they are visible; identities are INFERENCE):
* **A vocalist with a microphone, on the empty stage, from about 335 s to 494 s** (frames 05:35–08:14),
  during the Sacred Oath breakdowns and drop 1. By appearance (cap, shorts, handheld mic) this is **E-Life**
  (INFERENCE). The audio matches the studio radio edit (r=0.86). It was therefore a filmed performance to
  playback, not a live vocal mix (INFERENCE). No article found says so explicitly (UNKNOWN).
* **Fire dancers** on the stage from about 642 s to 731 s, during Sacred Flame's tribal-percussion intro (FACT visible).
* A **pianist at a white grand piano** at about 928 s, in the Domitor Draconis intro. Whether it is JDX: UNKNOWN.
* Press (DJ Mag, WeRaveYou) mention no live artists and say the soundtrack included *unreleased* tracks by
  Bass Modulators, JDX and D-Block & S-te-Fan (FACT).

YouTube "most replayed" heatmap. FACT; the per-chapter summary is computed.

| Chapter | Mean | Max | Hottest bin |
|---|---|---|---|
| Winter | 0.11 | 0.20 | 0–16 |
| Discorecord | 0.25 | 0.41 | 111–127 (the transition) |
| Sacred Oath | **0.09** (the least replayed) | 0.30 | 554–570 (the end) |
| L.P.A. | 0.31 | 0.49 | 617–633 |
| Sacred Flame | **0.62** | 0.80 | 775–838 |
| Domitor Draconis | 0.12 | 0.32 | 886–902 |
| Embers | 0.33 | 0.50 | 1186–1202 |
| In The Cold | 0.41 | **1.00** | **1503–1519** |

Top bins: 1503–1519 (1.00), 775–791 (0.80), 823–838 (0.80), 791–807 (0.78), 807–823 (0.77),
838–854 (0.73), 744–759 (0.73), 728–744 (0.72), 1519–1535 (0.66). Viewers rewatch the Sacred Flame drops
and the In The Cold finale. The show engine should give those the biggest pyro/firework budget (INFERENCE).

---

## 4. Track structures (original radio edits, mapped to video time)

Notation: `orig` = time in the radio edit, `v` = video time. For the energy digits, 9 = within 2 dB of the
track's loudest sub-bass bar and 0 = more than 30 dB below it. Bar lengths: 157 BPM = 1.529 s,
155 BPM = 1.548 s, 160 BPM = 1.500 s, 170 BPM = 1.412 s.

### 4.1 VIVALDI - "Winter" (Defqon.1 Version), v0–126.4 (chapter 0–115)
Source: Endshow waveform only (0.878 s resolution), plus storyboard and heatmap. INFERENCE (medium–low).

| v start–end | Section | Evidence |
|---|---|---|
| 0–32 | Opening: steady low level (≈70/140). Consistent with Vivaldi's repeated staccato string chords (F minor, *Allegro non molto*) | waveform flat-low; dark silhouettes and lantern frames at 0/9 s; stage lit blue at 19 s |
| 32–45.7 | Crescendo (level ≈85–95) | waveform |
| 45.7–69 | **Three orchestral/percussive hits** at **47.4, 55.3, 63.2** (spacing 7.9 s = 4 bars at ~120 BPM, ASSUMPTION), each followed by a decay | waveform peaks; red flame/pyro aerial at 59 s |
| 69–75.5 | Build | waveform rising |
| **75.5–97** | **Full climax** (sustained high level ≈117–123/140) | red pyro + lasers at 79 s; firework fans at 88 s |
| 97–110 | Second half: hit at 100.1, then decay (≈95–110) | waveform |
| 110–126.4 | **Dramatic transition**: near-silence 110.5–113.3, hits at 114.4–115.1 and 120.3–121.2, quiet until 126.4 | waveform; frame at 108 s shows only the dragon wings lit; heatmap 111–127 = 0.41 |

Tempo UNKNOWN. The hit spacing points to an orchestral / cinematic arrangement at ~120 BPM rather than a
150 BPM hardstyle kick (ASSUMPTION). Whether a kick drum is present in 75–97: UNKNOWN.

### 4.2 Frontliner - Discorecord (Galactixx Remix), 157 BPM, radio t0 = v126.4
Per-bar map from the Hardstyle.com preview (video = file + 128.95). Anchor downbeat = drop at **v243.46** (orig 117.04).

```
 v    bar  sub-bass per bar
133.4 -72  2222 5443   light 'disco' kick intro (spectrogram: regular kicks from ~v134, little sub)
145.6 -64  9991 9951   HEAVY KICK (1-bar fills at v150.2, v156.3)
157.9 -56  0091 9692   2 bars silence v157.9-160.9, kick again v160.9
170.1 -48  9431 6445   kick ends ~v171.6; noise riser ~v172-178
182.3 -40  4445 6545   melodic/vocal breakdown (new female vocal layer per Hardstyle.com)
194.5 -32  4455 6520
206.8 -24  0000 0003   quiet breakdown, no bass (filtered rhythmic pattern)
219.0 -16  7666 6667   build with bass
231.2  -8  7211 6412   pre-drop build, gap ~v232.8-237.4
243.5   0  9999 9991   DROP / climax (fill at v254.2)
255.7   8  9999 9991   climax continues (fill at v266.4); ends v268.0, then the Endshow fades/cuts (fan rip drops to 62/140 at v272)
```
Class: INFERENCE (bar map measured from audio; the ±0.3 s offset comes from waveform alignment).

### 4.3 D-Sturb ft. E-Life - Sacred Oath, 155 BPM, radio t0 = v273.0 (complete radio edit)
Per-bar map from the Hardstyle.com preview (video = file + 281.85). Anchor = drop 1 at **v415.44** (orig 142.52).

```
 v    bar  sub  section
273.0  -   ---  intro (cinematic/vocal), not covered by the long preview
279.2 -88  64 4425   melodic/vocal intro, no heavy kick
291.6 -80  5655 5544   melodic intro
304.0 -72  3249 9969   INTRO KICK from ~v307.0-308.6 (spectrogram-confirmed)
316.3 -64  7562 2410   kick until v319.4, then lead/'screech' riff without kick
328.7 -56  1968 7969   KICK 2 from v330.3
341.1 -48  2523 2424   MAIN BREAKDOWN starts (vocals; E-Life on screen)
353.5 -40  3342 5565   vocal + orchestral melody
365.9 -32  4655 5537
378.3 -24  7413 5656
390.7 -16  5656 5555
403.0  -8  4454 0034   build; SILENCE GAP v409.3-412.3; 2-bar pre-drop v412.3-415.4
415.4   0  9996 9984   DROP 1 (anthem climax)
427.8   8  5998 9576   climax continues, winds down ~v435.6-440.2
440.2  16  7363 7363   mid-breakdown: alternating bass stabs + vocals (no steady kick)
452.6  24  7353 7366
465.0  32  6412 5656   quieter
477.4  40  5656 6566   melodic / orchestral build (dense lead, spectrogram)
489.8  48  6532 3342   build-up / pre-drop
502.1  56  9896 9994   DROP 2
514.5  64  8988 7845   kick to ~v523.8
526.9  72  2341 029    break, near-silence v531.6-534.7, kick back at v536.2
536.2  78  9...        FINAL KICK SECTION to ~v564 (from the radio waveform: orig 263-291 flat-high)
564-572      outro fade (orig 291-298.9), overlapping the L.P.A. vocal intro from v566.0
```
Class: INFERENCE. The breakdown/drop positions are cross-checked with mel spectrograms (kick striping at
v306–316, v330–340, v415–425, v500–510; vocals without kick at v345–355 and v445–455).

### 4.4 Akimbo & Missy - L.P.A., 170 BPM, radio t0 = v566.0 (excerpt ~56 s)
Video = file + 561.9. Anchor = drop at **v589.73** (orig 23.72).
```
567.1 -16  3311 2210   Dutch vocal chant intro ("Losse Polsjes"), silence ~v576-578
578.4  -8  0000 0001   synth-stab build, no bass (8 bars)
589.7   0  8996 9910   UPTEMPO DROP (2-bar kick gaps at v598.2-601.0 and v609.5-612.3)
601.0   8  9999 9910
612.3  16  4776 66     partial kick until the cut at ~v621-622 into the Sacred Flame bridge
```
Class: INFERENCE. Visual: aerial pyro flash at about 592 s.

### 4.5 Bass Modulators - Sacred Flame, 160 BPM, radio t0 = v638.6 (complete radio edit)
Video = file + 637.1. Anchor = main drop at **v829.25** (orig 190.66).
```
622-638.6        blackout / ambient bridge (Endshow waveform ~40/140; black frames at 612-632 s)
637.2 -128 0000 0022   quiet pad intro; title card ~v642
649.2 -120 3345 5566   TRIBAL PERCUSSION section (toms/tribal drums, no hardstyle kick) - fire dancers on stage
661.2 -112 6655 6666
673.2 -104 6666 6676
685.2 -96  6665 6686
697.2 -88  6666 6533
709.2 -80  1166 7665   2-bar break v709.2-712.2 (stage flames at ~711 s), groove resumes
721.2 -72  6776 6766
733.2 -64  5232 1064   break + riser, near-silence v739.3-742.3
745.2 -56  6464 5665   melodic section with light kick (fireworks 741-780 s)
757.2 -48  5464 4366
769.2 -40  6765 6656
781.2 -32  6531 0022   BUILD-UP, silence gap v787.3-790.3
793.2 -24  9996 9980   DROP 1 (fill bar at v803.8)
805.2 -16  9999 9901   (kick-off v814.3-817.3)
817.2  -8  6554 4200   build, silence v826.3-829.3
829.2   0  9999 8888   DROP 2 = MAIN CLIMAX (32 bars)
841.2   8  9998 9888
853.2  16  999...      continues (radio waveform flat-high) to v877.3
877.3-884.6            outro fade
```
Class: INFERENCE. The heatmap peak (0.72–0.80 over 728–854) covers the build and both drops.

### 4.6 JDX - Domitor Draconis, v884.6–1098 (unreleased; Endshow waveform only)
| v | Section | Class |
|---|---|---|
| 884.6–886 | gap after Sacred Flame; title card from ~879 | INFERENCE |
| 886–933.8 | **Piano / orchestral intro**: quiet bed (≈35–45/140) with 7 hits at **887.2, 893.4, 900.4, 907.4, 914.4, 920.6, 926.7** (±0.9, spacing ≈6.66 s); green uplights, single laser beams, pianist on screen at ~928 | INFERENCE |
| **933.8** | **Impact**: jump to 124/140 | INFERENCE |
| 933.8–943.4 | decay, then a second rise at 943.4 | INFERENCE |
| 943.4–1004 | main theme, medium-high (≈90–112); dragon LED in green/red | INFERENCE (kick presence: UNKNOWN) |
| 1004–1006.7 | dip (pre-drop) | INFERENCE |
| **1006.7–1024.5** | climax 1 (≈115–125) | INFERENCE |
| 1025.1 | fill / dip | INFERENCE |
| **1026.9–1091** | climax 2 (≈120, sustained ~64 s); aerial flames at ~1027; fireworks at ~1077 | INFERENCE |
| 1091–1098 | fade into Embers | INFERENCE |

### 4.7 D-Block & S-te-Fan - Embers, v1098.0–1320 (unreleased; fan-rip waveform at 0.12 s resolution)
| v | Section | Class |
|---|---|---|
| 1098.0–1110.6 | quiet intro (pads/vocal, ≈70/140) | INFERENCE |
| 1110.6–1132 | rising intro | INFERENCE |
| 1132–1156 | rhythmic section with fills every ~6.1 s (dips at 1137.2, 1143.0, 1149.2, 1155.6); probably the intro kick | INFERENCE (low) |
| 1156–1182 | steady high (kick + lead) | INFERENCE (low) |
| 1182–1188.4 | pre-drop gap (minimum at 1185.1) | INFERENCE |
| **1188.4–1227** | **DROP 1 / climax** (fills/dips at 1205.5, 1212.1, 1217); heatmap 1186–1202 = 0.50 | INFERENCE |
| 1227–1255.3 | mid-break (dips at 1233.4, 1238.4, 1245.3), silence at 1255.2 | INFERENCE |
| **1255.5–1287** | DROP 2 | INFERENCE |
| **1287–1312** | FINAL CLIMAX (the track's loudest part; sharp rise at 1293.4; big red fireworks at ~1294) | INFERENCE |
| 1312–1320.4 | fade into In The Cold | INFERENCE |

Lyric hint (ASSUMPTION): the D-Block & S-te-Fan Facebook post for Embers is captioned "Come meet me right at the end, at a place we call home".

### 4.8 Atmozfears & Jesse Jax - In The Cold (The Story), 155 BPM, Story t0 = v1320.4 (radio t0 = v1384.2)
Video = file + 1379.4. Anchor = finale drop at **v1511.18** (radio orig 126.93, Story 190.74).
```
1320.4-1384.2   'The Story' exclusive intro (~64 s): atmospheric, no heavy kick (waveform medium, ASSUMPTION)
1387.3 -80  2111 1111   radio intro: pads/vocal, no kick
1399.7 -72  1112 1254   builds; silence ~v1410.5-1412
1412.1 -64  0695 9799   DROP 1 (kick firm from v1413.6)
1424.5 -56  8696 9695
1436.9 -48  9699 9999
1449.2 -40  8745 6203   kick ends ~v1452.3; noise riser; silence ~v1458.5
1461.6 -32  3322 2225   breakdown: percussion/claps, no bass
1474.0 -24  5654 6554   emotional melodic breakdown / lead
1486.4 -16  5554 5545
1498.8  -8  3434 3223   build-up
1511.2   0  9999 9987   GRAND FINALE DROP (heatmap max; fireworks at 1501-1511)
1523.6   8  9697 9873   to v1536.0
1536.0  16  ....        Endshow leaves the record: custom outro (see §5)
```
After 1536 the Endshow waveform (≈70–120, with dips) no longer matches the radio edit (flat 135) or the Story
version. The last 45 s are an Endshow-specific outro (INFERENCE):
* 1536–1551: melodic breakdown; blue flames on stage at 1541–1551.
* 1551–1557: final swell (peak at 1554.8).
* 1557–1577: closing hits with dips at 1563.6, 1569–1571 and 1576. The picture is black from ~1561.
* 1577.6–1581: silence.

---

## 5. SECTION MAP of the Endshow (video seconds 0–1581)

Energy runs from 0 (silence) to 10 (finale). Conf: H = measured from audio preview + alignment (±0.5 s);
M = waveform/heatmap/visual agreement (±1–1.5 s); L = waveform only or reasoned (±2–4 s).

| # | t0 | t1 | Track | Section | Energy | Conf | Class |
|---|---|---|---|---|---|---|---|
| 1 | 0.0 | 32.0 | Winter | Opening: quiet repeated strings, dark silhouettes | 2 | M | INFERENCE |
| 2 | 32.0 | 45.7 | Winter | Crescendo | 3 | M | INFERENCE |
| 3 | 45.7 | 69.0 | Winter | Three orchestral hits (47.4, 55.3, 63.2) + decays → pyro bursts | 5 | M | INFERENCE |
| 4 | 69.0 | 75.5 | Winter | Build | 5 | L | INFERENCE |
| 5 | 75.5 | 97.0 | Winter | Full orchestral climax (red pyro, lasers, firework fans) | 8 | M | INFERENCE |
| 6 | 97.0 | 110.0 | Winter | Second half, hit at 100.1, decaying | 6 | L | INFERENCE |
| 7 | 110.0 | 126.4 | Winter→Discorecord | Dramatic silence + hits (114.4, 120.3); dragon-wing reveal | 3 | M | INFERENCE |
| 8 | 126.4 | 134.0 | Discorecord | Intro hits + short silence | 4 | M | INFERENCE |
| 9 | 134.0 | 145.6 | Discorecord | Light "disco" kick intro | 6 | H | INFERENCE |
| 10 | 145.6 | 157.9 | Discorecord | Heavy kick (fills at 150.2, 156.3) | 8 | H | INFERENCE |
| 11 | 157.9 | 160.9 | Discorecord | 2-bar silence | 2 | H | INFERENCE |
| 12 | 160.9 | 171.6 | Discorecord | Kick section | 8 | H | INFERENCE |
| 13 | 171.6 | 182.3 | Discorecord | Noise riser → breakdown entry | 4 | M | INFERENCE |
| 14 | 182.3 | 206.8 | Discorecord | Melodic/vocal breakdown (female vocal) | 4 | H | INFERENCE |
| 15 | 206.8 | 219.0 | Discorecord | Quiet breakdown, no bass | 3 | H | INFERENCE |
| 16 | 219.0 | 231.2 | Discorecord | Build with bass | 6 | H | INFERENCE |
| 17 | 231.2 | 243.5 | Discorecord | Pre-drop build (gap ~232.8–237.4) | 6 | H | INFERENCE |
| 18 | **243.5** | 268.0 | Discorecord | **DROP / climax (16 bars)** | 9 | H | INFERENCE |
| 19 | 268.0 | 273.0 | Discorecord→Oath | Fade/cut transition | 4 | M | INFERENCE |
| 20 | 273.0 | 307.0 | Sacred Oath | Cinematic/vocal + melodic intro | 4 | H | INFERENCE |
| 21 | 307.0 | 319.4 | Sacred Oath | Intro kick | 7 | H | INFERENCE |
| 22 | 319.4 | 330.3 | Sacred Oath | Lead riff, no kick | 5 | H | INFERENCE |
| 23 | 330.3 | 341.1 | Sacred Oath | Kick 2 | 7 | H | INFERENCE |
| 24 | 341.1 | 403.0 | Sacred Oath | **Main breakdown**: E-Life vocals + orchestral melody (MC on stage 335–494) | 3 | H | INFERENCE |
| 25 | 403.0 | 409.3 | Sacred Oath | Build-up | 6 | H | INFERENCE |
| 26 | 409.3 | 412.3 | Sacred Oath | Silence gap (blackout moment) | 1 | H | INFERENCE |
| 27 | 412.3 | 415.4 | Sacred Oath | 2-bar pre-drop | 6 | H | INFERENCE |
| 28 | **415.4** | 440.2 | Sacred Oath | **ANTHEM DROP 1 (16 bars)** | 9 | H | INFERENCE |
| 29 | 440.2 | 465.0 | Sacred Oath | Mid-breakdown: bass stabs + vocals | 5 | H | INFERENCE |
| 30 | 465.0 | 477.4 | Sacred Oath | Quiet section | 3 | H | INFERENCE |
| 31 | 477.4 | 489.8 | Sacred Oath | Orchestral/melodic build | 5 | H | INFERENCE |
| 32 | 489.8 | 502.1 | Sacred Oath | Build-up / pre-drop | 6 | H | INFERENCE |
| 33 | **502.1** | 523.8 | Sacred Oath | **ANTHEM DROP 2** | 9 | H | INFERENCE |
| 34 | 523.8 | 531.6 | Sacred Oath | Break | 4 | H | INFERENCE |
| 35 | 531.6 | 534.7 | Sacred Oath | Near-silence | 1 | H | INFERENCE |
| 36 | 534.7 | 536.2 | Sacred Oath | Pickup | 5 | H | INFERENCE |
| 37 | 536.2 | 564.0 | Sacred Oath | Final kick section / climax 3 | 9 | M | INFERENCE |
| 38 | 564.0 | 566.0 | Sacred Oath | Outro fade | 3 | M | INFERENCE |
| 39 | 566.0 | 578.4 | L.P.A. | Vocal chant intro (title card ~563) | 4 | H | INFERENCE |
| 40 | 578.4 | 589.7 | L.P.A. | Synth-stab build, no bass | 5 | H | INFERENCE |
| 41 | **589.7** | 612.3 | L.P.A. | **UPTEMPO DROP, 170 BPM** (gaps 598.2–601.0, 609.5–612.3) | 9 | H | INFERENCE |
| 42 | 612.3 | 622.0 | L.P.A. | Partial kick, cut | 7 | M | INFERENCE |
| 43 | 622.0 | 638.6 | bridge | Blackout / ambient bridge | 1 | M | INFERENCE |
| 44 | 638.6 | 649.2 | Sacred Flame | Quiet pad intro (title card ~642) | 2 | H | INFERENCE |
| 45 | 649.2 | 709.2 | Sacred Flame | **Tribal percussion** (fire dancers) | 5 | H | INFERENCE |
| 46 | 709.2 | 712.2 | Sacred Flame | 2-bar break (stage flames ~711) | 3 | H | INFERENCE |
| 47 | 712.2 | 733.2 | Sacred Flame | Tribal groove + melody | 6 | H | INFERENCE |
| 48 | 733.2 | 745.2 | Sacred Flame | Break + riser (near-silence 739.3–742.3) | 3 | H | INFERENCE |
| 49 | 745.2 | 781.2 | Sacred Flame | Melodic section with light kick (fireworks) | 6 | H | INFERENCE |
| 50 | 781.2 | 793.2 | Sacred Flame | Build-up (silence 787.3–790.3) | 6 | H | INFERENCE |
| 51 | **793.2** | 817.2 | Sacred Flame | **DROP 1** (fill 803.8; kick-off 814.3–817.3) | 9 | H | INFERENCE |
| 52 | 817.2 | 829.25 | Sacred Flame | Build (silence 826.3–829.3) | 6 | H | INFERENCE |
| 53 | **829.25** | 877.3 | Sacred Flame | **MAIN CLIMAX (32 bars)** | 10 | H | INFERENCE |
| 54 | 877.3 | 886.0 | Sacred Flame→Domitor | Outro fade (title card ~879) | 3 | M | INFERENCE |
| 55 | 886.0 | 933.8 | Domitor | Piano/orchestral intro with 7 hits (~6.66 s apart) | 2 | M | INFERENCE |
| 56 | **933.8** | 943.4 | Domitor | Impact + decay | 7 | M | INFERENCE |
| 57 | 943.4 | 1004.0 | Domitor | Main theme (dragon LED) | 6 | L | INFERENCE |
| 58 | 1004.0 | 1006.7 | Domitor | Pre-drop dip | 3 | L | INFERENCE |
| 59 | **1006.7** | 1025.1 | Domitor | Climax 1 | 8 | L | INFERENCE |
| 60 | 1025.1 | 1026.9 | Domitor | Fill | 5 | L | INFERENCE |
| 61 | **1026.9** | 1091.0 | Domitor | Climax 2 (flames ~1027, fireworks ~1077) | 8 | L | INFERENCE |
| 62 | 1091.0 | 1098.0 | Domitor→Embers | Fade | 3 | M | INFERENCE |
| 63 | 1098.0 | 1110.6 | Embers | Quiet intro | 2 | M | INFERENCE |
| 64 | 1110.6 | 1132.0 | Embers | Rising intro (blue laser sheets) | 4 | M | INFERENCE |
| 65 | 1132.0 | 1156.0 | Embers | Rhythmic section with fills | 6 | L | INFERENCE |
| 66 | 1156.0 | 1182.0 | Embers | Steady kick + lead | 7 | L | INFERENCE |
| 67 | 1182.0 | 1188.4 | Embers | Pre-drop gap | 3 | M | INFERENCE |
| 68 | **1188.4** | 1227.0 | Embers | **DROP 1** | 9 | M | INFERENCE |
| 69 | 1227.0 | 1255.3 | Embers | Mid-break | 5 | M | INFERENCE |
| 70 | **1255.5** | 1287.0 | Embers | DROP 2 | 8 | M | INFERENCE |
| 71 | **1287.0** | 1312.0 | Embers | **Final climax** (red fireworks ~1294) | 9 | M | INFERENCE |
| 72 | 1312.0 | 1320.4 | Embers→Cold | Fade | 3 | M | INFERENCE |
| 73 | 1320.4 | 1384.2 | In The Cold | "The Story" intro (title card ~1324; gold/white laser sheets) | 3 | M | INFERENCE / ASSUMPTION |
| 74 | 1384.2 | 1409.0 | In The Cold | Atmospheric intro, no kick | 2 | H | INFERENCE |
| 75 | 1409.0 | 1412.1 | In The Cold | Build + silence | 4 | H | INFERENCE |
| 76 | **1412.1** | 1452.3 | In The Cold | **DROP 1** | 8 | H | INFERENCE |
| 77 | 1452.3 | 1461.6 | In The Cold | Riser / break (silence ~1458.5) | 4 | H | INFERENCE |
| 78 | 1461.6 | 1474.0 | In The Cold | Percussive breakdown | 3 | H | INFERENCE |
| 79 | 1474.0 | 1498.8 | In The Cold | Emotional melodic breakdown | 4 | H | INFERENCE |
| 80 | 1498.8 | 1511.2 | In The Cold | Final build-up | 7 | H | INFERENCE |
| 81 | **1511.2** | 1536.0 | In The Cold | **GRAND FINALE DROP (16 bars)** | 10 | H | INFERENCE |
| 82 | 1536.0 | 1551.0 | Outro | Melodic breakdown (blue flames) | 4 | M | INFERENCE |
| 83 | 1551.0 | 1557.0 | Outro | Final swell | 7 | L | INFERENCE |
| 84 | 1557.0 | 1577.6 | Outro | Closing hits / fade (black from ~1561) | 3 | L | INFERENCE |
| 85 | 1577.6 | 1581.0 | Outro | Silence | 0 | M | INFERENCE |

### 5.1 Tempo / beat-grid map (for beat-synced strobes, kicks, CO2 and flame hits)

| Video span | BPM | Beat (s) | Bar (s) | Downbeat anchor (video s) | Class |
|---|---|---|---|---|---|
| 0–126.4 | UNKNOWN (ASSUMPTION ~120, orchestral) | – | – | hits at 47.4 / 55.3 / 63.2 | ASSUMPTION |
| 126.4–273.0 | **157.0** | 0.38217 | 1.5287 | **243.46** | INFERENCE (±0.3 s) |
| 273.0–566.0 | **155.0** | 0.38710 | 1.5484 | **415.44** | INFERENCE (±0.3 s) |
| 566.0–622.0 | **170.0** | 0.35294 | 1.4118 | **589.73** | INFERENCE (±0.3 s) |
| 638.6–886.0 | **160.0** | 0.37500 | 1.5000 | **829.25** | INFERENCE (±0.3 s) |
| 886.0–1098.0 | UNKNOWN (ASSUMPTION 150–160; intro possibly 144 or free) | – | – | 933.8 (impact) | UNKNOWN |
| 1098.0–1320.4 | ~160 (low confidence) | 0.375 | 1.5 | 1188.4 (drop 1) | INFERENCE (low) |
| 1320.4–1536.0 | **155.0** | 0.38710 | 1.5484 | **1511.18** | INFERENCE (±0.3 s) |
| 1536–1581 | ~155 (custom outro) | – | – | – | ASSUMPTION |

Beat k of a segment is at `anchor + k × beat` (k may be negative). Downbeats are every 4 beats.
Recommendation (ASSUMPTION): expose a per-segment "beat offset" debug slider of ±0.4 s. The waveform-based
alignment is accurate to about 0.3 s, which is under one beat, so a quick manual nudge while listening to the
YouTube audio will make kick strobes sample-tight.

---

## 6. Machine-readable section map (JSON)

```json
{
  "source": "https://youtu.be/fLWY-Sxb1bE",
  "duration": 1581,
  "tempoSegments": [
    {"t0": 0,      "t1": 126.4,  "bpm": null,  "anchor": null,    "conf": "L"},
    {"t0": 126.4,  "t1": 273.0,  "bpm": 157.0, "anchor": 243.46,  "conf": "H"},
    {"t0": 273.0,  "t1": 566.0,  "bpm": 155.0, "anchor": 415.44,  "conf": "H"},
    {"t0": 566.0,  "t1": 622.0,  "bpm": 170.0, "anchor": 589.73,  "conf": "H"},
    {"t0": 622.0,  "t1": 638.6,  "bpm": null,  "anchor": null,    "conf": "M"},
    {"t0": 638.6,  "t1": 886.0,  "bpm": 160.0, "anchor": 829.25,  "conf": "H"},
    {"t0": 886.0,  "t1": 1098.0, "bpm": null,  "anchor": 933.8,   "conf": "L"},
    {"t0": 1098.0, "t1": 1320.4, "bpm": 160.0, "anchor": 1188.4,  "conf": "L"},
    {"t0": 1320.4, "t1": 1536.0, "bpm": 155.0, "anchor": 1511.18, "conf": "H"},
    {"t0": 1536.0, "t1": 1581.0, "bpm": null,  "anchor": null,    "conf": "L"}
  ],
  "sections": [
    {"t0":0,"t1":32,"track":"winter","type":"intro","energy":2,"conf":"M"},
    {"t0":32,"t1":45.7,"track":"winter","type":"build","energy":3,"conf":"M"},
    {"t0":45.7,"t1":69,"track":"winter","type":"hits","energy":5,"conf":"M","hits":[47.4,55.3,63.2]},
    {"t0":69,"t1":75.5,"track":"winter","type":"build","energy":5,"conf":"L"},
    {"t0":75.5,"t1":97,"track":"winter","type":"climax","energy":8,"conf":"M"},
    {"t0":97,"t1":110,"track":"winter","type":"breakdown","energy":6,"conf":"L","hits":[100.1]},
    {"t0":110,"t1":126.4,"track":"winter","type":"transition","energy":3,"conf":"M","hits":[114.4,120.3]},
    {"t0":126.4,"t1":134.0,"track":"discorecord","type":"intro","energy":4,"conf":"M"},
    {"t0":134.0,"t1":145.6,"track":"discorecord","type":"kick","energy":6,"conf":"H"},
    {"t0":145.6,"t1":157.9,"track":"discorecord","type":"kick","energy":8,"conf":"H"},
    {"t0":157.9,"t1":160.9,"track":"discorecord","type":"gap","energy":2,"conf":"H"},
    {"t0":160.9,"t1":171.6,"track":"discorecord","type":"kick","energy":8,"conf":"H"},
    {"t0":171.6,"t1":182.3,"track":"discorecord","type":"build","energy":4,"conf":"M"},
    {"t0":182.3,"t1":206.8,"track":"discorecord","type":"breakdown","energy":4,"conf":"H"},
    {"t0":206.8,"t1":219.0,"track":"discorecord","type":"breakdown","energy":3,"conf":"H"},
    {"t0":219.0,"t1":243.46,"track":"discorecord","type":"build","energy":6,"conf":"H"},
    {"t0":243.46,"t1":268.0,"track":"discorecord","type":"drop","energy":9,"conf":"H"},
    {"t0":268.0,"t1":273.0,"track":"discorecord","type":"transition","energy":4,"conf":"M"},
    {"t0":273.0,"t1":307.0,"track":"sacred_oath","type":"intro","energy":4,"conf":"H"},
    {"t0":307.0,"t1":319.4,"track":"sacred_oath","type":"kick","energy":7,"conf":"H"},
    {"t0":319.4,"t1":330.3,"track":"sacred_oath","type":"breakdown","energy":5,"conf":"H"},
    {"t0":330.3,"t1":341.1,"track":"sacred_oath","type":"kick","energy":7,"conf":"H"},
    {"t0":341.1,"t1":403.0,"track":"sacred_oath","type":"breakdown","energy":3,"conf":"H","note":"E-Life vocals, MC on stage 335-494"},
    {"t0":403.0,"t1":409.3,"track":"sacred_oath","type":"build","energy":6,"conf":"H"},
    {"t0":409.3,"t1":412.3,"track":"sacred_oath","type":"gap","energy":1,"conf":"H"},
    {"t0":412.3,"t1":415.44,"track":"sacred_oath","type":"build","energy":6,"conf":"H"},
    {"t0":415.44,"t1":440.2,"track":"sacred_oath","type":"drop","energy":9,"conf":"H"},
    {"t0":440.2,"t1":465.0,"track":"sacred_oath","type":"breakdown","energy":5,"conf":"H"},
    {"t0":465.0,"t1":477.4,"track":"sacred_oath","type":"breakdown","energy":3,"conf":"H"},
    {"t0":477.4,"t1":502.15,"track":"sacred_oath","type":"build","energy":6,"conf":"H"},
    {"t0":502.15,"t1":523.8,"track":"sacred_oath","type":"drop","energy":9,"conf":"H"},
    {"t0":523.8,"t1":531.6,"track":"sacred_oath","type":"breakdown","energy":4,"conf":"H"},
    {"t0":531.6,"t1":534.7,"track":"sacred_oath","type":"gap","energy":1,"conf":"H"},
    {"t0":534.7,"t1":536.2,"track":"sacred_oath","type":"build","energy":5,"conf":"H"},
    {"t0":536.2,"t1":564.0,"track":"sacred_oath","type":"drop","energy":9,"conf":"M"},
    {"t0":564.0,"t1":566.0,"track":"sacred_oath","type":"outro","energy":3,"conf":"M"},
    {"t0":566.0,"t1":578.4,"track":"lpa","type":"intro","energy":4,"conf":"H"},
    {"t0":578.4,"t1":589.73,"track":"lpa","type":"build","energy":5,"conf":"H"},
    {"t0":589.73,"t1":612.3,"track":"lpa","type":"drop","energy":9,"conf":"H","gaps":[[598.2,601.0],[609.5,612.3]]},
    {"t0":612.3,"t1":622.0,"track":"lpa","type":"kick","energy":7,"conf":"M"},
    {"t0":622.0,"t1":638.6,"track":"bridge","type":"ambient","energy":1,"conf":"M"},
    {"t0":638.6,"t1":649.2,"track":"sacred_flame","type":"intro","energy":2,"conf":"H"},
    {"t0":649.2,"t1":709.2,"track":"sacred_flame","type":"tribal","energy":5,"conf":"H"},
    {"t0":709.2,"t1":712.2,"track":"sacred_flame","type":"gap","energy":3,"conf":"H"},
    {"t0":712.2,"t1":733.2,"track":"sacred_flame","type":"tribal","energy":6,"conf":"H"},
    {"t0":733.2,"t1":745.2,"track":"sacred_flame","type":"build","energy":3,"conf":"H"},
    {"t0":745.2,"t1":781.2,"track":"sacred_flame","type":"kick","energy":6,"conf":"H"},
    {"t0":781.2,"t1":793.25,"track":"sacred_flame","type":"build","energy":6,"conf":"H","gaps":[[787.3,790.3]]},
    {"t0":793.25,"t1":817.25,"track":"sacred_flame","type":"drop","energy":9,"conf":"H","gaps":[[803.8,805.3],[814.3,817.3]]},
    {"t0":817.25,"t1":829.25,"track":"sacred_flame","type":"build","energy":6,"conf":"H","gaps":[[826.3,829.3]]},
    {"t0":829.25,"t1":877.3,"track":"sacred_flame","type":"drop","energy":10,"conf":"H"},
    {"t0":877.3,"t1":886.0,"track":"sacred_flame","type":"outro","energy":3,"conf":"M"},
    {"t0":886.0,"t1":933.8,"track":"domitor","type":"intro","energy":2,"conf":"M","hits":[887.2,893.4,900.4,907.4,914.4,920.6,926.7]},
    {"t0":933.8,"t1":943.4,"track":"domitor","type":"impact","energy":7,"conf":"M"},
    {"t0":943.4,"t1":1004.0,"track":"domitor","type":"theme","energy":6,"conf":"L"},
    {"t0":1004.0,"t1":1006.7,"track":"domitor","type":"gap","energy":3,"conf":"L"},
    {"t0":1006.7,"t1":1025.1,"track":"domitor","type":"drop","energy":8,"conf":"L"},
    {"t0":1025.1,"t1":1026.9,"track":"domitor","type":"gap","energy":5,"conf":"L"},
    {"t0":1026.9,"t1":1091.0,"track":"domitor","type":"drop","energy":8,"conf":"L"},
    {"t0":1091.0,"t1":1098.0,"track":"domitor","type":"outro","energy":3,"conf":"M"},
    {"t0":1098.0,"t1":1110.6,"track":"embers","type":"intro","energy":2,"conf":"M"},
    {"t0":1110.6,"t1":1132.0,"track":"embers","type":"build","energy":4,"conf":"M"},
    {"t0":1132.0,"t1":1156.0,"track":"embers","type":"kick","energy":6,"conf":"L"},
    {"t0":1156.0,"t1":1182.0,"track":"embers","type":"kick","energy":7,"conf":"L"},
    {"t0":1182.0,"t1":1188.4,"track":"embers","type":"gap","energy":3,"conf":"M"},
    {"t0":1188.4,"t1":1227.0,"track":"embers","type":"drop","energy":9,"conf":"M"},
    {"t0":1227.0,"t1":1255.5,"track":"embers","type":"breakdown","energy":5,"conf":"M"},
    {"t0":1255.5,"t1":1287.0,"track":"embers","type":"drop","energy":8,"conf":"M"},
    {"t0":1287.0,"t1":1312.0,"track":"embers","type":"drop","energy":9,"conf":"M"},
    {"t0":1312.0,"t1":1320.4,"track":"embers","type":"outro","energy":3,"conf":"M"},
    {"t0":1320.4,"t1":1384.2,"track":"in_the_cold","type":"intro","energy":3,"conf":"M","note":"The Story intro"},
    {"t0":1384.2,"t1":1409.0,"track":"in_the_cold","type":"intro","energy":2,"conf":"H"},
    {"t0":1409.0,"t1":1412.1,"track":"in_the_cold","type":"build","energy":4,"conf":"H"},
    {"t0":1412.1,"t1":1452.3,"track":"in_the_cold","type":"drop","energy":8,"conf":"H"},
    {"t0":1452.3,"t1":1461.6,"track":"in_the_cold","type":"build","energy":4,"conf":"H"},
    {"t0":1461.6,"t1":1474.0,"track":"in_the_cold","type":"breakdown","energy":3,"conf":"H"},
    {"t0":1474.0,"t1":1498.8,"track":"in_the_cold","type":"breakdown","energy":4,"conf":"H"},
    {"t0":1498.8,"t1":1511.18,"track":"in_the_cold","type":"build","energy":7,"conf":"H"},
    {"t0":1511.18,"t1":1536.0,"track":"in_the_cold","type":"drop","energy":10,"conf":"H","note":"grand finale, YouTube most-replayed peak"},
    {"t0":1536.0,"t1":1551.0,"track":"outro","type":"breakdown","energy":4,"conf":"M"},
    {"t0":1551.0,"t1":1557.0,"track":"outro","type":"climax","energy":7,"conf":"L"},
    {"t0":1557.0,"t1":1577.6,"track":"outro","type":"outro","energy":3,"conf":"L"},
    {"t0":1577.6,"t1":1581.0,"track":"outro","type":"silence","energy":0,"conf":"M"}
  ]
}
```

---

## 7. Unknowns and how to close them

* **UNKNOWN**: the tempo and structure of the Vivaldi "Defqon.1 Version" and of JDX "Domitor Draconis". Neither is
  released or previewable anywhere (checked Deezer, iTunes, SoundCloud and Hardstyle.com on 2026-09-25).
  When they are released, rerun `refs/music/sublevel.py <preview> <bpm> <anchor> <video_offset>` on a preview.
* **UNKNOWN**: Embers BPM (~160 is a weak inference) and key. There is no official release yet, only fan rips of the Endshow segment.
* **UNKNOWN**: the exact content of the In The Cold "Story" intro (1320–1384). The previews cover only the song body.
* **UNKNOWN**: whether E-Life's on-stage performance included any live vocal. The audio matches the studio radio edit.
* **Not obtained**: 1001Tracklists (HTTP 401), Beatport (403) and Harderstate forum threads (403) all blocked the
  fetch. The web-search budget was exhausted before Tunebat could be tried. No third-party discussion of *which
  parts* of the tracks were used was found. §3 derives that from the audio data instead.
* Precision limit: the Endshow waveform has 0.878 s resolution. Segments covered by the Hardstyle.com previews
  (126–268, 282–539, 562–622, 637–858, 1379–1573) are bar-accurate. The rest (0–126, 884–1320, 1536–1581) is ±1–3 s.

---

## Sources

* The Endshow video, chapters, description, heatmap: https://www.youtube.com/watch?v=fLWY-Sxb1bE (metadata via yt-dlp JSON)
* DJ Mag, "Defqon.1 share 2026 Endshow filmed without audience after heatwave cancellation": https://djmag.com/news/defqon1-share-2026-endshow-filmed-without-audience-after-heatwave-cancellation-watch
* WeRaveYou, "Defqon.1 share 2026 Endshow filmed without audience": https://weraveyou.com/2026/07/defqon-1-2026-endshow-filmed-empty-grounds/
* EDMTunes, "Defqon.1 Seems to Have Recorded the 2026 Endshow Without Attendees" (29 June 2026): https://www.edmtunes.com/2026/06/defqon-1-seems-to-have-recorded-the-2026-endshow-without-attendees/
* 1001Tracklists Endshow page (blocked, 401): https://www.1001tracklists.com/tracklist/1g7xru2k/defqon.1-the-endshow-2026-07-02.html
* Mixgraph, Sacred Oath (155 BPM, F minor, 4A, 5:22): https://www.mixgraph.io/tracks/e-life-sacred-oath-defqon1-2026-anthem-extended-mix
* Mixgraph, Sacred Flame (159 BPM, A♭ minor, 1A, 4:36): https://www.mixgraph.io/tracks/bass-modulators-sacred-flame-extended-mix
* Mixgraph, In The Cold (155 BPM, E major, 12B, 4:03): https://www.mixgraph.io/tracks/atmozfears-in-the-cold-extended-mix
* Mixgraph, Discorecord Extended Galactixx Remix (157 BPM, D major, 10B, 2:54): https://www.mixgraph.io/tracks/frontliner-discorecord-extended-galactixx-remix
* SongBPM, Discorecord original (150 BPM, key A, 3:53): https://songbpm.com/@frontliner/discorecord
* Beatport, Sacred Oath (blocked, 403; BPM/key came via the search summary): https://www.beatport.com/track/sacred-oath-defqon1-2026-anthem/27076002
* Hardstyle.com track pages and previews:
  https://hardstyle.com/en/tracks/4e1b75d9-0650-48e5-8be9-b5569c0a138d/sacred-oath-defqon-1-2026-anthem ,
  https://hardstyle.com/en/tracks/10372fea-cb78-4a33-b75e-b3467284db76/sacred-flame ,
  https://hardstyle.com/en/tracks/b92a56ab-477e-4a3a-8acb-b1dc0ef79fce/in-the-cold ,
  https://hardstyle.com/en/tracks/1f013127-34e6-4beb-973b-0e04a74720f6/l-p-a ,
  https://hardstyle.com/en/tracks/18ac8e61-5d90-4dcc-90a1-1e4dfb30af8f/discorecord
* Hardstyle.com news on the Discorecord (Galactixx Remix): https://hardstyle.com/en/news/frontliner-s-hit-discorecord-gets-a-fresh-new-twist-with-galactixx-remix
* Deezer API (previews, durations, ISRC, release dates): https://api.deezer.com/track/3885347411 , https://api.deezer.com/track/4130665491 , https://api.deezer.com/track/63046735 , https://api.deezer.com/track/4016482141 , https://api.deezer.com/track/4105553411 , https://api.deezer.com/track/4105541261 , https://api.deezer.com/track/4105541271
* iTunes Search / Lookup API: https://itunes.apple.com/lookup?id=1884894858 (Sacred Oath), https://itunes.apple.com/lookup?id=6787077565 (Discorecord Galactixx), https://itunes.apple.com/lookup?id=6783284630 (Sacred Flame), https://itunes.apple.com/lookup?id=6783279654 / 6783279655 (In The Cold / The Story)
* SoundCloud (waveform JSON only): official radio edits https://soundcloud.com/q-dancemusic/d-sturb-ft-e-life-sacred-oath , https://soundcloud.com/q-dancemusic/frontliner-discorecord , https://soundcloud.com/q-dancemusic/akimbo-missy-l-p-a , https://soundcloud.com/q-dancemusic/bass-modulators-sacred-flame , https://soundcloud.com/q-dancemusic/atmozfears-jesse-jax-in-the , https://soundcloud.com/q-dancemusic/atmozfears-jesse-jax-in-the-1 ; full-Endshow re-uploads https://soundcloud.com/marco-412171343/the-endshow-defqon-1-2026 , https://soundcloud.com/lucas-dubuc/the-endshow-defqon-1-2026 , https://soundcloud.com/hardsp/the-endshow-defqon-1-2026 ; segment rips https://soundcloud.com/apex-738191796/frontliner-discorecord , https://soundcloud.com/kyano-eikelboom/sacred-flame-bass-modulators , https://soundcloud.com/user-170756759-928583623/d-block-s-te-fan-embers , https://soundcloud.com/z3n1thiumx/d-block-s-te-fan-ember-defqon
* D-Block & S-te-Fan Facebook post (Embers lyric hint): https://www.facebook.com/dbstf/posts/come-meet-me-right-at-the-end-at-a-place-we-call-home-defqon1-listen-to-the-full/1551924882965116/
* Wikipedia, The Four Seasons (Winter = F minor, RV 297, Allegro non molto): https://en.wikipedia.org/wiki/The_Four_Seasons_(Vivaldi)
* Q-dance YouTube Short on Domitor Draconis: https://www.youtube.com/shorts/4Nd6PWdCnjA

Local analysis artefacts (scratchpad, not in the repo): the previews are in
`…/scratchpad/refs/music/` (Deezer `*.mp3`, iTunes `it_*.m4a/wav`, Hardstyle.com `hs_*.mp3`). The scripts are
`comb.py`, `analyze.py`, `sublevel.py`, `kickmap.py`, `spec.py` and `bandplot.py`. The waveforms, alignment
scripts and plots are in `…/scratchpad/web_music/`. That folder holds `wf_*.json`, `chunkalign.py`,
`hsalign.py`, `fineoff.py`, `overlay.png`, `endshow_wave.png`, `embers_wave.png` and `spec_*.png`.
