# Round 8 — reduce flashing: make every flicker source respect the setting

User request (26 Sep 2026, idea 5, approved): a photosensitivity warning at the start and a "reduce flashing" option.
The option exists (`App.reduceFlashing`, pref `dq26.reduceFlashing`, default ON with prefers-reduced-motion); this
group makes the ENGINE honour it everywhere. The onboarding warning/gate is done by the ui group after the player
group (UI.ts / Cards.ts are theirs this round).

## Already honouring the flag (scouted 27 Sep; re-grep after round 7)
LightingSystem (strobe bursts ≤ 3 Hz, kick strobes every 2nd beat, level ×0.4, blinders, floods, env flash ×0.4),
CueFxSystem env flash ×0.4, Environment/worldLights ×0.5, SceneGlare caps, the UI exposure limiter (UI.limitFlashes).

## Missing (fix all; target: with reduce flashing ON no full-screen or large-area luminance change of ≥ 10 % repeats
faster than 3 Hz, and no saturated red flashing)
- `src/fx/core/CueFxSystem.ts` flashAt strobe modulation (×1.6/×0.25 at `fs.strobe` Hz) is fed by strobe shells at
  11-14 Hz (`src/fireworks/shells.ts`, FireworkSystem strobe: 12); calm mode only scales it ×0.4 → cap the rate at
  ≤ 3 Hz or hold the average.
- `src/fireworks/starShader.ts` F_STROBE / F_FLICKER: add a calm uniform (steady or ≤ 3 Hz shimmer).
- Dragon crown garland 'strobe' pattern and rate (`src/stage/look/LookResolver.ts` → `src/stage/DragonCrown.ts`),
  kick-pumped LEDs and `pulse`, `eyes_flash`: limit to ≤ 3 Hz and lower depth when calm.
- `src/stage/materials/LedMaterial.ts` uStrobe (from env.strobe): check it is calm-limited.
- `src/lasers/**`: no flash/strobe handling at all → calm mode limits laser strobing/scan blinking to ≤ 3 Hz.
- Pyro/firework sprite brightness itself: check whether large bursts produce full-screen flashes; if so, soften the
  onset when calm.
Rules: with the flag OFF (default for the metric) nothing changes: the similarity guard (`--times
167,411.5,1243,1438.5,1536.25`) must be equal within ±0.002, and the default 64 must not change. Deterministic; no
per-frame allocations; mobile budget PASS.
Verify with the flag ON: log per-frame mean luminance of the Show camera and first-person view over 20 s at strobe-heavy
moments (e.g. 411-420, 1243-1250, 1389-1395, 1536-1545) and show that frame-to-frame luminance changes ≥ 10 % do not
repeat faster than 3 Hz; save the logs and a short report in $ENDSHOW_DATA/work/r8_flash/.

Files you own: src/fx/core/** EXCEPT placement.ts and FxLights.ts (the pyro group's this round), src/fireworks/**,
src/stage/look/LookResolver.ts, src/stage/DragonCrown.ts, src/stage/materials/LedMaterial.ts, src/lasers/**,
docs/show-format-ext/fireworks.md, docs/show-format-ext/lasers.md.
NOT: src/lighting/** (the lighting group's; it already honours the flag — gaps there go into contractRequests),
src/ui/**, src/player/**, src/camera/**, src/audio/**, src/postfx/**, src/world/**, src/core/**, public/show/*.json.
