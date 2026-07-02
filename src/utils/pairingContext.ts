// utils/pairingContext.ts
//
// Decode + aggregate the mined dish context (data/pairingContext.ts): given a pairing —
// or a whole generated combo — answer "what am I looking at?" with dish types, methods,
// cuisines, and concrete recipe titles. Pure annotation of existing edges; no pairing
// logic lives here.

import {
  pairingContext,
  CONTEXT_DISH_TYPES,
  CONTEXT_METHODS,
  CONTEXT_CUISINES,
  CONTEXT_TITLES,
} from '../data/pairingContext.ts';
import { pairKey } from '../data/pairingMeta.ts';

export interface EdgeContext {
  /** Recipes in the mined corpus containing both ingredients. */
  recipeCount: number;
  dishTypes: string[];
  methods: string[];
  cuisines: string[];
  titles: string[];
}

export const getEdgeContext = (a: string, b: string): EdgeContext | null => {
  const entry = pairingContext[pairKey(a.toLowerCase(), b.toLowerCase())];
  if (!entry) return null;
  const [recipeCount, dish, method, cuisine, titles] = entry;
  return {
    recipeCount,
    dishTypes: dish.map(i => CONTEXT_DISH_TYPES[i]),
    methods: method.map(i => CONTEXT_METHODS[i]),
    cuisines: cuisine.map(i => CONTEXT_CUISINES[i]),
    titles: titles.map(i => CONTEXT_TITLES[i]),
  };
}

export interface ComboContext {
  /** Top dish-type tags across the combo's edges, most-supported first. */
  dishTypes: string[];
  methods: string[];
  cuisines: string[];
  /** Concrete "seen in" recipe titles, most relevant first. */
  titles: string[];
  /** How many of the combo's pairs had any mined context. */
  coveredEdges: number;
  totalEdges: number;
}

/**
 * Aggregate context across every pair in a combo.
 *
 * Tags are ranked by how many of the combo's edges attest them (position within an
 * edge's list breaks ties), so a tag shared by garlic+lime AND lime+chicken outranks
 * one seen on a single edge. Titles get the same vote — a title listed by several of
 * the combo's edges almost certainly contains 3+ of its ingredients — with a bonus for
 * coming from the combo's *rarest* edge, whose context is the most specific.
 */
export const getComboContext = (ingredients: string[]): ComboContext | null => {
  const edges: EdgeContext[] = [];
  let totalEdges = 0;
  for (let i = 0; i < ingredients.length; i++) {
    for (let j = i + 1; j < ingredients.length; j++) {
      totalEdges++;
      const ctx = getEdgeContext(ingredients[i], ingredients[j]);
      if (ctx) edges.push(ctx);
    }
  }
  if (edges.length === 0) return null;

  const rank = (lists: string[][]): string[] => {
    const score = new Map<string, number>();
    lists.forEach(list =>
      list.forEach((tag, pos) => {
        // One point per attesting edge; earlier positions edge ahead on ties.
        score.set(tag, (score.get(tag) ?? 0) + 1 - pos * 0.01);
      })
    );
    return Array.from(score.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  };

  const minCount = Math.min(...edges.map(e => e.recipeCount));
  const titleScore = new Map<string, number>();
  edges.forEach(e =>
    e.titles.forEach((title, pos) => {
      const rarityBonus = e.recipeCount === minCount ? 0.5 : 0;
      titleScore.set(title, (titleScore.get(title) ?? 0) + 1 - pos * 0.01 + rarityBonus);
    })
  );
  const titles = Array.from(titleScore.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);

  return {
    dishTypes: rank(edges.map(e => e.dishTypes)),
    methods: rank(edges.map(e => e.methods)),
    cuisines: rank(edges.map(e => e.cuisines)),
    titles,
    coveredEdges: edges.length,
    totalEdges,
  };
};
