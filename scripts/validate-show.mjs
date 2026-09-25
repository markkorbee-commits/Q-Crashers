#!/usr/bin/env node
/**
 * Validates a show file (default: public/show/endshow-2026.json) against the show contract.
 *
 *   node scripts/validate-show.mjs [file] [--dump[=sys,sys]] [--from=s] [--to=s] [--json] [--quiet]
 *
 * The vocabulary is read from the contract sources themselves (no copy that can drift):
 *   docs/show-format.md     fx per system + enumerated param values (`param`: `a` \| `b` ...)
 *   src/core/Anchors.ts     AnchorName union (valid cue targets, + filters all/left/right/center)
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
const ANCHORS = new Set(unionOf(read('src/core/Anchors.ts'), 'AnchorName'));
const FILTERS = new Set(['all', 'left', 'right', 'center']);
const NAMED = new Set([...read('src/show/colors.ts').matchAll(/^\s*([a-z]+):\s*'#[0-9a-fA-F]{6}'/gm)].map((m) => m[1]));
const PALETTE_REFS = new Set(['primary', 'secondary', 'accent']);

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
      if (!validColor(v)) err(`${where}: ${k} "${v}" is not a palette ref, named colour or #rrggbb`);
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
