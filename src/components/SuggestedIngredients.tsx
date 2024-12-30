import React, { useState, useMemo, useRef, useEffect, forwardRef } from 'react';
import { getCompatibilityScore, CompatibilityResult } from '../utils/compatibility.ts';
import { IngredientProfile } from '../types';
import { TASTE_COLORS } from '../utils/colors.ts';
import { applySortingOption } from '../utils/sorting.ts';
import CategoryFilter, { CATEGORIES } from './categoryFilter.tsx';
import SortingFilter, { SortingOption } from './SortingFilter.tsx';
import { TasteValues } from './CompactTasteSliders';
import { filterIngredients } from '../utils/searchUtils.ts';
import { color } from 'framer-motion';


const getIngredientColor = (profile?: IngredientProfile) => {
  if (!profile) return 'rgb(249 250 251)';
  
  let dominantTaste = 'sweet';
  let maxValue = -1;
  
  Object.entries(profile.flavorProfile).forEach(([taste, value]) => {
    if (value > maxValue) {
      maxValue = value;
      dominantTaste = taste;
    }
  });

  return maxValue <= 0 ? 'rgb(249 250 251)' : TASTE_COLORS[dominantTaste];
};

interface SuggestedIngredientsProps {
  suggestions: string[];
  onSelect: (ingredient: string) => void;
  selectedIngredients: string[];
  flavorMap: Map<string, Set<string>>;
  ingredientProfiles: IngredientProfile[];
  showPartialMatches?: boolean;
  className?: string;
  sortingOption: 'alphabetical' | 'category' | 'taste';
  substitutionMode?: {
    active: boolean;
    sourceIngredient: string | null;
  };
}



interface GroupedIngredients {
  label: string;
  subgroups?: {
    label: string;
    ingredients: Array<{
      name: string;
      compatibility: CompatibilityResult;
    }>;
  }[];
  ingredients?: Array<{
    name: string;
    compatibility: CompatibilityResult;
  }>;
}

const SuggestedIngredients = React.forwardRef<HTMLDivElement, SuggestedIngredientsProps>((
  {
    suggestions,
    onSelect,
    selectedIngredients,
    flavorMap,
    ingredientProfiles,
    showPartialMatches = false,
    className = '',
    sortingOption,
    substitutionMode
  }, 
  ref
) => {



    // Rest of the component implementation remains the same...
    const filteredAndScoredSuggestions = applySortingOption(
      suggestions,
      sortingOption,
      ingredientProfiles
    ).map(ingredient => {
      const ingredientsToCompare = substitutionMode?.active 
        ? (selectedIngredients || []).filter(ing => ing !== substitutionMode.sourceIngredient)
        : selectedIngredients || [];
      
      return {
        name: ingredient,
        compatibility: getCompatibilityScore(
          ingredient,
          ingredientsToCompare,
          flavorMap,
          true
        )
      };
    }).filter(item => 
      showPartialMatches || item.compatibility.score === 100
    ).sort((a, b) => {
      if (b.compatibility.score !== a.compatibility.score) {
        return b.compatibility.score - a.compatibility.score;
      }
      return a.name.localeCompare(b.name);
    });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (scrollContainerRef.current) {
    scrollContainerRef.current.scrollTop = 0;
  }
}, [sortingOption]);

  const groupedIngredients = useMemo(() => {
    if (sortingOption === 'alphabetical') {
      return [{
        label: '',
        ingredients: filteredAndScoredSuggestions
      }];
    }
  
    const groups = new Map<string, Map<string, typeof filteredAndScoredSuggestions>>();
  
    filteredAndScoredSuggestions.forEach(suggestion => {
      const profile = ingredientProfiles.find(p => 
        p.name.toLowerCase() === suggestion.name.toLowerCase()
      );
  
      if (!profile) return;
  
      let groupLabel: string;
      if (sortingOption === 'category') {
        groupLabel = profile.category;
      } else { // taste sorting
        const dominantTaste = Object.entries(profile.flavorProfile)
          .reduce((a, b) => a[1] > b[1] ? a : b)[0];
        groupLabel = dominantTaste.charAt(0).toUpperCase() + dominantTaste.slice(1);
      }
  
      if (!groups.has(groupLabel)) {
        groups.set(groupLabel, new Map());
      }
  
      // Only add subcategories for category sorting
      if (sortingOption === 'category') {
        const subcategoryGroup = groups.get(groupLabel)!;
        const subcategoryLabel = profile.subcategory;
        
        if (!subcategoryGroup.has(subcategoryLabel)) {
          subcategoryGroup.set(subcategoryLabel, []);
        }
        
        subcategoryGroup.get(subcategoryLabel)!.push(suggestion);
      } else {
        // For taste sorting, add directly to the group
        if (!groups.get(groupLabel)!.has('')) {
          groups.get(groupLabel)!.set('', []);
        }
        groups.get(groupLabel)!.get('')!.push(suggestion);
      }
    });
  
    return Array.from(groups.entries())
      .map(([categoryLabel, subcategories]) => ({
        label: categoryLabel,
        subgroups: Array.from(subcategories.entries())
          .map(([subcategoryLabel, ingredients]) => ({
            label: subcategoryLabel,
            ingredients
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredAndScoredSuggestions, sortingOption, ingredientProfiles]);
  
  return (
    <div ref={ref} className={`h-full overflow-y-auto ${className}`}>

      {substitutionMode?.active && (
              <div className="sticky bg-white top-0 z-20 border-b border-gray-400 ">
                <div 
                  className="border-b-4 py-4 md:px-4"
                  style={{ 
                    borderColor: getIngredientColor(ingredientProfiles.find(
                      p => p.name.toLowerCase() === substitutionMode.sourceIngredient?.toLowerCase()
                    ))
                  }}
                >
                  <div className="pl-4">
                    Substituting for <strong>{substitutionMode.sourceIngredient}</strong>
                  </div>
                  <div className="pl-4 pt-1 text-gray-500 text-sm italic">
                    These ingredients share some taste.
                  </div>
                </div>
              </div>
      )}

      <div className="px-3 md:px-4 py-3 md:py-4 bg-white">
          {filteredAndScoredSuggestions.length > 0 ? (
          <div className="relative space-y-8">
            {groupedIngredients.map(group => (
              <div key={group.label} className="space-y-4">
                {group.label && (
                  <h3 className="sticky top-0 bg-white z-[10] text-lg font-medium text-gray-900 py-2 shadow-sm -mx-3 px-3 md:-mx-4 md:px-4 border-gray-400 ">
                    {group.label}
                  </h3>
                )}
                {group.subgroups ? (
                  <div className="space-y-6 pl-4">
                    {group.subgroups.map(subgroup => (
                      <div key={subgroup.label} className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">
                          {subgroup.label}
                        </h4>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          {subgroup.ingredients.map(({ name, compatibility }) => {
                            const profile = ingredientProfiles.find(
                              p => p.name.toLowerCase() === name.toLowerCase()
                            );
                            const borderColor = getIngredientColor(profile);
                            const isPartialMatch = showPartialMatches && compatibility.score < 100;
  
                            return (
                              <button
                                key={name}
                                onClick={() => onSelect(name)}
                                className={`
                                  inline-flex items-center px-3 py-1.5 rounded-full text-l
                                  transition-all text-black bg-white
                                  ${isPartialMatch ? 'border-dashed' : 'border-solid'}
                                `}
                                style={{
                                  border: `3px ${isPartialMatch ? 'dashed' : 'solid'} ${borderColor}`
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = borderColor;
                                  e.currentTarget.style.color = 'white';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'white';
                                  e.currentTarget.style.color = 'black';
                                }}
                                title={isPartialMatch ? 
                                  `Matches with: ${compatibility.matchedWith.join(', ')}` : 
                                  undefined}
                              >
                                {name}
                                {isPartialMatch && (
                                  <span className="ml-1 text-xs">
                                    ({Math.round(compatibility.score)}%)
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 md:gap-2 bg-white">
                    {group.ingredients?.map(({ name, compatibility }) => {
                      const profile = ingredientProfiles.find(
                        p => p.name.toLowerCase() === name.toLowerCase()
                      );
                      const borderColor = getIngredientColor(profile);
                      const isPartialMatch = showPartialMatches && compatibility.score < 100;
  
                      return (
                        <button
                          key={name}
                          onClick={() => onSelect(name)}
                          className={`
                            inline-flex items-center px-4 py-2 rounded-full text-l
                            transition-all text-black bg-white
                            ${isPartialMatch ? 'border-dashed' : 'border-solid'}
                          `}
                          style={{
                            border: `3px ${isPartialMatch ? 'dashed' : 'solid'} ${borderColor}`
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = borderColor;
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.color = 'black';
                          }}
                          title={isPartialMatch ? 
                            `Matches with: ${compatibility.matchedWith.join(', ')}` : 
                            undefined}
                        >
                          {name}
                          {isPartialMatch && (
                            <span className="ml-1 text-xs">
                              ({Math.round(compatibility.score)}%)
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-gray-700 font-medium mb-2">Dang! No perfect matches found.</p>
            <p className="text-gray-500 text-sm italic">Try Show Partial Matches below.</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default SuggestedIngredients;