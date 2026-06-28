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
├── App.tsx                   # Main app with v1/v2 version switching
├── FlavorFinder.js           # Legacy v1 component
├── FlavorFinderV2.tsx        # Current main component (default)
├── types.ts                  # Shared TypeScript types
├── contexts/
│   └── ThemeContext.tsx      # Dark mode theme context
├── components/
│   ├── v2/                   # V2 UI components
│   │   ├── MinimalHeader.tsx
│   │   ├── IngredientDisplay.tsx   # Unified ingredient display (hero + compact)
│   │   ├── IngredientDrawer.tsx
│   │   ├── Sidebar.tsx             # Search/filter sidebar panel
│   │   ├── DietaryFilterPills.tsx
│   │   ├── RecipeFinderModal.tsx   # "Find recipes" modal (web + curated site search)
│   │   └── MobileBottomBar.tsx
│   ├── icons/
│   │   └── LockIcons.tsx           # Custom lock/unlock SVG icons
│   ├── mobile/               # Mobile-specific components
│   │   ├── MobileApp.tsx           # Main mobile app container
│   │   ├── MobileSearchScreen.tsx
│   │   ├── MobileDiscoverScreen.tsx
│   │   ├── MobileSettingsScreen.tsx
│   │   ├── SavedCombinationsScreen.tsx
│   │   └── BottomNavigation.tsx
│   ├── MenuPlanner/          # Menu planning wizard
│   │   ├── index.tsx               # Main MenuPlanner component
│   │   ├── WizardInterface.tsx     # Step-by-step wizard UI
│   │   ├── ProgressSteps.tsx
│   │   ├── ModeSelector.tsx
│   │   ├── KeyIngredientSelector.tsx
│   │   ├── DishConfigSelector.tsx
│   │   ├── DietaryRestrictions.tsx
│   │   ├── ReviewAndGenerate.tsx
│   │   ├── MenuOverview.tsx
│   │   ├── DishEditor.tsx
│   │   └── InteractiveBuilder.tsx
│   ├── filters/
│   │   └── UnifiedFilterPanel/     # Unified filter panel
│   │       ├── index.tsx
│   │       ├── FilterPanel.tsx
│   │       ├── FilterPanelTrigger.tsx
│   │       ├── CategorySection.tsx
│   │       ├── DietarySection.tsx
│   │       ├── TasteSection.tsx
│   │       └── types.ts
│   ├── Alert.tsx
│   ├── SearchBar.tsx
│   ├── SearchIngredientsButton.tsx
│   ├── IngredientSlot.tsx
│   ├── IngredientEditDialog.tsx
│   ├── SelectedIngredients.tsx
│   ├── SuggestedIngredients.tsx
│   ├── EnhancedTasteAnalysis.tsx
│   ├── TasteAnalysisModal.tsx
│   ├── CompactTasteSliders.tsx
│   ├── SortingFilter.tsx
│   ├── SettingsModal.tsx
│   ├── ShareButton.jsx
│   ├── Notification.jsx
│   ├── ModeToggle.jsx
│   ├── InfoTooltip.js
│   └── categoryFilter.tsx
├── data/
│   ├── flavorPairings.ts     # Core ingredient pairing data
│   ├── ingredientProfiles.ts # Ingredient metadata (category, taste profiles)
│   └── dietaryRestrictions.ts
├── hooks/
│   ├── useScreenSize.ts      # Responsive breakpoint hook
│   ├── useSavedCombinations.ts # Saved ingredient combinations
│   ├── useFavorites.tsx      # Favorite ingredients management
│   ├── useIngredientSelection.ts
│   ├── useFilters.ts
│   └── useCompatibility.ts
└── utils/
    ├── searchUtils.ts        # Ingredient filtering/search
    ├── categorySearch.ts     # Category-based search
    ├── compatibility.ts      # Pairing compatibility logic
    ├── colors.ts             # Color utilities (includes TASTE_COLORS)
    ├── ingredientColors.ts   # Ingredient-specific color utilities
    ├── sorting.ts            # Sorting utilities
    ├── tasteAnalysis.ts      # Taste profile analysis
    ├── tasteSuggestions.ts   # Taste-based suggestions
    ├── urlEncoding.js        # URL state encoding/decoding
    └── menuPlanner/          # Menu planning utilities
        ├── index.ts
        ├── tasteBalance.ts
        ├── dishSuggestion.ts
        └── menuGeneration.ts
```

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

## Version Switching

- Default: V2 (`FlavorFinderV2.tsx`)
- Access V1: Add `?v1=true` to URL
- Keyboard: `Ctrl+Shift+V` toggles versions
