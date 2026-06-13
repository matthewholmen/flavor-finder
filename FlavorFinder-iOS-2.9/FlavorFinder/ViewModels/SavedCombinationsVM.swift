import Foundation
import SwiftData
import Combine

/// ViewModel for managing saved combinations
@MainActor
class SavedCombinationsVM: ObservableObject {
    // MARK: - Published Properties

    @Published var combinations: [SavedCombination] = []
    @Published var searchText: String = ""
    @Published var sortOrder: SortOrder = .lastUsed
    @Published var isLoading: Bool = false

    // MARK: - Dependencies

    private var modelContext: ModelContext?

    // MARK: - Sort Options

    enum SortOrder: String, CaseIterable, Identifiable {
        case lastUsed = "Last Used"
        case dateCreated = "Date Created"
        case name = "Name"
        case ingredientCount = "Ingredients"

        var id: String { rawValue }
    }

    // MARK: - Computed Properties

    var filteredCombinations: [SavedCombination] {
        var result = combinations

        // Apply search filter
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter { combination in
                combination.name.lowercased().contains(query) ||
                combination.ingredients.contains { $0.lowercased().contains(query) } ||
                combination.tags.contains { $0.lowercased().contains(query) }
            }
        }

        // Apply sort
        switch sortOrder {
        case .lastUsed:
            result.sort { a, b in
                let aDate = a.lastUsed ?? a.createdAt
                let bDate = b.lastUsed ?? b.createdAt
                return aDate > bDate
            }
        case .dateCreated:
            result.sort { $0.createdAt > $1.createdAt }
        case .name:
            result.sort { $0.name.lowercased() < $1.name.lowercased() }
        case .ingredientCount:
            result.sort { $0.ingredients.count > $1.ingredients.count }
        }

        return result
    }

    var isEmpty: Bool {
        combinations.isEmpty
    }

    // MARK: - Initialization

    init() {}

    // MARK: - Setup

    func setModelContext(_ context: ModelContext) {
        self.modelContext = context
        fetchCombinations()
    }

    // MARK: - CRUD Operations

    func fetchCombinations() {
        guard let context = modelContext else { return }

        isLoading = true

        do {
            let descriptor = FetchDescriptor<SavedCombination>(
                sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
            )
            combinations = try context.fetch(descriptor)
        } catch {
            print("Failed to fetch combinations: \(error)")
            combinations = []
        }

        isLoading = false
    }

    func save(name: String, ingredients: [String], tags: [String] = [], notes: String? = nil) {
        guard let context = modelContext else { return }

        let combination = SavedCombination(
            name: name,
            ingredients: ingredients,
            tags: tags,
            notes: notes
        )

        context.insert(combination)

        do {
            try context.save()
            fetchCombinations()
        } catch {
            print("Failed to save combination: \(error)")
        }
    }

    func delete(_ combination: SavedCombination) {
        guard let context = modelContext else { return }

        context.delete(combination)

        do {
            try context.save()
            fetchCombinations()
        } catch {
            print("Failed to delete combination: \(error)")
        }
    }

    func delete(at offsets: IndexSet) {
        for index in offsets {
            let combination = filteredCombinations[index]
            delete(combination)
        }
    }

    func update(_ combination: SavedCombination, name: String? = nil, tags: [String]? = nil, notes: String? = nil) {
        if let name = name {
            combination.name = name
        }
        if let tags = tags {
            combination.tags = tags
        }
        if let notes = notes {
            combination.notes = notes
        }

        guard let context = modelContext else { return }

        do {
            try context.save()
            fetchCombinations()
        } catch {
            print("Failed to update combination: \(error)")
        }
    }

    func markAsUsed(_ combination: SavedCombination) {
        combination.markAsUsed()

        guard let context = modelContext else { return }

        do {
            try context.save()
        } catch {
            print("Failed to update last used: \(error)")
        }
    }

    // MARK: - Helpers

    func exists(name: String) -> Bool {
        combinations.contains { $0.name.lowercased() == name.lowercased() }
    }

    func generateUniqueName(basedOn ingredients: [String]) -> String {
        let base = ingredients.prefix(2)
            .map { $0.capitalized }
            .joined(separator: " & ")

        var name = base.isEmpty ? "My Combination" : base
        var counter = 1

        while exists(name: name) {
            counter += 1
            name = "\(base) \(counter)"
        }

        return name
    }
}
