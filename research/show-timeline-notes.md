# Show timeline notes — `public/show/endshow-2026.json`

> **Re-timed onto the measured audio (2026-09-25).** All times below are the *authored* (pre-audio) times.
> The shipped file was migrated once by `scripts/retime-show.py`: the tempo map is now the measured per-track grid
> from `public/show/audio-map.json` (86 segments, `source: "analyzed"`, shifted to the audible kick attack), the
> 113 section starts moved to the audio boundaries (42 by ≥ 0.5 s, e.g. the Discorecord breakdown 182.3 → 176.1,
> L.P.A. one beat later), and every cue, moment and chapter followed through a monotone warp with re-snapping to
> the new grid. Evidence: `research/audio-map.md`; per-section table: `research/retime-report.md`.

How the 1581 s Endshow choreography was authored, and why. Every section of the show file is listed below
with its evidence class and the storyboard frames it rests on. Compiled 2026-09-25.

**Revision QA round 1 (2026-09-25).** The independent accuracy review found the cue timing exact but the picture
off: the fire U-shape missing, blackouts not black, haze/wash/sky tint flattening every drop, beam fans where the
video has none, fireworks too small, short cues already dead at the storyboard moment, and ~280 s of invented
every-beat deck flames. The revision (ground rules 2, 4, 5, 8, 9 below; chapter notes §6; signature table §7;
sight lines §8) draws the U in fire, removes the flame chases, sets the stage `master` to 0 in blackouts, caps
haze/wash/sky, thins the beams, widens and re-phases the fireworks, re-aims 13 camera shots at the current world
build, adds viewing hints to the moments, and turns three of those lessons into validator checks (storyboard
liveness, blackouts, camera sight lines). The key-cue column of §5 is regenerated from the file.

Classification (as in `design-bible.md` / `uncertainties.md`):
**FACT** = seen in a storyboard frame / official photo, or measured in the audio; **INFERENCE** = strong
deduction (interpolated between frames, read through smoke, grid-derived); **ASSUMPTION** = designed fill-in
where nothing was observed; **UNKNOWN** = not established (a neutral value is used).

Sources, in order of authority: `research/design-bible.md` (master), `research/show-analysis.md` (cue-level
timeline), `research/music-analysis.md` (audio-aligned bar map), the 160 storyboard frames `fNNN` of the official
video (`scratchpad/yt/frames`, contact sheets `yt/sheets/sheet_0..7.jpg`), the per-frame analyses
(`scratchpad/frames_*.json`), `research/terrain-layout.json` (pyro / laser anchor positions) and
`research/production-analysis.md` (real kit: Pyrofoor flame units, 1" cakes, laser layout).

---

## 1. Ground rules used everywhere

1. **Music first.** Every section boundary, drop and pyro hit sits on the audio-aligned beat grid of
   `music-analysis.md` §5.1 (bar = 4 beats; `anchor + n·bar`). Section starts are phrase boundaries (8/16/32-bar
   units of the track's own tempo — e.g. Sacred Flame's main climax is exactly 32 bars @160 = 48.0 s,
   829.25→877.25). Only Vivaldi (free tempo) uses the measured hit times directly.
2. **Storyboard lag.** Frame `fN` shows the picture at ≈ `9.881·N + 3–5 s` (bible §14, show-analysis §0 review
   note; the brief states `(N+0.5)·9.88`). Cues are placed on the musical downbeat that *causes* the look, and a
   look that a frame shows is kept alive long enough to cover both the nominal and the lagged reading (e.g.
   the burning-wings echoes at 715.25/718.25 cover f072 at 711.5 *and* ~716; the twin torches re-fire at
   1030.1 so f104 at ~1032 still sees them; the Discorecord V-fans are re-launched 4 bars after the drop).
   Since QA round 1 this is **checked, not hoped for**: `validate-show` holds a curated list of the 49 frames
   whose analysis shows pyro or aerial fireworks and warns unless a cue of that system is at *full strength*
   over the whole window `9.881·N + 3 … + 5 s` (emission time + a short tail; shells from lift to star burn-out).
   Short effects are therefore sustained (cakes instead of 0.6 s volleys, a volley per bar) or re-fired one or
   two bars later, never moved off the downbeat that causes them.
3. **Explicit looks per section.** Every one of the 113 sections starts its own `lights.look`, `lights.wash`,
   `lights.pillars`, `lasers.look|off`, `stage.state`, `screens.content` (the pixel-mapped structure — there
   are no video walls, bible §5.1 FACT), `fog.level` and `crowd.mood`. The validator enforces this. Nothing
   leaks from one section into the next, so seeking anywhere gives the correct picture.
4. **Kick-synced effects live on the grid.** Light hits, CO2 jets, sparkulars and strobe runs are
   `repeat` cues (`every: beat|bar|2bar`, step `pattern`, per-step `cycle` of patterns / heights /
   colours, `cycleTargets` for left/right wing alternation) with `snap: "beat"`. After the audio analyser refines
   a tempo segment (`ShowEngine.setTempo`) they re-snap and re-expand onto the measured beats automatically.
   Kick segments are split at every gap so `ctx.beat.hasKick` is false in silences and breakdowns.
   **Flames are not a kick effect in this show** (QA round 1): no storyboard frame of the anthem drops, Oath drop
   2, the Sacred Flame drop/climax, Domitor or the In The Cold drop shows a deck flame row (f042–f044, f051–f056,
   f081–f086, f103–f109, f143–f145), and ~280 s of every-beat `deck_front` chases painted those violet/blue
   drops orange and hid the dragon from the crowd. Deck flames now fire only where the analysis documents them
   (63.2 chase, the 859.25 ring + chase, the 1511.18 finale chase per bar) plus a single hit on a drop downbeat
   and ≤ 6 m accents on 4-bar phrase downbeats. The Domitor span (tempo UNKNOWN) carries no beat-quantised pyro.
5. **Blackouts are real blackouts.** 157.9, 232.8–237.4, 409.3–412.3, 531.6–534.7, 612.3–638.6, 787.3–790.3,
   826.3–829.3, 1046–1049, 1182.4–1188.4, 1212.4–1216.9, 1410.5–1412.1, 1529.8–1536 and 1561–1581: lights
   `dark`, lasers `off`, pixels `off`, stage `dormant`, crystals off (show-analysis §10). The one FACT exception
   is kept: in the Discorecord gap the pillar shafts stay red (f016). Since QA round 1 the `stage.state` of every
   blackout also sets the MainStage `master` level to 0 (0.02–0.07 where a FACT glint remains: bridge, piano
   outro, Domitor's teal outline), which switches the castle windows, lamp strings, portal, rosettes and pixel
   content off as well — `dormant` alone left them glowing. The wash is 0 and the pixels are `off`; the
   validator checks every section labelled blackout/darkness/black and every `silence` section for this.
6. **Budget follows the heatmap.** YouTube "most replayed" (FACT): In The Cold finale 1503–1519 (1.00), Sacred
   Flame 728–854 (0.72–0.80). Those two spans carry the densest flame/firework programming (density histogram:
   13:00 and 25:00 are the two peaks). Sacred Oath (0.09) keeps its FACT canopy but little else.
7. **Contrast is the design rule** (Jonas Schmidt, FACT): each chapter has its own colour key, laser language and
   pyro vocabulary; fire is withheld where the video withholds it (Discorecord = white/cyan pyro, no flames;
   Embers = the coldest chapter, CO2 instead of fire; Domitor climax 1 = LED dragon only, fire arrives with the
   twin torches). Quiet sections are genuinely quiet so the drops land.
8. **Dark frame, bright accents** (QA round 1). The reference is a dark image with saturated LED and fire
   accents; the first build compressed it into one colour of fog. Haze levels above 0.55 are compressed
   (`0.55 + 0.45·(h − 0.55)`: 0.8 → 0.66, 1.0 → 0.75), section washes above 0.55 likewise (1.0 → 0.75), sky
   tints are ≤ 0.1 (burning wings 0.07, flame ring 0.06, finale 0.1), and dense moving-head fans are kept for
   the documented beam moments (237 fans, 291 fans, 523 V-fans, 787–793 lavender fans, 1225–1245 beam storm,
   1474 laser cage). Where the reference shows no beams (reveal, Vivaldi gerbs/climax, the red canopy, burning
   wings, Sacred Flame climax, Domitor barrage, the finale) the truss/tower/field groups are dark or ≤ 0.5 and
   the floor fixtures stand as near-vertical up-lights (tilt 62°) instead of raking the lens.
9. **The U in fire.** The iconic drone images (f087 ring, f144 silver wall, f153 finale wall, f119 fountain row)
   are drawn on `deck_front` + `side_front` + `arm_posts` (24 + 20 + 16 heads, X ±93, Z −4…58); fountain walls
   use `pattern: "alternate"` (every second head, ≈ 30 fountains) so the particle budget stays inside the
   finale's spark pool.

## 2. Tempo grid (`tempo`, 55 segments)

One tempo per track (the Endshow chains the radio edits at native tempos — music-analysis TL;DR, INFERENCE H),
split into kick / no-kick sub-segments on the same grid. Each segment's `anchor` is its first downbeat on that
grid (the drop downbeats 243.46 / 415.44 / 502.15 / 589.73 / 829.25 / 1188.4 / 1511.18 are anchors themselves).

| Track | BPM | Grid anchor | Class | Note |
|---|---|---|---|---|
| Vivaldi "Winter" | 121.52 | 47.4 (hit 1) | ASSUMPTION | free tempo; 4 bars = the 7.9 s hit spacing; cues use the measured hit times, no snapping |
| Discorecord (Galactixx) | 157 | 243.46 | INFERENCE H | kick 133.4–157.85, 160.9–171.6, 219.0–232.8, 243.46–267.9 |
| Sacred Oath | 155 | 415.44 | INFERENCE H | kick 307.05–319.4, 330.3–341.1, 415.4–440.2, 502.15–523.8, 536.2–564.1 |
| L.P.A. | 170 | 589.73 | INFERENCE H | kick gaps 598.2–601.0 and 609.5–612.3 are no-kick segments |
| bridge + Sacred Flame | 160 | 829.25 | INFERENCE H | tribal percussion 649–733 = no hardstyle kick (toms carry the light pulses); kick 745.25–781.25, 793.25–814.25, 829.25–877.25 |
| Domitor Draconis — piano | 145.8 | 887.2 | INFERENCE L | 7 hits ≈ 6.58 s apart = 4 bars |
| Domitor Draconis | 150 | 933.8 / 1006.7 / 1026.9 | ASSUMPTION (tempo UNKNOWN) | anchored separately on the impact and both climaxes so the local grid is right where the pyro is |
| Embers | 160 | 1188.4, then 1255.5 | INFERENCE L | 1293.4 − 1188.4 = 70 bars; the fills 1137.4/1143.4/1149.4/1155.4 fall on the grid; drop 2 re-anchored (0.4 s phase jump in the fan-rip waveform) and 1287.0 lands exactly on its bar 21 |
| In The Cold (The Story) + outro | 155 | 1511.18 | INFERENCE H | kick 1412.08–1452.34 and 1511.18–1535.95 |

Full segment list (generated from the file):

<details><summary>All 55 tempo segments</summary>

| Span (s) | BPM | Anchor (downbeat) | Kick |
|---|---|---|---|
| 0.00–126.40 | 121.52 | 47.400 | — |
| 126.40–133.40 | 157 | 127.282 | — |
| 133.40–157.85 | 157 | 133.396 | yes |
| 157.85–160.91 | 157 | 157.855 | — |
| 160.91–171.61 | 157 | 160.912 | yes |
| 171.61–219.00 | 157 | 171.613 | — |
| 219.00–232.76 | 157 | 219.001 | yes |
| 232.76–243.46 | 157 | 232.759 | — |
| 243.46–267.92 | 157 | 243.460 | yes |
| 267.92–273.00 | 157 | 267.919 | — |
| 273.00–307.05 | 155 | 274.537 | — |
| 307.05–319.44 | 155 | 307.053 | yes |
| 319.44–330.28 | 155 | 319.440 | — |
| 330.28–341.12 | 155 | 330.279 | yes |
| 341.12–415.44 | 155 | 341.117 | — |
| 415.44–440.21 | 155 | 415.440 | yes |
| 440.21–502.15 | 155 | 440.214 | — |
| 502.15–523.83 | 155 | 502.150 | yes |
| 523.83–536.21 | 155 | 523.827 | — |
| 536.21–564.09 | 155 | 536.214 | yes |
| 564.09–566.00 | 155 | 564.085 | — |
| 566.00–589.73 | 170 | 567.142 | — |
| 589.73–598.20 | 170 | 589.730 | yes |
| 598.20–601.02 | 170 | 598.201 | — |
| 601.02–609.50 | 170 | 601.024 | yes |
| 609.50–612.32 | 170 | 609.495 | — |
| 612.32–622.00 | 170 | 612.318 | yes |
| 622.00–638.60 | 160 | 622.250 | — |
| 638.60–745.25 | 160 | 638.750 | — |
| 745.25–781.25 | 160 | 745.250 | yes |
| 781.25–793.25 | 160 | 781.250 | — |
| 793.25–814.25 | 160 | 793.250 | yes |
| 814.25–829.25 | 160 | 814.250 | — |
| 829.25–877.25 | 160 | 829.250 | yes |
| 877.25–886.00 | 160 | 877.250 | — |
| 886.00–933.80 | 145.8 | 887.200 | — |
| 933.80–943.40 | 150 | 933.800 | — |
| 943.40–1004.20 | 150 | 943.400 | yes |
| 1004.20–1006.70 | 150 | 1004.200 | — |
| 1006.70–1025.10 | 150 | 1006.700 | yes |
| 1025.10–1026.90 | 150 | 1025.900 | — |
| 1026.90–1090.90 | 150 | 1026.900 | yes |
| 1090.90–1098.00 | 150 | 1090.900 | — |
| 1098.00–1131.40 | 160 | 1098.400 | — |
| 1131.40–1182.40 | 160 | 1131.400 | yes |
| 1182.40–1188.40 | 160 | 1182.400 | — |
| 1188.40–1227.40 | 160 | 1188.400 | yes |
| 1227.40–1255.50 | 160 | 1227.400 | — |
| 1255.50–1312.00 | 160 | 1255.500 | yes |
| 1312.00–1320.40 | 160 | 1312.500 | — |
| 1320.40–1412.08 | 155 | 1320.728 | — |
| 1412.08–1452.34 | 155 | 1412.083 | yes |
| 1452.34–1511.18 | 155 | 1452.341 | — |
| 1511.18–1535.95 | 155 | 1511.180 | yes |
| 1535.95–1581.00 | 155 | 1535.954 | — |

</details>

## 3. Palettes (39, emissive source colours from bible §4.1–4.2)

Palettes are per show phase and cross-fade over 1.5 s at section boundaries (`ShowEngine.paletteAt`). `atmos` is
the colour the haze takes in that phase. Colours are *source* colours (saturated emissive), not the graded frame
colours; the graded values from the frames were mapped back through bible §4.1.

| Phase | Palettes | Key (primary / secondary / accent) | Evidence |
|---|---|---|---|
| Winter | `winter_night`, `winter_fire`, `winter_climax`, `winter_hush` | castle blue #3050D0 / dragon orange #E06030 / crystal #5BA1D2; red hits #FF1A2A + white-gold gerbs #FFE8B0 | FACT f002–f012 |
| Discorecord | `disco_dark`, `disco_green`, `disco_crown`, `disco_drop` | laser blue/cyan/green #1A2BFF #00E5FF #00FF55, crown red/orange + blue stripes, white drop | FACT f013–f027 |
| Sacred Oath | `oath_violet`, `oath_vocal`, `oath_drop`, `oath_quiet`, `oath_violet2`, `oath_blue`, `oath_red` | violet #6D24B9→#8A2BFF / magenta; drop 1 magenta + red; drop 2 violet then deep blue with a red-orange dragon; final red #FF0A14 + white + gold | FACT f028–f056 |
| L.P.A. | `lpa`, `lpa_drop` | deep blue #2A2AFF / red-orange #FF5020 / cyan-blue #40A0FF; white pyro light #F4EFE7 | FACT f057–f061 |
| Blackouts | `blackout` | near black | FACT f062–f064, f155, f158–f159 |
| Sacred Flame | `flame_ritual`, `flame_fire`, `flame_glitter`, `flame_climax`, `flame_ring` | ritual red #E0100C + amber #FFC080 + lantern #FFF0C0; burning wings orange #FF6A00; glitter cyan-white; climax red/orange/white; the ring = fire light only | FACT f065–f088 |
| Domitor Draconis | `domitor_dark`, `domitor_dragon`, `domitor_violet`, `domitor_blue` | red-orange crystals #FF5A3A + green uplight #20C060; dragon green #3CFF6E + red #E02030 + gold; magenta #C040FF; deep blue #1830FF | FACT f089–f110 |
| Embers | `embers_ice`, `embers_pink`, `embers_storm`, `embers_magenta`, `embers_climax`, `embers_ember` | ice blue #1A2AFF / cyan #42EEFD; pink canopy #FF60C0; ice-white storm #D8ECFF; cyan stage under a red/pink canopy; the ember #D0203A | FACT f111–f132 |
| In The Cold | `cold_gold`, `cold_violet`, `cold_red`, `cold_drop`, `finale`, `outro_blue` | gold laser #FFC000; violet/magenta #8A2BFF #FF20C8 + lavender #E0D0FF; finale orange/red/gold-white; cold-fire blue #3050FF | FACT f133–f157 |

The fire-versus-cold irony of the bible (§2) is kept deliberately: Embers is the coldest palette of the show,
In The Cold has the warmest lasers (gold) and the fire finale, and the show ends on blue "cold fire".

## 4. Targets, fallbacks and parameters

* All `target` values are `AnchorName`s from `src/core/Anchors.ts` or the filters `all/left/right/center`
  (validator-enforced). The MainStage registers every group on its built geometry: `deck_front` = the 24
  flame heads of the central deck only (X ±35.7), `side_front` = 20 heads along the side-section fronts
  (X ±41…±90.5), `arm_posts` = 16 posts along the forward arms (X ±93, Z 2…58), `arm_ends` the two arm-end
  bastions; the whole U is `["deck_front","side_front","arm_posts"]`. `towers_top` = castle + side towers,
  `roof` the roofline gerb/comet positions, `front_comets` / `roof_comets` the comet rows, `pillars_top` the 8
  lantern capitals, `fireworks_sides` the bank-crest mortar lines (X ±106), `speaker_hangs` the hang tops.
* The design-bible positions that the first build carried as `p.at` extensions (flare pots, corner fireballs,
  tower torches, wing spars, arms, hang lines) are real anchors now (`bengal`, `corner_fireballs`,
  `tower_torches`, `wing_left/right`, `arm_posts`, `hang_glitter`), so the file uses them directly and no
  `p.at` remains. Pillar-row selections use `p.rows` (1 = nearest the stage); systems that ignore it fire all
  8 capitals.
* Fountain walls on many heads use `pattern: "alternate"` (every second unit of the X-sorted row fires).
* Params beyond the documented list (listed by the validator): `lights.pillars` `color2` = shaft uplight colour
  and `shaftIntensity`; laser `segments` (piano bounce), `distance` (chevron convergence Z), preset `chevron`
  (falls back to `fan`); pyro `angle`, `type: "bengal"` on a long `burst`; fireworks `per`, `end`, `serpent`,
  `stagger`, `x`/`z`, `zipper`, `types`, `comets`; `fog.lowfog.area` (`field` for the laser seas); screens
  `color2` + `pattern` (stripes/split/chase/dashes/dots); crowd states `pols` (losse polsjes), `crouch`, `clap`,
  `stomp`, `sit`, `headbang` (implemented by the crowd module; unknown states are ignored → built-in timeline);
  `atmos.sky.amount`; camera `roll`.

## 5. Section by section

Columns: time (s) · section · SectionKind · energy · palette · the key pyro/firework/laser cues that start in
the section (generated from the file) · storyboard frames · classification of the look / timing. Every section
additionally has its explicit lights / wash / pillars / lasers / stage / pixels / fog / crowd looks (§1.3).

#### Vivaldi – The Four Seasons "Winter" (Defqon.1 Version)

| Time (s) | Section | kind · energy · palette | Key cues (pyro / fireworks / lasers) | Frames | Classification |
|---|---|---|---|---|---|
| 0.00–14.00 | silhouettes at blue hour | intro · 0.15 · `winter_night` | — | f000–f001 | FACT look (blackout, blue crystals, lamp row) · INFERENCE timing |
| 14.00–32.00 | the cathedral reveal | intro · 0.25 · `winter_night` | — | f001–f003 | FACT look (f002) · INFERENCE 5.5 s fade 14.0→19.5 |
| 32.00–45.70 | crescendo | build · 0.35 · `winter_night` | — | f003–f004 | FACT crown pink, blue-white lamps (drone) · INFERENCE timing |
| 45.70–55.30 | first fire (hit 1) | orchestral · 0.5 · `winter_fire` | flame wing_tips | f005 | FACT hits in the waveform · ASSUMPTION hit→effect mapping |
| 55.30–69.00 | Bengal flares (hits 2–3) | orchestral · 0.55 · `winter_fire` | burst(bengal) bengal; flame deck_front | f006 | FACT red sources at the front-line corners + red field (drone) · INFERENCE Bengal |
| 69.00–75.50 | gerbs on the lanterns | build · 0.55 · `winter_fire` | gerb pillars_top; gerb center | f007 | FACT 7 gold-white gerbs (4 capitals rows 1–2 + 3 deck) · INFERENCE start 69.5 |
| 75.50–97.00 | orchestral climax | climax · 0.8 · `winter_climax` | flame deck_front; gerb roof; gerb wing_left; gerb wing_right; gerb wing_left+wing_right; comet 12 #FFD08A 30 m; comet 4 #FFE8B0 45 m | f008–f009 | FACT red wash + gerb fans + V-fans in lilac smoke · ASSUMPTION flame accents |
| 97.00–110.00 | second half, corner fireballs | orchestral · 0.6 · `winter_night` | flame corner_fireballs | f010 | FACT two orange fireballs at the outer structures · INFERENCE 100.1 hit · ASSUMPTION echo at 103.2 |
| 110.00–126.40 | the dramatic silence | anticlimax · 0.3 · `winter_hush` | — | f011–f012 | FACT only wing outlines + violet dragon, then off; lanterns off · ASSUMPTION sky beam + strobe hits |

#### Frontliner – Discorecord (Galactixx Remix)

| Time (s) | Section | kind · energy · palette | Key cues (pyro / fireworks / lasers) | Frames | Classification |
|---|---|---|---|---|---|
| 126.40–133.40 | intro hits, cyan lanterns | intro · 0.4 · `disco_dark` | — | f012–f013 | FACT crystals cyan, ~13 rampart lamps · ASSUMPTION hit accents |
| 133.40–145.63 | the white laser web | build · 0.6 · `disco_dark` | laser grid white @pillars_base; laser grid white @deck_front | f014 | FACT web criss-crossing the empty field (aerial) · INFERENCE plinth-corner emitters |
| 145.63–157.85 | heavy kick | drop · 0.8 · `disco_dark` | laser grid white @pillars_base; laser grid white @deck_front | f015 | FACT near-blackout silhouette · ASSUMPTION kick strobes on the deck lip |
| 157.85–160.91 | 2-bar silence | silence · 0.2 · `disco_dark` | — | f016 (nominal) | FACT shafts red + one crystal blue in the gap · INFERENCE silence |
| 160.91–171.61 | kick under red pillars | drop · 0.8 · `disco_dark` | laser sheet green | f016–f017 | FACT red shafts, stage dark, green sheet from 167.0 |
| 171.61–182.31 | riser, green laser sheet | build · 0.45 · `disco_green` | laser sheet green | f017–f018 | FACT green sheet, crown lit red/orange + blue from 176.2 |
| 182.31–206.77 | vocal breakdown, the crown lit | vocal · 0.4 · `disco_crown` | — | f018–f020 | FACT crown stripes → magenta (188) → dim red (198), blue floor pools |
| 206.77–219.00 | lasers skim the empty field | breakdown · 0.3 · `disco_green` | laser wave green @deck_front; laser fan blue @roof; laser sky cyan @wing_tips | f021 | FACT green/cyan/blue fans skimming 1–5 m, cyan fans into smoke |
| 219.00–231.23 | build, comet fan from the crest | build · 0.6 · `disco_crown` | comet 7 gold 38 m; comet 7 gold 42 m; comet 12 #F0F0FF 40 m | f022–f023 | FACT gold V-fan from the crest, silver glitter fan behind the dragon |
| 231.23–243.46 | pre-drop | build · 0.6 · `disco_dark` | — | f024 | FACT gap 232.8–237.4 + cool-white beam fans · ASSUMPTION strobe roll |
| 243.46–267.92 | DROP | drop · 0.9 · `disco_drop` | laser cone cyan @deck_front; gerb arm_posts; comet 18 white 30 m; comet 20 #FFE8B0 35 m; laser sky cyan @roof; comet 16 #FFE8B0 32 m; comet 14 white 28 m; sparkular center; cake 24 shots #FFE8B0 | f025–f026 | FACT comet V-fans + white comet row + fountain walls in green smoke · ASSUMPTION kick lighting |
| 267.92–273.00 | fade | anticlimax · 0.4 · `disco_green` | laser fan green @deck_front | f027 | FACT green front line + green laser dashes on the field |

#### D-Sturb ft. E-Life – Sacred Oath (Defqon.1 2026 Anthem)

| Time (s) | Section | kind · energy · palette | Key cues (pyro / fireworks / lasers) | Frames | Classification |
|---|---|---|---|---|---|
| 273.00–291.57 | cinematic intro | intro · 0.4 · `oath_violet` | — | f028 | FACT violet ambient, magenta-red haze over the crown, blue crystals |
| 291.57–307.05 | melodic intro, lavender zig-zag | build · 0.45 · `oath_violet` | laser crossfire #C8C8FF @deck_front; laser sky #3040FF @roof | f029–f030 | FACT purple/magenta wash, white beam fans, warm crystals, lavender zig-zag at 296 |
| 307.05–319.44 | intro kick | drop · 0.7 · `oath_violet` | — | f031 | FACT white beam rows slanting outward + vertical centre beam · ASSUMPTION kick hits |
| 319.44–330.28 | lead riff, magenta zig-zag | breakdown · 0.5 · `oath_violet` | laser crossfire #E070FF @deck_front | f032 | FACT violet deck haze, red shafts + blue crystals, magenta-pink zig-zag |
| 330.28–341.12 | kick 2, comet columns | drop · 0.7 · `oath_drop` | gerb deck_front+side_front; comet 20 #FF3060 40 m | f033–f034 | FACT vertical comet/gerb columns across the full width, striped wings, white outer crystals |
| 341.12–372.08 | E-Life on the empty stage | vocal · 0.3 · `oath_vocal` | — | f035–f037 | FACT MC on the deck, magenta/red + blue deck, cyan-white backlight curtain at 355, mouth bulb ring |
| 372.08–403.05 | the Oath: blue sunburst & red stars | vocal · 0.35 · `oath_vocal` | laser fan #3040FF @deck_front; comet 14 red 50 m; comet 14 red 55 m | f038–f040 | FACT blue sunburst laser fans + dashed ground lines (375), red comet row across X ±95 (385) |
| 403.05–409.25 | build-up | build · 0.6 · `oath_vocal` | — | f041 | FACT white/cyan · ASSUMPTION build chase |
| 409.25–412.34 | silence (blackout) | silence · 0.1 · `oath_vocal` | — | — | INFERENCE 3 s silence 409.3–412.3 · ASSUMPTION total blackout incl. crystals |
| 412.34–415.44 | pre-drop strobe roll | build · 0.6 · `oath_drop` | — | — | ASSUMPTION white strobe roll 8→16 Hz |
| 415.44–440.21 | ANTHEM DROP 1 | drop · 0.92 · `oath_drop` | laser fan #FF1FB8 @roof; flame deck_front; gerb deck_back; jet deck_front; comet 20 red/white 38 m; comet 20 red/white 44 m; flame deck_front ×x/4bar; comet 11 #F0D8A0 40 m; salvo crossette 4 red 60 m | f042–f044 | FACT 150° red comet fan, gold comet line + red crossettes (424), gold gerbs behind the MC · ASSUMPTION flames on the kick |
| 440.21–464.99 | mid-breakdown, serpent comets | breakdown · 0.5 · `oath_vocal` | comet 24 white 60 m; comet 1 red 50 m | f045–f046 | FACT row of 22–24 white serpent comets at 1.3x stage width, single red comet (454) |
| 464.99–477.38 | quiet, low fog | breakdown · 0.3 · `oath_quiet` | laser sweep #C8C8FF @deck_front; jet center | f047–f048 | FACT hero cam: jagged white lines, near-blackout deep blue, low horizontal lavender fans, CO2 plume, dense low fog |
| 477.38–489.76 | orchestral build | build · 0.5 · `oath_violet` | gerb dj_booth; burst center | f049 | FACT dark aerial with 2 gold fountains on the deck + white flash with smoke |
| 489.76–502.15 | pre-drop, backlight starburst | build · 0.6 · `oath_vocal` | — | f050 | FACT cyan-white backlight + starburst behind the MC · ASSUMPTION strobe roll |
| 502.15–508.34 | DROP 2 (violet starbursts) | drop · 0.9 · `oath_violet2` | laser fan white @roof; flame deck_front | f051 | FACT violet look, white starburst rosettes, window LED bars, mouth glow, warm crystals, purple pillar bodies |
| 508.34–523.83 | DROP 2 (blue & red) | drop · 0.9 · `oath_blue` | laser crossfire white @fireworks_sides | f052–f053 | FACT deep blue except red-orange dragon + wings, white V-fans from the side sections (523), blue pillar bodies |
| 523.83–531.57 | break | breakdown · 0.4 · `oath_blue` | — | — | INFERENCE break (audio) · ASSUMPTION dim blue look |
| 531.57–534.67 | near-silence | silence · 0.1 · `oath_blue` | — | — | INFERENCE near-silence 531.6–534.7 · ASSUMPTION blackout |
| 534.67–536.21 | pickup | build · 0.5 · `oath_red` | — | — | INFERENCE pickup bar · ASSUMPTION strobe roll |
| 536.21–564.09 | FINAL KICK, the red canopy | climax · 0.95 · `oath_red` | flame deck_front; gerb roof; salvo crackle 14 red 65 m ×x/bar; cake crackle 30 shots red; flame deck_front ×x/4bar; laser fan #A040FF @fireworks_sides; jet deck_front ×x-------/beat; comet 8 white 35 m; salvo brocade 12 #F0D8A0 55 m | f054–f056 + photo P | FACT red look, white roofline gerbs, red/white crackle canopy 45–80 m in two lobes, gold brocade line (553) · ASSUMPTION flames |
| 564.09–566.00 | outro | outro · 0.3 · `oath_violet` | — | f056 | FACT structure blue/violet, red inner wings, warm dragon, blue crystals |

#### Akimbo & Missy – L.P.A.

| Time (s) | Section | kind · energy · palette | Key cues (pyro / fireworks / lasers) | Frames | Classification |
|---|---|---|---|---|---|
| 566.00–578.44 | the Losse Polsjes chant | intro · 0.4 · `lpa` | — | f057–f058 | FACT deep blue castle, pink-red plate outlines, white/pink LED eye, warm bulb strings, pink haze at the mouth |
| 578.44–589.73 | stab build, pixel chases | build · 0.5 · `lpa` | — | f059 | FACT wing pixel chases red/orange ↔ cyan/blue, blue castle |
| 589.73–598.20 | UPTEMPO DROP | drop · 0.9 · `lpa_drop` | burst deck_back; gerb deck_back; gerb center; comet 1 white 45 m; sparkular center ×x-x-x-x-x-x-xxxx/beat; shell strobe white 70 m | f060–f061 | FACT stage fixtures mostly off, white flash mines/gerb walls + gold fountains, 1 white comet + 1 white star |
| 598.20–601.02 | kick gap | anticlimax · 0.5 · `lpa_drop` | — | f062 (nominal) | INFERENCE 2-bar gap |
| 601.02–609.50 | drop, second half | drop · 0.9 · `lpa_drop` | burst deck_back; gerb deck_back; gerb center; sparkular center ×x-x-x-x-x-x-xxxx/beat | f061 | FACT core pink/magenta in blue haze, cyan-blue crystals, orange shafts · ASSUMPTION second flash-mine hit |
| 609.50–612.32 | kick gap | anticlimax · 0.5 · `lpa_drop` | — | f062 (nominal) | INFERENCE 2-bar gap |
| 612.32–622.00 | blackout (kick in the dark) | anticlimax · 0.6 · `blackout` | — | f062 | FACT full blackout, mean luma 2/255 · INFERENCE the kick continues in the dark |

#### Bass Modulators – Sacred Flame

| Time (s) | Section | kind · energy · palette | Key cues (pyro / fireworks / lasers) | Frames | Classification |
|---|---|---|---|---|---|
| 622.00–638.60 | darkness | silence · 0.1 · `blackout` | laser sweep white @deck_front; burst(bengal) dj_booth | f063–f064 | FACT near black, faint red glints + white streaks, red glow at centre (632) · UNKNOWN sources |
| 638.60–649.25 | the portal | intro · 0.2 · `flame_ritual` | — | f065 | FACT deep red + amber practicals, DJ portal detail · INFERENCE timing |
| 649.25–673.25 | fire ritual: the lantern bearers | orchestral · 0.45 · `flame_ritual` | — | f066–f068 | FACT troupe with lanterns on the deck, red wash, dragon front-on red with white-pink face stripes (671) |
| 673.25–697.25 | the aerialist in the arch | orchestral · 0.5 · `flame_ritual` | — | f069–f070 | FACT aerialist on a strap inside the DJ arch, lantern bearers, red look |
| 697.25–709.25 | the arch downlights | build · 0.55 · `flame_ritual` | — | f071 | FACT fan of 6–7 white downlight spots inside the arch crown · ASSUMPTION rising tom pulses |
| 709.25–718.25 | BURNING WINGS | drop · 0.8 · `flame_fire` | firewall wing_left+wing_right | f072 | FACT both wings engulfed, everything orange/amber, yellow rosettes · INFERENCE 709.25 downbeat · ASSUMPTION echo bursts 715.25/718.25 |
| 718.25–733.25 | tribal groove | orchestral · 0.6 · `flame_ritual` | — | f073–f074 | FACT dim red, warm lamp row, red LED silhouette, amber crystals with star flares, performers gold-orange in the arch |
| 733.25–745.25 | break & riser, magenta pillars | build · 0.35 · `flame_ritual` | cake 12 shots white; comet 2 #F0F0FF 70 m | f075 | FACT red structure, white/lavender horizontal fans over the sides, magenta pillar bodies, white fountain column far left, 2 silver glitter tails at X ±40 |
| 745.25–769.25 | silver glitter comets | drop · 0.6 · `flame_glitter` | cake 10 shots #FFF0E0; comet 1 white 50 m; comet 4 #F0F0FF 50 m; comet 4 #F0F0FF 55 m; comet 2 #F0F0FF 60 m | f076–f077 | FACT white lamp row, orange-red centre, cyan-white side sections, silver glitter streams from the hang lines (760) |
| 769.25–781.25 | the glitter curtain | drop · 0.65 · `flame_glitter` | flame pillars_top; gerb pillars_top; comet 12 #F0F0FF 55 m ×x/bar; salvo willow 8 gold 80 m; salvo strobe 6 white 72 m; salvo glitter 8 #FFF4E0 84 m | f078–f079 | FACT 10+ silver glitter comets to X ±110, gerbs on row-2 capitals, full-sky curtain of white/gold glitter (780) |
| 781.25–793.25 | build-up, lavender fans | build · 0.6 · `flame_fire` | — | f080 | FACT red/orange with big white-lavender beam fans (15–20 beams), low fans aimed outward · INFERENCE silence 787.3–790.3 |
| 793.25–817.25 | DROP 1 | drop · 0.92 · `flame_climax` | flame deck_front; jet pillars_base; comet 8 red 45 m; flame deck_front ×x/4bar; flame wing_left ×x-------/beat; comet 8 red 48 m; comet 8 red 50 m | f081–f082 | FACT red haze, near-blackout accent with cool-white crystals 799–806, ≥7 red/white glitter comet columns · ASSUMPTION kick flames |
| 817.25–829.25 | build, striped wings | build · 0.65 · `flame_climax` | jet wing_tips ×x/2bar | f083 | FACT full red, lavender spot beams from the upper wings at the audience, red/white striped ribs, white-lit CO2 columns beside the wings |
| 829.25–859.25 | MAIN CLIMAX | climax · 1 · `flame_climax` | firewall wing_left+wing_right; flame deck_front; salvo strobe 15 red 40 m; flame deck_front ×x/4bar; laser sheet #8A2BFF; cake crackle 16 shots #FF3060; comet 1 orange 50 m; flame wing_left ×--------x-------/beat; comet 16 #FFA21A 42 m; … | f084–f086 | FACT red in thick haze, red strobe-star arc, crackle + orange comet (839), orange X-fans at the arm ends (849), booth strobe + white down-beams · ASSUMPTION flame choreography |
| 859.25–877.25 | THE FLAME RING | climax · 1 · `flame_ring` | flame deck_front+side_front+arm_posts ×x/bar; flame pillars_top ×x/bar; flame tower_torches; flame deck_front+side_front+arm_posts ×x---/beat; firewall wing_left+wing_right | f087–f088 | FACT ~60 flame heads along deck + sides + arms as one line, flames on all 8 capitals, stage fixtures off (lit by fire only) · INFERENCE 859.25 downbeat |
| 877.25–886.00 | outro, green uplights | outro · 0.3 · `domitor_dark` | laser crossfire white | f088–f089 | FACT blackout, one crystal red-orange, green uplight, one faint white beam (bounce start) |

#### JDX – Domitor Draconis

| Time (s) | Section | kind · energy · palette | Key cues (pyro / fireworks / lasers) | Frames | Classification |
|---|---|---|---|---|---|
| 886.00–933.80 | the tamer at the piano | orchestral · 0.2 · `domitor_dark` | laser crossfire white; laser crossfire white @pillars_top | f089–f094 | FACT blackout, red-orange crystals + green uplight cones, white laser bouncing piano → crystals, pianist at ~928 · ASSUMPTION one segment per hit |
| 933.80–943.40 | IMPACT: the dragon wakes | drop · 0.75 · `domitor_dragon` | — | f095 | FACT dragon green + red, gold foreleg with green edge, teal booth · ASSUMPTION strobe/roar hit |
| 943.40–988.20 | venom green & red | drop · 0.6 · `domitor_dragon` | — | f096–f099 | FACT open red mouth, green scales/crest, red/green windows, green-edged spires, orange rosettes, white beams in green haze · UNKNOWN tempo (150 BPM ASSUMPTION) |
| 988.20–1004.20 | the dragon breathes (dimmed) | drop · 0.55 · `domitor_dragon` | — | f100–f101 | FACT look dimmed to ~50 % at 988, dragon close-ups |
| 1004.20–1006.70 | pre-drop, blue laser fans | build · 0.35 · `domitor_dark` | laser fan #40A0FF @deck_front; laser fan #40A0FF @fireworks_sides | f102 | FACT near blackout + 4 cyan-blue horizontal fans at deck level aimed sideways (lasers or beams UNKNOWN) |
| 1006.70–1025.10 | CLIMAX 1 | drop · 0.82 · `domitor_dragon` | — | f103 | FACT full green + orange-amber look, horned crest, open red/pink mouth, gold claw, green gothic windows |
| 1025.10–1026.90 | fill | build · 0.5 · `domitor_dragon` | — | — | INFERENCE 1-bar fill · ASSUMPTION blackout + strobe |
| 1026.90–1046.10 | CLIMAX 2: the twin torches | climax · 0.88 · `domitor_violet` | flame tower_torches | f104–f105 | FACT twin 15 m flame torches flanking the head (f104), magenta dragon, purple pillars, blue/violet wings with pink-orange dashes (1037) · ASSUMPTION kick flames |
| 1046.10–1049.30 | blackout accent | anticlimax · 0.4 · `domitor_blue` | — | f106 | FACT blackout with a faint teal outline (1047) |
| 1049.30–1065.30 | tamed: deep blue & glitter | climax · 0.8 · `domitor_blue` | flame tower_torches | f107 | FACT stage deep blue with white/cyan glitter pixels, near pillars green cones, mid pillars purple crystals |
| 1065.30–1074.90 | magenta & ice | climax · 0.8 · `domitor_violet` | comet 6 white 40 m | f108 | FACT magenta/pink-violet + orange, ice-blue crystals, orange shafts, grey dots rising (shells? UNKNOWN) |
| 1074.90–1090.90 | the comet barrage | climax · 0.88 · `domitor_violet` | flame tower_torches; comet 12 #FFF0D8 40 m; comet 10 #FF6030 45 m; cake 9 shots #FFF0D8 40 m; cake 18 shots #FFF0D8 42 m; cake 8 shots #FF6030 45 m; cake 16 shots #FFF0D8 | f109 | FACT ~12 white-gold comets from the front + arms fanning outward + ~10 orange-red comets in two crossing fans, central smoke plume, cyan balustrade lamps |
| 1090.90–1098.00 | fade to blue | outro · 0.3 · `embers_ice` | — | f110 | FACT blue near-blackout, dragon dim blue with white/cyan pixels |

#### D-Block & S-te-Fan – Embers

| Time (s) | Section | kind · energy · palette | Key cues (pyro / fireworks / lasers) | Frames | Classification |
|---|---|---|---|---|---|
| 1098.00–1110.40 | monochrome blue | intro · 0.2 · `embers_ice` | — | f111 | FACT monochrome blue, white/ice rib LEDs, teal star rosettes, teal crystals |
| 1110.40–1131.40 | rising intro, the cyan X | build · 0.4 · `embers_ice` | laser sheet #84A2FE; laser crossfire #3CD7FE @dragon_head; laser fan #3CD7FE @deck_front | f112–f114 | FACT light-blue sheet at deck height (1106), crystal close-up with the moon, two cyan beams crossing in an X above the dragon + cyan fans (1126) |
| 1131.40–1155.40 | LIQUID SKY | drop · 0.6 · `embers_ice` | laser sheet #2040FF; laser sheet #2040FF @fireworks_sides | f115–f116 | FACT blue/cyan scanned sheets 1.5–3 m over low haze across the field, lines to X ±110, warm-white stage outline, magenta glint · INFERENCE fills every 4 bars |
| 1155.40–1182.40 | kick & lead, the fountain row | drop · 0.72 · `embers_ice` | laser sky #AED3F2 @wing_right; laser sheet #2040FF; gerb deck_front+side_front; comet 17 white 30 m | f117–f119 | FACT upward cyan-white fan from the right side (1156), blue sheet at deck height (1165), gold spire outlines, 18–20 white-gold fountains + a row of ~17 comet heads (1175) |
| 1182.40–1188.40 | pre-drop gap | silence · 0.3 · `embers_ice` | salvo crackle 16 #FF60C0 70 m ×x/bar | — | INFERENCE gap (audio minimum 1185.1) · ASSUMPTION blackout + strobe |
| 1188.40–1194.40 | DROP 1: the pink crackle band | drop · 0.92 · `embers_pink` | laser cone cyan @deck_front; gerb arm_posts; jet deck_front ×x---x---x---x-x-/beat | f120 | FACT field flooded pink by pyro, tall pink-white sprays along both arms, continuous pink/white crackle band 60–80 m, pink smoke in the aisle |
| 1194.40–1227.40 | DROP 1: cold blue | drop · 0.88 · `embers_ice` | laser fan #D0F0FF @deck_front+right; jet deck_front ×x-------x---x---/beat; laser fan cyan @deck_front; jet deck_front ×x---x-x-/beat | f121–f123 | FACT cold blue with cyan-white hot-spots, cyan-white flat fan from the right half (1195), near-total blackout accents 1212–1217 |
| 1227.40–1255.50 | ICE-WHITE BEAM STORM | breakdown · 0.55 · `embers_storm` | — | f124–f126 | FACT cold white-blue beams in all directions from two low deck hot-spots (1225), deep blue with white pixel points (1235), massive 150° cool-white fan right of centre (1245), aqua crystals |
| 1255.50–1273.50 | DROP 2: the blue laser lattice | drop · 0.8 · `embers_ice` | laser grid #1A2BFF @deck_front; jet deck_front ×x---x---x---xxxx/beat; laser crossfire #1A2BFF @roof; laser sheet #1A2BFF; jet deck_front ×x---x-x-/beat | f127–f128 | FACT full-frame deep-blue laser lattice, 3–4 groups of blue multi-beam fans crossing in X/diamonds, dim blue pause (1265) |
| 1273.50–1287.00 | DROP 2: magenta | drop · 0.85 · `embers_magenta` | laser fan #FF40C0 @roof; jet deck_front ×x---x---x---x-x-/beat; salvo crackle 12 #FF40C0 50 m; salvo crackle 12 white 55 m | f129 | FACT magenta/violet stage, cyan-green crystals, magenta-lit smoke column centre-right, pink/magenta + white crackle 1.5–2x stage height |
| 1287.00–1305.00 | FINAL CLIMAX: pink canopy over a cyan stage | climax · 0.95 · `embers_climax` | gerb arm_posts; jet deck_front ×x---x---x---x-x-/beat; comet 9 #FFC0E0 36 m; salvo crackle 12 #FF60C0 45 m; salvo crackle 18 #FF2A50 78 m; salvo kamuro 12 #FFB0C0 86 m; salvo crackle 14 #FF2A50 60 m; salvo crackle 14 #FF60C0 72 m | f130–f131 | FACT 9 white-pink comet jets from the roof/front bursting into a crackle canopy, ~6 white fountains per arm, HUGE red/pink crackle-glitter canopy ~90 m (1293.4), cyan/teal stage |
| 1305.00–1312.00 | the last ember | anticlimax · 0.35 · `embers_ember` | — | f132 | FACT darkness, only the dragon + inner wings lit red (ember state), a few white points |
| 1312.00–1320.40 | gold lines appear | outro · 0.3 · `cold_gold` | laser chevron #FFC000 | f133 | FACT warm white/yellow hatched beam lines start over the field (drone) |

#### Atmozfears & Jesse Jax – In The Cold

| Time (s) | Section | kind · energy · palette | Key cues (pyro / fireworks / lasers) | Frames | Classification |
|---|---|---|---|---|---|
| 1320.40–1345.50 | the golden chevron | intro · 0.3 · `cold_gold` | laser chevron #FFC000 | f133–f135 | FACT ~10 warm-gold deck sources (gap at centre) fanning down-forward, converging on the axis ≈ Z 70, a chevron seen from the drone; stage dark; golden low fog |
| 1345.50–1357.89 | the chevron scans | intro · 0.35 · `cold_gold` | laser chevron #FFC000 | f136–f137 | FACT the same converging fans, more spread (scanning), fading by 1354 |
| 1357.89–1371.83 | golden tunnel between the pillars | build · 0.4 · `cold_gold` | laser tunnel #FFC000 @deck_front; laser chevron #FFC000 | f138 | FACT golden haze tunnel at head height between the pillars (field cam), crystals turn red ~1354 |
| 1371.83–1384.21 | violet haze, red wings | intro · 0.3 · `cold_violet` | laser sheet blue @deck_front+left | f139–f140 | FACT violet haze, violet fixture right, upper structure lit (red-orange dragon, red/pink wing pixel lines), violet deck light row, flame-like crystals, blue laser line left (1374) |
| 1384.21–1402.79 | atmospheric intro | intro · 0.25 · `cold_violet` | — | f140–f141 | FACT red/pink → orange wing lines, magenta aerial footprint (1393) · UNCLEAR orange blob at the left arm (not modelled) |
| 1402.79–1408.99 | build: green mines | build · 0.45 · `cold_red` | comet 6 #FFC0E0 20 m; mine green 12 m ×x/bar | f142 | FACT ~6 small green-white bursts just above the roofline + thin pink/white comet trails (on the grid at 1402.8) |
| 1408.99–1412.08 | silence | silence · 0.2 · `cold_red` | — | — | INFERENCE silence ~1410.5–1412 · ASSUMPTION blackout + roll |
| 1412.08–1436.86 | DROP 1: the silver gerb wall | drop · 0.85 · `cold_drop` | flame deck_front; comet 8 #FFA21A 35 m; comet 8 #FFA21A 38 m; gerb deck_front+side_front+arm_posts+arm_ends; cake 16 shots white; comet 8 white 25 m; comet 10 gold 40 m; comet 10 gold 42 m | f143–f145 | FACT magenta/pink + orange key light, pink LED dot rows, WHITE/SILVER GERB WALL across front + sides + arms (1422.9), white fans at the arm ends, gold comet streaks |
| 1436.86–1452.34 | drop 1 tail | drop · 0.75 · `cold_drop` | — | f146 | UNKNOWN (aerial shows the stage dark: camera cut or blackout accent) · ASSUMPTION dimmed kick look |
| 1452.34–1461.63 | the magenta laser sheet | build · 0.4 · `cold_violet` | laser sheet #FF20C8; laser sheet #FF20C8 @fireworks_sides | f147 | FACT red/orange wings & dragon, blue-violet rosettes, orange crystals, flat magenta laser sheet at deck height + a fainter second sheet above |
| 1461.63–1474.02 | percussive breakdown, the violet tunnel | breakdown · 0.3 · `cold_violet` | laser tunnel #6040FF @deck_front | f148 | FACT stage flooded magenta + blue-violet, red crystals, blue-violet laser tunnel from the deck down the aisle, skimming the ground |
| 1474.02–1498.79 | the laser cage | breakdown · 0.4 · `cold_violet` | laser crossfire #E0D0FF @towers_top; laser sky #E0D0FF @dragon_head; laser grid #E0D0FF @deck_front | f149–f151 | FACT violet haze, pink sunburst rosettes, red/white window pairs, white/lavender laser cage in 3 groups + vertical bundle overhead + diagonal bundles |
| 1498.79–1511.18 | final build-up | build · 0.72 · `cold_red` | mine white 15 m ×x/2bar; shell crossette red 35 m | f152 | FACT intense red/pink structure, white/silver + red low bursts just above the dragon (roof mines / crossettes), red streaks up-right · ASSUMPTION build flames |
| 1511.18–1523.57 | GRAND FINALE | climax · 1 · `finale` | firewall wing_left+wing_right; flame deck_front+side_front+arm_posts; flame tower_torches; gerb deck_front+side_front+arm_posts; gerb roof; gerb pillars_top; finale 68 m; shell chrysanthemum #FFF2DC 85 m; flame deck_front+side_front+arm_posts ×x---/beat | f153 | FACT field glows orange-red, gold gerb/fountain wall along the whole U, gold/orange crackle + brocade band 50–90 m across ±100 m, 2 white-gold chrysanthemums at X ±45 · INFERENCE flame chase per bar |
| 1523.57–1529.76 | finale afterglow | climax · 0.85 · `finale` | salvo willow 10 gold 80 m; salvo kamuro 6 #FFE8C0 85 m | f154 | FACT heavy residual smoke, fading white-gold falling stars · ASSUMPTION flame chase continues |
| 1529.76–1535.95 | blackout (the music plays on) | anticlimax · 0.5 · `blackout` | — | f155 | FACT black frame · ASSUMPTION blackout at 1529.8 (bar 12) with 4 strobe hits on the last beats |
| 1535.95–1551.00 | blue cold fire | breakdown · 0.4 · `outro_blue` | shell kamuro gold 80 m; flame tower_torches+speaker_hangs ×x/2bar; jet tower_torches+speaker_hangs ×x/2bar | f156–f157 | FACT white-pink core, cyan arm lights, blue/cyan-lit plumes in 2 groups of 3–4 columns flanking the core (1541), fading gold glitter · INFERENCE blue-lit CO2 (+ blue flame read) |
| 1551.00–1557.00 | the final swell | build · 0.6 · `outro_blue` | flame tower_torches+speaker_hangs; jet tower_torches+speaker_hangs | f157 | INFERENCE swell peak 1554.8 · ASSUMPTION last cold-fire blast |
| 1557.00–1561.00 | last light | outro · 0.3 · `outro_blue` | — | f157–f158 | FACT fade toward the total blackout at ~1561 |
| 1561.00–1577.60 | black | outro · 0.2 · `blackout` | — | f158–f159 | FACT total blackout (#000004), crystals off · INFERENCE closing hits 1563.6 / 1569–1571 / 1576 heard in the dark |
| 1577.60–1581.00 | Silence | silence · 0 · `blackout` | — | — | FACT silence |

## 6. Chapter notes (what the storyboard shows, what was interpolated)

**Winter (0–126.4).** FACT: blackout silhouette (f000), blue crystals + lamp row (f001), the reveal (f002, blue
castle, orange dragon, amber shafts), the drone rise with the moon (f003–f005), red Bengal sources at the
front-line corners + red field (f006), 7 gerbs on rows-1/2 capitals + deck (f007), gerb clusters in red smoke
(f008), V-fans in lilac smoke (f009), two orange fireballs (f010), the lone wing outline (f011) and the dark
far-aisle shot (f012). INFERENCE: hit mapping 47.4 = wing-finial flames, 55.3 = Bengals, 63.2 = centre-out
flame chase (show-analysis 1.4). ASSUMPTION: one deck flame hit on the 75.5 climax downbeat (the round-1 flame
accents at 81.0/84.9/92.9/95.5 are gone: f008/f009 show gerbs and V-fans only), the 76.2 gerbs burning 10 s and
the 88.9 V-fans 8 s with a second comet V-fan at 91.9 (f008 ≈ 84, f009 ≈ 94), a fireball echo one bar after the
100.1 hit (102.07), a pale sky beam from the dragon's skull fixtures in the 110–118 hush, strobe hits on
114.4/120.3. No lasers and no beam fans (FACT: none in any Winter frame; the reveal is lit by the blue wash and
low up-lights).

**Discorecord (126.4–273).** FACT: cyan crystals (f013), the white laser web over the empty field (f014), red
shafts in the gap (f016), the green sheet (f017), crown stripes → magenta → dim red (f018–f020), the S5
green/cyan/blue fans skimming the field (f021), gold V-fan from the crest (f022), silver glitter fan (f023),
cool-white fans before the drop (f024), comet V-fans + white comet row (f025), fountain walls in green smoke
(f026), green dashes on the field (f027). INFERENCE: web emitters on the plinth corners + deck; kick strobes on
the deck lip in the heavy-kick part. ASSUMPTION: no flames in this chapter (none visible; "white pyro" is the
colour key) — kick energy comes from light hits cycling white/cyan/green, a cyan stage pulse, sparkulars on the
two fills (254.16, 266.39) and a kick strobe run in the last 4 bars; the V-fans are re-fired at bar 4 and the
white comet row at bar 6 so both f025 readings see them.

**Sacred Oath (273–566).** FACT: violet intro + magenta haze (f028), purple wash, warm crystals, lavender
zig-zag (f029–f030), magenta zig-zag (f032), comet columns across the full width + striped wings (f033–f034),
E-Life on the deck with the cyan-white backlight curtain (f035–f041), blue sunburst lasers (f038), red comet row
(f039), the 150° red comet fan (f042), gold comet line + red crossettes (f043), serpent comet row (f045), hero-cam
quiet section with low fog and CO2 (f047–f048), drop 2 violet → blue with a red-orange dragon (f051–f053), the red
crackle canopy (f054–f055, official photo P at 22:41:39) and the gold brocade line (f056). INFERENCE: the 3 s
silence 409.3–412.3 is a total blackout (the "DEF-QON!" chant moment). The anthem fan is 20 red comets (a few
white) launched from the front and roof comet rows with a 150° spread, so the arc spans the stage width, re-fired
2 bars later; the red canopy is 14-shell red/white crackle salvos 240 m wide on every bar 536.2–548.6 with breaks
staggered 48–84 m, the roof gerbs at half intensity, lasers off under the canopy and the arm-end laser fans
low (tilt 2°) only after it has fallen (548.6). ASSUMPTION: one
deck flame hit on each drop downbeat plus ≤ 6 m accents every 4 bars in anthem drop 1 and the final kick (QA
round 1 removed the every-beat chases: f042–f044 and f054–f056 show no flame row, and Oath drop 2 is an LED look
with no fire at all), white CO2 on drop downbeats, strobe rolls before each drop.

**L.P.A. (566–622) and the bridge (622–638.6).** FACT: pink/red plate outlines, the LED eye, bulb strings,
pink mouth haze (f057–f058), red/orange ↔ cyan/blue wing chases (f059), white flash mines + gerb walls + gold
fountains, stage fixtures off (f060), pink core + cyan crystals (f061), the full blackout at 612 (f062), red glints
and white streaks in the dark (f063–f064). The crowd plays "losse polsjes" (`pols`) in the whole chapter.
ASSUMPTION: the second flash-mine hit at 601.02 (the second half of the drop), sparkulars on the kick, the red
flare glow at 631.75 (UNKNOWN source).

**Sacred Flame (638.6–886).** FACT: the portal (f065), the fire-ritual troupe, lanterns, aerialist (f066–f071,
f074), the dragon front-on in red (f068), the BURNING WINGS (f072), residual smoke (f073), magenta pillars, a
white fountain column and silver glitter tails (f075), silver glitter streams from the hang lines (f077), the
glitter comet barrage + row-2 capital gerbs (f078), the full-sky glitter curtain (f079), lavender beam fans
(f080), the near-blackout accent with cool-white crystals (f081), red/white comet columns (f082), CO2 beside the
wings + striped ribs (f083), red strobe stars (f084), crackle + orange comet (f085), orange X-fans (f086), THE
FLAME RING (f087) and the red wings with dashes (f088). INFERENCE: flame ring on the 859.25 downbeat on the whole
U (deck + side sections + both arms, ≈ 60 heads, 8 m), re-fired on 4 downbeats (one continuous 6 s ring) then a
centre-out chase along the U every bar to 877.25; capitals burn as torches for the whole 18 s; the stage
fixtures are dark and the sky tint is only 0.06 so the fire lights the scene. Re-phased in QA round 1 so the
storyboard frames see their effects: the silver comet barrage is a volley per bar 769.25–775.25 (f078 ≈ 775.7),
the glitter curtain gets a third (glitter) layer at 779.75 and the stage stays dark red under it until 787.25
(f079 ≈ 785.6), the white-lavender fans open at 787.25 and run through the silence into the drop (f080), the
near-blackout accent lasts to 806.75 before the red returns (f081 ≈ 805.3, analysis 806), a third comet-column
volley at 809.75 (f082), and the X-fans fire from the arm ends on every bar 847.25–851.75 (f086). ASSUMPTION:
tom-synced red light pulses in the ritual (the toms carry the groove; no hardstyle kick), wing-flame bursts on
every bar 709.25–716.75, one deck flame hit per drop downbeat and ≤ 6 m accents every 4 bars in drop 1 and the
climax (the every-beat chases are gone: f081–f086 show dim red haze, comets and crackle, and from the crowd they
were a wall that hid the dragon), one centre-out chase per bar 853.25–859.25 (5 → 8 m) into the ring, the wings
burning again at 874.25 as a bookend.

**Domitor Draconis (886–1098).** FACT: blackout, red-orange crystals, green uplight cones, the white laser
bounced from the piano over the crystals (f089–f093), the pianist (f094), the dragon waking green + red
(f095–f101), cyan-blue deck fans in the dip (f102), the green/orange climax-1 reference image (f103), the twin
15 m torches (f104), blue/violet wings (f105), the teal-outline blackout (f106), deep blue with glitter pixels
(f107), magenta + ice-blue crystals (f108), the crossing comet fans (f109), the blue fade (f110). INFERENCE: one
bounce segment per piano hit (1, 2, 3, 4 = the symmetric V of f093, then the chain continues down the aisle) and
white pillar-to-pillar crossing beams on the last hit. ASSUMPTION: tempo 150 BPM (UNKNOWN; unreleased track),
no pyro in climax 1 (the dragon's LED reveal is the event; fire is held back for the torches), torches
re-fired every 2–4 bars in climax 2. Because the tempo is UNKNOWN, nothing pyro-related is beat-quantised in
this chapter any more (the every-beat deck chases 1033–1090.8 were removed in QA round 1). The comet barrage
(f109) is sustained: the 1074.9 volleys on the downbeat, then 9 s of cakes 1077.1–1086.1 — white-gold fans from
the front comet row and the arm ends, orange-red crossing fans from the roof (neighbouring cakes sweep in
opposite directions).

**Embers (1098–1320.4).** FACT: monochrome blue + teal star rosettes (f111), the light-blue deck sheet (f112),
the crystal with the moon (f113), the cyan X above the dragon (f114), the LIQUID SKY (f115–f116), the upward
cyan fan (f117), the deck sheet + gold spire outline (f118), the fountain row + comet heads (f119), the pink
crackle band (f120), cold blue with a flat cyan fan (f121), the dark accents (f123), the ICE-WHITE BEAM STORM
(f124–f126), the blue laser lattice (f127), the magenta stage + crackle (f129), the 9-jet pink canopy and the huge
red/pink canopy (f130–f131), the ember (f132), the first gold lines (f133). ASSUMPTION: no flames in the chapter
(its irony — the fire has died down to embers); kick energy from cold CO2 plumes (`jet`, ice-blue), strobe and
light hits; blackout accents 1212.4–1216.9 carry strobe hits on the dips. QA round 1: the cyan X holds to 1133.5
(f114), the fountain row is ~22 fountains on deck + side sections (alternate heads) burning 1173.4–1182.4 with a
second comet row at 1177.9 (f119 ≈ 1180), the drop-1 crackle band launches one bar early (1186.9) so its breaks
land on the 1188.4 drop and repeats on every bar (16 shells, 250 m wide, 56–76 m) under dimmed cyan cone
lasers, and the S20 canopy is built from four overlapping salvos (pink 45 m at 1288.5, red/pink 78 m + 60 m at
1293/1294.5, kamuro 86 m, crackle 72 m at 1297.5) 200–260 m wide.

**In The Cold (1318–1581).** FACT: the gold chevron converging on the axis (f133–f137), the golden haze tunnel
(f138), violet haze with red wings (f139–f140), the magenta footprint (f141), the green mines (f142), the drone
through gold comets (f143, f145), the silver gerb wall (f144), the magenta laser sheet (f147), the violet tunnel
(f148), the white/lavender laser cage (f149–f151), low white/red bursts (f152), the finale gerb wall + gold
crackle band (f153), smoke (f154), black (f155), blue cold-fire plumes (f156–f157) and the final black
(f158–f159). INFERENCE: blackout 1529.8–1536 with the music still playing (only 4 strobe hits on the last beats);
the blue plumes are blue-lit CO2 (Flamaniac fluids have no blue) — rendered as CO2 jets on the tower tops **and**
blue `flame` plumes so the image reads as "blue fire" either way — since QA round 1 both fire from 2 groups of 3
points flanking the core (`tower_torches` + `speaker_hangs`: X ±11, ±14, ±31) every 2 bars up to the last
blast at 1554.8. The silver wall (1422.9) and the finale gerb wall (1511.18) stand on the whole U (every second
head of deck + side sections + arms, + the arm ends for the silver wall). ASSUMPTION: one deck flame hit on the
1412.08 drop (no every-beat chase: f143–f145 show comets and the silver wall), the finale flame chase along the U
once per bar and ending with the gerbs at 1523.5 (f154 ≈ 1526 already shows violet smoke and falling stars; the
afterglow 1523.6–1529.8 is smoke, a dim violet wash and a kamuro/willow layer), 15 m torches every 2 bars in the
finale, the wings burning once more at 1511.18, stars brightening in the final black.

## 7. Signature moments → cues

| # | t | Moment | Cue(s) |
|---|---|---|---|
| S1 | 0–19.5 | silhouettes → reveal | `lights.look dark` → `still` fade 5.5; `stage.state dormant → awake` fade 5.5 |
| S2 | 27.5–56.5 | drone rise over the pillar aisle, moon right | camera drone pull-back (5,45,215) → (10,70,262) |
| S3 | 55.3 | red Bengal flares, red field | `pyro.burst` type bengal 15 s (`p.at: flare_pots`), red `fog.burst`, red wash |
| S4 | 69.5–95.5 | gerbs on the lanterns, V-fans | `pyro.gerb pillars_top rows 1–2` + centre; roof/wing gerbs 10 s (to f008 ≈ 84); wing V-fans 8 s + deck comet V-fans at 88.9 and 91.9 |
| S5 | 206.77–219 | lasers skim the empty field | `lasers.look wave/fan/sky` green-cyan-blue + field low fog |
| S6 | 243.46 | Discorecord drop | white comet row (`roof`) + comet V-fans (`fireworks_sides`) + gerb V-fans along both arms (`arm_posts`, 8.3 s), fountain cakes at bar 8 |
| S7 | 341.12–403 | E-Life on the empty stage | deck cams, cyan-white `audience` backlight curtain from 353.5 |
| S8 | 409.25–415.44 | silence → anthem drop | total blackout (stage `master` 0), 8→16 Hz strobe roll, 20 red comets in a 150° fan from the front + roof comet rows (re-fired 418.54) |
| S9 | 536.21–557.9 | the red canopy + gold brocade line | red/white crackle salvos every bar (14 shells, 240 m wide, breaks 48–84 m) + red crackle cake; roof gerbs at 50 %, beams low, lasers off until 548.6; brocade line at 554.8 |
| S10 | 612.3–638.6 | full blackout | everything off incl. crystals |
| S11 | 649.25–709.25 | fire ritual | deck cams, lantern-warm floor light, tom pulses, flickering amber crystals |
| S12 | 709.25 | burning wings | `pyro.firewall wing_left+wing_right` 3 s + bursts on every bar to 718; lit by the fire (sky 0.07, wash 0.55, no beams) |
| S13 | 776.75–779.75 | glitter sky | willow + strobe + glitter salvos 200–230 m wide at 72–84 m (still falling at f079 ≈ 785.6) |
| S14 | 859.25 | the flame ring | `flame deck_front+side_front+arm_posts` (the whole U) ×4 bars, then a centre-out chase along the U per bar + capital torches + 15 m pair; fixtures dark |
| S15 | 887.2–933.8 | the piano laser | `lasers.look crossfire origin field` with `segments` 1→8, pillar cross-beams |
| S16 | 933.8 / 1026.9 | the dragon wakes / twin torches | `stage.state rage` green/red + `roar`; 15 m torches (`tower_torches`) |
| S17 | 1074.9–1086.1 | crossing comet fans | white-gold front fans + orange crossing fans on the downbeat, then 9 s of cakes (front comets, arm ends, roof) |
| S18 | 1125.4–1155.4 | cyan X, the laser sea | `crossfire @dragon_head`; `sheet` 2.2 m + field low fog 0.9 |
| S19 | 1227.4 | ice-white beam storm | `lights.look ballyhoo` ice white, then the 150° floor fan |
| S20 | 1287–1297 | pink canopies over a cyan stage | 9 crackle comets + a 45 m pink crackle layer, then 18 + 14-shell red/pink crackle, kamuro and crackle salvos 200–260 m wide at 60–86 m |
| S21 | 1305 | the last ember | `stage.state ember`, everything else dark |
| S22 | 1320.4–1371.8 | the golden chevron / tunnel | `lasers.look chevron` (distance 70) → `tunnel` at head height |
| S23 | 1474–1498.8 | the laser cage | `crossfire @towers_top` + `sky @dragon_head` + `grid @deck_front`, lavender |
| S24 | 1511.18–1523.5 | grand finale | flames + gerb wall on the whole U (12.35 s), U flame chase per bar, `fireworks.finale` 18/s + 2 chrysanthemums ×2; no beams; ends at 1523.5 → smoke + falling stars |
| S25 | 1540.6–1554.8 | blue cold fire, then black | blue flame plumes + CO2 in 2 groups of 3 (X ±11…±31) every 2 bars, last blast 1554.8, black (stage `master` 0) at 1561 |

## 8. Show camera (`camera.shot`, 218 shots, 100 % authored)

The shot language copies the families of show-analysis §0.1, in world metres (vertical fov):
A far-aisle locked-off, looking at (0, 8, 0), fov 33; B hero field cam, pitch ≈ +9°, fov 42 (moon at right);
C telephoto front elevation from Z 70–170, fov 10–30; D the drone pull-back of f003–f005 (5, 45, 215) → (10, 70, 262);
E aisle / field cams; G dragon telephoto aimed at the head (−2.5, 14.5, −12); H high drone behind the field
(Y 70–120, Z 190–280); I very high aerial from over the lake (Y 120–200, Z 300–470); J drone fly-through just above
the dragon/wings (moving); K the crystal L1 with the moon behind it (f113); plus low pit shots of the dragon (LOW),
bank side angles (SIDE) and deck handhelds (DECK). Every storyboard frame's shot family is reproduced at its
(lag-corrected) time; cuts sit on bars (2–4 bars in drops, 4–8 in breakdowns, single long moves in the intros).

**Sight lines (checked by `validate-show` against the world build).** The research positions A (0, 3, 175) and B
(0, 1.8, 172) stand behind / under the bible's own photo terrace (Z 166–172, deck Y 5), and the world module
builds a FOH/press tower on the axis at X ±8, Z 150–160 (roof 9.6 m), the lantern pillars at X ±20,
Z 36 / 69 / 102 / 135 (12.8 m, 5 m plinths; `src/world/site.ts`, the bible layout), the camera pen at Z 87–93
(12.8 m wide, 1.2 m barriers) and the piano riser at Z 57–61. Every far camera therefore stands on the tower's
front, Z ≤ 147: A at (±6, 8.5, 146) with the row-4 pillar pair at the frame edges, B at (−10…−12, 3–6.8, 146–147)
(the official photographer's height, pitch ≈ +9°), far C/E cams at Z 147, the official-photo shot of the red
canopy at (0, 11, 147) just above the tower's front; aisle cams stand in front of the camera pen (Z ≤ 85) and the
telephoto front elevations at (0, 7, 112) between pillar rows 2 and 3. C cameras are ≥ 6.5 m high (camera risers —
above Tribe-mode flags, which are up to 4.5 m) and E cams 2.4 m. The validator reads those structures from
`site.ts` and tests the start, middle and end pose of every shot: the pose may not stand inside one, the centre
sight line may not be blocked, and they may cover ≤ 17 % of the frame (16×9 ray grid; only pillars framing the
picture at its edges remain). The pianist close-up (926.7) looks *at* the riser on purpose. On-deck cameras stand
1.2 m above the deck-front fixture row, so every static `still` look of the `floor` group carries an up-tilt
(38°, or 62° as near-vertical up-lights where the reference shows no beams) instead of the rig's default 4°,
which points them into the front rows and into the lens. The auto director only takes over if a shot is removed.

## 9. Open points and hand-offs

* **Tempo UNKNOWN** for Domitor Draconis and low-confidence for Embers: when the audio analyser refines the kick
  segments (±1.5 BPM search) the grid-repeated cues follow; if the real Domitor tempo is outside 148.5–151.5 the
  analyser keeps the authored grid.
* The Bengal / corner-fireball / torch / arm / hang-line positions are real stage anchors since the crowd merge
  (§4). Still missing: a `roof_plumes` group on the castle terrace roofline (X ±12…±30, 2 × 3–4 heads) for the
  blue cold-fire plumes of f156/f157 — until then they fire from `tower_torches` + `speaker_hangs` (X ±11, ±14,
  ±31, Y 9.5–16.5); and `fireworks.salvo` ignores `p.x`/`p.z` (only `shell` honours them), so the two canopy
  lobes of photo P are one 240 m band centred on the mortar line.
* Ground-level laser looks (web, sheets, liquid sky, chevron, tunnels) are authored at the heights of the video
  (1–3 m over the empty field). In Tribe mode the laser module clamps audience-level sheets to ≥ 4.5 m above
  the head plane (bible §7.4) — the cues need no change.
* Preview (2026-09-25): the file was run against the in-progress stage, crown, lighting, lasers, pyro,
  fireworks, fog, world and crowd modules in a throw-away integration copy (not committed). That review led
  to: restrained lasers in the Discorecord drop (the comet fans must read), the L.P.A. gerbs moved to the deck
  halves, capital torches as re-fired flames (a `firewall` on `pillars_top` draws a line between the pillars),
  a second 150° comet fan in the anthem drop, a beam-only ice-white storm, restrained cyan lasers under the
  Embers crackle band, up-tilted floor fixtures, and the sight-line rules of §8 (far cameras in front of the
  FOH tower, the lantern close-up re-aimed at the world build's L1).
* Field layout: the camera positions follow the world build (pillars X ±20 at Z 36/69/102/135, FOH tower
  Z 150–160, camera pen Z 87–93, piano riser Z 57–61). All effects address the pillars through anchors, so only
  the explicit camera coordinates depend on it, and `validate-show` re-reads `src/world/site.ts` on every run: if
  the layout moves again, its camera warnings name the shots to re-aim (QA round 1 moved 13 shots: aisle cams in
  front of the pen, far cams off the row-4 pillar, the telephotos between rows 2 and 3, and the K shot onto L1).
* Moments carry optional viewing hints: `lead` (s of pre-roll) and `spot` (a `src/player/spots.ts` id). The UI
  should seek to `t − lead` and play, and offer "watch from <spot>" — jumping exactly onto a cue lands paused on
  the frame before the effect (QA round 1: "Sacred Flame — burning wings" showed a dark stage).
* The piano bounce, the chevron, row-selected pillar effects and the richer crowd states are implemented by the
  respective modules in their worktrees (checked 2026-09-25) and degrade gracefully elsewhere.
* Crowd: the crowd module also carries a built-in, research-derived behaviour timeline; the show file's
  `crowd.mood` cues override it section by section.

## 10. Validation

`node scripts/validate-show.mjs` (add `--dump[=sys,…] --from=s --to=s` for a text timeline, `--json` for
machine output). It reads the vocabulary from `docs/show-format.md`, the anchor names from
`src/core/Anchors.ts`, the named colours from `src/show/colors.ts` and the type unions from
`src/show/ShowTypes.ts`, replays the engine's repeat expansion exactly, and checks: schema; tempo and sections
contiguous over 0–1581; kinds, energies, palettes; every sys/fx in the vocabulary; every target a contract
anchor or filter; colours; enumerated values (with the documented extension list); repeat sanity; camera
shots; explicit looks per section; silence gaps free of pyro; grid alignment of kick repeats; the cue budget
(1500–4000 expanded). It prints per-system counts, a per-minute density histogram and the extensions in use.
Since QA round 1 it also warns about (1) **storyboard liveness** — each of the 49 curated frames that show pyro
or aerial fireworks needs a cue of that system at full strength over `9.881·N + 3 … + 5 s`; (2) **blackouts**
— every blackout/darkness/black or `silence` section needs a dark look, wash ≤ 0.05, pixels off and stage
`master` ≤ 0.1; (3) **camera sight lines** against the world build in `src/world/site.ts` (inside a structure,
blocked centre line, > 17 % of the frame covered); and it validates the moments' `lead`/`spot` hints. The show
file is expected to pass with **0 warnings**.

The file was authored with a small generator (bar arithmetic on the grids above, the section/look tables, the
kick programs and the shot list) kept out of the repo; the JSON is the source of truth — edit it directly and
re-run the validator.
