# lights: round-2 extensions (look parity with the official Endshow video)

Everything here is optional. A cue that does not use it behaves exactly as before, and unknown values
are ignored. `docs/show-format.md` stays the base contract. The fx and values below still have to be
added to the validator vocabulary (see "Validator" at the end).

All effects are pure functions of show time (seek and pause safe). They do not allocate per frame and
compile no shader programs after Ready.

## New fx

### `flood`: lit air ("the whole frame glows pink / red / teal / gold")
A light flood that fills the haze, the set and the ground with one colour. It is rendered as a
depth-sliced volumetric glow, so nearer geometry (pillars, people, the stage) occludes the glow
behind it, the ground cuts it off, and the air right at the lens stays clear. It also lights the set
through the stage wash, and the grounds, crowd and sky through the light bus (flash and stage light).

| param | default | meaning |
|---|---|---|
| `color` | `primary` | flood colour |
| `intensity` | 1 | 0..2. About 0.6 is a coloured atmosphere, 1.2–2 is a whiteout |
| `area` | `all` | `stage` (set + air above it), `field` (the audience field, brightest just in front of the stage), `sides` (the side sections; combine with target `left` / `right`), `all` |
| `attack` | 0.08 s | rise time |
| `fade` | 0.8 s | release after `dur` |
| `kick` | false | the level pumps with the kick |

Several floods add up. Their brightness scales with the haze level (`fog.level`), because denser air
glows more. On mobile the volume uses 4 depth slices (up to 10 on ultra) and draws only while a
flood is lit.

### `festoon`: lamp garlands and practical lamps
Warm bulb strings on the set: in scallops along the wing panels' top edges, along the castle wall
walk, in scallops along the side-section eaves, plus the two tower torches (single large lamps).

| param | default | meaning |
|---|---|---|
| `color` | `warm` | bulb colour (the video's garlands are about `#FFB050`; the L.P.A. whites are about `#FFD9A0`) |
| `intensity` | 1 | |
| `mode` | `steady` | `steady` \| `flicker` (filament / torch) \| `chase` (a wave running outwards once per bar) \| `twinkle` \| `pulse` (on the kick) \| `off` |
| `fade` | 0.4 s | cross-fade in and out |
| targets | wings + castle + sides | `wing_left` / `wing_right` / `wing_tips` / `wings` (wing edges), `roof` / `castle` / `deck_back` (wall-walk row), `side_front` / `side_rampart` / `sides` (eaves), `tower_torches` (the torches; only when named), plus the filters `left` / `right` |

The latest cue wins per string (wings, castle, sides and torches, left and right separately).

## New targets (all fx)
Validator-legal anchor names now work as lighting positions:

| target | look / hit / chase (moving heads) | blinder / strobe (emitters) |
|---|---|---|
| `dj_booth` | the 7 **arch-crown downlights** in the DJ portal soffit | the **booth spot**: a single spot at the foot of the portal, aimed at the audience (lens flare) |
| `deck_back` | none | the **backlight arc**: 8 round lamps inside the DJ portal (a shallow arc under the crown, near the vault's back wall), behind the performers, facing the audience. They light the haze into a milky veil (see Round 6) and the crowd, never the set (the castle stays dark under a low stage master) |
| `side_front`, `side_rampart` | side-section wall heads | side-section / corner blinders |
| `corner_fireballs` | corner-tower heads | corner-tower blinders |
| `arm_posts`, `arm_ends` | rampart / arm-end heads | rampart strobes |
| `tower_torches` | castle tower heads | none |

`dj_booth`, `deck_back` (and the aliases `arch`, `portal`, `booth`, `backlight`) are **explicit only**.
An untargeted or `all` cue never lights them, so existing cues are unchanged.

Arch downlights: any look preset lights them, and they stay focused down onto the deck in front of
the portal (PAR cans, 6° beams, lit lens discs). `still` with `aim` / `tilt` / `pan` re-aims them.
The look's `density` applies only when the cue sets it.

## New look params / preset

* `preset: 'curtain'`: every beam **exactly parallel** in world space, like the floor-head curtains
  in Embers v1170.6–1177.1. `tilt` is the elevation (default 78°). `pan` is the heading: 0 = towards
  the audience, 180 = leaning back over the stage (default 180). `sway` (deg) is an optional slow sway
  that keeps the curtain parallel.
* `aim: [x, y, z]` on `still`: every targeted head aims at one world point (a focus or follow spot).
* `gobo: 'dots'` (aliases `glitter`, `breakup`): the floor pools become a slowly turning field of
  small sharp spots, like the glitter spots in front of the deck at v1392–1394. In haze the beams
  break up into rays (high / ultra).
* **Blue floor pools on the field** (the drone shot at v176–199.5): use the capital heads of the
  pillars pointing down. `{fx:'look', groups:['towers'], preset:'still', tilt:-58, beam:'wide',
  color:'#2050FF', intensity:0.8, density:1}` puts a pool about 6 m in front of every pillar on the
  aisle side. The FOH row (`groups:['field']`, `tilt:-70`) adds pools in front of FOH.

## wash: zone target
A `wash` with a side-section target (`side_front`, `side_rampart`, `sides`, `side_sections`, plus
`left` / `right`) is a **zone wash**. It is a local glow in the haze along the side sections, with
light on the ground in front of them. It does not change the set wash. Every other wash (untargeted,
`castle`, `deck` …) washes the whole set as before. Use zone washes for the amber side-deck glows at
v48.1–49.3, 59–61.8 and 64.3–65.3.

## wash: the set only, or a field share (round 9)
A set wash lights **the set only**: the castle, the dragon, the wings, the deck and the haze glow right
around them. It does not light the audience field, the air over the field or the paving. For a field that
glows in the wash colour, either add a `flood` with area `field` / `all` (the pink fountain waves at
1192.1 and 1198.1 do that), or give the wash a field share:

| param | default | meaning |
|---|---|---|
| `fieldShare` | 0 | 0..1: the wash also floods the field (the lit air over it, the soft pool on the paving in front of the stage, the crowd and the world light bus) at `fieldShare` x its `intensity`, in its colour. It follows the wash's own fade and cross-fades, so it needs no extra cue |

`fieldShare` 0.75 on the 1192.1 pink wash (0.8) gives about the field light of the 0.6 `field`/`all` flood
without the flood's lift of the stage air (1194 s: flood 52.8 %, no flood 38.8 %, wash `fieldShare` 0.75
52.8 %). Zone washes (side-section targets) ignore it.

## pillars: subset
A `pillars` cue can address some of the lanterns. Use `target` `left` / `right`, `rows` (0 = the row
nearest the stage, number or list) and / or `index` (order of `pillars_top`: 0 = L1, 1 = R1, 2 = L2,
3 = R2 …). The latest cue wins **per pillar**. Hold the others with a long untargeted cue, for
example a `mode:'off'` cue over the whole intro, and put the subset cues on top of it. A pillar's lamp
level scales its lamp and its shaft together.

## Engine behaviour changes (no cue change needed)
* **Blinder colour** now reaches the set wash, the haze glow and the light bus. A cyan blinder tints
  the set cyan, not beige.
* **Storm haze**: when `fog.level` (plus stage smoke) goes above about 0.76, the wash light and the
  rig's light scatter into a lit cloud around the stage (full at 0.92). The beams also bloom into soft
  shafts. This matches the blue storm at v1010.9 and the red smoke at v1510–1537.
* The haze scale of the show camera and photo mode (`CameraRig.hazeScale`, lower for long lenses)
  is applied to the beams and to both glow volumes right before drawing.
* Photosensitivity (`app.reduceFlashing`): strobes are at 40 %, blinders at 50 % with a 0.25 s rise,
  floods at 60 % with an attack of at least 0.3 s, and light-bus flashes at 40 %. Round 9: every flash of
  the lights shares **one flash budget** (see "Round 9" below): at most 3 flashes in any second.

## Round 11: spar lamps, per-lantern colours, lantern strobe, flood gate, local pools, storm, dragon key
Everything is opt-in: without the new params / fx / targets the show renders as before (64 moments unchanged).
The cue changes that use them are in `$ENDSHOW_DATA/work/r11_lights/cue_patch.json` (with the measured effect).

* **Spar lamp row** (target `spar_lamps`, aliases `spar_lamp`, `wing_lamps`; blinder / strobe cues; explicit only,
  never lit by `all` / untargeted cues; `left` / `right` filter): the wing-spar heads as lamps staring into the camera,
  drawn as a glare star (lens sprite) over a soft lens disc, **no beam cone** (a look aimed at the lens drew a white
  veil over the whole frame). One straight row per wing along the line fitted through its spar heads, over the outer
  65 % of the span, a lamp every 3.2 m (same row at every quality level). v358–363.9, v374.2–377.4, v397–399.5.

  | blinder param | default | meaning |
  |---|---|---|
  | `aim` | `[0, 2, 40]` (the near field) | world point the lamps face; aim at a camera position for the glare star (v358: `[-0.5, 0.2, 2]`) |
  | `spread` | 6.9° | half angle (deg) within which a camera sees the star; outside it the lamp is a disc |

  Discharge lamps: they cut with a 0.12 s release, no tungsten afterglow. They add a little to the audience light,
  nothing to the set wash.
* **Blinder `attack` / `release`** (s, all blinders): rise time (default 0.03; calm at least 0.25) and the decay after
  `dur` (default the 0.32 s tungsten afterglow that cools to orange; an explicit `release` decays without cooling and
  the cue lives `3.5 x release` after `dur`). A dip of the booth spot is two `dj_booth` blinders with a gap, the first
  with `release` 0.1 (v104.75–105.5).
* **Per-lantern colours** (`pillars`): `colors` (list, per pillar in `pillars_top` order 0 = L1, 1 = R1, 2 = L2 …,
  cycled), `rowColors` (list, per row, 0 = nearest the stage, cycled), `shafts` / `rowShafts` (the same for the shaft
  uplight). Subset cues (`index`, `rows`, `left` / `right`) in different colours work as well (latest cue wins per
  pillar). While the lit lanterns differ in colour the engine publishes `LightEnv.pillarLampColors[i]` /
  `pillarShaftColors[i]` (empty while they agree) and, until the lantern renderer reads them, draws a glow in each
  lantern's own colour at its lower glass (`LightingSystem.pillarGlowK` 0.6, 0 = off). v190, v509.4–511.
* **Pillar mode `strobe`**: the crystals flash on every `every` step of the beat grid (default `halfbeat`; also
  `quarter`, `beat`, `2beat`, `bar`); calm: never faster than 0.35 s and a shallow swell. `chase` takes `every` too
  (one row per step). v1223.5–1226, v1267.9–1269.2.
* **Flood `gate`** (`quarter` | `halfbeat` | `beat` | `2beat` | `bar`), `duty` (lit share, default 0.5), `offset`
  (share of the step where the lit part starts, default 0): the lit haze follows an LED gate. The 588.668 stage gate
  (`phase` 0.75, `duty` 0.45) is lit from beat phase 0.25: the flood takes `offset` 0.25, `duty` 0.45. Calm: a 25 %
  swing instead of on / off.
* **Flood `area` `aisle` / `front` / `pools`** (also as a list, e.g. `["aisle", "front"]`; never part of `all`): a
  local light pool on the paving only, no lit air: `aisle` = between the lantern rows (x ±13, z 30–146), `front` = in
  front of the deck (x ±34, z 1–19), plus a small local flash on the light bus (`poolK` 0.9, `poolFlashK` 0.8).
* **`lights.storm`** (new fx; `intensity` 0..1.5, `attack` 0.6 s, `fade` 1.2 s, optional `color`): the storm scatter
  (the lit cloud of the rig and wash light, round 5) at the cue's level whatever `fog.level` says, plus the soft beam
  shafts; a `color` pulls the cloud 70 % towards it. In the v1230.7–1249 storm `fog.level` already holds the scatter
  at 0.98, so the cue adds nothing there (measured, not used).
* **`lights.key`** (new fx, state semantics: latest cue wins, cross-fade over `fade` 0.5): a key light on the dragon
  sculpture independent of the set wash: `color` (audience left / front), `color2` (right, default `color`),
  `intensity` 0..2. Published as `LightEnv.dragonKeyColor` / `dragonKeyColor2` (premultiplied) and
  `dragonKeyIntensity`; the stage's dragon / crown materials have to read them (v944–1010 red / green head,
  v1043.9). Until they do, the cue has no visible effect.
* **Look `fan` with `aim`**: a flat fan aimed at a world point: every head aims at `aim`, turned about the vertical by
  its place in the row x `spread` / 2 (default 36°), elevation kept, `sway` swings it (v834.88: measured on the deck
  handheld, a white veil at the lens: not used there).
* **Look `flare`** (0..2, default 0): while a head of this look points its beam at the camera (the lens sprite's hot
  cone, a little wider; weaker with distance, 40 m half point), the lens veils from the lamp's side: a small haze blob
  2.6 m from the camera towards the lamps, glowing in the near pre-slices of the flood volume (`flareK` 0.035). For
  the white tower heads sweeping across the deck cameras (v673.30, 674.40, 683.38, 691.29): 6 moments +0.006 mean.
  A flat, centred veil (the first try) lifted the shadows and lost 0.012.
* **Reduce flashing: authored stutters** (no cue change): with `app.reduceFlashing` the look, wash, zone-wash,
  pillar and festoon tracks drop state cues shorter than 0.5 s that start within 0.35 s of the previous kept one (the
  kept one holds through them), bridge gaps under 0.35 s and cross-fade over at least 0.15 s: v160.8–171.4 went from
  up to 16 colour changes per second (wash, lanterns) to at most 3. `stage.state` stutters are the stage's (contract).

## Round 9: one flash budget with "Reduce flashing", saturated flood air (no cue change needed)
* **Shared flash budget** (only with `app.reduceFlashing` on; with the option off nothing changes). Every flash
  onset of the lights (blinder onsets, `lights.hit`, strobe hits, the pulses of strobe bursts, kick strobes on
  every second kick, chase steps) goes into one schedule, built once per show compile from the cues and the tempo
  grid (seek-safe). Two onsets that do not coincide (within 0.04 s: a stage hit and a strobe hit on the same
  downbeat are one flash) lie at least 0.35 s apart, so any 1 s window holds at most 3 flashes
  (`CALM_MAX_HZ`). Priority: blinder onsets (never dropped), then the accents (`lights.hit`, strobe hits, the
  first pulse of a burst), then the repeated pulses, which give way around the accents. Before, the strobe cap
  sat exactly at 3 Hz and a hit in the same second made 4 (v1265.3–1266.3); now the burst at 1264.68 fires
  1264.68 / 1265.08 / 1265.48 and the hit at 1266.18, its pulses at 1265.88 and 1266.28 are dropped.
* Strobe bursts: at most 2.5 pulses per second (was 3), on the budget.
* **Chase** (`lights.chase`): at most one step per beat and never faster than 0.35 s (`every` `halfbeat` at
  155 bpm steps every 0.387 s, was 5.2 Hz at v406.1–409.0), each step swells in over 0.12 s and decays slowly,
  and the chase swings between 0.25 and 0.6 of its intensity (was dark to full) while the look underneath keeps
  60 % (was 30 %). A step the budget drops holds the previous step.
* `lights.hit`: 60 %, swelling in over 0.12 s, on the budget (a dropped hit does not fire).
* Beat pumping is shallow: a look with `kick` swings 25 % (was 72 %), the `pulse` preset 0.7–1.0 (was
  0.12–1.0), a flood with `kick` 15 % (was 50 %), pillar and festoon `pulse` 0.75–1.0.
* **Saturated flood air** (option off too): the depth-sliced flood glow drops the white part of a saturated flood
  colour (chroma above ~0.8; white and pastel floods such as `#A8D4FF` stay as they are), keeping its hue. The
  violet flood at v509.25 made a lavender-grey veil round the castle base (probe region 69/32/144, film
  72/10/178); now 65/24/142. Flood moments: 509.25 +3.0, 289.25 +1.9, 338 +1.8, 558.25 +1.2, 1511.75 +0.5,
  1194 −0.6, 1047.25 −2.4 (the film's air there is amber-brown smoke, not the violet of the 1046.44 flood cue).
  A luminance make-up (1.3 / 1.6) was measured and not kept (1047.25 −5.4 / −6.6). Hooks: `lights.floodGlowSat`
  (1), `floodSatGain` (1), `floodHighK` (1, the stage flood's share in the upper air blob; 0.6 measured mixed:
  509.25 +2.9, 338 +0.4, 1047.25 −4.5).

## Round 8: deck ends, blinder glare, the portal, lit low fog
* **New target filters `outer` / `ends`** (all lights fx): positions with |X| ≥ 20 m, the outer truss segment of
  each deck side (the registered deck heads sit at |X| 0.9–18.9 and 20.7–35.1). `center` stays |X| < 14. A band
  combines with a side: `["deck_front", "left", "outer"]` = the left deck end; `center` + `outer` = either band.
  Looks resolve per fixture class, and the classes now split at ±0.5, ±14 and ±20, so the filter works for looks
  as well as for hits, chases, strobes and blinders. To light only the deck ends in a telephoto (v1436–1438.5),
  put a dark look on all deck heads and the lit look with `outer` after it on the same `t` (the later line wins).
  The validator's filter list (`scripts/validate-show.mjs` `FILTERS`) has to learn `outer` and `ends` before a
  cue may use them.
* **Blinders read as glare, not as lit squares, and do not light the set** (no cue change needed). Seen from
  the field a blinder face of a few pixels is one round glare with a soft halo (its 2x2 lamps only resolve close
  up), and every glare sprite except the moving-head lens flare fades out round, not at its square quad (the
  deck row read as a row of lit squares). Blinders face the audience: their colour no longer splashes onto the
  set wash (was 0.5 x level) and their light-bus flash is halved (the set only catches its share of the bus);
  the haze glow in front of the deck, the field and the crowd keep their light. Hooks: `lights.blindSetK` (0),
  `blindFlashK` (0.5).
* **No housing box for the portal lamps**: the booth spot (`dj_booth` / `booth`) and the backlight arc
  (`deck_back`) draw no 0.62 m box any more. The booth spot's box stood in the portal mouth at (0, 4.05, −6.47),
  a black square in every close-up of the portal (v409–412, 656, 705, 739.75). The lamps themselves, their haze
  glow and their light on the deck are unchanged.
* **Low fog lit by the beams**: a moving-head beam passing through the `fog.lowfog` bank scatters more light
  there (×(1 + 3 · fog density), in the beam colour × the fog's albedo leaned 60 % to white), and runs down into
  the bank to its floor pool; the part of the bank the beams light glows as a flat layer in the flood volume
  (centred on the lit part, colour = the beams' light deposited in it). White floor beams through a white bank
  make a bright white band (v802.75), a red wash on red smoke stays red. The zones follow FogSystem's regions:
  area `deck` = the deck (fog top ~3.2 m) + 55 % spill on the near field, `field` = the near field (top ~2.2 m)
  + 65 % over the far field, `all` = every zone; in over 2.5 s, 10 s linger after the cue. `app.env.lowFogLight`
  / `lowFogPos` / `lowFogSpread` publish the lit bank for the smoke puffs. Hooks: `lights.lowFogBeamK` (3),
  `lowFogGlowK` (0.004). With a white `fog.lowfog` (density 0.9, area `all`) at 797, the six moments 799.5–803
  score 62.4 → 62.9 % (0.008: 62.7, 0.015: 62.3); the 64 moments are unchanged.
* **Pillar shafts**: the shaft uplight level written to `app.env` is half the cue's `shaftIntensity`
  (`lights.shaftK` 0.5). The film's pillars are dark shafts under a lit crystal seen from the front (v509.25,
  1046.75), the uplight glowing at the foot (v20.25, 338); the edge strips stay near their soft limit.
* Measured with `scripts/similarity.mjs` on the Mac GPU (64 moments): 67.1 / 50.2 % raw / calibrated before and
  after (colour 67.9 → 67.8, light 80.5, shape 54.8 → 55.0; no moment moved by more than 1 point, the lowfog
  moments 656–705, 925, 1169.5, 1340.75, 1511.75 and 1536.25 included). None of the 64 holds a live blinder;
  blinder moments (16, own set): 48.4 → 48.3 % with the set light off (1224.5 +5.3, 1189.25 +4.2,
  1283–1285.75 −2…−2.6).

## Round 7: wash semantics, back-to-back cues, deck close-ups (no cue change needed)
Measured with `scripts/similarity.mjs` on the Mac GPU against the exact-time frames (64 moments: 64.7 / 46.5 % →
64.8 / 46.7 % raw / calibrated, colour 63.8, light 80.0, shape 53.8; mean of the 10 worst 39.6 → 40.5).
* **No wash cue = no wash.** In a show that writes its set washes, the time between two wash cues and the fade
  after an explicit black / 0 wash is an unlit set. The palette primary at 0.35 is only the default of a show
  without any set-wash cue. Before, every gap and every cross-fade "from nothing" flooded the set in the
  palette primary: the cold_gold palette lit the isolated wings gold at 1322.3–1324 after the black cue.
  1322.5 s +6.7, 1323 s +2.1, 1318 s +2.5 points.
* **Back-to-back state cues cross-fade.** A `look` / `wash` / `pillars` / `festoon` cue that starts where the
  previous one of its track ends (within 2 ms) cross-fades from that cue over its `fade`. Before, it faded in
  from the null state: looks dipped through dark, pillar lamps through the default blue and the wash through
  the palette primary at each of the ~700 touching boundaries in the show. A cue that should cut to its state
  sets a short `fade` (e.g. a black wash that must be dark at once: `fade: 0.1`).
* **Deck close-ups under a stage flood.** A camera on or at the deck that looks at the set (the deck-air
  weight) does not see the flood cues' lit air over the whole set (the stage flood volume). The flood still
  colours the set and the light bus, and the deck smoke (`fog.lowfog` on the deck) carries the red air around
  the performers. The film's close-ups of the fire ritual keep dark air above the performers. Scatter (storm
  haze) and laser air stay. 656 s 38.5 → 44.7, 680.5 s 35.9 → 47.3, 690 s 46.4 → 48.9 (with the two points below).
* **Deck air** sits over the deck under the performers (centre Z −4.5, was −1.5 at the deck lip).
* **Arch cans**: no haze glow of their own (it filled the portal mouth of every close-up with a cream cloud);
  the lamp discs and the 12 % cones stay.
* Measured and NOT changed: the stage FOH key at 1/3.5 of its round-6 gain (troupe −8 points in sum, 724.5
  −8.3: keep it); `floodSetK` 0 / 2 (no effect at 567.5 / 594.25 / 600.5; 594.5 −2.6 / +2.2); the finale
  flood volume (`floodGlowK` 0.5: 1511.75 ±0, 1536.25 +0.7, but 567.5 −14; the far field blob off: 1516 +6,
  1522 +8, 567.5 −15.6; the lights' finale output is pure red, the grey-pink veil comes from other layers);
  the set haze glow ×2 / ×3 (64 moments unchanged, ± per moment); the deck close-up share 0.8 (lower).
  New calibration hooks: `lights.closeFloodK`, `archGlowK`, `archBeamK`, `archCanK`, `washGlowK`, `floorGlowK`.

## Round 6: backlight veil, deck air, arch cans (no cue change needed)
Measured with `scripts/similarity.mjs` on the Mac GPU (64 moments: 61.0 / 39.4 % → 62.2 / 41.3 % raw / calibrated;
colour 59.8 → 61.7, light 76.2 → 77.0, shape 50.1 → 50.6).
* **Backlight arc** (`blinder` target `deck_back`, v409.0–412.1): the 8 lamps hang inside the DJ portal on a
  shallow arc (|X| 0.3–1.9 m, Y 4.95–6.05, Z −8.4), where the film shows them behind the MC — the old row on
  the porch front (X ±4.1…10.7) was outside every close-up. They draw as big hot discs (not festoon dots)
  and light the haze as forward scatter: a tight glow at the lamps plus a wide veil over the deck, cool
  blue-white for a white lamp, strongest for a camera in front of the portal looking into it (the DJ at the
  booth, beside the lamps, sees a trace). 411.5 s 7 → 59 %, 409.5 s 11 → 55 %.
* **Lamps aimed at the lens light the air in front of it**: the flood volume has two near pre-slices
  (1.2–3.2–4 m) in which only the local lamp glows (backlight, booth spot, deck air) are integrated, drawn only
  while one of them is lit. Every other flood keeps the clear air at the lens.
* **Deck air** (deck close-ups, v656–711): while `fog.lowfog` lies on the deck (`area` `deck` / `all`), a
  camera on / at the deck that looks at the set stands in that smoke, lit by the wash in the fog's colour
  (the red smoky deck of the fire ritual). Level ∝ the lowfog density (in over 2.5 s, 8 s linger). A camera
  in the portal looking out over the field (v658–666) does not get it. 705 s 30 → 47 %, 673.5 s 39 → 50 %.
* **Arch cans** (`look` target `dj_booth`): their haze cones are drawn at 12 % (the film shows the ring of
  lamps in the crown and their light on the performers, never cream cones filling the portal); the lamp
  discs are brighter, and the cans light the smoke in the portal mouth a little in their colour.
  `app.env.archSpotColor` (normalised) / `app.env.archSpotIntensity` (mean level 0–1.5, 0 = off) expose them
  for the performers in the arch.
* **Glowing fog bursts** (`fog.burst` with `glow`): one light per group of targets that lie together
  (30 m), sharing the old single light's total, instead of one line light stretched across the empty space
  between e.g. the roof and the wings.
* Measured and NOT changed: SceneGlare G1/G2/G3 (src 0.15, psf 0.035, e0 14) +0.03 / +0.06 on the 64 (313.75
  −6); the site-smoke height fog (`atmos.glow smoke`) at 2/7 of its density: 76.25 +10.8, 1528 +3.3 but
  1511.75 −1.5, 1536.25 −1.9; flood volume / ground pool / flash cuts: all lower. Calibration hooks stay in
  the code (`lights.floodGlowK`, `floodSetK`, `floodFlashK`, `scatterK`, `deckHazeK`, `backGlowK`,
  `environment.smokeTune`).

## Round 5: atmosphere (no cue change needed)
Measured with `scripts/similarity.mjs` on the Mac GPU (Show camera exposure 0.5):
* **Storm haze colour**: the scattered cloud is multiple scattering, so its light is saturated towards the
  dominant hue of the rig and the wash (`c' = max · (c / max)^4`) at half the old level, and the beams bloom
  less (soft shafts 0.85 → 0.45). A cool-white storm under a steel wash reads as crisp white beams in
  steel-blue haze (v1230–1249), not a milky grey veil: 1243 s 29 → 48 %. The lit cloud high over the set
  (the upper flood blob) is at half its weight.
* **Laser light in the smoke**: while laser sheets scan a dense low fog (`fog.lowfog` density 0.65 → 0.9),
  the flood volume over the field and the stage glows in their colour, saturated (the Embers FPV at
  v1163–1175: the whole frame a deep blue smoke volume): 1169.5 s 29 → 44 %.
* **Beam volumes near the lens**: with the camera inside or within a few metres of a cone, near its
  fixture (standing on the podium under the arch downlights, beside a deck head), the cone fades out
  instead of filling the frame as a flat grey slab.
* **Pyro glare** (`src/postfx`): no frame-wide lift in the fire colour any more and the line-source halos
  at half gain; the video's drone shots show crisp flame rows on a dark field (827.25 s 35 → 56 %,
  729.25 s 41 → 60 %, 484.75 s 39 → 64 %).
* Stage walk: the booth spot hangs 1.35 m above the vault floor (0, 4.05, −6.35); the arch downlights
  focus on the walkable floor (the podium).

## Round 4: light balance on the grounds (no cue change needed)
Measured with `scripts/similarity.mjs` against the official video: our field was 2–5x brighter than the
video's in 54 of 64 moments. On the video the grounds read near-black; the light lives in the haze, the
smoke, the beams and on the set. What changed:

* **Field floods** light the paving only in a soft pool in front of the deck (`FLOOD_GROUND` 0.55 → 0.3,
  the pool over the back of the field at 20 % instead of 45 %). The flooded air itself (the depth-sliced
  glow) is unchanged.
* **World light bus** (`src/world/worldLights.ts`, what the grounds, pillars, fences and trees receive from
  `app.env`): the stage's light on up-facing surfaces is a pool at the deck lip (about 0.45 at 25 m,
  0.05 at 100 m on top of 1/d²); a flash bucket whose sources are spread wide (the two arm ends, a gerb
  row) lights a floor at the grazing angle of its sources, not from a lamp over the middle of the field;
  the flash bounce off the smoke reaches the world materials only for the big walls (× F / (F + 6):
  the gold gerb wall at v600 and the flame wall at v1509 still light the bowl, single bursts do not),
  over a 70 m radius; `atmos.glow` colours the smoke and the air, the grounds get a trace (gain 6 → 0.8);
  the lanterns light their plinths and shafts fully, the floor pools at 60 %. Gains: stage 5200 → 2200,
  flash 3000 → 1400, lanterns 70 → 55, plinth spill 90 → 65 (the paving is pale now, albedo about 0.4).
* **Sky fill**: the hemisphere light fades with the sky to a moonlit minimum (intensity 0.34 → 0.26), and
  the site glow tints it at 0.12 instead of 0.3.
* **Close-ups at the deck** (`src/fx/haze.ts`): with the camera within about 6–28 m of the lit deck volume,
  part of the stage haze stays in front of the lens (a light milky veil, slightly brighter knee) instead of
  clearing completely — the performer close-ups at v362 / v411. A camera further out is unchanged.

## Validator (scripts/validate-show.mjs vocabulary, owned by the show and validator side)
* lights fx: `flood` (`area`: `stage` \| `field` \| `sides` \| `all`; `color`, `intensity`,
  `attack`, `fade`, `kick`) and `festoon` (`mode`: `steady` \| `flicker` \| `chase` \| `twinkle` \|
  `pulse` \| `off`; `color`, `intensity`, `fade`).
* lights look `preset`: add `curtain`. Look params `aim`, `gobo` (`dots` \| `glitter` \|
  `breakup`), `sway`.
* pillars params `rows`, `index`.
* `lights.wash` param `fieldShare` (0..1, default 0; round 9).
* Round 11: targets `spar_lamps` / `spar_lamp` / `wing_lamps` (explicit-only lamp row, blinder / strobe); blinder
  params `attack`, `release`, `aim`, `spread`; pillars mode `strobe`, params `colors`, `rowColors`, `shafts`,
  `rowShafts` (string lists), `every` (`quarter` | `halfbeat` | `beat` | `2beat` | `bar`); flood params `gate` (same
  names), `duty` (0.05..0.95), `offset` (0..1), `area` also `aisle` | `front` | `pools` or a list of areas; new fx
  `lights.storm` (`intensity`, `attack`, `fade`, `color`) and `lights.key` (`color`, `color2`, `intensity`, `fade`,
  target `dragon` / `dragon_head`); look `fan` accepts `aim`; look param `flare` (0..2).
