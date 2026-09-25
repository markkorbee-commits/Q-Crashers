import * as THREE from 'three';
import type { App } from '../core/App';
import type { FrameContext, QualitySettings, System } from '../core/types';
import { ALCOHOL_TIERS } from '../intoxication/education';
import { BARS, type BarDef } from './bars';
import { barToWorld, buildBars, CUSTOMER_Z, COUNTER_FRONT_Z, BAR_DEPTH, type BuiltBars } from './BarBuilder';
import { fontsReady } from './BarTextures';
import { drinkById, eur, START_CREDIT, TOPUP_EUR, type Drink } from './drinks';
import { HeldDrink } from './HeldDrink';

export interface OrderResult {
  ok: boolean;
  message: string;
  drink?: Drink;
}

/** methods a hydration-aware perception system may expose (checked with 'in') */
const HYDRATION_METHODS = ['addWater', 'drinkWater', 'hydrate'] as const;

/**
 * Festival bars: 3D structures (data from bars.ts), colliders, "Order a drink" interactables,
 * named spots, a cashless bracelet wallet and the drink in your hand. The ordering menu itself lives in the
 * UI (src/ui/BarMenu.ts), opened through the 'bar:open' event.
 */
export class BarSystem implements System {
  readonly name = 'bar';
  private app!: App;
  private enabled = true;
  private built: BuiltBars | null = null;
  held!: HeldDrink;
  /** euro credit on the cashless bracelet (simulated; no real money) */
  credit = START_CREDIT;
  toppedUp = 0;
  served = 0;
  /** finished alcoholic drinks (for the responsible-drinking hint) */
  alcoholicFinished = 0;
  gramsConsumed = 0;
  /** bumps whenever wallet / held drink changes so the UI can refresh cheaply */
  version = 0;
  readonly bars: readonly BarDef[] = BARS;
  private tmpPos = new THREE.Vector3();
  private tmpQ = new THREE.Quaternion();
  private tmpM = new THREE.Matrix4();
  private tmpS = new THREE.Vector3(1, 1, 1);
  private up = new THREE.Vector3(0, 1, 0);
  private camRef: { mode?: string } | null | undefined = undefined;

  async init(app: App): Promise<void> {
    this.app = app;
    await fontsReady();
    // stand on the terrain (the crest bars sit on the +5.2 m side banks)
    const terrain = app.get('terrain') as { heightAt?: (x: number, z: number) => number } | undefined;
    for (const b of BARS) if (b.y === undefined) b.y = terrain?.heightAt?.(b.x, b.z) ?? 0;
    this.built = buildBars(BARS, app.quality.level === 'mobile');
    app.scene.add(this.built.group);
    for (const c of this.built.colliders) app.addCollider(c);

    const v = new THREE.Vector3();
    for (const b of BARS) {
      // interaction points spread along the counter so the prompt shows anywhere in the queue
      const W = b.width;
      const n = Math.max(1, Math.round(W / 5));
      for (let i = 0; i < n; i++) {
        const lx = -W / 2 + (W * (i + 0.5)) / n;
        barToWorld(b, lx, CUSTOMER_Z, v, 1.2);
        app.addInteractable({
          id: `bar_${b.id}_${i}`,
          position: v.clone(),
          radius: Math.max(2.4, W / n / 2 + 0.6),
          label: 'Order a drink',
          // with a drink in hand the same action takes a sip (consistent for E, touch and the player controller)
          onInteract: () => {
            if (this.holding) this.sip();
            else this.open(b.id);
          },
        });
      }
      barToWorld(b, 0, CUSTOMER_Z + 2.6, v, 0);
      app.addSpot({ id: `bar_${b.id}`, label: b.name, position: v.clone(), yaw: b.rotation, pitch: -0.05 });
    }

    this.held = new HeldDrink(app.camera);
    this.held.onSip = (d, fraction) => this.applySip(d, fraction);
    this.held.onFinished = (d) => this.finished(d);
  }

  /** open the ordering menu for a bar (UI listens to 'bar:open') */
  open(barId: string): void {
    this.app.events.emit('bar:open', { barId });
  }

  canAfford(d: Drink): boolean {
    return this.credit >= d.price - 1e-6;
  }

  /** simulated bracelet top-up (no payment involved) */
  topUp(n = TOPUP_EUR): void {
    this.credit += n;
    this.toppedUp += n;
    this.version++;
  }

  /** pay for a drink; the UI plays the pour animation and then calls serve() */
  order(drinkId: string): OrderResult {
    const d = drinkById(drinkId);
    if (!d) return { ok: false, message: 'Unknown drink' };
    if (!this.canAfford(d)) return { ok: false, message: `Not enough credit on your bracelet — ${d.name} costs ${eur(d.price)}` };
    this.credit = Math.round((this.credit - d.price) * 100) / 100;
    this.served++;
    this.version++;
    return { ok: true, message: `${d.name} ordered`, drink: d };
  }

  /** hand the drink over (appears in the first-person view) */
  serve(drinkId: string): void {
    const d = drinkById(drinkId);
    if (!d || !this.held) return;
    this.held.give(d);
    this.version++;
  }

  /** take a sip of the held drink (returns false when there is nothing to drink right now) */
  sip(): boolean {
    const ok = this.held?.sip() ?? false;
    if (ok) this.version++;
    return ok;
  }

  discard(): void {
    this.held?.discard();
    this.version++;
  }

  get holding(): Drink | null {
    return this.held?.holding ? this.held.drink : null;
  }

  get sipsLeft(): number {
    return this.held?.sipsLeft ?? 0;
  }

  /** nearest bar to a world position (for UI labels) */
  nearestBar(x: number, z: number): { bar: BarDef; dist: number } | null {
    let best: BarDef | null = null,
      bd = Infinity;
    for (const b of BARS) {
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best ? { bar: best, dist: bd } : null;
  }

  private applySip(d: Drink, fraction: number) {
    const p = this.app.get('perception') as unknown as Record<string, unknown> | undefined;
    if (d.grams > 0) {
      const g = d.grams * fraction;
      this.gramsConsumed += g;
      if (p && typeof p.addAlcohol === 'function') (p.addAlcohol as (g: number) => void).call(p, g);
    }
    if (d.hydrationMl > 0 && p) {
      for (const m of HYDRATION_METHODS) {
        if (m in p && typeof p[m] === 'function') {
          (p[m] as (ml: number) => void).call(p, d.hydrationMl * fraction);
          break;
        }
      }
    }
    this.version++;
  }

  private finished(d: Drink) {
    this.version++;
    if (d.grams <= 0) return;
    this.alcoholicFinished++;
    if (this.alcoholicFinished === 3 || (this.alcoholicFinished > 3 && this.alcoholicFinished % 3 === 0)) {
      const p = this.app.get('perception') as unknown as { bac?: number } | undefined;
      // Widmark estimate (70 kg, r = 0.68, no elimination) as a floor when the model is time-compressed
      const est = this.gramsConsumed / (70 * 0.68);
      const bac = Math.max(p?.bac ?? 0, est);
      const tiers = [...ALCOHOL_TIERS].sort((a, b) => a.bac - b.bac);
      let tier = tiers[0];
      for (const t of tiers) if (t.bac <= bac) tier = t;
      const effects = (tier?.effects ?? []).slice(0, 2).join('; ');
      this.app.events.emit('toast', {
        text: `That was alcoholic drink no. ${this.alcoholicFinished} — about ${bac.toFixed(1)} ‰ (${(tier?.label ?? 'tipsy').toLowerCase()}): ${effects.charAt(0).toLowerCase()}${effects.slice(1)}. Alternate with water — it is free at every water point.`,
        ms: 9000,
      });
    }
  }

  update(ctx: FrameContext): void {
    if (!this.built) return;
    if (this.enabled) this.animateStaff(ctx.time);
    if (this.camRef === undefined) this.camRef = (this.app.get('camera') as unknown as { mode?: string } | undefined) ?? null;
    const cam = this.camRef;
    const firstPerson = !cam || cam.mode === undefined || cam.mode === 'first';
    this.held.update(ctx.dt, firstPerson, ctx.playerPos.x, ctx.playerPos.z);
  }

  /** deterministic idle loop: serve at the counter, fetch from the fridges, come back */
  private animateStaff(time: number) {
    const built = this.built!;
    const info = built.staffInfo;
    const serveZ = COUNTER_FRONT_Z - 1.0;
    for (let i = 0; i < info.length; i++) {
      const s = info[i];
      const fridgeZ = -(s.bar.depth ?? BAR_DEPTH) / 2 + 1.25;
      const u = (((time + s.phase) % s.period) + s.period) % s.period / s.period;
      let lz = serveZ,
        yaw = 0,
        walk = 0;
      if (u < 0.5) {
        lz = serveZ;
        yaw = Math.sin(time * 0.7 + s.phase) * 0.25;
      } else if (u < 0.6) {
        const k = smooth((u - 0.5) / 0.1);
        lz = serveZ + (fridgeZ - serveZ) * k;
        yaw = Math.PI * Math.min(1, k * 2.5);
        walk = 1;
      } else if (u < 0.75) {
        lz = fridgeZ;
        yaw = Math.PI + Math.sin(time * 1.3 + s.phase) * 0.15;
      } else if (u < 0.85) {
        const k = smooth((u - 0.75) / 0.1);
        lz = fridgeZ + (serveZ - fridgeZ) * k;
        yaw = Math.PI * (1 - Math.min(1, k * 2.5));
        walk = 1;
      } else {
        lz = serveZ;
        yaw = Math.sin(time * 0.6 + s.phase) * 0.3;
      }
      const lx = s.homeX + Math.sin(time * 0.23 + s.phase * 1.7) * s.range;
      barToWorld(s.bar, lx, lz, this.tmpPos, 0.12 + (walk ? Math.abs(Math.sin(time * 9 + s.phase)) * 0.03 : 0));
      this.tmpQ.setFromAxisAngle(this.up, s.bar.rotation + yaw);
      this.tmpM.compose(this.tmpPos, this.tmpQ, this.tmpS);
      built.staff.setMatrixAt(i, this.tmpM);
    }
    built.staff.instanceMatrix.needsUpdate = true;
  }

  setQuality(_q: QualitySettings): void {}

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.built) this.built.group.visible = on;
  }

  stats(): Record<string, number | string> {
    return {
      bars: BARS.length,
      staff: this.built?.staffInfo.length ?? 0,
      bulbs: this.built?.bulbCount ?? 0,
      credit: this.credit.toFixed(2),
      served: this.served,
      holding: this.holding?.name ?? '-',
    };
  }

  dispose(): void {
    if (!this.built) return;
    this.app.scene.remove(this.built.group);
    this.built.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    for (const t of this.built.textures) t.dispose();
    for (const m of this.built.materials) m.dispose();
    this.held?.dispose();
    this.built = null;
  }
}

function smooth(u: number): number {
  const t = u < 0 ? 0 : u > 1 ? 1 : u;
  return t * t * (3 - 2 * t);
}
