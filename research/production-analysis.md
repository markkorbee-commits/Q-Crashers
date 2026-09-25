# Production analysis: Defqon.1 RED MainStage and Endshows (2018-2026)

Scope: the lighting, laser, flame, pyro, firework, haze and colour production of the Defqon.1 RED
mainstage and its Endshows, and how to rebuild it in real time. The target is
"The Endshow | Defqon.1 2026" (https://youtu.be/fLWY-Sxb1bE, 1581 s, uploaded 2026-07-02).

Tags: **FACT** = stated by a cited source (source ids `[S#]`, listed at the end). **INFERENCE** = a
strong deduction from sources or the 2026 storyboard frames. **ASSUMPTION** = a reasoned fill-in
for the build. **UNKNOWN** = not established. "Frame fNNN @mm:ss" means the extracted YouTube
storyboard frame (320x180, one every ~9.88 s). Timings read from the storyboard are only accurate
to about ±5 s.

---

## 0. Executive summary (for the show programmer)

1. **Who makes it (FACT).** Creative: Q-dance, with Jonas Schmidt as head of creative [S10][S11].
   Lighting design: Robbert-Jan Vernooij (Happy Technology). Lasers: Jeroen Winnubst
   (Sync/LaserImage). Pyro, flames and SFX: Pyrofoor de Amsterdam, with Lucas Gerritzen as pyro
   designer. The whole show is **timecoded** and pre-visualised in Syncronorm Depence
   [S9][S15][S20][S31]. In 2024-2025 the RED stage used **about 2,400-2,500 lights**: 1,800 for the
   structure plus 600 show fixtures [S10], or "2500 lights" in 2024 [S14].
2. **The stage is lit as an object, not with video (FACT/INFERENCE).** A Q-dance production team
   said: "with a Q-DANCE stage it's important to ensure that the set is well lit as a structure
   itself as we don't use any video walls" [S19]. Linear pixel battens outline every edge (236 CLF
   LEDbar PRO in 2018) and IP65 LED floods wash the sculptures [S16][S17][S18]. The 2026 frames show
   the same method: pixel-outlined dragon, wings and castle, and no large LED screen (INFERENCE).
3. **The aerial fireworks are cake-based and low, not big shells (INFERENCE, strong).** The only
   published Defqon.1 fireworks permits (Pyrofoor, 2017 and 2019) list just three product types:
   **Bengal fire (15 m to the audience), fountains (15 m) and cakeboxes ≤ 1 inch (40 m, or 60 m
   fan-shape)** [S25][S26]. In the 2026 frames the bursts break roughly 50-100 m above the ground and
   are 15-35 m across. That matches 25-30 mm cakes fired from the 30-48 m high stage roof and pyro
   trusses. It does not match 100-250 m shells. **Recommendation: move the default aerial break
   height to 55-110 m** (the current `fireworks.shell` default is 80-260 m) and build the finale
   from dense comet fans, gerb walls and crackle canopies.
4. **Flames make the "fire curtain" (FACT + INFERENCE).** Pyrofoor's rental range runs from 3-8 m
   units (G-Flame, Stage Flame, Flamaniac, X2 Wave Flame) up to 15 m units (Power Flame, XL
   Liquid Flame) [S27][S37][S38]. The 2026 aerial frame f087 @14:19 shows a continuous chain of
   **about 40 flame heads along the deck front and both forward wing arms**, flames on all **10+
   aisle lantern pillars**, and two giant 15 m class flame torches on the central towers (f104
   @17:07).
5. **Lasers are everywhere and differ by song (INFERENCE).** No laser count has been published.
   The frames show stage fans, "liquid sky" sheets over the empty field, a white laser web at
   ground level, beams between pillar tops, X and triangle crosshatches above the roof, and warm
   gold sheets that trace a logo shape seen from the drone. Plan for **40-60 projectors**: stage,
   pillar tops and cranes or delay towers (ASSUMPTION).
6. **Colour follows the song, and contrast is the rule.** Jonas Schmidt: "Sometimes you do what
   people expect, and sometimes the exact opposite. We're constantly looking for contrast" (FACT
   [S10]). The measured 2026 colour timeline runs: blue with red flame hits (Vivaldi "Winter"),
   cyan and green lasers (Discorecord), magenta, violet and red (anthem), all red and orange (Sacred
   Flame), green and red dragon (Domitor Draconis), deep blue and ice (Embers), then warm gold
   lasers and a magenta and violet stage (In The Cold). The show closes on a red, orange and white
   finale, followed by blue "cold fire" and a blackout (§8).

---

## 1. Context of the 2026 recording

| Claim | Tag | Source |
|---|---|---|
| The festival was stopped after KNMI issued a code-red heat warning. About 50,000 campers were evacuated. | FACT | [S6] |
| Q-dance says "the complete production, including live acts, special effects and fireworks" was still performed on the empty grounds and recorded "last weekend". | FACT | [S6][S7][S8] |
| On Saturday evening (27 June 2026) a scaled-down, crew-only light and pyro moment took place; fans on Reddit saw fireworks, lasers and light tests at RED. | FACT (per EDMTunes) | [S4][S5] |
| The published video runs 1581 s with 8 chapters. The description says "with mixed feelings, but a proud orange heart". | FACT | [S45] |
| The video is edited from several camera passes (drone, crane, handheld close-ups of the MC, the fire dancers and JDX at a piano). Some close-up scenes were probably filmed separately from the wide pyro takes. | INFERENCE (edit grammar: wide pyro, then tight performer, then wide pyro) | frames |
| Sky: the show opens in blue-hour dusk. The sky is deep blue with a lighter horizon until about 01:50 (frames f000-f011), then black. On 27-28 June 2026 the sun set at 22:04 CEST, civil dusk ended at 22:55 and nautical dusk at 00:15. The moon was 96-99 % full and stood 4-9° high in the S-SSE. It is visible as a bright low dot in many frames (f022, f045, f113). | FACT (ephemeris computed with PyEphem) + INFERENCE (show start around 22:15-22:45) | computed |
| No audience: lasers could fire into the empty field at low height (the white web at f014 and the blue ground sheets at f116). With a crowd present these would be audience-scanning effects. | INFERENCE | frames |

---

## 2. Production team and suppliers (FACT unless marked)

| Discipline | Company / person | Years evidenced | Source |
|---|---|---|---|
| Creative direction | Q-dance: Jonas Schmidt (Head of Creative, 25+ years at Q-dance) | 2018-2025 | [S10][S20] |
| Show direction (historic) | Mark Rietveld, 2008-2019. He invented Power Hour and directed the Endshow and Closing Ceremony. | 2008-2019 | [S20][S24] |
| Lighting design / programming (RED) | Robbert-Jan Vernooij (Happy Technology; earlier Tenfeet), with Pascal Parent | 2018-2025 | [S9][S15][S18][S20] |
| Lighting design 2018 | Marcel Binnenmarsch (Virtue Projects), with Hans Bokkinga (Habo) on production | 2018 | [S17] |
| Laser design | Jeroen Winnubst ("Sync", rooted in LaserImage, Amersfoort NL) | 2018, 2022, 2024 | [S9][S20][S21] |
| Pyro design | Lucas Gerritzen, owner of Pyrofoor de Amsterdam (the "Pyro4" collective with Paul Philipsen and Jasper Borsboom) | 2017-2025 | [S9][S22][S24][S25][S26] |
| Pyro / flames / SFX contractor | Pyrofoor de Amsterdam: fireworks, flame throwers, smoke, confetti and streamer systems (2025, with JAGER Showtechniek crew) | 2017-2025 | [S25][S26][S32] |
| Firework manufacturing | A hand-making family business near Valencia (ES) | 2025 documentary | [S10][S11][S12] |
| (who in Valencia) | Probably **Ricasa** (Ricardo Caballer S.A., Valencia, a family firm since 1881). Lucas Gerritzen "maintains a strong alliance with Ricasa, the premier producer of effects in Pyrofoor's Pyro4 shows". | — | INFERENCE from [S22][S41] |
| Pre-vis / timecode | Syncronorm Depence. Every stage is timecode-based and pre-programmed; about 3 h of on-site programming. Niels Kieboom is the "Depence Master". | 2024 | [S9] |
| Timecode playout | N-Creations (Niels van de Wijngaart) | 2018 | [S20] |
| Show caller | Q-dance (Maartje Mulder) | 2018 | [S20] |
| Stage automation | CyberMotion: 58 CyberHoist II (500 kg) on 29 objects, all on timecode | 2024 | [S15] |
| Technical production | Backbone International | 2024-2025 | [S13][S14][S15] |
| Rigging / light / motion rental | Ampco Flashlight (BLACK stage, CyberMotion); Rent-All (CLF fixtures, 2018/2020) | 2018-2024 | [S15][S16][S18] |
| Fire performers | Lights in Motion (2019 "Dragonblood": Team Red and Team Blue, make-up by House of Cherries); Close-Act Theatre "Saurus" creatures | 2019 | [S33] |
| 2026 specifically | Suppliers for 2026 are **UNKNOWN**. Continuity with 2025 is highly likely: the same four-person creative core has worked together since 2018. | INFERENCE | — |

---

## 3. Scale of the RED stage (context for effect placement)

| Year | Width | Height | Lighting | Notes | Source |
|---|---|---|---|---|---|
| 2018 | — | — | 236 CLF LEDbar PRO, 102 CLF Ares LED washes, 136 CLF Aorun beams (CLF units only) | LEDbars "outline the shape of the stage" | [S16][S17] |
| 2020 (online "at Home") | 160 x 200 m flat 360° set | — | 96 LEDbar PRO on the logo; CLF Poseidon IP65 beams; CLF Ares and Yara floods | 3-min timecoded fireworks closing | [S18] |
| 2023 | "over 160 m" | 50-54 m | — | — | UNVERIFIED: this comes from search-engine summaries; the primary source was not retrieved |
| 2024 | 114.5 m | 34 m | **2,500 lights** | "over 220 crane movements"; themed set | [S14] |
| 2025 | **197 m** | **48 m** | "increased fixture count"; the 3voor12 doc gives **1,800 structure lights + 600 show lights** | **2 pyro trusses of 45 m each**; central 20 m circle | [S10][S13] |
| 2026 | **UNKNOWN**. The frames show a U-shaped footprint: a central castle and dragon, spread wings above, and two long wing arms angled forward toward the field. The field in front has an axial aisle of lantern pillars. | — | — | Its proportions resemble 2025 (INFERENCE). | frames f025, f087, f119 |

ASSUMPTION for the build: frontage about 180-200 m including the forward arms, top of the wings
about 45-50 m, deck height about 2-3 m. Pyro truss lines sit on the roof at about 35-48 m and run
along the arm tops.

---

## 4. Lighting

### 4.1 Evidence

* **FACT.** The RED stage uses about 1,800 structure lights plus about 600 show lights (2025) [S10],
  or 2,500 lights (2024) [S14]. In 2024 the fixture count across all stages was large enough that
  timecoded pre-programming was essential [S9].
* **FACT (historic fixture types on Q-dance RED stages).**
  * CLF LEDbar PRO: 1 m linear batten, 10 RGBW pixels, 24° beam, used to outline the stage (236 in 2018, 96 on the 2020 logo) [S16][S17][S18].
  * CLF Ares LED wash / flood and CLF Yara flood for the decoration, "high intensity and beautiful saturated colours" (102 Ares in 2018) [S17][S18].
  * CLF Aorun beam, "the fastest beams I know… solid and phat beam" (136 in 2018) [S16].
  * CLF Poseidon IP65 outdoor beam with a double prism (2020) [S18].
  * Defqon.1 Australia 2018 (a smaller sister show with the same operator) had about 500 fixtures: 200 LED pars, 26 Claypaky Sharpy, 12 Scenius Unico, 24 MAC Quantum Wash, **35 Martin Atomic LED 3000 strobes**, 4 Mythos 2, 21 ShowPRO EX36 wash, 8 Chromlech Jarag matrix blinders, 10 ShowPRO sunstrips and 2 Look Viper foggers, on a grandMA2 [S19].
* **UNKNOWN.** The exact 2025/2026 moving-head models. Hardstyle rigs of this period typically use IP65 beam and hybrid fixtures (e.g. Claypaky Sharpy X Frame / Skylos, Robe iForte / Esprite, Ayrton Domino / Perseo, CLF Poseidon / Orion) and GLP JDC1 or Martin Atomic-style strobes. This is an ASSUMPTION, not sourced for Defqon.1.
* **Observed in the 2026 frames (INFERENCE):**
  * Every edge of the dragon scales, the wing ribs, the gear rosettes and the castle windows is lined with dense pixel points that chase and change colour (f057-f059, f096, f103). Castle windows glow warm amber (f002).
  * White narrow beam fans radiate from the wing slopes and roof. They look like wide horizontal "fans" at deck level (f024, f031) and tilted-up "sky" fans (f029: about 8-12 beams per cluster, about 6 clusters).
  * Close-ups of the MC and performers show a **white/cyan backlight beam curtain in dense haze** (f036, f041, f050). The frames are almost fully white (mean luminance 133-149 of 255).
  * Pillar lanterns are colour-changing LED lamps: cyan-blue #2ec8ff-ish in cold sections, red or amber in fire sections, and green base up-lighting on the pillars in Domitor Draconis (f089-f093, f107).
  * Colour-washed smoke works as a "sky canvas". Red smoke at f008 and f082-f083, and green smoke at f026.
  * Strobes: white flash points on the deck at f055. Green/white flash points on the roof at f142 (@23:23).

### 4.2 Recommended 2026 rig (ASSUMPTION, calibrated to the 2,400 FACT)

| Group | Real-world equivalent | Count | Placement |
|---|---|---|---|
| Structure pixels | 1 m pixel battens (10 px) plus pixel dots | ~1,000 battens / ~10,000 px + ~300 dots | Every edge of the dragon, wing ribs, rosettes, towers, window frames, deck lip |
| Decor floods | IP65 RGBW floods (Ares/Yara class) | ~450 | Ground and truss, washing the sculptures |
| Beams | IP65 beam (Aorun/Poseidon/Sharpy class) | ~260 | Wing ribs (2 x 60), roof line (40), deck front (40), towers (4 x 10), pillars (20) |
| Hybrids / spots | 470-600 W hybrids | ~80 | Roof truss and deck; gobos, prisms |
| Wash / beam-wash | LED wash with zoom | ~80 | Castle facade and dragon underside |
| Strobes | Atomic/JDC1 class | ~100 | Deck lip (40), wing ribs (40), towers (20) |
| Blinders | 2/4-lite or matrix | ~40 | Deck front and towers, aimed at the audience/camera |
| Lantern pillar lamps | RGB lantern heads plus flame heads | ~14-18 | Field aisle and stage gate |
| **Total** | | **~2,400** | |

### 4.3 Real-time equivalents (Three.js, this project's `lights` system)

* **Pixel outlines:** use one `InstancedMesh` of small emissive quads, or a single `Points` cloud
  of about 8-12k points (mobile about 3k). Colour comes from a per-pixel attribute and a
  shader-side chase function `f(time, pixelIndex, section)`. There are no real lights; the pixels
  feed bloom. The pixels are the stage's "video wall".
* **Floods:** vertex-colour or emissive tint on the set material from `LightEnv.stageWash`. Add
  2-4 real `SpotLight`s (no shadows) at most, only for the dragon head.
* **Beams:** instanced additive cone meshes with a view-angle haze shader, as in the technical
  decisions doc. Budget by preset: ultra 320, high 200, medium 120, mobile 48. Use a 0.8-1.5°
  half-angle for "narrow" beams and 3-6° for "wide". Pan/tilt speed peaks at 200-300°/s for
  hardstyle "fast beams".
* **Strobes:** do not render single fixtures. Use one full-screen-plus-set flash term in
  `LightEnv` (5-12 Hz bursts, 15-25 ms flash), plus emissive flicker on about 100 strobe quads.
* **Blinders:** warm #ffb070 sprites, attack 30 ms, decay 300-800 ms.
* **Haze** (§7) is what makes beams visible. Scale beam alpha by `hazeLevel`.

---

## 5. Lasers

### 5.1 Evidence

* **FACT.** Laser design comes from Jeroen Winnubst / LaserImage (NL). The VPRO documentary shows
  "lasers vanaf hijskranen" (lasers mounted on cranes) and "vuurwerk uit reuzenraderen" (fireworks
  from giant wheels) [S12][S21]. Defqon.1's own marketing line is "How many lasers? Defqon.1: yes"
  [search result, 2022/2024 video titles].
* **FACT (industry comparison).** Pyrofoor and Artech FX's Eurovision 2022 kit used 6 KVANT
  Spectrum 30 W and 4 Clubmax 10 W lasers [S35]. Outdoor festival mainstage lasers are usually
  RGB diode projectors of 20-60 W (ASSUMPTION).
* **UNKNOWN.** The laser count, power and models used at Defqon.1 2026.
* **Observed 2026 laser vocabulary (INFERENCE, frames):**

| Time | Look | Colour | Emitters (apparent) | Frame |
|---|---|---|---|---|
| 02:18 | **Ground-level web**: straight beams criss-crossing the empty field about 1-3 m high, forming a lattice (drone view) | white / cool white | field positions (pillar bases) | f014 |
| 03:27 | Low **wave / fan sheets** rolling over the field toward the camera | green #14ae7a / cyan | stage deck + field | f021 |
| 04:56 | **Zig-zag** chains of beams at deck height; single beams straight up | blue-violet | deck front | f030 |
| 06:15 | **Cones / "tunnels"**: circular fans projected onto haze and ground, seen from the drone as rings | blue #282ea4 | stage + field | f038 |
| 12:40 | Horizontal **sheet at deck height** (flat plane) | white | deck | f077 |
| 14:39-15:09 | **Single thin beams between pillar tops**, crossing in the middle of the aisle (beam-bounce / pillar-to-pillar) | white | pillar tops | f089-f092 |
| 15:28 | Beam aimed at JDX's white piano | white | FOH/field | f094 |
| 18:26-19:16 | **"Liquid sky" in reverse**: dense blue scanned sheets floating just above the ground with haze; **huge X crossing beams** above the stage | blue #0625b2 / #1e77d5, cyan | stage roof + side positions | f112-f117 |
| 20:54 | **Grid of fans**: many parallel fans overlapping (low camera) | blue #060eb3 | stage | f127 |
| 21:54-22:43 | **Warm gold sheets** drawing a large V / logo-like figure over the field, seen from the drone; camera inside the haze under a gold beam tunnel | yellow/amber #bbb396 → #8c7739 (≈ 590 nm yellow mix) | stage + crane/side | f133-f138 |
| 22:53 | **Radial burst** from a single point at the side | blue-violet | side / crane position | f139 |
| 24:12 | Magenta **sheet at deck height** across the whole frontage | magenta #8b1d76 | deck | f147 |
| 24:42 | **Static crosshatch / X / triangles** of thin beams above the roof | lilac-white on violet #801fac | roof (about 6-8 emitters) | f150 |

Colour notes: laser primaries are 638 nm red, 520 nm green and 445-465 nm blue (FACT, general
physics). On camera, 445 nm "blue" reads as a very saturated royal blue / violet. Use
**#1a2bff-#2a2cff** for blue, **#00ff55** for 520 nm green, **#ff1418** for red, **#00e5ff** for
cyan (G+B), **#ffc000** for yellow/gold (R+G) and **#ff20c8** for magenta (R+B).

### 5.2 Recommended laser layout (ASSUMPTION)

| Position | Count | Typical looks |
|---|---|---|
| Roof line / wing tops (about 35-48 m) | 12 | sky fans, X crosshatch, down-fans, tunnels |
| Deck front (about 2-3 m) | 12 | sheets, zig-zag, horizontal fans, wave |
| Tower tops (4 towers) | 4 | cross beams, cones |
| Pillar tops (field aisle) | 8-10 | pillar-to-pillar beams, low web, liquid-sky sheet |
| Cranes / delay towers / FOH (about 20-30 m, 60-120 m in front of the stage) | 4-6 | reverse fans toward the stage, gold sheets, radial bursts |
| **Total** | **40-44 projectors** | Each 20-60 W class |

### 5.3 Real-time equivalents (`lasers` system)

* **Beams:** instanced thin quads or line strips with additive blending, 2-4 px core plus a soft
  6-10 px glow. Brightness ∝ `haze * (1 + 2*pow(max(0,dot(viewDir,beamDir)),8))` so beams flare
  when you look down them. Beam length: stop at the ground/set via an analytic plane or height
  test. Budget: ultra 640 segments, high 400, medium 200, mobile 96. Allow 8-24 beams per emitter
  per look.
* **Sheets ("liquid sky"):** do not draw hundreds of beams. Use one quad per sheet with a scanline
  shader (a moving stripe pattern, 30-60 visible "scan" lines, 2-6 Hz shimmer), a soft edge
  falloff, and a haze-noise texture scrolled at 0.2-0.5 m/s. Sheet height is 1.5-4 m over the
  field (empty-field look) or 4-6 m above the crowd (festival look).
* **Tunnels / cones:** a cone mesh with alpha only on the wireframe-like rim, plus a rotating
  segment mask at 0.5-2 rev/s.
* **Logo drawing (gold V):** a precomputed polyline, sampled by N beams from 2-4 emitters, rendered
  as sheets.
* **Hits:** attack 0 ms, release 150-400 ms. Lasers never have gradual intensity in reality: use
  on/off with a very short 20 ms fade.

---

## 6. Special effects: flames, fireworks, CO2 and others

### 6.1 Flames

* **FACT: Pyrofoor's flame kit and specs** [S27], confirmed by makers [S36][S37][S38]:

| Unit | Flame height | Fuel | Notes |
|---|---|---|---|
| Galaxis G-Flame | 4-7 m (makers: 3-8 m via nozzles) | propane/butane (can or cylinder) | DMX/wireless, tilt sensor cut-off > 45° |
| MagicFX Stage Flame | 3-4 m (can), up to 8 m (combined) | propane | DMX, safety channel |
| MagicFX Flamaniac | ~6 m | liquid | **5 angles: −45°, −22.5°, 0°, +22.5°, +45°**; yellow/red/orange/green colour fluids; ~500 shots per tank |
| X2 Wave Flame | 8 m | liquid | rotating (tilting) flame head |
| Power Flame | **15 m** | liquid propane + nitrogen | large-scale "tower" flame |
| XL Liquid Flame | **15 m** | liquid (external tank) | refillable during the show |
| Fire bowls / fire rope | — | — | static fire, "linear fire in custom forms" |

* **FACT.** 2019: "a plethora of stage lights, flamethrowers, lasers and fireworks". The Endshow
  was "a completely timecoded 20-minute show" [S33][S34]. Pyrofoor ran the flame throwers at
  Defqon.1 2025 [S32].
* **Observed 2026 (INFERENCE):**
  * **00:59** (f006): first flame bursts at the wing tips with a red field wash, timed to Vivaldi ("flames erupting in sync with the orchestral score": FACT [S2]).
  * **04:46** (f029): flames on the tops of the 4 gate pillars (lantern flame heads, about 1.5-3 m).
  * **11:51** (f072): **"burning wings"**: both wing slopes fully engulfed. Many flame heads along the wing ribs fire together into dense haze. The frame is 72 % orange, the brightest non-close-up moment of the show (mean luminance 91).
  * **14:19** (f087): **flame ring**. About 40 flame points form a chain along the deck front and both forward arms, about 6-10 m tall, plus flames on 10 aisle lantern pillars (5 pairs).
  * **17:07** (f104): **two 15 m-class flame torches** on the central towers, left and right of the dragon.
  * **25:41-25:51** (f156-f157): **blue flame-shaped plumes**, 8-15 m, along the central roof/deck line as the outro "cold fire". **UNKNOWN** whether these are coloured flames or CO2/smoke jets lit blue. Flamaniac fluids are not offered in blue, which favours blue-lit CO2 or smoke (INFERENCE).
  * No "dragon breath" from the mouth is visible in the storyboard. The mouth glows (red/magenta) instead (f068 and the thumbnail). Whether it breathes fire in the full-rate video is **UNKNOWN**.

**Recommended flame layout for the build (ASSUMPTION, grounded in f087/f072/f104):**

| Anchor (project) | Units | Height | Shot | Pattern use |
|---|---|---|---|---|
| `deck_front` (central frontage, about 100 m) | 24 | 6-8 m | 0.3-1.0 s, visible 1.0-1.6 s | all / lr / center_out / kick chases |
| `wing_left` + `wing_right` arms (about 45 m each) | 2 x 8 | 6-8 m | same | "fire ring" together with the deck |
| wing ribs / slopes (`wing_tips`, along the slopes) | 2 x 8 | 4-6 m, angled ±22.5-45° | 0.5-1.5 s | "burning wings" (11:51) |
| `towers_top` (2 central + 2 outer) | 4 | **12-15 m** | 1.0-2.5 s | giant torches (17:07), finale |
| `pillars_top` (aisle lanterns + 4 gate pillars) | 14 | 1.5-3 m | continuous or 0.5 s | "torches lit" state in fire songs |
| **Total** | **~70 flame heads** | | | |

Real-time: use a GPU flipbook or noise-shader flame jet (a stretched billboard column with
curl-noise UV warp) plus 60-200 spark/smoke particles per shot (mobile about 30). The flame colour
ramp is core #fff2c0, then #ffc46b, #ff7a1a, #e0400a and smoke #3a2a22. Each flame writes an
orange point light into `LightEnv` (intensity ∝ number of active flames). That is the key cue for
"heat" on the set and the ground. Add a heat-shimmer distortion band 0-4 m above active flames on
ultra/high only.

### 6.2 Pyrotechnics on the stage and fireworks

**FACT (permits).** The Omgevingsdienst Flevoland (OFGV) permits for Defqon.1, applicant
Pyrofoor de Amsterdam B.V.:

| Permit | Days | Product types allowed | Safety distance to audience | Fan-shape distance |
|---|---|---|---|---|
| 2017 (65883) | 23-25 June 2017, daily from 10:00 | Bengal fire; fountains; **cakeboxes ≤ 1 inch** | 15 m; 15 m; **40 m** | cakes **60 m** |
| 2019 (Z2019-001176) | 24-30 June 2019, daily from 11:00 | Bengal fire; fountains; cakeboxes | 15 m; 15 m; 40 m | 60 m |

The 2019 permit also extends on-site storage from 16 h to 96 h for a multi-day show, and requires
a drought check with the fire brigade [S25][S26]. No shells (bombs) appear in these permits.
2021-2026 permits exist on officielebekendmakingen.nl but could not be retrieved (**UNKNOWN**
whether larger calibres were added later).

**FACT (design).** "The fireworks at Defqon.1 were placed in **three different fan shapes**, creating
a full-screen setting". Pyrofoor and Q-dance developed **custom-made effects** [S30][S31 via search].
The fireworks are hand-made in Valencia [S10][S11]. In 2025 there were **2 pyro trusses of 45 m**
[S13]. The Defqon.1 Pyrobox consumer set holds 8 cakes "inspired by legendary Defqon.1 Endshow
moments" [S47].

**Physics references (FACT).** Aerial shells rise about 100 ft (30 m) per inch of calibre and
burst about 45 ft (14 m) in diameter per inch [S40]. Display tables list 3" (76 mm) at about 120 m
and 4" at about 150 m [S39]. Pyrofoor: large shells rise "up to 300 m", with bursts "up to 250 m"
[S29]. Sparkular up to 5 m, Sparkular Cyclone up to 10 m, and Sparkular Fall (waterfall) up to 7 m
down [S28].

**INFERENCE: what the 2026 fireworks actually are.** Cakes ≤ 1-1.2" rise about 30-45 m above the
launch point. Fired from roof trusses at 35-48 m, they break at about **65-95 m above ground** with
bursts of **15-30 m**. That matches the frames: the burst lines at f056 are about 14 bursts across
about 200 m of stage, roughly 15-25 m each. The same 1" cakes fired from deck or ground level
(outer arms) break at about 30-50 m.

**Observed 2026 pyro vocabulary (frames):**

| Time | Effect | Count / geometry | Colour |
|---|---|---|---|
| 01:09 | **Tall gerbs/fountains** along the deck | ~8 in a line, 15-25 m | white-gold |
| 01:19 | Gerbs on roof and wings in red-lit smoke | ~10 | white in red haze |
| 01:28 | **Angled comet / serpent fans** in V-pairs (left/right mirrored) | 6 positions, ±30-45° | gold |
| 03:37-03:47 | Single central **comet fan** behind the dragon | 1 x 8-10 comets, ~40 m | silver-gold |
| 04:07 | **Comet-fan line** along both arms and the roof | ~45 positions (15 per arm + 15 roof) | white/silver |
| 04:16 | Comets/gerbs at the outer wings with green-lit smoke | 2 groups x ~10 | green-white |
| 05:26 | Vertical comet columns across the full width | ~20 | white/red/blue |
| 06:55 | **Red rising stars** (single-shot comets) in a line | ~16-20, 40-60 m | red |
| 07:04 | Diagonal row of white comets plus red peony/crackle breaks | ~8 + ~5 bursts | white, red |
| 07:24 | **Glitter-tail comets ending in white flash pearls** | ~24 across the width, 60-80 m | white |
| 08:53-09:03 | **Red crackle/peony canopy** over the centre | ~20-30 overlapping bursts | red #d03b56 |
| 09:13 | **Line of gold chrysanthemums/brocades** across the width + central comet fan (~90°) | ~14 bursts + 12 comets | gold #f5ccab |
| 09:52 | Two **white Bengal / flash** clusters with smoke | 2 | white |
| 12:21-12:50 | Tall white comet streams (single-shot, 40-80 m) at the outer positions, then across the stage | 4 → ~12 | white |
| 13:00 | **Sky full of glitter**: twinkling strobe/crackle rain over the whole view | canopy | white-gold |
| 13:30-13:40 | Comets and gerbs in red-lit smoke | ~10 | white in red |
| 14:09 | **Orange comet V-fans** from the outer towers | 2 x ~10 comets, ~60° spread | orange |
| 17:57 | **Alternating angled comet fans** along the whole frontage | ~24 fans x 5-7 comets | gold |
| 19:35 | **Gerb wall** along the front + a row of white stars above | ~22 gerbs (10-15 m) + ~20 stars | white |
| 19:45 | Magenta-lit fountains and bursts close to the drone | many | pink |
| 21:14-21:34 | **Comets with pink palm/crackle breaks** in the centre + gerbs on the arms, then a **huge pink crackle canopy** | ~12 + 16, canopy ~100 m wide | pink/magenta |
| 23:42-23:52 | White-gold gerb wall along both arms; the drone flies past a giant comet | ~30 | white, green haze |
| 25:01-25:11 | **FINALE**: continuous **gerb wall** along the deck and arms (about 150-200 m wide, 15-25 m tall) under a **gold/orange crackle canopy**; the field glows orange | ~40-60 gerbs + ~30 bursts | red/orange/white |

Not observed in the storyboard (**UNKNOWN**, may exist at full frame rate): waterfalls (cascades
from the roof), confetti, streamers, mines at ground level, large shells above 150 m, and water
screens (Wikipedia notes water screens in older Endshows [S48]).

**Recommended fireworks library for the build (ASSUMPTION):**

| Project fx | Real analogue | Launch anchor | Rise | Break / size | Timing | Colours used in 2026 |
|---|---|---|---|---|---|---|
| `pyro.gerb` | stage fountain | deck_front, wing arms | — | 8-25 m tall column, ~2 m wide | 3-15 s, burn-in 0.2 s | white, gold |
| `pyro.sparkular` | cold spark machine | deck lip | — | 3-5 m (Cyclone 10 m) | 1-10 s | white-gold |
| `fireworks.comet` | single-shot comet / fan cake | roof, arms, towers | 30-60 m, flight 1.5-2.5 s | glitter tail, optional end-flash | fans of 5-12, angle ±0-60°, spacing 0.15-0.4 s | gold, white, red, orange |
| `fireworks.cake` | 25-30 mm fan cake | roof trusses (35-48 m), arms | 30-45 m | 15-25 m burst | 9-49 shots, 0.25-0.5 s apart | red, gold, white |
| `fireworks.shell` (Defqon realism) | 1-1.2" cake break | `fireworks_back` / roof | **height 55-110 m AGL** | **size 10-18 m radius** | star burn 1.5-3 s (willow/brocade 3-5 s) | red, gold, pink |
| `fireworks.shell` crackle | crackling "dragon eggs" | roof | 60-90 m | 20-30 m | crackle 0.6-1.5 s after the break | white-gold |
| `fireworks.shell` strobe / "glitter sky" | strobe/flitter stars | roof + sides | 60-100 m | 25-40 m | 2-4 s, 8-15 Hz twinkle | white |
| `fireworks.finale` | dense cake barrage | all | 55-100 m | 15-30 m | **12-25 breaks/s for 10-15 s** + gerb wall | red, orange, gold, white |
| `pyro.burst` (Bengal / flash) | Bengal fire, flash pot | deck, arms | — | 3-6 m bloom + smoke | 0.1 s flash / 5-30 s Bengal | white, red |
| `pyro.waterfall` | cascade | roof / wing edges | — | falls 7-25 m | 5-15 s | gold (optional, not observed) |

Real-time particle notes. Use analytic ballistic stars as in the technical decisions doc:
g = 9.81 m/s², drag k ≈ 0.8-1.5 s⁻¹. Launch speed v0 for a 35 m rise with drag is about 34-38 m/s.
Star ejection speed for a 12 m burst radius is about 18-25 m/s with k = 1.5. Star count per 1"
break: 25-60 on ultra, 15-30 on mobile. The finale needs a peak of about 40-60k live stars (ultra)
and 8-12k (mobile). Every break adds a 60-150 ms flash term to `LightEnv` (colour = star colour,
radius about 150 m), because on video the whole set and smoke flash in the break colour (f054,
f082, f153). Smoke: 2-4 large, slowly drifting billboard puffs per break, lit by the break colour.
Smoke is essential for the Defqon look: the frames are full of pyro smoke lit by red, green or
magenta.

### 6.3 CO2, confetti, streamers and sparkulars

* **FACT.** Pyrofoor supplies CO2 Jet and Powerjet, Psyco2jet (DMX tilt), Sparkular 5 m, Sparkular
  Cyclone 10 m and Sparkular Fall 7 m. It also supplied PowerDrop curtains (100+ units, 60 x 20 m)
  for Qlimax 2018 [S28]. Confetti and streamer systems were used at Defqon.1 2025 [S32].
* **INFERENCE for 2026.** No confetti or streamers are visible (pointless without an audience).
  CO2 use is uncertain: possibly the white plumes at 09:52 and the blue plumes at 25:41.
* **Recommendation.** Keep `pyro.jet` (CO2, 6-10 m white plume, 0.5-2 s, fades in 1.5 s) for
  kick-synced drops in the "festival mode". Use confetti only if the project shows a hypothetical
  crowd version.

---

## 7. Fog and haze

* **FACT.** Defqon.1 Australia used Look Solutions Viper foggers [S19]. Pyrofoor also rents
  smoke machines and Smokejets up to 5 m [S28]. Eurovision 2022 (Pyrofoor/Artech) used 530 L of
  smoke fluid over tests, rehearsals and shows [S35], which gives a sense of scale.
* **Observed (INFERENCE).** The stage area has dense, even haze: beam fans are visible
  everywhere, and close-ups wash out to white (f036-f050). The field has a **low-lying haze
  layer** that carries the laser sheets (f112-f117, f138). Pyro smoke clouds hang over the
  roofline after each pyro cue and take the colour of the wash (f008 red, f026 green, f083 red,
  f120 magenta). The heatwave suggests calm, warm air, so the smoke hangs.
* **Real-time.** Use a global `haze` term (0.35-0.6 during most sections, 0.8 for the laser "sky"
  and close-up scenes) plus a height-fog layer 0-6 m over the field (density 0.5-1.0 in Embers and
  In The Cold). Use 20-60 large soft smoke billboards above the roof that accumulate after pyro
  cues and decay over 20-40 s, coloured by `LightEnv.stageWash`.

---

## 8. Colour language

### 8.1 Evidence

* **FACT.** Defqon.1's identity colour is red: the mainstage is called "RED" and Q-dance names its
  stages by colour [S44]. The 2026 video description mentions a "proud orange heart" [S45].
* **FACT (method).** "Each scene is like a dance… we're constantly looking for contrast" [S10].
* **Measured 2026 timeline (INFERENCE from pixel analysis of all 160 frames).** Hue classes are
  counted on pixels with max(R,G,B) > 90. "lum" is mean luma 0-255.

| Chapter | Time | Dominant hues (share of bright pixels) | Key |
|---|---|---|---|
| Vivaldi "Winter" | 00:00-01:55 | blue 52-99 %, with red 78-79 % flame hits at 00:59 and 01:19 | **cold blue vs red fire** |
| Frontliner "Discorecord" | 01:55-04:34 | dark blue/violet build (lum 4-12) → cyan 41 / blue 33 / green 21 at the 03:27 drop; green 72 % at 04:16 | **cyan/green lasers, white pyro** |
| D-Sturb ft. E-Life "Sacred Oath" | 04:34-09:27 | magenta 41 / violet 30 / red 26 (04:46); blue-violet; close-ups white/cyan (lum 133-149); red 88 % at 08:53 | **magenta/violet + red canopy, gold finale line** |
| Akimbo & Missy "L.P.A." | 09:27-10:22 | blue with red/orange on the dragon; full **blackout** 10:12-10:22 (lum 1.5) | transition |
| Bass Modulators "Sacred Flame" | 10:22-14:46 | **red 60-99 %, orange 26-72 %**; fire wall at 11:51 (lum 91) | **all fire** |
| JDX "Domitor Draconis" | 14:46-18:18 | near black with **green** pillar light 48-69 % + red; the dragon **green + orange/red** (35 % / 30 %) | **villain green vs red** |
| D-Block & S-te-Fan "Embers" | 18:18-21:58 | **blue 92-100 %** (lasers, stage cyan/teal); ice-white beams at 20:25 (lum 123); then violet/magenta 21:14-21:34 | **ice, then pink climax** |
| Atmozfears & Jesse Jax "In The Cold" | 21:58-26:21 | **gold/yellow lasers 50-96 %** (22:13-22:43), then violet/magenta 55-85 %; finale red 53 / orange 31 / white 13 (25:01-25:11); outro blue plumes; black | **warm gold in "Cold", then red finale, blue end** |

Note the ironic contrast: "Embers" is the coldest (blue) section, and "In The Cold" has the warmest
lasers (gold) and the fire finale.

### 8.2 Palette (source-light colours for emissive materials; graded frame colours in brackets)

| Token | Hex (emissive) | Graded on video | Use |
|---|---|---|---|
| defqon red | #ff0a14 | #9f0a1f / #d03b56 | washes, pixels, red stars |
| deep red | #8a0010 | #60010d | ambient in fire sections |
| fire orange | #ff6a00 | #b44f21 | flames, orange comets |
| flame core | #ffd08a | #e1a074 | flame and gerb cores |
| gold | #ffb640 | #f5ccab / #bbb396 | brocade, gold lasers (#ffc000 for a pure laser) |
| ice white | #d8ecff | #a8c4d8 | "cold" beams, strobes |
| cold blue (wash) | #1e3cff | #0625b2 / #082763 | blue washes, dusk sky |
| laser blue | #1a2bff | #02049f / #060eb3 | laser sheets |
| cyan / teal | #00d8ff / #16c8b0 | #1e77d5 / #14ae7a | pillars, Embers stage |
| green (dragon) | #3cff6e | #77af68 / #59a880 | Domitor Draconis |
| magenta | #ff1fb8 | #8b1d76 | In The Cold, anthem |
| violet / UV | #8a2bff | #801fac / #3f0158 | anthem, finale build |
| castle window amber | #ffae42 | — | static warm windows |

---

## 9. The Endshow dramaturgy

### 9.1 Generic Defqon.1 Endshow structure

This synthesises sources [S10][S20][S24][S33][S34][S42][S48] with the 2026 frames (INFERENCE).

1. **Silence and darkness.** Blackout, the stage as a silhouette, lanterns only. Orchestral or
   narrated opening (Vivaldi in 2026).
2. **First fire.** Flame bursts on orchestral hits, then gerbs and comets on the downbeat.
3. **Energy song.** A classic or remix (Frontliner) with field lasers and big comet-fan lines.
4. **The year's anthem, live.** MC/vocalist on stage (E-Life), the white backlight curtain, then
   the largest pyro lines of the first half (red canopy, gold chrysanthemum line).
5. **Humour or community moment** (L.P.A., the fan-made "Losse Polsjes Anthem" [S3]), then a
   blackout.
6. **Ritual / fire scene.** Fire dancers (Lights in Motion style), all red and orange, "burning
   wings", the flame ring.
7. **The dark / villain.** A near-black stage with a single laser beam, a solo instrument (JDX
   piano), green and red.
8. **Euphoric / emotional peak.** Cold blue, liquid-sky lasers, ice-white beam storm, then a pink
   crackle climax.
9. **Finale.** A warm reversal (gold lasers), violet build, then a **gerb wall + crackle canopy**
   in red, orange and white.
10. **Afterglow.** "Cold fire" (blue plumes), then total black (the last 20 s are black: lum
    0.3).

Historic durations: timecoded 20 min (2019) [S33]; 22 min video (2019) [S34]; "over 30 minutes"
Spotlight endshow (2026 marketing) [S42]; 26 min 21 s (2026 video, FACT [S45]).

### 9.2 2026 cue sheet (storyboard reading; ±5 s)

| t (s) | Chapter | Picture | Suggested cues (project vocabulary) |
|---|---|---|---|
| 0-10 | Winter | black; stage silhouette against a deep-blue dusk; lanterns cyan | `lights.pillars color=cyan mode=steady`, `atmos.sky tint=#082763`, `lights.look dark` |
| 19 | Winter | stage deep blue, towers amber-uplit, windows warm | `lights.wash color=cold`, `stage.state mode=dormant windows=0.6` |
| 29-49 | Winter | drone: blue/violet outline, dark field | `lights.look ambient color=blue` |
| 59 | Winter | first flame hits at the wing tips; red field wash | `pyro.flame target=wing_tips height=8`, `lights.hit color=red` |
| 69 | Winter | ~8 gold gerbs along the deck, stage blue | `pyro.gerb target=deck_front height=20 dur=6 color=gold` |
| 79 | Winter | red haze, roof gerbs, white beams | `lights.wash color=red`, `pyro.gerb target=roof` |
| 88 | Winter | gold comet/serpent V-fans (6) | `fireworks.comet count=6 angle=40 color=gold height=35` |
| 108 | Winter | outline-only stage | `lights.look dark`, pixels only |
| 118-197 | Discorecord | build: single blue searchlight in haze, white laser web over the field, green field wash, violet stage | `lasers.look preset=grid origin=field height=2 color=white`, `fog.lowfog` |
| 207 | Discorecord | DROP: green/cyan laser waves over the field | `lasers.look preset=wave color=green color2=cyan` |
| 227-247 | Discorecord | comet fan behind the dragon; ~45 white comet fans on the arms and roof | `fireworks.cake target=roof,wing_left,wing_right color=white` |
| 256 | Discorecord | green comets in green-lit smoke at the outer wings | `fireworks.comet color=green` + `fog.burst` |
| 286 | Sacred Oath | magenta/violet stage, white beam fans up, pillar flames | `lights.look fan color=magenta`, `pyro.flame target=pillars_top height=2 dur=8` |
| 296-316 | Sacred Oath | blue zig-zag lasers at deck height | `lasers.look preset=wave origin=stage tilt=0 color=blue` |
| 326 | Sacred Oath | ~20 vertical comet columns | `fireworks.comet count=20 angle=0` |
| 345-405 | Sacred Oath | E-Life close-ups; white/cyan backlight curtain | `lights.look still color=ice beam=wide`, haze 0.8 |
| 375 | Sacred Oath | blue laser cones/rings | `lasers.look preset=tunnel color=blue` |
| 415-444 | Sacred Oath | red star line; diagonal white comets + red bursts; ~24 glitter comets with flash ends | `fireworks.comet color=red count=18`, then `color=white count=24 height=70` |
| 533-543 | Sacred Oath | red crackle canopy, white deck strobes | `fireworks.salvo type=crackle color=red count=24`, `strobe.burst` |
| 553 | Sacred Oath | gold chrysanthemum line (~14) + central comet fan | `fireworks.salvo type=chrysanthemum color=gold count=14 spread=200` |
| 567-602 | L.P.A. | dragon close-ups, orange/blue; 2 white Bengal clusters | `pyro.burst`, `stage.state mode=awake` |
| 612-632 | L.P.A. → Sacred Flame | **full blackout** | `lights.look dark`, `lasers.off`, pillars off |
| 642-701 | Sacred Flame | fire dancers on stage; all red/orange | `lights.wash color=red`, `stage.state mode=rage` |
| 711 | Sacred Flame | **burning wings** | `pyro.firewall target=wing_left,wing_right height=6 dur=4` + `pyro.flame target=deck_front` |
| 741-770 | Sacred Flame | white comet streams at the outer positions; white laser sheet at deck height; flame pillars | `fireworks.comet height=70 color=white`, `lasers.look preset=sheet height=3` |
| 780 | Sacred Flame | **glitter sky** | `fireworks.salvo type=strobe count=30 height=80` |
| 810-830 | Sacred Flame | everything red, comets in red smoke | `lights.wash color=deepred`, `fireworks.comet color=red` |
| 849 | Sacred Flame | orange V-fans from the outer towers | `fireworks.comet target=wing_tips count=10 angle=60 color=orange` |
| 859 | Sacred Flame | **flame ring** around the deck + arms + aisle pillars | `pyro.flame target=deck_front,wing_left,wing_right pattern=center_out` + `target=pillars_top` |
| 879-918 | Domitor Draconis | black; green pillar uplight; white beams between pillar tops | `lights.pillars color=green`, `lasers.look preset=crossfire origin=field count=1` |
| 928 | Domitor Draconis | JDX at the white piano under a single beam | `lights.look still color=white` |
| 948-1017 | Domitor Draconis | dragon green + red; full stage at 1017 | `stage.state mode=rage eyes=red`, `lights.wash color=green` |
| 1027 | Domitor Draconis | **twin 15 m flame torches** on the central towers | `pyro.flame target=towers_top height=15 dur=2` |
| 1077 | Domitor Draconis | ~24 alternating gold comet fans across the front | `fireworks.cake target=deck_front angle=30 color=gold shots=7` |
| 1096-1156 | Embers | **blue world**: cyan/teal stage, blue sheets over the field, X beams above | `lasers.look preset=sheet height=2 color=blue`, `lasers.look preset=crossfire origin=stage`, `stage.state mode=frozen` |
| 1175 | Embers | ~22 white gerbs + white star row + white laser burst | `pyro.gerb height=14 color=white`, `lasers.hit pattern=star` |
| 1185 | Embers | magenta fountains/bursts | `pyro.gerb color=pink` |
| 1225 | Embers | **ice-white beam storm** | `lights.look ballyhoo color=ice`, `strobe.kick` |
| 1245-1254 | Embers | blue laser fan grid | `lasers.look preset=grid color=blue` |
| 1274-1294 | Embers | pink comet-with-break row → **pink crackle canopy** | `fireworks.salvo type=palm color=pink`, then `type=crackle count=40` |
| 1304 | Embers | only the red dragon lit | `stage.state mode=ember`, rest dark |
| 1314-1363 | In The Cold | dark; **gold laser sheets / V figure** over the field; gold tunnel in haze | `lasers.look preset=sheet color=gold height=4`, `preset=tunnel` |
| 1373-1413 | In The Cold | red/magenta stage, violet radial laser from the side, green/white roof strobes | `lasers.look preset=burst origin=field`, `strobe.burst color=white` |
| 1422-1432 | In The Cold | gerb wall along the arms; giant comet | `pyro.gerb target=wing_left,wing_right dur=8` |
| 1452 | In The Cold | magenta laser sheet at deck height | `lasers.look preset=sheet height=3 color=magenta` |
| 1462-1492 | In The Cold | violet crosshatch/X laser figures above the roof | `lasers.look preset=crossfire origin=stage color=purple` |
| 1501-1511 | In The Cold | **FINALE**: gerb wall + gold/orange crackle canopy, field glows orange | `fireworks.finale density=20 dur=12 palette=[red,orange,gold,white]` + `pyro.gerb all dur=12` + `pyro.flame all` |
| 1521-1531 | outro | violet haze, then black | fade to `lights.look dark` |
| 1541-1551 | outro | **blue flame-shaped plumes** along the roof/deck | `pyro.jet color=blue height=12` (or blue `pyro.flame`) |
| 1561-1581 | end | black | all off |

---

## 10. Quick reference: real-world numbers and real-time equivalents

| Element | Real-world (tag) | Real-time recommendation |
|---|---|---|
| Structure lights | 1,800 (FACT 2025) | ~10k emissive pixel points/quads, mobile ~3k |
| Show fixtures | 600 (FACT 2025) | 320/200/120/48 beam cones per preset; 1 flash bus; 4 real spots max |
| Lasers | 40-60 projectors (ASSUMPTION) | 40-44 emitters; ≤ 640 beam segments + sheet quads |
| Flame heads | ~70 (INFERENCE from f087/f072/f104) | 70 anchors; billboard jets 6-8 m / 15 m; 0.3-2.5 s |
| Gerbs | 20-60 positions per cue (INFERENCE) | column emitters 8-25 m, 3-15 s |
| Comet fans | 6-45 positions, 5-12 comets each (INFERENCE) | analytic comets, rise 30-60 m |
| Aerial breaks | 1" cakes, 40 m safety / 60 m fan (FACT permits) | break 55-110 m AGL, radius 10-18 m, ≤ 25 breaks/s in the finale |
| Pyro trusses | 2 x 45 m (FACT 2025) | `fireworks_back` = 2 lines on the roof at ~40-48 m |
| Haze | Viper-class foggers (FACT AU) | global haze 0.35-0.8 + field ground fog 0-6 m |
| Timecode | all shows timecoded in Depence (FACT) | the deterministic `ShowEngine` (already the design) |

---

## 11. Open questions (UNKNOWN)

1. The 2026 stage dimensions and exact positions of pyro trusses, towers and lantern pillars (count them from high-resolution frames or a later official release).
2. Laser count, power and models; whether any laser was mounted on cranes in 2026 (as in the 2025 documentary).
3. Whether the dragon mouth emits flame (a "dragon breath" unit) or only glows.
4. Whether the final blue plumes are coloured flames, CO2 or lit smoke.
5. The 2021-2026 firework permits (officielebekendmakingen.nl returned 503 during research). They would confirm or refute calibres above 1".
6. The exact moving-head, strobe and blinder models for 2025/2026.
7. Whether the video is one continuous take or assembled from several runs (EDMTunes reports only a scaled-down crew display on Saturday 27 June; Q-dance says the full production was performed).

---

## Sources

- [S1] DJ Mag: "Defqon.1 share 2026 Endshow filmed without audience after heatwave cancellation". https://djmag.com/news/defqon1-share-2026-endshow-filmed-without-audience-after-heatwave-cancellation-watch
- [S2] Your EDM: "Defqon.1 Releases 2026 Endshow Following Festival Cancellation" (flames in sync with Vivaldi). https://www.youredm.com/2026/07/06/defqon-1-releases-2026-endshow-following-festival-cancellation/
- [S3] We Rave You: "Defqon.1 share 2026 Endshow filmed without audience" (Losse Polsjes Anthem). https://weraveyou.com/2026/07/defqon-1-2026-endshow-filmed-empty-grounds/
- [S4] EDMTunes: "No, Defqon 1 Did Not Perform the Full Endshow for Recording". https://www.edmtunes.com/2026/06/no-defqon1-endshow/
- [S5] EDMTunes: "Defqon.1 Seems to Have Recorded the 2026 Endshow Without Attendees". https://www.edmtunes.com/2026/06/defqon-1-seems-to-have-recorded-the-2026-endshow-without-attendees/
- [S6] nieuws.nl: "Defqon.1 deelt The Endshow: opgenomen op leeg terrein". https://nieuws.nl/entertainment/defqon1-deelt-opname-the-endshow-op-verlaten-festivalterrein
- [S7] Festivalinfo: "Na afgelasting: Defqon.1 zendt The Endshow uit op YouTube…". https://www.festivalinfo.nl/news/59115/Na-afgelasting-Defqon-1-zendt-The-Endshow-uit-op-YouTube-en-maakt-dan-gelijk-2027-datum-bekend/
- [S8] Puna.nl: "Defqon.1 deelt prachtige beelden van The Endshow op verlaten terrein". https://www.puna.nl/news/defqon1-deelt-prachtige-beelden-van-the-endshow-op-verlaten-terrein-na-afgelasting-door-extreme-hitte
- [S9] Syncronorm: "Incomparable Show Design: Defqon.1 made with Depence" (2024 credits, timecode). https://www.syncronorm.com/newsitem/defqon1-depence
- [S10] Hardnews: "3voor12 documentary reveals the creative process behind the Defqon.1 Endshow" (1,800 + 600 lights; Valencia; the contrast quote). https://hardnews.nl/en/3voor12-documentary-reveals-the-creative-process-behind-the-defqon-1-endshow/
- [S11] VPRO: "Defqon.1: de magie van de eindshow". https://www.vpro.nl/artikelen/vpro-3voor12-presenteert-defqon1-de-magie-van-de-eindshow
- [S12] VK Magazine: "VPRO duikt in de magie van de Defqon.1 Endshow" (lasers on cranes, fireworks from giant wheels). https://www.vkmag.com/magazine/vpro-duikt-in-de-magie-van-de-defqon1-endshow-en-ja-dat-is-pure-kunst
- [S13] Backbone International: Defqon.1 2025 (197 x 48 m, 2 x 45 m pyro trusses). https://www.backbone-international.com/portfolio/defqon-1-weekend-festival-2025/
- [S14] Backbone International: Defqon.1 2024 (114.5 x 34 m, 2,500 lights). https://www.backbone-international.com/portfolio/defqon-1-weekend-festival-2024/
- [S15] CyberMotion: "CyberMotion at Defqon.1" (58 CyberHoists, timecode, LD Vernooij). https://cyber-motion.com/showcases/cybermotion-at-defqon-1-redefining-festival-innovation/
- [S16] TPi: "CLF Brings the LEDbar PRO to Defqon.1 Festival". https://www.tpimagazine.com/clf-brings-the-ledbar-pro-to-defqon-1-festival/
- [S17] CLF Lighting: "CLF LEDbar PRO premiered this year's Defqon.1 Festival" (236/102/136). https://www.clf-lighting.com/clf-ledbar-pro-premiered-this-years-defqon-1-festival/
- [S18] TPi: "Defqon.1 2020 at Home with CLF Lighting". https://www.tpimagazine.com/defqon-1-2020-at-home-with-clf-lighting/
- [S19] ALIA / Show Technology Australia: "DEFQON.1's spectacular 10-year anniversary" (fixture list, "no video walls"). https://alia.com.au/defqon-1s-spectacular-10-year-anniversary/
- [S20] Grand Finale: "Defqon.1 2018 – The Closing Ritual" (credits). https://grandfinale.nl/defqon1-2018
- [S21] Grand Finale: Jeroen Winnubst, laser design (LaserImage). https://grandfinale.nl/jeroen-winnubst
- [S22] Grand Finale: Lucas Gerritzen, pyro design (Pyrofoor, Ricasa alliance, Finale 3D). https://grandfinale.nl/lucasgerritzen
- [S23] Grand Finale: Mysteryland 2023 Endshow (same team: Pyro4/Pyrofoor, Sync/LaserImage). https://grandfinale.nl/mysteryland-2023
- [S24] Spark Creative Studio / Mark Rietveld: Defqon.1 Festiflow and Show Design. https://sparkcreativestudio.nl/defqon1-weekend-festival-festiflow-and-show-design
- [S25] OFGV: Ontbrandingstoestemming Defqon1 Biddinghuizen 2017 (Pyrofoor; Bengal/fountains/cakes ≤ 1"; 15/15/40/60 m). https://www.ofgv.nl/publish/pages/198/ontbrandingstoestemming_defqon_1_biddinghuizen.pdf
- [S26] OFGV: Besluit vuurwerk Defqon 1 Spijkweg 30 Biddinghuizen 2019. https://www.ofgv.nl/publish/pages/414/besluit_vuurwerk_defqon_1_spijkweg_30_biddinghuizen_internetversie.pdf
- [S27] Pyrofoor: Fire & flames (G-Flame, X2 Wave, Power Flame, XL Liquid Flame, Flamaniac). https://www.pyrofoor.com/en/effects/fire-flames/
- [S28] Pyrofoor: CO2 & other effects (Sparkular 5/10/7 m, PowerDrop at Qlimax 2018). https://www.pyrofoor.com/en/effects/co2-other-effects/
- [S29] Pyrofoor: In/outdoor fireworks (shells up to 300 m, 250 m bursts). https://www.pyrofoor.com/en/effects/in-outdoor-fireworks/
- [S30] Pyrofoor: We are Pyrofoor (custom-made effects with Q-dance). https://www.pyrofoor.com/en/we-are-pyrofoor/
- [S31] Pyrofoor: Pyro services (Defqon.1 "three fan shapes", per the search index). https://www.pyrofoor.com/en/services/pyro/
- [S32] JAGER Showtechniek: Defqon.1 Festival Biddinghuizen 2025 (fireworks, flame throwers, smoke, confetti and streamers for Pyrofoor). https://www.lightslategray-parrot-597488.hostingersite.com/defqon-1-festival-biddinghuizen-2025/ (company: https://jagershowtechniek.nl/)
- [S33] Lights in Motion: "DEFQON.1 – Fire Artists in the Endshow" (2019, timecoded 20 min). https://www.lightsinmotion.nl/en/defqon-1/
- [S34] Festival Sherpa: "Watch: Dragons, Lasers & Fireworks At The Defqon.1 Endshow". https://www.festivalsherpa.com/watch-dragons-lasers-fireworks-defqon-1-endshow/
- [S35] TPi: "Eurovision 2022 SFX… with Artech FX and Pyrofoor" (consumables, Kvant lasers). https://www.tpimagazine.com/eurovision-2022-sfx-work-their-magic-in-turin-with-artech-fx-and-pyrofoor/
- [S36] Finale 3D: MagicFX Flamaniac (5 angles, colours, 500 shots). https://finale3d.com/partners/flamaniac/
- [S37] Galaxis: G-Flame (3-8 m, tilt sensor). https://www.firing-system.com/project/g-flame/
- [S38] MagicFX Stage Flame specs (3-4 m / 8 m). https://www.sfxsupplies.co.uk/products/magicfx-stage-flame
- [S39] Skylighter: Firework display charts (shell heights, safety radii). https://www.skylighter.com/blogs/fireworks-information/firework-display-charts
- [S40] Red Apple Fireworks: "How high do fireworks go?" (100 ft per inch rule). https://www.redapplefireworks.com/blogs/we-love-fireworks/how-high-do-fireworks-go
- [S41] PyroFest: Ricardo Caballer & Ricasa Pirotecnia (Valencia, family firm since 1881). http://pyrofest.com/ricasa.html
- [S42] Q-dance: Defqon.1 2026 RED Experience ("record-breaking amounts of pyro"; Spotlight endshow "over 30 minutes"). https://www.q-dance.com/l/defqon-red-experience-2026
- [S43] UFO Network: Defqon.1 2025 review (RED "The Creator", 50 m monument). https://ufo-network.com/defqon-1-2025/
- [S44] Hard Cultr: Defqon.1 Stages 2026 (RED is the mainstage). https://www.hardcultr.com/festivals/defqon-1-stages-explained-2026-guide/
- [S45] YouTube: "The Endshow | Defqon.1 2026" (metadata: 1581 s, chapters, description, uploaded 2026-07-02). https://youtu.be/fLWY-Sxb1bE
- [S46] Hearkken: Defqon.1 Virtual 2025 RED stage (modular real-time assets). https://hearkken.com/behind-the-mainstage-engineering-and-optimizing-the-defqon-1-virtual-2025-red-stage/
- [S47] AVP Vuurwerk forum: Defqon.1 Pyrobox (8 cakes inspired by Endshow moments). https://avpvuurwerk.nl/forum/forum/importeurs-nederland/evolution-fireworks/evolution-algemeen/1625-2100-defqon-1-pyrobox
- [S48] Wikipedia: Defqon.1 Festival (Endshow = fireworks, pyrotechnics, water screens, narrated storyline). https://en.wikipedia.org/wiki/Defqon.1_Festival

Local working material (not in git; copyrighted):
`/tmp/claude-0/-home-user-Q-Crashers/de5b2351-28d0-5f9c-98e9-2fbf28f2c6ab/scratchpad/refs/production/`
holds the permit PDFs and their extracted text (`ofgv_defqon*.txt`), the colour timeline
(`timeline.txt`), and 2x/4x frame grids in `grids/` (lasers1-4, pyro1-7, misc1-6, zoom_*).
