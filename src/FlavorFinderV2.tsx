import React, { useMemo, useEffect, useState } from 'react';
import { MinimalHeader } from './components/v2/MinimalHeader.tsx';
import { MobileBottomBar } from './components/v2/MobileBottomBar.tsx';
import { IngredientDisplay } from './components/v2/IngredientDisplay.tsx';
import { IngredientDrawer } from './components/v2/IngredientDrawer.tsx';
import { DietaryFilterPills } from './components/v2/DietaryFilterPills.tsx';
import { RecipeFinderModal } from './components/v2/RecipeFinderModal.tsx';
import { IngredientFiltersModal } from './components/v2/IngredientFiltersModal.tsx';
import { Sidebar } from './components/v2/Sidebar.tsx';
import { OnboardingWizard } from './components/v2/OnboardingWizard.tsx';
import { TasteLabSplit } from './components/v2/TasteLabSplit.tsx';
import { useScreenSize } from './hooks/useScreenSize.ts';
import { useIngredientSelection } from './hooks/useIngredientSelection.ts';
import { useFilters } from './hooks/useFilters.ts';
import { useCompatibility } from './hooks/useCompatibility.ts';
import { useTasteLab, TASTE_KEYS, TASTE_THRESHOLD } from './hooks/useTasteLab.ts';
import { useTheme } from './contexts/ThemeContext.tsx';
import { useSavedCombinations } from './hooks/useSavedCombinations.ts';
import { ingredientProfiles } from './data/ingredientProfiles.ts';
import { buildFlavorMap, ALL_SOURCES } from './utils/flavorMap.ts';
import { PairingSource } from './data/pairingMeta.ts';
import { filterIngredients } from './utils/searchUtils.ts';
import {
  NUT_INGREDIENTS_SET,
  NIGHTSHADE_INGREDIENTS_SET,
  HIGH_FODMAP_INGREDIENTS_SET,
} from './data/dietaryRestrictions.ts';

// Sources enabled by default: only those that currently have data and a sidebar toggle.
// (flavordb is a valid source for the ?sources= param and future use, but it has no edges
// yet, so it's not on by default — otherwise it could silently keep the graph "non-empty"
// while both real sources are toggled off.)
const DEFAULT_SOURCES: PairingSource[] = ['flavorbible', 'recipenlg', 'analog'];

// Initial sources for the flavor map. Defaults to DEFAULT_SOURCES; can be overridden for
// A/B testing via the `?sources=` URL param, e.g. `?sources=flavorbible` to see only the
// chef-canon graph. Invalid values are ignored.
const getEnabledSources = (): PairingSource[] => {
  if (typeof window === 'undefined') return DEFAULT_SOURCES;
  const param = new URLSearchParams(window.location.search).get('sources');
  if (!param) return DEFAULT_SOURCES;
  const requested = param
    .split(',')
    .map(s => s.trim())
    .filter((s): s is PairingSource => (ALL_SOURCES as string[]).includes(s));
  return requested.length > 0 ? requested : DEFAULT_SOURCES;
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

  const {
    combinations,
    saveCombination,
    deleteCombination,
  } = useSavedCombinations();

  // Taste Lab: two-slot, taste-driven generation mode
  const {
    isTasteLab,
    setIsTasteLab,
    slotTastes,
    setSlotTaste,
  } = useTasteLab();

  const { isDarkMode, isHighContrast } = useTheme();

  // UI state (not extracted to hooks as they're specific to this component)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isIngredientFiltersOpen, setIsIngredientFiltersOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [introAnimationComplete, setIntroAnimationComplete] = useState(false);
  const [noMatchToast, setNoMatchToast] = useState(false);
  const [saveToast, setSaveToast] = useState<'saved' | 'removed' | null>(null);

  // Pairing sources, toggleable from the sidebar (initial value can come from ?sources=).
  const [enabledSources, setEnabledSources] = useState<PairingSource[]>(() => getEnabledSources());
  const handleToggleSource = (source: PairingSource) => {
    setEnabledSources(prev => {
      if (prev.includes(source)) {
        const next = prev.filter(s => s !== source);
        return next.length === 0 ? prev : next; // keep at least one enabled
      }
      // Preserve canonical ordering.
      return ALL_SOURCES.filter(s => prev.includes(s) || s === source);
    });
  };

  // Create flavor map
  const { flavorMap } = useMemo(
    // Drop weak recipe-mined edges (strength <= 2) whose ingredients share fewer than 2
    // common chef-canon neighbors. These are co-occurrence artifacts (e.g. butterscotch +
    // noodles) that can't surface in multi-ingredient generation and only pollute pairs.
    () => buildFlavorMap({
      sources: enabledSources,
      pruneWeakEdges: { maxStrength: 2, minSharedNeighbors: 2 },
      suppressRedundant: true,
    }),
    [enabledSources]
  );

  // All ingredients: union of the flavor map (pairing-connected) and every profiled
  // ingredient. Sourcing from profiles too means newly-added ingredients are browsable
  // and searchable even before the mining pass gives them pairing edges. (Generation
  // still draws from flavorMap.keys() only, so pairless ingredients aren't forced into
  // random combinations.)
  const allIngredients = useMemo(
    () => Array.from(new Set([
      ...flavorMap.keys(),
      ...ingredientProfiles.map(p => p.name),
    ])).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    ),
    [flavorMap]
  );

  // Fast lowercase-name → profile lookup (used by Taste Lab generation)
  const profileByName = useMemo(() => {
    const map = new Map<string, typeof ingredientProfiles[number]>();
    ingredientProfiles.forEach(p => map.set(p.name.toLowerCase(), p));
    return map;
  }, []);

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

  // Taste Lab generation: find one ingredient per slot that satisfies its
  // constraint — a dominant taste or a category — where the two results still
  // pair with each other. A locked slot is treated as an anchor: its ingredient
  // is kept and the other slot is generated to pair against it (e.g. lock peanut
  // butter, find a sweet match).
  //
  // "Dominant" weighting (taste slots only): we first try to fill each taste
  // slot with ingredients whose chosen taste is their single strongest note
  // (anchovy → salty, plum → sweet), which makes pairings feel crisp. If no
  // pairing exists under that constraint, we relax it one slot at a time, then
  // fall back to the plain qualifying pool. Category slots ignore this weighting.
  //
  // Core solver: given the two slot constraints and a set of fixed anchors
  // (ingredients to keep in place), find a valid pair. `anchors` maps a slot
  // index to an ingredient that must stay there; open slots are generated.
  const computeTasteLabPair = (
    slots: typeof slotTastes,
    anchors: { 0?: string; 1?: string }
  ): string[] => {
    const profileFor = (ing: string) => profileByName.get(ing.toLowerCase())?.flavorProfile as any;
    const tasteScore = (ing: string, taste: string) => profileFor(ing)?.[taste] ?? 0;
    const categoryFor = (ing: string) => profileByName.get(ing.toLowerCase())?.category;

    // Is `taste` this ingredient's (tied) strongest note?
    const isDominant = (ing: string, taste: string) => {
      const fp = profileFor(ing);
      if (!fp) return false;
      const max = Math.max(...TASTE_KEYS.map(t => fp[t] ?? 0));
      return (fp[taste] ?? 0) >= max && max > 0;
    };

    // Does an ingredient satisfy a slot's constraint, ignoring the dominant-note
    // preference? Taste slots clear the threshold; category slots match category.
    const qualifies = (ing: string, slot: typeof slots[number]) =>
      slot.mode === 'category'
        ? categoryFor(ing) === slot.category
        : tasteScore(ing, slot.taste) >= TASTE_THRESHOLD;

    // Candidates for a slot. `requireDominant` only bites on taste slots — a
    // category slot has no "dominant note" to prefer, so it ignores the flag.
    const poolFor = (
      slot: typeof slots[number],
      exclude: Set<string>,
      requireDominant: boolean
    ) =>
      Array.from(flavorMap.keys()).filter(ing =>
        !exclude.has(ing) &&
        !isIngredientRestricted(ing) &&
        qualifies(ing, slot) &&
        (!requireDominant || slot.mode === 'category' || isDominant(ing, slot.taste))
      );

    const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const shuffle = (arr: string[]) => [...arr].sort(() => Math.random() - 0.5);

    const anchor0 = anchors[0];
    const anchor1 = anchors[1];

    // Both anchored — nothing to regenerate.
    if (anchor0 && anchor1) return [anchor0, anchor1];

    // One anchored — generate the partner that clears its taste and pairs,
    // preferring a dominant match before relaxing.
    if (anchor0 || anchor1) {
      const anchor = (anchor0 ?? anchor1)!;
      const openSlotIndex = anchor0 ? 1 : 0;
      const partnersFor = (requireDominant: boolean) =>
        poolFor(slots[openSlotIndex], new Set([anchor]), requireDominant)
          .filter(ing => flavorMap.get(anchor)?.has(ing));
      const partners = partnersFor(true).length ? partnersFor(true) : partnersFor(false);
      if (partners.length === 0) return [];
      const partner = pickRandom(partners);
      return openSlotIndex === 0 ? [partner, anchor] : [anchor, partner];
    }

    // Neither anchored — search slot 0 × slot 1, preferring dominant on both
    // slots and relaxing in priority order until a valid pairing is found.
    const maxAttempts = 300;
    const findPair = (domA: boolean, domB: boolean): string[] | null => {
      const candidatesA = shuffle(poolFor(slots[0], new Set(), domA));
      for (let i = 0; i < Math.min(candidatesA.length, maxAttempts); i++) {
        const a = candidatesA[i];
        const partners = poolFor(slots[1], new Set([a]), domB)
          .filter(ing => flavorMap.get(a)?.has(ing));
        if (partners.length > 0) return [a, pickRandom(partners)];
      }
      return null;
    };

    return (
      findPair(true, true) ||
      findPair(true, false) ||
      findPair(false, true) ||
      findPair(false, false) ||
      []
    );
  };

  // Full Generate: anchor whichever slots are locked (unless ignoring locks).
  const getTasteLabPair = (opts: { ignoreLocks?: boolean } = {}): string[] => {
    const anchors: { 0?: string; 1?: string } = {};
    if (!opts.ignoreLocks) {
      if (lockedIngredients.has(0)) anchors[0] = selectedIngredients[0];
      if (lockedIngredients.has(1)) anchors[1] = selectedIngredients[1];
    }
    return computeTasteLabPair(slotTastes, anchors);
  };

  // The ingredients that could actually fill each slot: they satisfy the slot's
  // constraint (category or taste), they pair with the *other* slot's current
  // ingredient, and they aren't that partner itself. This is what the per-slot
  // search browses, and its length is the only count that means anything — a
  // raw "N sweet ingredients" tally ignores whether they pair with the partner.
  const slotCandidates = useMemo(
    () =>
      slotTastes.map((slot, slotIndex) => {
        const partner = selectedIngredients[slotIndex === 0 ? 1 : 0];
        const partnerNeighbors = partner ? flavorMap.get(partner) : undefined;
        const meetsSlot = (ing: string) => {
          if (isIngredientRestricted(ing)) return false;
          const profile = profileByName.get(ing.toLowerCase());
          if (slot.mode === 'category') return profile?.category === slot.category;
          const fp = profile?.flavorProfile as any;
          return fp && (fp[slot.taste] ?? 0) >= TASTE_THRESHOLD;
        };
        return Array.from(flavorMap.keys())
          .filter(ing =>
            ing !== partner &&
            meetsSlot(ing) &&
            (!partnerNeighbors || partnerNeighbors.has(ing))
          )
          .sort((a, b) => a.localeCompare(b));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slotTastes, selectedIngredients, flavorMap, dietaryRestrictions, profileByName]
  );

  // For each slot, how many partner-compatible ingredients each taste and each
  // category would yield — i.e. the match count the user would get if they
  // picked that option. Lets the picker preview counts before you commit, so a
  // dead-end constraint (0 matches) is visible up front. Built by walking the
  // partner's neighbors once and tallying every taste/category they satisfy.
  const slotOptionCounts = useMemo(
    () =>
      slotTastes.map((_slot, slotIndex) => {
        const partner = selectedIngredients[slotIndex === 0 ? 1 : 0];
        const partnerNeighbors = partner ? flavorMap.get(partner) : undefined;
        const taste: Record<string, number> = {};
        const category: Record<string, number> = {};
        TASTE_KEYS.forEach(t => (taste[t] = 0));
        const pool = partnerNeighbors ? Array.from(partnerNeighbors) : Array.from(flavorMap.keys());
        for (const ing of pool) {
          if (ing === partner || isIngredientRestricted(ing)) continue;
          const profile = profileByName.get(ing.toLowerCase());
          if (!profile) continue;
          const fp = profile.flavorProfile as any;
          if (fp) {
            for (const t of TASTE_KEYS) {
              if ((fp[t] ?? 0) >= TASTE_THRESHOLD) taste[t]++;
            }
          }
          if (profile.category) category[profile.category] = (category[profile.category] ?? 0) + 1;
        }
        return { taste, category };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slotTastes, selectedIngredients, flavorMap, dietaryRestrictions, profileByName]
  );

  // Total number of valid combinations for the current constraints: distinct
  // ingredient pairs where one side clears slot 0, the other clears slot 1, and
  // the two actually pair. This is the real solution space — it can hit zero
  // (no possible pairing) even while each side still has matching ingredients.
  const tasteLabPairingCount = useMemo(() => {
    const meets = (ing: string, slot: typeof slotTastes[number]) => {
      if (isIngredientRestricted(ing)) return false;
      const profile = profileByName.get(ing.toLowerCase());
      if (slot.mode === 'category') return profile?.category === slot.category;
      const fp = profile?.flavorProfile as any;
      return fp && (fp[slot.taste] ?? 0) >= TASTE_THRESHOLD;
    };
    const p0 = new Set<string>();
    const p1 = new Set<string>();
    for (const ing of flavorMap.keys()) {
      if (meets(ing, slotTastes[0])) p0.add(ing);
      if (meets(ing, slotTastes[1])) p1.add(ing);
    }
    let count = 0;
    for (const a of flavorMap.keys()) {
      const neighbors = flavorMap.get(a);
      if (!neighbors) continue;
      for (const b of neighbors) {
        // Count each unordered edge once.
        if (a < b && ((p0.has(a) && p1.has(b)) || (p1.has(a) && p0.has(b)))) {
          count++;
        }
      }
    }
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotTastes, flavorMap, dietaryRestrictions, profileByName]);

  // Changing a slot's constraint (its mode, taste, or category) rerolls just
  // that side, keeping the other ingredient anchored. Each change is a discrete,
  // undoable user choice, so every one saves history and refreshes the pick.
  const handleSlotTasteChange = (
    slotIndex: number,
    patch: { mode?: 'taste' | 'category'; taste?: any; category?: any }
  ) => {
    setSlotTaste(slotIndex, patch);
    if (!isTasteLab) return;

    const newSlots = slotTastes.map((s, i) =>
      i === slotIndex ? { ...s, ...patch } : s
    ) as typeof slotTastes;

    const otherIndex = slotIndex === 0 ? 1 : 0;
    const anchor = selectedIngredients[otherIndex];
    const pair = computeTasteLabPair(newSlots, anchor ? { [otherIndex]: anchor } : {});
    if (pair.length < 2) {
      setNoMatchToast(true);
      return;
    }
    saveToHistory();
    setSelectedIngredients(pair);
  };

  // Per-slot search: the user hand-picks an ingredient for one slot from the
  // candidate list (which already pairs with the partner), keeping the other
  // slot fixed. No regeneration needed — the choice is known-good.
  const handleSlotIngredientPick = (slotIndex: number, ingredient: string) => {
    if (!isTasteLab) return;
    if (selectedIngredients[slotIndex] === ingredient) return;
    saveToHistory();
    const next = [...selectedIngredients];
    next[slotIndex] = ingredient;
    setSelectedIngredients(next);
  };

  // Toggle Taste Lab mode. Entering it resets to a fresh 2-slot pair.
  const handleTasteLabChange = (enabled: boolean) => {
    setIsTasteLab(enabled);
    if (enabled) {
      saveToHistory();
      setLockedIngredients(new Set());
      setTargetIngredientCount(2);
      const pair = getTasteLabPair({ ignoreLocks: true });
      if (pair.length === 2) setSelectedIngredients(pair);
    }
  };

  // Taste Lab is a strict two-slot mode: each slot's taste governs the
  // ingredient sitting at that index. The normal add/remove machinery shifts
  // indices, which would scramble that mapping (e.g. a sweet pick ending up in
  // the "spicy" slot). So any structural edit that leaves us with something
  // other than exactly two ingredients drops back to Classic. (Generate and
  // lock keep the count at two and stay in the mode.)
  useEffect(() => {
    if (isTasteLab && selectedIngredients.length !== 2) {
      setIsTasteLab(false);
    }
  }, [isTasteLab, selectedIngredients.length, setIsTasteLab]);

  // Initialize with random ingredients and run intro animation
  useEffect(() => {
    if (selectedIngredients.length === 0) {
      const initial = getRandomIngredients(2);
      setSelectedIngredients(initial);
    }
  }, []);

  // Show the onboarding wizard on a user's first visit (desktop/web only).
  // Replayable any time from the sidebar's "Take the tour" button.
  useEffect(() => {
    if (isMobile) return;
    try {
      const seen = localStorage.getItem('hasSeenOnboarding');
      if (!seen) setIsWizardOpen(true);
    } catch {
      // Ignore storage access errors (e.g. private mode)
    }
  }, [isMobile]);

  const handleWizardClose = () => {
    setIsWizardOpen(false);
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
    } catch {
      // Ignore storage access errors
    }
  };

  // Intro animation - a brief shuffle so the app feels alive without delaying interaction
  useEffect(() => {
    if (introAnimationComplete || selectedIngredients.length === 0) return;

    let generationCount = 0;
    const maxGenerations = 3;
    const intervalMs = 180;

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
    // Taste Lab mode: generate a taste-constrained pair instead.
    if (isTasteLab) {
      const pair = getTasteLabPair();
      if (pair.length < 2) {
        setNoMatchToast(true);
        return;
      }
      saveToHistory();
      setSelectedIngredients(pair);
      return;
    }

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

  // Which selected ingredient the drawer's side info panel is focused on. Lifted
  // here (rather than internal to the drawer) so locking an ingredient can also
  // focus it in the panel.
  const [selectedInfoIndex, setSelectedInfoIndex] = useState(0);

  // Wrap handleLockToggle so locking/unlocking also focuses that ingredient in
  // the side info panel.
  const handleLockToggleWithFocus = (index: number) => {
    handleLockToggle(index);
    setSelectedInfoIndex(index);
  };

  // Wrap handleIncrementTarget to pass flavorMap and isIngredientRestricted.
  // If no compatible ingredient can be added, surface UI feedback instead of
  // silently adding an empty slot.
  const handleIncrementTarget = () => {
    const added = baseHandleIncrementTarget(flavorMap, isIngredientRestricted);
    if (!added) {
      setNoMatchToast(true);
    }
  };

  // Auto-dismiss the "no matching ingredient" toast
  useEffect(() => {
    if (!noMatchToast) return;
    const timer = setTimeout(() => setNoMatchToast(false), 3000);
    return () => clearTimeout(timer);
  }, [noMatchToast]);

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

      // + or = - Add ingredient (disabled in Taste Lab, which is fixed at 2)
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        if (!isTasteLab && canIncrementTarget) {
          handleIncrementTarget();
        }
        return;
      }

      // - - Remove ingredient (disabled in Taste Lab, which is fixed at 2)
      if (e.key === '-') {
        e.preventDefault();
        if (!isTasteLab && canDecrementTarget) {
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
  }, [selectedIngredients, lockedIngredients, canIncrementTarget, canDecrementTarget, isTasteLab, slotTastes]);

  // Handle recipe search - opens the recipe finder modal
  const handleRecipeSearch = () => {
    if (selectedIngredients.length === 0) return;
    setIsRecipeModalOpen(true);
  };

  // Find a saved combination matching the current selection (order-independent)
  const currentSavedId = useMemo(() => {
    if (selectedIngredients.length === 0) return null;
    const match = combinations.find(combo =>
      combo.ingredients.length === selectedIngredients.length &&
      combo.ingredients.every(ing => selectedIngredients.includes(ing))
    );
    return match ? match.id : null;
  }, [combinations, selectedIngredients]);

  // Toggle saving the current combination from the header bookmark button
  const handleSaveToggle = () => {
    if (selectedIngredients.length === 0) return;
    if (currentSavedId) {
      deleteCombination(currentSavedId);
      setSaveToast('removed');
    } else {
      saveCombination(selectedIngredients.join(', '), selectedIngredients);
      setSaveToast('saved');
    }
  };

  // Load a saved combination into the workspace (from the sidebar)
  const handleLoadCombination = (ingredients: string[]) => {
    if (ingredients.length === 0) return;
    saveToHistory();
    setSelectedIngredients([...ingredients]);
    setLockedIngredients(new Set());
    setTargetIngredientCount(ingredients.length);
    setIsSidebarOpen(false);
  };

  // Auto-dismiss the save/remove confirmation toast
  useEffect(() => {
    if (!saveToast) return;
    const timer = setTimeout(() => setSaveToast(null), 2200);
    return () => clearTimeout(timer);
  }, [saveToast]);

  // Filter suggestions for drawer
  const filteredSuggestions = useMemo(() => {
    let filtered = filterIngredients(
      allIngredients,
      searchTerm,
      selectedIngredients,
      ingredientProfiles
    );

    // When the user is typing a search, never hide name matches behind the
    // compatibility filter - home chefs need to add what's in their kitchen.
    // Compatible matches are sorted first below instead.
    const isSearching = searchTerm.trim().length > 0;

    // Filter by compatibility with selected ingredients (browsing mode only)
    if (selectedIngredients.length > 0 && !isSearching) {
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

    // Sort: perfect matches first, then partial, then the rest (alphabetically within each)
    if ((showPartialMatches || isSearching) && selectedIngredients.length > 0) {
      const matchTier = (ingredient: string) => {
        const matches = selectedIngredients.filter(selected =>
          flavorMap.get(selected)?.has(ingredient)
        ).length;
        if (matches === selectedIngredients.length) return 0; // perfect
        if (matches > 0) return 1; // partial
        return 2; // no pairing data
      };

      filtered.sort((a, b) => {
        const tierDiff = matchTier(a) - matchTier(b);
        if (tierDiff !== 0) return tierDiff;
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });
    }

    return filtered;
  }, [searchTerm, allIngredients, selectedIngredients, flavorMap, activeCategory, selectedSubcategories, activeSliders, tasteValues, dietaryRestrictions, showPartialMatches]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col transition-colors duration-300">
      {/* "No matching ingredient" toast */}
      {noMatchToast && (
        <div
          role="status"
          aria-live="polite"
          className={`
            fixed left-1/2 -translate-x-1/2 z-50
            ${isMobile ? 'bottom-28 animate-toast-in-bottom' : 'top-32 animate-toast-in'}
            flex items-center gap-2
            px-4 py-2.5 rounded-full
            bg-gray-900 dark:bg-white
            text-white dark:text-gray-900
            text-sm font-medium shadow-lg
          `}
        >
          {isTasteLab
            ? 'No pairing fits those slots — try a different taste or category'
            : 'No other ingredient pairs with all of these'}
        </div>
      )}

      {/* Save confirmation toast */}
      {saveToast && (
        <div
          role="status"
          aria-live="polite"
          className={`
            fixed left-1/2 -translate-x-1/2 z-50
            ${isMobile ? 'bottom-28 animate-toast-in-bottom' : 'top-32 animate-toast-in'}
            flex items-center gap-2
            px-4 py-2.5 rounded-full
            bg-gray-900 dark:bg-white
            text-white dark:text-gray-900
            text-sm font-medium shadow-lg
          `}
        >
          {saveToast === 'saved' ? 'Saved to your combinations' : 'Removed from saved'}
        </div>
      )}

      {/* Minimal Header */}
      <MinimalHeader
        targetCount={targetIngredientCount}
        currentCount={selectedIngredients.length}
        minTarget={minTarget}
        maxTarget={5}
        canIncrement={!isTasteLab && canIncrementTarget}
        canDecrement={!isTasteLab && canDecrementTarget}
        onGenerate={handleRandomize}
        onIncrementTarget={handleIncrementTarget}
        onDecrementTarget={handleDecrementTarget}
        onRecipesClick={handleRecipeSearch}
        onSaveClick={handleSaveToggle}
        isSaved={currentSavedId !== null}
        onLogoClick={() => setIsSidebarOpen(true)}
        isGeneratePulsing={isFirstLoad}
        isMobile={isMobile}
      />

      {/* Mobile Bottom Bar */}
      {isMobile && (
        <MobileBottomBar
          canIncrement={!isTasteLab && canIncrementTarget}
          canDecrement={!isTasteLab && canDecrementTarget}
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
        pt-20 ${isTasteLab && !isDrawerOpen ? (isMobile ? 'pb-24' : 'pb-20') : (isMobile ? 'pb-24' : 'pb-32')}
        ${isMobile && !isDrawerOpen ? 'overflow-y-auto overflow-x-clip' : ''}
      `}>
        {/* Taste Lab: full-bleed split view (columns on desktop, rows on mobile) */}
        {isTasteLab && !isDrawerOpen ? (
          <TasteLabSplit
            slotTastes={slotTastes}
            onSlotTasteChange={handleSlotTasteChange}
            slotCandidates={slotCandidates}
            slotOptionCounts={slotOptionCounts}
            onSlotIngredientPick={handleSlotIngredientPick}
            pairingCount={tasteLabPairingCount}
            ingredients={selectedIngredients}
            lockedIndices={lockedIngredients}
            onLockToggle={handleLockToggleWithFocus}
            isMobile={isMobile}
            isDarkMode={isDarkMode}
            isHighContrast={isHighContrast}
          />
        ) : isMobile && !isDrawerOpen ? (
          <>
            {/* Ingredient Display */}
            <div className="flex-1 flex flex-col">
              <IngredientDisplay
                ingredients={selectedIngredients}
                lockedIngredients={lockedIngredients}
                ingredientProfiles={ingredientProfiles}
                maxSlots={targetIngredientCount}
                onRemove={handleRemove}
                onLockToggle={handleLockToggleWithFocus}
                onEmptySlotClick={() => setIsDrawerOpen(true)}
                onCloseDrawer={() => setIsDrawerOpen(false)}
                isDrawerOpen={isDrawerOpen}
                flavorMap={flavorMap}
              />
            </div>

            {/* Dietary Filter Pills - fixed above bottom bar on mobile */}
            <div className="fixed left-0 right-0 bottom-[92px] z-[55] px-4 overflow-x-auto scrollbar-hide">
              <DietaryFilterPills
                dietaryRestrictions={dietaryRestrictions}
                onDietaryChange={setDietaryRestrictions}
                isInFlow={true}
              />
            </div>
          </>
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
                onLockToggle={handleLockToggleWithFocus}
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

      {/* Ingredient Drawer (desktop undo lives in the drawer's bottom bar) */}
      <IngredientDrawer
        isOpen={isDrawerOpen}
        onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
        onClose={() => setIsDrawerOpen(false)}
        onOpen={() => setIsDrawerOpen(true)}
        onUndo={handleUndo}
        canUndo={canUndo}
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
        // Side info panel focus (lifted so locking can focus it too)
        selectedInfoIndex={selectedInfoIndex}
        onInfoIndexChange={setSelectedInfoIndex}
      />

      {/* Recipe Finder Modal */}
      <RecipeFinderModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        ingredients={selectedIngredients}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        dietaryRestrictions={dietaryRestrictions}
        onDietaryChange={setDietaryRestrictions}
        compatibilityMode={compatibilityMode}
        onCompatibilityChange={handleCompatibilityChange}
        isTasteLab={isTasteLab}
        onTasteLabChange={handleTasteLabChange}
        enabledSources={enabledSources}
        onToggleSource={handleToggleSource}
        onOpenIngredientFilters={() => setIsIngredientFiltersOpen(true)}
        onStartTour={() => {
          setIsSidebarOpen(false);
          setIsWizardOpen(true);
        }}
        savedCombinations={combinations}
        onLoadCombination={handleLoadCombination}
        onDeleteCombination={deleteCombination}
      />

      {/* Ingredient Filters Modal */}
      <IngredientFiltersModal
        isOpen={isIngredientFiltersOpen}
        onClose={() => setIsIngredientFiltersOpen(false)}
        dietaryRestrictions={dietaryRestrictions}
        onDietaryChange={setDietaryRestrictions}
        ingredientProfiles={ingredientProfiles}
      />

      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={isWizardOpen}
        onClose={handleWizardClose}
      />
    </div>
  );
}
