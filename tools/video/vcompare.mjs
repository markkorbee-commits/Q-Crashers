#!/usr/bin/env node
/**
 * Side-by-side sheet: official video frame (left) | our render (right), paused at the same moment.
 *
 *   node tools/video/vcompare.mjs --port 5173 --out cmp_03_a.jpg --shots "t|x,y,z,yaw,pitch,fov;t|x,y,z,yaw,pitch,fov;..."
 *        [--showcam] [--quality medium] [--mode filmed] [--show <candidate show.json>] [--settle 2500]
 *        [--frames $ENDSHOW_DATA/f4] [--offset 0.036] [--base http://localhost:<port>/]
 *
 * t = VIDEO time in seconds: the left image is $ENDSHOW_DATA/f4/<round(t*4)>.jpg, our show is rendered at t - offset.
 * Pose: free camera x,y,z,yaw,pitch[,fov] (yaw 0 looks at the stage along -z; fov default 50).
 * --showcam: render through the Show camera (the official edit as authored in the show file); shots are then just
 *   times ("412.5;1047.25"), poses are ignored.
 * --show: serve a candidate show file (e.g. $ENDSHOW_DATA/work/merged_03.json from tools/video/merge.py) instead of
 *   public/show/endshow-2026.json, through a request override (the repo file is not touched).
 * --settle: ms after each seek before the screenshot (2500 suits SwiftShader; ~500 is plenty on a GPU).
 * --out: a bare file name goes to $ENDSHOW_DATA/work/compare/. The sheet contains video frames: never commit it.
 * Needs a dev server on the port (npx vite --port <port> --strictPort) and python3 with Pillow (env PYTHON).
 * Browser/renderer: scripts/lib/browser.mjs (CHROME_PATH, RENDERER=gpu|swiftshader).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { launchBrowser, reportWebGL } from '../../scripts/lib/browser.mjs';
import { dataPath, workDir } from '../../scripts/lib/data.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const has = (n) => args.includes(`--${n}`);
const port = opt('port', '5173');
const base = opt('base', `http://localhost:${port}/`);
let out = opt('out', 'vcompare.jpg');
if (!path.dirname(out) || path.dirname(out) === '.') out = path.join(workDir('compare'), out);
const quality = opt('quality', 'medium');
const mode = opt('mode', 'filmed');
const showFile = opt('show', '');
const settle = Number(opt('settle', '2500'));
const offset = Number(opt('offset', '0.036'));
const frames = opt('frames', dataPath('f4'));
const showcam = has('showcam');
if (!fs.existsSync(frames)) console.error(`[vcompare] frames dir not found: ${frames} (left column stays black)`);
const shots = opt('shots', '')
  .split(';')
  .filter(Boolean)
  .map((s) => {
    const [t, p] = s.split('|');
    if (!showcam && !p) throw new Error(`shot "${s}" has no pose (t|x,y,z,yaw,pitch,fov) and --showcam is not set`);
    return { t: Number(t), pose: p ? p.split(',').map(Number) : null };
  });
if (!shots.length) throw new Error('--shots is required');

const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
if (showFile) {
  const body = fs.readFileSync(showFile);
  await page.route('**/show/endshow-2026.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body }));
}
await page.goto(`${base}?autostart&quality=${quality}&analyze=0&nogovernor&mode=${mode}${showcam ? '&camera=showcam' : ''}`, {
  waitUntil: 'load',
  timeout: 120000,
});
await reportWebGL(page);
await page.waitForFunction(() => window.__app && window.__app.ready, null, { timeout: 900000, polling: 250 });
await page.evaluate(() => {
  document.getElementById('ui')?.style.setProperty('display', 'none');
  window.__app.clock.pause();
});
const tmp = fs.mkdtempSync(path.join(workDir(), 'vc-'));
const rows = [];
for (const [k, s] of shots.entries()) {
  const [x, y, z, yaw, pitch, fov] = s.pose ?? [];
  await page.evaluate(
    ({ t, pose, x, y, z, yaw, pitch, fov }) => {
      const a = window.__app;
      a.clock.seek(t);
      if (pose) a.get('camera').setFreePose(x, y, z, yaw, pitch, fov);
    },
    { t: s.t - offset, pose: !showcam && !!s.pose, x, y, z, yaw, pitch, fov: fov || 50 },
  );
  await page.waitForTimeout(settle);
  const shot = path.join(tmp, `r${k}.png`);
  await page.screenshot({ path: shot, timeout: 240000 });
  rows.push({ t: s.t, ref: path.join(frames, String(Math.round(s.t * 4)).padStart(5, '0') + '.jpg'), shot });
}
await browser.close();
const py = `
import json,sys
from PIL import Image, ImageDraw
rows=json.load(open(sys.argv[1])); W,H=640,360
im=Image.new('RGB',(W*2,H*len(rows)),(0,0,0)); d=ImageDraw.Draw(im)
for i,r in enumerate(rows):
    try: im.paste(Image.open(r['ref']).convert('RGB').resize((W,H)),(0,i*H))
    except Exception: pass
    im.paste(Image.open(r['shot']).convert('RGB').resize((W,H)),(W,i*H))
    d.rectangle([0,i*H,300,i*H+22],fill=(0,0,0)); d.text((4,i*H+4),'VIDEO %d:%05.2f'%(r['t']//60,r['t']%60),fill=(255,255,0))
    d.rectangle([W,i*H,W+120,i*H+22],fill=(0,0,0)); d.text((W+4,i*H+4),'OURS',fill=(0,255,255))
im.save(sys.argv[2],quality=85)
`;
const j = path.join(tmp, 'rows.json');
fs.writeFileSync(j, JSON.stringify(rows));
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
execFileSync(process.env.PYTHON || 'python3', ['-c', py, j, out]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ out, shots: rows.length, errors }));
