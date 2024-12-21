import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import CompactTasteSliders from './CompactTasteSliders.tsx';
import { CATEGORIES } from './categoryFilter.tsx';
import { ingredientProfiles } from '../data/ingredientProfiles.ts';

type TasteType = 'sweet' | 'salty' | 'sour' | 'bitter' | 'umami' | 'fat' | 'spicy';

interface MobileSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  activeCategories: string[];
  setActiveCategories: (categories: string[]) => void;
  tasteValues: Record<TasteType, number>;
  setTasteValues: (values: Record<TasteType, number>) => void;
  activeSliders: Set<TasteType>;
  setActiveSliders: (sliders: Set<TasteType>) => void;
}

const DEFAULT_ACTIVE_SLIDERS: Set<TasteType> = new Set([
  'sweet', 'salty', 'sour', 'bitter', 'umami', 'fat', 'spicy'
]);

const MobileSearchSheet = ({
  isOpen,
  onClose,
  children,
  activeCategories = [],
  setActiveCategories,
  tasteValues = { sweet: 0, salty: 0, sour: 0, bitter: 0, umami: 0, fat: 0, spicy: 0 },
  setTasteValues,
  activeSliders = DEFAULT_ACTIVE_SLIDERS,
  setActiveSliders = () => {}, // Default no-op function
}: MobileSearchSheetProps) => {
  const [activeTab, setActiveTab] = useState('search');
  const [filteredIngredients, setFilteredIngredients] = useState<string[]>([]);

  const filterByTasteValues = (ingredients: string[], tasteValues: Record<TasteType, number>) => {
    return ingredients.filter((ingredient) => {
      const profile = ingredientProfiles.find(
        (p) => p.name.toLowerCase() === ingredient.toLowerCase()
      );

      if (!profile) return false;

      return Object.entries(tasteValues).every(([taste, minValue]) => {
        return profile.flavorProfile[taste as TasteType] >= minValue;
      });
    });
  };

  useEffect(() => {
    if (!tasteValues) {
      console.warn('Warning: tasteValues is undefined');
    }
    if (!activeSliders) {
      console.warn('Warning: activeSliders is undefined');
    }
  }, [tasteValues, activeSliders]);

  useEffect(() => {
    const ingredientNames = ingredientProfiles.map((p) => p.name);
    const results = filterByTasteValues(ingredientNames, tasteValues);
    setFilteredIngredients(results);
  }, [tasteValues]);

  const handleSliderToggle = (taste: TasteType) => {
    const newActive = new Set(activeSliders);
    if (newActive.has(taste)) {
      newActive.delete(taste);
    } else {
      newActive.add(taste);
    }
    setActiveSliders(newActive);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 z-50">
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-xl h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              className={`font-medium pb-2 ${
                activeTab === 'search' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('search')}
            >
              Search
            </button>
            <button
              className={`font-medium pb-2 ${
                activeTab === 'selected' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('selected')}
            >
              Selected
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'search' ? (
            <>
              <div className="p-4 space-y-4">
                {/* Category Pills */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setActiveCategories(
                          activeCategories.includes(category)
                            ? activeCategories.filter((c) => c !== category)
                            : [...activeCategories, category]
                        );
                      }}
                      className={`flex-none px-3 py-1 rounded-full text-sm transition-colors ${
                        activeCategories.includes(category)
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* Taste Sliders */}
                <CompactTasteSliders
                  values={tasteValues}
                  onChange={setTasteValues}
                  activeSliders={activeSliders}
                  onToggleSlider={handleSliderToggle}
                />

                {/* Display filtered ingredients */}
                <div className="mt-4">
                  <h3 className="text-lg font-semibold">Filtered Ingredients:</h3>
                  <ul>
                    {filteredIngredients.map((ingredient) => (
                      <li key={ingredient}>{ingredient}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {children}
            </>
          ) : (
            <div className="p-4">
              {/* Selected ingredients view */}
              Selected ingredients here
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileSearchSheet;
