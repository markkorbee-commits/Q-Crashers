/**
 * Bar placement (data-driven — move bars here, nothing else changes).
 *
 * PROVISIONAL placement until the grounds research is final:
 *  - two large bars flanking the audience field at x = ±78, z = 90, counters facing the field
 *  - a bar near the FOH at x = -40, z = 150
 *  - a bar near the field entrance at x = 35, z = 260
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
}

export const BARS: BarDef[] = [
  { id: 'west', name: 'West Field Bar', x: -78, z: 90, rotation: Math.PI / 2, width: 26, staff: 4 },
  { id: 'east', name: 'East Field Bar', x: 78, z: 90, rotation: -Math.PI / 2, width: 26, staff: 4 },
  { id: 'foh', name: 'FOH Bar', x: -40, z: 150, rotation: Math.PI / 2, width: 14, staff: 2 },
  { id: 'entrance', name: 'Entrance Bar', x: 35, z: 260, rotation: -Math.PI / 2, width: 16, staff: 2 },
];

export function barById(id: string): BarDef | undefined {
  return BARS.find((b) => b.id === id);
}
