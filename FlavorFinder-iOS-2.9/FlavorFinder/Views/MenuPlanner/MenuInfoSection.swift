import SwiftUI

/// Expandable section showing menu analytics and pairing statistics
struct MenuInfoSection: View {
    @EnvironmentObject var appState: AppState

    let menu: Menu

    @State private var isExpanded = false

    // Calculate pairing statistics
    private var pairingStats: PairingStats {
        calculatePairingStats()
    }

    // Calculate taste profile summary
    private var dominantTaste: (dimension: TasteDimension, value: Double)? {
        let dimensions = menu.tasteProfile.dimensions
        return dimensions.max(by: { $0.1 < $1.1 })
    }

    // Category breakdown
    private var categoryBreakdown: [(category: Category, count: Int)] {
        let allIngs = menu.allIngredients
        var categoryCounts: [Category: Int] = [:]

        for ingredient in allIngs {
            if let profile = appState.ingredientService.getProfile(ingredient),
               let category = Category.normalized(profile.category) {
                categoryCounts[category, default: 0] += 1
            }
        }

        return categoryCounts
            .map { ($0.key, $0.value) }
            .sorted { (lhs: (category: Category, count: Int), rhs: (category: Category, count: Int)) -> Bool in
                lhs.count > rhs.count
            }
    }

    // Dish type breakdown
    private var dishTypeBreakdown: [(type: DishType?, count: Int)] {
        var typeCounts: [DishType?: Int] = [:]
        for dish in menu.dishes {
            typeCounts[dish.type, default: 0] += 1
        }
        let mapped = typeCounts.map { ($0.key, $0.value) }
        return mapped.sorted { (lhs: (type: DishType?, count: Int), rhs: (type: DishType?, count: Int)) -> Bool in
            if lhs.count != rhs.count {
                return lhs.count > rhs.count
            }
            let lhsName = lhs.type?.displayName ?? ""
            let rhsName = rhs.type?.displayName ?? ""
            return lhsName < rhsName
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header - tappable to expand/collapse
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: "chart.bar.doc.horizontal")
                            .font(.system(size: 16))
                            .foregroundStyle(AppColors.accent)

                        Text("Menu Info")
                            .font(.headline)
                            .foregroundStyle(.primary)

                        if !isExpanded {
                            Text("\(menu.dishes.count) dish\(menu.dishes.count == 1 ? "" : "es")")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 2)
                                .background(Color(.tertiarySystemFill))
                                .clipShape(Capsule())
                        }
                    }

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(spacing: 20) {
                    // Pairing Statistics
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Pairing Analysis")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.secondary)
                            .textCase(.uppercase)
                            .tracking(0.5)

                        // Overall pairing percentage
                        HStack(spacing: 12) {
                            Circle()
                                .fill(pairingPercentageColor(pairingStats.overallPercentage))
                                .frame(width: 60, height: 60)
                                .overlay(
                                    Text("\(Int(pairingStats.overallPercentage * 100))%")
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundStyle(.white)
                                )

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Overall Compatibility")
                                    .font(.subheadline)
                                    .fontWeight(.medium)

                                Text(pairingQualityDescription(pairingStats.overallPercentage))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        // Most and least connected ingredients
                        if let mostConnected = pairingStats.mostConnectedIngredient {
                            StatRow(
                                icon: "star.fill",
                                iconColor: AppColors.accent,
                                label: "Most Connected",
                                value: mostConnected.ingredient.capitalized,
                                detail: "\(mostConnected.pairingCount) pairings"
                            )
                        }

                        if let leastConnected = pairingStats.leastConnectedIngredient {
                            StatRow(
                                icon: "link.badge.plus",
                                iconColor: .orange,
                                label: "Least Connected",
                                value: leastConnected.ingredient.capitalized,
                                detail: "\(leastConnected.pairingCount) pairings"
                            )
                        }

                        // Pairing Network - detailed breakdown
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Pairing Network")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)

                                Spacer()

                                Text("\(pairingStats.allIngredientPairings.count) ingredients")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }

                            ForEach(pairingStats.allIngredientPairings, id: \.ingredient) { item in
                                HStack(spacing: 8) {
                                    // Dot indicator colored by pairing strength
                                    Circle()
                                        .fill(pairingStrengthColor(item.pairingCount, total: menu.allIngredients.count - 1))
                                        .frame(width: 6, height: 6)

                                    Text(item.ingredient.capitalized)
                                        .font(.subheadline)
                                        .lineLimit(1)

                                    Spacer()

                                    // Pairing count with percentage
                                    HStack(spacing: 4) {
                                        Text("\(item.pairingCount)")
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                            .foregroundStyle(.primary)

                                        Text("(\(pairingPercentage(item.pairingCount, total: menu.allIngredients.count - 1))%)")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .padding(.vertical, 2)
                            }
                        }
                        .padding(.top, 8)
                    }

                    Divider()

                    // Ingredient Diversity
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Ingredient Diversity")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.secondary)
                            .textCase(.uppercase)
                            .tracking(0.5)

                        StatRow(
                            icon: "list.bullet",
                            iconColor: .blue,
                            label: "Total Unique Ingredients",
                            value: "\(menu.allIngredients.count)"
                        )

                        // Category breakdown
                        if !categoryBreakdown.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                ForEach(categoryBreakdown, id: \.category) { item in
                                    HStack(spacing: 8) {
                                        Image(systemName: item.category.icon)
                                            .font(.system(size: 14))
                                            .foregroundStyle(item.category.color)
                                            .frame(width: 20)

                                        Text(item.category.displayName)
                                            .font(.subheadline)

                                        Spacer()

                                        Text("\(item.count)")
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                            .padding(.leading, 8)
                        }

                        // Most used ingredient
                        if let mostUsed = pairingStats.mostUsedIngredient {
                            StatRow(
                                icon: "repeat",
                                iconColor: .purple,
                                label: "Most Frequent",
                                value: mostUsed.ingredient.capitalized,
                                detail: "in \(mostUsed.dishCount) dish\(mostUsed.dishCount == 1 ? "" : "es")"
                            )
                        }
                    }

                    Divider()

                    // Menu Composition
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Menu Composition")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.secondary)
                            .textCase(.uppercase)
                            .tracking(0.5)

                        StatRow(
                            icon: "fork.knife",
                            iconColor: .green,
                            label: "Total Dishes",
                            value: "\(menu.dishes.count)"
                        )

                        // Dish type breakdown
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(dishTypeBreakdown, id: \.type?.rawValue) { item in
                                HStack(spacing: 8) {
                                    Image(systemName: item.type?.icon ?? "questionmark")
                                        .font(.system(size: 14))
                                        .foregroundStyle(item.type != nil ? AppColors.accent : .secondary)
                                        .frame(width: 20)

                                    Text(item.type?.displayName ?? "No Type")
                                        .font(.subheadline)

                                    Spacer()

                                    Text("\(item.count)")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .padding(.leading, 8)
                    }

                    Divider()

                    // Taste Profile Summary
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Taste Profile")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.secondary)
                            .textCase(.uppercase)
                            .tracking(0.5)

                        if let dominant = dominantTaste {
                            StatRow(
                                icon: "flame.fill",
                                iconColor: TasteConstants.color(for: dominant.dimension),
                                label: "Dominant Taste",
                                value: dominant.dimension.displayName.capitalized,
                                detail: String(format: "%.1f/10", dominant.value)
                            )
                        }

                        // Taste bars for all dimensions
                        VStack(spacing: 8) {
                            ForEach(TasteDimension.allCases, id: \.self) { dimension in
                                let value = menu.tasteProfile.value(for: dimension)
                                if value > 0.5 {
                                    TasteBarRow(dimension: dimension, value: value)
                                }
                            }
                        }
                    }
                }
                .padding(.top, 8)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
        .padding(.bottom, 12)
    }

    // MARK: - Helper Methods

    private func calculatePairingStats() -> PairingStats {
        let allIngs = menu.allIngredients
        guard !allIngs.isEmpty else {
            return PairingStats(
                overallPercentage: 0,
                mostConnectedIngredient: nil,
                leastConnectedIngredient: nil,
                mostUsedIngredient: nil,
                allIngredientPairings: []
            )
        }

        // Calculate pairings for each ingredient
        var ingredientPairings: [(ingredient: String, pairingCount: Int)] = []

        for ingredient in allIngs {
            let otherIngredients = allIngs.filter { $0.lowercased() != ingredient.lowercased() }
            let pairingCount = otherIngredients.filter {
                appState.flavorService.areCompatible(ingredient, $0)
            }.count

            ingredientPairings.append((ingredient, pairingCount))
        }

        // Overall percentage
        let totalPossiblePairings = allIngs.count * (allIngs.count - 1) / 2
        let actualPairings = ingredientPairings.reduce(0) { $0 + $1.pairingCount } / 2
        let overallPercentage = totalPossiblePairings > 0 ? Double(actualPairings) / Double(totalPossiblePairings) : 0

        // Most and least connected
        let mostConnected = ingredientPairings.max(by: { $0.pairingCount < $1.pairingCount })
        let leastConnected = ingredientPairings.min(by: { $0.pairingCount < $1.pairingCount })

        // Most used ingredient (appears in most dishes)
        var ingredientDishCount: [String: Int] = [:]
        for dish in menu.dishes {
            for ingredient in dish.allIngredients {
                let normalized = ingredient.lowercased()
                ingredientDishCount[normalized, default: 0] += 1
            }
        }

        let mostUsed = ingredientDishCount.max(by: { $0.value < $1.value })
            .map { (ingredient: $0.key, dishCount: $0.value) }

        // Sort all ingredients by pairing count (descending)
        let sortedPairings = ingredientPairings.sorted { $0.pairingCount > $1.pairingCount }

        return PairingStats(
            overallPercentage: overallPercentage,
            mostConnectedIngredient: mostConnected,
            leastConnectedIngredient: leastConnected,
            mostUsedIngredient: mostUsed,
            allIngredientPairings: sortedPairings
        )
    }

    private func pairingStrengthColor(_ pairingCount: Int, total: Int) -> Color {
        guard total > 0 else { return .gray }
        let percentage = Double(pairingCount) / Double(total)
        switch percentage {
        case 0.8...:
            return .green
        case 0.6..<0.8:
            return AppColors.accent
        case 0.4..<0.6:
            return .orange
        default:
            return .red
        }
    }

    private func pairingPercentage(_ pairingCount: Int, total: Int) -> Int {
        guard total > 0 else { return 0 }
        return Int(round(Double(pairingCount) / Double(total) * 100))
    }

    private func pairingPercentageColor(_ percentage: Double) -> Color {
        switch percentage {
        case 0.8...:
            return .green
        case 0.6..<0.8:
            return AppColors.accent
        case 0.4..<0.6:
            return .orange
        default:
            return .red
        }
    }

    private func pairingQualityDescription(_ percentage: Double) -> String {
        switch percentage {
        case 0.8...:
            return "Excellent harmony"
        case 0.6..<0.8:
            return "Good compatibility"
        case 0.4..<0.6:
            return "Moderate pairings"
        default:
            return "Experimental mix"
        }
    }
}

// MARK: - Supporting Types

private struct PairingStats {
    let overallPercentage: Double
    let mostConnectedIngredient: (ingredient: String, pairingCount: Int)?
    let leastConnectedIngredient: (ingredient: String, pairingCount: Int)?
    let mostUsedIngredient: (ingredient: String, dishCount: Int)?
    let allIngredientPairings: [(ingredient: String, pairingCount: Int)]
}

// MARK: - Subcomponents

private struct StatRow: View {
    let icon: String
    let iconColor: Color
    let label: String
    let value: String
    var detail: String? = nil

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(iconColor)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                HStack(spacing: 6) {
                    Text(value)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if let detail = detail {
                        Text(detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()
        }
    }
}

private struct TasteBarRow: View {
    let dimension: TasteDimension
    let value: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(dimension.displayName.capitalized)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer()

                Text(String(format: "%.1f", value))
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(TasteConstants.color(for: dimension))
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.secondary.opacity(0.15))

                    // Filled portion
                    RoundedRectangle(cornerRadius: 4)
                        .fill(TasteConstants.color(for: dimension))
                        .frame(width: geometry.size.width * (value / 10))
                }
            }
            .frame(height: 6)
        }
    }
}

// MARK: - Preview

#Preview {
    let _ = FlavorPairingService()
    let _ = IngredientService()

    // Create a sample menu with dishes
    let sampleMenu = Menu(
        name: "Sample Menu",
        keyIngredients: ["lemon"],
        dishes: [
            Dish(
                name: "Lemon Chicken",
                type: .entree,
                keyIngredient: "chicken",
                ingredients: ["lemon", "garlic", "thyme"],
                tasteProfile: TasteProfile(sweet: 2, salty: 6, sour: 5, umami: 7, fat: 5, spicy: 1, aromatic: 8)
            ),
            Dish(
                name: "Roasted Asparagus",
                type: .side,
                keyIngredient: "asparagus",
                ingredients: ["lemon", "olive oil"],
                tasteProfile: TasteProfile(sweet: 2, salty: 4, sour: 4, umami: 5, fat: 6, spicy: 0, aromatic: 4)
            ),
            Dish(
                name: "Lemon Tart",
                type: .dessert,
                keyIngredient: "lemon",
                ingredients: ["butter", "sugar", "egg"],
                tasteProfile: TasteProfile(sweet: 9, salty: 2, sour: 7, umami: 2, fat: 7, spicy: 0, aromatic: 6)
            )
        ],
        balanceScore: 85,
        tasteProfile: TasteProfile(sweet: 4.3, salty: 4, sour: 5.3, umami: 4.7, fat: 6, spicy: 0.3, aromatic: 6)
    )

    return ScrollView {
        MenuInfoSection(menu: sampleMenu)
    }
    .environmentObject(AppState())
    .padding()
}
