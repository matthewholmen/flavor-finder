// components/SearchBar.tsx
import React, { useCallback, useMemo } from 'react';
import { Search } from 'lucide-react';
import { IngredientProfile } from '../types';
import { filterIngredients } from '../utils/search.ts';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  ingredients: string[];
  selectedIngredients: string[];
  onIngredientSelect: (ingredient: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  setSearchTerm,
  ingredients,
  selectedIngredients,
  onIngredientSelect,
  isSearchFocused,
  setIsSearchFocused,
}) => {
  const filteredIngredients = useMemo(() => 
    filterIngredients(ingredients, searchTerm, selectedIngredients),
    [ingredients, searchTerm, selectedIngredients]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredIngredients.length > 0) {
      onIngredientSelect(filteredIngredients[0]);
      setSearchTerm(''); // Clear search field after selection
      setIsSearchFocused(false); // Close dropdown
    }
  }, [filteredIngredients, onIngredientSelect, setSearchTerm, setIsSearchFocused]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search ingredients..."
          className="pl-10 w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => {
            // Delay to allow click events on dropdown
            setTimeout(() => setIsSearchFocused(false), 200);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Dropdown Results */}
      {isSearchFocused && filteredIngredients.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg overflow-auto max-h-60">
          {filteredIngredients.map((ingredient, index) => (
            <li
              key={index}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onMouseDown={() => {
                onIngredientSelect(ingredient);
                setSearchTerm('');
              }}
            >
              {ingredient}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};