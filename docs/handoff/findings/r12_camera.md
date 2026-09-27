# Round 12 (final) — camera: judge findings to fix
Metric: default 64 moments 69.5 % raw / 53.8 % calibrated (research/video-timeline/data/similarity-mac-r12.json), exact-time
frames, Mac GPU. These findings come from the final independent judges (27 Sep 2026); evidence files are in
$ENDSHOW_DATA/work/ (paths relative to it). This is the LAST fix round: fix the blockers fully, then the majors in
order of visible impact; skip what needs a large redesign and say so. Use the pose-fitting recipe (core.md) and the MC facing / subject params from round 11.

## 1. [blocker] Gold laser chevron (S22): wrong camera angle and frozen for about 46 s (module camera, lens: ENDSHOW RECONSTRUCTION ACCURAC)
Video v1316–1374 is one long drone shot (the only cuts are at v1314.52 and v1373.8). From about v1324 a very high drone films from the audience-left rear: the stage with its violet side sections sits upper right, and the gold beams lie flat on the field on the left/centre. The pattern changes from a parallel hatch (v1326) to a V/X chevron (v1347.5–1365), and the drone slowly drifts. Ours (shots v1324.08 and v1346.15) is on the axis and symmetric: a flat gold X in the centre, framed by the red-dotted U. The frames at v1325, 1340, 1347.5, 1360 and 1365 are practically identical. The similarity score (1340.75 = 0.83) hides this because both frames are mostly black.
Evidence: work/compare/qa12_t8a.jpg rows 1–3 (v1325/1340/1360, f4 05300/05360/05440); work/compare/qa12_extraB.jpg rows 1–3 (v1326/1347.5/1365, f4 05304/05390/05460); video sheet work/sheets/qa12_chevron.jpg (v1316–1372, every 4 s)
Suggested fix: Re-fit the v1324.08 and v1346.15 camera.shot cues to the video: position about 60–80 m left of the axis and high behind the field, with a yaw that puts the stage upper right. Add slow drift with to/lookTo over each shot. Split the lasers.look into a parallel 'hatch' look (v1324–1346) followed by the chevron/V (v1347–1370), lying flat on the field (tilt about 0, ground plane). Check v1326, 1336, 1347.5, 1360 and 1370 side by side.

## 2. [major] MC close-up at v440.0–441.6 is filmed from behind (module camera, lens: ENDSHOW RECONSTRUCTION ACCURAC)
Video v440.0–441.6: close-up of E-Life from the front-left. His face and cap are lit saturated blue, and the gold comet wall shows as bokeh behind him. Ours, same shot (camera.shot subject 'mc', pos [-1.77, 0.3, 1.77], facing 'start'): the camera is behind and below the MC, looking up at the pink castle wall with his back to the lens. The comet wall is not visible.
Evidence: work/compare/qa12_extraA.jpg rows 1–2 (v440.25 f4 01761, v440.75 f4 01763); work/compare/qa12_t3b.jpg row 2 (v440.0 f4 01760)
Suggested fix: Make the subject-relative pose use the MC's audience-facing frame (+Z) rather than his walking heading at the shot start. Or make the MC face the camera during this shot. Re-check the other MC shots (v445.9, 452.0, 458.6) with the same facing mode.

## 3. [major] Fire-ritual close-ups frame the troupe at about a third of the video's size (module camera, lens: ENDSHOW RECONSTRUCTION ACCURAC)
v656 (0.47) and v680.5 (0.51), two of the three worst default moments, plus v650, v690, v705 and v725. In the video the camera is close and low on the dancers and the lead in front of the dark ribbed metal portal: performers fill 40–70 % of the frame height, with the castle stairs at the left. Ours sits further back or higher: the troupe is small in front of a flat stone wall with a gold-rimmed Gothic arch and swirl banners (v656). At v680.5 ours is cropped on the dragon head with no troupe visible.
Evidence: work/sim/qa12_worst_a.jpg rows 3–4 (v656 f4 02624, v680.5 f4 02722); qa12_worst_b.jpg row 5 (v705 f4 02820); work/compare/qa12_t5a.jpg (v650/690/709.25/725)
Suggested fix: Refit these camera.shot cues with subject 'troupe'/'lead' at 2–4 m distance, height 1.2–1.8 m and fov 40–50, so the performers fill the frame. For v680.5, pull back and lower so the dragon, the wings and the troupe beneath are all in frame.

## 4. [major] Pianist close-ups (938.9 / 966.9 / 972.3 s) show a grey slab and the top of a head: no keyboard, no face, no light tube (module performers, lens: Crowd, performers & immersion )
Video (v940, v968, v972.8): three-quarter view of the pianist's face, a black fringed or feathered jacket with bare arms, the keyboard diagonal from the lower left, and the glowing white LED tube with a metal end cap in the centre foreground, lighting the cream-white lid with highlights. Ours, with camera.shot pos (0.8, 2.5, 59.4) → look (−0.3, 1.4, 60.2): a flat, uniformly grey lid fills the lower right. The keys are hidden behind the case edge, and the pianist is seen from above (ponytail, gold-striped top). The light tube at z 58.75 is BEHIND the camera (z 59.4), so it is never in frame. A test pose (0.9, 2.3, 58.2, yaw 2.588, pitch −0.313, fov 50) already brings the face, the lid and a bright tube into frame (qa12_piano_pose.jpg), so the close-up is recoverable. The ~5 m scaffold tower under the piano (v932–962: the piano is on top of a truss tower; ours sits on a 0.6 m riser) remains a documented gap (research/video-timeline/07.md:94). It keeps the tower telephotos (944.5, 961.7) and the CO2 on the tower top (933) from matching.
Evidence: $ENDSHOW_DATA/work/compare/qa12_piano.jpg (933/940/962.5/968/972.8), qa12_piano_pose.jpg (the alternative pose), sheet $ENDSHOW_DATA/work/sheets/qa12_piano.jpg (930–966). Video frames f4/03732, 03760, 03850, 03872, 03891.
Suggested fix: Move the three pianist close-up shots to roughly pos (0.8, 2.3, 58.2) → look (−0.4, 1.5, 60.3), fov 45–50. Make the tube emissive in these windows (tubeHi-level brightness) so it blooms. Give the lid a lacquer response (roughness ~0.25, a specular hot spot from the tube) instead of flat grey. Pianist look: black fringed jacket, short hair, no ponytail or gold stripes. Longer term: put the riser on a ~5 m scaffold tower (the video's truss) and re-fit 932–975.

## Verify / stop
Touched moments side by side (vcompare / shot.mjs), then the default 64 (`--out "$ENDSHOW_DATA/work/sim/r12_camera_64"`):
never commit a change that lowers the 64-moment calibrated score (noise ~1 point). tsc, validate-show (show edits),
check-sync, no console errors, deterministic, no per-frame allocations, mobile budget PASS.

Files you own: cues with sys "camera" and "lasers" in public/show/endshow-2026.json, src/camera/ShowDirector.ts, docs/show-format-ext/core.md, research/video-timeline/*.md (camera notes).
NOT: everything else (6 other groups run in parallel on disjoint files).
