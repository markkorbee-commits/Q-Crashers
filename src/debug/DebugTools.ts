import * as THREE from 'three';
import type { App } from '../core/App';
import { debugState } from './debugState';

/**
 * World-space developer tools: measuring tape (two clicks on the ground plane), 10 m / 50 m grid,
 * live coordinates, a 1.80 m reference pole next to the player and stage dimensions.
 * Everything is created lazily and removed from the scene when switched off.
 */
export type ToolId = 'measure' | 'grid' | 'coords' | 'pole' | 'stage';

export class DebugTools {
  readonly active = new Set<ToolId>();
  private group = new THREE.Group();
  private ray = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private ndc = new THREE.Vector2();
  private hit = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private mouse = { x: 0, y: 0, inside: false };
  // measure
  private points: THREE.Vector3[] = [];
  private markers: THREE.Mesh[] = [];
  private line: THREE.Line | null = null;
  private measureLabel: HTMLElement;
  private mid = new THREE.Vector3();
  // grid
  private grid: THREE.Group | null = null;
  // coords
  private coordLabel: HTMLElement;
  private cross: HTMLElement;
  // pole
  private pole: THREE.Group | null = null;
  private poleLabel: HTMLElement;
  private poleTop = new THREE.Vector3();
  // stage
  private stageHelper: THREE.Box3Helper | null = null;
  private stageLabel: HTMLElement;
  private stageAnchor = new THREE.Vector3();
  stageText = '';
  onMeasure: ((text: string) => void) | null = null;

  constructor(private app: App) {
    this.group.name = 'debug-tools';
    app.scene.add(this.group);
    const lab = (extra = '') => {
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;left:0;top:0;z-index:55;pointer-events:none;font:600 11px/1.3 ui-monospace,Menlo,Consolas,monospace;color:#fff;background:rgba(7,7,10,.82);border:1px solid rgba(255,42,18,.7);border-radius:6px;padding:4px 7px;white-space:pre;display:none;transform:translate(-50%,-120%);${extra}`;
      document.body.appendChild(el);
      return el;
    };
    this.measureLabel = lab();
    this.coordLabel = lab('transform:translate(14px,14px);border-color:rgba(243,237,228,.35)');
    this.poleLabel = lab();
    this.stageLabel = lab();
    this.cross = document.createElement('div');
    this.cross.style.cssText = 'position:fixed;left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;z-index:55;pointer-events:none;display:none;border:1px solid rgba(255,42,18,.9);border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.5)';
    document.body.appendChild(this.cross);

    window.addEventListener('pointermove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.inside = e.target === app.canvas;
    });
    app.canvas.addEventListener('click', (e) => {
      if (!this.active.has('measure')) return;
      if (this.groundHit(e.clientX, e.clientY)) this.addPoint(this.hit);
    });
  }

  toggle(id: ToolId, on?: boolean): boolean {
    const want = on ?? !this.active.has(id);
    if (want) this.active.add(id);
    else this.active.delete(id);
    switch (id) {
      case 'measure':
        debugState.capturePointer = want;
        if (want) this.app.input.exitPointerLock();
        else this.clearMeasure();
        break;
      case 'grid':
        if (want && !this.grid) this.grid = buildGrid();
        if (this.grid) {
          if (want) this.group.add(this.grid);
          else this.group.remove(this.grid);
        }
        break;
      case 'pole':
        if (want && !this.pole) this.pole = buildPole();
        if (this.pole) {
          if (want) this.group.add(this.pole);
          else this.group.remove(this.pole);
        }
        this.poleLabel.style.display = want ? 'block' : 'none';
        break;
      case 'stage':
        this.showStage(want);
        break;
      case 'coords':
        if (!want) {
          this.coordLabel.style.display = 'none';
          this.cross.style.display = 'none';
        }
        break;
    }
    return want;
  }

  /** ray from the mouse (or the screen centre while the pointer is locked) to the ground plane */
  private groundHit(cx: number, cy: number): boolean {
    const locked = this.app.input.pointerLocked;
    if (locked) this.ndc.set(0, 0);
    else this.ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.app.camera);
    return this.ray.ray.intersectPlane(this.ground, this.hit) !== null;
  }

  private addPoint(p: THREE.Vector3) {
    if (this.points.length >= 2) this.clearMeasure();
    this.points.push(p.clone());
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 12), new THREE.MeshBasicMaterial({ color: '#ff2a12', depthTest: false }));
    m.position.copy(p).setY(0.3);
    m.renderOrder = 999;
    this.markers.push(m);
    this.group.add(m);
    if (this.points.length === 2) {
      const [a, b] = this.points;
      const g = new THREE.BufferGeometry().setFromPoints([a.clone().setY(0.08), b.clone().setY(0.08)]);
      this.line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#ffd23a', depthTest: false }));
      this.line.renderOrder = 999;
      this.group.add(this.line);
      const d = a.distanceTo(b);
      const txt = `${d.toFixed(2)} m\nΔx ${(b.x - a.x).toFixed(2)}  Δz ${(b.z - a.z).toFixed(2)}`;
      this.measureLabel.textContent = txt;
      this.mid.copy(a).add(b).multiplyScalar(0.5).setY(0.2);
      this.onMeasure?.(`${d.toFixed(2)} m  (Δx ${(b.x - a.x).toFixed(1)}, Δz ${(b.z - a.z).toFixed(1)})`);
    } else {
      this.onMeasure?.(`A = ${p.x.toFixed(1)}, ${p.z.toFixed(1)} — click the second point`);
    }
  }

  clearMeasure(): void {
    for (const m of this.markers) {
      this.group.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.markers.length = 0;
    this.points.length = 0;
    if (this.line) {
      this.group.remove(this.line);
      this.line.geometry.dispose();
      (this.line.material as THREE.Material).dispose();
      this.line = null;
    }
    this.measureLabel.style.display = 'none';
  }

  private showStage(on: boolean) {
    if (this.stageHelper) {
      this.group.remove(this.stageHelper);
      this.stageHelper.geometry.dispose();
      this.stageHelper = null;
    }
    this.stageLabel.style.display = 'none';
    this.stageText = '';
    if (!on) return;
    const stats = this.app.get('stage')?.stats?.() ?? {};
    const num = (k: string[]) => {
      for (const key of k) {
        const v = stats[key];
        const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
        if (Number.isFinite(n)) return n;
      }
      return NaN;
    };
    const w = num(['width', 'w', 'widthM']);
    const hh = num(['height', 'h', 'heightM']);
    const d = num(['depth', 'd', 'depthM']);
    const obj = this.app.scene.getObjectByName('MainStage') ?? this.app.scene.getObjectByName('placeholder-stage');
    let box: THREE.Box3 | null = null;
    if (obj) {
      box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) box = null;
    }
    if (box) {
      this.stageHelper = new THREE.Box3Helper(box, new THREE.Color('#ffd23a'));
      (this.stageHelper.material as THREE.LineBasicMaterial).depthTest = false;
      this.stageHelper.renderOrder = 998;
      this.group.add(this.stageHelper);
      box.getCenter(this.stageAnchor);
      this.stageAnchor.y = box.max.y;
    }
    const size = box ? box.getSize(this.tmp) : null;
    const W = Number.isFinite(w) ? w : size?.x ?? NaN;
    const H = Number.isFinite(hh) ? hh : size?.y ?? NaN;
    const D = Number.isFinite(d) ? d : size?.z ?? NaN;
    const src = Number.isFinite(w) ? 'stage.stats()' : box ? `bbox of '${obj?.name}'` : 'n/a';
    this.stageText = Number.isFinite(W) ? `W ${W.toFixed(1)} m · H ${H.toFixed(1)} m · D ${D.toFixed(1)} m (${src})` : 'no stage bounds found';
    this.stageLabel.textContent = this.stageText.replace(' (', '\n(');
    if (box) this.stageLabel.style.display = 'block';
  }

  /** place DOM labels (called every frame while tools are active; no allocation) */
  update(): void {
    if (this.active.size === 0) return;
    const cam = this.app.camera;
    if (this.active.has('measure') && this.points.length === 2) this.place(this.measureLabel, this.mid);
    if (this.active.has('stage') && this.stageHelper) this.place(this.stageLabel, this.stageAnchor);
    if (this.active.has('pole') && this.pole) {
      // 0.9 m to the right of the player, relative to the view direction
      const p = this.app.playerPos;
      cam.getWorldDirection(this.tmp);
      this.tmp2.set(-this.tmp.z, 0, this.tmp.x).normalize();
      this.pole.position.set(p.x + this.tmp2.x * 0.9 + this.tmp.x * 1.6, p.y, p.z + this.tmp2.z * 0.9 + this.tmp.z * 1.6);
      this.poleTop.copy(this.pole.position).setY(p.y + 1.8);
      this.place(this.poleLabel, this.poleTop);
      if (this.poleLabel.textContent === '') this.poleLabel.textContent = '1.80 m';
    }
    if (this.active.has('coords')) {
      const locked = this.app.input.pointerLocked;
      this.cross.style.display = locked ? 'block' : 'none';
      const ok = (locked || this.mouse.inside) && this.groundHit(this.mouse.x, this.mouse.y);
      if (ok) {
        const x = locked ? window.innerWidth / 2 : this.mouse.x;
        const y = locked ? window.innerHeight / 2 : this.mouse.y;
        this.coordLabel.style.display = 'block';
        this.coordLabel.style.left = `${x}px`;
        this.coordLabel.style.top = `${y}px`;
        const d = this.hit.distanceTo(cam.position);
        this.coordLabel.textContent = `x ${this.hit.x.toFixed(2)}  z ${this.hit.z.toFixed(2)}\nground · ${d.toFixed(1)} m away`;
      } else this.coordLabel.style.display = 'none';
    }
  }

  private place(el: HTMLElement, world: THREE.Vector3) {
    this.tmp.copy(world).project(this.app.camera);
    const behind = this.tmp.z > 1;
    el.style.display = behind ? 'none' : 'block';
    if (behind) return;
    el.style.left = `${((this.tmp.x + 1) / 2) * window.innerWidth}px`;
    el.style.top = `${((1 - this.tmp.y) / 2) * window.innerHeight}px`;
  }
}

function buildGrid(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'debug-grid';
  const ext = 400;
  const minor: number[] = [];
  const major: number[] = [];
  // lines are chopped into 10 m pieces: some software rasterisers drop whole lines that cross
  // the camera plane instead of clipping them
  for (let v = -ext; v <= ext; v += 10) {
    const arr = v % 50 === 0 ? major : minor;
    for (let u = -ext; u < ext; u += 10) arr.push(u, 0.04, v, u + 10, 0.04, v, v, 0.04, u, v, 0.04, u + 10);
  }
  const mk = (arr: number[], color: string, opacity: number) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false }));
    m.frustumCulled = false;
    return m;
  };
  g.add(mk(minor, '#f3ede4', 0.18), mk(major, '#ff2a12', 0.65));
  // axes
  const ax: number[] = [];
  const az: number[] = [];
  for (let u = -ext; u < ext; u += 10) {
    ax.push(u, 0.06, 0, u + 10, 0.06, 0);
    az.push(0, 0.06, u, 0, 0.06, u + 10);
  }
  g.add(mk(ax, '#ffd23a', 0.9), mk(az, '#12e8ff', 0.9));
  return g;
}

/** 1.80 m pole with 10 cm red/white bands */
function buildPole(): THREE.Group {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 180;
  const x = c.getContext('2d')!;
  for (let i = 0; i < 18; i++) {
    x.fillStyle = i % 2 ? '#ffffff' : '#e10600';
    x.fillRect(0, i * 10, 8, 10);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 10), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
  pole.position.y = 0.9;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: '#ffd23a', fog: false }));
  cap.position.y = 1.8;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.03, 16), new THREE.MeshBasicMaterial({ color: '#1a1a1e', fog: false }));
  foot.position.y = 0.015;
  g.add(pole, cap, foot);
  g.name = 'debug-pole';
  return g;
}
