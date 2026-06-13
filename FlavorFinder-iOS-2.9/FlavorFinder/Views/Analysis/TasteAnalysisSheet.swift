import SwiftUI
import Charts

struct TasteAnalysisSheet: View {
    @EnvironmentObject var tasteAnalysisVM: TasteAnalysisVM
    @EnvironmentObject var selectionVM: IngredientSelectionVM
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Balance Score
                    BalanceScoreView(
                        score: tasteAnalysisVM.balanceScore,
                        category: tasteAnalysisVM.balanceCategory
                    )

                    // Radar Chart
                    TasteRadarChart(data: tasteAnalysisVM.radarChartData())
                        .frame(height: 250)
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16))

                    // Bar Chart
                    TasteBarChart(data: tasteAnalysisVM.barChartData())
                        .frame(height: 200)
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16))

                    // Dominant Tastes
                    if !tasteAnalysisVM.dominantTastes.isEmpty {
                        DominantTastesView(tastes: tasteAnalysisVM.dominantTastes)
                    }

                    // Suggestions
                    if !tasteAnalysisVM.suggestions.isEmpty {
                        SuggestionsView(
                            suggestions: tasteAnalysisVM.suggestions,
                            onAddIngredient: { ingredient in
                                selectionVM.addIngredient(ingredient)
                                tasteAnalysisVM.analyze(ingredients: selectionVM.ingredientNames)
                            }
                        )
                    }
                }
                .padding()
            }
            .navigationTitle("Taste Analysis")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct BalanceScoreView: View {
    let score: Double
    let category: TasteAnalysis.BalanceCategory

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .stroke(Color.secondary.opacity(0.2), lineWidth: 12)
                    .frame(width: 120, height: 120)

                Circle()
                    .trim(from: 0, to: score / 100)
                    .stroke(scoreColor, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                    .frame(width: 120, height: 120)
                    .rotationEffect(.degrees(-90))

                VStack(spacing: 4) {
                    Text("\(Int(score))")
                        .font(.system(size: 32, weight: .bold, design: .rounded))

                    Text("Balance")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Text(category.displayName)
                .font(.headline)
                .foregroundStyle(scoreColor)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var scoreColor: Color {
        switch category {
        case .excellent: return .green
        case .good: return .blue
        case .fair: return .yellow
        case .poor: return .red
        }
    }
}

struct TasteRadarChart: View {
    let data: [(TasteDimension, Double)]

    var body: some View {
        GeometryReader { geometry in
            let center = CGPoint(x: geometry.size.width / 2, y: geometry.size.height / 2)
            let radius = min(geometry.size.width, geometry.size.height) / 2 - 30
            let angleStep = 2 * Double.pi / Double(data.count)

            ZStack {
                // Grid circles
                gridCircles(radius: radius)

                // Axis lines and labels
                axisLinesAndLabels(center: center, radius: radius, angleStep: angleStep)

                // Data polygon
                dataPolygon(center: center, radius: radius, angleStep: angleStep)

                // Data points
                dataPoints(center: center, radius: radius, angleStep: angleStep)
            }
        }
    }

    @ViewBuilder
    private func gridCircles(radius: CGFloat) -> some View {
        ForEach([2.5, 5.0, 7.5, 10.0], id: \.self) { level in
            let size = radius * 2 * level / 10
            Circle()
                .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                .frame(width: size, height: size)
        }
    }

    @ViewBuilder
    private func axisLinesAndLabels(center: CGPoint, radius: CGFloat, angleStep: Double) -> some View {
        ForEach(Array(data.enumerated()), id: \.offset) { index, item in
            let angle = Double(index) * angleStep - Double.pi / 2
            let labelRadius = radius + 20

            // Axis line
            Path { path in
                path.move(to: center)
                let endX = center.x + radius * cos(angle)
                let endY = center.y + radius * sin(angle)
                path.addLine(to: CGPoint(x: endX, y: endY))
            }
            .stroke(Color.secondary.opacity(0.3), lineWidth: 1)

            // Label
            Text(item.0.rawValue.prefix(3).uppercased())
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundStyle(TasteConstants.color(for: item.0))
                .position(
                    x: center.x + labelRadius * cos(angle),
                    y: center.y + labelRadius * sin(angle)
                )
        }
    }

    @ViewBuilder
    private func dataPolygon(center: CGPoint, radius: CGFloat, angleStep: Double) -> some View {
        Path { path in
            for (index, item) in data.enumerated() {
                let angle = Double(index) * angleStep - Double.pi / 2
                let value = item.1 / 10
                let pointX = center.x + radius * value * cos(angle)
                let pointY = center.y + radius * value * sin(angle)
                let point = CGPoint(x: pointX, y: pointY)

                if index == 0 {
                    path.move(to: point)
                } else {
                    path.addLine(to: point)
                }
            }
            path.closeSubpath()
        }
        .fill(AppColors.accent.opacity(0.2))
        .overlay(
            Path { path in
                for (index, item) in data.enumerated() {
                    let angle = Double(index) * angleStep - Double.pi / 2
                    let value = item.1 / 10
                    let pointX = center.x + radius * value * cos(angle)
                    let pointY = center.y + radius * value * sin(angle)
                    let point = CGPoint(x: pointX, y: pointY)

                    if index == 0 {
                        path.move(to: point)
                    } else {
                        path.addLine(to: point)
                    }
                }
                path.closeSubpath()
            }
            .stroke(AppColors.accent, lineWidth: 2)
        )
    }

    @ViewBuilder
    private func dataPoints(center: CGPoint, radius: CGFloat, angleStep: Double) -> some View {
        ForEach(Array(data.enumerated()), id: \.offset) { index, item in
            let angle = Double(index) * angleStep - Double.pi / 2
            let value = item.1 / 10

            Circle()
                .fill(TasteConstants.color(for: item.0))
                .frame(width: 8, height: 8)
                .position(
                    x: center.x + radius * value * cos(angle),
                    y: center.y + radius * value * sin(angle)
                )
        }
    }
}

struct TasteBarChart: View {
    let data: [(TasteDimension, Double, Double)]  // dimension, base, enhanced

    var body: some View {
        Chart {
            ForEach(data, id: \.0) { item in
                BarMark(
                    x: .value("Taste", item.0.rawValue.prefix(3).uppercased()),
                    y: .value("Value", item.2)
                )
                .foregroundStyle(TasteConstants.color(for: item.0))
                .cornerRadius(4)
            }
        }
        .chartYScale(domain: 0...10)
        .chartXAxis {
            AxisMarks { value in
                AxisValueLabel()
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: [0, 5, 10]) { value in
                AxisGridLine()
                AxisValueLabel()
            }
        }
    }
}

struct DominantTastesView: View {
    let tastes: [TasteDimension]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Dominant Tastes")
                .font(.headline)

            HStack(spacing: 8) {
                ForEach(tastes) { taste in
                    HStack(spacing: 6) {
                        Circle()
                            .fill(TasteConstants.color(for: taste))
                            .frame(width: 10, height: 10)

                        Text(taste.displayName)
                            .font(.subheadline)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(TasteConstants.color(for: taste).opacity(0.1))
                    .clipShape(Capsule())
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct SuggestionsView: View {
    let suggestions: [TasteSuggestion]
    let onAddIngredient: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Suggestions")
                .font(.headline)

            ForEach(suggestions) { suggestion in
                SuggestionCardView(
                    suggestion: suggestion,
                    onAddIngredient: onAddIngredient
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SuggestionCardView: View {
    let suggestion: TasteSuggestion
    let onAddIngredient: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Circle()
                    .fill(TasteConstants.color(for: suggestion.dimension))
                    .frame(width: 12, height: 12)

                Text("Add \(suggestion.dimension.displayName.lowercased())")
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                Text(suggestion.reason.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 8) {
                ForEach(suggestion.suggestedIngredients, id: \.self) { ingredient in
                    Button {
                        onAddIngredient(ingredient)
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 12))

                            Text(ingredient.capitalized)
                                .font(.caption)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(AppColors.accent.opacity(0.1))
                        .foregroundStyle(AppColors.accent)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    TasteAnalysisSheet()
        .environmentObject(TasteAnalysisVM(
            tasteAnalyzer: TasteAnalyzer(
                ingredientService: IngredientService(),
                flavorService: FlavorPairingService()
            )
        ))
        .environmentObject(IngredientSelectionVM(
            compatibilityEngine: CompatibilityEngine(
                flavorService: FlavorPairingService(),
                ingredientService: IngredientService(),
                dietaryService: DietaryService(ingredientService: IngredientService())
            ),
            ingredientService: IngredientService()
        ))
}
