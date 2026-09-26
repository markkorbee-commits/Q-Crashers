#!/usr/bin/env node
/**
 * Objective look similarity: our Show camera (which follows the official edit) vs the official video frames.
 *
 *   node scripts/similarity.mjs --frames <dir of video frames NNNNN.jpg at 4 fps> [--port 5173] [--n 64]
 *        [--times 76.3,600.4,...] [--quality medium] [--out .shots/similarity] [--offset 0.036]
 *
 * For each sampled moment it renders our show paused at (video time - offset) through the Show camera, then scores
 * it against the video frame with scripts/similarity-score.py (colour layout ΔE, luminance histogram, structure).
 * The video itself is never committed: pass a local folder of frames (ffmpeg -vf fps=4,scale=480:270).
 * Needs a dev server (npx vite --port <port>).
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const framesDir = opt('frames', '');
if (!framesDir) throw new Error('--frames <dir> is required (video frames at 4 fps, NNNNN.jpg)');
const port = opt('port', '5173');
const quality = opt('quality', 'medium');
const out = opt('out', '.shots/similarity');
const offset = Number(opt('offset', '0.036'));
const n = Number(opt('n', '64'));
const DURATION = 1581;
// evenly spread samples (avoiding the first/last seconds), or an explicit list
const times = opt('times', '')
  ? opt('times', '').split(',').map(Number)
  : Array.from({ length: n }, (_, i) => Math.round((8 + ((DURATION - 16) * (i + 0.5)) / n) * 4) / 4);

fs.mkdirSync(out, { recursive: true });
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 480, height: 270 }, deviceScaleFactor: 1 })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${port}/?autostart&quality=${quality}&analyze=0&nogovernor&mode=filmed&camera=showcam`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__app && window.__app.ready, null, { timeout: 900000, polling: 250 });
await page.evaluate(() => {
  document.getElementById('ui')?.style.setProperty('display', 'none');
  window.__app.clock.pause();
});
const pairs = [];
for (const t of times) {
  await page.evaluate((st) => window.__app.clock.seek(st), t - offset);
  await page.waitForTimeout(1800);
  const shot = path.join(out, `ours_${String(Math.round(t * 4)).padStart(5, '0')}.png`);
  await page.screenshot({ path: shot, timeout: 240000 });
  pairs.push({ t, ours: shot, ref: path.join(framesDir, `${String(Math.round(t * 4)).padStart(5, '0')}.jpg`) });
  process.stdout.write(`\r${pairs.length}/${times.length}`);
}
await browser.close();
const j = path.join(out, 'pairs.json');
fs.writeFileSync(j, JSON.stringify({ pairs, errors }, null, 1));
console.log('\n' + execFileSync('python3', [path.join(path.dirname(new URL(import.meta.url).pathname), 'similarity-score.py'), j, path.join(out, 'report')]).toString());
