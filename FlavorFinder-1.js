// FlavorFinder.js
import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { flavorPairings } from './data/flavorPairings.ts';
import { IngredientProfile } from './types.ts';
import { ingredientProfiles } from './data/ingredientProfiles.ts';
import TasteProfileDisplay from './components/TasteProfileDisplay';

// Version tracking
const VERSION = '2.0.0';
const CHANGELOG = {
  '1.0.0': 'Initial version with basic search and compatibility display',
  '2.0.0': 'Added version control, changelog, and component organization'
};

// Data structures
const createFlavorMap = () => {
  const flavorMap = new Map();
  const profileMap = new Map(ingredientProfiles.map(p => [p.name, p]));
  
  flavorPairings.forEach(pair => {
    const [ingredient1, ingredient2] = pair.split(',');
    if (!ingredient1 || !ingredient2) return;
    
    if (!flavorMap.has(ingredient1)) {
      flavorMap.set(ingredient1, new Set());
    }
    if (!flavorMap.has(ingredient2)) {
      flavorMap.set(ingredient2, new Set());
    }
    
    flavorMap.get(ingredient1).add(ingredient2);
    flavorMap.get(ingredient2).add(ingredient1);

    // Enhance pairing score if we have profile data
    const profile1 = profileMap.get(ingredient1);
    const profile2 = profileMap.get(ingredient2);
    if (profile1 && profile2) {
      // Future enhancement: adjust pairing strength based on profiles
    }
  });
  
  return {
    flavorMap,
    totalPairings: flavorPairings.length
  };
};

// Utility functions
const getCompatibilityScore = (ingredient, otherIngredients, flavorMap) => {
  if (otherIngredients.length === 0) return 100;
  
  const pairings = flavorMap.get(ingredient);
  const compatibleCount = otherIngredients.filter(other => 
    pairings.has(other)
  ).length;
  
  return (compatibleCount / otherIngredients.length) * 100;
};

const getCompatibilityColor = (percentage) => {
  if (percentage >= 90) return 'bg-green-100 text-green-800';
  if (percentage >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

// UI Components
const SearchBar = ({ searchTerm, setSearchTerm, isSearchFocused, setIsSearchFocused }) => (
  <div className="relative">
    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
    <input
      type="text"
      placeholder="Search ingredients..."
      className="pl-10 w-full p-2 border rounded-lg"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onFocus={() => setIsSearchFocused(true)}
      onBlur={() => {
        setTimeout(() => setIsSearchFocused(false), 200);
      }}
    />
  </div>
);

const SelectedIngredients = ({ ingredients, onRemove, flavorMap }) => (
  <div className="flex flex-wrap gap-2">
    {ingredients.map(ingredient => {
      const otherIngredients = ingredients.filter(i => i !== ingredient);
      const compatibilityScore = getCompatibilityScore(ingredient, otherIngredients, flavorMap);
      const colorClass = getCompatibilityColor(compatibilityScore);
      
      return (
        <span
          key={ingredient}
          className={`px-3 py-1 rounded-full flex items-center gap-2 ${colorClass}`}
          title={`${compatibilityScore.toFixed(0)}% compatible`}
        >
          {ingredient}
          <button
            onClick={() => onRemove(ingredient)}
            className="hover:opacity-70"
          >
            ×
          </button>
        </span>
      );
    })}
  </div>
);

const SuggestedIngredients = ({ suggestions, onSelect, selectedIngredients, flavorMap }) => (
  <div className="border rounded-lg p-4 h-96 overflow-y-auto">
    {suggestions.length > 0 ? (
      suggestions.map(ingredient => {
        const compatibilityScore = getCompatibilityScore(ingredient, selectedIngredients, flavorMap);
        const colorClass = getCompatibilityColor(compatibilityScore);
        
        return (
          <button
            key={ingredient}
            onClick={() => onSelect(ingredient)}
            className={`block w-full text-left px-3 py-2 rounded mb-1 ${colorClass}`}
            title={`${compatibilityScore.toFixed(0)}% compatible`}
          >
            {ingredient}
          </button>
        );
      })
    ) : (
      <p className="text-gray-500 italic">
        {selectedIngredients.length === 0
          ? "Select ingredients to see suggestions"
          : "No suggestions found"}
      </p>
    )}
  </div>
);

// Main Component
export default function FlavorFinder() {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const { flavorMap, totalPairings } = useMemo(() => createFlavorMap(), []);
  
  const allIngredients = useMemo(() => 
    Array.from(flavorMap.keys()).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    ), 
    [flavorMap]
  );

  const findCompatibleIngredients = () => {
    if (selectedIngredients.length === 0) return [];
    
    const compatibleSets = selectedIngredients.map(ingredient => 
      flavorMap.get(ingredient) || new Set()
    );
    
    const intersection = [...compatibleSets[0]].filter(ingredient =>
      !selectedIngredients.includes(ingredient)
    );
    
    return intersection.sort((a, b) => {
      const scoreA = getCompatibilityScore(a, selectedIngredients, flavorMap);
      const scoreB = getCompatibilityScore(b, selectedIngredients, flavorMap);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  };

  const compatibleIngredients = useMemo(
    findCompatibleIngredients,
    [selectedIngredients, flavorMap]
  );

  const filteredIngredients = allIngredients.filter(ingredient =>
    ingredient.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedIngredients.includes(ingredient)
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Flavor Combination Finder</h1>
          <span className="text-sm text-gray-500">v{VERSION}</span>
        </div>
        <p className="text-gray-600">
          Search or select ingredients to build your flavor profile.
          Colors indicate compatibility:
          <span className="inline-block px-2 mx-1 bg-green-100 text-green-800 rounded">👍 Perfect</span>
          <span className="inline-block px-2 mx-1 bg-yellow-100 text-yellow-800 rounded">👌 Ok</span>
          <span className="inline-block px-2 mx-1 bg-red-100 text-red-800 rounded">👎 Nah</span>
        </p>
      </div>

      <div className="mb-6 relative">
        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isSearchFocused={isSearchFocused}
          setIsSearchFocused={setIsSearchFocused}
        />
        
        {isSearchFocused && filteredIngredients.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredIngredients.map(ingredient => (
              <button
                key={ingredient}
                onClick={() => {
                  setSelectedIngredients(prev => [...prev, ingredient]);
                  setSearchTerm('');
                  setIsSearchFocused(false);
                }}
                className="block w-full text-left px-3 py-2 hover:bg-gray-100"
              >
                {ingredient}
              </button>
            ))}
          </div>
        )}
      </div>

<div className="mb-6">
    <h2 className="text-lg font-semibold mb-2">Selected Ingredients:</h2>
    <SelectedIngredients
      ingredients={selectedIngredients}
      onRemove={(ingredient) => setSelectedIngredients(prev => prev.filter(i => i !== ingredient))}
      flavorMap={flavorMap}
    />
  </div>

  <div className="grid grid-cols-2 gap-6">
    <div>
      <h2 className="text-lg font-semibold mb-2">Suggested Ingredients:</h2>
      <SuggestedIngredients
        suggestions={compatibleIngredients}
        onSelect={(ingredient) => setSelectedIngredients(prev => [...prev, ingredient])}
        selectedIngredients={selectedIngredients}
        flavorMap={flavorMap}
      />
    </div>
    <div>
      <TasteProfileDisplay 
        selectedIngredients={selectedIngredients}
        ingredientProfiles={ingredientProfiles}
      />
    </div>
    
  </div>
      <div className="mb-6">

  
</div>

      
    </div>
  );
}