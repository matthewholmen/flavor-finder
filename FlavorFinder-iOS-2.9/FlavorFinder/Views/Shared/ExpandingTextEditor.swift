import SwiftUI

/// A TextEditor that automatically expands to fit its content.
/// Uses a hidden Text view to calculate the proper height.
struct ExpandingTextEditor: View {
    @Binding var text: String
    let font: Font
    let fontWeight: Font.Weight
    let fontSize: CGFloat
    var tracking: CGFloat = 0
    var minHeight: CGFloat = 28
    var placeholder: String = ""

    @State private var textHeight: CGFloat = 0

    var body: some View {
        ZStack(alignment: .topLeading) {
            // Hidden Text view for height calculation
            Text(text.isEmpty ? placeholder : text)
                .font(.system(size: fontSize, weight: fontWeight))
                .tracking(tracking)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.vertical, 8) // Match TextEditor's intrinsic padding
                .padding(.horizontal, 5) // Match TextEditor's intrinsic padding
                .opacity(0)
                .background(
                    GeometryReader { geometry in
                        Color.clear.preference(
                            key: TextHeightPreferenceKey.self,
                            value: geometry.size.height
                        )
                    }
                )

            // Actual TextEditor
            TextEditor(text: $text)
                .font(.system(size: fontSize, weight: fontWeight))
                .tracking(tracking)
                .foregroundStyle(.primary)
                .scrollContentBackground(.hidden)
                .background(Color.clear)
                .frame(height: max(minHeight, textHeight))
        }
        .onPreferenceChange(TextHeightPreferenceKey.self) { height in
            textHeight = height
        }
    }
}

/// Preference key for passing text height from child to parent
private struct TextHeightPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0

    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

#Preview {
    VStack(spacing: 20) {
        ExpandingTextEditor(
            text: .constant("Short text"),
            font: .system(size: 20, weight: .bold),
            fontWeight: .bold,
            fontSize: 20
        )
        .border(Color.gray)

        ExpandingTextEditor(
            text: .constant("This is a much longer text that should wrap to multiple lines and cause the editor to expand its height automatically"),
            font: .system(size: 20, weight: .bold),
            fontWeight: .bold,
            fontSize: 20
        )
        .border(Color.gray)
    }
    .padding()
}
