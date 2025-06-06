import React, { useState, useEffect } from 'react';
import { Dish, IngredientProfile } from '../../types';

interface DishEditorProps {
  dish: Dish | undefined;
  otherDishes: Dish[];
  onChange: (dish: Dish) => void;
  onDelete: (id: string) => void;
  allIngredients: IngredientProfile[];
  flavorMap: Map<string, Set<string>>;
  ingredientProfileMap: Map<string, IngredientProfile>;
}

// Helper to capitalize first letter
const capitalizeFirst = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const DishEditor: React.FC<DishEditorProps> = ({
  dish,
  otherDishes,
  onChange,
  onDelete,
  allIngredients,
  flavorMap,
  ingredientProfileMap
}) => {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [suggestedIngredients, setSuggestedIngredients] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  
  // Initialize selected ingredients when dish changes
  useEffect(() => {
    if (dish?.ingredients) {
      setSelectedIngredients(dish.ingredients);
    } else {
      setSelectedIngredients([]);
    }
  }, [dish]);
  
  // If no dish is provided, show message
  if (!dish) {
    return <div className="p-4 text-center">No dish selected</div>;
  }
  
  // Get suggestions based on current dish
  useEffect(() => {
    if (!dish) return;
    
    // Get compatible ingredients with key ingredient
    const compatibleIngredients = flavorMap.get(dish.keyIngredient) || new Set();
    
    // Filter out already selected ingredients and sort by name
    const suggestions = Array.from(compatibleIngredients)
      .filter(ingredient => !selectedIngredients.includes(ingredient))
      .sort();
    
    setSuggestedIngredients(suggestions);
  }, [dish, selectedIngredients, flavorMap]);
  
  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    if (!term) {
      setSearchResults([]);
      return;
    }
    
    // Find matching ingredients
    const normalizedTerm = term.toLowerCase();
    const matches = allIngredients
      .filter(ingredient => 
        ingredient.name.toLowerCase().includes(normalizedTerm) &&
        !selectedIngredients.includes(ingredient.name)
      )
      .map(ingredient => ingredient.name);
    
    setSearchResults(matches.slice(0, 10));
  };
  
  // Add ingredient to dish
  const addIngredient = (ingredient: string) => {
    if (selectedIngredients.includes(ingredient)) return;
    
    const updatedIngredients = [...selectedIngredients, ingredient];
    setSelectedIngredients(updatedIngredients);
    
    // Update dish with new ingredients
    updateDish(updatedIngredients);
    
    // Clear search
    setSearchTerm('');
    setSearchResults([]);
  };
  
  // Remove ingredient from dish
  const removeIngredient = (ingredient: string) => {
    // Can't remove key ingredient
    if (ingredient === dish.keyIngredient) return;
    
    const updatedIngredients = selectedIngredients.filter(i => i !== ingredient);
    setSelectedIngredients(updatedIngredients);
    
    // Update dish with new ingredients
    updateDish(updatedIngredients);
  };
  
  // Update dish with new ingredients
  const updateDish = (ingredients: string[]) => {
    // Calculate updated properties
    // Note: In a real implementation, these would use the utility functions
    // from the menuPlanner utils
    
    // Simplified taste profile calculation
    const tasteProfile = {
      sweet: 0,
      salty: 0,
      sour: 0,
      bitter: 0,
      umami: 0,
      fat: 0,
      spicy: 0
    };
    
    let validIngredients = 0;
    
    for (const ingredient of ingredients) {
      const profile = ingredientProfileMap.get(ingredient);
      if (profile?.flavorProfile) {
        Object.keys(tasteProfile).forEach(taste => {
          tasteProfile[taste as keyof typeof tasteProfile] += 
            profile.flavorProfile[taste as keyof typeof tasteProfile];
        });
        validIngredients++;
      }
    }
    
    // Normalize
    if (validIngredients > 0) {
      Object.keys(tasteProfile).forEach(taste => {
        tasteProfile[taste as keyof typeof tasteProfile] = 
          Math.min(10, tasteProfile[taste as keyof typeof tasteProfile] / validIngredients);
      });
    }
    
    // Simplified weight calculation
    const weight = ingredients.length > 0 ? 
      Math.min(10, Math.max(1, Math.round(ingredients.length * 1.5))) : 
      5;
    
    // Create updated dish (simplified for demo)
    const updatedDish: Dish = {
      ...dish,
      ingredients,
      tasteProfile,
      weight
    };
    
    // Send up to parent
    onChange(updatedDish);
  };
  
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Edit {capitalizeFirst(dish.type)}</h2>
        <button
          className="text-red-500"
          onClick={() => onDelete(dish.id)}
        >
          <span className="inline-block">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </span>
        </button>
      </div>
      
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Dish Name</h3>
        <div className="p-2 bg-gray-50 rounded-md">
          {dish.name}
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Ingredients</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedIngredients.map(ingredient => (
            <div
              key={ingredient}
              className={`px-3 py-1 rounded-full text-sm flex items-center ${
                ingredient === dish.keyIngredient
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100'
              }`}
            >
              {ingredient}
              {ingredient !== dish.keyIngredient && (
                <button
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  onClick={() => removeIngredient(ingredient)}
                >
                  <span className="inline-block">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Add Ingredients</h3>
        <div className="mb-4">
          <input
            type="text"
            className="w-full p-2 border rounded-md"
            placeholder="Search for ingredients..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
              {searchResults.map(ingredient => (
                <button
                  key={ingredient}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                  onClick={() => addIngredient(ingredient)}
                >
                  {ingredient}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <h3 className="text-sm font-medium mb-2">Suggested Ingredients</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {suggestedIngredients.slice(0, 9).map(ingredient => (
            <button
              key={ingredient}
              className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
              onClick={() => addIngredient(ingredient)}
              disabled={selectedIngredients.includes(ingredient)}
            >
              {ingredient}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Taste Profile</h3>
        <div className="grid grid-cols-7 gap-1">
          {Object.entries(dish.tasteProfile).map(([taste, value]) => (
            <div key={taste} className="flex flex-col items-center">
              <div className="text-xs mb-1 capitalize">{taste}</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 rounded-full h-2" 
                  style={{ width: `${value * 10}%` }}
                />
              </div>
              <div className="text-xs mt-1">{value.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DishEditor;
