import React from 'react';

const SUBCATEGORIES: Record<string, string[]> = {
  Proteins: ["Plant Proteins", "Fish", "Pork", "Poultry", "Game", "Crustacean", "Mollusk", "Meat", "Offal"],
  Vegetables: ["Allium", "Brassicas", "Leafy Greens", "Root Vegetable", "Squash", "Mushroom", "Peppers", "Stalks", "Fruit Vegetables"],
  Fruits: ["Citrus", "Pome Fruit", "Stone Fruit", "Tropical Fruit", "Berries", "Melons", "Other Fruits"],
  Seasonings: ["Herbs", "Spices", "Chilis"],
  Dairy: ["Cultured Dairy", "Hard Cheese", "Soft Cheese", "Milk & Cream"],
  Grains: ["Rice", "Pasta", "Bread", "Ancient Grains"],
  Legumes: ["Beans", "Lentils", "Peas", "Soy"],
  Liquids: ["Broths & Stocks", "Oils & Fats", "Fruit Juices", "Vinegars"],
  Condiments: ["Fermented", "Sauces", "Preserves", "Sweeteners"],
  Alcohol: ["Wines", "Spirits", "Liqueurs"]
};

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
  selectedSubcategories: string[];
  onFiltersChange: (filters: { category: string; subcategories: string[] }) => void;
}

export default function CategoryFilter({
  activeCategory,
  selectedSubcategories,
  onFiltersChange
}: CategoryFilterProps) {
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
      // When selecting a new category, automatically select all its subcategories
      const newSubcategories = getSubcategories(newCategory);
      onFiltersChange({
        category: newCategory,
        subcategories: newSubcategories
      });
    }
  };

  const subcategories = getSubcategories(activeCategory);

  return (
    <div className="pl-4 flex flex-col gap-4">
      {/* Main categories */}
      <div className="relative">
        <div 
          className="flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-hide"
          style={{
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`
                relative py-1.5
                transition-all duration-200
                text-base
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
        <div 
          className="absolute right-0 top-0 h-full w-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to left, white, transparent)'
          }}
        />
      </div>

      {/* Subcategories */}
      {activeCategory && subcategories.length > 0 && (
        <div className="relative">
          <div 
            className="flex items-center gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide"
            style={{
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            {subcategories.map((subcat) => {
              const isSelected = selectedSubcategories.includes(subcat);
              return (
                <label
                  key={subcat}
                  className={`
                    flex items-center gap-2
                    py-1 px-3
                    text-sm
                    rounded-full
                    border border-gray-200
                    cursor-pointer
                    hover:bg-gray-50
                    transition-colors
                    ${isSelected ? 'bg-white' : 'bg-gray-50'}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSubcategoryToggle(subcat)}
                    className="h-3.5 w-3.5 rounded accent-gray-900"
                  />
                  <span className={`
                    ${isSelected ? 'text-gray-900' : 'text-gray-600'}
                  `}>
                    {subcat}
                  </span>
                </label>
              );
            })}
          </div>
          <div 
            className="absolute right-0 top-0 h-full w-16 pointer-events-none"
            style={{
              background: 'linear-gradient(to left, white, transparent)'
            }}
          />
        </div>
      )}
    </div>
  );
}