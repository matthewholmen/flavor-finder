import Foundation
import SwiftData

/// A saved menu persisted with SwiftData
@Model
final class SavedMenu {
    var id: UUID
    var name: String
    var keyIngredientsData: Data = Data()  // Stores array of key ingredients
    var dishesData: Data
    var createdAt: Date
    var lastUsed: Date?
    var notes: String?
    var dietaryRestrictionsData: Data = Data()
    var compatibilityModeRaw: String = "flexible"

    // MARK: - Cached Dishes

    /// Cached decoded dishes to avoid repeated JSON decoding
    @Transient private var _cachedDishes: [Dish]?
    @Transient private var _cachedDishesDataHash: Int?

    // MARK: - Computed Properties

    /// Decoded dishes from dishesData (cached to avoid repeated decoding)
    var dishes: [Dish] {
        get {
            // Check if cache is valid by comparing data hash
            let currentHash = dishesData.hashValue
            if let cached = _cachedDishes, _cachedDishesDataHash == currentHash {
                return cached
            }

            // Decode and cache
            guard let decoded = try? JSONDecoder().decode([Dish].self, from: dishesData) else {
                return []
            }
            _cachedDishes = decoded
            _cachedDishesDataHash = currentHash
            return decoded
        }
        set {
            if let encoded = try? JSONEncoder().encode(newValue) {
                dishesData = encoded
                // Invalidate cache
                _cachedDishes = newValue
                _cachedDishesDataHash = encoded.hashValue
            }
        }
    }

    /// Number of dishes in the menu
    var dishCount: Int {
        dishes.count
    }

    /// Comma-separated list of dish types for display
    var dishTypesDisplay: String {
        let types = dishes.compactMap { $0.type?.displayName }
        if types.isEmpty {
            return "\(dishCount) dish\(dishCount == 1 ? "" : "es")"
        }
        return types.joined(separator: ", ")
    }

    /// Short description showing dish count
    var shortDescription: String {
        "\(dishCount) dish\(dishCount == 1 ? "" : "es")"
    }

    /// Decoded dietary restrictions
    var dietaryRestrictions: Set<DietaryRestriction> {
        get {
            guard let decoded = try? JSONDecoder().decode(Set<DietaryRestriction>.self, from: dietaryRestrictionsData) else {
                return []
            }
            return decoded
        }
        set {
            if let encoded = try? JSONEncoder().encode(newValue) {
                dietaryRestrictionsData = encoded
            }
        }
    }

    /// Decoded compatibility mode
    var compatibilityMode: MenuConfiguration.MenuCompatibilityMode {
        get {
            MenuConfiguration.MenuCompatibilityMode(rawValue: compatibilityModeRaw) ?? .flexible
        }
        set {
            compatibilityModeRaw = newValue.rawValue
        }
    }

    /// Decoded key ingredients array
    var keyIngredients: [String] {
        get {
            if !keyIngredientsData.isEmpty,
               let decoded = try? JSONDecoder().decode([String].self, from: keyIngredientsData) {
                return decoded
            }
            return []
        }
        set {
            if let encoded = try? JSONEncoder().encode(newValue) {
                keyIngredientsData = encoded
            }
        }
    }

    // MARK: - Initialization

    init(from menu: Menu, name: String, notes: String? = nil) {
        self.id = UUID()
        self.name = name

        // Encode key ingredients
        let encoder = JSONEncoder()
        if let encoded = try? encoder.encode(menu.keyIngredients) {
            self.keyIngredientsData = encoded
        } else {
            self.keyIngredientsData = Data()
        }

        // Encode dishes to JSON
        if let encoded = try? encoder.encode(menu.dishes) {
            self.dishesData = encoded
        } else {
            self.dishesData = Data()
        }

        // Encode dietary restrictions
        if let encoded = try? encoder.encode(menu.dietaryRestrictions) {
            self.dietaryRestrictionsData = encoded
        } else {
            self.dietaryRestrictionsData = Data()
        }

        self.compatibilityModeRaw = menu.compatibilityMode.rawValue
        self.createdAt = Date()
        self.lastUsed = nil
        self.notes = notes
    }

    // MARK: - Methods

    /// Convert back to a Menu for editing
    func toMenu() -> Menu {
        Menu(
            name: name,
            keyIngredients: keyIngredients,
            dishes: dishes,
            balanceScore: 0,
            tasteProfile: .zero,
            dietaryRestrictions: dietaryRestrictions,
            compatibilityMode: compatibilityMode
        )
    }

    /// Update lastUsed timestamp
    func markAsUsed() {
        lastUsed = Date()
    }
}
