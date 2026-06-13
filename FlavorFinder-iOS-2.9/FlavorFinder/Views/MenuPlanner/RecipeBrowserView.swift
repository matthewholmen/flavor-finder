import SwiftUI
import WebKit

/// In-app browser for searching and saving recipes
struct RecipeBrowserView: View {
    let dish: Dish
    let initialSearchQuery: String
    let onSaveRecipe: (URL, String?, URL?) -> Void
    let onDismiss: () -> Void

    @EnvironmentObject var appState: AppState

    @State private var webView: WKWebView?
    @State private var currentURL: URL?
    @State private var currentTitle: String = "Recipes"
    @State private var canGoBack: Bool = false
    @State private var canGoForward: Bool = false
    @State private var isLoading: Bool = true
    @State private var isSaving: Bool = false
    @State private var externalLinkToSave: URL? = nil
    @StateObject private var linkPreviewService = LinkPreviewService()

    private var initialURL: URL {
        buildSearchURL(for: initialSearchQuery)
    }

    /// Builds a Google search URL with site filters based on user preferences
    private func buildSearchURL(for query: String) -> URL {
        var searchQuery = "\(query) recipe"

        // Get enabled recipe sites from app settings
        let enabledSites = appState.enabledRecipeSites

        // If sites are selected, add site filter to search query
        if !enabledSites.isEmpty {
            let sites = RecipeSite.allSites.filter { enabledSites.contains($0.id) }
            let siteFilters = sites.map { "site:\($0.domain)" }.joined(separator: " OR ")

            // Wrap OR statement in parentheses as best practice
            searchQuery += " (\(siteFilters))"
        }

        let encoded = searchQuery.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? searchQuery
        return URL(string: "https://www.google.com/search?q=\(encoded)")!
    }

    private var isGoogleSearchPage: Bool {
        guard let url = currentURL else { return true }
        return url.host?.contains("google.com") == true && url.path.contains("/search")
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Browser navigation toolbar
                BrowserToolbar(
                    canGoBack: canGoBack,
                    canGoForward: canGoForward,
                    isLoading: isLoading,
                    onBack: { webView?.goBack() },
                    onForward: { webView?.goForward() },
                    onRefresh: { webView?.reload() }
                )

                // WebView
                WebViewContainer(
                    url: initialURL,
                    webView: $webView,
                    currentURL: $currentURL,
                    currentTitle: $currentTitle,
                    canGoBack: $canGoBack,
                    canGoForward: $canGoForward,
                    isLoading: $isLoading,
                    onExternalLink: { url in
                        externalLinkToSave = url
                    }
                )

                // Loading progress bar
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.linear)
                        .tint(AppColors.accent)
                }
            }
            .navigationTitle(currentTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        onDismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        saveCurrentRecipe()
                    } label: {
                        HStack(spacing: 4) {
                            if isSaving {
                                ProgressView()
                                    .progressViewStyle(.circular)
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "bookmark.fill")
                            }
                            Text("Save")
                        }
                        .fontWeight(.semibold)
                    }
                    .disabled(isGoogleSearchPage || isSaving)
                }
            }
            .onDisappear {
                // Clean up WebView when view disappears
                cleanupWebView()
            }
            .alert("Save External Link?", isPresented: Binding(
                get: { externalLinkToSave != nil },
                set: { if !$0 { externalLinkToSave = nil } }
            )) {
                Button("Save as Recipe") {
                    if let url = externalLinkToSave {
                        saveExternalLink(url)
                    }
                }
                Button("Cancel", role: .cancel) {
                    externalLinkToSave = nil
                }
            } message: {
                if let url = externalLinkToSave {
                    Text("This link opens an external app. Would you like to save it as the recipe link instead?\n\n\(url.absoluteString)")
                }
            }
        }
    }

    private func cleanupWebView() {
        webView?.stopLoading()
        webView?.navigationDelegate = nil
        webView = nil
    }

    private func saveCurrentRecipe() {
        guard let url = currentURL else { return }
        isSaving = true

        Task {
            // Fetch metadata for preview image
            let metadata = await linkPreviewService.fetchMetadata(for: url)
            let title = metadata?.title ?? currentTitle

            await MainActor.run {
                isSaving = false
                onSaveRecipe(url, title, metadata?.imageURL)
            }
        }
    }

    private func saveExternalLink(_ url: URL) {
        isSaving = true

        Task {
            // Fetch metadata for preview image
            let metadata = await linkPreviewService.fetchMetadata(for: url)
            let title = metadata?.title ?? url.host ?? "Recipe"

            await MainActor.run {
                isSaving = false
                externalLinkToSave = nil
                onSaveRecipe(url, title, metadata?.imageURL)
            }
        }
    }
}

// MARK: - Browser Toolbar

struct BrowserToolbar: View {
    let canGoBack: Bool
    let canGoForward: Bool
    let isLoading: Bool
    let onBack: () -> Void
    let onForward: () -> Void
    let onRefresh: () -> Void

    var body: some View {
        HStack(spacing: 24) {
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .medium))
            }
            .disabled(!canGoBack)
            .foregroundStyle(canGoBack ? .primary : .tertiary)

            Button(action: onForward) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 18, weight: .medium))
            }
            .disabled(!canGoForward)
            .foregroundStyle(canGoForward ? .primary : .tertiary)

            Spacer()

            Button(action: onRefresh) {
                Image(systemName: isLoading ? "xmark" : "arrow.clockwise")
                    .font(.system(size: 16, weight: .medium))
            }
            .foregroundStyle(.primary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color(.secondarySystemBackground))
    }
}

// MARK: - WebView Container

struct WebViewContainer: UIViewRepresentable {
    let url: URL
    @Binding var webView: WKWebView?
    @Binding var currentURL: URL?
    @Binding var currentTitle: String
    @Binding var canGoBack: Bool
    @Binding var canGoForward: Bool
    @Binding var isLoading: Bool
    let onExternalLink: (URL) -> Void

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true

        // Load initial URL
        webView.load(URLRequest(url: url))

        // Store reference
        DispatchQueue.main.async {
            self.webView = webView
        }

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // No updates needed
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        // Stop any loading and clean up WebContent processes
        webView.stopLoading()
        webView.navigationDelegate = nil
        // Load blank page to release any resources held by the current page
        webView.loadHTMLString("", baseURL: nil)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: WebViewContainer

        init(_ parent: WebViewContainer) {
            self.parent = parent
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.isLoading = true
            }
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            // Always allow about:blank and other internal pages
            if url.scheme == "about" {
                decisionHandler(.allow)
                return
            }

            // Only intercept user-initiated link clicks, not programmatic navigations
            guard navigationAction.navigationType == .linkActivated else {
                decisionHandler(.allow)
                return
            }

            // Allow standard http/https URLs
            if url.scheme == "http" || url.scheme == "https" {
                // Check if this URL would open an external app (universal links)
                // Common external app domains that have universal links
                let externalAppDomains = [
                    // Social media & video
                    "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
                    "instagram.com", "www.instagram.com",
                    "twitter.com", "www.twitter.com", "x.com", "www.x.com",
                    "facebook.com", "www.facebook.com", "m.facebook.com",
                    "tiktok.com", "www.tiktok.com",
                    "pinterest.com", "www.pinterest.com",
                    "spotify.com", "open.spotify.com",
                    "music.apple.com", "podcasts.apple.com",
                    "reddit.com", "www.reddit.com",
                    // Recipe sites with native apps
                    "cooking.nytimes.com",
                    "bonappetit.com", "www.bonappetit.com",
                    "atk.com", "www.americastestkitchen.com",
                    "cooksillustrated.com", "www.cooksillustrated.com"
                ]

                let host = url.host?.lowercased() ?? ""

                // Check if it's an external app domain
                if externalAppDomains.contains(where: { host == $0 || host.hasSuffix(".\($0)") }) {
                    // Block navigation and show save dialog instead
                    DispatchQueue.main.async {
                        self.parent.onExternalLink(url)
                    }
                    decisionHandler(.cancel)
                    return
                }

                decisionHandler(.allow)
                return
            }

            // For non-http(s) schemes (like app deep links), block and offer to save
            if url.scheme != nil {
                DispatchQueue.main.async {
                    self.parent.onExternalLink(url)
                }
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.currentURL = webView.url
                self.parent.currentTitle = webView.title ?? "Recipes"
                self.parent.canGoBack = webView.canGoBack
                self.parent.canGoForward = webView.canGoForward
                self.parent.isLoading = false
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            // Ignore cancellation errors (code -999) - these are expected when navigating away
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled {
                return
            }
            DispatchQueue.main.async {
                self.parent.isLoading = false
            }
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            // Ignore cancellation errors (code -999) - these are expected when navigating away
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled {
                return
            }
            DispatchQueue.main.async {
                self.parent.isLoading = false
            }
        }

        // Handle URL changes during navigation (for redirects, etc.)
        func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.currentURL = webView.url
                self.parent.canGoBack = webView.canGoBack
                self.parent.canGoForward = webView.canGoForward
            }
        }

        // Handle WebContent process crashes gracefully
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            // Reload the page if the WebContent process crashes
            webView.reload()
        }
    }
}

#Preview {
    RecipeBrowserView(
        dish: Dish(
            name: "Salmon with Lemon",
            keyIngredient: "salmon",
            ingredients: ["lemon", "dill"]
        ),
        initialSearchQuery: "salmon lemon dill",
        onSaveRecipe: { url, title, imageURL in
            print("Saved: \(url), \(title ?? "no title"), \(imageURL?.absoluteString ?? "no image")")
        },
        onDismiss: {}
    )
}
