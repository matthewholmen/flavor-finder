import SwiftUI

/// Hero-style card displaying a linked recipe with large image
struct RecipeHeroCard: View {
    let url: URL
    let title: String?
    let imageURL: URL?
    let onRemove: () -> Void
    let onTypeChange: () -> Void
    let onRecipeTap: () -> Void
    let dishType: DishType?

    var body: some View {
        VStack(spacing: 0) {
            // Large recipe image - edge-to-edge with square corners
            RecipeHeroThumbnail(imageURL: imageURL)
                .contentShape(Rectangle())
                .onTapGesture {
                    openInBrowser()
                }
                .overlay(alignment: .topLeading) {
                    // URL pill overlaid on top-left
                    Button(action: openInBrowser) {
                        HStack(spacing: 4) {
                            Image(systemName: "link")
                                .font(.system(size: 10))
                            Text(url.host ?? "Recipe")
                                .font(.caption)
                        }
                        .foregroundStyle(.white.opacity(0.9))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(
                            Capsule()
                                .fill(.black.opacity(0.7))
                        )
                    }
                    .buttonStyle(.plain)
                    .padding(8)
                }
                .overlay(alignment: .topTrailing) {
                    // Remove button overlaid on top-right
                    Button(action: onRemove) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(.white)
                            .background(
                                Circle()
                                    .fill(.black.opacity(0.3))
                                    .blur(radius: 4)
                            )
                    }
                    .buttonStyle(.plain)
                    .padding(8)
                }

            // Type badge and Recipe button row
            HStack {
                // Type Badge - tappable to change
                Button(action: onTypeChange) {
                    HStack(spacing: 4) {
                        if let type = dishType {
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
                    .background(dishType != nil ? AppColors.accent.opacity(0.1) : Color.secondary.opacity(0.1))
                    .foregroundStyle(dishType != nil ? AppColors.accent : .secondary)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)

                Spacer()

                // Recipe button
                Button(action: onRecipeTap) {
                    HStack(spacing: 4) {
                        Image(systemName: "bookmark.fill")
                            .font(.system(size: 12))
                        Text("Recipe")
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                    .foregroundStyle(AppColors.accent)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
        }
    }

    private func openInBrowser() {
        UIApplication.shared.open(url)
    }
}

/// Compact card displaying a linked recipe with thumbnail, title, and site name
struct RecipePreviewCard: View {
    let url: URL
    let title: String?
    let imageURL: URL?
    let onRemove: () -> Void

    var body: some View {
        Button(action: openInBrowser) {
            HStack(spacing: 12) {
                // Recipe thumbnail
                RecipeThumbnail(imageURL: imageURL)

                // Recipe info
                VStack(alignment: .leading, spacing: 4) {
                    Text(title ?? "Linked Recipe")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    HStack(spacing: 4) {
                        Image(systemName: "link")
                            .font(.system(size: 10))
                        Text(url.host ?? "Recipe")
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Remove button
                Button(action: onRemove) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(.secondary.opacity(0.6))
                }
                .buttonStyle(.plain)
            }
            .padding(12)
            .background(Color(.tertiarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }

    private func openInBrowser() {
        UIApplication.shared.open(url)
    }
}

/// Thumbnail image for recipe preview
struct RecipeThumbnail: View {
    let imageURL: URL?

    @State private var loadedImage: UIImage?
    @State private var isLoading = false
    @State private var loadFailed = false

    /// Maximum thumbnail dimension (images are downsampled to save memory)
    private static let maxThumbnailSize: CGFloat = 120

    var body: some View {
        Group {
            if let uiImage = loadedImage {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else if isLoading {
                placeholder
                    .overlay(
                        ProgressView()
                            .progressViewStyle(.circular)
                            .scaleEffect(0.6)
                    )
            } else {
                fallbackIcon
            }
        }
        .frame(width: 60, height: 60)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .task(id: imageURL) {
            await loadImage()
        }
        .onDisappear {
            // Release image memory when view disappears
            loadedImage = nil
        }
    }

    private func loadImage() async {
        guard let url = imageURL else {
            loadedImage = nil
            return
        }

        // Reset state for new URL
        loadedImage = nil
        loadFailed = false
        isLoading = true

        do {
            let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad)
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                loadFailed = true
                isLoading = false
                return
            }

            // Downsample image to save memory (don't store full-resolution images)
            if let uiImage = Self.downsampledImage(from: data, maxSize: Self.maxThumbnailSize) {
                loadedImage = uiImage
            } else {
                loadFailed = true
            }
        } catch {
            // Only mark as failed if not cancelled (task cancellation is expected during view updates)
            if (error as NSError).code != NSURLErrorCancelled {
                loadFailed = true
            }
        }

        isLoading = false
    }

    /// Downsamples image data to a maximum dimension to reduce memory usage
    private static func downsampledImage(from data: Data, maxSize: CGFloat) -> UIImage? {
        let options: [CFString: Any] = [
            kCGImageSourceShouldCache: false,
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: maxSize * UIScreen.main.scale,
            kCGImageSourceCreateThumbnailWithTransform: true
        ]

        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            // Fallback to regular UIImage if downsampling fails
            return UIImage(data: data)
        }

        return UIImage(cgImage: cgImage)
    }

    private var placeholder: some View {
        Rectangle()
            .fill(Color.secondary.opacity(0.15))
    }

    private var fallbackIcon: some View {
        Rectangle()
            .fill(AppColors.accent.opacity(0.15))
            .overlay(
                Image(systemName: "book.closed.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(AppColors.accent)
            )
    }
}

/// Large hero-style thumbnail for recipe preview
struct RecipeHeroThumbnail: View {
    let imageURL: URL?

    @State private var loadedImage: UIImage?
    @State private var isLoading = false
    @State private var loadFailed = false

    /// Maximum thumbnail dimension (images are downsampled to save memory)
    private static let maxThumbnailSize: CGFloat = 400

    var body: some View {
        GeometryReader { geometry in
            Group {
                if let uiImage = loadedImage {
                    Image(uiImage: uiImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: geometry.size.width, height: 240)
                } else if isLoading {
                    placeholder
                        .overlay(
                            ProgressView()
                                .progressViewStyle(.circular)
                        )
                } else {
                    fallbackIcon
                }
            }
            .frame(width: geometry.size.width, height: 240)
            .clipped()
        }
        .frame(height: 240)
        .task(id: imageURL) {
            await loadImage()
        }
        .onDisappear {
            // Release image memory when view disappears
            loadedImage = nil
        }
    }

    private func loadImage() async {
        guard let url = imageURL else {
            loadedImage = nil
            return
        }

        // Reset state for new URL
        loadedImage = nil
        loadFailed = false
        isLoading = true

        do {
            let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad)
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                loadFailed = true
                isLoading = false
                return
            }

            // Downsample image to save memory (don't store full-resolution images)
            if let uiImage = Self.downsampledImage(from: data, maxSize: Self.maxThumbnailSize) {
                loadedImage = uiImage
            } else {
                loadFailed = true
            }
        } catch {
            // Only mark as failed if not cancelled (task cancellation is expected during view updates)
            if (error as NSError).code != NSURLErrorCancelled {
                loadFailed = true
            }
        }

        isLoading = false
    }

    /// Downsamples image data to a maximum dimension to reduce memory usage
    private static func downsampledImage(from data: Data, maxSize: CGFloat) -> UIImage? {
        let options: [CFString: Any] = [
            kCGImageSourceShouldCache: false,
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: maxSize * UIScreen.main.scale,
            kCGImageSourceCreateThumbnailWithTransform: true
        ]

        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            // Fallback to regular UIImage if downsampling fails
            return UIImage(data: data)
        }

        return UIImage(cgImage: cgImage)
    }

    private var placeholder: some View {
        Rectangle()
            .fill(Color.secondary.opacity(0.15))
    }

    private var fallbackIcon: some View {
        Rectangle()
            .fill(AppColors.accent.opacity(0.15))
            .overlay(
                Image(systemName: "book.closed.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(AppColors.accent)
            )
    }
}

#Preview("Hero Card") {
    VStack(spacing: 16) {
        // With image
        RecipeHeroCard(
            url: URL(string: "https://www.bbcgoodfood.com/champagne-mojito")!,
            title: "Champagne mojito",
            imageURL: URL(string: "https://images.immediate.co.uk/production/volatile/sites/30/2020/08/mojito-6da5299.jpg"),
            onRemove: {},
            onTypeChange: {},
            onRecipeTap: {},
            dishType: .beverage
        )

        // Without image
        RecipeHeroCard(
            url: URL(string: "https://www.carolinescooking.com/champagne-mojito")!,
            title: "Champagne mojito",
            imageURL: nil,
            onRemove: {},
            onTypeChange: {},
            onRecipeTap: {},
            dishType: .beverage
        )
    }
    .padding()
    .background(Color(.systemBackground))
}

#Preview("Compact Card") {
    VStack(spacing: 16) {
        // With image
        RecipePreviewCard(
            url: URL(string: "https://www.seriouseats.com/salmon-recipe")!,
            title: "Perfect Pan-Seared Salmon with Crispy Skin",
            imageURL: URL(string: "https://www.seriouseats.com/thmb/salmon.jpg"),
            onRemove: {}
        )

        // Without image
        RecipePreviewCard(
            url: URL(string: "https://recipes.com/lemon-salmon")!,
            title: "Simple Lemon Salmon",
            imageURL: nil,
            onRemove: {}
        )
    }
    .padding()
    .background(Color(.systemBackground))
}
