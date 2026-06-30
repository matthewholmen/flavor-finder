// Display labels for top-level ingredient categories.
//
// The internal category *keys* (used in ingredientProfiles, dietary preset keys,
// color maps, Taste Lab constraints, URL state, etc.) stay stable — only the
// user-facing label changes. Categories not listed here display as-is.
export const CATEGORY_LABELS: Record<string, string> = {
  Seasonings: 'Herbs & Spices',
  Pantry: 'Pantry & Condiments',
  Grains: 'Grains & Starches',
};

/** Returns the user-facing label for a category key (falls back to the key). */
export const categoryLabel = (category: string): string =>
  CATEGORY_LABELS[category] ?? category;
