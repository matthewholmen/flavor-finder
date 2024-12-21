import React, { useState, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { getCompatibilityScore, CompatibilityResult } from '../utils/compatibility.ts';
import { filterIngredients } from '../utils/searchUtils.ts';
import { IngredientProfile } from '../types';
import { TasteValues } from './CompactTasteSliders';
import { TASTE_COLORS } from '../utils/colors.ts';
import CompactTasteSliders from './CompactTasteSliders.tsx';
import CategoryFilter, { CATEGORIES } from './categoryFilter.tsx';
import SortingFilter, { SortingOption } from './SortingFilter.tsx';

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

  if (maxValue <= 0) return 'rgb(249 250 251)';
  
  return TASTE_COLORS[dominantTaste as keyof typeof TASTE_COLORS];
};

interface SuggestedIngredientsProps {
  suggestions: string[];
  onSelect: (ingredient: string) => void;
  selectedIngredients: string[];
  flavorMap: Map<string, Set<string>>;
  experimentalPairings: string[];
  flavorPairings: string[];
  ingredientProfiles: IngredientProfile[];
  tasteValues: TasteValues;
  activeSliders?: Set<keyof TasteValues>;
  onTasteValuesChange: (values: TasteValues) => void;
  onToggleSlider: (taste: keyof TasteValues) => void;
  setIsSearchFocused: (focused: boolean) => void;
  className?: string;
  // Add these props
  activeCategory: string;
  selectedSubcategories: string[];
  onFiltersChange: (filters: { category: string; subcategories: string[] }) => void;
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

export const SuggestedIngredients: React.FC<SuggestedIngredientsProps> = ({
  suggestions,
  onSelect,
  selectedIngredients,
  flavorMap,
  experimentalPairings,
  flavorPairings,
  ingredientProfiles,
  tasteValues,
  activeSliders = new Set(),
  onTasteValuesChange,
  onToggleSlider,
  setIsSearchFocused,
  className = '',
  onFiltersChange,
  activeCategory,
  selectedSubcategories,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [activeSorting, setActiveSorting] = useState<SortingOption>('alphabetical');
  const [allowPartialMatches, setAllowPartialMatches] = useState(false);

  const allIngredients = useMemo(() => 
    Array.from(flavorMap.keys()).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    ),
    [flavorMap]
  );

  const [minimumCompatibility, setMinimumCompatibility] = useState(50); // Default 50%


  const filteredAndScoredSuggestions = useMemo(() => {
    let filtered = searchTerm
      ? filterIngredients(allIngredients, searchTerm)
      : selectedIngredients.length === 0 ? allIngredients : suggestions;

    // Apply category and subcategory filters
    if (activeCategory || selectedSubcategories.length > 0) {
      filtered = filtered.filter(ingredient => {
        const profile = ingredientProfiles.find(p =>
          p.name.toLowerCase() === ingredient.toLowerCase()
        );
        
        if (!profile) return false;
        
        // Check category match if a category is selected
        if (activeCategory && profile.category !== activeCategory) {
          return false;
        }
        
        // Check subcategory match if any subcategories are selected
        if (selectedSubcategories.length > 0) {
          return selectedSubcategories.includes(profile.subcategory);
        }
        
        return true;
      });
    }

        // When searching, show all matching ingredients but still calculate compatibility
    // When not searching, only show compatible ingredients based on allowPartialMatches setting
    if (selectedIngredients.length > 0 && !searchTerm && !allowPartialMatches) {
      filtered = filtered.filter(ingredient => {
        const compatibility = getCompatibilityScore(
          ingredient,
          selectedIngredients,
          flavorMap,
          true // Always calculate partial matches for the score
        );
        return compatibility.score === 100;
      });
    }



    if (activeCategory) {
      filtered = filtered.filter(ingredient => {
        const profile = ingredientProfiles.find(p =>
          p.name.toLowerCase() === ingredient.toLowerCase()
        );
        return profile && profile.category === activeCategory;
      });
    }

    filtered = filtered.filter(ingredient => {
      const profile = ingredientProfiles.find(p =>
        p.name.toLowerCase() === ingredient.toLowerCase()
      );

      if (!profile) return false;

      return Object.entries(tasteValues).every(([taste, minValue]) => {
        if (!activeSliders?.has(taste as keyof TasteValues)) return true;
        return profile.flavorProfile[taste as keyof TasteValues] >= minValue;
      });
    });

    filtered = Array.from(new Set(filtered)).filter(
      ingredient => !selectedIngredients.includes(ingredient)
    );

    return filtered.map(ingredient => ({
      name: ingredient,
      compatibility: getCompatibilityScore(
        ingredient,
        selectedIngredients,
        flavorMap,
        true // Always calculate partial matches for the score
      )

    }));
  }, [
    searchTerm,
    suggestions,
    allIngredients,
    selectedIngredients,
    flavorMap,
    activeCategory,
    ingredientProfiles,
    tasteValues,
    activeSliders,
    activeSorting,
    allowPartialMatches
  ]);

  const groupedIngredients = useMemo(() => {
    const sortedSuggestions = filteredAndScoredSuggestions.sort((a, b) => {
      // Sort by compatibility score first
      if (b.compatibility.score !== a.compatibility.score) {
        return b.compatibility.score - a.compatibility.score;
      }
      // Then alphabetically
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  
    if (activeSorting === 'alphabetical') {
      return [{
        label: '',
        ingredients: sortedSuggestions
      }];
    }
  
    const groups = new Map<string, Map<string, typeof sortedSuggestions>>();
  
    sortedSuggestions.forEach(suggestion => {
      const profile = ingredientProfiles.find(p => 
        p.name.toLowerCase() === suggestion.name.toLowerCase()
      );
  
      if (!profile) return;
  
      let groupLabel: string;
      if (activeSorting === 'category') {
        groupLabel = profile.category;
      } else {
        groupLabel = Object.entries(profile.flavorProfile)
          .reduce((a, b) => a[1] > b[1] ? a : b)[0]
          .charAt(0).toUpperCase() + 
          Object.entries(profile.flavorProfile)
          .reduce((a, b) => a[1] > b[1] ? a : b)[0]
          .slice(1);
      }
  
      // Initialize category group if it doesn't exist
      if (!groups.has(groupLabel)) {
        groups.set(groupLabel, new Map());
      }
  
      // Get or initialize subcategory group
      const subcategoryGroup = groups.get(groupLabel)!;
      const subcategoryLabel = profile.subcategory;
      
      if (!subcategoryGroup.has(subcategoryLabel)) {
        subcategoryGroup.set(subcategoryLabel, []);
      }
      
      subcategoryGroup.get(subcategoryLabel)!.push(suggestion);
    });
  
    // Convert the nested Maps to the final format
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
  }, [filteredAndScoredSuggestions, ingredientProfiles, activeSorting]);
  

  return (
    <div className={`flex flex-col h-full space-y-2 md:space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search ingredients"
          className="pl-10 w-full p-2 border rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filteredAndScoredSuggestions.length > 0) {
              onSelect(filteredAndScoredSuggestions[0].name);
              setSearchTerm('');
              e.currentTarget.blur();
            }
          }}
        />
      </div>
  
      {/* Filters Section */}
      <div className="space-y-2 md:space-y-3">
        {isFiltersExpanded && (
          <div className="space-y-2 md:space-y-4">
            <CategoryFilter
              activeCategory={activeCategory}
              selectedSubcategories={selectedSubcategories}
              onFiltersChange={onFiltersChange}
            />
  
            <div className="px-2 md:px-3 space-y-3 md:space-y-4">
              <CompactTasteSliders
                values={tasteValues}
                onChange={onTasteValuesChange}
                activeSliders={activeSliders}
                onToggleSlider={onToggleSlider}
              />
              
              <div className="flex items-center justify-between">
                <SortingFilter
                  activeSorting={activeSorting}
                  onSortingChange={setActiveSorting}
                />
  
                {/* Custom Toggle Switch */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    Show Partial Matches
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={allowPartialMatches}
                      onChange={(e) => setAllowPartialMatches(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#FFC533]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  
      {/* Ingredients List */}
      <div className="flex-1 min-h-0">
        <div className="border-t border-gray-200 -mx-2 md:-mx-4">
          <div className="h-[calc(100vh-20rem)] md:h-[calc(100vh-24rem)] overflow-y-auto">
            <div className="px-3 md:px-4 pt-3 md:pt-4 pb-3 md:pb-4">
              {filteredAndScoredSuggestions.length > 0 ? (
                <div className="space-y-8">
                  {groupedIngredients.map(group => (
                    <div key={group.label} className="space-y-4">
                      {group.label && (
                        <h3 className="text-lg font-medium text-gray-900">
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
                                  const isPartialMatch = (
                                    (searchTerm && compatibility.score < 100) ||
                                    (allowPartialMatches && compatibility.score > 0 && compatibility.score < 100)
                                  );
  
                                  return (
                                    <button
                                      key={name}
                                      onClick={() => {
                                        onSelect(name);
                                        setSearchTerm('');
                                      }}
                                      className={`
                                        inline-flex items-center px-3 py-1.5 rounded-full text-sm
                                        transition-all text-black bg-white ingredient-button
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
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          {group.ingredients?.map(({ name, compatibility }) => {
                            const profile = ingredientProfiles.find(
                              p => p.name.toLowerCase() === name.toLowerCase()
                            );
                            const borderColor = getIngredientColor(profile);
                            const isPartialMatch = (
                              (searchTerm && compatibility.score < 100) ||
                              (allowPartialMatches && compatibility.score > 0 && compatibility.score < 100)
                            );
  
                            return (
                              <button
                                key={name}
                                onClick={() => {
                                  onSelect(name);
                                  setSearchTerm('');
                                }}
                                className={`
                                  inline-flex items-center px-3 py-1.5 rounded-full text-sm
                                  transition-all text-black bg-white ingredient-button
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
                <p className="text-gray-500 italic">
                  {allIngredients.length === 0
                    ? "Loading ingredients..."
                    : "No matching ingredients found"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuggestedIngredients;