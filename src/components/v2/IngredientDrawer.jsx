import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, X, Filter, Zap } from 'lucide-react';
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

const COMPATIBILITY_MODES = [
  { key: 'perfect', label: 'Perfect', description: 'Generated pairings include only perfect matches — each ingredient is a recommended pairing for one another.' },
  { key: 'mixed', label: 'Mixed', description: 'Each ingredient pairs with at least one other ingredient in the set, allowing for more creative combinations.' },
  { key: 'random', label: 'Random', description: 'Completely random ingredients with no pairing requirements — for adventurous cooks!' }
];

const getDesaturatedColor = (hexColor) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const mix = 0.7;
  const desatR = Math.round(r * (1 - mix) + 255 * mix);
  const desatG = Math.round(g * (1 - mix) + 255 * mix);
  const desatB = Math.round(b * (1 - mix) + 255 * mix);

  return `rgb(${desatR}, ${desatG}, ${desatB})`;
};

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
  // Compatibility props
  compatibilityMode = 'perfect',
  onCompatibilityChange = () => {},
  // Partial matches props
  showPartialMatches = false,
  onTogglePartialMatches = () => {},
  // Flavor map for pairing info
  flavorMap = null,
}) => {
  const inputRef = useRef(null);
  const drawerRef = useRef(null);
  const { isMobile, width } = useScreenSize();
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState('search'); // 'search' or 'generation'
  const [activeSearchTab, setActiveSearchTab] = useState('category'); // 'category' or 'taste'
  const [activeGenerationTab, setActiveGenerationTab] = useState('compatibility'); // 'compatibility' or 'dietary'
  const [selectedInfoIndex, setSelectedInfoIndex] = useState(0);
  const [showMaxMessage, setShowMaxMessage] = useState(false);
  const [hoveredIngredient, setHoveredIngredient] = useState(null);

  // Swipe to close state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50; // minimum swipe distance to trigger close

  // Handle swipe gestures for closing drawer
  const onTouchStart = (e) => {
    // Don't track swipe if touching the scrollable ingredients list
    if (e.target.closest('[data-ingredients-list]')) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e) => {
    if (!touchStart) return;
    // Don't track swipe if touching the scrollable ingredients list
    if (e.target.closest('[data-ingredients-list]')) return;
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchEnd - touchStart;
    const isDownSwipe = distance > minSwipeDistance;
    if (isDownSwipe && onClose) {
      onClose();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };
  const [isFiltersPanelCollapsed, setIsFiltersPanelCollapsed] = useState(false);
  const [sortMode, setSortMode] = useState('alphabetical'); // 'alphabetical' | 'category' | 'taste' | 'popularity'
  
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

  // Get ingredients that don't pair with the given ingredient
  const getNonPairingIngredients = (ingredient) => {
    if (!flavorMap || selectedIngredients.length <= 1) return [];

    const otherIngredients = selectedIngredients.filter(ing => ing !== ingredient);
    return otherIngredients.filter(other =>
      !flavorMap.get(ingredient)?.has(other)
    );
  };

  // Check if an ingredient is a partial match (pairs with some but not all selected ingredients)
  const isPartialMatch = (ingredient) => {
    if (!showPartialMatches || selectedIngredients.length === 0) return false;
    const matchCount = selectedIngredients.filter(selected =>
      flavorMap?.get(selected)?.has(ingredient)
    ).length;
    return matchCount > 0 && matchCount < selectedIngredients.length;
  };

  // Check if an ingredient pairs with the currently hovered ingredient
  const pairsWithHovered = (ingredient) => {
    if (!hoveredIngredient || !flavorMap || ingredient === hoveredIngredient) return false;
    return flavorMap.get(hoveredIngredient)?.has(ingredient) || false;
  };

  // Get primary (dominant) taste for an ingredient
  const getPrimaryTaste = (ingredient) => {
    const profile = ingredientProfiles.find(
      p => p.name.toLowerCase() === ingredient.toLowerCase()
    );
    if (!profile?.flavorProfile) return 'sweet'; // default

    let dominantTaste = 'sweet';
    let maxValue = -1;
    Object.entries(profile.flavorProfile).forEach(([taste, value]) => {
      if (value > maxValue) {
        maxValue = value;
        dominantTaste = taste;
      }
    });
    return dominantTaste;
  };

  // Get popularity score (number of pairings with other suggestions)
  const getPopularityScore = (ingredient) => {
    if (!flavorMap) return 0;
    // Count how many OTHER suggestions this ingredient pairs with
    const ingredientPairings = flavorMap.get(ingredient);
    if (!ingredientPairings) return 0;

    return suggestions.filter(other =>
      other !== ingredient && ingredientPairings.has(other)
    ).length;
  };

  // Get category for an ingredient
  const getCategory = (ingredient) => {
    const profile = ingredientProfiles.find(
      p => p.name.toLowerCase() === ingredient.toLowerCase()
    );
    return profile?.category || 'Other';
  };

  // Helper to check if ingredient is a partial match (for sorting purposes)
  const isPartialMatchForSort = (ingredient) => {
    if (!showPartialMatches || selectedIngredients.length === 0) return false;
    const matchCount = selectedIngredients.filter(selected =>
      flavorMap?.get(selected)?.has(ingredient)
    ).length;
    return matchCount > 0 && matchCount < selectedIngredients.length;
  };

  // Sort suggestions based on current sort mode
  // Returns array of { type: 'ingredient' | 'divider', value: string, label?: string }
  // Always shows full matches before partial matches
  const sortedSuggestionsWithDividers = useMemo(() => {
    const sorted = [...suggestions];

    // When partial matches are enabled, separate full matches from partial matches
    // Full matches should always come first
    const fullMatches = showPartialMatches
      ? sorted.filter(ing => !isPartialMatchForSort(ing))
      : sorted;
    const partialMatches = showPartialMatches
      ? sorted.filter(ing => isPartialMatchForSort(ing))
      : [];

    switch (sortMode) {
      case 'alphabetical': {
        const sortAlpha = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());
        const sortedFull = fullMatches.sort(sortAlpha).map(ing => ({ type: 'ingredient', value: ing }));
        const sortedPartial = partialMatches.sort(sortAlpha).map(ing => ({ type: 'ingredient', value: ing }));
        return [...sortedFull, ...sortedPartial];
      }

      case 'category': {
        // Group by category, then alphabetically within each category
        const categoryOrder = ['Proteins', 'Vegetables', 'Fruits', 'Seasonings', 'Dairy', 'Grains', 'Liquids', 'Condiments', 'Alcohol'];
        const sortByCategory = (a, b) => {
          const catA = getCategory(a);
          const catB = getCategory(b);
          const indexA = categoryOrder.indexOf(catA);
          const indexB = categoryOrder.indexOf(catB);
          const orderA = indexA === -1 ? 999 : indexA;
          const orderB = indexB === -1 ? 999 : indexB;

          if (orderA !== orderB) return orderA - orderB;
          return a.toLowerCase().localeCompare(b.toLowerCase());
        };

        const sortedFullList = [...fullMatches].sort(sortByCategory);
        const sortedPartialList = [...partialMatches].sort(sortByCategory);

        // Insert dividers between categories
        const addDividers = (list, isPartial = false) => {
          const result = [];
          let lastCategory = null;
          for (const ing of list) {
            const category = getCategory(ing);
            if (category !== lastCategory) {
              result.push({ type: 'divider', value: `category-${isPartial ? 'partial-' : ''}${category}`, label: category });
              lastCategory = category;
            }
            result.push({ type: 'ingredient', value: ing });
          }
          return result;
        };

        return [...addDividers(sortedFullList, false), ...addDividers(sortedPartialList, true)];
      }

      case 'taste': {
        // Group by primary taste, then alphabetically within each taste
        const tasteOrder = ['sweet', 'salty', 'sour', 'bitter', 'umami', 'fat', 'spicy'];
        const sortByTaste = (a, b) => {
          const tasteA = getPrimaryTaste(a);
          const tasteB = getPrimaryTaste(b);
          const indexA = tasteOrder.indexOf(tasteA);
          const indexB = tasteOrder.indexOf(tasteB);

          if (indexA !== indexB) return indexA - indexB;
          return a.toLowerCase().localeCompare(b.toLowerCase());
        };

        const sortedFullList = [...fullMatches].sort(sortByTaste);
        const sortedPartialList = [...partialMatches].sort(sortByTaste);

        // Insert dividers between tastes
        const addDividers = (list, isPartial = false) => {
          const result = [];
          let lastTaste = null;
          for (const ing of list) {
            const taste = getPrimaryTaste(ing);
            if (taste !== lastTaste) {
              result.push({ type: 'divider', value: `taste-${isPartial ? 'partial-' : ''}${taste}`, label: taste, color: TASTE_COLORS[taste] });
              lastTaste = taste;
            }
            result.push({ type: 'ingredient', value: ing });
          }
          return result;
        };

        return [...addDividers(sortedFullList, false), ...addDividers(sortedPartialList, true)];
      }

      case 'popularity': {
        // Sort by number of pairings with other suggestions (descending)
        const sortByPopularity = (a, b) => {
          const popA = getPopularityScore(a);
          const popB = getPopularityScore(b);
          if (popB !== popA) return popB - popA; // descending
          return a.toLowerCase().localeCompare(b.toLowerCase());
        };
        const sortedFull = [...fullMatches].sort(sortByPopularity).map(ing => ({ type: 'ingredient', value: ing }));
        const sortedPartial = [...partialMatches].sort(sortByPopularity).map(ing => ({ type: 'ingredient', value: ing }));
        return [...sortedFull, ...sortedPartial];
      }

      default:
        return [...fullMatches, ...partialMatches].map(ing => ({ type: 'ingredient', value: ing }));
    }
  }, [suggestions, sortMode, ingredientProfiles, flavorMap, showPartialMatches, selectedIngredients]);

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

  // Generate slider thumb styles
  const sliderStyles = TASTE_PROPERTIES.map(taste => `
    .taste-slider-${taste}::-webkit-slider-thumb {
      appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: ${TASTE_COLORS[taste]};
      border: 1px solid black;
      cursor: pointer;
    }
    .taste-slider-${taste}::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: ${TASTE_COLORS[taste]};
      border: 1px solid black;
      cursor: pointer;
    }
  `).join('\n');

  // Hide scrollbar CSS for webkit browsers
  const scrollbarHideStyles = `
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
  `;

  // Mobile layout
  if (isMobile) {
    return (
      <>
        <style>{sliderStyles}{scrollbarHideStyles}</style>
        {/* Drawer - positioned below ingredient strip and above bottom bar */}
        <div
          ref={drawerRef}
          className={`
            fixed left-0 right-0 z-[55]
            bg-white overflow-hidden
            rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)]
          `}
          style={{
            bottom: '68px', // Height of bottom bar (py-3 = 24px + h-12 button = 48px + border)
            top: isOpen ? '120px' : '100%', // Below header (56px) + ingredient strip (~64px)
            transition: 'top 300ms ease-out',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
            <div className="flex flex-col h-full">
              {/* Search Bar with Partial Matches Toggle */}
              <div className="flex-shrink-0 px-4 pt-3 pb-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
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
                  {/* Show Partial Matches Button */}
                  <button
                    onClick={onTogglePartialMatches}
                    title={showPartialMatches ? "Showing partial matches" : "Show partial matches"}
                    className={`
                      p-3
                      rounded-xl
                      border-2 border-dashed
                      transition-all
                      min-h-[44px]
                      ${showPartialMatches
                        ? 'text-gray-800 border-[#FFC533] bg-amber-50'
                        : 'text-gray-400 border-gray-300'
                      }
                    `}
                  >
                    <Zap size={18} />
                  </button>
                </div>
              </div>

              {/* Filter Section with Tabs */}
              <div className="flex-shrink-0 border-b border-gray-200">
                {/* Filter Type Tabs */}
                <div className="flex gap-4 px-4 pt-2 pb-1">
                  <button
                    onClick={() => setActiveSearchTab('category')}
                    className={`
                      text-sm font-medium transition-colors
                      ${activeSearchTab === 'category' ? 'text-gray-900' : 'text-gray-400'}
                    `}
                  >
                    Category
                  </button>
                  <button
                    onClick={() => setActiveSearchTab('taste')}
                    className={`
                      text-sm font-medium transition-colors
                      ${activeSearchTab === 'taste' ? 'text-gray-900' : 'text-gray-400'}
                    `}
                  >
                    Taste
                  </button>
                </div>

                {/* Filter Pills */}
                <div className="px-4 py-2">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {activeSearchTab === 'category' ? (
                      CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => handleCategoryClick(cat)}
                            className={`
                              py-1.5 px-3 text-sm
                              rounded-full border-2 font-medium
                              whitespace-nowrap flex-shrink-0
                              transition-all
                              ${isActive
                                ? 'border-[#72A8D5] bg-[#72A8D5] text-white'
                                : 'border-gray-300 bg-white text-gray-700'
                              }
                            `}
                          >
                            {cat}
                          </button>
                        );
                      })
                    ) : (
                      TASTE_PROPERTIES.map((taste) => {
                        const isActive = activeSliders.has(taste);
                        const color = TASTE_COLORS[taste];
                        return (
                          <button
                            key={taste}
                            onClick={() => handleTasteToggle(taste)}
                            className={`
                              py-1.5 px-3 text-sm
                              rounded-full border-2 font-medium capitalize
                              whitespace-nowrap flex-shrink-0
                              transition-all
                              ${isActive ? 'text-white' : 'bg-white text-gray-700 border-gray-300'}
                            `}
                            style={isActive ? { backgroundColor: color, borderColor: color } : {}}
                          >
                            {taste}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Subcategory Pills (when category selected) */}
                {activeSearchTab === 'category' && activeCategory && subcategories.length > 0 && (
                  <div className="px-4 pb-2">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      {subcategories.map((subcat) => {
                        const isSelected = selectedSubcategories.includes(subcat);
                        return (
                          <button
                            key={subcat}
                            onClick={() => handleSubcategoryToggle(subcat)}
                            className={`
                              py-1 px-2.5 text-xs
                              rounded-full border-2 font-medium
                              whitespace-nowrap flex-shrink-0
                              transition-all
                              ${isSelected
                                ? 'border-[#72A8D5] bg-blue-50 text-[#72A8D5]'
                                : 'border-gray-300 bg-white text-gray-600'
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

                {/* Taste Sliders (when tastes selected) */}
                {activeSearchTab === 'taste' && activeSliders.size > 0 && (
                  <div className="px-4 pb-2 space-y-2">
                    {Array.from(activeSliders).map((taste) => {
                      const color = TASTE_COLORS[taste];
                      return (
                        <div key={taste} className="flex items-center gap-3">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs font-medium capitalize w-10">{taste}</span>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={tasteValues[taste] || 1}
                            onChange={(e) => onTasteChange({ ...tasteValues, [taste]: parseInt(e.target.value, 10) })}
                            className={`flex-1 h-1.5 rounded-full appearance-none cursor-pointer taste-slider-${taste}`}
                            style={{
                              background: `linear-gradient(to right, ${color} 0%, ${color} ${((tasteValues[taste] || 1) - 1) * 11.11}%, ${getDesaturatedColor(color)} ${((tasteValues[taste] || 1) - 1) * 11.11}%, ${getDesaturatedColor(color)} 100%)`
                            }}
                          />
                          <span className="text-xs text-gray-500 w-4">{tasteValues[taste] || 1}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sort Tabs (Mobile) */}
              <div className="flex gap-4 px-4 py-2 flex-shrink-0 overflow-x-auto border-b border-gray-100" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {[
                  { key: 'alphabetical', label: 'Alphabetical' },
                  { key: 'category', label: 'Category' },
                  { key: 'taste', label: 'Taste' },
                  { key: 'popularity', label: 'Popularity' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortMode(key)}
                    className={`
                      text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0
                      ${sortMode === key
                        ? 'text-gray-900'
                        : 'text-gray-400'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Suggested Ingredients Grid - fills remaining space */}
              <div data-ingredients-list className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
                <div className="flex flex-wrap gap-2.5">
                  {sortedSuggestionsWithDividers.map((item) => {
                    if (item.type === 'divider') {
                      return (
                        <div
                          key={item.value}
                          className="w-full flex items-center gap-2 py-2 first:pt-0"
                        >
                          <span
                            className="text-sm font-semibold capitalize"
                            style={{ color: item.color || '#6b7280' }}
                          >
                            {item.label}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      );
                    }

                    const ingredient = item.value;
                    const isSelected = selectedIngredients.includes(ingredient);
                    const color = getIngredientColor(ingredient);
                    const partial = isPartialMatch(ingredient);

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
                          px-5 py-3
                          rounded-full font-semibold text-base
                          transition-all duration-150
                          min-h-[48px]
                          ${isSelected
                            ? 'opacity-30 cursor-not-allowed'
                            : 'active:scale-95'
                          }
                        `}
                        style={{
                          color: isSelected ? '#d1d5db' : '#1f2937',
                          border: `2px ${partial ? 'dashed' : 'solid'} ${isSelected ? '#e5e7eb' : color}`,
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
            </div>
          </div>
      </>
    );
  }

  // Desktop layout
  return (
    <>
      <style>{sliderStyles}</style>
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
            <div
              className={`
                flex-shrink-0 border-r border-gray-100 overflow-y-auto overflow-x-hidden
                transition-all duration-300 ease-out
                ${isFiltersPanelCollapsed ? 'w-0 p-0' : 'w-[340px] p-5'}
              `}
            >
              {/* Top-level Section Navigation */}
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setActiveSection('search')}
                  className={`
                    text-sm font-semibold transition-colors
                    ${activeSection === 'search'
                      ? 'text-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                    }
                  `}
                >
                  Search Filters
                </button>
                <button
                  onClick={() => setActiveSection('generation')}
                  className={`
                    text-sm font-semibold transition-colors
                    ${activeSection === 'generation'
                      ? 'text-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                    }
                  `}
                >
                  Generation Options
                </button>
              </div>

              {/* Search Filters Section */}
              {activeSection === 'search' && (
                <>
                  {/* Sub-tabs for Category and Taste */}
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => setActiveSearchTab('category')}
                      className={`
                        text-sm font-medium transition-colors
                        ${activeSearchTab === 'category'
                          ? 'text-gray-700'
                          : 'text-gray-400 hover:text-gray-500'
                        }
                      `}
                    >
                      Category
                    </button>
                    <button
                      onClick={() => setActiveSearchTab('taste')}
                      className={`
                        text-sm font-medium transition-colors
                        ${activeSearchTab === 'taste'
                          ? 'text-gray-700'
                          : 'text-gray-400 hover:text-gray-500'
                        }
                      `}
                    >
                      Taste
                    </button>
                  </div>

                  {/* Category Content */}
                  {activeSearchTab === 'category' && (
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

                  {/* Taste Content */}
                  {activeSearchTab === 'taste' && (
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
                                  value={tasteValues[taste] || 1}
                                  onChange={(e) => onTasteChange({ ...tasteValues, [taste]: parseInt(e.target.value, 10) })}
                                  className={`flex-1 h-1.5 rounded-full appearance-none cursor-pointer taste-slider-${taste}`}
                                  style={{
                                    background: `linear-gradient(to right, ${color} 0%, ${color} ${((tasteValues[taste] || 1) - 1) * 11.11}%, ${getDesaturatedColor(color)} ${((tasteValues[taste] || 1) - 1) * 11.11}%, ${getDesaturatedColor(color)} 100%)`
                                  }}
                                />
                                <span className="text-xs text-gray-500 w-6">{tasteValues[taste] || 1}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Generation Options Section */}
              {activeSection === 'generation' && (
                <>
                  {/* Sub-tabs for Compatibility and Dietary */}
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => setActiveGenerationTab('compatibility')}
                      className={`
                        text-sm font-medium transition-colors
                        ${activeGenerationTab === 'compatibility'
                          ? 'text-gray-700'
                          : 'text-gray-400 hover:text-gray-500'
                        }
                      `}
                    >
                      Compatibility
                    </button>
                    <button
                      onClick={() => setActiveGenerationTab('dietary')}
                      className={`
                        text-sm font-medium transition-colors
                        ${activeGenerationTab === 'dietary'
                          ? 'text-gray-700'
                          : 'text-gray-400 hover:text-gray-500'
                        }
                      `}
                    >
                      Dietary
                    </button>
                  </div>

                  {/* Compatibility Content */}
                  {activeGenerationTab === 'compatibility' && (
                    <div className="space-y-4">
                      <div className="relative inline-grid grid-cols-3 bg-gray-100 rounded-full p-1">
                        {/* Sliding background indicator */}
                        <div
                          className="absolute top-1 bottom-1 bg-gray-900 rounded-full transition-all duration-200 ease-out"
                          style={{
                            width: 'calc(33.333% - 2px)',
                            left: `calc(${COMPATIBILITY_MODES.findIndex(m => m.key === compatibilityMode) * 33.333}% + 1px)`,
                          }}
                        />
                        {COMPATIBILITY_MODES.map((mode) => (
                          <button
                            key={mode.key}
                            onClick={() => onCompatibilityChange(mode.key)}
                            className={`
                              relative z-10 py-2.5 px-5 text-sm font-medium text-center
                              rounded-full transition-colors duration-200
                              ${compatibilityMode === mode.key
                                ? 'text-white'
                                : 'text-gray-600 hover:text-gray-800'
                              }
                            `}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        {COMPATIBILITY_MODES.find(m => m.key === compatibilityMode)?.description}
                      </p>
                    </div>
                  )}

                  {/* Dietary Content */}
                  {activeGenerationTab === 'dietary' && (
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
                </>
              )}
            </div>

            {/* Filter Panel Toggle Button */}
            <button
              onClick={() => setIsFiltersPanelCollapsed(!isFiltersPanelCollapsed)}
              className="
                flex-shrink-0 w-6
                flex items-center justify-center
                border-r border-gray-100
                hover:bg-gray-50 transition-colors
                text-gray-400 hover:text-gray-600
              "
              aria-label={isFiltersPanelCollapsed ? "Show filters" : "Hide filters"}
            >
              <ChevronLeft
                size={18}
                className={`transition-transform duration-300 ${isFiltersPanelCollapsed ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Middle: Search + Ingredients */}
            <div className="flex-1 p-5 overflow-hidden flex flex-col border-r border-gray-100">
              {/* Search Bar with Partial Matches Toggle */}
              <div className="flex gap-3 mb-4 flex-shrink-0">
                <div className="relative flex-1">
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
                {/* Show Partial Matches Button */}
                <button
                  onClick={onTogglePartialMatches}
                  title={showPartialMatches ? "Showing partial matches" : "Show partial matches"}
                  className={`
                    px-4 py-3
                    rounded-full
                    border-2 border-dashed
                    transition-all
                    flex items-center gap-2
                    whitespace-nowrap
                    ${showPartialMatches
                      ? 'text-gray-800 border-[#FFC533] bg-amber-50'
                      : 'text-gray-400 border-gray-300 hover:border-[#FFC533] hover:text-gray-600'
                    }
                  `}
                >
                  <Zap size={18} />
                  <span className="text-sm font-medium">Partial</span>
                </button>
              </div>

              {/* Sort Tabs */}
              <div className="flex gap-6 mb-4 flex-shrink-0">
                {[
                  { key: 'alphabetical', label: 'Alphabetical' },
                  { key: 'category', label: 'Category' },
                  { key: 'taste', label: 'Taste' },
                  { key: 'popularity', label: 'Popularity' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortMode(key)}
                    className={`
                      text-sm font-medium transition-colors
                      ${sortMode === key
                        ? 'text-gray-900'
                        : 'text-gray-400 hover:text-gray-600'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Ingredients Grid */}
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-wrap gap-2.5 content-start">
                  {sortedSuggestionsWithDividers.map((item) => {
                    if (item.type === 'divider') {
                      return (
                        <div
                          key={item.value}
                          className="w-full flex items-center gap-2 py-1.5 first:pt-0"
                        >
                          <span
                            className="text-sm font-semibold capitalize"
                            style={{ color: item.color || '#6b7280' }}
                          >
                            {item.label}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      );
                    }

                    const ingredient = item.value;
                    const isSelected = selectedIngredients.includes(ingredient);
                    const color = getIngredientColor(ingredient);
                    const partial = isPartialMatch(ingredient);
                    const isPairingHighlight = pairsWithHovered(ingredient);
                    const isHovered = hoveredIngredient === ingredient;

                    // Convert hex to rgba for fill
                    const hexToRgba = (hex, alpha) => {
                      const r = parseInt(hex.slice(1, 3), 16);
                      const g = parseInt(hex.slice(3, 5), 16);
                      const b = parseInt(hex.slice(5, 7), 16);
                      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                    };

                    // Determine background color based on state
                    let bgColor = 'white';
                    let textColor = '#1f2937';
                    if (isSelected) {
                      bgColor = 'white';
                      textColor = '#d1d5db';
                    } else if (isHovered) {
                      bgColor = color;
                      textColor = 'white';
                    } else if (isPairingHighlight) {
                      bgColor = hexToRgba(color, 0.15);
                      textColor = '#1f2937';
                    }

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
                          transition-all duration-150
                          ${isSelected
                            ? 'opacity-30 cursor-not-allowed'
                            : ''
                          }
                        `}
                        style={{
                          color: textColor,
                          border: `2px ${partial ? 'dashed' : 'solid'} ${isSelected ? '#e5e7eb' : color}`,
                          backgroundColor: bgColor,
                        }}
                        onMouseEnter={() => {
                          if (!isSelected) {
                            setHoveredIngredient(ingredient);
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredIngredient(null);
                        }}
                        title={partial ? 'Partial match - pairs with some selected ingredients' : undefined}
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
                  const nonPairingIngredients = getNonPairingIngredients(currentIngredient);

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
                        className="text-2xl italic mb-1"
                        style={{
                          color: ingredientColor,
                          fontWeight: nonPairingIngredients.length > 0 ? 400 : 700
                        }}
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
                        <p className="text-sm text-gray-700 leading-relaxed mb-4">
                          {profile.description}
                        </p>
                      )}

                      {/* Non-pairing warning */}
                      {nonPairingIngredients.length > 0 && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-800">
                            <span className="font-medium">Not a suggested pairing with: </span>
                            {nonPairingIngredients.join(', ')}
                          </p>
                        </div>
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
