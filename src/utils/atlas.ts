// utils/atlas.ts
//
// Pure aggregation layer for the Ingredient Atlas: one ingredient's whole world of
// flavor, assembled read-only from the canonical pairing graph, pairingMeta strength/
// provenance, and ingredient profiles. No React, no async — receipts ("seen in" titles)
// deliberately live outside this module because they come from the lazily-loaded
// context chunk (utils/contextLoader.ts); never import utils/pairingContext.ts here.
//
// The Atlas graph is intentionally NOT the app's user-filtered flavor map: a reference
// page must render identically for everyone (and for deep-link recipients), regardless
// of sidebar source toggles or active tag steering. Same structural quality gates as
// the generator, always all sources.

import { ingredientProfiles } from '../data/ingredientProfiles.ts';
import { pairingMeta, pairKey, PairingSource } from '../data/pairingMeta.ts';
import { ALL_SOURCES, buildFlavorMap, isChefCanon } from './flavorMap.ts';
import type { IngredientProfile } from '../types.ts';

export interface AtlasNeighbor {
  name: string;
  /** 0–10 mined strength; undefined for unscored chef-canon edges. */
  strength?: number;
  /** Edge is in the chef-canon (flavorbible) base list. */
  isCanon: boolean;
  /** Edge is corpus-confirmed (recipenlg). */
  isCorpus: boolean;
  /** All attesting sources, including implicit flavorbible. */
  sources: PairingSource[];
  profile: IngredientProfile | null;
}

export interface AtlasEntry {
  /** Canonical (lowercase) ingredient name as it appears in the graph/profiles. */
  name: string;
  profile: IngredientProfile | null;
  /** Every compatible neighbor, ranked by compareNeighbors. */
  neighbors: AtlasNeighbor[];
  /** Top slice of neighbors for the "best friends" section. */
  bestFriends: AtlasNeighbor[];
  /** "How to season it" (non-Seasonings ingredients) or "what this seasons" (Seasonings). */
  seasoning: { variant: 'season-it' | 'what-it-seasons'; items: AtlasNeighbor[] };
  /** Full neighborhood grouped by category, canonical order, unprofiled last. */
  byCategory: Array<{ category: string; items: AtlasNeighbor[] }>;
}

export const BEST_FRIENDS_PREVIEW = 8;
export const BEST_FRIENDS_MAX = 24;
export const SEASONING_PREVIEW = 6;

export const ATLAS_CATEGORY_ORDER = [
  'Proteins',
  'Vegetables',
  'Fruits',
  'Dairy',
  'Seasonings',
  'Pantry',
  'Grains',
  'Alcohol',
];

/** Bucket label for compatible neighbors that have no ingredient profile. */
export const ATLAS_OTHER_CATEGORY = 'Other';

// --- Canonical graph (lazy singleton) ------------------------------------------------

let atlasGraph: Map<string, Set<string>> | null = null;

/** The canonical Atlas graph: all sources, same quality gates as the generator
 *  (weak-edge pruning + redundant-pair suppression). Built on first use, cached. */
export const getAtlasGraph = (): Map<string, Set<string>> => {
  if (!atlasGraph) {
    atlasGraph = buildFlavorMap({
      sources: ALL_SOURCES,
      pruneWeakEdges: { maxStrength: 2, minSharedNeighbors: 2 },
      suppressRedundant: true,
    }).flavorMap;
  }
  return atlasGraph;
};

// --- Profile lookup (lazy lowercase index; the app's finds are linear scans) ---------

let profileIndex: Map<string, IngredientProfile> | null = null;

export const getProfile = (name: string): IngredientProfile | null => {
  if (!profileIndex) {
    profileIndex = new Map();
    ingredientProfiles.forEach(p => profileIndex!.set(p.name.toLowerCase(), p));
  }
  return profileIndex.get(name.toLowerCase()) ?? null;
};

// --- Ranking --------------------------------------------------------------------------

/**
 * Best-friends order. Double attestation (chef canon AND corpus) outranks everything —
 * two independent sources beat any single number, and strength is only comparable among
 * mined edges. Within a tier: strength desc (unscored → below scored), then canon first,
 * then alphabetical. Provenance badges on every row keep the ranking honest.
 */
export const compareNeighbors = (a: AtlasNeighbor, b: AtlasNeighbor): number => {
  const tierA = a.isCanon && a.isCorpus ? 0 : 1;
  const tierB = b.isCanon && b.isCorpus ? 0 : 1;
  if (tierA !== tierB) return tierA - tierB;
  const strengthA = a.strength ?? -1;
  const strengthB = b.strength ?? -1;
  if (strengthA !== strengthB) return strengthB - strengthA;
  if (a.isCanon !== b.isCanon) return a.isCanon ? -1 : 1;
  return a.name.localeCompare(b.name);
};

// --- Entry assembly -------------------------------------------------------------------

const toNeighbor = (ingredient: string, neighbor: string): AtlasNeighbor => {
  const meta = pairingMeta[pairKey(ingredient, neighbor)];
  const canon = isChefCanon(ingredient, neighbor);
  const sources = new Set<PairingSource>(meta?.sources ?? []);
  if (canon) sources.add('flavorbible');
  return {
    name: neighbor,
    strength: meta?.strength,
    isCanon: canon,
    isCorpus: sources.has('recipenlg'),
    sources: Array.from(sources),
    profile: getProfile(neighbor),
  };
};

/** Assemble the full Atlas entry for one ingredient. Null when the ingredient is
 *  unknown to both the graph and the profiles (bad deep link). */
export const getAtlasEntry = (rawName: string): AtlasEntry | null => {
  const name = rawName.trim().toLowerCase();
  if (!name) return null;
  const graph = getAtlasGraph();
  const profile = getProfile(name);
  const neighborSet = graph.get(name);
  if (!profile && !neighborSet) return null;

  const neighbors = Array.from(neighborSet ?? [])
    .map(n => toNeighbor(name, n))
    .sort(compareNeighbors);

  const bestFriends = neighbors.slice(0, BEST_FRIENDS_MAX);

  // Seasonings get the symmetric section. "Basil seasons oregano" reads as nonsense, so
  // fellow Seasonings (and Pantry) are excluded there — herb-herb affinity still shows
  // in the neighborhood groups. Pantry ingredients keep the "season it" variant on
  // purpose: chili oil or spiced honey are real questions.
  const isSeasoning = profile?.category === 'Seasonings';
  const seasoning: AtlasEntry['seasoning'] = isSeasoning
    ? {
        variant: 'what-it-seasons',
        items: neighbors.filter(n => {
          const cat = n.profile?.category;
          return cat !== undefined && cat !== 'Seasonings' && cat !== 'Pantry';
        }),
      }
    : {
        variant: 'season-it',
        items: neighbors.filter(n => n.profile?.category === 'Seasonings'),
      };

  const groups = new Map<string, AtlasNeighbor[]>();
  neighbors.forEach(n => {
    const cat = n.profile?.category ?? ATLAS_OTHER_CATEGORY;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(n);
  });
  const byCategory = [...ATLAS_CATEGORY_ORDER, ATLAS_OTHER_CATEGORY]
    .filter(cat => groups.has(cat))
    .map(cat => ({
      category: cat,
      // Within a category group, alphabetical reads better than evidence order.
      items: groups.get(cat)!.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));

  return { name, profile, neighbors, bestFriends, seasoning, byCategory };
};
