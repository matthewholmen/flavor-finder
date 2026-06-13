import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedTab: Tab = .menuPlanner

    enum Tab: String, CaseIterable {
        case discover = "Discover"
        case saved = "Saved"
        case menuPlanner = "Menu"
        case settings = "Settings"

        var icon: String {
            switch self {
            case .discover: return "sparkles"
            case .saved: return "bookmark.fill"
            case .menuPlanner: return "menucard.fill"
            case .settings: return "gearshape.fill"
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            MenuPlannerView()
                .environmentObject(appState.menuPlannerVM)
                .environmentObject(appState.savedMenusVM)
                .tabItem {
                    Label(Tab.menuPlanner.rawValue, systemImage: Tab.menuPlanner.icon)
                }
                .tag(Tab.menuPlanner)

            SavedListView(selectedTab: $selectedTab)
                .environmentObject(appState.savedMenusVM)
                .environmentObject(appState.menuPlannerVM)
                .tabItem {
                    Label(Tab.saved.rawValue, systemImage: Tab.saved.icon)
                }
                .tag(Tab.saved)

            DiscoverView()
                .environmentObject(appState.selectionVM)
                .environmentObject(appState.searchVM)
                .environmentObject(appState.filterVM)
                .environmentObject(appState.tasteAnalysisVM)
                .environmentObject(appState.savedCombinationsVM)
                .tabItem {
                    Label(Tab.discover.rawValue, systemImage: Tab.discover.icon)
                }
                .tag(Tab.discover)

            SettingsView()
                .environmentObject(appState)
                .tabItem {
                    Label(Tab.settings.rawValue, systemImage: Tab.settings.icon)
                }
                .tag(Tab.settings)
        }
        .tint(AppColors.accent)
    }
}

#Preview {
    MainTabView()
        .environmentObject(AppState())
}
