import * as THREE from 'three';

/**
 * 2D outlines of gothic openings (in a local XY plane, y up). All outlines start at the bottom-left,
 * run up the left jamb, over the arch and down the right jamb (open polyline, bottom edge implied).
 */
export type ArchKind = 'pointed' | 'round' | 'lancet';

/** arch outline points from the left springing to the right springing (inclusive) */
export function archCurve(cx: number, springY: number, w: number, kind: ArchKind, seg = 8): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const half = w / 2;
  if (kind === 'round') {
    for (let i = 0; i <= seg * 2; i++) {
      const a = Math.PI - (Math.PI * i) / (seg * 2);
      pts.push(new THREE.Vector2(cx + Math.cos(a) * half, springY + Math.sin(a) * half));
    }
    return pts;
  }
  // two arcs, radius r (equilateral: r = w, lancet: r = 1.5w), centred on the opposite springing line
  const r = kind === 'lancet' ? w * 1.45 : w;
  const cL = cx - half + r; // centre of the arc forming the LEFT half
  const aStart = Math.PI;
  const aApex = Math.acos(-(r - half) / r);
  for (let i = 0; i <= seg; i++) {
    const a = aStart + ((aApex - aStart) * i) / seg;
    pts.push(new THREE.Vector2(cL + Math.cos(a) * r, springY + Math.sin(a) * r));
  }
  const cR = cx + half - r;
  for (let i = seg - 1; i >= 0; i--) {
    const a = aStart + ((aApex - aStart) * i) / seg;
    pts.push(new THREE.Vector2(cR - Math.cos(a) * r, springY + Math.sin(a) * r));
  }
  return pts;
}

/** height of the arch above the springing line */
export function archRise(w: number, kind: ArchKind): number {
  if (kind === 'round') return w / 2;
  const r = kind === 'lancet' ? w * 1.45 : w;
  const half = w / 2;
  return Math.sqrt(r * r - (r - half) * (r - half));
}

/** closed opening outline: sill at y0, total height h (arch included) */
export function openingOutline(cx: number, y0: number, w: number, h: number, kind: ArchKind, seg = 8): THREE.Vector2[] {
  const rise = archRise(w, kind);
  const springY = y0 + Math.max(0.05, h - rise);
  const pts = [new THREE.Vector2(cx - w / 2, y0), ...archCurve(cx, springY, w, kind, seg), new THREE.Vector2(cx + w / 2, y0)];
  return pts;
}

export interface Opening {
  cx: number;
  y0: number;
  w: number;
  h: number;
  kind: ArchKind;
}

/** wall slab outline (x0..x1, y0..y1) with arched holes -> THREE.Shape */
export function wallShape(x0: number, x1: number, y0: number, y1: number, holes: Opening[], seg = 8): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(x0, y0);
  s.lineTo(x1, y0);
  s.lineTo(x1, y1);
  s.lineTo(x0, y1);
  s.lineTo(x0, y0);
  for (const o of holes) {
    const pts = openingOutline(o.cx, o.y0, o.w, o.h, o.kind, seg);
    s.holes.push(new THREE.Path(pts));
  }
  return s;
}

/** frame ring around an opening: jambs + arch, `t` wide, sill excluded */
export function frameShape(o: Opening, t: number, seg = 8): THREE.Shape {
  // a single U-shaped polygon: outer outline up and over, then the inner outline back
  const outer = openingOutline(o.cx, o.y0, o.w + 2 * t, o.h + t, o.kind, seg);
  const inner = openingOutline(o.cx, o.y0, o.w, o.h, o.kind, seg).reverse();
  return new THREE.Shape([...outer, ...inner]);
}

/** pane shape (the opening itself) */
export function paneShape(o: Opening, seg = 8): THREE.Shape {
  return new THREE.Shape(openingOutline(o.cx, o.y0, o.w, o.h, o.kind, seg));
}

/** extrude a shape `depth` along +Z (from z=0 to z=depth), no bevel */
export function extrude(shape: THREE.Shape, depth: number, seg = 8): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg, steps: 1 });
}
