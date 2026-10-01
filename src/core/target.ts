/**
 * Build target. `artifact` = the sandboxed claude.ai artifact build (no third-party iframes such as
 * YouTube; the sandbox blocks script-driven downloads); `web` = normal hosting (GitHub Pages, npm run preview).
 */
export const BUILD_TARGET: 'web' | 'artifact' = import.meta.env.VITE_TARGET === 'artifact' ? 'artifact' : 'web';
export const IS_ARTIFACT = BUILD_TARGET === 'artifact';
/**
 * Default audio source when no local Endshow audio is found and the visitor never chose one. The shareable
 * web build (GitHub Pages, `VITE_DEFAULT_SOURCE=youtube`) plays with the official YouTube video as the synced
 * picture-in-picture source, so nothing copyrighted is hosted; `?src=youtube|synth` overrides it per link.
 */
const urlSrc = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('src') : null;
export const DEFAULT_SOURCE: 'youtube' | 'synth' | null = IS_ARTIFACT
  ? null
  : urlSrc === 'youtube' || urlSrc === 'synth'
    ? urlSrc
    : import.meta.env.VITE_DEFAULT_SOURCE === 'youtube'
      ? 'youtube'
      : null;
