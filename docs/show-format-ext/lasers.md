# lasers: format extensions (round 2)

Optional params and presets that `src/lasers` supports beyond `docs/show-format.md`. Every one is
opt-in: cues that do not use them look as before, except for the engine-wide changes at the end.
Unknown values are ignored, never thrown on.

## Validator (scripts/validate-show.mjs, owned by core)

* `EXT_ENUM['lasers.look.preset']`: `chevron`, `zigzag`, `x`, `rings`, `dashes`, `trees` (round 6)
* Non-enum params to list as known extensions: look `reach`, `rows`, `rings`, `lobes`, `lobeAmp`,
  `squash`, `parallel`, `path`, `distance`, `segments`, `aim`, `fade`; hit `lens`, `reach`.

## `lasers.off`: latest start wins

An `off` gates only the looks and hits that started at or before its `t` (the same `t` counts as
before). A look or hit that starts inside a running `off` is drawn. This matches how the other systems
let a later cue override an earlier one. Before round 2, `off` gated every laser cue while it was
active: the white dashes at 399.94 sat inside the 380.39–403.03 `off` and never showed.

## Params for every look

| param | type | meaning |
|---|---|---|
| `reach` | m | Visible beam length. The beam fades out between about 0.35 × reach and reach, as if it dissolved in the haze, and still ends on anything it hits first. Use it for compact figures near the set: the quiet-section fans (470–483, 530–534), the bar-by-bar show (1473–1485) and the white fans at 1017.5. |
| `rows` | number or number[] | Pillar rows used by field looks, with 1 = nearest the stage (like pyro `rows`). Filters the `pillar` and `base` units. Example: `["pillars_top","right"]` + `rows: [3]` = one lantern. |

Default reach: fans, sweeps, waves, bursts and cones from the side sections and arm turrets (targets
`fireworks_sides`, `sides`, `arms`, `corners`, `turrets`) get a reach of 70 m. Set `reach` to override
it. Crossfire and sky beams from these units stay long.

## New presets

### `zigzag`: compact V web along the deck front (v798, v803.8, v838.2)
Every deck unit fans `count` beams (default 4) across `spread` (default 70°) in a lateral plane that
leans `tilt` up from the audience axis (default 74° = steep Vs). The beams stop on the top line
`height` (world Y, default 11 m). Neighbouring fans cross into a lattice under the lanterns.
A negative `tilt` makes Λ down-fans that land on the floor in front of the deck: −3 lands about
40 m out, −6 about 20 m out. v803.8 is roughly `tilt: -3, spread: 16, count: 6`.
`speed` makes the fans breathe, with neighbouring units in counter-phase. The beams are dashed
(scanned look).

### `trees`: standing Λ tents along the deck (v803.9–804.4, round 6)
Every unit draws a scanned tent: `count` beams (default 9) from an apex `height` m up (world Y, default
10) straight above it, down to its own level on the deck, fanned sideways over `spread` (default 46°),
dashed like the other scanned figures; the apex glows. `speed` makes the tents breathe, neighbouring
units in counter-phase. The natural set is the 6 deck units at |x| = 3, 15, 27 (no target); target
`deck_front` uses all 12 (a denser row). The zig-zag's negative `tilt` only makes Λ fans that land on the
field, never standing trees. v803.9–804.4 is roughly
`{fx:'look', p:{preset:'trees', color:'#2438FF', count:9, spread:46, height:10, speed:1, fade:0.05}}`.

### `x`: compact X on the field (red X, v520.4–529.9)
The outermost selected unit on each side fires `count` beams (default 1; `spread` default 2.5° is the
band width) through the crossing point. The crossing point is `aim`, or else (0, `height` 1.2,
`distance` 15). The beams run on to the floor, so each arm reaches well past the crossing. Over the
last 0.7 m of height the beams also draw their trace on the floor, and the crossing glows. Seen from
the drones this reads as the glowing X on the field. `color2` colours the right-hand beam. Use
`intensity` 1 for the drone shots.

### `rings`: circles and spirograph figures in the haze (v377–380, v1063.8–1070, v1182–1188)
Every projector draws a cone. The natural set is 6 deck units (|x| = 3, 15, 27); from the field it is
the lanterns. `rings` bright circles (default 3) travel along the cone towards the audience at `speed`
rings per bar (default 1).

| param | default | meaning |
|---|---|---|
| `spread` | 40° | full cone aperture |
| `tilt` / `aim` | 6° | cone axis |
| `reach` | 42 m | cone length |
| `squash` | 0.5 | vertical ÷ horizontal aperture; below 1 gives flat ellipses, as filmed |
| `lobes` | 0 | 3–9 turns the circle into a rotating spirograph rosette |
| `lobeAmp` | 0.42 | size of the rosette loops |
| `count` | 10 | dashed radial scan beams |

Colours alternate between `color` and `color2` per projector. For large circles above the set (v1182),
use the wing tips with a wide aperture, 2 rings and a flat ellipse, e.g.
`{preset:'rings', target:'wing_tips', spread:64, rings:2, reach:70, squash:0.6, tilt:18, speed:0.5}`.

`tunnel` also accepts `rings: n`: n circles travel down the tunnel instead of the rotating segments.

### `dashes`: ground projection (v400.0–400.8)
The deck units scan short dashed streaks, 3–7 m long, onto the empty field. The natural set is 6 units
(|x| = 3, 15, 27); target `deck_front` uses all 12. There are `count` streaks per unit
(default 4) across `spread` (default 90°). The streaks start `distance` m out (default 14), are spread
over `reach` m (default 26) and sweep sideways at `speed`. The galvo sweeps the air beams too fast to
read in the haze (the video shows none), so only the floor graphics are drawn. In Tribe mode nothing is
projected onto the audience.

## Extended presets

* `chevron` + `parallel: true` (the golden X seen from the drone, v1346–1370): every unit on one side
  fires along the same direction, so each side draws a band of parallel lines and the two bands cross
  in a hatched X instead of converging into one hot spot. Use `count` 2–3. `spread` scales the band
  width (16 = the lines evenly spaced at the crossing).
* `crossfire` + `origin: field` (piano bounce) + `path`: a list of `[from, to]` segments. Each end is
  `'P'` (the piano tube), `'L1'`…`'L4'` / `'R1'`…`'R4'` (crystal lanterns, row 1 nearest the stage) or
  a world point `[x,y,z]`. A segment towards a world point is an open ray that runs on through that
  point (into the sky, or down to the floor). Crystals glint where a beam lands or is reflected. With
  `path`, `segments` lights only the first N entries. Example for the Domitor build (v889 → v921):
  `[["L1",[26,46,-30]]]`, then `[["L1",[26,46,-30]],["R1",[-26,46,-30]]]`, …, then
  `[["P","L1"],["P","R1"]]`.

## `hit` + `lens: true` (v1492.88, a laser into the drone lens)
The selected unit that faces the camera best fires one beam straight into it. The aperture flare
becomes a veiling glare with an anamorphic streak over much of the frame. The flare is sized in angle,
so a drone 400 m out is flooded as much as a camera in the pit. `pattern` is ignored. More generally,
any beam that points within about 1–2° of the camera now adds a smaller version of this veil.

## Engine-wide changes (no cue change needed)

* Haze gradient: the haze the beams and cones light is thickest at the set, where the smoke machines
  are, and thins to 0.22 over the field (e-folding length 34 m from the deck; FogSystem makes the field
  about 1/3 of the stage cloud). Figures read brightest near the stage, as filmed. Low fog
  (`fog.lowfog`) is not part of this gradient, so the chevron and tunnels over a low fog keep their
  level.
* Round 4 (similarity metric against the official video): **sheets** now use the gradient too, and
  the low fog adds half its density to a sheet (its lit tops are the separate sea layer). Seen from a
  few metres above, a sheet over the far field is a faint veil instead of a lit violet floor (v1389,
  v1463: violet near the deck lip, the far field dark).
* The **laser sea** (lit low-fog tops under a skimming sheet) needs a denser low fog: it starts at
  `density` 0.45 and is full from 0.85 (was 0.3 → 0.7). Embers (0.9) is unchanged; a 0.6–0.7 bank
  shows the sea at about 30–70 %. The sea is mostly dark trough with bright crests (no evenly lit
  floor), also on presets with one noise octave.
* Beam level: the gain drops from 9 to 7, and a soft knee compresses beams seen end-on. Such a beam is
  20–30× brighter than one seen side-on, and it now reads as a bright coloured line with a flare at
  the source instead of a white-hot bar that floods the bloom. Moderate beams keep about 85 % of
  their level. The piano bounce beams are about 30 % dimmer (thin lines in the telephoto shots).
* A skimming `tunnel` lights the low-fog tops with a weight of 0.2 instead of 0.7. From the field
  cameras the golden corridor (1370.9) flooded the frame; v1373 is dark with bright hatched streaks.
* The show camera's per-shot haze scale (CameraRig.hazeScale, lower for telephoto shots) also thins the
  laser haze a little (× 0.45 + 0.55 × scale), so beams in long-lens shots stay thin lines.
* Round 5: a **sheet seen from far below** (12–35 m and more under its plane: a `roof` sheet tilted up over
  the field, Embers v1110–1128 / v1182–1188) lights the smoke clouds it slices as a blue ceiling, the scan
  lines lost in the smoke, instead of vanishing (1120.5 s 37 → 44 %). A level sheet a few metres over the
  camera keeps its crisp line.
* Round 5: the smoke drift and the low-fog flow of the laser haze follow **show time** (they ran on real
  time): the laser sea on the ground is a pure function of show time again (seek = same image).
* Round 5: while sheets scan a dense low fog, `LaserSystem.airLight` (their colour × power, gated by the
  low-fog density 0.65 → 0.9) makes the lighting's flood volume glow in that colour over the field and the
  stage (see lights.md, round 5).

### Round 7 (similarity against the exact-time frames, 64 moments 64.7/46.5 → see the round report)

* **Blue diode colour.** 450 nm lies outside sRGB below the blue primary; in linear sRGB it has a negative
  green part (about −0.1 of its blue) and, as filmed, no red. `laserColor.ts` now mixes with the unclipped
  primary `[0, −0.09, 1]` and clips the mix at 0: the faint green of a blue cue colour (`#2040FF`,
  `#2A60FF`, `#1A2AFF`) cancels instead of turning periwinkle, violet stays violet (its red is the red
  diode), cyan keeps most of its green, a requested white reads slightly lavender-cool. The video's blue
  laser haze is a pure royal blue (Embers mean sRGB ≈ [0, 5, 123] at v1120.5; ours was [21, 28, 112]).
  1120.5 +16 points, 1145 +2.5, 1389.5 +2.3, 1257.5 +7.
* **Lit smoke ceiling.** A sheet seen from far below its plane (round 5) now lights broad, soft clouds
  (tens of metres) instead of the fine smoke texture, brightest over the set (`stageHaze` weight) and
  without the scan-line rays; its gain went from 7 to 12. A sheet tilted up into the sky from the roof
  (castle / wing units, Y > 8) turns into that ceiling from about 4 m under its plane already (a deck sheet,
  also one rising to 14 m over the field at v1505.8, keeps its crisp line to ~12 m under it): v1134–1140,
  the frontal medium under the roof sheet, shows the whole sky lit blue (1135 +18, 1138 +10).
* **Low beams end on the side banks.** A beam that runs low across the bowl stops where the side bank
  (terrain-layout.json: rising 0.096 per m from |x| 46 to 5.2 m, Z −20…105) rises above it, with a dim
  grazing spot: the white lines along the deck front to the side sections (1485.3, aim ±92) and the web
  over the field no longer run on over the grass (1486 / 1487.5 +1.5).
* **Ground web** (grid looks drawn flat by the plinths, pillars, turrets or the deck at a `height`) at 0.3
  of its former level: v133.7–143.4 shows thin dim lines on the field, not bright white bars (142.5 +2.4).
* **Looking into a cone.** When the camera sits inside a `cone` look's aperture (the lantern starbursts
  aimed at the camera, v1380–1409), the beams all around the view direction light the smoke at the aperture
  into a soft glow (7 m sprite) in the cue's colours: v1389.5 is a violet disc around the lantern with
  faint rays (1389.5 +1, 1384.5 / 1394 +1).
* **Scanned deck figures** (`zigzag`, `trees`) draw 1.5× brighter with a 1.6× wider glow: the filmed
  figures (v798, v804, v838) are dense, luminous scans, ours were thin dark-blue lines.
* **Air light from sheets only.** `airLight` (the lighting's flood volume glowing in the laser colour) now
  comes from the sheets over a dense bank only; a skimming `tunnel` still lights the sea layer, but no
  longer the whole smoke volume (v1371–1380 is dark with gold streaks; ours turned the whole frame orange).

**Calibration hooks** (`LaserSystem.tune`, read every frame; experiments set them in the page, e.g.
`--eval "__app.get('lasers').tune.ceilGain = 9"`): `blueR` / `blueG` (the diode primary), `seaFloor` /
`seaFall` / `seaGain` (the sea on a dense bank), `seaBank` / `seaBankX` (off: the sea follows the side banks
up to |x| seaBankX on a dense bank), `ceilGain` / `ceilD0` / `ceilD1` / `ceilRoofK` / `ceilSmooth` /
`ceilStage` (the ceiling), `webK`, `glowK` / `glowSize`, `bankClip`, `scanK` / `scanW`. Tried and left at
their old behaviour (no gain on the Embers moments): a brighter / more even sea, wisps along x, the sea on
the side banks (1169.5 +1 but 1165 −4), extra sheet light inside a dense bank.

### Round 8: Reduce flashing (photosensitivity option, no cue change)

With the viewer's option on (App.reduceFlashing, mirrored by fx/core/flashSafety.ts) the lasers never
switch hard: looks, hits and offs ramp over 0.12 s (a look normally snaps on in 30 ms, an off cuts in 30 ms),
so a chain of short cues cannot chop the beams, and kick-gated looks dip to half instead of 5 % between
kicks (beat-locked, at most 2.9 Hz at the show's 170 bpm maximum). Hits come in over 0.1 s at 60 %. A beam
aimed at the viewer brightens at most about 3x its side-on level (instead of about 27x), and a beam through
the lens axis only glints (aperture flare and lens veil about a tenth as strong): a fan scanning across the
camera no longer flashes once per beam (about 12 Hz, v1276.5), and the lens hit of v1492.8 is a glint, not a
white frame. The show's laser
cues never switch faster than about 3 Hz (the tightest run: the four hits of v1343.6-1345.8, 0.6-0.8 s
apart), so no rate needs a cap. The scanned dashes move at 1.7 Hz. With the option off nothing changes
(verified bit-identical over 9 windows / 1,640 frames of the Show camera and a spectator view).

## Proposed cue updates for public/show/endshow-2026.json (tested side by side with the video)

Cue times are show times; `…` keeps the other params. Before these updates are made, the validator
needs the new presets in `EXT_ENUM`.

| cue | change | video |
|---|---|---|
| 206.69 deck_front `wave` (count 10) | count 3, `reach` 60 (the video shows soft sheets, not 120 beams); roof `fan` + `reach` 80 | v207 |
| 202.23 / 206.69 `fireworks_sides` fans | target `corners` (the side sections; `fireworks_sides` also includes the arm-end turrets at Z 58) | v202.5 |
| 377.10 deck_front `tunnel` | `{preset:'rings', color:'#3040FF', color2:'#6070FF', count:12, spread:44, rings:4, speed:1, tilt:4}`; drop the pillars_top `cone` (from the pit camera its beams cross the whole frame) | v377.4–380.4 |
| 399.94 deck_front `wave` | `{preset:'dashes', color:'white', count:3, spread:100, speed:0.5, intensity:0.8}` (now visible: it starts after the 380.39 `off`) | v400.0–400.8 |
| 470.39, 477.36, 530.00, 533.10 `fan` | + `reach` 22, count 3, intensity 0.7 | v470–483, 530–534 |
| 520.71 deck_front `crossfire` | `{preset:'x', color:'#FF3010', count:1, distance:18, intensity:1}` | v520.4–529.9 |
| 797.92 `fan` | `{preset:'zigzag', color:'#8A48FF', speed:0.5, intensity:0.8, fade:0.05}` | v798.0 |
| 803.73 `fan` | `{preset:'zigzag', color:'#2438FF', count:6, spread:16, tilt:-3, speed:1, intensity:1, fade:0.05}`. If the Λ apexes should sit higher, try target `towers` with `tilt` −12 | v803.8 |
| 838.05 `fan` | `{preset:'zigzag', color:'#7A38FF', speed:0.5, intensity:0.8, fade:0.05}` | v838.2 |
| 888.74 … 933.97 bounce | replace `segments` with `path` (UR = [26,46,-30], UL = [-26,46,-30]): 888.74 `[["L1",UR]]`; 893.70 `[["L1",UR],["R1",UL]]`; 900.33 + `["L2","L1"]`; 907.49 + `["R2","R1"],["L1","R1"]`; 914.41 `[["P","L1"],["L1","R1"],["R1",UL],["L2","L1"],["R2","R1"]]`; 921.05 and 933.97 `[["P","L1"],["P","R1"]]` | v889–932 |
| 1017.28 wing fans | + `reach` 45, tilt 6 (flat at the stage) | v1017.5 |
| 1063.76 deck_front `tunnel` | `{preset:'rings', color:'#20D8FF', color2:'#2040FF', count:12, spread:44, rings:3, speed:1, tilt:5}` | v1063.8–1070 |
| 1182.37 `wave` | target `wing_tips`, `{preset:'rings', color:'#2A50FF', color2:'#50A0FF', count:6, spread:64, rings:2, speed:0.5, reach:70, squash:0.6, tilt:18, intensity:0.9}` | v1182.4–1188 |
| 1324.05, 1344.95, 1358.50 `chevron` | + `parallel:true`, count 2 | v1346–1370 |
| 1380.18, 1382.89, 1384.20, 1403.40 right-lantern `cone` | + `rows:[3]` (one lantern), `reach` 60 | v1383–1406 |
| 1472.89 … 1483.72 bar-by-bar looks | + `reach` 65, intensity 1 (at `reach` 45 and 0.85 the figure reads too faint from the 170 m camera) | v1473–1485 |
| 1492.82 `hit` | `{color:'#7090FF', lens:true}` | v1492.88 |
| new (optional) 1321.0, 3 s | thin white lines at deck height to the frame edges: `{preset:'fan', target:['deck_front','left'], count:2, spread:3, tilt:0, aim:[-92,2.4,-3], intensity:0.6}` + the mirror with `right` / `aim:[92,2.4,-3]` | v1321–1324 |
| new (optional) 635.0, 3 s | thin vertical beams above the centre (the 4 centre deck units): `{preset:'sky', target:['deck_front','center'], count:1, spread:0, tilt:90, intensity:0.35}` | v635–638 |

### Round 7 cue proposals (measured in-page against the exact-time frames; not applied, the show group owns the cues)

| cue | change | effect |
|---|---|---|
| 1051.265 deck_front `grid` ("blue web at the deck") | + `height` 1.2, intensity 0.3: the deck units then draw the flat web at the deck instead of the tall vertical lattice (v1051.75–1053 is dark with small blue shapes low at the deck) | 1051.75 +19, 1053 +12 points |
| 1503.66 `grid` (zig-zag web above the field) | color `#B040FF`, color2 `#6040FF` (the filmed web is violet-pink, not lavender-white) | 1504 +12.5, 1505 +6 |
| 133.315 / 145.544 deck_front `grid` | intensity 0.3 / 0.25 (the aerial v139.5–143.4 shows no bright rising X fans at the deck) | 139.75 +2.5, 142.5 +1 |
| 1124.428 `crossfire` (the cyan X) | tilt 12 → 4: the filmed beams cross just over the set and run out low to the frame edges | 1124.75 +1, 1125.5 +1.3 |
| 803.734 split (show group, round 7) | the filmed figure changes every frame (12.5 fps): diagonal lines v803.80, wedges + web v803.88–804.0, X bow-ties v804.04–804.12, V fans v804.20–804.28, **Λ tents v804.36**, hourglass v804.44, V fans v804.52–804.60. The `trees` look belongs around show 804.30–804.45 (tents of about the V fans' width, apex ~1.6 × their height, i.e. `height` ≈ 10); the f4 frame of the 803.9 moment (v804.0) shows wedges + bow-ties, not tents | — |
| tried, rejected | 1163.241 `sweep` on the towers only (count 2, intensity 0.5): 1165 +3, but 1169.5 −2; 1269.178 `grid` on the deck only: −15; 317.979 as a `zigzag`: −6; a roof `sheet` for the 206.69 roof fans: −14 … −44 | — |
