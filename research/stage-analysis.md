# Stage analysis: Defqon.1 2026 RED MainStage ("Sacred Oath" dragon castle)

Every claim is tagged **FACT** (sourced or directly visible in a cited image or video), **INFERENCE** (strong
deduction from several facts or from a measurement), **ASSUMPTION** (reasoned fill-in for the 3D build) or
**UNKNOWN**. Source URLs are listed in §12. Reference images are in the scratchpad (never in the repo):
`/tmp/claude-0/-home-user-Q-Crashers/de5b2351-28d0-5f9c-98e9-2fbf28f2c6ab/scratchpad/refs/stage/` (2026) and
`.../refs/stage/prev/` (earlier editions). In this document `SCR` stands for
`/tmp/claude-0/-home-user-Q-Crashers/de5b2351-28d0-5f9c-98e9-2fbf28f2c6ab/scratchpad`.

Coordinate frame: the same as `research/terrain-analysis.md`. The origin is the stage front centre at
floor level, **+Z** points from the stage into the audience (bearing 325°), **+X** points to audience-right
and **+Y** points up. Units are metres.

---

## 0. TL;DR: key numbers for the modeller

| Item | Value | Class |
|---|---|---|
| Concept | A giant red-and-orange **mechanical/scaled DRAGON** (head with open jaws, rider, one clawed foreleg) crouches on a grey **gothic castle**. Two huge **bat wings** with 3 raised "finger" spars each carry printed fire membranes, sun/gear rosettes and silver blade spikes. The stage is **U-shaped**: the castle walls continue as side sections and forward arms. On the field, **delay towers are dressed as stone obelisks with crystal lanterns**. | FACT (images §1) |
| Overall footprint (stage outline on the official 2026 floorplan) | **≈ 185 m wide** (X −92.4…+93.1). The centre is recessed and the arms reach forward to Z ≈ +2…+5 at X ±86…92 | FACT (vector map) / INFERENCE (it is a stylised outline; see terrain-analysis §7) |
| Central recess (wings and dragon zone) | **≈ 74 m** wide (step at X ±37 on the floorplan) | FACT (map) and INFERENCE (it matches the wing span measured on photos) |
| Wing finger-tip span | **≈ 76–80 m** (outer tips at X ≈ ±38…40) | INFERENCE (photogrammetry, 3 photos) |
| Wing finger-tip height | **≈ 24–26 m** (middle finger highest). Uncertainty 22–30 m | INFERENCE (photogrammetry with an L-Acoustics K1/K2 box, 1.34 m wide, and a 36 mm EXIF focal length) |
| Dragon crest top / rider top | ≈ 19–20.5 m / ≈ 20–21.5 m | INFERENCE |
| Dragon skull width / mouth opening | ≈ 9 m / ≈ 5.5 m tall × 7 m wide; the head including horns and crest spans ≈ 15–16 m | INFERENCE |
| Castle wall top (crenellations) / gothic towers | ≈ 9–9.5 m / ≈ 13–16 m | INFERENCE |
| Stage deck height | **≈ 1.9 m** (red skirt, black railing) | INFERENCE (people for scale) |
| DJ booth | Gothic pointed-arch portal with a bronze/gold frame, ≈ 5 m wide, top ≈ 6 m above the floor. A Defqon.1 logo shield sits above it and a dark-red/gold banner hangs on the booth front | INFERENCE (dimensions) / FACT (look) |
| Main PA | ≥ 4 flown line arrays on black lattice truss towers. **Inner pair at X ≈ ±10.5–11** flanks the head (≈ 21–22 m apart); outer pair at X ≈ ±31. Array bottom ≈ 4.9 m, top ≈ 14.2 m. Ground-stacked subs sit in front of the deck | INFERENCE |
| Delay towers | 8 = 2 columns × 4 rows at Z 46.5 / 73.5 / 100.7 / 127.7. Floorplan X = ±21.5; photogrammetry suggests **±16** (see §3.3). Stone-clad square shaft, 2 line arrays on the face, faceted **crystal lantern** on top. Crystal top ≈ 10.5–14 m | FACT (layout on map, look) / INFERENCE (sizes) |
| FOH / camera enclosure | On the axis at **Z ≈ 88 ± 10**, ≈ 11 m wide, ringed by 1.2 m crowd barriers. A small riser (≈ 5 m) sits at Z ≈ 65 | INFERENCE (Endshow photo geometry) |
| Colour | Wings: flame orange `#E0662A` / red `#B0382A` / crimson `#6E1A1E` / soot `#1A1214` / sun-yellow `#F6B23A`. Dragon scales: red `#A8453A`, shadow `#3A1A1E`. Blades and horns: brushed steel `#A9B2BD`. Teeth: ivory `#E8D6A0` → orange `#D98B3A`. Castle stone: warm grey `#A7A39B`, mortar `#5C5C60`. Stage skirt: `#5C0A19`. DJ frame: bronze-gold `#B08D57` | INFERENCE (pixel-sampled, §8) |
| Heights vs earlier years | 2023: 162 × 50 m, 2024: 114.5 × 34 m, 2025: 197 × 48 m (FACT, Backbone). By my measurement 2026 is **wide (≈ 185 m) but lower (wing tips ≈ 25 m)**. This **contradicts the 45–50 m ASSUMPTION in `production-analysis.md` §3**; see §3.5 | INFERENCE |

---

## 1. Evidence base: images downloaded and viewed

All files below were downloaded with curl or yt-dlp and viewed. Paths are relative to `SCR/refs/stage/`.

### 1.1 2026 RED stage (the design itself)

| File | Source | What it shows | Class |
|---|---|---|---|
| `../thumb_maxresdefault.jpg` (1280×720) and `qd_1783003751-endshow-zonder-copy.jpg` (1920×1080, same photo without the title) | Official YouTube thumbnail and Q-dance site | Night telephoto of the centre: dragon head with jaws open, LED dots in the mouth, a fan of blade spikes on the crest and swept horns. A **skeletal armoured rider** sits on the neck (viewer-right of the head). The **right foreleg** (viewer-right) grips the castle. Wings carry spoked **gear rosettes with purple centres**, perforated plates and sickle-hook "scales". Two inner line arrays; gothic towers with lancet windows; the Defqon.1 logo on a gothic gate under the mouth. Aerial fireworks and red haze | FACT |
| `qd_1782996132-260627_224139_delio_201020.jpg` (5640×3525, EXIF Sony ILCE-7M3, 36 mm, **2026-06-27 22:41:39**, © Delio Nijmeijer) | Q-dance Defqon.1 2026 page | **The Endshow night**, wide shot from an elevated point on the axis behind the delay towers. Obelisk delay towers with crystal lanterns on fenced plinths (3 pairs visible), the FOH/camera enclosure, a red aerial-shell canopy across the whole sky, gerbs on the roofline, the U-shaped castle walls running far left and right, and purple crystal lanterns on the side walls | FACT |
| `fb_housemafia_1451083087063535.jpg` (845×592) | HouseMafia.pl Facebook post "Mainstage Defqon.1 2026" | **Daylight golden hour, whole stage, near-frontal long telephoto from far away** over the trees. The best view of the wing shapes: 3 fingers per wing, 3 sun rosettes per wing, silver spike combs, cream castle base with turrets, red banners, a skull medallion and 4 PA hangs | FACT |
| `ig_housemafia_DaC7GmTs6hg.jpg` (640×640) | Instagram HouseMafia.pl, 2026-06-26 | Square crop of the night test photo below | FACT |
| `fb_edmlab_1390789146194994.jpg` (1440×1920) | EDM Lab Facebook "This is RED Stage Defqon.1 Festival, by Festival Leaks" | **Night lighting test from the empty field, whole stage**. Blue/white castle, orange/magenta wings with lit edges, blue-lit crest spikes, 2 glowing skull medallions, vertical LED strips on the pilasters, people and a boom lift at the stage foot for scale | FACT |
| `fb_edmlab_991489080456953.jpg` + video `video/fb_edmlab_991489080456953.mp4` (10.4 s) → frames `fbvid_edmlab991_t0000.0/4.0/8.0/10.0.jpg` | EDM Lab Facebook video "RED STAGE DEFQON.1 2026" | **Daylight close-ups during build and rehearsal**. The head from below with teeth, tongue and silver crest cones. Crew on the deck (human scale). Wing root with a printed flame membrane and a row of moving heads on the leading edge. A skull niche panel and flame-eye banners. **3 silver talons gripping the castle parapet**. Lattice PA towers and a boom lift | FACT |
| `yt_xyTqAO8tOdM_oar2.jpg` / `yt_xyTqAO8tOdM_maxresdefault.jpg` | YouTube Short "Defqon.1 2026 mainstage" (TikTok @defqontent) | Daylight evening from the field near the right delay column. **It confirms the crystal-topped pillars are the delay towers** (2 line arrays flown on each shaft). Also: ground-stacked sub blocks in front of the stage, and the field surface | FACT |
| `video/fb_teardown_2015108922480165.mp4` (32 s) → `fbvid_teardown_t01_jaw_castle.jpg`, `..._t10_head_lift.jpg`, `..._t15_stone_gold_pieces.jpg` | EDM Lab Facebook "The heartbreaking teardown of Defqon.1 RED stage 2026" | Construction: the **upper skull lifted off by a Boekestijn mobile crane** and the lower jaw left in place. Castle towers are flat scenic facades on large scaffold towers. Big circular aluminium truss rings lie on the ground. Grey-blue **stone sculpture pieces with gold veins** | FACT |
| `derived_red_plan_from_official_floorplan.png` | Rendered by me from the official 2026 floorplan vectors | RED area, grey floor zone, the 8 delay-tower icons and the U-shaped stage outline | FACT (data) / INFERENCE (rendering) |
| (not kept) `fb_edmlab_1391211699486072.jpg` renamed `prev/fb_edmlab_2026_MAGENTA_not_RED.jpg` | EDM Lab "all stages" video | Shows the MAGENTA stage, not RED | FACT |

Also used: the 160 storyboard frames and 8 contact sheets of the Endshow video (320×180), in particular
f002 (00:19), f007 (01:09), f010 (01:38), f025 (04:07), f087 (14:19) and f130 (21:24). These are drone and
axis views of the pillars, the flame line and the U-arms (FACT).

**Not obtained (UNKNOWN)**: official press photos of the 2026 stage in daylight at high resolution, any
aftermovie (the festival was cancelled), and Q-dance technical credits for 2026. Q-dance asked visitors not
to share leaked images of the RED, which explains why few build-up photos exist (FACT, Hardnews). TikTok pages
could not be scraped (HTTP 403). Only one TikTok thumbnail (a "Dragon Cathedral" video title) was reached,
and it was not useful. The web-search budget ran out before German/Polish-language searches could be done.

---

## 2. Context facts for 2026

- FACT: the theme was "Sacred Oath" with the anthem by D-Sturb, dated 25–28 June 2026 (Wikipedia, Hardnews).
- FACT: the festival was cancelled on 26 June 2026 under the first KNMI code-red heat warning. The RED had been
  kept secret until the Friday "grand opening". Angry campers pushed through fences toward the unrevealed
  main stage (NOS, VRT, Omroep Flevoland summary).
- FACT (EXIF): the Q-dance Endshow photo was taken on **2026-06-27 at 22:41:39**, a Saturday. Sunset at the RED
  was about 22:03 CEST at azimuth ≈ 312°. At 22:41 the sun was 4.8° below the horizon at azimuth 319.5°,
  which is **behind the audience** (the stage faces 325°). So the twilight glow sits behind the viewer and
  the sky behind the stage is darker (INFERENCE, computed from coordinates 52.4398 N, 5.7578 E).
- FACT: the Endshow video (1581 s) was published on 2 July 2026. EDMTunes reports a crew-only light-and-pyro
  moment on Saturday evening.

---

## 3. Site plan and placement (from the official floorplan plus photogrammetry)

### 3.1 Floorplan data

- FACT: `defqon-map-web.vercel.app` embeds the official DQ26 floorplan as Mapbox styles (`mguntenaar`,
  style `DQ26 FRIDAY` = `cmpo8wdci000501s49cmna9by`; layer names are dated `260523` = 2026-05-23, v8).
  I decoded the z16 vector tiles. The `260523_fest_delay_v8` layer holds 8 `tower_red` points in 2 columns
  × 4 rows (row spacing 26.3 m, columns 44.0 m apart). The `260523_area_fri_base/top_v8` fid 11/16 is the
  U-shaped stage graphic and `260523_base_area_fri_v8` "RED" is the audience area.
- INFERENCE: the stage graphic is a stylised outline (terrain-analysis.md §7 reaches the same conclusion and
  reads it as the backstage/rear fence line). In the terrain frame, measured from its polygons:

| Stage outline segment (floorplan) | X range | Z range |
|---|---|---|
| Centre band (recess) | −36…+36 | −49…−43 |
| Step (the "shoulders") | ±34…±41 | −47…−32 |
| Side sections | ±37…±80 | −37…−22 (sloping forward outward) |
| Corner | ±80…±92 | −27…−16 |
| Arms (forward) | ±86…±92 | −16…+4 |

- INFERENCE: the centre of the stage is **deeper** than the sides because it holds the dragon and wing
  superstructure. The **74 m wide central recess matches the measured wing span (76–80 m)**. The side sections
  are shallower castle walls, and the arms are thin walls reaching to the front corners of the field.

### 3.2 Where the stage front is

- INFERENCE: the deck front is at **Z ≈ 0 ± 8**. This agrees with terrain-analysis.md (Z = 0 from the OSM/aerial
  paved-floor edge). Independent checks:
  (a) In the Endshow photo the deck front band sits at image y ≈ 850–870. With the fitted camera (below) that
  puts it 129–165 m from the camera, i.e. Z ≈ −13…+22.
  (b) The drone frame f087 shows the stage-front flame line ≈ 2.0 ± 0.7 row spacings (≈ 53 ± 18 m) in front of
  the nearest delay row, which gives Z ≈ −7 ± 18.
- ASSUMPTION for the model: deck front (centre) at Z = 0, DJ booth front at Z −3, castle central facade at
  Z ≈ −11, dragon snout/teeth at Z ≈ −4 (overhanging the booth), wing plane at Z ≈ −18…−24, rear scaffold to
  Z ≈ −45.

### 3.3 Photogrammetry of the Endshow photo (the main scale anchor)

- FACT: Sony A7 III (sensor 35.9 mm, 6000 px wide) at 36 mm gives f ≈ 6017 px. The image is 5640 px wide,
  a crop, so f ≈ 2006 px at the 1880-px working scale I used.
- Measured (1880-px scale): the 3 visible obelisk pairs have separations of **1230 / 818 / 618 px**. Their
  bases are at y 1008 / 933 / 892 and their crystal tops at y 605 / 670 / 705. The ratios 1 : 1.504 : 1.99
  mean the rows are equally spaced, with the nearest at 1.98 × the spacing (INFERENCE).
- With the map row spacing Δ = 26.3 m: nearest visible pair at D₁ = 52 m, camera height 6.0 m, horizon at
  y 777. That gives **pair separation ≈ 32 m (±16 m)**, not the map's 44 m. Cross-checks:
  - The FOH enclosure barrier then measures 1.18 m, a standard crowd barrier. With 44 m it would be 1.63 m,
    and the camera operator would be 2.9 m tall, which is implausible.
  - The row-to-stage distances then match the floorplan and the drone view.
  - INFERENCE (medium confidence): the delay columns stand at **X ≈ ±16 m**. The floorplan icons (±21.5 m)
    may be drawn apart for legibility.
  - ASSUMPTION for the build: use ±16 m where the Endshow camera views must match, and ±21.5 m if you
    follow the official map.
- INFERENCE: the visible pairs are rows 3/2/1 (Z 100.7 / 73.5 / 46.5). Row 4 (Z 127.7) is only 26 m in front
  of the camera, so it falls outside the frame (x ≈ −294 / 2174). The photographer stood at **Z ≈ 150, about
  6 m up**, on the axis (camera scaffold or decking behind the road). No 4th pair is visible between the stage
  and pair 3, which rules out a camera on the premium deck (Z ≈ 190).
- **Stage scale**: the inner PA hangs measure ≈ 16 px wide and ≥ 97 px long (the bottom is in smoke). The
  hang column in the 1920-px telephoto is 52 px wide and 360 px long, an aspect of 6.9, which fits an
  L-Acoustics K1/K2 array: box width **1.34 m** (FACT, L-Acoustics spec), ≈ 18–21 boxes ≈ 8.5–9.3 m. The
  DJ arch is 3.5–3.9 hang-widths wide in both photos. That is consistent with the daylight still, where a
  1.70 m crew member stands in front of the booth. This confirms a single K1-width column (INFERENCE).
- This gives ≈ **11–12 px/m at the stage plane (D ≈ 165–185 m)**, which yields the dimensions in §4.

### 3.4 Field furniture (terrain frame)

| Element | Position | Size / look | Class |
|---|---|---|---|
| Delay towers ("obelisks") | X ±16 (photo) or ±21.5 (map); Z 46.5, 73.5, 100.7, 127.7 | Square stone-clad shaft ≈ 2.3–2.7 m wide, with gothic arched panels. 2 line arrays flown on the +Z face (away from the stage; visible from the audience side in oar2) at Y ≈ 4–9 m, with a red flame banner below them. A faceted crystal (elongated octahedron) ≈ 2.0 m wide × 2.6 m tall sits on top. Crystal top ≈ 10.5 m (photo, with S = 32 m) or ≈ 14 m (with S = 44 m). terrain-analysis estimated 15–19 m from 2024 shadows | FACT (look, oar2 + delio) / INFERENCE (sizes) |
| Tower plinths | around each tower base | Square fenced platform ≈ 7 m (photo scale), crowd-barrier/lattice railing ≈ 1.1–1.2 m, with small **cannon/mortar props** at the corners (dark bronze) | FACT (look) / INFERENCE (size) |
| FOH / camera enclosure | X 0, Z ≈ 88 ± 10 | ≈ 11.2 m wide rectangle fenced with crowd barriers; camera operator on a tripod or jib | INFERENCE |
| Small riser | X 0, Z ≈ 65 | ≈ 4.8 m wide, fenced | INFERENCE |
| Field surface | whole floor | Light-grey concrete slab/paving (terrain doc). Endshow drone: a lighter paved central aisle with darker panels either side. oar2 foreground: brown gravel beyond the paving | FACT (look) |
| Sub arrays | in front of the deck, Z ≈ +1…+3 | ≥ 4 ground-stacked black blocks across roughly X −45…+45 (e.g. KS28 cardioid stacks) | FACT (visible) / INFERENCE (type) |

### 3.5 Height: why the 2026 stage is not 45–50 m

- FACT: Backbone International published 50 m (2023), 34 m (2024) and 48 m (2025) heights. No 2026 figure
  exists.
- INFERENCE: the 2026 wing finger tips stand **≈ 2.8–2.9 hang-lengths above the floor** in the Endshow photo,
  i.e. 24–27 m. Converting to 45–50 m would need 16–18 m arrays (impossible: 24 × K1 = 10.6 m maximum).
  The golden-hour aerial agrees. Using inner-hang separation = 21.5 m (8.8 px/m), finger tips sit ≈ 11 m above
  the rosettes, and the rosettes ≈ 14 m above the floor.
- The night field photo: inner finger tips 580 px apart (= 28 m) are 540 px above the horizon, i.e. ≈ 28 m
  at camera height 1.6 m.
- Conclusion: model the 2026 wings at **≈ 25 m (range 22–30)**. If the project wants the "bigger than life"
  feel, keep the proportions and scale the whole stage uniformly rather than stretching it vertically.

---

## 4. Structural description by module (dimensions: INFERENCE unless tagged; ASSUMPTION where noted)

Heights (Y) are above the field floor. The deck top is at Y = 1.9.

### 4.1 Stage deck and DJ booth
- Deck: steel/scaffold deck, **top Y ≈ 1.9 m** (INFERENCE: people 65 px vs front fascia 73 px in the night
  photo). The front skirt is **dark red fabric** (`#5C0A19`) with a black tubular railing (≈ 1.1 m) along the
  upper castle platform (FACT, look).
- Deck width in the centre is ≈ 70 m (inside the recess, ASSUMPTION); depth from the front to the castle
  facade is ≈ 11 m (ASSUMPTION). Stepped stairs lead up at the right of the booth (FACT: stairs visible in
  the Endshow photo; terrain doc frames #9/#29/#72).
- **DJ booth** (FACT, look): a gothic **pointed-arch portal** with an ornate **bronze/gold scroll frame**
  (baroque metal filigree) and a cream/white chevron trim. The interior is black with a small **chandelier**.
  The booth desk front carries a **dark red banner with gold ornamental print** and a small Defqon.1 logo.
  Above the arch sits a **Defqon.1 logo** (cream/white on a bronze shield).
  - Portal ≈ 5 m wide, arch apex ≈ 6 m above the floor (≈ 4 m above the deck).
  - Desk ≈ 4 × 1.1 m (ASSUMPTION). Logo shield ≈ 1.5–2 m tall (INFERENCE).
- Small wedge monitors and light fixtures sit on the deck lip (FACT).

### 4.2 Central dragon

**Head** (upper skull and lower jaw are separate modules; FACT from the teardown)
- Faces the audience, turned ≈ 10–15° toward audience-left (−X) (INFERENCE, thumbnail).
- Skull width ≈ 9 m; mouth opening ≈ 5.5 m tall × 7 m wide; chin at Y ≈ 6–7 m (just above the DJ arch
  apex). Snout/tooth line at Z ≈ −4, back of the skull at Z ≈ −14 (ASSUMPTION).
- **Upper jaw**: a red scale-plate shell with black-outlined plates (lit red `#AC6552`, mid `#722F33`,
  shadow `#371B1E`) and an orange gum line.
  - ≈ 9 large front fangs, 1.5–2.2 m long: curved cones in ivory/cream grading to orange at the root.
  - Smaller teeth behind them (FACT count visible ≈ 9 upper, ≈ 8 lower, plus inner rows).
- **Lower jaw**: a matching shell with ≈ 8–10 fangs and a **pink-red tongue** (≈ 5 m long, ≈ 2 m wide,
  `#B1413C` lit), laid in the jaw and curling at the tip. The throat is dark red with a **blue light deep
  inside** (FACT).
- **LED pixel dots**: chains of small white point-lights along the gums and lips, scattered on the palate and
  tongue (FACT, video frame t4). Model them as ≈ 150–250 emissive points (ASSUMPTION).
- **Eyes**: a small glowing orange/red eye under a heavy brow ridge, with a brass ring detail (FACT). The eye
  is ≈ 0.8–1 m across (ASSUMPTION).
- **Crest**: 9–11 huge **brushed-steel conical spikes/horns** radiating from the skull.
  - The two biggest sweep back-left, the central ones point up and the right ones sweep right. Lengths
    ≈ 3–6 m, base Ø ≈ 0.8–1.2 m (INFERENCE).
  - Between them sit jagged silver "saw-blade" plates (FACT).
  - A long **swept horn** runs back from the left temple, ≈ 5–7 m (INFERENCE).
  - Crest top at **Y ≈ 19–20.5 m**.
- Fixtures: ≈ 8 black moving heads mounted on top of the skull (FACT, teardown).
- A silver curved **tusk/blade** projects down-left from the lower-jaw corner (FACT). Ivory tusks sit at the
  wing roots (FACT).

**Rider** (FACT, look)
- A **seated armoured skeletal knight** (hooded/helmeted skull face with glowing red eye points), dark
  grey/silver, on the dragon's neck just viewer-right of and behind the head.
- ≈ 5–5.5 m tall seated, centred at X ≈ +6.5, top at **Y ≈ 20–21.5 m** (INFERENCE).
- Reports mention "petrified" dragons/figures on the stage (search summary only, UNKNOWN).

**Neck, body and forelegs**
- The neck coils from behind the head to viewer-right and back (X 0…+12), with chest plates and bronze
  ring/gear details (FACT, thumbnail).
- Right foreleg (viewer-right, +X): a dark-grey scaly leg at X ≈ +8…+15 whose **3 huge glossy pale-grey
  talons** (≈ 2.5–3.5 m each) hook over the castle parapet at Y ≈ 5–9 m (FACT look / INFERENCE size).
- A mirrored left foreleg is **UNKNOWN** (not seen).
- Neck/chest skin is printed with black-and-orange flame lava cracks (FACT, teardown).

### 4.3 Wings (2 × mirror-symmetric, each ≈ 38 m span from the root)
- Plan: the wings sit in the central recess. The wing plane is at Z ≈ −18…−24 and leans slightly back
  (ASSUMPTION). The roots are at the dragon's shoulders, X ≈ ±6, Y ≈ 12–16.
- **3 raised finger spars per wing** (FACT). Tip positions (INFERENCE, averaged from the aerial and the
  Endshow photo):

| Finger | X (left wing; mirror for right) | Tip Y |
|---|---|---|
| Inner | −13…−16 | ≈ 24 |
| Middle | −28…−29 | ≈ 26 |
| Outer | −38…−40 | ≈ 24 |

- Spars: thick **copper-orange tubes** (Ø ≈ 0.8–1.0 m) (FACT, look) ending in **flame-shaped spiky finials**
  (red/orange with silver points, ≈ 3–4 m tall) (FACT).
- Each spar carries a comb of **8–12 silver triangular blade spikes**, 1.5–2.5 m long, pointing outward
  (FACT, look).
- **Membranes** between spars: printed flame artwork on a stretched skin (FACT).
  - Colours: orange flames `#E56E33`, reds `#B8584E`/`#A44730`, yellow tongues, black soot outlines.
  - The lower edges are **scalloped concave arcs** hanging between spars, forming gothic-arch openings
    through which the castle is visible (FACT).
  - At the outer ends the membrane sweeps down onto the castle roof at X ≈ ±40, Y ≈ 10–12 (INFERENCE). In
    the night field photo the outer ends appear to reach the stage level.
- **Rosettes**: 3 per wing, one on each membrane panel, **Ø ≈ 4–5 m**, centres at X ≈ ±16, ±24, ±33 and
  Y ≈ 13–15 (INFERENCE).
  - By day they read as printed **yellow suns with sawtooth rays** (`#E98E23`→`#FBB32F`). At night they are
    spoked **gear/wheel discs** with a glowing white or purple centre (FACT).
  - The large aluminium truss rings in the teardown are probably their frames (INFERENCE).
- **Lower wing arm** (from the root to the outer end): a copper tube with silver **perforated bone plates**
  (round holes) and rows of silver **sickle hooks** like scales (FACT, frame t8).
- Fixtures: a continuous row of moving heads on short arms along the leading edges and spars, spaced
  ≈ 1.2–1.5 m, ≈ 25–30 per visible segment (FACT count on one segment). Glowing orange/red line accents
  along the spars at night suggest **LED strip outlines** (INFERENCE).
- Gerbs fire from the wing tops and finials (FACT, Endshow photo).

### 4.4 Gothic castle facade (central section)
- Construction: **printed scenic flats on Layher-type scaffold towers**; the stairs are scenic too (FACT,
  teardown).
- Stone print: light grey blocks with darker mortar. It reads cream/beige in golden light and cool grey in
  overcast/daylight (FACT).
- Main wall with **crenellations at Y ≈ 9–9.5 m** (INFERENCE).
- **Gothic towers** with 3 tiers of round-/lancet-arched windows and pointed caps or battlements, ≈ 5–6 m wide,
  tops at **Y ≈ 13–16 m** (INFERENCE). They stand behind the inner hangs at roughly X ≈ −14, +9.5, +13 and
  continue along the sides; turrets with white conical caps appear in the aerial (FACT).
- Ground-level **arcade** of round/pointed arches (Y 2–6 m), lit purple/blue at night, and glowing windows
  (FACT).
- **Skull panels**:
  - Tall arched niches, ≈ 4–5 m, with a silver-white **skull relief** in a gold frame, next to a panel with a
    bronze round shield (FACT).
  - Large round **skull medallions** with glowing eyes at X ≈ ±18…22, Y ≈ 4–8 (INFERENCE).
- **Flame-eye banners**: vertical red banners showing an orange flame and an **all-seeing eye**, with a gold
  border (FACT). About 2.5 × 6 m (ASSUMPTION), several across the facade (the aerial shows them at X ≈ −30 and
  +35). They glow at night: backlit fabric or LED panel is UNKNOWN.
- **Stone faces**: grey-blue stone reliefs/sculptures with **gold crack veins** (kintsugi-like) in round-arched
  niches; the loose pieces are 3–4 m long (FACT, teardown and thumbnail).
- Diagonal white/grey **stone stairs** climb the facade beside the head (FACT). The steps look oversized
  (INFERENCE, theming scale).
- Vertical **white/cyan LED strips** on the pilasters (≥ 10 visible at night) (FACT, night photo).

### 4.5 Side sections and forward arms
- Side sections (X ±37…±80): the same castle language but lower, with a wall top at Y ≈ 9–10 and towers at
  ≈ 12–14 m. They carry red banners, skull medallions and small **purple-lit crystal lanterns on posts**
  (FACT, Endshow photo). Rear line at Z −22…−37 (floorplan). Front line **UNKNOWN**; model it at Z ≈ −6…0
  (ASSUMPTION).
- Arms (X ±86…±92, running forward to Z ≈ +4): lower castle walls with lighting/laser positions at their ends.
  The Endshow photo shows magenta/white beam fans from the far left and right, and the drone shows flames and
  gerbs along the arms (FACT). Height ≈ 8–10 m (ASSUMPTION).

### 4.6 PA system
- Inner arrays: X ≈ ±10.5–11 (21–22 m apart). Box bottom Y ≈ 4.9, box top Y ≈ 14.2, bumper ≈ 14.6. Each
  hangs from a black **box-truss/lattice tower** (≈ 1 m section, top ≈ 16 m with fixtures and a blade
  finial) standing on the deck/ground (FACT look / INFERENCE dims).
- A second, shorter array (sub or side-fill) hangs beside or behind the main array (FACT, daylight still).
- Outer arrays: X ≈ ±31 under the wing middles (INFERENCE; the aerial shows an outer/inner ratio of 2.83).
- Box type: K1/K2 family or equivalent, 1.34 m wide (INFERENCE). Earlier evidence: L-Acoustics post
  "65,000 fans. 120 K1, 78 KS28 and 84 K2 … Rent-All" (FACT; the photo shows the horned delay towers of
  2025, so INFERENCE: 2025).
- Delays on the 8 obelisks (§3.4). Subs are ground-stacked along the front (§3.4).

### 4.7 Lighting, LED and lasers (positions for the show systems)
- Moving-head rows: along all wing spars and leading edges (≈ 150–200 fixtures on the wings, ASSUMPTION),
  ≈ 8 on the dragon skull (FACT), plus truss-tower tops, castle roofline, the arcade (up-lights), the delay
  obelisks (brackets near the top, FACT) and the arm ends.
  - Whole-stage totals for context: 2,500 lights in 2024 (FACT, Backbone) and 1,800 structure + 600 show
    lights in 2025 (production-analysis.md).
- **No large LED video walls identified** on the 2026 RED (INFERENCE). Emissive elements: mouth pixel dots,
  pilaster LED strips, wing outline strips, skull eyes, rosette centres, flame-eye banners and crystal
  lanterns (FACT/INFERENCE).
- Lasers: beam sources at the arm ends and along the roofline (FACT: beams from far left and right in the
  Endshow photo; storyboard). Exact heads are UNKNOWN; production-analysis.md gives a layout.

### 4.8 Pyro and flame positions (FACT from storyboard and photos unless tagged)
- **Flame line along the whole stage front**, including the arms (drone 14:19). ≈ 40–60 flame units at
  3–5 m pitch (ASSUMPTION).
- **Flames and gerbs on the tops of the 8 obelisks** (01:09 gerbs; 14:19 fire on every pillar top).
- **Gerbs/fountains** along the castle and wing rooflines and on the wing finials (Endshow photo).
- **Aerial shells** (red/pink peonies, white/gold crossettes and comets) launched from behind the stage across
  the full width, filling ≈ ±120 m of sky (Endshow photo). The 2025 stage had 2 pyro trusses of 45 m each
  (FACT, Backbone); 2026 equivalents are UNKNOWN.
- Small **cannon props** on the obelisk plinths (FACT). Whether they fire (confetti/CO2) is UNKNOWN.

---

## 5. Suggested build spec (Three.js, terrain frame)

ASSUMPTION unless stated otherwise. It consolidates §3–4 into one consistent set.

| Module | Primitive / approach | Key numbers |
|---|---|---|
| Deck | box | X ±37 (centre) + side decks, Z −11…0, top Y 1.9; red skirt |
| DJ portal | extruded gothic arch + gold frame | width 5, apex Y 6, Z −3; logo plane 1.8 × 1.6 at Y 6.6–8.2 |
| Castle centre | flats + boxes | facade Z −11, wall top Y 9.3, towers 5 × 5 × 14–16 at X ±10…±14 and ±24…±30 |
| Dragon skull | sculpted mesh (or low-poly) + separate jaw | 9 wide, 7 deep, mouth 7 × 5.5, chin Y 6.5, pivot Z −9; yaw −12° |
| Crest spikes | 10 cones, metal | length 3–6, base Ø 1, fanned 150° |
| Teeth | ~34 curved cones | 0.6–2.2 long, gradient ivory → orange |
| Rider | mesh | 5.4 tall seated, X +6.5, top Y 21 |
| Foreleg + 3 talons | tubes + curved cones | X +8…+15, talons 3 long at Y 5–9 |
| Wings | per wing: 3 tube spars + 1 lower arm, triangulated membrane with a scalloped lower edge | spar tips as §4.3; membrane canvas texture; plane Z −20 |
| Rosettes | disc + ring + 16–24 teeth, emissive centre | Ø 4.5, 3 per wing, Y 14 |
| Blade spikes | instanced flat triangles | 1.5–2.5 long, ~10 per spar, ~200 total |
| Side sections | castle walls + towers | X ±37…±80, wall Y 9.5, towers 12–14 |
| Arms | walls | X ±86…±92, Z −16…+4, Y 8–10 |
| Inner arrays | box 1.34 × 9.3 × 0.5 on a truss tower | X ±10.8, Y 4.9–14.2 |
| Outer arrays | same | X ±31 |
| Subs | boxes | Z +1…+3, 4 blocks, each ≈ 10 × 1.4 × 2.2 |
| Delay obelisks | box shaft 2.5 × 2.5 + octahedron crystal + fenced plinth 7 × 7 | X ±16 (or ±21.5), Z 46.5/73.5/100.7/127.7, crystal top Y 11–14 |
| FOH enclosure | barrier ring | X ±5.6, Z 85…91 |
| Stage extents for camera framing | — | total width 185, wing tips 25, crest 20 |

Polycount hint (ASSUMPTION): dragon head ≈ 15–25 k triangles; wings ≈ 10 k plus instanced spikes; castle
≈ 10 k with normal-mapped stone. Use texture atlases for the membrane print and the stone.

---

## 6. Materials (PBR guidance)

| Part | Material (look) | Metalness / roughness | Class |
|---|---|---|---|
| Dragon scale shell | Painted hard-coat (fibreglass/foam on steel), satin red scale plates with black outline grooves | 0.1 / 0.55 | INFERENCE (teardown) |
| Crest spikes, horns, blades, talons | Brushed steel / silver paint, cool reflections | 0.9 / 0.35 | FACT look / ASSUMPTION values |
| Teeth | Glossy ivory → orange gradient | 0 / 0.3 | FACT look |
| Tongue | Wet-look satin pink-red | 0 / 0.35 | FACT look |
| Wing membranes | Printed PVC/fabric skin, slight translucency for backlight | 0 / 0.75 (+ transmission 0.1) | INFERENCE |
| Wing spars | Copper-orange painted tube | 0.3 / 0.5 | FACT look |
| Rosette rings | Gold/bronze metal with an emissive centre | 0.8 / 0.4 | FACT look |
| Castle | Matte printed stone flats; weathered grey stone, dark mortar, light grime streaks | 0 / 0.9 | FACT (flats) |
| DJ portal frame, logo shield | Polished bronze/gold | 0.85 / 0.35 | FACT look |
| Stone sculptures | Grey-blue stone with gold vein inlay (kintsugi) | 0 / 0.8, veins 1.0 / 0.3 | FACT look |
| Obelisks | Cream/beige stone print by day (dark bronze silhouette at night); crystal = faceted translucent white, emissive blue/cyan at night | shaft 0 / 0.9; crystal 0 / 0.1 + emissive | FACT look |
| Skirts, banners | Dark red cloth, gold print | 0 / 0.95 | FACT look |
| Rider | Dark grey armour, silver bone | 0.6 / 0.5 | FACT look |

---

## 7. Structural and supplier facts from earlier editions

| Year | Theme | RED width × height | Other stage facts | Source | Class |
|---|---|---|---|---|---|
| 2018 | Maximum Force | — | CLF lighting: **236 LEDbar PRO, 102 Ares LEDwash, 136 Aorun beam**. Supplier Rent-All. LD Marcel Binnenmarsch (Virtue Projects); technical production Hans Bokkinga (Habo); operator Pascal Parent. xyz dimensions built a "cranky fish" stage element (design by Hurricane) | CLF, xyz dimensions | FACT |
| 2019 | One Tribe | — | Backbone (8th year) did the technical design and production of RED, the RED VIP deck, BLACK and UV; 78,000 visitors | Backbone | FACT |
| 2019, 2022, 2023 | — | — | Production People: RED stage light and audio | Production People | FACT |
| 2023 | Path of the Warrior | **162 × 50 m** (Backbone); "ruim 160 m breed en 50 m hoog" (Stage Roads) | 192 garbage cans in the decor; kilometres of scaffold ledgers; 150 cm Showtec mirror ball (Stage Roads); 65,000 at POWER HOUR | Backbone, Stage Roads | FACT |
| 2024 | Power of the Tribe | **114.5 × 34 m** | 5 warriors, 66 garbage cans, 51 inflatable boats, 8 cars, >220 crane movements, **2,500 lights**, kilometres of scaffolding, 22 days of build-up. LD Happy Technology (Robbert Vernooy) with Depence pre-vis, about 3 h of on-site programming. Production People: RED light, audio and rigging (8-person RED light crew, 9 audio crew) | Backbone, Syncronorm, Production People | FACT |
| 2025 | Where Legends Rise | **197 × 48 m** | Circular centrepiece **Ø 20 m** with a mask **7 × 6.75 × 7.75 m**; **2 pyro trusses of 45 m**; 10 "guard" warriors; 4 black steel swords; 25 days load-in. Production People lights for RED and BLUE. Delay towers were tall orange pillars with golden horned tops (Q-dance PDF photos) | Backbone, Production People, Q-dance PDF | FACT |
| 2025 (probable) | — | — | L-Acoustics: "65,000 fans. 120 K1, 78 KS28 and 84 K2", Rent-All | L-Acoustics Facebook | FACT (text) / INFERENCE (year, from the photo's horned delay towers) |
| 2016? | Dragonblood | — | Lights in Motion fire artists as "Dragon Warriors" (Team Red / Team Blue) in a 20-minute timecoded Endshow with Close-Act "Saurus" creatures. The page says "14th edition" = 2016 by count, but production-analysis.md dates it 2019 | Lights in Motion | FACT (text) / INFERENCE (year) |
| All | — | — | Pyro: Pyrofoor (Amsterdam) lists Defqon.1 fireworks (photos from 2018 and 2024 in the file names) | Pyrofoor | FACT |
| 2026 | Sacred Oath | ≈ 185 m wide (map), wing tips ≈ 25 m (photogrammetry) | Crane contractor **Boekestijn** (visible on the teardown cranes). Genie-type boom lifts. Other suppliers UNKNOWN; continuity with Backbone, Production People, Happy Technology and Pyrofoor is likely (INFERENCE) | teardown video | FACT / INFERENCE |

Not confirmed: ER Productions as laser supplier (UNKNOWN; production-analysis.md names Jeroen Winnubst for
laser design). "RF Productions / Fuze Pyro" appear only for a virtual 2025 stage (low-credibility blog,
UNKNOWN). Stageco, Faber Exposize and MOJO: no evidence found (UNKNOWN).

L-Acoustics box sizes (FACT, manufacturer): K1 1340 × 440 mm (W × H), K2 1340 × 353 mm, KS28 1340 × 550 mm
front. Used as the scale ruler.

Earlier-edition reference images (viewed; `prev/`): `backbone_2019_*` (26), `backbone_2023_*` (5),
`backbone_2024_*` (4), `backbone_2025_*` (14), `qdance_pdf_2025_RED_day/night/deck.jpg`,
`hardnews_2025_RED.jpg`, `emh_2025_RED.jpg`, `edmtunes_2024_RED.jpg`, `lacoustics_fb_654124723418224.jpg`,
`djmag_2018_RED.jpg` and others.

---

## 8. Colour palette (pixel-sampled; lighting-dependent)

Median (IQR) values were sampled from tone-mapped daylight and golden-hour images with the script
`SCR/bin/palette.py`. The "albedo" column gives neutralised base colours for PBR (ASSUMPTION).

| Element | Sampled (source) | Recommended albedo |
|---|---|---|
| Wing flame orange | `#E56E33` p75, `#B86C39` median (oar2); `#E98E23` rosette (aerial) | `#E0662A` |
| Wing red | `#B8584E` (oar2), `#A44730` (aerial) | `#B0382A` |
| Wing deep crimson / soot | `#772E19` p25 (aerial) | `#6E1A1E` / `#1A1214` |
| Sun rosette yellow | `#FBB32F` p75 (aerial) | `#F6B23A` |
| Dragon scales (lit / mid / shadow) | `#AC6552` / `#722F33` / `#371B1E` (daylight still) | `#A8453A`, groove `#3A1A1E` |
| Tongue | `#B1413C` lit, `#67121D` median | `#A63A3A` |
| Teeth | ivory-cream to orange (visual) | `#E8D6A0` → `#D98B3A` |
| Horn/crest steel | `#95ADBD` median, `#AFB4FC` sky reflection | `#A9B2BD` |
| Castle stone (daylight, neutral) | `#71777E` median, `#808A95` p75, `#BAC0B6` sunlit | `#A7A39B`, mortar `#5C5C60` |
| Castle stone (golden hour) | `#E2B78A`, `#DFB984` | (lighting, not albedo) |
| Stage skirt red | `#550915`–`#5C0A19` | `#5C0A19` |
| Booth banner | `#4C2120` with gold print | `#4A1C1E` + `#C9A45C` |
| DJ frame gold | visual | `#B08D57` |
| Logo | cream/white | `#E8E4D8` |
| Obelisk shaft (day) / crystal | cream stone / white-silver | `#CDBFA6` / `#E6ECF2`, emissive blue `#3A6BFF` (night) |
| Stone sculpture | grey-blue with gold veins | `#6E7A8A` + `#D4A437` |
| Night stage washes | purple/magenta/blue/cyan/red (thumbnail, night test) | `#E0207A`, `#8A2BE2`, `#2040FF`, `#22D3EE`, `#FF2A2A` |

---

## 9. Uncertainties and open questions

1. **Delay column spacing** (±16 m by photogrammetry vs ±21.5 m on the map): INFERENCE favours ±16 m.
   UNKNOWN which is true.
2. **Absolute height**: 24–26 m ±3 m by three independent photo methods. There are no official 2026 figures
   (UNKNOWN), and this contradicts the 45–50 m assumption elsewhere in the repo.
3. **Deck front Z and deck depth**: ±8 m. The front line of the side sections is UNKNOWN.
4. **Back of the stage** (wing supports, scaffold towers, pyro trusses): only glimpsed (UNKNOWN). Do not
   model it in detail; it is never seen from the field.
5. Whether a left foreleg, a tail or other dragon parts exist: UNKNOWN.
6. Whether the flame-eye banners and rosette centres are LED screens or backlit prints: UNKNOWN.
7. Exact fixture, laser and flame counts for 2026: UNKNOWN. Counts above are ASSUMPTIONs calibrated to
   2024/2025 facts.
8. The official 2026 supplier list: UNKNOWN.

---

## 10. How the numbers were produced (reproducibility)

- Floorplan: Mapbox style JSON + z16 vector tiles (token public in the page source), decoded with
  `mapbox-vector-tile` (scripts `SCR/map/fetch_tiles.py`, `plan.py`, `local.py`, `localplan.py`). The
  stage-local frame was fitted on the delay-tower points; axis bearing 324.9° (stage front facing).
- Photo measurements: grid overlays and crops in `SCR/meas/` (`delio_*`, `thumb_hangR.jpg`,
  `fb1390_people.jpg`, `aerial_*`, `drone_f086_087.jpg`), plus EXIF focal length. Palette: `SCR/bin/palette.py`
  with box specs in `SCR/meas/pal1.json` and `pal2.json`.
- Per-image notes: `SCR/notes/img_notes.md`.
- Videos: yt-dlp from Facebook (YouTube was not used; it is blocked).

---

## 11. Image-by-image descriptions (condensed)

- **Official thumbnail / endshow-zonder-copy**: magenta night wash. The head (x 450–800 of 1280) is turned to
  viewer-left, jaws wide open with a lit pink throat. The crest fan of ~10 blades and the rider behind it are
  clear. The wings show large spoked rosettes with purple centres (Ø ≈ 3.9 m), perforated plates and hooked
  scales, and their tips curl up into hooked claws at the top corners. Inner arrays at 1/3 and 3/4 width.
  Lavender-lit gothic towers and arcade; the logo gate under the chin; dark truss grid behind the roofline.
- **HouseMafia aerial (golden hour)**: all 6 finger tips at about the same height, the middle fingers a little
  taller. 6 printed suns. Silver spike combs read as white teeth along each spar. The head is a red/orange mass
  with a pale crest and the rider on top. The castle base is cream with white-capped turrets, red banners and
  a white skull medallion. 4 dark PA columns.
- **Night test (Festival Leaks)**: colour-changing LED look. Blue/white castle with ≥ 10 vertical LED strips,
  2 skull medallions with glowing eyes, glowing rosettes, orange-lit wing bones. People and a boom lift give
  the deck height of 1.9 m.
- **Daylight still and video**: blue sky, crew on the deck. Teeth and crest are the best texture reference.
  The DJ portal details (gold scroll frame, chandelier, red/gold banner) and the flame-membrane print with its
  row of fixtures are clearly visible, as are the skull niche and the talons over the parapet.
- **Endshow photo**: 3 pairs of obelisk delay towers with crystal caps and cannon-prop plinths, the FOH
  enclosure, the red shell canopy, gerbs on the roofline, the U-walls with purple lanterns and beams from the
  arm ends.
- **YouTube Short (oar2)**: a daylight delay tower close-up showing the arrays, the red banner and the crystal
  cap. Sub blocks at the stage front.
- **Teardown**: modular head with the skull lifted by crane and the jaw left in place; scaffold-backed castle
  flats; truss rings; gold-veined stone pieces.
- **Storyboard**: blue crystal lanterns at dusk (00:19), gerbs from the pillar tops (01:09), the full-width
  flame line and flaming pillar tops from the drone (14:19), gerb lines along the U-arms (21:24).

---

## 12. Sources

2026 stage and event:
- The Endshow | Defqon.1 2026 (YouTube): https://youtu.be/fLWY-Sxb1bE
- Q-dance Defqon.1 2026 page (source of the 2026 photos): https://www.q-dance.com/l/defqon1-2026
  - Endshow photo (Delio Nijmeijer, EXIF 2026-06-27 22:41:39): https://q-dance-network-images.akamaized.net/41347/1782996132-260627_224139_delio_201020.jpg
  - Thumbnail source: https://q-dance-network-images.akamaized.net/41347/1783003751-endshow-zonder-copy.jpg
- Q-dance Exclusive RED Experience 2026 (+ PDF): https://www.q-dance.com/l/defqon-red-experience-2026 ,
  https://q-dance-network-images.akamaized.net/41347/1778767867-defqon-1-red-experience-2026.pdf
- EDM Lab, "RED STAGE DEFQON.1 2026" (video): https://www.facebook.com/edmlabofficial/videos/red-stage-defqon1-2026-defqon-hardstyle-harddance-qdance-defqon1/991489080456953/
- EDM Lab, "This is RED Stage Defqon.1 Festival, by Festival Leaks": https://www.facebook.com/edmlabofficial/posts/this-is-red-stage-defqon1-festival-by-festival-leaksdefqon1-defqon-hardstyle-har/1390789146194994/
- EDM Lab, teardown video: https://www.facebook.com/edmlabofficial/videos/the-teardown-of-defqon1-2026-is-officially-underway-seeing-the-red-mainstage-bei/2015108922480165/
- EDM Lab, all 2026 stages: https://www.facebook.com/edmlabofficial/posts/-all-defqon1-2026-stages-in-one-videothe-holy-grounds-are-officially-closed-due-/1391211699486072/
- HouseMafia.pl, "Mainstage Defqon.1 2026": https://www.facebook.com/housemafiapl/posts/mainstage-defqon1-2026/1451083567063487/
- HouseMafia.pl Instagram: https://www.instagram.com/p/DaC7GmTs6hg/
- YouTube Short "Defqon.1 2026 mainstage": https://www.youtube.com/shorts/xyTqAO8tOdM
- TikTok "Dragon Cathedral: Defqon.1 2026 Sacred Oath Stage" (title only): https://www.tiktok.com/@wohlgenhrt/video/7650847782974000416
- Hardnews, leak request: https://hardnews.nl/en/q-dance-makes-request-to-defqon-1-visitors-dont-share-leaked-images-of-the-red/
- DJ Mag: https://djmag.com/news/defqon1-share-2026-endshow-filmed-without-audience-after-heatwave-cancellation-watch ;
  DJ Mag NL: https://djmag.nl/news/defqon1-deelt-endshow-2026-opgenomen-zonder-publiek-na-afgelasting-vanwege-hittegolf
- We Rave You: https://weraveyou.com/2026/07/defqon-1-2026-endshow-filmed-empty-grounds/ ; Your EDM: https://www.youredm.com/2026/07/06/defqon-1-releases-2026-endshow-following-festival-cancellation/ ;
  EDMTunes: https://www.edmtunes.com/2026/06/no-defqon1-endshow/
- NOS: https://nos.nl/artikel/2620314-hardstylefestival-defqon-1-toch-afgelast-vanwege-code-rood ; VRT: https://www.vrt.be/vrtnws/nl/2026/06/26/kasper-en-jelle-keren-terug-naar-huis-na-afgelasting-defqon-1/
- Official floorplan (fan-hosted Mapbox embed): https://defqon-map-web.vercel.app/ (style `mapbox://styles/mguntenaar/cmpo8wdci000501s49cmna9by`)
- Wikipedia, Defqon.1 Festival: https://en.wikipedia.org/wiki/Defqon.1_Festival

Earlier editions, builders and suppliers:
- Backbone International: 2025 https://www.backbone-international.com/portfolio/defqon-1-weekend-festival-2025/ ,
  2024 https://www.backbone-international.com/portfolio/defqon-1-weekend-festival-2024/ ,
  2023 https://www.backbone-international.com/portfolio/defqon-1-weekend-festival-2023/ ,
  2019 https://www.backbone-international.com/portfolio/defqon-1-weekend-festival-2019/
- Stage Roads (2023): https://www.stageroads.nl/alle-aandacht-tijdens-defqon-1-2023/
- CLF Lighting (2018): https://www.clf-lighting.com/clf-ledbar-pro-premiered-this-years-defqon-1-festival/
- Syncronorm Depence (2024): https://www.syncronorm.com/newsitem/defqon1-depence
- Production People: https://productionpeople.nl/live-entertainment/
- L-Acoustics Facebook (120 K1 / 78 KS28 / 84 K2): https://www.facebook.com/lacoustics.info/posts/65000-fans-120-k1-78-ks28-and-84-k2-this-is-defqon1-the-worlds-biggest-hardstyle/654124723418224/
- L-Acoustics K1: https://www.l-acoustics.com/products/k1/ ; K2: https://www.l-acoustics.com/products/k2/ ; KS28: https://www.l-acoustics.com/products/ks28/
- Pyrofoor: https://www.pyrofoor.com/services/pyro/
- Lights in Motion: https://www.lightsinmotion.nl/en/defqon-1/
- xyz dimensions (2018): https://www.xyz-dimensions.com/defqon1-2018/
- Hearkken (virtual 2025 stage, low credibility): https://hearkken.com/behind-the-mainstage-engineering-and-optimizing-the-defqon-1-virtual-2025-red-stage/
- Sibling project docs: `research/terrain-analysis.md` (frame, floorplan, field) and `research/production-analysis.md` (suppliers, lighting, pyro).
