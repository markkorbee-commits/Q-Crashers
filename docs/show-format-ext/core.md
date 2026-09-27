# core: format extensions (round 2)

Engine features of the core group (`src/core`, `src/camera`, `src/world`, `scripts/`) that cues can
opt into. Every one is optional: a cue that does not use them renders exactly as before.
`node scripts/validate-show.mjs` reads this file (and every other `docs/show-format-ext/*.md`).

## camera

| fx | params |
|---|---|
| `shot` | `fov` now 5–110 (was 10–110): the official telephotos are ≈ 6°; `fovTo` (deg, 5–110): a real zoom from `fov` to `fovTo` over `dur`, with the same `ease` as the move, at an even pace in focal length (log tan), so `to`/`lookTo` dolly emulations of zooms can go; `alt` { `pos`, `look`, `fov`, `roll` } + `altEvery` (s, 0.033–10, default 0.1): stutter edit, the odd `altEvery` slots show the `alt` camera (held on the main camera with reduced motion); `roll` (rad); `subject` (`mc`): `pos`, `look`, `to`, `lookTo` and `alt` become OFFSETS (m) from the performer's feet at each moment, so the camera follows him like the film's handheld deck operator (no PA nudge; the sight-line check is skipped). Round 11: `rollTo` (rad): the camera banks from `roll` to `rollTo` with the move; `path` [{ `at` (s from the shot start), `pos`, `look`, `roll`, `fov` }, …]: a keyframed flight (FPV drones) through the keys; `zoomAt` / `zoomDur` (s): the `fovTo` zoom runs only inside this window of the shot; `moveAt` / `moveDur` (s): the `to` / `lookTo` / `rollTo` move runs only inside this window; `fadeIn` / `fadeOut` (s): the shot rises from / sinks to black (dips to black of the edit); `blackIn` / `blackOut` (s): black held before the `fadeIn` / after the `fadeOut`; `facing` (`true` or `start`, with `subject`): the offsets are in the performer's own frame, so the camera stays in front of him when he turns |

Round 11 parameters in detail (all optional; a shot without them renders exactly as before):

* `rollTo` (rad, positive = the camera turns counter-clockwise, so the horizon tilts down to the right): `roll` →
  `rollTo` with the shot's `ease` (or inside `moveAt` / `moveDur`). The FPV of v80.6 banks from about −1.15 to −0.7:
  the sky on the left, the wing line diagonal (the old `roll` 0.7 had the sign the wrong way round).
* `path`: an array of keys between the shot's own pose (the key at 0 s: `pos`, `look`, `roll`, `fov`) and the key at
  `dur` (`to`, `lookTo`, `rollTo`, `fovTo`; when none of them is given the flight holds its last key). Each key needs
  `at` (s from the shot start, 0 < `at` < `dur`) and `pos`; `look`, `roll` and `fov` are optional (a key without them
  takes the value interpolated in time between its neighbours). The camera follows a cubic Hermite through the keys
  with Catmull-Rom tangents (position, aim, roll and lens change with a continuous velocity, like a flown drone); the
  lens is interpolated in focal length. The shot's `ease` maps shot time onto the keys (`linear`: the keys are hit at
  their `at`). `moveAt` / `moveDur` and `zoomAt` / `zoomDur` do not apply to `path` shots.
* `zoomAt` / `zoomDur` (s): the zoom `fov` → `fovTo` starts `zoomAt` s into the shot and lasts `zoomDur` s (default: to
  the end of the shot), eased with `ease`; the shot holds `fov` before and `fovTo` after. `moveAt` / `moveDur` do the
  same for `to`, `lookTo` and `rollTo`. A static tripod shot with a short zoom (v998.4, v1051.6) is one cue:
  `{ "t": 1051.124, "dur": 12.64, "p": { "pos": [0.52, 7, 168.86], "look": [-0.85, 17.2, 69.39], "lookTo": [-1.46, 23.7, 70.28], "fov": 30.5, "fovTo": 44.6, "zoomAt": 0.48, "zoomDur": 0.2, "moveAt": 0.48, "moveDur": 0.2, "ease": "inout" } }`.
* `fadeIn`, `fadeOut`, `blackIn`, `blackOut` (s): the picture of the Show camera fades from / to black, linear in
  displayed brightness: `blackIn` s of black, a `fadeIn` s fade up, …, a `fadeOut` s fade down, `blackOut` s of black.
  A dip to black across a cut (v814.88–815.36) is the first shot's `fadeOut` / `blackOut` plus the next shot's
  `blackIn` / `fadeIn`; a black edit (v1411.1–1414.2, v1543.6–1551.3, the end card from v1572.4) is `blackIn` = `dur`.
  The engine draws a black card just in front of the lens after everything else (sky, glow, bloom go black too); it
  costs one draw call only while a shot is fading, and only in the Show camera. Not for lighting blackouts: when the
  set goes dark in the video but the sky, the moon or distant lights stay, that is a stage / lights cue.
* `facing` (with `subject`): `true` = the offsets turn with the performer's facing at every moment (+z = the way he
  faces, +x = his left, +y = up; while he faces the field these are the world axes), `"start"` = with his facing at
  the shot's first frame (no swing during the shot, recommended). The engine reads the facing the body is drawn with
  (`src/crowd/performers.ts` `facingAt`; the MC turns part of the way into his walks, up to ~40°, e.g. v447.5).

Examples

* Telephoto zoom-out (v1098.4–1110.4):
  `{ "sys": "camera", "fx": "shot", "t": 1098.37, "dur": 12, "p": { "pos": [0, 6.7, 170], "look": [0, 15, -10], "fov": 6, "fovTo": 30, "ease": "inout" } }`
* MC close-up from low front-right, following him (v408.4): `"subject": "mc", "pos": [0.4, 0.55, 3.0], "look": [-0.1, 1.9, -6], "fov": 48`.
* MC filmed from the front, low, whichever way he turns (v445.92): `"subject": "mc", "facing": "start", "pos": [0.52, 0.3, 2.95], "look": [0, 1.5, 0], "fov": 28`.
* Crash zoom (v798.0): `"fov": 40, "fovTo": 12, "ease": "in"` on a 0.6 s shot.
* Banking FPV (v80.6–83.28), a keyframed flight with roll:
  `"pos": [-66, 60, 40], "look": [-32, 22, -20], "roll": -1.15, "path": [{ "at": 1.3, "pos": [-58, 56, 33], "roll": -0.95 }], "to": [-50, 51, 26], "lookTo": [-24, 21, -20], "rollTo": -0.7, "fov": 72, "ease": "linear"`.
* Dip to black (v815.0): the shot ending at 815.164 `"fadeOut": 0.16, "blackOut": 0.16`, the next one `"fadeIn": 0.16`.
* Stutter edit (v166.84–168.36: two low frontal framings of the dragon cut together every 1–4 frames at 25 fps):
  `"alt": { "pos": [...], "look": [...], "fov": 40 }, "altEvery": 0.08`. Round 11: the older examples v1222.6–1225 and
  v1267.8 were wrong. At 25 fps both are ONE camera whose lamp strings, lanterns and haze light strobe (the lanterns
  keep their pixels). No show cue uses `alt` at the moment. A green / violet alternation inside one framing
  (v160.76–163.08, v164.16–165.32, v170.36–171.44: two takes of the same tripod) is a stage-look stutter, not a
  camera `alt`.

Engine behaviour of the show camera (no cue change, all deterministic per shot):

* Tribe mode (crowd present): a pose below ~3.9 m over a dense crowd rises smoothly to
  camera-platform height (aim kept). The empty-grounds framings of the official edit would otherwise
  film the back of a head. "As filmed" mode is unchanged.
* `subject` shots (the deck operator following a performer) keep the full lit haze veil (haze scale 1):
  the film's deck close-ups are milky (v351, v409.5, v411.5), so the haze glows around the performer
  and the backlights bloom through it. Other shots keep the long-lens / in-the-haze-cloud thinning.
* Subjects the engine can follow (round 5, `src/crowd/performers.ts` SUBJECTS): `mc`, `lead`,
  `aerialist`, `pianist`, `dancer0` … `dancer9` (the lantern bearers). Offsets are from the
  performer's feet at each moment (the lead's feet are on her pedestal top while she is on it). The
  show validator (`scripts/validate-show.mjs`) accepts all of them (round 6).
* The lead's lantern procession (round 11, `src/crowd/performers.ts`): she leaves the foot of the grey steps at 722.2
  and walks at an even pace down the axis to the deck lip (0.3, −0.05), reached at 729.3, ahead of the whole troupe
  (the file behind her, the kneelers at the flanks behind her). In the film (v723.84–728.9) she fills a wide lens
  with the portal small and far behind her; our portal stands only 6 m behind the lip, so only a walk all the way
  down to the lip gives that framing (camera: a `path` backing away 2 → 1.3 m in front of her, fov 74). She then
  returns to the arch for the pyramid (top by 734.4) as before.
* When to use `subject` (round 6): only when the performer moves during the shot (the MC's walks).
  A performer who stands on a fixed mark for the whole shot (the lead on her pedestal v658–666, the
  pyramid v738.8) is better authored as a fixed pose: the framing is identical, and the shot keeps the
  normal long-lens / in-the-haze-cloud thinning instead of the forced full veil of subject shots
  (measured v659: fixed pose 0.536, the same framing as a subject shot 0.495).
* PA hangs: when a flown line array (or its truss tower) in front of the subject covers the centre
  56 % of a framing, the shot is moved sideways by the smallest step (0.5 m steps, ≤ 8 m, aim kept)
  that clears it. The offset is computed once from the shot's start pose and held for the whole shot.
* Photo terrace (round 8): a pose on or just behind the terrace (4.5–8 m high) keeps its place as long
  as the front rail (6.15 m at z 166.1) stays under the bottom edge of the frame; when the rail would
  reach into the frame, the camera rises the few decimetres that put it ~1° under the bottom edge (aim
  kept). Only a camera that would have to rise more than 3 m (one looking down) is moved along its sight
  line to just in front of the rail (≤ 9 m, framing unchanged), as before. Until round 7 every such pose
  was moved ~5 m forward, which pushed the near lantern pair out of the terrace framings.
* Stutter edits with the photosensitivity option (round 9): with "Reduce flashing" on (App.reduceFlashing) the
  `alt` / `altEvery` stutter alternates no faster than every 0.34 s, i.e. under 1.5 dark/bright pairs per second: a
  stutter between a dark and a bright framing is itself a flashing pattern. Reduced motion (comfort) still holds the
  main angle. Without the option nothing changes. (Round 11: the round-9 rationale cited v1267.8 as a 4.2 Hz camera
  stutter; the 25 fps frames show one camera with strobing lights there, see the stutter example above.)
* Round 11: the camera's PA-nudge cache is keyed by cue id and is now cleared whenever the show recompiles (an edited
  cue list renumbers the cues); `path` keys are parsed once per cue and compile.

Authoring convention (round 7): a `camera.shot` starts on the exact first frame of its video shot,
`t = cut − 0.036` with the cut from `$ENDSHOW_DATA/cuts.json` (exact since 27 Sep 2026), and the previous
shot ends there. Not every entry of the cut list is a camera cut: white flashes, strobe hits and look
changes inside one shot are listed too (e.g. v509.64, v510.2, v510.6, v1046.36, v1048.64, v1437.48,
v1508.48, v1509.8, v1510.44, and round 8: v802.32, v802.76, v1188.12, v1189.08), and a few real cuts are
missing from it (v506.52, v1188.36, v1510.08, v1521.0): check a 25 fps sheet around the time before
splitting or merging shots. Round 8: no camera.shot starts at a known false cut.

Cut-list corrections (round 10 video-match on all 11 spans, 25 fps frames; collected in round 11). `cuts.json` is
the frame-differencing list and is not edited; these are the readings a split / merge or a camera fixer must follow.
Times are video s (show = video − 0.036).

| span | real cuts missing from / moved in the list | list entries that are NOT camera cuts |
|---|---|---|
| 01 | v120.56 (the listed 120.50 is still the static aisle frame), v143.80, v151.68 (not 152.0), v163.12 (not 162.84), v165.36, v166.84 (not 166.52), v168.40 (not 168.24), v176.12 (not 175.80) | v131.40, v146.08, v152.00, v152.76, v153.40, v153.80, v154.32, v161.48, v161.96, v162.36, v162.84, v164.60, v165.04, v166.52, v200.40 (flashes and stutter frames) |
| 02 | v316.36 (not 316.24); the full list of real cuts is in research/video-timeline/02.md | v277.44, 279.04, 282.24, 283.84, 285.28, 288.48 (lantern flames), 307.36 (white hit), 326.92, 331.24, 334.56, 338.64, 340.36, 409.0, 413.52 (flashes / looks), and **v313.24, v314.08, v315.72, v336.32**: light changes inside one drone take (the lantern-crystal fits are continuous: v312.25 (6.6, 67.1, 244.5), v313.75 (7.0, 62.3, 244.8), v315.0 (7.5, 58.6, 247.4), v316.25 (6.8, 52.7, 243.3); v336.0 (7.1, 97.8, 247.9), v337.0 (6.8, 96.5, 245.8)) |
| 03 | v444.66 (not 444.7), v460.20, v495.90 (the black frames; not 496.16), v498.64, v517.52 (not 517.2), v520.45 | v496.16, v496.8 (lighting), v517.2 (look change) |
| 04 | v581.48 | v587.52–589.52 (LED gate), v591.28, v591.72 (whiteout) |
| 06 | v778.04, v789.92, v813.2, v826.04, v838.08, v858.28 | v802.32, v802.76 (looks inside the terrace shot v801.84–804.96), v832.64 (blinder) |
| 07 | v1015.04 (the listed v1014.8 is the blue → amber look change), v1051.16 (+ a zoom v1051.60–1051.80 in the same shot: `zoomAt`) | v1011.4–1014.32 (strobe), v1046.36, v1048.64 (warm flashes), v1056.24, v1056.76, v1057.4, v1058.44 (laser figures; the moon keeps its pixel), v1075.28 (comet flash) |
| 08 | v1110.36, v1188.36 (v1188.12 is a flash), **v1210.8** (drone → terrace wide), **v1211.44** and **v1211.8** (a 0.35 s dark telephoto between them), **v1312.9** (the red hit: a second, closer front-left drone with the same moon pixel) | v1188.12, v1189.08, v1216.04 (flash), v1223.28, **all 13 entries v1267.8–1274.84** (the lamp strings and the haze light strobe on every half beat: one telephoto to v1272.56, one close camera past a left pillar to v1275.32), v1282.76, v1284.12 (blinder hits) |
| 09 | v1324.16, v1346.08, v1370.88, v1373.80, v1376.88, v1380.16, v1408.00, v1414.20, v1417.28, v1423.32, v1426.44, v1432.84, v1435.96, v1438.96, v1441.92 (the detector misses most cuts in this dark span) | v1437.48 (the set flashes pink inside the telephoto) |
| 10 | v1451.24, v1460.52, v1485.34, v1510.08, v1513.12, v1521.0, v1553.8; v1551.3 is hidden in black | v1498.92, v1499.8, v1500.64, v1502.88 (flashes), v1508.48, v1509.8, v1510.44 (fire and looks), v1520.04, v1520.8 (inside the FPV v1518.28–1521.0) |

Black edits (round 11, digital black in the frame features, not a lighting blackout): v814.92–815.16 (a dip across
the cut to the pit shot), v1413.5–1414.2 (after the near-black v1411.1), v1543.6–1551.3, v1572.6 and v1579–1581 (the
end card). Author them with `fadeIn` / `fadeOut` / `blackIn` / `blackOut`.

Pose tables (round 10 fits; lantern crystals, arm-end lights, wing tips and the moon, 0.2–5 px rms). Positions in m,
lens tilt in degrees (+ up), vfov in degrees:

| video | camera | pose |
|---|---|---|
| v311–316, v327–330, v335–338, v341–347, v382–397 | the Sacred Oath drone: ONE drone hovering over the lake behind the terrace, x 6–7, z 233–248, at different heights | v311–316 descending 70 → 52 m (fits above, tilt −14.4 → −8.7); v327–330 rising 65 → 80 m; v335–338 ≈ 97 m; v341–347 descending 92 → 69 m; v382–397 descending 79 → 29 m while tilting up (fits at v384, 385, 390, 393, 396 in research/video-timeline/02.md) |
| v460.2–465.0 | high drone behind | (6.5, 62, 246), vfov 47 |
| v1188.36–1200.24 | one climbing drone | (−1.5, 52, 241) → (−4, 86, 245), tilt −10 → −22, vfov 55 → 43 |
| v1389.5 / 1398 / 1405 | the long drone shot v1380.16–1408.0 | (−27, 20, 215) vfov 31; (0.9, 23, 172) vfov 29; (25, 26.5, 175) vfov 29.5 |
| v1408.0, v1417.28, v1438.96 | drone behind on the axis | (1.7, 49.6, 252) vfov 53; (1.6, 74, 252) vfov 53; (2.4, 84, 246) vfov 54 |
| v1423.32 | far drone front-right | (87, 38, 214) → (87, 39, 229), vfov 27 |
| v1414.2, v1432.84 | terrace tripod | (0, 7, 168.86), tilt 9.3, vfov 45.8 |
| v1451.24 | drone behind on the axis, static | (1.8, 53.8, 255.5), tilt −2.9, vfov 53 |
| v1460.52–1472.9 | the terrace telephoto, static (NOT a zoom: the set fades in) | (−0.7, 6.7, 169.9), vfov 16.3 |
| v1472.96, v1513.12 | the aisle shots = the terrace tripod | (0.52, 7, 168.86), tilt 10, vfov 45 |
| v1507.04–1510.04 | drone behind | (−0.3, 66.7, 231.8), tilt −11.5 → −14.5, vfov 52 |
| v1515.32 | high drone behind, nearly static | (0.9, 92.8, 232.8), tilt −24, vfov 53 |
| v1521.0–1535 | high drone behind, descending and pulling back | v1521.5 (1.3, 101, 231) tilt −27; v1527 (1.1, 90, 234) tilt −20; v1534.5 (4.9, 71, 265) tilt −11; vfov 53 |

The v1515.32 and v1521–1535 fits lose 0.03–0.10 per moment with today's finale fountains (far smaller than filmed), so
the show keeps the older closer framings there; apply the fits once the pyro group's fountains land.

Pose fitting (round 8): the official edit's ground camera is mostly one tripod on the photo terrace, at
about (0, 5–6, 170–172) with the lens 7–11° up and a vertical fov of 36–43° ("terrace ground", the
Discorecord "AISLE" shots and the jump cuts of v793.7–805 are all this tripod; authored at y 7 so it stands
above the rail). Its telephoto is (−0.7, 6.7, 169.9) aimed at (0.96, 17, −11.6), fov 16.3: the lanterns sit
at x 0.10/0.89 and 0.20/0.79 (v10.5, v280.7, v337.9, v508.3, v1435.96). Fit a pose from what the video
shows rather than by eye: the lantern crystals (x ±20, z 36/69/102/135, glow ≈ 10.8 m), the arm-end lights
(±94, 12.5, 58), the Ferris wheel hub (86.5, 18.5, 187.5) and the moon (site.ts EPHEM, which the fits
confirm to within 0.005 of the frame) pin position, aim and lens in a least-squares fit.

Pose fitting (round 9): the terrace tripod is ONE camera that pans, tilts and zooms. Free fits of 45 exact frames
(v87 … v1249, crystal centres = world y 11.2, i.e. the midpoint of the top and bottom apex, plus the moon) all land at
(−0.3, 5.25, 171.2) ± 0.3 m with 2 px rms; only the tilt (6.8–11°) and the lens (fov 36–45°) change, often inside a
shot (slow zooms: v86.8, v290–305, v316–321, v330–335, v415–418, v470–483, v822–826, v838–844). In our world a lens at
5.25 m, 4.9 m behind the front rail films the balustrade, and the terrace rule's lift (≈ 1.9 m, aim kept) drops the
near lantern pair ~20 px. So the shots are authored from one joint fit with the height fixed at 7 (rail clear): the
tripod at (0.52, 7, 168.86) for every frame, yaw ≈ −1.25°, per-shot pitch and fov, 6 px rms (the near pair ~8 px low,
the moon ~7 px high); a zoom is `fov` → `fovTo` with `look` → `lookTo`. Weighting the fit towards the moon and the far
rows (stage matched, near pair 12 px low) scored the same (0.679 vs 0.680 over 101 frames). Its telephoto
(v733.0–736.0 too) sits at (−0.7, 6.7, 169.9), fov 15.5–16.3. A per-shot near plane (≈ 5 m) for the show camera
would let the fitted 5.25 m pose film over its own rail (contract request to the CameraRig owner, round 9).

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

## Crowd and performers (round 12, engine behaviour, no cue change needed)

Group `src/crowd`. Everything stays a pure function of show time.

* Mood cues and the overlay channels: a `crowd.mood` preset still sets every motion share (a sway cue calms a
  jumping crowd), but the overlay shares (phones / flashlights, lighters, looking up) only when the preset names
  them (the lighters and sit presets). Until round 11 every mood cue drove phones and lighters to 0 and wiped out the
  built-in Tribe timeline (design-bible §9.4: Winter 35 % phones, In The Cold 35 %): phones were up in 248 of 1581 s
  (mean share 0.044), now in every second (mean 0.24; lighters 238 s).
* Phones also follow the sky: at least 10 % of the Tribe films at any time (not while it sits for the piano), 35 %
  while fireworks burst: from 1.8 s before a fireworks cue's launch to 6 s after its end, faded in over 1.2 s and
  out over 2.5 s (the cue itself lasts only the launch window).
* Start views (Tribe mode): each start choice and the dragon view keep a 1.1 m ring, a ±32° lane to 2.6 m (to the
  barrier for the front spot), 80 % of the people to 4.2 m, the shorter people (heads under the 1.68 m eye line) in
  the forward view to 9 m, and pit-like priority within 18 m when a preset thins the crowd. The piano riser's own
  viewpoint keeps a narrow lane to the riser only (its 6 m cone used to empty the view from the middle of the field).
  Measured at 45,000 people, forward ±60°: 'crowd' 3.3–4.0 p/m² from 3 m (was 0 to 6 m), 'middle' 2.0–2.2 p/m²
  at 4–9 m (was 0.5 at 6–9 m).
* Barrier: the crowd's front edge is the built barrier (stage/layout.ts `L.barrierZ` / `L.barrierX`): the front
  row stands on the footplate from Z 3.45 across |X| ≤ 90.5, nobody in the photo pit or in the arms' service lane
  (X ±90 to the rampart, Z 2.5–60). The pit security (Tribe mode) stands inside the pit at Z 1.9.
* Near-lens fade: the crowd dissolves only inside 0.5–0.74 m of the lens and the player / low-camera push keeps
  everyone at ≥ 0.8 / 0.75 m, so the ring of bodies around the viewer is solid (no screen-door stipple); the
  performers keep the 0.9–1.3 m band.
* The MC (v348–502) holds the mic at his mouth in his right hand the whole time (the mic is authored for that arm
  pose); his left arm goes overhead only on the raise v409.2–412.3 and in the jump-mood windows from v415.3, and
  otherwise points / thumbs up at the crowd at chest to shoulder height. Wardrobe: dark navy shirt, black cap with a
  white brim, black shorts, white sneakers. His framing in the close-ups is the camera's (`camera.shot` `fov`).
* The fire troupe's lanterns (v646–740): flat square panels (0.19 × 0.2 m) hanging plumb from the fist on a bail,
  a warm-white HDR core fading to orange at a thin dark frame (above the bloom threshold), each lighting its bearer's
  hands, forearms and face (warm key, 1 / (1 + 10 d²)). Between the formations the bearers carry them in phrases: at
  the chest with a raise passing round the horseshoe (entry–668), swung at the shoulders (668–690.6, 716–),
  cradled together at the chest (690.6), arms spread (693.9), at head height alternating (696.6), at the waist
  (702.6); the contortion, the kneel, the leap, the procession and the pyramid keep their poses.

## Validator

* Reads every `docs/show-format-ext/*.md`: `## <system>` tables in the show-format.md format extend
  the vocabulary (enumerations are merged). Every `sys.fx` mention documents that fx and the backticked
  names on its line. `EXT_ENUM['sys.fx.param']`: `a`, `b` lines extend the enumerations. Any other
  backticked name documents a param of the systems the file talks about.
* Anchor names with digits (`co2`) are valid targets. `pyro.bengal` (show-format.md extensions) is
  accepted.
* The camera structure-coverage warning allows 30 % of the frame when the centre sight line is clear
  (was 17 %). Storyboard exceptions f010, f060, f119, f129 and f130 are recorded (video-timeline evidence).
