import Foundation

/// Pantry level representing how commonly stocked an ingredient is
/// Based on NYT Cooking's pantry stocking guide
enum PantryLevel: String, Codable, CaseIterable, Comparable {
    case essential = "essential"   // Basic staples most kitchens have
    case expanded = "expanded"     // Common additions for more adventurous cooks
    case expert = "expert"         // Specialty items for advanced cooking

    /// Display name for UI
    var displayName: String {
        switch self {
        case .essential: return "Essential"
        case .expanded: return "Expanded"
        case .expert: return "Expert"
        }
    }

    /// Description for UI
    var description: String {
        switch self {
        case .essential:
            return "Basic staples found in most kitchens"
        case .expanded:
            return "Common additions for more adventurous cooking"
        case .expert:
            return "Specialty items for advanced recipes"
        }
    }

    /// SF Symbol icon name
    var iconName: String {
        switch self {
        case .essential: return "house.fill"
        case .expanded: return "basket.fill"
        case .expert: return "star.fill"
        }
    }

    /// Sort order for comparison
    private var sortOrder: Int {
        switch self {
        case .essential: return 0
        case .expanded: return 1
        case .expert: return 2
        }
    }

    static func < (lhs: PantryLevel, rhs: PantryLevel) -> Bool {
        lhs.sortOrder < rhs.sortOrder
    }

    /// Check if this level is included at a given filter level
    /// e.g., if filter is .expanded, both .essential and .expanded are included
    func isIncluded(atLevel filterLevel: PantryLevel) -> Bool {
        self <= filterLevel
    }
}

/// Pantry filter mode for settings
enum PantryFilterMode: String, Codable, CaseIterable {
    case all = "all"               // Show all ingredients regardless of pantry level
    case essential = "essential"   // Only essential pantry items
    case expanded = "expanded"     // Essential + expanded
    case expert = "expert"         // All pantry levels (same as .all but explicit)

    /// Display name for UI
    var displayName: String {
        switch self {
        case .all: return "All Ingredients"
        case .essential: return "Essential Only"
        case .expanded: return "Essential + Expanded"
        case .expert: return "All Pantry Levels"
        }
    }

    /// Description for UI
    var description: String {
        switch self {
        case .all:
            return "Show all ingredients, including specialty items"
        case .essential:
            return "Only basic staples most kitchens have"
        case .expanded:
            return "Common pantry items for home cooks"
        case .expert:
            return "Include specialty and expert-level ingredients"
        }
    }

    /// Check if a pantry level passes this filter
    func includes(_ level: PantryLevel?) -> Bool {
        guard let level = level else {
            // Ingredients without pantry level are always included
            return true
        }

        switch self {
        case .all:
            return true
        case .essential:
            return level == .essential
        case .expanded:
            return level == .essential || level == .expanded
        case .expert:
            return true
        }
    }
}
