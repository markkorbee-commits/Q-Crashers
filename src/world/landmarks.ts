import * as THREE from 'three';
import { hash32, Rng } from '../core/rng';
import { GeoBuilder, lin } from './geom';
import { GONDOLA, GONDOLAS, gondolaPose, LEG_R, RIM_HALF, WHEEL_DECK, WHEEL_GATE, WHEEL_HUB_Y, WHEEL_LEGS, WHEEL_R, WHEEL_WALK, WHEEL_X, WHEEL_Z, wheelAngle } from './ferris';
import { dirFromAzAlt, GOLIATH, GOLIATH_H, OTHER_AREAS, terrainHeight } from './site';
import { patchWorldMaterial } from './worldLights';

/**
 * The skyline around the RED field:
 *  - Walibi Holland's Goliath coaster (46.9 m, FACT OSM track) behind stage-left, a dark silhouette
 *    over the tree belt with an obstruction light on the lift hill
 *  - the PURPLE-area Ferris wheel (floorplan deco, 2024 aerial Ø ≈ 32 m) behind the audience-right,
 *    turning from show time with 16 hanging gondolas — a ride (world/ferris.ts, player/FerrisRide.ts)
 *  - the other festival areas to the +X side (SW): work lights and dim stage glows (frames f004/f005/
 *    f014/f022: "clusters of orange/red, pink/purple and white lights right of and behind the stage")
 *  - Flevoland wind turbines on the N–E horizon with synchronised red obstruction lights
 *    (ASSUMPTION: Windplan Groen area; distances compressed to stay inside every quality's far plane)
 *  - distant village / farm lights and the Biddinghuizen glow (NE)
 */

export interface LightPoint {
  x: number;
  y: number;
  z: number;
  color: string;
  /** world size (m) of the glow sprite */
  size: number;
  /**
   * 0 steady, 1 obstruction blink (W-rot), 2 slow flicker, 3 steady red obstruction, 4 broad haze glow,
   * 5 steady bulb on the Ferris wheel rims (turns with the wheel), 6 gondola lamp (rim point turned with
   * the wheel, hanging below it), 7 steady bulb of the ride's gate, walkway and platform (static); kinds 5-7
   * are drawn as small bulbs up close
   */
  kind: number;
}

const xyz = (v: THREE.Vector3) => ({ x: v.x, y: v.y, z: v.z });

export class Landmarks {
  readonly group = new THREE.Group();
  private rotors!: THREE.InstancedMesh;
  private rotorBase: THREE.Matrix4[] = [];
  private wheel!: THREE.Group;
  private gondolas!: THREE.InstancedMesh;
  private lights!: THREE.Points;
  /** the sweeping sky beams over the other areas (only while those areas are in business, see setAreaBeams) */
  private areaBeams: THREE.Mesh | null = null;
  private readonly U = {
    uTime: { value: 0 },
    uPx: { value: 1 },
    uGain: { value: 1 },
    uViewH: { value: 720 },
    /** Ferris wheel: hub y, hub z, cos / sin of the wheel angle (bulbs kind 5/6 turn with the rims) */
    uWheel: { value: new THREE.Vector4(WHEEL_HUB_Y, WHEEL_Z, 1, 0) },
  };
  private readonly pv = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly one = new THREE.Vector3(1, 1, 1);
  private readonly xAxis = new THREE.Vector3(1, 0, 0);
  private readonly m = new THREE.Matrix4();
  private readonly r = new THREE.Matrix4();
  triangles = 0;
  lightCount = 0;

  constructor(extraLights: LightPoint[], lowDetail: boolean) {
    this.group.name = 'landmarks';
    const mat = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.4 }), { key: 'landmark', lamps: false });
    const lights: LightPoint[] = [...extraLights];
    this.buildGoliath(mat, lights);
    this.buildWheel(mat, lights, lowDetail);
    this.buildTurbines(mat, lights, lowDetail);
    this.buildAreas(mat, lights);
    this.buildLights(lights);
  }

  private add(geo: THREE.BufferGeometry, mat: THREE.Material, name: string): THREE.Mesh {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    this.group.add(m);
    this.triangles += geo.getAttribute('position').count / 3;
    return m;
  }

  private buildGoliath(mat: THREE.Material, lights: LightPoint[]): void {
    const b = new GeoBuilder();
    const track = lin('#5a1612');
    const steel = lin('#6d7176');
    const pts = GOLIATH.map(([x, z], i) => new THREE.Vector3(x, terrainHeight(x, z) + (GOLIATH_H[i] ?? 5), z));
    // resample to ~4 m for smooth curves (Catmull-Rom through the OSM points)
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const n = Math.floor(curve.getLength() / 4);
    const sp = curve.getSpacedPoints(n);
    for (let i = 1; i < sp.length; i++) {
      b.beam(sp[i - 1], sp[i], 0.9, track);
      if (i % 3 === 0) {
        const p = sp[i];
        const g = terrainHeight(p.x, p.z);
        if (p.y - g > 3) {
          b.beam(new THREE.Vector3(p.x, g, p.z), new THREE.Vector3(p.x, p.y - 0.4, p.z), p.y - g > 25 ? 1.1 : 0.6, steel, true);
        }
      }
    }
    // lift-hill lattice (the steep straight to the 46.9 m crest)
    const liftA = pts[6],
      liftB = pts[7];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      const p = new THREE.Vector3().lerpVectors(liftA, liftB, t);
      b.beam(new THREE.Vector3(p.x - 1.5, terrainHeight(p.x, p.z), p.z), new THREE.Vector3(p.x - 0.4, p.y, p.z), 0.35, steel, true);
      b.beam(new THREE.Vector3(p.x + 1.5, terrainHeight(p.x, p.z), p.z), new THREE.Vector3(p.x + 0.4, p.y, p.z), 0.35, steel, true);
    }
    this.add(b.build(), mat, 'goliath');
    lights.push({ x: liftB.x, y: liftB.y + 1.5, z: liftB.z, color: '#ff1a0a', size: 3.5, kind: 3 });
  }

  /**
   * The Ferris wheel (world/ferris.ts): static A-frame + the ride's gate arch, ramp walkway and
   * boarding platform (one merged mesh); the rims, spokes and gondola axles as one mesh in a group
   * at the hub turned about X from show time; the 16 open gondolas as one instanced mesh that
   * hangs (and gently swings) under the axles. Rim bulbs and gondola lamps live in the shared
   * distant-lights buffer and turn in its vertex shader (no extra draw call).
   */
  private buildWheel(mat: THREE.Material, lights: LightPoint[], low: boolean): void {
    const x = WHEEL_X,
      z = WHEEL_Z,
      r = WHEEL_R;
    const hub = new THREE.Vector3(x, WHEEL_HUB_Y, z);
    const b = new GeoBuilder();
    const white = lin('#c8ccd2');
    // A-frame legs (wheel plane parallel to Z => axle along X), shared with the ride camera's keep-out
    for (const L of WHEEL_LEGS) b.beam(new THREE.Vector3(L[0], L[1], L[2]), new THREE.Vector3(L[3], L[4], L[5]), LEG_R * 2, white, true);
    // axle through the hub, bearing housings
    b.beam(new THREE.Vector3(x - 1.75, hub.y, z), new THREE.Vector3(x + 1.75, hub.y, z), 0.5, white, true);
    this.add(b.build(), mat, 'ferris-frame');
    // the ride's cars and its platform glow softly in their own string lights / canopy lamps at night:
    // an emissive term tinted by the vertex (and per-car instance) colour
    const rideMat = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.2, emissive: new THREE.Color(0.055, 0.04, 0.026) }), {
      key: 'ferris-ride',
      lamps: false,
      edit: (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= vColor.rgb;');
      },
    });
    const acc = new GeoBuilder();
    this.buildAccess(acc, lights, low);
    this.add(acc.build(), rideMat, 'ferris-access');

    // rims, spokes and the gondola axles between the rims: turn with the wheel
    const w = new GeoBuilder();
    const N = 32;
    for (const sx of [-RIM_HALF, RIM_HALF]) {
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * Math.PI * 2,
          a1 = ((k + 1) / N) * Math.PI * 2;
        w.beam(new THREE.Vector3(sx, Math.sin(a0) * r, Math.cos(a0) * r), new THREE.Vector3(sx, Math.sin(a1) * r, Math.cos(a1) * r), 0.35, white);
        if (k % 2 === 0) w.beam(new THREE.Vector3(sx, 0, 0), new THREE.Vector3(sx, Math.sin(a0) * r, Math.cos(a0) * r), 0.14, white);
      }
    }
    for (let k = 0; k < GONDOLAS; k++) {
      const a = (k / GONDOLAS) * Math.PI * 2;
      w.beam(new THREE.Vector3(-RIM_HALF, Math.sin(a) * r, Math.cos(a) * r), new THREE.Vector3(RIM_HALF, Math.sin(a) * r, Math.cos(a) * r), 0.12, white, true);
    }
    const wm = new THREE.Mesh(w.build(), mat);
    wm.name = 'ferris-wheel';
    this.wheel = new THREE.Group();
    this.wheel.position.copy(hub);
    this.wheel.add(wm);
    this.group.add(this.wheel);
    this.triangles += wm.geometry.getAttribute('position').count / 3;

    // the gondolas: one instanced open car (tinted per instance: purple / cream as before)
    const gg = gondolaGeometry(low);
    this.gondolas = new THREE.InstancedMesh(gg, rideMat, GONDOLAS);
    this.gondolas.name = 'ferris-gondolas';
    this.gondolas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const tint = new THREE.Color();
    for (let k = 0; k < GONDOLAS; k++) this.gondolas.setColorAt(k, tint.setRGB(...lin(k % 2 ? '#7a2a8a' : '#d8d2c0')));
    // the cars never leave the wheel's circle (+ their hang): a fixed bound keeps frustum culling on
    gg.boundingSphere = new THREE.Sphere(hub.clone(), r + 4);
    this.gondolas.boundingSphere = new THREE.Sphere(hub.clone(), r + 4);
    this.group.add(this.gondolas);
    this.triangles += (gg.getAttribute('position').count / 3) * GONDOLAS;
    this.poseWheel(0);

    // rim bulbs on both rims (turn with the wheel in the vertex shader: kind 5), a warm lamp under
    // every canopy (kind 6)
    for (const side of [-1, 1]) {
      for (let k = 0; k < 48; k++) {
        const a = (k / 48) * Math.PI * 2;
        lights.push({ x: hub.x + side, y: hub.y + Math.sin(a) * r, z: hub.z + Math.cos(a) * r, color: k % 2 ? '#ffd9a0' : '#c77dff', size: 0.9, kind: 5 });
      }
    }
    for (let k = 0; k < GONDOLAS; k++) {
      const a = (k / GONDOLAS) * Math.PI * 2;
      lights.push({ x: hub.x, y: hub.y + Math.sin(a) * r, z: hub.z + Math.cos(a) * r, color: '#ffc88a', size: 0.55, kind: 6 });
    }
  }

  /**
   * The ride's access (world/ferris.ts): a bulb-lit arch over the gate in the lake-front fence, the
   * timber ramp walkway with railings, the boarding platform on steel legs (railings on three sides,
   * the east edge open with a yellow safety line where the gondolas pass), a small operator cabin.
   */
  private buildAccess(b: GeoBuilder, lights: LightPoint[], low: boolean): void {
    const D = WHEEL_DECK,
      W = WHEEL_WALK,
      G = WHEEL_GATE;
    const timber = lin('#8a7458');
    const skirt = lin('#2a2530');
    const steel = lin('#9aa0a6');
    const purple = lin('#5c2470');
    const yellow = lin('#e0b422');
    const g0 = terrainHeight(W.x0, W.z0);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    // ramp: a sloped timber slab from the field level up to the deck
    {
      const len = Math.hypot(W.z1 - W.z0, D.y - g0);
      // rises towards +Z (the deck): a rotation about +X by -pitch lifts the +Z end
      const pitch = Math.atan2(D.y - g0, W.z1 - W.z0);
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pitch);
      v.set((W.x0 + W.x1) / 2, (g0 + D.y) / 2 - 0.06, (W.z0 + W.z1) / 2);
      m.compose(v, q, sc.set(W.x1 - W.x0, 0.12, len + 0.02));
      b.add(GeoBuilder.unit('box'), m, timber);
    }
    // platform deck + skirt + legs, safety line along the open edge
    const cx = (D.x0 + D.x1) / 2,
      cz = (D.z0 + D.z1) / 2;
    b.box(D.x1 - D.x0, 0.14, D.z1 - D.z0, cx, D.y - 0.07, cz, timber);
    b.box(D.x1 - D.x0, D.y - g0, D.z1 - D.z0 - 0.3, cx, (D.y + g0) / 2 - 0.07, cz, skirt);
    b.box(0.14, 0.012, D.z1 - D.z0 - 0.2, D.x1 - 0.12, D.y + 0.006, cz, yellow);
    // railings: posts every ~1.4 m, top + mid rail
    const rail = (ax: number, az: number, bx: number, bz: number, ya: number, yb: number) => {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 1.4));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const px = ax + (bx - ax) * t,
          pz = az + (bz - az) * t,
          py = ya + (yb - ya) * t;
        b.box(0.06, 1.05, 0.06, px, py + 0.525, pz, steel);
      }
      for (const h of [1.05, 0.55]) b.beam(new THREE.Vector3(ax, ya + h, az), new THREE.Vector3(bx, yb + h, bz), 0.05, h > 1 ? purple : steel);
      // string lights on the top rail
      if (!low || n > 3) {
        const nb = Math.max(2, Math.round(len / 1.1));
        for (let i = 0; i <= nb; i++) {
          const t = (i + 0.5) / (nb + 1);
          lights.push({ x: ax + (bx - ax) * t, y: ya + (yb - ya) * t + 1.12, z: az + (bz - az) * t, color: i % 3 === 1 ? '#c77dff' : '#ffd9a0', size: 0.28, kind: 7 });
        }
      }
    };
    const zg = G.z + 0.3;
    rail(W.x0, zg, W.x0, D.z0, g0 + (D.y - g0) * ((zg - W.z0) / (W.z1 - W.z0)), D.y);
    rail(W.x1, zg, W.x1, D.z0, g0 + (D.y - g0) * ((zg - W.z0) / (W.z1 - W.z0)), D.y);
    rail(D.x0, D.z0, D.x0, D.z1, D.y, D.y);
    rail(D.x0, D.z1, D.x1, D.z1, D.y, D.y);
    rail(W.x1, D.z0, D.x1, D.z0, D.y, D.y);
    // short rail stubs at both ends of the open boarding edge
    rail(D.x1, D.z0, D.x1, D.z0 + 1.0, D.y, D.y);
    rail(D.x1, D.z1 - 1.0, D.x1, D.z1, D.y, D.y);
    // gate arch over the fence gap, bulbs along it
    const gy = terrainHeight((G.x0 + G.x1) / 2, G.z);
    for (const gx of [G.x0 - 0.12, G.x1 + 0.12]) b.box(0.18, 3.6, 0.18, gx, gy + 1.8, G.z, purple);
    b.box(G.x1 - G.x0 + 0.6, 0.55, 0.14, (G.x0 + G.x1) / 2, gy + 3.35, G.z, purple);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      lights.push({ x: G.x0 - 0.2 + (G.x1 - G.x0 + 0.4) * t, y: gy + 3.68, z: G.z - 0.1, color: i % 2 ? '#c77dff' : '#ffd9a0', size: 0.35, kind: 7 });
    }
    for (const gx of [G.x0 - 0.12, G.x1 + 0.12]) for (let i = 0; i < 4; i++) lights.push({ x: gx, y: gy + 0.6 + i * 0.8, z: G.z - 0.12, color: '#ffd9a0', size: 0.3, kind: 7 });
    // operator cabin at the platform's south-west corner (outside the rail), lit window
    const ox = D.x0 - 1.1,
      oz = D.z0 + 0.9;
    const og = terrainHeight(ox, oz);
    b.box(1.5, 2.3, 1.5, ox, og + 1.15, oz, lin('#3a2d44'));
    b.box(1.8, 0.12, 1.8, ox, og + 2.36, oz, purple);
    lights.push({ x: ox + 0.78, y: og + 1.5, z: oz, color: '#ffe2b0', size: 0.9, kind: 7 });
  }

  /** wheel angle + gondola matrices at show time t (no allocations) */
  private poseWheel(t: number): void {
    const th = wheelAngle(t);
    this.wheel.rotation.x = th;
    this.U.uWheel.value.z = Math.cos(th);
    this.U.uWheel.value.w = Math.sin(th);
    for (let k = 0; k < GONDOLAS; k++) {
      const sway = gondolaPose(k, t, this.pv);
      this.q.setFromAxisAngle(this.xAxis, sway);
      this.m.compose(this.pv, this.q, this.one);
      this.gondolas.setMatrixAt(k, this.m);
    }
    this.gondolas.instanceMatrix.needsUpdate = true;
  }

  private buildTurbines(mat: THREE.Material, lights: LightPoint[], low: boolean): void {
    const rng = new Rng(1234);
    const b = new GeoBuilder();
    const white = lin('#aeb4ba');
    const towers: { p: THREE.Vector3; h: number; s: number }[] = [];
    // three lines of turbines between bearing 350° (N) and 100° (E), real 3–7 km, placed at 760–1000 m
    const rows: [number, number, number, number][] = [
      [352, 30, 5.0, 7],
      [20, 70, 3.2, 7],
      [70, 104, 4.5, 6],
    ];
    for (const [a0, a1, km, count] of rows) {
      for (let i = 0; i < (low ? Math.ceil(count / 2) : count); i++) {
        const az = a0 + ((a1 - a0 + 360) % 360) * ((i + 0.5 + rng.range(-0.2, 0.2)) / count);
        const dReal = km * 1000 * rng.range(0.9, 1.1);
        const dPlaced = THREE.MathUtils.clamp(760 + (dReal - 3000) * 0.06, 760, 1000);
        const s = dPlaced / dReal; // angular size preserved
        const dir = dirFromAzAlt(az, 0);
        const p = new THREE.Vector3(dir.x * dPlaced, -0.8, dir.z * dPlaced);
        towers.push({ p, h: 135 * s, s });
      }
    }
    const rotorGeo = new GeoBuilder();
    // unit rotor (radius 1): 3 blades in the local XY plane, hub at origin
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const tip = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      rotorGeo.beam(new THREE.Vector3(0, 0, 0), tip, 0.045, white);
    }
    rotorGeo.cylinder(0.06, 0.12, 0, 0, 0, white, 8);
    for (const t of towers) {
      b.cylinder(3.5 * t.s, t.h, t.p.x, t.p.y + t.h / 2, t.p.z, white, 8, 2.0 * t.s);
      b.box(4 * t.s, 4 * t.s, 12 * t.s, t.p.x, t.p.y + t.h + 2 * t.s, t.p.z, white);
      lights.push({ x: t.p.x, y: t.p.y + t.h + 4.5 * t.s, z: t.p.z, color: '#ff1206', size: 18 * t.s + 1.5, kind: 1 });
    }
    this.add(b.build(), mat, 'turbine-towers');
    const rg = rotorGeo.build();
    this.rotors = new THREE.InstancedMesh(rg, mat, towers.length);
    this.rotors.name = 'turbine-rotors';
    towers.forEach((t) => {
      // rotor faces the wind (NNW): normal along the wind direction
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirFromAzAlt(340, 0));
      const m = new THREE.Matrix4().compose(new THREE.Vector3(t.p.x, t.p.y + t.h + 2 * t.s, t.p.z), q, new THREE.Vector3(60 * t.s, 60 * t.s, 60 * t.s));
      this.rotorBase.push(m);
    });
    this.rotorBase.forEach((m, i) => this.rotors.setMatrixAt(i, m));
    this.rotors.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rotors.frustumCulled = false;
    this.group.add(this.rotors);
    this.triangles += (rg.getAttribute('position').count / 3) * towers.length;
  }

  /**
   * The other festival areas (bible §6.1: "their lights are the coloured clusters on the right
   * horizon"): low open silhouettes — a truss roof on four towers over a dark deck, peaked tents,
   * PURPLE as white tensile sails by the lake — kept at 8–14 m so the tree belts hide most of them
   * from the field, with clustered glows in the area hue and a few slow upward beams (Tribe mode only, see
   * setAreaBeams: the areas were dark on the night of the Endshow).
   */
  private buildAreas(mat: THREE.Material, lights: LightPoint[]): void {
    const b = new GeoBuilder();
    const fabric = new GeoBuilder();
    const rng = new Rng(4040);
    const beams: { p: THREE.Vector3; dir: THREE.Vector3; col: THREE.Color; len: number; w: number; seed: number }[] = [];
    const truss = lin('#141416');
    for (const a of OTHER_AREAS) {
      const d = Math.hypot(a.x, a.z);
      const s = d > 330 ? 330 / d : 1; // compress the farthest areas (angular size preserved)
      const cx = a.x * s,
        cz = a.z * s;
      const y = terrainHeight(cx, cz) - 0.3;
      const face = Math.atan2(-cx, -cz);
      const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, face + rng.range(-0.5, 0.5));
      const base = new THREE.Matrix4().compose(new THREE.Vector3(cx, y, cz), q, new THREE.Vector3(s, s, s));
      const at = (px: number, py: number, pz: number) => new THREE.Vector3(px, py, pz).applyMatrix4(base);
      const put = (w: number, h: number, dd: number, px: number, py: number, pz: number, c: [number, number, number]) =>
        b.add(GeoBuilder.unit('box'), base.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion(), new THREE.Vector3(w, h, dd))), c);
      const hue = new THREE.Color(a.hue);
      const sw = a.r * 1.1;
      if (a.name === 'PURPLE') {
        // open tensile roofs (three white sails on masts) over the lakeside dance floor
        for (let k = 0; k < 3; k++) {
          // the west sail (k 2, ox +12) stood in the Ferris wheel's plane (gondolas would sweep through
          // it): it goes to the east end of the row instead (same random stream)
          const ox = (k === 2 ? -3 : k - 1) * 12,
            oz = rng.range(-3, 3);
          const g = new THREE.PlaneGeometry(11, 9, 6, 4);
          const pa = g.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < pa.count; i++) {
            const u = pa.getX(i) / 11,
              v = pa.getY(i) / 9;
            pa.setZ(i, (u * u - v * v) * 6 + 7.5);
          }
          g.rotateX(-Math.PI / 2);
          g.computeVertexNormals();
          fabric.add(g, base.clone().multiply(new THREE.Matrix4().makeTranslation(ox, 0, oz)), lin('#b8b2c8'));
          for (const [mx, mz] of [[-5.5, -4.5], [5.5, -4.5], [-5.5, 4.5], [5.5, 4.5]]) b.beam(at(ox + mx, 0, oz + mz), at(ox + mx, 9.5, oz + mz), 0.18, truss);
        }
      } else {
        // stage: truss roof grid on four towers (open — light shows through), dark deck + backdrop
        const W = sw,
          H = 9 + rng.range(0, 4),
          D = 10;
        for (const tx of [-W / 2, W / 2]) for (const tz of [-D / 2, D / 2]) b.beam(at(tx, 0, tz), at(tx, H, tz), 0.6, truss);
        for (const tz of [-D / 2, D / 2]) b.beam(at(-W / 2, H, tz), at(W / 2, H, tz), 0.5, truss);
        for (let k = 0; k <= 4; k++) b.beam(at(-W / 2 + (W * k) / 4, H, -D / 2), at(-W / 2 + (W * k) / 4, H, D / 2), 0.35, truss);
        put(W * 0.9, 1.4, D * 0.8, 0, 0.7, 0, lin('#0c0c0d'));
        put(W * 0.8, H * 0.6, 0.3, 0, H * 0.3 + 1.4, -D / 2 + 0.3, lin('#0e0e10'));
        // two to three peaked tents beside it (bars, merch), pale canvas
        const nt = 2 + rng.int(0, 1);
        for (let k = 0; k < nt; k++) {
          const side = k % 2 ? 1 : -1;
          const tx = side * (W / 2 + 7 + rng.range(0, 6)),
            tz = rng.range(-4, 8);
          const tw = rng.range(6, 9);
          fabric.add(GeoBuilder.unit('box'), base.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(tx, 1.3, tz), new THREE.Quaternion(), new THREE.Vector3(tw, 2.6, tw))), lin('#8f8a80'));
          const cone = new THREE.ConeGeometry(tw * 0.72, 3.2, 4);
          cone.rotateY(Math.PI / 4);
          fabric.add(cone, base.clone().multiply(new THREE.Matrix4().makeTranslation(tx, 4.2, tz)), lin('#a39e92'));
          lights.push({ ...xyz(at(tx, 2.2, tz + tw / 2 + 0.2)), color: '#ffcf8a', size: 2.2 * s + 0.6, kind: 0 });
        }
        // upward beams from the roof (slowly sweeping, area hue)
        const nb = 3 + rng.int(0, 2);
        for (let k = 0; k < nb; k++) {
          const px = -W / 2 + (W * (k + 0.5)) / nb;
          const dir = new THREE.Vector3(rng.range(-0.35, 0.35), 1, rng.range(-0.25, 0.25)).normalize().applyQuaternion(q);
          beams.push({ p: at(px, H - 0.4, 0), dir, col: hue.clone().lerp(new THREE.Color('#ffffff'), rng.range(0, 0.2)), len: 70 * s + 25, w: 0.6 * s + 0.2, seed: rng.next() });
        }
      }
      // clustered glows: the coloured wash under the roof, work lights, a few flickering fixtures
      const n = 12 + rng.int(0, 8);
      for (let k = 0; k < n; k++) {
        const coloured = rng.chance(0.6);
        const p = at(rng.range(-sw / 2, sw / 2), coloured ? rng.range(1.5, 9) : rng.range(3, 10), rng.range(-5, 6));
        lights.push({ ...xyz(p), color: coloured ? a.hue : rng.pick(['#fff1d6', '#ffd49a', '#e8f0ff']), size: (coloured ? 4.5 : 2.2) * s + 0.8, kind: coloured ? 2 : 0 });
      }
      // a broad dim glow of the area hue over the whole cluster (haze lit from below)
      lights.push({ ...xyz(at(0, 7, 0)), color: a.hue, size: sw * 1.2 * s + 8, kind: 4 });
    }
    this.add(b.build(), mat, 'other-areas');
    // canvas / sails: faintly lit from inside by the area lights (emissive tint)
    const fm = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide, emissive: new THREE.Color(0.03, 0.022, 0.04) }), { key: 'area-fabric', lamps: false });
    this.add(fabric.build(), fm, 'other-areas-fabric');
    this.buildAreaBeams(beams);
    // Biddinghuizen village glow (NE, ~3 km), farms and street lights on the polder roads
    for (let k = 0; k < 70; k++) {
      const az = rng.range(30, 62);
      const dir = dirFromAzAlt(az, 0);
      const dist = rng.range(900, 1000);
      lights.push({ x: dir.x * dist, y: rng.range(1, 9), z: dir.z * dist, color: rng.pick(['#ffb45a', '#ffcf8a', '#fff0d0']), size: rng.range(2, 4), kind: 0 });
    }
    for (let k = 0; k < 60; k++) {
      const az = rng.range(0, 360);
      const dir = dirFromAzAlt(az, 0);
      const dist = rng.range(520, 1000);
      if (Math.abs(dir.x * dist) < 300 && dir.z * dist > -300 && dir.z * dist < 350) continue;
      lights.push({ x: dir.x * dist, y: rng.range(2, 7), z: dir.z * dist, color: rng.pick(['#ffb45a', '#ffe0b0', '#ffffff']), size: rng.range(1.5, 3), kind: rng.chance(0.1) ? 2 : 0 });
    }
  }

  /** thin additive light shafts over the other areas (one draw call, swaying from show time) */
  private buildAreaBeams(beams: { p: THREE.Vector3; dir: THREE.Vector3; col: THREE.Color; len: number; w: number; seed: number }[]): void {
    if (!beams.length) return;
    const SEG = 6;
    const pos: number[] = [];
    const col: number[] = [];
    const sway: number[] = [];
    const idx: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const t1 = new THREE.Vector3();
    const t2 = new THREE.Vector3();
    for (const bm of beams) {
      t1.crossVectors(bm.dir, up);
      if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0);
      t1.normalize();
      t2.crossVectors(bm.dir, t1).normalize();
      const v0 = pos.length / 3;
      for (const t of [0, 1]) {
        const r = bm.w * (1 + t * 5);
        for (let k = 0; k < SEG; k++) {
          const a = (k / SEG) * Math.PI * 2;
          const p = bm.p.clone().addScaledVector(bm.dir, bm.len * t).addScaledVector(t1, Math.cos(a) * r).addScaledVector(t2, Math.sin(a) * r);
          pos.push(p.x, p.y, p.z);
          col.push(bm.col.r, bm.col.g, bm.col.b);
          sway.push(bm.seed, bm.len, t);
        }
      }
      for (let k = 0; k < SEG; k++) {
        const a = v0 + k,
          b2 = v0 + ((k + 1) % SEG),
          c = v0 + SEG + k,
          d = v0 + SEG + ((k + 1) % SEG);
        idx.push(a, b2, c, b2, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(sway, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: this.U.uTime },
      vertexShader: /* glsl */ `
        attribute vec3 color;
        attribute vec3 aSway;
        uniform float uTime;
        varying vec3 vCol;
        varying float vT;
        void main() {
          vec3 p = position;
          float s = aSway.x * 6.283;
          p.xz += vec2( sin( uTime * 0.31 + s ), cos( uTime * 0.23 + s * 1.7 ) ) * aSway.z * aSway.y * 0.2;
          vec4 mv = modelViewMatrix * vec4( p, 1.0 );
          gl_Position = projectionMatrix * mv;
          vCol = color;
          vT = aSway.z;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol;
        varying float vT;
        void main() {
          float a = pow( 1.0 - vT, 2.0 ) * 0.014;
          gl_FragColor = vec4( vCol * a, 1.0 );
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    const m = new THREE.Mesh(g, mat);
    m.name = 'area-beams';
    m.renderOrder = 4;
    m.visible = false;
    this.areaBeams = m;
    this.group.add(m);
    this.triangles += idx.length / 3;
  }

  private buildLights(pts: LightPoint[]): void {
    const n = pts.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const kind = new Float32Array(n);
    const seed = new Float32Array(n);
    const c = new THREE.Color();
    pts.forEach((p, i) => {
      pos.set([p.x, p.y, p.z], i * 3);
      c.set(p.color);
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = p.size;
      kind[i] = p.kind;
      seed[i] = (hash32(i * 977) % 1000) / 1000;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: this.U,
      vertexShader: /* glsl */ `
        attribute vec3 color;
        attribute float aSize;
        attribute float aKind;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPx;
        uniform float uGain;
        uniform float uViewH;
        uniform vec4 uWheel;
        varying vec3 vCol;
        void main() {
          vec3 p = position;
          float kind = aKind;
          if ( aKind > 4.5 && aKind < 6.5 ) {
            // Ferris wheel bulbs: turn about the axle (X) with the rims; gondola lamps hang below it
            vec2 d = p.yz - uWheel.xy;
            p.y = uWheel.x + d.x * uWheel.z - d.y * uWheel.w;
            p.z = uWheel.y + d.x * uWheel.w + d.y * uWheel.z;
            if ( aKind > 5.5 ) p.y -= 0.5;
          }
          if ( aKind > 4.5 ) kind = 0.0;
          vec4 mv = modelViewMatrix * vec4( p, 1.0 );
          gl_Position = projectionMatrix * mv;
          float dist = max( 1.0, - mv.z );
          // projected size of the glow sprite, at least ~1.6 px (distant lamps stay visible points)
          float px = aSize * projectionMatrix[1][1] * 0.5 * uViewH / dist;
          // the Ferris wheel's own bulbs (kinds 5-7) seen from the walkway, the platform or a gondola, 1-10 m
          // away: a world-size glow would draw each as a 30-48 px disc; up close they read as small bulbs
          // (from ~20 m on nothing changes)
          if ( aKind > 4.5 ) px = min( px, mix( 10.0, 48.0, smoothstep( 2.0, 20.0, dist ) ) * uPx );
          gl_PointSize = clamp( px, 1.6 * uPx, 48.0 * uPx );
          px /= uPx;
          float k = 1.0;
          if ( kind > 0.5 && kind < 1.5 ) {
            // synchronised W-rot obstruction lights: 1 s on, 0.5 off, 1 on, 1.5 off
            float ph = mod( uTime, 4.0 );
            k = ( ph < 1.0 || ( ph > 1.5 && ph < 2.5 ) ) ? 1.0 : 0.04;
          } else if ( kind > 1.5 && kind < 2.5 || kind > 3.5 ) {
            k = 0.65 + 0.35 * sin( uTime * ( 1.3 + aSeed * 2.0 ) + aSeed * 30.0 );
          }
          // small sprites carry the energy of the whole lamp: brighter when sub-pixel
          float area = max( 1.0, 2.6 / max( px, 0.3 ) );
          // kind 4 = broad dim haze glow over a lit area (no hot core)
          float gain = kind > 3.5 ? 0.12 : ( kind > 0.5 && kind < 1.5 || kind > 2.5 ? 3.0 : 1.6 );
          vCol = color * k * uGain * min( area, 4.0 ) * gain;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol;
        void main() {
          vec2 c = gl_PointCoord * 2.0 - 1.0;
          float r2 = dot( c, c );
          float a = exp( - r2 * 5.0 ) + exp( - r2 * 40.0 ) * 1.5;
          if ( a < 0.01 ) discard;
          gl_FragColor = vec4( vCol * a, 1.0 );
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.lights = new THREE.Points(g, mat);
    this.lights.name = 'distant-lights';
    this.lights.frustumCulled = false;
    this.lights.renderOrder = 4;
    this.group.add(this.lights);
    this.lightCount = n;
  }

  /**
   * The sky beams over the other areas belong to a running festival (Tribe mode, walking / flying): on the
   * night itself the festival was cancelled and the other areas were dark. The official video's wide drone
   * shots show only low coloured light clusters on the right horizon, no beams (v44.75, 55.5, 243.5, 550, 600,
   * 1440, 1555: f4 00179 / 00222 / 02200 / 02460 / 05760 / 06220). Off "As filmed" and in the Show camera.
   */
  setAreaBeams(on: boolean): void {
    if (this.areaBeams) this.areaBeams.visible = on;
  }

  update(t: number, pixelRatio: number, viewH: number, level: number): void {
    this.U.uTime.value = t;
    this.U.uPx.value = pixelRatio;
    this.U.uViewH.value = viewH;
    this.U.uGain.value = 0.9 + 0.3 * (1 - level);
    // rotors turn at ~12 rpm, deterministic from show time
    for (let i = 0; i < this.rotorBase.length; i++) {
      this.r.makeRotationZ(t * 1.25 + i * 1.7);
      this.m.multiplyMatrices(this.rotorBase[i], this.r);
      this.rotors.setMatrixAt(i, this.m);
    }
    this.rotors.instanceMatrix.needsUpdate = true;
    this.poseWheel(t);
  }
}

/**
 * One open gondola (world/ferris.ts GONDOLA frame: axle at the origin, hanging down): a yoke to a
 * peaked canopy, four posts, a tub with a door gap on the boarding (-X) side, two facing benches.
 * White parts take the per-instance tint.
 */
function gondolaGeometry(low: boolean): THREE.BufferGeometry {
  const G = GONDOLA;
  const b = new GeoBuilder();
  const body = lin('#ffffff');
  const steel = lin('#b4b8be');
  const wood = lin('#8a7a66');
  const hw = G.w / 2,
    hd = G.d / 2;
  const fy = G.floorY,
    wt = fy + G.wallH,
    ry = G.roofY;
  // yoke from the axle down to the canopy
  for (const sx of [-0.5, 0.5]) b.box(0.06, -ry, 0.06, sx, ry / 2, 0, steel);
  // canopy: flat roof + a low four-sided peak
  b.box(G.w + 0.2, 0.07, G.d + 0.2, 0, ry + 0.035, 0, body);
  if (!low) {
    const cone = new THREE.ConeGeometry(Math.SQRT1_2, 0.3, 4);
    cone.rotateY(Math.PI / 4);
    b.add(cone, new THREE.Matrix4().compose(new THREE.Vector3(0, ry + 0.22, 0), new THREE.Quaternion(), new THREE.Vector3(G.w + 0.2, 1, G.d + 0.2)), body);
  }
  // corner posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.05, ry - wt, 0.05, sx * (hw - 0.03), (ry + wt) / 2, sz * (hd - 0.03), steel);
  // floor + tub walls (thin boxes: seen from inside too); the -X wall has the door gap
  b.box(G.w, 0.06, G.d, 0, fy - 0.03, 0, wood);
  for (const sz of [-1, 1]) b.box(G.w, G.wallH, 0.04, 0, fy + G.wallH / 2, sz * (hd - 0.02), body);
  b.box(0.04, G.wallH, G.d, hw - 0.02, fy + G.wallH / 2, 0, body);
  const seg = hd - G.door;
  for (const sz of [-1, 1]) b.box(0.04, G.wallH, seg, -(hw - 0.02), fy + G.wallH / 2, sz * (G.door + seg / 2), body);
  // rim cap on the tub
  for (const sz of [-1, 1]) b.box(G.w + 0.04, 0.04, 0.07, 0, wt, sz * (hd - 0.02), steel);
  // a closed safety gate across the door gap (bars at wall top + mid height): at 32 m the car no longer
  // reads as missing a wall (the scripted boarding steps over it in a moment; the eye stays well above)
  for (const h of [G.wallH, G.wallH * 0.5]) b.box(0.04, 0.04, 2 * G.door + 0.04, -(hw - 0.02), fy + h, 0, steel);
  // benches facing each other (the rider sits on the +Z one, facing the stage)
  for (const sz of [-1, 1]) {
    b.box(G.w - 0.1, 0.07, 0.42, 0, fy + G.seatH - 0.035, sz * (hd - 0.27), wood);
    // low backrests (top level with the tub wall): the rider looks over the opposite one
    b.box(G.w - 0.1, 0.3, 0.05, 0, fy + G.seatH + 0.19, sz * (hd - 0.07), wood);
    if (!low) b.box(G.w - 0.1, G.seatH - 0.07, 0.04, 0, fy + (G.seatH - 0.07) / 2, sz * (hd - 0.47), wood);
  }
  return b.build();
}
