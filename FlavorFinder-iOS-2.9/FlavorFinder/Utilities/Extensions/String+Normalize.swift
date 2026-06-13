import Foundation

extension String {
    /// Normalize text for search comparison (remove diacritics, lowercase)
    var normalized: String {
        self.lowercased()
            .folding(options: .diacriticInsensitive, locale: .current)
    }

    /// Capitalize first letter of each word
    var titleCased: String {
        self.split(separator: " ")
            .map { $0.prefix(1).uppercased() + $0.dropFirst().lowercased() }
            .joined(separator: " ")
    }

    /// Check if string contains another string (case insensitive)
    func containsIgnoringCase(_ other: String) -> Bool {
        self.normalized.contains(other.normalized)
    }

    /// Check if string starts with another string (case insensitive)
    func startsWithIgnoringCase(_ other: String) -> Bool {
        self.normalized.hasPrefix(other.normalized)
    }
}

extension Array where Element == String {
    /// Join strings with proper grammar (a, b, and c)
    func joinedGrammatically() -> String {
        switch count {
        case 0:
            return ""
        case 1:
            return self[0]
        case 2:
            return "\(self[0]) and \(self[1])"
        default:
            let allButLast = self.dropLast().joined(separator: ", ")
            return "\(allButLast), and \(self.last!)"
        }
    }
}
