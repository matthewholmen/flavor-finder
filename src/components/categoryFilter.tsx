import React, { useRef } from 'react';
import { X } from 'lucide-react';

const SUBCATEGORIES: Record<string, string[]> = {
  Proteins: ["Plant Proteins", "Fish", "Pork", "Poultry", "Game", "Crustacean", "Mollusk", "Meat", "Offal"],
  Vegetables: ["Allium", "Brassicas", "Leafy Greens", "Root Vegetable", "Squash", "Mushroom", "Stalks", "Fruit Vegetables"],
  Fruits: ["Citrus", "Pome Fruit", "Stone Fruit", "Tropical Fruit", "Berries", "Melons", "Other Fruits"],
  Seasonings: ["Herbs", "Spices", "Chilis", "Seeds & Botanicals"],
  Dairy: ["Cultured Dairy", "Hard Cheese", "Soft Cheese", "Milk & Cream"],
  Grains: ["Rice", "Pasta", "Bread", "Ancient Grains"],
  Liquids: ["Broths & Stocks", "Oils & Fats", "Vinegars"],
  Condiments: ["Fermented", "Sauces", "Preserves", "Sweeteners"],
  Alcohol: ["Wines", "Spirits", "Liqueurs"]
};

export const CATEGORIES = [
  'Alcohol',
  'Condiments',
  'Dairy',
  'Fruits',
  'Grains',
  'Liquids',
  'Proteins',
  'Seasonings',
  'Vegetables'
] as const;

interface CategoryFilterProps {
  activeCategory: string;
  selectedSubcategories: string[];
  onFiltersChange: (filters: { category: string; subcategories: string[] }) => void;
  compact?: boolean;
}

export default function CategoryFilter({
  activeCategory,
  selectedSubcategories,
  onFiltersChange,
  compact = false
}: CategoryFilterProps) {
  // Initialize the ref here
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getSubcategories = (category: string): string[] => {
    return SUBCATEGORIES[category] || [];
  };

  const handleSubcategoryToggle = (subcategory: string) => {
    const updatedSubcategories = selectedSubcategories.includes(subcategory)
      ? selectedSubcategories.filter(s => s !== subcategory)
      : [...selectedSubcategories, subcategory];
    
    onFiltersChange({
      category: activeCategory,
      subcategories: updatedSubcategories
    });
  };

  const handleCategoryChange = (category: string) => {
    const newCategory = category === activeCategory ? '' : category;
    
    if (!newCategory) {
      onFiltersChange({
        category: '',
        subcategories: []
      });
    } else {
      onFiltersChange({
        category: newCategory,
        subcategories: []
      });
    }

    // Scroll to the start when a category is selected
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const handleClearAll = () => {
    onFiltersChange({
      category: '',
      subcategories: []
    });
    
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const subcategories = getSubcategories(activeCategory);

  return (
    <div className="relative">
      <div 
        ref={scrollContainerRef}
        className={`flex items-center ${compact ? 'gap-2' : 'gap-6'} overflow-x-auto whitespace-nowrap scrollbar-hide ${compact ? 'py-1' : 'py-2'}`}
      >
        {/* Categories list */}
        <div 
          className={`
            flex items-center ${compact ? 'gap-2' : 'gap-4'} ${compact ? 'px-4' : 'px-8'} ${compact ? 'py-1' : 'py-2'}
            transition-all duration-300 ease-in-out
            ${activeCategory ? 'opacity-0 w-0 overflow-hidden pointer-events-none' : 'opacity-100 w-auto'}
          `}
        >
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`
                ${compact ? 'py-1 px-3 text-sm' : 'py-2 px-6 text-md'}
                transition-all duration-200
                whitespace-nowrap
                rounded-full
                border-2 border-gray-300
                hover:border-gray-600 text-gray-600 hover:text-gray-900
              `}
            >
              {category}
            </button>
          ))}
        </div>
  
        {/* Active category and subcategories */}
        {activeCategory && (
          <div className={`flex items-center ${compact ? 'gap-2' : 'gap-4'} ${compact ? 'pr-6' : 'pr-12'} ${compact ? 'py-1' : 'py-2'}`}>
            <button
              onClick={handleClearAll}
              className={`
                ${compact ? 'py-1.5 px-1.5' : 'py-3 px-3'}
                rounded-full
                border-2
                bg-white
                text-gray-800
                border-gray-800
                hover:text-gray-400
                hover:bg-white
                hover:border-gray-400
                transition-colors
                ${compact ? '-ml-8' : '-ml-16'}
              `}
            >
              <X size={compact ? 14 : 16} />
            </button>
  
            <button
              onClick={() => handleCategoryChange(activeCategory)}
              className={`${compact ? 'py-1 px-3 text-sm' : 'py-2 px-6 text-md'} whitespace-nowrap rounded-full border-2 border-gray-800 bg-gray-800 text-white font-medium`}
            >
              {activeCategory}
            </button>
  
            {subcategories.length > 0 && (
              <div className={`flex items-center ${compact ? 'gap-2' : 'gap-4'} overflow-x-auto whitespace-nowrap scrollbar-hide`}>
                {subcategories.map((subcat) => {
                  const isSelected = selectedSubcategories.includes(subcat);
                  return (
                    <button
                      key={subcat}
                      onClick={() => handleSubcategoryToggle(subcat)}
                      className={`
                        flex items-center ${compact ? 'gap-1' : 'gap-4'}
                        ${compact ? 'py-1 px-3 text-sm' : 'py-2 px-6 text-md'}
                        rounded-full
                        border-2
                        transition-all duration-200
                        ${isSelected 
                          ? 'bg-white text-gray-800 border-gray-800' 
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-600'
                        }
                      `}
                    >
                      {subcat}
                      {isSelected && (
                        <span className="ml-1">
                          <X size={compact ? 14 : 18} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
  
        {/* Gradient fade */}
        
      </div>
    </div>
  );
}