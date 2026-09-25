# Crowd, bars and intoxication research: Defqon.1 2026 (RED, Endshow)

Classification used on every claim:
**FACT** (sourced, source id in brackets) · **INFERENCE** (strong deduction from facts) ·
**ASSUMPTION** (reasoned fill-in for the simulation) · **UNKNOWN**.
Source ids `[Sxx]` resolve in the **Sources** section at the end. Research date: 2026-09-25.

> Scope reminder. The real Endshow 2026 was filmed on **empty** grounds (no audience) [S10][S11].
> Every crowd number below for "RED during the Endshow" is therefore a **counterfactual**
> calibrated on earlier editions (2023-2025) and on the 2026 capacity plan. Part 3
> (intoxication) contains **effects and risks only**, for an educational simulation. It
> deliberately contains no dosing, buying or use-optimisation information.

---

## 0. Key numbers (TL;DR for the engine)

| Item | Value | Tag |
|---|---|---|
| Planned daily capacity 2026 | 72,500 people/day | FACT [S4][S5] |
| Weekend (camping) visitors 2026 | ~55,000-58,000 | FACT [S1][S74] |
| Day tickets per day (cancelled Fri+Sat 2026) | ~14,500-15,000/day, "nearly 29,000" in total | FACT [S5][S3] |
| Festival total 2023 / 2024 / 2025 | 250,000 / 250,000 / 268,236 (4 days) | FACT [S22] |
| Crowd at RED for Power Hour 2023 | 65,000 (~75 % of the festival) | FACT [S23] |
| Crowd at RED for a Saturday Endshow (sim value) | **55,000** (range 45,000-65,000) | ASSUMPTION |
| RED field area (official 2026 map polygon) | **51,200 m²** (≈271 m deep × up to 230 m wide) | FACT (map geometry [S21]); computed |
| Mean density at 55,000 | ~1.1 p/m² (front 4, middle 2-2.5, back 0.2-0.6) | ASSUMPTION |
| Endshow start (planned) | Saturday 22:40 | FACT [S12] |
| Payment 2025-2026 | cashless RFID/NFC "Legendary Bracelet" (no tokens) | FACT [S13][S19][S38] |
| Payment 2024 | tokens, 5 for €20 (€4.00/token); beer or soda = 1 token; cocktail = 3 | FACT [S31] |
| Beer | AB InBev deal (ID&T group, from 2024): **Bud** (+ Corona); Heineken until 2023 | FACT [S33][S34] |
| Beer price 2024 | €4.00 per 0.25 L Bud | FACT [S35] |
| Beer price 2026 | ~€4.25-4.50 per 0.25 L | ASSUMPTION (2026 price UNKNOWN) |
| Bars around RED (2026 map) | 4 bar clusters, 20 bar-counter modules, 2 Bud fast lanes | FACT (map [S21]) |
| Free water | free tap-water points; in the 2026 heat protocol: free water at **all toilet blocks** | FACT [S4][S39] |
| Harm-reduction partner | **Celebrate Safe** stand, run with **Unity** (peer education by Jellinek) | FACT [S15][S43] |
| Drugs policy | zero tolerance, minimum age 18 | FACT [S17] |

---

## 1. Context: what happened in 2026 (relevant to crowd and heat)

- FACT: KNMI issued the Netherlands' first-ever **code red for heat**, valid from 26 June 00:00
  for the central and southern provinces. Peak measured temperature was **39.4 °C (Ell, 26 June)**.
  25 June reached 33-37 °C, and in some places the night minimum did not drop below 22 °C [S45].
- FACT: Code red for heat in Limburg, Noord-Brabant, Gelderland and Overijssel ended 27 June 21:04.
  At 21:41 on 27 June KNMI issued **code orange for severe thunderstorms nationwide**, with hail of
  2-5 cm and gusts of 75-100 km/h [S46].
- FACT: Earlier in the week Q-dance reduced capacity by admitting **weekend-ticket holders only** on Fri 26 and
  Sat 27 June. It also cancelled the Saturday Warrior Workout and moved **POWER HOUR from 16:00 to 19:00** [S3][S18].
- FACT: The festival was then cancelled on Friday 26 June. Camping and parts of the grounds stayed open
  without music so people could leave [S1][S2].
- FACT: According to the Dronten mayor (via [S6]), hospitals in the region were full. Temperature in a
  festival tent was ~40 °C at ground level and ~80 °C at the tent ceiling. Fewer than 100 of ~45,000
  remaining visitors misbehaved. The mayor said: "Defqon is truly one big family." (Numbers come
  from an article summary, so treat them as indicative.)
- FACT: The Endshow was recorded on the empty "Holy Grounds" and premiered on YouTube on
  **2 July 2026 at 20:00** [S11]. The RED stage "was finally brought to life" there [S11].
- UNKNOWN: the exact date and time of the Endshow filming (not published).

Implication for the sim (INFERENCE): a crowd layer is a "what if the tribe had been there" mode.
It should be switchable **off** to match the real footage (empty field).

---

## 2. The crowd

### 2.1 Attendance and how many are at RED during the Endshow

- FACT: 2026 plan: 72,500 people/day [S4][S5]. This splits into ~55-58k weekend/camping visitors
  and ~15k day visitors per day [S1][S74].
- FACT: Power Hour 2023 drew 65,000 people to RED, described as ~75 % of the crowd [S23]. A fan caption
  on a Power Hour aerial says "70.000 weekend warriors" (local ref `refs/stage/ig_popular.jpg`, not an
  official number).
- FACT: The Endshow is RED's nightly closing show (Saturday 22:40 in the 2026 programme) [S12].
  "Every stage stops" for Power Hour and everyone converges on RED [S73]. For the Endshow, other stages
  close at 23:00 (festival grounds open 11:00-23:00) [S18].
- INFERENCE: At a Saturday Endshow, most other stages are still running until ~23:00, and part of the
  crowd leaves early for the campsite. RED therefore holds **fewer than at Power Hour but the same order
  of magnitude**.
- ASSUMPTION (sim default): **55,000 people** in and immediately around the RED field
  (slider 0-65,000). With 2026 heat rules (weekend visitors only, 55k on site), a realistic heat-mode
  value would be **~40,000-45,000**.

### 2.2 RED field geometry (from the official 2026 map data)

Source: the official Defqon.1 2026 interactive map (Mapbox vector tiles), exported by the terrain
agent to `scratchpad/refs/terrain/dq26_floorplan_merged.geojson` [S21]. Areas are computed in a local
metric projection.

- FACT (map): The Saturday "RED" area polygon (colour `#ff0000`) has an outer area of **51,223 m²**
  and contains an inner grey zone (`#838383`) of **15,690 m²** (≈107 m × 150 m).
- FACT (map): **8 delay towers** (`tower_delay_red`: lattice mast with a Defqon.1 logo disc on top)
  stand in the grey zone in **2 rows × 4**. Spacing is **26.6 m** along the stage axis and the rows are
  **44 m** apart. In the 2026 Endshow footage they appear as tall lantern pillars forming the central
  aisle (storyboard `f003`, `f087`) (INFERENCE: dressed delay towers).
- FACT (map): The Exclusive RED Experience / Premium Deck (grandstand) sits at the **rear centre**
  of the field, on the lake side.
- INFERENCE: The audience faces **bearing ≈145° (SE)**. The stage front is at the SE edge of the
  polygon, since the tower aisle points there and the deck faces that way.

Local coordinates (for placing crowd, bars and props). Origin O = lon 5.757000, lat 52.440000, with
E/N in metres. `u = 0.574·E − 0.819·N` (towards the stage), `v = 0.819·E + 0.574·N`.
Stage-front coordinates: **d = 45 − u** (metres back from the stage-front edge) and
**x = v − 36.4** (metres to the audience's **left**; + = NE).

| Depth band d (m) | Area (m²) | Usable width (m) | Contents (map) |
|---|---|---|---|
| 0-30 | 2,988 | 168 (narrows toward the stage) | front of stage |
| 30-60 | 5,756 | 230 | |
| 60-90 | 6,960 | 230 | first delay-tower pair at d≈89 |
| 90-120 | 6,960 | 230 | towers at d≈115; side bars at d 74-117 |
| 120-150 | 6,856 | 230 | towers at d≈142 |
| 150-180 | 5,700 | 188 | towers at d≈168; rear bars + Bud fast lanes at d≈165 |
| 180-270 | 15,848 | 188 | main path crossing, water/toilets, RED Experience deck at d≈254 |
| **Total** | **51,152** | | |

Delay-tower positions (d, x): (89, −22), (89, +22), (115, −22), (116, +22), (141, −22), (142, +22),
(168, −22), (169, +22). FACT (map), rounded to 1 m. Map icons are symbolic, so expect ±5 m
(INFERENCE).

### 2.3 Density by zone

Reference values:
- FACT: UK event guidance uses **2 p/m²** as the safety-assessment limit. Moving queues are assessed at
  **4 p/m²**. The scale runs up to **5 p/m²**, with **5.5-6 p/m² = HIGH RISK**. The UK Green Guide uses
  4.7 p/m² for standing viewing areas [S47]. The Purple Guide capacity calculation uses 2 p/m² [S48].
- INFERENCE: Tightly packed front-of-stage pits reach **4-5 p/m²** ([S48], secondary source).
- FACT (geometry): mean spacing between people = 1/√density. That gives 0.45 m at 5 p/m², 0.50 m at
  4 p/m², 0.71 m at 2 p/m², 1.0 m at 1 p/m² and 1.41 m at 0.5 p/m².

Simulation density map (ASSUMPTION, sums to ≈58,000 on the 51,200 m² polygon):

| Zone | d (m) | Density (p/m²) | People | Look / behaviour |
|---|---|---|---|---|
| A: pit (behind barrier, ~2-3 m gap) | 0-30 | 4.0 (4.5 centre, 3 at sides) | ~12,000 | shoulder to shoulder, arms up, jumping in sync, small push-waves, phones held high |
| B: front-middle | 30-60 | 2.5 | ~14,400 | dancing space ~0.6 m, fist pumps, flags start |
| C: middle (tower aisle begins) | 60-120 | 1.5 | ~20,900 | the most flags, hakken/shuffle circles, small groups |
| D: rear (tower aisle, side bars) | 120-180 | 0.6 | ~7,500 | groups of 3-8, queues at bars, people walking |
| E: far rear, paths, deck | 180-270 | 0.2 | ~3,200 | walkers, sitters, flow to toilets/water/camping |

Extra ASSUMPTIONS for realism:
- Keep a **2.5-4 m front barrier + security pit** in front of the stage lip. Photos of the 2026 stage
  show a metal crowd barrier (local ref `refs/stage/fb_edmlab_991489080456953.jpg`).
- Leave a **~4-6 m-wide low-density lane** along the dark path lines that cross the field on the map,
  plus ~10 m of queue space in front of each bar.
- Density falls laterally: about 70 % of the centre value at |x| > 80 m.
- Render budget suggestion: 55k agents via GPU instancing with LODs, as in
  `research/technical-decisions.md` §5. Beyond ~120 m from the camera, draw the crowd as a
  density-textured heightfield of heads plus sparse flag sprites.

### 2.4 Who is in the crowd (appearance)

Demographics:
- FACT: minimum age 18 [S17]. Visitors come from 100-110+ countries [S22][S25].
- ASSUMPTION: ages 18-40 (mode ~23-28). Sex ratio ~65 % male / 35 % female, estimated from event photos
  (UNKNOWN officially). Nationality mix: NL ~45 %, DE/BE ~20 %, rest of the world ~35 %.

Clothing and accessories:
- FACT: Official 2026 merch is caps, T-shirts, sunglasses and hoodies, sold at 6 stands (M1-M6) [S16].
  The 2026 store collections are dominated by **purple ("Nightshade", "Midnight Purple")**, **black**,
  **grey**, **wine/red**, off-white, and **green** (the "Sunday Funday" line: bucket hat, fanny pack,
  safari hat) [S27].
- FACT: Headwear is the biggest merch category: 40+ caps, snapbacks and bucket hats, mostly **black**
  with red logo, plus red, yellow, peach, sand and tie-dye purple. There are also tribe caps
  (Warrior/Berserker/Guardian/Shaman) and the "Sacred Oath" snapback [S27].
- FACT: **Hand fans** are official merch, e.g. the "Sacred Oath Handfan", black with red ritual artwork,
  "built for peak moments under the sun" [S27]. A fan with a Korean-flag print is visible in the 2025
  opening photo (local ref `refs/stage/250627_…_5481-scaled.jpg`).
- FACT (photo, Defqon.1 2025 opening, local ref above): **flags worn as capes** (tied around the neck),
  **cardboard Defqon.1-logo hats**, stacks of festival wristbands on both arms, earplugs, sunglasses,
  caps and bucket hats, hydration vests, grey/white/black Defqon.1 tees, and bright pink/neon pieces.
- FACT: Fans wear morphsuits, onesies (Pikachu, dinosaur), Mario/Luigi costumes, face paint, matching
  neon group outfits, all-over-print hoodies, psychedelic pants and Dr. Martens [S26].
- FACT (photo, daytime RED, local ref `refs/stage/Defqon.1-Live.jpg`): many **shirtless men**, head
  bandanas, snapbacks, sunglasses, phones raised, inflatable balls, and national flags (e.g. Polish and
  German) on poles above the crowd.
- FACT: "The Path" gamification (in the app) has the ranks Challenger → Warrior → specialisation
  **Berserker / Shaman / Guardian** [S20]. Matching pin buttons, caps and flags are sold [S27]. The
  community calls itself the "tribe" and "(Weekend) Warriors" [S20][S16].
- UNKNOWN: whether sewn "tribe patches" are common. The store sells a "rubber patch" cap and pin
  buttons, not patches [S27].

Suggested clothing palette for the crowd shader (ASSUMPTION, weights for a warm night, ~25-30 °C):

| Share | Colour (hex) | Item |
|---|---|---|
| 22 % | skin tones (range `#f1c7a5`…`#6b4431`) | shirtless torso / bare arms |
| 26 % | `#141414` / `#242424` black | Defqon.1 tees, tanks, shorts |
| 10 % | `#c02030` Defqon red / `#7a1f2b` wine | tees, caps, flags-as-capes |
| 8 % | `#4b2a6e` nightshade purple | 2026 merch, tie-dye |
| 10 % | `#e8e4dc` off-white / `#8a8a8a` grey | tees, hoodies |
| 8 % | `#2f6fd6`, `#39ff14`, `#ff2ea6`, `#ffd400` | neon group outfits, costumes |
| 8 % | `#3b4f6b` denim / `#556b2f` olive | shorts, fanny packs |
| 8 % | mixed | caps/bucket hats on 35 % of heads (black 60 %) |

### 2.5 Flags (the signature element)

- FACT: Flags from many nations are raised at Defqon.1, including Sweden, Italy, Japan, the USA
  (Chicago, Arizona), France (Lyon), Australia, England, Spain, Singapore, Albania, Norway, Finland,
  Mexico, Germany and the Netherlands, plus Q-dance/Defqon.1 flags and an EU flag "for unity" [S25].
  "Nowhere else in the Hardstyle scene do so many nations come together" [S25].
- FACT: Official flags (2026 store) [S27]:
  - "Sacred Oath" flag, **150 × 100 cm**, double-sided, black base (`#242424`) with red emblem
    (`#c02030`), black metal rings.
  - Tribe banners (Berserker, Guardian, Shaman), **40 × 150 cm** vertical pennants.
    Berserker: red `#e41818` / grey-blue `#90a8b4`. Guardian: terracotta `#c04848` / gold `#f0c060`.
    Shaman: yellow `#fccc0c` / black, green accents.
  - Defqon.1 Essential (black/white) and Q-dance black/white flags.
  (Hex values sampled from the product images, INFERENCE.)
- FACT: Power Hour fans come "prepared with flags, inflatables and costumes" [S72 summary]. There are
  thousands of beach balls and inflatable animals, and a giant Power Hour banner is passed from the
  front to the back [S24].
- UNKNOWN: official rules on flag poles (length/material). The 2026 FAQ and AYNTK pages do not mention
  them. Selfie sticks are limited to 1 m [S15], so long rigid poles may be restricted.
- ASSUMPTION (sim):
  - ~0.8 % of the crowd holds a flag up during the Endshow, i.e. ~450 flags at 55k. Density is highest
    in zones B-C.
  - Pole top at 2.8-4.5 m above ground (telescopic/fibreglass), flag 90 × 150 cm (national) or
    40 × 150 cm (banner).
  - Mix: NL 20 %, Defqon.1/Q-dance black/red 20 %, DE 10 %, BE 6 %, UK 5 %, AU 5 %, IT 4 %, FR 4 %,
    ES 3 %, PL 3 %, NO/SE/FI 5 %, CH/AT 3 %, US 3 %, MX/CL 3 %, other 6 %.
  - Motion: figure-eight waving at ~0.5-1 Hz on drops, hanging/slow sway during breakdowns. Flags are
    wind-driven (Beaufort 2-3 on a warm night) when not waved.

### 2.6 Dances and body motion

- FACT: Hardstyle is fist-pumped on the beat at ~150-160 BPM [S75 summary]. The 2026 festival even had
  a kickroll championship called "VIVA LA FIST" (Sat 11:00, INDIGO) [S12].
- FACT: **Hakken** is fast stepping that lands on the heels, synced to the kick. The lower body leads,
  with arms and torso secondary. It is done to all hard-dance genres incl. hardstyle and rawstyle, at
  up to 190 BPM [S29].
- FACT: **Jumpstyle** uses energetic jumps, fast kicks and rotational footwork with a stiff upper body,
  typically at 140-150 BPM. "Duojump" is the name when two people do it [S30].
- FACT: **Shuffle** is a fluid sliding motion with quick footwork [S76 summary].
- FACT: **"Losse polsjes"** ("loose wrists") went viral in 2026. It is a loose-wrist hand dance tied to
  Akimbo & Missy's "L.P.A. (Losse Polsjes Anthem)", with whole dancefloors copying it. The track
  "became part of 2026 Endshow history" [S28][S10 summary]. UNKNOWN: exact choreography.
  ASSUMPTION: forearms raised in front of the chest, hands flopping loosely from the wrist on each
  kick (~2.5 Hz at 150 BPM).
- FACT: Power Hour rituals are the **left-right** crowd sway (so strong it was "picked up on
  seismographs" per a secondary summary), the giant banner, "wall of death" splits, and throwing
  objects into the air [S24][S73].
- FACT (image `refs/stage/ig_popular.jpg`): in daytime aerials, **dust haze** rises from the dry field
  when the whole crowd jumps.
- UNKNOWN: a specific "hardstyle hands" gesture. No source found. Use raised fists, open palms and the
  loose-wrist move.

Motion recipe per agent (ASSUMPTION; hardstyle ≈ 150-155 BPM, so 1 beat ≈ 0.39-0.40 s):

| State | Share of crowd on a drop | Animation |
|---|---|---|
| Fist pump | 35 % | fist overhead on every kick (2.5 Hz) or every 2nd kick |
| Jump / bounce | 25 % (60 % in pit) | 10-25 cm hop on each kick, synced; pit waves |
| Hakken/shuffle/jumpstyle | 8 % | footwork, mostly in zone C where there is space |
| Hands up / open palms | 15 % (70 % on the first drop after a build-up) | both arms up, slow sway |
| Phone filming | 10 % (35 % during fireworks) | arm up, emissive screen quad (`#dfe8ff`, 150-300 nits) |
| Flag waving | 0.8 % | see 2.5 |
| Standing / talking / walking | rest (dominant in zone E) | idle sway 0.3-0.5 Hz |

On breakdowns (no kick): switch to slow sway (0.5 Hz), arms-up-and-wave, singing, and hugging
(pairs of agents leaning together).

### 2.7 Rituals during the Endshow (and how to map them to the 2026 tracklist)

FACTS:
- The Endshow is the nightly closing show with fireworks and lights [S12][S31]. It "closes the RED
  mainstage like an opera" [S73 summary].
- Closing ceremonies are emotional. A 2025 reviewer was "teary-eyed for almost the entirety" [S32].
  Sunday's 2024 Closing Ritual repeated the left-right "in the dark for the very first time" [S31].
- Crowd photos of Endshows show raised arms and phones in silhouette against the red/orange stage
  (local ref `refs/stage/DEFQON-ENDSHOW-1.jpg`).

ASSUMPTION: crowd-state timeline for the 2026 tracklist (video time):

| Time | Track | Crowd state |
|---|---|---|
| 00:00 | Vivaldi, "Winter" (Defqon.1 Version) | hush → cheers at first pyro; everyone faces the stage; phones up 35 %; flags lowered |
| 01:55 | Frontliner, "Discorecord" (Galactixx Remix) | euphoric: jumping, hands up on melody, flags up |
| 04:34 | D-Sturb ft. E-Life, "Sacred Oath" (2026 anthem) | anthem moment: mass sing-along to the vocal hook, flags waving, hugs; lots of red/black Sacred Oath flags |
| 09:27 | Akimbo & Missy, "L.P.A." | "losse polsjes" wrist dance by ≥50 % of zones A-C; laughter |
| 10:22 | Bass Modulators, "Sacred Flame" | fist pumps, jumping on the kick; arms thrown up at flame bursts |
| 14:46 | JDX, "Domitor Draconis" | raw/darker: harder fist pumps, head-banging, small mosh/pit in zone A |
| 18:18 | D-Block & S-te-Fan, "Embers" | emotional euphoric: arms around shoulders, swaying rows |
| 21:58 | Atmozfears & Jesse Jax, "In The Cold" | finale: hands up, phones up, hugging, tears; applause and cheering in the last 20 s |

- UNKNOWN: a documented "Defqon" / "One Tribe" chant. Q-dance does use "tribe" language [S20].
  ASSUMPTION: short "DEF-QON!" call-and-response chants when the music stops.
- INFERENCE: modern crowds use phone flashlights rather than lighters. No source for lighters at
  Defqon.1.

### 2.8 What the crowd looks like from far away (LOD reference)

- FACT (photos): In daylight from the stage or drone, the crowd reads as a continuous textured carpet
  of heads (skin + hair + caps). It is dotted with coloured flags on poles, inflatables and coloured
  smoke, and dust rises on jumps (`Defqon.1-Live.jpg`, `ig_popular.jpg`).
- FACT (photos): At night during pyro, the crowd is a dark silhouette field whose top edge is lit
  red/orange/magenta by the stage wash. Raised arms, phone screens (white points) and flag poles stick
  out above the head plane (`DEFQON-ENDSHOW-1.jpg`, `0003_20180624…jpg`).
- ASSUMPTION (LOD rules):
  - > 150 m: heightfield/impostor. Head plane at 1.65-1.75 m with ±8 cm noise. Arms-up sprites
    reach 2.1-2.3 m. Flags reach 3-4.5 m. Phones appear as 1-2 px emissive points.
  - Per-pixel colour at night = stage-light colour × 0.05-0.15 albedo. Rim light from pyro on
    heads and shoulders.
  - Crowd texture flicker: vertical jitter at the kick frequency, phase-coherent within ~10 m
    clusters and slightly delayed with depth (sound travels 343 m/s, so the back row at 250 m reacts
    ~0.7 s later unless delay towers compensate; with delay towers ~0.1-0.2 s).

---

## 3. Bars, drinks, payment, water, safety

### 3.1 Drink partners and brands

- FACT: In **Feb 2024** ID&T Group ended a **20-year partnership with Heineken** and signed a
  multi-year (three-year) partnership with **AB InBev**. It covers Defqon.1 Weekend Festival, focusing
  on **Bud** (Budweiser, sold as "Bud" in NL) and **Corona** [S33][S34].
- FACT: The official 2026 map sprite contains a red script **"Bud"** logo label. There are 4
  **Bud beer fast-lane** points ("fast lanes for beer lovers") [S21][S39].
- FACT: The 2026 map sprite has **Red Bull** and **Smirnoff ICE** label signs [S21]. The Red Bull
  label is placed on the map near "De Stamp Kroeg" and the "Orange Light Café". No placed Smirnoff
  feature was found in the exported data, so it is INFERENCE that it may belong to another day or
  version.
- FACT: A Beer Garden has offered specialty beers in a tasting format: Tripel Karmeliet, Hertog Jan
  Weizener, Goose Island Midway IPA, Leffe Blond [S41 summary]. All are AB InBev brands
  (INFERENCE). Earlier editions had a tasting area with "some twenty different local beers" [S39].
- FACT: Untappd check-ins at Defqon.1 (historic) include Heineken, H41, Desperados, Affligem and Brand,
  i.e. the Heineken-era portfolio [S40]. A limited-edition Defqon.1 Heineken can existed in 2013 [S42].
- FACT: Non-alcoholic options include sodas, fruit juices, smoothies and water [S39]. The Exclusive
  RED Experience includes "unlimited beer, wine, and a selection of mixed drinks and soft drinks" [S12].
- FACT: Official map points show **2 cocktail bar locations** and 1 Beer Garden [S21]. Hard seltzers
  and cocktails were sold in 2024 [S31].
- ASSUMPTION for the sim bar menu (2026):
  - Bud draught 0.25 L
  - Corona (bottle poured into a cup)
  - Bud 0.0 / alcohol-free
  - Coca-Cola-type soft drinks (brand UNKNOWN)
  - Red Bull (can)
  - Smirnoff Ice / mixed drinks
  - cocktails
  - water (bottle or pouch; pouches were unavailable in 2025 per [S32])

### 3.2 Where the bars are (RED area, 2026 official map)

- FACT (map, whole grounds incl. campsites): 24 "B" bar signs, 64 bar-counter module icons (26 unique
  locations), 4 Bud fast lanes, 2 cocktail bars, 1 Beer Garden, 10 top-up locations, 5 tap-water
  locations, 17 toilet blocks, 4 first-aid (EHBO) points, 1 Celebrate Safe point, 1 "cooldown" point,
  2 chill-outs [S21].
- FACT (map): bar modules are drawn in rows with **7.6 m** median spacing [S21].
  INFERENCE: each module is roughly one bar counter unit of ~7-8 m.
- FACT: bars are placed roughly every 50 m across the grounds [S39].

RED bars in stage-front coordinates (d = metres back from stage front, x = metres to the audience's
left) (FACT from map, ±5 m):

| Bar | Modules | d (m) | x (m) | Notes |
|---|---|---|---|---|
| RED-Left-Side | 6 in a line along the NE edge | 78-117 | +101 | inside the field edge, faces the field |
| RED-Right-Side | 6 in a line along the SW edge | 74-113 | −102 | mirror image |
| RED-Left-Rear | 4, diagonal | 159-173 | +56…+77 | Bud fast lane at (165, +56) |
| RED-Right-Rear | 4 | 165 | −97…−76 | Bud fast lane at (170, −97) |
| Tap water (free) | 2-3 points + toilets | 211-215 | +69…+85 | rear-left, next to toilet block |
| First aid (EHBO, "festival") | label | 163 | −140 | ~30 m outside the right edge |
| Top-up desks | 2 | ~178 | −140 | next to first aid |
| Exclusive RED Experience deck | grandstand | ~254 | 0 | rear centre, elevated |

Bar look:
- FACT: map pictograms are brown striped-awning booths with a "B" roundel. The top-up booth is red with
  a "D" coin roundel, and the water booth is blue with a drop [S21].
- UNKNOWN: real 2026 bar build photos not found.
- ASSUMPTION (real look):
  - Structure: 7-8 m counter modules built from scaffolding/container frames, clad in black or dark
    timber. Counter height 1.1 m, roof/fascia at ~3.2-3.8 m.
  - Front: a lit fascia header with the Bud logo on red (Bud red ≈ `#c8102e`, INFERENCE from the brand
    standard) and white script. A price/menu board, bracelet readers every ~1.5 m, and draught towers.
  - Lighting: warm white (3000 K) under-canopy LED strips.
  - Around it: a queue field of 10-15 m in front with 1-2 crush barriers, and recycle/cup return bins
    beside it.

### 3.3 Payment and prices

- FACT (2024): **tokens**, bundles 5/€20, 10/€40 … 25/€100 (**€4.00 per token**). Beer and soda cost
  1 token, hard seltzer "slightly more than 1", cocktail 3 tokens, chicken satay (3 sticks) 2.5 tokens
  [S31].
- FACT (2024): a Bud 0.25 L cost **€4.00**, joint third-most expensive of the festivals compared [S35].
  Festileaks reported **€15.20/L** (Heineken label, 2024 data) [S37]. The brand label conflicts with
  the Bud deal, so INFERENCE: the price is right but the brand label is probably outdated.
- FACT (2025 →): no more tokens. The **Legendary Bracelet** (leather with an NFC/RFID chip) is the
  ticket and the cashless wallet. Top-up is online (iDEAL, Maestro, VISA, MasterCard, Apple Pay,
  Google Pay, PayPal), on-site at self-service stations, or with cash at the (limited) staffed desks.
  Merchandise can also be paid with cash or card [S13][S19][S38].
- FACT: the remaining balance is refunded automatically within 3 weeks, minus **€2 per bracelet**.
  The ticket page lists **€12.50 per bracelet** (context: replacement or extra bracelet; UNKNOWN
  which) [S13][S19].
- FACT: sustainability rule: each visitor gets one **recycle token** on arrival and hands it in with the
  first drink for a reusable cup/can/bottle. Without a token or empty cup, **€2.00** extra is charged
  [S14][S39].
- FACT: campers may bring up to **4.5 L per person, max 14.9 % ABV** onto the campsite once per weekend
  ticket, but drinks must be finished before entering the festival gates [S18][S39].
- FACT: food costs about €8-16 per meal [S39]. A weekend on food and drinks typically costs €200-500
  (secondary estimate) [S77].
- UNKNOWN: 2026 drink price list. ASSUMPTION: Bud 0.25 L €4.30, soft drink €4.30, Red Bull €5.00,
  water 0.5 L €3.00, cocktail €12.50 (≈ 2024 prices + brewer increases of 3-6 % from 1 Jan 2025
  [S78 summary]).

### 3.4 Water, harm reduction, first aid, safety partner

- FACT: free water refill stations exist across the grounds. Sealed plastic bottles ≤ 500 ml and
  empty refillables are allowed; glass and metal bottles are not [S79]. Water points are near toilet
  facilities [S39].
- FACT (2026 heat protocol, 24 June) [S4]:
  - campers may bring **unlimited drinking water**
  - **free drinking water at sanitary buildings on camping and at all toilet facilities** on the
    festival grounds
  - **misting installations** at multiple locations
  - extended **covered rest areas**
  - **free sunscreen** at major toilet locations
  - **free outdoor showers** on campsites 1-6
  - advice: sunscreen, water, rest, salty food, light clothing and hats, avoid excessive alcohol and
    drugs in heat
- FACT: further heat measures [S5][S1] and secondary summaries [S80][S81]:
  - misting via **snow cannons and water-spraying poles**
  - **cooling stations/cooling cells and cooling showers at the medical posts**
  - fans at stages
  - all chill areas covered
  - hydration stations
  - extra shade
  - adjusted programme (Warrior Workout cancelled, Power Hour moved)
- FACT: **Celebrate Safe** stand "supported by Unity", near *The Monument*. Opening hours: Thu
  16:30-22:00, Fri-Sun 11:00-22:00 [S15]. On the map it is ~290 m from the RED centre, next to the
  "cooldown" point [S21].
- FACT: **Unity** is a volunteer peer-education project by and for young people from the dance scene.
  It gives objective information on alcohol and drug risks and is run by **Jellinek** [S43]. Tactus
  (addiction care) describes the same peer-to-peer festival model and names Defqon.1 among the
  festivals where the Unity team appears [S44, via search summary].
- FACT: First aid: four stations (campsites 1 & 5, bus entrance, **RED stage**), with the message
  "First Aid team is your friend, no judgement, no consequences" [S15]. **Camping Guardians** (24/7,
  mental-health support) are at tipis near the bath houses [S14].
- FACT: security rules: no climbing structures, no pushing, **no crowd surfing**; harassment is not
  tolerated [S14]. Drugs policy: **zero tolerance** (incl. weed/hash); **18+** [S17]. Smoking and vaping
  are only allowed in open air [S17]. Speakers ≤ 25 W, selfie sticks ≤ 1 m [S15].

---

## 4. Public-health facts for an EDUCATIONAL intoxication simulation

Framing for the build (ASSUMPTION, recommended):
- Effects must feel **impairing and uncomfortable**, not rewarding.
- Always show the consequences and where help is (water, shade, first aid).
- Never depict or explain acquiring or using substances.
- Put an on-screen disclaimer and link to Dutch help resources (drugsinfo.nl, jellinek.nl).
- Remember that Q-dance runs a zero-tolerance policy [S17].

### 4.1 Alcohol: effects by blood alcohol concentration

Unit note (FACT): Dutch promille (‰) ≈ grams of alcohol per litre of blood, so **1.0 ‰ ≈ 0.10 % BAC
(g/dL)**. 0.2 ‰ = 0.02 %, 0.5 ‰ = 0.05 %, 0.8 ‰ = 0.08 %, 1.2 ‰ = 0.12 %, 1.6 ‰ = 0.16 %,
2.0 ‰ = 0.20 %.

| ‰ (BAC) | Sourced effects (FACT) | Sim mapping (ASSUMPTION) |
|---|---|---|
| **0.2** (0.02 %) | Decline in visual functions (rapid tracking of a moving target) and in divided attention (NHTSA via [S52]). In the dark or bad weather, problems appear from 0.2 ‰ [S51]. Smooth-pursuit gain already significantly impaired at ~0.015 % [S54]. Mild relaxation, lower inhibition; taste, smell and vision start to decline (0-0.5 ‰ band) [S49]. | camera follow-lag +40 ms; −5 % contrast; slight warmth tint; no sway |
| **0.5** (0.05 %) | Reduced coordination, reduced ability to track moving objects, reduced response to emergencies (NHTSA via [S52]). Reaction speed and alertness fall from **0.3 ‰**, course-keeping worsens from 0.5 ‰, accident risk **+40 %** vs sober [S51]. At ~0.035 %: visual-motion direction noise **+30 %**, speed responsiveness **−28 %**, saccade peak velocity **−21 %**. By 0.055 %: pursuit gain **−22 %** [S54]. Saccades slow and latency grows in the 0.04-0.10 % range; gaze-evoked nystagmus appears around 0.06 % ([S54][S82] via search summary). | follow-lag 80 ms; motion-blur ×1.3; moving objects "smear"; −10 % contrast; input latency +50 ms |
| **0.8** (0.08 %) | Reduced concentration, short-term memory loss, speed control, reduced information processing (signal detection, visual search), **impaired perception** (NHTSA via [S52]). 0.06-0.099 % band: impaired **depth perception, glare recovery, peripheral vision**, reasoning [S53]. 0.5-1.5 ‰: mood and behaviour change clearly, perception and reaction worse, **tunnel vision** [S49]. Contrast sensitivity drops; colour perception is impaired [S55]. | vignette narrows FOV by ~15 %; bloom/glare persists 2× longer after strobes and pyro; stereo/DoF cue weakens; gaze jitter 0.2°; input latency +90 ms; gentle body sway 0.3 Hz, 1-2 cm |
| **1.2** (0.12 %) | NHTSA 0.10: reduced ability to maintain lane position and brake appropriately [S52]. 0.10-0.199 % band: **ataxia**, impaired gross motor skill, reflexes, slurred speech, **staggering**, possible nausea [S53]. Accident risk ~4× at 1.0 ‰ [S51]. Memory and reaction speed down, "you think you can do more" [S50]. | FOV −25 %; nystagmus-style horizontal jitter at lateral gaze; walking path random-walk ±0.3 m; stumble events; sound slightly muffled (low-pass 8 kHz) |
| **1.6** (0.16 %) | NHTSA 0.15: substantial impairment of attention and of **visual and auditory information processing** [S52]. 1.5-3 ‰: coordination deteriorates, emotional control disappears; physical signs are facial swelling/redness, **dilated pupils**, nausea [S49]. Muscle control reduced, blackout risk [S50]. Accident risk > 20× at 1.5 ‰ [S51]. | intermittent **double vision** (ghost offset 0.5-1.5°, ASSUMPTION threshold); strong sway 0.2 Hz, 5-8 cm; "spins" (the vertigo cause is endolymph changes in the inner ear [S53]); memory gaps (skip 1-3 s of HUD time) |
| **2.0** (0.20 %) | 0.20-0.299 % band: **anterograde amnesia (blackout)**, mood swings, nausea, partial loss of understanding, severe impairment, risk of unconsciousness [S53]. Senses are dulled at 3-4 ‰ and there is a risk of coma or death at 4 ‰+ [S49][S50]. | screen desaturation, heavy vignette, persistent double image, unstable camera; game forces "sit down / first aid" outcome; show a help prompt |

Other FACTs:
- Effects are stronger for inexperienced drinkers, young people and women at the same intake [S49][S50].
- WHO: "There is no form of alcohol consumption that is risk-free" [S56].
- Alcohol + heat: sweating plus drinking alcohol dehydrates you. Headache and dizziness signal
  dehydration [S64].
- UNKNOWN: a well-sourced numeric reaction-time curve vs BAC. The input-latency values above are
  design ASSUMPTIONS.

### 4.2 MDMA / XTC: documented effects and risks (no dosing)

Physical and perceptual effects (FACT):
- **Pupil dilation (mydriasis)**, raised heart rate, blood pressure and body temperature, stiff or
  tense jaws and **teeth grinding**, dry mouth and thirst, muscle tension, nausea, less appetite,
  sweating [S61][S63].
- Perception and sounds feel more intense. People report "increased sensitivity to sights, sounds,
  touch, and smells" [S61][S65]. "Music and colours are perceived differently" [S63]. At high
  intake: confusion, anxiety, hallucinations [S61].
- Clinical examination findings (eyes/jaw) include **mydriasis, nystagmus, decreased visual acuity,
  bruxism, trismus** [S66 via search summary].
- In controlled studies the most frequent acute complaints were **jaw clenching, lack of appetite,
  disturbance of balance and difficulty concentrating** [S67 via summary][S68]. Women reported more
  perceptual changes [S68].
- General time course (effects, not use guidance): onset tens of minutes. Main effects last a few
  hours [S61][S65], with after-effects that can last days [S61].
- INFERENCE (optics): dilated pupils let in more light and react less, so bright strobes, lasers and
  pyro cause **more glare, halos and light sensitivity**, and depth of field is reduced. Secondary
  sources describe photophobia with stimulant mydriasis (lower-quality source; treat as INFERENCE).

Risks (FACT):
- **Overheating (hyperthermia)**. XTC raises body temperature, and combined with a warm environment,
  long dancing and too little fluid this can become life-threatening. Consequences include high fever,
  seizures, bleeding, muscle breakdown and kidney failure [S57][S58][S62]. NIDA: "a dangerously steep
  rise in body temperature, called hyperpyrexia, particularly if they are very physically active or
  are in a warm environment" [S65]. Some people are very sensitive even to small amounts [S58].
  Under the influence the body's warning system fails, so people keep dancing in full sun while body
  temperature rises "toward 39 degrees or higher" [S69 summary].
- **Water intoxication (hyponatremia)**. MDMA causes release of antidiuretic hormone (vasopressin),
  so water is retained. Drinking large amounts in a short time dilutes blood sodium and the brain
  swells. Symptoms: nausea, vomiting, headache, reduced consciousness, convulsions, coma, death
  [S62][S64][S71]. Dutch public-health messaging warns against both too little and too much water
  (≈ max one glass per hour when at risk) [S57][S64].
- **Serotonin syndrome** (excess serotonin; more likely when mixing with other stimulants or certain
  medication). Signs: muscle contractions, heavy sweating, rapid heartbeat, high fever, tremor. It can
  be life-threatening [S62].
- **Cardiovascular**: vessels narrow and heart rate rises, raising the risk of heart attack or stroke
  [S62]. Rare acute liver failure [S62].
- **Psychological**: bad trips, panic and anxiety [S57][S62][S65]. The "dinsdagdip" comedown means
  fatigue, crying fits and poor concentration. On average people feel worse for **up to 3 days**
  afterwards [S59][S57]. Jellinek also lists derealisation, tingling, **vision problems** and
  dizziness in the comedown [S62].
- **Mixing** with alcohol or other drugs raises the risk and severity of all adverse effects [S57][S60].
  Adulterated pills are a documented risk [S65].
- **Dutch incident statistics**: 2024 had **6,184** acute drug incidents. **40 %** were reported by
  first-aid posts at (dance) festivals and parties, and ecstasy was involved in **26 %** [S60]. In 2023,
  **56 %** of drug incidents at festival first-aid posts involved ecstasy, and the share of moderate
  or severe intoxications rose [S59].

Sim mapping (ASSUMPTION; educational, uncomfortable, with consequences):

| Phase | Visual/audio mapping | Body/risk layer |
|---|---|---|
| Onset | slight colour saturation +10 %, audio "presence" boost (+2 dB 2-5 kHz) | heart-rate HUD ↑ |
| Peak | light sensitivity: bloom threshold −30 %, glare streaks and halos on lasers/strobes, lens flare ×2; fine horizontal eye jitter (nystagmus) 0.1-0.3° at 3-5 Hz; slight blur (reduced acuity) | **core-temperature meter** rising faster with dancing, crowd density and ambient heat; thirst icon; jaw-clench audio cue |
| Heat danger | tunnel vision, pulsing red vignette, audio low-pass, stumbling | warning at 38.5 °C, collapse/first-aid event at ≥ 40 °C (ASSUMPTION thresholds; hyperthermia is sourced, exact thresholds are not) |
| Over-hydration branch | headache blur, nausea sway | show hyponatremia message if the player spams water |
| Comedown | desaturation −30 %, dull audio, slower input, "3-day dip" epilogue card | show Celebrate Safe / Unity / first-aid info |

Heat context for the 2026 scenario (FACT): **code red** means "everyone can get health complaints
such as dehydration, overheating and heat stroke" [S45]. Hospitals were full during the event [S6].

---

## 5. Open questions / UNKNOWN

1. The date and time the empty-field Endshow was filmed, and the weather at that moment
   (thunderstorms on 27 June ~21:41 [S46]).
2. The official 2026 drink price list and the exact soft-drink, energy-drink and spirits partners.
   Red Bull and Smirnoff ICE appear as map labels [S21], but no contracts were found.
3. Real 2026 bar build photos (materials, branding, heights).
4. Flag-pole rules (length/material) at Defqon.1.
5. Official demographics (sex ratio, age distribution, nationality split).
6. The choreography of "losse polsjes" and any "hardstyle hands" gesture.
7. How many people stay at RED for a Saturday Endshow vs Power Hour (only Power Hour has a figure).

---

## Sources

Official / organiser
- [S3] Gemeente Dronten, "Defqon.1 verlaagt capaciteit op vrijdag en zaterdag vanwege code oranje": https://www.dronten.nl/actueel/defqon-1-2/
- [S12] Q-dance, AYNTK "Things to do at Defqon.1" (2026 schedule: Endshow Sat 22:40, Power Hour, RED Experience): https://www.q-dance.com/l/defqon-ayntk1-2026-things-to-do
- [S13] Q-dance, AYNTK "Ticket & bracelet info": https://www.q-dance.com/l/defqon1-ayntk-2026-tickets
- [S14] Q-dance, AYNTK "Safety, accessibility and sustainability": https://www.q-dance.com/l/defqon1-ayntk-2026-legendary-bracelet
- [S15] Q-dance, AYNTK "Preparing your trip" (Celebrate Safe/Unity stand, first aid, lockers, item limits): https://www.q-dance.com/l/defqon1-ayntk-2026-preparing-your-trip
- [S16] Q-dance, AYNTK "Merchandise": https://www.q-dance.com/l/defqon1-ayntk-2026-merchandise
- [S17] Q-dance, Defqon.1 2026 FAQ (zero tolerance, 18+, smoking): https://www.q-dance.com/l/defqon1-2026-faq
- [S18] Q-dance, Defqon.1 2026 All You Need To Know (heat changes, camping drinks allowance, opening hours): https://www.q-dance.com/l/defqon-1-all-you-need-to-know-2026
- [S19] Q-dance, FAQ Legendary Bracelets 2026: https://www.q-dance.com/l/defqon1-faq-2026-legendary-bracelet
- [S20] Q-dance, The Path (Challenger/Warrior/Berserker/Shaman/Guardian): https://www.q-dance.com/l/the-path
- [S21] Official Defqon.1 2026 interactive map (Mapbox style `mguntenaar/cmpo91136000401qw52xk7y4x`, web app https://defqon-map-web.vercel.app). Data exported locally to `scratchpad/refs/terrain/dq26_floorplan_merged.geojson` and the sprite sheet to `scratchpad/refs/crowd/sprite/`. Not committed.
- [S27] Q-dance Store product listings (Shopify `products.json`): https://store.q-dance.com/collections/defqon-1 · https://store.q-dance.com/collections/flags · https://store.q-dance.com/collections/headwear · https://store.q-dance.com/collections/defqon-1-festival-collection · https://store.q-dance.com/collections/defqon-1-the-release-collection-2026 · Sacred Oath flag: https://store.q-dance.com/products/defqon-1-flag-sacred-oath-double-sized-black-red-unisex
- [S41] Defqon.1 Festival Store, "Beer tasting at the Beer Garden" (via search snippet; store now closed): https://festivalstore.q-dance.com/products/beer-tasting-at-the-beer-garden
- [S42] Q-dance Facebook, limited edition Defqon.1 Heineken (2013): https://www.facebook.com/photo.php?fbid=10151668444696550&id=14937486549&set=a.158427896549

News / event coverage
- [S1] NL Times, "Defqon.1 festival canceled as Netherlands issues code red alarm for extreme heat" (2026-06-26): https://nltimes.nl/2026/06/26/defqon1-festival-canceled-netherlands-issues-code-red-alarm-extreme-heat
- [S2] Hardstyle.com, "Breaking News: Defqon.1 is cancelled": https://hardstyle.com/en/news/defqon1-is-cancelled
- [S4] De Drontenaar, "Hitteprotocol voor Defqon.1: extra waterpunten en schaduwplekken" (2026-06-24): https://www.dedrontenaar.nl/nieuws/biddinghuizen/365997/hitteprotocol-voor-defqon-1-extra-waterpunten-en-schaduwplekken
- [S5] PUNA, "Defqon.1 moet bijna 29.000 tickets de toegang tot het festival weigeren door hitte": https://www.puna.nl/news/defqon1-moet-bijna-29000-tickets-de-toegang-tot-het-festival-weigeren-door-hitte-het-was-een-lastige-beslissing
- [S6] Binnenlands Bestuur, "Burgemeester blikt terug op afgelast festival Defqon.1": https://www.binnenlandsbestuur.nl/bestuur-en-organisatie/burgemeester-blikt-terug-op-afgelast-festival-defqon1
- [S7] Hart van Nederland, "Defqon.1 voortijdig beëindigd door code rood": https://www.hartvannederland.nl/weer/extreem-weer/artikelen/flevoland-biddinghuizen-defqon-1-beeindigd-code-rood-hitte
- [S10] DJ Mag, "Defqon.1 share 2026 Endshow filmed without audience": https://djmag.com/news/defqon1-share-2026-endshow-filmed-without-audience-after-heatwave-cancellation-watch
- [S11] Hardnews, "Q-dance gives Defqon.1 the ending the tribe deserves": https://hardnews.nl/en/q-dance-gives-defqon-1-the-ending-the-tribe-deserves/
- [S22] Wikipedia, Defqon.1 Festival (attendance 2022-2025, stages, traditions): https://en.wikipedia.org/wiki/Defqon.1_Festival
- [S23] WeRaveYou, "Defqon.1 2023: Witness 65,000 people move as one during Power Hour": https://weraveyou.com/2023/06/defqon1-2023/
- [S24] Hardnews, "9 memorable moments during 3 years of Power Hour": https://hardnews.nl/en/9-memorable-moments-during-3-years-power-hour/
- [S25] Hardstyle Mag, "The United Nations of Defqon.1 – Raise your flags!": https://hardstylemag.com/united-nations-defqon-1-raise-flags/
- [S26] Hardstyle Mag, "Festival Fashion – The Crazy & The Cool of Defqon.1": https://hardstylemag.com/festival-fashion-crazy-cool-defqon-1/
- [S28] Hardnews, "'Losse Polsjes' has become the festival hype of 2026": https://hardnews.nl/en/losse-polsjes-has-become-the-festival-hype-of-2026/
- [S31] EDM House Network, "This was: Defqon.1 Weekend Festival" (2024; token prices, rituals): https://edmhousenetwork.com/this-was-defqon-1-weekend-festival/
- [S32] The Orange Courier, "Defqon.1 2025 Review": https://theorangecourier.com/defqon-1-2025-review/
- [S33] Emerce, "ID&T Groep en AB InBev sluiten meerjarig strategisch partnership" (2024-02-14): https://www.emerce.nl/wire/idt-groep-ab-inbev-sluiten-meerjarig-strategisch-partnership
- [S34] Sponsorreport, "ID&T Group en AB InBev maken festivalbezoeker onderdeel van een beleving" (2024-02-19): https://www.sponsorreport.nl/interviewid-t-group-en-ab-inbev-maken-festivalbezoeker-onderdeel-van-een-beleving/
- [S35] Hard News, "Hoeveel kost een biertje dit festivalseizoen?" (Defqon.1 2024: Bud €4.00 / 0.25 L): https://hardnews.nl/hoeveel-kost-een-biertje-dit-festivalseizoen/
- [S36] Bierfamilie, "Bierprijzen op festivals in 2025": https://bierfamilie.nl/blog/evenementen/blog-bierprijzen-op-nederlandse-festivals/
- [S37] Mannenpage (citing Festileaks 2024, €15.20/L): https://mannenpage.nl/biertje-defqon-1/
- [S38] Picamap, "Defqon.1: no more tokens, now cashless": https://www.picamap.com/defqon-1/cashless-bracelet
- [S39] Picamap, "Defqon.1 food" (bars every ~50 m, Bud fast lanes, water near toilets, €2 cup rule): https://www.picamap.com/defqon-1/food
- [S40] Untappd venue "Defqon.1": https://untappd.com/v/defqon-1/4952173/beers
- [S72] EDM.com, "Watch 65,000 People Dance In Unison for Defqon.1's 2023 Power Hour" (403; used via search summary): https://edm.com/events/defqon-1-2023-crowd-control-power-hour/
- [S73] Venga Store, Defqon.1 2026 guide (secondary): https://venga-store.com/blogs/music-festival-blog/defqon-1-2026-complete-guide-to-the-world-s-largest-hardstyle-festival
- [S74] Festivalinfo, "Defqon.1 schrapt duizenden dagtickets vanwege hitte" (+ search summary: 70,000 incl. 55,000 campers): https://www.festivalinfo.nl/news/59089/Defqon-1-schrapt-duizenden-dagtickets-vanwege-hitte/
- [S75] Hardcultr, "Hardstyle vs Hardcore" (fist pumping at 150-160 BPM; via search summary): https://www.hardcultr.com/guides/hardstyle-vs-hardcore-explained-2026/
- [S76] TikTok @phantomjumper, "Hardstyle dance styles" (via search summary): https://www.tiktok.com/@phantomjumper/video/7317334925131140385
- [S77] Kostenvaneen.nl, "Wat kost Defqon.1" (secondary): https://kostenvaneen.nl/bezoek-aan-defqon1-festival/
- [S78] Bierfamilie EN (brewer price increases 2025; via search summary): https://www.bierfamilie.nl/en/blog/evenementen/blog-bierprijzen-op-nederlandse-festivals/
- [S79] Hardcultr, "Defqon.1 2026 Survival Guide": https://www.hardcultr.com/news/defqon-1-2026-survival-guide-packing-list/
- [S80] IQ Magazine (via search summary: misting, extra outdoor showers, 70k→55k): https://www.iqmagazine.com/2026/06/european-events-dutch-french-called-off-extreme-heat/
- [S81] Festival Fans, "Wat doen festivals tegen de hitte dit weekend?" (via search summary: fans at stages, covered chill areas): https://festivalfans.nl/wat-doen-festivals-tegen-de-hitte-dit-weekend/

Weather
- [S45] KNMI, "Code oranje en rood voor extreme hitte van 24 tot en met 27 juni 2026": https://www.knmi.nl/kennis-en-datacentrum/achtergrond/code-oranje-en-rood-voor-extreme-hitte-van-24-tot-en-met-27-juni-2026
- [S46] KNMI, "Liveblog hitte en onweersbuien vanaf 22 juni 2026": https://www.knmi.nl/over-het-knmi/nieuws/liveblog-hitte-vanaf-22-juni-2026

Crowd science
- [S47] Prof. G. Keith Still, crowd density pages: https://www.gkstill.com/Support/crowd-density/CrowdDensity-1.html · https://www.gkstill.com/Support/crowd-flow/2People.html · https://www.gkstill.com/Support/crowd-flow/4People.html
- [S48] The Purple Guide, Venue capacity (via search summary) and Ticket Fairy blog (secondary): https://www.thepurpleguide.co.uk/venue-site-design/venue-capacity · https://www.ticketfairy.com/blog/festival-capacity-planning-and-crowd-density-calculations
- [S29] Wikipedia, Hakken: https://en.wikipedia.org/wiki/Hakken
- [S30] Wikipedia, Jumpstyle: https://en.wikipedia.org/wiki/Jumpstyle

Harm reduction / public health
- [S43] Jellinek, Unity: https://www.jellinek.nl/preventie/horeca/unity/
- [S44] Tactus, "Unity: peer-to-peer informatie op festivals": https://www.tactus.nl/kennisplein/unity-peer-to-peer-informatie-op-festivals/
- [S49] DRUGSinfo (Trimbos), "Alcohol: effecten": https://www.drugsinfo.nl/alcohol/effecten-van-alcohol/
- [S50] Jellinek, "Wat zijn de effecten van alcohol?": https://www.jellinek.nl/vraag-antwoord/wat-voelt-men-bij-alcohol/
- [S51] Trimbos-instituut, "Risico's van rijden onder invloed van alcohol": https://www.trimbos.nl/kennis/alcohol/alcohol-en-verkeer/risicos-van-rijden-onder-invloed-van-alcohol/
- [S52] NTSB, ".05 BAC Safety Briefing Facts" (reproduces the NHTSA impairment-by-BAC table), March 2023: https://www.ntsb.gov/Advocacy/safety-topics/Documents/Point-05%20SafetyBriefingFacts%20March2023.pdf (NHTSA original: https://www.nhtsa.gov/sites/nhtsa.gov/files/809844-theabcsofbac.pdf)
- [S53] Wikipedia, "Short-term effects of alcohol consumption" (BAC table): https://en.wikipedia.org/wiki/Short-term_effects_of_alcohol_consumption
- [S54] "Dose-dependent sensorimotor impairment in human ocular tracking after acute low-dose alcohol administration" (PMC7898833): https://pmc.ncbi.nlm.nih.gov/articles/PMC7898833/
- [S82] "Effects of acute alcohol ingestion on eye movements and cognition: a double-blind, placebo-controlled study" (PMC5638320; saccade/nystagmus ranges via search summary): https://pmc.ncbi.nlm.nih.gov/articles/PMC5638320/
- [S55] "Alcohol and the Eye" (review, PMC8126742): https://pmc.ncbi.nlm.nih.gov/articles/PMC8126742/
- [S56] WHO, Alcohol fact sheet: https://www.who.int/news-room/fact-sheets/detail/alcohol
- [S57] DRUGSinfo (Trimbos), "Risico's van XTC (MDMA)": https://www.drugsinfo.nl/xtc/risicos-van-xtc/
- [S58] DRUGSinfo, "Hoe ontstaat oververhitting bij XTC?": https://www.drugsinfo.nl/xtc/hoe-ontstaat-oververhitting-bij-xtc/
- [S59] Trimbos-instituut, "Xtc (ecstasy)": https://www.trimbos.nl/kennis/drugs/informatiepermiddel/xtc/
- [S60] Trimbos-instituut, "Drugsincidenten in 2024: combineren van drugs blijft zorgelijk": https://www.trimbos.nl/actueel/nieuws/drugsincidenten-in-2024-combineren-van-drugs-blijft-zorgelijk/
- [S61] Jellinek, "Wat is het effect van XTC/MDMA?": https://www.jellinek.nl/vraag-antwoord/effect-van-xtc-mdma/
- [S62] Jellinek, "Wat zijn de risico's van XTC/MDMA?": https://www.jellinek.nl/vraag-antwoord/risicos-xtc-mdma/
- [S63] Drugs en Uitgaan (Trimbos/GGD), "Effecten van XTC": https://www.drugsenuitgaan.nl/soorten-drugs/xtc/effecten/
- [S64] Drugs en Uitgaan, "Drugs en het weer": https://www.drugsenuitgaan.nl/drugs-en-het-weer/
- [S65] NIDA, DrugFacts "MDMA (Ecstasy/Molly)": https://nida.nih.gov/publications/drugfacts/mdma-ecstasymolly
- [S66] Medscape, "MDMA Toxicity – Clinical Presentation" (paywalled; via search summary): https://emedicine.medscape.com/article/821572-clinical
- [S67] Vollenweider et al. 1998, Neuropsychopharmacology, PubMed 9718588 (via search summary): https://pubmed.ncbi.nlm.nih.gov/9718588/
- [S68] Liechti, Gamma & Vollenweider 2001, "Gender differences in the subjective effects of MDMA", Psychopharmacology 154:161-168: https://link.springer.com/article/10.1007/s002130000648
- [S69] Unity, "Alles over MDMA/XTC" (via search summary): https://unity.nl/en/drug/xtc/
- [S70] De Druglijn (BE), "Partytip: voorkom oververhitting": https://www.druglijn.be/tips/uitgaan/partytips/oververhitting-drugs-xtc-cocaine-speed/
- [S71] "Rare but relevant: MDMA and hyponatraemia" (PubMed 41360080, via search summary): https://pubmed.ncbi.nlm.nih.gov/41360080/

Local reference images (scratchpad only, never committed):
`scratchpad/refs/stage/DEFQON-ENDSHOW-1.jpg`, `Defqon.1-Live.jpg`, `0003_20180624222600_kevin_4.jpg.webp.jpg`,
`250627_120108_DQ1_VINCENTVANDENBOOGAARD_5481-scaled.jpg`, `ig_popular.jpg`, `fb_edmlab_991489080456953.jpg`,
`scratchpad/refs/crowd/flags_combo.jpg` (merch flags/hand fan), `scratchpad/refs/crowd/sprite/icons_big.png`
(official map icons: Bud, Red Bull, Smirnoff ICE, bar/top-up/water booths, delay tower),
`scratchpad/yt/frames/f003_…`, `f087_…` (tower aisle from the air).
