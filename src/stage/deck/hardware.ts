import { L } from '../layout';
import { PODIUM } from '../booth/layout';

/**
 * Deck-lip pyro / laser / fixture hardware on the bible anchor positions (terrain-layout.json
 * pyroAnchors / lasers): ONE table read by the deck geometry (Deck.ts) and by the walk map
 * (world/stageWalk.ts: every unit gets a small collider, nobody walks through a flame head).
 */
export type DeckItemKind = 'flame' | 'gerb' | 'comet' | 'laser' | 'co2' | 'bengal' | 'mine' | 'lamp' | 'wedge';

export interface DeckItem {
  kind: DeckItemKind;
  /** centre of the unit's footprint */
  x: number;
  z: number;
  /** footprint half sizes (boxes) or radius (round units) */
  hx: number;
  hz: number;
  round: boolean;
  /** height of the unit above its base */
  h: number;
}

/** is (x, z) on the dancers' podium (the U around the pedestal notch; the side steps excluded) */
export function onPodium(x: number, z: number): boolean {
  const P = PODIUM;
  const ax = Math.abs(x);
  if (ax > P.halfW || z < P.backZ || z > P.frontZ) return false;
  return !(ax < P.notchHalf && z > P.notchZ);
}

/** top of the stage floor a deck unit stands on: the podium riser or the deck */
export function deckTopAt(x: number, z: number): number {
  return onPodium(x, z) ? PODIUM.top : L.deckY;
}

let cache: DeckItem[] | null = null;

export function deckHardware(): readonly DeckItem[] {
  if (cache) return cache;
  const out: DeckItem[] = [];
  const box = (kind: DeckItemKind, x: number, z: number, hx: number, hz: number, h: number) => out.push({ kind, x, z, hx, hz, round: false, h });
  const disc = (kind: DeckItemKind, x: number, z: number, r: number, h: number) => out.push({ kind, x, z, hx: r, hz: r, round: true, h });
  // 24 flame heads X −35.65…+35.65 @ 3.1 m, Z −0.4
  for (let i = 0; i < 24; i++) box('flame', -35.65 + i * 3.1, -0.4, 0.28, 0.25, 0.46);
  // 20 gerbs X −38…+38 @ 4 m, Z −0.85
  for (let i = 0; i < 20; i++) disc('gerb', -38 + i * 4, -0.85, 0.11, 0.32);
  // 12 comet racks X −38.5…+38.5 @ 7 m, Z −1.1
  for (let i = 0; i < 12; i++) box('comet', -38.5 + i * 7, -1.1, 0.22, 0.15, 0.5);
  // 12 deck lasers X −33…+33 @ 6 m (housing Z −1.9…−1.4)
  for (let i = 0; i < 12; i++) box('laser', -33 + i * 6, -1.65, 0.18, 0.25, 0.34);
  // CO2 jets (X ±5, ±15, ±25, ±35 at Z −2.3)
  for (const x of [-35, -25, -15, -5, 5, 15, 25, 35]) disc('co2', x, -2.3, 0.16, 0.42);
  // Bengal pots (X ±10, ±30) and flash mines (X ±8, ±20)
  for (const x of [-30, -10, 10, 30]) disc('bengal', x, -1.9, 0.2, 0.28);
  for (const x of [-20, -8, 8, 20]) box('mine', x, -1.8, 0.25, 0.2, 0.18);
  // static front-line lamps between the moving heads
  for (let i = 0; i < 18; i++) {
    const x = -34 + i * 4;
    if (Math.abs(x) < 2.5) continue;
    box('lamp', x, -2.775, 0.2, 0.175, 0.2);
  }
  // floor wedges beside the grey steps (the inner pair gave way to the steps: the booth has its own monitors)
  for (const x of [-5.5, 5.5]) box('wedge', x, -4.6, 0.31, 0.25, 0.36);
  cache = out;
  return out;
}
