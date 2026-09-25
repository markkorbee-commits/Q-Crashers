/**
 * Bar placement (data-driven — move bars here, nothing else changes).
 * Positions from research/terrain-layout.json (official 2026 floorplan, INFERENCE ±8 m):
 *  - BAR-L / BAR-R: 46 m crest bars on the grass side banks (ground +5.2 m), facing the field
 *  - BAR-BL / BAR-BR: back-corner bars near the road, facing the field
 *
 * `rotation` (radians, around +Y) turns the bar's local +Z (the customer side of the counter)
 * towards the world: 0 = counter faces +Z (away from the stage), +PI/2 = faces +X, -PI/2 = faces -X.
 */
export interface BarDef {
  id: string;
  name: string;
  x: number;
  z: number;
  rotation: number;
  /** counter length (m) */
  width: number;
  /** depth of the structure (m), default 6 */
  depth?: number;
  /** number of bartenders behind the counter */
  staff?: number;
  /** ground height (m); resolved from the terrain at init when omitted */
  y?: number;
}

export const BARS: BarDef[] = [
  { id: 'west', name: 'West Crest Bar', x: -100.5, z: 55, rotation: Math.PI / 2, width: 44, depth: 7, staff: 6 },
  { id: 'east', name: 'East Crest Bar', x: 100.5, z: 52, rotation: -Math.PI / 2, width: 44, depth: 7, staff: 6 },
  { id: 'backleft', name: 'Back-left Bar', x: -64, z: 126, rotation: (146.3 * Math.PI) / 180, width: 27, staff: 3 },
  { id: 'backright', name: 'Back-right Bar', x: 84.5, z: 124.5, rotation: Math.PI, width: 22, staff: 3 },
];

export function barById(id: string): BarDef | undefined {
  return BARS.find((b) => b.id === id);
}
