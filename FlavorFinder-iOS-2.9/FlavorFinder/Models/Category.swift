import Foundation
import SwiftUI

/// Ingredient categories matching the web app structure
enum Category: String, Codable, CaseIterable, Identifiable {
    case proteins = "Proteins"
    case vegetables = "Vegetables"
    case fruits = "Fruits"
    case dairy = "Dairy"
    case seasonings = "Seasonings"
    case pantry = "Pantry"
    case grains = "Grains"
    case alcohol = "Alcohol"

    var id: String { rawValue }

    var displayName: String { rawValue }

    var subcategories: [String] {
        switch self {
        case .proteins:
            return ["Meat", "Poultry", "Seafood", "Plant Proteins"]
        case .vegetables:
            return ["Allium", "Leafy Greens", "Roots", "Squash", "Brassicas", "Mushrooms", "Stalks", "Fruit Vegetables"]
        case .fruits:
            return ["Citrus", "Stone Fruit", "Tropical", "Berries", "Pome Fruit", "Melons"]
        case .dairy:
            return ["Cheese", "Cultured", "Milk & Cream"]
        case .seasonings:
            return ["Herbs", "Spices", "Chilis"]
        case .pantry:
            return ["Oils & Fats", "Vinegars", "Stocks", "Sauces", "Sweeteners"]
        case .grains:
            return ["Rice", "Pasta", "Bread", "Ancient Grains"]
        case .alcohol:
            return ["Wine", "Spirits", "Liqueurs"]
        }
    }

    var icon: String {
        switch self {
        case .proteins: return "fork.knife"
        case .vegetables: return "leaf.fill"
        case .fruits: return "apple.logo"
        case .dairy: return "drop.fill"
        case .seasonings: return "sparkles"
        case .pantry: return "archivebox.fill"
        case .grains: return "circle.grid.2x2.fill"
        case .alcohol: return "wineglass.fill"
        }
    }

    var color: Color {
        switch self {
        case .proteins: return Color(hex: "FF2E2E")     // Red
        case .vegetables: return Color(hex: "6CA03B")  // Green
        case .fruits: return Color(hex: "FA6400")      // Orange
        case .dairy: return Color(hex: "5295CB")       // Blue
        case .seasonings: return Color(hex: "8A85D6")  // Purple
        case .pantry: return Color(hex: "FFBD17")      // Yellow/Gold
        case .grains: return Color(hex: "FFBD17")      // Yellow/Gold
        case .alcohol: return Color(hex: "FF577E")     // Pink
        }
    }

    /// Intuitive sort order for categories
    var sortOrder: Int {
        switch self {
        case .proteins: return 0
        case .vegetables: return 1
        case .fruits: return 2
        case .grains: return 3
        case .seasonings: return 4
        case .dairy: return 5
        case .pantry: return 6
        case .alcohol: return 7
        }
    }

    /// Sort order for subcategories within each category
    func subcategorySortOrder(_ subcategory: String) -> Int {
        subcategories.firstIndex(of: subcategory) ?? 999
    }

    /// Map non-standard category names to their canonical Category
    static func normalized(_ categoryName: String) -> Category? {
        // First try direct mapping
        if let category = Category(rawValue: categoryName) {
            return category
        }
        // Map legacy/alternate category names
        switch categoryName {
        case "Condiments", "Liquids":
            return .pantry
        default:
            return nil
        }
    }
}

/// Dish types for menu planning
enum DishType: String, Codable, CaseIterable, Identifiable {
    case entree
    case side
    case salad
    case dessert
    case beverage
    case sauce

    var id: String { rawValue }

    var displayName: String {
        rawValue.capitalized
    }

    var icon: String {
        switch self {
        case .entree: return "fork.knife"
        case .side: return "square.grid.2x2"
        case .salad: return "leaf"
        case .dessert: return "birthday.cake"
        case .beverage: return "wineglass"
        case .sauce: return "drop.fill"
        }
    }
}

/// Seasonality options
enum Season: String, Codable, CaseIterable {
    case spring
    case summer
    case fall
    case winter
    case yearRound = "year-round"

    var displayName: String {
        switch self {
        case .yearRound: return "Year Round"
        default: return rawValue.capitalized
        }
    }
}
