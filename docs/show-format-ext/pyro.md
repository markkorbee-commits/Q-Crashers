# Pyro / fog engine extensions (round 2, look parity with the official video)

These are additions to `docs/show-format.md` for the `pyro` and `fog` systems. Every new param is
optional. Cues that don't use them look as they did before, apart from the always-on engine changes
listed under "Engine behaviour". Unknown params are still ignored.

## Engine behaviour (no cue changes needed)

* **Pyro light field.** Every burning effect emits spatial light: line-segment lights along the
  firing units, cut into segments of about 40 m along the U (`src/fx/core/FxLights.ts`). Per frame the
  strongest 12 are kept (8 on medium, 4 on mobile), and the rest are folded into their nearest kept
  neighbour. This light reaches:
  * smoke, CO2 and low fog: `envLight()` in `src/fx/core/glsl.ts`. Smoke next to a flame row glows
    orange; a pink gerb wall turns its own smoke pink.
  * the haze sprites (`src/fx/haze.ts`), lit per corner.
  * the floor: `src/fx/core/FieldLight.ts`, one additive sheet that follows the terrain, with paved
    and grass albedo. It is hidden while no pyro light is alive.
  Fireworks light the smoke and the floor from their flashes at a lower gain; comet and cake rows,
  and drone flares, push their own lights (see fireworks.md, round 5).
* **Lights over far-apart targets (round 5).** A `burst` pushes one light per group of units (units
  more than 30 m apart form separate groups): a burst on both arm ends (X ±94) lights the two ends,
  not the empty field between them. The flash term of `envLight()` (smoke, CO2, low fog) uses
  d² + spread² instead of d² (spread = `LightEnv.flashSpread`, the RMS distance of this frame's flash
  sources from their centroid), so smoke near the centroid of spread-out sources is not lit as if a
  source sat there (v484.75).
* **Lit smoke of the big moments (round 5).** The row smoke of fountains, flame rows and billowing
  walls follows the row in stretches of at most ~40 m along the U (one smoke emitter per stretch),
  instead of one box over the bounding box of all units (which filled the empty field inside a U
  row). Fountain smoke is self-lit in the fountain colour while it burns (x 1.4 at `intensity` 1,
  up to x 2.8 at `intensity` ≥ 2). A burning cloud (continuously renewed, strongly self-lit smoke
  around the lower third of the sprays, one per stretch) stands around a gerb row with `intensity`
  > 1.5 from the ignition on (full at `intensity` 3: the gold-white glare walls of v600.2), and
  builds up over ~3 s on burns of 4 s or longer (the finale fans and walls, v1510–1537). A short
  normal burst (v69 roof gerbs, v1192 pink U) stays a row of clean fountains with a little smoke.
  Mobile draws fewer, larger cloud puffs.
* **Flame soot (round 5).** The soot a hydrocarbon flame rolls into has albedo ~0.13 (was 0.055):
  a flame wall lights its own smoke cap orange from below (v1508.4–1510) instead of leaving a
  black band over the fire.
* **Tall flame rows billow.** `flame` or `firewall` with `height` ≥ 14 on more than 8 units (not the
  wings) becomes a mass eruption: rolling fireballs 20–35 m high that reach full height about
  0.4 s after ignition. The flames are partly opaque, so they don't add up to a clipped white
  band. They leave a lit smoke bank. `billow: false` turns this off; `billow: true` forces it on
  lower rows.
* **`fireball: true` sizes.** A `size` above 3.5 is read as the ball radius in metres (the show
  uses `size: 14`). Rows of more than 6 fireballs are drawn dimmer and partly opaque.
* **Gerb and fountain colours.** A pale author colour (`#FFB0E0`, `#E8D8FF`) becomes the
  saturated spark colour that the camera recorded as that pale tint. Coloured sparks keep their
  hue as they cool; only gold and charcoal sparks cool to deep orange. The white-hot core is
  smaller for metal-salt colours. Tall wall gerbs (H > 14) burn out near the top of their column.
* **Particle budget (round 3).** Budgets count the particles actually drawn. An emitter's share
  of its layer is decided on the first frame it is drawn and then fixed for its life, so a layer
  over budget never reshuffles or flickers the particles already on screen. Newborn emitters get a
  quantised share (1 / 0.75 / 0.5 / 0.35 / 0.25) from the layer's pressure (fast attack, 1.5 s
  release in show time, so a paused frame never changes) and a lower one only when they would not
  fit. An emitter whose particles are dying out (a fountain past its emission window, a burst past
  its first deaths) holds only the share still alive (never below 5 % on desktop, 25 % on medium,
  50 % on mobile), so a fountain wall that just stopped does not keep the next, bigger wave thinned
  for its whole life. Small emitters (≤ 2 slots: a pillar-top fan, a flare, a shell's smoke) stay complete. The
  instances a layer issues (slots × slot size) may reach twice the budget, so hundreds of tiny
  emitters (shell smokes of 1–5 puffs, comet tails) are all drawn; ribbon layers use slots of 16.
  A newborn that does not fit even at the lowest share (1.25 × the budget, or the slot cap) is left
  out for its whole life instead of popping in later. A thinned emitter draws a golden-ratio subset
  of its particles; directions, phases and timing always come from the recorded count, so a thinned
  sphere is still a sphere and a thinned fountain still emits evenly. After a seek every share is
  decided again (the paused picture does not depend on what was on screen before). Budgets per
  preset live in `src/fx/core/budget.ts`: fw-stars ×1.3 and fw-smoke ×1.5 on desktop; mobile caps
  fw-stars at 15k and pyro sparks at 12k particles, and spark ribbons use 2 trail segments. Crackle
  pops keep ~60 % (medium) / ~40 % (mobile) of their pops per star. The layer stats show
  `<layer>.keep` (share given to newborns now) and `<layer>.hidden` (emitters left out; normally
  absent).
* **Flames burn out when the valve closes (round 3).** A continuous flame unit (`flame`,
  `firewall`, billowing walls, `dragon_breath`, fireball lift jets) stops glowing within ~0.35 s of
  the end of its emission window: the plume is fed no more (v1509.6–1510.0: the 28 m wall is gone
  well within half a second). The soot the older puffs carry stays behind as smoke. One-shot
  fireballs are not affected. A plain billowing wall no longer leaves roll-over fireballs at its
  cut; only `blowout: true` does.
* **Site glow on smoke and haze (round 3).** `atmos.glow` (`app.env.glowColor`, `app.env.smoke`)
  lights every haze sprite in its colour in all three zones (the brightness knee rises with the
  glow's luminance, so the glow is not squashed like the rig scatter) and all smoke, CO2 and low fog.
  Its `smoke` multiplies the stage and field haze density by (1 + 2 × smoke), adds a bank of its
  own (stage +0.22, field +0.09, sky band +0.12 per unit of smoke, so the air fills even where no
  haze hung), tints the haze towards the glow's hue (up to 60 %: the whiteout is pink smoke, not
  white smoke in a pink light), lets the haze hide the set behind it (occlusion towards 0.8) and
  brings the veil close to the camera. This completes the pink whiteout (v76) and the red smoke site (v1510–1537).
* **Saturated smoke stays saturated (round 3).** Colours are linear: a `lowfog` in a saturated
  colour (the red finale bank `#FF2010`) now gets only 2.5 % white instead of 12 % (which turned it
  salmon on screen), and the haze tint of recent coloured `fog.burst` clouds may reach 96 % of
  their colour.
* **Smoke density.** `fog.burst` and Bengal smoke are emitted one-shot, staggered over the burn.
  Before, a continuous emitter released only dur/life of its particles, so bursts were about 3×
  thinner than authored. Plain bursts are now about 2–3× denser than before; bursts that use any
  extension param below get their full count.
* **Haze tint.** Recent coloured `fog.burst` clouds tint the haze they thicken (albedo), so pink
  smoke cannons turn the air pink.
* **Lanterns light smoke.** Smoke drifting past the 8 lantern crystals glows in their colour
  (`env.pillarLampColor`, chase levels included).
* **`reduceFlashing`.** When the UI sets `app.reduceFlashing`, pyro, firework and fog flashes on the
  LightEnv drop to 40 % and the light field to 60 %.

## Engine behaviour, round 6 (no cue changes needed)

* **Self-lit smoke goes dark when its source goes out.** Smoke that glows in the colour of the
  effect that makes it (Bengal clouds, flare-drone trails, the smoke column of a gerb, the row smoke
  and burning cloud of flame / fountain rows, fireball caps, dragon-breath smoke) keeps that
  self-light only while the source burns; it fades within ~0.3 s after (`Emitter.litUntil`, the HZ
  slot of a puff record). Afterwards the show's light (rig, flashes, pyro light field) lights it.
  The red Bengal clouds of 333.849 are dark by v337.96 instead of two red glow blobs over the castle.
* **LightEnv flashes follow the units.** A row (flames, fountains, billowing walls) pushes its flash
  per stretch of the row (≤ 40 m along the U), scattered units (bursts, fireballs, Bengal flares)
  per group of units (> 30 m apart = separate groups), each at its own centre and with its share of
  the peak. The flash pots on both arm ends (v484.75) no longer push one flash at the middle of the
  field; the LightEnv now sees the spread of the sources, which softens the far flash light on the
  floor and the smoke. The far flash term on smoke (`envLight()` in `src/fx/core/glsl.ts`) is 0.2
  (was 0.3): smoke next to a source is lit by the pyro light field.
* **Billowing walls, `width`.** A billowing wall (`billow`) reads `width` as its bulk
  (B = sqrt(`width`), 0.7–1.8): the balls grow to B × their size and rise to (0.78 + 0.35 (B − 1)) × H,
  roll out towards the audience, burn brighter (× 1 + 0.6 (B − 1)) and less opaque (they sum up into
  one blinding mass) with less soot, and the white-hot roots hide in the mass. At `width: 3` the
  28 m wall of v1508.4 is one rolling fire cloud over the whole front instead of a row of jets.
  When the valves close, the plume's soot thins to a quarter within 0.6 s as well (v1509.8–1510.0:
  the dark sky is back within half a second; the row's smoke bank is what lingers).
* **Dense fireball rows** (more than 6 balls, the mass eruption) burn out 28 % faster: the v1508.4
  eruption is gone as one by ~v1509.9.
* **Silver gerbs of the shorter walls.** White / silver gerb rows of 16–22 m (the v1437–1456 walls)
  throw 40 % of the light of a gold row of their height and leave thinner, darker row smoke (self-light
  × 0.36, opacity 0.10): the air and the set around them keep the colour of the stage light (pink at
  v1439.5, v1446) instead of turning white. The effect ramps out between 22 and 30 m: the 30–34 m
  finale walls keep their full light. The burning cloud of a long burn (≥ 4 s) ramps in with the
  height between 18 and 30 m (full for the 30–34 m finale walls, hardly any for a 20 m wall).
* **Burning wings.** The light of a `firewall` on the wings is cut into stretches of ≤ 14 m with a
  reach of 0.45 H + 2.5 m (was one light over the whole wing, 0.45 H + 6 m), so the glow follows the
  wing shape.

## Engine behaviour, round 7 (no cue changes needed)

* **Tall wall gerbs are spikes.** Without an authored `spread`, the spray cone of a gerb narrows
  with its height above 14 m, to 0.4 x the default at 30 m and above (4° instead of 10°): a 30–40 m
  wall reads as a row of separate thin columns with the set visible between them (v1189–1197), not
  one sheet of sparks that hides the stage (1194). An authored `spread` is used as written (the broad
  white-gold fan behind the dragon of v1510–1537 has `spread: 30`); walls up to 14 m are unchanged.
* **Burning cloud of 2.5–4 s walls.** The burning cloud of a long burn of tall units (round 5/6)
  ramps in between 2.5 s and 4 s of burn instead of starting at 4 s: the 3.6 s white 32 m wall of
  v1565.3–1568.8 stands in a little of its own lit cloud. Walls of 4 s and more are unchanged.
* **Burning wings stay on the wings.** A `firewall` on the wings rises to 0.45 H (was 0.7 H) with
  narrower tongues (growth 0.39 H, was 0.65 H), and the roll-over fireballs at the finger tips sit
  0.2 H above the tips (was 0.7 H): the fire licks along the wing outline (v101, v713.5, v729.25)
  instead of standing a flame length above the wing geometry. Measured: 729.25 +1.3, 100.75–101
  +1.6, 713.5 +1.7, 734 +1.3 points (the orange domes around the wings are the lens glare of
  src/postfx/SceneGlare.ts, driven by the wing lights, which are unchanged).

## Engine behaviour, round 8 (no cue changes needed)

* **Burning wings on the wing surface.** A `firewall` on `wing_left` / `wing_right` burns ON the
  wings (`wingSurface` in `src/fx/core/placement.ts`), no longer in 6 m columns standing above the
  membranes. The fingers come from the stage anchor `wing_spars` (per finger the points at 35 / 60 /
  82 % of the spar): each finger is a quadratic curve through its three points, extended to the
  membrane attachment (93 %) and the finger end (100 %). Between the fingers the membrane is sampled
  on a 2 m grid (odd rows staggered), each row sagging like the scalloped top edge above it (sag
  3.8 / 5.4 / 3.4 m for the outer / middle / inner panel, as in `src/stage/dragon/wings.ts`); the
  inner panel burns only next to the inner finger. The points sit 1.1 m in front of the skin. Two
  kinds of flame unit: along the top edges and at the finger ends narrow tongues that rise
  0.6 H + 1.5 m (v788.5: discrete jets ~2 m apart; v713.5 flames licking over the edges), below them
  a low burning skin (short, small flames born over their grid cell, rising 0.25 H), so the wing reads
  as one sheet of fire with its structure still showing through. The band reaches down to ~60 % of
  the wing for `height` ≥ 6 and only the top rows for 3.5 m (v148, v787). About 63 units per wing;
  without `wing_spars` (the fx proxy stage) the older spar-chain geometry is used. The roll-over
  fireballs sit on the finger ends.
* **Wing light sized by the fire.** Instead of six 12 m torch lights at the finger tops (the
  roll-over fireballs, each 1.2–2.0), every burning wing pushes one line light across its burning
  band whose reach grows with the square root of the burning area (~17 m for an engulfed wing) and
  whose strength grows gently with the area and the flame height (1.6 × (area / 250 m²)^0.25 ×
  (H / 6)^0.5), 60 % of it lit smoke (`haze`: the fire burns in its own soot). The fireballs keep 35 %
  of their light. FieldLight, the haze and the lens glare see the fire where it burns. Measured (Mac
  GPU, `--settle 500 --min-frames 30`, placement + light together): 713.5 23.0 → 27.8 %, 714.25
  28.6 → 40.5, 734 41.4 → 44.0, 101 54.3 → 56.3, 413.9 37.7 → 41.3, 729.25 72.0 → 74.1, 788.5
  42.4 → 43.1, 148.5 46.6 → 45.8. A generic size
  weighting in `FxLights` (every light × (length + reach) / 60 m) was measured and not kept: +3.6 at
  484.75 and +1.6 at 264.75, but −3 at 713.5 / 714.25 / 413.9 and −7.5 at 788.5, 64-moment score
  unchanged.
* **Big bursts throw a lit cloud.** A `burst` with `size` ≥ 1.8 (the mines of v1565.3, v600.1, the
  stage explosion of v876.9) also throws a wall of white smoke up and out over the deck and the field
  within ~0.3 s (puffs of 0.35–1 × (6 + 6 size) m, one emitter per group of units), lit from inside
  in the burst colour for ~0.7 s, with a lit-smoke light (`haze` 0.6). 1565.5 32.7 → 34.2 %, 1566
  24.7 → 26.7, 877.25 28.9 → 31.8, 600.5 60.7 → 61.4 (607, 484.75 unchanged).
* **Tall walls stand at once.** Gerbs taller than 14 m fade their first sparks in over 0.06 s (was
  0.18 s), so a wall is up within the first frames of its cue (v1565.4).
* **Silver walls are loose streaks.** White / silver gerb walls taller than 14 m and below 22–30 m
  (`silverDim`, not authored brighter than `intensity` 1.3) emit 45 % of the sparks, each as bright:
  thin, loose streaks (v1441 from the drone, v1446 close up) instead of dense sheets. Their row
  smoke is thinner and darker (opacity 0.05, self-light × 0.2) and a trace of burning cloud
  (< 0.08) is left out. 1446 34.2 → 40.8 %, 1438.5 57.6 → 58.4; the other white walls in the 64
  (69.25, 264.75, 460.5, 1536.25) unchanged. An attribution run (pyro layers hidden one at a time)
  showed the sparks, not the smoke, carry the whiteness at 1446 (sparks hidden +11.2, smoke hidden
  +1.2 points).
* **64 moments:** 67.1 / 50.2 % → 67.2 / 50.3 % (colour 67.9, light 80.5, shape 54.8); only 729.25
  (+2.0) and 1438.5 (+0.8) of the 64 change.

## Engine behaviour, round 9 (no cue changes needed)

Measured with `scripts/similarity.mjs` (Show camera, Mac GPU, `--settle 500 --min-frames 30`, pre-roll on).

* **The eruption of the biggest mines lights the field.** A `burst` with `size` from 2.6 (full at 3: the
  white burst on `mines` at 1565.3) also pushes one strong line light from the mines 60 m out over the
  field, reaching 0.75 × (the burst's width + 40 m) (60 m for the four mines), peak 12 × size, warm white
  (the burst colour, 30 % white, then halfway to the fire colour: the white burst inside the gold crackle
  and the white-gold wall), 60 % lit smoke (`haze`), for the burn + 0.85 s (release 0.6 s: white to
  v1566.0, orange by v1566.25, gone by v1566.5 as in the video). It ranks first among the pyro lights
  (kept on every preset); FieldLight, the haze, the smoke and the lens glare see it. The pyro light cap
  is unchanged (9). 1565.75 26.5 → 35.8 %, 1566 27.8 → 35.5, 1566.25 30.3 → 38.5, 1565.5 37.0 → 39.6;
  1566.5–1568 and the size 2 / 2.5 bursts (600.5, 877) unchanged. An extra lit smoke cloud rolling out
  over the field measured the same and was left out; a light cap of 20 instead of 9 measured the same too.
  What is left at 1565.5–1566.25 is the red of the site (video sky [133,8,0], trees [141,10,1], ours
  ~[40,11,11]: atmos glow / flood, not pyro) and the framing (the video camera is closer).
* **The bulky flame eruption towers.** A billowing wall with `width` ≳ 2 (bulk B from 1.3 to 1.7: the
  `width: 3` wall of 1508.3) rises (0.78 + 0.35 (B − 1) + 0.6) × H (was without the + 0.6) with balls
  1.3 × bigger: from the fitted drone of v1508.4–1509.8 (−0.3, 66.7, 231.8, fov 52) the fire mass
  now reaches frame y ≈ 0.1 as in the video. Scored from that drone: 1509 50.0 → 53.7 %, 1509.5 44.9 →
  49.5, 1508.5 unchanged. The Show camera of 1507.004 is closer than the fitted drone ((0, 49.5, 200),
  fov 48 at v1509), so there the taller mass overfills the frame (1509 50.3 → 43.8, 1509.5 45.1 → 38.6):
  the camera fit is the camera group's (requested). The ball life is unchanged: a longer life left
  soot hanging at 1511.75 (−9.5).
* **Tall U walls fan out.** Gerb walls (8+ units) taller than 14 m without an authored `angle` (and
  without `fan`) lean their side-section and arm units outward by up to 12° (from |x| 40 m, full at
  88 m); without an authored `spread` their cone also opens up to 1.8 × (an authored `spread` stays as
  written): the plumes at the ends of the U lean out towards the frame edges (v1193, v1199). Measured
  neutral (1190–1200, 1301–1307, 1528, 1536.25, 877.25/877.75, 1313.5/1314, 1566.5/1567.5 within ±0.6).
* **Pale tints keep their hue; the chroma push is gentler.** A pale non-warm author colour of saturation
  0.1–0.22 (`#FFD8F0` pink, `#E8D8FF` lilac) is a colour, no longer white titanium: white-hot sparks
  (hot core 0.56) that cool to their own hue, nearly white brightness (× 0.96), and the light, the row
  smoke, the burning cloud and the flash of the row carry the hue at saturation 0.5 (`#FFD8F0` lights its
  smoke (1, 0.5, 0.8)): the pink waves of v1192 / v1198 stand in pink air, the lilac waves of v1302 /
  v1305 in lilac. Warm pale whites (`#FFF0D8`, `#FFF2E0`, …: r ≥ g ≥ b) and near-neutral colours (< 0.1,
  `#F4F8FF`) stay white. The push of pale tints towards the saturated star colour is gentler: each
  channel's distance from white × k, k from 1 at saturation 0.12 to at most 1.25 at 0.3, blending into
  the older push (k = 1 + min(0.7, 2.2 (sat − 0.2))) between 0.4 and 0.55; gold / orange and saturated
  colours are unchanged. Brightness of coloured sparks: × (1 − 0.38 smoothstep(0.12, 0.3, sat)) (0.62
  from 0.3, as before).

  | author colour | round 8 spark colour | round 9 spark colour | light / smoke colour |
  |---|---|---|---|
  | `#FFD8F0` | white (1, 0.85, 0.94) | pale pink (1, 0.84, 0.94) | (1, 0.50, 0.80) |
  | `#E8D8FF` | white (0.91, 0.85, 1) | pale lilac (0.91, 0.84, 1) | (0.71, 0.50, 1) |
  | `#FFA0D8` | (1, 0.49, 0.79) | (1, 0.53, 0.81) | (1, 0.53, 0.81) |
  | `#FFB0E0` | (1, 0.62, 0.85) | (1, 0.61, 0.85) | (1, 0.61, 0.85) |
  | `#FF60B0`, `#FF30C0`, `#FF7020`, `#FF3818` | unchanged | unchanged | unchanged |

  1303 60.0 → 61.5 %, 1193 −0.6, 1199 −0.4, 1301/1304 within ±0.6.
* **`column` on a whole wall stays a bad idea.** Tested on the 3.6 s 32 m wall of 1565.3: +4.0 at
  1566.5, −2.4 / −6.0 / −5.8 at 1567 / 1567.5 / 1568 (the round-8 finding). A law that fades the loose
  edge of the cone like loose sparks (energy-conserving only near the axis) halves both the gain and the
  loss; still net negative, not kept. Both 1566.5 and 1567.5 are seen from the same distance, so no
  distance-dependent law can separate them: in the video the wall is brightest in the first second of
  its burn and thinner after. Use `column` on narrow jets seen from far (the pillar fans, see `fan`).

## Round 11 — opt-in params (no default changes)

Round 11 is an engine round: every new param below is optional and a cue without it renders exactly as
before (the 64 default moments are unchanged). The cue edits that use them, with their measured effect, are in
the pyro group's cue patch (`$ENDSHOW_DATA/work/r11_pyro/cue_patch.json`), applied by the show agent.

* **`light` / `lightColor` / `reach` (gerb, sparkular, flame, firewall; burst: `light`, `lightColor`).** `light`
  (0–4) multiplies the effect's spatial light and its LightEnv flash; the light's reach grows with √`light`. The
  multiplier acts AFTER the system's soft light cap (`LightSpec.gain`, applied in `FxLights.add`), so `light: 2`
  really is twice as bright instead of being squeezed by the log compression of `CueFxSystem.lightCap`.
  `lightColor` (gerb, burst) is the colour of that light, the flash, the row smoke's self-light and the burning
  cloud (default: from the spark / burst colour); on a gerb it may be a list aligned with `colors` (one light
  colour per colour window, `""` = that window's spark colour; the cloud, the smoke and the flash take the first
  entry). `reach` (m, flame / gerb) overrides the light's reach.
  Why the colour: in the red smoke of the finale (v1510–1537) the gold-white walls light the air and the field
  red-orange (video field G, B ≈ 0); a gold light raises G and B everywhere (sky, field, haze) and lowers the
  colour score even where the brightness is right.
* **`glow` (gerb).** 0–2: the lit burning cloud around the sprays at this strength, there from the ignition
  (instead of the automatic `intensity` > 1.5 / long-tall-burn cloud).
* **`lean` (gerb).** Degrees of outward lean of the side-section and arm units (full from |x| 88 m, none inside
  |x| 40 m). Default: the round-9 12° on a tall U wall without `angle` / `fan`, else 0. An authored `lean`
  applies to any wall, also with an `angle`.
* **`changes` (gerb / sparkular)**: see the table below; a leading 0 is now tolerated.
* **Waterfall `density`, `height`, `columns`.** `density` (0.2–4) × the sparks and √× the light;
  `height` (m, 3–60): the curtain falls that far (the spark life follows the drag fall law
  d(t) ≈ 6.54 t − 4.36 (1 − e^(−1.5 t)); default ≈ 16.5 m as before); `columns` (m): discrete downward sprays every
  `columns` m (a row of waterfall tubes: dense streaks with dark gaps, v1092.3–1094.5) instead of one even sheet.
  Use `offset` to hang the curtain higher.
* **Jet `size`, `drift`, `glow`, `life`.** For `cloud: true`: `size` (0.3–4) × the cloud (box, puffs, a few more
  puffs), `drift` (`[x,y,z]` m/s) blows the cloud off that way (v767.25–768.0: up and right), `life` (s, default
  2.8) its life. `glow` (0–4, all jets) × the plumes' and the cloud's own glow in `color`. The piano rig's
  start height needs no new param: `offset: [0, dy, 0]` (every fx) lifts the jets onto the tower top.

Measured with the cue patch applied in the page (`scripts/similarity.mjs --eval`, Show camera unless noted, Mac
GPU, `--settle 500 --min-frames 30`, pre-roll on; mean raw score of the listed moments, before → after):

* **The last eruption (1565.3).** `burst` on `mines` `light: 3.5, lightColor: "#FF2008"` + the U wall
  `lean: 24, light: 2, lightColor: "#FF3010", glow: 0.6`: 1565.5–1568 (8 moments) 51.4 → 55.3 % (1566.25 0.427 →
  0.573, 1567 0.642 → 0.709, 1568 0.652 → 0.713; 1565.5 0.413 → 0.342, where the filmed centre is white-hot).
  The same light in the burst's own warm white loses (49.8 %): the filmed frame is saturated red to its corners
  (≈ 120 / 7 / 3), and a white-orange light raises G and B on the haze and the field. `pattern: "all"` on the wall
  (50.3 %) and the three-armed pillar fans (`fan: 3`, rows 2–3: 51.2 %) did not help.
* **The roof fan (1510.434).** `column: true, intensity: 2.2, height: 40, angle: 36, spread: 34, light: 1.5,
  lightColor: "#FF2A08"`: 1511.75–1514.5 56.7 → 59.7 % (1513.5 +5.6, 1514.5 +5.2, 1511.75 of the 64 +0.3).
* **The U wall (1522.628), split at the cut of v1534.964.** Until the cut: `column: true, intensity: 2,
  height: 42, lean: 26, spread: 14, light: 2, lightColor: "#FF2A08", glow: 0.8` (its orange-gold and white
  windows); from 1535.028 a new cue carries the pink-white end as it was, so the front-left drone shot and the
  64-moment 1536.25 are unchanged (the restart is hidden by the cut). Together with the fan edit, 16 moments
  1511.75–1536.75 at the current camera: 51.6 → 53.2 % (1523.5 0.521 → 0.611, 1527 0.542 → 0.626; 1533 −0.085,
  1534.5 −0.038). Lit red on the whole burn it lost at 1536.25 (−0.055); lit only (`light` / `lightColor` / `glow`)
  without the size, or only bigger without the light, both lost (48.4 / 49.6 % vs 51.0 % on 1523.5–1536.75).
* **Arm cakes from the fitted drone poses** (1515.284: (0.9, 92.8, 232.8), 24° down, vfov 53; 1520.964 →
  1534.964: (1.3, 101, 231) 27° → (1.1, 90, 234) 20° at 1527 → (4.9, 71, 265) 11° at 1534.5): 1515.273 / 1520.886
  as `fan: 3` cakes (`fanSpread` 30, `angle` 14, 40 m, `column`, `intensity` 2.4) lit red (`lightColor` per window
  `["#FF2A08", "", "#FF2A08"]`: the magenta window keeps its own light), `glow: 0.8`. With the fan and wall edits,
  16 moments from the fitted poses: 48.6 → 52.3 % (1516.5 0.480 → 0.588, 1521.5 0.515 → 0.583; 1522.25 −0.08). A
  gold light (`light` without `lightColor`) lost 5 points (45.7 %): it lifts G and B over the red site. At the
  CURRENT, closer camera the bigger cakes lose (1516.25 −0.10, 1521.5 −0.07): this part goes only with the fitted
  poses (group `fitted-drone-camera` in the patch).
* **Default 64 moments** (committed engine, no patch): 69.3 / 53.5 % (colour 70.3, light 82.2, shape 57.1), the
  round-11 baseline; with the patch's current-camera edits applied in the page: 69.3 / 53.5 % (1511.75 +0.003,
  1536.25 −0.001, the rest within ±0.002).
* **Waterfall 1091.765.** `columns: 2.5` (the filmed tube columns): 1092.5–1094 46.9 → 47.1 %, neutral. A
  taller / denser curtain (`height` 24–30, `density` 1.5–2.5, `offset` up) lost 2–19 points from the current
  camera at (−46, 3, 8): the curtain hangs behind the castle battlements there, and its extra light lifts the
  beige haze where the video is dark after v1093.3.
* **Green CO2 cloud 766.984.** `dur: 0.3, size: 2.5, drift: [35, 50, 0], glow: 0.35, life: 0.9`: 767.25–768
  79.0 → 78.8 % (767.5 0.718 → 0.758, 767.75 0.813 → 0.779): neutral; the filmed cloud is dim olive (≈ 36 / 56 / 6),
  our cloud at `glow` 1 is 3× too bright and a large one lingers where the video's has blown away.
* **Piano CO2 932.385.** `glow: 2.5`: 932.5–936 42.4 → 43.8 %. Lifting the rig onto a 5 m tower (`offset:
  [0, 2.5–4, 0]`) lost 8–10 points in the current telephoto (the plumes leave the frame at the top).
* **Capital flames (275.8–289.7).** Flame `light` 2–3 (with or without `reach` 30, with or without the
  authored orange glows / floods) lost 1–12 points on 275.9–289.8: the terrace-ground frames 275.9 / 277.5 gain
  (+4 to +10) but the telephoto frames lose; the show's authored glows and floods stay the better model.

## pyro — new params

| fx | param | meaning |
|---|---|---|
| all | `pos` | `[x,y,z]` or a list of them: absolute unit positions, used instead of `target`. The target stays the contract fallback. `posAdd: true` fires both. |
| all | `at` | preferred extension anchor name (validator convention); it is used if the engine knows that anchor, otherwise the target is used |
| all | `corners` | `true`: every unit becomes a pair. On `pillars_top`: the two front capital corners beside the crystal (3.1 m below the anchor, ±1.45 m). On `pillars_base`: the front corners of the plinth deck (±3.4 m). On other targets: `split` 2 m. |
| all | `split` | m: every unit becomes a pair at ±split/2 along X |
| all | `offset` | `[dx,dy,dz]` added to every unit |
| flame / firewall | `fan`, `fanSpread` | heads per unit (1–7) spread over `fanSpread` degrees (default 50) around `angle`, for V or fan flame units. `fan: 2, fanSpread: 56, angle: 0` is the V on the wings. |
| flame / firewall | `billow` | see "Engine behaviour" |
| flame / firewall | `blowout` | `true` (with billow): the finale version. Adds a white-gold spark wall between the columns, a row of fireballs at the cut and a larger flash. |
| gerb / sparkular | `colors`, `changes` | a colour sequence over the burn, e.g. `"colors": ["#FFE0A0","#FF30C0","#FF7020"], "changes": [1.355, 2.323]`: `changes` holds the n − 1 SWITCH times in seconds relative to the cue (the first colour starts at 0 and is not listed; default: evenly spaced). Round 11: a list of n START times that begins with 0 (`[0, 1.355, 2.323]`) is read the same way (the leading 0 is dropped) instead of switching to the second colour at once. The whole column turns at once: sparks already in flight change colour too. |
| gerb | `smoke` | 0..3: a self-lit smoke column per unit (the obelisk capitals) |
| gerb | `fan`, `fanSpread` | (round 9) heads per unit (1–7) spread over `fanSpread` degrees (default 70) around `angle`, the heads sharing the unit's sparks (÷ √fan): multi-armed gerb fans such as the three-armed white trees on the lantern pillars (v1565.5–1566.9: `fan: 3, fanSpread: 70, angle: 0, spread: 4`). With `column: true` they stay bright lines from a far drone. A `fan` wall does not get the round-9 outward lean. |
| gerb | `column` | `true` (round 7): a dense column that keeps its full light when its sparks are thinner than a pixel. Sparks under a pixel are normally drawn at (w / w_min)^1.5 of their light (a lone spark fades out at a distance); the sparks of a `column` gerb use the energy-conserving (w / w_min)^1, so a wall seen from a far drone reads as bright columns (the white wall of v1565.3–1568.8 from ~400 m; metric-neutral there while the red site glow still covers that frame). Close up nothing changes. Use it only where the video shows bright columns from far away: on every wall it over-brightens the distant walls of v1190 / v1300 (measured −17 / −7 points). |
| gerb / sparkular | `light`, `lightColor`, `reach` | (round 11) × the row light and flash (after the soft light cap), the colour of the light / flash / row smoke / burning cloud (a colour, or a list per `colors` window), the light's reach in m. See "Round 11". |
| gerb | `glow` | (round 11) 0–2: the lit burning cloud around the sprays at this strength from the ignition on |
| gerb | `lean` | (round 11) degrees of outward lean of the side-section and arm units (default 12 on a tall U wall without `angle` / `fan`) |
| flame / firewall | `light`, `reach` | (round 11) × the row light and flash (after the soft light cap), the light's reach in m |
| burst | `light`, `lightColor` | (round 11) × the burst's flash and lights (the eruption light of `size` ≥ 2.6 also reaching √`light` × as far) and their colour |
| waterfall | `density`, `height`, `columns` | (round 11) × the sparks; the fall height in m; discrete tube columns every `columns` m |
| jet | `size`, `drift`, `life`, `glow` | (round 11) for `cloud: true`: × the cloud, its drift `[x,y,z]` m/s, its life in s; `glow` × the own glow of plumes and cloud |
| jet | `count`, `radius` | several jets around each anchor (the piano tower rig), leaning slightly outward |
| jet | `cloud` | `true`: the plumes merge into one big CO2 cloud over the middle of the rig. It glows in `color` for about 2 s (the green cloud at v767.25). |
| burst | `type: "bengal"` | Bengal flare for any `dur` (also under 2 s: flares that hover 1.2–1.6 s). `dur` ≥ 2 without a type still means Bengal. |
| burst (bengal) / bengal | `path` | a flare drone: a list of `[x,y,z]` waypoints, or a list of such lists for several drones. It flies over `dur`, leaves a lit smoke trail, and its light follows it over the smoke and the field. |
| burst (bengal) / bengal | `times` | seconds relative to the cue for each waypoint (default: constant speed) |
| burst (bengal) / bengal | `mirror` | `true`: each path is also flown mirrored in X |
| burst (bengal) / bengal | `sparkler` | `true`: a white sparkler drone (falling sparks) instead of a flare |
| burst (bengal) / bengal | `smoke` | trail amount 0..3 (default 1) |

## fog — new params

| fx | param | meaning |
|---|---|---|
| burst | `glow` | 0..4: the cloud is lit by itself in its `color`, and lights the haze and floor around it. Use it for lit CO2 or smoke whiteouts, cyan-lit plumes and red smoke banks. Glowing bursts come out within about 0.7 s. |
| burst | `density` | 0.2..4 opacity multiplier (a thick bank that hides the set) |
| burst | `life` | smoke lifetime in s (default 13) |
| burst | `rise` | speed multiplier (default 1) |
| burst | `rate` | puffs per second over `dur` (the lantern crystals puffing smoke). Without it, the burst is one release over min(dur, 4) s. |
| burst | `lift` | m above the anchor (default 1.8 on `pillars_top`: the top of the lantern hood) |
| burst | `size` | now allowed up to 8 (was 6) |
| level | `glow`, `glowColor` | 0..3 and a colour: the whole smoke volume (haze, smoke, low fog, slightly the floor) glows in that colour. It cross-fades with the level's `fade`. A later level without `glow` fades it out. |
| lowfog | — | saturated colours (e.g. the red finale bank) keep their colour; the big field regions use larger, fainter sheets so the fog reads as one bank |

## Validator notes

`scripts/validate-show.mjs` already accepts all of these, reporting them as extension params. It
treats `p.at` as a string extension-anchor name, so absolute positions use `pos`, not `at`.
`pyro.bengal` is not in the docs table; use `pyro.burst` with `type: "bengal"`.

## Cue updates that opt the show in

The exact edits are in the pyro fixer's report (contractRequests). They are also a runnable,
idempotent patch script: `pyro-cue-updates.py` (run it on the finalized show).
