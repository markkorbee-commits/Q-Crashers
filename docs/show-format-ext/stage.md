# Show format extension: stage (round 2, look parity with the official video)

This file extends the `stage` and `screens` rows of `docs/show-format.md`. Every addition is
optional. Existing cues render as before, except for the recalibrated default castle (see
"Default look" below). All values are pure functions of show time and the beat grid, so
seeking is exact.

## Default look (engine change, no cue needed)

The official footage shows the castle as a dark printed set. The dragon, the wings and their
LED lines carry the image. The castle's own practicals are therefore recalibrated:

- Horizontal cornice, eave, ledge and gallery battens are drawn at 30 % of the content colour. The
  vertical pilaster battens and the arch outlines stay at full level.
- Castle windows are now dim panes with two vertical LED tubes (the "window bars" of the video).
  At mid `windows` levels only a share of the windows is lit (`windows` 0.8 lights about 90 %,
  0.5 about 65 %).
- The front-line lamps, crystal lanterns, decor backlights and virtual floods are roughly half as
  bright as before.
- The wings are about 12 % larger, as the depth-corrected ruler in design-bible §5.3 gives. The
  finial tops are at 29–31 m and the outer finial is at about ±44 m. The membranes have deep
  concave top edges.
- The castle towers are about 2 m lower, so the wings read down to the roofline. The inner towers
  carry a flickering amber brazier lamp on their torch pedestals (the pit shots, v666–681).

A lit castle is now something a cue asks for: `stage.state` `castle: 1.5–2`.

### Round 4 calibration (objective match to the official video, no cue change needed)

Measured with `scripts/similarity.mjs` against the official video (13 stage-dominated moments: mean
score 0.362 → 0.378). The castle is a dark printed flat in every wide shot of the footage; it only
reads where the show lights it. Engine changes:

- **Sky light.** The set takes 45 % of the world's sky light (hemisphere incl. the site glow of
  `atmos.glow`, moon, twilight). A site glow re-tints the castle floods towards its hue instead of
  lighting the castle white.
- **Pyro / firework flash.** The flash light over the set sits at least 36 m up (a soft top light,
  never a lamp in front of the facade) and is ~1/10 of before; the crown takes the flash as a glint
  (video 1438.5: a full canopy over a dark red dragon and a dark castle).
- **FOH keys.** Two narrow (15°) warm keys on the portal, the DJ and the dancers instead of two
  washes over the whole castle; close-ups at the portal keep a warm key (video 650 / 705).
- **Floods and FOH wash** at ~75 % / 60 % of round 3; the side-section floods at 25 % density; a
  masked-out castle (`mask` crown / wings / dragon, `castle: 0`) keeps only 3–8 % of them.
- **Print.** The castle stone print is ~26 % darker at night (the daytime photos set the art, not
  the exposure).
- **LEDs.** The crown's LED lines, dots and membrane strokes are at 60 % (at full level they clipped
  to white-pink under the tone curve and outshone the lit sculpture); the membrane print glow at
  ~50 %; castle battens / windows / lamps / lanterns at 63 / 80 / 74 / 88 %. The wing top-edge
  outlines are at 50 % and the rosette rings at 20 % of the spar lines. The rosette glow is a
  sunburst of long and short rays (video 338 / 1047.25), not a lit disc in a ring; the white rosette
  rims are a grey silhouette at night.

### Round 5: the LED panels show the castle print (engine change, no cue change needed)

The real set has no LED video walls (design bible §5.1): a `screens.content` colour look colours the
printed castle. The LED panels over the banners (portal piers X ±5, inner towers, outer bays X ±27.4,
side sections) therefore no longer fill with one flat, saturated colour:

| `screens.content` `mode` | what the panels show |
|---|---|
| `color` | The castle print lit in `color`: ashlar stone uplit from the deck (a light pool at the foot, dark top and edges), an arcade of two round arches with dark openings, a cornice band and a framed banner with mirrored scroll ornaments. The brightest faces lean pastel (off-white stone under coloured light). Joints, openings and the banner field take `color2` at a low level (else `color`). The mean level is ~40 % of the old flat fill; the 5 cm LED grid stays, at lower contrast. |
| `pulse` | The same print, pumped on the beat. |
| `fire` | The same print under flickering fire light rising from the deck, tinted by `color` (video 656 / 705: pale stone and stairs under a warm red-orange light, never a picture of flames). |
| `ice`, `runes`, `logo`, `title`, `eye`, `embers`, `off` | Unchanged. |

The block layout varies per panel (seeded by its position), deterministic and seek-safe. The
castle `castleColor` / `sidesColor` overrides still re-tint the panels of their zone at 85 %.

Also in round 5:

- **Pyro / firework flash.** The set (castle floods, crown flash / rim / reflections, the flash light
  over the set) takes 45 % of the lighting system's flash (`STAGE_FLASH_SHARE`): bursts and gerbs no
  longer light the castle grey-white (video 264.75, 1438.5, 1047.25 keep a dark set).
- **Wing print.** The printed inferno on the wing membranes is uplit in the wing LED hue with a 35 %
  warm share, so a blue / cyan look (In The Cold) no longer shows glowing orange membranes.

### Round 6: masks, strobes, festoons, portal key (engine change, no cue change needed)

Checked side by side with the official video (Show camera, Mac GPU); default 64 moments 61.0 / 39.4 %
→ 61.2 / 39.7 % (raw / calibrated), no part down.

- **Crown masks keep the crown lit.** A `mask` of `crown` or `wings` makes the crown the look: its LED
  outlines stay lit at the wing-glow level (0.35 + 0.65 · `wings`) even when `screens.content` is `off`
  (before, content `off` blacked out every LED line and only the orange print glowed). While no content
  is alive, the isolated crown's LEDs take the state's `rosettes` colour instead of the section palette;
  a `crownColor` still wins (video 1320.75–1323.5: pink / red wing outlines and the throat, nothing else).
- **Masks darken the dragon's inner fire.** The lava cracks of the neck, back and wing arms follow the
  dragon's LED level (the arms also the wings'), so `mask: 'wings'` leaves no glowing neck or arms and
  `mask: 'dragon'` no glowing arms. The dragon's real uplight follows the dragon's wash share (25 %
  under `wings`).
- **Strobes and a dimmed set.** The white light of the lighting system's strobes on the print, on the
  castle battens and in the FOH keys is scaled by the state's `master`: a set dimmed to a silhouette
  (`master` 0.2, video 1267.9: only the lamp strings strobe) keeps its stone dark behind the flashes. At
  `master` 1 nothing changes.
- **`castleColor` takes the arcade.** The glowing arcade in the ground-floor recesses takes a castle
  colour override at 85 % (video 338: `castleColor` blue reads as a blue castle, not magenta arches).
- **Festoon bulbs.** Wing strings 0.24 m (was 0.15), castle / side strings 0.2 m (was 0.14–0.15), a wider
  glare halo, a white-hot core and an HDR gain of 7 (was 3.2): the wing strings read as bright white points
  (video 582.75, 1268), not as pin-pricks.
- **Wing print.** The print's own uplight is 0.28 (was 0.42) × `wings` with a 20 % warm share (was 35 %):
  the membranes read darker than the LED spars and strokes (video 338, 1322.5).
- **Portal key.** The wash-driven part of the two FOH keys on the portal is 3.5× brighter and 50 % tungsten
  (was 30 %); their constant work-light part is unchanged, so a dark look keeps a dark castle (video 656 /
  705: the portal, the stairs and the walls beside it under a bright warm key; 705 scores 0.30 → 0.39).
- **Seek-exact wings.** The membranes' breeze runs on show time, not wall-clock time (a seek now gives
  the same wing image; before, up to 98/255 differed at 1463 between seek orders).

### Round 7: portal key, finial spires and fins, festoon glare, crown floods (engine change, no cue change needed)

Checked side by side with the official video (Show camera, Mac GPU); default 64 moments 64.7 / 46.5 %
→ 64.7 / 46.5 % (raw / calibrated; colour 63.7 → 63.8, light 79.4, shape 53.9 → 53.7).

- **Portal key.** The wash-driven part of the two FOH keys is only as warm as the wash: 50 % tungsten under
  a red / orange wash (as in round 6), none under a violet / blue one (the constant work light stays
  tungsten). Under a violet / blue wash the facade round the portal now takes the wash colour instead of a
  beige-grey band (video 509.25, 1047.25: a purple / blue castle); the red washes of the portal close-ups
  keep their red-orange key (656 / 705). Cone (0.26 rad) and gain are unchanged: a 0.15 rad / gain 2 portal
  pool measured the same but left the facade darker than the lavender castle of 509.25.
- **Finial spires.** Every finger ends in a tall glowing flame spire (~1.6 m wide, 4.5 m from the top of the
  sun disc to the spear point): soft flame strokes lit steadily in the wing colour (no chase / sparkle), at the
  wing glow level (`wings`) × the LED level. Video 582.75 / 509.25 / 1047.25: orange (violet, blue …)
  flame-tipped spires; round 6 had only a small dark flame plate above the disc.
- **Fins.** The crescent crown round every finial disc and the kunai blades along the spars carry a steady
  LED in the look's second colour (`color2` of `screens.content`, else the palette's secondary) at half
  level, following `wings` like the spires (video 582.75: blue fins round orange spires). Far away (a strip
  widened to its minimum pixel width) spires and fins fade to 40 %, so the wide shots read spars and suns,
  not glaring crowns.
- **Festoon glare.** Every bulb keeps a glare of at least 5 px on screen and its halo is half white (the core
  stays white-hot): far bulbs read as glaring points, near ones as white bulbs with a warm fringe instead of
  cream discs (video 582.75, 1047.25).
- **Painted crown shell + content floods.** The dragon's scale hide is a painted surface (metalness 0.5,
  roughness 0.5; was 0.8 / 0.42, which caught coloured light only as a glint). While a `screens.content` cue
  is alive the crown's two low floods also take the look's colours at level 1.5 (flood A the crown LED
  colour, flood B the content's `color2`): the head reads green / red at 998.25 and violet / blue at
  1047.25 as in the footage. Stronger floods (2–4) lost points (the show's colour at 167 differs from the
  video's; the red portal close-ups want no extra light). Tunable in the page through
  `__app.get('stage').crownTune` (QA tools).
- **`glowFloor`** (new `stage.state` param, below) keeps the mouth and the portal emblem lit under a dimmed
  `master`.
- **Anchor `wing_spars`** (new, below): the burning-wing path on the wing surface.

## `stage.state`: new params

Like every other `stage.state` value, the new params are cross-faded over the cue's `fade`. A param
that a state cue leaves out takes its default, so an override lasts only until the next state cue.
When a look fades in from a blackout (the previous state has `master` 0), or fades out to one, its
region isolation holds for the whole fade. A dragon-only fade-in therefore never flashes the wings.

| param | range / values | default | effect |
|---|---|---|---|
| `castle` | 0..2 | 1 | Level of every castle-core practical (\|x\| < 37.5: LED battens, windows, lamps, decor glow, portal) **and** of the castle part of the virtual floods, the FOH washes and the env tint. 0 is a black castle. 1 is the dark default. 2 is a fully flood-lit castle (floods ×2.8, LEDs ×2). |
| `sides` | 0..2 | = `castle` | The same for the side sections, corner towers and forward arms (\|x\| > 37.5). |
| `battens` | 0..2 | 1 | LED battens and pixel dots only (castle and sides). Windows, lamps and lanterns are unaffected. Example: `battens: 0, windows: 1, windowColor: white` gives white window bars and nothing else. |
| `dragon` | 0..2 | 1 | The dragon's LED lines and pixel dots (head, neck, body). The eyes (`eyesIntensity`) and the mouth (`mouth`) keep their own controls. |
| `wingLed` | 0..2 | 1 | The wing LED lines: spars, top edges, blades, finial outlines, rosette rings and the membrane feather strokes. The printed-skin uplight stays on `wings`. |
| `mask` | `all` \| `center` \| `crown` \| `wings` \| `dragon` | `all` | Hard isolation, applied over the numeric levels. `center`: side sections dark. `crown`: castle and sides dark, dragon and wings lit. `wings`: castle, sides and dragon LEDs dark, and the dragon's wash cut to 25 %. `dragon`: only the dragon. Castle, sides, wing LEDs, wing glow (`wings`), rosettes, and the wash and reflections on the wings are all set to 0. Round 6: under `crown` / `wings` the crown's LEDs stay lit without screen content (at 0.35 + 0.65 · `wings`, in the `rosettes` colour unless `crownColor` is given), and the dragon's lava glow follows its LED level. |
| `side` | `left` \| `right` \| `both` | `both` | Per-side isolation (round 4). `left` keeps only the audience-left half (x < 0) of the set's emitters lit, `right` only the right half: castle and side-section LEDs and panels, decor glow, virtual floods and FOH wash, the wing / dragon LED lines and dots, the membrane strokes and print glow, and the rosette suns. The seam is soft over the centre (±6 m), so the dragon's head reads half lit. The eyes, the mouth, the festoons and the lighting system's wash on the crown are not affected. Fades like every other state value. |
| `castleColor` | colour | none | LED colour of the castle core (battens, secondary colour, and the pilasters, which lean white). Also re-tints the castle floods at 50 %, the glowing ground-floor arcade at 85 % (round 6) and, while a `screens.content` cue is alive, the castle's LED panels at 85 % (per-zone screen colours, round 4). Example: a blue castle under a red content colour. |
| `sidesColor` | colour | = castle colour | LED colour of the side sections. The side floods ("floor lights") take it at 100 %, the side-section LED panels at 85 %. |
| `crownColor` | colour | none | LED colour of the dragon **and** the wings (overrides the `screens.content` colour on the crown only). |
| `wingColor` | colour | = crown colour | LED colour of the wings only. |
| `garlands` | 0..2 | 0 | Persistent level of the warm festoon bulb strings (all groups). |
| `garlandColor` | colour | `#ffb466` (tungsten) | Festoon colour. |
| `garlandPattern` | `steady` \| `chase` \| `twinkle` \| `strobe` | `steady` | Festoon pattern. |
| `garlandRate` | > 0 | 2 | Pulses per beat for `chase` / `strobe`. |
| `glowFloor` | 0..1 | 0 | Round 7. The dragon's mouth / throat glow and the portal emblem keep this share of their own level while `master` dims the set (they follow `max(master, glowFloor)` instead of `master`; a dormant blackout with `windows` / `wings` at 0 still turns them off). Video 409–412: at `master` 0.1 behind the white backlight veil the mouth and the emblem stay visibly pink / red; `glowFloor: 0.6` there. |

Example, red dragon and wings on a blue castle (v519.8–534):
`{"sys":"stage","fx":"state","p":{…existing…, "castleColor":"#1A20FF","sidesColor":"#1A20FF","crownColor":"#FF1A10"}}`

## `stage.garlands` (new fx, transient)

These are the warm tungsten bulb strings: along the three sagging top edges of every wing panel,
on top of the arched wing arms (dragon shoulder to inner finger), along the castle eave and the
porch screen, and along the side-section eaves. There are 310 bulbs in one instanced draw call.

| param | values | default | |
|---|---|---|---|
| `level` | 0..2 | 1 | HDR level (1 = a clear warm festoon; 2 = blazing) |
| `target` | `all` \| `wings` \| `castle` \| `sides` | `all` | which strings |
| `color` | colour | `#ffb466` | |
| `pattern` | `steady` \| `chase` \| `twinkle` \| `strobe` | `steady` | `strobe` flashes `rate` times per beat (on 40 % of each pulse) |
| `rate` | > 0 | 2 | pulses per beat (`strobe`, `chase`) |
| `fade` | s | 0.08 | attack |
| `release` | s | min(0.3, 0.4·dur) | release before `dur` ends |

The level is the max of the state's `garlands` and every active `stage.garlands` cue. The
colour and pattern come from the strongest cue. The festoons are not tied to `master`, so a cue can
light them in a blackout (v1381.25).

## `stage.gate` (new fx, transient)

This is an LED gate or stutter on the beat grid. It is a hard on/off on `beat.beat`, so it is
deterministic and seek-safe. It replaces the repeated `stage.state` `master` cues used before.

| param | values | default | |
|---|---|---|---|
| `rate` | `32nd` \| `16th` \| `8th` \| `beat` \| `offbeat` \| `half` \| `bar` \| number (pulses per beat) | `16th` | `offbeat` = off on the beat, on on the offbeat |
| `duty` | 0.02..0.98 | 0.5 | on-share of every pulse |
| `depth` | 0..1 | 1 | 1 = full off; 0.55 = the "off" phase at 45 % |
| `phase` | pulses | 0 | added to the pulse position before the duty test (e.g. `rate:'bar', duty:0.75, phase:0.5` = dark on beat 2 of every bar) |
| `target` | `all` \| `castle` \| `crown` \| `garlands` | `all` | `castle` gates the castle and sides; `crown` gates the dragon and wing LEDs plus the wing glow |

Several gates multiply.

## Anchor `roof_plumes` (new)

There are 14 heads on the castle-terrace roofline. Each side has an inner group (wall walk X ±13 and
±14.4 at Y 9.8, inner tower roof ±16.1 at Y 13.95) and an outer group (outer tower roof ±24/±27 at
Y 12.85, wall walk ±29.9/±31.2 at Y 9.8). It is registered by name, so pyro targets can use
`"roof_plumes"`. It is not yet in the core `AnchorName` list or in the validator's target vocabulary.

## Anchor `wing_spars` (new, round 7)

The burning-wing path on the wing surface: per wing, per finger (outer, middle, inner) three points at
~35 %, ~60 % and ~82 % of the finger spar, 0.8 m in front of it (18 points, left wing first). Registered by
name like `roof_plumes`; the validator already knows it as an extended anchor for `p.at`, so a wing
firewall can use `"target": ["wing_left", "wing_right"], "p": {"at": "wing_spars", …}` (the targets stay
the contract fallback). Video 101: the fire covers the upper two thirds of the wings, while the 6 m flames
from the ~60 / ~82 % heads of `wing_left` / `wing_right` stand mostly above the membranes. `wing_left` /
`wing_right` themselves are unchanged (the lighting rig places its wing fixtures at their mean depth).
