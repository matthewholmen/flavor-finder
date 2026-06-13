import SwiftUI

struct MenuBuilderView: View {
    @EnvironmentObject var menuPlannerVM: MenuPlannerVM
    @EnvironmentObject var appState: AppState
    @State private var showIngredientPicker = false
    @State private var showBuildDishPicker = false
    @State private var showRecipeURLInput = false
    @State private var showAddDishMenu = false
    @State private var selectedDish: Dish?
    @State private var builtDishToEdit: Dish?
    @State private var dishForTypePicker: Dish?
    @State private var dishForRecipeBrowser: Dish?
    @State private var scrollToBottom = false
    @State private var scrollToTop = false
    @Namespace private var bottomID

    private var hasKeyIngredient: Bool {
        !menuPlannerVM.configuration.keyIngredients.isEmpty
    }

    var body: some View {
        Group {
            // Show normal menu view only if we have a generated menu with dishes
            // Otherwise show the empty state (menu builder) view
            if menuPlannerVM.generatedMenu != nil {
                normalMenuView
            } else {
                emptyStateView
            }
        }
        .sheet(isPresented: $showIngredientPicker) {
            UnifiedIngredientPicker(
                title: "Featured Ingredient",
                compatibleWith: [],
                selectedIngredient: menuPlannerVM.configuration.keyIngredients.first ?? "",
                menuDietaryRestrictions: menuPlannerVM.configuration.dietaryRestrictions,
                onSelect: { ingredient in
                    menuPlannerVM.setKeyIngredients([ingredient])
                    // Only auto-generate dish if we're in normal menu view (has dishes already)
                    if menuPlannerVM.generatedMenu != nil {
                        Task {
                            await menuPlannerVM.addDish()
                        }
                    }
                    showIngredientPicker = false
                }
            )
        }
        .sheet(item: $dishForTypePicker) { dish in
            DishTypePickerSheet(
                currentType: dish.type,
                onSelect: { dishType in
                    var updatedDish = dish
                    updatedDish.type = dishType
                    menuPlannerVM.updateDish(updatedDish)
                    dishForTypePicker = nil
                }
            )
        }
        .sheet(isPresented: $showBuildDishPicker) {
            UnifiedIngredientPicker(
                title: "Build Dish",
                compatibleWith: menuPlannerVM.configuration.compatibilityMode == .freeform ? [] : menuPlannerVM.configuration.keyIngredients,
                includeCompatibleWithIngredients: true,  // Allow selecting the featured ingredient itself
                selectedIngredient: nil,
                menuDietaryRestrictions: menuPlannerVM.configuration.dietaryRestrictions,
                onSelect: { ingredient in
                    let newDish = menuPlannerVM.createDishWithIngredient(ingredient)
                    showBuildDishPicker = false
                    builtDishToEdit = newDish
                }
            )
        }
        .fullScreenCover(item: $selectedDish) { dish in
            DishEditorView(
                dish: dish,
                menuKeyIngredient: menuPlannerVM.configuration.keyIngredients.first ?? "",
                menuDietaryRestrictions: menuPlannerVM.configuration.dietaryRestrictions,
                menuCompatibilityMode: menuPlannerVM.configuration.compatibilityMode,
                onSave: { updatedDish in
                    menuPlannerVM.updateDish(updatedDish)
                    selectedDish = nil
                }
            )
        }
        .fullScreenCover(item: $builtDishToEdit) { dish in
            DishEditorView(
                dish: dish,
                menuKeyIngredient: menuPlannerVM.configuration.keyIngredients.first ?? "",
                menuDietaryRestrictions: menuPlannerVM.configuration.dietaryRestrictions,
                menuCompatibilityMode: menuPlannerVM.configuration.compatibilityMode,
                onSave: { updatedDish in
                    menuPlannerVM.updateDish(updatedDish)
                    builtDishToEdit = nil
                    scrollToBottom = true
                }
            )
        }
        .sheet(item: $dishForRecipeBrowser) { dish in
            RecipeBrowserView(
                dish: dish,
                initialSearchQuery: dish.allIngredients.joined(separator: " "),
                onSaveRecipe: { url, title, imageURL in
                    saveRecipeToDish(dish, url: url, title: title, imageURL: imageURL)
                    dishForRecipeBrowser = nil
                },
                onDismiss: {
                    dishForRecipeBrowser = nil
                }
            )
        }
        .sheet(isPresented: $showRecipeURLInput) {
            RecipeURLInputSheet(
                onSave: { url, title in
                    createDishFromRecipeURL(url, title: title)
                    showRecipeURLInput = false
                },
                onDismiss: {
                    showRecipeURLInput = false
                }
            )
        }
    }

    private var emptyStateView: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                // Featured Ingredient Card - same style as normalMenuView
                EmptyStateFeaturedIngredientCard(
                    isDisabled: menuPlannerVM.configuration.compatibilityMode == .freeform,
                    onTap: {
                        showIngredientPicker = true
                    },
                    onGenerateRandom: {
                        Task {
                            await menuPlannerVM.generateRandomKeyIngredient(autoGenerateDish: false)
                        }
                    },
                    onRegenerate: {
                        Task {
                            await menuPlannerVM.generateRandomKeyIngredient(autoGenerateDish: false)
                        }
                    }
                )
                .padding(.horizontal, 20)
                .padding(.top, 8)

                // Dietary Restrictions Pills (if any)
                if !menuPlannerVM.configuration.dietaryRestrictions.isEmpty {
                    DietaryRestrictionsPills(restrictions: menuPlannerVM.configuration.dietaryRestrictions)
                        .padding(.horizontal)
                }

                // Collapsible sections placeholder
                VStack(spacing: 0) {
                    DrinkPairingSectionPlaceholder()
                    MenuInfoSectionPlaceholder()
                }

                Divider()
                    .padding(.horizontal, 20)
                    .padding(.vertical, 8)

                // New Dish placeholder - only show when no ingredient selected
                if !hasKeyIngredient && menuPlannerVM.configuration.compatibilityMode != .freeform {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("New Dish")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundStyle(.secondary)

                        Text("Select a featured ingredient to start building your menu")
                            .font(.subheadline)
                            .foregroundStyle(.tertiary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 20)
                }

                // Add Dish button - enabled when featured ingredient selected or in freeform mode
                let canAddDish = hasKeyIngredient || menuPlannerVM.configuration.compatibilityMode == .freeform
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                        showAddDishMenu.toggle()
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .semibold))
                        Text("Add Dish")
                            .font(.system(size: 17, weight: .semibold))
                    }
                    .foregroundStyle(canAddDish ? AppColors.accent : AppColors.accent.opacity(0.4))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.clear)
                    .overlay(
                        Capsule()
                            .stroke(canAddDish ? AppColors.accent : AppColors.accent.opacity(0.4), lineWidth: 2)
                    )
                }
                .disabled(!canAddDish || menuPlannerVM.isGenerating)
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
            .padding(.top)
        }
        .overlay(
            AddDishMenuOverlay(
                isPresented: $showAddDishMenu,
                onGenerateRandom: {
                    showAddDishMenu = false
                    Task {
                        await menuPlannerVM.addDish()
                        scrollToBottom = true
                    }
                },
                onBuildCustom: {
                    showAddDishMenu = false
                    showBuildDishPicker = true
                },
                onAddFromURL: {
                    showAddDishMenu = false
                    showRecipeURLInput = true
                }
            )
        )
    }

    private var normalMenuView: some View {
        ScrollViewReader { proxy in
            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    // Featured Ingredient Selector - full width card
                    FeaturedIngredientCard(
                        ingredient: menuPlannerVM.configuration.keyIngredients.first ?? "",
                        isDisabled: menuPlannerVM.configuration.compatibilityMode == .freeform,
                        onTap: {
                            showIngredientPicker = true
                        },
                        onClear: {
                            menuPlannerVM.reset()
                        },
                        onRegenerate: {
                            Task {
                                await menuPlannerVM.generateRandomKeyIngredient()
                            }
                        }
                    )
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .id("topAnchor")

                    // Dietary Restrictions Pills
                    if !menuPlannerVM.configuration.dietaryRestrictions.isEmpty {
                        DietaryRestrictionsPills(restrictions: menuPlannerVM.configuration.dietaryRestrictions)
                            .padding(.horizontal)
                    }

                    // Drink Pairings & Menu Info - collapsed sections above the fold
                    if let menu = menuPlannerVM.generatedMenu, !menu.dishes.isEmpty {
                        VStack(spacing: 0) {
                            DrinkPairingSection(menu: menu)
                            MenuInfoSection(menu: menu)
                        }

                        Divider()
                            .padding(.horizontal, 20)
                            .padding(.vertical, 8)
                    }

                    // Dishes List - with dividers between dishes
                    if let menu = menuPlannerVM.generatedMenu, !menu.dishes.isEmpty {
                        VStack(spacing: 0) {
                            ForEach(Array(menu.dishes.enumerated()), id: \.element.id) { index, dish in
                                DishCardContent(
                                    dish: dish,
                                    menuKeyIngredients: menu.keyIngredients,
                                    onTap: { selectedDish = dish },
                                    onNameChange: { newName in
                                        saveDishName(dish, newName: newName)
                                    },
                                    onTypeChange: { dishForTypePicker = dish },
                                    onRecipeTap: { dishForRecipeBrowser = dish },
                                    onRecipeSave: { url, title, imageURL in
                                        saveRecipeToDish(dish, url: url, title: title, imageURL: imageURL)
                                    },
                                    onRecipeRemove: {
                                        removeRecipeFromDish(dish)
                                    },
                                    onRegenerate: {
                                        Task {
                                            await menuPlannerVM.regenerateDish(dish)
                                        }
                                    },
                                    onDelete: {
                                        withAnimation {
                                            menuPlannerVM.deleteDish(dish)
                                        }
                                    }
                                )

                                // Divider between dishes (but not after the last one)
                                if index < menu.dishes.count - 1 {
                                    Divider()
                                        .padding(.horizontal, 20)
                                        .padding(.vertical, 20)
                                }
                            }
                        }
                    } else if !menuPlannerVM.configuration.keyIngredients.isEmpty {
                        // Empty state when ingredient selected but no dishes
                        VStack(spacing: 12) {
                            Image(systemName: "fork.knife")
                                .font(.system(size: 40))
                                .foregroundStyle(.secondary)

                            Text("No dishes yet")
                                .font(.headline)
                                .foregroundStyle(.secondary)

                            Text("Tap the button below to add a dish")
                                .font(.subheadline)
                                .foregroundStyle(.tertiary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    }

                    // FAB: Floating Action Button
                    // In freeform mode, always show button. In other modes, require key ingredient
                    if menuPlannerVM.configuration.compatibilityMode == .freeform || !menuPlannerVM.configuration.keyIngredients.isEmpty {
                        Button {
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                                showAddDishMenu.toggle()
                            }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "plus")
                                    .font(.system(size: 18, weight: .semibold))
                                Text("Add Dish")
                                    .font(.system(size: 17, weight: .semibold))
                            }
                            .foregroundStyle(AppColors.accent)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.clear)
                            .overlay(
                                Capsule()
                                    .stroke(AppColors.accent, lineWidth: 2)
                            )
                        }
                        .disabled(menuPlannerVM.isGenerating)
                        .padding(.horizontal, 20)
                        .padding(.bottom, 24)  // Space above tab bar
                        .id("bottomAnchor")
                    }
                }
                .padding(.top)
            }
            .onChange(of: scrollToBottom) { _, shouldScroll in
                if shouldScroll {
                    withAnimation {
                        proxy.scrollTo("bottomAnchor", anchor: .bottom)
                    }
                    scrollToBottom = false
                }
            }
            .onChange(of: menuPlannerVM.loadedMenuId) { _, _ in
                // Scroll to top when a menu is loaded
                withAnimation {
                    proxy.scrollTo("topAnchor", anchor: .top)
                }
            }
        }
        .overlay(
            AddDishMenuOverlay(
                isPresented: $showAddDishMenu,
                onGenerateRandom: {
                    showAddDishMenu = false
                    Task {
                        await menuPlannerVM.addDish()
                        scrollToBottom = true
                    }
                },
                onBuildCustom: {
                    showAddDishMenu = false
                    showBuildDishPicker = true
                },
                onAddFromURL: {
                    showAddDishMenu = false
                    showRecipeURLInput = true
                }
            )
        )
    }

    private func saveRecipeToDish(_ dish: Dish, url: URL, title: String?, imageURL: URL?) {
        var updatedDish = dish
        updatedDish.recipeURL = url
        updatedDish.recipeTitle = title
        updatedDish.recipeImageURL = imageURL
        menuPlannerVM.updateDish(updatedDish)
    }

    private func removeRecipeFromDish(_ dish: Dish) {
        var updatedDish = dish
        updatedDish.recipeURL = nil
        updatedDish.recipeTitle = nil
        updatedDish.recipeImageURL = nil
        menuPlannerVM.updateDish(updatedDish)
    }

    private func saveDishName(_ dish: Dish, newName: String) {
        var updatedDish = dish
        // If there's a recipe linked, update the recipe title, otherwise update dish name
        if updatedDish.recipeURL != nil {
            updatedDish.recipeTitle = newName
        } else {
            updatedDish.name = newName
        }
        menuPlannerVM.updateDish(updatedDish)
    }

    private func createDishFromRecipeURL(_ urlString: String, title: String?) {
        guard let url = URL(string: urlString) else { return }

        let newDish = Dish(
            name: title ?? "New Dish",
            type: nil,
            keyIngredient: "",
            ingredients: [],
            tasteProfile: .zero,
            weight: 5,
            recipeURL: url,
            recipeImageURL: nil,
            recipeTitle: title
        )

        if var menu = menuPlannerVM.generatedMenu {
            menu.dishes.append(newDish)
            menuPlannerVM.generatedMenu = menu
        } else {
            // Create new menu if none exists
            menuPlannerVM.generatedMenu = Menu(
                name: "Menu",
                keyIngredients: menuPlannerVM.configuration.keyIngredients,
                dishes: [newDish],
                dietaryRestrictions: menuPlannerVM.configuration.dietaryRestrictions,
                compatibilityMode: menuPlannerVM.configuration.compatibilityMode
            )
        }

        scrollToBottom = true
    }
}

struct FeaturedIngredientCard: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var menuPlannerVM: MenuPlannerVM

    let ingredient: String  // Display only - for backward compatibility, shows first ingredient
    let isDisabled: Bool
    let onTap: () -> Void
    let onClear: () -> Void
    let onRegenerate: () -> Void

    @State private var showClearConfirmation = false
    @State private var showRegenerateConfirmation = false
    @State private var showAddIngredientPicker = false

    @State private var focusedIngredient: String?  // Track which ingredient is focused
    @State private var isEditingName = false
    @State private var editedName: String = ""
    @FocusState private var isNameFieldFocused: Bool

    private var keyIngredients: [String] {
        menuPlannerVM.configuration.keyIngredients
    }

    private var hasMultipleIngredients: Bool {
        keyIngredients.count > 1
    }

    private var displayIngredient: String {
        focusedIngredient ?? keyIngredients.first ?? ingredient
    }

    private var profile: IngredientProfile? {
        guard !displayIngredient.isEmpty else { return nil }
        return appState.ingredientService.getProfile(displayIngredient)
    }

    // Calculate mutual pairings count for all featured ingredients
    private var mutualPairingsCount: Int {
        guard !keyIngredients.isEmpty else { return 0 }
        return appState.flavorService.getIngredientsCompatibleWithAll(keyIngredients).count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Top row: Pairing count badge + NEW + button
            HStack {
                // Pairing count badge
                if !keyIngredients.isEmpty {
                    Text("\(mutualPairingsCount) PAIRINGS")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .tracking(0.5)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.secondary.opacity(0.15))
                        .clipShape(Capsule())
                }

                Spacer()

                // NEW + button - creates new menu
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        showClearConfirmation = true
                    }
                } label: {
                    Text("NEW +")
                        .font(.caption)
                        .fontWeight(.bold)
                        .tracking(0.5)
                        .foregroundStyle(AppColors.accent)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(
                            Capsule()
                                .stroke(AppColors.accent, lineWidth: 1.5)
                        )
                }
                .buttonStyle(.plain)
            }

            // Clear confirmation banner
            if showClearConfirmation {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Start over?")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.primary)
                        Text("Clears all dishes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button("Cancel") {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            showClearConfirmation = false
                        }
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)

                    Button("Clear") {
                        withAnimation {
                            onClear()
                            showClearConfirmation = false
                        }
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(Color.red)
                    .clipShape(Capsule())
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .transition(.scale.combined(with: .opacity))
            }

            // Regenerate confirmation banner
            if showRegenerateConfirmation {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Regenerate ingredient?")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.primary)
                        Text("Clears all dishes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button("Cancel") {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            showRegenerateConfirmation = false
                        }
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)

                    Button("Regenerate") {
                        withAnimation {
                            onRegenerate()
                            showRegenerateConfirmation = false
                        }
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(AppColors.accent)
                    .clipShape(Capsule())
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .transition(.scale.combined(with: .opacity))
            }

            // Menu name - editable by tapping
            if isEditingName {
                ExpandingTextEditor(
                    text: $editedName,
                    font: .system(size: 36, weight: .black),
                    fontWeight: .black,
                    fontSize: 36,
                    minHeight: 44
                )
                .focused($isNameFieldFocused)
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        isNameFieldFocused = true
                    }
                }
                .toolbar {
                    ToolbarItemGroup(placement: .keyboard) {
                        Spacer()
                        Button("Done") {
                            saveMenuName()
                        }
                        .fontWeight(.semibold)
                    }
                }
            } else {
                Button(action: {
                    editedName = menuPlannerVM.menuName
                    isEditingName = true
                }) {
                    Text(menuPlannerVM.menuName)
                        .font(.system(size: 36, weight: .black))
                        .foregroundStyle(.primary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
            }

            // Header row with label and add ingredient button
            HStack {
                Text(hasMultipleIngredients ? "FEATURED INGREDIENTS" : "FEATURED INGREDIENT")
                    .font(.caption)
                    .textCase(.uppercase)
                    .tracking(0.5)
                    .foregroundStyle(.secondary)

                // Add ingredient button - inline with header
                if !isDisabled {
                    Button {
                        showAddIngredientPicker = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(AppColors.accent)
                    }
                    .buttonStyle(.plain)
                }

                Spacer()
            }

            // Content area
            VStack(alignment: .leading, spacing: 12) {
                if keyIngredients.isEmpty {
                    // Empty state - tappable
                    Button(action: {
                        if !isDisabled {
                            onTap()
                        }
                    }) {
                        Text(isDisabled ? "Not used in Freeform mode" : "Tap to select...")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    .disabled(isDisabled)
                } else {
                    // Show pills for featured ingredients (tappable to focus)
                    FlowLayout(spacing: 8) {
                        ForEach(keyIngredients, id: \.self) { ingredient in
                            Button(action: {
                                withAnimation {
                                    focusedIngredient = ingredient
                                }
                            }) {
                                HStack(spacing: 6) {
                                    // Dot indicator for focused ingredient
                                    if focusedIngredient == ingredient || (focusedIngredient == nil && ingredient == keyIngredients.first) {
                                        Circle()
                                            .fill(AppColors.accent)
                                            .frame(width: 6, height: 6)
                                    }

                                    Text(ingredient.capitalized)
                                        .font(.body)
                                        .fontWeight(.medium)

                                    Button(action: {
                                        removeIngredient(ingredient)
                                    }) {
                                        Image(systemName: "xmark")
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundStyle(.primary.opacity(0.6))
                                    }
                                    .buttonStyle(.plain)
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(
                                    (focusedIngredient == ingredient || (focusedIngredient == nil && ingredient == keyIngredients.first))
                                        ? AppColors.accent.opacity(0.15)
                                        : Color.secondary.opacity(0.1)
                                )
                                .foregroundStyle(
                                    (focusedIngredient == ingredient || (focusedIngredient == nil && ingredient == keyIngredients.first))
                                        ? AppColors.accent
                                        : .primary
                                )
                                .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    // Category and description for the focused (or first) ingredient
                    if let profile = profile {
                        Text("\(profile.category.lowercased()) — \(profile.subcategory.lowercased())")
                            .font(.callout)
                            .fontWeight(.medium)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(
                                Capsule()
                                    .stroke(Color.primary.opacity(0.4), lineWidth: 1.5)
                            )

                        // Description
                        Text(profile.description)
                            .font(.callout)
                            .foregroundStyle(.secondary)
                            .lineSpacing(2)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .opacity(isDisabled ? 0.5 : 1.0)
        .sheet(isPresented: $showAddIngredientPicker) {
            UnifiedIngredientPicker(
                title: "Add Featured Ingredient",
                compatibleWith: keyIngredients,  // New ingredient must pair with existing ones
                selectedIngredient: nil,
                menuDietaryRestrictions: menuPlannerVM.configuration.dietaryRestrictions,
                onSelect: { newIngredient in
                    addIngredient(newIngredient)
                    showAddIngredientPicker = false
                }
            )
        }
    }

    private func addIngredient(_ ingredient: String) {
        var newIngredients = keyIngredients
        if !newIngredients.contains(where: { $0.lowercased() == ingredient.lowercased() }) {
            newIngredients.append(ingredient)
            menuPlannerVM.setKeyIngredients(newIngredients)
        }
    }

    private func removeIngredient(_ ingredient: String) {
        var newIngredients = keyIngredients
        newIngredients.removeAll { $0.lowercased() == ingredient.lowercased() }
        menuPlannerVM.setKeyIngredients(newIngredients)

        // Clear focus if removing the focused ingredient
        if focusedIngredient == ingredient {
            focusedIngredient = nil
        }
    }

    private func saveMenuName() {
        let trimmed = editedName.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty {
            menuPlannerVM.setMenuName(trimmed)
        }
        isEditingName = false
    }
}

struct DishTypePickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    let currentType: DishType?
    let onSelect: (DishType?) -> Void

    var body: some View {
        NavigationStack {
            List {
                // Option to remove dish type
                if currentType != nil {
                    Button {
                        onSelect(nil)
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "minus.circle")
                                .font(.system(size: 20))
                                .foregroundStyle(.secondary)
                                .frame(width: 30)

                            Text("No Type")
                                .foregroundStyle(.secondary)

                            Spacer()
                        }
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.plain)
                }

                ForEach(DishType.allCases) { type in
                    Button {
                        onSelect(type)
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: type.icon)
                                .font(.system(size: 20))
                                .foregroundStyle(AppColors.accent)
                                .frame(width: 30)

                            Text(type.displayName)
                                .foregroundStyle(.primary)

                            Spacer()

                            if currentType == type {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(AppColors.accent)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.plain)
                }
            }
            .listStyle(.plain)
            .navigationTitle("Dish Type")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

struct DishCardContent: View {
    @EnvironmentObject var appState: AppState

    let dish: Dish
    let menuKeyIngredients: [String]  // The menu's featured ingredients (for star icon and pairing checks)
    let onTap: () -> Void
    let onNameChange: (String) -> Void  // Changed from onNameTap to pass the new name
    let onTypeChange: () -> Void
    let onRecipeTap: () -> Void
    let onRecipeSave: (URL, String?, URL?) -> Void
    let onRecipeRemove: () -> Void
    let onRegenerate: () -> Void
    let onDelete: () -> Void

    @State private var showDeleteConfirmation = false
    @State private var showRemoveRecipeConfirmation = false
    @State private var isEditingName = false
    @State private var editedName: String = ""
    @FocusState private var isNameFieldFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Remove recipe confirmation banner (shown above hero image)
            if showRemoveRecipeConfirmation {
                HStack(spacing: 12) {
                    Text("Remove recipe link?")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)

                    Spacer()

                    Button("Cancel") {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            showRemoveRecipeConfirmation = false
                        }
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)

                    Button("Remove") {
                        withAnimation {
                            showRemoveRecipeConfirmation = false
                            onRecipeRemove()
                        }
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(Color.red)
                    .clipShape(Capsule())
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(Color(.secondarySystemBackground))
                .transition(.scale.combined(with: .opacity))
            }

            // Recipe preview card (when linked) - full width, edge-to-edge image
            if let recipeURL = dish.recipeURL {
                RecipeHeroCard(
                    url: recipeURL,
                    title: dish.recipeTitle,
                    imageURL: dish.recipeImageURL,
                    onRemove: {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            showRemoveRecipeConfirmation = true
                        }
                    },
                    onTypeChange: onTypeChange,
                    onRecipeTap: onRecipeTap,
                    dishType: dish.type
                )
                .frame(maxWidth: .infinity)
            } else {
                // Top section with padding (only shown when no recipe)
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        // Type Badge - tappable to change
                        Button(action: onTypeChange) {
                            HStack(spacing: 4) {
                                if let type = dish.type {
                                    Image(systemName: type.icon)
                                        .font(.system(size: 12))
                                    Text(type.displayName)
                                        .font(.caption)
                                        .fontWeight(.medium)
                                } else {
                                    Image(systemName: "tag")
                                        .font(.system(size: 12))
                                    Text("Dish Type")
                                        .font(.caption)
                                        .fontWeight(.medium)
                                }
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(dish.type != nil ? AppColors.accent.opacity(0.1) : Color.secondary.opacity(0.1))
                            .foregroundStyle(dish.type != nil ? AppColors.accent : .secondary)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)

                        Spacer()

                        // Recipes button - changes label when recipe is linked
                        Button(action: onRecipeTap) {
                            HStack(spacing: 4) {
                                Text("Recipes")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Image(systemName: "arrow.up.right")
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            .foregroundStyle(AppColors.accent)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
            }

            // Bottom section with padding (ALWAYS included, consistent padding regardless of recipe state)
            VStack(alignment: .leading, spacing: 16) {
                // Name - inline editable (like menu name)
                // Use recipe title if available, otherwise use dish name
                let displayName = dish.recipeURL != nil && dish.recipeTitle != nil ? dish.recipeTitle! : dish.name

                if isEditingName {
                    ExpandingTextEditor(
                        text: $editedName,
                        font: .system(size: 20, weight: .bold),
                        fontWeight: .bold,
                        fontSize: 20,
                        tracking: -0.5,
                        minHeight: 28
                    )
                    .focused($isNameFieldFocused)
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            isNameFieldFocused = true
                        }
                    }
                    .toolbar {
                        ToolbarItemGroup(placement: .keyboard) {
                            Spacer()
                            Button("Done") {
                                saveDishName()
                            }
                            .fontWeight(.semibold)
                        }
                    }
                } else {
                    Button(action: {
                        editedName = displayName
                        isEditingName = true
                    }) {
                        Text(displayName)
                            .font(.system(size: 20, weight: .bold))
                            .tracking(-0.5)
                            .foregroundStyle(.primary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                }

                // Ingredients - tappable to edit dish
                // Negative horizontal padding for optical alignment with headline
                FlowLayout(spacing: 8) {
                    ForEach(dish.allIngredients, id: \.self) { ingredient in
                        let isMenuFeatured = menuKeyIngredients.contains { $0.lowercased() == ingredient.lowercased() }
                        // Check if ingredient pairs with ALL menu featured ingredients
                        let pairsWithFeatured = menuKeyIngredients.isEmpty ||
                            isMenuFeatured ||
                            appState.flavorService.isCompatibleWithAll(ingredient, menuKeyIngredients)
                        // Stroke color: orange if pairs with all featured ingredients, grey if not
                        let strokeColor: Color = pairsWithFeatured ? AppColors.accent : Color.secondary.opacity(0.5)

                        Button(action: onTap) {
                            HStack(spacing: 4) {
                                // Star only for menu's featured ingredients
                                if isMenuFeatured {
                                    Image(systemName: "star.fill")
                                        .font(.system(size: 10))
                                        .foregroundStyle(AppColors.accent)
                                }
                                Text(ingredient.capitalized)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .foregroundStyle(.primary)
                            .background(
                                Capsule()
                                    .stroke(strokeColor, lineWidth: 1.5)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, -2)  // Negative padding for optical alignment

                // Bottom row: Regenerate, Edit, and Delete buttons
                if showDeleteConfirmation {
                    // Delete confirmation banner
                    HStack(spacing: 12) {
                        Text("Delete this dish?")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.primary)

                        Spacer()

                        Button("Cancel") {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                showDeleteConfirmation = false
                            }
                        }
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)

                        Button("Delete") {
                            withAnimation {
                                onDelete()
                            }
                        }
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(Color.red)
                        .clipShape(Capsule())
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .transition(.scale.combined(with: .opacity))
                } else {
                    // Normal action buttons
                    HStack(spacing: 12) {
                        // Regenerate button
                        Button(action: onRegenerate) {
                            HStack(spacing: 4) {
                                Image(systemName: "arrow.clockwise")
                                    .font(.system(size: 13))
                                Text("Regenerate")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .foregroundStyle(.secondary)
                            .background(Color.secondary.opacity(0.1))
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)

                        // Edit button
                        Button(action: onTap) {
                            HStack(spacing: 4) {
                                Image(systemName: "pencil")
                                    .font(.system(size: 13))
                                Text("Edit")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .foregroundStyle(.secondary)
                            .background(Color.secondary.opacity(0.1))
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)

                        Spacer()

                        // Delete button
                        Button(action: {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                showDeleteConfirmation = true
                            }
                        }) {
                            HStack(spacing: 4) {
                                Image(systemName: "trash")
                                    .font(.system(size: 13))
                                Text("Delete")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .foregroundStyle(.red)
                            .background(Color.red.opacity(0.1))
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 20)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func saveDishName() {
        let trimmed = editedName.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty {
            onNameChange(trimmed)
        }
        isEditingName = false
    }
}

struct DishEditorView: View {
    let dish: Dish
    let menuKeyIngredient: String
    let menuDietaryRestrictions: Set<DietaryRestriction>
    let menuCompatibilityMode: MenuConfiguration.MenuCompatibilityMode
    let onSave: (Dish) -> Void

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState

    @State private var ingredients: [Ingredient] = []
    @State private var showingSearch = false
    @State private var isGenerating = false

    /// Use appState's shared compatibilityEngine instead of creating a new one each render
    private var compatibilityEngine: CompatibilityEngine {
        appState.compatibilityEngine
    }

    /// List of ingredients that new additions must be compatible with
    private var compatibleIngredientsList: [String] {
        var list = [dish.keyIngredient] + ingredients.map(\.name)

        // In strict mode, also require compatibility with the menu's featured ingredient
        // In flexible/freeform mode, only require compatibility within the dish itself
        if menuCompatibilityMode == .strict && !menuKeyIngredient.isEmpty {
            // Add menu key ingredient if not already in the list
            if !list.contains(where: { $0.lowercased() == menuKeyIngredient.lowercased() }) {
                list.append(menuKeyIngredient)
            }
        }

        return list
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Dish Type Header
                HStack {
                    if let type = dish.type {
                        HStack(spacing: 4) {
                            Image(systemName: type.icon)
                            Text(type.displayName)
                        }
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(AppColors.accent)
                    }

                    Spacer()

                    if !dish.keyIngredient.isEmpty {
                        Text("Pairs with \(dish.keyIngredient.capitalized)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))

                // Ingredient Slots
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(0..<ingredientSlotCount, id: \.self) { index in
                            DishIngredientSlotView(
                                index: index,
                                ingredient: index < ingredients.count ? ingredients[index] : nil,
                                onTap: {
                                    showingSearch = true
                                },
                                onRemove: {
                                    if index < ingredients.count {
                                        ingredients.remove(at: index)
                                    }
                                },
                                onToggleLock: {
                                    if index < ingredients.count {
                                        ingredients[index].isLocked.toggle()
                                    }
                                }
                            )
                        }
                    }
                    .padding()
                }

                Divider()

                // Action Bar
                DishEditorActionBar(
                    onGenerate: {
                        Task {
                            await generateIngredients()
                        }
                    },
                    isGenerating: isGenerating,
                    canGenerate: !ingredients.isEmpty || !menuKeyIngredient.isEmpty
                )
            }
            .navigationTitle("Edit Dish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveDish()
                    }
                    .fontWeight(.semibold)
                    .disabled(ingredients.isEmpty)
                }
            }
            .sheet(isPresented: $showingSearch) {
                UnifiedIngredientPicker(
                    title: "Add Ingredient",
                    // In strict mode, also require compatibility with menu's featured ingredient
                    compatibleWith: compatibleIngredientsList,
                    selectedIngredient: nil,
                    menuDietaryRestrictions: menuDietaryRestrictions,
                    onSelect: { ingredientName in
                        addIngredient(ingredientName)
                        showingSearch = false
                    }
                )
            }
            .onAppear {
                loadDishIngredients()
            }
        }
    }

    private var ingredientSlotCount: Int {
        // Show existing ingredients plus exactly one empty "Add ingredient" slot
        ingredients.count + 1
    }

    private func ingredientCountForDishType(_ type: DishType?) -> Int {
        guard let type = type else { return 3 } // Default to 3 slots
        switch type {
        case .entree: return 4
        case .side: return 3
        case .salad: return 4
        case .dessert: return 3
        case .beverage: return 2
        case .sauce: return 3
        }
    }

    private func loadDishIngredients() {
        // Load existing ingredients, marking the key ingredient as locked
        ingredients = dish.allIngredients.map { name in
            Ingredient(name: name, isLocked: name.lowercased() == dish.keyIngredient.lowercased())
        }
    }

    private func addIngredient(_ name: String) {
        guard !ingredients.contains(where: { $0.name.lowercased() == name.lowercased() }) else { return }
        ingredients.append(Ingredient(name: name))
    }

    private func generateIngredients() async {
        isGenerating = true

        var lockedNames = ingredients.filter(\.isLocked).map(\.name)

        // Start with dish's key ingredient if no locked ingredients
        if lockedNames.isEmpty {
            lockedNames = [dish.keyIngredient]
        }

        // Determine target count:
        // - If no ingredients yet, use dish type default
        // - If only locked ingredients exist, add at least one more
        // - Otherwise, maintain current count
        let lockedCount = lockedNames.count
        let currentCount = ingredients.count
        let targetCount: Int
        if currentCount == 0 {
            targetCount = ingredientCountForDishType(dish.type)
        } else if currentCount <= lockedCount {
            // Only locked ingredients - generate at least one more
            targetCount = lockedCount + 1
        } else {
            targetCount = currentCount
        }

        // In strict mode, also include the menu's featured ingredient as a constraint
        // This ensures all generated ingredients pair with it
        // But we need to account for this when calculating targetCount for generation
        var requiredCompatibility = lockedNames
        var adjustedTargetCount = targetCount
        let willFilterMenuKey = menuCompatibilityMode == .strict &&
            !menuKeyIngredient.isEmpty &&
            !lockedNames.contains(where: { $0.lowercased() == menuKeyIngredient.lowercased() }) &&
            menuKeyIngredient.lowercased() != dish.keyIngredient.lowercased()

        if menuCompatibilityMode == .strict && !menuKeyIngredient.isEmpty {
            if !requiredCompatibility.contains(where: { $0.lowercased() == menuKeyIngredient.lowercased() }) {
                requiredCompatibility.append(menuKeyIngredient)
                // If we'll filter out the menu key ingredient later, request one extra
                if willFilterMenuKey {
                    adjustedTargetCount += 1
                }
            }
        }

        let result = await compatibilityEngine.generateCombination(
            targetCount: adjustedTargetCount,
            lockedIngredients: requiredCompatibility,
            mode: .perfect,
            dietaryRestrictions: menuDietaryRestrictions
        )

        // Convert result to Ingredient objects, preserving locked state
        // Filter out the menu key ingredient if it was only added for compatibility checking
        let originalLockedNames = ingredients.filter(\.isLocked).map(\.name)
        var newIngredients: [Ingredient] = []
        for name in result {
            // Skip menu key ingredient if it wasn't originally locked and isn't the dish's key ingredient
            if menuCompatibilityMode == .strict &&
               name.lowercased() == menuKeyIngredient.lowercased() &&
               name.lowercased() != dish.keyIngredient.lowercased() &&
               !originalLockedNames.contains(where: { $0.lowercased() == name.lowercased() }) {
                continue
            }
            let isLocked = originalLockedNames.contains(where: { $0.lowercased() == name.lowercased() })
            newIngredients.append(Ingredient(name: name, isLocked: isLocked))
        }

        if !newIngredients.isEmpty {
            withAnimation {
                ingredients = newIngredients
            }
        }

        isGenerating = false
    }

    private func saveDish() {
        guard !ingredients.isEmpty else { return }

        // Find the key/featured ingredient (first locked one, or first one)
        let featuredIngredient = ingredients.first(where: \.isLocked)?.name ?? ingredients.first?.name ?? dish.keyIngredient
        let supportingIngredients = ingredients.filter { $0.name.lowercased() != featuredIngredient.lowercased() }.map(\.name)

        // Calculate new taste profile
        let profiles = ingredients.compactMap { appState.ingredientService.getProfile($0.name) }
        let newProfile = TasteProfile.average(profiles.map(\.flavorProfile))

        // Preserve the original dish ID and recipe link so it can be updated in the menu
        let updatedDish = Dish(
            id: dish.id,
            name: Dish.generateName(keyIngredient: featuredIngredient, type: dish.type, mainIngredients: supportingIngredients),
            type: dish.type,
            keyIngredient: featuredIngredient,
            ingredients: supportingIngredients,
            tasteProfile: newProfile,
            weight: dish.weight,
            recipeURL: dish.recipeURL,
            recipeImageURL: dish.recipeImageURL,
            recipeTitle: dish.recipeTitle
        )

        onSave(updatedDish)
    }
}

struct DishIngredientSlotView: View {
    let index: Int
    let ingredient: Ingredient?
    let onTap: () -> Void
    let onRemove: () -> Void
    let onToggleLock: () -> Void

    @EnvironmentObject var appState: AppState
    @State private var showIngredientDetail = false

    private var profile: IngredientProfile? {
        guard let name = ingredient?.name else { return nil }
        return appState.ingredientService.getProfile(name)
    }

    var body: some View {
        HStack(spacing: 16) {
            // Lock/Unlock button (left side)
            Button(action: {
                if ingredient != nil {
                    onToggleLock()
                } else {
                    onTap()
                }
            }) {
                ZStack {
                    Circle()
                        .fill(ingredient != nil ? categoryColor.opacity(0.2) : Color.secondary.opacity(0.1))
                        .frame(width: 44, height: 44)

                    if let ingredient = ingredient {
                        Image(systemName: ingredient.isLocked ? "lock.fill" : "lock.open")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(ingredient.isLocked ? categoryColor : .secondary)
                    } else {
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .buttonStyle(.plain)

            // Content (middle) - tapping shows ingredient detail when ingredient exists
            Button(action: {
                if ingredient != nil {
                    showIngredientDetail = true
                } else {
                    onTap()
                }
            }) {
                VStack(alignment: .leading, spacing: 4) {
                    if let ingredient = ingredient {
                        Text(ingredient.name.capitalized)
                            .font(.headline)
                            .foregroundStyle(.primary)

                        if let profile = profile {
                            Text("\(profile.category) • \(profile.subcategory)")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        Text("Add ingredient")
                            .font(.headline)
                            .foregroundStyle(.secondary)

                        Text("Tap to search")
                            .font(.subheadline)
                            .foregroundStyle(.tertiary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)

            // Delete button (right side)
            if ingredient != nil {
                Button(action: onRemove) {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.red)
                }
                .buttonStyle(.plain)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(ingredient != nil ? categoryColor.opacity(0.08) : Color.secondary.opacity(0.05))
        )
        .sheet(isPresented: $showIngredientDetail) {
            if let profile = profile {
                IngredientDetailSheet(profile: profile)
            }
        }
    }

    private var categoryColor: Color {
        guard let profile = profile,
              let category = Category(rawValue: profile.category) else {
            return AppColors.accent
        }
        return category.color
    }
}

/// Bottom sheet showing ingredient details
struct IngredientDetailSheet: View {
    let profile: IngredientProfile
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Dismiss handle
            HStack {
                Spacer()
                Button(action: { dismiss() }) {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            // Ingredient name
            Text(profile.name.capitalized)
                .font(.title)
                .fontWeight(.black)

            // Category pill
            Text("\(profile.category.lowercased()) — \(profile.subcategory.lowercased())")
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .stroke(Color.primary.opacity(0.3), lineWidth: 1.5)
                )

            // Description
            Text(profile.description)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            Spacer()
        }
        .padding(.horizontal)
        .padding(.top, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color(.secondarySystemBackground))
        .presentationDetents([.height(240)])
        .presentationDragIndicator(.hidden)
    }
}

struct DishEditorActionBar: View {
    let onGenerate: () -> Void
    let isGenerating: Bool
    let canGenerate: Bool

    var body: some View {
        HStack(spacing: 12) {
            // Generate Button
            Button(action: onGenerate) {
                HStack(spacing: 8) {
                    if isGenerating {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(.white)
                    } else {
                        Image(systemName: "sparkles")
                    }
                    Text("Generate")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 44)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppColors.accent)
            .disabled(isGenerating || !canGenerate)
        }
        .padding()
        .background(Color(.systemBackground))
    }
}

// MARK: - Unified Ingredient Picker

enum IngredientSortOption: String, CaseIterable, Identifiable {
    case popularity = "Popularity"
    case category = "Category"
    case alphabetical = "A-Z"
    case taste = "Taste"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .popularity: return "star.fill"
        case .category: return "square.grid.2x2"
        case .alphabetical: return "textformat.abc"
        case .taste: return "flame"
        }
    }
}

/// Unified ingredient picker with search, sorting, filtering, and optional compatibility filtering
struct UnifiedIngredientPicker: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss

    // Configuration
    let title: String
    let compatibleWith: [String]
    let includeCompatibleWithIngredients: Bool  // Whether to include the compatibleWith ingredients themselves in results
    let selectedIngredient: String?
    let menuDietaryRestrictions: Set<DietaryRestriction>
    let onSelect: (String) -> Void

    // State
    @State private var searchText = ""
    @State private var sortOption: IngredientSortOption
    @State private var filterState: FilterState = .empty
    @State private var showingFilters = false
    @StateObject private var filterVM: FilterVM
    @State private var scrollToCategory: Category?

    init(
        title: String = "Select Ingredient",
        compatibleWith: [String] = [],
        includeCompatibleWithIngredients: Bool = false,
        selectedIngredient: String? = nil,
        menuDietaryRestrictions: Set<DietaryRestriction> = [],
        defaultSortOption: IngredientSortOption = .popularity,
        onSelect: @escaping (String) -> Void
    ) {
        self.title = title
        self.compatibleWith = compatibleWith
        self.includeCompatibleWithIngredients = includeCompatibleWithIngredients
        self.selectedIngredient = selectedIngredient
        self.menuDietaryRestrictions = menuDietaryRestrictions
        self.onSelect = onSelect

        // Note: We initialize filterVM in a way that works without appState at init time
        // The actual dependency will be resolved when the view appears
        _filterVM = StateObject(wrappedValue: FilterVM(ingredientService: IngredientService()))

        // Initialize filterState with menu dietary restrictions
        _filterState = State(initialValue: FilterState(dietaryRestrictions: menuDietaryRestrictions))

        // Initialize sortOption with the provided default
        _sortOption = State(initialValue: defaultSortOption)
    }

    private var filteredIngredients: [IngredientProfile] {
        // Use appState's shared searchService instead of creating a new one each render
        let searchResults = appState.searchService.search(
            query: searchText,
            filters: filterState,
            compatibleWith: compatibleWith,
            includeCompatibleWithIngredients: includeCompatibleWithIngredients
        )

        return searchResults.map { $0.profile }
    }

    private var sortedIngredients: [IngredientProfile] {
        switch sortOption {
        case .alphabetical:
            return filteredIngredients.sorted { $0.name < $1.name }
        case .category:
            return filteredIngredients.sorted { lhs, rhs in
                // Use normalized categories to handle legacy names like "Condiments" -> "Pantry"
                let lhsCategory = Category.normalized(lhs.category)
                let rhsCategory = Category.normalized(rhs.category)

                // Sort by category order first
                if let lhsCat = lhsCategory, let rhsCat = rhsCategory {
                    if lhsCat.sortOrder != rhsCat.sortOrder {
                        return lhsCat.sortOrder < rhsCat.sortOrder
                    }
                    // Same category - sort by subcategory order
                    let lhsSubOrder = lhsCat.subcategorySortOrder(lhs.subcategory)
                    let rhsSubOrder = rhsCat.subcategorySortOrder(rhs.subcategory)
                    if lhsSubOrder != rhsSubOrder {
                        return lhsSubOrder < rhsSubOrder
                    }
                    // Same subcategory - sort by name
                    return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
                }

                // Fallback to alphabetical if category not found
                return lhs.category < rhs.category
            }
        case .taste:
            return filteredIngredients.sorted { lhs, rhs in
                let lhsMax = lhs.flavorProfile.dimensions.map(\.1).max() ?? 0
                let rhsMax = rhs.flavorProfile.dimensions.map(\.1).max() ?? 0
                return lhsMax > rhsMax
            }
        case .popularity:
            return filteredIngredients.sorted { lhs, rhs in
                let lhsCount = appState.flavorService.getCompatibleIngredients(lhs.name).count
                let rhsCount = appState.flavorService.getCompatibleIngredients(rhs.name).count
                return lhsCount > rhsCount
            }
        }
    }

    /// Group ingredients by their normalized category for the category sort mode
    private var groupedIngredients: [(category: Category, ingredients: [IngredientProfile])] {
        // Group by normalized category
        var groups: [Category: [IngredientProfile]] = [:]
        for profile in sortedIngredients {
            let category = Category.normalized(profile.category) ?? .pantry
            groups[category, default: []].append(profile)
        }
        // Return sorted by category order
        return Category.allCases
            .filter { groups[$0] != nil }
            .map { ($0, groups[$0]!) }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar with Filter Button
                HStack(spacing: 12) {
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(.secondary)

                        TextField("Search ingredients...", text: $searchText)
                            .textFieldStyle(.plain)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)

                        if !searchText.isEmpty {
                            Button {
                                searchText = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    // Filter Button
                    Button {
                        filterVM.beginEditing(currentState: filterState)
                        showingFilters = true
                    } label: {
                        ZStack(alignment: .topTrailing) {
                            Image(systemName: "line.3.horizontal.decrease.circle")
                                .font(.system(size: 24))
                                .foregroundStyle(filterState.hasActiveFilters ? AppColors.accent : .secondary)

                            if filterState.hasActiveFilters {
                                Circle()
                                    .fill(AppColors.accent)
                                    .frame(width: 8, height: 8)
                                    .offset(x: 2, y: -2)
                            }
                        }
                        .frame(width: 44, height: 44)
                    }
                }
                .padding(.horizontal)
                .padding(.top)

                // Sort Options
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(IngredientSortOption.allCases) { option in
                            Button {
                                withAnimation {
                                    sortOption = option
                                }
                            } label: {
                                HStack(spacing: 6) {
                                    Image(systemName: option.icon)
                                        .font(.system(size: 14))
                                    Text(option.rawValue)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(sortOption == option ? AppColors.accent : Color(.tertiarySystemBackground))
                                .foregroundStyle(sortOption == option ? .white : .primary)
                                .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 12)
                }

                // Category Jump Pills (shown when Category sort is active)
                if sortOption == .category {
                    let availableCategories = Set(groupedIngredients.map(\.category))
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(Category.allCases.filter { availableCategories.contains($0) }) { category in
                                Button {
                                    withAnimation {
                                        scrollToCategory = category
                                    }
                                } label: {
                                    HStack(spacing: 6) {
                                        Image(systemName: category.icon)
                                            .font(.system(size: 12))
                                        Text(category.displayName)
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .foregroundStyle(category.color)
                                    .background(category.color.opacity(0.15))
                                    .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 12)
                    }
                }

                // Results - Pill Grid with Category Sections
                if sortedIngredients.isEmpty {
                    EmptyIngredientSearchView()
                } else if sortOption == .category {
                    // Category-grouped view with headers
                    GeometryReader { geometry in
                        ScrollViewReader { proxy in
                            ScrollView {
                                LazyVStack(alignment: .leading, spacing: 20) {
                                    ForEach(groupedIngredients, id: \.category) { group in
                                        CategoryIngredientSection(
                                            category: group.category,
                                            ingredients: group.ingredients,
                                            selectedIngredient: selectedIngredient,
                                            featuredIngredient: includeCompatibleWithIngredients ? compatibleWith.first : nil,
                                            onSelect: onSelect,
                                            availableWidth: geometry.size.width - 40
                                        )
                                        .id(group.category)
                                    }
                                }
                                .padding(20)
                            }
                            .onChange(of: scrollToCategory) { _, category in
                                if let category = category {
                                    withAnimation {
                                        proxy.scrollTo(category, anchor: .top)
                                    }
                                    scrollToCategory = nil
                                }
                            }
                        }
                    }
                } else {
                    // Flat pill grid for other sort modes
                    GeometryReader { geometry in
                        ScrollView {
                            FlowLayout(spacing: 12) {
                                ForEach(sortedIngredients) { profile in
                                    IngredientPillButton(
                                        profile: profile,
                                        isSelected: profile.name.lowercased() == selectedIngredient?.lowercased(),
                                        isFeatured: includeCompatibleWithIngredients && profile.name.lowercased() == compatibleWith.first?.lowercased(),
                                        onSelect: { onSelect(profile.name) }
                                    )
                                }
                            }
                            .frame(width: geometry.size.width - 40)
                            .padding(20)
                        }
                    }
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingFilters) {
                FilterPanelView(
                    onApply: {
                        filterState = filterVM.applyFilters()
                    },
                    onReset: {
                        filterVM.resetFilters()
                        filterState = .empty
                    }
                )
                .environmentObject(filterVM)
            }
            .onAppear {
                // Update filterVM with the correct ingredientService from appState
                filterVM.updateService(appState.ingredientService)
            }
        }
    }
}

struct UnifiedIngredientRow: View {
    let profile: IngredientProfile
    let isSelected: Bool

    var body: some View {
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
                Text(profile.name.capitalized)
                    .font(.body)
                    .foregroundStyle(.primary)

                Text("\(profile.category) • \(profile.subcategory)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Dominant taste indicator or checkmark
            if isSelected {
                Image(systemName: "checkmark")
                    .foregroundStyle(AppColors.accent)
                    .font(.system(size: 16, weight: .semibold))
            } else if let dominant = profile.dominantTaste {
                TasteIndicator(dimension: dominant, value: profile.flavorProfile.value(for: dominant))
            }
        }
        .contentShape(Rectangle())
    }

    private var categoryColor: Color {
        Category(rawValue: profile.category)?.color ?? .gray
    }

    private var categoryIcon: String {
        Category(rawValue: profile.category)?.icon ?? "questionmark"
    }
}

struct EmptyIngredientSearchView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)

            Text("No ingredients found")
                .font(.headline)

            Text("Try a different search term or sort option")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Category Section with Header

struct CategoryIngredientSection: View {
    let category: Category
    let ingredients: [IngredientProfile]
    let selectedIngredient: String?
    var featuredIngredient: String? = nil
    let onSelect: (String) -> Void
    let availableWidth: CGFloat

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Category Header with divider line
            HStack(spacing: 8) {
                Text(category.displayName)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(category.color)

                Rectangle()
                    .fill(category.color.opacity(0.3))
                    .frame(height: 1)
            }

            // Ingredient Pills in FlowLayout
            FlowLayout(spacing: 12) {
                ForEach(ingredients) { profile in
                    IngredientPillButton(
                        profile: profile,
                        isSelected: profile.name.lowercased() == selectedIngredient?.lowercased(),
                        isFeatured: profile.name.lowercased() == featuredIngredient?.lowercased(),
                        onSelect: { onSelect(profile.name) }
                    )
                }
            }
            .frame(width: availableWidth)
        }
    }
}

// MARK: - Ingredient Pill Button

struct IngredientPillButton: View {
    let profile: IngredientProfile
    let isSelected: Bool
    var isFeatured: Bool = false
    let onSelect: () -> Void

    private var categoryColor: Color {
        Category.normalized(profile.category)?.color ?? .gray
    }

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 4) {
                if isFeatured {
                    Image(systemName: "star.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(AppColors.accent)
                }
                Text(profile.name.capitalized)
                    .font(.callout)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .foregroundStyle(isSelected || isFeatured ? AppColors.accent : .primary)
            .background(
                Capsule()
                    .stroke(isSelected || isFeatured ? AppColors.accent : categoryColor, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Dietary Restrictions Pills

struct DietaryRestrictionsPills: View {
    let restrictions: Set<DietaryRestriction>

    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(Array(restrictions).sorted(by: { $0.displayName < $1.displayName }), id: \.self) { restriction in
                HStack(spacing: 6) {
                    Image(systemName: restriction.icon)
                        .font(.system(size: 12))
                    Text(restriction.displayName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .foregroundStyle(AppColors.accent)
                .background(AppColors.accent.opacity(0.2))
                .clipShape(Capsule())
            }
        }
    }
}

// MARK: - Featured Ingredient Selection Card (Empty State)

struct FeaturedIngredientSelectionCard: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var menuPlannerVM: MenuPlannerVM

    let ingredient: String  // Display only - backward compatibility
    let isDisabled: Bool
    let onGenerateIngredient: () -> Void
    let onSearchTap: () -> Void
    let onRegenerate: () -> Void

    @State private var showRegenerateConfirmation = false
    @State private var showAddIngredientPicker = false

    private var keyIngredients: [String] {
        menuPlannerVM.configuration.keyIngredients
    }

    private var hasMultipleIngredients: Bool {
        keyIngredients.count > 1
    }

    private var displayIngredient: String {
        keyIngredients.first ?? ingredient
    }

    private var profile: IngredientProfile? {
        guard !displayIngredient.isEmpty else { return nil }
        return appState.ingredientService.getProfile(displayIngredient)
    }

    private var hasIngredient: Bool {
        !keyIngredients.isEmpty
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header row with label and action icons (always show icons in top right)
            HStack {
                Text(hasMultipleIngredients ? "Featured Ingredients" : "Featured Ingredient")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Spacer()

                if !isDisabled {
                    // Add button - plus icon to add another ingredient
                    if hasIngredient {
                        Button {
                            showAddIngredientPicker = true
                        } label: {
                            Image(systemName: "plus")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(AppColors.accent)
                        }
                        .buttonStyle(.plain)
                        .padding(.trailing, 8)
                    }

                    // Search icon to change/select ingredient
                    Button(action: onSearchTap) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)

                    // Regenerate icon
                    Button {
                        // Show confirmation if menu has more than 1 dish
                        if (menuPlannerVM.generatedMenu?.dishes.count ?? 0) > 1 {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                showRegenerateConfirmation = true
                            }
                        } else {
                            onRegenerate()
                        }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(AppColors.accent)
                    }
                    .buttonStyle(.plain)
                    .padding(.leading, 8)
                }
            }

            // Regenerate confirmation banner
            if showRegenerateConfirmation {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Regenerate ingredient?")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.primary)
                        Text("Clears all dishes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button("Cancel") {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            showRegenerateConfirmation = false
                        }
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)

                    Button("Regenerate") {
                        withAnimation {
                            onRegenerate()
                            showRegenerateConfirmation = false
                        }
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(AppColors.accent)
                    .clipShape(Capsule())
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .transition(.scale.combined(with: .opacity))
            }

            if hasIngredient {
                if hasMultipleIngredients {
                    // Multiple ingredients - show pills with X buttons
                    FlowLayout(spacing: 8) {
                        ForEach(keyIngredients, id: \.self) { ingredient in
                            IngredientPillWithX(ingredient: ingredient) {
                                removeIngredient(ingredient)
                            }
                        }
                    }
                    .padding(.horizontal, -2)  // Optical alignment
                } else {
                    // Single ingredient - show larger display with category
                    Button(action: onSearchTap) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(displayIngredient.capitalized)
                                .font(.system(size: 28, weight: .black))
                                .foregroundStyle(isDisabled ? .secondary : .primary)

                            if let profile = profile {
                                Text("\(profile.category.lowercased()) — \(profile.subcategory.lowercased())")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(
                                        Capsule()
                                            .stroke(Color.primary.opacity(0.3), lineWidth: 1.5)
                                    )
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    .disabled(isDisabled)
                }
            } else {
                // Empty state - tappable area to open search
                Button(action: onSearchTap) {
                    Text(isDisabled ? "Not used in Freeform mode" : "Tap to select ingredient")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
                .disabled(isDisabled)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .opacity(isDisabled ? 0.5 : 1.0)
        .sheet(isPresented: $showAddIngredientPicker) {
            UnifiedIngredientPicker(
                title: "Add Featured Ingredient",
                compatibleWith: keyIngredients,  // New ingredient must pair with existing ones
                selectedIngredient: nil,
                menuDietaryRestrictions: menuPlannerVM.configuration.dietaryRestrictions,
                onSelect: { newIngredient in
                    addIngredient(newIngredient)
                    showAddIngredientPicker = false
                }
            )
        }
    }

    private func addIngredient(_ ingredient: String) {
        var newIngredients = keyIngredients
        if !newIngredients.contains(where: { $0.lowercased() == ingredient.lowercased() }) {
            newIngredients.append(ingredient)
            menuPlannerVM.setKeyIngredients(newIngredients)
        }
    }

    private func removeIngredient(_ ingredient: String) {
        var newIngredients = keyIngredients
        newIngredients.removeAll { $0.lowercased() == ingredient.lowercased() }
        menuPlannerVM.setKeyIngredients(newIngredients)
    }
}

// MARK: - Dish Type Selection Grid

struct DishTypeSelectionGrid: View {
    @Binding var selectedDishTypes: [DishType: Int]
    let onIncrement: (DishType) -> Void
    let onDecrement: (DishType) -> Void

    // Arrange dish types in specific order for 2-column layout
    // Column 1: Entree, Side, Salad | Column 2: Dessert, Beverage, Sauce
    private let leftColumn: [DishType] = [.entree, .side, .salad]
    private let rightColumn: [DishType] = [.dessert, .beverage, .sauce]

    private var allDishTypes: [DishType] {
        leftColumn + rightColumn
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with "Add All" button
            HStack {
                Text("Dishes")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Spacer()

                Button {
                    for dishType in allDishTypes {
                        if (selectedDishTypes[dishType] ?? 0) == 0 {
                            onIncrement(dishType)
                        }
                    }
                } label: {
                    Text("Add All")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(AppColors.accent)
                }
                .buttonStyle(.plain)
            }

            HStack(alignment: .top, spacing: 24) {
                // Left column
                VStack(spacing: 0) {
                    ForEach(Array(leftColumn.enumerated()), id: \.element) { index, dishType in
                        DishTypeRow(
                            dishType: dishType,
                            count: selectedDishTypes[dishType] ?? 0,
                            onIncrement: { onIncrement(dishType) },
                            onDecrement: { onDecrement(dishType) }
                        )

                        if index < leftColumn.count - 1 {
                            Divider()
                        }
                    }
                }

                // Right column
                VStack(spacing: 0) {
                    ForEach(Array(rightColumn.enumerated()), id: \.element) { index, dishType in
                        DishTypeRow(
                            dishType: dishType,
                            count: selectedDishTypes[dishType] ?? 0,
                            onIncrement: { onIncrement(dishType) },
                            onDecrement: { onDecrement(dishType) }
                        )

                        if index < rightColumn.count - 1 {
                            Divider()
                        }
                    }
                }
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}

struct DishTypeRow: View {
    let dishType: DishType
    let count: Int
    let onIncrement: () -> Void
    let onDecrement: () -> Void

    var body: some View {
        Button(action: onIncrement) {
            HStack(spacing: 8) {
                Image(systemName: dishType.icon)
                    .font(.system(size: 16))
                    .foregroundStyle(AppColors.accent)
                    .frame(width: 24)

                Text(dishType.displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)

                Spacer()

                // Fixed-size container for count badge or plus icon
                ZStack {
                    if count > 0 {
                        // Show count badge with decrement on tap
                        Button(action: onDecrement) {
                            Text("\(count)")
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundStyle(.black)
                                .frame(width: 24, height: 24)
                                .background(AppColors.accent)
                                .clipShape(Circle())
                        }
                        .buttonStyle(.plain)
                    } else {
                        // Show + button
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(AppColors.accent)
                    }
                }
                .frame(width: 24, height: 24)
            }
            .frame(height: 40)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Dietary Restrictions Selection Section

struct DietaryRestrictionsSelectionSection: View {
    @Binding var restrictions: Set<DietaryRestriction>
    @State private var isExpanded = false

    private var activeCount: Int {
        restrictions.count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header - tappable to expand/collapse
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack {
                    Text("Dietary Restrictions")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    if activeCount > 0 && !isExpanded {
                        Text("\(activeCount)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                            .frame(width: 20, height: 20)
                            .background(AppColors.accent)
                            .clipShape(Circle())
                    }

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "plus")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(AppColors.accent)
                }
            }
            .buttonStyle(.plain)

            // Expanded content
            if isExpanded {
                VStack(spacing: 8) {
                    ForEach(DietaryRestriction.allCases, id: \.self) { restriction in
                        DietaryRestrictionToggleRow(
                            restriction: restriction,
                            isSelected: restrictions.contains(restriction),
                            onToggle: {
                                if restrictions.contains(restriction) {
                                    restrictions.remove(restriction)
                                } else {
                                    restrictions.insert(restriction)
                                }
                            }
                        )
                    }
                }
            } else if activeCount > 0 {
                // Show active restrictions as pills when collapsed
                FlowLayout(spacing: 8) {
                    ForEach(Array(restrictions).sorted(by: { $0.displayName < $1.displayName }), id: \.self) { restriction in
                        HStack(spacing: 4) {
                            Image(systemName: restriction.icon)
                                .font(.system(size: 12))
                            Text(restriction.displayName)
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .foregroundStyle(AppColors.accent)
                        .background(AppColors.accent.opacity(0.15))
                        .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}

struct DietaryRestrictionToggleRow: View {
    let restriction: DietaryRestriction
    let isSelected: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 12) {
                Image(systemName: restriction.icon)
                    .font(.system(size: 16))
                    .foregroundStyle(isSelected ? AppColors.accent : .secondary)
                    .frame(width: 24)

                Text(restriction.displayName)
                    .font(.body)
                    .foregroundStyle(.primary)

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(AppColors.accent)
                }
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(isSelected ? AppColors.accent.opacity(0.1) : Color.clear)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Supporting Components

/// Ingredient pill with X button for removing from multi-ingredient selection
struct IngredientPillWithX: View {
    let ingredient: String
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Text(ingredient.capitalized)
                .font(.subheadline)
                .fontWeight(.medium)

            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.primary.opacity(0.6))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(AppColors.accent.opacity(0.15))
        .foregroundStyle(AppColors.accent)
        .clipShape(Capsule())
    }
}

/// Sheet for inputting a recipe URL to create a dish
struct RecipeURLInputSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onSave: (String, String?) -> Void
    let onDismiss: () -> Void

    @State private var recipeURL: String = ""
    @State private var recipeTitle: String = ""
    @FocusState private var isURLFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Instructions
                Text("Add a recipe by pasting its URL below. You can optionally add a title.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // URL Input
                VStack(alignment: .leading, spacing: 8) {
                    Text("Recipe URL")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("https://example.com/recipe", text: $recipeURL)
                        .textFieldStyle(.plain)
                        .font(.body)
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .focused($isURLFocused)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                }

                // Title Input (Optional)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Recipe Title (Optional)")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("Enter dish name", text: $recipeTitle)
                        .textFieldStyle(.plain)
                        .font(.body)
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Spacer()
            }
            .padding()
            .navigationTitle("Add from Recipe URL")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        onDismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        save()
                    }
                    .fontWeight(.semibold)
                    .disabled(!isValidURL)
                }
            }
            .onAppear {
                isURLFocused = true
            }
        }
        .presentationDetents([.medium])
    }

    private var isValidURL: Bool {
        let trimmed = recipeURL.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return false }
        // Basic URL validation
        return URL(string: trimmed) != nil
    }

    private func save() {
        let trimmedURL = recipeURL.trimmingCharacters(in: .whitespaces)
        let trimmedTitle = recipeTitle.trimmingCharacters(in: .whitespaces)
        let title = trimmedTitle.isEmpty ? nil : trimmedTitle

        onSave(trimmedURL, title)
    }
}

// MARK: - Empty State Featured Ingredient Card

/// Featured ingredient card for the empty menu state - shows "New Menu" title and "Tap to select..."
struct EmptyStateFeaturedIngredientCard: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var menuPlannerVM: MenuPlannerVM

    let isDisabled: Bool
    let onTap: () -> Void
    let onGenerateRandom: () -> Void
    let onRegenerate: () -> Void

    @State private var showAddIngredientPicker = false

    private var keyIngredients: [String] {
        menuPlannerVM.configuration.keyIngredients
    }

    private var hasMultipleIngredients: Bool {
        keyIngredients.count > 1
    }

    private var displayIngredient: String {
        keyIngredients.first ?? ""
    }

    private var profile: IngredientProfile? {
        guard !displayIngredient.isEmpty else { return nil }
        return appState.ingredientService.getProfile(displayIngredient)
    }

    // Calculate mutual pairings count for all featured ingredients
    private var mutualPairingsCount: Int {
        guard !keyIngredients.isEmpty else { return 0 }
        return appState.flavorService.getIngredientsCompatibleWithAll(keyIngredients).count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Top row: Pairing count badge (if ingredient selected)
            if !keyIngredients.isEmpty {
                HStack {
                    Text("\(mutualPairingsCount) PAIRINGS")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .tracking(0.5)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.secondary.opacity(0.15))
                        .clipShape(Capsule())

                    Spacer()
                }
            }

            // Menu name - "New Menu" for empty state
            Text("New Menu")
                .font(.system(size: 36, weight: .black))
                .foregroundStyle(.primary)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Header row with label and action icons
            HStack {
                Text(hasMultipleIngredients ? "FEATURED INGREDIENTS" : "FEATURED INGREDIENT")
                    .font(.caption)
                    .textCase(.uppercase)
                    .tracking(0.5)
                    .foregroundStyle(.secondary)

                // Add ingredient button - inline with header
                if !isDisabled && !keyIngredients.isEmpty {
                    Button {
                        showAddIngredientPicker = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(AppColors.accent)
                    }
                    .buttonStyle(.plain)
                }

                Spacer()
            }

            // Content area
            VStack(alignment: .leading, spacing: 12) {
                if keyIngredients.isEmpty {
                    // Empty state - tappable area with Generate Random option
                    VStack(alignment: .leading, spacing: 16) {
                        Button(action: {
                            if !isDisabled {
                                onTap()
                            }
                        }) {
                            Text(isDisabled ? "Not used in Freeform mode" : "Tap to select...")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.plain)
                        .disabled(isDisabled)

                        // Generate Random button - only when no ingredient selected and not in Freeform mode
                        if !isDisabled {
                            Button(action: onGenerateRandom) {
                                HStack(spacing: 8) {
                                    if menuPlannerVM.isGenerating {
                                        ProgressView()
                                            .progressViewStyle(.circular)
                                            .tint(AppColors.accent)
                                            .scaleEffect(0.8)
                                    } else {
                                        Image(systemName: "sparkles")
                                            .font(.system(size: 14, weight: .semibold))
                                    }
                                    Text("Generate Random")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                }
                                .foregroundStyle(AppColors.accent)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(
                                    Capsule()
                                        .stroke(AppColors.accent, lineWidth: 1.5)
                                )
                            }
                            .buttonStyle(.plain)
                            .disabled(menuPlannerVM.isGenerating)
                        }
                    }
                } else {
                    // Show pills for featured ingredients (tappable to edit)
                    FlowLayout(spacing: 8) {
                        ForEach(keyIngredients, id: \.self) { ingredient in
                            HStack(spacing: 6) {
                                Text(ingredient.capitalized)
                                    .font(.body)
                                    .fontWeight(.medium)

                                Button(action: {
                                    removeIngredient(ingredient)
                                }) {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(.primary.opacity(0.6))
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(AppColors.accent.opacity(0.15))
                            .foregroundStyle(AppColors.accent)
                            .clipShape(Capsule())
                        }
                    }

                    // Category and description for the first ingredient
                    if let profile = profile {
                        Text("\(profile.category.lowercased()) — \(profile.subcategory.lowercased())")
                            .font(.callout)
                            .fontWeight(.medium)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(
                                Capsule()
                                    .stroke(Color.primary.opacity(0.4), lineWidth: 1.5)
                            )

                        // Description
                        Text(profile.description)
                            .font(.callout)
                            .foregroundStyle(.secondary)
                            .lineSpacing(2)
                    }

                    // Actions row - search and regenerate
                    HStack(spacing: 16) {
                        Button(action: onTap) {
                            HStack(spacing: 6) {
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 14, weight: .semibold))
                                Text("Change")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                            }
                            .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)

                        Button(action: onRegenerate) {
                            HStack(spacing: 6) {
                                if menuPlannerVM.isGenerating {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                        .tint(AppColors.accent)
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: "arrow.clockwise")
                                        .font(.system(size: 14, weight: .semibold))
                                }
                                Text("Regenerate")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                            }
                            .foregroundStyle(AppColors.accent)
                        }
                        .buttonStyle(.plain)
                        .disabled(menuPlannerVM.isGenerating)

                        Spacer()
                    }
                    .padding(.top, 8)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .opacity(isDisabled ? 0.5 : 1.0)
        .sheet(isPresented: $showAddIngredientPicker) {
            UnifiedIngredientPicker(
                title: "Add Featured Ingredient",
                compatibleWith: keyIngredients,  // New ingredient must pair with existing ones
                selectedIngredient: nil,
                menuDietaryRestrictions: menuPlannerVM.configuration.dietaryRestrictions,
                onSelect: { newIngredient in
                    addIngredient(newIngredient)
                    showAddIngredientPicker = false
                }
            )
        }
    }

    private func addIngredient(_ ingredient: String) {
        var newIngredients = keyIngredients
        if !newIngredients.contains(where: { $0.lowercased() == ingredient.lowercased() }) {
            newIngredients.append(ingredient)
            menuPlannerVM.setKeyIngredients(newIngredients)
        }
    }

    private func removeIngredient(_ ingredient: String) {
        var newIngredients = keyIngredients
        newIngredients.removeAll { $0.lowercased() == ingredient.lowercased() }
        menuPlannerVM.setKeyIngredients(newIngredients)
    }
}

// MARK: - Placeholder Sections for Empty State

/// Placeholder for Drink Pairings section when no dishes exist
struct DrinkPairingSectionPlaceholder: View {
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header - tappable to expand/collapse
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: "wineglass")
                            .font(.system(size: 16))
                            .foregroundStyle(.secondary)

                        Text("Drink Pairings")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.tertiary)
                }
            }
            .buttonStyle(.plain)
            .disabled(true)  // Disabled in empty state
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .opacity(0.5)
    }
}

/// Placeholder for Menu Info section when no dishes exist
struct MenuInfoSectionPlaceholder: View {
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header - tappable to expand/collapse
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: "chart.bar.doc.horizontal")
                            .font(.system(size: 16))
                            .foregroundStyle(.secondary)

                        Text("Menu Info")
                            .font(.headline)
                            .foregroundStyle(.secondary)

                        Text("0 dishes")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(.tertiary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color(.tertiarySystemFill))
                            .clipShape(Capsule())
                    }

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.tertiary)
                }
            }
            .buttonStyle(.plain)
            .disabled(true)  // Disabled in empty state
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .opacity(0.5)
    }
}

// MARK: - Add Dish Menu Overlay

struct AddDishMenuOverlay: View {
    @Binding var isPresented: Bool
    let onGenerateRandom: () -> Void
    let onBuildCustom: () -> Void
    let onAddFromURL: () -> Void

    var body: some View {
        ZStack {
            // Background dimmer
            if isPresented {
                Color.black.opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                            isPresented = false
                        }
                    }
                    .transition(.opacity)
            }

            // Menu card
            VStack {
                Spacer()

                if isPresented {
                    VStack(spacing: 0) {
                        // Generate Random Dish
                        Button(action: onGenerateRandom) {
                            HStack(spacing: 12) {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 18))
                                    .foregroundStyle(AppColors.accent)

                                Text("Generate Random Dish")
                                    .font(.body)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.primary)

                                Spacer()
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(Color(.secondarySystemGroupedBackground))
                        }
                        .buttonStyle(.plain)

                        Divider()
                            .padding(.horizontal, 20)

                        // Build Custom Dish
                        Button(action: onBuildCustom) {
                            HStack(spacing: 12) {
                                Image(systemName: "hammer")
                                    .font(.system(size: 18))
                                    .foregroundStyle(AppColors.accent)

                                Text("Build Custom Dish")
                                    .font(.body)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.primary)

                                Spacer()
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(Color(.secondarySystemGroupedBackground))
                        }
                        .buttonStyle(.plain)

                        Divider()
                            .padding(.horizontal, 20)

                        // Add from Recipe URL
                        Button(action: onAddFromURL) {
                            HStack(spacing: 12) {
                                Image(systemName: "link")
                                    .font(.system(size: 18))
                                    .foregroundStyle(AppColors.accent)

                                Text("Add from Recipe URL")
                                    .font(.body)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.primary)

                                Spacer()
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(Color(.secondarySystemGroupedBackground))
                        }
                        .buttonStyle(.plain)
                    }
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: -5)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 100)  // Position above tab bar
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: isPresented)
    }
}

// MARK: - Previews

#Preview {
    let ingredientService = IngredientService()
    return MenuBuilderView()
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
        .environmentObject(AppState())
}
