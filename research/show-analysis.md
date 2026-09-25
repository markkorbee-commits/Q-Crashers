# Show analysis: "The Endshow | Defqon.1 2026" (0–1581 s)

Structured cue-level timeline of the 26:21 Endshow video (YouTube `fLWY-Sxb1bE`), for the show engine and
the content team. It merges the 160 storyboard-frame analyses (one frame every 9.8825 s, `fNNN` = frame
index, `t = 9.8825 × NNN`), the bar-accurate music map (`music-analysis.md`) and the production vocabulary
(`production-analysis.md`). World coordinates and module names are those of `design-bible.md` (metres; origin
= centre of the stage-deck front edge at floor level; stage in −Z, audience in +Z, +X = spectator's right).

Compiled 2026-09-25 by the lead researcher. Supersedes the cue sheet in `production-analysis.md` §9.2 where
they differ (that sheet predates the audio alignment).

---

## 0. How to read this document

**Classification per row (column "Cl").** Every row carries two letters:
- first letter = what kind of claim the row's *look* is: **F** = FACT (seen in the cited frame),
  **I** = INFERENCE (interpolated between frames or read through smoke/blur), **A** = ASSUMPTION (designed
  fill-in, nothing observed), **U** = UNKNOWN (placeholder, keep neutral);
- second letter = confidence in the *timing*: **H** = bar-accurate (±0.5 s, audio-aligned), **M** = ±1–2 s,
  **L** = ±5 s (storyboard sampling only).

Example: `F·H` = the look is visible in a frame and the boundary is an audio-measured downbeat.

**Timing rule used everywhere.** A storyboard frame is a single sample inside a ~9.9 s window. A look seen in
frame `fN` is assigned to the musical section that contains `t(fN)`; its start and end snap to the section's
downbeats from `music-analysis.md` §5. Pyro "hits" snap to the nearest downbeat of the local tempo grid
(anchors in §0.2). Anything between two frames that is not implied by the music is an ASSUMPTION.

**Review note (independent review, 2026-09-25): storyboard phase.** Frame times here are nominal
(`9.8825 × N`). Judged against the audio-aligned downbeats, the pyro frames show effects that are already
mature 1–5 s before their cue. Examples: f042 comets at apex at 415.07 (drop 415.44); f054 full barrage at
533.6 (near-silence 531.6–534.7); f120 60–80 m crackle band at 1185.8 (audio minimum 1185.1); f130 burst
canopy at 1284.6 (climax 1287.0); f010 fireballs at 98.8 (hit 100.1); f022 comets at 2× crown height at
217.4 (cue 219.0); f131 90 m canopy at 1294.5 (rise 1293.4). The chapter marks agree with the audio map to
within ±2 s, so the storyboard is the likelier source of the lag. **Working assumption (INFERENCE,
medium):** the picture in `fN` is from ≈ `9.881·N + 3–5 s`. The downbeat-snapped cues below already fit
this and are kept. An "NNN:" time inside a row is a nominal frame time, so the real look is probably ~4 s
later. The engine should still snap every pyro hit to the grid in §0.2. Rows the review changed carry
"(review)".

**Crowd column.** The real Endshow had **no audience** (FACT). The column describes the "Tribe mode"
counterfactual crowd (design-bible §9). In "As filmed" mode only the crew listed in §0.4 exist.

### 0.1 Camera references (used in the "Cam" column)

Positions in world metres, derived in design-bible §5.3 and §5.12 from the moon-calibrated drone fit and the EXIF of
the official photo. HFOV = horizontal field of view.

| ID | Shot family (frames) | Position (X, Y, Z) | Aim / lens | Cl |
|---|---|---|---|---|
| A | Locked-off far-aisle cam, big pillar pair at frame edges (f001, f012, f013, f016, f017, f020) | (0, 3, 175) | at (0, 8, 0), HFOV 55° | I·M |
| B | "Hero" field cam, moon at px (237,100)/320 (f047, f052, f053, f061–f064, f073, f077, f078) | (0, 1.8, 172) | yaw 0 (−Z), pitch +9°, HFOV 69° | I·M |
| C | Telephoto front elevation (f002, f018, f019, f029, f034, f051, f098, f103, f147, f150) | (0, 2–6, 100–170) | at (0, 14, −12), HFOV 12–25° | I·M |
| D | Drone rise/pull-back on the axis (f003–f006, f022, f025, f027, f033, f039) | (9, 57, 237) at f004 (review: was 7; bible §5.12 has 8.9); path (5,45,215)→(10,70,260) over 29–60 s | pitch −10°, HFOV 73° (24 mm eq.) | F·H (fitted) |
| E | Near/mid-aisle ground cams (f007–f010, f021, f024, f026, f028, f030–f032, f081, f125, f126, f128, f148) | (0, 1.6, 60–100) | at stage centre, HFOV 60–75° | I·M |
| F | On-stage handheld / deck cams (f035–f037, f040, f041, f044, f046, f050, f065–f071, f074) | deck, (−10…10, 3.5, −2…−8) | performer close-ups | F·M |
| G | Dragon telephoto close-ups (f023, f057–f059, f068, f095–f101, f110, f132) | (−15…0, 2–10, 60–120) | at head (−2.5, 14, −12), HFOV 6–15° | F·M |
| H | High drone behind the field on the axis (f042, f045, f055, f056, f060, f075, f076, f087, f104, f119, f120, f130, f144, f153) | (0–10, 80–130, 230–290) | pitch −20…−30°, HFOV 73° | I·M |
| I | Very high front aerial from over the lake (f122, f129, f133–f137, f141, f146, f149, f151, f156, f157) | (0, 150–250, 420–520) | pitch −20°, HFOV 60° | I·L |
| J | Drone fly-through just above the dragon/wings (f143, f145, f152) | (−10…10, 30–45, −30…0) | steep down | F·L |
| K | Lantern/pillar detail drone (f113) | (−20, 11, 40) | at a crystal, moon in frame | F·M |
| P | Official still, D. Nijmeijer, EXIF 2026-06-27 22:41:39 (≈ show t 533–543 s) | (0, 6.8, 168) | 36 mm full frame, HFOV ≈ 50° | F·M |

### 0.2 Tempo grid anchors (from music-analysis §5.1)

| Video span (s) | BPM | Beat (s) | Downbeat anchor (s) | Cl |
|---|---|---|---|---|
| 0–126.4 | free / ~120 orchestral | – | hits 47.4, 55.3, 63.2, 100.1, 114.4, 120.3 | A |
| 126.4–273.0 | 157.0 | 0.38217 | 243.46 | I·H |
| 273.0–566.0 | 155.0 | 0.38710 | 415.44 | I·H |
| 566.0–622.0 | 170.0 | 0.35294 | 589.73 | I·H |
| 638.6–886.0 | 160.0 | 0.37500 | 829.25 | I·H |
| 886.0–1098.0 | unknown (use 150; intro hits every ~6.66 s) | – | 933.8 impact | U |
| 1098.0–1320.4 | ~160 | 0.375 | 1188.4 | I·L |
| 1320.4–1536.0 | 155.0 | 0.38710 | 1511.18 | I·H |
| 1536–1581 | ~155 custom outro | – | – | A |

### 0.3 Real-world clock (for sky, moon and lighting of the environment)

- **Show t = 0 ≈ 22:32:45 CEST, Saturday 27 June 2026 (INFERENCE, ±2 min; review: was ±1 min, see bible
  §8.1).** Two independent clocks agree:
  (1) the moon in drone frame f004 (t = 39.5 s) sits at pixel (925, 80)/1280×720; with the fitted camera
  (§0.1 D) the ephemeris moon (az 161.5°, alt 7.4°) projects to (929, 80) at 22:33:25 and to (956, 73) at
  22:40; (2) the official photo EXIF 22:41:39 shows the anthem's red crackle canopy that the video shows at
  533–543 s → t0 = 22:32:41 ± 10 s + camera-clock error. The published slot was 22:40 (FACT); starting ~7 min
  early is consistent with the code-orange thunderstorm warning issued 21:41 (INFERENCE).
- End of video 1581 s ≈ 22:59:06. Sun altitude −4.0° → −6.6° (civil dusk 22:53:38 falls at show t ≈ 1253 s).

### 0.4 People on site in "As filmed" mode (FACT/INFERENCE from frames)

| Who | Where | When | Source |
|---|---|---|---|
| MC/vocalist (INFERENCE: E-Life), cap, dark tee, knee shorts, white sneakers | downstage deck, walks X −15…+15 | 335–494 s | f035–f050 |
| Crew member/photographer crouching | deck lip, X ≈ −20 | ~395 s | f040 |
| Camera operator on tripod | FOH/camera platform (0, 0.5, 90) | whole show | photo P |
| Crew member walking | field, (≈10, 0, 20) | ~538 s | photo P |
| Fire-ritual troupe: 8–12 dancers in red/dark-red jumpsuits with square hand lanterns, 1 lead female on a round pedestal, 1 aerialist on a strap inside the DJ arch | deck at the DJ portal (X ±10, Z −1…−7); pedestal at (0, 1.9, −2) | 642–731 s | f065–f071, f074 |
| Pianist (INFERENCE: JDX), dark hair tied back, black-and-gold striped jacket, white grand piano with a vertical white light tube | piano riser (0, 0.6, 59) | 886–934 s (visible ~928) | f089–f094 |
| Silhouette at the DJ booth (identity UNKNOWN) | booth (0, 1.9, −7) | ~968 s, ~1482 s | f098, f150 |

---

## 1. VIVALDI – The Four Seasons "Winter" (Defqon.1 Version) · chapter 0–115 s · music 0–126.4 s

Key: F minor. Tempo free (orchestral). Colour key: **cold blue vs red fire**. Story beat: the frozen,
dormant cathedral wakes.

| # | Start s | End s | Music event | Lighting | Stage · LED · dragon | Lasers | Pyro | Fireworks | Fog | Crowd (tribe) | Cam | Frames | Cl |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1.1 | 0.0 | 10.0 | intro: quiet repeated strings | blackout; sky is the only backlight (#01204C–#002957) | silhouettes of wing spikes and castle pinnacles; row of ~15 small warm/white lamps at stage base (side-section rampart lanterns) at 30 % | none | none | none | haze 0.35, no low fog | hush, everyone faces stage, 35 % phones up | A (f001), low stage cam (f000) | f000–f001 | F·M |
| 1.2 | 10.0 | 32.0 | intro continues | slow reveal (5.5 s fade-up 14.0 → 19.5 s, complete by f002; review: was "8 s from 19 s", but f002 at nominal 19.8 is already fully lit and f001 at 9.9 is dark): castle blue wash #3050D0, dragon orange-red #E06030 with blue highlights, pillar shafts amber #C56E46, crystals blue #5BA1D2 | castle windows lit blue + small amber details; wings dark with faint red edge; crown pink/magenta seen from the drone | none | none | none | 0.35 | cheer on the reveal, then quiet sway | C (f002) → D (f003) | f002–f003 | F·M |
| 1.3 | 32.0 | 45.7 | crescendo | crown pink/magenta; front-line lamps blue-white; side sections blue-white | wing pixel outlines at 60 %; dragon red/orange | none | none | none | 0.35 | rising cheer | D pull-back | f004 | F·M |
| 1.4 | 45.7 | 69.0 | 3 orchestral hits 47.4 / 55.3 / 63.2 | each hit: red flash wash (#FF1A2A, 120 ms attack, 2 s decay) | hit 1: wing-finial pixels white flash; hit 2/3: dragon eyes flare | none | hit 1 (47.4): 6 wing-finial flame bursts 4 m; **hit 2 (55.3): red Bengal/flare pots ignite at the outer ends of the straight front line X ±86 (review: was ±63; f006 puts the sources at 29.7–33.7 % / 70.5–71.8 % of frame, at the front-line corners) (burn 15 s, heavy red smoke)**; hit 3 (63.2): deck-front flame chase centre-out | none | smoke from flares drifts −Z/+X; haze 0.5 | roar on each hit, fists up | D (f005), H (f006) | f005–f006 | F·M (flares) / A (hit mapping) |
| 1.5 | 69.0 | 75.5 | build | crown pink/red + blue; lilac haze #806684 | pixels pink/red | none | **7 synchronized gold-white gerbs (6 s)**: 4 on the capitals of delay rows 1–2 + 3 on the deck at X −8/0/+8 | none | 0.55 | jump on the gerb hit | E (f007) | f007 | F·M |
| 1.6 | 75.5 | 97.0 | **full orchestral climax** | red wash #D74C5D + red smoke; warm-white beams sweep centre→right | dragon dark metallic with blue glints; lanterns off at 89 s | none | 79 s: ~12 gerbs (left fan of 5 at 20–40°, 2 vertical centre, right cluster of 5 vertical); 88.9 s: V-layout gerb/comet fans (outer pair 45–55° outward, inner Y-fans from the centre base), pink/lilac smoke | 88.9 s: a few rising comet fragments (upper right) | 0.65 | jumping, hands up, flags waving | C/G (f008), E (f009) | f008–f009 | F·M |
| 1.7 | 97.0 | 110.0 | second half, hit at 100.1, decay | blue/violet ambient; crown pixels pink/orange | castle dim blue; lanterns blue, shafts amber | none | **100.1: two orange fireballs at the corner towers X ±92, Y 15** | none | 0.5 | sway | E (f010) | f010 | F·M |
| 1.8 | 110.0 | 126.4 | dramatic silence 110.5–113.3; hits 114.4, 120.3 | near blackout; one static pale-blue sky beam from behind the stage (A) | only wing outline pixels (#E0A0C0) and dragon (violet #6040C0 with orange #FF8040 glow at its base) lit, then OFF by 118 s; lanterns OFF | none | 114.4 & 120.3: white strobe hit (A) | none | 0.45 | anticipation, whistles | far/high (f011), A (f012) | f011–f012 | F·M |

---

## 2. FRONTLINER – Discorecord (Galactixx Remix) · chapter 115–274 s · music 126.4–273.0 s · 157 BPM, D major

Colour key: **cyan/green lasers, white pyro**. Story beat: the grounds come alive (energy song).

| # | Start s | End s | Music event | Lighting | Stage · LED · dragon | Lasers | Pyro | Fireworks | Fog | Crowd (tribe) | Cam | Frames | Cl |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2.1 | 126.4 | 134.0 | intro hits + short silence | stage dark | **crystals switch to CYAN #4FBEBE–#6DD7D9**; ~13 cyan/white rampart lamps | none | none | none | 0.45 | cheer at the first kick | A | f013 | F·H |
| 2.2 | 134.0 | 145.6 | light "disco" kick intro | dark | – | **white laser web**: straight beams criss-crossing the field 1–3 m high from the plinth corners of the 8 delay towers + deck front | none | none | low fog 0.3 (0–3 m) to carry the web | bounce on the kick | I/H (dark aerial) | f014 | F·H |
| 2.3 | 145.6 | 157.9 | heavy kick (fills 150.2, 156.3) | near-blackout with white kick strobes on the deck lip (A) | dim white pixels on the left wing | web continues, chases on the kick | none | none | 0.45 | fist pump every kick | C (silhouette) | f015 | I·H |
| 2.4 | 157.9 | 160.9 | 2-bar silence | stage blackout, but pillar shafts stay RED and one crystal blue (review: f016 at nominal 158.1 falls inside this gap and shows them lit) | – | off | – | – | – | freeze, scream | – | f016 (nominal) | A·H / F (shafts) |
| 2.5 | 160.9 | 171.6 | kick section | stage dark | **pillar shafts RED #8B1E1D**; only one crystal lit blue | off until **167.0** (bar −50), then the green sheet of 2.6 starts (review: f017 at nominal 168.0 already shows it) | none | none | 0.45 | fist pump | A | f016 | F·H |
| 2.6 | 171.6 | 182.3 | noise riser → breakdown | dark; **from 176.2 (bar −44) the whole crown is lit** (wings red/orange #E04030 + blue #3050FF stripes; review: f018 at nominal 177.9 shows this before 182.3) | – | **green laser sheet (#00FF55, graded #30C050) flat across the field at 1–2 m from the deck front** | none | none | low fog 0.5 | hands up, swaying | A | f017 | F·H |
| 2.7 | 182.3 | 206.8 | melodic/vocal breakdown (female vocal) | 182: whole crown lit; 188: magenta/violet; 198: dark | 182: wings pixel-mapped red/orange #E04030 + blue #3050FF stripes, deck blue with blue floor pools; 188: crown magenta/violet #C040FF, purple pillar uplight, one vertical blue beam; 198: dim red wing outlines, red shafts | none | none | none | 0.5 | sing along, slow sway, phones up | C | f018–f020 | F·H |
| 2.8 | 206.8 | 219.0 | quiet breakdown (no bass, filtered rhythm) | stage small, red/pink wing outlines | big pillars red shafts + blue crystals; mid pillars amber/green | **green (#00FF55) + cyan (#00E5FF) + blue (#1A2BFF) fan sheets from stage centre and wing positions, low tilt skimming 1–5 m over the field toward the audience; cyan fans upward into a smoke cloud** | none | none | low fog 0.6 | arms up, hands follow the sheets | E | f021 | F·H |
| 2.9 | 219.0 | 231.2 | build with bass | crown pink/gold | dragon pink/magenta (#8E4B6A) with orange eye, crest blue #3060FF | none | 219: **V-fan of 5–7 gold comets from the dragon crest** to ~2× crown height | 227: **silver glitter comet fan behind the dragon + falling silver brocade** | 0.55 | build: clapping on the snare roll | H (f022), G (f023) | f022–f023 | F·H |
| 2.10 | 231.2 | 243.5 | pre-drop build, gap 232.8–237.4 | 237: cool-white beam fans #E8ECFF (low fan left splaying out, fans up-right, near-vertical centre) | crown pink/red pixels | none | gap: blackout | none | 0.55 | crouch down (tribe ritual) during the gap | E | f024 | F·H |
| 2.11 | 243.5 | 268.0 | **DROP / climax (16 bars)** | full white + cyan/green; stage front line blue-white | crown pink/red + blue | cyan/green glow at stage centre | **243.5: comet/gerb V-fans of 10+ white-gold streams at both side-section ends + arms**; 256.9: **two walls of white-gold sparks (fountain cakes) at both stage ends in green-lit smoke** | 243.5: row of 15–20 white comets across the castle roof, bursting at ~1× crown height (~50 m AGL) | 0.7, green-lit smoke | jump up on the drop, flags, 60 % jumping in the pit | H (f025), E (f026) | f025–f026 | F·H |
| 2.12 | 268.0 | 273.0 | fade / cut | stage front line glows green | small white triangle highlights on the front | **green laser lines forward onto the field as rows of dashes at 2 depths** | small orange spark cluster at X ≈ +10 | none | 0.6 | cheer | H | f027 | F·M |

---

## 3. D-STURB ft. E-LIFE – Sacred Oath (Defqon.1 2026 Anthem) · 274–567 s · music 273.0–566.0 s · 155 BPM, F minor

Colour key: **magenta/violet + red canopy, gold finale line**. Story beat: the tribe swears the Oath (live MC).

| # | Start s | End s | Music event | Lighting | Stage · LED · dragon | Lasers | Pyro | Fireworks | Fog | Crowd (tribe) | Cam | Frames | Cl |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3.1 | 273.0 | 291.6 | cinematic/vocal intro | violet ambient #31184E/#693D99; magenta-red haze clouds above the crown | crown red/orange pixel pattern; crystals blue #4AA8FF, shafts amber | none | none | none | 0.5 | anthem recognised: huge roar, flags up | E | f028 | F·H |
| 3.2 | 291.6 | 307.0 | melodic intro | 287: heavy purple/magenta wash #982894/#B030D0; white beam fans (left fan up-left, right fan up-right, 4–5 near-vertical at centre-right) | dragon red; **crystals WARM WHITE/ORANGE #FFB040** (colour-changing LED, not flame) | 296: **white-lavender zig-zag (#C8C8FF) along the deck front, X −75…+80, 1–3 m high** + deep-blue sky beams #3040FF | none | none | 0.55 | sing-along | C (f029), E (f030) | f029–f030 | F·H |
| 3.3 | 307.0 | 319.4 | intro kick | crown pink/red/orange | – | – | none (beams only: parallel white rows from the side sections slanting outward + one vertical centre beam) | none | 0.55 | fist pump | E | f031 | F·H |
| 3.4 | 319.4 | 330.3 | lead riff, no kick | violet deck haze #271259/#6E40C1; crown dim | red pillar shafts, blue crystals | **magenta-pink zig-zag (#E070FF) along the deck front** | none | none | 0.6 | hands up, sway | E | f032 | F·H |
| 3.5 | 330.3 | 341.1 | kick 2 | pink/magenta haze; front line white/blue | 336: clean elevation: wings pixel-mapped horizontal red/orange/white stripes + blue; crest white/orange; jaws orange/pink; castle blue with 1 amber twin window per side; orange portal; outer crystals white #E6EEF9, inner blue #A3BFED | none | **330.3: vertical comet/gerb columns across the full width: ~10 red/pink/white over the core, ~5 each over the side sections**, to ~2× crown height | white dots at the tops of the side columns (comet heads) | 0.6 | jump | D/H (f033), C (f034) | f033–f034 | F·H |
| 3.6 | 341.1 | 403.0 | **main breakdown, E-Life vocals + orchestral melody** (MC on the deck 335–494) | deck magenta/red #E03070 + blue #4060FF; **cyan-white backlight curtain** (row of 4–5 fixtures, star flares) behind the MC at 355; bright cool white/cyan #D0D5D8 at 405 | dragon mouth outlined by a ring of white bulbs, lit red/orange; castle arches orange | **375: 6–7 radial blue sunburst laser fans (#2B34B5–#4D5DDB) from the deck front aimed at the audience, with dashed ground lines** | none | **385: a row of 12+ red comets/stars across the full width (X −95…+95) to 2–3× crown height** | 0.8 (close-ups wash to white) | **sing-along to the hook, arms around shoulders, phones 35 %, flags waving slowly** | F (f035–f037, f040–f041), E (f038), H (f039) | f035–f041 | F·H |
| 3.7 | 403.0 | 409.3 | build-up | white/cyan | – | – | – | – | 0.8 | clap to the roll | F | f041 | I·H |
| 3.8 | 409.3 | 412.3 | **3 s silence gap** | **total blackout** (crystals off too) | – | off | – | – | – | "DEF-QON!" chant, scream | – | – | A·H |
| 3.9 | 412.3 | 415.4 | 2-bar pre-drop | white strobe roll 8→16 Hz (A) | – | – | – | – | – | crouch/jump preparation | – | – | A·H |
| 3.10 | 415.4 | 440.2 | **ANTHEM DROP 1 (16 bars)** | magenta/purple beams fan up from the centre; field washed dark red; stage blue/violet with magenta pixel details | crystals white | – | 415.4: gold gerbs behind the MC (bokeh at 434) | **415.4: fan of ~20 red comets/stars in a 150° arc over the stage (apex 1–1.5× structure height, a few white)**; **424: straight line of ~11 gold-white comets across the stage width + 3–4 red crackle/crossette bursts upper right (~60 m)** | 0.7 | **full jump, fists, flags, hands up on the first drop (70 %)** | H (f042), J (f043), F (f044) | f042–f044 | F·H |
| 3.11 | 440.2 | 465.0 | mid-breakdown: bass stabs + vocals | core magenta/pink; blue side beams | – | – | – | **444: high row of 22–24 white serpent-tail rising comets at equal altitude, 1.3× stage width (launch X ±120 incl. bank crests)**; 454: single red rising comet behind | 0.6 | sway, sing | I/H (f045), F (f046) | f045–f046 | F·H |
| 3.12 | 465.0 | 477.4 | quiet section | hero cam: white/lavender strobe-like bursts both sides of the dragon, jagged white lines at stage height; 474: near-blackout deep blue #01001F, 8–10 low white/lavender beams fanning horizontally at deck height | dragon core pink/magenta; **crystals BLUE #40A0FF, shafts ORANGE #FF8A2A** | jagged white lines (lasers or beams, UNKNOWN) | 474: **CO2/smoke plume from deck centre**; 2 warm points on the deck | none | **dense low fog over the field (0–4 m) 0.8** | quiet, hands up | B (f047, f048) | f047–f048 | F·H |
| 3.13 | 477.4 | 502.1 | orchestral build → pre-drop | 484: dark; 494: cyan-white backlight + starburst | – | – | 484: 2 gold fountains on the deck (X −20, −4) + white flash with smoke at X +10 | none | 0.7 | build: arms up | H (f049), F (f050) | f049–f050 | F·H |
| 3.14 | 502.1 | 523.8 | **ANTHEM DROP 2** | **502.1–508.3 (4 bars): full violet look #6D24B9/#350389** (review: moved here from 3.13, because f051 at nominal 503.9 lies after the 502.1 downbeat); **from 508.3: everything deep blue #070289 except the dragon + wings red-orange #FF4020 (3 clusters)**; 523: + white beam V-fans (5–6 per side) from the side sections converging on the centre | violet phase: **white starburst rosettes (3 per wing)**, **vertical white/cyan LED bars in the castle windows (~6 per side)**, dragon mouth glows pale pink/white, crystals warm orange #FF9040, pillar bodies purple; blue phase: crystals blue-white, **pillar bodies BLUE #2040FF** | V-fans may be lasers (UNKNOWN; model as beams) | – | – | 0.6 | jump on every kick | C (f051), B (f052, f053) | f051–f053 | F·H |
| 3.15 | 523.8 | 536.2 | break (near-silence 531.6–534.7), pickup 534.7 | dim | – | – | – | – | 0.6 | chant | – | – | A·H |
| 3.16 | 536.2 | 564.0 | **FINAL KICK SECTION / climax 3** | **everything RED #B3132C / #7A010F**; white/lavender beams at mid-stage height left and right of the dragon; purple/white beam fans from the arm-end turrets | wings and dragon red; crystals dark (silhouettes) | purple/white beam fans from the arm ends | 536.2: **white gerbs along the castle roofline** (photo P); pink smoke puffs at the far left/right (arm ends) | **536.2–548: dense barrage of red + white crackling stars fanning above the stage, 45–80 m AGL, ~200 m wide (two lobes over the left and right halves)**; **553: straight line of ~12 gold/white brocade-chrysanthemum bursts at ~55 m across 1.4× stage width + white fan of ~8 comets from behind the dragon** | 0.8, red-lit smoke | peak euphoria: jump, flags, hugs at the end | E (f054), H (f055, f056), P | f054–f056 | F·H |
| 3.17 | 564.0 | 566.0 | outro fade | structure blue/violet, red inner wings, warm dragon | crystals blue | – | – | – | 0.7 | applause | H | f056 | I·M |

---

## 4. AKIMBO & MISSY – L.P.A. (Losse Polsjes Anthem) · 567–622 s · music 566.0–622.0 s · 170 BPM (uptempo)

Colour key: **blue + red-orange pixel chases, white pyro**. Story beat: the comic breather; the viral
"losse polsjes" (loose wrists) meme of 2026.

| # | Start s | End s | Music event | Lighting | Stage · LED · dragon | Lasers | Pyro | Fireworks | Fog | Crowd (tribe) | Cam | Frames | Cl |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 566.0 | 578.4 | Dutch vocal chant intro ("Losse Polsjes"); **title card "AKIMBO & MISSY / L.P.A." lower-left, seen in f057 (nominal 563.2, probably ~567 real; review: row start moved 563.0 → 566.0 so it no longer overlaps 3.16/3.17; the card is a UI overlay, not a cue)** | deep blue #110E87 | dragon: triangular armour plates outlined in pink/red LED (#731D51), blue crest spikes, **round eye of ~7 LED dots glowing white/pink**, ~12 cream fangs; 573: dragon profile red-orange #E05020 with blue accents, warm-white bulb strings on the castle | none | pink haze at the mouth (smoke, UNKNOWN source) | none | 0.6 | laughter, recognition roar | G | f057–f058 | F·H |
| 4.2 | 578.4 | 589.7 | synth-stab build, no bass | blue castle #1A1D79 | **wing pixel chases alternating red/orange #FF5020 and cyan/blue #40A0FF along spars and battens** | none | none | none | 0.6 | **"losse polsjes": forearms up, wrists flopping on each stab** | G | f059 | F·H |
| 4.3 | 589.7 | 612.3 | **UPTEMPO DROP, 170 BPM** (kick gaps 598.2–601.0, 609.5–612.3) | stage fixtures mostly off; white pyro light dominates (#F4EFE7) | 602: core pink/magenta #D070C0 in blue haze; crystals cyan-blue #40B0FF, shafts orange #FF8030 | none | **589.7: white flash mines / white gerb walls on the left and right deck halves** + **gold fountains at the deck front where the aisle meets the stage (X ±12)**; big white smoke | 1 white comet + 1 white star over stage centre-right | 0.8 white smoke | wrist dance by ≥ 50 % of zones A–C, jumping at 170 BPM | H (f060), B (f061) | f060–f061 | F·H |
| 4.4 | 612.3 | 622.0 | partial kick, cut | → **FULL BLACKOUT at 612** (mean luma 2/255) | all off incl. crystals | – | – | – | 0.5 | scream in the dark | B | f062 | F·H |
| 4.5 | 622.0 | 638.6 | **blackout / ambient bridge** | near black; faint red/orange glints and short white streaks at stage level; 632: red glow at centre + motion-blurred white diagonal beams | silhouettes only | white diagonal streaks (lasers or beams, UNKNOWN) | 632: red glow at centre (red flare pot, UNKNOWN) | none | 0.5 | hush, phone lights | B | f063–f064 | F·M |

---

## 5. BASS MODULATORS – Sacred Flame · 622–886 s · music 638.6–884.6 s (radio edit; gap to 886.0) · 160 BPM, A♭ minor

Colour key: **all fire: red and orange**. Story beat: the ritual guardians tend the Sacred Flame; "the weeping
dragon" (official release copy). Most-replayed chapter (heatmap mean 0.62): give it the largest flame budget.

| # | Start s | End s | Music event | Lighting | Stage · LED · dragon | Lasers | Pyro | Fireworks | Fog | Crowd (tribe) | Cam | Frames | Cl |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5.1 | 638.6 | 649.2 | quiet pad intro; **title card "BASS MODULATORS / SACRED FLAME" ~642 s** | deep red #990D0A/#770C08 with warm amber practicals #C39C84 | DJ portal: riveted metal bands, red diamond keystone, inner concentric ribbed rings, red vertical fabric; red orb upper left | none | none | none | 0.6 | quiet anticipation | F (on deck, facing the portal) | f065 | F·H |
| 5.2 | 649.2 | 709.2 | **tribal percussion** (toms, no hardstyle kick) | red wash #7B0609/#A20811; 671: red strobes upper right, white beams upper left; 701: fan of 6–7 white downlight spots (#F0F0FF) inside the arch crown | **fire-ritual troupe on the deck** (§0.4): lead female on a round grey pedestal with arms raised, ring of 10–12 lantern bearers (lanterns #FFF0C0); 681–701 aerialist on a strap inside the arch; **671: dragon front-on red #BB1B21 with white-pink vertical LED stripes on the face and a red LED Defqon.1 diamond on the chest; ~20 warm bulbs on neck and castle**; arch ring of ~10 warm bulbs | none | none | none | 0.7 | slow tribal stomp on the toms, arms raised with the dancers, phone lights | F (f065–f071), G (f067, f068) | f066–f071 | F·H |
| 5.3 | 709.2 | 712.2 | **2-bar break → BURNING WINGS** | **everything orange/amber (#BB4F1E / #CA703F), sky of orange smoke** | dragon white/pink with red; **rosettes glow yellow #FFD040**; castle orange-lit; crystals warm white under red pyramid caps | none | **709.2: massive flames along the upper edges of both wings: 6 flame heads per wing firing together (5–6 m, angled 0–22.5°) + 1 angled jet from the inner right spar; 3.0 s, second burst on 712.2 (1.5 s)**; third burst on 715.25 (1.5 s, bar −76) (review, ASSUMPTION: keeps the wings burning in f072 whether its real time is the nominal 711.5 or ~715, see §0 review note) | none | 0.8, orange-lit smoke | arms thrown up at the fire, roar | C (f072) | f072 | F·M |
| 5.4 | 712.2 | 733.2 | tribal groove + melody | dim red #832D15; transverse row of ~12 warm lamps along the stage front; 731: performers in the arch lit gold-orange #CB8766 on a raised level | dragon and wings as red LED silhouette; **crystals warm amber #FFC080 with star flares, shafts red #C02010** | none | 715.25: third wing-flame burst, 1.5 s (review, see 5.3); then residual smoke drifts right (+X, −Z) | none | 0.7 | stomp, sway | B (f073), F (f074) | f073–f074 | F·H |
| 5.5 | 733.2 | 745.2 | break + riser (near-silence 739.3–742.3) | red structure #E02040; white/lavender horizontal beam fans over both side areas; pink-red lamp row along the front | aisle pillars magenta bodies #D040A0 + white crystals | horizontal fans may be lasers (UNKNOWN) | **741: bright white fountain column far left (arm end X −94, Z 58)** | **741: 2 tall silver glitter tails at X ±40 rising to the top of frame** | 0.7 | hands up | H (f075) | f075 | F·H |
| 5.6 | 745.2 | 781.2 | melodic section with light kick (**fireworks section**) | white lamp row; orange-red centre #FF5030; side sections cyan-white #B0E0F0; 760: red stage, white low beams across the front | crystals white (air) / orange (ground); 770: near pillars red bodies, orange heads | white streak fan from the dragon (comets or lasers) | 750: white/orange fountain column far left; **770: gold-white flames/gerbs on the capitals of delay row 2 (X ±20, Z 69)** | 750: 1 white comet; **760: 2 tall silver glitter streams from the inner hang lines X ±11 to 2× structure height**; **770: barrage of 10+ silver glitter comets across and beyond the stage (X ±110)**; **780: full-sky curtain of falling white/gold glitter (strobe willow), wider than the stage** | 0.7 | jumping on the kick, phones 35 % for the fireworks | H (f076), B (f077, f078), E (f079) | f076–f079 | F·H |
| 5.7 | 781.2 | 793.2 | build-up (silence 787.3–790.3) | red/orange #FF3A28 with **big white-lavender beam fans (15–20 beams)** from centre-left (up-left) and centre (up/up-right) + low near-horizontal fans at the far side sections aimed outward | – | – | – | – | 0.7 | clap roll, crouch in the silence | B-variant (f080) | f080 | F·H |
| 5.8 | 793.2 | 817.2 | **DROP 1** (fill 803.8; kick-off 814.3–817.3) | 793.2: full red #A41A21 haze; 799–806: near-blackout accent with cool-white crystals #DFE8FF, one amber beam (#E0A040), white strips on pillar faces; 806: red again | wing blades red/white starburst rosettes; white-yellow flash on the right wing | none | low white smoke at pillar bases (CO2 bursts, A) | **793.2 and 806: ≥ 7 columns of red + white glitter comets rising from the castle roofline (X −60…+60) to ≥ 1.5× stage height, crackling into red/white glitter** | 0.8 | full jump, fists | E (f081, f082) | f081–f082 | F·M |
| 5.9 | 817.2 | 829.25 | build (silence 826.3–829.3) | full red #730105; **white/lavender spot beams (#E0D8FF) from the upper wings aimed at the audience** | **wing ribs striped alternating red and white LED**; castle windows red and white | none | **tall white-lit CO2 columns beside the wings (X ±45)** | red/white glitter trails still falling above the wing tips | 0.8 | arms up | C (f083) | f083 | F·H |
| 5.10 | 829.25 | 877.3 | **MAIN CLIMAX (32 bars, heatmap peak 0.80)** | 830: dim red in thick haze; 849: centre booth white strobe + white down-beams; **859: stage fixtures OFF, the scene lit by fire only (#F0D494 / #D79E44)**; 869: wings red with white/pink LED dashes, red "sun" rosettes, dragon dark | **crystals flame-shaped amber #FF9A50 (LED), shafts red #A61622** | 839: violet line along the deck front (LED or laser, UNKNOWN) | **859.25 (bar 21 of the climax; review: was "859.9 (bar 17)", but bar 17 is 853.25 and 859.9 is off the 160-BPM grid. 859.25 is the downbeat nearest before f087, nominal 859.8): FLAME RING: all deck-front, side-section and arm flame heads (≈ 60) fire as one line, 6–10 m, re-fired on every downbeat 859.25 / 860.75 / 862.25 / 863.75 (1.5 s each, so it reads as one continuous 6 s ring and also covers f087's probable real time ~864), then a centre-out chase every bar to 877.3; + flames on all 8 delay-tower capitals (2–3 m)**; big central pair at X ±14 | **830: arc of ~15 red strobe stars low over the wings**; 839: red-pink crackle and zig-zag trails low over the roof + rising orange comet; **849: two orange-gold crossing X-fans (6–8 comets each) at the outer stage ends (arm ends), launched at deck level, tops ~2× structure height** | 0.9, red smoke billowing | maximum: pit jumping, flags, fire "heat" on faces | B (f084), I/H (f085), C (f086), H (f087), C (f088) | f084–f088 | F·H (looks) / I·M (flame-ring downbeat) |
| 5.11 | 877.3 | 886.0 | outro fade; **title card "JDX / DOMITOR DRACONIS" from ~879 s** | blackout | one crystal red-orange #FF5A3A, green uplight #30BC83 | one faint white beam | – | – | 0.6 | applause → hush | E | f088–f089 | F·M |

---

## 6. JDX – Domitor Draconis · 886–1098 s · music 884.6–1098.0 s · tempo UNKNOWN (unreleased)

Colour key: **villain green vs red, then violet/blue**. Story beat: darkness; the tamer at the piano; the dragon
awakens and is tamed ("The mighty RED took on the shape of a powerful creature, tamed through JDX's Domitor
Draconis", Q-dance, FACT).

| # | Start s | End s | Music event | Lighting | Stage · LED · dragon | Lasers | Pyro | Fireworks | Fog | Crowd (tribe) | Cam | Frames | Cl |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 6.1 | 886.0 | 933.8 | **piano/orchestral intro, 7 hits** at 887.2, 893.4, 900.4, 907.4, 914.4, 920.6, 926.7 | stage BLACKOUT; key light white on the pianist (928) | **all 8 crystals red-orange #FF5A3A, pillar bodies GREEN uplight #20C060 (green light cones on the ground)** | **white laser bounce builds one segment per hit** (A for the mapping): source = vertical light tube on the white grand piano at (0, 1.8, 59); 889 single beam up-right; 899 "A" roof shape between the row-1 crystals; 909 zig-zag piano → row-1 crystal L → row-2 crystal L, plus one beam low to the left foreground; **918 symmetric V: piano → row-1 crystals (±20, 11.2, 36) → row-2 crystals (±20, 11.2, 69)**; crystals act as mirrors | none | none | 0.5 + low fog 0.4 (beam visibility) | hush; phone lights; people sit down | E (f089–f093), F (f094: pianist close-up) | f089–f094 | F·M (look) / A (hit→segment) |
| 6.2 | 933.8 | 943.4 | **IMPACT** + decay | stage wakes: **dragon mixed green #30D060 and red #D02020**, gold highlights on spikes | **gold perforated mechanical foreleg with green edge light right of the head**; wings amber/red with green accents; DJ booth teal #20A0A0 | beams off | 933.8: white strobe hit (A) | none | 0.6 | jump on the impact | G (f095) | f095 | F·M |
| 6.3 | 943.4 | 1004.0 | main theme (dragon LED) | green haze #0B5115; white beams hitting smoke left | **mouth wide open (~40°), interior red #E02030 with gold teeth, scales green, crest green, gold horn tips**; castle windows alternate red and green; 3 spires + diagonal spar per wing edged green LED; orange rosettes; DJ silhouette at the booth (968); 988 dimmed to 50 % | none | none | none | 0.6 | head-banging, hard fist pumps; small mosh in zone A | G (f096, f099–f101), E (f097), C (f098) | f096–f101 | F·L |
| 6.4 | 1004.0 | 1006.7 | pre-drop dip | near blackout | – | **4 cyan-blue horizontal laser fans at deck level (#40A0FF) at X ≈ −60, −25, +25, +60, aimed sideways** | none | none | 0.5 | scream | I/H (f102) | f102 | F·L |
| 6.5 | 1006.7 | 1025.1 | climax 1 | **full two-colour look green #20C050 + orange-amber #E05020** | best architecture reference: dragon horned crest, 2 long backward horns, open red/pink mouth (#F6C3A3 hot-spot), gold claw right, speaker hangs dark, 2 big rosettes per wing visible, big green gothic window each side | none | none | none | 0.6 | jumping, fists | C (f103) | f103 | F·L |
| 6.6 | 1025.1 | 1026.9 | fill | – | – | – | – | – | – | – | – | – | A·L |
| 6.7 | 1026.9 | 1081.0 | **climax 2 (~64 s; music continues to 1091.0, and the look hands over to 6.8 at 1081; review: end was 1091.0 and overlapped 6.8)** | 1027: **dragon magenta #C040FF, front line warm orange, aisle pillars purple #A040FF**; 1037: wings deep blue/violet #3030FF–#6040FF with pink-orange LED dashes and red-orange rosettes; **1047: blackout with faint teal outline #40C0A0**; 1057: stage deep blue #1830C0 with white/cyan glitter pixels; 1067: magenta/pink-violet #D060E0 + orange | 1057: near pillars green uplight cones #2DD967, mid pillars purple crystals #A060FF; **1067: crystals ICE-BLUE #76ABDE, shafts orange #E69461**; **1077: a row of ~10 cyan lantern lights along the deck-front balustrade** | none | **1026.9: TWIN 15 m FLAME TORCHES (Power Flame class) on the central towers X ±14, Y 16, flanking the head, 2 s** | 1067: grey dots rising above the stage (shells? UNKNOWN); **1077 (≈17:57): full-width barrage: ~12 white-gold comets/fountains from the deck front + arms fanning outward + ~10 orange-red comets in two crossing fans at 30–45° over centre-left and centre-right, trails ~1.7× stage height; big central smoke plume** | 0.7 | full jump; flags; fire awe | H (f104), C (f105, f107, f108, f109) | f104–f109 | F·L |
| 6.8 | 1081.0 | 1098.0 | fade into Embers | **blue near-blackout**: dragon dim blue #2030C0 with white/cyan pixels | – | – | – | – | 0.6 | applause | G (f110) | f110 | F·M |

---

## 7. D-BLOCK & S-TE-FAN – Embers · 1098–1318 s · music 1098.0–1320.4 s · ~160 BPM (low confidence)

Colour key: **ice blue and cyan, then a pink climax, ending on a red ember**. Story beat: the fire dies to
embers under the moon (ironic: the coldest-looking chapter).

| # | Start s | End s | Music event | Lighting | Stage · LED · dragon | Lasers | Pyro | Fireworks | Fog | Crowd (tribe) | Cam | Frames | Cl |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 7.1 | 1098.0 | 1110.6 | quiet intro | **monochrome blue #1A2AFF** | wing rib LEDs white/ice-blue #A0C8FF; **rosettes glow as teal star shapes #40E0B0**; dragon blue with teal; castle windows blue; crystals teal | none | none | none | 0.6 | sway, arms on shoulders | C (f111) | f111 | F·M |
| 7.2 | 1110.6 | 1132.0 | rising intro | deep blue #020495–#0D1DAA; haze and smoke lit blue | white/cyan sparkle pixels on the core; crystals cyan #42EEFD (f113 close-up with the moon disc #D7CAE4 behind) | **1106: a horizontal light-blue laser sheet (#84A2FE) across the full width at deck height**; **1126: two thick cyan beams (#3CD7FE) from X ±7, Y 15 crossing in an X above the dragon + many near-horizontal cyan fans over the field** | none | none | 0.7 + low fog 0.6 | hands up | C (f112, f114), K (f113) | f112–f114 | F·M |
| 7.3 | 1132.0 | 1156.0 | rhythmic section (fills every ~6.1 s) | blue | **stage outlined warm white/amber #FFC070** with a magenta glint at the dragon face | **LIQUID SKY: blue/cyan scanned sheets (#2040FF, highlights #80C0FF) skimming 1.5–3 m over low haze across the whole field**; horizontal lines at deck height extending beyond the stage to X ±110 | none | none | **low fog 0.9 (0–3 m), the laser "sea"** | reach up into the sheet | H/low drone (f115), E (f116) | f115–f116 | F·L |
| 7.4 | 1156.0 | 1182.0 | steady kick + lead | blue/cyan | 1165: wing spires outlined warm gold #FFD080; white-orange flash at the dragon mouth/booth (mouth flame UNKNOWN; model as a strobe) | **1156: upward fan of ~8 cyan-white beams (#AED3F2) from the right side section** + blue sheets; 1165: horizontal blue sheet at deck height + short white beams on the ground at left | **1175: ~18–20 white-gold fountains/gerbs along the whole front line incl. arms** | **1175: a row of ~17 comet/star heads at ~2× fountain height**; white/violet beam starburst from the centre | 0.8 | jumping | E (f117), C (f118), H (f119) | f117–f119 | F·L |
| 7.5 | 1182.0 | 1188.4 | pre-drop gap | blackout | – | – | – | – | 0.7 | crouch | – | – | A·M |
| 7.6 | 1188.4 | 1227.0 | **DROP 1** (dips 1205.5, 1212.1, 1217) | 1188.4: field flooded pink/magenta by pyro; stage band white/cyan; 1195: cold blue #04048D with cyan-white beam hot-spots; **1212–1217: near-total blackout accents** | crystals and pillar bases blue-violet | 1195: cyan-white flat fan from the stage's right half toward the field (laser or beam) | **1188.4: tall pink-white spark sprays (fountains/comets) along both arms (X ±94, Z 0…58)** | **1188.4: continuous band of pink/white crackle bursts above the field and stage (~60–80 m)** | 0.8, pink smoke in the aisle | jump, flags | H (f120), A-low (f121), I (f122), – (f123) | f120–f123 | F·M |
| 7.7 | 1227.0 | 1255.5 | mid-break (dips 1233.4, 1238.4, 1245.3; silence 1255.2) | **1225: ICE-WHITE BEAM STORM**: cold white-blue beams (#A9C5D8) fan in all directions from two low hot-spots on the deck (X ±25) + upper right, dense haze (83 % bright pixels); 1235: deep blue with white pixel points; **1245: massive cool-white/blue beam fan (150°) from the deck right of centre** | cyan/aqua crystals #5FF0E0, blue base uplight; a single magenta point on the core | teal-green dots in the haze (laser hits, UNCLEAR) | none | none | 0.9 | arms up, hugging | E (f124–f126) | f124–f126 | F·M |
| 7.8 | 1255.5 | 1287.0 | **DROP 2** | **1255: full-frame deep-blue laser lattice**; 1265: dim blue pause; **1275: magenta/violet stage #590A81–#7C1A8D** | cyan-green crystal | **3–4 groups of blue (#1A2BFF) multi-beam fans from the deck front crossing in X / diamond lattices upward-outward** | 1275: magenta-lit smoke column at centre-right | **1275: pink/magenta + white crackle bursts right above and behind the stage (1.5–2× stage height)** | 0.8 | jump | detail low (f127), E (f128), I (f129) | f127–f129 | F·M |
| 7.9 | 1287.0 | 1304.0 | **FINAL CLIMAX** (sharp rise 1293.4; music to 1312; review: end was 1312.0 and overlapped 7.10) | deck-front band cyan/teal; field dark purple #393485; stage cyan/teal #3FD8E0 against the red canopy | wing tips cyan | none | **1287.0: 9 evenly spaced white-pink comet/mine jets from the roof/front line (X −32…+32) + ~6 white fountains on each arm (Z 5…55)** | **1287: the 9 jets burst into a continuous pink/white crackle canopy at ~1–1.5× stage height (35–50 m)**; **1293.4: HUGE red/pink crackle-glitter canopy, 1.3× stage width, top ~90 m AGL** | 0.9, pink smoke | peak jumping, flags, confetti-less | H (f130), I-low (f131) | f130–f131 | F·M |
| 7.10 | 1304.0 | 1312.0 | **ember outro** (review: end was 1320.4 and overlapped 7.11) | darkness | **only the dragon + inner wings lit red #982D3E (ember state), rim-lit**; castle dark with a few white points | none | none | none | 0.7 | slow sway | C (f132) | f132 | F·M |
| 7.11 | 1312.0 | 1320.4 | fade into In The Cold | warm white/yellow hatched beam lines start over the field | – | gold sheets fade in (see 8.1) | – | – | 0.8 | – | I (f133) | f133 | F·M |

---

## 8. ATMOZFEARS & JESSE JAX – In The Cold (The Story) · 1318–1581 s · music 1320.4–1536 s + custom outro · 155 BPM, E major

Colour key: **warm gold in "Cold", violet, then the red/orange/gold finale, blue end**. Story beat: the cold
returns; farewell; finale fireworks; "Forever One Tribe".

| # | Start s | End s | Music event | Lighting | Stage · LED · dragon | Lasers | Pyro | Fireworks | Fog | Crowd (tribe) | Cam | Frames | Cl |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 8.1 | 1320.4 | 1371.8 | **"The Story" intro** (review: end was 1384.2) (atmospheric, no kick); **title card "ATMOZFEARS & JESSE JAX / IN THE COLD" ~1324 s** | stage DARK | crystals turn red at ~1354 | **GOLD LASER CHEVRON: ~10 warm-gold sources along the deck front (2 groups: 5 at X −30…−10, 5 at X +10…+30; gap at centre) fire 2 fans of 10–15 beams each down-forward at a shallow angle, converging on the axis at Z ≈ 70; seen from above they draw a V / Defqon-emblem chevron on the haze (#FFC000, graded #BBB396 → #8C7739); at head height (1–4 m) they form a golden haze tunnel between the pillars (1364)**; scanning spread at 1344, fading 1354 | none | none | **low fog 0.9 + global haze 0.8 (golden)** | quiet awe, phones up | I (f133–f137), E (f138) | f133–f138 | F·M |
| 8.2 | 1371.8 | 1402.8 | last 8 bars of the Story intro, then from 1384.2 the atmospheric radio intro (pads, vocal) (review: start was 1384.2, but f139 at nominal 1373.5 already shows this look; 1371.8 is 8 bars before 1384.2. End was 1409.0 and overlapped 8.3) | violet haze #180180/#3A018D; violet/magenta fixture at the right side section radiating violet beams | **only the upper structure lit: dragon red-orange, wings outlined red/pink pixel lines #FF3060 → #FF4020/#FF8040**; castle dark; **full-width violet/blue light row at deck height**; **crystals orange/red flame-like #FF6030, orange glow at pillar bases**; 1393: aerial magenta/pink #A33B82 Π footprint | 1374: blue horizontal laser line at the left at deck height | 1384: orange flame blob at the left arm (UNCLEAR, model a 2 s flame at the left arm end) | none | 0.7 | sing the vocal, sway | C (f139, f140), I (f141) | f139–f141 | F·M |
| 8.3 | 1402.8 | 1412.1 | build (silence ~1410.5–1412) | red/pink stage #913D65 | pillars red-orange | none | **1402.8 (on the grid; review: was 1403): ~6 low green/white bursts along the roof line and above the side sections (X ≈ −70, −48, −16, +16, +48, +70) at 0.3–0.5× stage height + thin pink/white comet trails** | (the bursts are strobe mines / small green peonies) | 0.7 | clap roll | I (f142) | f142 | F·M |
| 8.4 | 1412.1 | 1440.0 | **DROP 1** (music to 1452.3; review: end was 1452.3 and overlapped 8.5) | magenta/pink #FF40C0 and orange key light on the metal | pink LED dot rows along the plate edges | none | **1422.9 (bar 7): WHITE/SILVER GERB & FOUNTAIN WALL (green-tinted) across the deck front + side sections + both arms, big white fans at the arm ends, 10–20 m**; white comets from 7–8 roof positions; 1413 and 1433: gold/orange comet streaks through which the drone flies | 1433: gold comet trails (#F9F5E8/#CDAB96) | 0.8, warm grey-orange smoke | jump, flags | J (f143, f145), H (f144) | f143–f145 | F·H |
| 8.5 | 1440.0 | 1452.3 | drop 1 tail | aerial shows the stage dark (camera cut or blackout accent, UNKNOWN) | – | – | – | – | 0.7 | – | I (f146) | f146 | U·L |
| 8.6 | 1452.3 | 1461.6 | riser / break (silence ~1458.5) | red/orange wings & dragon (#9D2782, highlights #FF5030); **rosettes blue-violet #6040FF** | **crystals orange #FF7030** | **flat magenta laser sheet (#FF20C8, graded #8B1D76) across the full width at deck height + a fainter second sheet above** | none | none | 0.7 | arms up | C (f147) | f147 | F·H |
| 8.7 | 1461.6 | 1474.0 | percussive breakdown (claps, no bass) | stage flooded magenta #78028B + blue-violet #37027F | crystals red #FF3030, shafts magenta/violet | **blue-violet laser/beam tunnel from the deck down the aisle toward the audience, skimming the ground** | none | faint pink sparkle above the centre (UNCLEAR) | 0.8 | clap along | E (f148) | f148 | F·H |
| 8.8 | 1474.0 | 1498.8 | **emotional melodic breakdown** | purple/violet haze #360071/#9132BE; aerial magenta/pink #BE4FBA with a violet haze column above the centre | **rosettes pink radial sunburst**, castle gothic window pairs red/white, dragon dark red; small lit box at the DJ booth; crystals orange #FF8040 | **white/lavender laser "cage": thin lines (#E0D0FF) crossing in X/lattices in 3 groups (left, centre, right) + vertical bundle overhead + diagonal bundles top right** | none | none | 0.9 | **hands up, hugging, tears, 60 % phones up; slow sway at 0.5 Hz** | I (f149, f151), C (f150) | f149–f151 | F·H |
| 8.9 | 1498.8 | 1511.2 | final build-up | intense red/pink #C00740/#DB2852 on the structure | spines and wing ribs in red | none | **1501: white/silver + red low bursts just above the dragon (roof mines / crossettes)** | red-tinted streaks radiating up-right | 0.8 | crouch then explode | J (f152) | f152 | F·H |
| 8.10 | 1511.2 | 1536.0 | **GRAND FINALE DROP (16 bars; YouTube most-replayed peak 1.00)** | field glows orange-red (#830204 / #E88A52); stage core pink/magenta #E0409A almost hidden | – | none | **1511.2: continuous gold/orange-white gerb & fountain wall along the whole deck front, side sections and both arms (~60 positions, 15–25 m tall, 12 s)** + all flame heads chase per bar | **1511.2–1524: finale barrage: band of gold/orange crackle and brocade bursts 50–90 m AGL across ±100 m, 12–25 breaks/s, + 2 big white-gold chrysanthemums at X ≈ ±45**; 1521.7: heavy violet smoke with fading falling gold stars; **~1529.6: blackout (music continues) (A, from f155 black at 1531.6)** | 1.0 smoke | **everything: jumping, flags, hands, phones, tears** | H (f153), C-smoke (f154), – (f155) | f153–f155 | F·H (barrage) / A·L (1529.6 blackout) |
| 8.11 | 1536.0 | 1551.0 | custom outro: melodic breakdown | white-pink core #FFC0F0; cyan lights along the arms | – | none | **1541: blue/cyan-lit plumes (CO2 jets, blue-lit) rising from the roof line in 2 groups of 3–4 columns flanking the core (X ±12…±30), 8–12 m** | fading gold glitter points left and right (tails) | 0.8, red/pink smoke drifting right | applause, hugs | I (f156, f157) | f156–f157 | F·M |
| 8.12 | 1551.0 | 1557.0 | final swell (peak 1554.8) | – | – | – | last CO2 blast on 1554.8 (A) | – | 0.7 | last roar | – | – | A·L |
| 8.13 | 1557.0 | 1577.6 | closing hits (1563.6, 1569–1571, 1576) | **total blackout from ~1561 (uniform #000004)**, crystals off | – | – | – | – | 0.6 | "One Tribe" chant, applause | – | f158–f159 | F·M |
| 8.14 | 1577.6 | 1581.0 | silence | black | – | – | – | – | – | – | – | – | F·M |

---

## 9. Signature moments (in show order)

These are the non-negotiable beats the reconstruction must hit. Times are video seconds (t0 = 22:32:45 CEST).

| # | t (s) | Moment | Why it matters | Cl |
|---|---|---|---|---|
| S1 | 0–20 | Silhouette of wing spikes and crenellations against the blue-hour sky, blue crystals in the empty field, then the reveal (fade-up 14.0 → 19.5 s; review: was "8 s reveal at 19 s", which contradicts f002) | Establishing image: empty Holy Grounds at dusk | F·M |
| S2 | 29–50 | Drone rises on the axis: straight stage front, forward arms, 4 pairs of blue-headed amber pillars, moon low at right | Layout reveal; the moon calibration shot | F·H |
| S3 | 55.3 | Red Bengal flares at both side sections flood the field red | "Flames in sync with the orchestral score" (press) | F·M |
| S4 | 69–97 | Gerbs from the delay-tower capitals + deck, then V-fans in pink smoke | First fire climax | F·M |
| S5 | 207–219 | Green/cyan laser waves skimming the empty field | Lasers can fire at ground level because nobody is there | F·H |
| S6 | 243.5 | Discorecord drop: comet V-fans at both side ends + white comet row over the castle | First full-width pyro | F·H |
| S7 | 341–405 | E-Life on the empty deck, cyan-white backlight curtain | Human scale; the Oath is sworn | F·H |
| S8 | 409.3–415.4 | 3 s silent blackout → anthem drop with a 150° red comet fan | Anthem climax | F·H |
| S9 | 536.2–553 | Red crackle canopy over ~200 m (official photo at 22:41:39), then a straight line of 12 gold brocades | The most-used press image | F·H |
| S10 | 612–638 | Full blackout after L.P.A. | Reset before the ritual | F·H |
| S11 | 649–709 | Fire-ritual troupe with lanterns + aerialist in the DJ arch | Theatre layer | F·H |
| S12 | 709.2 | **Burning wings** (brightest non-close-up frame, 72 % orange) | Signature fire image | F·M |
| S13 | 780 | Full-sky curtain of falling white/gold glitter | Softest firework moment | F·L |
| S14 | 859.25–865.25 | **Flame ring** (review: was 859.9, see 5.10): ~60 heads along deck + sides + arms + fire on all 8 tower tops, stage lights off | Seen from the drone: the U-shape drawn in fire | F·M |
| S15 | 886–934 | Piano laser: one white beam bounces piano → crystals → crystals, one segment per hit | Minimalism in the dark | F·M |
| S16 | 1006.7–1027 | Green/red dragon reveal, then twin 15 m torches beside the head | "Domitor Draconis": the dragon awakens | F·L |
| S17 | 1077 | Crossing orange comet fans + white-gold barrage along the front | Domitor climax | F·L |
| S18 | 1126–1156 | Cyan X over the dragon, then the **laser sea** over low fog with the moon above | Embers' "cold" look | F·M |
| S19 | 1225–1245 | Ice-white beam storm | Beam-only climax | F·M |
| S20 | 1287–1294 | 9 comet jets + arm fountains → pink canopy → huge red/pink canopy over a cyan stage | Embers climax | F·M |
| S21 | 1304–1320 | Only the red dragon glows: the ember | Emotional hinge | F·M |
| S22 | 1320–1364 | **Gold laser chevron** drawn on the field; golden tunnel at head height | "In The Cold" irony: warmest lasers | F·M |
| S23 | 1474–1499 | White/lavender laser cage in violet haze | Emotional breakdown | F·H |
| S24 | 1511.2 | **Grand finale**: gold gerb wall along the entire U + gold/orange crackle band + 2 white chrysanthemums; field glows orange | Most-replayed moment of the video | F·H |
| S25 | 1541–1557 | Blue "cold fire" plumes, then black | The cold returns; end | F·M |

---

## 10. Budget guidance for the show engine (derived)

- **Pyro/firework budget by heatmap** (music-analysis §3): Sacred Flame (mean 0.62) and In The Cold (0.41)
  get ~55 % of all effect budget; Sacred Oath (0.09) is the least replayed despite its canopy — keep its
  effects but do not exceed them.
- **Blackout moments** (must be truly dark: crystals off, only moon and sky): 157.9–160.9 (stage only; pillar
  shafts stay red, see 2.4 review), 409.3–412.3,
  612–638.6, 1047, 1212–1217, ~1529.6–1536, 1561–1581.
- **Ground-level laser looks** exist only because the field was empty (INFERENCE): 134–146 (web), 167–219
  (sheets; review: was 171, see 2.5), 1110–1182 (sea), 1320–1364 (gold chevron/tunnel), 1461–1474 (tunnel). In Tribe mode raise them to
  4–6 m above the crowd head plane (design-bible §7.4).
