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
  CONTEXT_TAG_KEYWORDS,
} from '../data/pairingContext.ts';
import { pairKey } from '../data/pairingMeta.ts';
import { ingredientProfiles } from '../data/ingredientProfiles.ts';

// A receipt that names a protein the combo doesn't contain is actively misleading —
// "Grilled Chicken Sandwiches" for a monkfish combo reads as a wrong answer, where a
// protein-free title ("Romesco Sauce") stays honest. Precompile a word-boundary regex
// per protein name for title screening.
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PROTEIN_TERMS: Array<[string, RegExp]> = (ingredientProfiles as any[])
  .filter(p => p.category === 'Proteins')
  .map(p => {
    const name = p.name.toLowerCase();
    return [name, new RegExp(`(?:^|[^a-z])${escapeRe(name)}(?:[^a-z]|$)`)] as [string, RegExp];
  });

/** Does this title name a protein that isn't among the combo's ingredients? */
const contradictsProteins = (title: string, comboLower: string[]): boolean => {
  const t = ` ${title.toLowerCase()} `;
  for (const [name, re] of PROTEIN_TERMS) {
    if (re.test(t) && !comboLower.some(ing => ing.includes(name))) return true;
  }
  return false;
};

export interface EdgeContext {
  /** Recipes in the mined corpus containing both ingredients. */
  recipeCount: number;
  /** Display-tier tags (strict floors) — what the strip shows. */
  dishTypes: string[];
  methods: string[];
  cuisines: string[];
  /** Unsteered "seen in" receipts (the primary slice — display-identical to always). */
  titles: string[];
  /** Primaries + steer-backing extras; the pool a steered lookup filters by tag. */
  allTitles: string[];
}

export const getEdgeContext = (a: string, b: string): EdgeContext | null => {
  const entry = pairingContext[pairKey(a.toLowerCase(), b.toLowerCase())];
  if (!entry) return null;
  const [recipeCount, dish, method, cuisine, titles, dishDisplay, cuisineDisplay, primaryCount] = entry;
  return {
    recipeCount,
    // Dish/cuisine arrays carry a loose steering tier after the display tier —
    // slice so display (and combo aggregation) keeps its precision.
    dishTypes: dish.slice(0, dishDisplay).map(i => CONTEXT_DISH_TYPES[i]),
    methods: method.map(i => CONTEXT_METHODS[i]),
    cuisines: cuisine.slice(0, cuisineDisplay).map(i => CONTEXT_CUISINES[i]),
    // Primaries first (the unsteered display), then steer-backing extras.
    titles: titles.slice(0, primaryCount).map(i => CONTEXT_TITLES[i]),
    allTitles: titles.map(i => CONTEXT_TITLES[i]),
  };
}

/** Tag groups that can steer generation. Methods are display-only. */
export type SteerGroup = 'dish' | 'cuisine';

// Runtime title classifier, rebuilt from CONTEXT_TAG_KEYWORDS with the IDENTICAL regex
// construction the pipeline uses (lib.mjs loadTitleClassifier): `(?:^|[^a-z])`…`(?:e?s)?`
// plural, `(?=[^a-z]|$)` boundary. Because merge-time pruning and this filter share the
// same keywords + construction, they can never disagree about which tag a title carries.
// Lazily compiled + memoized — the keyword tables ride in the lazy context chunk.
let compiledTagRes: Record<SteerGroup, Map<string, RegExp>> | null = null;
const getTagClassifier = (): Record<SteerGroup, Map<string, RegExp>> => {
  if (compiledTagRes) return compiledTagRes;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const compile = (group: Record<string, string[]>) => {
    const m = new Map<string, RegExp>();
    for (const [tag, keywords] of Object.entries(group)) {
      m.set(tag, new RegExp(`(?:^|[^a-z])(?:${keywords.map(esc).join('|')})(?:e?s)?(?=[^a-z]|$)`));
    }
    return m;
  };
  compiledTagRes = {
    dish: compile(CONTEXT_TAG_KEYWORDS.dish),
    cuisine: compile(CONTEXT_TAG_KEYWORDS.cuisine),
  };
  return compiledTagRes;
};

/** Does this receipt title itself carry the steered tag? (Same test the pipeline pruned by.) */
export const titleCarriesTag = (title: string, group: SteerGroup, tag: string): boolean => {
  const re = getTagClassifier()[group].get(tag);
  return re ? re.test(title.toLowerCase()) : false;
};

/**
 * Restrict a flavor map to edges whose mined context carries the given tag — the
 * engine behind tag-click steering ("lock into Mexican / desserts and shuffle").
 *
 * This SUBSETS the graph, never widens it: every steered edge is a real flavor-map
 * edge, so any combination generated from the result is exactly as mutually
 * compatible as before. The pairing algorithm itself is untouched (see CLAUDE.md —
 * steering changes the inputs, not the check).
 */
export const filterFlavorMapByTag = (
  flavorMap: Map<string, Set<string>>,
  group: SteerGroup,
  tag: string
): Map<string, Set<string>> => {
  const table = group === 'dish' ? CONTEXT_DISH_TYPES : CONTEXT_CUISINES;
  // Full tuple arrays — display tier plus the loose steering tier — so membership is
  // deliberately more generous than what the strip displays.
  const pos = group === 'dish' ? 1 : 3; // tuple slot in PairingContextEntry
  const idx = table.indexOf(tag);
  const out = new Map<string, Set<string>>();
  if (idx < 0) return out;
  const link = (a: string, b: string) => {
    if (!out.has(a)) out.set(a, new Set());
    out.get(a)!.add(b);
  };
  flavorMap.forEach((neighbors, a) => {
    neighbors.forEach(b => {
      if (a >= b) return; // visit each undirected edge once
      const entry = pairingContext[pairKey(a, b)];
      if (entry && (entry[pos] as number[]).includes(idx)) {
        link(a, b);
        link(b, a);
      }
    });
  });
  return out;
};

/**
 * Edge counts per steerable tag, richest-first — the same two-tier membership
 * filterFlavorMapByTag uses, so a tag's count is exactly the size of its steered
 * subgraph over the full mined corpus. Corpus-wide (not filtered by enabled
 * sources): used to order browse/suggestion lists, not to gate anything.
 */
export const getSteerTagCounts = (): Record<SteerGroup, Array<{ tag: string; edges: number }>> => {
  const dish = new Array(CONTEXT_DISH_TYPES.length).fill(0);
  const cuisine = new Array(CONTEXT_CUISINES.length).fill(0);
  for (const key in pairingContext) {
    const entry = pairingContext[key];
    entry[1].forEach(i => dish[i]++);
    entry[3].forEach(i => cuisine[i]++);
  }
  const ranked = (counts: number[], table: string[]) =>
    counts
      .map((edges, i) => ({ tag: table[i], edges }))
      .filter(t => t.edges > 0)
      .sort((a, b) => b.edges - a.edges);
  return {
    dish: ranked(dish, CONTEXT_DISH_TYPES),
    cuisine: ranked(cuisine, CONTEXT_CUISINES),
  };
};

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
  /**
   * True when a steer was applied to title selection. With a steer, `titles` holds only
   * receipts that themselves carry the steered tag — so an EMPTY list means "no honest
   * receipt for this steer" and the UI must hide the line rather than fall back.
   */
  steerFiltered: boolean;
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
export const getComboContext = (
  ingredients: string[],
  steer?: { group: SteerGroup; tag: string } | null,
): ComboContext | null => {
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

  const comboLower = ingredients.map(i => i.toLowerCase());
  const minCount = Math.min(...edges.map(e => e.recipeCount));
  const titleScore = new Map<string, number>();
  edges.forEach(e => {
    // Unsteered: vote over the primary "seen in" titles (display-identical to always).
    // Steered: vote over the full receipt pool, but only titles that themselves carry the
    // steered tag — so the "seen in" line can never contradict the active steer.
    const pool = steer
      ? e.allTitles.filter(t => titleCarriesTag(t, steer.group, steer.tag))
      : e.titles;
    pool.forEach((title, pos) => {
      // Per-edge receipts only know two ingredients; screen them against the whole
      // combo so a title naming an absent protein never represents the set.
      if (contradictsProteins(title, comboLower)) return;
      const rarityBonus = e.recipeCount === minCount ? 0.5 : 0;
      titleScore.set(title, (titleScore.get(title) ?? 0) + 1 - pos * 0.01 + rarityBonus);
    });
  });
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
    steerFiltered: !!steer,
  };
};
