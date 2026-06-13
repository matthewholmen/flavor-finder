import Foundation

/// Represents the functional role an ingredient can play in a dish
/// Used to build more realistic, balanced dishes with proper culinary structure
enum CulinaryRole: String, Codable, Hashable, Equatable, CaseIterable {
    case main           // Primary ingredient (protein, starch, featured element)
    case aromatic       // Flavor base (allium, herbs, aromatics)
    case fat            // Richness (oils, butter, cream, cheese)
    case acid           // Brightness (citrus, vinegar, tomato)
    case supporting     // Additional elements (vegetables, garnishes)
    case seasoning      // Spices, herbs for finishing
    case liquid         // Stocks, wine (for sauces, braises)
    case sweetener      // Sugar, honey (for desserts, sauces)

    // Beverage-specific roles
    case base           // Primary spirit/liquid (vodka, gin, rum, tequila, whiskey)
    case modifier       // Liqueurs, vermouth, bitters, fortified wines
    case mixer          // Juice, soda, tonic, simple mixers
    case garnish        // Citrus, herbs, fruit for garnishing drinks
    case bitterSweet    // Sweet components (simple syrup, honey, agave)
}

extension CulinaryRole {
    /// Human-readable description of the role
    var description: String {
        switch self {
        case .main:
            return "Main ingredient"
        case .aromatic:
            return "Aromatic base"
        case .fat:
            return "Fat/richness"
        case .acid:
            return "Acid/brightness"
        case .supporting:
            return "Supporting ingredient"
        case .seasoning:
            return "Seasoning"
        case .liquid:
            return "Liquid base"
        case .sweetener:
            return "Sweetener"
        case .base:
            return "Base spirit"
        case .modifier:
            return "Modifier/liqueur"
        case .mixer:
            return "Mixer"
        case .garnish:
            return "Garnish"
        case .bitterSweet:
            return "Sweet component"
        }
    }

    /// Returns true if this is a beverage-specific role
    var isBeverageRole: Bool {
        switch self {
        case .base, .modifier, .mixer, .garnish, .bitterSweet:
            return true
        default:
            return false
        }
    }
}
