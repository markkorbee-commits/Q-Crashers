# Show format & cue vocabulary (contract)

`public/show/endshow-2026.json` is a `ShowFile` (see `src/show/ShowTypes.ts`). The ShowEngine
compiles it into immutable cues; every system renders a **pure function of show time**.
This document is the contract between the show author and the systems. A system MUST support
every fx listed for it; unknown fx/params must be ignored gracefully (never throw).

## Common conventions

* `t` / `dur` are seconds of video/audio time. `life` (visual lifetime, e.g. falling firework
  stars) is added by the system through `show.registerLifetime(sys, fn)`.
* `target`: anchor names from `src/core/Anchors.ts` (defaults generated from
  `research/terrain-layout.json` by `scripts/gen-layout.py`):
  core — `deck_front`, `deck_back`, `wing_left`, `wing_right`, `wing_tips`, `towers_top`, `roof`,
  `dragon_mouth`, `dragon_eyes`, `dragon_head`, `speaker_hangs`, `dj_booth`, `pillars_top`,
  `pillars_base`, `delay_towers`, `foh`, `fireworks_back`, `fireworks_sides`, `laser_stage`,
  `laser_field`, `fixtures_truss`, `fixtures_floor`;
  design-bible pyro groups — `side_front` (flames along the side sections), `arm_posts` (flame
  posts along the forward arms), `tower_torches` (two 15 m torches), `corner_fireballs`,
  `side_rampart`, `roof_comets`, `front_comets`, `deck_gerbs`, `arm_ends` (X-fans at the arm tips),
  `crest_comets`, `co2`, `bengal` (red flares), `mines`, `hang_glitter`, `piano` (laser source on
  the piano riser) — or the filters `all`, `left`, `right`, `center` (applied to the system's
  default anchor). Several targets may be combined.
* Colours (`color`, `color2`): `primary` | `secondary` | `accent` (current section palette) |
  a named colour from `src/show/colors.ts` (`red`, `deepred`, `orange`, `amber`, `gold`, `fire`,
  `white`, `warm`, `cold`, `ice`, `blue`, `deepblue`, `cyan`, `green`, `lime`, `purple`,
  `magenta`, `pink`, `uv`) | `#rrggbb`.
* `intensity` 0..1 (default 1). `speed` = cycles per bar unless stated otherwise.
* `repeat` expands a cue on the musical grid (`beat`, `halfbeat`, `2beat`, `bar`, `2bar`, `4bar`,
  `8bar` or seconds) with optional step `pattern` ("x-x-xx--") and per-step `cycle` of params or
  `cycleTargets`. Use it for kick-synced flames/strobes instead of listing hundreds of cues.
* Seeds: `cue.seed` is deterministic; use it for all per-cue randomness (`src/core/rng.ts`).

## lights (moving heads, beams, washes, blinders, pillar lamps)
| fx | dur | params |
|---|---|---|
| `look` | section length | `preset`: `dark` \| `ambient` \| `sweep` \| `fan` \| `ballyhoo` \| `circle` \| `tilt_wave` \| `audience` \| `crosshatch` \| `sky` \| `pulse` \| `still`; `color`, `color2`; `speed`; `intensity`; `groups`: subset of `truss`,`floor`,`towers`,`field` (default all); `fade` (s crossfade, default 0.5); `beam`: `narrow`\|`wide`; `kick`: bool (intensity pumps on kicks) |
| `hit` | 0.3–1 | all beams snap to full + `color`, decay over dur |
| `chase` | bars | `color`, `pattern`: `lr`\|`rl`\|`center_out`\|`out_center`\|`random`, `every`: `beat`\|`halfbeat` |
| `blinder` | 0.2–1 | audience blinders; `intensity`, `color` (default `warm`) |
| `wash` | section | stage-set wash: `color`, `intensity` (writes `env.stageWash*`) |
| `pillars` | section | lantern pillar lamps: `color`, `mode`: `steady`\|`flicker`\|`chase`\|`pulse`\|`off`, `intensity` |

Latest-started active `look` per group wins, cross-faded over `fade`.

## strobe
| fx | params |
|---|---|
| `hit` | single white flash (`color` optional) |
| `burst` | `rate` Hz (default 12), `color` |
| `kick` | flash on every kick during dur |

## lasers
| fx | params |
|---|---|
| `look` | `preset`: `fan` \| `sheet` (flat plane over the crowd, "liquid sky") \| `tunnel` \| `sweep` \| `crossfire` \| `sky` (beams straight up) \| `wave` \| `cone` \| `grid` \| `burst`; `color`, `color2`; `count` (beams per emitter); `speed`; `spread` (deg); `tilt` (deg, + = up); `origin`: `stage` \| `field` \| `all`; `height` (m, for `sheet`); `intensity`; `kick` (bool) |
| `hit` | short full-rig burst: `color`, `pattern`: `fan` \| `star` |
| `off` | lasers off for dur |

## pyro (flames, CO2, sparks — particle based)
| fx | dur | params |
|---|---|---|
| `flame` | 0.4–1.5 | flame jets at targets (default `deck_front`): `height` m (default 8), `color` (default fire), `pattern`: `all`\|`lr`\|`rl`\|`center_out`\|`out_center`\|`alternate`\|`random`, `stagger` s |
| `firewall` | seconds | continuous row of flames: `height`, targets |
| `dragon_breath` | 1–4 | long flame from `dragon_mouth`: `length` m, `color` |
| `jet` | 0.5–2 | CO2 jets (white plumes): `height` |
| `gerb` | 1–8 | spark fountains: `height`, `color` (`gold`,`white`,...) |
| `sparkular` | 1–10 | cold spark fountains (low, dense): `height` |
| `waterfall` | 3–15 | spark cascade from `roof`/`wing_*`: `color` |
| `burst` | 0.2 | stage explosion (flash + debris sparks + smoke puff): `size` |

## fireworks (aerial, particle based; `life` covers falling stars)
| fx | params |
|---|---|
| `shell` | `type`: `peony` \| `chrysanthemum` \| `willow` \| `palm` \| `crossette` \| `ring` \| `strobe` \| `crackle` \| `brocade` \| `kamuro` \| `dahlia`; `color`, `color2`; `height` m (80–260); `size` (burst radius m, default from height); targets default `fireworks_back`; optional `x`,`z` absolute |
| `salvo` | several shells launched together: `count`, `spread` m, + shell params |
| `comet` | rising comets/tails: `count`, `angle` (fan deg), `color`, `height` |
| `cake` | repeated fans of comets/mines over dur: `shots`, `color`, `angle` |
| `mine` | ground-level upward burst: `color`, `height` |
| `finale` | dense barrage over dur: `density` (shells/s), `palette`: colour list |

## fog
| fx | params |
|---|---|
| `level` | `haze` 0..1 target density, `fade` s |
| `burst` | smoke burst at targets: `size` |
| `lowfog` | ground fog on the deck: `density` |

## stage (dragon, wings, castle)
| fx | params |
|---|---|
| `state` | `mode`: `dormant` \| `awake` \| `rage` \| `frozen` \| `ember`; `eyes` colour; `eyesIntensity`; `mouth` 0..1 glow; `wings` 0..1 glow; `rosettes` colour; `spin` (rosette rpm); `windows` 0..1 castle window glow; `windowColor`; `fade` s |
| `eyes_flash` | eyes flare (`color`) |
| `roar` | jaw/mouth glow surge (pair with `pyro.dragon_breath`) |
| `pulse` | whole set flashes with the kick for dur (`color`) |

## screens (LED areas on the set, if any)
| fx | params |
|---|---|
| `content` | `mode`: `off` \| `color` \| `fire` \| `ice` \| `runes` \| `logo` \| `title` \| `eye` \| `embers` \| `pulse`; `color`; `text` |

## crowd
| fx | params |
|---|---|
| `mood` | `state`: `idle` \| `sway` \| `bounce` \| `jump` \| `handsup` \| `fistpump` \| `lighters` \| `cheer` \| `wave` \| `hug`; `intensity` |
| `cheer` | short roar (also triggers ambience) |
| `flags` | `amount` 0..1 (share of flag holders waving) |

## camera (show camera mode only)
| fx | params |
|---|---|
| `shot` | `pos` [x,y,z], `look` [x,y,z], optional `to` / `lookTo` (move during dur), `fov`, `ease` |

## atmos (sky / weather, rendered by the EnvironmentSystem)
| fx | params |
|---|---|
| `sky` | `tint` colour, `amount` 0..1, `stars` 0..2, `clouds` 0..1, `fade` s |
| `lightning` | distant storm lightning in the W clouds: `intensity` 0..2 |
| `clouds` | `cover` 0..1 |

## Light-flash convention
`app.env.addFlash(color, intensity, pos)`: ~0.5–5 per burst (the world soft-limits the total to ~18).

## lights — extra params
`look` also accepts `target` (narrow to matching positions), `tilt`, `pan`, `spread` (deg);
`pillars` accepts `shaft`/`color2` (shaft uplight colour) and `shaftIntensity`. Position names for
lights targets: `truss`, `floor`, `towers`, `field`, `wings`, `deck`, `roof`, `castle`, `sides`,
`side_sections`, `corners`, `arms`, `pillars`, `foh`, `speaker_hangs`, `dragon`, `towers_top`.

## Implementation extensions (optional params supported by the systems)

### lasers
* `fade` (s) crossfade from the look being replaced on those projectors; latest look wins per
  projector; `sheet` runs on its own layer and combines with beam figures.
* `aim: [x,y,z]` world point a fan / sweep / cone / burst / chevron centres on.
* preset `chevron` + `distance` (convergence Z, default 70): the In The Cold gold V (5+5 deck units,
  centre pair dark).
* `crossfire` with `origin: field` = the Domitor Draconis piano bounce; `segments` 1–8 (author one
  cue per piano hit with segments 1, 2, 3, 4 to build the V).
* `grid` with `height` also makes the deck front part of the low web; `origin: field|all` uses the
  plinth units.
* Audience mode: sheets/tunnels/web/chevron sit ≥ 4.5 m above heads in "Tribe" mode (crowd present)
  and skim 1–3 m over the floor in "As filmed" mode (`?mode=filmed`).

### pyro / fireworks / fog
* `pyro.flame` / `firewall`: `angle` (deg, tilt away from centre), `intensity`; firewall fills gaps
  to ≤ 3.2 m. `pyro.dragon_breath`: `pitch`. `jet` / `gerb` / `sparkular`: `angle`, `spread`,
  `pattern`, `stagger`. `pyro.burst` with dur ≥ 2 s acts as a Bengal flare; `pyro.bengal`: `color`,
  `size` (default target `wing_tips`, use target `bengal`).
* `fireworks.shell` / `salvo` / `finale`: `height` = ABSOLUTE break altitude above ground (default 90;
  finale 62); `size` = burst radius; `rise` = lift time in s (0 = breaks exactly at the cue time),
  otherwise the lift takes `0.8 + 0.021 × (height − launch y)` s — to land a break on a musical hit
  at T, put the cue at T minus that. `color` may be a comma list / array (cycled); `color2` = pistil
  or colour change. A shell with only filter targets fires ONE shell; named anchors fire one per
  point; `x`/`z` give an absolute position. Extra shell type `glitter`.
* `salvo`: `count`, `spread`, `pattern` (line|v|arc|random), `stagger`.
* `comet`: `height` = rise above the launch point (default 40); `count` total vs `per` (per point);
  one comet per point with `angle` > 0 makes a V; `end`: none|pearl|crackle|shell type; `serpent`;
  `stagger`; `lean`.
* `cake`: `shots` (20), `angle`, `height` (rise), `dur` (shots × 0.14 s), `type`, `zipper`.
* `mine`: `height`, `count`, `spread`, `type` (strobe|crackle|glitter).
* `finale`: `density`, `palette`, `dur`, `height`, `spread` (210 m), `types`, `comets` (roof fans/s).
* `fog.level`: `haze` (or `density`), `fade`. `fog.burst`: `size`, `color`. `fog.lowfog`: `density`,
  `area` (deck|field|all), `spill`, `color`.
* Flash convention: one shell 0.4–1.2, a flame row up to 2.2, soft cap 2.5 per system.
