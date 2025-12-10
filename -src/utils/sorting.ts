// utils/sorting.ts
import { getCompatibilityScore } from './compatibility.ts';
import { IngredientProfile, IngredientSubcategory } from '../types.ts';
import { TasteValues } from '../components/CompactTasteSliders.tsx';

export interface ScoredIngredient {
  name: string;
  compatibilityScore: number;
}

export type SortingOption = 'alphabetical' | 'category' | 'taste';

// New function to apply secondary sorting based on user selection
export const applySortingOption = (
  ingredients: string[],
  sortingOption: SortingOption,
  ingredientProfiles: IngredientProfile[]
): string[] => {
  const sortedIngredients = [...ingredients];

  switch (sortingOption) {
    case 'alphabetical':
      return sortedIngredients.sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
      );

    case 'category':
      return sortedIngredients.sort((a, b) => {
        const profileA = ingredientProfiles.find(p => p.name.toLowerCase() === a.toLowerCase());
        const profileB = ingredientProfiles.find(p => p.name.toLowerCase() === b.toLowerCase());
        
        // Sort by category first
        const categoryCompare = (profileA?.category || '').localeCompare(profileB?.category || '');
        if (categoryCompare !== 0) return categoryCompare;
        
        // Then by subcategory
        const subcategoryCompare = (profileA?.subcategory || '').localeCompare(profileB?.subcategory || '');
        if (subcategoryCompare !== 0) return subcategoryCompare;
        
        // Finally alphabetically
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });

    case 'taste':
      return sortedIngredients.sort((a, b) => {
        const profileA = ingredientProfiles.find(p => p.name.toLowerCase() === a.toLowerCase());
        const profileB = ingredientProfiles.find(p => p.name.toLowerCase() === b.toLowerCase());
        
        const getDominantTaste = (profile?: IngredientProfile) => {
          if (!profile) return { taste: '', value: -1 };
          
          return Object.entries(profile.flavorProfile).reduce(
            (max, [taste, value]) => 
              value > max.value ? { taste, value } : max,
            { taste: '', value: -1 }
          );
        };
        
        const dominantA = getDominantTaste(profileA);
        const dominantB = getDominantTaste(profileB);
        
        // Sort by dominant taste first
        const tasteCompare = dominantA.taste.localeCompare(dominantB.taste);
        if (tasteCompare !== 0) return tasteCompare;
        
        // Then by taste intensity
        if (dominantA.value !== dominantB.value) {
          return dominantB.value - dominantA.value;
        }
        
        // Finally alphabetically
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });

    default:
      return sortedIngredients;
  }
};

export const getSortedCompatibleIngredients = (
  selectedIngredients: string[],
  flavorMap: Map<string, Set<string>>,
  ingredientProfiles: IngredientProfile[],
  tasteValues: TasteValues,
  activeSliders: Set<keyof TasteValues>,
  sortingOption: SortingOption = 'alphabetical' // Add default sorting option
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
      const profile = ingredientProfiles.find(p => 
        p.name.toLowerCase() === ingredient.toLowerCase()
      );
      
      if (!profile) return false;

      return Object.entries(tasteValues).every(([taste, minValue]) => {
        if (!activeSliders.has(taste as keyof TasteValues)) return true;
        return profile.flavorProfile[taste as keyof TasteValues] >= minValue;
      });   
    })
    .map(ingredient => ({
      name: ingredient,
      compatibilityScore: getCompatibilityScore(ingredient, selectedIngredients, flavorMap)
    }));

  // Sort by compatibility score first
  scoredIngredients.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  // Get the sorted ingredient names
  const sortedByCompatibility = scoredIngredients.map(item => item.name);

  // Apply secondary sorting based on user selection
  return applySortingOption(sortedByCompatibility, sortingOption, ingredientProfiles);
};