import React, { useMemo, useEffect, useState, useRef } from 'react';
import { MinimalHeader } from './components/v2/MinimalHeader.tsx';
import { MobileBottomBar } from './components/v2/MobileBottomBar.tsx';
import { IngredientDisplay } from './components/v2/IngredientDisplay.tsx';
import { ComboContextStrip } from './components/v2/ComboContextStrip.tsx';
import { getLoadedContext, loadContext } from './utils/contextLoader.ts';
import { IngredientDrawer } from './components/v2/IngredientDrawer.tsx';
import { DietaryFilterPills } from './components/v2/DietaryFilterPills.tsx';
import { RecipeFinderModal } from './components/v2/RecipeFinderModal.tsx';
import { IngredientFiltersModal } from './components/v2/IngredientFiltersModal.tsx';
import { Sidebar } from './components/v2/Sidebar.tsx';
import { OnboardingWizard } from './components/v2/OnboardingWizard.tsx';
import { TasteLabSplit } from './components/v2/TasteLabSplit.tsx';
import { PresetGallery } from './components/v2/PresetGallery.tsx';
import { LandingSurface, LandingTagGroup } from './components/v2/LandingSurface.tsx';
import { FlavorPreset } from './data/flavorPresets.ts';
import { useScreenSize } from './hooks/useScreenSize.ts';
import { useIngredientSelection } from './hooks/useIngredientSelection.ts';
import { useFilters } from './hooks/useFilters.ts';
import { useCompatibility } from './hooks/useCompatibility.ts';
import { useTasteLab, TASTE_KEYS, TASTE_THRESHOLD, TasteKey, CategoryKey, SlotTaste } from './hooks/useTasteLab.ts';
import { useTheme } from './contexts/ThemeContext.tsx';
import { useSavedCombinations } from './hooks/useSavedCombinations.ts';
import { useCustomPresets } from './hooks/useCustomPresets.ts';
import { ingredientProfiles } from './data/ingredientProfiles.ts';
import { buildFlavorMap, ALL_SOURCES } from './utils/flavorMap.ts';
import { PairingSource } from './data/pairingMeta.ts';
import { filterIngredients } from './utils/searchUtils.ts';
import {
  encodeTasteLabState,
  decodeTasteLabState,
  encodeIngredientsToUrl,
  decodeUrlToIngredients,
} from './utils/urlEncoding.js';
import { TASTE_COLORS, CATEGORY_COLORS } from './utils/colors.ts';
import { ChevronDown } from 'lucide-react';
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
    handleDecrementTarget: baseHandleDecrementTarget,
  } = useIngredientSelection({
    initialTargetCount: 2,
    // Taste Lab picks mutate the slot constraints (a slot relabels to describe
    // the new ingredient, which drives its color + match count). Snapshot that
    // state alongside the ingredients so undo reverts the whole pairing — color,
    // constraint, and match results — not just the ingredient names.
    captureExtra: () => ({
      slotTastes,
      lockedConstraints: new Set(lockedConstraints),
      tasteLabPool,
    }),
    restoreExtra: (extra) => {
      const e = extra as
        | { slotTastes: SlotTaste[]; lockedConstraints: Set<number>; tasteLabPool: typeof tasteLabPool }
        | undefined;
      if (!e) return;
      setSlotTastes(e.slotTastes);
      setLockedConstraints(new Set(e.lockedConstraints));
      setTasteLabPool(e.tasteLabPool);
    },
  });

  // Taste Lab supports 2–4 ingredients.
  const TASTE_LAB_MIN = 1;
  const TASTE_LAB_MAX = 4;

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

  const { customPresets, addCustomPreset, deleteCustomPreset } = useCustomPresets();

  // Active themed pool (e.g. "Pizza Night"): when set, every Taste Lab slot is
  // confined to this whitelist of ingredients. null = the full library.
  const [tasteLabPool, setTasteLabPool] = useState<{ name: string; ingredients: string[] } | null>(null);
  // Whether the themed-pool banner is expanded to reveal its full ingredient list.
  const [isPoolExpanded, setIsPoolExpanded] = useState(false);
  const poolBannerRef = useRef<HTMLDivElement>(null);

  // Collapse the expanded pool list when the user clicks anywhere outside it.
  useEffect(() => {
    if (!isPoolExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (poolBannerRef.current && !poolBannerRef.current.contains(e.target as Node)) {
        setIsPoolExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPoolExpanded]);

  // Taste Lab: two-slot, taste-driven generation mode
  const {
    isTasteLab,
    setIsTasteLab,
    slotTastes,
    setSlotTaste,
    setSlotTastes,
  } = useTasteLab();

  // Slot indices whose taste/category constraint is pinned. Generate randomizes
  // freely on unlocked slots but stays within the constraint on locked ones
  // (and the ingredient lock, which pins the exact ingredient, supersedes both).
  const [lockedConstraints, setLockedConstraints] = useState<Set<number>>(new Set());
  const handleConstraintLockToggle = (index: number) => {
    setLockedConstraints(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const { isDarkMode, isHighContrast } = useTheme();

  // UI state (not extracted to hooks as they're specific to this component)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPresetGalleryOpen, setIsPresetGalleryOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isIngredientFiltersOpen, setIsIngredientFiltersOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
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
  const { flavorMap: baseFlavorMap } = useMemo(
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

  // Tag-click steering: lock generation into a cuisine or dish type from the context
  // strip. Active steering restricts the flavor map to edges whose mined context
  // carries the tag — a strict SUBSET of the graph, so every steered combination is
  // still fully mutually compatible (the pairing check itself is never relaxed; see
  // CLAUDE.md). All downstream machinery — generation in every compatibility mode,
  // slot candidates, drawer counts — reads the steered map transparently.
  const [contextSteer, setContextSteer] = useState<{ group: 'dish' | 'cuisine'; tag: string } | null>(null);
  // The filter lives in the lazily-loaded context chunk. Activation always comes from
  // the strip (which loads it), but a defensive load keeps this self-sufficient.
  const [steerModule, setSteerModule] = useState(() => getLoadedContext());
  useEffect(() => {
    if (contextSteer && !steerModule) loadContext().then(setSteerModule);
  }, [contextSteer, steerModule]);

  const flavorMap = useMemo(() => {
    if (!contextSteer || !steerModule || isTasteLab) return baseFlavorMap;
    return steerModule.filterFlavorMapByTag(baseFlavorMap, contextSteer.group, contextSteer.tag);
  }, [baseFlavorMap, contextSteer, steerModule, isTasteLab]);

  // Landing entry surface: the empty state. Whenever the combo is empty the app
  // leads with search + browsable tags instead of an auto-seeded combo — so it
  // shows on a fresh open AND returns when the user deletes every ingredient.
  // The one exception is the initial deep-link restore (?lab=/?ing=), where the
  // combo is momentarily empty before the seed effect runs; suppress the flash
  // until that effect clears the flag.
  const [suppressLandingForRestore, setSuppressLandingForRestore] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('lab') || params.has('ing');
  });
  const showLanding = !suppressLandingForRestore && selectedIngredients.length === 0;

  // Returning to the landing (empty combo) is a clean slate: drop any active
  // steer so the next entry — a tag tap, an ingredient, Surprise me — isn't
  // secretly constrained by the tag the emptied combo was steered into.
  useEffect(() => {
    if (selectedIngredients.length === 0 && contextSteer) setContextSteer(null);
  }, [selectedIngredients, contextSteer]);

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
  // mapOverride: generate against a different graph than the live flavorMap —
  //   used by the landing surface to run against a freshly steered map before
  //   the steer state has flushed. Always a subset of the flavor map, so the
  //   compatibility check itself is unchanged.
  const getRandomIngredients = (
    count = 5,
    lockedList: string[] = [],
    mode = 'perfect',
    mapOverride?: Map<string, Set<string>>
  ) => {
    const map = mapOverride ?? flavorMap;
    const maxGlobalAttempts = 200;

    // Random mode: just pick any ingredients (respecting dietary restrictions)
    if (mode === 'random') {
      const availablePool = Array.from(map.keys())
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
        const availablePool = Array.from(map.keys())
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
              map.get(existing)?.has(candidate)
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
            map.get(ing)?.has(other)
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
          pool = Array.from(map.keys())
            .filter(ingredient => !excludeSet.has(ingredient))
            .filter(ingredient => !isIngredientRestricted(ingredient));
        } else {
          // Must be compatible with all existing selections and locked ingredients
          const allToCheck = [...selections, ...lockedList];
          pool = Array.from(map.keys()).filter(candidate => {
            if (excludeSet.has(candidate)) return false;
            if (isIngredientRestricted(candidate)) return false;
            return allToCheck.every(existing =>
              map.get(existing)?.has(candidate)
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
  // Core solver: given N slot constraints and a set of fixed anchors
  // (ingredients to keep in place), find a mutually-compatible combination —
  // one ingredient per slot, every pair compatible, each clearing its slot's
  // taste/category (or anything for a free slot). `anchors` maps a slot index to
  // an ingredient that must stay; open slots are generated by backtracking.
  const computeTasteLabCombo = (
    slots: SlotTaste[],
    anchors: Record<number, string>,
    // Slot indices with no taste/category constraint — they accept any
    // ingredient. Used by Generate to fully randomize an unlocked slot.
    freeSlots: Set<number> = new Set(),
    // Themed pool whitelist. Defaults to the live pool; passed explicitly by
    // handleLoadPreset since the pool state update hasn't flushed yet there.
    poolOverride: string[] | null | undefined = tasteLabPool?.ingredients ?? null
  ): string[] => {
    const N = slots.length;
    const profileFor = (ing: string) => profileByName.get(ing.toLowerCase())?.flavorProfile as any;
    const tasteScore = (ing: string, taste: string) => profileFor(ing)?.[taste] ?? 0;
    const categoryFor = (ing: string) => profileByName.get(ing.toLowerCase())?.category;
    const subcategoryFor = (ing: string) => profileByName.get(ing.toLowerCase())?.subcategory;
    const poolSet = poolOverride ? new Set(poolOverride.map(s => s.toLowerCase())) : null;

    // Is `taste` this ingredient's (tied) strongest note?
    const isDominant = (ing: string, taste: string) => {
      const fp = profileFor(ing);
      if (!fp) return false;
      const max = Math.max(...TASTE_KEYS.map(t => fp[t] ?? 0));
      return (fp[taste] ?? 0) >= max && max > 0;
    };

    // Free slots accept anything; taste slots clear the threshold; category
    // slots match category.
    const qualifies = (ing: string, idx: number) => {
      // Pool + exclude bite first — they hold even for free/wild slots, so a
      // themed pool or carved-out category is never escaped by a reroll.
      if (poolSet && !poolSet.has(ing.toLowerCase())) return false;
      const slot = slots[idx];
      if (slot.exclude?.length) {
        const c = categoryFor(ing);
        if (c && slot.exclude.includes(c as CategoryKey)) return false;
      }
      if (freeSlots.has(idx)) return true;
      if (slot.mode === 'wild') return true; // no constraint — any ingredient
      if (slot.mode === 'category') {
        if (categoryFor(ing) !== slot.category) return false;
        return !slot.subcategories?.length || slot.subcategories.includes(subcategoryFor(ing) as string);
      }
      return tasteScore(ing, slot.taste) >= TASTE_THRESHOLD;
    };

    // Candidates for a slot. `requireDominant` only bites on taste slots — a
    // free or category slot has no "dominant note" to prefer, so it ignores it.
    const poolFor = (idx: number, requireDominant: boolean) => {
      const slot = slots[idx];
      return Array.from(flavorMap.keys()).filter(ing =>
        !isIngredientRestricted(ing) &&
        qualifies(ing, idx) &&
        (!requireDominant || freeSlots.has(idx) || slot.mode === 'category' || slot.mode === 'wild' || isDominant(ing, slot.taste))
      );
    };

    const shuffle = (arr: string[]) => [...arr].sort(() => Math.random() - 0.5);

    const placed: (string | null)[] = new Array(N).fill(null);
    Object.entries(anchors).forEach(([k, v]) => { placed[Number(k)] = v; });

    // Is `ing` distinct from, and compatible with, every other placed pick?
    const fitsPlaced = (ing: string, idx: number) => {
      for (let j = 0; j < N; j++) {
        if (j === idx || !placed[j]) continue;
        if (ing === placed[j]) return false;
        if (!flavorMap.get(ing)?.has(placed[j] as string)) return false;
      }
      return true;
    };

    const openIdx: number[] = [];
    for (let i = 0; i < N; i++) if (!placed[i]) openIdx.push(i);

    const maxBranch = 400;
    const fill = (pos: number, requireDominant: boolean): boolean => {
      if (pos === openIdx.length) return true;
      const idx = openIdx[pos];
      const pool = shuffle(poolFor(idx, requireDominant)).filter(ing => fitsPlaced(ing, idx));
      const limit = Math.min(pool.length, maxBranch);
      for (let i = 0; i < limit; i++) {
        placed[idx] = pool[i];
        if (fill(pos + 1, requireDominant)) return true;
        placed[idx] = null;
      }
      return false;
    };

    // Prefer dominant-note matches on taste slots, then relax if none fit.
    if ((fill(0, true) || fill(0, false)) && placed.every(p => p)) {
      return placed as string[];
    }
    return [];
  };

  // The active number of Taste Lab slots (how many ingredients are in play).
  const slotCount = Math.min(Math.max(selectedIngredients.length, TASTE_LAB_MIN), TASTE_LAB_MAX);

  // Full Generate: anchor whichever slots are locked (unless ignoring locks).
  const getTasteLabCombo = (count: number, opts: { ignoreLocks?: boolean } = {}): string[] => {
    const slots = slotTastes.slice(0, count);
    const anchors: Record<number, string> = {};
    if (!opts.ignoreLocks) {
      for (let i = 0; i < count; i++) {
        if (lockedIngredients.has(i) && selectedIngredients[i]) anchors[i] = selectedIngredients[i];
      }
    }
    return computeTasteLabCombo(slots, anchors);
  };

  // The ingredients that could actually fill each slot: they satisfy the slot's
  // constraint (category or taste), they pair with *every other* selected
  // ingredient, and aren't already chosen. This is what the per-slot search's
  // count reflects and what swipe/chevron cycling steps through.
  const slotCandidates = useMemo(
    () => {
      const poolSet = tasteLabPool ? new Set(tasteLabPool.ingredients.map(s => s.toLowerCase())) : null;
      return slotTastes.slice(0, selectedIngredients.length).map((slot, slotIndex) => {
        const others = selectedIngredients.filter((ing, j) => j !== slotIndex && !!ing);
        const meetsSlot = (ing: string) => {
          if (isIngredientRestricted(ing)) return false;
          if (poolSet && !poolSet.has(ing.toLowerCase())) return false;
          const profile = profileByName.get(ing.toLowerCase());
          if (slot.exclude?.length && profile?.category && slot.exclude.includes(profile.category as CategoryKey)) return false;
          if (slot.mode === 'wild') return true; // no constraint — any ingredient
          if (slot.mode === 'category') {
            if (profile?.category !== slot.category) return false;
            return !slot.subcategories?.length || slot.subcategories.includes(profile?.subcategory as string);
          }
          const fp = profile?.flavorProfile as any;
          return fp && (fp[slot.taste] ?? 0) >= TASTE_THRESHOLD;
        };
        return Array.from(flavorMap.keys())
          .filter(ing =>
            !others.includes(ing) &&
            meetsSlot(ing) &&
            others.every(o => flavorMap.get(o)?.has(ing))
          )
          .sort((a, b) => a.localeCompare(b));
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slotTastes, selectedIngredients, flavorMap, dietaryRestrictions, profileByName, tasteLabPool]
  );

  // For each slot, how many ingredients compatible with all the OTHER selections
  // each taste and category would yield — previews the count per option so a
  // dead-end constraint (0 matches) is visible up front. Walks the intersection
  // of the other ingredients' neighbor sets once and tallies.
  const slotOptionCounts = useMemo(
    () => {
      const poolSet = tasteLabPool ? new Set(tasteLabPool.ingredients.map(s => s.toLowerCase())) : null;
      return slotTastes.slice(0, selectedIngredients.length).map((slot, slotIndex) => {
        const others = selectedIngredients.filter((ing, j) => j !== slotIndex && !!ing);
        const taste: Record<string, number> = {};
        const category: Record<string, number> = {};
        TASTE_KEYS.forEach(t => (taste[t] = 0));
        // Pool = ingredients compatible with every other selection.
        let pool: string[];
        if (others.length === 0) {
          pool = Array.from(flavorMap.keys());
        } else {
          const sets = others.map(o => flavorMap.get(o) ?? new Set<string>());
          pool = Array.from(sets[0]).filter(ing => sets.slice(1).every(s => s.has(ing)));
        }
        for (const ing of pool) {
          if (others.includes(ing) || isIngredientRestricted(ing)) continue;
          if (poolSet && !poolSet.has(ing.toLowerCase())) continue;
          const profile = profileByName.get(ing.toLowerCase());
          if (!profile) continue;
          if (slot.exclude?.length && profile.category && slot.exclude.includes(profile.category as CategoryKey)) continue;
          const fp = profile.flavorProfile as any;
          if (fp) {
            for (const t of TASTE_KEYS) {
              if ((fp[t] ?? 0) >= TASTE_THRESHOLD) taste[t]++;
            }
          }
          if (profile.category) category[profile.category] = (category[profile.category] ?? 0) + 1;
        }
        return { taste, category };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slotTastes, selectedIngredients, flavorMap, dietaryRestrictions, profileByName, tasteLabPool]
  );

  // Every selectable ingredient (dietary-allowed), with a border color keyed to
  // its dominant taste, plus its category and the tastes it clears the threshold
  // on — enough for the per-slot search to re-filter by any taste/category tag.
  const tasteLabSearchPool = useMemo(() => {
    return Array.from(flavorMap.keys())
      .filter(ing => !isIngredientRestricted(ing))
      .sort((a, b) => a.localeCompare(b))
      .map(name => {
        const profile = profileByName.get(name.toLowerCase());
        const fp = (profile?.flavorProfile ?? {}) as Record<string, number>;
        let dom: string | null = null;
        let max = -1;
        const tastes: string[] = [];
        TASTE_KEYS.forEach(t => {
          const v = fp[t] ?? 0;
          if (v > max) { max = v; dom = t; }
          if (v >= TASTE_THRESHOLD) tastes.push(t);
        });
        const color = max > 0 && dom ? ((TASTE_COLORS as any)[dom] ?? '#9ca3af') : '#9ca3af';
        return { name, color, category: profile?.category ?? '', tastes };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flavorMap, dietaryRestrictions, profileByName]);

  // Per slot: every ingredient that pairs with all the OTHER selections, NOT
  // filtered by this slot's taste/category. The search browses this pool so the
  // user can drop the taste/category filter and see all compatible pairings.
  const slotPartnerCandidates = useMemo(
    () => {
      const poolSet = tasteLabPool ? new Set(tasteLabPool.ingredients.map(s => s.toLowerCase())) : null;
      const inPool = (ing: string) => !poolSet || poolSet.has(ing.toLowerCase());
      return slotTastes.slice(0, selectedIngredients.length).map((_slot, slotIndex) => {
        const others = selectedIngredients.filter((ing, j) => j !== slotIndex && !!ing);
        if (others.length === 0) {
          return Array.from(flavorMap.keys()).filter(ing => !isIngredientRestricted(ing) && inPool(ing));
        }
        const sets = others.map(o => flavorMap.get(o) ?? new Set<string>());
        return Array.from(sets[0]).filter(
          ing =>
            !isIngredientRestricted(ing) &&
            inPool(ing) &&
            !others.includes(ing) &&
            sets.slice(1).every(s => s.has(ing))
        );
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slotTastes, selectedIngredients, flavorMap, dietaryRestrictions, profileByName, tasteLabPool]
  );

  // Changing a slot's constraint (its mode, taste, or category) rerolls just
  // that side, keeping the other ingredient anchored. Each change is a discrete,
  // undoable user choice, so every one saves history and refreshes the pick.
  const handleSlotTasteChange = (
    slotIndex: number,
    patch: Partial<SlotTaste>
  ) => {
    setSlotTaste(slotIndex, patch);
    // Touching a slot's constraint from the picker is a deliberate "this is what I
    // want to see" choice, so pin it: a subsequent Generate rerolls the ingredient
    // *within* this taste/category/wild instead of randomizing the constraint away.
    // (Free shuffling stays free — only opening the menu and picking locks it.)
    setLockedConstraints(prev => (prev.has(slotIndex) ? prev : new Set(prev).add(slotIndex)));
    if (!isTasteLab) return;

    const count = selectedIngredients.length;
    const newSlots = slotTastes.slice(0, count).map((s, i) =>
      i === slotIndex ? { ...s, ...patch } : s
    );

    // Hand-picking a slot's taste or category departs from the themed pool — the
    // "Pizza Night" label no longer fits — so drop the pool and reroll against the
    // full library. (Subcategory narrows / excludes stay within the pool.) Pass
    // the override explicitly since setTasteLabPool hasn't flushed yet.
    const breaksPool =
      tasteLabPool && (patch.taste !== undefined || patch.category !== undefined);
    if (breaksPool) {
      setTasteLabPool(null);
      setIsPoolExpanded(false);
    }

    // Keep every other ingredient anchored; reroll just this slot to fit the new
    // constraint and stay compatible with the rest.
    const anchors: Record<number, string> = {};
    selectedIngredients.forEach((ing, j) => {
      if (j !== slotIndex && ing) anchors[j] = ing;
    });
    const combo = computeTasteLabCombo(
      newSlots,
      anchors,
      new Set(),
      breaksPool ? null : undefined
    );
    if (combo.length < count) {
      setNoMatchToast(true);
      return;
    }
    saveToHistory();
    setSelectedIngredients(combo);
  };

  // Update a slot's displayed taste/category to describe the ingredient now in
  // it (its dominant note, or its category in category mode), so labels stay
  // truthful after a free Generate or a manual pick.
  const relabelSlotToIngredient = (index: number, ing: string) => {
    // A wild slot has no constraint to describe — leave it wild.
    if (slotTastes[index].mode === 'wild') return;
    const profile = profileByName.get(ing.toLowerCase());
    if (!profile) return;
    if (slotTastes[index].mode === 'category') {
      // Describe the new ingredient's category; drop any prior subcategory narrow.
      if (profile.category) setSlotTaste(index, { category: profile.category as CategoryKey, subcategories: undefined });
    } else {
      const fp = profile.flavorProfile as any;
      if (fp) {
        const dominant = TASTE_KEYS.reduce(
          (best, t) => ((fp[t] ?? 0) > (fp[best] ?? 0) ? t : best),
          TASTE_KEYS[0]
        );
        setSlotTaste(index, { taste: dominant as TasteKey });
      }
    }
  };

  // Picking an ingredient for a slot. Two paths:
  //  • Cycling (swipe / chevron / wheel) walks the slot's candidate list, which
  //    is already filtered to this slot's taste/category AND compatible with the
  //    others — so we keep the slot's label fixed and just swap it in. Cycling
  //    therefore stays within the same note, regardless of the lock.
  //  • Search lets you add ANY ingredient, even off-constraint, so the slot
  //    relabels to match and we reconcile the rest of the combo (below).
  const handleSlotIngredientPick = (slotIndex: number, ingredient: string, fromSearch = false) => {
    if (!isTasteLab) return;
    if (selectedIngredients[slotIndex] === ingredient) return;
    saveToHistory();

    if (!fromSearch) {
      const next = [...selectedIngredients];
      next[slotIndex] = ingredient;
      setSelectedIngredients(next);
      return;
    }

    const count = selectedIngredients.length;
    const others = selectedIngredients
      .map((ing, j) => ({ ing, j }))
      .filter(x => x.j !== slotIndex && x.ing);
    const compatibleWithAll = others.every(o => flavorMap.get(ingredient)?.has(o.ing));

    relabelSlotToIngredient(slotIndex, ingredient);

    if (compatibleWithAll) {
      const next = [...selectedIngredients];
      next[slotIndex] = ingredient;
      setSelectedIngredients(next);
      return;
    }

    // Incompatible with at least one other → keep the pick and every slot that
    // already fits it (or is ingredient-locked); reroll the rest.
    const anchors: Record<number, string> = { [slotIndex]: ingredient };
    const freeSlots = new Set<number>();
    selectedIngredients.forEach((ing, j) => {
      if (j === slotIndex || !ing) return;
      const stillFits = !!flavorMap.get(ingredient)?.has(ing);
      if (lockedIngredients.has(j) || stillFits) {
        anchors[j] = ing;
      } else if (!lockedConstraints.has(j)) {
        freeSlots.add(j); // reroll freely
      }
      // else: constraint-locked & incompatible → left open to reroll within constraint
    });

    const combo = computeTasteLabCombo(slotTastes.slice(0, count), anchors, freeSlots);
    if (combo.length === count) {
      setSelectedIngredients(combo);
      freeSlots.forEach(j => relabelSlotToIngredient(j, combo[j]));
    } else {
      // Nothing pairs with the pick — set it solo.
      const next = [...selectedIngredients];
      next[slotIndex] = ingredient;
      setSelectedIngredients(next);
    }
  };

  // Toggle Taste Lab mode. Entering it resets to a fresh 2-slot pair.
  const handleTasteLabChange = (enabled: boolean) => {
    setIsTasteLab(enabled);
    setLockedConstraints(new Set());
    setTasteLabPool(null);
    if (enabled) {
      saveToHistory();
      setLockedIngredients(new Set());
      setTargetIngredientCount(2);
      const combo = getTasteLabCombo(2, { ignoreLocks: true });
      if (combo.length === 2) setSelectedIngredients(combo);
    }
  };

  // Load a Flavor Preset: push its slot constraints into Taste Lab, then
  // generate a fresh combo that fits them. The preset is the DNA (tastes /
  // categories), not fixed ingredients — Generate keeps producing new combos
  // for it. "Wide open" by default (no constraint locks) so it stays explorable.
  const handleLoadPreset = (preset: FlavorPreset) => {
    const slots = preset.slots;
    const count = Math.min(Math.max(slots.length, TASTE_LAB_MIN), TASTE_LAB_MAX);

    setIsTasteLab(true);
    saveToHistory();

    // Push each slot's constraint into the hook (state update is async, so we
    // also keep `slots` locally for the immediate generate below).
    slots.forEach((s, i) =>
      setSlotTaste(i, { mode: s.mode, taste: s.taste, category: s.category, subcategories: s.subcategories, exclude: s.exclude })
    );

    // Themed presets confine generation to a pool; others clear any prior pool.
    setTasteLabPool(preset.pool ? { name: preset.name, ingredients: preset.pool } : null);

    setLockedIngredients(new Set());
    // Lock every slot's constraint by default so Generate rerolls *within* the
    // preset's DNA (new sweet+salty pairs, not a drift to all-sweet) — the
    // palette-generator feel. A preset can opt out with an explicit list.
    const lockedDefault = Array.from({ length: count }, (_, i) => i);
    setLockedConstraints(new Set(preset.lockedConstraints ?? lockedDefault));
    setTargetIngredientCount(count);

    // A few attempts — a tight 4-slot preset can miss on an unlucky shuffle.
    // Pass the pool explicitly since setTasteLabPool hasn't flushed yet.
    let combo: string[] = [];
    for (let attempt = 0; attempt < 12 && combo.length < count; attempt++) {
      combo = computeTasteLabCombo(slots.slice(0, count), {}, new Set(), preset.pool ?? null);
    }

    if (combo.length === count) {
      setSelectedIngredients(combo);
    } else {
      setNoMatchToast(true);
    }
    setIsPresetGalleryOpen(false);
  };

  // Build a shareable deep-link for the current state and copy it to the
  // clipboard. Taste Lab encodes the full DNA (slots + picks + locks + pool) in
  // `?lab=`; Classic encodes just the ingredients in `?ing=`. Both are query
  // params, so the link restores on any static host without server routing.
  const handleShare = () => {
    const base = `${window.location.origin}${window.location.pathname}`;
    let url: string;
    if (isTasteLab) {
      const count = slotCount;
      const state = {
        v: 1,
        s: slotTastes.slice(0, count).map(s => ({
          m: s.mode,
          t: s.taste,
          c: s.category,
          ...(s.subcategories?.length ? { sc: s.subcategories } : {}),
          ...(s.exclude?.length ? { x: s.exclude } : {}),
        })),
        i: selectedIngredients.slice(0, count),
        lc: Array.from(lockedConstraints),
        li: Array.from(lockedIngredients),
        ...(tasteLabPool ? { p: { n: tasteLabPool.name, g: tasteLabPool.ingredients } } : {}),
      };
      url = `${base}?lab=${encodeTasteLabState(state)}`;
    } else {
      url = `${base}?ing=${encodeIngredientsToUrl(selectedIngredients)}`;
    }
    try {
      navigator.clipboard?.writeText(url);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context) — the button's
      // own "Copied" affordance still fires; sharing just needs HTTPS.
    }
  };

  // Taste Lab supports 2–4 slots, each slot's taste governing the ingredient at
  // that index. Anything outside that range (e.g. an external edit) drops back
  // to Classic. length === 0 is the pre-init state — ignore it so defaulting to
  // Taste Lab doesn't bounce us out on first mount.
  useEffect(() => {
    const len = selectedIngredients.length;
    if (isTasteLab && len !== 0 && (len < TASTE_LAB_MIN || len > TASTE_LAB_MAX)) {
      setIsTasteLab(false);
    }
  }, [isTasteLab, selectedIngredients.length, setIsTasteLab]);

  // Seed a fresh combo the way a first open used to: in Taste Lab, a random
  // pair of distinct tastes (a fresh contrast rather than always salty +
  // sweet) with a pairing that fits it; otherwise two random compatible
  // ingredients. Used by the landing's "Surprise me" and deep-link fallbacks.
  const seedFreshCombo = () => {
    if (isTasteLab) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const shuffled = [...TASTE_KEYS].sort(() => Math.random() - 0.5);
        const t0 = shuffled[0];
        const t1 = shuffled[1];
        const slots = [
          { mode: 'taste' as const, taste: t0, category: slotTastes[0].category },
          { mode: 'taste' as const, taste: t1, category: slotTastes[1].category },
        ];
        const pair = computeTasteLabCombo(slots, {});
        if (pair.length === 2) {
          setSlotTaste(0, { mode: 'taste', taste: t0 });
          setSlotTaste(1, { mode: 'taste', taste: t1 });
          setTargetIngredientCount(2);
          setSelectedIngredients(pair);
          return;
        }
      }
    }
    // Classic, or no taste combo landed a pairing: fall back to random. Reset the
    // slot count too — otherwise a stale target (e.g. left at 4 by a preset/tag)
    // makes the fresh pair render with commas + no "&" until the next Generate.
    setTargetIngredientCount(2);
    setSelectedIngredients(getRandomIngredients(2));
  };

  // On mount: restore a deep link if present; otherwise leave the combo empty
  // so the landing surface is the front door (it seeds via its own actions).
  useEffect(() => {
    if (selectedIngredients.length !== 0) return;

    // The one-shot restore attempt is happening now, so lift the landing
    // suppression. Batched with any restore setState below, so a successful
    // restore shows the combo with no landing flash; a fresh/broken open falls
    // through to an empty combo and the landing shows.
    setSuppressLandingForRestore(false);

    // Deep-link restore: a `?lab=` or `?ing=` param recreates a shared state and
    // skips the random seed.
    try {
      const params = new URLSearchParams(window.location.search);
      const labParam = params.get('lab');
      if (labParam) {
        const d: any = decodeTasteLabState(labParam);
        if (d?.s?.length) {
          const count = Math.min(Math.max(d.s.length, TASTE_LAB_MIN), TASTE_LAB_MAX);
          setIsTasteLab(true);
          d.s.slice(0, count).forEach((s: any, i: number) =>
            // `sc` was a single subcategory string in older links; normalize to an array.
            setSlotTaste(i, {
              mode: s.m,
              taste: s.t,
              category: s.c,
              subcategories: s.sc ? (Array.isArray(s.sc) ? s.sc : [s.sc]) : undefined,
              exclude: s.x,
            })
          );
          setTargetIngredientCount(count);
          setLockedConstraints(new Set<number>(d.lc ?? []));
          setLockedIngredients(new Set<number>(d.li ?? []));
          setTasteLabPool(d.p ? { name: d.p.n, ingredients: d.p.g } : null);
          if (Array.isArray(d.i) && d.i.length) {
            setSelectedIngredients(d.i.slice(0, count));
          } else {
            const combo = computeTasteLabCombo(d.s.slice(0, count), {}, new Set(), d.p?.g ?? null);
            if (combo.length === count) setSelectedIngredients(combo);
          }
          return;
        }
      }
      const ingParam = params.get('ing');
      if (ingParam) {
        const ings = decodeUrlToIngredients(ingParam);
        if (ings.length) {
          setIsTasteLab(false);
          setTargetIngredientCount(ings.length);
          setSelectedIngredients(ings);
          return;
        }
      }
    } catch {
      // Malformed link — leave the combo empty and let the landing surface show.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Generate over an empty Taste Lab combo (the landing is up, nothing picked
    // yet) is a fresh-open seed, not a reroll — slotCount would clamp to a
    // single slot otherwise.
    if (isTasteLab && selectedIngredients.length === 0) {
      seedFreshCombo();
      return;
    }
    // Taste Lab: fully randomize the pair, like Classic Generate. Each slot is
    // either pinned (ingredient lock = exact; constraint lock = within its
    // taste/category) or free (any ingredient). Free slots then adopt the new
    // pick's dominant taste / category so their label still describes the result.
    if (isTasteLab) {
      const count = slotCount;
      const anchors: Record<number, string> = {};
      const freeSlots = new Set<number>();
      for (let i = 0; i < count; i++) {
        if (lockedIngredients.has(i) && selectedIngredients[i]) anchors[i] = selectedIngredients[i];
        else if (!lockedConstraints.has(i)) freeSlots.add(i);
      }

      const combo = computeTasteLabCombo(slotTastes.slice(0, count), anchors, freeSlots);
      if (combo.length < count) {
        setNoMatchToast(true);
        return;
      }
      saveToHistory();
      setSelectedIngredients(combo);

      // Relabel each free slot to match what Generate landed on.
      freeSlots.forEach(i => relabelSlotToIngredient(i, combo[i]));
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
      // Under steering the graph can be too sparse for the slot count (e.g. a niche
      // cuisine at 5 slots) — say so instead of silently doing nothing.
      if (contextSteer) setNoMatchToast(true);
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

  // Note: activating a steer deliberately does NOT regenerate. The combo stays put so
  // you can lock "salads" and then add/swap single ingredients within it; hitting
  // Generate rerolls inside the steer. Clearing a steer also keeps the combo (it
  // remains valid in the full graph by construction).

  // Landing tag tap: switch to Classic, lock the steer, and generate a showcase
  // combo at the largest size the steered subgraph supports (4 → 3 → 2), so a
  // sparse tag (Korean, marinades…) lands a smaller combo instead of a no-match
  // toast. Same backtracking generator — the steered map is passed directly
  // because the steer state hasn't flushed yet.
  const handleLandingTag = (group: LandingTagGroup, tag: string) => {
    const mod = steerModule ?? getLoadedContext();
    if (!mod) return; // tags render from the context chunk, so it's loaded before they're tappable
    if (!steerModule) setSteerModule(mod);
    const steered = mod.filterFlavorMapByTag(baseFlavorMap, group, tag);
    setIsTasteLab(false);
    setContextSteer({ group, tag });
    for (let size = 4; size >= 2; size--) {
      const combo = getRandomIngredients(size, [], 'perfect', steered);
      if (combo.length === size) {
        setTargetIngredientCount(size);
        setSelectedIngredients(combo);
        return;
      }
    }
    // Not even a pair under this tag (shouldn't happen for a listed one) —
    // drop the steer rather than strand an empty screen.
    setContextSteer(null);
    setSelectedIngredients(getRandomIngredients(2));
  };

  // Landing "Generate": seed a fresh combo (Classic by default). Filling the
  // combo hides the landing on its own — it's the empty state.
  const handleLandingGenerate = () => {
    seedFreshCombo();
  };

  // Wrap handleIngredientSelect to clear search term. In Taste Lab, the global
  // search starts a fresh pairing from scratch: the chosen ingredient becomes
  // one slot and we generate a random compatible partner for the other (for
  // now), replacing whatever was there.
  const handleIngredientSelect = (ingredient: string) => {
    if (isTasteLab) {
      saveToHistory();
      setTasteLabPool(null);
      const combo = computeTasteLabCombo(slotTastes.slice(0, 2), { 0: ingredient }, new Set([1]), null);
      const pair = combo.length === 2 ? combo : [ingredient];
      setLockedIngredients(new Set());
      setLockedConstraints(new Set());
      setTargetIngredientCount(2);
      setSelectedIngredients(pair);
      pair.forEach((ing, i) => relabelSlotToIngredient(i, ing));
      setSearchTerm('');
      setIsDrawerOpen(false);
      return;
    }
    // First pick from an empty combo: rather than stranding a lone ingredient
    // next to a blank second slot, seed a full 2-ingredient pairing anchored on
    // the searched ingredient. It's locked (index 0) so a later Generate keeps
    // it and only rerolls the partner. Falls back to the bare ingredient if the
    // graph has no compatible partner (shouldn't happen for a real ingredient).
    if (selectedIngredients.length === 0) {
      saveToHistory();
      const partner = getRandomIngredients(1, [ingredient], compatibilityMode);
      if (partner.length === 1) {
        setSelectedIngredients([ingredient, partner[0]]);
        setTargetIngredientCount(2);
        setLockedIngredients(new Set([0]));
      } else {
        setSelectedIngredients([ingredient]);
      }
      setSearchTerm('');
      setIsDrawerOpen(false);
      return;
    }
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

  // Taste Lab can hold 2–4 ingredients.
  const tasteLabCanIncrement = slotCount < TASTE_LAB_MAX;
  const tasteLabCanDecrement = slotCount > TASTE_LAB_MIN;

  // Add a slot: in Taste Lab, generate one more ingredient compatible with all
  // the current picks (the new slot is free, then relabeled). In Classic, defer
  // to the base handler. Either way surface feedback when nothing fits.
  const handleIncrementTarget = () => {
    if (isTasteLab) {
      const count = slotCount;
      if (count >= TASTE_LAB_MAX) return;
      const newCount = count + 1;
      const anchors: Record<number, string> = {};
      selectedIngredients.forEach((ing, i) => { if (ing) anchors[i] = ing; });
      const combo = computeTasteLabCombo(slotTastes.slice(0, newCount), anchors, new Set([count]));
      if (combo.length !== newCount) {
        setNoMatchToast(true);
        return;
      }
      saveToHistory();
      setSelectedIngredients(combo);
      setTargetIngredientCount(newCount);
      relabelSlotToIngredient(count, combo[count]);
      return;
    }
    const added = baseHandleIncrementTarget(flavorMap, isIngredientRestricted);
    if (!added) {
      setNoMatchToast(true);
    }
  };

  // Remove a slot: in Taste Lab, drop the last ingredient (and any locks on it).
  const handleDecrementTarget = () => {
    if (isTasteLab) {
      const count = slotCount;
      if (count <= TASTE_LAB_MIN) return;
      saveToHistory();
      setSelectedIngredients(selectedIngredients.slice(0, count - 1));
      setTargetIngredientCount(count - 1);
      setLockedIngredients(prev => { const n = new Set(prev); n.delete(count - 1); return n; });
      setLockedConstraints(prev => { const n = new Set(prev); n.delete(count - 1); return n; });
      return;
    }
    baseHandleDecrementTarget();
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

      // + or = - Add ingredient (Taste Lab caps at 4)
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        if (isTasteLab ? tasteLabCanIncrement : canIncrementTarget) {
          handleIncrementTarget();
        }
        return;
      }

      // - - Remove ingredient (Taste Lab floors at 2)
      if (e.key === '-') {
        e.preventDefault();
        if (isTasteLab ? tasteLabCanDecrement : canDecrementTarget) {
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
    <div className="app-min-h bg-white dark:bg-gray-900 flex flex-col transition-colors duration-300">
      {/* "No matching ingredient" toast */}
      {noMatchToast && (
        <div
          role="status"
          aria-live="polite"
          className={`
            fixed left-1/2 -translate-x-1/2 z-50
            ${isMobile ? 'bottom-28 animate-toast-in-bottom' : 'top-32 animate-toast-in'}
            w-max max-w-[min(92vw,26rem)]
            px-5 py-2.5 rounded-2xl
            bg-gray-900 dark:bg-white
            text-white dark:text-gray-900
            text-sm font-medium text-center leading-snug shadow-lg
          `}
        >
          {(() => {
            // Explain *why* nothing was found, using the current constraints, so
            // the suggestion is actionable rather than a dead end.
            if (!isTasteLab) {
              const within = contextSteer ? ` within “${contextSteer.tag}”` : '';
              if (lockedIngredients.size > 0) {
                return contextSteer
                  ? `Nothing pairs with your locked picks${within} — unlock one or clear the tag`
                  : 'No other ingredient pairs with your locked picks — unlock one to free it up';
              }
              return contextSteer
                ? `Nothing pairs with all of these${within} — clear the tag for more options`
                : 'No other ingredient pairs with all of these';
            }
            if (tasteLabPool) {
              return `Too few ingredients in “${tasteLabPool.name}” pair up — remove the preset for more options`;
            }
            if (lockedConstraints.size > 0 || lockedIngredients.size > 0) {
              return 'No pairing fits your locked slots — unlock one or change its taste/category';
            }
            return 'No mutually-compatible pairing for those tastes — try different ones';
          })()}
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
            w-max max-w-[min(92vw,26rem)]
            px-5 py-2.5 rounded-2xl
            bg-gray-900 dark:bg-white
            text-white dark:text-gray-900
            text-sm font-medium text-center leading-snug shadow-lg
          `}
        >
          {saveToast === 'saved' ? 'Saved to your combinations' : 'Removed from saved'}
        </div>
      )}

      {/* Themed pool banner — shows the active pool, reveals its ingredients on
          click, and offers an escape hatch */}
      {isTasteLab && tasteLabPool && !isDrawerOpen && (
        <div
          ref={poolBannerRef}
          className={`
            fixed left-1/2 -translate-x-1/2 z-40 w-max max-w-[min(92vw,28rem)]
            ${isMobile ? 'top-[72px]' : 'top-[100px]'}
            rounded-2xl
            bg-gray-900/90 dark:bg-white/90 backdrop-blur
            text-white dark:text-gray-900 shadow-lg
          `}
        >
          <div className="flex items-center gap-2 pl-3.5 pr-2 py-1.5">
            <button
              onClick={() => setIsPoolExpanded(v => !v)}
              aria-expanded={isPoolExpanded}
              aria-label={isPoolExpanded ? 'Hide pool ingredients' : 'Show pool ingredients'}
              className="flex items-center gap-1.5 text-xs font-semibold opacity-90 hover:opacity-100 transition-opacity"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${isPoolExpanded ? 'rotate-180' : ''}`}
              />
              {tasteLabPool.name} pool · {tasteLabPool.ingredients.length} ingredients
            </button>
            <button
              onClick={() => { setIsPoolExpanded(false); setTasteLabPool(null); }}
              aria-label="Clear themed pool"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20 dark:bg-gray-900/15 hover:bg-white/30 dark:hover:bg-gray-900/25 transition-colors"
            >
              Clear
            </button>
          </div>
          {isPoolExpanded && (
            <div className="max-h-[50vh] overflow-y-auto px-3.5 pb-3 pt-0.5 border-t border-white/15 dark:border-gray-900/10">
              {Object.entries(
                tasteLabPool.ingredients.reduce<Record<string, string[]>>((acc, name) => {
                  const cat = profileByName.get(name.toLowerCase())?.category ?? 'Other';
                  (acc[cat] ??= []).push(name);
                  return acc;
                }, {})
              )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, names]) => (
                  <div key={category} className="mt-2.5 first:mt-1.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[category] ?? '#9CA3AF' }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                        {category} · {names.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {names.slice().sort((a, b) => a.localeCompare(b)).map(name => (
                        <span
                          key={name}
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/15 dark:bg-gray-900/10"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Minimal Header — stays visible on the landing but dimmed (logo
          excepted) so the frame reads as present-but-inactive. */}
      <MinimalHeader
        targetCount={targetIngredientCount}
        currentCount={selectedIngredients.length}
        minTarget={isTasteLab ? TASTE_LAB_MIN : minTarget}
        maxTarget={isTasteLab ? TASTE_LAB_MAX : 5}
        canIncrement={isTasteLab ? tasteLabCanIncrement : canIncrementTarget}
        canDecrement={isTasteLab ? tasteLabCanDecrement : canDecrementTarget}
        onGenerate={handleRandomize}
        onIncrementTarget={handleIncrementTarget}
        onDecrementTarget={handleDecrementTarget}
        onRecipesClick={handleRecipeSearch}
        onSaveClick={handleSaveToggle}
        onShareClick={handleShare}
        isSaved={currentSavedId !== null}
        onLogoClick={() => setIsSidebarOpen(true)}
        isGeneratePulsing={isFirstLoad}
        isMobile={isMobile}
        isTasteLab={isTasteLab}
        dimmed={showLanding}
      />

      {/* Mobile Bottom Bar — dimmed on the landing (see header note). */}
      {isMobile && (
        <div className={showLanding ? 'opacity-40 pointer-events-none' : ''}>
          <MobileBottomBar
            canIncrement={isTasteLab ? tasteLabCanIncrement : canIncrementTarget}
            canDecrement={isTasteLab ? tasteLabCanDecrement : canDecrementTarget}
            canUndo={canUndo}
            onGenerate={handleRandomize}
            onIncrementTarget={handleIncrementTarget}
            onDecrementTarget={handleDecrementTarget}
            onDrawerToggle={() => setIsDrawerOpen(!isDrawerOpen)}
            onUndo={handleUndo}
            isDrawerOpen={isDrawerOpen}
            isGeneratePulsing={isFirstLoad}
          />
        </div>
      )}

      {/* Main content area - scrollable on mobile when drawer is closed. On the
          landing the chrome is present (dimmed), so keep its padding; min-h-0
          lets the centered landing surface scroll internally when expanded. */}
      <main className={`
        flex flex-col
        ${showLanding
          // Definite viewport height so the landing's scroll container is bounded
          // (the desktop app shell has no height cap, unlike mobile). Symmetric
          // padding clears the fixed header/bottom bar and centers optically.
          ? `h-[100dvh] min-h-0 ${isMobile ? 'py-24' : 'py-28'}`
          : `flex-1 pt-20 ${isTasteLab && !isDrawerOpen ? (isMobile ? 'pb-[calc(81px_+_env(safe-area-inset-bottom))]' : 'pb-20') : (isMobile ? 'pb-[calc(96px_+_env(safe-area-inset-bottom))]' : 'pb-32')}`}
        ${isMobile && !isDrawerOpen && !showLanding ? 'overflow-y-auto overflow-x-clip' : ''}
      `}>
        {/* Landing entry surface — the front door on a fresh open. Yields to the
            drawer (its search is another valid way in). */}
        {showLanding && !isDrawerOpen ? (
          <LandingSurface
            isMobile={isMobile}
            allIngredients={allIngredients}
            onPickTag={handleLandingTag}
            onPickIngredient={handleIngredientSelect}
            onGenerate={handleLandingGenerate}
          />
        ) : isTasteLab && !isDrawerOpen ? (
          <TasteLabSplit
            slotTastes={slotTastes}
            onSlotTasteChange={handleSlotTasteChange}
            slotCandidates={slotCandidates}
            slotPartnerCandidates={slotPartnerCandidates}
            slotOptionCounts={slotOptionCounts}
            onSlotIngredientPick={handleSlotIngredientPick}
            searchPool={tasteLabSearchPool}
            ingredients={selectedIngredients}
            lockedIndices={lockedIngredients}
            onLockToggle={handleLockToggleWithFocus}
            constraintLockedIndices={lockedConstraints}
            onConstraintLockToggle={handleConstraintLockToggle}
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
                // Base map, not the steered one: the hero's warning means "these don't
                // PAIR" — steer fit is a different fact and must not hijack it.
                flavorMap={baseFlavorMap}
              />
            </div>

            {/* Mined dish context for the current combo ("seen in: …") */}
            <ComboContextStrip
              ingredients={selectedIngredients}
              isMobile
              steer={contextSteer}
              onSteerChange={setContextSteer}
            />

            {/* Dietary Filter Pills - fixed above bottom bar on mobile (bar grows by
                the home-indicator inset in standalone mode, so the offset must too) */}
            <div className="fixed left-0 right-0 bottom-[calc(92px_+_env(safe-area-inset-bottom))] z-[55] px-4 overflow-x-auto scrollbar-hide">
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
                // Base map — same reason as the mobile mount above.
                flavorMap={baseFlavorMap}
              />
            </div>
            {/* Mined dish context for the current combo — hero view only, so the
                compact (drawer-open) layout stays uncluttered */}
            {!isDrawerOpen && (
              <ComboContextStrip
                ingredients={selectedIngredients}
                steer={contextSteer}
                onSteerChange={setContextSteer}
              />
            )}
            <DietaryFilterPills
              dietaryRestrictions={dietaryRestrictions}
              onDietaryChange={setDietaryRestrictions}
            />
          </>
        )}
      </main>

      {/* Ingredient Drawer (desktop undo lives in the drawer's bottom bar).
          Dimmed on the landing so its persistent bottom search bar reads as
          inactive rather than competing with the landing search. */}
      <div className={showLanding ? 'opacity-40 pointer-events-none' : ''}>
      <IngredientDrawer
        isOpen={isDrawerOpen}
        onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
        onClose={() => setIsDrawerOpen(false)}
        onOpen={() => setIsDrawerOpen(true)}
        // In Taste Lab the bottom search stays inline (no drawer takeover) and a
        // pick starts a fresh pairing.
        isTasteLab={isTasteLab}
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
      </div>

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
        onOpenPresets={() => {
          setIsSidebarOpen(false);
          setIsPresetGalleryOpen(true);
        }}
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

      {/* Flavor Presets gallery */}
      <PresetGallery
        isOpen={isPresetGalleryOpen}
        onClose={() => setIsPresetGalleryOpen(false)}
        onSelect={handleLoadPreset}
        customPresets={customPresets}
        onSaveCustom={addCustomPreset}
        onDeleteCustom={deleteCustomPreset}
      />

      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={isWizardOpen}
        onClose={handleWizardClose}
      />
    </div>
  );
}
