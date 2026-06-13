# Drink Pairing Feature - Implementation Plan

## Executive Summary

This document outlines the implementation plan for adding a comprehensive drink pairing system to the Flavor Finder iOS app. The system will provide wine, beer, and spirit recommendations for ingredients and menus using a Tier 2 approach (balanced specificity).

**User Preferences:**
- Display location: Flexible (to be determined during implementation)
- Beverage dishes: Keep and enhance the existing `beverage` DishType
- Data scope: Start with ~100 most common ingredients (~600-800 pairings)

---

## Current System Analysis

### Existing Data Structure

**Ingredient Database:**
- 578 total ingredients in `ingredientProfiles.json`
- 2,094 food-food pairings in `flavorPairings.json` (includes some food-beverage pairings)
- Categories: Proteins, Vegetables, Fruits, Dairy, Seasonings, Pantry, Grains, Alcohol
- Alcohol category already exists with Wine, Spirits, Liqueurs subcategories

**Pairing System:**
- `FlavorPairingService`: Bidirectional graph of ingredient pairs
- Simple string format: `"ingredient1,ingredient2"`
- No distinction between food-food and food-beverage pairings
- Used throughout app for compatibility checking and suggestion generation

**Source Data:**
- `392944594-Andrew-Dornenburg-WhatToDrinkwitht-What-You-Eat.txt`
- ~19,472 lines of expert drink pairing recommendations
- Covers ~328 key ingredients/dishes
- Highly granular (specific wine varietals, beer styles, spirits)

---

## Proposed Solution: Tier 2 Drink Pairing System

### Three-Tier Approach (Implementing Tier 2)

**Tier 1: Category-Level** (Not implementing)
- Broad categories like "red wine (bold)", "beer (stout)"
- Too generic for our users

**Tier 2: Mid-Level Specificity** ✅ **RECOMMENDED & SELECTED**
- Specific varietals but practical (e.g., "Cabernet Sauvignon", "Pinot Noir", "IPA")
- 5-8 pairings per ingredient
- Balance between education and usability
- Wines most people can find at stores

**Tier 3: Full Granularity** (Not implementing)
- Ultra-specific (e.g., "Châteauneuf-du-Pape", "Amarone", "Sauternes")
- 10-20+ pairings per ingredient
- Too overwhelming for most users

### Tier 2 Simplification Rules

1. **Keep major varietals**: Cabernet Sauvignon, Pinot Noir, Chardonnay, Sauvignon Blanc, Merlot, etc.
2. **Consolidate similar wines**: "Syrah/Shiraz" → "Syrah"
3. **Drop ultra-specific**: "Vin Santo" → "Dessert wine" or skip
4. **Limit to 8 max per ingredient**: Most common/versatile options
5. **Add style markers**: "(dry)", "(sweet)", "(bold)", "(light)" for clarity
6. **Include beer styles**: IPA, Stout, Lager, Wheat beer, etc.
7. **Include spirits**: Bourbon, Whiskey, Gin, Vodka, Rum, Tequila

---

## Data Structure Design

### New JSON File: `drinkPairings.json`

```json
{
  "version": "1.0",
  "tier": 2,
  "updated": "2026-01-14",
  "pairings": {
    "beef": {
      "wines": [
        { "name": "Cabernet Sauvignon", "style": "bold red" },
        { "name": "Malbec", "style": "bold red" },
        { "name": "Syrah", "style": "bold red" },
        { "name": "Pinot Noir", "style": "medium red" },
        { "name": "Zinfandel", "style": "bold red" }
      ],
      "beers": [
        { "name": "Stout", "style": "dark" },
        { "name": "Porter", "style": "dark" }
      ],
      "spirits": [
        { "name": "Bourbon", "style": "whiskey" },
        { "name": "Whiskey", "style": "whiskey" }
      ]
    },
    "chicken": {
      "wines": [
        { "name": "Chardonnay", "style": "white" },
        { "name": "Sauvignon Blanc", "style": "crisp white" },
        { "name": "Pinot Grigio", "style": "light white" },
        { "name": "Pinot Noir", "style": "light red" }
      ],
      "beers": [
        { "name": "Wheat Beer", "style": "light" },
        { "name": "Lager", "style": "light" }
      ],
      "spirits": [
        { "name": "Gin", "style": "clear spirit" }
      ]
    }
  }
}
```

### Swift Model Structure

```swift
// Models/DrinkPairing.swift
struct DrinkPairing: Codable {
    let name: String
    let style: String  // "bold red", "crisp white", "light", "dark", etc.
}

struct DrinkPairings: Codable {
    let wines: [DrinkPairing]
    let beers: [DrinkPairing]
    let spirits: [DrinkPairing]

    var all: [DrinkPairing] {
        wines + beers + spirits
    }

    var count: Int {
        wines.count + beers.count + spirits.count
    }
}

struct DrinkPairingDatabase: Codable {
    let version: String
    let tier: Int
    let updated: String
    let pairings: [String: DrinkPairings]
}
```

---

## Service Layer Architecture

### New Service: `DrinkPairingService.swift`

```swift
@MainActor
class DrinkPairingService: ObservableObject {
    @Published private(set) var isLoaded = false
    @Published private(set) var pairingCount = 0

    private var drinkMap: [String: DrinkPairings] = [:]

    // Load from JSON
    func loadPairings() async throws

    // Query methods
    func getPairings(for ingredient: String) -> DrinkPairings?
    func getPairings(for ingredients: [String]) -> [String: DrinkPairings]

    // Aggregate pairings for multiple ingredients (e.g., a menu)
    func getCommonPairings(for ingredients: [String]) -> DrinkPairings

    // Search/filter
    func searchDrinks(query: String) -> [DrinkPairing]
    func filterByCategory(_ category: DrinkCategory) -> [DrinkPairing]
}

enum DrinkCategory: String, CaseIterable {
    case wines = "Wines"
    case beers = "Beers"
    case spirits = "Spirits"
}
```

---

## UI Implementation Strategy

### Option 1: Menu Planner Integration (PRIMARY)

**Location:** Add drink pairing section to `MenuOverviewView`

**Features:**
- Show drink pairings for the featured ingredient
- Aggregate pairings across all dishes in menu
- Highlight "perfect pairings" (drinks that pair with 80%+ of menu items)
- Display as scrollable horizontal pill chips below menu dishes

**UI Components:**
```
MenuOverviewView
├── Featured Ingredient Card
├── Dishes List
├── **NEW: Recommended Drinks Section**
│   ├── Section Header ("Drink Pairings")
│   ├── Horizontal ScrollView
│   │   ├── Wine Pills (orange/red color)
│   │   ├── Beer Pills (amber color)
│   │   └── Spirit Pills (gold color)
│   └── "View All" button
└── Recipe Links
```

**Interaction:**
- Tap drink pill → Show details modal with style info and all ingredients it pairs with
- Long press → Copy to clipboard for shopping list

### Option 2: Dedicated Drinks View (SECONDARY)

**Location:** New view accessible from:
- Menu Planner → "Drinks" button in header
- Discover tab → Future enhancement
- Settings → Drink preferences

**Features:**
- Search for drinks by name or style
- Filter by wine/beer/spirits
- Browse by ingredient pairing
- Save favorite drinks

### Option 3: Ingredient Detail Enhancement (FUTURE)

**Location:** When viewing ingredient details (future feature)

**Features:**
- Show all drink pairings for selected ingredient
- Compare pairings across multiple selected ingredients
- Educational content about why pairings work

---

## Beverage Dish Type Enhancement

### Current State
- `DishType.beverage` enum exists but minimally used
- No specific ingredient generation logic for beverages
- No UI support for adding/editing beverage dishes

### Proposed Enhancement

**1. Role-Based Beverage Generation**

Add beverage-specific roles to `CulinaryRole.swift`:
```swift
enum BeverageRole: String, Codable {
    case base          // Primary spirit/liquid (vodka, gin, rum, tequila)
    case modifier      // Liqueurs, vermouth, bitters
    case mixer         // Juice, soda, tonic
    case garnish       // Citrus, herbs, fruit
    case sweetener     // Simple syrup, honey, agave
}
```

**2. Beverage Dish Generation**

Extend `MenuGenerator` with beverage-specific logic:
```swift
// Generate cocktail with role-based selection
func generateBeverage(for featuredIngredient: String?,
                      mode: CompatibilityMode) -> Dish?
```

**Classic Cocktail Formulas:**
- **Highball**: base (2 oz) + mixer + garnish (e.g., Vodka Soda)
- **Sour**: base (2 oz) + citrus + sweetener (e.g., Whiskey Sour)
- **Martini**: base (2.5 oz) + modifier (0.5 oz) + garnish (e.g., Gin Martini)
- **Tropical**: base + fruit juice + sweetener + garnish (e.g., Mai Tai)

**3. Beverage UI in Menu Planner**

- Add "Add Beverage" button in dish list
- Show cocktail glass icon for beverage dishes
- Display ingredients in cocktail format (ratios/measurements)
- Link to cocktail recipes (similar to food recipe browser)

---

## Data Curation Plan

### Scope: ~100 Most Common Ingredients

**Priority Categories:**

**Tier 1: Core Proteins (20 ingredients)**
- Beef, Pork, Chicken, Turkey, Duck, Lamb, Venison
- Salmon, Tuna, Halibut, Cod, Shrimp, Lobster, Scallops
- Tofu, Tempeh

**Tier 2: Popular Vegetables (15 ingredients)**
- Tomato, Mushroom, Asparagus, Broccoli, Cauliflower
- Spinach, Kale, Arugula
- Onion, Garlic, Leek
- Carrot, Beet, Potato, Sweet Potato

**Tier 3: Common Fruits (10 ingredients)**
- Lemon, Lime, Orange, Grapefruit
- Apple, Pear, Peach, Strawberry, Blueberry, Raspberry

**Tier 4: Key Seasonings (15 ingredients)**
- Basil, Thyme, Rosemary, Parsley, Cilantro, Mint
- Black pepper, Chili pepper, Cumin, Coriander, Cinnamon, Ginger
- Garlic, Onion, Shallot

**Tier 5: Dairy & Cheese (10 ingredients)**
- Parmesan, Mozzarella, Cheddar, Goat cheese, Feta, Blue cheese
- Cream, Butter, Yogurt, Ricotta

**Tier 6: Popular Dishes (20 items)**
- Pasta, Pizza, Burger, Steak, Roast chicken
- Sushi, Tacos, Curry, Stir-fry, BBQ ribs
- Caesar salad, Caprese salad
- Chocolate dessert, Apple pie, Cheesecake

**Tier 7: Pantry Essentials (10 ingredients)**
- Olive oil, Butter, Soy sauce, Vinegar (balsamic, red wine)
- Tomato sauce, Pesto, Mustard

### Curation Process

**Phase 1: Extraction (4-6 hours)**
1. Parse source document (`392944594-Andrew-Dornenburg-WhatToDrinkwitht-What-You-Eat.txt`)
2. Extract all pairings for priority ingredients
3. Create spreadsheet with ingredient → drink mappings

**Phase 2: Simplification (3-4 hours)**
1. Apply Tier 2 simplification rules
2. Group similar wines (Syrah/Shiraz → Syrah)
3. Convert ultra-specific to generic when needed
4. Limit to 8 pairings per ingredient
5. Add style tags ("bold red", "crisp white", etc.)

**Phase 3: Validation (2-3 hours)**
1. Cross-reference with common wine pairing wisdom
2. Ensure consistency (if Beef pairs with Cab, Steak should too)
3. Add missing common pairings not in source
4. Verify beer and spirit recommendations

**Phase 4: JSON Creation (1-2 hours)**
1. Convert spreadsheet to JSON format
2. Validate JSON structure
3. Test loading in iOS app

**Total Estimated Time: 10-15 hours of manual curation**

---

## Implementation Phases

### Phase 1: Foundation (Data + Service Layer)

**Tasks:**
1. Create `drinkPairings.json` with ~100 ingredients
2. Implement `DrinkPairing` models
3. Implement `DrinkPairingService`
4. Add service to `AppState` initialization
5. Write unit tests for service

**Files Created/Modified:**
- `Resources/Data/drinkPairings.json` (NEW)
- `Models/DrinkPairing.swift` (NEW)
- `Services/DrinkPairingService.swift` (NEW)
- `FlavorFinderApp.swift` (MODIFIED - add service to AppState)

**Success Criteria:**
- ✅ 100 ingredients with curated drink pairings
- ✅ Service loads JSON successfully
- ✅ Query methods return correct pairings
- ✅ Unit tests pass

---

### Phase 2: Menu Planner Integration

**Tasks:**
1. Add drink pairing section to `MenuOverviewView`
2. Create drink pill UI components
3. Implement "common pairings" aggregation logic
4. Add drink detail modal
5. Update `MenuPlannerVM` to include drink data

**Files Created/Modified:**
- `Views/MenuPlanner/MenuOverviewView.swift` (MODIFIED)
- `Views/MenuPlanner/DrinkPairingSection.swift` (NEW)
- `Views/MenuPlanner/DrinkPillView.swift` (NEW)
- `Views/MenuPlanner/DrinkDetailSheet.swift` (NEW)
- `ViewModels/MenuPlannerVM.swift` (MODIFIED)

**UI Layout:**
```
┌─────────────────────────────────────┐
│ Menu Overview                       │
├─────────────────────────────────────┤
│ Featured Ingredient: [Beef]         │
├─────────────────────────────────────┤
│ Dishes                              │
│ • Beef Wellington                   │
│ • Roasted Carrots                   │
│ • Caesar Salad                      │
├─────────────────────────────────────┤
│ Drink Pairings  🍷                  │
│ ┌──────────────────────────────┐   │
│ │ [Cabernet] [Malbec] [Syrah]  │   │
│ │ [Pinot Noir] [Stout]         │   │
│ └──────────────────────────────┘   │
│ View All →                          │
└─────────────────────────────────────┘
```

**Success Criteria:**
- ✅ Drink section appears in menu overview
- ✅ Shows aggregated pairings for menu
- ✅ Tap drink pill → details modal
- ✅ Visually distinct from food ingredients

---

### Phase 3: Beverage Dish Type Enhancement

**Tasks:**
1. Add beverage-specific roles to ingredient profiles
2. Implement beverage generation in `MenuGenerator`
3. Add "Add Beverage" UI to menu planner
4. Create beverage-specific dish editor UI
5. Update role inference logic for beverage ingredients

**Files Created/Modified:**
- `Models/CulinaryRole.swift` (MODIFIED - add beverage roles)
- `Services/MenuGenerator.swift` (MODIFIED - add beverage generation)
- `Views/MenuPlanner/MenuOverviewView.swift` (MODIFIED - add beverage button)
- `Views/MenuPlanner/BeverageDishEditor.swift` (NEW)
- `Resources/Data/ingredientProfiles.json` (MODIFIED - add roles to alcohol ingredients)

**Beverage Generation Logic:**
```swift
// Example: Generate a cocktail with vodka as featured ingredient
func generateBeverage(for featuredIngredient: String?) -> Dish? {
    // 1. Select base spirit (vodka, gin, rum, etc.)
    let base = selectRole(.base, pairedWith: featuredIngredient)

    // 2. Select mixer (juice, tonic, soda)
    let mixer = selectRole(.mixer, pairedWith: [base, featuredIngredient])

    // 3. Optional: modifier (liqueur, vermouth)
    let modifier = selectRole(.modifier, pairedWith: [base, mixer], optional: true)

    // 4. Garnish (citrus, herbs)
    let garnish = selectRole(.garnish, pairedWith: [base, mixer])

    return Dish(
        type: .beverage,
        ingredients: [base, mixer, modifier, garnish].compactMap { $0 }
    )
}
```

**Success Criteria:**
- ✅ Generate button creates valid cocktails
- ✅ Beverages respect featured ingredient pairing
- ✅ UI shows cocktail-specific formatting
- ✅ Can manually build custom cocktails

---

### Phase 4: Dedicated Drinks View (Optional/Future)

**Tasks:**
1. Create standalone drinks browser view
2. Add search/filter UI for drinks
3. Implement ingredient-based drink search
4. Add drink favorites/saved drinks
5. Link from menu planner

**Files Created/Modified:**
- `Views/Drinks/DrinksView.swift` (NEW)
- `Views/Drinks/DrinkSearchView.swift` (NEW)
- `Views/Drinks/DrinkCategoryFilter.swift` (NEW)
- `ViewModels/DrinksVM.swift` (NEW)

**Success Criteria:**
- ✅ Browse all drinks by category
- ✅ Search drinks by name
- ✅ Filter by wine/beer/spirits
- ✅ View ingredient-based pairings

---

## Testing Strategy

### Unit Tests

**DrinkPairingService Tests:**
```swift
func testLoadPairings() async throws
func testGetPairings_ValidIngredient()
func testGetPairings_InvalidIngredient()
func testGetCommonPairings_MultipleIngredients()
func testSearchDrinks()
```

**DrinkPairing Model Tests:**
```swift
func testDecodingFromJSON()
func testAllDrinks_CombinesCategories()
func testCount_ReturnsCorrectTotal()
```

### Integration Tests

**Menu Planner Integration:**
```swift
func testDrinkPairings_DisplayInMenuOverview()
func testDrinkPairings_AggregateAcrossMenu()
func testDrinkPairings_UpdateOnMenuChange()
```

**Beverage Generation:**
```swift
func testGenerateBeverage_CreatesValidCocktail()
func testGenerateBeverage_RespectsCompatibilityMode()
func testGenerateBeverage_IncludesBaseAndMixer()
```

### Manual Testing Checklist

- [ ] Load drink pairings on app launch
- [ ] View drink pairings for beef-based menu
- [ ] Tap drink pill to see details
- [ ] Generate random menu with featured ingredient
- [ ] Verify drink pairings update correctly
- [ ] Add beverage dish to menu
- [ ] Generate random cocktail
- [ ] Edit cocktail ingredients manually
- [ ] Save and load menu with drinks
- [ ] Performance: Ensure no lag when showing drinks

---

## Data Migration & Compatibility

### Backward Compatibility

**Existing Data:**
- ✅ `flavorPairings.json` remains unchanged (keeps food-beverage pairings like "whiskey,beef")
- ✅ No breaking changes to existing models
- ✅ App functions normally if `drinkPairings.json` is missing (graceful degradation)

**New Data:**
- `drinkPairings.json` is additive, not replacing
- Food-beverage pairings in `flavorPairings.json` still used for ingredient generation
- Drink pairings are for recommendations/suggestions only

### Versioning Strategy

**JSON Versioning:**
```json
{
  "version": "1.0",
  "tier": 2,
  "updated": "2026-01-14"
}
```

**Future Extensions:**
- v1.1: Add wine regions/producers
- v1.2: Add tasting notes
- v1.3: Add price range indicators
- v2.0: Upgrade to Tier 3 (full granularity)

---

## Performance Considerations

### Loading Strategy

**Lazy Loading:**
- Load `drinkPairings.json` asynchronously on app launch
- Don't block main app functionality
- Show loading indicator in drink section if not loaded yet

**Memory Management:**
- ~100 ingredients × 6 drinks avg × 50 bytes = ~30KB
- Negligible memory footprint
- Keep full database in memory (no paging needed)

**Caching:**
- Cache aggregated menu pairings in `MenuPlannerVM`
- Invalidate cache when menu changes
- Use `@Published` to auto-update UI

### Search Optimization

**Indexing:**
- Pre-build search index of drink names on load
- Normalize strings (lowercase, trim whitespace)
- Use trie or prefix tree for fast autocomplete

---

## Future Enhancements

### Phase 5: Advanced Features (Post-Launch)

**1. Pairing Explanations**
- Add "Why this pairs well" descriptions
- Educational content about wine pairing principles
- Link to articles/resources

**2. Regional Preferences**
- Filter drinks by availability (US, EU, etc.)
- Show local alternatives
- Price range filtering

**3. User Preferences**
- Save favorite drinks
- Block disliked drinks
- Set dietary restrictions (no alcohol, vegan wines)

**4. Social Features**
- Share menu with drink pairings
- Rate pairings
- Community suggestions

**5. Advanced Search**
- "Find dishes for this wine"
- "What wine goes with chicken AND mushrooms?"
- Taste profile-based recommendations

**6. Recipe Integration**
- Link to cocktail recipes
- Show ingredient measurements
- Step-by-step mixing instructions

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data curation takes longer than estimated | Medium | High | Start with 50 ingredients, expand iteratively |
| JSON file too large (app bloat) | Low | Low | 30KB is negligible; compress if needed |
| Pairing quality concerns | High | Medium | Cross-reference multiple sources, expert review |
| UI clutters menu view | Medium | Medium | Collapsible section, "View More" link |

### User Experience Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Users don't discover feature | Medium | Medium | Prominent placement in menu planner |
| Too many drink options overwhelming | Medium | Low | Limit to 8 per ingredient, show top 3-5 initially |
| Drinks don't match user's taste | High | Medium | Add filtering, user feedback mechanism |
| Non-drinkers feel excluded | Low | Low | Include non-alcoholic options (tea, juice, etc.) |

---

## Success Metrics

### Quantitative KPIs
- **Adoption Rate**: % of menus viewed with drink section expanded
- **Engagement**: Avg. number of drink pills tapped per session
- **Beverage Dishes**: % of menus including beverage dish type
- **Data Coverage**: % of menus with at least 1 drink pairing available

### Qualitative Goals
- ✅ Users discover new wine pairings they enjoy
- ✅ Feature feels educational, not prescriptive
- ✅ Drink suggestions enhance menu planning experience
- ✅ Beverage generation creates realistic cocktails

---

## Appendix A: Tier 2 Wine List (Reference)

### Red Wines (Common Varietals)
- Cabernet Sauvignon
- Pinot Noir
- Merlot
- Syrah / Shiraz
- Malbec
- Zinfandel
- Tempranillo
- Sangiovese
- Grenache
- Nebbiolo

### White Wines
- Chardonnay
- Sauvignon Blanc
- Pinot Grigio / Pinot Gris
- Riesling
- Gewürztraminer
- Viognier
- Chenin Blanc
- Albariño

### Sparkling
- Champagne
- Prosecco
- Cava
- Sparkling Rosé

### Dessert Wines
- Port
- Sherry
- Ice Wine
- Late Harvest Riesling

### Beer Styles
- IPA (India Pale Ale)
- Stout
- Porter
- Lager
- Pilsner
- Wheat Beer
- Amber Ale
- Belgian Ale

### Spirits
- Whiskey / Bourbon
- Gin
- Vodka
- Rum
- Tequila
- Brandy / Cognac

---

## Appendix B: Sample Pairings (Tier 2)

### Beef
**Wines:** Cabernet Sauvignon, Malbec, Syrah, Pinot Noir, Zinfandel
**Beers:** Stout, Porter
**Spirits:** Bourbon, Whiskey

### Chicken
**Wines:** Chardonnay, Sauvignon Blanc, Pinot Grigio, Pinot Noir
**Beers:** Wheat Beer, Lager
**Spirits:** Gin

### Salmon
**Wines:** Pinot Noir, Chardonnay, Sauvignon Blanc, Rosé
**Beers:** Pilsner, Wheat Beer
**Spirits:** Vodka, Gin

### Mushrooms
**Wines:** Pinot Noir, Chardonnay, Burgundy
**Beers:** Porter, Amber Ale
**Spirits:** Sherry, Brandy

### Chocolate
**Wines:** Port, Zinfandel, Cabernet Sauvignon
**Beers:** Stout, Porter
**Spirits:** Rum, Brandy

---

## Appendix C: File Structure Summary

```
FlavorFinder/
├── Resources/
│   └── Data/
│       ├── flavorPairings.json (UNCHANGED)
│       ├── ingredientProfiles.json (MODIFIED - add beverage roles)
│       └── drinkPairings.json (NEW)
├── Models/
│   ├── DrinkPairing.swift (NEW)
│   └── CulinaryRole.swift (MODIFIED - add beverage roles)
├── Services/
│   ├── DrinkPairingService.swift (NEW)
│   └── MenuGenerator.swift (MODIFIED - add beverage generation)
├── ViewModels/
│   ├── MenuPlannerVM.swift (MODIFIED)
│   └── DrinksVM.swift (NEW - optional)
├── Views/
│   ├── MenuPlanner/
│   │   ├── MenuOverviewView.swift (MODIFIED)
│   │   ├── DrinkPairingSection.swift (NEW)
│   │   ├── DrinkPillView.swift (NEW)
│   │   ├── DrinkDetailSheet.swift (NEW)
│   │   └── BeverageDishEditor.swift (NEW)
│   └── Drinks/ (optional)
│       ├── DrinksView.swift (NEW)
│       ├── DrinkSearchView.swift (NEW)
│       └── DrinkCategoryFilter.swift (NEW)
└── FlavorFinderApp.swift (MODIFIED - add DrinkPairingService to AppState)
```

---

## Appendix D: JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Drink Pairing Database",
  "type": "object",
  "required": ["version", "tier", "updated", "pairings"],
  "properties": {
    "version": {
      "type": "string",
      "description": "Semantic version of the data format"
    },
    "tier": {
      "type": "integer",
      "description": "Tier level (1=broad, 2=mid, 3=granular)"
    },
    "updated": {
      "type": "string",
      "format": "date",
      "description": "Last update date (YYYY-MM-DD)"
    },
    "pairings": {
      "type": "object",
      "description": "Map of ingredient name to drink pairings",
      "patternProperties": {
        "^[a-z\\s]+$": {
          "type": "object",
          "properties": {
            "wines": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["name", "style"],
                "properties": {
                  "name": { "type": "string" },
                  "style": { "type": "string" }
                }
              }
            },
            "beers": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["name", "style"],
                "properties": {
                  "name": { "type": "string" },
                  "style": { "type": "string" }
                }
              }
            },
            "spirits": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["name", "style"],
                "properties": {
                  "name": { "type": "string" },
                  "style": { "type": "string" }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Data Curation** | Tier 2 simplification (100 ingredients) | 10-15 hours |
| **Phase 1: Foundation** | Models, Service, Tests | 8-12 hours |
| **Phase 2: Menu Integration** | UI components, ViewModel updates | 12-16 hours |
| **Phase 3: Beverage Dishes** | Generation logic, UI, roles | 10-14 hours |
| **Phase 4: Drinks View** | Standalone browser (optional) | 8-12 hours |
| **Testing & Polish** | Integration tests, bug fixes, refinement | 6-10 hours |
| **TOTAL** | | **54-79 hours** |

**Note:** Data curation can be done incrementally. Start with 50 ingredients (5-8 hours) to unblock development.

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding drink pairing functionality to Flavor Finder iOS. The Tier 2 approach balances specificity with usability, making wine recommendations accessible without overwhelming users.

**Key Strengths:**
- ✅ Non-breaking: Preserves existing pairing data and functionality
- ✅ Scalable: Easy to expand from 100 to 578 ingredients over time
- ✅ Educational: Helps users learn about wine pairing principles
- ✅ Flexible: Multiple display options (menu planner, dedicated view)
- ✅ Extensible: Clear path for future enhancements (Tier 3, user prefs, etc.)

**Next Steps:**
1. Review and approve plan
2. Begin data curation with priority ingredients
3. Implement Phase 1 (Foundation)
4. Iterate based on user feedback

---

**Document Version:** 1.0
**Created:** 2026-01-14
**Author:** Claude (Flavor Finder Development Team)
