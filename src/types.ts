// types.ts

type IngredientSubcategory = {
  Proteins: "Meat" | "Poultry" | "Seafood" | "Eggs" | "Beans & Legumes" | "Nuts & Seeds" | "Soy & Plant-Based";
  Vegetables: "Allium" | "Leafy Greens" | "Roots & Tubers" | "Squash" | "Brassicas" | "Mushrooms" | "Stalks" | "Fruit Vegetables";
  Fruits: "Citrus" | "Stone Fruit" | "Tropical" | "Berries" | "Pome Fruit" | "Melons";
  Dairy: "Cheese" | "Cultured" | "Milk & Cream" | "Custards & Frozen";
  Seasonings: "Herbs" | "Spices" | "Spice Blends" | "Chilis" | "Salts";
  Pantry: "Fats & Oils" | "Vinegars" | "Stocks & Bases" | "Sauces & Condiments" | "Sweeteners";
  Grains: "Rice" | "Pasta" | "Bread" | "Whole Grains" | "Corn" | "Starches";
  Alcohol: "Wine" | "Beer & Cider" | "Spirits" | "Liqueurs";
}

// Controlled texture vocabulary (P4 data layer). Tags describe the ingredient's
// TYPICAL SERVED state, not the raw one (acorn squash = creamy, not hard).
// Ground spices, extracts, and other texture-neutral ingredients carry no tags.
export const TEXTURES = [
  'crunchy',  // hard, loud crunch: raw carrot, nuts, toasted seeds
  'crisp',    // brittle/shattering or refreshing snap: lettuce, apple, bacon, cracker
  'creamy',   // smooth and rich: avocado, ricotta, cooked squash
  'tender',   // yields easily: braised meat, roasted vegetables, soft greens
  'chewy',    // sustained bite: dried fruit, cooked grains, squid
  'juicy',    // releases liquid when bitten: citrus, tomato, melon, seared steak
  'flaky',    // separates in layers/flakes: cooked fish, pastry
  'starchy',  // dense, dry-fluffy body: potato, beans, rice, bread
  'liquid',   // pourable in served form: oils, vinegars, stocks, sauces
  'airy',     // light, aerated: whipped cream, meringue, puffed grains
] as const;
export type Texture = (typeof TEXTURES)[number];

// Structural roles an ingredient plays in a dish — the mechanism behind
// dish frames ("a salad needs a crunch-topper and an acid") and substitution.
export const INGREDIENT_FUNCTIONS = [
  'acid',          // brightens/cuts: vinegar, citrus, wine, cultured dairy
  'fat',           // richness/carries flavor: oils, butter, cheese, nuts, avocado
  'binder',        // holds things together: egg, starches, mayo, cream
  'bulk',          // the body of the dish: grains, pasta, proteins, hearty veg
  'fresh-finish',  // raw brightness added at the end: soft herbs, zest, sprouts
  'crunch-topper', // texture garnish: nuts, seeds, fried alliums
  'sweetener',     // adds sweetness: honey, sugars, syrups
  'umami-bomb',    // concentrated savoriness: fish sauce, miso, parmesan, anchovy
  'aromatic-base', // the dish's flavor engine, cooked in early: alliums, ginger, lemongrass
] as const;
export type IngredientFunction = (typeof INGREDIENT_FUNCTIONS)[number];

// Controlled cooking-method vocabulary (P6 audit pass). Methods the ingredient
// genuinely suits — not every method it survives. Empty array = audited, not
// applicable (vinegars, extracts, most liquids). Mirrors COOKING_METHODS in
// tooling/profile-audit/vocab.mjs; the audit's check.mjs enforces sync.
export const COOKING_METHODS = [
  'raw',
  'roasted',
  'grilled',
  'seared',
  'sautéed',
  'stir-fried',
  'fried',
  'baked',
  'braised',
  'simmered',
  'steamed',
  'poached',
  'blanched',
  'cured',
  'pickled',
  'fermented',
  'smoked',
  'toasted',
] as const;
export type CookingMethod = (typeof COOKING_METHODS)[number];

export interface IngredientProfile {
  name: string;
  category: keyof IngredientSubcategory;
  subcategory: IngredientSubcategory[keyof IngredientSubcategory];
  flavorProfile: {
    sweet: number;
    salty: number;
    sour: number;
    umami: number;
    fat: number;
    spicy: number;
    aromatic: number;
  };
  description: string;
  // P4 data layer — populated by tooling/profile-audit (typical served state)
  textures?: Texture[];
  functions?: IngredientFunction[];
  // P6 audit pass — populated by tooling/profile-audit
  cookingMethods?: CookingMethod[];
  intensity?: number; // 1–10: how loudly it announces itself at typical quantity (habanero 10, jalapeño 6, chicken breast 2)
  // MVP+ (unpopulated)
  allergen?: string[];
  dietary?: string[];
  
  // Menu Planner extensions
  dishTypes?: ('entree' | 'side' | 'salad' | 'dessert' | 'beverage' | 'sauce')[];
  weight?: number; // Scale 1-10: flavor intensity/prominence
  volume?: number; // Scale 1-10: typical quantity used
  seasonality?: ('spring' | 'summer' | 'fall' | 'winter' | 'year-round')[];
}

// Dish structure for Menu Planner
export interface Dish {
  id: string;
  name: string;
  type: 'entree' | 'side' | 'salad' | 'dessert' | 'beverage' | 'sauce';
  keyIngredient: string; // Primary ingredient from which the dish is built
  ingredients: string[]; // Array of ingredient names in the dish
  tasteProfile: {
    sweet: number;
    salty: number;
    sour: number;
    umami: number;
    fat: number;
    spicy: number;
    aromatic: number;
  };
  weight: number; // Overall weight/intensity
  preparationTime?: number; // Optional: estimated minutes
}

// Menu structure for Menu Planner
export interface Menu {
  id: string;
  name: string;
  keyIngredient: string; // The central ingredient of the menu
  dishes: Dish[]; // Array of dishes in the menu
  balanceScore: number; // Overall taste balance score (0-100)
  tasteProfile: {
    sweet: number;
    salty: number;
    sour: number;
    umami: number;
    fat: number;
    spicy: number;
    aromatic: number;
  };
}

// Taste properties for filtering
export type TasteProperty = 'sweet' | 'salty' | 'sour' | 'umami' | 'fat' | 'spicy' | 'aromatic';

export const TASTE_PROPERTIES: TasteProperty[] = ['sweet', 'salty', 'sour', 'umami', 'fat', 'spicy', 'aromatic'];

export type { IngredientSubcategory };