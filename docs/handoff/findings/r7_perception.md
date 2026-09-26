# Round 7: Perception, stronger alcohol and XTC effects + ketamine (player view only)

## Goal

**User request (translated):** "Analyse the effects of XTC and alcohol once more. They may be shown quite a bit more exaggerated than now."

**What the analyses found.** Three analyses were done: model curves, render path, and live renders on the Mac GPU (`ANGLE Metal Renderer: Apple M4 Max`). They agree on the following:
- A still frame from the crowd reads as "sober with haze" below 1.2‰ and for most of the XTC timeline.
- Only 1.6–1.9‰ reads as drunk.
- Fast head turns go the other way: at 1.2‰ and above, and at the XTC crest, they already produce heavy smear.

**Target.** A player standing still at the stage must see and hear that they are:
- drunk, from about 0.8‰;
- on XTC, in each phase: onset nausea, crest and comedown.

**What must not change:** the Show camera, the education content, and the comfort and safety guards.

**Evidence.** All files are in `$ENDSHOW_DATA/work/perception/`:

| File | Content |
|---|---|
| `sheet-alcohol-t415.png`, `sheet-xtc-t415.png`, `sheet-front-t1243.png` | Contact sheets |
| `frames-look*.png` | Head-turn frames |
| `seq/*.png`, `seq/*-summary.json` | Per-frame parameter traces |
| `map/compute.out` | Dose → effect map |
| `map/risk.out` | Body temperature per scenario |
| `levels.mjs` | Effective values per BAC |
| `check/*.png`, `check-preview.mjs` | Show-camera check |
| `preview.js` | Preview helper (`pv`), see §3 |

## 0. Constraints (non-negotiable)

1. **The Show camera stays unaffected.** Today it is not isolated.
   - At 1.6‰ in `showcam` the post chain receives:
     - blur 0.25, tunnel 0.42, wobble 0.47;
     - doubleVision 0.03, which is refocus blur charged by the director's camera moves;
     - body offsets;
     - at the XTC crest, veil 1.09 and star 0.3.
   - Evidence: `check/bac160-showcam.png`. `node $ENDSHOW_DATA/work/perception/check-preview.mjs` prints `clean=false`.
   - The metric is safe today only because `scripts/similarity.mjs` runs sober.
   - After T1, perception applies in camera modes `first` and `third` only. The modes `showcam`, `flyover`, `free` and `photo` get:
     - identity post and body values;
     - `split` −1;
     - neutral perception audio.
   - The simulation keeps running: BAC, the XTC timeline, the risk model and the outcome cards.
2. **Sober means identity.** With sober params the composite must give the same image and the same pass count as today.
   - New uniforms default to identity.
   - New branches are skipped at identity (`if (x > 0.001)`).
   - No new pass runs all the time.
   - Tuning constants that move from literals into uniforms keep today's values for the `realistic` preset.
3. **Education and outcomes stay intact.** Do not change any of the following:
   - `ALCOHOL_TIERS`, and the effects, risks and help in `XTC_INFO`;
   - `OUTCOME_CARDS`, `OUTCOME_NOTES`, `OutcomeOverlay` and the epilogue;
   - the sit-down outcome (≥ 2.5‰, or 25 s at ≥ 2.0‰, `models.ts:82-86`) and the collapse (40 °C);
   - the heat and hyponatraemia notes;
   - the Widmark and absorption model (`models.ts:10-19`) and `RiskModel`;
   - the bar refusal rules (`BarSystem.ts:26-27,195-197`: 1.3‰ or 20 g, Alcoholwet).

   Only the mapping from state to visuals, audio and motor changes. Add one sentence saying that effects are exaggerated for visibility in the `strong` preset, in three places:
   - the XTC disclaimer (`education.ts:75-78`);
   - the replace at `PerceptionUI.ts:492`;
   - the alcohol panel note.

   No changes are needed in `src/bar/**`.
4. **Reduced motion.** Read it from `PerceptionSystem.reducedMotion` and `PlayerController.reduced`.
   - These go to 0: screen wobble, spins (T5a), look overshoot (T5c), nystagmus, jaw shake, kick zoom, the fast ghost drift, and roll.
   - As today, sway and lookJitter are multiplied by 0.25 and inputLag is 0.
   - The 1° roll cap in the PlayerController stays.
   - PerceptionSystem must also accept `?reducemotion` and `?comfort`. Today it reads only `?reducedmotion` (`PerceptionSystem.ts:242-243`), while the player reads `?reducemotion` and `?comfort` (`PlayerController.ts:215-217`).
5. **Photosensitivity.**
   - No full-screen luminance change of 10% or more may repeat faster than 3 Hz. No saturated red flash.
   - Kick pulses fire at most at 2.8 Hz:
     - on every kick up to 168 BPM, on every 2nd kick above that (uptempo);
     - with a refractory period of at least 0.34 s;
     - each adding at most +8% exposure.
   - The perception code never reads `app.reduceFlashing` today; add that. When it is on:
     - the kick exposure pulse is at most +2% and the kick bloom is ×0.25;
     - dazzle exposure is ×0.5 and the veil ×0.6;
     - jaw shake is off and nystagmus is ×0.5.
   - The heat periphery pulse keeps today's amplitude (periphery only).
6. **Deterministic and allocation-free.**
   - Every new effect is a pure function of the state, `ctx.time`, `dt` and the seeded `rand()` (`PerceptionSystem.ts:675-681`).
   - No `Math.random`.
   - No objects, arrays or Vectors created per frame. Copy identity values from module-level constants, not from `PostFX.defaults()` per frame.
   - No WebAudio node per beat.
7. **Mobile budget.**
   - No new full-resolution pass on mobile.
   - Motion blur stays off.
   - Glare stays at 2 axes × 6 taps.
   - New buffers are ¼ resolution on mobile.
   - `node scripts/budget-check.mjs` passes.
   - The mobile median frame time at 1.6‰ and at the XTC crest is at most the sober mobile time + 1 ms.

## 1. Measured current state

### How far a player gets

The bar refuses at ≥ 1.3‰ or > 20 g in the stomach, and serves one alcoholic drink at a time. BAC reached after 10 drinks:

| Pace | BAC |
|---|---|
| One drink per 5 min | 0.90‰ |
| One drink per 2 min | 1.41‰ |
| One drink per min | 1.59‰ |
| As fast as the bar allows | 1.67‰, then 23 min refused |

- One drink gives 0.11‰ and never reaches the 0.2‰ tier.
- 2.0‰ and above are reachable only through the preview buttons (`PerceptionUI.ts:413`) or `setBac`.
- So the heaviest look that is not an outcome must sit at about 1.6‰.

### Alcohol targets are low where players are

Values from `models.ts:41-79`:

| Param | 0.8‰ | 1.2‰ | 1.6‰ |
|---|---|---|---|
| blur | 0.08 | 0.15 | 0.22 |
| doubleVision | 0.06 | 0.32 | 0.52 |
| Share of time the ghost shows | 0% | 30% | 50% |
| chroma | 0.07 | 0.12 | 0.18 |
| wobble | 0.20 | 0.34 | 0.48 |
| tunnel | 0.16 | 0.28 | 0.42 |
| Corner darkening from tunnel | 14% | 25% | 37% |
| Music low-pass (Hz) | 11.9k | 6.9k | 3.8k |
| Pitch wow (cents) | 1 | 4 | 9 |

- Blur stays at or below the half-res softening level.
- Chroma shifts R and B by at most 1.4 px each at the corners (1280 px wide).

### Ceilings in the shader and camera code

- **Chroma:** ×0.018 (`shaders.ts:370`).
- **Wobble** (`shaders.ts:457-469`): swim 0.0035, rotation 0.014 + 0.008 rad, zoom 1.2%, all at 0.03–0.09 Hz.
- **Ghost:** offset 0.03·dv of the width; mix at most 0.48, reached at dv ≥ 0.4 (`:579-580`).
- **Camera:**
  - Roll is capped at 1° (`PlayerController.ts:32,647`).
  - Sway moves the eye ±7 cm and turns the head up to 0.7°.
  - Measured camera sway, peak to peak: 0.1° at 0.5‰, ≤ 0.48° at 1.2‰, ≤ 0.73° at 1.9‰.
- **Nystagmus:** at most 3 px.
- **Refocus blur:** only above about 86°/s (`smoothstep(0.9, 3.2 rad/s)`, `PerceptionSystem.ts:823-826`).
- **Smoothing:** τ 0.9 s for visuals and 0.6 s for motor (`:484-487`). This is fine; keep it.

### XTC

**Timeline** (real seconds, `models.ts:97-146`):

| Phase | Time | Intensity x |
|---|---|---|
| Onset | 0–40 s | 0 until 4.8 s, 0.40 at 20 s, 1.0 at 40 s |
| Plateau | 40–220 s | Crests of 1.0 at 40/90/140/190 s; troughs of 0.86 at 65/115/165/215 s |
| Comedown | 220–280 s | 0.50 at 247 s; `drained` rises 0 → 1 |
| After | 280–370 s | 0; `drained` falls 1 → 0.6 |

Nausea comes in waves every 11 s between 6 and 65 s, with peaks of 1.0 at 19.2 s and 30.2 s.

**Current effect strengths** (`PerceptionSystem.ts:995-1025, 928-940`):
- Saturation +12%, exposure +6% (+0.08 EV), kick pulse +3% exposure.
- Trails 0.5, a time constant of 24 ms. When turning they show as stepped duplicate copies, not tracers (`frames-lookmod-xtcPeak90.png`).
- Star gain 0.3: the streaks carry about 6% of the bright energy.
- Jaw shake 0.0011 of screen height (under 1 px); nystagmus 0.2°.

**The veil reads as fog.** The milky veil (0.24 idle, 1.1 under strobes) is the strongest XTC cue today, but it reads as "more fog". At `front t=1243` the XTC crest looks almost the same as sober (`pair-front1243-sober-vs-xtcpeak.png`).

**No audio.** XTC has no audio effect at all. The heart rate (up to 195 bpm, `models.ts:353`) is never audible.

**Comedown.** Saturation ×0.70, contrast ×0.92, exposure ×0.90. This is readable only side by side.

### Other points

- **The 2.0‰ preview shows a card.** `PerceptionUI.ts:604` opens the "You need to sit down" modal at once, so the 2.0‰ button shows the card, not the view (`05-bac200-t415.png`).
- **Unused hooks:**
  - `patternWarp` and `hueShift` are never set. Keep it that way ("MDMA is not a psychedelic", `:923-927`).
  - `u3.w` in `packParams` is a free slot (`PostFX.ts:949`).
  - The comment "FOV −15 % at 0.8‰" on `tunnel` (`models.ts:49`) is not implemented. Fix the comment.

## 2. Tasks

Priority order:
- **P0:** T1.
- **P1:** T2, T3, T4, T6, T7a–c.
- **P2:** T5, T7d–e, T8.

### T1 (P0): Show-camera gate in `PerceptionSystem`

- **Read the camera mode.** Duck-type it the way `PlayerController.ts:438` does: `this.cam ??= (app.get('camera') as { mode?: string } | undefined) ?? null`. Define `own = !cam || cam.mode === 'first' || cam.mode === 'third'`.
- **Keep the simulation and smoothing running** in every mode. When `!own`:
  - Pass `turn = 0` to `updateTransients`, so director moves do not charge refocus or double vision.
  - Replace `write()`, `applyTransients()` and `pulses()` with a copy of identity values into `postfx.perception` (with `split = -1`) and `postfx.body`, from module-level constants.
  - The motor may keep updating; the PlayerController does not drive the view in these modes.
  - On the throttled audio path, call `setPerception(0, 0)` and set a neutral mix (T5d).
- **Split and compare divider:**
  - While `!own`, `setCompare` and `setSplit` must not write `split`.
  - `PerceptionUI` hides the compare divider in those modes. It reads the mode with `ui.camMode()`.
- **Switching back** to `first` or `third` continues from the running smoothed state: no pop and no settle.
- **Toast.** Once per session, when the player enters `showcam` while the mode is not sober: "Perception effects pause in the Show camera — your body state keeps running."
- **Accept when:** `check-preview.mjs` prints `clean=true` for `bac160-showcam` and `xtc90-showcam`, and the similarity guard (§4) is unchanged.

### T2 (P1): Strength preset

- **API:** `PerceptionSystem.setStrength(s)` with `s` = `'strong'` or `'realistic'`. The default is `strong`.
  - Initialise it from `?pstrength=`.
  - Otherwise use localStorage `defqon.perceptionStrength` (read inside try/catch).
  - Otherwise use `strong`.
- **`realistic` must look exactly like today:**
  - Keep today's `ALCOHOL_FX` as `ALCOHOL_FX_REALISTIC`, and add `ALCOHOL_FX_STRONG`.
  - Put the XTC gains in a `XTC_GAINS[strength]` constant object.
- **Shader constants that change in T4 and T7** become uniforms set by the preset, one or two `vec4`, for example `uPerc`:
  - wobble amplitude and frequency scale;
  - chroma factor;
  - ghost x and y factors;
  - the two afterimage mix constants;
  - peripheral blur factor;
  - trail gain.

  This way switching the preset never recompiles.
- **UI (`PerceptionUI`):** a two-option control in the perception panel, "Effect strength: Realistic / Exaggerated", with Exaggerated as the default. When Exaggerated is active, show the note "Effects are exaggerated so you can see them."

### T3 (P1): Alcohol targets, `strong` preset

Each cell shows current → new. Params not listed stay unchanged: `exposure`, `balance`, `inputLag`, `speedScale`, `stumbleRate`, `gapRate`, `gapLength`.

**Visual targets**

| param | 0.2‰ | 0.5‰ | 0.8‰ | 1.0‰ | 1.2‰ | 1.6‰ | 2.0‰ | 3.0‰ |
|---|---|---|---|---|---|---|---|---|
| blur | 0 | .03→.06 | .08→.14 | .115→.19 | .15→.24 | .22→.34 | .30→.44 | .42→.55 |
| doubleVision (episode strength) | 0 | 0→.15 | .06→.30 | .18→.42 | .32→.55 | .52→.75 | .70→.90 | .90→1.0 |
| diplopiaDuty (share of time) | 0 | 0→.15 | 0→.30 | .15→.45 | .30→.60 | .50→.80 | .75→.95 | 1 |
| chroma (with the T4 factor) | 0 | .017→.10 | .07→.20 | .095→.26 | .12→.32 | .18→.45 | .24→.55 | .24→.60 |
| wobble (with the T4 constants) | .014→.08 | .10→.20 | .20→.38 | .27→.48 | .34→.58 | .48→.72 | .60→.85 | .75→1.0 |
| tunnel | 0 | .04→.10 | .16→.28 | .22→.36 | .28→.45 | .42→.60 | .58→.72 | .78→.85 |
| contrast | .96 | .91→.90 | .88→.86 | .865→.83 | .85→.80 | .81→.75 | .77→.70 | .77→.66 |
| saturation | 1 | 1 | 1→.97 | .975→.94 | .95→.91 | .90→.84 | .80→.74 | .68→.62 |
| motionBlur (small change; turning is already heavy) | 0 | .14→.22 | .26→.34 | .32→.40 | .38→.45 | .50→.55 | .62→.65 | .62→.65 |
| afterimage | 0 | 0 | .30→.40 | .35→.45 | .40→.52 | .50→.62 | .527→.66 | .56→.70 |
| lightSensitivity (halos only; no streaks for alcohol) | 0 | 0 | .10→.15 | .125→.19 | .15→.22 | .20→.30 | .227→.34 | .26→.38 |
| trails (persistence per 60 Hz frame, new T7a path) | 0 | 0 | 0→.50 | .214→.60 | .30→.70 | .375→.80 | .45→.85 | .45→.85 |
| nystagmus (°) | 0 | 0 | 0 | 0→.3 | .25→.8 | .45→1.2 | .60→1.5 | .60→1.5 |
| spins (°, new T5a) | 0 | 0 | 0 | 0→.5 | 0→1.5 | 0→3.0 | 0→4.5 | 0→4.5 |
| look overshoot, max (°, new T5c) | 0 | 0→.15 | 0→.4 | 0→.6 | 0→.8 | 0→1.3 | 0→1.8 | 0→1.8 |

**Motor targets**

| param | 0.2‰ | 0.5‰ | 0.8‰ | 1.0‰ | 1.2‰ | 1.6‰ | 2.0‰ | 3.0‰ |
|---|---|---|---|---|---|---|---|---|
| sway | .05→.10 | .15→.25 | .30→.45 | .40→.55 | .50→.65 | .70→.85 | .88→1.0 | 1 |
| lookJitter | 0 | .06→.10 | .14→.22 | .195→.30 | .25→.38 | .38→.55 | .50→.70 | .50→.70 |

**Audio targets**

| param | 0.2‰ | 0.5‰ | 0.8‰ | 1.0‰ | 1.2‰ | 1.6‰ | 2.0‰ | 3.0‰ |
|---|---|---|---|---|---|---|---|---|
| muffle | 0→.05 | .10→.30 | .22→.42 | .31→.50 | .40→.58 | .55→.68 | .70→.75 | .70→.75 |
| Music low-pass cutoff (Hz) | 20k→18k | 16.2k→9.5k | 11.9k→6.4k | 9.2k→4.7k | 6.9k→3.3k | 3.8k→2.0k | 1.8k→1.3k | same |
| audioWobble (depth → 0.009 s, T5d) | 0 | 0 | .12→.30 | .21→.43 | .30→.55 | .50→.75 | .65→.90 | .65→.90 |
| Pitch wow (cents) | 0 | 0 | 1→9 | – | 4→22 | 9→36 | 13→49 | 13→49 |
| Stereo width (new T5d) | 1 | 1 | .92 | .86 | .80 | .70 | .62 | .55 |
| Music level (dB, new T5d) | 0 | 0 | −0.5 | −1 | −1.5 | −2.5 | −3 | −3 |

**Result.** Today's 1.6‰ look now arrives at about 1.0‰, and today's 2.0‰ look at about 1.6‰, which is the level players can actually reach.

At 1.2‰ the player gets:
- blur 0.24;
- a double image about 32 px wide, 60% of the time;
- colour fringes about 12 px wide at the corners;
- a horizon that rolls ±1.4° (screen) plus ±1.5° (head);
- 40% darker corners;
- spins of 1.5° when standing still;
- music low-passed at 3.3 kHz with 22 cents of wow.

The compare preview stays at 1.0‰ (`PerceptionSystem.ts:83`).

### T4 (P1): Alcohol shader and camera constants, `strong` preset

The `realistic` preset keeps today's values.

- **Chroma:** factor `0.018` → `0.03` (`shaders.ts:370`). At 1.2‰ the R/B split becomes about 12 px at the corners (1280 wide); today it is 2.8 px.
- **Double vision** (`shaders.ts:579-580`):
  - Ghost x offset `0.03` → `0.045` × (0.85 + 0.25·sin(0.31t)), plus a ±12% vergence term at about 0.35 Hz. Drop that term under reduced motion.
  - y offset `0.005` → `0.012`.
  - The mix reaches its 0.48 cap at dv ≥ 0.3 (today 0.4).
  - Ghost offset at 1.2‰ ≈ 32 px, at 1.6‰ ≈ 43 px (today 12 px and 20 px).
- **Wobble** (`shaders.ts:457-469`):
  - Amplitudes: swim `0.0035` → `0.0075`, rotation `0.014 / 0.008` → `0.028 / 0.014` rad, zoom breathing `0.012` → `0.025`, drift `0.0025` → `0.005`.
  - Frequencies move up from today's 0.03–0.09 Hz to:
    - rotation at about 0.12 Hz and 0.05 Hz;
    - swim at 0.17–0.3 Hz;
    - zoom and drift at about 0.1 Hz.
  - Edge compensation: sample at a zoom of `1 − 0.03·w`, so the clamped border never smears in.
  - At 1.2‰ (0.58) the horizon rolls up to ±1.4° about every 8 s, with 1.5% zoom breathing.
- **Refocus** (`PerceptionSystem.ts:823-826, 881-882`):

  | Setting | Current | New |
  |---|---|---|
  | Turn threshold | `smoothstep(0.9, 3.2, turn)` | `smoothstep(0.6, 2.4, turn)` |
  | Impairment | `min(1, bac/1.4)` | `min(1, bac/1.0)` |
  | Blur gain | `0.26` | `0.35` |
  | Double-vision gain | `0.3` | `0.45` |

  Refocus blur now starts at about 35°/s.
- **PlayerController** (`updateEyes`, `PlayerController.ts:616-649`), `strong` preset and not reduced:

  | Setting | Current | New |
  |---|---|---|
  | Eye sway | `0.07` m | `0.10` m |
  | Roll | `0.012·wobble(t*0.23)` | `0.04·wobble(t*0.8)` rad |
  | Yaw | `0.02·wobble(t*0.19)` | `0.045·wobble(t*0.6)` rad |
  | Pitch | `0.012·wobble(t*0.31)` | `0.02·wobble(t*0.9)` rad |
  | lookJitter gains | `0.004 / 0.005` | `0.006 / 0.008` rad |
  | Roll cap | `MAX_ROLL` | `MAX_ROLL + 0.035·sway`, at most about 3° |

  At 1.2‰ (sway 0.65) the head rolls ±1.5° and turns ±1.7°.
- **Motion blur:** keep the cap (`uMB.y` 0.05). Turning is already heavy.

### T5 (P2): New alcohol effects

- **a. Spins when standing still (from 1.0‰).**
  - When active:
    - The player moves at `speed < 0.4` m/s and turns at `|turn| < 0.3` rad/s for at least 2 s.
    - Fade in over 3 s and out over 0.5 s.
  - The picture creeps sideways and snaps back. Phase φ runs at 0.3 Hz:
    - offset = dir·A·(φ < 0.85 ? φ/0.85 : 1 − (φ−0.85)/0.15) − dir·A/2;
    - it creeps for 2.8 s and snaps back in 0.5 s;
    - `rand()` picks the direction at each fade-in.
  - A is the `spins` row in T3. It goes into `body.offX` in degrees/fov, as nystagmus does (`PerceptionSystem.ts:889-895`).
  - Add a `BodyParams.margin` field (default 0). Set it to the maximum expected |offX|, and have PostFX zoom by `max(|ox|, margin)`. The zoom then stays steady instead of pumping with the offset (`PostFX.ts:737-748`).
  - Reduced motion: 0.
- **b. Peripheral blur.** In the composite (`shaders.ts:593-594`), change the blur level to `lod = (p0.x·3 + tunMask·(tun·2.4 + p0.x·2.0))·uLodScale`. Use a uniform factor: 0 for `realistic`, 2.0 for `strong`. The edges get clearly softer than the centre from 0.8‰.
- **c. Look overshoot.** The world lags behind the head and then overshoots. Input stays 1:1 (`PlayerController.ts:330-331`).
  - In `cameraTurnRate`, also compute the signed yaw rate from `cross(prevDir, dir).y / dt` (reuse the vectors).
  - Run a sub-stepped spring on `offX` like the lurch spring (`:833-844`): target −g·ω, 1.3 Hz, ζ 0.35.
  - Scale g so a 90°/s pan reaches the `look overshoot` row of T3, and clamp to that value.
  - Reduced motion: 0.
- **d. Audio.**
  - `AudioEngine.setPerception`: wobble depth `0.004` → `0.009` s (`AudioEngine.ts:186`).
  - Add `AudioEngine.setPerceptionMix(widthScale, gainDb, lowShelfDb, highShelfDb)`:
    - It multiplies into the distance model's width (`:217-225`) and `distGain` in one place, so it does not fight `setMusicDistance`.
    - It adds two shelving filters to the music chain. Create them once in `ensure()`; they default to 0 dB.
  - Alcohol sets width and level from T3.
  - Optional: lowpass Q 0.5 → 0.8 when muffle > 0.3.

### T6 (P1): XTC targets, `strong` preset

x = intensity, n = nausea, d = drained, dz = dazzle.

**Intensity terms (x)**

| term | current | new | at the crest (x = 1) |
|---|---|---|---|
| saturation | ×(1+0.12x) | ×(1+0.40x) | 1.12 → 1.40 |
| warmth (new, `u3.w`, T7b) | 0 | +0.6x | 0 → 0.6 |
| exposure | ×(1+0.06x+0.22x·dz) | ×(1+0.20x+0.40x·dz); dz term ×0.5 with reduce flashing | 1.06 → 1.20; under strobes 1.28 → 1.60 |
| lightSensitivity | 0.42x | 0.70x | Bloom threshold ×0.70 → ×0.50 |
| bloomBoost | 0.35x | 0.90x | Bloom share 0.41 → 0.57 |
| body.star | 0.3x | 0.7x; glare stride 1.25 → 1.8 desktop, 1.6 → 2.2 mobile (`PostFX.ts:655`) | Streak energy 6% → 25%; streaks about 45% longer |
| veil | 1.1·x·(0.22+0.78dz) | 1.1·x·(0.10+0.90dz); ×0.6 with reduce flashing | Idle 0.24 → 0.11; strobes 1.1 → 1.1 |
| glow (new, `u4.x`, T7b) | 0 | 0.35x | 0 → 0.35 |
| trails | 0.5x on the old path | 0.90x on the new T7a path | τ 24 ms stepped copies → ≈160 ms continuous streaks |
| afterimage | 0.45x; mix 0.35 / 0.16 | 0.80x; mix 0.50 / 0.30 (`shaders.ts:626`) | 0.45 → 0.80 |
| chroma | 0.10x | 0.20x | ≈1.2 px → ≈4 px |
| blur / wobble | 0.10x / 0.05x | 0.12x / 0.10x | – |
| nystagmus | 0.2x° at 4.2 Hz | 0.6x°; ×0.5 with reduce flashing | – |
| jaw shake | 0.0011 screen height | 0.0025; off with reduce flashing | < 1 px → 2–3 px |
| kick pulse (T7c) | exposure +0.03, bloom +0.3 | exposure +0.08, bloom +0.6, saturation +0.08, view zoom +0.8% | – |
| motor | lookJitter +0.15x, sway +0.08x | lookJitter +0.30x, sway +0.15x | – |
| audio (T7d) | none | high shelf +4 dB, low shelf +3 dB, width ×1.35, music +1.5 dB, heartbeat | – |

**Nausea (n)**

| term | current | new |
|---|---|---|
| saturation | ×(1−0.4n) | ×(1−0.6n) |
| green-grey tint (new, `u4.y`) | 0 | n |
| wobble | ≥ 0.4n | ≥ 0.7n |
| blur | ≥ 0.08n | ≥ 0.15n |
| tunnel | ≥ 0.2n | ≥ 0.40n |
| sway | +0.35n | +0.6n |
| audio muffle / audioWobble (new) | – | ≥ 0.3n / ≥ 0.5n |

**Drained (d)**

| term | current | new |
|---|---|---|
| saturation | ×(1−0.3d) | ×(1−0.55d) |
| contrast | ×(1−0.08d) | ×(1−0.18d) |
| exposure | ×(1−0.1d) | ×(1−0.2d) |
| warmth (cool) | 0 | −0.5d |
| speedScale | ×(1−0.15d) | ×(1−0.25d) |
| inputLag | +0.06d | +0.10d |
| audio (new) | – | muffle ≥ 0.3d (≈9.5 kHz), width ×(1−0.3d), music −2 dB·d, high shelf −3 dB·d |

**Resulting values at key times**

| Moment | Result |
|---|---|
| 30.2 s (x 0.80, n 1) | Saturation ≈ 0.53, green-grey tint, wobble 0.7, tunnel 0.4 |
| 90 s | Warm and glowing, saturated, with long light streaks |
| 300 s (d 0.91) | Saturation ≈ 0.50, contrast 0.84, exposure 0.82, cool, dull and narrower sound |

The heat overlay and hyponatraemia stay unchanged.

### T7: New XTC effects

- **a. Light trails (P1).** These replace today's full-resolution scene feedback (`PostFX.ts:550-570`, `TRAILS` at `shaders.ts:114-129`). The old path gives stepped copies when turning and costs 2 full-size half-float targets, about 83 MB at 2880×1800.
  - Build a trail buffer from the bright pass after the prefilter:
    - `trail = max(bright_now, tent3(reproject(prevTrail))·k)`, with `k = trails^(dt·60)`.
    - Size: `levelW(0)` (½ res) on desktop, `levelW(1)` (¼ res) on mobile.
  - Reproject rotation-only (at infinity) with `invViewProj` and `prevViewProj`, which PostFX already computes (`PostFX.ts:795-800`). Distant lights stay put during head turns, while lasers and moving heads leave streaks.
  - A 1-texel tent along the reprojection delta removes the stepped copies.
  - Reset on a camera cut, as today.
  - In the composite, on the altered side only and before the tone map: `col += max(trail − bright_now, 0)·uTrailGain`, with gain 0.9 for `strong`.
  - Both presets use the new path; `realistic` keeps its old persistence values. Remove the old full-res pass.
- **b. Warmth, glow and tint (P1).**
  - `packParams`: `u3.w` = warmth (−1..1). Add a 5th vec4 `uA4`/`uB4` = (glow, nauseaTint, 0, 0); the identity is 0.
  - Warmth (in linear light, before saturation): `col *= mix(vec3(1), w > 0 ? vec3(1.10, 1.02, 0.86) : vec3(0.90, 0.98, 1.12), abs(w))`, then renormalise the luma.
  - Glow: `vec3 gl = blurLayer(suv, 1.5); col += g·gl·smoothstep(0.05, 0.6, dot(gl, LUMA)·ex)`. It adds a soft glow and keeps blacks black, unlike the veil. `needBlur` must include glow > 0.001.
  - Nausea tint: `col *= mix(vec3(1), vec3(0.94, 1.03, 0.97), t)`, luma-renormalised.
- **c. Kick pulse (P1).** Replace the drive in `pulses()` (`PerceptionSystem.ts:928-940`) with a local envelope.
  - Trigger on a rising `ctx.beat.kick` above 0.95, with a refractory period of at least 0.34 s. Use every 2nd kick when `bpm > 168`.
  - Decay τ is 0.12 s. `kp = env·(0.4 + 0.6·energy)·x`.

  | Target | Normal | With reduce flashing |
  |---|---|---|
  | exposure | += 0.08·kp | += 0.02·kp |
  | bloomBoost | += 0.6·kp | += 0.15·kp |
  | saturation | ×(1 + 0.08·kp) | same |
  | view zoom | ×(1 + 0.008·kp), through a new `BodyParams.zoom` field (default 0) | same |

  Under reduced motion the zoom is 0.
- **d. XTC audio and heartbeat (P2).**
  - Use `setPerceptionMix` from T5d, scaled by x: high shelf +4 dB at 5 kHz, low shelf +3 dB at 90 Hz, width ×1.35, music +1.5 dB, distance-level drop ×0.5. The −2 dB limiter keeps the output safe (`AudioEngine.ts:52-58`).
  - Heartbeat:
    - Use one persistent 48 Hz `OscillatorNode` → `GainNode` → master, created in `ensure()`.
    - For each beat, schedule the gain envelopes ahead on the audio clock with `setValueAtTime` / `setTargetAtTime`. The phase comes from `heartPhase` (`PerceptionSystem.ts:849-851`). Each beat is a "lub" of 70 ms, then a "dub" of 60 ms at 0.6 level, 0.3 of a period later.
    - Audible when the XTC phase is not off or heat danger is above 0:
      - silent below 110 bpm;
      - −32 dB at 110 bpm, rising to −16 dB at 180 bpm.
    - No node is created per beat.
- **e. Nausea and comedown audio (P2):** the muffle, wobble, width and shelf values from the T6 tables, sent through the same throttled audio path.

### T8 (P2): UI and previews (`PerceptionUI.ts`, `PerceptionSystem.init`)

- **2.0‰ modal:** open it after 6 s continuously at ≥ 2.0‰ instead of immediately (`PerceptionUI.ts:604`). It still always opens. The 25 s sustained sit-down stays.
- **Show camera:** hide the compare divider and show the toast from T1.
- **Strength:** add the control from T2 and the disclaimer sentence from §0.3.
- **Dev URL parameters** (optional): `?bac=<‰>`, `?xtc=<s>` and `?pstrength=`.
  - Apply them once after start: `setBac` + `settle`, or `setXtc(true)` + `xtcTime` + `settle`.
  - Outcomes stay live. For a calm preview, use `preview.js`.
- **Optional (P3):** `BAC_MAX` 4 → 3 (`PerceptionUI.ts:21`, ticks at `:59`), so 1‰ fills 33% of the meter instead of 25%.

### T9 (P1): Ketamine as a third simulation (user request, 26 Sep 2026)

**User request (translated):** "Add ketamine to the options as well. Next to XTC and alcohol it is a commonly
(mis)used drug at festivals. Of course add the educational danger warning."

Build it like the XTC simulation (a card in the perception menu, "Read the information first", a fixed timeline, a
risk monitor, outcome cards, an epilogue), with its own mode: `PerceptionMode = 'sober' | 'alcohol' | 'xtc' |
'ketamine'`. It is never sold at the bars and never combined into a "dose" choice: one fixed, anonymous scenario.

**Education (src/intoxication/education.ts, new `KETAMINE_INFO` in the style of `XTC_INFO`).** Factual, concise, no
glamour, and never any usage, dosing, route-of-use or buying information (the header rule of education.ts). Sources:
Trimbos-instituut (drugsinfo.nl, "Ketamine"), Jellinek (jellinek.nl, "Ketamine"), and for the bladder damage the
Trimbos/Jellinek pages on "ketamineblaas". Content to cover (English, like the other texts):
- What it is: an anaesthetic (narcosis drug) with a dissociative effect: you feel detached from your body and your
  surroundings.
- Effects: numbness, poor coordination and balance, dizziness, nausea, distorted sense of time, space and sound;
  at a high level a "K-hole": hardly able to move or speak, no grip on where you are.
- Risks at a festival: falls and injuries you do not feel (pain is numbed); being unable to move or call for help in
  a crowd; vomiting while barely conscious (choking); getting lost from your friends; heat and dehydration go
  unnoticed. Mixing with alcohol, GHB or other depressants strongly raises the risk of unconsciousness and of
  breathing problems. The strength of what is sold is unknown.
- Repeated use: serious bladder damage ("ketamine bladder": pain and blood when urinating, can be permanent),
  dependence, memory and concentration problems.
- What helps (help block, like XTC_INFO help): never use alone and keep friends close who know; sit down in a quiet,
  safe place; if someone does not respond: recovery position, do not leave them alone, get the first-aid post / call
  112; tell first aid honestly what was taken. Dutch help/info: drugsinfo.nl, jellinek.nl.
- Disclaimer sentence as for XTC: an educational simulation, never an encouragement; effects are exaggerated for
  visibility in the `strong` preset.
- If the player is not sober from alcohol (BAC > 0.2‰) or an XTC run is active when starting ketamine: show a
  combination warning card first (the combination risks above) before the simulation starts; the simulation then
  runs as normal (do not model combined pharmacology, only the warning).

**Timeline (models.ts, like xtcPhase; compressed like the XTC run, total about 4-5 minutes of real time):**
onset (0-30 s: numb, heavy, sound starts to go far away, slight sway), peak (30-180 s: dissociation), deep dip
("K-hole" window, e.g. 90-140 s, the strongest point), return (180-260 s: slowly back, still unsteady, nausea),
after (grey, tired, 30-60 s). Deterministic in simulation time, pausable like XTC.

**Look and feel (player view only, all constraints of §0 apply: Show-camera gate, reduced motion, reduce flashing,
identity when sober, mobile budget):**
- Detachment: the world recedes — a slow dolly-zoom feel (wider FOV while the image scales down towards the centre),
  heavy tunnel/vignette, colours drained and cool, contrast flattened.
- Delay: strong input lag and a sluggish, overshooting look (the camera follows the mouse late and floats), a
  smeared, frame-blended image (trails/afterimage) that makes motion feel like slow motion.
- Body: large sway, balance loss, speedScale down to ~0.2 at the peak and ~0 in the K-hole window (the player sits /
  slumps: `seated`), stumbles.
- Out-of-body: in the K-hole window the first-person eye drifts slowly up and back behind the player's head (an eye
  offset in PlayerController, capped at ~1.5 m, back to 0 afterwards; reduced motion: 0.3 m).
- Sound (src/audio/AudioEngine.ts): far away and muffled (low-pass ~1.2 kHz at the peak), wide echo/reverb, slight
  pitch drift down; the own heartbeat/breath close by.
- No flashing effects at all (dissociation is not a strobe experience).

**Risk monitor and outcomes (UI like the XTC risk monitor; reuse OutcomeOverlay):**
- Monitor lines: "coordination", "awareness", "can move" (low in the K-hole window), plus heat from the existing
  heat model if the player dances.
- Outcome in the K-hole window: a "cannot get up" card (sit-down variant): what happens, what friends / first aid
  should do (recovery position if unresponsive, stay with them, 112 / first-aid post).
- Epilogue after the timeline: the repeated-use risks (bladder, dependence) and the help block.

**Previews:** `pv.ket(s)` in `$ENDSHOW_DATA/work/perception/preview.js` style (jump to second s of the timeline),
URL param `perception=ketamine` if the existing modes have one.

**Verify:** stills + 4-frame look sequences at 20 s, 100 s (K-hole), 220 s in `$ENDSHOW_DATA/work/perception/r7/`;
Show camera clean (`check-preview.mjs` must also cover ketamine at 100 s); reduced motion and reduce flashing
respected; the education text has no dosing/route/buying information (the reviewer checks this line by line).

## 3. Preview every state

**Dev server:**
- `npm run dev -- --strictPort` serves on `http://localhost:5173/`.
- Or run `npx vite --port 5410 --strictPort` and kill it afterwards.

**URLs**

Full motion, first person:

`http://localhost:5173/?autostart&play&t=415&spot=crowd&quality=high&reducedmotion=0&reducemotion=0`

Variants:

| Add to the URL | Effect |
|---|---|
| `spot=front&t=1243` | The white-fog case |
| `reducedmotion=1&reducemotion=1` | Comfort mode |
| `quality=mobile` | Mobile preset |
| `camera=showcam` | Show camera |
| `heat=heatwave` | Hot afternoon scenario |

**Helper.** Paste `$ENDSHOW_DATA/work/perception/preview.js` into the console; it defines `window.pv`. With `scripts/shot.mjs`, use `--eval "$(cat "$ENDSHOW_DATA/work/perception/preview.js"); pv.bac(1.2)"`.

`pv.bac`, `pv.xtc`, `pv.heat` and `pv.sodium` hold the state and turn off outcomes, random stumbles and gaps, and the 2.0‰ modal, by shadowing the private `begin` and `rand` methods and `aidShown`. Reload the page to restore them.

| State | Call |
|---|---|
| Sober | `pv.sober()` |
| Alcohol tier (held) | `pv.bac(0.5)`, `pv.bac(0.8)`, `pv.bac(1.2)`, `pv.bac(1.6)`, `pv.bac(2.0)` |
| Real absorption, outcomes live | `pv.beers(6)` (1.11‰ after about 5 min) |
| Stumble | `pv.bac(1.6); __app.get('perception').startStumble(1)` |
| Memory gap | `(()=>{const p=__app.get('perception');p.gapT=0;p.gapLen=1.8;})()` |
| Sit-down card (fresh page) | `pv.sober(); __app.get('perception').setBac(2.6)` |
| XTC nausea peaks | `pv.xtc(19.2)`, `pv.xtc(30.2)` |
| XTC crest / trough | `pv.xtc(90)`, `pv.xtc(115)`; full strobe dazzle: `pv.xtc(90, 1)` |
| XTC comedown / after | `pv.xtc(247)`, `pv.xtc(300)` |
| Full XTC timeline (6 min 10 s, epilogue card at the end) | `pv.xtcRun(0)` |
| Heat overlay | `pv.heat(39.6)`. Real run: `&heat=heatwave` plus `__app.get('perception').setActivity('dance')`, which reaches 38.5 °C at about 41 s and collapses at about 77 s |
| Hyponatraemia | `pv.sodium(0.6)` |
| Compare split | `pv.compare(0.5)` |
| Strength (after T2) | `pv.strength('realistic')`, `pv.strength('strong')` |
| Comfort guards | `pv.comfortOn()`, `pv.comfortOff()` (reduced motion and reduce flashing together) |
| Show-camera check | `pv.bac(1.6); pv.showcam(); setTimeout(()=>console.log(pv.showcamClean()),1500)` must print `true` |
| Values sent to post, body and motor | `pv.dump()` |

**Stills:**
```
node scripts/shot.mjs "autostart&play&spot=crowd&t=415&quality=high&reducedmotion=0&reducemotion=0" "$ENDSHOW_DATA/work/perception/r7/bac120.png" --wait 2500 --eval "$(cat "$ENDSHOW_DATA/work/perception/preview.js"); pv.bac(1.2)"
```

**Head-turn sequences:** `node $ENDSHOW_DATA/work/perception/seq.mjs 415 crowd t415 --look`.

**Show-camera check:** `node $ENDSHOW_DATA/work/perception/check-preview.mjs http://localhost:5173/`.

Do not use `stills.sh` for 2.0‰ or higher: its `setBac(2.5)` triggers the sit-down at once.

## 4. Verify / stop

1. **TypeScript:** `npx tsc --noEmit` passes.
2. **Show camera:**
   - `check-preview.mjs` prints `clean=true` for both showcam rows.
   - Run the similarity guard before and after the changes:
     ```
     node scripts/similarity.mjs --port 5173 --settle 500 --min-frames 30 --times 167,411.5,1243 --out "$ENDSHOW_DATA/work/sim/r7_perception_guard_{before,after}"
     ```
     The per-moment numbers must match within ±0.002.
   - At the end, run the default 64 once with `--out "$ENDSHOW_DATA/work/sim/r7_perception_64"`. The calibrated score must not drop below the current baseline: 39.4 % (`research/video-timeline/data/similarity-mac-r6.json`), or the newest round-7 baseline.
3. **Sober identity:** take a sober first-person still at t=415, spot crowd, before and after. `postfx.passes` and `active` must be the same, and the mean absolute pixel difference at most 1/255 (grain changes per frame).
4. **Targets:** for each state in §3, `pv.dump()` matches T3 and T6 within ±0.02 in `strong`, and today's values in `realistic`.
5. **Visual stop criterion (the user's check).** A single still from `spot=crowd t=415` and one from `spot=front t=1243` must each look altered on their own:

   | State | What must be visible |
   |---|---|
   | 0.8‰ | Soft image, part-time double image, darker edges |
   | 1.2‰ | Double image most of the time, rolling horizon, colour fringes |
   | XTC 30 s | Grey-green and swimming |
   | XTC 90 s | Warm, glowing, streaked lights; not "more fog" |
   | XTC 300 s | Grey, cold and flat |

   Save the stills, a 4-frame look sequence per state and a contact sheet in `$ENDSHOW_DATA/work/perception/r7/`.
6. **Reduced motion** (`pv.comfortOn()`), at 1.6‰ and at XTC 90:
   - `body.offX`, `body.roll` and `perception.wobble` are 0;
   - spins, overshoot and kick zoom are 0;
   - `motor.sway` is at most 0.25 × its target;
   - camera roll is at most 1°.
7. **Photosensitivity.** At XTC 90 during a kick section (t=415), log `postfx.perception.exposure` per frame for 4 s:
   - pulse onsets are at least 0.34 s apart;
   - the kick component is at most 8%, or at most 2% with reduce flashing;
   - during a strobe section, the dazzle exposure term halves with reduce flashing.
8. **Mobile.** Run `node scripts/shot.mjs "autostart&play&spot=crowd&t=415&quality=mobile" x.png --mobile --budget --eval "…pv.bac(1.6)"`, and again with `pv.xtc(90,1)`:
   - the budget check is ok;
   - `stats.measured.medianMs` is at most the sober mobile time + 1 ms;
   - there is no motion-blur pass and no full-res trail buffer.
9. **Education.** On a fresh page, with outcomes live:
   - the sit-down card appears at 2.6‰, and after 25 s at 2.0‰;
   - the 2.0‰ modal opens after 6 s;
   - the collapse card appears at 40 °C (heatwave + dance);
   - the epilogue appears after the XTC timeline;
   - the bar refuses at ≥ 1.3‰;
   - the tier and XTC texts are unchanged except for the disclaimer sentence.
10. **Determinism.** Two runs of `pv.bac(1.2)` and `pv.xtc(90)` at the same show time give identical `pv.dump()` values.

## Files

**Files you own:** `src/intoxication/**`, `src/bar/**`, `src/player/**`, `src/audio/**`, `src/ui/PerceptionUI.ts`, `src/ui/contracts.ts` (perception types only), `src/core/types.ts` (PerceptionParams / BodyParams only), `src/postfx/PostFX.ts`, `src/postfx/shaders.ts`.

Note: the photo camera mode will be removed in round 8; treat `photo` like `free` (identity) now, do not build on it.

**NOT:**
- `src/postfx/SceneGlare.ts`;
- `src/camera/**` (`ShowDirector.ts` and `CameraRig.ts`; only read `app.get('camera').mode`);
- `src/world/**`, `src/stage/**`, `src/lighting/**`;
- `public/show/*.json`, `scripts/**`;
- `src/ui/UI.ts` and `src/ui/settings.ts` (read `app.reduceFlashing` instead).

In `shaders.ts`, change only the perception and body branches of the composite, `TRAILS`/`AFTERIMAGE`, and new perception passes. The SceneGlare halos (`glareHalos`, `uGlare`, `uGN`, `tGate`), the tone map and the grain are shared with the Show camera and must stay byte-identical in effect.
