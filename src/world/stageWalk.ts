import * as THREE from 'three';
import type { App } from '../core/App';
import { yawTowards } from '../player/spots';
import { BOOTH, CREW_STAIRS, PODIUM, podiumRects, STEPS, VAULT, vaultCeiling, vaultHalfWidth } from '../stage/booth/layout';
import { deckHardware, deckTopAt } from '../stage/deck/hardware';
import { L } from '../stage/layout';
import { terrainHeight } from './site';

/**
 * The walkable MainStage: raised surfaces (deck, dancers' podium, grey steps, vault floor, DJ riser,
 * pit / crew stairs, the castle stairs up to the upper platform and gallery), walls with a vertical
 * extent (castle, portal, vault shell, booth desk, railings, every pyro / laser unit on the deck lip,
 * the invisible front-lip rail) and the vault ceiling (third-person camera clamp).
 *
 * Pure data + pure functions of (x, z): deterministic, no allocation after construction. The player
 * walks it (PlayerController), performers stand on it (stageFloorSmooth), the stage registers it.
 *
 * Stairs are ramps through the step nosings, so heightAt is continuous: walking up the pit stairs
 * lifts the eye 1.9 m over 2.1 m without a pop.
 */

/** a walkable top: flat (axis 0) or a ramp rising along X (1) / Z (2) from y0 at the min edge to y1 at the max edge */
export interface WalkSurface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y0: number;
  y1: number;
  axis: 0 | 1 | 2;
  tag: string;
}

/** an obstacle footprint that blocks bodies overlapping [y0, y1] */
export interface WalkWall {
  round: boolean;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** circle (round) */
  x: number;
  z: number;
  r: number;
  y0: number;
  y1: number;
  tag: string;
  /** also a 2D obstacle for the third-person camera arm (registered as a 'deckw-cam' collider) */
  cam: boolean;
}

/** top of a surface at (x, z) (clamped into its footprint) */
export function surfaceTop(s: WalkSurface, x: number, z: number): number {
  if (s.axis === 0) return s.y0;
  const t = s.axis === 1 ? (x - s.minX) / (s.maxX - s.minX) : (z - s.minZ) / (s.maxZ - s.minZ);
  return s.y0 + (s.y1 - s.y0) * Math.min(1, Math.max(0, t));
}

function inside(s: { minX: number; maxX: number; minZ: number; maxZ: number }, x: number, z: number): boolean {
  return x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ;
}

/** world bounds of everything on / around the stage (quick reject for far-away walkers) */
export const STAGE_WALK_BOUNDS = { minX: -46, maxX: 46, minZ: -13.5, maxZ: 4 };

export class StageWalk {
  readonly surfaces: WalkSurface[] = [];
  readonly walls: WalkWall[] = [];

  constructor() {
    build(this);
  }

  near(x: number, z: number, margin = 1): boolean {
    const b = STAGE_WALK_BOUNDS;
    return x > b.minX - margin && x < b.maxX + margin && z > b.minZ - margin && z < b.maxZ + margin;
  }

  /**
   * highest stage surface under (x, z) whose top is at most `maxY` (a body with its feet at y can
   * reach tops up to y + step); NaN when there is none
   */
  topAt(x: number, z: number, maxY = Infinity): number {
    let best = NaN;
    if (!this.near(x, z, 0)) return best;
    for (const s of this.surfaces) {
      if (!inside(s, x, z)) continue;
      const t = surfaceTop(s, x, z);
      if (t <= maxY + 1e-4 && !(t <= best)) best = t;
    }
    return best;
  }

  /** is (x, z) inside the vault / portal throat (under a roof) */
  underRoof(x: number, z: number): boolean {
    return z < VAULT.frontZ + 0.02 && z > VAULT.backZ - 0.4 && Math.abs(x) < VAULT.span / 2 + 0.3;
  }

  /** roof height over (x, z) (Infinity in the open) */
  ceilingAt(x: number, z: number): number {
    if (!this.underRoof(x, z)) return Infinity;
    if (z >= VAULT.screenZ) return portalCeiling(x);
    return vaultCeiling(Math.max(z, VAULT.backZ), x);
  }
}

/** the portal opening's crown (equilateral pointed arch, span 5.4, apex 7.2) above lateral offset x */
export function portalCeiling(x: number): number {
  const w = L.portalW;
  const half = w / 2;
  const spring = L.portalApex - w * Math.sin(Math.PI / 3);
  const d = Math.min(Math.abs(x), half) + half;
  return spring + Math.sqrt(Math.max(0, w * w - d * d));
}

let shared: StageWalk | null = null;
/** the (immutable) stage walk map */
export function stageWalk(): StageWalk {
  return (shared ??= new StageWalk());
}

/** exact walkable stage floor at (x, z) (highest surface), NaN off the stage */
export function stageFloorAt(x: number, z: number): number {
  return stageWalk().topAt(x, z);
}

/**
 * Smoothed stage floor for performers (feet ease over riser edges instead of popping 0.3 m):
 * surfaces are blended in ascending order with a soft 0.2 m edge. Falls back to `fallback` off stage.
 */
export function stageFloorSmooth(x: number, z: number, fallback = L.deckY): number {
  const w = stageWalk();
  if (!w.near(x, z, 0.5)) return fallback;
  let y = NaN;
  // surfaces are stored low to high (build order), so later ones blend over earlier ones
  for (const s of w.surfaces) {
    const d = Math.min(x - s.minX, s.maxX - x, z - s.minZ, s.maxZ - z);
    if (d < -0.2) continue;
    const f = d >= 0.2 ? 1 : (d + 0.2) / 0.4;
    const t = surfaceTop(s, x, z);
    const k = f * f * (3 - 2 * f);
    if (Number.isNaN(y)) y = k >= 0.5 ? t : fallback;
    else if (t > y) y += (t - y) * k;
  }
  return Number.isNaN(y) ? fallback : y;
}

// ---------------------------------------------------------------------------------------------

function build(w: StageWalk): void {
  const Y = L.deckY;
  const surf = (tag: string, minX: number, maxX: number, minZ: number, maxZ: number, y0: number, y1 = y0, axis: 0 | 1 | 2 = 0) =>
    w.surfaces.push({ tag, minX: Math.min(minX, maxX), maxX: Math.max(minX, maxX), minZ: Math.min(minZ, maxZ), maxZ: Math.max(minZ, maxZ), y0, y1, axis });
  const wall = (tag: string, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, cam = false) =>
    w.walls.push({ round: false, tag, minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), x: 0, z: 0, r: 0, y0, y1, cam });
  const post = (tag: string, x: number, z: number, r: number, y0: number, y1: number) =>
    w.walls.push({ round: true, tag, x, z, r, minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, y0, y1, cam: false });

  // ---- surfaces (low to high: stageFloorSmooth blends in this order) --------------------------
  const P = PODIUM;
  const g = (x: number, z: number) => terrainHeight(x, z);
  // pit stairs: 7 risers from the photo pit up to the deck lip (ramp through the nosings)
  surf('pit-stairs', -2.1, 2.1, 0, 2.1, Y, g(0, 2.1), 2);
  // crew stairs at the corner plinths (ramps along X, 1.9 at the plinth edge)
  const C = CREW_STAIRS;
  surf('crew-stairs', C.x0, C.x1, C.z0, C.z1, Y, g(C.x1, (C.z0 + C.z1) / 2), 1);
  surf('crew-stairs', -C.x1, -C.x0, C.z0, C.z1, g(-C.x1, (C.z0 + C.z1) / 2), Y, 1);
  // the deck and its corner plinths
  surf('deck', -L.plinthX1, L.plinthX1, L.facadeZ, 0, Y);
  // side steps of the podium, the podium (U around the pedestal notch + the cheeks beside the steps)
  surf('podium-step', -P.halfW - P.apron, -P.halfW, P.apronZ0, P.apronZ1, P.apronY);
  surf('podium-step', P.halfW, P.halfW + P.apron, P.apronZ0, P.apronZ1, P.apronY);
  for (const [x0, x1, z0, z1] of podiumRects()) surf('podium', x0, x1, z0, z1, P.top);
  // grey steps up to the vault: a ramp through the nosings (the top riser at the landing edge, one
  // tread in front of the lowest riser on the podium)
  surf('vault-steps', -STEPS.halfW, STEPS.halfW, STEPS.topZ, STEPS.botZ + STEPS.tread, VAULT.floorY, P.top, 2);
  surf('vault-landing', -STEPS.halfW, STEPS.halfW, VAULT.frontZ, STEPS.topZ, VAULT.floorY);
  surf('vault-floor', -VAULT.span / 2, VAULT.span / 2, VAULT.backZ, VAULT.frontZ, VAULT.floorY);
  surf('dj-riser', -BOOTH.matHalfW, BOOTH.matHalfW, BOOTH.matBackZ, BOOTH.matFrontZ, VAULT.floorY + BOOTH.matH);
  // castle stairs through the round arches up to the upper platform (5.5) and the gallery
  const zf = L.porchFrontZ - L.screenT;
  for (const s of [-1, 1]) {
    surf('castle-stairs', s * L.stairX0, s * L.stairX1, L.stairBackZ, zf, s > 0 ? Y : L.platformY, s > 0 ? L.platformY : Y, 1);
    surf('castle-landing', s * L.stairX1, s * L.porchHalf, L.stairBackZ, zf, L.platformY);
    surf('castle-platform', s * L.stairX0, s * (L.porchHalf + 0.7), L.facadeZ, L.stairBackZ, L.platformY);
    surf('castle-gallery', s * (L.porchHalf + 0.7), s * 23, L.facadeZ, L.galleryFrontZ, L.platformY);
  }

  // ---- walls ---------------------------------------------------------------------------------
  const TOP = 12;
  // castle facade (and the core behind it)
  wall('facade', -L.coreHalf, L.coreHalf, L.facadeZ - 0.8, L.facadeZ, 0, TOP, true);
  // front-lip rail (invisible) except at the pit stairs; plinth flanks except at the crew stairs
  wall('lip-rail', -L.plinthX1 - 0.3, -2.2, -0.04, 0.35, Y, Y + 1.1);
  wall('lip-rail', 2.2, L.plinthX1 + 0.3, -0.04, 0.35, Y, Y + 1.1);
  for (const s of [-1, 1]) {
    wall('plinth-rail', s * L.plinthX1, s * (L.plinthX1 + 0.3), L.sideFrontZ, C.z0 - 0.05, Y, Y + 1.1);
    wall('plinth-rail', s * L.plinthX1, s * (L.plinthX1 + 0.3), C.z1 + 0.05, 0.35, Y, Y + 1.1);
    // crew stair handrails (both sides of the flight, ground to handrail height)
    wall('crew-rail', s * C.x0, s * (C.x1 + 0.1), C.z0 - 0.12, C.z0 - 0.02, -1, Y + 1.1);
    wall('crew-rail', s * C.x0, s * (C.x1 + 0.1), C.z1 + 0.02, C.z1 + 0.12, -1, Y + 1.1);
    // pit stair handrails
    wall('pit-rail', s * 2.0, s * 2.25, -0.05, 2.25, -1, Y + 1.0);
  }
  // photo-pit subs (12 ground stacks, 2.7 x 1.1 m, 1.65 m high)
  {
    const B = L.subBlock;
    const step = (84 - B.w) / 11;
    for (let i = 0; i < 12; i++) {
      const cx = -42 + B.w / 2 + i * step;
      wall('subs', cx - B.w / 2, cx + B.w / 2, 1.2, 1.2 + B.d, -1, g(cx, 1.75) + B.h);
    }
  }
  // deck-lip hardware: flame heads (their flame column above too), gerbs, comets, lasers, CO2, pots, mines, lamps, wedges
  for (const it of deckHardware()) {
    const base = deckTopAt(it.x, it.z);
    const top = it.kind === 'flame' ? base + 8 : base + Math.max(0.3, it.h);
    if (it.round) post(`deck-${it.kind}`, it.x, it.z, it.hx + 0.02, base, top);
    else wall(`deck-${it.kind}`, it.x - it.hx, it.x + it.hx, it.z - it.hz, it.z + it.hz, base, top);
  }
  // deck floor moving heads (lighting rig bodies on the fixtures_floor anchors: X −35.1 + 1.8 i, Z −3.0)
  for (let i = 0; i < 40; i++) {
    const x = -35.1 + i * 1.8;
    const base = deckTopAt(x, -3.0);
    post('deck-head', x, -3.0, 0.24, base, base + 0.6);
  }
  // porch screen + portal frames (Z −6.9 … −5.6), the stair arches open at deck level
  const zs = L.porchFrontZ;
  for (const s of [-1, 1]) {
    // portal jamb + gilt frames (the opening narrows to ±2.35 at head height on the landing)
    wall('portal', s * 2.35, s * 3.6, zf, zs + 0.4, Y, L.porchTop, true);
    // screen between the portal frame and the stair arch (+ the banners on its face)
    wall('screen', s * 3.6, s * 6.4, zf, zs + 0.2, Y, L.porchTop, true);
    wall('screen', s * 11.4, s * (L.porchHalf + 0.7), zf, zs + 0.2, Y, L.porchTop, true);
    // porch side walls closing the stair recess
    wall('porch-side', s * L.porchHalf, s * (L.porchHalf + 0.7), L.stairBackZ, zs, Y - 0.3, L.porchTop, true);
    // the lowered mass between the vault and the stair recess (walkers on the platform stay on it: rail)
    wall('porch-mass', s * VAULT.outerHalf, s * L.stairX0, L.facadeZ, zf, Y, VAULT.massTop, true);
    wall('platform-rail', s * (L.stairX0 - 0.1), s * (L.stairX0 + 0.05), L.facadeZ, L.stairBackZ, L.platformY, L.platformY + 1.1);
    // flight handrail on the screen side (the first metre stays open: the way in through the arch)
    wall('stair-rail', s * (L.stairX0 + 1.0), s * (L.stairX1 + 0.5), zf - 0.14, zf - 0.02, Y + 0.45, L.platformY + 1.1);
    // the platform edge over the recess, the gallery front and ends
    wall('platform-rail', s * (L.stairX0 + 0.1), s * (L.stairX1 - 0.1), L.stairBackZ - 0.12, L.stairBackZ - 0.02, L.platformY, L.platformY + 1.1);
    wall('gallery-rail', s * (L.porchHalf + 0.7), s * 23.1, L.galleryFrontZ, L.galleryFrontZ + 0.12, L.platformY, L.platformY + 1.1);
    wall('gallery-rail', s * (L.porchHalf + 0.7), s * (L.porchHalf + 0.8), L.galleryFrontZ, L.stairBackZ, L.platformY, L.platformY + 1.1);
    wall('gallery-rail', s * 23.0, s * 23.2, L.facadeZ, L.galleryFrontZ + 0.12, L.platformY, L.platformY + 1.1);
    // vault shell: rib inner edges at shoulder height, stepped per metre along the tunnel
    for (let z = VAULT.screenZ; z > VAULT.backZ; z -= 1) {
      const z1 = Math.max(VAULT.backZ, z - 1);
      const half = vaultHalfWidth(z1, VAULT.floorY + 1.45) - VAULT.ribDepth;
      wall('vault-wall', s * half, s * (VAULT.outerHalf + 0.1), z1, z, VAULT.floorY - 0.8, VAULT.roofApex, true);
    }
  }
  wall('vault-back', -VAULT.outerHalf, VAULT.outerHalf, L.facadeZ - 0.4, VAULT.backZ, VAULT.floorY - 0.8, VAULT.roofApex, true);
  // the booth desk (a little inside its gear overhang so the passage beside it stays open)
  wall('booth-desk', -BOOTH.halfW + 0.13, BOOTH.halfW - 0.13, BOOTH.z - BOOTH.halfD, BOOTH.z + BOOTH.halfD, VAULT.floorY, VAULT.floorY + BOOTH.height + 0.15, true);
  // booth monitors on their tripods beside the DJ
  for (const s of [-1, 1]) post('booth-monitor', s * 1.8, BOOTH.djZ + 0.55, 0.3, VAULT.floorY, VAULT.floorY + 1.8);
}

// ---------------------------------------------------------------------------------------------
// registration (MainStage): camera-arm colliders + the stage viewing spots

/** the stage viewing positions (menu group "Stage", listed first) */
export const STAGE_SPOT_IDS = ['dj', 'dancers', 'castle', 'stage_left', 'stage_right'] as const;

/**
 * Register the walk map with the app: the walls flagged `cam` become 2D 'deckw-cam' colliders so the
 * third-person spring arm stops at the vault shell, the portal and the castle (the player itself
 * walks the height-aware walk map and skips these copies), plus the viewing spots on the stage.
 */
export function registerStageWalk(app: App): void {
  const w = stageWalk();
  for (const wl of w.walls) {
    if (!wl.cam) continue;
    app.addCollider({ kind: 'box', minX: wl.minX, maxX: wl.maxX, minZ: wl.minZ, maxZ: wl.maxZ, tag: `deckw-cam-${wl.tag}` });
  }
  const field = new THREE.Vector3(0, 3, 60);
  const add = (id: string, label: string, x: number, y: number, z: number, look: THREE.Vector3, pitch: number) => {
    const position = new THREE.Vector3(x, y, z);
    app.addSpot({ id, label, position, yaw: yawTowards(position, look), pitch });
  };
  // behind the decks: eyes ~1.75 m over the booth floor (0.1 m DJ riser), looking out through the arch
  add('dj', 'DJ booth', 0, VAULT.floorY + BOOTH.matH, BOOTH.djZ, field, -0.05);
  // on the dancers' podium, front edge left of the lead's pedestal
  add('dancers', "Dancers' podium", -2.7, PODIUM.top, PODIUM.frontZ - 0.35, new THREE.Vector3(-1.5, 3, 60), -0.04);
  // the upper castle platform / gallery (up the castle stairs): over the troupe and the field
  add('castle', 'Castle gallery', -14.2, L.platformY, L.galleryFrontZ - 0.55, new THREE.Vector3(-2, 2, 24), -0.16);
}
