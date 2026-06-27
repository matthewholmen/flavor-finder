import { SlotTaste, TasteKey, CategoryKey } from '../hooks/useTasteLab.ts';

// A Flavor Preset is the *DNA* of a pairing, not a fixed set of ingredients: an
// ordered list of slot constraints (each a dominant taste or a category) that
// Taste Lab loads and then generates a fresh, mutually-compatible combo for.
// Load "Sweet & Salty" and Generate keeps handing you new sweet+salty pairs.
export type PresetTier = 'custom' | 'classic' | 'structural' | 'themed';

export interface FlavorPreset {
  id: string;
  name: string;
  description: string;
  tier: PresetTier;
  // 2–4 slots. Order is the layout order in the split view.
  slots: SlotTaste[];
  // Slot indices whose constraint is pinned on load (Generate stays within them).
  // Omitted / empty = "wide open", every slot free to reroll its taste/category.
  lockedConstraints?: number[];
}

// Slot builders. A slot always carries BOTH a taste and a category so toggling
// its mode in the UI remembers the other side; `mode` picks which is live. These
// defaults are just the "other" value a user lands on if they flip the toggle.
const taste = (taste: TasteKey, category: CategoryKey = 'Pantry'): SlotTaste => ({
  mode: 'taste',
  taste,
  category,
});
const cat = (category: CategoryKey, taste: TasteKey = 'umami'): SlotTaste => ({
  mode: 'category',
  taste,
  category,
});

// Human-friendly labels for the tier section headers in the gallery.
export const TIER_LABELS: Record<PresetTier, string> = {
  custom: 'Your pairings',
  classic: 'Classic contrasts',
  structural: 'Structural templates',
  themed: 'Themed pools',
};

export const FLAVOR_PRESETS: FlavorPreset[] = [
  // ── Classic contrasts: two tastes playing off each other ──────────────────
  {
    id: 'sweet-salty',
    name: 'Sweet & Salty',
    description: 'Caramel-and-pretzel territory — sugar lifted by salt.',
    tier: 'classic',
    slots: [taste('sweet', 'Fruits'), taste('salty', 'Proteins')],
  },
  {
    id: 'sweet-sour',
    name: 'Sweet & Sour',
    description: 'Bright and tangy, the agrodolce backbone.',
    tier: 'classic',
    slots: [taste('sweet', 'Fruits'), taste('sour', 'Fruits')],
  },
  {
    id: 'sweet-spicy',
    name: 'Sweet & Spicy',
    description: 'Hot-honey energy — sugar with a kick.',
    tier: 'classic',
    slots: [taste('sweet', 'Pantry'), taste('spicy', 'Seasonings')],
  },
  {
    id: 'spicy-fat',
    name: 'Spicy & Fat',
    description: 'Richness tames the heat; heat cuts the richness.',
    tier: 'classic',
    slots: [taste('spicy', 'Seasonings'), taste('fat', 'Dairy')],
  },
  {
    id: 'salty-sour',
    name: 'Salty & Sour',
    description: 'Briny and bright, like a good pickle.',
    tier: 'classic',
    slots: [taste('salty', 'Proteins'), taste('sour', 'Vegetables')],
  },
  {
    id: 'sour-fat',
    name: 'Sour & Fat',
    description: 'Cream meets acid — the crème fraîche move.',
    tier: 'classic',
    slots: [taste('sour', 'Fruits'), taste('fat', 'Dairy')],
  },
  {
    id: 'umami-bomb',
    name: 'Umami Bomb',
    description: 'Deep savory stacked on salt.',
    tier: 'classic',
    slots: [taste('umami', 'Proteins'), taste('salty', 'Pantry')],
  },

  // ── Structural templates: the scaffolding of a dish ───────────────────────
  {
    id: 'salt-fat-acid-heat',
    name: 'Salt · Fat · Acid · Heat',
    description: 'The four levers of a finished dish, in one combo.',
    tier: 'structural',
    slots: [
      taste('salty', 'Proteins'),
      taste('fat', 'Dairy'),
      taste('sour', 'Fruits'),
      taste('spicy', 'Seasonings'),
    ],
  },
  {
    id: 'sweet-sour-spicy',
    name: 'Sweet · Sour · Spicy',
    description: 'The Southeast Asian balance of tastes.',
    tier: 'structural',
    slots: [taste('sweet', 'Fruits'), taste('sour', 'Fruits'), taste('spicy', 'Seasonings')],
  },
  {
    id: 'protein-veg-seasoning',
    name: 'Protein · Vegetable · Seasoning',
    description: 'The bones of a plate.',
    tier: 'structural',
    slots: [cat('Proteins'), cat('Vegetables'), cat('Seasonings')],
  },
  {
    id: 'grain-veg-pantry',
    name: 'Grain · Vegetable · Pantry',
    description: 'Build a bowl.',
    tier: 'structural',
    slots: [cat('Grains'), cat('Vegetables'), cat('Pantry')],
  },
  {
    id: 'fruit-dairy-aromatic',
    name: 'Fruit · Dairy · Aromatic',
    description: 'A dessert in three notes.',
    tier: 'structural',
    slots: [cat('Fruits'), cat('Dairy'), taste('aromatic', 'Seasonings')],
  },
  {
    id: 'cocktail-hour',
    name: 'Cocktail Hour',
    description: 'Spirit, fruit, and an aromatic twist.',
    tier: 'structural',
    slots: [cat('Alcohol'), cat('Fruits'), cat('Seasonings')],
  },
];

export default FLAVOR_PRESETS;
