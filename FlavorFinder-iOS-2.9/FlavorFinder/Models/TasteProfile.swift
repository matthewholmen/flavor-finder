import Foundation

/// 7-dimension taste profile used for ingredient flavor analysis
struct TasteProfile: Codable, Equatable, Hashable {
    var sweet: Double
    var salty: Double
    var sour: Double
    var umami: Double
    var fat: Double
    var spicy: Double
    var aromatic: Double

    static let zero = TasteProfile(sweet: 0, salty: 0, sour: 0, umami: 0, fat: 0, spicy: 0, aromatic: 0)

    /// All taste dimensions as an array for iteration
    var dimensions: [(TasteDimension, Double)] {
        [
            (.sweet, sweet),
            (.salty, salty),
            (.sour, sour),
            (.umami, umami),
            (.fat, fat),
            (.spicy, spicy),
            (.aromatic, aromatic)
        ]
    }

    /// Get value for a specific dimension
    func value(for dimension: TasteDimension) -> Double {
        switch dimension {
        case .sweet: return sweet
        case .salty: return salty
        case .sour: return sour
        case .umami: return umami
        case .fat: return fat
        case .spicy: return spicy
        case .aromatic: return aromatic
        }
    }

    /// Set value for a specific dimension
    mutating func setValue(_ value: Double, for dimension: TasteDimension) {
        switch dimension {
        case .sweet: sweet = value
        case .salty: salty = value
        case .sour: sour = value
        case .umami: umami = value
        case .fat: fat = value
        case .spicy: spicy = value
        case .aromatic: aromatic = value
        }
    }

    /// Calculate average of all dimensions
    var average: Double {
        (sweet + salty + sour + umami + fat + spicy + aromatic) / 7.0
    }

    /// Calculate variance (for balance scoring)
    var variance: Double {
        let avg = average
        let values = [sweet, salty, sour, umami, fat, spicy, aromatic]
        let squaredDiffs = values.map { pow($0 - avg, 2) }
        return squaredDiffs.reduce(0, +) / Double(values.count)
    }

    /// Combine two profiles by averaging
    static func average(_ profiles: [TasteProfile]) -> TasteProfile {
        guard !profiles.isEmpty else { return .zero }

        let count = Double(profiles.count)
        return TasteProfile(
            sweet: profiles.map(\.sweet).reduce(0, +) / count,
            salty: profiles.map(\.salty).reduce(0, +) / count,
            sour: profiles.map(\.sour).reduce(0, +) / count,
            umami: profiles.map(\.umami).reduce(0, +) / count,
            fat: profiles.map(\.fat).reduce(0, +) / count,
            spicy: profiles.map(\.spicy).reduce(0, +) / count,
            aromatic: profiles.map(\.aromatic).reduce(0, +) / count
        )
    }
}

/// Individual taste dimensions
enum TasteDimension: String, CaseIterable, Codable, Identifiable {
    case sweet
    case salty
    case sour
    case umami
    case fat
    case spicy
    case aromatic

    var id: String { rawValue }

    var displayName: String {
        rawValue.capitalized
    }

    var icon: String {
        switch self {
        case .sweet: return "drop.fill"
        case .salty: return "cube.fill"
        case .sour: return "seal.fill"
        case .umami: return "waveform"
        case .fat: return "circle.fill"
        case .spicy: return "flame.fill"
        case .aromatic: return "wind"
        }
    }
}
