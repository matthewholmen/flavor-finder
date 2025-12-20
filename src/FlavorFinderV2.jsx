import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MinimalHeader } from './components/v2/MinimalHeader';
import { MobileBottomBar } from './components/v2/MobileBottomBar';
import { IngredientDisplay } from './components/v2/IngredientDisplay';
import { IngredientDrawer } from './components/v2/IngredientDrawer';
import { DietaryFilterPills } from './components/v2/DietaryFilterPills';
import { Sidebar } from './components/v2/Sidebar';
import { Undo2 } from 'lucide-react';
import { useScreenSize } from './hooks/useScreenSize.ts';
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
  const { isMobile } = useScreenSize();

  // Core state
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [lockedIngredients, setLockedIngredients] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // Target ingredient count - controls how many ingredients Generate creates
  // Range: 1-5, cannot go below the number of locked ingredients
  const [targetIngredientCount, setTargetIngredientCount] = useState(2);

  // History state for undo functionality
  const [history, setHistory] = useState([]);
  const isUndoing = useRef(false);

  // Save current state to history (call before making changes)
  const saveToHistory = () => {
    if (isUndoing.current) return; // Don't save while undoing
    setHistory(prev => [...prev, {
      ingredients: [...selectedIngredients],
      locked: new Set(lockedIngredients),
      targetCount: targetIngredientCount
    }]);
  };

  // Undo to previous state
  const handleUndo = () => {
    if (history.length === 0) return;

    isUndoing.current = true;
    const prevState = history[history.length - 1];

    setSelectedIngredients(prevState.ingredients);
    setLockedIngredients(prevState.locked);
    setTargetIngredientCount(prevState.targetCount);
    setHistory(prev => prev.slice(0, -1));

    // Reset flag after state updates
    setTimeout(() => {
      isUndoing.current = false;
    }, 0);
  };

  // Intro animation state - runs generate 15 times on load
  const [introAnimationComplete, setIntroAnimationComplete] = useState(false);

  // Filter state
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [tasteValues, setTasteValues] = useState({
    sweet: 0, salty: 0, sour: 0, bitter: 0, umami: 0, fat: 0, spicy: 0
  });
  const [activeSliders, setActiveSliders] = useState(new Set());
  const [dietaryRestrictions, setDietaryRestrictions] = useState({});
  const [compatibilityMode, setCompatibilityMode] = useState('perfect'); // 'perfect' | 'mixed' | 'random'
  const [showPartialMatches, setShowPartialMatches] = useState(false);

  // Create flavor map
  const { flavorMap } = useMemo(() => createFlavorMap(false), []);
  
  // All ingredients
  const allIngredients = useMemo(
    () => Array.from(flavorMap.keys()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    ),
    [flavorMap]
  );

  // List of nut ingredients for nut-free filter
  const NUT_INGREDIENTS = [
    'almond', 'almond liqueur', 'almond oil', 'amaretto',
    'cashew', 'chestnut', 'hazelnut', 'macadamia nut',
    'peanut', 'peanut oil', 'pecan', 'pecan oil',
    'pine nut', 'pistachio', 'walnut', 'walnut oil', 'nuts'
  ];

  // List of nightshade ingredients for nightshade-free filter
  const NIGHTSHADE_INGREDIENTS = [
    'tomato', 'tomatoes', 'cherry tomato', 'sun-dried tomato', 'tomato paste',
    'bell pepper', 'red bell pepper', 'green bell pepper', 'yellow bell pepper',
    'pepper', 'peppers', 'sweet pepper',
    'eggplant', 'aubergine',
    'potato', 'potatoes',
    'cayenne', 'cayenne pepper',
    'paprika', 'smoked paprika',
    'chili', 'chili pepper', 'chili powder', 'chipotle', 'chipotle pepper',
    'jalapeño', 'jalapeno', 'serrano', 'serrano pepper',
    'habanero', 'ancho chili', 'poblano', 'guajillo',
    'red pepper flakes', 'crushed red pepper',
    'pimento', 'pimientos', 'goji berry', 'goji berries',
    'tomatillo', 'hot sauce', 'tabasco', 'sriracha'
  ];

  // List of high-FODMAP ingredients for low-FODMAP filter
  const HIGH_FODMAP_INGREDIENTS = [
    // Alliums (high in fructans)
    'garlic', 'onion', 'onions', 'red onion', 'white onion', 'yellow onion',
    'shallot', 'shallots', 'leek', 'leeks', 'scallion', 'scallions',
    'green onion', 'green onions', 'spring onion', 'chives',
    // Legumes (high in GOS)
    'beans', 'black beans', 'kidney bean', 'kidney beans', 'chickpea', 'chickpeas',
    'lentils', 'baked beans', 'cannellini beans', 'fava beans', 'lima beans',
    'navy beans', 'pinto beans', 'red beans', 'white beans', 'flageolet beans',
    'black-eyed peas', 'legume', 'legumes',
    // High-fructose fruits
    'apple', 'apples', 'pear', 'pears', 'mango', 'watermelon',
    'cherry', 'cherries', 'apricot', 'apricots', 'peach', 'peaches',
    'plum', 'plums', 'nectarine', 'nectarines', 'blackberry', 'blackberries',
    // Dairy with lactose
    'milk', 'cream', 'ice cream', 'soft cheese', 'ricotta', 'cottage cheese',
    'cream cheese', 'mascarpone', 'sour cream', 'buttermilk',
    // Wheat products
    'bread', 'pasta', 'couscous', 'wheat', 'barley', 'rye',
    // Sweeteners
    'honey', 'agave', 'high fructose corn syrup', 'molasses',
    // Vegetables
    'artichoke', 'artichokes', 'asparagus', 'cauliflower', 'mushroom', 'mushrooms',
    'snow peas', 'sugar snap peas'
  ];

  // Helper to check if ingredient is restricted by dietary settings
  const isIngredientRestricted = (ingredient) => {
    const restrictedKeys = Object.entries(dietaryRestrictions)
      .filter(([_, value]) => value === false)
      .map(([key]) => key);

    if (restrictedKeys.length === 0) return false;

    // Special handling for nut-free
    if (restrictedKeys.includes('_nuts')) {
      if (NUT_INGREDIENTS.includes(ingredient.toLowerCase())) {
        return true;
      }
    }

    // Special handling for nightshade-free
    if (restrictedKeys.includes('_nightshades')) {
      if (NIGHTSHADE_INGREDIENTS.includes(ingredient.toLowerCase())) {
        return true;
      }
    }

    // Special handling for low-FODMAP
    if (restrictedKeys.includes('_fodmap')) {
      if (HIGH_FODMAP_INGREDIENTS.includes(ingredient.toLowerCase())) {
        return true;
      }
    }

    const profile = ingredientProfiles.find(
      p => p.name.toLowerCase() === ingredient.toLowerCase()
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
  const getRandomIngredients = (count = 5, lockedList = [], mode = 'perfect') => {
    const maxGlobalAttempts = 200;

    // Random mode: just pick any ingredients (respecting dietary restrictions)
    if (mode === 'random') {
      const availablePool = Array.from(flavorMap.keys())
        .filter(ingredient => !lockedList.includes(ingredient))
        .filter(ingredient => !isIngredientRestricted(ingredient));

      const selections = [];
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
        const selections = [];
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
        const allIngredients = [...lockedList, ...selections];
        const isValid = allIngredients.every(ing => {
          const others = allIngredients.filter(other => other !== ing);
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
      const selections = [];
      const excludeSet = new Set([...lockedList]);

      // Track choices at each level for backtracking
      const choicesAtLevel = [];

      while (selections.length < count) {
        // Get compatible pool for current position
        let pool;
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
          const removed = selections.pop();
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

  // Intro animation - run generate 15 times at 5 per second (200ms interval)
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
    const handleKeyDown = (e) => {
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
    // This prevents showing incomplete pairings (e.g., 3 ingredients when user wanted 4)
    if (newRandomIngredients.length < slotsToFill) {
      // Could not find enough compatible ingredients - don't update
      // The UI could show a message, but for now we just don't change anything
      return;
    }

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
    saveToHistory();

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

    // Reduce target count if it's greater than the new ingredient count
    setTargetIngredientCount(prev => {
      const newIngredientCount = selectedIngredients.length - 1;
      // Only reduce if current target is greater than new ingredient count
      if (prev > newIngredientCount) {
        return Math.max(1, newIngredientCount);
      }
      return prev;
    });
  };

  // Handle ingredient selection from drawer
  const handleIngredientSelect = (ingredient) => {
    if (selectedIngredients.length >= 5) return;
    if (selectedIngredients.includes(ingredient)) return;

    saveToHistory();

    setSelectedIngredients(prev => {
      const newIngredients = [...prev, ingredient];
      // Update target count to match new ingredient count if it exceeds current target
      if (newIngredients.length > targetIngredientCount) {
        setTargetIngredientCount(newIngredients.length);
      }
      return newIngredients;
    });
    setSearchTerm('');
    // Keep drawer open so users can add multiple ingredients
  };

  // Computed values for target count controls
  const lockedCount = lockedIngredients.size;
  const minTarget = lockedCount; // Can't go below locked count (can be 0)
  
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
  // Tries to add a compatible ingredient; if none available, adds an empty slot
  const handleIncrementTarget = () => {
    if (targetIngredientCount >= 5) return;

    saveToHistory();

    // Try to find a compatible ingredient to add
    if (selectedIngredients.length > 0) {
      // Get all ingredients compatible with current selection
      const compatibleIngredients = Array.from(flavorMap.keys()).filter(candidate => {
        // Skip if already selected
        if (selectedIngredients.includes(candidate)) return false;
        // Skip if restricted by dietary settings
        if (isIngredientRestricted(candidate)) return false;
        // Must be compatible with ALL currently selected ingredients
        return selectedIngredients.every(existing =>
          flavorMap.get(existing)?.has(candidate)
        );
      });

      if (compatibleIngredients.length > 0) {
        // Pick a random compatible ingredient
        const randomIndex = Math.floor(Math.random() * compatibleIngredients.length);
        const newIngredient = compatibleIngredients[randomIndex];

        // Add the ingredient
        setSelectedIngredients(prev => [...prev, newIngredient]);
        // Only increment target if we're already at capacity (no empty slots)
        if (selectedIngredients.length >= targetIngredientCount) {
          setTargetIngredientCount(prev => prev + 1);
        }
        return;
      }
    } else {
      // No ingredients selected yet - pick any random ingredient
      const allAvailable = Array.from(flavorMap.keys()).filter(
        candidate => !isIngredientRestricted(candidate)
      );

      if (allAvailable.length > 0) {
        const randomIndex = Math.floor(Math.random() * allAvailable.length);
        const newIngredient = allAvailable[randomIndex];

        setSelectedIngredients(prev => [...prev, newIngredient]);
        // Only increment target if we're already at capacity
        // (e.g., if target is 1 and we have 0 ingredients, just fill the slot)
        if (selectedIngredients.length >= targetIngredientCount) {
          setTargetIngredientCount(prev => prev + 1);
        }
        return;
      }
    }

    // No compatible ingredients found - just add an empty slot
    setTargetIngredientCount(prev => prev + 1);
  };

  // Decrement: Remove empty slot first, then remove last unlocked ingredient (for - button)
  const handleDecrementTarget = () => {
    saveToHistory();

    // If there are empty slots (target > actual ingredients), just reduce the target count
    // But don't go below the number of current ingredients (minimum 1 for UI)
    if (targetIngredientCount > selectedIngredients.length) {
      const newTarget = targetIngredientCount - 1;
      // Only reduce if we stay at or above the current ingredient count
      if (newTarget >= selectedIngredients.length && newTarget >= 1) {
        setTargetIngredientCount(newTarget);
        return;
      }
    }

    // Otherwise, find and remove the last unlocked ingredient
    for (let i = selectedIngredients.length - 1; i >= 0; i--) {
      if (!lockedIngredients.has(i)) {
        // Calculate what the new ingredient count will be after removal
        const newIngredientCount = selectedIngredients.length - 1;

        // Inline removal logic to avoid double history save from handleRemove
        setSelectedIngredients(prev => {
          const next = [...prev];
          next.splice(i, 1);
          return next;
        });

        // Also remove lock if exists and adjust indices
        setLockedIngredients(prev => {
          const next = new Set(prev);
          next.delete(i);
          // Adjust indices for items after removed one
          const adjusted = new Set();
          next.forEach(idx => {
            if (idx > i) adjusted.add(idx - 1);
            else adjusted.add(idx);
          });
          return adjusted;
        });

        // Set target to the new ingredient count (maintaining the count after removal)
        // This ensures Generate will maintain the same number of ingredients
        setTargetIngredientCount(Math.max(1, newIngredientCount));
        return;
      }
    }
  };

  // Keyboard shortcuts (must be after handler functions and computed values are defined)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in an input
      const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
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
        // Set default value of 1 when activating a slider
        setTasteValues(prevValues => ({
          ...prevValues,
          [taste]: 3
        }));
      }
      return next;
    });
  };

  const handleCompatibilityChange = (mode) => {
    setCompatibilityMode(mode);
    // Auto-enable partial matches for mixed/random modes, disable for perfect
    if (mode === 'mixed' || mode === 'random') {
      setShowPartialMatches(true);
    } else if (mode === 'perfect') {
      setShowPartialMatches(false);
    }
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
          const threshold = tasteValues[taste] || 0;
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
        // Special handling for nut-free
        if (restrictedKeys.includes('_nuts')) {
          if (NUT_INGREDIENTS.includes(ingredient.toLowerCase())) {
            return false;
          }
        }

        // Special handling for nightshade-free
        if (restrictedKeys.includes('_nightshades')) {
          if (NIGHTSHADE_INGREDIENTS.includes(ingredient.toLowerCase())) {
            return false;
          }
        }

        // Special handling for low-FODMAP
        if (restrictedKeys.includes('_fodmap')) {
          if (HIGH_FODMAP_INGREDIENTS.includes(ingredient.toLowerCase())) {
            return false;
          }
        }

        const profile = ingredientProfiles.find(
          p => p.name.toLowerCase() === ingredient.toLowerCase()
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
        onLogoClick={() => setIsSidebarOpen(true)}
        isGeneratePulsing={isFirstLoad}
        isMobile={isMobile}
      />

      {/* Mobile Bottom Bar */}
      {isMobile && (
        <MobileBottomBar
          canIncrement={canIncrementTarget}
          canDecrement={canDecrementTarget}
          canUndo={history.length > 0}
          onGenerate={handleRandomize}
          onIncrementTarget={handleIncrementTarget}
          onDecrementTarget={handleDecrementTarget}
          onDrawerToggle={() => setIsDrawerOpen(!isDrawerOpen)}
          onUndo={handleUndo}
          isDrawerOpen={isDrawerOpen}
          isGeneratePulsing={isFirstLoad}
        />
      )}

      {/* Unified Ingredient Display - adapts between hero and compact modes */}
      <main className={`flex-1 flex items-center justify-center pt-20 ${isMobile ? 'pb-24' : 'pb-32'}`}>
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
      </main>
      
      {/* Dietary Filter Pills - Fixed position on home screen */}
      <DietaryFilterPills
        dietaryRestrictions={dietaryRestrictions}
        onDietaryChange={setDietaryRestrictions}
      />

      {/* Undo Button - Desktop only (mobile has it in bottom bar) */}
      {!isMobile && (
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className={`
            fixed left-6 z-[51]
            w-12 h-12 rounded-full
            flex items-center justify-center
            border-2 bg-white
            transition-all duration-300
            ${history.length > 0
              ? 'border-gray-300 hover:border-gray-400 text-gray-500 active:bg-gray-100 cursor-pointer'
              : 'border-gray-200 text-gray-200 cursor-not-allowed'
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
        onTogglePartialMatches={() => setShowPartialMatches(!showPartialMatches)}
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
