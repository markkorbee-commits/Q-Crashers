# Show format extension: fireworks (round 2, look parity with the official video)

Extends the `fireworks` rows of `docs/show-format.md`. Every addition is optional: a cue that does
not use a new param renders exactly as the contract says, and unknown params are still ignored.
Engine: `src/fireworks/FireworkSystem.ts`, `src/fireworks/shells.ts`, `src/fireworks/starShader.ts`.

## Engine look (no cue change needed)

* **Comets** are fired fast and burn out while still climbing: `height` is the burnout height,
  reached after `0.5 + 0.013 × height` s (0.6–1.8 s; a 48 m comet leaves at ~60 m/s). The head is a
  small, very bright point with a short shutter streak behind it; the tail is thin, dim, softly wavy
  and dies ~0.3 s after the head, so volleys on the same path no longer add up to solid white bars.
  A little flitter (`glitter` 0.4) is on by default. White / silver stars stay white as they cool
  (only charcoal gold cools to orange).
* **Comet ends** that are shell types (`crackle`, `strobe`, `spider`, …) break small at the top:
  radius `clamp(0.16 × height, 3.5, 10)` m (was up to 22 m); `endSize` overrides it.
* **Pearls** (`end: pearl`) are small bright points that hang at the top for `pearlTime` s
  (default 1) — the rows of pearl heads of v429–465 (no more white blobs when comets line up).
* **Shells**: thin, dim tails behind small heads; `crackle`, `strobe`, `brocade` and `glitter` are
  sparse (fewer stars, crackle spread over 0.75 s, brocade/glitter shed twinkling flitter, small
  break flash): canopies read as sparkling bands, not solid peonies.
* **Lit launch smoke (round 5).** The smoke cloud at a comet / cake / mine launch point glows in
  the stars' colour while they climb out of it (comets: ~0.35 s + the stagger of the fan, growing
  with sqrt(comets per point), so a single comet hardly lights it; cakes and fountain mines: while
  they fire). The pink V-fans (v558) and comet rows stand in a cloud of their own colour.
* **Row lights (round 5).** Comet and cake rows light the smoke, haze and floor along the U: one line
  light per stretch of at most ~40 m of launch points (a gap of more than 24 m starts a new one),
  sharing the total light by point count, instead of one light derived from the flash at the
  centroid of the row (which lit the middle of the field). The total equals that derived light
  (0.3–0.36 x the flash peak). All firework lights (these and the lights derived from shell breaks)
  share one soft cap (2.7), so a barrage never lights the site like a flame wall.
* **Serpent trails (round 5).** `serpent: true` comets leave, by default, a wriggling trail (±1.3 m
  sideways) along their climb that glows in the comet colour for ~2 s and hangs ~4 s (v460.2–462.5:
  the white serpent rows stand as wriggling lines from the ground to their pearls). `smoke: false`
  turns it off.

* **Round 6.**
  * The launch cloud of a comet / cake / mine is lit in the stars' colour only until the last shot
    has left (+0.4 s), and a shell's smoke only while its stars burn: smoke is never lit by fireworks
    that are already out (`Emitter.litUntil`, see pyro.md).
  * The LightEnv flash of a comet or cake row is shared out over the row's stretches (like the row
    lights) instead of one flash at the centroid of the row, which for a U row sat in the empty
    field; the LightEnv then sees the true spread of the sources (see pyro.md, round 6).
  * Fans of more than 2 comets per point (`per` 3–12) stand in a denser launch cloud (up to 5 puffs
    per point) and light their smoke more (row light × sqrt(per / 2)); `per` ≤ 2 is unchanged. With
    `per: 6, glitter: 0.6, tailGain: 2.5` the pink V-fans of v550–559 read as dense fans in a pink
    lit cloud (measured on 552.25–558.75: +0.7 points on top of the cue change alone, 558.25 +1.4).

* **Round 7.**
  * Comet-top breaks (`end` a shell type: `crackle`, `spider`, `strobe`, …) burn out sooner than a
    shell: burn x r / 16 of the shell's burn time (at least x 0.35; r = the break radius, 3.5–10 m), the
    crackle spread with it. The red crackle tops of v333.9–336.2 are gone by v336.5–337 instead of
    popping on to ~338 (measured: 338 +2.2, 336.75 +1.7, 337.25 +1.0, 264.75 +2.4 points).
  * Crossette breaks have no glow ball (flash size 0.45 like the other textured shells): the
    crossette lines of v553.5 / v557.0 open as spiky star bursts, not as a row of white moons.
  * New comet param `glow` (below).

* **Round 8: Reduce flashing** (the viewer's photosensitivity option, App.reduceFlashing; no cue change).
  With it on, no large-area luminance change of 10 % or more repeats faster than 3 Hz (fx/core/flashSafety.ts);
  with it off every picture is bit-identical to before. The fireworks (and the pyro, which shares the fx
  engine) then:
  * hold the average of a **strobe** instead of blinking it: the LightEnv flash of a strobe shell no longer
    pulses the whole site at 11-14 Hz, and each strobe star breathes gently (at most 2.5 Hz, its own phase)
    around the strobe's mean level; the 22 Hz star flicker, the 16 Hz glitter twinkle and the 26 Hz flitter
    blink slow to at most 2.5 Hz with a smaller swing (same mean);
  * **soften the onset of a break**: stars swell in over 0.12 s, the break flash ball comes in over 0.1 s at
    40 % of its peak and fades 2.5x slower (same light), and the LightEnv burst swells in over 0.12 s and
    decays over 0.3 s, so the shells of a salvo or finale merge into one swell of light instead of flashing
    one by one; flame-type flashes keep a shimmer below 10 % instead of their 24 Hz flicker;
  * keep the flash light at 40 % and the spatial pyro light at 60 % (as before).
  Measured (Show camera + a spectator eye at 45 m, 30 fps, windows 486-496 and 1265-1300 incl. the strobe
  mines of v490-494 and the strobe salvos / finale of v1285-1298): the visible flicker of the sky and the
  ground (tile luminance steps of 10 % at 11-12 per second) is gone; what remains there comes from the
  lighting strobes and the camera's stutter edit (lights.md / camera).

* **Round 11** (engine only; every new param defaults to the old behaviour, cue changes go through the round's cue
  patch). New params, all in the tables below: comet / cake / mine `pos`, `offset`, `between`; comet / cake `wriggle`
  (+ `wriggleHz`), `gerb`, `endBurn`, `popColor`; cake `jitter`; shell / salvo `life`; shell / salvo / finale / mine
  `popColor`; flare `halo`, `haloGain`, `smokeGlow`, `smokeSize`. One default change, mobile only: dense comet fans
  (4+ comets per emitter) shed half the tail flitter on the mobile preset, so the glitter curtain of v783-788 (~1,700
  comets) fits the star budget without thinning its comets (mobile, 786: 19.9k -> 12.6k star particles, the layer no
  longer drops to 75 %; the fireworks CPU stays at 0.05-0.07 ms per frame on desktop and mobile).
  * Launch points under the portal roof: the `dj_booth` anchor (0, 1.9, −7.5) sits inside the vault, so a comet /
    cake fired there is invisible. Since round 10 the deck-centre fans (415.42, 421.614, 437.097, 536.194, 536.581)
    fire from `deck_front` with `x: 0` (the deck lip in front of the booth, verified visible at v416 / v422 / v438 /
    v538.5); the one cue that still names `dj_booth` (1085.915) gives its own `x`/`y`/`z` above the crest. Use
    `target: deck_front, x: 0` (or `pos`) for anything that should rise from the booth.
  * The orange X-fans of v853-861.8 already fire from x ±58 with `cross` (two points per side, each fan tilted
    towards the other, so the fans cross). Round-11 variants (narrower crossing, more comets, orange heads, taller)
    all measured 0.9-2.9 points lower on 853.5-861, so that cue stays as it is.
* Round 12 (final judges, no cue change needed):
  * White-hot heads: the young head of a white or gold star / comet turns near-white and gets a 3 × HDR core
    (light-neutral: the soft body gives up what the core gains), and a head far above the camera's white clips to
    white (the head only; tails keep their colour). Constants and details: `docs/show-format-ext/pyro.md`, "round 12".
    Metal-salt colours keep their hue, and colour-true crackle (`popColor`) keeps its authored colour with a weaker
    core (0.3, was 0.55): the S9 canopy (v536-545) crackles in its colour instead of turning white.
  * Point layer `fw-points`: crackle pops and shed glitter / flitter sparks are points (head and tail coincide), so
    they are drawn from their own layer with 2 triangles each instead of a full ribbon of (segments + 2) x 2. At the
    finale they are ~88 % of the star instances: ultra, spot=middle, t=1536 4.03 M -> 2.94 M triangles, t=270
    3.77 M -> 2.78 M (every moment of the judges' > 3 M list is now below 3 M); mobile t=268 791 k -> 668 k. The two
    layers have their own budgets (`budget.ts`: both 12 k on mobile, whose worst case stays below the old shared
    15 k ribbons). One more draw call (mobile overview 1536: 106 / 110).

## New params

### comet, cake and mine: launch positions
| param | meaning |
|---|---|
| `x` | number or list: absolute launch x. y/z come from the target point nearest in x unless `y` / `z` are given. E.g. `target: deck_front, x: [-46, 46]` = the deck line extended to ±46 m. |
| `y`, `z` | number or list: absolute launch height / depth (with `x`). `x: 0, y: 20, z: -18` = the castle crest behind the dragon head. |
| `mirror` | `true`: every `x` is also fired at `-x`. |
| `side` | `left` \| `right`: only the points with x < 0 / x > 0. |
| `absx` | `[min, max]`: only the points with min ≤ \|x\| ≤ max (e.g. the outer deck points). |
| `points` | list of indices into the points sorted left → right; negative counts from the right (`[0, -1]` = both outermost). |
| `pos` | round 11: list of absolute launch points `[[x, y, z], ...]` (a single `[x, y, z]` is one point). Replaces the target points, so a cue can fire from anywhere on the site, outside every anchor set; `mirror` adds the `-x` twins. The red crest streams of v66.3 stand at x ±125, z 20-55 on the bank beyond the arms (ground y 0.7 there): `pos: [[-125,0.7,20],[-125,0.7,37],[-125,0.7,55],[125,0.7,20],[125,0.7,37],[125,0.7,55]]`; as upright `fill: 6, angle: 12` bundles 70 m high on the 65.255 cake: 66.25 / 66.75 +2.6 / +2.3 points. |
| `offset` | round 11: `[dx, dy, dz]` added to every launch point after the filters above; `dx` points away from the centre line (mirrored per side), so `offset: [19, 0, 20]` moves both crest rows 19 m further out and 20 m towards the audience. |
| `between` | round 11: n (0-8) x the comets of a point rise from every gap between neighbouring points of the row (points in order along the U, a gap of more than 24 m splits the row): a denser comet wall along the U without new anchors. Comets without shell breaks (`end` none / pearl / pops, no `curl` / `cross`) rise from random spots along each gap out of one emitter per gap, with 1/sqrt(n + 1) of the tail flitter each (the comets overlap), so a dense wall stays within the emitter and star budgets; comets with shell breaks, cakes and mines get n evenly inserted launch points instead. Ignored on the mobile preset (its star budget is already full at v252.9). `between: 3, glitter: 0.9` (and `height` 58 / 54 on the arms) on the three green comet-wall cues of v252.9-255.3 (`front_comets`, `side_rampart`, `arm_posts`) builds the dense wall along the whole U including the arms: 253.5-254.75 +7.9 … +10.8 points (desktop medium at v254: 850 star emitters, 42k particles, within the budget). |

### comet
| param | meaning |
|---|---|
| `count` + `per` | both given: `count` picks the points evenly (like `count` alone), `per` fires that many comets from each. `wing_tips` with `count: 2, per: 6` = a 6-comet fan from each outer wing tip. |
| `angle` | may be negative: one comet per point leans inward (a Λ instead of a V). |
| `tilt` | deg: leans the whole fan / stream of each point outward (negative: inward). One cue with `per` + `stagger` + `tilt` is a leaning stream. |
| `cross` | m: X-fan. Every point becomes two launch points `cross` m apart; each fires its fan tilted towards the other by `crossAngle` (deg, default 22), so the fans cross. |
| `curl` | deg/s: the flight turns while it slows (+ = over the top towards the outside of the set, − = towards the centre). Hooks and rings. |
| `arc` | deg (round 6, with `curl`): the turn stops after this many degrees and the stars burn out there, so a stream draws an open lobe instead of a closed ring. The heart of v88.3–92.5: `curl: -190, arc: 270` (lobes of ~270° meeting at the bottom). Shell / `pops` ends break where the arc ends. |
| `end` | adds `pops` (alias `crackle_comet`): the head dies in a small cloud of crackle micro-flashes, no shell. Shell ends may also be `spider`, `glitter`, `swimmer`. |
| `endSize` | m: break radius of a shell end / the pops cloud. |

### comet and cake: look
| param | meaning |
|---|---|
| `glitter` | 0..1 (default 0.4): twinkling flitter sparks shed along the tail (silver glitter comets: 0.8–1). |
| `crackle` | `true`: crackling tail (delayed white micro-flashes behind the head). |
| `tail` | s: tail length (default: the last ~65 % of the climb). |
| `tailGain` | tail brightness multiplier (default 1; peacock / heavy glitter fans 2–3). |
| `tailColor` | colour: the tail's colour, the head keeps `color` (red heads with orange tails). `color2` is accepted as an alias. |
| `wave` | m/s: how much the tail drifts into waves (default 0.9, serpent 2.2). |
| `width` | head size multiplier (default 1). |
| `intensity` | brightness multiplier 0..3 (default 1). |
| `smoke` | `true`: a lingering smoke trail along the climb (puffs stay ~10 s). Default `true` for `serpent` comets (a wriggling, self-lit trail that hangs ~4 s), else `false`. |
| `pearlTime` | s the pearl head hangs on at the top (with `end: pearl`, default 1). |
| `glow` | comet only, 0..3 (round 7, default 0): a soft glow in the comet colour travels up with the comets of each fan (soft puffs on the comets' own paths, radius 0.1 x `height`, 1.5–6 m, dying with the heads). A dense fan seen from a distance becomes one glowing mass, as the camera records it: the pink V-fans of v557.9–559.3 (`glow: 1` on the 557.872 and 558.646 fans: 558.25 +1.2, 558.75 +3.2 points). The puffs are world-sized: meant for fans seen from afar (close up they read as soft balls), and not on by default (every per ≥ 3 fan glowing cost 557.75 −3.4 and 264.75 −3.2 points). |

| `wriggle` | round 11, m (0-6, default 0): the head wriggles sideways along its climb (the serpent helix with this amplitude, without the serpent's smoke trail and long tail), so a comet column draws a thin wavy line, as the white / red columns of v324.7-330 and v384.7-396.4 do. `wriggleHz` (rad/s, default 9) sets how fast. With `width: 0.8, wave: 1.4, wriggle: 0.7` the columns read as thin wavy lines instead of ruler-straight bars (measured neutral on the metric: 324.75-329.5 +0.23, 385-395.5 −0.05 points on average). |
| `gerb` | round 11, 0-3 (default 0): every comet climbs inside a sheaf of thin streaks in the tail colour (`tailColor`, else the comet colour): ~8 x `gerb` streaks around its path with a little angle and speed spread, each drawing the whole climb, so a column reads as a dense bundle of orange lines under the comet's own head or break. The orange columns with white glitter tops of v1426.6-1439: `gerb: 2.2, glitter: 0.3` on the `end: glitter` comet columns (1436-1438.5 +0.6 … +0.7 points). Scales with the quality preset. |
| `endBurn` | round 11, 0.2-3 (default 1): burn time of the comet-top breaks (`end` a shell type) and the `pops` ends, x this. `endBurn: 0.5` on the green crackle comets of 267.07 ends their crackle before the dark fade shot of v269.4-270.5 (270.5 +2.6, 269.5 +2.3 points) without moving their launches. |
| `popColor` | round 11 (alias `crackleColor`): colour-true crackle. The micro-flashes of `end: crackle` / `pops` breaks and of a `crackle` tail burn in this colour instead of white-hot (`"star"` or `true` = each comet's own colour). Also on shells, salvos, finales and crackle mines (below). Note: a hex colour is sRGB, so a light red-pink crackle is `#FFA090`, while `red` crackle is deep and dim (the shader dims saturated metal-salt colours). The red crackle canopy of v538-548: `popColor: "#FFA090"` on the 536.581 / 536.968 crackle cakes and on the 537.743 dome salvo (with `size: 34`): 543-548 +1.0 … +2.4 points; pure `red` pops scored 5-7 points lower at 543 / 544.5 (too dark next to the film's bright red-white crackle). |

### cake
| param | meaning |
|---|---|
| `fill` | n: every shot fires n comets across the whole `angle` at once (a steady peacock fan); shots are spread over `dur`. |
| `jitter` | round 11, 0-1 (default 0): every launch point starts at its own random phase of the shot interval, so a row of cakes does not fire in lock-step (the comet wall of v429.4-444.2 reads as one picket fence with every comet at the same height; `jitter: 1` breaks that up, measured neutral: +0.06). |
| `from`, `to` | deg from vertical, + = away from the centre line: one-way sweep across any range (may exceed ±90). |
| `tilt` | deg: leans the sweep outward (negative: inward). |
| `spray` | n: sparks per shot: a dense spark stream instead of single comets (gerb-like streams from a sweeping head). With `curl` the stream draws hooks, loops, the heart. |
| `type` | `crackle_comet` (or `end: pops`): comets with crackling ends and no shell break. |
| `curl`, `glitter`, `crackle`, `tail`, `tailGain`, `tailColor`, `wave`, `width`, `intensity`, `smoke` | as for comet. |

### mine
`x`, `y`, `z`, `mirror`, `side`, `absx`, `points`, `pos`, `offset`, `between` as above. `type: glitter` now sheds twinkling flitter.
`tail` (s, default 0.38) and `intensity` (0..3). **`dur` ≥ 0.5 s**: the mine keeps firing over dur
(a fountain / volcano); shorter cues stay one burst, so every existing mine is unchanged.
A `spread` of 70–85 with `count` 150–250 makes a dome; `spread` 25–35, `count` ~400, `dur` 1.6 is the
white glitter volcano behind the dragon head (v1087.5).

### shell, salvo, finale
| param | meaning |
|---|---|
| `type` | adds `spider` (fast straight legs that stop dead), `swimmer` (alias `fish`, `hummer`: ~5 red stars per shell that wriggle in loops for 3–4 s with short tails; use a salvo with `count` 12–15, `size` ~4, `rise: 0`), and `glitter` (already implemented, now documented in the validator request). |
| `liftColor` | colour of the rising lift trail (magenta lifts under green breaks). |
| salvo `depth` | m: random z spread of the launch line (default 6). |
| finale `x`, `z` | move the barrage band (default: behind the stage); with either set the roof positions are not used. |
| finale `depth` | m: spread the band over four rows in z (shells all around a field / FPV camera). |
| shell / salvo `life` | round 11, s: the stars' mean burn time (the type's own range is scaled to it; the burst radius stays). The red swimmers of v751.5-755.5 / v763.7-767.5 fade ~3.3 s after their break: `life: 2.8` on the 751.421 / 763.609 swimmer salvos (755.5 +1.3, 767.5 +0.8 points), `life: 2.6` on 850.234. |
| shell / salvo / finale `popColor` | round 11: colour-true crackle for `crackle` shells (the pops keep this colour instead of flashing white; `"star"` = the star colour; also for `type: crackle` mines). Takes precedence over `color2` as the crackle colour. |

## New fx: `flare` (airborne drone flares)
| param | meaning |
|---|---|
| `dur` | flight time (s). |
| `path` | list of `[x, y, z]` way points flown at constant speed, or `from` / `to`. |
| `count` | flares in the cluster (default 4), `spacing` m apart across the flight line (default 2.2). |
| `color` | default `red`. `size`, `intensity` multipliers. |
| `smoke` | default `true`: self-lit smoke left along the path. |
| `halo` | round 11, m per `size` (default 7.5): radius of the glow each flare has in its own smoke; 0 = no halo. The filmed flares of v43-64 are bright points with a modest red glow: `halo` 2.5-3.5. `haloGain` (default 1) scales its brightness. |
| `smokeGlow` | round 11 (default 1): how strongly the flare smoke is self-lit (x the default 6.5 x `intensity`); `smokeSize` (default 1) scales its clouds. The v43-56 flares leave no glowing pink sausage in the film: `halo: 2.0, smokeGlow: 0.15, smokeSize: 0.6` on the 50.7 cluster (51-54.5 +1.1 … +5.8 points, 55.5 −4.0), `halo: 2.5, smokeGlow: 0.2, smokeSize: 0.7` on 42.95 (47.5 +4.2, 44.75 −0.5). Not the default: on the 58.477 / 313.14 flares and at 44.75 / 313.75 (default 64) the same settings score 0.1-0.7 points lower. |

Each flare is a blinding point with a glow halo in its own smoke; the cluster lights the grounds in
its colour as it passes. Targets are ignored (use `target: "all"`).

Round 5: the smoke is a continuous trail along the flight path (not a row of round puffs), 13 m
clouds per `size` unit, self-lit in the flare colour (6.5 x `intensity`, ~3 s) and lingering 5–8 s;
the cluster pushes its own light (reach 30 + 8 x `size` m, following the flight in overlapping
chunks), so the smoke, the haze and the field around the flares turn red (v313.25–315, v43–64).
Mobile draws half the smoke puffs, 25 % larger.

## Appendix: proposed cue updates (verified side by side against the video)

Show times. `REMOVE` / `CHANGE` identify the existing cue by time and `sys.fx`; `CHANGE a -> b` gives the
full new `target` / `p` / `dur` (and `repeat` where it changes). Generated by the round-2 candidate script
(`scratchpad/fw2/mkcand.mjs`, output `scratchpad/fw2/cand.json`).

```
REMOVE 42.95 pyro.burst {"target":"left","p":{"type":"bengal","color":"#FF2418","size":1.5}}
REMOVE 44.96 pyro.burst {"target":"hang_glitter","p":{"type":"bengal","color":"#FF2418","size":1.7}}
REMOVE 45.935 pyro.burst {"target":"right","p":{"type":"bengal","color":"#FF2418","size":1.5}}
REMOVE 50.7 pyro.burst {"target":"hang_glitter","p":{"type":"bengal","color":"#FF2418","size":1.7}}
REMOVE 52.725 pyro.burst {"target":"left","p":{"type":"bengal","color":"#FF2418","size":1.5}}
REMOVE 58.477 pyro.burst {"target":"corner_fireballs","p":{"type":"bengal","color":"#FF2418","size":1.7}}
REMOVE 59.96 pyro.burst {"target":"hang_glitter","p":{"type":"bengal","color":"#FF2418","size":1.7}}
REMOVE 61.785 pyro.burst {"target":"corner_fireballs","p":{"type":"bengal","color":"#FF2418","size":1.7}}
ADD {"t":42.95,"dur":4.85,"sys":"fireworks","fx":"flare","target":"all","p":{"path":[[-120,30,20],[-40,34,0],[0,36,-6],[40,34,0],[120,30,20]],"count":2,"spacing":2.5,"color":"red"},"note":"v43.0-47.8 a pair of red flare drones flies left -> centre -> right"}
ADD {"t":50.7,"dur":5.1,"sys":"fireworks","fx":"flare","target":"all","p":{"path":[[0,34,-6],[-20,34,-4],[-60,26,10],[-70,12,40]],"count":4,"spacing":2.2,"color":"red"},"note":"v50.75-55.7 flare drones above the centre, to stage left, down into the left foreground"}
ADD {"t":58.477,"dur":5.3,"sys":"fireworks","fx":"flare","target":"all","p":{"path":[[-75,28,-4],[-10,32,-6],[-70,22,20],[-60,10,60]],"count":2,"spacing":2.2,"color":"red"},"note":"v58.5-63.7 flare drones left: outer side section -> centre -> out and down"}
ADD {"t":58.477,"dur":5.3,"sys":"fireworks","fx":"flare","target":"all","p":{"path":[[75,28,-4],[10,32,-6],[70,22,20],[60,10,60]],"count":2,"spacing":2.2,"color":"red"},"note":"v58.5-63.7 flare drones right (mirror)"}
REMOVE 313.333 pyro.burst {"target":"corner_fireballs","p":{"color":"red","size":1.6}}
REMOVE 313.72 pyro.burst {"target":"hang_glitter","p":{"color":"red","size":1.4}}
ADD {"t":313.2,"dur":1.6,"sys":"fireworks","fx":"flare","target":"all","p":{"path":[[-80,26,10],[-12,30,-4]],"count":3,"spacing":2.4,"color":"red"},"note":"v313.25 red flare drones over the left side section, gathering above the deck centre"}
ADD {"t":313.2,"dur":1.6,"sys":"fireworks","fx":"flare","target":"all","p":{"path":[[80,26,10],[12,30,-4]],"count":3,"spacing":2.4,"color":"red"},"note":"v313.25 red flare drones over the right side section, gathering above the deck centre"}
CHANGE 88.285 fireworks.comet: {"target":"hang_glitter","p":{"per":16,"stagger":0.25,"angle":50,"serpent":true,"height":32,"color":"#FFE0A0"},"dur":0.3} -> {"target":"hang_glitter","p":{"absx":[0,20],"shots":50,"spray":5,"angle":12,"tilt":80,"curl":-190,"height":52,"color":"#FFE0A0","glitter":0.5},"dur":4.3}
CHANGE 88.285 fireworks.comet: {"target":"deck_front","p":{"count":2,"angle":80,"height":45,"color":"#FFE8B0"},"dur":0.3} -> {"target":"deck_front","p":{"x":[-46,46],"shots":36,"spray":3,"angle":8,"tilt":40,"height":42,"color":"#FFE8B0","glitter":0.5},"dur":4.3}
CHANGE 218.92 fireworks.comet: + x 0, y 20, z -18 (crest), glitter 0.7
CHANGE 219.302 fireworks.comet: + x 0, y 20, z -18 (crest), glitter 0.7
CHANGE 219.684 fireworks.comet: + x 0, y 20, z -18 (crest), glitter 0.7
CHANGE 220.067 fireworks.comet: + x 0, y 20, z -18 (crest), glitter 0.7
CHANGE 220.449 fireworks.comet: + x 0, y 20, z -18 (crest), glitter 0.7
CHANGE 220.831 fireworks.comet: + x 0, y 20, z -18 (crest), glitter 0.7
CHANGE 221.213 fireworks.comet: + x 0, y 20, z -18 (crest), glitter 0.7
CHANGE 221.595 fireworks.comet: + x 0, y 20, z -18 (crest), glitter 0.7
CHANGE 221.98 fireworks.comet: {"target":"dragon_head","p":{"count":12,"angle":160,"color":"#FFEAE4","height":58,"stagger":0.04},"dur":0.3} -> {"target":"dragon_head","p":{"x":0,"y":20,"z":-18,"shots":25,"fill":24,"angle":170,"height":58,"color":"#FFEAE4","glitter":1,"tail":1,"tailGain":3},"dur":9.56}
CHANGE 255.61 fireworks.comet: {"target":"wing_tips","p":{"count":2,"angle":40,"color":"#50FF70","height":46,"end":"crackle"},"dur":0.3} -> {"target":"wing_tips","p":{"count":2,"angle":40,"color":"#50FF70","height":46,"end":"crackle","per":6,"tilt":20},"dur":0.3,"repeat":{"every":"halfbeat","until":264.77,"cycle":{"angle":[10,40,25,55,15,35,60,30],"color":["#50FF70","#E8FFE8","#FFC860","#50FF70"]}}}
CHANGE 429.36 fireworks.cake: {"target":["front_comets","side_front","arm_posts"],"p":{"shots":16,"angle":10,"height":46,"color":["#F0DCB0","#F4F0E8"]},"dur":14.71} -> {"target":["front_comets","side_front","arm_posts"],"p":{"shots":16,"angle":10,"height":46,"color":["#F0DCB0","#F4F0E8"],"end":"pearl","tailGain":2.5,"width":1.3},"dur":14.71}
CHANGE 444.839 fireworks.comet (serpent row): + end pearl
CHANGE 446.388 fireworks.comet (serpent row): + end pearl
CHANGE 451.033 fireworks.comet (serpent row): + end pearl
CHANGE 452.581 fireworks.comet (serpent row): + end pearl
CHANGE 457.226 fireworks.comet (serpent row): + end pearl
CHANGE 458.775 fireworks.comet (serpent row): + end pearl
CHANGE 463.42 fireworks.comet (serpent row): + end pearl
CHANGE 536.58 fireworks.cake: {"target":"dj_booth","p":{"shots":40,"type":"crackle","color":"red","angle":150,"height":42},"dur":12} -> {"target":"dj_booth","p":{"shots":40,"type":"crackle_comet","color":"red","angle":150,"height":42,"crackle":true},"dur":12}
CHANGE 536.97 fireworks.cake: {"target":"roof_comets","p":{"shots":22,"type":"crackle","color":["red","red","white"],"angle":70,"height":46},"dur":11.613} -> {"target":"roof_comets","p":{"shots":22,"type":"crackle_comet","color":["red","red","white"],"angle":70,"height":46,"crackle":true},"dur":11.613}
CHANGE 600.32 fireworks.comet: {"target":"pillars_top","p":{"color":"gold","height":20,"end":"pearl"},"dur":0.2} -> {"target":"pillars_top","p":{"color":"gold","height":24,"end":"spider","endSize":5,"smoke":true,"glitter":0.8},"dur":0.2}
CHANGE 602.08 fireworks.comet: {"target":"wing_tips","p":{"count":2,"color":"white","height":10,"end":"strobe"},"dur":0.2} -> {"target":"wing_tips","p":{"count":2,"color":"white","height":10,"end":"strobe","endSize":3,"smoke":true},"dur":0.2}
CHANGE 604.02 fireworks.comet: {"target":"wing_tips","p":{"count":2,"color":"white","height":10,"end":"strobe"},"dur":0.2} -> {"target":"wing_tips","p":{"count":2,"color":"white","height":10,"end":"strobe","endSize":3,"smoke":true},"dur":0.2}
CHANGE 606.14 fireworks.comet: {"target":"wing_tips","p":{"count":2,"color":"white","height":10,"end":"strobe"},"dur":0.2} -> {"target":"wing_tips","p":{"count":2,"color":"white","height":10,"end":"strobe","endSize":3,"smoke":true},"dur":0.2}
CHANGE 751.42 fireworks.salvo: {"target":"fireworks_back","p":{"type":"dahlia","count":6,"spread":150,"pattern":"arc","stagger":0.1,"color":"red","height":85,"size":18,"rise":0},"dur":0.5} -> {"target":"fireworks_back","p":{"type":"swimmer","count":14,"spread":150,"pattern":"arc","color":"red","height":85,"size":6,"rise":0,"stagger":0.05},"dur":0.5}
CHANGE 763.42 fireworks.salvo: {"target":"fireworks_back","p":{"type":"dahlia","count":6,"spread":150,"pattern":"arc","stagger":0.1,"color":"red","height":85,"size":18,"rise":0},"dur":0.5} -> {"target":"fireworks_back","p":{"type":"swimmer","count":14,"spread":150,"pattern":"arc","color":"red","height":85,"size":6,"rise":0,"stagger":0.05},"dur":0.5}
ADD {"t":744.464,"dur":0.3,"sys":"fireworks","fx":"comet","target":"crest_comets","p":{"side":"left","count":2,"per":3,"angle":8,"color":"#F0F0FF","height":70,"glitter":0.9},"note":"v744.5 silver glitter comets on the far left only"}
ADD {"t":749.164,"dur":0.3,"sys":"fireworks","fx":"comet","target":"crest_comets","p":{"side":"left","count":2,"per":3,"angle":8,"color":"#F0F0FF","height":70,"glitter":0.9},"note":"v749.2 silver glitter comets on the far left only"}
ADD {"t":749.964,"dur":0.3,"sys":"fireworks","fx":"comet","target":"crest_comets","p":{"side":"left","count":2,"per":3,"angle":8,"color":"#F0F0FF","height":70,"glitter":0.9},"note":"v750 silver glitter comets on the far left only"}
ADD {"t":753.464,"dur":0.3,"sys":"fireworks","fx":"comet","target":"crest_comets","p":{"side":"left","count":2,"per":3,"angle":8,"color":"#F0F0FF","height":70,"glitter":0.9},"note":"v753.5 silver glitter comets on the far left only"}
ADD {"t":759.264,"dur":0.3,"sys":"fireworks","fx":"comet","target":"crest_comets","p":{"side":"left","count":2,"per":3,"angle":8,"color":"#F0F0FF","height":70,"glitter":0.9},"note":"v759.3 silver glitter comets on the far left only"}
ADD {"t":761.264,"dur":0.3,"sys":"fireworks","fx":"comet","target":"crest_comets","p":{"side":"left","count":2,"per":3,"angle":8,"color":"#F0F0FF","height":70,"glitter":0.9},"note":"v761.3 silver glitter comets on the far left only"}
ADD {"t":765.664,"dur":0.3,"sys":"fireworks","fx":"comet","target":"crest_comets","p":{"side":"left","count":2,"per":3,"angle":8,"color":"#F0F0FF","height":70,"glitter":0.9},"note":"v765.7 silver glitter comets on the far left only"}
CHANGE 768.109 fireworks.comet: + glitter 0.9
CHANGE 772.046 fireworks.comet: + glitter 0.9
CHANGE 772.421 fireworks.comet: + glitter 0.9
CHANGE 775.796 fireworks.comet: + glitter 0.9
CHANGE 777.296 fireworks.comet: + glitter 0.9
CHANGE 777.671 fireworks.comet: + glitter 0.9
CHANGE 777.671 fireworks.comet: + glitter 0.9
CHANGE 782.546 fireworks.comet: + glitter 0.9
CHANGE 783.296 fireworks.cake: + glitter 0.9
CHANGE 784.421 fireworks.cake: + glitter 0.9
CHANGE 772.42 fireworks.comet: {"target":"corner_fireballs","p":{"count":2,"color":"#F0F0FF","height":75,"glitter":0.9},"dur":0.3} -> {"target":"corner_fireballs","p":{"count":1,"color":"#F0F0FF","height":75,"glitter":0.9,"side":"left","per":3,"angle":8},"dur":0.3,"repeat":{"every":"2beat","until":777.671}}
CHANGE 817.05 fireworks.comet: + glitter 0.8
CHANGE 818.55 fireworks.comet: + glitter 0.8
CHANGE 873.67 fireworks.comet: + glitter 0.8
CHANGE 825.67 fireworks.salvo: {"target":"fireworks_back","p":{"type":"dahlia","count":6,"spread":120,"pattern":"arc","stagger":0.05,"color":"red","height":70,"size":7,"rise":0},"dur":0.5} -> {"target":"fireworks_back","p":{"type":"swimmer","count":12,"spread":120,"pattern":"arc","stagger":0.05,"color":"red","height":70,"size":5,"rise":0},"dur":0.5}
CHANGE 838.05 fireworks.salvo: {"target":"fireworks_back","p":{"type":"dahlia","count":7,"spread":140,"pattern":"arc","stagger":0.04,"color":"red","height":55,"size":7,"rise":0},"dur":0.5} -> {"target":"fireworks_back","p":{"type":"swimmer","count":12,"spread":140,"pattern":"arc","stagger":0.04,"color":"red","height":55,"size":5,"rise":0},"dur":0.5}
CHANGE 850.23 fireworks.salvo: {"target":"fireworks_back","p":{"type":"dahlia","count":7,"spread":150,"pattern":"arc","stagger":0.04,"color":"red","height":60,"size":7,"rise":0},"dur":0.5} -> {"target":"fireworks_back","p":{"type":"swimmer","count":12,"spread":150,"pattern":"arc","stagger":0.04,"color":"red","height":60,"size":5,"rise":0},"dur":0.5}
CHANGE 853.05 fireworks.comet: {"target":"front_comets","p":{"count":2,"color":"#FF8A20","height":32,"angle":0},"dur":0.3} -> {"target":"side_rampart","p":{"x":[-58,58],"per":4,"angle":10,"cross":10,"crossAngle":24,"color":"#FF3010","tailColor":"#FF8A20","tailGain":3,"height":34,"glitter":0.3},"dur":0.3,"repeat":{"every":"halfbeat","until":861.859}}
ADD {"t":864.86,"dur":0.3,"sys":"fireworks","fx":"mine","target":"side_rampart","p":{"x":[-55,55],"count":220,"spread":75,"height":20,"color":"#F0F4FF","type":"glitter","tail":0.7,"intensity":1.4},"note":"v864.9 two white domes on the side sections"}
REMOVE 864.86 fireworks.comet x5 (replaced by the white dome mines)
ADD {"t":865.61,"dur":0.3,"sys":"fireworks","fx":"comet","target":"side_rampart","p":{"x":[-55,55],"per":9,"angle":110,"stagger":0,"color":"#FFF4E0","height":32},"note":"v865.61 white comet fans on the side sections"}
REMOVE 865.61 fireworks.comet x4 (replaced by one fan cue)
ADD {"t":865.98,"dur":0.3,"sys":"fireworks","fx":"comet","target":"side_rampart","p":{"x":[-55,55],"per":9,"angle":110,"stagger":0,"color":"#FFF4E0","height":32},"note":"v865.98 white comet fans on the side sections"}
REMOVE 865.98 fireworks.comet x4 (replaced by one fan cue)
CHANGE 1087.3 fireworks.shell: {"p":{"type":"brocade","color":"#FFF0D8","height":40,"size":14,"rise":0,"x":0,"z":-6},"dur":0.2} -> {"target":"dragon_head","p":{"x":0,"y":20,"z":-18,"count":420,"spread":30,"height":30,"color":"white","type":"glitter","tail":1,"intensity":2},"dur":1.6}
ADD {"t":1294.7,"dur":0.5,"sys":"fireworks","fx":"salvo","target":"fireworks_back","p":{"type":"crackle","color":"#E0D0FF","color2":"#FF80D0","count":8,"x":0,"z":70,"spread":90,"depth":50,"height":50,"pattern":"random","rise":0,"stagger":0.2},"note":"v1294.7-1296.5 FPV: crackle shells break around the drone over the field"}
ADD {"t":1296.2,"dur":0.5,"sys":"fireworks","fx":"salvo","target":"fireworks_back","p":{"type":"strobe","color":"white","count":5,"x":0,"z":55,"spread":70,"depth":40,"height":42,"pattern":"random","rise":0,"stagger":0.2},"note":"v1296.2-1298 FPV: strobes around the drone"}
CHANGE 1085.64 fireworks.comet: {"target":"side_rampart","p":{"count":16,"angle":100,"color":"#FFF0D8","height":35},"dur":0.3} -> {"target":"side_rampart","p":{"count":16,"angle":100,"color":"#FFF0D8","height":35,"glitter":1,"tailGain":3},"dur":0.3,"repeat":{"every":0.25,"count":11}}
CHANGE 1414.24 fireworks.salvo: {"p":{"type":"peony","count":4,"spread":230,"height":32,"size":3,"rise":0.5,"pattern":"random","color":["#40FF60","#40FF60","#E8FFE8"],"color2":"white"},"dur":0.3} -> {"p":{"type":"peony","count":4,"spread":230,"height":32,"size":3,"rise":0.5,"pattern":"random","color":["#40FF60","#40FF60","#E8FFE8"],"color2":"white","liftColor":"magenta"},"dur":0.3,"repeat":{"every":"beat","until":1426.435}}
```
