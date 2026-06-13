import Foundation

// MARK: - Test Configuration

/// Test case definition for menu generator validation
struct MenuGeneratorTestCase: Identifiable, Codable {
    let id = UUID()
    let featuredIngredient: String
    let ingredientCategory: String
    let ingredientSubcategory: String
    let dishType: DishType
    let compatibilityMode: MenuConfiguration.MenuCompatibilityMode
    let sampleCount: Int

    var description: String {
        "\(featuredIngredient) → \(dishType.rawValue.capitalized) (\(compatibilityMode.rawValue))"
    }
}

/// Test ingredient definition
struct TestIngredient: Codable {
    let name: String
    let category: String
    let subcategory: String

    static let testSet: [TestIngredient] = [
        // Proteins (4)
        TestIngredient(name: "chicken", category: "Proteins", subcategory: "Poultry"),
        TestIngredient(name: "salmon", category: "Proteins", subcategory: "Fish"),
        TestIngredient(name: "tofu", category: "Proteins", subcategory: "Plant Proteins"),
        TestIngredient(name: "beef", category: "Proteins", subcategory: "Meat"),

        // Vegetables (5)
        TestIngredient(name: "tomato", category: "Vegetables", subcategory: "Fruit Vegetables"),
        TestIngredient(name: "carrot", category: "Vegetables", subcategory: "Roots"),
        TestIngredient(name: "spinach", category: "Vegetables", subcategory: "Leafy Greens"),
        TestIngredient(name: "onion", category: "Vegetables", subcategory: "Allium"),
        TestIngredient(name: "mushroom", category: "Vegetables", subcategory: "Mushrooms"),

        // Fruits (4)
        TestIngredient(name: "lemon", category: "Fruits", subcategory: "Citrus"),
        TestIngredient(name: "apple", category: "Fruits", subcategory: "Pome Fruit"),
        TestIngredient(name: "strawberry", category: "Fruits", subcategory: "Berries"),
        TestIngredient(name: "mango", category: "Fruits", subcategory: "Tropical"),

        // Dairy (3)
        TestIngredient(name: "parmesan", category: "Dairy", subcategory: "Hard Cheese"),
        TestIngredient(name: "heavy cream", category: "Dairy", subcategory: "Milk & Cream"),
        TestIngredient(name: "yogurt", category: "Dairy", subcategory: "Cultured Dairy"),

        // Grains (2)
        TestIngredient(name: "rice", category: "Grains", subcategory: "Rice"),
        TestIngredient(name: "pasta", category: "Grains", subcategory: "Pasta"),

        // Seasonings (3)
        TestIngredient(name: "thyme", category: "Seasonings", subcategory: "Herbs"),
        TestIngredient(name: "cumin", category: "Seasonings", subcategory: "Spices"),
        TestIngredient(name: "basil", category: "Seasonings", subcategory: "Herbs"),

        // Pantry (4)
        TestIngredient(name: "olive oil", category: "Pantry", subcategory: "Oils & Fats"),
        TestIngredient(name: "soy sauce", category: "Pantry", subcategory: "Sauces"),
        TestIngredient(name: "honey", category: "Pantry", subcategory: "Sweeteners"),
        TestIngredient(name: "balsamic vinegar", category: "Pantry", subcategory: "Vinegars"),

        // Alcohol (2)
        TestIngredient(name: "white wine", category: "Alcohol", subcategory: "Wine"),
        TestIngredient(name: "bourbon", category: "Alcohol", subcategory: "Spirits")
    ]
}

// MARK: - Test Results

/// Result of a single dish generation attempt
struct DishGenerationResult: Identifiable, Codable {
    let id = UUID()
    let testCase: MenuGeneratorTestCase
    let sampleNumber: Int
    let success: Bool
    let dish: DishSnapshot?
    let failureReason: String?
    let generationTimeMs: Double

    var ingredientCount: Int {
        dish?.allIngredients.count ?? 0
    }
}

/// Snapshot of a generated dish for testing
struct DishSnapshot: Codable {
    let name: String
    let type: DishType?
    let keyIngredient: String
    let ingredients: [String]
    let tasteProfile: TasteProfile

    var allIngredients: [String] {
        [keyIngredient] + ingredients
    }

    init(from dish: Dish) {
        self.name = dish.name
        self.type = dish.type
        self.keyIngredient = dish.keyIngredient
        self.ingredients = dish.ingredients
        self.tasteProfile = dish.tasteProfile
    }
}

/// Role fulfillment analysis for a dish
struct RoleFulfillmentAnalysis: Codable {
    let dishType: DishType
    let requiredRoles: [CulinaryRole: RoleFulfillment]
    let preferredRoles: [CulinaryRole: RoleFulfillment]
    let optionalRoles: [CulinaryRole: RoleFulfillment]

    var requiredScore: Int {
        requiredRoles.values.filter { $0.filled }.count
    }

    var preferredScore: Int {
        preferredRoles.values.filter { $0.filled }.count
    }

    var optionalScore: Int {
        optionalRoles.values.filter { $0.filled }.count
    }

    var totalScore: Int {
        requiredScore * 3 + preferredScore * 2 + optionalScore * 1
    }

    var maxScore: Int {
        requiredRoles.count * 3 + preferredRoles.count * 2 + optionalRoles.count * 1
    }

    var scorePercentage: Double {
        maxScore > 0 ? Double(totalScore) / Double(maxScore) * 100 : 0
    }

    var passed: Bool {
        scorePercentage >= 60.0
    }
}

struct RoleFulfillment: Codable {
    let role: CulinaryRole
    let required: Bool
    let filled: Bool
    let filledBy: [String]
}

/// Category validation for a dish
struct CategoryValidation: Codable {
    let dishType: DishType
    let hasInvalidCategories: Bool
    let invalidIngredients: [String: String] // ingredient -> reason

    var passed: Bool {
        !hasInvalidCategories
    }
}

/// Aggregated test results for a test case
struct TestCaseResults: Identifiable, Codable {
    let id = UUID()
    let testCase: MenuGeneratorTestCase
    let results: [DishGenerationResult]
    let roleFulfillment: [RoleFulfillmentAnalysis]
    let categoryValidation: [CategoryValidation]

    var successRate: Double {
        let successful = results.filter { $0.success }.count
        return Double(successful) / Double(results.count) * 100
    }

    var avgIngredientCount: Double {
        let counts = results.compactMap { $0.dish?.allIngredients.count }
        guard !counts.isEmpty else { return 0 }
        return Double(counts.reduce(0, +)) / Double(counts.count)
    }

    var avgGenerationTimeMs: Double {
        let times = results.map { $0.generationTimeMs }
        return times.reduce(0, +) / Double(times.count)
    }

    var avgRoleScore: Double {
        let scores = roleFulfillment.map { $0.scorePercentage }
        guard !scores.isEmpty else { return 0 }
        return scores.reduce(0, +) / Double(scores.count)
    }

    var categoryValidationRate: Double {
        let passed = categoryValidation.filter { $0.passed }.count
        return Double(passed) / Double(categoryValidation.count) * 100
    }
}

/// Complete test run results
struct TestRunResults: Codable {
    let timestamp: Date
    let totalTestCases: Int
    let totalSamples: Int
    let testCaseResults: [TestCaseResults]

    var overallSuccessRate: Double {
        let allResults = testCaseResults.flatMap { $0.results }
        let successful = allResults.filter { $0.success }.count
        return Double(successful) / Double(allResults.count) * 100
    }

    var avgRoleScore: Double {
        let scores = testCaseResults.map { $0.avgRoleScore }
        return scores.reduce(0, +) / Double(scores.count)
    }

    var avgCategoryValidation: Double {
        let rates = testCaseResults.map { $0.categoryValidationRate }
        return rates.reduce(0, +) / Double(rates.count)
    }

    // Results grouped by dimension
    func resultsByDishType() -> [DishType: [TestCaseResults]] {
        Dictionary(grouping: testCaseResults) { $0.testCase.dishType }
    }

    func resultsByCategory() -> [String: [TestCaseResults]] {
        Dictionary(grouping: testCaseResults) { $0.testCase.ingredientCategory }
    }

    func resultsByMode() -> [MenuConfiguration.MenuCompatibilityMode: [TestCaseResults]] {
        Dictionary(grouping: testCaseResults) { $0.testCase.compatibilityMode }
    }
}
