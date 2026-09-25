import * as THREE from 'three';
import { clamp } from '../core/rng';
import type { Drink, Vessel } from './drinks';
import { matcapTexture } from './BarTextures';

/**
 * The drink in your hand: a small model parented to the camera (bottom-right of the view) with
 * appear / sip / finish animations. Matcap shading keeps it readable in the dusk scene without
 * adding real lights. All objects are created once; switching drinks only swaps visibility,
 * colours and scales (no per-frame allocation).
 */
type Phase = 'none' | 'appear' | 'idle' | 'sip' | 'finish';

const SIP_DUR = 1.7;
const APPEAR_DUR = 0.75;
const FINISH_DUR = 0.7;

function lathe(points: [number, number][], seg = 28): THREE.LatheGeometry {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

export class HeldDrink {
  readonly root = new THREE.Group();
  private tilt = new THREE.Group();
  private hand = new THREE.Group();
  private models = new Map<Vessel, THREE.Group>();
  private liquid!: THREE.Mesh;
  private liquidByVessel = new Map<Vessel, THREE.Mesh>();
  private foam!: THREE.Mesh;
  private mats: THREE.MeshMatcapMaterial[] = [];
  private liquidMat: THREE.MeshMatcapMaterial;
  private phase: Phase = 'none';
  private t = 0;
  /** fill level 0..1 (animated) */
  private fill = 1;
  private fillFrom = 1;
  private fillTo = 1;
  private bob = 0;
  private lastX = 0;
  private lastZ = 0;
  drink: Drink | null = null;
  sipsLeft = 0;
  /** called when the cup reaches the mouth during a sip (apply the drink effects here) */
  onSip: ((drink: Drink, fraction: number) => void) | null = null;
  /** called once when the last sip has been taken */
  onFinished: ((drink: Drink) => void) | null = null;

  constructor(private camera: THREE.PerspectiveCamera) {
    const matcap = matcapTexture();
    const mk = (hex: string, opts: THREE.MeshMatcapMaterialParameters = {}) => {
      const m = new THREE.MeshMatcapMaterial({ matcap, color: hex, fog: false, ...opts });
      this.mats.push(m);
      return m;
    };
    this.liquidMat = mk('#f2b632');
    const redCup = mk('#d4121f', { side: THREE.DoubleSide });
    const clearCup = mk('#e9f2f8', { transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
    const bottleMat = mk('#cfe9ff', { transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
    const capMat = mk('#1a5fd0');
    const canMat = mk('#d8dde3');
    const canBand = mk('#1a1a1e');
    const shotMat = mk('#f4f8fb', { transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    const foamMat = mk('#fff6e6');

    // 25 cl festival cup (~12 cm tall)
    const cupProfile: [number, number][] = [
      [0, 0],
      [0.029, 0],
      [0.031, 0.004],
      [0.042, 0.118],
      [0.0445, 0.121],
      [0.0415, 0.121],
      [0.0295, 0.006],
      [0, 0.006],
    ];
    const cupGeo = lathe(cupProfile);
    const liquidGeo = lathe([
      [0, 0.006],
      [0.029, 0.006],
      [0.0402, 0.108],
      [0, 0.108],
    ]);
    liquidGeo.translate(0, -0.006, 0);
    liquidGeo.scale(1, 1 / 0.102, 1); // unit height -> scale.y = fill height

    const red = new THREE.Group();
    red.add(new THREE.Mesh(cupGeo, redCup));
    // printed white ring on the cup
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0392, 0.0368, 0.012, 28, 1, true), mk('#ffffff', { side: THREE.DoubleSide }));
    ring.position.y = 0.09;
    red.add(ring);
    this.models.set('redcup', red);

    const clear = new THREE.Group();
    clear.add(new THREE.Mesh(cupGeo, clearCup));
    const ice = mk('#ffffff', { transparent: true, opacity: 0.6 });
    for (let i = 0; i < 4; i++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.018), ice);
      cube.position.set(Math.cos(i * 1.7) * 0.016, 0.085 + (i % 2) * 0.008, Math.sin(i * 1.7) * 0.016);
      cube.rotation.set(i, i * 0.7, 0.3);
      clear.add(cube);
    }
    this.models.set('clearcup', clear);

    const bottle = new THREE.Group();
    const bottleGeo = lathe([
      [0, 0],
      [0.031, 0],
      [0.033, 0.01],
      [0.033, 0.15],
      [0.024, 0.18],
      [0.014, 0.195],
      [0.014, 0.205],
      [0, 0.205],
    ]);
    bottle.add(new THREE.Mesh(bottleGeo, bottleMat));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.02, 16), capMat);
    cap.position.y = 0.214;
    bottle.add(cap);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0335, 0.05, 24, 1, true), mk('#1a5fd0', { side: THREE.DoubleSide }));
    label.position.y = 0.08;
    bottle.add(label);
    this.models.set('bottle', bottle);

    const can = new THREE.Group();
    const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.115, 24), canMat);
    canBody.position.y = 0.0575;
    can.add(canBody);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0293, 0.0293, 0.06, 24, 1, true), canBand);
    band.position.y = 0.055;
    can.add(band);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.0296, 0.0296, 0.012, 24, 1, true), mk('#e10600'));
    stripe.position.y = 0.06;
    can.add(stripe);
    this.models.set('can', can);

    const shot = new THREE.Group();
    shot.add(
      new THREE.Mesh(
        lathe([
          [0, 0],
          [0.021, 0],
          [0.027, 0.058],
          [0.029, 0.06],
          [0.025, 0.06],
          [0.019, 0.012],
          [0, 0.012],
        ]),
        shotMat,
      ),
    );
    this.models.set('shotglass', shot);

    // liquids per vessel (share the liquid material)
    this.liquid = new THREE.Mesh(liquidGeo, this.liquidMat);
    this.liquid.position.y = 0.006;
    red.add(this.liquid);
    this.liquidByVessel.set('redcup', this.liquid);
    const clearLiquid = new THREE.Mesh(liquidGeo, this.liquidMat);
    clearLiquid.position.y = 0.006;
    clear.add(clearLiquid);
    this.liquidByVessel.set('clearcup', clearLiquid);
    const bottleLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 20).translate(0, 0.5, 0), this.liquidMat);
    bottleLiquid.position.y = 0.004;
    bottle.add(bottleLiquid);
    this.liquidByVessel.set('bottle', bottleLiquid);
    const shotLiquid = new THREE.Mesh(
      lathe([
        [0, 0],
        [0.019, 0],
        [0.024, 0.042],
        [0, 0.042],
      ]).scale(1, 1 / 0.042, 1),
      this.liquidMat,
    );
    shotLiquid.position.y = 0.012;
    shot.add(shotLiquid);
    this.liquidByVessel.set('shotglass', shotLiquid);

    this.foam = new THREE.Mesh(new THREE.CylinderGeometry(0.0405, 0.039, 0.012, 24), foamMat);
    red.add(this.foam);

    for (const g of this.models.values()) {
      g.visible = false;
      this.tilt.add(g);
    }
    // the hand holding it: four fingers curled round the front of the vessel, the thumb on the
    // near side, palm behind, forearm leaving the frame to the lower right
    const skin = mk('#c3906f');
    const sleeve = mk('#15151a');
    const hand = this.hand;
    /** capsule from point a along direction d (length len) */
    const limb = (r: number, len: number, a: THREE.Vector3, d: THREE.Vector3, m: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m);
      const dir = d.clone().normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      mesh.position.copy(a).addScaledVector(dir, len / 2);
      hand.add(mesh);
      return mesh;
    };
    // fingers: arcs round the far side of the vessel, starting at the palm (+x)
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.TorusGeometry(0.047 - i * 0.001, 0.0098 - i * 0.0007, 8, 16, 2.25 - i * 0.12), skin);
      f.rotation.set(-Math.PI / 2, 0, -0.3);
      f.position.y = 0.086 - i * 0.021;
      hand.add(f);
    }
    // thumb across the near side, palm on the right, wrist and sleeve out of frame (lower right)
    limb(0.0105, 0.034, new THREE.Vector3(0.045, 0.094, 0.03), new THREE.Vector3(-1, 0.05, 0.55), skin);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.09, 0.066), skin);
    palm.position.set(0.052, 0.05, -0.004);
    hand.add(palm);
    limb(0.027, 0.07, new THREE.Vector3(0.06, 0.03, 0.0), new THREE.Vector3(0.7, -0.75, 0.45), skin);
    limb(0.037, 0.32, new THREE.Vector3(0.1, -0.015, 0.03), new THREE.Vector3(0.7, -0.75, 0.45), sleeve);
    this.tilt.add(hand);
    this.root.add(this.tilt);
    this.root.visible = false;
    this.root.renderOrder = 10;
    this.root.traverse((o) => {
      o.frustumCulled = false;
      o.renderOrder = 10;
    });
    camera.add(this.root);
  }

  get holding(): boolean {
    return this.drink !== null && this.phase !== 'finish';
  }

  get busy(): boolean {
    return this.phase === 'sip' || this.phase === 'appear' || this.phase === 'finish';
  }

  /** put a fresh drink in the hand (replaces any current one) */
  give(drink: Drink): void {
    this.queued = false;
    this.drink = drink;
    this.sipsLeft = drink.sips;
    this.fill = this.fillFrom = this.fillTo = drink.vessel === 'can' ? 1 : 0.92;
    for (const [v, g] of this.models) g.visible = v === drink.vessel;
    // grip size follows the vessel (cup ≈ 4 cm radius, can / bottle ≈ 3 cm, shot glass 2.5 cm)
    const r = drink.vessel === 'can' ? 0.031 : drink.vessel === 'bottle' ? 0.035 : drink.vessel === 'shotglass' ? 0.027 : 0.04;
    const s = r / 0.04;
    this.hand.scale.set(s, drink.vessel === 'shotglass' ? 0.55 : 1, s);
    this.liquidMat.color.set(drink.liquid);
    this.foam.visible = !!drink.foam;
    const liq = this.liquidByVessel.get(drink.vessel);
    if (liq) liq.visible = true;
    this.phase = 'appear';
    this.t = 0;
  }

  /** a sip requested while the hand was busy (played as soon as it is free) */
  private queued = false;

  /** start a sip (queued while the cup is still coming up); returns false when there is nothing to drink */
  sip(): boolean {
    if (!this.drink || this.phase === 'finish' || this.phase === 'none' || this.sipsLeft <= 0) return false;
    if (this.phase !== 'idle') {
      this.queued = this.phase === 'appear' || (this.phase === 'sip' && this.sipsLeft > 1);
      return this.queued;
    }
    this.queued = false;
    this.phase = 'sip';
    this.t = 0;
    this.fillFrom = this.fill;
    this.fillTo = this.sipsLeft <= 1 ? 0 : this.fill - this.fill / this.sipsLeft;
    return true;
  }

  /** drop the drink (no effect applied) */
  discard(): void {
    if (!this.drink) return;
    this.phase = 'finish';
    this.t = 0;
  }

  update(dt: number, visible: boolean, playerX: number, playerZ: number): void {
    if (this.phase === 'none' || !this.drink) {
      this.root.visible = false;
      return;
    }
    this.root.visible = visible;
    this.t += dt;

    // hand placement adapts to the aspect ratio (portrait phones have a narrow view)
    const cam = this.camera;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5)) * 0.42;
    const halfW = halfH * cam.aspect;
    // low in the frame, well right of centre: clear of the (centred) interaction prompt and the
    // view; portrait phones keep it above the thumb buttons
    const restX = Math.min(0.24, halfW * 0.68);
    const restY = -halfH * (cam.aspect < 1 ? 0.4 : 0.74);

    // walking bob
    const dx = playerX - this.lastX,
      dz = playerZ - this.lastZ;
    this.lastX = playerX;
    this.lastZ = playerZ;
    const speed = dt > 0 ? Math.min(6, Math.hypot(dx, dz) / dt) : 0;
    this.bob += dt * (2 + speed * 2.2);
    const bobA = Math.min(1, speed / 3) * 0.008;

    let x = restX,
      y = restY + Math.sin(this.bob * 2) * bobA,
      z = -0.42,
      rx = 0.12,
      rz = -0.08;
    const ease = (u: number) => u * u * (3 - 2 * u);

    if (this.phase === 'appear') {
      const u = clamp(this.t / APPEAR_DUR, 0, 1);
      const e = 1 - Math.pow(1 - u, 3);
      y = restY - 0.35 * (1 - e) + Math.sin(u * Math.PI) * 0.015;
      rz = -0.08 - 0.4 * (1 - e);
      if (u >= 1) {
        this.phase = 'idle';
        if (this.queued) this.sip();
      }
    } else if (this.phase === 'sip') {
      const u = this.t / SIP_DUR;
      // raise (0-0.35), drink (0.35-0.72), lower (0.72-1)
      const up = u < 0.35 ? ease(u / 0.35) : u < 0.72 ? 1 : ease(1 - (u - 0.72) / 0.28);
      x = restX + (0.015 - restX) * up;
      y = restY + (-0.1 - restY) * up;
      z = -0.42 + 0.14 * up;
      rx = 0.12 + (this.drink.vessel === 'shotglass' ? 1.5 : 1.15) * up;
      rz = -0.08 * (1 - up);
      const du = clamp((u - 0.35) / 0.37, 0, 1);
      if (du > 0 && this.fill > this.fillTo) {
        const before = this.fill;
        this.fill = this.fillFrom + (this.fillTo - this.fillFrom) * ease(du);
        if (du >= 1 || this.fill <= this.fillTo) this.fill = this.fillTo;
        if (before > this.fillTo && this.fill === this.fillTo) {
          this.sipsLeft--;
          this.onSip?.(this.drink, 1 / this.drink.sips);
          if (this.sipsLeft === 0) this.onFinished?.(this.drink);
        }
      }
      if (u >= 1) {
        this.phase = this.sipsLeft > 0 ? 'idle' : 'finish';
        if (this.phase === 'finish') this.t = 0;
        else if (this.queued) this.sip();
      }
    } else if (this.phase === 'finish') {
      const u = clamp(this.t / FINISH_DUR, 0, 1);
      const e = ease(u);
      y = restY - 0.4 * e;
      x = restX + 0.08 * e;
      rz = -0.08 - 0.6 * e;
      if (u >= 1) {
        this.drink = null;
        this.phase = 'none';
        this.root.visible = false;
        return;
      }
    }

    this.root.position.set(x, y, z);
    this.tilt.rotation.set(rx, -0.25, rz);
    const liq = this.liquidByVessel.get(this.drink.vessel);
    const vesselH = this.drink.vessel === 'bottle' ? 0.19 : this.drink.vessel === 'shotglass' ? 0.042 : 0.102;
    if (liq) {
      liq.visible = this.fill > 0.01 && this.drink.vessel !== 'can';
      liq.scale.y = Math.max(0.001, this.fill * vesselH);
      if (this.drink.vessel === 'redcup' || this.drink.vessel === 'clearcup') {
        // keep the liquid surface inside the tapered wall at any fill level
        const s = (0.029 + (0.0402 - 0.029) * this.fill) / 0.0402;
        liq.scale.x = liq.scale.z = s;
      }
    }
    if (this.drink.foam) {
      this.foam.visible = this.fill > 0.04;
      this.foam.position.y = 0.006 + this.fill * vesselH + 0.004;
      const r = 0.029 + (0.0402 - 0.029) * this.fill;
      const s = r / 0.0405;
      this.foam.scale.set(s, 1, s);
    }
  }

  dispose(): void {
    this.camera.remove(this.root);
    this.root.traverse((o) => {
      if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
    });
    for (const m of this.mats) {
      m.matcap?.dispose();
      m.dispose();
    }
  }
}
