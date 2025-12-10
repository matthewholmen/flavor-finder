// components/IngredientEditDialog.tsx
import React from 'react';
import { X } from 'lucide-react';
import CompactTasteSliders from './CompactTasteSliders.tsx';
import CategoryFilter, { CATEGORIES } from './categoryFilter.tsx';
import { SuggestedIngredients } from './SuggestedIngredients.tsx';
import { IngredientProfile, IngredientSubcategory } from '../types';
import { getSortedCompatibleIngredients } from '../utils/sorting.ts';
import { TasteValues } from './CompactTasteSliders.tsx';


interface DialogFilters {
  tasteValues: TasteValues;
  activeCategories: Array<keyof IngredientSubcategory>;
  activeSliders: Set<keyof TasteValues>;
}

interface IngredientEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ingredient: string) => void;
  currentIngredient: string;
  filters: {
    tasteValues: TasteValues;
    activeCategories: Array<keyof IngredientSubcategory>;
    activeSliders: Set<keyof TasteValues>;
  };
  onUpdateFilters: (filters: DialogFilters) => void;
  flavorMap: Map<string, Set<string>>;
  ingredientProfiles: IngredientProfile[];
  isLocked: boolean;
  onLockToggle: () => void;
  viewOnly?: boolean;

}



const IngredientEditDialog: React.FC<IngredientEditDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentIngredient,
  filters,
  onUpdateFilters,
  flavorMap,
  ingredientProfiles
}) => {
  if (!isOpen) return null;

// Replace the entire return statement with:
return (
  <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-8 z-50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">Edit Ingredient</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        <CategoryFilter
          selectedCategories={filters.activeCategories}
          onChange={(categories) => onUpdateFilters({
            ...filters,
            activeCategories: categories as Array<keyof IngredientSubcategory>
          })}
          isOpen={true}
          setIsOpen={() => {}}
        />

        <div className="mt-4">
          <CompactTasteSliders
            values={filters.tasteValues}
            onChange={(values) => onUpdateFilters({
              ...filters,
              tasteValues: values
            })}
            activeSliders={filters.activeSliders}
            onToggleSlider={(slider) => {
              const newSliders = new Set(filters.activeSliders);
              if (newSliders.has(slider)) {
                newSliders.delete(slider);
              } else {
                newSliders.add(slider);
              }
              onUpdateFilters({
                ...filters,
                activeSliders: newSliders
              });
            }}
          />
        </div>

        <div className="mt-4">
        <SuggestedIngredients
  suggestions={getSortedCompatibleIngredients(
    [currentIngredient].filter(Boolean),
    flavorMap,
    ingredientProfiles,
    filters.tasteValues,
    filters.activeSliders
  )}
  onSelect={onSelect}
  selectedIngredients={[currentIngredient]}
  flavorMap={flavorMap}
  experimentalPairings={[]}
  flavorPairings={[]}
  activeCategories={filters.activeCategories}
  ingredientProfiles={ingredientProfiles}
  tasteValues={filters.tasteValues}
  activeSliders={filters.activeSliders}
/>
        </div>
      </div>
    </div>
  </div>
);
};

export default IngredientEditDialog;