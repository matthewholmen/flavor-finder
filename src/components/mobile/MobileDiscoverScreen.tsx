import React, { useState } from 'react';
import { Plus, X, RotateCcw, Globe, Save, Search, Lock, LockOpen } from 'lucide-react';

interface IngredientCardProps {
  ingredient: string;
  category: string;
  subcategory: string;
  isLocked?: boolean;
  onRemove: () => void;
  onLockToggle?: () => void;
}

function IngredientCard({ 
  ingredient, 
  category, 
  subcategory, 
  isLocked = false,
  onRemove,
  onLockToggle 
}: IngredientCardProps) {
  // Responsive text truncation based on screen size
  const displayName = ingredient.length > 20 ? ingredient.slice(0, 20) + '...' : ingredient;
  const displayCategory = category.length > 12 ? category.substring(0, 12) + '...' : category;
  const displaySubcategory = subcategory.length > 12 ? subcategory.substring(0, 12) + '...' : subcategory;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg flex-1 py-2 flex items-center shadow-sm">
      <div className="flex items-center justify-between w-full px-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <span className="text-xl sm:text-2xl font-semibold text-gray-900 capitalize truncate leading-tight tracking-tight">
              {displayName}
            </span>
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-widest mt-0.5 leading-tight">
            {category} • {subcategory}
          </div>
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* Lock button */}
          {onLockToggle && (
            <button
              onClick={onLockToggle}
              className={`p-2 rounded transition-colors ${
                isLocked 
                  ? 'text-gray-800 hover:bg-gray-100' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              title={isLocked ? "Unlock ingredient" : "Lock ingredient"}
            >
              {isLocked ? <Lock size={20} /> : <LockOpen size={20} />}
            </button>
          )}
          <button
            onClick={onRemove}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="Remove ingredient"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface MobileDiscoverScreenProps {
  selectedIngredients: string[];
  lockedIngredients: Set<number>;
  onRemoveIngredient: (index: number) => void;
  onToggleLock: (index: number) => void;
  onAddIngredient: () => void;
  onFindRecipes: () => void;
  onGenerate: () => void;
  ingredientProfiles: any[];
  onSaveCombination?: (name: string, ingredients: string[]) => void;
}

export default function MobileDiscoverScreen({
  selectedIngredients,
  lockedIngredients,
  onRemoveIngredient,
  onToggleLock,
  onAddIngredient,
  onFindRecipes,
  onGenerate,
  ingredientProfiles,
  onSaveCombination
}: MobileDiscoverScreenProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  const getIngredientDetails = (ingredient: string) => {
    const profile = ingredientProfiles.find(p => 
      p.name.toLowerCase() === ingredient.toLowerCase()
    );
    return profile ? {
      category: profile.category,
      subcategory: profile.subcategory
    } : {
      category: 'Other',
      subcategory: 'Miscellaneous'
    };
  };

  const handleSaveCombination = () => {
    if (selectedIngredients.length === 0) return;
    
    const defaultName = `My Combination ${Date.now().toString().slice(-4)}`;
    const name = prompt('Name your combination:', defaultName);
    
    if (name && name.trim()) {
      if (onSaveCombination) {
        onSaveCombination(name.trim(), selectedIngredients);
        setNotificationMessage(`"${name.trim()}" saved!`);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Search Bar - 10% of screen height */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3 sm:py-4 safe-area-top" style={{height: '10vh'}}>
        <button
          onClick={onAddIngredient}
          className="w-full flex items-center p-3 sm:p-4 border-2 border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors min-h-[44px]"
        >
          <Search size={24} className="mr-3 text-gray-400 flex-shrink-0" />
          <span className="text-left font-medium text-base sm:text-lg">
            {selectedIngredients.length === 5 
              ? 'Replace an ingredient...'
              : 'Search for ingredients...'}
          </span>
        </button>
      </div>

      {/* Content Area - 70% of screen height for ingredient slots */}
      <div className="flex flex-col" style={{height: '70vh'}}>
        <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-h-0 flex flex-col">
          {/* Fixed Ingredient Slots - 5 slots distributed across available space */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex flex-col h-full justify-around py-4">
              {/* Always show 5 slots */}
              {Array.from({ length: 5 }).map((_, index) => {
                const ingredient = selectedIngredients[index];
                
                if (ingredient) {
                  // Filled slot
                  const details = getIngredientDetails(ingredient);
                  return (
                    <div key={`slot-${index}`} className="flex" style={{height: '14vh'}}>
                      <IngredientCard
                        ingredient={ingredient}
                        category={details.category}
                        subcategory={details.subcategory}
                        isLocked={lockedIngredients.has(index)}
                        onRemove={() => onRemoveIngredient(index)}
                        onLockToggle={() => onToggleLock(index)}
                      />
                    </div>
                  );
                } else {
                  // Empty slot
                  return (
                    <div key={`empty-slot-${index}`} className="flex" style={{height: '14vh'}}>
                      <button
                        onClick={onAddIngredient}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex flex-col items-center justify-center"
                      >
                        <Plus size={24} className="mb-2" />
                        <span className="text-base font-medium">
                          Add ingredient
                        </span>
                      </button>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - 10% of screen height */}
      <div className="bg-white border-t border-gray-200 p-3 sm:p-4 pb-4 sm:pb-6 safe-area-bottom flex-shrink-0" style={{height: '10vh'}}>
        {/* Primary Action - Generate button gets full width and prominence */}
        <button
          onClick={onGenerate}
          className="w-full flex items-center justify-center py-3 sm:py-4 px-3 sm:px-4 rounded-lg font-medium text-base sm:text-lg mb-3 transition-colors min-h-[44px] bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
        >
          <RotateCcw size={24} className="mr-3" />
          Generate New Combination
        </button>
        
        {/* Secondary Actions - Find Recipes and Save */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onFindRecipes}
            disabled={selectedIngredients.length === 0}
            className={`flex items-center justify-center py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-sm sm:text-base transition-colors min-h-[44px] ${
              selectedIngredients.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            <Globe size={20} className="mr-2" />
            Find Recipes
          </button>
          <button
            onClick={handleSaveCombination}
            disabled={selectedIngredients.length === 0}
            className={`flex items-center justify-center py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-sm sm:text-base transition-colors min-h-[44px] ${
              selectedIngredients.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800'
            }`}
          >
            <Save size={20} className="mr-2" />
            Save
          </button>
        </div>
      </div>
      
      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between">
            <span className="font-medium">{notificationMessage}</span>
            <button
              onClick={() => setShowNotification(false)}
              className="text-white hover:text-gray-200 p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
