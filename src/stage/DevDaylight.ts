import * as THREE from 'three';

/**
 * DEV ONLY (`?daylight`): a flat, bright afternoon view of the set so the painted art, the silhouette
 * and the materials can be judged against the daytime photos of the real stage. Never enabled by
 * default and never used by the show: it adds a sun + sky light, replaces the night sky dome with a
 * plain blue gradient, thins the fog and switches every stage emitter (LEDs, glows, festoons, virtual
 * floods) off. Everything is set once per frame after the show systems wrote their state, so it wins
 * over the night look without touching it.
 */
export class DevDaylight {
  readonly group = new THREE.Group();
  private sun = new THREE.DirectionalLight('#fff4e2', 2.6);
  private hemi = new THREE.HemisphereLight('#a8c8ff', '#b0a890', 1.15);
  private sky: THREE.Mesh;
  private hidden: THREE.Object3D[] = [];

  constructor(private scene: THREE.Scene) {
    this.group.name = 'dev-daylight';
    // afternoon sun from the audience side, high and a little to the left (photos: lit fronts, short shadows)
    this.sun.position.set(-160, 260, 220);
    this.sun.target.position.set(0, 8, -12);
    this.group.add(this.sun, this.sun.target, this.hemi);
    const mat = new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: true,
      depthFunc: THREE.LessEqualDepth,
      side: THREE.BackSide,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          float y = clamp(vDir.y, -0.2, 1.0);
          vec3 zen = vec3(0.06, 0.2, 0.62);
          vec3 hor = vec3(0.5, 0.66, 0.9);
          vec3 c = mix(hor, zen, pow(max(y, 0.0), 0.55));
          gl_FragColor = vec4(c * 1.15, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), mat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = 1e6 + 5;
    this.group.add(this.sky);
    scene.add(this.group);
  }

  /** per frame, after every system wrote its state */
  apply(cam: THREE.Camera): void {
    if (!this.hidden.length) {
      for (const n of ['sky', 'stars']) {
        const o = this.scene.getObjectByName(n);
        if (o) this.hidden.push(o);
      }
    }
    for (const o of this.hidden) o.visible = false;
    this.sky.position.copy(cam.position);
    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog && 'density' in fog) {
      fog.density = 0.0009;
      fog.color.setRGB(0.55, 0.65, 0.8);
    }
    if (this.scene.background instanceof THREE.Color) this.scene.background.setRGB(0.5, 0.66, 0.9);
  }
}
