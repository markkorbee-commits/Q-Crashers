import * as THREE from 'three';

/**
 * Site model of the RED field at the Walibi event site, Biddinghuizen (Defqon.1 2026).
 * Authoritative sources: research/terrain-analysis.md (OSM, AHN4, PDOK aerials, official 2026
 * floorplan) and research/stage-canonical.md. Local frame: metres, origin = centre of the stage
 * front edge at floor level, +Z = bearing 325° (stage -> audience), +X = bearing 235°.
 * Every number below carries the research tag it came from.
 */

// ------------------------------------------------------------------------------------------------
// geographic frame

/** bearing (deg, clockwise from north) + altitude (deg) -> unit vector in the local world frame */
export function dirFromAzAlt(azDeg: number, altDeg: number, out = new THREE.Vector3()): THREE.Vector3 {
  const a = THREE.MathUtils.degToRad(azDeg);
  const h = THREE.MathUtils.degToRad(altDeg);
  const e = Math.sin(a) * Math.cos(h);
  const n = Math.cos(a) * Math.cos(h);
  // terrain-analysis §4: X = −0.819152·e − 0.573576·n ; Z = −0.573576·e + 0.819152·n
  return out.set(-0.819152 * e - 0.573576 * n, Math.sin(h), -0.573576 * e + 0.819152 * n).normalize();
}

/** Endshow run: Sat 27 Jun 2026 22:40 → 23:06 CEST (event-context §4.3, INFERENCE ±20 min). */
export const SHOW_LENGTH = 1581;
/** ephemeris (PyEphem, apparent, site 52.4401 N 5.7575 E) at show start / end — FACT (computed) */
export const EPHEM = {
  sun: { az: [319.3, 324.85], alt: [-3.56, -7.14] },
  moon: { az: [162.99, 168.64], alt: [7.79, 8.71], phase: 0.9575 },
  venus: { az: [282.54, 287.56], alt: [12.73, 8.87], mag: -3.98 },
  jupiter: { az: [298.06, 303.18], alt: [5.04, 1.74], mag: -1.66 },
};

/** bright stars (az, alt, mag) at 22:53 CEST (show middle) — FACT (PyEphem catalogue, mag < 3) */
export const STARS: [number, number, number][] = [
  [213.74, 52.9, -0.05], [96.14, 56.7, 0.03], [342.85, 10.79, 0.08], [106.47, 23.38, 0.76], [215.03, 20.17, 0.98],
  [168.39, 10.36, 1.06], [308.43, 6.83, 1.16], [66.53, 42.13, 1.25], [271.44, 13.95, 1.36], [312.49, 8.84, 1.58],
  [294.57, 66.01, 1.76], [2.26, 12.5, 1.79], [312.03, 53.42, 1.81], [270.59, 72.23, 1.85], [335.23, 12.09, 1.9],
  [0.15, 51.83, 1.97], [274.4, 21.79, 2.01], [43.96, 3.85, 2.07], [351.08, 67.81, 2.07], [29.45, 4.15, 2.07],
  [138.93, 43.83, 2.08], [5.67, 3.92, 2.09], [17.32, 7.18, 2.1], [252.2, 31.07, 2.14], [182.11, 64.18, 2.22],
  [290.23, 70.05, 2.23], [74.77, 41.76, 2.23], [78.83, 69.03, 2.24], [25.14, 25.09, 2.24], [27.65, 29.46, 2.28],
  [303.98, 51.25, 2.34], [206.77, 62.62, 2.35], [82.78, 7.19, 2.38], [294.82, 57.07, 2.41], [156.58, 19.0, 2.43],
  [56.58, 10.45, 2.44], [41.92, 46.87, 2.45], [228.0, 7.41, 2.58], [178.05, 43.9, 2.63], [106.33, 25.44, 2.72],
  [192.21, 20.68, 2.75], [140.53, 35.66, 2.76], [144.42, 47.42, 2.78], [231.68, 37.85, 2.85],
];

// ------------------------------------------------------------------------------------------------
// field furniture (terrain-analysis §7/§14, stage-canonical)

/** lantern pillars = the 8 RED delay towers: 2 rows × 4 (FACT floorplan `fest_delay`, stage-canonical x = ±22) */
export const PILLAR_X = 22;
export const PILLAR_Z = [46.5, 73.5, 100.7, 127.7];
/** stable pillar order: row-major from the stage outwards, left (−X) before right (+X) */
export const PILLARS: { x: number; z: number; row: number; side: -1 | 1 }[] = PILLAR_Z.flatMap((z, row) => [
  { x: -PILLAR_X, z, row, side: -1 as const },
  { x: PILLAR_X, z, row, side: 1 as const },
]);
/** pillar build dimensions (stage-canonical: 3.2 m shaft, ≈14.5 m total, ≈5 m plinth; oar2/delio photos) */
export const PILLAR = {
  plinth: 5.0,
  plinthH: 0.45,
  fence: 8.2,
  shaft: 3.2,
  baseTop: 1.7,
  shaftTop: 10.2,
  capTop: 11.15,
  lanternBottom: 11.5,
  girdle: 12.75,
  girdleTop: 13.05,
  crystalTop: 14.45,
  top: 14.8,
  crystalR: 1.32,
};
/** lantern centre height (light source for the fake lighting) */
export const LANTERN_Y = 12.8;

/** front-of-stage barrier line (stage-canonical: z = +3, photo pit z 0…3) */
export const PIT_Z = 3;
/** straight stage front |x| ≤ 60, arms from (±60, 0) to (±88, +24) (stage-canonical) */
export const STAGE_HALF = 60;
export const ARM_TIP = { x: 88, z: 24 };

/**
 * FOH / press tower: the Endshow photo (delio, EXIF 22:41) was shot from the axis at Z ≈ 150, ≈ 6 m up,
 * with an unobstructed view over the aisle (stage-analysis §3.3, INFERENCE) — no tall FOH stands
 * between the pillar rows. ASSUMPTION: that camera position is the upper deck of the RED FOH tower,
 * which stands on the axis behind the road on the decking.
 */
export const FOH = { x0: -8, x1: 8, z0: 150, z1: 160, deck1: 1.1, deck2: 5.6, roof: 9.6 };
/** low camera enclosure on the axis (stage-analysis §3.4: Z ≈ 88 ± 10, ≈ 11.2 m wide, 1.2 m barriers) */
export const CAM_PEN = { x: 0, z: 88, w: 11.2, d: 5.2 };
/** small fenced riser on the axis (stage-analysis §3.4: Z ≈ 65, ≈ 4.8 m wide) */
export const RISER = { x: 0, z: 65, w: 4.8, d: 3.6, h: 0.9 };

/** paved floor (FACT: OSM grass-polygon notch + aerials) */
export const FLOOR = { x: 44, z0: 0, z1: 113, hard1: 137 };
/** main E–W road (FACT OSM 60195506, 12 m) */
export const ROAD: [number, number][] = [
  [-137, 94], [-131, 110], [-114, 131], [-87, 144], [-44, 143], [43, 143], [128, 160], [188, 179], [245, 181],
];
export const ROAD_W = 12;
/** timber decking behind the road (FACT 2024 aerial) and the premium deck over the lake */
export const DECKING = { x0: -57, x1: 47, z0: 149, z1: 172 };
export const PREMIUM = { x0: -52, x1: 51, z0: 172, z1: 211 };
/** lake (FACT OSM 689953672), water level Y −1.8 (INFERENCE) */
export const LAKE: [number, number][] = [
  [-108, 246], [-29, 251], [-19, 245], [-3, 246], [28, 255], [44, 256], [204, 251], [215, 244], [227, 225], [209, 217],
  [67, 215], [62, 210], [59, 183], [52, 175], [40, 174], [-2, 180], [-31, 178], [-50, 172], [-78, 182], [-114, 184],
  [-118, 188], [-120, 210], [-119, 233], [-108, 246],
];
export const WATER_Y = -1.8;
/** far-shore beach (FACT floorplan `l_beach`) */
export const BEACH = { x0: -24, x1: 24, z0: 254, z1: 276 };

/** tree belts (FACT OSM 66342521 left, 66340386 right, simplified) */
export const TREE_BELTS: [number, number][][] = [
  [
    [16, -59], [17, -63], [-40, -63], [-54, -82], [-64, -75], [-123, -71], [-128, -63], [-128, -37], [-124, -34], [-121, 82],
    [-118, 91], [-91, 117], [-48, 116], [-48, 107], [-84, 107], [-91, 105], [-108, 89], [-108, -48], [-105, -55], [-97, -58],
  ],
  [
    [128, -38], [124, -57], [118, -66], [109, -73], [98, -78], [87, -65], [24, -63], [27, -58], [87, -57], [99, -55],
    [105, -51], [108, -34], [108, 99], [58, 109], [56, 113], [129, 113],
  ],
];
/** further forest polygons around the site (FACT OSM, simplified 2 m) */
export const FORESTS: [number, number][][] = [
  [[170.5, -130.2], [173.2, -138.8], [172.9, -160], [170.4, -160]],
  [[213.3, -100.9], [186.2, -100], [187.4, -66.7], [214.5, -67.6]],
  [[-61.9, -118.6], [-60.8, -95.9], [-56.2, -97.5], [-57.5, -115.2]],
  [[260, 8.1], [216.6, 7.7], [215.4, -42.7], [204.2, -41.2], [207.8, 33.9], [213.5, 34.8], [260, 34]],
  [[-196.5, -71], [-209.6, -56.7], [-196.9, -51.3], [-190.6, -59.7], [-177, -123.9], [-171.7, -129.4], [-185, -130]],
  [[-154.4, 58.9], [-154.2, 48.8], [-214.8, 47.8], [-233.6, 50.6], [-238.5, 48.4], [-234.9, 36.3], [-160, 36]],
  [[-144.5, -55.3], [-139.5, -106.3], [-140.4, -133.8], [-144.8, -141.5], [-142.1, -160], [-150, -160], [-152, -56]],
  [[-260, -10.6], [-229.8, -60.4], [-220, -65], [-220.2, -67.6], [-260, -64.1]],
];

/** Goliath roller coaster, Walibi Holland (FACT OSM way 235708844; 46.9 m, rcdb 1565), simplified */
export const GOLIATH: [number, number][] = [
  [-171.2, -129], [-166.7, -150.3], [-184.4, -154.4], [-182.9, -162.1], [-179.7, -168.2], [-171.9, -186.3], [-158.9, -184.1],
  [-141.2, -280.3], [-147.8, -330], [-132.5, -360.2], [-122.5, -364.2], [-112.1, -379.7], [-56.2, -406.3], [-34.1, -410.2],
  [-16.2, -408.5], [-6, -428.8], [6.7, -439.2], [18.5, -442], [29.7, -438.9], [39.8, -430.1], [44.7, -417.9], [43.7, -406.5],
  [38.2, -397.2], [19.8, -387.4], [9.1, -388.5], [-13.5, -399.4], [-22.2, -390.7], [-29.7, -388.5], [-48.7, -393], [-57.7, -389.8],
  [-67.1, -381.3], [-69.5, -376.1], [-66.6, -344.9], [-73.5, -328.8], [-87.4, -320.2], [-95.8, -319.4], [-108.5, -323.3],
  [-120.5, -311.8], [-125.2, -296.8], [-135.8, -215.4], [-158.2, -106.9], [-158.7, -100.1], [-151.7, -77.9], [-155.6, -67.2],
  [-159.3, -63.5], [-168.3, -61], [-188.7, -65.6], [-177, -123.9], [-171.2, -129],
];
/** track height profile (ASSUMPTION: lift 46.9 m, first drop, decreasing camelbacks), one per GOLIATH point */
export const GOLIATH_H = [
  3, 3, 4, 5, 5, 5, 6, 46.9, 44, 4, 8, 26, 14, 24, 20, 12, 10, 11, 13, 16, 18, 15, 10, 7, 11, 18, 21, 17, 9, 12, 16, 18, 22, 19, 12, 9,
  8, 17, 22, 16, 9, 8, 12, 9, 7, 6, 5, 4, 3,
];

/** neighbouring festival areas (terrain-analysis §10, INFERENCE ±10 m) — only their lights are seen */
export const OTHER_AREAS: { name: string; x: number; z: number; r: number; hue: string }[] = [
  { name: 'PURPLE', x: 101, z: 196, r: 30, hue: '#b25cff' },
  { name: 'YELLOW', x: 182, z: 18, r: 28, hue: '#ffc45a' },
  { name: 'INDIGO', x: 246, z: -85, r: 26, hue: '#5a6cff' },
  { name: 'BLACK', x: 277, z: -245, r: 30, hue: '#ffffff' },
  { name: 'GOLD', x: 350, z: -43, r: 28, hue: '#ffb830' },
  { name: 'SILVER', x: 375, z: -153, r: 26, hue: '#dfe8ff' },
  { name: 'OLD', x: 373, z: 67, r: 26, hue: '#ff7a2a' },
  { name: 'MAGENTA', x: 385, z: 132, r: 26, hue: '#ff3ab8' },
  { name: 'UV', x: 311, z: 244, r: 26, hue: '#8a3cff' },
  { name: 'BLUE', x: 445, z: 257, r: 40, hue: '#3a78ff' },
];

/** facilities (terrain-analysis §7/§14: floorplan legend, INFERENCE ±8 m) */
export const WATER_POINTS: [number, number][] = [[-74, 171], [-82, 172], [-111, 146]];
export const FIRST_AID: [number, number] = [117, 123];
export const TOILETS: { x0: number; x1: number; z0: number; z1: number }[] = [
  { x0: -135, x1: -111, z0: 142, z1: 150 },
  { x0: 178, x1: 202, z0: 133, z1: 141 },
];
export const FERRIS_WHEEL = { x: 86.5, z: 187.5, r: 16 };

// ------------------------------------------------------------------------------------------------
// terrain height (AHN4 DTM, terrain-analysis §5.1 — analytic fit, ±0.3 m)

const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** ∫ smoothstep(a−r, a+r, u) du — a linear ramp whose corner at `a` is rounded over ±r */
function softHinge(x: number, a: number, r: number): number {
  if (x <= a - r) return 0;
  if (x >= a + r) return x - a;
  const w = 2 * r;
  const t = (x - (a - r)) / w;
  return w * (t * t * t - 0.5 * t * t * t * t);
}
/** 0..1 linear between a and b with rounded corners */
function softRamp(x: number, a: number, b: number, r: number): number {
  return (softHinge(x, a, r) - softHinge(x, b, r)) / (b - a);
}

/** side-bank profile across |X| (inner slope 9.6 % from 46 m, crest 5.2–5.6 m at 100–109, outer slope to 126) */
function sideProfile(ax: number): number {
  if (ax < 45) return 0;
  const inner = 5.25 * softRamp(ax, 46, 101, 3);
  const crest = 0.3 * sstep(99, 104, ax) * (1 - sstep(106, 111, ax));
  const outer = 1 - softRamp(ax, 109, 126.5, 3);
  return (inner + crest) * outer;
}

/** smooth maximum (k = blend width in metres) */
function smax(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

/**
 * Terrain height (m above the paved floor) at x, z — the RED amphitheatre bowl:
 * flat paved floor, side banks rising 5.2 m at |X| 46 → 100, crests at |X| 100–109 falling to the
 * tree belts at 126, a rear bank behind the stage (0 → 5.5 m at Z −5 → −60), the back plaza falling
 * 0.5 m towards the lake, and the lake bed below the water line.
 */
export function terrainHeight(x: number, z: number): number {
  const ax = Math.abs(x);
  // side banks exist along Z −20 … 105, ending in a 10 m ramp at the back corners
  let side = sideProfile(ax);
  if (side > 0) side *= 1 - sstep(103, 118, z);
  // rear bank behind the stage (notch ~1 m lower at the backstage ramp, X ±6)
  let rear = 0;
  if (z < -4) {
    const up = 5.5 * softRamp(-z, 5, 60, 4);
    const down = 1 - 0.82 * softRamp(-z, 62, 92, 5);
    rear = up * down * (1 - 0.18 * (1 - sstep(4, 12, ax)));
  }
  let y = side > 0 || rear > 0 ? smax(side, rear, 1.5) : 0;
  // back plaza, road and decking fall gently towards the lake
  if (z > 113) y += -0.5 * Math.min(1, (z - 113) / 59);
  // lake bed: below the water line inside the lake polygon (cheap bounding test first)
  if (z > 168 && z < 260 && x > -125 && x < 232) {
    const d = lakeDistance(x, z);
    if (d < 6) y = Math.min(y, THREE.MathUtils.lerp(-0.5, -3.2, sstep(6, -8, d)));
  }
  return y;
}

/** signed distance to the lake shore (negative = inside the water) */
export function lakeDistance(x: number, z: number): number {
  return polygonSignedDistance(LAKE, x, z);
}

/** point in polygon (even-odd) */
export function inPolygon(poly: [number, number][], x: number, z: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

export function polygonSignedDistance(poly: [number, number][], x: number, z: number): number {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    d = Math.min(d, segDist(x, z, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
  }
  return inPolygon(poly, x, z) ? -d : d;
}

export function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax,
    dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function polylineDistance(line: [number, number][], x: number, z: number): number {
  let d = Infinity;
  for (let i = 1; i < line.length; i++) d = Math.min(d, segDist(x, z, line[i - 1][0], line[i - 1][1], line[i][0], line[i][1]));
  return d;
}

export function polygonArea(poly: [number, number][]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(a) / 2;
}

export function polygonBounds(poly: [number, number][]): { x0: number; x1: number; z0: number; z1: number } {
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  for (const [x, z] of poly) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    z0 = Math.min(z0, z);
    z1 = Math.max(z1, z);
  }
  return { x0, x1, z0, z1 };
}

/** show-time → 0..1 progress through the real Endshow run (for sky ephemeris) */
export function showProgress(t: number): number {
  return Math.min(1, Math.max(0, t / SHOW_LENGTH));
}
