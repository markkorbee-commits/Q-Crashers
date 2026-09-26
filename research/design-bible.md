# Design Bible: Defqon.1 2026 "Sacred Oath" — The Endshow (real-time 3D reconstruction)

Master reference for the 3D, graphics, audio and gameplay engineers. Self-contained: you do not need the
other research files to build from it, but every number traces back to them (see `sources.md`,
`uncertainties.md`, `show-analysis.md`, `terrain-layout.json`).

Compiled 2026-09-25 by the lead researcher from: 160 storyboard-frame analyses of the official video, six
research reports (event, stage, terrain, production, crowd/bars, music), and my own measurements on the key
images (official Endshow photo with EXIF, official thumbnail, daylight fan photos, drone frames f004/f087/f130).

**Where this bible overrides an earlier report, the bible wins.** The main overrides are listed in §13.

---

## 1. Conventions

### 1.1 Claim classification
Every non-trivial number carries a tag: **FACT** (cited source or directly visible), **INFERENCE** (strong
deduction from several facts or a calibrated measurement), **ASSUMPTION** (designed fill-in where nothing is
known; chosen to be plausible), **UNKNOWN** (not established; we still pick a value so the build can proceed).

### 1.2 World coordinate system (all layout numbers)
- Units: metres. Right-handed, Three.js style, **+Y up**.
- **Origin O** = centre of the stage-deck FRONT EDGE at floor level. WGS84 **52.4400834 N, 5.7575039 E**;
  RD New x = 180179.1, y = 494764.6; **Y = 0 = paved field floor = −2.38 m NAP** (FACT: AHN4).
- **−Z = into the stage; +Z = into the audience field.** A spectator facing the stage looks along −Z.
- **+X = the spectator's right** (bearing 235°, SW, towards the rest of the festival); −X = spectator's left
  (bearing 55°, NE, towards the Walibi Holland theme park).
- **The stage faces bearing 325° (NW)**; the audience looks towards 145° (SE). FACT (OSM road loop and aerial
  field edges parallel within 0.3°), independently confirmed by the moon position in frame f004 (§5.3).
- Direction vectors in world space: North = (−0.574, 0, +0.819); East = (−0.819, 0, −0.574).
- WGS84 → world (spherical approximation, error < 0.1 m over ±500 m):
  ```
  e = (lon − 5.7575039) · 68001.1        // metres east
  n = (lat − 52.4400834) · 111275.7      // metres north
  X = −0.819152·e − 0.573576·n
  Z = −0.573576·e + 0.819152·n
  Y = h_NAP + 2.38
  bearing b (deg) → horizontal world dir: X = −0.819152·sin b − 0.573576·cos b ; Z = −0.573576·sin b + 0.819152·cos b
  ```

### 1.3 Show clock
Show time `t` = seconds into the official video (0–1581). **t = 0 ↔ Saturday 27 June 2026, 22:32:45 CEST
(20:32:45 UTC), ±2 min (INFERENCE, §8.1).** All show content is a pure function of `t` (existing engine
design).
*Review note (2026-09-25): tolerance widened from ±1 to ±2 min — the f004 moon pixel on its own gives
t0 ≈ 22:31:15 ± 1.5 min (see §8.1); the visual difference is < 0.4° of moon travel.*

---

## 2. Vision and emotional arc

**One sentence:** a tribute that lets you stand on the Holy Grounds at blue hour and witness the Endshow that
was fired for an empty field after the first-ever Dutch code-red heat warning cancelled Defqon.1 2026 — and,
optionally, fill that field with the Tribe that could not be there.

**Tone:** reverent, melancholic, then triumphant. The real footage is eerie: a gothic dragon-cathedral
blazing with fire and lasers over a completely empty paved field, a low near-full moon to the right, the
last twilight behind you. Q-dance's own words set the frame (FACT): *"Some moments are too sacred to remain
unseen."* *"We are not defined by what was taken from us, but by what we've created … Forever One Tribe."*

**Two experience modes (both must ship):**
1. **As filmed (FACT mode):** empty grounds, ~10 crew figures (show-analysis §0.4), blue hour → night,
   sky/moon/weather exactly as §8.
2. **Tribe mode (counterfactual, default for first play):** 45,000 warriors (heat-reduced Saturday; slider
   0–65,000) behaving per §9, same show, same sky.

**Energy arc (0–10, from the audio section map; drives global intensity budgets):**

| Chapter (video s) | Start → peak → end | Emotional role |
|---|---|---|
| Winter (0–115) | 2 → 8 (75–97) → 3 | Awe. The frozen, dormant cathedral stirs. First fire. |
| Discorecord (115–274) | 4 → 9 (243.5) → 4 | Release. The grounds come alive; lasers skim the empty field. |
| Sacred Oath (274–567) | 4 → 9 (415.4, 502.1, 536.2) → 3 | Communion. The anthem; the MC alone on a stage built for 70,000. |
| L.P.A. (567–622) | 4 → 9 (589.7) → 0 | Comic relief ("losse polsjes"), then total blackout. |
| Sacred Flame (622–886) | 2 → 10 (829–877) → 3 | Ritual. Dancers, burning wings, the flame ring. Most replayed. |
| Domitor Draconis (886–1098) | 2 → 8 (1006–1091) → 3 | Menace and mastery. Piano in the dark; the dragon awakens and is tamed. |
| Embers (1098–1318) | 2 → 9 (1287–1312) → 3 | Cold euphoria; laser sea under the moon; ends on a single red ember. |
| In The Cold (1318–1581) | 3 → 10 (1511.2) → 0 | Farewell. Gold lasers, violet cage, the grand finale, blue cold fire, black. |

**The central irony to preserve (INFERENCE, production analysis):** "Embers" is the coldest-looking chapter
(blue/cyan) and "In The Cold" has the warmest lasers (gold) and the fire finale. The whole show is a
fire-versus-cold story told on a night when heat itself was the enemy.

---

## 3. The 2026 theme and storyline

### 3.1 Official theme (FACT)
- Theme **"Sacred Oath"**, revealed 2 Oct 2025. *"The Oath is a promise to ourselves to become the best
  versions of who we are. To love one another and celebrate our dedication to hardstyle… For four days on
  the holy grounds… we come together as one tribe."*
- Anthem: **D-Sturb ft. E-Life – Sacred Oath** (released 26 Mar 2026, 155 BPM, F minor). Lines quoted by
  Q-dance: *"Written in blood and set in stone. / Spoken in truth, we set the tone."*
- The RED design was kept secret until the (never held) Friday Opening Ceremony. The 2 July video was its
  first official reveal (INFERENCE, high).
- Post-event official wording: *"The mighty RED took on the shape of a powerful creature, tamed through JDX's
  Domitor Draconis"*; *"the emotional melody behind the weeping dragon"* (Sacred Flame). *Domitor Draconis* =
  Latin "tamer of the dragon". Fans call it the "Dragon Cathedral".
- Vocabulary: Tribe, Warriors / Weekend Warriors, Holy Grounds, "Forever One Tribe", ranks
  Challenger → Warrior → Berserker / Shaman / Guardian ("The Path"). Emotional colour: orange ("a proud orange
  heart"); stage colour: RED.

### 3.2 Narrative beats for the reconstruction (ASSUMPTION, consistent with all FACTs)
1. **Winter** – the cathedral is frozen and dormant; the Oath-keepers' crystal lanterns burn blue.
2. **Awakening** – first fire answers the orchestra; the grounds wake (Discorecord).
3. **The Oath** – the Tribe (or, as filmed, one voice on an empty stage) swears the Sacred Oath.
4. **The breather** – the Tribe laughs together ("losse polsjes"), then darkness.
5. **The Sacred Flame** – ritual guardians carry lanterns to the dragon; the wings burn; the ring of fire
   closes around the grounds; the dragon weeps.
6. **Domitor Draconis** – in the dark a lone pianist sends a single beam from lantern to lantern; the dragon
   wakes in venom green and red and is tamed.
7. **Embers** – the fire sinks to embers under the moon; a sea of cold light; one last red ember.
8. **In The Cold** – golden light draws the Tribe's sign on the field; farewell; the finale; blue cold fire;
   black. Card: *"Forever One Tribe."*

### 3.3 The real-world storyline to tell (FACT, for intro/outro cards)
- 18 Jun: heatwave begins (6th-strongest in NL since 1901). 24 Jun: heat plan, day tickets for Fri/Sat
  cancelled. Thu 25 Jun 15:56: KNMI issues the **first-ever code red for extreme heat**. Thu 25 Jun
  18:00–23:00: The Gathering (the only day that happened). Fri 26 Jun ~00:00: festival cancelled ("The
  unthinkable has happened"). Fri 26 Jun: 39.4 °C at Ell; 36.8 °C at Lelystad.
- Sat 27 Jun evening: the Endshow is performed and filmed on the empty grounds ("safer to set off the
  fireworks than to dismantle them"); only authorities and professionals present. Thunderstorms (code
  orange 21:41) arrive at Lelystad 23:00–24:00. Published 2 Jul 2026 20:00 CEST (YouTube `fLWY-Sxb1bE`,
  1581 s). ~2 million views by 25 Sep 2026. 2027 dates: 24–27 June.

---

## 4. Colour palettes

Emissive hexes are *source light* colours for shaders (saturated); "graded" hexes are what the video shows
after grading (use for look-dev references and for the post-grade LUT). INFERENCE from frame sampling unless
tagged.

### 4.1 Global tokens

| Token | Emissive | Graded ref | Use |
|---|---|---|---|
| defqonRed | #FF0A14 | #9F0A1F / #D03B56 | red washes, red stars |
| deepRed | #8A0010 | #60010D | fire-section ambient |
| fireOrange | #FF6A00 | #B44F21 | flames, orange comets |
| flameCore | #FFD08A (core #FFF2C0) | #E1A074 | flame/gerb cores |
| gold | #FFB640 (laser #FFC000) | #F5CCAB / #BBB396 | brocade, gold lasers |
| iceWhite | #D8ECFF | #A8C4D8 | cold beams, strobes |
| coldBlue | #1E3CFF | #0625B2 / #082763 | blue washes |
| laserBlue | #1A2BFF | #02049F / #060EB3 | 445–465 nm lasers |
| laserGreen | #00FF55 | #20E060 / #0FBD7E | 520 nm lasers |
| laserRed | #FF1418 | – | 638 nm lasers |
| cyan | #00E5FF (teal #16C8B0) | #1E77D5 / #14AE7A | cyan lasers, Embers stage |
| dragonGreen | #3CFF6E | #77AF68 / #59A880 | Domitor Draconis |
| magenta | #FF1FB8 (laser #FF20C8) | #8B1D76 | anthem, In The Cold |
| violet | #8A2BFF | #801FAC / #3F0158 | anthem, finale build |
| windowAmber | #FFAE42 | – | static warm castle windows |
| crystalBlue (default lantern) | #40A0FF | #4273C2 / #5BA1D2 | delay-tower crystals |
| shaftAmber (default pillar uplight) | #FF7A2A | #C56E46 | delay-tower shafts |
| practicalLantern | #FFF0C0 | – | dancers' hand lanterns, bulbs |

### 4.2 Palette per show phase

| Phase (s) | Sky (graded) | Base wash | Accents | Structure pixels | Lasers | Crystals / shafts | Pyro & fireworks |
|---|---|---|---|---|---|---|---|
| A Winter 0–126 | zenith #01204C→#002957, SE horizon #0E2D4A | castle blue #3050D0 | dragon #E06030; red hits #FF1A2A, smoke #D74C5D | wing outline #E0A0C0, dragon violet #6040C0 | none | blue #5BA1D2 / amber #C56E46; off at 118 s | red Bengal, white-gold gerbs #FFE8B0 |
| B Discorecord 126–273 | #000930–#011B4F | dark; cool beams #E8ECFF | magenta #C040FF | red/orange #E04030 + blue #3050FF stripes | green #00FF55, cyan #00E5FF, blue #1A2BFF, white web | cyan #4FBEBE–#6DD7D9 / red #8B1E1D | white-gold comets & fountains, green-lit smoke #8DB57C |
| C Sacred Oath 273–566 | #000024–#00001B | violet #6D24B9 / magenta #982894; drop 2 deep blue #070289 | MC backlight #CBDEE2; red finale #B3132C | red/orange/white stripes, white rosettes, white/cyan window bars | lavender zig-zag #C8C8FF, magenta #E070FF, blue sunburst #2B34B5 | warm #FFB040 → blue #40A0FF; shafts orange #FF8A2A / blue #2040FF | red crackle #E02030, gold brocade #F0D8A0, white serpent #FFF0D0 |
| D L.P.A. 566–638 | black | deep blue #110E87 | red-orange #E05020 | chases #FF5020 ↔ #40A0FF | none | cyan-blue #40B0FF / orange #FF8030 | white flash mines #F4EFE7, gold fountains |
| E Sacred Flame 638–886 | black | red #990D0A / #A41A21 | fire #BB4F1E, lantern #FFF0C0, yellow rosettes #FFD040 | red with white dashes, red/white striped ribs | none (violet line UNKNOWN) | amber #FFC080 / #FF9A50 "flame"; shafts red #A61622 | flames, silver glitter #FFF0E0, red comets, orange X-fans |
| F Domitor 886–1098 | black | black → green #20C050 + red #E02030 | gold #D0A040, teal booth #20A0A0 | green edges, red/amber fans | white bounce #E8ECFF; cyan fans #40A0FF | red-orange #FF5A3A / green #20C060; later purple #A060FF, ice-blue #76ABDE | twin torches #FFB030 (core #FDEFC0), white-gold + orange comets |
| G Embers 1098–1320 | black, moon #D7CAE4 | monochrome blue #1A2AFF | ice #A0C8FF, warm outline #FFC070 | teal star rosettes #40E0B0 | cyan #3CD7FE sheets & X, blue lattice #1A2BFF | cyan #42EEFD / blue | pink crackle #FF60C0, red/pink canopy #8B2E4A, white gerbs; final ember red #982D3E |
| H In The Cold 1320–1581 | black | dark → violet #360071 / magenta #78028B | red/pink pixels #FF3060 | rosettes blue-violet #6040FF / pink sunburst | gold chevron #FFC000, blue line, magenta sheet #FF20C8, lavender cage #E0D0FF | red/orange #FF6030 / magenta-violet | white/silver gerb wall, finale gold #F7DBC0 / orange #E37B42 / red #AE2711; outro cold-fire plumes #465CA9–#7F96D0 |

### 4.3 Materials (unlit albedo; PBR)

| Part | Albedo | Metal / rough | Tag |
|---|---|---|---|
| Wing membrane print (flame art) | orange #E0662A, red #B0382A, crimson #6E1A1E, soot #1A1214, sun-yellow #F6B23A | 0 / 0.75 (+0.1 transmission) | INFERENCE (pixel-sampled daylight) |
| Wing spars | copper-orange #B8622E | 0.3 / 0.5 | FACT look |
| Dragon scale shell | red #A8453A, groove #3A1A1E | 0.1 / 0.55 | INFERENCE |
| Crest spikes, blades, talons | steel #A9B2BD (talons glossy #C8CCD4) | 0.9 / 0.35 | FACT look |
| Teeth | ivory #E8D6A0 → orange #D98B3A | 0 / 0.3 | FACT look |
| Tongue | #A63A3A | 0 / 0.35 | FACT look |
| Rider armour | dark grey #3C3C44, bone #BFC3C8 | 0.6 / 0.5 | FACT look |
| Mechanical foreleg / claw | gold-bronze #B08D57, perforated | 0.8 / 0.4 | FACT look |
| Castle stone (printed flats) | warm grey #A7A39B, mortar #5C5C60, grime streaks | 0 / 0.9 | FACT (flats) |
| Stone sculptures | grey-blue #6E7A8A + gold veins #D4A437 | 0 / 0.8 (veins 1 / 0.3) | FACT look |
| DJ portal frame, logo shield | bronze-gold #B08D57; logo cream #E8E4D8 | 0.85 / 0.35 | FACT look |
| Stage skirt, banners | dark red #5C0A19; booth banner #4A1C1E + gold #C9A45C | 0 / 0.95 | FACT look |
| Delay-tower shaft | cream stone #CDBFA6 (day), reads near-black at night | 0 / 0.9 | FACT look |
| Crystal lantern | white-silver #E6ECF2, faceted, emissive | 0 / 0.1 | FACT look |
| Field concrete | #A9A99C (edge lanes #8F8D86) | 0 / 0.85 | FACT (aerial) |
| Hard-standing / gravel | #858278 / brown gravel #7A6A55 | 0 / 0.95 | FACT |
| Grass banks (after the heat) | parched #7C7F4A (lush alt #56703A) | 0 / 0.95 | ASSUMPTION |
| Tree canopy | #2A3230–#3E5A2C | – | FACT (aerial) |

---

## 5. MAINSTAGE ("the RED", Dragon Cathedral)

### 5.1 Concept (FACT, from images)
A giant red-orange mechanical **dragon head** with open fanged jaws crouches on a grey **gothic castle /
cathedral**. An **armoured rider** (dark armour, long black dreadlocks, red sun shield) sits on its
leopard-patterned back (viewer-right). *(Round-3 correction, §5.13: the "gold perforated mechanical foreleg with
3 talons" is not in any daytime photo; the gold element under the chin is the gold-scaled vault roof in front of
the portal.)* Two huge **bat wings** spread left and right, each with **3 raised finger spars** ending in spiky
flame finials, printed flame membranes, **3 sun rosettes**, white arrowhead / kunai plates along the spars, and
moving-head rows on the gilt top edges; each wing's arm arches from the dragon's shoulder down to a wrist
standing in front of the outer castle bays. The castle continues as long **side sections**, and
low **forward arms** run along the side banks, so the stage is a **U enclosing the front of the field**. The
**8 delay towers** on the field are dressed as **stone obelisks with faceted crystal lanterns** (the "lantern
pillars"). **No LED video walls** (FACT: Q-dance "we don't use any video walls"; none visible in 160 frames):
the structure itself is the screen (pixel outlines, window bars, rosettes, mouth dots).

### 5.2 Final dimensions (the build numbers)

| Module | Value | Range | Tag |
|---|---|---|---|
| Straight stage front incl. side sections | **184 m** (X −92…+92) | 180–190 | INFERENCE |
| Central recess (castle core, dragon, wings) | X −37…+37 (74 m) | ±3 | FACT (floorplan) / INFERENCE |
| Deck (central) | X −37…+37, Z −14…0, **top Y 1.9** | deck 1.8–2.2 | INFERENCE (people vs fascia 65/73 px) |
| Wing finger tips | (±14.5, **26.5**), (±29, **28.0**), (±40.5, **26.5**) at Z −20 → **span 81 m, crown top 28 m**. *Round 3 (§5.13): finial spear tops (±14.5, 29.5), (±29.4, 29.9), (±39.8, 26.8) at Z −21…−21.6; wrists at (±26.4, 4.6, −8.8)* | span 76–89; height 25–31 (review note §5.3) | INFERENCE (3 methods, §5.3) + daytime photos |
| Dragon | skull 9 m wide; head incl. horns ~16 m; mouth 7 × 5.5 m; chin Y 9.3; **crest top Y 21.5**; rider top Y 23 | ±10 % | INFERENCE |
| Castle core | crenellations Y 9.5; gothic towers Y 14–16 (spires to 18). *Round 3 (§5.13): core front wall walk Y 8.1, inner towers set back to Z −15 (under the wing arm), outer towers removed* | ±1.5 | INFERENCE + daytime photos |
| DJ portal | 5.4 m wide, apex Y 7.2, front Z −6 | ±0.5 | INFERENCE |
| Main PA | inner hangs X ±11, outer X ±31; array Y 4.9–14.2 | ±1 | INFERENCE (K1 ruler) |
| Side sections | X ±37…±92, front wall Z −4, rear wall Z −22 (at \|X\| 37) → −30 (at \|X\| 80) (floorplan rear band reaches −37), wall top Y 9.5, towers to 13.5, corner towers (±92, −4) to Y 15 | ±5 | INFERENCE / ASSUMPTION |
| Forward arms | along X ±93 from Z −4 to **Z +58** on the upper bank slope | end Z 50–65 | INFERENCE (drone projection) |
| Rear of structure | scaffold to Z −45 (floorplan stage band Z −43…−49 = rear fence line) | ±5 | INFERENCE |
| Delay-tower obelisks | **8 at X ±20, Z 36 / 69 / 102 / 135**; crystal tip Y 12.8 | X ±2, Z ±6, h ±1.5 | INFERENCE (§5.3) |

### 5.3 How the numbers were resolved (justification)

The inputs disagreed on three things: overall height (production analysis assumed 45–50 m; stage analysis
measured ~25 m), the delay-tower grid (official floorplan: columns 43 m apart, rows 27 m apart; stage
photogrammetry: columns 32 m apart), and where the stage front sits relative to the towers. I resolved them
with three independent rulers and one geometric self-check.

**Ruler A – L-Acoustics K1 boxes and people (independent of the field).** K1 boxes are 1.34 m wide (FACT,
manufacturer). In the official telephoto thumbnail the inner hang is 52 px wide and the two inner hangs are
845 px apart → **21.8 m** apart (X ±10.9). In the near-frontal golden-hour telephoto (HouseMafia), finger-tip
span / inner-hang separation = 713/190 px = 3.75 → **span 81.8 m**; tip height / inner-hang separation ≈
240/190 → **~27.5 m**. The DJ arch is 3.5–3.9 hang-widths wide in two photos → **~5.4 m**, consistent with a
1.70 m crew member in front of the booth in the daylight still. People vs the black deck fascia (65 vs 73 px)
→ **deck 1.9 m**.

**Ruler B – moon-calibrated drone camera (frame f004, t = 39.5 s).** I fitted a pinhole camera to the 4 pillar
pairs, the horizon and the moon. With focal length f = 870 px (1280-wide frame, a 24 mm-equivalent drone lens)
the ephemeris moon of 22:33 (az 161.5°, alt 7.4°) projects to (929, 80) against the measured (925, 80). The
same camera then gives row-spacing / column-spacing Δ/S = 0.88. Forward-projecting the final model into that
camera reproduces the frame:

| Model point (X, Y, Z) | Predicted px | Measured px |
|---|---|---|
| Wing tips (±40, 26, −20) | 494 / 763 | crown 495 / 770 |
| Side-section corners (±90, 9.5, −4) | 310 / 948 | lamp-row ends 300 / 955 |
| Arm ends (±94, 8.4, 55) | 185 / 1057 | 155 / 1085 |
| Pillar lanterns (±20, 10.5, 36…135) | back-projected Z 35 / 69 / 102.7 / 135.4 | – |

This only works with the 81 m crown if **S ≈ 40 m** (with S = 32 m the crown would appear 25 % wider than it
does).

**Ruler C – EXIF photogrammetry of the official Endshow photo** (Sony A7 III, 36 mm, 2026-06-27 22:41:39,
f = 6017 px full-res). The three visible obelisk pairs (separations 1230/818/618 px at 1880-px scale) are
equally spaced, so the camera stands 2Δ in front of the nearest visible pair, and S/Δ = 1.226 from the focal
length alone. With S = 40 m: Δ = 32.6 m, camera at Z ≈ 168 (front of the decking / RED Experience terrace),
height 6.8 m. Cross-checks with that camera: a crew member walking on the field measures **1.61 m**; the FOH
railing 1.55 m (railing on a raised platform); crystal tips **12.4–12.9 m**; inner hangs **21.9 m apart**
(Ruler A: 21.8 m); finger tips at X −38.5 / +40.7 and **27–28.5 m** high.

**Rejected alternatives.**
- *45–50 m height* (production-analysis ASSUMPTION, calibrated on 2025's 48 m stage): would need 16–18 m
  line arrays (maximum 24 × K1 = 10.6 m) and contradicts all three rulers.
- *Floorplan taken literally* (S = 43, Δ = 27; S/Δ = 1.6): incompatible with both calibrated cameras
  (S/Δ = 1.14–1.23). The icons are schematic; their column spacing is right, their row spacing is compressed.
- *S = 32 m* (stage-analysis v2): self-consistent with the EXIF but shrinks the stage ~20 % below the K1/human
  ruler (inner hangs 17 m, arch 4.1 m) and makes the walking crew member 1.33 m tall.

**Context (FACT, Backbone International): earlier RED stages** were 162 × 50 m (2023), 114.5 × 34 m (2024) and
197 × 48 m (2025). The 2026 design is **wide and low**: 184 m of castle frontage plus 62 m forward arms, but
only 28 m tall — a castle on the ground with spread wings, no tall towers or crown truss. Frame proportions
agree: core width : height (deck to spire tips) = 3.1–3.3 : 1 (f098, f115) → 81 / 3.2 ≈ 25 m above the deck.
The chosen tower rows (36/69/102/135) are within 2–4 m of the physically measured 2024 towers (34/69.5/105)
on the same site.

**Review note (independent review, 2026-09-25).**
- *Ruler A is not depth-corrected.* The finger tips (wing plane Z −20) stand ~16 m behind the inner hangs
  (Z −4), so in any photo taken from 150–300 m they look 5–10 % smaller than they are. Corrected, Ruler A gives
  a span of ~85–89 m and tips at ~29–30 m. Ruler C, which does model depth, gives 79 m. The three rulers
  therefore agree less tightly than stated above. 81 m stays as the build value, and the range is widened to
  76–89 m (span) and 25–31 m (height).
- *Re-measured on the official photo P (1880-px scale, f ≈ 2006 px, camera at Z 168, axis vanishing point
  x ≈ 945–958).* Finger tips at x 521/632/786 (left) and 1107/1257/1368 (right). Back-projected to Z −20,
  these give X ≈ ±39.7 (outer), ±29.2 (middle) and ±15 (inner). That matches the table to within 1 m. The
  heights come out at 26–28.5 m; the inner tips may be closer to 28 m than 26.5 m.
- *The ground plane in photo P is consistent with the layout.* Fitting y = a + b/d through the three
  plinth-front edges puts the deck-front ground line (y ≈ 872) at Z ≈ 0. It also puts the FOH enclosure's
  front edge (y ≈ 963) at Z ≈ 90 ± 3, the small riser's front edge (y ≈ 915) at Z ≈ 59 ± 3, and the walking
  crew member at about (7, 0, 19). The FOH and the riser may therefore sit up to ~3 m closer to the stage
  than §5.11 says. That is within tolerance, so they were not moved.
- *The moon is visible in photo P, at (1648, 503)/1880* (the disc between the canopy and the lattice mast on
  the right). That puts it ~19 ± 2° right of the stage axis and ~7.8° up. The ephemeris at the EXIF time
  22:41:39 gives az 163.35° (18.35° right of the 145° look direction) and alt 7.9°. This confirms the 325°
  stage bearing to within ~±2° and the EXIF clock to within several minutes, independently of f004.
- *Re-check of the f004 fit.* Re-projecting the model with the camera stated in §5.12 reproduces the
  quoted pixels. Overlaid on the frame, the 8 lantern heads, the horizon (y ≈ 205) and the lamp-row
  corners land on the image features. FACT: moon centroid measured at (925.0, 80.6).

### 5.4 Deck, front line and DJ portal
- **Central deck:** box X −37…+37, Z −14…0, top Y 1.9. Front skirt dark red #5C0A19; black tubular railing
  1.1 m on the upper castle platform. Deck lip carries the 24 deck flame heads, 20 gerbs, 12 comet
  positions, 40 beams, 40 strobes, 24 blinders, 12 lasers, wedge monitors (FACT look). *(Review note: the
  strobe count was 24 here but 40 in §7.1. It is aligned to §7.1: deck lip 40.)*
- **Front-line lamp row:** small warm/white (show-variable) lanterns on posts along the side-section
  ramparts at Y ≈ 9–10, every ~8 m, plus a violet/blue LED line at deck height across the full width (FACT
  f140) — this is the "row of ~15 small lights" seen in the dark opening.
- **DJ portal** (FACT look): gothic pointed-arch portal, **5.4 m wide, apex Y 7.2**, front face at **Z −6**,
  3 m deep, ornate bronze-gold scroll frame (#B08D57) with cream chevron trim, black interior with a small
  chandelier, concentric ribbed rings ("turbine"), a ring of ~10 warm bulbs on the arch, 6–7 downward spots
  in the crown, aerialist hang point. Booth desk 4 × 1.1 m at Z −7.5 on the deck, dark-red banner #4A1C1E
  with gold print. **Defqon.1 logo shield** (cream on bronze, reads as a red diamond keystone under red light)
  1.8 × 1.6 m at Y 7.4–9.0, directly under the dragon's chin.
- Decorative stone staircases (oversized steps) left and right of the portal from the deck (Y 1.9) to the
  upper castle platform (Y 5.5) at X ±6…±12 (FACT look, dimensions ASSUMPTION).
- **Subs:** 12 ground-stacked cardioid KS28 blocks (each 2 wide × 3 high = 2.7 × 1.65 × 1.1 m) along
  X −42…+42 at Z +1.2…+2.3 (FACT: black blocks visible in front of the stage; count ASSUMPTION ~72 KS28).
- **Pit barrier** (ASSUMPTION): 1.2 m steel crowd barrier, polyline (−92, −1) → (−46, 6) → (46, 6) → (92, −1).

### 5.5 Castle (central section)
- Printed scenic flats on scaffold towers (FACT, teardown). Central facade plane **Z −12**, width X ±37.
- Crenellated wall top **Y 9.5** (merlons 1.2 m). **Gothic towers** 5.5 × 5.5 m with 3 tiers of round/lancet
  windows and pointed caps: X ±14 (tops Y 16, these carry the twin 15 m flame torches) and X ±24 (tops Y 14),
  spires to Y 18; white conical-capped turrets.
- Ground **arcade** of round/pointed arches Y 2–6 lit purple/blue; lancet windows with **vertical white/cyan
  LED bars (~6 per side)**; one large pointed-arch window per side (X ±26…±31) that glows solid colour; paired
  narrow gothic windows at X ±24…±27, Y 5–9.
- **Flame-eye banners** (red, orange flame + all-seeing eye, gold border) 2.5 × 6 m, backlit; **skull
  medallions** Ø 3.5 m with glowing eyes at (±20, 6.5); arched **skull niche** panels 4.5 m tall; **grey-blue
  stone sculptures with gold veins** in niches (FACT look).
- *Round-3 corrections (daytime photos, §5.13):* the printed stone reads **white / light grey** (off-white
  blocks, grey joints, dark grey window openings). The core front tops out at **Y ~8.1** (level with the skull
  cubes, just above the portal crown), with the towers set back under the wing arches. The "skull medallions"
  are **skull cubes**: white stone blocks ~4.2 × 4.1 m, Y 1.9–7.4, on the deck at (±19.6, Z −8.3), a skull
  relief in a gilt arched niche on the front and outer faces (eyes glow at night). Orange-red **flame-eye
  banners** flank the portal (X ±5) and hang in the outer bays (X ±27.4) and on the side sections; a large grey
  **stone face relief** (mask) in a gilt niche sits on the facade right of the portal (X +15). The twin 15 m
  flame torches stand on the wall walk at X ±11.6 (in front of the wing arm), not on the (now set-back) towers.

### 5.6 Dragon
- **Head:** skull pivot at **(−2.5, 14, −12)**, snout pointing **yaw −12°** (towards −X) and 5° down;
  snout/teeth line at Z ≈ −5 (overhangs the portal). Upper skull and lower jaw are separate modules (FACT,
  teardown). **Mouth opening 7 × 5.5 m, gape ~40° (static; no jaw animation observed)**; chin Y 9.3.
  - Teeth: ~9 big upper fangs (1.5–2.2 m) + ~8 lower + inner rows (~34 cones), ivory → orange.
  - Tongue 5 × 2 m, pink-red; throat dark red with a blue light deep inside.
  - **LED pixel dots** along gums, lips, palate and tongue: ~200 emissive points (mouth interior can glow
    pale pink/white); **eye** = ring of ~7 LED dots (white/pink or orange/red), Ø 0.9 m, brass ring.
  - **Crest:** 10 brushed-steel cones 3–6 m (base Ø 0.8–1.2 m) fanned over 150°; 2 long horns swept back
    6–7 m; jagged saw-blade plates between; crest top **Y 21.5**; 8 moving heads on the skull (FACT, teardown).
  - Triangular armour plates outlined with LED strip; vertical white-pink face stripes when lit red (f068);
    red LED Defqon.1 diamond on the chest (f068).
- **Neck/body:** coils to viewer-right X 0…+12 with chest plates and a **bronze gear ring Ø 3 m at
  (+6.5, 13, −10)** (the "round ribbed disc right of the head"); flame-crack printed skin behind the jaw.
  *Round 3 (daytime photos):* the back / neck and both wing arms wear a **leopard / giraffe hide** (orange-tan
  patches, dark-brown network); a crest of big **leaf-shaped dorsal plates** (cream-orange, dark veins) runs
  from the skull to beyond the rider; **silver scimitar blades** line the coil; under it a column of **dark grey
  vertebra discs**, a rack of long **copper bars** running right and flame-crack panels behind them. The ring
  right of the head is dark steel, not bronze.
- ~~**Right foreleg (viewer-right):** gold perforated mechanical arm X +8…+16 with 3 glossy talons hooked over
  the parapet~~ — **removed in round 3**: no foreleg or talons appear in any daytime photo; the gold element
  under the chin is the gold-scaled barrel **vault** (12–15 m long, 6–7 m wide) whose front is the portal. The
  red "orb" knuckle at (−10, 8.5, −9) is removed too (not in the daytime photos).
- **Rider:** seated armoured knight, 5.5 m tall seated, top Y ~24, dark grey / black armour, glowing white eye
  points (FACT look, thumbnail). *Round 3 (daytime photos): long black dreadlocks, red / white cloth, a round
  red **sun shield** (~Ø 3.4 m) on his left arm; he sits high on the back just right of the horn crown at
  (+5.6, 20.5, −18), level with the horn tips, not at (+6.5, 17.5, −16).*
- *Round-3 head corrections:* the head is ~15 % bigger than built before (scaled about a hinge at
  (−1, 15.9, −11.8); jaw tip resting on the portal crown, horn crown to Y ~23.5); the crest is **7–8 long
  silver-white horns fanning out and back** plus two long cheek horns sweeping back, with spiky orange-bronze
  plates between (not a mostly vertical fan of short cones).
- **Dragon light states** (for `stage.state`): `dormant` (unlit, pixel outline 10 %), `awake` (colour wash,
  eye on), `rage` (red/green, mouth glow 100 %), `frozen` (blue/teal, white pixels), `ember` (only head + inner
  wings red #982D3E), `blackout`. No fire from the mouth was observed in any frame (FACT); keep a hidden
  mouth-flame anchor at (−4, 11, −5) unused by default.

### 5.7 Wings (mirror pair)
- Wing plane **Z −20**, leaning back 10°. Roots at the shoulders (±5, 14, −16). *Round 3 (daytime photos,
  §5.13): the spars lean back ~30°: the **arm** arches from the shoulder (±6.2, 14.6, −16.6) down to a **wrist**
  at (±26.4, 4.6, −8.8) in front of the outer castle bays, with hooked ivory tusks hanging to the deck; the
  middle spar rises near-vertically from the wrist, the outer spar (the wing's outer edge, base (±36.2, 6.8))
  near-vertically at the outside, the inner spar from the arm (±21.6, 11) leaning in to the head. Under the arm
  the castle towers show through the arch.*
- **3 finger spars per wing** (copper tubes Ø 0.9 m): inner from (±6, 15) to (±14.5, 26.5); middle from
  (±9, 14) to (±29, 28); outer from (±12, 13) to (±40.5, 26.5). Each ends in a 3.5 m flame-shaped spiky
  finial (red/orange with silver points) and carries a comb of 8–12 silver blade spikes (1.5–2.5 m).
- **Membranes:** printed flame art; lower edges are scalloped concave arcs (gothic openings through which the
  castle shows); outer ends sweep down to the castle roof at (±41, 11, −18).
- **Rosettes:** 3 per wing, Ø 4.5 m, centres (±16, 15.5), (±24, 16.5), (±33, 15.5); yellow sunburst print by
  day, spoked gear disc with emissive centre at night (white, purple, yellow, teal star, blue-violet, pink
  sunburst per section). *Round 3: a yellow sunburst in a dark red ring framed by a **white spiky crown ring**
  (Ø ~5.8 m outer / ~4 m inner rosette); the membrane print is a painted inferno (orange-yellow flame streams
  through black smoke and soot bubbles on deep red); the scalloped top edges carry a **gold band** with the
  black moving heads on it; the spars carry a chain of **white arrowheads** pointing to the finial with a
  perforated **kunai blade** out to the side at each (10–13 per spar); the finials are a red-gold sun orb with
  gold ear plates and a crescent of white blades, an orange flame blade and a white spear point.*
- **Lower wing arm** (root → outer end): copper tube with perforated silver bone plates and rows of sickle
  hooks. Ivory tusks at the wing roots. *Round 3: the arm is leopard-patterned (the same hide as the back), with
  silver scimitars; the tusks at the wing roots are big silver-white horns hanging either side of the head.*
- Fixtures: continuous row of moving heads on the leading edges at 1.3 m pitch (2 × 60), LED pixel strips on
  every rib and spar, 20 strobes per wing, 6 flame heads per wing (§7.5), gerbs on the 6 finials.

### 5.8 Side sections, corner towers and forward arms
- **Side sections** X ±37…±92: castle walls (front Z −4, rear Z −22 at |X| 37 → −30 at |X| 80), level wall
  top **Y 9.5** (the bank rises underneath, ground Y 0 at |X| 46 → 4.4 at |X| 92), towers 5 × 5 m at |X| 48,
  63, 78 (tops Y 13.5, white conical caps), red banners 2.5 × 7 m, skull medallions, **purple-lit crystal
  lanterns on posts** along the rampart every 8 m (lantern 1.2 m, top Y ~11.5), vertical LED pilaster strips,
  Bengal flare pots at (±86, 9.6, −4.5) (INFERENCE ±7 m). *Review note: these were at ±63. In drone frame f006
  the two red sources sit at 29.7–33.7 % and 70.5–71.8 % of frame width. The straight front line's corners
  are at 27.3 % and 71.0 % (f005), so the sources are at the outer ends of the front line (|X| ≈ 75–92),
  not mid-way along the side sections. At ±63 they would show at ~34 % and ~64 %.*
- **Corner towers** at (±92, −4): 6 × 6 m, top Y 15; beam fans, 2 lasers each, fireball flame unit.
- **Forward arms** (the lit lines that angle "forward" in the aerials are, in plan, parallel to the axis
  along the upper bank slope): from (±92, −4) to (±94, +58). A low crenellated rampart 1.4 m above local
  ground (ground Y ≈ 4.5), with **8 crystal-lantern posts** at Z 2, 10, 18, 26, 34, 42, 50, 58 (post 4 m,
  lantern 1.2 m), each carrying a flame head + gerb/fountain + comet tube; **4 m openings** between posts from
  Z 30 onward (bar access). **Arm-end turret** at (±94, 58): 4 × 4 m, 8 m above local ground (top Y 12.5),
  beam fixtures (fans aimed across the field), 3 lasers, the orange comet X-fan position.

### 5.9 PA system
- **Inner hangs** at (±11, −, −4) and **outer hangs** at (±31, −, −6): 20 × K1 each (box 1.34 × 0.44 m;
  array Y 4.9–14.2, bumper 14.6), hung from black 1 m lattice truss towers standing on the deck/ground (top
  Y 16.5 with 8 fixtures and a blade finial). Beside each main array a 10 × K2 side hang (1.34 × 0.35 m).
- **Delays:** 2 × 6 K2 flown on the +Z face of each obelisk at Y 4.2–8.2, aimed +Z (FACT look).
- Subs: §5.4. (2025 reference, FACT text: "120 K1, 78 KS28 and 84 K2"; 2026 counts ASSUMPTION.)

### 5.10 Delay-tower obelisks ("lantern pillars")
- **8 towers: X = ±20; Z = 36, 69, 102, 135** (rows 1–4 from the stage). They form the processional aisle;
  clear walkway between plinths = 31.5 m.
- **Plinth** 8.5 × 8.5 m, deck Y 0.4, dark bronze lattice railing 1.1 m, 4 bronze cannon/mortar props (1.8 m
  barrels) at the corners (FACT look).
- **Shaft** 2.6 × 2.6 m, stone-clad (cream by day, near-black at night) with gothic arched panels; base
  moulding 3.4 m square to Y 1.6; **vertical RGB LED strips on all 4 faces** (the "shaft" colour) + 4 RGB
  uplights at the base; capital/cornice 3.4 m square at Y 8.8–9.6; red flame banner 1.2 × 3 m under the
  delay arrays.
- **Crystal lantern:** elongated octahedron 2.5 m wide, 3.2 m tall (Y 9.6–12.8); upper pyramid dark cap,
  lower inverted pyramid emissive with mullions and a bright point at the bottom (FACT f113). RGB, default
  blue #40A0FF. Crystals of rows 1 and 2 act as **laser mirrors** in Domitor Draconis.
- On each capital: 1 flame head (2–3 m), 1 gerb, 1 beam fixture, 1 laser (row 1–4 capitals).
- Colour states over the show: see §7.2.

### 5.11 Field furniture on the axis
- **FOH / camera platform:** X −6.4…+6.4, Z 87–93, deck Y 0.5, railing 1.1 m, camera operator on a tripod
  (FACT photo). Festival-mode option: add a 2-tier black scaffold FOH (roof Y 8) on the same footprint
  (ASSUMPTION).
- **Piano riser:** X −2.8…+2.8, Z 57–61, deck Y 0.6, railing on 3 sides; white grand piano with a vertical
  white light tube (laser source at Y 1.8) for Domitor Draconis (INFERENCE: the small fenced riser in the
  photo sits exactly where the laser bounce converges).

### 5.12 Reference cameras (for look-matching)

| ID | Position | Aim / lens | Use |
|---|---|---|---|
| Drone f004 | (8.9, 57.3, 236.6) | pitch −10.1°, yaw 1.2° left of axis, f = 870 px @1280 (HFOV 72.6°) | layout validation |
| Official photo | (0, 6.8, 168) | 36 mm FF (HFOV ≈ 50°) | hero still at t ≈ 538 s |
| Hero field cam | (0, 1.8, 172) | yaw 0, pitch +9°, HFOV 69° | moon at right, 4 pillar pairs |
| Far-aisle cam | (0, 3, 175) | at (0, 8, 0), HFOV 55° | dark opening |

Full camera family list: show-analysis §0.1.

### 5.13 Change log: round-3 stage fidelity pass from the daytime photos (2026-09-26)

Sources: five daytime photos of the finished 2026 MainStage on the empty grounds (ground front-left, axis
telephoto, front, two drone views), the official photo P and the night test photo. Where they contradict the
numbers above, the geometry was changed and the entry above is marked "Round 3".

- **Wings:** re-laid (src/stage/dragon/layout.ts). The round-2 1.12x scale-up put the outer finials ~4 m too far
  out and 2.4 m too high; the spars now lean back ~30° from a low wrist in front of the outer bays (photo P:
  outer tips just outside the row-2 crystals; axis telephoto: outer finial clearly lower than middle / inner).
  New art: painted-inferno print, sunburst rosettes with white spiky rims, gold hem band, arrowhead + kunai
  plates on every spar, finials (sun orb, gold ears, white crescents, flame blade, spear), hooked tusks and
  spikes at the wing bottoms, leopard arms with scimitars.
- **Castle:** core front wall walk 9.5 → **8.1** (side sections stay at 9.5); outer towers (X ±25.5) removed (the
  lower wing stands there); inner towers set back to Z −15 under the arm; skull medallions → **skull cubes** on
  the deck; banners added at the portal and the outer bays; stone face relief right of the portal; printed stone
  off-white. The twin torch anchors (show-analysis 6.7) moved to the wall walk at X ±11.6, and the inner towers'
  rig anchors (towers_top, lasers, truss fixtures) to the wall walk in front of them.
- **Dragon:** head +15 % (hinge (−1, 15.9, −11.8)), horn crown of long silver horns + cheek horns; foreleg,
  talons and the left "orb" removed; leopard back / arms, dorsal leaf plates, scimitars, vertebra discs, copper
  bars; rider with dreadlocks, red / white cloth and a red sun shield, seated at (+5.6, 20.5, −18).
- **Deck:** the stage floor is painted **red** (photos; `PAINT.deckTop`). The photos show black fascia / risers
  under the red floor (§5.4 has a dark-red skirt), red square platforms with a gold logo and a red half-round
  platform front-left: left to the deck / vault module, like the gold vault, its stairs and the red field lines.
- **Night calibration kept:** the re-painted art is ~2x brighter than the old albedo (castle stone, wing print,
  leopard hide, decor); every such material scales its albedo back by a measured `nightK` (texture-mean ratio
  old / new) in the show, so the dark night castle and the calibrated looks keep their levels; the dev-only
  `?daylight` URL flag (off by default) shows the true albedo under a flat afternoon sun for art review.

---

## 6. TERRAIN (world coordinates; machine-readable copy in `terrain-layout.json`)

### 6.1 Orientation and horizon
- Stage faces 325° (NW); audience looks 145° (SE). The last twilight glow (sun az 318–323°) is **behind the
  audience**; the sky behind the stage is darker; the **near-full moon hangs low, 16–22° to the right of the
  stage** (§8.2).
- −X side (left): Walibi Holland theme park, dark at night; the **Goliath coaster (46.9 m)** lift hill rises
  behind stage-left over the ~20 m tree line (track X −178…−73, Z −365…−64, FACT OSM/RCDB).
- +X side (right): the rest of the festival: **YELLOW stage** at (182, 18) (lit magenta/red in the video: the
  "magenta structure right of the stage"), INDIGO (246, −85), GOLD (350, −43), MAGENTA (385, 132), UV
  (311, 244), BLUE (445, 257). Their lights are the coloured clusters on the right horizon (FACT frames).
- Behind the audience (+Z): lake (shore Z ≈ 172–184, water Y −1.8), premium deck, beach and Ferris wheel
  (PURPLE area, (86.5, 187.5), Ø 32 m, wheel plane parallel to Z).
- Horizon otherwise flat polder with tree lines (FACT).

### 6.2 Relief (AHN4, FACT; analytic fit ±0.3 m)
```
side(X,Z) = (−20 ≤ Z ≤ 105) ? clamp((|X|−46)·0.096, 0, 5.2) : 0            // inner bank slope 9.6 %
            crest |X| 100…109: 5.2…5.6 ; outer slope |X| 109→126: 5.4 − (|X|−109)·0.32
            ramp down over Z 105→115 at the back corners
rear(Z)   = (Z < −5) ? clamp((−Z−5)·0.10, 0, 5.6) : 0                      // crest Z −62…−55, notch 1 m lower at X ±6
Y = max(side, rear) ;  for Z > 113: Y = −0.5·(Z−113)/59                      // gentle fall to the lake
```
Heightmap: `refs/terrain/ahn_heightmap_redframe_2m.json` (161 × 186 samples, 2 m).

### 6.3 Surfaces

| Surface | Geometry | Look | Tag |
|---|---|---|---|
| Paved field floor | X −44…+44, Z 0…113 | light-grey concrete slabs #A9A99C, gully inlets every ~10 m at X ±29; slightly darker central aisle strip X ±12 (ground cover/cable path) | FACT / ASSUMPTION (strip) |
| Service lanes | 2–3 m along X ±43 and Z −2…−4 | #8F8D86 | FACT |
| Hard-standing | X −44…+44, Z 113…137 | compacted brown gravel #858278 | FACT |
| Side banks | \|X\| 46…126, Z −20…105 | parched grass #7C7F4A; paved cross-paths at Z ≈ 21; crest service paths at \|X\| 99…107 | FACT / ASSUMPTION (colour) |
| Main road | centreline (−137,94)(−131,110)(−114,131)(−87,144)(−44,143)(43,143)(128,160)(188,179)(245,181), 12 m | light gravel/asphalt #B2AC9B | FACT |
| Decking | X −57…+47, Z 149…172 | timber boards, Y −0.3 | FACT 2024 / INFERENCE |
| Premium deck ("Exclusive RED Experience") | X −52…+51, Z 172…211 over water, 3 tensile roofs; photo terrace X ±30, Z 166…172 at Y 5 | white tensile roofs | FACT 2024 / INFERENCE (terrace) |
| Lake | OSM polygon (json) | #1F2A2C–#303E3E, water Y −1.8 | FACT |
| Beach (far shore) | X −20…+20, Z 255…275 | sand #CDCAB9 | FACT |

### 6.4 Field furniture (all FACT position unless tagged)

| Object | Position / size | Tag |
|---|---|---|
| Delay-tower obelisks ×8 | X ±20; Z 36, 69, 102, 135; plinth 8.5 m; crystal tip Y 12.8 | INFERENCE (§5.3) |
| Aisle | between tower rows, X ±15.75 clear | INFERENCE |
| Piano riser | (0, 0.6, 59), 5.6 × 4 m | INFERENCE |
| FOH / camera platform | (0, 0.5, 90), 12.8 × 6 m | INFERENCE |
| Pit barrier | (−92,−1)→(−46,6)→(46,6)→(92,−1), 1.2 m | ASSUMPTION |
| Backstage/side fences | Z −6 from X ±92 to ±108 (2.0 m Heras + black scrim), continuing up the crest | FACT 2024 position |
| Cable ramps (optional) | along the tower rows X ±20, Z 3…135, 0.6 m wide, 0.1 m high | ASSUMPTION (2024 red lines) |

### 6.5 Bars, water, toilets, first aid (official 2026 floorplan, ±8 m)

| ID | Centre (X, Z) | Length along counter | Counter faces | rotY (deg) | Notes |
|---|---|---|---|---|---|
| BAR-L (crest) | (−100.5, 55) | 46 m (6 modules, service points Z 35.3…74.9) | +X (field) | +90 | tan tensile roofs, on the crest Y 5.2 |
| BAR-R (crest) | (+100.5, 52) | 46 m (points Z 31.6…71.2) | −X | −90 | mirror |
| BAR-BL (back-left) | (−64, 126) | 29 m diagonal (−52,134)–(−76,118) | towards field | 146.3 | Bud fast lane at (−53.8, 124.2) |
| BAR-BR (back-right) | (84.5, 124.5) | 23 m | −Z | 180 | Bud fast lane at (95.3, 130.0) |

`rotY` convention: local +Z of the bar model = counter front; world facing direction = (sin rotY, 0, cos rotY).
No container bars next to the paved floor in 2026 (FACT: present in 2024/2025, absent from the 2026 map).

| Service | Position | Tag |
|---|---|---|
| Free tap water | (−74.3, 171.4), (−81.7, 171.6), (−66.8, 171.3), (−110.7, 145.7) | FACT (map) |
| Heat protocol: free water at all toilet blocks | WC (−123, 146), (190, 137) | FACT (policy) / INFERENCE (position) |
| Misting poles (heat protocol "misting installations") | (−48, 118), (48, 118), (−104, 95), (104, 95) | ASSUMPTION (positions) |
| Toilet blocks | X −135…−111, Z 142…150; X 178…202, Z 133…141 | INFERENCE |
| First aid (EHBO, "RED stage" post, air-conditioned heat post) | (116.7, 122.7) | FACT (map) |
| Top-up desks | ~(120, 135) | INFERENCE |
| Celebrate Safe / Unity info stand | ~290 m from RED, off-map; place a stand at (120, 150) in-game | ASSUMPTION |
| Accessible viewing point | (−35.9, 190.7) on the premium deck | FACT (map) |

### 6.6 Entrances and circulation (INFERENCE)
- **E1 main** (back-right, from the festival core via the main road): gap between the right bank end and PURPLE,
  segment (108, 137)–(125, 160). Default spawn **(115, 150), facing (−0.6, 0, −0.8)**.
- **E2** (back-left, lake-loop route, passes WC-L): segment (−108, 137)–(−125, 118).
- The whole back edge (road, Z 137–149) is open. No side entrances through banks/trees.
- Perimeter lanes at X ±43 lead to the front. Walk E1 → pit ≈ 190 m (~135 s at 1.4 m/s).

### 6.7 Trees (OSM forest polygons, FACT outline; heights ASSUMPTION 15–22 m)
- **Left belt:** (16,−59)(17,−63)(−40,−63)(−54,−82)(−64,−75)(−123,−71)(−128,−63)(−128,−37)(−124,−34)
  (−121,82)(−118,91)(−91,117)(−48,116)(−48,107)(−84,107)(−91,105)(−108,89)(−108,−48)(−105,−55)(−97,−58).
- **Right belt:** (128,−38)(124,−57)(118,−66)(109,−73)(98,−78)(87,−65)(24,−63)(27,−58)(87,−57)(99,−55)
  (105,−51)(108,−34)(108,99)(58,109)(56,113)(129,113).
- Species: poplar, willow, ash windbreaks (ASSUMPTION); trunk spacing 4–6 m; June foliage full. The belt
  behind the stage (Z −68…−46) frames the stage silhouette at 15–22 m, below the 26–28 m wing tips.

### 6.8 Playable bounds
- Walkable outer polygon: (−108,−6)(108,−6)(108,99)(130,150)(125,172)(−120,172)(−135,150)(−108,120).
- Colliders: stage footprint (side sections Z < −4, central deck Z < 0), pit barrier, arm ramparts (with the
  openings), 8 plinths, FOH platform, piano riser, bar counters, tree trunks, lake shore (invisible wall).
- Y range −2 … 60 (free camera up to 300 for drone views).

---

## 7. RIG SPEC (lighting, lasers, SFX, pyro, fireworks)

Real-world calibration (FACT): RED used ~2,500 lights in 2024 and 1,800 structure + 600 show lights in
2025; the whole show is timecoded and pre-visualised (Syncronorm Depence). Team continuity (Q-dance creative
Jonas Schmidt, LD Robbert-Jan Vernooij / Happy Technology, lasers Jeroen Winnubst / LaserImage, pyro Lucas
Gerritzen / Pyrofoor) is likely for 2026 (INFERENCE). All counts below are ASSUMPTIONS calibrated to those
FACTs; positions follow §5.

### 7.1 Lighting fixtures (physical plan ≈ 2,530 units)

| Group | Type (real-world class) | Count | Positions |
|---|---|---|---|
| Pixel battens | 1 m LED bar, 10 px (CLF LEDbar PRO class) | 1,000 (10,000 px) | outlines: wing ribs/spars 360, dragon plates 150, castle windows/pilasters/crenellations 300, side sections & arms 150, deck lip 40 |
| Pixel dots / bulbs | LED dots, festoon bulbs | 500 | mouth 200, eye rings 14, arch ring 10, neck/castle bulbs 200, crystal internals 32, misc |
| Decor floods | IP65 RGBW flood | 420 | castle arcade 80, wing undersides 120, dragon 40, side sections 120, obelisk bases 32, arms 16, misc 12 |
| Beams | IP65 beam moving head | 300 | wing leading edges 2 × 60, skull 8, castle roofline 40, deck front 40, hang-tower tops 32, side sections 32, corner towers 12, arm-end turrets 10, obelisk capitals 8 |
| Hybrids/spots | 470–600 W hybrid | 80 | DJ arch crown 7, castle towers 24, hang-tower tops 16, deck 20, side 13 |
| Wash / beam-wash | LED wash with zoom | 80 | dragon underside, castle facade |
| Strobes | Atomic/JDC1 class | 100 | deck lip 40, wing spars 40, castle roof 12, arms 8 |
| Blinders | 2/4-lite warm | 40 | deck front 24, corner towers 8, obelisks 8 |
| Crystal lanterns | RGB emissive head | 8 | obelisks |

Real-time budget (engine): beams ultra 320 / high 200 / medium 120 / mobile 48 instanced cones (half-angle
0.8–1.5° narrow, 3–6° wide, pan/tilt up to 250°/s); pixels as one instanced emissive point/quad cloud
(8–12k, mobile 3k) with shader chases; strobes as one global flash term (5–12 Hz bursts, 15–25 ms flashes) +
emissive flicker; blinders warm #FFB070, attack 30 ms, decay 300–800 ms; ≤ 4 real SpotLights (dragon head).

### 7.2 Crystal and shaft colour timeline (FACT from frames; drives the obelisks)

| t (s) | Crystal head | Shaft strips / uplight |
|---|---|---|
| 0–118 | blue #5BA1D2 (off 89 and 118) | amber #C56E46 |
| 126–135 | cyan #4FBEBE–#6DD7D9 | amber |
| 158–200 | mostly off, one blue | red #8B1E1D (purple #9040C0 at 188) |
| 207–270 | blue | red/amber |
| 276–300 | warm white/orange #FFB040 | amber |
| 336 | outer pair white #E6EEF9, inner blue | amber |
| 395–470 | blue #40A0FF | orange #FF7A2A |
| 503 | warm orange #FF9040 | purple |
| 513–523 | blue-white | blue #2040FF |
| 536–566 | off (silhouettes) | off |
| 602 | cyan-blue #40B0FF | orange #FF8030 |
| 612–640 | off | off |
| 652–880 | red-orange / warm amber #FFC080, "flame-shaped" #FF9A50 at 830–870, flames on capitals from 859.25 (flame ring) | red #A61622 (magenta #D040A0 at 741) |
| 800–806 | cool white #DFE8FF | white strips |
| 886–1000 | red-orange #FF5A3A | green #20C060 |
| 1027 | – | purple #A040FF |
| 1057 | near: green cones #2DD967; mid: purple heads #A060FF | green |
| 1067 | ice-blue #76ABDE | orange #E69461 |
| 1077–1300 | cyan/teal #42EEFD / #5FF0E0 | blue |
| 1354–1560 | red/orange "flame" #FF6030 → red #FF3030 | magenta/violet (orange base glow 1384) |
| 1561–1581 | off | off |

### 7.3 Pixel mapping content (the "screen" layer)
Stripes (horizontal bands running across the wing membranes), chases along spars (red/orange ↔ cyan/blue),
sparkle (white glitter pixels, Embers/Domitor), solid-colour windows, rosette patterns (spoked gear, sunburst,
star), mouth-dot shimmer, eye pulse. Title cards are video overlays, never on stage (FACT).

### 7.4 Lasers (≈ 45 projectors, RGB 20–60 W class)

| Position | Count | Coordinates | Typical looks |
|---|---|---|---|
| Deck front | 12 | X −33…+33 (6 m pitch), Y 2.2, Z −0.5 | ground sheets, zig-zag, sunburst fans, gold chevron (5 per side at X ±9…±33, centre pair ±3 dark = the gap on the axis; review note: was "the 10 inner", which contradicted show-analysis 8.1), magenta sheet, tunnels |
| Castle towers / roof | 8 | X ±14, ±24 at Y 16, Z −13; X ±7, ±32 at Y 10, Z −12 | crosshatch "cage", X beams, sky fans |
| Dragon flanks | 2 | (±7, 15, −10) | the crossing cyan X over the head (Embers) |
| Wing finger bases | 4 | (±20, 20, −19), (±34, 19, −19) | sky fans, down-fans |
| Corner towers | 4 | (±92, 14, −4) | sideways fans, beam-ends |
| Arm-end turrets | 6 | (±94, 12, 58) × 3 | radial bursts, cross-field fans |
| Obelisk capitals | 8 | (±20, 9.7, 36/69/102/135) | ground web, pillar-to-pillar beams |
| Piano source | 1 | (0, 1.8, 59) + mirrors on the row-1/row-2 crystals | Domitor bounce |

Colours: 638 nm red #FF1418, 520 nm green #00FF55, 445–465 nm blue #1A2BFF, cyan #00E5FF, yellow/gold
#FFC000, magenta #FF20C8, white. **Heights:** in "As filmed" mode sheets may skim 1–3 m above the empty
floor (FACT: the video does this); **in Tribe mode clamp all audience-level sheets and tunnels to ≥ 4.5 m
above the local head plane** (real audience-scanning safety practice, ASSUMPTION). Behaviour: on/off with
≤ 20 ms fades; sheets as scan-line quads (30–60 lines, 2–6 Hz shimmer); beam brightness ∝ haze × (1 +
2·max(0, dot(view, beam))^8). Budget: ultra 640 segments, high 400, medium 200, mobile 96.

### 7.5 Flames (≈ 84 heads)

| Anchor | Count | Coordinates | Height / shot |
|---|---|---|---|
| Deck front | 24 | X −35.65…+35.65 (3.1 m pitch), Y 1.9, Z −0.4 | 6–8 m, 0.3–1.0 s |
| Side-section fronts | 20 | X ±41…±90.5 (5.5 m pitch), Z −3.6, Y = max(1.9, ground + 1) | 6–8 m |
| Arm posts | 16 | (±93, 5.9, 2…58 every 8 m) | 6–8 m |
| Wing spars | 12 | 2 per spar at 60 % and 90 % of length (json), Z −20, angled 0–45° outward | 4–6 m, "burning wings" |
| Central tower torches (Power Flame class) | 2 | (±14, 16.5, −13) | **15 m**, 1–2.5 s |
| Corner-tower fireballs | 2 | (±92, 15.5, −4) | 8 m fireball |
| Obelisk capitals | 8 | (±20, 9.7, rows) | 2–3 m, continuous "torch" states |

Real kit (FACT, Pyrofoor range): G-Flame 3–8 m, MagicFX Stage Flame 3–4/8 m, Flamaniac 6 m (5 angles
−45…+45°), X2 Wave Flame 8 m, Power Flame / XL Liquid Flame 15 m. Colour ramp core #FFF2C0 → #FFC46B →
#FF7A1A → #E0400A → smoke #3A2A22. Each active flame writes orange light into `LightEnv` (the main "heat" cue)
and a heat-shimmer band 0–4 m above it (ultra/high only).

### 7.6 Gerbs, fountains, comets, CO2, flares

| Effect | Positions | Count | Spec |
|---|---|---|---|
| Gerb/fountain | deck front X −38…+38 @ 4 m (Y 1.9, Z −0.8); castle walls X ±25.7…±35 (Y 9.6, Z −12.5) + rear scaffold top behind the dragon X −21…+21 (Y 18, Z −22) = 16; side ramparts X ±44…±89.5 @ 6.5 m (Y 9.6, Z −4.5); arm posts 16; wing finials 6; obelisk capitals 8 | 82 | 8–25 m columns, 3–15 s, white/gold (graded by wash) |
| Comet / candle | rear scaffold line X −32…+32 @ 8 m (Y 18, Z −22); deck front X −38.5…+38.5 @ 7 m (Z −0.6); arm ends (±94, 5.9, 58) for X-fans; hang lines (±11, 16.5, −4) for silver glitter streams; bank crests (±106, 5.5, 0…60 @ 12 m) | 37 | rise 30–60 m, fans of 5–12, spacing 0.15–0.4 s |
| CO2 jets | roof (±12, ±18, ±24, ±30; Y 16.5; Z −16); deck (±5, ±15, ±25, ±35; Y 1.9; Z −1.5); arm ends 2 | 18 | 6–12 m white plume, 0.5–2 s, lit by wash (the blue "cold fire" outro) |
| Bengal / flare pots | side ramparts (±86, 9.6, −4.5) (review note: was ±63, see §5.8); deck 4 | 6 | red flare 5–30 s, dense smoke |
| Flash mines / strobe mines | deck halves (±20, 1.9, −1) | 4 | 0.1 s white flash + smoke |

Permit reality (FACT, OFGV 2017/2019 permits for Pyrofoor at this site): Bengal fire (15 m to audience),
fountains (15 m), **cakeboxes ≤ 1 inch (40 m, 60 m fan-shaped)**; no shells listed. Keep the fireworks
low-to-mid (below).

### 7.7 Fireworks (aerials)
- **Launch lines (INFERENCE/ASSUMPTION):** pyro truss A on the rear scaffold at Z −30, Y 22, X −60…+60
  (31 positions @ 4 m); truss B at Z −38, Y 26, X −44…+44 (23 @ 4 m); bank crests (±106, 5.5, Z 0…60,
  12 positions) for the canopies that are wider than the stage (FACT: canopies span ±100 m, launch lines
  1.3–1.4× stage width).
- **Heights (INFERENCE from the fitted official photo and frames):** breaks **45–90 m AGL** (most 55–75 m),
  star spread radius 8–15 m; crackle canopies 35–90 m; comet lines to 50–60 m.
- **Types used in 2026 (FACT from frames):** red crackle / dragon eggs, red peony, gold brocade /
  chrysanthemum, gold crossette, white serpent-tail rising comets, silver glitter comets, white/gold glitter
  (strobe) willow curtain, pink/magenta palm + crackle, white flash-pearl comets, green/white strobe mines.
  Not observed: large shells above 150 m, waterfalls, confetti, streamers, water screens.
- **Physics:** analytic ballistic stars, g = 9.81, drag k 0.8–1.5 s⁻¹; launch v0 34–38 m/s for a 35 m rise;
  star ejection 18–25 m/s; 25–60 stars per break (ultra), 15–30 (mobile); finale peak 40–60k live stars
  (ultra) / 8–12k (mobile), 12–25 breaks/s for 12 s. Every break adds a 60–150 ms flash to `LightEnv` (break
  colour, radius ~150 m) and 2–4 slowly drifting lit smoke puffs.

### 7.8 Haze, fog and smoke
- Global haze 0.35–0.9 (per segment in show-analysis). Close-ups at 0.8+ wash to white (FACT).
- **Low fog layer 0–4 m** over the field in Discorecord breakdowns, the anthem quiet section, Embers and In
  The Cold (density 0.5–1.0) — it carries the laser sheets.
- Pyro smoke: 20–60 large billboard puffs above the roof, accumulating after cues, decaying over 20–40 s,
  coloured by the wash. **Drift with the wind: from 340° at 4–5 m/s → world vector (+0.26, 0, −0.97)**: over
  and behind the stage and to the spectator's right (FACT: "smoke drifts right" in f073 and f087).

---

## 8. SKY AND ATMOSPHERE

### 8.1 Time of the performance
- **t0 = 22:32:45 CEST, Sat 27 June 2026 (INFERENCE, ±2 min):** (1) moon pixel in f004 matches the ephemeris
  only for 22:33 ± 1.5 min with the fitted camera; (2) the official photo (EXIF 22:41:39) shows the red
  crackle canopy that the video shows at 533–543 s → 22:32:41. The published slot was 22:40 (FACT); the
  early start is consistent with the 21:41 thunderstorm warning (INFERENCE). End ≈ 22:59:06.
  *Review note: with PyEphem 4.2.1 (pressure 0) and the §5.12 camera, the moon at f004's time is at
  x = 930.7 px, against a measured 925.0 px. At 3.75 px/min that makes f004 about 1.5 min earlier, so t0 is
  about 22:31:15 on the moon alone. The EXIF route gives about 22:32:40, plus the camera-clock error. Keep
  22:32:45 but treat the value as ±2 min. If storyboard frames lag their nominal time (show-analysis §0
  review note), both routes move ~4 s earlier, which is negligible.*
- Sunset 22:03:53; civil dusk 22:53:38 (at t ≈ 1253 s); nautical dusk 00:14:53; no astronomical night.

### 8.2 Sun, moon, planets (PyEphem 4.2.1 at the site; FACT computation)

| Body | t = 0 (22:32:45) | t = 1581 (22:59) | World direction at t0 (X, Y, Z) |
|---|---|---|---|
| Sun | az 317.9°, alt −4.0° | az 323.4°, alt −6.6° | (0.124, −0.070, 0.992) — behind the audience |
| **Moon** (96 % waxing gibbous, Ø 0.49°) | **az 161.5°, alt 7.4°** | **az 167.1°, alt 8.4°** (review note: was 167.4°; PyEphem gives 167.08°) | (0.282, 0.128, −0.951) — ~16.5° right of the stage axis, low; at t = 1581: (0.372, 0.146, −0.917), ~22.1° right |
| Venus (mag −4.0) | az 281.2°, alt 13.7° | az 286.2°, alt 9.9° | (0.672, 0.237, 0.701) — behind-right |
| Jupiter (mag −1.7) | az 296.7°, alt 5.8° | az 301.7°, alt 2.4° | behind-right, near the glow |

Moon look: warm white core #F2DCC0 with a pinkish halo (#D7CAE4 in f113), slightly flattened/dimmed by the
low altitude; lit limb towards the right (the west, towards the sun), tilted ~7° upward, with the thin unlit
sliver on the left. *(Review note: this read "lower right"; the direction is computed from the sun–moon
great circle at t0.)* Visible in almost every field and aerial shot from 30 s on
(FACT). Stars: none visible (FACT).

### 8.3 Sky colour over time (graded video → shader targets)

| t (s) | Zenith | Horizon behind the stage (SE) | Horizon behind the audience (NW, twilight) |
|---|---|---|---|
| 0 | #0A2A4E | #0E2D4A (ground cams #001B59) | 0–3°: warm #C99A68; 3–10°: teal #5E8C9A; 10–25°: #1F4A6B (ASSUMPTION: physics, never directly seen) |
| 120 | #06183A | #081E3C | 0–3° #A8805E; teal #4C7C8E |
| 400 | #030A1E | #05051F | 0–3° #7A6450; teal #2E5A6E |
| 800 | #02060F | #020206 | teal #1E3E52 |
| 1300+ | #010204 | #010104 | faint teal #122838 |

Clouds: broken mid-level deck (coverage 0.5–0.6, base 2.5–3.5 km) with gaps (the moon stays visible, FACT);
pale haze bands visible in the early sky (FACT f001–f031); cloud undersides pick up stage and pyro colour
(red/magenta/blue) within ~300 m of the stage.

### 8.4 Weather and heat (KNMI Lelystad, 10 km W; FACT data, INFERENCE transfer)
- **Air 22.5 °C, dew point 19.2 °C, RH 81 %**, after a 31.3 °C afternoon (and 36.8 °C the day before; 39.4 °C
  national record at Ell on 26 Jun). Tropical humid night; warm concrete. Code red for heat ended 21:04–21:10.
- **Wind from 340° (NNW), 4–5 m/s, gusts 9 m/s** → smoke/flags drift towards (+0.26, 0, −0.97).
- **Dry during the show**; a severe thunderstorm line approaches from the W–SW (Lelystad rain 23:00–24:00,
  11.3 mm; 301,137 lightning strikes nationally before midnight). Optional: distant sheet lightning on the
  W–SW horizon (bearing 250–290° → world (+0.57…+0.97, 0, +0.26…+0.82), i.e. behind-right of the audience) from
  t ≈ 1200 s, max 1 flash / 40 s, no thunder audible over the show.
- Heat cues: heat shimmer above flames, sweat sheen on crowd skin (Tribe mode), no dew, hand fans in the crowd.

---

## 9. CROWD

### 9.1 Modes and totals
- **As filmed:** 0 audience (FACT). Crew/performers per show-analysis §0.4 (~12 figures).
- **Tribe mode default 45,000** (INFERENCE: ~50–58k weekend campers on site under the heat plan, RED holds
  ~75–85 % at the Saturday Endshow). Slider 0–65,000 (65,000 = FACT POWER HOUR 2023 figure).

### 9.2 Density per zone (full-capacity densities; default = × 0.85 → 45k)

| Zone | Area (world) | m² (net) | p/m² | People (full) | Behaviour weight |
|---|---|---|---|---|---|
| A Pit / front | X ±44, Z 6…30 | 2,112 | 4.5 | 9,500 | 60 % jumping on drops, arms up, push waves |
| B Front-middle | X ±44, Z 30…60 (minus row-1 plinths) | 2,496 | 3.0 | 7,490 | fist pumps, flags start |
| C Middle (aisle) | X ±44, Z 60…113 (minus plinths, FOH) | 4,300 | 2.2 | 9,460 | most flags, hakken/jumpstyle circles |
| D Rear floor | X ±44, Z 113…137 | 2,006 | 1.5 | 3,010 | groups, walkers |
| E Side-bank slopes | \|X\| 44…93, Z −1…105 | 10,390 | 1.8 | 18,700 | elevated viewers, sway, flags |
| F Crests & bar queues | \|X\| 93…108, Z 0…105 | 3,150 | 0.8 | 2,520 | queues (10–15 m in front of counters), walkers |
| G Back plaza, road, decking | X ±60, Z 137…172 | 4,200 | 0.6 | 2,520 | flow to WC/water/camping |
| **Total** | | | | **≈ 53,200** (default 45,000) | |

Rules: keep the security pit (Z 2.5–6) empty; 1.5 m clear ring around plinths and FOH; ~4 m low-density lanes
along the tower rows; density 70 % of centre value at |X| > 80 on the floor; mean spacing = 1/√density
(0.47 m at 4.5 p/m²). Crowd reaction delay with distance: 0.1–0.2 s behind delay towers (FACT physics: sound
343 m/s, delays compensate).

### 9.3 Look
- Demographics (ASSUMPTION): age 18–40 (mode 23–28; FACT 18+), 65 % male / 35 % female, NL 45 %, DE/BE 20 %,
  rest 35 % (100+ countries, FACT).
- **Clothing palette (warm night, weights):** skin/shirtless 22 % (#F1C7A5…#6B4431); black tees/shorts 26 %
  (#141414/#242424); Defqon red #C02030 / wine #7A1F2B 10 %; nightshade purple #4B2A6E 8 % (2026 merch);
  off-white #E8E4DC / grey #8A8A8A 10 %; neon groups (#2F6FD6, #39FF14, #FF2EA6, #FFD400) 8 %; denim #3B4F6B /
  olive #556B2F 8 %; caps/bucket hats on 35 % of heads (60 % black), hand fans ("Sacred Oath Handfan", black
  with red art), wristband stacks, bandanas, hydration vests, costumes (morphsuits, onesies) ~2 %.
- **Flags:** 0.8 % of agents (~360 at 45k), pole tops 2.8–4.5 m; national 90 × 150 cm, tribe banners 40 × 150;
  mix NL 20 %, Defqon.1/Q-dance black-red 20 % (Sacred Oath flag: black #242424 with red emblem #C02030),
  DE 10, BE 6, UK 5, AU 5, IT 4, FR 4, ES 3, PL 3, NO/SE/FI 5, CH/AT 3, US 3, MX/CL 3, other 6; flags-as-capes
  on ~2 %. Tribe banners: Berserker red #E41818 / grey-blue #90A8B4; Guardian terracotta #C04848 / gold
  #F0C060; Shaman yellow #FCCC0C / black.
- Night read: dark silhouette field, top edge rim-lit by the wash, raised arms, phone screens as small
  emissive quads (#DFE8FF), flags above the head plane (1.65–1.75 m ± 8 cm; arms-up 2.1–2.3 m).

### 9.4 Behaviours per chapter (Tribe mode)

| Chapter | Dominant states | Specials |
|---|---|---|
| Winter | hush → cheers at first fire; 35 % phones up; flags low | roar on the three orchestral hits |
| Discorecord | jump/bounce 60 % in the pit on 243.5; hands up in breakdowns | crouch during the 232.8–237.4 gap, explode on the drop |
| Sacred Oath | **mass sing-along**, flags up (many black/red Sacred Oath flags), arms around shoulders | "DEF-QON!" chant in the 409.3–412.3 silence; full jump on 415.4 |
| L.P.A. | **"losse polsjes"** by ≥ 50 % of zones A–C: forearms raised in front of the chest, hands flopping loosely from the wrist on every kick (170 BPM → 2.8 Hz) | laughter; scream in the 612 blackout |
| Sacred Flame | slow tribal stomp during the percussion; arms thrown up at the burning wings; maximum jumping 829–877 | faces lit orange; hand-fan waving |
| Domitor Draconis | sitting/hush for the piano; head-banging, hard fist pumps later; small mosh in zone A | phone lights in the intro |
| Embers | arms around shoulders, swaying rows, reach into the laser sea | hugging; jump on 1188.4 and 1287 |
| In The Cold | hands up, phones up (35 %), hugging, tears; everything on 1511.2 | applause and "One Tribe" chant in the last 20 s |

Animation recipe on a drop: fist pump 35 %, jump/bounce 25 % (60 % in A), hakken/shuffle/jumpstyle 8 %
(zone C), hands up 15 % (70 % on the first drop after a build), phone filming 10 % (35 % during fireworks),
flag waving 0.8 % (figure-eight 0.5–1 Hz on drops), rest idle sway 0.3–0.5 Hz. Breakdowns: slow sway 0.5 Hz,
wave, sing, hug pairs. Kick phase coherent within ~10 m clusters. Rules: no crowd-surfing, no climbing
(FACT house rules). LOD per technical-decisions §5 (near articulated ~300 tris, mid, far impostors; > 150 m
heightfield of heads + flag sprites).

---

## 10. AUDIO AND MUSIC

The Endshow audio is copyrighted and never committed; it is supplied locally or via the official YouTube
embed, synced through the `ShowClock` (technical-decisions §6).

| Chapter | Track | Video span (s) | BPM | Key | Main drops (s) | Tag |
|---|---|---|---|---|---|---|
| 1 | Vivaldi – Winter (Defqon.1 Version) | 0–126.4 | free (~120 orchestral) | F minor | hits 47.4 / 55.3 / 63.2, climax 75.5–97 | INFERENCE |
| 2 | Frontliner – Discorecord (Galactixx Remix) | 126.4–273.0 (radio edit t0 126.4) | 157 | D major | 145.6 kick, **243.5 drop** | INFERENCE (H) |
| 3 | D-Sturb ft. E-Life – Sacred Oath | 273.0–566.0 (complete radio edit) | 155 | F minor | **415.4, 502.1, 536.2** | INFERENCE (H) |
| 4 | Akimbo & Missy – L.P.A. | 566.0–622.0 | 170 (uptempo) | ? | **589.7** | INFERENCE (H) |
| 5 | Bass Modulators – Sacred Flame | 638.6–884.6 (complete 246.0 s radio edit; gap 884.6–886.0) | 160 | A♭ minor | **793.2, 829.25** (32-bar climax to 877.3) | INFERENCE (H) |
| 6 | JDX – Domitor Draconis | 886.0–1098.0 (unreleased) | unknown | ? | 933.8 impact, 1006.7, 1026.9 | INFERENCE (L) |
| 7 | D-Block & S-te-Fan – Embers | 1098.0–1320.4 (unreleased) | ~160 | ? | **1188.4**, 1255.5, 1287 | INFERENCE (M/L) |
| 8 | Atmozfears & Jesse Jax – In The Cold (The Story) | 1320.4–1536 + custom outro to 1581 | 155 | E major | 1412.1, **1511.2 grand finale** | INFERENCE (H) |

- Beat grids: `anchor + k × beat` (show-analysis §0.2); expose a ±0.4 s per-segment nudge slider.
- Silences to respect: 110.5–113.3, 157.9–160.9, 232.8–237.4, 409.3–412.3, 531.6–534.7, 622–638.6 (ambient),
  739.3–742.3 (near-silence; review note: this one was missing), 787.3–790.3, 826.3–829.3, ~1410.5–1412,
  ~1458.5, 1577.6–1581.
- YouTube "most replayed" (FACT): peak 1503–1519 s (1.00), then 775–854 s (0.72–0.80). Spend the largest
  effect budgets there.
- The MC's performance matches the studio radio edit (playback; INFERENCE).
- Rehearsal track: the synthesized fallback must follow the same section map and tempi.
- Spatial audio (ASSUMPTION): main PA as 4 point sources at the hangs + subs line; delay towers add sources
  at their positions with 0 s effective delay (time-aligned); distance attenuation −6 dB/doubling beyond
  30 m with a 1.5 dB/100 m air-absorption high shelf; crowd bed in Tribe mode.

---

## 11. BARS AND DRINKS

- **Partner (FACT):** AB InBev (from Feb 2024; Heineken until 2023) → **Bud** draught and **Corona**; map signs
  for **Red Bull** and **Smirnoff ICE** (2026 map sprite). Beer Garden specialty beers (AB InBev: Tripel
  Karmeliet, Hertog Jan Weizener, Goose Island Midway IPA, Leffe Blond) — not at RED.
- **Payment (FACT):** cashless **Legendary Bracelet** (leather band with NFC chip) = ticket + wallet; top-up
  online or at self-service stations; cash only at limited staffed desks; balance refunded minus €2.
  **Cup deposit:** one recycle token on arrival; without token/empty cup +€2.00. Currency EUR.
- **Menu (prices ASSUMPTION for 2026, anchored on the FACT 2024 prices: €4.00 per token, Bud 0.25 L = 1 token,
  cocktail = 3 tokens):**

| Item | Size | ABV | Price | Notes |
|---|---|---|---|---|
| Bud (draught) | 0.25 L | 5.0 % | €4.30 | Bud fast lanes at (−53.8, 124.2) and (95.3, 130.0) |
| Bud 0.0 | 0.25 L | 0.0 % | €4.30 | |
| Corona Extra (poured) | 0.33 L | 4.5 % | €5.50 | |
| Hard seltzer | 0.33 L | 4.5 % | €5.00 | "slightly more than 1 token" in 2024 |
| Smirnoff ICE | 0.275 L | 4.0 % | €5.50 | map label |
| Mixed drink / cocktail | 0.3 L | ~10 % | €12.50 | |
| Red Bull | 0.25 L can (poured) | – | €5.00 | map label |
| Soft drink (cola, orange, lemon) | 0.25 L | – | €4.30 | brand UNKNOWN |
| Water | 0.5 L | – | €3.00 | **free tap water** at water points + all toilet blocks (heat protocol) |
| Food | – | – | €8–16 per meal | FACT range |

- **Bar look (ASSUMPTION, from 2024 aerial + map icons):** counter modules 7.6 m (FACT map spacing), counter
  1.1 m, fascia/roof 3.5 m; crest bars under tan tensile tent roofs (FACT 2024 look); black/dark-timber
  cladding; lit fascia with the Bud script logo in white on Bud red #C8102E; warm 3000 K under-canopy LEDs;
  bracelet readers every 1.5 m; draught towers; 10–15 m queue field with 1–2 crush barriers; cup-return bins.
- In "As filmed" mode all bars are **closed and dark** (the site was closed, FACT).

---

## 12. EDUCATIONAL INTOXICATION SPEC

### 12.1 Framing rules (mandatory)
- Effects must feel **impairing and uncomfortable, never rewarding**; always show consequences and where help
  is (water, shade, first aid at (116.7, 122.7), Celebrate Safe / Unity stand).
- **No dosing, buying, timing or use-optimisation information anywhere** (UI, tooltips, dialogue, logs).
- **Drugs are never obtainable or usable in-world.** The MDMA module is a separate, clearly labelled
  educational simulation started from the info stand / menu, always paired with its risk layer.
- Alcohol is a legal 18+ product sold at the bars; the sim shows effects by tier, never "how many drinks to
  reach X". Q-dance runs zero tolerance on drugs (FACT) — state it on screen.
- On-screen disclaimer + links: drugsinfo.nl (Trimbos), jellinek.nl, Unity; "First Aid team is your friend,
  no judgement, no consequences" (FACT Q-dance line).

### 12.2 Alcohol: effects per BAC tier (Dutch ‰ ≈ g/L; 1.0 ‰ ≈ 0.10 % BAC)

| Tier | Sourced effects (FACT) | Sim mapping (ASSUMPTION) |
|---|---|---|
| 0.2 ‰ | decline in rapid visual tracking and divided attention; smooth pursuit already impaired ~0.15 ‰; mild relaxation | camera follow-lag +40 ms; −5 % contrast; slight warm tint |
| 0.5 ‰ | reduced coordination and tracking; reaction and alertness fall from 0.3 ‰; accident risk +40 %; motion-direction noise +30 %, saccade velocity −21 %, pursuit gain −22 % at ~0.55 ‰ | follow-lag 80 ms; motion blur ×1.3; moving objects smear; −10 % contrast; input latency +50 ms |
| 0.8 ‰ | reduced concentration, short-term memory, information processing; impaired depth perception, glare recovery and peripheral vision; tunnel vision; contrast and colour perception drop | FOV −15 % vignette; bloom/glare from strobes and pyro persists 2×; DoF cue weakens; gaze jitter 0.2°; latency +90 ms; body sway 0.3 Hz, 1–2 cm |
| 1.2 ‰ | ataxia, staggering, impaired gross motor control, slurred speech, possible nausea; accident risk ~4× at 1.0 ‰ | FOV −25 %; horizontal nystagmus-style jitter at lateral gaze; walking random-walk ±0.3 m; stumble events; audio low-pass 8 kHz |
| 1.6 ‰ | substantial impairment of visual and auditory processing; emotional control drops; flushed face, dilated pupils, nausea; blackout risk; accident risk > 20× at 1.5 ‰ | intermittent double vision (ghost 0.5–1.5°); strong sway 0.2 Hz, 5–8 cm; "spins"; memory gaps (skip 1–3 s of HUD time) |
| 2.0 ‰ + | blackout (anterograde amnesia), severe impairment, risk of unconsciousness; coma/death risk at 4 ‰+ | desaturation, heavy vignette, persistent double image, unstable camera; forced "sit down / first aid" outcome + help prompt |

Also FACT: effects are stronger for inexperienced drinkers, young people and women; "no form of alcohol
consumption is risk-free" (WHO); alcohol + heat dehydrates (headache, dizziness). Sim mechanic: an internal
BAC state rises per drink and decays over (time-compressed) sim time; its parameters are hidden and never
displayed as advice.

### 12.3 MDMA / XTC: perceptual effects and risks (effects only; no dosing)

Documented effects (FACT; Jellinek, Trimbos, NIDA, clinical literature): dilated pupils, raised heart rate,
blood pressure and **body temperature**, jaw clenching and teeth grinding, dry mouth/thirst, muscle tension,
nausea, sweating, disturbed balance, difficulty concentrating; sights, sounds and touch feel more intense;
music and colours are perceived differently; at high intake confusion, anxiety, hallucinations; clinical
signs include nystagmus and decreased visual acuity. INFERENCE (optics): dilated pupils → more glare, halos
and light sensitivity under strobes, lasers and pyro; shallower depth of field.

**Risks (FACT) — heat first, because this is the 2026 story:**
- **Hyperthermia**: MDMA raises body temperature; with a warm environment, long dancing and too little fluid
  it can become life-threatening (high fever, seizures, bleeding, muscle breakdown, kidney failure). NIDA:
  "a dangerously steep rise in body temperature… particularly if very physically active or in a warm
  environment". The body's warning signals are blunted, so people keep dancing while their temperature
  climbs towards 39 °C and beyond. The 2026 festival was cancelled precisely because code red means
  "everyone can get health complaints such as dehydration, overheating and heat stroke"; regional hospitals
  were full.
- **Water intoxication (hyponatraemia)**: MDMA triggers antidiuretic hormone release, so drinking a lot of
  water quickly can dilute blood sodium and swell the brain (nausea, vomiting, headache, reduced
  consciousness, convulsions, coma, death). Public-health message: neither too little nor too much water.
- **Serotonin syndrome** (worse when mixing), **cardiovascular** strain (heart attack, stroke), rare acute
  liver failure, panic/bad trips, and a comedown of fatigue, low mood and poor concentration for up to ~3
  days ("dinsdagdip"). **Mixing** with alcohol or other drugs raises every risk; adulterated pills are
  documented.
- NL incident statistics (FACT): 6,184 acute drug incidents in 2024, 40 % from festival/party first-aid
  posts, ecstasy involved in 26 %; in 2023 ecstasy was involved in 56 % of festival first-aid drug incidents.

**Simulation mapping (ASSUMPTION; abstract phases, time-compressed, no real-world timing shown):**

| Phase | Perception layer | Body / risk layer |
|---|---|---|
| Onset | saturation +10 %, audio "presence" +2 dB (2–5 kHz) | heart-rate HUD rises |
| Peak | bloom threshold −30 %, glare streaks and halos on lasers/strobes, lens flare ×2, fine horizontal eye jitter 0.1–0.3° at 3–5 Hz, slight blur | **core-temperature meter** rising faster with dancing, crowd density (zone A/B), ambient heat and flame proximity; thirst icon; jaw-clench audio cue |
| Heat danger (≥ 38.5 °C, ASSUMPTION threshold) | tunnel vision, pulsing red vignette, audio low-pass, stumbling | prompts: stop dancing, shade, sip water, find first aid; collapse → first-aid event at ≥ 40 °C (ASSUMPTION) |
| Over-hydration branch | headache blur, nausea sway | hyponatraemia message if the player drinks water compulsively |
| Comedown | desaturation −30 %, dull audio, slower input, "3-day dip" epilogue card | Celebrate Safe / Unity / first-aid info card |

Heat model inputs (ASSUMPTION): night air 22.5 °C (FACT), RH 81 % (FACT); crowd micro-climate +3 °C in zone A,
+1.5 °C in B; +2 °C within 15 m of active flames for 10 s; dancing adds metabolic load. A daytime scenario
(POWER HOUR at 19:00 in 31 °C) should be offered as the contrast case.

---

## 13. Decision log (overrides of earlier reports)

| Topic | Earlier value (report) | Bible value | Why |
|---|---|---|---|
| Stage height | 45–50 m (production §3) | wing tips 26.5–28 m, crest 21.5 m | 3 independent rulers (§5.3) |
| Stage width | 185 m (stage), 115 m (terrain §14) | 184 m front + arms to Z +58 | floorplan + drone projection |
| Delay-tower columns | ±21.5 (map) / ±16 (photo) | **±20** | two calibrated cameras + K1 crown |
| Delay-tower rows | 46.5/73.5/100.7/127.7 (map) | **36/69/102/135** | Δ ≈ 33 m from S/Δ = 1.14–1.23; 2024 physical towers 34/69.5/105 |
| Tower height | 15–19 m (terrain), 10.5 m (stage v2) | crystal tip 12.8 m | fitted official photo |
| FOH | Z 58–68 (terrain), 88 (stage) | camera/FOH platform Z 87–93; piano riser Z 57–61 | photo + drone objects between rows |
| Deck height | 2.5 (terrain) / 1.9 (stage) | 1.9 m | people vs fascia |
| Arms | (±57.5,−4)→(±90,2) (terrain) | (±92,−4)→(±94,+58) along the banks | drone back-projection; aerial "arms" are perspective of axis-parallel lines |
| Field surface | "grass" (frame analyses) | paved concrete floor, grass banks | OSM/aerial FACT; frame colours are wash-tinted |
| Show start | 22:40 ± 20 (event), 23:30–01:30 (frame analyses) | 22:32:45 ± 2 min (review: was ± 1 min) | moon fit + EXIF |
| Moon | UNKNOWN direction in frame analyses | az 161.5→167.1°, alt 7.4→8.4° | ephemeris + stage orientation (also visible in photo P, §5.3 review note) |
| Firework heights | 80–260 m (engine default) | 45–90 m breaks | permits (≤ 1" cakes) + fitted photo |
| Crowd default | 55,000 (crowd report) | 45,000 (heat-reduced Saturday), slider to 65,000 | 2026 weekend-only attendance |

---

## 14. Independent review (2026-09-25)

A skeptical re-check of the key numbers against the raw inputs: frames JSON, storyboard sheets, f004, the
official photo P and the thumbnail, with the ephemeris recomputed in PyEphem 4.2.1. Every change is marked
"Review note" where it was made. Items verified without change are listed in `uncertainties.md` §8.

**Changed in this file:** t0 tolerance ±1 → ±2 min (§1.3, §8.1, §13). Moon end azimuth 167.4 → 167.1° and
the lit limb is "right, slightly up", not "lower right" (§8.2). Crown span/height ranges widened to
76–89 / 25–31 m, because Ruler A is not depth-corrected (§5.2, §5.3). Bengal flare pots ±63 → ±86 (f006;
§5.8, §7.6). Deck-lip strobes 24 → 40 (matches §7.1). Side-section rear wall wording aligned with
§5.8/json. The gold-chevron laser subset now matches show-analysis 8.1 (centre gap). The WC water point
moves to (190, 137), matching json. The Sacred Flame radio edit ends at 884.6. The 739.3–742.3
near-silence is added.

**Timing caveat for everyone who uses frame times (INFERENCE, medium confidence).** Throughout the research,
storyboard frame `fN` is treated as the picture at `t = 9.881·N`. The pyro frames contradict that when set
against the audio-aligned music map. At nominal time they show effects that are already mature 1–5 s
*before* their musical cue. Examples: comets at apex in f042 at 415.07, against the drop at 415.44. A full
crackle barrage in f054 at 533.6, inside the 531.6–534.7 near-silence. A 60–80 m pink band in f120 at
1185.8, at the audio minimum of the pre-drop gap. The comet canopy in f130 at 1284.6, against the climax at
1287. Also f010, f022, f033 and f131. The YouTube chapter marks agree with the audio map to within ±2 s, so
the lag is on the storyboard side. The picture in `fN` is most likely from ≈ 9.881·N **+ 3–5 s**. Comparing
the 100-frame L0 storyboard with the 160-frame L2 storyboard shows both levels share roughly the same phase,
so this cannot be settled without the video itself. Consequences:
- cues snapped to audio downbeats (drops, section starts) stay as they are;
- times written as "NNN:" inside show-analysis rows are *nominal frame times*, and the real look is probably
  ~4 s later;
- where cheap, cue windows were widened so that both readings are covered (show-analysis §0 review note).
