// components/SearchBar.tsx
import React, { useCallback, useMemo, useEffect } from 'react';
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
    // Prevent space from triggering random pairing
    if (e.key === ' ') {
      e.stopPropagation();
    }
    
    // Handle enter key
    if (e.key === 'Enter' && filteredIngredients.length > 0) {
      e.preventDefault();
      handleSelection(filteredIngredients[0]);
    }
  }, [filteredIngredients]);

  // Handle focus events
  const handleFocus = useCallback(() => {
    setIsSearchFocused(true);
  }, [setIsSearchFocused]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Small delay to allow click events to complete
    setTimeout(() => {
      setIsSearchFocused(false);
    }, 100);
  }, [setIsSearchFocused]);

  // New handler for ingredient selection
  const handleSelection = useCallback((ingredient: string) => {
    onIngredientSelect(ingredient);
    setSearchTerm(''); // Clear search field after selection
  }, [onIngredientSelect, setSearchTerm]);

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
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
};