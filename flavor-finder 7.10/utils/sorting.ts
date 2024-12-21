// utils/sorting.ts
import { getCompatibilityScore } from './compatibility.ts';
import { IngredientProfile, IngredientSubcategory } from '../types.ts';
import { TasteValues } from '../components/CompactTasteSliders.tsx';


export interface ScoredIngredient {
  name: string;
  compatibilityScore: number;
}

// utils/sorting.ts
export const getSortedCompatibleIngredients = (
  selectedIngredients: string[],
  flavorMap: Map<string, Set<string>>,
  ingredientProfiles: IngredientProfile[],
  tasteValues: TasteValues,
  activeSliders: Set<keyof TasteValues>
): string[] => {

  if (selectedIngredients.length === 0 || flavorMap.size === 0) return [];

  // Get compatible ingredients first
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
  const scoredIngredients = Array.from(allCompatible)
    .filter(ingredient => {
      // Apply taste filters
      const profile = ingredientProfiles.find(p => 
        p.name.toLowerCase() === ingredient.toLowerCase()
      );
      
      if (!profile) return false;

// Only check active sliders
      return Object.entries(tasteValues).every(([taste, minValue]) => {
        if (!activeSliders.has(taste as keyof TasteValues)) return true;
        return profile.flavorProfile[taste as keyof TasteValues] >= minValue;
          });   
          })
    .map(ingredient => ({
      name: ingredient,
      compatibilityScore: getCompatibilityScore(ingredient, selectedIngredients, flavorMap)
    }));

  // Sort by compatibility score
  scoredIngredients.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return scoredIngredients.map(item => item.name);
};