#!/usr/bin/env node
/**
 * Objective look similarity: our Show camera (which follows the official edit) vs the official video frames.
 *
 *   node scripts/similarity.mjs [--frames <dir of video frames NNNNN.jpg at 4 fps>] [--port 5173] [--n 64]
 *        [--times 76.3,600.4,...] [--quality medium] [--out .shots/similarity] [--offset 0.036] [--eval "js"]
 *        [--settle 1800] [--min-frames 0]
 *
 * For each sampled moment it renders our show paused at (video time - offset) through the Show camera, then scores
 * it against the video frame with scripts/similarity-score.py (colour layout ΔE, luminance histogram, structure).
 * The video itself is never committed: --frames defaults to $ENDSHOW_DATA/f4 (tools/video/extract-frames.sh).
 * --settle: ms to wait after each seek before the screenshot (1800 suits SwiftShader; ~400 is enough on a GPU).
 * --min-frames: additionally wait until the app has rendered this many frames after the seek. Some state after a
 *   seek still depends on how many frames were drawn (1047.25 scored 27.3 % and 12.1 % with the same code on the same
 *   SwiftShader box under different CPU load), so fix a frame count when comparing runs across machines.
 * Needs a dev server (npx vite --port <port>) and python3 with numpy + Pillow (env PYTHON overrides python3).
 * Browser/renderer: scripts/lib/browser.mjs (CHROME_PATH, RENDERER=gpu|swiftshader).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser, reportWebGL } from './lib/browser.mjs';
import { dataPath } from './lib/data.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const framesDir = opt('frames', dataPath('f4'));
if (!fs.existsSync(framesDir)) throw new Error(`frames dir not found: ${framesDir} (pass --frames, or run tools/video/extract-frames.sh)`);
const port = opt('port', '5173');
const quality = opt('quality', 'medium');
const out = opt('out', '.shots/similarity');
const offset = Number(opt('offset', '0.036'));
const n = Number(opt('n', '64'));
const settle = Number(opt('settle', '1800'));
const minFrames = Number(opt('min-frames', '0'));
const DURATION = 1581;
// evenly spread samples (avoiding the first/last seconds), or an explicit list
const times = opt('times', '')
  ? opt('times', '').split(',').map(Number)
  : Array.from({ length: n }, (_, i) => Math.round((8 + ((DURATION - 16) * (i + 0.5)) / n) * 4) / 4);

fs.mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 480, height: 270 }, deviceScaleFactor: 1 })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${port}/?autostart&quality=${quality}&analyze=0&nogovernor&mode=filmed&camera=showcam`, { waitUntil: 'load', timeout: 120000 });
await reportWebGL(page);
await page.waitForFunction(() => window.__app && window.__app.ready, null, { timeout: 900000, polling: 250 });
await page.evaluate(() => {
  document.getElementById('ui')?.style.setProperty('display', 'none');
  window.__app.clock.pause();
});
// optional experiment hook, e.g. --eval "__app.postfx.exposure=0.5"
if (opt('eval', '')) await page.evaluate(opt('eval', ''));
const pairs = [];
for (const t of times) {
  const f0 = await page.evaluate((st) => {
    window.__app.clock.seek(st);
    return window.__app.frame;
  }, t - offset);
  if (minFrames > 0) await page.waitForFunction((n) => window.__app.frame >= n, f0 + minFrames, { timeout: 600000, polling: 50 });
  await page.waitForTimeout(settle);
  const shot = path.join(out, `ours_${String(Math.round(t * 4)).padStart(5, '0')}.png`);
  await page.screenshot({ path: shot, timeout: 240000 });
  pairs.push({ t, ours: shot, ref: path.join(framesDir, `${String(Math.round(t * 4)).padStart(5, '0')}.jpg`) });
  process.stdout.write(`\r${pairs.length}/${times.length}`);
}
await browser.close();
const j = path.join(out, 'pairs.json');
fs.writeFileSync(j, JSON.stringify({ pairs, errors }, null, 1));
console.log('\n' + execFileSync(process.env.PYTHON || 'python3', [path.join(path.dirname(fileURLToPath(import.meta.url)), 'similarity-score.py'), j, path.join(out, 'report')]).toString());
