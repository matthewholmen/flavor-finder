// utils/drinkPairing.ts
//
// Dish → drink suggestions: the first menu-level (zoom-out) surface. Two signals,
// both receipt-backed so every suggestion can say WHY:
//
//   1. Evidence — which dish ingredients the drink is documented against in
//      "What to Drink with What You Eat" (data/drinkPairings.ts). Protein/bulk
//      matches count double: the anchor ingredient drives the pairing.
//   2. Style contrast — sommelier balance rules over the dish's computed profile
//      and the drink style's attributes (cut richness, soothe heat, match body).
//      Menu pairing rewards CONTRAST; this is deliberately not the ingredient
//      engine scaled up.
//
// Pure and UI-independent. Never consults or modifies the flavor map — dish
// combos are assumed to already be engine-valid; drinks are a separate edge type.

import { INGREDIENT_DRINK_PAIRINGS, DrinkRef, DrinkCategory } from '../data/drinkPairings.ts';
import { DRINK_STYLE_ATTRS, DrinkStyleAttrs } from '../data/drinkStyles.ts';
import { computeDishProfile, DishProfile } from './dishProfile.ts';
import { getProfile } from './atlas.ts';

export interface DrinkSuggestion {
  drink: DrinkRef;
  /** Composite rank score — comparable within one suggestion list only. */
  score: number;
  /** Dish ingredients this drink is documented against (book receipts). */
  evidence: string[];
  /** Balance rules satisfied — display-ready ("cuts the richness"). */
  rules: string[];
  /** Balance clashes — display-ready ("tannin amplifies the heat"). */
  warnings: string[];
}

export interface SuggestDrinksOptions {
  /** "Served as" dish-type id (data/dishTypes.ts) or frame-preset id. */
  servedAs?: string;
  /** Restrict to non-alcoholic suggestions (alcohol-free dietary filter). */
  nonAlcoholicOnly?: boolean;
  limit?: number;
}

const EVIDENCE_BOOST = 0.22;
const PROTEIN_EVIDENCE_WEIGHT = 2;

// One shared catalog: every distinct drink seen anywhere in the pairing data.
let catalogCache: DrinkRef[] | null = null;
const getDrinkCatalog = (): DrinkRef[] => {
  if (!catalogCache) {
    const byName = new Map<string, DrinkRef>();
    for (const drinks of Object.values(INGREDIENT_DRINK_PAIRINGS)) {
      for (const d of drinks) if (!byName.has(d.name)) byName.set(d.name, d);
    }
    catalogCache = [...byName.values()];
  }
  return catalogCache;
};

interface StyleFit {
  score: number;
  rules: string[];
  warnings: string[];
}

// The balance rules. Each fires off a dish attribute threshold, contributes to
// the score, and (when decisive) leaves a display-ready receipt.
const styleFit = (dish: DishProfile, st: DrinkStyleAttrs): StyleFit => {
  let score = 0;
  const rules: string[] = [];
  const warnings: string[] = [];

  if (dish.richness >= 5.5) {
    const cut = (st.acid + st.tannin + st.carbonation) / 3;
    score += cut * 0.9;
    if (cut >= 4.5) rules.push('cuts the richness');
  }

  if (dish.heat >= 4.5) {
    score += st.sweet * 0.45 + (10 - st.alcohol) * 0.32 + (10 - st.tannin) * 0.23;
    if (st.sweet >= 4 && st.tannin <= 2) rules.push('cools the heat');
    if (st.tannin >= 6) {
      score -= 4;
      warnings.push('tannin amplifies the heat');
    } else if (st.alcohol >= 9) {
      score -= 4;
      warnings.push('alcohol amplifies the heat');
    }
  }

  if (dish.salt >= 6) {
    score += (st.acid + st.carbonation) / 2 * 0.5;
    if (st.carbonation >= 7) rules.push('bubbles against the salt');
  }

  if (dish.umami >= 6.5) {
    score -= Math.max(0, st.tannin - 4) * 0.8;
    if (st.tannin <= 3) rules.push('gentle on the umami');
  }

  if (dish.sweetness >= 6) {
    if (st.sweet + 2 < dish.sweetness) {
      score -= 5;
      warnings.push('the dish out-sweetens it');
    } else {
      score += 3;
      rules.push('sweet enough to keep up');
    }
  }

  const bodyDiff = Math.abs(dish.weight - st.body);
  score += (5 - bodyDiff) * 0.8;
  if (bodyDiff <= 1.5) rules.push("matches the dish's weight");
  else if (bodyDiff >= 4) warnings.push('body mismatch');

  return { score, rules, warnings };
};

// Book evidence per candidate drink, weighted so the anchor (protein/bulk)
// ingredient counts double.
const collectEvidence = (
  ingredients: string[],
): Map<string, { weight: number; matched: string[] }> => {
  const byDrink = new Map<string, { weight: number; matched: string[] }>();
  for (const name of ingredients) {
    const drinks = INGREDIENT_DRINK_PAIRINGS[name];
    if (!drinks) continue;
    const p = getProfile(name);
    const w = p && (p.category === 'Proteins' || (p.functions ?? []).includes('bulk'))
      ? PROTEIN_EVIDENCE_WEIGHT
      : 1;
    for (const d of drinks) {
      const entry = byDrink.get(d.name) ?? { weight: 0, matched: [] };
      entry.weight += w;
      entry.matched.push(name);
      byDrink.set(d.name, entry);
    }
  }
  return byDrink;
};

export const suggestDrinks = (
  ingredients: string[],
  options: SuggestDrinksOptions = {},
): DrinkSuggestion[] => {
  const { servedAs, nonAlcoholicOnly = false, limit = 8 } = options;
  const dish = computeDishProfile(ingredients, servedAs);
  const evidence = collectEvidence(ingredients);

  const suggestions: DrinkSuggestion[] = [];
  for (const drink of getDrinkCatalog()) {
    if (nonAlcoholicOnly && drink.category !== 'nonAlcoholic') continue;
    const attrs = DRINK_STYLE_ATTRS[drink.style];
    if (!attrs) continue;
    const fit = styleFit(dish, attrs);
    const ev = evidence.get(drink.name);
    suggestions.push({
      drink,
      score: fit.score * (1 + EVIDENCE_BOOST * (ev?.weight ?? 0)),
      evidence: ev?.matched ?? [],
      rules: fit.rules,
      warnings: fit.warnings,
    });
  }

  return suggestions
    .sort((a, b) => b.score - a.score || a.drink.name.localeCompare(b.drink.name))
    .slice(0, limit);
};

/** Category display order/labels for grouped drink lists. */
export const DRINK_CATEGORY_LABELS: Record<DrinkCategory, string> = {
  wine: 'Wine',
  beer: 'Beer',
  spirit: 'Spirits',
  nonAlcoholic: 'Zero-proof',
};
