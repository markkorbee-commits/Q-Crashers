# Round 7, show group: look colours, cue requests and a timing audit on exact frames

All times are video seconds (`v`) unless marked as show time (`s` = v − 0.036). The reference frames are the exact
`f4` frames (since 27 Sep 2026). Per-frame evidence comes from `$ENDSHOW_DATA/features.npz` (25 fps luma, rgb,
12-bin hue, histogram distance) and the cut list.

## Discoveries that changed cues

* **v166.84–169.04: the edit flash-cuts a green and a purple view.** At 25 fps the frames alternate between a
  green-lit set and a purple/white-lit set every 2–3 frames (hue per frame: green 166.84–166.96, blue/violet
  167.00–167.04, green 167.08–167.12, violet 167.16–167.28, green 167.32–167.36, …; green centres at
  v166.90 + 0.218 k up to v168.86). The 1 fps sheets show only one of the two colours per sample (purple at
  v167.0–167.5, green at v167.75–168.5), which is why the old per-beat cues were mostly green. The set now flickers
  green / purple (`repeat` every 0.109 s from s166.804 until s169.044, `cycle` over the green and purple params) for
  the wash, the pillars, the LED content and the stage state; the dark aisle shot starts at the cut s169.044.
  167.0: 0.44 → 0.63.
* **v804.0–804.75 laser web: V fans, not standing trees.** Zoomed frames 3216–3218 show every figure with its bright
  source at the bottom and the fan opening upward (a V web with lattice crossings above it). The requested split
  into zigzag / `trees` / low zigzag drew Λ tents with glowing apexes at the top, which the film never shows; the
  single `zigzag` cue (height 8) matches the frames better and stays.
* **Violet / blue haze around the set.** Several wide and telephoto shots are purple or blue across the whole frame
  because the smoke around the set is lit, while ours had a black sky and dark air: 281–290.5 (violet-blue under the
  white fans), 337.9–341 (blue behind the terrace telephoto), 508.4–511 (the whole frame purple), 1046.9–1049.4
  (violet between the two warm flashes). Each got a low `lights.flood` (0.18–0.35). An all-area flood also lifts the
  dark ground, which costs the light score, so they stay low and short.
* **The eruption at v1508.4 ends with the cut at v1509.8.** Luma stays at 0.5 until v1509.68 and is 0.0 by
  v1509.96; the shot after the cut is dark purple. The wall cues now end at s1509.55 (firewall, arm-post flames,
  fireballs), the orange atmos glow ends at s1509.6 with a 0.15 s release, and the smoke burst is violet instead of
  orange. Our frames at v1510.0–1510.25 were orange before.
* **The last red eruption at v1565.4 is short.** Luma peaks at 0.5 from v1565.5 to 1566.2 and is back to 0.1 by
  v1567. The red atmos glow, the red flood and the red sky tint now end at s1566.3 (release 0.7), so the white
  fountain wall stands clear as tall white columns from v1566.3.
* **Warm flashes at v1046.4 and v1048.64.** Amber / red-orange haze with an exponential decay (peak v1046.4–1046.5,
  back to the base by v1047.3; the second peak at v1048.75, gone by v1049.0). There are no beams and no row of
  blinder lamps in the frame: the blinders and moving-head hits became short `lights.flood` cues with the decay as
  their release; the lamp strings stay lit to v1047.4.
* **v1437.72–1437.84 the pink set fades to the dark jaws** (not at v1437.65): the state / content cue moved from
  s1437.617 to s1437.68 with a 0.12 s fade. The lanterns go dark at v1437.8 and come back on in the drone shot at
  v1439.0 (a pillars `off` cue in between; ending the cue alone made them fall back to blue).
* **v263.2–264.4 the green wing-tip comets die out** before the cut to the dark far drone at v264.4: the repeat now
  ends at s263.4 (was s264.77). 264.75: 0.37 → 0.50.
* **L.P.A. garlands at v587.08** come on with the cut; the frames before it are unchanged, so the cue moved from
  s586.964 to s587.044.

## Look colours (checked against 1 fps sheets and the 64-moment metric)

| moment | before | change | after |
|---|---|---|---|
| 341.1–372 MC close-ups | red wash `#FF1830` | blue wash `#3048FF`: the video is blue-lit (red ornament screen behind him at 348) | 348.25 0.31 → 0.36, 351 0.21 → 0.34, 362.5 0.24 → 0.29 |
| 403–409 MC close-ups | red wash `#FF2040` | violet-blue `#5030FF` (a red key on the 403.4 close-up measured lower, 0.455 vs 0.478) | 404.5–408.5 +0.07 to +0.19 |
| 409–412 white veil | flood 1.3 | flood 0.5 | 409.5–412.1 +0.01 to +0.02 |
| 14–31 cathedral reveal | red wing outlines | `wingColor #4030B0`, `wingLed 0.45`: the wings are dark violet silhouettes | 20.25 0.55 → 0.57 |
| 645–681.9 fire ritual | red stage flood 0.8 | 0.2: walls and sky stay dark around the red set; 0.8 again from the cut at s681.844 (dense red smoke in the portal close-ups) | 656 0.39 → 0.43, 680.5 0.36 → 0.46, 705 unchanged |
| 1320–1323.5 crown | purple / orange wings | `crownColor` `#FF2040` / `#FF2030`, wing print 0.35 at 1322.3 | red wing outlines as filmed |
| 88.3 heart | closed rings (`curl` −120) | `curl` −190 + `arc` 270: open lobes meeting at the bottom | closer to v90–91 |
| 1435.9–1439 lime | lime wedges over the castle base | lime from the deck ends only (centre heads dark, both halves aimed out to the front sides) | 1438.5 0.51 → 0.52 |

Tested and dropped: a cyan deck `lowfog` at s357.7 (the deck air made 362.5 and 370 worse: 0.29 → 0.25, 0.43 →
0.39); `master` 0.3 at s409.2 (no change in the Show camera, which frames the portal, and the validator's silence
check wants ≤ 0.1).

## Timing audit

`$ENDSHOW_DATA/work/r7_show/audit.py` lists every group of non-snapped visual state cues (off the half-beat grid in
steady tracks, off the measured onsets in free tempo) whose strongest per-frame change (camera cuts excluded) lies
0.06–0.24 s after the cue (or clearly before it). 29 groups came up; most are ramps that our cue fades already reproduce (1010.88, 1014.76,
1043.88, 75.94) or section starts (114.48, audio-locked). Moved only where the frames prove it: 586.964 → 587.044,
1437.617 → 1437.68, 1508.36 flood attack 0.1 → 0.25 (the air lights up over v1508.36–1508.6).

## Measurement

Default 64 moments, Mac M4 Max GPU, `--settle 500 --min-frames 30`, pre-roll on: 64.7 % raw / 46.5 % calibrated
(colour 63.7, light 79.4, shape 53.9) → **66.2 % / 48.8 %** (colour 66.9, light 79.4, shape 54.0). Mean of the 10
worst moments 39.6 → 45.3 %. No moment dropped by 0.01 or more. `check-sync`: the steady tracks lost 7 hits (the
comet repeat ending at 263.4) and the free tempo 2 (the two `lights.hit` cues at 1046.335 / 1048.6 that became
floods); the percentages are unchanged. Mobile budget at 285 / 339 / 509.5 / 1047 / 1437: ≤ 99 draw calls (PASS).
