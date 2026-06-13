import Foundation
import Combine

/// ViewModel for taste analysis functionality
@MainActor
class TasteAnalysisVM: ObservableObject {
    // MARK: - Published Properties

    @Published var analysis: TasteAnalysis?
    @Published var isAnalyzing: Bool = false

    // MARK: - Dependencies

    private let tasteAnalyzer: TasteAnalyzer

    // MARK: - Computed Properties

    var hasAnalysis: Bool {
        analysis != nil
    }

    var balanceScore: Double {
        analysis?.balanceScore ?? 0
    }

    var balanceCategory: TasteAnalysis.BalanceCategory {
        analysis?.balanceCategory ?? .poor
    }

    var enhancedProfile: TasteProfile {
        analysis?.enhancedProfile ?? .zero
    }

    var dominantTastes: [TasteDimension] {
        analysis?.dominantTastes ?? []
    }

    var suggestions: [TasteSuggestion] {
        analysis?.suggestions ?? []
    }

    // MARK: - Initialization

    init(tasteAnalyzer: TasteAnalyzer) {
        self.tasteAnalyzer = tasteAnalyzer
    }

    // MARK: - Actions

    /// Analyze ingredients
    func analyze(ingredients: [String]) {
        guard !ingredients.isEmpty else {
            analysis = nil
            return
        }

        isAnalyzing = true
        analysis = tasteAnalyzer.analyze(ingredients: ingredients)
        isAnalyzing = false
    }

    /// Clear analysis
    func clear() {
        analysis = nil
    }

    /// Get radar chart data points
    func radarChartData() -> [(TasteDimension, Double)] {
        guard let profile = analysis?.enhancedProfile else {
            return TasteDimension.allCases.map { ($0, 0.0) }
        }

        return TasteDimension.allCases.map { dimension in
            (dimension, profile.value(for: dimension))
        }
    }

    /// Get bar chart data
    func barChartData() -> [(TasteDimension, Double, Double)] {
        guard let analysis = analysis else {
            return TasteDimension.allCases.map { ($0, 0.0, 0.0) }
        }

        return TasteDimension.allCases.map { dimension in
            let base = analysis.baseProfile.value(for: dimension)
            let enhanced = analysis.enhancedProfile.value(for: dimension)
            return (dimension, base, enhanced)
        }
    }
}
