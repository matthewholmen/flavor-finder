// components/SearchBar.tsx
import React, { useCallback, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { filterIngredients } from '../utils/searchUtils.ts';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  ingredients: string[];
  selectedIngredients: string[];
  onIngredientSelect: (ingredient: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  largerMobile?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  setSearchTerm,
  ingredients,
  selectedIngredients,
  onIngredientSelect,
  isSearchFocused,
  setIsSearchFocused,
  largerMobile = false,
}) => {
  const filteredIngredients = useMemo(() => 
    filterIngredients(ingredients, searchTerm, selectedIngredients),
    [ingredients, searchTerm, selectedIngredients]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      e.stopPropagation();
    }
    
    if (e.key === 'Enter' && filteredIngredients.length > 0) {
      e.preventDefault();
      handleSelection(filteredIngredients[0]);
    }
  }, [filteredIngredients]);

  const handleFocus = useCallback(() => {
    setIsSearchFocused(true);
  }, [setIsSearchFocused]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsSearchFocused(false);
    }, 100);
  }, [setIsSearchFocused]);

  const handleSelection = useCallback((ingredient: string) => {
    onIngredientSelect(ingredient);
    setSearchTerm('');
  }, [onIngredientSelect, setSearchTerm]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className={`absolute left-3 ${largerMobile ? 'top-3.5' : 'top-2.5'} ${largerMobile ? 'h-6 w-6' : 'h-5 w-5'} text-gray-400`} />
        <input
          type="text"
          placeholder="Search ingredients..."
          className={`pl-10 w-full ${largerMobile ? 'p-3 text-lg' : 'p-2'} border-2 border-gray-400 rounded-full`}
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
