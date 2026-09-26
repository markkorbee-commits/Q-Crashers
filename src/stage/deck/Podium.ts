import * as THREE from 'three';
import { terrainHeight } from '../../world/site';
import { CREW_STAIRS, PODIUM, podiumRects, STEPS, VAULT } from '../booth/layout';
import { boxMinMax, METAL, PAINT, railing, rod, type StageKit, TINT } from '../kit';
import { L } from '../layout';
import { LED_KIND } from '../materials/LedMaterial';

const OUT = new THREE.Vector3(0, 0, 1);

/** red top slab of the podium: slightly proud of the black body, inset from the fascia (black edge) */
const EDGE = 0.06;

/**
 * The walkable front of the stage (daytime drone photos refs/day/day3_aerial.jpg, day4_aerial_rider.jpg;
 * official video 646–740 s):
 *  - the dancers' podium: a red riser (0.3 m) with black fascia in front of the vault, U-shaped around
 *    the lead dancer's pedestal, two cheeks running back beside the grey steps, small side steps;
 *  - the wide grey steps (3 risers) up to the landing in front of the portal at the vault floor (2.7);
 *  - the black scaffold crew stairs from the photo pit up to each corner plinth (with handrails) and
 *    the plinth railings.
 * The walk map (world/stageWalk.ts) reads the same numbers (booth/layout.ts).
 */
export class PodiumBuilder {
  constructor(private kit: StageKit) {}

  build(): void {
    this.podium();
    this.steps();
    for (const s of [-1, 1]) this.crewStairs(s);
  }

  private podium(): void {
    const k = this.kit;
    const P = PODIUM;
    const Y = L.deckY;
    // black body per rectangle (the rectangles only touch along their edges)
    for (const [x0, x1, z0, z1] of podiumRects()) boxMinMax(k.paint, x0, Y - 0.02, z0, x1, P.top, z1, PAINT.black);
    // red top: ONE outline (no seams where the rectangles meet), inset from the outer edges
    const S = STEPS.halfW;
    const e = EDGE;
    const outline: [number, number][] = [
      [-P.halfW + e, P.frontZ - e],
      [-P.notchHalf - e, P.frontZ - e],
      [-P.notchHalf - e, P.notchZ - e],
      [P.notchHalf + e, P.notchZ - e],
      [P.notchHalf + e, P.frontZ - e],
      [P.halfW - e, P.frontZ - e],
      [P.halfW - e, P.cheekBackZ],
      [S + e, P.cheekBackZ],
      [S + e, P.backZ + e],
      [-S - e, P.backZ + e],
      [-S - e, P.cheekBackZ],
      [-P.halfW + e, P.cheekBackZ],
    ];
    const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(shape);
    k.paint.add(g, new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, P.top + 0.006, 0), { color: PAINT.deckTop });
    g.dispose();
    // a thin brushed nosing along the audience-facing edges (reads as the black/alu edge of the photos)
    for (const [x0, x1] of [
      [-P.halfW, -P.notchHalf],
      [P.notchHalf, P.halfW],
    ])
      boxMinMax(k.metal, x0, P.top - 0.035, P.frontZ - 0.02, x1, P.top + 0.004, P.frontZ + 0.012, METAL.steel);
    boxMinMax(k.metal, -P.notchHalf, P.top - 0.035, P.notchZ - 0.02, P.notchHalf, P.top + 0.004, P.notchZ + 0.012, METAL.steel);
    // half-height side steps along the outer flanks (clear of the front-line lamps)
    for (const s of [-1, 1]) {
      const a = s * P.halfW,
        b = s * (P.halfW + P.apron);
      boxMinMax(k.paint, Math.min(a, b), Y - 0.02, P.apronZ0, Math.max(a, b), P.apronY, P.apronZ1, PAINT.black);
      boxMinMax(k.paint, Math.min(a, b) + (s < 0 ? 0.04 : 0), P.apronY, P.apronZ0 + 0.04, Math.max(a, b) - (s > 0 ? 0.04 : 0), P.apronY + 0.006, P.apronZ1 - 0.04, PAINT.deckTop);
    }
    // warm step lights in the fascia (tiny amber marker LEDs every 1.2 m, as on real risers)
    for (let x = -P.halfW + 0.6; x < P.halfW; x += 1.2) {
      if (Math.abs(x) < P.notchHalf + 0.2) continue;
      k.led.rect(new THREE.Vector3(x, P.top - 0.12, P.frontZ + 0.004), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 0.05, 0.05, LED_KIND.candle, (x * 0.37 + 3) % 1);
    }
  }

  /** the grey steps (3 risers) and the landing in front of the portal at the vault floor */
  private steps(): void {
    const k = this.kit;
    const S = STEPS;
    const F = VAULT.floorY;
    const h = (F - PODIUM.top) / S.risers;
    for (let i = 0; i < S.risers; i++) {
      const zf = S.botZ - i * S.tread;
      const top = PODIUM.top + h * (i + 1);
      const zb = i === S.risers - 1 ? PODIUM.cheekBackZ : zf - S.tread;
      boxMinMax(k.stone, -S.halfW, L.deckY, zb, S.halfW, top, zf, TINT.stair);
      // aluminium nosing strip
      boxMinMax(k.metal, -S.halfW, top - 0.03, zf - 0.04, S.halfW, top + 0.004, zf + 0.012, METAL.alu);
    }
    // the landing continues under the portal (its lower 0.8 m) into the vault floor
    boxMinMax(k.stone, -2.75, L.deckY, L.porchFrontZ - L.screenT - 0.02, 2.75, F, PODIUM.cheekBackZ, TINT.stair);
    // amber step-edge lights along the landing riser
    const st = k.led.newStrip();
    k.led.bar(new THREE.Vector3(-S.halfW + 0.1, F - 0.05, S.topZ + 0.016), new THREE.Vector3(S.halfW - 0.1, F - 0.05, S.topZ + 0.016), OUT, 0.03, st, 0, LED_KIND.bar, 2);
  }

  /** black scaffold stairs from the photo pit up to the corner plinth (|X| 40), handrails both sides */
  private crewStairs(s: number): void {
    const k = this.kit;
    const C = CREW_STAIRS;
    const Y = L.deckY;
    const z0 = C.z0,
      z1 = C.z1;
    const run = (C.x1 - C.x0) / C.risers;
    const gFoot = terrainHeight(s * C.x1, (z0 + z1) / 2);
    const rise = (Y - gFoot) / C.risers;
    for (let i = 1; i < C.risers; i++) {
      const a = s * (C.x0 + run * (i - 1)),
        b = s * (C.x0 + run * i);
      const top = Y - rise * i;
      // grating tread + riser plate
      boxMinMax(k.metal, Math.min(a, b), top - 0.05, z0 + 0.05, Math.max(a, b), top, z1 - 0.05, METAL.black);
      boxMinMax(k.metal, s > 0 ? Math.min(a, b) : Math.max(a, b) - 0.02, top - rise, z0 + 0.05, s > 0 ? Math.min(a, b) + 0.02 : Math.max(a, b), top - 0.05, z1 - 0.05, METAL.black);
    }
    // stringers (sloped side beams) + feet
    for (const z of [z0 + 0.03, z1 - 0.03]) {
      rod(k.metal, new THREE.Vector3(s * C.x0, Y - 0.1, z), new THREE.Vector3(s * C.x1, gFoot + 0.05, z), 0.08, METAL.black);
      rod(k.metal, new THREE.Vector3(s * (C.x0 + 0.3), Y - 0.25, z), new THREE.Vector3(s * (C.x0 + 0.3), 0, z), 0.06, METAL.steel);
    }
    // handrails on both sides of the flight
    for (const z of [z0 - 0.03, z1 + 0.03]) railing(k, [new THREE.Vector3(s * C.x0, Y, z), new THREE.Vector3(s * (C.x1 - 0.1), gFoot + 0.19, z)], 1.0, 0.9);
    // the plinth's outer flank: a railing except where the crew stairs arrive
    const xr = s * (C.x0 - 0.06);
    railing(k, [new THREE.Vector3(xr, Y, L.ledgeFrontZ), new THREE.Vector3(xr, Y, z0 - 0.08)], 1.05, 1.0);
    railing(k, [new THREE.Vector3(xr, Y, z1 + 0.08), new THREE.Vector3(xr, Y, -0.12)], 1.05, 1.0);
  }
}
