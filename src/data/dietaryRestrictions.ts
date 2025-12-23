/**
 * Dietary restriction ingredient lists and utilities
 * Centralized location for all dietary filtering logic
 */

// List of nut ingredients for nut-free filter
export const NUT_INGREDIENTS = [
  'almond', 'almond liqueur', 'almond oil', 'amaretto',
  'cashew', 'chestnut', 'hazelnut', 'macadamia nut',
  'peanut', 'peanut oil', 'pecan', 'pecan oil',
  'pine nut', 'pistachio', 'walnut', 'walnut oil', 'nuts'
];

// List of nightshade ingredients for nightshade-free filter
export const NIGHTSHADE_INGREDIENTS = [
  'tomato', 'tomatoes', 'cherry tomato', 'sun-dried tomato', 'tomato paste',
  'bell pepper', 'red bell pepper', 'green bell pepper', 'yellow bell pepper',
  'pepper', 'peppers', 'sweet pepper',
  'eggplant', 'aubergine',
  'potato', 'potatoes',
  'cayenne', 'cayenne pepper',
  'paprika', 'smoked paprika',
  'chili', 'chili pepper', 'chili powder', 'chipotle', 'chipotle pepper',
  'jalapeño', 'jalapeno', 'serrano', 'serrano pepper',
  'habanero', 'ancho chili', 'poblano', 'guajillo',
  'red pepper flakes', 'crushed red pepper',
  'pimento', 'pimientos', 'goji berry', 'goji berries',
  'tomatillo', 'hot sauce', 'tabasco', 'sriracha'
];

// List of high-FODMAP ingredients for low-FODMAP filter
export const HIGH_FODMAP_INGREDIENTS = [
  // Alliums (high in fructans)
  'garlic', 'onion', 'onions', 'red onion', 'white onion', 'yellow onion',
  'shallot', 'shallots', 'leek', 'leeks', 'scallion', 'scallions',
  'green onion', 'green onions', 'spring onion', 'chives',
  // Legumes (high in GOS)
  'beans', 'black beans', 'kidney bean', 'kidney beans', 'chickpea', 'chickpeas',
  'lentils', 'baked beans', 'cannellini beans', 'fava beans', 'lima beans',
  'navy beans', 'pinto beans', 'red beans', 'white beans', 'flageolet beans',
  'black-eyed peas', 'legume', 'legumes',
  // High-fructose fruits
  'apple', 'apples', 'pear', 'pears', 'mango', 'watermelon',
  'cherry', 'cherries', 'apricot', 'apricots', 'peach', 'peaches',
  'plum', 'plums', 'nectarine', 'nectarines', 'blackberry', 'blackberries',
  // Dairy with lactose
  'milk', 'cream', 'ice cream', 'soft cheese', 'ricotta', 'cottage cheese',
  'cream cheese', 'mascarpone', 'sour cream', 'buttermilk',
  // Wheat products
  'bread', 'pasta', 'couscous', 'wheat', 'barley', 'rye',
  // Sweeteners
  'honey', 'agave', 'high fructose corn syrup', 'molasses',
  // Vegetables
  'artichoke', 'artichokes', 'asparagus', 'cauliflower', 'mushroom', 'mushrooms',
  'snow peas', 'sugar snap peas'
];

// Pre-computed Sets for O(1) lookup performance
export const NUT_INGREDIENTS_SET = new Set(NUT_INGREDIENTS);
export const NIGHTSHADE_INGREDIENTS_SET = new Set(NIGHTSHADE_INGREDIENTS);
export const HIGH_FODMAP_INGREDIENTS_SET = new Set(HIGH_FODMAP_INGREDIENTS);

export interface DietaryRestrictions {
  [key: string]: boolean;
}

interface IngredientProfile {
  name: string;
  category?: string;
  subcategory?: string;
}

/**
 * Check if an ingredient is restricted by dietary settings
 *
 * @param ingredient - The ingredient name to check
 * @param dietaryRestrictions - Object with dietary restriction flags
 * @param ingredientProfiles - Array of ingredient profiles for category matching
 * @returns true if the ingredient should be excluded
 */
export const isIngredientRestricted = (
  ingredient: string,
  dietaryRestrictions: DietaryRestrictions,
  ingredientProfiles: IngredientProfile[]
): boolean => {
  const restrictedKeys = Object.entries(dietaryRestrictions)
    .filter(([_, value]) => value === false)
    .map(([key]) => key);

  if (restrictedKeys.length === 0) return false;

  const lowerIngredient = ingredient.toLowerCase();

  // Special handling for nut-free (O(1) lookup with Set)
  if (restrictedKeys.includes('_nuts')) {
    if (NUT_INGREDIENTS_SET.has(lowerIngredient)) {
      return true;
    }
  }

  // Special handling for nightshade-free (O(1) lookup with Set)
  if (restrictedKeys.includes('_nightshades')) {
    if (NIGHTSHADE_INGREDIENTS_SET.has(lowerIngredient)) {
      return true;
    }
  }

  // Special handling for low-FODMAP (O(1) lookup with Set)
  if (restrictedKeys.includes('_fodmap')) {
    if (HIGH_FODMAP_INGREDIENTS_SET.has(lowerIngredient)) {
      return true;
    }
  }

  // Check category-based restrictions
  const profile = ingredientProfiles.find(
    p => p.name.toLowerCase() === lowerIngredient
  );
  if (!profile) return false;

  return restrictedKeys.some(key => {
    // Skip special keys that don't follow category:subcategory format
    if (key.startsWith('_')) return false;
    const [cat, subcat] = key.split(':');
    return profile.category?.toLowerCase() === cat.toLowerCase() &&
           profile.subcategory?.toLowerCase() === subcat.toLowerCase();
  });
};

/**
 * Quick check if an ingredient is a nut
 */
export const isNutIngredient = (ingredient: string): boolean => {
  return NUT_INGREDIENTS_SET.has(ingredient.toLowerCase());
};

/**
 * Quick check if an ingredient is a nightshade
 */
export const isNightshadeIngredient = (ingredient: string): boolean => {
  return NIGHTSHADE_INGREDIENTS_SET.has(ingredient.toLowerCase());
};

/**
 * Quick check if an ingredient is high-FODMAP
 */
export const isHighFodmapIngredient = (ingredient: string): boolean => {
  return HIGH_FODMAP_INGREDIENTS_SET.has(ingredient.toLowerCase());
};
