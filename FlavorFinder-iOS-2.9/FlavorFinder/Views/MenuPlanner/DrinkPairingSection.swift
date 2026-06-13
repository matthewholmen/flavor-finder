//
//  DrinkPairingSection.swift
//  FlavorFinder
//
//  Created on 2026-01-15.
//

import SwiftUI

/// Displays drink pairings for a menu's ingredients
struct DrinkPairingSection: View {
    @EnvironmentObject var appState: AppState

    let menu: Menu

    @State private var isExpanded = false
    @State private var selectedDrinkIndex: Int = 0  // Track which drink is selected (starts with top suggestion)

    // Get top drink suggestions from ALL menu ingredients
    private var topSuggestions: [DrinkSuggestion] {
        // Hide drink pairings in Freeform mode (no featured ingredient)
        guard !(menu.keyIngredients.first ?? "").isEmpty else { return [] }
        guard !menu.dishes.isEmpty else { return [] }

        // Collect all unique ingredients from all dishes
        let allMenuIngredients = menu.dishes.flatMap { $0.allIngredients }
        let uniqueIngredients = Array(Set(allMenuIngredients))

        let allSuggestions = appState.drinkService.getFeaturedPairings(
            featuredIngredient: menu.keyIngredients.first ?? "",
            dishIngredients: uniqueIngredients
        )

        // Filter out generic entries if specific ones exist
        var filtered = filterGenericDrinks(allSuggestions)

        // Filter out non-alcoholic if setting is disabled
        if !appState.showNonAlcoholicPairings {
            filtered = filtered.filter { suggestion in
                // Check if this drink is in the nonAlcoholic category
                if let pairings = appState.drinkService.getPairings(for: menu.keyIngredients.first ?? ""),
                   let nonAlcoholic = pairings.nonAlcoholic {
                    return !nonAlcoholic.contains(where: { $0.name == suggestion.drink.name })
                }
                return true
            }
        }

        // Diversify suggestions: prioritize showing wines, beers, AND spirits
        return diversifySuggestions(filtered)
    }

    /// Filter out generic drink entries (e.g., "Beer, various") if specific types exist
    private func filterGenericDrinks(_ suggestions: [DrinkSuggestion]) -> [DrinkSuggestion] {
        let hasSpecificBeers = suggestions.contains { $0.drink.style != "various" && isaBeer($0.drink) }
        let hasSpecificSpirits = suggestions.contains { isSpirit($0.drink) && $0.drink.style != "mixed" }

        return suggestions.filter { suggestion in
            // Filter out "Beer, various" if we have specific beer types
            if suggestion.drink.name.lowercased() == "beer" && suggestion.drink.style == "various" && hasSpecificBeers {
                return false
            }
            // Filter out generic "Cocktail, mixed" if we have specific spirits
            if suggestion.drink.name.lowercased() == "cocktail" && suggestion.drink.style == "mixed" && hasSpecificSpirits {
                return false
            }
            return true
        }
    }

    /// Diversify suggestions to show a mix of wines, beers, and spirits
    private func diversifySuggestions(_ suggestions: [DrinkSuggestion]) -> [DrinkSuggestion] {
        // Group by drink type
        var wines: [DrinkSuggestion] = []
        var beers: [DrinkSuggestion] = []
        var spirits: [DrinkSuggestion] = []
        var other: [DrinkSuggestion] = []

        for suggestion in suggestions {
            if isaBeer(suggestion.drink) {
                beers.append(suggestion)
            } else if isSpirit(suggestion.drink) {
                spirits.append(suggestion)
            } else if suggestion.drink.style.contains("wine") || isWine(suggestion.drink) {
                wines.append(suggestion)
            } else {
                other.append(suggestion)
            }
        }

        // Build diverse list: top wine, top beer, top spirit, then alternate
        var result: [DrinkSuggestion] = []

        // Add top from each category first
        if let topWine = wines.first { result.append(topWine) }
        if let topBeer = beers.first { result.append(topBeer) }
        if let topSpirit = spirits.first { result.append(topSpirit) }

        // Then alternate through remaining, maintaining match count priority
        let remaining = (Array(wines.dropFirst()) + Array(beers.dropFirst()) + Array(spirits.dropFirst()) + other)
            .sorted { $0.matchCount > $1.matchCount }

        result.append(contentsOf: remaining)

        return result
    }

    private func isaBeer(_ drink: DrinkPairing) -> Bool {
        let beerStyles = ["lager", "ale", "stout", "porter", "pilsner", "wheat", "ipa", "belgian", "amber", "dark", "various"]
        return beerStyles.contains(drink.style.lowercased()) || drink.name.lowercased().contains("beer")
    }

    private func isSpirit(_ drink: DrinkPairing) -> Bool {
        let spiritStyles = ["whiskey", "vodka", "gin", "rum", "tequila", "brandy", "cognac", "bourbon", "sake", "liqueur", "mixed"]
        return spiritStyles.contains(drink.style.lowercased()) || drink.name.lowercased() == "cocktail"
    }

    private func isWine(_ drink: DrinkPairing) -> Bool {
        let wineStyles = ["red", "white", "rosé", "sparkling", "fortified", "sweet"]
        return wineStyles.contains { drink.style.lowercased().contains($0) }
    }

    private var hasSuggestions: Bool {
        !topSuggestions.isEmpty
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: "wineglass")
                            .font(.system(size: 16))
                            .foregroundStyle(AppColors.accent)

                        Text("Drink Pairings")
                            .font(.headline)
                            .foregroundStyle(.primary)

                        if !isExpanded && hasSuggestions {
                            Text("\(topSuggestions.count)")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 2)
                                .background(Color(.tertiarySystemFill))
                                .clipShape(Capsule())
                        }
                    }

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)

            if isExpanded {
                // Check for Freeform mode - hide if no featured ingredient
                if (menu.keyIngredients.first ?? "").isEmpty {
                    // Don't show drink pairings in Freeform mode
                } else if !hasSuggestions {
                    // Empty state
                    VStack(spacing: 8) {
                        Image(systemName: "wineglass.slash")
                            .font(.system(size: 32))
                            .foregroundStyle(.secondary)

                        Text("No drink pairings available")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        Text("No pairings found for \(menu.keyIngredients.first ?? "")")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                } else {
                    VStack(spacing: 12) {
                        // Selected drink card (shows the currently selected drink)
                        if selectedDrinkIndex < topSuggestions.count {
                            TopSuggestionCard(
                                suggestion: topSuggestions[selectedDrinkIndex],
                                isTopSuggestion: selectedDrinkIndex == 0,
                                featuredIngredients: menu.keyIngredients
                            )
                        }

                        // Other suggestions (tappable to select)
                        if topSuggestions.count > 1 {
                            FlowLayout(spacing: 8) {
                                ForEach(Array(topSuggestions.enumerated()), id: \.element.id) { index, suggestion in
                                    if index != selectedDrinkIndex {
                                        Button {
                                            withAnimation {
                                                selectedDrinkIndex = index
                                            }
                                        } label: {
                                            DrinkPillWithCount(
                                                suggestion: suggestion,
                                                isTopSuggestion: index == 0
                                            )
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                            .padding(.horizontal, -4)  // Negative padding for optical alignment
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 6)
    }
}

// MARK: - Top Suggestion Card

struct TopSuggestionCard: View {
    let suggestion: DrinkSuggestion
    let isTopSuggestion: Bool
    let featuredIngredients: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Drink Pill
            HStack(spacing: 6) {
                if isTopSuggestion {
                    Image(systemName: "star.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(AppColors.accent)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(suggestion.drink.name)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if !suggestion.drink.style.isEmpty {
                        Text(suggestion.drink.style)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                Capsule()
                    .fill(Color(.tertiarySystemBackground))
            )
            .overlay(
                Capsule()
                    .stroke(AppColors.accent.opacity(0.3), lineWidth: 1)
            )

            // Matching ingredients with bold featured ingredients
            pairsWithText
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(AppColors.accent.opacity(0.08))
        )
    }

    private var pairsWithText: some View {
        let ingredients = suggestion.matchingIngredients
        let featuredSet = Set(featuredIngredients.map { $0.lowercased() })

        return Text(buildAttributedString(ingredients: ingredients, featuredSet: featuredSet))
            .font(.caption)
            .foregroundStyle(.secondary)
    }

    private func buildAttributedString(ingredients: [String], featuredSet: Set<String>) -> AttributedString {
        var result = AttributedString("Pairs with: ")

        for (index, ingredient) in ingredients.enumerated() {
            var ingredientText = AttributedString(ingredient)

            // Bold if it's a featured ingredient
            if featuredSet.contains(ingredient.lowercased()) {
                ingredientText.font = .caption.bold()
            }

            result += ingredientText

            // Add comma separator except for last ingredient
            if index < ingredients.count - 1 {
                result += AttributedString(", ")
            }
        }

        return result
    }
}

// MARK: - Drink Pill With Count

struct DrinkPillWithCount: View {
    let suggestion: DrinkSuggestion
    let isTopSuggestion: Bool

    var body: some View {
        HStack(spacing: 6) {
            if isTopSuggestion {
                Image(systemName: "star.fill")
                    .font(.system(size: 10))
                    .foregroundStyle(AppColors.accent)
            }

            Text(suggestion.drink.name)
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(
            Capsule()
                .fill(Color(.secondarySystemBackground))
        )
    }
}

#Preview {
    let appState = AppState()
    let menu = Menu(
        name: "Test Menu",
        keyIngredients: ["salmon"],
        dishes: [
            Dish(
                name: "Grilled Salmon",
                keyIngredient: "salmon",
                ingredients: ["lemon", "dill", "olive oil"]
            )
        ]
    )

    ScrollView {
        DrinkPairingSection(menu: menu)
            .padding()
    }
    .environmentObject(appState)
    .task {
        await appState.initialize()
    }
}
