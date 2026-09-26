#!/usr/bin/env node
/**
 * Headless screenshot / QA harness.
 * Usage: node scripts/shot.mjs "<query string>" out.png [--size 1280x720] [--wait 4000] [--mobile] [--frames 20] [--eval "js"] [--budget]
 *   --budget  exit code 2 when draw calls / triangles exceed the per-level budgets of docs/performance.md
 *             (desktop presets: ≤ 150 calls, ≤ 3 M triangles; mobile: ≤ 110 calls, ≤ 0.8 M triangles)
 * Example: node scripts/shot.mjs "autostart&t=300&cam=0,2,120,0,0.1&quality=high" .shots/stage.png
 * Requires the dev server (npm run dev) on http://localhost:5173 unless --base is given.
 * Prints console errors and a perf/stat summary (from window.__app) as JSON.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const query = args[0] ?? 'autostart';
const out = args[1] ?? '.shots/shot.png';
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const has = (name) => args.includes(`--${name}`);
const [w, h] = opt('size', has('mobile') ? '844x390' : '1280x720').split('x').map(Number);
const wait = Number(opt('wait', '3000'));
const base = opt('base', 'http://localhost:5173/');
const evalJs = opt('eval', null);

const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({
  viewport: { width: w, height: h },
  deviceScaleFactor: 1,
  isMobile: has('mobile'),
  hasTouch: has('mobile'),
});
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text().slice(0, 300)}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
const url = `${base}?${query}`;
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__app && window.__app.ready, null, { timeout: 900000, polling: 250 }).catch(() => errors.push('timeout waiting for __app.ready'));
const loadMs = Date.now() - t0;
if (evalJs) await page.evaluate(evalJs).catch((e) => errors.push('eval: ' + e.message));
await page.waitForTimeout(wait);
// measured frame times over the last ~2 s (the governor's fps needs 45 frames: on a software
// renderer it still shows its initial 60)
const measured = await page
  .evaluate(
    () =>
      new Promise((res) => {
        const d = [];
        let last = performance.now();
        const t0 = last;
        const tick = (now) => {
          d.push(now - last);
          last = now;
          if (now - t0 < 2000 && d.length < 120) requestAnimationFrame(tick);
          else {
            d.sort((a, b) => a - b);
            res({ frames: d.length, medianMs: +d[d.length >> 1].toFixed(1), maxMs: +d[d.length - 1].toFixed(1) });
          }
        };
        requestAnimationFrame(tick);
      }),
  )
  .catch(() => null);
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out, timeout: 240000 });
const stats = await page.evaluate(() => {
  const a = window.__app;
  if (!a) return null;
  const i = { render: a.lastRender, memory: a.renderer.info.memory };
  const sys = {};
  for (const s of a.allSystems()) {
    try { sys[s.name] = s.stats ? s.stats() : {}; } catch (e) { sys[s.name] = { error: String(e) }; }
  }
  return {
    fps: a.governor.fps, frameMs: a.governor.frameMs, quality: a.quality.level, scale: a.governor.scale,
    calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures,
    showTime: a.clock.time, timings: Object.fromEntries(a.timings), postfx: a.postfx.stats ? a.postfx.stats() : null,
    programs: a.renderer.info.programs ? a.renderer.info.programs.length : null, load: a.loadTimings ?? null, gpuPrep: a.gpuPrep ?? null, systems: sys,
  };
}).catch((e) => ({ error: e.message }));
if (stats && measured) stats.measured = measured;
const BUDGET = { mobile: { calls: 110, triangles: 800000 }, desktop: { calls: 150, triangles: 3000000 } };
let over = [];
if (has('budget') && stats && !stats.error) {
  const b = stats.quality === 'mobile' ? BUDGET.mobile : BUDGET.desktop;
  if (stats.calls > b.calls) over.push(`draw calls ${stats.calls} > ${b.calls}`);
  if (stats.triangles > b.triangles) over.push(`triangles ${stats.triangles} > ${b.triangles}`);
  stats.budget = over.length ? over : 'ok';
}
console.log(JSON.stringify({ url, out, loadMs, errors: errors.slice(0, 30), stats }, null, 1));
await browser.close();
if (over.length) process.exit(2);
