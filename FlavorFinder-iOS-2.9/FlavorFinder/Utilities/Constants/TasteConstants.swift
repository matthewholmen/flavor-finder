import SwiftUI

/// Constants for taste-related colors and styling
enum TasteConstants {
    /// Colors for each taste dimension
    static let colors: [TasteDimension: Color] = [
        .sweet: Color(hex: "FF577E"),    // Pink
        .salty: Color(hex: "5295CB"),    // Blue
        .sour: Color(hex: "6CA03B"),     // Green
        .umami: Color(hex: "FA6400"),    // Orange
        .fat: Color(hex: "FFBD17"),      // Yellow/Gold
        .spicy: Color(hex: "FF2E2E"),    // Red
        .aromatic: Color(hex: "8A85D6")  // Purple
    ]

    /// Get color for a taste dimension
    static func color(for dimension: TasteDimension) -> Color {
        colors[dimension] ?? .gray
    }

    /// Balance score thresholds
    enum BalanceThreshold {
        static let excellent: Double = 80
        static let good: Double = 60
        static let fair: Double = 40
    }

    /// Taste threshold levels (adaptive based on ingredient count)
    static func dominantThreshold(ingredientCount: Int) -> Double {
        max(5.0 - (Double(ingredientCount) * 0.4), 3.0)
    }

    static func highThreshold(ingredientCount: Int) -> Double {
        max(3.0 - (Double(ingredientCount) * 0.2), 2.0)
    }

    static let mediumThreshold: Double = 2.0
    static let lowThreshold: Double = 1.0
}

/// Color extension for hex initialization
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

/// App-wide color constants
enum AppColors {
    static let background = Color(.systemBackground)
    static let secondaryBackground = Color(.secondarySystemBackground)
    static let tertiaryBackground = Color(.tertiarySystemBackground)

    static let primaryText = Color(.label)
    static let secondaryText = Color(.secondaryLabel)
    static let tertiaryText = Color(.tertiaryLabel)

    static let accent = Color(hex: "ff87a3")
    static let success = Color.green
    static let warning = Color.yellow
    static let error = Color.red

    static let categoryColors: [Category: Color] = [
        .proteins: Color(hex: "FF2E2E"),    // Red
        .vegetables: Color(hex: "6CA03B"),  // Green
        .fruits: Color(hex: "FA6400"),      // Orange
        .dairy: Color(hex: "5295CB"),       // Blue
        .seasonings: Color(hex: "8A85D6"),  // Purple
        .pantry: Color(hex: "FFBD17"),      // Yellow/Gold
        .grains: Color(hex: "FFBD17"),      // Yellow/Gold
        .alcohol: Color(hex: "FF577E")      // Pink
    ]
}
