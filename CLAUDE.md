# Flavor Finder

A React application for discovering compatible flavor pairings between ingredients.

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
├── App.js                    # Main app with v1/v2 version switching
├── FlavorFinder.js           # Legacy v1 component
├── FlavorFinderV2.jsx        # Current main component (default)
├── types.ts                  # Shared TypeScript types
├── contexts/
│   └── ThemeContext.jsx      # Dark mode theme context
├── components/
│   ├── v2/                   # V2 UI components
│   │   ├── MinimalHeader.jsx
│   │   ├── IngredientDisplay.jsx   # Unified ingredient display (hero + compact)
│   │   ├── IngredientDrawer.jsx
│   │   ├── Sidebar.jsx             # Search/filter sidebar panel
│   │   ├── DietaryFilterPills.jsx
│   │   ├── MobileBottomBar.jsx
│   │   ├── EmptySlotIndicator.jsx
│   │   ├── HeroIngredient.jsx      # Deprecated - use IngredientDisplay
│   │   ├── HeroIngredientDisplay.jsx # Deprecated - use IngredientDisplay
│   │   └── CompactIngredientDisplay.jsx # Deprecated - use IngredientDisplay
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
│   ├── SearchBar.tsx
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
│   └── categoryFilter.tsx
├── data/
│   ├── flavorPairings.ts     # Core ingredient pairing data
│   ├── experimentalPairings.ts
│   └── ingredientProfiles.ts # Ingredient metadata (category, taste profiles)
├── hooks/
│   ├── useScreenSize.ts      # Responsive breakpoint hook
│   ├── useSavedCombinations.ts # Saved ingredient combinations
│   └── useFavorites.tsx      # Favorite ingredients management
└── utils/
    ├── searchUtils.ts        # Ingredient filtering/search
    ├── search.ts             # Search utilities
    ├── categorySearch.ts     # Category-based search
    ├── compatibility.ts      # Pairing compatibility logic
    ├── colors.ts             # Color utilities (includes TASTE_COLORS)
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
- Custom `FilledLock` and `CustomUnlock` SVG icons for lock state visualization
- Desktop: hover reveals remove (X) and lock toggle controls inline
- Mobile: tap to focus ingredient, floating action buttons appear for remove/lock

### Filtering
- **Category/Subcategory**: Filter by ingredient type (proteins, vegetables, etc.)
- **Taste Profile**: Filter by flavor attributes (sweet, salty, umami, etc.)
- **Dietary Restrictions**: Exclude ingredient categories

### Theme Support
Dark mode is supported via `ThemeContext.jsx`. Toggle available in settings.

## Version Switching

- Default: V2 (`FlavorFinderV2.jsx`)
- Access V1: Add `?v1=true` to URL
- Keyboard: `Ctrl+Shift+V` toggles versions
