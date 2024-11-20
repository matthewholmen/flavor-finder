// components/SuggestedIngredients.tsx
import React from 'react';
import { getCompatibilityScore, getCompatibilityColor } from '../utils/compatibility.ts'
import { IngredientProfile } from '../types.ts';

interface SuggestedIngredientsProps {
  suggestions: string[];
  onSelect: (ingredient: string) => void;
  selectedIngredients: string[];
  flavorMap: Map<string, Set<string>>;
  experimentalPairings: string[];
  flavorPairings: string[];
  activeCategories: string[];
  ingredientProfiles: IngredientProfile[];

}

export const SuggestedIngredients: React.FC<SuggestedIngredientsProps> = ({
  suggestions,
  onSelect,
  selectedIngredients,
  flavorMap,
  experimentalPairings,
  flavorPairings,
  activeCategories,
  ingredientProfiles
}) => {
  const filteredSuggestions = activeCategories.length === 0 
    ? suggestions 
    : suggestions.filter(ingredient => {
        const profile = ingredientProfiles.find(p => 
          p.name.toLowerCase() === ingredient.toLowerCase()
        );
        return profile && activeCategories.includes(profile.category);
      });

      const isExperimental = (ingredient: string) => {
    // First check if this pairing exists in experimental list
    const isInExperimental = selectedIngredients.some(selected => 
      experimentalPairings.includes(`${ingredient},${selected}`) ||
      experimentalPairings.includes(`${selected},${ingredient}`)
    );

    // If it's not in experimental list at all, return false
    if (!isInExperimental) return false;

    // If it is in experimental list, check if it's also in standard list
    const isInStandard = selectedIngredients.some(selected => 
      flavorPairings.includes(`${ingredient},${selected}`) ||
      flavorPairings.includes(`${selected},${ingredient}`)
    );

    // Only return true if it's in experimental but NOT in standard
    return isInExperimental && !isInStandard;
  };

  return (
<div className="border rounded-lg p-4 overflow-y-auto max-h-[calc(100vh-200px)]">



{filteredSuggestions.length > 0 ? (
  filteredSuggestions.map(ingredient => {
          const compatibilityScore = getCompatibilityScore(ingredient, selectedIngredients, flavorMap);
          const colorClass = getCompatibilityColor(compatibilityScore);
          const experimental = isExperimental(ingredient);
          
          return (
            <button
              key={ingredient}
              onClick={() => onSelect(ingredient)}
              className={`block w-full text-left px-3 py-2 rounded mb-1 ${colorClass} relative`}
              title={`${compatibilityScore.toFixed(0)}% compatible`}
            >
              <div className="flex items-center justify-between">
                <span>{ingredient}</span>
                {experimental && (
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full ml-2">
                    experimental
                  </span>
                )}
              </div>
            </button>
          );
        })
      ) : (
        <p className="text-gray-500 italic">
          {selectedIngredients.length === 0
            ? "Select ingredients to see suggestions"
            : "No suggestions found"}
        </p>
      )}
    </div>
  );
};