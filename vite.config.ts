import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * The Endshow recording is a locally supplied asset (research/technical-decisions.md §6): vite copies
 * public/ into the build, so a plain `vite build` would publish ~54 MB of copyrighted audio with any
 * static deploy. Media files under assets/audio are removed from the output unless the build opts in:
 * DQ_SHIP_AUDIO=1, or the artifact build (scripts/build-artifact.mjs, VITE_TARGET=artifact), which
 * deliberately keeps only the AAC + Opus copies. The app falls back to the synth / YouTube sources.
 */
function localAudioOnly(): Plugin {
  let outDir = 'dist';
  return {
    name: 'dq-local-audio-only',
    apply: 'build',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      if (process.env.DQ_SHIP_AUDIO === '1' || process.env.VITE_TARGET === 'artifact') return;
      const dir = path.join(outDir, 'assets', 'audio');
      if (!fs.existsSync(dir)) return;
      let removed = 0;
      for (const f of fs.readdirSync(dir)) {
        if (!/\.(m4a|mp4|mp3|ogg|opus|webm|wav|flac|aac)$/i.test(f)) continue;
        fs.rmSync(path.join(dir, f), { force: true });
        removed++;
      }
      if (removed) console.log(`[dq-local-audio-only] ${removed} local audio file(s) left out of ${path.relative(process.cwd(), outDir)} (DQ_SHIP_AUDIO=1 to include)`);
    },
  };
}

/**
 * Chunking: three.js ships as its own long-cacheable vendor chunk and the big self-contained
 * subsystems (stage kit, audio engine, world generators) as parallel-loading chunks, so no single
 * file dominates the download and an app update does not invalidate the renderer. The developer
 * menu and the lighting dev proxy are dynamic imports (loaded on demand).
 */
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  plugins: [localAudioOnly()],
  build: {
    target: 'es2022',
    // three.js alone is ~600 kB minified; an app chunk growing past that deserves a look
    chunkSizeWarningLimit: 650,
    assetsInlineLimit: 0,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 30 },
            { name: 'stage', test: /[\\/]src[\\/]stage[\\/]/, priority: 20 },
            { name: 'audio', test: /[\\/]src[\\/]audio[\\/]/, priority: 20 },
            {
              name: 'world',
              // lighting/dev (DevProxy) stays a lazily loaded chunk of its own
              test: (id: string) => /[\\/]src[\\/](world|crowd|fx|pyro|fireworks|lasers|lighting)[\\/]/.test(id) && !/[\\/]lighting[\\/]dev[\\/]/.test(id),
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
