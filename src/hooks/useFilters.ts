import { useState, useCallback } from 'react';

export interface TasteValues {
  sweet: number;
  salty: number;
  sour: number;
  bitter: number;
  umami: number;
  fat: number;
  spicy: number;
}

export interface DietaryRestrictions {
  [key: string]: boolean;
}

interface UseFiltersReturn {
  // State
  activeCategory: string;
  selectedSubcategories: string[];
  tasteValues: TasteValues;
  activeSliders: Set<string>;
  dietaryRestrictions: DietaryRestrictions;
  searchTerm: string;

  // Actions
  setActiveCategory: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSubcategories: React.Dispatch<React.SetStateAction<string[]>>;
  setTasteValues: React.Dispatch<React.SetStateAction<TasteValues>>;
  setActiveSliders: React.Dispatch<React.SetStateAction<Set<string>>>;
  setDietaryRestrictions: React.Dispatch<React.SetStateAction<DietaryRestrictions>>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;

  // Handlers
  handleCategoryChange: (params: { category: string; subcategories: string[] }) => void;
  handleSliderToggle: (taste: string) => void;
  clearFilters: () => void;
}

const DEFAULT_TASTE_VALUES: TasteValues = {
  sweet: 0,
  salty: 0,
  sour: 0,
  bitter: 0,
  umami: 0,
  fat: 0,
  spicy: 0,
};

export const useFilters = (): UseFiltersReturn => {
  // Filter state
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [tasteValues, setTasteValues] = useState<TasteValues>(DEFAULT_TASTE_VALUES);
  const [activeSliders, setActiveSliders] = useState<Set<string>>(new Set());
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestrictions>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Handler for category changes (category + subcategories together)
  const handleCategoryChange = useCallback(({ category, subcategories }: { category: string; subcategories: string[] }) => {
    setActiveCategory(category);
    setSelectedSubcategories(subcategories);
  }, []);

  // Handler for taste slider toggle
  const handleSliderToggle = useCallback((taste: string) => {
    setActiveSliders(prev => {
      const next = new Set(prev);
      if (next.has(taste)) {
        next.delete(taste);
      } else {
        next.add(taste);
        // Set default value of 3 when activating a slider
        setTasteValues(prevValues => ({
          ...prevValues,
          [taste]: 3
        }));
      }
      return next;
    });
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setActiveCategory('');
    setSelectedSubcategories([]);
    setTasteValues(DEFAULT_TASTE_VALUES);
    setActiveSliders(new Set());
    setDietaryRestrictions({});
    setSearchTerm('');
  }, []);

  return {
    // State
    activeCategory,
    selectedSubcategories,
    tasteValues,
    activeSliders,
    dietaryRestrictions,
    searchTerm,

    // Actions
    setActiveCategory,
    setSelectedSubcategories,
    setTasteValues,
    setActiveSliders,
    setDietaryRestrictions,
    setSearchTerm,

    // Handlers
    handleCategoryChange,
    handleSliderToggle,
    clearFilters,
  };
};

export default useFilters;
