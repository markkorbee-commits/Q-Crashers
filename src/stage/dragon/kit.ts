import * as THREE from 'three';
import { Bucket, mulberry } from './geom';
import { Bulbs, Strips } from './shading';

/** Per-material geometry buckets for one rigid part of the crown. */
export interface PartBuckets {
  /** red scale hide (head shell, jaw shell, body) */
  shell: Bucket;
  /** machined armour plates (panel texture), tinted per vertex */
  armor: Bucket;
  /** brushed steel: crest cones, blades, hooks, talons, spear points */
  steel: Bucket;
  /** copper-orange painted tubes: wing spars, arms, collars; flame plates via tint */
  copper: Bucket;
  /** lava-crack hide (neck, chest) */
  lava: Bucket;
  /** teeth (ivory -> orange vertex gradient) */
  ivory: Bucket;
  /** mouth interior: palate, gums, tongue, jaw floor */
  flesh: Bucket;
  /** dark armour of the rider + bone */
  rider: Bucket;
  strips: Strips;
  bulbs: Bulbs;
}

export function partBuckets(): PartBuckets {
  return {
    shell: new Bucket(),
    armor: new Bucket(),
    steel: new Bucket(),
    copper: new Bucket(),
    lava: new Bucket(),
    ivory: new Bucket(),
    flesh: new Bucket(),
    rider: new Bucket(),
    strips: new Strips(),
    bulbs: new Bulbs(),
  };
}

/** Build context shared by the head / body / wing builders. */
export interface Kit {
  /** 0.35 (mobile) .. 1 (ultra) geometric detail factor */
  detail: number;
  rnd: () => number;
  /** static world-space parts */
  world: PartBuckets;
  /** parts riding on the lower jaw (jaw-local space: hinge at origin, head frame, jaw closed) */
  jaw: PartBuckets;
  /** head frame (head-local -> world) */
  HM: THREE.Matrix4;
}

export function createKit(detail: number, HM: THREE.Matrix4): Kit {
  return { detail, rnd: mulberry(20260627), world: partBuckets(), jaw: partBuckets(), HM };
}

/** quality-scaled segment count */
export function segs(k: Kit, n: number, min = 3): number {
  return Math.max(min, Math.round(n * (0.45 + 0.55 * k.detail)));
}

/** Colour palette (albedo, from stage-analysis §8). */
export const PAL = {
  scaleRed: new THREE.Color('#b85448'),
  scaleDeep: new THREE.Color('#7a2a2a'),
  bronze: new THREE.Color('#b08d57'),
  darkBronze: new THREE.Color('#6a4a2a'),
  steel: new THREE.Color('#a9b2bd'),
  copper: new THREE.Color('#d0602a'),
  copperDeep: new THREE.Color('#a8401e'),
  flameRed: new THREE.Color('#c0301c'),
  flameOrange: new THREE.Color('#e86a1e'),
  ivory: new THREE.Color('#ecdcaa'),
  toothRoot: new THREE.Color('#d98b3a'),
  gum: new THREE.Color('#b8442e'),
  tongue: new THREE.Color('#b0403e'),
  palate: new THREE.Color('#5a1418'),
  talon: new THREE.Color('#cfd0cc'),
  riderDark: new THREE.Color('#4a4c52'),
  bone: new THREE.Color('#c8c4b8'),
  plateRed: new THREE.Color('#a8443a'),
};
