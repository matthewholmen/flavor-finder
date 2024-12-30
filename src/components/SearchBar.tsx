// components/SearchBar.tsx
import React, { useCallback, useMemo } from 'react';
import { Search } from 'lucide-react';
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
      handleSelection(filteredIngredients[0]);
    }
  }, [filteredIngredients]);

  // New handler for ingredient selection
  const handleSelection = useCallback((ingredient: string) => {
    onIngredientSelect(ingredient);
    setSearchTerm(''); // Clear search field after selection
    setIsSearchFocused(false);
  }, [onIngredientSelect, setSearchTerm, setIsSearchFocused]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search ingredients..."
          className="pl-10 w-full p-2 border-2 border-gray-400 rounded-3xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
};