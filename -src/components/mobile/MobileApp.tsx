import React, { useState, useEffect } from 'react';
import { Search, Heart, Settings, Plus, X, RotateCcw, Globe, Save, ArrowLeft, Mic, Lock, LockOpen, Filter, ChevronDown } from 'lucide-react';
import Notification from '../Notification';
import CompactTasteSliders from '../CompactTasteSliders.tsx';
import MobileDiscoverScreen from './MobileDiscoverScreen.tsx';
import { TasteProperty } from '../../types';

// Import types directly from the hook file to avoid module resolution issues
interface SavedCombination {
  id: string;
  name: string;
  ingredients: string[];
  createdAt: Date;
  lastUsed: Date;
  tags?: string[];
  notes?: string;
}

// Temporary inline useSavedCombinations hook to avoid import issues
const useSavedCombinations = () => {
  const [combinations, setCombinations] = useState<SavedCombination[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('flavorFinderCombinations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((combo: any) => ({
          ...combo,
          createdAt: new Date(combo.createdAt),
          lastUsed: new Date(combo.lastUsed)
        }));
        setCombinations(parsed);
      } catch (error) {
        console.error('Error parsing saved combinations:', error);
        setCombinations([]);
      }
    }
  }, []);

  // Save to localStorage when combinations change
  useEffect(() => {
    if (combinations.length > 0) {
      localStorage.setItem('flavorFinderCombinations', JSON.stringify(combinations));
    }
  }, [combinations]);

  const saveCombination = (name: string, ingredients: string[], tags?: string[], notes?: string) => {
    const newCombination: SavedCombination = {
      id: Date.now().toString(),
      name: name.trim() || `Combination ${combinations.length + 1}`,
      ingredients: [...ingredients],
      createdAt: new Date(),
      lastUsed: new Date(),
      tags,
      notes
    };
    setCombinations(prev => [newCombination, ...prev]);
    return newCombination.id;
  };

  const loadCombination = (id: string) => {
    const combination = combinations.find(c => c.id === id);
    if (combination) {
      // Update last used timestamp
      setCombinations(prev => 
        prev.map(c => c.id === id ? {...c, lastUsed: new Date()} : c)
      );
      return combination.ingredients;
    }
    return [];
  };

  const deleteCombination = (id: string) => {
    setCombinations(prev => prev.filter(c => c.id !== id));
  };

  return {
    combinations,
    saveCombination,
    loadCombination,
    deleteCombination
  };
};

interface MobileAppProps {
  // Core FlavorFinder props
  selectedIngredients: string[];
  onIngredientsChange: (ingredients: string[]) => void;
  onRandomize: () => void;
  allIngredients: string[];
  filteredIngredients: string[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onIngredientSelect: (ingredient: string) => void;
  ingredientProfiles: any[];
  onOpenDietarySettings: () => void;
  // Lock functionality
  lockedIngredients: Set<number>;
  onLockToggle: (index: number) => void;
  // Flavor map for compatibility
  flavorMap: Map<string, Set<string>>;
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

export default function MobileApp({
  selectedIngredients,
  onIngredientsChange,
  onRandomize,
  allIngredients,
  filteredIngredients,
  searchTerm,
  onSearchChange,
  onIngredientSelect,
  ingredientProfiles,
  onOpenDietarySettings,
  lockedIngredients,
  onLockToggle,
  flavorMap,
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
}: MobileAppProps) {
  const [activeTab, setActiveTab] = useState<'discover' | 'saved' | 'settings'>('discover');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'categories' | 'taste' | 'dietary'>('categories');
  const [isTasteFiltersOpen, setIsTasteFiltersOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error' | 'info'} | null>(null);
  
  // Saved combinations functionality
  const { saveCombination } = useSavedCombinations();
  
  // Calculate active filter count
  const activeFilterCount = (
    (activeCategory ? 1 : 0) +
    (selectedSubcategories?.length || 0) +
    (activeSliders?.size || 0) +
    (dietaryRestrictions ? Object.values(dietaryRestrictions).filter(enabled => !enabled).length : 0)
  );
  
  // Show notification for 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Inline SavedCombinationsScreen component to avoid import issues
  const SavedCombinationsScreen = ({ 
    onLoadCombination, 
    currentIngredients 
  }: {
    onLoadCombination: (ingredients: string[]) => void;
    currentIngredients: string[];
  }) => {
    const { combinations, loadCombination, deleteCombination, saveCombination } = useSavedCombinations();
    const [searchQuery, setSearchQuery] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [newCombinationName, setNewCombinationName] = useState('');

    const filteredCombinations = searchQuery 
      ? combinations.filter(combo => 
          combo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          combo.ingredients.some(ingredient => 
            ingredient.toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
      : combinations;

    const handleLoad = (id: string) => {
      const ingredients = loadCombination(id);
      if (ingredients.length > 0) {
        onLoadCombination(ingredients);
        setNotification({
          message: 'Combination loaded successfully!',
          type: 'success'
        });
      }
    };

    const handleDelete = (id: string) => {
      if (window.confirm('Are you sure you want to delete this combination?')) {
        deleteCombination(id);
        setNotification({
          message: 'Combination deleted',
          type: 'info'
        });
      }
    };

    const handleSaveCurrent = () => {
      if (currentIngredients.length === 0) return;
      const defaultName = `Combination ${combinations.length + 1}`;
      setNewCombinationName(defaultName);
      setShowSaveDialog(true);
    };

    const confirmSave = () => {
      if (currentIngredients.length > 0 && newCombinationName.trim()) {
        saveCombination(newCombinationName.trim(), currentIngredients);
        setShowSaveDialog(false);
        setNewCombinationName('');
        setNotification({
          message: `Saved "${newCombinationName}"!`,
          type: 'success'
        });
      }
    };

    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-gray-900">Saved Combinations</h1>
            {currentIngredients.length > 0 && (
              <button
                onClick={handleSaveCurrent}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
              >
                <Plus size={16} className="mr-1" />
                Save Current
              </button>
            )}
          </div>
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search combinations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-4 overflow-y-auto">
          {filteredCombinations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No matches found' : 'No saved combinations'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery 
                  ? `No combinations match "${searchQuery}"`
                  : 'Save your favorite ingredient combinations for quick access'
                }
              </p>
              {!searchQuery && currentIngredients.length > 0 && (
                <button
                  onClick={handleSaveCurrent}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Save Current Combination
                </button>
              )}
            </div>
          ) : (
            <div className="pb-16">
              {filteredCombinations.map((combination) => (
                <div key={combination.id} className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-lg mb-1">{combination.name}</h3>
                      <div className="text-sm text-gray-500 mb-2">
                        Created {combination.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Ingredients list */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {combination.ingredients.map((ingredient, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoad(combination.id)}
                      className="flex-1 flex items-center justify-center py-2 px-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                    >
                      Load Combination
                    </button>
                    <button
                      onClick={() => handleDelete(combination.id)}
                      className="flex items-center justify-center py-2 px-3 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-lg font-medium mb-4">Save Combination</h2>
              <input
                type="text"
                placeholder="Enter name..."
                value={newCombinationName}
                onChange={(e) => setNewCombinationName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSave}
                  disabled={!newCombinationName.trim()}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Inline MobileSettingsScreen component
  const MobileSettingsScreen = ({ onOpenDietarySettings }: { onOpenDietarySettings: () => void }) => {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-4 overflow-y-auto">
          {/* About Section */}
          <div className="bg-white rounded-lg mb-4 shadow-sm">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">About FlavorFinder</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                FlavorFinder helps you discover amazing ingredient combinations using 
                advanced flavor pairing algorithms and a comprehensive database of culinary knowledge.
              </p>
              <p className="text-xs text-gray-500">Version 1.0.0</p>
            </div>
          </div>

          {/* How to Use */}
          <div className="bg-white rounded-lg mb-4 shadow-sm">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">How to Use</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>1. Tap "Add ingredient" to search and select</div>
                <div>2. Use "Generate" for random combinations</div>
                <div>3. Tap "Find Recipes" to search Google</div>
                <div>4. Save your favorite combinations</div>
                <div>5. Use filters to customize your ingredient suggestions</div>
              </div>
            </div>
          </div>

          {/* Note about dietary preferences */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Settings size={20} className="text-blue-600 mt-0.5" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Dietary Preferences</h4>
                <p className="text-xs text-blue-700">
                  Manage dietary restrictions through the filter panel when searching for ingredients.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const handleRemoveIngredient = (index: number) => {
    const newIngredients = selectedIngredients.filter((_, i) => i !== index);
    onIngredientsChange(newIngredients);
    
    // Clear lock status for this slot
    if (lockedIngredients.has(index)) {
      onLockToggle(index);
    }
  };

  const handleAddIngredient = () => {
    setIsSearchOpen(true);
  };

  const handleSearchBack = () => {
    setIsSearchOpen(false);
    onSearchChange(''); // Clear search when closing
  };

  const handleIngredientSelection = (ingredient: string) => {
    // Add to recent searches if not already there
    if (!recentSearches.includes(ingredient)) {
      setRecentSearches(prev => [ingredient, ...prev.slice(0, 7)]); // Keep last 8 searches
    }
    
    onIngredientSelect(ingredient);
    setIsSearchOpen(false);
  };

  const handleFindRecipes = () => {
    if (selectedIngredients.length === 0) return;
    
    const ingredientsText = selectedIngredients.join(' ');
    navigator.clipboard.writeText(ingredientsText)
      .then(() => {
        const searchURL = `https://www.google.com/search?q=${encodeURIComponent(ingredientsText + ' recipe')}`;
        window.open(searchURL, '_blank');
        setNotification({
          message: 'Ingredients copied to clipboard! Recipe search opened.',
          type: 'success'
        });
      })
      .catch(err => {
        console.error('Failed to copy ingredients:', err);
        const searchURL = `https://www.google.com/search?q=${encodeURIComponent(ingredientsText + ' recipe')}`;
        window.open(searchURL, '_blank');
        setNotification({
          message: 'Recipe search opened! (Could not copy to clipboard)',
          type: 'info'
        });
      });
  };

  // Show search screen as overlay
  if (isSearchOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <div className="flex flex-col h-full bg-white">
          {/* Search Header */}
          <div className="flex-none bg-white border-b border-gray-200 px-4 py-4 pt-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSearchBack}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100"
              >
                <ArrowLeft size={24} className="text-gray-600" />
              </button>
              
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ingredients..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-20 py-3 text-lg border-2 border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-12 top-3 p-1 rounded-full hover:bg-gray-100"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
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

            {/* Filter Panel with Tabs */}
            {isFilterPanelOpen && (
              <div className="mt-4 border border-gray-200 rounded-lg bg-white overflow-hidden">
                {/* Tab Headers */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveFilterTab('categories')}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                      activeFilterTab === 'categories'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Categories
                  </button>
                  <button
                    onClick={() => setActiveFilterTab('taste')}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                      activeFilterTab === 'taste'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Taste
                    {activeSliders.size > 0 && (
                      <span className="ml-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {activeSliders.size}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveFilterTab('dietary')}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                      activeFilterTab === 'dietary'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Dietary
                  </button>
                </div>
                
                {/* Tab Content */}
                <div className="p-4">
                  {/* Clear All Button */}
                  {activeFilterCount > 0 && (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => {
                          onCategoryChange({ category: '', subcategories: [] });
                          if (activeSliders) {
                            activeSliders.forEach(taste => onSliderToggle(taste));
                          }
                          const resetDietary = dietaryRestrictions ? Object.keys(dietaryRestrictions).reduce((acc, key) => {
                            acc[key] = true;
                            return acc;
                          }, {}) : {};
                          onDietaryChange(resetDietary);
                          setIsTasteFiltersOpen(false);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                  
                  {/* Categories Tab */}
                  {activeFilterTab === 'categories' && (
                    <div className="grid grid-cols-2 gap-2">
                      {['Proteins', 'Vegetables', 'Fruits', 'Seasonings', 'Dairy', 'Grains', 'Condiments', 'Liquids', 'Alcohol'].map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            const newCategory = category === activeCategory ? '' : category;
                            onCategoryChange({ category: newCategory, subcategories: [] });
                          }}
                          className={`px-3 py-2.5 text-sm rounded-lg border transition-colors ${
                            activeCategory === category
                              ? 'bg-blue-100 border-blue-300 text-blue-800'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Taste Tab */}
                  {activeFilterTab === 'taste' && (
                    <div className="-mx-2">
                      <CompactTasteSliders
                        values={tasteValues}
                        onChange={onTasteChange}
                        activeSliders={activeSliders}
                        onToggleSlider={onSliderToggle}
                      />
                    </div>
                  )}
                  
                  {/* Dietary Tab */}
                  {activeFilterTab === 'dietary' && (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600 mb-3">
                        Quick dietary options (more available in Settings)
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            // Toggle vegetarian (disable all meat categories)
                            const isVegetarian = dietaryRestrictions['Proteins:Meat'] === false;
                            const updates = {
                              ...dietaryRestrictions,
                              'Proteins:Meat': !isVegetarian ? false : true,
                              'Proteins:Poultry': !isVegetarian ? false : true,
                              'Proteins:Game': !isVegetarian ? false : true,
                              'Proteins:Pork': !isVegetarian ? false : true,
                              'Proteins:Offal': !isVegetarian ? false : true,
                            };
                            onDietaryChange(updates);
                          }}
                          className={`px-3 py-2.5 text-sm rounded-lg border transition-colors ${
                            dietaryRestrictions['Proteins:Meat'] === false
                              ? 'bg-green-100 border-green-300 text-green-800'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Vegetarian
                        </button>
                        <button
                          onClick={() => {
                            // Toggle dairy-free
                            const isDairyFree = dietaryRestrictions['Dairy:Hard Cheese'] === false;
                            const updates = {
                              ...dietaryRestrictions,
                              'Dairy:Hard Cheese': !isDairyFree ? false : true,
                              'Dairy:Soft Cheese': !isDairyFree ? false : true,
                              'Dairy:Cultured Dairy': !isDairyFree ? false : true,
                              'Dairy:Milk & Cream': !isDairyFree ? false : true,
                            };
                            onDietaryChange(updates);
                          }}
                          className={`px-3 py-2.5 text-sm rounded-lg border transition-colors ${
                            dietaryRestrictions['Dairy:Hard Cheese'] === false
                              ? 'bg-green-100 border-green-300 text-green-800'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Dairy-Free
                        </button>
                        <button
                          onClick={() => {
                            // Toggle gluten-free
                            const isGlutenFree = dietaryRestrictions['Grains:Bread'] === false;
                            const updates = {
                              ...dietaryRestrictions,
                              'Grains:Bread': !isGlutenFree ? false : true,
                              'Grains:Pasta': !isGlutenFree ? false : true,
                            };
                            onDietaryChange(updates);
                          }}
                          className={`px-3 py-2.5 text-sm rounded-lg border transition-colors ${
                            dietaryRestrictions['Grains:Bread'] === false
                              ? 'bg-green-100 border-green-300 text-green-800'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Gluten-Free
                        </button>
                        <button
                          onClick={() => {
                            // Link to full settings
                            onOpenDietarySettings();
                            setIsSearchOpen(false);
                          }}
                          className="px-3 py-2.5 text-sm rounded-lg border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                          More Options...
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {!searchTerm ? (
              /* Default state - show compatible ingredients */
              <div>
                {selectedIngredients.length > 0 && (
                  <div className="mb-6">
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

                {/* Compatible Ingredients */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    {selectedIngredients.length > 0 ? 'Compatible Ingredients' : 'Popular Ingredients'}
                  </h3>
                  <div className="space-y-2">
                    {/* Use proper compatibility logic */}
                    {(() => {
                      let compatible = [];
                      
                      if (selectedIngredients.length === 0) {
                        // Show all ingredients if none selected
                        compatible = filteredIngredients.slice(0, 20);
                      } else {
                        // Show ingredients compatible with ALL selected ingredients
                        compatible = filteredIngredients.filter(ingredient => {
                          if (selectedIngredients.includes(ingredient)) return false;
                          
                          return selectedIngredients.every(selected => 
                            flavorMap.get(selected)?.has(ingredient)
                          );
                        }).slice(0, 20);
                      }
                      
                      return compatible.map((ingredient, index) => (
                        <button
                          key={index}
                          onClick={() => handleIngredientSelection(ingredient)}
                          disabled={selectedIngredients.includes(ingredient)}
                          className={`w-full p-4 text-left border rounded-lg transition-colors ${
                            selectedIngredients.includes(ingredient)
                              ? 'bg-gray-100 text-gray-400 border-gray-200'
                              : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <span className="font-medium capitalize">{ingredient}</span>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              /* Search results */
              <div>
                {filteredIngredients.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Results for "{searchTerm}"
                    </h3>
                    <div className="space-y-2">
                      {filteredIngredients.slice(0, 20).map((ingredient, index) => (
                        <button
                          key={index}
                          onClick={() => handleIngredientSelection(ingredient)}
                          disabled={selectedIngredients.includes(ingredient)}
                          className={`w-full p-4 text-left border rounded-lg transition-colors ${
                            selectedIngredients.includes(ingredient)
                              ? 'bg-gray-100 text-gray-400 border-gray-200'
                              : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <span className="font-medium capitalize">{ingredient}</span>
                          {selectedIngredients.includes(ingredient) && (
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
        </div>
      </div>
    );
  }

  // Compact Swipeable Ingredient Card optimized for fixed height layout
  const IngredientCard = ({ ingredient, details, onRemove, isLocked, onLockToggle }: {
    ingredient: string;
    details: { category: string; subcategory: string };
    onRemove: () => void;
    isLocked: boolean;
    onLockToggle: () => void;
  }) => {
    const [isRemoving, setIsRemoving] = useState(false);
    const [touchStart, setTouchStart] = useState(0);
    const [touchOffset, setTouchOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const handleTouchStart = (e: React.TouchEvent) => {
      setTouchStart(e.touches[0].clientX);
      setIsDragging(false);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStart) return;
      
      const currentTouch = e.touches[0].clientX;
      const diff = touchStart - currentTouch;
      
      // Only allow swiping left (positive diff)
      if (diff > 0) {
        setTouchOffset(Math.min(diff, 120)); // Max 120px swipe
        setIsDragging(true);
      }
    };

    const handleTouchEnd = () => {
      if (touchOffset > 60) {
        // Swipe threshold reached - remove ingredient
        setIsRemoving(true);
        setTimeout(() => {
          onRemove();
          setNotification({
            message: `Removed ${ingredient}`,
            type: 'info'
          });
        }, 150);
      } else {
        // Reset position
        setTouchOffset(0);
      }
      setTouchStart(0);
      setIsDragging(false);
    };

    // Truncate long ingredient names to fit in compact layout
    const displayName = ingredient.length > 18 ? `${ingredient.slice(0, 18)}...` : ingredient;
    const categoryDisplay = details.category.length > 10 ? details.category.slice(0, 10) : details.category;
    const subcategoryDisplay = details.subcategory.length > 12 ? details.subcategory.slice(0, 12) : details.subcategory;

    return (
      <div 
        className={`relative transition-all duration-150 ${
          isRemoving ? 'opacity-0 transform scale-95' : 'opacity-100'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background delete indicator */}
        {touchOffset > 20 && (
          <div className="absolute right-0 top-0 bottom-0 bg-red-500 rounded-r-lg flex items-center justify-center px-4">
            <X className="text-white" size={20} />
          </div>
        )}
        
        {/* Compact main card content - fixed height ~72px */}
        <div 
          className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm transition-transform h-[72px] flex items-center"
          style={{
            transform: `translateX(-${touchOffset}px)`
          }}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0 pr-2">
              <div className="text-base font-medium text-gray-900 capitalize truncate">
                {displayName}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                {categoryDisplay} • {subcategoryDisplay}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Lock/Unlock button - smaller */}
              <button
                onClick={onLockToggle}
                className={`p-1.5 rounded-md transition-colors ${
                  isLocked 
                    ? 'text-gray-800 bg-gray-100' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title={isLocked ? "Unlock ingredient" : "Lock ingredient"}
              >
                {isLocked ? <Lock size={16} /> : <LockOpen size={16} />}
              </button>
              {/* Remove button - smaller */}
              <button
                onClick={onRemove}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                title="Remove ingredient"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          {/* Subtle swipe hint indicator */}
          {!isDragging && touchOffset === 0 && (
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-200 pointer-events-none">
              <div className="text-xs opacity-30">‹</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Temporary inline BottomNavigation component
  const BottomNavigation = ({ activeTab, onTabChange }: {
    activeTab: 'discover' | 'saved' | 'settings';
    onTabChange: (tab: 'discover' | 'saved' | 'settings') => void;
  }) => {
    const tabs = [
      { id: 'discover' as const, icon: Search, label: 'Discover' },
      { id: 'saved' as const, icon: Heart, label: 'Saved' },
      { id: 'settings' as const, icon: Settings, label: 'Settings' }
    ];

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
        <div className="grid grid-cols-3 h-16">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center h-full transition-colors ${
                  isActive 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <IconComponent size={24} />
                <span className={`text-xs mt-1 font-medium ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };



  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Main Content Area - Remove pb-16 and overflow-hidden that interfere with child flex layout */}
      <div className="flex-1 min-h-0">
        {activeTab === 'discover' && (
          <MobileDiscoverScreen
            selectedIngredients={selectedIngredients}
            lockedIngredients={lockedIngredients}
            onRemoveIngredient={handleRemoveIngredient}
            onToggleLock={onLockToggle}
            onAddIngredient={handleAddIngredient}
            onFindRecipes={handleFindRecipes}
            onGenerate={onRandomize}
            ingredientProfiles={ingredientProfiles}
            onSaveCombination={(name, ingredients) => {
              saveCombination(name, ingredients);
              setNotification({
                message: `Saved "${name}"!`,
                type: 'success'
              });
            }}
          />
        )}
        
        {activeTab === 'saved' && (
          <SavedCombinationsScreen
            onLoadCombination={onIngredientsChange}
            currentIngredients={selectedIngredients}
          />
        )}
        
        {activeTab === 'settings' && (
          <MobileSettingsScreen
            onOpenDietarySettings={onOpenDietarySettings}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
