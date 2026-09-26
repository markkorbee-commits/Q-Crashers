# Round 8 — ui: photosensitivity gate at the start + compare mode with the official video

Runs AFTER the player group (it merges that branch first: UI.ts / Cards.ts / styles.css are shared).

## 1. Photosensitivity warning (user request 26 Sep, idea 5, approved)
Today: the Landing only has a text note ("…you can reduce them after entering", `src/ui/Landing.ts`); the
`flashingToggle()` (Cards.ts: warning + "Reduce flashing" + "Reduce motion") sits in onboarding AFTER the Start/Explore
buttons, in help and in the quality panel; `?autostart` skips Landing and onboarding entirely; there is no URL param to
force reduce flashing.
Task: a clear first-run warning BEFORE the show starts (Landing / first card): this experience contains flashing
lights, strobes and bright pyrotechnics that may trigger seizures in people with photosensitive epilepsy; two choices
("Reduce flashing" / "Continue with full effects") plus the reduce-motion switch; remember the choice
(`dq26.reduceFlashing`, already a pref) and do not ask again once answered (a small "Flashing: reduced/full" toggle
stays in help and quality). Add `?calm` / `?reduceflashing` URL params that force it on. `?autostart` must keep working
for the harnesses without a modal (autostart = the harness path; do not block it), but a normal visit must see the
warning first. Text in English like the rest of the UI; accessible (focus trap, Esc = the safe choice).

## 2. Compare mode with the official video (user request 26 Sep, idea 1, approved)
A side-by-side view: our render on one side, the official YouTube video (`meta.audio.youtubeId` = fLWY-Sxb1bE) on the
other, synced to show time. Nothing of the video is copied or stored: it is the YouTube embed.
Build on (scouted 27 Sep; re-grep): `src/audio/YouTubeTrack.ts` (IFrame API loader, controls:0, play/pause/seek/
getTime/setMuted, coarse clock), `src/ui/PiP.ts` (a draggable "Official broadcast" panel, min 208 px, docking),
`AudioSources.useYouTube` (YouTube as MASTER clock), `ShowClock` (no play/pause/seek events: poll `ctx.showTime`,
`ctx.showPlaying`, `ctx.seeked` via app.onFrame).
Design:
- Local audio stays the master (perception filters, distance delay); the YouTube player is a MUTED slave: follow
  play/pause, and re-seek only when |drift| > ~0.4 s (its clock is coarse; seeking while playing buffers). Apply the
  measured offset: show time = video − 0.036 s. Handle YT errors (101/150 embed blocked, ads, buffering) with a clear
  message and no crash.
- Layout: a real split (never overlay or obscure the YouTube player: YouTube's rules): the canvas resizes to its half
  (App.resize currently uses window size: make it container-based with a ResizeObserver; renderer size, camera aspect,
  postfx.setSize), vertical split on landscape, stacked on portrait/mobile; HUD elements stay usable.
- Entry: a menu item / key (e.g. V for "Video compare") and a close button; it works in every camera mode, best with
  the Show camera (suggest switching to it when opened).
- Gate with `!IS_ARTIFACT` like the existing YouTube source (the claude.ai artifact has no third-party iframes); in the
  artifact show a short note instead.
Verify: open/close compare in dev (`npm run dev`), play/pause/seek/restart keep the two in sync (log drift over 60 s,
< 0.5 s), mobile layout, no console errors, tsc; the Show-camera metric unchanged when compare is closed.

Files you own: src/ui/** (Landing, Cards, UI, menus, Hud, styles.css, new Compare*.ts, PiP), src/core/App.ts (resize),
src/audio/YouTubeTrack.ts (slave mode only), src/core/types.ts (only if a type is needed).
NOT: src/audio/** apart from YouTubeTrack.ts, src/player/**, src/camera/**, src/fx/**, src/fireworks/**, src/stage/**,
src/lasers/**, src/lighting/**, src/postfx/**, public/show/*.json.
