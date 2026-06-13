import Foundation
import SwiftData
import Combine

/// ViewModel for managing saved menus
@MainActor
class SavedMenusVM: ObservableObject {
    // MARK: - Published Properties

    @Published var menus: [SavedMenu] = []
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
        case dishCount = "Dishes"

        var id: String { rawValue }
    }

    // MARK: - Computed Properties

    var filteredMenus: [SavedMenu] {
        var result = menus

        // Apply search filter
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter { menu in
                menu.name.lowercased().contains(query) ||
                menu.keyIngredients.contains(where: { $0.lowercased().contains(query) }) ||
                menu.dishes.contains { dish in
                    dish.name.lowercased().contains(query) ||
                    dish.allIngredients.contains { $0.lowercased().contains(query) }
                }
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
        case .dishCount:
            result.sort { $0.dishCount > $1.dishCount }
        }

        return result
    }

    var isEmpty: Bool {
        menus.isEmpty
    }

    // MARK: - Initialization

    init() {}

    // MARK: - Setup

    func setModelContext(_ context: ModelContext) {
        self.modelContext = context
        fetchMenus()
    }

    // MARK: - CRUD Operations

    func fetchMenus() {
        guard let context = modelContext else { return }

        isLoading = true

        do {
            let descriptor = FetchDescriptor<SavedMenu>(
                sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
            )
            menus = try context.fetch(descriptor)
        } catch {
            print("Failed to fetch menus: \(error)")
            menus = []
        }

        isLoading = false
    }

    @discardableResult
    func save(menu: Menu, name: String, notes: String? = nil, replacingMenuWithId menuId: UUID? = nil) -> UUID {
        guard let context = modelContext else { return UUID() }

        print("💾 Saving menu: \(name)")
        print("💾 Menu dietary restrictions: \(menu.dietaryRestrictions)")
        print("💾 Menu compatibility mode: \(menu.compatibilityMode)")

        // If we're replacing an existing menu, delete it first
        if let menuId = menuId,
           let existingMenu = menus.first(where: { $0.id == menuId }) {
            context.delete(existingMenu)
        }

        let savedMenu = SavedMenu(from: menu, name: name, notes: notes)

        print("💾 SavedMenu dietary restrictions: \(savedMenu.dietaryRestrictions)")
        print("💾 SavedMenu compatibility mode: \(savedMenu.compatibilityMode)")

        context.insert(savedMenu)

        do {
            try context.save()
            fetchMenus()
        } catch {
            print("Failed to save menu: \(error)")
        }

        return savedMenu.id
    }

    func delete(_ menu: SavedMenu) {
        guard let context = modelContext else { return }

        context.delete(menu)

        do {
            try context.save()
            fetchMenus()
        } catch {
            print("Failed to delete menu: \(error)")
        }
    }

    func delete(at offsets: IndexSet) {
        for index in offsets {
            let menu = filteredMenus[index]
            delete(menu)
        }
    }

    func update(_ menu: SavedMenu, name: String? = nil, notes: String? = nil) {
        if let name = name {
            menu.name = name
        }
        if let notes = notes {
            menu.notes = notes
        }

        guard let context = modelContext else { return }

        do {
            try context.save()
            fetchMenus()
        } catch {
            print("Failed to update menu: \(error)")
        }
    }

    func markAsUsed(_ menu: SavedMenu) {
        menu.markAsUsed()

        guard let context = modelContext else { return }

        do {
            try context.save()
        } catch {
            print("Failed to update last used: \(error)")
        }
    }

    // MARK: - Helpers

    func exists(name: String) -> Bool {
        menus.contains { $0.name.lowercased() == name.lowercased() }
    }

    func generateUniqueName(basedOn keyIngredient: String) -> String {
        let base = keyIngredient.isEmpty ? "My Menu" : "\(keyIngredient.capitalized) Menu"
        var name = base
        var counter = 1

        while exists(name: name) {
            counter += 1
            name = "\(base) \(counter)"
        }

        return name
    }
}
