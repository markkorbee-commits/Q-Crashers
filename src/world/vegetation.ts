import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { hash32, Rng } from '../core/rng';
import { FORESTS, inPolygon, polygonArea, polygonBounds, terrainHeight, TREE_BELTS } from './site';
import { patchWorldMaterial } from './worldLights';

/**
 * Trees: the deciduous windbreak belts on the outer bank slopes and behind the stage (FACT OSM
 * 66342521 / 66340386, canopy 15–22 m = ASSUMPTION: poplar, willow, ash typical for Flevoland),
 * the other forest patches around the site, and far polder windbreaks as cheap silhouette ribbons.
 * Three instanced species meshes (3 draw calls) + one merged ribbon mesh.
 */

interface Species {
  name: string;
  geo: THREE.BufferGeometry;
  mesh?: THREE.InstancedMesh;
  share: number;
}

/** lumpy canopy: displaced icosphere with darker underside baked into vertex colours */
function canopy(seed: number, rx: number, ry: number, detail: number, lump: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    // cheap 3D hash noise from the (rounded) direction: shared vertices displace identically
    const h = hash32(Math.round(n.x * 40) * 73856093 + Math.round(n.y * 40) * 19349663 + Math.round(n.z * 40) * 83492791 + seed);
    const k = 1 + ((h & 1023) / 1023 - 0.5) * lump;
    v.set(n.x * rx * k, n.y * ry * k, n.z * rx * k);
    p.setXYZ(i, v.x, v.y, v.z);
    const shade = 0.55 + 0.45 * (n.y * 0.5 + 0.5);
    col[i * 3] = shade;
    col[i * 3 + 1] = shade;
    col[i * 3 + 2] = shade;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  return m;
}

function trunk(h: number, r: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r * 0.7, r, h, 5, 1, true);
  g.translate(0, h / 2, 0);
  g.deleteAttribute('uv');
  const n = g.getAttribute('position').count;
  const col = new Float32Array(n * 3).fill(0.35);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

function tree(kind: 'poplar' | 'round' | 'willow', detail: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const blob = (seed: number, rx: number, ry: number, x: number, y: number, z: number, lump: number) => {
    const c = canopy(seed, rx, ry, detail, lump);
    c.translate(x, y, z);
    parts.push(c);
  };
  if (kind === 'poplar') {
    // Lombardy-poplar windbreak: tall column of foliage, rounded top (unit height 1)
    parts.push(trunk(0.35, 0.02));
    blob(11, 0.15, 0.22, 0, 0.36, 0, 0.18);
    blob(12, 0.14, 0.24, 0.01, 0.58, 0.01, 0.18);
    blob(13, 0.11, 0.2, -0.01, 0.8, 0, 0.16);
  } else if (kind === 'round') {
    // ash / oak-like round crown made of overlapping masses
    parts.push(trunk(0.42, 0.03));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      blob(21 + i, 0.27, 0.22, Math.cos(a) * 0.17, 0.58 + (i % 2) * 0.08, Math.sin(a) * 0.17, 0.22);
    }
    blob(29, 0.26, 0.2, 0, 0.8, 0, 0.2);
  } else {
    // willow: broad, low, drooping masses
    parts.push(trunk(0.3, 0.04));
    blob(31, 0.4, 0.26, 0, 0.5, 0, 0.24);
    blob(33, 0.3, 0.2, 0.14, 0.7, -0.08, 0.22);
    blob(34, 0.28, 0.18, -0.16, 0.62, 0.1, 0.22);
  }
  const m = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  return m;
}

/**
 * Leafy silhouettes without extra geometry: near grazing view angles the canopy surface is
 * perforated with world-space noise, so crowns get ragged, see-through outlines against the sky.
 */
function leafyEdges(sh: THREE.WebGLProgramParametersWithUniforms): void {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vTW;')
    .replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n{ vec4 twp = vec4( transformed, 1.0 );\n#ifdef USE_INSTANCING\ntwp = instanceMatrix * twp;\n#endif\nvTW = ( modelMatrix * twp ).xyz; }',
    );
  sh.fragmentShader = sh.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
varying vec3 vTW;
float tHash( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float tNoise( vec3 x ) {
  vec3 i = floor( x ); vec3 f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( tHash( i ), tHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( tHash( i + vec3( 0, 1, 0 ) ), tHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( tHash( i + vec3( 0, 0, 1 ) ), tHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( tHash( i + vec3( 0, 1, 1 ) ), tHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}`,
    )
    .replace(
      '#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>
{
  float facing = abs( dot( normalize( normal ), normalize( vViewPosition ) ) );
  float edge = 1.0 - facing;
  float n1 = tNoise( vTW * 0.9 ) * 0.6 + tNoise( vTW * 2.6 ) * 0.4;
  if ( n1 < ( edge - 0.28 ) * 2.3 ) discard;
  // leaf-mass shading: darker hollows
  diffuseColor.rgb *= 0.6 + 0.6 * n1;
}`,
    );
}

export class Vegetation {
  readonly group = new THREE.Group();
  private species: Species[] = [];
  private placements: { x: number; z: number; h: number; s: number; rot: number; tint: number; sp: number; near: boolean }[] = [];
  private material: THREE.MeshStandardMaterial;
  private ribbon?: THREE.Mesh;
  count = 0;
  triangles = 0;

  constructor(private maxTrees: number, lowDetail: boolean) {
    this.group.name = 'vegetation';
    const detail = lowDetail ? 0 : 1;
    this.species = [
      { name: 'poplar', geo: tree('poplar', detail), share: 0.45 },
      { name: 'round', geo: tree('round', detail), share: 0.35 },
      { name: 'willow', geo: tree('willow', detail), share: 0.2 },
    ];
    this.material = patchWorldMaterial(
      new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.95, metalness: 0 }),
      { lamps: false, key: 'tree', edit: leafyEdges },
    );
    this.place();
    this.build();
    this.buildRibbons();
  }

  /** deterministic placement: dense in the site belts, sparser in the forest patches */
  private place(): void {
    const rng = new Rng(777);
    const polys: { poly: [number, number][]; spacing: number; near: boolean }[] = [
      ...TREE_BELTS.map((poly) => ({ poly, spacing: 4.4, near: true })),
      ...FORESTS.map((poly) => ({ poly, spacing: 7.5, near: false })),
    ];
    for (const { poly, spacing, near } of polys) {
      const b = polygonBounds(poly);
      const area = polygonArea(poly);
      const n = Math.floor(area / (spacing * spacing));
      let placed = 0,
        tries = 0;
      while (placed < n && tries < n * 6) {
        tries++;
        const x = rng.range(b.x0, b.x1);
        const z = rng.range(b.z0, b.z1);
        if (!inPolygon(poly, x, z)) continue;
        const r = rng.next();
        const sp = r < 0.45 ? 0 : r < 0.8 ? 1 : 2;
        const h = sp === 0 ? rng.range(17, 24) : sp === 1 ? rng.range(13, 19) : rng.range(10, 14);
        this.placements.push({ x, z, h, s: rng.range(0.85, 1.2), rot: rng.range(0, Math.PI * 2), tint: rng.next(), sp, near });
        placed++;
      }
    }
    // nearest first so the quality budget keeps the trees that frame the field
    this.placements.sort((a, b) => Number(b.near) - Number(a.near) || Math.hypot(a.x, a.z - 60) - Math.hypot(b.x, b.z - 60));
  }

  private build(): void {
    const n = Math.min(this.placements.length, this.maxTrees);
    const per = [0, 0, 0];
    for (let i = 0; i < n; i++) per[this.placements[i].sp]++;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const c = new THREE.Color();
    const idx = [0, 0, 0];
    this.species.forEach((sp, si) => {
      const mesh = new THREE.InstancedMesh(sp.geo, this.material, Math.max(1, per[si]));
      mesh.name = `trees-${sp.name}`;
      mesh.count = per[si];
      sp.mesh = mesh;
      this.group.add(mesh);
    });
    for (let i = 0; i < n; i++) {
      const t = this.placements[i];
      const sp = this.species[t.sp];
      const y = terrainHeight(t.x, t.z) - 0.3;
      p.set(t.x, y, t.z);
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, t.rot);
      const w = t.h * (t.sp === 0 ? 0.85 : 0.95) * t.s;
      s.set(w, t.h, w);
      m.compose(p, q, s);
      sp.mesh!.setMatrixAt(idx[t.sp], m);
      // late-June foliage after the heatwave: dark green, some yellowing; night makes them near-black
      const g0 = t.sp === 0 ? '#3a4a2a' : t.sp === 1 ? '#34462c' : '#4a5634';
      c.set(g0).offsetHSL((t.tint - 0.5) * 0.03, (t.tint - 0.5) * 0.1, (t.tint - 0.5) * 0.06);
      sp.mesh!.setColorAt(idx[t.sp], c);
      idx[t.sp]++;
    }
    let tris = 0;
    for (const sp of this.species) {
      sp.mesh!.instanceMatrix.needsUpdate = true;
      if (sp.mesh!.instanceColor) sp.mesh!.instanceColor.needsUpdate = true;
      sp.mesh!.computeBoundingSphere();
      tris += (sp.geo.getAttribute('position').count / 3) * sp.mesh!.count;
    }
    this.count = n;
    this.triangles = tris;
  }

  /**
   * Far polder windbreaks: long silhouette ribbons (rows of crowns) along the polder grid, which is
   * aligned with the local axes (FACT: site grid 55°/145°/235°/325°).
   */
  private buildRibbons(): void {
    const rng = new Rng(31337);
    const lines: [number, number, number, number][] = [];
    // rows parallel to X (across the view) and to Z, 480–900 m out (compressed distance of the real
    // 0.5–3 km polder belts so they stay inside every quality's far plane)
    for (const z of [-520, -700, -880, 560, 720, 900]) lines.push([-950, z, 950, z]);
    for (const x of [-480, -660, -860, 500, 680, 880]) lines.push([x, -950, x, 950]);
    const pos: number[] = [];
    const col: number[] = [];
    const step = 2.5;
    for (const [x0, z0, x1, z1] of lines) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const dx = (x1 - x0) / len,
        dz = (z1 - z0) / len;
      let s = rng.range(0, 120);
      while (s < len) {
        // a windbreak segment between farmsteads / roads; crowns as circle caps
        const segLen = rng.range(90, 360);
        const e = Math.min(len, s + segLen);
        const poplar = rng.chance(0.55);
        const crowns: [number, number, number][] = [];
        for (let u = s; u < e; u += poplar ? rng.range(4, 6) : rng.range(6, 11)) {
          crowns.push([u, poplar ? rng.range(2.5, 3.6) : rng.range(4, 7), poplar ? rng.range(18, 25) : rng.range(12, 19)]);
        }
        const top = (u: number) => {
          let t = 0;
          for (const [cu, r, h] of crowns) {
            const d = Math.abs(u - cu);
            if (d < r) t = Math.max(t, h - r * (poplar ? 1.6 : 1) + Math.sqrt(r * r - d * d) * (poplar ? 1.6 : 1));
            else if (d < r * 1.6) t = Math.max(t, (h - r) * (1 - (d - r) / (r * 0.6)) * 0.9);
          }
          return t;
        };
        for (let u = s; u < e; u += step) {
          const u1 = Math.min(e, u + step);
          const ax = x0 + dx * u,
            az = z0 + dz * u;
          const bx = x0 + dx * u1,
            bz = z0 + dz * u1;
          const ta = top(u),
            tb = top(u1);
          if (ta < 0.5 && tb < 0.5) continue;
          const ya = -0.8,
            yb = -0.8;
          // two triangles (double sided via material)
          pos.push(ax, ya, az, bx, yb, bz, bx, tb, bz, ax, ya, az, bx, tb, bz, ax, ta, az);
          for (let k = 0; k < 6; k++) {
            const tp = k === 2 || k === 4 || k === 5;
            const v = tp ? 0.9 : 0.3;
            col.push(v, v, v);
          }
        }
        s = e + rng.range(25, 160);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const mat = patchWorldMaterial(
      new THREE.MeshStandardMaterial({ color: '#27321f', vertexColors: true, roughness: 1, side: THREE.DoubleSide }),
      { lamps: false, key: 'ribbon' },
    );
    this.ribbon = new THREE.Mesh(g, mat);
    this.ribbon.name = 'far-windbreaks';
    this.group.add(this.ribbon);
    this.triangles += pos.length / 9;
  }

  setBudget(maxTrees: number): void {
    const n = Math.min(this.placements.length, maxTrees);
    const per = [0, 0, 0];
    for (let i = 0; i < n; i++) per[this.placements[i].sp]++;
    // instances were written in placement order per species, so shrinking count keeps the nearest
    this.species.forEach((sp, si) => {
      if (sp.mesh) sp.mesh.count = Math.min(per[si], sp.mesh.instanceMatrix.count);
    });
    this.count = n;
  }
}
