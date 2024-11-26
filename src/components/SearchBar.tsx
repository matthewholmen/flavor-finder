// components/SearchBar.tsx
import React, { useCallback } from 'react';
import { Search } from 'lucide-react';
import { IngredientProfile } from '../types';
import { getAvailableCategories, getCategoryCounts } from '../utils/categorySearch.ts';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeCategories: string[];
  setActiveCategories: (categories: string[]) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  filteredIngredients: string[];
  onIngredientSelect: (ingredient: string) => void;
  ingredientProfiles: IngredientProfile[];
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  setSearchTerm,
  activeCategories,
  setActiveCategories,
  isSearchFocused,
  setIsSearchFocused,
  filteredIngredients,
  onIngredientSelect,
  ingredientProfiles
}) => {
  const availableCategories = getAvailableCategories(ingredientProfiles);
  const categoryCounts = getCategoryCounts(filteredIngredients, ingredientProfiles);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredIngredients.length > 0) {
      onIngredientSelect(filteredIngredients[0]);
      setSearchTerm(''); // Clear search field after selection
      setIsSearchFocused(false); // Close dropdown
    }
  }, [filteredIngredients, onIngredientSelect, setSearchTerm]);
  
  const toggleCategory = (category: string) => {
    console.log('Toggling category:', category);
    console.log('Current active categories:', activeCategories);
    if (activeCategories.includes(category)) {
      setActiveCategories(activeCategories.filter(c => c !== category));
    } else {
      setActiveCategories([...activeCategories, category]);
    }
  };

  return (
    <div className="space-y-2">
  {/* Search Input */}
  <div className="relative">
    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
    <input
      type="text"
      placeholder="Search ingredients"
      className="pl-10 w-full p-2 border rounded-lg"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onFocus={() => setIsSearchFocused(true)}
      onBlur={() => {
        setTimeout(() => setIsSearchFocused(false), 200);
      }}
      onKeyDown={handleKeyDown}
    />
  </div>

  {/* Dropdown Results */}
  {isSearchFocused && filteredIngredients.length > 0 && (
    <ul className="absolute z-50 bottom-full mb-1 max-w-sm w-full bg-white border rounded-lg shadow-lg overflow-auto max-h-60">
    {filteredIngredients.map((ingredient, index) => (
        <li
          key={index}
          className="p-2 hover:bg-gray-100 cursor-pointer"
          onMouseDown={() => onIngredientSelect(ingredient)}
        >
          {ingredient}
        </li>
      ))}
    </ul>
  )}
</div>

  );
};