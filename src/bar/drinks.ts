/**
 * Festival bar menu (data-driven). See research/crowd-and-bars.md + design-bible.md §11:
 *  - FACT: since 2025 Defqon.1 is cashless — you pay in euros with the NFC "Legendary Bracelet"
 *    (topped up in the app / at kiosks); tokens are gone.
 *  - FACT: cup rule — one recycle token on arrival; a cup without token (or not returned) costs +EUR 2.
 *  - FACT: beer partner is AB InBev (Bud, Corona); Red Bull and Smirnoff ICE appear on the 2026 map.
 *  - ASSUMPTION: 2026 prices from the bible menu table (anchored on the 2024 token price, EUR 4.00).
 *  - Long drinks use the Dutch standard 3.5 cl spirit measure (≈ 10 g alcohol = one standard glass).
 * Brand names are used as plain product names only (no logos).
 */

/** density of ethanol (g/ml) */
export const ETHANOL_DENSITY = 0.789;
/** simulated bracelet top-up amount in euros (no real money involved) */
export const TOPUP_EUR = 20;
/** bracelet credit at the start (euros) */
export const START_CREDIT = 25;
/** cup surcharge without a recycle token (euros) — shown as info */
export const CUP_DEPOSIT_EUR = 2;
/** the cup rule as shown on the menu */
export const CUP_RULE = 'Cups: hand in your recycle token, or pay € 2.00 extra per cup';

/** "€ 4.30" */
export const eur = (n: number) => `€ ${n.toFixed(2)}`;

export type DrinkCategory = 'water' | 'soft' | 'beer' | 'nonalc' | 'mix';

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
  /** price in euros (ASSUMPTION for 2026) */
  price: number;
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
  d({ id: 'tapwater', name: 'Tap water', category: 'water', desc: 'Free cup of water · heat protocol 2026', volumeMl: 250, abv: 0, price: 0, vessel: 'clearcup', liquid: '#cfeaff', sips: 3, hydrationMl: 250 }),
  d({ id: 'water', name: 'Mineral water', category: 'water', desc: 'Still, 50 cl bottle', volumeMl: 500, abv: 0, price: 3.0, vessel: 'bottle', liquid: '#bfe6ff', sips: 4, hydrationMl: 500 }),
  d({ id: 'beer00', name: 'Bud 0.0', category: 'nonalc', desc: 'Alcohol-free beer, 25 cl', volumeMl: 250, abv: 0, price: 4.3, vessel: 'redcup', liquid: '#eaa92a', foam: true, sips: 4, hydrationMl: 200 }),
  d({ id: 'cola', name: 'Cola', category: 'soft', desc: 'Ice-cold, 25 cl cup', volumeMl: 250, abv: 0, price: 4.3, vessel: 'clearcup', liquid: '#3a130a', sips: 3, hydrationMl: 200 }),
  d({ id: 'orange', name: 'Orange soda', category: 'soft', desc: 'Sparkling, 25 cl cup', volumeMl: 250, abv: 0, price: 4.3, vessel: 'clearcup', liquid: '#ff8a12', sips: 3, hydrationMl: 200 }),
  d({ id: 'energy', name: 'Red Bull', category: 'soft', desc: '25 cl can, poured · caffeine', volumeMl: 250, abv: 0, price: 5.0, vessel: 'can', liquid: '#f2e36b', sips: 3, hydrationMl: 150 }),
  d({ id: 'pilsner', name: 'Bud', category: 'beer', desc: 'Draught, 25 cl red cup', volumeMl: 250, abv: 0.05, price: 4.3, vessel: 'redcup', liquid: '#f2b632', foam: true, sips: 4, hydrationMl: 0 }),
  d({ id: 'corona', name: 'Corona Extra', category: 'beer', desc: '33 cl, poured in a cup', volumeMl: 330, abv: 0.045, price: 5.5, vessel: 'clearcup', liquid: '#f6d36a', foam: true, sips: 5, hydrationMl: 0 }),
  d({ id: 'seltzer', name: 'Hard seltzer', category: 'mix', desc: '33 cl, sparkling', volumeMl: 330, abv: 0.045, price: 5.0, vessel: 'clearcup', liquid: '#eaf6f8', sips: 5, hydrationMl: 0 }),
  d({ id: 'smirnoff-ice', name: 'Smirnoff ICE', category: 'mix', desc: '27.5 cl pre-mix', volumeMl: 275, abv: 0.04, price: 5.5, vessel: 'clearcup', liquid: '#eef4f4', sips: 4, hydrationMl: 0 }),
  // long drinks: volume/abv describe the 3.5 cl spirit measure (the mixer adds no alcohol)
  d({ id: 'vodka-energy', name: 'Vodka Red Bull', category: 'mix', desc: '3.5 cl vodka + Red Bull · the caffeine masks how drunk you are', volumeMl: 35, abv: 0.375, price: 12.5, vessel: 'clearcup', liquid: '#e9dc62', sips: 4, hydrationMl: 0 }),
  d({ id: 'rum-cola', name: 'Rum-cola', category: 'mix', desc: '3.5 cl rum + cola', volumeMl: 35, abv: 0.375, price: 12.5, vessel: 'clearcup', liquid: '#4a1a0c', sips: 4, hydrationMl: 0 }),
  d({ id: 'gin-tonic', name: 'Gin-tonic', category: 'mix', desc: '3.5 cl gin + tonic', volumeMl: 35, abv: 0.375, price: 12.5, vessel: 'clearcup', liquid: '#dff3f2', sips: 4, hydrationMl: 0 }),
];

export const CATEGORY_LABEL: Record<DrinkCategory, string> = {
  water: 'Water',
  nonalc: 'Alcohol-free',
  soft: 'Soft drinks',
  beer: 'Beer',
  mix: 'Mixes & long drinks',
};

/** water first (heat protocol), alcohol last */
export const CATEGORY_ORDER: DrinkCategory[] = ['water', 'nonalc', 'soft', 'beer', 'mix'];

export function drinkById(id: string): Drink | undefined {
  return DRINKS.find((x) => x.id === id);
}

export const isAlcoholic = (dr: Drink) => dr.grams > 0;

/** "25 cl · 5.0 %" */
export function drinkSpec(dr: Drink): string {
  const vol = `${dr.volumeMl / 10} cl`;
  return `${vol} · ${(dr.abv * 100).toFixed(1)} %`;
}
