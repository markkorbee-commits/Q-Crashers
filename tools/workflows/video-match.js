/**
 * Workflow: per-span video matching. One agent per show span compares the official video (frames + measured signals)
 * with its span of the show file and rewrites that span's cues (effects, colours, timing, camera edit).
 *
 * ARGS (Workflow scripts have no fs/process access: every path comes from here; an args JSON string is parsed too)
 *   repo      (required) absolute path of the repository checkout, e.g. "/Users/<you>/Projects/Q-Crashers"
 *   data      (required) absolute path of $ENDSHOW_DATA, e.g. "/Users/<you>/Projects/endshow-data"
 *             (holds f4/, cuts.json, signals/, spans/NN.json, work/ — see HANDOFF.md / CLAUDE.md)
 *   spans     (required) span numbers to match, e.g. [3] or [5, 6] (0..10; spans/index.json lists their times)
 *   portBase  first dev-server port; span i of the list uses portBase + i (default 5410)
 *   python    python with numpy + Pillow (default `${data}/venv/bin/python`)
 *   extra     optional extra context appended to every prompt
 * Before running: `tools/video/prepare-data.sh` (frames, features, cuts, signals), then ALWAYS re-split from the
 * current show file right before a new run: `python3 tools/video/split.py --force` (unless you resume that same run).
 * Span files split from an older show file would revert every cue edited in the show since (merge.py refuses such a
 * merge: see its STALE-SPAN CHECK). After the run: `python3 tools/video/merge.py --spans <the spans you ran>`, check,
 * then copy the merged show onto public/show/endshow-2026.json (see tools/video/merge.py).
 * Example call (Workflow tool): scriptPath "/Users/<you>/Projects/Q-Crashers/tools/workflows/video-match.js", args
 *   {"repo":"/Users/<you>/Projects/Q-Crashers","data":"/Users/<you>/Projects/endshow-data","spans":[3],"portBase":5410}
 */
export const meta = {
  name: 'video-match',
  description: 'Per-span agents compare the official Endshow video with the show file and rewrite their span (effects, colours, timing, camera edit); args = {repo, data, spans:[k...], portBase?, python?, extra?}',
  phases: [{ title: 'Match', detail: 'one agent per show span' }],
}

const A = typeof args === 'string' ? JSON.parse(args) : args
if (!A || !A.repo || !A.data || !Array.isArray(A.spans)) throw new Error('args = {repo, data, spans:[k...]} required (see the header of tools/workflows/video-match.js)')
const R = A.repo
const D = A.data
const PY = A.python || `${D}/venv/bin/python`
const ENV = `ENDSHOW_DATA="${D}" PYTHON="${PY}"`

const REPORT = {
  type: 'object',
  properties: {
    span: { type: 'string' },
    summary: { type: 'string', description: 'what the video shows in this span and what you changed (5-15 sentences)' },
    added: { type: 'number' },
    removed: { type: 'number' },
    modified: { type: 'number' },
    cameraShots: { type: 'number' },
    validator: { type: 'string', description: 'last validate-show result line(s)' },
    unresolved: { type: 'array', items: { type: 'string' }, description: 'video content the cue vocabulary / engine cannot express yet' },
    engineRequests: { type: 'array', items: { type: 'string' }, description: 'concrete requests per module (prefix with the module: pyro, fireworks, lasers, lights, stage, fog, screens, crowd, camera, world...) with video times as evidence' },
  },
  required: ['span', 'summary', 'added', 'removed', 'modified', 'cameraShots', 'validator', 'unresolved', 'engineRequests'],
}

const prompt = (k, port) => {
  const kk = String(k).padStart(2, '0')
  return `
You reconstruct one span of "Defqon.1 2026 — The Endshow" (Three.js real-time recreation of the 26:21 show performed on the empty festival grounds on Sat 27 June 2026, published on YouTube) so that ALL fireworks, lights, lasers, pyro and special effects match the OFFICIAL VIDEO exactly and run exactly in time with the music. The user will put our show and the video side by side and compare them. You have the official video as frames. Be meticulous and evidence-driven. Read ${R}/CLAUDE.md first (project rules).

DATA DIR + PYTHON: shell variables do not persist between your Bash calls, so every command below that touches the data dir starts with the prefix \`${ENV}\` (as written).

YOUR SPAN: span ${kk}. Its cue file: ${D}/spans/${kk}.json = {span:[t0,t1], sections:[...], cues:[...]} (show seconds). EDIT ONLY THIS FILE (plus the notes file below). Other agents edit the other spans in parallel. Never edit project source files, never git commit.

REFERENCE MATERIAL (the video and everything derived from it is copyrighted: it stays in ${D}, never in the repo)
- Video frames: ${D}/f4/NNNNN.jpg — 4 frames per second, 480x270, index = round(video_seconds*4) (00000 = 0.00 s, 00001 = 0.25 s ...). View with Read.
- Contact sheets: \`${ENV} ${PY} ${R}/tools/video/sheet.py sheet_${kk}_<name>.jpg <t0> <t1> <step> [cols]\` (video seconds, labels burned in; written to ${D}/work/sheets/; e.g. step 1 and 4 cols = 16 frames per sheet at 16 s per sheet). VIEW EVERY SECOND OF YOUR SPAN at least once at 1 fps, then zoom to 0.25 s frames around every event.
- Measured signals: ${D}/signals/${kk}.txt (same as ${R}/research/video-timeline/data/signals/${kk}.txt) — per 0.5 s: luma, dark %, white-hot %, fire % (saturated red..yellow), fire upper/lower half, white upper half, top saturated hues, camera CUT marks; plus the exact camera cut list and the list of frames that suddenly brighten (flash/strobe/fireball candidates) at 1/25 s precision. All cut times: ${D}/cuts.json.
- Video time -> show time: show = video - 0.036 (the video's soundtrack is 36 ms behind the show audio).
- Music (the show's clock IS the audio): ${R}/public/show/audio-map.json — segments (measured tempo grid per track), events (drops, breakdowns, impacts), onsets[] (sharp hits in the free-tempo parts: Vivaldi, Discorecord intro, bridge, Domitor, outro). The show file's own tempo[] is that measured grid. research/audio-map.md explains it. \`cd ${R} && ${PY} scripts/check-sync.py\` measures sync.
- Show vocabulary and semantics: ${R}/docs/show-format.md (READ IT FULLY) and docs/show-format-ext/*.md, named anchors/targets in ${R}/src/data/layout.gen.ts, stage anatomy research/design-bible.md, previous observed timelines research/video-timeline/${kk}.md and research/show-timeline-notes.md, palettes in public/show/endshow-2026.json.
- World coordinates (metres): stage front edge z=0, audience towards +z, +x = the spectator's right. Central deck x ±37; castle facade z −12, towers x ±17.3 / ±25.5; side sections to x ±92; arms along x ±92..94 from z −4 to 58; lantern pillars at x ±20, z 36/69/102/135 (top ~12.8 m); FOH platform z 87–93; photo terrace deck (0, 5, 167.6). Camera pose params: cam=x,y,z,yaw,pitch — yaw 0 looks at the stage (−z), yaw +0.5 turns to the spectator's left, pitch + looks up (radians).

METHOD
1. Read the span file, research/video-timeline/${kk}.md, docs/show-format.md, the signals file.
2. Watch the whole span (contact sheets at 1 fps; then single frames). Build an observed timeline: for every camera shot (between cuts): framing (drone high/low, wide axis, side, pillar top, deck close-up, crowd/pit level, telephoto), and every visible effect with its time: pyro (flames — where, height, colour, single hits vs chases, fireballs; gerbs/fountains; comets; bengal flares; sparkulars; waterfalls; CO2 jets; confetti/streamers), fireworks (shells: colour, type — peony/chrysanthemum/willow/kamuro/crackle/palm/strobe, break height, spread, number; cakes; comet fans; mines), lasers (colour, source, pattern: fan, sheet, tunnel, web, chevron, cone, beams-over-crowd), lights (moving-head beam colours, density, pattern, strobes, blinders, washes, pillar lanterns), stage LEDs / dragon (eye colour, windows, wings, rosettes, castle outline, screens content), fog/haze/low fog, performers. Use the flash list and fire/white % to time onsets to 1/25 s.
3. Compare with the current cues. Render OUR show against the video at 8–16 key moments (GPU rendering: a few seconds per shot): start a dev server \`cd ${R} && (npx vite --port ${port} --strictPort > ${D}/work/vite-${port}.log 2>&1 &)\`, then merge YOUR span into the current show \`${ENV} ${PY} ${R}/tools/video/merge.py --spans ${kk} --out ${D}/work/merged_${kk}.json\` (if it reports STALE SPANS, stop and report it: the spans were split from an older show file) and run \`${ENV} node ${R}/tools/video/vcompare.mjs --port ${port} --frames ${D}/f4 --show ${D}/work/merged_${kk}.json --out ${D}/work/compare/cmp_${kk}_<name>.jpg --settle 600 --shots "<video_t>|x,y,z,yaw,pitch,fov;..."\` (max 8 shots per call, pick a pose that frames the stage like the video frame; or --showcam with shots "<video_t>;<video_t>" to see our Show camera). The sheet lands in ${D}/work/compare/. View it (left video, right ours).
4. REWRITE the span's cues so the show matches the video: add every visible effect that is missing, remove invented effects that the video clearly does not show (only when the relevant area is in frame), correct colours, targets (use the anchors; the design bible maps stage parts to anchors), heights, spreads, patterns, intensities, looks and durations. Prefer the cue vocabulary as documented; unknown params are allowed as documented "extensions" only if the engine uses them — otherwise note them in unresolved/engineRequests.
5. TIMING (the user compares side by side, so timing matters as much as content): take the visual onset (video s − 0.036), then lock it to the music: inside a steady track snap to the nearest beat or half beat of the show's tempo[] when within 0.12 s (use \`snap\` or exact times), in the free-tempo parts snap to the nearest audio-map onset within 0.15 s; look changes start on the nearest musical boundary (downbeat / section start) to the visual change. Fireworks: the shell cue time is the LAUNCH; the break happens after lift 0.8 + 0.021·height s (docs/show-format.md) — place the cue so the BREAK lands on the visible burst time. Section starts/ends are measured from the audio: never change them; you may change a section's label/kind/energy/palette in your file.
6. CAMERA: rewrite the camera.shot cues of your span to follow the official edit, so our "Show camera" mode mirrors the video: one shot per video cut (cuts.json; ignore cuts < 0.8 s apart that are only flashes), t = cut − 0.036 (snap to a beat when within 0.08 s), dur = until the next cut, pos/look/fov estimated from the frame (use pos→to and look→lookTo with ease for moving drone/crane shots; p.subject='mc' for shots that follow the MC, docs/show-format-ext/core.md). Keep shots inside the world (the validator checks sight lines).
7. Validate: \`${ENV} ${PY} ${R}/tools/video/merge.py --spans ${kk} --out ${D}/work/merged_${kk}.json\` must print "valid" with 0 errors (fix warnings that concern your span). Then \`cd ${R} && ${PY} scripts/check-sync.py ${D}/work/merged_${kk}.json\` — hits in steady tracks must stay on the grid. Objective check of the Show camera for a few moments of your span: \`cd ${R} && ${ENV} node scripts/similarity.mjs --port ${port} --frames ${D}/f4 --settle 500 --min-frames 30 --times <t1,t2,...> --out ${D}/work/sim/span_${kk}\` (it renders the served show file, so only use it after the merged show is applied, or skip it).
8. Update the observed timeline in ${R}/research/video-timeline/${kk}.md — a table (video time, show time, shot framing, what is visible, confidence) plus a short list of what you changed. Plain text, no images, no paths into ${D}.
9. Kill your dev server by PID (\`pgrep -f "port ${port} --strictPort"\`; never pkill a pattern that could hit other agents' servers), then return the report.
Budget your effort: the span has ~120–220 s of video; cover all of it.`
}

phase('Match')
const EXTRA = A.extra ? `\n\nRUN CONTEXT: ${A.extra}` : ''
const results = await parallel(
  A.spans.map((k, i) => () => agent(prompt(k, (A.portBase || 5410) + i) + EXTRA, { label: `video:${String(k).padStart(2, '0')}`, phase: 'Match', schema: REPORT })),
)
return results.filter(Boolean)
