import { Dish, Menu, IngredientProfile } from '../../types';
import { calculateMenuBalance, calculateCombinedTasteProfile } from './tasteBalance';
import { generateDish, generateId } from './dishSuggestion';

/**
 * Utility function to capitalize the first letter of a string
 */
export const capitalizeFirst = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Generates a menu name based on key ingredient and dishes
 * 
 * @param keyIngredient The key ingredient of the menu
 * @param dishes Array of dishes in the menu
 * @returns Generated menu name
 */
export const generateMenuName = (
  keyIngredient: string,
  dishes: Dish[]
): string => {
  // If there are no dishes, use a simple name
  if (!dishes.length) {
    return `${capitalizeFirst(keyIngredient)} Menu`;
  }
  
  // If there's only one dish, use the dish name
  if (dishes.length === 1) {
    return dishes[0].name;
  }
  
  // For multiple dishes, use a theme based on key ingredient
  const descriptors = [
    'Inspired',
    'Themed',
    'Focused',
    'Showcase',
    'Celebration',
    'Exploration'
  ];
  
  const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];
  return `${capitalizeFirst(keyIngredient)} ${descriptor} Menu`;
};

/**
 * Generates a complete balanced menu based on wizard inputs
 * 
 * @param keyIngredient The primary ingredient for the menu
 * @param dishTypes Types of dishes to include
 * @param allIngredients Array of all ingredient profiles
 * @param flavorMap Map of ingredient compatibility
 * @param ingredientProfileMap Map of ingredient names to profiles
 * @param restrictions Dietary restrictions to respect
 * @returns Complete generated menu
 */
export const autoGenerateMenu = (
  keyIngredient: string,
  dishTypes: string[],
  allIngredients: IngredientProfile[],
  flavorMap: Map<string, Set<string>>,
  ingredientProfileMap: Map<string, IngredientProfile>,
  restrictions: string[] = []
): Menu => {
  // 1. Start with an empty menu
  const dishes: Dish[] = [];
  
  // 2. Generate entree first (if included)
  if (dishTypes.includes('entree')) {
    const entree = generateDish(
      keyIngredient, 
      'entree', 
      dishes, 
      allIngredients, 
      flavorMap, 
      ingredientProfileMap, 
      restrictions
    );
    dishes.push(entree);
  }
  
  // 3. Generate remaining dishes
  const remainingTypes = dishTypes.filter(type => type !== 'entree');
  
  for (const dishType of remainingTypes) {
    // For each remaining dish type, generate a complementary dish
    const dish = generateDish(
      keyIngredient, 
      dishType, 
      dishes, 
      allIngredients, 
      flavorMap, 
      ingredientProfileMap, 
      restrictions
    );
    dishes.push(dish);
  }
  
  // 4. Calculate overall menu balance
  const balanceScore = calculateMenuBalance(dishes);
  const tasteProfile = calculateCombinedTasteProfile(dishes);
  
  // 5. Create and return the menu
  return {
    id: generateId(),
    name: generateMenuName(keyIngredient, dishes),
    keyIngredient,
    dishes,
    balanceScore,
    tasteProfile
  };
};

/**
 * Updates a menu after making changes to dishes
 * 
 * @param menu The menu to update
 * @returns Updated menu with recalculated scores
 */
export const updateMenu = (menu: Menu): Menu => {
  // Recalculate taste profile and balance score
  const tasteProfile = calculateCombinedTasteProfile(menu.dishes);
  const balanceScore = calculateMenuBalance(menu.dishes);
  
  // Return updated menu
  return {
    ...menu,
    tasteProfile,
    balanceScore
  };
};

/**
 * Updates a menu after adding a dish
 * 
 * @param menu Current menu
 * @param dish New dish to add
 * @returns Updated menu
 */
export const addDishToMenu = (menu: Menu, dish: Dish): Menu => {
  // Create new dishes array with the added dish
  const updatedDishes = [...menu.dishes, dish];
  
  // Return updated menu
  return {
    ...menu,
    dishes: updatedDishes,
    tasteProfile: calculateCombinedTasteProfile(updatedDishes),
    balanceScore: calculateMenuBalance(updatedDishes)
  };
};

/**
 * Updates a menu after removing a dish
 * 
 * @param menu Current menu
 * @param dishId ID of dish to remove
 * @returns Updated menu
 */
export const removeDishFromMenu = (menu: Menu, dishId: string): Menu => {
  // Create new dishes array without the removed dish
  const updatedDishes = menu.dishes.filter(dish => dish.id !== dishId);
  
  // Return updated menu
  return {
    ...menu,
    dishes: updatedDishes,
    tasteProfile: calculateCombinedTasteProfile(updatedDishes),
    balanceScore: calculateMenuBalance(updatedDishes)
  };
};

/**
 * Updates a menu after updating a dish
 * 
 * @param menu Current menu
 * @param updatedDish Updated dish
 * @returns Updated menu
 */
export const updateDishInMenu = (menu: Menu, updatedDish: Dish): Menu => {
  // Create new dishes array with the updated dish
  const updatedDishes = menu.dishes.map(dish => 
    dish.id === updatedDish.id ? updatedDish : dish
  );
  
  // Return updated menu
  return {
    ...menu,
    dishes: updatedDishes,
    tasteProfile: calculateCombinedTasteProfile(updatedDishes),
    balanceScore: calculateMenuBalance(updatedDishes)
  };
};

/**
 * Creates an ingredient profile map for quick lookup
 * 
 * @param ingredientProfiles Array of ingredient profiles
 * @returns Map of ingredient names to profiles
 */
export const createIngredientProfileMap = (
  ingredientProfiles: IngredientProfile[]
): Map<string, IngredientProfile> => {
  const map = new Map<string, IngredientProfile>();
  
  ingredientProfiles.forEach(profile => {
    map.set(profile.name, profile);
  });
  
  return map;
};
