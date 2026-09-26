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
  Fireworks light the smoke and the floor from their flashes at a lower gain.
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
* **Spark budget.** When a layer is over budget it uses water-filling instead of a uniform scale:
  small emitters (a pillar-top fan, a flare) stay complete, and only the largest (a 60-unit wall)
  thin out.
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
