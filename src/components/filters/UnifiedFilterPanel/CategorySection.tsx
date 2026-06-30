import React from 'react';
import { X } from 'lucide-react';
import { CategorySectionProps } from './types.ts';
import { categoryLabel } from '../../../utils/categoryLabels.ts';

const SUBCATEGORIES: Record<string, string[]> = {
  Proteins: ["Meat", "Poultry", "Seafood", "Eggs", "Beans & Legumes", "Nuts & Seeds", "Soy & Plant-Based"],
  Vegetables: ["Allium", "Leafy Greens", "Roots & Tubers", "Squash", "Brassicas", "Mushrooms", "Stalks", "Fruit Vegetables"],
  Fruits: ["Citrus", "Stone Fruit", "Tropical", "Berries", "Pome Fruit", "Melons"],
  Dairy: ["Cheese", "Cultured", "Milk & Cream", "Custards & Frozen"],
  Seasonings: ["Herbs", "Spices", "Spice Blends", "Chilis", "Salts"],
  Pantry: ["Fats & Oils", "Vinegars", "Sweeteners", "Sauces & Condiments", "Stocks & Bases"],
  Grains: ["Rice", "Pasta", "Bread", "Whole Grains", "Corn", "Starches"],
  Alcohol: ["Wine", "Beer & Cider", "Spirits", "Liqueurs"]
};

export const CATEGORIES = [
  'Proteins',
  'Vegetables',
  'Fruits',
  'Dairy',
  'Seasonings',
  'Pantry',
  'Grains',
  'Alcohol'
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
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-gray-900">Categories</h3>
        {(activeCategory || selectedSubcategories.length > 0) && (
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Categories Grid */}
      {!activeCategory && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`
                ${compact ? 'py-2 px-3 text-sm' : 'py-3 px-4 text-base'}
                rounded-full border-2 transition-all duration-200
                text-center font-medium hover:shadow-sm
                border-gray-300 bg-white text-gray-700 
                hover:border-gray-500 hover:bg-gray-50
              `}
            >
              {categoryLabel(category)}
            </button>
          ))}
        </div>
      )}

      {/* Active Category and Subcategories */}
      {activeCategory && (
        <div className="space-y-3">
          {/* Active Category Display */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAll}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Clear category filter"
            >
              <X size={16} className="text-gray-600" />
            </button>
            <div className="py-2 px-4 rounded-full border-2 border-[#6AAFE8] bg-[#6AAFE8] text-white font-medium text-base">
              {categoryLabel(activeCategory)}
            </div>
          </div>

          {/* Subcategories Grid */}
          {subcategories.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Subcategories</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {subcategories.map((subcat) => {
                  const isSelected = selectedSubcategories.includes(subcat);
                  return (
                    <button
                      key={subcat}
                      onClick={() => handleSubcategoryToggle(subcat)}
                      className={`
                        ${compact ? 'py-2 px-3 text-sm' : 'py-2 px-3 text-sm'}
                        rounded-full border-2 transition-all duration-200
                        text-center font-medium hover:shadow-sm
                        ${isSelected
                          ? 'border-[#6AAFE8] bg-blue-50 text-[#6AAFE8]'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="truncate">{subcat}</span>
                        {isSelected && <X size={14} />}
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