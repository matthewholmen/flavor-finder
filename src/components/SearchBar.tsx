// components/SearchBar.tsx
import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { Search, Tag } from 'lucide-react';
import { filterIngredients } from '../utils/searchUtils.ts';
import type { IngredientProfile } from '../types';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  ingredients: string[];
  selectedIngredients: string[];
  onIngredientSelect: (ingredient: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  largerMobile?: boolean;
  ingredientProfiles: IngredientProfile[];
  isCategorySearch?: boolean;
  setIsCategorySearch?: (isCategory: boolean) => void;
  modalSearch?: boolean;
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
  ingredientProfiles = [],
  isCategorySearch = false,
  setIsCategorySearch = () => {},
  modalSearch = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredIngredients = useMemo(() => 
    filterIngredients(ingredients, searchTerm, selectedIngredients, ingredientProfiles),
    [ingredients, searchTerm, selectedIngredients, ingredientProfiles]
  );

  // Auto-focus effect for modal search
  useEffect(() => {
    if (modalSearch && inputRef.current) {
      // Focus with a small delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [modalSearch]);
  
  // Check if the current search is finding categories
  const isCurrentCategorySearch = useMemo(() => {
    if (!searchTerm) return false;
    return filteredIngredients.some(ingredient => {
      const profile = ingredientProfiles.find(p => p.name.toLowerCase() === ingredient.toLowerCase());
      if (!profile) return false;
      
      const normalizedSearch = searchTerm.toLowerCase();
      return profile.category.toLowerCase().includes(normalizedSearch) || 
             profile.subcategory.toLowerCase().includes(normalizedSearch);
    });
  }, [searchTerm, filteredIngredients, ingredientProfiles]);

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
        {isCurrentCategorySearch ? (
          <Tag className={`absolute left-3 ${largerMobile ? 'top-3.5' : 'top-3.5'} ${largerMobile ? 'h-6 w-6' : 'h-5 w-5'} text-blue-500`} />
        ) : (
          <Search className={`absolute left-3 ${largerMobile ? 'top-3.5' : 'top-3.5'} ${largerMobile ? 'h-6 w-6' : 'h-5 w-5'} text-gray-400`} />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search ingredients or categories..."
          className={`pl-10 w-full ${largerMobile ? 'p-3 text-lg' : 'py-3 px-4'} border-2 ${isCurrentCategorySearch ? 'border-blue-400' : 'border-gray-400'} rounded-full search-modal-input ${modalSearch ? 'modal-search-input' : ''}`}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            // Update UI indicator when category search is detected
            if (e.target.value && setIsCategorySearch) {
              // Will be set in the next render via isCurrentCategorySearch
            }
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus={modalSearch}
        />
      </div>
      {isCurrentCategorySearch && (
        <div className="absolute top-full mt-1 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
          Category search
        </div>
      )}
    </div>
  );
};
