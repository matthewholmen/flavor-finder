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
├── components/
│   └── v2/                   # V2 UI components
│       ├── MinimalHeader.jsx
│       ├── IngredientDisplay.jsx   # Unified ingredient display (hero + compact)
│       ├── IngredientDrawer.jsx
│       ├── Sidebar.jsx             # Search/filter sidebar panel
│       ├── DietaryFilterPills.jsx
│       ├── MobileBottomBar.jsx
│       ├── EmptySlotIndicator.jsx
│       ├── HeroIngredient.jsx      # Deprecated - use IngredientDisplay
│       ├── HeroIngredientDisplay.jsx # Deprecated - use IngredientDisplay
│       └── CompactIngredientDisplay.jsx # Deprecated - use IngredientDisplay
├── data/
│   ├── flavorPairings.ts     # Core ingredient pairing data
│   ├── experimentalPairings.ts
│   └── ingredientProfiles.ts # Ingredient metadata (category, taste profiles)
├── hooks/
│   ├── useScreenSize.ts      # Responsive breakpoint hook
│   └── useSavedCombinations.ts # Saved ingredient combinations
└── utils/
    ├── searchUtils.ts        # Ingredient filtering/search
    ├── search.ts             # Search utilities
    ├── categorySearch.ts     # Category-based search
    ├── compatibility.ts      # Pairing compatibility logic
    ├── colors.ts             # Color utilities (includes TASTE_COLORS)
    ├── sorting.ts            # Sorting utilities
    ├── tasteAnalysis.ts      # Taste profile analysis
    └── tasteSuggestions.ts   # Taste-based suggestions
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

## Version Switching

- Default: V2 (`FlavorFinderV2.jsx`)
- Access V1: Add `?v1=true` to URL
- Keyboard: `Ctrl+Shift+V` toggles versions
