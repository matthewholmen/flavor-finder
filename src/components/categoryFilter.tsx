import React, { JSX } from 'react';

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
] as const;

interface CategoryFilterProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryFilter({
  activeCategory,
  onCategoryChange
}: CategoryFilterProps) {
  return (
    <div 
      className="flex items-center gap-2 md:gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide"
      style={{
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      {CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category === activeCategory ? '' : category)}
          className={`
            relative py-0.5 md:py-1 
            transition-all duration-200
            text-sm
            border-b-2 
            ${activeCategory === category 
              ? 'border-gray-900 text-gray-900 font-medium' 
              : 'border-transparent hover:border-gray-200 text-gray-600 hover:text-gray-900'
            }
          `}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
