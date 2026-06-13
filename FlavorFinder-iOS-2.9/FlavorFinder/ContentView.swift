import SwiftUI
import SwiftData

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        Group {
            if appState.isInitialized {
                MainTabView()
                    .onAppear {
                        appState.savedCombinationsVM.setModelContext(modelContext)
                        appState.savedMenusVM.setModelContext(modelContext)
                    }
            } else if let error = appState.initializationError {
                ErrorView(message: error)
            } else {
                LoadingView()
            }
        }
    }
}

struct LoadingView: View {
    var body: some View {
        ZStack {
            Color(red: 0.11, green: 0.11, blue: 0.12) // Dark grey matching app theme
                .ignoresSafeArea()

            Image("LaunchIcon")
                .resizable()
                .scaledToFit()
                .frame(width: 80, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: 18))
        }
    }
}

struct ErrorView: View {
    let message: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 50))
                .foregroundStyle(.red)

            Text("Failed to Load")
                .font(.title)
                .fontWeight(.bold)

            Text(message)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Try Again") {
                // Restart app logic
            }
            .buttonStyle(.borderedProminent)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
