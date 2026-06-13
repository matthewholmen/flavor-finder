import SwiftUI

struct MenuPlannerView: View {
    @EnvironmentObject var menuPlannerVM: MenuPlannerVM
    @EnvironmentObject var savedMenusVM: SavedMenusVM
    @State private var showOptionsSheet = false
    @State private var showRenameAlert = false
    @State private var editingMenuName = ""
    @State private var showSavedNotification = false

    var body: some View {
        NavigationStack {
            MenuBuilderView()
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            showOptionsSheet = true
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "slider.horizontal.3")
                                if !menuPlannerVM.configuration.dietaryRestrictions.isEmpty {
                                    Text("\(menuPlannerVM.configuration.dietaryRestrictions.count)")
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 2)
                                        .background(AppColors.accent)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                    ToolbarItem(placement: .principal) {
                        if menuPlannerVM.generatedMenu != nil {
                            Button {
                                editingMenuName = menuPlannerVM.menuName
                                showRenameAlert = true
                            } label: {
                                Text(menuPlannerVM.menuName)
                                    .font(.headline)
                            }
                        } else {
                            Text("New Menu")
                                .font(.headline)
                        }
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        if menuPlannerVM.generatedMenu != nil {
                            Button {
                                saveMenu()
                            } label: {
                                Image(systemName: "bookmark")
                            }
                        }
                    }
                }
                .overlay(alignment: .top) {
                    if showSavedNotification {
                        SavedNotificationBanner()
                            .transition(.move(edge: .top).combined(with: .opacity))
                            .padding(.top, 8)
                    }
                }
                .sheet(isPresented: $showOptionsSheet) {
                    MenuOptionsSheet(
                        dietaryRestrictions: $menuPlannerVM.configuration.dietaryRestrictions,
                        compatibilityMode: $menuPlannerVM.configuration.compatibilityMode,
                        onDismiss: {
                            menuPlannerVM.syncConfigurationToMenu()
                        }
                    )
                }
                .alert("Rename Menu", isPresented: $showRenameAlert) {
                    TextField("Menu Name", text: $editingMenuName)
                    Button("Cancel", role: .cancel) {}
                    Button("Save") {
                        if !editingMenuName.isEmpty {
                            menuPlannerVM.menuName = editingMenuName
                        }
                    }
                } message: {
                    Text("Enter a new name for this menu")
                }
        }
    }

    private func saveMenu() {
        guard let menu = menuPlannerVM.generatedMenu else { return }

        let newMenuId = savedMenusVM.save(
            menu: menu,
            name: menuPlannerVM.menuName,
            notes: nil,
            replacingMenuWithId: menuPlannerVM.loadedMenuId
        )

        // Update the loaded menu ID so subsequent saves update the same menu
        menuPlannerVM.loadedMenuId = newMenuId

        // Show saved notification
        withAnimation {
            showSavedNotification = true
        }

        // Hide after 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation {
                showSavedNotification = false
            }
        }
    }
}

struct SavedNotificationBanner: View {
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(AppColors.accent)
            Text("Saved")
                .font(.subheadline)
                .fontWeight(.semibold)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            Capsule()
                .fill(Color(.secondarySystemBackground))
                .shadow(color: .black.opacity(0.1), radius: 8, y: 2)
        )
    }
}

struct MenuOptionsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var dietaryRestrictions: Set<DietaryRestriction>
    @Binding var compatibilityMode: MenuConfiguration.MenuCompatibilityMode
    let onDismiss: (() -> Void)?

    init(
        dietaryRestrictions: Binding<Set<DietaryRestriction>>,
        compatibilityMode: Binding<MenuConfiguration.MenuCompatibilityMode>,
        onDismiss: (() -> Void)? = nil
    ) {
        self._dietaryRestrictions = dietaryRestrictions
        self._compatibilityMode = compatibilityMode
        self.onDismiss = onDismiss
    }

    var body: some View {
        NavigationStack {
            List {
                // Compatibility Mode Section
                Section {
                    ForEach(MenuConfiguration.MenuCompatibilityMode.allCases, id: \.self) { mode in
                        Button {
                            compatibilityMode = mode
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: mode.icon)
                                    .font(.system(size: 18))
                                    .foregroundStyle(compatibilityMode == mode ? AppColors.accent : .secondary)
                                    .frame(width: 28)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(mode.displayName)
                                        .foregroundStyle(.primary)
                                    Text(mode.description)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()

                                if compatibilityMode == mode {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(AppColors.accent)
                                        .fontWeight(.semibold)
                                }
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                } header: {
                    Text("Compatibility")
                } footer: {
                    Text("Controls how strictly dish ingredients must pair with the featured ingredient.")
                }

                // Dietary Restrictions Section
                Section {
                    ForEach(DietaryRestriction.allCases) { restriction in
                        Button {
                            if dietaryRestrictions.contains(restriction) {
                                dietaryRestrictions.remove(restriction)
                            } else {
                                dietaryRestrictions.insert(restriction)
                            }
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: restriction.icon)
                                    .font(.system(size: 18))
                                    .foregroundStyle(dietaryRestrictions.contains(restriction) ? AppColors.accent : .secondary)
                                    .frame(width: 28)

                                Text(restriction.displayName)
                                    .foregroundStyle(.primary)

                                Spacer()

                                if dietaryRestrictions.contains(restriction) {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(AppColors.accent)
                                        .fontWeight(.semibold)
                                }
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                } header: {
                    Text("Dietary Restrictions")
                } footer: {
                    Text("Selected restrictions will filter all generated and suggested ingredients for this menu.")
                }
            }
            .navigationTitle("Menu Options")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        onDismiss?()
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview {
    let ingredientService = IngredientService()
    return MenuPlannerView()
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
        .environmentObject(SavedMenusVM())
}
