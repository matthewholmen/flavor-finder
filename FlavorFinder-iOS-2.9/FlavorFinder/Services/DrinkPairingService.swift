//
//  DrinkPairingService.swift
//  FlavorFinder
//
//  Created on 2026-01-14.
//

import Foundation

/// Service for managing drink pairings with ingredients
@MainActor
class DrinkPairingService: ObservableObject {
    @Published private(set) var isLoaded = false
    @Published private(set) var pairingCount = 0
    @Published private(set) var ingredientCount = 0

    private var drinkMap: [String: DrinkPairings] = [:]
    private var database: DrinkPairingDatabase?

    enum DrinkPairingError: Error, LocalizedError {
        case fileNotFound
        case decodingFailed

        var errorDescription: String? {
            switch self {
            case .fileNotFound:
                return "Drink pairings data file not found"
            case .decodingFailed:
                return "Failed to decode drink pairings"
            }
        }
    }

    /// Load drink pairings from bundled JSON file
    func loadPairings() async throws {
        guard let url = Bundle.main.url(forResource: "drinkPairings", withExtension: "json") else {
            throw DrinkPairingError.fileNotFound
        }

        // Perform heavy I/O and parsing off the main thread
        let (db, count) = try await Task.detached(priority: .userInitiated) {
            let data = try Data(contentsOf: url)
            let database = try JSONDecoder().decode(DrinkPairingDatabase.self, from: data)

            // Count total pairings
            let totalPairings = database.pairings.values.reduce(0) { $0 + $1.count }

            return (database, totalPairings)
        }.value

        // Update state on main thread
        database = db
        drinkMap = db.pairings
        pairingCount = count
        ingredientCount = db.pairings.count
        isLoaded = true
    }

    /// Get drink pairings for a single ingredient
    func getPairings(for ingredient: String) -> DrinkPairings? {
        drinkMap[ingredient.lowercased()]
    }

    /// Get drink pairings for multiple ingredients
    func getPairings(for ingredients: [String]) -> [String: DrinkPairings] {
        var result: [String: DrinkPairings] = [:]
        for ingredient in ingredients {
            let normalized = ingredient.lowercased()
            if let pairings = drinkMap[normalized] {
                result[normalized] = pairings
            }
        }
        return result
    }

    /// Get common drink pairings across multiple ingredients (for menu aggregation)
    /// Returns drinks that pair with at least one ingredient in the list
    func getCommonPairings(for ingredients: [String]) -> DrinkPairings {
        guard !ingredients.isEmpty else {
            return DrinkPairings()
        }

        var allWines: [DrinkPairing] = []
        var allBeers: [DrinkPairing] = []
        var allSpirits: [DrinkPairing] = []
        var allNonAlcoholic: [DrinkPairing] = []

        // Collect all pairings
        for ingredient in ingredients {
            if let pairings = getPairings(for: ingredient) {
                allWines.append(contentsOf: pairings.wines)
                allBeers.append(contentsOf: pairings.beers)
                allSpirits.append(contentsOf: pairings.spirits)
                if let nonAlcoholic = pairings.nonAlcoholic {
                    allNonAlcoholic.append(contentsOf: nonAlcoholic)
                }
            }
        }

        // Remove duplicates while preserving order
        let uniqueWines = Array(Dictionary(grouping: allWines, by: { $0.name }).compactMap { $0.value.first })
        let uniqueBeers = Array(Dictionary(grouping: allBeers, by: { $0.name }).compactMap { $0.value.first })
        let uniqueSpirits = Array(Dictionary(grouping: allSpirits, by: { $0.name }).compactMap { $0.value.first })
        let uniqueNonAlcoholic = Array(Dictionary(grouping: allNonAlcoholic, by: { $0.name }).compactMap { $0.value.first })

        return DrinkPairings(wines: uniqueWines, beers: uniqueBeers, spirits: uniqueSpirits, nonAlcoholic: uniqueNonAlcoholic.isEmpty ? nil : uniqueNonAlcoholic)
    }

    /// Get "perfect pairings" - drinks that pair with a high percentage of ingredients
    /// Threshold is percentage (0.0-1.0) of ingredients the drink must pair with
    func getPerfectPairings(for ingredients: [String], threshold: Double = 0.8) -> DrinkPairings {
        guard !ingredients.isEmpty else {
            return DrinkPairings()
        }

        // Track how many ingredients each drink pairs with
        var wineCounts: [String: (pairing: DrinkPairing, count: Int)] = [:]
        var beerCounts: [String: (pairing: DrinkPairing, count: Int)] = [:]
        var spiritCounts: [String: (pairing: DrinkPairing, count: Int)] = [:]
        var nonAlcoholicCounts: [String: (pairing: DrinkPairing, count: Int)] = [:]

        for ingredient in ingredients {
            if let pairings = getPairings(for: ingredient) {
                for wine in pairings.wines {
                    if let existing = wineCounts[wine.name] {
                        wineCounts[wine.name] = (wine, existing.count + 1)
                    } else {
                        wineCounts[wine.name] = (wine, 1)
                    }
                }

                for beer in pairings.beers {
                    if let existing = beerCounts[beer.name] {
                        beerCounts[beer.name] = (beer, existing.count + 1)
                    } else {
                        beerCounts[beer.name] = (beer, 1)
                    }
                }

                for spirit in pairings.spirits {
                    if let existing = spiritCounts[spirit.name] {
                        spiritCounts[spirit.name] = (spirit, existing.count + 1)
                    } else {
                        spiritCounts[spirit.name] = (spirit, 1)
                    }
                }

                if let nonAlcoholic = pairings.nonAlcoholic {
                    for drink in nonAlcoholic {
                        if let existing = nonAlcoholicCounts[drink.name] {
                            nonAlcoholicCounts[drink.name] = (drink, existing.count + 1)
                        } else {
                            nonAlcoholicCounts[drink.name] = (drink, 1)
                        }
                    }
                }
            }
        }

        let requiredCount = Int(ceil(Double(ingredients.count) * threshold))

        // Filter by threshold
        let perfectWines = wineCounts.values
            .filter { $0.count >= requiredCount }
            .map { $0.pairing }
            .sorted { $0.name < $1.name }

        let perfectBeers = beerCounts.values
            .filter { $0.count >= requiredCount }
            .map { $0.pairing }
            .sorted { $0.name < $1.name }

        let perfectSpirits = spiritCounts.values
            .filter { $0.count >= requiredCount }
            .map { $0.pairing }
            .sorted { $0.name < $1.name }

        let perfectNonAlcoholic = nonAlcoholicCounts.values
            .filter { $0.count >= requiredCount }
            .map { $0.pairing }
            .sorted { $0.name < $1.name }

        return DrinkPairings(
            wines: perfectWines,
            beers: perfectBeers,
            spirits: perfectSpirits,
            nonAlcoholic: perfectNonAlcoholic.isEmpty ? nil : perfectNonAlcoholic
        )
    }

    /// Get featured-ingredient-prioritized drink pairings for a dish
    /// Returns drinks that pair with the featured ingredient, ranked by how many other dish ingredients they also pair with
    func getFeaturedPairings(featuredIngredient: String, dishIngredients: [String]) -> [DrinkSuggestion] {
        // Get pairings for featured ingredient
        guard let featuredPairings = getPairings(for: featuredIngredient) else {
            return []
        }

        var suggestions: [DrinkSuggestion] = []

        // Process all drinks from featured ingredient's pairings (including non-alcoholic)
        let allDrinks = featuredPairings.all

        for drink in allDrinks {
            var matchingIngredients = [featuredIngredient]  // Always includes featured

            // Check each dish ingredient (excluding featured to avoid duplicates)
            for ingredient in dishIngredients where ingredient.lowercased() != featuredIngredient.lowercased() {
                if let ingredientPairings = getPairings(for: ingredient) {
                    // Check if this drink appears in ingredient's pairings (case-insensitive)
                    let allIngredinetDrinks = ingredientPairings.all
                    if allIngredinetDrinks.contains(where: { $0.name.lowercased() == drink.name.lowercased() }) {
                        matchingIngredients.append(ingredient)
                    }
                }
            }

            suggestions.append(DrinkSuggestion(drink: drink, matchingIngredients: matchingIngredients))
        }

        // Sort by match count (descending) - drinks pairing with more ingredients ranked higher
        return suggestions.sorted { $0.matchCount > $1.matchCount }
    }

    /// Search for drinks by name (fuzzy matching)
    func searchDrinks(query: String) -> [DrinkPairing] {
        guard !query.isEmpty else { return [] }

        let lowerQuery = query.lowercased()
        var results: [DrinkPairing] = []

        for pairings in drinkMap.values {
            results.append(contentsOf: pairings.all.filter { $0.name.lowercased().contains(lowerQuery) })
        }

        // Remove duplicates
        let uniqueResults = Array(Dictionary(grouping: results, by: { $0.name }).compactMap { $0.value.first })

        return uniqueResults.sorted { $0.name < $1.name }
    }

    /// Filter drinks by category
    func filterByCategory(_ category: DrinkCategory) -> [DrinkPairing] {
        var results: [DrinkPairing] = []

        for pairings in drinkMap.values {
            switch category {
            case .wines:
                results.append(contentsOf: pairings.wines)
            case .beers:
                results.append(contentsOf: pairings.beers)
            case .spirits:
                results.append(contentsOf: pairings.spirits)
            case .nonAlcoholic:
                if let nonAlcoholic = pairings.nonAlcoholic {
                    results.append(contentsOf: nonAlcoholic)
                }
            }
        }

        // Remove duplicates
        let uniqueResults = Array(Dictionary(grouping: results, by: { $0.name }).compactMap { $0.value.first })

        return uniqueResults.sorted { $0.name < $1.name }
    }

    /// Get database metadata
    var metadata: (version: String, tier: Int, updated: String)? {
        guard let db = database else { return nil }
        return (db.version, db.tier, db.updated)
    }
}
