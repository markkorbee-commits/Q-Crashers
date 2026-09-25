import * as THREE from 'three';
import type { App } from '../core/App';
import type { Collider2D, NamedSpot } from '../core/types';

/** First aid (EHBO "RED stage" post, air-conditioned heat post), design bible §6.5 (FACT, floorplan) */
const FIRST_AID_FALLBACK = { x: 116.7, z: 122.7 };
/** point the first-aid entrance faces (world props face the tent towards the field) */
const FIELD_POINT = { x: 60, z: 110 };
/** cooling reach of a water / misting point (m) */
const MIST_RADIUS = 7;
/** reach of the first-aid heat post (m from its centre) */
const FIRST_AID_RADIUS = 11;

type HeightProvider = { heightAt(x: number, z: number): number };

/**
 * Harm-reduction facilities the perception simulation uses: free water points (heat protocol 2026: free
 * water at every water point and toilet block), the misting / shade at those points and the first-aid
 * heat post. Positions come from the world's colliders (tags 'water', 'toilets', 'firstaid'), so they
 * always match the props; the bible position is the fallback for first aid.
 */
export class Facilities {
  readonly water: { x: number; z: number }[] = [];
  readonly firstAid = { x: FIRST_AID_FALLBACK.x, z: FIRST_AID_FALLBACK.z };
  /** where a helper brings you: in front of the first-aid entrance, facing it */
  readonly firstAidSpot: NamedSpot = { id: 'firstaid', label: 'First aid (EHBO heat post)', position: new THREE.Vector3(), yaw: 0 };
  registered = false;

  /**
   * Find the facilities and register "free water" / "first aid" interactables. Returns false when the
   * world has not registered its colliders yet (retry later).
   */
  register(app: App, onWater: () => void, onFirstAid: () => void): boolean {
    if (this.registered) return true;
    const cols = app.colliders;
    let fa: Collider2D | null = null;
    const toilets: Collider2D[] = [];
    for (const c of cols) {
      if (c.tag === 'water' && c.kind === 'circle') this.water.push({ x: c.x, z: c.z });
      else if (c.tag === 'firstaid') fa = c;
      else if (c.tag === 'toilets' && c.kind === 'box') toilets.push(c);
    }
    if (!this.water.length && !fa) return false;
    if (fa) {
      if (fa.kind === 'box') {
        this.firstAid.x = (fa.minX + fa.maxX) / 2;
        this.firstAid.z = (fa.minZ + fa.maxZ) / 2;
      } else {
        this.firstAid.x = fa.x;
        this.firstAid.z = fa.z;
      }
    }
    // free water at the toilet blocks too (on the face towards the field), unless a tap stands nearby
    for (const t of toilets) {
      if (t.kind !== 'box') continue;
      const px = Math.min(t.maxX, Math.max(t.minX, 0));
      const pz = Math.min(t.maxZ, Math.max(t.minZ, 100));
      const cx = (t.minX + t.maxX) / 2;
      const cz = (t.minZ + t.maxZ) / 2;
      // push the point 1 m outside the box, away from its centre
      const dx = px - cx;
      const dz = pz - cz;
      const ex = Math.abs(dx) / Math.max(1e-3, (t.maxX - t.minX) / 2);
      const ez = Math.abs(dz) / Math.max(1e-3, (t.maxZ - t.minZ) / 2);
      const x = ex >= ez ? px + Math.sign(dx || 1) * 1 : px;
      const z = ex >= ez ? pz : pz + Math.sign(dz || 1) * 1;
      if (this.water.some((w) => Math.hypot(w.x - x, w.z - z) < 14)) continue;
      this.water.push({ x, z });
    }

    const terrain = app.get('terrain') as unknown as Partial<HeightProvider> | undefined;
    const ground = (x: number, z: number): number => {
      const h = typeof terrain?.heightAt === 'function' ? terrain.heightAt(x, z) : 0;
      return Number.isFinite(h) ? h : 0;
    };
    // labels avoid the words the ambience system uses to find bars (bar / drink / beer / tap)
    this.water.forEach((w, i) => {
      app.addInteractable({ id: `water_${i}`, position: new THREE.Vector3(w.x, ground(w.x, w.z) + 1.1, w.z), radius: 3.4, label: 'Free water (sip a cup)', onInteract: onWater });
    });
    const f = this.firstAid;
    app.addInteractable({ id: 'firstaid', position: new THREE.Vector3(f.x, ground(f.x, f.z) + 1.2, f.z), radius: 9, label: 'First aid: rest and cool down', onInteract: onFirstAid });

    const dx = FIELD_POINT.x - f.x;
    const dz = FIELD_POINT.z - f.z;
    const d = Math.hypot(dx, dz) || 1;
    const sx = f.x + (dx / d) * 9.5;
    const sz = f.z + (dz / d) * 9.5;
    this.firstAidSpot.position.set(sx, ground(sx, sz), sz);
    // yaw 0 faces -Z; facing direction = (-sin yaw, -cos yaw) -> look back at the tent
    this.firstAidSpot.yaw = Math.atan2(dx / d, dz / d);
    this.registered = true;
    return true;
  }

  /** 0..1 cooling from misting / shade at a water point */
  mistAt(x: number, z: number): number {
    let best = 0;
    for (const w of this.water) {
      const d = Math.hypot(w.x - x, w.z - z);
      if (d < MIST_RADIUS) best = Math.max(best, 1 - (d / MIST_RADIUS) * (d / MIST_RADIUS));
    }
    return best;
  }

  /** distance to the first-aid post (m) */
  firstAidDistance(x: number, z: number): number {
    return Math.hypot(this.firstAid.x - x, this.firstAid.z - z);
  }

  nearFirstAid(x: number, z: number): boolean {
    return this.firstAidDistance(x, z) < FIRST_AID_RADIUS;
  }
}
