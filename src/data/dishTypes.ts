// data/dishTypes.ts
//
// The "served as" taxonomy: how a combo eats as a dish. A dish type carries the
// context that ingredients alone can't (the same five ingredients make a pizza
// or a caprese) — the FrameContext feeds computeDishProfile, and from there the
// drink engine (and later, dish-to-dish menu balance).
//
// Derived from the corpus-mining dish tags (pairingContext CONTEXT_TAG_KEYWORDS)
// so `steerTag` links a dish type to receipt-backed steering where the corpus
// supports it. Types without a steerTag (grain bowl, sushi & crudo, cheese
// board) are profile-only — they inform pairing math but can't steer
// generation, and that's fine.
//
// Two tiers keep the selector honest: 'primary' covers the overwhelming
// majority of home cooking and renders as the default pill row; 'more' sits
// behind an expander. Comprehensive without the clutter.

export interface FrameContext {
  /** Structural weight baseline the ingredients build on (salad 2, pizza 7). */
  weightBase: number;
  /** Cooked dishes mellow non-chili heat and marry fats. */
  cooked: boolean;
  /** How fat reads: dressing (<1) vs structural/melted (>1). */
  fatMult: number;
  /** Raw/fresh dishes push brightness forward. */
  acidMult: number;
}

export interface DishType {
  id: string;
  /** Plain-noun pill label ("Pasta", not "Pasta Night"). */
  label: string;
  tier: 'primary' | 'more';
  context: FrameContext;
  /** Generative dish preset (flavorPresets tier 'dish'), when one exists. */
  frameId?: string;
  /** Corpus dish tag for receipt-backed steering, when the corpus supports it. */
  steerTag?: string;
}

const ctx = (
  weightBase: number, cooked: boolean, fatMult: number, acidMult: number,
): FrameContext => ({ weightBase, cooked, fatMult, acidMult });

export const DISH_TYPES: DishType[] = [
  // ── primary: the default pill row ──────────────────────────────────────────
  { id: 'salad',      label: 'Salad',       tier: 'primary', context: ctx(2.0, false, 0.7,  1.15), frameId: 'dish-salad',      steerTag: 'salads' },
  { id: 'pizza',      label: 'Pizza',       tier: 'primary', context: ctx(7.0, true,  1.15, 0.9),  frameId: 'dish-pizza',      steerTag: 'pizza' },
  { id: 'pasta',      label: 'Pasta',       tier: 'primary', context: ctx(6.0, true,  1.1,  0.95), frameId: 'dish-pasta',      steerTag: 'pasta' },
  { id: 'soup',       label: 'Soup',        tier: 'primary', context: ctx(4.0, true,  0.9,  1.0),  frameId: 'dish-soup',       steerTag: 'soups' },
  { id: 'stir-fry',   label: 'Stir-fry',    tier: 'primary', context: ctx(4.5, true,  1.0,  1.0),  frameId: 'dish-stir-fry',   steerTag: 'stir-fries' },
  { id: 'grain-bowl', label: 'Grain bowl',  tier: 'primary', context: ctx(5.0, true,  0.9,  1.0),  frameId: 'dish-grain-bowl' },
  { id: 'roast',      label: 'Roast',       tier: 'primary', context: ctx(6.0, true,  1.0,  0.95), frameId: 'dish-roast',      steerTag: 'roasts' },
  { id: 'grill',      label: 'Grill & BBQ', tier: 'primary', context: ctx(6.0, true,  1.0,  1.0),  frameId: 'dish-grill',      steerTag: 'grilling & bbq' },
  { id: 'tacos',      label: 'Tacos',       tier: 'primary', context: ctx(4.5, true,  1.0,  1.1),  frameId: 'dish-tacos',      steerTag: 'tacos & burritos' },
  { id: 'curry',      label: 'Curry',       tier: 'primary', context: ctx(5.5, true,  1.15, 0.9),  frameId: 'dish-curry',      steerTag: 'curries' },

  // ── more: behind the expander ──────────────────────────────────────────────
  { id: 'stew',       label: 'Stew & braise', tier: 'more', context: ctx(7.0, true,  1.1,  0.85), frameId: 'dish-stew',       steerTag: 'stews' },
  { id: 'sandwich',   label: 'Sandwich',      tier: 'more', context: ctx(5.0, false, 1.0,  1.0),  frameId: 'dish-sandwich',   steerTag: 'sandwiches & burgers' },
  { id: 'burger',     label: 'Burger',        tier: 'more', context: ctx(6.5, true,  1.1,  0.95), frameId: 'dish-burger',     steerTag: 'sandwiches & burgers' },
  { id: 'noodles',    label: 'Noodles',       tier: 'more', context: ctx(5.0, true,  1.0,  1.0),  frameId: 'dish-noodles',    steerTag: 'noodles' },
  { id: 'rice-dish',  label: 'Rice dish',     tier: 'more', context: ctx(5.5, true,  1.05, 0.95), frameId: 'dish-rice',       steerTag: 'rice dishes' },
  { id: 'casserole',  label: 'Casserole',     tier: 'more', context: ctx(6.5, true,  1.1,  0.9),  frameId: 'dish-casserole',  steerTag: 'casseroles' },
  { id: 'skewers',    label: 'Skewers',       tier: 'more', context: ctx(5.0, true,  1.0,  1.0),  frameId: 'dish-skewers',    steerTag: 'skewers' },
  { id: 'dumplings',  label: 'Dumplings',     tier: 'more', context: ctx(4.5, true,  1.0,  1.0),  frameId: 'dish-dumplings' },
  { id: 'raw-seafood', label: 'Sushi & crudo', tier: 'more', context: ctx(3.0, false, 0.9, 1.15), frameId: 'dish-sushi' },
  { id: 'breakfast',  label: 'Breakfast',     tier: 'more', context: ctx(4.5, true,  1.05, 1.0),  frameId: 'dish-breakfast',  steerTag: 'breakfast' },
  { id: 'dessert',    label: 'Dessert',       tier: 'more', context: ctx(4.0, true,  1.1,  0.9),  frameId: 'dish-dessert',    steerTag: 'desserts' },
  { id: 'dips',       label: 'Dips & snacks', tier: 'more', context: ctx(3.0, false, 1.0,  1.0),  frameId: 'dish-dips',       steerTag: 'dips' },
  { id: 'board',      label: 'Cheese board',  tier: 'more', context: ctx(4.0, false, 1.1,  1.0),  frameId: 'dish-board' },
];

export const DISH_TYPE_BY_ID: Record<string, DishType> = Object.fromEntries(
  DISH_TYPES.map(d => [d.id, d]),
);

// Accept generative frame-preset ids wherever a dish-type id is expected, so a
// combo generated from a frame carries its served-as answer for free.
export const FRAME_TO_DISH_TYPE: Record<string, string> = Object.fromEntries(
  DISH_TYPES.filter(d => d.frameId).map(d => [d.frameId!, d.id]),
);

/** Resolve a dish-type id OR a frame-preset id to its DishType, if any. */
export const resolveDishType = (id?: string): DishType | undefined =>
  id ? DISH_TYPE_BY_ID[id] ?? DISH_TYPE_BY_ID[FRAME_TO_DISH_TYPE[id]] : undefined;
