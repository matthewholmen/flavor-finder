import SwiftUI
import SwiftData

@main
struct FlavorFinderApp: App {
    // MARK: - State

    @StateObject private var appState = AppState()

    // MARK: - SwiftData

    let sharedModelContainer: ModelContainer

    init() {
        let schema = Schema([
            SavedCombination.self,
            SavedMenu.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            sharedModelContainer = try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }

    // MARK: - Body

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .task {
                    await appState.initialize()
                }
        }
        .modelContainer(sharedModelContainer)
    }
}

/// Global app state and service container
@MainActor
class AppState: ObservableObject {
    // MARK: - Services

    let flavorService = FlavorPairingService()
    let ingredientService = IngredientService()
    let drinkService = DrinkPairingService()

    private(set) var dietaryService: DietaryService!
    private(set) var compatibilityEngine: CompatibilityEngine!
    private(set) var searchService: SearchService!
    private(set) var tasteAnalyzer: TasteAnalyzer!
    private(set) var menuGenerator: MenuGenerator!

    // MARK: - ViewModels

    @Published private(set) var selectionVM: IngredientSelectionVM!
    @Published private(set) var searchVM: SearchVM!
    @Published private(set) var filterVM: FilterVM!
    @Published private(set) var tasteAnalysisVM: TasteAnalysisVM!
    @Published private(set) var menuPlannerVM: MenuPlannerVM!
    @Published private(set) var savedCombinationsVM: SavedCombinationsVM!
    @Published private(set) var savedMenusVM: SavedMenusVM!

    // MARK: - State

    @Published var isInitialized = false
    @Published var initializationError: String?

    // MARK: - Settings

    @AppStorage("compatibilityMode") var compatibilityMode: String = "perfect"
    @AppStorage("includeExperimental") var includeExperimental: Bool = false
    @AppStorage("hapticFeedback") var hapticFeedback: Bool = true
    @AppStorage("theme") var theme: String = "system"
    @AppStorage("showNonAlcoholicPairings") var showNonAlcoholicPairings: Bool = false
    @AppStorage("pantryFilterMode") var pantryFilterMode: String = PantryFilterMode.all.rawValue
    @AppStorage("enabledRecipeSites") private var enabledRecipeSitesData: Data = {
        // Default to all sites enabled
        let encoder = JSONEncoder()
        return (try? encoder.encode(RecipeSite.defaultEnabledSiteIds)) ?? Data()
    }()

    // MARK: - Computed Properties

    var pantryFilter: PantryFilterMode {
        get { PantryFilterMode(rawValue: pantryFilterMode) ?? .all }
        set { pantryFilterMode = newValue.rawValue }
    }

    var enabledRecipeSites: Set<String> {
        get {
            let decoder = JSONDecoder()
            return (try? decoder.decode(Set<String>.self, from: enabledRecipeSitesData)) ?? RecipeSite.defaultEnabledSiteIds
        }
    }

    func setEnabledRecipeSites(_ sites: Set<String>) {
        let encoder = JSONEncoder()
        if let data = try? encoder.encode(sites) {
            enabledRecipeSitesData = data
        }
    }

    // MARK: - Initialization

    func initialize() async {
        do {
            // Load data in parallel for faster startup
            async let pairingsLoad: () = flavorService.loadPairings()
            async let profilesLoad: () = ingredientService.loadProfiles()
            async let drinksLoad: () = drinkService.loadPairings()
            try await pairingsLoad
            try await profilesLoad
            try await drinksLoad

            // Initialize services
            dietaryService = DietaryService(ingredientService: ingredientService)

            compatibilityEngine = CompatibilityEngine(
                flavorService: flavorService,
                ingredientService: ingredientService,
                dietaryService: dietaryService
            )

            searchService = SearchService(
                ingredientService: ingredientService,
                flavorService: flavorService,
                dietaryService: dietaryService
            )

            tasteAnalyzer = TasteAnalyzer(
                ingredientService: ingredientService,
                flavorService: flavorService
            )

            menuGenerator = MenuGenerator(
                ingredientService: ingredientService,
                flavorService: flavorService,
                dietaryService: dietaryService,
                tasteAnalyzer: tasteAnalyzer
            )

            // Initialize ViewModels
            selectionVM = IngredientSelectionVM(
                compatibilityEngine: compatibilityEngine,
                ingredientService: ingredientService
            )

            searchVM = SearchVM(
                searchService: searchService,
                ingredientService: ingredientService
            )

            filterVM = FilterVM(ingredientService: ingredientService)

            tasteAnalysisVM = TasteAnalysisVM(tasteAnalyzer: tasteAnalyzer)

            menuPlannerVM = MenuPlannerVM(
                menuGenerator: menuGenerator,
                ingredientService: ingredientService,
                dietaryService: dietaryService
            )

            savedCombinationsVM = SavedCombinationsVM()
            savedMenusVM = SavedMenusVM()

            isInitialized = true

        } catch {
            initializationError = error.localizedDescription
        }
    }
}
