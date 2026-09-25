import * as THREE from 'three';
import { Rng } from '../core/rng';
import { DECKING, FLOOR, ROAD, ROAD_W, TOILETS, WATER_POINTS, FIRST_AID, BEACH } from './site';
import { dataTexture } from './tex';

/**
 * Site surface masks painted with Canvas2D in world coordinates (non-tiling), packed into one RGBA
 * texture sampled by the ground shader:
 *   R = concrete paving (the RED floor, lanes, bank paths)
 *   G = asphalt / gravel road / hard-standing (value = lightness: 1 road, 0.55 hard-standing)
 *   B = worn ground: trampled grass, dirt paths, gravel pads, sand
 *   A = timber decking
 */
export const SITE_RECT = { x0: -320, z0: -260, w: 640, h: 640 };

type Paint = (g: CanvasRenderingContext2D) => void;

export function buildSiteMask(size: number): THREE.DataTexture {
  const S = size;
  const k = S / SITE_RECT.w;
  const mk = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.fillStyle = '#000';
    g.fillRect(0, 0, S, S);
    // world metres -> pixels
    g.setTransform(k, 0, 0, k, -SITE_RECT.x0 * k, -SITE_RECT.z0 * k);
    return [c, g];
  };
  const rect = (g: CanvasRenderingContext2D, x0: number, z0: number, x1: number, z1: number, v: number) => {
    g.fillStyle = gray(v);
    g.fillRect(x0, z0, x1 - x0, z1 - z0);
  };
  const line = (g: CanvasRenderingContext2D, pts: [number, number][], w: number, v: number) => {
    g.strokeStyle = gray(v);
    g.lineWidth = w;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    pts.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z)));
    g.stroke();
  };

  // --- R: concrete
  const paintR: Paint = (g) => {
    rect(g, -FLOOR.x, -4, FLOOR.x, FLOOR.z1, 1);
    // perimeter service lanes along the floor edges up to the road (OSM loop 60195507)
    rect(g, -45, -4, -41.8, 143, 0.92);
    rect(g, 41.8, -4, 45, 143, 0.92);
    // paved cross paths on the banks at Z ≈ 21 and the crest service paths (FACT 2026 aerial)
    rect(g, -104, 19.5, -44, 22.5, 0.85);
    rect(g, 44, 19.5, 104, 22.5, 0.85);
    rect(g, -107, -20, -99, 106, 0.7);
    rect(g, 98, -20, 106, 106, 0.7);
  };
  // --- G: roads / hard-standing
  const paintG: Paint = (g) => {
    rect(g, -FLOOR.x, FLOOR.z1, FLOOR.x, FLOOR.hard1, 0.55);
    line(g, ROAD, ROAD_W, 1);
    // backstage roads (OSM 802215880, 802215882, 1120634215)
    line(g, [[89, -69], [-35, -68], [-54, -94]], 5, 0.8);
    line(g, [[-32, -2], [-38, -68]], 5, 0.8);
    line(g, [[-49, -101], [92, -105]], 5, 0.8);
    // lake-loop road towards the NE entrance
    line(g, [[-137, 94], [-150, 60], [-152, -30]], 6, 0.85);
  };
  // --- B: wear, dirt, gravel, sand
  const paintB: Paint = (g) => {
    const rng = new Rng(4242);
    g.filter = `blur(${Math.max(1, Math.round(1.5 * k))}px)`;
    // trampled strip at the foot of both banks and in front of the bars on the crests
    rect(g, -52, 0, -44, 110, 0.55);
    rect(g, 44, 0, 52, 110, 0.55);
    rect(g, -99, 26, -88, 84, 0.6);
    rect(g, 88, 24, 99, 80, 0.6);
    // desire lines: back corners up the bank ramps, to toilets / water / first aid
    line(g, [[-44, 118], [-70, 110], [-96, 100]], 5, 0.7);
    line(g, [[44, 118], [70, 110], [96, 98]], 5, 0.7);
    line(g, [[-100, 138], [-123, 146]], 4, 0.8);
    line(g, [[100, 138], [117, 123]], 3.5, 0.75);
    for (const [x, z] of WATER_POINTS) {
      g.fillStyle = gray(0.85);
      g.beginPath();
      g.arc(x, z, 6, 0, Math.PI * 2);
      g.fill();
    }
    for (const t of TOILETS) rect(g, t.x0 - 4, t.z0 - 5, t.x1 + 4, t.z1 + 5, 0.9);
    g.beginPath();
    g.arc(FIRST_AID[0], FIRST_AID[1], 7, 0, Math.PI * 2);
    g.fill();
    // backstage gravel pad
    rect(g, -18, -68, 19, -34, 0.9);
    // beach on the far shore
    rect(g, BEACH.x0, BEACH.z0, BEACH.x1, BEACH.z1, 1);
    // random worn patches on the banks (heat-parched, walked-on)
    for (let i = 0; i < 90; i++) {
      const side = rng.chance(0.5) ? -1 : 1;
      const x = side * rng.range(50, 106);
      const z = rng.range(-10, 110);
      g.fillStyle = gray(rng.range(0.15, 0.5));
      g.beginPath();
      g.ellipse(x, z, rng.range(2, 7), rng.range(2, 9), rng.range(0, Math.PI), 0, Math.PI * 2);
      g.fill();
    }
    g.filter = 'none';
  };
  const paintA: Paint = (g) => {
    rect(g, DECKING.x0, DECKING.z0, DECKING.x1, DECKING.z1, 1);
  };

  const chans = [paintR, paintG, paintB, paintA].map((paint) => {
    const [c, g] = mk();
    paint(g);
    return g.getImageData(0, 0, c.width, c.height).data;
  });
  const out = new Uint8Array(S * S * 4);
  for (let i = 0, n = S * S; i < n; i++) {
    out[i * 4] = chans[0][i * 4];
    out[i * 4 + 1] = chans[1][i * 4];
    out[i * 4 + 2] = chans[2][i * 4];
    out[i * 4 + 3] = chans[3][i * 4];
  }
  const t = dataTexture(out, S, S, { repeat: false, mips: true, aniso: 4 });
  return t;
}

function gray(v: number): string {
  const c = Math.round(Math.min(1, Math.max(0, v)) * 255);
  return `rgb(${c},${c},${c})`;
}
