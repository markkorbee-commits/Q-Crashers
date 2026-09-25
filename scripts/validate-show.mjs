#!/usr/bin/env node
/**
 * Validates a show file (default: public/show/endshow-2026.json) against the show contract.
 *
 *   node scripts/validate-show.mjs [file] [--dump[=sys,sys]] [--from=s] [--to=s] [--json] [--quiet]
 *
 * The vocabulary is read from the contract sources themselves (no copy that can drift):
 *   docs/show-format.md     fx per system + enumerated param values (`param`: `a` \| `b` ...)
 *   src/data/layout.gen.ts  LAYOUT_ANCHORS keys = AnchorName (valid cue targets, + filters all/left/right/center)
 *   src/show/colors.ts      NAMED_COLORS
 *   src/show/ShowTypes.ts   SystemId, SectionKind, RepeatEvery
 * Repeats are expanded with a line-by-line port of TempoMap + ShowEngine.expand, so the counts are
 * exactly what the engine compiles (before any audio-analysis tempo refinement).
 *
 * Errors (exit 1): schema violations, gaps/overlaps in tempo or sections, unknown sys/fx, invalid
 * targets/colours/enumerations, broken repeats, sections without explicit looks.
 * Warnings: contract extensions in use (listed so the systems can adopt them), odd timings.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => {
  const a = args.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  if (!a) return undefined;
  const i = a.indexOf('=');
  return i < 0 ? true : a.slice(i + 1);
};
const file = args.find((a) => !a.startsWith('--')) ?? path.join(ROOT, 'public/show/endshow-2026.json');
const QUIET = !!opt('quiet');

// ------------------------------------------------------------------------------ contract sources
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
function unionOf(src, typeName) {
  const m = src.match(new RegExp(`export type ${typeName}\\s*=([\\s\\S]*?);`));
  if (!m) throw new Error(`type ${typeName} not found`);
  return [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]);
}
const typesSrc = read('src/show/ShowTypes.ts');
const SYSTEMS = new Set(unionOf(typesSrc, 'SystemId'));
const KINDS = new Set(unionOf(typesSrc, 'SectionKind'));
const EVERY = new Set(unionOf(typesSrc, 'RepeatEvery'));
const ANCHORS = new Set([
  ...unionOf(read('src/core/Anchors.ts'), 'AnchorName'),
  ...[...read('src/data/layout.gen.ts').matchAll(/^  ([a-z_]+):/gm)].map((m) => m[1]),
]);
const FILTERS = new Set(['all', 'left', 'right', 'center']);
const NAMED = new Set([...read('src/show/colors.ts').matchAll(/^\s*([a-z]+):\s*'#[0-9a-fA-F]{6}'/gm)].map((m) => m[1]));
const PALETTE_REFS = new Set(['primary', 'secondary', 'accent']);
/** viewing spots (src/player/spots.ts DEFAULT_SPOTS) — moments may recommend one */
const SPOT_IDS = new Set([...read('src/player/spots.ts').matchAll(/spot\('([a-z_]+)'/g)].map((m) => m[1]));

/** docs/show-format.md → { sys: { fx: { param: Set(values) } } } */
function parseVocabulary(md) {
  const vocab = {};
  let sys = null;
  for (const lineRaw of md.split('\n')) {
    const line = lineRaw.trim();
    const h = line.match(/^##\s+([a-z]+)\b/);
    if (h) {
      sys = SYSTEMS.has(h[1]) ? h[1] : null;
      if (sys) vocab[sys] = vocab[sys] ?? {};
      continue;
    }
    if (!sys || !line.startsWith('|')) continue;
    const cells = line.split(/(?<!\\)\|/).map((c) => c.trim());
    const fxm = cells[1]?.match(/^`([a-z_]+)`$/);
    if (!fxm) continue;
    const fx = fxm[1];
    const params = (vocab[sys][fx] = vocab[sys][fx] ?? {});
    const rest = cells.slice(2).join(' | ');
    // `param`: `a` \| `b` (comment) \| `c` — scan values while they are joined by an escaped pipe
    for (const m of rest.matchAll(/`([a-zA-Z0-9_]+)`:\s*/g)) {
      let s = rest.slice(m.index + m[0].length);
      const vals = [];
      for (;;) {
        const v = s.match(/^`([a-z0-9_]+)`(\s*\([^)]*\))?\s*/);
        if (!v) break;
        vals.push(v[1]);
        s = s.slice(v[0].length);
        const sep = s.match(/^\\\|\s*/);
        if (!sep) break;
        s = s.slice(sep[0].length);
      }
      if (vals.length > 1) params[m[1]] = new Set(vals);
    }
    const g = rest.match(/`groups`:\s*subset of\s*((?:`[a-z]+`,?\s*)+)/);
    if (g) params.groups = new Set([...g[1].matchAll(/`([a-z]+)`/g)].map((x) => x[1]));
  }
  return vocab;
}
const VOCAB = parseVocabulary(read('docs/show-format.md'));

/**
 * Contract extensions this show uses (proposed in the module report; the systems ignore what they do
 * not know, so every one of them degrades gracefully). Anything not listed here is an error.
 */
const EXT_ENUM = {
  'lasers.look.preset': ['chevron'],
  'pyro.burst.type': ['bengal'],
  // crowd states the crowd module implements beyond the documented list ("losse polsjes", pre-drop crouch …)
  'crowd.mood.state': ['pols', 'crouch', 'clap', 'stomp', 'sit', 'headbang'],
  'screens.content.pattern': ['solid', 'chase', 'pulse', 'sparkle', 'split', 'stripes', 'dashes', 'dots', 'fire', 'wave', 'runes'],
  'fog.lowfog.area': ['deck', 'field', 'all'],
  'fireworks.comet.end': ['none', 'pearl', 'crackle', 'brocade', 'strobe', 'willow', 'peony', 'crossette', 'palm', 'kamuro'],
  'fireworks.salvo.pattern': ['line', 'v', 'arc', 'random'],
};
/** preferred extended anchors (p.at) — the cue's `target` is the contract fallback */
const EXT_ANCHORS = new Set(['flare_pots', 'corner_towers', 'tower_torches', 'arms', 'arm_ends', 'side_fronts', 'wing_spars', 'hang_lines', 'piano']);
const COLOR_PARAMS = new Set(['color', 'color2', 'eyes', 'rosettes', 'windowColor', 'tint', 'shaft']);
const CAMERA_EASE = new Set(['linear', 'in', 'out', 'inout']);
const DEFAULT_DUR = { pyro: 0.8, fireworks: 0.2, strobe: 0.25, lasers: 4, lights: 8, crowd: 2, stage: 4, screens: 8, fog: 6, camera: 6, atmos: 10 };

// ------------------------------------------------------------------------------ helpers
const errors = [];
const warnings = [];
const extUse = new Map();
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const noteExt = (k) => extUse.set(k, (extUse.get(k) ?? 0) + 1);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isHex = (s) => typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s);
const validColor = (s) => typeof s === 'string' && (PALETTE_REFS.has(s) || NAMED.has(s) || isHex(s));
/** fireworks accept a colour list (array or comma list, cycled per shell/comet — docs "Implementation extensions") */
const validColorList = (v) =>
  Array.isArray(v) ? v.length > 0 && v.every(validColor) : typeof v === 'string' && v.split(',').every((x) => validColor(x.trim()));
const fmtT = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const cueRef = (c, i) => `cue #${i} (t=${c.t} ${c.sys}.${c.fx})`;

let show;
try {
  show = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`✗ cannot read/parse ${file}: ${e.message}`);
  process.exit(1);
}

// ------------------------------------------------------------------------------ top level + meta
if (show.version !== 1) err('version must be 1');
for (const k of ['meta', 'chapters', 'tempo', 'sections', 'palettes', 'moments', 'cues']) if (show[k] === undefined) err(`missing top-level "${k}"`);
const meta = show.meta ?? {};
const D = meta.duration;
if (!isNum(D) || D <= 0) err('meta.duration must be a positive number');
if (typeof meta.id !== 'string' || typeof meta.title !== 'string') err('meta.id / meta.title must be strings');
if (!Array.isArray(meta.audio?.src) || meta.audio.src.length === 0) err('meta.audio.src must be a non-empty array');

// chapters
let prev = -1;
for (const [i, c] of (show.chapters ?? []).entries()) {
  if (!isNum(c.t) || c.t < 0 || c.t >= D) err(`chapter ${i}: t out of range`);
  if (c.t <= prev) err(`chapter ${i}: not sorted`);
  if (typeof c.title !== 'string' || typeof c.artist !== 'string') err(`chapter ${i}: title/artist`);
  prev = c.t;
}

// palettes
const palettes = show.palettes ?? {};
for (const [k, p] of Object.entries(palettes)) {
  for (const f of ['primary', 'secondary', 'accent']) if (!isHex(p[f])) err(`palette ${k}.${f} is not #rrggbb`);
  if (p.atmos !== undefined && !isHex(p.atmos)) err(`palette ${k}.atmos is not #rrggbb`);
}

// contiguous coverage check for tempo + sections
function coverage(list, name, cb) {
  if (!Array.isArray(list) || list.length === 0) return err(`${name} is empty`);
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (!isNum(s.start) || !isNum(s.end) || s.end <= s.start) err(`${name}[${i}] invalid start/end (${s.start}–${s.end})`);
    if (i === 0 && Math.abs(s.start) > 1e-6) err(`${name}[0] must start at 0 (starts ${s.start})`);
    if (i > 0) {
      const gap = s.start - list[i - 1].end;
      if (Math.abs(gap) > 1e-6) err(`${name}[${i}] ${gap > 0 ? 'gap' : 'overlap'} of ${Math.abs(gap).toFixed(3)} s at ${list[i - 1].end}`);
      if (s.start < list[i - 1].start) err(`${name}[${i}] not sorted`);
    }
    if (i === list.length - 1 && Math.abs(s.end - D) > 1e-6) err(`${name} must end at meta.duration ${D} (ends ${s.end})`);
    cb?.(s, i);
  }
}

// tempo
coverage(show.tempo, 'tempo', (s, i) => {
  if (!isNum(s.bpm) || s.bpm < 60 || s.bpm > 220) err(`tempo[${i}] bpm ${s.bpm} out of 60–220`);
  if (!isNum(s.anchor)) err(`tempo[${i}] anchor missing`);
  if (typeof s.kick !== 'boolean') err(`tempo[${i}] kick must be boolean`);
  if (s.beatsPerBar !== undefined && ![3, 4].includes(s.beatsPerBar)) err(`tempo[${i}] beatsPerBar must be 3 or 4`);
  if (s.source !== undefined && !['authored', 'analyzed'].includes(s.source)) err(`tempo[${i}] source`);
  const bar = (240 / s.bpm);
  if (isNum(s.anchor) && (s.anchor < s.start - bar - 1e-6 || s.anchor > s.end + 1e-6)) warn(`tempo[${i}] anchor ${s.anchor} is not inside ${s.start}–${s.end}`);
});

// sections
coverage(show.sections, 'sections', (s, i) => {
  if (!KINDS.has(s.kind)) err(`sections[${i}] kind "${s.kind}" not a SectionKind`);
  if (!isNum(s.energy) || s.energy < 0 || s.energy > 1) err(`sections[${i}] energy must be 0..1`);
  if (!palettes[s.palette]) err(`sections[${i}] palette "${s.palette}" not defined`);
  if (typeof s.label !== 'string' || !s.label) err(`sections[${i}] label`);
});
const usedPalettes = new Set((show.sections ?? []).map((s) => s.palette));
for (const k of Object.keys(palettes)) if (!usedPalettes.has(k)) warn(`palette ${k} is never used by a section`);

// moments
const moments = show.moments ?? [];
if (moments.length < 15 || moments.length > 25) warn(`${moments.length} moments (target 15–25)`);
prev = -1;
for (const [i, m] of moments.entries()) {
  if (!isNum(m.t) || m.t < 0 || m.t >= D) err(`moment ${i} t out of range`);
  if (m.t < prev) err(`moment ${i} not sorted`);
  if (typeof m.label !== 'string' || !m.label) err(`moment ${i} label`);
  // optional viewing hints (UI: seek to t − lead and play; offer "watch from <spot>")
  if (m.lead !== undefined && (!isNum(m.lead) || m.lead < 0 || m.lead > 10)) err(`moment ${i}: lead must be 0..10 s`);
  if (m.spot !== undefined && !SPOT_IDS.has(m.spot)) err(`moment ${i}: spot "${m.spot}" is not a spot id (${[...SPOT_IDS].join('|')})`);
  prev = m.t;
}

// ------------------------------------------------------------------------------ tempo map (port of src/show/TempoMap.ts)
const segs = [...(show.tempo ?? [])].sort((a, b) => a.start - b.start);
function segmentAt(t) {
  let lo = 0,
    hi = segs.length - 1,
    best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segs[mid].start <= t) {
      best = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return best < 0 ? segs[0] : segs[best];
}
const beatLength = (t) => 60 / segmentAt(t).bpm;
function stepSeconds(every, t) {
  if (typeof every === 'number') return every;
  const beat = beatLength(t);
  const bpb = segmentAt(t).beatsPerBar ?? 4;
  return { halfbeat: beat / 2, beat, '2beat': beat * 2, bar: beat * bpb, '2bar': beat * bpb * 2, '4bar': beat * bpb * 4, '8bar': beat * bpb * 8 }[every];
}
function snap(t, unit) {
  const seg = segmentAt(t);
  const bpb = seg.beatsPerBar ?? 4;
  const unitBeats = unit === 'beat' ? 1 : unit === 'halfbeat' ? 0.5 : bpb;
  const b = ((t - seg.anchor) * seg.bpm) / 60 / unitBeats;
  return seg.anchor + (Math.round(b) * unitBeats * 60) / seg.bpm;
}
function gridAdvance(t, step) {
  const next = t + step;
  const snapped = snap(next, 'halfbeat');
  return Math.abs(snapped - next) < beatLength(next) * 0.2 ? snapped : next;
}
/** port of ShowEngine.expand */
function* expand(def) {
  const targets = def.target === undefined ? ['all'] : Array.isArray(def.target) ? def.target : [def.target];
  const dur = def.dur ?? DEFAULT_DUR[def.sys] ?? 1;
  const p = def.p ?? {};
  let t0 = def.t;
  if (def.snap && def.snap !== 'none') t0 = snap(t0, def.snap);
  if (!def.repeat) {
    yield { t: t0, dur, targets, p, step: 0 };
    return;
  }
  const r = def.repeat;
  const until = r.until ?? Infinity;
  const maxCount = r.count ?? 100000;
  const pattern = r.pattern ?? 'x';
  let t = t0,
    fired = 0,
    stepIdx = 0;
  while (t < until && fired < maxCount && stepIdx < 20000) {
    if (pattern[stepIdx % pattern.length] !== '-') {
      let pp = p;
      if (r.cycle) {
        pp = { ...p };
        for (const [k, vals] of Object.entries(r.cycle)) pp[k] = vals[fired % vals.length];
      }
      const tg = r.cycleTargets ? r.cycleTargets[fired % r.cycleTargets.length] : targets;
      yield { t, dur, targets: tg, p: pp, step: fired };
      fired++;
    }
    stepIdx++;
    const step = stepSeconds(r.every, t);
    t = typeof r.every === 'number' ? t0 + stepIdx * step : gridAdvance(t, step);
  }
  if (stepIdx >= 20000) err(`repeat hit the engine's 20000-step cap (t=${def.t} ${def.sys}.${def.fx})`);
}

// ------------------------------------------------------------------------------ cues
function checkTargets(list, where) {
  for (const t of list) {
    if (typeof t !== 'string') err(`${where}: target must be a string`);
    else if (!ANCHORS.has(t) && !FILTERS.has(t)) err(`${where}: unknown target "${t}" (not an AnchorName or filter)`);
  }
}
function checkParams(c, where) {
  const p = c.p ?? {};
  const spec = VOCAB[c.sys]?.[c.fx] ?? {};
  for (const [k, v] of Object.entries(p)) {
    const key = `${c.sys}.${c.fx}.${k}`;
    if (COLOR_PARAMS.has(k)) {
      const ok = c.sys === 'fireworks' && k === 'color' ? validColorList(v) : validColor(v);
      if (!ok) err(`${where}: ${k} "${v}" is not a palette ref, named colour or #rrggbb`);
    } else if (k === 'palette') {
      if (!Array.isArray(v) || !v.length || !v.every(validColor)) err(`${where}: palette must be a non-empty colour list`);
    } else if (k === 'at') {
      if (!EXT_ANCHORS.has(v)) err(`${where}: p.at "${v}" is not a documented extension anchor`);
      noteExt(`${c.sys}.${c.fx}: p.at=${v} (fallback target ${JSON.stringify(c.target)})`);
      continue;
    } else if (k === 'groups') {
      const vals = Array.isArray(v) ? v : [v];
      const allowed = spec.groups;
      for (const g of vals) if (allowed && !allowed.has(g)) err(`${where}: groups value "${g}" not in ${[...allowed].join('|')}`);
      continue;
    }
    const allowed = spec[k];
    if (allowed && typeof v === 'string' && !COLOR_PARAMS.has(k)) {
      if (!allowed.has(v)) {
        if (EXT_ENUM[key]?.includes(v)) noteExt(`${key}=${v}`);
        else err(`${where}: ${k}="${v}" not in the vocabulary (${[...allowed].join('|')})`);
      }
    } else if (!allowed && !COLOR_PARAMS.has(k) && k !== 'palette') {
      if (EXT_ENUM[key]) {
        if (!EXT_ENUM[key].includes(v)) err(`${where}: ${k}="${v}" not in the extension list ${EXT_ENUM[key].join('|')}`);
        else noteExt(`${key}=${v}`);
        continue;
      }
      // params the doc does not list for this fx: allowed (systems ignore unknown params) but reported
      const documented = new Set(['intensity', 'color', 'color2', 'fade', 'speed', 'kick', 'height', 'count', 'spread', 'tilt', 'size', 'type', 'dur']);
      if (!documentedParam(c.sys, c.fx, k) && !documented.has(k)) noteExt(`${c.sys}.${c.fx}: param "${k}"`);
    }
    if (['intensity', 'energy'].includes(k) && isNum(v) && (v < 0 || v > 3)) warn(`${where}: ${k}=${v} outside 0..3`);
  }
  if (c.sys === 'camera' && c.fx === 'shot') {
    const v3 = (x) => Array.isArray(x) && x.length === 3 && x.every(isNum);
    if (p.preset === undefined && (!v3(p.pos) || !v3(p.look))) err(`${where}: camera.shot needs pos + look [x,y,z]`);
    for (const k of ['to', 'lookTo']) if (p[k] !== undefined && !v3(p[k])) err(`${where}: camera ${k} must be [x,y,z]`);
    if (p.fov !== undefined && (!isNum(p.fov) || p.fov < 10 || p.fov > 110)) err(`${where}: fov must be 10..110`);
    if (p.ease !== undefined && !CAMERA_EASE.has(p.ease)) err(`${where}: ease "${p.ease}"`);
    if (v3(p.pos) && (p.pos[1] < 0.3 || Math.abs(p.pos[0]) > 700 || p.pos[1] > 400 || Math.abs(p.pos[2]) > 900)) warn(`${where}: camera pos ${p.pos} looks off-site`);
  }
}
const DOC_PARAMS = (() => {
  // every `name` mentioned in a table row counts as documented for that fx
  const md = read('docs/show-format.md');
  const out = {};
  let sys = null;
  for (const line of md.split('\n')) {
    const h = line.trim().match(/^##\s+([a-z]+)\b/);
    if (h) {
      sys = SYSTEMS.has(h[1]) ? h[1] : null;
      continue;
    }
    if (!sys || !line.trim().startsWith('|')) continue;
    const cells = line.split(/(?<!\\)\|/).map((c) => c.trim());
    const fx = cells[1]?.match(/^`([a-z_]+)`$/)?.[1];
    if (!fx) continue;
    out[`${sys}.${fx}`] = new Set([...cells.slice(2).join(' ').matchAll(/`([a-zA-Z0-9_]+)`/g)].map((m) => m[1]));
  }
  return out;
})();
function documentedParam(sys, fx, k) {
  return DOC_PARAMS[`${sys}.${fx}`]?.has(k) ?? false;
}

const cues = show.cues ?? [];
const expanded = [];
for (const [i, c] of cues.entries()) {
  const where = cueRef(c, i);
  if (!isNum(c.t) || c.t < 0 || c.t > D) err(`${where}: t out of range`);
  if (c.dur !== undefined && (!isNum(c.dur) || c.dur <= 0)) err(`${where}: dur must be > 0`);
  if (!SYSTEMS.has(c.sys)) {
    err(`${where}: unknown system "${c.sys}"`);
    continue;
  }
  if (!VOCAB[c.sys]?.[c.fx]) {
    err(`${where}: fx "${c.fx}" is not in the ${c.sys} vocabulary (${Object.keys(VOCAB[c.sys] ?? {}).join(', ')})`);
    continue;
  }
  if (c.target !== undefined) checkTargets(Array.isArray(c.target) ? c.target : [c.target], where);
  if (c.snap !== undefined && !['beat', 'halfbeat', 'bar', 'none'].includes(c.snap)) err(`${where}: snap "${c.snap}"`);
  checkParams(c, where);
  if (c.repeat) {
    const r = c.repeat;
    if (!(EVERY.has(r.every) || (isNum(r.every) && r.every > 0))) err(`${where}: repeat.every "${r.every}"`);
    if (r.until === undefined && r.count === undefined) err(`${where}: repeat needs until or count`);
    if (r.until !== undefined && (!isNum(r.until) || r.until <= c.t || r.until > D + 1)) err(`${where}: repeat.until ${r.until} invalid`);
    if (r.count !== undefined && (!Number.isInteger(r.count) || r.count < 1)) err(`${where}: repeat.count`);
    if (r.pattern !== undefined && !/^[x-]*x[x-]*$/.test(r.pattern)) err(`${where}: repeat.pattern "${r.pattern}"`);
    if (r.cycle) for (const [k, v] of Object.entries(r.cycle)) {
      if (!Array.isArray(v) || !v.length) err(`${where}: repeat.cycle.${k} must be a non-empty array`);
      else for (const x of v) checkParams({ ...c, p: { [k]: x } }, `${where} cycle`);
    }
    if (r.cycleTargets) {
      if (!Array.isArray(r.cycleTargets) || !r.cycleTargets.length) err(`${where}: cycleTargets`);
      else r.cycleTargets.forEach((tl) => checkTargets(tl, `${where} cycleTargets`));
    }
  }
  if (c.note !== undefined && typeof c.note !== 'string') err(`${where}: note must be a string`);
  for (const x of expand(c)) {
    expanded.push({ ...x, sys: c.sys, fx: c.fx, def: i });
    if (x.t + x.dur > D + 0.5) warn(`${where}: runs past the end (${(x.t + x.dur).toFixed(2)})`);
  }
}
expanded.sort((a, b) => a.t - b.t);

// ------------------------------------------------------------------------------ section coverage: explicit looks
const REQUIRED = [
  ['lights look', (c) => c.sys === 'lights' && c.fx === 'look'],
  ['lights wash', (c) => c.sys === 'lights' && c.fx === 'wash'],
  ['pillars', (c) => c.sys === 'lights' && c.fx === 'pillars'],
  ['lasers look/off', (c) => c.sys === 'lasers' && (c.fx === 'look' || c.fx === 'off')],
  ['stage state', (c) => c.sys === 'stage' && c.fx === 'state'],
  ['stage LEDs (screens)', (c) => c.sys === 'screens' && c.fx === 'content'],
  ['fog level', (c) => c.sys === 'fog' && c.fx === 'level'],
  ['crowd mood', (c) => c.sys === 'crowd' && c.fx === 'mood'],
];
for (const s of show.sections ?? []) {
  for (const [name, pred] of REQUIRED) {
    if (!cues.some((c) => pred(c) && c.t >= s.start - 0.02 && c.t < s.end)) err(`section "${s.label}" (${s.start}–${s.end}) has no explicit ${name} cue`);
  }
  // musical gaps (short silences) must stay dark: no pyro / fireworks starting inside them
  if (s.kind === 'silence' && s.end - s.start < 6) {
    const loud = expanded.filter((x) => (x.sys === 'pyro' || x.sys === 'fireworks') && x.t >= s.start && x.t < s.end);
    if (loud.length) warn(`silence "${s.label}" contains ${loud.length} pyro/firework starts`);
  }
}

// exact duplicates (same start, system, fx, targets and params) are wasted work for the systems
{
  const seen = new Set();
  let dups = 0;
  for (const x of expanded) {
    const key = `${Math.round(x.t * 1000)}|${x.sys}|${x.fx}|${x.targets.join(',')}|${JSON.stringify(x.p)}`;
    if (seen.has(key)) dups++;
    else seen.add(key);
  }
  if (dups) warn(`${dups} exact duplicate expanded cue(s)`);
}

// camera coverage
const shots = expanded.filter((x) => x.sys === 'camera' && x.fx === 'shot');
let covered = 0,
  cursor = 0;
const gaps = [];
for (const s of shots) {
  if (s.t > cursor + 1) gaps.push([cursor, s.t]);
  const e = Math.min(D, s.t + s.dur);
  if (e > cursor) {
    covered += e - Math.max(cursor, s.t);
    cursor = e;
  }
}
if (D - cursor > 1) gaps.push([cursor, D]);
if (shots.length && gaps.length) warn(`camera: ${gaps.length} gaps without an authored shot (auto director fills them): ${gaps.slice(0, 5).map(([a, b]) => `${a.toFixed(1)}–${b.toFixed(1)}`).join(', ')}`);

// kick-sync check: grid-repeated pyro/strobe on kick segments must land on the (authored) beat grid
let offGrid = 0;
for (const x of expanded) {
  if (!cues[x.def].repeat || !['pyro', 'strobe', 'lights'].includes(x.sys)) continue;
  const every = cues[x.def].repeat.every;
  if (typeof every === 'number') continue;
  const seg = segmentAt(x.t);
  const unit = every === 'halfbeat' ? 0.5 : 1;
  const b = ((x.t - seg.anchor) * seg.bpm) / 60 / unit;
  if (Math.abs(b - Math.round(b)) * ((unit * 60) / seg.bpm) > 0.012) offGrid++;
}
if (offGrid) warn(`${offGrid} grid-repeated cues are more than 12 ms off the beat grid`);

// ------------------------------------------------------------------------------ storyboard liveness
/**
 * The official video's storyboard frame fN shows the picture at ≈ 9.881·N + 3…5 s (show-analysis §0 review
 * note: the effects in the frames are mature 1–5 s after their cue). Every frame whose analysis shows pyro or
 * aerial fireworks (FACT/INFERENCE, curated from scratchpad frames_*.json) must therefore have a cue of that
 * system at FULL strength over the whole window [9.881·N + 3, 9.881·N + 5] — otherwise a comparison at the
 * frame's real time shows an effect that has already ended (QA round 1: 76.2 gerbs, 769 comets, 1074 volleys…).
 * `sys`: 'pyro' | 'fireworks' | 'any' (either system; comet/fountain cakes read as both).
 */
const STORYBOARD = [
  [6, 'pyro', 'red Bengal pots at the front-line corners'], [7, 'pyro', '7 gerbs on the capitals + deck'],
  [8, 'pyro', '10–12 gerbs in fan + vertical clusters'], [9, 'any', 'V-layout gerb/comet fans'],
  [10, 'pyro', 'two orange corner fireballs'], [22, 'any', 'gold comet fan from the crest'],
  [23, 'fireworks', 'silver glitter comet fan'], [25, 'any', 'comet V-fans + white comet row'],
  [26, 'any', 'fountain/comet walls at the stage ends'], [33, 'any', 'vertical comet/gerb columns, full width'],
  [39, 'fireworks', 'red comet row'], [42, 'fireworks', '150° red comet fan'], [43, 'fireworks', 'gold comet line + red crossettes'],
  [45, 'fireworks', 'serpent comet row'], [49, 'pyro', '2 gold gerbs on the deck'], [54, 'fireworks', 'red crackle canopy'],
  [55, 'fireworks', 'red crackle canopy, two lobes'], [56, 'fireworks', 'gold brocade line'], [60, 'any', 'white gerb walls / flash mines'],
  [72, 'pyro', 'burning wings'], [75, 'fireworks', 'silver glitter tails'], [77, 'fireworks', 'silver glitter streams'],
  [78, 'fireworks', 'silver glitter comet barrage'], [79, 'fireworks', 'full-sky glitter curtain'],
  [82, 'fireworks', 'red/white comet columns'], [85, 'fireworks', 'red-pink crackle low over the roof'],
  [86, 'fireworks', 'orange X-fans at the arm ends'], [87, 'pyro', 'the flame ring'], [104, 'pyro', 'twin 15 m torches'],
  [109, 'fireworks', 'crossing comet barrage'], [119, 'pyro', '18–20 fountains along the front line'],
  [119, 'fireworks', 'row of ~17 comet heads'], [120, 'pyro', 'pink-white sprays along both arms'],
  [120, 'fireworks', 'pink/white crackle band'], [129, 'fireworks', 'pink/white crackle above the stage'],
  [130, 'pyro', '~6 fountains per arm'], [130, 'fireworks', '9 comets into a pink canopy'], [131, 'fireworks', 'huge red/pink canopy'],
  [142, 'fireworks', 'green mines on the roofline'], [143, 'fireworks', 'gold/orange comet streaks'],
  [144, 'pyro', 'silver gerb wall on the whole U'], [145, 'fireworks', 'gold comet trails'], [152, 'fireworks', 'low white/red roof bursts'],
  [153, 'pyro', 'gold gerb wall on the whole U'], [153, 'fireworks', 'finale crackle/brocade band'], [154, 'fireworks', 'fading falling stars'],
  [156, 'pyro', 'blue cold-fire plumes'], [157, 'pyro', 'blue cold-fire plumes'],
];
/** frames the check may not demand (reason recorded; keep this list short) */
const STORYBOARD_EXCEPT = {
  33: 'kick-2 columns are on the 330.28 downbeat (music first); f033 must be lagged ≥ 4.2 s',
};
const FRAME_DT = 9.881;
const riseOf = (h) => 0.8 + 0.021 * Math.max(0, h - 4);
const cometApex = (h) => 0.9 * Math.sqrt((2 * Math.max(3, h)) / 9.81);
const STAR_LIFE = { willow: 5.5, kamuro: 5.5, brocade: 5, crackle: 4, strobe: 4.5, glitter: 4.5, palm: 4, chrysanthemum: 3.8 };
const numOr = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
/** [start, end] during which an expanded cue's effect is at (near) full strength */
function fullWindow(x) {
  const p = x.p;
  const stag = numOr(p.stagger, 0);
  if (x.sys === 'pyro') {
    const tail = { flame: 0.3, firewall: 0.4, dragon_breath: 0.3, jet: 0.8, gerb: 0.3, sparkular: 0.2, waterfall: 1.5, bengal: 0.5 }[x.fx] ?? 0.3;
    if (x.fx === 'burst') return x.dur >= 2 ? [x.t, x.t + x.dur + 0.5] : [x.t, x.t + 0.6];
    return [x.t, x.t + x.dur + tail + stag * 20];
  }
  if (x.sys === 'fireworks') {
    const life = STAR_LIFE[p.type] ?? 3.2;
    switch (x.fx) {
      case 'shell':
      case 'salvo': {
        const rise = p.rise !== undefined ? numOr(p.rise, 0) : riseOf(numOr(p.height, 90) * 0.9);
        return [x.t + Math.min(rise, 0.8), x.t + rise + life + stag * numOr(p.count, 1)];
      }
      case 'comet': {
        const end = typeof p.end === 'string' && p.end !== 'none' ? (p.end === 'pearl' ? 0.8 : 3) : 0.3;
        return [x.t, x.t + stag * numOr(p.count, 10) + cometApex(numOr(p.height, 40)) + end];
      }
      case 'cake':
        return [x.t, x.t + x.dur + cometApex(numOr(p.height, 35)) + (p.type ? 3 : 0.3)];
      case 'mine':
        return [x.t, x.t + x.dur + 1.5];
      case 'finale':
        return [x.t, x.t + x.dur + riseOf(numOr(p.height, 62)) + 3];
      default:
        return [x.t, x.t + x.dur];
    }
  }
  return [x.t, x.t + x.dur];
}
const liveBySys = { pyro: [], fireworks: [] };
for (const x of expanded) if (x.sys === 'pyro' || x.sys === 'fireworks') liveBySys[x.sys].push(fullWindow(x));
const storyGaps = [];
for (const [n, sysReq, what] of STORYBOARD) {
  if (STORYBOARD_EXCEPT[n]) continue;
  const a = FRAME_DT * n + 3;
  const b = FRAME_DT * n + 5;
  const wins = (sysReq === 'any' ? [...liveBySys.pyro, ...liveBySys.fireworks] : liveBySys[sysReq])
    .filter(([s, e]) => e > a && s < b)
    .sort((u, v) => u[0] - v[0]);
  // uncovered spans inside [a, b] (≤ 0.25 s slivers tolerated)
  let cur = a;
  const holes = [];
  for (const [s, e] of wins) {
    if (s > cur + 0.25) holes.push([cur, s]);
    cur = Math.max(cur, e);
  }
  if (cur < b - 0.25) holes.push([cur, b]);
  if (holes.length) storyGaps.push(`f${String(n).padStart(3, '0')} (${what}, ${sysReq}) not alive over ${a.toFixed(1)}–${b.toFixed(1)}: gap ${holes.map(([u, v]) => `${u.toFixed(1)}–${v.toFixed(1)}`).join(', ')}`);
}
for (const g of storyGaps) warn(`storyboard: ${g}`);

// ------------------------------------------------------------------------------ camera sight lines
/**
 * Every camera.shot pose (start, middle and end of a move) is tested against the world build read from
 * src/world/site.ts: the 8 lantern pillars (shaft + plinth), the FOH/press tower, the camera pen and the piano
 * riser. Warns when a pose stands inside one, when the centre sight line to `look` is blocked, or when those
 * structures cover more than 17 % of the frame (16×9 ray grid, 16:9) — pillars may frame a picture at its edges.
 */
{
  const site = read('src/world/site.ts');
  const num1 = (rx, d) => {
    const m = site.match(rx);
    return m ? Number(m[1]) : d;
  };
  const obj = (name) => {
    const m = site.match(new RegExp(`export const ${name} = \\{([^}]*)\\}`));
    const o = {};
    if (m) for (const kv of m[1].matchAll(/([a-zA-Z0-9]+):\s*(-?[\d.]+)/g)) o[kv[1]] = Number(kv[2]);
    return o;
  };
  const PX = num1(/export const PILLAR_X = ([\d.]+)/, 20);
  const PZ = (site.match(/export const PILLAR_Z = \[([^\]]*)\]/)?.[1] ?? '36,69,102,135').split(',').map(Number);
  const PIL = obj('PILLAR');
  const FOHB = obj('FOH');
  const PEN = obj('CAM_PEN');
  const RIS = obj('RISER');
  const shaft = (PIL.shaft ?? 3) / 2 + 0.1;
  const plinth = (PIL.plinth ?? 5) / 2;
  const boxes = [];
  for (const z of PZ)
    for (const sx of [-1, 1]) {
      boxes.push({ n: `pillar ${sx < 0 ? 'L' : 'R'}@${z}`, a: [sx * PX - shaft, 0, z - shaft], b: [sx * PX + shaft, PIL.top ?? 12.8, z + shaft] });
      boxes.push({ n: `plinth ${sx < 0 ? 'L' : 'R'}@${z}`, a: [sx * PX - plinth, 0, z - plinth], b: [sx * PX + plinth, 1.6, z + plinth] });
    }
  if (FOHB.x0 !== undefined) boxes.push({ n: 'FOH tower', a: [FOHB.x0, 0, FOHB.z0], b: [FOHB.x1, FOHB.roof ?? 9.6, FOHB.z1] });
  if (PEN.w) boxes.push({ n: 'camera pen', a: [PEN.x - PEN.w / 2, 0, PEN.z - PEN.d / 2], b: [PEN.x + PEN.w / 2, 1.3, PEN.z + PEN.d / 2] });
  if (RIS.w) boxes.push({ n: 'piano riser', a: [RIS.x - RIS.w / 2, 0, RIS.z - RIS.d / 2], b: [RIS.x + RIS.w / 2, RIS.h ?? 0.9, RIS.z + RIS.d / 2] });
  const rayBox = (o, d, bx) => {
    let t0 = 0;
    let t1 = 1e9;
    for (let k = 0; k < 3; k++) {
      if (Math.abs(d[k]) < 1e-9) {
        if (o[k] < bx.a[k] || o[k] > bx.b[k]) return null;
        continue;
      }
      let u = (bx.a[k] - o[k]) / d[k];
      let v = (bx.b[k] - o[k]) / d[k];
      if (u > v) [u, v] = [v, u];
      t0 = Math.max(t0, u);
      t1 = Math.min(t1, v);
      if (t0 > t1) return null;
    }
    return t0;
  };
  const nrm = (v) => {
    const l = Math.hypot(...v) || 1;
    return v.map((x) => x / l);
  };
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const inside = (p, bx, m = 0.3) => [0, 1, 2].every((k) => p[k] >= bx.a[k] - m && p[k] <= bx.b[k] + m);
  const camIssues = [];
  const checkPose = (pos, look, fov) => {
    const out = [];
    for (const bx of boxes) if (inside(pos, bx)) out.push(`inside ${bx.n}`);
    const f = nrm(look.map((v, k) => v - pos[k]));
    const dist = Math.hypot(...look.map((v, k) => v - pos[k]));
    const r = nrm(crs(f, [0, 1, 0]));
    const u = crs(r, f);
    const th = Math.tan((fov * Math.PI) / 360);
    const tw = (th * 16) / 9;
    let blocked = 0;
    const hits = new Map();
    for (let iy = 0; iy < 9; iy++)
      for (let ix = 0; ix < 16; ix++) {
        const sx = ((ix + 0.5) / 16) * 2 - 1;
        const sy = ((iy + 0.5) / 9) * 2 - 1;
        const d = nrm(f.map((v, k) => v + r[k] * sx * tw + u[k] * sy * th));
        let best = null;
        for (const bx of boxes) {
          const t = rayBox(pos, d, bx);
          if (t !== null && t > 0.2 && t < dist * 0.97 && (!best || t < best.t)) best = { t, n: bx.n };
        }
        if (best) {
          blocked++;
          hits.set(best.n, (hits.get(best.n) ?? 0) + 1);
        }
      }
    for (const bx of boxes) {
      const t = rayBox(pos, f, bx);
      if (t !== null && t > 0.2 && t < dist * 0.97) out.push(`centre sight line blocked by ${bx.n}`);
    }
    if (blocked / 144 > 0.17) out.push(`${Math.round((blocked / 144) * 100)} % of the frame covered (${[...hits].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n, c]) => `${n} ${c}`).join(', ')})`);
    return out;
  };
  /** shots whose subject IS the structure (the pianist on the riser, the K close-up of lantern L1, f113) */
  const CAM_EXCEPT = new Set([926.7, 1116.4]);
  for (const [i, c] of cues.entries()) {
    if (c.sys !== 'camera' || c.fx !== 'shot' || !Array.isArray(c.p?.pos) || !Array.isArray(c.p?.look)) continue;
    if (CAM_EXCEPT.has(c.t)) continue;
    const p = c.p;
    const fov = numOr(p.fov, 50);
    const poses = [['start', p.pos, p.look]];
    if (p.to || p.lookTo) {
      const to = p.to ?? p.pos;
      const lt = p.lookTo ?? p.look;
      poses.push(['mid', p.pos.map((v, k) => (v + to[k]) / 2), p.look.map((v, k) => (v + lt[k]) / 2)], ['end', to, lt]);
    }
    for (const [tag, pos, look] of poses) {
      const iss = checkPose(pos, look, fov);
      if (iss.length) camIssues.push(`${cueRef(c, i)} ${tag} pos ${pos.join(',')}: ${iss.join('; ')}`);
    }
  }
  for (const m of camIssues) warn(`camera: ${m}`);
}

// ------------------------------------------------------------------------------ blackouts are black
/**
 * Sections labelled as a blackout / darkness / gap / black (and 'silence' sections) must render with zero set
 * emissives: a `dark` lights look, no wash, pixels off and the stage master down (stage.state `master` ≤ 0.1;
 * 'silence' sections default to 0.03). FACT exceptions (the red shafts of the Discorecord gap, the bridge's red
 * glints / laser streaks) live in lights.pillars / lasers, which this check does not look at.
 */
const BLACK_RX = /blackout|darkness|— black\b/i;
/** documented FACT exceptions: section label → checks skipped */
const BLACK_EXCEPT = { 'Domitor Draconis — blackout accent': ['pixels'] }; // faint teal outline on the pixels (f106)
for (const s of show.sections ?? []) {
  if (!BLACK_RX.test(s.label) && s.kind !== 'silence') continue;
  const skip = new Set(BLACK_EXCEPT[s.label] ?? []);
  const inSec = (c) => c.t >= s.start - 0.02 && c.t < s.end - 0.05;
  const probs = [];
  const st = cues.filter((c) => inSec(c) && c.sys === 'stage' && c.fx === 'state');
  const m = st.length ? st[st.length - 1].p?.master : undefined;
  if (!(typeof m === 'number' ? m <= 0.1 : s.kind === 'silence')) probs.push(`stage master ${m ?? '1 (unset)'}`);
  const wash = cues.filter((c) => inSec(c) && c.sys === 'lights' && c.fx === 'wash');
  if (wash.some((c) => numOr(c.p?.intensity, 1) > 0.05)) probs.push('wash > 0.05');
  const scr = cues.filter((c) => inSec(c) && c.sys === 'screens' && c.fx === 'content');
  if (!skip.has('pixels') && scr.some((c) => c.p?.mode !== 'off')) probs.push('pixels not off');
  const lk = cues.filter((c) => inSec(c) && c.sys === 'lights' && c.fx === 'look' && !c.p?.groups);
  if (lk.some((c) => c.p?.preset !== 'dark')) probs.push('lights look not dark');
  if (probs.length) warn(`blackout "${s.label}" (${s.start}): ${probs.join(', ')}`);
}

// ------------------------------------------------------------------------------ report
const bySys = new Map();
const byFx = new Map();
for (const x of expanded) {
  bySys.set(x.sys, (bySys.get(x.sys) ?? 0) + 1);
  byFx.set(`${x.sys}.${x.fx}`, (byFx.get(`${x.sys}.${x.fx}`) ?? 0) + 1);
}
const total = expanded.length;
if (total < 1500 || total > 4000) warn(`${total} expanded cues (target 1500–4000)`);

if (opt('json')) {
  console.log(JSON.stringify({ file, errors, warnings, defs: cues.length, expanded: total, bySystem: Object.fromEntries(bySys), byFx: Object.fromEntries(byFx), extensions: Object.fromEntries(extUse) }, null, 2));
  process.exit(errors.length ? 1 : 0);
}

const out = [];
const P = (s = '') => out.push(s);
P(`Show file   ${path.relative(ROOT, file)}`);
P(`Contract    ${SYSTEMS.size} systems, ${Object.values(VOCAB).reduce((n, v) => n + Object.keys(v).length, 0)} fx, ${ANCHORS.size} anchors, ${NAMED.size} named colours (read from docs/ + src/)`);
P(`Timeline    ${D} s · ${show.chapters?.length} chapters · ${segs.length} tempo segments (${segs.filter((s) => s.kick).length} with kick) · ${show.sections?.length} sections · ${Object.keys(palettes).length} palettes · ${moments.length} moments`);
P(`Cues        ${cues.length} definitions → ${total} expanded (engine-exact repeat expansion)`);
P('');
P('Per system (expanded)                         fx breakdown');
const sysNames = [...SYSTEMS].filter((s) => bySys.has(s));
for (const s of sysNames) {
  const fx = [...byFx].filter(([k]) => k.startsWith(s + '.')).map(([k, v]) => `${k.slice(s.length + 1)} ${v}`).join(', ');
  P(`  ${s.padEnd(10)} ${String(bySys.get(s)).padStart(5)}  ${'█'.repeat(Math.max(1, Math.round((bySys.get(s) / total) * 40))).padEnd(28)} ${fx}`);
}
P('');
P('Density per minute (expanded cue starts, camera excluded)   [#=pyro+fireworks  *=other]');
const bins = Math.ceil(D / 60);
const dens = Array.from({ length: bins }, () => ({ fire: 0, other: 0 }));
for (const x of expanded) {
  if (x.sys === 'camera') continue;
  const b = Math.min(bins - 1, Math.floor(x.t / 60));
  if (x.sys === 'pyro' || x.sys === 'fireworks') dens[b].fire++;
  else dens[b].other++;
}
const maxD = Math.max(...dens.map((d) => d.fire + d.other));
const chapterAt = (t) => [...(show.chapters ?? [])].reverse().find((c) => c.t <= t);
for (let b = 0; b < bins; b++) {
  const d = dens[b];
  const w = 50 / maxD;
  const bar = '#'.repeat(Math.round(d.fire * w)) + '*'.repeat(Math.round(d.other * w));
  const ch = chapterAt(b * 60 + 30);
  P(`  ${String(b).padStart(2)}:00 ${String(d.fire + d.other).padStart(4)} ${bar.padEnd(52)} ${ch ? ch.title.slice(0, 28) : ''}`);
}
P('');
P(`Sections    explicit looks checked: ${REQUIRED.map((r) => r[0]).join(', ')}`);
P(`Camera      ${shots.length} shots, ${((covered / D) * 100).toFixed(1)} % of the show authored`);
if (extUse.size) {
  P('');
  P('Contract extensions in use (ignored gracefully by systems that do not support them):');
  const grouped = [...extUse].sort((a, b) => b[1] - a[1]);
  for (const [k, n] of grouped.slice(0, opt('all-ext') ? 999 : 40)) P(`  ${String(n).padStart(4)}× ${k}`);
  if (grouped.length > 40 && !opt('all-ext')) P(`  … ${grouped.length - 40} more (--all-ext)`);
}
if (!QUIET || errors.length || warnings.length) {
  P('');
  for (const w of warnings) P(`  ⚠ ${w}`);
  for (const e of errors.slice(0, 60)) P(`  ✗ ${e}`);
  if (errors.length > 60) P(`  … ${errors.length - 60} more errors`);
}
P('');
P(errors.length ? `✗ ${errors.length} error(s), ${warnings.length} warning(s)` : `✓ valid · ${warnings.length} warning(s)`);

// ------------------------------------------------------------------------------ optional text timeline dump
const dump = opt('dump');
if (dump) {
  const only = typeof dump === 'string' ? new Set(dump.split(',')) : null;
  const from = Number(opt('from') ?? 0);
  const to = Number(opt('to') ?? D);
  P('');
  P('Timeline dump');
  let si = 0;
  const secs = show.sections ?? [];
  for (const x of expanded) {
    if (x.t < from || x.t > to || (only && !only.has(x.sys))) continue;
    while (si < secs.length && secs[si].start <= x.t + 1e-9) {
      const s = secs[si++];
      if (s.end >= from && s.start <= to) P(`\n── ${fmtT(s.start)} (${s.start.toFixed(2)})  ${s.label}  [${s.kind} ${s.energy} · ${s.palette}]`);
    }
    const p = Object.entries(x.p)
      .filter(([k]) => !['pos', 'look', 'to', 'lookTo'].includes(k))
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('/') : v}`)
      .join(' ');
    const cam = x.sys === 'camera' ? ` pos=${x.p.pos} → look=${x.p.look}` : '';
    P(`  ${x.t.toFixed(2).padStart(8)} +${x.dur.toFixed(2).padEnd(6)} ${`${x.sys}.${x.fx}`.padEnd(18)} ${x.targets.join(',').padEnd(24)} ${p}${cam}`);
  }
}
console.log(out.join('\n'));
process.exit(errors.length ? 1 : 0);
