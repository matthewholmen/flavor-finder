// src/utils/categorySearch.ts
import { IngredientProfile, IngredientSubcategory } from '../types.ts';
import { TasteFilter as TasteFilterType } from '../components/tasteFilter.tsx';

interface SearchState {
  searchTerm: string;
  activeCategories: Array<keyof IngredientSubcategory>;
  tasteCriteria: TasteFilterType[];
}

export const filterIngredients = (
  ingredients: string[],
  filters: {
    searchTerm: string;
    activeCategories: string[];
    tasteCriteria: TasteFilterType[];
  },
  ingredientProfiles: IngredientProfile[],
  selectedIngredients: string[]
) => {
  return ingredients.filter(ingredient => {
    // Skip already selected ingredients
    if (selectedIngredients.includes(ingredient)) return false;

    // Search term filter
    if (filters.searchTerm && !ingredient.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
      return false;
    }

    // Category filter
    const profile = ingredientProfiles.find(p => p.name.toLowerCase() === ingredient.toLowerCase());
    if (filters.activeCategories.length > 0) {
      if (!profile || !filters.activeCategories.includes(profile.category)) {
        return false;
      }
    }

    // Taste filter
    if (filters.tasteCriteria.length > 0) {
      if (!profile) return false;
      
      // Check if ingredient meets ALL selected taste criteria
      return filters.tasteCriteria.every(({ taste, minIntensity }) => 
        profile.flavorProfile[taste] >= minIntensity
      );
    }

    return true;
  });
};

// Get unique categories from profiles
export const getAvailableCategories = (ingredientProfiles: IngredientProfile[]): string[] => {
  const categories = new Set(ingredientProfiles.map(profile => profile.category));
  return Array.from(categories).sort();
};

// Get count of ingredients per category
export const getCategoryCounts = (
  filteredIngredients: string[],
  ingredientProfiles: IngredientProfile[]
): Record<string, number> => {
  const counts: Record<string, number> = {};
  
  filteredIngredients.forEach(ingredient => {
    const profile = ingredientProfiles.find(p => 
      p.name.toLowerCase() === ingredient.toLowerCase()
    );
    if (profile) {
      counts[profile.category] = (counts[profile.category] || 0) + 1;
    }
  });

  return counts;
};