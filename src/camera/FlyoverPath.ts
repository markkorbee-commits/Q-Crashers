import * as THREE from 'three';
import type { Anchors } from '../core/Anchors';
import { clamp, smoothstep } from '../core/rng';
import { wrapAngle } from '../player/motion';

/** Key of the fly-over: a camera position, the point it looks at and the cruise speed there. */
interface Key {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  /** m/s (relative; the whole loop is rescaled to `duration`) */
  speed: number;
}

const SAMPLES = 720;

/**
 * Cinematic looping fly-over (closed centripetal Catmull-Rom through anchor-derived keys):
 * high behind the field at dusk -> glide over the crowd -> rise past the dragon head -> wide circle
 * in front of the stage -> swoop past the delay towers and FOH -> high and wide -> loop.
 * A time table built from a per-key speed profile gives slow, majestic passes near the dragon and
 * faster transits; banking follows the horizontal curvature. Evaluation is allocation free.
 */
export class FlyoverPath {
  /** seconds per loop */
  duration = 88;
  private path!: THREE.CatmullRomCurve3;
  private look!: THREE.CatmullRomCurve3;
  private tAt = new Float32Array(SAMPLES + 1);
  private timeAt = new Float32Array(SAMPLES + 1);
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();
  private head = new THREE.Vector3(0, 28, -5);

  /** (re)build from the current anchor layout */
  build(anchors: Anchors, duration = 88): void {
    this.duration = duration;
    const first = (name: Parameters<Anchors['get']>[0], fb: THREE.Vector3) => anchors.get(name)[0] ?? fb;
    const head = first('dragon_head', new THREE.Vector3(0, 28, -5));
    this.head.copy(head);
    const foh = first('foh', new THREE.Vector3(0, 8, 110));
    const roofY = Math.max(20, ...anchors.get('roof').map((p) => p.y), head.y + 8);
    const delays = anchors.get('delay_towers');
    const near = delays.filter((p) => p.x > 0).sort((p, q) => p.z - q.z)[0] ?? new THREE.Vector3(30, 14, 95);
    const far = delays.filter((p) => p.x < 0).sort((p, q) => q.z - p.z)[0] ?? new THREE.Vector3(-40, 14, 170);
    const fieldEnd = Math.max(170, ...[...delays, ...anchors.get('pillars_base')].map((p) => p.z)) + 30;
    const wing = Math.max(80, ...anchors.get('wing_tips').map((p) => Math.abs(p.x)));
    const stage = new THREE.Vector3(0, head.y * 0.6, head.z - 3);
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    const keys: Key[] = [
      // start high behind the audience field, the whole stage glowing at the far end
      { pos: v(14, 66, fieldEnd + 118), look: stage.clone(), speed: 12 },
      { pos: v(-4, 40, fieldEnd), look: v(0, stage.y, stage.z), speed: 14 },
      // glide over the crowd, past the FOH
      { pos: v(foh.x + 9, foh.y + 9, foh.z + 18), look: v(0, stage.y * 0.9, 0), speed: 11 },
      { pos: v(4, 12, 58), look: v(0, head.y * 0.8, head.z), speed: 9 },
      { pos: v(-3, head.y * 0.55, 20), look: head.clone(), speed: 6.5 },
      // rise past the dragon head
      { pos: v(head.x - 9, head.y + 1, head.z + 15), look: head.clone(), speed: 5 },
      { pos: v(head.x + 12, roofY + 10, head.z + 24), look: v(head.x, head.y - 2, head.z), speed: 7 },
      // circle wide in front of the stage
      { pos: v(wing * 0.55, roofY + 4, 58), look: v(0, stage.y, stage.z), speed: 11 },
      { pos: v(near.x + 12, near.y + 5, near.z + 4), look: v(near.x * 0.2, stage.y, 0), speed: 11 },
      // swoop past the delay tower and the FOH
      { pos: v(foh.x + 7, foh.y + 3.5, foh.z + 12), look: v(0, stage.y * 0.8, -5), speed: 10 },
      { pos: v(far.x + 8, far.y + 4, far.z - 4), look: v(0, stage.y, 10), speed: 12 },
      // end high and wide, then a slow sweeping turn far behind the field back to the start
      { pos: v(-wing * 0.7, 58, fieldEnd + 40), look: v(0, stage.y + 6, 0), speed: 15 },
      { pos: v(-wing * 0.62, 76, fieldEnd + 135), look: v(0, stage.y + 4, stage.z), speed: 12 },
      { pos: v(-18, 80, fieldEnd + 178), look: v(0, stage.y, stage.z), speed: 9 },
    ];
    this.path = new THREE.CatmullRomCurve3(keys.map((k) => k.pos), true, 'centripetal');
    this.look = new THREE.CatmullRomCurve3(keys.map((k) => k.look), true, 'catmullrom', 0.5);

    // time table: dt = ds / v(t), v interpolated smoothly between keys
    const n = keys.length;
    let time = 0;
    this.path.getPoint(0, this.a);
    this.tAt[0] = 0;
    this.timeAt[0] = 0;
    for (let i = 1; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      this.path.getPoint(t, this.b);
      const ds = this.a.distanceTo(this.b);
      const f = t * n;
      const k0 = Math.floor(f) % n;
      const k1 = (k0 + 1) % n;
      const w = 0.5 - 0.5 * Math.cos((f - Math.floor(f)) * Math.PI);
      const speed = keys[k0].speed + (keys[k1].speed - keys[k0].speed) * w;
      time += ds / speed;
      this.tAt[i] = t;
      this.timeAt[i] = time;
      this.a.copy(this.b);
    }
    const scale = duration / time;
    for (let i = 0; i <= SAMPLES; i++) this.timeAt[i] *= scale;
  }

  /** focal length feel: long lens far out over the field, wide when brushing past the dragon */
  fovAt(pos: THREE.Vector3): number {
    return 46 + 18 * (1 - smoothstep(35, 260, pos.distanceTo(this.head)));
  }

  get ready(): boolean {
    return !!this.path;
  }

  /** curve parameter (0..1) at loop time `time` (seconds, wraps) */
  paramAt(time: number): number {
    const d = this.duration;
    const tt = ((time % d) + d) % d;
    let lo = 0,
      hi = SAMPLES;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.timeAt[mid] <= tt) lo = mid;
      else hi = mid;
    }
    const span = this.timeAt[hi] - this.timeAt[lo];
    const f = span > 0 ? (tt - this.timeAt[lo]) / span : 0;
    return this.tAt[lo] + (this.tAt[hi] - this.tAt[lo]) * f;
  }

  /**
   * Camera pose at loop time `time`: writes position and look target, returns the bank (roll)
   * angle in radians, leaning into turns like a drone / helicopter.
   */
  sample(time: number, outPos: THREE.Vector3, outLook: THREE.Vector3): number {
    const t = this.paramAt(time);
    this.path.getPoint(t, outPos);
    // look target slightly ahead in time so the camera anticipates the next key
    const ta = this.paramAt(time + 1.2);
    this.look.getPoint(ta, outLook);
    // blend in a little of the travel direction for a natural "flying" feel
    this.path.getPoint(this.paramAt(time + 2), this.a);
    outLook.lerp(this.a, 0.12);

    // bank: lateral acceleration from horizontal heading change over +-0.5 s
    this.path.getPoint(this.paramAt(time - 0.5), this.a);
    this.path.getPoint(this.paramAt(time + 0.5), this.b);
    const h0 = Math.atan2(outPos.x - this.a.x, outPos.z - this.a.z);
    const h1 = Math.atan2(this.b.x - outPos.x, this.b.z - outPos.z);
    const speed = this.a.distanceTo(this.b); // m per second (1 s window)
    const turnRate = wrapAngle(h1 - h0) / 0.5; // rad/s
    // a bank only reads as a bank when looking along the travel direction
    const vx = outLook.x - outPos.x,
      vz = outLook.z - outPos.z;
    const tx = this.b.x - this.a.x,
      tz = this.b.z - this.a.z;
    const align = clamp((vx * tx + vz * tz) / (Math.hypot(vx, vz) * Math.hypot(tx, tz) + 1e-6), 0, 1);
    return clamp((turnRate * speed * 0.7) / 9.81, -0.14, 0.14) * align;
  }
}
