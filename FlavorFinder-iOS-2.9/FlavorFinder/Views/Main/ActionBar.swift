import SwiftUI

struct ActionBar: View {
    let onGenerate: () -> Void
    let onAnalyze: () -> Void
    let onSave: () -> Void
    let onUndo: () -> Void

    let isGenerating: Bool
    let canUndo: Bool
    let canSave: Bool
    let canAnalyze: Bool

    var body: some View {
        HStack(spacing: 12) {
            // Undo Button
            Button(action: onUndo) {
                Image(systemName: "arrow.uturn.backward")
                    .font(.system(size: 18, weight: .medium))
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.bordered)
            .disabled(!canUndo)

            // Generate Button
            Button(action: onGenerate) {
                HStack(spacing: 8) {
                    if isGenerating {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(.white)
                    } else {
                        Image(systemName: "sparkles")
                    }
                    Text("Generate")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 44)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppColors.accent)
            .disabled(isGenerating)

            // Analyze Button
            Button(action: onAnalyze) {
                Image(systemName: "chart.bar.fill")
                    .font(.system(size: 18, weight: .medium))
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.bordered)
            .disabled(!canAnalyze)

            // Save Button
            Button(action: onSave) {
                Image(systemName: "bookmark.fill")
                    .font(.system(size: 18, weight: .medium))
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.bordered)
            .disabled(!canSave)
        }
        .padding()
        .background(Color(.systemBackground))
    }
}

#Preview {
    VStack {
        Spacer()
        ActionBar(
            onGenerate: {},
            onAnalyze: {},
            onSave: {},
            onUndo: {},
            isGenerating: false,
            canUndo: true,
            canSave: true,
            canAnalyze: true
        )
    }
}
