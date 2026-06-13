import SwiftUI

struct DiscoverView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 32) {
                    // Menus Section
                    sectionHeader(title: "Menus")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 16) {
                            ForEach(0..<4) { _ in
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Color.gray.opacity(0.4), lineWidth: 2)
                                    .frame(width: 280, height: 320)
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Ingredients Section
                    sectionHeader(title: "Ingredients")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 16) {
                            ForEach(0..<8) { _ in
                                Circle()
                                    .stroke(Color.gray.opacity(0.4), lineWidth: 2)
                                    .frame(width: 80, height: 80)
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Recipes Section
                    sectionHeader(title: "Recipes")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 16) {
                            ForEach(0..<6) { _ in
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.gray.opacity(0.4), lineWidth: 2)
                                    .frame(width: 160, height: 140)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Discover")
        }
    }

    private func sectionHeader(title: String) -> some View {
        HStack {
            Text(title)
                .font(.title2)
                .fontWeight(.bold)
            Spacer()
            Text("See more...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal)
    }
}

#Preview {
    DiscoverView()
}
