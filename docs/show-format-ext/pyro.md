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

* **Tall wall gerbs are spikes.** The spray cone of a gerb narrows with its height above 14 m, to
  0.4 x its `spread` (default or authored) at 30 m and above: a 30–40 m wall reads as a row of
  separate thin columns with the set visible between them (v1189–1197, v1536), not one sheet of
  sparks that hides the stage (1194). Walls up to 14 m are unchanged.
* **Burning cloud of 2.5–4 s walls.** The burning cloud of a long burn of tall units (round 5/6)
  ramps in between 2.5 s and 4 s of burn instead of starting at 4 s: the 3.6 s white 32 m wall of
  v1565.3–1568.8 stands in a little of its own lit cloud. Walls of 4 s and more are unchanged.
* **Burning wings stay on the wings.** A `firewall` on the wings rises to 0.45 H (was 0.7 H) with
  narrower tongues (growth 0.39 H, was 0.65 H), and the roll-over fireballs at the finger tips sit
  0.2 H above the tips (was 0.7 H): the fire licks along the wing outline (v101, v713.5, v729.25)
  instead of standing a flame length above the wing geometry. Measured: 729.25 +1.3, 100.75–101
  +1.6, 713.5 +1.7, 734 +1.3 points (the orange domes around the wings are the lens glare of
  src/postfx/SceneGlare.ts, driven by the wing lights, which are unchanged).

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
| gerb / sparkular | `colors`, `changes` | a colour sequence over the burn, e.g. `["#FFE0A0","#FF30C0","#FF7020"]`, with switch times in seconds relative to the cue (default: evenly spaced). The whole column turns at once: sparks already in flight change colour too. |
| gerb | `smoke` | 0..3: a self-lit smoke column per unit (the obelisk capitals) |
| gerb | `column` | `true` (round 7): a dense column that keeps its full light when its sparks are thinner than a pixel. Sparks under a pixel are normally drawn at (w / w_min)^1.5 of their light (a lone spark fades out at a distance); the sparks of a `column` gerb use the energy-conserving (w / w_min)^1, so a wall seen from a far drone reads as bright columns (the white wall of v1565.3–1568.8 from ~400 m; metric-neutral there while the red site glow still covers that frame). Close up nothing changes. Use it only where the video shows bright columns from far away: on every wall it over-brightens the distant walls of v1190 / v1300 (measured −17 / −7 points). |
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
