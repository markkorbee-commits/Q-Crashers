# Show format extension: the walkable stage, the gold vault and the DJ booth (round 3)

User request (the user knows the real stage): the DJ normally stands in the **gold scaled vault**
(the barrel-vault tunnel in front of the castle portal, under the dragon's chin) at a proper booth
with an extended media-player set; the **red podium** in front of it is where the dancers perform;
and the viewer should be able to walk up onto the stage and look out from there, "a chance you
never get as a visitor". Confirmed by the user: **no DJ performs in the Endshow**, the booth is set
up but empty (gear on, screens glowing).

Sources: the daytime drone photos (`refs/day/day3_aerial.jpg`, `day4_aerial_rider.jpg`: the gold
fish-scale barrel under the dragon's chin, the grey steps, the red deck levels), the axis photo
(`day2_axis.jpg`: the portal set in the porch screen, red riser boards, grey steps), the official
video 646–740 s and 12:19 (dark steel "turbine" rings with bolt heads and a toothed inner edge inside
the arch, a ring of spots in the crown, the troupe on the red floor in front, the castle stairs left
and right of the arch).

No new cue types. Everything below is geometry, data and engine behaviour; existing shows render as
before. All animation is a pure function of show time and the beat grid (seek-exact).

## Layout (metres, stage front Z 0, audience +Z, deck top 1.9) — `src/stage/booth/layout.ts`

| element | where | notes |
|---|---|---|
| Gold vault (interior) | Z −6.9 … −11.9 (screen back → facade), floor Y 2.7 | equilateral pointed rings, span 6.0 / apex 7.5 at the front, shrinking to 0.9× at the back (forced perspective); 5 rings at Z −7.3 … −11.1 |
| Vault roof (exterior) | round barrel ±3.5 m, eaves 4.6, crown 8.1, over the lowered porch mass | painted gold fish scales (≈0.6 × 0.67 m, rows offset), dark red-orange between them, gilt ridge with spikes; visible from the gallery / drone |
| Porch mass beside the vault | \|X\| 3.5 … 6.2, top 4.6 (was 8.3) | the old 3 m portal niche + desk at Z −7.5 are gone |
| Grey steps | X ±3.9, 3 risers Z −4.2 / −4.6 / −5.0, landing to the portal | from the podium (2.2) to the vault floor (2.7) |
| Dancers' podium | red top 2.2, black fascia; U around the lead's pedestal notch (\|X\| < 1.5, Z > −2.9), X ±5.6, Z −4.2 … −1.35; cheeks beside the steps back to the screen; side steps (2.05) | deck hardware standing on it (CO2 ±5, lasers ±3, floor heads, wedges ±4.75) is lifted to its top |
| DJ booth | desk X ±1.38, Z −10.35 … −9.45, top 3.75 (1.05 over the vault floor); DJ riser 0.1 m, Z −11.75 … −10.4 | lit front panel (gothic arch + flame tiles, amber/look-coloured edge strips) faces the field |
| Castle stairs | the flight now starts at \|X\| 7.1 (a deck-level foot inside the stair arch) and rises to the landing (5.5) at 11.6 | the way in through the arch; platform + gallery at 5.5 |
| Crew stairs | black scaffold units \|X\| 40 → 43.3, Z −2.65 … −1.25 | from the photo pit up to each corner plinth, handrails both sides |
| Barrier gates | front line Z 3: centre gate \|X\| < 1 (pit stairs), corner gates \|X\| 43.2 … 44.8 (crew stairs) | `barrierRuns()` in `stage/deck/Deck.ts` |

## The booth (`src/stage/booth/Booth.ts`, `boothAtlas.ts`, `VaultModule.ts`)

Four media players (0.33 × 0.45 m top: tilted 9" touch screen, 206 mm jog wheel with a centre
display, tempo fader, 8 hot-cue pads, play / cue), a 4-channel club mixer in the middle (knobs,
channel faders with level meters, crossfader, display), an effects unit, a laptop on a stand, booth
monitors on tripods at the riser's back corners, headphones, a gooseneck lamp, cables, a towel and
two water bottles. Generic plates only (no brand names, logos or wordmarks).

Glowing surfaces are one mesh with one 512 × 256 atlas (256 × 128 on mobile) and one shader:
- decks 1–2 "play": RGB waveforms (kick = orange, hats = blue) scroll beat-locked (4 beats across
  the lane, playhead in the middle), the jog ring marker turns 1.4 rad per beat, the active hot-cue
  pad flashes on the kick, the channel meters bounce with the kick;
- decks 3–4 are cued and paused (static waveform, play button blinking every 2 beats);
- the front panel pulses +18 % on the kick; its edge strips take the castle LED colour of the look.
Levels: the gear stays on through the whole show (a faint floor in true blackouts); the front panel
and the vault practicals follow the castle emit level (`emit × (1 − ember)`), so blackouts and the
`ember` look stay dark.

Vault lighting: the interior (skin, rings, floor, walls, booth bodies) has its own material = the
stage flood shading + 8 analytic practicals per fragment (5 warm crown bulbs, the gear glow, the
front panel, the deep portal glow in `look.portal`). LED strips on the ring faces follow the look
(first ring in the content colour, the deeper rings at the outline level). The rig's 7 arch-crown
downlights sit in black cans in the portal throat (`archSpotPositions()` = the rig's `archSpots`).

Cost: +2 draw calls on desktop presets (vault interior, booth screens), ≈ 5 k triangles for the
interior + booth and ≈ 6 k for the scale roof. Mobile: the interior joins the stage metal mesh (no
practicals) and the screens are drawn only within 35 m, so +0 calls from the field.

## Walking the stage (`src/world/stageWalk.ts`, `src/player/PlayerController.ts`)

The walk map is pure data: flat tops and ramps (stairs are ramps through the nosings, so the feet
height is continuous) plus walls with a vertical extent. The player:
- steps up to 0.45 m (podium, riser, side steps), eases down drops up to 0.5 m, falls (gravity +
  knee dip) off anything higher;
- treats any top more than a step above the feet as a wall (deck front, landing, stair sides);
- collides with height-aware walls: the castle facade, portal jambs, porch screen / side walls /
  mass, vault shell (per metre, at shoulder height) and back wall, booth desk, booth monitors,
  every deck-lip unit (flame heads incl. an 8 m flame column, gerbs, comets, lasers, CO2, pots,
  mines, lamps, wedges), the 40 floor moving heads, the photo-pit subs, handrails, the platform /
  gallery rails and an invisible 1.1 m rail along the deck lip and the plinth flanks except at the
  stairs; plus the stage's own `deck-*` colliders (skull cubes, wing tusks, PA truss towers).
Measured routes (probe: synthetic forward input at 30 Hz): field → centre gate → pit stairs (0.25 m
per step of travel) → deck 1.9 → podium 2.2 → grey steps → vault floor 2.7 → stops at the desk;
field → corner gate → crew stairs → plinth 1.9; deck → stair arch → flight → landing 5.5 → platform
→ gallery; landing → cheek 2.2 → side step 2.05 → deck. No step > 0.16 m per frame.

Third person: the walls flagged for the camera are registered as `deckw-cam-*` colliders (the rig's
spring arm stops at the vault shell, portal, screen, facade, desk); a frame hook clamps the lens
under the vault / portal roof. The rig's `platforms` (floor under the camera) are the flat tops
within reach of the feet while on the stage.

Performers stand on the stage floor (`stageFloorSmooth`): the troupe and the MC enter from the vault
and walk down the grey steps, the troupe's horseshoe stands on the podium, the aerialist starts from
the portal throat floor; the lead keeps her pedestal in the notch at deck level. The `dj` performer
(off unless a show adds `performer` who:`dj` windows) would stand behind the decks.

## Spots and UI

| id | label | position | view |
|---|---|---|---|
| `dj` | DJ booth | (0, 2.8, −10.95), eyes ≈ 1.78 m over the vault floor | out through the portal over the gear, the troupe, the pit and the field (pitch −0.17) |
| `dancers` | Dancers' podium | (−3.6, 2.2, −1.7), front edge left of the pedestal | over the crowd / the empty field |
| `castle` | Castle gallery | (−15.2, 5.5, −10.85) | between the skull cube and the porch, over the deck and the field |

Positions menu (T): a **Stage** group first (dj, dancers, castle, stage left, stage right).
Onboarding: **DJ booth** is the first start choice (remembered like the others). Arrival toast for
`dj`: "DJ-booth — zo ziet de DJ het veld". The old `dj_booth` spot ("Behind the decks" at Z −8.5) is
replaced by `dj`.

## Anchor changes

- `dj_booth`: (0, 3.75, −9.45), the front edge of the desk top in the vault (was (0, 2.2, −8.5)).
- `fixtures_floor`: the heads in front of the vault stand on the podium (Y 2.5); the two
  portal-side heads moved to the podium cheeks (±4.75, 2.5, −5.45).
- `deck_front`, `deck_gerbs`, `front_comets`, `laser_stage`, `co2`, `bengal`, `mines`: unchanged
  positions; units on the podium report its top (2.2) as their base.

## Not built

- A backstage route (behind the castle to the deck): the backstage compound is not modelled; the
  crew stairs at the corner plinths are the side route onto the deck.
- The lead's pedestal has no collider (it is only shown 640–735 s; props are the crowd module's).
