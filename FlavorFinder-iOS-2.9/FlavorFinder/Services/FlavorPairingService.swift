import Foundation

/// Service for managing flavor pairings and compatibility lookups
@MainActor
class FlavorPairingService: ObservableObject {
    @Published private(set) var isLoaded = false
    @Published private(set) var pairingCount = 0

    private var flavorMap: [String: Set<String>] = [:]

    enum FlavorPairingError: Error, LocalizedError {
        case fileNotFound
        case decodingFailed
        case invalidFormat

        var errorDescription: String? {
            switch self {
            case .fileNotFound:
                return "Flavor pairings data file not found"
            case .decodingFailed:
                return "Failed to decode flavor pairings"
            case .invalidFormat:
                return "Invalid pairing format in data"
            }
        }
    }

    /// Load pairings from bundled JSON file
    func loadPairings() async throws {
        guard let url = Bundle.main.url(forResource: "flavorPairings", withExtension: "json") else {
            throw FlavorPairingError.fileNotFound
        }

        // Perform heavy I/O and parsing off the main thread
        let (count, map) = try await Task.detached(priority: .userInitiated) {
            let data = try Data(contentsOf: url)
            let pairings = try JSONDecoder().decode([String].self, from: data)

            // Build bidirectional graph - pre-allocate with estimated capacity
            var map: [String: Set<String>] = Dictionary(minimumCapacity: 800)

            for pairing in pairings {
                // Find the comma directly without creating intermediate arrays
                guard let commaIndex = pairing.firstIndex(of: ",") else { continue }

                // Extract and normalize both ingredients in one pass
                let ingredient1 = String(pairing[..<commaIndex]).lowercased()
                let afterComma = pairing.index(after: commaIndex)
                let ingredient2 = String(pairing[afterComma...]).lowercased()

                // Skip if either is empty
                guard !ingredient1.isEmpty, !ingredient2.isEmpty else { continue }

                // Insert into bidirectional map
                if map[ingredient1] == nil {
                    map[ingredient1] = Set([ingredient2])
                } else {
                    map[ingredient1]!.insert(ingredient2)
                }

                if map[ingredient2] == nil {
                    map[ingredient2] = Set([ingredient1])
                } else {
                    map[ingredient2]!.insert(ingredient1)
                }
            }

            return (pairings.count, map)
        }.value

        // Update state on main thread
        flavorMap = map
        pairingCount = count
        isLoaded = true
    }

    /// Get all compatible ingredients for a given ingredient
    func getCompatibleIngredients(_ ingredient: String) -> Set<String> {
        flavorMap[ingredient.lowercased()] ?? []
    }

    /// Check if two ingredients are compatible
    func areCompatible(_ a: String, _ b: String) -> Bool {
        flavorMap[a.lowercased()]?.contains(b.lowercased()) ?? false
    }

    /// Check if an ingredient is compatible with ALL ingredients in the list
    func isCompatibleWithAll(_ ingredient: String, _ ingredients: [String]) -> Bool {
        let lower = ingredient.lowercased()
        return ingredients.allSatisfy { areCompatible(lower, $0) }
    }

    /// Check if an ingredient is compatible with AT LEAST ONE ingredient in the list
    func isCompatibleWithAny(_ ingredient: String, _ ingredients: [String]) -> Bool {
        guard !ingredients.isEmpty else { return true }
        let lower = ingredient.lowercased()
        return ingredients.contains { areCompatible(lower, $0) }
    }

    /// Get ingredients compatible with all provided ingredients
    func getIngredientsCompatibleWithAll(_ ingredients: [String]) -> Set<String> {
        guard !ingredients.isEmpty else { return Set(flavorMap.keys) }

        // Start with compatible ingredients from the first ingredient
        var result = getCompatibleIngredients(ingredients[0])

        // Intersect with compatible sets from remaining ingredients
        for ingredient in ingredients.dropFirst() {
            let compatible = getCompatibleIngredients(ingredient)
            result = result.intersection(compatible)
        }

        // Remove already selected ingredients
        let selected = Set(ingredients.map { $0.lowercased() })
        return result.subtracting(selected)
    }

    /// Get all unique ingredients in the database
    var allIngredients: Set<String> {
        Set(flavorMap.keys)
    }

    /// Count of unique ingredients
    var ingredientCount: Int {
        flavorMap.count
    }
}
