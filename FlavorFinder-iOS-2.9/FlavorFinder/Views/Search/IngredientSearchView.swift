import SwiftUI

struct IngredientSearchView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var searchVM: SearchVM
    @EnvironmentObject var filterVM: FilterVM

    let onSelect: (String) -> Void
    let compatibleWith: [String]

    @Environment(\.dismiss) private var dismiss
    @State private var showingFilters = false
    @FocusState private var isSearchFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                HStack(spacing: 12) {
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(.secondary)

                        TextField("Search ingredients...", text: $searchVM.searchText)
                            .textFieldStyle(.plain)
                            .focused($isSearchFocused)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)

                        if !searchVM.searchText.isEmpty {
                            Button {
                                searchVM.searchText = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(12)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    // Filter Button
                    Button {
                        filterVM.beginEditing(currentState: searchVM.filterState)
                        showingFilters = true
                    } label: {
                        ZStack(alignment: .topTrailing) {
                            Image(systemName: "line.3.horizontal.decrease.circle")
                                .font(.system(size: 22))

                            if searchVM.activeFilterCount > 0 {
                                Text("\(searchVM.activeFilterCount)")
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .foregroundStyle(.white)
                                    .frame(width: 16, height: 16)
                                    .background(AppColors.accent)
                                    .clipShape(Circle())
                                    .offset(x: 6, y: -6)
                            }
                        }
                    }
                }
                .padding()

                // Results
                if searchVM.results.isEmpty && !searchVM.searchText.isEmpty {
                    EmptySearchView()
                } else {
                    List(searchVM.results) { result in
                        IngredientRowView(profile: result.profile) {
                            onSelect(result.profile.name)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                // Sync global pantry filter from AppState
                searchVM.syncPantryFilter(appState.pantryFilter)
                searchVM.performSearch(compatibleWith: compatibleWith)
                isSearchFocused = true
            }
            .onChange(of: searchVM.searchText) { _, _ in
                searchVM.performSearch(compatibleWith: compatibleWith)
            }
            .sheet(isPresented: $showingFilters) {
                FilterPanelView(
                    onApply: {
                        searchVM.filterState = filterVM.applyFilters()
                        searchVM.performSearch(compatibleWith: compatibleWith)
                    },
                    onReset: {
                        filterVM.resetFilters()
                        searchVM.filterState = .empty
                        searchVM.performSearch(compatibleWith: compatibleWith)
                    }
                )
            }
        }
    }
}

struct EmptySearchView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)

            Text("No ingredients found")
                .font(.headline)

            Text("Try a different search term or adjust your filters")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct IngredientRowView: View {
    let profile: IngredientProfile
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 12) {
                // Category indicator
                Circle()
                    .fill(categoryColor.opacity(0.2))
                    .frame(width: 40, height: 40)
                    .overlay(
                        Image(systemName: categoryIcon)
                            .font(.system(size: 16))
                            .foregroundStyle(categoryColor)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(profile.name.capitalized)
                            .font(.body)
                            .foregroundStyle(.primary)

                        // Pantry level indicator
                        if let level = profile.pantryLevel {
                            PantryLevelBadge(level: level)
                        }
                    }

                    Text("\(profile.category) • \(profile.subcategory)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Dominant taste indicator
                if let dominant = profile.dominantTaste {
                    TasteIndicator(dimension: dominant, value: profile.flavorProfile.value(for: dominant))
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var categoryColor: Color {
        Category(rawValue: profile.category)?.color ?? .gray
    }

    private var categoryIcon: String {
        Category(rawValue: profile.category)?.icon ?? "questionmark"
    }
}

struct PantryLevelBadge: View {
    let level: PantryLevel

    var body: some View {
        Image(systemName: level.iconName)
            .font(.system(size: 10))
            .foregroundStyle(iconColor)
    }

    private var iconColor: Color {
        switch level {
        case .essential: return .green
        case .expanded: return .blue
        case .expert: return .orange
        }
    }
}

struct TasteIndicator: View {
    let dimension: TasteDimension
    let value: Double

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(TasteConstants.color(for: dimension))
                .frame(width: 8, height: 8)

            Text(dimension.rawValue.prefix(3).capitalized)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(TasteConstants.color(for: dimension).opacity(0.1))
        .clipShape(Capsule())
    }
}

#Preview {
    IngredientSearchView(
        onSelect: { _ in },
        compatibleWith: []
    )
    .environmentObject(AppState())
    .environmentObject(SearchVM(
        searchService: SearchService(
            ingredientService: IngredientService(),
            flavorService: FlavorPairingService(),
            dietaryService: DietaryService(ingredientService: IngredientService())
        ),
        ingredientService: IngredientService()
    ))
    .environmentObject(FilterVM(ingredientService: IngredientService()))
}
