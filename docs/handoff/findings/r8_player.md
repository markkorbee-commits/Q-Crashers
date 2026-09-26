# Round 8 — player: remove photo mode, then the Ferris wheel ride

User requests (26 Sep 2026, translated): "We still have the photo option. It is not needed and may go." and "Since you
already built the Ferris wheel: add the option to walk to it and get in. A nice little gimmick."
Two stages in ONE worktree, in this order (both touch CameraRig / UI / touch controls). Scouting with file:line
references was done on 27 Sep; lines may have shifted after round 7 (perception) — re-grep before editing.

## Stage A — remove photo mode (keep the "Photo terrace" spot)

Remove the 'photo' CAMERA MODE and everything that only serves it:
- `src/ui/PhotoPanel.ts` (whole panel, HD/QHD/4K capture, downloadBlob, IS_ARTIFACT preview branch, storage key
  `dq26.photoRes`).
- `src/camera/CameraRig.ts`: 'photo' in `CameraMode`/`CAMERA_MODES`, `PHOTO_FOV`, the Digit/Numpad tables and the
  `for i<6` loop (becomes 5 modes), `GLIDE`, the `photo = {fov, roll}` state, raycaster/`hits`/`focusTargets`/`tmpV`
  (autoFocus only; keep `STAGE_FOCUS`, used by updateAvatar), the photo API (setFov, setRoll, setFocus, focusDistance,
  setAperture, setExposure, autoFocus), enter/exit photo (postfx.photo.enabled, 'photo:mode' emits, pendingFocus),
  the `case 'photo'` update branch, the hazeScale photo branch (→ 1), the photo branch of updateFree (Q/E roll, wheel
  zoom, F autofocus).
- `src/ui/contracts.ts`: 'photo' in `CamMode` and the `CAMERA_MODES` entry (key '6'), the photo methods of
  `CameraLike`.
- `src/ui/UI.ts`: PhotoPanel import, `LOCK_MODES`, `DIGIT_MODES.Digit6`, `PHOTO_KEYS`, the `photo` field,
  togglePhoto / enterPhotoUi / exitPhotoUi, the `photo.open` guards, F autofocus, KeyO/Digit6 pendingKey and KeyO toggle,
  the resume hint text, the per-frame photo.tick / roll fallback.
- `src/ui/Hud.ts`: `togglePhoto` action, `LABEL.photo`, the toolbar button 'Photo mode (O)', its toggleClass.
- `src/ui/Cards.ts`: camera views '1'–'6' → '1'–'5'; remove the "Photo mode" key group and `[['O'],'Photo mode']`.
- `src/ui/PerceptionUI.ts`: class `keep-photo` on the divider, `if (ui.photo.open) ui.togglePhoto(...)`.
- `src/ui/PiP.ts` OBSTACLES `.photo-panel` / `.shutter`; `src/mobile/TouchControls.ts` (photo → 'fly' mapping,
  comments); `src/mobile/touch.css` `#ui.photo ~ .tc .tc-back`; `src/ui/styles.css` photo rules (`#ui.photo .hud-el`,
  `.photo-panel`, `.photo-frame`, touch photo strip, `.shutter`, size selector, `.ph-time`).
- `src/core/EventBus.ts` `'photo:mode'` (no listeners); `src/core/types.ts` `PhotoParams`; stale comments in
  `src/core/App.ts`, `src/core/Input.ts`, `scripts/build-artifact.mjs`, `src/core/target.ts`.
- `src/postfx/PostFX.ts` + `src/postfx/shaders.ts`: `photo: PhotoParams`, DOF/bokeh (dof RT, mDof, tDof, uDof, SAMPLES,
  precompile entries, 'dof' debug stat, photoEx, bokeh pass, photo vignette/grain, uFeat.z, dofActive, cleanup),
  `capture()` (PhotoPanel only). KEEP the depth resolve and `depthAt`/`viewZ`/`uClip` for motion blur, and keep the
  perception work of round 7 intact.
- Docs/tools: CLAUDE.md URL params (`camera=…|photo`), tools/workflows/qa-judge.js (camera list, "modes 1-6 …
  photo mode panel").
KEEP (this is the viewing SPOT, not photo mode): `src/player/spots.ts` START_CHOICES 'photo' ("Photo terrace"),
`src/world/Grounds.ts` spot 'photo', `src/ui/menus.ts` AUDIENCE / SPOT_BLURB.photo, `Cards.ts` CHIP_ICON.photo, the
terrace geometry, the photographer crew, shared icons. `?camera=photo` then simply falls back (CAMERA_MODES check).
Verify: tsc; no console errors; keys 1-5 switch modes, 6 and O do nothing; HUD has no photo button; mobile UI; the Show
camera metric unchanged (similarity guard `--times 167,411.5,1243` equal within ±0.002); mobile budget PASS.

## Stage B — Ferris wheel ride

Geometry: `src/world/landmarks.ts` buildWheel; `FERRIS_WHEEL = {x:86.5, z:187.5, r:16}` (`src/world/site.ts`). The
frame is a static mesh 'ferris-frame'; rim + spokes + 16 gondolas are ONE merged mesh 'ferris-wheel' in `this.wheel`
(a Group at the hub, hub y ≈ 18.5 m, top ≈ 34.5 m). Wheel plane YZ, axle along X. The 48 rim bulbs are static entries
in the shared Landmarks Points buffer. `Landmarks.update(t, …)` already turns the turbine rotors from show time (called
from Grounds with ctx.showTime) — use it.
Tasks:
1. Rotation: split the gondolas out (an InstancedMesh or 16 small meshes, within the draw-call budget) and rotate
   rim/spokes slowly from SHOW TIME (deterministic; e.g. one turn per ~6-8 min), counter-rotating the gondolas so they
   hang, with a small pendulum sway. Rim bulbs: move them into the rotating part or a separate rotating Points object.
2. Access: the wheel is outside the playable bounds today: `Terrain.registerBounds` closes the field at z = 173
   (polyline [130,150]→[125,173]→[−120,173]); the visual Heras lake-front fence runs along z = 173.5 from x 51 to 125
   (no collider). Open a gate in both near the wheel, add a short walkway to a boarding platform at the wheel's foot
   (with colliders so you cannot walk into the lake or the sails of the PURPLE area at (101,196)).
3. Boarding: an Interactable at the platform (`app.addInteractable`, like the bars in src/bar/BarSystem.ts; label
   "Board the Ferris wheel", key E / touch interact button) puts the player in the next gondola at the bottom.
4. Riding: a "mounted" state in `src/player/PlayerController.ts` that bypasses walking, collision and gravity and sets
   `app.playerPos` to the seat each frame (Landmarks updates before Player and CameraRig in src/main.ts). Look around
   freely in first person (seat eye height); third person orbits the gondola (clamp the arm so it does not hit the
   gondola). Keep `controlsActive` so the prompt works; an Interactable that moves with the gondola offers "Get off"
   (E) at the bottom (or after one turn it stops at the bottom and lets you out automatically). Touch: the interact
   button boards/exits. Intoxicated players sway more in the gondola (use the perception motor sway).
5. Spot + menu: a "Ferris wheel" spot at the platform (Grounds spots, menus AUDIENCE/SPECIAL list with a short blurb,
   an arrival toast "Press E to board").
6. Audio: while riding, the music distance model uses the gondola position (AmbienceSystem already uses playerPos when
   on foot; verify it follows the seat, including height).
Rules: the Show camera is unaffected; deterministic wheel pose from show time; no per-frame allocations; mobile budget
(`node scripts/budget-check.mjs`) stays PASS; the walkable stage, bars and spots keep working.
Verify: screenshots of walking to the platform, the prompt, boarding, the view at the top towards the stage during the
show (e.g. t=415, t=1243), third person, exiting, mobile; `tsc`; no console errors; the Show-camera guard unchanged.

Files you own: src/camera/CameraRig.ts, src/player/**, src/ui/** (PhotoPanel, UI, Hud, Cards, contracts, PiP, menus,
PerceptionUI photo lines only, styles.css), src/mobile/**, src/core/EventBus.ts, src/core/types.ts (PhotoParams),
src/core/App.ts + src/core/Input.ts (comments), src/core/target.ts (comment), src/postfx/PostFX.ts, src/postfx/shaders.ts,
src/world/landmarks.ts, src/world/site.ts, src/world/Terrain.ts (bounds), src/world/structures.ts (gate/walkway),
src/world/Grounds.ts (spot), scripts/build-artifact.mjs (comment), tools/workflows/qa-judge.js, CLAUDE.md (URL params).
NOT: src/audio/**, src/fx/**, src/fireworks/**, src/stage/**, src/lasers/**, src/lighting/**, src/intoxication/**
(read-only), public/show/*.json.
