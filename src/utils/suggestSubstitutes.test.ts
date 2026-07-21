import { suggestSubstitutes } from './suggestSubstitutes';

// Real profile names (ranking reads real profile data) over a synthetic map, so
// admission — the part the inviolable pairing rule governs — is fully controlled.
const mapOf = (edges: Record<string, string[]>): Map<string, Set<string>> =>
  new Map(Object.entries(edges).map(([k, v]) => [k, new Set(v)]));

describe('suggestSubstitutes', () => {
  it('admits only candidates compatible with EVERY context ingredient', () => {
    const map = mapOf({
      onion: ['carrot', 'parsnip', 'beet'],
      thyme: ['carrot', 'parsnip', 'chicken'],
    });
    const names = suggestSubstitutes('carrot', ['onion', 'thyme'], map).map(s => s.name);
    expect(names).toContain('parsnip'); // in both neighborhoods
    expect(names).not.toContain('beet'); // only pairs with onion
    expect(names).not.toContain('chicken'); // only pairs with thyme
  });

  it('never suggests the target or the context ingredients themselves', () => {
    const map = mapOf({
      onion: ['carrot', 'parsnip', 'thyme', 'onion'],
      thyme: ['carrot', 'parsnip', 'thyme', 'onion'],
    });
    const names = suggestSubstitutes('carrot', ['onion', 'thyme'], map).map(s => s.name);
    expect(names).not.toContain('carrot');
    expect(names).not.toContain('onion');
    expect(names).not.toContain('thyme');
  });

  it('falls back to the target neighborhood when context is empty', () => {
    const map = mapOf({ carrot: ['parsnip', 'beet'] });
    const names = suggestSubstitutes('carrot', [], map).map(s => s.name);
    expect(names.sort()).toEqual(['beet', 'parsnip']);
  });

  it('drops candidates whose cooking methods never overlap the target (technique guard)', () => {
    // Swapping a cooked vegetable: fish sauce is flavor-map-admitted here but
    // has cookingMethods [] (audited, not-applicable condiment) — a bottled
    // sauce can't stand in for something you roast.
    const map = mapOf({ onion: ['parsnip', 'fish sauce'] });
    const names = suggestSubstitutes('carrot', ['onion'], map).map(s => s.name);
    expect(names).toContain('parsnip');
    expect(names).not.toContain('fish sauce');
  });

  it('drops candidates that cannot play any of the target structural roles (role guard)', () => {
    // The extension's mazemen failure case: mushroom (bulk) was offered
    // sprouts (fresh-finish), mirin (sweetener), and lemongrass (no role).
    // All are flavor-map-admitted via sesame oil; the role guard drops them.
    // Eggplant and shiitake (both bulk, sear-friendly) survive.
    const map = mapOf({
      'sesame oil': ['sprouts', 'mirin', 'lemongrass', 'eggplant', 'shiitake'],
    });
    const names = suggestSubstitutes('mushroom', ['sesame oil'], map).map(s => s.name);
    expect(names).toContain('eggplant');
    expect(names).toContain('shiitake');
    expect(names).not.toContain('sprouts');
    expect(names).not.toContain('mirin');
    expect(names).not.toContain('lemongrass');
  });

  it('keeps aromatic-base swaps in their own lane (garlic never offers peas)', () => {
    // Layer 0.6: garlic is aromatic-base, so map-admitted but role-less-similar
    // candidates like peas (bulk) are dropped; fellow bases survive.
    const map = mapOf({ thyme: ['peas', 'shallot', 'leek', 'ginger'] });
    const names = suggestSubstitutes('garlic', ['thyme'], map).map(s => s.name);
    expect(names).not.toContain('peas');
    expect(names).toEqual(expect.arrayContaining(['shallot', 'leek', 'ginger']));
  });

  it('flags same-subcategory candidates as sameFamily', () => {
    const map = mapOf({ 'sesame oil': ['eggplant', 'shiitake'] });
    const result = suggestSubstitutes('mushroom', ['sesame oil'], map);
    expect(result.find(s => s.name === 'shiitake')?.sameFamily).toBe(true); // Mushrooms
    expect(result.find(s => s.name === 'eggplant')?.sameFamily).toBe(false); // Fruit Vegetables
  });

  it('reports shared textures and functions with the target', () => {
    const map = mapOf({ onion: ['parsnip'] });
    const [parsnip] = suggestSubstitutes('carrot', ['onion'], map);
    expect(parsnip.name).toBe('parsnip');
    expect(parsnip.sharedTextures).toContain('tender'); // carrot ∩ parsnip
    expect(parsnip.tasteDistance).toBeGreaterThan(0);
    expect(parsnip.score).toBeGreaterThan(0);
    expect(parsnip.score).toBeLessThanOrEqual(1);
  });

  it('drops candidates without a profile and handles unknown targets', () => {
    const map = mapOf({ onion: ['parsnip', 'not-a-real-ingredient'] });
    const names = suggestSubstitutes('carrot', ['onion'], map).map(s => s.name);
    expect(names).toEqual(['parsnip']);
    expect(suggestSubstitutes('not-a-real-ingredient', ['onion'], map)).toEqual([]);
  });

  it('respects the limit', () => {
    const map = mapOf({
      onion: ['parsnip', 'beet', 'potato', 'turnip', 'rutabaga', 'celeriac'],
    });
    expect(suggestSubstitutes('carrot', ['onion'], map, 3)).toHaveLength(3);
  });
});
