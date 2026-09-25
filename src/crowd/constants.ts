import * as THREE from 'three';

/**
 * Shared constants of the crowd module: skeleton bones, geometry slots, mood channels,
 * the clothing / skin palette (design-bible §9.3) and the zone table (design-bible §9.2).
 * The GLSL side mirrors these numbers (see shaders.ts) — keep them in sync.
 */

/** rigid "bones" of the articulated body (vertex attribute aBone = bone + 32 * slot) */
export const BONE = {
  PELVIS: 0,
  SPINE: 1,
  HEAD: 2,
  UARM_L: 3,
  FARM_L: 4,
  HAND_L: 5,
  UARM_R: 6,
  FARM_R: 7,
  HAND_R: 8,
  THIGH_L: 9,
  SHIN_L: 10,
  THIGH_R: 11,
  SHIN_R: 12,
  CAPE: 13,
  FOOT_L: 14,
  FOOT_R: 15,
} as const;

/** optional geometry pieces, shown per instance (look bits) */
export const SLOT = {
  BODY: 0,
  CAP: 1,
  HAT: 2,
  HAIR_LONG: 3,
  PONY: 4,
  BANDANA: 5,
  CAPE: 6,
  LANTERN_L: 7,
  LANTERN_R: 8,
  MIC: 9,
  CAMERA: 10,
  CTRL: 11,
} as const;

/** mood channels (uniform uMood[5] = 20 floats). Values are shares of the crowd 0..1. */
export const M = {
  SWAY: 0,
  BOUNCE: 1,
  JUMP: 2,
  FIST: 3,
  HANDS: 4,
  PHONES: 5,
  WAVE: 6,
  HUG: 7,
  CLAP: 8,
  CROUCH: 9,
  POLS: 10,
  STOMP: 11,
  HEADBANG: 12,
  SIT: 13,
  FLAGS: 14,
  LIGHTERS: 15,
  INTENS: 16,
  HAKKEN: 17,
  CHEER: 18,
  LOOKUP: 19,
} as const;
export const MOOD_CHANNELS = 20;
export type MoodKey = keyof typeof M;

/** crowd zones (design-bible §9.2); index is stored per person */
export const ZONE = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, Q: 7 } as const;

/** palette layout (uniform uPal[64], linear colours) */
export const PAL = { SKIN: 0, HAIR: 8, TOP: 16, BOTTOM: 32, CAP: 40, SHOE: 48, MISC: 56 } as const;

const PALETTE_HEX: string[] = [
  // 0..7 skin (design-bible range #F1C7A5 … #6B4431)
  '#f1c7a5', '#e6b594', '#d6a07f', '#c48b69', '#a8765a', '#8d5b41', '#6b4431', '#f6d6bd',
  // 8..15 hair
  '#16110e', '#2c1f17', '#4a3222', '#6e4c2f', '#b8955a', '#d9c9a2', '#7a3a1e', '#8e8c88',
  // 16..31 tops
  '#141414', '#242424', '#c02030', '#7a1f2b', '#4b2a6e', '#e8e4dc', '#8a8a8a', '#2f6fd6',
  '#39ff14', '#ff2ea6', '#ffd400', '#3b4f6b', '#556b2f', '#2b1b45', '#d6f000', '#9e1512',
  // 32..39 bottoms
  '#151515', '#3b4f6b', '#283246', '#556b2f', '#8c7e62', '#4a4a4e', '#5a1820', '#9e1512',
  // 40..47 caps / hats
  '#0f0f10', '#1a1a1c', '#b01a22', '#dad6ce', '#b8a67e', '#4b2a6e', '#e0b000', '#e8a07a',
  // 48..55 shoes + details
  '#e8e6e2', '#151515', '#6a6a6a', '#b01a22', '#c9a45c', '#c8ccd0', '#fff0c0', '#ff6a00',
  // 56..63 costumes + misc
  '#39ff14', '#ffd400', '#ff2ea6', '#2f6fd6', '#b01a22', '#c02030', '#e8e4dc', '#0c0c0d',
];

/** palette as linear-RGB THREE.Color list (uniform array) */
export function paletteColors(): THREE.Color[] {
  return PALETTE_HEX.map((h) => new THREE.Color(h));
}

/** top palette indices (relative to PAL.TOP) */
export const TOP = {
  BLACK: 0, CHARCOAL: 1, RED: 2, WINE: 3, PURPLE: 4, OFFWHITE: 5, GREY: 6, NEON_BLUE: 7,
  NEON_GREEN: 8, NEON_PINK: 9, NEON_YELLOW: 10, DENIM: 11, OLIVE: 12, MIDNIGHT: 13, HIVIS: 14, JUMPSUIT: 15,
} as const;
export const BOTTOM = { BLACK: 0, DENIM: 1, DARK_DENIM: 2, OLIVE: 3, KHAKI: 4, GREY: 5, WINE: 6, JUMPSUIT: 7 } as const;
/** print types on tops */
export const PRINT = { NONE: 0, RED_EMBLEM: 1, WHITE_TEXT: 2, HIVIS: 3, GOLD_STRIPES: 4, TIEDYE: 5, FLAMES: 6 } as const;
/** headwear */
export const HEAD = { NONE: 0, CAP: 1, CAP_BACK: 2, BUCKET: 3, BANDANA: 4 } as const;
/** hair styles */
export const HAIR = { SHORT: 0, LONG: 1, PONY: 2, BUZZ: 3 } as const;
/** performer props (look.z bits 8..) */
export const PROP = { LANTERN_L: 1, LANTERN_R: 2, MIC: 4, CAMERA: 8, CTRL: 16 } as const;

/** Look of one person, packed into 4 floats (exact integers < 2^24). */
export interface Look {
  skin: number;
  hairColor: number;
  hairStyle: number;
  female: boolean;
  headwear: number;
  capColor: number;
  shoe: number;
  wristband: boolean;
  top: number;
  print: number;
  shirtless: boolean;
  tank: boolean;
  bottom: number;
  longPants: boolean;
  socks: boolean;
  costume: boolean;
  costumeColor: number;
  cape: boolean;
  capeFlag: number;
  flagCarrier: boolean;
  leftHanded: boolean;
  props: number;
  glasses: boolean;
  beard: boolean;
}

export function newLook(): Look {
  return {
    skin: 2, hairColor: 1, hairStyle: 0, female: false, headwear: 0, capColor: 0, shoe: 0, wristband: false,
    top: 0, print: 0, shirtless: false, tank: false, bottom: 0, longPants: false, socks: false, costume: false,
    costumeColor: 0, cape: false, capeFlag: 0, flagCarrier: false, leftHanded: false, props: 0, glasses: false, beard: false,
  };
}

const b = (v: boolean) => (v ? 1 : 0);

export function packLook(l: Look, out: Float32Array, o: number): void {
  out[o] = (l.skin & 7) | ((l.hairColor & 7) << 3) | ((l.hairStyle & 3) << 6) | (b(l.female) << 8) | ((l.headwear & 7) << 9) |
    ((l.capColor & 7) << 12) | ((l.shoe & 3) << 15) | (b(l.wristband) << 17) | (b(l.glasses) << 18) | (b(l.beard) << 19);
  out[o + 1] = (l.top & 15) | ((l.print & 7) << 4) | (b(l.shirtless) << 7) | (b(l.tank) << 8) | ((l.bottom & 7) << 9) |
    (b(l.longPants) << 12) | (b(l.socks) << 13) | (b(l.costume) << 14) | ((l.costumeColor & 3) << 15);
  out[o + 2] = b(l.cape) | ((l.capeFlag & 31) << 1) | (b(l.flagCarrier) << 6) | (b(l.leftHanded) << 7) | ((l.props & 31) << 8);
  out[o + 3] = 0;
}

/** Wind (design-bible §8.4): from 340° at 4–5 m/s, smoke/flags drift towards this world vector. */
export const WIND_DIR = new THREE.Vector3(0.26, 0, -0.97).normalize();

/** Stage focal point people face (DJ portal / dragon, world). */
export const STAGE_FOCUS = new THREE.Vector2(0, -6);
