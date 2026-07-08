import { FLAVOR_PRESETS, FlavorPreset } from './flavorPresets';
import { ingredientProfiles } from './ingredientProfiles';
import { buildFlavorMap } from '../utils/flavorMap';
import { slotAcceptsStructure, TASTE_THRESHOLD, TASTE_KEYS, SlotTaste } from '../hooks/useSlots';
import { IngredientProfile } from '../types';

// Every 'dish' preset must be *generatable*: there has to exist one ingredient
// per slot, each clearing that slot's role, such that the whole set is mutually
// compatible per the flavor map (perfect mode — the inviolable rule). This
// mirrors FlavorFinderV2's computeCombo qualify + backtracking exactly, minus
// randomness: an exhaustive search that definitively answers "does a valid combo
// exist?" A dish that can't fill even once should never ship.

const { flavorMap } = buildFlavorMap();
const profileByName = new Map<string, IngredientProfile>();
ingredientProfiles.forEach(p => profileByName.set(p.name.toLowerCase(), p));

// ── qualify: replica of computeCombo's `qualifies` (no dietary restrictions) ──
const qualifies = (ing: string, slot: SlotTaste, poolSet: Set<string> | null): boolean => {
  const lower = ing.toLowerCase();
  if (poolSet && !poolSet.has(lower)) return false;
  const profile = profileByName.get(lower);
  if (slot.exclude?.length) {
    if (profile?.category && slot.exclude.includes(profile.category as any)) return false;
  }
  if (!slotAcceptsStructure(slot, profile)) return false;
  if (slot.mode === 'wild') return true;
  if (slot.mode === 'category') {
    if (profile?.category !== slot.category) return false;
    return !slot.subcategories?.length || slot.subcategories.includes(profile?.subcategory as string);
  }
  const fp = profile?.flavorProfile as Record<string, number> | undefined;
  return (fp?.[slot.taste] ?? 0) >= TASTE_THRESHOLD;
};

// Base candidate pool for a slot (role only, ignoring pairing to other slots).
const candidatesFor = (slot: SlotTaste, poolSet: Set<string> | null): string[] =>
  Array.from(flavorMap.keys()).filter(ing => qualifies(ing, slot, poolSet));

const pair = (a: string, b: string) => !!flavorMap.get(a)?.has(b);

// Exhaustive perfect-mode fill: fills the most-constrained slots first and prunes
// against already-placed picks. Returns a valid combo or null.
const solve = (preset: FlavorPreset): string[] | null => {
  const poolSet = preset.pool ? new Set(preset.pool.map(s => s.toLowerCase())) : null;
  const slots = preset.slots;
  const order = slots
    .map((slot, idx) => ({ idx, cands: candidatesFor(slot, poolSet) }))
    .sort((a, b) => a.cands.length - b.cands.length);

  const placed: (string | null)[] = new Array(slots.length).fill(null);
  const fits = (ing: string, atIdx: number) => {
    for (let j = 0; j < slots.length; j++) {
      if (j === atIdx || !placed[j]) continue;
      if (ing === placed[j]) return false;
      if (!pair(ing, placed[j] as string)) return false;
    }
    return true;
  };
  const fill = (pos: number): boolean => {
    if (pos === order.length) return true;
    const { idx, cands } = order[pos];
    for (const ing of cands) {
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

  // Guard against thin-but-passing slots silently rotting into dead ends: every
  // slot must offer at least a couple of role-qualifying candidates on its own.
  it('has no near-empty slot in any dish', () => {
    const thin = dishes.flatMap(d => {
      const poolSet = d.pool ? new Set(d.pool.map(s => s.toLowerCase())) : null;
      return d.slots
        .map((s, i) => ({ dish: d.name, slot: s.label ?? i, n: candidatesFor(s, poolSet).length }))
        .filter(r => r.n < 2);
    });
    expect(thin).toEqual([]);
  });

  it.each(dishes.map(d => [d.name, d] as const))('%s can fill a valid combo', (_name, dish) => {
    const combo = solve(dish);
    expect(combo).not.toBeNull();
    // sanity: the found combo is genuinely mutually compatible
    if (combo) {
      for (let i = 0; i < combo.length; i++)
        for (let j = i + 1; j < combo.length; j++)
          expect(pair(combo[i], combo[j])).toBe(true);
    }
  });
});
