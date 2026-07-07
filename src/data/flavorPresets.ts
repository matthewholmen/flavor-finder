import { SlotTaste, TasteKey, CategoryKey } from '../hooks/useSlots.ts';
import { IngredientFunction, Texture } from '../types.ts';

// A Flavor Preset is the *DNA* of a pairing, not a fixed set of ingredients: an
// ordered list of slot constraints (each a dominant taste or a category) that
// Taste Lab loads and then generates a fresh, mutually-compatible combo for.
// Load "Sweet & Salty" and Generate keeps handing you new sweet+salty pairs.
//
// `frame` presets (P5) are dish frames: the app takes an editorial point of
// view on a dish's STRUCTURE (named roles — "base greens", "the crunch") while
// the engine supplies compatible content. Prescriptive about structure,
// permissive about outcome; the pairing rule is untouched.
export type PresetTier = 'custom' | 'frame' | 'classic' | 'structural' | 'themed';

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
  // Themed presets constrain EVERY slot to a curated whitelist of ingredients
  // (e.g. a pizza pantry). Slots still apply their own taste/category on top, so
  // "pizza · cheese" picks within the pizza pool. Omitted = the full library.
  pool?: string[];
  // Dish-tag steer to lock on load (a CONTEXT_DISH_TYPES entry). Frames use it
  // so the Salad frame generates inside the "salads" subgraph and its receipts
  // agree with the structure instead of suggesting a stew. Steering is a map
  // SUBSET — a pool input change, never a pairing relaxation. Omit when the
  // mined vocabulary has no honest match (Grain Bowl).
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
// A wild slot — no taste/category constraint. The remembered taste/category are
// arbitrary defaults for if the user toggles it off wild.
const wild = (): SlotTaste => ({ mode: 'wild', taste: 'umami', category: 'Vegetables' });

// A dish-frame slot: an editorial role name over any base constraint, plus
// optional structural (texture/function) narrowing from the P4 data layer.
// Defaults to wild mode — most frame roles are structural, not categorical.
const frameSlot = (
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
  frame: 'Dish frames',
  classic: 'Classic contrasts',
  structural: 'Structural templates',
  themed: 'Themed pools',
};

// Curated ingredient pools for themed presets. Each is a cross-category whitelist
// of real library ingredients; the solver finds a mutually-compatible subset.

// Every cheese in the library — a big pool gives the solver more nodes/edges so
// a themed preset doesn't feel one-note.
const ALL_CHEESES = [
  'asiago', 'blue cheese', 'brie', 'burrata', 'cheddar', 'colby', 'swiss cheese',
  'feta', 'fontina', 'goat cheese', 'gorgonzola', 'gouda', 'gruyère', 'havarti',
  'monterey jack', 'manchego', 'mascarpone', 'mozzarella', 'muenster', 'parmesan',
  'pecorino', 'provolone', 'queso fresco', 'ricotta', 'romano', 'taleggio', 'roquefort',
  'stilton cheese', 'halloumi', 'paneer', 'cotija', 'ricotta salata', 'cottage cheese',
  'camembert',
];

const PIZZA_POOL = [
  ...ALL_CHEESES,
  // Tomato base + aromatics/oil (kept in the pool so they pair well even though
  // the slots draw cheese, vegetable, and protein).
  'tomato', 'tomato paste', 'sun-dried tomato', 'roasted red pepper', 'basil', 'oregano',
  'chili flake', 'pesto', 'olive oil',
  // Vegetable toppings — a wide spread so the veg slot rerolls broadly.
  'garlic', 'onion', 'red onion', 'shallot', 'leek', 'scallion', 'bell pepper', 'mushroom',
  'cremini', 'portobello', 'arugula', 'spinach', 'kale', 'radicchio', 'artichoke', 'eggplant',
  'zucchini', 'broccolini', 'fennel', 'jalapeño', 'black olive', 'capers',
  // Cured meats + a couple of fresh proteins for the protein slot.
  'prosciutto', 'pancetta', 'guanciale', 'sausage', 'salami', 'nduja', 'mortadella', 'ham',
  'bacon', 'anchovy', 'chicken',
];
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
const STIR_FRY_POOL = [
  'soy sauce', 'tamari', 'oyster sauce', 'hoisin', 'sesame oil', 'ginger', 'garlic',
  'scallion', 'chili oil', 'chili crisp', 'shiitake', 'bok choy', 'napa cabbage',
  'snap pea', 'bell pepper', 'carrot', 'broccoli', 'broccolini', 'tofu', 'tempeh',
  'beef', 'chicken', 'pork', 'shrimp', 'rice', 'noodles', 'sriracha', 'sambal oelek',
  'gochujang', 'five-spice', 'shaoxing wine', 'edamame',
];
const MEZZE_POOL = [
  'feta', 'halloumi', 'olive oil', 'black olive', 'green olive', 'lemon', 'garlic',
  'chickpea', 'hummus', 'tahini', 'cucumber', 'tomato', 'parsley', 'mint', 'dill',
  'oregano', "za'atar", 'sumac', 'eggplant', 'yogurt', 'labneh', 'pomegranate',
  'pine nut', 'lamb', 'harissa', 'preserved lemon', 'red onion', 'bell pepper',
];

export const FLAVOR_PRESETS: FlavorPreset[] = [
  // ── Dish frames: a dish's structure as named roles (P5). The frame says
  //    what a salad NEEDS; the engine says what fits. Roles lean on the P4
  //    texture/function layer, so "the crunch" means crunchy things that pair,
  //    whatever category they come from. ─────────────────────────────────────
  {
    id: 'frame-salad',
    name: 'Salad',
    description: 'Greens, crunch, something sweet, a fat, and an acid — a whole salad by structure.',
    tier: 'frame',
    steerTag: 'salads',
    slots: [
      frameSlot('base greens', { mode: 'category', category: 'Vegetables', subcategories: ['Leafy Greens'] }),
      frameSlot('the crunch', { textures: ['crunchy', 'crisp'] }),
      frameSlot('something sweet', { mode: 'taste', taste: 'sweet', category: 'Fruits' }),
      frameSlot('the fat', { functions: ['fat'] }),
      frameSlot('the acid', { functions: ['acid'] }),
    ],
  },
  {
    id: 'frame-grain-bowl',
    name: 'Grain Bowl',
    description: 'A base grain, a substantial protein, a vegetable, a sauce, and a finish.',
    tier: 'frame',
    slots: [
      frameSlot('the base', { mode: 'category', category: 'Grains' }),
      frameSlot('the protein', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      frameSlot('the vegetable', { mode: 'category', category: 'Vegetables' }),
      frameSlot('the sauce', { functions: ['fat', 'umami-bomb'] }),
      frameSlot('the finish', { functions: ['fresh-finish', 'crunch-topper'] }),
    ],
  },
  {
    id: 'frame-pasta',
    name: 'Pasta Night',
    description: 'The pasta, a body, richness, savory depth, and a fresh finish.',
    tier: 'frame',
    steerTag: 'pasta',
    slots: [
      frameSlot('the pasta', { mode: 'category', category: 'Grains', subcategories: ['Pasta'] }),
      frameSlot('the body', { functions: ['bulk'], exclude: ['Grains'] }),
      frameSlot('the richness', { functions: ['fat'] }),
      frameSlot('the depth', { functions: ['umami-bomb'] }),
      frameSlot('the finish', { functions: ['fresh-finish'] }),
    ],
  },
  {
    id: 'frame-stir-fry',
    name: 'Stir-Fry',
    description: 'Protein, a crisp vegetable, aromatics, an umami sauce, and a base.',
    tier: 'frame',
    steerTag: 'stir-fries',
    slots: [
      frameSlot('the protein', { mode: 'category', category: 'Proteins', functions: ['bulk'] }),
      frameSlot('the crisp veg', { mode: 'category', category: 'Vegetables', textures: ['crisp', 'crunchy'] }),
      frameSlot('the aromatics', { mode: 'taste', taste: 'aromatic', category: 'Seasonings' }),
      frameSlot('the sauce', { functions: ['umami-bomb'] }),
      frameSlot('the base', { mode: 'category', category: 'Grains' }),
    ],
  },
  {
    id: 'frame-soup',
    name: 'Soup',
    description: 'A broth, a body, aromatics, richness, and a fresh finish.',
    tier: 'frame',
    steerTag: 'soups',
    slots: [
      frameSlot('the broth', { mode: 'category', category: 'Pantry', subcategories: ['Stocks & Bases'] }),
      frameSlot('the body', { functions: ['bulk'] }),
      frameSlot('the aromatics', { mode: 'category', category: 'Seasonings' }),
      frameSlot('the richness', { functions: ['fat'] }),
      frameSlot('the finish', { functions: ['fresh-finish'] }),
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

  // ── Themed pools: every slot is drawn from a curated ingredient set ────────
  {
    id: 'pizza-night',
    name: 'Pizza Night',
    description: 'Cheese, a vegetable, and a meaty topping — all from the pizza pantry.',
    tier: 'themed',
    slots: [cat('Dairy'), cat('Vegetables'), cat('Proteins')],
    pool: PIZZA_POOL,
  },
  {
    id: 'taco-bar',
    name: 'Taco Bar',
    description: 'Protein, vegetable, and heat from the taqueria.',
    tier: 'themed',
    slots: [cat('Proteins'), cat('Vegetables'), taste('spicy', 'Seasonings')],
    pool: TACO_POOL,
  },
  {
    id: 'cheese-board',
    name: 'Cheese Board',
    description: 'A cheese, something sweet, and an accompaniment.',
    tier: 'themed',
    slots: [cat('Dairy'), taste('sweet', 'Fruits'), wild()],
    pool: CHEESE_BOARD_POOL,
  },
  {
    id: 'stir-fry',
    // "Stir-Fry" proper is now the dish frame above; this themed pool keeps the
    // curated wok pantry under a name that says what it is.
    name: 'Wok Pantry',
    description: 'Protein, vegetable, and an umami sauce from the wok.',
    tier: 'themed',
    slots: [cat('Proteins'), cat('Vegetables'), taste('umami', 'Pantry')],
    pool: STIR_FRY_POOL,
  },
  {
    id: 'mezze',
    name: 'Mediterranean Mezze',
    description: 'A cheese, a vegetable, and a bright herb.',
    tier: 'themed',
    slots: [cat('Dairy'), cat('Vegetables'), taste('aromatic', 'Seasonings')],
    pool: MEZZE_POOL,
  },
];

export default FLAVOR_PRESETS;
