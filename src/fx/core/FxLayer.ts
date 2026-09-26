import * as THREE from 'three';
import { keepCap, layerBudget, tailFloor } from './budget';
import { Emitter, F, R, REC_FLOATS, REC_TEXELS } from './Emitter';

const SLOT_TEX_W = 256;
/** slot texture capacity relative to the preset's budget (a later preset switch reuses the layer) */
const SLOT_CAPACITY = 8;
const MAX_SLOT_CAPACITY = 16384;
/**
 * Ribbon layers (additive sparks / stars) address their particles in slots of at most this many:
 * most of their emitters are small (a comet's tail, a crackle star's pops, a shell's 40 stars), and
 * every slot costs slotSize instances whatever the emitter uses of it.
 */
const RIBBON_SLOT = 16;
/**
 * The budget is counted in DRAWN particles. The instances a layer issues (slots x slotSize: the
 * partly used last slot of every emitter included) may reach SLOT_OVERDRAW x the budget, so a crowd
 * of tiny emitters (hundreds of 1-5 puff shell smokes) is drawn whole instead of being skipped.
 */
const SLOT_OVERDRAW = 2;
/** newborns may take the layer up to this share of its budget before one is left out (see commit) */
const HARD_LIMIT = 1.25;
/** trail samples every ribbon geometry is built with (a preset uses a draw range of it) */
export const MAX_RIBBON_SEGMENTS = 10;

/** budget shares a newborn emitter can get when its layer is short of particles (quantised) */
const KEEP_LEVELS = [1, 0.75, 0.5, 0.35, 0.25];
/** thinning starts when the full demand exceeds this share of the budget ... */
const PRESSURE_HI = 0.92;
/** ... and relaxes one level after the demand stayed below this share for RELAX_S seconds of show time */
const PRESSURE_LO = 0.72;
const RELAX_S = 1.5;

export interface FxLayerOptions {
  name: string;
  /** particles per slot (instanced draw granularity) */
  slotSize: number;
  /** emitter table rows */
  maxEmitters: number;
  /** instance budget (particles); the final number comes from layerBudget() (budget.ts) */
  maxParticles: number;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  renderOrder: number;
}

interface Range {
  start: number;
  count: number;
}

function gcd(a: number, b: number): number {
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/**
 * Multiplier a (coprime with n) of the index permutation p = i * a mod n with a / n close to the
 * golden ratio: every prefix i < m of it is a well spread subset of 0..n-1 (three-gap theorem), and
 * the subsets are nested. A thinned emitter draws the first `drawn` of them, so a thinned sphere
 * burst stays a sphere and a thinned continuous fountain keeps an even emission. 1 = identity
 * (tiny emitters, and n >= 65536 where i * a would overflow 32 bits in the shader).
 */
export function permMultiplier(n: number): number {
  if (n <= 3 || n >= 65536) return 1;
  const hit = permCache.get(n);
  if (hit !== undefined) return hit;
  // among the coprime candidates next to n / phi take the one whose continued fraction n / a has
  // small partial quotients (a poor rational approximation of phi clusters the prefixes): the largest
  // gap of any prefix stays below ~2.8x the even spacing
  const a0 = Math.round(n * 0.6180339887);
  let best = 1;
  let bestQ = Infinity;
  for (let d = 0; d < 24 && bestQ > 4; d++) {
    for (let s = 0; s < 2; s++) {
      const c = s === 0 ? a0 + d : a0 - d;
      if (c <= 1 || c >= n || gcd(c, n) !== 1) continue;
      const q = maxPartialQuotient(c, n);
      if (q < bestQ) {
        bestQ = q;
        best = c;
      }
    }
  }
  if (permCache.size > 4096) permCache.clear();
  permCache.set(n, best);
  return best;
}

const permCache = new Map<number, number>();

function maxPartialQuotient(a: number, n: number): number {
  let x = n,
    y = a,
    m = 0;
  while (y) {
    const q = Math.floor(x / y);
    const r = x - q * y;
    if (q > m) m = q;
    x = y;
    y = r;
  }
  return m;
}

/** show times between which an emitter's particles die out (see Emitter.tail0) */
function setTail(e: Emitter): void {
  const f = e.f;
  const flags = f[R.FLAGS];
  const t0 = f[R.T0];
  if ((flags & (F.POPS | F.CROSSETTE | F.PEARL)) !== 0) {
    // their visible part comes after the parent star's death: full weight until the emitter ends
    e.tail0 = e.tail1 = Infinity;
  } else if ((flags & F.CONTINUOUS) !== 0) {
    // every index re-spawns until the end of the emission window, the last ones live up to LIFE1
    e.tail0 = t0 + f[R.EMITDUR];
    e.tail1 = e.tail0 + f[R.LIFE1];
  } else {
    // one-shot: the first die at LIFE0, the last (staggered) at stagger * count + LIFE1
    e.tail0 = t0 + f[R.LIFE0];
    e.tail1 = t0 + f[R.STAGGER] * e.count + f[R.LIFE1];
  }
}

/**
 * Budget weight of an emitter at show time t: the share of its particles still alive (1 until they
 * start dying), never below the preset's floor (budget.ts: dead instances still cost some vertex work)
 */
function tailShare(e: Emitter, t: number): number {
  if (t <= e.tail0) return 1;
  const lo = tailFloor();
  const span = e.tail1 - e.tail0;
  if (!(span > 0.05)) return t < e.tail1 ? 1 : lo;
  return Math.max(lo, Math.min(1, (e.tail1 - t) / span));
}

/**
 * One instanced draw call of analytic particles.
 *
 * Emitter records live in a float texture (one row per alive emitter, rows are stable while the
 * emitter lives so only newly born emitters are uploaded). A second small texture maps instanced
 * "slots" (groups of `slotSize` particles) to (emitter row, first particle, particles drawn, index
 * permutation). Per frame the CPU work is O(alive emitters); nothing is simulated.
 *
 * Budget (particles actually drawn): an emitter's share (Emitter.keep) is decided on the first frame
 * it is drawn and then fixed for its whole life, so a layer over its budget never reshuffles or
 * flickers the particles that are already on screen. The share of newborn emitters follows a
 * quantised pressure level (fast attack, slow release in show time) and is lowered further only
 * when they would not fit. Small emitters (<= 2 slots) are never thinned. A newborn that does not
 * fit even at the lowest share (HARD_LIMIT x the budget, or the slot cap) is left out for its whole
 * life instead of popping in later. The shaders always derive directions, phases and timing from
 * the RECORDED count (R.COUNT); a thinned emitter draws a golden-ratio subset of its particles (see
 * permMultiplier) with a little light compensation.
 */
export class FxLayer {
  readonly mesh: THREE.Mesh;
  readonly name: string;
  /** particles per slot (ribbon layers use at most RIBBON_SLOT) */
  readonly slotSize: number;
  readonly maxEmitters: number;
  /** particle budget of the current preset (drawn particles) */
  budget: number;
  /** nominal slots of the budget (stats) */
  maxSlots: number;
  /** slots the layer may issue (instances / slotSize), <= capacity */
  slotCap: number;
  /** slots the slot texture can address */
  readonly capacity: number;
  /** additive ribbons (the draw order of their particles does not matter) */
  private readonly orderFree: boolean;
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
  private pressure = 0;
  private relax = 0;
  private jumped = false;
  // stats
  emitters = 0;
  particles = 0;
  usedSlots = 0;
  dropped = 0;
  uploads = 0;
  /** drawn / full-count particles of the alive emitters */
  scaled = 1;
  /** budget share given to newborn emitters right now */
  keepNow = 1;
  /** alive emitters left out (born when even the lowest share did not fit) */
  hidden = 0;

  constructor(opts: FxLayerOptions) {
    this.name = opts.name;
    this.orderFree = opts.geometry.userData.segments !== undefined;
    this.slotSize = this.orderFree ? Math.min(opts.slotSize, RIBBON_SLOT) : opts.slotSize;
    this.maxEmitters = Math.max(16, Math.min(2048, opts.maxEmitters));
    this.budget = Math.max(8 * this.slotSize, layerBudget(opts.name, opts.maxParticles));
    this.maxSlots = Math.ceil(this.budget / this.slotSize);
    this.capacity = Math.min(MAX_SLOT_CAPACITY, this.maxSlots * SLOT_CAPACITY);
    this.slotCap = Math.min(this.capacity, this.maxSlots * SLOT_OVERDRAW);

    this.emitData = new Float32Array(this.maxEmitters * REC_FLOATS);
    this.emitTex = new THREE.DataTexture(this.emitData, REC_TEXELS, this.maxEmitters, THREE.RGBAFormat, THREE.FloatType);
    this.emitTex.magFilter = this.emitTex.minFilter = THREE.NearestFilter;
    this.emitTex.generateMipmaps = false;
    this.emitTex.needsUpdate = true;

    const slotRows = Math.ceil(this.capacity / SLOT_TEX_W);
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
    geo.setDrawRange(opts.geometry.drawRange.start, opts.geometry.drawRange.count);
    geo.userData.segments = opts.geometry.userData.segments;
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

  /** particles an emitter draws at budget share k (small emitters stay whole: they save nothing) */
  private drawnAt(e: Emitter, k: number): number {
    const c = e.count;
    if (k >= 1) return c;
    const floor = 2 * this.slotSize;
    if (c <= floor) return c;
    return Math.max(floor, Math.round(c * k));
  }

  private setShare(e: Emitter, k: number): void {
    const cap = keepCap(e.f[R.FLAGS]);
    const kk = Math.min(k, cap);
    e.keep = kk;
    e.drawn = this.drawnAt(e, kk);
    if ((e.drawn < e.count || this.orderFree) && e.perm <= 0) e.perm = permMultiplier(e.count);
  }

  /**
   * assign rows + slots and upload what changed. `dt` = show time step of this frame (0 while
   * paused): the budget pressure relaxes in show time, so a paused frame never changes. `t` = show
   * time: emitters whose particles are dying out hold less of the budget (see tailShare).
   */
  commit(dt = 1 / 60, t = 0): void {
    const frame = ++this.frame;
    const list = this.list;
    const n = this.listLen;
    for (let i = 0; i < n; i++) list[i].stamp = frame;

    // free rows of emitters that died
    const owners = this.rowOwner;
    for (let r = 0; r < owners.length; r++) {
      const o = owners[r];
      if (o !== null && o.stamp !== frame) {
        if (o.row === r) {
          o.row = -1;
          o.keep = 0;
        }
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
        e.keep = 0;
        this.dropped++;
        continue;
      }
      e.row = row;
      e.keep = 0;
      setTail(e);
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

    // ---- budget (drawn particles): full demand, what the emitters on screen hold, newborn demand
    const S = this.slotSize;
    const B = this.budget;
    const SC = this.slotCap;
    // after a jump of the show clock the picture is new anyway: every share is decided again, so the
    // frame after a seek is the same whatever was on screen before it
    if (this.jumped) for (let i = 0; i < n; i++) list[i].keep = 0;
    // (particle demand is weighted by the share of an emitter's particles still alive: a fountain
    // wall that stopped a second ago must not keep the next, bigger wave thinned for its whole life;
    // the weight only ever falls, so the budget of a decision stays valid)
    let full = 0;
    let fixedP = 0;
    let fixedS = 0;
    let fresh = 0;
    for (let i = 0; i < n; i++) {
      const e = list[i];
      if (e.row < 0) continue;
      const w = tailShare(e, t);
      full += e.count * w;
      if (e.keep > 0) {
        fixedP += e.drawn * w;
        fixedS += Math.ceil(e.drawn / S);
      } else if (e.keep === 0) fresh++;
    }
    // quantised pressure level with hysteresis: newborns born during a dense passage all get the
    // same share, instead of the first ones taking everything and the last ones the leftovers
    let target = 0;
    while (target < KEEP_LEVELS.length - 1 && full * KEEP_LEVELS[target] > PRESSURE_HI * B) target++;
    if (this.jumped) {
      // the show clock jumped (seek): start from the pressure of the new moment
      this.jumped = false;
      this.pressure = target;
      this.relax = 0;
    } else if (target > this.pressure) {
      this.pressure = target;
      this.relax = 0;
    } else if (target < this.pressure && full * KEEP_LEVELS[this.pressure - 1] <= PRESSURE_LO * B) {
      this.relax += Math.max(0, dt);
      if (this.relax >= RELAX_S) {
        this.pressure--;
        this.relax = 0;
      }
    } else this.relax = 0;

    if (fresh > 0) {
      // the newborns' share: the pressure level, lowered while they would not fit next to the rest
      let li = this.pressure;
      for (;;) {
        const k = KEEP_LEVELS[li];
        let needP = 0;
        let needS = 0;
        for (let i = 0; i < n; i++) {
          const e = list[i];
          if (e.row < 0 || e.keep !== 0) continue;
          const d = this.drawnAt(e, Math.min(k, keepCap(e.f[R.FLAGS])));
          needP += d * tailShare(e, t);
          needS += Math.ceil(d / S);
        }
        if ((fixedP + needP <= B && fixedS + needS <= SC) || li === KEEP_LEVELS.length - 1) break;
        li++;
      }
      const k = KEEP_LEVELS[li];
      this.keepNow = k;
      const hardP = B * HARD_LIMIT;
      for (let i = 0; i < n; i++) {
        const e = list[i];
        if (e.row < 0 || e.keep !== 0) continue;
        this.setShare(e, k);
        const s = Math.ceil(e.drawn / S);
        const p = e.drawn * tailShare(e, t);
        if (fixedS + s > SC || fixedP + p > hardP) {
          // no room even at the lowest share: this one stays out for its whole life (it never pops
          // in later when an older emitter dies, and nothing on screen is re-thinned for it)
          e.keep = -1;
          e.drawn = 0;
          continue;
        }
        fixedP += p;
        fixedS += s;
      }
    } else this.keepNow = KEEP_LEVELS[this.pressure];

    // ---- slots
    let slot = 0;
    let dirty = false;
    let particles = 0;
    let emitters = 0;
    let hidden = 0;
    const sd = this.slotData;
    for (let i = 0; i < n; i++) {
      const e = list[i];
      if (e.row < 0) continue;
      const eff = e.drawn;
      const slots = Math.ceil(eff / S);
      if (slots <= 0 || slot + slots > SC) {
        hidden++;
        continue;
      }
      // additive ribbons always run through the permutation (the same set of particles whatever
      // their share); puffs blend in order and keep theirs when whole
      const pa = eff < e.count || this.orderFree ? e.perm : 1;
      emitters++;
      particles += eff;
      for (let s = 0; s < slots; s++, slot++) {
        const o = slot * 4;
        const off = s * S;
        if (sd[o] !== e.row || sd[o + 1] !== off || sd[o + 2] !== eff || sd[o + 3] !== pa) {
          sd[o] = e.row;
          sd[o + 1] = off;
          sd[o + 2] = eff;
          sd[o + 3] = pa;
          dirty = true;
        }
      }
    }
    this.hidden = hidden;
    if (dirty || slot !== this.usedSlotsPrev) {
      if (dirty) {
        this.slotTex.needsUpdate = true;
        this.uploads++;
      }
      this.usedSlotsPrev = slot;
    }
    this.scaled = full > 0 ? particles / full : 1;
    this.usedSlots = slot;
    this.emitters = emitters;
    this.particles = particles;
    this.geo.instanceCount = slot * S;
    this.mesh.visible = slot > 0;
  }

  /** the show clock jumped: the next commit takes the budget pressure of the new moment as is */
  rebase(): void {
    this.jumped = true;
  }

  /** forget all rows (e.g. when the emitter caches were rebuilt) */
  reset(): void {
    for (let r = 0; r < this.rowOwner.length; r++) {
      const o = this.rowOwner[r];
      if (o && o.row === r) {
        o.row = -1;
        o.keep = 0;
      }
      this.rowOwner[r] = null;
    }
    this.freeRows.length = 0;
    for (let r = this.maxEmitters - 1; r >= 0; r--) this.freeRows.push(r);
    this.listLen = 0;
    this.pressure = 0;
    this.relax = 0;
  }

  /**
   * Take over the budget and trail segments of a freshly built layer of the same kind (a quality
   * preset switch): this layer keeps its textures, geometry and compiled program, so the switch costs
   * no GPU allocation and no shader compile. Returns false when the other one does not fit.
   */
  adopt(o: FxLayer): boolean {
    const a = this.mesh.material as THREE.ShaderMaterial;
    const b = o.mesh.material as THREE.ShaderMaterial;
    if (o.name !== this.name || o.slotSize !== this.slotSize || o.maxEmitters !== this.maxEmitters || o.maxSlots > this.capacity) return false;
    if (a.vertexShader !== b.vertexShader || a.fragmentShader !== b.fragmentShader) return false;
    if (o.geo.index?.count !== this.geo.index?.count) return false;
    this.budget = o.budget;
    this.maxSlots = o.maxSlots;
    this.slotCap = Math.min(this.capacity, o.maxSlots * SLOT_OVERDRAW);
    this.geo.setDrawRange(o.geo.drawRange.start, o.geo.drawRange.count);
    this.geo.userData.segments = o.geo.userData.segments;
    if (a.uniforms.uSegments && b.uniforms.uSegments) a.uniforms.uSegments.value = b.uniforms.uSegments.value;
    this.mesh.renderOrder = o.mesh.renderOrder;
    return true;
  }

  dispose(): void {
    this.geo.dispose();
    this.emitTex.dispose();
    this.slotTex.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}

/**
 * Ribbon strip (trail samples + round caps) used by spark layers. Vertex x = sample index, y = side.
 * Built with MAX_RIBBON_SEGMENTS samples; the draw range selects `segments` of them (the shader's
 * uSegments must match), so a preset switch only changes the range.
 */
export function ribbonGeometry(segments: number): THREE.BufferGeometry {
  const seg = Math.max(1, Math.min(MAX_RIBBON_SEGMENTS, Math.round(segments)));
  const pairs = MAX_RIBBON_SEGMENTS + 3; // front cap, M+1 samples, back cap
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
  // quads 0 .. seg+1 (vertex pairs 0 .. seg+2): front cap, the samples, back cap at j = seg + 2
  g.setDrawRange(0, (seg + 2) * 6);
  g.userData.segments = seg;
  return g;
}

/** Unit quad (-1..1) for billboards. */
export function quadGeometry(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}
