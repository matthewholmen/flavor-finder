import { Dish, IngredientProfile } from '../../types';
import { findComplementaryProfile, calculateProfileMatchScore, calculateCombinedTasteProfile } from './tasteBalance';

/**
 * Gets ingredient profiles that are suitable for a specific dish type
 * 
 * @param allIngredients Array of all ingredient profiles
 * @param dishType Target dish type
 * @returns Filtered array of ingredients suitable for the dish type
 */
export const getIngredientsForDishType = (
  allIngredients: IngredientProfile[],
  dishType: string
): IngredientProfile[] => {
  return allIngredients.filter(ingredient => 
    ingredient.dishTypes?.includes(dishType as any)
  );
};

/**
 * Find compatible ingredients for a key ingredient
 * 
 * @param keyIngredient The primary ingredient to build around
 * @param flavorMap Map of ingredient compatibility 
 * @returns Array of compatible ingredient names
 */
export const findCompatibleIngredients = (
  keyIngredient: string,
  flavorMap: Map<string, Set<string>>
): string[] => {
  // If the key ingredient isn't in the map, return empty array
  if (!flavorMap.has(keyIngredient)) return [];
  
  // Return the compatible ingredients as an array
  const compatibleSet = flavorMap.get(keyIngredient);
  return compatibleSet ? Array.from(compatibleSet) : [];
};

/**
 * Suggests ingredients for a dish based on key ingredient and menu context
 * 
 * @param keyIngredient The primary ingredient to build around
 * @param existingDishes Other dishes already in the menu
 * @param targetDishType Type of dish being built
 * @param allIngredients Array of all ingredient profiles
 * @param flavorMap Map of ingredient compatibility
 * @param ingredientProfileMap Map of ingredient names to profiles for quick lookup
 * @returns Array of suggested ingredient names, sorted by compatibility
 */
export const suggestComplementaryIngredients = (
  keyIngredient: string,
  existingDishes: Dish[],
  targetDishType: string,
  allIngredients: IngredientProfile[],
  flavorMap: Map<string, Set<string>>,
  ingredientProfileMap: Map<string, IngredientProfile>
): string[] => {
  // 1. Get compatible ingredients with key ingredient
  const compatibleIngredients = findCompatibleIngredients(keyIngredient, flavorMap);
  
  // 2. Filter by dish type (if ingredient has dishTypes property)
  const suitableIngredients = compatibleIngredients.filter(ingredient => {
    const profile = ingredientProfileMap.get(ingredient);
    // If the ingredient has dish types and the target type is included, or if no dish types defined
    return !profile?.dishTypes || profile.dishTypes.includes(targetDishType as any);
  });
  
  // 3. Calculate current menu taste profile
  const currentTasteProfile = existingDishes.length > 0 
    ? calculateCombinedTasteProfile(existingDishes)
    : null;
  
  // 4. Find ideal complementary profile if we have existing dishes
  const idealComplement = currentTasteProfile 
    ? findComplementaryProfile(currentTasteProfile)
    : null;
  
  // 5. Sort ingredients by how well they match the ideal complement (if available)
  if (idealComplement) {
    return suitableIngredients.sort((a, b) => {
      const profileA = ingredientProfileMap.get(a);
      const profileB = ingredientProfileMap.get(b);
      
      if (!profileA || !profileB) return 0;
      
      const matchScoreA = calculateProfileMatchScore(profileA.flavorProfile, idealComplement);
      const matchScoreB = calculateProfileMatchScore(profileB.flavorProfile, idealComplement);
      
      return matchScoreB - matchScoreA;
    });
  }
  
  // If no existing dishes, just return the suitable ingredients
  return suitableIngredients;
};

/**
 * Generates a dish based on a key ingredient and dish type
 * 
 * @param keyIngredient Primary ingredient to build around
 * @param dishType Type of dish to generate
 * @param existingDishes Other dishes already in the menu
 * @param allIngredients Array of all ingredient profiles
 * @param flavorMap Map of ingredient compatibility
 * @param ingredientProfileMap Map of ingredient names to profiles for quick lookup
 * @param restrictions Dietary restrictions to respect
 * @returns Generated dish
 */
export const generateDish = (
  keyIngredient: string,
  dishType: string,
  existingDishes: Dish[],
  allIngredients: IngredientProfile[],
  flavorMap: Map<string, Set<string>>,
  ingredientProfileMap: Map<string, IngredientProfile>,
  restrictions: string[] = []
): Dish => {
  // 1. Get suggestions based on key ingredient and dish type
  const suggestions = suggestComplementaryIngredients(
    keyIngredient,
    existingDishes,
    dishType,
    allIngredients,
    flavorMap,
    ingredientProfileMap
  );
  
  // 2. Filter out restricted ingredients
  const validSuggestions = suggestions.filter(ingredient => 
    !isRestricted(ingredient, restrictions, ingredientProfileMap)
  );
  
  // 3. Select primary ingredient for this dish
  const primaryIngredient = validSuggestions.length > 0 ? validSuggestions[0] : keyIngredient;
  
  // 4. Find compatible ingredients for this primary ingredient
  let dishIngredients = [primaryIngredient];
  const compatibleWithPrimary = findCompatibleIngredients(primaryIngredient, flavorMap)
    .filter(ingredient => 
      ingredient !== keyIngredient && 
      !isRestricted(ingredient, restrictions, ingredientProfileMap)
    );
  
  // 5. Add 2-4 more ingredients (prioritizing those that balance the overall menu)
  const additionalCount = Math.floor(Math.random() * 3) + 2; // 2-4 additional ingredients
  
  for (let i = 0; i < Math.min(additionalCount, compatibleWithPrimary.length); i++) {
    dishIngredients.push(compatibleWithPrimary[i]);
  }
  
  // 6. Generate dish name
  const dishName = generateRecipeName(dishIngredients, dishType);
  
  // 7. Calculate dish taste profile and weight
  const tasteProfile = calculateDishTasteProfile(dishIngredients, ingredientProfileMap);
  const weight = calculateDishWeight(dishIngredients, ingredientProfileMap);
  
  // 8. Create and return the dish
  return {
    id: generateId(),
    name: dishName,
    type: dishType as any,
    keyIngredient: primaryIngredient,
    ingredients: dishIngredients,
    tasteProfile,
    weight
  };
};

/**
 * Checks if an ingredient violates dietary restrictions
 * 
 * @param ingredient Ingredient name to check
 * @param restrictions Array of dietary restrictions
 * @param ingredientProfileMap Map of ingredient names to profiles
 * @returns True if restricted, false otherwise
 */
export const isRestricted = (
  ingredient: string,
  restrictions: string[],
  ingredientProfileMap: Map<string, IngredientProfile>
): boolean => {
  if (restrictions.length === 0) return false;
  
  const profile = ingredientProfileMap.get(ingredient);
  if (!profile) return false;
  
  // Check if any of the restrictions apply to this ingredient
  for (const restriction of restrictions) {
    // Check allergens
    if (profile.allergen?.includes(restriction)) {
      return true;
    }
    
    // Check dietary restrictions
    if (profile.dietary?.some(diet => diet.includes(restriction))) {
      return true;
    }
    
    // Category-based restrictions (e.g., "no meat")
    if (restriction === 'no meat' && 
        (profile.category === 'Proteins' && 
         ['Meat', 'Pork', 'Poultry', 'Game', 'Fish', 'Offal'].includes(profile.subcategory as string))) {
      return true;
    }
    
    // Add more restriction checks as needed
  }
  
  return false;
};

/**
 * Calculates the taste profile of a dish based on its ingredients
 * 
 * @param ingredients Array of ingredient names
 * @param ingredientProfileMap Map of ingredient names to profiles
 * @returns Combined taste profile
 */
export const calculateDishTasteProfile = (
  ingredients: string[],
  ingredientProfileMap: Map<string, IngredientProfile>
): Dish['tasteProfile'] => {
  // Initialize with zeros
  const profile = {
    sweet: 0,
    salty: 0,
    sour: 0,
    bitter: 0,
    umami: 0,
    fat: 0,
    spicy: 0
  };
  
  // If no ingredients, return zeroed profile
  if (!ingredients.length) return profile;
  
  // Sum up the taste values from all ingredients
  let validIngredients = 0;
  
  for (const ingredient of ingredients) {
    const ingredientProfile = ingredientProfileMap.get(ingredient);
    if (ingredientProfile?.flavorProfile) {
      Object.keys(profile).forEach(taste => {
        profile[taste as keyof typeof profile] += ingredientProfile.flavorProfile[taste as keyof typeof profile];
      });
      validIngredients++;
    }
  }
  
  // Normalize by taking the average and ensuring values stay in 0-10 range
  if (validIngredients > 0) {
    Object.keys(profile).forEach(taste => {
      profile[taste as keyof typeof profile] = Math.min(10, profile[taste as keyof typeof profile] / validIngredients);
    });
  }
  
  return profile;
};

/**
 * Calculates the overall weight (intensity) of a dish
 * 
 * @param ingredients Array of ingredient names
 * @param ingredientProfileMap Map of ingredient names to profiles
 * @returns Weight value (1-10)
 */
export const calculateDishWeight = (
  ingredients: string[],
  ingredientProfileMap: Map<string, IngredientProfile>
): number => {
  // If no ingredients, return default weight
  if (!ingredients.length) return 5;
  
  let totalWeight = 0;
  let countWithWeight = 0;
  
  ingredients.forEach(ingredient => {
    const profile = ingredientProfileMap.get(ingredient);
    if (profile?.weight) {
      totalWeight += profile.weight;
      countWithWeight++;
    } else if (profile?.intensity) {
      // Fall back to intensity if weight is not available
      totalWeight += profile.intensity;
      countWithWeight++;
    }
  });
  
  // If no ingredients have weight data, return default medium weight
  if (countWithWeight === 0) return 5;
  
  // Return average, rounded to nearest integer
  return Math.round(totalWeight / countWithWeight);
};

/**
 * Generates a unique ID for dishes and menus
 * 
 * @returns Unique string ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

/**
 * Helper function to get cooking method appropriate for dish type
 * 
 * @param dishType Type of dish
 * @returns Appropriate cooking method
 */
export const getDefaultCookingMethod = (dishType: string): string => {
  const methodsByType: Record<string, string[]> = {
    'entree': ['Roasted', 'Grilled', 'Sautéed', 'Braised', 'Slow-Cooked'],
    'side': ['Roasted', 'Steamed', 'Sautéed', 'Grilled'],
    'salad': ['Fresh', 'Chopped', 'Tossed', 'Layered'],
    'dessert': ['Baked', 'Chilled', 'Whipped', 'Caramelized'],
    'beverage': ['Blended', 'Infused', 'Muddled', 'Shaken'],
    'sauce': ['Simmered', 'Whisked', 'Reduced', 'Blended']
  };
  
  const methods = methodsByType[dishType] || ['Prepared'];
  return methods[Math.floor(Math.random() * methods.length)];
};

/**
 * Formats a list of ingredients according to naming conventions
 * 
 * @param ingredients List of ingredients to format
 * @returns Formatted string
 */
export const formatIngredientList = (ingredients: string[]): string => {
  if (ingredients.length === 0) return '';
  if (ingredients.length === 1) return ingredients[0];
  
  const lastIngredient = ingredients[ingredients.length - 1];
  const otherIngredients = ingredients.slice(0, -1).join(', ');
  
  return `${otherIngredients}, and ${lastIngredient}`;
};

/**
 * Generates a recipe name based on ingredients and dish type
 * 
 * @param ingredients Array of ingredients in the dish
 * @param dishType Type of dish
 * @returns Generated recipe name
 */
export const generateRecipeName = (
  ingredients: string[], 
  dishType: string
): string => {
  // Select cooking method
  const method = getDefaultCookingMethod(dishType);
  
  // Format according to naming convention
  let mainIngredients: string[];
  let supportingIngredients: string[] = [];
  
  // If we have enough ingredients, separate main and supporting
  if (ingredients.length >= 3) {
    mainIngredients = ingredients.slice(0, 2);
    supportingIngredients = ingredients.slice(2);
  } else {
    // Otherwise, use what we have
    mainIngredients = ingredients.slice(0, Math.min(2, ingredients.length));
  }
  
  // Build the name following the established pattern
  let name = `${method} ${mainIngredients.join(' + ')} ${dishType}`;
  
  // Add supporting ingredients if present
  if (supportingIngredients.length > 0) {
    name += ` with ${formatIngredientList(supportingIngredients)}`;
  }
  
  return name;
};
