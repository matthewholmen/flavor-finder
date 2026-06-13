import SwiftUI

struct SavedListView: View {
    @Binding var selectedTab: MainTabView.Tab
    @EnvironmentObject var savedMenusVM: SavedMenusVM
    @EnvironmentObject var menuPlannerVM: MenuPlannerVM

    @State private var showingDeleteConfirmation = false
    @State private var menuToDelete: SavedMenu?

    var body: some View {
        NavigationStack {
            Group {
                if savedMenusVM.isEmpty {
                    EmptySavedMenusView()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(savedMenusVM.filteredMenus) { menu in
                                SavedMenuCard(
                                    menu: menu,
                                    isActive: menuPlannerVM.loadedMenuId == menu.id,
                                    onOpen: {
                                        loadMenu(menu)
                                    },
                                    onDelete: {
                                        menuToDelete = menu
                                        showingDeleteConfirmation = true
                                    }
                                )
                            }
                        }
                        .padding(.horizontal)
                        .padding(.top, 8)
                    }
                }
            }
            .searchable(text: $savedMenusVM.searchText, prompt: "Search menus")
            .navigationTitle("Saved")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    sortMenu
                }
            }
            .confirmationDialog(
                "Delete Menu",
                isPresented: $showingDeleteConfirmation,
                presenting: menuToDelete
            ) { menu in
                Button("Delete", role: .destructive) {
                    savedMenusVM.delete(menu)
                }
                Button("Cancel", role: .cancel) {}
            } message: { menu in
                Text("Are you sure you want to delete \"\(menu.name)\"? This cannot be undone.")
            }
        }
    }

    private func loadMenu(_ menu: SavedMenu) {
        menuPlannerVM.loadMenu(menu.toMenu(), menuId: menu.id)
        savedMenusVM.markAsUsed(menu)
        selectedTab = .menuPlanner
    }

    private var sortMenu: some View {
        SwiftUI.Menu {
            Picker("Sort By", selection: $savedMenusVM.sortOrder) {
                ForEach(SavedMenusVM.SortOrder.allCases) { order in
                    Text(order.rawValue).tag(order)
                }
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down")
        }
    }
}

struct EmptySavedMenusView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "menucard")
                .font(.system(size: 50))
                .foregroundStyle(.secondary)

            Text("No Saved Menus")
                .font(.headline)

            Text("Save your menus from the Menu tab\nto access them here")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

struct SavedMenuCard: View {
    let menu: SavedMenu
    let isActive: Bool
    let onOpen: () -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Top row: Menu name and dish count
            HStack(alignment: .top) {
                Text(menu.name)
                    .font(.system(size: 28, weight: .black))
                    .foregroundStyle(.primary)

                Spacer()

                Text(menu.shortDescription)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Featured ingredients
            if !menu.keyIngredients.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(AppColors.accent)
                    Text("Featured: \(menu.keyIngredients.map { $0.capitalized }.joined(separator: ", "))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            // Dietary restrictions pills
            if !menu.dietaryRestrictions.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(Array(menu.dietaryRestrictions).sorted(by: { $0.displayName < $1.displayName }), id: \.self) { restriction in
                        HStack(spacing: 4) {
                            Circle()
                                .fill(AppColors.accent)
                                .frame(width: 6, height: 6)
                            Text(restriction.displayName)
                                .font(.subheadline)
                                .fontWeight(.medium)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .foregroundStyle(AppColors.accent)
                        .background(AppColors.accent.opacity(0.15))
                        .clipShape(Capsule())
                    }
                }
            }

            // Dish names list
            if !menu.dishes.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(menu.dishes) { dish in
                        HStack(spacing: 6) {
                            Text("•")
                                .foregroundStyle(.secondary)
                            Text(dish.name)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Spacer()
                .frame(height: 4)

            // Bottom row: Active/Open button and Delete button
            HStack(spacing: 12) {
                if isActive {
                    // Active pill
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .semibold))
                        Text("Active")
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .foregroundStyle(.green)
                    .background(Color.green.opacity(0.15))
                    .clipShape(Capsule())
                } else {
                    // Open button
                    Button(action: onOpen) {
                        Text("Open")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .foregroundStyle(.secondary)
                            .background(
                                Capsule()
                                    .stroke(Color.secondary.opacity(0.4), lineWidth: 1.5)
                            )
                    }
                    .buttonStyle(.plain)
                }

                Spacer()

                // Delete button
                Button(action: onDelete) {
                    HStack(spacing: 4) {
                        Image(systemName: "trash")
                            .font(.system(size: 12))
                        Text("Delete")
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .foregroundStyle(.red)
                    .background(Color.red.opacity(0.1))
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(isActive ? AppColors.accent : Color.clear, lineWidth: 2)
        )
        .contentShape(Rectangle())
        .onTapGesture {
            if !isActive {
                onOpen()
            }
        }
    }
}

#Preview {
    let ingredientService = IngredientService()
    return SavedListView(selectedTab: .constant(.saved))
        .environmentObject(SavedMenusVM())
        .environmentObject(MenuPlannerVM(
            menuGenerator: MenuGenerator(
                ingredientService: ingredientService,
                flavorService: FlavorPairingService(),
                dietaryService: DietaryService(ingredientService: ingredientService),
                tasteAnalyzer: TasteAnalyzer(
                    ingredientService: ingredientService,
                    flavorService: FlavorPairingService()
                )
            ),
            ingredientService: ingredientService,
            dietaryService: DietaryService(ingredientService: ingredientService)
        ))
}
