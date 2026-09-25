/**
 * Inline SVG icon set (hand-drawn for this project, 24x24 grid, 1.75 stroke, currentColor).
 * No icon fonts, no downloads, no emoji.
 */
const P: Record<string, string> = {
  play: '<path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.3-7.2a.8.8 0 0 0 0-1.4L8.2 4.1A.8.8 0 0 0 7 4.8Z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4.5" width="4.2" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1" fill="currentColor" stroke="none"/>',
  restart: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
  back10: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.2v4.3h4.3"/><text x="12.3" y="15.6" font-size="7.4" font-family="Inter,system-ui,sans-serif" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none">10</text>',
  fwd10: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.2v4.3h-4.3"/><text x="11.7" y="15.6" font-size="7.4" font-family="Inter,system-ui,sans-serif" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none">10</text>',
  volume: '<path d="M4 9.5h3.2L12 5.2v13.6l-4.8-4.3H4Z" fill="currentColor" fill-opacity=".18"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18 6.5a7.8 7.8 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.2L12 5.2v13.6l-4.8-4.3H4Z" fill="currentColor" fill-opacity=".18"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  person: '<circle cx="12" cy="6" r="2.6"/><path d="M8 21v-5.2l-1.6-.6.8-4.4c.2-1.2 1.2-2 2.4-2h4.8c1.2 0 2.2.8 2.4 2l.8 4.4-1.6.6V21"/>',
  drone: '<circle cx="5.5" cy="6" r="2.5"/><circle cx="18.5" cy="6" r="2.5"/><circle cx="5.5" cy="18" r="2.5"/><circle cx="18.5" cy="18" r="2.5"/><rect x="9" y="9.5" width="6" height="5" rx="1.2"/><path d="m7.5 7.8 1.7 1.8M16.5 7.8l-1.7 1.8M7.5 16.2l1.7-1.8M16.5 16.2l-1.7-1.8"/>',
  orbit: '<path d="M3 15c3-7 12-10.5 18-8.5"/><path d="m17.8 4.6 3.2 1.9-2 3.1"/><path d="M4.5 19.5h15"/><path d="M8 19.5v-3.5l2-2 2 2 2-3 2 2v4.5"/>',
  film: '<rect x="3" y="7" width="13" height="10" rx="1.6"/><path d="m16 11 5-3v8l-5-3"/><circle cx="7" cy="4.5" r="1.8"/><circle cx="12" cy="4.5" r="1.8"/>',
  camera: '<path d="M3.5 8.2c0-.9.7-1.7 1.7-1.7h2.4l1.6-2h5.6l1.6 2h2.4c.9 0 1.7.8 1.7 1.7v9.6c0 .9-.8 1.7-1.7 1.7H5.2c-1 0-1.7-.8-1.7-1.7Z"/><circle cx="12" cy="13" r="3.6"/>',
  pin: '<path d="M12 21.5s-6.8-6.2-6.8-11.6a6.8 6.8 0 0 1 13.6 0c0 5.4-6.8 11.6-6.8 11.6Z"/><circle cx="12" cy="9.8" r="2.4"/>',
  waves: '<path d="M3 8c2.2-2 4.2-2 6 0s3.8 2 6 0 3.8-2 6 0"/><path d="M3 13c2.2-2 4.2-2 6 0s3.8 2 6 0 3.8-2 6 0"/><path d="M3 18c2.2-2 4.2-2 6 0s3.8 2 6 0 3.8-2 6 0"/>',
  gauge: '<path d="M4.2 17.5a8.5 8.5 0 1 1 15.6 0"/><path d="m12 13.5 4.3-4.8"/><circle cx="12" cy="13.8" r="1.4" fill="currentColor"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.6"/><circle cx="17.5" cy="16" r="2.6"/>',
  fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  unfullscreen: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  cinema: '<path d="M3.5 3.5 20.5 20.5"/><path d="M9.9 5.7A10 10 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.5M6.4 7.2C3.9 8.9 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/><path d="M9.9 10a3 3 0 0 0 4.2 4.2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.3a2.7 2.7 0 0 1 5.2.9c0 1.9-2.6 2.3-2.6 4"/><circle cx="12" cy="17.3" r=".9" fill="currentColor" stroke="none"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronUp: '<path d="m6 15 6-6 6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4.5h12.5l-2.5 4 2.5 4H5"/>',
  upload: '<path d="M12 15.5V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/>',
  broadcast: '<rect x="2.5" y="5" width="19" height="13" rx="2.2"/><path d="m10 9 5 2.5-5 2.5Z" fill="currentColor"/><path d="M8 21h8"/>',
  synth: '<path d="M2.5 12h2.5l2-6 3 12 3-15 3 16 2-7h3.5"/>',
  silent: '<path d="M3 12h3M9 12h2M14 12h2M19 12h2"/><path d="M12 5v3M12 16v3"/>',
  cup: '<path d="M5.5 5h13l-1.6 14.3a1.9 1.9 0 0 1-1.9 1.7H9a1.9 1.9 0 0 1-1.9-1.7Z"/><path d="M6 9h12"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.2"/><path d="M12 9.2v5.6"/>',
  drop: '<path d="M12 3.5s6.2 6.6 6.2 10.8a6.2 6.2 0 0 1-12.4 0C5.8 10.1 12 3.5 12 3.5Z"/>',
  thermo: '<path d="M10 14.2V5a2 2 0 0 1 4 0v9.2a4 4 0 1 1-4 0Z"/><path d="M12 9v7"/>',
  heart: '<path d="M12 20s-7.8-4.6-7.8-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.8 2.4C19.8 15.4 12 20 12 20Z"/><path d="M4.8 12.5h4l1.5-2.4 2.2 4.4 1.4-2h5.3"/>',
  warning: '<path d="M10.3 4.3 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
  split: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M12 2.5v19"/><path d="m8 10-2 2 2 2M16 10l2 2-2 2"/>',
  reset: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4.5V9H8"/><path d="M12 8v4l2.6 1.6"/>',
  pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m10 8.7 4 6.6" />',
  beer: '<path d="M5 7h10v12.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 19.5Z"/><path d="M15 9.5h2a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-2"/><path d="M5 7a2.5 2.5 0 0 1 2.4-3 3 3 0 0 1 5 .2A2.3 2.3 0 0 1 15 7"/><path d="M8.5 11v6M11.5 11v6"/>',
  glass: '<path d="M6 4h12l-1.4 16H7.4Z"/><path d="M6.8 12h10.4"/>',
  shot: '<path d="M7 7h10l-1.2 12.5H8.2Z"/><path d="M7.6 11.5h8.8"/>',
  bolt: '<path d="M13 2.5 4.5 13.5h6.5l-1 8 8.5-11h-6.5Z"/>',
  crosshair: '<circle cx="12" cy="12" r="7.5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
  ruler: '<rect x="2.5" y="8" width="19" height="8" rx="1.2"/><path d="M6.5 8v3M10.5 8v4M14.5 8v3M18.5 8v4"/>',
  grid: '<path d="M4 4h16v16H4ZM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16"/>',
  move: '<path d="M12 3v18M3 12h18"/><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M6.5 14h11"/>',
  touch: '<path d="M9 11.5V5.2a1.7 1.7 0 0 1 3.4 0v5.3"/><path d="M12.4 10.2V9a1.7 1.7 0 0 1 3.4 0v2"/><path d="M15.8 10.3a1.7 1.7 0 0 1 3.2.8v3.4a6.5 6.5 0 0 1-6.5 6.5h-.8a6 6 0 0 1-4.6-2.2l-2.6-3.2a1.6 1.6 0 0 1 2.4-2.1L9 15"/>',
  mouse: '<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v3.5"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/>',
  map: '<path d="m3 6.5 6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5Z"/><path d="M9 4v13.5M15 6.5V20"/>',
  aperture: '<circle cx="12" cy="12" r="9"/><path d="m14.3 3.3-3.8 6.6M20.6 9.4h-7.7M18.5 18.1l-3.8-6.6M9.7 20.7l3.8-6.6M3.4 14.6h7.7M5.5 5.9l3.8 6.6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/>',
  roll: '<path d="M4.5 16.5A8.5 8.5 0 0 1 19 7"/><path d="m19.5 3.5-.4 3.8-3.8-.4"/><path d="M8 20h8"/>',
  focus: '<path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/><circle cx="12" cy="12" r="3"/>',
  fov: '<path d="M12 18 3.5 6.5M12 18l8.5-11.5"/><path d="M6.5 10.5a8 8 0 0 1 11 0"/>',
  bug: '<rect x="7" y="7" width="10" height="13" rx="5"/><path d="M12 7v13M4 10.5h3M17 10.5h3M4 16h3M17 16h3M9 4.5 10.2 7M15 4.5 13.8 7"/>',
  download: '<path d="M12 4v11.5"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M4 20h16"/>',
  ticket: '<path d="M3 8.5V6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v2a3.5 3.5 0 0 0 0 7v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-2a3.5 3.5 0 0 0 0-7Z"/><path d="M14.5 5v14" stroke-dasharray="2 2"/>',
};

/** SVG markup for an icon name (unknown names render an empty box). */
export function icon(name: keyof typeof P | string, cls = ''): string {
  const body = P[name] ?? '';
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/**
 * Original abstract emblem (NOT the official Defqon.1 logo): a vertical flame blade rising
 * between two angular, mechanical wing strokes — a nod to the 2026 dragon MainStage.
 */
let emblemSeq = 0;
export function emblem(cls = ''): string {
  const id = `em-g${emblemSeq++}`;
  return `<svg class="emblem ${cls}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ff5a1f"/><stop offset=".55" stop-color="#e10600"/><stop offset="1" stop-color="#7a0000"/>
      </linearGradient>
    </defs>
    <path d="M32 4c3.6 7.2 7.6 12.6 7.6 21.5 0 6.3-3.3 10.6-7.6 16.5-4.3-5.9-7.6-10.2-7.6-16.5C24.4 16.6 28.4 11.2 32 4Z" fill="url(#${id})"/>
    <path d="M32 18.5c1.5 3.2 3 5.6 3 9.4 0 2.8-1.3 4.8-3 7.4-1.7-2.6-3-4.6-3-7.4 0-3.8 1.5-6.2 3-9.4Z" fill="#ffd9b0" opacity=".9"/>
    <path d="M22.5 30.5 5 22l6.2 14.5L4 44l14.3-1.2L22 51l6.2-7.6" fill="none" stroke="url(#${id})" stroke-width="3.2" stroke-linejoin="miter"/>
    <path d="M41.5 30.5 59 22l-6.2 14.5L60 44l-14.3-1.2L42 51l-6.2-7.6" fill="none" stroke="url(#${id})" stroke-width="3.2" stroke-linejoin="miter"/>
    <path d="M26 56.5h12" stroke="#e10600" stroke-width="3" stroke-linecap="square"/>
  </svg>`;
}
