import React from 'react';
import { X } from 'lucide-react';
import { SearchBar } from './SearchBar';
import CategoryFilter from './categoryFilter';
import CompactTasteSliders from './CompactTasteSliders';
import SuggestedIngredients from './SuggestedIngredients';

interface MobileSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  allIngredients: string[];
  selectedIngredients: string[];
  handleIngredientSelect: (ingredient: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  activeFilters: {
    category: string;
    subcategories: string[];
  };
  setActiveFilters: (filters: { category: string; subcategories: string[] }) => void;
  tasteValues: Record<string, number>;
  setTasteValues: (values: Record<string, number>) => void;
  activeSliders: Set<string>;
  toggleSlider: (taste: string) => void;
  filteredIngredients: string[];
  flavorMap: Map<string, Set<string>>;
  ingredientProfiles: any[]; // Type this properly based on your data structure
  showPartialMatches: boolean;
  activeSorting: string;
  substitutionMode: {
    active: boolean;
    sourceIngredient: string | null;
    type: string;
    slotIndex: number | null;
  };
  onModeChange: (mode: string) => void;
}

const MobileSearchDrawer: React.FC<MobileSearchDrawerProps> = ({
  isOpen,
  onClose,
  searchTerm,
  setSearchTerm,
  allIngredients,
  selectedIngredients,
  handleIngredientSelect,
  isSearchFocused,
  setIsSearchFocused,
  activeFilters,
  setActiveFilters,
  tasteValues,
  setTasteValues,
  activeSliders,
  toggleSlider,
  filteredIngredients,
  flavorMap,
  ingredientProfiles,
  showPartialMatches,
  activeSorting,
  substitutionMode,
  onModeChange,
}) => {
  return (
    <div 
      className={`fixed inset-0 bg-white z-30 transform transition-transform md:hidden ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="h-full flex flex-col">
        {/* Close button */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium">Add Ingredient</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Search and filters content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <SearchBar 
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              ingredients={allIngredients}
              selectedIngredients={selectedIngredients}
              onIngredientSelect={(ingredient) => {
                handleIngredientSelect(ingredient);
                onClose();
              }}
              isSearchFocused={isSearchFocused}
              setIsSearchFocused={setIsSearchFocused}
            />
          </div>
          
          {/* Filters */}
          <div className="px-4">
            <CategoryFilter
              activeCategory={activeFilters.category}
              selectedSubcategories={activeFilters.subcategories}
              onFiltersChange={setActiveFilters}
            />
            
            <CompactTasteSliders
            tasteValues={tasteValues}
            setTasteValues={setTasteValues}
            activeSliders={activeSliders}
            toggleSlider={toggleSlider}
            />
          </div>
          
          {/* Suggested ingredients */}
          <div className="flex-1 border-t border-gray-200 mt-4">
            <SuggestedIngredients
              suggestions={filteredIngredients}
              onSelect={(ingredient) => {
                handleIngredientSelect(ingredient);
                onClose();
              }}
              selectedIngredients={selectedIngredients}
              flavorMap={flavorMap}
              ingredientProfiles={ingredientProfiles}
              showPartialMatches={showPartialMatches}
              className="h-full"
              activeSorting={activeSorting}
            substitutionMode={substitutionMode}
            handleModeChange={onModeChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSearchDrawer;