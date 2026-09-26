/**
 * Workflow: QA judge round. Independent read-only reviewers, one lens each, review the integrated build against the
 * official video and return findings per module (the orchestrator turns them into findings files for qa-fix.js).
 *
 * ARGS (Workflow scripts have no fs/process access: every path comes from here; an args JSON string is parsed too)
 *   repo      (required) absolute path of the repository checkout to review, e.g. "/Users/<you>/Projects/Q-Crashers"
 *   data      (required) absolute path of $ENDSHOW_DATA, e.g. "/Users/<you>/Projects/endshow-data" (video frames f4/,
            work/ ...; see HANDOFF.md / CLAUDE.md); every data-dir command in the prompts carries ENDSHOW_DATA/PYTHON
 *   round     round number (default 1): names the screenshots
 *   lenses    subset of ['accuracy', 'stage', 'crowd', 'ux', 'tech', 'perception'] (default: all six)
 *   portBase  dev-server ports: accuracy portBase+1, stage +2, crowd +3, ux +4, tech +5, perception +6 (default 5300)
 *   python    python with numpy + Pillow (default `${data}/venv/bin/python`)
 *   extra     optional round context appended to every prompt
 * Output: [{lens, score, top3, findings:[{severity, module, title, description, evidence, fix}]}]. Write the findings
 * the fixers should get to `${repo}/docs/handoff/findings/r<round>_<group>.md` (see qa-fix.js).
 * Example call (Workflow tool): scriptPath "/Users/<you>/Projects/Q-Crashers/tools/workflows/qa-judge.js", args
 *   {"repo":"/Users/<you>/Projects/Q-Crashers","data":"/Users/<you>/Projects/endshow-data","round":5,"lenses":["accuracy","stage"]}
 */
export const meta = {
  name: 'qa-judges',
  description: 'QA round: independent judges (lens per agent) review the integrated build against the official video and report findings per module; args = {repo, data, round?, lenses?, portBase?, python?, extra?}',
  phases: [{ title: 'Judge', detail: 'renders + measurements per lens' }],
}

const A = typeof args === 'string' ? JSON.parse(args) : args
if (!A || !A.repo || !A.data) throw new Error('args = {repo, data} required (see the header of tools/workflows/qa-judge.js)')
const R = A.repo
const D = A.data
const PY = A.python || `${D}/venv/bin/python`
const ENV = `ENDSHOW_DATA="${D}" PYTHON="${PY}"`
const round = A.round || 1
const ALL = ['accuracy', 'stage', 'crowd', 'ux', 'tech', 'perception']
const lenses = A.lenses || ALL

const COMMON = (port) => `
You are an independent, demanding QA reviewer (round ${round}) of "Defqon.1 2026 — The Endshow Experience": a real-time Three.js/WebGL2 browser reconstruction of the Defqon.1 2026 Endshow (Biddinghuizen NL; festival cancelled 26 June 2026 by an extreme-heat red warning; the 26-min Endshow was performed on the empty grounds on Saturday 27 June 2026 ~22:33 and published on YouTube). The user compares it side by side with the official video and judges visual quality, realism, accuracy, immersion and technical quality. The guiding question: "Would someone who knows Defqon.1 feel they are watching / standing in the 2026 Endshow?" Be concrete and critical — the goal is to find what to improve, not to praise.
DO NOT EDIT any project file. Read-only review + renders.
Project: ${R} (read CLAUDE.md, research/design-bible.md, research/video-timeline/NN.md, docs/show-format.md, research/technical-decisions.md). Start your own dev server: \`cd ${R} && (npx vite --port ${port} --strictPort > ${D}/work/vite-${port}.log 2>&1 &)\`. Shell variables do not persist between your Bash calls: every command below that touches the data dir starts with the prefix \`${ENV}\` (as written).
Screenshots: \`node scripts/shot.mjs "<query>" .shots/qa${round}-<name>.png --base http://localhost:${port}/ [--size WxH] [--wait ms] [--mobile] [--eval "js"]\` then VIEW the PNG with Read. Renders run on the Mac's GPU (the "[browser] WebGL renderer" line on stderr must name the Apple GPU; if it says SwiftShader, report it and continue with longer --wait). The JSON output has per-system CPU ms, draw calls, triangles, errors. Query params: autostart, t=<show s>, play, cam=x,y,z,yaw,pitch (free cam, yaw 0 = looking at the stage along -Z), spot=<id> (front, crowd, middle, foh, back, side_left, side_right, dragon_view, entrance, stage_left, stage_right, piano, bar_west, dj, dancers ...), camera=first|third|free|flyover|showcam|photo, quality=ultra|high|medium|mobile, debug, mode=filmed, off=<systems>, nopost. window.__app is the App (e.g. --eval "__app.clock.seek(700)", "__app.get('crowd').setPopulated(false)", "__app.get('camera').setFreePose(x,y,z,yaw,pitch,fov)"), window.__ui the UI.
THE REFERENCE IS THE OFFICIAL VIDEO: frames ${D}/f4/NNNNN.jpg (4 fps, 480x270, index = round(video_s*4); show time = video − 0.036). Contact sheets: \`${ENV} ${PY} ${R}/tools/video/sheet.py qa${round}_<name>.jpg <t0> <t1> <step> [cols]\` (-> ${D}/work/sheets/). Side by side: \`cd ${R} && ${ENV} node tools/video/vcompare.mjs --port ${port} --showcam --settle 600 --frames ${D}/f4 --out ${D}/work/compare/qa${round}_<name>.jpg --shots "<video_t>;<video_t>;..."\` renders our Show camera (which follows the official edit) next to the video frame; with poses ("t|x,y,z,yaw,pitch,fov") it renders a free camera instead. Objective metric: \`cd ${R} && ${ENV} node scripts/similarity.mjs --port ${port} --frames ${D}/f4 --settle 500 --min-frames 30 [--times <list>] --out ${D}/work/sim/qa${round}_<name>\` (colour/light/shape vs the video; baseline in research/video-timeline/data/similarity-baseline.json). Optional user photos (e.g. daytime photos of the stage) in ${D}/refs/ if present. Never copy video frames or photos into the repo.
Output: kill your dev server by PID (\`pgrep -f "port ${port} --strictPort"\`), then return findings. Severity: blocker (broken/ugly/wrong enough that the user would reject it), major (clearly hurts quality/accuracy/immersion), minor (polish). Each finding: module (one of stage, dragon, world, lights, lasers, pyro, fireworks, fog, crowd, performers, show, camera, player, ui, mobile, audio, perception, bar, postfx, perf, core), a precise description with WHERE (video/show time, position, quality level), evidence (render path + video frame index), and a concrete suggested fix. Also give an overall score 1-10 for your lens and the 3 most impactful improvements.`

const SCHEMA = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
    score: { type: 'number' },
    top3: { type: 'array', items: { type: 'string' } },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          module: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'module', 'title', 'description', 'fix'],
      },
    },
  },
  required: ['lens', 'score', 'top3', 'findings'],
}

const LENS = {
  accuracy: `LENS: ENDSHOW RECONSTRUCTION ACCURACY & SYNC. Run scripts/similarity.mjs on the default 64 moments and compare with the baseline; then use vcompare --showcam over at least 40 moments spread over the whole show (all 8 tracks; include the signature moments listed in research/show-analysis.md), view every sheet, and judge per moment: are the right effects active (lights look/colour, lasers, pyro, fireworks, dragon/LED state, fog), is the colour palette right, does the Show camera frame what the video frames (cut times from research/video-timeline/data/cuts.json), does intensity/energy follow the music (breakdowns calm, drops explode), are signature moments recognisable (Vivaldi flames, anthem drop, burning wings ~709 s, flame ring ~859 s, piano laser bounce ~886-934 s, laser sea ~1132 s, gold chevron ~1320 s, finale ~1511 s, closing blue flames)? Check timing against the video frames at 0.25 s resolution around drops and hits. Report timing errors in seconds.`,
  stage: `LENS: MAINSTAGE, WORLD, SCALE & LIGHTING REALISM. Do the scale walk: free camera at eye height 1.7 m on the axis at z = 500, 300, 150, 75, 30, 10 looking at the stage (use t around 700 or 1511 so it is lit), plus front row, middle, back, side_left, FOH (spot=foh), the terrace view (0, 6, 150), a high drone view (0, 95, 290, pitch -0.3), a telephoto (FOV 25 from z≈120 aimed at the dragon head), the walkable stage (spot=dj, spot=dancers). Compare with video frames that show the same framing (find them with contact sheets) and with ${D}/refs/ photos if present. Judge: is the 2026 RED instantly recognisable (dragon + bat wings + gothic castle + forward arms + lantern pillars)? Proportions and human scale (1.80 m person vs 12.8 m pillars vs 28 m crown), materials under show light (metal, stone, LED lines), set lighting (the video's field and castle are near-black at night: light lives in the air), sky/moon/clouds, terrain (paved floor, banks), trees/horizon, barriers/fences/bars placement, anything floating, intersecting, z-fighting, missing or wrong-sized.`,
  crowd: `LENS: CROWD, PERFORMERS & IMMERSION. First person inside the crowd (spot=crowd, front, middle) at calm and peak moments (e.g. t=100, 250, 415, 710, 860, 1150, 1520), third person (camera=third), walking through the crowd (use --eval to move __app.playerPos and check people step aside), flags, phones/lighters moments, crowd lighting against the stage (silhouettes), density per zone, LOD transitions (look for popping, floating people, people inside pillars/barriers/bars), performers (MC 332-498 s on the deck — compare the MC close-ups 347-459 s with the video; dancers/troupe 641-740 s; pianist 880-1098 s on the riser), 'As filmed' mode (mode=filmed or setPopulated(false)). Judge immersion: does it feel like standing in a 45,000-person hardstyle crowd? What breaks the illusion?`,
  ux: `LENS: UX, ONBOARDING, SHOW CONTROLS, CAMERAS, MOBILE. Walk the full flow without autostart: landing → ENTER → audio chooser → onboarding → start the Endshow; then play/pause (K), seek via the timeline (click positions), -10/+10, restart, moments menu, positions menu (teleport), all camera modes 1-6 incl. flyover and showcam (screenshots after 5-10 s in each), photo mode panel, cinema mode (H), quality menu, perception menu, bar menu (spot=bar_west then E), help overlay, show-ended overlay (seek to 1578 and play). Mobile: --mobile landscape (844x390) and portrait (--size 390x844 --mobile): landing, HUD, touch controls, menus, readability, overlaps, safe areas. Report anything confusing, broken, ugly, overlapping, unreadable, or missing.`,
  tech: `LENS: TECHNICAL QUALITY, PERFORMANCE, DETERMINISM. Measure per quality level (ultra/high/medium/mobile) at a heavy moment (t=1515, spot=middle): frame time (headed or GPU-headless Chrome on the Mac gives real numbers: shot.mjs "measured"), draw calls, triangles, geometries, textures, per-system CPU ms, postfx passes; flag budget violations (desktop presets ≤ 150 draw calls and ≤ 3M triangles per docs/performance.md; mobile ≤ 110 calls, ≤ 800k tris — scripts/budget-check.mjs; per-system CPU ≤ ~1.5 ms). Load time and init per system (loading:progress). Production build: \`cd ${R} && npx vite build --outDir ${D}/work/qa-dist\` — report bundle sizes and warnings. Determinism: at t=700.5 render, then seek to 1200, then back to 700.5 and render again — compare the two screenshots (${PY} + PIL diff; nopost to avoid trails) — they must match (except real-time cosmetic motion). Pause/play/seek/restart via __app.clock; clock drift with the synth track (__app.sources.useSynth() after __app.audio.ensure()). Console errors/warnings in all runs. Memory: renderer.info.memory after seeking through the whole show (textures/geometries must not grow). Report concrete hotspots with file/function names where possible (read the code).`,
  perception: `LENS: EDUCATIONAL INTOXICATION SIMULATION + BAR. Test the bar flow (spot=bar_west, E or __app.get('bar') API, order drinks, drink), alcohol BAC build-up and visual/motor effects at tiers 0.5 / 0.8 / 1.2 / 1.6 / 2.0 promille (use __app.get('perception').setBac(x) and screenshots after ~10 s wait), XTC simulation (disclaimer flow in the UI, then plateau visuals + risk widget), compare split mode, reset to sober. Judge: realistic but not glamorous? clearly educational (facts, risks, heat context of 2026)? no usage/dosing/buying information anywhere? visually convincing and not nauseating? UI clarity of the BAC meter and risk info? Also check the drinks menu content (cashless bracelet prices, 2026 line-up) for plausibility.`,
}

phase('Judge')
const EXTRA = A.extra ? `\n\nROUND CONTEXT: ${A.extra}` : ''
const base = A.portBase || 5300
const results = await parallel(
  lenses.map((k) => () => agent(`${COMMON(base + 1 + ALL.indexOf(k))}${EXTRA}\n\n${LENS[k]}`, { label: `judge:${k}`, phase: 'Judge', schema: SCHEMA })),
)
return results.filter(Boolean)
