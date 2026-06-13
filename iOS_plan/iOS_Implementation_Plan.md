# Flavor Finder iOS Implementation Plan

A native iOS version of Flavor Finder V2, providing a 1:1 feature-equivalent experience optimized for iOS.

## Technology Stack

- **Language**: Swift 5.9+
- **UI Framework**: SwiftUI (iOS 17+)
- **Architecture**: MVVM with Observable
- **State Management**: SwiftUI @Observable macro
- **Animations**: SwiftUI built-in + custom transitions
- **Persistence**: UserDefaults (settings), JSON files (data)
- **Minimum iOS**: 17.0

---

## Project Structure

```
FlavorFinder/
├── App/
│   └── FlavorFinderApp.swift           # App entry point
├── Models/
│   ├── Ingredient.swift                 # Core ingredient model
│   ├── IngredientProfile.swift          # Full ingredient metadata
│   ├── FlavorProfile.swift              # 7-dimension taste profile
│   ├── Category.swift                   # Category/subcategory enums
│   └── DietaryRestriction.swift         # Dietary filter types
├── ViewModels/
│   ├── FlavorFinderViewModel.swift      # Main app state
│   ├── IngredientSelectionVM.swift      # Selected ingredients, locks, history
│   ├── FilterViewModel.swift            # Search, category, taste filters
│   ├── CompatibilityViewModel.swift     # Generation mode settings
│   └── ThemeViewModel.swift             # Dark mode, high contrast
├── Views/
│   ├── Main/
│   │   ├── ContentView.swift            # Root view container
│   │   ├── IngredientDisplayView.swift  # Hero/compact ingredient display
│   │   └── HeaderView.swift             # Minimal header with logo
│   ├── BottomBar/
│   │   └── BottomNavigationBar.swift    # 5-button bottom bar
│   ├── Drawer/
│   │   ├── IngredientDrawer.swift       # Bottom sheet drawer
│   │   ├── SearchBarView.swift          # Search input
│   │   ├── IngredientGridView.swift     # Scrollable ingredient buttons
│   │   ├── IngredientButtonView.swift   # Individual ingredient button
│   │   └── SortTabsView.swift           # Sort mode tabs
│   ├── Filters/
│   │   ├── FilterPanelView.swift        # Collapsible filter panel
│   │   ├── CategoryFilterView.swift     # Category/subcategory selector
│   │   ├── TasteFilterView.swift        # Taste sliders
│   │   └── DietaryFilterView.swift      # Dietary restriction toggles
│   ├── Components/
│   │   ├── DietaryPillsView.swift       # Active dietary filter pills
│   │   ├── LockIconView.swift           # Custom lock/unlock icons
│   │   ├── TasteTagView.swift           # Colored taste indicator
│   │   ├── IngredientInfoView.swift     # Expandable ingredient details
│   │   └── GenerateButtonView.swift     # Sparkles generate button
│   └── Sidebar/
│       └── SidebarView.swift            # Left slide-out settings panel
├── Services/
│   ├── FlavorMapService.swift           # Pairing lookup service
│   ├── GenerationService.swift          # Random generation algorithm
│   ├── FilterService.swift              # Ingredient filtering logic
│   └── PersistenceService.swift         # UserDefaults/storage
├── Data/
│   ├── FlavorPairings.json              # Ingredient pairings data
│   ├── IngredientProfiles.json          # Full ingredient metadata
│   └── DietaryIngredients.json          # Nut/nightshade/FODMAP lists
├── Utils/
│   ├── Colors.swift                     # Taste colors, theme colors
│   ├── IngredientColors.swift           # Dominant taste color logic
│   ├── SearchUtils.swift                # Text normalization, matching
│   └── Constants.swift                  # App-wide constants
└── Resources/
    └── Assets.xcassets                  # App icons, colors
```

---

## Phase 1: Foundation (Core Models & Data)

### 1.1 Data Models

**FlavorProfile.swift**
```swift
struct FlavorProfile: Codable, Equatable {
    var sweet: Int      // 0-10
    var salty: Int
    var sour: Int
    var umami: Int
    var fat: Int
    var spicy: Int
    var aromatic: Int

    static let tasteDimensions = ["sweet", "salty", "sour", "umami", "fat", "spicy", "aromatic"]

    func dominantTaste() -> String? {
        // Return taste with highest value (>= 5)
    }
}
```

**Category.swift**
```swift
enum IngredientCategory: String, Codable, CaseIterable {
    case proteins = "Proteins"
    case vegetables = "Vegetables"
    case fruits = "Fruits"
    case dairy = "Dairy"
    case seasonings = "Seasonings"
    case pantry = "Pantry"
    case grains = "Grains"
    case alcohol = "Alcohol"

    var subcategories: [String] {
        switch self {
        case .proteins: return ["Meat", "Poultry", "Seafood", "Plant Proteins"]
        case .vegetables: return ["Allium", "Leafy Greens", "Roots", "Squash", "Brassicas", "Mushrooms", "Stalks", "Fruit Vegetables"]
        case .fruits: return ["Citrus", "Stone Fruit", "Tropical", "Berries", "Pome Fruit", "Melons"]
        case .dairy: return ["Cheese", "Cultured", "Milk & Cream"]
        case .seasonings: return ["Herbs", "Spices", "Chilis"]
        case .pantry: return ["Oils & Fats", "Vinegars", "Stocks", "Sauces", "Sweeteners"]
        case .grains: return ["Rice", "Pasta", "Bread", "Ancient Grains"]
        case .alcohol: return ["Wine", "Spirits", "Liqueurs"]
        }
    }
}
```

**IngredientProfile.swift**
```swift
struct IngredientProfile: Codable, Identifiable {
    let id: String { name.lowercased() }
    let name: String
    let category: IngredientCategory
    let subcategory: String
    let flavorProfile: FlavorProfile
    let description: String
}
```

**DietaryRestriction.swift**
```swift
enum DietaryPreset: String, CaseIterable {
    case vegetarian
    case pescatarian
    case glutenFree = "gluten-free"
    case dairyFree = "dairy-free"
    case alcoholFree = "alcohol-free"
    case nutFree = "nut-free"

    var excludedCategories: [String] {
        // Returns ["Category:Subcategory"] keys to exclude
    }
}
```

### 1.2 Data Import

Convert TypeScript data files to JSON for iOS:
- `flavorPairings.ts` → `FlavorPairings.json` (array of "ingredient1,ingredient2" strings)
- `ingredientProfiles.ts` → `IngredientProfiles.json` (array of profile objects)
- Dietary ingredient lists → `DietaryIngredients.json`

### 1.3 Flavor Map Service

```swift
@Observable
class FlavorMapService {
    private var pairings: [String: Set<String>] = [:]

    init() {
        loadPairings()
    }

    func loadPairings() {
        // Load JSON, build bidirectional map
    }

    func getPairings(for ingredient: String) -> Set<String> {
        pairings[ingredient.lowercased()] ?? []
    }

    func arePaired(_ a: String, _ b: String) -> Bool {
        getPairings(for: a).contains(b.lowercased())
    }
}
```

---

## Phase 2: State Management (ViewModels)

### 2.1 Ingredient Selection ViewModel

```swift
@Observable
class IngredientSelectionVM {
    var selectedIngredients: [String] = []
    var lockedIndices: Set<Int> = []
    var targetCount: Int = 3

    // History for undo
    private var history: [(ingredients: [String], locked: Set<Int>, target: Int)] = []

    var lockedCount: Int { lockedIndices.count }
    var canDecrement: Bool { targetCount > max(1, lockedCount) }
    var canIncrement: Bool { targetCount < 5 }
    var canUndo: Bool { !history.isEmpty }

    func toggleLock(at index: Int) { ... }
    func remove(at index: Int) { ... }
    func addIngredient(_ name: String) { ... }
    func incrementTarget() { ... }
    func decrementTarget() { ... }
    func undo() { ... }
    func saveToHistory() { ... }
}
```

### 2.2 Filter ViewModel

```swift
@Observable
class FilterViewModel {
    var searchTerm: String = ""
    var activeCategory: IngredientCategory? = nil
    var selectedSubcategories: Set<String> = []
    var tasteValues: [String: Int] = [:]  // Only active sliders
    var dietaryRestrictions: [String: Bool] = [:]  // "Category:Subcategory" = false

    func setCategory(_ category: IngredientCategory?) { ... }
    func toggleSubcategory(_ sub: String) { ... }
    func setTasteFilter(_ taste: String, value: Int?) { ... }
    func toggleDietary(_ key: String) { ... }
    func clearAll() { ... }
}
```

### 2.3 Compatibility ViewModel

```swift
@Observable
class CompatibilityViewModel {
    enum Mode: String, CaseIterable {
        case perfect = "Perfect"
        case mixed = "Mixed"
        case random = "Random"
    }

    var mode: Mode = .perfect
    var showPartialMatches: Bool = false

    func setMode(_ newMode: Mode) {
        mode = newMode
        // Auto-enable partial matches for mixed/random
        if newMode != .perfect {
            showPartialMatches = true
        }
    }
}
```

### 2.4 Theme ViewModel

```swift
@Observable
class ThemeViewModel {
    var isDarkMode: Bool = false
    var isHighContrast: Bool = false

    init() {
        // Load from UserDefaults
        // Check system appearance
    }

    func tasteColor(for taste: String) -> Color {
        if isHighContrast {
            return isDarkMode ? .init(hex: "#e6e6e6") : .init(hex: "#1a1a1a")
        }
        return tasteColors[taste] ?? .gray
    }
}

let tasteColors: [String: Color] = [
    "sweet": Color(hex: "#F86A8A"),
    "salty": Color(hex: "#6AAFE8"),
    "sour": Color(hex: "#7CB342"),
    "umami": Color(hex: "#F57C00"),
    "fat": Color(hex: "#FFC233"),
    "spicy": Color(hex: "#F44336"),
    "aromatic": Color(hex: "#9B8AD6")
]
```

---

## Phase 3: Core Views

### 3.1 Main Content View

```swift
struct ContentView: View {
    @State private var isDrawerOpen = false
    @State private var isSidebarOpen = false
    @State private var focusedIngredientIndex: Int? = nil

    var body: some View {
        ZStack {
            // Main content
            VStack(spacing: 0) {
                HeaderView(onLogoTap: { isSidebarOpen.toggle() })

                IngredientDisplayView(
                    isCompact: isDrawerOpen,
                    focusedIndex: $focusedIngredientIndex
                )

                DietaryPillsView()

                BottomNavigationBar(
                    isDrawerOpen: $isDrawerOpen,
                    onGenerate: generateIngredients
                )
            }

            // Drawer overlay
            if isDrawerOpen {
                IngredientDrawer(isOpen: $isDrawerOpen)
            }

            // Sidebar overlay
            if isSidebarOpen {
                SidebarView(isOpen: $isSidebarOpen)
            }
        }
    }
}
```

### 3.2 Ingredient Display View

The hero view showing selected ingredients with:
- Large typography (scaled based on drawer state)
- Colored text based on dominant taste
- Lock icons for locked ingredients
- Animated underline for locked state
- Tap-to-focus with floating action buttons (mobile)
- Swipe-to-delete gesture
- Expandable ingredient info (for locked ingredients when drawer closed)
- Punctuation between ingredients (commas, ampersand)
- Empty slot placeholders

```swift
struct IngredientDisplayView: View {
    let isCompact: Bool
    @Binding var focusedIndex: Int?
    @Environment(IngredientSelectionVM.self) var selection
    @Environment(ThemeViewModel.self) var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: isCompact ? 4 : 8) {
                ForEach(Array(selection.selectedIngredients.enumerated()), id: \.offset) { index, ingredient in
                    IngredientRowView(
                        ingredient: ingredient,
                        index: index,
                        isLocked: selection.lockedIndices.contains(index),
                        isFocused: focusedIndex == index,
                        isCompact: isCompact
                    )
                    .onTapGesture { focusedIndex = index }
                }

                // Empty slots
                ForEach(selection.selectedIngredients.count..<selection.targetCount, id: \.self) { index in
                    EmptySlotView(index: index, isCompact: isCompact)
                }
            }
            .scaleEffect(isCompact ? 0.625 : 1.0, anchor: .topLeading)
            .animation(.easeInOut(duration: 0.15), value: isCompact)
        }
        .onTapGesture { focusedIndex = nil }  // Tap outside to unfocus
    }
}
```

### 3.3 Bottom Navigation Bar

5 equal-width buttons:
1. **Undo** (arrow.uturn.backward)
2. **Decrement** (minus)
3. **Generate** (sparkles) - center, emphasized
4. **Increment** (plus)
5. **Search/Drawer** (magnifyingglass)

```swift
struct BottomNavigationBar: View {
    @Binding var isDrawerOpen: Bool
    let onGenerate: () -> Void
    @Environment(IngredientSelectionVM.self) var selection

    var body: some View {
        HStack(spacing: 0) {
            BottomButton(icon: "arrow.uturn.backward", action: selection.undo)
                .disabled(!selection.canUndo)

            BottomButton(icon: "minus", action: selection.decrementTarget)
                .disabled(!selection.canDecrement)

            BottomButton(icon: "sparkles", action: onGenerate)
                .fontWeight(.bold)

            BottomButton(icon: "plus", action: selection.incrementTarget)
                .disabled(!selection.canIncrement)

            BottomButton(
                icon: "magnifyingglass",
                isActive: isDrawerOpen,
                action: { isDrawerOpen.toggle() }
            )
        }
        .frame(height: 60)
        .background(.ultraThinMaterial)
    }
}
```

### 3.4 Ingredient Drawer

Bottom sheet with:
- Drag-to-dismiss gesture
- Search bar
- Filter toggle button
- Collapsible filter panel (Category/Taste tabs)
- Sort mode tabs
- Scrollable ingredient grid

```swift
struct IngredientDrawer: View {
    @Binding var isOpen: Bool
    @State private var showFilters = false
    @State private var filterTab: FilterTab = .category
    @State private var sortMode: SortMode = .alphabetical
    @GestureState private var dragOffset: CGFloat = 0

    var body: some View {
        VStack(spacing: 0) {
            // Drag handle
            Capsule()
                .fill(Color.gray.opacity(0.4))
                .frame(width: 40, height: 5)
                .padding(.top, 8)

            // Search bar row
            HStack {
                SearchBarView()
                FilterToggleButton(isActive: showFilters) {
                    withAnimation { showFilters.toggle() }
                }
            }
            .padding(.horizontal)

            // Collapsible filters
            if showFilters {
                FilterPanelView(activeTab: $filterTab)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }

            // Sort tabs
            SortTabsView(activeMode: $sortMode)

            // Ingredient grid
            IngredientGridView(sortMode: sortMode)
        }
        .background(.ultraThickMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .offset(y: dragOffset)
        .gesture(dragGesture)
    }
}
```

### 3.5 Ingredient Grid

```swift
struct IngredientGridView: View {
    let sortMode: SortMode
    @Environment(FilterViewModel.self) var filters
    @Environment(IngredientSelectionVM.self) var selection
    @Environment(CompatibilityViewModel.self) var compatibility

    var filteredIngredients: [IngredientProfile] { ... }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 8) {
                // Group by dividers based on sort mode
                ForEach(groupedIngredients) { group in
                    if sortMode != .alphabetical {
                        DividerView(label: group.label, color: group.color)
                    }

                    FlowLayout {
                        ForEach(group.ingredients) { ingredient in
                            IngredientButtonView(ingredient: ingredient)
                        }
                    }
                }
            }
            .padding()
        }
    }
}
```

### 3.6 Ingredient Button

```swift
struct IngredientButtonView: View {
    let ingredient: IngredientProfile
    @Environment(IngredientSelectionVM.self) var selection
    @Environment(ThemeViewModel.self) var theme

    var isSelected: Bool { selection.selectedIngredients.contains(ingredient.name) }
    var matchType: MatchType { ... }  // .perfect, .partial, .none

    var body: some View {
        Button(action: addIngredient) {
            Text(ingredient.name)
                .font(.system(size: 14, weight: .medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(backgroundColor)
                .foregroundColor(textColor)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(borderColor, style: borderStyle)
                )
        }
        .disabled(isSelected)
    }

    var borderStyle: StrokeStyle {
        matchType == .partial
            ? StrokeStyle(lineWidth: 1, dash: [4, 4])
            : StrokeStyle(lineWidth: 1)
    }
}
```

---

## Phase 4: Filtering & Search

### 4.1 Filter Panel

Collapsible panel with two tabs:
- **Category**: Category pills + subcategory checkboxes
- **Taste**: 7 taste sliders (toggleable)

```swift
struct FilterPanelView: View {
    @Binding var activeTab: FilterTab
    @Environment(FilterViewModel.self) var filters

    var body: some View {
        VStack(spacing: 12) {
            // Tab selector
            Picker("Filter Type", selection: $activeTab) {
                Text("Category").tag(FilterTab.category)
                Text("Taste").tag(FilterTab.taste)
            }
            .pickerStyle(.segmented)

            // Tab content
            switch activeTab {
            case .category:
                CategoryFilterView()
            case .taste:
                TasteFilterView()
            }
        }
        .padding()
    }
}
```

### 4.2 Category Filter

```swift
struct CategoryFilterView: View {
    @Environment(FilterViewModel.self) var filters

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Category pills (horizontal scroll)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(IngredientCategory.allCases, id: \.self) { category in
                        CategoryPill(
                            category: category,
                            isSelected: filters.activeCategory == category
                        )
                    }
                }
            }

            // Subcategory checkboxes (if category selected)
            if let category = filters.activeCategory {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(category.subcategories, id: \.self) { sub in
                        SubcategoryRow(
                            name: sub,
                            isSelected: filters.selectedSubcategories.contains(sub)
                        )
                    }
                }
            }
        }
    }
}
```

### 4.3 Taste Filter

```swift
struct TasteFilterView: View {
    @Environment(FilterViewModel.self) var filters
    @Environment(ThemeViewModel.self) var theme

    var body: some View {
        VStack(spacing: 16) {
            ForEach(FlavorProfile.tasteDimensions, id: \.self) { taste in
                TasteSliderRow(
                    taste: taste,
                    isActive: filters.tasteValues[taste] != nil,
                    value: filters.tasteValues[taste] ?? 3,
                    color: theme.tasteColor(for: taste)
                )
            }
        }
    }
}

struct TasteSliderRow: View {
    let taste: String
    let isActive: Bool
    let value: Int
    let color: Color
    @Environment(FilterViewModel.self) var filters

    var body: some View {
        HStack {
            Toggle(isOn: Binding(
                get: { isActive },
                set: { filters.setTasteFilter(taste, value: $0 ? 3 : nil) }
            )) {
                Text(taste.capitalized)
                    .foregroundColor(isActive ? color : .secondary)
            }

            if isActive {
                Slider(value: Binding(
                    get: { Double(value) },
                    set: { filters.setTasteFilter(taste, value: Int($0)) }
                ), in: 0...10, step: 1)
                .tint(color)

                Text("\(value)")
                    .monospacedDigit()
            }
        }
    }
}
```

### 4.4 Dietary Restrictions

In Sidebar settings panel:

```swift
struct DietaryFilterView: View {
    @Environment(FilterViewModel.self) var filters

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Dietary Restrictions")
                .font(.headline)

            ForEach(DietaryPreset.allCases, id: \.self) { preset in
                Toggle(preset.rawValue.capitalized, isOn: Binding(
                    get: { isDietaryActive(preset) },
                    set: { toggleDietary(preset, isOn: $0) }
                ))
            }
        }
    }
}
```

### 4.5 Active Dietary Pills

```swift
struct DietaryPillsView: View {
    @Environment(FilterViewModel.self) var filters

    var activeDietaryFilters: [String] { ... }

    var body: some View {
        if !activeDietaryFilters.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(activeDietaryFilters, id: \.self) { filter in
                        DietaryPill(name: filter) {
                            filters.removeDietary(filter)
                        }
                    }
                }
                .padding(.horizontal)
            }
            .frame(height: 40)
        }
    }
}

struct DietaryPill: View {
    let name: String
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Text(name)
                .font(.system(size: 14))
            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.secondary.opacity(0.1))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Color.secondary.opacity(0.3)))
    }
}
```

---

## Phase 5: Generation Algorithm

### 5.1 Generation Service

```swift
class GenerationService {
    let flavorMap: FlavorMapService
    let profiles: [IngredientProfile]

    func generate(
        targetCount: Int,
        lockedIngredients: [String],
        mode: CompatibilityViewModel.Mode,
        dietaryRestrictions: [String: Bool]
    ) -> [String] {
        let candidates = getValidCandidates(dietaryRestrictions: dietaryRestrictions)

        switch mode {
        case .perfect:
            return generatePerfect(
                targetCount: targetCount,
                locked: lockedIngredients,
                candidates: candidates
            )
        case .mixed:
            return generateMixed(
                targetCount: targetCount,
                locked: lockedIngredients,
                candidates: candidates
            )
        case .random:
            return generateRandom(
                targetCount: targetCount,
                locked: lockedIngredients,
                candidates: candidates
            )
        }
    }

    private func generatePerfect(
        targetCount: Int,
        locked: [String],
        candidates: [String]
    ) -> [String] {
        // Backtracking algorithm
        // All ingredients must pair with all others
        // Max 200 attempts
        ...
    }

    private func generateMixed(
        targetCount: Int,
        locked: [String],
        candidates: [String]
    ) -> [String] {
        // Each ingredient pairs with at least one other
        ...
    }

    private func generateRandom(
        targetCount: Int,
        locked: [String],
        candidates: [String]
    ) -> [String] {
        // No pairing requirements
        var result = locked
        var shuffled = candidates.filter { !locked.contains($0) }.shuffled()
        while result.count < targetCount, let next = shuffled.popLast() {
            result.append(next)
        }
        return result
    }
}
```

---

## Phase 6: Additional Features

### 6.1 Sidebar Settings

```swift
struct SidebarView: View {
    @Binding var isOpen: Bool
    @Environment(ThemeViewModel.self) var theme
    @Environment(CompatibilityViewModel.self) var compatibility
    @Environment(FilterViewModel.self) var filters

    var body: some View {
        ZStack(alignment: .leading) {
            // Dimmed background
            Color.black.opacity(0.3)
                .ignoresSafeArea()
                .onTapGesture { isOpen = false }

            // Sidebar content
            VStack(alignment: .leading, spacing: 24) {
                // Logo
                Text("FF")
                    .font(.system(size: 32, weight: .bold))

                Divider()

                // Generation Options
                VStack(alignment: .leading, spacing: 16) {
                    Text("Generation")
                        .font(.headline)

                    // Compatibility mode
                    Picker("Mode", selection: $compatibility.mode) {
                        ForEach(CompatibilityViewModel.Mode.allCases, id: \.self) { mode in
                            Text(mode.rawValue).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)

                    // Dietary restrictions
                    DietaryFilterView()
                }

                Divider()

                // Settings
                VStack(alignment: .leading, spacing: 12) {
                    Text("Settings")
                        .font(.headline)

                    Toggle("Dark Mode", isOn: $theme.isDarkMode)
                    Toggle("High Contrast", isOn: $theme.isHighContrast)
                }

                Spacer()
            }
            .padding(24)
            .frame(width: 300)
            .background(.regularMaterial)
        }
        .transition(.move(edge: .leading))
    }
}
```

### 6.2 Recipe Search

```swift
func openRecipeSearch() {
    let ingredients = selection.selectedIngredients.joined(separator: " ")
    let query = "\(ingredients) recipe".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
    if let url = URL(string: "https://www.google.com/search?q=\(query)") {
        UIApplication.shared.open(url)
    }
}
```

### 6.3 Swipe-to-Delete Gesture

```swift
struct SwipeToDeleteModifier: ViewModifier {
    let onDelete: () -> Void
    @State private var offset: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .offset(x: offset)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        if value.translation.width < 0 {
                            offset = value.translation.width
                        }
                    }
                    .onEnded { value in
                        if value.translation.width < -100 {
                            onDelete()
                        }
                        withAnimation { offset = 0 }
                    }
            )
    }
}
```

### 6.4 Expandable Ingredient Info

```swift
struct IngredientInfoView: View {
    let ingredient: IngredientProfile
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Taste tags (always visible for locked ingredients)
            HStack(spacing: 6) {
                ForEach(prominentTastes, id: \.0) { taste, value in
                    TasteTagView(taste: taste, value: value)
                }
            }

            // Expandable description
            if isExpanded {
                Text(ingredient.description)
                    .font(.caption)
                    .foregroundColor(.secondary)

                // Non-pairing warnings
                if !nonPairingIngredients.isEmpty {
                    HStack {
                        Image(systemName: "exclamationmark.triangle")
                        Text("Doesn't pair with: \(nonPairingIngredients.joined(separator: ", "))")
                    }
                    .font(.caption)
                    .foregroundColor(.orange)
                }
            }
        }
    }

    var prominentTastes: [(String, Int)] {
        // Return tastes with values >= 5
    }
}
```

---

## Phase 7: Sorting

### 7.1 Sort Modes

```swift
enum SortMode: String, CaseIterable {
    case alphabetical = "A-Z"
    case category = "Category"
    case taste = "Taste"
    case popularity = "Popular"
}

func sortIngredients(_ ingredients: [IngredientProfile], by mode: SortMode) -> [SortGroup] {
    switch mode {
    case .alphabetical:
        return [SortGroup(label: nil, color: nil, ingredients: ingredients.sorted { $0.name < $1.name })]

    case .category:
        // Group by category, sort groups and items within

    case .taste:
        // Group by dominant taste, colored dividers

    case .popularity:
        // Sort by pairing count (descending)
    }
}
```

---

## Phase 8: Polish & Animations

### 8.1 Key Animations

1. **Drawer open/close**: Spring animation with 0.3s duration
2. **Ingredient display scale**: Smooth 150ms transition between hero/compact
3. **Lock underline**: Animated width expansion (like web `underlineIn`)
4. **Generate button pulse**: Subtle scale animation on first load
5. **Ingredient focus**: Fade-in floating action buttons
6. **Filter panel expand/collapse**: Opacity + vertical move

### 8.2 Haptic Feedback

```swift
let impactLight = UIImpactFeedbackGenerator(style: .light)
let impactMedium = UIImpactFeedbackGenerator(style: .medium)
let selectionFeedback = UISelectionFeedbackGenerator()

// Use on:
// - Ingredient tap (selection feedback)
// - Lock toggle (light impact)
// - Generate (medium impact)
// - Drawer open/close (light impact)
```

---

## Implementation Order

1. **Phase 1** (Foundation): Models, data import, FlavorMapService
2. **Phase 2** (State): ViewModels for selection, filters, compatibility, theme
3. **Phase 3** (Core Views): ContentView, IngredientDisplay, BottomBar, Drawer skeleton
4. **Phase 4** (Filtering): Filter panel, category/taste/dietary filters, search
5. **Phase 5** (Generation): Generation algorithm with all three modes
6. **Phase 6** (Features): Sidebar, recipe search, swipe-to-delete, ingredient info
7. **Phase 7** (Sorting): All four sort modes with dividers
8. **Phase 8** (Polish): Animations, haptics, edge cases, testing

---

## Data Migration Checklist

- [ ] Convert `flavorPairings.ts` to JSON
- [ ] Convert `ingredientProfiles.ts` to JSON
- [ ] Convert dietary ingredient lists to JSON
- [ ] Verify all 8 categories and subcategories match
- [ ] Verify all 7 taste dimensions
- [ ] Test pairing lookup performance

---

## Testing Checklist

- [ ] Generate in all three modes (perfect/mixed/random)
- [ ] Lock/unlock ingredients
- [ ] Undo history
- [ ] All dietary restrictions
- [ ] Category + subcategory filtering
- [ ] Taste threshold filtering
- [ ] Search text matching
- [ ] All four sort modes
- [ ] Dark mode + high contrast
- [ ] Swipe-to-delete gesture
- [ ] Drawer drag-to-dismiss
- [ ] Empty state handling
- [ ] Edge cases (0-5 ingredients)
- [ ] Recipe search opens correctly

---

## Out of Scope (V2 Feature Parity Only)

The following are explicitly NOT included per requirements:
- Experimental pairings
- Menu planner / meal planning
- Saved combinations
- Favorites
- URL state encoding/decoding
- Desktop-specific features (keyboard shortcuts, hover effects)
- V1 compatibility
