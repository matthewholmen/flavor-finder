// FlavorFinder.js
import MobileSearchSheet from './components/MobileSearchSheet.tsx';
import React, { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
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
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIES } from './components/categoryFilter.tsx';
import CompactTasteSliders, { TasteValues } from './components/CompactTasteSliders.tsx';

// Helper functions for taste analysis
const TASTE_PROPERTIES = ['sweet', 'salty', 'sour', 'bitter', 'umami', 'fat', 'spicy'];

const filterByTasteValues = (ingredients, tasteValues) => {
  return ingredients.filter((ingredient) => {
    const profile = ingredientProfiles.find(
      (p) => p.name.toLowerCase() === ingredient.toLowerCase()
    );

    if (!profile) return false;

    // Check if all flavor values meet or exceed slider values
    return Object.entries(tasteValues).every(([taste, minValue]) => {
      return profile.flavorProfile[taste] >= minValue;
    });
  });
};

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
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [isExperimental, setIsExperimental] = useState(false);
  const [activeCategories, setActiveCategories] = useState([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
  const [isTasteFilterOpen, setIsTasteFilterOpen] = useState(true);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [randomCount, setRandomCount] = useState(3); // default to 3 ingredients

  const [tasteValues, setTasteValues] = useState({
    sweet: 2,
    salty: 2,
    sour: 2,
    bitter: 2,
    umami: 2,
    fat: 2,
    spicy: 2,
  });

  
  const [activeSliders, setActiveSliders] = useState(new Set());

  const toggleSlider = (taste) => {
    setActiveSliders(prevSliders => {
      const newSliders = new Set(prevSliders);
      if (newSliders.has(taste)) {
        newSliders.delete(taste);
      } else {
        newSliders.add(taste);
      }
      return newSliders;
    });
  };

  const updateTasteIntensity = (values) => {
    setTasteValues(values);
  };
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setIsCategoryOpen(false);
      }
    };

    
    document.addEventListener("keydown", handleEscape);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const { flavorMap, totalPairings } = useMemo(
    () => createFlavorMap(isExperimental),
    [isExperimental]
  );

  const allIngredients = useMemo(
    () =>
      Array.from(flavorMap.keys()).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      ),
    [flavorMap]
  );

  // Dynamically filter ingredients based on taste values and categories

  const handleIngredientSelect = (ingredient) => {
    if (selectedIngredients.length >= 10) {
      // Optional: add toast/notification here
      return;
    }
    setSelectedIngredients((prev) => [...prev, ingredient]);
  };

  const findCompatibleIngredients = () => {
    if (selectedIngredients.length === 0) {
      return Array.from(allIngredients).filter(ingredient => {
        const profile = ingredientProfiles.find(p => 
          p.name.toLowerCase() === ingredient.toLowerCase()
        );
        if (!profile) return false;
        
        return Array.from(activeSliders).every(taste => 
          profile.flavorProfile[taste] >= tasteValues[taste]
        );
      });
    }
  
    // Get all ingredients that pair with any selected ingredient
    const compatibleSet = new Set();
    selectedIngredients.forEach((selected) => {
      const pairings = flavorMap.get(selected);
      if (pairings) {
        pairings.forEach((ingredient) => {
          if (!selectedIngredients.includes(ingredient)) {
            compatibleSet.add(ingredient);
          }
        });
      }
    });
  
    // Convert to array and filter by taste values
    return Array.from(compatibleSet)
      .filter(ingredient => {
        const profile = ingredientProfiles.find(p => 
          p.name.toLowerCase() === ingredient.toLowerCase()
        );
        
        if (!profile) return false;
  
        // Only apply taste filters for active sliders
        return Object.entries(tasteValues).every(([taste, minValue]) => {
          if (!activeSliders.has(taste)) return true;
          return profile.flavorProfile[taste] >= minValue;
        });
      })
      .sort((a, b) => {
        const scoreA = getCompatibilityScore(a, selectedIngredients, flavorMap);
        const scoreB = getCompatibilityScore(b, selectedIngredients, flavorMap);
        return scoreB - scoreA; // Sort highest to lowest
      });
  };
  const compatibleIngredients = useMemo(
    () => getSortedCompatibleIngredients(
      selectedIngredients, 
      flavorMap, 
      ingredientProfiles,
      tasteValues,
      activeSliders
    ),
    [selectedIngredients, flavorMap, ingredientProfiles, tasteValues, activeSliders]
  );


  const getRandomIngredients = (count = 5) => {
    console.log("Starting randomization with count:", count);
    
    if (count < 1) return [];
  
    // Get initial pool of ingredients
    const initialPool = selectedIngredients.length === 0 
      ? Array.from(flavorMap.keys())
      : Array.from(flavorMap.get(selectedIngredients[0]) || []);
  
    console.log("Initial pool size:", initialPool.length);
    
    const selections = [];
    let currentPool = [...initialPool];
  
    // Pre-calculate all pairings maps to avoid repeated lookups
    const getPairingsForIngredient = (ingredient) => {
      if (!flavorMap.has(ingredient)) {
        // Create empty set if ingredient not found
        flavorMap.set(ingredient, new Set());
      }
      return flavorMap.get(ingredient);
    };
  
    while (selections.length < count && currentPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * currentPool.length);
      const candidate = currentPool[randomIndex];
      
      // Check compatibility with all previously selected ingredients
      const isCompatible = selections.length === 0 || selections.every(selected => {
        const candidatePairings = getPairingsForIngredient(candidate);
        return candidatePairings.has(selected);
      });
  
      if (isCompatible) {
        selections.push(candidate);
        
        // Update pool more efficiently - only check against the new selection
        const candidatePairings = getPairingsForIngredient(candidate);
        currentPool = currentPool.filter(ingredient => 
          ingredient !== candidate && // Remove selected ingredient
          candidatePairings.has(ingredient) && // Must be compatible with new selection
          selections.every(selected => // Must be compatible with all previous selections
            getPairingsForIngredient(selected).has(ingredient)
          )
        );
        
        console.log("Selected compatible ingredient:", candidate);
        console.log("Current pool size:", currentPool.length);
      } else {
        // Remove incompatible candidate from pool
        currentPool.splice(randomIndex, 1);
      }
    }
  
    console.log("Final compatible selections:", selections);
    return selections;
  };

  const handleRandomize = () => {
    console.log("Starting randomization...");  // Debug log
    setSelectedIngredients([]);
    const randomlySelected = getRandomIngredients(randomCount);
    console.log("Random selections:", randomlySelected); // Debug log
    
    // Only add if we have results
    if (randomlySelected.length > 0) {
      setSelectedIngredients(prev => {
        // Make sure we don't exceed 10 total ingredients
        const combined = [...prev, ...randomlySelected];
        return combined.slice(0, 10);
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pb-32">
        <div className="max-w-6xl mx-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="md:hidden z-height fixed right-4 bottom-32 w-12 h-12 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center"
            >
              <Search size={20} />
            </button>

            <MobileSearchSheet
              isOpen={isMobileSearchOpen}
              onClose={() => setIsMobileSearchOpen(false)}
              activeCategories={activeCategories}
              setActiveCategories={setActiveCategories}
              tasteValues={tasteValues}
              setTasteValues={setTasteValues}
              activeSliders={activeSliders}
              setActiveSliders={setActiveSliders}
            >
              <SuggestedIngredients
                  suggestions={compatibleIngredients}
                  onSelect={handleIngredientSelect}
                  selectedIngredients={selectedIngredients}
                  flavorMap={flavorMap}
                  experimentalPairings={experimentalPairings}
                  flavorPairings={flavorPairings}
                  activeCategories={activeCategories}
                  ingredientProfiles={ingredientProfiles}
                  tasteValues={tasteValues}
                  activeSliders={activeSliders}
                />
            </MobileSearchSheet>

{/* Suggested Ingredients - Left Column */}
<div className="space-y-2 order-2 md:order-1">
  <h2 className="text-lg font-semibold">Suggested Ingredients</h2>
  <SuggestedIngredients
    suggestions={selectedIngredients.length > 0 ? compatibleIngredients : Array.from(flavorMap.keys())}
    onSelect={handleIngredientSelect}
    selectedIngredients={selectedIngredients}
    flavorMap={flavorMap}
    experimentalPairings={experimentalPairings}
    flavorPairings={flavorPairings}
    activeCategories={activeCategories}
    ingredientProfiles={ingredientProfiles}
    tasteValues={tasteValues}
    activeSliders={activeSliders}
  />
</div>

{/* Selected Ingredients - Right Column */}
<div className="space-y-2 order-1 md:order-2">
  <h2 className="text-lg font-semibold">Selected Ingredients</h2>
  <SelectedIngredients
    ingredients={selectedIngredients}
    onRemove={(ingredient) => setSelectedIngredients(prev => 
      prev.filter(i => i !== ingredient)
    )}
    flavorMap={flavorMap}
    ingredientProfiles={ingredientProfiles}
  />
</div>
          </div>
        </div>
      </main>

{/* Fixed Bottom Search Section */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
                    {/* Filter Section */}
                    <div className="p-4 border-b">
                      {/* Category Pills */}
                      <div className="p-3 pt-4 px-2">
                        <div className="flex gap-2 overflow-x-auto">
                        {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => {
                  if (activeCategories) {
                    setActiveCategories(
                      activeCategories.includes(category)
                        ? activeCategories.filter(c => c !== category)
                        : [...activeCategories, category]
                    )
                  }
                }}
                className={`flex-none px-3 py-1 rounded-full text-sm transition-colors ${
                  activeCategories?.includes(category)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
            </div>
          </div>

          {/* Taste Sliders */}
          <CompactTasteSliders
                values={tasteValues}
                onChange={setTasteValues}
                activeSliders={activeSliders}
                onToggleSlider={(taste) => {
                  console.log('Toggling:', taste); // Debug log
                  const newActive = new Set(activeSliders);
                  if (newActive.has(taste)) {
                    newActive.delete(taste);
                  } else {
                    newActive.add(taste);
                  }
                  setActiveSliders(newActive);
                  console.log('New active sliders:', Array.from(newActive)); // Debug log
                }}
              />  

              {/* Randomizer Controls */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="random-count" className="text-sm font-medium text-gray-700">
                    Random ingredients:
                  </label>
                  <input
                    id="random-count"
                    type="number"
                    min="1"
                    max={Math.min(5, 10 - selectedIngredients.length)}
                    value={Math.min(randomCount, 10 - selectedIngredients.length)}
                    onChange={(e) => setRandomCount(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-16 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={selectedIngredients.length >= 10}
                  />
                </div>
                <button
                  onClick={handleRandomize}
                  disabled={selectedIngredients.length >= 10}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative group"
                  title="Generates random compatible ingredients considering your taste preferences"
                >
                  Randomize!
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    Considers taste filters and compatibility
                  </div>
                </button>
              </div>
     </div>

        
      </div>
      <MobileSearchSheet
  isOpen={isMobileSearchOpen}
  onClose={() => setIsMobileSearchOpen(false)}
  activeCategories={activeCategories}
  setActiveCategories={setActiveCategories}
  tasteValues={tasteValues}
  setTasteValues={setTasteValues}
  activeSliders={activeSliders}
  setActiveSliders={setActiveSliders}>
    </MobileSearchSheet>
  </div>
);

}