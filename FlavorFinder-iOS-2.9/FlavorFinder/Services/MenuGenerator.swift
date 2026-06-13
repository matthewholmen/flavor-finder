import Foundation

/// Priority level for role requirements in dish generation
enum DishPriority: Int, Comparable {
    case required = 3   // MUST have (fail if not found)
    case preferred = 2  // Should have (try hard to include)
    case optional = 1   // Nice to have (include if available)

    static func < (lhs: DishPriority, rhs: DishPriority) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}

/// Role requirement for building more realistic dishes
struct RoleRequirement {
    let role: CulinaryRole
    let priority: DishPriority
    let minCount: Int
    let maxCount: Int

    init(role: CulinaryRole, priority: DishPriority, count: Int) {
        self.role = role
        self.priority = priority
        self.minCount = count
        self.maxCount = count
    }

    init(role: CulinaryRole, priority: DishPriority, minCount: Int, maxCount: Int) {
        self.role = role
        self.priority = priority
        self.minCount = minCount
        self.maxCount = maxCount
    }
}

/// Service for generating balanced menus
class MenuGenerator {
    private let ingredientService: IngredientService
    private let flavorService: FlavorPairingService
    private let dietaryService: DietaryService
    private let tasteAnalyzer: TasteAnalyzer

    /// Minimum number of compatible ingredients needed to generate a dish
    /// A dish needs: featured ingredient + 2 supporting ingredients
    /// Supporting ingredients must be compatible with each other AND the featured ingredient
    private static let minimumPairingsForDish = 2

    /// Minimum ingredient counts by dish type (for fallback acceptance)
    private static let minimumDishCounts: [DishType: Int] = [
        .entree: 2,   // protein + 1 supporting
        .side: 2,     // main + 1 supporting
        .salad: 3,    // 2 greens + 1 supporting (or 1 green + 2 supporting)
        .dessert: 2,  // main + 1 supporting
        .beverage: 2, // alcohol + 1 modifier
        .sauce: 2     // base + 1 aromatic/acid
    ]

    /// Subcategories that should not be used as featured/key ingredients when generating dishes
    /// These are "supporting" ingredients that enhance dishes but shouldn't anchor them
    /// Users can still manually select these ingredients
    private static let excludedFeaturedSubcategories: Set<String> = [
        "Herbs",        // Seasonings > Herbs (bay leaf, thyme, rosemary)
        "Spices",       // Seasonings > Spices (black pepper, cumin, paprika)
        "Oils & Fats",  // Liquids > Oils & Fats (canola oil, olive oil, butter)
        "Vinegars"      // Liquids > Vinegars (balsamic, rice vinegar)
    ]

    /// Dish formula configuration for category-based ingredient selection
    struct DishFormula {
        let keyCategories: [Category]           // Categories to pick key ingredient from
        let keySubcategories: [String]?         // Optional: specific subcategories only
        let supportingCount: Int                // Number of supporting ingredients
        let requiresTwoKey: Bool                // Special: needs 2 key ingredients (e.g., salad)
        let tasteFallback: TasteDimension?      // Optional: fallback to high-taste ingredient
        let excludedSupportingCategories: [Category]  // Categories to exclude from supporting ingredients
        let roleRequirements: [RoleRequirement]?      // Optional: role-based requirements

        init(
            keyCategories: [Category],
            keySubcategories: [String]? = nil,
            supportingCount: Int = 2,
            requiresTwoKey: Bool = false,
            tasteFallback: TasteDimension? = nil,
            excludedSupportingCategories: [Category] = [],
            roleRequirements: [RoleRequirement]? = nil
        ) {
            self.keyCategories = keyCategories
            self.keySubcategories = keySubcategories
            self.supportingCount = supportingCount
            self.requiresTwoKey = requiresTwoKey
            self.tasteFallback = tasteFallback
            self.excludedSupportingCategories = excludedSupportingCategories
            self.roleRequirements = roleRequirements
        }
    }

    /// Dish formulas define the category constraints for key ingredient selection
    private static let dishFormulas: [DishType: DishFormula] = [
        .entree: DishFormula(
            keyCategories: [.proteins],
            supportingCount: 3,
            roleRequirements: [
                RoleRequirement(role: .main, priority: .required, count: 1),       // protein
                RoleRequirement(role: .aromatic, priority: .preferred, count: 1),  // garlic/onion/herbs
                RoleRequirement(role: .fat, priority: .preferred, count: 1),       // oil/butter
                RoleRequirement(role: .supporting, priority: .optional, count: 1)  // vegetables
            ]
        ),
        .side: DishFormula(
            keyCategories: [.proteins, .vegetables, .grains],
            keySubcategories: ["Plant Proteins", "Allium", "Leafy Greens", "Roots", "Squash", "Brassicas", "Mushrooms", "Stalks", "Fruit Vegetables", "Rice", "Pasta", "Bread", "Ancient Grains"],
            supportingCount: 2,
            roleRequirements: [
                RoleRequirement(role: .main, priority: .required, count: 1),       // grain/veg
                RoleRequirement(role: .aromatic, priority: .preferred, count: 1),  // garlic/herbs
                RoleRequirement(role: .fat, priority: .optional, count: 1)         // oil/butter
            ]
        ),
        .salad: DishFormula(
            keyCategories: [.vegetables],
            supportingCount: 2,  // Total 4: 2 greens + 2 supporting
            requiresTwoKey: true,  // veg + veg
            roleRequirements: [
                RoleRequirement(role: .supporting, priority: .required, minCount: 1, maxCount: 2),  // 1-2 leafy greens
                RoleRequirement(role: .fat, priority: .preferred, count: 1),        // oil/cheese
                RoleRequirement(role: .acid, priority: .preferred, count: 1)        // vinegar/citrus
            ]
        ),
        .dessert: DishFormula(
            keyCategories: [.fruits],
            supportingCount: 3,
            tasteFallback: .sweet,  // Or high-sweet ingredient
            excludedSupportingCategories: [.proteins, .vegetables],  // No meats or veggies in desserts
            roleRequirements: [
                RoleRequirement(role: .main, priority: .preferred, count: 1),       // Fruit (preferred, not required)
                RoleRequirement(role: .sweetener, priority: .required, count: 1),   // Sugar/honey
                RoleRequirement(role: .fat, priority: .preferred, count: 1),        // Cream/butter
                RoleRequirement(role: .aromatic, priority: .optional, count: 1)     // Vanilla/spices
            ]
        ),
        .beverage: DishFormula(
            keyCategories: [.alcohol],
            supportingCount: 3,
            excludedSupportingCategories: [.proteins, .vegetables, .grains],  // No meats, veggies, or grains in beverages
            roleRequirements: [
                RoleRequirement(role: .base, priority: .required, count: 1),        // Primary spirit/wine
                RoleRequirement(role: .mixer, priority: .preferred, minCount: 0, maxCount: 1),    // Juice/soda/tonic (optional)
                RoleRequirement(role: .modifier, priority: .optional, count: 1),    // Liqueur/vermouth
                RoleRequirement(role: .garnish, priority: .preferred, count: 1),    // Citrus/herbs
                RoleRequirement(role: .bitterSweet, priority: .optional, count: 1)  // Simple syrup/honey
            ]
        ),
        .sauce: DishFormula(
            keyCategories: [.pantry, .dairy, .seasonings],
            supportingCount: 3,
            roleRequirements: [
                RoleRequirement(role: .fat, priority: .preferred, count: 1),        // oil/butter
                RoleRequirement(role: .aromatic, priority: .preferred, count: 1),   // garlic/herbs
                RoleRequirement(role: .acid, priority: .optional, count: 1),        // vinegar/citrus
                RoleRequirement(role: .liquid, priority: .optional, count: 1)       // stock/wine
            ]
        )
    ]

    init(
        ingredientService: IngredientService,
        flavorService: FlavorPairingService,
        dietaryService: DietaryService,
        tasteAnalyzer: TasteAnalyzer
    ) {
        self.ingredientService = ingredientService
        self.flavorService = flavorService
        self.dietaryService = dietaryService
        self.tasteAnalyzer = tasteAnalyzer
    }

    /// Check if an ingredient has enough pairings to generate a starting dish
    /// Returns true if the ingredient can be used as a featured ingredient for random generation
    @MainActor
    func canGenerateDish(
        for ingredient: String,
        restrictions: Set<DietaryRestriction>
    ) -> Bool {
        // Get all compatible ingredients
        let compatible = flavorService.getCompatibleIngredients(ingredient)

        // Apply dietary restrictions
        let filtered = Set(dietaryService.filterRestricted(
            ingredients: Array(compatible),
            restrictions: restrictions
        ))

        // Need at least 2 compatible ingredients that are also compatible with each other
        // This is the minimum to generate a dish (featured + 2 supporting)
        guard filtered.count >= Self.minimumPairingsForDish else { return false }

        // Check if we can find 2 ingredients that pair with each other
        let sortedIngredients = Array(filtered)
        for i in 0..<sortedIngredients.count {
            for j in (i + 1)..<sortedIngredients.count {
                if flavorService.areCompatible(sortedIngredients[i], sortedIngredients[j]) {
                    return true
                }
            }
        }

        return false
    }

    /// Filter profiles to only those that can generate a dish
    @MainActor
    func filterGeneratableProfiles(
        _ profiles: [IngredientProfile],
        restrictions: Set<DietaryRestriction>
    ) -> [IngredientProfile] {
        profiles.filter { canGenerateDish(for: $0.name, restrictions: restrictions) }
    }

    /// Generate a complete menu based on configuration
    @MainActor
    func generateMenu(config: MenuConfiguration) async -> Menu {
        var dishes: [Dish] = []
        var usedIngredients = Set<String>()
        // Insert all key ingredients
        config.keyIngredients.forEach { usedIngredients.insert($0.lowercased()) }

        // Sort dish types by priority (entree first, then others)
        let sortedTypes = config.dishTypes.sorted { a, b in
            dishTypePriority(a) < dishTypePriority(b)
        }

        for dishType in sortedTypes {
            if let dish = generateDish(
                type: dishType,
                keyIngredients: config.keyIngredients,
                existingDishes: dishes,
                usedIngredients: usedIngredients,
                restrictions: config.dietaryRestrictions
            ) {
                dishes.append(dish)
                usedIngredients.formUnion(dish.allIngredients.map { $0.lowercased() })
            }
        }

        // Calculate overall menu profile and balance
        let allIngredients = dishes.flatMap(\.allIngredients)
        let analysis = tasteAnalyzer.analyze(ingredients: allIngredients)

        let menuName = generateMenuName(keyIngredients: config.keyIngredients, dishes: dishes)

        return Menu(
            name: menuName,
            keyIngredients: config.keyIngredients,
            dishes: dishes,
            balanceScore: analysis.balanceScore,
            tasteProfile: analysis.enhancedProfile
        )
    }

    /// Generate a single dish featuring pairings of the menu's key ingredient
    @MainActor
    private func generateDish(
        type: DishType,
        keyIngredients: [String],
        existingDishes: [Dish],
        usedIngredients: Set<String>,
        restrictions: Set<DietaryRestriction>
    ) -> Dish? {
        // Get ingredients compatible with ALL menu's key ingredients
        var compatible = flavorService.getIngredientsCompatibleWithAll(keyIngredients)

        // Remove already used ingredients (including the key ingredients themselves)
        compatible.subtract(usedIngredients)

        // Apply dietary restrictions
        compatible = Set(dietaryService.filterRestricted(
            ingredients: Array(compatible),
            restrictions: restrictions
        ))

        // Filter to ingredients with profiles
        let profiledIngredients = compatible.compactMap { name -> (String, IngredientProfile)? in
            guard let profile = ingredientService.getProfile(name) else { return nil }
            return (name, profile)
        }

        // Calculate target taste profile based on existing dishes
        let targetProfile = calculateTargetProfile(existingDishes: existingDishes)

        // Select featured ingredient first (will be the "star" of this dish)
        guard let featuredIngredient = selectFeaturedIngredient(
            candidates: profiledIngredients,
            targetProfile: targetProfile
        ) else { return nil }

        // Get ingredients compatible with the featured ingredient
        var supportingCandidates = flavorService.getCompatibleIngredients(featuredIngredient)

        // Also ensure they pair with ALL of the menu's key ingredients for cohesion
        let keyCompatible = flavorService.getIngredientsCompatibleWithAll(keyIngredients)
        supportingCandidates = supportingCandidates.intersection(keyCompatible)

        // Remove already used ingredients and the featured ingredient
        supportingCandidates.subtract(usedIngredients)
        supportingCandidates.remove(featuredIngredient.lowercased())

        // Apply dietary restrictions
        supportingCandidates = Set(dietaryService.filterRestricted(
            ingredients: Array(supportingCandidates),
            restrictions: restrictions
        ))

        // Filter to profiled ingredients
        let supportingProfiled = supportingCandidates.compactMap { name -> (String, IngredientProfile)? in
            guard let profile = ingredientService.getProfile(name) else { return nil }
            return (name, profile)
        }

        // Select supporting ingredients (default to 3 for variety)
        let supportingCount = 2
        let supporting = selectComplementaryIngredients(
            candidates: supportingProfiled,
            targetProfile: targetProfile,
            count: supportingCount
        )

        // Calculate dish taste profile from all ingredients
        let allDishIngredients = [featuredIngredient] + supporting
        let profiles = allDishIngredients.compactMap { ingredientService.getProfile($0) }
        let dishProfile = TasteProfile.average(profiles.map(\.flavorProfile))

        return Dish(
            name: Dish.generateName(keyIngredient: featuredIngredient, type: nil, mainIngredients: supporting),
            type: nil,
            keyIngredient: featuredIngredient,
            ingredients: supporting,
            tasteProfile: dishProfile,
            weight: 5
        )
    }

    /// Select the featured ingredient for a dish based on taste profile (no dish type scoring)
    private func selectFeaturedIngredient(
        candidates: [(String, IngredientProfile)],
        targetProfile: TasteProfile
    ) -> String? {
        // Score candidates purely by taste profile match with more randomness for variety
        let scored = candidates.map { (name, profile) -> (String, Double) in
            var score = 0.0

            // Score based on taste profile match
            for dimension in TasteDimension.allCases {
                let target = targetProfile.value(for: dimension)
                let actual = profile.flavorProfile.value(for: dimension)

                if target > 4 && actual >= target {
                    score += actual
                } else if target < 4 && actual < target {
                    score += 5 - actual
                }
            }

            // Larger variety bonus for more diverse results
            score += Double.random(in: 0...8)

            return (name, score)
        }

        // Return the top scoring ingredient
        return scored.sorted { $0.1 > $1.1 }.first?.0
    }

    /// Calculate target profile to balance existing dishes
    private func calculateTargetProfile(existingDishes: [Dish]) -> TasteProfile {
        guard !existingDishes.isEmpty else {
            // For first dish, aim for balanced profile
            return TasteProfile(sweet: 4, salty: 4, sour: 4, umami: 4, fat: 4, spicy: 2, aromatic: 4)
        }

        // Average existing profiles
        let existing = TasteProfile.average(existingDishes.map(\.tasteProfile))

        // Find weak dimensions and target higher values for them
        var target = TasteProfile.zero
        for dimension in TasteDimension.allCases {
            let current = existing.value(for: dimension)
            // If dimension is low, target higher; if high, target moderate
            if current < 3 {
                target.setValue(6, for: dimension)
            } else if current > 6 {
                target.setValue(3, for: dimension)
            } else {
                target.setValue(4, for: dimension)
            }
        }

        return target
    }

    /// Select ingredients that complement the target profile
    private func selectComplementaryIngredients(
        candidates: [(String, IngredientProfile)],
        targetProfile: TasteProfile,
        count: Int
    ) -> [String] {
        // Score candidates by how well they match the target with good variety
        let scored = candidates.map { (name, profile) -> (String, Double) in
            var score = 0.0

            for dimension in TasteDimension.allCases {
                let target = targetProfile.value(for: dimension)
                let actual = profile.flavorProfile.value(for: dimension)

                // Higher score if ingredient provides what we're targeting
                if target > 4 && actual >= target {
                    score += actual
                } else if target < 4 && actual < target {
                    score += 5 - actual
                }
            }

            // Larger variety bonus for more diverse results
            score += Double.random(in: 0...5)

            return (name, score)
        }

        // Sort by score and take top candidates
        return scored
            .sorted { $0.1 > $1.1 }
            .prefix(count)
            .map(\.0)
    }

    /// Get number of ingredients for a dish type
    private func ingredientCountForDishType(_ type: DishType) -> Int {
        switch type {
        case .entree: return 4
        case .side: return 3
        case .salad: return 4
        case .dessert: return 3
        case .beverage: return 2
        case .sauce: return 3
        }
    }

    /// Get dish type priority for ordering
    private func dishTypePriority(_ type: DishType) -> Int {
        switch type {
        case .entree: return 0
        case .side: return 1
        case .salad: return 2
        case .sauce: return 3
        case .dessert: return 4
        case .beverage: return 5
        }
    }

    /// Get dish type weight for balance calculations
    private func dishTypeWeight(_ type: DishType) -> Int {
        switch type {
        case .entree: return 10
        case .side: return 6
        case .salad: return 5
        case .dessert: return 7
        case .beverage: return 4
        case .sauce: return 3
        }
    }

    /// Generate a creative menu name
    private func generateMenuName(keyIngredients: [String], dishes: [Dish]) -> String {
        let dishCount = dishes.count

        // Handle multiple key ingredients
        let ingredientText: String
        if keyIngredients.isEmpty {
            ingredientText = "Freeform"
        } else if keyIngredients.count == 1 {
            ingredientText = keyIngredients[0].capitalized
        } else {
            ingredientText = keyIngredients.map { $0.capitalized }.joined(separator: " & ")
        }

        let prefixes = ["The", "A", ""]
        let adjectives = ["Perfect", "Balanced", "Seasonal", "Classic", "Inspired"]

        let prefix = prefixes.randomElement() ?? ""
        let adjective = adjectives.randomElement() ?? "Perfect"

        if dishCount == 1 {
            return "\(prefix) \(adjective) \(ingredientText) Dish".trimmingCharacters(in: .whitespaces)
        } else {
            return "\(prefix) \(adjective) \(ingredientText) Menu".trimmingCharacters(in: .whitespaces)
        }
    }

    /// Generate a single dish (public method for adding dishes one at a time)
    /// Dishes are independent - they don't avoid ingredients used in other dishes
    @MainActor
    func generateSingleDish(
        keyIngredients: [String],
        existingDishes: [Dish],
        restrictions: Set<DietaryRestriction>,
        includeKeyIngredient: Bool,
        requiredIngredient: String? = nil,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode = .flexible
    ) -> Dish? {
        if let required = requiredIngredient {
            // Build a dish with the required ingredient as the featured ingredient
            return generateIndependentDish(
                featuredIngredient: required,
                menuKeyIngredients: keyIngredients,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode
            )
        } else if includeKeyIngredient, let firstKey = keyIngredients.first {
            // First dish: one of the key ingredients IS the featured ingredient
            return generateIndependentDish(
                featuredIngredient: firstKey,
                menuKeyIngredients: keyIngredients,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode
            )
        } else {
            // Subsequent dishes: pick a random pairing of the key ingredients as featured
            return generateIndependentDishForMenu(
                keyIngredients: keyIngredients,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode
            )
        }
    }

    /// Regenerate a single dish in a menu
    /// If the dish has a type, uses formula-based generation to preserve dish type rules
    /// Dishes are independent - regeneration picks fresh random ingredients
    @MainActor
    func regenerateSingleDish(
        dish: Dish,
        in menu: Menu,
        restrictions: Set<DietaryRestriction>,
        includeKeyIngredient: Bool,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode = .flexible
    ) -> Dish? {
        // If dish has a type, use formula-based generation to preserve dish type rules
        if let dishType = dish.type {
            return generateDishWithFormula(
                type: dishType,
                keyIngredients: menu.keyIngredients,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode,
                includeKeyIngredient: includeKeyIngredient
            )
        }

        // No dish type - use generic generation
        if includeKeyIngredient, let firstKey = menu.keyIngredients.first {
            return generateIndependentDish(
                featuredIngredient: firstKey,
                menuKeyIngredients: menu.keyIngredients,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode
            )
        } else {
            return generateIndependentDishForMenu(
                keyIngredients: menu.keyIngredients,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode
            )
        }
    }

    /// Generate an independent dish where the featured ingredient pairs with the menu's key ingredients
    /// Supporting ingredients only need to pair with the featured ingredient (not the key ingredients) in flexible mode
    /// In strict mode, all ingredients must pair with ALL of the menu's key ingredients
    @MainActor
    private func generateIndependentDishForMenu(
        keyIngredients: [String],
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode
    ) -> Dish? {
        var compatible: Set<String>

        if compatibilityMode == .freeform {
            // In freeform mode, any ingredient is valid (no menu key requirement)
            compatible = Set(ingredientService.profiles.map { $0.name })
        } else {
            // In flexible/strict modes, dish's featured ingredient must pair with ALL menu's key ingredients
            compatible = flavorService.getIngredientsCompatibleWithAll(keyIngredients)
        }

        // Apply dietary restrictions
        compatible = Set(dietaryService.filterRestricted(
            ingredients: Array(compatible),
            restrictions: restrictions
        ))

        // Filter to ingredients with profiles, excluding supporting subcategories
        let profiledIngredients = compatible.compactMap { name -> (String, IngredientProfile)? in
            guard let profile = ingredientService.getProfile(name) else { return nil }
            // Exclude herbs, spices, oils, and vinegars from being featured ingredients
            guard !Self.excludedFeaturedSubcategories.contains(profile.subcategory) else { return nil }
            return (name, profile)
        }

        guard !profiledIngredients.isEmpty else { return nil }

        // Pick a random featured ingredient from compatible options
        let featuredIngredient = profiledIngredients.randomElement()!.0

        // Generate dish with this featured ingredient
        return generateIndependentDish(
            featuredIngredient: featuredIngredient,
            menuKeyIngredients: keyIngredients,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode
        )
    }

    /// Generate an independent dish with the given featured ingredient
    /// - freeform mode: All ingredients must pair with each other (dish-level only, no menu key requirement)
    /// - flexible mode: All ingredients must pair with each other (perfect pairing within dish)
    /// - strict mode: All ingredients must pair with each other AND with the menu's key ingredient
    @MainActor
    private func generateIndependentDish(
        featuredIngredient: String,
        menuKeyIngredients: [String],
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode,
        targetCount: Int = 3,
        excludedCategories: [Category] = [],
        forEntree: Bool = false
    ) -> Dish? {
        var currentSelection = [featuredIngredient]
        let maxAttempts = 100
        var attempts = 0
        var triedAtLevel: [[String]: Set<String>] = [:]

        // For entree: check if featured ingredient is a protein
        var needsProtein = false
        if forEntree {
            if let profile = ingredientService.getProfile(featuredIngredient),
               let category = Category(rawValue: profile.category) {
                needsProtein = category != .proteins
            }
        }
        var addedProtein = false

        // Use backtracking to find compatible ingredients
        while currentSelection.count < targetCount && attempts < maxAttempts {
            attempts += 1

            var compatiblePool: Set<String>

            switch compatibilityMode {
            case .freeform:
                // All ingredients must pair with each other (dish-level only)
                compatiblePool = flavorService.getIngredientsCompatibleWithAll(currentSelection)
            case .flexible:
                // All ingredients must pair with each other (original behavior)
                compatiblePool = flavorService.getIngredientsCompatibleWithAll(currentSelection)
            case .strict:
                // All ingredients must pair with each other (same as flexible)
                compatiblePool = flavorService.getIngredientsCompatibleWithAll(currentSelection)
                // ALSO must pair with ALL of the menu's key ingredients
                let keyCompatible = flavorService.getIngredientsCompatibleWithAll(menuKeyIngredients)
                compatiblePool = compatiblePool.intersection(keyCompatible)
            }

            // Apply dietary restrictions
            compatiblePool = Set(dietaryService.filterRestricted(
                ingredients: Array(compatiblePool),
                restrictions: restrictions
            ))

            // Filter out excluded categories (e.g., no proteins/vegetables in desserts)
            if !excludedCategories.isEmpty {
                compatiblePool = compatiblePool.filter { ingredientName in
                    guard let profile = ingredientService.getProfile(ingredientName),
                          let category = Category(rawValue: profile.category) else {
                        return true  // Keep if we can't determine category
                    }
                    return !excludedCategories.contains(category)
                }
            }

            // For entree: if we need a protein and haven't added one yet, filter to proteins only
            if forEntree && needsProtein && !addedProtein {
                let proteinPool = compatiblePool.filter { ingredientName in
                    guard let profile = ingredientService.getProfile(ingredientName),
                          let category = Category(rawValue: profile.category) else {
                        return false
                    }
                    return category == .proteins
                }
                // If we have proteins available, use only proteins; otherwise fall back to any
                if !proteinPool.isEmpty {
                    compatiblePool = proteinPool
                }
            }

            // Remove already tried ingredients at this level
            let key = currentSelection
            let tried = triedAtLevel[key] ?? []
            let available = compatiblePool.subtracting(tried)

            if available.isEmpty {
                // Backtrack
                if currentSelection.count > 1 {
                    let removed = currentSelection.removeLast()
                    // Check if the removed ingredient was our protein
                    if forEntree && needsProtein && addedProtein {
                        if let profile = ingredientService.getProfile(removed),
                           let category = Category(rawValue: profile.category),
                           category == .proteins {
                            addedProtein = false
                        }
                    }
                    let parentKey = currentSelection
                    triedAtLevel[parentKey, default: []].insert(removed)
                } else {
                    // Can't backtrack further (locked to featured ingredient)
                    break
                }
            } else {
                // Pick random from available
                if let picked = available.randomElement() {
                    currentSelection.append(picked)
                    // Track if we added a protein for entree
                    if forEntree && needsProtein && !addedProtein {
                        if let profile = ingredientService.getProfile(picked),
                           let category = Category(rawValue: profile.category),
                           category == .proteins {
                            addedProtein = true
                        }
                    }
                }
            }
        }

        // If we didn't find enough ingredients, return nil
        guard currentSelection.count == targetCount else { return nil }

        let supporting = Array(currentSelection.dropFirst()) // Remove featured ingredient

        // Calculate dish taste profile from all ingredients
        let profiles = currentSelection.compactMap { ingredientService.getProfile($0) }
        let dishProfile = TasteProfile.average(profiles.map(\.flavorProfile))

        return Dish(
            name: Dish.generateName(keyIngredient: featuredIngredient, type: nil, mainIngredients: supporting),
            type: nil,
            keyIngredient: featuredIngredient,
            ingredients: supporting,
            tasteProfile: dishProfile,
            weight: 5
        )
    }

    // MARK: - Formula-Based Dish Generation

    /// Generate a dish using the formula for the given dish type
    /// The formula determines which categories/subcategories to pick the key ingredient from
    @MainActor
    func generateDishWithFormula(
        type: DishType,
        keyIngredients: [String],
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode,
        includeKeyIngredient: Bool = false
    ) -> Dish? {
        guard let formula = Self.dishFormulas[type] else {
            // Fallback to regular generation if no formula exists
            return generateSingleDish(
                keyIngredients: keyIngredients,
                existingDishes: [],
                restrictions: restrictions,
                includeKeyIngredient: includeKeyIngredient,
                compatibilityMode: compatibilityMode
            )
        }

        // Special handling for entree: always use first menu's key ingredient as featured,
        // and add a protein if the featured ingredient isn't already a protein
        if type == .entree, let firstKey = keyIngredients.first {
            let dish = generateIndependentDish(
                featuredIngredient: firstKey,
                menuKeyIngredients: keyIngredients,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode,
                targetCount: 1 + formula.supportingCount,
                excludedCategories: formula.excludedSupportingCategories,
                forEntree: true
            )
            if var dish = dish {
                dish.type = type
                dish.name = Dish.generateName(keyIngredient: dish.keyIngredient, type: type, mainIngredients: dish.ingredients)
                return dish
            }
            return nil
        }

        // If this should include the menu's key ingredient as the featured ingredient
        if includeKeyIngredient, let firstKey = keyIngredients.first {
            let dish = generateIndependentDish(
                featuredIngredient: firstKey,
                menuKeyIngredients: keyIngredients,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode,
                targetCount: 1 + formula.supportingCount,
                excludedCategories: formula.excludedSupportingCategories
            )
            if var dish = dish {
                dish.type = type
                dish.name = Dish.generateName(keyIngredient: dish.keyIngredient, type: type, mainIngredients: dish.ingredients)
                return dish
            }
            return nil
        }

        // Get candidate ingredients based on formula
        var candidates = getCandidatesForFormula(
            formula: formula,
            keyIngredients: keyIngredients,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode
        )

        // If no candidates found and there's a taste fallback, try that
        if candidates.isEmpty, let tasteDimension = formula.tasteFallback {
            candidates = getHighTasteCandidates(
                dimension: tasteDimension,
                threshold: 6.0,
                keyIngredients: keyIngredients,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode
            )
        }

        guard !candidates.isEmpty else { return nil }

        // Handle special case: salad needs 2 vegetables + role-based generation
        if formula.requiresTwoKey && type == .salad {
            // Use enhanced salad generation with leafy greens + bridge fallback
            return generateSaladWithLeafyGreens(
                menuKeyIngredients: keyIngredients,
                formula: formula,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode
            )
        } else if formula.requiresTwoKey {
            // Fallback to original two-key generation for non-salad dishes
            return generateDishWithTwoKeyIngredients(
                candidates: candidates,
                formula: formula,
                type: type,
                keyIngredients: keyIngredients,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode
            )
        }

        // Pick random featured ingredient from candidates
        guard let featuredIngredient = candidates.randomElement() else { return nil }

        // Try role-based selection first if formula has role requirements
        if formula.roleRequirements != nil {
            if let selection = selectIngredientsWithRoles(
                featuredIngredient: featuredIngredient,
                menuKeyIngredients: keyIngredients,
                formula: formula,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode,
                dishType: type
            ) {
                let profiles = selection.compactMap { ingredientService.getProfile($0) }
                let dishProfile = TasteProfile.average(profiles.map { $0.flavorProfile })

                let dishName = Dish.generateName(
                    keyIngredient: selection[0],
                    type: type,
                    mainIngredients: Array(selection.dropFirst())
                )

                return Dish(
                    name: dishName,
                    type: type,
                    keyIngredient: selection[0],
                    ingredients: Array(selection.dropFirst()),
                    tasteProfile: dishProfile,
                    weight: 5
                )
            }
        }

        // Fallback to original backtracking algorithm
        logFallback(tier: 1, dishType: type, reason: "Role-based selection failed, using backtracking", ingredient: keyIngredients.joined(separator: ", "))
        let targetCount = 1 + formula.supportingCount
        guard var dish = generateIndependentDish(
            featuredIngredient: featuredIngredient,
            menuKeyIngredients: keyIngredients,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode,
            targetCount: targetCount,
            excludedCategories: formula.excludedSupportingCategories
        ) else { return nil }

        dish.type = type
        dish.name = Dish.generateName(keyIngredient: dish.keyIngredient, type: type, mainIngredients: dish.ingredients)
        return dish
    }

    /// Get candidate ingredients based on the dish formula
    @MainActor
    private func getCandidatesForFormula(
        formula: DishFormula,
        keyIngredients: [String],
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode
    ) -> [String] {
        // Get all ingredients matching the formula's category requirements
        var candidates: [IngredientProfile] = []

        for profile in ingredientService.profiles {
            // Check if ingredient is in one of the allowed categories
            guard let category = Category(rawValue: profile.category),
                  formula.keyCategories.contains(category) else {
                continue
            }

            // If subcategories are specified, check against them
            if let allowedSubcategories = formula.keySubcategories {
                guard allowedSubcategories.contains(profile.subcategory) else {
                    continue
                }
            }

            // Exclude supporting subcategories (herbs, spices, oils, vinegars)
            guard !Self.excludedFeaturedSubcategories.contains(profile.subcategory) else {
                continue
            }

            candidates.append(profile)
        }

        // Apply dietary restrictions
        candidates = dietaryService.filterProfiles(candidates, restrictions: restrictions)

        // Filter to only ingredients that pair with ALL of the menu's key ingredients (unless freeform or empty)
        if compatibilityMode != .freeform && !keyIngredients.isEmpty {
            let compatible = flavorService.getIngredientsCompatibleWithAll(keyIngredients)
            candidates = candidates.filter { compatible.contains($0.name) }
        }

        // Filter to ingredients that can generate a dish
        candidates = candidates.filter { canGenerateDish(for: $0.name, restrictions: restrictions) }

        return candidates.map(\.name)
    }

    /// Get candidates with high values for a specific taste dimension
    @MainActor
    private func getHighTasteCandidates(
        dimension: TasteDimension,
        threshold: Double,
        keyIngredients: [String],
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode
    ) -> [String] {
        var candidates: [IngredientProfile] = []

        for profile in ingredientService.profiles {
            // Check if ingredient has high value for the taste dimension
            guard profile.flavorProfile.value(for: dimension) >= threshold else {
                continue
            }

            // Exclude supporting subcategories
            guard !Self.excludedFeaturedSubcategories.contains(profile.subcategory) else {
                continue
            }

            candidates.append(profile)
        }

        // Apply dietary restrictions
        candidates = dietaryService.filterProfiles(candidates, restrictions: restrictions)

        // Filter to only ingredients that pair with ALL of the menu's key ingredients (unless freeform or empty)
        if compatibilityMode != .freeform && !keyIngredients.isEmpty {
            let compatible = flavorService.getIngredientsCompatibleWithAll(keyIngredients)
            candidates = candidates.filter { compatible.contains($0.name) }
        }

        // Filter to ingredients that can generate a dish
        candidates = candidates.filter { canGenerateDish(for: $0.name, restrictions: restrictions) }

        return candidates.map(\.name)
    }

    /// Generate a dish with two key ingredients (e.g., salad = veg + veg)
    @MainActor
    private func generateDishWithTwoKeyIngredients(
        candidates: [String],
        formula: DishFormula,
        type: DishType,
        keyIngredients: [String],
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode
    ) -> Dish? {
        // Try to find two vegetables that pair with each other
        let shuffledCandidates = candidates.shuffled()

        for firstVeg in shuffledCandidates {
            let firstCompatible = flavorService.getCompatibleIngredients(firstVeg)

            // Find a second vegetable that pairs with the first
            for secondVeg in shuffledCandidates {
                guard secondVeg != firstVeg else { continue }
                guard firstCompatible.contains(secondVeg) else { continue }

                // In strict mode, both must pair with ALL menu key ingredients
                if compatibilityMode == .strict && !keyIngredients.isEmpty {
                    let keyCompatible = flavorService.getIngredientsCompatibleWithAll(keyIngredients)
                    guard keyCompatible.contains(firstVeg) && keyCompatible.contains(secondVeg) else {
                        continue
                    }
                }

                // Now find supporting ingredients that pair with both
                var currentSelection = [firstVeg, secondVeg]
                let targetCount = 2 + formula.supportingCount

                // Use backtracking for supporting ingredients
                let maxAttempts = 50
                var attempts = 0
                var triedAtLevel: [[String]: Set<String>] = [:]

                while currentSelection.count < targetCount && attempts < maxAttempts {
                    attempts += 1

                    var compatiblePool = flavorService.getIngredientsCompatibleWithAll(currentSelection)

                    if compatibilityMode == .strict && !keyIngredients.isEmpty {
                        let keyCompatible = flavorService.getIngredientsCompatibleWithAll(keyIngredients)
                        compatiblePool = compatiblePool.intersection(keyCompatible)
                    }

                    compatiblePool = Set(dietaryService.filterRestricted(
                        ingredients: Array(compatiblePool),
                        restrictions: restrictions
                    ))

                    // Filter out excluded categories
                    if !formula.excludedSupportingCategories.isEmpty {
                        compatiblePool = compatiblePool.filter { ingredientName in
                            guard let profile = ingredientService.getProfile(ingredientName),
                                  let category = Category(rawValue: profile.category) else {
                                return true
                            }
                            return !formula.excludedSupportingCategories.contains(category)
                        }
                    }

                    let key = currentSelection
                    let tried = triedAtLevel[key] ?? []
                    let available = compatiblePool.subtracting(tried)

                    if available.isEmpty {
                        if currentSelection.count > 2 {
                            let removed = currentSelection.removeLast()
                            let parentKey = currentSelection
                            triedAtLevel[parentKey, default: []].insert(removed)
                        } else {
                            break
                        }
                    } else {
                        if let picked = available.randomElement() {
                            currentSelection.append(picked)
                        }
                    }
                }

                guard currentSelection.count == targetCount else { continue }

                let supporting = Array(currentSelection.dropFirst(2))
                let profiles = currentSelection.compactMap { ingredientService.getProfile($0) }
                let dishProfile = TasteProfile.average(profiles.map(\.flavorProfile))

                // For salad, combine both vegetables in the name
                let dishName = Dish.generateName(keyIngredient: "\(firstVeg) & \(secondVeg)", type: type, mainIngredients: supporting)

                return Dish(
                    name: dishName,
                    type: type,
                    keyIngredient: firstVeg,
                    ingredients: [secondVeg] + supporting,
                    tasteProfile: dishProfile,
                    weight: 5
                )
            }
        }

        return nil
    }

    // MARK: - Role-Based Generation

    /// Infer culinary roles from ingredient category and subcategory
    /// Used when ingredient profile doesn't have explicit role data
    private func inferRoles(for profile: IngredientProfile) -> [CulinaryRole] {
        // If profile has explicit roles, use those
        if let primaryRoles = profile.primaryRoles, !primaryRoles.isEmpty {
            return primaryRoles + (profile.secondaryRoles ?? [])
        }

        var roles: [CulinaryRole] = []

        switch (profile.category, profile.subcategory) {
        // Proteins
        case ("Proteins", _):
            roles.append(.main)

        // Vegetables
        case ("Vegetables", "Allium"):
            roles.append(.aromatic)
            roles.append(.supporting)
        case ("Vegetables", "Leafy Greens"):
            roles.append(.supporting)
        case ("Vegetables", _):
            roles.append(.supporting)
            // High-sour vegetables can act as acid
            if profile.flavorProfile.sour > 4 {
                roles.append(.acid)
            }

        // Fruits
        case ("Fruits", "Citrus"):
            roles.append(.acid)
            roles.append(.supporting)
            roles.append(.garnish)      // Beverage garnish (lemon/lime wedge)
            roles.append(.mixer)        // Citrus juice for cocktails
        case ("Fruits", _):
            roles.append(.supporting)
            roles.append(.garnish)      // Beverage garnish (berries, etc.)
            roles.append(.mixer)        // Fruit juice for cocktails
            // Sweet fruits can be sweeteners
            if profile.flavorProfile.sweet > 6 {
                roles.append(.sweetener)
            }
            // Sour fruits can be acids
            if profile.flavorProfile.sour > 5 {
                roles.append(.acid)
            }

        // Dairy
        case ("Dairy", "Hard Cheese"), ("Dairy", "Soft Cheese"):
            roles.append(.fat)
            roles.append(.supporting)
        case ("Dairy", "Cultured Dairy"):
            roles.append(.fat)
            roles.append(.supporting)
            // Yogurt can add acidity
            if profile.flavorProfile.sour > 3 {
                roles.append(.acid)
            }
        case ("Dairy", "Milk & Cream"):
            roles.append(.fat)
            roles.append(.supporting)

        // Seasonings
        case ("Seasonings", "Herbs"):
            roles.append(.aromatic)
            roles.append(.seasoning)
            roles.append(.garnish)      // Beverage garnish (mint, basil)
        case ("Seasonings", "Spices"):
            roles.append(.seasoning)
            // Aromatic spices
            if profile.flavorProfile.aromatic > 5 {
                roles.append(.aromatic)
            }
        case ("Seasonings", "Chilis"):
            roles.append(.seasoning)

        // Pantry
        case ("Pantry", "Oils & Fats"):
            roles.append(.fat)
        case ("Pantry", "Vinegars"):
            roles.append(.acid)
        case ("Pantry", "Stocks"):
            roles.append(.liquid)
        case ("Pantry", "Sauces"):
            roles.append(.supporting)
            // Tomato sauce, etc. can be acidic
            if profile.flavorProfile.sour > 3 {
                roles.append(.acid)
            }
        case ("Pantry", "Sweeteners"):
            roles.append(.sweetener)
            roles.append(.bitterSweet)  // Beverage sweeteners
        case ("Pantry", _):
            roles.append(.supporting)

        // Grains
        case ("Grains", _):
            roles.append(.main)
            roles.append(.supporting)

        // Alcohol - beverage-specific roles
        case ("Alcohol", "Wine"):
            roles.append(.base)         // Can be base for wine cocktails
            roles.append(.modifier)     // Can be modifier for other drinks
            roles.append(.liquid)       // Legacy food pairing role
        case ("Alcohol", "Spirits"):
            roles.append(.base)         // Primary spirit base
            roles.append(.liquid)       // Legacy food pairing role
        case ("Alcohol", "Liqueurs"):
            roles.append(.modifier)     // Sweet/flavored modifiers
            roles.append(.bitterSweet)  // Often sweet
            roles.append(.supporting)   // Legacy food pairing role

        default:
            roles.append(.supporting)
        }

        return roles
    }

    /// Log fallback events for debugging
    private func logFallback(tier: Int, dishType: DishType, reason: String, ingredient: String) {
        #if DEBUG
        print("[FALLBACK T\(tier)] \(dishType.rawValue.capitalized): \(reason) (menu key: \(ingredient))")
        #endif
    }

    /// Find ingredients that can fill a specific culinary role
    @MainActor
    private func findCandidatesForRole(
        role: CulinaryRole,
        currentSelection: [String],
        menuKeyIngredients: [String],
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode,
        excludedCategories: [Category]
    ) -> [String] {
        // Get compatible pool based on mode
        var compatiblePool: Set<String>

        switch compatibilityMode {
        case .freeform:
            // All ingredients must pair with each other (dish-level only)
            compatiblePool = flavorService.getIngredientsCompatibleWithAll(currentSelection)
        case .flexible:
            // All ingredients must pair with each other
            compatiblePool = flavorService.getIngredientsCompatibleWithAll(currentSelection)
        case .strict:
            // All ingredients must pair with each other AND ALL menu keys
            compatiblePool = flavorService.getIngredientsCompatibleWithAll(currentSelection)
            let keyCompatible = flavorService.getIngredientsCompatibleWithAll(menuKeyIngredients)
            compatiblePool = compatiblePool.intersection(keyCompatible)
        }

        // Apply dietary restrictions
        compatiblePool = Set(dietaryService.filterRestricted(
            ingredients: Array(compatiblePool),
            restrictions: restrictions
        ))

        // Filter out excluded categories
        if !excludedCategories.isEmpty {
            compatiblePool = compatiblePool.filter { ingredientName in
                guard let profile = ingredientService.getProfile(ingredientName),
                      let category = Category(rawValue: profile.category) else {
                    return true
                }
                return !excludedCategories.contains(category)
            }
        }

        // Filter to ingredients that can fill this role
        let candidates = compatiblePool.compactMap { ingredientName -> String? in
            guard let profile = ingredientService.getProfile(ingredientName) else {
                return nil
            }
            let roles = inferRoles(for: profile)
            return roles.contains(role) ? ingredientName : nil
        }

        return candidates
    }

    /// Select ingredients using role-based requirements with fallback strategies
    @MainActor
    private func selectIngredientsWithRoles(
        featuredIngredient: String,
        menuKeyIngredients: [String],
        formula: DishFormula,
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode,
        dishType: DishType
    ) -> [String]? {
        var selection = [featuredIngredient]
        var filledRoles: [CulinaryRole: Int] = [:]

        guard let requirements = formula.roleRequirements else {
            // No role requirements - use existing backtracking
            return generateIndependentDish(
                featuredIngredient: featuredIngredient,
                menuKeyIngredients: menuKeyIngredients,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode,
                targetCount: 1 + formula.supportingCount,
                excludedCategories: formula.excludedSupportingCategories
            )?.allIngredients
        }

        // Sort requirements by priority: required > preferred > optional
        let sortedRequirements = requirements.sorted { req1, req2 in
            req1.priority > req2.priority
        }

        // Track tried ingredients at each level for backtracking
        let triedAtLevel: [[String]: Set<String>] = [:]
        let maxAttempts = 100
        var attempts = 0

        for requirement in sortedRequirements {
            let alreadyFilled = filledRoles[requirement.role] ?? 0
            let needed = requirement.minCount - alreadyFilled
            guard needed > 0 else { continue }

            var addedForThisRequirement = 0
            attempts = 0

            while addedForThisRequirement < needed && attempts < maxAttempts {
                attempts += 1

                // Find candidates for this role
                let candidates = findCandidatesForRole(
                    role: requirement.role,
                    currentSelection: selection,
                    menuKeyIngredients: menuKeyIngredients,
                    restrictions: restrictions,
                    compatibilityMode: compatibilityMode,
                    excludedCategories: formula.excludedSupportingCategories
                )

                // Remove already selected and tried ingredients
                let key = selection
                let tried = triedAtLevel[key] ?? []
                let available = Set(candidates).subtracting(selection).subtracting(tried)

                if available.isEmpty {
                    // No candidates available
                    if requirement.priority == .required {
                        // Try fallback strategies
                        logFallback(tier: 1, dishType: dishType, reason: "No direct \(requirement.role) candidates", ingredient: menuKeyIngredients.joined(separator: ", "))

                        // Fallback: Try taste-based substitution
                        if let tasteCandidate = findTasteBasedSubstitute(
                            for: requirement.role,
                            currentSelection: selection,
                            menuKeyIngredients: menuKeyIngredients,
                            restrictions: restrictions,
                            compatibilityMode: compatibilityMode,
                            excludedCategories: formula.excludedSupportingCategories
                        ) {
                            selection.append(tasteCandidate)
                            let roles = inferRoles(for: ingredientService.getProfile(tasteCandidate)!)
                            for r in roles {
                                filledRoles[r, default: 0] += 1
                            }
                            addedForThisRequirement += 1
                            logFallback(tier: 3, dishType: dishType, reason: "Used taste-based substitute for \(requirement.role)", ingredient: menuKeyIngredients.joined(separator: ", "))
                            continue
                        }

                        // Failed to satisfy required role - return nil
                        logFallback(tier: 7, dishType: dishType, reason: "Failed to find required \(requirement.role)", ingredient: menuKeyIngredients.joined(separator: ", "))
                        return nil
                    }
                    // For preferred/optional, just break and continue to next requirement
                    break
                }

                // Pick random candidate
                if let picked = available.randomElement() {
                    selection.append(picked)

                    // Mark ALL roles this ingredient can fill
                    if let profile = ingredientService.getProfile(picked) {
                        let roles = inferRoles(for: profile)
                        for r in roles {
                            filledRoles[r, default: 0] += 1
                        }
                        // Track progress for this specific requirement
                        if roles.contains(requirement.role) {
                            addedForThisRequirement += 1
                        }
                    }
                }
            }
        }

        // Fill remaining slots with generic supporting ingredients if needed
        let targetCount = 1 + formula.supportingCount
        attempts = 0
        while selection.count < targetCount && attempts < maxAttempts {
            attempts += 1

            var compatiblePool: Set<String>
            switch compatibilityMode {
            case .freeform:
                compatiblePool = flavorService.getIngredientsCompatibleWithAll(selection)
            case .flexible:
                compatiblePool = flavorService.getIngredientsCompatibleWithAll(selection)
            case .strict:
                compatiblePool = flavorService.getIngredientsCompatibleWithAll(selection)
                let keyCompatible = flavorService.getIngredientsCompatibleWithAll(menuKeyIngredients)
                compatiblePool = compatiblePool.intersection(keyCompatible)
            }

            compatiblePool = Set(dietaryService.filterRestricted(
                ingredients: Array(compatiblePool),
                restrictions: restrictions
            ))

            // Filter excluded categories
            if !formula.excludedSupportingCategories.isEmpty {
                compatiblePool = compatiblePool.filter { ingredientName in
                    guard let profile = ingredientService.getProfile(ingredientName),
                          let category = Category(rawValue: profile.category) else {
                        return true
                    }
                    return !formula.excludedSupportingCategories.contains(category)
                }
            }

            let available = compatiblePool.subtracting(selection)
            guard let picked = available.randomElement() else {
                break
            }
            selection.append(picked)
        }

        // Accept if we meet minimum count for this dish type
        let minimumCount = Self.minimumDishCounts[dishType] ?? 2
        return selection.count >= minimumCount ? selection : nil
    }

    /// Find a taste-based substitute when role-specific ingredient isn't available
    @MainActor
    private func findTasteBasedSubstitute(
        for role: CulinaryRole,
        currentSelection: [String],
        menuKeyIngredients: [String],
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode,
        excludedCategories: [Category]
    ) -> String? {
        // Map roles to taste dimensions and thresholds
        let tasteCriteria: [(TasteDimension, Double)]
        switch role {
        case .acid:
            tasteCriteria = [(.sour, 4.0)]
        case .fat:
            tasteCriteria = [(.fat, 6.0)]
        case .sweetener:
            tasteCriteria = [(.sweet, 7.0)]
        case .aromatic:
            tasteCriteria = [(.aromatic, 6.0)]
        default:
            return nil  // No taste-based substitute for other roles
        }

        // Get compatible pool
        var compatiblePool: Set<String>
        switch compatibilityMode {
        case .freeform:
            compatiblePool = flavorService.getIngredientsCompatibleWithAll(currentSelection)
        case .flexible:
            compatiblePool = flavorService.getIngredientsCompatibleWithAll(currentSelection)
        case .strict:
            compatiblePool = flavorService.getIngredientsCompatibleWithAll(currentSelection)
            let keyCompatible = flavorService.getIngredientsCompatibleWithAll(menuKeyIngredients)
            compatiblePool = compatiblePool.intersection(keyCompatible)
        }

        compatiblePool = Set(dietaryService.filterRestricted(
            ingredients: Array(compatiblePool),
            restrictions: restrictions
        ))

        // Filter excluded categories
        if !excludedCategories.isEmpty {
            compatiblePool = compatiblePool.filter { ingredientName in
                guard let profile = ingredientService.getProfile(ingredientName),
                      let category = Category(rawValue: profile.category) else {
                    return true
                }
                return !excludedCategories.contains(category)
            }
        }

        // Find ingredients matching taste criteria
        let candidates = compatiblePool.compactMap { ingredientName -> String? in
            guard let profile = ingredientService.getProfile(ingredientName) else {
                return nil
            }

            for (dimension, threshold) in tasteCriteria {
                if profile.flavorProfile.value(for: dimension) >= threshold {
                    return ingredientName
                }
            }
            return nil
        }

        return candidates.randomElement()
    }

    // MARK: - Enhanced Salad Generation

    /// Find leafy green ingredients compatible with the given ingredient
    @MainActor
    private func findLeafyGreens(
        compatibleWith ingredients: [String],
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode
    ) -> [String] {
        var candidates = flavorService.getIngredientsCompatibleWithAll(ingredients)

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

    /// Generate a salad with guaranteed leafy greens using bridge fallback if needed
    @MainActor
    private func generateSaladWithLeafyGreens(
        menuKeyIngredients: [String],
        formula: DishFormula,
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode
    ) -> Dish? {
        // Step 1: Try to find leafy greens that pair with ALL menu key ingredients
        let leafyGreens = findLeafyGreens(
            compatibleWith: menuKeyIngredients,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode
        )

        if !leafyGreens.isEmpty {
            // Direct pairing available
            return generateSaladWithDirectGreens(
                leafyGreens: leafyGreens,
                menuKeyIngredients: menuKeyIngredients,
                formula: formula,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode
            )
        }

        // Step 2: No direct leafy green pairings - try bridge strategy
        logFallback(tier: 2, dishType: .salad, reason: "No direct leafy green pairings, trying bridge", ingredient: menuKeyIngredients.joined(separator: ", "))
        return generateSaladViaBridge(
            menuKeyIngredients: menuKeyIngredients,
            formula: formula,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode
        )
    }

    /// Generate salad when direct leafy green pairings are available
    @MainActor
    private func generateSaladWithDirectGreens(
        leafyGreens: [String],
        menuKeyIngredients: [String],
        formula: DishFormula,
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode
    ) -> Dish? {
        guard let firstGreen = leafyGreens.randomElement() else { return nil }

        // Try to find second green that pairs with first
        let secondGreenCandidates = leafyGreens.filter { green in
            green != firstGreen && flavorService.areCompatible(firstGreen, green)
        }

        if let secondGreen = secondGreenCandidates.randomElement() {
            // Found two greens that pair with each other
            return buildSaladFromGreens(
                firstGreen: firstGreen,
                secondGreen: secondGreen,
                menuKeyIngredients: menuKeyIngredients,
                formula: formula,
                restrictions: restrictions,
                compatibilityMode: compatibilityMode
            )
        }

        // Only one green available - build salad with single green base
        logFallback(tier: 2, dishType: .salad, reason: "Only one leafy green available", ingredient: menuKeyIngredients.joined(separator: ", "))
        return buildSaladWithOneGreen(
            green: firstGreen,
            menuKeyIngredients: menuKeyIngredients,
            formula: formula,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode
        )
    }

    /// Build a salad from two leafy greens
    @MainActor
    private func buildSaladFromGreens(
        firstGreen: String,
        secondGreen: String,
        menuKeyIngredients: [String],
        formula: DishFormula,
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode
    ) -> Dish? {
        var selection = [firstGreen, secondGreen]

        // Try to add fat (oil, cheese)
        let fatCandidates = findCandidatesForRole(
            role: .fat,
            currentSelection: selection,
            menuKeyIngredients: menuKeyIngredients,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode,
            excludedCategories: formula.excludedSupportingCategories
        )
        if let fat = fatCandidates.randomElement() {
            selection.append(fat)
        }

        // Try to add acid (vinegar, citrus)
        let acidCandidates = findCandidatesForRole(
            role: .acid,
            currentSelection: selection,
            menuKeyIngredients: menuKeyIngredients,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode,
            excludedCategories: formula.excludedSupportingCategories
        )
        if let acid = acidCandidates.randomElement() {
            selection.append(acid)
        }

        // Fill remaining slots with generic supporting ingredients if needed
        let targetCount = 2 + formula.supportingCount
        var attempts = 0
        let maxAttempts = 50

        while selection.count < targetCount && attempts < maxAttempts {
            attempts += 1

            var compatiblePool = flavorService.getIngredientsCompatibleWithAll(selection)

            if compatibilityMode == .strict {
                let keyCompatible = flavorService.getIngredientsCompatibleWithAll(menuKeyIngredients)
                compatiblePool = compatiblePool.intersection(keyCompatible)
            }

            compatiblePool = Set(dietaryService.filterRestricted(
                ingredients: Array(compatiblePool),
                restrictions: restrictions
            ))

            let available = compatiblePool.subtracting(selection)
            guard let picked = available.randomElement() else { break }
            selection.append(picked)
        }

        // Calculate taste profile
        let profiles = selection.compactMap { ingredientService.getProfile($0) }
        let dishProfile = TasteProfile.average(profiles.map(\.flavorProfile))

        let dishName = Dish.generateName(
            keyIngredient: "\(firstGreen) & \(secondGreen)",
            type: .salad,
            mainIngredients: Array(selection.dropFirst(2))
        )

        return Dish(
            name: dishName,
            type: .salad,
            keyIngredient: firstGreen,
            ingredients: [secondGreen] + Array(selection.dropFirst(2)),
            tasteProfile: dishProfile,
            weight: 5
        )
    }

    /// Build a salad with a single leafy green base
    @MainActor
    private func buildSaladWithOneGreen(
        green: String,
        menuKeyIngredients: [String],
        formula: DishFormula,
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode
    ) -> Dish? {
        var selection = [green]

        // Try to add another vegetable (not necessarily leafy)
        var compatiblePool = flavorService.getIngredientsCompatibleWithAll(selection)

        if compatibilityMode == .strict {
            let keyCompatible = flavorService.getIngredientsCompatibleWithAll(menuKeyIngredients)
            compatiblePool = compatiblePool.intersection(keyCompatible)
        }

        compatiblePool = Set(dietaryService.filterRestricted(
            ingredients: Array(compatiblePool),
            restrictions: restrictions
        ))

        // Find vegetables
        let veggies = compatiblePool.compactMap { name -> String? in
            guard let profile = ingredientService.getProfile(name),
                  let category = Category(rawValue: profile.category) else { return nil }
            return category == .vegetables ? name : nil
        }

        if let secondVeg = veggies.randomElement() {
            selection.append(secondVeg)
        }

        // Add fat and acid
        let fatCandidates = findCandidatesForRole(
            role: .fat,
            currentSelection: selection,
            menuKeyIngredients: menuKeyIngredients,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode,
            excludedCategories: formula.excludedSupportingCategories
        )
        if let fat = fatCandidates.randomElement() {
            selection.append(fat)
        }

        let acidCandidates = findCandidatesForRole(
            role: .acid,
            currentSelection: selection,
            menuKeyIngredients: menuKeyIngredients,
            restrictions: restrictions,
            compatibilityMode: compatibilityMode,
            excludedCategories: formula.excludedSupportingCategories
        )
        if let acid = acidCandidates.randomElement() {
            selection.append(acid)
        }

        // Must have at least 3 ingredients for salad
        guard selection.count >= 3 else { return nil }

        let profiles = selection.compactMap { ingredientService.getProfile($0) }
        let dishProfile = TasteProfile.average(profiles.map(\.flavorProfile))

        return Dish(
            name: Dish.generateName(keyIngredient: green, type: .salad, mainIngredients: Array(selection.dropFirst())),
            type: .salad,
            keyIngredient: green,
            ingredients: Array(selection.dropFirst()),
            tasteProfile: dishProfile,
            weight: 5
        )
    }

    /// Try to generate a salad using a bridge ingredient
    @MainActor
    private func generateSaladViaBridge(
        menuKeyIngredients: [String],
        formula: DishFormula,
        restrictions: Set<DietaryRestriction>,
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode
    ) -> Dish? {
        // Find ingredients that pair with ALL menu keys
        let menuKeyCompatible = flavorService.getIngredientsCompatibleWithAll(menuKeyIngredients)

        // Try each compatible ingredient as a bridge
        for bridgeCandidate in menuKeyCompatible.shuffled() {
            // Find leafy greens that pair with this bridge
            let leafyGreens = findLeafyGreens(
                compatibleWith: [bridgeCandidate],
                restrictions: restrictions,
                compatibilityMode: .freeform  // Relax for this search
            )

            if !leafyGreens.isEmpty {
                // Found a bridge! Use bridge as part of the salad
                logFallback(tier: 2, dishType: .salad, reason: "Using bridge ingredient '\(bridgeCandidate)' to reach greens", ingredient: menuKeyIngredients.joined(separator: ", "))

                // Build salad with the bridge ingredient included
                guard let green = leafyGreens.randomElement() else { continue }

                var selection = [green, bridgeCandidate]

                // Try to add second green
                let secondGreenCandidates = leafyGreens.filter { g in
                    g != green && flavorService.areCompatible(green, g)
                }
                if let secondGreen = secondGreenCandidates.randomElement() {
                    selection.insert(secondGreen, at: 1)
                }

                // Add fat and acid
                let fatCandidates = findCandidatesForRole(
                    role: .fat,
                    currentSelection: selection,
                    menuKeyIngredients: menuKeyIngredients,
                    restrictions: restrictions,
                    compatibilityMode: .flexible,
                    excludedCategories: formula.excludedSupportingCategories
                )
                if let fat = fatCandidates.randomElement() {
                    selection.append(fat)
                }

                let acidCandidates = findCandidatesForRole(
                    role: .acid,
                    currentSelection: selection,
                    menuKeyIngredients: menuKeyIngredients,
                    restrictions: restrictions,
                    compatibilityMode: .flexible,
                    excludedCategories: formula.excludedSupportingCategories
                )
                if let acid = acidCandidates.randomElement() {
                    selection.append(acid)
                }

                guard selection.count >= 3 else { continue }

                let profiles = selection.compactMap { ingredientService.getProfile($0) }
                let dishProfile = TasteProfile.average(profiles.map { $0.flavorProfile })

                let dishName = selection.count > 2 && selection[1] != bridgeCandidate
                    ? Dish.generateName(keyIngredient: "\(selection[0]) & \(selection[1])", type: .salad, mainIngredients: Array(selection.dropFirst(2)))
                    : Dish.generateName(keyIngredient: selection[0], type: .salad, mainIngredients: Array(selection.dropFirst()))

                return Dish(
                    name: dishName,
                    type: .salad,
                    keyIngredient: selection[0],
                    ingredients: Array(selection.dropFirst()),
                    tasteProfile: dishProfile,
                    weight: 5
                )
            }
        }

        // No bridge found - return nil
        logFallback(tier: 7, dishType: .salad, reason: "No bridge to leafy greens found", ingredient: menuKeyIngredients.joined(separator: ", "))
        return nil
    }
}
