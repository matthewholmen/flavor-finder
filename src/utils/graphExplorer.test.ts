import {
  computeEgoNetwork,
  computeEgoNetworkCanonical,
  intersectNeighborhoods,
  isStaple,
  mostConstrainingPick,
} from './graphExplorer';
import { getAtlasGraph } from './atlas';

// A tiny hand-built graph: a center (c) with four partners, two of which (p1,p2) also
// pair with each other, forming a visible cluster; p4 is a loner partner.
//   c — p1, p2, p3, p4 ; p1 — p2 ; p2 — p3
const mock = (): Map<string, Set<string>> => {
  const g = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!g.has(a)) g.set(a, new Set());
    if (!g.has(b)) g.set(b, new Set());
    g.get(a)!.add(b);
    g.get(b)!.add(a);
  };
  add('c', 'p1');
  add('c', 'p2');
  add('c', 'p3');
  add('c', 'p4');
  add('p1', 'p2');
  add('p2', 'p3');
  return g;
};

describe('computeEgoNetwork', () => {
  it('returns the center plus all partners as nodes', () => {
    const net = computeEgoNetwork('c', mock());
    expect(net.center).toBe('c');
    expect(net.nodes.map(n => n.name).sort()).toEqual(['c', 'p1', 'p2', 'p3', 'p4']);
    expect(net.nodes.find(n => n.name === 'c')!.isCenter).toBe(true);
    expect(net.totalPartners).toBe(4);
    expect(net.hiddenPartners).toEqual([]);
  });

  it('emits spokes to every partner and rim edges among partners, each once', () => {
    const net = computeEgoNetwork('c', mock());
    const spokes = net.edges.filter(e => e.toCenter);
    const rim = net.edges.filter(e => !e.toCenter);
    expect(spokes).toHaveLength(4); // c↔p1..p4
    // rim: p1↔p2 and p2↔p3
    const rimKeys = rim.map(e => [e.source, e.target].sort().join(' ')).sort();
    expect(rimKeys).toEqual(['p1 p2', 'p2 p3']);
  });

  it('every edge is a real pairing in the source graph', () => {
    const g = mock();
    const net = computeEgoNetwork('c', g);
    for (const e of net.edges) {
      expect(g.get(e.source)!.has(e.target)).toBe(true);
      expect(g.get(e.target)!.has(e.source)).toBe(true);
    }
  });

  it('caps hubs, preferring partners that connect to each other', () => {
    const net = computeEgoNetwork('c', mock(), { degreeCap: 2 });
    const partners = net.nodes.filter(n => !n.isCenter).map(n => n.name);
    expect(partners).toHaveLength(2);
    // p2 (touches p1 and p3) and p1 (touches p2) are the most-connected → kept.
    expect(partners.sort()).toEqual(['p1', 'p2']);
    // p3 and p4 are the least-clustered → hidden, alphabetical.
    expect(net.hiddenPartners).toEqual(['p3', 'p4']);
  });

  it('handles an unknown / isolated center gracefully', () => {
    const net = computeEgoNetwork('nope', mock());
    expect(net.nodes).toHaveLength(1);
    expect(net.edges).toHaveLength(0);
    expect(net.totalPartners).toBe(0);
  });

  it('include narrows drawn partners but totalPartners stays the map truth', () => {
    const g = mock();
    const net = computeEgoNetwork('c', g, { include: n => n === 'p1' || n === 'p4' });
    const partners = net.nodes.filter(n => !n.isCenter).map(n => n.name);
    expect(partners.sort()).toEqual(['p1', 'p4']);
    expect(net.totalPartners).toBe(4); // unfiltered count — the footer's honest total
    expect(net.hiddenPartners).toEqual([]); // nothing capped within the filter
    // Filtered views still only ever draw real pairings.
    for (const e of net.edges) {
      expect(g.get(e.source)!.has(e.target)).toBe(true);
    }
  });

  it('include runs before the cap, digging deeper into the chosen group', () => {
    // Cap 1 without a filter keeps the best-clustered partner (p2). Filtering to the
    // loner p4 must still surface p4 — the filter narrows the pool BEFORE the cap.
    const net = computeEgoNetwork('c', mock(), { degreeCap: 1, include: n => n === 'p4' });
    const partners = net.nodes.filter(n => !n.isCenter).map(n => n.name);
    expect(partners).toEqual(['p4']);
  });
});

describe('intersectNeighborhoods', () => {
  it('returns candidates compatible with every pick, minus the picks', () => {
    const g = mock();
    // c's neighbors: p1..p4 ; p2's neighbors: c,p1,p3 → intersection {p1,p3}
    const result = intersectNeighborhoods(g, ['c', 'p2']);
    expect([...result].sort()).toEqual(['p1', 'p3']);
    expect(result.has('c')).toBe(false);
    expect(result.has('p2')).toBe(false);
  });

  it('is empty with no picks', () => {
    expect(intersectNeighborhoods(mock(), []).size).toBe(0);
  });

  it('shrinks monotonically as picks are added', () => {
    const g = mock();
    const one = intersectNeighborhoods(g, ['c']);
    const two = intersectNeighborhoods(g, ['c', 'p2']);
    expect(two.size).toBeLessThanOrEqual(one.size);
    // Every survivor of the tighter set was present in the looser set.
    two.forEach(x => expect(one.has(x)).toBe(true));
  });
});

describe('mostConstrainingPick', () => {
  it('names the pick with the smallest neighborhood', () => {
    const g = mock();
    // c has 4 neighbors; p4 has 1 → p4 is most constraining.
    expect(mostConstrainingPick(g, ['c', 'p4'])).toBe('p4');
  });
});

// A guard against the inviolable rule: on the real canonical graph, nothing an
// intersection admits may be incompatible with any pick.
describe('canonical graph integrity', () => {
  it('ego edges are all real pairings for a real ingredient', () => {
    const net = computeEgoNetworkCanonical('acorn squash');
    const graph = getAtlasGraph();
    expect(net.nodes.length).toBeGreaterThan(1);
    for (const e of net.edges) {
      expect(graph.get(e.source)?.has(e.target)).toBe(true);
    }
  });

  it('build-mode survivors are mutually compatible with every pick', () => {
    const graph = getAtlasGraph();
    const picks = ['garlic', 'tomato'];
    const survivors = intersectNeighborhoods(graph, picks);
    survivors.forEach(s => {
      picks.forEach(p => expect(graph.get(p)?.has(s)).toBe(true));
    });
  });

  it('isStaple catches the ubiquitous hubs and spares distinctive ingredients', () => {
    const graph = getAtlasGraph();
    // The examples the "hide staples" toggle was designed around.
    for (const hub of ['rice', 'lemon', 'garlic', 'olive oil', 'potato']) {
      expect(isStaple(graph, hub)).toBe(true);
    }
    for (const distinct of ['sumac', 'goose', 'chickpea', 'escolar']) {
      expect(isStaple(graph, distinct)).toBe(false);
    }
    // Unknown names are simply not staples, never a crash.
    expect(isStaple(graph, 'not-an-ingredient')).toBe(false);
  });
});
