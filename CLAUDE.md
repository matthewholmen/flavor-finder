# Flavor Finder

A React application for discovering compatible flavor pairings between ingredients.

## ⚠️ Core principle — never relax the pairing algorithm

The flavor-map pairing/compatibility algorithm is the entire point of this app. **Never relax, weaken, sidestep, or bypass it** to make a feature work or feel richer. Every generated combination must stay mutually compatible per the flavor map (the `flavorMap` edges; `fitsPlaced` in `computeTasteLabCombo`).

- To add variety, change the **inputs** — bigger ingredient pools, more nodes, subcategory precision, richer pairing data — never the compatibility check.
- A `wild` slot is allowed: it drops a slot's taste/category filter but still enforces flavor-map pairing. That is not a relaxation.
- The pairing data/algorithm itself may be deliberately changed or improved when that is the explicit goal — but never avoided as a shortcut.

## Current status & rollout plan (July 2026)

The app is **live on Vercel** at https://flavor-finder-kappa.vercel.app/ (deploys from GitHub main).
Feature phases P1–P6 are done. The active work is **rollout readiness** — repo cleanup,
analytics, then a 5-person user test — per [docs/ROLLOUT_PLAN.md](docs/ROLLOUT_PLAN.md).
New feature work (including `docs/RECIPE_SYSTEM_PLAN.md`) is paused until testing
evidence exists.

- The iOS app (`FlavorFinder-iOS-2.9/`) is **abandoned** — archived out of the repo
  per the rollout plan; don't build on it.
- `my-app/` (Next.js experiment) is likewise abandoned/archived.
- Matt (the owner) is nontechnical: explain technical tradeoffs in plain language
  and handle git/GitHub/Vercel mechanics end-to-end. Commit and push straight to
  main — no branches or PRs unless asked.

## Tech Stack

- **Framework**: React 18 with Create React App
- **Styling**: Tailwind CSS 3.4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts

## Commands

```bash
npm start    # Start development server
npm run build    # Production build
npm test     # Run tests
```

## Project Structure

```
src/
├── App.tsx                   # App shell — renders FlavorFinderV2 inside ThemeProvider
├── FlavorFinderV2.tsx        # Main component (Classic + Taste Lab modes, generation)
├── types.ts                  # Shared TypeScript types
├── contexts/
│   └── ThemeContext.tsx      # Dark mode + high-contrast theme context
├── components/
│   ├── v2/                   # All live UI components
│   │   ├── MinimalHeader.tsx       # Top header: logo, ±/Generate cluster, Save/Share/Recipes
│   │   ├── LandingSurface.tsx      # Front-door entry: search + browsable cuisine/dish tags
│   │   ├── IngredientDisplay.tsx   # Unified ingredient display (hero + compact, mobile swipe rows)
│   │   ├── IngredientDrawer.tsx    # Search/filter drawer (desktop 3-col, mobile bottom sheet)
│   │   ├── IngredientFiltersModal.tsx # Dietary/category include-exclude modal
│   │   ├── Sidebar.tsx             # Mode toggle, generation options, pairing sources, saved combos
│   │   ├── DietaryFilterPills.tsx  # Active dietary-filter chips
│   │   ├── RecipeFinderModal.tsx   # "Find recipes" modal (web + curated site search)
│   │   ├── IngredientAtlas.tsx     # Read-only per-ingredient reference page (?atlas=)
│   │   ├── GraphExplorer.tsx       # Force-graph "Atlas view": ego network + build-by-pruning (?graph=)
│   │   ├── TasteLabSplit.tsx       # Taste Lab split-slot view
│   │   ├── PresetGallery.tsx       # Flavor preset gallery (incl. dish frames)
│   │   ├── OnboardingWizard.tsx    # First-run tour
│   │   ├── MobileBottomBar.tsx     # Mobile 5-button action bar
│   │   └── ui/                     # Shared design-system primitives
│   │       ├── Pill.tsx            # Toggle pill (neutral + data-driven accent)
│   │       ├── IconButton.tsx      # Icon-only button: 44px hit area + required aria-label
│   │       ├── Slider.tsx          # Taste range slider (accent thumb + value-fill track)
│   │       ├── SlotRolePopover.tsx # Per-slot role editor (portal; desktop anchor / mobile sheet)
│   │       ├── SwapPopover.tsx     # Structural swap suggestions (same portal contract)
│   │       └── index.ts
│   └── icons/
│       └── LockIcons.tsx           # Custom lock/unlock SVG icons
├── data/
│   ├── flavorPairings.ts     # Core ingredient pairing data
│   ├── ingredientProfiles.ts # Ingredient metadata (category, taste profiles)
│   ├── flavorPresets.ts      # Curated flavor presets (e.g. "Pizza Night")
│   ├── pairingMeta.ts        # Pairing source/provenance metadata
│   └── dietaryRestrictions.ts
├── hooks/
│   ├── useScreenSize.ts      # Responsive breakpoint hook
│   ├── useSavedCombinations.ts # Saved ingredient combinations
│   ├── useCustomPresets.ts   # User-created presets
│   ├── useFavorites.tsx      # Favorite ingredients management
│   ├── useIngredientSelection.ts
│   ├── useFilters.ts
│   ├── useTasteLab.ts        # Taste Lab slot state + constants
│   ├── useAtlasRoute.ts      # ?atlas=<name> overlay routing (pushState/popstate)
│   ├── useGraphRoute.ts      # ?graph=<name> Graph Explorer routing (mirrors useAtlasRoute)
│   └── useCompatibility.ts
└── utils/
    ├── suggestSubstitutes.ts # Contextual substitution (flavor-map admission, texture/function ranking)
    ├── atlas.ts             # Read-only aggregation for the Ingredient Atlas + canonical getAtlasGraph()
    ├── graphExplorer.ts     # Pure ego-network + build-prune math for GraphExplorer (reads flavor map only)
    ├── searchUtils.ts        # Ingredient filtering/search
    ├── categorySearch.ts     # Category-based search
    ├── categoryLabels.ts     # Category key → display label
    ├── flavorMap.ts          # Builds the bidirectional flavor map (ALL_SOURCES)
    ├── dietaryPresets.ts     # Dietary preset definitions + toggling
    ├── colors.ts             # TASTE_COLORS, CATEGORY_COLORS, ICON_SIZES, contrast helpers
    ├── ingredientColors.ts   # Ingredient-specific color utilities
    └── urlEncoding.js        # URL state encoding/decoding
```

> Note: V1 (`FlavorFinder.js`) and the orphaned `MenuPlanner/`, `mobile/`, and
> `filters/UnifiedFilterPanel/` subsystems were removed; V2 is the only app.

## Key Concepts

### Flavor Map
The app builds a bidirectional map of ingredient pairings from `flavorPairings.ts`. Each ingredient maps to a Set of compatible ingredients.

### Ingredient Selection
- Users can select 1-5 ingredients
- Ingredients can be locked to persist through regeneration
- The "Generate" button finds random compatible combinations using backtracking algorithm

### Ingredient Display
The unified `IngredientDisplay` component handles both hero (full-screen) and compact (drawer open) modes:
- Uses CSS transform scaling for smooth GPU-animated transitions between modes
- Renders at hero size and scales down for compact view (~40% on desktop, ~62.5% on mobile)
- Locked ingredients show an animated underline effect (`underlineIn` CSS animation)
- Custom `FilledLock` and `CustomUnlock` SVG icons in `components/icons/LockIcons.tsx`
- Desktop: hover reveals remove (X) and lock toggle controls inline
- Mobile: tap to focus ingredient, floating action buttons appear for remove/lock

### Categories
8 categories with focused subcategories:
- **Proteins**: Meat, Poultry, Seafood, Plant Proteins
- **Vegetables**: Allium, Leafy Greens, Roots, Squash, Brassicas, Mushrooms, Stalks, Fruit Vegetables
- **Fruits**: Citrus, Stone Fruit, Tropical, Berries, Pome Fruit, Melons
- **Dairy**: Cheese, Cultured, Milk & Cream
- **Seasonings**: Herbs, Spices, Chilis
- **Pantry**: Oils & Fats, Vinegars, Stocks, Sauces, Sweeteners
- **Grains**: Rice, Pasta, Bread, Ancient Grains
- **Alcohol**: Wine, Spirits, Liqueurs

### Taste Profile
7 taste dimensions (0-10 scale each):
- **sweet, salty, sour, umami, fat, spicy**: Basic tastes
- **aromatic**: Fragrance intensity (herbs score high, neutral ingredients low)

### Textures & Functions (P4 data layer)
Every profile carries two controlled-vocabulary tags describing its **typical served
state** (acorn squash = creamy, not hard):
- **`textures`** (10 terms): crunchy, crisp, creamy, tender, chewy, juicy, flaky,
  starchy, liquid, airy. Empty array = audited, texture-neutral (ground spices).
- **`functions`** (8 structural roles): acid, fat, binder, bulk, fresh-finish,
  crunch-topper, sweetener, umami-bomb — the mechanism behind dish frames and
  substitution ranking.

Vocabularies live in `types.ts` (`TEXTURES` / `INGREDIENT_FUNCTIONS`); data is
populated by `tooling/profile-audit/` (extract → proposals → check → merge — offline,
like the pairing pipeline). In substitution, texture/function only ever **rank**;
flavor-map compatibility alone admits (see `suggestSubstitutes.ts`). As slot
constraints they may also **narrow a slot's pool** (dish frames) — a pool input
change, same as taste/category roles; the pairing check is never touched.

### Intensity & cooking methods (P6 audit, July 2026)
A second profile-audit pass populated two more fields on all 638 profiles, rewrote
flat early-model descriptions (~560), and applied 27 reviewed taste corrections:
- **`intensity`** (1–10): how loudly the ingredient announces itself at typical
  quantity — habanero 10, jalapeño 6, chicken breast 2. Data-only so far (no
  pairing/UI consumer); candidate uses are Atlas display, steering rank, and
  dish-frame balance. Never a pairing filter.
- **`cookingMethods`**: `COOKING_METHODS` vocab in `types.ts` (18 terms) — methods
  the ingredient genuinely suits; empty array = audited, not applicable
  (vinegars, extracts, condiments).

### Dish frames & structural swap (P5)
- **Frames** are `tier: 'frame'` presets in `flavorPresets.ts`: 5-slot structures
  (Salad, Grain Bowl, Pasta Night, Stir-Fry, Soup) whose slots carry editorial
  `label`s ("base greens", "the crunch") plus `textures`/`functions` constraints
  on `SlotTaste`. Prescriptive about structure, permissive about outcome.
- **Structural swap**: the ⇄ control on a hero ingredient (desktop icon stack;
  mobile expanded-info "Swap it") lists `suggestSubstitutes` candidates that pair
  with the rest of the combo, filtered by dietary/pool/excludes and — when the
  role is pinned — the slot's full role, with shared texture/function chips as
  ranking receipts.

### Filtering
- **Category/Subcategory**: Filter by ingredient type
- **Taste Profile**: Filter by flavor attributes (minimum threshold)
- **Dietary Restrictions**: Exclude ingredient categories

### Dietary Restrictions
Dietary filters use a flat key format: `'Category:Subcategory' = false` (false means excluded).
- **vegetarian**: Excludes `Proteins:Meat`, `Proteins:Poultry`, `Proteins:Seafood`
- **pescatarian**: Excludes `Proteins:Meat`, `Proteins:Poultry` (seafood allowed)
- **gluten-free**: Excludes `Grains:Bread`, `Grains:Pasta`
- **dairy-free**: Excludes `Dairy:Cheese`, `Dairy:Cultured`, `Dairy:Milk & Cream`
- **alcohol-free**: Excludes `Alcohol:Wine`, `Alcohol:Spirits`, `Alcohol:Liqueurs`
- **nut-free**: Special key `_nuts` for cross-category nut ingredients

### Theme Support
Dark mode is supported via `ThemeContext.tsx`. Toggle available in settings.

## Shared UI Primitives

`src/components/v2/ui/` holds the design-system primitives — prefer these over
hand-rolled markup so styling stays consistent:
- **`Pill`** — toggle pill/chip. Neutral by default; pass `accent` (hex) for
  data-driven taste/category coloring. Use for filter/dietary/tag pills.
- **`IconButton`** — icon-only button that enforces a 44px touch target and a
  required `label` (aria-label). Use for any icon-only control.
- **`Slider`** — taste range slider with an accent thumb (white-ringed for
  contrast) and a value-fill track. Use for taste-threshold inputs.

Icon sizing comes from `ICON_SIZES` / `iconSize(step, isMobile)` in
`utils/colors.ts` — avoid hardcoded `size={isMobile ? 24 : 30}` literals.
