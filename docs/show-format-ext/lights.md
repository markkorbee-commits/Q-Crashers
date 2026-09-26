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
| `deck_back` | none | the **backlight row**: 8 round lamps on the porch front behind the performers, facing the audience. They light the haze and the crowd, never the set (the castle stays dark under a low stage master) |
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
* Photosensitivity (`app.reduceFlashing`): strobe bursts are capped at 3 Hz and kick strobes fire on
  every second kick with a softer decay. Strobes are at 40 %, blinders at 50 % with a 0.25 s rise,
  floods at 60 % with an attack of at least 0.3 s, and light-bus flashes at 40 %.

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
