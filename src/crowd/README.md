# Crowd module (`crowd`)

The Tribe that the 2026 Endshow never had, plus everyone who *was* on the grounds on 27 June 2026.

## Public API (`app.get('crowd') as CrowdSystem`)

| Member | Use |
|---|---|
| `populated: boolean` / `setPopulated(on)` | `true` = Tribe mode ("As it should have been"), `false` = the empty grounds "As filmed" (crowd hidden, crew shown) |
| `setCount(n)` / `targetCount` / `count` | crowd size 0…65,000 (default 45,000), capped by `quality.crowdCount`; rebuild is debounced (150 ms) |
| `densityAt(x, z)` | people per m² at a ground point (0 in "As filmed" mode); used by the player controller and ambience |
| `stats()` | total, near, mid, far, flags, performers, crew, mood, drawCalls, cpuMs, bucketMs … |

URL params: `crowd=<n>`, `filmed` (start in "As filmed" mode), `crowdenv[=rrggbb]` (stand-in light
environment for testing without the lighting system), `crowdslope` (analytic bank relief instead of
`terrain.heightAt`).

## Rendering (≤ 7 draw calls)

| Mesh | Content |
|---|---|
| near | articulated low-poly body (392 tris + optional cap / bucket hat / long hair / pony tail / bandana / flag-cape slots), GPU-skinned per rigid segment |
| mid | ~80-tri prism body, same skeleton, per-vertex lighting |
| far | camera-facing impostors from a procedural silhouette atlas (8 poses × 4 bodies, region + rim channels) |
| flags | pole + waving cloth attached to the carrier's hand (same pose code), national + original tribe flags |
| phones | screens / flashlights / lighters as additive sprites in the hands |
| performers | MC, fire-ritual troupe (10 lantern bearers, lead on a pedestal, aerialist), pianist, DJ, crew, pit security |
| props | piano riser, white grand piano + light tube, pedestal, aerial strap, tripods |

Per-person data lives in three float textures (position/yaw, height/build/seed/zone, packed look).
The crowd is sorted into 8 m chunks; every 3rd frame (or when the camera jumps) chunks are frustum
tested, counting-sorted by distance and assigned to near (≤ 34 m, `quality.crowdNearCount`), mid
(≤ 82 m, 3 × near budget) or far. That index list is the only per-instance CPU work.

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
