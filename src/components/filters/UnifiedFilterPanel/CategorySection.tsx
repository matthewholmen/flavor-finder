import React from 'react';
import { X } from 'lucide-react';
import { CategorySectionProps } from './types.ts';

const SUBCATEGORIES: Record<string, string[]> = {
  Proteins: ["Plant Proteins", "Fish", "Pork", "Poultry", "Game", "Crustacean", "Mollusk", "Meat", "Offal"],
  Vegetables: ["Allium", "Brassicas", "Leafy Greens", "Roots", "Squash", "Mushroom", "Stalks", "Fruit Vegetables"],
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

const CategorySection: React.FC<CategorySectionProps> = ({
  activeCategory,
  selectedSubcategories,
  onFiltersChange,
  compact = false
}) => {
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
  };

  const handleClearAll = () => {
    onFiltersChange({
      category: '',
      subcategories: []
    });
  };

  const subcategories = getSubcategories(activeCategory);

  return (
    <div className="space-y-3">
      {/* Categories Grid */}
      {!activeCategory && (
        <div>
          {(activeCategory || selectedSubcategories.length > 0) && (
            <div className="flex justify-end mb-2">
              <button
                onClick={handleClearAll}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className="
                py-2 px-3 text-sm rounded-full border-2 transition-all duration-200
                text-center font-medium hover:shadow-sm
                border-gray-300 bg-white text-gray-700 
                hover:border-gray-500 hover:bg-gray-50
              "
            >
              {category}
            </button>
          ))}
          </div>
        </div>
      )}

      {/* Active Category and Subcategories */}
      {activeCategory && (
        <div className="space-y-2">
          {/* Active Category Display */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAll}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Clear category filter"
            >
              <X size={14} className="text-gray-600" />
            </button>
            <div className="py-1.5 px-3 rounded-full border-2 border-blue-500 bg-blue-500 text-white font-medium text-sm">
              {activeCategory}
            </div>
          </div>

          {/* Subcategories Grid */}
          {subcategories.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1.5">Subcategories</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {subcategories.map((subcat) => {
                  const isSelected = selectedSubcategories.includes(subcat);
                  return (
                    <button
                      key={subcat}
                      onClick={() => handleSubcategoryToggle(subcat)}
                      className={`
                        py-1.5 px-3 text-xs rounded-full border-2 transition-all duration-200
                        text-center font-medium hover:shadow-sm
                        ${isSelected 
                          ? 'border-blue-400 bg-blue-50 text-blue-800' 
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="truncate">{subcat}</span>
                        {isSelected && <X size={10} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySection;