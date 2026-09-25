/**
 * Build target. `artifact` = the sandboxed claude.ai artifact build (no third-party iframes such as
 * YouTube, no script-driven downloads); `web` = normal hosting (GitHub Pages, npm run preview).
 */
export const BUILD_TARGET: 'web' | 'artifact' = import.meta.env.VITE_TARGET === 'artifact' ? 'artifact' : 'web';
export const IS_ARTIFACT = BUILD_TARGET === 'artifact';
