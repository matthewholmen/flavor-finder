import Foundation

/// Engine for generating compatible ingredient combinations using backtracking
class CompatibilityEngine {
    private let flavorService: FlavorPairingService
    private let ingredientService: IngredientService
    private let dietaryService: DietaryService

    /// Compatibility mode for generation
    enum Mode: String, CaseIterable, Identifiable, Codable {
        case perfect   // All ingredients must pair with ALL others
        case mixed     // Each must pair with AT LEAST ONE
        case random    // No pairing requirements

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .perfect: return "Perfect"
            case .mixed: return "Mixed"
            case .random: return "Random"
            }
        }

        var description: String {
            switch self {
            case .perfect: return "All ingredients pair with each other"
            case .mixed: return "Each ingredient pairs with at least one other"
            case .random: return "No pairing requirements"
            }
        }
    }

    private let maxAttempts = 200

    init(
        flavorService: FlavorPairingService,
        ingredientService: IngredientService,
        dietaryService: DietaryService
    ) {
        self.flavorService = flavorService
        self.ingredientService = ingredientService
        self.dietaryService = dietaryService
    }

    /// Generate a compatible combination of ingredients
    @MainActor
    func generateCombination(
        targetCount: Int,
        lockedIngredients: [String],
        mode: Mode,
        dietaryRestrictions: Set<DietaryRestriction>
    ) async -> [String] {
        switch mode {
        case .perfect:
            return await generatePerfectCombination(
                targetCount: targetCount,
                lockedIngredients: lockedIngredients,
                dietaryRestrictions: dietaryRestrictions
            )
        case .mixed:
            return await generateMixedCombination(
                targetCount: targetCount,
                lockedIngredients: lockedIngredients,
                dietaryRestrictions: dietaryRestrictions
            )
        case .random:
            return await generateRandomCombination(
                targetCount: targetCount,
                lockedIngredients: lockedIngredients,
                dietaryRestrictions: dietaryRestrictions
            )
        }
    }

    /// Perfect mode: All ingredients must pair with ALL others
    @MainActor
    private func generatePerfectCombination(
        targetCount: Int,
        lockedIngredients: [String],
        dietaryRestrictions: Set<DietaryRestriction>
    ) async -> [String] {
        var globalAttempts = 0

        while globalAttempts < maxAttempts {
            if let result = tryGeneratePerfect(
                targetCount: targetCount,
                lockedIngredients: lockedIngredients,
                dietaryRestrictions: dietaryRestrictions,
                attempts: &globalAttempts
            ) {
                return result
            }
        }

        // Fallback: return locked ingredients if we couldn't find a valid combination
        return lockedIngredients
    }

    @MainActor
    private func tryGeneratePerfect(
        targetCount: Int,
        lockedIngredients: [String],
        dietaryRestrictions: Set<DietaryRestriction>,
        attempts: inout Int
    ) -> [String]? {
        var currentSelection = lockedIngredients
        var triedAtLevel: [[String]: Set<String>] = [:]

        while currentSelection.count < targetCount && attempts < maxAttempts {
            attempts += 1

            // Get pool of ingredients compatible with ALL current selections
            let compatiblePool = getCompatiblePool(
                currentSelection: currentSelection,
                dietaryRestrictions: dietaryRestrictions,
                mode: .perfect
            )

            // Remove already tried ingredients at this level
            let key = currentSelection
            let tried = triedAtLevel[key] ?? []
            let available = compatiblePool.subtracting(tried)

            if available.isEmpty {
                // Backtrack
                if currentSelection.count > lockedIngredients.count {
                    let removed = currentSelection.removeLast()
                    let parentKey = currentSelection
                    triedAtLevel[parentKey, default: []].insert(removed)
                } else {
                    // Can't backtrack further, restart
                    return nil
                }
            } else {
                // Pick random from available
                if let picked = available.randomElement() {
                    currentSelection.append(picked)
                }
            }
        }

        return currentSelection.count == targetCount ? currentSelection : nil
    }

    /// Mixed mode: Each ingredient must pair with AT LEAST ONE other
    @MainActor
    private func generateMixedCombination(
        targetCount: Int,
        lockedIngredients: [String],
        dietaryRestrictions: Set<DietaryRestriction>
    ) async -> [String] {
        var currentSelection = lockedIngredients
        var attempts = 0

        while currentSelection.count < targetCount && attempts < maxAttempts {
            attempts += 1

            let compatiblePool = getCompatiblePool(
                currentSelection: currentSelection,
                dietaryRestrictions: dietaryRestrictions,
                mode: .mixed
            )

            if let picked = compatiblePool.randomElement() {
                currentSelection.append(picked)
            } else {
                // No compatible ingredients found, try random
                if let random = getRandomIngredient(
                    excluding: Set(currentSelection),
                    dietaryRestrictions: dietaryRestrictions
                ) {
                    currentSelection.append(random)
                }
            }
        }

        return currentSelection
    }

    /// Random mode: No pairing requirements
    @MainActor
    private func generateRandomCombination(
        targetCount: Int,
        lockedIngredients: [String],
        dietaryRestrictions: Set<DietaryRestriction>
    ) async -> [String] {
        var currentSelection = lockedIngredients
        var excluded = Set(currentSelection)

        while currentSelection.count < targetCount {
            if let random = getRandomIngredient(
                excluding: excluded,
                dietaryRestrictions: dietaryRestrictions
            ) {
                currentSelection.append(random)
                excluded.insert(random)
            } else {
                break
            }
        }

        return currentSelection
    }

    /// Get pool of compatible ingredients
    @MainActor
    private func getCompatiblePool(
        currentSelection: [String],
        dietaryRestrictions: Set<DietaryRestriction>,
        mode: Mode
    ) -> Set<String> {
        var pool: Set<String>

        if currentSelection.isEmpty {
            pool = flavorService.allIngredients
        } else if mode == .perfect {
            pool = flavorService.getIngredientsCompatibleWithAll(currentSelection)
        } else {
            // Mixed mode: compatible with at least one
            pool = Set<String>()
            for ingredient in currentSelection {
                pool.formUnion(flavorService.getCompatibleIngredients(ingredient))
            }
        }

        // Remove already selected
        pool.subtract(currentSelection.map { $0.lowercased() })

        // Apply dietary restrictions
        pool = Set(dietaryService.filterRestricted(
            ingredients: Array(pool),
            restrictions: dietaryRestrictions
        ))

        return pool
    }

    /// Get a random ingredient not in the excluded set
    @MainActor
    private func getRandomIngredient(
        excluding: Set<String>,
        dietaryRestrictions: Set<DietaryRestriction>
    ) -> String? {
        let excludedLower = Set(excluding.map { $0.lowercased() })
        var available = flavorService.allIngredients.subtracting(excludedLower)

        // Apply dietary restrictions
        available = Set(dietaryService.filterRestricted(
            ingredients: Array(available),
            restrictions: dietaryRestrictions
        ))

        return available.randomElement()
    }

    /// Check if a combination is valid for the given mode
    @MainActor
    func isValidCombination(_ ingredients: [String], mode: Mode) -> Bool {
        guard ingredients.count >= 2 else { return true }

        switch mode {
        case .perfect:
            // All must pair with all
            for i in 0..<ingredients.count {
                for j in (i+1)..<ingredients.count {
                    if !flavorService.areCompatible(ingredients[i], ingredients[j]) {
                        return false
                    }
                }
            }
            return true

        case .mixed:
            // Each must pair with at least one
            for ingredient in ingredients {
                let others = ingredients.filter { $0 != ingredient }
                if !flavorService.isCompatibleWithAny(ingredient, others) {
                    return false
                }
            }
            return true

        case .random:
            return true
        }
    }
}
