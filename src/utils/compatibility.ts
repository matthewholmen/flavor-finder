// src/utils/compatibility.ts
export const getCompatibilityScore = (
  ingredient: string, 
  otherIngredients: string[], 
  flavorMap: Map<string, Set<string>>
): number => {
  if (otherIngredients.length === 0) return 100;
  
  const pairings = flavorMap.get(ingredient);
  if (!pairings) return 0;
  
  const compatibleCount = otherIngredients.filter(other => 
    pairings.has(other)
  ).length;
  
  return (compatibleCount / otherIngredients.length) * 100;
};

export const getCompatibilityColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-green-100 text-green-800';
  if (percentage >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};