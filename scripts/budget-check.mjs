#!/usr/bin/env node
/**
 * Mobile render-budget check (CI): renders the MOBILE preset on a phone-sized touch viewport at the
 * heaviest show moments and fails when a frame exceeds the mobile budget of docs/performance.md.
 *
 *   node scripts/budget-check.mjs [--base http://localhost:5173/] [--times 843,1515]
 *                                 [--views default,overview] [--calls 110] [--triangles 800000]
 *                                 [--size 844x390] [--json out.json]
 *
 * Needs a running dev (or preview) server. For every show time x view it seeks the paused show,
 * waits for a few rendered frames and reads the draw calls / triangles of the last frame
 * (app.lastRender: every draw of the frame, scene + post-processing passes; the report splits them).
 * Exit code 0 = within budget, 1 = over budget, 3 = page error / load failure.
 * Views: `default` = the start camera (as a phone user sees it), `overview` = a high, wide view
 * over the whole grounds (everything in the frustum: worst case for draw calls).
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const base = opt('base', 'http://localhost:5173/');
const times = opt('times', '843,1515').split(',').map(Number).filter(Number.isFinite);
const views = opt('views', 'default,overview').split(',').filter(Boolean);
const maxCalls = Number(opt('calls', '110'));
const maxTris = Number(opt('triangles', '800000'));
const [w, h] = opt('size', '844x390').split('x').map(Number);
const jsonOut = opt('json', null);

/** camera poses (free camera: x, y, z, yaw, pitch, fov) */
const POSES = {
  overview: [0, 60, 330, 0, -0.16, 70],
};

const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
let exitCode = 0;
const rows = [];
try {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  const url = `${base}?autostart&quality=mobile&nogovernor&analyze=0&t=${times[0] ?? 0}`;
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__app && window.__app.ready, null, { timeout: 900000, polling: 250 });
  await page.evaluate(() => window.__app.clock.pause());
  const home = await page.evaluate(() => {
    const c = window.__app.camera;
    return { mode: window.__app.get('camera')?.mode ?? null, x: c.position.x, y: c.position.y, z: c.position.z };
  });
  // views outer: the start camera is measured first, before any free-camera pose moves it
  for (const view of views) {
    for (const t of times) {
      const pose = POSES[view] ?? null;
      const r = await page.evaluate(
        async ({ t, pose, home }) => {
          const a = window.__app;
          const rig = a.get('camera');
          if (pose) rig?.setFreePose?.(...pose);
          else if (home.mode && rig?.setMode) rig.setMode(home.mode);
          a.clock.seek(t);
          // a few rendered frames after the seek (caches rebuilt, lazy cue expansion done)
          const f0 = a.frame;
          const t0 = performance.now();
          while (a.frame < f0 + 4 && performance.now() - t0 < 120000) await new Promise((res) => setTimeout(res, 50));
          const passes = Number(a.postfx.stats?.().passes ?? 0);
          return { calls: a.lastRender.calls, post: passes, triangles: a.lastRender.triangles, level: a.quality.level, frames: a.frame - f0 };
        },
        { t, pose, home },
      );
      const over = [];
      if (r.calls > maxCalls) over.push(`draw calls ${r.calls} > ${maxCalls}`);
      if (r.triangles > maxTris) over.push(`triangles ${r.triangles} > ${maxTris}`);
      if (r.level !== 'mobile') over.push(`preset is ${r.level}, expected mobile`);
      rows.push({ t, view, ...r, ok: over.length === 0, over });
      if (over.length) exitCode = 1;
    }
  }
} catch (e) {
  errors.push(`harness: ${e.message}`);
  exitCode = 3;
} finally {
  await browser.close();
}
if (errors.length && exitCode === 0) exitCode = 3;
for (const r of rows) {
  const tag = r.ok ? 'ok  ' : 'OVER';
  console.log(`${tag} t=${r.t}s ${r.view.padEnd(9)} calls ${String(r.calls).padStart(4)} / ${maxCalls} (scene ${r.calls - r.post} + post ${r.post})  triangles ${String(r.triangles).padStart(8)} / ${maxTris}${r.over.length ? '  <- ' + r.over.join(', ') : ''}`);
}
if (errors.length) console.log(`errors:\n  ${errors.slice(0, 20).join('\n  ')}`);
const summary = { ok: exitCode === 0, budget: { calls: maxCalls, triangles: maxTris }, rows, errors: errors.slice(0, 20) };
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(summary, null, 1));
console.log(exitCode === 0 ? 'mobile budget: PASS' : exitCode === 1 ? 'mobile budget: FAIL' : 'mobile budget: ERROR');
process.exit(exitCode);
