# Uncertainties register (Defqon.1 2026 Endshow reconstruction)

Every open or contested item, what we actually know, whether sources disagree, and the decision the build
uses. The decision is binding for the engineers until new evidence arrives; `design-bible.md` carries the
same values. Classification of the *decision*: **FACT** / **INFERENCE** / **ASSUMPTION** / **UNKNOWN**
(UNKNOWN = a neutral placeholder was chosen). Compiled 2026-09-25.

Abbreviations: SA = stage-analysis.md, TA = terrain-analysis.md, PA = production-analysis.md,
EC = event-context.md, CB = crowd-and-bars.md, MA = music-analysis.md, FR = storyboard frame analyses,
P = official Endshow photo (EXIF 2026-06-27 22:41:39), f004 = drone frame at 39.5 s.

## 1. Time, date, sky

| # | Item | What we know | Sources disagree? | Decision | Class |
|---|---|---|---|---|---|
| 1 | Filming date | Q-dance: grounds closed Saturday evening, only authorities/professionals; fireworks heard Sat evening; P EXIF 27 Jun 22:41:39 | EDMTunes frames it as a crew-only moment; otherwise consistent | Saturday 27 June 2026 | FACT |
| 2 | Show start clock | Published slot 22:40 (FACT). f004 moon pixel matches the ephemeris only at 22:33 ± 1.5 min with the fitted camera; P shows the 533–543 s red canopy at 22:41:39 → 22:32:41 | EC: 22:40 ± 20; FR: "22:40–00:00" and "23:30–01:30" (moon guesses without orientation) | **t0 = 22:32:45 CEST ± 2 min** (review: was ± 1 min; the moon pixel on its own gives ≈ 22:31:15 ± 1.5 min, see bible §8.1) | INFERENCE |
| 3 | One continuous take? | Multi-camera edit; performers' close-ups may be separate passes; audio is the studio radio edits | EDMTunes: "scaled-down" display; Q-dance: "complete production … performed and recorded" | Treat the video as one timeline; no separate takes modelled | INFERENCE |
| 4 | Bright dot in aerials | f004: 16.5–19° right of axis, ~7–8° up; ephemeris moon az 161.5°, alt 7.4°; Venus is behind the camera (az 281°) | FR offered moon or Venus | **Moon** (visible as a disc in f113) | FACT |
| 5 | Stage orientation | OSM/aerials: stage faces 325°; review: the moon is also visible in photo P at (1648, 503)/1880, ~19 ± 2° right of the axis, against 18.35° from the ephemeris at EXIF 22:41:39 | FR guessed "faces N–NNW" or "faces E" from the dot | **325°** (confirmed by the f004 moon fit and by the photo P moon, ±2°) | FACT |
| 6 | Sky brightness | Blue hour at 0–110 s, near-black from ~400 s in the graded video; sun −4.0° → −6.6° | FR 40–79 "full night" vs physics (civil twilight until 1253 s) | Follow the video grade (keys in bible §8.3); NW twilight glow only for reverse views | INFERENCE / ASSUMPTION |
| 7 | NW twilight colours | Never seen in the video | – | Warm band #C99A68 → teal #5E8C9A at t0, decaying | ASSUMPTION |
| 8 | Clouds | Lelystad 8/8 at 23:00; moon visible through gaps; haze bands early | Station vs frames | Broken mid deck 0.55 cover with gaps | INFERENCE |
| 9 | Lightning visible? | Storm line W–SW, rain at Lelystad from 23:00; show dry | – | Optional distant flashes after 1200 s, off by default | UNKNOWN |
| 10 | Wind / smoke drift | Lelystad 22–23 h: 340°, 4–5 m/s, gust 9; frames: smoke drifts right | – | From 340°, drift vector (+0.26, 0, −0.97) | FACT (data) / INFERENCE (site) |

## 2. Stage

| # | Item | What we know | Sources disagree? | Decision | Class |
|---|---|---|---|---|---|
| 11 | Overall height | K1 ruler (thumbnail + golden-hour tele) ≈ 27.5 m; P fitted ≈ 27–28.5 m; frame core width:height 3.1–3.3:1 | **Yes**: PA assumed 45–50 m (from 2025's 48 m); SA 24–26 m; FR guess 35–40 m | Wing tips 26.5 / 28.0 / 26.5 m; crest 21.5; rider 23 | INFERENCE |
| 12 | Wing span | Tips span 3.75 × inner-hang separation (21.8 m) = 81.8 m; f004 projection of ±40 m matches the crown pixels. Review: the 3.75 ratio ignores that the tips are ~16 m behind the hangs; depth-corrected it gives ~85–89 m. Photo P re-measured at Z −20 gives ±39.7 / ±29.2 / ±15 | SA 76–80 m; FR guesses 70 m / 100–130 m | 81 m (tips ±14.5 / ±29 / ±40.5), range 76–89 m | INFERENCE |
| 13 | Front width | Floorplan outline ±92; f004 lamp-row ends match (±90, 9.5, −4) | TA used 115 m (2024 stage); FR guesses 160–230 m | 184 m (X ±92) | INFERENCE |
| 14 | Forward arms | Aerials show lines angling forward; f004 back-projection puts them along X ±93–100 reaching Z 50–65; floorplan arms end at Z +4 | **Yes** (TA: to Z +2; FR: "30–45° splay"; floorplan: to +4) | Axis-parallel rampart along X ±92→±94 from Z −4 to +58, end turrets at Z 58 | INFERENCE |
| 15 | Deck front vs towers | P: deck front ≈ 0.9 Δ beyond row 1; drones 1.1–2.2 Δ | SA/TA assumed rows at 46.5… from the floorplan with deck at Z 0 | Deck front Z 0 (paved edge); row 1 at Z 36 (1.1 Δ) | INFERENCE |
| 16 | Delay-tower grid | Floorplan: columns 43–44 m, rows 27 m (S/Δ 1.6). Calibrated cameras: S/Δ = 1.14 (f004) and 1.23 (P). 2024 aerial: 45 m × 35.5 m | **Yes** (SA ±16; map ±21.5) | **X ±20; Z 36/69/102/135** | INFERENCE |
| 17 | Tower count | 8 icons on the map; 4 pairs in most aerials | FR sometimes counted 5 per side (arm lanterns, deck lamps) | 8 | FACT (map) / INFERENCE |
| 18 | Tower height | P fitted crystal tips 12.4–12.9 m; frames: pillar ≈ 0.4 × crown height | TA 15–19 m (2024 shadows, other design); SA 10.5 / 14 m; FR 5–12 m | 12.8 m to crystal tip | INFERENCE |
| 19 | Crystal lanterns: flame or LED? | Colours switch blue/cyan/white/warm/red/purple/off | FR once asked if "flame-shaped" heads are real flame | Colour-changing LED; separate flame heads + gerbs on the capitals | INFERENCE |
| 20 | Deck height | People vs fascia 65/73 px → 1.9 m; daylight still consistent | TA assumed 2.5 m | 1.9 m | INFERENCE |
| 21 | DJ portal size and depth | 3.5–3.9 hang widths wide; apex just below the chin | P ground geometry suggests the arch sits ~10 m behind the deck front | 5.4 m wide, apex 7.2, front Z −6 | INFERENCE |
| 22 | Dragon head offset/yaw | Thumbnail: turned to viewer-left; FR: centre 5–7 % of core width left of axis | – | Pivot X −2.5, yaw −12° | INFERENCE |
| 23 | Left foreleg / "red orb" | Right foreleg with 3 talons is FACT; a red spherical element appears left of the arch in deck shots | – | Red scaled knuckle Ø 3.5 m at (−10, 8.5, −9) | ASSUMPTION |
| 24 | Fire from the mouth | Never seen in 160 frames; one white-orange flash at mouth/booth height (f118) | – | No mouth fire; hidden anchor kept | UNKNOWN |
| 25 | Jaw animation | Gape ~40° in every frame | – | Static | INFERENCE |
| 26 | Rosettes per wing | 3 per wing by day (golden-hour tele); 2 prominent at night (f103) | Frame-level only | 3 per wing, Ø 4.5 m | FACT (daylight) |
| 27 | LED video walls | Q-dance: no video walls; none in any frame | – | None; pixel-mapped structure | FACT |
| 28 | Banners / windows: print or LED? | They glow at night in solid colours | – | Backlit/emissive panels driven by the pixel system | UNKNOWN |
| 29 | Side-section depth and front line | Floorplan rear line Z −22…−37; front unknown | – | Front wall Z −4, level top Y 9.5 | ASSUMPTION |
| 30 | Rear of stage, pyro trusses | 2025: 2 × 45 m pyro trusses (FACT); 2026 unknown | – | Trusses at Z −30 (Y 22) and Z −38 (Y 26) | ASSUMPTION |
| 31 | PA box type and counts | Box width fits K1/K2 (1.34 m); 2025 post: 120 K1, 78 KS28, 84 K2 | – | 4 × 20 K1 + 4 × 10 K2 side + 8 × 2 × 6 K2 delays + ~72 KS28 | INFERENCE / ASSUMPTION |
| 32 | 2026 suppliers | Continuity of the 2018–2025 team is likely; teardown shows Boekestijn cranes | – | Not needed for the build | UNKNOWN |

## 3. Show systems

| # | Item | What we know | Sources disagree? | Decision | Class |
|---|---|---|---|---|---|
| 33 | Fixture models/counts | 2024: 2,500 lights; 2025: 1,800 structure + 600 show | – | ≈ 2,530 units in the plan (bible §7.1) | ASSUMPTION calibrated on FACT |
| 34 | Laser count/models | Many looks per song; no published count | – | ≈ 45 projectors at fixed positions | ASSUMPTION |
| 35 | Ground-level lasers | Sheets and webs at 1–3 m over the empty floor | Normal practice would forbid this with a crowd | As filmed: 1–3 m; Tribe mode: ≥ 4.5 m above heads | FACT (video) / ASSUMPTION (tribe) |
| 36 | Flame head count | ≥ 15 visible in f087 (resolution-limited); PA estimated ~70 | – | ≈ 84 heads (bible §7.5) | ASSUMPTION |
| 37 | Twin 15 m torches | Two big fireballs flanking the head in f104 | Mount unknown | On the central towers (±14, 16.5, −13) | INFERENCE |
| 38 | Blue outro plumes | 6–8 blue-lit columns at 1541–1551 | CO2 vs coloured flame vs lit smoke; Flamaniac has no blue fluid | Blue-lit CO2 jets | INFERENCE |
| 39 | Firework calibres and heights | Permits 2017/2019: cakes ≤ 1", no shells; P canopy 45–80 m; frames 1–4 × stage height | Engine default 80–260 m; FR guesses up to 150 m | Breaks 45–90 m AGL, radius 8–15 m | INFERENCE |
| 40 | Burning-wings timing | f072 at 711.5 s (nominal) shows the flames; music has a 2-bar break at 709.2 | Storyboard phase (#73): real time may be ~715 | Fire 709.2 (3 s) + 712.2 (1.5 s) + 715.25 (1.5 s; review addition, covers both readings) | INFERENCE / ASSUMPTION (3rd burst) |
| 41 | Flame-ring timing | f087 at 859.8 s (nominal); climax runs 829.25–877.3 (bar = 1.5 s) | Review: "859.9 (bar 17)" was wrong. Bar 17 is 853.25 and 859.9 is off the grid | Full ring on 859.25 (bar 21), re-fired each downbeat to 863.75 (so it also covers the probable real frame time ~864), then chases per bar to 877.3 | INFERENCE |
| 42 | Piano laser mapping | Beams go piano → inner crystals → outer crystals; 7 intro hits | – | One segment added per hit; piano on the riser at Z 59, mirrors on rows 1–2 | ASSUMPTION |
| 43 | Blackouts at 1440 and ~1530 | Aerial f146 dark; f155 black while music continues | Could be camera cuts | 1440: no change (U); ~1529.6–1536: blackout | UNKNOWN / ASSUMPTION |
| 44 | Drop 1 of Sacred Flame at 800 | f081 shows a low-energy look inside the drop | Music says drop | Short accent 799–806 inside the drop | INFERENCE |

## 4. Field and terrain

| # | Item | What we know | Sources disagree? | Decision | Class |
|---|---|---|---|---|---|
| 45 | Field surface | OSM grass polygon notch + aerials: concrete X ±44, Z 0–113; daylight short shows grey paving + gravel | FR repeatedly call it "grass" (wash-tinted) | Paved concrete floor, grass banks | FACT |
| 46 | Darker central strip | f025: lighter panels either side of a darker aisle | – | Slightly darker aisle strip X ±12 | ASSUMPTION |
| 47 | Grass colour after the heatwave | Record heat, rain on 27 Jun | – | Parched #7C7F4A | ASSUMPTION |
| 48 | FOH position/structure | P: fenced low platform with a camera operator ~1.6 Δ beyond row 1; f087 dark object between rows 2 and 3 | TA assumed Z 58–68 two-tier FOH; SA Z 88 | Camera/FOH platform Z 87–93 (12.8 × 6 m) | INFERENCE |
| 49 | Small riser | P: small fenced riser between rows 1 and 2 | – | Piano riser Z 57–61 | INFERENCE |
| 50 | Bars | Official floorplan: crest bars L/R (6 modules), back-left/right (4 modules); no container bars in 2026 | Map ±8 m; arms overlap Z 31–58 | Floorplan positions; rampart openings for access | INFERENCE |
| 51 | Misting poles | Heat protocol mentions misting installations | Positions unknown | 4 poles at (±48, 118), (±104, 95) | ASSUMPTION |
| 52 | Premium deck 2026 | 2024 aerial layout; 2026 map structures X ±40, Z 190–209 | – | 2024 footprint + photo terrace (Z 166–172, Y 5) | INFERENCE |
| 53 | Tree species/heights | OSM outlines FACT | – | Poplar/willow/ash 15–22 m | ASSUMPTION |
| 54 | Lake level | AHN last dry cells −4.1…−4.3 NAP | – | Water Y −1.8 | INFERENCE |

## 5. People, crowd, culture

| # | Item | What we know | Sources disagree? | Decision | Class |
|---|---|---|---|---|---|
| 55 | Which day was the Endshow | Q-dance schedule: Saturday 22:40 | HARD CULTR / Venga: "Sunday" | Saturday | FACT |
| 56 | MC identity | Cap, tee, shorts, handheld mic during the anthem vocals | Not captioned | E-Life (label as "MC" in-app) | INFERENCE |
| 57 | Pianist identity | White grand piano, striped jacket | JDX vs another pianist | JDX (label as "pianist") | INFERENCE |
| 58 | Troupe size | 7–12 dancers + 1 lead + 1 aerialist across frames | ±3 | 10 dancers + lead + aerialist | INFERENCE |
| 59 | Crowd size (Tribe mode) | Capacity 72,500/day; Fri/Sat day tickets cancelled; ~50–58k campers; POWER HOUR 2023 65k at RED | CB default 55k | 45,000 default, slider 0–65,000 | INFERENCE / ASSUMPTION |
| 60 | Crowd demographics | 18+, 100+ countries | No official split | 65/35 M/F, age mode 23–28, NL 45 % | ASSUMPTION |
| 61 | Flag rules and share | Flags are iconic; selfie sticks ≤ 1 m | No pole rule found | 0.8 % of agents, poles 2.8–4.5 m | ASSUMPTION |
| 62 | "Losse polsjes" choreography | Viral loose-wrist dance tied to L.P.A. | No reference video used | Forearms up, wrists flopping on each kick | ASSUMPTION |
| 63 | Drink prices 2026 | 2024: €4.00 token, Bud 0.25 L = 1 token, cocktail 3 | No 2026 list | Bud €4.30, cocktail €12.50 etc. (bible §11) | ASSUMPTION |
| 64 | Soft-drink / spirits partner | Red Bull and Smirnoff ICE labels on the 2026 map | No contract found | Red Bull + Smirnoff ICE on menu; cola brand generic | INFERENCE |

## 6. Music

| # | Item | What we know | Sources disagree? | Decision | Class |
|---|---|---|---|---|---|
| 65 | Vivaldi "Defqon.1 Version" tempo | Unreleased; waveform hits every 7.9 s | – | Free tempo; cue on the measured hits | UNKNOWN |
| 66 | Domitor Draconis tempo/structure | Unreleased; waveform only | – | Sections from the waveform; beat grid 150 BPM placeholder | UNKNOWN |
| 67 | Embers BPM | Spectral peaks 159.5–160.8 in 4 of 5 windows | – | 160 BPM, anchor 1188.4 | INFERENCE (low) |
| 68 | Chapter marks vs audio starts | Discorecord audio starts 126.4 (chapter 115); Sacred Flame 638.6 (chapter 622) | – | Visual chapters for UI, audio anchors for cues | FACT |
| 69 | Live vocals? | Audio matches the studio radio edit (r = 0.86) | – | Playback performance | INFERENCE |

## 7. Intoxication module

| # | Item | What we know | Sources disagree? | Decision | Class |
|---|---|---|---|---|---|
| 70 | Numeric reaction-time vs BAC curve | Sourced qualitative bands, some eye-tracking percentages | – | Input-latency values are design choices | ASSUMPTION |
| 71 | Hyperthermia thresholds in the sim | Hyperthermia risk is FACT; thresholds are not sourced | – | Warning 38.5 °C, collapse ≥ 40 °C | ASSUMPTION |
| 72 | Real-world timing of drug effects | General literature exists | – | **Not shown**: phases are abstract and time-compressed | Policy |

## 8. Independent review additions (2026-09-25)

| # | Item | What we know | Sources disagree? | Decision | Class |
|---|---|---|---|---|---|
| 73 | Storyboard frame timing | Frames are evenly spaced at 1581/160 = 9.881 s (the L0 100-frame and L2 160-frame storyboards line up with a constant offset, not a drift). Against the audio-aligned downbeats, pyro in f010, f022, f033, f042, f054, f120, f130, f131 and f153 is already mature 1–5 s *before* its cue at nominal time (e.g. f054 full barrage at 533.6 inside the 531.6–534.7 near-silence; f120 60–80 m crackle band at 1185.8, at the audio minimum). The chapter marks match the audio map to within ±2 s | The research (and the review brief) assume frame i = i × 9.88 s exactly | The picture in fN is probably from ≈ 9.881·N + 3–5 s. Keep audio-snapped cues; read "NNN:" look times as nominal; widen cue windows where cheap (burning wings, flame ring, reveal, green sheet, crown-lit start). Confirm with the actual video when available | INFERENCE (medium) |
| 74 | Bengal flare pot position (hit 55.3) | f006: red sources at 29.7–33.7 % and 70.5–71.8 % of frame; front-line corners at 27.3 % / 71.0 % (f005) | Earlier value ±63 (mid side section) would project to ~34 % / ~64 % | (±86, 9.6, −4.5) | INFERENCE (±7 m) |
| 75 | Row-4 obelisk plinths vs the road | Plinths at Z 130.75–139.25; OSM road centreline Z 143, 12 m wide → inner edge Z 137 | The plinths overlap the road shoulder by ~2 m | Not moved (rows are ±6 m). World build: pull the road's inner edge to Z 139.5 between X ±25, or accept the plinths standing on the verge | ASSUMPTION |
| 76 | FOH / riser distance | Photo P ground-plane fit (plinth fronts + deck-front line at Z ≈ 0): FOH front edge Z ≈ 90 ± 3, riser front edge Z ≈ 59 ± 3; f087 shows both objects in the expected row gaps | Bible front edges 93 / 61 | Keep FOH Z 87–93 and riser Z 57–61 (within tolerance); if matching photo P exactly, shift both ~3 m towards the stage | INFERENCE |
| 77 | Row overlaps in show-analysis | Rows 4.1, 6.7, 7.9, 7.10, 8.1–8.4 overlapped or left gaps; 3.13 held the violet look of f051, which lies after the 502.1 drop | – | Rows are now contiguous and non-overlapping (show-analysis rows tagged "review") | – |
| 78 | Verified without change | Stage bearing 325°; world axes and the WGS84 → world formula; moon t0 direction (0.282, 0.128, −0.951); sun and planets (PyEphem 4.2.1 reproduces all values to ≤ 0.1°, except the moon end azimuth 167.4 → 167.1); f004 camera re-projection; K1 inner-hang ruler 21.8 m; S/Δ ≈ 1.21–1.24 from photo P with f = 2006 px; deck 1.9 m; obelisk tip 12.6–13.0 m (photo P); 8 towers at X ±20, aisle 31.5 m clear; all 89 hexes in bible §4.2 traceable to frames or show-analysis except #FFE8B0 (designed gerb white); crowd zone areas and totals; pyro, laser and flame anchor counts in the json match bible §7 | – | – | – |
