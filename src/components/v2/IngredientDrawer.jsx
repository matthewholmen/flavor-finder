import React, { useRef, useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, X, Filter } from 'lucide-react';
import { TASTE_COLORS } from '../../utils/colors.ts';
import { useScreenSize } from '../../hooks/useScreenSize.ts';

// Filter constants
const CATEGORIES = [
  'Alcohol', 'Condiments', 'Dairy', 'Fruits', 
  'Grains', 'Liquids', 'Proteins', 'Seasonings', 'Vegetables'
];

const SUBCATEGORIES = {
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

const TASTE_PROPERTIES = ['sweet', 'salty', 'sour', 'bitter', 'umami', 'fat', 'spicy'];

const DIETARY_TOGGLES = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'pescatarian', label: 'Pescatarian' },
  { key: 'gluten-free', label: 'Gluten-free' },
  { key: 'dairy-free', label: 'Dairy-free' },
  { key: 'alcohol-free', label: 'Alcohol-free' },
  { key: 'nut-free', label: 'Nut-free' },
  { key: 'nightshade-free', label: 'Nightshade-free' },
  { key: 'low-fodmap', label: 'Low-FODMAP' }
  // { key: 'keto', label: 'Keto' }
];

export const IngredientDrawer = ({
  isOpen,
  onToggle,
  onClose,
  searchTerm,
  onSearchChange,
  suggestions,
  onIngredientSelect,
  ingredientProfiles,
  selectedIngredients,
  // Filter props
  activeCategory = '',
  selectedSubcategories = [],
  onCategoryChange = () => {},
  tasteValues = {},
  activeSliders = new Set(),
  onTasteChange = () => {},
  onSliderToggle = () => {},
  dietaryRestrictions = {},
  onDietaryChange = () => {},
}) => {
  const inputRef = useRef(null);
  const { isMobile, width } = useScreenSize();
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('categories');
  const [selectedInfoIndex, setSelectedInfoIndex] = useState(0);
  const [showMaxMessage, setShowMaxMessage] = useState(false);
  
  // Auto-focus search input when drawer opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Close filters when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsFiltersExpanded(false);
    }
  }, [isOpen]);

  // Keep selectedInfoIndex in bounds when ingredients change
  useEffect(() => {
    if (selectedIngredients.length > 0 && selectedInfoIndex >= selectedIngredients.length) {
      setSelectedInfoIndex(selectedIngredients.length - 1);
    }
  }, [selectedIngredients, selectedInfoIndex]);

  const getIngredientColor = (ingredient) => {
    const profile = ingredientProfiles.find(
      p => p.name.toLowerCase() === ingredient.toLowerCase()
    );

    if (!profile) return '#374151';

    let dominantTaste = 'sweet';
    let maxValue = -1;

    Object.entries(profile.flavorProfile).forEach(([taste, value]) => {
      if (value > maxValue) {
        maxValue = value;
        dominantTaste = taste;
      }
    });

    return TASTE_COLORS[dominantTaste] || '#374151';
  };

  const getIngredientProfile = (ingredient) => {
    return ingredientProfiles.find(
      p => p.name.toLowerCase() === ingredient.toLowerCase()
    );
  };

  const getTasteTags = (profile) => {
    if (!profile || !profile.flavorProfile) return [];
    return Object.entries(profile.flavorProfile)
      .filter(([_, value]) => value >= 5)
      .map(([taste, _]) => taste);
  };

  const handleIngredientAdd = (ingredient) => {
    if (selectedIngredients.length >= 5) {
      setShowMaxMessage(true);
      setTimeout(() => setShowMaxMessage(false), 2000);
      return;
    }
    onIngredientSelect(ingredient);
  };

  // Category handlers
  const handleCategoryClick = (category) => {
    if (activeCategory === category) {
      onCategoryChange({ category: '', subcategories: [] });
    } else {
      onCategoryChange({ category, subcategories: [] });
    }
  };

  const handleSubcategoryToggle = (subcat) => {
    const newSubcats = selectedSubcategories.includes(subcat)
      ? selectedSubcategories.filter(s => s !== subcat)
      : [...selectedSubcategories, subcat];
    onCategoryChange({ category: activeCategory, subcategories: newSubcats });
  };

  const handleClearCategory = () => {
    onCategoryChange({ category: '', subcategories: [] });
  };

  // Taste handlers
  const handleTasteToggle = (taste) => {
    onSliderToggle(taste);
  };

  // Dietary handlers
  const getDietaryState = (key) => {
    switch(key) {
      case 'vegetarian':
        return dietaryRestrictions['Proteins:Meat'] === false &&
               dietaryRestrictions['Proteins:Poultry'] === false &&
               dietaryRestrictions['Proteins:Fish'] === false;
      case 'pescatarian':
        return dietaryRestrictions['Proteins:Meat'] === false &&
               dietaryRestrictions['Proteins:Poultry'] === false &&
               dietaryRestrictions['Proteins:Fish'] !== false;
      case 'gluten-free':
        return dietaryRestrictions['Grains:Bread'] === false ||
               dietaryRestrictions['Grains:Pasta'] === false;
      case 'dairy-free':
        return dietaryRestrictions['Dairy:Hard Cheese'] === false ||
               dietaryRestrictions['Dairy:Soft Cheese'] === false;
      case 'alcohol-free':
        return dietaryRestrictions['Alcohol:Liqueurs'] === false ||
               dietaryRestrictions['Alcohol:Spirits'] === false ||
               dietaryRestrictions['Alcohol:Wines'] === false;
      case 'nut-free':
        return dietaryRestrictions['_nuts'] === false;
      case 'nightshade-free':
        return dietaryRestrictions['_nightshades'] === false;
      case 'low-fodmap':
        return dietaryRestrictions['_fodmap'] === false;
      case 'keto':
        return (dietaryRestrictions['Grains:Rice'] === false ||
                dietaryRestrictions['Grains:Ancient Grains'] === false ||
                dietaryRestrictions['Grains:Bread'] === false ||
                dietaryRestrictions['Grains:Pasta'] === false ||
                dietaryRestrictions['Grains:Starches'] === false) &&
               dietaryRestrictions['Condiments:Sweeteners'] === false;
      default:
        return false;
    }
  };

  const handleDietaryToggle = (key) => {
    let newRestrictions = { ...dietaryRestrictions };
    const isActive = getDietaryState(key);

    switch(key) {
      case 'vegetarian':
        const proteinKeys = ['Meat', 'Poultry', 'Game', 'Pork', 'Offal', 'Fish', 'Crustacean', 'Mollusk'];
        proteinKeys.forEach(k => {
          newRestrictions[`Proteins:${k}`] = isActive;
        });
        break;
      case 'pescatarian':
        ['Meat', 'Poultry', 'Game', 'Pork', 'Offal'].forEach(k => {
          newRestrictions[`Proteins:${k}`] = isActive;
        });
        if (!isActive) {
          ['Fish', 'Crustacean', 'Mollusk'].forEach(k => {
            newRestrictions[`Proteins:${k}`] = true;
          });
        }
        break;
      case 'gluten-free':
        newRestrictions['Grains:Bread'] = isActive;
        newRestrictions['Grains:Pasta'] = isActive;
        break;
      case 'dairy-free':
        ['Hard Cheese', 'Soft Cheese', 'Cultured Dairy', 'Milk & Cream'].forEach(k => {
          newRestrictions[`Dairy:${k}`] = isActive;
        });
        break;
      case 'alcohol-free':
        ['Liqueurs', 'Spirits', 'Wines'].forEach(k => {
          newRestrictions[`Alcohol:${k}`] = isActive;
        });
        break;
      case 'nut-free':
        newRestrictions['_nuts'] = isActive;
        break;
      case 'nightshade-free':
        newRestrictions['_nightshades'] = isActive;
        break;
      case 'low-fodmap':
        newRestrictions['_fodmap'] = isActive;
        break;
      case 'keto':
        ['Rice', 'Ancient Grains', 'Bread', 'Pasta', 'Starches'].forEach(k => {
          newRestrictions[`Grains:${k}`] = isActive;
        });
        newRestrictions['Condiments:Sweeteners'] = isActive;
        break;
    }

    onDietaryChange(newRestrictions);
  };

  // Count active filters
  const activeFilterCount = 
    (activeCategory ? 1 : 0) + 
    selectedSubcategories.length + 
    activeSliders.size + 
    Object.values(dietaryRestrictions).filter(v => v === false).length;

  const subcategories = SUBCATEGORIES[activeCategory] || [];

  // Mobile layout
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'white' }}
            onClick={onClose}
          />
        )}
        
        {/* Drawer */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
          {/* Pull Handle - only show when drawer is closed */}
          {!isOpen && (
            <div className="flex justify-center">
              <button
                onClick={onToggle}
                className="
                  relative -mb-1 px-10 pt-2.5 pb-3
                  bg-white rounded-t-2xl
                  border-2 border-gray-300 border-b-0
                  flex flex-col items-center
                  active:bg-gray-100 transition-colors
                "
              >
                <div className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
                <ChevronUp size={20} className="text-gray-500" strokeWidth={1.5} />
              </button>
            </div>
          )}

          {/* Drawer Content */}
          <div
            className={`
              bg-white overflow-hidden
              transition-all duration-300 ease-out
              rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)]
              ${isOpen ? 'h-[50vh]' : 'h-0'}
            `}
            style={{ maxHeight: '50vh' }}
          >
            <div className="flex flex-col h-full">
              {/* Search Bar */}
              <div className="flex-shrink-0 px-4 pt-3 pb-2">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search ingredients..."
                    className="
                      w-full pl-10 pr-10 py-3
                      rounded-xl border border-gray-200
                      focus:border-gray-400 focus:outline-none
                      text-base bg-gray-50
                    "
                    style={{ fontSize: '16px' }} // Prevents iOS zoom
                  />
                  {searchTerm && (
                    <button
                      onClick={() => onSearchChange('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    >
                      <X size={18} className="text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Suggested Ingredients Grid */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((ingredient) => {
                    const isSelected = selectedIngredients.includes(ingredient);
                    const color = getIngredientColor(ingredient);
                    
                    return (
                      <button
                        key={ingredient}
                        onClick={() => {
                          if (!isSelected) {
                            onIngredientSelect(ingredient);
                          }
                        }}
                        disabled={isSelected}
                        className={`
                          px-4 py-2.5
                          rounded-full font-semibold text-sm
                          transition-all duration-150 border-2
                          min-h-[44px]
                          ${isSelected 
                            ? 'opacity-30 cursor-not-allowed' 
                            : 'active:scale-95'
                          }
                        `}
                        style={{ 
                          color: isSelected ? '#d1d5db' : '#1f2937',
                          borderColor: isSelected ? '#e5e7eb' : color,
                          backgroundColor: 'white',
                        }}
                      >
                        {ingredient}
                      </button>
                    );
                  })}
                </div>
                
                {/* Empty States */}
                {suggestions.length === 0 && searchTerm && (
                  <div className="text-center py-8 text-gray-400">
                    No compatible ingredients found for "{searchTerm}"
                  </div>
                )}
                
                {suggestions.length === 0 && !searchTerm && (
                  <div className="text-center py-8 text-gray-400">
                    No more compatible ingredients available
                  </div>
                )}
              </div>

              {/* Filters Accordion */}
              <div className="flex-shrink-0 border-t border-gray-200">
                {/* Filter Header */}
                <button
                  onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                  className="
                    w-full flex items-center justify-between
                    px-4 py-3
                    active:bg-gray-50
                  "
                >
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-500" />
                    <span className="font-medium text-gray-700">Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <ChevronDown 
                    size={20} 
                    className={`text-gray-400 transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Filter Content */}
                <div 
                  className={`
                    overflow-hidden transition-all duration-300
                    ${isFiltersExpanded ? 'max-h-[300px]' : 'max-h-0'}
                  `}
                >
                  <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: '280px' }}>
                    {/* Tab Navigation */}
                    <div className="flex gap-1 mb-3 border-b border-gray-200">
                      {['categories', 'taste', 'dietary'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`
                            px-3 py-2 text-xs font-medium capitalize
                            border-b-2 transition-colors
                            ${activeTab === tab
                              ? 'border-[#72A8D5] text-[#72A8D5]'
                              : 'border-transparent text-gray-500'
                            }
                          `}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Categories Tab */}
                    {activeTab === 'categories' && (
                      <div className="space-y-2">
                        {!activeCategory ? (
                          <div className="flex flex-wrap gap-1.5">
                            {CATEGORIES.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => handleCategoryClick(cat)}
                                className="
                                  py-2 px-3 text-xs
                                  rounded-full border-2 border-gray-300
                                  bg-white text-gray-700 font-medium
                                  active:bg-gray-100
                                  min-h-[36px]
                                "
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleClearCategory}
                                className="p-1.5 rounded-full bg-gray-100"
                              >
                                <X size={14} className="text-gray-600" />
                              </button>
                              <span className="py-1.5 px-3 rounded-full border-2 border-[#72A8D5] bg-[#72A8D5] text-white font-medium text-xs">
                                {activeCategory}
                              </span>
                            </div>
                            {subcategories.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {subcategories.map((subcat) => {
                                  const isSelected = selectedSubcategories.includes(subcat);
                                  return (
                                    <button
                                      key={subcat}
                                      onClick={() => handleSubcategoryToggle(subcat)}
                                      className={`
                                        py-1.5 px-2.5 text-xs
                                        rounded-full border-2 font-medium
                                        ${isSelected
                                          ? 'border-[#72A8D5] bg-blue-50 text-[#72A8D5]'
                                          : 'border-gray-300 bg-white text-gray-700'
                                        }
                                      `}
                                    >
                                      {subcat}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Taste Tab */}
                    {activeTab === 'taste' && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {TASTE_PROPERTIES.map((taste) => {
                            const isActive = activeSliders.has(taste);
                            const color = TASTE_COLORS[taste];
                            return (
                              <button
                                key={taste}
                                onClick={() => handleTasteToggle(taste)}
                                className={`
                                  py-2 px-3 text-xs
                                  rounded-full border-2 font-medium capitalize
                                  min-h-[36px]
                                  ${isActive ? 'text-white' : 'bg-white text-gray-700 border-gray-300'}
                                `}
                                style={isActive ? { backgroundColor: color, borderColor: color } : {}}
                              >
                                {taste}
                              </button>
                            );
                          })}
                        </div>
                        {activeSliders.size > 0 && (
                          <div className="space-y-2 pt-2">
                            {Array.from(activeSliders).map((taste) => {
                              const color = TASTE_COLORS[taste];
                              return (
                                <div key={taste} className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-xs font-medium capitalize w-10">{taste}</span>
                                  <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={tasteValues[taste] || 0}
                                    onChange={(e) => onTasteChange({ ...tasteValues, [taste]: parseInt(e.target.value, 10) })}
                                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                                    style={{ accentColor: color }}
                                  />
                                  <span className="text-xs text-gray-500 w-5">{tasteValues[taste] || 0}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dietary Tab */}
                    {activeTab === 'dietary' && (
                      <div className="flex flex-wrap gap-1.5">
                        {DIETARY_TOGGLES.map((toggle) => {
                          const isActive = getDietaryState(toggle.key);
                          return (
                            <button
                              key={toggle.key}
                              onClick={() => handleDietaryToggle(toggle.key)}
                              className={`
                                py-2 px-3 text-xs
                                rounded-full border-2 font-medium
                                min-h-[36px]
                                ${isActive
                                  ? 'border-[#72A8D5] bg-[#72A8D5] text-white'
                                  : 'border-gray-300 bg-white text-gray-700'
                                }
                              `}
                            >
                              {toggle.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop layout (original)
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'white' }}
          onClick={onClose}
        />
      )}
      
      {/* Drawer - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Pull Handle - only show when drawer is closed */}
        {!isOpen && (
          <div className="flex justify-center">
            <button
              onClick={onToggle}
              className="
                relative -mb-1 px-12 pt-3 pb-4
                bg-white rounded-t-3xl
                border-2 border-gray-300 border-b-0
                flex flex-col items-center
                hover:border-gray-400 transition-colors
              "
            >
              <ChevronUp size={24} className="text-gray-500" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Drawer Content - Fixed height */}
        <div
          className={`
            bg-white overflow-hidden
            transition-all duration-300 ease-out
            rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)]
            ${isOpen ? 'h-[50vh]' : 'h-0'}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Main Content Area */}
            <div className="flex flex-1 min-h-0">
            {/* Left Side: Filter Panel */}
            <div className="w-[340px] flex-shrink-0 border-r border-gray-100 p-5 overflow-y-auto">
              {/* Tab Navigation */}
              <div className="flex gap-1 mb-4 border-b border-gray-200">
                {['categories', 'taste', 'dietary'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      px-3 py-2 text-sm font-medium capitalize
                      border-b-2 transition-colors
                      ${activeTab === tab
                        ? 'border-[#72A8D5] text-[#72A8D5]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                      }
                    `}
                  >
                    {tab === 'categories' ? 'Categories' : tab === 'taste' ? 'Taste' : 'Dietary'}
                  </button>
                ))}
              </div>

              {/* Categories Tab */}
              {activeTab === 'categories' && (
                <div className="space-y-3">
                  {!activeCategory ? (
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleCategoryClick(cat)}
                          className="
                            py-2.5 px-3 text-sm
                            rounded-full border-2 border-gray-300
                            bg-white text-gray-700 font-medium
                            hover:border-gray-400 hover:bg-gray-50
                            transition-all
                          "
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleClearCategory}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <X size={16} className="text-gray-600" />
                        </button>
                        <span className="py-2 px-4 rounded-full border-2 border-[#72A8D5] bg-[#72A8D5] text-white font-medium text-sm">
                          {activeCategory}
                        </span>
                      </div>
                      {subcategories.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-600 mb-2">Subcategories</h4>
                          <div className="grid grid-cols-2 gap-1.5">
                            {subcategories.map((subcat) => {
                              const isSelected = selectedSubcategories.includes(subcat);
                              return (
                                <button
                                  key={subcat}
                                  onClick={() => handleSubcategoryToggle(subcat)}
                                  className={`
                                    py-2 px-3 text-xs
                                    rounded-full border-2 font-medium
                                    transition-all truncate
                                    ${isSelected
                                      ? 'border-[#72A8D5] bg-blue-50 text-[#72A8D5]'
                                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                    }
                                  `}
                                >
                                  {subcat}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Taste Tab */}
              {activeTab === 'taste' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {TASTE_PROPERTIES.map((taste) => {
                      const isActive = activeSliders.has(taste);
                      const color = TASTE_COLORS[taste];
                      return (
                        <button
                          key={taste}
                          onClick={() => handleTasteToggle(taste)}
                          className={`
                            py-2.5 px-3 text-sm
                            rounded-full border-2 font-medium capitalize
                            transition-all
                            ${isActive ? 'text-white' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}
                          `}
                          style={isActive ? { backgroundColor: color, borderColor: color } : {}}
                        >
                          {taste}
                        </button>
                      );
                    })}
                  </div>
                  {activeSliders.size > 0 && (
                    <div className="space-y-2 pt-2">
                      {Array.from(activeSliders).map((taste) => {
                        const color = TASTE_COLORS[taste];
                        return (
                          <div key={taste} className="flex items-center gap-2">
                            <div 
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-xs font-medium capitalize w-12">{taste}</span>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              step="1"
                              value={tasteValues[taste] || 0}
                              onChange={(e) => onTasteChange({ ...tasteValues, [taste]: parseInt(e.target.value, 10) })}
                              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                              style={{ accentColor: color }}
                            />
                            <span className="text-xs text-gray-500 w-6">{tasteValues[taste] || 0}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Dietary Tab */}
              {activeTab === 'dietary' && (
                <div className="grid grid-cols-2 gap-2">
                  {DIETARY_TOGGLES.map((toggle) => {
                    const isActive = getDietaryState(toggle.key);
                    return (
                      <button
                        key={toggle.key}
                        onClick={() => handleDietaryToggle(toggle.key)}
                        className={`
                          py-2.5 px-3 text-sm
                          rounded-full border-2 font-medium
                          transition-all
                          ${isActive
                            ? 'border-[#72A8D5] bg-[#72A8D5] text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }
                        `}
                      >
                        {toggle.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Middle: Search + Ingredients */}
            <div className="flex-1 p-5 overflow-hidden flex flex-col border-r border-gray-100">
              {/* Search Bar */}
              <div className="relative mb-4 flex-shrink-0">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const availableSuggestions = suggestions.filter(
                        ing => !selectedIngredients.includes(ing)
                      );
                      if (availableSuggestions.length > 0) {
                        handleIngredientAdd(availableSuggestions[0]);
                        if (selectedIngredients.length < 5) {
                          onSearchChange('');
                        }
                      }
                    }
                  }}
                  placeholder="Search ingredients..."
                  className="
                    w-full pl-12 pr-10 py-3
                    rounded-full border-2 border-gray-200
                    focus:border-gray-400 focus:outline-none
                    text-base bg-gray-50
                  "
                />
                {searchTerm && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    <X size={20} className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Ingredients Grid */}
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-wrap gap-2.5 content-start">
                  {suggestions.map((ingredient) => {
                    const isSelected = selectedIngredients.includes(ingredient);
                    const color = getIngredientColor(ingredient);

                    return (
                      <button
                        key={ingredient}
                        onClick={() => {
                          if (!isSelected) {
                            handleIngredientAdd(ingredient);
                          }
                        }}
                        disabled={isSelected}
                        className={`
                          px-5 py-2.5
                          rounded-full font-semibold text-base
                          transition-all duration-150 border-2
                          ${isSelected
                            ? 'opacity-30 cursor-not-allowed'
                            : ''
                          }
                        `}
                        style={{
                          color: isSelected ? '#d1d5db' : '#1f2937',
                          borderColor: isSelected ? '#e5e7eb' : color,
                          backgroundColor: 'white',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = color;
                            e.currentTarget.style.color = 'white';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.color = '#1f2937';
                          }
                        }}
                      >
                        {ingredient}
                      </button>
                    );
                  })}
                </div>

                {/* Empty States */}
                {suggestions.length === 0 && searchTerm && (
                  <div className="text-center py-12 text-gray-400">
                    No compatible ingredients found for "{searchTerm}"
                  </div>
                )}

                {suggestions.length === 0 && !searchTerm && (
                  <div className="text-center py-12 text-gray-400">
                    No more compatible ingredients available
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Ingredient Info Panel */}
            <div className="w-[340px] flex-shrink-0 p-5 overflow-y-auto">
              {selectedIngredients.length > 0 ? (
                (() => {
                  const currentIngredient = selectedIngredients[selectedInfoIndex] || selectedIngredients[0];
                  const profile = getIngredientProfile(currentIngredient);
                  const tasteTags = getTasteTags(profile);
                  const ingredientColor = getIngredientColor(currentIngredient);

                  return (
                    <div className="flex flex-col h-full">
                      {/* Navigation Buttons */}
                      <div className="flex items-center gap-2 mb-4">
                        <button
                          onClick={() => setSelectedInfoIndex(Math.max(0, selectedInfoIndex - 1))}
                          disabled={selectedInfoIndex === 0}
                          className={`
                            w-8 h-8 rounded-full border-2 border-gray-300
                            flex items-center justify-center
                            transition-all
                            ${selectedInfoIndex === 0
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:border-gray-400 hover:bg-gray-50'
                            }
                          `}
                        >
                          <ChevronLeft size={18} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => setSelectedInfoIndex(Math.min(selectedIngredients.length - 1, selectedInfoIndex + 1))}
                          disabled={selectedInfoIndex >= selectedIngredients.length - 1}
                          className={`
                            w-8 h-8 rounded-full border-2 border-gray-300
                            flex items-center justify-center
                            transition-all
                            ${selectedInfoIndex >= selectedIngredients.length - 1
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:border-gray-400 hover:bg-gray-50'
                            }
                          `}
                        >
                          <ChevronRight size={18} className="text-gray-600" />
                        </button>
                      </div>

                      {/* Ingredient Name */}
                      <h2
                        className="text-2xl font-bold italic mb-1"
                        style={{ color: ingredientColor }}
                      >
                        {currentIngredient}
                      </h2>

                      {/* Category & Subcategory */}
                      {profile && (
                        <p className="text-sm text-gray-500 mb-4">
                          {profile.category.toLowerCase()}
                          {profile.subcategory && ` — ${profile.subcategory.toLowerCase()}`}
                        </p>
                      )}

                      {/* Description */}
                      {profile?.description && (
                        <p className="text-sm text-gray-700 leading-relaxed mb-6">
                          {profile.description}
                        </p>
                      )}

                      {/* Taste Tags */}
                      {tasteTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-auto">
                          {tasteTags.map((taste) => (
                            <span
                              key={taste}
                              className="px-4 py-1.5 rounded-full text-sm font-medium text-white capitalize"
                              style={{ backgroundColor: TASTE_COLORS[taste] }}
                            >
                              {taste}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  Select an ingredient to see details
                </div>
              )}
            </div>
            </div>

            {/* Max ingredients toast */}
            <div
              className={`
                fixed left-1/2 -translate-x-1/2 z-[60]
                px-6 py-3 bg-gray-900 text-white text-sm font-medium
                rounded-2xl shadow-lg
                transition-all duration-300 ease-out
                ${showMaxMessage
                  ? 'bottom-8 opacity-100'
                  : '-bottom-16 opacity-0'
                }
              `}
            >
              whoa pal — five ingredients max.
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default IngredientDrawer;
