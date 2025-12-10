// src/utils/compatibility.ts
export interface CompatibilityResult {
  score: number;
  matchedWith: string[];
}

export const getCompatibilityScore = (
  ingredient: string, 
  otherIngredients: string[], 
  flavorMap: Map<string, Set<string>>,
  allowPartialMatches: boolean = false
): CompatibilityResult => {
  if (otherIngredients.length === 0) return { score: 100, matchedWith: [] };
  
  const pairings = flavorMap.get(ingredient);
  if (!pairings) return { score: 0, matchedWith: [] };
  
  const matchedIngredients = otherIngredients.filter(other => 
    pairings.has(other)
  );
  
  const score = (matchedIngredients.length / otherIngredients.length) * 100;
  
  // For partial matches, we consider any ingredient that matches at least one other ingredient
  if (allowPartialMatches && matchedIngredients.length > 0) {
    return {
      score: score,
      matchedWith: matchedIngredients
    };
  }
  
  // For strict matching, we only return results that match all ingredients
  return {
    score: score === 100 ? 100 : 0,
    matchedWith: score === 100 ? otherIngredients : []
  };
};

export const getCompatibilityColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-green-100 text-green-800';
  if (percentage >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};