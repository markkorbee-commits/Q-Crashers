/**
 * Festival bar menu (data-driven).
 *
 * ASSUMPTION (research still running): Q-dance festivals use coins/tokens; 1 coin = EUR 3.90.
 * Prices below follow the usual Dutch festival pattern: water 1 coin, beer 1 coin,
 * mix drink 3 coins, shot 2 coins. Soft drinks 1 coin, energy drink 2 coins (ASSUMPTION).
 * Update this file when the research confirms 2026 prices; nothing else needs to change.
 */

/** density of ethanol (g/ml) */
export const ETHANOL_DENSITY = 0.789;
/** ASSUMPTION: price of one coin in euros */
export const COIN_EUR = 3.9;
/** coins in a top-up bundle (simulated purchase, no real money) */
export const COIN_BUNDLE = 10;
export const START_COINS = 10;

export type DrinkCategory = 'water' | 'soft' | 'beer' | 'nonalc' | 'mix' | 'shot';

/** what the drink is served in (drives the first-person model) */
export type Vessel = 'redcup' | 'clearcup' | 'bottle' | 'can' | 'shotglass';

export interface Drink {
  id: string;
  name: string;
  category: DrinkCategory;
  /** short description shown on the menu */
  desc: string;
  volumeMl: number;
  /** alcohol by volume as a fraction (0.05 = 5 %) */
  abv: number;
  priceCoins: number;
  /** grams of pure ethanol = volume * abv * 0.789 */
  grams: number;
  vessel: Vessel;
  /** liquid colour (hex) */
  liquid: string;
  foam?: boolean;
  /** number of sips to finish it */
  sips: number;
  /** water-equivalent millilitres for the hydration model (0 for alcoholic drinks) */
  hydrationMl: number;
}

export function ethanolGrams(volumeMl: number, abv: number): number {
  return Math.round(volumeMl * abv * ETHANOL_DENSITY * 10) / 10;
}

type DrinkDef = Omit<Drink, 'grams'>;
const d = (def: DrinkDef): Drink => ({ ...def, grams: ethanolGrams(def.volumeMl, def.abv) });

export const DRINKS: Drink[] = [
  d({ id: 'water', name: 'Water', category: 'water', desc: 'Still water, 50 cl bottle', volumeMl: 500, abv: 0, priceCoins: 1, vessel: 'bottle', liquid: '#bfe6ff', sips: 4, hydrationMl: 500 }),
  d({ id: 'cola', name: 'Cola', category: 'soft', desc: 'Ice-cold, 25 cl cup', volumeMl: 250, abv: 0, priceCoins: 1, vessel: 'clearcup', liquid: '#3a130a', sips: 3, hydrationMl: 200 }),
  d({ id: 'orange', name: 'Orange soda', category: 'soft', desc: 'Sparkling, 25 cl cup', volumeMl: 250, abv: 0, priceCoins: 1, vessel: 'clearcup', liquid: '#ff8a12', sips: 3, hydrationMl: 200 }),
  d({ id: 'energy', name: 'Energy drink', category: 'soft', desc: '25 cl can · caffeine', volumeMl: 250, abv: 0, priceCoins: 2, vessel: 'can', liquid: '#f2e36b', sips: 3, hydrationMl: 150 }),
  d({ id: 'pilsner', name: 'Pilsner', category: 'beer', desc: 'Draught, 25 cl red cup', volumeMl: 250, abv: 0.05, priceCoins: 1, vessel: 'redcup', liquid: '#f2b632', foam: true, sips: 4, hydrationMl: 0 }),
  d({ id: 'radler00', name: 'Radler 0.0', category: 'nonalc', desc: 'Lemon radler, 25 cl', volumeMl: 250, abv: 0, priceCoins: 1, vessel: 'redcup', liquid: '#f6d36a', foam: true, sips: 4, hydrationMl: 200 }),
  d({ id: 'beer00', name: 'Alcohol-free beer', category: 'nonalc', desc: 'Pilsner 0.0, 25 cl', volumeMl: 250, abv: 0, priceCoins: 1, vessel: 'redcup', liquid: '#eaa92a', foam: true, sips: 4, hydrationMl: 200 }),
  // mix drinks: volume/abv describe the 5 cl spirit measure (the mixer adds no alcohol)
  d({ id: 'vodka-energy', name: 'Vodka-energy', category: 'mix', desc: '5 cl vodka + energy', volumeMl: 50, abv: 0.375, priceCoins: 3, vessel: 'clearcup', liquid: '#e9dc62', sips: 4, hydrationMl: 0 }),
  d({ id: 'rum-cola', name: 'Rum-cola', category: 'mix', desc: '5 cl rum + cola', volumeMl: 50, abv: 0.375, priceCoins: 3, vessel: 'clearcup', liquid: '#4a1a0c', sips: 4, hydrationMl: 0 }),
  d({ id: 'gin-tonic', name: 'Gin-tonic', category: 'mix', desc: '5 cl gin + tonic', volumeMl: 50, abv: 0.4, priceCoins: 3, vessel: 'clearcup', liquid: '#dff3f2', sips: 4, hydrationMl: 0 }),
  d({ id: 'tequila', name: 'Tequila shot', category: 'shot', desc: '2 cl, served neat', volumeMl: 20, abv: 0.38, priceCoins: 2, vessel: 'shotglass', liquid: '#f3d98a', sips: 1, hydrationMl: 0 }),
  d({ id: 'herbal', name: 'Herbal liqueur', category: 'shot', desc: '2 cl, ice cold', volumeMl: 20, abv: 0.35, priceCoins: 2, vessel: 'shotglass', liquid: '#4a2410', sips: 1, hydrationMl: 0 }),
];

export const CATEGORY_LABEL: Record<DrinkCategory, string> = {
  water: 'Water',
  soft: 'Soft drinks',
  beer: 'Beer',
  nonalc: 'Alcohol-free',
  mix: 'Mix drinks',
  shot: 'Shots',
};

export const CATEGORY_ORDER: DrinkCategory[] = ['beer', 'nonalc', 'mix', 'shot', 'soft', 'water'];

export function drinkById(id: string): Drink | undefined {
  return DRINKS.find((x) => x.id === id);
}

export const isAlcoholic = (dr: Drink) => dr.grams > 0;

/** "25 cl · 5.0 %" */
export function drinkSpec(dr: Drink): string {
  const vol = `${dr.volumeMl / 10} cl`;
  return `${vol} · ${(dr.abv * 100).toFixed(1)} %`;
}
