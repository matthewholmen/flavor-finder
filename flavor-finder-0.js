// FlavorFinder.js
import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { flavorPairings } from './data/flavorPairings.ts';
import { ingredientProfiles } from './data/ingredientProfiles.ts';
import TasteProfileDisplay from './components/TasteProfileDisplay.jsx';
import { SearchBar } from './components/SearchBar.tsx';
import { SelectedIngredients } from './components/SelectedIngredients.tsx';

// Version tracking
const VERSION = '2.1.0';
const CHANGELOG = {
  '1.0.0': 'Initial version with basic search and compatibility display',
  '2.0.0': 'Added version control, changelog, and component organization',
  '2.1.0': 'Enhanced suggestion algorithm with taste profile balancing'
};

// Helper functions for taste analysis
const TASTE_PROPERTIES = ['sweet', 'salty', 'sour', 'bitter', 'umami', 'fat', 'spicy'];

const calculateAverageScores = (ingredients) => {
  const profiles = ingredients
    .map(ingredient => ingredientProfiles.find(p => p.name.toLowerCase() === ingredient.toLowerCase()))
    .filter(Boolean);

  if (profiles.length === 0) return null;

  return TASTE_PROPERTIES.reduce((acc, taste) => {
    acc[taste] = profiles.reduce((sum, profile) => sum + profile.flavorProfile[taste], 0) / profiles.length;
    return acc;
  }, {});
};

const identifyTasteGaps = (averageScores) => {
  if (!averageScores) return null;

  // Find the range of scores
  const max = Math.max(...Object.values(averageScores));
  const min = Math.min(...Object.values(averageScores));
  const range = max - min;

  // Calculate target scores for balance
  const targetScore = (max + min) / 2;
  
  return TASTE_PROPERTIES.reduce((acc, taste) => {
    const score = averageScores[taste];
    // Calculate how much this taste needs to be increased (positive) or decreased (negative)
    acc[taste] = targetScore - score;
    return acc;
  }, {});
};

const scoreSuggestion = (ingredient, tasteGaps, compatibility) => {
  const profile = ingredientProfiles.find(p => p.name === ingredient);
  if (!profile || !tasteGaps) return compatibility;

  // Calculate how well this ingredient fills the taste gaps
  const gapFillScore = TASTE_PROPERTIES.reduce((score, taste) => {
    const gap = tasteGaps[taste];
    const ingredientScore = profile.flavorProfile[taste];
    
    // If we need more of this taste (positive gap) and ingredient has it, increase score
    if (gap > 0 && ingredientScore > 5) {
      score += 2;
    }
    // If we need less of this taste (negative gap) and ingredient is low in it, increase score
    else if (gap < 0 && ingredientScore < 3) {
      score += 1;
    }
    return score;
  }, 0);

  // Combine compatibility score with gap-filling score
  // Weight compatibility more heavily (70%) than gap-filling (30%)
  return (compatibility * 0.7) + (gapFillScore * 0.3);
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
  });
  
  return {
    flavorMap,
    totalPairings: flavorPairings.length
  };
};

const getCompatibilityScore = (ingredient, otherIngredients, flavorMap) => {
  if (otherIngredients.length === 0) return 100;
  
  const pairings = flavorMap.get(ingredient);
  if (!pairings) return 0;
  
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

const SuggestedIngredients = ({ suggestions, onSelect, selectedIngredients, flavorMap }) => {
  const averageScores = useMemo(() => 
    calculateAverageScores(selectedIngredients),
    [selectedIngredients]
  );

  const tasteGaps = useMemo(() => 
    identifyTasteGaps(averageScores),
    [averageScores]
  );

  const sortedSuggestions = useMemo(() => {
    return suggestions.map(ingredient => {
      const compatibilityScore = getCompatibilityScore(ingredient, selectedIngredients, flavorMap);
      const totalScore = scoreSuggestion(ingredient, tasteGaps, compatibilityScore);
      return { ingredient, score: totalScore };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.ingredient);
  }, [suggestions, selectedIngredients, tasteGaps]);

  return (
    <div className="border rounded-lg p-4 h-96 overflow-y-auto">
      {sortedSuggestions.length > 0 ? (
        sortedSuggestions.map(ingredient => {
          const compatibilityScore = getCompatibilityScore(ingredient, selectedIngredients, flavorMap);
          const colorClass = getCompatibilityColor(compatibilityScore);
          const profile = ingredientProfiles.find(p => p.name === ingredient);
          
          return (
            <button
              key={ingredient}
              onClick={() => onSelect(ingredient)}
              className={`block w-full text-left px-3 py-2 rounded mb-1 ${colorClass}`}
              title={`${compatibilityScore.toFixed(0)}% compatible`}
            >
              <div className="flex justify-between items-center">
                <span>{ingredient}</span>
                {profile && tasteGaps && (
                  <span className="text-sm opacity-75">
                    {Object.entries(tasteGaps)
                      .filter(([taste, gap]) => Math.abs(gap) > 2 && profile.flavorProfile[taste] > 5)
                      .map(([taste]) => taste)
                      .join(', ')}
                  </span>
                )}
              </div>
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
};

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
    
    return [...compatibleSets[0]].filter(ingredient =>
      !selectedIngredients.includes(ingredient)
    );
  };

  const compatibleIngredients = useMemo(
    findCompatibleIngredients,
    [selectedIngredients, flavorMap]
  );

  const filteredIngredients = allIngredients.filter(ingredient =>
    // Check if the ingredient starts with the search term
    ingredient.toLowerCase().startsWith(searchTerm.toLowerCase()) &&
    // Ensure it's not already selected
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
      <div className="mb-6 relative">
    <SearchBar
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      isSearchFocused={isSearchFocused}
      setIsSearchFocused={setIsSearchFocused}
      filteredIngredients={filteredIngredients}
      onIngredientSelect={(ingredient) => {
        setSelectedIngredients(prev => [...prev, ingredient]);
        setSearchTerm('');
        setIsSearchFocused(false);
      }}
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
        
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Selected Ingredients:</h2>
        <SelectedIngredients
  ingredients={selectedIngredients}
  onRemove={(ingredient) => setSelectedIngredients(prev => prev.filter(i => i !== ingredient))}
  flavorMap={flavorMap}
  ingredientProfiles={ingredientProfiles}
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
    </div>
  );
}
