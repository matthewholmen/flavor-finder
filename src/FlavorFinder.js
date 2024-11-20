// FlavorFinder.js
import React, { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { flavorPairings } from './data/flavorPairings.ts';
import { experimentalPairings } from './data/experimentalPairings.ts';
import { ingredientProfiles } from './data/ingredientProfiles.ts';
import TasteProfileDisplay from './components/TasteProfileDisplay';
import { SearchBar } from './components/SearchBar.tsx';
import ModeToggle from './components/ModeToggle.jsx';
import { SelectedIngredients } from './components/SelectedIngredients.tsx';
import { SuggestedIngredients } from './components/SuggestedIngredients.tsx';
import { getCompatibilityScore, getCompatibilityColor } from './utils/compatibility.ts';
import { getSortedCompatibleIngredients } from './utils/sorting.ts';
import { filterIngredients } from './utils/categorySearch.ts';
import CategoryFilter from './components/categoryFilter.tsx';
import TasteFilter, { TasteFilter as TasteFilterType } from './components/tasteFilter.tsx';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIES } from './components/categoryFilter.tsx';
import { TASTE_COLORS } from './components/tasteFilter.tsx';


// Version tracking
const VERSION = '2.2.0';
const CHANGELOG = {
  '1.0.0': 'Initial version with basic search and compatibility display',
  '2.0.0': 'Added version control, changelog, and component organization',
  '2.1.0': 'Enhanced suggestion algorithm with taste profile balancing',
  '2.2.0': 'Added experimental mode with expanded flavor pairings'
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

  const max = Math.max(...Object.values(averageScores));
  const min = Math.min(...Object.values(averageScores));
  const targetScore = (max + min) / 2;
  
  return TASTE_PROPERTIES.reduce((acc, taste) => {
    const score = averageScores[taste];
    acc[taste] = targetScore - score;
    return acc;
  }, {});
};

const scoreSuggestion = (ingredient, tasteGaps, compatibility) => {
  const profile = ingredientProfiles.find(p => p.name === ingredient);
  if (!profile || !tasteGaps) return compatibility;

  const gapFillScore = TASTE_PROPERTIES.reduce((score, taste) => {
    const gap = tasteGaps[taste];
    const ingredientScore = profile.flavorProfile[taste];
    
    if (gap > 0 && ingredientScore > 5) {
      score += 2;
    }
    else if (gap < 0 && ingredientScore < 3) {
      score += 1;
    }
    return score;
  }, 0);

  return (compatibility * 0.7) + (gapFillScore * 0.3);
};

const createFlavorMap = (includeExperimental = false) => {
  const flavorMap = new Map();
  
  // Helper to add a pairing to the map
  const addPairing = (ingredient1, ingredient2) => {
    if (!flavorMap.has(ingredient1)) {
      flavorMap.set(ingredient1, new Set());
    }
    if (!flavorMap.has(ingredient2)) {
      flavorMap.set(ingredient2, new Set());
    }
    flavorMap.get(ingredient1).add(ingredient2);
    flavorMap.get(ingredient2).add(ingredient1);
  };

  // Helper to check if pairing exists in either order
  const pairingExists = (ingredient1, ingredient2) => {
    return (flavorMap.get(ingredient1)?.has(ingredient2) || flavorMap.get(ingredient2)?.has(ingredient1));
  };
  
  // Add standard pairings first
  flavorPairings.forEach(pair => {
    const [ingredient1, ingredient2] = pair.split(',');
    if (!ingredient1 || !ingredient2) return;
    addPairing(ingredient1, ingredient2);
  });

  // Add experimental pairings only if they don't exist as standard pairings
  if (includeExperimental) {
    experimentalPairings.forEach(pair => {
      const [ingredient1, ingredient2] = pair.split(',');
      if (!ingredient1 || !ingredient2) return;
      if (!pairingExists(ingredient1, ingredient2)) {
        addPairing(ingredient1, ingredient2);
      }
    });
  }
  
  return {
    flavorMap,
    totalPairings: flavorMap.size
  };
};


// Main Component
export default function FlavorFinder() {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isExperimental, setIsExperimental] = useState(false);
  const [activeCategories, setActiveCategories] = useState([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [selectedTastes, setSelectedTastes] = useState([]);
  const [isTasteOpen, setIsTasteOpen] = useState(false);
    // Add these missing states
    const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
    const [isTasteFilterOpen, setIsTasteFilterOpen] = useState(true);


  useEffect(() => {
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      setIsCategoryOpen(false);
      setIsTasteOpen(false);
      setIsSearchFocused(false);
    }
  };

  document.addEventListener('keydown', handleEscape);
  
  // Cleanup
  return () => {
    document.removeEventListener('keydown', handleEscape);
  };
}, []);

  
  const { flavorMap, totalPairings } = useMemo(
    () => createFlavorMap(isExperimental),
    [isExperimental]
  );
  
  const allIngredients = useMemo(() => 
    Array.from(flavorMap.keys()).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    ), 
    [flavorMap]
  );

  const findCompatibleIngredients = () => {
    if (selectedIngredients.length === 0) return [];
    

    
    
    // Get all ingredients that pair with any selected ingredient
    const compatibleSet = new Set();
    selectedIngredients.forEach(selected => {
      const pairings = flavorMap.get(selected);
      if (pairings) {
        pairings.forEach(ingredient => {
          if (!selectedIngredients.includes(ingredient)) {
            compatibleSet.add(ingredient);
          }
        });
      }
    });

    // Convert to array and sort by compatibility score
    return Array.from(compatibleSet)
      .sort((a, b) => {
        const scoreA = getCompatibilityScore(a, selectedIngredients, flavorMap);
        const scoreB = getCompatibilityScore(b, selectedIngredients, flavorMap);
        return scoreB - scoreA; // Sort highest to lowest
      });
  };

  const compatibleIngredients = useMemo(
    () => getSortedCompatibleIngredients(selectedIngredients, flavorMap),
    [selectedIngredients, flavorMap]
  );

  const filteredIngredients = useMemo(() => {
    return filterIngredients(
      allIngredients,
      { 
        searchTerm, 
        activeCategories,
        tasteCriteria: selectedTastes 
      },
      ingredientProfiles,
      selectedIngredients
    );
  }, [allIngredients, searchTerm, activeCategories, selectedTastes, ingredientProfiles, selectedIngredients]);



return (
  <div className="h-screen flex flex-col">
    {/* Fixed Search Header */}
    <header className="p-4 border-b shadow-sm">
      <div className="max-w-7xl mx-auto">
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
          activeCategories={activeCategories}
          setActiveCategories={setActiveCategories}
          ingredientProfiles={ingredientProfiles}
        />
      </div>
    </header>

{/* Main Grid Layout */}
<div className="max-w-7xl mx-auto px-4">  {/* Added container */}

<div className="grid grid-cols-3 gap-4 overflow-hidden">
        {/* Categories and Taste Filter Column */}
        <div className="p-4 border-r overflow-y-auto">
          <div className="mb-6">
            <div className="flex justify-between items-center cursor-pointer mb-4" 
            >
              <h2 className="text-lg font-semibold">Categories</h2>
            </div>
            {isCategoriesOpen && (
              <CategoryFilter 
                selectedCategories={activeCategories}
                onChange={setActiveCategories}
                isOpen={isCategoryOpen}
                setIsOpen={setIsCategoryOpen}
              />
            )}
          </div>

          <div className="mb-6">
            <div 
              className="flex justify-between items-center cursor-pointer mb-4" 
              onClick={() => setIsTasteFilterOpen(!isTasteFilterOpen)}
            >
              <h2 className="text-lg font-semibold">Taste Filter</h2>
              {isTasteFilterOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            {isTasteFilterOpen && (
              <TasteFilter 
                selectedTastes={selectedTastes}
                onChange={setSelectedTastes}
                isOpen={isTasteOpen}
                setIsOpen={setIsTasteOpen}
              />
            )}
          </div>
        </div>          
        

      {/* Suggestions Column */}
      <div className="p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Suggested Ingredients</h2>
        <SuggestedIngredients
          suggestions={(() => {
            // Start with all ingredients except already selected ones
            const suggestions = allIngredients
              .filter(ingredient => {

                
                // Skip already selected ingredients
                if (selectedIngredients.includes(ingredient)) return false;
          
                // Get ingredient profile
                const profile = ingredientProfiles.find(p => 
                  p.name.toLowerCase() === ingredient.toLowerCase()
                );
                
                // If no profile found, don't show
                if (!profile) return false;
                
                // Apply taste filters if any are selected
                if (selectedTastes.length > 0) {
                  if (!selectedTastes.every(({ taste, minIntensity }) => 
                    profile.flavorProfile[taste] >= minIntensity
                  )) return false;
                }
          
                // Check compatibility - must have at least some compatibility
                const compatibilityScore = getCompatibilityScore(ingredient, selectedIngredients, flavorMap);
                return compatibilityScore > 0;
              })
              // Sort by compatibility score
              .sort((a, b) => {
                const scoreA = getCompatibilityScore(a, selectedIngredients, flavorMap);
                const scoreB = getCompatibilityScore(b, selectedIngredients, flavorMap);
                return scoreB - scoreA;
              });
              
            // Find the perfect matches (100% compatible)
            const perfectMatches = suggestions.filter(ingredient => 
              getCompatibilityScore(ingredient, selectedIngredients, flavorMap) === 100
            );
          
            // If we have enough perfect matches, just return those
            if (perfectMatches.length >= 20) {
              return perfectMatches;
            }
          
            // Otherwise, return all perfect matches plus enough lower-scoring ones to reach 20
            return [
              ...perfectMatches,
              ...suggestions
                .filter(ingredient => 
                  !perfectMatches.includes(ingredient)
                )
                .slice(0, 20 - perfectMatches.length)
            ];
          })()}
          

          onSelect={(ingredient) => setSelectedIngredients(prev => [...prev, ingredient])}
                  selectedIngredients={selectedIngredients}
                  flavorMap={flavorMap}
                  experimentalPairings={experimentalPairings}
                  flavorPairings={flavorPairings}
                  activeCategories={activeCategories}
                  ingredientProfiles={ingredientProfiles}
/>
      </div>

      {/* Selected Ingredients Column */}
      <div className="p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Selected Ingredients</h2>
        <div className="space-y-4">
          <SelectedIngredients
            ingredients={selectedIngredients}
            onRemove={(ingredient) => setSelectedIngredients(prev => prev.filter(i => i !== ingredient))}
            flavorMap={flavorMap}
            ingredientProfiles={ingredientProfiles}
          />
        </div>
      </div>
    </div>
    </div>
  </div>
);
}