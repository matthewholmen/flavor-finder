import { SlotTaste, TasteKey, CategoryKey } from '../hooks/useSlots.ts';
import { IngredientFunction, Texture } from '../types.ts';

// A Flavor Preset is the *DNA* of a pairing, not a fixed set of ingredients: an
// ordered list of slot constraints (each a dominant taste or a category) that
// Taste Lab loads and then generates a fresh, mutually-compatible combo for.
// Load "Sweet & Salty" and Generate keeps handing you new sweet+salty pairs.
//
// `dish` presets are the "Build a Dish" surface: one entry per "served as"
// dish type (data/dishTypes.ts), taking an editorial point of view on a dish's
// STRUCTURE (named roles — "base greens", "the crunch") while the engine
// supplies compatible content. Cuisine-bound dishes (pizza, tacos) additionally
// carry a curated `pool` — the old "themed pools" folded into the same concept.
// Prescriptive about structure, permissive about outcome; the pairing rule is
// untouched.
export type PresetTier = 'custom' | 'dish' | 'classic' | 'structural';

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
  // A cuisine-bound dish constrains EVERY slot to a curated whitelist of
  // ingredients (e.g. a pizza pantry). Slots still apply their own taste/category
  // on top, so "pizza · cheese" picks within the pizza pool. Omitted = the full
  // library (most dishes lean on structure + steer instead of a pool).
  pool?: string[];
  // Dish-tag steer to lock on load (a CONTEXT_DISH_TYPES entry). Dishes use it
  // so the Salad dish generates inside the "salads" subgraph and its receipts
  // agree with the structure instead of suggesting a stew. Steering is a map
  // SUBSET — a pool input change, never a pairing relaxation. Omit when the
  // mined vocabulary has no honest match (Grain Bowl, Sushi, Cheese Board).
  steerTag?: string;
}

// Slot builders. A slot always carries BOTH a taste and a category so toggling
// its mode in the UI remembers the other side; `mode` picks which is live. These
// defaults are just the "other" value a user lands on if they flip the toggle.
const taste = (taste: TasteKey, category: CategoryKey = 'Pantry', exclude?: CategoryKey[]): SlotTaste => ({
  mode: 'taste',
  taste,
  category,
  ...(exclude ? { exclude } : {}),
});
const cat = (category: CategoryKey, taste: TasteKey = 'umami'): SlotTaste => ({
  mode: 'category',
  taste,
  category,
});
// A dish slot: an editorial role name over any base constraint, plus optional
// structural (texture/function) narrowing from the P4 data layer. Defaults to
// wild mode — many roles are purely structural, not categorical.
const dishSlot = (
  label: string,
  constraints: Partial<SlotTaste> & { textures?: Texture[]; functions?: IngredientFunction[] } = {}
): SlotTaste => ({
  mode: 'wild',
  taste: 'umami',
  category: 'Vegetables',
  label,
  ...constraints,
});

// Human-friendly labels for the tier section headers in the gallery.
export const TIER_LABELS: Record<PresetTier, string> = {
  custom: 'Your pairings',
  dish: 'Dishes',
  classic: 'Classic contrasts',
  structural: 'Structural templates',
};

// Curated ingredient pools for the two cuisine-bound dishes that earned one —
// tacos and the cheese board, where an assembled spread wants a fixed pantry.
// (Pizza and dips dropped their pools: a fixed set collapsed them to one combo,
// and the dish steer keeps them on-theme with more variety.)
const TACO_POOL = [
  'tomato', 'tomatillo', 'onion', 'red onion', 'cilantro', 'lime', 'avocado', 'guacamole',
  'jalapeño', 'serrano chili', 'poblano', 'chipotle', 'ancho chili', 'cumin', 'coriander',
  'garlic', 'corn', 'black beans', 'pinto beans', 'queso fresco', 'cotija', 'crema',
  'beef', 'pork', 'chicken', 'chorizo', 'shrimp', 'red cabbage', 'radish', 'scallion',
  'achiote', 'oregano',
];
const CHEESE_BOARD_POOL = [
  'brie', 'camembert', 'cheddar', 'gruyère', 'manchego', 'gorgonzola', 'blue cheese',
  'stilton cheese', 'roquefort', 'goat cheese', 'parmesan', 'fig', 'dried fig',
  'date', 'honey', 'walnut', 'almond', 'pecan', 'grape', 'quince', 'apricot',
  'dried apricot', 'prosciutto', 'salami', 'mortadella', 'cornichon', 'mostarda',
  'sourdough', 'pear', 'apple',
];

export const FLAVOR_PRESETS: FlavorPreset[] = [
  // ── Dishes: one per "served as" type (data/dishTypes.ts). Each says what a
  //    dish NEEDS as named roles; the engine says what fits. Roles lean on the
  //    P4 texture/function layer, so "the crunch" means crunchy things that
  //    pair, whatever category they come from. Cuisine-bound dishes also carry a
  //    curated `pool`. ─────────────────────────────────────────────────────────
  {
    id: 'dish-salad',
    name: 'Salad',
    description: 'Greens, crunch, something sweet, a fat, and an acid — a whole salad by structure.',
    tier: 'dish',
    steerTag: 'salads',
    slots: [
      dishSlot('base greens', { mode: 'category', category: 'Vegetables', subcategories: ['Leafy Greens'] }),
      dishSlot('the crunch', { textures: ['crunchy', 'crisp'] }),
      dishSlot('something sweet', { mode: 'taste', taste: 'sweet', category: 'Fruits' }),
      dishSlot('the fat', { functions: ['fat'] }),
      dishSlot('the acid', { functions: ['acid'] }),
    ],
  },
  {
    id: 'dish-grain-bowl',
    name: 'Grain Bowl',
    description: 'A base grain, a substantial protein, a vegetable, a sauce, and a finish.',
    tier: 'dish',
    slots: [
      // A grain bowl's base is an actual grain — rice, farro, quinoa, barley —
      // not bread/pasta/stuffing, so narrow past the whole Grains category.
      dishSlot('the base', { mode: 'category', category: 'Grains', subcategories: ['Rice', 'Whole Grains'] }),
      dishSlot('the protein', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the vegetable', { mode: 'category', category: 'Vegetables' }),
      dishSlot('the sauce', { functions: ['fat', 'umami-bomb'] }),
      dishSlot('the finish', { functions: ['fresh-finish', 'crunch-topper'] }),
    ],
  },
  {
    id: 'dish-pasta',
    name: 'Pasta',
    description: 'The pasta, a body, richness, savory depth, and a fresh finish.',
    tier: 'dish',
    steerTag: 'pasta',
    slots: [
      dishSlot('the pasta', { mode: 'category', category: 'Grains', subcategories: ['Pasta'] }),
      dishSlot('the body', { functions: ['bulk'], exclude: ['Grains'] }),
      dishSlot('the richness', { functions: ['fat'] }),
      dishSlot('the depth', { functions: ['umami-bomb'] }),
      dishSlot('the finish', { functions: ['fresh-finish'] }),
    ],
  },
  {
    id: 'dish-pizza',
    // Pizza is jazz: a fixed pantry collapsed it to one combo (mozz-tomato-
    // sausage-oregano). Dropping the pool and leaning on the 'pizza' steer keeps
    // it pizza-shaped but lets the toppings actually vary.
    name: 'Pizza',
    description: 'Cheese, a vegetable, a meaty topping, and aromatics.',
    tier: 'dish',
    steerTag: 'pizza',
    slots: [
      dishSlot('the cheese', { mode: 'category', category: 'Dairy', subcategories: ['Cheese'] }),
      dishSlot('the vegetable', { mode: 'category', category: 'Vegetables' }),
      dishSlot('the meat', { mode: 'category', category: 'Proteins' }),
      dishSlot('the aromatics', { mode: 'category', category: 'Seasonings' }),
    ],
  },
  {
    id: 'dish-soup',
    name: 'Soup',
    description: 'A body, aromatics, richness, and a fresh finish — the broth is implied.',
    tier: 'dish',
    steerTag: 'soups',
    slots: [
      dishSlot('the body', { functions: ['bulk'] }),
      dishSlot('the aromatics', { mode: 'category', category: 'Seasonings' }),
      dishSlot('the richness', { functions: ['fat'] }),
      dishSlot('the finish', { functions: ['fresh-finish'] }),
    ],
  },
  {
    id: 'dish-stir-fry',
    name: 'Stir-Fry',
    description: 'Protein, a crisp vegetable, aromatics, and an umami sauce — rice implied.',
    tier: 'dish',
    steerTag: 'stir-fries',
    slots: [
      dishSlot('the protein', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the crisp veg', { mode: 'category', category: 'Vegetables', textures: ['crisp', 'crunchy'] }),
      dishSlot('the aromatics', { mode: 'taste', taste: 'aromatic', category: 'Seasonings' }),
      dishSlot('the sauce', { functions: ['umami-bomb'] }),
    ],
  },
  {
    id: 'dish-roast',
    name: 'Roast',
    description: 'A roast, root vegetables, herbs, and a bright finish — fat implied.',
    tier: 'dish',
    steerTag: 'roasts',
    slots: [
      dishSlot('the roast', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the root veg', { mode: 'category', category: 'Vegetables', subcategories: ['Roots & Tubers'] }),
      dishSlot('the herbs', { mode: 'taste', taste: 'aromatic', category: 'Seasonings' }),
      dishSlot('the bright finish', { functions: ['acid'] }),
    ],
  },
  {
    id: 'dish-grill',
    name: 'Grill & BBQ',
    description: 'A protein, a char vegetable, a spice rub, a sauce, and something bright.',
    tier: 'dish',
    steerTag: 'grilling & bbq',
    slots: [
      dishSlot('the protein', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the char veg', { mode: 'category', category: 'Vegetables' }),
      dishSlot('the rub', { mode: 'category', category: 'Seasonings', subcategories: ['Spices', 'Spice Blends'] }),
      dishSlot('the sauce', { functions: ['umami-bomb'] }),
      dishSlot('the bright finish', { functions: ['acid'] }),
    ],
  },
  {
    id: 'dish-tacos',
    name: 'Tacos',
    description: 'A protein, a vegetable, heat, and a bright finish — from the taqueria.',
    tier: 'dish',
    steerTag: 'tacos & burritos',
    pool: TACO_POOL,
    slots: [
      dishSlot('the protein', { mode: 'category', category: 'Proteins' }),
      dishSlot('the vegetable', { mode: 'category', category: 'Vegetables' }),
      dishSlot('the heat', { mode: 'category', category: 'Seasonings' }),
      dishSlot('the bright finish', { functions: ['fresh-finish'] }),
    ],
  },
  {
    id: 'dish-curry',
    name: 'Curry',
    description: 'A protein, a vegetable, warm spices, and richness.',
    tier: 'dish',
    steerTag: 'curries',
    slots: [
      dishSlot('the protein', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the vegetable', { mode: 'category', category: 'Vegetables' }),
      dishSlot('the spices', { mode: 'category', category: 'Seasonings', subcategories: ['Spices', 'Spice Blends'] }),
      dishSlot('the richness', { functions: ['fat'] }),
    ],
  },
  {
    id: 'dish-stew',
    name: 'Stew & Braise',
    description: 'A braise, root vegetables, aromatics, and savory depth — the liquid is implied.',
    tier: 'dish',
    steerTag: 'stews',
    slots: [
      dishSlot('the braise', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the root veg', { mode: 'category', category: 'Vegetables', subcategories: ['Roots & Tubers'] }),
      dishSlot('the aromatics', { mode: 'category', category: 'Seasonings' }),
      dishSlot('the depth', { functions: ['umami-bomb'] }),
    ],
  },
  {
    id: 'dish-noodles',
    name: 'Noodles',
    description: 'A protein, a vegetable, an umami sauce, and aromatics — noodles implied.',
    tier: 'dish',
    steerTag: 'noodles',
    slots: [
      dishSlot('the protein', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the vegetable', { mode: 'category', category: 'Vegetables' }),
      dishSlot('the sauce', { functions: ['umami-bomb'] }),
      dishSlot('the aromatics', { mode: 'taste', taste: 'aromatic', category: 'Seasonings' }),
    ],
  },
  {
    id: 'dish-rice',
    name: 'Rice Dish',
    description: 'A rice base, a protein, a vegetable, and aromatics.',
    tier: 'dish',
    steerTag: 'rice dishes',
    slots: [
      dishSlot('the rice', { mode: 'category', category: 'Grains', subcategories: ['Rice'] }),
      dishSlot('the protein', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the vegetable', { mode: 'category', category: 'Vegetables' }),
      dishSlot('the aromatics', { mode: 'category', category: 'Seasonings' }),
    ],
  },
  {
    id: 'dish-casserole',
    name: 'Casserole',
    description: 'A base, a protein, a vegetable, and a rich binder.',
    tier: 'dish',
    steerTag: 'casseroles',
    slots: [
      // Rice/pasta/potato base, not bread stuffing.
      dishSlot('the base', { mode: 'category', category: 'Grains', subcategories: ['Rice', 'Pasta', 'Whole Grains'] }),
      dishSlot('the protein', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the vegetable', { mode: 'category', category: 'Vegetables' }),
      dishSlot('the binder', { functions: ['fat'] }),
    ],
  },
  {
    id: 'dish-sandwich',
    name: 'Sandwich',
    description: 'A filling, a cheese, a crunch, and a bright spread — bread implied.',
    tier: 'dish',
    steerTag: 'sandwiches & burgers',
    slots: [
      dishSlot('the filling', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the cheese', { mode: 'category', category: 'Dairy', subcategories: ['Cheese'] }),
      dishSlot('the crunch', { textures: ['crunchy', 'crisp'] }),
      dishSlot('the spread', { functions: ['acid'] }),
    ],
  },
  {
    id: 'dish-burger',
    name: 'Burger',
    description: 'A patty, a cheese, crisp toppings, and a sauce — bun implied.',
    tier: 'dish',
    steerTag: 'sandwiches & burgers',
    slots: [
      dishSlot('the patty', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the cheese', { mode: 'category', category: 'Dairy', subcategories: ['Cheese'] }),
      dishSlot('the toppings', { mode: 'category', category: 'Vegetables', textures: ['crisp', 'crunchy'] }),
      dishSlot('the sauce', { functions: ['umami-bomb'] }),
    ],
  },
  {
    id: 'dish-skewers',
    name: 'Skewers',
    description: 'A protein, a vegetable, and a spice.',
    tier: 'dish',
    steerTag: 'skewers',
    slots: [
      dishSlot('the protein', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the vegetable', { mode: 'category', category: 'Vegetables', subcategories: ['Fruit Vegetables', 'Allium'] }),
      dishSlot('the spice', { mode: 'category', category: 'Seasonings', subcategories: ['Spices', 'Spice Blends'] }),
    ],
  },
  {
    id: 'dish-dumplings',
    name: 'Dumplings',
    description: 'A filling, aromatics, a vegetable, and a dipping sauce.',
    tier: 'dish',
    slots: [
      dishSlot('the filling', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      dishSlot('the aromatics', { mode: 'category', category: 'Seasonings' }),
      dishSlot('the vegetable', { mode: 'category', category: 'Vegetables' }),
      dishSlot('the dipping sauce', { functions: ['umami-bomb'] }),
    ],
  },
  {
    id: 'dish-sushi',
    name: 'Sushi & Crudo',
    description: 'The fish, something bright, a little heat, and a finish — rice implied.',
    tier: 'dish',
    slots: [
      dishSlot('the fish', { mode: 'category', category: 'Proteins', subcategories: ['Seafood'] }),
      dishSlot('the bright', { functions: ['acid'] }),
      dishSlot('the heat', { mode: 'category', category: 'Seasonings' }),
      dishSlot('the finish', { functions: ['fresh-finish'] }),
    ],
  },
  {
    id: 'dish-breakfast',
    // The corpus's "breakfast" is oatmeal/pancake/parfait country — grain, fruit,
    // warm spice, a drizzle of sweet — so structure it that way, not as a savory
    // protein plate (which the breakfast subgraph can't hold).
    name: 'Breakfast',
    description: 'A grain, a fruit, a warm spice, and something sweet — the morning bowl.',
    tier: 'dish',
    steerTag: 'breakfast',
    slots: [
      dishSlot('the grain', { mode: 'category', category: 'Grains', subcategories: ['Whole Grains'] }),
      dishSlot('the fruit', { mode: 'category', category: 'Fruits' }),
      dishSlot('the warm spice', { mode: 'taste', taste: 'aromatic', category: 'Seasonings' }),
      dishSlot('something sweet', { functions: ['sweetener'] }),
    ],
  },
  {
    id: 'dish-dessert',
    name: 'Dessert',
    description: 'Something sweet, a dairy, fruit, an aromatic, and a crunch.',
    tier: 'dish',
    steerTag: 'desserts',
    slots: [
      dishSlot('something sweet', { functions: ['sweetener'] }),
      dishSlot('the dairy', { mode: 'category', category: 'Dairy' }),
      dishSlot('the fruit', { mode: 'category', category: 'Fruits', taste: 'sweet' }),
      dishSlot('the aromatic', { mode: 'taste', taste: 'aromatic', category: 'Seasonings' }),
      dishSlot('the crunch', { textures: ['crunchy'] }),
    ],
  },
  {
    id: 'dish-dips',
    // A fixed mezze pool starved the bright slot down to lemon every time;
    // the 'dips' steer alone keeps it snacky while letting the acid vary.
    name: 'Dips & Snacks',
    description: 'A rich dip, a crunch, something bright, and aromatics.',
    tier: 'dish',
    steerTag: 'dips',
    slots: [
      dishSlot('the dip', { functions: ['fat'] }),
      dishSlot('the crunch', { textures: ['crunchy', 'crisp'] }),
      dishSlot('the bright', { functions: ['acid'] }),
      dishSlot('the aromatics', { mode: 'category', category: 'Seasonings' }),
    ],
  },
  {
    id: 'dish-board',
    name: 'Cheese Board',
    description: 'A cheese, something sweet, a cured meat, and a crunch.',
    tier: 'dish',
    pool: CHEESE_BOARD_POOL,
    slots: [
      dishSlot('the cheese', { mode: 'category', category: 'Dairy', subcategories: ['Cheese'] }),
      dishSlot('something sweet', { mode: 'taste', taste: 'sweet', category: 'Fruits' }),
      dishSlot('the cured meat', { mode: 'category', category: 'Proteins' }),
      dishSlot('the crunch', { textures: ['crunchy'] }),
    ],
  },

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
  {
    id: 'savory-sweet',
    name: 'Savory Sweet',
    description: 'Sweetness without the fruit — caramelized onion, roots, squash.',
    tier: 'structural',
    slots: [taste('sweet', 'Vegetables', ['Fruits']), taste('salty', 'Proteins')],
  },
];

export default FLAVOR_PRESETS;
