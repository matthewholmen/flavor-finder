import { Dish } from '../../types';

// Taste properties to be considered for balance calculations
export const TASTE_PROPERTIES = [
  'sweet',
  'salty',
  'sour',
  'bitter',
  'umami',
  'fat',
  'spicy'
] as const;

export type TasteProperty = typeof TASTE_PROPERTIES[number];

/**
 * Calculates the overall menu balance score based on dish taste profiles
 * 
 * @param dishes Array of dishes in the menu
 * @returns Balance score from 0-100 (higher is better balanced)
 */
export const calculateMenuBalance = (dishes: Dish[]): number => {
  if (!dishes.length) return 0;
  
  // 1. Extract combined taste profiles
  const combinedProfile = dishes.reduce(
    (acc, dish) => {
      TASTE_PROPERTIES.forEach(taste => {
        acc[taste] += dish.tasteProfile[taste];
      });
      return acc;
    },
    { sweet: 0, salty: 0, sour: 0, bitter: 0, umami: 0, fat: 0, spicy: 0 }
  );
  
  // 2. Normalize values
  const dishCount = dishes.length;
  TASTE_PROPERTIES.forEach(taste => {
    combinedProfile[taste] /= dishCount;
  });
  
  // 3. Calculate variance between taste elements
  // Lower variance = better balance
  const values = Object.values(combinedProfile);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  // 4. Convert to a 0-100 score (lower variance = higher score)
  // Max theoretical variance would be if all values were at extremes (0 and 10)
  // This would give a variance of 25 for normalized values
  const maxVariance = 25;
  const normalizedVariance = Math.min(variance, maxVariance);
  
  return Math.max(0, 100 - (normalizedVariance * 4));
};

/**
 * Finds complementary taste profile that would balance an existing profile
 * 
 * @param currentProfile The existing taste profile to balance
 * @returns Ideal complementary profile
 */
export const findComplementaryProfile = (
  currentProfile: Dish['tasteProfile']
): Dish['tasteProfile'] => {
  // Calculate the "inverse" profile that would balance the current one
  const complementary = { ...currentProfile };
  
  // Find the max value in the current profile
  const maxValue = Math.max(...Object.values(currentProfile));
  
  // For each taste property, set complementary value to balance current
  TASTE_PROPERTIES.forEach(taste => {
    // Lower values in current profile mean higher priority in complementary
    complementary[taste] = maxValue - currentProfile[taste];
  });
  
  return complementary;
};

/**
 * Calculates how well an ingredient profile matches a target profile
 * 
 * @param profile Ingredient profile to evaluate
 * @param target Target profile to match against
 * @returns Match score (higher = better match)
 */
export const calculateProfileMatchScore = (
  profile: Dish['tasteProfile'],
  target: Dish['tasteProfile']
): number => {
  let matchScore = 0;
  
  TASTE_PROPERTIES.forEach(taste => {
    // Higher score for closer matches on high-priority tastes
    const importance = target[taste] / 10;
    const similarity = 10 - Math.abs(profile[taste] - target[taste]);
    
    matchScore += similarity * importance;
  });
  
  return matchScore;
};

/**
 * Calculates combined taste profile for multiple dishes
 * 
 * @param dishes Array of dishes to combine
 * @returns Combined taste profile
 */
export const calculateCombinedTasteProfile = (dishes: Dish[]): Dish['tasteProfile'] => {
  if (!dishes.length) {
    return { sweet: 0, salty: 0, sour: 0, bitter: 0, umami: 0, fat: 0, spicy: 0 };
  }
  
  // Calculate the sum of all profiles
  const combinedProfile = dishes.reduce(
    (acc, dish) => {
      TASTE_PROPERTIES.forEach(taste => {
        acc[taste] += dish.tasteProfile[taste];
      });
      return acc;
    },
    { sweet: 0, salty: 0, sour: 0, bitter: 0, umami: 0, fat: 0, spicy: 0 }
  );
  
  // Normalize values to 0-10 scale
  const dishCount = dishes.length;
  TASTE_PROPERTIES.forEach(taste => {
    combinedProfile[taste] = Math.min(10, combinedProfile[taste] / dishCount);
  });
  
  return combinedProfile;
};

/**
 * Calculates the overall weight (intensity) of a dish based on ingredients
 * 
 * @param ingredients List of ingredients in the dish
 * @param ingredientProfiles Map of ingredient profiles
 * @returns Weight value from 1-10
 */
export const calculateDishWeight = (
  ingredients: string[],
  ingredientProfiles: Map<string, { weight?: number }>
): number => {
  // If no ingredients, return minimum weight
  if (!ingredients.length) return 1;
  
  // Calculate average weight of all ingredients that have a weight value
  let totalWeight = 0;
  let countWithWeight = 0;
  
  ingredients.forEach(ingredient => {
    const profile = ingredientProfiles.get(ingredient);
    if (profile && profile.weight !== undefined) {
      totalWeight += profile.weight;
      countWithWeight++;
    }
  });
  
  // If no ingredients have weight data, return default medium weight
  if (countWithWeight === 0) return 5;
  
  // Return average, rounded to nearest integer
  return Math.round(totalWeight / countWithWeight);
};
