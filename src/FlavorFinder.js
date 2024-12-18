// FlavorFinder.js
import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, ChartPieIcon, Table } from 'lucide-react';
import { flavorPairings } from './data/flavorPairings.ts';
import { experimentalPairings } from './data/experimentalPairings.ts';
import { ingredientProfiles } from './data/ingredientProfiles.ts';
import { SuggestedIngredients } from './components/SuggestedIngredients.tsx';
import { getCompatibilityScore, getCompatibilityColor } from './utils/compatibility.ts';
import { getSortedCompatibleIngredients } from './utils/sorting.ts';
import IngredientSlot from './components/IngredientSlot.tsx';
import { TASTE_COLORS } from './utils/colors.ts';
import InfoTooltip from './components/InfoTooltip.js';
import TasteAnalysisModal from './components/TasteAnalysisModal.tsx';
import FlavorMatrixModal from './components/FlavorMatrixModal.tsx';


const getIngredientColor = (profile) => {
  if (!profile) return 'rgb(249 250 251)'; // or 'bg-gray-50' for Tailwind
  
  let dominantTaste = 'sweet';
  let maxValue = -1;
  
  Object.entries(profile.flavorProfile).forEach(([taste, value]) => {
    if (value > maxValue) {
      maxValue = value;
      dominantTaste = taste;
    }
  });

  if (maxValue <= 0) return 'rgb(249 250 251)';
  
  return TASTE_COLORS[dominantTaste];
};

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
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [lockedIngredients, setLockedIngredients] = useState(new Set());
  const [editingSlot, setEditingSlot] = useState(null);
  const [randomCount, setRandomCount] = useState(4);
  const [isExperimental, setIsExperimental] = useState(false);
  const [slotFilters, setSlotFilters] = useState({});
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);


  // Random pairing on start
  useEffect(() => {
    if (selectedIngredients.length === 0) {
      const initialPair = getRandomIngredients(0);
      setSelectedIngredients(initialPair);
    }
  }, []); // Empty dependency array means this runs once on mount


  const addRandomIngredient = () => {
    if (selectedIngredients.length >= 5) return;
  
    // Get initial pool of ingredients
    const currentPool = selectedIngredients.length === 0 
      ? Array.from(flavorMap.keys())
      : Array.from(flavorMap.get(selectedIngredients[0]) || []);
  
    // Filter pool to only ingredients compatible with all current selections
    const compatiblePool = currentPool.filter(ingredient => 
      selectedIngredients.every(selected => 
        flavorMap.get(selected)?.has(ingredient)
      )
    );
  
    if (compatiblePool.length > 0) {
      const randomIndex = Math.floor(Math.random() * compatiblePool.length);
      const newIngredient = compatiblePool[randomIndex];
      setSelectedIngredients(prev => [...prev, newIngredient]);
    }
  };
  
  

  const [tasteValues, setTasteValues] = useState({
    sweet: 5,
    salty: 5,
    sour: 5,
    bitter: 5,
    umami: 5,
    fat: 5,
    spicy: 5
  });

  const [defaultTasteValues] = useState({
    sweet: 5,
    salty: 5,
    sour: 5,
    bitter: 5,
    umami: 5,
    fat: 5,
    spicy: 5
  });
  
  const handleLockToggle = (index) => {
    setLockedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };
  
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
    if (selectedIngredients.length >= 5) {
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


// Updated getRandomIngredients function
const getRandomIngredients = (count = 5, startFresh = false, existingLocked = [], existingIngredients = new Set()) => {
  let selections = [];
  let maxAttempts = 100;
  
  // Create a Set of all ingredients we want to exclude
  const excludeSet = new Set([...existingIngredients, ...selections]);
  
  while (selections.length < count && maxAttempts > 0) {
    // For the first ingredient, we need to ensure compatibility with locked ingredients
    if (selections.length === 0) {
      let fullPool = Array.from(flavorMap.keys())
        .filter(ingredient => !excludeSet.has(ingredient));
      
      // If we have locked ingredients, filter for compatibility
      if (existingLocked.length > 0) {
        fullPool = fullPool.filter(ingredient => 
          existingLocked.every(locked => 
            flavorMap.get(locked)?.has(ingredient)
          )
        );
      }
      
      if (fullPool.length > 0) {
        const randomIndex = Math.floor(Math.random() * fullPool.length);
        selections.push(fullPool[randomIndex]);
        excludeSet.add(fullPool[randomIndex]);
        continue;
      }
    }
    
    // For subsequent ingredients, ensure compatibility with ALL previous selections AND locked ingredients
    let compatiblePool = Array.from(flavorMap.keys()).filter(candidate => {
      // Skip if already selected or excluded
      if (excludeSet.has(candidate)) return false;
      
      // Check compatibility with ALL current selections AND locked ingredients
      const allIngredientsToCheck = [...selections, ...existingLocked];
      return allIngredientsToCheck.every(existing => {
        const pairings = flavorMap.get(existing);
        return pairings?.has(candidate);
      });
    });
    
    if (compatiblePool.length > 0) {
      const randomIndex = Math.floor(Math.random() * compatiblePool.length);
      const selectedIngredient = compatiblePool[randomIndex];
      selections.push(selectedIngredient);
      excludeSet.add(selectedIngredient);
    } else {
      // If we can't find a compatible ingredient, break to avoid infinite loop
      break;
    }
    
    maxAttempts--;
  }
  
  return selections;
};

// Updated handleRandomize function
const handleRandomize = () => {
  // If no ingredients selected yet, do a fresh randomization
  if (selectedIngredients.length === 0) {
    const randomIngredients = getRandomIngredients(5, true);
    setSelectedIngredients(randomIngredients);
    return;
  }

  // Track both locked positions and values
  const lockedPositions = new Set();
  const lockedIngredientsList = [];
  let newIngredients = Array(5).fill(undefined);

  // First, preserve locked ingredients in their positions
  selectedIngredients.forEach((ingredient, index) => {
    if (lockedIngredients.has(index)) {
      lockedPositions.add(index);
      lockedIngredientsList.push(ingredient);
      newIngredients[index] = ingredient;
    }
  });

  // Then get new random selections, ensuring compatibility with locked ingredients
  const randomSelections = getRandomIngredients(
    5 - lockedPositions.size,     
    false,                        // Don't start fresh - consider locked ingredients
    lockedIngredientsList,        // Pass the actual locked ingredients
    new Set(lockedIngredientsList)// Exclude locked ingredients from being picked again
  );

  // Fill remaining positions with new selections
  let selectionIndex = 0;
  for (let i = 0; i < 5; i++) {
    if (!lockedPositions.has(i)) {
      newIngredients[i] = randomSelections[selectionIndex];
      selectionIndex++;
    }
  }

  setSelectedIngredients(newIngredients.filter(Boolean));
};

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [activeCategories, setActiveCategories] = useState([]);
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only handle space if search isn't focused and no modals are open
      if (e.code === 'Space' && !isSearchFocused && !editingSlot) {
        e.preventDefault(); // Prevent page scroll
        handleRandomize();  // This will use the latest version of handleRandomize
      }
    };
  
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isSearchFocused, editingSlot, lockedIngredients]); // Removed handleRandomize from dependencies

const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
const [activeCategory, setActiveCategory] = useState('');

return (
  <div className="h-screen flex overflow-hidden">
    {/* Left Column (50%) */}
    <div className="w-full md:w-1/2 flex flex-col border-r border-gray-200">
  {/* Header */}

        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <img 
          src="/flavor-finder-1.png" 
          alt="Flavor Finder Logo" 
          className="h-12 w-auto object-contain"
        />
        <div className="flex items-center space-x-2">
        
          <button 
            onClick={() => setIsAnalysisModalOpen(true)}
            className="px-4 py-2 border-2 border-[#72A8D5] text-[#000000] hover:bg-[#72A8D5] hover:text-white rounded-full font-sans flex items-center gap-2 transition-colors"
          >
            <ChartPieIcon size={16} />
            Analyze
          </button>
          <button 
            onClick={handleRandomize}
            className="px-4 py-2 border-2 border-[#8DC25B] text-[#000000] hover:bg-[#8DC25B] hover:text-white rounded-full font-sans flex items-center gap-2 transition-colors"
          >
            <Sparkles size={16} />
            Generate
          </button>
        </div>
      </div>


      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
  {/* Filters and Suggestions wrapper */}
  <div className="flex-1 p-4 pb-0 overflow-y-auto border-b border-gray-200">
  {/* Top Filters Section */}
    <div className="space-y-2 md:space-y-4">
          <SuggestedIngredients
            suggestions={compatibleIngredients}
            onSelect={handleIngredientSelect}
            selectedIngredients={selectedIngredients}
            flavorMap={flavorMap}
            experimentalPairings={[]}
            flavorPairings={[]}
            activeCategories={activeCategory ? [activeCategory] : []}
            ingredientProfiles={ingredientProfiles}
            tasteValues={tasteValues}
            activeSliders={activeSliders}
            onTasteValuesChange={updateTasteIntensity}
            onToggleSlider={toggleSlider}
            setIsSearchFocused={setIsSearchFocused}
            className="h-[calc(100vh-16rem)] md:h-[calc(100vh-24rem)]"
          />
        </div>
        </div>
            {/* Fixed bottom section */}
    <div className="p-2">
      <InfoTooltip />
    </div>

      </div>
    </div>

{/* Right Column (50%): Selected Ingredients */}
<div className="w-full md:w-1/2 flex flex-col h-screen">
  {[...Array(5)].map((_, index) => (
    <div 
      key={`slot-${index}`}
      className="h-1/5 w-full md:min-h-[120px]"
    >
      <IngredientSlot
        ingredient={selectedIngredients[index]}
        isLocked={lockedIngredients.has(index)}
        onLockToggle={() => handleLockToggle(index)}
        onRemove={() => {
          setSelectedIngredients(prev => {
            const next = [...prev];
            next[index] = undefined;
            return next.filter(Boolean);
          });
        }}
        onEdit={() => setEditingSlot(index)}
        profile={ingredientProfiles.find(
          p => p.name.toLowerCase() === selectedIngredients[index]?.toLowerCase()
        )}
        index={index}
        flavorMap={flavorMap}
        selectedIngredients={selectedIngredients}
        className="h-full p-2 md:p-4"
      />
    </div>
  ))}
</div>
<TasteAnalysisModal
  isOpen={isAnalysisModalOpen}
  onClose={() => setIsAnalysisModalOpen(false)}
  selectedIngredients={selectedIngredients}
  ingredientProfiles={ingredientProfiles}
  onIngredientsChange={setSelectedIngredients}
  flavorMap={flavorMap} // Fix: Pass the entire flavorMap object
/>
<FlavorMatrixModal 
  isOpen={isMatrixModalOpen}
  onClose={() => setIsMatrixModalOpen(false)}
  selectedIngredients={selectedIngredients}
  flavorMap={flavorMap}
/>
  </div>
);
}