# Technical decisions

Classification: FACT / INFERENCE / ASSUMPTION / UNKNOWN (see research/uncertainties.md).

## 1. Rendering engine: Three.js r186 on WebGL2 (not WebGPU, not Babylon.js)

| Criterion | Three.js (WebGL2) | Three.js WebGPURenderer | Babylon.js |
|---|---|---|---|
| Mobile support (iOS Safari, Android Chrome) | universal WebGL2 | WebGPU only on recent Safari/Chrome; fallback path adds risk | universal |
| Custom shader freedom (analytic particles, beams, crowd) | full GLSL control | TSL node system, still moving | good but heavier abstraction |
| Bundle size | ~ 700 kB min | larger | ~ 2+ MB |
| Post-processing | own HDR pipeline (small, exact) | node post-processing | built-in pipeline |
| Dev speed / ecosystem | largest | medium | large |

Decision (INFERENCE from support matrices + requirements): **Three.js + WebGL2 with hand-written
GLSL** for every show effect. The whole show is custom shader work (instanced beams, analytic
particles, crowd vertex animation) where Three's thin abstraction wins; WebGL2 is the only API that
runs on every target device today. WebGPU would give compute shaders, but the chosen analytic
particle design (below) needs no compute.

## 2. Determinism: the show is a pure function of time

All show visuals are computed from `showTime` + the compiled cue list (`src/show/ShowEngine.ts`).
There is no per-frame accumulated show state. Consequences: PLAY / PAUSE / SEEK / RESTART / JUMP
produce identical frames for identical times; scrubbing the timeline is instantaneous.

## 3. Particles: analytic GPU particles (no simulation state)

Fireworks, flames, sparks and smoke are *closed-form* functions of (cue start time, seed, particle
index, now): ballistic motion with drag and gravity evaluated in the vertex shader. The CPU only
assigns currently-alive cues to instanced "slots". This is O(alive cues) on the CPU, fully
deterministic, and seek-safe. Particle counts scale with the quality preset.

## 4. Light: fake volumetrics + a light-environment bus instead of real lights

Hundreds of real-time lights are impossible on mobile. Moving-head beams and lasers are instanced
additive geometry with view-dependent haze shaders (brighter when looking along the beam, soft
edges, noise-modulated haze). The show writes a per-frame `LightEnv` (stage wash colour, flash
colour/position from pyro & fireworks, strobe level, audience wash) that the crowd, ground and set
materials read — cheap, convincing "global illumination" of the audience.

## 5. Crowd: GPU-animated instanced people with 3 LODs

Near: low-poly articulated body (~300 tris) animated in the vertex shader (bounce, jump, fist pump,
hands up, sway) with per-instance phase/variation. Mid: simplified mesh. Far: camera-facing
impostor quads. Reactions come from show sections + crowd cues + the kick envelope. Around the
player, people step aside (vertex push based on player position) so walking through the crowd
works without physics.

## 6. Audio / sync

`AudioTrack` abstraction: local file (`public/assets/audio/endshow-2026.*`, git-ignored), user
picked file, official YouTube embed (visible synced picture-in-picture — no media is copied), or a
synthesized rehearsal track. The `ShowClock` smooths coarse media clocks. The copyrighted Endshow
audio is never committed (FACT: YouTube blocks downloads from the build machine; the design makes
the audio a locally supplied asset as the brief requires).

## 7. Performance strategy

Quality presets (ultra/high/medium/mobile) + a runtime governor that first lowers the internal
render resolution and then steps the preset down based on *measured* median frame times.
Instancing everywhere, procedural textures generated at load (no multi-MB downloads).

## 8. Build & delivery

Vite 8 + TypeScript 7, relative base path so the `dist/` folder runs from any static host
(GitHub Pages, a claude.ai artifact, or `npm run preview`).
