// components/SuggestedIngredients.tsx
import React, { useState, useMemo } from 'react';
import { getCompatibilityScore, getCompatibilityColor } from '../utils/compatibility.ts'
import { IngredientProfile } from '../types.ts';
import { Search } from 'lucide-react';

interface SuggestedIngredientsProps {
  suggestions: string[];
  onSelect: (ingredient: string) => void;
  selectedIngredients: string[];
  flavorMap: Map<string, Set<string>>;
  experimentalPairings: string[];
  flavorPairings: string[];
  activeCategories: string[];
  ingredientProfiles: IngredientProfile[];
  tasteValues: Record<string, number>;
  activeSliders?: Set<string>;
}

export const SuggestedIngredients: React.FC<SuggestedIngredientsProps> = ({
  suggestions,
  onSelect,
  selectedIngredients,
  flavorMap,
  experimentalPairings,
  flavorPairings,
  activeCategories,
  ingredientProfiles,
  tasteValues = {
    sweet: 0,
    salty: 0,
    sour: 0,
    bitter: 0,
    umami: 0,
    fat: 0,
    spicy: 0
  },
  activeSliders = new Set()
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const allIngredients = useMemo(() => 
    Array.from(flavorMap.keys()).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    ),
    [flavorMap]
  );

  const filteredSuggestions = useMemo(() => {
    let filtered = searchTerm
      ? allIngredients.filter(ingredient =>
          ingredient.toLowerCase().startsWith(searchTerm.toLowerCase())
        )
      : selectedIngredients.length > 0
        ? suggestions
        : allIngredients;
  
    // Category filtering
    if (activeCategories.length > 0) {
      filtered = filtered.filter(ingredient => {
        const profile = ingredientProfiles.find(p =>
          p.name.toLowerCase() === ingredient.toLowerCase()
        );
        return profile && activeCategories.includes(profile.category);
      });
    }
  
    // Apply taste filtering for both initial and filtered lists
    filtered = filtered.filter(ingredient => {
      const profile = ingredientProfiles.find(p =>
        p.name.toLowerCase() === ingredient.toLowerCase()
      );
  
      if (!profile) return false;
  
      return Object.entries(tasteValues).every(([taste, minValue]) => {
        // Only apply filter if the slider is active
        if (!activeSliders?.has(taste)) return true;
        return profile.flavorProfile[taste] >= minValue;
      });
    });
  
    // Remove already selected ingredients
    filtered = filtered.filter(ingredient => !selectedIngredients.includes(ingredient));
  
    return filtered;
  }, [
    searchTerm,
    suggestions,
    allIngredients,
    activeCategories,
    ingredientProfiles,
    selectedIngredients,
    tasteValues,
    activeSliders
  ]);
  
  

  return (
    <div className="space-y-4 md:max-h-[calc(100vh-200px)] overflow-hidden">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search ingredients"
          className="pl-10 w-full p-2 border rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="border rounded-lg p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
  {filteredSuggestions.length > 0 ? (
    filteredSuggestions.map(ingredient => {
      const compatibilityScore = getCompatibilityScore(ingredient, selectedIngredients, flavorMap);
      const colorClass = getCompatibilityColor(compatibilityScore);

      
      return (
        <button
          key={ingredient}
          onClick={() => onSelect(ingredient)}
          className={`block w-full text-left px-3 py-2 rounded mb-1 ${colorClass} relative`}
          title={`${compatibilityScore.toFixed(0)}% compatible`}
        >
          <div className="flex items-center justify-between">
            <span>{ingredient}</span>
          </div>
        </button>
      );
    })
  ) : (
    <p className="text-gray-500 italic">
      {allIngredients.length === 0 ? "Loading ingredients..." : "No matching ingredients found"}
    </p>
  )}
</div>
    </div>
  );
};