/**
 * Shared headless-browser launcher for the render/measure scripts (shot, compare, similarity, budget-check,
 * tools/video/vcompare). One place decides WHICH browser runs and HOW it renders WebGL.
 *
 * Executable (first hit wins):
 *   1. env CHROME_PATH
 *   2. macOS: /Applications/Google Chrome.app (or ~/Applications/Google Chrome.app)
 *   3. a Playwright-installed Chromium (npx playwright-core install chromium; honours PLAYWRIGHT_BROWSERS_PATH)
 *   4. /opt/pw-browsers/<chromium-*>/chrome-linux/chrome (the cloud container)
 * Renderer (env RENDERER=gpu|swiftshader overrides the automatic choice):
 *   - gpu:         macOS (Metal via ANGLE), Windows, or Linux with /dev/dri. Flags: --ignore-gpu-blocklist
 *                  (+ --enable-unsafe-swiftshader, which only permits a software fallback, it does not force it).
 *   - swiftshader: Linux without /dev/dri (no GPU): --use-angle=swiftshader --enable-unsafe-swiftshader
 *                  --ignore-gpu-blocklist (CPU rendering: 20-90 s per heavy frame).
 * Extra: env CHROME_ARGS="--flag --flag2" appends flags; env HEADED=1 opens a visible window (use it when the
 * printed WebGL renderer says SwiftShader on a machine that has a GPU).
 * The chosen executable + renderer is printed once to stderr, and after the first page load the page's WebGL
 * UNMASKED_RENDERER string (e.g. "ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Max, ...)").
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SWIFTSHADER_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const GPU_ARGS = ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'];

function firstExisting(list) {
  for (const p of list) if (p && fs.existsSync(p)) return p;
  return null;
}

/** The browser executable and where it was found. */
export function resolveExecutable() {
  if (process.env.CHROME_PATH) {
    if (!fs.existsSync(process.env.CHROME_PATH)) throw new Error(`CHROME_PATH does not exist: ${process.env.CHROME_PATH}`);
    return { exe: process.env.CHROME_PATH, source: 'CHROME_PATH' };
  }
  if (process.platform === 'darwin') {
    const app = 'Google Chrome.app/Contents/MacOS/Google Chrome';
    const mac = firstExisting([path.join('/Applications', app), path.join(os.homedir(), 'Applications', app)]);
    if (mac) return { exe: mac, source: 'Google Chrome' };
  }
  try {
    const pw = chromium.executablePath();
    if (pw && fs.existsSync(pw)) return { exe: pw, source: 'playwright chromium' };
  } catch {
    /* no playwright browser registry */
  }
  const root = '/opt/pw-browsers';
  if (fs.existsSync(root)) {
    const dirs = fs
      .readdirSync(root)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    const hit = firstExisting(dirs.map((d) => path.join(root, d, 'chrome-linux', 'chrome')));
    if (hit) return { exe: hit, source: root };
  }
  throw new Error(
    'No Chrome/Chromium found. Install Google Chrome (macOS: /Applications/Google Chrome.app), or run ' +
      '`npx playwright-core install chromium`, or set CHROME_PATH to a Chrome/Chromium executable.',
  );
}

/** 'gpu' | 'swiftshader' */
export function resolveRenderer() {
  const r = (process.env.RENDERER || '').toLowerCase();
  if (r === 'gpu' || r === 'swiftshader') return r;
  if (r) throw new Error(`RENDERER must be gpu or swiftshader, got ${r}`);
  if (process.platform === 'linux') return fs.existsSync('/dev/dri') ? 'gpu' : 'swiftshader';
  return 'gpu';
}

let announced = false;
let webglReported = false;

/**
 * Launch the browser. `extraArgs` are added to the renderer flags (e.g. autoplay policy).
 * Returns the Playwright Browser; `browser.launchInfo` = { exe, source, renderer, args }.
 */
export async function launchBrowser({ extraArgs = [], headless } = {}) {
  const { exe, source } = resolveExecutable();
  const renderer = resolveRenderer();
  const envArgs = (process.env.CHROME_ARGS || '').split(/\s+/).filter(Boolean);
  const args = [...(renderer === 'swiftshader' ? SWIFTSHADER_ARGS : GPU_ARGS), ...extraArgs, ...envArgs];
  const head = headless ?? !process.env.HEADED;
  if (!announced) {
    console.error(`[browser] ${exe} (${source}); renderer ${renderer}${head ? '' : ', headed'}; flags ${args.join(' ')}`);
    announced = true;
  }
  const browser = await chromium.launch({ executablePath: exe, headless: head, args });
  browser.launchInfo = { exe, source, renderer, args };
  return browser;
}

/** Print the page's WebGL UNMASKED_RENDERER once per process (call after the first page load). */
export async function reportWebGL(page) {
  if (webglReported) return null;
  webglReported = true;
  const info = await page
    .evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
      if (!gl) return 'no WebGL context';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    })
    .catch((e) => `unknown (${e.message})`);
  const soft = /swiftshader|llvmpipe|software/i.test(info);
  console.error(`[browser] WebGL renderer: ${info}${soft ? '  <- software rendering (slow)' : ''}`);
  if (soft && resolveRenderer() === 'gpu') {
    console.error('[browser] expected a hardware GPU: try HEADED=1, or CHROME_ARGS="--use-angle=metal" (macOS); see HANDOFF.md');
  }
  return info;
}
