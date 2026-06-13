import SwiftUI

/// Settings view for selecting preferred recipe sites
struct RecipeSitePreferencesView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var enabledSites: Set<String>
    @State private var hasChanges = false

    init() {
        // Initialize state from AppState (will be updated in onAppear)
        _enabledSites = State(initialValue: RecipeSite.defaultEnabledSiteIds)
    }

    var body: some View {
        NavigationStack {
            List {
                // Instructions
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Choose your preferred recipe sources")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        Text("Recipe searches will be filtered to only show results from selected sites.")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.vertical, 4)
                }

                // Quick Actions
                Section {
                    Button {
                        enabledSites = Set(RecipeSite.allSites.map(\.id))
                        hasChanges = true
                    } label: {
                        Label("Select All", systemImage: "checkmark.circle.fill")
                    }

                    Button {
                        enabledSites = Set(RecipeSite.freeSites.map(\.id))
                        hasChanges = true
                    } label: {
                        Label("Free Sites Only", systemImage: "gift.fill")
                    }

                    Button {
                        enabledSites = []
                        hasChanges = true
                    } label: {
                        Label("Deselect All", systemImage: "circle")
                    }
                }

                // Free Sites
                Section {
                    ForEach(RecipeSite.freeSites) { site in
                        RecipeSiteRow(
                            site: site,
                            isEnabled: enabledSites.contains(site.id),
                            onToggle: { isEnabled in
                                if isEnabled {
                                    enabledSites.insert(site.id)
                                } else {
                                    enabledSites.remove(site.id)
                                }
                                hasChanges = true
                            }
                        )
                    }
                } header: {
                    Text("Free Sites")
                } footer: {
                    Text("These sites are free to access and don't require a subscription.")
                        .font(.caption)
                }

                // Paid Sites
                Section {
                    ForEach(RecipeSite.paidSites) { site in
                        RecipeSiteRow(
                            site: site,
                            isEnabled: enabledSites.contains(site.id),
                            onToggle: { isEnabled in
                                if isEnabled {
                                    enabledSites.insert(site.id)
                                } else {
                                    enabledSites.remove(site.id)
                                }
                                hasChanges = true
                            }
                        )
                    }
                } header: {
                    Text("Subscription Sites")
                } footer: {
                    Text("These sites require a paid subscription to access recipes.")
                        .font(.caption)
                }
            }
            .navigationTitle("Recipe Sources")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveChanges()
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(!hasChanges)
                }
            }
            .onAppear {
                // Load current settings from AppState
                enabledSites = appState.enabledRecipeSites
            }
        }
    }

    private func saveChanges() {
        appState.setEnabledRecipeSites(enabledSites)
    }
}

// MARK: - Recipe Site Row

struct RecipeSiteRow: View {
    let site: RecipeSite
    let isEnabled: Bool
    let onToggle: (Bool) -> Void

    var body: some View {
        Button {
            onToggle(!isEnabled)
        } label: {
            HStack(spacing: 12) {
                // Checkbox
                Image(systemName: isEnabled ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(isEnabled ? AppColors.accent : Color(.tertiaryLabel))

                // Site name
                Text(site.name)
                    .foregroundStyle(.primary)

                Spacer()

                // Paid indicator
                if site.isPaid {
                    Image(systemName: "creditcard.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(.orange)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    RecipeSitePreferencesView()
        .environmentObject(AppState())
}
