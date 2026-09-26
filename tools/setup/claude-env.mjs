#!/usr/bin/env node
/**
 * Writes ENDSHOW_DATA and PYTHON into the git-ignored .claude/settings.local.json of the main checkout, so that EVERY
 * Claude Code session in this project gets them: the CLI and the desktop app (which does not read ~/.zshrc), and every
 * subagent, including the fixers that work in git worktrees under .claude/worktrees/ (they inherit the session's env).
 *
 *   node tools/setup/claude-env.mjs [--data <dir>] [--print]
 *
 * --data: the data dir (default: $ENDSHOW_DATA, else endshow-data next to the main checkout).
 * PYTHON = <data>/venv/bin/python (HANDOFF.md step 5). Existing keys in settings.local.json (permissions etc.) are kept.
 * --print: show the result without writing. Restart Claude Code afterwards; check in a session with `echo $ENDSHOW_DATA`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { dataDir, mainCheckout } from '../../scripts/lib/data.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const data = path.resolve(opt('data', dataDir()));
const py = path.join(data, 'venv', 'bin', 'python');
const file = path.join(mainCheckout(), '.claude', 'settings.local.json');

let settings = {};
if (fs.existsSync(file)) {
  try {
    settings = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`cannot parse ${file} (${e.message}); fix or remove it first`);
    process.exit(1);
  }
}
settings.env = { ...(settings.env || {}), ENDSHOW_DATA: data, PYTHON: py };
const text = JSON.stringify(settings, null, 2) + '\n';
if (args.includes('--print')) {
  process.stdout.write(text);
  process.exit(0);
}
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, text);
console.log(`${file}:\n${text}`);
for (const [what, p] of [
  ['data dir', data],
  ['video', path.join(data, 'video', 'endshow.mp4')],
  ['python (venv)', py],
]) {
  if (!fs.existsSync(p)) console.log(`note: ${what} does not exist yet: ${p}`);
}
console.log('Restart Claude Code to pick this up (check in the session: echo $ENDSHOW_DATA $PYTHON).');
