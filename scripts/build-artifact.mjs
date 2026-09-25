#!/usr/bin/env node
/**
 * Builds the sandboxed claude.ai artifact variant into dist-artifact/:
 *  - VITE_TARGET=artifact (no YouTube iframe source, photo preview instead of downloads)
 *  - index.html rewritten to the artifact page contract: no <html>/<head>/<body> wrappers,
 *    <title> first, stylesheets inlined, module scripts kept as same-origin files.
 * Prints the file map to publish (published path -> local path).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const out = 'dist-artifact';
execSync(`npx vite build --outDir ${out} --emptyOutDir`, { stdio: 'inherit', env: { ...process.env, VITE_TARGET: 'artifact' } });

let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
// artifact gallery name (the explanation goes into the publish description)
const title = '<title>Defqon.1 Endshow Experience</title>';
const fonts = pick(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g);
const metas = pick(/<meta name="(description|theme-color)"[^>]*>/g);
const styles = [];
for (const m of html.matchAll(/<link rel="stylesheet"[^>]*href="(\.\/[^"]+\.css)"[^>]*>/g)) {
  styles.push(`<style>\n${fs.readFileSync(path.join(out, m[1]), 'utf8')}\n</style>`);
}
const scripts = pick(/<script type="module"[^>]*><\/script>/g);
const preloads = pick(/<link rel="modulepreload"[^>]*>/g);
const body = (html.match(/<body>([\s\S]*?)<\/body>/) ?? ['', '<div id="app"></div>'])[1]
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .trim();
const page = [title, ...metas, ...fonts, ...styles, ...preloads, body, ...scripts].join('\n') + '\n';
fs.writeFileSync(path.join(out, 'index.html'), page);
for (const m of html.matchAll(/<link rel="stylesheet"[^>]*href="\.\/([^"]+\.css)"[^>]*>/g)) fs.rmSync(path.join(out, m[1]), { force: true });

// audio: publish only the web-friendly AAC file (every browser plays it; artifact files must be < 15 MB)
const audioDir = path.join(out, 'assets', 'audio');
if (fs.existsSync(audioDir)) {
  for (const f of fs.readdirSync(audioDir)) {
    if (!/^endshow-2026\.m4a$|\.analysis\.json$/.test(f)) fs.rmSync(path.join(audioDir, f), { force: true });
  }
  const m4a = path.join(audioDir, 'endshow-2026.m4a');
  if (fs.existsSync(m4a) && fs.statSync(m4a).size > 15 * 1024 * 1024) throw new Error('endshow-2026.m4a is larger than the 15 MB artifact file limit');
}

const files = [];
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f !== 'index.html') files.push(p);
  }
};
walk(out);
const map = Object.fromEntries(files.map((p) => [path.relative(out, p).split(path.sep).join('/'), p]));
const total = files.reduce((s, p) => s + fs.statSync(p).size, fs.statSync(path.join(out, 'index.html')).size);
fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(map, null, 1));
console.log(JSON.stringify({ page: path.join(out, 'index.html'), files: map, totalKB: Math.round(total / 1024) }, null, 1));
