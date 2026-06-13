# Role-Based Dish Generation Implementation Plan

## Overview
Enhance dish generation to use culinary role-based ingredient selection with smart fallbacks. This will produce more realistic, complete dishes while maintaining flexibility when pairing options are limited.

## Current State Analysis

### Existing System
- **Formula-based**: Each dish type has category/subcategory constraints
- **Backtracking algorithm**: Finds compatible ingredients iteratively
- **Taste targeting**: Balances flavors across menu
- **Category diversity**: None (can generate all-vegetable or all-protein dishes)
- **Ingredient roles**: Not modeled

### Current Formulas (MenuGenerator.swift:52-82)
```swift
.entree: keyCategories=[.proteins], supportingCount=2
.side: keyCategories=[.proteins,.vegetables,.grains], specific subcats, supportingCount=2
.salad: keyCategories=[.vegetables], supportingCount=1, requiresTwoKey=true
.dessert: keyCategories=[.fruits], supportingCount=2, tasteFallback=.sweet, excludes proteins/veggies
.beverage: keyCategories=[.alcohol], supportingCount=2, excludes proteins/veggies
.sauce: keyCategories=[.pantry,.dairy,.seasonings], supportingCount=2
```

## Proposed Solution

### 1. Define Culinary Roles

Create a new enum to represent ingredient functions in a dish:

```swift
enum CulinaryRole: String, Codable {
    case main           // Primary ingredient (protein, starch, featured element)
    case aromatic       // Flavor base (allium, herbs, aromatics)
    case fat            // Richness (oils, butter, cream, cheese)
    case acid           // Brightness (citrus, vinegar, tomato)
    case supporting     // Additional elements (vegetables, garnishes)
    case seasoning      // Spices, herbs for finishing
    case liquid         // Stocks, wine (for sauces, braises)
    case sweetener      // Sugar, honey (for desserts, sauces)
}
```

### 2. Add Role Metadata to IngredientProfile

Extend the existing `IngredientProfile` struct:

```swift
// In IngredientProfile.swift (lines 14-22)
var primaryRoles: [CulinaryRole]?     // What roles this ingredient can fill
var secondaryRoles: [CulinaryRole]?   // Additional roles (less ideal but valid)
```

**No JSON migration needed initially** - these properties are optional. We can add role data gradually to `ingredientProfiles.json` or compute roles dynamically from existing category/subcategory data.

### 3. Role Inference from Existing Data

Create a utility to infer roles from category/subcategory (temporary solution until we add role data to JSON):

```swift
// In MenuGenerator.swift or new RoleInference.swift

func inferRoles(for profile: IngredientProfile) -> [CulinaryRole] {
    var roles: [CulinaryRole] = []

    switch (profile.category, profile.subcategory) {
    case ("Proteins", _):
        roles.append(.main)
    case ("Vegetables", "Allium"):
        roles.append(.aromatic)
        roles.append(.supporting)
    case ("Vegetables", "Leafy Greens"):
        roles.append(.supporting)
    case ("Vegetables", _):
        roles.append(.supporting)
        if profile.flavorProfile.sour > 4 { roles.append(.acid) }
    case ("Fruits", "Citrus"):
        roles.append(.acid)
        roles.append(.supporting)
    case ("Fruits", _):
        roles.append(.supporting)
        if profile.flavorProfile.sweet > 6 { roles.append(.sweetener) }
    case ("Dairy", "Cheese"), ("Dairy", "Milk & Cream"):
        roles.append(.fat)
        roles.append(.supporting)
    case ("Seasonings", "Herbs"):
        roles.append(.aromatic)
        roles.append(.seasoning)
    case ("Seasonings", "Spices"):
        roles.append(.seasoning)
    case ("Pantry", "Oils & Fats"):
        roles.append(.fat)
    case ("Pantry", "Vinegars"):
        roles.append(.acid)
    case ("Pantry", "Stocks"):
        roles.append(.liquid)
    case ("Pantry", "Sweeteners"):
        roles.append(.sweetener)
    case ("Grains", _):
        roles.append(.main)
        roles.append(.supporting)
    default:
        roles.append(.supporting)
    }

    return roles
}
```

### 4. Enhanced DishFormula with Role Requirements

Extend `DishFormula` to specify desired roles:

```swift
struct DishFormula {
    // Existing properties...
    let keyCategories: [Category]
    let keySubcategories: [String]?
    let supportingCount: Int
    let requiresTwoKey: Bool
    let tasteFallback: TasteDimension?
    let excludedSupportingCategories: [Category]

    // NEW: Role-based requirements
    let roleRequirements: [RoleRequirement]?

    struct RoleRequirement {
        let role: CulinaryRole
        let priority: Priority       // How important is this role?
        let count: Int                // How many ingredients with this role?

        enum Priority {
            case required             // MUST have (fail if not found)
            case preferred            // Should have (try hard to include)
            case optional             // Nice to have (include if available)
        }
    }
}
```

### 5. Updated Dish Formulas with Roles

#### Salad (Enhanced - Your Request)
```swift
.salad: DishFormula(
    keyCategories: [.vegetables],
    supportingCount: 2,  // Total 4 ingredients: 2 greens + 2 supporting
    requiresTwoKey: true,
    roleRequirements: [
        RoleRequirement(role: .supporting, priority: .required, count: 2),  // 2 leafy greens
        RoleRequirement(role: .fat, priority: .preferred, count: 1),         // oil/cheese
        RoleRequirement(role: .acid, priority: .preferred, count: 1)         // vinegar/citrus
    ]
)
```

**Salad Generation Logic:**
1. **Find first leafy green** that pairs with menu key ingredient
2. **Find second leafy green** that pairs with first green (and menu key in strict mode)
3. **If no second green found**: Find an ingredient that pairs with featured ingredient AND ALSO pairs with a leafy green
4. **Add supporting roles**: fat (oil/cheese), acid (vinegar/citrus)

#### Entree (Enhanced)
```swift
.entree: DishFormula(
    keyCategories: [.proteins],
    supportingCount: 3,
    roleRequirements: [
        RoleRequirement(role: .main, priority: .required, count: 1),      // protein
        RoleRequirement(role: .aromatic, priority: .preferred, count: 1),  // garlic/onion/herbs
        RoleRequirement(role: .fat, priority: .preferred, count: 1),       // oil/butter
        RoleRequirement(role: .supporting, priority: .optional, count: 1)  // vegetables
    ]
)
```

#### Side (Enhanced)
```swift
.side: DishFormula(
    keyCategories: [.proteins, .vegetables, .grains],
    keySubcategories: ["Plant Proteins", "Allium", "Leafy Greens", "Roots",
                       "Squash", "Brassicas", "Mushrooms", "Stalks",
                       "Fruit Vegetables", "Rice", "Pasta", "Bread", "Ancient Grains"],
    supportingCount: 2,
    roleRequirements: [
        RoleRequirement(role: .main, priority: .required, count: 1),       // grain/veg
        RoleRequirement(role: .aromatic, priority: .preferred, count: 1),  // garlic/herbs
        RoleRequirement(role: .fat, priority: .optional, count: 1)         // oil/butter
    ]
)
```

#### Dessert (Enhanced)
```swift
.dessert: DishFormula(
    keyCategories: [.fruits],
    supportingCount: 3,
    tasteFallback: .sweet,
    excludedSupportingCategories: [.proteins, .vegetables],
    roleRequirements: [
        RoleRequirement(role: .main, priority: .required, count: 1),       // fruit
        RoleRequirement(role: .sweetener, priority: .preferred, count: 1), // sugar/honey
        RoleRequirement(role: .fat, priority: .preferred, count: 1),       // cream/butter
        RoleRequirement(role: .aromatic, priority: .optional, count: 1)    // vanilla/spices
    ]
)
```

#### Sauce (Enhanced)
```swift
.sauce: DishFormula(
    keyCategories: [.pantry, .dairy, .seasonings],
    supportingCount: 3,
    roleRequirements: [
        RoleRequirement(role: .fat, priority: .preferred, count: 1),       // oil/butter
        RoleRequirement(role: .aromatic, priority: .preferred, count: 1),  // garlic/herbs
        RoleRequirement(role: .acid, priority: .optional, count: 1),       // vinegar/citrus
        RoleRequirement(role: .liquid, priority: .optional, count: 1)      // stock/wine
    ]
)
```

#### Beverage (No Changes - Already Simple)
```swift
.beverage: DishFormula(
    keyCategories: [.alcohol],
    supportingCount: 2,
    excludedSupportingCategories: [.proteins, .vegetables]
)
```

### 6. Role-Based Selection Algorithm with Fallbacks

New method in `MenuGenerator.swift`:

```swift
@MainActor
private func selectIngredientsWithRoles(
    featuredIngredient: String,
    menuKeyIngredient: String,
    formula: DishFormula,
    restrictions: Set<DietaryRestriction>,
    compatibilityMode: MenuConfiguration.MenuCompatibilityMode
) -> [String]? {
    var selection = [featuredIngredient]
    var filledRoles: [CulinaryRole: Int] = [:]

    guard let requirements = formula.roleRequirements else {
        // No role requirements - use existing backtracking
        return generateWithBacktracking(...)
    }

    // Sort requirements by priority: required > preferred > optional
    let sortedRequirements = requirements.sorted { req1, req2 in
        priorityValue(req1.priority) > priorityValue(req2.priority)
    }

    for requirement in sortedRequirements {
        let needed = requirement.count - (filledRoles[requirement.role] ?? 0)
        guard needed > 0 else { continue }

        // Try to fill this role
        let candidates = findCandidatesForRole(
            role: requirement.role,
            currentSelection: selection,
            menuKeyIngredient: menuKeyIngredient,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode,
            excludedCategories: formula.excludedSupportingCategories
        )

        if candidates.isEmpty {
            if requirement.priority == .required {
                // REQUIRED role not filled - try fallback strategies
                if !tryFallbackStrategies(for: requirement, selection: &selection) {
                    return nil  // Failed to satisfy required role
                }
            }
            // For preferred/optional, just continue
            continue
        }

        // Pick random candidates to fill the role
        let toAdd = min(needed, candidates.count)
        let selected = candidates.shuffled().prefix(toAdd)
        selection.append(contentsOf: selected)
        filledRoles[requirement.role, default: 0] += toAdd
    }

    // If we still need more ingredients, fill with generic supporting ingredients
    while selection.count < (1 + formula.supportingCount) {
        let compatiblePool = getCompatiblePool(
            currentSelection: selection,
            menuKeyIngredient: menuKeyIngredient,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode,
            excludedCategories: formula.excludedSupportingCategories
        )

        guard let picked = compatiblePool.randomElement() else {
            break
        }
        selection.append(picked)
    }

    return selection.count >= (1 + formula.supportingCount) ? selection : nil
}

private func findCandidatesForRole(
    role: CulinaryRole,
    currentSelection: [String],
    menuKeyIngredient: String,
    restrictions: Set<DietaryRestriction>,
    compatibilityMode: MenuConfiguration.MenuCompatibilityMode,
    excludedCategories: [Category]
) -> [String] {
    // Get compatible pool
    var pool = getCompatiblePool(
        currentSelection: currentSelection,
        menuKeyIngredient: menuKeyIngredient,
        restrictions: restrictions,
        compatibilityMode: compatibilityMode,
        excludedCategories: excludedCategories
    )

    // Filter to ingredients that can fill this role
    let candidates = pool.compactMap { ingredientName -> String? in
        guard let profile = ingredientService.getProfile(ingredientName) else {
            return nil
        }
        let roles = profile.primaryRoles ?? inferRoles(for: profile)
        return roles.contains(role) ? ingredientName : nil
    }

    return candidates
}

private func tryFallbackStrategies(
    for requirement: RoleRequirement,
    selection: inout [String]
) -> Bool {
    // Strategy 1: Try secondary roles
    // Strategy 2: Find "bridge" ingredients (featured -> bridge -> role ingredient)
    // Strategy 3: Relax compatibility mode temporarily
    // ...
    return false
}
```

### 7. Special Salad Implementation (Your Request)

Enhanced salad generation in `generateDishWithTwoKeyIngredients`:

```swift
@MainActor
private func generateSaladWithLeafyGreens(
    menuKeyIngredient: String,
    formula: DishFormula,
    restrictions: Set<DietaryRestriction>,
    compatibilityMode: MenuConfiguration.MenuCompatibilityMode
) -> Dish? {
    // Step 1: Find leafy greens that pair with menu key ingredient
    let leafyGreens = findLeafyGreens(
        compatibleWith: menuKeyIngredient,
        restrictions: restrictions,
        compatibilityMode: compatibilityMode
    )

    guard !leafyGreens.isEmpty else {
        // Fallback: Find ingredient that pairs with menu key AND also pairs with a leafy green
        return generateSaladViaBridge(
            menuKeyIngredient: menuKeyIngredient,
            formula: formula,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode
        )
    }

    // Step 2: Pick first green
    guard let firstGreen = leafyGreens.randomElement() else { return nil }

    // Step 3: Find second green that pairs with first
    let secondGreenCandidates = leafyGreens.filter { green in
        green != firstGreen && flavorService.areCompatible(firstGreen, green)
    }

    let secondGreen: String
    if let candidate = secondGreenCandidates.randomElement() {
        secondGreen = candidate
    } else {
        // No second green pairs with first - use the first green twice? Or find bridge?
        return generateSaladWithOneGreen(
            green: firstGreen,
            menuKeyIngredient: menuKeyIngredient,
            formula: formula,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode
        )
    }

    // Step 4: Add fat and acid
    var selection = [firstGreen, secondGreen]

    // Add fat (oil, cheese)
    if let fat = findCandidatesForRole(
        role: .fat,
        currentSelection: selection,
        menuKeyIngredient: menuKeyIngredient,
        restrictions: restrictions,
        compatibilityMode: compatibilityMode,
        excludedCategories: formula.excludedSupportingCategories
    ).randomElement() {
        selection.append(fat)
    }

    // Add acid (vinegar, citrus)
    if let acid = findCandidatesForRole(
        role: .acid,
        currentSelection: selection,
        menuKeyIngredient: menuKeyIngredient,
        restrictions: restrictions,
        compatibilityMode: compatibilityMode,
        excludedCategories: formula.excludedSupportingCategories
    ).randomElement() {
        selection.append(acid)
    }

    // If we don't have enough, add generic supporting ingredients
    while selection.count < 4 {
        let compatiblePool = getCompatiblePool(...)
        guard let picked = compatiblePool.randomElement() else { break }
        selection.append(picked)
    }

    let profiles = selection.compactMap { ingredientService.getProfile($0) }
    let dishProfile = TasteProfile.average(profiles.map(\.flavorProfile))

    return Dish(
        name: Dish.generateName(keyIngredient: "\(firstGreen) & \(secondGreen)", type: .salad, mainIngredients: Array(selection.dropFirst(2))),
        type: .salad,
        keyIngredient: firstGreen,
        ingredients: [secondGreen] + Array(selection.dropFirst(2)),
        tasteProfile: dishProfile,
        weight: 5
    )
}

@MainActor
private func generateSaladViaBridge(
    menuKeyIngredient: String,
    formula: DishFormula,
    restrictions: Set<DietaryRestriction>,
    compatibilityMode: MenuConfiguration.MenuCompatibilityMode
) -> Dish? {
    // Find an ingredient that:
    // 1. Pairs with menu key ingredient
    // 2. Also pairs with at least one leafy green

    let menuKeyCompatible = flavorService.getCompatibleIngredients(menuKeyIngredient)

    for bridgeCandidate in menuKeyCompatible {
        let bridgeCompatible = flavorService.getCompatibleIngredients(bridgeCandidate)

        let leafyGreens = findLeafyGreens(
            compatibleWith: bridgeCandidate,
            restrictions: restrictions,
            compatibilityMode: .freeform  // Relax for this search
        )

        if !leafyGreens.isEmpty {
            // Found a bridge! Use bridgeCandidate as featured, then build salad
            return generateSaladWithOneGreen(
                green: leafyGreens.randomElement()!,
                menuKeyIngredient: bridgeCandidate,
                formula: formula,
                restrictions: restrictions,
                compatibilityMode: .flexible  // Use flexible mode for the rest
            )
        }
    }

    return nil  // No valid bridge found
}

@MainActor
private func findLeafyGreens(
    compatibleWith ingredient: String,
    restrictions: Set<DietaryRestriction>,
    compatibilityMode: MenuConfiguration.MenuCompatibilityMode
) -> [String] {
    var candidates = flavorService.getCompatibleIngredients(ingredient)

    candidates = Set(dietaryService.filterRestricted(
        ingredients: Array(candidates),
        restrictions: restrictions
    ))

    return candidates.compactMap { name -> String? in
        guard let profile = ingredientService.getProfile(name) else { return nil }
        guard profile.subcategory == "Leafy Greens" else { return nil }
        return name
    }
}
```

## Implementation Phases

### Phase 1: Foundation (30 min)
1. Add `CulinaryRole` enum to `Models/` directory
2. Extend `IngredientProfile` with optional `primaryRoles` and `secondaryRoles`
3. Create `inferRoles(for:)` helper function
4. Add unit tests for role inference

### Phase 2: DishFormula Extension (20 min)
1. Add `RoleRequirement` struct to `DishFormula`
2. Update all dish formulas with role requirements
3. Keep existing formula properties for backward compatibility

### Phase 3: Salad Enhancement (45 min)
1. Implement `findLeafyGreens` helper
2. Implement `generateSaladWithLeafyGreens` with bridge fallback
3. Implement `generateSaladViaBridge` for indirect pairing
4. Update salad formula and integrate into `generateDishWithFormula`
5. Test salad generation with various menu key ingredients

### Phase 4: Role-Based Selection (60 min)
1. Implement `selectIngredientsWithRoles` main algorithm
2. Implement `findCandidatesForRole` helper
3. Implement fallback strategies for required roles
4. Integrate into `generateDishWithFormula`
5. Add comprehensive logging for debugging

### Phase 5: Formula Updates (30 min)
1. Update entree formula with role requirements
2. Update side formula with role requirements
3. Update dessert formula with role requirements
4. Update sauce formula with role requirements
5. Test each dish type independently

### Phase 6: Testing & Refinement (45 min)
1. Generate 20+ menus with different key ingredients
2. Verify role distribution across dishes
3. Test edge cases (limited pairings, strict dietary restrictions)
4. Tune priority levels and fallback strategies
5. Performance testing

## Fallback Strategy Details

When a **required** role cannot be filled, try these strategies in order:

1. **Secondary Roles**: Check if ingredients can fill the role via `secondaryRoles`
2. **Bridge Ingredients**: Find an intermediate ingredient that connects to the role
   ```
   Current Selection -> Bridge Ingredient -> Role Ingredient
   ```
3. **Taste-Based Substitution**: Use taste profile to find functional equivalent
   - Need acid? Find high-sour ingredient even if not categorized as acid
   - Need fat? Find high-fat ingredient even if not in "Oils & Fats"
4. **Relax Compatibility Mode**: Temporarily use flexible mode instead of strict
5. **Reduce Count**: Try to fill role with fewer ingredients than requested
6. **Skip Role**: Only if priority is not `required`

## Benefits

### More Realistic Dishes
- Entrees will have proteins + aromatics + fat
- Salads will have greens + acid + fat (classic vinaigrette structure)
- Sauces will have fat + aromatics + acid/liquid
- Desserts will have fruit + sweetener + fat

### Maintained Flexibility
- Optional roles allow generation when pairings are limited
- Fallback strategies prevent failures
- Existing backtracking algorithm as final fallback

### Category Diversity
- Role requirements naturally encourage diverse categories
- Entree with chicken -> garlic (aromatic) + olive oil (fat) + lemon (acid)
- Not just chicken + 3 random proteins

### Incremental Adoption
- Optional properties in `IngredientProfile` - no breaking changes
- Can add role data to JSON gradually
- Role inference works with existing data
- Can enable/disable role-based generation per dish type

## Migration Path

1. **Launch without JSON changes**: Use role inference from categories
2. **Gather data**: Log which inferred roles work well vs. poorly
3. **Gradually add role data**: Update `ingredientProfiles.json` for key ingredients
4. **Long-term**: Full role metadata for all ingredients

## Testing Strategy

### Unit Tests
- `inferRoles` produces correct roles for each category/subcategory
- `findCandidatesForRole` filters correctly
- Fallback strategies work when roles unavailable

### Integration Tests
- Salad generation includes leafy greens
- Salad bridge fallback works when no direct green pairing
- Entrees include proteins + aromatics
- Desserts include sweeteners
- Each dish type respects its role requirements

### Manual Testing
- Generate 10 salads - verify all have greens
- Generate 10 entrees - verify role diversity
- Test with limited pairings (e.g., "saffron" has few pairings)
- Test with strict dietary restrictions

## Open Questions

1. **Should we fail or fallback when required role unavailable?**
   - Proposal: Always try to generate something, log warnings for missing required roles

2. **How strict should role matching be?**
   - Proposal: Primary roles preferred, secondary roles acceptable, inferred roles as fallback

3. **Should we enforce role uniqueness?**
   - Example: Should a dish avoid having 2 fats or 2 acids?
   - Proposal: Allow duplicates but prefer diversity via scoring

4. **How to handle multi-role ingredients?**
   - Example: Tomato can be acid, supporting, or aromatic
   - Proposal: Count it for the first unfilled role it matches

## Success Criteria

- ✅ 70%+ of salads include at least one leafy green
- ✅ 70%+ of entrees include protein + aromatic
- ✅ 80%+ of dishes have 2+ different categories
- ✅ No increase in generation failures (maintain current success rate)
- ✅ Generation time increases by <50ms on average
