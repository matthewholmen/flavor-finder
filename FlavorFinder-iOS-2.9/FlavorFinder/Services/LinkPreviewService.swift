import Foundation
import LinkPresentation

/// Service for fetching link metadata (title, image) from URLs using Apple's LinkPresentation framework
@MainActor
class LinkPreviewService: ObservableObject {
    struct LinkMetadata {
        let title: String?
        let imageURL: URL?
        let siteName: String?
    }

    /// Dedicated URLSession with limited cache size to prevent memory growth
    private lazy var urlSession: URLSession = {
        let config = URLSessionConfiguration.default
        // Limit memory cache to 10MB and disk cache to 50MB
        config.urlCache = URLCache(
            memoryCapacity: 10 * 1024 * 1024,
            diskCapacity: 50 * 1024 * 1024,
            diskPath: "LinkPreviewCache"
        )
        config.requestCachePolicy = .returnCacheDataElseLoad
        return URLSession(configuration: config)
    }()

    /// Fetches OpenGraph metadata from a URL
    func fetchMetadata(for url: URL) async -> LinkMetadata? {
        let provider = LPMetadataProvider()

        do {
            let metadata = try await provider.startFetchingMetadata(for: url)

            // Try to get image URL from the metadata
            // Note: LPMetadataProvider doesn't directly expose image URL,
            // but we can extract it from the original URL's OpenGraph tags
            let imageURL = await extractImageURL(from: url)

            return LinkMetadata(
                title: metadata.title,
                imageURL: imageURL,
                siteName: metadata.url?.host
            )
        } catch {
            print("LinkPreviewService: Failed to fetch metadata for \(url): \(error)")
            return nil
        }
    }

    /// Extracts OpenGraph image URL by fetching and parsing HTML
    private func extractImageURL(from url: URL) async -> URL? {
        do {
            var request = URLRequest(url: url)
            // Use a mobile user agent to get mobile-friendly responses
            request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")

            let (data, _) = try await urlSession.data(for: request)
            guard let html = String(data: data, encoding: .utf8) else { return nil }

            // Look for og:image meta tag
            if let imageURLString = extractMetaContent(from: html, property: "og:image"),
               let imageURL = resolveURL(imageURLString, relativeTo: url) {
                return imageURL
            }

            // Fallback: look for twitter:image
            if let imageURLString = extractMetaContent(from: html, property: "twitter:image"),
               let imageURL = resolveURL(imageURLString, relativeTo: url) {
                return imageURL
            }

            // Fallback: look for itemprop="image"
            if let imageURLString = extractItemPropImage(from: html),
               let imageURL = resolveURL(imageURLString, relativeTo: url) {
                return imageURL
            }

            return nil
        } catch {
            print("LinkPreviewService: Failed to fetch HTML for image extraction: \(error)")
            return nil
        }
    }

    /// Resolves a potentially relative URL to an absolute URL
    private func resolveURL(_ urlString: String, relativeTo baseURL: URL) -> URL? {
        // If it's already absolute, use it directly
        if let url = URL(string: urlString), url.scheme != nil {
            return url
        }
        // Otherwise resolve relative to base URL
        return URL(string: urlString, relativeTo: baseURL)
    }

    /// Extracts image URL from itemprop="image" attribute (used by schema.org)
    private func extractItemPropImage(from html: String) -> String? {
        let patterns = [
            "<meta[^>]*itemprop=\"image\"[^>]*content=\"([^\"]*)\"",
            "<img[^>]*itemprop=\"image\"[^>]*src=\"([^\"]*)\""
        ]

        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               let match = regex.firstMatch(in: html, options: [], range: NSRange(html.startIndex..., in: html)),
               let range = Range(match.range(at: 1), in: html) {
                return String(html[range])
            }
        }
        return nil
    }

    /// Extracts content from a meta tag with the given property
    private func extractMetaContent(from html: String, property: String) -> String? {
        // Match patterns like: <meta property="og:image" content="https://...">
        // or: <meta name="twitter:image" content="https://...">
        let patterns = [
            "<meta[^>]*property=\"\(property)\"[^>]*content=\"([^\"]*)\"",
            "<meta[^>]*content=\"([^\"]*)\"[^>]*property=\"\(property)\"",
            "<meta[^>]*name=\"\(property)\"[^>]*content=\"([^\"]*)\"",
            "<meta[^>]*content=\"([^\"]*)\"[^>]*name=\"\(property)\""
        ]

        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               let match = regex.firstMatch(in: html, options: [], range: NSRange(html.startIndex..., in: html)),
               let range = Range(match.range(at: 1), in: html) {
                return String(html[range])
            }
        }

        return nil
    }
}
