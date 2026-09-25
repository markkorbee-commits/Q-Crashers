# Show format & cue vocabulary (contract)

`public/show/endshow-2026.json` is a `ShowFile` (see `src/show/ShowTypes.ts`). The ShowEngine
compiles it into immutable cues; every system renders a **pure function of show time**.
This document is the contract between the show author and the systems. A system MUST support
every fx listed for it; unknown fx/params must be ignored gracefully (never throw).

## Common conventions

* `t` / `dur` are seconds of video/audio time. `life` (visual lifetime, e.g. falling firework
  stars) is added by the system through `show.registerLifetime(sys, fn)`.
* `target`: anchor names from `src/core/Anchors.ts` (`deck_front`, `wing_left`, `wing_right`,
  `wing_tips`, `towers_top`, `roof`, `dragon_mouth`, `pillars_top`, `delay_towers`, `foh`,
  `fireworks_back`, `fireworks_sides`, `laser_stage`, `laser_field`, `fixtures_truss`,
  `fixtures_floor`), or the filters `all`, `left`, `right`, `center` (applied to the system's
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

## atmos
| fx | params |
|---|---|
| `sky` | `tint` colour, `stars` 0..1 |
