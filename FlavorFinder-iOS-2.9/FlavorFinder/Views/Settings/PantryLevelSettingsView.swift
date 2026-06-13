import SwiftUI

/// Settings view for configuring pantry level filtering
struct PantryLevelSettingsView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var selectedMode: PantryFilterMode

    init() {
        _selectedMode = State(initialValue: .all)
    }

    var body: some View {
        NavigationStack {
            List {
                // Instructions
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Filter by pantry level")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        Text("Only show ingredients you're likely to have on hand based on your pantry stocking level.")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.vertical, 4)
                }

                // Pantry Level Options
                Section {
                    ForEach(PantryFilterMode.allCases, id: \.rawValue) { mode in
                        PantryLevelRow(
                            mode: mode,
                            isSelected: selectedMode == mode,
                            ingredientCount: countIngredients(for: mode),
                            onSelect: {
                                selectedMode = mode
                            }
                        )
                    }
                } footer: {
                    Text("Ingredients without a defined pantry level are always shown.")
                        .font(.caption)
                }

                // Preview Section
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "info.circle.fill")
                                .foregroundStyle(.blue)
                            Text("What's in each level?")
                                .font(.subheadline.weight(.medium))
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            PantryLevelPreview(
                                level: .essential,
                                examples: ["Olive oil", "Garlic", "Butter", "Honey", "Black pepper"]
                            )

                            PantryLevelPreview(
                                level: .expanded,
                                examples: ["Tahini", "Coconut milk", "Fish sauce", "Smoked paprika"]
                            )

                            PantryLevelPreview(
                                level: .expert,
                                examples: ["Miso", "Sumac", "Mirin", "Preserved lemon"]
                            )
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Pantry Level")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        appState.pantryFilter = selectedMode
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .onAppear {
                selectedMode = appState.pantryFilter
            }
        }
    }

    private func countIngredients(for mode: PantryFilterMode) -> Int {
        appState.ingredientService.profiles.filter { mode.includes($0.pantryLevel) }.count
    }
}

// MARK: - Pantry Level Row

struct PantryLevelRow: View {
    let mode: PantryFilterMode
    let isSelected: Bool
    let ingredientCount: Int
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 12) {
                // Radio button
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(isSelected ? AppColors.accent : Color(.tertiaryLabel))

                // Icon and text
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Image(systemName: iconName(for: mode))
                            .font(.system(size: 14))
                            .foregroundStyle(iconColor(for: mode))

                        Text(mode.displayName)
                            .font(.body)
                            .foregroundStyle(.primary)
                    }

                    Text(mode.description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Ingredient count
                Text("\(ingredientCount)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(.tertiarySystemFill))
                    .clipShape(Capsule())
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func iconName(for mode: PantryFilterMode) -> String {
        switch mode {
        case .all: return "square.grid.2x2.fill"
        case .essential: return "house.fill"
        case .expanded: return "basket.fill"
        case .expert: return "star.fill"
        }
    }

    private func iconColor(for mode: PantryFilterMode) -> Color {
        switch mode {
        case .all: return .gray
        case .essential: return .green
        case .expanded: return .blue
        case .expert: return .orange
        }
    }
}

// MARK: - Pantry Level Preview

struct PantryLevelPreview: View {
    let level: PantryLevel
    let examples: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: level.iconName)
                    .font(.system(size: 11))
                    .foregroundStyle(iconColor)

                Text(level.displayName)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.primary)
            }

            Text(examples.joined(separator: ", "))
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var iconColor: Color {
        switch level {
        case .essential: return .green
        case .expanded: return .blue
        case .expert: return .orange
        }
    }
}

#Preview {
    PantryLevelSettingsView()
        .environmentObject(AppState())
}
