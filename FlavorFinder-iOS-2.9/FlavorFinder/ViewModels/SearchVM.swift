import Foundation
import Combine

/// ViewModel for ingredient search functionality
@MainActor
class SearchVM: ObservableObject {
    // MARK: - Published Properties

    @Published var searchText: String = ""
    @Published var results: [SearchResult] = []
    @Published var isLoading: Bool = false
    @Published var filterState: FilterState = .empty

    // MARK: - Dependencies

    private let searchService: SearchService
    private let ingredientService: IngredientService
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Computed Properties

    var hasActiveFilters: Bool {
        filterState.hasActiveFilters
    }

    var activeFilterCount: Int {
        filterState.activeFilterCount
    }

    // MARK: - Initialization

    init(searchService: SearchService, ingredientService: IngredientService) {
        self.searchService = searchService
        self.ingredientService = ingredientService

        setupSearchDebounce()
    }

    // MARK: - Setup

    private func setupSearchDebounce() {
        $searchText
            .debounce(for: .milliseconds(150), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.performSearch()
            }
            .store(in: &cancellables)

        $filterState
            .sink { [weak self] _ in
                self?.performSearch()
            }
            .store(in: &cancellables)
    }

    // MARK: - Actions

    /// Perform search with current query and filters
    func performSearch(compatibleWith: [String] = []) {
        isLoading = true

        results = searchService.search(
            query: searchText,
            filters: filterState,
            compatibleWith: compatibleWith
        )

        isLoading = false
    }

    /// Set category filter
    func setCategory(_ category: Category?) {
        filterState.activeCategory = category
        filterState.selectedSubcategories = []
    }

    /// Toggle subcategory selection
    func toggleSubcategory(_ subcategory: String) {
        if filterState.selectedSubcategories.contains(subcategory) {
            filterState.selectedSubcategories.remove(subcategory)
        } else {
            filterState.selectedSubcategories.insert(subcategory)
        }
    }

    /// Set taste filter
    func setTasteFilter(dimension: TasteDimension, value: Double?) {
        if let value = value {
            filterState.tasteFilters[dimension] = value
        } else {
            filterState.tasteFilters.removeValue(forKey: dimension)
        }
    }

    /// Toggle dietary restriction
    func toggleDietaryRestriction(_ restriction: DietaryRestriction) {
        if filterState.dietaryRestrictions.contains(restriction) {
            filterState.dietaryRestrictions.remove(restriction)
        } else {
            filterState.dietaryRestrictions.insert(restriction)
        }
    }

    /// Clear all filters (preserves global pantry filter)
    func clearFilters() {
        let currentPantryFilter = filterState.pantryFilter
        filterState.reset()
        filterState.pantryFilter = currentPantryFilter
        searchText = ""
    }

    /// Sync pantry filter from global app settings
    func syncPantryFilter(_ mode: PantryFilterMode) {
        if filterState.pantryFilter != mode {
            filterState.pantryFilter = mode
        }
    }

    /// Get suggestions for current selection
    func getSuggestions(forSelection selection: [String], limit: Int = 20) -> [IngredientProfile] {
        searchService.getSuggestions(
            forSelection: selection,
            filters: filterState,
            limit: limit
        )
    }
}

/// ViewModel for managing filter panel state
@MainActor
class FilterVM: ObservableObject {
    // MARK: - Published Properties

    @Published var activeTab: FilterTab = .category
    @Published var tempFilterState: FilterState = .empty

    // MARK: - Dependencies

    private let ingredientService: IngredientService

    // MARK: - Enums

    enum FilterTab: String, CaseIterable, Identifiable {
        case category = "Category"
        case taste = "Taste"
        case dietary = "Dietary"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .category: return "folder"
            case .taste: return "chart.bar"
            case .dietary: return "leaf"
            }
        }
    }

    // MARK: - Computed Properties

    var availableSubcategories: [String] {
        guard let category = tempFilterState.activeCategory else { return [] }
        return category.subcategories
    }

    // MARK: - Initialization

    init(ingredientService: IngredientService) {
        self.ingredientService = ingredientService
    }

    // MARK: - Actions

    /// Initialize temp state from current filter state
    func beginEditing(currentState: FilterState) {
        tempFilterState = currentState
    }

    /// Apply temp state and return it
    func applyFilters() -> FilterState {
        return tempFilterState
    }

    /// Reset temp filters (preserves global pantry filter)
    func resetFilters() {
        let currentPantryFilter = tempFilterState.pantryFilter
        tempFilterState = .empty
        tempFilterState.pantryFilter = currentPantryFilter
    }

    /// Set category
    func setCategory(_ category: Category?) {
        tempFilterState.activeCategory = category
        tempFilterState.selectedSubcategories = []
    }

    /// Toggle subcategory
    func toggleSubcategory(_ subcategory: String) {
        if tempFilterState.selectedSubcategories.contains(subcategory) {
            tempFilterState.selectedSubcategories.remove(subcategory)
        } else {
            tempFilterState.selectedSubcategories.insert(subcategory)
        }
    }

    /// Set taste filter
    func setTasteFilter(dimension: TasteDimension, value: Double?) {
        if let value = value {
            tempFilterState.tasteFilters[dimension] = value
        } else {
            tempFilterState.tasteFilters.removeValue(forKey: dimension)
        }
    }

    /// Toggle taste filter (on/off with default value)
    func toggleTasteFilter(dimension: TasteDimension) {
        if tempFilterState.tasteFilters[dimension] != nil {
            tempFilterState.tasteFilters.removeValue(forKey: dimension)
        } else {
            tempFilterState.tasteFilters[dimension] = 3.0
        }
    }

    /// Toggle dietary restriction
    func toggleDietaryRestriction(_ restriction: DietaryRestriction) {
        if tempFilterState.dietaryRestrictions.contains(restriction) {
            tempFilterState.dietaryRestrictions.remove(restriction)
        } else {
            tempFilterState.dietaryRestrictions.insert(restriction)
        }
    }

    /// Update the ingredient service (used when view appears with correct appState)
    func updateService(_ service: IngredientService) {
        // This is a no-op for now since we don't actually use ingredientService in FilterVM
        // But we keep the method for API compatibility if needed in the future
    }
}
