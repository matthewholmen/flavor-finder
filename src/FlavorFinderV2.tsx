import React, { useMemo, useEffect, useState } from 'react';
import { MinimalHeader } from './components/v2/MinimalHeader.tsx';
import { MobileBottomBar } from './components/v2/MobileBottomBar.tsx';
import { IngredientDisplay } from './components/v2/IngredientDisplay.tsx';
import { IngredientDrawer } from './components/v2/IngredientDrawer.tsx';
import { DietaryFilterPills } from './components/v2/DietaryFilterPills.tsx';
import { Sidebar } from './components/v2/Sidebar.tsx';
import { Undo2 } from 'lucide-react';
import { useScreenSize } from './hooks/useScreenSize.ts';
import { useIngredientSelection } from './hooks/useIngredientSelection.ts';
import { useFilters } from './hooks/useFilters.ts';
import { useCompatibility } from './hooks/useCompatibility.ts';
import { flavorPairings } from './data/flavorPairings.ts';
import { experimentalPairings } from './data/experimentalPairings.ts';
import { ingredientProfiles } from './data/ingredientProfiles.ts';
import { filterIngredients } from './utils/searchUtils.ts';
import {
  NUT_INGREDIENTS_SET,
  NIGHTSHADE_INGREDIENTS_SET,
  HIGH_FODMAP_INGREDIENTS_SET,
} from './data/dietaryRestrictions.ts';

// Create flavor map helper
const createFlavorMap = (includeExperimental = false) => {
  const flavorMap = new Map<string, Set<string>>();

  const addPairing = (ingredient1: string, ingredient2: string) => {
    if (!flavorMap.has(ingredient1)) {
      flavorMap.set(ingredient1, new Set());
    }
    if (!flavorMap.has(ingredient2)) {
      flavorMap.set(ingredient2, new Set());
    }
    flavorMap.get(ingredient1)!.add(ingredient2);
    flavorMap.get(ingredient2)!.add(ingredient1);
  };

  const pairingExists = (ingredient1: string, ingredient2: string) => {
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
  const { isMobile } = useScreenSize();

  // Use custom hooks for state management
  const {
    selectedIngredients,
    lockedIngredients,
    targetIngredientCount,
    lockedCount,
    minTarget,
    canDecrementTarget,
    canIncrementTarget,
    canUndo,
    setSelectedIngredients,
    setLockedIngredients,
    setTargetIngredientCount,
    saveToHistory,
    handleUndo,
    handleLockToggle,
    handleRemove,
    handleIngredientSelect: baseHandleIngredientSelect,
    handleIncrementTarget: baseHandleIncrementTarget,
    handleDecrementTarget,
  } = useIngredientSelection({ initialTargetCount: 2 });

  const {
    activeCategory,
    selectedSubcategories,
    tasteValues,
    activeSliders,
    dietaryRestrictions,
    searchTerm,
    setTasteValues,
    setDietaryRestrictions,
    setSearchTerm,
    handleCategoryChange,
    handleSliderToggle,
  } = useFilters();

  const {
    compatibilityMode,
    showPartialMatches,
    handleCompatibilityChange,
    togglePartialMatches,
  } = useCompatibility();

  // UI state (not extracted to hooks as they're specific to this component)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [introAnimationComplete, setIntroAnimationComplete] = useState(false);

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
  const isIngredientRestricted = (ingredient: string) => {
    const restrictedKeys = Object.entries(dietaryRestrictions)
      .filter(([_, value]) => value === false)
      .map(([key]) => key);

    if (restrictedKeys.length === 0) return false;

    const lowerIngredient = ingredient.toLowerCase();

    // Special handling for nut-free (O(1) lookup with Set)
    if (restrictedKeys.includes('_nuts')) {
      if (NUT_INGREDIENTS_SET.has(lowerIngredient)) {
        return true;
      }
    }

    // Special handling for nightshade-free (O(1) lookup with Set)
    if (restrictedKeys.includes('_nightshades')) {
      if (NIGHTSHADE_INGREDIENTS_SET.has(lowerIngredient)) {
        return true;
      }
    }

    // Special handling for low-FODMAP (O(1) lookup with Set)
    if (restrictedKeys.includes('_fodmap')) {
      if (HIGH_FODMAP_INGREDIENTS_SET.has(lowerIngredient)) {
        return true;
      }
    }

    const profile = ingredientProfiles.find(
      p => p.name.toLowerCase() === lowerIngredient
    );
    if (!profile) return false;

    return restrictedKeys.some(key => {
      // Skip special keys that don't follow category:subcategory format
      if (key.startsWith('_')) return false;
      const [cat, subcat] = key.split(':');
      return profile.category?.toLowerCase() === cat.toLowerCase() &&
             profile.subcategory?.toLowerCase() === subcat.toLowerCase();
    });
  };

  // Random ingredient generation with backtracking
  // mode: 'perfect' = all ingredients must pair with each other
  //       'mixed' = each ingredient must pair with at least one other
  //       'random' = no pairing requirements
  const getRandomIngredients = (count = 5, lockedList: string[] = [], mode = 'perfect') => {
    const maxGlobalAttempts = 200;

    // Random mode: just pick any ingredients (respecting dietary restrictions)
    if (mode === 'random') {
      const availablePool = Array.from(flavorMap.keys())
        .filter(ingredient => !lockedList.includes(ingredient))
        .filter(ingredient => !isIngredientRestricted(ingredient));

      const selections: string[] = [];
      const usedSet = new Set(lockedList);

      for (let i = 0; i < count && availablePool.length > 0; i++) {
        const remaining = availablePool.filter(ing => !usedSet.has(ing));
        if (remaining.length === 0) break;

        const randomIndex = Math.floor(Math.random() * remaining.length);
        const picked = remaining[randomIndex];
        selections.push(picked);
        usedSet.add(picked);
      }

      return selections;
    }

    // Mixed mode: each ingredient must pair with at least one other in the set
    if (mode === 'mixed') {
      for (let attempt = 0; attempt < maxGlobalAttempts; attempt++) {
        const selections: string[] = [];
        const excludeSet = new Set([...lockedList]);

        // Get all available ingredients
        const availablePool = Array.from(flavorMap.keys())
          .filter(ingredient => !excludeSet.has(ingredient))
          .filter(ingredient => !isIngredientRestricted(ingredient));

        // Shuffle the pool for randomness
        const shuffled = [...availablePool].sort(() => Math.random() - 0.5);

        for (const candidate of shuffled) {
          if (selections.length >= count) break;
          if (excludeSet.has(candidate)) continue;

          // Check if this candidate pairs with at least one existing ingredient
          // (or if it's the first ingredient, just add it)
          const allExisting = [...selections, ...lockedList];

          if (allExisting.length === 0) {
            // First ingredient - just add it
            selections.push(candidate);
            excludeSet.add(candidate);
          } else {
            // Must pair with at least one existing ingredient
            const pairsWithAtLeastOne = allExisting.some(existing =>
              flavorMap.get(existing)?.has(candidate)
            );

            if (pairsWithAtLeastOne) {
              selections.push(candidate);
              excludeSet.add(candidate);
            }
          }
        }

        // Validate: each ingredient (including locked) must pair with at least one other
        const allIngredientsList = [...lockedList, ...selections];
        const isValid = allIngredientsList.every(ing => {
          const others = allIngredientsList.filter(other => other !== ing);
          return others.length === 0 || others.some(other =>
            flavorMap.get(ing)?.has(other)
          );
        });

        if (selections.length === count && isValid) {
          return selections;
        }
      }

      return [];
    }

    // Perfect mode (default): all ingredients must pair with all others
    for (let attempt = 0; attempt < maxGlobalAttempts; attempt++) {
      const selections: string[] = [];
      const excludeSet = new Set([...lockedList]);

      // Track choices at each level for backtracking
      const choicesAtLevel: Set<string>[] = [];

      while (selections.length < count) {
        // Get compatible pool for current position
        let pool: string[];
        if (selections.length === 0 && lockedList.length === 0) {
          // First ingredient with no locks - pick from all
          pool = Array.from(flavorMap.keys())
            .filter(ingredient => !excludeSet.has(ingredient))
            .filter(ingredient => !isIngredientRestricted(ingredient));
        } else {
          // Must be compatible with all existing selections and locked ingredients
          const allToCheck = [...selections, ...lockedList];
          pool = Array.from(flavorMap.keys()).filter(candidate => {
            if (excludeSet.has(candidate)) return false;
            if (isIngredientRestricted(candidate)) return false;
            return allToCheck.every(existing =>
              flavorMap.get(existing)?.has(candidate)
            );
          });
        }

        // Filter out choices we've already tried at this level (in this attempt)
        const triedAtThisLevel = choicesAtLevel[selections.length] || new Set();
        pool = pool.filter(ing => !triedAtThisLevel.has(ing));

        if (pool.length > 0) {
          // Pick a random ingredient from the pool
          const randomIndex = Math.floor(Math.random() * pool.length);
          const picked = pool[randomIndex];

          // Track that we tried this choice at this level
          if (!choicesAtLevel[selections.length]) {
            choicesAtLevel[selections.length] = new Set();
          }
          choicesAtLevel[selections.length].add(picked);

          selections.push(picked);
          excludeSet.add(picked);
        } else {
          // No valid choices at this level - backtrack
          if (selections.length === 0) {
            // Can't backtrack further, this attempt failed
            break;
          }

          // Remove last selection and try a different path
          const removed = selections.pop()!;
          excludeSet.delete(removed);

          // Clear tried choices for levels after the one we're backtracking to
          choicesAtLevel.length = selections.length + 1;
        }
      }

      // If we got exactly the count we wanted, return immediately
      if (selections.length === count) {
        return selections;
      }
    }

    // Could not find a valid combination
    return [];
  };

  // Initialize with random ingredients and run intro animation
  useEffect(() => {
    if (selectedIngredients.length === 0) {
      const initial = getRandomIngredients(2);
      setSelectedIngredients(initial);
    }
  }, []);

  // Intro animation - run generate 10 times at 5 per second (200ms interval)
  useEffect(() => {
    if (introAnimationComplete || selectedIngredients.length === 0) return;

    let generationCount = 0;
    const maxGenerations = 10;
    const intervalMs = 200;

    const intervalId = setInterval(() => {
      generationCount++;

      // Generate new random ingredients (using current target of 2)
      const newIngredients = getRandomIngredients(2, []);
      if (newIngredients.length === 2) {
        setSelectedIngredients(newIngredients);
      }

      if (generationCount >= maxGenerations) {
        clearInterval(intervalId);
        setIntroAnimationComplete(true);
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [selectedIngredients.length > 0, introAnimationComplete]);

  // Stop pulsing on first interaction
  useEffect(() => {
    const handleClick = () => {
      if (isFirstLoad) setIsFirstLoad(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isFirstLoad]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
        // Blur the active element (search input) so shortcuts work
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Handle randomize/generate - creates exactly targetIngredientCount ingredients
  const handleRandomize = () => {
    saveToHistory();

    // Get locked ingredients (preserving their actual values)
    const lockedIngredientsList = selectedIngredients.filter((_, index) =>
      lockedIngredients.has(index)
    );

    // Calculate how many new ingredients to generate
    const slotsToFill = targetIngredientCount - lockedIngredientsList.length;

    // Generate compatible ingredients using current compatibility mode
    const newRandomIngredients = getRandomIngredients(slotsToFill, lockedIngredientsList, compatibilityMode);

    // Only update if we got the exact number of ingredients requested
    if (newRandomIngredients.length < slotsToFill) {
      return;
    }

    // Combine locked + new ingredients
    const combinedIngredients = [...lockedIngredientsList, ...newRandomIngredients];
    setSelectedIngredients(combinedIngredients);

    // Reset locked indices to match new positions (locked ingredients are now at the beginning)
    const newLockedSet = new Set<number>();
    lockedIngredientsList.forEach((_, index) => newLockedSet.add(index));
    setLockedIngredients(newLockedSet);
  };

  // Wrap handleIngredientSelect to clear search term
  const handleIngredientSelect = (ingredient: string) => {
    baseHandleIngredientSelect(ingredient);
    setSearchTerm('');
  };

  // Wrap handleIncrementTarget to pass flavorMap and isIngredientRestricted
  const handleIncrementTarget = () => {
    baseHandleIncrementTarget(flavorMap, isIngredientRestricted);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in an input
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (isTyping) return;

      // z - Undo
      if (e.key === 'z' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Delete/Backspace - Remove last ingredient
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        // Find and remove the last unlocked ingredient
        for (let i = selectedIngredients.length - 1; i >= 0; i--) {
          if (!lockedIngredients.has(i)) {
            handleRemove(i);
            return;
          }
        }
        return;
      }

      // Enter - Open ingredient drawer
      if (e.key === 'Enter') {
        e.preventDefault();
        setIsDrawerOpen(true);
        return;
      }

      // + or = - Add ingredient
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        if (canIncrementTarget) {
          handleIncrementTarget();
        }
        return;
      }

      // - - Remove ingredient
      if (e.key === '-') {
        e.preventDefault();
        if (canDecrementTarget) {
          handleDecrementTarget();
        }
        return;
      }

      // Space - Generate
      if (e.key === ' ') {
        e.preventDefault();
        handleRandomize();
        return;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIngredients, lockedIngredients, canIncrementTarget, canDecrementTarget]);

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
      filtered = filtered.filter(ingredient => {
        if (!showPartialMatches) {
          // Strict matching - all ingredients must match
          return selectedIngredients.every(selected =>
            flavorMap.get(selected)?.has(ingredient)
          );
        } else {
          // Partial matching - at least one ingredient must match
          return selectedIngredients.some(selected =>
            flavorMap.get(selected)?.has(ingredient)
          );
        }
      });
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
          const threshold = tasteValues[taste as keyof typeof tasteValues] || 0;
          const ingredientValue = profile.flavorProfile[taste as keyof typeof profile.flavorProfile] || 0;
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
        const lowerIngredient = ingredient.toLowerCase();

        // Special handling for nut-free (O(1) lookup with Set)
        if (restrictedKeys.includes('_nuts')) {
          if (NUT_INGREDIENTS_SET.has(lowerIngredient)) {
            return false;
          }
        }

        // Special handling for nightshade-free (O(1) lookup with Set)
        if (restrictedKeys.includes('_nightshades')) {
          if (NIGHTSHADE_INGREDIENTS_SET.has(lowerIngredient)) {
            return false;
          }
        }

        // Special handling for low-FODMAP (O(1) lookup with Set)
        if (restrictedKeys.includes('_fodmap')) {
          if (HIGH_FODMAP_INGREDIENTS_SET.has(lowerIngredient)) {
            return false;
          }
        }

        const profile = ingredientProfiles.find(
          p => p.name.toLowerCase() === lowerIngredient
        );
        if (!profile) return true;

        // Check if ingredient falls into any restricted category:subcategory
        return !restrictedKeys.some(key => {
          // Skip special keys that don't follow category:subcategory format
          if (key.startsWith('_')) return false;
          const [cat, subcat] = key.split(':');
          return profile.category?.toLowerCase() === cat.toLowerCase() &&
                 profile.subcategory?.toLowerCase() === subcat.toLowerCase();
        });
      });
    }

    // Sort: perfect matches first (alphabetically), then partial matches (alphabetically)
    if (showPartialMatches && selectedIngredients.length > 0) {
      filtered.sort((a, b) => {
        const aIsPerfect = selectedIngredients.every(selected =>
          flavorMap.get(selected)?.has(a)
        );
        const bIsPerfect = selectedIngredients.every(selected =>
          flavorMap.get(selected)?.has(b)
        );

        // Perfect matches come first
        if (aIsPerfect && !bIsPerfect) return -1;
        if (!aIsPerfect && bIsPerfect) return 1;

        // Within same category, sort alphabetically
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });
    }

    return filtered;
  }, [searchTerm, allIngredients, selectedIngredients, flavorMap, activeCategory, selectedSubcategories, activeSliders, tasteValues, dietaryRestrictions, showPartialMatches]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col transition-colors duration-300">
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
        onLogoClick={() => setIsSidebarOpen(true)}
        isGeneratePulsing={isFirstLoad}
        isMobile={isMobile}
      />

      {/* Mobile Bottom Bar */}
      {isMobile && (
        <MobileBottomBar
          canIncrement={canIncrementTarget}
          canDecrement={canDecrementTarget}
          canUndo={canUndo}
          onGenerate={handleRandomize}
          onIncrementTarget={handleIncrementTarget}
          onDecrementTarget={handleDecrementTarget}
          onDrawerToggle={() => setIsDrawerOpen(!isDrawerOpen)}
          onUndo={handleUndo}
          isDrawerOpen={isDrawerOpen}
          isGeneratePulsing={isFirstLoad}
        />
      )}

      {/* Main content area - scrollable on mobile when drawer is closed */}
      <main className={`
        flex-1 flex flex-col
        pt-20 ${isMobile ? 'pb-24' : 'pb-32'}
        ${isMobile && !isDrawerOpen ? 'overflow-y-auto overflow-x-clip' : ''}
      `}>
        {/* Mobile flow layout: content + pills in a flex column with min-height to push pills to bottom */}
        {isMobile && !isDrawerOpen ? (
          <div
            className="flex flex-col"
            style={{ minHeight: 'calc(100vh - 5rem - 6rem)' }} // viewport - header - bottom bar
          >
            {/* Ingredient Display */}
            <div className="flex-shrink-0">
              <IngredientDisplay
                ingredients={selectedIngredients}
                lockedIngredients={lockedIngredients}
                ingredientProfiles={ingredientProfiles}
                maxSlots={targetIngredientCount}
                onRemove={handleRemove}
                onLockToggle={handleLockToggle}
                onEmptySlotClick={() => setIsDrawerOpen(true)}
                onCloseDrawer={() => setIsDrawerOpen(false)}
                isDrawerOpen={isDrawerOpen}
                flavorMap={flavorMap}
              />
            </div>

            {/* Spacer pushes pills to bottom when content is short */}
            <div className="flex-grow" />

            {/* Dietary Filter Pills - at bottom of content, scrolls with it */}
            <div className="flex-shrink-0 pb-2 pt-6 px-4">
              <DietaryFilterPills
                dietaryRestrictions={dietaryRestrictions}
                onDietaryChange={setDietaryRestrictions}
                isInFlow={true}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Desktop/drawer-open layout */}
            <div className="flex-1 flex items-center justify-center">
              <IngredientDisplay
                ingredients={selectedIngredients}
                lockedIngredients={lockedIngredients}
                ingredientProfiles={ingredientProfiles}
                maxSlots={targetIngredientCount}
                onRemove={handleRemove}
                onLockToggle={handleLockToggle}
                onEmptySlotClick={() => setIsDrawerOpen(true)}
                onCloseDrawer={() => setIsDrawerOpen(false)}
                isDrawerOpen={isDrawerOpen}
                flavorMap={flavorMap}
              />
            </div>
            <DietaryFilterPills
              dietaryRestrictions={dietaryRestrictions}
              onDietaryChange={setDietaryRestrictions}
            />
          </>
        )}
      </main>

      {/* Undo Button - Desktop only (mobile has it in bottom bar) */}
      {!isMobile && (
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={`
            fixed left-6 z-[51]
            w-12 h-12 rounded-full
            flex items-center justify-center
            border-2 bg-white dark:bg-gray-800
            transition-all duration-300
            ${canUndo
              ? 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-700 cursor-pointer'
              : 'border-gray-200 dark:border-gray-700 text-gray-200 dark:text-gray-600 cursor-not-allowed'
            }
          `}
          style={{
            bottom: isDrawerOpen ? 'calc(50vh + 16px)' : '24px'
          }}
          aria-label="Undo"
        >
          <Undo2 size={20} strokeWidth={1.5} className="pointer-events-none" />
        </button>
      )}

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
        // Compatibility props
        compatibilityMode={compatibilityMode}
        onCompatibilityChange={handleCompatibilityChange}
        // Partial matches props
        showPartialMatches={showPartialMatches}
        onTogglePartialMatches={togglePartialMatches}
        // Flavor map for pairing info
        flavorMap={flavorMap}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        dietaryRestrictions={dietaryRestrictions}
        onDietaryChange={setDietaryRestrictions}
        compatibilityMode={compatibilityMode}
        onCompatibilityChange={handleCompatibilityChange}
      />
    </div>
  );
}
