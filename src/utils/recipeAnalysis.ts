// utils/recipeAnalysis.ts
//
// Pure, read-only analysis of a matched recipe against the flavor map: pairwise
// coverage, aggregate taste profile, and in-context substitutes. No React, no DOM.
//
// ⚠️ Core principle: this module never relaxes or reinterprets pairing. A pair either
// has a map edge or it doesn't; missing edges are reported as "unexplored" coverage,
// never scored, never guessed. There is deliberately no single numeric recipe score.

import { getAtlasGraph, getProfile } from './atlas.ts';
import { getPairingStrength, getPairingSources, isChefCanon } from './flavorMap.ts';
import { PairingSource } from '../data/pairingMeta.ts';
import { suggestSubstitutes, SubstituteSuggestion } from './suggestSubstitutes.ts';

export interface PairCoverage {
  a: string;
  b: string;
  confirmed: boolean;
  chefCanon: boolean;
  strength?: number;
  sources: PairingSource[];
}

export type TasteKey =
  | 'sweet' | 'salty' | 'sour' | 'umami' | 'fat' | 'spicy' | 'aromatic';

export const TASTE_KEYS: TasteKey[] = [
  'sweet', 'salty', 'sour', 'umami', 'fat', 'spicy', 'aromatic',
];

export interface RecipeAnalysis {
  core: string[];
  supporting: string[];
  pairs: PairCoverage[];
  confirmedCount: number;
  /** confirmed / total pairs among core ingredients; 1 when fewer than 2 core. */
  coverage: number;
  /** Mean of the core ingredients' 7-dim profiles, one decimal. */
  tasteProfile: Record<TasteKey, number>;
  /** Per core ingredient: substitutes that pair with every OTHER core ingredient. */
  substitutes: Record<string, SubstituteSuggestion[]>;
}

// Canonicals that are real flavor-map nodes but read as supporting in almost any
// recipe (present everywhere, so pairwise analysis of them is noise). Users can
// promote them back to core in the UI.
const SUPPORTING_CANONICALS = new Set<string>([
  'vegetable oil',
  'sugar',
  'black peppercorn',
]);

/**
 * Supporting = ubiquitous background, core = the recipe's flavor identity.
 * Rule: the explicit list above, or a low-intensity Pantry item (intensity's
 * first consumer — safe because the category guard keeps proteins/produce core).
 */
export const isSupporting = (name: string): boolean => {
  if (SUPPORTING_CANONICALS.has(name)) return true;
  const profile = getProfile(name);
  if (!profile) return false;
  return profile.category === 'Pantry' && (profile.intensity ?? 10) <= 2;
};

export const splitCoreSupporting = (
  names: string[],
): { core: string[]; supporting: string[] } => {
  const seen = new Set<string>();
  const core: string[] = [];
  const supporting: string[] = [];
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    (isSupporting(name) ? supporting : core).push(name);
  }
  return { core, supporting };
};

// ---- Recipe-scale helpers (the Flavor Report) --------------------------------------

/** Mean 7-dim taste profile of the named ingredients (one decimal). */
export const aggregateTaste = (names: string[]): Record<TasteKey, number> => {
  const out = Object.fromEntries(TASTE_KEYS.map(k => [k, 0])) as Record<TasteKey, number>;
  const profiles = names
    .map(getProfile)
    .filter((p): p is NonNullable<ReturnType<typeof getProfile>> => !!p);
  if (profiles.length === 0) return out;
  for (const p of profiles) {
    for (const k of TASTE_KEYS) out[k] += p.flavorProfile[k];
  }
  for (const k of TASTE_KEYS) {
    out[k] = Math.round((out[k] / profiles.length) * 10) / 10;
  }
  return out;
};

/** One ingredient's weave row: its confirmed vs unexplored partners within the core. */
export interface WeaveRow {
  name: string;
  confirmed: string[];
  unexplored: string[];
}

/**
 * Per-ingredient connection structure, sorted most- to least-woven. At recipe
 * scale (10–25 ingredients) this replaces the pair-chip wall: the story is which
 * ingredients are connective tissue and which are loose threads — and a loose
 * thread is "unexplored", never "wrong".
 */
export const computeWeave = (
  core: string[],
  graph: Map<string, Set<string>> = getAtlasGraph(),
): WeaveRow[] =>
  core
    .map(name => {
      const others = core.filter(n => n !== name);
      const neighbors = graph.get(name);
      const confirmed = others.filter(n => neighbors?.has(n));
      const unexplored = others.filter(n => !neighbors?.has(n));
      return { name, confirmed, unexplored };
    })
    .sort(
      (a, b) =>
        b.confirmed.length - a.confirmed.length || a.name.localeCompare(b.name),
    );

/**
 * Substitutes at recipe scale. Context = the target's CONFIRMED partners within
 * the core — the connections the recipe actually exercises — because demanding a
 * candidate pair with all N-1 ingredients collapses toward zero results as N
 * grows (edges the original never had can't be broken by a swap). This changes
 * an INPUT to suggestSubstitutes, never its admission rule: every suggestion
 * still holds a flavor-map edge to everything it's checked against.
 */
export const substitutesInRecipe = (
  target: string,
  core: string[],
  limit = 5,
  graph: Map<string, Set<string>> = getAtlasGraph(),
): SubstituteSuggestion[] => {
  const confirmed = core.filter(
    n => n !== target && graph.get(target)?.has(n),
  );
  return suggestSubstitutes(target, confirmed, graph, limit);
};

/**
 * Analyze canonical ingredient names against the flavor map.
 * Pass `coreOverride` when the user has promoted/demoted ingredients; otherwise
 * the core/supporting split is computed here.
 */
export const analyzeRecipe = (
  names: string[],
  opts: { coreOverride?: string[]; substituteLimit?: number } = {},
): RecipeAnalysis => {
  const graph = getAtlasGraph();
  const split = splitCoreSupporting(names);
  const core = opts.coreOverride ?? split.core;
  const supporting = opts.coreOverride
    ? names.filter(n => !opts.coreOverride!.includes(n))
    : split.supporting;

  const pairs: PairCoverage[] = [];
  for (let i = 0; i < core.length; i++) {
    for (let j = i + 1; j < core.length; j++) {
      const a = core[i];
      const b = core[j];
      const confirmed = graph.get(a)?.has(b) ?? false;
      pairs.push({
        a,
        b,
        confirmed,
        chefCanon: confirmed && isChefCanon(a, b),
        strength: confirmed ? getPairingStrength(a, b) : undefined,
        sources: confirmed ? getPairingSources(a, b) : [],
      });
    }
  }
  const confirmedCount = pairs.filter(p => p.confirmed).length;
  const coverage = pairs.length === 0 ? 1 : confirmedCount / pairs.length;

  const tasteProfile = Object.fromEntries(
    TASTE_KEYS.map(k => [k, 0]),
  ) as Record<TasteKey, number>;
  const profiles = core
    .map(getProfile)
    .filter((p): p is NonNullable<ReturnType<typeof getProfile>> => !!p);
  if (profiles.length > 0) {
    for (const p of profiles) {
      for (const k of TASTE_KEYS) tasteProfile[k] += p.flavorProfile[k];
    }
    for (const k of TASTE_KEYS) {
      tasteProfile[k] = Math.round((tasteProfile[k] / profiles.length) * 10) / 10;
    }
  }

  const substitutes: Record<string, SubstituteSuggestion[]> = {};
  for (const name of core) {
    const context = core.filter(n => n !== name);
    substitutes[name] = suggestSubstitutes(
      name, context, graph, opts.substituteLimit ?? 6,
    );
  }

  return { core, supporting, pairs, confirmedCount, coverage, tasteProfile, substitutes };
};
