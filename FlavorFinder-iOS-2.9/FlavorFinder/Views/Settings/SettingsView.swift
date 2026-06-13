import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @State private var showingClearConfirmation = false
    @State private var showingAbout = false
    @State private var showingRecipeSitePreferences = false
    @State private var showingPantryLevelSettings = false

    var body: some View {
        NavigationStack {
            List {
                // App Info Section
                Section {
                    HStack(spacing: 16) {
                        Image(systemName: "fork.knife")
                            .font(.system(size: 40))
                            .foregroundStyle(AppColors.accent)
                            .frame(width: 60, height: 60)
                            .background(AppColors.accent.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 12))

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Flavor Finder")
                                .font(.headline)

                            Text("Discover perfect pairings")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }

                // Pantry Level Section
                Section("Ingredient Filtering") {
                    Button {
                        showingPantryLevelSettings = true
                    } label: {
                        HStack {
                            Label("Pantry Level", systemImage: "cabinet.fill")
                            Spacer()
                            Text(appState.pantryFilter.displayName)
                                .foregroundStyle(.secondary)
                                .font(.subheadline)
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.tertiary)
                                .font(.caption)
                        }
                    }
                    .foregroundStyle(.primary)
                }

                // Recipe Preferences Section
                Section("Recipe Search") {
                    Button {
                        showingRecipeSitePreferences = true
                    } label: {
                        HStack {
                            Label("Preferred Recipe Sites", systemImage: "globe")
                            Spacer()
                            Text("\(appState.enabledRecipeSites.count) sites")
                                .foregroundStyle(.secondary)
                                .font(.subheadline)
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.tertiary)
                                .font(.caption)
                        }
                    }
                    .foregroundStyle(.primary)
                }

                // Drink Pairings Section
                Section("Drink Pairings") {
                    Toggle("Show Non-Alcoholic Pairings", isOn: $appState.showNonAlcoholicPairings)
                }

                // Haptics Section
                Section("Feedback") {
                    Toggle("Haptic Feedback", isOn: $appState.hapticFeedback)
                }

                // Data Section
                Section("Data") {
                    LabeledContent("Ingredients", value: "\(appState.ingredientService.count)")
                    LabeledContent("Flavor Pairings", value: "\(appState.flavorService.pairingCount)")

                    Button(role: .destructive) {
                        showingClearConfirmation = true
                    } label: {
                        HStack {
                            Image(systemName: "trash")
                            Text("Clear All Saved Combinations")
                        }
                    }
                }

                // About Section
                Section("About") {
                    Button {
                        showingAbout = true
                    } label: {
                        HStack {
                            Text("About Flavor Finder")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .foregroundStyle(.primary)

                    Link(destination: URL(string: "https://github.com")!) {
                        HStack {
                            Text("Source Code")
                            Spacer()
                            Image(systemName: "arrow.up.right.square")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .foregroundStyle(.primary)

                    Link(destination: URL(string: "mailto:support@example.com")!) {
                        HStack {
                            Text("Send Feedback")
                            Spacer()
                            Image(systemName: "envelope")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .foregroundStyle(.primary)
                }

                // Version
                Section {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .confirmationDialog(
                "Clear All Saved?",
                isPresented: $showingClearConfirmation,
                titleVisibility: .visible
            ) {
                Button("Clear All", role: .destructive) {
                    // Clear saved combinations
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will permanently delete all saved combinations. This action cannot be undone.")
            }
            .sheet(isPresented: $showingAbout) {
                AboutView()
            }
            .sheet(isPresented: $showingRecipeSitePreferences) {
                RecipeSitePreferencesView()
                    .environmentObject(appState)
            }
            .sheet(isPresented: $showingPantryLevelSettings) {
                PantryLevelSettingsView()
                    .environmentObject(appState)
            }
        }
    }
}

struct AboutView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Logo
                    Image(systemName: "fork.knife")
                        .font(.system(size: 60))
                        .foregroundStyle(AppColors.accent)
                        .padding()
                        .background(AppColors.accent.opacity(0.1))
                        .clipShape(Circle())

                    // Title
                    VStack(spacing: 4) {
                        Text("Flavor Finder")
                            .font(.largeTitle)
                            .fontWeight(.bold)

                        Text("Version 1.0.0")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    // Description
                    Text("Discover perfect ingredient pairings with Flavor Finder. Whether you're a professional chef or home cook, explore thousands of flavor combinations based on culinary science and tradition.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal)

                    Divider()
                        .padding(.horizontal, 40)

                    // Features
                    VStack(alignment: .leading, spacing: 16) {
                        FeatureRow(
                            icon: "sparkles",
                            title: "Smart Generation",
                            description: "Generate compatible ingredient combinations with our backtracking algorithm"
                        )

                        FeatureRow(
                            icon: "chart.bar.fill",
                            title: "Taste Analysis",
                            description: "Visualize and balance your flavor profiles"
                        )

                        FeatureRow(
                            icon: "menucard.fill",
                            title: "Menu Planner",
                            description: "Create balanced menus with AI-powered suggestions"
                        )

                        FeatureRow(
                            icon: "leaf.fill",
                            title: "Dietary Filters",
                            description: "Filter ingredients by dietary restrictions"
                        )
                    }
                    .padding()

                    Spacer()
                }
                .padding()
            }
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

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(AppColors.accent)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AppState())
}
