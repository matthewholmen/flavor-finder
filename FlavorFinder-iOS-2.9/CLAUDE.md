# Flavor Finder iOS

A native iOS application for discovering compatible flavor pairings between ingredients. This is the iOS port of the React web application.

## Tech Stack

- **Framework**: SwiftUI
- **Data Persistence**: SwiftData
- **Minimum Target**: iOS 17.0
- **Architecture**: MVVM with Service layer

## Commands

```bash
# Open in Xcode (preferred - build and run manually on device)
open FlavorFinder.xcodeproj

# Run tests (command line)
xcodebuild -project FlavorFinder.xcodeproj -scheme FlavorFinder test
```

**Note**: Do not use xcodebuild for verification builds. The developer manually reloads and tests on a physical iPhone.

## Project Structure

```
FlavorFinder/
├── FlavorFinderApp.swift         # App entry point with AppState initialization
├── ContentView.swift             # Root content view
├── Models/
│   ├── TasteProfile.swift        # 7-dimension taste profile struct
│   ├── Category.swift            # Category/Subcategory enums, DishType, Season
│   ├── CulinaryRole.swift        # Culinary role enum for role-based generation
│   ├── IngredientProfile.swift   # Ingredient metadata model (with optional role & pantry data)
│   ├── PantryLevel.swift         # Pantry level enum (essential, expanded, expert)
│   ├── DietaryRestriction.swift  # Dietary restriction types and ingredient lists
│   ├── RecipeSite.swift          # Recipe website metadata for search filtering
│   ├── DrinkPairing.swift        # Drink pairing models (wine, beer, spirits)
│   ├── SavedCombination.swift    # SwiftData model for saved combinations
│   └── Dish.swift                # Menu planner dish model
├── Services/
│   ├── FlavorPairingService.swift    # Core pairing data and compatibility lookups
│   ├── IngredientService.swift       # Ingredient profile loading and lookups
│   ├── CompatibilityEngine.swift     # Combination generation with backtracking
│   ├── DietaryService.swift          # Dietary restriction filtering
│   ├── SearchService.swift           # Ingredient search and filtering
│   ├── TasteAnalyzer.swift           # Taste profile analysis
│   ├── DrinkPairingService.swift     # Drink pairing data and lookups
│   └── MenuGenerator.swift           # Menu planning with role-based generation
├── ViewModels/
│   ├── IngredientSelectionVM.swift   # Main ingredient selection state
│   ├── SearchVM.swift                # Search functionality
│   ├── TasteAnalysisVM.swift         # Taste analysis state
│   ├── MenuPlannerVM.swift           # Menu planning wizard state
│   └── SavedCombinationsVM.swift     # Saved combinations management
├── Views/
│   ├── Main/
│   │   ├── MainTabView.swift         # Tab-based navigation
│   │   ├── DiscoverView.swift        # Main discovery screen
│   │   ├── IngredientSlotView.swift  # Individual ingredient slot UI
│   │   └── ActionBar.swift           # Generate/action buttons
│   ├── Search/
│   │   ├── IngredientSearchView.swift # Ingredient search interface
│   │   └── FilterPanelView.swift      # Category/taste/dietary filters
│   ├── Analysis/
│   │   └── TasteAnalysisSheet.swift   # Taste profile analysis modal
│   ├── MenuPlanner/
│   │   ├── MenuPlannerView.swift      # Menu planning wizard
│   │   ├── MenuOverviewView.swift     # Generated menu display (includes IngredientPillWithX, RecipeURLInputSheet)
│   │   ├── DrinkPairingSection.swift  # Drink pairing UI component
│   │   ├── RecipeBrowserView.swift    # Recipe search browser
│   │   └── RecipePreviewCard.swift    # Recipe link preview with thumbnail
│   ├── Saved/
│   │   └── SavedListView.swift        # Saved combinations list
│   ├── Settings/
│   │   ├── SettingsView.swift              # App settings
│   │   ├── RecipeSitePreferencesView.swift # Recipe site filter preferences
│   │   └── PantryLevelSettingsView.swift   # Pantry level filter preferences
│   └── Shared/                         # Shared UI components
├── Utilities/
│   ├── Constants/
│   │   └── TasteConstants.swift       # Taste-related constants and colors
│   └── Extensions/
│       └── String+Normalize.swift     # String normalization helpers
├── Resources/
│   └── Data/
│       ├── flavorPairings.json        # Core ingredient pairing data
│       ├── ingredientProfiles.json    # Ingredient metadata
│       └── drinkPairings.json         # Drink pairing data (wine, beer, spirits)
└── Assets.xcassets/                   # App icons and colors
```

## Key Concepts

### AppState
Central app state container initialized in `FlavorFinderApp.swift`. Manages:
- All services (FlavorPairingService, IngredientService, DrinkPairingService, etc.)
- All ViewModels (IngredientSelectionVM, SearchVM, etc.)
- App settings via `@AppStorage`

Services and ViewModels are initialized asynchronously on app launch via `AppState.initialize()`. Data files are loaded in parallel for fast startup.

### Flavor Map
Bidirectional map of ingredient pairings loaded from `flavorPairings.json`. The `FlavorPairingService` provides lookup methods for compatible ingredients.

### Ingredient Selection
- Users can select 1-5 ingredients
- Ingredients can be locked to persist through regeneration
- `CompatibilityEngine` generates random compatible combinations using backtracking

### Compatibility Modes
Three modes in `CompatibilityEngine.Mode`:
- **perfect**: All ingredients must pair with ALL others
- **mixed**: Each ingredient must pair with AT LEAST ONE other
- **random**: No pairing requirements

### Categories
8 categories with subcategories and colors defined in `Category.swift`:
- **Proteins** (#FF2E2E Red): Meat, Pork, Poultry, Game, Offal, Fish, Crustacean, Mollusk, Plant Proteins
- **Vegetables** (#6CA03B Green): Allium, Leafy Greens, Roots, Squash, Brassicas, Mushrooms, Stalks, Fruit Vegetables
- **Fruits** (#FA6400 Orange): Citrus, Stone Fruit, Tropical, Berries, Pome Fruit, Melons
- **Dairy** (#5295CB Blue): Hard Cheese, Soft Cheese, Cultured Dairy, Milk & Cream
- **Seasonings** (#8A85D6 Purple): Herbs, Spices, Chilis
- **Pantry** (#FFBD17 Yellow/Gold): Oils & Fats, Vinegars, Stocks, Sauces, Sweeteners
- **Grains** (#FFBD17 Yellow/Gold): Rice, Pasta, Bread, Ancient Grains
- **Alcohol** (#FF577E Pink): Wine, Spirits, Liqueurs

### Taste Profile
7 taste dimensions (0-10 scale) in `TasteProfile`:
- **sweet, salty, sour, umami, fat, spicy**: Basic tastes
- **aromatic**: Fragrance intensity

### Dietary Restrictions
Defined in `DietaryRestriction` enum:
- **vegetarian**: Excludes Meat, Pork, Poultry, Game, Offal, Fish, Crustacean, Mollusk
- **pescatarian**: Excludes Meat, Pork, Poultry, Game, Offal (allows Fish, Crustacean, Mollusk)
- **vegan**: Excludes Meat, Pork, Poultry, Game, Offal, Fish, Crustacean, Mollusk, all Dairy
- **gluten-free**: Excludes Bread, Pasta
- **dairy-free**: Excludes all Dairy subcategories
- **alcohol-free**: Excludes Wine, Spirits, Liqueurs
- **nut-free**: Uses ingredient list in `DietaryIngredientLists.nutIngredients`
- **nightshade-free**: Uses ingredient list in `DietaryIngredientLists.nightshadeIngredients`
- **low-fodmap**: Uses ingredient list in `DietaryIngredientLists.highFodmapIngredients`

### SwiftData
Used for persisting saved combinations. Schema defined in `FlavorFinderApp.swift`:
- `SavedCombination` model for storing ingredient lists

**Note**: `SavedMenu` model has been updated to support multiple featured ingredients. The `keyIngredients` field is now an array `[String]` instead of a single `String`. Legacy saved menus with a single `keyIngredient` are automatically migrated to the new format.

### Menu Planner
The Menu tab is the default starting view. Features include:

#### Compatibility Modes
Three modes control how strictly dishes must pair with the featured ingredient (accessible via filter icon in top-left):
- **Freeform**: Maximum flexibility. Ingredients only need to pair within each dish. No featured ingredient required. Perfect for creative, experimental menus.
- **Flexible** (default): Balanced approach. Each dish's main ingredient must pair with the featured ingredient. Supporting ingredients only need to pair within their dish.
- **Strict**: Most restrictive. Every ingredient in every dish must pair with the featured ingredient. Ensures maximum flavor harmony across the entire menu.

#### Featured Ingredients (Multiple Support)
The app supports 1-3 featured ingredients that tie a menu together:
- **Single Ingredient**: Shows large display with category info and description
- **Multiple Ingredients**: Shows compact pill layout with individual X buttons
- **Adding Ingredients**:
  - Tap the featured ingredient area to select the first ingredient
  - Tap the plus (+) button to add more (up to 3 total)
  - New ingredients must pair with all existing featured ingredients
- **Removing Ingredients**: Each ingredient pill has an X button for individual removal
- **Display Adaptation**: Header text changes between "Featured Ingredient" (singular) and "Featured Ingredients" (plural)
- **In Freeform mode**: Featured ingredient card is disabled (grayed out) as it's not used
- **Menu Naming**: Menu names auto-update with ingredient names (e.g., "Lemon & Basil Menu")

#### Adding Dishes
Three methods for adding dishes to a menu:
- **Generate Dish** (sparkles icon): Automatically generates a random dish with compatible ingredient pairings
  - Freeform mode: Picks any random ingredient and generates pairings
  - Flexible/Strict modes: Generates dishes that pair with all featured ingredients
- **Build Dish** (plus icon): Opens ingredient picker to manually select a dish's main ingredient
  - Freeform mode: Shows all ingredients
  - Flexible/Strict modes: Filters to ingredients compatible with all featured ingredients
- **Add from Recipe URL** (link icon): Creates a dish from an existing recipe URL
  - Opens a modal to paste recipe URL and optionally add a title
  - Dish is created with empty ingredients list and recipe link
  - User can later edit the dish to add/generate ingredients
  - Useful for importing specific recipes you want to include in your menu

#### Pairing Strength Visualization
Ingredient pills display visual indicators showing pairing strength across all dishes:
- **Perfect Pairings** (orange star ⭐️ + orange background): Ingredients that pair with ALL other ingredients across ALL dishes in the menu
- **Strong Pairings** (orange background, no star): Ingredients that pair with 50% or more of other ingredients
- **Regular Ingredients** (gray background): Standard ingredients

The pairing analysis is calculated in real-time using:
- `Menu.perfectPairingIngredients(using:)`: Returns ingredients with 100% compatibility
- `Menu.strongPairingIngredients(using:)`: Returns ingredients with ≥50% compatibility (excluding perfect pairings)

#### Dish Management
- Tap dish name to edit
- Tap "Dish Type" badge to change type (Entree, Side, Salad, etc.)
- Tap any ingredient pill to open dish editor
- Tap "Delete" button to remove dish (with confirmation)
- Tap regenerate (🔄) to generate new ingredients for the dish
- Tap "Recipe" to search and link a recipe from the web
- In dish editor:
  - Tap "Add Ingredient" to manually add ingredients
  - Freeform mode: Shows all ingredients
  - Flexible mode: Shows ingredients that pair within the dish
  - Strict mode: Shows ingredients that pair with both the dish AND the menu's featured ingredient
  - Tap "Generate" to auto-fill compatible ingredients
  - Lock ingredients to persist them through regeneration

#### Recipe Links
Dishes can have linked recipes with preview cards showing:
- Recipe thumbnail image
- Recipe title
- Source website

Recipe data (URL, title, image URL) is persisted with saved menus via `SavedMenu`. The `RecipeThumbnail` component uses a custom image loader (not `AsyncImage`) to avoid SwiftUI's image caching issues that can cause stale failure states when views are rapidly recreated.

#### Recipe Site Filtering
Users can filter recipe search results to only show recipes from trusted, high-quality sources. Configured in Settings → Preferred Recipe Sites.

**Features:**
- **17 curated recipe sites**: 13 free sites + 4 paid/subscription sites
- **Visual indicators**: Credit card icon (💳) marks paid sites (NYT Cooking, Bon Appétit, America's Test Kitchen, Cook's Illustrated)
- **Quick actions**: "Select All", "Free Sites Only", "Deselect All" buttons
- **Boolean search syntax**: Uses Google's `(site:domain1.com OR site:domain2.com)` filter syntax
- **Persistent settings**: Stored via `@AppStorage` in `AppState.enabledRecipeSites`

**Included Sites:**
- Free: Serious Eats, AllRecipes, BBC Good Food, Food Network, Simply Recipes, Epicurious, The Kitchn, Budget Bytes, Minimalist Baker, Love and Lemons, Damn Delicious, Pinch of Yum, RecipeTin Eats
- Paid: NYT Cooking, Bon Appétit, America's Test Kitchen, Cook's Illustrated

**Default**: All free sites plus NYT Cooking and Bon Appétit are enabled by default.

**Implementation**: `RecipeBrowserView` reads enabled sites from `AppState` and builds a Google search URL with site filters in `buildSearchURL(for:)` method.

### Role-Based Dish Generation
The `MenuGenerator` service uses a role-based ingredient selection system to create more realistic, complete dishes.

#### Culinary Roles
13 roles defined in `CulinaryRole.swift`:

**Food Roles:**
- **main**: Primary ingredient (protein, starch, featured element)
- **aromatic**: Flavor base (allium, herbs, aromatics)
- **fat**: Richness (oils, butter, cream, cheese)
- **acid**: Brightness (citrus, vinegar, tomato)
- **supporting**: Additional elements (vegetables, garnishes)
- **seasoning**: Spices, herbs for finishing
- **liquid**: Stocks, wine (for sauces, braises)
- **sweetener**: Sugar, honey (for desserts, sauces)

**Beverage Roles:**
- **base**: Primary spirit/wine (vodka, gin, rum, whiskey)
- **modifier**: Liqueurs, vermouth, bitters
- **mixer**: Juice, soda, tonic
- **garnish**: Citrus, herbs, fruit garnishes (for beverages)
- **bitterSweet**: Simple syrup, honey, agave

#### Role Requirements
Each dish type has role requirements defined via `RoleRequirement` with priority levels (`DishPriority`):
- **required**: MUST have (generation fails if not found)
- **preferred**: Should have (tries hard to include)
- **optional**: Nice to have (includes if available)

Example dish formulas:
- **Entree**: main (required) + aromatic (preferred) + fat (preferred) + supporting (optional)
- **Salad**: supporting/leafy greens (required 1-2) + fat (preferred) + acid (preferred)
- **Dessert**: sweetener (required) + main/fruit (preferred) + fat (preferred) + aromatic (optional)

#### Role Inference
The `inferRoles(for:)` function dynamically assigns roles based on ingredient category/subcategory when explicit role data is unavailable:
- Proteins → main
- Allium vegetables → aromatic + supporting
- Leafy greens → supporting
- Citrus fruits → acid + supporting
- Oils & fats → fat
- Vinegars → acid
- Sweeteners → sweetener

Smart taste-based detection also applies (e.g., high-sour vegetables can fill acid role).

#### Fallback Strategy
7-tier fallback system ensures robust generation:
1. **Direct pairing**: Ingredients pair directly with menu key + fill required roles
2. **Bridge ingredients**: Find intermediate ingredients connecting menu key to required roles
3. **Taste-based substitution**: Use taste profiles to find functional equivalents (sour→acid, fat→fat, etc.)
4. **Role relaxation**: Skip preferred/optional roles if unavailable
5. **Compatibility mode relaxation**: (Future) Relax strict→flexible→freeform
6. **Minimum valid dish**: Accept dishes meeting minimum ingredient counts
7. **Return nil**: Only when all fallbacks exhausted

Enhanced salad generation guarantees leafy greens when possible, with bridge fallback for difficult pairings (e.g., Saffron → Lemon → Arugula).

### Drink Pairing System
The app includes a comprehensive drink pairing feature that suggests wines, beers, spirits, and non-alcoholic beverages to complement your menu. Located in `DrinkPairingService.swift` and displayed in the Menu Planner.

#### Data Structure
- **DrinkPairing** (`DrinkPairing.swift`): Individual drink with name and style (e.g., "Pinot Noir" with style "bold red")
- **DrinkPairings**: Container with separate arrays for wines, beers, spirits, and non-alcoholic beverages
- **DrinkPairingDatabase**: JSON structure loaded from `drinkPairings.json`

#### Pairing Data
`drinkPairings.json` contains curated Tier 2 drink pairings (v2.2):
- **266 ingredients** with drink pairings (46.6% coverage of app's 571 ingredients)
- **1,590 total pairings**:
  - 1,277 wines
  - 118 beers
  - 138 spirits (improved extraction with specific types like Bourbon, Vodka, Cognac)
  - 57 non-alcoholic beverages (tea, coffee, juice, sparkling water, etc.)
- **Tier 2 specificity**: Balanced varietals people can find at stores (e.g., "Sauvignon Blanc" not "Sancerre")
- **Extraction improvements (v2.2)**:
  - Fixed beer extraction: Handles "beer, STYLE" pattern (e.g., "beer, wheat" → Wheat Beer)
  - Fixed spirit extraction: Uses exact matching instead of substring (prevents "cognac" from matching "armagnac")
  - Fixed subsection detection: Doesn't skip emphasized drink names in all caps (e.g., "CHARDONNAY", "PINOT NOIR")
- **Source**: "What to Drink with What You Eat" by Andrew Dornenburg

#### Service Methods
`DrinkPairingService` provides several query methods:
- `getPairings(for:)`: Get all pairings for a single ingredient
- `getCommonPairings(for:)`: Aggregate pairings across multiple ingredients (menu-wide)
- `getPerfectPairings(for:threshold:)`: Find drinks that pair with X% of ingredients (default 80%)
- `searchDrinks(query:)`: Fuzzy search for drink names
- `filterByCategory(_:)`: Filter by wine/beer/spirits/non-alcoholic category

#### UI Display
The `DrinkPairingSection` component displays drink pairings in the Menu Planner:
- **Location**: Below the dishes list in `MenuOverviewView`
- **Menu-wide analysis**: Analyzes ALL ingredients across ALL dishes in the menu (not just the first dish)
- **Featured-based suggestions**: Shows drinks that pair with the menu's featured ingredient, ranked by how many dish ingredients they also pair with
- **Diversity prioritization**: Ensures a mix of wine, beer, AND spirit suggestions (not wine-heavy)
- **Generic filtering**: Filters out generic entries like "Beer (various)" or "Cocktail (mixed)" when specific types are available (e.g., "Porter", "Pale Ale", "Bourbon")
- **Top suggestion card**: Displays the best pairing with "Pairs with: [ingredient list]" showing which specific ingredients it complements
- **Additional suggestions**: Shows up to 4 more pairings with match counts in parentheses (e.g., "Porter (dark) (2)")

#### Non-Alcoholic Pairings
Non-alcoholic beverage pairings (tea, coffee, juice, sparkling water, etc.) are included in the database and can be toggled on/off:
- **Default**: OFF (to avoid clutter)
- **Setting**: "Show Non-Alcoholic Pairings" toggle in Settings → Drink Pairings
- **Coverage**: 57 non-alcoholic pairings across tea, coffee, juice, and other beverages

Each drink pill shows:
- Drink name (e.g., "Pinot Noir", "Porter", "Bourbon")
- Style descriptor (e.g., "bold red", "dark", "whiskey")
- Match count in parentheses showing how many ingredients it pairs with (e.g., "(3)")
- Star icon (⭐️) for the top overall pairing

**Display Logic:**
The UI intelligently diversifies suggestions:
1. **Top wine** is shown first (if available)
2. **Top beer** is shown second (if available)
3. **Top spirit** is shown third (if available)
4. Remaining drinks are sorted by match count
5. Generic entries ("Beer, various" or "Cocktail, mixed") are filtered out when specific types exist

#### Beverage-Specific Roles
5 additional culinary roles support beverage/cocktail dish generation:
- **base**: Primary spirit/wine (vodka, gin, rum, whiskey)
- **modifier**: Liqueurs, vermouth, bitters
- **mixer**: Juice, soda, tonic
- **garnish**: Citrus, herbs, fruit garnishes
- **bitterSweet**: Simple syrup, honey, agave

These roles are inferred automatically from ingredient categories and used by `MenuGenerator` when creating beverage-type dishes.

### Settings
App settings stored via `@AppStorage` in `AppState`:
- `compatibilityMode`: "perfect", "mixed", or "random"
- `includeExperimental`: Include experimental pairings
- `hapticFeedback`: Enable/disable haptics
- `showNonAlcoholicPairings`: Show/hide non-alcoholic beverage pairings (default: false)
- `pantryFilterMode`: Filter ingredients by pantry stocking level (default: "all")
- `theme`: "system", "light", or "dark"
- `enabledRecipeSites`: Set of recipe site IDs to filter recipe searches (stored as JSON-encoded Data)

### Pantry Level System
Filter ingredients by how commonly they're stocked in home kitchens. Based on NYT Cooking's pantry stocking guide.

#### Pantry Levels
Three levels defined in `PantryLevel.swift`:
- **Essential**: Basic staples most kitchens have (81 ingredients)
  - Examples: Olive oil, garlic, butter, honey, vanilla, black pepper, chicken, eggs
- **Expanded**: Common additions for more adventurous cooking (60 ingredients)
  - Examples: Tahini, coconut milk, fish sauce, smoked paprika, cardamom, feta
- **Expert**: Specialty items for advanced recipes (43 ingredients)
  - Examples: Miso, sumac, mirin, preserved lemon, pine nuts, shallots

#### Filter Modes
Four filter modes in `PantryFilterMode`:
- **All Ingredients**: Show all ingredients regardless of pantry level (default)
- **Essential Only**: Only basic staples most kitchens have
- **Essential + Expanded**: Common pantry items for home cooks
- **All Pantry Levels**: Include all categorized pantry items

#### Implementation
- `IngredientProfile.pantryLevel`: Optional property on ingredient profiles
- `FilterState.pantryFilter`: Applied during ingredient search
- `SearchService`: Filters by pantry level in `search()` and `getSuggestions()`
- `SearchVM.syncPantryFilter()`: Syncs global setting to search filter state
- Ingredients without a pantryLevel are always shown (394 uncategorized)

#### UI
- Settings → Ingredient Filtering → Pantry Level
- `PantryLevelSettingsView`: Selection UI with ingredient counts per level
- `PantryLevelBadge`: Small icon badge shown in search results (house/basket/star)
- Visual indicators: Green (essential), Blue (expanded), Orange (expert)

## Data Files

The iOS app uses JSON data files for ingredient and pairing information:
- `flavorPairings.json`: Core ingredient pairing data (matches web app `src/data/flavorPairings.ts`)
- `ingredientProfiles.json`: Ingredient metadata (matches web app `src/data/ingredientProfiles.ts`)
- `drinkPairings.json`: Drink pairing data (57 ingredients, 293 pairings)

**Note**: When updating ingredient or pairing data, ensure consistency between the iOS app and web app where applicable.

## UI Layout Conventions

### Full-Width Feed Layout (Menu Planner)

The Menu Planner uses a modern, feed-like layout with full-width cards and edge-to-edge images. **CRITICAL**: Follow these conventions to prevent margin/padding issues:

#### Layout Structure

**Container Hierarchy:**
```
ScrollView
└── VStack(spacing: 16)           // Main container
    ├── Featured Ingredient        // Full-width with internal padding
    ├── Dietary Pills              // Padded wrapper
    └── VStack(spacing: 0)         // Dishes container (NO spacing)
        ├── DishCardContent        // Full-width, internal padding
        ├── Divider                // 20px h-padding, 20px v-padding
        ├── DishCardContent        // Full-width, internal padding
        └── ...
```

#### Card Padding Rules

**DishCardContent Structure:**
```swift
VStack(spacing: 0) {
    // Recipe image (when present)
    RecipeHeroCard(...)
        .frame(maxWidth: .infinity)  // CRITICAL: Prevent overflow

    // OR top section (when no recipe)
    VStack {
        // Type badge + Recipe button
    }
    .padding(.horizontal, 20)
    .padding(.top, 20)

    // Bottom section (ALWAYS present)
    VStack {
        // Dish name
        // Ingredient pills with .padding(.horizontal, -2) for optical alignment
        // Action buttons
    }
    .padding(.horizontal, 20)
    .padding(.vertical, 20)
}
.frame(maxWidth: .infinity, alignment: .leading)  // CRITICAL: Constrain width
```

#### Critical Rules to Prevent Overflow

1. **Never remove `.frame(maxWidth: .infinity)` from card containers**
   - DishCardContent VStack: `.frame(maxWidth: .infinity, alignment: .leading)`
   - RecipeHeroCard: `.frame(maxWidth: .infinity)`
   - Removal causes layout expansion beyond safe bounds

2. **Hero images must use GeometryReader**
   ```swift
   GeometryReader { geometry in
       Image(...)
           .frame(width: geometry.size.width, height: 240)
   }
   .frame(height: 240)
   ```
   - Without explicit width constraint, `.aspectRatio(contentMode: .fill)` expands infinitely
   - Causes content to become too wide and blocks interaction with Featured Ingredient controls

3. **No container backgrounds or rounded corners**
   - Cards have NO `.background()` or `.clipShape()` modifiers
   - Clean white canvas with dividers between sections
   - Featured Ingredient section also has no background container

4. **Consistent horizontal padding: 20px**
   - All text content: `.padding(.horizontal, 20)`
   - Dividers: `.padding(.horizontal, 20)`
   - Featured Ingredient internal content: `.padding(20)` (all sides)

5. **Vertical spacing between dishes: Dividers**
   ```swift
   if index < dishes.count - 1 {
       Divider()
           .padding(.horizontal, 20)
           .padding(.vertical, 20)
   }
   ```
   - NO background containers
   - Dividers separate dishes instead of spacing between cards

6. **Optical alignment for pills**
   - Ingredient pills: `.padding(.horizontal, -2)`
   - Drink pills: `.padding(.horizontal, -4)`
   - Negative padding compensates for capsule internal padding
   - Aligns pill edges with headline text

#### Edge-to-Edge Images

Recipe hero images span the full width with square corners:
- Image height: 240px (increased from 200px for better visual impact)
- No rounded corners on images
- URL pill and remove button overlay on image
- Type badge/Recipe button below image with 20px horizontal padding, 16px top padding

#### Featured Ingredient Section

- Horizontal padding: 20px
- Top padding: 24px (H1-appropriate spacing)
- Label: Uppercase, tracking 0.5
- No background container or rounded border
- Internal padding: 20px all sides

#### Symptoms of Layout Issues

If you experience these problems, check for missing frame constraints:
- ✗ Text content becomes too wide after images load
- ✗ Featured Ingredient controls (search/regenerate/x) become unclickable
- ✗ Margins change when adding/removing recipes
- ✗ Content expands beyond screen edges

**Fix**: Ensure `.frame(maxWidth: .infinity)` is present on:
1. DishCardContent root VStack
2. RecipeHeroCard
3. GeometryReader-constrained images use explicit width

#### Why This Matters

SwiftUI's layout system can cause infinite expansion when:
- Images use `.aspectRatio(contentMode: .fill)` without explicit width
- Container views lack `maxWidth` constraints
- Content is nested deeply without proper bounds

The full-width layout requires explicit constraints at each level to prevent the layout engine from expanding content beyond the visible screen area.

## Recent Updates

### Multiple Featured Ingredients & Recipe URL Import (January 2026)

**Multiple Featured Ingredients (1-3 per menu):**
- `Menu.keyIngredients` changed from `String` to `[String]` array
- UI automatically adapts between single and multi-ingredient display
- Single ingredient: Large display with category and description
- Multiple ingredients: Compact pill layout with individual X buttons
- Plus (+) button to add additional featured ingredients
- New ingredients must pair with all existing featured ingredients
- Menu names auto-update (e.g., "Lemon & Basil Menu")

**Recipe URL Import:**
- New "Add from Recipe URL" button in menu builder
- `RecipeURLInputSheet` modal for URL and title input
- Creates dishes with recipe links and empty ingredient lists
- User can later edit dish to add/generate ingredients
- Useful for importing specific recipes into menus

**UI Components:**
- `IngredientPillWithX`: Reusable pill with X button for multi-ingredient removal
- `RecipeURLInputSheet`: Modal form for recipe URL input with validation

**Files Modified:**
- `Models/Dish.swift`: Menu model updated with `keyIngredients: [String]`
- `ViewModels/MenuPlannerVM.swift`: Added methods for managing multiple ingredients
- `Views/MenuPlanner/MenuOverviewView.swift`: Updated featured ingredient cards, added recipe URL import
