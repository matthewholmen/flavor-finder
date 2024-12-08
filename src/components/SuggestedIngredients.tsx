import React, { useState, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { getCompatibilityScore } from '../utils/compatibility.ts';
import { filterIngredients } from '../utils/searchUtils.ts';
import { IngredientProfile } from '../types';
import { TasteValues } from './CompactTasteSliders';
import { TASTE_COLORS } from '../utils/colors.ts';
import CompactTasteSliders from './CompactTasteSliders.tsx';
import CategoryFilter, { CATEGORIES } from './categoryFilter.tsx';

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

  const allIngredients = useMemo(() => 
    Array.from(flavorMap.keys()).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    ),
    [flavorMap]
  );

  const filteredSuggestions = useMemo(() => {
    let filtered = searchTerm
      ? filterIngredients(allIngredients, searchTerm)
      : selectedIngredients.length === 0 ? allIngredients : suggestions;

    if (selectedIngredients.length > 0) {
      filtered = filtered.filter(ingredient => {
        const otherIngredients = selectedIngredients.filter(
          selected => selected !== ingredient
        );
        return otherIngredients.every(selected => {
          const pairings = flavorMap.get(selected);
          return pairings?.has(ingredient);
        });
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

    return filtered.sort((a, b) => {
      const scoreA = getCompatibilityScore(a, selectedIngredients, flavorMap);
      const scoreB = getCompatibilityScore(b, selectedIngredients, flavorMap);
      return scoreB - scoreA;
    });
  }, [
    searchTerm,
    suggestions,
    allIngredients,
    selectedIngredients,
    flavorMap,
    activeCategory,
    ingredientProfiles,
    tasteValues,
    activeSliders
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      onSelect(filteredSuggestions[0]);
      setSearchTerm('');
      e.currentTarget.blur();
    }
  };

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
          onKeyDown={handleKeyDown}
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

            <div className="px-3">
              <CompactTasteSliders
                values={tasteValues}
                onChange={onTasteValuesChange}
                activeSliders={activeSliders}
                onToggleSlider={onToggleSlider}
              />
            </div>
          </div>
        )}
      </div>

      {/* Divider and Ingredients List */}
      <div className="flex-1 min-h-0">
        <div className="border-t border-gray-200 -mx-4">
          <div className="h-[calc(100vh-280px)] overflow-y-auto">
            <div className="px-4 pt-4 pb-4">
              {filteredSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {filteredSuggestions.map(ingredient => {
                    const profile = ingredientProfiles.find(
                      p => p.name.toLowerCase() === ingredient.toLowerCase()
                    );
                    const borderColor = getIngredientColor(profile);

                    return (
                      <button
                        key={ingredient}
                        onClick={() => {
                          onSelect(ingredient);
                          setSearchTerm('');
                        }}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm
                          transition-all ingredient-button"
                        style={{
                          border: `3px solid ${borderColor}`
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = borderColor;
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.color = 'black';
                        }}
                      >
                        {ingredient}
                      </button>
                    );
                  })}
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