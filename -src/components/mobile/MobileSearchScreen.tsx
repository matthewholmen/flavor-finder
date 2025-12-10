import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowLeft, Mic, Filter, ChevronDown, Check } from 'lucide-react';
import { CATEGORIES } from '../categoryFilter';
import { TasteProperty, TASTE_PROPERTIES } from '../../types';

interface FilterState {
  category: string;
  subcategories: string[];
  dietaryRestrictions: Record<string, boolean>;
  tasteValues: Record<TasteProperty, number>;
  activeSliders: Set<TasteProperty>;
}

interface MobileSearchScreenProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  suggestions: string[];
  onSuggestionSelect: (ingredient: string) => void;
  onBack: () => void;
  selectedIngredients: string[];
  recentSearches?: string[];
  // Enhanced filter props
  activeCategory: string;
  selectedSubcategories: string[];
  onCategoryChange: (filters: { category: string; subcategories: string[] }) => void;
  dietaryRestrictions: Record<string, boolean>;
  onDietaryChange: (restrictions: Record<string, boolean>) => void;
  tasteValues: Record<TasteProperty, number>;
  activeSliders: Set<TasteProperty>;
  onTasteChange: (values: Record<TasteProperty, number>) => void;
  onSliderToggle: (taste: TasteProperty) => void;
}

export default function MobileSearchScreen({
  searchTerm,
  onSearchChange,
  suggestions,
  onSuggestionSelect,
  onBack,
  selectedIngredients,
  recentSearches = [],
  // Enhanced filter props
  activeCategory,
  selectedSubcategories,
  onCategoryChange,
  dietaryRestrictions,
  onDietaryChange,
  tasteValues,
  activeSliders,
  onTasteChange,
  onSliderToggle
}: MobileSearchScreenProps) {
  const [isListening, setIsListening] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subcategory mapping from categoryFilter.tsx
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

  // Calculate active filter count
  const activeFilterCount = (
    (activeCategory ? 1 : 0) +
    selectedSubcategories.length +
    activeSliders.size +
    Object.values(dietaryRestrictions).filter(enabled => !enabled).length
  );

  // Auto-focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Voice search functionality
  const startVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onSearchChange(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    }
  };

  const clearSearch = () => {
    onSearchChange('');
    inputRef.current?.focus();
  };

  // Filter handlers
  const handleCategorySelect = (category: string) => {
    const newCategory = category === activeCategory ? '' : category;
    onCategoryChange({
      category: newCategory,
      subcategories: []
    });
  };

  const handleSubcategoryToggle = (subcategory: string) => {
    const updatedSubcategories = selectedSubcategories.includes(subcategory)
      ? selectedSubcategories.filter(s => s !== subcategory)
      : [...selectedSubcategories, subcategory];
    
    onCategoryChange({
      category: activeCategory,
      subcategories: updatedSubcategories
    });
  };

  const handleDietaryToggle = (key: string) => {
    onDietaryChange({
      ...dietaryRestrictions,
      [key]: !dietaryRestrictions[key]
    });
  };

  const handleTasteSliderChange = (taste: TasteProperty, value: number) => {
    onTasteChange({
      ...tasteValues,
      [taste]: value
    });
  };

  const clearAllFilters = () => {
    onCategoryChange({ category: '', subcategories: [] });
    activeSliders.forEach(taste => onSliderToggle(taste));
    // Reset dietary restrictions to all enabled
    const resetDietary = Object.keys(dietaryRestrictions).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    onDietaryChange(resetDietary);
  };

  const displayedSuggestions = suggestions.slice(0, 10);
  const hasSearchTerm = searchTerm.trim().length > 0;

  // Get suggested ingredients based on current selection (for when no search term)
  const compatibleIngredients = suggestions.slice(0, 12); // Show suggested ingredients

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search Header */}
      <div className="flex-none bg-white border-b border-gray-200 px-4 py-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-20 py-3 text-lg border-2 border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-12 top-3 p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-400" />
              </button>
            )}
            <button
              onClick={startVoiceSearch}
              disabled={isListening}
              className={`absolute right-2 top-2 p-2 rounded-full ${
                isListening 
                  ? 'bg-red-100 text-red-600' 
                  : 'hover:bg-gray-100 text-gray-400'
              }`}
            >
              <Mic size={20} className={isListening ? 'animate-pulse' : ''} />
            </button>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className="relative p-3 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors"
          >
            <Filter size={20} className="text-gray-600" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {!hasSearchTerm ? (
          /* Default state - show recent and compatible ingredients */
          <div className="p-4">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Searches</h3>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.slice(0, 8).map((search, index) => (
                    <button
                      key={index}
                      onClick={() => onSearchChange(search)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Compatible Ingredients */}
            {compatibleIngredients.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {selectedIngredients.length > 0 ? 'Compatible Ingredients' : 'Popular Ingredients'}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {compatibleIngredients.map((ingredient, index) => (
                    <button
                      key={index}
                      onClick={() => onSuggestionSelect(ingredient)}
                      disabled={selectedIngredients.includes(ingredient)}
                      className={`p-4 text-left border rounded-lg transition-colors ${
                        selectedIngredients.includes(ingredient)
                          ? 'bg-gray-100 text-gray-400 border-gray-200'
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <span className="font-medium capitalize">{ingredient}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Currently Selected */}
            {selectedIngredients.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Currently Selected ({selectedIngredients.length}/5)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedIngredients.map((ingredient, index) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Search results */
          <div className="p-4">
            {isListening && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center text-red-700">
                  <Mic size={20} className="mr-2 animate-pulse" />
                  <span>Listening... Speak now</span>
                </div>
              </div>
            )}

            {displayedSuggestions.length > 0 ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Results for "{searchTerm}"
                </h3>
                <div className="space-y-2">
                  {displayedSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => onSuggestionSelect(suggestion)}
                      disabled={selectedIngredients.includes(suggestion)}
                      className={`w-full p-4 text-left border rounded-lg transition-colors ${
                        selectedIngredients.includes(suggestion)
                          ? 'bg-gray-100 text-gray-400 border-gray-200'
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <span className="font-medium capitalize">{suggestion}</span>
                      {selectedIngredients.includes(suggestion) && (
                        <span className="ml-2 text-sm text-gray-500">(Already selected)</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No results found
                </h3>
                <p className="text-gray-600">
                  Try a different search term or adjust your filters
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Bottom Sheet */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl max-h-[80vh] overflow-y-auto">
            {/* Filter Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Filters</h2>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Categories Section */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Categories</h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleCategorySelect(category)}
                      className={`px-3 py-2 text-sm rounded-full border transition-colors ${
                        activeCategory === category
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* Subcategories */}
                {activeCategory && SUBCATEGORIES[activeCategory] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{activeCategory} Subcategories</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {SUBCATEGORIES[activeCategory].map((subcategory) => (
                        <button
                          key={subcategory}
                          onClick={() => handleSubcategoryToggle(subcategory)}
                          className={`px-3 py-2 text-sm rounded-lg border text-left transition-colors ${
                            selectedSubcategories.includes(subcategory)
                              ? 'bg-blue-50 border-blue-300 text-blue-800'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{subcategory}</span>
                            {selectedSubcategories.includes(subcategory) && (
                              <Check size={16} className="text-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Taste Profile Section */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Taste Profile</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {TASTE_PROPERTIES.map((taste) => (
                    <button
                      key={taste}
                      onClick={() => onSliderToggle(taste)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        activeSliders.has(taste)
                          ? 'bg-green-100 border-green-300 text-green-800'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {taste.charAt(0).toUpperCase() + taste.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Active Taste Sliders */}
                {Array.from(activeSliders).map((taste) => (
                  <div key={taste} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 capitalize">
                        {taste}: {tasteValues[taste]}/10
                      </label>
                      <button
                        onClick={() => onSliderToggle(taste)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={tasteValues[taste]}
                      onChange={(e) => handleTasteSliderChange(taste, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dietary Restrictions Section */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Dietary Restrictions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(dietaryRestrictions).slice(0, 8).map(([key, enabled]) => {
                    // Extract category and subcategory from key (format: "category:subcategory")
                    const [category, subcategory] = key.includes(':') ? key.split(':') : [key, ''];
                    const displayName = subcategory || category;
                    
                    return (
                      <button
                        key={key}
                        onClick={() => handleDietaryToggle(key)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          enabled
                            ? 'bg-green-50 border-green-300 text-green-800'
                            : 'bg-red-50 border-red-300 text-red-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="capitalize">{displayName}</span>
                          {enabled ? (
                            <Check size={16} className="text-green-600" />
                          ) : (
                            <X size={16} className="text-red-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {Object.keys(dietaryRestrictions).length > 8 && (
                  <button className="mt-3 text-sm text-blue-600 hover:text-blue-800">
                    View all dietary options...
                  </button>
                )}
              </div>
            </div>

            {/* Filter Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsFilterOpen(false)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Apply Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 bg-blue-500 px-2 py-1 rounded-full text-xs">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
