import Foundation

/// Service for managing ingredient profiles and metadata
@MainActor
class IngredientService: ObservableObject {
    @Published private(set) var isLoaded = false
    @Published private(set) var profiles: [IngredientProfile] = []

    private var profileMap: [String: IngredientProfile] = [:]
    private var categoryMap: [Category: [IngredientProfile]] = [:]
    private var subcategoryMap: [String: [IngredientProfile]] = [:]

    enum IngredientServiceError: Error, LocalizedError {
        case fileNotFound
        case decodingFailed

        var errorDescription: String? {
            switch self {
            case .fileNotFound:
                return "Ingredient profiles data file not found"
            case .decodingFailed:
                return "Failed to decode ingredient profiles"
            }
        }
    }

    /// Load profiles from bundled JSON file
    func loadProfiles() async throws {
        guard let url = Bundle.main.url(forResource: "ingredientProfiles", withExtension: "json") else {
            throw IngredientServiceError.fileNotFound
        }

        // Perform heavy I/O and parsing off the main thread
        let (uniqueProfiles, pMap, cMap, sMap) = try await Task.detached(priority: .userInitiated) {
            let data = try Data(contentsOf: url)
            let decoded = try JSONDecoder().decode([IngredientProfile].self, from: data)

            // Deduplicate by name (keep first occurrence)
            var seenNames = Set<String>(minimumCapacity: decoded.count)
            var uniqueProfiles: [IngredientProfile] = []
            uniqueProfiles.reserveCapacity(decoded.count)

            for profile in decoded {
                let key = profile.name.lowercased()
                if !seenNames.contains(key) {
                    seenNames.insert(key)
                    uniqueProfiles.append(profile)
                }
            }

            // Build lookup maps with pre-allocated capacity
            var pMap: [String: IngredientProfile] = Dictionary(minimumCapacity: uniqueProfiles.count)
            var cMap: [Category: [IngredientProfile]] = [:]
            var sMap: [String: [IngredientProfile]] = [:]

            for profile in uniqueProfiles {
                pMap[profile.name.lowercased()] = profile

                if let category = profile.categoryEnum {
                    if cMap[category] == nil {
                        cMap[category] = [profile]
                    } else {
                        cMap[category]!.append(profile)
                    }
                }

                let subKey = "\(profile.category):\(profile.subcategory)"
                if sMap[subKey] == nil {
                    sMap[subKey] = [profile]
                } else {
                    sMap[subKey]!.append(profile)
                }
            }

            return (uniqueProfiles, pMap, cMap, sMap)
        }.value

        // Update state on main thread
        profiles = uniqueProfiles
        profileMap = pMap
        categoryMap = cMap
        subcategoryMap = sMap
        isLoaded = true
    }

    /// Get profile for an ingredient by name
    func getProfile(_ name: String) -> IngredientProfile? {
        profileMap[name.lowercased()]
    }

    /// Get profiles for a category
    func getProfiles(for category: Category) -> [IngredientProfile] {
        categoryMap[category] ?? []
    }

    /// Get profiles for a subcategory
    func getProfiles(category: String, subcategory: String) -> [IngredientProfile] {
        subcategoryMap["\(category):\(subcategory)"] ?? []
    }

    /// Get all subcategories for a category
    func getSubcategories(for category: Category) -> [String] {
        let profiles = categoryMap[category] ?? []
        return Array(Set(profiles.map(\.subcategory))).sorted()
    }

    /// Search profiles by name
    func search(_ query: String) -> [IngredientProfile] {
        guard !query.isEmpty else { return profiles }

        let normalizedQuery = query.lowercased()
            .folding(options: .diacriticInsensitive, locale: .current)

        return profiles.filter { profile in
            let normalizedName = profile.name.lowercased()
                .folding(options: .diacriticInsensitive, locale: .current)

            return normalizedName.contains(normalizedQuery) ||
                   profile.category.lowercased().contains(normalizedQuery) ||
                   profile.subcategory.lowercased().contains(normalizedQuery)
        }
    }

    /// Get taste profile for multiple ingredients
    func getCombinedTasteProfile(_ ingredientNames: [String]) -> TasteProfile {
        let ingredientProfiles = ingredientNames.compactMap { getProfile($0) }
        return TasteProfile.average(ingredientProfiles.map(\.flavorProfile))
    }

    /// Get random ingredient from a category
    func getRandomIngredient(from category: Category? = nil) -> IngredientProfile? {
        let pool: [IngredientProfile]
        if let category = category {
            pool = categoryMap[category] ?? []
        } else {
            pool = profiles
        }
        return pool.randomElement()
    }

    /// All unique categories in the database
    var allCategories: [Category] {
        Array(categoryMap.keys).sorted { $0.rawValue < $1.rawValue }
    }

    /// Total count of profiles
    var count: Int {
        profiles.count
    }
}
