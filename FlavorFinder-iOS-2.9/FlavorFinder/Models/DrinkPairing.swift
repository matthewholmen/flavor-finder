//
//  DrinkPairing.swift
//  FlavorFinder
//
//  Created on 2026-01-14.
//

import Foundation

/// Represents a single drink (wine, beer, or spirit) that pairs with an ingredient
struct DrinkPairing: Codable, Identifiable, Hashable {
    let name: String
    let style: String  // e.g., "bold red", "crisp white", "light", "dark", "whiskey"

    var id: String { name }
}

/// Container for all drink pairings for a single ingredient
struct DrinkPairings: Codable, Hashable {
    let wines: [DrinkPairing]
    let beers: [DrinkPairing]
    let spirits: [DrinkPairing]
    let nonAlcoholic: [DrinkPairing]?  // Optional for backward compatibility

    /// All drinks combined
    var all: [DrinkPairing] {
        wines + beers + spirits + (nonAlcoholic ?? [])
    }

    /// All alcoholic drinks
    var alcoholic: [DrinkPairing] {
        wines + beers + spirits
    }

    /// Total count of all drink pairings
    var count: Int {
        wines.count + beers.count + spirits.count + (nonAlcoholic?.count ?? 0)
    }

    /// Total count of alcoholic pairings only
    var alcoholicCount: Int {
        wines.count + beers.count + spirits.count
    }

    /// Returns true if there are no pairings
    var isEmpty: Bool {
        count == 0
    }

    init(wines: [DrinkPairing] = [], beers: [DrinkPairing] = [], spirits: [DrinkPairing] = [], nonAlcoholic: [DrinkPairing]? = nil) {
        self.wines = wines
        self.beers = beers
        self.spirits = spirits
        self.nonAlcoholic = nonAlcoholic
    }
}

/// Root structure of the drinkPairings.json file
struct DrinkPairingDatabase: Codable {
    let version: String
    let tier: Int
    let updated: String
    let pairings: [String: DrinkPairings]
}

/// Category of drink for filtering/grouping
enum DrinkCategory: String, CaseIterable, Identifiable {
    case wines = "Wines"
    case beers = "Beers"
    case spirits = "Spirits"
    case nonAlcoholic = "Non-Alcoholic"

    var id: String { rawValue }
}

/// Represents a drink suggestion with pairing strength information
/// Used to show which ingredients a drink pairs with and rank suggestions
struct DrinkSuggestion: Identifiable {
    let drink: DrinkPairing
    let matchingIngredients: [String]  // Ingredients this drink pairs with

    // Use drink name + style to ensure uniqueness (beer can have multiple "various" styles)
    var id: String { "\(drink.name)|\(drink.style)" }
    var matchCount: Int { matchingIngredients.count }
}
