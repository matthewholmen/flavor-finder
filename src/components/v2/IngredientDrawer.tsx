import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Search, X, Filter, Zap, Undo2, ArrowRight, Waypoints } from 'lucide-react';
import { TASTE_COLORS, getIngredientColorWithContrast } from '../../utils/colors.ts';
import { categoryLabel } from '../../utils/categoryLabels.ts';
import { CATEGORY_ICONS } from '../../utils/categoryIcons.ts';
import { useScreenSize } from '../../hooks/useScreenSize.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { Slider, IngredientTile, IconButton } from './ui/index.ts';

// Filter constants
const CATEGORIES = [
  'Proteins', 'Vegetables', 'Fruits', 'Dairy',
  'Seasonings', 'Pantry', 'Grains', 'Alcohol'
];

const SUBCATEGORIES = {
  Proteins: ["Meat", "Poultry", "Seafood", "Eggs", "Beans & Legumes", "Nuts & Seeds", "Soy & Plant-Based"],
  Vegetables: ["Allium", "Leafy Greens", "Roots & Tubers", "Squash", "Brassicas", "Mushrooms", "Stalks", "Fruit Vegetables"],
  Fruits: ["Citrus", "Stone Fruit", "Tropical", "Berries", "Pome Fruit", "Melons"],
  Dairy: ["Cheese", "Cultured", "Milk & Cream", "Custards & Frozen"],
  Seasonings: ["Herbs", "Spices", "Spice Blends", "Chilis", "Salts"],
  Pantry: ["Fats & Oils", "Vinegars", "Sweeteners", "Sauces & Condiments", "Stocks & Bases"],
  Grains: ["Rice", "Pasta", "Bread", "Whole Grains", "Corn", "Starches"],
  Alcohol: ["Wine", "Beer & Cider", "Spirits", "Liqueurs"]
};

const TASTE_PROPERTIES = ['sweet', 'salty', 'sour', 'umami', 'fat', 'spicy', 'aromatic'];

export const IngredientDrawer = ({
  isOpen,
  onToggle,
  onClose,
  onOpen = () => {},
  onUndo = () => {},
  canUndo = false,
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
  // Bottom-bar map entry: opens the Graph Explorer seeded with the current combo.
  // Rendered only while the drawer is closed (the "Partial" toggle takes that seat
  // while browsing); disabled when the combo is empty.
  onOpenMap = null,
  canOpenMap = false,
  // Side info panel focus, controlled by the parent so that actions outside the
  // drawer (e.g. locking an ingredient) can focus it in the info panel too.
  selectedInfoIndex = 0,
  onInfoIndexChange = () => {},
  // Opens the flavor map centered on an ingredient (the app's info view) from the
  // info panel.
  onOpenInfo = null,
}) => {
  const inputRef = useRef(null);
  const drawerRef = useRef(null);
  const { isMobile, width } = useScreenSize();
  const { isHighContrast, isDarkMode } = useTheme(); // Force re-render when high contrast changes
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [activeSearchTab, setActiveSearchTab] = useState('category'); // 'category' or 'taste'
  const setSelectedInfoIndex = onInfoIndexChange;
  const [showMaxMessage, setShowMaxMessage] = useState(false);
  const [hoveredIngredient, setHoveredIngredient] = useState(null);

  // Swipe to close state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const minSwipeDistance = 50; // minimum swipe distance to trigger close

  // Handle swipe gestures for closing drawer
  const onTouchStart = (e) => {
    // Don't track swipe if touching the scrollable ingredients list
    if (e.target.closest('[data-ingredients-list]')) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
    setIsDragging(true);
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
    setIsDragging(false);
  };
  const [isFiltersPanelCollapsed, setIsFiltersPanelCollapsed] = useState(true);
  const [sortMode, setSortMode] = useState('alphabetical'); // 'alphabetical' | 'category' | 'taste' | 'popularity'
  const [isMobileFiltersVisible, setIsMobileFiltersVisible] = useState(false);

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
      setIsMobileFiltersVisible(false);
    }
  }, [isOpen]);

  // Keep selectedInfoIndex in bounds when ingredients change
  useEffect(() => {
    if (selectedIngredients.length > 0 && selectedInfoIndex >= selectedIngredients.length) {
      setSelectedInfoIndex(selectedIngredients.length - 1);
    }
  }, [selectedIngredients, selectedInfoIndex]);

  // Get the raw taste color for an ingredient (not adjusted for high contrast)
  const getIngredientColorRaw = (ingredient) => {
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

  // Get ingredient color with high contrast adjustment (for text/fills)
  const getIngredientColor = (ingredient) => {
    const baseColor = getIngredientColorRaw(ingredient);
    return getIngredientColorWithContrast(baseColor, isHighContrast, isDarkMode);
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

  // Check if an ingredient is NOT a perfect match (doesn't pair with every selected
  // ingredient). Used for the dashed-border treatment so users always see which
  // suggestions aren't recommended pairings - regardless of the Partial toggle.
  const isPartialMatch = (ingredient) => {
    if (selectedIngredients.length === 0) return false;
    return !selectedIngredients.every(selected =>
      flavorMap?.get(selected)?.has(ingredient)
    );
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

    // Helper to add partial-button marker between full and partial matches
    const addPartialButtonMarker = (fullList, partialList) => {
      const result = [...fullList];
      // Only add the marker if we have selected ingredients (partial matches are possible)
      if (selectedIngredients.length > 0) {
        result.push({ type: 'partial-button', value: 'partial-button' });
      }
      if (showPartialMatches) {
        result.push(...partialList);
      }
      return result;
    };

    switch (sortMode) {
      case 'alphabetical': {
        const sortAlpha = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());
        const sortedFull = fullMatches.sort(sortAlpha).map(ing => ({ type: 'ingredient', value: ing }));
        const sortedPartial = partialMatches.sort(sortAlpha).map(ing => ({ type: 'ingredient', value: ing }));
        return addPartialButtonMarker(sortedFull, sortedPartial);
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
              result.push({ type: 'divider', value: `category-${isPartial ? 'partial-' : ''}${category}`, label: categoryLabel(category) });
              lastCategory = category;
            }
            result.push({ type: 'ingredient', value: ing });
          }
          return result;
        };

        return addPartialButtonMarker(addDividers(sortedFullList, false), addDividers(sortedPartialList, true));
      }

      case 'taste': {
        // Group by primary taste, then alphabetically within each taste
        const tasteOrder = ['sweet', 'salty', 'sour', 'umami', 'fat', 'spicy', 'aromatic'];
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

        return addPartialButtonMarker(addDividers(sortedFullList, false), addDividers(sortedPartialList, true));
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
        return addPartialButtonMarker(sortedFull, sortedPartial);
      }

      default:
        return addPartialButtonMarker(
          fullMatches.map(ing => ({ type: 'ingredient', value: ing })),
          partialMatches.map(ing => ({ type: 'ingredient', value: ing }))
        );
    }
  }, [suggestions, sortMode, ingredientProfiles, flavorMap, showPartialMatches, selectedIngredients]);

  const handleIngredientAdd = (ingredient) => {
    if (selectedIngredients.length >= 5) {
      setShowMaxMessage(true);
      setTimeout(() => setShowMaxMessage(false), 2000);
      return;
    }
    // Focus the just-added ingredient in the right-hand info panel. The new
    // ingredient is appended, so its index is the current (pre-add) length.
    setSelectedInfoIndex(selectedIngredients.length);
    onIngredientSelect(ingredient);
    // Keep the search bar focused so you can tap an ingredient and immediately
    // keep typing to pull up the next one (clicking the button steals focus).
    requestAnimationFrame(() => inputRef.current?.focus());
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

  // Count active filters
  const activeFilterCount = 
    (activeCategory ? 1 : 0) + 
    selectedSubcategories.length + 
    activeSliders.size + 
    Object.values(dietaryRestrictions).filter(v => v === false).length;

  const subcategories = SUBCATEGORIES[activeCategory] || [];

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
        <style>{scrollbarHideStyles}</style>
        {/* Backdrop - closes drawer when tapped (only covers drawer area, not ingredient display) */}
        {isOpen && (
          <div
            className="fixed left-0 right-0 z-[54]"
            style={{ top: '140px', bottom: 'calc(68px + env(safe-area-inset-bottom))' }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}
        {/* Drawer - positioned below ingredient strip and above bottom bar */}
        <div
          ref={drawerRef}
          className={`
            fixed left-0 right-0 z-[55]
            bg-white dark:bg-gray-900 overflow-hidden
            rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)]
            transition-colors duration-300
          `}
          style={{
            // Sit above the bottom bar, including its safe-area padding so the
            // drawer never tucks behind the home indicator on notched phones.
            bottom: 'calc(68px + env(safe-area-inset-bottom))',
            top: isOpen ? '140px' : '100%', // Below header (56px) + ingredient strip (~84px)
            transition: isDragging ? 'none' : 'top 300ms ease-out, transform 300ms ease-out',
            transform: touchStart && touchEnd && touchEnd > touchStart
              ? `translateY(${Math.max(0, touchEnd - touchStart)}px)`
              : 'translateY(0)',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
            <div className="flex flex-col h-full">
              {/* Search Bar with Filters Toggle - at the top */}
              <div className="flex-shrink-0 px-4 pt-3 pb-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
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
                      placeholder="Search ingredients…"
                      className="
                        w-full pl-10 pr-10 py-3
                        rounded-full border-2 border-gray-300 dark:border-gray-600
                        focus:border-gray-900 dark:focus:border-white focus:outline-none
                        text-base bg-white dark:bg-gray-800
                        text-gray-900 dark:text-gray-100
                        placeholder-gray-400 dark:placeholder-gray-500
                        transition-colors
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
                  {/* Filters Toggle Button */}
                  <button
                    onClick={() => setIsMobileFiltersVisible(!isMobileFiltersVisible)}
                    title={isMobileFiltersVisible ? "Hide filters" : "Show filters"}
                    className={`
                      p-3
                      rounded-xl
                      border-2
                      transition-all
                      min-h-[44px]
                      ${isMobileFiltersVisible || activeFilterCount > 0
                        ? 'text-gray-800 dark:text-gray-100 border-gray-800 dark:border-gray-100 bg-gray-100 dark:bg-gray-800'
                        : 'text-gray-400 border-gray-300 dark:border-gray-600'
                      }
                    `}
                  >
                    <Filter size={18} />
                  </button>
                </div>
              </div>

              {/* Collapsible Filter Section - appears below search bar */}
              <div
                className={`
                  flex-shrink-0 border-b border-gray-200 dark:border-gray-700
                  overflow-hidden transition-all duration-300 ease-out
                `}
                style={{
                  maxHeight: isMobileFiltersVisible ? '300px' : '0px',
                  opacity: isMobileFiltersVisible ? 1 : 0,
                }}
              >
                {/* Filter Type Tabs */}
                <div className="flex gap-4 px-4 pt-2 pb-1">
                  <button
                    onClick={() => setActiveSearchTab('category')}
                    className={`
                      text-sm font-medium transition-colors
                      ${activeSearchTab === 'category' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}
                    `}
                  >
                    Category
                  </button>
                  <button
                    onClick={() => setActiveSearchTab('taste')}
                    className={`
                      text-sm font-medium transition-colors
                      ${activeSearchTab === 'taste' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}
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
                        const CatIcon = CATEGORY_ICONS[cat];
                        return (
                          <button
                            key={cat}
                            onClick={() => handleCategoryClick(cat)}
                            className={`
                              py-1.5 px-3 text-sm
                              rounded-full border-2 font-medium
                              whitespace-nowrap flex-shrink-0
                              inline-flex items-center gap-1.5
                              transition-all
                              ${isActive
                                ? 'border-[#6AAFE8] bg-[#6AAFE8] text-white'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                              }
                            `}
                          >
                            {CatIcon && <CatIcon size={14} strokeWidth={2.25} className="shrink-0 opacity-80" />}
                            {categoryLabel(cat)}
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
                              ${isActive ? 'text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}
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
                                ? 'border-[#6AAFE8] bg-blue-50 dark:bg-blue-900/30 text-[#6AAFE8]'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
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
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            accent={color}
                            value={tasteValues[taste] || 1}
                            onChange={(v) => onTasteChange({ ...tasteValues, [taste]: v })}
                            aria-label={`${taste} minimum`}
                            className="flex-1"
                          />
                          <span className="text-xs text-gray-500 w-4">{tasteValues[taste] || 1}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sort Tabs (Mobile) */}
              <div className="flex gap-4 px-4 pt-3 pb-2 flex-shrink-0 overflow-x-auto border-b border-gray-100 dark:border-gray-800" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-400 dark:text-gray-500'
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
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </div>
                      );
                    }

                    if (item.type === 'partial-button') {
                      return (
                        <button
                          key="partial-button"
                          onClick={onTogglePartialMatches}
                          title={showPartialMatches ? "Showing partial matches" : "Show partial matches"}
                          className={`
                            w-full
                            px-5 py-3
                            rounded-full font-semibold text-base
                            transition-all duration-150
                            min-h-[48px]
                            flex items-center justify-center gap-2
                            border-2 border-dashed
                            ${showPartialMatches
                              ? 'text-gray-800 dark:text-gray-100 border-[#FFC233] bg-amber-50 dark:bg-amber-900/30'
                              : 'text-gray-400 border-gray-300 dark:border-gray-600'
                            }
                          `}
                        >
                          <Zap size={18} />
                          <span>Show Partial Matches</span>
                        </button>
                      );
                    }

                    const ingredient = item.value;
                    const isSelected = selectedIngredients.includes(ingredient);
                    const borderColor = getIngredientColorRaw(ingredient); // Always use raw color for borders
                    const partial = isPartialMatch(ingredient);

                    return (
                      <IngredientTile
                        key={ingredient}
                        name={ingredient}
                        accent={borderColor}
                        muted={isSelected}
                        dashed={partial}
                        disabled={isSelected}
                        isDarkMode={isDarkMode}
                        onClick={() => {
                          if (!isSelected) {
                            onIngredientSelect(ingredient);
                          }
                        }}
                      />
                    );
                  })}
                </div>

                {/* Empty States */}
                {suggestions.length === 0 && searchTerm && (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    No compatible ingredients found for "{searchTerm}"
                  </div>
                )}

                {suggestions.length === 0 && !searchTerm && (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
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
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-white dark:bg-gray-900"
          onClick={onClose}
        />
      )}
      
      {/* Drawer panel - centered card floating above the persistent bottom search bar */}
      <div className="fixed left-0 right-0 z-50 px-4" style={{ bottom: '84px' }}>
        {/* Drawer Content - Fixed height */}
        <div
          className={`
            mx-auto max-w-7xl
            bg-white dark:bg-gray-900 overflow-hidden
            transition-all duration-300 ease-out
            ${isOpen ? 'h-[50vh] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl' : 'h-0'}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Main Content Area */}
            <div className="flex flex-1 min-h-0">
            {/* Left Side: Filter Panel */}
            <div
              className={`
                flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto overflow-x-hidden
                transition-all duration-300 ease-out
                ${isFiltersPanelCollapsed ? 'w-0 p-0' : 'w-[340px] p-5'}
              `}
            >
              {/* Search Filters */}
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Search Filters
              </h3>

              {/* Search Filters Section */}
              {(
                <>
                  {/* Sub-tabs for Category and Taste */}
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => setActiveSearchTab('category')}
                      className={`
                        text-sm font-medium transition-colors
                        ${activeSearchTab === 'category'
                          ? 'text-gray-700 dark:text-gray-200'
                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300'
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
                          ? 'text-gray-700 dark:text-gray-200'
                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300'
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
                          {CATEGORIES.map((cat) => {
                            const CatIcon = CATEGORY_ICONS[cat];
                            return (
                              <button
                                key={cat}
                                onClick={() => handleCategoryClick(cat)}
                                className="
                                  py-2.5 px-3 text-sm
                                  rounded-full border-2 border-gray-300 dark:border-gray-600
                                  bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium
                                  hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700
                                  transition-all
                                  inline-flex items-center justify-center gap-1.5
                                "
                              >
                                {CatIcon && <CatIcon size={14} strokeWidth={2.25} className="shrink-0 opacity-70" />}
                                {categoryLabel(cat)}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleClearCategory}
                              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <X size={16} className="text-gray-600 dark:text-gray-300" />
                            </button>
                            <span className="py-2 px-4 rounded-full border-2 border-[#6AAFE8] bg-[#6AAFE8] text-white font-medium text-sm inline-flex items-center gap-1.5">
                              {(() => {
                                const ActiveIcon = CATEGORY_ICONS[activeCategory];
                                return ActiveIcon ? <ActiveIcon size={14} strokeWidth={2.25} className="shrink-0" /> : null;
                              })()}
                              {categoryLabel(activeCategory)}
                            </span>
                          </div>
                          {subcategories.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Subcategories</h4>
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
                                          ? 'border-[#6AAFE8] bg-blue-50 dark:bg-blue-900/30 text-[#6AAFE8]'
                                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500'
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
                                ${isActive ? 'text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
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
                                <span className="text-xs font-medium capitalize w-12 text-gray-700 dark:text-gray-300">{taste}</span>
                                <Slider
                                  min={1}
                                  max={10}
                                  step={1}
                                  accent={color}
                                  value={tasteValues[taste] || 1}
                                  onChange={(v) => onTasteChange({ ...tasteValues, [taste]: v })}
                                  aria-label={`${taste} minimum`}
                                  className="flex-1"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-6">{tasteValues[taste] || 1}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Filter Panel Toggle Button — a full-height divider strip, so the
                hit area is already tall; widened from w-6 to w-9 and the chevron
                darkened so it's an obvious affordance rather than a faint hairline. */}
            <button
              onClick={() => setIsFiltersPanelCollapsed(!isFiltersPanelCollapsed)}
              className="
                flex-shrink-0 w-9
                flex items-center justify-center
                border-r border-gray-200 dark:border-gray-700
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100
              "
              aria-label={isFiltersPanelCollapsed ? "Show filters" : "Hide filters"}
            >
              <ChevronLeft
                size={20}
                className={`transition-transform duration-300 ${isFiltersPanelCollapsed ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Middle: Sort + Ingredients */}
            <div className="flex-1 p-5 overflow-hidden flex flex-col border-r border-gray-200 dark:border-gray-700">
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
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
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
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </div>
                      );
                    }

                    // Skip partial-button on desktop (handled separately in the search bar area)
                    if (item.type === 'partial-button') {
                      return null;
                    }

                    const ingredient = item.value;
                    const isSelected = selectedIngredients.includes(ingredient);
                    const borderColor = getIngredientColorRaw(ingredient); // Always use raw color for borders
                    const partial = isPartialMatch(ingredient);
                    const isPairingHighlight = pairsWithHovered(ingredient);
                    const isHovered = hoveredIngredient === ingredient;

                    const hexToRgba = (hex, alpha) => {
                      const r = parseInt(hex.slice(1, 3), 16);
                      const g = parseInt(hex.slice(3, 5), 16);
                      const b = parseInt(hex.slice(5, 7), 16);
                      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                    };

                    return (
                      <IngredientTile
                        key={ingredient}
                        name={ingredient}
                        accent={borderColor}
                        muted={isSelected}
                        // Hover is parent-driven here so hovering one tile can also
                        // tint the tiles it pairs with (not just self-fill).
                        filled={!isSelected && isHovered}
                        tintBg={!isSelected && !isHovered && isPairingHighlight ? hexToRgba(borderColor, 0.15) : undefined}
                        dashed={partial}
                        disabled={isSelected}
                        isDarkMode={isDarkMode}
                        title={partial ? 'Not a suggested pairing with everything you’ve selected' : undefined}
                        onClick={() => {
                          if (!isSelected) {
                            handleIngredientAdd(ingredient);
                          }
                        }}
                        onMouseEnter={() => {
                          if (!isSelected) {
                            setHoveredIngredient(ingredient);
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredIngredient(null);
                        }}
                      />
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
                      {/* Navigation Buttons — visible 32px circles inside the
                          44px IconButton hit area */}
                      <div className="flex items-center mb-4 -ml-1.5">
                        <IconButton
                          label="Previous ingredient"
                          onClick={() => setSelectedInfoIndex(Math.max(0, selectedInfoIndex - 1))}
                          disabled={selectedInfoIndex === 0}
                          className="group disabled:opacity-30"
                        >
                          <span className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center transition-all group-enabled:group-hover:border-gray-400 dark:group-enabled:group-hover:border-gray-500 group-enabled:group-hover:bg-gray-50 dark:group-enabled:group-hover:bg-gray-700">
                            <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
                          </span>
                        </IconButton>
                        <IconButton
                          label="Next ingredient"
                          onClick={() => setSelectedInfoIndex(Math.min(selectedIngredients.length - 1, selectedInfoIndex + 1))}
                          disabled={selectedInfoIndex >= selectedIngredients.length - 1}
                          className="group disabled:opacity-30"
                        >
                          <span className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center transition-all group-enabled:group-hover:border-gray-400 dark:group-enabled:group-hover:border-gray-500 group-enabled:group-hover:bg-gray-50 dark:group-enabled:group-hover:bg-gray-700">
                            <ChevronRight size={18} className="text-gray-600 dark:text-gray-300" />
                          </span>
                        </IconButton>
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

                      {/* Category & Subcategory — same display labels as the
                          map/Atlas (one format everywhere) */}
                      {profile && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          {categoryLabel(profile.category)}
                          {profile.subcategory && ` · ${profile.subcategory}`}
                        </p>
                      )}

                      {/* Handoff to the flavor map (the app's ingredient reference) */}
                      {onOpenInfo && (
                        <button
                          onClick={() => onOpenInfo(currentIngredient)}
                          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline decoration-transparent hover:decoration-current underline-offset-4 transition-colors"
                        >
                          See it on the flavor map
                          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                        </button>
                      )}

                      {/* Description */}
                      {profile?.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                          {profile.description}
                        </p>
                      )}

                      {/* Non-pairing warning */}
                      {nonPairingIngredients.length > 0 && (
                        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                          <p className="text-sm text-amber-800 dark:text-amber-200">
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
                              style={{ backgroundColor: getIngredientColorWithContrast(TASTE_COLORS[taste], isHighContrast, isDarkMode) }}
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
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                  Select an ingredient to see details
                </div>
              )}
            </div>
            </div>

            {/* Max ingredients toast */}
            <div
              className={`
                fixed left-1/2 -translate-x-1/2 z-[60]
                w-max max-w-[min(92vw,26rem)]
                px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900
                text-sm font-medium text-center leading-snug
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

      {/* Persistent bottom bar - undo + search + partial, centered beneath the drawer.
          Same width/position whether the drawer is open or closed. */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[51] flex items-center gap-3">
        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`
            w-12 h-12 rounded-full flex-shrink-0
            flex items-center justify-center
            border-2 bg-white dark:bg-gray-800
            transition-all duration-300
            ${canUndo
              ? 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-700 cursor-pointer'
              : 'border-gray-200 dark:border-gray-700 text-gray-200 dark:text-gray-600 cursor-not-allowed'
            }
          `}
          aria-label="Undo"
        >
          <Undo2 size={20} strokeWidth={1.5} className="pointer-events-none" />
        </button>
        <div className="relative w-[480px] max-w-[calc(100vw-160px)]">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onOpen}
            onClick={onOpen}
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
            placeholder="Search ingredients…"
            className="
              w-full h-12 pl-12 pr-10
              rounded-full border-2 border-gray-300 dark:border-gray-600
              focus:border-gray-900 dark:focus:border-white focus:outline-none
              text-base bg-white dark:bg-gray-800 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500
              transition-colors
            "
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <X size={20} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}

        </div>
        {/* Map view — the current combo on the flavor graph. Closed-drawer only:
            while browsing, "Partial" takes this seat and the drawer covers the
            view anyway. Mirrors Undo's round button so the bar stays symmetric. */}
        {!isOpen && onOpenMap && (
          <button
            onClick={onOpenMap}
            disabled={!canOpenMap}
            className={`
              w-12 h-12 rounded-full flex-shrink-0
              flex items-center justify-center
              border-2 bg-white dark:bg-gray-800
              transition-all duration-300
              ${canOpenMap
                ? 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-700 cursor-pointer'
                : 'border-gray-200 dark:border-gray-700 text-gray-200 dark:text-gray-600 cursor-not-allowed'
              }
            `}
            title="See this combo on the flavor map"
            aria-label="See this combo on the flavor map"
          >
            <Waypoints size={20} strokeWidth={1.5} className="pointer-events-none" />
          </button>
        )}
        {/* Show Partial Matches - only relevant while browsing suggestions */}
        {isOpen && (
          <button
            onClick={onTogglePartialMatches}
            title={showPartialMatches ? "Showing partial matches" : "Show partial matches"}
            className={`
              h-12 px-4
              rounded-full border-2 border-dashed
              transition-all flex items-center gap-2 whitespace-nowrap
              ${showPartialMatches
                ? 'text-gray-800 dark:text-amber-200 border-[#FFC233] bg-amber-50 dark:bg-amber-900/30'
                : 'text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600 hover:border-[#FFC233] hover:text-gray-600 dark:hover:text-gray-300'
              }
            `}
          >
            <Zap size={18} />
            <span className="text-sm font-medium">Partial</span>
          </button>
        )}
      </div>
    </>
  );
};

export default IngredientDrawer;
