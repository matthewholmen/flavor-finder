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
  // Categories to carve OUT of this slot's pool, regardless of mode — e.g. a
  // `sweet` slot excluding `Fruits` yields caramelized onion, not strawberry.
  // Empty/undefined means no exclusions.
  exclude?: CategoryKey[];
}

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
}

/**
 * State for "Taste Lab" mode: a two-ingredient generation mode where each slot
 * is constrained to either a dominant taste or a category, and the two results
 * must still pair with each other.
 */
export const useTasteLab = (): UseTasteLabReturn => {
  // Default on for now — Taste Lab is the mode we're actively iterating on, and
  // landing straight in it saves a click. Flip back to false to default Classic.
  const [isTasteLab, setIsTasteLab] = useState(true);
  const [slotTastes, setSlotTastes] = useState<SlotTaste[]>(DEFAULT_SLOTS);

  const setSlotTaste = useCallback((slotIndex: number, patch: Partial<SlotTaste>) => {
    setSlotTastes(prev =>
      prev.map((slot, i) => (i === slotIndex ? { ...slot, ...patch } : slot))
    );
  }, []);

  return { isTasteLab, setIsTasteLab, slotTastes, setSlotTaste };
};

export default useTasteLab;
