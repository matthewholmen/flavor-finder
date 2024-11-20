import React from 'react';
import { ChevronDown } from 'lucide-react';

export const CATEGORIES = [
  'Alcohol',
  'Condiments',
  'Dairy',
  'Fruits',
  'Grains',
  'Legumes', 
  'Liquids',
  'Proteins',
  'Seasonings',
  'Vegetables'
];

interface CategoryFilterProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function CategoryFilter({ 
  selectedCategories, 
  onChange,
  isOpen,
  setIsOpen 
}: CategoryFilterProps) {
  const toggleCategory = (category: string) => {
    onChange(
      selectedCategories.includes(category)
        ? selectedCategories.filter(c => c !== category)
        : [...selectedCategories, category]
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map(category => (
        <button
          key={category}
          onClick={() => toggleCategory(category)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            selectedCategories.includes(category)
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}