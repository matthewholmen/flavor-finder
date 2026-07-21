// utils/suggestSubstitutes.ts
//
// P4's first consumer: contextual substitution. "Swap the carrot in this soup" —
// candidates are drawn from the flavor-map neighborhood of EVERY context ingredient
// (set intersection — the engine as judge, per the inviolable-pairing rule), then
// ranked by similarity to the target: taste-profile distance + texture/function
// overlap. Texture and function never ADMIT a candidate the flavor map wouldn't
// allow — but they may narrow the pool further (the dish-frame class of move):
// a swap must be able to play at least one of the target's structural roles and
// suit at least one of its cooking methods (see SUBSTITUTION_PLAN Layer 0).
//
// Pure and UI-independent: the caller supplies the map (canonical Atlas graph for
// reference surfaces, the user-filtered map inside generation).

import { IngredientProfile, IngredientFunction, TASTE_PROPERTIES, Texture } from '../types.ts';
import { getProfile } from './atlas.ts';

export interface SubstituteSuggestion {
  name: string;
  /** Composite 0–1 rank score (taste closeness + texture/function overlap). */
  score: number;
  /** Raw Euclidean distance across the 7 taste dimensions (0 = identical). */
  tasteDistance: number;
  /** Textures this candidate shares with the target — display-ready. */
  sharedTextures: Texture[];
  /** Functions this candidate shares with the target — display-ready. */
  sharedFunctions: IngredientFunction[];
  /**
   * Same category+subcategory as the target (mushroom → shiitake): often the
   * best swap, but the UI labels it "same family" rather than a true switch.
   */
  sameFamily: boolean;
}

// Max possible Euclidean distance over 7 dims of 0–10 → normalizer for tasteDistance.
const MAX_TASTE_DISTANCE = Math.sqrt(7 * 10 * 10);

// Taste closeness carries half the score; texture and function overlap split the rest.
// Structural overlap is what makes "different root vegetable" beat "any compatible
// ingredient", but taste is what keeps the swap from changing the dish's character.
const W_TASTE = 0.5;
const W_TEXTURE = 0.25;
const W_FUNCTION = 0.25;

const tasteDistance = (a: IngredientProfile, b: IngredientProfile): number => {
  let sum = 0;
  for (const dim of TASTE_PROPERTIES) {
    const d = (a.flavorProfile[dim] ?? 0) - (b.flavorProfile[dim] ?? 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
};

/** Jaccard overlap; two empty sets count as a full match (both texture-neutral). */
const jaccard = (a: readonly string[] = [], b: readonly string[] = []): number => {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const shared = a.filter(x => setB.has(x)).length;
  return shared / (a.length + b.length - shared);
};

/**
 * Suggest substitutes for `target` that stay compatible with every ingredient in
 * `context` per the supplied flavor map.
 *
 * - `context` is the rest of the dish (the target itself is excluded automatically).
 *   With an empty context, candidates fall back to the target's own neighborhood —
 *   ingredients known to keep the same company.
 * - `map` decides admission (which candidates exist at all); profiles only rank.
 *   Candidates without a profile are dropped — nothing to rank them by.
 */
export const suggestSubstitutes = (
  target: string,
  context: string[],
  map: Map<string, Set<string>>,
  limit = 12,
): SubstituteSuggestion[] => {
  const targetProfile = getProfile(target);
  if (!targetProfile) return [];

  const exclude = new Set([target, ...context]);
  const contextSets = context
    .map(name => map.get(name))
    .filter((s): s is Set<string> => !!s);

  let candidates: string[];
  if (contextSets.length > 0) {
    // Intersection of every context neighborhood — engine as judge.
    const [first, ...rest] = contextSets;
    candidates = [...first].filter(name => rest.every(s => s.has(name)));
  } else {
    candidates = [...(map.get(target) ?? [])];
  }

  const targetFns = targetProfile.functions ?? [];
  const targetMethods = targetProfile.cookingMethods ?? [];

  const suggestions: SubstituteSuggestion[] = [];
  for (const name of candidates) {
    if (exclude.has(name)) continue;
    const profile = getProfile(name);
    if (!profile) continue;

    // Role guard: a role-carrying ingredient (bulk, acid, …) can only be
    // swapped for something able to play at least one of the same roles.
    // Candidates with no structural role can't fill one, so they drop too —
    // fixing tags (not loosening this) is the remedy when a good swap is
    // missing (SUBSTITUTION_PLAN Layer 0.5).
    if (targetFns.length > 0) {
      const fns = profile.functions ?? [];
      if (!fns.some(f => targetFns.includes(f))) continue;
    }

    // Technique guard: the swap must suit at least one of the target's
    // cooking methods. `cookingMethods: []` means audited-not-applicable
    // (condiments, vinegars) — not interchangeable with a cooked ingredient.
    if (targetMethods.length > 0) {
      const methods = profile.cookingMethods ?? [];
      if (!methods.some(m => targetMethods.includes(m))) continue;
    }

    const dist = tasteDistance(targetProfile, profile);
    const tasteSim = 1 - dist / MAX_TASTE_DISTANCE;
    const texSim = jaccard(targetProfile.textures, profile.textures);
    const fnSim = jaccard(targetProfile.functions, profile.functions);

    suggestions.push({
      name,
      score: W_TASTE * tasteSim + W_TEXTURE * texSim + W_FUNCTION * fnSim,
      tasteDistance: dist,
      sharedTextures: (targetProfile.textures ?? []).filter(t => profile.textures?.includes(t)),
      sharedFunctions: (targetProfile.functions ?? []).filter(f => profile.functions?.includes(f)),
      sameFamily:
        profile.category === targetProfile.category &&
        profile.subcategory === targetProfile.subcategory,
    });
  }

  suggestions.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return suggestions.slice(0, limit);
};
