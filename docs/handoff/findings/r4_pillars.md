> Handoff note: round-4 brief as given to the fixer (lantern pillars + FOH/camera pen). Status at the handoff
> (merged or a WIP patch): docs/handoff/wip/STATUS.md. Paths: $ENDSHOW_DATA = the local data dir (see HANDOFF.md).

# Round 4 — lantern pillars + FOH/camera pen from the user's DAYTIME photos, mobile prop culling

References (VIEW FIRST; the user's own daytime photos, copy them into this folder): $ENDSHOW_DATA/refs/day/
day2_axis.jpg (ground level on the aisle: first pillar row left/right, the black pen on the aisle, second row fences at
the bottom corners), day3_aerial.jpg (drone: all pillar rows, fences, pen), day5_front.jpg, day1_front_left.jpg.
Night references: the video frames $ENDSHOW_DATA/f4/NNNNN.jpg
(index = round(video_s*4)); pillar close-ups e.g. 26-30 s, 1272-1276 s (look for them with a contact sheet:
python3 tools/video/sheet.py <out.jpg> <t0> <t1> <step> [cols]).
Current implementation: src/world/pillars.ts (header comment describes the old design from the night photo: bronze
lattice railing, cannon props, dark bronze hood...). The daytime photos are authoritative where they contradict it;
record the correction in research/design-bible.md (§5.10 + change log).

## What the daytime photos show (verify against the photos, then fix)
1. PILLARS: a slim WHITE / light-grey STONE shaft (painted stone blocks), with an ARCHED WINDOW NICHE low on the
   shaft (dark, round-topped), a black delay line-array hung on the shaft's upper part facing the crowd, and on top a
   SILVER / chrome FACETED CRYSTAL (diamond / double pyramid) lantern — no dark bronze hood. Check the capital and
   neck shape in day2/day3.
2. BASE: a SQUARE / rectangular BLACK crowd-barrier FENCE (Mojo-style barrier panels, ~1.1 m high) around each pillar
   base, several metres wide, with black equipment boxes inside. No bronze railing, no cannons (unless a photo shows them).
3. PEN: a long low BLACK barrier PEN (rectangle ~18-22 m x ~2 m, ~1.1 m high) on the aisle centre in front of the
   first pillar row (camera / FOH pen). Check its z position from day2 (camera ≈ (0, 1.7, 75) yaw 0) and day3.
   Make it a collider for the walk if the world has colliders for props.
4. NIGHT: keep every show function: the lantern (crystal) glows in the lamp colour from app.env.pillar* and
   pillarChase, the shaft LED/uplight look, halos, worldLights lantern positions (LANTERN_Y in site.ts — if the crystal
   height changes, keep LANTERN_Y consistent and check the show anchors pillars_top in src/data/layout.gen.ts are not
   broken; if they would move > 0.5 m, keep the old height instead). White stone must NOT make pillars glow at
   night: the video shows dark pillars with a bright crystal (check 1272-1276 s).
5. MOBILE: prop culling / LOD for small world props (fences, boxes, pen) on quality=mobile (distance cull or merged
   low-poly), keep draw calls low (merge into one or few meshes / instancing).

Method: render before/after with the dev-only ?daylight flag (src/stage/DevDaylight.ts exists — read how it is enabled)
from the photo poses (day2 ≈ cam=0,1.7,75,0,0.05; day3 ≈ drone high front-left looking at the stage), plus night
shots in the show (e.g. t=1272 camera=showcam, and t=600 cam=0,1.7,60,0,0.05). Budget: world triangles +10 % max.
Files you own: src/world/pillars.ts, src/world/props.ts, src/world/structures.ts, src/world/landmarks.ts,
src/world/site.ts, src/world/geom.ts, src/world/tex.ts, research/design-bible.md. NOT: src/world/worldLights.ts,
Terrain.ts, Grounds.ts, groundMaps.ts, Environment.ts (another agent is rebalancing the field light and paving),
src/stage/**, src/postfx/**, public/show/*.json.
