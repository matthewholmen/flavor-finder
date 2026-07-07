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

  it('ranks structurally similar ingredients above dissimilar ones', () => {
    // Substituting a root vegetable: parsnip (root, tender, close taste) should
    // outrank fish sauce (liquid umami-bomb) even though both are admitted.
    const map = mapOf({ onion: ['parsnip', 'fish sauce'] });
    const result = suggestSubstitutes('carrot', ['onion'], map);
    const names = result.map(s => s.name);
    expect(names.indexOf('parsnip')).toBeLessThan(names.indexOf('fish sauce'));
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
