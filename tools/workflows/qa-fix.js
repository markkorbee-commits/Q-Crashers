/**
 * Workflow: QA fix round. One fixer agent per module group, each in its own git worktree, fed with a findings file.
 *
 * ARGS (Workflow scripts have no fs/process access: every path comes from here; an args JSON string is parsed too)
 *   repo         (required) absolute path of the repository checkout (the integrated branch), e.g. "/Users/<you>/Projects/Q-Crashers"
 *   data         (required) absolute path of $ENDSHOW_DATA, e.g. "/Users/<you>/Projects/endshow-data" (video frames f4/,
               work/ ...; see HANDOFF.md / CLAUDE.md). Every data-dir command in the prompts carries
               ENDSHOW_DATA=<data> PYTHON=<python>: the fixers' worktrees must not fall back to a guessed data dir.
 *   round        (required) round number; the fixer of group <key> reads `${findingsDir}/r${round}_${key}.md`
 *   groups       (required) [{ key, owned }] — key names the findings file, owned = the files/dirs this fixer may edit
 *                (make the owned sets disjoint: the fixers run in parallel)
 *   findingsDir  directory with the findings files (default `${repo}/docs/handoff/findings`)
 *   portBase     first dev-server port; group i uses portBase + i (default 5400)
 *   python       python with numpy + Pillow (default `${data}/venv/bin/python`)
 *   trailers     commit trailer lines the fixers must end their commit message with (default: none; pass the attribution
               lines your own session uses, see CLAUDE.md "Git")
 *   extra        optional round context appended to every prompt
 * Write the findings files first (one per group: what is wrong, evidence with video times, measurements, the files
 * the group owns and must not touch). After the run: merge each fixer's branch, re-measure (scripts/similarity.mjs),
 * stop iterating when a round brings no measurable gain (CLAUDE.md, "Stop rule").
 * Example call (Workflow tool): scriptPath "/Users/<you>/Projects/Q-Crashers/tools/workflows/qa-fix.js", args
 *   {"repo":"/Users/<you>/Projects/Q-Crashers","data":"/Users/<you>/Projects/endshow-data","round":5,"portBase":5460,
 *    "groups":[{"key":"lightbalance","owned":"src/world/worldLights.ts, src/lighting/**"}]}
 */
export const meta = {
  name: 'qa-fixers',
  description: 'QA fix round: one fixer per module group in its own worktree, fed with a findings file; args = {repo, data, round, groups:[{key, owned}], findingsDir?, portBase?, python?, trailers?, extra?}',
  phases: [{ title: 'Fix', detail: 'fix findings per module group' }],
}

const A = typeof args === 'string' ? JSON.parse(args) : args
if (!A || !A.repo || !A.data || !A.round || !Array.isArray(A.groups)) throw new Error('args = {repo, data, round, groups:[{key, owned}]} required (see the header of tools/workflows/qa-fix.js)')
const R = A.repo
const D = A.data
const PY = A.python || `${D}/venv/bin/python`
const ENV = `ENDSHOW_DATA="${D}" PYTHON="${PY}"`
const round = A.round
const FINDINGS = A.findingsDir || `${R}/docs/handoff/findings`
const TRAILERS = A.trailers ? ` (end the message with these trailer lines: ${A.trailers})` : ''

const REPORT = {
  type: 'object',
  properties: {
    worktree: { type: 'string' }, branch: { type: 'string' }, commit: { type: 'string' },
    fixed: { type: 'array', items: { type: 'string' } },
    notFixed: { type: 'array', items: { type: 'string' }, description: 'finding titles not fixed + why' },
    contractRequests: { type: 'string' },
    measurements: { type: 'string', description: 'before/after numbers (similarity score + parts, draw calls, CPU ms) for the moments you checked' },
    screenshots: { type: 'array', items: { type: 'string' } },
  },
  required: ['worktree', 'branch', 'commit', 'fixed', 'notFixed', 'contractRequests', 'measurements', 'screenshots'],
}

const prompt = (g, i) => {
  const port = (A.portBase || 5400) + i
  return `
You are a senior real-time graphics engineer fixing QA findings (round ${round}) in "Defqon.1 2026 — The Endshow Experience" (Three.js r186 / WebGL2 / TypeScript / Vite): a real-time reconstruction of the Defqon.1 2026 Endshow (empty-grounds show of Saturday 27 June 2026 after the heat cancellation; MainStage = mechanical dragon + bat wings over a gothic castle, 8 lantern-pillar delay towers). The user compares it side by side with the official video. Fix for "impressive and faithful", not merely "works". Read CLAUDE.md in your working copy first (project rules).
WORKING COPY: your cwd is an isolated git worktree of the integrated project. First: \`pwd && git log --oneline | head -3 && ls ${D}/f4 | wc -l\` (6324 video frames expected); if node_modules is missing: \`ln -s ${R}/node_modules node_modules\` (git-ignored, never commit it); if public/assets/audio has no audio file, symlink the files from ${R}/public/assets/audio/ (git-ignored too).
YOUR MODULE GROUP: ${g.key}. FILES YOU MAY EDIT: ${g.owned}. Everything else is read-only (other fixers edit other modules in parallel); if a finding needs a change elsewhere, describe it in contractRequests.
FINDINGS TO FIX (fix all blockers and majors, as many minors as sensible; verify each fix with before/after renders): READ THE FULL LIST FROM ${FINDINGS}/r${round}_${g.key}.md (Read tool) before doing anything else. Paths in it are relative to $ENDSHOW_DATA = ${D} unless absolute.
DATA DIR + PYTHON: shell variables do not persist between your Bash calls, so EVERY command below that touches the data dir starts with the prefix \`${ENV}\` (as written); never rely on a default data dir from inside the worktree.
Authoritative research: research/design-bible.md, research/terrain-layout.json, research/video-timeline/NN.md (observed video timeline per span), docs/show-format.md + docs/show-format-ext/*.md (cue contract).
REFERENCE = THE OFFICIAL VIDEO: frames ${D}/f4/NNNNN.jpg (4 fps, 480x270, index = round(video_s*4); show time = video − 0.036). Contact sheets: \`${ENV} ${PY} tools/video/sheet.py <name>.jpg <t0> <t1> <step> [cols] --frames ${D}/f4\` (-> ${D}/work/sheets/). Optional photos the user supplied (e.g. daytime photos) live in ${D}/refs/ if present. Never copy any of this into the repo.
RUN & SEE: \`(npx vite --port ${port} --strictPort > ${D}/work/vite-${port}.log 2>&1 &)\`; screenshots \`node scripts/shot.mjs "<query>" .shots/fix${round}-<name>.png --base http://localhost:${port}/ --wait 3000 [--size WxH] [--mobile] [--eval "js"]\` and VIEW them (Read). Params: autostart, t=<s>, play, cam=x,y,z,yaw,pitch, spot=<id>, camera=<mode>, quality=..., debug, mode=filmed, off=..., nopost. Side by side with the video: \`${ENV} node tools/video/vcompare.mjs --port ${port} --frames ${D}/f4 --out ${D}/work/compare/fix${round}_${g.key}_<name>.jpg --settle 600 --shots "<video_t>|x,y,z,yaw,pitch,fov;..."\` (or --showcam with plain times). Objective metric (Show camera vs video; read the script headers): \`${ENV} node scripts/similarity.mjs --port ${port} --frames ${D}/f4 --settle 500 --min-frames 30 --times <list> --out ${D}/work/sim/r${round}_${g.key}_<name>\`; the 32-moment set is research/video-timeline/data/similarity-times32.txt, the 64-moment baseline research/video-timeline/data/similarity-baseline.json. Renders run on the GPU (check the "[browser] WebGL renderer" line: it must name the Apple GPU, not SwiftShader). Mobile budget: \`node scripts/budget-check.mjs --base http://localhost:${port}/\`. Show validator: \`node scripts/validate-show.mjs --quiet\`.
RULES: show visuals are a pure function of show time (deterministic; seek = same image); no per-frame allocations; honour quality presets (mobile light: draw-call budget 110); TypeScript strict passes (\`npx tsc --noEmit\`); no console errors; don't break other modules' contracts; CDJ-style gear without real brand logos; no DJ figure in the Endshow.
FINISH: \`git add -A && git commit -m "<clear message>"\`${TRAILERS}, kill your dev server by PID (\`pgrep -f "port ${port} --strictPort"\`), return the report.`
}

const EXTRA = A.extra ? `\n\nROUND CONTEXT: ${A.extra}` : ''
phase('Fix')
const results = await parallel(A.groups.map((g, i) => () => agent(prompt(g, i) + EXTRA, { label: `fix:${g.key}`, phase: 'Fix', schema: REPORT, isolation: 'worktree' }).then((r) => (r ? { key: g.key, ...r } : null))))
return results.filter(Boolean)
