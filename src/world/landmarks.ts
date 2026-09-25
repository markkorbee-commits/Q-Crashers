import * as THREE from 'three';
import { hash32, Rng } from '../core/rng';
import { GeoBuilder, lin } from './geom';
import { dirFromAzAlt, FERRIS_WHEEL, GOLIATH, GOLIATH_H, OTHER_AREAS, terrainHeight } from './site';
import { patchWorldMaterial } from './worldLights';

/**
 * The skyline around the RED field:
 *  - Walibi Holland's Goliath coaster (46.9 m, FACT OSM track) behind stage-left, a dark silhouette
 *    over the tree belt with an obstruction light on the lift hill
 *  - the PURPLE-area Ferris wheel (floorplan deco, 2024 aerial Ø ≈ 32 m) behind the audience-right
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
  /** 0 steady, 1 obstruction blink (W-rot), 2 slow flicker, 3 steady red obstruction */
  kind: number;
}

export class Landmarks {
  readonly group = new THREE.Group();
  private rotors!: THREE.InstancedMesh;
  private rotorBase: THREE.Matrix4[] = [];
  private wheel!: THREE.Group;
  private lights!: THREE.Points;
  private readonly U = { uTime: { value: 0 }, uPx: { value: 1 }, uGain: { value: 1 }, uViewH: { value: 720 } };
  private readonly m = new THREE.Matrix4();
  private readonly r = new THREE.Matrix4();
  triangles = 0;
  lightCount = 0;

  constructor(extraLights: LightPoint[], lowDetail: boolean) {
    this.group.name = 'landmarks';
    const mat = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.4 }), { key: 'landmark', lamps: false });
    const lights: LightPoint[] = [...extraLights];
    this.buildGoliath(mat, lights);
    this.buildWheel(mat, lights);
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

  private buildWheel(mat: THREE.Material, lights: LightPoint[]): void {
    const { x, z, r } = FERRIS_WHEEL;
    const y0 = terrainHeight(x, z);
    const hub = new THREE.Vector3(x, y0 + r + 3, z);
    const b = new GeoBuilder();
    const white = lin('#c8ccd2');
    // A-frame legs (wheel plane parallel to Z => axle along X)
    for (const sx of [-1.6, 1.6])
      for (const sz of [-7, 7]) b.beam(new THREE.Vector3(x + sx * 1.6, y0, z + sz), new THREE.Vector3(x + sx, hub.y, z), 0.6, white, true);
    this.add(b.build(), mat, 'ferris-frame');
    const w = new GeoBuilder();
    const N = 32;
    for (const sx of [-0.9, 0.9]) {
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * Math.PI * 2,
          a1 = ((k + 1) / N) * Math.PI * 2;
        w.beam(new THREE.Vector3(sx, Math.sin(a0) * r, Math.cos(a0) * r), new THREE.Vector3(sx, Math.sin(a1) * r, Math.cos(a1) * r), 0.35, white);
        if (k % 2 === 0) w.beam(new THREE.Vector3(sx, 0, 0), new THREE.Vector3(sx, Math.sin(a0) * r, Math.cos(a0) * r), 0.14, white);
      }
    }
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      w.box(1.6, 1.8, 1.6, 0, Math.sin(a) * r - 1.2, Math.cos(a) * r, lin(k % 2 ? '#7a2a8a' : '#d8d2c0'));
    }
    const wm = new THREE.Mesh(w.build(), mat);
    wm.name = 'ferris-wheel';
    this.wheel = new THREE.Group();
    this.wheel.position.copy(hub);
    this.wheel.add(wm);
    this.group.add(this.wheel);
    this.triangles += wm.geometry.getAttribute('position').count / 3;
    // rim bulbs (static positions; the wheel stands still on the closed festival night)
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      lights.push({ x: hub.x - 1, y: hub.y + Math.sin(a) * r, z: hub.z + Math.cos(a) * r, color: k % 2 ? '#ffd9a0' : '#c77dff', size: 0.9, kind: 0 });
    }
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

  private buildAreas(mat: THREE.Material, lights: LightPoint[]): void {
    const b = new GeoBuilder();
    const rng = new Rng(4040);
    for (const a of OTHER_AREAS) {
      // dark stage / tent silhouette and a few structures, lit by work lights and dim coloured glows
      const d = Math.hypot(a.x, a.z);
      const s = d > 330 ? 330 / d : 1; // compress the farthest areas (angular size preserved)
      const cx = a.x * s,
        cz = a.z * s;
      const y = terrainHeight(cx, cz) - 0.3;
      const face = Math.atan2(-cx, -cz);
      const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, face);
      const base = new THREE.Matrix4().compose(new THREE.Vector3(cx, y, cz), q, new THREE.Vector3(s, s, s));
      const put = (w: number, h: number, dd: number, px: number, py: number, pz: number, c: [number, number, number]) =>
        b.add(GeoBuilder.unit('box'), base.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion(), new THREE.Vector3(w, h, dd))), c);
      const sw = a.r * 1.2;
      put(sw, 14 + rng.range(0, 8), 14, 0, 9, 0, lin('#101012'));
      put(sw * 0.35, 20 + rng.range(0, 8), 6, -sw * 0.45, 12, 2, lin('#0d0d0f'));
      put(sw * 0.35, 20 + rng.range(0, 8), 6, sw * 0.45, 12, 2, lin('#0d0d0f'));
      const n = 10 + rng.int(0, 10);
      for (let k = 0; k < n; k++) {
        const p = new THREE.Vector3(rng.range(-sw / 2, sw / 2), rng.range(2, 22), rng.range(-6, 8)).applyMatrix4(base);
        const coloured = rng.chance(0.4);
        lights.push({ x: p.x, y: p.y, z: p.z, color: coloured ? a.hue : rng.pick(['#fff1d6', '#ffd49a', '#e8f0ff']), size: (coloured ? 4 : 2.2) * s + 0.8, kind: coloured ? 2 : 0 });
      }
    }
    this.add(b.build(), mat, 'other-areas');
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
        varying vec3 vCol;
        void main() {
          vec4 mv = modelViewMatrix * vec4( position, 1.0 );
          gl_Position = projectionMatrix * mv;
          float dist = max( 1.0, - mv.z );
          // projected size of the glow sprite, at least ~1.6 px (distant lamps stay visible points)
          float px = aSize * projectionMatrix[1][1] * 0.5 * uViewH / dist;
          gl_PointSize = clamp( px, 1.6 * uPx, 48.0 * uPx );
          px /= uPx;
          float k = 1.0;
          if ( aKind > 0.5 && aKind < 1.5 ) {
            // synchronised W-rot obstruction lights: 1 s on, 0.5 off, 1 on, 1.5 off
            float ph = mod( uTime, 4.0 );
            k = ( ph < 1.0 || ( ph > 1.5 && ph < 2.5 ) ) ? 1.0 : 0.04;
          } else if ( aKind > 1.5 && aKind < 2.5 ) {
            k = 0.65 + 0.35 * sin( uTime * ( 1.3 + aSeed * 2.0 ) + aSeed * 30.0 );
          }
          // small sprites carry the energy of the whole lamp: brighter when sub-pixel
          float area = max( 1.0, 2.6 / max( px, 0.3 ) );
          vCol = color * k * uGain * min( area, 4.0 ) * ( aKind > 0.5 && aKind < 1.5 || aKind > 2.5 ? 3.0 : 1.6 );
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
  }
}
