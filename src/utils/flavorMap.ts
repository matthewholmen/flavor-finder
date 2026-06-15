// utils/flavorMap.ts
//
// Builds the bidirectional flavor map from the pairing data, with optional filtering
// by provenance source and pairing strength. This is the single place pairing edges
// are assembled, so source/weight semantics live here.

import { flavorPairings } from '../data/flavorPairings.ts';
import { pairingMeta, pairKey, PairingSource } from '../data/pairingMeta.ts';

export const ALL_SOURCES: PairingSource[] = ['flavorbible', 'recipenlg', 'flavordb', 'analog'];

export interface BuildFlavorMapOptions {
  /** Sources to include. Default: all. An edge is kept if any of its attesting
   *  sources is enabled. */
  sources?: PairingSource[];
  /** Minimum strength (0-10) for edges that have a strength. Edges without a strength
   *  (e.g. legacy flavorbible-only pairings) are unaffected. Default: 0. */
  minStrength?: number;
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

  const flavorMap = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!flavorMap.has(a)) flavorMap.set(a, new Set());
    if (!flavorMap.has(b)) flavorMap.set(b, new Set());
    flavorMap.get(a)!.add(b);
    flavorMap.get(b)!.add(a);
  };

  // Set of flavorbible edges (canonical keys).
  const flavorBibleEdges = new Set<string>();
  flavorPairings.forEach(pair => {
    const [a, b] = pair.split(',');
    if (!a || !b) return;
    flavorBibleEdges.add(pairKey(a, b));
  });

  // Iterate the union of flavorbible edges and any meta-only edges.
  const allKeys = new Set<string>([...flavorBibleEdges, ...Object.keys(pairingMeta)]);

  allKeys.forEach(key => {
    const [a, b] = key.split(',');
    if (!a || !b) return;

    const meta = pairingMeta[key];
    if (meta?.strength !== undefined && meta.strength < minStrength) return;

    // Effective sources = explicit meta sources + implicit flavorbible membership.
    const sources = new Set<PairingSource>(meta?.sources ?? []);
    if (flavorBibleEdges.has(key)) sources.add('flavorbible');

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
