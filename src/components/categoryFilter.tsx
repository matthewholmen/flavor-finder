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
  // 'Legumes',
  'Liquids',
  'Proteins',
  'Seasonings',
  'Vegetables'
] as const;

interface CategoryFilterProps {
  activeCategory: string;
  selectedSubcategories: string[];
  onFiltersChange: (filters: { category: string; subcategories: string[] }) => void;
}

export default function CategoryFilter({
  activeCategory,
  selectedSubcategories,
  onFiltersChange
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
        className="flex items-start gap-6 overflow-x-auto whitespace-nowrap scrollbar-hide"
      >
        {/* Categories list */}
        <div 
          className={`
            flex items-center gap-6 pr-12 h-[44px]
            transition-all duration-300 ease-in-out
            ${activeCategory ? 'opacity-0 w-0 overflow-hidden pointer-events-none' : 'opacity-100 w-auto'}
          `}
        >
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`
                py-0.5
                transition-all duration-200
                text-base whitespace-nowrap
                border-b-2 border-transparent
                hover:border-gray-200 text-gray-600 hover:text-gray-900
              `}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Active category and subcategories */}
        {activeCategory && (
          <div className="flex items-center gap-6 pr-12 h-[44px]">  {/* Added h-[44px] to match */}
            <button
              onClick={() => handleCategoryChange(activeCategory)}
              className="py-0.5 text-base whitespace-nowrap border-b-2 border-gray-800 text-gray-900 font-medium -ml-16"
            >
              {activeCategory}
            </button>

            {subcategories.length > 0 && (
              <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
                {subcategories.map((subcat) => {
  const isSelected = selectedSubcategories.includes(subcat);
  return (
    <button
      key={subcat}
      onClick={() => handleSubcategoryToggle(subcat)}
      className={`
        flex items-center gap-2
        py-1.5 px-4
        text-sm
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
           <X size={16} />
        </span>
      )}
    </button>
  );
})}

                <button
                  onClick={handleClearAll}
                  className="
                    py-2 px-2
                    rounded-full
                    border-2
                    bg-white
                    text-gray-400
                    border-gray-400
                    hover:text-gray-800
                    hover:bg-white
                    hover:border-gray-800
                    transition-colors
                  "
                >
                   <X size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gradient fade */}
        <div 
          className="absolute right-0 top-0 h-full w-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to left, white, transparent)'
          }}
        />
      </div>
    </div>
  );
}