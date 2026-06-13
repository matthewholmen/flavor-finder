import SwiftUI

struct FilterPanelView: View {
    @EnvironmentObject var filterVM: FilterVM
    @Environment(\.dismiss) private var dismiss

    let onApply: () -> Void
    let onReset: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab Picker
                Picker("Filter Type", selection: $filterVM.activeTab) {
                    ForEach(FilterVM.FilterTab.allCases) { tab in
                        Label(tab.rawValue, systemImage: tab.icon)
                            .tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                Divider()

                // Tab Content
                TabView(selection: $filterVM.activeTab) {
                    CategoryFilterView()
                        .tag(FilterVM.FilterTab.category)

                    TasteFilterView()
                        .tag(FilterVM.FilterTab.taste)

                    DietaryFilterView()
                        .tag(FilterVM.FilterTab.dietary)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Reset") {
                        onReset()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply") {
                        onApply()
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

struct CategoryFilterView: View {
    @EnvironmentObject var filterVM: FilterVM

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Category Pills
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    ForEach(Category.allCases) { category in
                        CategoryPill(
                            category: category,
                            isSelected: filterVM.tempFilterState.activeCategory == category,
                            onTap: {
                                if filterVM.tempFilterState.activeCategory == category {
                                    filterVM.setCategory(nil)
                                } else {
                                    filterVM.setCategory(category)
                                }
                            }
                        )
                    }
                }

                // Subcategories (if category selected)
                if let category = filterVM.tempFilterState.activeCategory {
                    Divider()
                        .padding(.vertical, 8)

                    Text("Subcategories")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    FlowLayout(spacing: 8) {
                        ForEach(category.subcategories, id: \.self) { subcategory in
                            SubcategoryChip(
                                name: subcategory,
                                isSelected: filterVM.tempFilterState.selectedSubcategories.contains(subcategory),
                                onTap: {
                                    filterVM.toggleSubcategory(subcategory)
                                }
                            )
                        }
                    }
                }
            }
            .padding()
        }
    }
}

struct CategoryPill: View {
    let category: Category
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 8) {
                Image(systemName: category.icon)
                    .font(.system(size: 14))

                Text(category.displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(isSelected ? category.color.opacity(0.2) : Color(.secondarySystemBackground))
            .foregroundStyle(isSelected ? category.color : .primary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(isSelected ? category.color : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
}

struct SubcategoryChip: View {
    let name: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(name)
                .font(.subheadline)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isSelected ? AppColors.accent.opacity(0.2) : Color(.secondarySystemBackground))
                .foregroundStyle(isSelected ? AppColors.accent : .primary)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(isSelected ? AppColors.accent : Color.clear, lineWidth: 1.5)
                )
        }
        .buttonStyle(.plain)
    }
}

struct TasteFilterView: View {
    @EnvironmentObject var filterVM: FilterVM

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                ForEach(TasteDimension.allCases) { dimension in
                    TasteSliderRow(
                        dimension: dimension,
                        value: filterVM.tempFilterState.tasteFilters[dimension],
                        isActive: filterVM.tempFilterState.tasteFilters[dimension] != nil,
                        onToggle: {
                            filterVM.toggleTasteFilter(dimension: dimension)
                        },
                        onChange: { value in
                            filterVM.setTasteFilter(dimension: dimension, value: value)
                        }
                    )
                }
            }
            .padding()
        }
    }
}

struct TasteSliderRow: View {
    let dimension: TasteDimension
    let value: Double?
    let isActive: Bool
    let onToggle: () -> Void
    let onChange: (Double) -> Void

    @State private var sliderValue: Double = 3

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                HStack(spacing: 8) {
                    Circle()
                        .fill(TasteConstants.color(for: dimension))
                        .frame(width: 12, height: 12)

                    Text(dimension.displayName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                }

                Spacer()

                Toggle("", isOn: Binding(
                    get: { isActive },
                    set: { _ in onToggle() }
                ))
                .labelsHidden()
            }

            if isActive {
                HStack {
                    Text("Min: \(Int(sliderValue))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(width: 50, alignment: .leading)

                    Slider(value: $sliderValue, in: 1...10, step: 1)
                        .tint(TasteConstants.color(for: dimension))
                        .onChange(of: sliderValue) { _, newValue in
                            onChange(newValue)
                        }

                    Text("10")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .onAppear {
                    sliderValue = value ?? 3
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct DietaryFilterView: View {
    @EnvironmentObject var filterVM: FilterVM

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(DietaryRestriction.allCases) { restriction in
                    DietaryRestrictionRow(
                        restriction: restriction,
                        isSelected: filterVM.tempFilterState.dietaryRestrictions.contains(restriction),
                        onToggle: {
                            filterVM.toggleDietaryRestriction(restriction)
                        }
                    )
                }
            }
            .padding()
        }
    }
}

struct DietaryRestrictionRow: View {
    let restriction: DietaryRestriction
    let isSelected: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 12) {
                Image(systemName: restriction.icon)
                    .font(.system(size: 18))
                    .foregroundStyle(isSelected ? .green : .secondary)
                    .frame(width: 24)

                Text(restriction.displayName)
                    .font(.body)

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(isSelected ? .green : .secondary)
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}

/// Flow layout for wrapping content
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)

        for (index, subview) in subviews.enumerated() {
            let point = CGPoint(
                x: bounds.minX + result.positions[index].x,
                y: bounds.minY + result.positions[index].y
            )
            subview.place(at: point, proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var currentX: CGFloat = 0
            var currentY: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if currentX + size.width > maxWidth && currentX > 0 {
                    currentX = 0
                    currentY += lineHeight + spacing
                    lineHeight = 0
                }

                positions.append(CGPoint(x: currentX, y: currentY))
                lineHeight = max(lineHeight, size.height)
                currentX += size.width + spacing
            }

            // Use full maxWidth to prevent centering when content doesn't fill the row
            self.size.width = maxWidth
            self.size.height = currentY + lineHeight
        }
    }
}

#Preview {
    FilterPanelView(onApply: {}, onReset: {})
        .environmentObject(FilterVM(ingredientService: IngredientService()))
}
