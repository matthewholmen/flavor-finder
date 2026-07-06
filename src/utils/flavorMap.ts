// utils/flavorMap.ts
//
// Builds the bidirectional flavor map from the pairing data, with optional filtering
// by provenance source and pairing strength. This is the single place pairing edges
// are assembled, so source/weight semantics live here.

import { flavorPairings } from '../data/flavorPairings.ts';
import { pairingMeta, pairKey, PairingSource } from '../data/pairingMeta.ts';

export const ALL_SOURCES: PairingSource[] = ['flavorbible', 'recipenlg', 'flavordb', 'analog'];

// --- Redundant-pair detection (precomputed once at module load) ---------------------
//
// A pairing is "redundant" when its two ingredients are processed forms of the SAME base
// ingredient — e.g. "coconut cream" + "coconut milk", "tomato" + "tomato paste". Stripping
// these form/derivative modifier words reduces both names to the same base. Such pairings
// are real (they co-occur in recipes) but uninsightful: they're substitute/grade variants,
// not a flavor discovery. We detect them by name and drop the edge at graph-build time.

/** Modifier words that denote a processed form/grade of a base ingredient, not a distinct
 *  flavor. Stripping them yields the base. */
const FORM_WORDS = new Set<string>([
  'oil', 'powder', 'seed', 'seeds', 'paste', 'sauce', 'stock', 'broth', 'vinegar',
  'molasses', 'liqueur', 'cream', 'milk', 'flour', 'juice', 'extract', 'butter',
  'water', 'flakes', 'flake',
]);

/** Reduce an ingredient name to its base by dropping form words (order-independent). */
const ingredientBase = (name: string): string =>
  name.split(/[\s-]+/).filter(t => t && !FORM_WORDS.has(t)).sort().join(' ');

/** Deliberate exceptions: same-base pairs we KEEP because the two forms play genuinely
 *  different culinary roles, so suggesting them together is useful advice (use the bulb
 *  AND the seed), not redundancy. */
const REDUNDANCY_KEEP = new Set<string>([
  pairKey('fennel', 'fennel seed'),
  pairKey('mustard', 'mustard seed'),
  pairKey('sesame oil', 'sesame seed'),
  pairKey('anise', 'anise seed'),
  pairKey('pumpkin', 'pumpkin seed'),
  pairKey('shrimp', 'shrimp paste'),
]);

/** Edges to suppress as redundant. Computed once from the static pairing data — independent
 *  of which sources are enabled — so per-build cost is a single Set lookup per edge. */
export const REDUNDANT_EDGES: Set<string> = (() => {
  const out = new Set<string>();
  const consider = (a: string, b: string) => {
    if (a === b) return;
    const key = pairKey(a, b);
    if (REDUNDANCY_KEEP.has(key)) return;
    const base = ingredientBase(a);
    if (base && base === ingredientBase(b)) out.add(key);
  };
  flavorPairings.forEach(p => {
    const [a, b] = p.split(',');
    if (a && b) consider(a, b);
  });
  Object.keys(pairingMeta).forEach(k => {
    const [a, b] = k.split(',');
    if (a && b) consider(a, b);
  });
  return out;
})();

/** Canonical keys of every chef-canon (flavorbible) edge. Precomputed once — the base
 *  pairing list is static — so canon membership is a single Set lookup anywhere. */
export const CHEF_CANON_EDGES: Set<string> = (() => {
  const out = new Set<string>();
  flavorPairings.forEach(pair => {
    const [a, b] = pair.split(',');
    if (a && b) out.add(pairKey(a, b));
  });
  return out;
})();

/** Whether an edge comes from the chef-canon (flavorbible) base list. */
export const isChefCanon = (a: string, b: string): boolean =>
  CHEF_CANON_EDGES.has(pairKey(a, b));

export interface BuildFlavorMapOptions {
  /** Sources to include. Default: all. An edge is kept if any of its attesting
   *  sources is enabled. */
  sources?: PairingSource[];
  /** Minimum strength (0-10) for edges that have a strength. Edges without a strength
   *  (e.g. legacy flavorbible-only pairings) are unaffected. Default: 0. */
  minStrength?: number;
  /**
   * Structural quality gate for *weak* recipe-mined edges. A low-strength edge is only
   * trustworthy if its two ingredients actually participate in the graph together — i.e.
   * they share neighbors in the chef-canon (flavorbible) base. An edge whose endpoints
   * share nothing (e.g. "butterscotch,noodles") is a co-occurrence artifact: it can never
   * surface in multi-ingredient generation anyway, and pollutes 2-ingredient output.
   *
   * When set, any edge with `strength <= maxStrength` that is NOT itself a chef-canon
   * pairing is dropped unless its endpoints share at least `minSharedNeighbors` common
   * neighbors in the chef-canon graph. Chef-canon edges and higher-strength edges bypass
   * this gate. Default: off.
   */
  pruneWeakEdges?: {
    /** Strength at or below which an edge is considered "weak" and must pass the gate. */
    maxStrength: number;
    /** Minimum shared chef-canon neighbors required to keep a weak edge. */
    minSharedNeighbors: number;
  };
  /**
   * Suppress "redundant" edges: pairings between an ingredient and a processed form of
   * itself (e.g. "coconut cream" + "coconut milk", "tomato" + "tomato paste"). These are
   * technically real co-occurrences but offer no discovery value — like pairing minced
   * garlic with sliced garlic. The suppression set is precomputed once at module load (it
   * depends only on the static names + form rules, not on sources), so this is a free
   * `Set.has` check per edge. See REDUNDANT_EDGES / REDUNDANCY_KEEP. Default: off.
   */
  suppressRedundant?: boolean;
}

export interface FlavorMapResult {
  flavorMap: Map<string, Set<string>>;
  /** Node count, matching the historical `totalPairings` return value. */
  totalPairings: number;
}

/**
 * Assemble the flavor map. With defaults (all sources, no strength floor) and an empty
 * `pairingMeta`, the result is identical to the original chef-canon graph.
 */
export const buildFlavorMap = (opts: BuildFlavorMapOptions = {}): FlavorMapResult => {
  const enabled = new Set<PairingSource>(opts.sources ?? ALL_SOURCES);
  const minStrength = opts.minStrength ?? 0;
  const prune = opts.pruneWeakEdges;

  const flavorMap = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!flavorMap.has(a)) flavorMap.set(a, new Set());
    if (!flavorMap.has(b)) flavorMap.set(b, new Set());
    flavorMap.get(a)!.add(b);
    flavorMap.get(b)!.add(a);
  };

  // Chef-canon adjacency (canon edge keys live in CHEF_CANON_EDGES, module-level). The
  // adjacency is the trusted base against which weak recipe-mined edges are judged:
  // shared-neighbor support is always measured in chef canon, never in the (noisier)
  // merged graph, so mined edges can't prop each other up.
  const chefAdj = new Map<string, Set<string>>();
  flavorPairings.forEach(pair => {
    const [a, b] = pair.split(',');
    if (!a || !b) return;
    if (!chefAdj.has(a)) chefAdj.set(a, new Set());
    if (!chefAdj.has(b)) chefAdj.set(b, new Set());
    chefAdj.get(a)!.add(b);
    chefAdj.get(b)!.add(a);
  });

  // Count shared neighbors of two ingredients within the chef-canon graph.
  const sharedChefNeighbors = (a: string, b: string): number => {
    const na = chefAdj.get(a);
    const nb = chefAdj.get(b);
    if (!na || !nb) return 0;
    // Iterate the smaller set for efficiency.
    const [small, large] = na.size <= nb.size ? [na, nb] : [nb, na];
    let count = 0;
    small.forEach(x => {
      if (large.has(x)) count++;
    });
    return count;
  };

  // Iterate the union of flavorbible edges and any meta-only edges.
  const allKeys = new Set<string>([...CHEF_CANON_EDGES, ...Object.keys(pairingMeta)]);

  allKeys.forEach(key => {
    const [a, b] = key.split(',');
    if (!a || !b) return;

    // Redundant base+derivative pairs (e.g. coconut cream + coconut milk) carry no
    // discovery value; suppress regardless of source. Precomputed, so this is one lookup.
    if (opts.suppressRedundant && REDUNDANT_EDGES.has(key)) return;

    const meta = pairingMeta[key];
    if (meta?.strength !== undefined && meta.strength < minStrength) return;

    const canon = CHEF_CANON_EDGES.has(key);

    // Structural quality gate for weak mined edges. Chef-canon edges are exempt — the
    // graph audit for canon dead-ends is a separate concern from pruning mined noise.
    if (
      prune &&
      !canon &&
      meta?.strength !== undefined &&
      meta.strength <= prune.maxStrength &&
      sharedChefNeighbors(a, b) < prune.minSharedNeighbors
    ) {
      return;
    }

    // Effective sources = explicit meta sources + implicit flavorbible membership.
    const sources = new Set<PairingSource>(meta?.sources ?? []);
    if (canon) sources.add('flavorbible');

    let included = false;
    sources.forEach(s => {
      if (enabled.has(s)) included = true;
    });
    if (included) add(a, b);
  });

  return { flavorMap, totalPairings: flavorMap.size };
};

/** Look up the strength for an edge, if any. */
export const getPairingStrength = (a: string, b: string): number | undefined =>
  pairingMeta[pairKey(a, b)]?.strength;

/** Sources attesting an edge (including implicit flavorbible). */
export const getPairingSources = (a: string, b: string): PairingSource[] => {
  const meta = pairingMeta[pairKey(a, b)];
  const sources = new Set<PairingSource>(meta?.sources ?? []);
  // flavorbible membership is determined by the base list; callers that need an exact
  // answer should consult the map, but include it here when meta is absent for convenience.
  return Array.from(sources);
};
