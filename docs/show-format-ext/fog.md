# fog: round-11 extensions (low fog life and clear, smoke roll-out)

Additions to `docs/show-format.md` for the `fog` system (`src/fx/FogSystem.ts`). The older fog params (`glow`,
`density`, `life`, `rise`, `rate`, `lift` on `fog.burst`, `glow` / `glowColor` on `fog.level`) are documented in
`docs/show-format-ext/pyro.md`. Everything here is optional: a cue that does not use it behaves exactly as before.
All of it is a pure function of show time (seek / pause safe); the emitters are built once per cue, nothing is
allocated per frame.

## fog

| fx | params (new) |
|---|---|
| `lowfog` | `fadeIn` s (0.05–10, default 3): how fast the bank comes in from its cue time; `release` s (0.1–30, default 10): after the cue ends the bank thins out over it |
| `burst` | `roll` m (0–150, default 0 = the rising plume): a smoke roll-out over the deck and the field |

## `fog.lowfog`: a bank that is there only while the cue says so

A low fog bank is pre-warmed: its ring buffer of puffs started one puff life (13 s) before the cue, so the bank is
out, spread over its regions, at the cue time and only fades in.

* `fadeIn` (s, default 3): the time the bank takes to come in from its cue time. A short bank (1.5–2 s, the white
  field smoke of v602.25–603.75) needs ~0.3 s to be there in full while it lasts; the red finale bank (v1510.44:
  the site turns red at once) uses 0.3 too.
* `release` (s, default 10, round 9): the machines stop at the cue end and the whole bank thins out over this time
  (smoothstep). With the default a bank still shows half its density 5 s after its cue and is gone after 10 s,
  which is what the span notes read as "the particles linger ~13 s". Author the cue to END where the video's bank
  starts to go and give it a short `release`: `release: 1` = gone 1 s after the cue end, `release: 0.4` = a clear
  within half a second (a bank that must not survive a cut).
* The cue stays active for at least 10.5 s after its end whatever its `release` (LightingSystem finds the lit
  layer of the bank through the active cues). The beams' lit layer (`LightingSystem.writeLowFog`, 2.5 s in /
  10 s out), the deck air (`deckSmoke`, 2.5 s in / 8 s out) and the laser sea (6 s in / 3 s out before the end)
  have their own ramps and do not read `fadeIn` / `release` yet.

Example (from `$ENDSHOW_DATA/work/r11_fx/cue_patch.json`; measured neutral, the bank now ends where the video's does):

```json
{"t":1510.434,"dur":25.966,"sys":"fog","fx":"lowfog","p":{"area":"all","density":1,"color":"#FF0000","fadeIn":0.3,"release":1}}
```

Proposed, not applied yet (the patch file's `proposed` list): the white field smoke of v602.25–603.75,
`{"t":602.08,"dur":1.64,"sys":"fog","fx":"lowfog","p":{"area":"all","density":1.2,"color":"white","fadeIn":0.3,"release":0.4}}`.
In the video that smoke is lit by the kick beam fans and dark between the kicks; the bank's beam light comes from
`LightingSystem.writeLowFog`, whose 2.5 s in-ramp leaves a 1.6 s bank almost unlit by the beams, so today the bank
reads as a grey veil lit by the wash between the kicks (measured: kick frames +1.7 to +2.3, between-kick frames −3.4
and −3.6, 604.5–607 unchanged, net −0.2). It is meant for when the lighting honours `fadeIn` / `release`.

## `fog.burst` with `roll`: a smoke roll-out

`roll` (m) turns the cannons of a `fog.burst` into a smoke roll-out: instead of a plume rising from each target,
every group of targets that lie together (30 m) throws one wall of smoke forward (towards the field, +z), fanned
sideways (~60°) and a little upwards, over the deck and `roll` m out over the field. The cloud is big from its
first frames (puffs of 0.45–1 × (5 + 0.2 × roll) m, released within 0.12 s, faded in within ~0.15 s): half of its
reach is covered within ~0.25 s, the rest within ~1 s; its top stays at roughly 0.35 × its reach. It then hangs
and spreads over `life` s (default 6 for a roll-out, 70–100 % per puff; it fades over the last 45 %).

* `density` (0.2–4): opacity (0.34 × density per puff, capped 0.95). `color`: the smoke's albedo.
* `glow` (0–4): the wall is lit from inside in its `color` while the cue lasts (the flash that lights it) and goes
  dark ~0.15 s after the cue, whatever its decay (v1417.28: the drone shot after the flash has no glowing cloud);
  its light is a lit-smoke line light over the rolled-out wall (reach 8 + 0.35 × roll m, `haze` 1) that fills the
  haze field around it. Without `glow` the wall is lit by the show like all smoke (rig, flashes, pyro, lanterns).
* `lift` (m) raises the wall's origin over the targets. `size`, `rise` and `rate` do not apply to a roll-out.
* Lifetime: `dur` + `life` + 1 s.

Measured (Mac GPU, `scripts/similarity.mjs --settle 500 --min-frames 30`, cue patches applied in the page):

| cue | moment | before → after |
|---|---|---|
| 1416.757 `burst` deck_front: `roll` 60, `glow` 1.5, `density` 1.2, `color` `#FFE6D0` | 1417.0 / 1417.25 (terrace, flash) | 50.2 → 71.3 / 57.9 → 66.1 % |
| same | 1417.5 / 1418 (drone after the cut) | 84.6 → 84.2 / 84.6 → 84.2 % (noise) |
| 802.32 `burst` deck_front: `roll` 80, `density` 0.8, `life` 3.2 (new) | 802.75 / 803.25 (terrace montage) | 51.1 → 56.7 / 58.0 → 67.6 % |
| same | 802.25 / 804.5 / 805.5 / 806 | 79.9 → 79.9 / 64.6 → 65.4 / 66.6 → 66.4 / 70.0 → 70.0 % |

Tried and not kept: a whole-volume `fog.level` glow (`glow` 2.5, warm white) for the 1416.757 flash lit the haze
sprites around the set and the sky band as separate clouds (1417.0 +12.5, 1417.25 +10.8, but 1417.5 −4.4), and
with the roll-out together it was worse than the roll-out alone. A `glow` of 2 with `roll` 75 over-lit 1417.0.
