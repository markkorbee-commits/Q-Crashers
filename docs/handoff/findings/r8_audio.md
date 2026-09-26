# Round 8 — audio: sound arrives later with distance (343 m/s)

User request (26 Sep 2026, idea 2, approved): bangs of pyro/fireworks arrive later the further away you stand
(at FOH, 95 m, about 0.28 s).

## Facts from scouting (27 Sep; re-grep, lines may have moved after round 7)
- There are NO separate pyro/firework sound effects: the bangs are in the show recording itself. `AudioEngine.sfxGain`
  exists but nothing feeds it. Do not add synthetic bangs on top of the recording (they would double).
- Music graph (`src/audio/AudioEngine.ts`): musicIn → perception lowpass → wobbleDelay → distLowpass → rearShelf →
  M/S width → dirPan → distGain → musicGain → master → limiter. `setMusicDistance` already models level, air absorption
  and width from the distance; `AmbienceSystem.mix` computes that distance from STAGE_PA (0,14,−4) to the listener
  (on foot: playerPos + 1.7; other modes: camera position; showcam and flyover forced to 45 m).
- The ShowClock follows the audio: `MediaFileTrack.getTime` = el.currentTime − offset − engine.outputDelay(), so the
  visuals match what is heard. YouTube audio is not in Web Audio (no delay possible there).

## Task
Delay the MUSIC by distance/343 s for the listener, WITHOUT delaying the visuals:
- Add a DelayNode in the music chain (create it with a fixed max, e.g. 1.5 s; cap the delay there). Do NOT fold it
  into outputDelay(): the clock must stay at the stage emission time, so light is instant and sound lags.
- Only in the player's own modes (first / third / free / flyover-if-free-roaming); Show camera and flyover: 0 (the
  film's audio is synced to the picture).
- Smooth changes: walking changes the delay slowly (tiny pitch shift is physical and fine); a teleport or a mode
  switch must crossfade or ramp without an audible glitch (e.g. fade out, set, fade in over ~150 ms).
- AmbienceSystem.playVocal schedules crowd chants to be heard at show time: the Tribe sings with what it hears, so give
  the chants the same distance delay (CrowdBank already uses dist/343 for spatial one-shots).
- Delay towers: they are time-aligned to the main PA wavefront, so d/343 from the stage stays correct.
- The Ferris wheel (round 8 player group) moves the listener up to ~35 m high: the distance must use the 3D position.
Verify: measure the applied delay at spots front (≈ 0.02 s), crowd (≈ 0.1 s), middle (≈ 0.2 s), FOH (≈ 0.28 s), back
(≈ 0.6 s) via a debug readout; seek/teleport without clicks; the Show camera keeps 0 delay; `tsc`; no console errors;
visuals unchanged (similarity guard `--times 167,411.5,1243` equal within ±0.002).

Files you own: src/audio/**.
NOT: everything else (src/player, src/camera, src/ui are the player group's this round).
