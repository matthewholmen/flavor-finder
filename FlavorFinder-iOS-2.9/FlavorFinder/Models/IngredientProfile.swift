import Foundation

/// Complete ingredient profile with all metadata
struct IngredientProfile: Codable, Identifiable, Hashable {
    var id: String { name }

    let name: String
    let category: String
    let subcategory: String
    let flavorProfile: TasteProfile
    let description: String

    // Optional extended properties
    var cookingMethods: [String]?
    var texture: [String]?
    var intensity: Int?
    var allergen: [String]?
    var dietary: [String]?
    var dishTypes: [String]?
    var weight: Int?       // 1-10: flavor prominence
    var volume: Int?       // 1-10: typical quantity used
    var seasonality: [String]?

    // Role-based generation (optional, backward compatible)
    var primaryRoles: [CulinaryRole]?    // What roles this ingredient can fill
    var secondaryRoles: [CulinaryRole]?  // Additional roles (less ideal but valid)

    // Pantry level (optional, backward compatible)
    var pantryLevel: PantryLevel?        // How commonly stocked (essential, expanded, expert)

    /// Get the Category enum value
    var categoryEnum: Category? {
        Category(rawValue: category)
    }

    /// Check if ingredient matches a dish type
    func suitableFor(dishType: DishType) -> Bool {
        guard let types = dishTypes else { return true }
        return types.contains(dishType.rawValue)
    }

    /// Capitalized display name
    var displayName: String {
        name.split(separator: " ")
            .map { $0.prefix(1).uppercased() + $0.dropFirst() }
            .joined(separator: " ")
    }

    /// Get the dominant taste dimension
    var dominantTaste: TasteDimension? {
        flavorProfile.dimensions
            .max(by: { $0.1 < $1.1 })
            .map(\.0)
    }

    /// Check if this ingredient contains allergens
    func containsAllergen(_ allergenType: String) -> Bool {
        allergen?.contains(allergenType) ?? false
    }
}

/// Simple ingredient reference (just name + optional locked state)
struct Ingredient: Identifiable, Hashable, Codable {
    let id: UUID
    let name: String
    var isLocked: Bool

    init(name: String, isLocked: Bool = false) {
        self.id = UUID()
        self.name = name
        self.isLocked = isLocked
    }

    init(from profile: IngredientProfile, isLocked: Bool = false) {
        self.id = UUID()
        self.name = profile.name
        self.isLocked = isLocked
    }
}
