import * as THREE from 'three';
import { Emitter, REC_FLOATS, REC_TEXELS } from './Emitter';

const SLOT_TEX_W = 256;

export interface FxLayerOptions {
  name: string;
  /** particles per slot (instanced draw granularity) */
  slotSize: number;
  /** emitter table rows */
  maxEmitters: number;
  /** instance budget (particles) */
  maxParticles: number;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  renderOrder: number;
}

interface Range {
  start: number;
  count: number;
}

/**
 * One instanced draw call of analytic particles.
 *
 * Emitter records live in a float texture (one row per alive emitter, rows are stable while the
 * emitter lives so only newly born emitters are uploaded). A second small texture maps instanced
 * "slots" (groups of `slotSize` particles) to (emitter row, first particle index, particle count).
 * Per frame the CPU work is O(alive emitters); nothing is simulated.
 */
export class FxLayer {
  readonly mesh: THREE.Mesh;
  readonly name: string;
  readonly slotSize: number;
  readonly maxEmitters: number;
  readonly maxSlots: number;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly emitData: Float32Array;
  private readonly emitTex: THREE.DataTexture;
  private readonly slotData: Float32Array;
  private readonly slotTex: THREE.DataTexture;
  private readonly rowOwner: (Emitter | null)[];
  private readonly freeRows: number[] = [];
  private readonly rowRanges: Range[];
  private list: Emitter[] = [];
  private listLen = 0;
  private frame = 0;
  private firstUpload = true;
  private usedSlotsPrev = 0;
  // stats
  emitters = 0;
  particles = 0;
  usedSlots = 0;
  dropped = 0;
  uploads = 0;
  scaled = 1;

  constructor(opts: FxLayerOptions) {
    this.name = opts.name;
    this.slotSize = opts.slotSize;
    this.maxEmitters = Math.max(16, Math.min(2048, opts.maxEmitters));
    this.maxSlots = Math.max(8, Math.ceil(opts.maxParticles / opts.slotSize));

    this.emitData = new Float32Array(this.maxEmitters * REC_FLOATS);
    this.emitTex = new THREE.DataTexture(this.emitData, REC_TEXELS, this.maxEmitters, THREE.RGBAFormat, THREE.FloatType);
    this.emitTex.magFilter = this.emitTex.minFilter = THREE.NearestFilter;
    this.emitTex.generateMipmaps = false;
    this.emitTex.needsUpdate = true;

    const slotRows = Math.ceil(this.maxSlots / SLOT_TEX_W);
    this.slotData = new Float32Array(SLOT_TEX_W * slotRows * 4);
    this.slotTex = new THREE.DataTexture(this.slotData, SLOT_TEX_W, slotRows, THREE.RGBAFormat, THREE.FloatType);
    this.slotTex.magFilter = this.slotTex.minFilter = THREE.NearestFilter;
    this.slotTex.generateMipmaps = false;
    this.slotTex.needsUpdate = true;

    this.rowOwner = new Array(this.maxEmitters).fill(null);
    this.rowRanges = [];
    for (let r = this.maxEmitters - 1; r >= 0; r--) this.freeRows.push(r);
    for (let r = 0; r < this.maxEmitters; r++) this.rowRanges.push({ start: r * REC_FLOATS, count: REC_FLOATS });

    const geo = new THREE.InstancedBufferGeometry();
    geo.index = opts.geometry.index;
    for (const [k, a] of Object.entries(opts.geometry.attributes)) geo.setAttribute(k, a);
    geo.instanceCount = 0;
    this.geo = geo;

    const u = opts.material.uniforms;
    u.uEmit = { value: this.emitTex };
    u.uSlots = { value: this.slotTex };
    u.uSlotSize = { value: this.slotSize };
    u.uSlotTexW = { value: SLOT_TEX_W };

    this.mesh = new THREE.Mesh(geo, opts.material);
    this.mesh.name = `fx:${opts.name}`;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = opts.renderOrder;
    this.mesh.visible = false;
    this.mesh.matrixAutoUpdate = false;
  }

  /** start collecting this frame's alive emitters */
  begin(): void {
    this.listLen = 0;
  }

  add(e: Emitter): void {
    if (e.count <= 0) return;
    if (this.listLen < this.list.length) this.list[this.listLen] = e;
    else this.list.push(e);
    this.listLen++;
  }

  /** assign rows + slots and upload what changed */
  commit(): void {
    const frame = ++this.frame;
    const list = this.list;
    const n = this.listLen;
    for (let i = 0; i < n; i++) list[i].stamp = frame;

    // free rows of emitters that died
    const owners = this.rowOwner;
    for (let r = 0; r < owners.length; r++) {
      const o = owners[r];
      if (o !== null && o.stamp !== frame) {
        if (o.row === r) o.row = -1;
        owners[r] = null;
        this.freeRows.push(r);
      }
    }

    // rows for newborn emitters
    let newRows = 0;
    this.dropped = 0;
    const ranges = this.emitTex.updateRanges;
    for (let i = 0; i < n; i++) {
      const e = list[i];
      if (e.row >= 0 && owners[e.row] === e) continue;
      const row = this.freeRows.pop();
      if (row === undefined) {
        e.row = -1;
        this.dropped++;
        continue;
      }
      e.row = row;
      owners[row] = e;
      this.emitData.set(e.f, row * REC_FLOATS);
      newRows++;
      if (!this.firstUpload) ranges.push(this.rowRanges[row]);
    }
    if (newRows > 0) {
      if (this.firstUpload || newRows > 48) ranges.length = 0; // full upload
      this.firstUpload = false;
      this.emitTex.needsUpdate = true;
      this.uploads++;
    }

    // slots
    const S = this.slotSize;
    let need = 0;
    let most = 0;
    let alive = 0;
    for (let i = 0; i < n; i++) {
      if (list[i].row < 0) continue;
      const w = Math.ceil(list[i].count / S);
      need += w;
      if (w > most) most = w;
      alive++;
    }
    // over budget: water-filling instead of a uniform scale — every emitter may keep up to `cap`
    // slots, so small ones (a pillar-top fan, a flare) stay complete and only the biggest (a 60-unit
    // fountain wall) thin out
    let cap = most;
    if (need > this.maxSlots) {
      let lo = 1,
        hi = most;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        let sum = 0;
        for (let i = 0; i < n; i++) if (list[i].row >= 0) sum += Math.min(mid, Math.ceil(list[i].count / S));
        if (sum <= this.maxSlots) lo = mid;
        else hi = mid - 1;
      }
      cap = Math.max(1, lo);
    }
    this.scaled = need > this.maxSlots ? Math.min(this.maxSlots, alive * cap) / need : 1;
    let slot = 0;
    let dirty = false;
    let particles = 0;
    let emitters = 0;
    const sd = this.slotData;
    for (let i = 0; i < n && slot < this.maxSlots; i++) {
      const e = list[i];
      if (e.row < 0) continue;
      const eff = Math.min(e.count, cap * S);
      const slots = Math.ceil(eff / S);
      emitters++;
      particles += eff;
      for (let s = 0; s < slots && slot < this.maxSlots; s++, slot++) {
        const o = slot * 4;
        const off = s * S;
        if (sd[o] !== e.row || sd[o + 1] !== off || sd[o + 2] !== eff) {
          sd[o] = e.row;
          sd[o + 1] = off;
          sd[o + 2] = eff;
          dirty = true;
        }
      }
    }
    if (dirty || slot !== this.usedSlotsPrev) {
      if (dirty) {
        this.slotTex.needsUpdate = true;
        this.uploads++;
      }
      this.usedSlotsPrev = slot;
    }
    this.usedSlots = slot;
    this.emitters = emitters;
    this.particles = particles;
    this.geo.instanceCount = slot * S;
    this.mesh.visible = slot > 0;
  }

  /** forget all rows (e.g. when the emitter caches were rebuilt) */
  reset(): void {
    for (let r = 0; r < this.rowOwner.length; r++) {
      const o = this.rowOwner[r];
      if (o && o.row === r) o.row = -1;
      this.rowOwner[r] = null;
    }
    this.freeRows.length = 0;
    for (let r = this.maxEmitters - 1; r >= 0; r--) this.freeRows.push(r);
    this.listLen = 0;
  }

  dispose(): void {
    this.geo.dispose();
    this.emitTex.dispose();
    this.slotTex.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}

/** Ribbon strip (trail samples + round caps) used by spark layers. Vertex x = sample index, y = side. */
export function ribbonGeometry(segments: number): THREE.BufferGeometry {
  const pairs = segments + 3; // front cap, M+1 samples, back cap
  const pos = new Float32Array(pairs * 2 * 3);
  for (let j = 0; j < pairs; j++) {
    pos[(j * 2) * 3] = j;
    pos[(j * 2) * 3 + 1] = -1;
    pos[(j * 2 + 1) * 3] = j;
    pos[(j * 2 + 1) * 3 + 1] = 1;
  }
  const idx: number[] = [];
  for (let j = 0; j < pairs - 1; j++) {
    const a = j * 2,
      b = j * 2 + 1,
      c = j * 2 + 2,
      d = j * 2 + 3;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/** Unit quad (-1..1) for billboards. */
export function quadGeometry(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}
