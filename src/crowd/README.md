# Crowd module (`crowd`)

The Tribe that the 2026 Endshow never had, plus everyone who *was* on the grounds on 27 June 2026.

## Public API (`app.get('crowd') as CrowdSystem`)

| Member | Use |
|---|---|
| `populated: boolean` / `setPopulated(on)` | `true` = Tribe mode ("As it should have been"), `false` = the empty grounds "As filmed" (crowd hidden, crew shown) |
| `setCount(n)` / `targetCount` / `count` / `maxCount` | crowd size 0…65,000 (default 45,000). The headcount cap per preset is decoupled from the detailed-LOD budgets (extra people are far impostors): ultra 65k, high 45k, medium 26k, mobile 11k; rebuild is debounced (150 ms) |
| `densityAt(x, z)` | people per m² at a ground point (0 in "As filmed" mode); used by the player controller and ambience |
| `stats()` | total, hero, near, mid, far, crowdTris, lod, flags, performers, crew, mood, drawCalls, cpuMs, bucketMs … |

URL params: `crowd=<n>`, `filmed` (start in "As filmed" mode), `crowdenv[=rrggbb]` (stand-in light
environment for testing without the lighting system), `crowdslope` (analytic bank relief instead of
`terrain.heightAt`).

## Rendering (≤ 8 draw calls)

| Mesh | Content |
|---|---|
| hero | ~2.8k-tri smooth body (lofted torso, capsule limbs with domed joints, tapered forearms, mitten hands + thumb, shaped shoes, ears, hair-cap shell) for the nearest people |
| near | ~0.7k-tri smooth body (same construction, fewer segments) + optional slots: hair cap, cap, bucket hat, long hair, pony tail, bandana, flag cape |
| mid | ~110-tri lofted body (rounded head, 3-sided limbs), same skeleton, per-vertex lighting |
| far | camera-facing impostors from a procedural silhouette atlas (8 poses × 4 bodies, region + rim channels) |
| flags | pole + waving cloth attached to the carrier's hand; lowered away from and furled next to a viewer |
| phones | 7 × 15 cm screens showing a dim "video of the stage", flashlight LEDs from the stage side, lighter flames; energy-conserving sub-pixel dots, fogged |
| performers | MC, fire-ritual troupe (10 lantern bearers, lead on a pedestal, aerialist), pianist, DJ, crew, pit security (hero body; near body on mobile) |
| props | piano riser, white grand piano + light tube, pedestal, aerial strap, tripods |

Per-person data lives in three float textures (position/yaw, height/build/seed/zone, packed look).
The crowd is sorted into 8 m chunks; every 3rd frame (or when the camera jumps) chunks are frustum
tested and counting-sorted by distance. Everyone in chunks within `nearR` is ranked by distance
(128 bins): the nearest `heroN` within `heroR` → hero, the next `nearN` → near, the rest mid / far;
further chunks go to mid (≤ `midR`, `midN`) or far. That index list is the only per-instance CPU work.

| preset | hero | near | mid | headcount | worst-case crowd tris |
|---|---|---|---|---|---|
| ultra | 150 @ 8 m | 1000 @ 20 m | 4000 @ 70 m | 65k | ~1.8M |
| high | 100 @ 7 m | 500 @ 15 m | 2400 @ 55 m | 45k | ~1.09M |
| medium | 60 @ 6 m | 340 @ 12 m | 1600 @ 45 m | 26k | ~0.72M |
| mobile | 30 @ 5 m | 150 @ 10 m | 800 @ 36 m | 11k | ~0.33M |

Measured at t = 1515 s, spot `middle` (crowd triangles incl. phones + flags / whole frame):
ultra 1.61M / 3.18M, high 0.95M / 2.34M, medium 0.61M / 1.76M, mobile 0.28M / 0.92M
(before: high 1.88M / 3.22M with 28k people, mobile 1.04M frame with 6.5k people).

Lighting (shaders.ts `LIGHTING`): the rig, its strobes and blinders face the audience, so they only
reach surfaces facing the stage (max(N·L, 0), no wrap); backs get the dim sky and a directional haze
ambient (~8 % on back-facing normals) and — the main cue — a coloured rim at the silhouette edges.
The final crowd colour rolls off towards `uLumCap` (~1/3 of the lit set), so the Tribe reads as dark
rim-lit silhouettes at every drop instead of pale plaster.

## Behaviour

`choreo.ts` holds the Tribe-mode behaviour timeline authored from design-bible §9.4 and the
show-analysis crowd column (every drop, silence and chapter), modulated by the section kind/energy
and the tempo grid (no kick → no jumping), and overridden by `crowd` cues (`mood`, `cheer`, `flags`).
The output is 20 "shares" (jump, fist pumps, hands up, phones, hugs, losse polsjes, stomp, …); each
person takes part through a partition of unity over personal random numbers, so the crowd joins in
progressively and every pose blends. Motion is locked to `ctx.beat` with a per-person sound delay
and ~10 m coherent clusters. Everything is a pure function of show time (seek / pause safe).

## Layout decisions

Zone densities follow design-bible §9.2 (pit 4.5 → front-middle 3.0 → middle 2.2 → rear 1.5, banks
1.8, crests 0.8, back plaza 0.6 p/m² at full capacity). Below full capacity zones thin with priority
(the pit and the floor stay packed on low presets). The security pit (Z < 6), the 8.5 m plinths + 1.5 m
ring, the FOH and piano riser + 1.5 m ring, the arm ramparts, the tree belts and every registered
collider stay empty; ~4 m low-density lanes run along the tower rows (X ±20). The central aisle
between the pillars **is populated** (bible zone C "Middle (aisle)": most flags, hakken circles) —
the research never asks for an empty aisle. Bar queues form in front of every bar service point.
Flag carriers never stand within ~5 m of a named viewpoint or in the pit front centre (|X| < 8, Z < 14).

## Performer timing

Performers read their windows from the show file: `crowd` / `performer` cues with `p.who` = `mc` |
`troupe` | `lead` | `aerialist` | `strap` | `pedestal` | `pianist` | `tube` (`p.level` < 0.5 = the dim
state) | `dj`; the MC's hype gestures follow `crowd` / `mood` cues with `state: jump`. Choreography is
authored relative to each window's start. Without performer cues the 2026 Endshow defaults apply
(`PerfTiming` in performers.ts).
