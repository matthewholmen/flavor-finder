// FlavorFinder.js
import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { flavorPairings } from './data/flavorPairings.ts';
import { experimentalPairings } from './data/experimentalPairings.ts';
import { ingredientProfiles } from './data/ingredientProfiles.ts';
import { ThemeToggle } from './components/ThemeToggle.jsx';  
import { SuggestedIngredients } from './components/SuggestedIngredients.tsx';
import { getCompatibilityScore, getCompatibilityColor } from './utils/compatibility.ts';
import { getSortedCompatibleIngredients } from './utils/sorting.ts';
import IngredientSlot from './components/IngredientSlot.tsx';
import { TASTE_COLORS } from './utils/colors.ts';


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
    if (selectedIngredients.length >= 4) {
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
const getRandomIngredients = (count = 4, startFresh = false, existingLocked = [], existingIngredients = new Set()) => {
  let selections = [];
  let maxAttempts = 100;
  
  // Create a Set of all ingredients we want to exclude
  const excludeSet = new Set([...existingIngredients, ...selections]);
  
  while (selections.length < count && maxAttempts > 0) {
    // For the first ingredient, use the full pool
    if (selections.length === 0) {
      const fullPool = Array.from(flavorMap.keys())
        .filter(ingredient => !excludeSet.has(ingredient));
      
      if (fullPool.length > 0) {
        const randomIndex = Math.floor(Math.random() * fullPool.length);
        selections.push(fullPool[randomIndex]);
        excludeSet.add(fullPool[randomIndex]);
        continue;
      }
    }
    
    // For subsequent ingredients, ensure compatibility with ALL previous selections
    let compatiblePool = Array.from(flavorMap.keys()).filter(candidate => {
      // Skip if already selected or excluded
      if (excludeSet.has(candidate)) return false;
      
      // Check if candidate is compatible with ALL current selections
      // and that ALL current selections are compatible with each other
      for (let i = 0; i < selections.length; i++) {
        const pairings = flavorMap.get(selections[i]);
        if (!pairings || !pairings.has(candidate)) return false;
        
        // Check if this candidate maintains compatibility between existing selections
        for (let j = i + 1; j < selections.length; j++) {
          const existingPairings = flavorMap.get(selections[j]);
          if (!existingPairings || !existingPairings.has(candidate)) return false;
        }
      }
      return true;
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
    const randomIngredients = getRandomIngredients(4, true);
    setSelectedIngredients(randomIngredients);
    return;
  }

  // Track both locked positions and values using Sets
  const lockedPositions = new Set();
  const lockedValues = new Set();
  let newIngredients = Array(4).fill(undefined);

  // First, preserve locked ingredients in their positions
  selectedIngredients.forEach((ingredient, index) => {
    if (lockedIngredients.has(index)) {
      lockedPositions.add(index);
      lockedValues.add(ingredient);
      newIngredients[index] = ingredient;
    }
  });

  // Then get new random selections, excluding locked ingredients entirely
  const randomSelections = getRandomIngredients(
    4 - lockedPositions.size,     // how many new ones we need
    true,                         // fresh start (changed this to true!)
    [],                          // no locked ingredients in starting set
    lockedValues                 // exclude these from being picked
  );

  // Fill remaining positions with new selections
  let selectionIndex = 0;
  for (let i = 0; i < 4; i++) {
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
      handleRandomize();
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [isSearchFocused, editingSlot, handleRandomize]);

const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
const [activeCategory, setActiveCategory] = useState('');

return (
  <div className="h-screen flex bg-white dark:bg-gray-900 overflow-hidden">
    {/* Left Column (50%) */}
    <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700 ">
      {/* Header row */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <img 
          src="/flavor-finder-1.png" 
          alt="Flavor Finder Logo" 
          className="h-12 w-auto object-contain"
        />
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <button 
            onClick={handleRandomize}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Sparkles size={16} />
            Randomize!
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
  {/* Filters and Suggestions wrapper */}
  <div className="flex-1 p-4 overflow-y-auto">
    {/* Top Filters Section */}
    <div className="space-y-4">
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
          />
        </div>
        </div>

        {/* Filters section - now at bottom */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        </div>
      </div>
    </div>

    {/* Right Column (50%): Selected Ingredients */}
<div className="w-1/2 flex flex-col h-screen">
  {[...Array(4)].map((_, index) => (
    <div 
      key={`slot-${index}`}
      className="h-1/4 w-full"
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
      />
    </div>
  ))}
</div>
  </div>
);
}