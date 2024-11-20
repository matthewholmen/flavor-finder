// utils/sorting.ts
import { getCompatibilityScore } from './compatibility.ts';

export interface ScoredIngredient {
  name: string;
  compatibilityScore: number;
}

export const getSortedCompatibleIngredients = (
  selectedIngredients: string[],
  flavorMap: Map<string, Set<string>>
): string[] => {
  if (selectedIngredients.length === 0) return [];

  // Get all ingredients that pair with any selected ingredient
  const compatibleSets = selectedIngredients.map(ingredient => 
    flavorMap.get(ingredient) || new Set<string>()
  );
  
  const allCompatible = new Set<string>();
  compatibleSets.forEach(set => {
    set.forEach(ingredient => {
      if (!selectedIngredients.includes(ingredient)) {
        allCompatible.add(ingredient);
      }
    });
  });

  // Score and filter ingredients
  const scoredIngredients: ScoredIngredient[] = Array.from(allCompatible)
    .map(ingredient => ({
      name: ingredient,
      compatibilityScore: getCompatibilityScore(ingredient, selectedIngredients, flavorMap)
    }));

  // Sort by compatibility score (highest to lowest)
  scoredIngredients.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  // Filter based on compatibility threshold
  const highCompatibility = scoredIngredients.filter(item => item.compatibilityScore >= 90);
  const moderateCompatibility = scoredIngredients.filter(item => 
    item.compatibilityScore >= 50 && item.compatibilityScore < 90
  );

  // If we have enough high compatibility matches, return just those
  if (highCompatibility.length >= 10) {
    return highCompatibility.map(item => item.name);
  }

  // If we have few suggestions, include moderate matches
  const combinedResults = [...highCompatibility];
  
  // Only add moderate matches if we need more suggestions
  if (combinedResults.length < 10) {
    combinedResults.push(...moderateCompatibility);
  }

  return combinedResults.map(item => item.name);
};