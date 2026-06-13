import Foundation

/// Service for analyzing taste profiles and generating suggestions
class TasteAnalyzer {
    private let ingredientService: IngredientService
    private let flavorService: FlavorPairingService

    /// Complementary taste pairs that enhance each other
    static let complementaryPairs: [(TasteDimension, TasteDimension)] = [
        (.sweet, .salty),
        (.sour, .sweet),
        (.aromatic, .sweet),
        (.umami, .salty),
        (.spicy, .sweet),
        (.fat, .salty)
    ]

    /// Taste dimensions that complement each taste
    static let complements: [TasteDimension: [TasteDimension]] = [
        .sour: [.sweet, .fat],
        .sweet: [.sour, .aromatic],
        .aromatic: [.sweet, .fat],
        .salty: [.fat, .umami],
        .umami: [.salty, .sour],
        .fat: [.salty, .sour],
        .spicy: [.fat, .sweet]
    ]

    init(ingredientService: IngredientService, flavorService: FlavorPairingService) {
        self.ingredientService = ingredientService
        self.flavorService = flavorService
    }

    /// Analyze taste profile for a set of ingredients
    @MainActor
    func analyze(ingredients: [String]) -> TasteAnalysis {
        let profiles = ingredients.compactMap { ingredientService.getProfile($0) }

        guard !profiles.isEmpty else {
            return TasteAnalysis(
                baseProfile: .zero,
                enhancedProfile: .zero,
                balanceScore: 0,
                dominantTastes: [],
                suggestions: []
            )
        }

        // Calculate base average profile
        let baseProfile = TasteProfile.average(profiles.map(\.flavorProfile))

        // Apply complementary enhancements
        let enhancedProfile = applyEnhancements(baseProfile)

        // Calculate balance score
        let balanceScore = calculateBalanceScore(enhancedProfile, ingredientCount: profiles.count)

        // Find dominant tastes
        let dominantTastes = findDominantTastes(enhancedProfile, ingredientCount: profiles.count)

        // Generate suggestions
        let suggestions = generateSuggestions(
            enhancedProfile: enhancedProfile,
            currentIngredients: ingredients,
            dominantTastes: dominantTastes
        )

        return TasteAnalysis(
            baseProfile: baseProfile,
            enhancedProfile: enhancedProfile,
            balanceScore: balanceScore,
            dominantTastes: dominantTastes,
            suggestions: suggestions
        )
    }

    /// Apply taste enhancements based on complementary pairs
    private func applyEnhancements(_ profile: TasteProfile) -> TasteProfile {
        var enhanced = profile

        for (taste1, taste2) in Self.complementaryPairs {
            let value1 = profile.value(for: taste1)
            let value2 = profile.value(for: taste2)

            // If both tastes are present (> 2), enhance each slightly
            if value1 > 2 && value2 > 2 {
                let boost = min(value1, value2) * 0.15
                enhanced.setValue(min(10, enhanced.value(for: taste1) + boost), for: taste1)
                enhanced.setValue(min(10, enhanced.value(for: taste2) + boost), for: taste2)
            }
        }

        return enhanced
    }

    /// Calculate balance score (0-100)
    private func calculateBalanceScore(_ profile: TasteProfile, ingredientCount: Int) -> Double {
        // Lower variance = better balance
        let variance = profile.variance

        // Scale based on ingredient count (more ingredients = harder to balance)
        let scaleFactor = 1.0 + (Double(ingredientCount) * 0.05)

        // Convert variance to score (lower variance = higher score)
        let maxVariance = 25.0 // Approximate max possible variance
        let normalizedVariance = min(variance / maxVariance, 1.0)

        return (1.0 - normalizedVariance) * 100 / scaleFactor
    }

    /// Find dominant tastes based on thresholds
    private func findDominantTastes(_ profile: TasteProfile, ingredientCount: Int) -> [TasteDimension] {
        // Adaptive threshold based on ingredient count
        let threshold = max(5.0 - (Double(ingredientCount) * 0.4), 3.0)

        return TasteDimension.allCases.filter { dimension in
            profile.value(for: dimension) >= threshold
        }
    }

    /// Generate suggestions to improve balance
    @MainActor
    private func generateSuggestions(
        enhancedProfile: TasteProfile,
        currentIngredients: [String],
        dominantTastes: [TasteDimension]
    ) -> [TasteSuggestion] {
        var suggestions: [TasteSuggestion] = []

        // Find weak dimensions that could be enhanced
        let weakDimensions = TasteDimension.allCases.filter {
            enhancedProfile.value(for: $0) < 3.0
        }

        // For each weak dimension, suggest complementary ingredients
        for dimension in weakDimensions.prefix(3) {
            if let ingredientSuggestions = findIngredientsForTaste(
                dimension: dimension,
                compatibleWith: currentIngredients,
                limit: 3
            ) {
                suggestions.append(TasteSuggestion(
                    dimension: dimension,
                    reason: .enhance,
                    suggestedIngredients: ingredientSuggestions
                ))
            }
        }

        // If there's a very dominant taste (>7), suggest balancing
        for dominant in dominantTastes where enhancedProfile.value(for: dominant) > 7 {
            if let complements = Self.complements[dominant] {
                for complement in complements where enhancedProfile.value(for: complement) < 4 {
                    if let ingredientSuggestions = findIngredientsForTaste(
                        dimension: complement,
                        compatibleWith: currentIngredients,
                        limit: 2
                    ) {
                        suggestions.append(TasteSuggestion(
                            dimension: complement,
                            reason: .balance(dominant),
                            suggestedIngredients: ingredientSuggestions
                        ))
                    }
                }
            }
        }

        return suggestions
    }

    /// Find ingredients strong in a taste dimension that are compatible
    @MainActor
    private func findIngredientsForTaste(
        dimension: TasteDimension,
        compatibleWith: [String],
        limit: Int
    ) -> [String]? {
        let compatible = flavorService.getIngredientsCompatibleWithAll(compatibleWith)

        let candidates = ingredientService.profiles
            .filter { compatible.contains($0.name.lowercased()) }
            .filter { $0.flavorProfile.value(for: dimension) >= 5 }
            .sorted { $0.flavorProfile.value(for: dimension) > $1.flavorProfile.value(for: dimension) }
            .prefix(limit)
            .map(\.name)

        return candidates.isEmpty ? nil : Array(candidates)
    }
}

/// Complete taste analysis result
struct TasteAnalysis {
    let baseProfile: TasteProfile
    let enhancedProfile: TasteProfile
    let balanceScore: Double
    let dominantTastes: [TasteDimension]
    let suggestions: [TasteSuggestion]

    var balanceCategory: BalanceCategory {
        switch balanceScore {
        case 80...: return .excellent
        case 60..<80: return .good
        case 40..<60: return .fair
        default: return .poor
        }
    }

    enum BalanceCategory {
        case excellent, good, fair, poor

        var displayName: String {
            switch self {
            case .excellent: return "Excellent"
            case .good: return "Good"
            case .fair: return "Fair"
            case .poor: return "Needs Balance"
            }
        }

        var color: String {
            switch self {
            case .excellent: return "green"
            case .good: return "blue"
            case .fair: return "yellow"
            case .poor: return "red"
            }
        }
    }
}

/// A suggestion for improving taste balance
struct TasteSuggestion: Identifiable {
    let id = UUID()
    let dimension: TasteDimension
    let reason: Reason
    let suggestedIngredients: [String]

    enum Reason {
        case enhance
        case balance(TasteDimension)

        var description: String {
            switch self {
            case .enhance:
                return "Add to enhance flavor"
            case .balance(let dominant):
                return "Add to balance \(dominant.displayName.lowercased())"
            }
        }
    }
}
