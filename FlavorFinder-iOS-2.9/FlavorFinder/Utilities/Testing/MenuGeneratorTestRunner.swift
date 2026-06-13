import Foundation

/// Automated test runner for menu generator validation
@MainActor
class MenuGeneratorTestRunner: ObservableObject {
    @Published var isRunning = false
    @Published var progress: Double = 0
    @Published var currentTest: String = ""
    @Published var completedTests: Int = 0
    @Published var totalTests: Int = 0

    private let menuGenerator: MenuGenerator
    private let ingredientService: IngredientService

    init(menuGenerator: MenuGenerator, ingredientService: IngredientService) {
        self.menuGenerator = menuGenerator
        self.ingredientService = ingredientService
    }

    // MARK: - Test Execution

    /// Run full test suite
    func runFullTestSuite(samplesPerCase: Int = 10) async -> TestRunResults {
        isRunning = true
        progress = 0
        completedTests = 0

        // Generate all test cases
        let testCases = generateTestCases(samplesPerCase: samplesPerCase)
        totalTests = testCases.count

        var allResults: [TestCaseResults] = []

        for testCase in testCases {
            currentTest = testCase.description
            let results = await runTestCase(testCase)
            allResults.append(results)

            completedTests += 1
            progress = Double(completedTests) / Double(totalTests)
        }

        isRunning = false

        return TestRunResults(
            timestamp: Date(),
            totalTestCases: testCases.count,
            totalSamples: testCases.reduce(0) { $0 + $1.sampleCount },
            testCaseResults: allResults
        )
    }

    /// Run a specific test case
    func runTestCase(_ testCase: MenuGeneratorTestCase) async -> TestCaseResults {
        var results: [DishGenerationResult] = []
        var roleFulfillment: [RoleFulfillmentAnalysis] = []
        var categoryValidation: [CategoryValidation] = []

        for sampleNum in 1...testCase.sampleCount {
            let result = await generateDish(testCase: testCase, sampleNumber: sampleNum)
            results.append(result)

            // Analyze successful dishes
            if let dish = result.dish {
                let roleAnalysis = analyzeRoleFulfillment(dish: dish, dishType: testCase.dishType)
                roleFulfillment.append(roleAnalysis)

                let categoryCheck = validateCategories(dish: dish, dishType: testCase.dishType)
                categoryValidation.append(categoryCheck)
            }
        }

        return TestCaseResults(
            testCase: testCase,
            results: results,
            roleFulfillment: roleFulfillment,
            categoryValidation: categoryValidation
        )
    }

    // MARK: - Dish Generation

    private func generateDish(testCase: MenuGeneratorTestCase, sampleNumber: Int) async -> DishGenerationResult {
        let startTime = Date()

        let dish = menuGenerator.generateDishWithFormula(
            type: testCase.dishType,
            keyIngredient: testCase.featuredIngredient,
            restrictions: [],
            compatibilityMode: testCase.compatibilityMode,
            includeKeyIngredient: false
        )

        let endTime = Date()
        let generationTimeMs = endTime.timeIntervalSince(startTime) * 1000

        if let dish = dish {
            return DishGenerationResult(
                testCase: testCase,
                sampleNumber: sampleNumber,
                success: true,
                dish: DishSnapshot(from: dish),
                failureReason: nil,
                generationTimeMs: generationTimeMs
            )
        } else {
            return DishGenerationResult(
                testCase: testCase,
                sampleNumber: sampleNumber,
                success: false,
                dish: nil,
                failureReason: "Generation returned nil",
                generationTimeMs: generationTimeMs
            )
        }
    }

    // MARK: - Analysis

    /// Analyze role fulfillment for a dish
    private func analyzeRoleFulfillment(dish: DishSnapshot, dishType: DishType) -> RoleFulfillmentAnalysis {
        let requirements = getRoleRequirements(for: dishType)
        let ingredientRoles = getIngredientsWithRoles(dish.allIngredients)

        var requiredRoles: [CulinaryRole: RoleFulfillment] = [:]
        var preferredRoles: [CulinaryRole: RoleFulfillment] = [:]
        var optionalRoles: [CulinaryRole: RoleFulfillment] = [:]

        for (role, priority) in requirements {
            let filledBy = ingredientRoles.filter { $0.roles.contains(role) }.map { $0.name }
            let fulfillment = RoleFulfillment(
                role: role,
                required: priority == .required,
                filled: !filledBy.isEmpty,
                filledBy: filledBy
            )

            switch priority {
            case .required:
                requiredRoles[role] = fulfillment
            case .preferred:
                preferredRoles[role] = fulfillment
            case .optional:
                optionalRoles[role] = fulfillment
            }
        }

        return RoleFulfillmentAnalysis(
            dishType: dishType,
            requiredRoles: requiredRoles,
            preferredRoles: preferredRoles,
            optionalRoles: optionalRoles
        )
    }

    /// Validate that dish doesn't contain invalid categories
    private func validateCategories(dish: DishSnapshot, dishType: DishType) -> CategoryValidation {
        let excludedCategories = getExcludedCategories(for: dishType)
        var invalidIngredients: [String: String] = [:]

        for ingredient in dish.allIngredients {
            guard let profile = ingredientService.getProfile(ingredient),
                  let category = Category(rawValue: profile.category) else {
                continue
            }

            if excludedCategories.contains(category) {
                invalidIngredients[ingredient] = "Invalid category '\(category.rawValue)' for \(dishType.rawValue)"
            }
        }

        return CategoryValidation(
            dishType: dishType,
            hasInvalidCategories: !invalidIngredients.isEmpty,
            invalidIngredients: invalidIngredients
        )
    }

    // MARK: - Role Mapping

    /// Get role requirements for each dish type
    private func getRoleRequirements(for dishType: DishType) -> [CulinaryRole: DishPriority] {
        switch dishType {
        case .entree:
            return [
                .main: .required,
                .aromatic: .preferred,
                .fat: .preferred,
                .supporting: .optional
            ]
        case .side:
            return [
                .main: .required,
                .aromatic: .preferred,
                .fat: .optional
            ]
        case .salad:
            return [
                .supporting: .required,  // leafy greens
                .fat: .preferred,
                .acid: .preferred
            ]
        case .dessert:
            return [
                .sweetener: .required,
                .main: .preferred,
                .fat: .preferred,
                .aromatic: .optional
            ]
        case .beverage:
            return [
                .main: .required,  // alcohol
                .aromatic: .optional,
                .acid: .optional
            ]
        case .sauce:
            return [
                .fat: .preferred,
                .aromatic: .preferred,
                .acid: .optional,
                .liquid: .optional
            ]
        }
    }

    /// Get excluded categories for each dish type
    private func getExcludedCategories(for dishType: DishType) -> [Category] {
        switch dishType {
        case .dessert:
            return [.proteins, .vegetables]
        case .beverage:
            return [.proteins, .vegetables]
        default:
            return []
        }
    }

    /// Infer roles for ingredients (mirrors MenuGenerator's inferRoles logic)
    private func getIngredientsWithRoles(_ ingredients: [String]) -> [(name: String, roles: [CulinaryRole])] {
        ingredients.compactMap { name -> (String, [CulinaryRole])? in
            guard let profile = ingredientService.getProfile(name) else { return nil }

            // Use explicit roles if available
            if let primaryRoles = profile.primaryRoles, !primaryRoles.isEmpty {
                let allRoles = primaryRoles + (profile.secondaryRoles ?? [])
                return (name, allRoles)
            }

            // Otherwise infer from category/subcategory
            var roles: [CulinaryRole] = []

            switch (profile.category, profile.subcategory) {
            case ("Proteins", _):
                roles.append(.main)

            case ("Vegetables", "Allium"):
                roles.append(.aromatic)
                roles.append(.supporting)
            case ("Vegetables", "Leafy Greens"):
                roles.append(.supporting)
            case ("Vegetables", _):
                roles.append(.supporting)
                if profile.flavorProfile.sour > 4 {
                    roles.append(.acid)
                }

            case ("Fruits", "Citrus"):
                roles.append(.acid)
                roles.append(.supporting)
            case ("Fruits", _):
                roles.append(.supporting)
                if profile.flavorProfile.sweet > 6 {
                    roles.append(.sweetener)
                }
                if profile.flavorProfile.sour > 5 {
                    roles.append(.acid)
                }

            case ("Dairy", "Hard Cheese"), ("Dairy", "Soft Cheese"):
                roles.append(.fat)
                roles.append(.supporting)
            case ("Dairy", "Cultured Dairy"):
                roles.append(.fat)
                roles.append(.supporting)
                if profile.flavorProfile.sour > 3 {
                    roles.append(.acid)
                }
            case ("Dairy", "Milk & Cream"):
                roles.append(.fat)
                roles.append(.supporting)

            case ("Seasonings", "Herbs"):
                roles.append(.aromatic)
                roles.append(.seasoning)
            case ("Seasonings", "Spices"):
                roles.append(.seasoning)
                if profile.flavorProfile.aromatic > 5 {
                    roles.append(.aromatic)
                }
            case ("Seasonings", "Chilis"):
                roles.append(.seasoning)

            case ("Pantry", "Oils & Fats"):
                roles.append(.fat)
            case ("Pantry", "Vinegars"):
                roles.append(.acid)
            case ("Pantry", "Stocks"):
                roles.append(.liquid)
            case ("Pantry", "Sauces"):
                roles.append(.supporting)
                if profile.flavorProfile.sour > 3 {
                    roles.append(.acid)
                }
            case ("Pantry", "Sweeteners"):
                roles.append(.sweetener)
            case ("Pantry", _):
                roles.append(.supporting)

            case ("Grains", _):
                roles.append(.main)
                roles.append(.supporting)

            case ("Alcohol", _):
                roles.append(.liquid)
                roles.append(.supporting)

            default:
                roles.append(.supporting)
            }

            return (name, roles)
        }
    }

    // MARK: - Test Case Generation

    /// Generate all test cases
    private func generateTestCases(samplesPerCase: Int) -> [MenuGeneratorTestCase] {
        var cases: [MenuGeneratorTestCase] = []

        let modes: [MenuConfiguration.MenuCompatibilityMode] = [.flexible, .strict]
        let dishTypes = DishType.allCases

        for testIngredient in TestIngredient.testSet {
            for dishType in dishTypes {
                for mode in modes {
                    let testCase = MenuGeneratorTestCase(
                        featuredIngredient: testIngredient.name,
                        ingredientCategory: testIngredient.category,
                        ingredientSubcategory: testIngredient.subcategory,
                        dishType: dishType,
                        compatibilityMode: mode,
                        sampleCount: samplesPerCase
                    )
                    cases.append(testCase)
                }
            }
        }

        return cases
    }
}
