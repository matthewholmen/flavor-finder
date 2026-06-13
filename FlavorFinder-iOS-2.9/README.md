# Flavor Finder iOS

A native iOS application for discovering compatible flavor pairings between ingredients. Built with SwiftUI and featuring intelligent menu planning with role-based dish generation.

## Overview

Flavor Finder helps users discover and create ingredient combinations using a database of ~16,000 flavor pairings and hundreds of ingredient profiles with taste analysis.

**Key Features:**
- 🔍 Smart ingredient search with filtering
- 🎲 Intelligent combination generation with backtracking algorithm
- 🎯 Role-based dish generation (entrees, sides, salads, desserts, etc.)
- 📊 7-dimension taste profile analysis
- 🍽️ Menu planning with compatibility modes (Freeform, Flexible, Strict)
- 💾 Save and manage favorite combinations
- 🔗 Link recipes to menu dishes
- 🌙 Dark mode support
- ♿️ Full accessibility support

## Requirements

- iOS 17.0 or later
- Xcode 15.0 or later (for development)

## Getting Started

### Opening the Project

```bash
cd FlavorFinder-iOS-1
open FlavorFinder.xcodeproj
```

Build and run on a physical device (recommended) or simulator.

### Testing

Run tests from Xcode or via command line:
```bash
xcodebuild -project FlavorFinder.xcodeproj -scheme FlavorFinder test
```

**Note:** The developer manually tests on a physical iPhone. Do not use xcodebuild for verification builds.

## Architecture

**Tech Stack:**
- SwiftUI for UI
- SwiftData for persistence
- MVVM architecture with service layer
- No external dependencies

**Key Components:**
- **Services**: FlavorPairingService, IngredientService, MenuGenerator, CompatibilityEngine, TasteAnalyzer
- **ViewModels**: IngredientSelectionVM, SearchVM, MenuPlannerVM, SavedCombinationsVM
- **Models**: TasteProfile, IngredientProfile, CulinaryRole, Category, Dish, Menu

See [CLAUDE.md](CLAUDE.md) for detailed technical documentation.

## Role-Based Dish Generation

The app uses a sophisticated role-based ingredient selection system to create realistic, balanced dishes:

**Culinary Roles:**
- main, aromatic, fat, acid, supporting, seasoning, liquid, sweetener

**Priority Levels:**
- required, preferred, optional

**Fallback Strategy (7-tier):**
1. Direct pairing with role matching
2. Bridge ingredients (e.g., Saffron → Lemon → Arugula)
3. Taste-based substitution
4. Role relaxation
5. Compatibility mode relaxation (future)
6. Minimum valid dish acceptance
7. Return nil (only when all fallbacks exhausted)

## Data Parity

The iOS app shares data format with the web version:
- `flavorPairings.json` matches web app's `src/data/flavorPairings.ts`
- `ingredientProfiles.json` matches web app's `src/data/ingredientProfiles.ts`

When updating ingredient data, ensure both platforms are updated to maintain consistency.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Comprehensive technical documentation and API reference
- **[docs/implementation/](docs/implementation/)** - Implementation details and planning documents
  - `IMPLEMENTATION_SUMMARY.md` - Role-based generation implementation summary
  - `ROLE_BASED_GENERATION_PLAN.md` - Original implementation plan
  - `DISH_TYPE_EDGE_CASES.md` - Edge cases and handling strategies

## License

Copyright © 2026 Flavor Finder. All rights reserved.
