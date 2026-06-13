import Foundation

/// Service for checking dietary restrictions
@MainActor
class DietaryService {
    private let ingredientService: IngredientService

    init(ingredientService: IngredientService) {
        self.ingredientService = ingredientService
    }

    /// Check if an ingredient is restricted by dietary settings
    func isRestricted(
        ingredient: String,
        restrictions: Set<DietaryRestriction>
    ) -> Bool {
        guard !restrictions.isEmpty else { return false }

        let lowerIngredient = ingredient.lowercased()

        // Check special ingredient-based restrictions
        if restrictions.contains(.nutFree) {
            if DietaryIngredientLists.nutIngredients.contains(lowerIngredient) {
                return true
            }
        }

        if restrictions.contains(.nightshadeFree) {
            if DietaryIngredientLists.nightshadeIngredients.contains(lowerIngredient) {
                return true
            }
        }

        if restrictions.contains(.lowFodmap) {
            if DietaryIngredientLists.highFodmapIngredients.contains(lowerIngredient) {
                return true
            }
        }

        // Check category-based restrictions
        guard let profile = ingredientService.getProfile(ingredient) else {
            return false
        }

        for restriction in restrictions {
            for (category, subcategory) in restriction.excludedCategories {
                if profile.category.lowercased() == category.lowercased() &&
                   profile.subcategory.lowercased() == subcategory.lowercased() {
                    return true
                }
            }
        }

        return false
    }

    /// Filter out restricted ingredients from a list
    func filterRestricted(
        ingredients: [String],
        restrictions: Set<DietaryRestriction>
    ) -> [String] {
        guard !restrictions.isEmpty else { return ingredients }
        return ingredients.filter { !isRestricted(ingredient: $0, restrictions: restrictions) }
    }

    /// Filter profiles by dietary restrictions
    func filterProfiles(
        _ profiles: [IngredientProfile],
        restrictions: Set<DietaryRestriction>
    ) -> [IngredientProfile] {
        guard !restrictions.isEmpty else { return profiles }
        return profiles.filter { !isRestricted(ingredient: $0.name, restrictions: restrictions) }
    }

    /// Check if an ingredient is a nut
    func isNut(_ ingredient: String) -> Bool {
        DietaryIngredientLists.nutIngredients.contains(ingredient.lowercased())
    }

    /// Check if an ingredient is a nightshade
    func isNightshade(_ ingredient: String) -> Bool {
        DietaryIngredientLists.nightshadeIngredients.contains(ingredient.lowercased())
    }

    /// Check if an ingredient is high-FODMAP
    func isHighFodmap(_ ingredient: String) -> Bool {
        DietaryIngredientLists.highFodmapIngredients.contains(ingredient.lowercased())
    }
}
