# Flavor Finder

A React application for discovering compatible flavor pairings between ingredients.

## ⚠️ Core principle — never relax the pairing algorithm

The flavor-map pairing/compatibility algorithm is the entire point of this app. **Never relax, weaken, sidestep, or bypass it** to make a feature work or feel richer. Every generated combination must stay mutually compatible per the flavor map (the `flavorMap` edges; `fitsPlaced` in `computeTasteLabCombo`).

- To add variety, change the **inputs** — bigger ingredient pools, more nodes, subcategory precision, richer pairing data — never the compatibility check.
- A `wild` slot is allowed: it drops a slot's taste/category filter but still enforces flavor-map pairing. That is not a relaxation.
- The pairing data/algorithm itself may be deliberately changed or improved when that is the explicit goal — but never avoided as a shortcut.

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
│   │   ├── IngredientDisplay.tsx   # Unified ingredient display (hero + compact, mobile swipe rows)
│   │   ├── IngredientDrawer.tsx    # Search/filter drawer (desktop 3-col, mobile bottom sheet)
│   │   ├── IngredientFiltersModal.tsx # Dietary/category include-exclude modal
│   │   ├── Sidebar.tsx             # Mode toggle, generation options, pairing sources, saved combos
│   │   ├── DietaryFilterPills.tsx  # Active dietary-filter chips
│   │   ├── RecipeFinderModal.tsx   # "Find recipes" modal (web + curated site search)
│   │   ├── TasteLabSplit.tsx       # Taste Lab split-slot view
│   │   ├── PresetGallery.tsx       # Flavor preset gallery
│   │   ├── OnboardingWizard.tsx    # First-run tour
│   │   ├── MobileBottomBar.tsx     # Mobile 5-button action bar
│   │   └── ui/                     # Shared design-system primitives
│   │       ├── Pill.tsx            # Toggle pill (neutral + data-driven accent)
│   │       ├── IconButton.tsx      # Icon-only button: 44px hit area + required aria-label
│   │       ├── Slider.tsx          # Taste range slider (accent thumb + value-fill track)
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
│   └── useCompatibility.ts
└── utils/
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
