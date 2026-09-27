# Round 9 — show file: cue requests from round 8

Metric (scripts/similarity.mjs, Show camera vs official video, Mac GPU, exact-time frames, `--settle 500
--min-frames 30`, pre-roll on): round-9 baseline 68.1 % raw / 51.7 % calibrated (colour 68.8, light 81.0, shape 56.3),
per moment in `research/video-timeline/data/similarity-mac-r8b.json`. Requests below come from the round-8 fixers
(measured in the page; show times). In parallel a features workflow edits src/camera/CameraRig.ts, src/player/**,
src/ui/**, src/mobile/**, src/audio/**, src/postfx/PostFX.ts + shaders.ts, src/core/App.ts, Input.ts, types.ts,
EventBus.ts, target.ts and src/world/landmarks.ts, site.ts, Terrain.ts, structures.ts, Grounds.ts: never edit those.

- 1435.918 / 1437.467 lime deck-end looks: target ["deck_front","left","outer"] / ["deck_front","right","outer"] (the
  validator knows outer/ends now), and a dark look on ALL deck heads (target ["deck_front"], groups floor) at the same
  t on the line BEFORE the lime lines (at equal t the later line wins), in place of the 'center' dark look. The lime at
  the frame edges comes from where the beams point (aim), not from which heads are lit.
- 508.323 pillars repeat (cycle colour list): at show 509.21 the cycle gives blue (#3060FF) lanterns, the video shows
  orange-red crystals at 509.25: fix the cycle phase/order; consider shaftIntensity ≤ 0.5 over 502-520.
- Add `{"t":712.796,"dur":1.5,"sys":"atmos","fx":"glow","p":{"color":"#ff7424","amount":1.0,"fade":0.1,"out":0.5,"flicker":0.3,"smoke":0.25},"note":"v713.25-714.25 the air turns orange with wing burst 2"}` (713.5 27.3 → 40.9); NOT at 733.046.
- 797 lowfog: lighting tested density 0.9 / dur 6.5 with the new beam light on low fog: +0.5 on 799.5-803; compare
  with the committed 1.5 / 8 and keep the better.
- Optional (mixed results, judge yourself): retarget the 1510.434 gerb fan to one fan behind the head (target
  ["dragon_head"], pos [[-9,19,-17],[-4.5,21,-17.5],[0,22,-18],[4.5,21,-17.5],[9,19,-17]], angle 22, spread 26, height
  30, intensity 1.4): 1511.75 +0.1, 1520 +10.4, 1536.25 +1.3, 1512.5 −0.5, 1513 −3.5.
- Lasers: the 803.8-804.9 zigzag web in the video spans the whole U front (x ±85 m incl. the side sections); ours on
  deck_front ±35.6 covers ~35 % of the frame: try a wider target set for the zigzag and the 802.8-803.5 white fans.

## Verify / stop
Touched moments + holdouts, then the default 64 (`--out "$ENDSHOW_DATA/work/sim/r9_show_64"`); never commit a change
that lowers the 64-moment calibrated score (noise ~1 point). validate-show 0 errors / check-sync after show edits;
mobile budget PASS for engine changes.

Files you own: public/show/endshow-2026.json EXCEPT cues with sys "camera", scripts/check-sync.py, docs/show-format.md,
research/video-timeline/*.md (your notes). NOT: any src/**, camera cues.
