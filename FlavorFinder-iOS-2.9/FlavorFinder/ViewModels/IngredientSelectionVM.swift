import Foundation
import Combine

/// ViewModel for managing ingredient selection state
@MainActor
class IngredientSelectionVM: ObservableObject {
    // MARK: - Published Properties

    @Published var selectedIngredients: [Ingredient] = []
    @Published var targetCount: Int = 5
    @Published var compatibilityMode: CompatibilityEngine.Mode = .perfect
    @Published var isGenerating: Bool = false
    @Published var lastGenerationFailed: Bool = false

    // MARK: - Dependencies

    private let compatibilityEngine: CompatibilityEngine
    private let ingredientService: IngredientService
    private var history: [[Ingredient]] = []

    // MARK: - Computed Properties

    var lockedIngredients: [Ingredient] {
        selectedIngredients.filter(\.isLocked)
    }

    var unlockedIngredients: [Ingredient] {
        selectedIngredients.filter { !$0.isLocked }
    }

    var ingredientNames: [String] {
        selectedIngredients.map(\.name)
    }

    var lockedNames: [String] {
        lockedIngredients.map(\.name)
    }

    var canUndo: Bool {
        !history.isEmpty
    }

    var canAddIngredient: Bool {
        selectedIngredients.count < 5
    }

    var canRemoveIngredient: Bool {
        selectedIngredients.count > lockedIngredients.count
    }

    var emptySlotCount: Int {
        max(0, targetCount - selectedIngredients.count)
    }

    // MARK: - Initialization

    init(compatibilityEngine: CompatibilityEngine, ingredientService: IngredientService) {
        self.compatibilityEngine = compatibilityEngine
        self.ingredientService = ingredientService
    }

    // MARK: - Actions

    /// Add an ingredient to the selection
    func addIngredient(_ name: String) {
        guard selectedIngredients.count < 5 else { return }
        guard !ingredientNames.contains(where: { $0.lowercased() == name.lowercased() }) else { return }

        saveToHistory()
        selectedIngredients.append(Ingredient(name: name))
        lastGenerationFailed = false
    }

    /// Remove an ingredient by name
    func removeIngredient(_ name: String) {
        guard let index = selectedIngredients.firstIndex(where: { $0.name.lowercased() == name.lowercased() }) else { return }
        guard !selectedIngredients[index].isLocked else { return }

        saveToHistory()
        selectedIngredients.remove(at: index)
        lastGenerationFailed = false
    }

    /// Remove an ingredient by ID
    func removeIngredient(id: UUID) {
        guard let index = selectedIngredients.firstIndex(where: { $0.id == id }) else { return }
        guard !selectedIngredients[index].isLocked else { return }

        saveToHistory()
        selectedIngredients.remove(at: index)
        lastGenerationFailed = false
    }

    /// Toggle lock state for an ingredient
    func toggleLock(_ name: String) {
        guard let index = selectedIngredients.firstIndex(where: { $0.name.lowercased() == name.lowercased() }) else { return }

        saveToHistory()
        selectedIngredients[index].isLocked.toggle()

        // Adjust target count if needed
        if lockedIngredients.count > targetCount {
            targetCount = lockedIngredients.count
        }
    }

    /// Toggle lock state by ID
    func toggleLock(id: UUID) {
        guard let index = selectedIngredients.firstIndex(where: { $0.id == id }) else { return }

        saveToHistory()
        selectedIngredients[index].isLocked.toggle()

        if lockedIngredients.count > targetCount {
            targetCount = lockedIngredients.count
        }
    }

    /// Clear all unlocked ingredients
    func clearUnlocked() {
        saveToHistory()
        selectedIngredients = lockedIngredients
        lastGenerationFailed = false
    }

    /// Clear all ingredients including locked
    func clearAll() {
        saveToHistory()
        selectedIngredients = []
        lastGenerationFailed = false
    }

    /// Undo last action
    func undo() {
        guard let previous = history.popLast() else { return }
        selectedIngredients = previous
        lastGenerationFailed = false
    }

    /// Increment target count
    func incrementTarget() {
        guard targetCount < 5 else { return }
        targetCount += 1
    }

    /// Decrement target count
    func decrementTarget() {
        guard targetCount > max(1, lockedIngredients.count) else { return }
        targetCount -= 1

        // Remove excess unlocked ingredients
        while selectedIngredients.count > targetCount {
            if let index = selectedIngredients.lastIndex(where: { !$0.isLocked }) {
                selectedIngredients.remove(at: index)
            } else {
                break
            }
        }
    }

    /// Generate a new combination
    func generate(dietaryRestrictions: Set<DietaryRestriction> = []) async {
        isGenerating = true
        lastGenerationFailed = false

        saveToHistory()

        let result = await compatibilityEngine.generateCombination(
            targetCount: targetCount,
            lockedIngredients: lockedNames,
            mode: compatibilityMode,
            dietaryRestrictions: dietaryRestrictions
        )

        // Convert result to Ingredient objects, preserving locked state
        var newSelection: [Ingredient] = []

        for name in result {
            let isLocked = lockedNames.contains(where: { $0.lowercased() == name.lowercased() })
            newSelection.append(Ingredient(name: name, isLocked: isLocked))
        }

        if newSelection.count >= targetCount || newSelection.count > lockedIngredients.count {
            selectedIngredients = newSelection
        } else {
            lastGenerationFailed = true
            // Restore from history on failure
            if let previous = history.popLast() {
                selectedIngredients = previous
            }
        }

        isGenerating = false
    }

    /// Load a saved combination
    func loadCombination(_ ingredients: [String]) {
        saveToHistory()
        selectedIngredients = ingredients.map { Ingredient(name: $0) }
        targetCount = max(targetCount, ingredients.count)
        lastGenerationFailed = false
    }

    // MARK: - Private Methods

    private func saveToHistory() {
        history.append(selectedIngredients)
        // Limit history size
        if history.count > 50 {
            history.removeFirst()
        }
    }
}
