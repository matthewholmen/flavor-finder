import Foundation
import SwiftData

/// A saved ingredient combination
@Model
class SavedCombination {
    var id: UUID
    var name: String
    var ingredients: [String]
    var createdAt: Date
    var lastUsed: Date?
    var tags: [String]
    var notes: String?

    init(name: String, ingredients: [String], tags: [String] = [], notes: String? = nil) {
        self.id = UUID()
        self.name = name
        self.ingredients = ingredients
        self.createdAt = Date()
        self.tags = tags
        self.notes = notes
    }

    /// Display string for ingredients
    var ingredientsDisplay: String {
        ingredients.map { $0.capitalized }.joined(separator: ", ")
    }

    /// Short description for list views
    var shortDescription: String {
        let count = ingredients.count
        if count <= 3 {
            return ingredientsDisplay
        } else {
            let first = ingredients.prefix(2).map { $0.capitalized }.joined(separator: ", ")
            return "\(first) + \(count - 2) more"
        }
    }

    /// Update last used timestamp
    func markAsUsed() {
        lastUsed = Date()
    }
}

/// Non-SwiftData version for previews and testing
struct SavedCombinationPreview: Identifiable {
    let id: UUID
    var name: String
    var ingredients: [String]
    var createdAt: Date
    var lastUsed: Date?
    var tags: [String]
    var notes: String?

    init(name: String, ingredients: [String], tags: [String] = [], notes: String? = nil) {
        self.id = UUID()
        self.name = name
        self.ingredients = ingredients
        self.createdAt = Date()
        self.tags = tags
        self.notes = notes
    }

    var ingredientsDisplay: String {
        ingredients.map { $0.capitalized }.joined(separator: ", ")
    }
}
