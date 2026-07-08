// utils/pairingContext.test.ts
//
// Steering-precision regression tests. The July 2026 "dessert steer produced
// sage/potato/carrot/peas" bug traced to the tag classifier: bare keywords like
// "pie"/"cake"/"pudding" tagged savory titles (Chicken Pot Pie, Crab Cakes, Corn
// Pudding) as desserts, which then seeded dessert membership on savory edges.
// The fix is "!"-prefixed exclusion phrases in CONTEXT_TAG_KEYWORDS, honored
// identically by the pipeline (lib.mjs), the invariant checker, and the client
// (titleCarriesTag). These tests pin the client half of that contract.

import { titleCarriesTag, getSteerTagCounts, filterFlavorMapByTag } from './pairingContext.ts';
import { CONTEXT_TAG_KEYWORDS, CONTEXT_DISH_TYPES } from '../data/pairingContext.ts';
import { buildFlavorMap } from './flavorMap.ts';

const { flavorMap } = buildFlavorMap();

describe('titleCarriesTag exclusion semantics', () => {
  it('ships exclusion entries for desserts (the classifier fix is present in data)', () => {
    expect(CONTEXT_TAG_KEYWORDS.dish.desserts.some(k => k.startsWith('!'))).toBe(true);
  });

  it.each([
    'Chicken Pot Pie',
    "Shepherd's Pie",
    'Crab Cakes',
    'Corn Pudding',
    'Salmon Mousse',
    'Tamale Pie',
    'Spaghetti Pie',
    'Truffle Fries',
  ])('savory title "%s" does not carry desserts', (title) => {
    expect(titleCarriesTag(title, 'dish', 'desserts')).toBe(false);
  });

  it.each([
    'Apple Pie',
    'Sweet Potato Pie',
    'Carrot Cake',
    'Banana Pudding',
    'Chocolate Mousse',
    'Peach Cobbler',
  ])('dessert title "%s" carries desserts', (title) => {
    expect(titleCarriesTag(title, 'dish', 'desserts')).toBe(true);
  });

  it('keeps cuisine exclusions honest (German Chocolate Cake is not Central European)', () => {
    expect(titleCarriesTag('German Chocolate Cake', 'cuisine', 'Central European')).toBe(false);
    expect(titleCarriesTag('German Potato Salad', 'cuisine', 'Central European')).toBe(true);
  });
});

describe('steered dessert subgraph', () => {
  it('does not admit the savory combo the bug report showed', () => {
    // Every edge of sage/potato/carrot/peas carried a desserts tag in the July 2026
    // data purely via pot-pie/shepherd's-pie receipts. With honest tags, at least one
    // of these edges must fall out of the desserts subgraph, so the steered solver
    // can never assemble this combo under a desserts steer.
    const steered = filterFlavorMapByTag(flavorMap, 'dish', 'desserts');
    const combo = ['sage', 'potato', 'carrot', 'peas'];
    let intactEdges = 0;
    let totalEdges = 0;
    for (let i = 0; i < combo.length; i++) {
      for (let j = i + 1; j < combo.length; j++) {
        totalEdges++;
        if (steered.get(combo[i])?.has(combo[j])) intactEdges++;
      }
    }
    expect(intactEdges).toBeLessThan(totalEdges);
  });

  it('still has a workably rich desserts subgraph (steering stays available)', () => {
    const counts = getSteerTagCounts();
    const desserts = counts.dish.find(t => t.tag === 'desserts');
    expect(desserts).toBeDefined();
    // Enough edges to generate 5-slot combos with variety; guards the "severely
    // limited" half of the complaint against overzealous pruning.
    expect(desserts!.edges).toBeGreaterThan(200);
  });

  it('classic dessert pairings survive in the steered map', () => {
    const steered = filterFlavorMapByTag(flavorMap, 'dish', 'desserts');
    expect(steered.get('apple')?.has('cinnamon')).toBe(true);
  });

  it('every steerable dish tag still exists in the vocabulary', () => {
    for (const tag of CONTEXT_DISH_TYPES) {
      expect(CONTEXT_TAG_KEYWORDS.dish[tag]).toBeDefined();
    }
  });
});
