import SwiftUI

/// View for running menu generator tests
struct MenuGeneratorTestView: View {
    @StateObject private var testRunner: MenuGeneratorTestRunner
    @State private var results: TestRunResults?
    @State private var showingResults = false
    @State private var showingShareSheet = false
    @State private var exportURL: URL?

    init(appState: AppState) {
        _testRunner = StateObject(wrappedValue: MenuGeneratorTestRunner(
            menuGenerator: appState.menuGenerator,
            ingredientService: appState.ingredientService
        ))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Image(systemName: "chart.bar.doc.horizontal")
                            .font(.system(size: 48))
                            .foregroundColor(.blue)

                        Text("Menu Generator Testing")
                            .font(.title.bold())

                        Text("Validate dish generation logic across all categories and dish types")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    .padding(.top)

                    // Test Configuration
                    GroupBox {
                        VStack(alignment: .leading, spacing: 12) {
                            Label("Test Configuration", systemImage: "gearshape")
                                .font(.headline)

                            VStack(alignment: .leading, spacing: 8) {
                                InfoRow(label: "Featured Ingredients", value: "\(TestIngredient.testSet.count)")
                                InfoRow(label: "Dish Types", value: "6")
                                InfoRow(label: "Compatibility Modes", value: "2 (Flexible, Strict)")
                                InfoRow(label: "Samples per case", value: "10")
                                Divider()
                                InfoRow(label: "Total Test Cases", value: "\(TestIngredient.testSet.count * 6 * 2)")
                                InfoRow(label: "Total Dishes", value: "\(TestIngredient.testSet.count * 6 * 2 * 10)")
                            }
                            .font(.subheadline)
                        }
                    }
                    .padding(.horizontal)

                    // Run Tests Button
                    if !testRunner.isRunning {
                        Button {
                            Task {
                                results = await testRunner.runFullTestSuite(samplesPerCase: 10)
                                showingResults = true
                            }
                        } label: {
                            Label("Run Full Test Suite", systemImage: "play.fill")
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(12)
                        }
                        .padding(.horizontal)
                    }

                    // Progress
                    if testRunner.isRunning {
                        VStack(spacing: 16) {
                            ProgressView(value: testRunner.progress) {
                                Text("Running Tests...")
                                    .font(.headline)
                            }
                            .progressViewStyle(.linear)

                            VStack(spacing: 4) {
                                Text(testRunner.currentTest)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)

                                Text("\(testRunner.completedTests) / \(testRunner.totalTests) completed")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    }

                    // Results Summary
                    if let results = results {
                        VStack(spacing: 16) {
                            GroupBox {
                                VStack(alignment: .leading, spacing: 12) {
                                    Label("Results Summary", systemImage: "chart.bar.fill")
                                        .font(.headline)

                                    VStack(spacing: 8) {
                                        ResultRow(
                                            label: "Overall Success Rate",
                                            value: "\(String(format: "%.1f", results.overallSuccessRate))%",
                                            color: colorForPercentage(results.overallSuccessRate)
                                        )
                                        ResultRow(
                                            label: "Avg Role Score",
                                            value: "\(String(format: "%.1f", results.avgRoleScore))%",
                                            color: colorForPercentage(results.avgRoleScore)
                                        )
                                        ResultRow(
                                            label: "Avg Category Validation",
                                            value: "\(String(format: "%.1f", results.avgCategoryValidation))%",
                                            color: colorForPercentage(results.avgCategoryValidation)
                                        )
                                    }
                                }
                            }

                            // Export Buttons
                            VStack(spacing: 12) {
                                Button {
                                    exportAndShare(results: results, format: .markdown)
                                } label: {
                                    Label("Export Markdown Report", systemImage: "doc.text")
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Color(.secondarySystemBackground))
                                        .cornerRadius(8)
                                }

                                Button {
                                    exportAndShare(results: results, format: .csv)
                                } label: {
                                    Label("Export CSV Data", systemImage: "tablecells")
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Color(.secondarySystemBackground))
                                        .cornerRadius(8)
                                }

                                Button {
                                    exportAndShare(results: results, format: .json)
                                } label: {
                                    Label("Export JSON (Full Data)", systemImage: "doc.text.fill")
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Color(.secondarySystemBackground))
                                        .cornerRadius(8)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    Spacer()
                }
            }
            .navigationTitle("Testing")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showingShareSheet) {
                if let url = exportURL {
                    ShareSheet(items: [url])
                }
            }
        }
    }

    // MARK: - Helpers

    private func colorForPercentage(_ percentage: Double) -> Color {
        if percentage >= 90 {
            return .green
        } else if percentage >= 70 {
            return .orange
        } else {
            return .red
        }
    }

    enum ExportFormat {
        case markdown, csv, json
    }

    private func exportAndShare(results: TestRunResults, format: ExportFormat) {
        let (content, filename) = switch format {
        case .markdown:
            (TestResultsExporter.exportMarkdownReport(results), "test-results.md")
        case .csv:
            (TestResultsExporter.exportSummaryCSV(results), "test-results.csv")
        case .json:
            (TestResultsExporter.exportJSON(results) ?? "", "test-results.json")
        }

        if let url = TestResultsExporter.saveToFile(content, filename: filename) {
            exportURL = url
            showingShareSheet = true
        }
    }
}

// MARK: - Supporting Views

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
        }
    }
}

struct ResultRow: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.bold)
                .foregroundColor(color)
        }
    }
}

// Share Sheet for exporting files
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
