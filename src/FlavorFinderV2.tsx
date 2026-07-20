import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { MinimalHeader } from './components/v2/MinimalHeader.tsx';
import { MobileBottomBar } from './components/v2/MobileBottomBar.tsx';
import { IngredientDisplay } from './components/v2/IngredientDisplay.tsx';
import { ComboContextStrip } from './components/v2/ComboContextStrip.tsx';
import { getLoadedContext, loadContext } from './utils/contextLoader.ts';
import { suggestSubstitutes } from './utils/suggestSubstitutes.ts';
import { IngredientProfile } from './types.ts';
import { IngredientDrawer } from './components/v2/IngredientDrawer.tsx';
import { DietaryFilterPills } from './components/v2/DietaryFilterPills.tsx';
import { RecipeFinderModal } from './components/v2/RecipeFinderModal.tsx';
import { PasteRecipeModal } from './components/v2/PasteRecipeModal.tsx';
import { FlavorReport } from './components/v2/report/index.ts';
import { useRecipeRoute } from './hooks/useRecipeRoute.ts';
import { DrinkPairingPanel } from './components/v2/DrinkPairingPanel.tsx';
import { DISH_TYPES } from './data/dishTypes.ts';
import { IngredientFiltersModal } from './components/v2/IngredientFiltersModal.tsx';
import { Sidebar } from './components/v2/Sidebar.tsx';
import { OnboardingWizard } from './components/v2/OnboardingWizard.tsx';
import { PresetGallery } from './components/v2/PresetGallery.tsx';
import { IngredientAtlas } from './components/v2/IngredientAtlas.tsx';
import { GraphExplorer } from './components/v2/GraphExplorer.tsx';
import { LandingSurface, LandingTagGroup } from './components/v2/LandingSurface.tsx';
import { ParsedComposite } from './utils/parseLandingQuery.ts';
import { FlavorPreset, FLAVOR_PRESETS } from './data/flavorPresets.ts';
import { useScreenSize } from './hooks/useScreenSize.ts';
import { useIngredientSelection } from './hooks/useIngredientSelection.ts';
import { useFilters } from './hooks/useFilters.ts';
import { useCompatibility, CompatibilityMode } from './hooks/useCompatibility.ts';
import {
  useSlots,
  defaultSlots,
  slotAcceptsStructure,
  MAX_SLOTS,
  TASTE_KEYS,
  TASTE_THRESHOLD,
  TasteKey,
  CategoryKey,
  SlotTaste,
} from './hooks/useSlots.ts';
import { useSavedCombinations } from './hooks/useSavedCombinations.ts';
import { useAtlasRoute } from './hooks/useAtlasRoute.ts';
import { useGraphRoute } from './hooks/useGraphRoute.ts';
import { swapOverlayParam } from './hooks/overlayRouteSync.ts';
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
import { CATEGORY_COLORS } from './utils/colors.ts';
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

// Largest ordered subset of `anchors` that is mutually compatible in `map` (and
// present in it). Greedy prefix keep — preserves the typed order, so an earlier
// ingredient is never dropped for a later one. Shared by the composite landing
// handler and its pre-check: because a combo made of exactly these anchors is
// always fillable in `map` (all slots pre-placed, every pair compatible), a full
// keep === anchors is a SOUND guarantee the steer can host them.
const compatibleAnchorSubset = (
  map: Map<string, Set<string>>,
  anchors: string[]
): string[] => {
  const keep: string[] = [];
  for (const a of anchors) {
    if (!map.has(a)) continue;
    if (keep.every(k => map.get(a)?.has(k))) keep.push(a);
  }
  return keep;
};

export default function FlavorFinderV2() {
  const { isMobile } = useScreenSize();

  // Ingredient Atlas overlay routing (?atlas=<name>, pushState/popstate).
  const { atlasIngredient, openAtlas, closeAtlas } = useAtlasRoute();
  // Graph Explorer overlay routing (?graph=<name>, pushState/popstate).
  const { graphIngredient, openGraph, closeGraph } = useGraphRoute();
  // Build-mode seed for the graph: set by the bottom-bar map button so the
  // explorer opens showing the CURRENT combo as picks (plus everything that
  // pairs with all of them). Cleared whenever the overlay closes — however it
  // closes (X, Escape, browser Back) — so per-ingredient opens stay unseeded.
  const [graphSeed, setGraphSeed] = useState<string[] | null>(null);
  useEffect(() => {
    if (!graphIngredient) setGraphSeed(null);
  }, [graphIngredient]);

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
  } = useIngredientSelection({
    initialTargetCount: 2,
    // Slot edits mutate the slot roles (a slot relabels to describe the new
    // ingredient, which drives its indicator + match count). Snapshot that
    // state alongside the ingredients so undo reverts the whole pairing — role,
    // lock, and pool — not just the ingredient names.
    captureExtra: () => ({
      slotTastes,
      lockedConstraints: new Set(lockedConstraints),
      themedPool,
    }),
    restoreExtra: (extra) => {
      const e = extra as
        | { slotTastes: SlotTaste[]; lockedConstraints: Set<number>; themedPool: typeof themedPool }
        | undefined;
      if (!e) return;
      setSlotTastes(e.slotTastes);
      setLockedConstraints(new Set(e.lockedConstraints));
      setThemedPool(e.themedPool);
    },
  });

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
    updateCombination,
  } = useSavedCombinations();

  const { customPresets, addCustomPreset, deleteCustomPreset } = useCustomPresets();

  // Active themed pool (e.g. "Pizza Night"): when set, every slot is confined
  // to this whitelist of ingredients. null = the full library.
  const [themedPool, setThemedPool] = useState<{ name: string; ingredients: string[] } | null>(null);
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

  // Per-slot roles for the unified generator (default: all wild).
  const {
    slotTastes,
    setSlotTaste,
    setSlotTastes,
  } = useSlots();

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

  // UI state (not extracted to hooks as they're specific to this component)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPresetGalleryOpen, setIsPresetGalleryOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  // Flavor Report overlay (?recipe= deep link) — recipe-scale analysis, uncapped.
  const { recipeState, openRecipeReport, closeRecipeReport } = useRecipeRoute();
  const [isIngredientFiltersOpen, setIsIngredientFiltersOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [noMatchToast, setNoMatchToast] = useState(false);
  const [saveToast, setSaveToast] = useState<'saved' | 'removed' | null>(null);

  // The drink panel (menu level): open for the current combo right after saving
  // (toast action) or for any saved combo (sidebar glass). savedId lets the
  // served-as choice and lazy rename persist back onto the saved dish.
  const [drinkPanel, setDrinkPanel] = useState<{
    savedId: string | null;
    ingredients: string[];
    name: string;
    servedAs?: string;
  } | null>(null);

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
    if (!contextSteer || !steerModule) return baseFlavorMap;
    return steerModule.filterFlavorMapByTag(baseFlavorMap, contextSteer.group, contextSteer.tag);
  }, [baseFlavorMap, contextSteer, steerModule]);

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

  // Dev-only invariant check: every generated combination must satisfy the
  // active pairing rule against the exact map it was generated from. `perfect`
  // = every pair mutually present (the inviolable rule, verified mechanically);
  // `mixed` = every ingredient pairs with at least one other (the pre-existing
  // user-selected mode). Throws in development so a violation is loud; a no-op
  // in production builds.
  const assertComboInvariant = (
    combo: string[],
    map: Map<string, Set<string>>,
    mode: CompatibilityMode
  ) => {
    if (process.env.NODE_ENV === 'production') return;
    for (const ing of combo) {
      const others = combo.filter(o => o !== ing);
      if (others.length === 0) continue;
      const paired = others.filter(o => map.get(ing)?.has(o));
      const ok = mode === 'perfect' ? paired.length === others.length : paired.length > 0;
      if (!ok) {
        throw new Error(
          `Pairing invariant violated (${mode} mode): "${ing}" in [${combo.join(', ')}]`
        );
      }
    }
  };

  // The single generation engine. Given N slot roles and a set of fixed
  // anchors (ingredients to keep in place), find a combination — one
  // ingredient per slot, each clearing its slot's taste/category (or anything
  // for a wild/free slot) — that satisfies the active compatibility mode:
  //   'perfect' (default) — every pair mutually compatible, by backtracking
  //     (the inviolable flavor-map rule)
  //   'mixed'  — every ingredient pairs with at least one other in the set
  // Pool filtering (slot roles, dietary restrictions, themed pool, excludes)
  // applies in ALL modes; only the pairing check varies, exactly as the
  // pre-existing user-selected modes always have. `anchors` maps a slot index
  // to an ingredient that must stay; open slots are generated.
  //
  // "Dominant" weighting (taste slots only): we first try to fill each taste
  // slot with ingredients whose chosen taste is their single strongest note
  // (anchovy → salty, plum → sweet), which makes pairings feel crisp. If no
  // combination exists under that preference, we relax to the plain
  // qualifying pool. Category/wild slots ignore this weighting.
  const computeCombo = (
    slots: SlotTaste[],
    anchors: Record<number, string>,
    // Slot indices whose role is ignored for this run — they accept any
    // ingredient. Used by Generate to fully randomize a role-unlocked slot.
    freeSlots: Set<number> = new Set(),
    // Themed pool whitelist. Defaults to the live pool; passed explicitly by
    // handleLoadPreset since the pool state update hasn't flushed yet there.
    poolOverride: string[] | null | undefined = themedPool?.ingredients ?? null,
    opts: {
      mode?: CompatibilityMode;
      // Generate against a different graph than the live flavorMap — used by
      // the landing surface to run against a freshly steered map before the
      // steer state has flushed. Always a subset of the flavor map, so the
      // compatibility check itself is unchanged.
      mapOverride?: Map<string, Set<string>>;
    } = {}
  ): string[] => {
    const mode = opts.mode ?? compatibilityMode;
    const map = opts.mapOverride ?? flavorMap;
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
      // Structural frame constraints (textures/functions) are part of the
      // slot's role: they bite in every mode (a wild "crunch" slot accepts any
      // crunchy thing that pairs) but a freed slot above escapes them, exactly
      // like it escapes taste/category.
      if (!slotAcceptsStructure(slot, profileByName.get(ing.toLowerCase()))) return false;
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
      return Array.from(map.keys()).filter(ing =>
        !isIngredientRestricted(ing) &&
        qualifies(ing, idx) &&
        (!requireDominant || freeSlots.has(idx) || slot.mode === 'category' || slot.mode === 'wild' || isDominant(ing, slot.taste))
      );
    };

    const shuffle = (arr: string[]) => [...arr].sort(() => Math.random() - 0.5);

    const placed: (string | null)[] = new Array(N).fill(null);
    const resetPlaced = () => {
      placed.fill(null);
      Object.entries(anchors).forEach(([k, v]) => { placed[Number(k)] = v; });
    };
    resetPlaced();

    // Mode-aware placement check. Distinctness always holds; the pairing
    // requirement varies. Mixed accepts a candidate that pairs with at least
    // one already-placed pick (or opens the set); the whole-combo validation
    // below then enforces that EVERY member — anchors included — ends up
    // paired, matching the mode's long-standing semantics.
    const fitsPlaced = (ing: string, idx: number) => {
      let anyPlaced = false;
      let anyPaired = false;
      for (let j = 0; j < N; j++) {
        if (j === idx || !placed[j]) continue;
        if (ing === placed[j]) return false;
        anyPlaced = true;
        const paired = !!map.get(ing)?.has(placed[j] as string);
        if (mode === 'perfect' && !paired) return false;
        if (paired) anyPaired = true;
      }
      if (mode === 'mixed') return !anyPlaced || anyPaired;
      return true; // perfect already vetoed non-pairs above
    };

    const comboValid = (list: string[]) => {
      if (mode !== 'mixed' || list.length <= 1) return true;
      return list.every(ing => list.some(o => o !== ing && map.get(ing)?.has(o)));
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
    // Perfect mode backtracks exhaustively, so one pass per tier suffices;
    // mixed fills greedily against a shifting "pairs with ≥1" target and can
    // fail whole-combo validation, so it gets fresh shuffles.
    const attempts = mode === 'mixed' ? 50 : 1;
    for (const requireDominant of [true, false]) {
      for (let attempt = 0; attempt < attempts; attempt++) {
        resetPlaced();
        if (fill(0, requireDominant) && placed.every(p => p)) {
          const combo = placed as string[];
          if (comboValid(combo)) {
            assertComboInvariant(combo, map, mode);
            return combo;
          }
        }
      }
    }
    return [];
  };

  // For each slot, how many ingredients compatible with all the OTHER selections
  // each taste and category would yield — previews the count per option so a
  // dead-end constraint (0 matches) is visible up front. Walks the intersection
  // of the other ingredients' neighbor sets once and tallies.
  const slotOptionCounts = useMemo(
    () => {
      const poolSet = themedPool ? new Set(themedPool.ingredients.map(s => s.toLowerCase())) : null;
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
          if (!slotAcceptsStructure(slot, profile)) continue;
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
    [slotTastes, selectedIngredients, flavorMap, dietaryRestrictions, profileByName, themedPool]
  );

  // Changing a slot's role (its mode, taste, or category) rerolls just that
  // slot, keeping every other ingredient anchored. Each change is a discrete,
  // undoable user choice, so every one saves history and refreshes the pick.
  const handleSlotTasteChange = (
    slotIndex: number,
    patch: Partial<SlotTaste>
  ) => {
    // Hand-editing the role (mode/taste/category) overrides a frame's editorial
    // slot: drop the frame's structural constraints and label along with it, so
    // "crunch" doesn't silently keep filtering a slot the user re-purposed.
    // Subcategory/exclude tweaks refine the same role, so they keep the frame.
    if (patch.mode !== undefined || patch.taste !== undefined || patch.category !== undefined) {
      const slot = slotTastes[slotIndex];
      if (slot?.textures?.length || slot?.functions?.length || slot?.label) {
        patch = { textures: undefined, functions: undefined, label: undefined, ...patch };
      }
    }
    // Going wild clears the role: the current ingredient trivially satisfies
    // "no constraint", so keep it in place (no reroll) and drop the role pin —
    // Generate is free to randomize this slot again.
    if (patch.mode === 'wild') {
      saveToHistory();
      setSlotTaste(slotIndex, patch);
      setLockedConstraints(prev => {
        if (!prev.has(slotIndex)) return prev;
        const next = new Set(prev);
        next.delete(slotIndex);
        return next;
      });
      return;
    }

    setSlotTaste(slotIndex, patch);
    // Picking a taste/category from the popover is a deliberate "this is what I
    // want to see" choice, so pin it: a subsequent Generate rerolls the ingredient
    // *within* this role instead of randomizing the role away.
    setLockedConstraints(prev => (prev.has(slotIndex) ? prev : new Set(prev).add(slotIndex)));

    const count = selectedIngredients.length;
    // A role set on a slot with no ingredient yet has nothing to reroll.
    if (slotIndex >= count) return;

    // An ingredient-locked slot keeps its pinned ingredient: the lock is the
    // user's strongest statement, so the role is recorded without rerolling
    // out from under it. (Consistent with Generate, where anchors supersede
    // roles — the role starts steering this slot once the pin comes off.)
    if (lockedIngredients.has(slotIndex)) {
      saveToHistory();
      return;
    }

    const newSlots = slotTastes.slice(0, count).map((s, i) =>
      i === slotIndex ? { ...s, ...patch } : s
    );

    // Hand-picking a slot's taste or category departs from the themed pool — the
    // "Pizza Night" label no longer fits — so drop the pool and reroll against the
    // full library. (Subcategory narrows / excludes stay within the pool.) Pass
    // the override explicitly since setThemedPool hasn't flushed yet.
    const breaksPool =
      themedPool && (patch.taste !== undefined || patch.category !== undefined);
    if (breaksPool) {
      setThemedPool(null);
      setIsPoolExpanded(false);
    }

    // Keep every other ingredient anchored; reroll just this slot to fit the new
    // role and stay compatible with the rest.
    const anchors: Record<number, string> = {};
    selectedIngredients.forEach((ing, j) => {
      if (j !== slotIndex && ing) anchors[j] = ing;
    });
    const combo = computeCombo(
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

  // Structural swap (P5): ranked substitutes for one slot's ingredient.
  // Admission is the flavor-map neighborhood intersection of every OTHER
  // selected ingredient (suggestSubstitutes — the engine as judge, on the live
  // user-filtered map); here we additionally respect dietary restrictions, the
  // themed pool, the slot's excludes, and — when the role is pinned — the
  // slot's full role, mirroring how Generate treats locked vs freed slots.
  // Texture/function similarity only orders the list.
  const getSwapSuggestions = (slotIndex: number) => {
    const target = selectedIngredients[slotIndex];
    if (!target) return [];
    const context = selectedIngredients.filter((ing, j) => j !== slotIndex && !!ing);
    const poolSet = themedPool ? new Set(themedPool.ingredients.map(s => s.toLowerCase())) : null;
    const slot = slotTastes[slotIndex];
    const roleLocked = lockedConstraints.has(slotIndex);

    const fitsRole = (profile: IngredientProfile | undefined) => {
      if (!slot || !roleLocked) return true;
      if (!slotAcceptsStructure(slot, profile)) return false;
      if (slot.mode === 'category') {
        if (profile?.category !== slot.category) return false;
        return !slot.subcategories?.length || slot.subcategories.includes(profile?.subcategory as string);
      }
      if (slot.mode === 'taste') return (((profile?.flavorProfile as any)?.[slot.taste]) ?? 0) >= TASTE_THRESHOLD;
      return true;
    };

    return suggestSubstitutes(target, context, flavorMap, 60)
      .filter(s => {
        if (isIngredientRestricted(s.name)) return false;
        if (poolSet && !poolSet.has(s.name.toLowerCase())) return false;
        const profile = profileByName.get(s.name.toLowerCase());
        if (slot?.exclude?.length && profile?.category && slot.exclude.includes(profile.category as CategoryKey)) return false;
        return fitsRole(profile);
      })
      .slice(0, 10);
  };

  const handleSwapPick = (slotIndex: number, name: string) => {
    saveToHistory();
    setSelectedIngredients(prev => prev.map((ing, i) => (i === slotIndex ? name : ing)));
    // An unpinned role should keep describing what's in the slot (same contract
    // as Generate's free slots); a pinned role was already enforced above.
    if (!lockedConstraints.has(slotIndex)) relabelSlotToIngredient(slotIndex, name);
  };

  // Load a Flavor Preset: push its slot roles into the generator, then
  // generate a fresh combo that fits them. The preset is the DNA (tastes /
  // categories), not fixed ingredients — Generate keeps producing new combos
  // for it.
  const handleLoadPreset = async (preset: FlavorPreset) => {
    const slots = preset.slots;
    const count = Math.min(Math.max(slots.length, 1), MAX_SLOTS);

    // Frames that name a mined dish tag lock generation into that tag's
    // subgraph, so a Salad frame's combos and "seen in" receipts agree with
    // its structure (no stew suggestions under a salad). The pinned steer
    // pill in the context strip doubles as the "what am I making" reminder.
    // Presets without a tag clear any prior steer — loading a preset is a
    // clean-slate entry, same as it already is for pools and locks.
    let steeredMap: typeof baseFlavorMap | null = null;
    if (preset.steerTag) {
      const mod = steerModule ?? (await loadContext());
      if (!steerModule) setSteerModule(mod);
      steeredMap = mod.filterFlavorMapByTag(baseFlavorMap, 'dish', preset.steerTag);
    }
    setContextSteer(preset.steerTag ? { group: 'dish', tag: preset.steerTag } : null);

    saveToHistory();

    // Push each slot's constraint into the hook (state update is async, so we
    // also keep `slots` locally for the immediate generate below).
    slots.forEach((s, i) =>
      setSlotTaste(i, {
        mode: s.mode, taste: s.taste, category: s.category,
        subcategories: s.subcategories, exclude: s.exclude,
        // Frame DNA: structural constraints + the editorial role name.
        textures: s.textures, functions: s.functions, label: s.label,
      })
    );

    // Themed presets confine generation to a pool; others clear any prior pool.
    setThemedPool(preset.pool ? { name: preset.name, ingredients: preset.pool } : null);

    setLockedIngredients(new Set());
    // Lock every slot's role by default so Generate rerolls *within* the
    // preset's DNA (new sweet+salty pairs, not a drift to all-sweet) — the
    // palette-generator feel. A preset can opt out with an explicit list.
    const lockedDefault = Array.from({ length: count }, (_, i) => i);
    setLockedConstraints(new Set(preset.lockedConstraints ?? lockedDefault));
    setTargetIngredientCount(count);

    // A few attempts — a tight 4-slot preset can miss on an unlucky shuffle.
    // Pass the pool AND the map explicitly since neither state update has
    // flushed yet (without mapOverride this would run against the PREVIOUS
    // steer's map). Presets are curated against the full pairing rule, so
    // they load in perfect mode.
    let combo: string[] = [];
    for (let attempt = 0; attempt < 12 && combo.length < count; attempt++) {
      combo = computeCombo(slots.slice(0, count), {}, new Set(), preset.pool ?? null, {
        mode: 'perfect',
        mapOverride: steeredMap ?? baseFlavorMap,
      });
    }

    // The steered subgraph can be too sparse for the frame's slot count —
    // fall back to the full map and drop the steer rather than toast a miss.
    if (combo.length < count && steeredMap) {
      setContextSteer(null);
      for (let attempt = 0; attempt < 12 && combo.length < count; attempt++) {
        combo = computeCombo(slots.slice(0, count), {}, new Set(), preset.pool ?? null, {
          mode: 'perfect',
          mapOverride: baseFlavorMap,
        });
      }
    }

    if (combo.length === count) {
      setSelectedIngredients(combo);
    } else {
      setNoMatchToast(true);
    }
    setIsPresetGalleryOpen(false);
  };

  // Encode the current state as a query param. A plain combo (all-wild roles,
  // no locks/pool) encodes just the ingredients in `?ing=`, exactly as before;
  // anything richer encodes the full DNA (slots + picks + locks + pool) in
  // `?lab=`. Both are query params, so a link restores on any static host
  // without server routing. Shared by the Share button and the URL sync below.
  const encodeComboParam = (): { key: 'ing' | 'lab'; value: string } | null => {
    const count = selectedIngredients.length;
    if (count === 0) return null;
    const slots = slotTastes.slice(0, count);
    const isPlain =
      slots.every(s => s.mode === 'wild' && !s.exclude?.length && !s.textures?.length && !s.functions?.length) &&
      lockedConstraints.size === 0 &&
      !themedPool &&
      !contextSteer;
    if (isPlain) {
      return { key: 'ing', value: encodeIngredientsToUrl(selectedIngredients) };
    }
    const state = {
      v: 1,
      s: slots.map(s => ({
        m: s.mode,
        t: s.taste,
        c: s.category,
        ...(s.subcategories?.length ? { sc: s.subcategories } : {}),
        ...(s.exclude?.length ? { x: s.exclude } : {}),
        ...(s.textures?.length ? { tx: s.textures } : {}),
        ...(s.functions?.length ? { fn: s.functions } : {}),
        ...(s.label ? { lb: s.label } : {}),
      })),
      i: selectedIngredients.slice(0, count),
      lc: Array.from(lockedConstraints),
      li: Array.from(lockedIngredients),
      ...(themedPool ? { p: { n: themedPool.name, g: themedPool.ingredients } } : {}),
      // Active steer, so a restored/shared dish keeps its pinned tag (the
      // steered map itself re-derives from this once the context chunk loads).
      ...(contextSteer ? { st: { g: contextSteer.group, t: contextSteer.tag } } : {}),
    };
    return { key: 'lab', value: encodeTasteLabState(state) };
  };

  // Build a shareable deep-link for the current state and copy it to the
  // clipboard.
  const handleShare = () => {
    const base = `${window.location.origin}${window.location.pathname}`;
    const enc = encodeComboParam();
    const url = enc ? `${base}?${enc.key}=${enc.value}` : base;
    try {
      navigator.clipboard?.writeText(url);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context) — the button's
      // own "Copied" affordance still fires; sharing just needs HTTPS.
    }
  };

  // Seed a fresh two-ingredient combo from a clean slate: roles reset to wild,
  // locks and pool cleared — exactly what a first open used to show. Used by
  // the landing's "Surprise me", Space on an empty combo, and deep-link
  // fallbacks. Always perfect-paired, whatever the compatibility mode: a
  // showcase seed should demonstrate the app's whole point.
  const seedFreshCombo = () => {
    const slots = defaultSlots();
    setSlotTastes(slots);
    setLockedConstraints(new Set());
    setLockedIngredients(new Set());
    setThemedPool(null);
    // Reset the slot count too — otherwise a stale target (e.g. left at 4 by a
    // preset/tag) makes the fresh pair render with commas + no "&" until the
    // next Generate.
    setTargetIngredientCount(2);
    setSelectedIngredients(computeCombo(slots.slice(0, 2), {}, new Set(), null, { mode: 'perfect' }));
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
          // Old links carry 2–4 slots; the unified engine runs 1–5. `sc` was a
          // single subcategory string in older links; normalize to an array.
          const count = Math.min(Math.max(d.s.length, 1), MAX_SLOTS);
          const decodedSlots: SlotTaste[] = d.s.slice(0, count).map((s: any, i: number) => ({
            mode: s.m ?? 'wild',
            taste: s.t ?? slotTastes[i]?.taste ?? TASTE_KEYS[0],
            category: s.c ?? slotTastes[i]?.category ?? 'Proteins',
            subcategories: s.sc ? (Array.isArray(s.sc) ? s.sc : [s.sc]) : undefined,
            exclude: s.x,
            // Frame DNA (P5); absent in older links.
            textures: s.tx,
            functions: s.fn,
            label: s.lb,
          }));
          decodedSlots.forEach((s, i) => setSlotTaste(i, s));
          setTargetIngredientCount(count);
          setLockedConstraints(new Set<number>(d.lc ?? []));
          setLockedIngredients(new Set<number>(d.li ?? []));
          setThemedPool(d.p ? { name: d.p.n, ingredients: d.p.g } : null);
          // Restore the pinned steer; the defensive loadContext effect fetches
          // the filter module and the steered map re-derives from state.
          if (d.st?.g && d.st?.t) setContextSteer({ group: d.st.g, tag: d.st.t });
          if (Array.isArray(d.i) && d.i.length) {
            setSelectedIngredients(d.i.slice(0, count));
          } else {
            const combo = computeCombo(decodedSlots, {}, new Set(), d.p?.g ?? null, { mode: 'perfect' });
            if (combo.length === count) setSelectedIngredients(combo);
          }
          return;
        }
      }
      const ingParam = params.get('ing');
      if (ingParam) {
        const ings = decodeUrlToIngredients(ingParam);
        if (ings.length) {
          setTargetIngredientCount(ings.length);
          setSelectedIngredients(ings.slice(0, MAX_SLOTS));
          return;
        }
      }
    } catch {
      // Malformed link — leave the combo empty and let the landing surface show.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL in sync with the live combo (same `?ing=`/`?lab=` encoding as
  // Share) so an accidental refresh restores the user's dish instead of eating
  // it. replaceState only — no history entries, so Back still leaves the app
  // and the Atlas/Graph overlays keep sole ownership of pushState. Foreign
  // params (`atlas`, `graph`, `sources`) are preserved.
  const hasSyncedComboUrl = useRef(false);
  const syncComboUrl = () => {
    // Until the first combo exists, don't touch the URL — the mount effect
    // above may not have decoded a shared deep link yet, and clearing its
    // params here would eat the link before restore reads it.
    if (selectedIngredients.length === 0 && !hasSyncedComboUrl.current) return;
    hasSyncedComboUrl.current = true;
    const params = new URLSearchParams(window.location.search);
    params.delete('ing');
    params.delete('lab');
    const enc = encodeComboParam();
    if (enc) params.set(enc.key, enc.value);
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      query ? `${window.location.pathname}?${query}` : window.location.pathname
    );
  };
  const syncComboUrlRef = useRef(syncComboUrl);
  syncComboUrlRef.current = syncComboUrl;
  useEffect(() => {
    syncComboUrlRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIngredients, slotTastes, lockedConstraints, lockedIngredients, themedPool, contextSteer]);
  // Closing an overlay via history.go() restores an older entry whose combo
  // params may be stale — rewrite them from live state after every popstate.
  useEffect(() => {
    const onPop = () => syncComboUrlRef.current();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
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

  // Close drawer on Escape key. Gated off while the Atlas overlay is up — it sits
  // above the drawer and owns Escape (its own listener closes it).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // The Graph Explorer sits above the drawer and owns Escape while it's open.
      if (e.key === 'Escape' && graphIngredient) {
        closeGraph();
        return;
      }
      if (e.key === 'Escape' && isDrawerOpen && !atlasIngredient && !graphIngredient) {
        setIsDrawerOpen(false);
        // Blur the active element (search input) so shortcuts work
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, atlasIngredient, graphIngredient, closeGraph]);

  // Handle Generate — rerolls into exactly targetIngredientCount ingredients.
  // Each slot is either pinned (ingredient lock = exact; role lock = within
  // its taste/category) or free (any ingredient). Free slots with a non-wild
  // role then adopt the new pick's dominant taste / category so their label
  // still describes the result; wild slots stay wild. Locked ingredients keep
  // their slot positions.
  const handleRandomize = () => {
    // Generate over an empty combo (the landing is up, nothing picked yet —
    // e.g. Space) is a fresh-open seed, not a reroll.
    if (selectedIngredients.length === 0) {
      seedFreshCombo();
      return;
    }

    const count = targetIngredientCount;
    const anchors: Record<number, string> = {};
    const freeSlots = new Set<number>();
    for (let i = 0; i < count; i++) {
      if (lockedIngredients.has(i) && selectedIngredients[i]) anchors[i] = selectedIngredients[i];
      else if (!lockedConstraints.has(i)) freeSlots.add(i);
    }

    const combo = computeCombo(slotTastes.slice(0, count), anchors, freeSlots);
    if (combo.length < count) {
      // Under steering / a themed pool / tight roles the graph can be too
      // sparse for the slot count — say so instead of silently doing nothing.
      setNoMatchToast(true);
      return;
    }
    saveToHistory();
    setSelectedIngredients(combo);
    track('generate', { size: count });

    // Relabel each free slot to match what Generate landed on.
    freeSlots.forEach(i => relabelSlotToIngredient(i, combo[i]));
  };

  // Note: activating a steer deliberately does NOT regenerate. The combo stays put so
  // you can lock "salads" and then add/swap single ingredients within it; hitting
  // Generate rerolls inside the steer. Clearing a steer also keeps the combo (it
  // remains valid in the full graph by construction).

  // Landing tag tap: a clean-slate entry — reset roles/locks/pool, lock the
  // steer, and generate a showcase combo at the largest size the steered
  // subgraph supports (4 → 3 → 2), so a sparse tag (Korean, marinades…) lands
  // a smaller combo instead of a no-match toast. Same solver — the steered map
  // is passed directly because the steer state hasn't flushed yet.
  const handleLandingTag = (group: LandingTagGroup, tag: string) => {
    // A dish tag whose structure exists as a Build-a-Dish preset gets the
    // whole dish: slot roles (base greens, the crunch…) AND the steer on top,
    // via the same loader the gallery uses. Steer-only landings answered
    // "salads" with four compatible seasonings — technically paired, visibly
    // not a salad. Tags with no matching dish (dips, marinades…) keep the
    // steer path below; the pinned steer pill in the context strip says what's
    // active either way. Pool inputs only — the pairing check is untouched.
    if (group === 'dish') {
      const dishPreset = FLAVOR_PRESETS.find(p => p.tier === 'dish' && p.steerTag === tag);
      if (dishPreset) {
        handleLoadPreset(dishPreset);
        return;
      }
    }
    const mod = steerModule ?? getLoadedContext();
    if (!mod) return; // tags render from the context chunk, so it's loaded before they're tappable
    if (!steerModule) setSteerModule(mod);
    const steered = mod.filterFlavorMapByTag(baseFlavorMap, group, tag);
    const slots = defaultSlots();
    setSlotTastes(slots);
    setLockedConstraints(new Set());
    setLockedIngredients(new Set());
    setThemedPool(null);
    setContextSteer({ group, tag });
    for (let size = 4; size >= 2; size--) {
      const combo = computeCombo(slots.slice(0, size), {}, new Set(), null, {
        mode: 'perfect',
        mapOverride: steered,
      });
      if (combo.length === size) {
        setTargetIngredientCount(size);
        setSelectedIngredients(combo);
        return;
      }
    }
    // Not even a pair under this tag (shouldn't happen for a listed one) —
    // drop the steer rather than strand an empty screen.
    setContextSteer(null);
    setTargetIngredientCount(2);
    setSelectedIngredients(computeCombo(slots.slice(0, 2), {}, new Set(), null, { mode: 'perfect' }));
  };

  // Landing composite entry: a query naming more than one thing ("spinach and
  // apple salad" → two ingredients + a dish tag). The parser (parseLandingQuery)
  // only splits the string into entities the app already owns; the actual combo
  // is still built by computeCombo under the untouched flavor-map rule.
  //
  // Contract, in priority order: keep every typed ingredient that CAN be placed,
  // then the dish/cuisine steer, then a fuller combo. Because computeCombo only
  // vets the pairing of OPEN slots against the anchors (not anchors against each
  // other in perfect mode), we pre-reduce the anchors to a mutually-compatible
  // subset ourselves — otherwise two incompatible typed ingredients could slip
  // through as an invalid combo. That keeps the inviolable rule intact.
  // Lowercase ingredient name → exact flavor-map key. Rebuilt only when the base
  // graph changes; used to resolve parsed/typed names to real anchors.
  const keyByLower = useMemo(() => {
    const m = new Map<string, string>();
    baseFlavorMap.forEach((_v, k) => m.set(k.toLowerCase(), k));
    return m;
  }, [baseFlavorMap]);

  // Cache of steered subgraphs (built lazily, keyed by group:tag) so the landing
  // can pre-check a steer without rebuilding the filtered map on every keystroke.
  const steeredMapCache = useRef(new Map<string, Map<string, Set<string>>>());
  const getSteeredMap = useCallback((group: 'dish' | 'cuisine', tag: string) => {
    const mod = steerModule ?? getLoadedContext();
    if (!mod) return null;
    const cacheKey = `${group}:${tag}`;
    let m = steeredMapCache.current.get(cacheKey);
    if (!m) { m = mod.filterFlavorMapByTag(baseFlavorMap, group, tag); steeredMapCache.current.set(cacheKey, m); }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFlavorMap, steerModule]);

  // Would a steer actually survive if we anchored these typed ingredients on it?
  // The landing calls this before offering a composite hit, so it never promises
  // a "sandwiches" combo the graph can't fulfil (it would otherwise load with the
  // steer silently dropped). Sound by construction: all anchors present and
  // mutually compatible in the subgraph ⇒ the combo of exactly those anchors is
  // valid, so the handler will keep the steer.
  const canComposeSteer = useCallback((ingredients: string[], group: 'dish' | 'cuisine', tag: string): boolean => {
    if (ingredients.length === 0) return false;
    const m = getSteeredMap(group, tag);
    if (!m) return true; // context not loaded yet — don't block; handler re-checks
    const anchors = ingredients
      .map(n => keyByLower.get(n.toLowerCase()))
      .filter((n): n is string => !!n);
    if (anchors.length !== ingredients.length) return false; // a name isn't even in the graph
    return compatibleAnchorSubset(m, anchors).length === anchors.length;
  }, [getSteeredMap, keyByLower]);

  const handleLandingCompose = (parsed: ParsedComposite) => {
    const mod = steerModule ?? getLoadedContext();

    // Resolve parsed ingredient names to exact flavor-map keys (case-insensitive),
    // capping at the slot budget. Names with no key are pairless — dropped here.
    const wanted = parsed.ingredients
      .map(n => keyByLower.get(n.toLowerCase()))
      .filter((n): n is string => !!n)
      .slice(0, MAX_SLOTS);

    // A dish tag takes precedence over a cuisine tag for the steer (it's the more
    // structural "what am I making"); only one steer is active at a time.
    const steer: { group: LandingTagGroup; tag: string } | null =
      parsed.dishTag ? { group: 'dish', tag: parsed.dishTag }
      : parsed.cuisineTag ? { group: 'cuisine', tag: parsed.cuisineTag }
      : null;

    // Try to fill a perfect combo on `map` anchored by `keep`, largest size
    // first. Composite loads aim for a compact 3 (bigger feels over-prescribed),
    // expanding only if more ingredients were typed. Returns the combo + the
    // anchors actually used, or null.
    const tryPlan = (
      map: Map<string, Set<string>>,
      anchors: string[]
    ): { combo: string[]; keep: string[] } | null => {
      const keep = compatibleAnchorSubset(map, anchors);
      if (keep.length === 0 && anchors.length > 0) return null;
      const slots = defaultSlots();
      const floor = Math.max(keep.length, 2);
      const aim = Math.min(MAX_SLOTS, Math.max(keep.length, 3));
      for (let size = aim; size >= floor; size--) {
        const anchorRec: Record<number, string> = {};
        keep.forEach((ing, i) => { anchorRec[i] = ing; });
        const free = new Set<number>();
        for (let i = 0; i < size; i++) if (!(i in anchorRec)) free.add(i);
        const combo = computeCombo(slots.slice(0, size), anchorRec, free, null, {
          mode: 'perfect',
          mapOverride: map,
        });
        if (combo.length === size) return { combo, keep };
      }
      return null;
    };

    // Plan S keeps the steer; Plan B drops it to recover any ingredient the
    // steered subgraph couldn't host. Prefer whichever keeps MORE typed
    // ingredients; on a tie, prefer the steered plan (richer context).
    const steeredMap = steer ? getSteeredMap(steer.group, steer.tag) : null;
    const planS = steeredMap ? tryPlan(steeredMap, wanted) : null;
    const planB = tryPlan(baseFlavorMap, wanted);

    let chosen: { combo: string[]; keep: string[]; steer: typeof steer } | null = null;
    if (planS && (!planB || planS.keep.length >= planB.keep.length)) {
      chosen = { ...planS, steer };
    } else if (planB) {
      chosen = { ...planB, steer: null };
    } else if (planS) {
      chosen = { ...planS, steer };
    }

    if (!chosen || chosen.combo.length === 0) {
      // Nothing placeable (e.g. every typed ingredient pairless) — fall back to a
      // plain steer if we have one, else surprise. Never fabricate a combo.
      if (steer && mod) { handleLandingTag(steer.group, steer.tag); return; }
      seedFreshCombo();
      return;
    }

    // Commit as a clean-slate entry (mirrors handleLandingTag — reached only from
    // the empty landing, so there's no prior combo worth saving): reset
    // roles/pool, set the steer, lock the typed ingredients so a later Generate
    // keeps them and rerolls only the filler slots.
    const slots = defaultSlots();
    setSlotTastes(slots);
    setLockedConstraints(new Set());
    setThemedPool(null);
    if (chosen.steer && mod && !steerModule) setSteerModule(mod);
    setContextSteer(chosen.steer);
    setTargetIngredientCount(chosen.combo.length);
    setSelectedIngredients(chosen.combo);
    setLockedIngredients(new Set(chosen.keep.map((_ing, i) => i)));
  };

  // Landing "Generate": seed a fresh combo (Classic by default). Filling the
  // combo hides the landing on its own — it's the empty state.
  const handleLandingGenerate = () => {
    seedFreshCombo();
  };

  // Clean-slate entry anchored on one ingredient: seed a fresh 2-ingredient
  // pairing with the pick locked at index 0, so a later Generate keeps it and
  // only rerolls the partner. Resets roles/locks/pool/steer first (history is
  // saved, so Undo restores whatever was on screen). Falls back to the bare
  // ingredient if the graph has no compatible partner (shouldn't happen for a
  // real ingredient). Used by the first pick from an empty combo and by the
  // Atlas's "start a pairing from here" handoff.
  const startPairingFrom = (ingredient: string) => {
    saveToHistory();
    const slots = defaultSlots();
    setSlotTastes(slots);
    setLockedConstraints(new Set());
    setThemedPool(null);
    setContextSteer(null);
    // The steer/pool clears haven't flushed yet — run against the unsteered
    // base map explicitly (still the full pairing check, just not a stale subset).
    const combo = computeCombo(slots.slice(0, 2), { 0: ingredient }, new Set([1]), null, {
      mapOverride: baseFlavorMap,
    });
    if (combo.length === 2) {
      setSelectedIngredients(combo);
      setTargetIngredientCount(2);
      setLockedIngredients(new Set([0]));
    } else {
      setSelectedIngredients([ingredient]);
      setLockedIngredients(new Set());
    }
  };

  // Graph Explorer "Use this combo" handoff: the build-mode picks (mutually compatible
  // by construction) become the main app selection, resetting roles/pool/steer exactly
  // like loading a saved combo. Everything downstream (Save/Share/Generate/Recipes)
  // then behaves as if they were picked in Classic mode. Graph picks are unlimited but
  // the slot system is not — the graph disables the handoff past MAX_SLOTS, and the
  // guard here backstops that so an oversized combo can never corrupt the slots.
  // Bottom-bar map entry: the Graph Explorer as a view of the current combo.
  // Opens in build mode seeded with the selection — the picks are mutually
  // compatible by construction, so the graph shows them as a clique with the
  // live "what else fits all of these" pool around them.
  // Also the ⓘ/About entry: with a combo on screen, ingredient info opens the map
  // showing the WHOLE current combo (build mode), centered on the tapped ingredient —
  // the map picks up exactly where the home screen left off instead of dropping to a
  // lone-ingredient view (Matt's July 19 call).
  const openGraphWithCombo = (centerName?: string) => {
    const combo = selectedIngredients.filter(Boolean);
    if (combo.length === 0) return;
    setGraphSeed(combo);
    openGraph(centerName && combo.includes(centerName) ? centerName : combo[0]);
  };

  const applyComboHandoff = (ingredients: string[]) => {
    if (ingredients.length === 0 || ingredients.length > MAX_SLOTS) return;
    saveToHistory();
    const slots = defaultSlots();
    setSlotTastes(slots);
    setLockedConstraints(new Set());
    setThemedPool(null);
    setContextSteer(null);
    setLockedIngredients(new Set());
    setSelectedIngredients([...ingredients]);
    setTargetIngredientCount(ingredients.length);
    closeGraph();
  };

  // Wrap handleIngredientSelect to clear search term and keep slot roles
  // truthful for the slot the pick lands in.
  const handleIngredientSelect = (ingredient: string) => {
    // First pick from an empty combo: a clean-slate entry — rather than
    // stranding a lone ingredient next to a blank second slot, seed a full
    // 2-ingredient pairing anchored on the searched ingredient.
    if (selectedIngredients.length === 0) {
      startPairingFrom(ingredient);
      setSearchTerm('');
      setIsDrawerOpen(false);
      return;
    }
    // Appending into a slot whose remembered role doesn't describe the pick
    // would lie (e.g. a "sweet" slot receiving anchovy) — relabel it. Wild
    // slots stay wild. Only when the pick will actually be added.
    const willAdd =
      selectedIngredients.length < MAX_SLOTS && !selectedIngredients.includes(ingredient);
    baseHandleIngredientSelect(ingredient);
    if (willAdd) relabelSlotToIngredient(selectedIngredients.length, ingredient);
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

  // Removing an ingredient must keep slot state aligned: splice its role out
  // (appending a fresh wild slot at the end so 5 remembered slots remain) and
  // shift role locks down past the gap. The base handler does the same for
  // ingredient locks and the target count.
  const spliceSlotState = (index: number) => {
    setSlotTastes(prev => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      next.push({ mode: 'wild', taste: removed?.taste ?? TASTE_KEYS[0], category: removed?.category ?? 'Proteins' });
      return next;
    });
    setLockedConstraints(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  // Remove one ingredient (X control / swipe / Delete key), keeping slot roles
  // and role locks aligned with the survivors.
  const handleRemoveWithRoles = (index: number) => {
    handleRemove(index); // saves history (pre-change roles included) first
    spliceSlotState(index);
  };

  // Add a slot: generate one more ingredient that fits alongside the current
  // picks (the new slot ignores its remembered role, then relabels to describe
  // the result — wild stays wild). Surfaces feedback when nothing fits.
  const handleIncrementTarget = () => {
    const count = selectedIngredients.length;
    if (count >= MAX_SLOTS) return;
    const newCount = count + 1;
    const anchors: Record<number, string> = {};
    selectedIngredients.forEach((ing, i) => { if (ing) anchors[i] = ing; });
    const combo = computeCombo(slotTastes.slice(0, newCount), anchors, new Set([count]));
    if (combo.length !== newCount) {
      setNoMatchToast(true);
      return;
    }
    saveToHistory();
    setSelectedIngredients(combo);
    // With empty display slots (target > picks), + fills one of those instead
    // of widening the target.
    if (newCount > targetIngredientCount) setTargetIngredientCount(newCount);
    relabelSlotToIngredient(count, combo[count]);
  };

  // Remove a slot: with empty display slots, shrink the target first;
  // otherwise remove the last unlocked ingredient (and its role bookkeeping).
  const handleDecrementTarget = () => {
    if (targetIngredientCount > selectedIngredients.length) {
      const newTarget = targetIngredientCount - 1;
      if (newTarget >= selectedIngredients.length && newTarget >= 1) {
        saveToHistory();
        setTargetIngredientCount(newTarget);
      }
      return;
    }
    for (let i = selectedIngredients.length - 1; i >= 0; i--) {
      if (!lockedIngredients.has(i)) {
        handleRemoveWithRoles(i);
        return;
      }
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
            handleRemoveWithRoles(i);
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
  }, [selectedIngredients, lockedIngredients, canIncrementTarget, canDecrementTarget, slotTastes]);

  // Handle recipe search - opens the recipe finder modal
  const handleRecipeSearch = () => {
    if (selectedIngredients.length === 0) return;
    setIsRecipeModalOpen(true);
    track('recipe_search_open', { size: selectedIngredients.length });
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

  // The dish type this combo would carry if saved right now — inferred from an
  // active dish steer (which is also how frame presets announce themselves).
  const inferredDishTypeId = useMemo(() => {
    if (contextSteer?.group !== 'dish') return undefined;
    return DISH_TYPES.find(d => d.steerTag === contextSteer.tag)?.id;
  }, [contextSteer]);

  // Toggle saving the current combination from the header bookmark button
  const handleSaveToggle = () => {
    if (selectedIngredients.length === 0) return;
    if (currentSavedId) {
      deleteCombination(currentSavedId);
      setSaveToast('removed');
    } else {
      saveCombination(
        selectedIngredients.join(', '), selectedIngredients,
        undefined, undefined, inferredDishTypeId
      );
      setSaveToast('saved');
      track('save_combo', { size: selectedIngredients.length });
    }
  };

  // Zoom out from the just-saved combo to its dish-level surface.
  const openDrinkPanelForCurrent = () => {
    setSaveToast(null);
    const combo = currentSavedId ? combinations.find(c => c.id === currentSavedId) : undefined;
    setDrinkPanel({
      savedId: currentSavedId,
      ingredients: [...selectedIngredients],
      name: combo?.name ?? selectedIngredients.join(', '),
      servedAs: combo?.dishTypeId ?? inferredDishTypeId,
    });
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
    // The saved toast carries the drink-panel action, so it lingers longer.
    const timer = setTimeout(() => setSaveToast(null), saveToast === 'saved' ? 5000 : 2200);
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
            if (themedPool) {
              return `Too few ingredients in “${themedPool.name}” pair up — remove the preset for more options`;
            }
            const within = contextSteer ? ` within “${contextSteer.tag}”` : '';
            if (lockedIngredients.size > 0) {
              return contextSteer
                ? `Nothing pairs with your locked picks${within} — unlock one or clear the tag`
                : 'No other ingredient pairs with your locked picks — unlock one to free it up';
            }
            if (lockedConstraints.size > 0) {
              return 'No pairing fits your slot roles — unlock one or change its taste/category';
            }
            return contextSteer
              ? `Nothing pairs with all of these${within} — clear the tag for more options`
              : 'No other ingredient pairs with all of these';
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
          {saveToast === 'saved' ? (
            <span className="inline-flex items-center gap-3">
              Saved
              <button
                onClick={openDrinkPanelForCurrent}
                className="px-2.5 py-1 -my-0.5 rounded-full text-xs font-semibold bg-white/20 dark:bg-gray-900/15 hover:bg-white/30 dark:hover:bg-gray-900/25 transition-colors whitespace-nowrap"
              >
                What to drink with this?
              </button>
            </span>
          ) : (
            'Removed from saved'
          )}
        </div>
      )}

      {/* Themed pool banner — shows the active pool, reveals its ingredients on
          click, and offers an escape hatch */}
      {themedPool && !isDrawerOpen && (
        <div
          ref={poolBannerRef}
          className={`
            fixed left-1/2 -translate-x-1/2 z-[55] w-max max-w-[min(92vw,28rem)]
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
              {themedPool.name} pool · {themedPool.ingredients.length} ingredients
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
                themedPool.ingredients.reduce<Record<string, string[]>>((acc, name) => {
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
        minTarget={minTarget}
        maxTarget={MAX_SLOTS}
        canIncrement={canIncrementTarget}
        canDecrement={canDecrementTarget}
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
        dimmed={showLanding}
      />

      {/* Mobile Bottom Bar — not rendered on the landing: every button acts on
          a combo that doesn't exist yet, and the landing owns the screen. */}
      {isMobile && !showLanding && (
        <div>
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
          : `flex-1 pt-20 ${isMobile ? 'pb-[calc(96px_+_env(safe-area-inset-bottom))]' : 'pb-32'}`}
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
            onCompose={handleLandingCompose}
            canSteer={canComposeSteer}
            onGenerate={handleLandingGenerate}
            onPasteRecipe={() => setIsPasteModalOpen(true)}
            // ⓘ = the flavor map centered on the ingredient (its panel carries the
            // profile; the full Atlas stays one click deeper via "Full details").
            onOpenInfo={openGraph}
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
                onRemove={handleRemoveWithRoles}
                onLockToggle={handleLockToggleWithFocus}
                onEmptySlotClick={() => setIsDrawerOpen(true)}
                onCloseDrawer={() => setIsDrawerOpen(false)}
                isDrawerOpen={isDrawerOpen}
                // Base map, not the steered one: the hero's warning means "these don't
                // PAIR" — steer fit is a different fact and must not hijack it.
                flavorMap={baseFlavorMap}
                // Per-slot roles: indicator + popover editor
                slotTastes={slotTastes}
                slotOptionCounts={slotOptionCounts}
                constraintLockedIndices={lockedConstraints}
                onSlotRoleChange={handleSlotTasteChange}
                onConstraintLockToggle={handleConstraintLockToggle}
                onOpenGraph={openGraphWithCombo}
                onSwapSuggestions={getSwapSuggestions}
                onSwapPick={handleSwapPick}
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
                onRemove={handleRemoveWithRoles}
                onLockToggle={handleLockToggleWithFocus}
                onEmptySlotClick={() => setIsDrawerOpen(true)}
                onCloseDrawer={() => setIsDrawerOpen(false)}
                isDrawerOpen={isDrawerOpen}
                // Base map — same reason as the mobile mount above.
                flavorMap={baseFlavorMap}
                // Per-slot roles: indicator + popover editor
                slotTastes={slotTastes}
                slotOptionCounts={slotOptionCounts}
                constraintLockedIndices={lockedConstraints}
                onSlotRoleChange={handleSlotTasteChange}
                onConstraintLockToggle={handleConstraintLockToggle}
                onOpenGraph={openGraphWithCombo}
                onSwapSuggestions={getSwapSuggestions}
                onSwapPick={handleSwapPick}
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
          Hidden entirely on the landing — one screen, one search box (the
          landing's) — and hidden also removes the closed drawer's buttons from
          the tab order. If something opens the drawer, it shows normally. */}
      <div className={showLanding && !isDrawerOpen ? 'hidden' : ''}>
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
        onOpenInfo={openGraphWithCombo}
        // Bottom-bar map button (drawer closed): current combo on the graph
        onOpenMap={() => openGraphWithCombo()}
        canOpenMap={selectedIngredients.filter(Boolean).length > 0}
      />
      </div>

      {/* Paste-a-recipe: capture + confirm, then hand off to the Flavor Report */}
      <PasteRecipeModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        allIngredients={allIngredients}
        onOpenReport={state => {
          setIsPasteModalOpen(false);
          openRecipeReport(state);
        }}
      />

      {/* Flavor Report — uncapped recipe analysis (?recipe=). Rendered before the
          Graph Explorer so "View as map" stacks the graph on top; Back returns here. */}
      <FlavorReport
        state={recipeState}
        onClose={closeRecipeReport}
        onRiff={ings => {
          // Same reset path as the Graph Explorer handoff (guards > MAX_SLOTS).
          applyComboHandoff(ings);
          closeRecipeReport();
        }}
        onViewMap={names => {
          setGraphSeed(names);
          openGraph(names[0]);
        }}
      />

      {/* Recipe Finder Modal */}
      <RecipeFinderModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        ingredients={selectedIngredients}
        dishContext={contextSteer}
      />

      {/* Graph Explorer — the flavor map made visible (deep-linked via ?graph=).
          Rendered before the Atlas so "Full details" can stack the Atlas on top as a
          drill-down; closing the Atlas drops back to the graph underneath. */}
      <GraphExplorer
        ingredient={graphIngredient}
        onClose={closeGraph}
        onNavigate={openGraph}
        onUseCombo={applyComboHandoff}
        onOpenAtlas={name => openAtlas(name)}
        initialPicks={graphSeed}
        isMobile={isMobile}
      />

      {/* Ingredient Atlas — per-ingredient reference page (deep-linked via ?atlas=) */}
      <IngredientAtlas
        ingredient={atlasIngredient}
        onClose={closeAtlas}
        onNavigate={openAtlas}
        onStartPairing={name => {
          startPairingFrom(name);
          closeAtlas();
        }}
        onOpenGraph={name => {
          // One synchronous history swap (?atlas= → ?graph=). Never closeAtlas() +
          // openGraph(): an in-app close runs an async history.go() that races the
          // push and dumps the user back on the home page.
          swapOverlayParam('atlas', 'graph', name);
        }}
        isMobile={isMobile}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        dietaryRestrictions={dietaryRestrictions}
        onDietaryChange={setDietaryRestrictions}
        compatibilityMode={compatibilityMode}
        onCompatibilityChange={handleCompatibilityChange}
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
        onDrinkPairing={combo => {
          setIsSidebarOpen(false);
          setDrinkPanel({
            savedId: combo.id,
            ingredients: [...combo.ingredients],
            name: combo.name,
            servedAs: combo.dishTypeId,
          });
        }}
      />

      {/* Drink pairing panel (menu level) */}
      {drinkPanel && (
        <DrinkPairingPanel
          ingredients={drinkPanel.ingredients}
          dishName={drinkPanel.name}
          servedAs={drinkPanel.servedAs}
          onServedAsChange={id => {
            setDrinkPanel(p => (p ? { ...p, servedAs: id } : p));
            if (drinkPanel.savedId) updateCombination(drinkPanel.savedId, { dishTypeId: id });
          }}
          onRename={
            drinkPanel.savedId
              ? name => {
                  updateCombination(drinkPanel.savedId!, { name });
                  setDrinkPanel(p => (p ? { ...p, name } : p));
                }
              : undefined
          }
          nonAlcoholicOnly={Object.entries(dietaryRestrictions).some(
            ([key, allowed]) => key.startsWith('Alcohol:') && allowed === false
          )}
          onClose={() => setDrinkPanel(null)}
          isMobile={isMobile}
        />
      )}

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
