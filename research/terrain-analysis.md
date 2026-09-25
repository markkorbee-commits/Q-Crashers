# Terrain analysis: the RED MainStage field, Defqon.1 2026 (Biddinghuizen)

Classification used in every claim: **FACT** (sourced/measured from a primary dataset, source given),
**INFERENCE** (strong deduction from several facts), **ASSUMPTION** (reasoned fill-in for the build),
**UNKNOWN** (could not be determined). Source URLs are in the Sources section (§17). Raw data and images
are in the scratchpad, never in the repo (§16).

---

## 0. Key numbers (TL;DR)

| Item | Value | Class |
|---|---|---|
| Local origin O (centre front of RED stage deck, floor level) | 52.4400834 N, 5.7575039 E (RD New 180179.1 / 494764.6) | INFERENCE (2024 stage front + paved-field edge, ±3 m) |
| Stage faces (stage → audience, +Z) | bearing **325°** (NW), ±0.5° | FACT (OSM road loop and aerial field edges are parallel to within 0.3°) |
| +X (audience-right) | bearing 235° (SW, towards YELLOW/PURPLE and the festival core) | derived |
| −X (audience-left) | bearing 55° (NE, towards Walibi Holland theme park) | derived |
| Field floor | concrete-paved rectangle **X −44…+44 (88 m) × Z 0…113 m**, then darker hard-standing to Z 137 | FACT (OSM grass polygon notch, PDOK aerials) |
| Terrain | **amphitheatre bowl**: flat floor at −2.38 m NAP; grass banks on three sides rise **+5.2 m** (sides, crest at X ±100…108) and **+5.5 m** (behind the stage, crest Z ≈ −58); open to the lake on the audience side | FACT (AHN4 DTM 0.5 m) |
| Field width, crest to crest | ≈ 208 m (X −104…+104); tree belts on the outer slopes out to X ±126 | FACT (AHN + OSM forest) |
| Depth, stage front to main road | 137 m (road centre Z ≈ 143, 12 m wide); to lake shore ≈ 172–184 m | FACT (OSM + aerial) |
| RED audience area (2026 floorplan polygon) | ≈ 35,400 m² including decking and premium deck; ≈ 29,500 m² for Z 0…137 | INFERENCE (floorplan georeferenced, ±5 %) |
| Capacity | ≈ 55,000–70,000 standing (2.0 p/m² over about 30–35k m²) | INFERENCE |
| Stage width (2024 RED, same site) | 114.5 m wide, 34 m high | FACT (Backbone International) |
| Delay towers ("lantern pillars") 2026 | **8 = 2 rows × 4**, X = ±21.5, Z ≈ 46.5 / 73.5 / 100.5 / 127.5 | INFERENCE (official floorplan layer `fest_delay`, ±8 m) |
| Delay tower height | ≈ 15–19 m | INFERENCE (2024 shadow ratio against the 34 m stage) |
| FOH | not on any map; proposed on the axis at Z 58–68 | UNKNOWN; placement is an ASSUMPTION |
| Bars (2026) | 2 long bars on the side-bank crests (X ±97…104, Z ≈ 30–78) and 2 at the back corners (Z ≈ 118–133) | INFERENCE (floorplan, ±8 m) |
| Toilets | none inside the field; blocks at the back-left corner (X ≈ −123, Z ≈ 146) and beyond the right bank (X ≈ 190, Z ≈ 137) | INFERENCE (floorplan) |
| Entrances | the whole back edge (along the 12 m main road); main flow from the back-right (west, festival core); second flow from the back-left (lake-loop route). No side entrances through the banks | INFERENCE |

---

## 1. "Holy Grounds": how the term is used

- **FACT**: Q-dance uses "Holy Grounds" for the Defqon.1 festival site in Biddinghuizen as a whole
  ("Defqon.1 2026 is completely sold out. See you at the Holy Grounds!"; "the road back to the Holy Grounds").
  It is sometimes set against the campsite ("explore both the Holy Grounds and the Camping Grounds")
  and sometimes includes it ("The Highlands Campground: your hassle-free retreat on the Holy Grounds").
  Sources: Q-dance FAQ 2026 and the Q-dance Defqon.1 page.
- **FACT**: The official site address is Spijkweg 30, 8256 RJ Biddinghuizen (Q-dance FAQ). This is the
  Walibi Holland address (OSM way 409832086). The venue is the "Evenemententerrein Walibi Holland", which
  also hosts Lowlands and Opwekking (walibi.nl). Defqon.1 has been held there since 2011 (Wikipedia).
- **INFERENCE**: "Holy Grounds" is not the name of the RED field. The RED area is called "RED" /
  "RED Mainstage" on the official map. The premium zone is "Exclusive RED Experience", described as
  "the best spot available on the Holy Grounds, located right in front of the mighty RED Mainstage"
  (FACT, FAQ).

## 2. Data acquired (what was downloaded and how)

| Dataset | How | Result | Class |
|---|---|---|---|
| **Official 2026 festival floorplan (vector)** | The fan site `defqon-map-web.vercel.app` embeds the official Defqon.1 2026 and 2025 floorplans as Mapbox styles (user `mguntenaar`, one style per day). Downloaded the style JSON and all z16 vector tiles, then decoded them with `mapbox-vector-tile` | 1,061 merged features, 94 layers (stage areas, paths, trees, water, flonders = decking, fences, gates, **`fest_delay` = delay towers**, bars, restrooms, tap water, EHBO, labels). Static renders of the Thursday, Saturday and 2025 styles saved | FACT for layer content; geometry is a **stylised illustration**, georeferenced to roughly ±10 m |
| 2025 official floorplan (vector) | Same method, style `DQ25 SATURDAY` | layers `speakers` (delay towers), `bar_250623`, restrooms, etc. | FACT (same caveat) |
| OpenStreetMap | **Overpass API failed**: overpass-api.de reset every connection through the agent proxy, kumi.systems timed out, private.coffee returned 504. Used the **OSM API v0.6 `map` call** for bbox 5.742,52.432,5.768,52.446 instead | 19,433 nodes, 1,861 ways, 49 relations (4.6 MB XML) | FACT (ODbL) |
| PDOK aerial orthophotos (Beeldmateriaal NL) | WMS `luchtfotorgb`, layers Actueel/2026/2025/2024/2023/2022/2021/2019/2018 | The **2024_orthoHR** image was flown **during the Defqon.1 2024 build-up**: the RED stage, delay towers, bars and premium deck are all visible. The Actueel/2026 image shows the empty site in spring 2026 | FACT |
| AHN4 elevation (DTM 0.5 m) | PDOK WCS `dtm_05m`, 500 × 500 m | Heightmap resampled to a 2 m grid in the local frame | FACT |
| Endshow storyboard frames | already extracted (320×180 px, one every ~9.9 s) | pillar rows, arms, pyro lines | FACT (visual, low resolution) |
| Official 2026 map as a PDF/PNG from defqon1.com or the app | not found. The web-search budget ran out mid-task; the fan site's Mapbox version is the official map content | the vector floorplan replaces it | UNKNOWN whether a PDF exists |

## 3. Site overview and orientation

- **FACT (OSM, aerials)**: The RED field sits at the NE end of the festival terrain, directly west of the
  Walibi Holland theme park and south-east of a recreation lake. The field axis runs NW–SE. The stage stands
  at the SE end and faces NW (bearing 325°). The audience looks SE (145°).
- **FACT (OSM + aerial)**: The site grid (Flevoland polder grid) runs at 55°/145°/235°/325°. The RED paved
  field, its perimeter service lanes and all adjacent roads follow it (OSM loop way 60195507 edges deviate
  0.04–0.28° from 325°).
- **INFERENCE (ephemeris, PyEphem at the site)**: On 26–28 June the sun sets at azimuth ≈ 312° at 22:04
  CEST. Civil dusk is at 22:55 and nautical dusk at 00:14 CEST. The low sun and the brightest twilight are
  behind the audience and in front of the stage, so a camera looking at the stage sees the darker SE sky.
- **FACT (OSM, rcdb)**: The Walibi *Goliath* roller coaster (46.9 m tall) stands behind the RED stage on
  the audience-left side. Its track runs X −178…−73, Z −365…−64 in the local frame. **INFERENCE**: its lift
  hill and structure rise above the ~20 m tree line behind stage-left, which makes a good distant skyline
  silhouette.

## 4. Local metric coordinate system (proposal, adopted in this document)

- **Origin O**: centre of the front edge of the RED stage deck, at audience floor level.
  WGS84 **52.4400834 N, 5.7575039 E**; RD New (EPSG:28992) **x = 180179.1, y = 494764.6**.
  - INFERENCE: O is the midpoint of the paved field's SE edge, on the centreline of the OSM perimeter-lane
    loop (lanes at X = −43.4 / +43.3). It coincides with the 2024 stage front measured on the 2024 aerial
    (facade front at Z ≈ 0 ± 2; the stage centre is X ≈ −2.7, the brightness-measured paved centreline
    X ≈ −0.3…+1.5). Uncertainty is ±2.5 m in X and ±3 m in Z.
- **Axes (Three.js, right-handed)**: +Y up. **+Z** = from the stage into the audience = bearing 325°.
  **+X** = audience-right = bearing 235°. A camera standing in the crowd and looking at the stage looks
  along −Z and has +X on its right.
- **Height datum**: Y = 0 is the paved floor at O = **−2.38 m NAP** (AHN).
- **Conversions** (spherical approximation at 52.44°N; error < 0.1 m over ±500 m):
  ```
  e = (lon − 5.7575039) · 68001.1      // metres east
  n = (lat − 52.4400834) · 111275.7    // metres north
  X = −0.819152·e − 0.573576·n
  Z = −0.573576·e + 0.819152·n
  inverse:  e = −0.819152·X − 0.573576·Z ;  n = −0.573576·X + 0.819152·Z
  Y = h_NAP + 2.38
  ```
- Floorplan (stylised) → local frame, least-squares fit on the ring lanes, the main road and the lake shore:
  `X = 0.97·x_fp + 0.10`, `Z = 1.024·z_fp + 46.45`, where (x_fp, z_fp) is the provisional frame used during
  analysis (script `final_frame.py`). Expected residual is ±5–10 m.

## 5. Ground truth: permanent terrain (OSM + PDOK aerials + AHN)

### 5.1 Relief: the field is a bowl (important)

AHN4 cross-sections in the local frame (FACT; the values below are Y = height above floor):

| Location | Y (m) |
|---|---|
| Paved floor X −44…+44, Z 0…113 | 0 (crown +0.15 at X = 0; gutters −0.25 at X ≈ ±28–30, where the aerial shows gully inlets every ~10 m) |
| Side bank inner slope, \|X\| 46 → 100 | rises linearly 0 → **+5.2** (≈ 9.6 %, 5.5°); e.g. \|X\| = 60: +1.25; 80: +3.2 |
| Side bank crest \|X\| 100…109 | +5.2…+5.9 |
| Side bank outer slope \|X\| 109 → 126 | +5.4 → 0 (≈ 31 %, 17°); tree belts stand here |
| Side banks' extent along Z | Z ≈ −20 … +105; they end at the back corners with a 10 m ramp (Z 105 → 115) |
| Rear bank behind the stage, Z −5 → −60 | rises 0 → **+5.5** (≈ 10 %); crest Z −62…−55 (+5.3…+5.7); falls to +0.9 at Z −90 behind it. A notch about 1 m lower at X ≈ −6…+6 (backstage ramp) |
| Back plaza, road and decking Z 113 → 172 | 0 → −0.5 (gentle fall towards the lake) |
| Lake shore | Z ≈ 172–184 (X −60…+60); water surface ≈ **Y −1.8** (INFERENCE: last dry DTM cells at −4.1…−4.3 NAP) |

- **INFERENCE**: the RED field is a U-shaped earth amphitheatre, closed on the stage side and on both
  flanks and open towards the lake. Anyone on the side banks stands up to 5 m above the floor. The bars on
  the crests overlook the field.
- Heightmap export: `refs/terrain/ahn_heightmap_redframe_2m.json`, 161 × 186 samples, X −160…160,
  Z −100…270, 2 m step, metres NAP. Hillshade image: `ahn_hillshade_redframe.png`.
- **ASSUMPTION**: a simple analytic terrain function matches the AHN data to ±0.3 m:
  ```
  side(X,Z) = (−20 ≤ Z ≤ 105) ? clamp((|X|−46)·0.096, 0, 5.2) (+crest 5.2..5.6 for |X| 100..109,
              then 5.4 − (|X|−109)·0.32 for |X| 109..126) : 0     // smooth 10 m ramp at Z 105..115
  rear(Z)   = (Z < −5) ? clamp((−Z−5)·0.10, 0, 5.6) : 0          // crest Z −62..−55
  Y = max(side, rear); for Z > 113: Y = −0.5·(Z−113)/59
  ```

### 5.2 Surfaces, roads and trees (local coordinates, metres)

| Feature | Geometry | Source / class |
|---|---|---|
| **Paved floor** (concrete slabs, light grey) | rectangle X −44…+44, Z 0…113. Edge service lanes 2–3 m wide along X ≈ ±43 and Z ≈ −2…−4 (OSM loop 60195507: (−43,−2)→(43,−4) and up both sides to Z 143) | FACT (OSM grass 77393787 has exactly this notch; aerials) |
| Darker hard-standing (asphalt or compacted) | X −44…+44, Z 113…137 | FACT (aerial) |
| **Main E–W road** (12 m, light gravel/asphalt) | centreline (−137,94)→(−131,110)→(−114,131)→(−87,144)→(−44,143)→(43,143)→(128,160)→(188,179)→(245,181) | FACT (OSM 60195506 width=12, 60195507) |
| Paved cross-paths on the banks | Z ≈ 21, from the floor edge to the crest path, both sides; crest service paths along X ≈ −107…−99 and +98…+106 | FACT (2026 aerial) |
| Backstage roads | behind the rear bank: (89,−69)→(−35,−68)→(−54,−94) (OSM 802215880); ramp (−32,−2)→(−38,−68) (802215882); (−49,−101)→(92,−105) (1120634215) | FACT (OSM) |
| Backstage gravel pad | X −18…+19, Z −68…−34 | FACT (aerial) |
| **Tree belt left** (on the outer slope of the left bank) | OSM forest 66342521: (16,−59)(17,−63)(−40,−63)(−54,−82)(−64,−75)(−123,−71)(−128,−63)(−128,−37)(−124,−34)(−121,82)(−118,91)(−91,117)(−48,116)(−48,107)(−84,107)(−91,105)(−108,89)(−108,−48)(−105,−55)(−97,−58)(16,−59) | FACT (ODbL) |
| **Tree belt right** | OSM forest 66340386: (128,−38)(124,−57)(118,−66)(109,−73)(98,−78)(87,−65)(24,−63)(27,−58)(87,−57)(99,−55)(105,−51)(108,−34)(108,99)(58,109)(56,113)(129,113)(128,−38) | FACT (ODbL) |
| Tree belt behind the stage | contained in the two polygons above: Z −63…−57 trunk line, canopy Z −68…−46 in summer (2024 aerial); gap and ramp near X ≈ −33 and X ≈ 16…24 | FACT |
| Trees: species and height | deciduous windbreak belts (poplar, willow, ash typical for Flevoland); canopy ~15–22 m | ASSUMPTION |
| **Lake** (south of the field, behind the audience) | OSM water 689953672: (−108,246)(−29,251)(−19,245)(−3,246)(28,255)(44,256)(204,251)(215,244)(227,225)(209,217)(67,215)(62,210)(59,183)(52,175)(40,174)(−2,180)(−31,178)(−50,172)(−78,182)(−114,184)(−118,188)(−120,210)(−119,233)(−108,246) | FACT (ODbL) |
| **Beach** (sand, far shore) | ≈ X −20…+20, Z 255…275 (floorplan label `l_beach`, fp "Crab"/"Slide" deco; sand visible in all aerials) | FACT |
| Lake-side track (far shore) | OSM 689953671: (247,220)(231,245)(210,261)(183,267)(48,262)(0,275)(−37,262)(−79,260)(−120,252)(−130,243) | FACT |
| Footbridge over the lake (2024) | X ≈ +71…+77, Z ≈ 213…256 (pontoon) | FACT (2024 aerial) |
| Drainage ditches | X ≈ 140 (OSM drains 1120784581/4), outside the right belt | FACT |
| Festival and Walibi boundary fence | OSM 689953659 (X −176…−147, Z −46…91); floorplan fence X −132…−124, Z 122…274 (dashed line on the map) | FACT |

Colour hints (medians of the aerial pixels; INFERENCE for albedo, since exposure varies):
concrete floor `#a9a99c`, edge lanes `#8f8d86`, hard-standing `#858278`, road `#b2ac9b`,
beach sand `#cdcab9`, lake `#1f2a2c`–`#303e3e`, summer tree canopy `#2a3230`–`#3e5a2c`.
**ASSUMPTION**: after the June 2026 extreme heat the grass banks were parched yellow-green, around `#7c7f4a`.
A lush alternative is `#56703a`.

## 6. The 2024 aerial: the RED field during the Defqon.1 2024 build-up (FACT, measured)

PDOK `2024_orthoHR`, 0.2 m/px, rotated into the local frame (`rot2024_field.jpg`, `rot2024_stage.jpg`,
`rot2024_towers.jpg`, `z2024_*`):

- **Stage**: red structure X −57.4…+52.0 (≈ 109 m seen from above, centre X ≈ −2.7; Backbone gives
  114.5 m × 34 m high). Rear line at Z ≈ −18, facade front at Z ≈ 0. A central thrust/booth element
  X −5…+2 reaches Z ≈ +18. White production tents sit behind the centre (Z ≈ −24). Ground under the
  stage rises from Y 0 (front) to about Y +1.4 (rear), because the stage stands on the toe of the rear
  bank (§5.1).
- **Side and backstage fences**: a fence line at Z ≈ −6 (±3) runs from each stage end to the bank crest
  (X ≈ ±96). On the right it then runs along the crest down to Z ≈ +18.
- **Delay towers**: 8 red towers in 2 rows at X −23.8 / +21.3 and Z ≈ 34, 69.5, 105, 148.5 (the last
  pair stands on the decking behind the road). The long shadows give a height of about 15–19 m (INFERENCE).
- **Two continuous red lines** run along the tower rows (X ≈ −23 and +21) from the stage front to the
  decking (Z ≈ 0 → 170). **UNKNOWN**: cable ramps or bridges feeding the delay towers (most likely), or
  barrier lines.
- **Bars**: tan tensile-tent bar rows on both crests (X ≈ −102…−96 over Z 18–90, and +96…+104 over
  Z 20–90). Two red container bars flank the paved floor at X ≈ −54…−43 and +42…+54, Z ≈ 43–64
  (≈ 21 × 11 m; red printed roof banner plus a black canopy half).
- **Decking** ("flonders" timber boards): X −50…+48, Z 145…172.
- **Premium deck over the lake** (the "Exclusive RED Experience" type deck): X −52…+50, Z 172…210, with
  three tensile tent roofs (X −53…−20, −12…+13, +16…+50; roof band Z 188…201). The front terrace is at
  Z 180…188, a lower platform at X −12…+12, Z 205…214, and ramps from the decking at X ≈ −26, −10, +22, +40.
- **Ferris wheel** (PURPLE area) at X ≈ 90, Z ≈ 184, diameter ≈ 32 m, wheel plane parallel to Z.

## 7. The official 2026 floorplan, mapped into the local frame (INFERENCE, ±8 m)

Source: the Mapbox floorplan styles `DQ26 THURSDAY/FRIDAY/SATURDAY/SUNDAY`, tilesets `DQ26_BASE_260527`,
`DQ26_TENTS_260617` and `DQ26_LEGENDA_260617` (last edited 17 June 2026). On Thursday the RED area shows
"CLOSED ON THURSDAY" (FACT).

| Element | Local coordinates | Notes |
|---|---|---|
| RED area polygon (`base_area` fid 8, #ff0000) | (70.8,230)(70.7,105.7)(113.3,104.9)(113.1,6.4)(85.4,0.7)(82.5,−3.7)(81.9,−21.8)(35.9,−31.4)(33.2,−34.9)(32,−44.5)(−32.3,−43.3)(−33.5,−33.7)(−36.2,−30.1)(−82.4,−18.9)(−84.1,2.2)(−87.3,4.3)(−113.7,10.4)(−113.7,202.8)(−70.9,201.8)(−70.9,233) | 35,400 m² in total. Includes the side banks, back plaza, decking and premium deck |
| RED "floor" polygon (fid 9, grey #838383) | X −52…+52, Z −12…+141 (rounded front corners) | the stylised paved floor plus ring lane (real paved area: X ±44, Z 0…113) |
| Stage outline (`area_sat_base` fid 11 + black top) | U-shaped band: centre X ±33 at Z ≈ −45…−52; steps to Z ≈ −31…−38 at \|X\| 34–41; sloping side sections to (±83, −22); arms forward to (±88…90, +1…+4) | **Not literal** (see below) |
| **Delay towers** (`fest_delay`, icon `tower_delay_red`) | X **−21.4 / +21.6**; Z **46.5, 73.5, 100.7, 127.7** | 2 rows × 4, 43 m apart, 27 m spacing |
| Bar L (6 service points, `legend_bar`) | X −98.0; Z 35.3, 43.2, 51.1, 59.0, 66.9, 74.9; "B" icon at (−98.0, 82.1) | on the left crest, faces +X |
| Bar R (6 points) | X +99.2; Z 31.6, 39.5, 47.4, 55.3, 63.2, 71.2; icon (99.3, 78.4) | on the right crest, faces −X |
| Bar back-left (4 points) | (−74.2,133.1)(−67.4,128.4)(−60.6,123.5)(−53.9,118.6); icon (−74.3,140.5) | diagonal, near the road |
| Bar back-right (4 points) | (74.1…95.3, 124.7); icon (81.4, 131.9) | |
| Beer "fastlane" points | (−53.8, 124.2), (95.3, 130.0) | |
| Toilets (`legend_point_restroom`) | (−123, 148) and (190, 139) | outside the field, near both back corners |
| Tap water / fresh points | (−74.3,171.4), (−81.7,171.6), (−110.7,145.7), (−66.8,171.3) | back-left, by the lake |
| First aid (`EHBO`, `l_ehbo_fest`) | (116.7, 122.7) | back-right corner |
| Accessible (wheelchair) point | (−35.9, 190.7) | on the premium deck |
| Premium deck ("Exclusive RED Experience", `l_red_exp`, `l_premium_s`) | structures X −40…+40, Z 190…209; entrances `l_red_exp_entrance` (51, 209) and `l_red_exp_entrance_alt` (−52, 184) | |
| Decking (flonders) | Z ≈ 150…170 behind the road | |
| Ferris wheel (deco) | (86.5, 187.5) | PURPLE area |

- **INFERENCE: the floorplan's stage band is a stylised "stage zone" outline and does not show the stage's
  real position.** Taken literally, its centre (Z −45…−52) would stand on the upper rear bank inside the
  tree belt. The 2026 spring aerial shows those trees intact, and the 2024 stage stood at Z −18…0. The
  2025 floorplan has the identical band, but its first delay-tower row lies at Z 36.5, which matches the
  2024 aerial's Z ≈ 34. That indicates the 2025 stage stood where the 2024 stage did. The band's arm tips
  (±88, +2) do match the front corners of the field and the 2024 side-fence line (Z ≈ −6 … 0 at X ≈ ±96).
  The band is best read as the backstage fence line.
- **INFERENCE (weak)**: the 2026 tower rows are shifted ~10 m further from the stage than in 2025
  (row 1 at Z 46.5 vs 36.5). This fits a 2026 stage whose centre front (stairs or thrust) extends further
  forward. The Endshow frames show a stepped platform in front of the stage centre (frames #9, #29, #72).
  **UNKNOWN**: the exact 2026 deck-front position (±5 m).

### 7.1 Year comparison: delay towers and bars

| Year | Source | Delay tower rows (X) | Tower Z positions | Bars next to the paved floor |
|---|---|---|---|---|
| 2024 | aerial (FACT) | −23.8 / +21.3 | 34, 69.5, 105, 148.5 | yes (2 red container bars) |
| 2025 | floorplan layer `speakers` (INFERENCE ±8 m) | −21.0 / +22.0 | 36.5, 63.6, 90.7, 117.7 | yes (points at X ±46, Z 40–57) |
| 2026 | floorplan layer `fest_delay` (INFERENCE ±8 m) | −21.4 / +21.6 | 46.5, 73.5, 100.7, 127.7 | **no**, bars only on the crests and back corners |

## 8. The "lantern pillars" in the 2026 Endshow footage

- **FACT (frames 00:29, 00:39, 04:07, 05:26, 06:35, 14:19)**: two parallel rows of 4 tall pillars stand
  on the paved field between the drone and the stage. Each is a dark, square-section shaft with gothic
  arched panels lit warm amber/orange from inside (~`#ff8a2a`). On top sits a lantern with a pointed roof
  that glows cyan/blue (~`#39c8ff`) in most scenes. In others it carries **flame or torch effects** (frames
  #72 at 11:51 and 14:19, where the tops burn orange). Seen from the stage (frame #40 at 06:35) the nearest
  pillar is about 4–5 times taller than it is wide.
- **INFERENCE (strong)**: the lantern pillars are the **8 RED delay towers, dressed as gothic lantern
  pillars** for the 2026 "Sacred Oath" castle theme. The evidence:
  1. The official 2026 floorplan puts exactly 8 `tower_delay_red` icons in the same 2 × 4 pattern on the
     paved floor.
  2. The Endshow drone shots show exactly 4 pairs, with a row spacing of roughly ⅓–⅖ of the stage width
     (≈ 43 m / 115 m).
  3. The same 2 × 4 tower layout appears in 2024 (aerial) and 2025 (floorplan).
- Size (INFERENCE): footprint ≈ 3–3.5 m square. Height to the top of the lantern ≈ 15–19 m (2024 shadow
  ratio against the 34 m stage). Lantern ≈ 2.5 m wide and 3.5 m tall, with a 1.5 m spire (ASSUMPTION).
  Delay line arrays hang inside or behind the shaft at ~10–12 m, aimed at +Z (away from the stage)
  (ASSUMPTION).

## 9. FOH (front of house)

- **UNKNOWN**: the FOH position is not on the 2024–2026 floorplans and cannot be identified on the 2024
  build-phase aerial (the FOH was probably not built yet). In the Endshow drone frames (04:07, 14:19) a
  small dark object sits on the axis between the tower rows at roughly the depth of the second pair.
  Resolution is too low to confirm it.
- **ASSUMPTION (industry practice, 60–90 m from the stage on the axis)**: FOH centre at **X 0, Z 63**,
  footprint 16 m (X) × 10 m (Z). Two-tier scaffold: control deck at +1.0 m, upper tier (lighting, video,
  pyro, lasers) at +4.0 m, black-scrim roof at +8 m. A crowd barrier ring 20 × 14 m (X ±10, Z 56…70).
  A cable bridge runs along the axis from the FOH to the pit (Z 3…56).

## 10. Neighbouring stages and areas (2026 floorplan, local coordinates, INFERENCE ±10 m)

| Area | Centroid (X, Z) | Distance / bearing from O | Extent |
|---|---|---|---|
| PURPLE (with Ferris wheel) | (101, 196) | 220 m / 298° | X 69…134, Z 167…224 (back-right, next to the lake) |
| YELLOW | (182, 18) | 183 m / 241° | X 153…211, Z −52…88, beyond the right bank |
| INDIGO | (246, −85) | 260 m / 216° | |
| BLACK | (277, −245) | 369 m / 194° | |
| GOLD | (350, −43) | 353 m / 228° | |
| SILVER | (375, −153) | 405 m / 213° | |
| Orange Light District | (373, 67) | 379 m / 245° | |
| MAGENTA | (385, 132) | 407 m / 254° | |
| UV | (311, 244) | 395 m / 273° | |
| BLUE | (445, 257) | 514 m / 265° | |
| Streetfood Street (food court) | (55, 272) | far shore of the lake | |
| Walibi Holland: Goliath coaster (46.9 m) | track X −178…−73, Z −365…−64 | behind stage-left | FACT (OSM, rcdb) |

## 11. Entrances, circulation, fences

- **INFERENCE (floorplan paths + OSM + aerial)**: the RED field has no gates of its own. It is open along
  its entire back edge (Z ≈ 113–149), where the 12 m main road runs across. Visitors arrive:
  - **E1, main (back-right / west)**: from the festival core (PURPLE, YELLOW, Food Fest) along the main
    road via (188,179) → (128,160) → (43,143), entering between the right bank's end (Z ≈ 107) and the
    PURPLE area. This is the thick dark-brown main path on the official map.
  - **E2 (back-left / north-east)**: from the lake-loop road and the "alternative route to RED" (label
    `l_red_route_alt` at ≈ (215, 262) on the far lake shore), via (−137,94) → (−114,131) → (−87,144),
    passing the WC block at (−123,148).
  - The two perimeter lanes of the paved floor (X ±43) lead from the road down to the front.
- **INFERENCE**: there are no side entrances through the banks and tree belts. No paths cross them on the
  2026 floorplan; the crests carry bars and service paths. Emergency exits presumably exist but are not
  mapped (UNKNOWN).
- **Fences**: the backstage fence runs along Z ≈ −6 from the stage ends to the crests (FACT 2024). The
  front-of-stage pit barrier is ASSUMED at Z ≈ +3. The festival perimeter fence (Walibi side) is outside
  the left belt at X ≈ −130…−150 (FACT, OSM/floorplan). Barriers around towers and FOH are ASSUMPTION.

## 12. Field size and capacity

- Floor (paved + hard-standing) 88 × 137 m ≈ 12,000 m². Side banks ≈ 2 × 58 × 125 ≈ 14,500 m² (less the
  fenced strip in front of Z −6). Back plaza, road and decking (Z 113–172) ≈ 10,000 m². Premium deck
  ≈ 4,000 m² (INFERENCE, measured).
- The official RED polygon is 35,400 m², of which 29,500 m² lies between the stage and the road (INFERENCE).
- At 2.0 persons/m² (dense but moving) that gives ≈ 60–70k; at 2.5 p/m² ≈ 75k (upper bound). For
  comparison, Wikipedia gives 268,236 visitors for the 4-day 2025 edition, ≈ 67k per day on average (FACT).
  **INFERENCE**: a full RED Endshow crowd is roughly 55–70k. The 2026 Endshow itself was filmed with **no
  audience** (FACT, project context and EDMTunes).
- ASSUMPTION for crowd rendering, if a crowd is added as a "what if": 4 p/m² in the first 25 m, 3 p/m² to
  Z 60, 2 p/m² to Z 110, 1–1.5 p/m² on the banks and back plaza. Keep lanes clear around the towers and FOH.

## 13. Endshow footage: terrain-relevant observations

- FACT: drone shots from above the back plaza (00:29–00:49, 04:07, 05:26, 07:24, 12:21) show the paved
  field as a lighter rectangle between darker banks, the two pillar rows, and dark tree masses on both
  sides. Lights on the right (+X) side beyond the trees are the other stages. The left (−X) side is dark
  (Walibi, closed at night).
- FACT: the stage has lit side **arms** that angle forward and outward from its ends towards the field's
  front corners (07:24, 12:21, 14:19). A continuous line of flame units runs along the stage front and the
  arms (14:19).
- INFERENCE: ground-level fireworks and gerbs fire in lines along both side banks (04:07, 07:24, 12:40,
  12:50). Pyro positions sit on or near the crests (X ≈ ±104…106, Z 0…130); aerial shells fire from
  behind the stage.
- FACT: there is no crowd, no bar activity and no FOH lighting visible; the field is empty.

## 14. Proposed playable layout (realistically scaled)

All values are in the local frame (§4), in metres. Y comes from the AHN terrain (§5.1). Tags give the
basis of each element.

### 14.1 Zones

| Zone | Geometry | Surface / height | Basis |
|---|---|---|---|
| Playable boundary | polygon (−108,−6)(−57.5,−6)(−57.5,3)(57.5,3)(57.5,−6)(108,−6)(108,99)(130,150)(125,172)(−120,172)(−135,150)(−108,120) | collision walls = tree trunks, fences and the lake | INFERENCE + ASSUMPTION |
| Floor | X −44…44, Z 0…113 (+ hard-standing to 137) | concrete, Y 0 | FACT |
| Side banks | \|X\| 44…108, Z −6…107 | grass slope 9.6 % up to Y 5.2, crest paths | FACT |
| Back plaza + road | Z 113…149 across X −137…130 | hard-standing and 12 m gravel/asphalt road | FACT |
| Decking | X −57…47, Z 149…172 | timber boards, Y −0.3 | FACT (2024) / INFERENCE 2026 |
| Premium deck (optional or blocked) | X −52…51, Z 172…211, over water | deck +1.5…+3 m above water (ASSUMPTION), three tent roofs | FACT 2024 layout |
| Lake | OSM polygon (§5.2) | water Y −1.8, invisible wall at the shore | FACT / INFERENCE |

### 14.2 Objects

| Object | Position / size | Basis |
|---|---|---|
| Stage deck front | line Z = 0, X −57.5…57.5 (115 m). Structure depth to Z −25; deck height +2.5 m above the floor. Centre stairs/thrust X −8…8, Z 0…6 | FACT 2024 width; INFERENCE position; ASSUMPTION depth, height and thrust (see the stage research) |
| Stage arms | (±57.5, −4) → (±90, +2), flame units every 3 m | ASSUMPTION (floorplan shape + frames) |
| Pit barrier | Z = +3, X −52…52, 1.2 m tall, with return gates at both ends | ASSUMPTION |
| Side/backstage fences | Z = −6 from X ±57.5 to ±108, 2.0 m Heras with black scrim, following the bank up to Y 5.2 | FACT position (2024) |
| **Lantern pillars / delay towers ×8** | X ±21.5; Z 46.5, 73.5, 100.5, 127.5. Shaft 3.2 × 3.2 m, height 16 m, lantern 2.5 m wide and 3.5 m tall with 1.5 m spire. 6 × 6 m barrier square around each | INFERENCE (2026 floorplan + footage); size ASSUMPTION within the inferred 15–19 m |
| FOH | X −8…8, Z 58…68, two tiers (+1.0 / +4.0), roof +8.0. Barrier X ±10, Z 56…70 | ASSUMPTION |
| Cable bridge | X = 0, Z 3…56, 0.6 m wide ramp, 0.1 m high | ASSUMPTION |
| Bar L (crest) | X −104…−97, Z 32…78 (46 × 7 m), counter faces +X, 6 service points (Z 35…75), tan tensile roofs | INFERENCE (2026 floorplan; 2024 look) |
| Bar R (crest) | X 97…104, Z 29…75, faces −X | INFERENCE |
| Bar BL | diagonal (−52,134)–(−76,118), 25 × 6 m, faces the field | INFERENCE |
| Bar BR | X 73…96, Z 121…128, faces −Z | INFERENCE (facing is an ASSUMPTION) |
| Optional container bars (2024/2025 style) | X −54…−44 and 44…54, Z 40…60 | FACT 2024 / 2025; not in 2026 |
| WC blocks | X −135…−111, Z 142…150; X 178…202, Z 133…141 | INFERENCE positions, ASSUMPTION size |
| Water points | (−74,171), (−82,172), (−111,146) | INFERENCE |
| EHBO (first aid) | (117,123) | INFERENCE |
| Pyro positions | crests X ±106, Z 5…125 every 12 m; aerial shells behind the stage Z −30…−50 | INFERENCE (footage) |
| Trees | OSM belt polygons (§5.2); instanced trees 15–22 m tall, trunk spacing ≈ 4–6 m | FACT outline; ASSUMPTION for trees |
| Distant skyline | Goliath coaster (46.9 m) behind stage-left (X −178…−73, Z −365…−64); other stages' lights to +X; lake and beach behind the audience | FACT |

### 14.3 Player spawn and walking distances (INFERENCE)

- Suggested spawn: E1 at (115, 150), facing (−0.6, −0.8) towards the stage. Alternative: back centre
  (0, 160) on the decking, looking along −Z.
- Walk from E1 to the pit ≈ 190 m; along the axis from the road to the pit ≈ 140 m. At 1.4 m/s that is
  about 100–135 s through an empty field.
- The rows are 43 m apart and 27 m spaced. The axis between them (X ±19) is the natural "processional
  aisle" the Endshow drones fly along.

### 14.4 Machine-readable proposal (JSON)

```json
{
  "frame": {"origin_wgs84": [52.4400834, 5.7575039], "origin_rd": [180179.1, 494764.6],
            "plusZ_bearing_deg": 325, "plusX_bearing_deg": 235, "Y0_nap_m": -2.38},
  "floor": {"paved": [[-44,0],[44,0],[44,113],[-44,113]], "hardstanding": [[-44,113],[44,113],[44,137],[-44,137]]},
  "banks": {"inner_slope_pct": 9.6, "crest_Y": 5.2, "crest_absX": [100,109], "outer_toe_absX": 126, "z_range": [-20,105],
            "rear_bank": {"z_toe": -5, "z_crest": [-62,-55], "crest_Y": 5.5}},
  "road": {"centreline": [[-137,94],[-131,110],[-114,131],[-87,144],[-44,143],[43,143],[128,160],[188,179],[245,181]], "width": 12},
  "decking": [[-57,149],[47,149],[47,172],[-57,172]],
  "premium_deck": [[-52,172],[51,172],[51,211],[-52,211]],
  "stage": {"front_z": 0, "x": [-57.5,57.5], "depth_to_z": -25, "deck_height": 2.5,
            "arms": [[[-57.5,-4],[-90,2]],[[57.5,-4],[90,2]]], "thrust": [[-8,0],[8,6]]},
  "pit_barrier": {"z": 3, "x": [-52,52]},
  "side_fences": [[[-57.5,-6],[-108,-6]],[[57.5,-6],[108,-6]]],
  "delay_towers": {"x": [-21.5,21.5], "z": [46.5,73.5,100.5,127.5], "footprint": 3.2, "height": 16, "barrier": 6},
  "foh": {"rect": [[-8,58],[8,68]], "tiers": [1.0,4.0], "roof": 8.0, "barrier": [[-10,56],[10,70]]},
  "bars": [
    {"id": "L",  "rect": [[-104,32],[-97,78]], "face": "+X", "points_z": [35.3,43.2,51.1,59.0,66.9,74.9]},
    {"id": "R",  "rect": [[97,29],[104,75]],  "face": "-X", "points_z": [31.6,39.5,47.4,55.3,63.2,71.2]},
    {"id": "BL", "line": [[-52,134],[-76,118]], "depth": 6},
    {"id": "BR", "rect": [[73,121],[96,128]], "face": "-Z"}],
  "toilets": [[[-135,142],[-111,150]], [[178,133],[202,141]]],
  "water_points": [[-74,171],[-82,172],[-111,146]],
  "first_aid": [117,123],
  "entrances": {"E1_main_west": [[108,137],[125,160]], "E2_lake_loop_NE": [[-108,137],[-125,118]], "back_edge": [[-44,149],[44,149]]},
  "pyro_crest_positions": {"x": [-106,106], "z_from": 5, "z_to": 125, "step": 12},
  "playable_boundary": [[-108,-6],[-57.5,-6],[-57.5,3],[57.5,3],[57.5,-6],[108,-6],[108,99],[130,150],[125,172],[-120,172],[-135,150],[-108,120]]
}
```

## 15. Uncertainties and open questions

| # | Topic | Status |
|---|---|---|
| U1 | Exact 2026 stage deck-front Z (2024 = 0; tower shift hints at +5…+10 for a centre thrust) | UNKNOWN, ±5 m |
| U2 | FOH position and structure | UNKNOWN; placement is an ASSUMPTION |
| U3 | Floorplan georeferencing error for 2026 bars, towers and WCs | ±5–10 m (checked against the ring lanes, road, lake and 2024 aerial) |
| U4 | Delay tower / pillar height | INFERENCE 15–19 m from the 2024 shadows; the 2026 dressing may add height |
| U5 | Red lines along the tower rows (2024) | UNKNOWN (cable runs most likely) |
| U6 | Grass state (parched vs green) during the June 2026 heat | ASSUMPTION: parched |
| U7 | Water level of the lake (≈ −4.2 NAP) | INFERENCE from the AHN shoreline |
| U8 | Whether an official PDF or app map exists beyond the Mapbox floorplan | UNKNOWN (web-search budget ran out) |
| U9 | Tree species and heights | ASSUMPTION |

## 16. Files produced (scratchpad, not committed; copyrighted or third-party data)

Directory `/tmp/claude-0/-home-user-Q-Crashers/de5b2351-28d0-5f9c-98e9-2fbf28f2c6ab/scratchpad/refs/terrain/`:

- Official floorplan renders: `static_2026_thu_z155.png`, `static_2026_sat_overview_z155.png`,
  `static_2026_sat_red_z17.png`, `static_2025_sat_overview_z155.png`, `static_2025_sat_red_z17.png`
- Floorplan vector data: `style2026_{thu,fri,sat,sun}.json`, `style2025_sat.json`,
  `tilejson_composite.json`, `mvt_z16/*.pbf`, `mvt2025_z16/*.pbf`, `dq26_floorplan_z16_raw.geojson`,
  `dq26_floorplan_merged.geojson`, `dq25_floorplan_z16_raw.geojson`,
  **`red_zone_floorplan2026_local.geojson`** (local frame)
- OSM: `osm_api_map.osm` (raw, ODbL), `osm_api_map_parsed.json`, **`red_zone_osm_local.geojson`**
  (local frame, 217 features)
- Aerials (PDOK): `pdok_actueel_orthoHR_700m.jpg`, `pdok_actueel_orthoHR_500m.jpg`,
  `pdok_2024_orthoHR_500m_hi.jpg`, `pdok_2025_orthoHR_500m_hi.jpg`, `pdok_20xx_*_500m.jpg`,
  `pdok_years_sheet.jpg`
- Rotated and annotated (stage up, audience-right = right, 10 m grid): `rot2024_field.jpg`,
  `rot2024_stage.jpg`, `rot2024_towers.jpg`, `rot2024_back.jpg`, `rotActueel_field.jpg`,
  `z2024_*_zoom.jpg`, **`fin_proposal_on_2024aerial.jpg`**, **`fin_proposal_on_2026aerial.jpg`**,
  `fin_actueel_fp.jpg`, `overlay_r170.png`, `overlay_r350.png`, `aerial_overlay_700m.jpg`
- Elevation: `ahn_dtm.tif` (AHN4 DTM 0.5 m), **`ahn_heightmap_redframe_2m.json`**,
  `ahn_hillshade_redframe.png`
- Frame crops: `frames_40_60_45_75.jpg`, `frames_aerial_centre.jpg`
- Scripts: `local.py`, `final_frame.py` (transforms), `merge.py`, `osm_parse.py`, `overlay.py`,
  `aerial_overlay.py`, `rotgrid.py`, `fig_final.py`, `proposal.py`

Licensing notes: OSM data © OpenStreetMap contributors (ODbL). PDOK Luchtfoto © Beeldmateriaal Nederland
(CC BY 4.0). AHN (public open data, CC0). The Defqon.1 floorplan is © Q-dance: use it only as a
reference and do not ship its graphics. The coordinates derived in this document are measurements for a
non-commercial tribute.

## 17. Sources

- Q-dance, Defqon.1 2026 FAQ (address, Holy Grounds usage, Exclusive RED Experience): https://www.q-dance.com/l/defqon1-2026-faq
- Q-dance, Defqon.1 2026 page ("road back to the Holy Grounds"): https://www.q-dance.com/l/defqon1-2026
- Interactive floorplan built on the official 2026/2025 maps (Mapbox styles by user `mguntenaar`): https://defqon-map-web.vercel.app/
  - style API used: `https://api.mapbox.com/styles/v1/mguntenaar/{cmpo8v8h9000801qu1tyhgk3i | cmpo8wdci000501s49cmna9by | cmpo91136000401qw52xk7y4x | cmpo940ea000b01s9ffjj72sw | cmaw9y18p005701qxcsie4jtb}`
  - vector tiles: `https://api.mapbox.com/v4/mguntenaar.cmpmrfiva1ew01ppmob5ayvi5-7mpha,mguntenaar.au8d2ypc,mguntenaar.cmpoc69kl1sya1mqp8s9uttiz-9vv5r,mguntenaar.ww99h0,mguntenaar.itc5cn/{z}/{x}/{y}.vector.pbf`
- Backbone International, Defqon.1 Weekend Festival 2024 (RED stage 114.5 m × 34 m, 22-day build, 2,500 lights): https://www.backbone-international.com/portfolio/defqon-1-weekend-festival-2024/
- Wikipedia, Defqon.1 Festival (since 2011 at Walibi event site; attendance; 2026 cancellation): https://en.wikipedia.org/wiki/Defqon.1_Festival
- EDMTunes, 2026 cancellation / Endshow without audience: https://www.edmtunes.com/2026/07/defqon-1-2027-officially-announced-after-historic-festival-cancellation/
- Walibi Holland, event site (Lowlands, Defqon.1, Opwekking): https://www.walibi.nl/en/business/possibilities/locations/evenemententerrein-walibi-holland
- OpenStreetMap API v0.6 map call: https://api.openstreetmap.org/api/0.6/map?bbox=5.742,52.432,5.768,52.446 (key ways: 60195507, 60195506, 66342521, 66340386, 77393787, 689953672, 802215880, 802215882, 235708686/235708844 Goliath)
- Overpass API (attempted, connection reset through the proxy): https://overpass-api.de/api/interpreter
- PDOK Luchtfoto RGB WMS (Actueel_orthoHR, 2024_orthoHR, 2025_orthoHR, 2026_orthoHR, …): https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0
- PDOK AHN WCS (dtm_05m): https://service.pdok.nl/rws/ahn/wcs/v1_0
- RCDB, Goliath at Walibi Holland (46.9 m): https://rcdb.com/1565.htm
- Hard Cultr, Defqon.1 stages 2026 guide (RED = main stage; Endshow Sunday): https://www.hardcultr.com/festivals/defqon-1-stages-explained-2026-guide/
- FestivalMates first-timer's guide ("Holy Grounds", community usage; low reliability): https://www.festivalmates.com/blog/defqon1-2026-first-timers-guide
- The Endshow | Defqon.1 2026 (storyboard frames): https://youtu.be/fLWY-Sxb1bE
