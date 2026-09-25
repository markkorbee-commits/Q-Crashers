#!/usr/bin/env node
/**
 * Headless screenshot / QA harness.
 * Usage: node scripts/shot.mjs "<query string>" out.png [--size 1280x720] [--wait 4000] [--mobile] [--frames 20] [--eval "js"]
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
await page.waitForFunction(() => window.__app && window.__app.ready, null, { timeout: 180000 }).catch(() => errors.push('timeout waiting for __app.ready'));
const loadMs = Date.now() - t0;
if (evalJs) await page.evaluate(evalJs).catch((e) => errors.push('eval: ' + e.message));
await page.waitForTimeout(wait);
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out });
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
    showTime: a.clock.time, timings: Object.fromEntries(a.timings), systems: sys,
  };
}).catch((e) => ({ error: e.message }));
console.log(JSON.stringify({ url, out, loadMs, errors: errors.slice(0, 30), stats }, null, 1));
await browser.close();
