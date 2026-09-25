# Loading, GPU warm-up and runtime quality

How the core keeps loading responsive, avoids shader-compile freezes and adapts quality without
hitches. Read this before adding heavy init work or quality-dependent state to a system.

## Loading pipeline (`App.init`)

| Phase | Loading bar | What happens |
| --- | --- | --- |
| Show data | 0-5 % | `show.load()` |
| System builds | 5-80 % | `system.init()` + `setQuality()` in registration order. Each system gets a share of the bar proportional to `LOAD_WEIGHT` (measured build times). |
| Shaders | 80-94 % | `renderer.compile()` creates **every** program the scene can use, including hidden objects. With `KHR_parallel_shader_compile` the driver links them on its own threads and the core polls completion without blocking. Without the extension (SwiftShader, some mobile drivers), the core compiles one object at a time and awaits its link result, with a paint in between. Either way the bar shows real progress ("Compiling shaders 45%"). |
| Textures | 94-98 % | Every material / uniform texture is uploaded in 24 ms slices ("Uploading textures n/N"). |
| First frame | 98-99 % | (1) Every object, hidden or idle included, draws **one primitive, one instance** into a 4x4 stand-in of the HDR target (same format, MSAA and depth texture). This builds uniform locations, VAOs, buffer uploads and the driver pipelines for that render state. The cost is per object, not per triangle. (2) A dry run of the first real frame: all systems update at the start time with `seeked`, then the frame renders through PostFX behind the loading screen. (3) A GPU fence is polled until all of it has executed. |
| Ready | 100 % | `app.ready = true`. The first visible frame now costs a normal frame. |

Measured (SwiftShader, HIGH, 480x270, t = 1515, baseline and fix run concurrently on the same loaded box):

| | before | after |
| --- | --- | --- |
| programs at Ready → after 3 frames | 8 → 84 | 92 → 92 |
| first frame after Ready | 89.2 s | 17.5 s |
| steady frame | 14.8-15.3 s | 14.3-14.8 s |
| Ready | 48 s (bar frozen at 100 % during the first frame) | 152 s (bar moving through "Compiling shaders", "Preparing the first frame") |

SwiftShader has no parallel compile and builds its pipelines on the CPU. The shader work therefore moves from the first frame into the loading bar rather than getting cheaper. On GPUs with `KHR_parallel_shader_compile` (Chrome/ANGLE on Windows, macOS and most Android devices) the compile runs off the main thread.

Between systems the core yields with `nextPaint()`. This yield always gives the browser a chance to paint when the tab is visible. It is not throttled in hidden tabs (MessageChannel). `setTimeout(0)` did neither.

`renderer.debug.checkShaderErrors` is **off in production builds** (it forces a blocking link-status query per program and defeats parallel compile). It stays on in `npm run dev` and with `?debug`.

### Contract for heavy system init (please adopt)

A long synchronous generator freezes the loading screen: no progress, no embers. For any loop that takes more than about 50 ms, do two things:

```ts
import { TimeSlicer } from '../core/yieldTo';

async init(app: App) {
  await app.loadStep('stone textures', 0.1);   // label + position inside this system's share
  const slice = new TimeSlicer(12);
  for (let y = 0; y < size; y++) {
    /* ... one row ... */
    if (slice.due()) await slice.yield();       // paint, then continue
  }
  await app.loadStep('crown', 0.6);
}
```

`app.loadStep(label, fraction)` shows `Building <system> · <label>` and yields. Outside `init()` it only yields.

### GPU warm-up rules for systems

- Create meshes and materials in `init()` or `setQuality()`, **not** lazily at the first cue. Hidden (`visible = false`) objects are fine: they are compiled and warmed. A material or mesh created during the show compiles synchronously on first use and causes a hitch.
- Do not change program-defining state at runtime. That state includes `defines`, the light count (toggle a light's `intensity`, never its `visible`), the fog on or off, `vertexColors`, and whether `instanceColor` exists. Each distinct combination is a new program.
- Set `object.userData.noWarmup = true` on debug helpers that must never be drawn.

## Runtime adaptation (`PerfGovernor`)

- **Resolution only at runtime.** The render scale moves in coarse steps `1 / 0.9 / 0.8 / 0.7 / 0.6`. A step down comes after 2 slow windows of 45 frames, or at once when the overload is severe. The governor steps up at once when there is measurable headroom (high-refresh or unsynced display). Otherwise it probes one step up after a stable period (8 windows at first, doubling after every failed probe, up to 128) and falls back at once if the probe misses. A seek resets the measurement.
- **Presets never change in the middle of the show.** When the lowest resolution step still misses the budget for about 3 more windows, the governor *suggests* a lighter preset. The App applies it only while the show is not playing (before the show, paused or ended) and shows a toast. It also stores the suggestion for this GPU (`localStorage['dq26.autoQuality']`), so the next load starts on the lighter preset and builds only once. After a transient overload, lasting headroom lets the preset recover, up to the preset picked automatically for the device.
- **Explicit preset changes** (Graphics menu) hold the last picture and pause the world. Audio, the show clock and the HUD keep running. Each system then rebuilds in its own task, the new program variants compile (in parallel where the driver can, otherwise one at a time with paints in between), and the first frame of the new preset is drawn and fenced. After that the world resumes, and its first frame behaves like a seek. `app.quality` and `quality:changed` update immediately. The longest remaining block is the heaviest single system `setQuality` (crowd re-layout), or, without parallel compile, one program link.
- The user's saved preset (`dq26.quality`) is read at start-up, so a saved choice is built once, not built as "auto" first and then rebuilt.

## Budgets (per frame, desktop HIGH / mobile)

Draw calls ≤ 150 / 110. Triangles ≈ 3 M / 0.8 M. Per-system CPU ≤ 1.5 ms. Shader programs: all compiled before Ready, and none compiled during the show.
