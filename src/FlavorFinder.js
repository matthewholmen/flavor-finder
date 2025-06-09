import React, { useState, useMemo, useEffect, useRef } from 'react';
import { encodeIngredientsToUrl, decodeUrlToIngredients } from './utils/urlEncoding';
import Notification from './components/Notification';
import ShareButton from './components/ShareButton';
import { Search, Sparkles, ChartPieIcon, ChartPie, X, ChevronDown, CircleFadingPlus, RectangleEllipsis, Zap, SendToBack, Settings, Clipboard, Share, Globe } from 'lucide-react';
import { flavorPairings } from './data/flavorPairings.ts';
import { experimentalPairings } from './data/experimentalPairings.ts';
import { ingredientProfiles } from './data/ingredientProfiles.ts';
import SuggestedIngredients from './components/SuggestedIngredients.tsx';
import CompactTasteSliders from './components/CompactTasteSliders.tsx';
import CategoryFilter from './components/categoryFilter.tsx';
import SortingFilter from './components/SortingFilter.tsx';
import { getCompatibilityScore } from './utils/compatibility.ts';
import IngredientSlot from './components/IngredientSlot.tsx';
import InfoTooltip from './components/InfoTooltip.js';
import TasteAnalysisModal from './components/TasteAnalysisModal.tsx';
import SettingsModal from './components/SettingsModal.tsx';
import { TASTE_COLORS } from './utils/colors.ts';
import { getSortedCompatibleIngredients, applySortingOption } from './utils/sorting.ts';
import { SearchBar } from './components/SearchBar.tsx';
import { filterIngredients, matchesIngredient } from './utils/searchUtils.ts';
import SearchIngredientsButton from './components/SearchIngredientsButton.tsx';
import FilterPanelTrigger from './components/filters/UnifiedFilterPanel/FilterPanelTrigger.tsx';
import FilterPanel from './components/filters/UnifiedFilterPanel/FilterPanel.tsx';

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
  // Add notification state for share functionality
  const [notification, setNotification] = useState(null);
  const [activeView, setActiveView] = useState('ingredients');

  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [lockedIngredients, setLockedIngredients] = useState(new Set());
  const [editingSlot, setEditingSlot] = useState(null);
  const [randomCount, setRandomCount] = useState(4);
  const [isExperimental, setIsExperimental] = useState(false);
  const [slotFilters, setSlotFilters] = useState({});
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSorting, setActiveSorting] = useState('alphabetical');
  const [activeFilters, setActiveFilters] = useState({
    category: '',
    subcategories: []
  });
  const [isCategorySearch, setIsCategorySearch] = useState(false);
  const [substitutionMode, setSubstitutionMode] = useState({
    active: false,
    sourceIngredient: null,
    sourceProfile: null,
    slotIndex: null,
    type: 'taste' // Add this new field
  });
  
  // Add settings state and modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState({});

  // Initialize settings from localStorage
  useEffect(() => {
    const categories = new Set();
    const categorySubcategories = new Map();
    
    // Collect all unique categories and subcategories
    ingredientProfiles.forEach(profile => {
      const category = profile.category;
      const subcategory = profile.subcategory;
      
      categories.add(category);
      
      if (!categorySubcategories.has(category)) {
        categorySubcategories.set(category, new Set());
      }
      
      categorySubcategories.get(category)?.add(subcategory);
    });
    
    // Initialize all to enabled (true)
    const initialRestrictions = {};
    
    categories.forEach(category => {
      const subcategories = categorySubcategories.get(category) || new Set();
      subcategories.forEach(subcategory => {
        initialRestrictions[`${category}:${subcategory}`] = true;
      });
    });
    
    // Check if we have saved restrictions in localStorage
    const savedRestrictions = localStorage.getItem('dietaryRestrictions');
    if (savedRestrictions) {
      try {
        const parsed = JSON.parse(savedRestrictions);
        // Merge saved with initial to handle any new categories that might have been added
        setDietaryRestrictions({...initialRestrictions, ...parsed});
      } catch (e) {
        console.error('Failed to parse saved dietary restrictions', e);
        setDietaryRestrictions(initialRestrictions);
      }
    } else {
      setDietaryRestrictions(initialRestrictions);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(dietaryRestrictions).length > 0) {
      localStorage.setItem('dietaryRestrictions', JSON.stringify(dietaryRestrictions));
    }
  }, [dietaryRestrictions]);
  
  const handleExitSubstitution = () => {
    exitSubstitutionMode();
  };
  
  const handleModeChange = (newMode) => {
    setSubstitutionMode(prev => ({
      ...prev,
      type: newMode
    }));
  
    // Set up appropriate filters based on mode
    if (newMode === 'taste' && substitutionMode.sourceProfile) {
      // Reset category filters first
      setActiveFilters({
        category: '',
        subcategories: []
      });
      
      // Set up taste filters
      const newActiveSliders = new Set(
        Object.entries(substitutionMode.sourceProfile.flavorProfile)
          .filter(([_, value]) => value > 0)
          .map(([taste]) => taste)
      );
      setActiveSliders(newActiveSliders);
  
      const newTasteValues = { ...tasteValues };
      Object.entries(substitutionMode.sourceProfile.flavorProfile).forEach(([taste, value]) => {
        newTasteValues[taste] = value * 0.5;
      });
      setTasteValues(newTasteValues);
    } else if (newMode === 'category' && substitutionMode.sourceProfile) {
      // Reset taste filters first
      setActiveSliders(new Set());
      setTasteValues({
        sweet: 5,
        salty: 5,
        sour: 5,
        bitter: 5,
        umami: 5,
        fat: 5,
        spicy: 5
      });
      
      // Set up category filters
      setActiveFilters({
        category: substitutionMode.sourceProfile.category,
        subcategories: [substitutionMode.sourceProfile.subcategory]
      });
    }
  };

  const handleFilterTypeToggle = (type) => {
    setSubstitutionMode(prev => ({
      ...prev,
      filterType: type
    }));
  };

  const suggestedIngredientsRef = useRef(null);


  // Modified handleSubstitute function
  const handleSubstitute = (index) => {
    // If we're already in substitution mode for this slot, toggle between taste and category
    if (substitutionMode.active && substitutionMode.slotIndex === index) {
      if (substitutionMode.type === 'taste') {
        setSubstitutionMode(prev => ({
          ...prev,
          type: 'category'
        }));
      } else {
        exitSubstitutionMode();
      }
      return;
    }
  
    const sourceIngredient = selectedIngredients[index];
    const sourceProfile = ingredientProfiles.find(
      p => p.name.toLowerCase() === sourceIngredient?.toLowerCase()
    );
        
    if (sourceProfile) {
      // Reset taste filters
      setActiveSliders(new Set());
      setTasteValues({
        sweet: 5,
        salty: 5,
        sour: 5,
        bitter: 5,
        umami: 5,
        fat: 5,
        spicy: 5
      });
  
      // Set up category filters
      setActiveFilters({
        category: sourceProfile.category,
        subcategories: [sourceProfile.subcategory]
      });
    }
  
    setSubstitutionMode({
      active: true,
      sourceIngredient,
      sourceProfile,
      slotIndex: index,
      type: 'category'  // Start with category mode by default
    });
  
    setIsFiltersOpen(true);
    setShowPartialMatches(true);
    
    // Open search modal on mobile devices
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setIsSearchModalOpen(true);
    }
  };

// Modified exitSubstitutionMode function
const exitSubstitutionMode = () => {
  setSubstitutionMode({
    active: false,
    sourceIngredient: null,
    sourceProfile: null,
    slotIndex: null,
    type: 'category'
  });
  
  // Reset filters
  setActiveSliders(new Set());
  setTasteValues({
    sweet: 5,
    salty: 5,
    sour: 5,
    bitter: 5,
    umami: 5,
    fat: 5,
    spicy: 5
  });
  setShowPartialMatches(false);
  setActiveFilters({
    category: '',
    subcategories: []
  });
  
  // If on mobile, close the search modal when exiting substitution mode
  const isMobile = window.innerWidth < 768;
  if (isMobile && isSearchModalOpen) {
    setIsSearchModalOpen(false);
  }
};

const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  
  // Unified Filter Panel state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);



  // Initial loading of random ingredients if none are selected
  useEffect(() => {
    if (selectedIngredients.length === 0) {
      const initialPair = getRandomIngredients(5, true);
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
  
  // Check for combination in URL hash after allIngredients is available
  useEffect(() => {
    // Skip if already populated ingredients from initial effect
    if (selectedIngredients.length > 0) return;
    
    const hash = window.location.hash;
    if (hash && hash.startsWith('#combo=')) {
      const encodedCombo = hash.substring(7); // Remove '#combo='
      try {
        const decodedIngredients = decodeUrlToIngredients(encodedCombo);
        
        // Verify ingredients exist in our database
        const validIngredients = decodedIngredients.filter(ingredient => 
          allIngredients.includes(ingredient)
        );
        
        if (validIngredients.length > 0) {
          setSelectedIngredients(validIngredients.slice(0, 5)); // Keep 5-ingredient limit
          setNotification({
            message: 'Loaded combination from shared URL',
            type: 'success'
          });
          setTimeout(() => setNotification(null), 3000);
        }
      } catch (err) {
        console.error('Error decoding URL', err);
      }
    }
  }, [allIngredients, selectedIngredients.length]);

  // Dynamically filter ingredients based on taste values and categories

  const handleIngredientSelect = (ingredient) => {
    if (substitutionMode.active) {
      // Replace the ingredient at the substitution slot
      setSelectedIngredients(prev => {
        const newIngredients = [...prev];
        newIngredients[substitutionMode.slotIndex] = ingredient;
        return newIngredients;
      });
      exitSubstitutionMode();
      setSearchTerm(''); // Clear search term
      return;
    }
    
    // Add check for 5-ingredient limit
    if (selectedIngredients.length >= 5) {
      // Optionally show a notification to the user that the limit is reached
      return;
    }
    
    setSelectedIngredients((prev) => [...prev, ingredient]);
    setSearchTerm(''); // Clear search term
    
    // Close the search modal when an ingredient is selected
    setIsSearchModalOpen(false);
  };
  
  const findCompatibleIngredients = () => {
    // First filter all ingredients by taste values
    let filteredIngredients = Array.from(allIngredients).filter(ingredient => {
      const profile = ingredientProfiles.find(p => 
        p.name.toLowerCase() === ingredient.toLowerCase()
      );
      if (!profile) return false;
      
      // Only apply filters for active sliders
      return Array.from(activeSliders).every(taste => 
        profile.flavorProfile[taste] >= tasteValues[taste]
      );
    });
  
    // If no ingredients are selected, return the taste-filtered list
    if (selectedIngredients.length === 0) {
      return filteredIngredients;
    }
  
    // Otherwise, filter further by compatibility
    return filteredIngredients.filter(ingredient => {
      // Skip if already selected
      if (selectedIngredients.includes(ingredient)) return false;
      
      // Check compatibility with all selected ingredients
      return selectedIngredients.every(selected => 
        flavorMap.get(selected)?.has(ingredient)
      );
    });
  };
  
  
  const compatibleIngredients = useMemo(() => {
    let ingredients = getSortedCompatibleIngredients(
      selectedIngredients, 
      flavorMap, 
      ingredientProfiles,
      tasteValues,
      activeSliders
    );

    // Apply category and subcategory filters
    if (activeFilters.category || activeFilters.subcategories.length > 0) {
      ingredients = ingredients.filter(ingredient => {
        const profile = ingredientProfiles.find(p => 
          p.name.toLowerCase() === ingredient.toLowerCase()
        );
        
        if (!profile) return false;
        
        // Check category match if a category is selected
        if (activeFilters.category && profile.category !== activeFilters.category) {
          return false;
        }
        
        // Check subcategory match if any subcategories are selected
        if (activeFilters.subcategories.length > 0) {
          return activeFilters.subcategories.includes(profile.subcategory);
        }
        
        return true;
      });
    }

    return ingredients;
  }, [
    selectedIngredients, 
    flavorMap, 
    ingredientProfiles, 
    tasteValues, 
    activeSliders,
    activeFilters // Add activeFilters to dependencies
  ]);


  const handleFiltersChange = ({ category, subcategories }) => {
    setActiveFilters({
      category,
      subcategories: subcategories || []
    });
  };


// Updated getRandomIngredients function
const getRandomIngredients = (count = 5, startFresh = false, existingLocked = [], existingIngredients = new Set()) => {
  // Ensure count doesn't exceed 5
  const targetCount = Math.min(count, 5);

  let selections = [];
  let maxAttempts = 100;
  
  // Create a Set of all ingredients we want to exclude
  const excludeSet = new Set([...existingIngredients, ...selections]);
  
  // Filter ingredients based on dietary restrictions
  const isAllowedIngredient = (ingredient) => {
    const profile = ingredientProfiles.find(p => 
      p.name.toLowerCase() === ingredient.toLowerCase()
    );
    
    if (!profile) return true; // If we can't find a profile, allow it
    
    const key = `${profile.category}:${profile.subcategory}`;
    return dietaryRestrictions[key] !== false; // If restriction doesn't exist or is true, allow it
  };
  
  while (selections.length < count && maxAttempts > 0) {
    // For the first ingredient, we need to ensure compatibility with locked ingredients
    if (selections.length === 0) {
      let fullPool = Array.from(flavorMap.keys())
        .filter(ingredient => !excludeSet.has(ingredient) && isAllowedIngredient(ingredient));
      
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
      // Skip if already selected or excluded or restricted by dietary settings
      if (excludeSet.has(candidate) || !isAllowedIngredient(candidate)) return false;
      
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


const [isSearchFocused, setIsSearchFocused] = useState(false);
const [showPartialMatches, setShowPartialMatches] = useState(true);

// Filter and process ingredients
// Calculate active filter count for unified filter panel
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.category) count++;
    if (activeFilters.subcategories.length > 0) count += activeFilters.subcategories.length;
    if (activeSliders.size > 0) count += activeSliders.size;
    
    // Count dietary restrictions that are disabled (non-default state)
    const disabledRestrictions = Object.values(dietaryRestrictions).filter(enabled => enabled === false).length;
    count += disabledRestrictions;
    
    return count;
  }, [activeFilters, activeSliders, dietaryRestrictions]);

  const filteredIngredients = useMemo(() => {
// First apply search filter
let filtered = filterIngredients(allIngredients, searchTerm, selectedIngredients, ingredientProfiles);

  // Apply taste filters
  if (activeSliders.size > 0) {
    filtered = filtered.filter(ingredient => {
      const profile = ingredientProfiles.find(p => 
        p.name.toLowerCase() === ingredient.toLowerCase()
      );
      if (!profile) return false;
      
      return Array.from(activeSliders).every(taste => 
        profile.flavorProfile[taste] >= tasteValues[taste]
      );
    });
  }

  // If ingredients are selected, filter by compatibility
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

  // Apply substitution mode filters
  if (substitutionMode.active) {
    if (substitutionMode.type === 'category' && substitutionMode.sourceProfile) {
      filtered = filtered.filter(ingredient => {
        const profile = ingredientProfiles.find(p =>
          p.name.toLowerCase() === ingredient.toLowerCase()
        );
        
        if (!profile) return false;
        return profile.category === substitutionMode.sourceProfile.category &&
               profile.subcategory === substitutionMode.sourceProfile.subcategory;
      });
    }
  } else {
    // Normal mode - apply category filters if set
    if (activeFilters.category || activeFilters.subcategories.length > 0) {
      filtered = filtered.filter(ingredient => {
        const profile = ingredientProfiles.find(p =>
          p.name.toLowerCase() === ingredient.toLowerCase()
        );
        
        if (!profile) return false;
        
        if (activeFilters.category && profile.category !== activeFilters.category) {
          return false;
        }
        
        if (activeFilters.subcategories.length > 0) {
          return activeFilters.subcategories.includes(profile.subcategory);
        }
        
        return true;
      });
    }
  }

  return applySortingOption(
    Array.from(new Set(filtered)),
    activeSorting,
    ingredientProfiles
  );
}, [
  searchTerm,
  allIngredients,
  selectedIngredients,
  flavorMap,
  ingredientProfiles,
  tasteValues,
  activeSliders,
  activeFilters,
  activeSorting,
  substitutionMode,
  showPartialMatches  // Added to dependencies
]);

const toggleSlider = (taste) => {
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
  
  useEffect(() => {
    // Auto-focus the search input when the search modal opens
    if (isSearchModalOpen) {
      // Clear any existing search term when opening the modal
      setSearchTerm('');
      
      // Use a longer delay to ensure the modal is fully rendered
      setTimeout(() => {
        // Try multiple selector approaches for better compatibility
        const searchInput = document.querySelector('.search-modal-input') || 
                          document.querySelector('.modal-search-input') ||
                          document.querySelector('input[type="text"]');
        
        if (searchInput) {
          searchInput.focus();
          console.log('Search input focused');
        } else {
          console.log('Could not find search input to focus');
        }
      }, 300); // Longer delay to ensure modal is rendered
    }
  }, [isSearchModalOpen]);

  const [isTasteDropdownOpen, setIsTasteDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Function to generate shareable URL
  const generateShareableUrl = () => {
    if (selectedIngredients.length === 0) return window.location.href.split('#')[0];
    
    const encodedString = encodeIngredientsToUrl(selectedIngredients);
    const baseUrl = window.location.href.split('#')[0]; // Remove any existing hash
    return `${baseUrl}#combo=${encodedString}`;
  };
  
  // Handle sharing
  const handleShare = () => {
    const url = generateShareableUrl();
    navigator.clipboard.writeText(url)
      .then(() => {
        // Show notification that URL is copied
        setNotification({
          message: 'Combination URL copied to clipboard!',
          type: 'success'
        });
        setTimeout(() => setNotification(null), 3000);
      })
      .catch(err => {
        console.error('Failed to copy URL', err);
        setNotification({
          message: 'Failed to copy URL',
          type: 'error'
        });
        setTimeout(() => setNotification(null), 3000);
      });
  };
  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden relative bg-white text-sm md:text-base">
    {/* Mobile Search Bar - Only shows on mobile */}
    <div className="md:hidden p-3 pt-6 pb-4 fixed top-0 left-0 right-0 z-[1000] bg-white border-b border-gray-200 shadow-sm flex-none header-toolbar">
      <div className="flex items-center">
        <div 
          onClick={() => setIsSearchModalOpen(true)}
          className="relative cursor-pointer active:opacity-90 flex-1 mr-2"
        >
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-6 w-6 text-gray-500" />
            <input
              type="text"
              placeholder="Search ingredients or categories..."
              className="pl-10 w-full p-3 text-lg border-2 border-gray-400 rounded-full bg-gray-50 text-gray-500 focus:outline-none"
              readOnly
            />
            </div>
        </div>
        <button 
          onClick={() => setIsSearchModalOpen(true)}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 bg-gray-200"
          aria-label="Open search"
        >
          <Search size={24} className="text-gray-700" />
        </button>
      </div>
    </div>
        
        {/* Selected Ingredients Column - Fixed height container without scrolling */}
        <div className="fixed inset-0 top-[84px] bottom-20 w-full md:static md:flex-1 md:h-screen md:w-1/2 flex flex-col order-first md:order-last overflow-hidden md:pb-0 md:pt-0 max-h-[calc(100vh-168px)] md:max-h-screen z-0">
          <div className="flex flex-col h-full min-h-0 divide-y divide-gray-200 flex-shrink-0">
          {[...Array(5)].map((_, index) => (
          <div 
            key={`slot-${index}`}
            className="h-1/5 min-h-0 w-full px-2 sm:px-3 md:px-6 border-b border-gray-100 last:border-b-0 flex-shrink-0 overflow-hidden"
          >
            <IngredientSlot
              ingredient={selectedIngredients[index]}
              isLocked={lockedIngredients.has(index)}
              onLockToggle={() => handleLockToggle(index)}
              onRemove={() => {
                // Remove the ingredient
                setSelectedIngredients(prev => {
                  const next = [...prev];
                  next[index] = undefined;
                  return next.filter(Boolean);
                });
                
                // Also remove the lock for this slot if it exists
                if (lockedIngredients.has(index)) {
                  setLockedIngredients(prev => {
                    const next = new Set(prev);
                    next.delete(index);
                    return next;
                  });
                }
              }}
              onEdit={() => setEditingSlot(index)}
              profile={ingredientProfiles.find(
                p => p.name.toLowerCase() === selectedIngredients[index]?.toLowerCase()
              )}
              index={index}
              flavorMap={flavorMap}
              selectedIngredients={selectedIngredients}
              onSubstitute={() => handleSubstitute(index)}
              onExitSubstitute={handleExitSubstitution}
              isInSubstitutionMode={substitutionMode.active && substitutionMode.slotIndex === index}
            />
          </div>
        ))}
        </div>
      </div>
  
      {/* Search/Filters Column */}
      <div className="w-full h-1/2 md:h-screen md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-gray-200 order-last md:order-first overflow-hidden pb-14 md:pb-0">
        {/* Header/Toolbar - Desktop */}
<div className="p-3 pt-4 pb-4 z-[1000] bg-white border-t md:border-t-0 md:border-b border-gray-200 flex items-center order-last md:order-first fixed bottom-0 left-0 right-0 md:static footer-toolbar">
  <div className="hidden md:flex items-center flex-1">
    <img 
      src="/flavor-finder-1.png" 
      alt="Flavor Finder Logo" 
      className="h-12 w-auto object-contain mr-2 flavor-finder-logo"
    />
    <InfoTooltip 
    handleRandomize={handleRandomize}
    handleRecipeSearch={() => {
      if (selectedIngredients.length === 0) return;
      
      // Format the search query as simple space-separated list
      const ingredientsText = selectedIngredients.join(' ');
      
      // Copy to clipboard first
      navigator.clipboard.writeText(ingredientsText)
        .then(() => {
          // Open new tab with search
          const searchURL = `https://www.google.com/search?q=${encodeURIComponent(ingredientsText)}`;
          window.open(searchURL, '_blank');
        })
        .catch(err => {
          console.error('Failed to copy ingredients:', err);
        });
    }}
    />
   
  </div>
  <div className="flex items-center justify-between w-full md:w-auto md:space-x-2">
    {/* Mobile toolbar with 2 buttons */}
    <div className="grid grid-cols-2 w-full md:hidden gap-2">
      {/* Recipe Search button - 50% width */}
      <button 
        onClick={() => {
          if (selectedIngredients.length === 0) return;
          
          // Format the search query as simple space-separated list
          const ingredientsText = selectedIngredients.join(' ');
          
          // Copy to clipboard first
          navigator.clipboard.writeText(ingredientsText)
            .then(() => {
              // Open new tab with search
              const searchURL = `https://www.google.com/search?q=${encodeURIComponent(ingredientsText)}`;
              window.open(searchURL, '_blank');
            })
            .catch(err => {
              console.error('Failed to copy ingredients:', err);
            });
        }}
        className={`py-3 h-14 border-2 border-[#72A8D5] ${selectedIngredients.length === 0 ? 'opacity-50' : ''} bg-[#72A8D5] rounded-full font-sans flex items-center justify-center transition-colors`}
        disabled={selectedIngredients.length === 0}
      >
        <span className="text-white font-medium text-sm leading-tight">Find Recipes</span>
      </button>
      
      {/* Generate button - 50% width */}
      <button 
        onClick={handleRandomize}
        title="Generate"
        className="py-3 h-14 border-2 border-[#8DC25B] bg-[#8DC25B] text-white rounded-full font-sans flex items-center justify-center transition-colors generate-button"
      >
        <span className="font-medium text-sm leading-tight">Generate Pairing</span>
      </button>
    </div>
    
    {/* Desktop buttons */}
    <div className="hidden md:flex items-center">
      
      <button 
        onClick={() => {
          if (selectedIngredients.length === 0) return;
          
          // Format the search query as simple space-separated list
          const ingredientsText = selectedIngredients.join(' ');
          
          // Copy to clipboard first
          navigator.clipboard.writeText(ingredientsText)
            .then(() => {
              // Open new tab with search
              const searchURL = `https://www.google.com/search?q=${encodeURIComponent(ingredientsText)}`;
              window.open(searchURL, '_blank');
            })
            .catch(err => {
              console.error('Failed to copy ingredients:', err);
            });
        }}
        title="Recipe Search"
        className={`py-4 px-6 h-14 border-2 border-[#72A8D5] ${selectedIngredients.length === 0 ? 'opacity-50 text-gray-400' : 'text-[#000000] hover:bg-[#72A8D5] hover:text-white'} rounded-full transition-colors mx-2 flex items-center`}
        disabled={selectedIngredients.length === 0}
      >
        <Globe size={20} className="mr-2" />
        <span>Find Recipes</span>
      </button>
      
      <button 
        onClick={handleRandomize}
        title="Generate"
        className="py-4 px-6 h-14 border-2 border-[#8DC25B] text-[#000000] hover:bg-[#8DC25B] hover:text-white rounded-full font-sans flex items-center justify-center transition-colors mx-2 generate-button"
      >
        <Sparkles size={20} className="mr-2" />
        <span>Generate Pairing</span>
      </button>
    </div>
  </div>
</div>
  
        {/* Desktop Search/Filters Content */}
        <div className="hidden md:flex flex-1 flex-col min-h-0">
          <div className="px-4 pt-4">
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <SearchBar 
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  ingredients={allIngredients}
                  selectedIngredients={selectedIngredients}
                  onIngredientSelect={handleIngredientSelect}
                  isSearchFocused={isSearchFocused}
                  setIsSearchFocused={setIsSearchFocused}
                  ingredientProfiles={ingredientProfiles}
                  isCategorySearch={isCategorySearch}
                  setIsCategorySearch={setIsCategorySearch}
                />
              </div>
              <FilterPanelTrigger
                isOpen={isFilterPanelOpen}
                onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                activeFilterCount={activeFilterCount}
              />
            </div>
            
            {/* Unified Filter Panel */}
            {isFilterPanelOpen && (
              <div className="mb-4">
                <FilterPanel
                  isOpen={isFilterPanelOpen}
                  onClose={() => setIsFilterPanelOpen(false)}
                  
                  activeCategory={activeFilters.category}
                  selectedSubcategories={activeFilters.subcategories}
                  onCategoryChange={setActiveFilters}
                  
                  tasteValues={tasteValues}
                  activeSliders={activeSliders}
                  onTasteChange={setTasteValues}
                  onSliderToggle={toggleSlider}
                  
                  dietaryRestrictions={dietaryRestrictions}
                  onDietaryChange={setDietaryRestrictions}
                />
              </div>
            )}
          </div>
              
          <div className="flex-1 min-h-0 border border-gray-200 mt-0">
            <SuggestedIngredients
              ref={suggestedIngredientsRef}
              suggestions={filteredIngredients}
              onSelect={handleIngredientSelect}
              selectedIngredients={selectedIngredients}
              flavorMap={flavorMap}
              ingredientProfiles={ingredientProfiles}
              showPartialMatches={showPartialMatches}
              className="h-full"
              sortingOption={activeSorting}
              searchTerm={searchTerm}
              substitutionMode={{
                active: substitutionMode.active,
                sourceIngredient: substitutionMode.sourceIngredient,
                type: substitutionMode.type,
                slotIndex: substitutionMode.slotIndex
              }}
              onModeSelect={handleModeChange}
              onModeToggle={() => {
                if (substitutionMode.active) {
                  handleSubstitute(substitutionMode.slotIndex);
                }
              }}
            />
          </div>
          {/* Sorting and Partial Matches Row */}
          <div className="flex items-center justify-between bg-white py-4 px-4 border-t border-gray-200">
            <SortingFilter
              activeSorting={activeSorting}
              onSortingChange={setActiveSorting}
            />
            {/* Partial Matches Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm md:text-lg text-gray-800">
                
              </span>
              <button
                onClick={() => setShowPartialMatches(!showPartialMatches)}
                className={`
                  flex items-center
                  p-4
                  rounded-full
                  border-2 border-dashed
                  transition-colors
                  ${showPartialMatches 
                    ? 'text-gray-800 border-[#FFC533]' 
                    : 'bg-white text-gray-400 hover:border-[#FFC533]'
                  }
                `}
              >
                <Zap size={20} />
              </button>
            </div>
          </div>
        </div>
  
        {/* Mobile Search Modal */}
        <div className={`
          md:hidden fixed inset-0 z-[2000] transition-opacity duration-300
          ${isSearchModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-sm">
          </div>
          {/* Full Screen Modal Container */}
          <div className={`
            fixed inset-0 flex flex-col transform transition-transform duration-300 overflow-hidden bg-white
            ${isSearchModalOpen ? 'translate-y-0' : 'translate-y-full'}
          `}>
            {/* Fixed Header - Sticky */}
            <div className="flex-none sticky top-0 bg-white z-50 border-b border-gray-200 shadow-sm py-4 px-0">
              {/* Search Bar and Close Button Row */}
              <div className="flex items-center px-4 pb-2">
                <div className="flex-1">
                  <SearchBar 
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    ingredients={allIngredients}
                    selectedIngredients={selectedIngredients}
                    onIngredientSelect={handleIngredientSelect}
                    isSearchFocused={isSearchFocused}
                    setIsSearchFocused={setIsSearchFocused}
                    largerMobile={true}
                    ingredientProfiles={ingredientProfiles}
                    isCategorySearch={isCategorySearch}
                    setIsCategorySearch={setIsCategorySearch}
                    modalSearch={true}
                  />
                </div>
                <button 
                  onClick={() => setIsSearchModalOpen(false)} 
                  className="ml-3 p-2 rounded-full hover:bg-gray-100 bg-gray-200"
                  aria-label="Close search"
                >
                  <X size={24} className="text-gray-700" />
                </button>
              </div>
  
              {/* Unified Filter Panel Toggle - Below Search */}
              <div className="px-4">
                <button
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                  className="w-full flex items-center justify-between py-2 text-base rounded-lg text-gray-600 hover:text-gray-800"
                >
                  <span className="font-medium">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mr-2">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown size={20} className={isFilterPanelOpen ? 'rotate-180 transform' : ''} />
                </button>
              </div>
            </div>
  
            {/* Collapsible Filters - Below Search Bar */}
            <div className="flex-none overflow-hidden bg-white border-b border-gray-200">
              {/* Unified Filter Panel for Mobile */}
              <div className={`overflow-hidden transition-all duration-200 ${isFilterPanelOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 py-2">
                  <FilterPanel
                    isOpen={isFilterPanelOpen}
                    onClose={() => setIsFilterPanelOpen(false)}
                    
                    activeCategory={activeFilters.category}
                    selectedSubcategories={activeFilters.subcategories}
                    onCategoryChange={setActiveFilters}
                    
                    tasteValues={tasteValues}
                    activeSliders={activeSliders}
                    onTasteChange={setTasteValues}
                    onSliderToggle={toggleSlider}
                    
                    dietaryRestrictions={dietaryRestrictions}
                    onDietaryChange={setDietaryRestrictions}
                  />
                </div>
              </div>
            </div>
  
            {/* Scrollable Content Section - Takes Most Space */}
            <div className="flex-1 overflow-auto">
              <div className="h-full pb-16">
                {/* Removed the grey substitution instructions section */}
                <SuggestedIngredients
                  ref={suggestedIngredientsRef}
                  suggestions={filteredIngredients}
                  onSelect={(ingredient) => {
                    handleIngredientSelect(ingredient);
                    // The modal will be closed in handleIngredientSelect
                  }}
                  selectedIngredients={selectedIngredients}
                  flavorMap={flavorMap}
                  ingredientProfiles={ingredientProfiles}
                  showPartialMatches={showPartialMatches}
                  className="h-full pb-16" /* Add more padding at bottom for the fixed footer */
                  sortingOption={activeSorting}
                  searchTerm={searchTerm}
                  substitutionMode={{
                    active: substitutionMode.active,
                    sourceIngredient: substitutionMode.sourceIngredient,
                    type: substitutionMode.type,
                    slotIndex: substitutionMode.slotIndex
                  }}
                  onModeSelect={handleModeChange}
                  onModeToggle={() => {
                    if (substitutionMode.active) {
                      handleSubstitute(substitutionMode.slotIndex);
                    }
                  }}
                />
              </div>
            </div>
  
            {/* Mobile footer with sorting and partial matches */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
              <div className="flex items-center justify-between p-3">
                <SortingFilter
                  activeSorting={activeSorting}
                  onSortingChange={setActiveSorting}
                  compact={true}
                />
                <button
                  onClick={() => setShowPartialMatches(!showPartialMatches)}
                  className={`
                    p-2
                    rounded-full
                    border-2
                    border-dashed
                    transition-colors
                    flex-shrink-0
                    ${showPartialMatches 
                      ? 'text-gray-800 border-[#FFC533]' 
                      : 'text-gray-400 border-gray-300'
                    }
                  `}
                  title={showPartialMatches ? "Showing partial matches" : "Showing only perfect matches"}
                >
                  <Zap size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* TasteAnalysisModal */}
      <TasteAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        selectedIngredients={selectedIngredients}
      />
  
      {/* SettingsModal */}
      <div className={`
        md:hidden fixed inset-0 z-[2000] bg-white transition-opacity duration-300
        ${isSettingsModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}>
        {/* Full Screen Modal Container */}
        <div className={`
          fixed inset-0 flex flex-col transform transition-transform duration-300
          ${isSettingsModalOpen ? 'translate-y-0' : 'translate-y-full'}
        `}>
          {/* Fixed Header - Sticky */}
          <div className="flex-none sticky top-0 bg-white z-10 border-b border-gray-200 shadow-sm py-4 pt-6">
            {/* Header Bar and Close Button Row */}
            <div className="flex items-center justify-between px-4 pb-2">
              <h2 className="text-xl font-medium">Settings</h2>
              <button 
                onClick={() => setIsSettingsModalOpen(false)} 
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Scrollable Content Section */}
          <div className="flex-1 overflow-auto">
            <div className="h-full p-4 pb-28 overflow-hidden">
              <SettingsModal
                isOpen={true} /* Always open in mobile view */
                onClose={() => setIsSettingsModalOpen(false)}
                restrictions={dietaryRestrictions}
                onRestrictionsChange={setDietaryRestrictions}
                inMobileContainer={true} /* Add this prop to let the component know it's in a mobile container */
              />
            </div>
          </div>
          
          {/* Mobile footer with action buttons */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
            <div className="h-[4.5rem] flex items-center justify-between px-4">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="py-3 px-6 rounded-full border-2 border-gray-300 text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Call any save functions here if needed
                  setIsSettingsModalOpen(false);
                }}
                className="py-3 px-6 rounded-full border-2 border-[#8DC25B] bg-[#8DC25B] text-white font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Desktop SettingsModal - keep the regular modal for desktop view */}
      <div className="hidden md:block">
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          restrictions={dietaryRestrictions}
          onRestrictionsChange={setDietaryRestrictions}
        />
      </div>
      
      {/* Notification component for share functionality */}
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}
    </div>
  );
}