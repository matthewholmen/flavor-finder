import { useState, useCallback } from 'react';

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

// How a Taste Lab slot constrains its ingredient. A slot hunts for a dominant
// `taste` (e.g. salty → anchovy), for membership in a `category` (e.g. Fruits →
// plum), or is `wild` — no constraint at all, accepting any compatible
// ingredient so you can shuffle freely. `mode` picks which is live; the taste
// and category values are remembered so toggling back keeps the last choice.
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
}

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

// Up to four slots (Taste Lab runs 2–4). The first two default to a classic
// contrast (salty + sweet → e.g. anchovy + plum); slots 3–4 seed sensible
// extra notes and are only used when the user adds ingredients.
const DEFAULT_SLOTS: SlotTaste[] = [
  { mode: 'taste', taste: 'salty', category: 'Proteins' },
  { mode: 'taste', taste: 'sweet', category: 'Fruits' },
  { mode: 'taste', taste: 'sour', category: 'Vegetables' },
  { mode: 'taste', taste: 'umami', category: 'Seasonings' },
];

interface UseTasteLabReturn {
  isTasteLab: boolean;
  setIsTasteLab: React.Dispatch<React.SetStateAction<boolean>>;
  slotTastes: SlotTaste[];
  setSlotTaste: (slotIndex: number, patch: Partial<SlotTaste>) => void;
  // Replace the whole slot array at once — used by undo to restore a snapshot.
  setSlotTastes: React.Dispatch<React.SetStateAction<SlotTaste[]>>;
}

/**
 * State for "Taste Lab" mode: a two-ingredient generation mode where each slot
 * is constrained to either a dominant taste or a category, and the two results
 * must still pair with each other.
 */
export const useTasteLab = (): UseTasteLabReturn => {
  // Classic is the default entry mode: the landing surface and every entry path
  // (tag steer, ingredient pick, Surprise me) resolve into Classic so they all
  // land in the same place. Taste Lab is opt-in from the sidebar — our testing
  // surface. Flip to true to default into Taste Lab.
  const [isTasteLab, setIsTasteLab] = useState(false);
  const [slotTastes, setSlotTastes] = useState<SlotTaste[]>(DEFAULT_SLOTS);

  const setSlotTaste = useCallback((slotIndex: number, patch: Partial<SlotTaste>) => {
    setSlotTastes(prev =>
      prev.map((slot, i) => (i === slotIndex ? { ...slot, ...patch } : slot))
    );
  }, []);

  return { isTasteLab, setIsTasteLab, slotTastes, setSlotTaste, setSlotTastes };
};

export default useTasteLab;
