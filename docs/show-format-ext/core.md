# core: format extensions (round 2)

Engine features of the core group (`src/core`, `src/camera`, `src/world`, `scripts/`) that cues can
opt into. Every one is optional: a cue that does not use them renders exactly as before.
`node scripts/validate-show.mjs` reads this file (and every other `docs/show-format-ext/*.md`).

## camera

| fx | params |
|---|---|
| `shot` | `fov` now 5–110 (was 10–110): the official telephotos are ≈ 6°; `fovTo` (deg, 5–110): a real zoom from `fov` to `fovTo` over `dur`, with the same `ease` as the move, at an even pace in focal length (log tan), so `to`/`lookTo` dolly emulations of zooms can go; `alt` { `pos`, `look`, `fov`, `roll` } + `altEvery` (s, 0.033–10, default 0.1): stutter edit, the odd `altEvery` slots show the `alt` camera (held on the main camera with reduced motion); `roll` (rad) |

Examples

* Telephoto zoom-out (v1098.4–1110.4):
  `{ "sys": "camera", "fx": "shot", "t": 1098.37, "dur": 12, "p": { "pos": [0, 6.7, 170], "look": [0, 15, -10], "fov": 6, "fovTo": 30, "ease": "inout" } }`
* Crash zoom (v798.0): `"fov": 40, "fovTo": 12, "ease": "in"` on a 0.6 s shot.
* Stutter edit (v1222.6–1225, two angles every 2–4 frames):
  `"alt": { "pos": [-44, 52, 78], "look": [-3, 18, -12], "fov": 40 }, "altEvery": 0.1`.

Engine behaviour of the show camera (no cue change, all deterministic per shot):

* Tribe mode (crowd present): a pose below ~3.9 m over a dense crowd rises smoothly to
  camera-platform height (aim kept). The empty-grounds framings of the official edit would otherwise
  film the back of a head. "As filmed" mode is unchanged.
* PA hangs: when a flown line array (or its truss tower) in front of the subject covers the centre
  56 % of a framing, the shot is moved sideways by the smallest step (0.5 m steps, ≤ 8 m, aim kept)
  that clears it. The offset is computed once from the shot's start pose and held for the whole shot.
* Photo terrace: a pose on or just behind the terrace below 8 m is moved along its sight line to just
  in front of the front rail (≤ 9 m, framing unchanged), so the rails and glass never cross the frame.

## atmos

| fx | params |
|---|---|
| `glow` | site-wide coloured light over the whole grounds: `color` (default `primary`); `amount` 0–2 (default 0.6; 1 ≈ the red smoke of v1510); `fade` s fade-in (default 0.3); `out` s fade-out at the end of `dur` (default 0.8); `flicker` 0–1 (fire-light breathing, default 0); `smoke` 0–1 (the site fills with smoke in that colour: denser height fog, veiled sky; default 0) |

`atmos.glow` lights the ground, trees, pillars, structures and props (world-light patch), the height
fog, the sky and the cloud deck, and everything lit by the sky dome. Other systems can read it from
`app.env.glowColor` (premultiplied by amount) and `app.env.smoke`. Several glows add up.

Suggested cues from the official video (see contractRequests of the core round-2 report):

| video | cue |
|---|---|
| 75.92–76.6 pink whiteout | `{ "t": 75.92, "dur": 0.7, "sys": "atmos", "fx": "glow", "p": { "color": "#ff9cb4", "amount": 0.9, "fade": 0.08, "out": 0.3, "smoke": 0.8 } }` |
| 76.56–77.6 red smoke | `{ "t": 76.56, "dur": 1.1, "p": { "color": "#ff2a2a", "amount": 0.6, "fade": 0.1, "out": 0.6, "smoke": 0.5 } }` |
| 612.44–613.6 red flame row | `{ "t": 612.444, "dur": 1.2, "p": { "color": "#ff2418", "amount": 0.7, "fade": 0.05, "out": 0.6, "smoke": 0.3 } }` |
| 1508.4–1509.8 flame wall | `{ "t": 1508.305, "dur": 1.9, "p": { "color": "#ff8a2a", "amount": 1.2, "fade": 0.15, "out": 0.5, "flicker": 0.4, "smoke": 0.3 } }` |
| 1510.44–1537.5 red smoke site | `{ "t": 1510.436, "dur": 27.1, "p": { "color": "#ff1a12", "amount": 0.7, "fade": 0.3, "out": 2, "smoke": 0.6 } }` |
| 1565.3–1569 red eruption | `{ "t": 1565.3, "dur": 3.7, "p": { "color": "#ff2418", "amount": 0.8, "fade": 0.1, "out": 1.2, "smoke": 0.4 } }` |

## Engine-wide lighting changes (no cue change needed)

* Flashes light the grounds as two area lights, stage side (source z < 10) and field side, whose
  softening radius grows with the spread of the sources. A gerb wall across both side sections lights
  the whole field instead of a hot spot at its centre.
* Big flashes bounce off the smoke. A broad ambient term around the flash centre grows with F / (F + 2)
  and with the haze. It turns the field, the banks and the tree belts gold (v600.4) or orange (v1509).
  Single small flashes stay direct-only.
* The flash light on the grounds is warped towards its dominant channel (gold gerbs light the field
  deep orange, as filmed; white stays white, red stays red). It is halved with the photosensitivity
  setting (`app.reduceFlashing`).
* `LightEnv` (core) now also offers `flashStage` / `flashField` (FlashBucket: `color`, `pos`,
  `intensity`, `spread`), `flashSpread`, `glowColor` and `smoke`. `flashColor` / `flashPos` /
  `flashIntensity` are unchanged (all sources).

## Validator

* Reads every `docs/show-format-ext/*.md`: `## <system>` tables in the show-format.md format extend
  the vocabulary (enumerations are merged). Every `sys.fx` mention documents that fx and the backticked
  names on its line. `EXT_ENUM['sys.fx.param']`: `a`, `b` lines extend the enumerations. Any other
  backticked name documents a param of the systems the file talks about.
* Anchor names with digits (`co2`) are valid targets. `pyro.bengal` (show-format.md extensions) is
  accepted.
* The camera structure-coverage warning allows 30 % of the frame when the centre sight line is clear
  (was 17 %). Storyboard exceptions f010, f060, f119, f129 and f130 are recorded (video-timeline evidence).
