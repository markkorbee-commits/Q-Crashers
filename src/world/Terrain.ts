import * as THREE from 'three';
import type { App } from '../core/App';
import { Rng } from '../core/rng';
import type { Collider2D, FrameContext, QualitySettings, System } from '../core/types';
import { buildSiteMask, SITE_RECT } from './groundMaps';
import { ARM, BACKSTAGE_Z, LAKE, PILLARS, PIT_Z, terraceHeight, terrainHeight, WATER_Y } from './site';
import { TimeSlicer } from '../core/yieldTo';
import { cloudNoiseTextureAsync, groundDetailTexture, makeCanvas, canvasTexture } from './tex';
import { Vegetation } from './vegetation';
import { patchWorldMaterial, SKY_REFLECT_GLSL, worldUniforms } from './worldLights';

/**
 * The RED field and its surroundings (research/terrain-analysis.md):
 *  - an amphitheatre bowl: flat concrete floor X ±44 × Z 0…113 (FACT), side banks rising 5.2 m to
 *    crests at |X| 100–109, a rear bank behind the stage, the back plaza / 12 m road / timber
 *    decking falling to the lake (AHN4, analytic fit ±0.3 m)
 *  - heat-parched grass on the banks after the June 2026 heatwave (ASSUMPTION, research U6), walked
 *    paths, gravel pads, damp gutters after the 21–22 h shower that preceded the storm (INFERENCE)
 *  - steel trackway plates (rijplaten) on vehicle routes over grass, cable ramps along the pillar rows
 *  - the lake behind the audience, tree belts (OSM) and the flat polder to the horizon
 * heightAt(x, z) is the walkable ground used by the player, crowd and props.
 */
export class TerrainSystem implements System {
  readonly name = 'terrain';
  private app!: App;
  private enabled = true;
  private ground!: THREE.Mesh;
  private water!: THREE.Mesh;
  private waterMat!: THREE.ShaderMaterial;
  private vegetation!: Vegetation;
  private plates!: THREE.InstancedMesh;
  private ramps!: THREE.InstancedMesh;
  private siteMask!: THREE.DataTexture;
  private detail!: THREE.DataTexture;
  private macro!: THREE.DataTexture;
  private groundTris = 0;
  private plateCount = 0;

  async init(app: App): Promise<void> {
    this.app = app;
    const q = app.quality;
    const mobile = q.level === 'mobile';
    const ts = Math.min(1024, q.textureSize);
    // the loading screen keeps painting: sub-steps on the bar, ~12 ms slices inside the generators
    const slicer = new TimeSlicer(12);
    await app.loadStep('site masks', 0);
    this.siteMask = await buildSiteMask(mobile ? 512 : 1024, slicer);
    await app.loadStep('ground detail', 0.3);
    this.detail = await groundDetailTexture(mobile ? 256 : Math.min(512, ts), slicer);
    this.detail.anisotropy = q.anisotropy;
    this.macro = await cloudNoiseTextureAsync(mobile ? 128 : 256, slicer);
    this.macro.anisotropy = q.anisotropy;
    this.siteMask.anisotropy = Math.max(4, q.anisotropy);
    await app.loadStep('ground', 0.55);
    this.buildGround(mobile);
    await slicer.maybeYield();
    this.buildWater();
    this.buildPlates();
    this.buildCableRamps();
    await app.loadStep('trees', 0.75);
    this.vegetation = new Vegetation(q.treeCount, mobile);
    app.scene.add(this.vegetation.group);
    this.registerBounds();
  }

  /** walkable ground height at x,z (metres, floor = 0): terrain, or the photo terrace deck / stairs */
  heightAt(x: number, z: number): number {
    return terraceHeight(x, z) ?? terrainHeight(x, z);
  }

  // -------------------------------------------------------------------------------------------
  // ground mesh: one non-uniform grid, dense where the relief changes, growing to 2.4 km

  private axis(segments: [number, number, number][], growFrom: number, growTo: number, step0: number, dir: 1 | -1): number[] {
    const out: number[] = [];
    for (const [a, b, s] of segments) {
      const n = Math.max(1, Math.round((b - a) / s));
      for (let i = 0; i < n; i++) out.push(a + ((b - a) * i) / n);
    }
    out.push(segments[segments.length - 1][1]);
    // geometric growth outwards
    let v = growFrom,
      st = step0;
    const ext: number[] = [];
    while (Math.abs(v) < Math.abs(growTo)) {
      st *= 1.09;
      v += dir * st;
      ext.push(v);
    }
    return dir > 0 ? [...out, ...ext] : [...ext.reverse(), ...out];
  }

  private buildGround(mobile: boolean): void {
    const f = mobile ? 2 : 1;
    const xsCore: [number, number, number][] = [
      [-330, -135, 6 * f],
      [-135, -40, 2 * f],
      [-40, 40, 6 * f],
      [40, 135, 2 * f],
      [135, 330, 6 * f],
    ];
    const zsCore: [number, number, number][] = [
      [-110, -2, 2 * f],
      [-2, 100, 6 * f],
      [100, 122, 2 * f],
      [122, 165, 6 * f],
      [165, 262, 3 * f],
      [262, 400, 6 * f],
    ];
    const xl = this.axis(xsCore, -330, -2400, 6, -1).filter((v, i, a) => i === 0 || v !== a[i - 1]);
    const xs = [...xl, ...this.axis([[330, 330.001, 1]], 330, 2400, 6, 1).slice(1)];
    const zl = this.axis(zsCore, -110, -2400, 6, -1);
    const zs = [...zl, ...this.axis([[400, 400.001, 1]], 400, 2400, 6, 1).slice(1)];
    const uniq = (a: number[]) => a.filter((v, i) => i === 0 || v > a[i - 1] + 1e-3);
    const X = uniq(xs.sort((a, b) => a - b));
    const Z = uniq(zs.sort((a, b) => a - b));
    const nx = X.length,
      nz = Z.length;
    const pos = new Float32Array(nx * nz * 3);
    const nor = new Float32Array(nx * nz * 3);
    const rng = new Rng(5);
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const x = X[i],
          z = Z[j];
        let y = terrainHeight(x, z);
        // the far polder: slight undulation and a lower base so the horizon line is clean
        const far = Math.max(Math.abs(x), Math.abs(z - 60));
        if (far > 420) y += -0.6 + Math.sin(x * 0.004 + rng.next() * 0.01) * Math.cos(z * 0.003) * 0.4;
        const k = (j * nx + i) * 3;
        pos[k] = x;
        pos[k + 1] = y;
        pos[k + 2] = z;
        // analytic normal (central differences)
        const e = 0.75;
        const hx = terrainHeight(x + e, z) - terrainHeight(x - e, z);
        const hz = terrainHeight(x, z + e) - terrainHeight(x, z - e);
        const n = new THREE.Vector3(-hx, 2 * e, -hz).normalize();
        nor[k] = n.x;
        nor[k + 1] = n.y;
        nor[k + 2] = n.z;
      }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
    let o = 0;
    for (let j = 0; j < nz - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i,
          b = a + 1,
          c = a + nx,
          d = c + 1;
        idx[o++] = a;
        idx[o++] = c;
        idx[o++] = b;
        idx[o++] = b;
        idx[o++] = c;
        idx[o++] = d;
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    this.groundTris = idx.length / 3;

    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0 });
    const U = {
      tSite: { value: this.siteMask },
      tDetail: { value: this.detail },
      tMacro: { value: this.macro },
      uSiteRect: { value: new THREE.Vector4(SITE_RECT.x0, SITE_RECT.z0, 1 / SITE_RECT.w, 1 / SITE_RECT.h) },
      uWet: { value: 1 },
    };
    patchWorldMaterial(mat, {
      key: 'ground',
      edit: (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
          .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>\n${GROUND_PARS}`)
          .replace('#include <map_fragment>', GROUND_SURFACE)
          .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
          .replace('#include <normal_fragment_maps>', 'normal = gPerturb( - vViewPosition, normal, gH, 0.035, faceDirection );')
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${GROUND_REFLECT}`);
      },
    });
    this.ground = new THREE.Mesh(g, mat);
    this.ground.name = 'ground';
    // drawn late among the opaques (the sky is last): early-z skips ground pixels hidden by the
    // crowd, stage and props, which matters because the splat + show-light shader is the heaviest
    this.ground.renderOrder = 900000;
    this.app.scene.add(this.ground);
  }

  // -------------------------------------------------------------------------------------------

  private buildWater(): void {
    const shape = new THREE.Shape(LAKE.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(shape, 4);
    g.rotateX(-Math.PI / 2); // (x, -z) in shape space -> world (x, 0, z)
    g.translate(0, WATER_Y, 0);
    this.waterMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { tNoise: { value: this.macro } },
      ]),
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      fog: true,
    });
    // share the world uniforms (sky colours, stage, flash, moon) by reference
    Object.assign(this.waterMat.uniforms, worldUniforms);
    this.water = new THREE.Mesh(g, this.waterMat);
    this.water.name = 'lake';
    this.app.scene.add(this.water);
  }

  // -------------------------------------------------------------------------------------------
  // steel trackway plates (rijplaten, 2 × 3 m) on vehicle / service routes over the grass

  private buildPlates(): void {
    const routes: [number, number][][] = [
      // back corners: plaza up the bank ramps to the crest service paths (bar supply routes)
      [[-47, 121], [-72, 112], [-97, 104]],
      [[47, 121], [72, 112], [97, 102]],
      // from the road to the toilet block and the water points (back-left), and to first aid (back-right)
      [[-96, 140], [-112, 146]],
      [[-60, 150], [-72, 166]],
      [[104, 136], [116, 126]],
      // queue lanes from the floor up to the crest bars (plates laid for the weekend over the grass)
      [[-46, 46], [-96, 46]],
      [[46, 46], [96, 46]],
    ];
    const tex = treadTexture();
    const mat = patchWorldMaterial(
      new THREE.MeshStandardMaterial({ map: tex, color: '#ffffff', metalness: 0.15, roughness: 0.6 }),
      { key: 'plates' },
    );
    const geo = new THREE.BoxGeometry(3, 0.03, 2);
    const items: THREE.Matrix4[] = [];
    const rng = new Rng(88);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3();
    const e = new THREE.Euler();
    for (const r of routes) {
      for (let s = 1; s < r.length; s++) {
        const [ax, az] = r[s - 1];
        const [bx, bz] = r[s];
        const len = Math.hypot(bx - ax, bz - az);
        const yaw = Math.atan2(-(bz - az), bx - ax);
        const n = Math.floor(len / 2.05);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          for (const lat of [-1.02, 1.02]) {
            const x = ax + (bx - ax) * t;
            const z = az + (bz - az) * t;
            // two plates side by side across the route (3 m each, 2 m along)
            const px = x + Math.cos(yaw + Math.PI / 2) * lat * 1.5;
            const pz = z - Math.sin(yaw + Math.PI / 2) * lat * 1.5;
            const y = terrainHeight(px, pz);
            const hx = terrainHeight(px + 1, pz) - terrainHeight(px - 1, pz);
            const hz = terrainHeight(px, pz + 1) - terrainHeight(px, pz - 1);
            up.set(-hx, 2, -hz).normalize();
            e.set(0, yaw + Math.PI / 2 + rng.range(-0.03, 0.03), 0);
            q.setFromEuler(e);
            const tilt = new THREE.Quaternion().setFromUnitVectors(THREE.Object3D.DEFAULT_UP, up);
            q.premultiply(tilt);
            m.compose(new THREE.Vector3(px, y + 0.02 + rng.range(0, 0.01), pz), q, new THREE.Vector3(1, 1, 1));
            items.push(m.clone());
          }
        }
      }
    }
    this.plates = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((mm, i) => this.plates.setMatrixAt(i, mm));
    this.plates.instanceMatrix.needsUpdate = true;
    this.plates.computeBoundingSphere();
    this.plates.name = 'rijplaten';
    this.plateCount = items.length;
    this.app.scene.add(this.plates);
  }

  /**
   * rubber cable protectors feeding the 8 delay towers (the 2024 aerial shows lines along the rows).
   * Segments butt together and the (weathered, dull) yellow lid runs continuously: a thin bright lid
   * broken every 0.9 m aliased into a dotted "ant trail" at a distance.
   */
  private buildCableRamps(): void {
    const seg = 0.9;
    const body = new THREE.BoxGeometry(0.52, 0.06, seg);
    body.translate(0, 0.03, 0);
    const lid = new THREE.BoxGeometry(0.16, 0.01, seg);
    lid.translate(0, 0.064, 0);
    const colB = new Float32Array(body.getAttribute('position').count * 3).fill(0.05);
    body.setAttribute('color', new THREE.BufferAttribute(colB, 3));
    const nL = lid.getAttribute('position').count;
    const colL = new Float32Array(nL * 3);
    for (let i = 0; i < nL; i++) colL.set([0.2, 0.15, 0.03], i * 3);
    lid.setAttribute('color', new THREE.BufferAttribute(colL, 3));
    const geo = mergeSimple([body, lid]);
    const mat = patchWorldMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), { key: 'ramps' });
    const mats: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    for (const side of [-1, 1]) {
      const x = side * 23.9;
      const zEnd = PILLARS.filter((p) => p.side === side).reduce((a, p) => Math.max(a, p.z), 0) - 4;
      for (let z = PIT_Z + 1.5; z < zEnd; z += seg) {
        m.makeTranslation(x, 0, z + seg / 2);
        mats.push(m.clone());
      }
    }
    this.ramps = new THREE.InstancedMesh(geo, mat, mats.length);
    mats.forEach((mm, i) => this.ramps.setMatrixAt(i, mm));
    this.ramps.instanceMatrix.needsUpdate = true;
    this.ramps.computeBoundingSphere();
    this.ramps.name = 'cable-ramps';
    this.app.scene.add(this.ramps);
  }

  // -------------------------------------------------------------------------------------------
  // playable boundary (design-bible §6.8). The stage side is closed by the MainStage's own colliders
  // (deck/castle, side sections, corner towers, arm ramparts with their 4 m gates, the front and arm
  // crowd barriers); this outline closes the rest: the backstage fences on both crests (Z −6 from the
  // corner towers to the crest edge), the crest edges above the tree belts, the back corners, the road
  // / decking edge by the lake. The crest behind the arms (the bars) is reached through the arm gates
  // (Z 28…56) or around the arm ends (Z > 60).
  private registerBounds(): void {
    const cx = ARM.x0 + 3;
    const B: [number, number][] = [
      [cx, BACKSTAGE_Z],
      [108.5, BACKSTAGE_Z],
      [108.5, 99],
      [130, 150],
      [125, 173],
      [-120, 173],
      [-135, 150],
      [-108.5, 120],
      [-108.5, BACKSTAGE_Z],
      [-cx, BACKSTAGE_Z],
    ];
    const add = (c: Collider2D) => this.app.addCollider(c);
    for (let i = 1; i < B.length; i++) segmentColliders(B[i - 1], B[i], 0.8, 'bounds').forEach(add);
  }

  // -------------------------------------------------------------------------------------------

  update(_ctx: FrameContext): void {
    if (!this.enabled) return;
  }

  setQuality(q: QualitySettings): void {
    if (this.vegetation) this.vegetation.setBudget(q.treeCount);
    for (const t of [this.detail, this.macro]) {
      if (!t) continue;
      t.anisotropy = q.anisotropy;
      t.needsUpdate = true;
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    for (const o of [this.ground, this.water, this.vegetation?.group, this.plates, this.ramps]) if (o) o.visible = on;
  }

  stats(): Record<string, number | string> {
    return {
      groundTris: this.groundTris,
      trees: this.vegetation?.count ?? 0,
      treeTris: this.vegetation?.triangles ?? 0,
      plates: this.plateCount,
    };
  }
}

/** axis-aligned boxes / circles approximating a thick segment (for the 2D player collision) */
export function segmentColliders(a: [number, number], b: [number, number], r: number, tag: string): Collider2D[] {
  const [ax, az] = a;
  const [bx, bz] = b;
  const out: Collider2D[] = [];
  if (Math.abs(ax - bx) < 1e-3 || Math.abs(az - bz) < 1e-3) {
    out.push({ kind: 'box', minX: Math.min(ax, bx) - r, maxX: Math.max(ax, bx) + r, minZ: Math.min(az, bz) - r, maxZ: Math.max(az, bz) + r, tag });
    return out;
  }
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.ceil(len / r);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({ kind: 'circle', x: ax + (bx - ax) * t, z: az + (bz - az) * t, r, tag });
  }
  return out;
}

function mergeSimple(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIdx = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const names = ['position', 'normal', 'color'];
  const g = new THREE.BufferGeometry();
  for (const nm of names) {
    const arrays = nonIdx.map((p) => p.getAttribute(nm).array as Float32Array);
    const len = arrays.reduce((s, a) => s + a.length, 0);
    const out = new Float32Array(len);
    let o = 0;
    for (const a of arrays) {
      out.set(a, o);
      o += a.length;
    }
    g.setAttribute(nm, new THREE.BufferAttribute(out, 3));
  }
  return g;
}

/** steel diamond-tread plate texture with rust and mud */
function treadTexture(): THREE.CanvasTexture {
  const [c, g] = makeCanvas(256, 256);
  const rng = new Rng(3);
  g.fillStyle = '#8f8b84';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16)
    for (let x = 0; x < 256; x += 16) {
      const o = (y / 16) % 2 ? 8 : 0;
      g.save();
      g.translate(x + o + 8, y + 8);
      g.rotate((y / 16) % 2 ? 0.6 : -0.6);
      g.fillStyle = '#aeaaa3';
      g.fillRect(-6, -1.5, 12, 3);
      g.fillStyle = '#4d4a47';
      g.fillRect(-6, 1.5, 12, 1);
      g.restore();
    }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = rng.chance(0.5) ? 'rgba(110,60,30,0.25)' : 'rgba(70,55,40,0.3)';
    g.beginPath();
    g.ellipse(rng.range(0, 256), rng.range(0, 256), rng.range(6, 40), rng.range(4, 22), rng.range(0, 3), 0, Math.PI * 2);
    g.fill();
  }
  // bolt holes / lifting eyes
  g.fillStyle = '#222';
  for (const [x, y] of [[12, 12], [244, 12], [12, 244], [244, 244]]) {
    g.beginPath();
    g.arc(x, y, 5, 0, Math.PI * 2);
    g.fill();
  }
  return canvasTexture(c, { repeat: false });
}

// ---------------------------------------------------------------------------------------------
// ground shader fragments

const GROUND_PARS = /* glsl */ `
varying vec3 vGW;
uniform sampler2D tSite;
uniform sampler2D tDetail;
uniform sampler2D tMacro;
uniform vec4 uSiteRect;
uniform float uWet;
float gHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
vec3 gPerturb( vec3 surf_pos, vec3 surf_norm, float h, float scale, float fd ) {
  vec3 sx = dFdx( surf_pos );
  vec3 sy = dFdy( surf_pos );
  vec2 dh = vec2( dFdx( h ), dFdy( h ) ) * scale;
  vec3 r1 = cross( sy, surf_norm );
  vec3 r2 = cross( surf_norm, sx );
  float det = dot( sx, r1 ) * fd;
  vec3 grad = sign( det ) * ( dh.x * r1 + dh.y * r2 );
  return normalize( abs( det ) * surf_norm - grad );
}
`;

const GROUND_SURFACE = /* glsl */ `
float gRough = 0.95;
float gH = 0.0;
float gDamp = 0.0;
{
  vec2 xz = vGW.xz;
  vec2 suv = ( xz - uSiteRect.xy ) * uSiteRect.zw;
  float inSite = step( 0.0, suv.x ) * step( suv.x, 1.0 ) * step( 0.0, suv.y ) * step( suv.y, 1.0 );
  vec4 m = texture2D( tSite, clamp( suv, 0.001, 0.999 ) ) * inSite;
  vec4 d1 = texture2D( tDetail, xz * 0.25 );
  vec4 d2 = texture2D( tDetail, xz * 0.83 + 0.37 );
  vec4 mac = texture2D( tMacro, xz * ( 1.0 / 260.0 ) );
  vec4 mac2 = texture2D( tMacro, xz * ( 1.0 / 47.0 ) + 0.21 );
  float dist = length( vGW - cameraPosition );
  float fine = 1.0 - smoothstep( 40.0, 160.0, dist );
  // high-frequency detail (pebbles, blades, aggregate) fades to its mean well before it would alias
  float nearD = 1.0 - smoothstep( 6.0, 38.0, dist );
  float d2b = mix( 0.5, d2.b, nearD );
  // metres per pixel on the ground (joint / grate anti-aliasing)
  vec2 fwm = max( fwidth( xz ), vec2( 1e-4 ) );

  // --- heat-parched grass (straw / olive / bare soil)
  float patchy = smoothstep( 0.32, 0.72, mac.r * 0.55 + mac2.g * 0.45 );
  vec3 straw = vec3( 0.30, 0.24, 0.11 );
  vec3 olive = vec3( 0.13, 0.14, 0.06 );
  vec3 soil = vec3( 0.14, 0.10, 0.065 );
  vec4 mid = texture2D( tMacro, xz * ( 1.0 / 11.0 ) + 0.63 );
  patchy = clamp( patchy + ( mid.g - 0.5 ) * 0.9, 0.0, 1.0 );
  vec3 grass = mix( olive, straw, patchy );
  grass *= 0.8 + 0.4 * mid.r;
  grass *= mix( 1.0, 0.74 + 0.52 * d1.g, nearD * 0.75 + fine * 0.1 );
  grass = mix( grass, soil, smoothstep( 0.5, 0.85, mix( 0.5, d2.a, nearD ) ) * 0.4 + smoothstep( 0.62, 0.8, mac2.r ) * 0.25 );
  float hG = d1.g * 0.7 + d2.g * 0.3;

  // --- far polder: crop parcels on the site grid, ditches between them
  float farW = smoothstep( 250.0, 420.0, max( abs( xz.x ), abs( xz.y - 60.0 ) ) );
  if ( farW > 0.0 ) {
    vec2 pq = vec2( ( xz.x + 37.0 ) / 310.0, ( xz.y + 11.0 ) / 140.0 );
    float ph = gHash( floor( pq ) );
    vec3 crop = ph < 0.3 ? vec3( 0.15, 0.12, 0.05 ) : ph < 0.55 ? vec3( 0.035, 0.05, 0.02 ) : ph < 0.75 ? vec3( 0.065, 0.045, 0.03 ) : vec3( 0.06, 0.07, 0.03 );
    vec2 fq = abs( fract( pq + 0.5 ) - 0.5 ) * vec2( 310.0, 140.0 );
    float ditch = 1.0 - smoothstep( 0.6, 2.4, min( fq.x, fq.y ) );
    crop *= 0.8 + 0.4 * d1.g;
    grass = mix( grass, mix( crop, vec3( 0.02, 0.025, 0.03 ), ditch ), farW );
  }

  // --- worn ground: dirt / gravel / sand
  vec3 dirt = mix( vec3( 0.14, 0.105, 0.072 ), vec3( 0.19, 0.155, 0.11 ), d2b );
  vec3 sand = vec3( 0.45, 0.42, 0.35 ) * ( 0.9 + 0.15 * mix( 0.5, d1.b, nearD ) );
  vec3 worn = xz.y > 240.0 ? sand : ( xz.y < -30.0 ? mix( dirt, vec3( 0.26, 0.24, 0.2 ), 0.6 ) : dirt );
  float wear = clamp( m.b * ( 0.75 + 0.5 * mac2.b ), 0.0, 1.0 );
  vec3 col = mix( grass, worn, wear );
  float h = mix( hG, d2.b * 0.6, wear );
  float rough = 0.96;

  // --- roads / hard-standing (light gravel-asphalt road, darker compacted gravel hard-standing):
  //     low-contrast grain near the eye, broad tyre-worn and dusty patches at every distance
  float road = smoothstep( 0.25, 0.45, m.g );
  vec3 roadC = mix( vec3( 0.12, 0.112, 0.1 ), vec3( 0.30, 0.28, 0.23 ), smoothstep( 0.6, 0.95, m.g ) ) * ( 0.91 + 0.16 * d2b ) * ( 0.84 + 0.3 * mac2.g ) * ( 0.9 + 0.2 * mid.b );
  col = mix( col, roadC, road );
  h = mix( h, d2.b * 0.3, road );
  rough = mix( rough, 0.82 + 0.1 * mac2.r, road );

  // --- concrete floor: 4 m slabs, joints, aggregate, tyre marks, gutters with gully grates
  float conc = smoothstep( 0.3, 0.6, m.r );
  if ( conc > 0.0 ) {
    vec2 sl = xz / 4.0;
    vec2 cell = floor( sl );
    vec2 fr = fract( sl );
    // sawn joints (≈ 3.5 cm) box-filtered against the pixel footprint: no dotted "ant trails" at
    // grazing angles, the lines fade to their true average darkness with distance
    vec2 e2 = min( fr, 1.0 - fr ) * 4.0;
    const float JW = 0.018;
    vec2 jl = ( 1.0 - smoothstep( JW - fwm * 0.5, JW + fwm * 0.5, e2 ) ) * min( vec2( 1.0 ), ( 2.0 * JW ) / fwm );
    float joint = max( jl.x, jl.y );
    float tint = gHash( cell );
    // slab-to-slab variation kept subtle (the floor is poured concrete, not tile); broad dirt, dust
    // and tyre-worn lanes at 10–60 m scales give it the weathered festival-ground look
    vec3 cc = vec3( 0.25, 0.245, 0.225 ) * ( 0.94 + 0.12 * tint ) * ( 0.9 + 0.18 * mix( 0.5, d1.r, nearD ) ) * ( 0.84 + 0.28 * mac.b );
    cc *= 0.8 + 0.32 * smoothstep( 0.2, 0.8, mac2.g );
    cc *= m.r < 0.95 ? 0.85 : 1.0;
    float tyre = smoothstep( 0.72, 1.0, sin( xz.x * 1.7 + mac2.r * 5.0 ) ) * smoothstep( 0.5, 0.8, mac.g ) * 0.22 * ( 0.4 + 0.6 * fine );
    cc *= 1.0 - tyre - smoothstep( 0.6, 0.92, mix( 0.5, d2.a, nearD ) ) * 0.18 - smoothstep( 0.55, 0.85, mac2.a ) * 0.14;
    cc *= 1.0 - joint * 0.35;
    float gd = abs( abs( xz.x ) - 29.0 );
    float inFloor = step( xz.y, 113.0 ) * step( 0.0, xz.y );
    float gut = ( 1.0 - smoothstep( 0.1, 0.45 + fwm.x, gd ) ) * inFloor;
    float gz = abs( fract( xz.y / 10.0 + 0.5 ) - 0.5 ) * 10.0;
    float grate = ( 1.0 - smoothstep( 0.28 - fwm.x * 0.5, 0.28 + fwm.x * 0.5, gd ) ) * ( 1.0 - smoothstep( 0.3 - fwm.y * 0.5, 0.3 + fwm.y * 0.5, gz ) ) * inFloor;
    cc = mix( cc, cc * 0.6, gut );
    cc = mix( cc, vec3( 0.025 ), grate );
    // damp: the gutters and low spots still wet from the shower before the storm (INFERENCE)
    float damp = uWet * clamp( gut * 1.2 + smoothstep( 0.7, 0.86, mac2.b + ( d2.a - 0.5 ) * 0.2 ) * 0.6 + smoothstep( 0.74, 0.86, mac.a ) * 0.4, 0.0, 1.0 );
    gDamp = damp * conc;
    cc *= 1.0 - 0.35 * damp;
    col = mix( col, cc, conc );
    h = mix( h, d1.r * 0.2 - joint * 0.9 - grate * 0.5, conc );
    // roughness varies with wear / dust (no uniform polished sheen)
    rough = mix( rough, mix( 0.74 + 0.18 * mac2.r, 0.18, damp ), conc );
  }

  // --- timber decking ("flonders") behind the road
  float deck = smoothstep( 0.3, 0.6, m.a );
  if ( deck > 0.0 ) {
    float bw = 0.145;
    float bi = floor( xz.x / bw );
    float bf = fract( xz.x / bw );
    float gap = smoothstep( 0.0, 0.07, bf ) * smoothstep( 1.0, 0.93, bf );
    float bt = gHash( vec2( bi, floor( ( xz.y + bi * 1.7 ) / 3.1 ) ) );
    vec3 wood = mix( vec3( 0.12, 0.09, 0.065 ), vec3( 0.22, 0.19, 0.15 ), bt ) * ( 0.75 + 0.45 * d1.a ) * mix( 0.25, 1.0, gap );
    col = mix( col, wood, deck );
    h = mix( h, gap * 0.5 + d1.a * 0.2, deck );
    rough = mix( rough, 0.85, deck );
  }
  diffuseColor.rgb *= col;
  gRough = rough;
  // derivative bump only close to the eye: far away it turns into per-pixel sparkle ("TV static")
  gH = h * nearD;
}
`;

/** glossy sky reflection on damp concrete (Schlick fresnel) + moon glint */
const GROUND_REFLECT = /* glsl */ `
if ( gDamp > 0.01 ) {
  vec3 V = normalize( vGW - cameraPosition );
  vec3 Nw = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  vec3 R = reflect( V, Nw );
  float cosT = max( dot( -V, Nw ), 0.0 );
  float F = 0.02 + 0.98 * pow( 1.0 - cosT, 5.0 );
  vec3 sky = wlSky( R );
  float glint = pow( max( dot( R, uWMoonDir ), 0.0 ), 3000.0 ) * uWMoonI;
  totalEmissiveRadiance += ( sky * 0.55 + vec3( 1.0, 0.8, 0.6 ) * glint * 0.08 ) * F * gDamp * gDamp;
}
`;

// ---------------------------------------------------------------------------------------------
// lake

const WATER_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vW = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const WATER_FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform sampler2D tNoise;
uniform vec3 uWSkyZen;
uniform vec3 uWSkyHor;
uniform vec3 uWSkyHorNW;
uniform vec3 uWSunDir;
uniform vec3 uWMoonDir;
uniform float uWMoonI;
uniform vec4 uWStage;
uniform vec3 uWStageCol;
uniform vec4 uWFlash;
uniform vec3 uWFlashCol;
uniform float uWTime;
varying vec3 vW;
${SKY_REFLECT_GLSL}
void main() {
  vec3 V = normalize( vW - cameraPosition );
  // wind ripples from the NNW (~4–5 m/s): two scrolling noise layers
  vec2 uv = vW.xz;
  float t = uWTime;
  vec2 n1 = texture2D( tNoise, uv * 0.035 + vec2( 0.011, 0.023 ) * t ).rg - 0.5;
  vec2 n2 = texture2D( tNoise, uv * 0.11 - vec2( 0.019, 0.008 ) * t ).ba - 0.5;
  vec3 N = normalize( vec3( ( n1.x + n2.x * 0.6 ) * 0.22, 1.0, ( n1.y + n2.y * 0.6 ) * 0.22 ) );
  vec3 R = reflect( V, N );
  R.y = abs( R.y );
  float cosT = max( dot( -V, N ), 0.0 );
  float F = 0.02 + 0.98 * pow( 1.0 - cosT, 5.0 );
  vec3 col = wlSky( R ) * F;
  // moon glitter path
  col += vec3( 1.0, 0.8, 0.6 ) * pow( max( dot( R, uWMoonDir ), 0.0 ), 300.0 ) * uWMoonI * 0.25;
  // reflected glow of the stage and of pyro flashes (broad lobes)
  vec3 sd = normalize( uWStage.xyz - vW );
  col += uWStageCol * 0.00002 * pow( max( dot( R, sd ), 0.0 ), 24.0 );
  vec3 fd = normalize( uWFlash.xyz - vW );
  col += uWFlashCol * 0.00003 * pow( max( dot( R, fd ), 0.0 ), 12.0 );
  col += vec3( 0.004, 0.006, 0.006 ) * ( 1.0 - F );
  gl_FragColor = vec4( col, 1.0 );
  #include <fog_fragment>
}
`;
