import React, { useState, useMemo, useEffect } from 'react';
import { MinimalHeader } from './components/v2/MinimalHeader';
import { HeroIngredientDisplay } from './components/v2/HeroIngredientDisplay';
import { IngredientDrawer } from './components/v2/IngredientDrawer';
import { DietaryFilterPills } from './components/v2/DietaryFilterPills';
import { flavorPairings } from './data/flavorPairings.ts';
import { experimentalPairings } from './data/experimentalPairings.ts';
import { ingredientProfiles } from './data/ingredientProfiles.ts';
import { filterIngredients } from './utils/searchUtils.ts';

// Create flavor map helper
const createFlavorMap = (includeExperimental = false) => {
  const flavorMap = new Map();
  
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

  const pairingExists = (ingredient1, ingredient2) => {
    return (flavorMap.get(ingredient1)?.has(ingredient2) || flavorMap.get(ingredient2)?.has(ingredient1));
  };
  
  flavorPairings.forEach(pair => {
    const [ingredient1, ingredient2] = pair.split(',');
    if (!ingredient1 || !ingredient2) return;
    addPairing(ingredient1, ingredient2);
  });

  if (includeExperimental) {
    experimentalPairings.forEach(pair => {
      const [ingredient1, ingredient2] = pair.split(',');
      if (!ingredient1 || !ingredient2) return;
      if (!pairingExists(ingredient1, ingredient2)) {
        addPairing(ingredient1, ingredient2);
      }
    });
  }
  
  return { flavorMap, totalPairings: flavorMap.size };
};

export default function FlavorFinderV2() {
  // Core state
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [lockedIngredients, setLockedIngredients] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // Target ingredient count - controls how many ingredients Generate creates
  // Range: 1-5, cannot go below the number of locked ingredients
  const [targetIngredientCount, setTargetIngredientCount] = useState(3);

  // Filter state
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [tasteValues, setTasteValues] = useState({
    sweet: 5, salty: 5, sour: 5, bitter: 5, umami: 5, fat: 5, spicy: 5
  });
  const [activeSliders, setActiveSliders] = useState(new Set());
  const [dietaryRestrictions, setDietaryRestrictions] = useState({});

  // Create flavor map
  const { flavorMap } = useMemo(() => createFlavorMap(false), []);
  
  // All ingredients
  const allIngredients = useMemo(
    () => Array.from(flavorMap.keys()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    ),
    [flavorMap]
  );

  // Helper to check if ingredient is restricted by dietary settings
  const isIngredientRestricted = (ingredient) => {
    const restrictedKeys = Object.entries(dietaryRestrictions)
      .filter(([_, value]) => value === false)
      .map(([key]) => key);
    
    if (restrictedKeys.length === 0) return false;
    
    const profile = ingredientProfiles.find(
      p => p.name.toLowerCase() === ingredient.toLowerCase()
    );
    if (!profile) return false;
    
    return restrictedKeys.some(key => {
      const [cat, subcat] = key.split(':');
      return profile.category?.toLowerCase() === cat.toLowerCase() &&
             profile.subcategory?.toLowerCase() === subcat.toLowerCase();
    });
  };

  // Random ingredient generation
  const getRandomIngredients = (count = 5, lockedList = []) => {
    const selections = [];
    let maxAttempts = 100;
    const excludeSet = new Set([...lockedList, ...selections]);
    
    while (selections.length < count && maxAttempts > 0) {
      if (selections.length === 0) {
        let fullPool = Array.from(flavorMap.keys())
          .filter(ingredient => !excludeSet.has(ingredient))
          .filter(ingredient => !isIngredientRestricted(ingredient));
        
        if (lockedList.length > 0) {
          fullPool = fullPool.filter(ingredient => 
            lockedList.every(locked => 
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
      
      const compatiblePool = Array.from(flavorMap.keys()).filter(candidate => {
        if (excludeSet.has(candidate)) return false;
        if (isIngredientRestricted(candidate)) return false;
        
        const allIngredientsToCheck = [...selections, ...lockedList];
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
        break;
      }
      
      maxAttempts--;
    }
    
    return selections;
  };

  // Initialize with random ingredients
  useEffect(() => {
    if (selectedIngredients.length === 0) {
      const initial = getRandomIngredients(3);
      setSelectedIngredients(initial);
    }
  }, []);

  // Stop pulsing on first interaction
  useEffect(() => {
    const handleClick = () => {
      if (isFirstLoad) setIsFirstLoad(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isFirstLoad]);

  // Handle randomize/generate - creates exactly targetIngredientCount ingredients
  const handleRandomize = () => {
    // Get locked ingredients (preserving their actual values)
    const lockedIngredientsList = selectedIngredients.filter((_, index) => 
      lockedIngredients.has(index)
    );

    // Calculate how many new ingredients to generate
    const slotsToFill = targetIngredientCount - lockedIngredientsList.length;

    // Generate compatible ingredients
    const newRandomIngredients = getRandomIngredients(slotsToFill, lockedIngredientsList);

    // Combine locked + new ingredients
    const combinedIngredients = [...lockedIngredientsList, ...newRandomIngredients];
    setSelectedIngredients(combinedIngredients);

    // Reset locked indices to match new positions (locked ingredients are now at the beginning)
    const newLockedSet = new Set();
    lockedIngredientsList.forEach((_, index) => newLockedSet.add(index));
    setLockedIngredients(newLockedSet);
  };

  // Handle lock toggle
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

  // Handle ingredient removal
  const handleRemove = (index) => {
    setSelectedIngredients(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    
    // Also remove lock if exists and adjust indices
    setLockedIngredients(prev => {
      const next = new Set(prev);
      next.delete(index);
      // Adjust indices for items after removed one
      const adjusted = new Set();
      next.forEach(i => {
        if (i > index) adjusted.add(i - 1);
        else adjusted.add(i);
      });
      return adjusted;
    });
  };

  // Handle ingredient selection from drawer
  const handleIngredientSelect = (ingredient) => {
    if (selectedIngredients.length >= 5) return;
    if (selectedIngredients.includes(ingredient)) return;
    
    setSelectedIngredients(prev => [...prev, ingredient]);
    setSearchTerm('');
    setIsDrawerOpen(false);
  };

  // Computed values for target count controls
  const lockedCount = lockedIngredients.size;
  const minTarget = Math.max(1, lockedCount); // Can't go below locked count or 1
  
  // Can decrement if:
  // 1. There are empty slots that can be removed (target > ingredients count)
  // 2. There are unlocked ingredients that can be removed (ingredients > minTarget)
  const hasRemovableEmptySlots = targetIngredientCount > selectedIngredients.length;
  const hasRemovableIngredients = selectedIngredients.length > minTarget;
  const canDecrementTarget = hasRemovableEmptySlots || hasRemovableIngredients;
  const canIncrementTarget = targetIngredientCount < 5;

  // Auto-adjust target if locked count exceeds current target
  useEffect(() => {
    if (lockedIngredients.size > targetIngredientCount) {
      setTargetIngredientCount(lockedIngredients.size);
    }
  }, [lockedIngredients.size, targetIngredientCount]);

  // Increment target count (for + button)
  const handleIncrementTarget = () => {
    if (targetIngredientCount < 5) {
      setTargetIngredientCount(prev => prev + 1);
    }
  };

  // Decrement: Remove empty slot first, then remove last unlocked ingredient (for - button)
  const handleDecrementTarget = () => {
    // If there are empty slots (target > actual ingredients), just reduce the target count
    // But don't go below the number of current ingredients
    if (targetIngredientCount > selectedIngredients.length) {
      const newTarget = targetIngredientCount - 1;
      // Only reduce if we stay at or above the current ingredient count
      if (newTarget >= selectedIngredients.length) {
        setTargetIngredientCount(newTarget);
        return;
      }
    }
    
    // Otherwise, find and remove the last unlocked ingredient
    for (let i = selectedIngredients.length - 1; i >= 0; i--) {
      if (!lockedIngredients.has(i)) {
        handleRemove(i);
        // Also decrease target count to match
        const newIngredientCount = selectedIngredients.length - 1;
        if (targetIngredientCount > newIngredientCount) {
          setTargetIngredientCount(Math.max(minTarget, newIngredientCount));
        }
        return;
      }
    }
  };

  // Handle recipe search
  const handleRecipeSearch = () => {
    if (selectedIngredients.length === 0) return;
    
    const ingredientsText = selectedIngredients.join(' ');
    
    navigator.clipboard.writeText(ingredientsText)
      .then(() => {
        const searchURL = `https://www.google.com/search?q=${encodeURIComponent(ingredientsText + ' recipe')}`;
        window.open(searchURL, '_blank');
      })
      .catch(err => {
        console.error('Failed to copy ingredients:', err);
        // Still open search even if copy fails
        const searchURL = `https://www.google.com/search?q=${encodeURIComponent(selectedIngredients.join(' ') + ' recipe')}`;
        window.open(searchURL, '_blank');
      });
  };

  // Filter handlers
  const handleCategoryChange = ({ category, subcategories }) => {
    setActiveCategory(category);
    setSelectedSubcategories(subcategories);
  };

  const handleSliderToggle = (taste) => {
    setActiveSliders(prev => {
      const next = new Set(prev);
      if (next.has(taste)) {
        next.delete(taste);
      } else {
        next.add(taste);
      }
      return next;
    });
  };

  // Filter suggestions for drawer
  const filteredSuggestions = useMemo(() => {
    let filtered = filterIngredients(
      allIngredients, 
      searchTerm, 
      selectedIngredients, 
      ingredientProfiles
    );
    
    // Filter by compatibility with selected ingredients
    if (selectedIngredients.length > 0) {
      filtered = filtered.filter(ingredient => 
        selectedIngredients.every(selected => 
          flavorMap.get(selected)?.has(ingredient)
        )
      );
    }

    // Apply category filter
    if (activeCategory) {
      filtered = filtered.filter(ingredient => {
        const profile = ingredientProfiles.find(
          p => p.name.toLowerCase() === ingredient.toLowerCase()
        );
        if (!profile) return false;
        
        // Check if matches category
        if (profile.category?.toLowerCase() !== activeCategory.toLowerCase()) {
          return false;
        }
        
        // Check subcategories if any selected
        if (selectedSubcategories.length > 0) {
          return selectedSubcategories.some(
            sub => profile.subcategory?.toLowerCase() === sub.toLowerCase()
          );
        }
        
        return true;
      });
    }

    // Apply taste filters
    if (activeSliders.size > 0) {
      filtered = filtered.filter(ingredient => {
        const profile = ingredientProfiles.find(
          p => p.name.toLowerCase() === ingredient.toLowerCase()
        );
        if (!profile || !profile.flavorProfile) return false;
        
        // Check each active taste slider
        return Array.from(activeSliders).every(taste => {
          const threshold = tasteValues[taste] || 5;
          const ingredientValue = profile.flavorProfile[taste] || 0;
          return ingredientValue >= threshold;
        });
      });
    }

    // Apply dietary restrictions
    const restrictedKeys = Object.entries(dietaryRestrictions)
      .filter(([_, value]) => value === false)
      .map(([key]) => key);
    
    if (restrictedKeys.length > 0) {
      filtered = filtered.filter(ingredient => {
        const profile = ingredientProfiles.find(
          p => p.name.toLowerCase() === ingredient.toLowerCase()
        );
        if (!profile) return true;
        
        // Check if ingredient falls into any restricted category:subcategory
        return !restrictedKeys.some(key => {
          const [cat, subcat] = key.split(':');
          return profile.category?.toLowerCase() === cat.toLowerCase() &&
                 profile.subcategory?.toLowerCase() === subcat.toLowerCase();
        });
      });
    }
    
    return filtered;
  }, [searchTerm, allIngredients, selectedIngredients, flavorMap, activeCategory, selectedSubcategories, activeSliders, tasteValues, dietaryRestrictions]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Minimal Header */}
      <MinimalHeader
        targetCount={targetIngredientCount}
        currentCount={selectedIngredients.length}
        minTarget={minTarget}
        maxTarget={5}
        canIncrement={canIncrementTarget}
        canDecrement={canDecrementTarget}
        onGenerate={handleRandomize}
        onIncrementTarget={handleIncrementTarget}
        onDecrementTarget={handleDecrementTarget}
        onRecipesClick={handleRecipeSearch}
        isGeneratePulsing={isFirstLoad}
      />
      
      {/* Main Content - Hero Display */}
      <main className="flex-1 flex items-center justify-center pt-20 pb-32">
        <HeroIngredientDisplay
          ingredients={selectedIngredients}
          lockedIngredients={lockedIngredients}
          ingredientProfiles={ingredientProfiles}
          maxSlots={targetIngredientCount}
          onRemove={handleRemove}
          onLockToggle={handleLockToggle}
          onEmptySlotClick={() => setIsDrawerOpen(true)}
        />
      </main>
      
      {/* Dietary Filter Pills - Fixed position on home screen */}
      <DietaryFilterPills
        dietaryRestrictions={dietaryRestrictions}
        onDietaryChange={setDietaryRestrictions}
      />
      
      {/* Ingredient Drawer */}
      <IngredientDrawer
        isOpen={isDrawerOpen}
        onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
        onClose={() => setIsDrawerOpen(false)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        suggestions={filteredSuggestions}
        onIngredientSelect={handleIngredientSelect}
        ingredientProfiles={ingredientProfiles}
        selectedIngredients={selectedIngredients}
        // Filter props
        activeCategory={activeCategory}
        selectedSubcategories={selectedSubcategories}
        onCategoryChange={handleCategoryChange}
        tasteValues={tasteValues}
        activeSliders={activeSliders}
        onTasteChange={setTasteValues}
        onSliderToggle={handleSliderToggle}
        dietaryRestrictions={dietaryRestrictions}
        onDietaryChange={setDietaryRestrictions}
      />
    </div>
  );
}
