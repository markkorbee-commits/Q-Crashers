import { defineConfig } from 'vite';

/**
 * Chunking: three.js ships as its own long-cacheable vendor chunk and the big self-contained
 * subsystems (stage kit, audio engine, world generators) as parallel-loading chunks, so no single
 * file dominates the download and an app update does not invalidate the renderer. The developer
 * menu and the lighting dev proxy are dynamic imports (loaded on demand).
 */
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
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
