import Foundation

/// A dish in a menu
struct Dish: Identifiable, Codable, Hashable {
    let id: UUID
    var name: String
    var type: DishType?  // Optional - user can add/change it
    var keyIngredient: String  // The featured/star ingredient of this dish
    var ingredients: [String]  // Supporting ingredients
    var tasteProfile: TasteProfile
    var weight: Int  // Importance weight 1-10
    var preparationTime: Int?  // Minutes
    var recipeURL: URL?  // Linked recipe URL
    var recipeImageURL: URL?  // Preview image from recipe page
    var recipeTitle: String?  // Recipe page title

    init(
        id: UUID = UUID(),
        name: String,
        type: DishType? = nil,
        keyIngredient: String,
        ingredients: [String],
        tasteProfile: TasteProfile = .zero,
        weight: Int = 5,
        preparationTime: Int? = nil,
        recipeURL: URL? = nil,
        recipeImageURL: URL? = nil,
        recipeTitle: String? = nil
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.keyIngredient = keyIngredient
        self.ingredients = ingredients
        self.tasteProfile = tasteProfile
        self.weight = weight
        self.preparationTime = preparationTime
        self.recipeURL = recipeURL
        self.recipeImageURL = recipeImageURL
        self.recipeTitle = recipeTitle
    }

    /// All ingredients including the featured ingredient
    var allIngredients: [String] {
        [keyIngredient] + ingredients
    }

    /// Generate a display name based on ingredients (type is not included in name)
    static func generateName(keyIngredient: String, type: DishType?, mainIngredients: [String]) -> String {
        let featured = keyIngredient.capitalized

        if mainIngredients.isEmpty {
            return featured
        }

        let supporting = mainIngredients.prefix(2)
            .map { $0.capitalized }
            .joined(separator: " & ")

        return "\(featured) with \(supporting)"
    }
}

/// A complete menu with multiple dishes
struct Menu: Identifiable, Codable {
    let id: UUID
    var name: String
    var keyIngredients: [String]  // Changed from keyIngredient: String
    var dishes: [Dish]
    var balanceScore: Double  // 0-100
    var tasteProfile: TasteProfile
    var createdAt: Date
    var dietaryRestrictions: Set<DietaryRestriction>
    var compatibilityMode: MenuConfiguration.MenuCompatibilityMode

    init(
        name: String,
        keyIngredients: [String],  // Changed from keyIngredient: String
        dishes: [Dish] = [],
        balanceScore: Double = 0,
        tasteProfile: TasteProfile = .zero,
        dietaryRestrictions: Set<DietaryRestriction> = [],
        compatibilityMode: MenuConfiguration.MenuCompatibilityMode = .flexible
    ) {
        self.id = UUID()
        self.name = name
        self.keyIngredients = keyIngredients
        self.dishes = dishes
        self.balanceScore = balanceScore
        self.tasteProfile = tasteProfile
        self.createdAt = Date()
        self.dietaryRestrictions = dietaryRestrictions
        self.compatibilityMode = compatibilityMode
    }

    /// Backward compatibility - returns the first (primary) featured ingredient
    var primaryKeyIngredient: String? {
        keyIngredients.first
    }

    /// Total preparation time for all dishes
    var totalPrepTime: Int? {
        let times = dishes.compactMap(\.preparationTime)
        return times.isEmpty ? nil : times.reduce(0, +)
    }

    /// All unique ingredients across all dishes
    var allIngredients: [String] {
        Array(Set(dishes.flatMap(\.allIngredients)))
    }

    /// Count of dishes by type
    func dishCount(for type: DishType) -> Int {
        dishes.filter { $0.type == type }.count
    }

    /// Count of dishes without a type
    var untypedDishCount: Int {
        dishes.filter { $0.type == nil }.count
    }

    /// Get all ingredients that pair perfectly with every other ingredient across all dishes
    @MainActor
    func perfectPairingIngredients(using flavorService: FlavorPairingService) -> Set<String> {
        let allIngs = allIngredients
        guard allIngs.count > 1 else { return Set() }

        var perfectPairings = Set<String>()

        for ingredient in allIngs {
            let otherIngredients = allIngs.filter { $0.lowercased() != ingredient.lowercased() }
            if flavorService.isCompatibleWithAll(ingredient, otherIngredients) {
                perfectPairings.insert(ingredient.lowercased())
            }
        }

        return perfectPairings
    }

    /// Get all ingredients that pair with 50% or more of other ingredients (but not all)
    @MainActor
    func strongPairingIngredients(using flavorService: FlavorPairingService) -> Set<String> {
        let allIngs = allIngredients
        guard allIngs.count > 1 else { return Set() }

        var strongPairings = Set<String>()
        let perfectPairings = perfectPairingIngredients(using: flavorService)

        for ingredient in allIngs {
            // Skip if already a perfect pairing
            if perfectPairings.contains(ingredient.lowercased()) {
                continue
            }

            let otherIngredients = allIngs.filter { $0.lowercased() != ingredient.lowercased() }
            let compatibleCount = otherIngredients.filter {
                flavorService.areCompatible(ingredient, $0)
            }.count

            let pairingPercentage = Double(compatibleCount) / Double(otherIngredients.count)
            if pairingPercentage >= 0.5 {
                strongPairings.insert(ingredient.lowercased())
            }
        }

        return strongPairings
    }
}

/// Menu generation configuration
struct MenuConfiguration: Codable {
    var keyIngredients: [String] = []  // Changed from keyIngredient: String
    var dishTypes: Set<DishType>
    var dietaryRestrictions: Set<DietaryRestriction>
    var servings: Int
    var mode: MenuMode
    var compatibilityMode: MenuCompatibilityMode

    enum MenuMode: String, Codable, CaseIterable {
        case autoGenerate = "auto"
        case interactive

        var displayName: String {
            switch self {
            case .autoGenerate: return "Auto-Generate"
            case .interactive: return "Interactive Builder"
            }
        }

        var description: String {
            switch self {
            case .autoGenerate: return "Let the app create a balanced menu automatically"
            case .interactive: return "Build your menu dish by dish with suggestions"
            }
        }

        var icon: String {
            switch self {
            case .autoGenerate: return "wand.and.stars"
            case .interactive: return "hand.point.up.left.fill"
            }
        }
    }

    /// How strictly ingredients must pair with the featured ingredient
    enum MenuCompatibilityMode: String, Codable, CaseIterable {
        case freeform   // No featured ingredient requirement; ingredients only pair within each dish
        case flexible   // Ingredients pair within each dish; only dish's key pairs with featured
        case strict     // Ingredients pair within each dish AND all pair with featured

        var displayName: String {
            switch self {
            case .freeform: return "Freeform"
            case .flexible: return "Flexible"
            case .strict: return "Strict"
            }
        }

        var description: String {
            switch self {
            case .freeform: return "Ingredients only need to pair within each dish"
            case .flexible: return "Each dish's main ingredient pairs with the featured ingredient"
            case .strict: return "Every ingredient in every dish pairs with the featured ingredient"
            }
        }

        var icon: String {
            switch self {
            case .freeform: return "wand.and.stars"
            case .flexible: return "link.badge.plus"
            case .strict: return "link"
            }
        }
    }

    static var `default`: MenuConfiguration {
        MenuConfiguration(
            keyIngredients: [],
            dishTypes: [.entree, .side],
            dietaryRestrictions: [],
            servings: 4,
            mode: .autoGenerate,
            compatibilityMode: .flexible
        )
    }
}
