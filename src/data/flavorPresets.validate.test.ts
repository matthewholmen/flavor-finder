import { FLAVOR_PRESETS, FlavorPreset } from './flavorPresets';
import { ingredientProfiles } from './ingredientProfiles';
import { buildFlavorMap } from '../utils/flavorMap';
import { filterFlavorMapByTag } from '../utils/pairingContext';
import { slotAcceptsStructure, TASTE_THRESHOLD, SlotTaste } from '../hooks/useSlots';
import { IngredientProfile } from '../types';

// Every 'dish' preset must be *generatable*: there has to exist one ingredient
// per slot, each clearing that slot's role, such that the whole set is mutually
// compatible per the flavor map (perfect mode — the inviolable rule). This
// mirrors FlavorFinderV2's computeCombo qualify + backtracking exactly, minus
// randomness: an exhaustive search that definitively answers "does a valid combo
// exist?"
//
// The stricter bar for a *steered* dish: it must fill under its OWN steered
// subgraph, not just the full library. When it can't, handleLoadPreset silently
// drops the steer and falls back to the full map — the dish generates something,
// but wild and off-theme, and its recipe-search receipts go missing. A steered
// dish that can't hold its steer is a bug (this is how over-slotting is caught).

const { flavorMap } = buildFlavorMap();
const profileByName = new Map<string, IngredientProfile>();
ingredientProfiles.forEach(p => profileByName.set(p.name.toLowerCase(), p));

// qualify: replica of computeCombo's `qualifies` (no dietary restrictions).
const qualifies = (ing: string, slot: SlotTaste, poolSet: Set<string> | null): boolean => {
  const lower = ing.toLowerCase();
  if (poolSet && !poolSet.has(lower)) return false;
  const profile = profileByName.get(lower);
  if (slot.exclude?.length && profile?.category && slot.exclude.includes(profile.category as any)) return false;
  if (!slotAcceptsStructure(slot, profile)) return false;
  if (slot.mode === 'wild') return true;
  if (slot.mode === 'category') {
    if (profile?.category !== slot.category) return false;
    return !slot.subcategories?.length || slot.subcategories.includes(profile?.subcategory as string);
  }
  const fp = profile?.flavorProfile as Record<string, number> | undefined;
  return (fp?.[slot.taste] ?? 0) >= TASTE_THRESHOLD;
};

const candidatesFor = (map: Map<string, Set<string>>, slot: SlotTaste, poolSet: Set<string> | null): string[] =>
  Array.from(map.keys()).filter(ing => qualifies(ing, slot, poolSet));

// Exhaustive perfect-mode fill under a given map (base or steered): fills the
// most-constrained slots first and prunes against already-placed picks.
const solveUnder = (map: Map<string, Set<string>>, preset: FlavorPreset): string[] | null => {
  const poolSet = preset.pool ? new Set(preset.pool.map(s => s.toLowerCase())) : null;
  const slots = preset.slots;
  const cand = slots.map(s => candidatesFor(map, s, poolSet));
  const order = slots.map((_, i) => i).sort((a, b) => cand[a].length - cand[b].length);
  const placed: (string | null)[] = new Array(slots.length).fill(null);
  const pair = (a: string, b: string) => !!map.get(a)?.has(b);
  const fits = (ing: string, at: number) =>
    slots.every((_, j) => j === at || !placed[j] || (ing !== placed[j] && pair(ing, placed[j] as string)));
  const fill = (pos: number): boolean => {
    if (pos === order.length) return true;
    const idx = order[pos];
    for (const ing of cand[idx]) {
      if (!fits(ing, idx)) continue;
      placed[idx] = ing;
      if (fill(pos + 1)) return true;
      placed[idx] = null;
    }
    return false;
  };
  return fill(0) ? (placed as string[]) : null;
};

const dishes = FLAVOR_PRESETS.filter(p => p.tier === 'dish');

describe('dish presets are generatable', () => {
  it('covers every served-as dish type (1:1 with dishTypes)', () => {
    expect(dishes).toHaveLength(23);
  });

  // Guard against thin-but-passing slots silently rotting into dead ends.
  it('has no near-empty slot in any dish', () => {
    const thin = dishes.flatMap(d => {
      const poolSet = d.pool ? new Set(d.pool.map(s => s.toLowerCase())) : null;
      return d.slots
        .map((s, i) => ({ dish: d.name, slot: s.label ?? i, n: candidatesFor(flavorMap, s, poolSet).length }))
        .filter(r => r.n < 2);
    });
    expect(thin).toEqual([]);
  });

  it.each(dishes.map(d => [d.name, d] as const))('%s fills a valid combo (full library)', (_name, dish) => {
    const combo = solveUnder(flavorMap, dish);
    expect(combo).not.toBeNull();
    if (combo) {
      for (let i = 0; i < combo.length; i++)
        for (let j = i + 1; j < combo.length; j++)
          expect(flavorMap.get(combo[i])?.has(combo[j])).toBe(true);
    }
  });

  // The strict bar: steered dishes must hold their steer (else they de-steer live).
  const steered = dishes.filter(d => d.steerTag);
  it.each(steered.map(d => [d.name, d] as const))('%s holds its steer', (_name, dish) => {
    const map = filterFlavorMapByTag(flavorMap, 'dish', dish.steerTag!);
    expect(solveUnder(map, dish)).not.toBeNull();
  });
});
