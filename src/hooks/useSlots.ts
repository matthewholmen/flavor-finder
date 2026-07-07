import { useState, useCallback } from 'react';
import { IngredientProfile, IngredientFunction, Texture } from '../types.ts';

// The 7 taste dimensions an ingredient profile is scored on (0-10 each).
export type TasteKey =
  | 'sweet'
  | 'salty'
  | 'sour'
  | 'umami'
  | 'fat'
  | 'spicy'
  | 'aromatic';

export const TASTE_KEYS: TasteKey[] = [
  'sweet',
  'salty',
  'sour',
  'umami',
  'fat',
  'spicy',
  'aromatic',
];

// The 8 top-level ingredient categories a slot can be constrained to.
export type CategoryKey =
  | 'Proteins'
  | 'Vegetables'
  | 'Fruits'
  | 'Dairy'
  | 'Seasonings'
  | 'Pantry'
  | 'Grains'
  | 'Alcohol';

export const CATEGORY_KEYS: CategoryKey[] = [
  'Proteins',
  'Vegetables',
  'Fruits',
  'Dairy',
  'Seasonings',
  'Pantry',
  'Grains',
  'Alcohol',
];

// Minimum score (0-10) an ingredient must hit on a slot's taste to qualify in
// taste mode. Fixed now that the intensity control is gone — the "dominant note"
// preference in the solver does the heavy lifting of keeping pairings crisp.
export const TASTE_THRESHOLD = 5;

// The app runs 1–5 ingredient slots.
export const MAX_SLOTS = 5;

// How a slot constrains its ingredient. A slot hunts for a dominant `taste`
// (e.g. salty → anchovy), for membership in a `category` (e.g. Fruits → plum),
// or is `wild` — no constraint at all, accepting any compatible ingredient so
// you can shuffle freely. `mode` picks which is live; the taste and category
// values are remembered so toggling back keeps the last choice.
export type SlotMode = 'taste' | 'category' | 'wild';

export interface SlotTaste {
  mode: SlotMode;
  taste: TasteKey;
  category: CategoryKey;
  // In category mode, optionally narrow to one or more subcategories (e.g. Dairy
  // → [Cheese], or Proteins → [Meat, Poultry]). Undefined/empty = the whole
  // category. This narrows the pool; it never affects the flavor-map pairing
  // requirement.
  subcategories?: string[];
  // Categories to carve OUT of this slot's pool, regardless of mode — e.g. a
  // `sweet` slot excluding `Fruits` yields caramelized onion, not strawberry.
  // Empty/undefined means no exclusions.
  exclude?: CategoryKey[];
  // Structural constraints (dish frames, P5): the ingredient must carry at
  // least one of these textures AND at least one of these functions (P4 data
  // layer, typical served state). Like taste/category, they only narrow the
  // slot's pool — the flavor-map pairing requirement is never relaxed. They
  // compose with any mode ("wild + crunchy" = any crunchy thing that pairs).
  textures?: Texture[];
  functions?: IngredientFunction[];
  // Editorial role name a frame gives this slot ("base greens", "crunch").
  // Display-only; cleared when the user overrides the role by hand.
  label?: string;
}

// Does an ingredient satisfy a slot's structural (texture/function) constraints?
// Used by the solver's pool filter and by the structural-swap candidate filter.
export const slotAcceptsStructure = (
  slot: Pick<SlotTaste, 'textures' | 'functions'>,
  profile: IngredientProfile | null | undefined
): boolean => {
  if (!slot.textures?.length && !slot.functions?.length) return true;
  if (!profile) return false;
  if (slot.textures?.length && !slot.textures.some(t => profile.textures?.includes(t))) return false;
  if (slot.functions?.length && !slot.functions.some(f => profile.functions?.includes(f))) return false;
  return true;
};

// The subcategories available within each top-level category, used to narrow a
// category-mode slot. Strings must match `ingredientProfiles[].subcategory`.
export const SUBCATEGORIES: Record<CategoryKey, string[]> = {
  Proteins: ['Meat', 'Poultry', 'Seafood', 'Eggs', 'Beans & Legumes', 'Nuts & Seeds', 'Soy & Plant-Based'],
  Vegetables: ['Allium', 'Leafy Greens', 'Roots & Tubers', 'Squash', 'Brassicas', 'Mushrooms', 'Stalks', 'Fruit Vegetables'],
  Fruits: ['Citrus', 'Stone Fruit', 'Tropical', 'Berries', 'Pome Fruit', 'Melons'],
  Dairy: ['Cheese', 'Cultured', 'Milk & Cream', 'Custards & Frozen'],
  Seasonings: ['Herbs', 'Spices', 'Spice Blends', 'Chilis', 'Salts'],
  Pantry: ['Fats & Oils', 'Vinegars', 'Sweeteners', 'Sauces & Condiments', 'Stocks & Bases'],
  Grains: ['Rice', 'Pasta', 'Bread', 'Whole Grains', 'Corn', 'Starches'],
  Alcohol: ['Wine', 'Beer & Cider', 'Spirits', 'Liqueurs'],
};

// Every slot defaults to wild — no constraint, exactly the classic Generate
// behavior. The taste/category values are just remembered seeds so opening the
// role popover and toggling to taste/category mode starts somewhere sensible
// (and varied) rather than on a uniform default.
const DEFAULT_SLOTS: SlotTaste[] = [
  { mode: 'wild', taste: 'salty', category: 'Proteins' },
  { mode: 'wild', taste: 'sweet', category: 'Fruits' },
  { mode: 'wild', taste: 'sour', category: 'Vegetables' },
  { mode: 'wild', taste: 'umami', category: 'Seasonings' },
  { mode: 'wild', taste: 'aromatic', category: 'Pantry' },
];

// A fresh copy of the default slot set — used on mount and by every
// clean-slate entry (surprise me, landing tag, first search pick).
export const defaultSlots = (): SlotTaste[] => DEFAULT_SLOTS.map(s => ({ ...s }));

interface UseSlotsReturn {
  slotTastes: SlotTaste[];
  setSlotTaste: (slotIndex: number, patch: Partial<SlotTaste>) => void;
  // Replace the whole slot array at once — used by undo to restore a snapshot
  // and by clean-slate entries to reset every role to wild.
  setSlotTastes: React.Dispatch<React.SetStateAction<SlotTaste[]>>;
}

/**
 * Per-slot role state for the unified generator: every slot carries an
 * optional role (a dominant taste or a category, default wild) that constrains
 * which ingredients can fill it. Roles only ever shrink a slot's candidate
 * pool — the flavor-map pairing requirement is never relaxed.
 */
export const useSlots = (): UseSlotsReturn => {
  const [slotTastes, setSlotTastes] = useState<SlotTaste[]>(defaultSlots());

  const setSlotTaste = useCallback((slotIndex: number, patch: Partial<SlotTaste>) => {
    setSlotTastes(prev =>
      prev.map((slot, i) => (i === slotIndex ? { ...slot, ...patch } : slot))
    );
  }, []);

  return { slotTastes, setSlotTaste, setSlotTastes };
};

export default useSlots;
