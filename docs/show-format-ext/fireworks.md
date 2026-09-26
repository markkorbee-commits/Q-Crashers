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

### comet
| param | meaning |
|---|---|
| `count` + `per` | both given: `count` picks the points evenly (like `count` alone), `per` fires that many comets from each. `wing_tips` with `count: 2, per: 6` = a 6-comet fan from each outer wing tip. |
| `angle` | may be negative: one comet per point leans inward (a Λ instead of a V). |
| `tilt` | deg: leans the whole fan / stream of each point outward (negative: inward). One cue with `per` + `stagger` + `tilt` is a leaning stream. |
| `cross` | m: X-fan. Every point becomes two launch points `cross` m apart; each fires its fan tilted towards the other by `crossAngle` (deg, default 22), so the fans cross. |
| `curl` | deg/s: the flight turns while it slows (+ = over the top towards the outside of the set, − = towards the centre). Hooks and rings. |
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
| `smoke` | `true`: a lingering smoke trail along the climb (puffs stay ~10 s). |
| `pearlTime` | s the pearl head hangs on at the top (with `end: pearl`, default 1). |

### cake
| param | meaning |
|---|---|
| `fill` | n: every shot fires n comets across the whole `angle` at once (a steady peacock fan); shots are spread over `dur`. |
| `from`, `to` | deg from vertical, + = away from the centre line: one-way sweep across any range (may exceed ±90). |
| `tilt` | deg: leans the sweep outward (negative: inward). |
| `spray` | n: sparks per shot: a dense spark stream instead of single comets (gerb-like streams from a sweeping head). With `curl` the stream draws hooks, loops, the heart. |
| `type` | `crackle_comet` (or `end: pops`): comets with crackling ends and no shell break. |
| `curl`, `glitter`, `crackle`, `tail`, `tailGain`, `tailColor`, `wave`, `width`, `intensity`, `smoke` | as for comet. |

### mine
`x`, `y`, `z`, `mirror`, `side`, `absx`, `points` as above. `type: glitter` now sheds twinkling flitter.
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

## New fx: `flare` (airborne drone flares)
| param | meaning |
|---|---|
| `dur` | flight time (s). |
| `path` | list of `[x, y, z]` way points flown at constant speed, or `from` / `to`. |
| `count` | flares in the cluster (default 4), `spacing` m apart across the flight line (default 2.2). |
| `color` | default `red`. `size`, `intensity` multipliers. |
| `smoke` | default `true`: self-lit smoke left along the path. |

Each flare is a blinding point with a glow halo in its own smoke; the cluster lights the grounds in
its colour as it passes. Targets are ignored (use `target: "all"`).

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
