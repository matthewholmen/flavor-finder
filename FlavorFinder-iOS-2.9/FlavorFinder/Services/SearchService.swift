import Foundation

/// Search and filtering service for ingredients
class SearchService {
    private let ingredientService: IngredientService
    private let flavorService: FlavorPairingService
    private let dietaryService: DietaryService

    init(
        ingredientService: IngredientService,
        flavorService: FlavorPairingService,
        dietaryService: DietaryService
    ) {
        self.ingredientService = ingredientService
        self.flavorService = flavorService
        self.dietaryService = dietaryService
    }

    /// Search ingredients with full filtering
    /// - Parameters:
    ///   - query: Search text
    ///   - filters: Category, taste, and dietary filters
    ///   - compatibleWith: List of ingredients to filter compatibility against
    ///   - includeCompatibleWithIngredients: If true, the compatibleWith ingredients themselves are also included in results
    ///   - requirePerfectMatch: If true, require compatibility with ALL ingredients; if false, require compatibility with ANY
    @MainActor
    func search(
        query: String,
        filters: FilterState,
        compatibleWith: [String] = [],
        includeCompatibleWithIngredients: Bool = false,
        requirePerfectMatch: Bool = true
    ) -> [SearchResult] {
        var profiles = ingredientService.profiles

        // Filter by category
        if let category = filters.activeCategory {
            profiles = profiles.filter { $0.categoryEnum == category }

            // Filter by subcategories if specified
            if !filters.selectedSubcategories.isEmpty {
                profiles = profiles.filter { filters.selectedSubcategories.contains($0.subcategory) }
            }
        }

        // Filter by taste thresholds
        for (dimension, threshold) in filters.tasteFilters {
            profiles = profiles.filter { $0.flavorProfile.value(for: dimension) >= threshold }
        }

        // Filter by dietary restrictions
        if !filters.dietaryRestrictions.isEmpty {
            profiles = dietaryService.filterProfiles(profiles, restrictions: filters.dietaryRestrictions)
        }

        // Filter by pantry level
        if filters.pantryFilter != .all {
            profiles = profiles.filter { filters.pantryFilter.includes($0.pantryLevel) }
        }

        // Filter by compatibility
        if !compatibleWith.isEmpty {
            let compatibleWithSet = Set(compatibleWith.map { $0.lowercased() })
            if requirePerfectMatch {
                let compatible = flavorService.getIngredientsCompatibleWithAll(compatibleWith)
                profiles = profiles.filter { profile in
                    let nameLower = profile.name.lowercased()
                    // Include if it's compatible OR if it's one of the compatibleWith ingredients (when includeCompatibleWithIngredients is true)
                    return compatible.contains(nameLower) || (includeCompatibleWithIngredients && compatibleWithSet.contains(nameLower))
                }
            } else {
                profiles = profiles.filter { profile in
                    let nameLower = profile.name.lowercased()
                    return flavorService.isCompatibleWithAny(profile.name, compatibleWith) || (includeCompatibleWithIngredients && compatibleWithSet.contains(nameLower))
                }
            }
        }

        // Apply text search
        let results: [SearchResult]
        if query.isEmpty {
            results = profiles.map { SearchResult(profile: $0, matchType: .none) }
        } else {
            results = searchWithScoring(query: query, profiles: profiles)
        }

        // Sort by match type, then alphabetically
        return results.sorted { a, b in
            if a.matchType != b.matchType {
                return a.matchType.sortOrder < b.matchType.sortOrder
            }
            return a.profile.name < b.profile.name
        }
    }

    /// Search with match type scoring
    private func searchWithScoring(query: String, profiles: [IngredientProfile]) -> [SearchResult] {
        let normalizedQuery = normalizeText(query)
        var results: [SearchResult] = []

        for profile in profiles {
            let normalizedName = normalizeText(profile.name)
            let normalizedCategory = normalizeText(profile.category)
            let normalizedSubcategory = normalizeText(profile.subcategory)

            // Check for exact match
            if normalizedName == normalizedQuery {
                results.append(SearchResult(profile: profile, matchType: .exact))
                continue
            }

            // Check for prefix match
            if normalizedName.hasPrefix(normalizedQuery) {
                results.append(SearchResult(profile: profile, matchType: .prefix))
                continue
            }

            // Check for word prefix match
            let words = normalizedName.split(separator: " ").map(String.init)
            if words.contains(where: { $0.hasPrefix(normalizedQuery) }) {
                results.append(SearchResult(profile: profile, matchType: .wordPrefix))
                continue
            }

            // Check for contains match
            if normalizedName.contains(normalizedQuery) {
                results.append(SearchResult(profile: profile, matchType: .contains))
                continue
            }

            // Check for category/subcategory match
            if normalizedCategory.contains(normalizedQuery) ||
               normalizedSubcategory.contains(normalizedQuery) {
                results.append(SearchResult(profile: profile, matchType: .category))
                continue
            }
        }

        return results
    }

    /// Normalize text for search comparison
    private func normalizeText(_ text: String) -> String {
        text.lowercased()
            .folding(options: .diacriticInsensitive, locale: .current)
    }

    /// Get suggestions based on current selection
    @MainActor
    func getSuggestions(
        forSelection selection: [String],
        filters: FilterState,
        limit: Int = 20
    ) -> [IngredientProfile] {
        guard !selection.isEmpty else {
            return ingredientService.profiles.prefix(limit).map { $0 }
        }

        let compatible = flavorService.getIngredientsCompatibleWithAll(selection)
        var profiles = ingredientService.profiles.filter {
            compatible.contains($0.name.lowercased())
        }

        // Apply dietary restrictions
        if !filters.dietaryRestrictions.isEmpty {
            profiles = dietaryService.filterProfiles(profiles, restrictions: filters.dietaryRestrictions)
        }

        // Apply pantry filter
        if filters.pantryFilter != .all {
            profiles = profiles.filter { filters.pantryFilter.includes($0.pantryLevel) }
        }

        // Sort by variety (different categories from current selection)
        let selectedCategories = Set(selection.compactMap { ingredientService.getProfile($0)?.category })

        return profiles
            .sorted { a, b in
                let aIsNew = !selectedCategories.contains(a.category)
                let bIsNew = !selectedCategories.contains(b.category)
                if aIsNew != bIsNew {
                    return aIsNew
                }
                return a.name < b.name
            }
            .prefix(limit)
            .map { $0 }
    }
}

/// Search result with match type for sorting
struct SearchResult: Identifiable {
    let id = UUID()
    let profile: IngredientProfile
    let matchType: MatchType

    enum MatchType: Int, Comparable {
        case exact = 0
        case prefix = 1
        case wordPrefix = 2
        case contains = 3
        case category = 4
        case none = 5

        var sortOrder: Int { rawValue }

        static func < (lhs: MatchType, rhs: MatchType) -> Bool {
            lhs.rawValue < rhs.rawValue
        }
    }
}

/// Filter state for search
struct FilterState: Equatable {
    var activeCategory: Category?
    var selectedSubcategories: Set<String> = []
    var tasteFilters: [TasteDimension: Double] = [:]
    var dietaryRestrictions: Set<DietaryRestriction> = []
    var pantryFilter: PantryFilterMode = .all
    var searchTerm: String = ""

    var hasActiveFilters: Bool {
        activeCategory != nil ||
        !selectedSubcategories.isEmpty ||
        !tasteFilters.isEmpty ||
        !dietaryRestrictions.isEmpty ||
        pantryFilter != .all
    }

    var activeFilterCount: Int {
        var count = 0
        if activeCategory != nil { count += 1 }
        count += selectedSubcategories.count
        count += tasteFilters.count
        count += dietaryRestrictions.count
        if pantryFilter != .all { count += 1 }
        return count
    }

    mutating func reset() {
        activeCategory = nil
        selectedSubcategories = []
        tasteFilters = [:]
        dietaryRestrictions = []
        pantryFilter = .all
        searchTerm = ""
    }

    static let empty = FilterState()
}
