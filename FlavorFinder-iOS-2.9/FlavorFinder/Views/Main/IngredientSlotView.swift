import SwiftUI

struct IngredientSlotView: View {
    let index: Int
    let ingredient: Ingredient?
    let isFocused: Bool
    let onTap: () -> Void
    let onRemove: () -> Void
    let onToggleLock: () -> Void

    @EnvironmentObject var appState: AppState

    private var profile: IngredientProfile? {
        guard let name = ingredient?.name else { return nil }
        return appState.ingredientService.getProfile(name)
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // Slot Number
                ZStack {
                    Circle()
                        .fill(ingredient != nil ? categoryColor.opacity(0.2) : Color.secondary.opacity(0.1))
                        .frame(width: 44, height: 44)

                    if let ingredient = ingredient {
                        if ingredient.isLocked {
                            Image(systemName: "lock.fill")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(categoryColor)
                        } else {
                            Text("\(index + 1)")
                                .font(.headline)
                                .foregroundStyle(categoryColor)
                        }
                    } else {
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }

                // Content
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

                Spacer()

                // Action buttons (when focused)
                if isFocused, let ingredient = ingredient {
                    HStack(spacing: 12) {
                        Button {
                            onToggleLock()
                        } label: {
                            Image(systemName: ingredient.isLocked ? "lock.fill" : "lock.open")
                                .font(.system(size: 18))
                                .foregroundStyle(ingredient.isLocked ? AppColors.accent : .secondary)
                                .frame(width: 44, height: 44)
                                .background(Color.secondary.opacity(0.1))
                                .clipShape(Circle())
                        }
                        .buttonStyle(.plain)

                        if !ingredient.isLocked {
                            Button {
                                onRemove()
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.system(size: 18, weight: .medium))
                                    .foregroundStyle(.red)
                                    .frame(width: 44, height: 44)
                                    .background(Color.red.opacity(0.1))
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                } else if let ingredient = ingredient, ingredient.isLocked {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(AppColors.accent)
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(ingredient != nil ? categoryColor.opacity(0.08) : Color.secondary.opacity(0.05))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(
                        isFocused ? categoryColor : Color.clear,
                        lineWidth: 2
                    )
            )
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }

    private var categoryColor: Color {
        guard let profile = profile,
              let category = Category(rawValue: profile.category) else {
            return AppColors.accent
        }
        return category.color
    }
}

#Preview {
    VStack(spacing: 12) {
        IngredientSlotView(
            index: 0,
            ingredient: Ingredient(name: "chicken", isLocked: true),
            isFocused: false,
            onTap: {},
            onRemove: {},
            onToggleLock: {}
        )

        IngredientSlotView(
            index: 1,
            ingredient: Ingredient(name: "lemon"),
            isFocused: true,
            onTap: {},
            onRemove: {},
            onToggleLock: {}
        )

        IngredientSlotView(
            index: 2,
            ingredient: nil,
            isFocused: false,
            onTap: {},
            onRemove: {},
            onToggleLock: {}
        )
    }
    .padding()
    .environmentObject(AppState())
}
