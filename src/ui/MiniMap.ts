import type { App } from '../core/App';
import type { NamedSpot } from '../core/types';
import { BARS } from '../bar/bars';

/**
 * Top-down map of the Holy Grounds (SVG in world metres: x -> right, z -> down, the stage at the
 * top). Spots are clickable; the player arrow shows position and heading.
 */
const X0 = -175,
  X1 = 175,
  Z0 = -75,
  Z1 = 305;

export function miniMapSvg(app: App, spots: NamedSpot[]): string {
  const vb = `${X0} ${Z0} ${X1 - X0} ${Z1 - Z0}`;
  const a = app.anchors;
  const pts = (name: Parameters<typeof a.get>[0]) => a.get(name);
  const circles = (name: Parameters<typeof a.get>[0], r: number, fill: string) =>
    pts(name)
      .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.z.toFixed(1)}" r="${r}" fill="${fill}"/>`)
      .join('');
  const bars = BARS.map((b) => {
    const deg = (-b.rotation * 180) / Math.PI;
    return `<g transform="translate(${b.x} ${b.z}) rotate(${deg})"><rect x="${-b.width / 2}" y="-3" width="${b.width}" height="6" rx="1.2" fill="#2a0d0b" stroke="#ff2a12" stroke-width=".8"/><rect x="${-b.width / 2 + 1}" y="1.6" width="${b.width - 2}" height="1.2" fill="#ff2a12"/></g>`;
  }).join('');
  const spotEls = spots
    .map(
      (s, i) =>
        `<g class="spot" data-spot="${i}" tabindex="-1"><circle cx="${s.position.x.toFixed(1)}" cy="${s.position.z.toFixed(1)}" r="6.5" fill="rgba(225,6,0,.55)" stroke="#fff" stroke-width="1.2"/><text x="${s.position.x.toFixed(1)}" y="${(s.position.z + 2.6).toFixed(1)}" font-size="7.4" font-weight="700" text-anchor="middle" fill="#fff" font-family="Inter,system-ui,sans-serif" pointer-events="none">${i + 1}</text></g>`,
    )
    .join('');
  const grid: string[] = [];
  for (let x = -150; x <= 150; x += 50) grid.push(`<path d="M${x} ${Z0}V${Z1}"/>`);
  for (let z = -50; z <= 300; z += 50) grid.push(`<path d="M${X0} ${z}H${X1}"/>`);
  return `<svg class="minimap" viewBox="${vb}" role="img" aria-label="Map of the grounds">
    <g stroke="rgba(243,237,228,.05)" stroke-width=".6">${grid.join('')}</g>
    <path d="M-120 8 L120 8 L150 120 L140 290 L-140 290 L-150 120 Z" fill="rgba(60,70,40,.18)" stroke="rgba(243,237,228,.14)" stroke-width=".8" stroke-dasharray="3 3"/>
    <path d="M-8 290 V200 M8 290 V200" stroke="rgba(243,237,228,.1)" stroke-width="1"/>
    <g>
      <path d="M-122 -6 L-60 -14 L-50 -2 L50 -2 L60 -14 L122 -6 L60 -24 L0 -40 L-60 -24 Z" fill="#3a0a08" stroke="#ff2a12" stroke-width=".8"/>
      <rect x="-48" y="-30" width="96" height="30" fill="#1c0605" stroke="#ff2a12" stroke-width=".8"/>
      <circle cx="0" cy="-12" r="5" fill="#ff2a12"/>
      <text x="0" y="-46" font-size="9" text-anchor="middle" fill="#ff5a3a" font-family="Oswald,Impact,sans-serif" letter-spacing="2">MAINSTAGE</text>
    </g>
    ${circles('pillars_base', 1.8, '#ffb070')}
    ${circles('delay_towers', 3, '#8d857d')}
    ${pts('foh')
      .map((p) => `<rect x="${p.x - 6}" y="${p.z - 4}" width="12" height="8" fill="#1a1a1e" stroke="#8d857d" stroke-width=".8"/><text x="${p.x}" y="${p.z + 14}" font-size="6.5" text-anchor="middle" fill="#8d857d" font-family="Inter,sans-serif">FOH</text>`)
      .join('')}
    ${bars}
    ${spotEls}
    <g class="me"><path d="M0 -8 L5.5 6 L0 3 L-5.5 6 Z" fill="#f3ede4" stroke="#07070a" stroke-width="1"/></g>
  </svg>`;
}

/** position/rotate the player arrow (call on open and while the panel is visible) */
export function updateMiniMapPlayer(svg: SVGSVGElement, app: App, yaw: number): void {
  const me = svg.querySelector('.me') as SVGGElement | null;
  if (!me) return;
  const p = app.playerPos;
  const x = Math.max(X0 + 8, Math.min(X1 - 8, p.x));
  const z = Math.max(Z0 + 8, Math.min(Z1 - 8, p.z));
  // yaw 0 faces -Z (up on the map); positive yaw turns left (towards -X)
  me.setAttribute('transform', `translate(${x.toFixed(1)} ${z.toFixed(1)}) rotate(${((-yaw * 180) / Math.PI).toFixed(1)})`);
}
