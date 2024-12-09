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
  activeCategories: string[];
  ingredientProfiles: IngredientProfile[];
  tasteValues: TasteValues;
  activeSliders?: Set<keyof TasteValues>;
  onTasteValuesChange: (values: TasteValues) => void;
  onToggleSlider: (taste: keyof TasteValues) => void;
}

interface GroupedIngredients {
  label: string;
  ingredients: Array<{
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
  activeCategories,
  ingredientProfiles,
  tasteValues,
  activeSliders = new Set(),
  onTasteValuesChange,
  onToggleSlider
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSorting, setActiveSorting] = useState<SortingOption>('alphabetical');
  const [allowPartialMatches, setAllowPartialMatches] = useState(false);

  const allIngredients = useMemo(() => 
    Array.from(flavorMap.keys()).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    ),
    [flavorMap]
  );

  const filteredAndScoredSuggestions = useMemo(() => {
    let filtered = searchTerm
      ? filterIngredients(allIngredients, searchTerm)
      : selectedIngredients.length === 0 ? allIngredients : suggestions;

    if (selectedIngredients.length > 0) {
      filtered = filtered.filter(ingredient => {
        const compatibility = getCompatibilityScore(
          ingredient,
          selectedIngredients,
          flavorMap,
          allowPartialMatches
        );
        return allowPartialMatches ? compatibility.matchedWith.length > 0 : compatibility.score === 100;
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
        allowPartialMatches
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

    const groups = new Map<string, typeof sortedSuggestions>();

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

      if (!groups.has(groupLabel)) {
        groups.set(groupLabel, []);
      }
      groups.get(groupLabel)?.push(suggestion);
    });

    return Array.from(groups.entries())
      .map(([label, ingredients]) => ({ label, ingredients }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredAndScoredSuggestions, ingredientProfiles, activeSorting]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search ingredients"
          className="pl-10 w-full p-2 border rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
      <div className="space-y-3">
        {isFiltersExpanded && (
          <div className="space-y-4">
            <CategoryFilter
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />

            <div className="px-3 space-y-4">
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
                    Allow Partial Matches
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={allowPartialMatches}
                      onChange={(e) => setAllowPartialMatches(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#8DC25B]"></div>
                  </label>
                </div>
              </div>
              
            </div>
          </div>
        )}
      </div>

      {/* Ingredients List */}
      <div className="flex-1 min-h-0">
        <div className="border-t border-gray-200 -mx-4">
          <div className="h-[calc(100vh-24rem)] overflow-y-auto">
            <div className="px-4 pt-4 pb-4">
              {filteredAndScoredSuggestions.length > 0 ? (
                <div className="space-y-6">
                  {groupedIngredients.map(group => (
                    <div key={group.label} className="space-y-2">
                      {group.label && (
                        <h3 className="text-sm font-medium text-gray-500">
                          {group.label}
                        </h3>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {group.ingredients.map(({ name, compatibility }) => {
                          const profile = ingredientProfiles.find(
                            p => p.name.toLowerCase() === name.toLowerCase()
                          );
                          const borderColor = getIngredientColor(profile);
                          const isPartialMatch = allowPartialMatches && 
                            compatibility.score > 0 && 
                            compatibility.score < 100;

                          return (
                            <button
                              key={name}
                              onClick={() => {
                                onSelect(name);
                                setSearchTerm('');
                              }}
                              className={`
                                inline-flex items-center px-3 py-1.5 rounded-full text-sm
                                transition-all ingredient-button relative
                                ${isPartialMatch ? 'border-dashed' : 'border-solid'}
                              `}
                              style={{
                                border: `3px ${isPartialMatch ? 'dashed' : 'solid'} ${borderColor}`,
                                opacity: isPartialMatch ? 0.9 : 1
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