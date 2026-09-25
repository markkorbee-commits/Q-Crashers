#!/usr/bin/env node
/**
 * Reference comparison sheet: renders the reconstruction at the exact show times of the official
 * video's storyboard frames and lays each render next to the reference frame.
 *
 * Usage:
 *   node scripts/compare.mjs --refdir <dir with fNNN_*.jpg> --frames 7,9,25,34,51 [--out .shots/compare.jpg]
 *        [--base http://localhost:5173/] [--quality high] [--size 640x360] [--settle 1500] [--nopost]
 *        [--pose aerial|wide_front|stage_closeup|wide_side|field_level|x,y,z,yaw,pitch[,fov]]
 *        [--analysis <dir with frames_000.json ...>] (per-frame shot types -> matching camera pose)
 * The storyboard has one frame every 1581/160 s (frame i at i * 9.88125 s). Reference frames are
 * copyrighted and are NOT part of the repository: pass the folder where you keep them.
 * Needs python3 + Pillow for the final composition.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const has = (n) => args.includes(`--${n}`);
const refdir = opt('refdir', null);
const frames = (opt('frames', '0,7,25,34,51,72,103,113,130,152') || '').split(',').filter(Boolean).map(Number);
const out = opt('out', '.shots/compare.jpg');
const base = opt('base', 'http://localhost:5173/');
const quality = opt('quality', 'high');
const [W, H] = opt('size', '640x360').split('x').map(Number);
const settle = Number(opt('settle', '1500'));
const forcedPose = opt('pose', null);
const STEP = 1581 / 160;

/** camera poses that approximate the official video's shot types: x, y, z, yaw, pitch, fov */
const POSES = {
  aerial: [0, 95, 290, 0, -0.3, 60],
  wide_front: [0, 2.2, 52, 0, 0.16, 55],
  stage_closeup: [0, 4, 24, 0, 0.42, 60],
  wide_side: [58, 3, 42, 0.95, 0.12, 60],
  field_level: [10, 1.7, 70, 0.08, 0.1, 62],
  performer: [0, 3.5, 12, 0, 0.18, 55],
  other: [0, 1.7, 90, 0, 0.1, 62],
};

function poseFor(i) {
  if (forcedPose) return POSES[forcedPose] ?? forcedPose.split(',').map(Number);
  // optional per-frame shot type lookup from an analysis json next to the reference frames
  const idx = path.join(opt('analysis', path.join(refdir ?? '.', '..', '..')), `frames_${String(Math.floor(i / 40) * 40).padStart(3, '0')}.json`);
  try {
    const d = JSON.parse(fs.readFileSync(idx, 'utf8'));
    const f = d.frames.find((x) => x.i === i);
    if (f && POSES[f.shot]) return POSES[f.shot];
  } catch {
    /* no analysis available */
  }
  return POSES.wide_front;
}

const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}?autostart&quality=${quality}&analyze=0&nogovernor${has('nopost') ? '&nopost' : ''}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__app && window.__app.ready, null, { timeout: 900000, polling: 250 });
await page.evaluate(() => document.getElementById('ui')?.style.setProperty('display', 'none'));
const tmp = fs.mkdtempSync('.shots/cmp-');
const pairs = [];
for (const i of frames) {
  const t = i * STEP + STEP * 0.5; // storyboard thumbnails represent the middle of their window
  const [x, y, z, yaw, pitch, fov] = poseFor(i);
  await page.evaluate(
    ({ t, x, y, z, yaw, pitch, fov }) => {
      const a = window.__app;
      a.clock.seek(t);
      a.get('camera').setFreePose(x, y, z, yaw, pitch, fov);
    },
    { t, x, y, z, yaw, pitch, fov },
  );
  await page.waitForTimeout(settle);
  const shot = path.join(tmp, `r${String(i).padStart(3, '0')}.png`);
  await page.screenshot({ path: shot, timeout: 240000 });
  const ref = refdir ? fs.readdirSync(refdir).find((f) => f.startsWith(`f${String(i).padStart(3, '0')}_`)) : null;
  pairs.push({ i, t: Math.round(t), shot, ref: ref ? path.join(refdir, ref) : '' });
}
await browser.close();
const py = `
import json,sys
from PIL import Image, ImageDraw
pairs=json.loads(sys.argv[1]); out=sys.argv[2]; W,H=${W},${H}
rows=len(pairs); sheet=Image.new('RGB',(W*2, H*rows),(0,0,0)); d=ImageDraw.Draw(sheet)
for r,p in enumerate(pairs):
    if p['ref']:
        sheet.paste(Image.open(p['ref']).convert('RGB').resize((W,H)),(0,r*H))
    sheet.paste(Image.open(p['shot']).convert('RGB').resize((W,H)),(W,r*H))
    d.rectangle([0,r*H,230,r*H+18],fill=(0,0,0)); d.text((4,r*H+3),f"#{p['i']} t={p['t']}s  REFERENCE | OURS",fill=(255,255,0))
sheet.save(out,quality=88)
`;
execFileSync('python3', ['-c', py, JSON.stringify(pairs), out]);
console.log(JSON.stringify({ out, frames, errors }, null, 1));
